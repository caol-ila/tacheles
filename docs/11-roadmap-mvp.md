# 11 – Roadmap & MVP

Prinzip: früh ein **vollständiger, ehrlicher Lernkreis** über wenige Modi und einen kleinen, aber
echten Content-Kern. Erst Wirkung, dann Breite.

## Der MVP-Leitsatz

> Ein Anfänger kann in Woche 1 die wichtigsten 150 Wörter + Aleph-Bet lernen, über **Karten,
> Multiple Choice, Matching und Wisch**, mit **automatischem Niqqud-Fade**, **SRS**, **XP +
> vergebendem Streak**, und der Fortschritt ist **offline** und **geräteübergreifend** gesichert.

Alles darüber (Reels, Dialog, Sprechen, Audio-Kurs, Ligen) ist Ausbau.

## Umsetzungsstand (2026-07-13)

Das Web-MVP+ in [`../app`](../app/README.md) ist gebaut, getestet und übertrifft den
MVP-Leitsatz sowie Teile der Phasen 2–3:

- **13 Modi:** Karten, Auswahl, Paare, Wisch (Pfeiltasten), Reels (Start-Chooser), Schilder,
  Hören (🐢), Sprechen (STT + 🐢), Dialog (12 Gespräche), Satzbau, Bilder (Emoji), Blitz (60 s),
  Audio-Kurs (hands-free) — plus 🎓 Survival-Check als Prüfungsmodus ohne Stützräder.
- **Geführte Module:** 6 Lern-Module (Buchstaben-Walkthroughs, ähnliche Buchstaben, Endformen,
  Punkte-Buchstaben, Aussprache, Gegensatz-Paare) mit Erklär-, Lehr- und Quiz-Schritten.
- **Level-System:** Bänder A0–B2, progressive Freischaltung (40 % gemeistert), Override im
  Profil, Einstufungstest im Onboarding und Profil (rein diagnostisch).
- **Didaktik:** SRS + Niqqud-Fade + Aleph-Bet-Spur (Lese-Reihenfolge) + Alef-Bet-Tafel +
  Verwechsler-Distraktoren + Ähnlichkeits-Distraktoren (ab mastery 2, inkl. Gegenteil-Falle) +
  geführter Pfad + Onboarding + Knacknüsse + Session-Rückblick.
- **Motivation:** 15 Abzeichen (nur Lern-Meilensteine), Streak mit ❄️ Freezes, Heute-Zeile,
  ehrliche XP. ~533 Content-Einträge in 33 Themen (A0–B2), 15 Gegensatz-Paare.
- **Technik:** file:// oder localhost-Starter (Mikrofon-Merken), PWA + Service Worker,
  Export/Import mit Zusammenführen + Clipboard-Sync-Code statt Cloud-Sync (bewusst, siehe 07),
  Regressionssuite `app/test/regression.cjs` (58 Checks).
- **Bewusst offen:** Cloud-Sync (Supabase), echte Muttersprachler-Aufnahmen, muttersprachliches
  Review von Niqqud/Dialogen (jetzt inkl. A2–B2-Inhalten), Expo/Android-Native, Ligen.

---

## Phase 0 — Fundament (Woche 1–3)

- Repo, Expo-Setup, TypeScript, CI mit Zod-Content-Validierung.
- Content-Schema (LernItem, Theme) implementiert; `HebrewText`-Komponente mit RTL + Fade.
- `ts-fsrs` eingebunden, Scheduler + Session Generator (Grundfassung).
- Lokaler Store (offline-first) steht.
- **Content:** T00 Aleph-Bet (22+5), T01 Begrüßung, T03 Zahlen 0–10, T04 wichtigste Schilder
  (~40 Items gesamt), mit Transliteration; Niqqud + Audio wo verfügbar.

**Definition of Done:** ein Item durchläuft Exposition → Review, Fortschritt bleibt nach Neustart.

## Phase 1 — MVP (Woche 4–8)

- **Modi:** Karten, Multiple Choice, Matching, **Wisch**.
- Niqqud-/Transliterations-Fade automatisch an mastery gekoppelt + Tap-to-reveal + globaler Schalter.
- Home/Session/Fortschritt/Profil-Screens (siehe [09](09-ui-ux-sketches.md)).
- **Gamification:** XP (an Abruf gekoppelt), vergebender Streak mit Freeze, "gemeisterte Wörter"
  als Leitmetrik, erste Achievements.
