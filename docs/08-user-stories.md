# 08 – User Stories

Format: "Als [Rolle] möchte ich [Ziel], damit [Nutzen]." Mit Akzeptanzkriterien (AK). Priorität:
**P0** = MVP-Pflicht, **P1** = kurz nach MVP, **P2** = später.

Personas:
- **Lena, 29, Israel-Reise in 6 Wochen.** Will schnell Survival-Hebräisch, lernt in
  U-Bahn-Häppchen. Hauptnutzerin.
- **Micha, 41, Familie in Haifa.** Will Small Talk und Schilder lesen, lernt abends.
- **Sarah, 23, TikTok-Native.** Kommt über den Spaß, bleibt wegen sichtbarem Fortschritt.

---

## Epic A — Onboarding & Ziele

**A1 (P0)** Als neue Nutzerin möchte ich **ohne Registrierung sofort loslegen**, damit ich nicht
abgeschreckt werde.
- AK: Beim ersten Start ist nach ≤ 2 Screens die erste Lern-Interaktion erreichbar.
- AK: Es wird anonym eingeloggt, Fortschritt wird lokal + Cloud gespeichert, ohne dass ich Daten
  eingebe.

**A2 (P0)** Als Nutzerin möchte ich **mein Ziel und Tempo wählen** (z. B. Reise, Familie, Kultur;
5/10/15/20 Min pro Tag), damit die App relevant und machbar ist.
- AK: Auswahl beeinflusst Themen-Reihenfolge (z. B. Reise → Restaurant/Verkehr zuerst).
- AK: Tagesziel steuert Session-Länge und Streak-Bedingung.

**A3 (P1)** Als Nutzerin möchte ich **beim Onboarding die Schrift kennenlernen**, damit Hebräisch
nicht bedrohlich wirkt.
- AK: Kurzer, spielerischer Aleph-Bet-Teaser (3–5 Buchstaben) in der ersten Session.

## Epic B — Lernen (Kern)

**B1 (P0)** Als Lernende möchte ich **fällige Wiederholungen automatisch vorgesetzt bekommen**,
damit ich nichts vergesse und nicht selbst planen muss.
- AK: Home zeigt "heute fällig: N". "Los geht's" startet eine Session aus ~70 % Reviews + ~30 %
  neu.
- AK: Jede Antwort aktualisiert den SRS-Zustand (FSRS-Stil), Intervalle dehnen sich aus.

**B2 (P0)** Als Lernende möchte ich **denselben Wortschatz in verschiedenen Modi** üben, damit es
abwechslungsreich bleibt und ich nichts doppelt lernen muss.
- AK: Ein in Modus X gemeistertes Item gilt auch in Modus Y als gemeistert (ein Zustand).
- AK: Mindestens Karten, Multiple Choice, Matching, Wisch im MVP verfügbar.

**B3 (P0)** Als Anfängerin möchte ich **Niqqud und Transliteration als Hilfe**, die **mit meinem
Können verschwinden**, damit ich am Ende echte Schilder lesen kann.
- AK: Neue Items zeigen Niqqud + Transliteration.
- AK: Ab mastery 2 verschwindet Transliteration, ab mastery 3 auch Niqqud.
- AK: Tap-to-reveal blendet Stützen jederzeit kurz ein, ohne Fortschritt zu ändern.
- AK: Globaler Schalter erlaubt "Stützräder früher aus" / "länger behalten".

**B4 (P0)** Als Lernende möchte ich **Audio zu jedem Wort/Satz hören**, damit ich die Aussprache
lerne.
- AK: Play-Button an jedem Item; optionales Auto-Play; funktioniert offline für geladene Inhalte.

**B5 (P1)** Als Lernende möchte ich **das hebräische Alphabet systematisch lernen** (inkl.
Endformen, RTL), damit ich lesen kann.
- AK: T00-Buchstaben-Spur mit letter-Items; RTL korrekt gerendert.

**B6 (P1)** Als Lernende möchte ich **sprechen und Feedback bekommen**, damit ich mich traue.
- AK: Sprechen-Modus mit Ausspracheerkennung (opt-in Mikrofon), nie Pflicht.

**B7 (P1)** Als Reisende möchte ich **echte Schilder lesen üben**, damit ich mich in Israel
zurechtfinde.
- AK: Schilder-Lese-Modus mit realistischen Schildern ohne Niqqud, Aufgabentypen "Was bedeutet
  das / wo lang / offen oder zu".

**B8 (P2)** Als Lernende möchte ich **Mini-Dialoge durchspielen**, damit ich Gespräche im Kontext
übe.
- AK: Dialog-Modus mit Rollen, Auswahl/Sprechen der eigenen Zeile, Audio-Antwort des Gegenübers.

## Epic C — Spaß-Modi

