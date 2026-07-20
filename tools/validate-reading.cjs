/*
 * Tacheles - Reading-Validator (Vertrag C3). Aufruf: node tools/validate-reading.cjs
 * Prueft Inventar, Round-Trip des Silbifizierers (exceptions + Sample-Woerter), Drills.
 */
"use strict";
const path = require("path");
global.window = global.window || {};
const dir = path.resolve(__dirname, "..", "app");
require(path.join(dir, "content.js"));
require(path.join(dir, "reading.js"));
const C = window.TACHELES_CONTENT, R = window.TACHELES_READING;
const errs = []; const err = m => errs.push(m);
const items = {}; C.items.forEach(i => items[i.id] = i);

// R1: Inventar
const syl = R.syllables || [];
if (!(syl.length >= 120 && syl.length <= 300)) err("R1: " + syl.length + " Silben (soll 120-300)");
const seenHe = {};
let shva = 0;
syl.forEach((s, i) => {
  if (!s.he || !s.translit) err("R1: Silbe #" + i + " ohne he/translit");
  if (seenHe[s.he]) err("R1: doppelte Silbe " + s.he);
  seenHe[s.he] = 1;
  if (s.vowel === "shva") shva++;
});
if (shva < 10) err("R1: nur " + shva + " Schwa-Silben (soll >= 10)");

// R2: Round-Trip. Silben (ohne Whitespace) muessen den Input reproduzieren.
const strip = s => String(s).replace(/\s+/g, "");
function roundTrip(word, label) {
  const parts = R.syllabify(word);
  if (!parts) { err("R2: syllabify(" + label + ") -> null"); return; }
  const joined = strip(parts.map(p => p.he).join(""));
  if (joined !== strip(word)) err("R2: Round-Trip kaputt fuer " + label + ": " + joined);
  parts.forEach((p, i) => { if (!p.translit) err("R2: " + label + " Silbe " + i + " ohne translit"); });
}
Object.keys(R.exceptions || {}).forEach(w => roundTrip(w, "exception " + w));
// Fixe Stichprobe: >= 25 echte Item-IDs. T4 verifiziert jede ID gegen content.js
// und ersetzt fehlende durch reale (die Round-Trip-Regel selbst ist fix).
const SAMPLE_IDS = ["shalom", "toda", "bevakasha", "ken", "lo", "slicha", "boker_tov",
  "laila_tov", "beseder", "efshar", "toda_raba", "erev_tov", "lehitraot", "bay",
  "naim_meod", "ma_shlomcha", "ma_shlomech",
  // T4: auf >= 25 existierende IDs erweitert (alle gegen content.js verifiziert
  // und heuristisch nicht-null; Ich&Du, Fragewoerter, Cafe & Schilder).
  "ani", "ata", "at", "hu", "hi", "shem", "eifo", "ma", "mi", "matai", "kama",
  "mayim", "kafe", "te", "lechem", "knisa", "sagur", "karov", "rachok"];
const found = SAMPLE_IDS.filter(id => items[id]);
if (found.length < 25) err("R2: Sample-Liste hat nur " + found.length + " existierende IDs (soll >= 25) - T4 muss sie erweitern");
found.forEach(id => roundTrip(items[id].niqqud, id + " (" + items[id].niqqud + ")"));

// R3: Drills
const drills = R.drills || [];
if (drills.length < 8) err("R3: " + drills.length + " Drills (soll >= 8)");
const dSeen = {}, levels = {};
drills.forEach(d => {
  if (!/^drill_/.test(d.id || "")) err("R3: Drill-id " + d.id);
  if (dSeen[d.id]) err("R3: doppelte Drill-id " + d.id);
  dSeen[d.id] = 1;
  if (!(d.level >= 1 && d.level <= 3)) err("R3: " + d.id + " level " + d.level);
  levels[d.level] = 1;
  const T = ["hearPick", "readPick", "blend", "speed"];
  if (!Array.isArray(d.types) || !d.types.length || d.types.some(t => T.indexOf(t) < 0)) err("R3: " + d.id + " types " + JSON.stringify(d.types));
  if (d.level === 1) {
    if (!(d.syllables && d.syllables.length >= 4 && d.syllables.length <= 10)) err("R3: " + d.id + " " + ((d.syllables || []).length) + " Silben (soll 4-10)");
    (d.syllables || []).forEach(h => { if (!seenHe[h]) err("R3: " + d.id + " Silbe " + h + " nicht im Inventar"); });
  } else {
    if (!(d.wordIds && d.wordIds.length >= 3 && d.wordIds.length <= 8)) err("R3: " + d.id + " " + ((d.wordIds || []).length) + " Woerter (soll 3-8)");
    (d.wordIds || []).forEach(id => {
      const it = items[id];
      if (!it) { err("R3: " + d.id + " Item " + id + " fehlt"); return; }
      if (!it.niqqud) err("R3: " + d.id + " Item " + id + " ohne niqqud");
      else if (!R.syllabify(it.niqqud)) err("R3: " + d.id + " Item " + id + " nicht silbifizierbar");
    });
  }
});
if (!(levels[1] && levels[2] && levels[3])) err("R3: nicht alle Level 1-3 abgedeckt");

console.log("Reading: " + syl.length + " Silben (" + shva + " Schwa), " +
  Object.keys(R.exceptions || {}).length + " Ausnahmen, " + drills.length + " Drills");
if (errs.length) { errs.forEach(e => console.log("  FEHLER  " + e)); console.log("FAIL: " + errs.length); process.exit(1); }
console.log("PASS");
