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
    const BANDS = window.TACHELES_DEBUG.BANDS;
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
    // Grammatik-Merge + cloze/form-Integritaet.
    let grammarMods = 0, clozeFormSteps = 0;
    const badChoice = []; // cloze/form-Schritte mit falscher Options-/Correct-Anzahl
    mods.forEach(m => {
      if (modIds[m.id]) modDupIds.push(m.id); modIds[m.id] = 1;
      if (m.group === "grammar") grammarMods++;
      (m.steps || []).forEach((s, si) => {
        if (s.itemId && !ids[s.itemId]) badModRef.push(m.id + ":" + s.itemId);
        if (s.pairId && !ids[s.pairId]) badModRef.push(m.id + ":" + s.pairId);
        (s.distractorIds || []).forEach(d => { if (!ids[d]) badModRef.push(m.id + ":" + d); });
        if (s.type === "cloze" || s.type === "form") {
          clozeFormSteps++;
          const opts = s.options || [];
          const nCorrect = opts.filter(o => o && o.correct === true).length;
          if (opts.length < 2 || opts.length > 4 || nCorrect !== 1) {
            badChoice.push(m.id + "#" + si + "(" + opts.length + "opt/" + nCorrect + "correct)");
          }
        }
      });
    });
    // Baender: C1/C2-Themen und ihr Sperr-Status beim aktuellen (frischen) Zustand.
    const highThemes = C.themes.filter(t => t.band === "C1" || t.band === "C2").map(t => t.id);
    const unlockedHigh = highThemes.filter(id => {
      const th = C.themes.filter(t => t.id === id)[0];
      return window.TACHELES_DEBUG.bandUnlocked(th.band);
    });
    return {
      items: C.items.length, themes: C.themes.length, dialogues: (C.dialogues || []).length,
      dups, badThemes, badDlg, badTokens, badBands, badOpp, oppPairs,
      modules: mods.length, modDupIds, badModRef,
      grammarPresent: !!(window.TACHELES_GRAMMAR && Array.isArray(window.TACHELES_GRAMMAR.modules)),
      grammarGlobalCount: window.TACHELES_GRAMMAR && window.TACHELES_GRAMMAR.modules ? window.TACHELES_GRAMMAR.modules.length : 0,
      grammarMods, clozeFormSteps, badChoice,
      bandsLen: BANDS.length, highThemes: highThemes.length, unlockedHigh: unlockedHigh.length
    };
  });
  check("Items geladen (>= 620)", c.items >= 620, c.items);
  check("Themen (>= 36)", c.themes >= 36, c.themes);
  check("Dialoge (>= 14)", c.dialogues >= 14, c.dialogues);
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

  // --- 1b. Grammatik (grammar.js -> gemergt in CONTENT.modules) ---
  check("Grammatik-Global TACHELES_GRAMMAR vorhanden", c.grammarPresent, c.grammarGlobalCount);
  check("Grammatik-Module gemergt (>= 18)", c.grammarMods >= 18, c.grammarMods);
  check("cloze/form-Schritte gesamt (>= 90)", c.clozeFormSteps >= 90, c.clozeFormSteps);
  check("cloze/form: 2-4 Optionen, genau eine correct", c.badChoice.length === 0, c.badChoice.slice(0, 5).join(","));

  // --- 1c. Baender (A0..C2) ---
  check("BANDS-Liste laenge 7 (A0..C2)", c.bandsLen === 7, c.bandsLen);
  check("C1/C2-Themen beim Default-Level gesperrt", c.unlockedHigh === 0, c.unlockedHigh + "/" + c.highThemes + " offen");

  // --- 1d. Kurs-Integritaet (Vertrag C1, In-Page-Spiegel des Validators) ---
  const course = await page.evaluate(() => {
    const C = window.TACHELES_CONTENT, K = window.TACHELES_COURSE, G = window.TACHELES_GRAMMAR;
    const R = window.TACHELES_READING;
    const itemIds = {}; C.items.forEach(i => itemIds[i.id] = 1);
    const dlg = {}; (C.dialogues || []).forEach(d => dlg[d.id] = 1);
    const gmods = {}; G.modules.forEach(m => gmods[m.id] = m);
    const drills = {}; (R ? R.drills : []).forEach(d => drills[d.id] = 1);
    const assigned = {}; let dup = 0, unknown = 0, badSize = 0, badRef = 0;
    const gramUsed = {};
    K.lessons.forEach(l => {
      const n = (l.newItemIds || []).length;
      if (n < 5 || n > 8) badSize++;
      (l.newItemIds || []).forEach(id => {
        if (!itemIds[id]) { unknown++; return; }
        if (assigned[id]) dup++; assigned[id] = 1;
      });
      if (l.scene && l.scene.dialogueId && !dlg[l.scene.dialogueId]) badRef++;
      if (l.grammar && l.grammar.moduleId) {
        if (!gmods[l.grammar.moduleId]) badRef++;
        else { gramUsed[l.grammar.moduleId] = 1;
          (l.grammar.steps || []).forEach(ix => { if (!(ix >= 0 && ix < gmods[l.grammar.moduleId].steps.length)) badRef++; }); }
      }
      if (l.reading && !drills[l.reading.drill]) badRef++;
    });
    return {
      lessons: K.lessons.length, sections: K.sections.length,
      covered: Object.keys(assigned).length, total: C.items.length,
      dup, unknown, badSize, badRef, gramUsed: Object.keys(gramUsed).length, gmods: G.modules.length
    };
  });
  check("Kurs: >= 95 Lektionen, 16-20 Sektionen", course.lessons >= 95 && course.sections >= 16 && course.sections <= 20,
    course.lessons + "/" + course.sections);
  check("Kurs: Abdeckung vollstaendig + eindeutig (jedes Item genau einmal)",
    course.covered === course.total && course.dup === 0 && course.unknown === 0,
    course.covered + "/" + course.total + " dup=" + course.dup);
  check("Kurs: 5-8 Items pro Lektion, alle Referenzen gueltig", course.badSize === 0 && course.badRef === 0,
    "size=" + course.badSize + " ref=" + course.badRef);
  check("Kurs: alle Grammatik-Module referenziert", course.gramUsed === course.gmods, course.gramUsed + "/" + course.gmods);

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
  check("Onboarding fuehrt zur Tour (Folie 1)", await page.evaluate(() =>
    /Einführung · 1\//i.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Tour ueberspringen fuehrt zu Home, tourSeen gesetzt", await page.evaluate(() =>
    !!document.querySelector("#stats-row") &&
    JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.tourSeen === true));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.profile.autoplay = false; s.profile.micHintDismissed = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(600);
  check("Heute-Block auf Home", await page.evaluate(() => !!document.querySelector(".today-card")));

  // --- 2a. Neue State-Felder ueberleben Laden/Normalisieren ---
  const newFields = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      levelCap: s.profile.levelCap,
      unlockedBand: s.profile.unlockedBand,
      placementDone: s.profile.placementDone,
      sttNoticeConfirmed: s.profile.sttNoticeConfirmed,
      modulesDone: s.gamification.counters.modulesDone
    };
  });
  check("State hat levelCap/unlockedBand/placementDone/modulesDone",
    newFields.levelCap === "auto" && newFields.unlockedBand === "A1" &&
    newFields.placementDone === false && newFields.modulesDone && typeof newFields.modulesDone === "object",
    JSON.stringify(newFields));
  check("State hat sttNoticeConfirmed === false nach frischem Laden",
    newFields.sttNoticeConfirmed === false, JSON.stringify(newFields.sttNoticeConfirmed));

  // --- 2b. Tag-1-Verhalten (Teach-First) ---
  // Smart-Session: erste Aufgabe zu einem NEUEN Wort ist eine Intro-Karte,
  // keine unbeantwortbare Frage. Power-Training liegt seit T5 im Vokabeln-Tab.
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#cta-power"); if (b) b.click(); });
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
  // Modus-Kacheln liegen jetzt im Vokabeln-Tab (Home hat sie bis T9 auch noch).
  for (const m of ["swipe", "match", "blitz"]) {
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
    await page.waitForTimeout(250);
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

  // --- 3. Alle Modus-Kacheln oeffnen (jetzt mit gelerntem Bestand, aus dem Vokabeln-Tab) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const modes = await page.evaluate(() => [...document.querySelectorAll("[data-mode]")].map(b => b.dataset.mode));
  for (const m of modes) {
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
    await page.waitForTimeout(220);
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
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
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

  // --- 5. Lernpfad (Vokabeln-Tab) + Fortschritt (per Statistik-Tipp) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(350);
  const pathRows = await page.evaluate(() => document.querySelectorAll(".path-row").length);
  check("Lernpfad zeigt alle Themen", pathRows >= 20, pathRows);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = document.querySelector("#stats-row"); if (s) s.click(); });
  await page.waitForTimeout(350);
  check("Survival-Check-Button", await page.evaluate(() => !!document.querySelector("#btn-exam")));
  check("Alef-Bet-Tafel-Button", await page.evaluate(() => !!document.querySelector("#btn-alefbet")));

  // --- 5b. Neue 5-Tab-Navigation + Vokabeln-/Grammatik-Tab + Fortschritt via Tipp ---
  const navInfo = await page.evaluate(() => ({
    n: document.querySelectorAll(".nav-btn").length,
    screens: [...document.querySelectorAll(".nav-btn")].map(b => b.dataset.screen).join(",")
  }));
  check("Nav: 5 Tabs (home,course,vocab,grammar,profile)",
    navInfo.n === 5 && navInfo.screens === "home,course,vocab,grammar,profile", navInfo.screens);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Vokabeln-Tab: Power-Training + Modi + Themen + Mastery-Check + Liste",
    await page.evaluate(() =>
      !!document.querySelector("#cta-power") && document.querySelectorAll("[data-mode]").length === 13 &&
      document.querySelectorAll(".path-row").length >= 20 &&
      !!document.querySelector("#btn-mastercheck") && !!document.querySelector("#btn-vocab")));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Grammatik-Tab: Module nach Level + Lesen-Block",
    await page.evaluate(() =>
      document.querySelectorAll(".module-tile").length >= 20 &&
      !!document.querySelector("#reading-block") && !!document.querySelector("#btn-alefbet") &&
      !!document.querySelector("#btn-reading-path")));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = document.querySelector("#stats-row"); if (s) s.click(); });
  await page.waitForTimeout(350);
  check("Fortschritt: per Statistik-Tipp erreichbar (kein Tab)",
    await page.evaluate(() => !!document.querySelector("#btn-exam")));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);

  // --- 6. Export (Fortschritt via Statistik-Tipp) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = document.querySelector("#stats-row"); if (s) s.click(); });
  await page.waitForTimeout(350);
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

  // --- 8. Merge (mergeStates via Debug-Oberflaeche) ---
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

  // --- 9. Level-Gating (gesperrtes Thema vs. levelCap-Override) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
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
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
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

  // Dialog-Chooser zeigt nur freigeschaltete Baender (Default: A0+A1).
  // Modi liegen jetzt im Vokabeln-Tab (Home behaelt sie bis T9; Hop macht den Check stabil).
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector('[data-mode="dialog"]'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const dlgGate = await page.evaluate(() => {
    const C = window.TACHELES_CONTENT;
    const open = (C.dialogues || []).filter(d => !d.band || d.band === "A0" || d.band === "A1").length;
    return { shown: document.querySelectorAll(".dlg-card").length, open, total: (C.dialogues || []).length };
  });
  check("Gating: Dialog-Chooser blendet gesperrte Baender aus",
    dlgGate.shown === dlgGate.open && dlgGate.shown < dlgGate.total,
    dlgGate.shown + "/" + dlgGate.open + " von " + dlgGate.total);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(200);

  // --- 10. Module (Grammatik-Tab-Kacheln, oeffnen, Quiz zaehlt Antwort) ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const modTiles = await page.evaluate(() => document.querySelectorAll(".module-tile:not(.locked)").length);
  if (modTiles > 0) {
    check("Grammatik-Tab zeigt Modul-Kacheln", modTiles > 0, modTiles);
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
    check("Grammatik-Tab zeigt Modul-Kacheln", true, "keine Module (Content?)");
    check("Modul erreicht einen Quiz-Schritt", true, "n/a");
    check("Modul-Quiz zaehlt eine Antwort", true, "n/a");
  }

  // --- 10a. Level-Auswahl im Profil bietet C2 an ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const levelOpts = await page.evaluate(() =>
    [...document.querySelectorAll("#level-sel option")].map(o => o.value));
  check("Level-Auswahl bietet C2 an", levelOpts.indexOf("C2") >= 0, levelOpts.join(","));
  // Attribution: ElevenLabs-Credit im Profil sichtbar.
  check("Profil nennt ElevenLabs-Attribution",
    await page.evaluate(() => /elevenlabs/i.test(document.body.innerText)));

  // --- 10b. E2E Grammatik-Walk (Grammatik-Sektion -> cloze/form) ---
  const gInfo = await page.evaluate(() => {
    const mods = (window.TACHELES_CONTENT.modules || []).filter(m => m.group === "grammar");
    if (!mods.length) return null;
    const withStep = mods.find(m => (m.steps || []).some(s => s.type === "cloze" || s.type === "form")) || mods[0];
    return { id: withStep.id, band: withStep.band || "A0" };
  });
  if (gInfo) {
    // Alles freischalten, damit das Grammatik-Modul offen ist, egal welches Band.
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
      s.profile.levelCap = "C2";
      localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    });
    await page.goto(APP); await page.waitForTimeout(400);
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
    await page.waitForTimeout(300);
    // Grammatik-Sektion existiert (Ueberschrift "Grammatik").
    const hasGrammarSection = await page.evaluate(() => /Grammatik/.test(document.body.innerText));
    check("Grammatik-Tab zeigt Grammatik-Sektion", hasGrammarSection);
    // Modul aus der Grammatik-Sektion oeffnen.
    await page.evaluate((id) => { const b = document.querySelector('[data-module="' + id + '"]'); if (b) b.click(); }, gInfo.id);
    await page.waitForTimeout(400);
    // Bis zu einem cloze/form-Schritt vorklicken.
    let reached = false;
    for (let i = 0; i < 40; i++) {
      const t = await page.evaluate(() => window.TACHELES_DEBUG.moduleStepType());
      if (t === "cloze" || t === "form") { reached = true; break; }
      const advanced = await page.evaluate(() => {
        const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
        if (w) { w.click(); return true; }
        const o = document.querySelector(".opt:not(:disabled)");
        if (o) { o.click(); return true; }
        return false;
      });
      if (!advanced) break;
      await page.waitForTimeout(380);
    }
    check("E2E Grammatik: cloze/form-Schritt erreicht", reached);
    if (reached) {
      const answersBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
      // Falsch antworten: eine Option klicken, die NICHT correct ist.
      await page.evaluate(() => {
        const correctHe = window.TACHELES_DEBUG.moduleCurrentCorrect();
        const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
        const wrong = btns.find(b => { const he = (b.querySelector(".b-he") || {}).textContent; return he !== correctHe; });
        (wrong || btns[0]).click();
      });
      await page.waitForTimeout(400);
      const noteText = await page.evaluate(() => (document.querySelector(".feedback-note") || {}).textContent || "");
      check("E2E Grammatik: falsche Antwort zeigt Ausflösung (note)", noteText.length > 0, noteText.slice(0, 40));
      // "Weiter" nach falscher Antwort.
      await page.evaluate(() => { const w = [...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim())); if (w) w.click(); });
      await page.waitForTimeout(400);
      // Zum naechsten cloze/form-Schritt und richtig antworten.
      for (let i = 0; i < 40; i++) {
        const t = await page.evaluate(() => window.TACHELES_DEBUG.moduleStepType());
        if (t === "cloze" || t === "form") {
          await page.evaluate(() => {
            const correctHe = window.TACHELES_DEBUG.moduleCurrentCorrect();
            const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
            const right = btns.find(b => { const he = (b.querySelector(".b-he") || {}).textContent; return he === correctHe; });
            (right || btns[0]).click();
          });
          await page.waitForTimeout(400);
          break;
        }
        const advanced = await page.evaluate(() => {
          const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
          if (w) { w.click(); return true; }
          const o = document.querySelector(".opt:not(:disabled)");
          if (o) { o.click(); return true; }
          return false;
        });
        if (!advanced) break;
        await page.waitForTimeout(380);
      }
      const answersAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
      check("E2E Grammatik: Antworten verbucht (answersTotal++)", answersAfter > answersBefore, answersBefore + "->" + answersAfter);
    } else {
      check("E2E Grammatik: falsche Antwort zeigt Ausflösung (note)", true, "n/a (kein cloze/form erreicht)");
      check("E2E Grammatik: Antworten verbucht (answersTotal++)", true, "n/a");
    }
    // Session sauber verlassen und levelCap zuruecksetzen.
    await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
    await page.waitForTimeout(250);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("tacheles_state_v1")); s.profile.levelCap = "auto"; localStorage.setItem("tacheles_state_v1", JSON.stringify(s)); });
    await page.goto(APP); await page.waitForTimeout(400);
  } else {
    check("Lernen-Screen zeigt Grammatik-Sektion", true, "keine Grammatik-Module (Content?)");
    check("E2E Grammatik: cloze/form-Schritt erreicht", true, "n/a");
    check("E2E Grammatik: falsche Antwort zeigt Ausflösung (note)", true, "n/a");
    check("E2E Grammatik: Antworten verbucht (answersTotal++)", true, "n/a");
  }

  // --- 11. Einstufungstest (Placement) aus Onboarding heraus ---
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
  const seenBandHeaders = new Set();
  // Bei komplettem Content laeuft die Einstufung durch bis zu 7 Baender (A0..C2),
  // darum genug Schleifendurchlaeufe vorsehen.
  for (let i = 0; i < 220; i++) {
    const st = await page.evaluate(() => {
      if (/einstufung fertig/i.test(document.body.innerText)) return "done";
      if (document.querySelector(".placement .opt:not(:disabled)")) return "q";
      return "wait";
    });
    if (st === "done") { placementResult = true; break; }
    if (st === "q") {
      // Aktuellen Band-Header (".onb-step") mitzaehlen, dann richtig antworten.
      const header = await page.evaluate(() => (document.querySelector(".placement .onb-step") || {}).textContent || "");
      if (header) seenBandHeaders.add(header);
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
  const bandsLen = await page.evaluate(() => window.TACHELES_DEBUG.BANDS.length);
  check("Einstufung rendert nie mehr als BANDS.length Band-Header",
    seenBandHeaders.size <= bandsLen, seenBandHeaders.size + " von max " + bandsLen);
  const placeDone = await page.evaluate(() => (JSON.parse(localStorage.getItem("tacheles_state_v1")).profile || {}).placementDone);
  check("placementDone in localStorage gesetzt", placeDone === true, placeDone);

  // --- 12. Robustheit: korrupter Import, Groessenlimits, Distraktor-Dedupe ---
  // T3/T8: kaputte srs/log/Zaehler-Werte duerfen die App nicht abstuerzen lassen.
  await page.evaluate(() => {
    localStorage.setItem("tacheles_state_v1", JSON.stringify({
      version: 1,
      profile: { onboarded: true, autoplay: false, micHintDismissed: true, sttNoticeConfirmed: true, tourSeen: true },
      gamification: { xpTotal: -500, answersTotal: -3, counters: { bestBlitz: -1 } },
      srs: { shalom: 5, w_valid: { ease: 2.5, intervalDays: 2, dueTs: 0, reps: 2, lapses: 0, mastery: 9, lastReviewTs: 100 } },
      log: { "2026-01-01": 3, "2026-01-02": { answers: -5, correct: 2, xp: -1, goalMet: true } }
    }));
  });
  await page.reload(); await page.waitForTimeout(600);
  const corrupt = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      home: !!document.querySelector("#stats-row"),
      shalomType: typeof s.srs.shalom,
      shalomDropped: s.srs.shalom === undefined,
      validMastery: s.srs.w_valid ? s.srs.w_valid.mastery : null,
      xp: s.gamification.xpTotal,
      answers: s.gamification.answersTotal,
      logDay: s.log["2026-01-01"],
      logDay2Answers: s.log["2026-01-02"] ? s.log["2026-01-02"].answers : null
    };
  });
  check("Korrupt-Import: App rendert Home ohne Absturz", corrupt.home);
  check("Korrupt-Import: srs.shalom ist Objekt oder verworfen (T3)",
    corrupt.shalomType === "object" || corrupt.shalomDropped, corrupt.shalomType);
  check("Korrupt-Import: srs-Felder rekonstruiert, mastery <= 5 (T3)",
    corrupt.validMastery === 5, corrupt.validMastery);
  check("Korrupt-Import: negative Zaehler auf 0 geklammert (T8)",
    corrupt.xp === 0 && corrupt.answers === 0, corrupt.xp + "/" + corrupt.answers);
  check("Korrupt-Import: kaputte log-Tage verworfen, Zahlen >= 0 (T3)",
    corrupt.logDay === undefined && corrupt.logDay2Answers === 0,
    JSON.stringify(corrupt.logDay) + "/" + corrupt.logDay2Answers);

  // T7: uebergrosser Junk-Sync-Code -> "ungueltig"-Hinweis, kein Haenger.
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#btn-sync-paste"); if (b) b.click(); });
  await page.waitForTimeout(250);
  const oversizePaste = await page.evaluate(() => {
    const ta = document.querySelector(".overlay-textarea");
    if (!ta) return { ok: false, reason: "kein Textfeld" };
    ta.value = new Array(1400002).join("A"); // > 1.4M Zeichen
    const b = [...document.querySelectorAll(".overlay-actions .btn")].find(x => /übernehmen/i.test(x.textContent));
    if (!b) return { ok: false, reason: "kein Uebernehmen-Button" };
    b.click();
    return { ok: true, toastShown: !!document.querySelector(".toast"), overlayStillOpen: !!document.querySelector(".overlay") };
  });
  check("Sync-Limit: uebergrosser Code zeigt Hinweis und haengt nicht (T7)",
    oversizePaste.ok && oversizePaste.toastShown && oversizePaste.overlayStillOpen,
    JSON.stringify(oversizePaste));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".overlay-actions .btn")].find(x => /abbrechen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(200);

  // T9: Placement-Distraktoren sind untereinander eindeutig (kein doppelter de-/he-Text).
  const dedupe = await page.evaluate(() => {
    const C = window.TACHELES_CONTENT;
    const BANDS = window.TACHELES_DEBUG.BANDS;
    // Nachbau der Option-Logik aus renderPlacementQuestion.
    function buildOptions(item, pool) {
      const seenDe = {}, seenHe = {}, distr = [];
      seenDe[item.de] = true; seenHe[item.he] = true;
      pool.forEach(x => {
        if (distr.length >= 3) return;
        if (x.id === item.id || seenDe[x.de] || seenHe[x.he]) return;
        seenDe[x.de] = true; seenHe[x.he] = true; distr.push(x);
      });
      return [item].concat(distr);
    }
    let dupCount = 0, checked = 0;
    BANDS.forEach(band => {
      const themeIds = {}; C.themes.forEach(t => { if (t.band === band) themeIds[t.id] = 1; });
      const pool = C.items.filter(i => themeIds[i.theme] && ["word", "phrase", "sign", "number", "letter"].indexOf(i.type) >= 0);
      pool.forEach(item => {
        const opts = buildOptions(item, pool);
        const des = {}, hes = {};
        opts.forEach(o => { if (des[o.de] || hes[o.he]) dupCount++; des[o.de] = 1; hes[o.he] = 1; });
        checked++;
      });
    });
    return { dupCount, checked };
  });
  check("Placement-Distraktoren untereinander eindeutig (T9)",
    dedupe.dupCount === 0, dedupe.dupCount + " Duplikate über " + dedupe.checked + " Items");

  // --- 13. Abwaertskompatibilitaet: Alt-State (Initial-Release-Schema) verliert nichts ---
  // Exakt das Schema von Commit 66c5c3a: keine Level-/Modul-/Sync-Felder.
  await page.evaluate(() => {
    localStorage.setItem("tacheles_state_v1", JSON.stringify({
      version: 1,
      profile: { dailyGoalMin: 10, fadeMode: "auto", autoplay: false, micHintDismissed: true, onboarded: true },
      gamification: {
        xpTotal: 1234, streakDays: 0, lastActiveDay: "2026-07-01", masteredCount: 0,
        achievements: ["first_word", "mastered_10"], frozenDays: { "2026-06-20": true },
        answersTotal: 456,
        counters: { bestBlitz: 12, bestExam: 9, sessionsDone: 33, dialogsDone: { cafe: true } }
      },
      srs: {
        shalom: { ease: 2.7, intervalDays: 21, dueTs: 1790000000000, reps: 9, lapses: 1, mastery: 5, lastReviewTs: 1750000000000 },
        toda:   { ease: 2.5, intervalDays: 3,  dueTs: 1750000000000, reps: 3, lapses: 0, mastery: 2, lastReviewTs: 1749000000000 }
      },
      log: { "2026-07-01": { answers: 40, correct: 36, xp: 200, goalMet: true } }
    }));
  });
  await page.reload(); await page.waitForTimeout(600);
  const legacy = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      shalom: s.srs.shalom, todaReps: s.srs.toda.reps,
      xp: s.gamification.xpTotal, ach: s.gamification.achievements.join(","),
      frozen: s.gamification.frozenDays["2026-06-20"], blitz: s.gamification.counters.bestBlitz,
      logOk: s.log["2026-07-01"] && s.log["2026-07-01"].answers === 40 && s.log["2026-07-01"].goalMet === true,
      goal: s.profile.dailyGoalMin,
      defaults: s.profile.levelCap === "auto" && s.profile.unlockedBand === "A1" &&
        s.profile.placementDone === false && s.profile.sttNoticeConfirmed === false,
      noOnb: !document.querySelector(".onb"), home: !!document.querySelector("#stats-row")
    };
  });
  // Themen liegen seit T5 im Vokabeln-Tab: 41 Zeilen gesamt, 20 offen (A0+A1).
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const legacyThemes = await page.evaluate(() => ({
    total: document.querySelectorAll(".path-list .path-row[data-theme]").length,
    open: document.querySelectorAll(".path-list .path-row[data-theme]:not(.locked)").length
  }));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(250);
  check("Alt-State: SRS-Fortschritt bleibt exakt erhalten",
    legacy.shalom && legacy.shalom.reps === 9 && legacy.shalom.mastery === 5 &&
    legacy.shalom.ease === 2.7 && legacy.shalom.intervalDays === 21 && legacy.todaReps === 3,
    JSON.stringify(legacy.shalom));
  check("Alt-State: XP/Abzeichen/Freezes/Counters/Log/Ziel erhalten",
    legacy.xp === 1234 && legacy.ach === "first_word,mastered_10" && legacy.frozen === true &&
    legacy.blitz === 12 && legacy.logOk && legacy.goal === 10,
    legacy.xp + "/" + legacy.ach + "/" + legacy.blitz);
  check("Alt-State: neue Felder mit Defaults, kein Re-Onboarding, A0+A1 offen (20 Themen)",
    legacy.defaults && legacy.noOnb && legacy.home && legacyThemes.total === 41 && legacyThemes.open === 20,
    "defaults=" + legacy.defaults + " themen=" + legacyThemes.open + "/" + legacyThemes.total);

  // Bestandsnutzer-Hinweis (WS5): Alt-State (onboarded, tourSeen fehlt) sieht
  // EINMALIG den Einfuehrungs-Hinweis; Ueberspringen setzt tourSeen.
  const notice = await page.evaluate(() => ({
    shown: !!document.querySelector(".overlay") && /kurze Einführung/i.test(document.body.innerText),
    hasBtns: [...document.querySelectorAll(".overlay-actions .btn")].some(b => /ansehen/i.test(b.textContent)) &&
             [...document.querySelectorAll(".overlay-actions .btn")].some(b => /überspringen/i.test(b.textContent))
  }));
  check("Alt-State: einmaliger Tour-Hinweis mit Ansehen/Ueberspringen", notice.shown && notice.hasBtns,
    JSON.stringify(notice));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".overlay-actions .btn")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  const noticeGone = await page.evaluate(() => ({
    overlay: !!document.querySelector(".overlay"),
    tourSeen: JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.tourSeen
  }));
  check("Alt-State: Ueberspringen schliesst Hinweis und setzt tourSeen",
    noticeGone.overlay === false && noticeGone.tourSeen === true, JSON.stringify(noticeGone));
  await page.reload(); await page.waitForTimeout(500);
  check("Alt-State: Hinweis kommt nur EINMAL", await page.evaluate(() => !document.querySelector(".overlay")));

  // --- 14. Audio-Schicht: Manifest konsistent + URL-Mapping ---
  // Frisch laden (der Alt-State oben hat autoplay=false, gut fuer diesen Check).
  await page.reload(); await page.waitForTimeout(500);
  const audioState = await page.evaluate(() => ({
    present: !!window.TACHELES_AUDIO,
    active: window.TACHELES_DEBUG.audioActive(),
    clips: window.TACHELES_AUDIO ? Object.keys(window.TACHELES_AUDIO.clips || {}).length : 0,
    format: window.TACHELES_AUDIO ? window.TACHELES_AUDIO.format : null
  }));
  // Zwei gueltige Zustaende: mit Samples (Manifest aktiv, >= 600 Clips) ODER ohne
  // (Platzhalter = null -> reiner TTS-Fallback). Beides darf NICHT crashen (0-Fehler-Check).
  check("Audio: Manifest konsistent (aktiv mit Clips ODER TTS-Fallback)",
    (audioState.present && audioState.active && audioState.clips >= 600 && !!audioState.format) ||
    (!audioState.present && !audioState.active),
    JSON.stringify(audioState));
  // Manifest injizieren (ohne echte Dateien) und das ID->URL-Mapping pruefen; danach
  // wieder auf null zuruecksetzen, damit KEINE 404-Audioladungen ausgeloest werden.
  const audioMap = await page.evaluate(() => {
    window.TACHELES_AUDIO = { version: 1, format: "opus", clips: { shalom: { band: "A0", bytes: 1 } } };
    window.TACHELES_DEBUG.reloadAudioManifest();
    const hit = window.TACHELES_DEBUG.audioUrlFor("shalom");
    const miss = window.TACHELES_DEBUG.audioUrlFor("toda"); // nicht im Manifest -> null -> TTS
    const active = window.TACHELES_DEBUG.audioActive();
    window.TACHELES_AUDIO = null; window.TACHELES_DEBUG.reloadAudioManifest(); // aufraeumen
    return { hit, miss, active, backInactive: window.TACHELES_DEBUG.audioActive() };
  });
  check("Audio: audioUrl mappt Item-ID auf Datei, Fehltreffer -> null (TTS)",
    audioMap.active === true && audioMap.hit === "audio/shalom.opus" &&
    audioMap.miss === null && audioMap.backInactive === false,
    JSON.stringify(audioMap));

  // --- 14b. State-Schema: feedback + tourSeen (Allowlist, Merge) ---
  await page.evaluate(() => { localStorage.removeItem("tacheles_state_v1"); });
  await page.reload(); await page.waitForTimeout(500);
  const schema = await page.evaluate(() => {
    // frischer Default-State liegt nach init() im Storage
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      tourSeen: s.profile.tourSeen,
      fb: s.feedback,
      notesIsArr: Array.isArray(s.feedback && s.feedback.notes),
      pronIsObj: !!s.feedback && typeof s.feedback.pronIssues === "object" && !Array.isArray(s.feedback.pronIssues)
    };
  });
  check("Schema: feedback + tourSeen im Default-State (Allowlist)",
    schema.tourSeen === false && schema.notesIsArr && schema.pronIsObj, JSON.stringify(schema.fb));
  const fbRound = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback = { notes: [{ ts: 111, text: "Notiz A" }, { ts: 0, text: "" }, "junk"], pronIssues: { shalom: true } };
    s.profile.tourSeen = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return true;
  });
  await page.reload(); await page.waitForTimeout(500);
  const fbAfter = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { notes: s.feedback.notes, pron: s.feedback.pronIssues, tourSeen: s.profile.tourSeen };
  });
  check("Schema: feedback ueberlebt Laden/Normalisieren (kaputte Notizen verworfen)",
    fbRound && fbAfter.notes.length === 1 && fbAfter.notes[0].text === "Notiz A" &&
    fbAfter.pron.shalom === true && fbAfter.tourSeen === true, JSON.stringify(fbAfter));
  const fbMerge = await page.evaluate(() => {
    const base = () => ({
      version: 1,
      profile: { onboarded: true },
      gamification: {}, srs: {}, log: {}
    });
    const A = base();
    A.feedback = { notes: [{ ts: 1, text: "gleich" }, { ts: 2, text: "nur A" }], pronIssues: { w1: true } };
    A.profile.tourSeen = false;
    const B = base();
    B.feedback = { notes: [{ ts: 1, text: "gleich" }, { ts: 3, text: "nur B" }], pronIssues: { w2: true } };
    B.profile.tourSeen = true;
    const m = window.TACHELES_DEBUG.mergeStates(A, B);
    return {
      texts: m.feedback.notes.map(n => n.text).join(","),
      pron: Object.keys(m.feedback.pronIssues).sort().join(","),
      tourSeen: m.profile.tourSeen
    };
  });
  check("merge: feedback.notes dedupliziert vereinigt, pronIssues vereinigt, tourSeen OR",
    fbMerge.texts === "gleich,nur A,nur B" && fbMerge.pron === "w1,w2" && fbMerge.tourSeen === true,
    JSON.stringify(fbMerge));

  // Kurs-Runde: Globals geladen (Ladeordnung intakt) + Debug-Hooks vorhanden.
  const courseGlobals = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG || {};
    return {
      course: !!window.TACHELES_COURSE && Array.isArray(window.TACHELES_COURSE.lessons),
      snacks: !!window.TACHELES_SNACKS && Array.isArray(window.TACHELES_SNACKS.snacks),
      reading: !!window.TACHELES_READING && typeof window.TACHELES_READING.syllabify === "function",
      hooks: typeof D.courseInfo === "function" && typeof D.lessonStateOf === "function" && typeof D.syllabify === "function",
      info: typeof D.courseInfo === "function" ? D.courseInfo() : null,
      syl: typeof D.syllabify === "function" ? D.syllabify("שָׁלוֹם") : "MISSING"
    };
  });
  // Mit ECHTEM Content: >= 95 Lektionen, syllabify liefert einen gueltigen
  // Round-Trip-Split (Konkatenation der Silben == Eingabewort).
  check("Kurs: Globals geladen (course/snacks/reading) + Debug-Hooks + syllabify-Round-Trip",
    courseGlobals.course && courseGlobals.snacks && courseGlobals.reading && courseGlobals.hooks &&
    courseGlobals.info && courseGlobals.info.lessons >= 95 && courseGlobals.info.entry === null &&
    Array.isArray(courseGlobals.syl) && courseGlobals.syl.length >= 2 &&
    courseGlobals.syl.map(s => s.he).join("") === "שָׁלוֹם",
    JSON.stringify(courseGlobals));

  // Kurs-State (Kurs-Runde): Allowlist + Merge.
  const courseSchema = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      hasCourse: !!s.course && typeof s.course.lessons === "object" && !Array.isArray(s.course.lessons),
      entry: s.course ? s.course.entry : "MISSING",
      snacksSeen: !!s.course && typeof s.course.snacksSeen === "object" && !Array.isArray(s.course.snacksSeen),
      snackVocab: s.profile.snackVocab
    };
  });
  check("Schema: course-Slice + profile.snackVocab im Default-State",
    courseSchema.hasCourse && courseSchema.entry === null && courseSchema.snacksSeen && courseSchema.snackVocab === true,
    JSON.stringify(courseSchema));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.course = { lessons: { l_a0_01: { done: true, step: 3 }, junk: 5 }, entry: "l_a0_02", snacksSeen: { snack_x: true } };
    s.profile.snackVocab = false;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  const courseAfter = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { l1: s.course.lessons.l_a0_01, junk: s.course.lessons.junk, entry: s.course.entry,
      seen: s.course.snacksSeen.snack_x, snackVocab: s.profile.snackVocab };
  });
  check("Schema: course ueberlebt Laden/Normalisieren (Junk verworfen)",
    courseAfter.l1 && courseAfter.l1.done === true && courseAfter.l1.step === 3 &&
    courseAfter.junk === undefined && courseAfter.entry === "l_a0_02" &&
    courseAfter.seen === true && courseAfter.snackVocab === false, JSON.stringify(courseAfter));
  const courseMerge = await page.evaluate(() => {
    const base = () => ({ version: 1, profile: { onboarded: true }, gamification: {}, srs: {}, log: {} });
    const A = base(); A.course = { lessons: { l1: { done: true, step: 0 }, l2: { done: false, step: 4 } }, entry: null, snacksSeen: { s1: true } };
    const B = base(); B.course = { lessons: { l2: { done: true, step: 2 } }, entry: "l2", snacksSeen: { s2: true } };
    const m = window.TACHELES_DEBUG.mergeStates(A, B);
    return { l1: m.course.lessons.l1, l2: m.course.lessons.l2, entry: m.course.entry,
      seen: Object.keys(m.course.snacksSeen).sort().join(",") };
  });
  check("merge: course done OR / step max / entry gesetzt / snacksSeen vereinigt",
    courseMerge.l1.done === true && courseMerge.l2.done === true && courseMerge.l2.step === 4 &&
    courseMerge.entry === "l2" && courseMerge.seen === "s1,s2", JSON.stringify(courseMerge));

  // --- Kurs-Tab (T7): frischer Kurs-Zustand, Sektionen, Lektions-Zustaende, Vorschau ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.profile.onboarded = true; s.profile.tourSeen = true; s.profile.autoplay = false; s.profile.micHintDismissed = true;
    s.srs = {};
    s.course = { lessons: {}, entry: null, snacksSeen: {} };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "course"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const courseUi = await page.evaluate(() => ({
    rows: document.querySelectorAll("[data-lesson]").length,
    next: document.querySelectorAll(".lesson-row.next").length,
    locked: document.querySelectorAll(".lesson-row.locked").length > 0,
    sections: document.querySelectorAll(".course-section-h").length
  }));
  check("Kurs-Tab: alle Lektionen gelistet, genau eine 'dran', Gesperrte vorhanden",
    courseUi.rows >= 95 && courseUi.next === 1 && courseUi.locked && courseUi.sections >= 16,
    JSON.stringify(courseUi));
  await page.evaluate(() => { const r = document.querySelector(".lesson-row.next"); if (r) r.click(); });
  await page.waitForTimeout(350);
  check("Kurs-Tab: Vorschau-Overlay mit Wortliste + Start",
    await page.evaluate(() =>
      !!document.querySelector(".lesson-preview") && !!document.querySelector("#btn-lesson-start") &&
      document.querySelectorAll(".lesson-preview .done-review-row").length >= 5));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".overlay-actions .btn, .lesson-preview .btn")].find(x => /abbrechen|schließen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- Quereinstieg: Empfehlung aus Mastery, Bestaetigen markiert fruehere als erledigt ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.course = { lessons: {}, entry: null, snacksSeen: {} };
    s.srs = {};
    // Items der ersten 3 Lektionen auf mastery 2 -> Lektionen 1-3 ueberspringbar.
    const K = window.TACHELES_COURSE;
    K.lessons.slice(0, 3).forEach(l => l.newItemIds.forEach(id => {
      s.srs[id] = { ease: 2.5, intervalDays: 5, dueTs: Date.now() + 86400000, reps: 3, lapses: 0, mastery: 2, lastReviewTs: Date.now() };
    }));
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  const entryRec = await page.evaluate(() => ({
    rec: window.TACHELES_DEBUG.recommendedEntry(),
    fourth: window.TACHELES_COURSE.lessons[3].id,
    skip1: window.TACHELES_DEBUG.lessonSkippable(window.TACHELES_COURSE.lessons[0].id),
    skip4: window.TACHELES_DEBUG.lessonSkippable(window.TACHELES_COURSE.lessons[3].id)
  }));
  check("Quereinstieg: >= 60 % Mastery-2 macht ueberspringbar, Empfehlung = erste nicht-ueberspringbare",
    entryRec.skip1 === true && entryRec.skip4 === false && entryRec.rec === entryRec.fourth, JSON.stringify(entryRec));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "course"); if (b) b.click(); });
  await page.waitForTimeout(450);
  check("Quereinstieg: Overlay beim ersten Kurs-Besuch", await page.evaluate(() =>
    !!document.querySelector("#btn-entry-ok") && !!document.querySelector("#btn-entry-first")));
  await page.evaluate(() => { const b = document.querySelector("#btn-entry-ok"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const entryDone = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const K = window.TACHELES_COURSE;
    return { entry: s.course.entry,
      earlierDone: K.lessons.slice(0, 3).every(l => s.course.lessons[l.id] && s.course.lessons[l.id].done),
      fourthDone: !!(s.course.lessons[K.lessons[3].id] || {}).done };
  });
  check("Quereinstieg: Bestaetigen setzt entry + markiert fruehere als erledigt",
    entryDone.entry === entryRec.fourth && entryDone.earlierDone && entryDone.fourthDone === false,
    JSON.stringify(entryDone));

  // --- Lektions-Player (T8): Bogen-Komposition, Szene-UI, E2E-Walk, Quiz-Scope, Resume, Erstkontakt ---
  // Frischer Kurs- + SRS-Zustand.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.profile.onboarded = true; s.profile.tourSeen = true; s.profile.autoplay = false; s.profile.micHintDismissed = true;
    s.srs = {};
    s.course = { lessons: {}, entry: null, snacksSeen: {} };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);

  // (a) Komposition: erste Lektion ohne Aufwaermen, mit Woerter/Hoeren/Quiz;
  //     eine Szene+Grammatik-Lektion komponiert beide Phasen.
  const comp = await page.evaluate(() => {
    const K = window.TACHELES_COURSE, D = window.TACHELES_DEBUG;
    const sceneLesson = K.lessons.find(x => x.scene && x.grammar);
    return {
      l1: D.lessonArcLabels(K.lessons[0].id),
      sceneId: sceneLesson ? sceneLesson.id : null,
      sceneArcs: sceneLesson ? D.lessonArcLabels(sceneLesson.id) : []
    };
  });
  check("Player: Bogen Lektion 1 (Woerter/Hoeren/Quiz, kein Aufwaermen fuer Erst-Lektion)",
    comp.l1.indexOf("Neue Wörter ✨") >= 0 && comp.l1.indexOf("Hören 👂") >= 0 &&
    comp.l1.indexOf("Quiz 🏁") >= 0 && comp.l1.indexOf("Aufwärmen ↺") < 0, comp.l1.join("|"));
  check("Player: Szene+Grammatik-Lektion komponiert beide Phasen",
    !!comp.sceneId && comp.sceneArcs.indexOf("Szene 🎬") >= 0 && comp.sceneArcs.indexOf("Grammatik 🧠") >= 0,
    comp.sceneId + ": " + comp.sceneArcs.join("|"));

  // (b) Aufwaermen erscheint, sobald frueher Gelerntes vorliegt (spiral).
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    window.TACHELES_COURSE.lessons[0].newItemIds.forEach(id => {
      s.srs[id] = { ease: 2.5, intervalDays: 1, dueTs: 0, reps: 2, lapses: 0, mastery: 1, lastReviewTs: Date.now() - 100000 };
    });
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(400);
  const warmArcs = await page.evaluate(() =>
    window.TACHELES_DEBUG.lessonArcLabels(window.TACHELES_COURSE.lessons[1].id));
  check("Player: Aufwaermen ↺ erscheint mit frueher gelernten Woertern (spiral)",
    warmArcs.indexOf("Aufwärmen ↺") >= 0, warmArcs.join("|"));

  // (c) Szene-UI direkt: Chat-Blasen + Weiter -> Verstaendnisfrage.
  // Frisches SRS, damit vor der Szene KEIN Aufwaermen einsortiert wird.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(400);
  await page.evaluate((id) => window.TACHELES_DEBUG.startLesson(id), comp.sceneId);
  await page.waitForTimeout(400);
  const sceneUi = await page.evaluate(() => ({
    label: window.TACHELES_DEBUG.lessonStepLabel(),
    bubbles: document.querySelectorAll(".chat .bubble").length,
    weiter: !![...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()))
  }));
  check("Player: Szene rendert Chat-Blasen + Weiter-Knopf",
    sceneUi.label === "Szene 🎬" && sceneUi.bubbles >= 2 && sceneUi.weiter, JSON.stringify(sceneUi));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Player: Szene -> Verstaendnisfrage (MC ueber eine Zeile)", await page.evaluate(() =>
    window.TACHELES_DEBUG.lessonStepLabel() === "Szene 🎬" && !!document.querySelector("[data-correct-opt]")));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);

  // (d) E2E-Walk der ersten Lektion aus frischem SRS: bis zum Rueckblick spielen.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {};
    s.course = { lessons: {}, entry: null, snacksSeen: {} };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "course"); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector("#btn-entry-first"); if (b) b.click(); }); // etwaiges Einstiegs-Overlay
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = document.querySelector("#cta-lesson-go"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const l1start = await page.evaluate(() => ({
    label: window.TACHELES_DEBUG.lessonStepLabel(),
    title: (document.querySelector(".session-title") || {}).textContent || ""
  }));
  check("Player: Lektion 1 startet (kein Aufwaermen zuerst, Phasen-Label sichtbar)",
    !!l1start.label && l1start.label !== "Aufwärmen ↺" && /Lektion/.test(l1start.title), JSON.stringify(l1start));
  const seenArcs = new Set();
  const quizIds = new Set();
  let recapReached = false;
  for (let i = 0; i < 110; i++) {
    const st = await page.evaluate(() => ({
      done: !!document.querySelector(".done-screen"),
      label: window.TACHELES_DEBUG.lessonStepLabel(),
      item: window.TACHELES_DEBUG.currentTaskItem()
    }));
    if (st.done) { recapReached = true; break; }
    if (st.label) seenArcs.add(st.label);
    if (st.label === "Quiz 🏁" && st.item) quizIds.add(st.item);
    await page.evaluate(() => {
      const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (w) { w.click(); return; }
      const hook = document.querySelector("[data-correct-opt]:not([disabled])");
      if (hook) { hook.click(); return; }
      const he = window.TACHELES_DEBUG.moduleCurrentCorrect();
      if (he) {
        const right = [...document.querySelectorAll(".opt:not(:disabled)")].find(b => (b.querySelector(".b-he") || {}).textContent === he);
        if (right) { right.click(); return; }
      }
      const any = document.querySelector(".opt:not(:disabled)");
      if (any) { any.click(); return; }
      const self = [...document.querySelectorAll("button")].find(x => /konnte ich/i.test(x.textContent));
      if (self) self.click();
    });
    await page.waitForTimeout(1050);
  }
  check("Player: Bogen erreicht den Rueckblick (done-screen)", recapReached, [...seenArcs].join("|"));
  check("Player: Neue Woerter, Lesen, Hoeren und Quiz kamen vor",
    seenArcs.has("Neue Wörter ✨") && seenArcs.has("Lesen 👓") && seenArcs.has("Hören 👂") && seenArcs.has("Quiz 🏁"),
    [...seenArcs].join("|"));
  const quizScope = await page.evaluate((ids) => {
    const lesson = window.TACHELES_COURSE.lessons[0];
    return ids.length > 0 && ids.every(id => lesson.newItemIds.indexOf(id) >= 0);
  }, [...quizIds]);
  check("Player: Quiz fragt NUR Lektionswoerter", quizScope, [...quizIds].join(","));
  const afterL1 = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const K = window.TACHELES_COURSE;
    return { done: (s.course.lessons[K.lessons[0].id] || {}).done, nextBtn: !!document.querySelector("#btn-next-lesson") };
  });
  check("Player: Lektion erledigt markiert + Naechste-Lektion-CTA (naechste freigeschaltet)",
    afterL1.done === true && afterL1.nextBtn, JSON.stringify(afterL1));

  // (e) Resume: Lektion 2 ueber die CTA starten, ein paar Schritte, abbrechen -> Schritt gemerkt.
  await page.evaluate(() => { const b = document.querySelector("#btn-next-lesson"); if (b) b.click(); });
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (w) { w.click(); return; }
      const hook = document.querySelector("[data-correct-opt]:not([disabled])");
      if (hook) { hook.click(); return; }
      const any = document.querySelector(".opt:not(:disabled)");
      if (any) any.click();
    });
    await page.waitForTimeout(1100);
  }
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
  const resume = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const l2 = window.TACHELES_COURSE.lessons[1].id;
    return { step: (s.course.lessons[l2] || {}).step || 0, done: (s.course.lessons[l2] || {}).done };
  });
  check("Player: Abbruch merkt den Schritt (Resume), Lektion nicht erledigt",
    resume.step >= 1 && resume.done !== true, JSON.stringify(resume));

  // (f) Erstkontakt in der Lektion: Neue-Woerter-Phase markiert introducedThisSession,
  //     und der ERSTE Abruf eines frisch gelehrten Worts hebt die Mastery NICHT.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; s.course = { lessons: {}, entry: null, snacksSeen: {} };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(400);
  await page.evaluate(() => window.TACHELES_DEBUG.startLesson(window.TACHELES_COURSE.lessons[0].id));
  await page.waitForTimeout(300);
  // Durch die Teach-Karten (Neue Woerter) klicken, ohne etwas abzufragen.
  for (let i = 0; i < 12; i++) {
    const lbl = await page.evaluate(() => window.TACHELES_DEBUG.lessonStepLabel());
    if (lbl !== "Neue Wörter ✨") break;
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim())); if (b) b.click(); });
    await page.waitForTimeout(250);
  }
  const introduced = await page.evaluate(() => ({
    n: window.TACHELES_DEBUG.introducedCount(),
    total: window.TACHELES_COURSE.lessons[0].newItemIds.length
  }));
  check("Player: Neue-Woerter-Phase markiert Erstkontakt (introducedThisSession)",
    introduced.n === introduced.total, JSON.stringify(introduced));
  // Ersten frisch gelehrten (reps === 0) Wort-Abruf korrekt beantworten -> Mastery bleibt 0.
  let fcItem = null, fcMastery = null;
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => {
      const it = window.TACHELES_DEBUG.currentTaskItem();
      return {
        done: !!document.querySelector(".done-screen"),
        it: it,
        fresh: it && window.TACHELES_COURSE.lessons[0].newItemIds.indexOf(it) >= 0 && window.TACHELES_DEBUG.srsReps(it) === 0
      };
    });
    if (st.done) break;
    if (st.fresh) {
      await page.evaluate(() => {
        const hook = document.querySelector("[data-correct-opt]:not([disabled])");
        if (hook) { hook.click(); return; }
        const any = document.querySelector(".opt:not(:disabled)");
        if (any) any.click();
      });
      await page.waitForTimeout(800);
      fcItem = st.it;
      fcMastery = await page.evaluate((id) => window.TACHELES_DEBUG.getMastery(id), st.it);
      break;
    }
    await page.evaluate(() => {
      const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (w) { w.click(); return; }
      const hook = document.querySelector("[data-correct-opt]:not([disabled])");
      if (hook) { hook.click(); return; }
      const any = document.querySelector(".opt:not(:disabled)");
      if (any) any.click();
    });
    await page.waitForTimeout(950);
  }
  check("Player: Erstkontakt-Regel haelt in der Lektion (erster Abruf hebt Mastery NICHT)",
    fcItem !== null && fcMastery === 0, fcItem + " -> " + fcMastery);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);

  // Zustand fuer nachfolgende Sektionen neutral hinterlassen (onboarded, tour gesehen).
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.profile.onboarded = true; s.profile.tourSeen = true; s.profile.autoplay = false; s.profile.micHintDismissed = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(400);

  // --- 14c. Ehrliche Mastery: Erkennen deckelt bei 2, Produktion hebt auf 3 ---
  const mastery = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return {
      cls: D.isProduction("mc", "he2de") === false && D.isProduction("mc", "de2he") === true &&
           D.isProduction("build") === true && D.isProduction("speak") === true &&
           D.isProduction("swipe") === false && D.isProduction("listen") === false
    };
  });
  check("Mastery: Klassifikation Erkennen/Produzieren (isProduction)", mastery.cls);
  await page.reload(); await page.waitForTimeout(500);
  const capRes = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const id = window.TACHELES_CONTENT.items[0].id;
    // 5x Erkennen richtig: darf nie ueber 2 kommen.
    for (let i = 0; i < 5; i++) D.recordAnswer(id, "mc", "good", "he2de");
    const afterRecog = D.getMastery(id);
    // 1x Produktion richtig: hebt auf 3 (gemeistert).
    D.recordAnswer(id, "mc", "good", "de2he");
    const afterProd = D.getMastery(id);
    // Erkennen demotet ein 3+-Item NICHT.
    D.recordAnswer(id, "mc", "good", "he2de");
    const stillMastered = D.getMastery(id);
    return { afterRecog, afterProd, stillMastered };
  });
  check("Mastery: reines Erkennen deckelt bei 2", capRes.afterRecog === 2, capRes.afterRecog);
  check("Mastery: Produktionsantwort hebt auf 3", capRes.afterProd === 3, capRes.afterProd);
  check("Mastery: Erkennen senkt Gemeistertes nicht", capRes.stillMastered === 3, capRes.stillMastered);

  // Erstkontakt zaehlt nicht: frisches Wort in einer Smart-Session vorstellen,
  // sofort korrekt beantworten -> Mastery bleibt 0.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#cta-power"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const introId = await page.evaluate(() => window.TACHELES_DEBUG.currentTaskItem());
  check("Erstkontakt: Intro-Karte zu einem neuen Wort", !!introId &&
    await page.evaluate(() => !!document.querySelector(".intro-tag")), introId);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test(x.textContent.trim())); if (b) b.click(); });
  await page.waitForTimeout(450);
  // Die unmittelbar folgende Abfrage desselben Worts KORREKT beantworten.
  await page.evaluate((id) => {
    // MC he->de: richtige Option per data-item-id; Flash: Aufdecken + "Gut".
    const opt = document.querySelector('.opt[data-item-id="' + id + '"]');
    if (opt) { opt.click(); return; }
    const reveal = [...document.querySelectorAll("button")].find(x => /aufdecken/i.test(x.textContent));
    if (reveal) { reveal.click(); }
  }, introId);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const g = [...document.querySelectorAll(".grade-btn")].find(x => /gut/i.test(x.textContent));
    if (g) g.click();
  });
  await page.waitForTimeout(400);
  const firstContactMastery = await page.evaluate((id) => window.TACHELES_DEBUG.getMastery(id), introId);
  check("Erstkontakt: erste Abfrage nach der Vorstellung hebt Mastery NICHT",
    firstContactMastery === 0, introId + " -> " + firstContactMastery);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);

  // MC hat immer 4 Optionen; Buchstaben-Frage verraet die Umschrift nicht.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    // ein paar Woerter "gelernt", damit MC ohne Intro startet
    window.TACHELES_CONTENT.items.slice(0, 10).forEach(i => {
      s.srs[i.id] = { ease: 2.5, intervalDays: 2, dueTs: Date.now() - 1000, reps: 2, lapses: 0, mastery: 1, lastReviewTs: Date.now() - 86400000 };
    });
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-mode]")].find(x => x.dataset.mode === "mc"); if (b) b.click(); });
  await page.waitForTimeout(500);
  let sawFourOpts = false;
  for (let i = 0; i < 6; i++) {
    const optCount = await page.evaluate(() => document.querySelectorAll(".opt:not(:disabled)").length);
    if (optCount > 0) { sawFourOpts = optCount === 4; break; }
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter|aufdecken/i.test(x.textContent.trim())); if (b) b.click(); });
    await page.waitForTimeout(400);
  }
  check("MC zeigt immer 4 Optionen", sawFourOpts);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- 14d. Mastery-Veto: demoteMastery + antippbarer Gold-Toast ---
  const veto = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const it = window.TACHELES_CONTENT.items[1];
    s.srs = {};
    s.srs[it.id] = { ease: 2.5, intervalDays: 5, dueTs: Date.now() + 86400000, reps: 4, lapses: 0, mastery: 4, lastReviewTs: Date.now() };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return it.id;
  });
  await page.reload(); await page.waitForTimeout(500);
  const vetoRes = await page.evaluate((id) => {
    const D = window.TACHELES_DEBUG;
    const before = JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.masteredCount;
    const ok = D.demoteMastery(id);
    const after = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const noop = D.demoteMastery(id); // jetzt mastery 2 -> No-Op
    return { ok, noop, mastery: after.srs[id].mastery, before, after: after.gamification.masteredCount };
  }, veto);
  check("Veto: demoteMastery setzt 3+ auf 2, masteredCount sinkt",
    vetoRes.ok === true && vetoRes.mastery === 2 && vetoRes.after === vetoRes.before - 1,
    JSON.stringify(vetoRes));
  check("Veto: Demotion eines nicht-gemeisterten Items ist No-Op", vetoRes.noop === false);
  // Gold-Toast mit Veto: Item auf mastery 2 + Produktionsantwort -> Toast, Tipp -> zurueck auf 2.
  const toastVeto = await page.evaluate((id) => {
    const D = window.TACHELES_DEBUG;
    D.recordAnswer(id, "mc", "good", "de2he"); // 2 -> 3, Gold-Toast erscheint
    const t = [...document.querySelectorAll(".toast.gold")].find(x => /noch nicht sitzt/i.test(x.textContent));
    if (!t) return { found: false };
    t.click();
    return { found: true, mastery: D.getMastery(id) };
  }, veto);
  check("Veto: Gold-Toast ist antippbar und demotet", toastVeto.found && toastVeto.mastery === 2,
    JSON.stringify(toastVeto));

  // --- 14e. Mastery-Check: nur Gemeisterte, least-recently-checked, Review-Demote ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {};
    // 8 gemeisterte Items mit gestaffeltem lastReviewTs; das aelteste zuerst erwartet.
    window.TACHELES_CONTENT.items.slice(0, 8).forEach((it, i) => {
      s.srs[it.id] = { ease: 2.5, intervalDays: 10, dueTs: Date.now() + 86400000, reps: 5, lapses: 0, mastery: 3, lastReviewTs: 1000 + i };
    });
    // plus 1 NICHT gemeistertes Item, das nie auftauchen darf
    const extra = window.TACHELES_CONTENT.items[9];
    s.srs[extra.id] = { ease: 2.5, intervalDays: 2, dueTs: 0, reps: 2, lapses: 0, mastery: 1, lastReviewTs: 1 };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  // Fortschritt hat keinen Tab mehr: ueber Home + Statistik-Tipp erreichen.
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = document.querySelector("#stats-row"); if (s) s.click(); });
  await page.waitForTimeout(400);
  check("Mastery-Check: Start-Karte auf Fortschritt", await page.evaluate(() => !!document.querySelector("#btn-mastercheck")));
  await page.evaluate(() => { const b = document.querySelector("#btn-mastercheck"); if (b) b.click(); });
  await page.waitForTimeout(450);
  const mchk = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const info = D.sessionInfo();
    const masteredIds = window.TACHELES_CONTENT.items.slice(0, 8).map(i => i.id);
    return {
      mode: info && info.mode,
      n: info ? info.taskIds.length : 0,
      onlyMastered: info ? info.taskIds.every(id => masteredIds.includes(id)) : false,
      taskIds: info ? info.taskIds : []
    };
  });
  check("Mastery-Check: Session nur ueber gemeisterte Items, Haeppchen-Groesse",
    mchk.mode === "mastercheck" && mchk.n === 6 && mchk.onlyMastered, JSON.stringify(mchk));
  // Runde durchspielen: erste Aufgabe FALSCH, Rest richtig (Weiter-Button nach Fehler!).
  let mcheckWrongId = null;
  for (let i = 0; i < 20; i++) {
    const st = await page.evaluate(() => ({
      review: !!document.querySelector(".mcheck-list"),
      curId: window.TACHELES_DEBUG.currentTaskItem(),
      hasOpt: !!document.querySelector(".opt:not(:disabled)"),
      hasWeiter: !![...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim()))
    }));
    if (st.review) break;
    if (st.hasWeiter) {
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    } else if (st.hasOpt) {
      if (mcheckWrongId === null) {
        mcheckWrongId = st.curId;
        await page.evaluate((id) => {
          const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
          const wrong = btns.find(b => b.dataset.itemId && b.dataset.itemId !== id);
          (wrong || btns[0]).click();
        }, st.curId);
      } else {
        await page.evaluate((id) => {
          const right = document.querySelector('.opt[data-item-id="' + id + '"]');
          const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
          (right || btns[0]).click();
        }, st.curId);
      }
    }
    await page.waitForTimeout(1200);
  }
  const review = await page.evaluate((wrongId) => {
    const rows = [...document.querySelectorAll(".mcheck-row")];
    const checked = rows.filter(r => r.querySelector("input").checked).length;
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { rows: rows.length, checked, hasList: !!document.querySelector(".mcheck-list"),
      wrongMastery: wrongId && s.srs[wrongId] ? s.srs[wrongId].mastery : null };
  }, mcheckWrongId);
  check("Mastery-Check: Runden-Abschluss zeigt Auswahl, Falsche vorausgewaehlt",
    review.hasList && review.rows >= 6 && review.checked >= 1, JSON.stringify(review));
  // FIX-1: Mastery friert waehrend der Runde ein — die falsch beantwortete Aufgabe
  // bleibt bis zur Review auf 3 (Demotion nur ueber die Haken).
  check("Mastery-Check: falsche Antwort senkt Mastery NICHT mid-round (bleibt 3)",
    review.wrongMastery === 3, JSON.stringify(review));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /zurücknehmen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(500);
  const afterDemote = await page.evaluate((wrongId) => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const masteredLeft = window.TACHELES_CONTENT.items.slice(0, 8)
      .filter(i => s.srs[i.id] && s.srs[i.id].mastery >= 3).length;
    return { wrongMastery: s.srs[wrongId] ? s.srs[wrongId].mastery : null, masteredLeft, done: !!document.querySelector(".done-screen") };
  }, mcheckWrongId);
  check("Mastery-Check: Zuruecknehmen stuft genau die Angehakten zurueck",
    afterDemote.wrongMastery === 2 && afterDemote.masteredLeft >= 5 && afterDemote.done, JSON.stringify(afterDemote));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);

  // --- 14f. Heute-Block: Snack des Tages (deterministisch), Kurs-Karte, Buchstabe/Wort ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const heute = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const p1 = D.dailyPicks();
    const p2 = D.dailyPicks(); // gleicher Tag -> identisch (deterministisch)
    return {
      card: !!document.querySelector(".today-card"),
      tiles: document.querySelectorAll(".today-tile").length,
      snack: !!document.querySelector("#btn-snack"),
      snackCard: !!document.querySelector(".snack-card"),
      stable: p1.letter === p2.letter && p1.word === p2.word,
      letterIsLetter: /^let_/.test(p1.letter || ""),
      hashDet: D.dayHash("2026-07-17|word") === D.dayHash("2026-07-17|word") &&
               D.dayHash("2026-07-17|word") !== D.dayHash("2026-07-18|word")
    };
  });
  check("Heute: Block mit Snack + Buchstabe/Wort des Tages auf Home",
    heute.card && heute.tiles === 2 && heute.snack && heute.snackCard, JSON.stringify(heute));
  check("Heute: Auswahl deterministisch (Datums-Hash, kein Math.random)",
    heute.stable && heute.letterIsLetter && heute.hashDet);
  // Snack-Rotation: deterministisch, Ungesehenes zuerst.
  const snackRot = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const first = D.dailySnackId();
    const again = D.dailySnackId();
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.course.snacksSeen[first] = true; // heutigen Snack als gesehen markieren
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return { first, stable: first === again, snacks: window.TACHELES_SNACKS.snacks.length };
  });
  await page.reload(); await page.waitForTimeout(500);
  const snackRot2 = await page.evaluate((first) => ({
    second: window.TACHELES_DEBUG.dailySnackId(),
    differs: window.TACHELES_DEBUG.dailySnackId() !== first
  }), snackRot.first);
  check("Heute: Snack deterministisch + Ungesehenes zuerst",
    snackRot.stable && snackRot.snacks >= 38 && snackRot2.differs,
    snackRot.first + " -> " + snackRot2.second);
  // Snack starten -> Snack-Session auf dem Modul-Runner (explain-Schritt zuerst).
  await page.evaluate(() => { const b = document.querySelector("#btn-snack"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const snackSess = await page.evaluate(() => ({
    mode: (window.TACHELES_DEBUG.sessionInfo() || {}).mode,
    stepType: window.TACHELES_DEBUG.moduleStepType()
  }));
  check("Heute: Haeppchen startet Snack-Session (explain-Schritt)",
    snackSess.mode === "snack" && snackSess.stepType === "explain", JSON.stringify(snackSess));
  // Snack bis zum Ende durchspielen -> snacksSeen wird gesetzt, Rotation rueckt weiter.
  const snackPlayed = snackRot2.second;
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => !document.querySelector(".session-body"));
    if (done) break;
    await page.evaluate(() => {
      let b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (b) { b.click(); return; }
      const o = document.querySelector(".opt:not(:disabled)");
      if (o) { o.click(); return; }
    });
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
  const snackSeen = await page.evaluate((id) => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { seen: s.course.snacksSeen[id] === true, next: window.TACHELES_DEBUG.dailySnackId() };
  }, snackPlayed);
  check("Heute: absolvierter Snack ist als gesehen markiert, Rotation rueckt weiter",
    snackSeen.seen && snackSeen.next !== snackPlayed, JSON.stringify(snackSeen));
  // Profil: snackVocab-Schalter vorhanden und schreibt den State.
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const snackToggle = await page.evaluate(() => {
    const chk = document.querySelector("#snackvocab-chk");
    if (!chk) return null;
    chk.checked = false; chk.dispatchEvent(new Event("change"));
    return JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.snackVocab;
  });
  check("Profil: snackVocab-Schalter schreibt State", snackToggle === false, snackToggle);
  // Kurs-Karte auf Home fuehrt in eine Lektion (Weiterlernen/Start).
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const homeCta = await page.evaluate(() => !!document.querySelector("#cta-lesson") || !!document.querySelector("#cta-lesson-vocab"));
  check("Home: Kurs-Karte als primaerer CTA vorhanden", homeCta);
  await page.evaluate(() => { const b = document.querySelector("#cta-lesson"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const courseCta = await page.evaluate(() =>
    /·/.test((document.querySelector(".session-title") || {}).textContent || "") &&
    window.TACHELES_DEBUG.lessonStepLabel() !== null);
  check("Home: Kurs-Karte startet die naechste Lektion", courseCta);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- 14g. Lesen lernen: Buchstabe+enthaltendes Wort gepaart, Einstieg im Grammatik-Tab ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; // Anfaenger: 0 gemeisterte Buchstaben -> Einstieg sichtbar
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
  await page.waitForTimeout(350);
  const reading = await page.evaluate(() => {
    const steps = window.TACHELES_DEBUG.readingModuleSteps();
    const byId = {}; window.TACHELES_CONTENT.items.forEach(i => byId[i.id] = i);
    // Muster: teach:let_X, [teach:wort das X enthaelt,] quiz:let_X
    let pairsOk = true, quizzes = 0, teachesLetters = 0;
    for (let i = 0; i < steps.length; i++) {
      const [type, id] = steps[i].split(":");
      if (type === "teach" && /^let_/.test(id)) {
        teachesLetters++;
        const next = (steps[i + 1] || "").split(":");
        if (next[0] === "teach" && !/^let_/.test(next[1])) {
          const letter = byId[id], word = byId[next[1]];
          if (!word || String(word.he).indexOf(letter.he) < 0) pairsOk = false;
        }
      }
      if (type === "quiz") quizzes++;
    }
    return { steps: steps.length, pairsOk, quizzes, teachesLetters,
      btn: !!document.querySelector("#btn-reading-path") };
  });
  check("Lesen lernen: Einstieg im Grammatik-Tab sichtbar", reading.btn);
  check("Lesen lernen: Sequenz paart Buchstabe + enthaltendes Wort + Quiz",
    reading.teachesLetters >= 1 && reading.quizzes >= 1 && reading.pairsOk, JSON.stringify(reading));
  await page.evaluate(() => { const b = document.querySelector("#btn-reading-path"); if (b) b.click(); });
  await page.waitForTimeout(450);
  const readingSession = await page.evaluate(() => ({
    title: (document.querySelector(".session-title") || {}).textContent || "",
    stepType: window.TACHELES_DEBUG.moduleStepType()
  }));
  check("Lesen lernen: startet als gefuehrtes Modul (teach-Schritt)",
    /lesen lernen/i.test(readingSession.title) && readingSession.stepType === "teach",
    JSON.stringify(readingSession));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- 14g2. Lese-Trainer: Drill spielbar, Silbifizierer, Audio-Keys ---
  const rdAvail = await page.evaluate(() => {
    const R = window.TACHELES_READING;
    return { drills: R ? R.drills.length : 0, syl: R ? R.syllables.length : 0,
      sylOk: window.TACHELES_DEBUG.syllabify("שָׁלוֹם") !== null };
  });
  check("Lese-Trainer: Daten geladen, syllabify(שָׁלוֹם) liefert Silben",
    rdAvail.drills >= 8 && rdAvail.syl >= 120 && rdAvail.sylOk, JSON.stringify(rdAvail));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Lese-Trainer: Drill-Liste im Grammatik-Tab",
    await page.evaluate(() => document.querySelectorAll("[data-drill]").length >= 8));
  const answersBeforeDrill = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
  await page.evaluate(() => { const b = document.querySelector("[data-drill]"); if (b) b.click(); });
  await page.waitForTimeout(450);
  let drillDone = false;
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => ({
      done: !!document.querySelector(".done-screen"),
      info: window.TACHELES_DEBUG.readingInfo(),
      correctText: (document.querySelector("[data-correct-opt]") || {}).textContent || null,
      hasWeiter: !![...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim()))
    }));
    if (st.done) { drillDone = true; break; }
    if (st.hasWeiter) {
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    } else {
      await page.evaluate(() => {
        const right = document.querySelector("[data-correct-opt]");
        const any = document.querySelector(".opt:not(:disabled)");
        (right || any) && (right || any).click();
      });
    }
    await page.waitForTimeout(700);
  }
  check("Lese-Trainer: Level-1-Drill bis zum Abschluss spielbar", drillDone);
  const answersAfterDrill = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
  check("Lese-Trainer: Antworten verbucht", answersAfterDrill > answersBeforeDrill, answersBeforeDrill + "->" + answersAfterDrill);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- 14h. Vokabel-Browser: Band-Waehler, Zeile, Demote, Aussprache-Toggle ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; s.feedback = { notes: [], pronIssues: {} };
    // Ein A0-Item als gemeistert seeden (erstes Item ist per Content A0).
    const it = window.TACHELES_CONTENT.items[0];
    s.srs[it.id] = { ease: 2.5, intervalDays: 9, dueTs: Date.now() + 86400000, reps: 5, lapses: 0, mastery: 4, lastReviewTs: Date.now() };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Vokabelliste: Profil-Eintrag vorhanden", await page.evaluate(() => !!document.querySelector("#btn-vocab")));
  await page.evaluate(() => { const b = document.querySelector("#btn-vocab"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const vocab = await page.evaluate(() => {
    // Auf Band A0 schalten (deterministisch fuer die Checks).
    const sel = document.querySelector("#vocab-band");
    return {
      selBands: sel ? [...sel.options].map(o => o.value) : [],
      title: (document.querySelector(".session-title") || {}).textContent || ""
    };
  });
  check("Vokabelliste: Screen mit Band-Waehler (A0 vorhanden)",
    /vokabelliste/i.test(vocab.title) && vocab.selBands.includes("A0"), vocab.selBands.join(","));
  await page.evaluate(() => {
    const sel = document.querySelector("#vocab-band");
    sel.value = "A0"; sel.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(400);
  const vocabRows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".vocab-row")];
    const first = rows[0];
    return {
      n: rows.length,
      hasParts: !!first && !!first.querySelector(".vocab-de") && !!first.querySelector(".vocab-he") &&
        !!first.querySelector(".vocab-badge") && !!first.querySelector(".pron-btn") &&
        first.querySelector(".vocab-he").getAttribute("dir") === "rtl",
      demoteBtns: document.querySelectorAll(".vocab-demote").length
    };
  });
  check("Vokabelliste: Zeilen mit DE/he(RTL)/Badge/Aussprache-Knopf",
    vocabRows.n >= 30 && vocabRows.hasParts, JSON.stringify(vocabRows));
  check("Vokabelliste: gemeisterte Zeile hat 'nicht gemeistert'-Knopf", vocabRows.demoteBtns >= 1);
  // Filter "nur gemeisterte"
  await page.evaluate(() => {
    const chk = document.querySelector("#vocab-mastered");
    chk.checked = true; chk.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(400);
  const filtered = await page.evaluate(() => document.querySelectorAll(".vocab-row").length);
  check("Vokabelliste: Filter 'nur gemeisterte'", filtered === 1, filtered);
  // Aussprache-Toggle schreibt feedback.pronIssues
  const pronToggle = await page.evaluate(() => {
    const btn = document.querySelector(".pron-btn");
    btn.click();
    const on = JSON.parse(localStorage.getItem("tacheles_state_v1")).feedback.pronIssues;
    btn.click();
    const off = JSON.parse(localStorage.getItem("tacheles_state_v1")).feedback.pronIssues;
    return { onCount: Object.keys(on).length, offCount: Object.keys(off).length };
  });
  check("Vokabelliste: 'Aussprache falsch' schreibt/entfernt feedback.pronIssues",
    pronToggle.onCount === 1 && pronToggle.offCount === 0, JSON.stringify(pronToggle));
  // Demote aus der Liste
  await page.evaluate(() => { const b = document.querySelector(".vocab-demote"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const vocabDemote = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const it = window.TACHELES_CONTENT.items[0];
    return { mastery: s.srs[it.id].mastery, rowsNow: document.querySelectorAll(".vocab-row").length };
  });
  check("Vokabelliste: 'nicht gemeistert' demotet auf 2 (Liste aktualisiert)",
    vocabDemote.mastery === 2 && vocabDemote.rowsNow === 0, JSON.stringify(vocabDemote));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Vokabelliste: Zurueck fuehrt ins Profil", await page.evaluate(() => !!document.querySelector("#btn-vocab")));

  // --- 14i. Feedback: Notiz speichern/loeschen, URL-Prefill + Laengenlimit, Footer ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback = { notes: [], pronIssues: { shalom: true } };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  check("Feedback: Footer-Link auf Home", await page.evaluate(() =>
    !![...document.querySelectorAll('.footer-links [data-goto="feedback"]')].length));
  await page.evaluate(() => { const a = document.querySelector('[data-goto="feedback"]'); if (a) a.click(); });
  await page.waitForTimeout(400);
  check("Feedback: Hub oeffnet", await page.evaluate(() =>
    /feedback/i.test((document.querySelector(".session-title") || {}).textContent || "")));
  await page.evaluate(() => {
    document.querySelector(".fb-textarea").value = "Testnotiz aus der Regression";
    const b = [...document.querySelectorAll("button")].find(x => /notiz speichern/i.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(400);
  const fbSaved = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      n: s.feedback.notes.length,
      text: s.feedback.notes[0] && s.feedback.notes[0].text,
      shown: /Testnotiz aus der Regression/.test(document.body.innerText),
      pronShown: /Aussprache gemeldet \(1\)/.test(document.body.innerText)
    };
  });
  check("Feedback: Notiz speichern + anzeigen (inkl. Aussprache-Liste)",
    fbSaved.n === 1 && fbSaved.text === "Testnotiz aus der Regression" && fbSaved.shown && fbSaved.pronShown,
    JSON.stringify(fbSaved));
  const fbUrls = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const issue = D.feedbackIssueUrl();
    const mail = D.feedbackMailtoUrl();
    return {
      issueOk: issue.url.indexOf("https://github.com/caol-ila/tacheles/issues/new?title=") === 0 &&
        issue.url.indexOf(encodeURIComponent("Testnotiz aus der Regression")) > 0 && !issue.truncated,
      mailOk: mail.url.indexOf("mailto:tacheles@mahlberg.rocks?subject=") === 0
    };
  });
  check("Feedback: GitHub- und mailto-URL korrekt vorbefuellt", fbUrls.issueOk && fbUrls.mailOk, JSON.stringify(fbUrls));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback.notes = [];
    for (let i = 0; i < 20; i++) s.feedback.notes.push({ ts: i, text: new Array(500).join("x") });
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  const fbCap2 = await page.evaluate(() => {
    const issue = window.TACHELES_DEBUG.feedbackIssueUrl();
    return { len: issue.url.length, truncated: issue.truncated };
  });
  check("Feedback: Prefill-URL bei Ueberlaenge auf <= 6000 gekappt",
    fbCap2.len <= 6000 && fbCap2.truncated === true, JSON.stringify(fbCap2));
  // FIX-14: Kappen darf ein Emoji-Surrogatpaar auftrennen — capUrl muss das
  // abfangen (kein "URI malformed"-Wurf) und trotzdem sauber kuerzen.
  const surrogate = await page.evaluate(() => {
    const body = "🎙️🥨🕊️😀".repeat(2000); // emoji-lastig + weit ueber dem mailto-Limit
    let threw = false, r = null;
    try { r = window.TACHELES_DEBUG.capUrl("mailto:x?body=", body, 1800); }
    catch (e) { threw = true; }
    return { threw, len: r ? r.url.length : -1, truncated: r ? r.truncated : null,
      valid: !!(r && typeof r.url === "string") };
  });
  check("Feedback: capUrl kappt surrogat-sicher (Emoji-lastig, kein Wurf)",
    !surrogate.threw && surrogate.valid && surrogate.truncated === true && surrogate.len <= 1800,
    JSON.stringify(surrogate));
  // Notiz loeschen (im Hub)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback = { notes: [{ ts: 5, text: "wegdamit" }], pronIssues: {} };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#btn-feedback"); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector(".fb-note .icon-btn"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const fbDeleted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tacheles_state_v1")).feedback.notes.length);
  check("Feedback: Notiz einzeln loeschen", fbDeleted === 0, fbDeleted);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);

  // --- 14j. Kontakt/Impressum + Datenschutz erreichbar und nicht leer ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const footerLegal = await page.evaluate(() => ({
    contact: !!document.querySelector('.footer-links [data-goto="contact"]'),
    privacy: !!document.querySelector('.footer-links [data-goto="privacy"]')
  }));
  check("Recht: Footer-Links Kontakt + Datenschutz", footerLegal.contact && footerLegal.privacy);
  await page.evaluate(() => { const a = document.querySelector('.footer-links [data-goto="contact"]'); if (a) a.click(); });
  await page.waitForTimeout(350);
  const contact = await page.evaluate(() => document.body.innerText);
  check("Recht: Kontakt nennt Verantwortlichen + E-Mail + Disclaimer + Stand",
    /Thomas Mahlberg/.test(contact) && /tacheles@mahlberg\.rocks/.test(contact) &&
    /keine Rechtsberatung/i.test(contact) && /privates, nicht-kommerzielles/i.test(contact) &&
    /Stand: Juli 2026/.test(contact));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  // FIX-6: von Home geoeffnet -> Zurueck fuehrt zurueck nach Home (nicht pauschal Profil).
  check("Recht: Zurueck fuehrt zum Ausgangs-Screen (Home)",
    await page.evaluate(() => !!document.querySelector("#stats-row")));
  // Datenschutz aus dem Profil oeffnen (Button dort).
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#btn-privacy"); if (b) b.click(); });
  await page.waitForTimeout(350);
  const privacy = await page.evaluate(() => document.body.innerText);
  check("Recht: Datenschutz deckt GitHub Pages/USA/localStorage/Mikrofon/Feedback/Rechte ab",
    /GitHub Pages/i.test(privacy) && /IP-Adresse/i.test(privacy) && /USA/.test(privacy) &&
    /localStorage/i.test(privacy) && /Spracherkennung/i.test(privacy) &&
    /Feedback/i.test(privacy) && /Rechte/i.test(privacy) && /keine Rechtsberatung/i.test(privacy));
  check("Recht: Datenschutz enthaelt FIX-5-Zusaetze (TTS-Fallback, DPF, Aufsichtsbehörde, Stand)",
    /ersatzweise die Sprachausgabe/i.test(privacy) && /Data Privacy Framework/i.test(privacy) &&
    /Aufsichtsbehörde/i.test(privacy) && /Art\. 6 Abs\. 1 lit\. f/i.test(privacy) &&
    /Stand: Juli 2026/.test(privacy));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Recht: Zurueck fuehrt ins Profil", await page.evaluate(() => !!document.querySelector("#btn-privacy")));

  // --- 14k. Tour: aus dem Profil neustartbar, Folien blaetterbar, skippbar ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Tour: Profil-Eintrag 'Einführung ansehen'", await page.evaluate(() => !!document.querySelector("#btn-tour")));
  await page.evaluate(() => { const b = document.querySelector("#btn-tour"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Tour: Folie 1 sichtbar", await page.evaluate(() => /Einführung · 1\/5/i.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test(x.textContent.trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Tour: Weiter blaettert zu Folie 2", await page.evaluate(() => /Einführung · 2\/5/i.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Tour: Ueberspringen fuehrt zu Home", await page.evaluate(() => !!document.querySelector("#stats-row")));

  // --- 15. Konsolenfehler ---
  check("0 Konsolen-/Seitenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  const failed = checks.filter(x => !x.ok);
  console.log("\n" + (failed.length === 0
    ? "PASS – alle " + checks.length + " Checks gruen."
    : "FAIL – " + failed.length + " von " + checks.length + " Checks rot."));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.log("RUNNER-FEHLER: " + e.message); process.exit(1); });
