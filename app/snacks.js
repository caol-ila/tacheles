/*
 * Tacheles - Wissens-Haeppchen (Sprach- & Kulturwissen, alle Baender)
 * Klassisches Script, definiert genau EIN Global:
 *   window.TACHELES_SNACKS = { version, snacks }
 *
 * Schema (Vertrag C2): snacks: [{ id ("snack_..."), title, emoji, band,
 *   steps: [explain, dann 1-2x quiz/cloze/form] }] - Schritt-Schema identisch zu grammar.js.
 * Snack-IDs sind heilig (state.course.snacksSeen haengt daran).
 * Validierung: node tools/validate-snacks.cjs
 */
window.TACHELES_SNACKS = {
  version: 1,
  snacks: []
};
