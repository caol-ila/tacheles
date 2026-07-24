# Tacheles – Web-App (MVP+)

Freundliche Hebräisch-Lern-App für deutsche Anfänger. Läuft **ohne Installation, ohne Build,
offline**, direkt im Browser. Fokus: **Lesen, Hören, Sprechen** (kein Tippen).

## Sofort loslegen

**Empfohlen:** Doppelklick auf **`Tacheles-starten.cmd`** (startet einen Mini-Server und öffnet
http://localhost:8017). Vorteile gegenüber Datei-Doppelklick:
- Der Browser merkt sich die **Mikrofon-Erlaubnis** (Sprechen-Modus fragt nur einmal statt bei jedem Wort).
- Die App ist als **PWA installierbar** („App installieren" im Browser-Menü, auch auf Android)
  und cached sich komplett offline.

**Alternativ:** Doppelklick auf `index.html` (funktioniert genauso, nur ohne die zwei Vorteile oben).

> Empfohlener Browser: **Chrome oder Edge**. Wechsel von `file://` zu `localhost`? Der Browser
> trennt die Speicher: vorher im Profil **exportieren**, danach **importieren**.

## Aufbau: 5 Tabs & der Kurs

Die App hat fünf Tabs: **Home**, **Lernen** (= der Kurs), **Vokabeln**, **Grammatik**, **Profil**.
„Fortschritt" erreichst du über den Statistik-Tipp (kein eigener Tab).

- 🎓 **Lernen = geführter Kurs A0–C2:** 109 Lektionen in 19 Sektionen. Ein **Lektions-Player**
  spielt jede Lektion als 8-Schritt-Bogen (Aufwärmen/Spiral · Szene · neue Wörter · Grammatik ·
  Lesen · Hören · Quiz · Rückblick) und macht danach **automatisch mit der nächsten weiter**
  (7-Sekunden-Countdown, abbrechbar). Fortschritt merkt sich den offenen Schritt (Resume). Der
  Kurs ersetzt das SRS nicht, er orchestriert es: lineare Freischaltung, **Quereinstieg** nach
  Einstufung (Lektionen unter dem eingestuften Band bzw. ab ~60 % gemeistert überspringbar).
- 🔤 **Lese-Trainer** (Block auf der Grammatik-Seite + frühe A0-Lektionen): 174 Silben mit
  Drills — Hören-und-Wählen, Lesen-und-Wählen, Silben zu einem Wort **blenden** (RTL) und eine
  Speed-Runde — plus freier Trainer.
- 💡 **Wissens-Häppchen** (Tages-Block „Heute" auf Home): 41 kurze Sprach-/Kultur-Snacks mit
  Tages-Rotation (Ungesehenes zuerst), optional mit angehängten fälligen Vokabeln.
- 📚 **Vokabeln:** durchsuchbarer Browser aller Einträge nach Level (Deutsch · Umschrift ·
  hebräische Schrift · 🔊), mit „Aussprache falsch"-Meldeknopf.
- 🧠 **Grammatik:** die 21 Grammatik-Module (eigene Sektion) plus der Lese-Trainer-Block.

## Modi (13)

| Modus | Was du tust | Schwerpunkt |
|-------|-------------|-------------|
| 🃏 Karten | Karteikarten, 4-Stufen-Bewertung | Lesen |
| ✅ Auswahl | Multiple Choice (he→de, de→he, Audio→de) | Lesen/Hören |
| 🧩 Paare | Deutsch ↔ Hebräisch verbinden | Lesen |
| 💚 Wisch | Tinder-Stil: stimmt das Paar? (wischen, Buttons oder Pfeiltasten ←/→) | Lesen |
| 📱 Reels | TikTok-Feed mit Auto-Audio + Quiz-Reels | Hören/Lesen |
| 🪧 Schilder | echte Schilder ohne Niqqud (Stop, Kasse, koscher …) | Lesen |
| 👂 Hören | nur Audio, Bedeutung erkennen (🐢 = langsam vorsprechen) | Hören |
| 🎤 Sprechen | laut sprechen, Erkennung prüft (🐢 langsam · `✗ Noch nicht` geht immer weiter) | Sprechen |
| 💬 Dialog | 14 echte Gespräche durchspielen (Café, Markt, Weg, Kennenlernen, Taxi, Restaurant, Hotel, Apotheke …) | Sprechen/Lesen |
| 🧱 Satzbau | Wortkacheln in die richtige Reihenfolge (RTL) | Produktion |
| 🖼️ Bilder | Bild → hebräisches Wort, ganz ohne Deutsch | Lesen |
| ⚡ Blitz | 60-Sekunden-Schnellrunde gegen die Uhr | Abruf |
| 🎧 Audio-Kurs | hands-free: deutsche Frage → Sprechpause → hebräische Antwort | Hören/Sprechen |

**Tastatur (Desktop):** In Auswahl-Aufgaben wählen die Tasten **1–4** die Antwort, **Enter**
geht weiter; bei Karten deckt die **Leertaste** auf und **1–4** bewerten; im Wisch-Modus
entscheiden **←/→**, in Reels blättern **↑/↓**. Reels fragt beim Start: gemischter Feed oder
dein aktuelles Thema.

**Teach-First:** Kein Modus stellt je eine Frage zu einem Wort, das dir die App noch nie gezeigt
hat. Neue Wörter werden zuerst **vorgestellt** (🆕-Karte mit Aussprache), sofort danach sanft
abgefragt (erst Erkennen he→de, Produktion später) und kommen in derselben Session noch einmal.
Maximal ~6 neue Wörter pro Runde, themenzusammenhängend. Falsch beantwortete Wörter kommen mit
einem „keine Sorge"-Hinweis gleich nochmal. Abruf-Spiele (Wisch, Paare, Blitz) und der
Survival-Check fragen nur Gelerntes ab – vorher leiten sie freundlich zum Lernen um. Ein
Abbruch mitten in der Runde verwirft nichts: du siehst dein bisheriges Ergebnis.

**Geführter Weg:** Der „Lernen"-Tab ist der Kurs (siehe oben) und markiert die **nächste offene
Lektion**; Home zeigt dazu eine „Weiter"-Karte. Zusätzlich lässt sich jedes Thema und jedes Modul
(im Vokabel- bzw. Grammatik-Tab) direkt antippen, um eine gezielte Übungsrunde nur dazu zu starten.

**Verwechsler-Training:** Bei Buchstaben-Fragen kommen die falschen Antworten bevorzugt aus den
optisch ähnlichen Buchstaben (ד/ר, ה/ח/ת, ב/כ, ו/ז/ן …), genau das Unterscheiden, das flüssiges
Lesen ausmacht.

Beim **ersten Start** führt eine kurze **interaktive Spotlight-Tour** durchs Wichtigste (statt
einer Slideshow) und lässt sich überspringen oder später im Profil neu starten. Wer die App schon
vorher genutzt hat, bekommt einmalig den Hinweis, dass es die Tour jetzt gibt. Der
**Fortschritt** (über den Statistik-Tipp) zeigt zusätzlich die letzten 14 Tage als Aktivitätsleiste.

Jede Session endet mit einem **Rückblick** („Diese Runde geübt", mit ✓/↻ und 🔊 zum Nachhören).

**🎓 Survival-Check** (Fortschritt-Tab): 12 zufällige A0-Fragen **ohne jede Hilfe** (kein Niqqud,
keine Umschrift, kein Antippen) – der ehrliche Test, ob du wie auf echten Schildern liest.
Ab 10/12 bestanden (+ Abzeichen).

**💪 Knacknüsse** (Fortschritt-Tab): deine 5 am häufigsten vergessenen Wörter, mit einem Klick
gezielt nachtrainierbar.

**🔤 Alef-Bet-Tafel** (Fortschritt-Tab): alle 27 Buchstaben in echter Reihenfolge als
Nachschlagewerk – mit Laut, Lernstand-Punkt, Endform-Markierung und Antippen-zum-Anhören.

## Inhalt (~673 Einträge, Band A0–C2)

- 🔤 **Aleph-Bet-Spur**: alle 22 Buchstaben + 5 Endformen, in einer Reihenfolge, die dich nach
  wenigen Buchstaben echte Wörter lesen lässt (שלום zuerst!). Mit Merkhilfen zu ähnlichen
  Buchstaben (ד/ר, ה/ח …). Buchstaben-Namen sind niqqud-vertont und mit echten Samples belegt.
- Der **A0/A1-Kern**: 👋 Begrüßung, 🧑 Ich & Du, ❓ Fragewörter, 🔢 Zahlen 0–10, 💯 Zahlen bis
  1000 & Schekel, 🪧 Schilder, 🧭 Richtung, ☕ Café, 🕐 Zeit & Wochentage, 🙂 Small Talk,
  🏃 Verben im Alltag, 🍎 Essen & Restaurant, 🛒 Einkaufen (inkl. Gold-Wörter יש/אין „gibt's /
  gibt's nicht"), 🔗 Kleine Wörter (auch/aber/ohne/vielleicht …), ⚖️ Gegensatz-Paare
  (heiß/kalt, groß/klein …), 🚌 Unterwegs, 👪 Familie, 🚑 Notfall, 🎨 Farben. Plus DER
  Reise-Satz: אני מדבר קצת עברית („Ich spreche ein bisschen Hebräisch") und das höfliche
  אפשר…? („Kann ich … haben?").
- Darüber hinaus **41 Themen bis C2** (Arbeit, Gesundheit, Politik, Register/Literatursprache …),
  aufsteigend über die Kurs-Sektionen freigeschaltet.
- 💬 14 Dialoge, 🧱 Aufbau-Sätze, Gold-Phrasen („ich verstehe nicht", „langsam bitte").
- 🧠 **21 Grammatik-Module** (`grammar.js`, eigene Sektion) von Genus/Artikel bis
  Register/Literatursprache, mit den Übungstypen Lückentext (Cloze) und Formen-Wahl.
- 💡 **41 Wissens-Häppchen** (`snacks.js`) und 🔤 **174 Silben** für den Lese-Trainer (`reading.js`).
- 🏅 14 Abzeichen (nur Lern-Meilensteine) + 💾 dezente Backup-Erinnerung alle ~200 Antworten.
- Wortschatz liegt in [`content.js`](content.js); Grammatik, Kurs, Häppchen und Lese-Daten in
  eigenen Dateien. Alles additiv erweiterbar.

## Lernlogik (kurz)

- **Spaced Repetition:** alle Modi zahlen auf **denselben** Fortschritt pro Wort ein.
- **Stützräder verblassen:** Niqqud + Umschrift verschwinden pro Wort mit wachsender
  Beherrschung (antippen blendet sie kurz ein). Schilder sind immer „echt" ohne Niqqud.
- **Ehrliche Mastery:** Erkennen (Auswahl he→de, Hören, Paare, Wisch) deckelt bei „fast dran".
  Erst **Produktion** (Deutsch→Hebräisch, Satzbau, Sprechen, Cloze/Formen) macht ein Wort
  „gemeistert". Gemeisterte Wörter lassen sich einsehen und einzeln **widerrufen** (falls's Zufall
  war); ein Mastery-Check bestätigt echtes Können.
- **Ehrlich:** XP nur für echten Abruf. Leitmetrik ist „gemeistert". **Abzeichen** nur für
  Lern-Meilensteine. **Streak mit ❄️ Freezes** (2 Stück, +1 je 7 erreichte Tagesziele): ein
  verpasster Tag bricht die Serie nicht.

## Fortschritt sichern & mitnehmen

Kein Login, keine Cloud: **Profil → 📤 Export** lädt eine JSON-Datei, **📥 Import** stellt sie
auf jedem Gerät/Browser wieder her. Ab und zu exportieren = Backup.

## Ton & Mikrofon

- **Hören:** audio-first. Für Wörter, Dialoge, Grammatik-Beispiele, Silben, Häppchen und
  Szenen-Zeilen liegen **vorproduzierte Sprach-Samples** bereit (ElevenLabs, niqqud-vertont,
  offline gecacht). Fehlt ein Sample, fällt die App auf die hebräische Systemstimme (`he-IL`)
  zurück; fehlt auch die, zeigt sie die Umschrift. Buchstaben werden mit ihrem **Namen**
  vorgesprochen. (Hinweis: in eingebetteten Webviews wie der VS-Code-Vorschau spielt `audio.play()`
  oft nicht, dann greift TTS. Im echten Browser kommen die Samples.)
- **Audio-Kurs:** nutzt zusätzlich eine deutsche Stimme (auf Windows vorhanden).
- **Sprechen:** Web-Spracherkennung (Chrome/Edge, meist online). Über `Tacheles-starten.cmd`
  fragt der Browser nur **einmal** nach dem Mikrofon. Vorsprechen (🔊) stoppt eine laufende
  Aufnahme automatisch (kein Echo-Schummeln).

## Tests

`node test/regression.cjs` (aus `app/`) prüft headless die Kernpfade: Content-Integrität,
Onboarding, alle Modi, Kurs/Lektions-Player, Lese-Trainer, Häppchen, Antworten, Export,
0 Konsolenfehler (aktuell **183 Checks**, Exit 0 = PASS). Dazu die drei Content-Validatoren im
Repo-Root (`node tools/validate-course.cjs` / `validate-snacks.cjs` / `validate-reading.cjs`) und
`node --check` über die JS-Dateien. Details: [test/README.md](test/README.md).

## Dateien

- `index.html`, `app.js`, `styles.css` – die App (klassische Scripts, kein Build)
- `content.js` – Wortschatz (~673 Items, 41 Themen, 14 Dialoge, EMOJI-Map)
- `grammar.js` – 21 Grammatik-Module (Global `TACHELES_GRAMMAR`)
- `course.js` – Kurs-Curriculum (109 Lektionen/19 Sektionen, Global `TACHELES_COURSE`)
- `snacks.js` – 41 Wissens-Häppchen (Global `TACHELES_SNACKS`)
- `reading.js` – Lese-Trainer (174 Silben, Silbifizierer, 8 Drills, Global `TACHELES_READING`)
- `audio/` – vorproduzierte Sprach-Samples + `manifest.js` + eigene `LICENSE`
- `Tacheles-starten.cmd` + `server.js` – optionaler Mini-Localhost-Server (Node)
- `manifest.webmanifest`, `sw.js`, `icon.svg` – PWA (nur über http/localhost aktiv)

Die Content-Validatoren und die Audio-Pipeline liegen im Repo-Root unter [`../tools/`](../tools/)
(einmalig lokal, nicht Teil der Laufzeit).

## Bekannte Grenzen

- Kein Tipp-/Schreib-Modus (bewusst). Kein Cloud-Sync (dafür Export/Import).
- Tagesziel zählt Aufgaben (~8/Minute), nicht echte Minuten.
- Niqqud/Umschrift/Dialoge sind sorgfältig erstellt, aber noch nicht muttersprachlich
  gegengelesen.

Verifiziert in Edge (headless, file://): alle 13 Modi, Kurs/Lektions-Player, Lese-Trainer,
SRS-Persistenz über Reload, Export, Themen-Sessions, Blitz-Countdown, Audio-Sequenz-Fallback,
0 Konsolenfehler. Die vollständige Produkt-Spec liegt in [`../docs`](../docs).
