/*
 * Tacheles - Kurs-Curriculum (Baender A0 bis C2)
 * Klassisches Script (kein ES-Modul, kein fetch), definiert genau EIN Global:
 *   window.TACHELES_COURSE = { version, sections, lessons }
 *
 * Schema (Vertrag, siehe docs/superpowers/plans/2026-07-19-kurs-umbau-plan.md, C1):
 *   sections: [{ id, title, emoji, band }]            // 16-20, band aufsteigend
 *   lessons:  [{ id, section, title, emoji, band,     // Array-Reihenfolge = Kurs-Reihenfolge
 *                newItemIds: [5-8 Item-IDs],           // JEDES Content-Item in GENAU einer Lektion
 *                scene: {dialogueId} | {lines:[{he,translit,de}]} | null,
 *                grammar: {moduleId, steps:[idx]} | {inline:[...]} | null,
 *                reading: {drill} | null,              // nur fruehe A0-Sektionen
 *                listening: true|false }]
 *
 * Lektions-IDs sind heilig (Kurs-Fortschritt haengt daran): nie umbenennen.
 * Validierung: node tools/validate-course.cjs (muss Exit 0 liefern).
 */
window.TACHELES_COURSE = {
  version: 1,
  sections: [],
  lessons: []
};
