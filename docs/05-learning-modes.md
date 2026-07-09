# 05 – Lernmodi

Alle Modi sind **Renderer** über demselben generischen LernItem (siehe [03](03-content-model.md))
und schreiben in **denselben** SRS-Zustand (siehe [02](02-didactic-model.md)). Content wird
einmal gepflegt, jeder Modus ist eine andere Brille darauf.

Jeder Modus-Steckbrief nennt: didaktische Rolle, Vorbild-App, unterstützte Item-Typen,
Abfrage-Richtung, mastery-Anforderung und Anti-Dark-Pattern-Hinweise.

---

## Übersicht

| Modus | Kurz | Vorbild | Kern-Nutzen | Spaß-Faktor |
|-------|------|---------|-------------|-------------|
| Karten | SRS-Karteikarten | Anki | Retention-Rückgrat | mittel |
| **Wisch** | Tinder-Swipe | Drops/Tinder | schneller Vokabel-Drill | hoch |
| **Reels** | TikTok-Feed | TikTok/Parrot | Immersion, Wiederholung, Sog | sehr hoch |
| Lektion | geführter Pfad | Duolingo | Struktur, Einführung | mittel |
| Multiple Choice | Erkennen | Duolingo | schnelles Wiedererkennen | mittel |
| Matching | Paare zuordnen | Duolingo | Verknüpfung de↔he | hoch |
| Lückentext | Cloze | Clozemaster | Kontext, Grammatik | mittel |
| Hören & Tippen | Diktat | Duolingo | Hörverstehen + Schrift | mittel |
| Satzbau | Wortbank | Duolingo | geführte Produktion | mittel |
| Bild-Wort | Bildzuordnung | Drops/Rosetta | direktes Denken ohne Deutsch | hoch |
| Schilder-Lesen | Sign Reading | (eigen) | Zielaufgabe Lesen | hoch |
| Dialog | Konversation | Babbel | Sprechen im Kontext | hoch |
| Audio-Kurs | Hörkurs | Pimsleur | hands-free, Sprechen | mittel |
| Sprechen | Ausspracheerkennung | Duolingo/Babbel | Produktion, Aussprache | hoch |
| Blitz | Zeit-Quiz | (eigen) | Tagesziel, Abruf unter Druck | hoch |

Die **fett** markierten sind die "Spaß-Speerspitze" (Wisch + Reels), ausdrücklich als
erstklassige Features, nicht als Deko.

---

## Die "Spaß"-Modi im Detail

### Wisch-Modus (Tinder-Stil) 💚❤️

**Didaktik:** schneller Wiedererkennungs-Drill, sehr kurze Sessions, kein Tippen (Drops-Prinzip,
D6). Ideal für unterwegs und zum "Aufwärmen".

**Mechanik (mehrere Swipe-Spielarten, per Item-Typ gewählt):**
- **Kenn-ich-Swipe:** Karte zeigt hebräisches Wort (+ Audio). Rechts wischen = "kenn ich",
  links = "nochmal". Ergebnis geht als Selbsteinschätzung + optionaler Schnellcheck in den
  Scheduler. Rechts-Wisch triggert eine kurze Bedeutungs-Enthüllung zur Selbstkontrolle.
- **Richtig-Falsch-Swipe:** Karte zeigt Paar "he ↔ de". Rechts = stimmt, links = stimmt nicht.
  Die Hälfte der Paare ist absichtlich falsch (Distraktor aus gleichem Thema). Das ist echter
  Abruf, nicht nur Gefühl.
