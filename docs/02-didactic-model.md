# 02 – Didaktik-Modell

Dieses Dokument übersetzt die Forschungsbefunde aus [01](01-research-findings.md) in konkrete
Lernmechanik. Es ist die Brücke zwischen "was die Wissenschaft sagt" und "wie die App sich
verhält". Jede Entscheidung verweist auf ihren Beleg (z. B. B2, C6).

## Die fünf Säulen

1. **Spaced Repetition als Rückgrat** (B1, B2, D3, D4)
2. **Aktiver Abruf statt Wiedererkennen** (B3, D8)
3. **Hochfrequenz-Kern statt Masse** (A1–A4)
4. **Niqqud-/Transliterations-Fade** (C2–C6)
5. **Adaptive Schwierigkeit** (D1, D2)

---

## Säule 1: Spaced Repetition (SRS)

Jedes Content-Atom (siehe [03](03-content-model.md)) hat pro Nutzer:in einen Gedächtniszustand.
Wir verwenden ein Modell im **FSRS-Stil** (Free Spaced Repetition Scheduler), weil es auf dem
belegten Drei-Komponenten-Modell des Gedächtnisses beruht und weniger Reviews für dieselbe
Retention braucht (D4).

**Drei Komponenten pro Item:**
- **Stability (S):** wie lange die Erinnerung hält (Halbwertszeit-artig, vgl. Duolingo HLR, D1).
- **Difficulty (D):** wie schwer dieses Item für diese Person ist.
- **Retrievability (R):** aktuelle Abrufwahrscheinlichkeit, fällt mit der Zeit.

**Scheduling-Regeln (evidenzbasiert):**
- Fällig wird ein Item, wenn R unter eine Zielschwelle fällt (Default-Ziel-Retention ~90 %).
- Intervalle **dehnen sich aus** über Tage (B2: längeres Spacing gewinnt bei verzögerten Tests,
  g = 0,40). Grobe Startleiter für neue Items: 10 min → 1 Tag → 3 Tage → 7 Tage → 16 Tage → ...
- **Bewertung mit 4 Stufen** (wie Anki-SM-2, D3): "Nochmal / Schwer / Gut / Leicht". Eine
  einzige Fail-Stufe.
- Bei richtig: S steigt, nächstes Intervall wächst. Bei falsch (Lapse): Item fällt in eine
  kurze Lern-Warteschlange zurück, D steigt leicht.
- **Nicht fallen lassen:** Ein einmal gemeistertes Item bleibt im Langzeit-Review-Zyklus (B3).

**Wichtig:** Der Scheduler ist **modus-agnostisch**. Egal ob ein Item im Wisch-Modus, als
Multiple Choice oder im Reels-Feed abgefragt wurde, das Ergebnis (richtig/falsch + Reaktionszeit)
aktualisiert denselben Gedächtniszustand. Alle Modi füttern einen Scheduler.

> Umsetzung: die quelloffene Bibliothek `ts-fsrs` (TypeScript, MIT) als Referenz-Implementierung.
> Kostenlos, gut dokumentiert. Siehe [Architektur](10-architecture-tech-stack.md).

---

## Säule 2: Aktiver Abruf statt Wiedererkennen

Reines Wiedererkennen (Antwort ist sichtbar, man nickt innerlich) ist schwächer als aktiver
Abruf (B3). Deshalb:

- **Produktion wird belohnt:** Modi, die echten Abruf verlangen (Tippen, Sprechen, Satzbau),
  geben mehr XP und lassen die Stability stärker steigen als reine Erkennungsmodi.
- **Progression Erkennen → Produzieren** pro Item (D8), gekoppelt an mastery_level:
  1. **Exposition:** Item zum ersten Mal sehen/hören, mit allen Stützen (Niqqud, Transliteration,
     Bild, Audio, deutsche Bedeutung).
  2. **Wiedererkennen:** Multiple Choice, Matching, Swipe (kennst du das?).
  3. **Geführte Produktion:** Lückentext, Wortbank-Satzbau, Gehörtes tippen.
  4. **Freie Produktion:** frei tippen, sprechen, im Dialog verwenden.
- Der Scheduler wählt die Abfrage-Tiefe passend zum mastery_level, damit frühe Items nicht
  frustrieren und gefestigte nicht langweilen.

---

## Säule 3: Hochfrequenz-Kern statt Masse

- **Gesamtziel-Korridor:** ein kuratierter Kern von rund **600–1.000 Wörtern + ~150 Wendungen**.
  Belege: die häufigsten ~1.000 Wörter decken ~80 % Text / ~85 % Sprache (A1); ~3.000 geben
  > 95 % gesprochene Abdeckung (A2). Für unser Ziel (Basisgespräch + Schilder) ist der obere
  Hochfrequenzbereich der Sweet Spot.
- **Meilenstein-Bänder** (Details in [Themenbereiche](04-content-themes.md)):
  - **A0 "Survival":** ~150 Wörter + ~50 Wendungen. Begrüßung, Höflichkeit, Zahlen, Ja/Nein,
    häufigste Schilder (Eingang/Ausgang, Toilette, offen/geschlossen).
  - **A1 "Basis-Konversation":** ~600 Wörter. Sich vorstellen, bestellen, einkaufen, Weg,
    Zeit/Datum, einfache Fragen.
  - **A2 "Sicherer Alltag":** ~1.200–1.500 Wörter. Nähert sich der Hochabdeckungs-Zone.
- **Priorisierung:** Jedes Item trägt einen `frequency_rank`. Neue Inhalte werden in
  Häufigkeits-Reihenfolge freigeschaltet, gefiltert nach Alltagsnutzen (ein seltenes, aber auf
  jedem Schild stehendes Wort wie "Ausgang" wird hochgezogen).
