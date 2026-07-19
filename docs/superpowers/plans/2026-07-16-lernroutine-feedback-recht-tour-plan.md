# Lernroutine, ehrliche Mastery, Vokabel-Browser, Feedback, Recht & Tour – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implementation is strictly SEQUENTIAL (almost everything touches `app.js`); do NOT parallelize tasks across agents. Test and commit after every task.

**Goal:** Implement the approved design spec `docs/superpowers/specs/2026-07-16-lernroutine-feedback-recht-tour-design.md` exactly: honest mastery (recognition vs production, first-contact rule, mastery veto, Mastery-Check re-test), a daily "Heute" block plus a "Lesen lernen" beginner path on Home, a vocabulary browser, a local feedback system with GitHub-issue/mailto submission, Kontakt/Impressum + Datenschutz screens, and a skippable app tour.

**Architecture:** Everything stays build-free classic-script (file:// compatible, no modules, no fetch, no dependencies). All new logic lives in `app.js` (plus `styles.css` for new UI, `sw.js` for one cache bump, `test/regression.cjs` for new checks). `content.js` and `grammar.js` are NOT touched. New screens (Vokabelliste, Feedback, Kontakt, Datenschutz, Tour, Mastery-Check-Review) are rendered by `app.js` into `#app` like the existing Alef-Bet chart / onboarding screens, so no new asset files and no `index.html` change. Two new state fields (`profile.tourSeen`, top-level `feedback`) go through `defaultState()` + `normalizeState()` (Allowlist) + `mergeStates()` first, because several workstreams depend on them.

**Tech Stack:** Vanilla ES5-style JS (IIFE in `app.js`), localStorage, Playwright regression harness (`app/test/regression.cjs`, Edge headless via `PLAYWRIGHT_PATH`, default `c:/Source/SofaSuche/node_modules/playwright-core`).

## Global Constraints

Every task's requirements implicitly include this section.

- No build step, no ES modules, no fetch, no external dependencies. Must run from `file://`.
- Item IDs are sacred. `content.js` is NOT changed by this PR (nor `grammar.js`).
- New state fields MUST be added to BOTH `defaultState()` AND `normalizeState()` (as an Allowlist) AND merged in `mergeStates()`. Terminology is **Allowlist/Denylist** everywhere (code comments, docs); Task 1 also fixes the existing "whitelistet" wording in `CLAUDE.md`.
- No `Math.random` for "of the day" content: deterministic date hash over `dateStr()`/`todayStr()` (local date, never `toISOString()`).
- UI copy is German ("du" tone). Code comments follow the existing file idiom (German). Commit messages / PR text are English. No em dashes (and no en dashes in new prose); existing strings stay as they are.
- Test model per task: `cd app && node --check app.js && node test/regression.cjs` (exit 0 = PASS; must stay green). Also `node --check test/regression.cjs` when the test file changed. The existing Alt-State backward-compat check (section 13 of the test) must stay green in every task.
- The console-error check (`--- 15. Konsolenfehler ---`) must remain the LAST check in `regression.cjs`; insert all new test sections BEFORE it.
- Service worker: bump `CACHE_NAME` exactly once for this release (Task 11, v12 -> v13). No new files enter `ASSETS` (all new screens are rendered by `app.js`).
- Legal texts are a lay template with a clear "no legal advice" disclaimer.
- Line numbers in this plan refer to `app.js` at commit `ebbc425` and to `test/regression.cjs` at the same commit; they drift as tasks land. Always anchor on the named function/section, not the number.

## File Structure (whole PR)

- Modify: `app/app.js` (all workstreams; new functions listed per task)
- Modify: `app/styles.css` (append new rules per task at end of file)
- Modify: `app/test/regression.cjs` (new checks per task; a few existing checks adjusted in Task 10)
- Modify: `app/sw.js` (Task 11: `CACHE_NAME` v12 -> v13 only)
- Modify: `CLAUDE.md` (Task 1: Allowlist wording; Task 11: feature notes + test seeding note)
- NOT modified: `app/content.js`, `app/grammar.js`, `app/index.html`, `app/audio/*`

## Key existing anchors in `app.js` (for orientation)

| Anchor | ~Line | Role |
|---|---|---|
| `toast(msg, cls)` | 84 | toast helper (Task 3 extends) |
| `BANDS` / `bandIndex` / `itemBand` | 145-149 | band model |
| `defaultState()` | 158 | state schema (Task 1) |
| `normalizeState(raw)` | 196 | Allowlist normalization (Task 1) |
| `rateItem(id, grade)` | 445 | SRS core (Task 2 adds mastery cap) |
| `getMastery(id)` / `updateMasteredCount()` | 439/499 | mastery reads |
| `recordAnswer(itemId, mode, grade)` | 613 | central booking + gold toast (Tasks 2, 3) |
| `audioHash(s)` | 849 | FNV-1a hex (Task 5 refactors into `fnv1a`) |
| `sessionSize()` / `buildQueue(count, opts)` | 1036/1041 | session generator (Task 5 adds `opts.size` support in `startSession`) |
| `renderHome()` | 1365 | Home screen (Tasks 5, 6, 8) |
| `renderModes()` / `renderProgress()` / `renderProfile()` | 1439/1459/1602 | screens (Tasks 4, 7-10) |
| `startSession(modeId, opts)` | 1720 | session dispatcher (Tasks 4, 5, 6) |
| `renderSession()` / `renderTask()` | 1942/2108 | task dispatch (Task 4 hooks review screen) |
| `INTRO_KINDS` / `renderIntro(task, title)` | 2106/2237 | teach-first intro (Task 2 first-contact flag) |
| `pickDistractors(item, n)` | 2425 | distractor scoring (Task 2) |
| `buildOptionButtons(body, item, mode, optionKind, afterAnswer, task)` | 2490 | MC options UI (Task 2 passes dir) |
| `renderFlash` / `renderMC` | 2271/2545 | task renderers (Task 2 passes dir) |
| `endSession()` | 3233 | session end (Task 4: review screen runs before it) |
| `ALEFBET_ORDER` / `renderAlefbetChart()` | 3370/3377 | standalone-screen pattern (Tasks 6, 7) |
| `renderOnboarding(step)` | 3435 | onboarding, step 3 hands off to Tour (Task 10) |
| `renderModuleTeach` / `moduleOptionButtons` / `moduleChoiceButtons` | 3794/3815/3925 | module runner (Task 2 dir + first-contact) |
| `mergeStates(local, imported)` | 4035 | merge (Task 1) |
| `buildOverlay(titleText)` | 4134 | overlay pattern (Task 10 notice) |
| `init()` | 4250 | startup (Task 10 tour notice) |
| `window.TACHELES_DEBUG` | 4275 | debug surface for tests (extended in Tasks 2-8) |

---

## Task 1: State schema foundation (`feedback`, `profile.tourSeen`) + Allowlist wording

Multiple later tasks (7, 8, 10) depend on these fields. No UI in this task; behavior is invisible except that the fields now survive load/import/merge.

**Files:**
- Modify: `app/app.js` (`defaultState()` ~158, `normalizeState()` ~196, `mergeStates()` ~4035)
- Modify: `CLAUDE.md` (line 55, "whitelistet" wording)
- Test: `app/test/regression.cjs` (new section between `--- 14.` and `--- 15.`)

**Interfaces:**
- Produces: `state.profile.tourSeen: boolean` (default `false`); `state.feedback = { notes: [{ts:number, text:string}], pronIssues: { [itemId]: true } }`. Merge semantics: `tourSeen` OR; `notes` union deduplicated by `ts + "|" + text`, sorted by `ts` ascending; `pronIssues` key union.
- Consumes: existing `defaultState`/`normalizeState`/`mergeStates` structure, `unionObj` helper inside `mergeStates`.

- [ ] **Step 1: Add fields to `defaultState()`**

In `defaultState()`, after `placementDone: false` inside `profile`, add:

```js
        placementDone: false,   // Einstufungstest schon einmal gemacht?
        tourSeen: false         // App-Tour (Erklaer-Slideshow) gesehen/uebersprungen?
```

(Only the comma after `placementDone: false` and the new line change.) After the closing brace of `gamification: { ... }` and before the `// pro Item:` comment, add the new top-level object:

```js
      // Lokales Feedback: freie Notizen + als "Aussprache falsch" markierte Items.
      // Verlaesst das Geraet nur nutzerinitiiert (GitHub-Issue-Prefill / mailto).
      feedback: {
        notes: [],       // [{ ts, text }]
        pronIssues: {}   // { itemId: true }
      },
```

- [ ] **Step 2: Allowlist the fields in `normalizeState()`**

Inside the `if (raw.profile && ...)` block, after the `placementDone` line, add:

```js
      if (typeof raw.profile.tourSeen === "boolean") s.profile.tourSeen = raw.profile.tourSeen;
```

After the `log`-normalization block (the `if (raw.log && ...) { ... }` block) and before `return s;`, add:

```js
    // feedback (Allowlist): notes nur als Array sauberer {ts,text}-Objekte
    // (Text gekappt, damit kein Import den State aufblaeht), pronIssues nur
    // als Objekt-nicht-Array mit true-Werten.
    if (raw.feedback && typeof raw.feedback === "object" && !Array.isArray(raw.feedback)) {
      if (Array.isArray(raw.feedback.notes)) {
        raw.feedback.notes.forEach(function (n) {
          if (!n || typeof n !== "object" || Array.isArray(n)) return;
          var text = typeof n.text === "string" ? n.text.slice(0, 2000) : "";
          if (!text) return;
          s.feedback.notes.push({ ts: Math.max(0, Number(n.ts) || 0), text: text });
        });
      }
      var rp = raw.feedback.pronIssues;
      if (rp && typeof rp === "object" && !Array.isArray(rp)) {
        Object.keys(rp).forEach(function (id) { if (rp[id]) s.feedback.pronIssues[id] = true; });
      }
    }
```

Also update the comment above `normalizeState` from `/** Fremde/alte Daten defensiv in die aktuelle Struktur ueberfuehren. */` to:

```js
  /** Fremde/alte Daten defensiv in die aktuelle Struktur ueberfuehren
   *  (Allowlist: nur bekannte Felder mit gueltigen Typen werden uebernommen). */
```

- [ ] **Step 3: Merge the fields in `mergeStates()`**

In `mergeStates`, after the `mc.modulesDone = unionObj(...)` line, add:

```js
    // feedback: Notizen nach (ts, text) dedupliziert vereinigen, pronIssues vereinigen.
    var seenNotes = {};
    m.feedback.notes = a.feedback.notes.concat(b.feedback.notes).filter(function (n) {
      var k = n.ts + "|" + n.text;
      if (seenNotes[k]) return false;
      seenNotes[k] = true;
      return true;
    }).sort(function (x, y) { return x.ts - y.ts; });
    m.feedback.pronIssues = unionObj(a.feedback.pronIssues, b.feedback.pronIssues);
```

In the `// profile:` block of `mergeStates`, after the `m.profile.placementDone = ...` line, add:

```js
    m.profile.tourSeen = !!(a.profile.tourSeen || b.profile.tourSeen);
```

Also extend the doc comment above `mergeStates` (the bullet list): change the `- gamification:` line's following line to include feedback, i.e. add a bullet:

```js
   *  - feedback: notes vereinigt (dedupliziert nach ts+text), pronIssues vereinigt.
```

- [ ] **Step 4: Fix Allowlist wording in `CLAUDE.md`**

In `CLAUDE.md` line 55, replace:

```
- **normalizeState whitelistet Felder:** neue Felder in `profile`/`gamification` MÜSSEN dort
```

with:

```
- **normalizeState führt eine Allowlist:** neue Felder in `profile`/`gamification`/Top-Level MÜSSEN dort
```

(The rest of that bullet stays unchanged. Terminology rule: Allowlist/Denylist, never whitelist/blacklist, in all new and touched wording.)

- [ ] **Step 5: Syntax check**

Run: `cd app && node --check app.js`
Expected: no output, exit 0.

- [ ] **Step 6: Add regression checks**

In `app/test/regression.cjs`, insert a new section directly BEFORE `// --- 15. Konsolenfehler ---`:

```js
  // --- 14b. State-Schema: feedback + tourSeen (Allowlist, Merge) ---
  await page.evaluate(() => { localStorage.removeItem("tacheles_state_v1"); });
  await page.reload(); await page.waitForTimeout(500);
  const schema = await page.evaluate(() => {
    // frischer Default-State liegt nach init() im Storage
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      tourSeen: s.profile.tourSeen,
      fb: s.feedback,
      notesIsArr: Array.isArray(s.feedback && s.feedback.notes),
      pronIsObj: !!s.feedback && typeof s.feedback.pronIssues === "object" && !Array.isArray(s.feedback.pronIssues)
    };
  });
  check("Schema: feedback + tourSeen im Default-State (Allowlist)",
    schema.tourSeen === false && schema.notesIsArr && schema.pronIsObj, JSON.stringify(schema.fb));
  const fbRound = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback = { notes: [{ ts: 111, text: "Notiz A" }, { ts: 0, text: "" }, "junk"], pronIssues: { shalom: true } };
    s.profile.tourSeen = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return true;
  });
  await page.reload(); await page.waitForTimeout(500);
  const fbAfter = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return { notes: s.feedback.notes, pron: s.feedback.pronIssues, tourSeen: s.profile.tourSeen };
  });
  check("Schema: feedback ueberlebt Laden/Normalisieren (kaputte Notizen verworfen)",
    fbRound && fbAfter.notes.length === 1 && fbAfter.notes[0].text === "Notiz A" &&
    fbAfter.pron.shalom === true && fbAfter.tourSeen === true, JSON.stringify(fbAfter));
  const fbMerge = await page.evaluate(() => {
    const base = () => ({
      version: 1,
      profile: { onboarded: true },
      gamification: {}, srs: {}, log: {}
    });
    const A = base();
    A.feedback = { notes: [{ ts: 1, text: "gleich" }, { ts: 2, text: "nur A" }], pronIssues: { w1: true } };
    A.profile.tourSeen = false;
    const B = base();
    B.feedback = { notes: [{ ts: 1, text: "gleich" }, { ts: 3, text: "nur B" }], pronIssues: { w2: true } };
    B.profile.tourSeen = true;
    const m = window.TACHELES_DEBUG.mergeStates(A, B);
    return {
      texts: m.feedback.notes.map(n => n.text).join(","),
      pron: Object.keys(m.feedback.pronIssues).sort().join(","),
      tourSeen: m.profile.tourSeen
    };
  });
  check("merge: feedback.notes dedupliziert vereinigt, pronIssues vereinigt, tourSeen OR",
    fbMerge.texts === "gleich,nur A,nur B" && fbMerge.pron === "w1,w2" && fbMerge.tourSeen === true,
    JSON.stringify(fbMerge));
  // Zustand fuer nachfolgende Sektionen neutral hinterlassen (onboarded, tour gesehen).
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.profile.onboarded = true; s.profile.tourSeen = true; s.profile.autoplay = false; s.profile.micHintDismissed = true;
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(400);
```

Note: `localStorage.removeItem` at the start of this section triggers fresh onboarding on reload; the section only reads storage (init writes the default state via `saveState()` in `init()`), so no UI interaction is needed. The trailing seed restores an onboarded state so section 15 (console errors) sees a quiet page. (In Task 10 the tour lands; this section already seeds `tourSeen`, so it needs no further change then.)

- [ ] **Step 7: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, all checks green (85 existing + 3 new), exit 0. The Alt-State check (section 13) must be green.

- [ ] **Step 8: Commit**

```bash
git add app/app.js app/test/regression.cjs CLAUDE.md
git commit -m "feat: state schema for feedback and tourSeen (allowlist, merge)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Mastery reform (recognition vs production, first-contact rule, harder MC)

Spec 1.1. Recognition answers cap `mastery` at 2; only a production answer with grade good/easy reaches 3+ ("gemeistert"). The first query of a word introduced in the SAME session does not raise mastery at all (SRS scheduling/XP unaffected). MC always has 4 options with similarity-scored distractors, and no renderer leaks the answer right before the question.

**Files:**
- Modify: `app/app.js`:
  - new `RECALL_KIND` + `isProduction(mode, dir)` (insert directly above `recordAnswer`, section 6, ~line 609)
  - `rateItem(id, grade)` ~445 (new optional `masteryCap` param)
  - `recordAnswer(itemId, mode, grade)` ~613 (new optional `dir` param, cap logic)
  - `renderFlash` grade handler ~2318, `buildOptionButtons` ~2513, `renderIntro` ~2237, `renderModuleTeach` ~3794, `moduleOptionButtons` ~3837, `moduleChoiceButtons` ~3958
  - `pickDistractors` ~2452 (always use similarity scoring)
  - `window.TACHELES_DEBUG` ~4275 (expose helpers for tests)
- Test: `app/test/regression.cjs` (new section 14c before section 15)

**Interfaces:**
- Produces: `isProduction(mode, dir)` -> boolean (`true` for `mode` in `{build, speak}` or `dir === "de2he"`); `rateItem(id, grade, masteryCap)` where `masteryCap` (default 5) limits mastery INCREASES only (never demotes); `recordAnswer(itemId, mode, grade, dir)`; `session.introducedThisSession[itemId]` transient set. Debug: `TACHELES_DEBUG.isProduction`, `.getMastery`, `.recordAnswer`, `.currentTaskItem`.
- Consumes: `getMastery`, `session`, `renderIntro`/`renderModuleTeach` teach moments.

Classification (resolved from spec lists): production = `build` (Satzbau), `speak` (Sprechen), any answer with `dir === "de2he"` (MC de->he, Karte de->he, Modul-Pairquiz with Hebrew options, Grammatik cloze/form). Everything else is recognition: MC/Karte he->de, `listen`, `audio2de`, `swipe`, `match`, `reel`, `signs`, `image`, `dialog`, `blitz` (books as `mc` he->de), audio course self-grades (`listen`).

- [ ] **Step 1: Add classification helpers**

Insert directly above `function recordAnswer(...)` (after the `bumpAnswersTotal`-preceding comment block of section 6, i.e. right before the `/**\n * Zentrale Verbuchung ...` comment):

```js
  /* Aufgaben-Klassifikation (ehrliche Mastery, R-Spec 1.1):
   * "production" = die hebraeische Form muss aktiv produziert werden
   * (Satzbau, Sprechen, jede de->he-Abfrage inkl. Grammatik cloze/form).
   * Alles andere ist "recognition" (Erkennen) und deckelt mastery bei 2. */
  var RECALL_KIND = { build: "production", speak: "production" };

  function isProduction(mode, dir) {
    if (RECALL_KIND[mode] === "production") return true;
    return dir === "de2he";
  }
```

- [ ] **Step 2: Add the mastery cap to `rateItem`**

Change the signature and the two mastery-raising cases:

```js
  /** Wendet eine Bewertung auf den SRS-Zustand eines Items an.
   *  masteryCap (Default 5) begrenzt nur den ANSTIEG der Mastery dieser einen
   *  Bewertung (Erkennen deckelt bei 2, Erstkontakt bei "keinem Anstieg");
   *  Absenkungen ("again") und die SRS-Planung sind nie betroffen. */
  function rateItem(id, grade, masteryCap) {
    var cap = masteryCap === undefined ? 5 : masteryCap;
```

In `case "good":` replace `e.mastery = Math.min(5, e.mastery + 1);` with:

```js
        if (e.mastery < cap) e.mastery = Math.min(cap, e.mastery + 1);
```

In `case "easy":` replace `e.mastery = Math.min(5, e.mastery + 1);` with the identical line:

```js
        if (e.mastery < cap) e.mastery = Math.min(cap, e.mastery + 1);
```

(`again` still lowers mastery; `hard` never raised it, which already satisfies "Schwer hebt nie über 2".)

- [ ] **Step 3: Apply classification + first-contact rule in `recordAnswer`**

Change the head of `recordAnswer` from:

```js
  function recordAnswer(itemId, mode, grade) {
    ...
    var masteryBefore = getMastery(itemId);

    rateItem(itemId, grade);
```

to:

```js
  function recordAnswer(itemId, mode, grade, dir) {
    // "Richtig" = gewusst. ... (bestehender Kommentar bleibt)
    var correct = grade !== "again";
    var wasDue = isDue(itemId, Date.now());
    var masteryBefore = getMastery(itemId);

    // Ehrliche Mastery (1.1): Erkennen hebt hoechstens auf 2; erst Produktion
    // (good/easy) erreicht 3+. Der ERSTE Abruf eines in DIESER Session frisch
    // vorgestellten Worts erhoeht die Mastery gar nicht (nur SRS-Planung/XP).
    var cap = isProduction(mode, dir) ? 5 : 2;
    if (session && session.introducedThisSession && session.introducedThisSession[itemId]) {
      delete session.introducedThisSession[itemId];
      cap = masteryBefore;
    }
    rateItem(itemId, grade, cap);
```

- [ ] **Step 4: Mark teach moments in the session**

In `renderIntro(task, title)`, directly after `var item = task.item;`, add:

```js
    // Erstkontakt-Merker (1.1): die erste Abfrage dieses Worts in DIESER
    // Session zaehlt nicht fuer die Mastery.
    if (session) {
      if (!session.introducedThisSession) session.introducedThisSession = {};
      session.introducedThisSession[item.id] = true;
    }
```

In `renderModuleTeach(step, title)`, directly after the `if (!item) return moduleStepNext();` line, add the identical block (same 5 lines, same comment shortened to `// Erstkontakt-Merker (1.1), siehe renderIntro.`).

- [ ] **Step 5: Pass `dir` from all callers that have one**

1. `renderFlash` grade handler (~2319): change `recordAnswer(item.id, "flash", def[0]);` to `recordAnswer(item.id, "flash", def[0], task.dir);`
2. `buildOptionButtons` (~2513): change `recordAnswer(item.id, mode, correct ? "good" : "again");` to `recordAnswer(item.id, mode, correct ? "good" : "again", task && task.dir);` (renderMC de2he/he2de/audio2de tasks carry `task.dir`; image/listen/signs pass tasks without `dir` -> recognition, as classified).
3. `moduleOptionButtons` (~3837): change `recordAnswer(item.id, "mc", correct ? "good" : "again");` to `recordAnswer(item.id, "mc", correct ? "good" : "again", optionKind === "he" ? "de2he" : "he2de");` (Pairquiz asks de -> he options = production, like MC de->he).
4. `moduleChoiceButtons` (~3958): change `recordAnswer(step.itemId, "mc", correct ? "good" : "again");` to `recordAnswer(step.itemId, "mc", correct ? "good" : "again", "de2he");` (Grammatik cloze/form = production per spec).

All other `recordAnswer` call sites (`listen`, `speak`, `match`, `swipe`, `signs`, `build`, `reel`, `dialog`, audio course) stay unchanged; their classification comes from `mode` alone.

- [ ] **Step 6: Harder MC selection (always similarity-scored, always 4 options)**

In `pickDistractors(item, n)` (~2452), replace the mastery-gated branch:

```js
    if (getMastery(item.id) >= 2) {
      // 3a. Schwerer: nach Aehnlichkeit sortiert (+ kleiner Jitter) die Top-n.
      var scored = pool.map(function (c) { return { c: c, s: distractorScore(item, c) + Math.random() }; });
      scored.sort(function (a, b) { return b.s - a.s; });
      for (var i = 0; i < scored.length && out.length < n; i++) tryAdd(scored[i].c);
    } else {
      // 3b. Freundlich: gleiches Thema zuerst, dann Rest, jeweils zufaellig.
      var same = shuffle(pool.filter(function (x) { return x.theme === item.theme; }).slice());
      var other = shuffle(pool.filter(function (x) { return x.theme !== item.theme; }).slice());
      [same, other].forEach(function (src) {
        for (var j = 0; j < src.length && out.length < n; j++) tryAdd(src[j]);
      });
    }
```

with the unconditional scored path (harder selection for everyone, spec 1.1 "Härtere Auswahl"):

```js
    // 3. Immer nach Aehnlichkeit sortiert (+ kleiner Jitter) die Top-n:
    // plausible Distraktoren statt Raten "an der Wortlaenge" (1.1).
    var scored = pool.map(function (c) { return { c: c, s: distractorScore(item, c) + Math.random() }; });
    scored.sort(function (a, b) { return b.s - a.s; });
    for (var i = 0; i < scored.length && out.length < n; i++) tryAdd(scored[i].c);
```

(The `// 5. Notfall-Auffuellung` block below stays: it guarantees 4 options even in tiny pools. `buildOptionButtons` already builds `[item].concat(pickDistractors(item, 3))` = 4 options.)

- [ ] **Step 7: Audit "answer not shown right before the question"**

Verify (read, change only if a leak exists; with the current code none is expected):
- `renderMC` he2de and `renderFlash` he2de pass `quiz: true` to `heEl` (hides the translit for letters, which would BE the answer). Both already do.
- `renderModuleQuiz` passes `quiz: true`. Already does.
- The intro card (`renderIntro`) shows the full answer by design (Teach-First); the immediately following query no longer raises mastery via the first-contact rule from Step 3, so the "free" mastery point from copying the just-shown answer is gone. No renderer change needed.

- [ ] **Step 8: Expose test helpers in `TACHELES_DEBUG`**

In the `window.TACHELES_DEBUG = { ... }` object, after `bandUnlocked: ...`, add:

```js
    // Mastery-Reform (Tests): Klassifikation, direkte Verbuchung, Mastery-Read.
    isProduction: function (mode, dir) { return isProduction(mode, dir); },
    getMastery: function (id) { return getMastery(id); },
    recordAnswer: function (id, mode, grade, dir) { return recordAnswer(id, mode, grade, dir); },
    // Item-ID der aktuellen Session-Aufgabe (fuer den Erstkontakt-Test).
    currentTaskItem: function () {
      if (!session || !session.tasks) return null;
      var t = session.tasks[session.i];
      return t ? t.item.id : null;
    },
```

- [ ] **Step 9: Add regression checks (section 14c, before section 15, after 14b)**

```js
  // --- 14c. Ehrliche Mastery: Erkennen deckelt bei 2, Produktion hebt auf 3 ---
  const mastery = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return {
      cls: D.isProduction("mc", "he2de") === false && D.isProduction("mc", "de2he") === true &&
           D.isProduction("build") === true && D.isProduction("speak") === true &&
           D.isProduction("swipe") === false && D.isProduction("listen") === false
    };
  });
  check("Mastery: Klassifikation Erkennen/Produzieren (isProduction)", mastery.cls);
  await page.reload(); await page.waitForTimeout(500);
  const capRes = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const id = window.TACHELES_CONTENT.items[0].id;
    // 5x Erkennen richtig: darf nie ueber 2 kommen.
    for (let i = 0; i < 5; i++) D.recordAnswer(id, "mc", "good", "he2de");
    const afterRecog = D.getMastery(id);
    // 1x Produktion richtig: hebt auf 3 (gemeistert).
    D.recordAnswer(id, "mc", "good", "de2he");
    const afterProd = D.getMastery(id);
    // Erkennen demotet ein 3+-Item NICHT.
    D.recordAnswer(id, "mc", "good", "he2de");
    const stillMastered = D.getMastery(id);
    return { afterRecog, afterProd, stillMastered };
  });
  check("Mastery: reines Erkennen deckelt bei 2", capRes.afterRecog === 2, capRes.afterRecog);
  check("Mastery: Produktionsantwort hebt auf 3", capRes.afterProd === 3, capRes.afterProd);
  check("Mastery: Erkennen senkt Gemeistertes nicht", capRes.stillMastered === 3, capRes.stillMastered);

  // Erstkontakt zaehlt nicht: frisches Wort in einer Smart-Session vorstellen,
  // sofort korrekt beantworten -> Mastery bleibt 0.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = document.querySelector("#cta-start"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const introId = await page.evaluate(() => window.TACHELES_DEBUG.currentTaskItem());
  check("Erstkontakt: Intro-Karte zu einem neuen Wort", !!introId &&
    await page.evaluate(() => !!document.querySelector(".intro-tag")), introId);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test(x.textContent.trim())); if (b) b.click(); });
  await page.waitForTimeout(450);
  // Die unmittelbar folgende Abfrage desselben Worts KORREKT beantworten.
  await page.evaluate((id) => {
    // MC he->de: richtige Option per data-item-id; Flash: Aufdecken + "Gut".
    const opt = document.querySelector('.opt[data-item-id="' + id + '"]');
    if (opt) { opt.click(); return; }
    const reveal = [...document.querySelectorAll("button")].find(x => /aufdecken/i.test(x.textContent));
    if (reveal) { reveal.click(); }
  }, introId);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const g = [...document.querySelectorAll(".grade-btn")].find(x => /gut/i.test(x.textContent));
    if (g) g.click();
  });
  await page.waitForTimeout(400);
  const firstContactMastery = await page.evaluate((id) => window.TACHELES_DEBUG.getMastery(id), introId);
  check("Erstkontakt: erste Abfrage nach der Vorstellung hebt Mastery NICHT",
    firstContactMastery === 0, introId + " -> " + firstContactMastery);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);

  // MC hat immer 4 Optionen; Buchstaben-Frage verraet die Umschrift nicht.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    // ein paar Woerter "gelernt", damit MC ohne Intro startet
    window.TACHELES_CONTENT.items.slice(0, 10).forEach(i => {
      s.srs[i.id] = { ease: 2.5, intervalDays: 2, dueTs: Date.now() - 1000, reps: 2, lapses: 0, mastery: 1, lastReviewTs: Date.now() - 86400000 };
    });
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-mode]")].find(x => x.dataset.mode === "mc"); if (b) b.click(); });
  await page.waitForTimeout(500);
  let sawFourOpts = false;
  for (let i = 0; i < 6; i++) {
    const optCount = await page.evaluate(() => document.querySelectorAll(".opt:not(:disabled)").length);
    if (optCount > 0) { sawFourOpts = optCount === 4; break; }
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter|aufdecken/i.test(x.textContent.trim())); if (b) b.click(); });
    await page.waitForTimeout(400);
  }
  check("MC zeigt immer 4 Optionen", sawFourOpts);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);
```

Note: the flash fallback in the first-contact block covers the case that the requeued task type differs; the immediate post-intro task is always the SAME item (`renderTask` re-renders the current task with `introduced: true`), so `currentTaskItem` before "Weiter" identifies it.

- [ ] **Step 10: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0. Watch specifically: existing sections 2b (Intro), 4 (MC loop), 10 (Module) and 13 (Alt-State) stay green; new 14c checks green.

- [ ] **Step 11: Commit**

```bash
git add app/app.js app/test/regression.cjs
git commit -m "feat: honest mastery (recognition caps at 2, production reaches 3+, first-contact rule, scored distractors)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `demoteMastery` + actionable gold toast (mastery veto)

Spec 1.2 (first half). When an item flips to `mastery >= 3`, the existing gold toast in `recordAnswer` becomes tappable: tapping it demotes the item back to 2. `demoteMastery` is also the shared primitive for Task 4 (Mastery-Check) and Task 7 (vocab browser).

**Files:**
- Modify: `app/app.js`: `toast(msg, cls)` ~84 (optional `onTap`), new `demoteMastery(itemId)` (insert directly after `updateMasteredCount()` ~507), gold toast in `recordAnswer` ~631, `TACHELES_DEBUG`
- Modify: `app/styles.css` (append `.toast.tappable`)
- Test: `app/test/regression.cjs` (section 14d)

**Interfaces:**
- Produces: `demoteMastery(itemId)` -> boolean (`true` if demoted 3+ -> 2; `false` no-op when not mastered); `toast(msg, cls, onTap)` (third param optional, backward compatible). Debug: `TACHELES_DEBUG.demoteMastery`.
- Consumes: `state.srs`, `updateMasteredCount`, `saveState`, `getMastery` (Task 2's debug exposure used in tests).

- [ ] **Step 1: Extend `toast` with an optional tap action**

Replace the body of `toast(msg, cls)`:

```js
  var liveToasts = [];
  /** Toast; optionales onTap macht ihn antippbar (z. B. Mastery-Veto). */
  function toast(msg, cls, onTap) {
    var t = el("div", "toast" + (cls ? " " + cls : ""), msg);
    t.style.bottom = (90 + liveToasts.length * 54) + "px";
    liveToasts.push(t);
    var dismiss = function () {
      var idx = liveToasts.indexOf(t);
      if (idx >= 0) liveToasts.splice(idx, 1);
      t.remove();
    };
    if (onTap) {
      t.classList.add("tappable");
      t.setAttribute("role", "button");
      t.addEventListener("click", function () { onTap(); dismiss(); });
    }
    document.body.appendChild(t);
    setTimeout(dismiss, cls === "gold" ? 3600 : 2600);
  }
```

- [ ] **Step 2: Add `demoteMastery`**

Insert directly after `updateMasteredCount()`:

```js
  /** Mastery-Veto (1.2): setzt ein gemeistertes Item zurueck auf 2 ("in
   *  Arbeit"); SRS-Plan bleibt unangetastet. No-Op fuer nicht-gemeisterte. */
  function demoteMastery(itemId) {
    var e = state.srs[itemId];
    if (!e || typeof e !== "object" || (e.mastery || 0) < 3) return false;
    e.mastery = 2;
    updateMasteredCount();
    saveState();
    return true;
  }
```

- [ ] **Step 3: Make the gold toast actionable**

In `recordAnswer`, replace:

```js
      var mItem = itemById(itemId);
      if (mItem) toast("🏅 " + mItem.he + " (" + mItem.de + ") sitzt!", "gold");
```

with:

```js
      var mItem = itemById(itemId);
      if (mItem) {
        toast("🏅 " + mItem.he + " (" + mItem.de + ") sitzt! · tippen zum Ablehnen", "gold", function () {
          if (demoteMastery(itemId)) toast("Okay, zählt noch nicht als gemeistert. 💪");
        });
      }
```

- [ ] **Step 4: Style + debug exposure**

Append to `app/styles.css`:

```css
/* Antippbarer Toast (Mastery-Veto) */
.toast.tappable { cursor: pointer; }
```

In `TACHELES_DEBUG`, after `recordAnswer: ...`, add:

```js
    demoteMastery: function (id) { return demoteMastery(id); },
```

- [ ] **Step 5: Add regression checks (section 14d)**

```js
  // --- 14d. Mastery-Veto: demoteMastery + antippbarer Gold-Toast ---
  const veto = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const it = window.TACHELES_CONTENT.items[1];
    s.srs = {};
    s.srs[it.id] = { ease: 2.5, intervalDays: 5, dueTs: Date.now() + 86400000, reps: 4, lapses: 0, mastery: 4, lastReviewTs: Date.now() };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return it.id;
  });
  await page.reload(); await page.waitForTimeout(500);
  const vetoRes = await page.evaluate((id) => {
    const D = window.TACHELES_DEBUG;
    const before = JSON.parse(localStorage.getItem("tacheles_state_v1")).gamification.masteredCount;
    const ok = D.demoteMastery(id);
    const after = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const noop = D.demoteMastery(id); // jetzt mastery 2 -> No-Op
    return { ok, noop, mastery: after.srs[id].mastery, before, after: after.gamification.masteredCount };
  }, veto);
  check("Veto: demoteMastery setzt 3+ auf 2, masteredCount sinkt",
    vetoRes.ok === true && vetoRes.mastery === 2 && vetoRes.after === vetoRes.before - 1,
    JSON.stringify(vetoRes));
  check("Veto: Demotion eines nicht-gemeisterten Items ist No-Op", vetoRes.noop === false);
  // Gold-Toast mit Veto: Item auf mastery 2 + Produktionsantwort -> Toast, Tipp -> zurueck auf 2.
  const toastVeto = await page.evaluate((id) => {
    const D = window.TACHELES_DEBUG;
    D.recordAnswer(id, "mc", "good", "de2he"); // 2 -> 3, Gold-Toast erscheint
    const t = [...document.querySelectorAll(".toast.gold")].find(x => /ablehnen/i.test(x.textContent));
    if (!t) return { found: false };
    t.click();
    return { found: true, mastery: D.getMastery(id) };
  }, veto);
  check("Veto: Gold-Toast ist antippbar und demotet", toastVeto.found && toastVeto.mastery === 2,
    JSON.stringify(toastVeto));
```

- [ ] **Step 6: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: mastery veto via demoteMastery and tappable gold toast

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Mastery-Check (re-test mode over mastered items)

Spec 1.2 (second half). A dedicated check mode over mastered items only, in chunks of 6, preferring the least-recently-reviewed mastered items (rotation via existing `lastReviewTs`, no new persistent fields). After the round: a checkbox selection view, wrong-answered items preselected; "Zurücknehmen" demotes exactly the checked ones.

**Files:**
- Modify: `app/app.js`: `MODE_TITLES` ~1713, `startSession` (new `mastercheck` branch, insert after the `module` branch ~1811), `renderTask` head ~2109 (review hook), new `renderMasteryCheckReview()` (insert after `renderDone` ~3347), `renderProgress` ~1501 (entry card), `TACHELES_DEBUG` (`sessionInfo`)
- Modify: `app/styles.css` (append `.mcheck-*`)
- Test: `app/test/regression.cjs` (section 14e)

**Interfaces:**
- Produces: `startSession("mastercheck")`; `session.masteryCheck = true`; `renderMasteryCheckReview()`. Debug: `TACHELES_DEBUG.sessionInfo()` -> `{ mode, taskIds }` or `null`.
- Consumes: `demoteMastery` (Task 3), `getMastery`, `getSrs`, `session.seenIds`/`seenList` (already filled by `recordAnswer`), `sessionShell`, `endSession`.

Resolved design details: tasks are all `kind: "mc"` with alternating `dir` (`he2de` = Erkennen, `de2he` = Produzieren), which satisfies "Aufgaben wie im normalen Lernen (Erkennen/Produzieren)" and keeps the round drivable in tests. Note that a wrong answer already demotes via SRS (`again` lowers mastery 3 -> 2); the preselected checkbox then confirms it (demote is a no-op) and the checkbox UI is authoritative for items the user doubts despite answering correctly. Quitting mid-round skips the review screen (accepted).

- [ ] **Step 1: Register the mode title**

In `MODE_TITLES`, after `module: "Modul"` add:

```js
    , mastercheck: "Mastery-Check"
```

- [ ] **Step 2: Add the `mastercheck` branch in `startSession`**

Insert after the `} else if (modeId === "module") { ... }` branch and before the final `} else {`:

```js
    } else if (modeId === "mastercheck") {
      // Mastery-Check (1.2): Haeppchen-Wiederholung NUR ueber gemeisterte
      // Items. Rotation ohne neues Feld: am laengsten ungeprueft zuerst
      // (lastReviewTs aufsteigend) + etwas Zufall, damit ueber die Runden
      // alle drankommen.
      var mastered = CONTENT.items.filter(function (it) { return getMastery(it.id) >= 3; });
      if (!mastered.length) { session = null; toast("Noch nichts gemeistert – erst lernen, dann prüfen. 🙂"); return; }
      mastered.sort(function (a, b) { return (getSrs(a.id).lastReviewTs || 0) - (getSrs(b.id).lastReviewTs || 0); });
      var chunk = shuffle(mastered.slice(0, 10)).slice(0, 6);
      session.tasks = chunk.map(function (it, idx) {
        // Erkennen und Produzieren im Wechsel (wie im normalen Lernen).
        return { item: it, kind: "mc", dir: idx % 2 === 0 ? "he2de" : "de2he", requeued: false };
      });
      session.i = 0;
      session.masteryCheck = true;
      session.label = "🏅 Mastery-Check";
```

(Note: `getSrs` creates a default entry when missing; mastered items always have one, so no state pollution.)

- [ ] **Step 3: Hook the review screen at end of tasks**

In `renderTask()`, replace the first two lines:

```js
    var task = session.tasks[session.i];
    if (!task) return endSession();
```

with:

```js
    var task = session.tasks[session.i];
    if (!task) {
      // Mastery-Check: vor dem Abschluss die Auswahl-Ansicht (Zuruecknehmen).
      if (session.masteryCheck) return renderMasteryCheckReview();
      return endSession();
    }
```

- [ ] **Step 4: Add `renderMasteryCheckReview()`**

Insert after `renderDone(stats)`:

```js
  /** Mastery-Check-Abschluss (1.2): Items der Runde mit Checkboxen; falsch
   *  beantwortete sind vorausgewaehlt. "Zuruecknehmen" demotet die angehakten,
   *  der Rest bleibt gemeistert. Danach normaler Abschluss-Screen. */
  function renderMasteryCheckReview() {
    var s = session;
    if (!s) return;
    setOptKeys(null);
    var body = sessionShell("🏅 Mastery-Check · Runde fertig", 1);
    body.appendChild(el("div", "task-question", "Sitzt das wirklich noch? Hake an, was zurück in die Übung soll."));
    var list = el("div", "mcheck-list");
    var boxes = {};
    (s.seenList || []).forEach(function (id) {
      var item = itemById(id);
      if (!item) return;
      var row = el("label", "mcheck-row");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !s.seenIds[id]; // falsch beantwortete vorausgewaehlt
      boxes[id] = cb;
      row.appendChild(cb);
      var he = el("span", "done-review-he", item.he);
      he.dir = "rtl"; he.lang = "he";
      row.appendChild(he);
      row.appendChild(el("span", "done-review-de", item.de));
      row.appendChild(el("span", "mcheck-mark " + (s.seenIds[id] ? "ok" : "re"), s.seenIds[id] ? "✓" : "✗"));
      list.appendChild(row);
    });
    body.appendChild(list);
    var actions = el("div", "done-actions");
    actions.appendChild(btn("Ausgewählte zurücknehmen", "btn primary", function () {
      var n = 0;
      Object.keys(boxes).forEach(function (id) { if (boxes[id].checked && demoteMastery(id)) n++; });
      if (n) toast("💪 " + n + (n === 1 ? " Wort" : " Wörter") + " zurück in die Übung.");
      endSession();
    }));
    actions.appendChild(btn("Alles bleibt gemeistert", "btn ghost", function () { endSession(); }));
    body.appendChild(actions);
  }
```

- [ ] **Step 5: Entry point on the Fortschritt screen**

In `renderProgress()`, directly after the Alef-Bet-Tafel `</section>` card (`'<button class="btn" id="btn-alefbet">Ansehen</button>' + '</section>' +`), insert:

```js
      (state.gamification.masteredCount > 0 ?
        '<section class="card exam-card">' +
        '<div><div class="setting-label">🏅 Mastery-Check</div>' +
        '<div class="setting-sub">Sitzt das wirklich noch? Kurze Prüf-Häppchen über deine gemeisterten Wörter, ' +
        'mit der Möglichkeit, einzelne zurückzunehmen.</div></div>' +
        '<button class="btn" id="btn-mastercheck">Start</button>' +
        '</section>' : '') +
```

And in the wiring section of `renderProgress` (after `$("#btn-alefbet").addEventListener(...)`):

```js
    var mcheckBtn = $("#btn-mastercheck");
    if (mcheckBtn) mcheckBtn.addEventListener("click", function () { startSession("mastercheck"); });
```

- [ ] **Step 6: Styles + debug**

Append to `app/styles.css`:

```css
/* Mastery-Check Auswahl-Ansicht */
.mcheck-list { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 420px; margin: 10px auto; }
.mcheck-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--card, #fff); border: 1px solid var(--line); border-radius: 12px; cursor: pointer; }
.mcheck-row input[type="checkbox"] { width: 20px; height: 20px; accent-color: var(--primary); }
.mcheck-mark { margin-left: auto; font-weight: 700; }
.mcheck-mark.ok { color: var(--ok, #2e7d32); }
.mcheck-mark.re { color: var(--danger, #c62828); }
```

(Check the variable names against the top of `styles.css`; if `--ok`/`--danger`/`--card` do not exist there, use the concrete fallback colors given.)

In `TACHELES_DEBUG`, after `demoteMastery: ...`, add:

```js
    // Aktuelle Session (Modus + Task-Item-IDs) fuer Mastery-Check-/Heute-Tests.
    sessionInfo: function () {
      if (!session) return null;
      return { mode: session.mode, taskIds: (session.tasks || []).map(function (t) { return t.item.id; }) };
    },
```

- [ ] **Step 7: Add regression checks (section 14e)**

```js
  // --- 14e. Mastery-Check: nur Gemeisterte, least-recently-checked, Review-Demote ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {};
    // 8 gemeisterte Items mit gestaffeltem lastReviewTs; das aelteste zuerst erwartet.
    window.TACHELES_CONTENT.items.slice(0, 8).forEach((it, i) => {
      s.srs[it.id] = { ease: 2.5, intervalDays: 10, dueTs: Date.now() + 86400000, reps: 5, lapses: 0, mastery: 3, lastReviewTs: 1000 + i };
    });
    // plus 1 NICHT gemeistertes Item, das nie auftauchen darf
    const extra = window.TACHELES_CONTENT.items[9];
    s.srs[extra.id] = { ease: 2.5, intervalDays: 2, dueTs: 0, reps: 2, lapses: 0, mastery: 1, lastReviewTs: 1 };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "progress"); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Mastery-Check: Start-Karte auf Fortschritt", await page.evaluate(() => !!document.querySelector("#btn-mastercheck")));
  await page.evaluate(() => { const b = document.querySelector("#btn-mastercheck"); if (b) b.click(); });
  await page.waitForTimeout(450);
  const mchk = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const info = D.sessionInfo();
    const masteredIds = window.TACHELES_CONTENT.items.slice(0, 8).map(i => i.id);
    return {
      mode: info && info.mode,
      n: info ? info.taskIds.length : 0,
      onlyMastered: info ? info.taskIds.every(id => masteredIds.includes(id)) : false,
      taskIds: info ? info.taskIds : []
    };
  });
  check("Mastery-Check: Session nur ueber gemeisterte Items, Haeppchen-Groesse",
    mchk.mode === "mastercheck" && mchk.n === 6 && mchk.onlyMastered, JSON.stringify(mchk));
  // Runde durchspielen: erste Aufgabe FALSCH, Rest richtig (Weiter-Button nach Fehler!).
  let mcheckWrongId = null;
  for (let i = 0; i < 20; i++) {
    const st = await page.evaluate(() => ({
      review: !!document.querySelector(".mcheck-list"),
      curId: window.TACHELES_DEBUG.currentTaskItem(),
      hasOpt: !!document.querySelector(".opt:not(:disabled)"),
      hasWeiter: !![...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim()))
    }));
    if (st.review) break;
    if (st.hasWeiter) {
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter$/i.test((x.textContent || "").trim())); if (b) b.click(); });
    } else if (st.hasOpt) {
      if (mcheckWrongId === null) {
        mcheckWrongId = st.curId;
        await page.evaluate((id) => {
          const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
          const wrong = btns.find(b => b.dataset.itemId && b.dataset.itemId !== id);
          (wrong || btns[0]).click();
        }, st.curId);
      } else {
        await page.evaluate((id) => {
          const right = document.querySelector('.opt[data-item-id="' + id + '"]');
          const btns = [...document.querySelectorAll(".opt:not(:disabled)")];
          (right || btns[0]).click();
        }, st.curId);
      }
    }
    await page.waitForTimeout(1200);
  }
  const review = await page.evaluate((wrongId) => {
    const rows = [...document.querySelectorAll(".mcheck-row")];
    const checked = rows.filter(r => r.querySelector("input").checked).length;
    return { rows: rows.length, checked, hasList: !!document.querySelector(".mcheck-list") };
  }, mcheckWrongId);
  check("Mastery-Check: Runden-Abschluss zeigt Auswahl, Falsche vorausgewaehlt",
    review.hasList && review.rows >= 6 && review.checked >= 1, JSON.stringify(review));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /zurücknehmen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(500);
  const afterDemote = await page.evaluate((wrongId) => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const masteredLeft = window.TACHELES_CONTENT.items.slice(0, 8)
      .filter(i => s.srs[i.id] && s.srs[i.id].mastery >= 3).length;
    return { wrongMastery: s.srs[wrongId] ? s.srs[wrongId].mastery : null, masteredLeft, done: !!document.querySelector(".done-screen") };
  }, mcheckWrongId);
  check("Mastery-Check: Zuruecknehmen stuft genau die Angehakten zurueck",
    afterDemote.wrongMastery === 2 && afterDemote.masteredLeft >= 5 && afterDemote.done, JSON.stringify(afterDemote));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
