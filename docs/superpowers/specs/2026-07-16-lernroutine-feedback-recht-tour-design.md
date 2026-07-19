# Lernroutine, ehrlichere Mastery, Vokabel-Browser, Feedback, Recht & Tour — Design

Datum: 2026-07-16. Status: Design (zur Freigabe). Ein PR, in klar getrennte Workstreams gegliedert.

## Ziel

Tacheles didaktisch verbessern und um mehrere eigenständige Bausteine ergänzen:
tägliche Routine mit prominenteren Aufgaben und früherem Buchstabenlernen, ehrlichere
„gemeistert"-Logik (inkl. manuellem Veto), ein Vokabel-Browser, ein lokales Feedback-System,
Kontakt/Impressum + Datenschutzerklärung und eine erklärende App-Tour.

## Globale Rahmenbedingungen

- Build-frei: klassische Scripts, kein Modul/Bundler/fetch, läuft per `file://` und über den
  localhost-Starter. Keine neuen Abhängigkeiten.
- Item-IDs sind heilig; Content nur additiv. Neue State-Felder MÜSSEN in `defaultState()` UND als
  **Allowlist** in `normalizeState()` stehen (sonst gehen sie beim Laden/Import verloren).
- Terminologie: **Allowlist/Denylist** (nicht whitelist/blacklist), auch in Kommentaren/Doku;
  bestehende „whitelistet"-Formulierung in `CLAUDE.md` mit anpassen.
- Lokale Daten: alles in `localStorage`; die App überträgt nichts von sich aus.
- Service-Worker-Cache `CACHE_NAME` beim Release hochzählen; neue lade-relevante Dateien in
  `ASSETS` halten.
- Tests: `cd app && node test/regression.cjs` muss grün bleiben und um die neuen Verhalten wachsen;
  zusätzlich `node --check` auf allen JS-Dateien.
- UI-Sprache Deutsch, „du"-Ton; Commits/PR/Issues Englisch.
- Rechtstexte: Laien-Vorlage mit klarem Disclaimer (keine Rechtsberatung).

---

## Workstream 1 — Didaktik-Kern

### 1.1 Ehrlichere Mastery (Erkennen vs. Produzieren, Erstkontakt zählt nicht, härtere Auswahl)

Problem: „gemeistert" wird zu leicht erreicht, weil unmittelbar nach dem Vorstellen mit
offensichtlicher Auswahl abgefragt wird.

- **Aufgaben-Klassifikation.** Zentrale Map `RECALL_KIND[mode/dir]`:
  - *Erkennen* (recognition): MC he→de, Hören, Karte he→de, Reels-Quiz, Wisch, Paare, audio2de.
  - *Produzieren* (production): MC de→he, Satzbau (`build`), Sprechen (`speak`), Karte de→he,
    Grammatik `cloze`/`form`.
