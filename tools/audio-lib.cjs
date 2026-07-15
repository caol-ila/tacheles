/*
 * Tacheles - gemeinsame Audio-Helfer fuer generate-audio.cjs und check-audio.cjs.
 *
 * Definiert die EINE Wahrheit darueber, WAS vertont wird und unter welchem KEY.
 * Dieselbe Keying-Logik steckt in app.js (say/sayText), damit die App genau die
 * hier erzeugten Dateien findet:
 *   - Content-Items:       key = item.id            (lesbarer Dateiname)
 *   - Dialogzeilen:        key = "h_" + hash(he)    (Text-Hash, keine stabile ID)
 *   - Grammatik-Beispiele: key = "h_" + hash(he)
 * Vertonter Text: Items -> niqqud (Vokale!), Buchstaben -> Name (speak);
 *                 Dialog/Grammatik -> he wie hinterlegt.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
function bandIdx(b) { var i = BANDS.indexOf(b); return i < 0 ? 0 : i; }

/** FNV-1a (32-bit) -> 8 Hex-Zeichen. IDENTISCH zu audioHash() in app.js. */
function audioHash(s) {
  var h = 0x811c9dc5 >>> 0;
  s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ("0000000" + h.toString(16)).slice(-8);
}

/** Der zu vertonende Text eines Items: niqqud bevorzugt, Buchstaben ihr Name. */
function voicedItemText(item) {
  if (item.type === "letter") return item.speak || item.he;
  return item.niqqud || item.he;
}

/** content.js (+grammar.js) laden - gleiches Muster wie Test-/Zaehl-Skripte. */
function loadContent(appDir) {
  global.window = global.window || {};
  var dir = path.resolve(appDir); // absolut aufloesen: require(relativ) waere sonst modulrelativ
  require(path.join(dir, "content.js"));
  try { require(path.join(dir, "grammar.js")); } catch (e) { /* Grammatik optional */ }
  return { CONTENT: global.window.TACHELES_CONTENT, GRAMMAR: global.window.TACHELES_GRAMMAR || null };
}

/**
 * Alle vertonbaren Ziele als Liste { key, text, band, kind }.
 * Dedupliziert nach key; bei Mehrfach-Vorkommen gewinnt das niedrigste Band
 * (damit ein Clip beim fruehesten Bedarf vorgeladen wird).
 */
function enumerateTargets(CONTENT, GRAMMAR) {
  const themeBand = {};
  CONTENT.themes.forEach(t => { themeBand[t.id] = t.band || "A0"; });
  const seen = new Map();
  function add(key, text, band, kind) {
    if (!text) return;
    if (seen.has(key)) {
      const e = seen.get(key);
      if (bandIdx(band) < bandIdx(e.band)) e.band = band;
      return;
    }
    seen.set(key, { key: key, text: text, band: band, kind: kind });
  }
  CONTENT.items.forEach(i => add(i.id, voicedItemText(i), themeBand[i.theme] || "A0", "item"));
  (CONTENT.dialogues || []).forEach(d => {
    const b = d.band || "A0";
    (d.lines || []).forEach(l => { if (l.he) add("h_" + audioHash(l.he), l.he, b, "dialogue"); });
  });
  (GRAMMAR ? GRAMMAR.modules || [] : []).forEach(m => {
    const b = m.band || "A0";
    (m.steps || []).forEach(s => {
      (s.examples || []).forEach(e => { if (e.he) add("h_" + audioHash(e.he), e.he, b, "grammar"); });
    });
  });
  return Array.from(seen.values());
}

/** Endung fuer ein Format (aac liegt im .m4a-Container). */
function extFor(format) { return format === "aac" ? "m4a" : format; }

/** Ist ffmpeg verfuegbar? */
function hasFfmpeg() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; }
  catch (e) { return false; }
}

/** Vorhandene Clip-Keys im audio-Ordner fuer eine Endung. */
function existingKeys(outDir, ext) {
  if (!fs.existsSync(outDir)) return {};
  const out = {};
  fs.readdirSync(outDir).forEach(f => {
    if (f.slice(-(ext.length + 1)) === "." + ext) out[f.slice(0, -(ext.length + 1))] = f;
  });
  return out;
}

/**
 * Voice-ID bestimmen: explizite cfg.voiceId hat Vorrang; sonst cfg.voiceName
 * ueber die ElevenLabs-Voices-API aufloesen (die Stimme muss im Account/in der
 * Sammlung sein). Toleranter Namensvergleich (case-insensitiv, Teilstring in
 * beide Richtungen), damit "Ellen" auch "Ellen - Serious, Direct ..." trifft.
 */