```

Note on timing: a wrong MC answer shows a "Weiter" button (must be clicked before the next `.opt` appears, see CLAUDE.md gotcha); a correct answer auto-advances after ~1000 ms, hence the 1200 ms waits. The wrong-answered item is also requeued once (`requeueOnWrong`); the loop answers it correctly the second time, and `seenIds` keeps the FIRST result, so it stays preselected.

- [ ] **Step 8: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0.

- [ ] **Step 9: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: mastery check mode with post-round demote selection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Daily "Heute" block on Home (Buchstabe/Wort des Tages, Häppchen)

Spec 1.3. New Home block at the top: letter of the day + word of the day (deterministic via date hash over unlocked material, stable all day, never `Math.random`), a Häppchen button (mini session of 5), tasks more prominent. Existing Home elements (`#cta-start`, `.next-card`, `.today-line`, Modi, Themen) stay.

**Files:**
- Modify: `app/app.js`: refactor `audioHash` ~849 into `fnv1a` + keep `audioHash`, new `dayHash(s)` and `dailyPicks()` (insert into section 1 helpers after `todayStr()` for `dayHash`; `dailyPicks` after `unlockedItemCount()` ~533), `startSession` head ~1723 (`opts.size`), `renderHome` ~1371 (new block), `TACHELES_DEBUG`
- Modify: `app/styles.css` (append `.today-card` etc.)
- Test: `app/test/regression.cjs` (section 14f)

