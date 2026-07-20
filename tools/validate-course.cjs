/*
 * Tacheles - Kurs-Validator (Vertrag C1). Aufruf: node tools/validate-course.cjs
 * Exit 0 = gueltig. Prueft Abdeckung (vollstaendig + eindeutig), Groessen,
 * Referenzen, Band-Ordnung, Szenen, Grammatik-Mapping, Reading-Drills.
 */
"use strict";
const path = require("path");
global.window = global.window || {};
const dir = path.resolve(__dirname, "..", "app");
require(path.join(dir, "content.js"));
require(path.join(dir, "grammar.js"));
require(path.join(dir, "course.js"));
try { require(path.join(dir, "reading.js")); } catch (e) { /* optional bis T4 */ }

const C = window.TACHELES_CONTENT, G = window.TACHELES_GRAMMAR, K = window.TACHELES_COURSE;
const R = window.TACHELES_READING || { drills: [] };
const BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
const errs = [], warns = [];
const err = (m) => errs.push(m);

const itemIds = {}; C.items.forEach(i => itemIds[i.id] = i);
const dlgIds = {}; (C.dialogues || []).forEach(d => dlgIds[d.id] = true);
const gmods = {}; (G.modules || []).forEach(m => gmods[m.id] = m);
const drillIds = {}; (R.drills || []).forEach(d => drillIds[d.id] = true);

// V2/V3: Groessen + Sektionen
if (!(K.sections.length >= 16 && K.sections.length <= 20)) err("V2: sections " + K.sections.length + " (soll 16-20)");
if (!(K.lessons.length >= 95)) err("V2: lessons " + K.lessons.length + " (soll >= 95)");
const secIds = {}, secUsed = {}, lessonIds = {};
K.sections.forEach(s => {
  if (secIds[s.id]) err("V3: doppelte section " + s.id);
  secIds[s.id] = s;
  if (BANDS.indexOf(s.band) < 0) err("V3: section " + s.id + " band " + s.band);
  if (!s.title || !s.emoji) err("V3: section " + s.id + " ohne title/emoji");
});

// V1/V4-V7 je Lektion
const assigned = {};   // itemId -> lessonId
const gramSteps = {};  // moduleId -> { stepIdx: 1 }
let prevBand = 0;
K.lessons.forEach((l, li) => {
  const where = l.id + " (#" + li + ")";
  if (lessonIds[l.id]) err("V3: doppelte lesson " + l.id);
  lessonIds[l.id] = 1;
  if (!secIds[l.section]) err("V3: " + where + " section " + l.section + " fehlt");
  else {
    secUsed[l.section] = 1;
    if (secIds[l.section].band !== l.band) err("V4: " + where + " band != section.band");
  }
  if (!l.title || !l.emoji) err("V3: " + where + " ohne title/emoji");
  const bi = BANDS.indexOf(l.band);
  if (bi < 0) err("V4: " + where + " band " + l.band);
  if (bi < prevBand) err("V4: " + where + " band faellt (" + l.band + ")");
  else prevBand = bi;
  const n = (l.newItemIds || []).length;
  if (n < 5 || n > 8) err("V2: " + where + " hat " + n + " newItemIds (soll 5-8)");
  (l.newItemIds || []).forEach(id => {
    if (!itemIds[id]) { err("V1: " + where + " unbekannte Item-ID " + id); return; }
    if (assigned[id]) err("V1: " + id + " doppelt (" + assigned[id] + " + " + l.id + ")");
    assigned[id] = l.id;
  });
  if (l.scene) { // V5
    if (l.scene.dialogueId) {
      if (!dlgIds[l.scene.dialogueId]) err("V5: " + where + " Dialog " + l.scene.dialogueId + " fehlt");
    } else if (Array.isArray(l.scene.lines)) {
      if (l.scene.lines.length < 2 || l.scene.lines.length > 6) err("V5: " + where + " " + l.scene.lines.length + " Szenen-Zeilen (soll 2-6)");
      l.scene.lines.forEach((x, i) => { if (!x || !x.he || !x.translit || !x.de) err("V5: " + where + " Zeile " + i + " unvollstaendig"); });
    } else err("V5: " + where + " scene weder dialogueId noch lines");
  }
  if (l.grammar) { // V6
    if (l.grammar.moduleId) {
      const gm = gmods[l.grammar.moduleId];
      if (!gm) err("V6: " + where + " Modul " + l.grammar.moduleId + " fehlt");
      else {
        const st = l.grammar.steps;
        if (!Array.isArray(st) || !st.length) err("V6: " + where + " steps leer");
        else st.forEach(ix => {
          if (!(ix >= 0 && ix < gm.steps.length)) err("V6: " + where + " step-Index " + ix + " ausserhalb (" + gm.id + ")");
          const set = gramSteps[gm.id] || (gramSteps[gm.id] = {});
          if (set[ix]) err("V6: " + gm.id + " step " + ix + " doppelt referenziert");
          set[ix] = 1;
        });
      }
    } else if (Array.isArray(l.grammar.inline)) {
      l.grammar.inline.forEach((s, i) => {
        if (["explain", "cloze", "form"].indexOf(s.type) < 0) err("V6: " + where + " inline-Schritt " + i + " Typ " + s.type);
        if (s.type !== "explain") {
          const o = s.options || [], nc = o.filter(x => x && x.correct === true).length;
          if (o.length < 2 || o.length > 4 || nc !== 1) err("V6: " + where + " inline " + i + ": " + o.length + " Optionen/" + nc + " correct");
        }
      });
    } else err("V6: " + where + " grammar weder moduleId noch inline");
  }
  if (l.reading) { // V7
    if (!l.reading.drill || !drillIds[l.reading.drill]) err("V7: " + where + " Drill " + (l.reading && l.reading.drill) + " fehlt (reading.js geladen?)");
    const secIdx = K.sections.findIndex(s => s.id === l.section);
    if (secIdx > 2) err("V7: " + where + " reading ausserhalb der ersten 3 Sektionen");
  }
});
Object.keys(secIds).forEach(id => { if (!secUsed[id]) err("V3: section " + id + " ohne Lektion"); });
const missing = C.items.filter(i => !assigned[i.id]).map(i => i.id);
if (missing.length) err("V1: " + missing.length + " Items ohne Lektion: " + missing.slice(0, 12).join(",") + (missing.length > 12 ? " ..." : ""));
(G.modules || []).forEach(m => { if (!gramSteps[m.id]) err("V6: Grammatik-Modul " + m.id + " in keiner Lektion referenziert"); });
// V8 (nur Warnungen): Themen-Kohaerenz
K.lessons.forEach(l => {
  const themes = new Set((l.newItemIds || []).map(id => itemIds[id] && itemIds[id].theme).filter(Boolean));
  if (themes.size > 3) warns.push("V8: " + l.id + " mischt " + themes.size + " Themen");
});

console.log("Kurs: " + K.lessons.length + " Lektionen, " + K.sections.length + " Sektionen, " +
  Object.keys(assigned).length + "/" + C.items.length + " Items zugeordnet, " +
  Object.keys(gramSteps).length + "/" + (G.modules || []).length + " Grammatik-Module referenziert");
warns.forEach(w => console.log("  WARN  " + w));
if (errs.length) { errs.forEach(e => console.log("  FEHLER  " + e)); console.log("FAIL: " + errs.length + " Fehler"); process.exit(1); }
console.log("PASS");
