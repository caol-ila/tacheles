# Kurs-Umbau (Curriculum A0-C2, Lese-Trainer, Snacks, 5-Tab-Nav, interaktive Tour) - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Tacheles a guided course spine (about 100 lessons over A0-C2 that orchestrate the existing SRS), a syllable reading trainer, daily knowledge snacks, a 5-tab navigation, and an interactive spotlight tour, while every existing feature stays reachable and all existing regression checks stay green.

**Architecture:** Three new build-free content files (`course.js`, `snacks.js`, `reading.js`), each exposing exactly one global like `grammar.js` does, are authored by parallel agents against fixed contracts and committed validators. All engine work happens serially in `app.js` (plus `index.html`, `styles.css`, `sw.js`, `test/regression.cjs`): new state slice `course` + `profile.snackVocab`, a lesson-player session mode reusing `recordAnswer`/module-runner step renderers, tab restructuring, Home rework, and a tour engine that replaces the slideshow. Audio for syllables, snack examples and inline scene lines flows through the existing `tools/audio-lib.cjs` pipeline (same keying as `sayText`).

**Tech Stack:** Vanilla ES5-style JS (classic scripts, IIFE, no modules, no fetch, no dependencies), localStorage, Playwright-core regression against `file://` (Edge), Node CJS tools, ElevenLabs batch generation (operator step).

## Global Constraints

Copied from the spec (docs/superpowers/specs/2026-07-19-kurs-umbau-design.md) and CLAUDE.md. Every task implicitly includes these.

- Build-frei: klassische Scripts, kein Modul/fetch/Abhängigkeiten, `file://`-tauglich.
- Item-IDs sind heilig; bestehender Content nur additiv; bestehender Fortschritt bleibt vollständig gültig (der Kurs orchestriert das vorhandene SRS, er ersetzt es nicht).
- Neue State-Felder in `defaultState` UND `normalizeState` (Allowlist) UND `mergeStates`. State-`version` bleibt 1.
- Determinismus ohne `Math.random`, wo Stabilität gebraucht wird (`dayHash`, lokales Datum via `dateStr()`/`todayStr()`, nie `toISOString()`).
- Audio audio-first mit TTS-Fallback; Keying kompatibel zu `say` (Key = `item.id`) und `sayText` (Key = `"h_" + audioHash(text)`); Manifest als klassisches Script.
- App defensiv gegen fehlende Globals: fehlt `TACHELES_COURSE`/`TACHELES_SNACKS`/`TACHELES_READING`, blenden sich die Features aus, nichts crasht.
- Nach JEDER app-Änderung: `cd app && node --check app.js content.js grammar.js course.js snacks.js reading.js` und `node test/regression.cjs` (Exit 0). Regression braucht Edge + playwright-core (`PLAYWRIGHT_PATH`, Default `c:/Source/SofaSuche/node_modules/playwright-core`).
- Beim Release `CACHE_NAME` in `sw.js` hochzählen (aktuell `tacheles-v13` → `tacheles-v14`) und neue Dateien in `ASSETS` aufnehmen.
- UI-Texte Deutsch im „du“-Ton; Code-Kommentare Deutsch (Bestandskonvention in app.js); Identifier/Commits/PR Englisch. Allowlist/Denylist-Terminologie (nie white-/blacklist).
- Commits: English, imperative, ending with the implementing agent's own `Co-Authored-By:` trailer.
- MC-Falschantwort erzeugt einen „Weiter“-Button - Test-Loops müssen erst `/^weiter$/i` klicken, dann `.opt`.
- In Tests Onboarding überspringen: `profile.onboarded=true`, `autoplay=false`, `micHintDismissed=true` (und für neue Checks `tourSeen=true`) in localStorage seeden, dann reload.
- Hebräisch immer RTL (`dir="rtl"`, `lang="he"`); zentrale Anzeige via `heEl()`.
- Nicht-Ziele: kein Backend, keine neuen Abhängigkeiten, kein neues Vokabular außer Snack-Texten/Szenen-Zeilen/Silben, keine Native-App.

## Task Graph

| Task | What | File ownership | Mode |
|---|---|---|---|
| 1 | Contracts, state schema, scaffolding, validators | app.js (state only), index.html, course.js/snacks.js/reading.js (skeletons), tools/validate-*.cjs, regression (schema section) | serial, FIRST |
| 2 | course.js curation (~100 lessons) | app/course.js, scratchpad curation helper | **parallel** after T1 |
| 3 | snacks.js (~40 snacks) | app/snacks.js | **parallel** after T1 |
| 4 | reading.js (inventory, syllabifier, drills) | app/reading.js | **parallel** after T1 |
| 5 | 5-tab nav, Vokabeln-Tab, Grammatik-Tab, Fortschritt via Statistik-Tipp | app.js, index.html, styles.css, regression | serial after T1 (independent of T2-T4 content) |
| 6 | Reading-Drill-Engine + freier Silben-Trainer | app.js, styles.css, regression | serial after T4+T5 |
| 7 | Kurs-State-Helfer, Quereinstieg, Kurs-Tab-UI | app.js, styles.css, regression | serial after T2+T5 |
| 8 | Lektions-Player (Modus "lesson", 8-Schritt-Bogen, Resume) | app.js, styles.css, regression | serial after T6+T7 |
| 9 | Home-Umbau (Snack-Heute-Block, Kurs-Karte, antippbare Statistik) | app.js, styles.css, regression | serial after T3+T8 |
| 10 | Interaktive Tour (Spotlight, Demo-Antwort, Slideshow raus) | app.js, styles.css, regression | serial after T9 |
| 11 | Audio: enumerateTargets-Erweiterung + Batch-Generierung (OPERATOR) + check-audio | tools/audio-lib.cjs, tools/check-audio.cjs, tools/generate-audio.cjs, app/audio/* | serial after T2+T3+T4 (generation is an operator step) |
| 12 | Release-Politur: sw.js-Bump, CLAUDE.md, docs/11, Voll-Regression | sw.js, CLAUDE.md, docs/11-roadmap-mvp.md | serial, LAST |

T2/T3/T4 write disjoint files and coordinate ONLY through the contracts below; spawn them as parallel agents (worktree isolation) and gate their merge on their validator passing plus `node --check`.

Repo facts the contracts build on (verified against current `main`): 673 items (27 letter / 487 word / 63 phrase / 26 number / 19 sign / 51 sentence) in 41 themes; per band A0:147 A1:151 A2:93 B1:74 B2:68 C1:73 C2:67. 14 dialogues: `cafe market way meet taxi restaurant hotel pharmacy` (A0), `apartment weather_chat` (A2), `job_talk opinion_talk` (B1), `salary_talk` (C1), `contract_talk` (C2), each 6 lines. 21 grammar modules `mod_gram_*` (A0: genus, artikel, pronomen · A1: praesens, besitz, fragen, plural · A2: vergangenheit, zukunft, praepositionen, adjektiv · B1: binjanim, smichut, et · B2: passiv, konditional, relativ · C1: hitpael, register · C2: gehoben, syntax) with 7-9 steps each. 6 content modules `mod_letters_* / mod_pronunciation / mod_opposites`.

---

## Contracts (fixed; every task codes against these exact shapes)

### C1 - `window.TACHELES_COURSE` (app/course.js)

Classic script, one global, German comments, file header documents this schema:

```js
window.TACHELES_COURSE = {
  version: 1,
  sections: [
    // 16-20 Sektionen, Reihenfolge = Kurs-Reihenfolge, band aufsteigend (A0..C2)
    { id: "sec_a0_erste_worte", title: "Erste Worte", emoji: "👋", band: "A0" }
  ],
  lessons: [
    // Array-Reihenfolge = DIE lineare Kurs-Reihenfolge (Lektion N schaltet N+1 frei).
    {
      id: "l_a0_01",             // stabil, nie umbenennen (Kurs-Fortschritt haengt daran)
      section: "sec_a0_erste_worte", // muss in sections existieren
      title: "Schalom!",         // kurz, deutsch, "du"-Ton
      emoji: "👋",
      band: "A0",                // informativ; entlang lessons[] nie absteigend
      newItemIds: ["shalom", "toda", "ken", "lo", "slicha", "bevakasha"], // 5-8 Item-IDs
      scene: { dialogueId: "cafe" },              // ODER { lines: [{ he, translit, de }] } (2-6 Zeilen) ODER null
      grammar: { moduleId: "mod_gram_genus", steps: [0, 2, 3] }, // ODER { inline: [<explain|cloze|form-Schritt wie grammar.js>] } ODER null
      reading: { drill: "drill_a0_01" },          // ODER null; nur fruehe A0-Lektionen (Sektionen 1-3)
      listening: true                             // Hoer-Schritt (Default true)
    }
  ]
};
```

**Validation rules (enforced by `tools/validate-course.cjs` AND regression):**

- V1 Coverage: every `CONTENT.items[].id` appears in **exactly one** lesson's `newItemIds` (complete + unique, no unknown ids).
- V2 Size: `5 <= newItemIds.length <= 8` per lesson; `lessons.length >= 95`; `16 <= sections.length <= 20`.
- V3 Referential: `section` exists; lesson ids unique; section ids unique; every section referenced by >= 1 lesson.
- V4 Order: lesson `band` values are non-decreasing along the array; a lesson's band equals its section's band.
- V5 Scene: `scene` is null, or `{dialogueId}` with an existing `CONTENT.dialogues` id, or `{lines}` with 2-6 entries each having non-empty `he`, `translit`, `de`.
- V6 Grammar: `grammar` is null, or `{moduleId, steps}` where `moduleId` exists in `TACHELES_GRAMMAR.modules`, `steps` is a non-empty array of valid step indices for that module, and **no step index of a module is referenced by two lessons**; or `{inline}` whose steps follow the grammar.js step schema (explain/cloze/form; cloze/form with 2-4 options, exactly one `correct:true`). Every one of the 21 `mod_gram_*` modules is referenced by at least one lesson. At most one grammar block per lesson.
- V7 Reading: `reading` is null or `{drill}` with an id existing in `TACHELES_READING.drills`; only allowed on lessons of the first 3 sections.
- V8 Didaktik (soft, warnings not failures): items of one lesson should share a theme where possible; `freq`-light items early.

### C2 - `window.TACHELES_SNACKS` (app/snacks.js)

```js
window.TACHELES_SNACKS = {
  version: 1,
  snacks: [
    {
      id: "snack_sababa",     // stabil (Rotation/seen haengt daran), Praefix "snack_"
      title: "Sababa!",       // deutsch, warm, "du"-Ton
      emoji: "🤙",
      band: "A0",             // ab wann relevant; Rotation bevorzugt freigeschaltete
      steps: [ /* 2-4 Schritte, EXAKT das grammar.js-Schrittschema: */
        { type: "explain", title: "…", text: "…",
          examples: [{ he: "סבבה", translit: "sababa", de: "super / passt" }] },
        { type: "quiz", itemId: "…", distractorIds: ["…"] },       // nur existierende Item-IDs
        { type: "cloze", he: "… ___", translit: "… ___", de: "…",
          options: [{ he: "…", translit: "…", correct: true }, { he: "…", translit: "…" }], note: "…" },
        { type: "form", prompt: "…", options: [ /* wie cloze */ ], note: "…" }
      ]
    }
  ]
};
```

**Validation rules (`tools/validate-snacks.cjs` AND regression):**

- S1: `38 <= snacks.length <= 50`; ids unique, prefix `snack_`; every snack has `title`, `emoji`, valid `band` (A0..C2).
- S2: 2-4 steps; step 0 is `explain` with non-empty `text`; at least 1 and at most 2 question steps (`quiz`/`cloze`/`form`) after it.
- S3: step types only `explain|quiz|cloze|form`; `quiz.itemId`/`distractorIds` reference existing items; cloze/form have 2-4 options with exactly one `correct:true`; every option has `he` + `translit`.
- S4: every `explain` has 1-4 `examples`, each with non-empty `he`, `translit`, `de` (the `he` texts get voiced - C7).
- S5 Content brief: Sprach- und Kulturwissen im Stil „mit wenigen Wörtern viel“ (Slang-Perlen, Kultur-Gotchas, Mini-Grammatik-Aha, Schilder-Wissen, Höflichkeit), KEIN neues Lernvokabular als quiz-Items (quiz nur über Bestand); warm and personal in tone, ~40 units spread over all bands (roughly A0 x12, A1 x10, A2 x6, B1 x5, B2 x4, C1 x2, C2 x2).

### C3 - `window.TACHELES_READING` (app/reading.js)

```js
window.TACHELES_READING = {
  version: 1,
  // Silben-Inventar: programmatisch im Script erzeugt (haeufige Buchstaben x Vokalzeichen inkl. Schwa),
  // materialisiert als Array (damit Validator/Audio-Enumeration eine feste Liste sehen).
  syllables: [
    { he: "בָּ", translit: "ba", letter: "ב", vowel: "kamatz" }
    // ~150-250 Stueck
  ],
  // Kuratierte Ausnahmen: niqqud-Wort -> fertige Silbenliste (geht der Heuristik vor).
  exceptions: {
    "יִשְׂרָאֵל": [ { he: "יִשְׂ", translit: "jis" }, { he: "רָ", translit: "ra" }, { he: "אֵל", translit: "el" } ]
  },
  // Heuristischer Silbifizierer als FUNKTION auf dem Global:
  // syllabify(niqqudText) -> Array<{he, translit}> oder null (wenn nicht sicher zerlegbar).
  // Prueft zuerst exceptions (exakter String-Match), dann die Heuristik; Mehrwort-Input
  // wird pro Wort zerlegt und konkateniert; ein nicht zerlegbares Wort => null fuers Ganze.
  syllabify: function (niqqud) { /* … */ },
  drills: [
    {
      id: "drill_a0_01",            // stabil; von course.js referenziert
      title: "Erste Silben: ba, scha, la",
      level: 1,                     // 1 = Silben, 2 = Woerter zusammenlesen, 3 = Tempo
      types: ["hearPick", "readPick"],   // Teilmenge von hearPick|readPick|blend|speed
      syllables: ["בָּ", "שָׁ", "לָ", "מָ", "תָ"],  // he-Strings, muessen im Inventar sein (level 1)
      wordIds: []                   // Item-IDs mit niqqud fuer blend/speed (level 2/3)
    }
  ]
};
```

- Exercise types (fixed vocabulary, the engine in T6 renders them): `hearPick` = Silbe hören → geschriebene Silbe wählen; `readPick` = Silbe sehen → Umschrift wählen; `blend` = Wort silbenweise aufdecken, pro Silbe Lesung wählen, am Ende Ganzwort-Audio (`say(item)`); `speed` = Wort kurz zeigen → Bedeutung (de) wählen.
- `syllabify` contract: input is a `niqqud` string as stored on items; output syllables concatenate (ignoring spaces) back to the input string (round-trip); `translit` per syllable is deutschfreundlich (like item translit conventions: "ch" wie in "Bach", `'` für Ajin).

**Validation rules (`tools/validate-reading.cjs` AND regression):**

- R1: `120 <= syllables.length <= 300`; `he` unique; every syllable has non-empty `translit`; includes schwa forms (at least 10 entries with `vowel === "shva"`).
- R2: `typeof syllabify === "function"`; round-trip holds for every `exceptions` key and for a fixed sample list of >= 25 item niqqud words (list baked into the validator: shalom, toda, boker_tov, … see T4 Step 2); result syllables re-join (whitespace-insensitive) to the input.
- R3: drills: ids unique, prefix `drill_`; `level` in 1..3; `types` non-empty subset of the 4; level-1 drills have 4-10 `syllables` all present in the inventory; level-2/3 drills have 3-8 `wordIds` referencing existing items that have a non-empty `niqqud` and for which `syllabify(item.niqqud)` returns non-null; >= 8 drills total covering all 3 levels.

### C4 - State schema (Allowlist + Merge)

New top-level slice and one profile flag; nothing else changes, `version` stays 1:

```js
course: {
  lessons: {},   // { lessonId: { done: bool, step: int } }  step = 0-basierter Bogen-Schritt (Resume)
  entry: null,   // lessonId | null  (bestaetigter Quereinstieg)
  snacksSeen: {} // { snackId: true }
},
profile: { /* … bestehend …, */ snackVocab: true }  // Heute-Block: faellige Vokabeln anhaengen
```

Merge semantics (`mergeStates`): per lesson `done` OR, `step` max; `entry` = the one further along `TACHELES_COURSE.lessons` order (missing course.js: keep local, else the higher index; only one side set: that one); `snacksSeen` union; `snackVocab` is a device setting → local wins (like `autoplay`).

### C5 - Engine API added in app.js (names used across tasks)

- `COURSE` (module-level var, `window.TACHELES_COURSE || null`), `SNACKS`, `READING` analog.
- `lessonById(id)`, `lessonIndex(id)` (-1 if unknown), `courseAvailable()` (truthy if COURSE with >=1 lesson).
- `lessonState(id)` → `{done, step}` (default `{done:false, step:0}`), `setLessonStep(id, step)`, `markLessonDone(id)`.
- `lessonSkippable(lesson)` → true if >= 60 % of `newItemIds` have `getMastery(id) >= 2`.
- `recommendedEntryLesson()` → first lesson (array order) with `lessonSkippable() === false`, else last lesson.
- `lessonUnlocked(i)` → `i === 0 || lessonState(lessons[i-1].id).done || lessonState(lessons[i].id).done`.
- `nextLesson()` → first lesson in order that is unlocked and not done (the "Weiterlernen" target), or null.
- `startSession("lesson", { lessonId })` - lesson player (T8); resumes at `lessonState(id).step`.
- `startSession("snack", { snackId, withVocab })` - snack runner (T9), module-runner based.
- `startSession("reading", { drillId })` - drill runner (T6).
- `dailySnack()` → snack object chosen deterministically (T9).
- `renderCourse()`, `renderVocab()`, `renderGrammar()` screens; `showScreen` names: `home | course | vocab | grammar | profile` (+ `progress` renderable without tab).
- `window.TACHELES_DEBUG` additions (exact names, used by regression): `courseInfo()` (`{lessons, sections, entry}` counts + entry), `lessonStateOf(id)`, `lessonSkippable(id)`, `recommendedEntry()` (lesson id), `dailySnackId()`, `syllabify(niqqud)` (delegates to READING, null-safe), `tourActive()` (bool), `lessonStepLabel()` (current arc label or null).

### C6 - Script load order (index.html) and SW assets

`content.js → grammar.js → course.js → snacks.js → reading.js → audio/manifest.js → app.js`. All three new files join `ASSETS` in sw.js (T12 bumps `CACHE_NAME`).

### C7 - Audio keying (tools/audio-lib.cjs `enumerateTargets`)

Existing: items → key `item.id`, text `voicedItemText(item)`; dialogue lines and grammar-example `he` → key `"h_" + audioHash(he)`. NEW (same `"h_"` scheme, voiced text = the niqqud-bearing string as stored):

- Reading syllables: every `TACHELES_READING.syllables[].he` → key `"h_" + audioHash(he)`, band `"A0"`, kind `"syllable"`.
- Snack examples: every `explain.examples[].he` in `TACHELES_SNACKS` → key `"h_" + audioHash(he)`, band = snack band, kind `"snack"`.
- Course inline scene lines: every `scene.lines[].he` in `TACHELES_COURSE` → key `"h_" + audioHash(he)`, band = lesson band, kind `"scene"`.

MC options, cloze sentences and drill *words* stay TTS-or-existing-clips (words are items → clips already exist under `item.id`). `sayText(he)` in the app then plays syllables/examples/scene lines with zero new app logic.

---

## Task 1: Contracts in Code - Skeleton-Globals, State-Schema, Validatoren

**Files:**
- Create: `app/course.js`, `app/snacks.js`, `app/reading.js` (skeletons)
- Create: `tools/validate-course.cjs`, `tools/validate-snacks.cjs`, `tools/validate-reading.cjs`
- Modify: `app/index.html` (script tags, lines 29-32)
- Modify: `app/app.js` - `defaultState()` (~line 175), `normalizeState()` (~line 221), `mergeStates()` (~line 4906), content access section 2 (after `var CONTENT = …`, ~line 117), `window.TACHELES_DEBUG` (~line 5162)
- Test: `app/test/regression.cjs` (extend section 14b "State-Schema")

**Interfaces:**
- Consumes: nothing (first task).
- Produces: contracts C1-C7 as living code. `COURSE`/`SNACKS`/`READING` module vars in app.js; state slice `course` + `profile.snackVocab` fully wired through defaultState/normalizeState/mergeStates; `lessonById(id)`, `lessonIndex(id)`, `courseAvailable()`, `lessonState(id)`, `setLessonStep(id, step)`, `markLessonDone(id)`; debug hooks `courseInfo()`, `lessonStateOf(id)`, `syllabify(s)`. Validators that T2-T4 run until green.

- [ ] **Step 1: Skeleton content files**

`app/course.js` (complete file; T2 replaces the arrays, keeps header + shape):

```js
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
```

`app/snacks.js` (complete file; T3 fills `snacks`):

```js
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
```

`app/reading.js` (complete file; T4 fills inventory/exceptions/drills and the real heuristic - the skeleton `syllabify` already honors exceptions so the contract is executable):

```js
/*
 * Tacheles - Lese-Trainer-Daten (Silben-Inventar, Silbifizierer, Drills)
 * Klassisches Script, definiert genau EIN Global:
 *   window.TACHELES_READING = { version, syllables, exceptions, syllabify, drills }
 *
 * Vertrag C3: syllabify(niqqud) -> [{he, translit}] oder null; Round-Trip:
 * die Silben ergeben (ohne Leerzeichen-Beruecksichtigung) wieder den Input.
 * Drill-IDs sind heilig (course.js referenziert sie).
 * Validierung: node tools/validate-reading.cjs
 */
(function () {
  "use strict";

  var syllables = [];   // T4: programmatisch erzeugt (Buchstaben x Vokalzeichen inkl. Schwa)
  var exceptions = {};  // T4: kuratierte Woerter, die die Heuristik nicht sauber trifft

  /** Silbifizierer (Vertrag C3). Skeleton: nur exceptions, sonst null. */
  function syllabify(niqqud) {
    var s = String(niqqud == null ? "" : niqqud).trim();
    if (!s) return null;
    if (exceptions[s]) return exceptions[s].slice();
    return null; // T4 ersetzt das durch die echte Heuristik
  }

  window.TACHELES_READING = {
    version: 1,
    syllables: syllables,
    exceptions: exceptions,
    syllabify: syllabify,
    drills: []
  };
})();
```