**Interfaces:**
- Produces: `fnv1a(s)` -> unsigned 32-bit int; `dayHash(s)` (alias of `fnv1a`, semantic name for date-keyed picks); `dailyPicks()` -> `{ letter: item|null, word: item|null }`; `startSession(modeId, opts)` honors `opts.size`. Debug: `TACHELES_DEBUG.dayHash`, `.dailyPicks()` -> `{ letter: id, word: id }`.
- Consumes: `todayStr()`, `ALEFBET_ORDER` (defined later in the file but assigned before any render runs, safe), `bandUnlocked`/`itemBand`, `say`, `startSession`.

- [ ] **Step 1: Refactor the FNV hash and add `dayHash`**

Replace `audioHash` (section 8b, ~849) with:

```js
  /** FNV-1a (32-bit) als unsigned int. Gemeinsamer Kern fuer audioHash und
   *  dayHash (deterministisch, KEIN Math.random). */
  function fnv1a(s) {
    var h = 0x811c9dc5 >>> 0;
    s = String(s == null ? "" : s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }

  /** FNV-1a -> 8 Hex-Zeichen. IDENTISCH zu audioHash() in tools/audio-lib.cjs,
   *  damit die App genau die dort erzeugten Dateinamen findet (Dialog/Grammatik). */
  function audioHash(s) {
    return ("0000000" + fnv1a(s).toString(16)).slice(-8);
  }
```

