# 10 – Architektur & Tech-Stack

Ziel: **ein Codebase für Web und Android**, kostenlos betreibbar, offline-first, mit klarer
Trennung zwischen generischem Content, SRS-Engine und Modus-Renderern.

## Empfohlener Stack

| Schicht | Wahl | Warum |
|---------|------|-------|
| Sprache | **TypeScript** | ein Typ-System über UI, Content-Schema, SRS |
| App | **Expo (React Native) + React Native Web** | ein Codebase → echte Android-App (Play Store) **und** Web-Build |
| Navigation | Expo Router | dateibasiertes Routing, Web + Native |
| State | Zustand (oder Redux Toolkit) | schlank, gut testbar |
| Lokaler Store | expo-sqlite (Native) / IndexedDB via Dexie (Web), optional **RxDB** für beides + Sync | offline-first |
| SRS-Engine | **`ts-fsrs`** (MIT) | belegtes FSRS-Modell (D4), kostenlos, modus-agnostisch |
| Backend/Sync | **Supabase** (Free Tier) | Postgres, anonyme Auth, RLS, Realtime (siehe 07) |
| Medien-CDN | Supabase Storage / Cloudflare R2 / GitHub Releases | Audio/Bilder ausliefern |
| Audio | vorproduzierte Muttersprachler-Clips; TTS-Fallback (hebräische Stimme) | Aussprache |
| Speech-in | Web Speech API (Web) / expo-speech-recognition (Native) | optionaler Sprechen-Modus |
| Build/CI | EAS Build (Expo) + GitHub Actions | Android-Artefakt + Web-Deploy |
| Web-Hosting | Vercel / Netlify / Cloudflare Pages (Free) | statisches Web-Deploy |

**Warum Expo und nicht getrennt Web + Android?** Die Vorgabe ist "Webseite und Android App".
Expo + React Native Web liefert beide aus **einer** TypeScript-Codebasis: dieselben
Modus-Renderer, dieselbe SRS-Engine, dasselbe Content-Loading. Das halbiert den Aufwand und hält
Verhalten konsistent.

**Minimalistische Alternative (falls Native-Build vermieden werden soll):** eine reine **PWA**
(React + Vite). Auf Android via "Zum Startbildschirm hinzufügen" installierbar, ein einziger
Build, kein Play-Store-Prozess. Nachteil: kein echtes Store-Listing, eingeschränktere
Native-Features (Haptik, Hintergrund-Audio, STT). Empfehlung: mit Expo starten, PWA-Export ist
mit Expo Web ohnehin fast geschenkt.

---

## Schichten-Architektur

```
+-------------------------------------------------------------+
|  UI / Screens (Expo Router)                                 |
|  Home · Session · Modus-Renderer · Profil · Fortschritt     |
+-------------------------------------------------------------+
|  Mode Layer (Renderer)                                      |
|  flashcard, swipe, reels, mc, matching, cloze, listen,      |
|  sentence_build, image_word, sign_reading, dialogue,        |
|  audio_course, speak, blitz   -- alle via LearnMode-Vertrag |
+-------------------------------------------------------------+
|  Session Generator                                          |
|  waehlt Items (70% due / 30% neu), Modus-Mix, Schwierigkeit |
+----------------------------+--------------------------------+
|  SRS Engine (ts-fsrs)      |  Gamification Engine           |
|  grade(user,item,rating)   |  XP, Streak, Achievements       |
+----------------------------+--------------------------------+
|  Domain Store (Zustand) + Local Persistence (SQLite/IndexedDB)|
+----------------------------+--------------------------------+
|  Content Provider          |  Sync Provider (Supabase)      |
|  laedt statisches JSON      |  anon auth, LWW, offline queue |
|  + Medien vom CDN           |  RLS: user_id = auth.uid()     |
+----------------------------+--------------------------------+
```

