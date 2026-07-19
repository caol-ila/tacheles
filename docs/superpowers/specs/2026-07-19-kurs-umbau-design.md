# Kurs-Umbau: Curriculum A0-C2, Lese-Trainer, Wissens-Häppchen, Navigation, interaktive Tour — Design

Datum: 2026-07-19. Status: Design (zur Freigabe, noch keine Implementierung).
Baut auf main nach PR #8 (ehrliche Mastery, Vokabel-Browser, Feedback, Recht, Slideshow-Tour).

## Ziel

Der App das didaktische Rückgrat geben, das Schul-/Ulpan-Unterricht auszeichnet: ein geführter
Kurs aus Lektionen (Dialog → Vokabeln → ein Grammatikpunkt → Lesen → Quiz, spiralförmig
wiederholend), über **alle Bänder A0-C2**. Dazu: Silben-Lese-Trainer (Buchstaben verschmelzen
statt nur erkennen), Wissens-Häppchen statt Vokabel-Häppchen, Grammatik als oberste Ebene,
und eine interaktive Tour statt der Slideshow. **Starkes freies Vokabeltraining bleibt
vollwertig erhalten** (eigener Tab, prominenter als heute).

## Leitplanken (unverändert streng)

- Build-frei: klassische Scripts, kein Modul/fetch/Abhängigkeiten, `file://`-tauglich.
- Item-IDs heilig; bestehender Content nur additiv erweitert; bestehender Fortschritt bleibt
  vollständig gültig (der Kurs orchestriert das vorhandene SRS, er ersetzt es nicht).
- Neue State-Felder in `defaultState` UND `normalizeState` (Allowlist) UND `mergeStates`.
- Determinismus ohne `Math.random`, wo Stabilität gebraucht wird (`dayHash`).
- Audio audio-first mit TTS-Fallback; neue Clips über die bestehende Pipeline
  (`tools/audio-lib.cjs`-Enumeration, Keying kompatibel zu `say`/`sayText`).