- **Caveat Hebräisch:** wurzelbasierte Morphologie. Wir pflegen die **Wurzel (Schoresch)** als
  Metadatum, um Wortfamilien sichtbar zu machen, aber wir lernen konkrete, nützliche Wortformen,
  keine abstrakten Wurzeln.

---

## Säule 4: Niqqud- und Transliterations-Fade ("Stützräder")

Das ist die didaktisch heikelste und am besten belegte Entscheidung. Ausgangslage:
- Anfänger lesen mit Niqqud genauer (C2).
- Geübte lesen **ohne** Niqqud über Clustererkennung (C3, C4), echte Schilder haben kein Niqqud (C5).
- Ein zwingendes "erst Niqqud, dann ohne"-Gerüst ist **nicht** nötig (C6, widerlegt).

**Unser Ansatz: drei Anzeige-Ebenen pro Item, die mit Beherrschung verblassen.**

| Ebene | zeigt | wann sichtbar |
|-------|-------|---------------|
| Voll gestützt | Niqqud **+** Transliteration **+** Audio | mastery 0–1 (neu) |
| Teilgestützt | Niqqud, **keine** Transliteration | mastery 2 |
| Ziel-Ansicht | **kein** Niqqud, **keine** Transliteration (wie echte Schilder) | mastery ≥ 3 |

- Der Fade ist **automatisch** an das mastery_level gekoppelt, mit Flags
  `niqqud_visible` / `transliteration_visible` im Lernzustand.
- **Nutzer-Override:** Ein globaler Schalter erlaubt, Stützen früher abzuschalten
  (für Ambitionierte) oder länger zu behalten (Autonomie, E2). Default = automatischer Fade.
- **Tap-to-reveal:** In der Ziel-Ansicht kann man jederzeit antippen, um Niqqud/Transliteration
  kurz einzublenden, ohne den Fortschritt zurückzusetzen. Reduziert Frust.
- **Schild-Realismus:** Der Schilder-Lese-Modus zeigt bewusst früh **ohne** Niqqud, weil das
  die reale Zielaufgabe ist. Transliteration bleibt dort als optionale Hilfe.

**Schrift-Curriculum (Reihenfolge):**
1. **Blockschrift/Druck zuerst** (Schilder und Texte sind in Druck). Kursive/Handschrift ist
   optional und später (Schreib-Modus).
2. Alle 22 Konsonanten inkl. **Endformen (Sofit)** (ך ם ן ף ץ) und die Buchstaben, die als
   Vokal-Träger dienen (Matres lectionis: א ה ו י).
3. Rechts-nach-links als harte UI-Regel (C1): hebräischer Text immer RTL gerendert, Cursor,
   Eingabe, Zeilenumbruch korrekt.

---

## Säule 5: Adaptive Schwierigkeit

Nach dem Birdbrain-Prinzip (D2): die App schätzt grob das Können pro Themengebiet und wählt die
nächste Übung so, dass sie **fordernd, aber machbar** ist.

- **Session-Generator:** stellt jede Session aus fälligen Reviews (SRS) + einer kleinen Menge
  neuer Items zusammen. Verhältnis default ~70 % Review / 30 % neu, anpassbar.
- **Schwierigkeits-Ziel:** Trefferwahrscheinlichkeit der gewählten Items um ~80 % halten (nicht
  zu leicht, nicht demoralisierend).
- **Blocken bei Einführung, Mischen beim Review** (B4, wichtige Nuance): Neue Items eines Themas
  werden **geblockt** eingeführt (zusammenhängend, weil Blocken bei Wörtern gewinnt). Reviews
  ziehen dagegen **thematisch gemischt** aus dem ganzen Bestand, was der SRS-Scheduler ohnehin
  tut. Wir mischen also nicht künstlich beim Neulernen.

---

## Umgang mit den Grenzen von Gamification (Didaktik-Sicht)

- Gamification hebt Motivation (E1, E4), nicht direkt Kompetenz (E3, E5). Deshalb bleibt die
  **Lernmechanik oben (SRS, Abruf)** der Kern; Gamification ist die Verpackung, nie der Inhalt.
- XP nur für **echten Abruf**, nie für bloße Taps (Gegenmittel gegen E6, kosmetische Gamification).
- Ehrlicher Fortschritt: die App zeigt "gemeisterte Wörter" als primäre Metrik, nicht nur Streak
  und XP. Siehe [Gamification](06-gamification.md) und [Vision](00-vision-and-goals.md#erfolgsmetriken).

## Zusammenfassung als Regelwerk (für Implementierung)

```
R1  Alle Modi schreiben in EINEN SRS-Zustand pro (user, item).
R2  Intervalle dehnen sich aus; Ziel-Retention ~90 %.
R3  Bewertung 4-stufig; ein Item wird nie dauerhaft "fertig".
R4  Abfrage-Tiefe folgt mastery_level: Exposition -> Erkennen -> geführte -> freie Produktion.
R5  Neue Items streng nach frequency_rank x Alltagsnutzen freischalten.
R6  Niqqud+Transliteration verblassen automatisch mit mastery; Tap-to-reveal immer möglich.
R7  Blockschrift zuerst; RTL überall korrekt; Endformen + Matres lectionis lehren.
R8  Neue Themen geblockt einführen, Reviews thematisch gemischt (SRS-getrieben).
R9  Session = ~70% faellige Reviews + ~30% neu; Schwierigkeit auf ~80% Trefferquote.
R10 XP nur fuer echten Abruf; "gemeisterte Woerter" ist die Leitmetrik.
```