**C1 (P0)** Als Sarah möchte ich einen **Wisch-Modus (Tinder-Stil)**, damit Vokabeln schnell und
spielerisch sitzen.
- AK: Karten wischbar (rechts/links), Haptik, Undo, klar begrenzter Stapel mit Endbildschirm.
- AK: Mindestens eine echte Abruf-Variante (Richtig-Falsch-Swipe) speist den Scheduler.

**C2 (P1)** Als Sarah möchte ich einen **Reels-Modus (TikTok-Feed)**, damit Lernen sich wie
Scrollen anfühlt.
- AK: Vertikaler Vollbild-Feed, Auto-Audio, Nach-oben-Wisch = nächstes Reel.
- AK: Etwa jedes 4.–5. Reel ist ein Quiz-Reel (echter Abruf).
- AK: Feed hat eine sichtbare Sessionlänge (an Tagesziel gekoppelt), kein erzwungenes Endlos.
- AK: Feed ist SRS-gespeist (fällige + thematisch passende Items), nicht zufällig.

**C3 (P2)** Als Nutzerin möchte ich **Reels als Favorit markieren**, damit ich Lieblingsinhalte
wiederfinde.

## Epic D — Fortschritt & Sync

**D1 (P0)** Als Nutzerin möchte ich **meinen Fortschritt geräteübergreifend**, damit ich auf
Handy und Web nahtlos weiterlerne.
- AK: Nach Konto-Verknüpfung (E-Mail/Google) ist derselbe Fortschritt auf zweitem Gerät sichtbar.
- AK: Sync funktioniert ohne manuelles Zutun im Hintergrund.

**D2 (P0)** Als Nutzerin möchte ich **offline lernen**, damit ich in Flugzeug/U-Bahn weiterkomme.
- AK: Geladene Inhalte + laufende Sessions funktionieren ohne Netz; Fortschritt synct später.

**D3 (P0)** Als Nutzerin möchte ich **sehen, wie viele Wörter ich wirklich beherrsche**, damit
mein Fortschritt ehrlich sichtbar ist.
- AK: "Gemeisterte Wörter" prominent, Fortschrittsbalken pro Thema/Band.

**D4 (P1)** Als Nutzerin möchte ich **meinen Fortschritt sichern/wiederherstellen**, damit ich
ihn bei Geräteverlust nicht verliere.
- AK: Freiwilliges Upgrade auf E-Mail/Google; Wiederherstellung auf neuem Gerät.

**D5 (P1)** Als Nutzerin möchte ich **meine Daten exportieren/löschen können**, damit ich die
Kontrolle behalte (DSGVO).

## Epic E — Motivation (Gamification, ehrlich)

**E1 (P0)** Als Nutzerin möchte ich **XP für echtes Lernen**, damit sich Anstrengung lohnt.
- AK: XP nur bei Abruf-Ereignissen; Produktion gibt mehr als Wiedererkennen; kein XP für bloße Taps.

**E2 (P0)** Als Nutzerin möchte ich einen **vergebenden Streak**, damit ich dranbleibe, ohne
Angst.
- AK: Streak = Tage mit erreichtem Tagesziel; Auto-Freeze fängt einzelne Aussetzer ab;
  Benachrichtigungen freundlich und optional; keine Drohsprache.

**E3 (P1)** Als Nutzerin möchte ich **Achievements für Meilensteine**, damit Erfolge gefeiert
werden.
- AK: Abzeichen nur an Lernschritte gebunden (z. B. "Alef-Bet-Meister", "Schilderleser").

**E4 (P2)** Als geselliger Nutzer möchte ich **optional mit Freunden lernen**, damit es
verbindend ist.
- AK: Ligen/Leaderboards **opt-in**, kooperativ gerahmt; Freundes-Ermutigung ("Kol ha-kavod!").

## Epic F — Einstellungen & Barrierefreiheit

**F1 (P0)** Als Nutzerin möchte ich **Stützräder, Audio-Autoplay, Benachrichtigungen und
Tagesziel einstellen**, damit die App zu mir passt (Autonomie).

**F2 (P1)** Als Nutzerin mit Bedürfnis nach Ruhe möchte ich **Reduce-Motion und weniger
Benachrichtigungen**, damit die App nicht überfordert.

**F3 (P1)** Als sehende-mit-Brille Nutzerin möchte ich **große, klare hebräische Schrift und gute
Kontraste**, damit ich die Buchstaben gut erkenne.

---

## Nicht-funktionale Anforderungen (Auszug)

- **Performance:** Interaktion (Antwort → Feedback) < 100 ms lokal; App-Start < 2 s.
- **Offline:** Kernlernen ohne Netz voll funktionsfähig.
- **RTL-Korrektheit:** hebräischer Text überall korrekt rechts-nach-links, inkl. gemischter
  de/he-Zeilen.
- **Kosten:** läuft im kostenlosen Backend-Tier für die erwartete Nutzerzahl.
- **Barrierefreiheit:** Schriftgröße skalierbar, Kontrast AA, Reduce-Motion, Screenreader-Labels.
- **Datenschutz:** anonym nutzbar, minimale Daten, Export/Löschung möglich.