And add in section 1 (small helpers), directly after `function todayStr() { ... }`:

```js
  /** Deterministischer Tages-Hash ("des Tages"-Auswahl): stabil ueber den Tag,
   *  lokales Datum via dateStr()/todayStr(), niemals Math.random. */
  function dayHash(s) { return fnv1a(s); }
```

(`fnv1a` is declared later in the file; function declarations hoist inside the IIFE, so `dayHash` may reference it. Verify with `node --check` + the audio regression check 14, which pins `audioHash` behavior via `audio/shalom.opus` mapping and the `h_`-key dialog clips.)

- [ ] **Step 2: Add `dailyPicks()`**

Insert after `unlockedItemCount()` (end of section 5):

```js
  /** "Heute"-Auswahl (1.3): Buchstabe + Wort des Tages, deterministisch per
   *  Datums-Hash aus dem freigeschalteten Material. Faellt nie leer aus,
   *  solange Content da ist (Buchstaben sind A0 = immer offen; Wort-Fallback
   *  ignoriert notfalls das Gating). */
  function dailyPicks() {
    var key = todayStr();
    var letters = ALEFBET_ORDER.map(itemById).filter(Boolean);
    var letter = letters.length ? letters[dayHash(key + "|letter") % letters.length] : null;
    var pool = CONTENT.items.filter(function (it) {
      return it.type !== "letter" && bandUnlocked(itemBand(it));
    });
    if (!pool.length) pool = CONTENT.items.filter(function (it) { return it.type !== "letter"; });
    var word = pool.length ? pool[dayHash(key + "|word") % pool.length] : null;
    return { letter: letter, word: word };
  }
```

- [ ] **Step 3: `startSession` honors `opts.size`**

In `startSession`, change `var size = sessionSize();` to:

```js
    var size = opts.size ? clamp(opts.size, 1, 20) : sessionSize();
```

- [ ] **Step 4: Render the Heute block on Home**

In `renderHome()`, insert a new IIFE section into the `app.innerHTML` template, directly AFTER the `'</section>'` that closes `<section class="stats-row">` and BEFORE `'<section class="card goal-card">'`:

```js
      (function () {
        // "Heute"-Block (1.3): Tages-Haeppchen + Buchstabe/Wort des Tages.
        var picks = dailyPicks();
        var tile = function (kind, item, label) {
          if (!item) return "";
          return '<div class="today-tile" role="button" tabindex="0" data-today="' + esc(item.id) + '">' +
            '<div class="today-label">' + label + '</div>' +
            '<div class="today-he" dir="rtl" lang="he">' + esc(item.niqqud || item.he) + '</div>' +
            '<div class="today-meta">' + esc(item.translit || "") + ' · ' + esc(item.de) + '</div>' +
            '<button class="icon-btn small-btn" data-say="' + esc(item.id) + '" title="Anhören">🔊</button>' +
            '</div>';
        };
        return '<section class="card today-card">' +
          '<div class="setting-label">🌅 Heute</div>' +
          '<div class="today-tiles">' +
          tile("letter", picks.letter, "Buchstabe des Tages") +
          tile("word", picks.word, "Wort des Tages") +
          '</div>' +
          '<button class="btn primary" id="btn-snack">🥨 Häppchen · 5 Aufgaben</button>' +
          '</section>';
      })() +
```

And in the wiring part of `renderHome` (after `$("#cta-start").addEventListener(...)`):

```js
    var snack = $("#btn-snack");
    if (snack) snack.addEventListener("click", function () { startSession("smart", { size: 5 }); });
    app.querySelectorAll("[data-today]").forEach(function (row) {
      var go = function () {
        startSession("smart", { itemIds: [row.dataset.today], size: 3, label: "🌅 Heute" });
      };
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
```

Also in `startSession`, the `itemIds` label line currently hardcodes Knacknüsse: `session.label = opts.label || "💪 Knacknüsse";` already supports `opts.label`, nothing to change (verify only).

- [ ] **Step 5: Styles**

Append to `app/styles.css`:

```css
/* Heute-Block (Home) */
.today-card { border: 2px solid var(--primary, #177e89); }
.today-tiles { display: flex; gap: 10px; margin: 10px 0 12px; }
.today-tile { flex: 1; background: rgba(23, 126, 137, .06); border: 1px solid var(--line); border-radius: 12px; padding: 10px; cursor: pointer; text-align: center; position: relative; }
.today-label { font-size: .75rem; color: var(--muted); margin-bottom: 4px; }
.today-he { font-size: 1.6rem; line-height: 1.3; }
.today-meta { font-size: .8rem; color: var(--muted); margin: 4px 0 6px; }
```

- [ ] **Step 6: Debug exposure**

In `TACHELES_DEBUG`, after `sessionInfo: ...`, add:

```js
    dayHash: function (s) { return dayHash(s); },
    dailyPicks: function () {
      var p = dailyPicks();
      return { letter: p.letter && p.letter.id, word: p.word && p.word.id };
    },
```

- [ ] **Step 7: Add regression checks (section 14f)**

```js
  // --- 14f. Heute-Block: stabil per Datums-Hash, Haeppchen startet Mini-Session ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const heute = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const p1 = D.dailyPicks();
    const p2 = D.dailyPicks(); // gleicher Tag -> identisch (deterministisch)
    return {
      card: !!document.querySelector(".today-card"),
      tiles: document.querySelectorAll(".today-tile").length,
      snack: !!document.querySelector("#btn-snack"),
      stable: p1.letter === p2.letter && p1.word === p2.word,
      letterIsLetter: /^let_/.test(p1.letter || ""),
      hashDet: D.dayHash("2026-07-17|word") === D.dayHash("2026-07-17|word") &&
               D.dayHash("2026-07-17|word") !== D.dayHash("2026-07-18|word")
    };
  });
  check("Heute: Block mit Buchstabe+Wort des Tages auf Home",
    heute.card && heute.tiles === 2 && heute.snack, JSON.stringify(heute));
  check("Heute: Auswahl deterministisch (Datums-Hash, kein Math.random)",
    heute.stable && heute.letterIsLetter && heute.hashDet);
  await page.evaluate(() => { const b = document.querySelector("#btn-snack"); if (b) b.click(); });
  await page.waitForTimeout(500);
  const snackInfo = await page.evaluate(() => window.TACHELES_DEBUG.sessionInfo());
  check("Heute: Haeppchen startet Mini-Session (<= 5 Aufgaben)",
    snackInfo && snackInfo.mode === "smart" && snackInfo.taskIds.length > 0 && snackInfo.taskIds.length <= 5,
    JSON.stringify(snackInfo && snackInfo.taskIds.length));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^fertig$/i.test((x.textContent || "").trim())); if (b) b.click(); });
  await page.waitForTimeout(250);
```

- [ ] **Step 8: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0. Section 14 (audio URL mapping `audio/shalom.opus`) proves the `audioHash` refactor kept byte-identical keys.

- [ ] **Step 9: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: daily Heute block (letter/word of the day via date hash, snack session)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Buchstaben-Erstpfad "Lesen lernen"

Spec 1.4. A prominent Home entry, especially for beginners (< 8 mastered letters), starting a guided sequence built at runtime from existing letter items: teach letter -> teach a short word CONTAINING that letter (the "so liest man das" aha) -> recognition quiz on the letter. Reuses the module runner (no new engine): a synthetic module object is passed to `startSession("module", { moduleObj })`.

**Files:**
- Modify: `app/app.js`: new `buildReadingModule()` (insert directly before `renderAlefbetChart` uses it? No: insert after `ALEFBET_ORDER` ~3376, it needs that list), `startSession` module branch ~1806 (`opts.moduleObj`), `renderHome` (entry row), `TACHELES_DEBUG`
- Modify: `app/styles.css` (append `.reading-card`)
- Test: `app/test/regression.cjs` (section 14g)

**Interfaces:**
- Produces: `buildReadingModule()` -> module object `{ id: "lesen_lernen", title, emoji, sub, steps: [{type:"teach"|"quiz", itemId, distractorIds?}] }`; `startSession("module", { moduleObj: mod })`. Debug: `TACHELES_DEBUG.readingModuleSteps()` -> `["teach:let_x", "teach:word_y", "quiz:let_x", ...]`.
- Consumes: `ALEFBET_ORDER`, `getMastery`, `bandUnlocked`/`itemBand`, module runner (`renderModuleTeach`/`renderModuleQuiz` from Task 2 already set the first-contact flag on teach steps), `countMastered`.

- [ ] **Step 1: Support `opts.moduleObj` in `startSession`**

In the `module` branch, change:

```js
      var mod = moduleById(opts.moduleId);
```

to:

```js
      var mod = opts.moduleObj || moduleById(opts.moduleId);
```

(Everything else in the branch works unchanged; module completion writes `counters.modulesDone["lesen_lernen"]`, which is harmless: `moduleTilesHtml` only iterates `CONTENT.modules`, extra done-keys are ignored, and `mergeStates` unions the object.)

- [ ] **Step 2: Add `buildReadingModule()`**

Insert directly after the `ALEFBET_ORDER` array definition:

```js
  /** "Lesen lernen" (1.4): baut zur Laufzeit ein gefuehrtes Modul aus
   *  vorhandenen Items. Bis zu 3 noch nicht gemeisterte Buchstaben in
   *  Alef-Bet-Reihenfolge; je Buchstabe: Buchstabe vorstellen -> ein kurzes
   *  freigeschaltetes Wort, das ihn ENTHAELT ("so liest man das") ->
   *  Erkennungsfrage zum Buchstaben. Kein neuer Engine, kein neuer Content. */
  function buildReadingModule() {
    var letters = ALEFBET_ORDER.map(itemById).filter(function (it) {
      return it && getMastery(it.id) < 3;
    }).slice(0, 3);
    if (!letters.length) {
      // Alles gemeistert: von vorn wiederholen statt leer auszusteigen.
      letters = ALEFBET_ORDER.map(itemById).filter(Boolean).slice(0, 3);
    }
    var steps = [];
    letters.forEach(function (L) {
      steps.push({ type: "teach", itemId: L.id });
      var word = CONTENT.items.filter(function (it) {
        return (it.type === "word" || it.type === "phrase") &&
          bandUnlocked(itemBand(it)) && String(it.he).indexOf(L.he) >= 0;
      }).sort(function (a, b) {
        // kurz vor lang, dann haeufig vor selten: das lesbarste Aha-Wort zuerst
        return (a.he.length - b.he.length) || ((a.freq || 999) - (b.freq || 999));
      })[0];
      if (word) steps.push({ type: "teach", itemId: word.id });
      steps.push({ type: "quiz", itemId: L.id });
    });
    return {
      id: "lesen_lernen", title: "Lesen lernen", emoji: "👓",
      sub: "Buchstabe für Buchstabe zum ersten Wort", steps: steps
    };
  }
```