- [ ] **Step 2: Load order in index.html**

Replace lines 29-32 of `app/index.html`:

```html
  <script src="content.js"></script>
  <script src="grammar.js"></script>
  <script src="course.js"></script>
  <script src="snacks.js"></script>
  <script src="reading.js"></script>
  <script src="audio/manifest.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 3: app.js - globals, state schema, helpers**

In section 2 (Content-Zugriff), directly after `var CONTENT = window.TACHELES_CONTENT || null;` (~line 117):

```js
  // Neue Content-Globals (Kurs-Runde). Alle optional: fehlt eines, blendet sich
  // das zugehoerige Feature aus (defensiv wie TACHELES_GRAMMAR).
  var COURSE = (window.TACHELES_COURSE && Array.isArray(window.TACHELES_COURSE.lessons)) ? window.TACHELES_COURSE : null;
  var SNACKS = (window.TACHELES_SNACKS && Array.isArray(window.TACHELES_SNACKS.snacks)) ? window.TACHELES_SNACKS : null;
  var READING = (window.TACHELES_READING && typeof window.TACHELES_READING.syllabify === "function") ? window.TACHELES_READING : null;

  function courseAvailable() { return !!(COURSE && COURSE.lessons.length); }
  function lessonById(id) {
    if (!COURSE) return null;
    for (var i = 0; i < COURSE.lessons.length; i++) if (COURSE.lessons[i].id === id) return COURSE.lessons[i];
    return null;
  }
  function lessonIndex(id) {
    if (!COURSE) return -1;
    for (var i = 0; i < COURSE.lessons.length; i++) if (COURSE.lessons[i].id === id) return i;
    return -1;
  }
```

In `defaultState()` (~line 175): inside `profile` add (after `tourSeen: false`):

```js
        snackVocab: true        // Heute-Haeppchen: 2-3 faellige Vokabeln anhaengen
```

and after the `feedback:` block, before `srs: {}`:

```js
      // Kurs-Fortschritt: orchestriert das SRS, ersetzt es nicht.
      course: {
        lessons: {},   // { lessonId: { done: bool, step: int } }
        entry: null,   // bestaetigter Quereinstieg (Lektions-ID)
        snacksSeen: {} // { snackId: true } fuer die Heute-Rotation
      },
```

In `normalizeState()` - inside the `raw.profile` block add:

```js
      if (typeof raw.profile.snackVocab === "boolean") s.profile.snackVocab = raw.profile.snackVocab;
```

and after the `feedback` allowlist block (before `return s;`):

```js
    // course (Allowlist): lessons nur als Objekt sauberer {done,step}-Eintraege,
    // entry nur als String, snacksSeen nur Objekt-nicht-Array mit true-Werten.
    if (raw.course && typeof raw.course === "object" && !Array.isArray(raw.course)) {
      var rl = raw.course.lessons;
      if (rl && typeof rl === "object" && !Array.isArray(rl)) {
        Object.keys(rl).forEach(function (id) {
          var e = rl[id];
          if (!e || typeof e !== "object" || Array.isArray(e)) return;
          s.course.lessons[id] = {
            done: !!e.done,
            step: Math.max(0, Math.round(Number(e.step) || 0))
          };
        });
      }
      if (typeof raw.course.entry === "string" && raw.course.entry) s.course.entry = raw.course.entry;
      var rsn = raw.course.snacksSeen;
      if (rsn && typeof rsn === "object" && !Array.isArray(rsn)) {
        Object.keys(rsn).forEach(function (id) { if (rsn[id]) s.course.snacksSeen[id] = true; });
      }
    }
```

In `mergeStates()` - the block goes AFTER the existing `unionObj` declaration (used by counters/feedback, ~line 4964) and before the profile section:

```js
    // course: done per ODER, step max, entry das weitere (Kurs-Reihenfolge),
    // snacksSeen vereinigt. snackVocab ist Geraete-Einstellung -> lokal (unten).
    var lids = {};
    Object.keys(a.course.lessons).forEach(function (k) { lids[k] = 1; });
    Object.keys(b.course.lessons).forEach(function (k) { lids[k] = 1; });
    Object.keys(lids).forEach(function (id) {
      var la = a.course.lessons[id], lb = b.course.lessons[id];
      m.course.lessons[id] = {
        done: !!((la && la.done) || (lb && lb.done)),
        step: Math.max(la ? la.step : 0, lb ? lb.step : 0)
      };
    });
    var ea = a.course.entry, eb = b.course.entry;
    if (ea && eb) m.course.entry = lessonIndex(eb) > lessonIndex(ea) ? eb : ea;
    else m.course.entry = ea || eb || null;
    m.course.snacksSeen = unionObj(a.course.snacksSeen, b.course.snacksSeen);
```

In the profile section of `mergeStates` add:

```js
    m.profile.snackVocab = a.profile.snackVocab; // Geraete-Einstellung wie autoplay
```

Lesson-state helpers - new sub-section header `/* 3b. Kurs-Zustand */` directly after `resetProgress()` (~line 389):

```js
  /** Kurs-Fortschritt eines einzelnen Eintrags (immer ein frisches Default-Objekt). */
  function lessonState(id) {
    var e = state.course.lessons[id];
    if (!e || typeof e !== "object") return { done: false, step: 0 };
    return { done: !!e.done, step: e.step || 0 };
  }
  function setLessonStep(id, step) {
    var e = state.course.lessons[id] || (state.course.lessons[id] = { done: false, step: 0 });
    e.step = Math.max(0, step | 0);
    saveState();
  }
  function markLessonDone(id) {
    var e = state.course.lessons[id] || (state.course.lessons[id] = { done: false, step: 0 });
    e.done = true;
    e.step = 0; // erledigt: Resume-Zeiger zuruecksetzen (erneut spielen startet vorn)
    saveState();
  }
```

In `window.TACHELES_DEBUG` (~line 5162) add:

```js
    // Kurs-Runde: Kurs-/Reading-Hooks fuer die Regression.
    courseInfo: function () {
      return {
        available: courseAvailable(),
        lessons: COURSE ? COURSE.lessons.length : 0,
        sections: COURSE ? (COURSE.sections || []).length : 0,
        entry: state.course.entry
      };
    },
    lessonStateOf: function (id) { return lessonState(id); },
    syllabify: function (s) { return READING ? READING.syllabify(s) : null; },
```

- [ ] **Step 4: Validators (committed; T2-T4 run them until green, release runs them again)**

`tools/validate-course.cjs` (complete file):

```js
/*
 * Tacheles - Kurs-Validator (Vertrag C1). Aufruf: node tools/validate-course.cjs
 * Exit 0 = gueltig. Prueft Abdeckung (vollstaendig + eindeutig), Groessen,
 * Referenzen, Band-Ordnung, Szenen, Grammatik-Mapping, Reading-Drills.
 */
"use strict";
const path = require("path");
global.window = global.window || {};
const dir = path.resolve(__dirname, "..", "app");
require(path.join(dir, "content.js"));
require(path.join(dir, "grammar.js"));
require(path.join(dir, "course.js"));
try { require(path.join(dir, "reading.js")); } catch (e) { /* optional bis T4 */ }

const C = window.TACHELES_CONTENT, G = window.TACHELES_GRAMMAR, K = window.TACHELES_COURSE;
const R = window.TACHELES_READING || { drills: [] };
const BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
const errs = [], warns = [];
const err = (m) => errs.push(m);

const itemIds = {}; C.items.forEach(i => itemIds[i.id] = i);
const dlgIds = {}; (C.dialogues || []).forEach(d => dlgIds[d.id] = true);
const gmods = {}; (G.modules || []).forEach(m => gmods[m.id] = m);
const drillIds = {}; (R.drills || []).forEach(d => drillIds[d.id] = true);

// V2/V3: Groessen + Sektionen
if (!(K.sections.length >= 16 && K.sections.length <= 20)) err("V2: sections " + K.sections.length + " (soll 16-20)");
if (!(K.lessons.length >= 95)) err("V2: lessons " + K.lessons.length + " (soll >= 95)");
const secIds = {}, secUsed = {}, lessonIds = {};
K.sections.forEach(s => {
  if (secIds[s.id]) err("V3: doppelte section " + s.id);
  secIds[s.id] = s;
  if (BANDS.indexOf(s.band) < 0) err("V3: section " + s.id + " band " + s.band);
  if (!s.title || !s.emoji) err("V3: section " + s.id + " ohne title/emoji");
});

// V1/V4-V7 je Lektion
const assigned = {};   // itemId -> lessonId
const gramSteps = {};  // moduleId -> { stepIdx: 1 }
let prevBand = 0;
K.lessons.forEach((l, li) => {
  const where = l.id + " (#" + li + ")";
  if (lessonIds[l.id]) err("V3: doppelte lesson " + l.id);
  lessonIds[l.id] = 1;
  if (!secIds[l.section]) err("V3: " + where + " section " + l.section + " fehlt");
  else {
    secUsed[l.section] = 1;
    if (secIds[l.section].band !== l.band) err("V4: " + where + " band != section.band");
  }
  if (!l.title || !l.emoji) err("V3: " + where + " ohne title/emoji");
  const bi = BANDS.indexOf(l.band);
  if (bi < 0) err("V4: " + where + " band " + l.band);
  if (bi < prevBand) err("V4: " + where + " band faellt (" + l.band + ")");
  else prevBand = bi;
  const n = (l.newItemIds || []).length;
  if (n < 5 || n > 8) err("V2: " + where + " hat " + n + " newItemIds (soll 5-8)");
  (l.newItemIds || []).forEach(id => {
    if (!itemIds[id]) { err("V1: " + where + " unbekannte Item-ID " + id); return; }
    if (assigned[id]) err("V1: " + id + " doppelt (" + assigned[id] + " + " + l.id + ")");
    assigned[id] = l.id;
  });
  if (l.scene) { // V5
    if (l.scene.dialogueId) {
      if (!dlgIds[l.scene.dialogueId]) err("V5: " + where + " Dialog " + l.scene.dialogueId + " fehlt");
    } else if (Array.isArray(l.scene.lines)) {
      if (l.scene.lines.length < 2 || l.scene.lines.length > 6) err("V5: " + where + " " + l.scene.lines.length + " Szenen-Zeilen (soll 2-6)");
      l.scene.lines.forEach((x, i) => { if (!x || !x.he || !x.translit || !x.de) err("V5: " + where + " Zeile " + i + " unvollstaendig"); });
    } else err("V5: " + where + " scene weder dialogueId noch lines");
  }
  if (l.grammar) { // V6
    if (l.grammar.moduleId) {
      const gm = gmods[l.grammar.moduleId];
      if (!gm) err("V6: " + where + " Modul " + l.grammar.moduleId + " fehlt");
      else {
        const st = l.grammar.steps;
        if (!Array.isArray(st) || !st.length) err("V6: " + where + " steps leer");
        else st.forEach(ix => {
          if (!(ix >= 0 && ix < gm.steps.length)) err("V6: " + where + " step-Index " + ix + " ausserhalb (" + gm.id + ")");
          const set = gramSteps[gm.id] || (gramSteps[gm.id] = {});
          if (set[ix]) err("V6: " + gm.id + " step " + ix + " doppelt referenziert");
          set[ix] = 1;
        });
      }
    } else if (Array.isArray(l.grammar.inline)) {
      l.grammar.inline.forEach((s, i) => {
        if (["explain", "cloze", "form"].indexOf(s.type) < 0) err("V6: " + where + " inline-Schritt " + i + " Typ " + s.type);
        if (s.type !== "explain") {
          const o = s.options || [], nc = o.filter(x => x && x.correct === true).length;
          if (o.length < 2 || o.length > 4 || nc !== 1) err("V6: " + where + " inline " + i + ": " + o.length + " Optionen/" + nc + " correct");
        }
      });
    } else err("V6: " + where + " grammar weder moduleId noch inline");
  }
  if (l.reading) { // V7
    if (!l.reading.drill || !drillIds[l.reading.drill]) err("V7: " + where + " Drill " + (l.reading && l.reading.drill) + " fehlt (reading.js geladen?)");
    const secIdx = K.sections.findIndex(s => s.id === l.section);
    if (secIdx > 2) err("V7: " + where + " reading ausserhalb der ersten 3 Sektionen");
  }
});
Object.keys(secIds).forEach(id => { if (!secUsed[id]) err("V3: section " + id + " ohne Lektion"); });
const missing = C.items.filter(i => !assigned[i.id]).map(i => i.id);
if (missing.length) err("V1: " + missing.length + " Items ohne Lektion: " + missing.slice(0, 12).join(",") + (missing.length > 12 ? " ..." : ""));
(G.modules || []).forEach(m => { if (!gramSteps[m.id]) err("V6: Grammatik-Modul " + m.id + " in keiner Lektion referenziert"); });
// V8 (nur Warnungen): Themen-Kohaerenz
K.lessons.forEach(l => {
  const themes = new Set((l.newItemIds || []).map(id => itemIds[id] && itemIds[id].theme).filter(Boolean));
  if (themes.size > 3) warns.push("V8: " + l.id + " mischt " + themes.size + " Themen");
});

console.log("Kurs: " + K.lessons.length + " Lektionen, " + K.sections.length + " Sektionen, " +
  Object.keys(assigned).length + "/" + C.items.length + " Items zugeordnet, " +
  Object.keys(gramSteps).length + "/" + (G.modules || []).length + " Grammatik-Module referenziert");
warns.forEach(w => console.log("  WARN  " + w));
if (errs.length) { errs.forEach(e => console.log("  FEHLER  " + e)); console.log("FAIL: " + errs.length + " Fehler"); process.exit(1); }
console.log("PASS");
```

`tools/validate-snacks.cjs` (complete file):

```js
/*
 * Tacheles - Snack-Validator (Vertrag C2). Aufruf: node tools/validate-snacks.cjs
 */
"use strict";
const path = require("path");
global.window = global.window || {};
const dir = path.resolve(__dirname, "..", "app");
require(path.join(dir, "content.js"));
require(path.join(dir, "snacks.js"));
const C = window.TACHELES_CONTENT, S = window.TACHELES_SNACKS;
const BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
const errs = []; const err = m => errs.push(m);
const itemIds = {}; C.items.forEach(i => itemIds[i.id] = 1);

if (!(S.snacks.length >= 38 && S.snacks.length <= 50)) err("S1: " + S.snacks.length + " Snacks (soll 38-50)");
const seen = {};
let examplesTotal = 0;
S.snacks.forEach(s => {
  const w = s.id;
  if (!/^snack_/.test(s.id || "")) err("S1: id ohne snack_-Praefix: " + s.id);
  if (seen[s.id]) err("S1: doppelte id " + s.id);
  seen[s.id] = 1;
  if (!s.title || !s.emoji) err("S1: " + w + " ohne title/emoji");
  if (BANDS.indexOf(s.band) < 0) err("S1: " + w + " band " + s.band);
  const st = s.steps || [];
  if (st.length < 2 || st.length > 4) err("S2: " + w + " hat " + st.length + " Schritte (soll 2-4)");
  if (!st[0] || st[0].type !== "explain" || !st[0].text) err("S2: " + w + " Schritt 0 ist kein explain mit text");
  const q = st.filter(x => ["quiz", "cloze", "form"].indexOf(x.type) >= 0).length;
  if (q < 1 || q > 2) err("S2: " + w + " hat " + q + " Fragen (soll 1-2)");
  st.forEach((x, i) => {
    if (["explain", "quiz", "cloze", "form"].indexOf(x.type) < 0) err("S3: " + w + "#" + i + " Typ " + x.type);
    if (x.type === "quiz") {
      if (!itemIds[x.itemId]) err("S3: " + w + "#" + i + " quiz.itemId " + x.itemId + " fehlt");
      (x.distractorIds || []).forEach(d => { if (!itemIds[d]) err("S3: " + w + "#" + i + " distractor " + d + " fehlt"); });
    }
    if (x.type === "cloze" || x.type === "form") {
      const o = x.options || [], nc = o.filter(y => y && y.correct === true).length;
      if (o.length < 2 || o.length > 4 || nc !== 1) err("S3: " + w + "#" + i + ": " + o.length + " Optionen/" + nc + " correct");
      o.forEach((y, j) => { if (!y.he || !y.translit) err("S3: " + w + "#" + i + " Option " + j + " ohne he/translit"); });
    }
    if (x.type === "explain") {
      const ex = x.examples || [];
      if (i === 0 && (ex.length < 1 || ex.length > 4)) err("S4: " + w + "#" + i + " " + ex.length + " examples (soll 1-4)");
      ex.forEach((e, j) => { if (!e.he || !e.translit || !e.de) err("S4: " + w + "#" + i + " example " + j + " unvollstaendig"); });
      examplesTotal += ex.length;
    }
  });
});
console.log("Snacks: " + S.snacks.length + " Einheiten, " + examplesTotal + " vertonbare Beispiele");
if (errs.length) { errs.forEach(e => console.log("  FEHLER  " + e)); console.log("FAIL: " + errs.length); process.exit(1); }
console.log("PASS");
```

`tools/validate-reading.cjs` (complete file):

```js
/*
 * Tacheles - Reading-Validator (Vertrag C3). Aufruf: node tools/validate-reading.cjs
 * Prueft Inventar, Round-Trip des Silbifizierers (exceptions + Sample-Woerter), Drills.
 */
"use strict";
const path = require("path");
global.window = global.window || {};
const dir = path.resolve(__dirname, "..", "app");
require(path.join(dir, "content.js"));
require(path.join(dir, "reading.js"));
const C = window.TACHELES_CONTENT, R = window.TACHELES_READING;
const errs = []; const err = m => errs.push(m);
const items = {}; C.items.forEach(i => items[i.id] = i);

// R1: Inventar
const syl = R.syllables || [];
if (!(syl.length >= 120 && syl.length <= 300)) err("R1: " + syl.length + " Silben (soll 120-300)");
const seenHe = {};
let shva = 0;
syl.forEach((s, i) => {
  if (!s.he || !s.translit) err("R1: Silbe #" + i + " ohne he/translit");
  if (seenHe[s.he]) err("R1: doppelte Silbe " + s.he);
  seenHe[s.he] = 1;
  if (s.vowel === "shva") shva++;
});
if (shva < 10) err("R1: nur " + shva + " Schwa-Silben (soll >= 10)");

// R2: Round-Trip. Silben (ohne Whitespace) muessen den Input reproduzieren.
const strip = s => String(s).replace(/\s+/g, "");
function roundTrip(word, label) {
  const parts = R.syllabify(word);
  if (!parts) { err("R2: syllabify(" + label + ") -> null"); return; }
  const joined = strip(parts.map(p => p.he).join(""));
  if (joined !== strip(word)) err("R2: Round-Trip kaputt fuer " + label + ": " + joined);
  parts.forEach((p, i) => { if (!p.translit) err("R2: " + label + " Silbe " + i + " ohne translit"); });
}
Object.keys(R.exceptions || {}).forEach(w => roundTrip(w, "exception " + w));
// Fixe Stichprobe: >= 25 echte Item-IDs. T4 verifiziert jede ID gegen content.js
// und ersetzt fehlende durch reale (die Round-Trip-Regel selbst ist fix).
const SAMPLE_IDS = ["shalom", "toda", "bevakasha", "ken", "lo", "slicha", "boker_tov",
  "laila_tov", "beseder", "efshar", "toda_raba", "erev_tov", "lehitraot", "bay",
  "naim_meod", "ma_shlomcha", "ma_shlomech"]; // T4: auf >= 25 existierende IDs erweitern
const found = SAMPLE_IDS.filter(id => items[id]);
if (found.length < 25) err("R2: Sample-Liste hat nur " + found.length + " existierende IDs (soll >= 25) - T4 muss sie erweitern");
found.forEach(id => roundTrip(items[id].niqqud, id + " (" + items[id].niqqud + ")"));

// R3: Drills
const drills = R.drills || [];
if (drills.length < 8) err("R3: " + drills.length + " Drills (soll >= 8)");
const dSeen = {}, levels = {};
drills.forEach(d => {
  if (!/^drill_/.test(d.id || "")) err("R3: Drill-id " + d.id);
  if (dSeen[d.id]) err("R3: doppelte Drill-id " + d.id);
  dSeen[d.id] = 1;
  if (!(d.level >= 1 && d.level <= 3)) err("R3: " + d.id + " level " + d.level);
  levels[d.level] = 1;
  const T = ["hearPick", "readPick", "blend", "speed"];
  if (!Array.isArray(d.types) || !d.types.length || d.types.some(t => T.indexOf(t) < 0)) err("R3: " + d.id + " types " + JSON.stringify(d.types));
  if (d.level === 1) {
    if (!(d.syllables && d.syllables.length >= 4 && d.syllables.length <= 10)) err("R3: " + d.id + " " + ((d.syllables || []).length) + " Silben (soll 4-10)");
    (d.syllables || []).forEach(h => { if (!seenHe[h]) err("R3: " + d.id + " Silbe " + h + " nicht im Inventar"); });
  } else {
    if (!(d.wordIds && d.wordIds.length >= 3 && d.wordIds.length <= 8)) err("R3: " + d.id + " " + ((d.wordIds || []).length) + " Woerter (soll 3-8)");
    (d.wordIds || []).forEach(id => {
      const it = items[id];
      if (!it) { err("R3: " + d.id + " Item " + id + " fehlt"); return; }
      if (!it.niqqud) err("R3: " + d.id + " Item " + id + " ohne niqqud");
      else if (!R.syllabify(it.niqqud)) err("R3: " + d.id + " Item " + id + " nicht silbifizierbar");
    });
  }
});
if (!(levels[1] && levels[2] && levels[3])) err("R3: nicht alle Level 1-3 abgedeckt");

