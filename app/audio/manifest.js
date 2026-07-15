/*
 * Tacheles - Audio-Manifest (klassisches Script, damit es per file:// laedt -
 * KEIN fetch/XHR, konsistent mit content.js/grammar.js).
 *
 * Platzhalter: null = es gibt noch keine Samples, die App nutzt die
 * Browser-Sprachausgabe (TTS). Das Generierungs-Skript tools/generate-audio.cjs
 * ueberschreibt diese Datei mit dem echten Manifest:
 *   window.TACHELES_AUDIO = { version, format, source, voiceId, model,
 *                             clips: { "<item-id>": { band, bytes }, ... } };
 */
window.TACHELES_AUDIO = null;
