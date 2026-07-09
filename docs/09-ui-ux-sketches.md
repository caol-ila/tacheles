# 09 – UI/UX-Sketches (Wireframes)

Low-fidelity ASCII-Wireframes für die wichtigsten Screens. Ziel: Layout, Hierarchie und
Interaktion festhalten, nicht Pixel. Mobile-first (Android-Hochformat), Web ist responsiv breiter.

**Design-Prinzipien:**
- Warm, freundlich, ruhig (Name Tacheles, aber "Schalömchen"-Ton). Viel Weißraum, große Tap-Ziele.
- Hebräisch immer groß und **RTL** gerendert. Transliteration kleiner darunter, verblassend.
- Eine primäre Aktion pro Screen. Klare Session-Enden, kein Endlos-Sog.
- Maskottchen Jona (Taube) sparsam und positiv.

Legende: `[ Button ]`  `( ) Radio`  `▸ Aktion`  `he:` hebräische Zeile (rechtsbündig)

---

## 1. Onboarding

```
+------------------------------------------+
|                                          |
|               🕊️  Tacheles                |
|            – dein Schalömchen –           |
|     Reden wir Tacheles. Sag Schalom.     |
|     Hebräisch für Anfänger, mit Herz.    |
|                                          |
|         [   Los geht's   ]               |
|                                          |
|   Schon dabei?  ▸ Fortschritt laden      |
+------------------------------------------+

Schritt 1/3  Warum lernst du Hebräisch?
+------------------------------------------+
|  ( ) ✈️  Reise nach Israel               |
|  ( ) 👪  Familie & Freunde               |
|  ( ) 📖  Kultur & Religion               |
|  ( ) 🤷  Einfach so, aus Neugier         |
|                       [ Weiter ]         |
+------------------------------------------+

Schritt 2/3  Wie viel Zeit pro Tag?
+------------------------------------------+
|   ( ) 5 Min   (•) 10 Min                 |
|   ( ) 15 Min  ( ) 20 Min                 |
|   Du kannst das jederzeit ändern.        |
|                       [ Weiter ]         |
+------------------------------------------+

Schritt 3/3  Dein erstes Wort 🎉
+------------------------------------------+
|   he:                       שָׁלוֹם        |
|                          shalom          |
|                Hallo / Friede            |
|              [ 🔊 Anhören ]              |
|                                          |
|   Nach oben wischen für das nächste ⬆️   |
+------------------------------------------+
```

---

## 2. Home / Dashboard

```
+------------------------------------------+
|  Tacheles              🔥 5   ⭐ 320 XP  |
|------------------------------------------|
|                                          |
|   Heute fällig: 12 Wörter                |
|   Tagesziel: ▓▓▓▓▓▓░░░░  6/10 Min        |
|                                          |
|        [   ▶  Los geht's   ]             |   <- Smart-Session
|                                          |
|   Gemeistert: 84 Wörter   (A0 ▓▓▓▓▓▓▓░)  |   <- ehrliche Leitmetrik
|                                          |
|  Modi:                                   |
|  [🃏 Karten] [💚 Wisch] [📱 Reels]        |
|  [🧩 Matching] [🪧 Schilder] [🎧 Audio]  |
|                                          |
|  Aktuelles Thema:  ☕ Im Café  (7/18)    |
|------------------------------------------|
|   🏠 Home   📚 Lernen   📈 Fortschritt   👤 |
+------------------------------------------+
```

---

## 3. Karten-Modus (Flashcard, SRS-Kern)