- [ ] **Step 3: Home entry**

In `renderHome()`, inside the Heute-block IIFE from Task 5, change the button row: replace

```js
          '<button class="btn primary" id="btn-snack">🥨 Häppchen · 5 Aufgaben</button>' +
```

with a two-button row (Häppchen + Lesen lernen for beginners, spec: "Home priorisiert oben: Häppchen · Buchstaben-Einstieg · Smart-Session"):

```js
          '<div class="today-actions">' +
          '<button class="btn primary" id="btn-snack">🥨 Häppchen · 5 Aufgaben</button>' +
          (countMastered(function (it) { return it.theme === "alefbet"; }) < 8 ?
            '<button class="btn" id="btn-reading">👓 Lesen lernen</button>' : '') +
          '</div>' +
```

And in the wiring part of `renderHome`, after the `btn-snack` wiring:

```js
    var reading = $("#btn-reading");
    if (reading) reading.addEventListener("click", function () {
      startSession("module", { moduleObj: buildReadingModule() });
    });
```

- [ ] **Step 4: Styles + debug**

Append to `app/styles.css`:

```css
.today-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.today-actions .btn { flex: 1; min-width: 150px; }
```

In `TACHELES_DEBUG`, after `dailyPicks: ...`, add:

```js
    readingModuleSteps: function () {
      return buildReadingModule().steps.map(function (s) { return s.type + ":" + s.itemId; });
    },
```

- [ ] **Step 5: Add regression checks (section 14g)**

```js
  // --- 14g. Lesen lernen: Buchstabe+enthaltendes Wort gepaart, Home-Einstieg ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; // Anfaenger: 0 gemeisterte Buchstaben -> Einstieg sichtbar
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  const reading = await page.evaluate(() => {
    const steps = window.TACHELES_DEBUG.readingModuleSteps();
    const byId = {}; window.TACHELES_CONTENT.items.forEach(i => byId[i.id] = i);
    // Muster: teach:let_X, [teach:wort das X enthaelt,] quiz:let_X
    let pairsOk = true, quizzes = 0, teachesLetters = 0;
    for (let i = 0; i < steps.length; i++) {
      const [type, id] = steps[i].split(":");
      if (type === "teach" && /^let_/.test(id)) {
        teachesLetters++;
        const next = (steps[i + 1] || "").split(":");
        if (next[0] === "teach" && !/^let_/.test(next[1])) {
          const letter = byId[id], word = byId[next[1]];
          if (!word || String(word.he).indexOf(letter.he) < 0) pairsOk = false;
        }
      }
      if (type === "quiz") quizzes++;
    }
    return { steps: steps.length, pairsOk, quizzes, teachesLetters,
      btn: !!document.querySelector("#btn-reading") };
  });
  check("Lesen lernen: Home-Einstieg fuer Anfaenger sichtbar", reading.btn);
  check("Lesen lernen: Sequenz paart Buchstabe + enthaltendes Wort + Quiz",
    reading.teachesLetters >= 1 && reading.quizzes >= 1 && reading.pairsOk, JSON.stringify(reading));
  await page.evaluate(() => { const b = document.querySelector("#btn-reading"); if (b) b.click(); });
  await page.waitForTimeout(450);
  const readingSession = await page.evaluate(() => ({
    title: (document.querySelector(".session-title") || {}).textContent || "",
    stepType: window.TACHELES_DEBUG.moduleStepType()
  }));
  check("Lesen lernen: startet als gefuehrtes Modul (teach-Schritt)",
    /lesen lernen/i.test(readingSession.title) && readingSession.stepType === "teach",
    JSON.stringify(readingSession));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(250);
```

- [ ] **Step 6: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: guided reading path (letter plus containing word) for beginners

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Vokabel-Browser (Settings -> "Vokabelliste")

Spec workstream 2. Standalone screen reachable from the Profil screen, back button returns to Profil. Band selector (only bands that have items), always exactly ONE band rendered. Per row: Deutsch, Umschrift, Hebrew (RTL, `lang=he`), 🔊 (`say(item)`), mastery badge, "nicht gemeistert" button on mastered rows (-> `demoteMastery`), "Aussprache falsch" toggle (-> `feedback.pronIssues`). Filter "nur gemeisterte". Also a secondary Mastery-Check entry here (spec 1.2 "aus der Gemeistert-Übersicht/Vokabel-Browser").

**Files:**
- Modify: `app/app.js`: new `renderVocabBrowser(band, onlyMastered)` (insert after `renderAlefbetChart` ~3431, same standalone-screen pattern), `renderProfile` (new "Mehr" section with `#btn-vocab`)
- Modify: `app/styles.css` (append `.vocab-*`)
- Test: `app/test/regression.cjs` (section 14h)

**Interfaces:**
- Produces: `renderVocabBrowser(band, onlyMastered)`; Profil section `<h2 class="h2">Mehr</h2>` + card with `setting-row`s (this card is EXTENDED by Tasks 8, 9, 10; ids: `btn-vocab` here, later `btn-feedback`, `btn-contact`, `btn-privacy`, `btn-tour`).
- Consumes: `demoteMastery` (Task 3), `state.feedback.pronIssues` (Task 1), `getMastery`/`isNew`, `say`, `BANDS`/`itemBand`, `startSession("mastercheck")` (Task 4), `cleanupSession`, `heOptionText`-style display (`item.niqqud || item.he`).

- [ ] **Step 1: Add `renderVocabBrowser`**

Insert after `renderAlefbetChart()`:

```js
  /* ---------- Vokabel-Browser (Settings -> "Vokabelliste") ---------- */

  /** Bandweise Vokabelliste (WS2): lesen, anhoeren, Mastery zuruecknehmen,
   *  Aussprache als falsch melden. Immer genau EIN Band gerendert (Performance). */
  function renderVocabBrowser(band, onlyMastered) {
    cleanupSession();
    document.body.classList.add("in-session");
    if (BANDS.indexOf(band) < 0) band = "A0";
    onlyMastered = !!onlyMastered;
    var app = $("#app");
    app.innerHTML = "";

    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen("profile");
    });
    back.title = "Zurück zum Profil";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", "📖 Vokabelliste"));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);

    // Steuerleiste: Band-Waehler (nur Baender mit Items) + Gemeistert-Filter.
    var bar = el("div", "vocab-bar");
    var sel = document.createElement("select");
    sel.id = "vocab-band";
    sel.setAttribute("aria-label", "Level-Band wählen");
    BANDS.filter(function (b) {
      return CONTENT.items.some(function (it) { return itemBand(it) === b; });
    }).forEach(function (b) {
      var o = document.createElement("option");
      o.value = b; o.textContent = b;
      if (b === band) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () { renderVocabBrowser(sel.value, chk.checked); });
    bar.appendChild(sel);
    var lbl = el("label", "vocab-filter");
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = "vocab-mastered";
    chk.checked = onlyMastered;
    chk.addEventListener("change", function () { renderVocabBrowser(sel.value, chk.checked); });
    lbl.appendChild(chk);
    lbl.appendChild(document.createTextNode(" nur gemeisterte"));
    bar.appendChild(lbl);
    if (state.gamification.masteredCount > 0) {
      bar.appendChild(btn("🏅 Mastery-Check", "btn small", function () {
        document.body.classList.remove("in-session");
        startSession("mastercheck");
      }));
    }
    app.appendChild(bar);

    var items = CONTENT.items.filter(function (it) { return itemBand(it) === band; });
    if (onlyMastered) items = items.filter(function (it) { return getMastery(it.id) >= 3; });
    app.appendChild(el("div", "vocab-count",
      items.length + (items.length === 1 ? " Wort" : " Wörter") + " · Band " + band));

    var list = el("div", "vocab-list");
    items.forEach(function (item) {
      var m = getMastery(item.id);
      var row = el("div", "vocab-row");
      var play = btn("🔊", "icon-btn small-btn", function () { say(item); });
      play.title = "Anhören";
      row.appendChild(play);
      var mainCol = el("div", "vocab-main");
      mainCol.appendChild(el("div", "vocab-de", item.de));
      mainCol.appendChild(el("div", "vocab-translit", item.translit || ""));
      row.appendChild(mainCol);
      var he = el("div", "vocab-he", item.niqqud || item.he);
      he.dir = "rtl"; he.lang = "he";
      row.appendChild(he);
      var badge = el("span", "vocab-badge " + (m >= 3 ? "done" : (!isNew(item.id) ? "started" : "fresh")),
        m >= 3 ? "gemeistert" : (!isNew(item.id) ? "in Arbeit" : "neu"));
      row.appendChild(badge);
      if (m >= 3) {
        row.appendChild(btn("nicht gemeistert", "btn ghost small vocab-demote", function () {
          if (demoteMastery(item.id)) {
            toast("💪 " + item.he + " ist zurück in der Übung.");
            renderVocabBrowser(band, onlyMastered);
          }
        }));
      }
      var pron = btn("🎙 falsch?", "btn ghost small pron-btn" +
        (state.feedback.pronIssues[item.id] ? " active" : ""), function () {
        // "Aussprache falsch"-Schalter (WS2): schreibt/entfernt feedback.pronIssues.
        if (state.feedback.pronIssues[item.id]) {
          delete state.feedback.pronIssues[item.id];
          pron.classList.remove("active");
        } else {
          state.feedback.pronIssues[item.id] = true;
          pron.classList.add("active");
        }
        saveState();
      });
      pron.title = "Aussprache als falsch melden (landet im Feedback)";
      row.appendChild(pron);
      list.appendChild(row);
    });
    app.appendChild(list);
    window.scrollTo(0, 0);
  }
```

- [ ] **Step 2: Profil entry (new "Mehr" section)**

In `renderProfile()`, in the `app.innerHTML` template, directly BEFORE `'<h2 class="h2">Daten</h2>'`, insert:

```js
      '<h2 class="h2">Mehr</h2>' +
      '<section class="card" id="more-card">' +
      '<div class="setting-row"><div><div class="setting-label">📖 Vokabelliste</div>' +
      '<div class="setting-sub">Alle Wörter nach Level durchsehen, anhören, Aussprache melden</div></div>' +
      '<button class="btn" id="btn-vocab">Öffnen</button></div>' +
      '</section>' +
```

And in the wiring part (after `$("#btn-placement").addEventListener(...)`):

```js
    $("#btn-vocab").addEventListener("click", function () { renderVocabBrowser(effectiveBand(), false); });
```

- [ ] **Step 3: Styles**

Append to `app/styles.css`:

```css
/* Vokabel-Browser */
.vocab-bar { display: flex; align-items: center; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
.vocab-bar select { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--line); font-size: 1rem; }
.vocab-filter { display: flex; align-items: center; gap: 6px; font-size: .9rem; }
.vocab-filter input { width: 18px; height: 18px; accent-color: var(--primary); }
.vocab-count { color: var(--muted); font-size: .85rem; margin-bottom: 8px; }
.vocab-list { display: flex; flex-direction: column; gap: 8px; }
.vocab-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #fff; border: 1px solid var(--line); border-radius: 12px; flex-wrap: wrap; }
.vocab-main { flex: 1; min-width: 120px; }
.vocab-de { font-weight: 600; }
.vocab-translit { color: var(--muted); font-size: .85rem; }
.vocab-he { font-size: 1.35rem; min-width: 90px; text-align: right; }
.vocab-badge { font-size: .72rem; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); }
.vocab-badge.done { background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7; }
.vocab-badge.started { background: #fff8e1; color: #8d6e00; border-color: #ffe082; }
.pron-btn.active { background: #ffebee; color: #c62828; border-color: #ef9a9a; }
```

(If `styles.css` defines card/background variables, prefer them over `#fff`; match the surrounding idiom when implementing.)

- [ ] **Step 4: Add regression checks (section 14h)**

```js
  // --- 14h. Vokabel-Browser: Band-Waehler, Zeile, Demote, Aussprache-Toggle ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.srs = {}; s.feedback = { notes: [], pronIssues: {} };
    // Ein A0-Item als gemeistert seeden (erstes Item ist per Content A0).
    const it = window.TACHELES_CONTENT.items[0];
    s.srs[it.id] = { ease: 2.5, intervalDays: 9, dueTs: Date.now() + 86400000, reps: 5, lapses: 0, mastery: 4, lastReviewTs: Date.now() };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Vokabelliste: Profil-Eintrag vorhanden", await page.evaluate(() => !!document.querySelector("#btn-vocab")));
  await page.evaluate(() => { const b = document.querySelector("#btn-vocab"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const vocab = await page.evaluate(() => {
    // Auf Band A0 schalten (deterministisch fuer die Checks).
    const sel = document.querySelector("#vocab-band");
    return {
      selBands: sel ? [...sel.options].map(o => o.value) : [],
      title: (document.querySelector(".session-title") || {}).textContent || ""
    };
  });
  check("Vokabelliste: Screen mit Band-Waehler (A0 vorhanden)",
    /vokabelliste/i.test(vocab.title) && vocab.selBands.includes("A0"), vocab.selBands.join(","));
  await page.evaluate(() => {
    const sel = document.querySelector("#vocab-band");
    sel.value = "A0"; sel.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(400);
  const vocabRows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".vocab-row")];
    const first = rows[0];
    return {
      n: rows.length,
      hasParts: !!first && !!first.querySelector(".vocab-de") && !!first.querySelector(".vocab-he") &&
        !!first.querySelector(".vocab-badge") && !!first.querySelector(".pron-btn") &&
        first.querySelector(".vocab-he").getAttribute("dir") === "rtl",
      demoteBtns: document.querySelectorAll(".vocab-demote").length
    };
  });
  check("Vokabelliste: Zeilen mit DE/he(RTL)/Badge/Aussprache-Knopf",
    vocabRows.n >= 30 && vocabRows.hasParts, JSON.stringify(vocabRows));
  check("Vokabelliste: gemeisterte Zeile hat 'nicht gemeistert'-Knopf", vocabRows.demoteBtns >= 1);
  // Filter "nur gemeisterte"
  await page.evaluate(() => {
    const chk = document.querySelector("#vocab-mastered");
    chk.checked = true; chk.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(400);
  const filtered = await page.evaluate(() => document.querySelectorAll(".vocab-row").length);
  check("Vokabelliste: Filter 'nur gemeisterte'", filtered === 1, filtered);
  // Aussprache-Toggle schreibt feedback.pronIssues
  const pronToggle = await page.evaluate(() => {
    const btn = document.querySelector(".pron-btn");
    btn.click();
    const on = JSON.parse(localStorage.getItem("tacheles_state_v1")).feedback.pronIssues;
    btn.click();
    const off = JSON.parse(localStorage.getItem("tacheles_state_v1")).feedback.pronIssues;
    return { onCount: Object.keys(on).length, offCount: Object.keys(off).length };
  });
  check("Vokabelliste: 'Aussprache falsch' schreibt/entfernt feedback.pronIssues",
    pronToggle.onCount === 1 && pronToggle.offCount === 0, JSON.stringify(pronToggle));
  // Demote aus der Liste
  await page.evaluate(() => { const b = document.querySelector(".vocab-demote"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const vocabDemote = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    const it = window.TACHELES_CONTENT.items[0];
    return { mastery: s.srs[it.id].mastery, rowsNow: document.querySelectorAll(".vocab-row").length };
  });
  check("Vokabelliste: 'nicht gemeistert' demotet auf 2 (Liste aktualisiert)",
    vocabDemote.mastery === 2 && vocabDemote.rowsNow === 0, JSON.stringify(vocabDemote));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Vokabelliste: Zurueck fuehrt ins Profil", await page.evaluate(() => !!document.querySelector("#btn-vocab")));
```

