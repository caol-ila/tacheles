# 03 – Generisches Inhaltsmodell

Das ist das architektonische Herz von Tacheles und die direkte Antwort auf die Vorgabe
"Baue es so auf, dass die Inhalte generisch über die verschiedenen Modi gelernt werden können."

## Grundidee: ein Atom, viele Renderer

Es gibt **eine** kanonische Inhaltseinheit, das **LernItem** (Content-Atom). Jeder Lernmodus ist
nur ein **Renderer**, der ein LernItem in eine bestimmte Interaktion übersetzt. Der Content wird
also einmal gepflegt und überall wiederverwendet.

```
                        +--------------------+
                        |     LernItem       |   (einmal gepflegt)
                        |  he / he_niqqud    |
                        |  translit / de     |
                        |  audio / bild      |
                        |  wortart / wurzel  |
                        |  thema / frequenz  |
                        |  beispielsaetze[]  |
                        +----------+---------+
                                   |
        +----------+----------+----+-----+-----------+-----------+
        |          |          |          |           |           |
   Karteikarte  Swipe      Reel    MultipleChoice  Lueckentext  Hoeren   ... (jeder Modus
   (Flashcard) (Tinder)  (TikTok)   (Erkennen)     (Cloze)     (Audio)    ist ein Renderer)
```

**Regel:** Modi enthalten **keine** eigenen Inhalte. Sie deklarieren nur, welche Item-Typen und
welche Abfrage-Richtungen sie unterstützen, und ziehen ihre Items vom Session-Generator
(fällige Reviews + neue Items, siehe [Didaktik](02-didactic-model.md)).

---

## Die Entitäten

### 1. LernItem (Content-Atom)

Die zentrale Einheit. Deckt Wörter, Wendungen, Sätze, Dialogzeilen, Buchstaben und Schilder ab,
unterschieden durch `type`.

```ts
type ItemType =
  | "word"        // Einzelwort
  | "phrase"      // feste Wendung / Chunk ("Wie viel kostet das?")
  | "sentence"    // Beispiel-/Übungssatz
  | "letter"      // Buchstabe des Aleph-Bet (inkl. Endform)
  | "sign"        // reales Schild ("יציאה" = Ausgang)
  | "number"      // Zahl (eigene Logik: Ziffer, Wort, Genus)
  | "dialogue_line"; // eine Zeile innerhalb eines Dialogs

interface LernItem {
  id: string;                    // stabil, z. B. "word.shalom"
  type: ItemType;

  // --- Sprachinhalt (Kern) ---
  he: string;                    // Hebräisch OHNE Niqqud (Ziel-Ansicht, wie Schilder)   שלום
  he_niqqud?: string;            // Hebräisch MIT Niqqud (Stützrad-Ansicht)             שָׁלוֹם
  translit: string;             // Transliteration (Stützrad)                          "shalom"
  de: string;                    // Deutsche Bedeutung / Übersetzung                    "Hallo / Friede"
  de_alt?: string[];             // akzeptierte alternative Übersetzungen

  // --- Aussprache & Medien ---
  audio_url?: string;            // Muttersprachler-Aufnahme (oder TTS-Fallback)
  ipa?: string;                  // phonetische Umschrift (optional)
  image_url?: string;            // Bild fuer Bild-Wort-Modi, Reels, Drops-Stil
  clip_url?: string;             // kurzer Video-/Animationsclip fuer Reels-Modus (optional)

  // --- Linguistische Metadaten ---
  pos?: "noun" | "verb" | "adj" | "adv" | "prep" | "pron" | "num" | "interj" | "phrase";
  root?: string;                 // Wurzel / Schoresch, z. B. "ש-ל-ם"
  gender?: "m" | "f";            // Genus (Substantive/Adjektive)
  number?: "sg" | "pl";
  register?: "neutral" | "formal" | "slang";
  binyan?: string;               // Verbstamm (nur Verben), optional

  // --- Didaktik-Metadaten ---
  frequency_rank?: number;       // 1 = haeufigstes; steuert Freischalt-Reihenfolge
  cefr?: "A0" | "A1" | "A2";
  utility_boost?: number;        // manueller Hochzieher fuer Alltagsnutzen (z. B. "Ausgang")
  theme_ids: string[];           // Zugehoerigkeit zu Themen (siehe 04)
  tags?: string[];               // frei: "reise", "essen", "hoeflichkeit" ...

  // --- Beziehungen ---
  example_ids?: string[];        // LernItems vom Typ sentence, die dieses Item zeigen
  related_ids?: string[];        // Synonyme, Gegenteile, Wurzelverwandte
  distractor_ids?: string[];     // bevorzugte Falsch-Antworten fuer MC/Matching (sonst auto)

  // --- fuer type = sentence / dialogue_line / phrase ---
  tokens?: Token[];              // Wort-fuer-Wort-Struktur (fuer Satzbau, Tap-Uebersetzung)

  // --- fuer type = sign ---
  sign_category?: "richtung" | "gebot" | "verbot" | "info" | "laden" | "verkehr";
  real_photo_url?: string;       // echtes Foto eines Schildes (Schilder-Modus)

  // --- Redaktion ---
  status: "draft" | "review" | "published";
  content_version: number;       // fuer Content-Updates / Migrationen
}

interface Token {              // ein Wort innerhalb eines Satzes
  he: string;
  he_niqqud?: string;
  translit: string;
  de: string;
  lemma_id?: string;           // Verweis auf das LernItem des Grundworts
}
```

