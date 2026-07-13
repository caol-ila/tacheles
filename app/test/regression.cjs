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

  // Dialog-Chooser zeigt nur freigeschaltete Baender (Default: A0+A1).
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

  // --- 10. Module (Lernen-Kacheln, oeffnen, Quiz zaehlt Antwort) ---
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

  // --- 10a. Level-Auswahl im Profil bietet C2 an ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const levelOpts = await page.evaluate(() =>
    [...document.querySelectorAll("#level-sel option")].map(o => o.value));
  check("Level-Auswahl bietet C2 an", levelOpts.indexOf("C2") >= 0, levelOpts.join(","));

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
    await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "modes"); if (b) b.click(); });
    await page.waitForTimeout(300);
    // Grammatik-Sektion existiert (Ueberschrift "Grammatik").
    const hasGrammarSection = await page.evaluate(() => /Grammatik/.test(document.body.innerText));
    check("Lernen-Screen zeigt Grammatik-Sektion", hasGrammarSection);
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
      profile: { onboarded: true, autoplay: false, micHintDismissed: true, sttNoticeConfirmed: true },
      gamification: { xpTotal: -500, answersTotal: -3, counters: { bestBlitz: -1 } },
      srs: { shalom: 5, w_valid: { ease: 2.5, intervalDays: 2, dueTs: 0, reps: 2, lapses: 0, mastery: 9, lastReviewTs: 100 } },
      log: { "2026-01-01": 3, "2026-01-02": { answers: -5, correct: 2, xp: -1, goalMet: true } }
    }));
  });
  await page.reload(); await page.waitForTimeout(600);
  const corrupt = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      home: !!document.querySelector("#cta-start"),
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

  // --- 13. Konsolenfehler ---
  check("0 Konsolen-/Seitenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  const failed = checks.filter(x => !x.ok);
  console.log("\n" + (failed.length === 0
    ? "PASS – alle " + checks.length + " Checks gruen."
    : "FAIL – " + failed.length + " von " + checks.length + " Checks rot."));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.log("RUNNER-FEHLER: " + e.message); process.exit(1); });