Note: `vocabRows.n >= 30` assumes Band A0 has at least 30 items (A0 holds the alefbet theme with 27 letters plus core themes; verify the real count once while implementing and lower the threshold if needed, stating the actual number in the check detail).

- [ ] **Step 5: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: vocabulary browser with band selector, demote and pronunciation flag

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Feedback system (hub, GitHub-issue prefill, mailto fallback, footer link)

Spec workstream 3. Settings hub to write/view/clear notes and see flagged pronunciations; submission opens a prefilled GitHub issue URL (repo `caol-ila/tacheles`, total URL capped at ~6000 chars, truncation with a notice) or a mailto fallback (`tacheles@mahlberg.rocks`). Honest UI note: GitHub issues are public and need a login; the app never sends anything by itself. Submitting does NOT clear the local collection. Plus a discreet "Feedback" footer link on the main screens.

**Files:**
- Modify: `app/app.js`: new constants + `feedbackBody()`, `capUrl()`, `feedbackIssueUrl()`, `feedbackMailtoUrl()`, `renderFeedback()` (insert after `renderVocabBrowser` from Task 7), new `footerLinksHtml()` + `wireFooterLinks(root)` (insert near `themeListHtml` helpers ~1279), footer added in `renderHome`/`renderModes`/`renderProgress`/`renderProfile`, Profil "Mehr" card entry, `TACHELES_DEBUG`
- Modify: `app/styles.css` (append `.footer-links`, `.fb-*`)
- Test: `app/test/regression.cjs` (section 14i)

**Interfaces:**
- Produces: `feedbackBody()` -> string; `capUrl(base, body, max)` -> `{ url, truncated }`; `feedbackIssueUrl()` / `feedbackMailtoUrl()` -> `{ url, truncated }`; `renderFeedback()`; `footerLinksHtml()` -> HTML string with `[data-goto]` links (this task: only `feedback`; Task 9 adds `contact`/`privacy`); `wireFooterLinks(root)`. Debug: `TACHELES_DEBUG.feedbackIssueUrl`, `.feedbackMailtoUrl`.
- Consumes: `state.feedback` (Task 1), `itemById`, `dateStr`, `buildOverlay` not needed here.

- [ ] **Step 1: Add feedback URL builders**

Insert a new subsection in `app.js` directly after `renderVocabBrowser` (Task 7):

```js
  /* ---------- Feedback (WS3): lokale Notizen + Uebermittlung ---------- */

  var FEEDBACK_ISSUE_BASE = "https://github.com/caol-ila/tacheles/issues/new";
  var FEEDBACK_MAIL = "tacheles@mahlberg.rocks";
  var FEEDBACK_URL_MAX = 6000; // Prefill-URLs laengenbegrenzen (Browser-/Server-Limits)

  /** Notizen + gemeldete Aussprache-Woerter als Markdown-Body. */
  function feedbackBody() {
    var fb = state.feedback;
    var lines = ["Feedback aus der Tacheles-App (Version " + CONTENT.version + ")", ""];
    if (fb.notes.length) {
      lines.push("## Notizen");
      fb.notes.forEach(function (n) {
        lines.push("- (" + dateStr(new Date(n.ts || 0)) + ") " + n.text);
      });
      lines.push("");
    }
    var ids = Object.keys(fb.pronIssues);
    if (ids.length) {
      lines.push("## Aussprache klingt falsch");
      ids.forEach(function (id) {
        var it = itemById(id);
        lines.push(it ? "- " + it.he + " (" + it.translit + " = " + it.de + ") [" + id + "]" : "- " + id);
      });
      lines.push("");
    }
    return lines.join("\n");
  }

  /** base + encodeURIComponent(body), auf max Zeichen gekappt (mit Hinweis im Text). */
  function capUrl(base, body, max) {
    var url = base + encodeURIComponent(body);
    var truncated = false;
    while (url.length > max && body.length > 0) {
      truncated = true;
      body = body.slice(0, body.length - 200);
      url = base + encodeURIComponent(body + "\n\n… [gekürzt – Rest bitte anhängen]");
    }
    return { url: url, truncated: truncated };
  }

  function feedbackIssueUrl() {
    return capUrl(FEEDBACK_ISSUE_BASE + "?title=" + encodeURIComponent("App-Feedback") + "&body=",
      feedbackBody(), FEEDBACK_URL_MAX);
  }

  function feedbackMailtoUrl() {
    return capUrl("mailto:" + FEEDBACK_MAIL + "?subject=" + encodeURIComponent("Tacheles-Feedback") + "&body=",
      feedbackBody(), FEEDBACK_URL_MAX);
  }

  /** Link nutzerinitiiert oeffnen (funktioniert auch auf file:// und fuer mailto:). */
  function openExternal(url) {
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
```

- [ ] **Step 2: Add `renderFeedback()`**

Insert directly after `openExternal`:

```js
  /** Feedback-Hub (WS3): Notizen erfassen/ansehen/loeschen, gemeldete
   *  Aussprache-Woerter, Uebermitteln via GitHub-Issue-Prefill oder mailto.
   *  Uebermitteln leert die lokale Sammlung bewusst NICHT. */
  function renderFeedback() {
    cleanupSession();
    document.body.classList.add("in-session");
    var app = $("#app");
    app.innerHTML = "";

    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen("profile");
    });
    back.title = "Zurück zum Profil";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", "💬 Feedback"));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);

    // Erfassen
    var card = el("section", "card");
    card.appendChild(el("div", "setting-label", "Was soll besser werden?"));
    var ta = el("textarea", "fb-textarea");
    ta.rows = 3;
    ta.maxLength = 2000;
    ta.placeholder = "Tippfehler, komische Übersetzung, Wunsch … alles hilft.";
    ta.setAttribute("aria-label", "Feedback-Notiz");
    card.appendChild(ta);
    card.appendChild(btn("Notiz speichern", "btn primary", function () {
      var text = ta.value.trim();
      if (!text) { toast("Erst etwas schreiben. 🙂"); return; }
      state.feedback.notes.push({ ts: Date.now(), text: text.slice(0, 2000) });
      saveState();
      toast("Gespeichert. 📝");
      renderFeedback();
    }));
    app.appendChild(card);

    // Gesammelte Notizen
    var notes = state.feedback.notes;
    var nCard = el("section", "card");
    nCard.appendChild(el("div", "setting-label", "Deine Notizen (" + notes.length + ")"));
    if (!notes.length) {
      nCard.appendChild(el("div", "setting-sub", "Noch keine Notizen."));
    } else {
      notes.forEach(function (n, idx) {
        var row = el("div", "fb-note");
        row.appendChild(el("span", "fb-note-date", dateStr(new Date(n.ts || 0))));
        row.appendChild(el("span", "fb-note-text", n.text));
        var del = btn("🗑", "icon-btn small-btn", function () {
          state.feedback.notes.splice(idx, 1);
          saveState();
          renderFeedback();
        });
        del.title = "Notiz löschen";
        row.appendChild(del);
        nCard.appendChild(row);
      });
      nCard.appendChild(btn("Alle Notizen löschen", "btn ghost small", function () {
        if (!confirm("Wirklich alle Notizen löschen?")) return;
        state.feedback.notes = [];
        saveState();
        renderFeedback();
      }));
    }
    app.appendChild(nCard);

    // Gemeldete Aussprache (aus der Vokabelliste)
    var ids = Object.keys(state.feedback.pronIssues);
    var pCard = el("section", "card");
    pCard.appendChild(el("div", "setting-label", "Aussprache gemeldet (" + ids.length + ")"));
    if (!ids.length) {
      pCard.appendChild(el("div", "setting-sub",
        "Nichts markiert. In der 📖 Vokabelliste kannst du Wörter mit „🎙 falsch?“ melden."));
    } else {
      ids.forEach(function (id) {
        var it = itemById(id);
        var row = el("div", "fb-note");
        var he = el("span", "done-review-he", it ? it.he : id);
        he.dir = "rtl"; he.lang = "he";
        row.appendChild(he);
        row.appendChild(el("span", "fb-note-text", it ? (it.translit + " = " + it.de) : ""));
        var del = btn("🗑", "icon-btn small-btn", function () {
          delete state.feedback.pronIssues[id];
          saveState();
          renderFeedback();
        });
        del.title = "Meldung entfernen";
        row.appendChild(del);
        pCard.appendChild(row);
      });
    }
    app.appendChild(pCard);

    // Uebermitteln (ehrlicher Hinweis: oeffentlich + Login, nichts automatisch)
    var sCard = el("section", "card");
    sCard.appendChild(el("div", "setting-label", "Übermitteln"));
    sCard.appendChild(el("p", "setting-sub",
      "Die App sendet nichts von selbst. „Auf GitHub übermitteln“ öffnet ein vorbefülltes, " +
      "ÖFFENTLICHES GitHub-Issue (GitHub-Konto nötig). Ohne GitHub geht es per E-Mail. " +
      "Deine Sammlung hier bleibt danach erhalten, löschen kannst du sie oben selbst."));
    var actions = el("div", "data-actions");
    actions.appendChild(btn("🐙 Auf GitHub übermitteln", "btn primary", function () {
      var r = feedbackIssueUrl();
      if (r.truncated) toast("Hinweis: Das Feedback war zu lang und wurde gekürzt.");
      openExternal(r.url);
    }));
    actions.appendChild(btn("✉️ Per E-Mail senden", "btn", function () {
      var r = feedbackMailtoUrl();
      if (r.truncated) toast("Hinweis: Das Feedback war zu lang und wurde gekürzt.");
      openExternal(r.url);
    }));
    sCard.appendChild(actions);
    app.appendChild(sCard);
    window.scrollTo(0, 0);
  }
```

- [ ] **Step 3: Footer helper + hookup on main screens**

Insert near the other list helpers (directly after `wireLockedSummary`, ~1291):

```js
  /** Dezente Footer-Links der Hauptscreens (Feedback; Task 9 ergaenzt
   *  Kontakt + Datenschutz). */
  function footerLinksHtml() {
    return '<div class="footer-links">' +
      '<a href="#" data-goto="feedback">Feedback</a>' +
      '</div>';
  }

  function wireFooterLinks(root) {
    root.querySelectorAll("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var t = a.dataset.goto;
        if (t === "feedback") renderFeedback();
      });
    });
  }
```

Hook it up:
1. `renderHome`: change `'<div class="footer-tag">Reden wir Tacheles. 🕊️</div>';` to `'<div class="footer-tag">Reden wir Tacheles. 🕊️</div>' + footerLinksHtml();` and add `wireFooterLinks(app);` after `wireLockedSummary(app);`.
2. `renderModes`: append `+ footerLinksHtml()` to the end of its `app.innerHTML` template and add `wireFooterLinks(app);` after `wireThemeRows(app);`.
3. `renderProgress`: append `+ footerLinksHtml()` after the Daten `</section>` (end of template) and add `wireFooterLinks(app);` after `wireLockedSummary(app);`.
4. `renderProfile`: append `+ footerLinksHtml()` after the last `footer-tag` div and add `wireFooterLinks(app);` at the end of the wiring block.

- [ ] **Step 4: Profil "Mehr" entry**

In the `#more-card` section created in Task 7, after the Vokabelliste `setting-row`, add:

```js
      '<div class="setting-row"><div><div class="setting-label">💬 Feedback</div>' +
      '<div class="setting-sub">Notizen sammeln und als GitHub-Issue oder E-Mail übermitteln</div></div>' +
      '<button class="btn" id="btn-feedback">Öffnen</button></div>' +
```

Wiring (next to `#btn-vocab`):

```js
    $("#btn-feedback").addEventListener("click", renderFeedback);
```

- [ ] **Step 5: Styles + debug**

Append to `app/styles.css`:

```css
/* Footer-Links + Feedback-Hub */
.footer-links { text-align: center; margin: 4px 0 14px; font-size: .85rem; }
.footer-links a { color: var(--muted); text-decoration: underline; margin: 0 4px; }
.fb-textarea { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px; font: inherit; margin: 8px 0 10px; resize: vertical; }
.fb-note { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.fb-note:last-of-type { border-bottom: none; }
.fb-note-date { color: var(--muted); font-size: .8rem; white-space: nowrap; }
.fb-note-text { flex: 1; overflow-wrap: anywhere; }
```

In `TACHELES_DEBUG`, after `readingModuleSteps: ...`, add:

```js
    feedbackIssueUrl: function () { return feedbackIssueUrl(); },
    feedbackMailtoUrl: function () { return feedbackMailtoUrl(); },
```

- [ ] **Step 6: Add regression checks (section 14i)**

```js
  // --- 14i. Feedback: Notiz speichern/loeschen, URL-Prefill + Laengenlimit, Footer ---
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback = { notes: [], pronIssues: { shalom: true } };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  check("Feedback: Footer-Link auf Home", await page.evaluate(() =>
    !![...document.querySelectorAll('.footer-links [data-goto="feedback"]')].length));
  await page.evaluate(() => { const a = document.querySelector('[data-goto="feedback"]'); if (a) a.click(); });
  await page.waitForTimeout(400);
  check("Feedback: Hub oeffnet", await page.evaluate(() =>
    /feedback/i.test((document.querySelector(".session-title") || {}).textContent || "")));
  await page.evaluate(() => {
    document.querySelector(".fb-textarea").value = "Testnotiz aus der Regression";
    const b = [...document.querySelectorAll("button")].find(x => /notiz speichern/i.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(400);
  const fbSaved = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      n: s.feedback.notes.length,
      text: s.feedback.notes[0] && s.feedback.notes[0].text,
      shown: /Testnotiz aus der Regression/.test(document.body.innerText),
      pronShown: /Aussprache gemeldet \(1\)/.test(document.body.innerText)
    };
  });
  check("Feedback: Notiz speichern + anzeigen (inkl. Aussprache-Liste)",
    fbSaved.n === 1 && fbSaved.text === "Testnotiz aus der Regression" && fbSaved.shown && fbSaved.pronShown,
    JSON.stringify(fbSaved));
  const fbUrls = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const issue = D.feedbackIssueUrl();
    const mail = D.feedbackMailtoUrl();
    // Ueberlaenge provozieren und Kappung pruefen
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    return {
      issueOk: issue.url.indexOf("https://github.com/caol-ila/tacheles/issues/new?title=") === 0 &&
        issue.url.indexOf(encodeURIComponent("Testnotiz aus der Regression")) > 0 && !issue.truncated,
      mailOk: mail.url.indexOf("mailto:tacheles@mahlberg.rocks?subject=") === 0
    };
  });
  check("Feedback: GitHub- und mailto-URL korrekt vorbefuellt", fbUrls.issueOk && fbUrls.mailOk, JSON.stringify(fbUrls));
  const fbCap = await page.evaluate(() => {
    const D = window.TACHELES_DEBUG;
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback.notes = [];
    for (let i = 0; i < 20; i++) s.feedback.notes.push({ ts: i, text: new Array(500).join("x") });
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
    return null;
  });
  await page.reload(); await page.waitForTimeout(500);
  const fbCap2 = await page.evaluate(() => {
    const issue = window.TACHELES_DEBUG.feedbackIssueUrl();
    return { len: issue.url.length, truncated: issue.truncated };
  });
  check("Feedback: Prefill-URL bei Ueberlaenge auf <= 6000 gekappt",
    fbCap2.len <= 6000 && fbCap2.truncated === true, JSON.stringify(fbCap2));
  // Notiz loeschen (im Hub)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tacheles_state_v1"));
    s.feedback = { notes: [{ ts: 5, text: "wegdamit" }], pronIssues: {} };
    localStorage.setItem("tacheles_state_v1", JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#btn-feedback"); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector(".fb-note .icon-btn"); if (b) b.click(); });
  await page.waitForTimeout(400);
  const fbDeleted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tacheles_state_v1")).feedback.notes.length);
  check("Feedback: Notiz einzeln loeschen", fbDeleted === 0, fbDeleted);
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
```