### 2. Theme (Themenbereich)

Gruppiert Items thematisch und liefert die Lern-Landkarte. Details in [04](04-content-themes.md).

```ts
interface Theme {
  id: string;                    // "greetings", "food_ordering", "signs_directions"
  title_de: string;             // "Begrüßung & Höflichkeit"
  emoji: string;                 // 👋
  band: "A0" | "A1" | "A2";
  order: number;                 // Reihenfolge im Lernpfad
  description_de: string;
  item_ids: string[];            // enthaltene LernItems
  prerequisite_theme_ids?: string[];
}
```

### 3. Dialogue (Konversation)

Eine geordnete Folge von Zeilen mit Sprecherrollen, für Dialog- und Sprech-Modus.

```ts
interface Dialogue {
  id: string;
  title_de: string;
  theme_ids: string[];
  band: "A0" | "A1" | "A2";
  roles: string[];               // ["Kellner", "Gast"]
  lines: DialogueLine[];
}

interface DialogueLine {
  order: number;
  role: string;
  item_id: string;               // Verweis auf ein LernItem (type dialogue_line/phrase/sentence)
}
```

### 4. Lesson (kuratierte Lektion, optional)

Für den geführten Lektions-Modus. Eine Lektion ist eine **Auswahl + Reihenfolge** von Items und
Übungsschritten, nicht eigener Content.

```ts
interface Lesson {
  id: string;
  theme_id: string;
  order: number;
  title_de: string;
  steps: LessonStep[];           // Abfolge aus Renderer-Aufrufen
}

interface LessonStep {
  mode: ModeId;                  // welcher Renderer (z. B. "multiple_choice")
  item_ids: string[];           // welche Items
  direction?: PromptDirection;
}
```

### 5. LearningState (pro Nutzer:in, wird gesynct)

Der einzige Teil, der pro Person entsteht und synchronisiert wird. Inhalte selbst sind statisch.

```ts
interface LearningState {
  user_id: string;               // anonyme UID oder verknuepftes Konto
  item_id: string;

  // FSRS-Gedaechtniszustand (siehe Didaktik, Saeule 1)
  stability: number;
  difficulty: number;
  due_at: string;                // ISO-Datum, wann faellig
  last_review_at?: string;
  reps: number;                  // Anzahl erfolgreicher Reviews
  lapses: number;                // Anzahl Vergessens-Ereignisse
  state: "new" | "learning" | "review" | "relearning";

  // Didaktik-Fortschritt
  mastery_level: 0 | 1 | 2 | 3 | 4;   // steuert Abfrage-Tiefe + Fade
  niqqud_visible: boolean;            // abgeleitet aus mastery, aber ueberschreibbar
  translit_visible: boolean;

  updated_at: string;                 // fuer Last-Write-Wins-Sync
}
```

### 6. Weitere gesyncte Nutzerdaten

