# Content to C2 and Grammar Modules

> **For agentic workers:** Tasks C (content), G (grammar) and B (app) run as parallel implementation agents against the contracts below. Agents edit files only; never git. The orchestrator integrates, tests, reviews, commits.

**Goal:** Extend the band system to C1/C2 with new vocabulary content, and add grammar learning: per band, the relevant grammar explained in guided modules and practiced through new quiz step types (cloze and form choice).

**Architecture:** Stays build-free classic-script. C1/C2 vocabulary is additive in `content.js`. Grammar modules live in a NEW file `app/grammar.js` (own global, merged into `CONTENT.modules` at init) so the content and grammar agents can work in parallel and `content.js` stays vocabulary-only. The module runner gains two step renderers (`cloze`, `form`). The Lernen screen splits modules into two sections (Grundlagen / Grammatik).

## Global Constraints

- Everything from the previous plan still holds: no build step/modules/fetch/deps, file:// compatible, item IDs sacred, additive content, normalizeState whitelist, local dates, German UI copy, German code comments matching the file idiom, English commits/PR/issue.
- `sw.js`: add `./grammar.js` to ASSETS and bump CACHE_NAME v7 -> v8.
- `TACHELES_CONTENT.version` 2 -> 3. State `version` stays 1.
- After changes: `node --check app.js content.js grammar.js`; full suite `cd app && node test/regression.cjs` (currently 67 checks, all must stay green).
- Native-speaker review remains pending; grammar explanations must still be factually correct (this gets its own review pass).

---

## Shared Schema Contract

### Bands

`BANDS = ["A0","A1","A2","B1","B2","C1","C2"]`. `LEVEL_CAPS` is DERIVED: `["auto"].concat(BANDS)` (no second hardcoded list). Placement, band progress, auto-advance, level select and the regression band check all already iterate these arrays and extend automatically.

### New file `app/grammar.js` (Agent G produces, Agent B consumes)

Classic script defining ONE global:

```js
window.TACHELES_GRAMMAR = {
  version: 1,
  modules: [ /* same module schema as content.js modules, plus: */ ]
};
```

Every grammar module has `group: "grammar"` and may use the existing step types (`explain` with optional `examples`, `teach`, `quiz`, `pairquiz`) plus two NEW types:

```js
// 'cloze': Hebrew sentence with a gap; pick the missing word/form.
{ type: "cloze",
  he: "אני ___ קפה",              // gap always as ___
  translit: "ani ___ kafe",
  de: "Ich trinke Kaffee. (m)",   // German meaning incl. needed context
  options: [                        // 2-4, EXACTLY one correct:true
    { he: "שותה",  translit: "shote",  correct: true },
    { he: "שותים", translit: "shotim" }
  ],
  note: "optional kurze Ausflösung",   // shown after answering
  itemId: "optional-existing-item-id"  // if set: recordAnswer; else free answer
}
// 'form': German task, pick the right Hebrew form.
{ type: "form",
  prompt: "„gut“ für eine Frau",  // German instruction
  options: [ { he: "טובה", translit: "tova", correct: true },
             { he: "טוב",  translit: "tov" } ],
  note: "Adjektive richten sich nach dem Nomen: -a für feminin." }
```

App init merges `TACHELES_GRAMMAR.modules` into `CONTENT.modules` (defensive: missing global tolerated, duplicate module IDs skipped with the content.js one winning).

### Module grouping (Agent B)

Lernen screen renders two module sections, both band-gated with the existing tile UI: "📚 Module" (modules without `group`) and "🧠 Grammatik" (`group === "grammar"`).

---

## Task C: C1/C2 vocabulary (`app/content.js` ONLY)

- C1: 3-4 new themes with `band: "C1"`, >= 60 items (suggested: Arbeitswelt & Verhandeln, Kultur & Literatur, Wissenschaft & Technik, Gefühle & Beziehungen im Detail).
- C2: 3-4 new themes with `band: "C2"`, >= 50 items (suggested: Rhetorik & Politik, Ironie & Wortspiel, Amtssprache & Verträge, seltene Idiome & Register).
- Each band needs >= 4 `word`/`phrase` items minimum for placement; obviously exceeded by the quotas.
- >= 2 new dialogues (one C1, one C2) with `band` set.
- Item schema, freq ordering, tokens for sentences, opposite links where natural, EMOJI additions: all rules from the previous plan apply. Totals afterwards: items >= 620, themes >= 36, dialogues >= 14.
- Bump `version: 2` -> `3`, update the header comment.