console.log("Reading: " + syl.length + " Silben (" + shva + " Schwa), " +
  Object.keys(R.exceptions || {}).length + " Ausnahmen, " + drills.length + " Drills");
if (errs.length) { errs.forEach(e => console.log("  FEHLER  " + e)); console.log("FAIL: " + errs.length); process.exit(1); }
console.log("PASS");
```

- [ ] **Step 5: Run validators - verify they FAIL on the skeletons**

Run: `node tools/validate-course.cjs; node tools/validate-snacks.cjs; node tools/validate-reading.cjs`
Expected: all three exit 1 with counted FEHLER lines (e.g. `V2: lessons 0 (soll >= 95)`). That red state is exactly what T2-T4 turn green.

- [ ] **Step 6: Regression - state schema checks (write, run, pass)**

In `app/test/regression.cjs`, section 14b, after the `fbMerge` check (~line 788) and BEFORE the "Zustand fuer nachfolgende Sektionen neutral hinterlassen" block, add:

```js
  // Kurs-State (Kurs-Runde): Allowlist + Merge.
  const courseSchema = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      hasCourse: !!s.course && typeof s.course.lessons === "object" && !Array.isArray(s.course.lessons),
      entry: s.course ? s.course.entry : "MISSING",
      snacksSeen: !!s.course && typeof s.course.snacksSeen === "object" && !Array.isArray(s.course.snacksSeen),
      snackVocab: s.profile.snackVocab
    };
  });
  check("Schema: course-Slice + profile.snackVocab im Default-State",
    courseSchema.hasCourse && courseSchema.entry === null && courseSchema.snacksSeen && courseSchema.snackVocab === true,
    JSON.stringify(courseSchema));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.course = { lessons: { l_a0_01: { done: true, step: 3 }, junk: 5 }, entry: "l_a0_02", snacksSeen: { snack_x: true } };
    s.profile.snackVocab = false;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  const courseAfter = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { l1: s.course.lessons.l_a0_01, junk: s.course.lessons.junk, entry: s.course.entry,
      seen: s.course.snacksSeen.snack_x, snackVocab: s.profile.snackVocab };
  });
  check("Schema: course ueberlebt Laden/Normalisieren (Junk verworfen)",
    courseAfter.l1 && courseAfter.l1.done === true && courseAfter.l1.step === 3 &&
    courseAfter.junk === undefined && courseAfter.entry === "l_a0_02" &&
    courseAfter.seen === true && courseAfter.snackVocab === false, JSON.stringify(courseAfter));
  const courseMerge = await page.evaluate(() => {
    const base = () => ({ version: 1, profile: { onboarded: true }, gamification: {}, srs: {}, log: {} });
    const A = base(); A.course = { lessons: { l1: { done: true, step: 0 }, l2: { done: false, step: 4 } }, entry: null, snacksSeen: { s1: true } };
    const B = base(); B.course = { lessons: { l2: { done: true, step: 2 } }, entry: "l2", snacksSeen: { s2: true } };
    const m = window.TACHELES_DEBUG.mergeStates(A, B);
    return { l1: m.course.lessons.l1, l2: m.course.lessons.l2, entry: m.course.entry,
      seen: Object.keys(m.course.snacksSeen).sort().join(",") };
  });
  check("merge: course done OR / step max / entry gesetzt / snacksSeen vereinigt",
    courseMerge.l1.done === true && courseMerge.l2.done === true && courseMerge.l2.step === 4 &&
    courseMerge.entry === "l2" && courseMerge.seen === "s1,s2", JSON.stringify(courseMerge));
```

Run: `cd app && node --check app.js course.js snacks.js reading.js && node test/regression.cjs`
Expected: PASS, all existing checks + 3 new ones green (the empty skeletons must not trip the "0 Konsolenfehler" check).

- [ ] **Step 7: Commit**

```bash
git add app/course.js app/snacks.js app/reading.js app/index.html app/app.js app/test/regression.cjs tools/validate-course.cjs tools/validate-snacks.cjs tools/validate-reading.cjs
git commit -m "feat: course-round contracts - skeleton globals, course state schema, validators"
```

---

## Task 2: course.js - Curriculum-Kuratierung (~100 Lektionen) [PARALLEL mit T3/T4]

**Files:**
- Modify: `app/course.js` (replace the empty `sections`/`lessons` arrays; keep header)
- Create (scratchpad, NOT committed): `<scratchpad>/course-draft.cjs` (curation helper)
- Test: `node tools/validate-course.cjs` (must exit 0), `cd app && node --check course.js`

**Interfaces:**
- Consumes: contract C1, validator from T1, `content.js` (673 items, 41 themes, 14 dialogues), `grammar.js` (21 modules), reading drill ids from contract C3 (`drill_a0_01` … - coordinate ONLY via the fixed ids listed in Step 3; if T4 is not merged yet, the validator warns V7 "reading.js geladen?" - leave the references in, they are part of the contract).
- Produces: the final curriculum data. No app code.

This is an authoring task, not a mechanical dump. Work generator-assisted: a scratchpad helper DRAFTS lesson groupings from themes/bands/freq; the agent then hand-tunes titles, ordering, scenes, grammar placement, and item regrouping for didactic quality before pasting into course.js.

- [ ] **Step 1: Write the curation helper (scratchpad)**

Save as `<scratchpad>/course-draft.cjs`; it emits a draft `lessons` array as JSON to stdout:

```js
/* Entwurfs-Generator: gruppiert Items je Thema nach freq in 5-8er-Blöcke und
 * schlaegt Sektionen je Band vor. Ausgabe = Rohentwurf fuer HANDARBEIT. */
"use strict";
const path = require("path");
global.window = {};
require(path.resolve(__dirname, "../app/content.js")); // Pfad ggf. anpassen
const C = window.TACHELES_CONTENT;
const BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
const byTheme = {};
C.items.forEach(i => (byTheme[i.theme] = byTheme[i.theme] || []).push(i));
const draft = [];
BANDS.forEach(band => {
  C.themes.filter(t => t.band === band).forEach(t => {
    const items = (byTheme[t.id] || []).slice().sort((a, b) => (a.freq - b.freq) || (a.id < b.id ? -1 : 1));
    // 5-8er-Blöcke: Blockzahl so waehlen, dass kein Rest < 5 entsteht.
    const n = items.length;
    let k = Math.ceil(n / 7);
    while (k * 8 < n) k++;
    while (k > 1 && n - (k - 1) * 5 < 5) k--;
    const per = Math.ceil(n / k);
    for (let b = 0; b < k; b++) {
      const chunk = items.slice(b * per, (b + 1) * per);
      if (!chunk.length) continue;
      draft.push({
        band, theme: t.id, themeTitle: t.title, emoji: t.emoji,
        part: k > 1 ? (b + 1) + "/" + k : "",
        size: chunk.length,
        newItemIds: chunk.map(i => i.id)
      });
    }
  });
});
console.log(JSON.stringify(draft, null, 1));
console.error("Lektions-Entwuerfe: " + draft.length + " / Items: " + draft.reduce((a, l) => a + l.size, 0));
```

Run it, inspect the draft counts. Expected: ~100-115 draft lessons covering all 673 items. Blocks of size < 5 or > 8 (small themes like `signs` with 19 items are fine; a theme with < 5 items would need merging with a neighbor theme of the SAME band - do that by hand in Step 3).

- [ ] **Step 2: Design sections (by hand)**

16-20 sections, band-ascending, thematic arcs rather than one section per theme. Reference layout (adjust freely, keep counts and band order):

- A0 (4 Sektionen, ~147 Items ≈ 22 Lektionen): `sec_a0_erste_worte` 👋 (greetings, self), `sec_a0_lesen_zaehlen` 🔤 (alefbet, numbers) - Lese-Drills leben in den Sektionen 1-3, `sec_a0_unterwegs` 🧭 (signs, directions, questions), `sec_a0_cafe_alltag` ☕ (cafe, time, feelings)
- A1 (4 Sektionen, ~151 Items ≈ 23 Lektionen): `sec_a1_essen_markt` 🍎 (food, shopping), `sec_a1_menschen` 👪 (family, verbs), `sec_a1_unterwegs2` 🚌 (transport, emergency, colors), `sec_a1_feinschliff` 🔗 (small_words, adjectives, numbers2)
- A2 (3 Sektionen, 93 Items ≈ 14 Lektionen): work+home, weather+hobbies, verbs_tense
- B1 (2-3 Sektionen, 74 Items ≈ 11 Lektionen): opinion+media, bureaucracy+relationships
- B2 (2 Sektionen, 68 Items ≈ 10 Lektionen): society+abstract, slang+work_adv
- C1 (2 Sektionen, 73 Items ≈ 11 Lektionen): negotiation+culture, science+emotions
- C2 (2 Sektionen, 67 Items ≈ 10 Lektionen): rhetoric+irony, legal+idioms

- [ ] **Step 3: Curate lessons (by hand, from the draft)**

Rules while editing the draft into final lessons:
- ids `l_<band>_<nn>` lowercase, zero-padded, in array order (`l_a0_01` …). Order within a band: didactic (greetings before questions; letters interleaved with first words, NOT 5 letter-lessons in a row - spread `alefbet` blocks between word lessons of section 1-2).
- Titles: concrete and situational ("Im Café bestellen", "Die ersten fünf Buchstaben"), NOT theme names copied.
- Scenes: map the 14 dialogues to the lesson where their vocabulary lives (`cafe`→Café-Lektion, `market`→Einkaufen, `way`→Richtung, `meet`→Kennenlernen, `taxi`/`hotel`/`restaurant`/`pharmacy`→passende A0-Lektionen, `apartment`/`weather_chat`→A2, `job_talk`/`opinion_talk`→B1, `salary_talk`→C1, `contract_talk`→C2). Beyond that, write inline `lines` scenes (2-4 lines, reuse lesson vocabulary, translit + de per line) for roughly every 2nd-3rd lesson from A2 upward; C1/C2 lessons are text/idiom-driven: most get a scene plus a register-focused grammar or inline point. A0/A1 lessons without a dialogue may have `scene: null` (the player skips the step).
- Grammar: distribute all 21 modules; split each module's 7-9 steps over 2-3 lessons via `steps` index arrays (e.g. `mod_gram_genus` steps [0,1] intro lesson, [2,3,4] next, [5,6,7] later), always at the lesson where the vocabulary makes the point natural. Each module's every step index referenced at most once (V6); referencing every index is not required.
- Reading: lessons in sections 1-3 that introduce letters or first words get `reading: { drill: "drill_a0_NN" }` using the fixed drill ids from C3/T4: `drill_a0_01` … `drill_a0_08` (T4 guarantees at least these 8 ids; the level progression is drill_a0_01-04 = level 1, 05-07 = level 2, 08 = level 3).
- `listening: false` only where items are letters-only (audio2de over letter names is confusing); everywhere else true.

- [ ] **Step 4: Validate until green**

Run: `node tools/validate-course.cjs`
Expected: `PASS` with `673/673 Items zugeordnet, 21/21 Grammatik-Module referenziert`; V8 warnings reviewed (mixing >3 themes is a smell - regroup). Also run `cd app && node --check course.js`.

- [ ] **Step 5: Self-review the curation (didactic pass)**

Read the final lessons top-to-bottom once as a learner would: no lesson asks for vocabulary it hasn't introduced when its grammar/cloze examples use content words; section arcs make sense; titles vary. Fix inline.

- [ ] **Step 6: Commit**

```bash
git add app/course.js
git commit -m "feat: course curriculum - ~100 curated lessons across A0-C2"
```

---

## Task 3: snacks.js - ~40 Wissens-Häppchen [PARALLEL mit T2/T4]

**Files:**
- Modify: `app/snacks.js` (fill `snacks`; keep header)
- Test: `node tools/validate-snacks.cjs` (exit 0), `cd app && node --check snacks.js`

**Interfaces:**
- Consumes: contract C2, validator from T1, `content.js` item ids (for `quiz`/`distractorIds` and cloze vocabulary).
- Produces: the snack catalog. No app code. The `explain.examples[].he` strings are the exact texts that get voiced (C7) - write them as clean Hebrew (ktiv male like grammar.js examples; niqqud optional but preferred for single words).

- [ ] **Step 1: Plan the catalog (list of 40 ids before writing)**

Draft the id list first, spread per C2/S5 (A0 x12, A1 x10, A2 x6, B1 x5, B2 x4, C1 x2, C2 x2 - total 41, fine within 38-50). Topic families with example units:
- Sprachwissen kompakt: `snack_efshar` (efshar + Substantiv = höfliche Bitte), `snack_yesh_ein` (yesh/ein), `snack_zeh` (zeh als Allzweckwort), `snack_smichut_alltag`, `snack_verneinung_lo`
- Slang-Perlen: `snack_sababa`, `snack_achla`, `snack_yalla`, `snack_stam`, `snack_balagan`, `snack_davka`
- Kultur & Alltag: `snack_shabbat` (Wochenende Fr/Sa), `snack_chutzpah`, `snack_beteavon`, `snack_handbewegung_rega`, `snack_shekel_geld`, `snack_du_kultur` (alle duzen)
- Schrift & Schilder: `snack_ktiv_male` (warum ohne Punkte geschrieben wird), `snack_endformen`, `snack_zahlen_buchstaben` (Gematria light), `snack_schild_achtung`
- Höflichkeit/Register: `snack_slicha_vs_mitzta`, `snack_amtssprache` (C2), `snack_ironie_nu` (C2)
Write warm German ("du"-Ton, kurz, ein Aha pro Snack). Every snack: 1 explain (with 1-4 he examples) + 1-2 questions that ONLY quiz existing items or use cloze/form with real morphological contrasts (grammar.js style).

- [ ] **Step 2: Author all snacks in app/snacks.js**

Shape per unit exactly like this worked example (write ~40 of these):

```js
    {
      id: "snack_sababa", title: "Sababa!", emoji: "🤙", band: "A0",
      steps: [
        { type: "explain", title: "Das nützlichste Wort nach Schalom",
          text: "סבבה (sababa) heißt „super“, „passt“, „alles klar“ – und ist die halbe israelische Alltagskommunikation. Auf „Treffen wir uns um acht?“ antwortest du einfach: Sababa. Es funktioniert als Zustimmung, Stimmungsbericht und Verabschiedung.",
          examples: [
            { he: "סבבה", translit: "sababa", de: "super / passt" },
            { he: "הכל סבבה", translit: "hakol sababa", de: "alles bestens" }
          ] },
        { type: "form", prompt: "Dein Freund fragt: „Treffen um acht?“ – du bist einverstanden. Was sagst du?",
          options: [
            { he: "סבבה", translit: "sababa", correct: true },
            { he: "סליחה", translit: "slicha" },
            { he: "שלום", translit: "shalom" }
          ],
          note: "סבבה = passt! סליחה wäre „Entschuldigung“." }
      ]
    },
```

- [ ] **Step 3: Validate until green**

Run: `node tools/validate-snacks.cjs && (cd app && node --check snacks.js)`
Expected: `PASS` with `~40 Einheiten` and the examples count printed (that count later becomes audio clips).

- [ ] **Step 4: Commit**

```bash
git add app/snacks.js
git commit -m "feat: ~40 knowledge snacks (language + culture units)"
```

---

## Task 4: reading.js - Silben-Inventar, Silbifizierer, Drills [PARALLEL mit T2/T3]

**Files:**
- Modify: `app/reading.js` (replace skeleton body; keep the one-global IIFE shape)
- Modify: `tools/validate-reading.cjs` (ONLY the `SAMPLE_IDS` list, extend to >= 25 existing ids)
- Test: `node tools/validate-reading.cjs` (exit 0), `cd app && node --check reading.js`

**Interfaces:**
- Consumes: contract C3, validator from T1, `content.js` niqqud fields.
- Produces: `window.TACHELES_READING` incl. the exported `syllabify` FUNCTION and the fixed drill ids `drill_a0_01` … `drill_a0_08` (minimum set; T2 references exactly these; more drills welcome). Level mapping fixed for T2: 01-04 level 1, 05-07 level 2, 08 level 3.

- [ ] **Step 1: Build the syllable inventory programmatically**

Inside the IIFE, generate `syllables` from frequent letters x vowel signs (materialized array so validator + audio enumeration see a fixed list):

```js
  // Konsonanten in Lese-Lernreihenfolge (wie content.js freq): die 22 Grundformen.
  var CONS = [
    { he: "ב", tr: "b" }, { he: "שׁ", tr: "sch" }, { he: "ל", tr: "l" }, { he: "מ", tr: "m" },
    { he: "ת", tr: "t" }, { he: "ד", tr: "d" }, { he: "ה", tr: "h" }, { he: "כ", tr: "k" },
    { he: "נ", tr: "n" }, { he: "ק", tr: "k" }, { he: "י", tr: "j" }, { he: "ר", tr: "r" },
    { he: "ח", tr: "ch" }, { he: "פ", tr: "p" }, { he: "ט", tr: "t" }, { he: "ז", tr: "s" },
    { he: "ג", tr: "g" }, { he: "צ", tr: "z" }, { he: "ס", tr: "s" }, { he: "ו", tr: "w" },
    { he: "א", tr: "" }, { he: "ע", tr: "" }
  ];
  // Vokalzeichen (Niqqud) inkl. Schwa. combine = Codepoint(s), die an den Konsonanten haengen.
  var VOWELS = [
    { id: "patach", mark: "ַ", tr: "a" }, { id: "kamatz", mark: "ָ", tr: "a" },
    { id: "segol", mark: "ֶ", tr: "e" }, { id: "tsere", mark: "ֵ", tr: "e" },
    { id: "chirik", mark: "ִ", tr: "i" }, { id: "cholam", mark: "ֹ", tr: "o" },
    { id: "kubutz", mark: "ֻ", tr: "u" }, { id: "shva", mark: "ְ", tr: "'" }
  ];
  var syllables = [];
  CONS.forEach(function (c) {
    VOWELS.forEach(function (v) {
      // Stumme Traeger (Alef/Ajin): nur mit vollem Vokal sinnvoll, kein Schwa.
      if (!c.tr && v.id === "shva") return;
      syllables.push({
        he: c.he + v.mark,
        translit: (c.tr || "") + (v.id === "shva" ? "" : v.tr) || v.tr,
        letter: c.he.charAt(0),
        vowel: v.id
      });
    });
  });
```

(22 x 8 minus exclusions ≈ 170 entries - inside R1's 120-300 window. `שׁ` carries the shin dot so the syllable renders and voices as "sch". Adjust the translit join so shva syllables read like "b'" / "sch'" - pick one convention and keep it consistent; the exact strings are the agent's call, the validator only demands non-empty + unique `he`.)

- [ ] **Step 2: Implement the heuristic syllabifier**

Contract: `syllabify(niqqud) -> [{he, translit}] | null`, exceptions first, per-word processing, round-trip safe. Reference implementation skeleton (the agent finishes and tunes it - the hard cases go into `exceptions` instead of heuristic cleverness):

```js
  var VOWEL_TR = { "ַ": "a", "ָ": "a", "ֶ": "e", "ֵ": "e",
    "ִ": "i", "ֹ": "o", "ֻ": "u", "ְ": "" };
  var CONS_TR = { /* Buchstabe -> Umschrift, inkl. Endformen und Punkt-Varianten:
    "ב":"w","בּ":"b","ש":"sch", … pflege die Map vollstaendig (27 Formen + Dagesch-Faelle) */ };

  function isHebrewLetter(ch) { var c = ch.charCodeAt(0); return c >= 0x05D0 && c <= 0x05EA; }
  function isMark(ch) { var c = ch.charCodeAt(0); return c >= 0x0591 && c <= 0x05C7; }

  /** Ein WORT (ohne Leerzeichen) in Silben zerlegen; null bei Unsicherheit. */
  function splitWord(w) {
    // 1. In Cluster zerlegen: Buchstabe + alle folgenden Marks (Niqqud/Dagesch/Schin-Punkt).
    var clusters = [];
    for (var i = 0; i < w.length; i++) {
      var ch = w.charAt(i);
      if (isHebrewLetter(ch)) clusters.push(ch);
      else if (isMark(ch) && clusters.length) clusters[clusters.length - 1] += ch;
      else return null; // Fremdzeichen -> Ausnahmefall
    }
    // 2. Silbengrenzen: eine Silbe = Konsonant(en) bis einschliesslich des Clusters
    //    mit Vollvokal; matres lectionis (ו als o/u, י als i, ה am Wortende) und
    //    schliessende Konsonanten (naechster Cluster hat Vokal) haengen an die Silbe an.
    //    Schwa am Silbenanfang klebt am naechsten Vollvokal (b' + ra -> bra? nein:
    //    wir behandeln Konsonant+Schwa als eigene Mini-Silbe, so bleibt der
    //    Round-Trip trivial und die Drills zeigen das Schwa explizit).
    var out = [], cur = "", curTr = "";
    for (var k = 0; k < clusters.length; k++) {
      var cl = clusters[k];
      cur += cl;
      curTr += translitCluster(cl); // CONS_TR + VOWEL_TR des Clusters
      var hasVowel = /[ִ-ְֻ]/.test(cl);
      var next = clusters[k + 1];
      // Silbe schliessen, wenn: Cluster hat Vokal UND (kein next ODER next beginnt neue Silbe).
      if (hasVowel) {
        // Anfuegen von matres lectionis / silbenschliessendem Konsonanten:
        while (next && !/[ִ-ְֻ]/.test(next) && isTrailing(next, clusters[k + 2])) {
          cur += next; curTr += translitCluster(next); k++; next = clusters[k + 1];
        }
        out.push({ he: cur, translit: curTr });
        cur = ""; curTr = "";
      }
    }
    if (cur) {
      // Rest ohne Vokal (z. B. Endkonsonant nach mater lectionis): an letzte Silbe haengen.
      if (!out.length) return null;
      out[out.length - 1].he += cur;
      out[out.length - 1].translit += curTr;
    }
    return out.length ? out : null;
  }

  function syllabify(niqqud) {
    var s = String(niqqud == null ? "" : niqqud).trim();
    if (!s) return null;
    if (exceptions[s]) return exceptions[s].slice();
    var words = s.split(/\s+/), all = [];
    for (var i = 0; i < words.length; i++) {
      var parts = exceptions[words[i]] ? exceptions[words[i]].slice() : splitWord(words[i]);
      if (!parts) return null; // ein unsicheres Wort => null fuers Ganze (Vertrag C3)
      all = all.concat(parts);
    }
    return all;
  }