```ts
interface UserProfile {
  user_id: string;
  display_name?: string;
  daily_goal_minutes: 5 | 10 | 15 | 20;   // Autonomie (E2)
  settings: {
    fade_mode: "auto" | "manual_niqqud_off" | "keep_supports";
    audio_autoplay: boolean;
    reduce_motion: boolean;           // Accessibility
    haptics: boolean;
    notifications: "off" | "gentle" | "standard";
  };
  updated_at: string;
}

interface Gamification {              // siehe 06
  user_id: string;
  xp_total: number;
  streak_days: number;
  streak_freezes: number;
  last_active_day: string;
  achievements: string[];            // erreichte Achievement-IDs
  league_opt_in: boolean;
  updated_at: string;
}

interface ReviewEvent {               // append-only Log fuer Analytics + Resync
  user_id: string;
  item_id: string;
  mode: ModeId;
  rating: 1 | 2 | 3 | 4;             // Nochmal / Schwer / Gut / Leicht
  correct: boolean;
  response_ms: number;
  ts: string;
}
```

---

## Wie ein Modus ein Item konsumiert (Renderer-Vertrag)

Jeder Modus implementiert dasselbe Interface. Das ist der Mechanismus, der "generisch über alle
Modi" technisch garantiert.

```ts
type ModeId =
  | "flashcard" | "swipe" | "reels" | "multiple_choice" | "matching"
  | "cloze" | "listen_type" | "sentence_build" | "image_word"
  | "sign_reading" | "dialogue" | "audio_course" | "speak" | "blitz";

type PromptDirection =
  | "de_to_he"       // Deutsch gezeigt, Hebräisch gesucht (Produktion)
  | "he_to_de"       // Hebräisch gezeigt, Deutsch gesucht (Erkennen)
  | "audio_to_he"    // Audio gehoert, Schrift gesucht
  | "audio_to_de"
  | "he_to_audio";   // lesen und sprechen

interface LearnMode {
  id: ModeId;
  supports(item: LernItem): boolean;         // z. B. sentence_build nur fuer sentence/phrase
  supportedDirections: PromptDirection[];
  minMastery?: number;                       // z. B. speak erst ab mastery 2
  render(item: LernItem, ctx: RenderContext): Interaction;
  // Ergebnis jeder Interaktion -> scheduler.grade(user, item, rating, mode, response_ms)
}
```

`RenderContext` liefert dem Renderer u. a. `niqqud_visible` / `translit_visible` (aus dem
LearningState, Niqqud-Fade), die passende `direction` und ggf. Distraktoren.

**Distraktoren-Erzeugung** (für MC/Matching/Swipe): bevorzugt aus `distractor_ids`, sonst
automatisch aus Items desselben `theme_id` + gleicher `pos` mit ähnlichem `frequency_rank`.
Das hält Falsch-Antworten plausibel, ohne manuelle Pflege.

---

## Content-Autorenschaft & Format

- **Ablage:** Content als versionierte JSON-/YAML-Dateien im Repo (`/content/items/*.json`,
  `/content/themes/*.json`, `/content/dialogues/*.json`). Mit der App ausgeliefert (statisch),
  damit Sync-Reads winzig bleiben (G-Befunde, Free Tier).
- **Content-Versionierung:** `content_version` pro Item plus ein globales Content-Manifest mit
  Version. App lädt Delta bei Update.
- **Validierung:** ein Schema-Check (z. B. Zod) im CI stellt sicher, dass jedes published Item
  Pflichtfelder hat (`he`, `translit`, `de`, `theme_ids`, Audio bei Wörtern/Wendungen).
- **Audio-Pipeline:** Muttersprachler-Aufnahmen bevorzugt; TTS (z. B. hebräische Stimme) als
  Fallback und für schnelles Prototyping.
- **Autorenwerkzeug:** anfangs Tabelle/CSV → JSON-Konverter genügt. Später optional ein kleines
  Admin-UI (nicht MVP).

---

## Warum das die Vorgabe erfüllt

- **Einmal pflegen:** Ein Wort wie שלום wird einmal als LernItem angelegt.
- **Überall lernen:** Dasselbe Item erscheint als Karteikarte, Swipe-Karte, Reel, MC-Frage,
  Lückentext, Hörübung, im Dialog und als gesprochene Produktion, ohne Duplikat.
- **Ein Fortschritt:** Alle Modi schreiben in denselben `LearningState`. Wer שלום im Reels-Feed
  meistert, muss es nicht in den Karteikarten erneut lernen. Ein Wissen, viele Wege.
