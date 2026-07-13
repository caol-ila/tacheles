# Tacheles 🕎💬

**Die freundliche App, die dich in Rekordzeit zum ersten "Schalom" bringt.**

Tacheles ist eine Web- und Android-App, mit der deutsche Muttersprachler:innen modernes
Hebräisch (Ivrit) lernen. Das Ziel ist bewusst schmal und praktisch: möglichst schnell
**einfache Gespräche führen** und **Alltagsschilder und kurze Texte lesen** können. Nur eine
Sprachrichtung, Deutsch → Hebräisch, kein Ballast.

Diese Spec ist evidenzbasiert. Die didaktischen Entscheidungen sind aus zwei
Deep-Research-Durchläufen abgeleitet (Zweitspracherwerbs-Forschung + Teardown der führenden
Lern-Apps). Alle belegten Kernaussagen mit Quellen stehen in
[docs/01-research-findings.md](docs/01-research-findings.md).

---

## Warum "Tacheles"?

Ein zweisprachiger Wortwitz: Das deutsche Idiom **"Tacheles reden"** (Klartext reden, auf den
Punkt kommen) stammt selbst aus dem **Hebräischen** (תכלית *tachlit*, Zweck/Ziel, über das
Jiddische ins Deutsche gewandert). Ein deutsches Wort, das jede:r kennt, und es kommt genau aus
der Sprache, die man hier lernt. Vor allem passt es zum Ziel der App: endlich reden, ohne
Umschweife, in Rekordzeit zum ersten echten Satz. Reden wir Tacheles.