```

`isTrailing`/`translitCluster` are the agent's to finish; keep them simple and push anything ambiguous (cholam male וֹ, doubled waw, furtive patach, שׂ vs שׁ without dot) into `exceptions`.

- [ ] **Step 3: Curate exceptions + define drills**

- Run this quick scratchpad probe to find non-round-tripping words: load content.js + reading.js in node, call `syllabify(item.niqqud)` for every item with niqqud, print failures. Add curated `exceptions` entries for (at minimum) all words used in `drills[].wordIds` and the validator sample; leave rare long sentences unsplittable (null is allowed outside drills/sample).
- Extend `SAMPLE_IDS` in `tools/validate-reading.cjs` to >= 25 ids that exist (keep the initial greeting ids, add food/cafe/number words you verified).
- Define >= 8 drills with the FIXED ids/levels from the interface note: `drill_a0_01`..`04` (level 1, `types: ["hearPick","readPick"]`, 4-10 inventory syllables each, progressing letters), `drill_a0_05`..`07` (level 2, `types: ["blend"]`, 3-6 wordIds of short niqqud words like shalom/toda/ken/lo), `drill_a0_08` (level 3, `types: ["speed"]`, 4-8 wordIds).

- [ ] **Step 4: Validate until green + commit**

Run: `node tools/validate-reading.cjs && (cd app && node --check reading.js)`
Expected: `PASS` with syllable/exception/drill counts.

```bash
git add app/reading.js tools/validate-reading.cjs
git commit -m "feat: reading trainer data - syllable inventory, syllabifier, drills"
```

---

## Task 5: 5-Tab-Navigation, Vokabeln-Tab, Grammatik-Tab, Fortschritt per Statistik-Tipp [SERIAL, nach T1]

Runs against the SKELETON content files - nothing here needs T2-T4 data. The Lernen tab temporarily keeps the old path content (T7 replaces it); Home stays untouched except the tappable stats row (T9 reworks the rest).

**Files:**
- Modify: `app/index.html` (nav block, lines 18-23)
- Modify: `app/app.js` - `showScreen` (~line 1324), `renderModes` (~line 1653, becomes interim `renderCourse`), new `renderVocab()` + `renderGrammar()` (place after `renderModes`), `renderHome` stats row (~line 1542), `wireLockedSummary` (~line 1427), `renderModeEmpty` (~line 2138 "Zum Pfad"), `renderAlefbetChart` back target param
- Modify: `app/styles.css` (nav fits 5 buttons; `.power-card`, `.gram-band-h`, `.rec-tag` styles)
- Test: `app/test/regression.cjs` (selector updates listed in Step 5 + new nav checks)

**Interfaces:**
- Consumes: T1 state/helpers.
- Produces: screens `home | course | vocab | grammar | profile` (+ tab-less `progress`); `renderVocab()`, `renderGrammar()`; vocab power button id `#cta-power`; stats row `#stats-row` tappable → `showScreen("progress")`; grammar tab hosts `.module-tile` sections and the Lesen block container `#reading-block` (T6 fills the drill list).

- [ ] **Step 1: index.html nav (replace lines 18-23)**

```html
  <nav id="nav" class="bottom-nav" aria-label="Hauptnavigation">
    <button class="nav-btn" data-screen="home"><span class="nav-ico">🏠</span><span>Home</span></button>
    <button class="nav-btn" data-screen="course"><span class="nav-ico">🎓</span><span>Lernen</span></button>
    <button class="nav-btn" data-screen="vocab"><span class="nav-ico">📇</span><span>Vokabeln</span></button>
    <button class="nav-btn" data-screen="grammar"><span class="nav-ico">🧠</span><span>Grammatik</span></button>
    <button class="nav-btn" data-screen="profile"><span class="nav-ico">⚙️</span><span>Profil</span></button>
  </nav>
```

- [ ] **Step 2: showScreen mapping + interim course screen**

Replace the body of `showScreen` (~line 1330):

```js
    if (name === "home") renderHome();
    else if (name === "course") renderCourse();
    else if (name === "vocab") renderVocab();
    else if (name === "grammar") renderGrammar();
    else if (name === "progress") renderProgress(); // kein Tab mehr: via Statistik-Tipp
    else if (name === "profile") renderProfile();
```

Rename `renderModes` to `renderCourse` and strip it to an interim shell (T7 replaces it): keep the header + Smart-CTA + full `path-list` (theme rows) but REMOVE `moduleTilesHtml()` and the `Alle Modi` grid (both move to their new tabs in this task). Update every old call site: `showScreen("modes")` occurrences in `renderModeEmpty` ("Zum Pfad" → `showScreen("vocab")`, label "Zu den Vokabeln") and `wireLockedSummary` (→ `showScreen("vocab")`, sub-text "dein Training im Vokabeln-Tab schaltet sie frei").

- [ ] **Step 3: renderVocab + renderGrammar (new functions, full bodies)**

```js
  /** Vokabeln-Tab (WS-E): starkes freies Training auf erster Ebene. */
  function renderVocab() {
    var app = $("#app");
    app.innerHTML =
      '<header class="brand"><div class="brand-title">Vokabeln</div>' +
      '<div class="brand-sub">dein freies Training – so viel du willst</div></header>' +
      '<section class="card power-card">' +
      '<div class="setting-label">⚡ Power-Training</div>' +
      '<div class="setting-sub">Fälliges + Neues im smarten Mix. Wie lang?</div>' +
      '<div class="data-actions" style="margin-top:10px">' +
      '<button class="btn" data-power="5">5 Aufgaben</button>' +
      '<button class="btn primary" id="cta-power" data-power="10">10 Aufgaben</button>' +
      '<button class="btn" data-power="20">20 Aufgaben</button>' +
      '</div></section>' +
      '<h2 class="h2">Alle Modi</h2>' + modeTilesHtml(true) +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">🏅 Mastery-Check</div>' +
      '<div class="setting-sub">' + esc(MASTERY_RULE_TEXT) + '</div></div>' +
      '<button class="btn" id="btn-mastercheck">Start</button></section>' +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">💪 Knacknüsse</div>' +
      '<div class="setting-sub">Deine am häufigsten vergessenen Wörter gezielt üben.</div></div>' +
      '<button class="btn" id="btn-hard">Start</button></section>' +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">📖 Vokabelliste</div>' +
      '<div class="setting-sub">Alle Wörter nach Level durchsehen und anhören.</div></div>' +
      '<button class="btn" id="btn-vocab">Öffnen</button></section>' +
      '<h2 class="h2">Themen-Training <span class="h2-sub">· ✓ sitzt · ▶ dran · antippen zum Üben</span></h2>' +
      '<div class="theme-list path-list">' +
      CONTENT.themes.map(function (t) {
        var next = recommendedTheme();
        return pathRowHtml(t, next && t.id === next.id);
      }).join("") + '</div>' + footerLinksHtml();
    app.querySelectorAll("[data-power]").forEach(function (b) {
      b.addEventListener("click", function () { startSession("smart", { size: parseInt(b.dataset.power, 10) || 10 }); });
    });
    var mch = $("#btn-mastercheck");
    if (mch) mch.addEventListener("click", function () { startSession("mastercheck"); });
    $("#btn-hard").addEventListener("click", function () {
      var hard = CONTENT.items.filter(function (it) {
        var e = state.srs[it.id]; return e && (e.lapses || 0) >= 2;
      }).sort(function (a, b) { return state.srs[b.id].lapses - state.srs[a.id].lapses; }).slice(0, 5);
      if (!hard.length) { toast("🕊️ Keine Knacknüsse – alles im Griff!"); return; }
      startSession("smart", { itemIds: hard.map(function (it) { return it.id; }) });
    });
    $("#btn-vocab").addEventListener("click", function () { renderVocabBrowser(effectiveBand(), false, "vocab"); });
    wireModeTiles(app);
    wireThemeRows(app);
    wireFooterLinks(app);
  }

  /** Grammatik-Tab (WS-A): Module nach Level + Empfehlung + Lesen-Block. */
  function renderGrammar() {
    var app = $("#app");
    var mods = (CONTENT && CONTENT.modules) || [];
    var done = state.gamification.counters.modulesDone || {};
    var grammar = mods.filter(function (m) { return m.group === "grammar"; });
    var basic = mods.filter(function (m) { return m.group !== "grammar"; });
    // "empfohlen fuer dich": erstes offene, noch nicht erledigte Grammatik-Modul.
    var rec = null;
    for (var i = 0; i < grammar.length; i++) {
      var b = (BANDS.indexOf(grammar[i].band) >= 0) ? grammar[i].band : "A0";
      if (bandUnlocked(b) && !done[grammar[i].id]) { rec = grammar[i].id; break; }
    }
    var byBand = BANDS.map(function (band) {
      var list = grammar.filter(function (m) { return (m.band || "A0") === band; });
      if (!list.length) return "";
      return '<h2 class="h2 gram-band-h">🧠 ' + band + '</h2><div class="module-list">' +
        list.map(function (m) {
          var tile = moduleTileHtml(m, done);
          if (m.id === rec) tile = tile.replace('class="module-tile', 'class="module-tile recommended');
          return tile;
        }).join("") + '</div>';
    }).join("");
    app.innerHTML =
      '<header class="brand"><div class="brand-title">Grammatik</div>' +
      '<div class="brand-sub">Regeln verstehen &amp; üben – plus Lesen lernen</div></header>' +
      (rec ? '<div class="setting-sub rec-tag">▶ empfohlen für dich ist markiert</div>' : '') +
      byBand +
      '<h2 class="h2">👓 Lesen</h2>' +
      '<section class="card" id="reading-block">' +
      '<div class="setting-row"><div><div class="setting-label">👓 Lesen lernen</div>' +
      '<div class="setting-sub">Buchstabe für Buchstabe zum ersten Wort</div></div>' +
      '<button class="btn" id="btn-reading-path">Start</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">🔤 Alef-Bet-Tafel</div>' +
      '<div class="setting-sub">Alle 27 Buchstaben mit deinem Lernstand</div></div>' +
      '<button class="btn" id="btn-alefbet">Ansehen</button></div>' +
      '<div id="drill-list"></div>' + // T6 fuellt die Silben-Drills hier ein
      '</section>' +
      moduleSectionHtml('📚 Module <span class="h2-sub">· geführte Mini-Lektionen</span>', basic, done) +
      footerLinksHtml();
    $("#btn-reading-path").addEventListener("click", function () {
      startSession("module", { moduleObj: buildReadingModule() });
    });
    $("#btn-alefbet").addEventListener("click", renderAlefbetChart);
    wireModuleTiles(app);
    wireFooterLinks(app);
  }
```

Styles (`styles.css`): `.bottom-nav` grid to 5 columns (or smaller font on `.nav-btn span`); `.module-tile.recommended { outline: 2px solid var(--accent); }` plus a `▶`-Badge via `.recommended .module-title::after { content: " ▶"; }`; `.power-card .data-actions { flex-wrap: wrap; }`.

- [ ] **Step 4: Home stats row tappable**

In `renderHome` change `<section class="stats-row">` to `<section class="stats-row tappable" id="stats-row" role="button" tabindex="0" title="Fortschritt ansehen">` and wire after `app.innerHTML = …`:

```js
    var stats = $("#stats-row");
    if (stats) {
      var goProg = function () { showScreen("progress"); };
      stats.addEventListener("click", goProg);
      stats.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goProg(); }
      });
    }
```

`renderProgress` stays content-identical; it is now only reachable via this tap (and internal links). `renderAlefbetChart`'s back button target changes from hardcoded `"progress"` to a `backScreen` parameter (default `"progress"`, the Grammatik tab passes `"grammar"` - mirror the `renderVocabBrowser` pattern).

- [ ] **Step 5: Regression - update selectors, add nav checks (run FAILING first)**

Exact edits in `app/test/regression.cjs` (the file has 7 `data-screen === "modes"` and 4 `data-screen === "progress"` sites):
1. Section 5 (~line 250): navigate to `"vocab"` instead of `"modes"`; the `.path-row` count check stays (theme rows now live on the Vokabeln tab). The progress hop (~line 254) becomes: go `home`, then `await page.evaluate(() => { const s = document.querySelector("#stats-row"); if (s) s.click(); })`.
2. Section 9 gating (~lines 321, 334): `"modes"` → `"vocab"` (both hops); locked `.path-row` markup unchanged.
3. Section 10 modules (~line 366) and 10b grammar walk (~line 426): `"modes"` → `"grammar"`. The check text "Lernen-Screen zeigt Modul-Kacheln/Grammatik-Sektion" → "Grammatik-Tab zeigt …".
4. Section 14e (~line 938): keep using progress (`#btn-mastercheck` also exists on the Vokabeln tab now - the progress copy stays); reach progress via home + `#stats-row` click instead of the nav button.
5. Section 6 Export (~line 261): runs on the progress screen - insert the same home + `#stats-row` hop before it.
6. Sections that click `[data-mode]` from Home (2b ~193, 3 ~215, 4 ~228, dialog-gating ~352, 14c ~874): prepend a hop to the Vokabeln tab (`data-screen === "vocab"`) before querying `[data-mode]`, and return via `data-screen === "home"` as before. (Home still has tiles until T9; going through vocab now makes these checks stable across T9.)
7. New checks (append after section 5):

```js
  const navInfo = await page.evaluate(() => ({
    n: document.querySelectorAll(".nav-btn").length,
    screens: [...document.querySelectorAll(".nav-btn")].map(b => b.dataset.screen).join(",")
  }));
  check("Nav: 5 Tabs (home,course,vocab,grammar,profile)",
    navInfo.n === 5 && navInfo.screens === "home,course,vocab,grammar,profile", navInfo.screens);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "vocab"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Vokabeln-Tab: Power-Training + Modi + Themen + Mastery-Check + Liste",
    await page.evaluate(() =>
      !!document.querySelector("#cta-power") && document.querySelectorAll("[data-mode]").length === 13 &&
      document.querySelectorAll(".path-row").length >= 20 &&
      !!document.querySelector("#btn-mastercheck") && !!document.querySelector("#btn-vocab")));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Grammatik-Tab: Module nach Level + Lesen-Block",
    await page.evaluate(() =>
      document.querySelectorAll(".module-tile").length >= 20 &&
      !!document.querySelector("#reading-block") && !!document.querySelector("#btn-alefbet") &&
      !!document.querySelector("#btn-reading-path")));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = document.querySelector("#stats-row"); if (s) s.click(); });
  await page.waitForTimeout(350);
  check("Fortschritt: per Statistik-Tipp erreichbar (kein Tab)",
    await page.evaluate(() => !!document.querySelector("#btn-exam")));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
```

Write the new checks and selector updates FIRST, run `node test/regression.cjs`, watch them fail against the old nav; then apply Steps 1-4 and re-run.
Expected after implementation: PASS, every check green.

- [ ] **Step 6: Commit**

```bash
git add app/index.html app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: 5-tab navigation with vocab and grammar tabs, progress via stats tap"
```

---

## Task 6: Reading-Drill-Engine + freier Silben-Trainer [SERIAL, nach T4+T5]

**Files:**
- Modify: `app/app.js` - `startSession` (~line 1971: new branch `"reading"`), `renderSession` dispatch (~line 2210), new renderers (place as new sub-section `11h. Lese-Drills` after `renderSignTask`), `renderGrammar` `#drill-list`, `MODE_TITLES` (+ `reading: "Lesen üben"`), `window.TACHELES_DEBUG` (+ `readingInfo`)
- Modify: `app/styles.css` (`.syl-card`, `.syl-he`, `.blend-row`, `.speed-flash` styles)
- Test: `app/test/regression.cjs` (new section "Lese-Trainer")

**Interfaces:**
- Consumes: `READING` global (T4 data), `sayText` (syllable audio via `"h_"+audioHash(he)`), `say(item)` (whole-word audio), `recordAnswer`/`recordFreeAnswer`, `pickDistractors`.
- Produces: `startSession("reading", { drillId })`; drill task objects `{ kind: "hearPick"|"readPick"|"blend"|"speed", syl?, item? }` (also consumed by the lesson player in T8 via `buildDrillTasks(drill)`); debug `readingInfo()` → `{ drillId, i, total, kind }`.

- [ ] **Step 1: Regression first (failing)**

New section (place after the current section 14g "Lesen lernen"):

```js
  // --- 14g2. Lese-Trainer: Drill spielbar, Silbifizierer, Audio-Keys ---
  const rdAvail = await page.evaluate(() => {
    const R = window.TACHELES_READING;
    return { drills: R ? R.drills.length : 0, syl: R ? R.syllables.length : 0,
      sylOk: window.TACHELES_DEBUG.syllabify("שָׁלוֹם") !== null };
  });
  check("Lese-Trainer: Daten geladen, syllabify(שָׁלוֹם) liefert Silben",
    rdAvail.drills >= 8 && rdAvail.syl >= 120 && rdAvail.sylOk, JSON.stringify(rdAvail));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "grammar"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Lese-Trainer: Drill-Liste im Grammatik-Tab",
    await page.evaluate(() => document.querySelectorAll("[data-drill]").length >= 8));
  const answersBeforeDrill = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
  await page.evaluate(() => { const b = document.querySelector("[data-drill]"); if (b) b.click(); });
  await page.waitForTimeout(450);
  let drillDone = false;
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => ({
      done: !!document.querySelector(".done-screen"),
      info: window.TACHELES_DEBUG.readingInfo(),
      correctText: (document.querySelector("[data-correct-opt]") || {}).textContent || null,
      hasWeiter: !![...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim()))
    }));
    if (st.done) { drillDone = true; break; }
    if (st.hasWeiter) {
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    } else {
      await page.evaluate(() => {
        const right = document.querySelector("[data-correct-opt]");
        const any = document.querySelector(".opt:not(:disabled)");
        (right || any) && (right || any).click();
      });
    }
    await page.waitForTimeout(700);
  }
  check("Lese-Trainer: Level-1-Drill bis zum Abschluss spielbar", drillDone);
  const answersAfterDrill = await page.evaluate(() => JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.answersTotal || 0);
  check("Lese-Trainer: Antworten verbucht", answersAfterDrill > answersBeforeDrill, answersBeforeDrill + "->" + answersAfterDrill);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);
```

(`data-correct-opt` is a deliberate test hook: the drill option renderers set it on the correct button - mirrors the `data-item-id` pattern used elsewhere. It leaks nothing to users; CSS ignores it.)

Run regression: the three new checks FAIL (no drill list, no mode).

- [ ] **Step 2: Implement drill engine**

`startSession` branch (after the `"mastercheck"` branch):

```js
    } else if (modeId === "reading") {
      // Lese-Drill: feste Aufgabenliste aus der Drill-Definition (reading.js).
      var drill = null;
      if (READING) READING.drills.forEach(function (d) { if (d.id === opts.drillId) drill = d; });
      if (!drill) { session = null; toast("Übung nicht gefunden."); return; }
      session.drill = drill;
      session.drillTasks = buildDrillTasks(drill);
      session.i = 0;
      session.label = "👓 " + (drill.title || "Lesen üben");
      if (!session.drillTasks.length) { session = null; toast("Übung ist leer."); return; }
```

`renderSession` gets `if (m === "reading") return renderDrillTask();` before the final `renderTask()`.

New sub-section `11h. Lese-Drills (WS-C)`:

