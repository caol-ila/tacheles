# 07 – Fortschritts-Tracking & Cross-Device-Sync

Ziel: Fortschritt wird getrackt und **geräteübergreifend** synchronisiert, **einfach und
kostenlos**, ohne Registrierungszwang. Das ist eine explizite Anforderung.

## Leitidee: nur Fortschritt synct, Inhalte reisen mit der App

Der Trick, der alles billig und schnell macht:
- **Inhalte** (LernItems, Themen, Dialoge, Audio-Manifeste) werden **mit der App ausgeliefert**
  (gebündeltes, versioniertes JSON + CDN für Medien). Sie sind für alle gleich, ändern sich
  selten und müssen nicht pro Nutzer aus einer Datenbank gelesen werden.
- **Nur der persönliche Fortschritt** wird gesynct: `LearningState` pro Item, `UserProfile`,
  `Gamification`, `ReviewEvent`-Log. Das ist wenig Datenvolumen pro Person.

Dadurch bleiben Reads/Writes klar innerhalb kostenloser Tiers (G1/G2): der teure Teil (Content)
wird gar nicht erst zur DB-Last.

---

## Anonyme Auth + optionales Konto-Upgrade

Der Ablauf, der Registrierungszwang vermeidet und trotzdem Cross-Device kann:

1. **Erststart:** App meldet sich **anonym** an (anonyme UID). Fortschritt synct sofort in die
   Cloud, keine E-Mail, kein Passwort. (Anonymous Auth wird von Supabase und Firebase
   unterstützt, G1/G2.)
2. **Zweites Gerät koppeln / Fortschritt sichern:** Nutzer:in "upgradet" das anonyme Konto durch
   Verknüpfen einer **E-Mail (Magic Link)** oder eines **Google-Logins**. Dieselbe UID bleibt,
   der Fortschritt wandert mit. Ab jetzt kann man sich auf jedem Gerät anmelden.
3. **Wiederherstellung:** Gerät verloren? Mit E-Mail/Google auf neuem Gerät anmelden, Fortschritt
   ist da.

```
Erststart  ->  anonyme UID  ->  [optional] Verknüpfen (E-Mail/Google)  ->  Cross-Device
   |                |                          |
Fortschritt    synct sofort            gleiche UID, gekoppelt
```

UI-seitig: ein dezenter, nicht nerviger Hinweis ("Sichere deinen Fortschritt, damit du ihn nie
verlierst") nach dem ersten echten Erfolg, kein Login-Wall am Anfang.

---

## Offline-first + Sync-Strategie

Sprachenlernen passiert oft offline (Flugzeug, U-Bahn, Ausland ohne Datenroaming). Deshalb:

- **Lokaler Store als Wahrheit zur Laufzeit:**
  - Web: **IndexedDB** (z. B. via Dexie oder RxDB).
  - Android (Expo/React Native): **SQLite** (expo-sqlite) oder WatermelonDB/RxDB.
- **Alle Lern-Interaktionen schreiben zuerst lokal** und sofort in die UI. Kein Warten aufs Netz.
- **Hintergrund-Sync** gleicht lokalen Store und Cloud ab, wenn Netz da ist (beim Start, nach
  Session-Ende, periodisch).

### Konfliktauflösung
- `LearningState` und Profil: **Last-Write-Wins** anhand `updated_at`. Für SRS-Zustände ist das
  robust genug (der neuere Review-Stand gewinnt).
- `ReviewEvent`: **append-only** Log (idempotent über `(user_id, item_id, ts)`), nie überschreiben.
  Der SRS-Zustand kann im Zweifel aus dem Event-Log neu berechnet werden (Wahrheit rekonstruierbar).
- `xp_total`, `mastered_count`: als **abgeleitete Caches** behandeln, im Zweifel aus dem
  Event-Log/State neu berechnen, statt blind Zahlen zu addieren (verhindert Doppelzählung bei Sync).

---

## Backend-Wahl

### Empfehlung: **Supabase** (Free Tier)
- Gehostetes **Postgres** passt exakt zum relationalen Modell (User, State, Events).
- **Anonyme Anmeldung** + E-Mail/OAuth-Verknüpfung eingebaut.
- **Row Level Security:** jede:r sieht nur die eigenen Zeilen (`user_id = auth.uid()`).
- **Realtime** für optionale soziale Features (Freundes-Ermutigung).
- Für echtes Offline-Sync optional **PowerSync** oder **RxDB**-Replikation obendrauf (G4).

**Skizze der Tabellen (RLS: `user_id = auth.uid()`):**
```sql
learning_state(user_id, item_id, stability, difficulty, due_at, last_review_at,
               reps, lapses, state, mastery_level, niqqud_visible, translit_visible,
               updated_at)   PRIMARY KEY (user_id, item_id)

user_profile(user_id PK, display_name, daily_goal_minutes, settings jsonb, updated_at)

gamification(user_id PK, xp_total, streak_days, streak_freezes, last_active_day,
             achievements text[], league_opt_in, updated_at)

review_event(user_id, item_id, mode, rating, correct, response_ms, ts)
             PRIMARY KEY (user_id, item_id, ts)   -- append-only, idempotent
```

### Alternative: **Firebase** (Spark Free)
- Firestore + Anonymous Auth + eingebaute Offline-Persistenz + Realtime-Sync out of the box.
- Free-Tier-Budget: 1 GiB, 50k Reads / 20k Writes pro Tag (G1). Für unser "nur Fortschritt
  synct"-Modell großzügig. Sehr geringer Setup-Aufwand für den Sync-Teil.
- Nachteil: dokumentenbasiert, Modell relational weniger sauber; Vendor-Lock stärker.

### Alternative: **PocketBase** (self-hosted, kostenlos)
- Ein Go-Binary, SQLite, Auth, Realtime, Files. Volle Datenhoheit, kostenlos, aber man hostet und
  wartet selbst (kleiner VPS). Gut, wenn Unabhängigkeit von Cloud-Anbietern wichtig ist.

**Entscheidung:** Supabase als Primär-Backend (bestes Verhältnis aus relationaler Sauberkeit,
kostenloser Anonymous-Auth und Offline-Optionen). Firebase als schnellster Prototyp-Weg.

---

## Was genau getrackt wird

**Für das Lernen (Kern):**
- Pro Item: SRS-Zustand, mastery_level, Fälligkeit, Fade-Flags.
- Aggregate: gemeisterte Wörter gesamt / pro Thema / pro Band; Trefferquote fälliger Reviews.

**Für Motivation (Gamification, siehe 06):**
- XP (gesamt/heute), Streak, Streak-Freezes, Achievements, Tagesziel.

**Für Analytics & Verbesserung (anonymisiert, aggregierbar):**
- `ReviewEvent`-Log: welcher Modus, richtig/falsch, Reaktionszeit. Erlaubt später, schwierige
  Items zu erkennen, Distraktoren zu verbessern und die Modus-Wirksamkeit zu messen (Leitplanke
  "Engagement vs. echtes Lernen" aus [Vision](00-vision-and-goals.md#erfolgsmetriken)).

**Datenschutz:** minimal. Anonyme UID reicht für die Kernfunktion. E-Mail nur bei freiwilligem
Upgrade. Kein Tracking Dritter, keine Werbe-IDs. DSGVO-freundlich: Export und Löschung des
eigenen Fortschritts möglich (ein Knopf im Profil).