Der wärmere Arbeitstitel **Schalömchen** (Schalom + Verniedlichung "-chen") lebt als
liebevoller Untertitel und als Begrüßung/Maskottchen-Sprache in der App weiter. Die volle
Namensfindung steht in [docs/00-vision-and-goals.md](docs/00-vision-and-goals.md#namensfindung).

---

## Die Kernidee: einmal pflegen, überall lernen

Das Herz der App ist ein **generisches Inhaltsmodell**. Jedes Wort, jede Wendung, jeder Satz
und jeder Dialog wird genau **einmal** als "Content-Atom" mit allen Metadaten (Hebräisch mit
und ohne Niqqud, Transliteration, Deutsch, Audio, Bild, Wortart, Wurzel, Thema, Häufigkeit)
gepflegt. Jeder Lernmodus ist nur ein **Renderer**, der dieselben Atome anders darstellt:
als Karteikarte, als Swipe-Karte, als TikTok-Reel, als Multiple-Choice-Frage, als Lückentext,
als Hörübung oder als Schild zum Lesen.

Dadurch wächst der Content linear, das Lernerlebnis aber multiplikativ.
Details: [docs/03-content-model.md](docs/03-content-model.md).

---

## Dokumenten-Landkarte

| # | Dokument | Inhalt |
|---|----------|--------|
| — | [README.md](README.md) | Dieses Dokument, Einstieg |
| 00 | [Vision & Ziele](docs/00-vision-and-goals.md) | Zielgruppe, Nicht-Ziele, Erfolgsmetriken, Namensfindung |
| 01 | [Forschungsbasis](docs/01-research-findings.md) | Zitierte Evidenz aus beiden Recherchen |
| 02 | [Didaktik-Modell](docs/02-didactic-model.md) | SRS, Wortschatz-Ziele, Niqqud-Fade, Interleaving-Regel |
| 03 | [Inhaltsmodell](docs/03-content-model.md) | Generisches Content-Atom-Schema, Datenmodell |
| 04 | [Themenbereiche](docs/04-content-themes.md) | Alltagsthemen, Priorisierung, Starter-Inhalte |
| 05 | [Lernmodi](docs/05-learning-modes.md) | Alle Modi inkl. Swipe/TikTok + Modus-Content-Matrix |
| 06 | [Gamification](docs/06-gamification.md) | XP, Streaks, Ligen, Achievements + Anti-Dark-Pattern-Regeln |
| 07 | [Tracking & Sync](docs/07-progress-tracking-sync.md) | Kostenloses geräteübergreifendes Fortschritts-Tracking |
| 08 | [User Stories](docs/08-user-stories.md) | Epics, Stories, Akzeptanzkriterien |
| 09 | [UI/UX-Sketches](docs/09-ui-ux-sketches.md) | Wireframes für alle Screens und Modi |
| 10 | [Architektur](docs/10-architecture-tech-stack.md) | Tech-Stack Web + Android, ein Codebase |
| 11 | [Roadmap & MVP](docs/11-roadmap-mvp.md) | Phasen, MVP-Scope, Meilensteine |
| 12 | [Offene Fragen](docs/12-open-questions.md) | Noch zu treffende Entscheidungen |

---

## TL;DR der wichtigsten Entscheidungen

- **Lernkern:** ein SRS-Scheduler (FSRS-Stil, drei Gedächtnis-Komponenten), der alle Modi speist.
  Belegt: verteiltes Üben hat einen mittel-bis-großen Effekt auf das Zweitsprachenlernen.
- **Wortschatz-Ziel:** kein "10.000 Wörter"-Marathon. Ein kuratierter Hochfrequenz-Kern von rund
  **600–1.000 Wörtern + ~150 Wendungen** deckt den Großteil des Alltags ab (die häufigsten ~1.000
  Wörter decken ~80 % Text / ~85 % gesprochene Sprache).
- **Schrift/Niqqud:** Einstieg mit Niqqud + Transliteration als "Stützräder", die pro Item
  mit steigender Beherrschung **automatisch ausgeblendet** werden. Denn: echte Schilder haben kein
  Niqqud, und geübte Leser:innen lesen ohne. Die Annahme "man muss zwingend mit Niqqud anfangen"
  wurde in der Forschung widerlegt.
- **Spaß-Modi:** Wisch-Modus (Tinder-Stil) und Reels-Modus (TikTok-Feed) sind erste Klasse,
  nicht Deko.
- **Gamification:** ja, aber ehrlich. XP nur für echten Abruf, vergebender Streak, opt-in Ligen,
  keine Schuld-Benachrichtigungen. Kosmetische Gamification ohne echte Mechanik kann sogar schaden.
- **Sync:** anonyme Auth + Cloud-Sync über einen kostenlosen Backend-Tier (Empfehlung: Supabase),
  offline-first. Inhalte werden mit der App ausgeliefert, nur der Fortschritt synct.
- **Tech:** ein TypeScript-Codebase über Expo (React Native + React Native Web) für Android und
  Web. PWA als minimalistische Alternative.

> Schreibstil dieser Spec: bewusst menschlich, keine Gedankenstriche als Stilmittel, klare Sprache.

---

## Datenschutz

Tacheles ist datensparsam gebaut. Alle Lerndaten (Fortschritt, SRS-Zustand, Statistik,
Einstellungen) bleiben ausschließlich im `localStorage` deines Geräts. Es gibt keinen Server,
keine Konten und keine Telemetrie: nichts wird im Hintergrund übertragen.

Die einzige Ausnahme ist der Sprechen-Modus. Die Spracherkennung von Chrome/Edge sendet deine
Sprachaufnahme zur Auswertung an einen Dienst des Browser-Herstellers (meist Google). Tacheles
speichert diese Aufnahme nicht. Vor der allerersten Aufnahme erscheint dazu ein einmaliger
Hinweis, den du bestätigen musst. Ohne Mikrofon kommst du komplett aus: du bewertest dich mit
"Konnte ich" / "Noch nicht" selbst.

Deine Daten trägst du selbst weiter. Über Export/Import (JSON-Datei) oder den Sync-Code nimmst
du den Fortschritt auf ein anderes Gerät mit. Der Sync-Code enthält deinen gesamten
Lernfortschritt und landet in der Zwischenablage: auf Geräten mit Cloud-Zwischenablage
(Windows/Android) kann er dabei mitsynchronisiert werden. Mit "Zurücksetzen" löschst du jederzeit
alles wieder. Damit hast du die volle Kontrolle über deine Daten.

---

## Lizenz

Tacheles steht unter der [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-or-later`).
Nutzung, Veränderung und Weiterverbreitung sind erlaubt, auch als gehosteter Webdienst, sofern
der vollständige Quellcode unter derselben Lizenz offengelegt wird.

App-Code, Inhalte (Vokabeln, Dialoge, Transliteration) und Icon sind Eigenleistung. Die
Sprachausgabe nutzt die browsereigene Web-Speech-API; es werden keine Fremd-Assets gebündelt.
