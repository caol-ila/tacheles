# 00 – Vision & Ziele

## Vision

Tacheles bringt einen deutschen Anfänger ohne Vorkenntnisse so schnell wie möglich an zwei
konkrete Alltagsfähigkeiten:

1. **Sprechen:** einfache Gespräche führen (sich vorstellen, bestellen, einkaufen, nach dem Weg
   fragen, Smalltalk, Zahlen und Zeit).
2. **Lesen:** Alltagsschilder und kurze Texte entziffern (Straßenschilder, Ladenschilder,
   Speisekarten, Wegweiser, Verpackungen).

Alles andere ist ausdrücklich zweitrangig. Kein akademisches Hebräisch, kein Bibelhebräisch,
keine perfekte Grammatik-Theorie. Nützlichkeit vor Vollständigkeit.

## Zielnutzer

- **Primär:** deutsche Muttersprachler:innen, erwachsen, absolute Anfänger:innen bis leicht
  Fortgeschrittene. Motiviert durch eine Reise nach Israel, Familie/Freunde, Religion/Kultur,
  Neugier oder einen Umzug. Wenig Zeit, wollen früh Erfolgserlebnisse.
- **Sprachrichtung:** ausschließlich Deutsch → Hebräisch. Keine weiteren Ausgangs- oder
  Zielsprachen. Das hält Inhalte, UI und Audio schlank.
- **Zielsprache:** modernes gesprochenes Hebräisch (Ivrit), wie es in Israel im Alltag verwendet
  wird. Nicht biblisches Hebräisch.

## Kernprinzipien

1. **Effizient:** Jede Minute soll messbar näher an "Gespräch führen" und "Schild lesen"
   bringen. Priorisierung strikt nach Häufigkeit und Alltagsnutzen.
2. **Spaß:** Kurze Sessions, sofortiges Feedback, verspielte Modi (Swipe, Reels), ehrliche
   Belohnung. Die App soll sich wie ein Snack anfühlen, nicht wie Hausaufgaben.
3. **Ehrlich:** Fortschritt wird echt gemessen (Abruf, nicht Klicks). Keine manipulativen
   Dark Patterns, keine Schein-Erfolge.
4. **Generisch:** Inhalte werden einmal gepflegt und in allen Modi wiederverwendet (siehe
   [Inhaltsmodell](03-content-model.md)).
5. **Frei und leicht:** Läuft auf kostenlosen Infrastruktur-Tiers, funktioniert offline,
   synchronisiert ohne Login-Zwang über Geräte hinweg.

## Nicht-Ziele (bewusst ausgeschlossen)

- Andere Ausgangssprachen als Deutsch, andere Zielsprachen als Hebräisch.
- Biblisches / liturgisches Hebräisch, Kantillationszeichen.
- Vollständige Grammatik-Referenz oder Zertifikatsvorbereitung.
- Handschrift/Kursive als Pflichtteil (optionaler Zusatz, siehe Schreib-Modus).
- Menschliche Tutor:innen, Live-Unterricht, Marktplatz.
- Rückrichtung Hebräisch → Deutsch als eigenes Lernziel (taucht nur als Übungsvariante auf).

## Erfolgsmetriken

**Lernwirksamkeit (das eigentliche Ziel):**
- Aktiver Kernwortschatz: Anzahl Items im SRS-Status "gefestigt" (mastery ≥ Schwelle).
- Meilenstein "Survival" (~150 Wörter + 50 Wendungen) und "Basis-Konversation" (~600 Wörter)
  erreicht.
- Lesetest ohne Niqqud: Trefferquote beim Erkennen echter Schilder.
- Ehrliche Retention: Trefferquote bei fälligen Reviews nach ≥ 1 Tag Pause.

**Engagement (Mittel zum Zweck, nicht Selbstzweck):**
- D1 / D7 / D30 Retention (Rückkehr am Tag 1/7/30).
- Durchschnittliche Session-Länge und Sessions pro Woche.
- Anteil Nutzer:innen, die die kritische 4-Wochen-Schwelle überstehen (dort lässt der
  Neuigkeitseffekt von Gamification erfahrungsgemäß nach).

**Leitplanke gegen Schein-Engagement:** Wir tracken bewusst das Verhältnis
"gefestigte Items pro aktiver Woche". Wenn Engagement steigt, aber echtes Lernen nicht,
ist das ein Warnsignal, kein Erfolg.

---

## Namensfindung

Gesucht war ein lustiger deutscher Name mit Wortwitz, der zur App passt. Bewertet nach:
Wiedererkennung des Hebräisch-Bezugs, Aussprechbarkeit für Deutsche, Charme/Humor,
App-Tauglichkeit (kurz, merkbar, markenfähig).

### Gewählt: **Tacheles**

- **Wortwitz:** Das deutsche Idiom "Tacheles reden" (Klartext reden, auf den Punkt kommen)
  stammt selbst aus dem Hebräischen (תכלית *tachlit*, Zweck/Ziel) und kam über das Jiddische ins
  Deutsche. Ein zweisprachiger Insider-Witz.
- **Warum es gewinnt:** Es ist ein deutsches Wort, das jede:r kennt, und es kommt genau aus der
  Sprache, die man hier lernt. Vor allem passt es exakt zum Ziel der App: endlich reden, ohne
  Umschweife, in Rekordzeit zum ersten echten Satz. "Reden wir Tacheles" ist Programm.
- **Tagline-Vorschläge:** "Hebräisch reden, ganz ohne Umschweife." / "Reden wir Tacheles." /
  "In fünf Minuten am Tag zum ersten Satz."
- **Untertitel / Zweitmarke:** Der wärmere Arbeitstitel **Schalömchen** (Schalom + Diminutiv
  "-chen") lebt als liebevoller Untertitel und Begrüßung weiter: Willkommensgruß und die Sprache
  des Maskottchens sind bewusst "Schalömchen"-warm, damit die fremde Schrift nicht bedrohlich
  wirkt.
- **Maskottchen-Idee:** eine freundliche kleine Comic-Taube namens **Jona** (hebräisch יונה
  "Taube", zugleich der biblische Name). Sie lädt zum Reden ein und mahnt nie (Anti-Dark-Pattern,
  siehe [Gamification](06-gamification.md)).

### Starke Alternativen (dokumentiert)

| Name | Wortwitz | Stärke | Schwäche |
|------|----------|--------|----------|
| **Schalömchen** | Schalom (שלום) + deutsches Diminutiv "-chen" | Sehr warm, niedrigschwellig, signalisiert sofort Hebräisch; jetzt Untertitel/Begrüßung | Weniger auf "reden/Klartext" gemünzt |
| **Ivritz** | Ivrit (עברית, Hebräisch) + "flitz/Blitz" | Signalisiert Tempo und die Sprache | Wortwitz subtiler, Aussprache uneindeutig |
| **Kauderhebräisch** | Kauderwelsch + Hebräisch | Sehr witzig, selbstironisch | "Kauderwelsch" ist negativ konnotiert (Gebrabbel) |
| **Aleph mal langsam** | Aleph (א, erster Buchstabe) + "halt mal langsam" | Wortspiel auf Einstieg und Tempo | Etwas sperrig |

**Entscheidung:** Produktname **Tacheles**, mit **Schalömchen** als warmem Untertitel/Begrüßung.
Der früher angedachte "Tacheles-Modus" entfällt als Modusname, da Tacheles jetzt die ganze App
ist; der Konversationsmodus heißt schlicht **Dialog-Modus**.
