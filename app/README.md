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

## Modi (12)

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
| 💬 Dialog | 8 echte Gespräche durchspielen (Café, Markt, Weg, Kennenlernen, Taxi, Restaurant, Hotel, Apotheke) | Sprechen/Lesen |
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

**Geführter Pfad:** Der „Lernen"-Tab zeigt alle Themen als Pfad (✓ sitzt · ▶ dran · antippen zum
Üben) und markiert, was **als Nächstes** dran ist; Home zeigt dazu eine „Weiter lernen"-Karte.
Themen antippen (überall) startet eine gezielte Übungsrunde nur zu diesem Thema.

**Verwechsler-Training:** Bei Buchstaben-Fragen kommen die falschen Antworten bevorzugt aus den
optisch ähnlichen Buchstaben (ד/ר, ה/ח/ת, ב/כ, ו/ז/ן …), genau das Unterscheiden, das flüssiges
Lesen ausmacht.

Beim **ersten Start** führt eine kurze Willkommens-Tour durchs Wichtigste (Ziel wählen, erstes
Wort hören). Der **Fortschritt**-Tab zeigt zusätzlich die letzten 14 Tage als Aktivitätsleiste.

Jede Session endet mit einem **Rückblick** („Diese Runde geübt", mit ✓/↻ und 🔊 zum Nachhören).

**🎓 Survival-Check** (Fortschritt-Tab): 12 zufällige A0-Fragen **ohne jede Hilfe** (kein Niqqud,
keine Umschrift, kein Antippen) – der ehrliche Test, ob du wie auf echten Schildern liest.
Ab 10/12 bestanden (+ Abzeichen).

**💪 Knacknüsse** (Fortschritt-Tab): deine 5 am häufigsten vergessenen Wörter, mit einem Klick
gezielt nachtrainierbar.

**🔤 Alef-Bet-Tafel** (Fortschritt-Tab): alle 27 Buchstaben in echter Reihenfolge als
Nachschlagewerk – mit Laut, Lernstand-Punkt, Endform-Markierung und Antippen-zum-Anhören.

## Inhalt (Band A0 + A1, ~300 Einträge)

- 🔤 **Aleph-Bet-Spur**: alle 22 Buchstaben + 5 Endformen, in einer Reihenfolge, die dich nach
  wenigen Buchstaben echte Wörter lesen lässt (שלום zuerst!). Mit Merkhilfen zu ähnlichen
  Buchstaben (ד/ר, ה/ח …).
- 👋 Begrüßung, 🧑 Ich & Du, ❓ Fragewörter, 🔢 Zahlen 0–10, 💯 Zahlen 11–1000 & Schekel,
  🪧 Schilder, 🧭 Richtung, ☕ Café, 🕐 Zeit & Wochentage, 🙂 Small Talk, 🏃 Verben im Alltag,
  🍎 Essen & Restaurant, 🛒 Einkaufen (inkl. Gold-Wörter יש/אין „gibt's / gibt's nicht"),
  🔗 Kleine Wörter (auch/aber/ohne/vielleicht …), ⚖️ Gegensatz-Paare (heiß/kalt, groß/klein …),
  🚌 Unterwegs, 👪 Familie, 🚑 Notfall, 🎨 Farben, 💯 Zahlen bis 1000 & Schekel. Plus DER
  Reise-Satz: אני מדבר קצת עברית („Ich spreche ein bisschen Hebräisch") und das höfliche
  אפשר…? („Kann ich … haben?").
- 💬 8 Dialoge, 🧱 26 Aufbau-Sätze, Gold-Phrasen („ich verstehe nicht", „langsam bitte").
- 🏅 13 Abzeichen (nur Lern-Meilensteine) + 💾 dezente Backup-Erinnerung alle ~200 Antworten.
- Inhalte liegen in [`content.js`](content.js) und sind leicht erweiterbar.

## Lernlogik (kurz)

- **Spaced Repetition:** alle Modi zahlen auf **denselben** Fortschritt pro Wort ein.
- **Stützräder verblassen:** Niqqud + Umschrift verschwinden pro Wort mit wachsender
  Beherrschung (antippen blendet sie kurz ein). Schilder sind immer „echt" ohne Niqqud.
- **Ehrlich:** XP nur für echten Abruf. Leitmetrik ist „gemeistert". **Abzeichen** nur für
  Lern-Meilensteine. **Streak mit ❄️ Freezes** (2 Stück, +1 je 7 erreichte Tagesziele): ein
  verpasster Tag bricht die Serie nicht.

## Fortschritt sichern & mitnehmen

Kein Login, keine Cloud: **Profil → 📤 Export** lädt eine JSON-Datei, **📥 Import** stellt sie
auf jedem Gerät/Browser wieder her. Ab und zu exportieren = Backup.

## Ton & Mikrofon

- **Hören:** nutzt die hebräische Systemstimme (`he-IL`). Fehlt sie: *Windows-Einstellungen →
  Zeit und Sprache → Sprache → Hebräisch hinzufügen* (mit Sprachausgabe), Browser neu starten.
  Ohne Stimme zeigt die App die Umschrift. Buchstaben werden mit ihrem **Namen** vorgesprochen.
- **Audio-Kurs:** nutzt zusätzlich eine deutsche Stimme (auf Windows vorhanden).
- **Sprechen:** Web-Spracherkennung (Chrome/Edge, meist online). Über `Tacheles-starten.cmd`
  fragt der Browser nur **einmal** nach dem Mikrofon. Vorsprechen (🔊) stoppt eine laufende
  Aufnahme automatisch (kein Echo-Schummeln).

## Tests

`node test/regression.cjs` (aus `app/`) prüft headless die Kernpfade: Content-Integrität,
Onboarding, alle Modi, Antworten, Pfad, Export, 0 Konsolenfehler. Details: [test/README.md](test/README.md).

## Dateien

- `index.html`, `app.js`, `content.js`, `styles.css` – die App (klassische Scripts, kein Build)
- `Tacheles-starten.cmd` + `server.js` – optionaler Mini-Localhost-Server (Node)
- `manifest.webmanifest`, `sw.js`, `icon.svg` – PWA (nur über http/localhost aktiv)

## Bekannte Grenzen

- Kein Tipp-/Schreib-Modus (bewusst). Kein Cloud-Sync (dafür Export/Import).
- Tagesziel zählt Aufgaben (~8/Minute), nicht echte Minuten.
- Niqqud/Umschrift/Dialoge sind sorgfältig erstellt, aber noch nicht muttersprachlich
  gegengelesen.

Verifiziert in Edge (headless, file://): alle 12 Modi, SRS-Persistenz über Reload, Export,
Themen-Sessions, Blitz-Countdown, Audio-Sequenz-Fallback, 0 Konsolenfehler.
Die vollständige Produkt-Spec liegt in [`../docs`](../docs).