```
Vorderseite (Prompt)                Rückseite (nach Tap)
+---------------------------+       +---------------------------+
|  Café  ·  Karte 3/15      |       |  Café  ·  Karte 3/15      |
|                           |       |                           |
|                           |       |  he:            חֶשְׁבּוֹן   |
|   Wie sagt man            |       |               cheshbon    |
|   "Rechnung"?             |       |             die Rechnung  |
|                           |       |          [ 🔊 ]           |
|                           |       |  Beispiel:                |
|   [ Antwort zeigen ]      |       |  he: ?אפשר חשבון בבקשה     |
|                           |       |  "Die Rechnung, bitte?"   |
+---------------------------+       +---------------------------+
                                    | [Nochmal][Schwer][Gut][Leicht] |
                                    +---------------------------+
                                      ^ 4-stufige FSRS-Bewertung
```
Hinweis Niqqud-Fade: bei mastery ≥ 3 erschiene oben nur `חשבון` ohne Niqqud, Transliteration weg.

---

## 4. Multiple Choice / Matching

```
Multiple Choice                     Matching (Tap-the-pairs)
+---------------------------+       +---------------------------+
|  Was bedeutet:            |       |  Verbinde die Paare       |
|  he:            תּוֹדָה      |       |                           |
|              toda         |       |  Danke      |   מַיִם        |
|                           |       |  Wasser     |   תּוֹדָה       |
|  [ Tschüss ]              |       |  Bitte      |   בְּבַקָּשָׁה    |
|  [ Danke ]        ✓       |       |  offen      |   פָּתוּחַ       |
|  [ Bitte ]                |       |                           |
|  [ Wasser ]               |       |  (tippe links, dann rechts)|
+---------------------------+       +---------------------------+
```

---

## 5. Wisch-Modus (Tinder-Stil)  💚❤️

```
+------------------------------------------+
|  Wisch-Runde        ▓▓▓▓░░░░  8 / 20     |
|                                          |
|        +--------------------------+      |
|        |                          |      |
|        |   he:          יְצִיאָה     |      |
|        |             yetsia        |      |
|        |                          |      |
|        |   Bedeutet das           |      |
|        |   "Ausgang"?             |      |
|        |                          |      |
|        +--------------------------+      |
|         ⟵ Nein            Ja ⟶          |
|                                          |
|   ↑ Rückgängig      🔊 Anhören           |
+------------------------------------------+
     links wischen = Nein/nochmal
     rechts wischen = Ja/kenn ich
     (Richtig-Falsch-Variante speist SRS)

Ende der Runde:
+------------------------------------------+
|            🎉  Runde geschafft!          |
|   18 richtig · 2 zum Auffrischen         |
|   +55 XP · 3 Wörter gemeistert           |
|      [ Nochmal ]   [ Fertig ]            |
+------------------------------------------+
```

---

## 6. Reels-Modus (TikTok-Feed)  📱

```
Expositions-Reel                    Quiz-Reel (jedes ~5.)
+---------------------------+       +---------------------------+
| ☕ Café        ▓▓░ 4/12   |       | ☕ Café        ▓▓▓ 5/12   |
|                           |       |                           |
|     [ Bild/Clip:          |       |   Schnell-Check!          |
|       Kaffeetasse ]       |       |                           |
|                           |       |   he:          קָפֶה        |
|   he:          קָפֶה        |       |   Was ist das?            |
|              kafe         |       |                           |
|          der Kaffee       |       |   ( ) Tee                 |
|                           |       |   (•) Kaffee              |
|   🔊 (spielt automatisch) |       |   ( ) Wasser              |
|   ❤️  💬  ⭐ merken        |       |                           |
|                           |       |   [ Bestätigen ]          |
|   ⬆️ nach oben: weiter    |       |                           |
+---------------------------+       +---------------------------+
Sessionlänge sichtbar oben. Am Ende Abschluss-Screen wie bei Wisch (kein Endlos-Feed).
```

---

## 7. Schilder-Lesen (Zielaufgabe)  🪧

```
+------------------------------------------+
|  Schilder lesen        ▓▓▓░░  3/8        |
|                                          |
|     +------------------------------+     |
|     |   [ Foto: Straßenschild ]    |     |
|     |                              |     |
|     |   he:            יְצִיאָה       |     |   (echtes Schild = ohne Niqqud;
|     |                              |     |    hier zur Demo mit)
|     +------------------------------+     |
|                                          |
|   Was bedeutet dieses Schild?            |
|   [ Eingang ]  [ Ausgang ✓ ]            |
|   [ Toilette ] [ Verboten ]              |
|                                          |
|   ▸ Transliteration einblenden           |
+------------------------------------------+
```

