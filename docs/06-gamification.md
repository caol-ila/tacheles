# 06 – Gamification-System

Gamification ist bei Tacheles **Motivations-Vehikel, nicht Lern-Ersatz**. Die Forschung ist
hier eindeutig und wird streng befolgt:

- Gamification hebt vor allem **Motivation, Autonomie und Verbundenheit** (E1, E2), kaum die
  **Kompetenz** direkt (E3, E5). Der Nutzen fließt zu ~46 % über Motivation (E4).
- **Kosmetische Gamification ohne echte Mechanik kann sogar schaden** (E6).
- Der Effekt **verpufft oft nach ~4 Wochen** (Neuigkeitseffekt), kann aber zurückkommen (E7).
- **Wettbewerb/Leaderboards** sind die häufigste Ursache für "gamification misuse" (E8).

Daraus folgt unser Leitsatz:

> **Belohne echtes Lernen, nie bloße Aktivität. Fördere Autonomie und Verbundenheit. Vermeide
> Druck, Angst und Endlosschleifen.**

---

## Die Bausteine (und wie wir sie entschärfen)

### 1. XP (Erfahrungspunkte) — an echten Abruf gekoppelt
- XP gibt es **nur für Abruf-Ereignisse mit Ergebnis** (richtig/falsch), nicht für Wischen ohne
  Prüfung, nicht für bloßes Ansehen. Gegenmittel gegen E6 (Kosmetik).
- **Gewichtung nach Lerntiefe:** Produktion (Tippen, Sprechen, Satzbau) gibt mehr XP als reines
  Wiedererkennen. So zieht das Belohnungssystem in Richtung wirksameren Lernens (B3, D8).
- Kleiner Bonus für fällige Reviews (nicht nur neue Items), damit Wiederholen sich lohnt.

### 2. Streak (Tagesserie) — vergebend, ohne Angst
- Streak zählt **Tage mit erreichtem Tagesziel** (5/10/15/20 Min, selbst gewählt = Autonomie).
- **Streak-Freeze / "Ruhetag":** automatische Freezes (z. B. 2 im Vorrat, langsam nachfüllend),
  die einen verpassten Tag abfangen. Streak misst *Dranbleiben*, nicht Perfektion.
