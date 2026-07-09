# 12 – Offene Fragen & Entscheidungen

Bewusst offen gelassen, weil sie eine Produkt- oder Ressourcen-Entscheidung von dir brauchen.
Getroffene Entscheidungen stehen jeweils direkt in den relevanten Dokumenten, nicht hier.

## Produkt & Scope

- **Q1 App vs. PWA zuerst?** Empfehlung: Expo (echte Android-App + Web). Falls Time-to-First-User
  wichtiger ist als Store-Präsenz, zuerst PWA. → Entscheidung nötig vor Phase 0.
- **Q2 Biblisches Hebräisch je relevant?** Aktuell hart ausgeschlossen (nur modernes Ivrit). Falls
  Zielgruppe religiös motiviert, könnte ein optionales "Lese-Pack" (Niqqud bleibt an, andere
  Wortliste) später sinnvoll sein. Das generische Modell trägt das ohne Umbau.
- **Q3 Wie viel Grammatik explizit?** Aktuell: Grammatik implizit über Chunks/Sätze, minimal
  explizit. Frage: brauchen Nutzer:innen kurze Grammatik-Erklärkarten (Genus, Verbgegenwart)?

## Inhalt & Sprache

- **Q4 Muttersprachler-Audio:** Wer spricht ein? (Freund:in, bezahlte Sprecher:in, TTS-Start).
  Männlich/weiblich beide, wegen Genus-abhängiger Formen (z. B. "ma shlomcha/shlomech")?
- **Q5 Transliterations-Standard:** deutschfreundlich (ch = כ/ח wie "Bach", tsch, sch)? Konsistenz
  ist wichtiger als Perfektion. Vorschlag: eigene, einfache DE-Umschrift, dokumentiert.
- **Q6 Hebräische Frequenzliste:** Woher der `frequency_rank`? Es gibt hebräische
  Frequenzkorpora; für den Start reicht eine kuratierte Alltags-Liste, verfeinert über die
  eigenen `ReviewEvent`-Daten.
- **Q7 Umgang mit Genus/Formen:** Wörter mit m/f-Formen als ein Item mit Varianten oder zwei
  Items? Vorschlag: ein Item, Formen als Felder; der Renderer wählt je nach Kontext.

## Technik

- **Q8 RxDB vs. handgerollter Sync:** RxDB/PowerSync geben Offline-Sync fertig, aber mehr
  Abhängigkeit. Für MVP evtl. schlanke eigene LWW-Queue reichen. → messen, dann entscheiden.
- **Q9 Backend endgültig:** Supabase (empfohlen) vs. Firebase (schnellster Sync-Start) vs.
  PocketBase (Datenhoheit). Bei > Free-Tier-Wachstum Kostenmodell prüfen.
- **Q10 Speech-to-Text-Qualität für Hebräisch:** Web Speech API / Geräte-STT für Hebräisch testen;
  Fallback, wenn Erkennung zu schwach (dann Sprechen-Modus ohne harte Bewertung).

## Didaktik (bewusst als Hypothesen markiert)

- **Q11 Ziel-Retention des SRS:** Default 90 %. Später per A/B justieren (höhere Retention =
  mehr Reviews, langsamerer Neu-Zufluss).
- **Q12 Fade-Schwellen:** mastery 2 = Transliteration weg, 3 = Niqqud weg. Diese Grenzen sind
  eine begründete Setzung (siehe Didaktik C-Befunde), aber empirisch zu validieren.
- **Q13 Interleaving-Feinjustierung:** Wir blocken bei Einführung, mischen im Review (Beleg B4:
  Blocken gewinnt bei Wörtern). Beim Ausbau messen, ob leichtes Interleaving verwandter Themen
  im Review hilft oder schadet.

## Reichweite / Business (nicht MVP)

- **Q14 Monetarisierung:** Aktuell 0-EUR-Betrieb geplant. Später optional: Spenden, einmaliger
  "Content-Pack"-Kauf, kein Abo-Zwang, keine Werbung (passt zur Anti-Dark-Pattern-Haltung).
- **Q15 Community-Content:** dürfen Nutzer:innen später eigene Wortlisten/Reels beisteuern?
  Das generische Modell erlaubt es; Qualitätssicherung wäre die Frage.

---

## Nächster konkreter Schritt

Wenn du grünes Licht gibst, ist der sinnvollste erste Schritt **Phase 0** aus
[11-roadmap-mvp.md](11-roadmap-mvp.md): Repo + Expo + Content-Schema + `HebrewText`-Komponente +
`ts-fsrs`, dann die ersten ~40 A0-Items einpflegen und einen Item-Durchlauf (Exposition → Review)
lauffähig machen. Ich kann das Grundgerüst direkt anlegen, sobald Q1 (Expo vs. PWA) und Q9
(Backend) entschieden sind.