**Kernprinzip (aus 03):** Der Mode Layer kennt nur den `LearnMode`-Vertrag und `LernItem`. Er
kennt weder die konkrete Sprache noch das Backend. Neue Modi oder Item-Typen erweitern nur die
Matrix, nicht den Rest.

---

## Datenfluss einer Antwort

```
Nutzer antwortet in Modus M
      |
      v
Renderer erzeugt Ergebnis (rating 1..4, correct, response_ms)
      |
      +--> SRS.grade(user, item, rating)  -> neuer LearningState (stability/difficulty/due)
      +--> Gamification.award(mode, correct, faellig) -> XP/Streak/Achievements
      +--> ReviewEvent ins append-only Log
      |
      v
Domain Store aktualisiert  -> UI Update (< 100 ms, lokal)
      |
      v
Sync Provider: lokal schreiben, in Sync-Queue; bei Netz -> Supabase (LWW / append)
```

---

## Repo-Struktur (Vorschlag)

```
schaloemchen/
  app/                      # Expo Router Screens
    (tabs)/home.tsx
    (tabs)/learn.tsx
    (tabs)/progress.tsx
    (tabs)/profile.tsx
    session/[mode].tsx
  src/
    modes/                  # ein Ordner pro Renderer, alle via LearnMode
      flashcard.tsx  swipe.tsx  reels.tsx  multipleChoice.tsx  ...
    srs/                    # ts-fsrs Wrapper + Scheduler
    session/                # Session Generator
    gamification/
    content/                # Content Provider + Zod-Schemas
    sync/                   # Supabase Client, Offline-Queue, LWW
    store/                  # Zustand
    ui/                     # gemeinsame Komponenten (HebrewText mit RTL+Fade, AudioButton)
  content/                  # STATISCHER Content (mit App ausgeliefert)
    items/*.json
    themes/*.json
    dialogues/*.json
    manifest.json           # Content-Version
  assets/audio/  assets/img/
  tests/
```

**`ui/HebrewText`** ist eine zentrale Komponente: rendert Hebräisch RTL, wendet den Niqqud-/
Transliterations-Fade nach `mastery_level` an und bietet Tap-to-reveal (siehe Didaktik R6).

---

## Content-Pipeline

1. Redaktion pflegt Items in Tabelle/CSV oder direkt JSON.
2. Konverter + **Zod-Validierung** im CI: Pflichtfelder, Audio vorhanden, RTL-Zeichen ok.
3. `manifest.json` bekommt neue `content_version`.
4. Build bündelt Content; App lädt beim Start das Delta (nur geänderte Items) und cacht Medien.

---

## Teststrategie

- **Unit:** SRS-Scheduler (Intervall-Progression, Lapse-Verhalten), Fade-Logik, XP-Formel,
  Distraktoren-Auswahl.
- **Contract:** jeder Modus erfüllt den `LearnMode`-Vertrag; `supports()`-Matrix stimmt mit
  [05](05-learning-modes.md) überein.
- **Sync:** Offline → Online-Merge (LWW), Idempotenz des Event-Logs, Doppel-Sync ohne
  Doppelzählung.
- **RTL/Render:** Snapshot-Tests hebräischer Zeilen inkl. gemischt de/he.
- **E2E:** eine Session pro Modus (Playwright für Web, Detox/Maestro für Native).

---

## Kostenrahmen (Ziel: 0 EUR im Start)

- Supabase Free Tier für Auth + Fortschritts-Sync (Content synct nicht, siehe 07).
- Web-Hosting auf Vercel/Netlify/Cloudflare Free.
- EAS Build Free-Kontingent für Android-Artefakte; Play-Store-Einmalgebühr nur bei
  Store-Veröffentlichung.
- Medien-CDN: Cloudflare R2 / GitHub Releases im Gratisrahmen.
- TTS für Prototyp gratis/günstig; Muttersprachler-Audio ist der einzige potenzielle
  Kostenpunkt (einmalige Produktion, kann community-/freundschaftsbasiert starten).