- **Kein Schuld-Ton.** Benachrichtigungen sind freundlich und optional ("Lust auf 5 Minuten
  Tacheles?"), nie drohend ("Dein Streak stirbt!"). Direkt gegen das Streak-Angst-Muster.
- **Wochenansicht statt endloser Zahl:** Fokus auf "5 von 7 Tagen diese Woche", nicht auf eine
  einschüchternde 428-Tage-Zahl, die man um jeden Preis halten muss.

### 3. "Gemeisterte Wörter" — die ehrliche Leitmetrik
- Prominenter als XP und Streak: **wie viele Wörter sind wirklich gefestigt** (mastery ≥ 3,
  d. h. auch ohne Niqqud abrufbar). Das ist die Metrik, die dem echten Ziel entspricht
  (gegen die Motivations-Leistungs-Lücke E3).
- Fortschrittsbalken pro Thema und pro Band (A0/A1/A2) auf Basis gemeisterter Items.

### 4. Achievements / Abzeichen — an Lern-Meilensteine gebunden
Nur für echte Lernschritte, nicht für Trivialitäten:
- "Erstes Schalom" (erstes Wort gemeistert), "Alef-Bet-Meister" (alle Buchstaben),
  "Schilderleser" (erste 10 Schilder ohne Niqqud korrekt), "Survival freigeschaltet"
  (A0 abgeschlossen), "Café-Held" (Café-Dialog fehlerfrei), "Ohne Stützräder" (erstes Thema
  komplett ohne Niqqud/Transliteration).
- Bewusst **keine** reinen Grind-Abzeichen ("1000 Taps").

### 5. Level / Bänder
- Sichtbare Progression A0 → A1 → A2 mit kleinen Feiern bei Bandwechsel. Autonomie: man sieht,
  wo man steht und was als Nächstes kommt.

### 6. Ligen / Leaderboards — **opt-in, kooperativ, entschärft**
- **Standardmäßig AUS** (`league_opt_in: false`). Wettbewerb ist die Hauptursache für Ablenkung
  vom Lernen (E8), deshalb keine Zwangsteilnahme.
- Wenn an: kleine Gruppen, **kooperative Rahmung** ("gemeinsames Wochenziel" statt Rangkampf),
  keine Absteiger-Bestrafung, keine Push-Eskalation.
- Alternative zu Ranglisten: **Freundes-Ermutigung** (ein Freund kann ein "Kol ha-kavod!"
  = "Respekt!" senden). Fördert Verbundenheit (E2, stärkster Effekt) ohne Rangdruck.

### 7. Maskottchen Jona (die Friedens-Taube) — freundlich, nie nervig
- Feiert Erfolge, gibt Tipps, taucht in Reels/Onboarding auf.
- **Explizit nicht** das aggressive "passive-aggressive Erinnerungs-Meme"-Muster. Jona bittet,
  droht nie.

### 8. Variable Belohnung — dezent und ehrlich
- Kleine Überraschungen (Konfetti, seltene Sticker, ein Bonus-Reel), aber **nie** als Ersatz für
  Lernwert und ohne Glücksspiel-Mechanik (keine Lootboxen, keine künstliche Verknappung).

---

## Gegen das 4-Wochen-Loch (E7)

Konkrete Maßnahmen, um Nutzer:innen über den Neuigkeits-Einbruch (ab ~Woche 4) zu tragen:
- **Modi zeitversetzt freischalten:** Nicht alle Modi am Tag 1. Reels und Wisch früh, Dialog und
  Sprechen etwas später, Blitz/Ligen noch später. So gibt es über Wochen neue Reize.
- **Content-Frische:** neue Themen, saisonale Reels, wechselnde Tages-Challenges.
- **Sanfte Reaktivierung:** nach ein paar inaktiven Tagen eine freundliche, wertstiftende
  Nachricht ("3 Wörter sind fast vergessen, 2 Minuten reichen zum Auffrischen"), keine Panikmache.
- **Erfolg sichtbar machen:** Rückblick "Das kannst du jetzt, was du vor 3 Wochen nicht konntest".

---

## Datenmodell (siehe auch 03)

```ts
interface Gamification {
  user_id: string;
  xp_total: number;
  xp_today: number;
  streak_days: number;
  streak_freezes: number;         // Vorrat
  last_active_day: string;        // fuer Streak-Berechnung
  daily_goal_minutes: 5|10|15|20;
  mastered_count: number;         // Leitmetrik (redundant gecacht)
  achievements: string[];
  league_opt_in: boolean;         // default false
  updated_at: string;
}
```

## XP-Formel (Referenz)

```
xp(event) = basis(mode) * tiefe_faktor(mode) * (correct ? 1 : 0.3) * (faellig ? 1.2 : 1.0)

basis:        flashcard/mc/matching/swipe = 5,  cloze/listen = 7,  satzbau = 8,  sprechen/dialog = 10
tiefe_faktor: erkennen = 1.0,  gefuehrte produktion = 1.3,  freie produktion = 1.6
```
Falsche Antworten geben etwas XP (Lernen aus Fehlern), aber deutlich weniger. So bleibt der
Anreiz auf **echtem Können**, nicht auf Klick-Menge.

---

## Was wir bewusst NICHT tun (Dark-Pattern-Verbotsliste)

- Kein Schuld-/Angst-Marketing um Streaks ("Du verlierst gleich alles!").
- Kein erzwungener, endloser Feed und kein Auto-Nachladen ohne Zustimmung.
- Keine Pflicht-Leaderboards, keine Abstiegs-Bestrafung.
- Keine XP für bloße Aktivität ohne Abruf (verhindert Schein-Lernen, E6).
- Keine Lootboxen, kein Pay-to-Win, keine künstliche Verknappung von Lerninhalten.
- Keine Push-Eskalation (immer aggressivere Erinnerungen).
- Keine irreführenden Fortschrittsanzeigen ("Du bist fast fertig!", wenn man es nicht ist).
