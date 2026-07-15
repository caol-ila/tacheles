/*
 * Tacheles - Audio-Sample-Generator (einmaliger, lokaler Batch)
 *
 * Erzeugt pro Content-Item ein Sprach-Sample via ElevenLabs, transkodiert es
 * (ffmpeg) in ein kleines Format und schreibt app/audio/<item-id>.<ext> plus
 * app/audio/manifest.json. Laeuft NICHT zur Laufzeit der App.
 *
 * Aufruf (aus dem Repo-Wurzelverzeichnis):
 *   ELEVENLABS_API_KEY=sk_...  ELEVENLABS_VOICE_ID=<voiceId>  node tools/generate-audio.cjs
 *
 * Optionale Env-Variablen:
 *   AUDIO_FORMAT   opus (Default) | aac | mp3
 *   ELEVENLABS_MODEL   Default "eleven_multilingual_v2"
 *   LIMIT          nur die ersten N Items (zum Ausprobieren, z. B. LIMIT=10)
 *   BANDS          Kommaliste, nur diese Baender (z. B. BANDS=A0,A1)
 *
 * Hinweise:
 *  - Vertont wird die niqqud-Variante (Vokale!) - der Authentizitaets-Hebel.
 *  - Bereits vorhandene Dateien werden uebersprungen (Resume nach Abbruch/Limit).
 *  - Ohne ffmpeg (oder AUDIO_FORMAT=mp3) bleibt es beim MP3 von ElevenLabs.
 *  - Lizenz der erzeugten Dateien: siehe app/audio/LICENSE (CC-BY-NC + kein KI-Training).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "app");
const OUT = path.join(APP, "audio");

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const FORMAT = (process.env.AUDIO_FORMAT || "opus").toLowerCase();
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : 0;
const ONLY_BANDS = process.env.BANDS ? process.env.BANDS.split(",").map(s => s.trim()) : null;

if (!API_KEY || !VOICE_ID) {
  console.error("Fehlt: ELEVENLABS_API_KEY und/oder ELEVENLABS_VOICE_ID.");
  console.error("Voice-ID findest du unter elevenlabs.io -> Voices -> (Stimme) -> ID.");
  process.exit(1);
}
if (["opus", "aac", "mp3"].indexOf(FORMAT) < 0) {
  console.error("AUDIO_FORMAT muss opus, aac oder mp3 sein.");
  process.exit(1);
}

// --- Content laden (gleiches Muster wie die Test-/Zaehl-Skripte) ---
global.window = {};
require(path.join(APP, "content.js"));
const CONTENT = global.window.TACHELES_CONTENT;
if (!CONTENT || !CONTENT.items) { console.error("content.js nicht ladbar."); process.exit(1); }
const themeBand = {};
CONTENT.themes.forEach(t => { themeBand[t.id] = t.band || "A0"; });

// --- ffmpeg-Verfuegbarkeit + Format ---
const EXT = FORMAT === "aac" ? "m4a" : FORMAT; // AAC liegt im .m4a-Container
let hasFfmpeg = false;
if (FORMAT !== "mp3") {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); hasFfmpeg = true; }
  catch (e) {
    console.warn("ffmpeg nicht gefunden - schreibe stattdessen rohes MP3 (groesser).");
  }
}
const effExt = hasFfmpeg ? EXT : "mp3";

/** Der zu vertonende Text: niqqud (Vokale) bevorzugt; Buchstaben ihr Name. */
function voicedText(item) {
  if (item.type === "letter") return item.speak || item.he;
  return item.niqqud || item.he;
}

fs.mkdirSync(OUT, { recursive: true });

/** ElevenLabs TTS -> MP3-Buffer, mit einfacher Retry-Logik bei 429/5xx. */
async function tts(text) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(VOICE_ID);
  const body = JSON.stringify({ text: text, model_id: MODEL, output_format: "mp3_44100_128" });
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "content-type": "application/json", "accept": "audio/mpeg" },
      body: body
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) {
      const wait = 1000 * attempt * attempt;
      console.warn("  " + res.status + " - warte " + wait + "ms und versuche erneut …");
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    throw new Error("ElevenLabs " + res.status + ": " + (await res.text()).slice(0, 200));
  }
  throw new Error("Zu viele Fehlversuche.");
}

/** MP3-Buffer -> Zielformat auf Platte (ffmpeg, mono, sprachtaugliche Bitrate). */
function writeClip(mp3, destPath) {
  if (!hasFfmpeg) { fs.writeFileSync(destPath, mp3); return; }
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", "pipe:0", "-ac", "1"];
  if (FORMAT === "opus") args.push("-c:a", "libopus", "-b:a", "24k", "-ar", "24000");
  else if (FORMAT === "aac") args.push("-c:a", "aac", "-b:a", "48k", "-ar", "24000");
  args.push(destPath);
  execFileSync("ffmpeg", args, { input: mp3 });
}

(async () => {
  let items = CONTENT.items.slice();
  if (ONLY_BANDS) items = items.filter(i => ONLY_BANDS.indexOf(themeBand[i.theme]) >= 0);
  if (LIMIT > 0) items = items.slice(0, LIMIT);

  const clips = {};
  let made = 0, skipped = 0, failed = 0;
  console.log("Ziel: " + items.length + " Items, Format " + effExt + ", Modell " + MODEL);

  for (let n = 0; n < items.length; n++) {
    const item = items[n];
    const band = themeBand[item.theme] || "A0";
    const dest = path.join(OUT, item.id + "." + effExt);
    if (fs.existsSync(dest)) {
      clips[item.id] = { band: band, bytes: fs.statSync(dest).size };
      skipped++;
      continue;
    }
    const text = voicedText(item);
    try {
      const mp3 = await tts(text);
      writeClip(mp3, dest);
      clips[item.id] = { band: band, bytes: fs.statSync(dest).size };
      made++;
      if (made % 25 === 0) console.log("  … " + made + " erzeugt (" + (n + 1) + "/" + items.length + ")");
      await new Promise(r => setTimeout(r, 120)); // sanft zur API
    } catch (e) {
      console.error("  FEHLER bei " + item.id + " (\"" + text + "\"): " + e.message);
      failed++;
    }
  }

  // Manifest immer aus dem, was tatsaechlich auf Platte liegt, schreiben.
  // Als klassisches Script (window.TACHELES_AUDIO), damit es per file:// laedt
  // (KEIN fetch/XHR). Zusaetzlich manifest.json fuer andere Tools/Debugging.
  const manifest = {
    version: 1,
    format: effExt,
    source: "elevenlabs",
    voiceId: VOICE_ID,
    model: MODEL,
    clips: clips
  };
  const header =
    "/* Auto-generiert von tools/generate-audio.cjs - nicht von Hand editieren. */\n" +
    "window.TACHELES_AUDIO = ";
  fs.writeFileSync(path.join(OUT, "manifest.js"), header + JSON.stringify(manifest, null, 2) + ";\n");
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  let bytes = 0; Object.keys(clips).forEach(k => bytes += clips[k].bytes || 0);
  console.log("\nFertig. Neu: " + made + ", uebersprungen: " + skipped + ", Fehler: " + failed);
  console.log("Clips im Manifest: " + Object.keys(clips).length + ", gesamt " + (bytes / 1e6).toFixed(1) + " MB");
  console.log("Hinweis: Dialog- und Grammatik-Zeilen sind in v1 NICHT vertont (bleiben auf TTS).");
  if (failed > 0) process.exitCode = 1;
})();
