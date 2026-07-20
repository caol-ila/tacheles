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
  (Grammatik-Module, eigenes Global `TACHELES_GRAMMAR`), `course.js` (Kurs-Curriculum, Global
  `TACHELES_COURSE`: 109 Lektionen in 19 Sektionen A0–C2, jedes Item in genau einer Lektion),
  `snacks.js` (Wissens-Häppchen, Global `TACHELES_SNACKS`: 41 Sprach-/Kultur-Snacks), `reading.js`
  (Lese-Trainer-Daten, Global `TACHELES_READING`: 174 Silben, 12 Ausnahmen, `syllabify()`, 8 Drills),
  `styles.css`, `sw.js` (+`manifest`, `icon.svg`, `server.js`), `audio/` (vorproduzierte Samples +
  `manifest.js` + eigene LICENSE). Validatoren: `tools/validate-course.cjs`, `tools/validate-snacks.cjs`,
  `tools/validate-reading.cjs` (je Exit 0 = gültig; laufen im Voll-Gate).
- **Grammatik in `grammar.js`:** eigenes Global `window.TACHELES_GRAMMAR = { version, modules }`;
  `app.js` merged `modules` beim Init additiv in `CONTENT.modules` (defensiv: fehlendes Global ok,
  doppelte Modul-IDs zugunsten content.js übersprungen). Ladeordnung in `index.html`:
  content.js → grammar.js → course.js → snacks.js → reading.js → audio/manifest.js → app.js.
  `content.js` bleibt reiner Wortschatz. `course.js`/`snacks.js`/`reading.js` sind defensiv: fehlt
  ein Global, blendet sich das Feature aus (Kurs/Häppchen/Lese-Trainer), nichts crasht.
- **Module haben `group`:** ohne `group` = Sektion „📚 Module"; `group === "grammar"` = Sektion
  „🧠 Grammatik" auf dem Lernen-Screen (beide band-gated, gleiche Kachel-UI).
- 13 Modi + Survival-Check + geführte Module + Einstufungstest + Mastery-Check + Tour; Modul-Schritte:
  `explain`/`teach`/`quiz`/`pairquiz` plus `cloze` (Lückensatz) und `form` (deutsche Aufgabe →
  he-Form) für Grammatik. SRS (SM-2-artig) mit Niqqud-/Umschrift-Fade; alle Modi schreiben in
  EINEN Zustand pro Item. Zusätzliche Session-Modi (`startSession`): `lesson` (Lektions-Player,
  8-Schritt-Bogen mit Resume), `snack` (Häppchen-Runner) und `reading` (Silben-Drill).
- **Navigation (5 Tabs):** Home / Lernen (= Kurs) / Vokabeln / Grammatik / Profil; „Fortschritt"
  wird ohne eigenen Tab über den Statistik-Tipp erreicht. Der Kurs (`course.js`) orchestriert das
  vorhandene SRS, er ersetzt es nicht: lineare Freischaltung, Quereinstieg (>= 60 % gemeistert),
  Lektions-Player. Lese-Trainer (`reading.js`) als eigener Block auf der Grammatik-Seite plus
  frühe A0-Lektionen; Wissens-Häppchen (`snacks.js`) als „Heute"-Block auf Home (Tages-Rotation).
- **Level-System:** Themen/Module haben `band` (A0–C2); `BANDS`/`LEVEL_CAPS` in app.js sind die
  eine Quelle (`LEVEL_CAPS = ["auto"].concat(BANDS)`). Freischaltung progressiv (40 % gemeistert)
  oder per Profil-Override (`profile.levelCap`); Einstufungstest schreibt NIE SRS/XP.
- **Sync:** Datei-Export/-Import (mit Zusammenführen), Clipboard-Sync-Code; Merge-Logik in
  `mergeStates` (für Tests via `window.TACHELES_DEBUG` exponiert).