```js
  /** Aufgabenliste eines Drills (auch vom Lektions-Player genutzt, T8). */
  function buildDrillTasks(drill) {
    var tasks = [];
    var types = drill.types || [];
    if (drill.level === 1) {
      (drill.syllables || []).forEach(function (he, i) {
        var syl = null;
        READING.syllables.forEach(function (s) { if (s.he === he) syl = s; });
        if (!syl) return;
        // Typen abwechseln: hoeren->waehlen und sehen->lesen im Wechsel.
        var kind = types[i % types.length] || "hearPick";
        tasks.push({ kind: kind, syl: syl });
      });
    } else {
      (drill.wordIds || []).forEach(function (id, i) {
        var item = itemById(id);
        if (!item || !item.niqqud) return;
        var parts = READING.syllabify(item.niqqud);
        if (!parts) return;
        var kind = types[i % types.length] || (drill.level === 3 ? "speed" : "blend");
        tasks.push({ kind: kind, item: item, parts: parts });
      });
    }
    return tasks;
  }

  /** Distraktor-Silben: gleicher Buchstabe ODER gleicher Vokal zuerst (verwechselbar). */
  function pickSylDistractors(syl, n) {
    var close = READING.syllables.filter(function (s) {
      return s.he !== syl.he && (s.letter === syl.letter || s.vowel === syl.vowel) && s.translit !== syl.translit;
    });
    var rest = READING.syllables.filter(function (s) {
      return s.he !== syl.he && s.translit !== syl.translit && close.indexOf(s) < 0;
    });
    return shuffle(close.slice()).concat(shuffle(rest.slice())).slice(0, n);
  }

  /** Gemeinsames Options-UI der Drills; correctIdx per data-correct-opt markiert (Testhook). */
  function drillOptions(body, labels, correctIdx, isHe, onAnswer) {
    var list = el("div", "opt-list");
    var done = false;
    labels.forEach(function (label, i) {
      var b = el("button", "opt" + (isHe ? " he-opt" : ""), label);
      if (isHe) { b.dir = "rtl"; b.lang = "he"; }
      if (i === correctIdx) b.dataset.correctOpt = "1";
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = i === correctIdx;
        list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
        b.classList.remove("dim");
        b.classList.add(correct ? "correct" : "wrong");
        if (!correct) list.querySelectorAll(".opt")[correctIdx].classList.add("correct");
        onAnswer(correct);
      });
      list.appendChild(b);
    });
    body.appendChild(list);
    setOptKeys(function (e) {
      if (!session) return;
      if (e.key >= "1" && e.key <= "4") {
        var btns = list.querySelectorAll(".opt");
        var t = btns[+e.key - 1];
        if (t && !t.disabled) { e.preventDefault(); t.click(); }
      } else if (e.key === "Enter" || e.key === " ") {
        var cont = body.querySelector('[data-k="cont"]');
        if (cont) { e.preventDefault(); cont.click(); }
      }
    });
    return list;
  }

  function drillNext(body, correct) {
    if (correct) { later(function () { session.i++; renderSession(); }, 900); }
    else {
      var cont = btn("Weiter", "btn primary big", function () { session.i++; renderSession(); });
      cont.dataset.k = "cont";
      body.appendChild(cont);
      cont.focus();
    }
  }

  function renderDrillTask() {
    var s = session;
    var task = s.drillTasks[s.i];
    if (!task) return endSession();
    setOptKeys(null);
    var title = s.label + " · " + (s.i + 1) + "/" + s.drillTasks.length;
    var body = sessionShell(title, s.i / s.drillTasks.length);
    if (task.kind === "hearPick") {
      // Silbe hoeren -> geschriebene Silbe waehlen. Kein Item -> recordFreeAnswer.
      body.appendChild(el("div", "task-question", "Welche Silbe hörst du?"));
      var card = el("div", "card learn-card syl-card");
      var play = btn("🔊", "icon-btn large", function () { sayText(task.syl.he); });
      card.appendChild(play);
      body.appendChild(card);
      sayText(task.syl.he);
      var opts = shuffle([task.syl].concat(pickSylDistractors(task.syl, 3)));
      drillOptions(body, opts.map(function (o) { return o.he; }), opts.indexOf(task.syl), true, function (correct) {
        recordFreeAnswer("mc", correct);
        drillNext(body, correct);
      });
    } else if (task.kind === "readPick") {
      body.appendChild(el("div", "task-question", "Wie liest man das?"));
      var card2 = el("div", "card learn-card syl-card");
      var he = el("div", "syl-he", task.syl.he);
      he.dir = "rtl"; he.lang = "he";
      card2.appendChild(he);
      body.appendChild(card2);
      var opts2 = shuffle([task.syl].concat(pickSylDistractors(task.syl, 3)));
      drillOptions(body, opts2.map(function (o) { return o.translit; }), opts2.indexOf(task.syl), false, function (correct) {
        recordFreeAnswer("mc", correct);
        if (correct) sayText(task.syl.he);
        drillNext(body, correct);
      });
    } else if (task.kind === "blend") {
      renderBlendTask(task, body);
    } else { // speed
      renderSpeedTask(task, body);
    }
  }

  /** Wort zusammenlesen: Silbe fuer Silbe aufdecken, pro Silbe die Lesung waehlen,
   *  am Ende Ganzwort-Audio + eine SRS-Verbuchung (Erkennen he->de). */
  function renderBlendTask(task, body) {
    var item = task.item, parts = task.parts;
    var pos = task.pos || 0;
    body.appendChild(el("div", "task-question", "Lies das Wort Silbe für Silbe:"));
    var card = el("div", "card learn-card syl-card");
    var row = el("div", "blend-row");
    row.dir = "rtl"; row.lang = "he";
    parts.forEach(function (p, i) {
      row.appendChild(el("span", "blend-syl" + (i < pos ? " read" : (i === pos ? " current" : " hidden")), p.he));
    });
    card.appendChild(row);
    body.appendChild(card);
    var cur = parts[pos];
    var distr = shuffle(parts.filter(function (p) { return p.translit !== cur.translit; })
      .concat(pickSylDistractors({ he: cur.he, letter: cur.he.charAt(0), vowel: "", translit: cur.translit }, 3))).slice(0, 3);
    var opts = shuffle([cur].concat(distr));
    drillOptions(body, opts.map(function (o) { return o.translit; }), opts.indexOf(cur), false, function (correct) {
      if (correct) sayText(cur.he);
      task.errs = (task.errs || 0) + (correct ? 0 : 1);
      if (pos + 1 < parts.length) {
        task.pos = pos + 1;
        later(renderSession, correct ? 700 : 1600); // gleiche Aufgabe, naechste Silbe
      } else {
        // Ganzwort: vorlesen + verbuchen (Lesen = Erkennen, deckelt bei 2).
        say(item);
        recordAnswer(item.id, "mc", task.errs ? "again" : "good", "he2de");
        var reveal = el("div", "listen-reveal");
        reveal.appendChild(el("div", "de-prompt", item.translit + " · " + item.de));
        body.appendChild(reveal);
        drillNext(body, !task.errs);
      }
    });
  }

  /** Tempo-Lesen: Wort kurz zeigen, dann Bedeutung waehlen. */
  function renderSpeedTask(task, body) {
    var item = task.item;
    body.appendChild(el("div", "task-question", "Schnell lesen – was heißt das?"));
    var card = el("div", "card learn-card syl-card");
    var flash = el("div", "speed-flash", item.niqqud || item.he);
    flash.dir = "rtl"; flash.lang = "he";
    card.appendChild(flash);
    body.appendChild(card);
    setTimeout(function () { flash.classList.add("gone"); }, 1600); // CSS blendet aus
    var distr = pickDistractors(item, 3);
    var opts = shuffle([item].concat(distr));
    drillOptions(body, opts.map(function (o) { return o.de; }), opts.indexOf(item), false, function (correct) {
      recordAnswer(item.id, "mc", correct ? "good" : "again", "he2de");
      flash.classList.remove("gone"); // Aufloesung wieder zeigen
      drillNext(body, correct);
    });
  }
```

Add to `MODE_TITLES`: `reading: "Lesen üben"`. Add to `TACHELES_DEBUG`:

```js
    readingInfo: function () {
      if (!session || session.mode !== "reading") return null;
      var t = session.drillTasks[session.i];
      return { drillId: session.drill.id, i: session.i, total: session.drillTasks.length, kind: t ? t.kind : null };
    },
```

Guard `endSession`/`sessionInfo`: `sessionInfo` maps over `session.tasks` which is undefined for reading sessions - it already falls back to `[]` (`(session.tasks || [])`), verify and leave.

- [ ] **Step 3: Drill list in the Grammatik tab**

In `renderGrammar`, after `app.innerHTML = …`, fill `#drill-list`:

```js
    var dl = $("#drill-list");
    if (dl && READING && READING.drills.length) {
      dl.innerHTML = '<div class="setting-label" style="margin-top:12px">🔡 Silben-Trainer</div>' +
        READING.drills.map(function (d) {
          var lvl = d.level === 1 ? "Silben" : (d.level === 2 ? "Wörter" : "Tempo");
          return '<div class="setting-row"><div><div class="setting-label">' + esc(d.title) + '</div>' +
            '<div class="setting-sub">Stufe ' + d.level + ' · ' + lvl + '</div></div>' +
            '<button class="btn" data-drill="' + esc(d.id) + '">Üben</button></div>';
        }).join("");
      dl.querySelectorAll("[data-drill]").forEach(function (b) {
        b.addEventListener("click", function () { startSession("reading", { drillId: b.dataset.drill }); });
      });
    }
```

Styles: `.syl-he { font-size: 64px; } .blend-syl.hidden { visibility: hidden; } .blend-syl.current { outline: 2px dashed var(--accent); border-radius: 8px; } .blend-syl.read { opacity: .7; } .speed-flash { font-size: 44px; transition: opacity .3s; } .speed-flash.gone { opacity: 0; }`.

- [ ] **Step 4: Run, pass, commit**

Run: `cd app && node --check app.js && node test/regression.cjs`
Expected: PASS incl. the 4 new Lese-Trainer checks.

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: reading drill engine (hearPick/readPick/blend/speed) and syllable trainer"
```

---

## Task 7: Kurs-Zustand, Quereinstieg, Kurs-Tab-UI [SERIAL, nach T2+T5]

Needs the real curriculum (T2 merged). If T3/T4 are not merged yet that is fine (course validator V7 may warn until T4 lands - merge T4 before running the validator gate here).

**Files:**
- Modify: `app/app.js` - course helpers (extend section `3b. Kurs-Zustand` from T1), replace interim `renderCourse`, `window.TACHELES_DEBUG` (+ `lessonSkippable`, `recommendedEntry`)
- Modify: `app/styles.css` (`.lesson-row` states, `.entry-tag`, `.lesson-preview` overlay)
- Test: `app/test/regression.cjs` (new sections: Kurs-Integrität + Kurs-Tab + Quereinstieg)

**Interfaces:**
- Consumes: C1 data, T1 helpers (`lessonState` etc.), T5 screens.
- Produces: `lessonSkippable(lesson)`, `recommendedEntryLesson()`, `lessonUnlocked(i)`, `nextLesson()`, final `renderCourse()`; lesson rows `[data-lesson]` with classes `done|next|locked|open`; preview overlay with `#btn-lesson-start`; entry overlay with `#btn-entry-ok` / `#btn-entry-first`. T8 consumes `nextLesson()` and starts sessions from `#btn-lesson-start` (this task wires the button to `startSession("lesson", { lessonId })` - until T8 lands that mode shows the "Modul nicht gefunden"-style toast; acceptable mid-branch, T8 follows immediately).

- [ ] **Step 1: Regression first (failing) - Kurs-Integrität + UI + Quereinstieg**

New section (after section 1c "Baender"):

```js
  // --- 1d. Kurs-Integritaet (Vertrag C1, In-Page-Spiegel des Validators) ---
  const course = await page.evaluate(() => {
    const C = window.TACHELES_CONTENT, K = window.TACHELES_COURSE, G = window.TACHELES_GRAMMAR;
    const R = window.TACHELES_READING;
    const itemIds = {}; C.items.forEach(i => itemIds[i.id] = 1);
    const dlg = {}; (C.dialogues || []).forEach(d => dlg[d.id] = 1);
    const gmods = {}; G.modules.forEach(m => gmods[m.id] = m);
    const drills = {}; (R ? R.drills : []).forEach(d => drills[d.id] = 1);
    const assigned = {}; let dup = 0, unknown = 0, badSize = 0, badRef = 0;
    const gramUsed = {};
    K.lessons.forEach(l => {
      const n = (l.newItemIds || []).length;
      if (n < 5 || n > 8) badSize++;
      (l.newItemIds || []).forEach(id => {
        if (!itemIds[id]) { unknown++; return; }
        if (assigned[id]) dup++; assigned[id] = 1;
      });
      if (l.scene && l.scene.dialogueId && !dlg[l.scene.dialogueId]) badRef++;
      if (l.grammar && l.grammar.moduleId) {
        if (!gmods[l.grammar.moduleId]) badRef++;
        else { gramUsed[l.grammar.moduleId] = 1;
          (l.grammar.steps || []).forEach(ix => { if (!(ix >= 0 && ix < gmods[l.grammar.moduleId].steps.length)) badRef++; }); }
      }
      if (l.reading && !drills[l.reading.drill]) badRef++;
    });
    return {
      lessons: K.lessons.length, sections: K.sections.length,
      covered: Object.keys(assigned).length, total: C.items.length,
      dup, unknown, badSize, badRef, gramUsed: Object.keys(gramUsed).length, gmods: G.modules.length
    };
  });
  check("Kurs: >= 95 Lektionen, 16-20 Sektionen", course.lessons >= 95 && course.sections >= 16 && course.sections <= 20,
    course.lessons + "/" + course.sections);
  check("Kurs: Abdeckung vollstaendig + eindeutig (jedes Item genau einmal)",
    course.covered === course.total && course.dup === 0 && course.unknown === 0,
    course.covered + "/" + course.total + " dup=" + course.dup);
  check("Kurs: 5-8 Items pro Lektion, alle Referenzen gueltig", course.badSize === 0 && course.badRef === 0,
    "size=" + course.badSize + " ref=" + course.badRef);
  check("Kurs: alle Grammatik-Module referenziert", course.gramUsed === course.gmods, course.gramUsed + "/" + course.gmods);
```

New section (after the T5 nav checks; state is the seeded "Tag 3" learner):

```js
  // --- Kurs-Tab: Sektionen, Lektions-Zustaende, Vorschau ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "course"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const courseUi = await page.evaluate(() => ({
    rows: document.querySelectorAll("[data-lesson]").length,
    next: document.querySelectorAll(".lesson-row.next").length,
    locked: document.querySelectorAll(".lesson-row.locked").length > 0,
    sections: document.querySelectorAll(".course-section-h").length
  }));
  check("Kurs-Tab: alle Lektionen gelistet, genau eine 'dran', Gesperrte vorhanden",
    courseUi.rows >= 95 && courseUi.next === 1 && courseUi.locked && courseUi.sections >= 16,
    JSON.stringify(courseUi));
  await page.evaluate(() => { const r = document.querySelector(".lesson-row.next"); if (r) r.click(); });
  await page.waitForTimeout(350);
  check("Kurs-Tab: Vorschau-Overlay mit Wortliste + Start",
    await page.evaluate(() =>
      !!document.querySelector(".lesson-preview") && !!document.querySelector("#btn-lesson-start") &&
      document.querySelectorAll(".lesson-preview .done-review-row").length >= 5));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".overlay-actions .btn, .lesson-preview .btn")].find(x => /abbrechen|schließen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(250);

  // --- Quereinstieg: Empfehlung aus Mastery, Bestaetigen markiert fruehere als erledigt ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.course = { lessons: {}, entry: null, snacksSeen: {} };
    s.srs = {};
    // Items der ersten 3 Lektionen auf mastery 2 -> Lektionen 1-3 ueberspringbar.
    const K = window.TACHELES_COURSE;
    K.lessons.slice(0, 3).forEach(l => l.newItemIds.forEach(id => {
      s.srs[id] = { ease: 2.5, intervalDays: 5, dueTs: Date.now() + 86400000, reps: 3, lapses: 0, mastery: 2, lastReviewTs: Date.now() };
    }));
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  const entryRec = await page.evaluate(() => ({
    rec: window.TACHELES_DEBUG.recommendedEntry(),
    fourth: window.TACHELES_COURSE.lessons[3].id,
    skip1: window.TACHELES_DEBUG.lessonSkippable(window.TACHELES_COURSE.lessons[0].id),
    skip4: window.TACHELES_DEBUG.lessonSkippable(window.TACHELES_COURSE.lessons[3].id)
  }));
  check("Quereinstieg: >= 60 % Mastery-2 macht ueberspringbar, Empfehlung = erste nicht-ueberspringbare",
    entryRec.skip1 === true && entryRec.skip4 === false && entryRec.rec === entryRec.fourth, JSON.stringify(entryRec));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "course"); if (b) b.click(); });
  await page.waitForTimeout(450);
  check("Quereinstieg: Overlay beim ersten Kurs-Besuch", await page.evaluate(() =>
    !!document.querySelector("#btn-entry-ok") && !!document.querySelector("#btn-entry-first")));
  await page.evaluate(() => { const b = document.querySelector("#btn-entry-ok"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const entryDone = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const K = window.TACHELES_COURSE;
    return { entry: s.course.entry,
      earlierDone: K.lessons.slice(0, 3).every(l => s.course.lessons[l.id] && s.course.lessons[l.id].done),
      fourthDone: !!(s.course.lessons[K.lessons[3].id] || {}).done };
  });
  check("Quereinstieg: Bestaetigen setzt entry + markiert fruehere als erledigt",
    entryDone.entry === entryRec.fourth && entryDone.earlierDone && entryDone.fourthDone === false,
    JSON.stringify(entryDone));
```

Run regression: new checks FAIL (interim course screen has no lesson rows).

- [ ] **Step 2: Course helpers**

Extend section 3b in app.js:

```js
  /** Ueberspringbar (Quereinstieg): >= 60 % der newItemIds mit Mastery >= 2. */
  function lessonSkippable(lesson) {
    var ids = lesson.newItemIds || [];
    if (!ids.length) return false;
    var known = 0;
    ids.forEach(function (id) { if (getMastery(id) >= 2) known++; });
    return known / ids.length >= 0.6;
  }

  /** Empfohlener Einstieg: erste NICHT ueberspringbare Lektion (sonst die letzte). */
  function recommendedEntryLesson() {
    if (!courseAvailable()) return null;
    for (var i = 0; i < COURSE.lessons.length; i++) {
      if (!lessonSkippable(COURSE.lessons[i])) return COURSE.lessons[i];
    }
    return COURSE.lessons[COURSE.lessons.length - 1];
  }

  /** Linear frei: Lektion 0, alles Erledigte, und die Lektion NACH einer erledigten. */
  function lessonUnlocked(i) {
    if (!courseAvailable() || i < 0 || i >= COURSE.lessons.length) return false;
    if (i === 0) return true;
    if (lessonState(COURSE.lessons[i].id).done) return true;
    return lessonState(COURSE.lessons[i - 1].id).done;
  }

  /** "Deine Lektion": erste offene, nicht erledigte (Weiterlernen-Ziel). */
  function nextLesson() {
    if (!courseAvailable()) return null;
    for (var i = 0; i < COURSE.lessons.length; i++) {
      if (lessonUnlocked(i) && !lessonState(COURSE.lessons[i].id).done) return COURSE.lessons[i];
    }
    return null;
  }

  /** Quereinstieg bestaetigen: alle Lektionen VOR entry als erledigt markieren. */
  function confirmEntry(lessonId) {
    var idx = lessonIndex(lessonId);
    if (idx < 0) return;
    for (var i = 0; i < idx; i++) {
      var e = state.course.lessons[COURSE.lessons[i].id] ||
        (state.course.lessons[COURSE.lessons[i].id] = { done: false, step: 0 });
      e.done = true;
    }
    state.course.entry = lessonId;
    saveState();
  }
```

Debug additions: `lessonSkippable: function (id) { var l = lessonById(id); return l ? lessonSkippable(l) : null; },` and `recommendedEntry: function () { var l = recommendedEntryLesson(); return l ? l.id : null; },`.

- [ ] **Step 3: Final renderCourse**

Replace the interim `renderCourse` completely:

```js
  /** Kurs-Tab (WS-B): Lektionspfad in Sektionen, Zustaende, Vorschau, Quereinstieg. */
  function renderCourse() {
    var app = $("#app");
    if (!courseAvailable()) {
      // Defensiv: ohne course.js bleibt der Tab nutzbar (Hinweis + Ausweich-CTA).
      app.innerHTML = '<header class="brand"><div class="brand-title">Lernen</div></header>' +
        '<section class="card"><p>Der Kurs ist in dieser Installation nicht geladen.</p>' +
        '<button class="btn primary big" id="cta-fallback">▶ Smart-Session</button></section>' + footerLinksHtml();
      $("#cta-fallback").addEventListener("click", function () { startSession("smart"); });
      wireFooterLinks(app);
      return;
    }
    var next = nextLesson();
    var html = '<header class="brand"><div class="brand-title">Lernen</div>' +
      '<div class="brand-sub">dein Kurs: eine Lektion nach der anderen</div></header>';
    if (next) {
      html += '<section class="card goal-card"><div class="setting-label">🎓 Deine Lektion</div>' +
        '<div class="setting-sub">' + esc(next.emoji + " " + next.title) + ' · ' + esc(next.band) + '</div>' +
        '<button class="btn primary big" id="cta-lesson-go">▶ Weiterlernen</button></section>';
    } else {
      html += '<section class="card goal-card"><div class="setting-label">🎉 Kurs komplett!</div>' +
        '<div class="setting-sub">Alle Lektionen erledigt – im Vokabeln-Tab bleibt es frisch.</div></section>';
    }
    COURSE.sections.forEach(function (sec) {
      var lessons = COURSE.lessons.filter(function (l) { return l.section === sec.id; });
      if (!lessons.length) return;
      var done = lessons.filter(function (l) { return lessonState(l.id).done; }).length;
      html += '<h2 class="h2 course-section-h">' + esc(sec.emoji) + ' ' + esc(sec.title) +
        ' <span class="h2-sub">· ' + esc(sec.band) + ' · ' + done + '/' + lessons.length + '</span></h2>' +
        '<div class="theme-list">' +
        lessons.map(function (l) {
          var i = lessonIndex(l.id);
          var st = lessonState(l.id);
          var isNext = next && l.id === next.id;
          var locked = !lessonUnlocked(i);
          var cls = st.done ? "done" : (isNext ? "next" : (locked ? "locked" : "open"));
          var mark = st.done ? "✓" : (isNext ? "▶" : (locked ? "🔒" : ""));
          var resume = !st.done && st.step > 0 ? ' · fortsetzen ab Schritt ' + (st.step + 1) : '';
          var entryTag = state.course.entry === l.id ? ' <span class="entry-tag">dein Einstieg</span>' : '';
          return '<div class="theme-row lesson-row ' + cls + '" role="button" tabindex="0" data-lesson="' + esc(l.id) + '"' +
            (locked ? ' aria-disabled="true"' : '') + '>' +
            '<span class="path-status">' + mark + '</span>' +
            '<span class="theme-emoji">' + esc(l.emoji) + '</span>' +
            '<div class="theme-info"><div class="theme-title">' + esc(l.title) + entryTag + '</div>' +
            '<div class="setting-sub">' + l.newItemIds.length + ' neue Wörter' + resume + '</div></div>' +
            '</div>';
        }).join("") + '</div>';
    });
    app.innerHTML = html + footerLinksHtml();
    var go = $("#cta-lesson-go");
    if (go && next) go.addEventListener("click", function () { startSession("lesson", { lessonId: next.id }); });
    app.querySelectorAll("[data-lesson]").forEach(function (row) {
      var act = function () {
        var l = lessonById(row.dataset.lesson);
        if (!l) return;
        if (!lessonUnlocked(lessonIndex(l.id))) {
          toast("🔒 Erst die Lektion davor abschließen – der Kurs ist ein Pfad.");
          return;
        }
        showLessonPreview(l);
      };
      row.addEventListener("click", act);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); }
      });
    });
    wireFooterLinks(app);
    maybeOfferEntry();
  }

  /** Vorschau-Overlay: Woerter der Lektion + Grammatikpunkt + Start. */
  function showLessonPreview(lesson) {
    var o = buildOverlay(lesson.emoji + " " + lesson.title);
    o.box.classList.add("lesson-preview");
    var st = lessonState(lesson.id);
    var list = el("div", "done-review");
    lesson.newItemIds.forEach(function (id) {
      var item = itemById(id);
      if (!item) return;
      var row = el("div", "done-review-row");
      var he = el("span", "done-review-he", item.he);
      he.dir = "rtl"; he.lang = "he";
      row.appendChild(he);
      row.appendChild(el("span", "done-review-de", item.de));
      var p = btn("🔊", "icon-btn small-btn", function () { say(item); });
      row.appendChild(p);
      list.appendChild(row);
    });
    o.box.appendChild(list);
    if (lesson.grammar && lesson.grammar.moduleId) {
      var gm = moduleById(lesson.grammar.moduleId);
      if (gm) o.box.appendChild(el("div", "setting-sub", "🧠 Grammatik: " + gm.title));
    }
    if (st.done) o.box.appendChild(el("div", "setting-sub", "✓ Schon erledigt – nochmal spielen setzt nichts zurück."));
    var actions = el("div", "overlay-actions");
    var startBtn = btn(st.step > 0 && !st.done ? "▶ Fortsetzen" : "▶ Lektion starten", "btn primary big", function () {
      o.close();
      startSession("lesson", { lessonId: lesson.id });
    });
    startBtn.id = "btn-lesson-start";
    actions.appendChild(startBtn);
    actions.appendChild(btn("Abbrechen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }

  /** Quereinstieg (WS-B): beim ersten Kurs-Besuch mit Vorkenntnissen anbieten. */
  function maybeOfferEntry() {
    if (!courseAvailable() || state.course.entry) return;
    var anyDone = Object.keys(state.course.lessons).some(function (id) { return state.course.lessons[id].done; });
    if (anyDone) return;
    var rec = recommendedEntryLesson();
    if (!rec || lessonIndex(rec.id) === 0) return; // Anfaenger: kein Overlay noetig
    var o = buildOverlay("🎯 Wo steigst du ein?");
    o.box.appendChild(el("div", "overlay-text",
      "Du kannst schon einiges! Die ersten " + lessonIndex(rec.id) + " Lektionen sitzen bei dir zu großen Teilen. " +
      "Empfehlung: starte bei „" + rec.emoji + " " + rec.title + "“. Übersprungene Lektionen werden als erledigt " +
      "markiert – du kannst sie jederzeit nachholen."));
    var actions = el("div", "overlay-actions");
    var ok = btn("Ab „" + rec.title + "“ starten", "btn primary big", function () {
      confirmEntry(rec.id);
      o.close();
      renderCourse();
      toast("🎯 Einstieg gesetzt. Frühere Lektionen gelten als erledigt.");
    });
    ok.id = "btn-entry-ok";
    var first = btn("Ganz vorn anfangen", "btn ghost big", function () {
      state.course.entry = COURSE.lessons[0].id; // Entscheidung merken: kein erneutes Overlay
      saveState();
      o.close();
    });
    first.id = "btn-entry-first";
    actions.appendChild(ok);
    actions.appendChild(first);
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }
```