- **Sortier-Swipe:** Wische Items in Kategorien (z. B. "essbar / nicht essbar", "männlich /
  weiblich"), gut für Genus-Training.

**Wisch-Gesten & Feel:** flüssige Karten-Physik, Haptik bei Entscheidung, Rückgängig per
Nach-oben-Wisch, Stapelanzeige ("noch 12"). RTL beachten: hebräischer Text im Kartenkörper
rechtsbündig, Wisch-Richtung bleibt aber physisch (rechts = ja).

**Anti-Dark-Pattern:** Kein endloser Zwang. Session ist ein klar begrenzter Stapel (z. B. 15–20
Karten) mit sichtbarem Ende und Mini-Fazit.

```
Item-Typen: word, phrase, sign, number
Richtungen: he_to_de, de_to_he, audio_to_de
minMastery: 0
```

### Reels-Modus (TikTok-Feed) 📱⬆️

**Didaktik:** Immersion und beiläufige Wiederholung über einen vertikalen Feed (F1, F2). Nutzt
die Stärke von Kurzvideo (Motivation, Wiederholung, Sog) und neutralisiert die Schwäche
(Unsystematik), indem der Feed **nicht zufällig** ist, sondern vom Session-Generator gespeist
wird: fällige Reviews + neue Items des aktuellen Themas + gelegentliche "Auffrischer".

**Ein Reel = ein LernItem, groß inszeniert:**
- Vollbild, vertikal. Oben klein: Thema + Fortschritt.
- Mitte: das hebräische Wort/der Satz groß (Niqqud je nach Fade), darunter Transliteration
  (verblassend), darunter die deutsche Bedeutung.
- Bild oder kurzer Clip als Hintergrund/Illustration (`image_url` / `clip_url`).
- Audio spielt automatisch (Mutterspracher), Tap = erneut abspielen, Doppel-Tap = "gefällt mir /
  merken" (markiert Item als Favorit, kein Lern-Ersatz).
- **Nach-oben-Wisch = nächstes Reel.**

**Eingestreute Mini-Interaktionen (damit es Lernen bleibt, nicht Berieselung):**
Etwa jedes 4.–5. Reel ist ein **Quiz-Reel**: dieselbe Vollbild-Ästhetik, aber mit einer schnellen
MC- oder Tap-Frage zum gerade Gesehenen. Das erzeugt echten Abruf (B3) und speist den Scheduler.
Ohne diese Einschübe wäre es reines Wiedererkennen (schwächer) und würde zum "gamification
misuse"-Muster passen (E8).

**Feed-Zusammensetzung (Beispiel-Rezept):**
```
70% neue/aktuelle Themen-Items als Expositions-Reels
20% faellige Review-Items (Auffrischer)
10% Quiz-Reels (echter Abruf, aus dem gerade Gezeigten)
```

**Anti-Dark-Pattern (bewusst gegen das TikTok-Suchtmuster):**
- **Kein unendlicher Feed als Default.** Der Feed hat eine sichtbare Sitzungslänge (an das
  Tagesziel gekoppelt, z. B. 5/10/15 Min) und feiert am Ende den Abschluss.
- Optionaler "Weiter im Fluss?"-Knopf statt automatischem Endlos-Nachladen.
- Keine manipulativen Zähler, kein "verpasst du was"-Druck.

```
Item-Typen: word, phrase, sentence, sign
Richtungen: he_to_de (+ Quiz-Reels beliebig)
minMastery: 0
```

---

## Die Kern-Lernmodi

### Karten-Modus (SRS-Karteikarten)
Das Rückgrat (Anki-Prinzip, D3/D4). Vorderseite Prompt, Rückseite Antwort + Audio + Beispiel.
4-Stufen-Bewertung (Nochmal/Schwer/Gut/Leicht) füttert direkt den FSRS-Scheduler.
Richtungen frei wählbar. `minMastery: 0`.

### Lektions-Modus (geführter Pfad)
Duolingo-artiger Pfad pro Thema (`Lesson`-Steps). Führt ein Thema **geblockt** ein (B4): erst
Exposition der neuen Wörter, dann gemischte Übungstypen (MC → Matching → Cloze → Satzbau),
Progression Erkennen → Produzieren (D8). Adaptive Schwierigkeit über den Session-Generator (D2).

### Multiple Choice (Erkennen)
Prompt + 3–4 Optionen. Distraktoren automatisch aus gleichem Thema/POS. Schnellster
Wiedererkennungs-Check. Früh im mastery-Zyklus.

### Matching / Paare zuordnen
Tap-the-pairs: Spalte Deutsch, Spalte Hebräisch, verbinden. Trainiert Verknüpfung, angenehm
schnell. Gut als Session-Auftakt.

### Lückentext (Cloze)
Satz mit Lücke, Zielwort ergänzen (aus Wortbank oder tippen). Clozemaster-Prinzip: Wörter im
Kontext, nebenbei Satzbau/Grammatik. Nutzt `sentence`-Items und deren `tokens`.

### Hören & Tippen (Diktat)
Audio abspielen, Gehörtes auf Hebräisch tippen (Wortbank für Anfänger, freies Tippen später).
Koppelt Hörverstehen mit Schrift. Niqqud-Fade beachten.

### Satzbau (Wortbank)
Gegebene Wortkacheln in richtige Reihenfolge bringen (RTL). Geführte Produktion, Brücke zum
freien Sprechen (D8). Nutzt `tokens`.

### Bild-Wort-Zuordnung
Bild → passendes hebräisches Wort (oder umgekehrt). Denken **ohne** Umweg über Deutsch
(Rosetta/Drops-Idee). Stark für konkrete Nomen; speist sich aus `image_url`.

### Schilder-Lesen (Zielaufgabe) 🪧
Zeigt echte oder realistische Schilder (`type: sign`, `real_photo_url`), **ohne** Niqqud, weil
das die reale Situation ist (C5). Aufgaben: "Was bedeutet das?", "Wo musst du hin?", "Ist offen
oder geschlossen?". Direkt auf das Lese-Ziel der App einzahlend. Transliteration als optionale
Hilfe per Tap.

### Dialog-Modus (Konversation) 💬
Scripted Mini-Dialoge (`Dialogue`), Babbel-Stil. Nutzer:in übernimmt eine Rolle, wählt/ tippt/
spricht die passende Zeile, die andere Rolle antwortet (Audio). Baut Sprech-Selbstvertrauen im
Kontext auf (B5: Interaktion schlägt reines Zuhören). Später optional ein KI-Gesprächspartner.

### Audio-Kurs (Pimsleur-Stil) 🎧
Hands-free, bildschirmfrei. Prompt auf Deutsch, Pause zum lauten Sprechen, dann hebräische
Musterlösung, in wachsenden Abständen abgerufen (graduated interval recall, D5). Ideal für
Pendeln/Sport. Speist den Scheduler über Selbsteinschätzung ("konnte ich / nicht").

### Sprechen (Ausspracheerkennung) 🎤
Wort/Satz vorsprechen, Gerät prüft grob per Speech-to-Text (Web Speech API / device STT).
Optional (Mikrofon-Erlaubnis), nie Pflicht. `minMastery: 1` (erst wenn Bedeutung sitzt).

### Blitz-Modus (Tages-Quiz) ⚡
Zeitlich begrenztes gemischtes Quiz aus fälligen Items, gutes "Tagesziel-Finish" und
Abruf-unter-leichtem-Druck. Klar begrenzt, kein Endlos-Wettbewerb.

---

## Modus × Item-Typ-Matrix

Welcher Modus welchen Item-Typ rendern kann (✓ = ja, · = nicht sinnvoll):

| Modus | word | phrase | sentence | letter | sign | number | dialogue_line |
|-------|:----:|:------:|:--------:|:------:|:----:|:------:|:-------------:|
| Karten | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wisch | ✓ | ✓ | · | ✓ | ✓ | ✓ | · |
| Reels | ✓ | ✓ | ✓ | ✓ | ✓ | · | · |
| Lektion | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Multiple Choice | ✓ | ✓ | · | ✓ | ✓ | ✓ | · |
| Matching | ✓ | ✓ | · | ✓ | ✓ | ✓ | · |
| Lückentext | · | · | ✓ | · | · | · | ✓ |
| Hören & Tippen | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ |
| Satzbau | · | ✓ | ✓ | · | · | · | ✓ |
| Bild-Wort | ✓ | · | · | · | ✓ | ✓ | · |
| Schilder-Lesen | · | · | · | · | ✓ | · | · |
| Dialog | · | ✓ | ✓ | · | · | · | ✓ |
| Audio-Kurs | ✓ | ✓ | ✓ | · | · | ✓ | ✓ |
| Sprechen | ✓ | ✓ | ✓ | · | · | ✓ | ✓ |
| Blitz | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · |

Diese Matrix ist im Code der `supports(item)`-Vertrag jedes Modus. Fügt man später einen neuen
Item-Typ oder Modus hinzu, ändert sich nur diese Matrix, nicht der Content.

---

## Wie eine typische Session abläuft

1. App öffnet auf dem **Home-Screen**, zeigt "heute fällig" + Tagesziel + Streak.
2. Nutzer:in wählt einen Modus **oder** tippt "Los geht's" (Smart-Session: der Generator wählt
   Modus-Mix passend zum Bestand und Tagesziel).
3. Session = ~70 % fällige Reviews + ~30 % neue Items (R9), Modus-Mix je nach Kontext:
   - Morgens/Pendeln: eher Audio/Reels.
   - Kurze Lücke: Wisch-Modus.
   - Fokussiert: Lektion/Blitz.
4. Jede Interaktion aktualisiert den einen SRS-Zustand und vergibt XP für echten Abruf.
5. Session endet mit klarem Abschluss (kein Endlos-Sog): "12 gelernt, 3 gemeistert, +40 XP".