- **Sync:** anonyme Auth + Supabase, offline-first mit LWW; Konto-Upgrade (E-Mail Magic Link).
- **Content:** A0 komplett (~150 Wörter + ~50 Wendungen + Schilder), Audio für den Kern.
- Web-Deploy + Android-Testbuild (EAS).

**Definition of Done:** Personas Lena/Sarah können A0 real durchlernen, auf zwei Geräten nahtlos,
offline nutzbar.

## Phase 2 — Spaß & Immersion (Woche 9–14)

- **Reels-Modus** (TikTok-Feed) inkl. Quiz-Reels, SRS-gespeist, mit sichtbarer Sessionlänge.
- **Bild-Wort-Modus** + Bild-Assets für konkrete Nomen.
- **Schilder-Lese-Modus** mit realistischen Schildern (ohne Niqqud).
- **Lektions-Modus** (geführter Pfad) über die Themen.
- **Content:** Band A1 beginnen (Café, Einkaufen, Essen, Zeit, Verkehr), erste Dialoge.
- Maßnahmen gegen das 4-Wochen-Loch aktiv (zeitversetztes Freischalten, Reaktivierung).

## Phase 3 — Sprechen & Hören (Woche 15–20)

- **Hören & Tippen**, **Satzbau (Wortbank)**, **Lückentext (Cloze)**.
- **Dialog-Modus** (Konversation) mit Rollen + Audio-Antworten.
- **Audio-Kurs** (Pimsleur-Stil, hands-free).
- **Sprechen-Modus** (Ausspracheerkennung, opt-in).
- **Content:** A1 vervollständigen (~600 Wörter kumuliert).

## Phase 4 — Sozial & Politur (Woche 21+)

- **Ligen/Freunde** (opt-in, kooperativ) + Freundes-Ermutigung.
- **Blitz-Modus** (Tages-Quiz).
- Play-Store-Release, App-Store-Assets, Onboarding-Feinschliff.
- **Content:** Band A2 ausbauen; optional Kursive/Handschrift (Schreib-Modus).
- Analytics-Auswertung: schwierige Items, Distraktoren nachschärfen, Modus-Wirksamkeit prüfen
  (Leitplanke Engagement vs. echtes Lernen).

---

## Priorisierte Feature-Liste (verdichtet)

| Feature | Phase | Prio |
|---------|-------|------|
| Content-Schema + HebrewText (RTL/Fade) | 0 | P0 |
| SRS (ts-fsrs) + Session Generator | 0 | P0 |
| Offline-Store | 0 | P0 |
| Karten / MC / Matching / Wisch | 1 | P0 |
| Niqqud-Fade + Tap-to-reveal | 1 | P0 |
| XP + vergebender Streak + Leitmetrik | 1 | P0 |
| Anonyme Auth + Supabase-Sync + Upgrade | 1 | P0 |
| A0-Content + Audio | 1 | P0 |
| Reels-Modus (+ Quiz-Reels) | 2 | P1 |
| Bild-Wort + Schilder-Lesen | 2 | P1 |
| Lektions-Pfad | 2 | P1 |
| Hören/Satzbau/Cloze | 3 | P1 |
| Dialog + Audio-Kurs | 3 | P1/P2 |
| Sprechen (STT) | 3 | P2 |
| Ligen/Freunde + Blitz | 4 | P2 |
| Kursive/Schreiben | 4 | P2 |

---

## Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Falsches Niqqud/Audio blamiert die App | Redaktions-Gate `published` nur nach muttersprachlichem Review |
| Gamification erzeugt Schein-Lernen | XP nur für Abruf, Leitmetrik "gemeisterte Wörter", Analytics-Leitplanke |
| 4-Wochen-Motivationsloch | zeitversetztes Freischalten, sanfte Reaktivierung, Content-Frische |
| RTL-Bugs (gemischte de/he-Zeilen) | zentrale HebrewText-Komponente + Snapshot-Tests |
| Free-Tier-Limits gesprengt | Content synct nicht (nur Fortschritt); Aggregatte cachen |
| Audio-Produktion teuer/langsam | TTS-Fallback für Prototyp, Muttersprachler-Audio schrittweise |
| Scope-Explosion durch viele Modi | generisches Modell → Modi sind dünn; erst 4 Modi im MVP |