---

## 8. Dialog-Modus (Konversation)  💬

```
+------------------------------------------+
|  ☕ Dialog: Im Café          Zeile 3/6   |
|------------------------------------------|
|  Kellner:                                |
|  he:                  ?מה תרצה לשתות      |
|  "Was möchtest du trinken?"   🔊         |
|                                          |
|  Du antwortest:                          |
|  wähle die passende Zeile                |
|  [ Einen Kaffee, bitte. ]                |
|  [ Wo ist die Toilette? ]                |
|  [ Die Rechnung, bitte. ]                |
|                                          |
|  🎤 oder sprich deine Antwort            |
+------------------------------------------+
```

---

## 9. Fortschritt / Statistik

```
+------------------------------------------+
|  Dein Fortschritt                        |
|------------------------------------------|
|  Gemeisterte Wörter:  84                 |
|                                          |
|  A0 Survival     ▓▓▓▓▓▓▓▓▓░  92%         |
|  A1 Basis        ▓▓▓░░░░░░░  28%         |
|  A2 Alltag       ░░░░░░░░░░   0%         |
|                                          |
|  Diese Woche gelernt:  5 von 7 Tagen     |   <- Woche statt Angst-Zahl
|  Review-Trefferquote:  87%               |
|                                          |
|  Nächster Meilenstein:                   |
|  🏅 "Basis-Konversation" (noch 42 Wörter)|
+------------------------------------------+
```

---

## 10. Profil & Einstellungen

```
+------------------------------------------+
|  👤 Profil                               |
|------------------------------------------|
|  Anonym unterwegs.                       |
|  [ 🔒 Fortschritt sichern (E-Mail/Google)]|  <- optionales Upgrade
|                                          |
|  Einstellungen                           |
|  Stützräder:   (•) Automatisch verblassen|
|                ( ) Früher ausblenden     |
|                ( ) Länger behalten       |
|  Audio-Autoplay:        [ an  ]          |
|  Tagesziel:             [ 10 Min ▾ ]     |
|  Benachrichtigungen:    (•) sanft        |
|  Reduce Motion:         [ aus ]          |
|                                          |
|  ▸ Daten exportieren   ▸ Konto löschen   |
+------------------------------------------+
```

---

## 11. Achievements

```
+------------------------------------------+
|  Abzeichen                               |
|------------------------------------------|
|  🕊️ Erstes Schalom          ✓ erreicht   |
|  🔤 Alef-Bet-Meister        ✓ erreicht   |
|  🪧 Schilderleser (10)      ▓▓▓▓▓▓░ 6/10 |
|  ☕ Café-Held               gesperrt     |
|  🚫 Ohne Stützräder         gesperrt     |
+------------------------------------------+
```

---

## Interaktions- & Motion-Notizen

- **Feedback sofort:** richtig = kurzer grüner Puls + Häkchen-Sound; falsch = sanftes Rot, zeigt
  die korrekte Antwort, kein Strafgefühl.
- **Haptik** bei Wisch-Entscheidung und richtigem Abruf (abschaltbar).
- **RTL:** Hebräische Zeilen rechtsbündig; bei gemischten Zeilen (de + he) korrekte
  bidi-Behandlung. Eingabefelder für Hebräisch mit RTL-Cursor.
- **Ladefreundlich:** Skeleton-States; Inhalte sind lokal, also meist instant.
- **Reduce Motion:** ersetzt Reels-Übergänge und Konfetti durch dezente Fades.
- **Barrierefreiheit:** hebräische Schrift groß und in klarer Schriftart (z. B. eine gut lesbare
  Sans wie Assistant/Rubik); Kontrast AA; alle Buttons mit Labels.