Styles: `.lesson-row.done .path-status { color: var(--ok); } .lesson-row.locked { opacity: .55; } .lesson-row.next { border-color: var(--accent); } .entry-tag { font-size: 11px; color: var(--accent); } .lesson-preview { max-height: 80vh; overflow-y: auto; }`.

- [ ] **Step 4: Validate + run + commit**

Run: `node tools/validate-course.cjs && cd app && node --check app.js && node test/regression.cjs`
Expected: validator PASS; regression PASS except any check that needs the lesson PLAYER (none yet - the preview check closes via Abbrechen). All new checks green.

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: course tab with sections, lesson states, preview, lateral entry"
```

---

## Task 8: Lektions-Player - Session-Modus "lesson" mit 8-Schritt-Bogen [SERIAL, nach T6+T7]

**Files:**
- Modify: `app/app.js` - `startSession` (new branch), `renderSession` dispatch, new section `16b. Lektions-Player` (place after the module runner, section 16), `moduleStepNext` (generalize), `endSession`/`renderDone` (lesson recap CTA), `MODE_TITLES` (+ `lesson: "Lektion"`, `snack: "Häppchen"`), `renderModuleTeach`/`renderModuleExplain`/`renderModuleCloze`/`renderModuleForm` (no changes needed - they read `session.steps`/`session.stepIdx`; verify), `window.TACHELES_DEBUG` (+ `lessonStepLabel`)
- Modify: `app/styles.css` (`.arc-tag` step label)
- Test: `app/test/regression.cjs` (new section: Player E2E, Resume, Quiz-Scope, Erstkontakt)

**Interfaces:**
- Consumes: T7 helpers, T6 `buildDrillTasks` + drill renderers, module-runner renderers (section 16), `recordAnswer`/`recordFreeAnswer`, `sayText`, `unlockedDialogues` data (`CONTENT.dialogues`), `pickDistractors`, `moduleOptionButtons`, `moduleFillDistractors`, `STT.available()`.
- Produces: `startSession("lesson", { lessonId })` with resume; arc labels `["Aufwärmen ↺","Szene 🎬","Neue Wörter ✨","Grammatik 🧠","Lesen 👓","Hören 👂","Quiz 🏁"]`; `session.lesson`, `session.steps` (module-runner compatible plus new step types `scene | sceneQuiz | task | drill`), `session.arcBounds` (arc index per step). `renderDone` recap with `#btn-next-lesson`.

- [ ] **Step 1: Regression first (failing)**

New section (seed a FRESH state first: `s.srs = {}; s.course = { lessons: {}, entry: null, snacksSeen: {} }`, reload):

```js
  // --- Lektions-Player: Bogen, Quiz-Scope, Resume, Erstkontakt ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "course"); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector("#btn-entry-first"); if (b) b.click(); }); // etwaiges Einstiegs-Overlay weg
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = document.querySelector("#cta-lesson-go"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const l1 = await page.evaluate(() => ({
    id: window.TACHELES_COURSE.lessons[0].id,
    label: window.TACHELES_DEBUG.lessonStepLabel(),
    title: (document.querySelector(".session-title") || {}).textContent || ""
  }));
  check("Player: Lektion 1 startet (frischer Nutzer: kein Aufwaermen, Szene/Woerter zuerst)",
    /Lektion/.test(l1.title) && l1.label !== "Aufwärmen ↺" && !!l1.label, JSON.stringify(l1));
  // Bogen durchspielen: bis zu 80 Interaktionen, immer richtig antworten.
  const seenArcs = new Set();
  let recapReached = false;
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => ({
      done: !!document.querySelector(".done-screen"),
      label: window.TACHELES_DEBUG.lessonStepLabel(),
      hasWeiter: !![...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim())),
      correctItem: window.TACHELES_DEBUG.currentTaskItem(),
      correctHe: window.TACHELES_DEBUG.moduleCurrentCorrect(),
      hasCorrectOpt: !!document.querySelector("[data-correct-opt]"),
      hasOpt: !!document.querySelector(".opt:not(:disabled)")
    }));
    if (st.done) { recapReached = true; break; }
    if (st.label) seenArcs.add(st.label);
    await page.evaluate(() => {
      // Reihenfolge: erst Weiter-artige Knoepfe, dann korrekte Option (Testhooks), dann irgendeine.
      const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (w) { w.click(); return; }
      const byHook = document.querySelector("[data-correct-opt]");
      if (byHook) { byHook.click(); return; }
      const id = window.TACHELES_DEBUG.currentTaskItem();
      const byId = id && document.querySelector('.opt[data-item-id="' + id + '"]');
      if (byId) { byId.click(); return; }
      const he = window.TACHELES_DEBUG.moduleCurrentCorrect();
      if (he) {
        const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
        const right = btns.find(b => (b.querySelector(".b-he") || {}).textContent === he);
        if (right) { right.click(); return; }
      }
      const any = document.querySelector(".opt:not(:disabled)");
      if (any) any.click();
      const grade = [...document.querySelectorAll(".grade-btn")].find(x => /gut/i.test(x.textContent));
      if (grade) grade.click();
      const self = [...document.querySelectorAll("button")].find(x => /konnte ich/i.test(x.textContent));
      if (self) self.click();
    });
    await page.waitForTimeout(900);
  }
  check("Player: Bogen erreicht Rueckblick (done-screen)", recapReached, [...seenArcs].join("|"));
  check("Player: Szene, neue Woerter, Hoeren und Quiz kamen vor",
    seenArcs.has("Szene 🎬") && seenArcs.has("Neue Wörter ✨") && seenArcs.has("Hören 👂") && seenArcs.has("Quiz 🏁"),
    [...seenArcs].join("|"));
  const afterL1 = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const K = window.TACHELES_COURSE;
    return { done: (s.course.lessons[K.lessons[0].id] || {}).done,
      nextBtn: !!document.querySelector("#btn-next-lesson") };
  });
  check("Player: Lektion als erledigt markiert + Naechste-Lektion-CTA", afterL1.done === true && afterL1.nextBtn,
    JSON.stringify(afterL1));
  // Resume: Lektion 2 starten, 2 Schritte machen, abbrechen -> step gespeichert.
  await page.evaluate(() => { const b = document.querySelector("#btn-next-lesson"); if (b) b.click(); });
  await page.waitForTimeout(500);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const w = [...document.querySelectorAll("button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (w) { w.click(); return; }
      const o = document.querySelector("[data-correct-opt]") || document.querySelector(".opt:not(:disabled)");
      if (o) o.click();
    });
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
  const resume = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const l2 = window.TACHELES_COURSE.lessons[1].id;
    return { step: (s.course.lessons[l2] || {}).step || 0, done: (s.course.lessons[l2] || {}).done };
  });
  check("Player: Abbruch merkt den Schritt (Resume), Lektion nicht erledigt",
    resume.step >= 1 && resume.done !== true, JSON.stringify(resume));
```

Also add a quiz-scope assertion INSIDE the walk loop replacing the plain loop above if desired - simpler dedicated check right after "Bogen erreicht Rueckblick": during the walk collect quiz item ids via debug and assert subset of lesson 1 `newItemIds`:

```js
  // (im Walk-Loop mitschreiben:)
  //   if (st.label === "Quiz 🏁" && st.correctItem) quizIds.add(st.correctItem);
  // (nach dem Loop:)
  const quizScope = await page.evaluate((ids) => {
    const lesson = window.TACHELES_COURSE.lessons[0];
    return ids.every(id => lesson.newItemIds.indexOf(id) >= 0);
  }, [...quizIds]);
  check("Player: Quiz fragt NUR Lektionswoerter", quizScope, [...quizIds].join(","));
```

Run regression: all new checks FAIL (mode "lesson" missing).

- [ ] **Step 2: Build the step list**

New section `16b. Lektions-Player (WS-B)` in app.js:

```js
  var LESSON_ARCS = ["Aufwärmen ↺", "Szene 🎬", "Neue Wörter ✨", "Grammatik 🧠", "Lesen 👓", "Hören 👂", "Quiz 🏁"];

  /** Baut den 8-Schritt-Bogen einer Lektion als flache Schrittliste.
   *  Jeder Schritt traegt arc (Index in LESSON_ARCS) fuer die sichtbare Beschriftung. */
  function buildLessonSteps(lesson) {
    var steps = [];
    var idx = lessonIndex(lesson.id);
    var now = Date.now();
    // 1. Aufwaermen: 2-3 Abrufaufgaben aus FRUEHEREN Lektionen, faellige SRS zuerst.
    var earlier = [];
    for (var i = 0; i < idx; i++) earlier = earlier.concat(COURSE.lessons[i].newItemIds);
    var pool = earlier.map(itemById).filter(function (it) { return it && !isNew(it.id); });
    var due = pool.filter(function (it) { return isDue(it.id, now); });
    var warm = shuffle(due.slice()).concat(shuffle(pool.filter(function (it) { return !isDue(it.id, now); }))).slice(0, 3);
    warm.forEach(function (it, w) {
      steps.push({ arc: 0, type: "task", item: it, kind: "mc", dir: w % 2 === 0 ? "he2de" : "de2he" });
    });
    // 2. Szene: Zeilen mit Audio + 1 Verstaendnisfrage.
    var lines = null;
    if (lesson.scene && lesson.scene.dialogueId) {
      var d = null;
      (CONTENT.dialogues || []).forEach(function (x) { if (x.id === lesson.scene.dialogueId) d = x; });
      if (d) lines = d.lines;
    } else if (lesson.scene && lesson.scene.lines) {
      lines = lesson.scene.lines;
    }
    if (lines && lines.length >= 2) {
      steps.push({ arc: 1, type: "scene", lines: lines });
      steps.push({ arc: 1, type: "sceneQuiz", lines: lines });
    }
    // 3. Neue Woerter: teach-Karten (markieren introducedThisSession, 1.1).
    lesson.newItemIds.forEach(function (id) {
      steps.push({ arc: 2, type: "teach", itemId: id });
    });
    // 4. Grammatik: referenzierte Modul-Schritte oder inline.
    if (lesson.grammar) {
      var gsteps = [];
      if (lesson.grammar.moduleId) {
        var gm = moduleById(lesson.grammar.moduleId);
        if (gm) (lesson.grammar.steps || []).forEach(function (ix) { if (gm.steps[ix]) gsteps.push(gm.steps[ix]); });
      } else if (lesson.grammar.inline) {
        gsteps = lesson.grammar.inline;
      }
      gsteps.forEach(function (g) { steps.push({ arc: 3, type: g.type, gstep: g }); });
    }
    // 5. Lesen: Drill-Aufgaben inline (fruehe Lektionen).
    if (lesson.reading && READING) {
      var drill = null;
      READING.drills.forEach(function (d) { if (d.id === lesson.reading.drill) drill = d; });
      if (drill) buildDrillTasks(drill).forEach(function (t) { steps.push({ arc: 4, type: "drill", task: t }); });
    }
    // 6. Hoeren: 2-3 audio2de ueber die Lektionswoerter (nur Ohr).
    if (lesson.listening !== false) {
      shuffle(lesson.newItemIds.slice()).slice(0, 3).forEach(function (id) {
        var it = itemById(id);
        if (it) steps.push({ arc: 5, type: "task", item: it, kind: "mc", dir: "audio2de" });
      });
    }
    // 7. Quiz: dynamisch NUR ueber diese Lektion - moeglichst viele Wege.
    var quizItems = shuffle(lesson.newItemIds.map(itemById).filter(Boolean));
    quizItems.forEach(function (it, q) {
      var dirs = ["he2de", "de2he"]; // Erkennen + Produzieren im Wechsel
      var dir = dirs[q % 2];
      if (it.type === "sentence" && it.tokens && it.tokens.length >= 2 && q % 3 === 2) {
        steps.push({ arc: 6, type: "task", item: it, kind: "build", dir: null });
      } else {
        steps.push({ arc: 6, type: "task", item: it, kind: "mc", dir: dir });
      }
      // Jedes 3. Wort zusaetzlich hoeren; Sprechen, wenn Mikro da (ueberspringbar im Renderer).
      if (q % 3 === 0) steps.push({ arc: 6, type: "task", item: it, kind: "mc", dir: "audio2de" });
      else if (STT.available() && q % 3 === 1 && it.type !== "letter") {
        steps.push({ arc: 6, type: "task", item: it, kind: "speak", dir: null });
      }
    });
    return steps;
  }
```

- [ ] **Step 3: startSession branch + dispatch + renderers**

`startSession` (after the `"reading"` branch):

```js
    } else if (modeId === "lesson") {
      var lesson = lessonById(opts.lessonId);
      if (!lesson) { session = null; toast("Lektion nicht gefunden."); return; }
      session.lesson = lesson;
      session.steps = buildLessonSteps(lesson);
      var saved = lessonState(lesson.id);
      session.stepIdx = (!saved.done && saved.step > 0 && saved.step < session.steps.length) ? saved.step : 0;
      session.label = lesson.emoji + " " + lesson.title;
      if (!session.steps.length) { session = null; toast("Lektion ist leer."); return; }
```

`renderSession`: `if (m === "lesson") return renderLessonStep();` (before the module branch).

Generalize `moduleStepNext` so the module renderers work unchanged inside lessons AND persist resume:

```js
  function moduleStepNext() {
    if (!session) return;
    session.stepIdx++;
    if (session.mode === "lesson" && session.lesson) setLessonStep(session.lesson.id, session.stepIdx);
    renderSession(); // renderSession verzweigt nach mode (lesson|module|snack)
  }
```