- [ ] **Step 7: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0.

- [ ] **Step 8: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: local feedback hub with GitHub issue prefill and mailto fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Kontakt/Impressum + Datenschutz screens

Spec workstream 4. Two in-app screens (no new files, no fetch), reachable from Settings and via footer links. Private, non-commercial: name + e-mail suffice, no postal address. Both screens carry the lay-template disclaimer ("keine Rechtsberatung").

**Files:**
- Modify: `app/app.js`: new `renderContact()` + `renderPrivacy()` + shared `renderInfoScreen(title, html)` helper (insert after `renderFeedback` from Task 8), `footerLinksHtml`/`wireFooterLinks` extended, Profil "Mehr" card entries
- Modify: `app/styles.css` (append `.legal-*`)
- Test: `app/test/regression.cjs` (section 14j)

**Interfaces:**
- Produces: `renderContact()`, `renderPrivacy()`, `renderInfoScreen(titleText, bodyHtml)`; footer gains `data-goto="contact"` and `data-goto="privacy"`.
- Consumes: standalone-screen pattern (`cleanupSession` + `in-session` + quit button -> `showScreen("profile")`), `esc` not needed (static trusted strings).

- [ ] **Step 1: Shared info-screen helper + both screens**

Insert after `renderFeedback()`:

```js
  /* ---------- Kontakt/Impressum + Datenschutz (WS4, In-App-Screens) ---------- */

  /** Statischer Info-Screen (Kontakt/Datenschutz): Titel + HTML-Body,
   *  Zurueck fuehrt ins Profil. Inhalte sind feste, vertrauenswuerdige Strings. */
  function renderInfoScreen(titleText, bodyHtml) {
    cleanupSession();
    document.body.classList.add("in-session");
    var app = $("#app");
    app.innerHTML = "";
    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen("profile");
    });
    back.title = "Zurück zum Profil";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", titleText));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);
    var body = el("div", "legal-body");
    body.innerHTML = bodyHtml;
    app.appendChild(body);
    window.scrollTo(0, 0);
  }

  var LEGAL_DISCLAIMER =
    '<section class="card legal-disclaimer"><p class="setting-sub"><b>Hinweis:</b> Dieser Text ist eine ' +
    'Laien-Vorlage und keine Rechtsberatung. Vor einem Betrieb über den privaten Rahmen hinaus ' +
    'bitte fachlich prüfen lassen.</p></section>';

  function renderContact() {
    renderInfoScreen("📮 Kontakt / Impressum",
      '<section class="card">' +
      '<p>Tacheles ist ein privates, nicht-kommerzielles Lernprojekt, ohne Werbung, ' +
      'ohne Bezahlfunktionen, ohne geschäftsmäßigen Hintergrund.</p>' +
      '<p style="margin-top:10px"><b>Verantwortlich:</b> Thomas Mahlberg<br>' +
      '<b>Kontakt:</b> <a href="mailto:tacheles@mahlberg.rocks">tacheles@mahlberg.rocks</a></p>' +
      '<p class="setting-sub" style="margin-top:10px">Als rein privates Angebot besteht keine ' +
      'Impressumspflicht mit ladungsfähiger Anschrift. Sollte Tacheles einmal kommerzielle Züge ' +
      'bekommen (Werbung, Spenden, Verkauf), wäre eine ladungsfähige Anschrift nachzurüsten.</p>' +
      '</section>' + LEGAL_DISCLAIMER);
  }

  function renderPrivacy() {
    renderInfoScreen("🔒 Datenschutz",
      '<section class="card">' +
      '<h3 class="legal-h">Verantwortlicher</h3>' +
      '<p>Thomas Mahlberg · <a href="mailto:tacheles@mahlberg.rocks">tacheles@mahlberg.rocks</a></p>' +

      '<h3 class="legal-h">Hosting (GitHub Pages)</h3>' +
      '<p>Wenn du Tacheles über das Internet aufrufst, wird die App von GitHub Pages ausgeliefert ' +
      '(GitHub Inc., ein Unternehmen von Microsoft, USA). Dabei verarbeitet GitHub technisch bedingt ' +
      'Verbindungsdaten, insbesondere deine IP-Adresse und Server-Logs. Darauf haben wir keinen ' +
      'Einfluss. Es findet dabei eine Datenübermittlung in die USA statt (Drittland). Details: ' +
      '<a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" ' +
      'target="_blank" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>' +

      '<h3 class="legal-h">Keine eigene Datenerhebung</h3>' +
      '<p>Tacheles selbst erhebt nichts: kein Tracking, keine Cookies, keine Analyse, keine Konten. ' +
      'Dein gesamter Lernfortschritt liegt ausschließlich lokal in deinem Browser (localStorage) und ' +
      'verlässt dein Gerät nur, wenn du ihn selbst exportierst oder einen Sync-Code erzeugst.</p>' +

      '<h3 class="legal-h">Mikrofon &amp; Spracherkennung</h3>' +
      '<p>Nur wenn du den Sprechen-Modus aktiv nutzt, greift die Spracherkennung deines Browsers ' +
      '(Chrome/Edge). Diese sendet die Aufnahme zur Auswertung an einen Dienst des ' +
      'Browser-Herstellers. Tacheles speichert keine Aufnahmen. Vor der ersten Aufnahme wirst du in ' +
      'der App darauf hingewiesen.</p>' +

      '<h3 class="legal-h">Sprachausgabe</h3>' +
      '<p>Die vorproduzierten Audiodateien werden zusammen mit der App ausgeliefert. Zur Laufzeit ' +
      'wird dafür nichts bei Dritten abgerufen.</p>' +

      '<h3 class="legal-h">Feedback</h3>' +
      '<p>„Übermitteln“ im Feedback-Bereich öffnet auf deinen Klick hin GitHub (öffentliches Issue, ' +
      'GitHub-Konto nötig) oder dein E-Mail-Programm. Erst dann verlassen die von dir eingegebenen ' +
      'Inhalte dein Gerät. Die App sendet nichts automatisch.</p>' +

      '<h3 class="legal-h">Deine Rechte</h3>' +
      '<p>Auskunft, Berichtigung, Löschung und Co. laufen mangels serverseitiger Speicherung faktisch ' +
      'über dein Gerät: Im Profil kannst du alle Daten exportieren oder vollständig zurücksetzen; ' +
      'zusätzlich löscht das Leeren der Browserdaten alles. Bei Fragen: ' +
      '<a href="mailto:tacheles@mahlberg.rocks">tacheles@mahlberg.rocks</a>.</p>' +
      '</section>' + LEGAL_DISCLAIMER);
  }
```

- [ ] **Step 2: Extend footer links**

Replace the Task 8 versions of `footerLinksHtml`/`wireFooterLinks` with:

```js
  /** Dezente Footer-Links der Hauptscreens: Feedback, Kontakt, Datenschutz. */
  function footerLinksHtml() {
    return '<div class="footer-links">' +
      '<a href="#" data-goto="feedback">Feedback</a> · ' +
      '<a href="#" data-goto="contact">Kontakt</a> · ' +
      '<a href="#" data-goto="privacy">Datenschutz</a>' +
      '</div>';
  }

  function wireFooterLinks(root) {
    root.querySelectorAll("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var t = a.dataset.goto;
        if (t === "feedback") renderFeedback();
        else if (t === "contact") renderContact();
        else if (t === "privacy") renderPrivacy();
      });
    });
  }
```

- [ ] **Step 3: Profil "Mehr" entries**

In `#more-card` (Task 7/8), after the Feedback `setting-row`, add:

```js
      '<div class="setting-row"><div><div class="setting-label">📮 Kontakt / Impressum</div>' +
      '<div class="setting-sub">Wer hinter Tacheles steckt</div></div>' +
      '<button class="btn" id="btn-contact">Öffnen</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">🔒 Datenschutz</div>' +
      '<div class="setting-sub">Was mit deinen Daten passiert (kurz: sie bleiben bei dir)</div></div>' +
      '<button class="btn" id="btn-privacy">Öffnen</button></div>' +
```

Wiring:

```js
    $("#btn-contact").addEventListener("click", renderContact);
    $("#btn-privacy").addEventListener("click", renderPrivacy);
```

- [ ] **Step 4: Styles**

Append to `app/styles.css`:

```css
/* Rechts-Screens */
.legal-body { max-width: 560px; margin: 0 auto; }
.legal-body p { margin: 8px 0; line-height: 1.5; }
.legal-h { margin: 16px 0 4px; font-size: 1rem; color: var(--primary-dark, #0f5560); }
.legal-h:first-child { margin-top: 0; }
.legal-body a { color: var(--primary, #177e89); }
.legal-disclaimer { margin-top: 12px; }
```

- [ ] **Step 5: Add regression checks (section 14j)**

```js
  // --- 14j. Kontakt/Impressum + Datenschutz erreichbar und nicht leer ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "home"); if (b) b.click(); });
  await page.waitForTimeout(300);
  const footerLegal = await page.evaluate(() => ({
    contact: !!document.querySelector('.footer-links [data-goto="contact"]'),
    privacy: !!document.querySelector('.footer-links [data-goto="privacy"]')
  }));
  check("Recht: Footer-Links Kontakt + Datenschutz", footerLegal.contact && footerLegal.privacy);
  await page.evaluate(() => { const a = document.querySelector('[data-goto="contact"]'); if (a) a.click(); });
  await page.waitForTimeout(350);
  const contact = await page.evaluate(() => document.body.innerText);
  check("Recht: Kontakt nennt Verantwortlichen + E-Mail + Disclaimer",
    /Thomas Mahlberg/.test(contact) && /tacheles@mahlberg\.rocks/.test(contact) &&
    /keine Rechtsberatung/i.test(contact) && /privates, nicht-kommerzielles/i.test(contact));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = document.querySelector("#btn-privacy"); if (b) b.click(); });
  await page.waitForTimeout(350);
  const privacy = await page.evaluate(() => document.body.innerText);
  check("Recht: Datenschutz deckt GitHub Pages/USA/localStorage/Mikrofon/Feedback/Rechte ab",
    /GitHub Pages/i.test(privacy) && /IP-Adresse/i.test(privacy) && /USA/.test(privacy) &&
    /localStorage/i.test(privacy) && /Spracherkennung/i.test(privacy) &&
    /Feedback/i.test(privacy) && /Rechte/i.test(privacy) && /keine Rechtsberatung/i.test(privacy));
  await page.evaluate(() => { const b = document.querySelector(".quit-btn"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Recht: Zurueck fuehrt ins Profil", await page.evaluate(() => !!document.querySelector("#btn-privacy")));
```

- [ ] **Step 6: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0. (The `target="_blank"` GitHub link is never clicked by tests; no network access happens.)

- [ ] **Step 7: Commit**

```bash
git add app/app.js app/styles.css app/test/regression.cjs
git commit -m "feat: in-app contact/imprint and privacy screens (lay template with disclaimer)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: App tour (slideshow, auto after onboarding, one-time notice for existing users)

Spec workstream 5. Skippable slideshow, restartable from Settings. New users get it once, right after finishing onboarding. Existing users (`onboarded && !tourSeen`) get a one-time discreet notice with "Ansehen"/"Überspringen". Resolution of the "beide Wege setzen tourSeen" rule: `tourSeen` is set to `true` the moment the notice is SHOWN (guarantees strictly-once even if the overlay is dismissed via Escape/backdrop); the two buttons then only decide whether the tour starts.

This task also adjusts existing regression sections (onboarding now hands off to the tour) and seeds `tourSeen` where tests re-seed state.

**Files:**
- Modify: `app/app.js`: new `TOUR_SLIDES`, `renderTour(idx)`, `finishTour()`, `showTourNotice()` (insert after `renderOnboarding` ~3512), `renderOnboarding` step 3 handler, `init()` ~4270, Profil "Mehr" entry `#btn-tour`
- Modify: `app/styles.css` (nothing needed; tour reuses `.onb` styles - verify)
- Test: `app/test/regression.cjs` (sections 2, 13 adjusted; new section 14k; seeds updated)
- Modify: `CLAUDE.md` test-seeding gotcha (moved to Task 11 to keep one doc touch)

**Interfaces:**
- Produces: `renderTour(idx)`, `finishTour()`, `showTourNotice()`; Profil `#btn-tour`.
- Consumes: `profile.tourSeen` (Task 1), `buildOverlay`, `renderOnboarding`, `showScreen`, `.onb` styles.

- [ ] **Step 1: Add the tour**

Insert directly after `renderOnboarding` (before section 15, Einstufungstest):

```js
  /* ---------- App-Tour (WS5): skippbare Erklaer-Slideshow ---------- */

  var TOUR_SLIDES = [
    { emoji: "🏠", title: "Home & Heute",
      text: "Auf Home siehst du dein Tagesziel und den „Heute“-Block: Buchstabe und Wort des Tages " +
        "und das Häppchen, eine Mini-Runde für zwischendurch." },
    { emoji: "🎓", title: "Lernen: Pfad, Module & Level",
      text: "Im Lernen-Tab wartet dein Pfad, Thema für Thema, dazu geführte Module und Grammatik. " +
        "Neue Level (A0 bis C2) schalten sich mit deinem Fortschritt frei." },
    { emoji: "📈", title: "Fortschritt, ehrlich gemessen",
      text: "„Gemeistert“ heißt: aktiv abgerufen, nicht nur wiedererkannt. Mit dem Mastery-Check " +
        "prüfst du regelmäßig, ob alles noch sitzt, und nimmst Wörter bei Bedarf zurück." },
    { emoji: "⚙️", title: "Profil & deine Daten",
      text: "Alles bleibt auf deinem Gerät. Im Profil stellst du Tagesziel und Level ein und nimmst " +
        "deinen Fortschritt per Export oder Sync-Code mit aufs nächste Gerät." },
    { emoji: "🔊", title: "Audio & Aussprache",
      text: "Jedes Wort hat eine vorproduzierte Stimme. Klingt etwas falsch? Markiere es in der " +
        "Vokabelliste mit „Aussprache falsch“ und schick es als Feedback." }
  ];

  /** Tour-Folie idx rendern; nach der letzten (oder per Ueberspringen) fertig. */
  function renderTour(idx) {
    cleanupSession();
    document.body.classList.add("in-session");
    idx = idx || 0;
    var slide = TOUR_SLIDES[idx];
    if (!slide) return finishTour();
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "onb tour");
    wrap.appendChild(el("div", "onb-step", "Einführung · " + (idx + 1) + "/" + TOUR_SLIDES.length));
    wrap.appendChild(el("div", "onb-logo", slide.emoji));
    wrap.appendChild(el("div", "onb-title small", slide.title));
    wrap.appendChild(el("div", "onb-sub", slide.text));
    wrap.appendChild(btn(idx + 1 < TOUR_SLIDES.length ? "Weiter →" : "Los geht’s 🚀", "btn primary big",
      function () { renderTour(idx + 1); }));
    wrap.appendChild(btn("Überspringen", "btn ghost", finishTour));
    app.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  function finishTour() {
    state.profile.tourSeen = true;
    saveState();
    document.body.classList.remove("in-session");
    showScreen("home");
  }

  /** Einmaliger Hinweis fuer Bestandsnutzer (onboarded && !tourSeen).
   *  tourSeen wird schon beim ANZEIGEN gesetzt: der Hinweis kommt garantiert
   *  nur einmal, egal wie das Overlay geschlossen wird. */
  function showTourNotice() {
    state.profile.tourSeen = true;
    saveState();
    var o = buildOverlay("✨ Neu: kurze Einführung");
    o.box.appendChild(el("div", "overlay-text",
      "Tacheles hat einiges dazugelernt: Heute-Häppchen, ehrlichere Mastery, Vokabelliste, " +
      "Feedback und mehr. Eine kurze Einführung zeigt dir alles. Du findest sie jederzeit " +
      "im Profil unter „Einführung ansehen“."));
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn("Ansehen", "btn primary big", function () {
      o.close();
      renderTour(0);
    }));
    actions.appendChild(btn("Überspringen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }
```

