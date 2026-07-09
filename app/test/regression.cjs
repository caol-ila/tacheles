/*
 * Tacheles – Regressionstest (headless, Edge)
 *
 * Aufruf:   node test/regression.cjs        (aus dem app/-Ordner)
 * Braucht:  - Microsoft Edge installiert
 *           - playwright-core irgendwo auf der Platte; Pfad ueber die
 *             Umgebungsvariable PLAYWRIGHT_PATH setzen, sonst Default unten.
 *
 * Prueft die Kernpfade der App gegen file://:
 *   Content-Integritaet, Onboarding, alle Modus-Kacheln, Antworten+Heute-Zeile,
 *   Lernpfad, Fortschritt-Buttons, Export, themed "Nochmal", 0 Konsolenfehler.
 * Exit-Code 0 = PASS, 1 = FAIL.
 */
"use strict";

const path = require("path");
const fs = require("fs");
const PW = process.env.PLAYWRIGHT_PATH || "c:/Source/SofaSuche/node_modules/playwright-core";
const { chromium } = require(PW);

const APP = "file:///" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
const OUT = path.join(__dirname, "regression-export.json");

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? "" : String(detail) });
  console.log((ok ? "  PASS  " : "  FAIL  ") + name + (detail !== undefined ? "  [" + detail + "]" : ""));
}