(The module runner's `renderModuleStep` is untouched; lesson steps route through `renderLessonStep`.)

```js
  function renderLessonStep() {
    var s = session;
    if (!s) return;
    var step = s.steps[s.stepIdx];
    if (!step) {
      markLessonDone(s.lesson.id);
      return endSession();
    }
    setOptKeys(null);
    var arcLabel = LESSON_ARCS[step.arc] || "";
    var title = s.label + " · " + (s.stepIdx + 1) + "/" + s.steps.length + " · " + arcLabel;
    if (step.type === "teach") return renderModuleTeach({ type: "teach", itemId: step.itemId }, title);
    if (step.type === "explain") return renderModuleExplain(step.gstep, title);
    if (step.type === "cloze") return renderModuleCloze(step.gstep, title);
    if (step.type === "form") return renderModuleForm(step.gstep, title);
    if (step.type === "quiz") return renderModuleQuiz(step.gstep, title);
    if (step.type === "pairquiz") return renderModulePairQuiz(step.gstep, title);
    if (step.type === "scene") return renderLessonScene(step, title);
    if (step.type === "sceneQuiz") return renderLessonSceneQuiz(step, title);
    if (step.type === "drill") return renderLessonDrill(step, title);
    return renderLessonTask(step, title); // type "task"
  }
```

WICHTIG (module renderer compatibility): `renderModuleTeach`/`renderModuleExplain`/`renderModuleCloze`/`renderModuleForm`/`renderModuleQuiz`/`renderModulePairQuiz` compute their progress bar from `session.stepIdx / session.steps.length` and advance via `moduleStepNext` - both hold for lesson sessions, no edits needed. `renderModuleStep`'s completion counter (`modulesDone`) is NOT touched by lessons because lessons never enter `renderModuleStep`.

The three new renderers:

```js
  /** Szene 🎬: Zeilen als Chat mit Audio, Weiter-Knopf. */
  function renderLessonScene(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    var xpEl = $(".session-xp"); if (xpEl) xpEl.textContent = ""; // kein Abruf, keine XP
    body.appendChild(el("div", "task-question", "Hör dir die Szene an:"));
    var chat = el("div", "chat");
    step.lines.forEach(function (l) { chat.appendChild(dialogueBubble(l)); });
    body.appendChild(chat);
    if (state.profile.autoplay && step.lines[0]) sayText(step.lines[0].he);
    moduleContinueBtn(body);
  }

  /** Szene-Verstaendnisfrage: 1 MC ueber eine Zeile (de-Bedeutung). */
  function renderLessonSceneQuiz(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    var lines = step.lines;
    var target = lines[dayHash(session.lesson.id + "|scene") % lines.length];
    body.appendChild(el("div", "task-question", "Was bedeutet diese Zeile?"));
    var card = el("div", "card learn-card");
    var he = el("div", "he-text big", target.he);
    he.dir = "rtl"; he.lang = "he";
    card.appendChild(he);
    card.appendChild(el("div", "translit", target.translit || ""));
    var play = btn("🔊", "icon-btn", function () { sayText(target.he); });
    card.appendChild(play);
    body.appendChild(card);
    var distr = shuffle(lines.filter(function (l) { return l.de !== target.de; })).slice(0, 3);
    var opts = shuffle([target].concat(distr));
    drillOptions(body, opts.map(function (o) { return o.de; }), opts.indexOf(target), false, function (correct) {
      // Zeile kann ein Item referenzieren (Dialog-Szenen) -> dann SRS, sonst frei.
      if (target.itemId && itemById(target.itemId)) recordAnswer(target.itemId, "dialog", correct ? "good" : "again");
      else recordFreeAnswer("dialog", correct);
      drillNextLesson(body, correct);
    });
  }

  /** Drill-Schritt im Bogen: delegiert an die T6-Renderer auf einem Einzel-Task. */
  function renderLessonDrill(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    // T6-Renderer erwarten session.drillTasks/session.i - hier 1 Task "inline" rendern:
    // renderDrillTask in T6 dafuer parametrisieren: renderDrillTaskInto(task, body, onDone).
    renderDrillTaskInto(step.task, body, function () { moduleStepNext(); });
  }

  /** Weiter-Logik der Lesson-Zwischenschritte (wie drillNext, aber moduleStepNext). */
  function drillNextLesson(body, correct) {
    if (correct) { later(moduleStepNext, 900); }
    else {
      var cont = btn("Weiter", "btn primary big", moduleStepNext);
      cont.dataset.k = "cont";
      body.appendChild(cont);
      cont.focus();
    }
  }

  /** Aufgaben-Schritt (mc/build/speak) auf einem Einzel-Item, Modul-Runner-Stil. */
  function renderLessonTask(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    var item = step.item;
    if (step.kind === "build" && item.tokens && item.tokens.length >= 2) {
      return renderLessonBuild(step, body); // duenner Wrapper um die renderBuild-Logik (unten)
    }
    if (step.kind === "speak") {
      // Sprechen im Quiz: optional ueberspringbar (Spec: "optional ueberspringbar").
      body.appendChild(el("div", "task-question", "Sag das laut auf Hebräisch:"));
      var card = el("div", "card learn-card");
      card.appendChild(el("div", "de-prompt", item.de));
      card.appendChild(heEl(item, { big: true, showHint: true }));
      card.appendChild(speakRow(item, true));
      body.appendChild(card);
      var self = el("div", "self-grade-row");
      self.appendChild(btn("✓ Konnte ich", "btn", function () {
        recordAnswer(item.id, "speak", "good");
        later(moduleStepNext, 700);
      }));
      self.appendChild(btn("✗ Noch nicht", "btn ghost", function () {
        recordAnswer(item.id, "speak", "again");
        later(moduleStepNext, 500);
      }));
      self.appendChild(btn("⏭ Überspringen", "btn ghost", function () { moduleStepNext(); }));
      body.appendChild(self);
      return;
    }
    // mc (he2de | de2he | audio2de) mit Distraktoren bevorzugt aus der Lektion:
    var lessonDistr = (session.lesson.newItemIds || [])
      .map(itemById).filter(function (x) { return x && x.id !== item.id; });
    var distr = [];
    var seenDe = {}, seenHe = {};
    seenDe[item.de] = true; seenHe[item.he] = true;
    shuffle(lessonDistr.slice()).forEach(function (x) {
      if (distr.length >= 3 || seenDe[x.de] || seenHe[x.he]) return;
      seenDe[x.de] = true; seenHe[x.he] = true; distr.push(x);
    });
    pickDistractors(item, 3).forEach(function (x) {
      if (distr.length >= 3 || seenDe[x.de] || seenHe[x.he]) return;
      seenDe[x.de] = true; seenHe[x.he] = true; distr.push(x);
    });
    var card2 = el("div", "card learn-card");
    if (step.dir === "he2de") {
      body.appendChild(el("div", "task-question", "Was bedeutet das?"));
      card2.appendChild(heEl(item, { big: true, showHint: true, quiz: true }));
      card2.appendChild(speakRow(item));
    } else if (step.dir === "de2he") {
      body.appendChild(el("div", "task-question", "Wie heißt das auf Hebräisch?"));
      card2.appendChild(el("div", "de-prompt", item.de));
      if (item.note) card2.appendChild(el("div", "note-line", "(" + item.note + ")"));
    } else { // audio2de - nur Ohr
      body.appendChild(el("div", "task-question", "Was hörst du?"));
      var play = btn("🔊", "icon-btn large", function () { say(item); });
      card2.appendChild(play);
      say(item);
    }
    body.appendChild(card2);
    var opts = shuffle([item].concat(distr));
    var isHe = step.dir === "de2he";
    drillOptions(body,
      opts.map(function (o) { return isHe ? heOptionText(o) : o.de; }),
      opts.indexOf(item), isHe, function (correct) {
        recordAnswer(item.id, "mc", correct ? "good" : "again", step.dir);
        if (step.dir === "audio2de") {
          var reveal = el("div", "listen-reveal");
          reveal.appendChild(heEl(item, {}));
          card2.appendChild(reveal);
        }
        drillNextLesson(body, correct);
      });
    // Testhook fuer den Walk: currentTaskItem soll das Lektions-Item liefern (unten, Debug).
  }
```

`renderLessonBuild(step, body)`: copy the token-tile logic of `renderBuild` (lines 2434-2499) operating on `step.item`, but `recordAnswer(item.id, "build", correct ? "good" : "again")` and `later(moduleStepNext, …)` instead of `nextTask` - a 30-line adaptation; do not call `renderBuild` itself (it reads `session.tasks`).

T6 refactor required here: split `renderDrillTask` into `renderDrillTask()` (reading mode: computes task/title/shell, then calls the shared part) and `renderDrillTaskInto(task, body, onDone)` (shared rendering; `drillNext` and the blend/speed "advance" paths call `onDone` instead of `session.i++` directly). Do this refactor inside THIS task, keep T6's regression checks green.

Debug additions:

```js
    lessonStepLabel: function () {
      if (!session || session.mode !== "lesson") return null;
      var st = session.steps[session.stepIdx];
      return st ? (LESSON_ARCS[st.arc] || "") : null;
    },
```

and extend the existing `currentTaskItem` to also serve lesson task steps:

```js
    currentTaskItem: function () {
      if (session && session.mode === "lesson") {
        var st = session.steps[session.stepIdx];
        return st && st.item ? st.item.id : (st && st.itemId ? st.itemId : null);
      }
      if (!session || !session.tasks) return null;
      var t = session.tasks[session.i];
      return t ? t.item.id : null;
    },
```

`moduleCurrentCorrect` similarly: when `session.mode === "lesson"` and the current step has `gstep.options`, read those.

- [ ] **Step 4: Recap CTA in renderDone**

`endSession` (~line 3504): before `session = null`, capture `var lessonRef = session.lesson || null; if (lessonRef) stats.lesson = { id: lessonRef.id, title: lessonRef.title };`. In `renderDone`, after the "Was jetzt?" block:

```js
    if (stats.lesson && courseAvailable()) {
      var nl = nextLesson();
      if (nl) {
        var row = el("div", "done-next", "Als Nächstes: " + nl.emoji + " " + nl.title);
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.id = "btn-next-lesson";
        row.addEventListener("click", function () { startSession("lesson", { lessonId: nl.id }); });
        wrap.appendChild(row);
      }
    }
```

Suppress the theme-recommendation row for lesson sessions (`if (rec && !stats.exam && !stats.lesson)`) - one CTA, not two.

Erstkontakt-Regel: nothing to do - `renderModuleTeach` already marks `introducedThisSession` for new items, and lesson quiz answers run through `recordAnswer`, so the first retrieval of a freshly taught word does not raise mastery. The regression Erstkontakt check for lessons: after the L1 walk, assert `getMastery` of a lesson-1 item is <= 2 (production later raises it) - add as one check in Step 1's section if not already covered by the global 14c tests (keep it: one line, cheap).

- [ ] **Step 5: Run + commit**

Run: `cd app && node --check app.js && node test/regression.cjs`
Expected: PASS incl. the player section (~7 new checks) and the untouched T6 drill checks.

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: lesson player - 8-step arc with resume, lesson-scoped quiz"
```

---

## Task 9: Home-Umbau - Snack-Heute-Block, Kurs-Karte, Statistik → Fortschritt [SERIAL, nach T3+T8]

**Files:**
- Modify: `app/app.js` - `renderHome` (~line 1531, rewrite), new `dailySnack()` + `startSession("snack", …)` branch, `renderProfile` (snackVocab-Schalter), `renderModuleStep` completion hook (snack → `snacksSeen`), `window.TACHELES_DEBUG` (+ `dailySnackId`)
- Modify: `app/styles.css` (`.snack-card`)
- Test: `app/test/regression.cjs` (Home selectors update + new Heute/Snack section; sections listed in Step 4)

**Interfaces:**
- Consumes: `SNACKS` (T3), `dayHash`/`todayStr`, module runner (snack steps reuse it), `nextLesson()` (T7), `buildQueue` (vocab tail).
- Produces: `dailySnack()`; Home ids `#btn-snack` (Snack-Start, id bleibt), `#cta-lesson` (Kurs-CTA, primärer Knopf), `#stats-row` (T5); Profil-Schalter `#snackvocab-chk`; debug `dailySnackId()`.

- [ ] **Step 1: dailySnack + Snack-Session**

New sub-section `10b. Wissens-Häppchen (WS-D)` near `dailyPicks`:

```js
  /** Snack des Tages: deterministisch (dayHash), Ungesehenes zuerst, Band-gated. */
  function dailySnack() {
    if (!SNACKS || !SNACKS.snacks.length) return null;
    var pool = SNACKS.snacks.filter(function (s) { return bandUnlocked(s.band || "A0"); });
    if (!pool.length) pool = SNACKS.snacks;
    var unseen = pool.filter(function (s) { return !state.course.snacksSeen[s.id]; });
    var pick = unseen.length ? unseen : pool; // alles gesehen: von vorn rotieren
    return pick[dayHash(todayStr() + "|snack") % pick.length];
  }

  function snackById(id) {
    if (!SNACKS) return null;
    for (var i = 0; i < SNACKS.snacks.length; i++) if (SNACKS.snacks[i].id === id) return SNACKS.snacks[i];
    return null;
  }
```

`startSession` branch (after `"lesson"`): snacks run on the MODULE runner (steps are module steps) with an optional due-vocab tail:

```js
    } else if (modeId === "snack") {
      var snack = snackById(opts.snackId);
      if (!snack) { session = null; toast("Häppchen nicht gefunden."); return; }
      var ssteps = snack.steps.slice();
      if (opts.withVocab) {
        // Vokabel-Anhang (Profil-Schalter): 2-3 faellige Woerter als quiz-Schritte.
        buildQueue(3, {}).filter(function (it) { return isDue(it.id, Date.now()); })
          .slice(0, 3).forEach(function (it) { ssteps.push({ type: "quiz", itemId: it.id }); });
      }
      session.module = { id: snack.id, title: snack.title, emoji: snack.emoji, steps: ssteps };
      session.steps = ssteps;
      session.stepIdx = 0;
      session.snackId = snack.id;
      session.label = snack.emoji + " " + snack.title;
```

`renderSession`: route `"snack"` to `renderModuleStep` (`if (m === "module" || m === "snack") return renderModuleStep();`). In `renderModuleStep`'s completion branch (before `endSession()`), add:

```js
      if (session.snackId) {
        state.course.snacksSeen[session.snackId] = true; // Rotation: als gesehen markieren
        saveState();
      }
```

(`moduleById(s.module.id)` stays the guard for `modulesDone` - snack ids are not in CONTENT.modules, so no phantom counter. Verify.)

Add `MODE_TITLES.snack = "Häppchen"`. Debug: `dailySnackId: function () { var s = dailySnack(); return s ? s.id : null; },`.

- [ ] **Step 2: renderHome rewrite**

Replace the body of `renderHome` - keep: brand header, stats row (tappable, T5), goal card WITHOUT its big CTA, footer. Remove: mode grid, theme list, next-card, old `#btn-snack`/`#btn-reading` actions. New order and content:

```js
  function renderHome() {
    var app = $("#app");
    var g = state.gamification;
    var today = todayLog();
    var goal = goalItems();
    var pct = Math.min(100, Math.round(today.answers / goal * 100));
    var snack = dailySnack();
    var lesson = nextLesson();
    var picks = dailyPicks();
    var tile = function (item, label) {
      if (!item) return "";
      return '<div class="today-tile" role="button" tabindex="0" data-today="' + esc(item.id) + '">' +
        '<div class="today-label">' + label + '</div>' +
        '<div class="today-he" dir="rtl" lang="he">' + esc(item.niqqud || item.he) + '</div>' +
        '<div class="today-meta">' + esc(item.translit || "") + ' · ' + esc(item.de) + '</div>' +
        '<button class="icon-btn small-btn" data-say="' + esc(item.id) + '" title="Anhören">🔊</button></div>';
    };
    app.innerHTML =
      '<header class="brand"><div class="brand-title">🕊️ Tacheles</div>' +
      '<div class="brand-sub">dein Schalömchen</div></header>' +
      '<section class="stats-row tappable" id="stats-row" role="button" tabindex="0" title="Fortschritt ansehen">' +
      '<div class="stat"><div class="stat-num">🔥 ' + g.streakDays +
      (g.streakDays > 0 && freezesAvailable() > 0 ? ' <span class="freeze-mini">❄️' + freezesAvailable() + '</span>' : '') +
      '</div><div class="stat-label">Streak</div></div>' +
      '<div class="stat"><div class="stat-num">⭐ ' + g.xpTotal + '</div><div class="stat-label">XP</div></div>' +
      '<div class="stat"><div class="stat-num">🏅 ' + g.masteredCount + '</div><div class="stat-label">gemeistert</div></div>' +
      '</section>' +
      // Kurs-Karte: DER primaere CTA (WS-A).
      (lesson ?
        '<section class="card goal-card"><div class="setting-label">🎓 Deine Lektion</div>' +
        '<div class="setting-sub">' + esc(lesson.emoji + " " + lesson.title) + ' · ' + esc(lesson.band) +
        (lessonState(lesson.id).step > 0 ? ' · angefangen' : '') + '</div>' +
        '<button class="btn primary big" id="cta-lesson">▶ Weiterlernen</button></section>' :
        (courseAvailable() ?
          '<section class="card goal-card"><div class="setting-label">🎉 Kurs komplett!</div>' +
          '<button class="btn primary big" id="cta-lesson-vocab">▶ Vokabeln trainieren</button></section>' :
          '<section class="card goal-card"><button class="btn primary big" id="cta-lesson-vocab">▶ Los geht’s</button></section>')) +
      // Heute-Block (WS-D): Snack des Tages + Buchstabe/Wort des Tages.
      '<section class="card today-card"><div class="setting-label">🌅 Heute</div>' +
      (snack ?
        '<div class="snack-card"><span class="tile-emoji">' + esc(snack.emoji) + '</span>' +
        '<div class="theme-info"><div class="theme-title">' + esc(snack.title) + '</div>' +
        '<div class="setting-sub">Häppchen des Tages · 2 Minuten' +
        (state.profile.snackVocab ? ' · + fällige Vokabeln' : '') + '</div></div>' +
        '<button class="btn primary" id="btn-snack">▶</button></div>' : '') +
      '<div class="today-tiles">' + tile(picks.letter, "Buchstabe des Tages") + tile(picks.word, "Wort des Tages") + '</div>' +
      '</section>' +
      '<section class="card goal-card">' +
      '<div class="goal-line"><span>Heute fällig: <b>' + dueCount() + '</b> · Neu: <b>' + newCount() + '</b></span>' +
      '<span>' + today.answers + ' / ' + goal + '</span></div>' +
      '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      (today.answers > 0 ?
        '<div class="today-line">Heute: ' + today.answers + ' Antworten · ' +
        Math.round((today.correct || 0) / today.answers * 100) + ' % richtig' +
        ((today.mastered || 0) > 0 ? ' · 🏅 ' + today.mastered + ' neu gemeistert' : '') + '</div>' : "") +
      (today.goalMet ? '<div class="goal-done">Tagesziel erreicht – schön! 🎉</div>' : "") +
      '</section>' +
      '<div class="footer-tag">Reden wir Tacheles. 🕊️</div>' + footerLinksHtml();
    // Verdrahtung: stats-Tipp (T5-Snippet), Kurs-CTA, Snack, Tages-Kacheln, Footer.
    var stats = $("#stats-row");
    if (stats) {
      var goProg = function () { showScreen("progress"); };
      stats.addEventListener("click", goProg);
      stats.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goProg(); }
      });
    }
    var cta = $("#cta-lesson");
    if (cta && lesson) cta.addEventListener("click", function () { startSession("lesson", { lessonId: lesson.id }); });
    var ctaV = $("#cta-lesson-vocab");
    if (ctaV) ctaV.addEventListener("click", function () { startSession("smart"); });
    var sn = $("#btn-snack");
    if (sn && snack) sn.addEventListener("click", function () {
      startSession("snack", { snackId: snack.id, withVocab: state.profile.snackVocab });
    });
    app.querySelectorAll("[data-today]").forEach(function (row) {
      var go = function () { startSession("smart", { itemIds: [row.dataset.today], size: 3, label: "🌅 Heute" }); };
      row.addEventListener("click", go);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
    app.querySelectorAll(".today-card [data-say]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var it = itemById(b.dataset.say);
        if (it) say(it);
      });
    });
    wireFooterLinks(app);
  }
```

Style: `.snack-card { display: flex; align-items: center; gap: 10px; margin: 8px 0 12px; }`.

- [ ] **Step 3: Profil-Schalter snackVocab**

In `renderProfile`, first settings card, after the Autoplay row:

```js
      '<div class="setting-row"><div><div class="setting-label">Häppchen mit Vokabeln</div>' +
      '<div class="setting-sub">hängt dem Tages-Häppchen 2-3 fällige Wörter an</div></div>' +
      '<input type="checkbox" id="snackvocab-chk"' + (p.snackVocab ? " checked" : "") + '></div>' +
```

Wiring: `$("#snackvocab-chk").addEventListener("change", function (e) { state.profile.snackVocab = !!e.target.checked; saveState(); });`

- [ ] **Step 4: Regression - update Home selectors + new checks (failing first)**

Home selector updates (`#cta-start` no longer exists; Home detection + smart-session starts change):
1. Section 2 (~144, 152): "Tour ueberspringen fuehrt zu Home" → check `#stats-row` instead of `#cta-start`; drop the `.next-card` check (card removed), replace with `.today-card` presence.
2. Section 2b (~175) and 14c Erstkontakt (~835): start the smart session via Vokabeln tab: hop to `data-screen === "vocab"`, click `#cta-power`.
3. Section 12 corrupt (~578) + 13 legacy (~670): `home: !!document.querySelector("#cta-start")` → `!!document.querySelector("#stats-row")`; legacy `themeRows` check (~671) counts theme rows on Home - themes moved: change to count on the Vokabeln tab (`.path-list .path-row[data-theme]`, still 41 total rows with locked; keep the A0+A1-open assertion by counting `.path-row:not(.locked)` === 20 there).
4. Section 14f Heute (~1015): keep `today-card`/`tiles === 2`; `#btn-snack` now starts the SNACK session: replace the "Haeppchen startet Mini-Session (smart, <= 5)" expectations with mode `"snack"` (sessionInfo returns `{mode:"snack", taskIds:[]}` - assert mode only) and add the rotation checks below.
5. Section 14g (~1071): `#btn-reading` moved to the Grammatik tab as `#btn-reading-path` (T5) - update selector + hop.
6. Sections that "return home" and re-click `[data-mode]` already hop via vocab since T5 - verify none still queries Home tiles.

New checks (extend 14f):

```js
  const snackRot = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const first = D.dailySnackId();
    const again = D.dailySnackId();
    // Ungesehen-zuerst: heutigen Snack als gesehen markieren -> anderer Snack.
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.course.snacksSeen[first] = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return { first, stable: first === again, snacks: window.TACHELES_SNACKS.snacks.length };
  });
  await page.reload(); await page.waitForTimeout(500);
  const snackRot2 = await page.evaluate((first) => ({
    second: window.TACHELES_DEBUG.dailySnackId(),
    differs: window.TACHELES_DEBUG.dailySnackId() !== first
  }), snackRot.first);
  check("Heute: Snack deterministisch + Ungesehenes zuerst",
    snackRot.stable && snackRot.snacks >= 38 && snackRot2.differs,
    snackRot.first + " -> " + snackRot2.second);
  await page.evaluate(() => { const b = document.querySelector("#btn-snack"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const snackSess = await page.evaluate(() => (window.TACHELES_DEBUG.sessionInfo() || {}).mode);
  check("Heute: Haeppchen startet Snack-Session", snackSess === "snack", snackSess);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  // Profil: snackVocab-Schalter vorhanden und schreibt den State.
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const snackToggle = await page.evaluate(() => {
    const chk = document.querySelector("#snackvocab-chk");
    if (!chk) return null;
    chk.checked = false; chk.dispatchEvent(new Event("change"));
    return JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.snackVocab;
  });
  check("Profil: snackVocab-Schalter schreibt State", snackToggle === false, snackToggle);
  // Kurs-Karte auf Home fuehrt in eine Lektion.
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#cta-lesson"); if (b) b.click(); });
  await page.waitForTimeout(500);
  check("Home: Kurs-Karte startet die naechste Lektion",
    await page.evaluate(() => /Lektion|·/.test((document.querySelector(".session-title") || {}).textContent || "") &&
      (window.TACHELES_DEBUG.lessonStepLabel() !== null)));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);
```

Run failing → implement → run: `cd app && node --check app.js && node test/regression.cjs` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: home rework - daily snack block, course card CTA, tappable stats"
```

---

## Task 10: Interaktive Tour (Spotlight + Demo) ersetzt die Slideshow [SERIAL, nach T9]

**Files:**
- Modify: `app/app.js` - DELETE `TOUR_SLIDES` (~line 4266) and the slideshow `renderTour` body (~4285-4306); NEW `TOUR_STEPS` + tour engine under the same name `renderTour(idx)` (call sites in `renderOnboarding` step 3, `renderProfile` `#btn-tour`, `showTourNotice` stay valid); `recordAnswer` (~line 724, demo guard first line); `showTourNotice` text update (~line 4318); `finishTour` stays; `window.TACHELES_DEBUG` (+ `tourActive`)
- Modify: `app/styles.css` (`.tour-spot`, `.tour-card`, `.tour-dim`)
- Test: `app/test/regression.cjs` (sections 2 + 14k rewrite, new demo-no-write check)

**Interfaces:**
- Consumes: `showScreen`, real DOM anchors: `#stats-row`, `#btn-snack`, `.nav-btn[data-screen=…]`, `#cta-lesson`/`#cta-power`.
- Produces: `renderTour(idx)` (new engine, same signature), module-level `var tourDemo = false;`, `recordAnswer` demo guard, `TACHELES_DEBUG.tourActive()`.

- [ ] **Step 1: Regression rewrite first (failing)**

Section 2 (~139-145): the onboarding still ends in `renderTour(0)` - update the assertions to the new engine: expect `.tour-card` and title text `Einführung · 1/…`; "Überspringen" still exists per step and leads to Home with `tourSeen === true` (assert via `#stats-row`).
Section 14k rewrite:

```js
  // --- 14k. Interaktive Tour: Spotlight, Demo schreibt nichts, Neustart, Skip ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Tour: Profil-Eintrag 'Einführung ansehen'", await page.evaluate(() => !!document.querySelector("#btn-tour")));
  const beforeTour = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { xp: s.gamification.xpTotal, answers: s.gamification.answersTotal, srsN: Object.keys(s.srs).length };
  });
  await page.evaluate(() => { const b = document.querySelector("#btn-tour"); if (b) b.click(); });
  await page.waitForTimeout(450);
  check("Tour: startet mit Spotlight/Karte + Schrittzaehler", await page.evaluate(() =>
    (!!document.querySelector(".tour-spot") || !!document.querySelector(".tour-card")) &&
    /Einführung · 1\//.test(document.body.innerText) && window.TACHELES_DEBUG.tourActive() === true));
  // Bis zum Demo-Schritt weiterklicken und die Demo-Frage RICHTIG beantworten.
  let demoSeen = false;
  for (let i = 0; i < 12; i++) {
    const hasDemo = await page.evaluate(() => !!document.querySelector(".tour-card [data-correct-opt]"));
    if (hasDemo) {
      demoSeen = true;
      await page.evaluate(() => { document.querySelector(".tour-card [data-correct-opt]").click(); });
      await page.waitForTimeout(500);
      break;
    }
    const advanced = await page.evaluate(() => {
      const w = [...document.querySelectorAll(".tour-card button")].find(x => /^weiter/i.test((x.textContent || "").trim()));
      if (w) { w.click(); return true; }
      return false;
    });
    if (!advanced) break;
    await page.waitForTimeout(450);
  }
  check("Tour: Demo-Schritt mit echter Antwort erreicht", demoSeen);
  const afterDemo = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { xp: s.gamification.xpTotal, answers: s.gamification.answersTotal, srsN: Object.keys(s.srs).length };
  });
  check("Tour: Demo-Antwort schreibt NICHTS (kein XP/SRS/Log)",
    afterDemo.xp === beforeTour.xp && afterDemo.answers === beforeTour.answers && afterDemo.srsN === beforeTour.srsN,
    JSON.stringify({ beforeTour, afterDemo }));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".tour-card button")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Tour: Ueberspringen beendet die Tour (Home)", await page.evaluate(() =>
    !document.querySelector(".tour-card") && !!document.querySelector("#stats-row") &&
    window.TACHELES_DEBUG.tourActive() === false));
```

The existing section-13 notice checks ("Alt-State: einmaliger Tour-Hinweis…") stay AS IS - the notice survives, only its text changes.

- [ ] **Step 2: Engine implementation**

Delete `TOUR_SLIDES` and the old `renderTour` body. New code in the same place:

```js
  /* ---------- Interaktive Tour (WS-F): Spotlight auf ECHTE Bedienung ---------- */

  var tourDemo = false; // Demo-Modus: recordAnswer verbucht NICHTS (WS-F)

  /** Schritte: screen = vorher rendern; sel = Spotlight-Ziel (fehlt/null -> zentrierte Karte);
   *  demo = eine echte Beispiel-Frage in der Karte. */
  var TOUR_STEPS = [
    { screen: "home", sel: "#btn-snack", title: "Dein Häppchen",
      text: "Jeden Tag ein kleines Wissens-Häppchen: zwei Minuten, ein Aha. Hier startest du es." },
    { screen: "home", sel: null, demo: true, title: "So fühlt sich Lernen an",
      text: "Probier eine echte Frage – die Antwort zählt in der Tour noch nicht." },
    { screen: "home", sel: "#cta-lesson", title: "Dein Kurs",
      text: "Der Kurs führt dich Lektion für Lektion von Schalom bis zu echten Gesprächen. Weiterlernen ist immer der schnellste Weg." },
    { screen: "course", sel: ".lesson-row.next", title: "Dein Pfad",
      text: "Jede Lektion: Szene, neue Wörter, ein Grammatik-Punkt, Hören, Quiz. Erledigtes bleibt spielbar." },
    { screen: "vocab", sel: "#cta-power", title: "Freies Training",
      text: "So viel du willst: Power-Training, 13 Modi, Themen, Blitz. Alles zahlt auf dein SRS ein." },
    { screen: "grammar", sel: "#reading-block", title: "Grammatik & Lesen",
      text: "Regeln verstehen und Silben zu Wörtern verschmelzen – hier wird aus Erkennen echtes Lesen." },
    { screen: "home", sel: "#stats-row", title: "Ehrlicher Fortschritt",
      text: "Tippe auf deine Statistik für den vollen Fortschritt. „Gemeistert“ heißt: aktiv abgerufen – und du kannst jederzeit dein Veto einlegen." }
  ];

  function renderTour(idx) {
    cleanupSession();
    idx = idx || 0;
    // Tour gilt beim START als gesehen (idempotent, wie bisher).
    if (!state.profile.tourSeen) { state.profile.tourSeen = true; saveState(); }
    var step = TOUR_STEPS[idx];
    if (!step) return finishTour();
    tourDemo = true;
    showScreen(step.screen); // echten Screen rendern (Nav bleibt sichtbar)
    // Overlay nach dem Rendern aufsetzen (Ziel-Element messen).
    var target = step.sel ? document.querySelector(step.sel) : null;
    var dim = el("div", "tour-dim");
    if (target) {
      var r = target.getBoundingClientRect();
      var spot = el("div", "tour-spot");
      spot.style.top = (r.top - 6) + "px";
      spot.style.left = (r.left - 6) + "px";
      spot.style.width = (r.width + 12) + "px";
      spot.style.height = (r.height + 12) + "px";
      dim.appendChild(spot);
    }
    var card = el("div", "tour-card" + (target ? "" : " centered"));
    card.appendChild(el("div", "onb-step", "Einführung · " + (idx + 1) + "/" + TOUR_STEPS.length));
    card.appendChild(el("div", "onb-title small", step.title));
    card.appendChild(el("div", "onb-sub", step.text));
    if (step.demo) buildTourDemo(card);
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn(idx + 1 < TOUR_STEPS.length ? "Weiter →" : "Los geht’s 🚀", "btn primary big", function () {
      dim.remove();
      renderTour(idx + 1);
    }));
    actions.appendChild(btn("Überspringen", "btn ghost big", function () {
      dim.remove();
      finishTour();
    }));
    card.appendChild(actions);
    dim.appendChild(card);
    if (target && card.classList.contains("centered") === false) {
      // Karte unter/ueber dem Spot positionieren (einfach: unteres Drittel vs. oberes).
      var below = (target.getBoundingClientRect().top < window.innerHeight / 2);
      card.style.top = below ? "auto" : "12px";
      card.style.bottom = below ? "12px" : "auto";
    }
    document.body.appendChild(dim);
  }

  /** Demo-Frage: echte MC-Bedienung, verbucht via tourDemo-Flag nichts. */
  function buildTourDemo(card) {
    var item = itemById("shalom") || CONTENT.items[0];
    var q = el("div", "card learn-card");
    var he = el("div", "he-text big", item.niqqud || item.he);
    he.dir = "rtl"; he.lang = "he";
    q.appendChild(he);
    card.appendChild(q);
    var opts = shuffle([item].concat(pickDistractors(item, 3)));
    var list = el("div", "opt-list");
    var done = false;
    opts.forEach(function (o) {
      var b = el("button", "opt", o.de);
      if (o.id === item.id) b.dataset.correctOpt = "1";
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = o.id === item.id;
        list.querySelectorAll(".opt").forEach(function (x) { x.disabled = true; x.classList.add("dim"); });
        b.classList.remove("dim");
        b.classList.add(correct ? "correct" : "wrong");
        recordAnswer(item.id, "mc", correct ? "good" : "again", "he2de"); // no-op im Demo-Modus
        say(item);
        // Gold-Moment inkl. Veto ZEIGEN (nur Demo-Toast, kein State):
        toast("🏅 So sieht’s aus, wenn ein Wort sitzt · tippen wäre dein Veto", "gold", function () {
          toast("Genau so nimmst du ein Wort zurück. 💪");
        });
      });
      list.appendChild(b);
    });
    card.appendChild(list);
  }

  function finishTour() {
    tourDemo = false;
    state.profile.tourSeen = true;
    saveState();
    var dim = document.querySelector(".tour-dim");
    if (dim) dim.remove();
    document.body.classList.remove("in-session");
    showScreen("home");
  }
```

`recordAnswer` - FIRST lines of the function body:

```js
    // Tour-Demo (WS-F): echte Bedienung, aber NICHTS verbuchen (kein SRS/XP/Log).
    if (tourDemo) return { correct: grade !== "again", xp: 0 };
```

`showTourNotice` text update (Bestandsnutzer, die noch GAR keine Tour sahen; Slideshow-Seher haben `tourSeen === true` und bekommen nichts - kein Re-Notice):

```js
      "Tacheles hat jetzt einen richtigen Kurs, Wissens-Häppchen und einen Lese-Trainer. " +
      "Eine kurze interaktive Tour zeigt dir alles an Ort und Stelle. Du findest sie " +
      "jederzeit im Profil unter „Einführung ansehen“."
```

`finishTour` is called from the notice path unchanged. `TACHELES_DEBUG.tourActive: function () { return !!document.querySelector(".tour-dim"); },` - plus reset `tourDemo = false` in `finishTour` (above) AND defensively at the top of `startSession` (`tourDemo = false;`).

Styles:

```css
.tour-dim { position: fixed; inset: 0; z-index: 60; background: rgba(10, 25, 30, .55); }
.tour-spot { position: absolute; border-radius: 14px; background: transparent;
  box-shadow: 0 0 0 9999px rgba(10, 25, 30, .55); }
.tour-dim:has(.tour-spot) { background: transparent; } /* Cutout: Spot dunkelt, Dim nicht doppelt */
.tour-card { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 61;
  background: var(--card, #fff); border-radius: 16px; padding: 16px; max-height: 70vh; overflow-y: auto; }
.tour-card.centered { top: 50%; bottom: auto; transform: translateY(-50%); }
```

(`:has` is fine in Edge; the plain `.tour-dim` background remains the no-target fallback.)

- [ ] **Step 3: Run + commit**

Run: `cd app && node --check app.js && node test/regression.cjs`
Expected: PASS; sections 2, 13 (notice) and the new 14k all green; grep confirms the slideshow is gone: `grep -c "TOUR_SLIDES" app/app.js` → 0.

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: interactive spotlight tour with no-write demo, remove slideshow"
```

---

## Task 11: Audio - Enumeration erweitern, Batch erzeugen (OPERATOR), verifizieren [SERIAL, nach T2+T3+T4]

**Files:**
- Modify: `tools/audio-lib.cjs` - `loadContent` (~line 37), `enumerateTargets` (~line 50)
- Modify: `tools/generate-audio.cjs`, `tools/check-audio.cjs` (call sites of the two functions - read both files first; they are small drivers around audio-lib)
- Generated: `app/audio/*.opus` (+ `manifest.js`/`manifest.json` regenerated)
- Test: `node tools/check-audio.cjs` (exit 0 after generation), regression audio section (unchanged, must stay green)

**Interfaces:**
- Consumes: C7 keying, T2/T3/T4 content.
- Produces: `loadContent(appDir)` → `{ CONTENT, GRAMMAR, COURSE, SNACKS, READING }`; `enumerateTargets(CONTENT, GRAMMAR, COURSE, SNACKS, READING)` (extra args optional/null-safe → old call sites keep working until updated).

- [ ] **Step 1: Extend loadContent + enumerateTargets**

`loadContent` additions (same optional-require pattern as grammar):

```js
  try { require(path.join(dir, "course.js")); } catch (e) { /* optional */ }
  try { require(path.join(dir, "snacks.js")); } catch (e) { /* optional */ }
  try { require(path.join(dir, "reading.js")); } catch (e) { /* optional */ }
  return {
    CONTENT: global.window.TACHELES_CONTENT,
    GRAMMAR: global.window.TACHELES_GRAMMAR || null,
    COURSE: global.window.TACHELES_COURSE || null,
    SNACKS: global.window.TACHELES_SNACKS || null,
    READING: global.window.TACHELES_READING || null
  };
