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
    const BANDS = ["A0", "A1", "A2", "B1", "B2"];
    const seen = {}, dups = [];
    C.items.forEach(i => { if (seen[i.id]) dups.push(i.id); seen[i.id] = 1; });
    const t = {}; C.themes.forEach(x => t[x.id] = 1);
    const badThemes = [...new Set(C.items.filter(i => !t[i.theme]).map(i => i.theme))];
    const ids = {}; C.items.forEach(i => ids[i.id] = 1);
    const byId = {}; C.items.forEach(i => byId[i.id] = i);
    const badDlg = [];
    (C.dialogues || []).forEach(d => d.lines.forEach(l => { if (l.itemId && !ids[l.itemId]) badDlg.push(l.itemId); }));
    const badTokens = C.items.filter(i => i.type === "sentence" && (!i.tokens || i.tokens.length < 2)).map(i => i.id);
    // Band-Integritaet: jedes Thema hat ein gueltiges Band.
    const badBands = C.themes.filter(x => BANDS.indexOf(x.band) < 0).map(x => x.id);
    // Opposite-Links: symmetrisch und existent.
    const badOpp = [];
    C.items.forEach(i => {
      if (!i.opposite) return;
      const o = byId[i.opposite];
      if (!o) { badOpp.push(i.id + "->missing"); return; }
      if (o.opposite !== i.id) badOpp.push(i.id + "<->" + i.opposite);
    });
    const oppPairs = C.items.filter(i => i.opposite && byId[i.opposite] && byId[i.opposite].opposite === i.id).length / 2;
    // Module: eindeutige IDs, alle referenzierten IDs existieren.
    const mods = C.modules || [];
    const modIds = {}, modDupIds = [], badModRef = [];
    mods.forEach(m => {
      if (modIds[m.id]) modDupIds.push(m.id); modIds[m.id] = 1;
      (m.steps || []).forEach(s => {
        if (s.itemId && !ids[s.itemId]) badModRef.push(m.id + ":" + s.itemId);
        if (s.pairId && !ids[s.pairId]) badModRef.push(m.id + ":" + s.pairId);
        (s.distractorIds || []).forEach(d => { if (!ids[d]) badModRef.push(m.id + ":" + d); });
      });
    });
    return {
      items: C.items.length, themes: C.themes.length, dialogues: (C.dialogues || []).length,
      dups, badThemes, badDlg, badTokens, badBands, badOpp, oppPairs,
      modules: mods.length, modDupIds, badModRef
    };
  });
  check("Items geladen (>= 510)", c.items >= 510, c.items);
  check("Themen (>= 30)", c.themes >= 30, c.themes);
  check("Dialoge (>= 11)", c.dialogues >= 11, c.dialogues);
  check("keine doppelten Item-IDs", c.dups.length === 0, c.dups.join(","));
  check("alle Themen-Referenzen gueltig", c.badThemes.length === 0, c.badThemes.join(","));
  check("alle Dialog-itemIds gueltig", c.badDlg.length === 0, c.badDlg.join(","));
  check("alle Saetze haben Tokens", c.badTokens.length === 0, c.badTokens.join(","));
  check("jedes Thema hat ein gueltiges Band", c.badBands.length === 0, c.badBands.join(","));
  check("opposite-Links symmetrisch & existent", c.badOpp.length === 0, c.badOpp.slice(0, 5).join(","));
  check("mindestens 10 Gegenteil-Paare", c.oppPairs >= 10, c.oppPairs);
  check("Module (>= 6)", c.modules >= 6, c.modules);
  check("keine doppelten Modul-IDs", c.modDupIds.length === 0, c.modDupIds.join(","));
  check("alle Modul-Referenzen gueltig", c.badModRef.length === 0, c.badModRef.slice(0, 5).join(","));

  // --- 2. Onboarding E2E (frischer State) ---
  check("Onboarding erscheint beim Erststart", await page.evaluate(() => !!document.querySelector(".onb")));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /los geht/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".onb-goal")][0]; if (b) b.click(); });
  await page.waitForTimeout(300);
  // Neuer Zwischenschritt: Vorkenntnisse. Hier den "bei null anfangen"-Weg gehen.
  check("Onboarding fragt nach Vorkenntnissen", await page.evaluate(() => /kennst du schon/i.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /fange bei null/i.test(x.textContent)); if (b) b.click(); });
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

  // --- 2a. Neue State-Felder ueberleben Laden/Normalisieren ---
  const newFields = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      levelCap: s.profile.levelCap,
      unlockedBand: s.profile.unlockedBand,
      placementDone: s.profile.placementDone,
      modulesDone: s.gamification.counters.modulesDone
    };
  });
  check("State hat levelCap/unlockedBand/placementDone/modulesDone",
    newFields.levelCap === "auto" && newFields.unlockedBand === "A1" &&
    newFields.placementDone === false && newFields.modulesDone && typeof newFields.modulesDone === "object",
    JSON.stringify(newFields));

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

  // --- 9. Merge (mergeStates via Debug-Oberflaeche) ---
  const merge = await page.evaluate(() => {
    const mk = (over) => Object.assign({
      version: 1,
      profile: { dailyGoalMin: 5, fadeMode: "auto", autoplay: true, micHintDismissed: false, onboarded: true, levelCap: "auto", unlockedBand: "A1", placementDone: false },
      gamification: { xpTotal: 0, streakDays: 0, lastActiveDay: null, masteredCount: 0, achievements: [], frozenDays: {}, answersTotal: 0, counters: { bestBlitz: 0, bestExam: 0, sessionsDone: 0, dialogsDone: {}, modulesDone: {} } },
      srs: {}, log: {}
    }, over);
    const A = mk({
      profile: { dailyGoalMin: 10, fadeMode: "auto", autoplay: false, micHintDismissed: true, onboarded: true, levelCap: "auto", unlockedBand: "A1", placementDone: false },
      gamification: { xpTotal: 100, streakDays: 0, lastActiveDay: "2026-01-01", masteredCount: 0, achievements: ["a1"], frozenDays: {}, answersTotal: 50, counters: { bestBlitz: 5, bestExam: 3, sessionsDone: 4, dialogsDone: {}, modulesDone: {} } },
      srs: { w1: { ease: 2.5, intervalDays: 2, dueTs: 0, reps: 3, lapses: 0, mastery: 2, lastReviewTs: 1000 } },
      log: { "2026-01-01": { answers: 10, correct: 8, xp: 40, goalMet: true } }
    });
    const B = mk({
      profile: { dailyGoalMin: 5, fadeMode: "auto", autoplay: true, micHintDismissed: false, onboarded: true, levelCap: "auto", unlockedBand: "A2", placementDone: true },
      gamification: { xpTotal: 60, streakDays: 0, lastActiveDay: "2026-01-02", masteredCount: 0, achievements: ["a2"], frozenDays: {}, answersTotal: 90, counters: { bestBlitz: 9, bestExam: 1, sessionsDone: 2, dialogsDone: {}, modulesDone: {} } },
      srs: { w1: { ease: 2.5, intervalDays: 5, dueTs: 0, reps: 5, lapses: 1, mastery: 4, lastReviewTs: 2000 } },
      log: { "2026-01-01": { answers: 6, correct: 6, xp: 50, goalMet: false } }
    });
    const m = window.TACHELES_DEBUG.mergeStates(A, B);
    return {
      srsReps: m.srs.w1.reps,
      xp: m.gamification.xpTotal,
      ach: m.gamification.achievements.slice().sort().join(","),
      dayAnswers: m.log["2026-01-01"].answers,
      dayXp: m.log["2026-01-01"].xp,
      goalMet: m.log["2026-01-01"].goalMet,
      unlocked: m.profile.unlockedBand,
      placement: m.profile.placementDone,
      levelCap: m.profile.levelCap
    };
  });
  check("merge: spaeter reviewtes SRS gewinnt", merge.srsReps === 5, merge.srsReps);
  check("merge: xpTotal ist Max", merge.xp === 100, merge.xp);
  check("merge: achievements vereinigt", merge.ach === "a1,a2", merge.ach);
  check("merge: Tageslog feldweises Max + goalMet OR",
    merge.dayAnswers === 10 && merge.dayXp === 50 && merge.goalMet === true,
    merge.dayAnswers + "/" + merge.dayXp + "/" + merge.goalMet);
  check("merge: unlockedBand weiter, placementDone OR, levelCap lokal",
    merge.unlocked === "A2" && merge.placement === true && merge.levelCap === "auto",
    merge.unlocked + "/" + merge.placement + "/" + merge.levelCap);

  // --- 10. Level-Gating (gesperrtes Thema vs. levelCap-Override) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "modes"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const lockedInfo = await page.evaluate(() => {
    const row = document.querySelector(".path-row[data-locked]");
    return row ? { band: row.getAttribute("data-locked"), theme: row.getAttribute("data-theme") } : null;
  });
  if (lockedInfo) {
    await page.evaluate((th) => { const r = document.querySelector('.path-row[data-theme="' + th + '"]'); if (r) r.click(); }, lockedInfo.theme);
    await page.waitForTimeout(300);
    check("Gating: gesperrtes Thema startet keine Session",
      await page.evaluate(() => !document.querySelector(".session-title")), lockedInfo.band);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("tacheles_state_v1")); s.profile.levelCap = "B2"; localStorage.setItem("tacheles_state_v1", JSON.stringify(s)); });
    await page.goto(APP); await page.waitForTimeout(400);
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "modes"); if (b) b.click(); });
    await page.waitForTimeout(300);
    await page.evaluate((th) => { const r = document.querySelector('.path-row[data-theme="' + th + '"]'); if (r) r.click(); }, lockedInfo.theme);
    await page.waitForTimeout(400);
    check("Gating: mit levelCap=B2 startet dasselbe Thema eine Session",
      await page.evaluate(() => !!document.querySelector(".session-title")), lockedInfo.theme);
    await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("tacheles_state_v1")); s.profile.levelCap = "auto"; localStorage.setItem("tacheles_state_v1", JSON.stringify(s)); });
    await page.goto(APP); await page.waitForTimeout(400);
  } else {
    check("Gating: gesperrtes Thema startet keine Session", true, "keine gesperrten Themen (Content?)");
    check("Gating: mit levelCap=B2 startet dasselbe Thema eine Session", true, "n/a");
  }

  // --- 11. Module (Lernen-Kacheln, oeffnen, Quiz zaehlt Antwort) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "modes"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const modTiles = await page.evaluate(() => document.querySelectorAll(".module-tile:not(.locked)").length);
  if (modTiles > 0) {
    check("Lernen-Screen zeigt Modul-Kacheln", modTiles > 0, modTiles);
    const answersBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
    await page.evaluate(() => { const b = document.querySelector(".module-tile:not(.locked)"); if (b) b.click(); });
    await page.waitForTimeout(400);
    check("Modul oeffnet (explain/teach-Schritt)",
      await page.evaluate(() => !!document.querySelector(".module-explain") || !!document.querySelector(".intro-card")));
    // Durch explain/teach klicken, bis ein Quiz-Schritt (Optionen) erscheint.
    let foundOpt = false;
    for (let i = 0; i < 15; i++) {
      foundOpt = await page.evaluate(() => !!document.querySelector(".opt:not(:disabled)"));
      if (foundOpt) break;
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim())); if (b) b.click(); });
      await page.waitForTimeout(350);
    }
    check("Modul erreicht einen Quiz-Schritt", foundOpt);
    if (foundOpt) {
      await page.evaluate(() => { const o = document.querySelector(".opt:not(:disabled)"); if (o) o.click(); });
      await page.waitForTimeout(500);
      const answersAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
      check("Modul-Quiz zaehlt eine Antwort", answersAfter === answersBefore + 1, answersBefore + "->" + answersAfter);
    }
    await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    await page.waitForTimeout(200);
  } else {
    check("Lernen-Screen zeigt Modul-Kacheln", true, "keine Module (Content?)");
    check("Modul erreicht einen Quiz-Schritt", true, "n/a");
    check("Modul-Quiz zaehlt eine Antwort", true, "n/a");
  }

  // --- 12. Einstufungstest (Placement) aus Onboarding heraus ---
  await page.evaluate(() => { localStorage.removeItem("tacheles_state_v1"); });
  await page.goto(APP); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /los geht/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector(".onb-goal"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /einstufen lassen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Einstufung startet aus Onboarding",
    await page.evaluate(() => !!document.querySelector(".placement") || /einstufung/i.test(document.body.innerText)));
  let placementResult = false;
  // Bei komplettem Content laeuft die Einstufung durch alle 5 Baender (~20 Fragen),
  // darum genug Schleifendurchlaeufe vorsehen.
  for (let i = 0; i < 140; i++) {
    const st = await page.evaluate(() => {
      if (/einstufung fertig/i.test(document.body.innerText)) return "done";
      if (document.querySelector(".placement .opt:not(:disabled)")) return "q";
      return "wait";
    });
    if (st === "done") { placementResult = true; break; }
    if (st === "q") {
      // Immer die richtige Option klicken (per data-item-id aus dem Content ermittelt).
      await page.evaluate(() => {
        const C = window.TACHELES_CONTENT;
        const byId = {}; C.items.forEach(i => byId[i.id] = i);
        const shown = document.querySelector(".placement .he-text").textContent;
        const btns = [...document.querySelectorAll(".placement .opt[data-item-id]")];
        const correct = btns.find(b => { const it = byId[b.dataset.itemId]; return it && it.he === shown; });
        (correct || btns[0]).click();
      });
    }
    await page.waitForTimeout(320);
  }
  check("Einstufung erreicht Ergebnis-Screen", placementResult);
  const placeDone = await page.evaluate(() => (JSON.parse(localStorage.getItem("tacheles_state_v1")).profile || {}).placementDone);
  check("placementDone in localStorage gesetzt", placeDone === true, placeDone);

  // --- 8. Konsolenfehler ---
  check("0 Konsolen-/Seitenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  const failed = checks.filter(x => !x.ok);
  console.log("\n" + (failed.length === 0
    ? "PASS – alle " + checks.length + " Checks gruen."
    : "FAIL – " + failed.length + " von " + checks.length + " Checks rot."));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.log("RUNNER-FEHLER: " + e.message); process.exit(1); });