- **Audio:** vorproduzierte Sprach-Samples (ElevenLabs, niqqud-vertont) statt der oft falschen
  Browser-Stimme. `say(item)` (Key = `item.id`) und `sayText(he)` (Key = `"h_"+hash`, für Dialog/
  Grammatik) sind audio-first mit TTS-Fallback; Manifest lädt als klassisches Script
  (`audio/manifest.js` → `window.TACHELES_AUDIO`, KEIN fetch wegen file://). Keying-Logik in
  `tools/audio-lib.cjs` (`audioHash` identisch zu app.js). `enumerateTargets` liefert Targets mit
  `kind`; vertont sind sechs Arten (~1174 Clips): `item` (673), `dialogue` (83), `grammar` (125),
  `syllable` (174, Lese-Trainer), `snack` (109, Häppchen-Beispiele) und `scene` (10, Inline-Szenen-
  Zeilen von Lektionen). Silben/Snack-Beispiele/Szenen-Zeilen keyen wie `sayText` (`"h_"+hash`);
  MC-Optionen/Cloze-Sätze/Drill-Wörter bleiben TTS bzw. nutzen bestehende Item-Clips. Erzeugung einmalig lokal
  via `tools/generate-audio.cjs` (Key aus gitignoriertem `tools/audio.env`); Vollständigkeit prüfen/
  nachgenerieren mit `tools/check-audio.cjs [--fill]`. SW hat eigenen `AUDIO_CACHE` (cache-first,
  überlebt Code-Releases), Prefetch aktuelles + nächstes Band. `app/audio/`-Dateien unter eigener
  Lizenz (CC-BY-NC + kein KI-Training), Code bleibt offen. Konzept: docs/13.
- **Neu (Kurs-Runde):** geführtes Kurs-Curriculum A0–C2 (109 Lektionen, `course.js`) mit Lektions-
  Player (8-Schritt-Bogen, Resume), Quereinstieg und linearer Freischaltung; Lese-Trainer (`reading.js`,
  Silben-Drills hearPick/readPick/blend/speed + freier Trainer); Wissens-Häppchen (`snacks.js`,
  Tages-Rotation im „Heute"-Block, optionaler Vokabel-Anhang); 5-Tab-Navigation; interaktive
  Spotlight-Tour (ersetzt die alte Slideshow, `profile.tourSeen`). Neue State-Felder: Slice `course`
  (`lessons {done,step}`, `entry`, `snacksSeen`) + `profile.snackVocab`.
- **Vorherige Runde (bleibt):** „Heute"-Block (Buchstabe/Wort des Tages per `dayHash`), ehrliche
  Mastery (`isProduction`, Erkennen deckelt bei 2, `demoteMastery`-Veto, Mastery-Check),
  Vokabel-Browser, Feedback-Hub (`feedback` im State, GitHub-Prefill/mailto), Kontakt/Impressum-
  und Datenschutz-Screens (In-App, Laien-Vorlage).

## Tests

```
cd app && node test/regression.cjs
```
178 Checks, Exit 0 = PASS. Braucht Edge + `playwright-core` (Pfad via `PLAYWRIGHT_PATH`,
Default `c:/Source/SofaSuche/node_modules/playwright-core`). Nach JEDER Änderung laufen lassen;
zusätzlich `node --check app.js content.js grammar.js course.js snacks.js reading.js sw.js` und die
drei Content-Validatoren (`node tools/validate-course.cjs`/`validate-snacks.cjs`/`validate-reading.cjs`).

## Konventionen & Gotchas

- **Item-IDs sind heilig:** Lern-Fortschritt (localStorage `tacheles_state_v1`) hängt an
  `item.id`. IDs nie umbenennen; Content nur additiv erweitern.
- **normalizeState führt eine Allowlist:** neue Felder in `profile`/`gamification`/Top-Level MÜSSEN dort
  UND in `defaultState` (und für Sync in `mergeStates`) nachgezogen werden, sonst verschwinden sie
  beim Laden/Import. Kurs-Runde: Slice `course` (`lessons {done,step}`/`entry`/`snacksSeen`) +
  `profile.snackVocab` sind in allen dreien verdrahtet; State-`version` bleibt 1.
- **Datum ist LOKAL:** `state.log` wird über `dateStr()` (lokale Zeit) geschrieben. In Tests nie
  `toISOString()` fürs Tagesdatum verwenden.
- **MC-Falschantwort erzeugt einen „Weiter"-Button** — Test-Loops müssen erst `/^weiter$/i`
  klicken, dann `.opt`.
- In Tests Onboarding überspringen: `profile.onboarded=true`, `profile.tourSeen=true`,
  `autoplay=false`, `micHintDismissed=true` in localStorage seeden, dann reload (sonst
  erscheint der einmalige Tour-Hinweis).
- **Kurs-Tab in Tests:** das Quereinstiegs-Overlay erscheint beim ersten Kurs-Besuch mit
  Vorkenntnissen. Zum Überspringen entweder `state.course.entry` auf eine Lektions-ID seeden
  (bereits bestätigter Einstieg) oder im Test `#btn-entry-first` klicken. Ganz-Anfänger (SRS leer)
  sehen kein Overlay.
- **Service Worker:** bei Content-/Code-Release `CACHE_NAME` in `sw.js` hochzählen
  (aktuell v14) und alle Lade-relevanten Dateien in `ASSETS` halten (`grammar.js`, `course.js`,
  `snacks.js`, `reading.js`, `audio/manifest.js`), sonst bekommen localhost-Nutzer alten Cache.
  Audio-Clips liegen im separaten `AUDIO_CACHE` (cache-first, `tacheles-audio-v1`, ändert sich nicht).
- Hebräisch immer RTL (`dir="rtl"`, `lang="he"`); zentrale Anzeige via `heEl()` (respektiert
  Fade + Prüfungsmodus). TTS über `spoken(item)` (Buchstaben haben `speak` = Namen).
- Neue Inhalte: Schema im Kopf von `content.js`; Niqqud/Umschrift sorgfältig, muttersprachliches
  Review vor echtem Release aussteht.

## Offene Punkte (bewusst)

Cloud-Sync (Supabase, docs/07), echte Audio-Aufnahmen, muttersprachliches Review,
Expo/Android-Native (docs/10), Ligen. Roadmap-Status: docs/11 „Umsetzungsstand".