- [ ] **Step 2: New users get the tour after onboarding**

In `renderOnboarding`, step 3 ("Und los! 🚀" handler), replace:

```js
      wrap.appendChild(btn("Und los! 🚀", "btn primary big", function () {
        state.profile.onboarded = true;
        saveState();
        document.body.classList.remove("in-session");
        showScreen("home");
        toast("Schalom! Schön, dass du da bist. 🕊️");
      }));
```

with:

```js
      wrap.appendChild(btn("Und los! 🚀", "btn primary big", function () {
        state.profile.onboarded = true;
        saveState();
        toast("Schalom! Schön, dass du da bist. 🕊️");
        // Frisch onboarded: die Tour einmal automatisch (skippbar, WS5).
        renderTour(0);
      }));
```

- [ ] **Step 3: One-time notice for existing users in `init()`**

In `init()`, replace:

```js
    if (state.profile.onboarded) showScreen("home");
    else renderOnboarding(1);
```

with:

```js
    if (state.profile.onboarded) {
      showScreen("home");
      // Bestandsnutzer: einmaliger Hinweis auf die neue Einfuehrung (WS5).
      if (!state.profile.tourSeen) showTourNotice();
    } else {
      renderOnboarding(1);
    }
```

- [ ] **Step 4: Restart from Settings**

In `#more-card` (Profil), after the Datenschutz `setting-row`, add:

```js
      '<div class="setting-row"><div><div class="setting-label">✨ Einführung ansehen</div>' +
      '<div class="setting-sub">Die kurze Tour durch die App, jederzeit erneut</div></div>' +
      '<button class="btn" id="btn-tour">Starten</button></div>' +
```

Wiring:

```js
    $("#btn-tour").addEventListener("click", function () { renderTour(0); });
```

- [ ] **Step 5: Adjust existing regression sections**

1. Section 2 (Onboarding E2E): after the final "Und los" click, the TOUR appears instead of Home. Replace:

```js
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /und los/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(500);
  check("Onboarding fuehrt zu Home", await page.evaluate(() => !!document.querySelector("#cta-start")));
```

with:

```js
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /und los/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(500);
  check("Onboarding fuehrt zur Tour (Folie 1)", await page.evaluate(() =>
    /Einführung · 1\//.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Tour ueberspringen fuehrt zu Home, tourSeen gesetzt", await page.evaluate(() =>
    !!document.querySelector("#cta-start") &&
    JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.tourSeen === true));
```

2. Corrupt-state seed (section 12, `--- 12. Robustheit ---`): in the seeded `profile` object add `tourSeen: true` (avoids the notice overlay hanging over the rest of the run):

```js
      profile: { onboarded: true, autoplay: false, micHintDismissed: true, sttNoticeConfirmed: true, tourSeen: true },
```

3. Section 13 (Alt-State): the legacy seed intentionally has NO `tourSeen`; extend the section instead of suppressing the notice. Directly after the existing three `check("Alt-State: ...")` calls, add:

```js
  // Bestandsnutzer-Hinweis (WS5): Alt-State (onboarded, tourSeen fehlt) sieht
  // EINMALIG den Einfuehrungs-Hinweis; Ueberspringen setzt tourSeen.
  const notice = await page.evaluate(() => ({
    shown: !!document.querySelector(".overlay") && /kurze Einführung/i.test(document.body.innerText),
    hasBtns: [...document.querySelectorAll(".overlay-actions .btn")].some(b => /ansehen/i.test(b.textContent)) &&
             [...document.querySelectorAll(".overlay-actions .btn")].some(b => /überspringen/i.test(b.textContent))
  }));
  check("Alt-State: einmaliger Tour-Hinweis mit Ansehen/Ueberspringen", notice.shown && notice.hasBtns,
    JSON.stringify(notice));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".overlay-actions .btn")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  const noticeGone = await page.evaluate(() => ({
    overlay: !!document.querySelector(".overlay"),
    tourSeen: JSON.parse(localStorage.getItem("tacheles_state_v1")).profile.tourSeen
  }));
  check("Alt-State: Ueberspringen schliesst Hinweis und setzt tourSeen",
    noticeGone.overlay === false && noticeGone.tourSeen === true, JSON.stringify(noticeGone));
  await page.reload(); await page.waitForTimeout(500);
  check("Alt-State: Hinweis kommt nur EINMAL", await page.evaluate(() => !document.querySelector(".overlay")));
```

(The section-14 audio checks that follow reload the page anyway; after the skip, no overlay reappears.)

4. Sweep the remaining seed blocks: every `localStorage.setItem("tacheles_state_v1", ...)` that writes a FRESH object with `profile.onboarded: true` must also set `profile.tourSeen: true` (sections 2c and later mutate the existing state object, which already has `tourSeen: true` after the tour-skip in section 2, so they need no change; grep the file for `onboarded: true` to be sure the only fresh-object seeds are sections 12 and 13, handled above).

- [ ] **Step 6: New tour checks (section 14k)**

```js
  // --- 14k. Tour: aus dem Profil neustartbar, Folien blaetterbar, skippbar ---
  await page.evaluate(() => { const b = [...document.querySelectorAll(".nav-btn")].find(x => x.dataset.screen === "profile"); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Tour: Profil-Eintrag 'Einführung ansehen'", await page.evaluate(() => !!document.querySelector("#btn-tour")));
  await page.evaluate(() => { const b = document.querySelector("#btn-tour"); if (b) b.click(); });
  await page.waitForTimeout(350);
  check("Tour: Folie 1 sichtbar", await page.evaluate(() => /Einführung · 1\/5/.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /^weiter/i.test(x.textContent.trim())); if (b) b.click(); });
  await page.waitForTimeout(300);
  check("Tour: Weiter blaettert zu Folie 2", await page.evaluate(() => /Einführung · 2\/5/.test(document.body.innerText)));
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /überspringen/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400);
  check("Tour: Ueberspringen fuehrt zu Home", await page.evaluate(() => !!document.querySelector("#cta-start")));
```

- [ ] **Step 7: Run full regression**

Run: `cd app && node --check app.js && node --check test/regression.cjs && node test/regression.cjs`
Expected: PASS, exit 0. Pay attention to: section 2 (adjusted), section 11 (placement flow ends on the result screen and never reaches the tour, unchanged), section 13 (three new notice checks), 14k.

- [ ] **Step 8: Commit**

```bash
git add app/app.js app/test/regression.cjs
git commit -m "feat: app tour slideshow with one-time notice for existing users

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Release polish (SW cache bump, CLAUDE.md, final verification)

**Files:**
- Modify: `app/sw.js` line 14 (`CACHE_NAME`)
- Modify: `CLAUDE.md` (feature notes, test-seeding gotcha, check count)

**Interfaces:** none (release housekeeping).

- [ ] **Step 1: Bump the service worker cache once**

In `app/sw.js`, change:

```js
var CACHE_NAME = "tacheles-v12";
```

to:

```js
var CACHE_NAME = "tacheles-v13";
```

`ASSETS` stays unchanged (no new load-relevant files were added; all new screens live in `app.js`). `AUDIO_CACHE` stays `tacheles-audio-v1`.

- [ ] **Step 2: Update CLAUDE.md**

1. In the app-description bullet list (section `## App (app/)`), extend the `app.js` line's mode summary: after "13 Modi + Survival-Check + geführte Module + Einstufungstest" add " + Mastery-Check + Tour"; and add one new bullet after the audio bullet:

```
- **Neu (dieser Release):** „Heute“-Block (Buchstabe/Wort des Tages per Datums-Hash `dayHash`,
  Häppchen-Session `size:5`), „Lesen lernen“ (synthetisches Modul via `buildReadingModule`),
  ehrliche Mastery (`isProduction`, Erkennen deckelt bei 2, `demoteMastery`-Veto, Mastery-Check),
  Vokabel-Browser, Feedback-Hub (`feedback` im State, GitHub-Prefill/mailto), Kontakt/Impressum-
  und Datenschutz-Screens (In-App, Laien-Vorlage), App-Tour (`profile.tourSeen`).
```

2. In `## Konventionen & Gotchas`, update the SW bullet's "(aktuell v12)" to "(aktuell v13)".
3. Extend the test-seeding gotcha bullet ("In Tests Onboarding überspringen: ...") to include `tourSeen=true`:

```
- In Tests Onboarding überspringen: `profile.onboarded=true`, `profile.tourSeen=true`,
  `autoplay=false`, `micHintDismissed=true` in localStorage seeden, dann reload (sonst
  erscheint der einmalige Tour-Hinweis).
```

4. In the `## Tests` section, update "85 Checks" to the actual final count (read it from the last regression run output, e.g. "PASS – alle N Checks gruen.").

- [ ] **Step 3: Final verification**

Run:

```
cd app && node --check app.js && node --check content.js && node --check grammar.js && node --check sw.js && node --check test/regression.cjs && node test/regression.cjs
```

Expected: PASS, all checks green, exit 0, "0 Konsolen-/Seitenfehler" green. Then `git status` must show a clean tree apart from the intended files.

- [ ] **Step 4: Commit**

```bash
git add app/sw.js CLAUDE.md
git commit -m "chore: bump service worker cache to v13, document release in CLAUDE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review (spec coverage, placeholders, type consistency)

**Spec coverage** (every spec section -> task):

| Spec section | Plan task |
|---|---|
| Globale Rahmenbedingungen (build-frei, Allowlist-Terminologie inkl. CLAUDE.md, Tests, SW-Bump, de-UI, Rechtstexte-Disclaimer) | Global Constraints + Tasks 1, 9, 11 |
| 1.1 Ehrlichere Mastery (Klassifikation, Deckel 2, Produktion für 3+, „Schwer" nie über 2, Erstkontakt zählt nicht, MC 4 harte Optionen, keine Antwort-Leaks) | Task 2 |
| 1.2 Mastery-Veto (Gold-Toast antippbar -> demoteMastery), Durchsehen im Browser, Mastery-Check mit Runden-Auswahl (Falsche vorausgewählt, Zurücknehmen) | Tasks 3, 4, 7 (Browser-Demote) |
| 1.3 „Heute“-Block (Buchstabe/Wort des Tages per dayHash, Häppchen ~5, Aufgaben prominenter) | Task 5 |
| 1.4 „Lesen lernen“ (Buchstabe -> enthaltendes Wort -> Erkennungsfrage, prominent für Anfänger) | Task 6 |
| WS2 Vokabel-Browser (Band-Wähler, Zeile mit DE/Umschrift/he/🔊, Badge + „nicht gemeistert“, Aussprache-Toggle, Filter „nur gemeisterte“) | Task 7 |
| WS3 Feedback (State `feedback`, Hub, Footer-Link, GitHub-Issue-Prefill caol-ila/tacheles mit 6000-Kappung, mailto-Fallback, kein Auto-Löschen) | Tasks 1 (State), 8 |
| WS4 Kontakt/Impressum + Datenschutz (alle geforderten Abschnitte, In-App, Settings + Footer) | Task 9 |
| WS5 Tour (Folien, skippbar, neustartbar, neu = nach Onboarding, Bestand = einmaliger Hinweis, tourSeen) | Tasks 1 (State), 10 |
| State-Schema-Zusammenfassung (tourSeen, feedback; Merge-Regeln; version bleibt 1) | Task 1 |
| Fehlerbehandlung & Edge-Cases (TTS-Fallback bestehend; „des Tages“-Fallback; Prefill-Kürzung; Browser bandweise; Demotion-No-Op; Determinismus) | Tasks 5 (Fallback-Pool, dayHash), 8 (capUrl), 7 (bandweise), 3 (No-Op) |
| Tests (alle im Spec gelisteten Prüfungen) | per-task regression sections 14b-14k + adjusted sections 2/13 |
| Non-Goals (kein Backend, keine Anschrift, kein Audio-Lauf) | respected; no task touches them |
| Umsetzungsreihenfolge (seriell 1->5, Test je Abschnitt) | task order 1-11, test+commit per task |

**Placeholder scan:** no TBD/TODO/"implement later"/"similar to Task N" anywhere; every code step shows the actual code; every test step contains the actual check code and the exact run command. The only intentionally soft spots are explicitly flagged as implementation-time verifications with a concrete default (CSS variable names in Tasks 4/7/9; the `>= 30` A0 row-count threshold in Task 7).

**Type consistency:** `demoteMastery(itemId) -> boolean` defined in Task 3, consumed with identical semantics in Tasks 4 and 7. `rateItem(id, grade, masteryCap)` / `recordAnswer(itemId, mode, grade, dir)` / `isProduction(mode, dir)` defined in Task 2 and used with those exact signatures everywhere (Tasks 2-4, debug). `dayHash(s) -> uint32` and `dailyPicks() -> {letter, word}` (Task 5) match their debug wrappers. `capUrl(base, body, max) -> {url, truncated}` matches `feedbackIssueUrl`/`feedbackMailtoUrl` returns (Task 8). `startSession` gains `opts.size` (Task 5) and `opts.moduleObj` (Task 6), both optional and backward compatible. `footerLinksHtml`/`wireFooterLinks` are introduced in Task 8 and REPLACED (not duplicated) in Task 9. `profile.tourSeen`/`state.feedback` (Task 1) are consumed by Tasks 7, 8, 10 under the same names.

**Resolved spec ambiguities** (stated so the implementer does not re-litigate):
1. Classification of unlisted modes (`image`, `signs`, `dialog`, `blitz`, audio course): recognition (mastery cap 2), since the spec's production list is exhaustive (`MC de->he, build, speak, Karte de->he, cloze/form`); module `pairquiz` counts as MC de->he (production).
2. Mastery-Check tasks are MC with alternating he2de/de2he (covers "Erkennen/Produzieren" and stays test-drivable); a wrong answer already demotes 3->2 via the normal `again` rating, the preselected checkbox then confirms it (demote no-op).
3. Existing-user notice sets `tourSeen` when SHOWN (not only on button press), guaranteeing strictly-once even for Escape/backdrop dismissal.
4. "Antwort nicht unmittelbar vor der Frage": audit confirms `quiz: true` already hides letter translits in all question renderers; the intro-then-query flow stays (Teach-First by design) and is defused by the first-contact rule.
5. `dayHash` reuses the existing FNV-1a core (`audioHash` refactored to share `fnv1a`), pinned by the existing audio URL-mapping regression check.