- **Mastery-Deckel.** Reines Erkennen hebt `mastery` nur bis **2**. `mastery` **3+** („gemeistert")
  ist nur über eine *Produktions*-Antwort mit Grade `good`/`easy` erreichbar. „Schwer" hebt nie über
  2. „Nochmal" senkt wie bisher.
- **Erstkontakt zählt nicht.** Wird ein neues Wort in der Session frisch vorgestellt
  (`task.introduced`/Intro-Karte), erhöht die *erste* Abfrage desselben Worts in derselben Session
  die Mastery nicht (nur SRS-Planung/XP). Umsetzung über ein Session-Set
  `session.introducedThisSession[itemId]`, das die erste nachfolgende Bewertung neutralisiert.
- **Härtere Auswahl.** MC immer 4 Optionen; Distraktoren aus dem vorhandenen Ähnlichkeits-Scoring
  (mind. genügend plausible Kandidaten). Die Lösung wird unmittelbar vor der Frage nicht mehr als
  Hilfe eingeblendet (Intro und Abfrage sind schon getrennt; sicherstellen, dass kein Renderer die
  Antwort direkt zeigt).
- **Umsetzung.** In `recordAnswer(itemId, mode, grade)` wird die neue Logik gebündelt: Klassifikation
  bestimmen, Erstkontakt-Neutralisierung anwenden, Mastery-Deckel für Erkennen durchsetzen. `rateItem`
  bleibt der SRS-Kern; die Mastery-Anhebung wird dort entsprechend gedeckelt (Parameter „darf über 2").
- Bestehende Abzeichen/Metriken (`masteredCount`, `getMastery>=3`) bleiben unverändert in der
  Bedeutung, werden aber ehrlicher erreicht.

### 1.2 Mastery-Veto & Durchsehen

- **Veto im Moment des Meisterns.** Springt ein Item beim Verbuchen auf `mastery>=3`, zeigt der
  bestehende Gold-Toast zusätzlich „tippen zum Ablehnen". Tippen innerhalb der Toast-Lebensdauer
  ruft `demoteMastery(itemId)`: setzt `mastery` zurück auf 2 (bleibt „in Arbeit"), SRS-Plan bleibt.
- **Durchsehen/rückgängig im Vokabel-Browser (siehe 2):** Filter „nur gemeisterte" + pro Zeile
  „nicht gemeistert" (ruft dieselbe `demoteMastery`).
- **Mastery-Check (Häppchen-Wiederholung des Gemeisterten).** Eigener Einstieg (aus der
  Gemeistert-Übersicht/Vokabel-Browser und ggf. Fortschritt): ein Prüf-Modus **nur über gemeisterte
  Items**, in kurzen Häppchen von einigen Wörtern. Auswahl je Runde so, dass **über die Runden alle
  drankommen**: bevorzugt die am längsten nicht geprüften gemeisterten Items (nach `lastReviewTs`,
  aufsteigend) plus etwas Zufall, damit Rotation nicht statisch ist. Aufgaben wie im normalen Lernen
  (Erkennen/Produzieren). 
  - **Nach jeder Runde** eine Auswahl-Ansicht: die Items der Runde als Liste mit **Checkboxen**;
    falsch beantwortete sind **vorausgewählt**. „Zurücknehmen" ruft `demoteMastery` für die
    angehakten Items (nicht mehr gemeistert), die anderen bleiben. Der Nutzer bestimmt also gezielt,
    welche zurückgestuft werden. „Fertig/Weiter" ohne Auswahl lässt alles gemeistert.
  - Keine neuen persistenten Felder: Rotation über vorhandenes `lastReviewTs`, Auswahl ist transiente
    Runden-UI, Zurückstufen über `demoteMastery`.
- Kein neues persistentes Feld nötig; Demotion wirkt über `srs[itemId].mastery`. Nach Demotion muss
  das Wort regulär (inkl. Produktion, 1.1) neu verdient werden.

### 1.3 Tägliche Routine — „Heute"-Häppchen auf Home

- **Neuer Home-Block ganz oben „Heute"**: 
  - *Buchstabe des Tages* und *Wort des Tages*, deterministisch per Datums-Hash
    (`dayHash(todayStr())`, kein `Math.random`) aus dem **freigeschalteten** Material gewählt; stabil
    über den Tag. Mit 🔊 (`say`) und Bedeutung; Tippen startet ein passendes kurzes Üben.
  - *Häppchen-Knopf*: sehr kurze Mini-Session (3–5 Aufgaben) über den bestehenden Session-Generator
    (`startSession("smart", { size: 5 })` bzw. neue kleine Option). Zählt normal auf SRS/Tagesziel.
- **Aufgaben prominenter.** Home priorisiert oben: Häppchen · Buchstaben-Einstieg · Smart-Session.
  Der bestehende „Weiter lernen"-Themen-Hinweis und die Modi/Themen bleiben darunter.

### 1.4 Buchstaben-Erstpfad („Lesen lernen")

- **Prominenter Home-Einstieg „Lesen lernen"**, sichtbar besonders für Anfänger (z. B. < ~8
  gemeisterte Buchstaben). 
- **Geführte Sequenz** aus vorhandenen Buchstaben-Items: Buchstabe zeigen/hören → ein bekanntes/
  kurzes **Wort, das diesen Buchstaben enthält**, zum „so liest man das"-Aha → kurze Erkennungsfrage.
  Baut auf `alefbet`-Items + bestehenden Buchstaben-Modulen auf (kein neuer großer Engine). Umsetzung
  als eigener geführter Modus/Session-Variante, die Buchstaben und je ein enthaltendes Wort paart.

---

## Workstream 2 — Vokabel-Browser (Settings → „Vokabelliste")

- Eigener Screen, erreichbar aus Settings; Rücksprung ins Profil.
- **Band-Wähler** (A0…C2, nur vorhandene). Es wird immer **ein Band** gerendert (Liste bleibt leicht,
  ~50–150 Zeilen statt 670+).
- **Zeile:** Deutsch · Umschrift · hebräische Schrift (RTL, `lang=he`) · 🔊 (`say(item)`), plus:
  - **Mastery-Status** (klein: neu / in Arbeit / gemeistert) und bei „gemeistert" ein
    **„nicht gemeistert"-Knopf** (→ `demoteMastery`).
  - **„Aussprache falsch"-Schalter** (Toggle) → schreibt/entfernt in `feedback.pronIssues[itemId]`.
- **Filter** „nur gemeisterte" (für das Durchsehen aus 1.2).
- Rein lesend/steuernd; kein neuer Content.

---

## Workstream 3 — Feedback-System

- **State (Allowlist in defaultState + normalizeState):** neues Top-Level `feedback`:
  - `notes`: Array `{ ts, text }` (freie Rückmeldungen).
  - `pronIssues`: Objekt `{ itemId: true }` (als „Aussprache falsch" markierte Wörter).
  - normalizeState: `notes` nur Array von `{ts:number, text:string}`, `pronIssues` Objekt-nicht-Array.
- **Feedback-Hub in Settings:** Freitext erfassen (speichert in `notes`), gesammelte Notizen +
  markierte Aussprache-Wörter anzeigen, einzeln/gesamt löschen.
- **App-weiter Zugang:** dezenter „Feedback"-Link im Footer der Hauptscreens zusätzlich zum
  Settings-Hub (führt in den Hub).
- **Übermitteln (Hauptweg GitHub-Issue):** Knopf öffnet eine vorbefüllte
  `https://github.com/caol-ila/tacheles/issues/new?title=…&body=…`-URL (Body = Freitext-Notizen +
  Liste der Aussprache-Wörter mit he/Umschrift/de). Ehrlicher Hinweis in der UI: GitHub-Issues sind
  **öffentlich** und erfordern GitHub-Login; die App sendet nichts automatisch.
  - **Body-Längslimit:** Prefill-URL auf ~6000 Zeichen begrenzen; bei Überlänge kürzen mit Hinweis.
- **Rückfall mailto:** zusätzlicher Link „per E-Mail senden" =
  `mailto:tacheles@mahlberg.rocks?subject=…&body=…` mit demselben Inhalt (für Nutzer ohne GitHub).
- Übermitteln leert die lokale Sammlung nicht automatisch (Nutzer löscht bewusst).

---

## Workstream 4 — Kontakt/Impressum + Datenschutz

Rein privates, nicht-kommerzielles Projekt → **keine Impressumspflicht**; Name + E-Mail genügen.
Eigene In-App-Screens, erreichbar aus Settings und via Footer-Links.

- **Kontakt / Impressum:** „Tacheles ist ein privates, nicht-kommerzielles Lernprojekt.
  Verantwortlich: Thomas Mahlberg. Kontakt: tacheles@mahlberg.rocks." Kurzer Hinweis, dass bei
  künftiger Kommerzialisierung (Werbung/Spenden/Verkauf) eine ladungsfähige Anschrift nötig würde.
- **Datenschutzerklärung (DSGVO-tauglich, Laien-Vorlage):**
  - Verantwortlicher: Name + E-Mail.
  - **Hosting GitHub Pages:** beim Abruf verarbeitet GitHub (GitHub Inc./Microsoft, USA) technisch
    bedingt Verbindungsdaten inkl. IP-Adresse und Server-Logs; darauf besteht kein Einfluss. Link auf
    GitHubs Datenschutzerklärung; Hinweis auf Drittlandübermittlung (USA).
  - **Keine eigene Datenerhebung:** kein Tracking, keine Cookies, keine Analyse; sämtlicher
    Lernfortschritt ausschließlich lokal im Browser (`localStorage`), verlässt das Gerät nur bei
    ausdrücklichem Export/Sync-Code durch die Nutzerin/den Nutzer.
  - **Mikrofon/Spracherkennung:** nur bei aktiver Nutzung des Sprechen-Modus; die Browser-eigene
    Spracherkennung (Chrome/Edge) sendet Audio an einen Dienst des Browser-Herstellers; Tacheles
    speichert keine Aufnahmen.
  - **Sprachausgabe:** vorproduzierte Audiodateien werden lokal mit der App ausgeliefert (kein
    Abruf bei Dritten zur Laufzeit).
  - **Feedback:** „Übermitteln" öffnet nutzerinitiiert GitHub (öffentliches Issue) bzw. das
    E-Mail-Programm; erst dann verlassen die eingegebenen Inhalte das Gerät.
  - **Rechte** (Auskunft/Löschung etc.) laufen mangels serverseitiger Speicherung faktisch über das
    lokale Zurücksetzen/den Browser; Kontakt genannt.
  - Disclaimer: Vorlage, keine Rechtsberatung, vor scharfem Betrieb prüfen.

---

## Workstream 5 — App-Tour (Erklär-Slideshow)

- **Slideshow** mit wenigen Folien: Home/„Heute"-Häppchen, Lernen/Module & Level, Fortschritt,
  Profil, Audio & Aussprache-Feedback. „du"-Ton, konsistent mit Onboarding-Stil.
- **Skippbar** jederzeit; **neustartbar** über Settings („Einführung ansehen").
- **Neue Nutzer:** beim ersten Start **nach** dem bestehenden Onboarding automatisch einmal.
- **Bestandsnutzer** (nutzen die App schon, `tourSeen` per Migration false): beim nächsten Öffnen
  ein **einmaliger, dezenter Hinweis** „Neu: eine kurze Einführung ist jetzt verfügbar" mit den
  Optionen **„Ansehen"** (startet die Tour) oder **„Überspringen"**. Beide Wege setzen `tourSeen=true`,
  der Hinweis kommt also nur einmal. Die Tour wird niemandem aufgezwungen.
- **State:** `profile.tourSeen` (bool, Allowlist, Default false). KEINE Auto-true-Migration mehr;
  stattdessen der einmalige Hinweis oben. Unterscheidung neu/bestehend: frisch abgeschlossenes
  Onboarding in diesem Lauf → Tour direkt; sonst (`onboarded && !tourSeen`) → Hinweis-Prompt.

---

## State-Schema (Zusammenfassung neuer Felder)

Alle in `defaultState()` und `normalizeState()` (Allowlist):
- `profile.tourSeen: boolean` (Default false). Bestandsnutzer bekommen statt Auto-true einen
  einmaligen Tour-Hinweis (Ansehen/Überspringen), der das Flag setzt.
- `feedback: { notes: [{ts, text}], pronIssues: { itemId: true } }` (neues Top-Level-Objekt).

Keine Änderung an bestehenden Feldern; State-`version` bleibt 1. Merge (`mergeStates`) ergänzen:
`feedback.notes` vereinigen (nach ts), `pronIssues` vereinigen, `tourSeen` per ODER.

## Fehlerbehandlung & Edge-Cases

- Kein Audio-Manifest → 🔊 fällt auf TTS zurück (bestehend).
- „Wort/Buchstabe des Tages" ohne freigeschaltetes Material für ein Kriterium → sinnvoller Fallback
  (nächstniedrigeres Band / vorhandenes Item); nie leer/Absturz.
- GitHub-/mailto-Prefill-Überlänge → kürzen mit Hinweis.
- Vokabel-Browser immer bandweise (Performance).
- Demotion eines nicht-gemeisterten Items ist ein No-Op.
- Datums-Determinismus ohne `Math.random` (Datums-Hash), damit „des Tages" stabil ist.

## Tests (Regression erweitern)

- Mastery: reines Erkennen deckelt bei 2; erst eine Produktionsantwort hebt auf 3; Erstkontakt in
  derselben Session zählt nicht.
- Veto/Demotion: `demoteMastery` setzt 3→2, `masteredCount` sinkt.
- Mastery-Check: Prüf-Modus zieht nur gemeisterte Items in Häppchen (least-recently-checked zuerst);
  Runden-Abschluss zeigt Auswahl mit vorausgewählten Falschen; „Zurücknehmen" stuft genau die
  angehakten zurück, der Rest bleibt gemeistert.
- Home „Heute"-Block vorhanden; Häppchen startet eine (kurze) Session; „Wort/Buchstabe des Tages"
  stabil bei gleichem Datum.
- Buchstaben-Erstpfad startet und paart Buchstabe+Wort.
- Vokabel-Browser: Band-Wähler, Zeileninhalt, 🔊, „nicht gemeistert", „Aussprache falsch"-Toggle
  schreibt `feedback.pronIssues`.
- Feedback: Notiz speichern/anzeigen/löschen; Übermitteln erzeugt gültige GitHub- und mailto-URL
  (Längenlimit greift); `feedback` überlebt Laden/Normalisieren + Merge.
- Kontakt/Impressum + Datenschutz-Screens erreichbar und nicht leer.
- Tour: neue Nutzer bekommen sie nach dem Onboarding; Bestandsnutzer (`onboarded && !tourSeen`)
  sehen den einmaligen Hinweis mit Ansehen/Überspringen (beide setzen `tourSeen`); skippbar; aus
  Settings neustartbar; Hinweis kommt nur einmal.
- 0 Konsolenfehler; `node --check` grün; Abwärtskompatibilität (Alt-State-Check) bleibt grün.

## Non-Goals

- Kein Backend, keine serverseitige Feedback-Sammlung, keine Analyse/Tracking.
- Keine ladungsfähige Anschrift (privat/nicht-kommerziell).
- Kein neuer Audio-Lauf (bestehende Samples bleiben); nur Nutzung im Browser.

## Umsetzungsreihenfolge (ein PR, Workstreams)

Meist `app.js` + `styles.css` (dazu `content.js` unangetastet außer evtl. nichts, `index.html` nur
falls nötig, `sw.js` Cache-Bump, `test/regression.cjs`, neue Doku/Rechtstexte). Da fast alles `app.js`
berührt, serielle Umsetzung in Abschnitten (1→5) mit Test nach jedem Abschnitt; anschließend
Review-Pipeline wie in den vorigen Runden.