```

`enumerateTargets(CONTENT, GRAMMAR, COURSE, SNACKS, READING)` - after the existing grammar block, before `return`:

```js
  // Kurs: Inline-Szenen-Zeilen (Dialog-Szenen sind schon ueber dialogues vertont).
  ((COURSE && COURSE.lessons) || []).forEach(l => {
    const b = l.band || "A0";
    if (l.scene && Array.isArray(l.scene.lines)) {
      l.scene.lines.forEach(x => { if (x.he) add("h_" + audioHash(x.he), x.he, b, "scene"); });
    }
    // Inline-Grammatik: explain-Beispiele wie grammar.js behandeln.
    if (l.grammar && Array.isArray(l.grammar.inline)) {
      l.grammar.inline.forEach(s => {
        (s.examples || []).forEach(e => { if (e.he) add("h_" + audioHash(e.he), e.he, b, "grammar"); });
      });
    }
  });
  // Snacks: explain-Beispiele.
  ((SNACKS && SNACKS.snacks) || []).forEach(sn => {
    const b = sn.band || "A0";
    (sn.steps || []).forEach(s => {
      (s.examples || []).forEach(e => { if (e.he) add("h_" + audioHash(e.he), e.he, b, "snack"); });
    });
  });
  // Lese-Trainer: jede Inventar-Silbe (niqqud-Form ist der vertonte Text).
  ((READING && READING.syllables) || []).forEach(s => {
    if (s.he) add("h_" + audioHash(s.he), s.he, "A0", "syllable");
  });
```

Update the two drivers: wherever they do `const { CONTENT, GRAMMAR } = loadContent(...)` / `enumerateTargets(CONTENT, GRAMMAR)`, destructure and pass the three new globals. MC-Optionen und Cloze-Sätze bleiben bewusst UNVERTONT (Bestandskonvention).

- [ ] **Step 2: Dry check (counts, no API)**

Run: `node tools/check-audio.cjs`
Expected: exit 1 with a missing-list of roughly 150-330 new keys (~170 syllables + ~50-80 snack examples + inline scene lines). Report the exact number - this is the ground-truth count for the generation step (Datenregel: Zählungen gegen die Quelle verifizieren, nicht gegen die Zusammenfassung).

- [ ] **Step 3: OPERATOR step - generate clips (needs local `tools/audio.env` with the ElevenLabs key; DO NOT run unattended in CI/agents without the key)**

Run: `node tools/check-audio.cjs --fill`
(Existing pipeline: Ellen voice, eleven_v3, Robust stability, Opus output; generation skips existing files; manifest.js/manifest.json rewritten from disk.)
Expected: `made == missing count from Step 2`, `failed == 0`; a few minutes of audio, a few MB.

- [ ] **Step 4: Verify + regression + commit**

Run: `node tools/check-audio.cjs` → exit 0, 0 missing. `git status app/audio` → only new `.opus` files + updated manifests.
Run: `cd app && node test/regression.cjs` → the audio checks (section 14) still pass - clip count grows, `>= 600` floor unaffected; "0 Konsolenfehler" guards against a broken manifest.
Spot-check one syllable clip end-to-end: in the app (localhost), Grammatik-Tab → Silben-Trainer → hearPick plays a real clip (not TTS). Manual, 1 minute.

```bash
git add tools/audio-lib.cjs tools/generate-audio.cjs tools/check-audio.cjs app/audio
git commit -m "feat: voice syllables, snack examples and inline scene lines via audio pipeline"
```

(Audio files stay under `app/audio/LICENSE` terms - CC-BY-NC + no AI training; nothing to change there.)

---

## Task 12: Release-Politur - SW-Bump, CLAUDE.md, docs/11, Voll-Lauf [SERIAL, LAST]

**Files:**
- Modify: `app/sw.js` (lines 14-26), `CLAUDE.md`, `docs/11-roadmap-mvp.md`
- Test: full suite (validators + node --check + regression)

- [ ] **Step 1: Service Worker**

`app/sw.js`: `CACHE_NAME = "tacheles-v14"` (from v13) and extend `ASSETS`:

```js
  "./course.js",
  "./snacks.js",
  "./reading.js",
```

(AUDIO_CACHE bleibt `tacheles-audio-v1` - cache-first, Clips ändern sich nie.)

- [ ] **Step 2: CLAUDE.md aktualisieren**

Update the `## App (app/)` file list (course.js/snacks.js/reading.js with one-line descriptions + their validators), the nav description (5 Tabs: Home/Lernen=Kurs/Vokabeln/Grammatik/Profil; Fortschritt via Statistik-Tipp), the state gotcha (course-Slice + snackVocab in Allowlist), the SW note (aktuell v14, neue ASSETS), the test note (neue Check-Anzahl aus dem letzten grünen Lauf eintragen), and the Audio paragraph (Silben/Snack-Beispiele/Szenen-Zeilen vertont, enumerateTargets-Signatur). Load order line: content → grammar → course → snacks → reading → audio/manifest → app.

- [ ] **Step 3: docs/11 Umsetzungsstand**

Add a dated entry to the „Umsetzungsstand“ section of `docs/11-roadmap-mvp.md`: Kurs-Curriculum A0-C2 (~100 Lektionen), Lektions-Player, Lese-Trainer, Wissens-Häppchen, 5-Tab-Navigation, interaktive Tour; offene Punkte unverändert (muttersprachliches Review nun inkl. Snacks/Silben - steht schon so in der Spec).

- [ ] **Step 4: Voll-Lauf + Commit**

Run, all must pass:
```
node tools/validate-course.cjs && node tools/validate-snacks.cjs && node tools/validate-reading.cjs
node tools/check-audio.cjs
cd app && node --check app.js content.js grammar.js course.js snacks.js reading.js sw.js
node test/regression.cjs
```
Record the final check count (old 138 + ~30 new) and put it into CLAUDE.md (Step 2 - do Steps 2 and 4 iteratively).

```bash
git add app/sw.js CLAUDE.md docs/11-roadmap-mvp.md
git commit -m "chore: release polish - sw v14 with new assets, docs and CLAUDE.md update"
```

PR (Draft, base main, `Closes #N` einer vorhandenen/neu angelegten Issue am ANFANG des Bodys; gh-Gotcha: REST statt GraphQL, Body via `--input -`). A human merges.

---

## Self-Review

**1. Spec coverage mapping (jede Spec-Anforderung → Task):**

| Spec | Plan |
|---|---|
| WS-A 5-Tab-Nav, Tab-Inhalte, Fortschritt via Statistik-Tipp | T5 (Nav, Vokabeln, Grammatik, Statistik-Tipp), T7 (Kurs-Tab final), T9 (Home) |
| WS-A Vokabeln: Power-Training 5/10/20, 13 Modi, Themen, Blitz (in den Modi), Knacknüsse, Mastery-Check, Vokabelliste - keine Funktionsminderung (WS-E) | T5 renderVocab |
| WS-A Grammatik: Module nach Level, „empfohlen“-Marker, Lesen-Block | T5 renderGrammar, T6 Drill-Liste |
| WS-B Datenmodell course.js, Abdeckung, ~100 Lektionen, Ladeordnung, defensiv | C1, T1, T2 |
| WS-B Lektions-Player 8-Schritt-Bogen, recordAnswer/Erstkontakt, Abbruch merkt Schritt | T8 |
| WS-B Kursfortschritt-State + Merge | C4, T1 |
| WS-B Quereinstieg (>= 60 %, Empfehlung, Bestätigen, nachholbar), lineare Freischaltung, levelCap nur fürs freie Training (Player nutzt kein Band-Gating) | T7 |
| WS-C Übungstypen 1-4, Daten (Inventar programmatisch, Heuristik + Ausnahmen), Audio-Keys, Integration (frühe Lektionen + freier Trainer, Stufen) | C3, T4, T6, T8 (Drill im Bogen) |
| WS-D Snack des Tages (dayHash, Ungesehenes zuerst), Vokabel-Anhang + Schalter, Katalog ~40, snacksSeen | C2, T3, T9 |
| WS-F interaktive Tour (Spotlight + Fallback, echte Bedienung, Demo-Antwort ohne Schreiben, Gold-Moment/Veto gezeigt, skippbar, Neustart Profil, tourSeen, kein Re-Notice für Slideshow-Seher, Slideshow entfernt) | T10 |
| State-Schema (Allowlist + Merge, version 1) | C4, T1 |
| Audio-Erzeugung (Enumeration, check-audio --fill, Manifest, SW-Prefetch automatisch, Lizenz unverändert) | C7, T11 |
| Tests (Kurs-Integrität, Player, Quereinstieg, Lese-Trainer, Häppchen, Navigation, Tour, Alt-State, ~138 bestehende grün) | T1/T5-T10 je Sektion; Alt-State-Updates in T9 Step 4; Voll-Lauf T12 |
| Leitplanken (build-frei, Item-IDs, Determinismus, SW-Bump, du-Ton) | Global Constraints + T12 |

Gaps checked: „Blick in Kurs, Vokabeln, Grammatik“ in der Tour → TOUR_STEPS 4-6. „Erledigte Lektionen bleiben spielbar / erneut spielen setzt nichts zurück“ → T7 preview + `lessonUnlocked` (done ⇒ true) + markLessonDone setzt nur done/step. „Häppchen antippen“ als Tour-Schritt 1 → vorhanden. Keine offenen Spec-Punkte ohne Task gefunden.

**2. Placeholder scan:** No TBD/TODO/„implement later“. Bewusste, benannte Freiheitsgrade für die Content-Agenten (T2 Kuratierung, T4 Heuristik-Feintuning `translitCluster`/`isTrailing`, Snack-Texte) sind als Auftrag mit festen Validierungsregeln formuliert, nicht als Lücke - der Validator definiert „fertig“. Zwei Stellen sagen „copy the logic of renderBuild“ (T8) bzw. „split renderDrillTask“ (T8) - beides sind konkrete Refactorings mit Quell-Zeilenangabe und Zielsignatur.

**3. Contract consistency:** `startSession("lesson"|"snack"|"reading")` - identisch in C5, T6, T8, T9. Debug-Namen (`courseInfo`, `lessonStateOf`, `lessonSkippable`, `recommendedEntry`, `dailySnackId`, `syllabify`, `readingInfo`, `lessonStepLabel`, `tourActive`) - je einmal definiert (T1/T6/T7/T8/T9/T10), Regression nutzt exakt diese. `buildDrillTasks`/`renderDrillTaskInto` - T6 definiert, T8 konsumiert (Refactor in T8 explizit). Drill-IDs `drill_a0_01..08` + Level-Mapping - C3, T2 Step 3, T4 Interface identisch. `#cta-power`/`#btn-mastercheck`/`#btn-vocab` (T5) vs. Regression-Selektoren (T5/T9) - konsistent. `unionObj`-Platzierung in mergeStates (T1) gegen die reale Deklarationsstelle geprüft (~Zeile 4964). `lessonIndex` wird in mergeStates benutzt und ist davor (Sektion 2) definiert - Hoisting innerhalb der IIFE deckt das ohnehin ab.
