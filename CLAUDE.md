# Tacheles – Kontext für Claude

Hebräisch-Lern-App (Deutsch → Ivrit) für Anfänger. Ziel: schnell einfache Gespräche führen und
Alltagsschilder lesen. Name: „Tacheles reden" (deutsches Idiom mit hebräischer Wurzel);
Untertitel/Maskottchen-Ton „Schalömchen". Spec in `docs/00–12`, lauffähige App in `app/`.

## App (`app/`)

- **Build-frei:** klassische Scripts, kein Modul, kein fetch, keine Abhängigkeiten. Läuft per
  Doppelklick auf `index.html` (file://) oder über `Tacheles-starten.cmd` (Node-Mini-Server auf
  http://localhost:8017 → Browser merkt sich Mikrofon-Erlaubnis, PWA installierbar).
- Dateien: `index.html`, `app.js` (gesamte Logik, Sektions-Kommentare im Kopf), `content.js`
  (~670 Items in ~41 Themen mit Bändern A0–C2, 14 Dialoge, EMOJI-Map am Ende), `grammar.js`
  (Grammatik-Module, eigenes Global `TACHELES_GRAMMAR`), `styles.css`, `sw.js` (+`manifest`,
  `icon.svg`, `server.js`), `audio/` (vorproduzierte Samples + `manifest.js` + eigene LICENSE).
- **Grammatik in `grammar.js`:** eigenes Global `window.TACHELES_GRAMMAR = { version, modules }`;
  `app.js` merged `modules` beim Init additiv in `CONTENT.modules` (defensiv: fehlendes Global ok,
  doppelte Modul-IDs zugunsten content.js übersprungen). Ladeordnung in `index.html`:
  content.js → grammar.js → app.js. `content.js` bleibt reiner Wortschatz.
- **Module haben `group`:** ohne `group` = Sektion „📚 Module"; `group === "grammar"` = Sektion
  „🧠 Grammatik" auf dem Lernen-Screen (beide band-gated, gleiche Kachel-UI).
- 13 Modi + Survival-Check + geführte Module + Einstufungstest; Modul-Schritte:
  `explain`/`teach`/`quiz`/`pairquiz` plus `cloze` (Lückensatz) und `form` (deutsche Aufgabe →
  he-Form) für Grammatik. SRS (SM-2-artig) mit Niqqud-/Umschrift-Fade; alle Modi schreiben in
  EINEN Zustand pro Item.
- **Level-System:** Themen/Module haben `band` (A0–C2); `BANDS`/`LEVEL_CAPS` in app.js sind die
  eine Quelle (`LEVEL_CAPS = ["auto"].concat(BANDS)`). Freischaltung progressiv (40 % gemeistert)
  oder per Profil-Override (`profile.levelCap`); Einstufungstest schreibt NIE SRS/XP.
- **Sync:** Datei-Export/-Import (mit Zusammenführen), Clipboard-Sync-Code; Merge-Logik in
  `mergeStates` (für Tests via `window.TACHELES_DEBUG` exponiert).
- **Audio:** vorproduzierte Sprach-Samples (ElevenLabs, niqqud-vertont) statt der oft falschen
  Browser-Stimme. `say(item)` (Key = `item.id`) und `sayText(he)` (Key = `"h_"+hash`, für Dialog/
  Grammatik) sind audio-first mit TTS-Fallback; Manifest lädt als klassisches Script
  (`audio/manifest.js` → `window.TACHELES_AUDIO`, KEIN fetch wegen file://). Keying-Logik in
  `tools/audio-lib.cjs` (`audioHash` identisch zu app.js). Vertont: Items + Dialogzeilen +
  Grammatik-Beispiele (~881 Clips); MC-Optionen/Cloze-Sätze bleiben TTS. Erzeugung einmalig lokal
  via `tools/generate-audio.cjs` (Key aus gitignoriertem `tools/audio.env`); Vollständigkeit prüfen/
  nachgenerieren mit `tools/check-audio.cjs [--fill]`. SW hat eigenen `AUDIO_CACHE` (cache-first,
  überlebt Code-Releases), Prefetch aktuelles + nächstes Band. `app/audio/`-Dateien unter eigener
  Lizenz (CC-BY-NC + kein KI-Training), Code bleibt offen. Konzept: docs/13.

## Tests

```
cd app && node test/regression.cjs
```
85 Checks, Exit 0 = PASS. Braucht Edge + `playwright-core` (Pfad via `PLAYWRIGHT_PATH`,
Default `c:/Source/SofaSuche/node_modules/playwright-core`). Nach JEDER Änderung laufen lassen;
zusätzlich `node --check app.js content.js grammar.js`.

## Konventionen & Gotchas

- **Item-IDs sind heilig:** Lern-Fortschritt (localStorage `tacheles_state_v1`) hängt an
  `item.id`. IDs nie umbenennen; Content nur additiv erweitern.
- **normalizeState whitelistet Felder:** neue Felder in `profile`/`gamification` MÜSSEN dort
  UND in `defaultState` nachgezogen werden, sonst verschwinden sie beim Laden/Import.
- **Datum ist LOKAL:** `state.log` wird über `dateStr()` (lokale Zeit) geschrieben. In Tests nie
  `toISOString()` fürs Tagesdatum verwenden.
- **MC-Falschantwort erzeugt einen „Weiter"-Button** — Test-Loops müssen erst `/^weiter$/i`
  klicken, dann `.opt`.
- In Tests Onboarding überspringen: `profile.onboarded=true`, `autoplay=false`,
  `micHintDismissed=true` in localStorage seeden, dann reload.
- **Service Worker:** bei Content-/Code-Release `CACHE_NAME` in `sw.js` hochzählen
  (aktuell v12) und `grammar.js`/`audio/manifest.js` in `ASSETS` halten, sonst bekommen
  localhost-Nutzer alten Cache. Audio-Clips liegen im separaten `AUDIO_CACHE` (cache-first).
- Hebräisch immer RTL (`dir="rtl"`, `lang="he"`); zentrale Anzeige via `heEl()` (respektiert
  Fade + Prüfungsmodus). TTS über `spoken(item)` (Buchstaben haben `speak` = Namen).
- Neue Inhalte: Schema im Kopf von `content.js`; Niqqud/Umschrift sorgfältig, muttersprachliches
  Review vor echtem Release aussteht.

## Offene Punkte (bewusst)

Cloud-Sync (Supabase, docs/07), echte Audio-Aufnahmen, muttersprachliches Review,
Expo/Android-Native (docs/10), Ligen. Roadmap-Status: docs/11 „Umsetzungsstand".
