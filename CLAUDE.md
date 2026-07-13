# Tacheles – Kontext für Claude

Hebräisch-Lern-App (Deutsch → Ivrit) für Anfänger. Ziel: schnell einfache Gespräche führen und
Alltagsschilder lesen. Name: „Tacheles reden" (deutsches Idiom mit hebräischer Wurzel);
Untertitel/Maskottchen-Ton „Schalömchen". Spec in `docs/00–12`, lauffähige App in `app/`.

## App (`app/`)

- **Build-frei:** klassische Scripts, kein Modul, kein fetch, keine Abhängigkeiten. Läuft per
  Doppelklick auf `index.html` (file://) oder über `Tacheles-starten.cmd` (Node-Mini-Server auf
  http://localhost:8017 → Browser merkt sich Mikrofon-Erlaubnis, PWA installierbar).
- Dateien: `index.html`, `app.js` (gesamte Logik, Sektions-Kommentare im Kopf), `content.js`
  (~533 Items in 33 Themen mit Bändern A0–B2, 12 Dialoge, 6 Module, EMOJI-Map am Ende),
  `styles.css`, `sw.js` (+`manifest`, `icon.svg`, `server.js`).
- 13 Modi + Survival-Check + geführte Module (explain/teach/quiz/pairquiz) + Einstufungstest;
  SRS (SM-2-artig) mit Niqqud-/Umschrift-Fade; alle Modi schreiben in EINEN Zustand pro Item.
- **Level-System:** Themen haben `band` (A0–B2); Freischaltung progressiv (40 % gemeistert)
  oder per Profil-Override (`profile.levelCap`); Einstufungstest schreibt NIE SRS/XP.
- **Sync:** Datei-Export/-Import (mit Zusammenführen), Clipboard-Sync-Code; Merge-Logik in
  `mergeStates` (für Tests via `window.TACHELES_DEBUG` exponiert).

## Tests

```
cd app && node test/regression.cjs
```
67 Checks, Exit 0 = PASS. Braucht Edge + `playwright-core` (Pfad via `PLAYWRIGHT_PATH`,
Default `c:/Source/SofaSuche/node_modules/playwright-core`). Nach JEDER Änderung laufen lassen;
zusätzlich `node --check app.js content.js`.

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
  (aktuell v6), sonst bekommen localhost-Nutzer alten Cache.
- Hebräisch immer RTL (`dir="rtl"`, `lang="he"`); zentrale Anzeige via `heEl()` (respektiert
  Fade + Prüfungsmodus). TTS über `spoken(item)` (Buchstaben haben `speak` = Namen).
- Neue Inhalte: Schema im Kopf von `content.js`; Niqqud/Umschrift sorgfältig, muttersprachliches
  Review vor echtem Release aussteht.

## Offene Punkte (bewusst)

Cloud-Sync (Supabase, docs/07), echte Audio-Aufnahmen, muttersprachliches Review,
Expo/Android-Native (docs/10), Ligen. Roadmap-Status: docs/11 „Umsetzungsstand".