- Regression wächst mit jedem Verhalten; `node --check`; SW-`CACHE_NAME`-Bump beim Release.
- UI Deutsch („du"-Ton); Commits/PR Englisch; Allowlist/Denylist-Terminologie.

---

## WS-A Navigation (5 Tabs)

**🏠 Home · 🎓 Lernen · 📇 Vokabeln · 🧠 Grammatik · ⚙️ Profil**

- **Home:** Heute-Block (Wissens-Häppchen, WS-D), Kurs-Karte „Deine Lektion" mit
  Weiterlernen-Knopf (der primäre CTA), Streak/Ziel. Die Statistik-Zeile oben ist antippbar und
  öffnet den vollständigen Fortschritt-Screen (der Screen bleibt inhaltlich wie heute, verliert
  nur seinen Tab).
- **Lernen = Kurs** (WS-B): Lektionspfad statt Kachel-Zoo. Die bisherigen Inhalte des
  Lernen-Tabs ziehen um: Module → Grammatik-Tab; Modi/Themen → Vokabeln-Tab.
- **Vokabeln:** oben „Power-Training"-Karte (Smart-Session, Länge 5/10/20 wählbar), darunter
  alle 13 Modi, Themen-Training, Blitz, Knacknüsse, Mastery-Check, Vokabelliste. Nichts
  entfällt; alles wird von „versteckt hinter dem Pfad" zu „erste Ebene".
- **Grammatik:** alle Grammatik-Module nach Level, „empfohlen für dich"-Markierung am
  aktuellen Stand, plus **Lesen**-Block (Silben-Trainer, Alef-Bet-Tafel, „Lesen lernen"-Pfad).
- `index.html`-Nav wird auf 5 Buttons erweitert; alle bestehenden Screens bleiben erreichbar.

## WS-B Kurs (Curriculum A0-C2)

### Datenmodell

Neue Datei `app/course.js` (klassisches Script, eigenes Global, wie grammar.js):

```js
window.TACHELES_COURSE = {
  version: 1,
  sections: [ { id, title, emoji, band } ],
  lessons: [ {
    id,               // stabil, z. B. "l_a0_07"
    section,          // Sektions-id
    title, emoji,     // "Im Café", "☕"
    band,             // A0..C2 (informativ; Reihenfolge ist linear)
    newItemIds: [],   // 5-8 Item-IDs, die diese Lektion NEU einführt
    scene:  { dialogueId } | { lines:[{he,translit,de}] } | null,  // Einstiegs-Szene
    grammar: { moduleId, steps:[idx] } | { inline:[explain/cloze/form] } | null,
    reading: { drill } | null,   // Silben-Drill (frühe Lektionen, s. WS-C)
    listening: true|false        // Hör-Schritt (Default true, sofern Audio/TTS)
  } ]
};
```

- **Abdeckung:** JEDES Content-Item ist genau EINER Lektion als `newItemIds` zugeordnet
  (Validierung per Regression: vollständig + eindeutig). Grobe Rechnung: 673 Items / ~6,5 pro
  Lektion ≈ **~100 Lektionen in ~16-20 Sektionen** über A0-C2. Die 21 Grammatik-Module werden
  an didaktisch passenden Stellen in Lektionen referenziert (ein Punkt pro Lektion; große
  Module verteilt über mehrere Lektionen via `steps`-Auswahl). Dialoge werden als Szenen
  wiederverwendet. C1/C2-Lektionen sind stärker text-/idiom-getrieben (Szene + Register-Punkt).
- Ladeordnung: content.js → grammar.js → course.js → audio/manifest.js → app.js; app.js
  defensiv (fehlendes Global = Kurs-Features blenden sich aus).

### Lektions-Player (Session-Modus „lesson")

Fester Bogen mit sichtbarer Schritt-Beschriftung:
1. **Aufwärmen ↺** (Spirale): 2-3 Abrufaufgaben aus FRÜHEREN Lektionen (bevorzugt fällige SRS).
2. **Szene 🎬**: Mini-Dialog/Kontextzeilen mit Audio (sayText), 1 Verständnisfrage (MC).
3. **Neue Wörter ✨**: teach-Karten (mit Audio) für `newItemIds`.
4. **Grammatik 🧠**: 1 Erklärkarte + 1-2 cloze/form-Fragen.
5. **Lesen 👓** (frühe Lektionen): Silben-Drill (WS-C).
6. **Hören 👂**: 2-3 audio2de-Aufgaben über die Lektionswörter (nur Ohr, kein Text).
7. **Quiz 🏁**: dynamisch NUR über diese Lektion, gemischt Erkennen + Produzieren + Hören
   (+ Sprechen, wenn Mikrofon verfügbar; optional überspringbar) — „möglichst viele Wege".
8. **Rückblick**: wie Session-Ende; „Als Nächstes: Lektion N+1" mit Direktstart.

Antworten laufen über `recordAnswer` (ehrliche Mastery gilt; Erstkontakt-Regel greift, weil
teach die Items in `introducedThisSession` markiert). Abbruch merkt den Schritt; Home bietet
Weiterlernen.

### Kursfortschritt & Quereinstieg

- Neues Top-Level `course` im State (Allowlist + Merge):
  `{ lessons: { lessonId: { done:bool, step:int } }, entry: lessonId|null }`.
  Merge: `done` per ODER, `step` max, `entry` das weitere.
- **Quereinstieg:** beim ersten Kurs-Öffnen wird ein Einstieg empfohlen: eine Lektion gilt als
  „kannst du überspringen", wenn ≥60 % ihrer `newItemIds` Mastery ≥2 haben. Empfohlen wird die
  erste nicht-überspringbare Lektion; Nutzer bestätigt oder wählt frei. Übersprungene Lektionen
  werden als erledigt markiert (jederzeit nachholbar; erneutes Spielen setzt nichts zurück).
- **Freischaltung:** linear (Lektion N öffnet N+1). Erledigte Lektionen bleiben spielbar.
  Level-Bänder laufen wie bisher über Mastery (der Kurs zahlt automatisch darauf ein);
  `levelCap` gilt nur fürs freie Training, der Kurs folgt seiner eigenen Reihenfolge.

## WS-C Lese-Trainer (Silben-Verschmelzung)

- **Übungstypen:** (1) Silbe hören → wählen; (2) Silbe sehen → Lesung (Umschrift) wählen;
  (3) Wort zusammenlesen: echtes Wort silbenweise aufdecken, pro Silbe Lesung wählen, am Ende
  Ganzwort-Audio; (4) Tempo-Lesen: Wort kurz zeigen → Bedeutung wählen.
- **Daten:** Silben-Basissatz programmatisch (häufige Buchstaben × Vokalzeichen inkl. Schwa),
  Wort-Silbifizierung per Heuristik über `niqqud` mit kuratierter Ausnahmen-Liste
  (`app/reading.js`, eigenes Global; Ausnahmen pflegbar). Regression validiert: jede im Kurs
  referenzierte Drill-Silbe hat Lesung + (falls vertont) Clip.
- **Audio:** Silben werden VERTONT (Nutzer-Freigabe liegt vor): `tools/audio-lib.cjs`
  `enumerateTargets` wird um Reading-Silben (und Snack-Beispiele, WS-D) erweitert; Keying
  `"h_" + audioHash(niqqud-Silbe)` → `sayText` spielt sie ohne App-Sonderlogik. Erzeugung wie
  gehabt lokal (`generate-audio.cjs`/`check-audio.cjs --fill`, ElevenLabs-Key in
  `tools/audio.env`, Modell/Stimme wie Bestand: Ellen, eleven_v3, Robust, Opus-Format).
  Grobe Menge: ~150-250 Silben-Clips + ~50-80 Snack-Beispiele, wenige Minuten Audio.
- **Integration:** fest in frühen Kurs-Lektionen (A0-Sektionen 1-3), zusätzlich freier Trainer
  im Grammatik-Tab („Lesen üben"), Schwierigkeitsstufen (Silben → Wörter → Tempo).

## WS-D Wissens-Häppchen

- Häppchen des Tages = **1 Wissens-/Grammatik-Snack** (Erklärkarte + 1-2 Fragen), deterministisch
  rotierend (`dayHash` über Katalog, noch nicht Gesehenes bevorzugt), + optional 2-3 fällige
  Vokabeln als Anhang (Profil-Schalter `snackVocab`, Default an).
- Neuer Katalog `app/snacks.js` (~40 Einheiten, gleiche Schritt-Typen wie Module): Sprach- und
  Kulturwissen im Stil der „mit wenigen Wörtern viel"-Einheit; hebräische Beispiele vertont.
- Gesehene Snacks in `state.course.snacksSeen` (oder eigenes Feld) für die Rotation (Allowlist).

## WS-E Vokabeln-Tab (starkes freies Training, Bedingung)

Alles Bestehende, gebündelt und aufgewertet: Power-Training-Karte (5/10/20), 13 Modi,
Themen, Blitz, Knacknüsse, Mastery-Check, Vokabelliste. Keine Funktionsminderung.

## WS-F Interaktive Tour (ersetzt Slideshow)

- **Demo-Modus:** geführte Sequenz ECHTER Bedienung mit Spotlight-Overlay (CSS-Ausschnitt auf
  das reale Element, Fallback zentrierte Karte): Häppchen antippen → eine Beispiel-Karte
  wirklich beantworten → Gold-Moment inkl. Veto ausprobieren → Blick in Kurs, Vokabeln,
  Grammatik. Während der Demo schreibt `recordAnswer` NICHTS (Demo-Flag), XP/SRS unangetastet.
- Skippbar an jedem Schritt; Neustart aus Profil. `tourSeen` wird weiterverwendet; Nutzer, die
  die alte Slideshow sahen, werden NICHT erneut genotified (kein zweiter Hinweis).
- Die Slideshow (TOUR_SLIDES) entfällt ersatzlos.

## State-Schema (neu, Allowlist + Merge)

- `course: { lessons: {id:{done,step}}, entry, snacksSeen: {snackId:true} }`
- `profile.snackVocab: bool` (Default true)
- Bestehende Felder unverändert; State-`version` bleibt 1.

## Audio-Erzeugung (einmaliger Batch, freigegeben)

Enumeration erweitern (Silben, Snack-Beispiele, ggf. neue Szenen-Zeilen aus course.js),
`check-audio.cjs` zeigt Fehlmengen, `--fill` erzeugt sie; Manifest wächst; SW-Prefetch deckt
sie automatisch (gleicher `AUDIO_CACHE`). Lizenzlage unverändert (CC-BY-NC + kein KI-Training).

## Tests (Regression, Auswahl)

- Kurs-Integrität: jede Item-ID in genau einer Lektion; alle Referenzen (Items, Module,
  Dialoge, Drills) existieren; Sektionen/Bänder konsistent; ~100 Lektionen Floor.
- Player: Lektionsbogen durchspielbar (Szene → teach → Grammatik → Hören → Quiz → Rückblick),
  Resume nach Abbruch, Quiz nur Lektionsinhalte, Erstkontakt-Regel greift.
- Quereinstieg: Empfehlung aus Mastery, Bestätigen markiert frühere als erledigt.
- Lese-Trainer: Silbifizierung validiert (Stichproben + Ausnahmenliste), Drill spielbar,
  Ganzwort-Audio-Keys existieren.
- Häppchen: Snack rotiert deterministisch, Vokabel-Anhang schaltbar.
- Navigation: 5 Tabs, alle Alt-Screens erreichbar (Fortschritt via Statistik-Tipp).
- Tour: Demo schreibt kein SRS/XP; skippbar; Neustart aus Profil; kein Re-Notice für
  Slideshow-Seher.
- Alt-State-Kompatibilität und alle bestehenden ~138 Checks bleiben grün.

## Nicht-Ziele

Kein Backend, keine neuen Abhängigkeiten, kein neues Vokabular (Kurs kuratiert Bestand;
Snacks sind der einzige neue Text-Content), keine Native-App.

## Offene Punkte (bewusst)

- Muttersprachliches Review der neuen Snack-Texte + Silben-Lesungen (reiht sich in das
  bestehende offene Content-Review ein).
- Feinschnitt der ~100 Lektionen (Kuratierung) passiert im Implementierungsplan mit
  Validierungsskript; die Spec fixiert nur Schema + Abdeckungsregel.