async function resolveVoiceId(cfg) {
  if (cfg.voiceId) return cfg.voiceId;
  if (!cfg.voiceName) throw new Error("Weder ELEVENLABS_VOICE_ID noch ELEVENLABS_VOICE_NAME gesetzt.");
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": cfg.apiKey } });
  if (!res.ok) throw new Error("Voices-Abruf fehlgeschlagen: " + res.status + " " + (await res.text()).slice(0, 160));
  const voices = ((await res.json()) || {}).voices || [];
  const want = String(cfg.voiceName).trim().toLowerCase();
  const norm = v => String(v.name || "").trim().toLowerCase();
  let v = voices.find(x => norm(x) === want)
       || voices.find(x => norm(x).indexOf(want) >= 0)
       || voices.find(x => want.indexOf(norm(x)) >= 0 && norm(x).length >= 3);
  if (!v) {
    throw new Error('Voice "' + cfg.voiceName + '" nicht im Account gefunden. Vorhanden: ' +
      (voices.map(x => x.name).join(", ") || "(keine)") +
      '. Fuege die Stimme in ElevenLabs zu "My Voices" hinzu oder setze ELEVENLABS_VOICE_ID.');
  }
  return v.voice_id;
}

/** Stability-Wort/-Zahl -> numerischer Wert (v3: creative 0.0 / natural 0.5 / robust 1.0). */
function stabilityValue(s) {
  if (s == null || s === "") return null;
  const m = { creative: 0.0, natural: 0.5, robust: 1.0 };
  if (typeof s === "string" && m[s.trim().toLowerCase()] != null) return m[s.trim().toLowerCase()];
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/** ElevenLabs TTS -> MP3-Buffer, mit Retry bei 429/5xx. */
async function ttsElevenLabs(text, cfg) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(cfg.voiceId);
  const payload = { text: text, model_id: cfg.model, output_format: "mp3_44100_128" };
  if (typeof cfg.stability === "number" && isFinite(cfg.stability)) {
    payload.voice_settings = { stability: cfg.stability };
  }
  const body = JSON.stringify(payload);
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": cfg.apiKey, "content-type": "application/json", "accept": "audio/mpeg" },
      body: body
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * attempt * attempt));
      continue;
    }
    throw new Error("ElevenLabs " + res.status + ": " + (await res.text()).slice(0, 200));
  }
  throw new Error("Zu viele Fehlversuche.");
}

/** MP3-Buffer -> Zielformat auf Platte (mono, sprachtaugliche Bitrate). */
function writeClip(mp3, destPath, format, ffmpeg) {
  if (!ffmpeg || format === "mp3") { fs.writeFileSync(destPath, mp3); return; }
  // apad = 0.2s Endstille, damit kein Clip hart abgeschnitten klingt.
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", "pipe:0", "-ac", "1", "-af", "apad=pad_dur=0.2"];
  if (format === "opus") args.push("-c:a", "libopus", "-b:a", "24k", "-ar", "24000");
  else if (format === "aac") args.push("-c:a", "aac", "-b:a", "48k", "-ar", "24000");
  args.push(destPath);
  execFileSync("ffmpeg", args, { input: mp3 });
}

/**
 * Erzeugt die Clips fuer eine Ziel-Liste (ueberspringt bereits vorhandene Dateien).
 * cfg: { apiKey, voiceId, model, format, outDir }. onProgress(made, total).
 * Gibt { made, skipped, failed } zurueck.
 */
async function generateClips(targets, cfg, onProgress) {
  const ext = extFor(cfg.format);
  const eff = hasFfmpeg() ? ext : "mp3";
  fs.mkdirSync(cfg.outDir, { recursive: true });
  let made = 0, skipped = 0, failed = 0;
  for (let n = 0; n < targets.length; n++) {
    const t = targets[n];
    const dest = path.join(cfg.outDir, t.key + "." + eff);
    if (fs.existsSync(dest)) { skipped++; continue; }
    try {
      const mp3 = await ttsElevenLabs(t.text, cfg);
      writeClip(mp3, dest, cfg.format, hasFfmpeg());
      made++;
      if (onProgress) onProgress(made, targets.length, t);
      await new Promise(r => setTimeout(r, 120)); // sanft zur API
    } catch (e) {
      console.error("  FEHLER bei " + t.key + " (\"" + t.text + "\"): " + e.message);
      failed++;
    }
  }
  return { made: made, skipped: skipped, failed: failed, ext: eff };
}

/** Manifest (manifest.js + manifest.json) aus dem schreiben, was auf Platte liegt. */
function writeManifest(outDir, format, targets, meta) {
  const ext = extFor(format);
  const present = existingKeys(outDir, ext);
  const clips = {};
  targets.forEach(t => {
    if (present[t.key]) {
      clips[t.key] = { band: t.band, bytes: fs.statSync(path.join(outDir, t.key + "." + ext)).size, kind: t.kind };
    }
  });
  const manifest = Object.assign({ version: 1, format: ext, clips: clips }, meta || {});
  const header = "/* Auto-generiert - nicht von Hand editieren (tools/generate-audio.cjs). */\n" +
    "window.TACHELES_AUDIO = ";
  fs.writeFileSync(path.join(outDir, "manifest.js"), header + JSON.stringify(manifest, null, 2) + ";\n");
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return Object.keys(clips).length;
}

module.exports = {
  BANDS, bandIdx, audioHash, voicedItemText, loadContent, enumerateTargets,
  extFor, hasFfmpeg, existingKeys, resolveVoiceId, stabilityValue, ttsElevenLabs, writeClip, generateClips, writeManifest
};
