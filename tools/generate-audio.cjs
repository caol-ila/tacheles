/*
 * Tacheles - Audio-Sample-Generator (einmaliger, lokaler Batch)
 *
 * Erzeugt pro vertonbarem Text (Content-Items, Dialogzeilen, Grammatik-Beispiele)
 * ein Sprach-Sample via ElevenLabs, transkodiert es (ffmpeg) in ein kleines Format
 * und schreibt app/audio/<key>.<ext> plus app/audio/manifest.js. Laeuft NICHT zur
 * Laufzeit der App. Bereits vorhandene Dateien werden uebersprungen (Resume).
 *
 * Zugangsdaten: bevorzugt aus der gitignore-ten Datei tools/audio.env, sonst
 * aus Env-Variablen. ELEVENLABS_API_KEY plus entweder ELEVENLABS_VOICE_ID oder
 * ELEVENLABS_VOICE_NAME (Name wird ueber die Voices-API zur ID aufgeloest).
 *
 * Aufruf (aus dem Repo-Wurzelverzeichnis):
 *   node tools/generate-audio.cjs
 * Optionale Env: AUDIO_FORMAT (opus|aac|mp3), ELEVENLABS_MODEL, LIMIT=N, BANDS=A0,A1
 *
 * Lizenz der erzeugten Dateien: siehe app/audio/LICENSE (CC-BY-NC + kein KI-Training).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const lib = require("./audio-lib.cjs");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "app");
const OUT = path.join(APP, "audio");

// Secrets aus tools/audio.env laden (Env-Variablen haben Vorrang).
(function loadLocalEnv() {
  var envFile = path.join(__dirname, "audio.env");
  if (!fs.existsSync(envFile)) return;
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
})();

const cfg = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  voiceId: process.env.ELEVENLABS_VOICE_ID,
  voiceName: process.env.ELEVENLABS_VOICE_NAME,
  model: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
  format: (process.env.AUDIO_FORMAT || "opus").toLowerCase(),
  outDir: OUT
};
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : 0;
const ONLY_BANDS = process.env.BANDS ? process.env.BANDS.split(",").map(s => s.trim()) : null;

if (!cfg.apiKey || (!cfg.voiceId && !cfg.voiceName)) {
  console.error("Fehlt: ELEVENLABS_API_KEY und ELEVENLABS_VOICE_ID oder ELEVENLABS_VOICE_NAME.");
  console.error("Trag sie in tools/audio.env ein (gitignored) oder setze sie als Env-Variablen.");
  process.exit(1);
}
if (["opus", "aac", "mp3"].indexOf(cfg.format) < 0) { console.error("AUDIO_FORMAT muss opus, aac oder mp3 sein."); process.exit(1); }
if (cfg.format !== "mp3" && !lib.hasFfmpeg()) console.warn("ffmpeg nicht gefunden - schreibe rohes MP3 (groesser).");

const loaded = lib.loadContent(APP);
if (!loaded.CONTENT || !loaded.CONTENT.items) { console.error("content.js nicht ladbar."); process.exit(1); }

let targets = lib.enumerateTargets(loaded.CONTENT, loaded.GRAMMAR);
if (ONLY_BANDS) targets = targets.filter(t => ONLY_BANDS.indexOf(t.band) >= 0);
if (LIMIT > 0) targets = targets.slice(0, LIMIT);

(async () => {
  cfg.voiceId = await lib.resolveVoiceId(cfg); // Name -> ID (falls noetig)
  const byKind = {};
  targets.forEach(t => { byKind[t.kind] = (byKind[t.kind] || 0) + 1; });
  console.log("Stimme: " + (cfg.voiceName || cfg.voiceId) + " (" + cfg.voiceId + ")");
  console.log("Ziel: " + targets.length + " Clips (" + JSON.stringify(byKind) + "), Format " +
    lib.extFor(cfg.format) + ", Modell " + cfg.model);

  const r = await lib.generateClips(targets, cfg, function (made, total) {
    if (made % 25 === 0) console.log("  … " + made + " erzeugt");
  });

  const meta = { source: "elevenlabs", voiceId: cfg.voiceId, model: cfg.model };
  const inManifest = lib.writeManifest(OUT, cfg.format, lib.enumerateTargets(loaded.CONTENT, loaded.GRAMMAR), meta);

  console.log("\nFertig. Neu: " + r.made + ", uebersprungen: " + r.skipped + ", Fehler: " + r.failed);
  console.log("Clips im Manifest: " + inManifest);
  console.log("Vollstaendigkeit pruefen: node tools/check-audio.cjs");
  if (r.failed > 0) process.exitCode = 1;
})();