## Task G: grammar modules (NEW file `app/grammar.js` ONLY)

At least 18 grammar modules across the bands, all `group: "grammar"`, band-gated, warm German "du" teaching prose in explain steps, then practice via cloze/form (and quiz/pairquiz on existing content.js items where natural). Target >= 90 cloze/form steps total. Suggested curriculum:

- A0: Genus (m/f, -a/-et), bestimmter Artikel ha- (kein unbestimmter), Personalpronomen.
- A1: Präsens (m/f/sg/pl), Besitz mit shel (+ sheli/shelcha...), Fragen & Wortstellung, Plural (-im/-ot + Ausnahmen).
- A2: Vergangenheit (Grundparadigma), Zukunft (Grundlagen), Präpositionen be-/le-/mi- + Suffixe, Adjektiv-Kongruenz.
- B1: Binjanim-Überblick (pa'al/pi'el/hif'il), Smichut, Objektmarker et + Objektpronomen.
- B2: Passiv-Binjanim erkennen (nif'al/pu'al/huf'al), Konditional (im/ilu), Relativsätze mit she-.
- C1: Binjanim-Feinheiten (hitpa'el, Verbalnomen), Register formell vs. Umgangssprache.
- C2: gehobene/literarische Formen im modernen Gebrauch, idiomatische Syntax.

Rules: every option set has EXACTLY one `correct: true` and 2-4 options; options are real morphological contrasts (plausible wrong forms, not random words); niqqud-level care in `he`/`translit`; `itemId` only when the referenced item exists in content.js as of main today (do not reference the parallel agent's new C1/C2 items); explain steps cite examples the learner already knows from A0/A1 where possible. `node --check grammar.js` and a self-written scratchpad validation script (unique IDs, exactly-one-correct, 2-4 options, valid itemId refs against content.js) must pass. Scratchpad: C:\Users\THOMAS~1\AppData\Local\Temp\claude\c--Source-Tacheles\d483a7e4-09c7-470f-83e7-c22ae9985dd9\scratchpad

## Task B: app integration (`app/app.js`, `app/index.html`, `app/sw.js`, `app/styles.css`, `app/test/regression.cjs`, `CLAUDE.md`)

1. Extend `BANDS` with "C1","C2"; derive `LEVEL_CAPS` from it (remove the duplicate literal).
2. Load order in index.html: content.js, grammar.js, app.js. Init merge of `TACHELES_GRAMMAR.modules` into `CONTENT.modules` (defensive per contract).
3. Renderers for `cloze` and `form` in the module runner: question header ("Welche Form passt?" / the German prompt), Hebrew gap sentence big RTL with translit (cloze), Hebrew option buttons (RTL) with translit sublines, exactly-one-correct evaluation, `note` shown after answering, wrong answers get the standard "Weiter" button; recording via `recordAnswer(itemId, "mc", ...)` when itemId set, else `recordFreeAnswer("mc", correct)`. Keyboard 1-4/Enter as usual.
4. Lernen screen: two module sections (Grundlagen / Grammatik) per contract; both respect band locks; tiles unchanged otherwise (step count/duration line already generic).
5. `sw.js`: ASSETS += "./grammar.js", CACHE_NAME v8.
6. Regression additions (all existing 67 stay green; adjust floors: items >= 620, themes >= 36, dialogues >= 14):
   - grammar.js loaded: `window.TACHELES_GRAMMAR.modules.length >= 18`, merged into CONTENT.modules, no duplicate module IDs after merge.
   - step integrity in-page: every cloze/form step has 2-4 options with exactly one correct, valid optional itemId; >= 90 cloze/form steps.
   - bands: BANDS via TACHELES_DEBUG now length 7; every C1/C2 theme locked at default level; levelCap select offers C2.
   - E2E: open a grammar module (seed levelCap high enough if the first grammar module is band-locked), walk to a cloze/form step, answer correctly and wrongly (Weiter click), answersTotal increments.
   - placement: with C1/C2 bands present the placement flow still completes (existing E2E covers A0 fail-fast; add an assertion that BANDS-driven placement does not exceed 7 bands and the result screen still appears).
7. CLAUDE.md: update facts (bands to C2, grammar.js file, module groups, new check count) at the end.

## Integration (orchestrator)

node --check all three JS files; full suite green; two read-only reviewers (app-logic + Hebrew GRAMMAR correctness, the latter reads every explain text and every cloze/form option set); fixes in main loop; docs/11 update; commit; push; issue + draft PR. The PR stays draft (round-1 merge authorization does not extend to this round).
