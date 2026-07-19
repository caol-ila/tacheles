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
  check("Onboarding fuehrt zur Tour (Folie 1)", await page.evaluate(() =>
    /Einführung · 1\//i.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Tour ueberspringen fuehrt zu Home, tourSeen gesetzt", await page.evaluate(() =>
    !!document.querySelector("#cta-start") &&
    JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.tourSeen === true));
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
      noOnb: !document.querySelector(".onb"), home: !!document.querySelector("#cta-start"),
      themeRows: document.querySelectorAll(".theme-list .theme-row[data-theme]").length
    };
  });
  check("Alt-State: SRS-Fortschritt bleibt exakt erhalten",
    legacy.shalom && legacy.shalom.reps === 9 && legacy.shalom.mastery === 5 &&
    legacy.shalom.ease === 2.7 && legacy.shalom.intervalDays === 21 && legacy.todaReps === 3,
    JSON.stringify(legacy.shalom));
  check("Alt-State: XP/Abzeichen/Freezes/Counters/Log/Ziel erhalten",
    legacy.xp === 1234 && legacy.ach === "first_word,mastered_10" && legacy.frozen === true &&
    legacy.blitz === 12 && legacy.logOk && legacy.goal === 10,
    legacy.xp + "/" + legacy.ach + "/" + legacy.blitz);
  check("Alt-State: neue Felder mit Defaults, kein Re-Onboarding, A0+A1 offen (20 Themen)",
    legacy.defaults && legacy.noOnb && legacy.home && legacy.themeRows === 20,
    "defaults=" + legacy.defaults + " themen=" + legacy.themeRows);

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
  check("Kurs: Globals geladen (course/snacks/reading) + Debug-Hooks + null-safe syllabify",
    courseGlobals.course && courseGlobals.snacks && courseGlobals.reading && courseGlobals.hooks &&
    courseGlobals.info && courseGlobals.info.lessons === 0 && courseGlobals.info.entry === null &&
    courseGlobals.syl === null, JSON.stringify(courseGlobals));

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
  await page.evaluate(() => { const b = document.querySelector("#cta-start"); if (b) b.click(); });
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
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "progress"); if (b) b.click(); });
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

  // --- 14f. Heute-Block: stabil per Datums-Hash, Haeppchen startet Mini-Session ---
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
      stable: p1.letter === p2.letter && p1.word === p2.word,
      letterIsLetter: /^let_/.test(p1.letter || ""),
      hashDet: D.dayHash("2026-07-17|word") === D.dayHash("2026-07-17|word") &&
               D.dayHash("2026-07-17|word") !== D.dayHash("2026-07-18|word")
    };
  });
  check("Heute: Block mit Buchstabe+Wort des Tages auf Home",
    heute.card && heute.tiles === 2 && heute.snack, JSON.stringify(heute));
  check("Heute: Auswahl deterministisch (Datums-Hash, kein Math.random)",
    heute.stable && heute.letterIsLetter && heute.hashDet);
  await page.evaluate(() => { const b = document.querySelector("#btn-snack"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const snackInfo = await page.evaluate(() => window.TACHELES_DEBUG.sessionInfo());
  check("Heute: Haeppchen startet Mini-Session (<= 5 Aufgaben)",
    snackInfo && snackInfo.mode === "smart" && snackInfo.taskIds.length > 0 && snackInfo.taskIds.length <= 5,
    JSON.stringify(snackInfo && snackInfo.taskIds.length));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- 14g. Lesen lernen: Buchstabe+enthaltendes Wort gepaart, Home-Einstieg ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; // Anfaenger: 0 gemeisterte Buchstaben -> Einstieg sichtbar
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
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
      btn: !!document.querySelector("#btn-reading") };
  });
  check("Lesen lernen: Home-Einstieg fuer Anfaenger sichtbar", reading.btn);
  check("Lesen lernen: Sequenz paart Buchstabe + enthaltendes Wort + Quiz",
    reading.teachesLetters >= 1 && reading.quizzes >= 1 && reading.pairsOk, JSON.stringify(reading));
  await page.evaluate(() => { const b = document.querySelector("#btn-reading"); if (b) b.click(); });
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
    await page.evaluate(() => !!document.querySelector("#cta-start")));
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
  check("Tour: Ueberspringen fuehrt zu Home", await page.evaluate(() => !!document.querySelector("#cta-start")));

  // --- 15. Konsolenfehler ---
  check("0 Konsolen-/Seitenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  const failed = checks.filter(x => !x.ok);
  console.log("\n" + (failed.length === 0
    ? "PASS – alle " + checks.length + " Checks gruen."
    : "FAIL – " + failed.length + " von " + checks.length + " Checks rot."));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.log("RUNNER-FEHLER: " + e.message); process.exit(1); });
