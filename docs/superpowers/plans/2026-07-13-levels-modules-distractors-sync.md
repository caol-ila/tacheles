# Levels to B2, Themed Modules, Smarter Distractors, Device Sync

> **For agentic workers:** Tasks A and B below are executed by parallel implementation agents against the contracts in this document. Agents edit files only; they never run git commands. The orchestrator integrates, tests, reviews, and commits.

**Goal:** Extend Tacheles with (1) guided themed modules (letters, pronunciation, opposites), (2) similarity-based MC distractors that scale with mastery, (3) content bands up to B2 with progressive unlock, a settings override and a placement test, and (4) a merge-capable import plus a clipboard sync code for device sync.

**Architecture:** Everything stays build-free classic-script (file:// compatible, no modules, no fetch, no dependencies). Content additions are purely additive in `content.js` (new themes, items, dialogues, a new top-level `modules` array, `opposite` links). App logic in `app.js` gets a module runner, a distractor scorer, band gating, a placement flow, and merge import. The two workstreams touch disjoint files and are coded against the schema contract below.

**Tech Stack:** Vanilla ES5-style JS, localStorage, Playwright regression harness (`app/test/regression.cjs`, Edge headless).

## Global Constraints

- No build step, no ES modules, no fetch, no external dependencies. Must run from `file://`.
- Item IDs are sacred: never rename existing IDs; content changes are additive only.
- New `profile`/`gamification` fields MUST be added to BOTH `defaultState()` and `normalizeState()` (whitelist), or they vanish on load/import.
- Local dates only via `dateStr()`; never `toISOString()` for day keys.
- UI copy is German (product language). Code comments follow the existing file idiom (German) for consistency. Commit messages, issue and PR text are English.
- Bump `CACHE_NAME` in `sw.js` (v4 -> v5) and `TACHELES_CONTENT.version` (1 -> 2). The state schema `version` stays 1; the import validity check `obj.version !== 1` is about STATE version and stays unchanged.
- After every change: `node --check app.js && node --check content.js`; full suite `cd app && node test/regression.cjs` (needs Edge; `PLAYWRIGHT_PATH` default `c:/Source/SofaSuche/node_modules/playwright-core`).
- Hebrew content quality: every item has `he` (no niqqud), `niqqud`, `translit` (German-friendly, "ch" as in "Bach"), `de`. Sentences need `tokens`. Native-speaker review remains an acknowledged open item; do not claim final linguistic correctness.

---

## Shared Schema Contract (both agents code against this)

### Bands

`BANDS = ["A0", "A1", "A2", "B1", "B2"]` (order matters). Every theme has `band` set to one of these. Items inherit the band of their theme. Optional `band` on dialogues (`"A0"`.. `"B2"`); missing means always available.

### New content fields (content.js, Agent A produces; app.js, Agent B consumes)

1. **`opposite`** (optional, on items): the item ID of its antonym. Must be symmetric (if a.opposite === b.id then b.opposite === a.id) and only between items of the same type group. At least 10 pairs (the existing `adjectives` theme plus new higher-band pairs).

2. **`modules`** (new top-level array next to `themes`/`items`/`dialogues`):

```js
modules: [
  {
    id: "mod_letters_similar",       // unique, stable
    title: "Ähnliche Buchstaben",    // German UI title
    emoji: "👀",
    band: "A0",                      // gated like themes
    sub: "ד oder ר? ה oder ח? Genau hinschauen lernen.",  // one-line teaser
    steps: [
      // 'explain': static teaching card. text is plain text (no HTML).
      // Optional examples: tappable rows, each spoken via TTS on tap.
      { type: "explain", title: "Warum sehen die so ähnlich aus?",
        text: "Einige Buchstaben unterscheiden sich nur durch eine Ecke oder Lücke. ...",
        examples: [ { he: "ד", translit: "dalet", de: "d" },
                    { he: "ר", translit: "resch", de: "r" } ] },
      // 'teach': intro card for one item (like renderIntro), no grading.
      { type: "teach", itemId: "let_dalet" },
      // 'quiz': MC on the item; distractorIds are FIXED (that is the point
      // of a module: the confusable pair is always among the options).
      // 1-3 distractor IDs; the app fills up to 3 with scored distractors.
      { type: "quiz", itemId: "let_dalet", distractorIds: ["let_resh"] },
      // 'pairquiz': MC where the opposite partner is always an option.
      // Asks itemId, pairId is guaranteed to be among the distractors.
      { type: "pairquiz", itemId: "gadol", pairId: "katan" }
    ]
  }
]
```

Step types: `explain`, `teach`, `quiz`, `pairquiz`. All referenced IDs must exist. Quotas: at least 6 modules total covering (a) 2+ letter modules (frequent letters walkthrough; similar-letters using the confusable pairs; final forms; dotted double-role letters ב/כ/פ/ש), (b) 1+ pronunciation module (ch sound, r, stress usually on the last syllable, niqqud as vowels, shva) built from `explain` steps with examples plus `quiz` steps on existing items, (c) 1 opposites module with a `pairquiz` step per opposite pair of the `adjectives` theme.

### New state fields (Agent B, in BOTH defaultState and normalizeState)

```js
profile: {
  // ... existing ...
  levelCap: "auto",       // 'auto' | 'A0' | 'A1' | 'A2' | 'B1' | 'B2'  (settings override)
  unlockedBand: "A1",     // highest EARNED band; default A1 = status quo (A0+A1 open)
  placementDone: false    // placement test taken at least once
}
gamification.counters: {
  // ... existing ...
  modulesDone: {}         // { moduleId: true }
}
```

normalizeState rules: `levelCap` only if in the allowed list, `unlockedBand` only if in BANDS, `placementDone` boolean, `modulesDone` object-not-array (same pattern as `dialogsDone`).

### Band gating semantics (Agent B)

- `effectiveBand()` = `levelCap === "auto" ? unlockedBand : levelCap`.
- `bandUnlocked(band)` = index(band) <= index(effectiveBand()).
- `buildQueue` filters its pool to items whose theme band is unlocked, EXCEPT when `opts.itemIds` is given (explicit lists like Knacknuesse always work).
- `recommendedTheme()` only considers unlocked themes.
- Locked theme rows (home, path, progress) render with a lock (🔒 + "ab A2" style tag), are not clickable as sessions; clicking shows a toast explaining unlock plus the profile setting.
- Dialogues with a locked `band` are hidden from the dialogue chooser.
- Auto-advance: after each `endSession()`, if `levelCap === "auto"` is irrelevant (earning is independent of cap): let `cur = unlockedBand`; if `bandProgress(b) >= 0.4` for `cur` AND for every band below it, advance `unlockedBand` one step (max B2), toast "🎉 Neues Level freigeschaltet: A2!". `bandProgress(band)` = mastered(mastery>=3)/total over the band's items.

### Placement test (Agent B)

- Entry points: new onboarding step between goal selection and the shalom card ("Kennst du schon etwas Hebräisch?" with "Nein, ich fange bei null an" and "Ja, einstufen lassen"), plus a button in Profil ("Einstufungstest").
- Flow: standalone screen sequence (like onboarding, not the session engine). For each band in order A0..B2: 4 MC questions, he -> de, target view only (no niqqud crutches, like exam), items drawn randomly from that band's `word`/`phrase` items. Band passed with >= 3/4 correct. Stop at the first failed band.
- Result: `unlockedBand` = the band AFTER the highest passed band (capped at B2); never lower than the current `unlockedBand` (a placement never takes progress away). Failing A0 keeps the default "A1". Set `placementDone = true`. Result screen: "Du startest mit Level X" plus continue button.
- Placement answers write NO SRS entries, no XP, no log (pure diagnostic).

### Distractor upgrade (Agent B)

Replace the body of `pickDistractors(item, n)` (same signature, all call sites keep working):

1. Letters: confusables first (existing behavior, keep).
2. If `item.opposite` resolves to a valid item, include it as a distractor (both directions of the classic trap; skip if its de/he text collides).
3. Remaining slots from the same type group, scored for similarity to the correct answer:
   - same de word count: +3; differs by 1: +1
   - same he word count: +2
   - he length within +/- 2 chars: +2
   - same theme: +2
   - same first he letter: +1
4. Difficulty ramp: for `getMastery(item.id) <= 1` keep the friendly old behavior (same theme first, then rest, random). For mastery >= 2, sort candidates by score descending with a small random jitter (e.g. score + Math.random()) and take the top n. This kills "guess by word count" exactly where the user asked: when it gets harder.
5. Keep the de/he text dedupe and the emergency fill.

### Module runner (Agent B)

- New session mode `"module"`: `startSession("module", { moduleId })`. Uses `sessionShell`. Steps advance linearly; progress bar = stepIndex/steps.length.
  - `explain`: card with title, text, optional example rows (tap = `TTS.speak(ex.he)`), "Weiter" button (Space/Enter too).
  - `teach`: reuse the intro-card pattern (heEl big, translit, de, note, speakRow, autoplay), "Weiter" button. No grading, no requeue.
  - `quiz`: like renderMC he -> de but options = item + fixed `distractorIds` + scored fill to 3 distractors; `recordAnswer(itemId, "mc", ...)` as usual.
  - `pairquiz`: question "Was heißt <de>?" showing the German, options in Hebrew: correct item + its pair + 2 scored fills; `recordAnswer` as usual.
- Completion: at the end set `counters.modulesDone[id] = true`, then the normal `endSession()` stats screen.
- UI: "Lernen" screen gets a "📚 Module" section above the path: tile per module (emoji, title, sub, ✓ when done, 🔒 when band locked).

### Sync improvements (Agent B)

- **Merge import**: `mergeStates(local, imported)` returns a normalized merged state:
  - `srs`: per item ID take the entry with the later `lastReviewTs`; tie -> higher `reps`.
  - `log`: union of days; per day field-wise `Math.max` for answers/correct/xp/mastered, OR for `goalMet`.
  - `gamification`: `xpTotal` max, `answersTotal` max, `achievements` union, `frozenDays` union, counters: numeric max, `dialogsDone`/`modulesDone` union.
  - `profile`: keep LOCAL settings (device preference), but `onboarded`/`placementDone` OR, `unlockedBand` = the further of the two, `levelCap` local.
  - Run the result through `normalizeState`, recompute mastered count and streak.
- **Import UX**: replace the bare `confirm()` with a small in-app overlay offering "Zusammenführen (empfohlen)", "Ersetzen", "Abbrechen". Both file import and sync code import share this.
- **Sync code**: in Profil "Daten": "🔗 Sync-Code kopieren" (state JSON -> unicode-safe base64 via `btoa(unescape(encodeURIComponent(json)))` -> clipboard with textarea/execCommand fallback for file://) and "Sync-Code einfügen" (overlay with textarea -> decode -> same merge/replace overlay). Round-trip must be lossless.
- **Copy**: profile data card explains that the export file can live in a OneDrive/Google Drive folder to move progress between devices. No OAuth cloud sync (impossible without build/secrets in a file:// app; Supabase sync remains the documented future option, docs/07).
- Expose `window.TACHELES_DEBUG = { mergeStates: mergeStates }` at the end of the IIFE for the regression test (tiny, read-only surface).

---

## Task A: Content expansion (`app/content.js` ONLY)

**Files:** Modify `app/content.js` only. Never touch app.js/styles/index/sw/tests.

**Produces:** New bands, themes, items, dialogues, `opposite` links, `modules` array, EMOJI additions, `version: 2`.

Quotas (regression floors depend on these, do not undershoot):
- A2: 4-6 new themes, >= 80 items (suggested: Arbeit & Beruf, Wohnen & Zuhause, Wetter & Natur, Hobbys & Freizeit, Verben: gestern & morgen).
- B1: 3-5 new themes, >= 70 items (suggested: Meinung & Diskussion, Medien & Nachrichten, Behörden & Papierkram, Beziehungen & Gefühle im Detail).
- B2: 3-5 new themes, >= 60 items (suggested: Gesellschaft & Politik, Abstraktes & Ideen, Slang & Redewendungen, Arbeitswelt für Fortgeschrittene).
- Total items afterwards >= 510 (currently ~300). Total themes >= 30.
- >= 3 new dialogues with `band` set (at least one A2, one B1); dialogues total >= 11.
- >= 10 symmetric `opposite` pairs (existing `adjectives` theme fully linked, plus new pairs in higher bands).
- >= 6 `modules` per the contract above (letters x2+, pronunciation x1+, opposites x1). Module explain texts are real teaching content in German, written for a beginner, referencing the note fields where they exist.
- EMOJI map entries for new picturable items.

Rules: IDs snake_case, unique, stable; `freq` ascending within each theme (1 = learn first); higher-band vocab may reuse roots but never duplicate an existing `he`+`de` combination; sentences always with `tokens`; keep the file's existing formatting style (aligned object literals, section comments). Update the file header comment (counts, bands, modules).

## Task B: App features (`app/app.js`, `app/styles.css`, `app/index.html` if needed, `app/sw.js`, `app/test/regression.cjs`)

**Files:** Modify `app/app.js`, `app/styles.css`, `app/sw.js`, `app/test/regression.cjs` (and `app/index.html` only if a hook is genuinely needed). Never touch `content.js`; code strictly against the contract above (Task A runs in parallel).

Deliverables, in dependency order:
1. State fields + normalizeState (contract above).
2. Band helpers (`BANDS`, `bandIndex`, `effectiveBand`, `bandUnlocked`, `bandProgress`, `maybeAdvanceBand` wired into `endSession`).
3. Gating in `buildQueue`, `recommendedTheme`, theme/path rows (lock rendering + toast), dialogue chooser, exam untouched (A0 only, as today).
4. Profile screen: "Inhalts-Level" select (Automatisch/A1/A2/B1/B2) with sub-line showing the earned `unlockedBand`; "Einstufungstest" row; sync buttons + merge overlay + OneDrive hint copy.
5. Placement flow (contract above) + onboarding step insertion (goal -> placement question -> shalom card; "Nein" path identical to today).
6. `pickDistractors` upgrade (contract above).
7. Module runner + Lernen screen module tiles (contract above). Guard: if `CONTENT.modules` is missing (content agent not merged yet), the section renders nothing and nothing crashes; same defensive stance for `item.opposite` and `theme.band` missing (treat missing band as "A0").
8. `mergeStates` + import overlay + sync code + `TACHELES_DEBUG`.
9. `sw.js`: CACHE_NAME v4 -> v5.
10. Regression additions (keep ALL existing 30 checks passing; raise the items floor to >= 510, themes >= 30, dialogues >= 11):
    - content: every theme has a valid band; `opposite` links symmetric and existing; modules: unique IDs, all referenced itemId/distractorIds/pairId exist, >= 6 modules.
    - state: seeded fresh profile contains levelCap/unlockedBand/placementDone after load (normalizeState round-trip via export button, existing export check can be extended).
    - gating: with default state, a B2 theme row shows the lock and clicking it does NOT enter a session; after `localStorage` seed with `profile.levelCap="B2"`, the same row starts a session.
    - modules: Lernen screen shows the module tiles; opening the first module renders an explain or teach step; completing a quiz step increments answers.
    - merge: via `window.TACHELES_DEBUG.mergeStates`, merge two synthetic states and assert: later-reviewed SRS entry wins, xpTotal is max, achievements union, day log field-wise max.
    - placement: seed onboarded=false, walk onboarding, choose "Ja, einstufen lassen", answer the 4 A0 questions by always clicking the correct option (readable from the DOM via data-item-id), assert the flow reaches a result screen and localStorage has placementDone=true.
    - UI copy stays German; no console errors (existing check covers it).

Style: follow the file's existing idiom (ES5 vars, German comments, section banner comments; add new sections 14+ to the header table of contents). Keyboard support for new interactive screens (1-4, Enter/Space) matching existing patterns.

## Integration (orchestrator, after A and B)

1. `node --check app.js && node --check content.js`.
2. `cd app && node test/regression.cjs` -> fix until exit 0.
3. Read-only review agents (Explore, worktree isolation), fix findings in main loop, re-run tests.
4. Update `docs/11-roadmap-mvp.md` Umsetzungsstand and `CLAUDE.md` app facts (item/theme counts, new modes/fields, CACHE v5).
5. Commit, push branch, draft PR referencing the issue.