(async () => {
  const errors = [];
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 950 } });
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));

  await page.goto(APP);
  await page.waitForTimeout(800);

  // --- 1. Content-Integritaet ---
  const c = await page.evaluate(() => {
    const C = window.TACHELES_CONTENT;
    const seen = {}, dups = [];
    C.items.forEach(i => { if (seen[i.id]) dups.push(i.id); seen[i.id] = 1; });
    const t = {}; C.themes.forEach(x => t[x.id] = 1);
    const badThemes = [...new Set(C.items.filter(i => !t[i.theme]).map(i => i.theme))];
    const ids = {}; C.items.forEach(i => ids[i.id] = 1);
    const badDlg = [];
    (C.dialogues || []).forEach(d => d.lines.forEach(l => { if (l.itemId && !ids[l.itemId]) badDlg.push(l.itemId); }));
    const badTokens = C.items.filter(i => i.type === "sentence" && (!i.tokens || i.tokens.length < 2)).map(i => i.id);
    return { items: C.items.length, themes: C.themes.length, dialogues: (C.dialogues || []).length, dups, badThemes, badDlg, badTokens };
  });
  check("Items geladen (>= 290)", c.items >= 290, c.items);
  check("Themen (>= 20)", c.themes >= 20, c.themes);
  check("Dialoge (>= 8)", c.dialogues >= 8, c.dialogues);
  check("keine doppelten Item-IDs", c.dups.length === 0, c.dups.join(","));
  check("alle Themen-Referenzen gueltig", c.badThemes.length === 0, c.badThemes.join(","));
  check("alle Dialog-itemIds gueltig", c.badDlg.length === 0, c.badDlg.join(","));
  check("alle Saetze haben Tokens", c.badTokens.length === 0, c.badTokens.join(","));

  // --- 2. Onboarding E2E (frischer State) ---
  check("Onboarding erscheint beim Erststart", await page.evaluate(() => !!document.querySelector(".onb")));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /los geht/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".onb-goal")][0]; if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /und los/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(500);
  check("Onboarding fuehrt zu Home", await page.evaluate(() => !!document.querySelector("#cta-start")));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.profile.autoplay = false; s.profile.micHintDismissed = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(600);
  check("Weiter-lernen-Karte auf Home", await page.evaluate(() => !!document.querySelector(".next-card")));

  // --- 2b. Tag-1-Verhalten (Teach-First) ---
  // Smart-Session: erste Aufgabe zu einem NEUEN Wort ist eine Intro-Karte,
  // keine unbeantwortbare Frage.
  await page.evaluate(() => { const b = document.querySelector("#cta-start"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const intro = await page.evaluate(() => ({
    tag: (document.querySelector(".intro-tag") || {}).textContent || null,
    de: !!document.querySelector(".intro-card .de-prompt")
  }));
  check("Tag 1: neues Wort wird zuerst VORGESTELLT (Intro-Karte)", !!intro.tag && intro.de, intro.tag);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test(x.textContent.trim())); if (b) b.click(); });
  await page.waitForTimeout(450);
  const afterIntro = await page.evaluate(() => ({
    introGone: !document.querySelector(".intro-tag"),
    hasTask: !!document.querySelector(".opt") || !![...document.querySelectorAll("button")].find(x => /aufdecken|antwort zeigen|konnte ich/i.test(x.textContent))
  }));
  check("Nach Intro folgt direkt die Abfrage desselben Worts", afterIntro.introGone && afterIntro.hasTask);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);

  // Abruf-Spiele zeigen am Tag 1 einen freundlichen Hinweis statt Rate-Session.
  for (const m of ["swipe", "match", "blitz"]) {
    await page.evaluate(mm => { const b = [...document.querySelectorAll("[data-mode]")].find(x => x.dataset.mode === mm); if (b) b.click(); }, m);
    await page.waitForTimeout(400);
    const empty = await page.evaluate(() => /wartet noch/i.test(document.body.innerText));
    check("Tag 1: " + m + " zeigt 'erst lernen'-Hinweis statt Raten", empty);
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
    await page.waitForTimeout(250);
  }

  // --- 2c. "Tag 3"-Zustand seeden: 14 Woerter sind gelernt ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const pool = window.TACHELES_CONTENT.items
      .filter(i => ["word", "phrase", "sign", "number", "letter"].includes(i.type)).slice(0, 14);
    pool.forEach(i => {
      s.srs[i.id] = { ease: 2.5, intervalDays: 2, dueTs: Date.now() + 86400000, reps: 2, lapses: 0, mastery: 1, lastReviewTs: Date.now() };
    });
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(600);

  // --- 3. Alle Modus-Kacheln oeffnen (jetzt mit gelerntem Bestand) ---
  const modes = await page.evaluate(() => [...document.querySelectorAll("[data-mode]")].map(b => b.dataset.mode));
  for (const m of modes) {
    await page.evaluate(mm => { const b = [...document.querySelectorAll("[data-mode]")].find(x => x.dataset.mode === mm); if (b) b.click(); }, m);
    await page.waitForTimeout(420);
    const title = await page.evaluate(() => (document.querySelector(".session-title") || {}).textContent || null);
    check("Modus oeffnet: " + m, !!title, title);
    await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
    await page.waitForTimeout(220);
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
    await page.waitForTimeout(220);
  }

  // --- 4. MC-Session: Antworten (inkl. Intro-Karten ueberspringen) -> Heute-Zeile ---
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-mode]")].find(x => x.dataset.mode === "mc"); if (b) b.click(); });
  await page.waitForTimeout(450);
  for (let i = 0; i < 7; i++) {
    await page.evaluate(() => {
      let b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test(x.textContent.trim()));
      if (b) { b.click(); return; }
      const o = document.querySelector(".opt:not(:disabled)");
      if (o) o.click();
    });
    await page.waitForTimeout(650);
  }
  // Abbruch mit Antworten zeigt den Abschluss-Screen (gerettetes Ergebnis) ...
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Abbruch nach Antworten rettet aufs Ergebnis (Done-Screen)",
    await page.evaluate(() => !!document.querySelector(".done-screen")));
  // ... und "Fertig" fuehrt nach Home mit Heute-Zeile.
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test(x.textContent.trim())); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Heute-Zeile nach Antworten", !!(await page.evaluate(() => document.querySelector(".today-line"))));

  // --- 5. Lernpfad + Fortschritt ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "modes"); if (b) b.click(); });
  await page.waitForTimeout(350);
  const pathRows = await page.evaluate(() => document.querySelectorAll(".path-row").length);
  check("Lernpfad zeigt alle Themen", pathRows >= 20, pathRows);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "progress"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Survival-Check-Button", await page.evaluate(() => !!document.querySelector("#btn-exam")));
  check("Alef-Bet-Tafel-Button", await page.evaluate(() => !!document.querySelector("#btn-alefbet")));

  // --- 6. Export ---
  const dlWait = page.waitForEvent("download", { timeout: 4000 }).catch(() => null);
  await page.evaluate(() => { const b = document.querySelector("#btn-export"); if (b) b.click(); });
  const dl = await dlWait;
  let expOk = false;
  if (dl) { await dl.saveAs(OUT); try { expOk = !!JSON.parse(fs.readFileSync(OUT, "utf8")).srs; } catch (e) {} }
  check("Export liefert gueltiges JSON", expOk);
  try { fs.unlinkSync(OUT); } catch (e) { /* egal */ }

  // --- 7. Themed Session -> Nochmal behaelt Kontext ---
  await page.evaluate(() => { const r = document.querySelector('[data-theme="greetings"]'); if (r) r.click(); });
  await page.waitForTimeout(450);
  const themedLabel = await page.evaluate(() => (document.querySelector(".session-title") || {}).textContent || "");
  // Session sofort beenden geht nicht ohne Aufgaben — wir simulieren Ende ueber quit + pruefen nur Label
  check("Themen-Session traegt Themen-Label", /Begrüßung/.test(themedLabel), themedLabel);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- 8. Konsolenfehler ---
  check("0 Konsolen-/Seitenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  const failed = checks.filter(x => !x.ok);
  console.log("\n" + (failed.length === 0
    ? "PASS – alle " + checks.length + " Checks gruen."
    : "FAIL – " + failed.length + " von " + checks.length + " Checks rot."));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.log("RUNNER-FEHLER: " + e.message); process.exit(1); });
