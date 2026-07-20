/*
 * Tacheles - Snack-Validator (Vertrag C2). Aufruf: node tools/validate-snacks.cjs
 */
"use strict";
const path = require("path");
global.window = global.window || {};
const dir = path.resolve(__dirname, "..", "app");
require(path.join(dir, "content.js"));
require(path.join(dir, "snacks.js"));
const C = window.TACHELES_CONTENT, S = window.TACHELES_SNACKS;
const BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
const errs = []; const err = m => errs.push(m);
const itemIds = {}; C.items.forEach(i => itemIds[i.id] = 1);

if (!(S.snacks.length >= 38 && S.snacks.length <= 50)) err("S1: " + S.snacks.length + " Snacks (soll 38-50)");
const seen = {};
let examplesTotal = 0;
S.snacks.forEach(s => {
  const w = s.id;
  if (!/^snack_/.test(s.id || "")) err("S1: id ohne snack_-Praefix: " + s.id);
  if (seen[s.id]) err("S1: doppelte id " + s.id);
  seen[s.id] = 1;
  if (!s.title || !s.emoji) err("S1: " + w + " ohne title/emoji");
  if (BANDS.indexOf(s.band) < 0) err("S1: " + w + " band " + s.band);
  const st = s.steps || [];
  if (st.length < 2 || st.length > 4) err("S2: " + w + " hat " + st.length + " Schritte (soll 2-4)");
  if (!st[0] || st[0].type !== "explain" || !st[0].text) err("S2: " + w + " Schritt 0 ist kein explain mit text");
  const q = st.filter(x => ["quiz", "cloze", "form"].indexOf(x.type) >= 0).length;
  if (q < 1 || q > 2) err("S2: " + w + " hat " + q + " Fragen (soll 1-2)");
  st.forEach((x, i) => {
    if (["explain", "quiz", "cloze", "form"].indexOf(x.type) < 0) err("S3: " + w + "#" + i + " Typ " + x.type);
    if (x.type === "quiz") {
      if (!itemIds[x.itemId]) err("S3: " + w + "#" + i + " quiz.itemId " + x.itemId + " fehlt");
      (x.distractorIds || []).forEach(d => { if (!itemIds[d]) err("S3: " + w + "#" + i + " distractor " + d + " fehlt"); });
    }
    if (x.type === "cloze" || x.type === "form") {
      const o = x.options || [], nc = o.filter(y => y && y.correct === true).length;
      if (o.length < 2 || o.length > 4 || nc !== 1) err("S3: " + w + "#" + i + ": " + o.length + " Optionen/" + nc + " correct");
      o.forEach((y, j) => { if (!y.he || !y.translit) err("S3: " + w + "#" + i + " Option " + j + " ohne he/translit"); });
    }
    if (x.type === "explain") {
      const ex = x.examples || [];
      if (i === 0 && (ex.length < 1 || ex.length > 4)) err("S4: " + w + "#" + i + " " + ex.length + " examples (soll 1-4)");
      ex.forEach((e, j) => { if (!e.he || !e.translit || !e.de) err("S4: " + w + "#" + i + " example " + j + " unvollstaendig"); });
      examplesTotal += ex.length;
    }
  });
});
console.log("Snacks: " + S.snacks.length + " Einheiten, " + examplesTotal + " vertonbare Beispiele");
if (errs.length) { errs.forEach(e => console.log("  FEHLER  " + e)); console.log("FAIL: " + errs.length); process.exit(1); }
console.log("PASS");
