/*
 * Tacheles - Audio-Vollstaendigkeits-Check
 *
 * Prueft, ob fuer JEDEN vertonbaren Text (Content-Items, Dialogzeilen,
 * Grammatik-Beispiele) eine Audiodatei in app/audio/ existiert, und meldet
 * Fehlende sowie verwaiste Dateien. Nutzt dieselbe Ziel-Enumeration wie der
 * Generator (tools/audio-lib.cjs), kann also nichts uebersehen.
 *
 * Aufruf (aus dem Repo-Wurzelverzeichnis):
 *   node tools/check-audio.cjs            # nur pruefen (Exit 1, wenn etwas fehlt)
 *   node tools/check-audio.cjs --fill     # fehlende Dateien nachgenerieren (ElevenLabs-Key noetig)
 *
 * Format wird aus app/audio/manifest.json gelesen (sonst AUDIO_FORMAT, Default opus).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const lib = require("./audio-lib.cjs");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "app");
const OUT = path.join(APP, "audio");
const FILL = process.argv.indexOf("--fill") >= 0 || process.argv.indexOf("--generate-missing") >= 0;

// Format bestimmen: Manifest hat Vorrang (spiegelt, was wirklich erzeugt wurde).
let ext = null;
const manifestJson = path.join(OUT, "manifest.json");
if (fs.existsSync(manifestJson)) {
  try { ext = JSON.parse(fs.readFileSync(manifestJson, "utf8")).format; } catch (e) { /* egal */ }
}
if (!ext) ext = lib.extFor((process.env.AUDIO_FORMAT || "opus").toLowerCase());
const formatBase = ext === "m4a" ? "aac" : ext;

const loaded = lib.loadContent(APP);
if (!loaded.CONTENT || !loaded.CONTENT.items) { console.error("content.js nicht ladbar."); process.exit(2); }

const targets = lib.enumerateTargets(loaded.CONTENT, loaded.GRAMMAR);
const targetKeys = {}; targets.forEach(t => { targetKeys[t.key] = t; });
const existing = lib.existingKeys(OUT, ext);

const missing = targets.filter(t => !existing[t.key]);
const orphaned = Object.keys(existing).filter(k => !targetKeys[k]);

const byKind = { item: 0, dialogue: 0, grammar: 0 };
targets.forEach(t => { byKind[t.kind] = (byKind[t.kind] || 0) + 1; });
const missByKind = { item: 0, dialogue: 0, grammar: 0 };
missing.forEach(t => { missByKind[t.kind] = (missByKind[t.kind] || 0) + 1; });

console.log("Format: " + ext);
console.log("Ziele gesamt: " + targets.length + "  " + JSON.stringify(byKind));
console.log("Vorhanden:    " + (targets.length - missing.length));
console.log("Fehlend:      " + missing.length + "  " + JSON.stringify(missByKind));
console.log("Verwaist:     " + orphaned.length);
if (missing.length) {
  console.log("\nFehlende (erste 20):");
  missing.slice(0, 20).forEach(t => console.log("  [" + t.kind + "/" + t.band + "] " + t.key + "  \"" + t.text + "\""));
  if (missing.length > 20) console.log("  … und " + (missing.length - 20) + " weitere");
}
if (orphaned.length) {
  console.log("\nVerwaiste Dateien (nicht mehr im Content - koennen weg):");
  orphaned.slice(0, 20).forEach(k => console.log("  " + k + "." + ext));
}

if (!FILL) {
  if (missing.length === 0) console.log("\nOK - alle Audiodateien vorhanden.");
  else console.log("\nUnvollstaendig. Mit  node tools/check-audio.cjs --fill  nachgenerieren.");
  process.exit(missing.length === 0 ? 0 : 1);
}

// --- --fill: fehlende nachgenerieren ---
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
  format: formatBase,
  outDir: OUT
};
if (missing.length === 0) { console.log("\nNichts nachzugenerieren."); process.exit(0); }
if (!cfg.apiKey || (!cfg.voiceId && !cfg.voiceName)) {
  console.error("\n--fill braucht ELEVENLABS_API_KEY und ELEVENLABS_VOICE_ID oder ELEVENLABS_VOICE_NAME (tools/audio.env).");
  process.exit(2);
}

(async () => {
  cfg.voiceId = await lib.resolveVoiceId(cfg);
  console.log("\nGeneriere " + missing.length + " fehlende Clips (Stimme " + (cfg.voiceName || cfg.voiceId) + ") …");
  const r = await lib.generateClips(missing, cfg, function (made) { if (made % 25 === 0) console.log("  … " + made); });
  const meta = { source: "elevenlabs", voiceId: cfg.voiceId, model: cfg.model };
  lib.writeManifest(OUT, cfg.format, lib.enumerateTargets(loaded.CONTENT, loaded.GRAMMAR), meta);
  console.log("Fertig. Neu: " + r.made + ", Fehler: " + r.failed);
  process.exit(r.failed > 0 ? 1 : 0);
})();
