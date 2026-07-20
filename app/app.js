/* ============================================================
 * Tacheles – App-Logik
 * Klassisches Script, kein Modul, kein fetch, keine externen
 * Abhaengigkeiten. Laeuft per Doppelklick auf index.html (file://)
 * oder via Tacheles-starten.cmd (localhost, PWA + Mikrofon-Merken).
 *
 * Aufbau:
 *   1.  Kleine Helfer (DOM, Zufall, Datum, Toast)
 *   2.  Content-Zugriff
 *   3.  Persistenter Zustand (localStorage, Export/Import)
 *   4.  Tageslog, Tagesziel, Streak (+ ❄️ Streak-Freezes)
 *   5.  SRS-Scheduler (SM-2-artig)
 *   6.  XP, Abzeichen & zentrale Antwort-Verbuchung
 *   7.  Sprachausgabe (TTS, de+he, speakSeq/speakSlow) & Spracherkennung (STT)
 *   8.  Niqqud-/Transliterations-Fade & Hebraeisch-Rendering (+ Pruefungs-Haerte)
 *   9.  Session-Generator (Themen-/Item-Filter, Smart-Mix)
 *   10. Screens: Home (Weiter-lernen, Heute) / Lernen (Pfad) /
 *       Fortschritt (Survival-Check, Knacknuesse, Alef-Bet-Tafel, 14 Tage) / Profil
 *   11. Task-Modi: Karten, MC, Hoeren, Sprechen, Schilder, Satzbau, Bilder
 *   12. Gruppen-Modi: Paare, Wisch (Pfeiltasten), Reels (Chooser),
 *       Dialog (8 Gespraeche), Audio-Kurs (hands-free), Blitz (60s), Exam
 *   13. Abschluss-Screen (Rueckblick), Alef-Bet-Tafel, Onboarding, Init
 *   14. Band-System (A0..C2), Level-Gating & Auto-Aufstieg
 *   15. Einstufungstest (Placement, eigenstaendiger Screen-Fluss)
 *   16. Module-Runner (gefuehrte Mini-Lektionen: explain/teach/quiz/pairquiz)
 *   17. Sync: Merge-Import, Sync-Code (Base64), Import-Overlay
 * ============================================================ */
(function () {
  "use strict";

  /* ==========================================================
   * 1. Kleine Helfer
   * ========================================================== */

  var DAY_MS = 24 * 60 * 60 * 1000;

  function $(sel) { return document.querySelector(sel); }

  /** Erzeugt ein Element mit Klasse und optionalem Textinhalt. */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function btn(label, cls, onClick) {
    var b = el("button", cls, label);
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  /** HTML-Escape fuer Template-Strings. */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function randInt(n) { return Math.floor(Math.random() * n); }

  /** Fisher-Yates, mischt in-place und gibt das Array zurueck. */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Lokales Datum als YYYY-MM-DD (bewusst nicht toISOString wegen Zeitzone). */
  function dateStr(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function todayStr() { return dateStr(new Date()); }

  /** Deterministischer Tages-Hash ("des Tages"-Auswahl): stabil ueber den Tag,
   *  lokales Datum via dateStr()/todayStr(), niemals Math.random. */
  function dayHash(s) { return fnv1a(s); }

  // Gleichzeitige Toasts (z. B. Abzeichen + Level-Up) sollen sich nicht
  // ueberlappen: jeder neue Toast wird um die Zahl lebender Toasts nach oben
  // versetzt. Beim Entfernen aus der Liste austragen.
  var liveToasts = [];
  /** Toast; optionales onTap macht ihn antippbar (z. B. Mastery-Veto). */
  function toast(msg, cls, onTap) {
    var t = el("div", "toast" + (cls ? " " + cls : ""), msg);
    t.style.bottom = (90 + liveToasts.length * 54) + "px";
    liveToasts.push(t);
    var dismiss = function () {
      var idx = liveToasts.indexOf(t);
      if (idx >= 0) liveToasts.splice(idx, 1);
      t.remove();
    };
    if (onTap) {
      t.classList.add("tappable");
      t.setAttribute("role", "button");
      t.setAttribute("tabindex", "0");
      var fire = function () { onTap(); dismiss(); };
      t.addEventListener("click", fire);
      t.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); fire(); }
      });
    }
    document.body.appendChild(t);
    // Antippbare Toasts leben laenger (~6 s), damit man sie in Ruhe treffen kann.
    setTimeout(dismiss, onTap ? 6000 : (cls === "gold" ? 3600 : 2600));
  }

  /* ==========================================================
   * 2. Content-Zugriff
   * ========================================================== */

  var CONTENT = window.TACHELES_CONTENT || null;

  // Neue Content-Globals (Kurs-Runde). Alle optional: fehlt eines, blendet sich
  // das zugehoerige Feature aus (defensiv wie TACHELES_GRAMMAR).
  var COURSE = (window.TACHELES_COURSE && Array.isArray(window.TACHELES_COURSE.lessons)) ? window.TACHELES_COURSE : null;
  var SNACKS = (window.TACHELES_SNACKS && Array.isArray(window.TACHELES_SNACKS.snacks)) ? window.TACHELES_SNACKS : null;
  var READING = (window.TACHELES_READING && typeof window.TACHELES_READING.syllabify === "function") ? window.TACHELES_READING : null;

  function courseAvailable() { return !!(COURSE && COURSE.lessons.length); }
  function lessonById(id) {
    if (!COURSE) return null;
    for (var i = 0; i < COURSE.lessons.length; i++) if (COURSE.lessons[i].id === id) return COURSE.lessons[i];
    return null;
  }
  function lessonIndex(id) {
    if (!COURSE) return -1;
    for (var i = 0; i < COURSE.lessons.length; i++) if (COURSE.lessons[i].id === id) return i;
    return -1;
  }

  function itemById(id) {
    if (!CONTENT) return null;
    for (var i = 0; i < CONTENT.items.length; i++) {
      if (CONTENT.items[i].id === id) return CONTENT.items[i];
    }
    return null;
  }

  function themeById(id) {
    if (!CONTENT) return null;
    for (var i = 0; i < CONTENT.themes.length; i++) {
      if (CONTENT.themes[i].id === id) return CONTENT.themes[i];
    }
    return null;
  }

  function moduleById(id) {
    var mods = (CONTENT && CONTENT.modules) || [];
    for (var i = 0; i < mods.length; i++) if (mods[i].id === id) return mods[i];
    return null;
  }

  /* Grammatik-Module aus der separaten grammar.js (eigenes Global) additiv in
   * CONTENT.modules mergen. Defensiv: fehlendes Global ist ok; Module mit schon
   * vorhandener ID werden uebersprungen (die aus content.js gewinnt); kaputte
   * Eintraege (ohne id) werden ignoriert. */
  function mergeGrammarModules() {
    if (!CONTENT) return;
    var G = window.TACHELES_GRAMMAR;
    if (!G || !Array.isArray(G.modules)) return;
    if (!Array.isArray(CONTENT.modules)) CONTENT.modules = [];
    var have = {};
    CONTENT.modules.forEach(function (m) { if (m && m.id) have[m.id] = true; });
    G.modules.forEach(function (m) {
      if (!m || !m.id || have[m.id]) return;
      have[m.id] = true;
      CONTENT.modules.push(m);
    });
  }

  /* Level-Baender (Reihenfolge zaehlt). Themen tragen ein `band`; Items erben
   * das Band ihres Themas. Fehlt ein Band (z. B. altes/fremdes Content), gilt
   * defensiv "A0" (immer offen). */
  var BANDS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
  var LEVEL_CAPS = ["auto"].concat(BANDS); // abgeleitet: 'auto' + alle Baender
  function bandIndex(b) { var i = BANDS.indexOf(b); return i < 0 ? 0 : i; }
  function themeBand(theme) { return (theme && BANDS.indexOf(theme.band) >= 0) ? theme.band : "A0"; }
  function itemBand(item) { return themeBand(themeById(item.theme)); }

  /* ==========================================================
   * 3. Persistenter Zustand
   * ========================================================== */

  var STORAGE_KEY = "tacheles_state_v1";
  var state = null;

  function defaultState() {
    return {
      version: 1,
      profile: {
        dailyGoalMin: 5,        // 5 / 10 / 15 / 20
        fadeMode: "auto",       // 'auto' | 'off_early' | 'keep'
        autoplay: true,         // Audio automatisch abspielen (Reels/Karten)
        micHintDismissed: false,// Hinweis zum Mikrofon auf file:// wurde weggeklickt
        sttNoticeConfirmed: false, // Cloud-Hinweis vor der ERSTEN Sprachaufnahme bestaetigt?
        onboarded: false,       // Willkommens-Tour beim ersten Start gezeigt?
        levelCap: "auto",       // 'auto' | 'A0'..'C2' — manuelle Level-Grenze
        unlockedBand: "A1",     // hoechstes ERREICHTES Band (Default A1 = A0+A1 offen)
        placementDone: false,   // Einstufungstest schon einmal gemacht?
        tourSeen: false,        // App-Tour (Erklaer-Slideshow) gesehen/uebersprungen?
        snackVocab: true        // Heute-Haeppchen: 2-3 faellige Vokabeln anhaengen
      },
      gamification: {
        xpTotal: 0,
        streakDays: 0,
        lastActiveDay: null,
        masteredCount: 0,
        achievements: [],       // erreichte Abzeichen-IDs
        frozenDays: {},         // { 'YYYY-MM-DD': true } durch Streak-Freeze gerettete Tage
        answersTotal: 0,        // alle Abruf-Antworten (fuer Backup-Erinnerung)
        counters: {             // Zaehler fuer Modus-Abzeichen
          bestBlitz: 0,         // beste Blitz-Runde (richtige Antworten)
          bestExam: 0,          // bestes Survival-Check-Ergebnis (von 12)
          sessionsDone: 0,      // abgeschlossene Sessions (fuer die Erste-Runde-Feier)
          dialogsDone: {},      // { dialogId: true } abgeschlossene Dialoge
          modulesDone: {}       // { moduleId: true } abgeschlossene Module
        }
      },
      // Lokales Feedback: freie Notizen + als "Aussprache falsch" markierte Items.
      // Verlaesst das Geraet nur nutzerinitiiert (GitHub-Issue-Prefill / mailto).
      feedback: {
        notes: [],       // [{ ts, text }]
        pronIssues: {}   // { itemId: true }
      },
      // Kurs-Fortschritt: orchestriert das SRS, ersetzt es nicht.
      course: {
        lessons: {},   // { lessonId: { done: bool, step: int } }
        entry: null,   // bestaetigter Quereinstieg (Lektions-ID)
        snacksSeen: {} // { snackId: true } fuer die Heute-Rotation
      },
      // pro Item: { ease, intervalDays, dueTs, reps, lapses, mastery, lastReviewTs }
      srs: {},
      // pro Tag (YYYY-MM-DD): { answers, correct, xp, goalMet }
      log: {}
    };
  }

  /** Fremde/alte Daten defensiv in die aktuelle Struktur ueberfuehren
   *  (Allowlist: nur bekannte Felder mit gueltigen Typen werden uebernommen). */
  function normalizeState(raw) {
    var s = defaultState();
    if (!raw || typeof raw !== "object") return s;
    if (raw.profile && typeof raw.profile === "object") {
      if ([5, 10, 15, 20].indexOf(raw.profile.dailyGoalMin) >= 0) s.profile.dailyGoalMin = raw.profile.dailyGoalMin;
      if (["auto", "off_early", "keep"].indexOf(raw.profile.fadeMode) >= 0) s.profile.fadeMode = raw.profile.fadeMode;
      if (typeof raw.profile.autoplay === "boolean") s.profile.autoplay = raw.profile.autoplay;
      if (typeof raw.profile.micHintDismissed === "boolean") s.profile.micHintDismissed = raw.profile.micHintDismissed;
      if (typeof raw.profile.sttNoticeConfirmed === "boolean") s.profile.sttNoticeConfirmed = raw.profile.sttNoticeConfirmed;
      if (typeof raw.profile.onboarded === "boolean") s.profile.onboarded = raw.profile.onboarded;
      if (LEVEL_CAPS.indexOf(raw.profile.levelCap) >= 0) s.profile.levelCap = raw.profile.levelCap;
      if (BANDS.indexOf(raw.profile.unlockedBand) >= 0) s.profile.unlockedBand = raw.profile.unlockedBand;
      if (typeof raw.profile.placementDone === "boolean") s.profile.placementDone = raw.profile.placementDone;
      if (typeof raw.profile.tourSeen === "boolean") s.profile.tourSeen = raw.profile.tourSeen;
      if (typeof raw.profile.snackVocab === "boolean") s.profile.snackVocab = raw.profile.snackVocab;
    }
    // Migration: wer schon Lernfortschritt hat (State von vor dem Onboarding-
    // Feature), soll die Willkommens-Tour nicht erneut durchlaufen.
    if (!s.profile.onboarded && raw.srs && typeof raw.srs === "object" && Object.keys(raw.srs).length > 0) {
      s.profile.onboarded = true;
    }
    // Alle Zaehler defensiv auf >= 0 klammern (fremde/kaputte Importe koennen
    // negative oder unsinnige Werte enthalten).
    var nn = function (x) { return Math.max(0, Number(x) || 0); };
    if (raw.gamification && typeof raw.gamification === "object") {
      s.gamification.xpTotal = nn(raw.gamification.xpTotal);
      s.gamification.lastActiveDay = raw.gamification.lastActiveDay || null;
      if (Array.isArray(raw.gamification.achievements)) {
        s.gamification.achievements = raw.gamification.achievements.filter(function (x) { return typeof x === "string"; });
      }
      if (raw.gamification.frozenDays && typeof raw.gamification.frozenDays === "object" && !Array.isArray(raw.gamification.frozenDays)) {
        s.gamification.frozenDays = raw.gamification.frozenDays;
      }
      s.gamification.answersTotal = nn(raw.gamification.answersTotal);
      var rc = raw.gamification.counters;
      if (rc && typeof rc === "object") {
        s.gamification.counters.bestBlitz = nn(rc.bestBlitz);
        s.gamification.counters.bestExam = nn(rc.bestExam);
        s.gamification.counters.sessionsDone = nn(rc.sessionsDone);
        if (rc.dialogsDone && typeof rc.dialogsDone === "object" && !Array.isArray(rc.dialogsDone)) {
          s.gamification.counters.dialogsDone = rc.dialogsDone;
        }
        if (rc.modulesDone && typeof rc.modulesDone === "object" && !Array.isArray(rc.modulesDone)) {
          s.gamification.counters.modulesDone = rc.modulesDone;
        }
      }
    }
    // srs: pro Item nur echte Objekte uebernehmen und Feld fuer Feld sauber
    // rekonstruieren (Number-Coercion, Defaults, Clamping). So kann ein
    // korrupter Eintrag wie srs:{shalom:5} den Scheduler nicht zum Absturz bringen.
    if (raw.srs && typeof raw.srs === "object" && !Array.isArray(raw.srs)) {
      Object.keys(raw.srs).forEach(function (id) {
        var e = raw.srs[id];
        if (!e || typeof e !== "object" || Array.isArray(e)) return; // z. B. srs.shalom = 5 -> verworfen
        s.srs[id] = {
          ease: Math.max(1.3, Number(e.ease) || 2.5),
          intervalDays: Math.max(0, Number(e.intervalDays) || 0),
          dueTs: Math.max(0, Number(e.dueTs) || 0),
          reps: Math.max(0, Number(e.reps) || 0),
          lapses: Math.max(0, Number(e.lapses) || 0),
          mastery: clamp(Number(e.mastery) || 0, 0, 5),
          lastReviewTs: Math.max(0, Number(e.lastReviewTs) || 0)
        };
      });
    }
    // log: pro Tag nur echte Objekte, Zahlenfelder >= 0, goalMet boolean.
    if (raw.log && typeof raw.log === "object" && !Array.isArray(raw.log)) {
      Object.keys(raw.log).forEach(function (day) {
        var d = raw.log[day];
        if (!d || typeof d !== "object" || Array.isArray(d)) return; // z. B. log["..."] = 3 -> verworfen
        var entry = {
          answers: nn(d.answers),
          correct: nn(d.correct),
          xp: nn(d.xp),
          goalMet: !!d.goalMet
        };
        if (d.mastered !== undefined) entry.mastered = nn(d.mastered);
        s.log[day] = entry;
      });
    }
    // feedback (Allowlist): notes nur als Array sauberer {ts,text}-Objekte
    // (Text gekappt, damit kein Import den State aufblaeht), pronIssues nur
    // als Objekt-nicht-Array mit true-Werten.
    if (raw.feedback && typeof raw.feedback === "object" && !Array.isArray(raw.feedback)) {
      if (Array.isArray(raw.feedback.notes)) {
        raw.feedback.notes.forEach(function (n) {
          if (!n || typeof n !== "object" || Array.isArray(n)) return;
          var text = typeof n.text === "string" ? n.text.slice(0, 2000) : "";
          if (!text) return;
          s.feedback.notes.push({ ts: Math.max(0, Number(n.ts) || 0), text: text });
        });
      }
      var rp = raw.feedback.pronIssues;
      if (rp && typeof rp === "object" && !Array.isArray(rp)) {
        Object.keys(rp).forEach(function (id) { if (rp[id]) s.feedback.pronIssues[id] = true; });
      }
    }
    // course (Allowlist): lessons nur als Objekt sauberer {done,step}-Eintraege,
    // entry nur als String, snacksSeen nur Objekt-nicht-Array mit true-Werten.
    if (raw.course && typeof raw.course === "object" && !Array.isArray(raw.course)) {
      var rl = raw.course.lessons;
      if (rl && typeof rl === "object" && !Array.isArray(rl)) {
        Object.keys(rl).forEach(function (id) {
          var e = rl[id];
          if (!e || typeof e !== "object" || Array.isArray(e)) return;
          s.course.lessons[id] = {
            done: !!e.done,
            step: Math.max(0, Math.round(Number(e.step) || 0))
          };
        });
      }
      if (typeof raw.course.entry === "string" && raw.course.entry) s.course.entry = raw.course.entry;
      var rsn = raw.course.snacksSeen;
      if (rsn && typeof rsn === "object" && !Array.isArray(rsn)) {
        Object.keys(rsn).forEach(function (id) { if (rsn[id]) s.course.snacksSeen[id] = true; });
      }
    }
    return s;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch (e) {
      state = defaultState();
    }
    updateMasteredCount();
    state.gamification.streakDays = recomputeStreak();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // z. B. Speicher voll / Privatmodus: App laeuft weiter, nur ohne Persistenz.
    }
  }

  /** Export: State als JSON-Datei herunterladen (funktioniert auf file://). */
  function exportState() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tacheles-fortschritt-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast("Fortschritt exportiert 📤");
  }

  /** Import: JSON-Datei einlesen, grob validieren, State ersetzen. */
  function importState() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      // Groessenlimit: ein echter Export bleibt weit unter 1 MB. Grosse Dateien
      // gar nicht erst einlesen (DoS-/Fehlbedienungs-Schutz).
      if (file.size > 1000000) { toast("Datei ist zu groß für einen Tacheles-Export."); return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(String(reader.result));
          if (!obj || typeof obj !== "object" || obj.version !== 1 || !obj.srs || typeof obj.srs !== "object") {
            toast("Das sieht nicht wie ein Tacheles-Export aus.");
            return;
          }
          if (Object.keys(obj.srs).length > 10000) { toast("Das sieht nicht wie ein Tacheles-Export aus."); return; }
          showImportChoice(obj, function (mode) { applyImportedState(obj, mode); });
        } catch (e) {
          toast("Datei konnte nicht gelesen werden.");
        }
      };
      reader.onerror = function () { toast("Datei konnte nicht gelesen werden."); };
      reader.readAsText(file);
    });
    input.click();
  }

  function resetProgress() {
    if (!confirm("Wirklich den GESAMTEN Fortschritt löschen? Das kann nicht rückgängig gemacht werden.")) return;
    state = defaultState();
    saveState();
    renderOnboarding(1); // frischer Start = wieder Willkommens-Tour
    toast("Fortschritt zurückgesetzt.");
  }

  /* 3b. Kurs-Zustand */

  /** Kurs-Fortschritt eines einzelnen Eintrags (immer ein frisches Default-Objekt). */
  function lessonState(id) {
    var e = state.course.lessons[id];
    if (!e || typeof e !== "object") return { done: false, step: 0 };
    return { done: !!e.done, step: e.step || 0 };
  }
  function setLessonStep(id, step) {
    var e = state.course.lessons[id] || (state.course.lessons[id] = { done: false, step: 0 });
    e.step = Math.max(0, step | 0);
    saveState();
  }
  function markLessonDone(id) {
    var e = state.course.lessons[id] || (state.course.lessons[id] = { done: false, step: 0 });
    e.done = true;
    e.step = 0; // erledigt: Resume-Zeiger zuruecksetzen (erneut spielen startet vorn)
    saveState();
  }

  /** Ueberspringbar (Quereinstieg): >= 60 % der newItemIds mit Mastery >= 2. */
  function lessonSkippable(lesson) {
    var ids = lesson.newItemIds || [];
    if (!ids.length) return false;
    var known = 0;
    ids.forEach(function (id) { if (getMastery(id) >= 2) known++; });
    return known / ids.length >= 0.6;
  }

  /** Empfohlener Einstieg: erste NICHT ueberspringbare Lektion (sonst die letzte). */
  function recommendedEntryLesson() {
    if (!courseAvailable()) return null;
    for (var i = 0; i < COURSE.lessons.length; i++) {
      if (!lessonSkippable(COURSE.lessons[i])) return COURSE.lessons[i];
    }
    return COURSE.lessons[COURSE.lessons.length - 1];
  }

  /** Linear frei: Lektion 0, alles Erledigte, und die Lektion NACH einer erledigten. */
  function lessonUnlocked(i) {
    if (!courseAvailable() || i < 0 || i >= COURSE.lessons.length) return false;
    if (i === 0) return true;
    if (lessonState(COURSE.lessons[i].id).done) return true;
    return lessonState(COURSE.lessons[i - 1].id).done;
  }

  /** "Deine Lektion": erste offene, nicht erledigte (Weiterlernen-Ziel). */
  function nextLesson() {
    if (!courseAvailable()) return null;
    for (var i = 0; i < COURSE.lessons.length; i++) {
      if (lessonUnlocked(i) && !lessonState(COURSE.lessons[i].id).done) return COURSE.lessons[i];
    }
    return null;
  }

  /** Quereinstieg bestaetigen: alle Lektionen VOR entry als erledigt markieren. */
  function confirmEntry(lessonId) {
    var idx = lessonIndex(lessonId);
    if (idx < 0) return;
    for (var i = 0; i < idx; i++) {
      var e = state.course.lessons[COURSE.lessons[i].id] ||
        (state.course.lessons[COURSE.lessons[i].id] = { done: false, step: 0 });
      e.done = true;
    }
    state.course.entry = lessonId;
    saveState();
  }

  /* ==========================================================
   * 4. Tageslog, Tagesziel, Streak
   * ========================================================== */

  /** Tagesziel in "Antworten": grob 8 Abruf-Ereignisse pro Minute Ziel. */
  function goalItems() { return state.profile.dailyGoalMin * 8; }

  function ensureDay(key) {
    var d = state.log[key];
    if (!d) { d = { answers: 0, correct: 0, xp: 0, goalMet: false }; state.log[key] = d; }
    return d;
  }

  function todayLog() { return state.log[todayStr()] || { answers: 0, correct: 0, xp: 0, goalMet: false }; }

  /**
   * Streak-Freezes: Vorrat = 2 + 1 je 7 erreichte Tagesziele, minus verbrauchte.
   * Ein Freeze rettet genau EINEN verpassten Tag zwischen zwei aktiven Tagen.
   */
  function freezesAvailable() {
    var met = 0;
    Object.keys(state.log).forEach(function (k) { if (state.log[k].goalMet) met++; });
    var used = Object.keys(state.gamification.frozenDays || {}).length;
    return Math.max(0, 2 + Math.floor(met / 7) - used);
  }

  /** Streak = zusammenhaengende Tage mit erreichtem Tagesziel (heute zaehlt, wenn erreicht).
   *  Einzelne Luecken werden automatisch durch einen Streak-Freeze ueberbrueckt (❄️). */
  function recomputeStreak() {
    var streak = 0;
    var d = new Date();
    if (!((state.log[dateStr(d)] || {}).goalMet)) d.setDate(d.getDate() - 1);
    var frozen = state.gamification.frozenDays || (state.gamification.frozenDays = {});
    while (streak < 3650) {
      var k = dateStr(d);
      if ((state.log[k] || {}).goalMet) { streak++; d.setDate(d.getDate() - 1); continue; }
      if (frozen[k]) { d.setDate(d.getDate() - 1); continue; } // bereits gerettet, zaehlt nicht, bricht nicht
      // Luecke: retten, wenn ein Freeze da ist UND davor ein aktiver Tag liegt (echter Streak-Schutz)
      var prev = new Date(d); prev.setDate(prev.getDate() - 1);
      if (freezesAvailable() > 0 && ((state.log[dateStr(prev)] || {}).goalMet)) {
        frozen[k] = true;
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
    return streak;
  }

  /** Die 7 Tage der aktuellen Woche (Montag..Sonntag) als YYYY-MM-DD. */
  function currentWeekDays() {
    var d = new Date();
    var dow = (d.getDay() + 6) % 7; // 0 = Montag
    d.setDate(d.getDate() - dow);
    var out = [];
    for (var i = 0; i < 7; i++) { out.push(dateStr(d)); d.setDate(d.getDate() + 1); }
    return out;
  }

  /* ==========================================================
   * 5. SRS-Scheduler (SM-2-artig)
   *
   * Bewertungen: 'again' | 'hard' | 'good' | 'easy'
   *  - again: Intervall 0 (gleich nochmal), ease sinkt, mastery -1
   *  - hard : Intervall waechst kaum, ease sinkt leicht
   *  - good : neu -> 1 Tag, sonst Intervall * ease, mastery +1
   *  - easy : Bonus (Intervall * ease * 1.3), ease steigt, mastery +1
   * mastery 0..5 steuert den Niqqud-/Transliterations-Fade.
   * ========================================================== */

  function getSrs(id) {
    var e = state.srs[id];
    // Belt-and-braces: ein nicht-Objekt (z. B. aus einem kaputten Import, das
    // normalizeState umgangen haette) wird durch einen frischen Default ersetzt.
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      e = { ease: 2.5, intervalDays: 0, dueTs: 0, reps: 0, lapses: 0, mastery: 0, lastReviewTs: 0 };
      state.srs[id] = e;
    }
    return e;
  }

  function isNew(id) {
    var e = state.srs[id];
    return !e || !e.reps;
  }

  function isDue(id, now) {
    var e = state.srs[id];
    return !!(e && e.reps > 0 && e.dueTs <= now);
  }

  function getMastery(id) {
    var e = state.srs[id];
    return e ? (e.mastery || 0) : 0;
  }

  /** Wendet eine Bewertung auf den SRS-Zustand eines Items an.
   *  masteryCap (Default 5) begrenzt nur den ANSTIEG der Mastery dieser einen
   *  Bewertung (Erkennen deckelt bei 2, Erstkontakt bei "keinem Anstieg");
   *  Absenkungen ("again") und die SRS-Planung sind nie betroffen. */
  function rateItem(id, grade, masteryCap) {
    var cap = masteryCap === undefined ? 5 : masteryCap;
    var now = Date.now();
    var e = getSrs(id);
    switch (grade) {
      case "again":
        if (e.reps > 0) e.lapses++;
        e.ease = Math.max(1.3, e.ease - 0.2);
        e.intervalDays = 0;
        e.dueTs = now + 10 * 60 * 1000; // in ~10 Minuten wieder faellig
        e.mastery = Math.max(0, e.mastery - 1);
        break;
      case "hard":
        e.ease = Math.max(1.3, e.ease - 0.15);
        e.intervalDays = e.intervalDays < 1 ? 0.5 : e.intervalDays * 1.2;
        e.dueTs = now + e.intervalDays * DAY_MS;
        break;
      case "good":
        e.intervalDays = e.intervalDays < 1 ? 1 : e.intervalDays * e.ease;
        if (e.mastery < cap) e.mastery = Math.min(cap, e.mastery + 1);
        e.dueTs = now + e.intervalDays * DAY_MS;
        break;
      case "easy":
        e.ease = Math.min(3.2, e.ease + 0.1);
        e.intervalDays = e.intervalDays < 1 ? 2.5 : e.intervalDays * e.ease * 1.3;
        if (e.mastery < cap) e.mastery = Math.min(cap, e.mastery + 1);
        e.dueTs = now + e.intervalDays * DAY_MS;
        break;
    }
    e.intervalDays = Math.min(365, Math.round(e.intervalDays * 10) / 10);
    e.reps++;
    e.lastReviewTs = now;
    updateMasteredCount();
  }

  /** Vorschau der naechsten Intervalle fuer die 4 Bewertungs-Knoepfe. */
  function intervalPreview(id) {
    var e = state.srs[id];
    var cur = e && e.reps > 0 ? e.intervalDays : 0;
    var ease = e ? e.ease : 2.5;
    return {
      again: "gleich",
      hard: fmtDays(cur < 1 ? 0.5 : cur * 1.2),
      good: fmtDays(cur < 1 ? 1 : cur * ease),
      easy: fmtDays(cur < 1 ? 2.5 : cur * ease * 1.3)
    };
  }

  function fmtDays(d) {
    d = Math.min(365, d);
    if (d < 1) return "½ Tag";
    if (d < 1.75) return "1 Tag";
    return Math.round(d) + " Tage";
  }

  function updateMasteredCount() {
    var n = 0;
    if (CONTENT) {
      for (var i = 0; i < CONTENT.items.length; i++) {
        if (getMastery(CONTENT.items[i].id) >= 3) n++;
      }
    }
    state.gamification.masteredCount = n;
  }

  /** Mastery-Veto (1.2): setzt ein gemeistertes Item zurueck auf 2 ("in
   *  Arbeit"); SRS-Plan bleibt unangetastet. No-Op fuer nicht-gemeisterte.
   *  Zieht die "gemeistert"-Zaehler (Tag/Session) mit zurueck (Floor 0). */
  function demoteMastery(itemId) {
    var e = state.srs[itemId];
    if (!e || typeof e !== "object" || (e.mastery || 0) < 3) return false;
    e.mastery = 2;
    updateMasteredCount();
    var day = ensureDay(todayStr());
    day.mastered = Math.max(0, (day.mastered || 0) - 1);
    if (session) session.mastered = Math.max(0, (session.mastered || 0) - 1);
    saveState();
    return true;
  }

  /** Gegenstueck zum Veto: ein zurueckgenommenes Item wieder als gemeistert
   *  markieren (auf 3) und die Zaehler wieder hochsetzen. No-Op fuer bereits
   *  Gemeistertes. */
  function restoreMastery(itemId) {
    var e = state.srs[itemId];
    if (!e || typeof e !== "object" || (e.mastery || 0) >= 3) return false;
    e.mastery = 3;
    updateMasteredCount();
    var day = ensureDay(todayStr());
    day.mastered = (day.mastered || 0) + 1;
    if (session) session.mastered = (session.mastered || 0) + 1;
    saveState();
    return true;
  }

  /** Fällige/neue Zaehler nur ueber freigeschaltete Baender (gesperrte zaehlen nicht). */
  function dueCount() {
    var now = Date.now(), n = 0;
    for (var i = 0; i < CONTENT.items.length; i++) {
      var it = CONTENT.items[i];
      if (bandUnlocked(itemBand(it)) && isDue(it.id, now)) n++;
    }
    return n;
  }
  function newCount() {
    var n = 0;
    for (var i = 0; i < CONTENT.items.length; i++) {
      var it = CONTENT.items[i];
      if (bandUnlocked(itemBand(it)) && isNew(it.id)) n++;
    }
    return n;
  }
  /** Anzahl Items in freigeschalteten Baendern (Nenner der Fortschritts-Kennzahl). */
  function unlockedItemCount() {
    var n = 0;
    for (var i = 0; i < CONTENT.items.length; i++) {
      if (bandUnlocked(itemBand(CONTENT.items[i]))) n++;
    }
    return n;
  }

  /** "Heute"-Auswahl (1.3): Buchstabe + Wort des Tages, deterministisch per
   *  Datums-Hash aus dem freigeschalteten Material. Faellt nie leer aus,
   *  solange Content da ist (Buchstaben sind A0 = immer offen; Wort-Fallback
   *  ignoriert notfalls das Gating). */
  function dailyPicks() {
    var key = todayStr();
    var letters = ALEFBET_ORDER.map(itemById).filter(Boolean);
    var letter = letters.length ? letters[dayHash(key + "|letter") % letters.length] : null;
    // "Wort des Tages": nur echte Vokabeln (Wort/Phrase/Zahl), keine Schilder/Saetze.
    var wordTypes = ["word", "phrase", "number"];
    var pool = CONTENT.items.filter(function (it) {
      return wordTypes.indexOf(it.type) >= 0 && bandUnlocked(itemBand(it));
    });
    if (!pool.length) pool = CONTENT.items.filter(function (it) { return wordTypes.indexOf(it.type) >= 0; });
    var word = pool.length ? pool[dayHash(key + "|word") % pool.length] : null;
    return { letter: letter, word: word };
  }

  /* ---------- Wissens-Haeppchen (WS-D): Snack des Tages ---------- */

  /**
   * Snack des Tages: deterministisch ueber den Datums-Hash, Ungesehenes zuerst,
   * band-gated (bevorzugt freigeschaltete Baender). Kein Math.random, damit die
   * Wahl ueber einen Tag stabil bleibt. Defensiv: ohne Snacks -> null.
   */
  function dailySnack() {
    if (!SNACKS || !SNACKS.snacks.length) return null;
    var pool = SNACKS.snacks.filter(function (s) { return bandUnlocked(s.band || "A0"); });
    if (!pool.length) pool = SNACKS.snacks;
    var unseen = pool.filter(function (s) { return !state.course.snacksSeen[s.id]; });
    var pick = unseen.length ? unseen : pool; // alles gesehen: von vorn rotieren
    return pick[dayHash(todayStr() + "|snack") % pick.length];
  }

  function snackById(id) {
    if (!SNACKS) return null;
    for (var i = 0; i < SNACKS.snacks.length; i++) if (SNACKS.snacks[i].id === id) return SNACKS.snacks[i];
    return null;
  }

  /* ==========================================================
   * 6. XP & zentrale Antwort-Verbuchung
   * XP nur fuer echten Abruf, gewichtet nach Lerntiefe
   * (Sprechen > Hoeren > Erkennen), kleiner Bonus fuer faellige Reviews.
   * ========================================================== */

  var XP_BASE = { flash: 5, mc: 5, match: 5, swipe: 5, signs: 5, reel: 5, listen: 7, speak: 10, dialog: 8, build: 8, blitz: 5, image: 5 };

  /* ---------- Abzeichen: nur echte Lern-Meilensteine, kein Grind ---------- */

  function countMastered(filterFn) {
    var n = 0;
    for (var i = 0; i < CONTENT.items.length; i++) {
      var it = CONTENT.items[i];
      if (filterFn && !filterFn(it)) continue;
      if (getMastery(it.id) >= 3) n++;
    }
    return n;
  }

  var ACHIEVEMENTS = [
    { id: "first_word",  emoji: "🕊️", title: "Erstes Wort gemeistert",
      test: function () { return state.gamification.masteredCount >= 1; } },
    { id: "mastered_10", emoji: "🌱", title: "10 Wörter gemeistert",
      test: function () { return state.gamification.masteredCount >= 10; } },
    { id: "mastered_25", emoji: "🌿", title: "25 Wörter gemeistert",
      test: function () { return state.gamification.masteredCount >= 25; } },
    { id: "mastered_50", emoji: "🌳", title: "50 Wörter gemeistert",
      test: function () { return state.gamification.masteredCount >= 50; } },
    { id: "mastered_100", emoji: "🏆", title: "100 Wörter gemeistert",
      test: function () { return state.gamification.masteredCount >= 100; } },
    { id: "alefbet",     emoji: "🔤", title: "Alef-Bet-Meister",
      test: function () {
        var letters = CONTENT.items.filter(function (it) { return it.theme === "alefbet"; });
        return letters.length > 0 && countMastered(function (it) { return it.theme === "alefbet"; }) >= letters.length;
      } },
    { id: "reader_5",    emoji: "👓", title: "Erste 5 Buchstaben sitzen",
      test: function () { return countMastered(function (it) { return it.theme === "alefbet"; }) >= 5; } },
    { id: "signs_8",     emoji: "🪧", title: "Schilderleser (8 Schilder)",
      test: function () { return countMastered(function (it) { return it.type === "sign"; }) >= 8; } },
    { id: "first_goal",  emoji: "🎯", title: "Erstes Tagesziel erreicht",
      test: function () { return Object.keys(state.log).some(function (k) { return state.log[k].goalMet; }); } },
    { id: "week_5",      emoji: "🔥", title: "5 Tage in einer Woche",
      test: function () {
        return currentWeekDays().filter(function (d) { return (state.log[d] || {}).goalMet; }).length >= 5;
      } },
    { id: "dialog_first", emoji: "💬", title: "Erster Dialog geschafft",
      test: function () { return Object.keys(state.gamification.counters.dialogsDone || {}).length >= 1; } },
    { id: "dialog_all",  emoji: "🗣️", title: "Alle Dialoge durchgespielt",
      test: function () {
        var done = state.gamification.counters.dialogsDone || {};
        var all = CONTENT.dialogues || [];
        return all.length > 0 && all.every(function (d) { return !!done[d.id]; });
      } },
    { id: "blitz_10",    emoji: "⚡", title: "Blitz: 10 richtig in einer Runde",
      test: function () { return (state.gamification.counters.bestBlitz || 0) >= 10; } },
    { id: "survival_check", emoji: "🎓", title: "Survival-Check bestanden (10/12)",
      test: function () { return (state.gamification.counters.bestExam || 0) >= 10; } }
  ];

  /** Prueft alle Abzeichen; neue werden gespeichert und gefeiert. */
  function checkAchievements() {
    var got = state.gamification.achievements;
    ACHIEVEMENTS.forEach(function (a) {
      if (got.indexOf(a.id) >= 0) return;
      var ok = false;
      try { ok = !!a.test(); } catch (e) { /* defensiv */ }
      if (ok) {
        got.push(a.id);
        toast(a.emoji + " Abzeichen: " + a.title + "!", "gold");
      }
    });
  }

  /* Aufgaben-Klassifikation (ehrliche Mastery, R-Spec 1.1):
   * "production" = die hebraeische Form muss aktiv produziert werden
   * (Satzbau, Sprechen, jede de->he-Abfrage inkl. Grammatik cloze/form).
   * Alles andere ist "recognition" (Erkennen) und deckelt mastery bei 2. */
  var RECALL_KIND = { build: "production", speak: "production" };

  /** Erklaerzeile fuer die Erkennen-/Produzieren-Regel (R-Spec 1.1). Sichtbar
   *  in der Vokabelliste und auf der Mastery-Check-Karte. */
  var MASTERY_RULE_TEXT = "Gemeistert wird ein Wort erst, wenn du es aktiv abrufst – " +
    "Deutsch→Hebräisch, Satzbau oder Sprechen. Wiedererkennen allein reicht nicht.";

  function isProduction(mode, dir) {
    if (RECALL_KIND[mode] === "production") return true;
    return dir === "de2he";
  }

  /**
   * Zentrale Verbuchung jedes Abruf-Ereignisses:
   * SRS-Update, XP, Tageslog, Tagesziel/Streak, Session-Statistik, Auto-Save.
   */
  function recordAnswer(itemId, mode, grade, dir) {
    // Tour-Demo (WS-F): echte Bedienung, aber NICHTS verbuchen (kein SRS/XP/Log).
    if (tourDemo) return { correct: grade !== "again", xp: 0 };
    // "Richtig" = gewusst. Auch "Schwer" ist gewusst (nur muehsam) — als falsch
    // zaehlt NUR "Nochmal" (= wusste ich nicht). Sonst drueckt ehrliches
    // Selbstbewerten die Trefferquote strukturell Richtung 50 %.
    var correct = grade !== "again";
    var wasDue = isDue(itemId, Date.now());
    var masteryBefore = getMastery(itemId);

    // Ehrliche Mastery (1.1): Erkennen hebt hoechstens auf 2; erst Produktion
    // (good/easy) erreicht 3+. Der ERSTE Abruf eines in DIESER Session frisch
    // vorgestellten Worts erhoeht die Mastery gar nicht (nur SRS-Planung/XP).
    var cap = isProduction(mode, dir) ? 5 : 2;
    if (session && session.introducedThisSession && session.introducedThisSession[itemId]) {
      delete session.introducedThisSession[itemId];
      cap = masteryBefore;
    }
    // Mastery-Check (1.2): Mastery waehrend der Runde in BEIDE Richtungen
    // einfrieren. Bewertung darf nichts anheben (cap = Ist-Stand) und nichts
    // absenken ("Nochmal"-Abzug wird gleich zurueckgenommen). SRS-Planung, XP
    // und Log laufen normal; Demotion passiert nur ueber die Review-Haken.
    var freezeMastery = !!(session && session.masteryCheck);
    if (freezeMastery) cap = masteryBefore;
    rateItem(itemId, grade, cap);
    if (freezeMastery) {
      var fe = state.srs[itemId];
      if (fe && fe.mastery !== masteryBefore) { fe.mastery = masteryBefore; updateMasteredCount(); }
    }

    var xp = Math.max(1, Math.round((XP_BASE[mode] || 5) * (correct ? 1 : 0.3) * (wasDue ? 1.2 : 1)));
    state.gamification.xpTotal += xp;
    state.gamification.lastActiveDay = todayStr();

    var day = ensureDay(todayStr());
    day.answers++;
    if (correct) day.correct++;
    day.xp += xp;
    if (masteryBefore < 3 && getMastery(itemId) >= 3) {
      day.mastered = (day.mastered || 0) + 1;
      // Der kleine Duolingo-Moment: ein Wort sitzt jetzt wirklich.
      var mItem = itemById(itemId);
      if (mItem) {
        toast("🏅 " + mItem.he + " (" + mItem.de + ") sitzt! · tippen, falls es doch noch nicht sitzt", "gold", function () {
          if (demoteMastery(itemId)) {
            // Bestaetigung ist selbst antippbar: Veto rueckgaengig machen.
            toast("Okay, zählt noch nicht als gemeistert. 💪 · tippen zum Rückgängigmachen", null, function () {
              if (restoreMastery(itemId)) toast("Wieder als gemeistert markiert.");
            });
          }
        });
      }
    }
    if (!day.goalMet && day.answers >= goalItems()) day.goalMet = true;
    state.gamification.streakDays = recomputeStreak();
    bumpAnswersTotal();

    if (session) {
      session.answered++;
      if (correct) session.correct++; else session.wrong++;
      session.xp += xp;
      if (masteryBefore < 3 && getMastery(itemId) >= 3) session.mastered++;
      // Fuer den Rueckblick am Session-Ende: jedes Item einmal, mit Erst-Ergebnis.
      if (!session.seenIds) { session.seenIds = {}; session.seenList = []; }
      if (!(itemId in session.seenIds)) {
        session.seenIds[itemId] = correct;
        session.seenList.push(itemId);
      }
      var xpEl = $(".session-xp");
      if (xpEl) xpEl.textContent = "⭐ " + session.xp;
    }
    checkAchievements();
    saveState();
    return { correct: correct, xp: xp };
  }

  /** Zaehlt alle Abruf-Antworten und erinnert alle ~200 dezent ans Backup. */
  function bumpAnswersTotal() {
    state.gamification.answersTotal = (state.gamification.answersTotal || 0) + 1;
    if (state.gamification.answersTotal % 200 === 0) {
      toast("💾 Tipp: Sichere deinen Fortschritt ab und zu im Profil (Export).");
    }
  }

  /** Wie recordAnswer, aber ohne SRS-Item (z. B. Dialogzeilen ohne Vokabel-Bezug):
   *  zaehlt XP, Tagesziel und Session-Statistik. */
  function recordFreeAnswer(mode, correct) {
    // Tour-Demo (WS-F): echte Bedienung, aber NICHTS verbuchen (kein SRS/XP/Log).
    if (tourDemo) return { correct: correct, xp: 0 };
    var xp = Math.max(1, Math.round((XP_BASE[mode] || 5) * (correct ? 1 : 0.3)));
    state.gamification.xpTotal += xp;
    state.gamification.lastActiveDay = todayStr();
    var day = ensureDay(todayStr());
    day.answers++;
    if (correct) day.correct++;
    day.xp += xp;
    if (!day.goalMet && day.answers >= goalItems()) day.goalMet = true;
    state.gamification.streakDays = recomputeStreak();
    bumpAnswersTotal();
    if (session) {
      session.answered++;
      if (correct) session.correct++; else session.wrong++;
      session.xp += xp;
      var xpEl = $(".session-xp");
      if (xpEl) xpEl.textContent = "⭐ " + session.xp;
    }
    checkAchievements();
    saveState();
    return { correct: correct, xp: xp };
  }

  /* ==========================================================
   * 7. Sprachausgabe (TTS) & Spracherkennung (STT)
   * ========================================================== */

  var TTS = {
    available: typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined",
    voice: null,
    deVoice: null,
    init: function () {
      if (!this.available) return;
      var self = this;
      var pick = function () {
        try {
          var vs = window.speechSynthesis.getVoices() || [];
          self.voice = null;
          self.deVoice = null;
          for (var i = 0; i < vs.length; i++) {
            if (!self.voice && /^he|^iw/i.test(vs[i].lang)) self.voice = vs[i];
            if (!self.deVoice && /^de/i.test(vs[i].lang)) self.deVoice = vs[i];
          }
        } catch (e) { /* egal */ }
      };
      pick();
      // Stimmen laden in vielen Browsern asynchron nach.
      try { window.speechSynthesis.onvoiceschanged = pick; } catch (e) { /* egal */ }
    },
    hasHebrew: function () { return !!this.voice; },
    hasGerman: function () { return !!this.deVoice; },
    /** Spricht einen Text und ruft onDone GENAU EINMAL (onend oder Sicherheits-Timeout). */
    speakSeq: function (text, lang, onDone) {
      var self = this;
      var called = false;
      var done = function () { if (!called) { called = true; if (onDone) onDone(); } };
      if (!this.available || !text) { setTimeout(done, 300); return; }
      try { if (STT && STT.abort) STT.abort(); } catch (e) { /* egal */ }
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        if (lang === "de") {
          u.lang = "de-DE";
          if (this.deVoice) u.voice = this.deVoice;
        } else {
          u.lang = "he-IL";
          if (this.voice) u.voice = this.voice;
          u.rate = 0.9;
        }
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
        // Sicherheitsnetz, falls onend nie feuert.
        setTimeout(done, 1500 + text.length * 90);
      } catch (e) { done(); }
    },
    speak: function (text, rate) {
      if (!this.available || !text) return;
      // Laufende Spracherkennung stoppen, sonst "hoert" das Mikrofon die
      // eigene Sprachausgabe und wertet sie als Antwort (Echo-Bug).
      try { if (STT && STT.abort) STT.abort(); } catch (e) { /* egal */ }
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = "he-IL";
        if (!this.voice) this.init(); // spaeter Nachversuch
        if (this.voice) u.voice = this.voice;
        u.rate = rate || 0.85;
        window.speechSynthesis.speak(u);
      } catch (e) { /* nie crashen */ }
    },
    /** Extra-langsames Vorsprechen (🐢) zum Mithoeren einzelner Laute. */
    speakSlow: function (text) { this.speak(text, 0.55); },
    stop: function () {
      if (!this.available) return;
      try { window.speechSynthesis.cancel(); } catch (e) { /* egal */ }
    }
  };

  var STT = {
    Ctor: window.SpeechRecognition || window.webkitSpeechRecognition || null,
    current: null,
    available: function () { return !!this.Ctor; },
    /** Laufende Erkennung abbrechen (z. B. wenn vorgesprochen wird, damit das
     *  Mikrofon nicht die eigene Sprachausgabe als Antwort "hoert"). */
    abort: function () {
      if (this.current) {
        var r = this.current;
        this.current = null;
        try { r.abort(); } catch (e) { /* egal */ }
      }
    },
    /**
     * Startet eine Erkennung (he-IL). cb wird mit
     * {transcripts:[..]} oder {error:'..'} aufgerufen.
     */
    listen: function (cb) {
      this.abort();
      var rec;
      try { rec = new this.Ctor(); } catch (e) { cb({ error: "init" }); return null; }
      var done = false;
      var self = this;
      var finish = function (res) {
        if (done) return; done = true;
        if (self.current === rec) self.current = null;
        cb(res);
      };
      rec.lang = "he-IL";
      rec.interimResults = false;
      rec.maxAlternatives = 4;
      rec.onresult = function (ev) {
        var alts = [];
        try {
          var res = ev.results[0];
          for (var i = 0; i < res.length; i++) alts.push(res[i].transcript);
        } catch (e) { /* egal */ }
        finish({ transcripts: alts });
      };
      rec.onerror = function (ev) { finish({ error: (ev && ev.error) || "unbekannt" }); };
      rec.onend = function () { finish({ error: "nichts-gehoert" }); };
      this.current = rec;
      try { rec.start(); } catch (e) { finish({ error: "start" }); }
      return rec;
    }
  };

  /** Hebraeisch normalisieren: Niqqud/Zeichen weg, Endbuchstaben vereinheitlichen. */
  /** Text fuer die Sprachausgabe: Buchstaben-Items haben ihren NAMEN hinterlegt
   *  (z. B. spricht ש als "schin" statt als stummes Zeichen). */
  function spoken(item) {
    return item.speak || item.he;
  }

  /* ==========================================================
   * 8b. Audio-Samples (vorproduziert, offline-cachebar)
   * Vorproduzierte Sprach-Samples (ElevenLabs, niqqud-vertont) statt der oft
   * fehlerhaften Browser-Stimme. "Audio-first": ist ein Sample da, wird es
   * gespielt, sonst faellt alles auf TTS.speak(spoken(item)) zurueck. Ohne
   * Manifest (z. B. vor der Generierung) verhaelt sich die App wie bisher.
   * Manifest: app/audio/manifest.json { version, format, clips:{ <id>:{band,bytes} } }.
   * ========================================================== */

  var AUDIO = null;        // Manifest oder null (dann reiner TTS-Betrieb)
  var audioPlayer = null;  // laufendes Audio-Element (fuer sauberes Abbrechen)

  function loadAudioManifest() {
    // Manifest kommt als klassisches Script (audio/manifest.js -> window.TACHELES_AUDIO),
    // KEIN fetch/XHR (das wuerde auf file:// einen Konsolenfehler ausloesen).
    try {
      var m = window.TACHELES_AUDIO;
      if (m && m.clips && typeof m.clips === "object" && m.format) {
        AUDIO = m;
        maybePrefetchAudio();
      }
    } catch (e) { /* kein/kaputtes Manifest -> TTS-Betrieb */ }
  }

  /** FNV-1a (32-bit) als unsigned int. Gemeinsamer Kern fuer audioHash und
   *  dayHash (deterministisch, KEIN Math.random). */
  function fnv1a(s) {
    var h = 0x811c9dc5 >>> 0;
    s = String(s == null ? "" : s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }

  /** FNV-1a -> 8 Hex-Zeichen. IDENTISCH zu audioHash() in tools/audio-lib.cjs,
   *  damit die App genau die dort erzeugten Dateinamen findet (Dialog/Grammatik). */
  function audioHash(s) {
    return ("0000000" + fnv1a(s).toString(16)).slice(-8);
  }

  function clipUrl(key) {
    if (!AUDIO || !key || !AUDIO.clips[key]) return null;
    return "audio/" + key + "." + AUDIO.format;
  }
  function audioUrl(item) { return item ? clipUrl(item.id) : null; } // fuer Debug/Regression

  /**
   * Spielt den Clip zu KEY ab; ohne Clip (oder bei Ladefehler, z. B. offline und
   * noch nicht gecacht) ruft es fallback() (Browser-TTS) und geht weiter.
   */
  function playByKey(key, fallback, onDone) {
    var url = clipUrl(key);
    if (!url) { fallback(); if (onDone) onDone(); return; }
    try {
      try { if (STT && STT.abort) STT.abort(); } catch (e) { /* egal */ }
      if (audioPlayer) { try { audioPlayer.pause(); } catch (e) { /* egal */ } }
      var a = new Audio(url);
      audioPlayer = a;
      var fell = false;
      var fb = function () { if (fell) return; fell = true; fallback(); if (onDone) onDone(); };
      a.onended = function () { if (onDone) onDone(); };
      a.onerror = fb;
      var p = a.play();
      if (p && p.catch) p.catch(fb);
    } catch (e) { fallback(); if (onDone) onDone(); }
  }

  /** Item vorlesen (Key = item.id). Ersetzt direkte TTS.speak(spoken(item))-Aufrufe. */
  function say(item, onDone) {
    playByKey(item.id, function () { TTS.speak(spoken(item)); }, onDone);
  }
  /** Freien he-Text vorlesen (Dialog/Grammatik, Key = "h_"+hash). Fallback: TTS. */
  function sayText(text, onDone) {
    playByKey("h_" + audioHash(text), function () { TTS.speak(text); }, onDone);
  }
  /** Silbe vorlesen: Clip-Key bleibt Hash(syl.he), TTS-Fallback = syl.speak || syl.he
   *  (manche nackten Silben synthetisiert die Browser-Stimme nur mit Lautersatz). */
  function saySyl(syl, onDone) {
    playByKey("h_" + audioHash(syl.he), function () { TTS.speak(syl.speak || syl.he); }, onDone);
  }

  /**
   * Alle Samples vom Service Worker im Hintergrund vorladen lassen (gesamt ~2.4 MB):
   * aktuelles + naechstes Band ZUERST (Prioritaet), danach der Rest. Der SW cacht
   * cache-first in einen eigenen, releasesicheren AUDIO_CACHE und ueberspringt bereits
   * Gecachtes - nach dem ersten Online-Start also 0 weitere Requests, offline verfuegbar.
   */
  function maybePrefetchAudio() {
    if (!AUDIO || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    var i = BANDS.indexOf(effectiveBand());
    var pri = [BANDS[i], BANDS[i + 1]].filter(Boolean);
    var first = [], rest = [];
    Object.keys(AUDIO.clips).forEach(function (id) {
      var u = "audio/" + id + "." + AUDIO.format;
      if (pri.indexOf(AUDIO.clips[id].band) >= 0) first.push(u); else rest.push(u);
    });
    var urls = first.concat(rest);
    if (urls.length) {
      try { navigator.serviceWorker.controller.postMessage({ type: "prefetch-audio", urls: urls }); } catch (e) { /* egal */ }
    }
  }

  function normalizeHe(s) {
    s = String(s || "");
    s = s.replace(/[֑-ׇ]/g, "");        // Niqqud & Kantillation
    s = s.replace(/[^א-ת\s]/g, "");      // nur hebraeische Buchstaben + Leerzeichen
    var finals = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
    s = s.replace(/[ךםןףץ]/g, function (ch) { return finals[ch]; });
    return s.replace(/\s+/g, " ").trim();
  }

  /** Toleranter Vergleich: gleich oder ineinander enthalten. */
  function speechMatches(item, transcripts) {
    var target = normalizeHe(item.he);
    if (!target) return false;
    for (var i = 0; i < (transcripts || []).length; i++) {
      var s = normalizeHe(transcripts[i]);
      if (!s) continue;
      if (s === target) return true;
      if (s.indexOf(target) >= 0) return true;
      if (target.indexOf(s) >= 0 && s.length >= Math.max(2, target.length - 2)) return true;
    }
    return false;
  }

  /* ==========================================================
   * 8. Niqqud-/Transliterations-Fade & Hebraeisch-Rendering
   *
   * Fade-Ebenen: 0 = Niqqud + Umschrift, 1 = nur Niqqud, 2 = nur he.
   * Schilder werden immer ohne Niqqud gezeigt (wie in echt),
   * Umschrift/Niqqud dort nur per Tap.
   * ========================================================== */

  function fadeLevel(item) {
    // Pruefungsmodus: immer Ziel-Ansicht (wie echte Schilder), egal welche Einstellung.
    if (session && session.exam) return 2;
    var fm = state.profile.fadeMode;
    if (fm === "keep") return 0;
    var m = getMastery(item.id);
    if (fm === "off_early") return m <= 0 ? 0 : (m === 1 ? 1 : 2);
    return m <= 1 ? 0 : (m === 2 ? 1 : 2); // 'auto'
  }

  /**
   * Baut die hebraeische Anzeige eines Items inkl. Fade und Tap-to-reveal.
   * opts: { big:bool, tapReveal:bool(default true), showHint:bool }
   */
  function heEl(item, opts) {
    opts = opts || {};
    var level = fadeLevel(item);
    var isSign = item.type === "sign";
    var showNiqqud = !isSign && level <= 1 && !!item.niqqud;
    var showTr = !isSign && level === 0;
    // In Abfragen verraet die Umschrift bei BUCHSTABEN die Loesung
    // (sie IST der Name: "ajin" -> "Ajin"). Dort ausblenden; Tap-Hilfe bleibt.
    if (opts.quiz && item.type === "letter") showTr = false;

    var wrap = el("div", "he-wrap" + (opts.big ? " big" : ""));
    var heDiv = el("div", "he-text");
    heDiv.dir = "rtl";
    heDiv.lang = "he";
    heDiv.textContent = showNiqqud ? item.niqqud : item.he;
    var trDiv = el("div", "translit", item.translit || "");
    trDiv.style.visibility = showTr ? "visible" : "hidden";
    wrap.appendChild(heDiv);
    wrap.appendChild(trDiv);

    var tapReveal = opts.tapReveal !== false && !(session && session.exam); // Pruefung: keine Hilfe
    if (tapReveal && (!showTr || !showNiqqud || isSign)) {
      wrap.classList.add("tappable");
      wrap.title = "Antippen für Niqqud & Umschrift";
      if (opts.showHint) wrap.appendChild(el("div", "tap-hint", "antippen für Hilfe"));
      var timer = null;
      wrap.addEventListener("click", function () {
        heDiv.textContent = item.niqqud || item.he;
        trDiv.style.visibility = "visible";
        wrap.classList.add("revealed");
        clearTimeout(timer);
        timer = setTimeout(function () {
          heDiv.textContent = showNiqqud ? item.niqqud : item.he;
          trDiv.style.visibility = showTr ? "visible" : "hidden";
          wrap.classList.remove("revealed");
        }, 2500);
      });
    }
    return wrap;
  }

  /** Text fuer Hebraeisch in Options-/Matching-Knoepfen (ohne Tap-Reveal). */
  function heOptionText(item) {
    if (item.type === "sign") return item.he;
    return fadeLevel(item) <= 1 && item.niqqud ? item.niqqud : item.he;
  }

  /** 🔊-Zeile: Abspielen-Knopf + dezenter Hinweis, falls keine he-Stimme. */
  function speakRow(item, withSlow) {
    var row = el("div", "speak-row");
    var b = btn("🔊", "icon-btn", function (ev) {
      ev.stopPropagation();
      say(item);
    });
    b.title = "Anhören";
    row.appendChild(b);
    if (withSlow) {
      var s = btn("🐢", "icon-btn", function (ev) {
        ev.stopPropagation();
        TTS.speakSlow(spoken(item));
      });
      s.title = "Langsam anhören";
      row.appendChild(s);
    }
    if (!TTS.available || !TTS.hasHebrew()) {
      row.appendChild(el("span", "tts-hint", "Hebräische Stimme im Browser nicht verfügbar"));
    }
    return row;
  }

  /* ==========================================================
   * 9. Session-Generator
   * Session = ~70 % faellige Reviews + ~30 % neue Items,
   * begrenzt durch das Tagesziel. Auffuellen mit Geuebtem, falls
   * weder genug Faelliges noch Neues da ist.
   * ========================================================== */

  /** Session-Groesse: Rest zum Tagesziel, aber handliche 8..20 Aufgaben. */
  function sessionSize() {
    var remaining = goalItems() - todayLog().answers;
    return clamp(remaining, 8, 20);
  }

  function buildQueue(count, opts) {
    opts = opts || {};
    var now = Date.now();
    var pool = CONTENT.items;
    // Level-Gating: nur Items aus freigeschalteten Baendern — ausser bei einer
    // expliziten Item-Liste (Knacknuesse & Co. sollen immer funktionieren).
    if (!opts.itemIds) {
      pool = pool.filter(function (it) { return bandUnlocked(itemBand(it)); });
    }
    if (opts.types) {
      pool = pool.filter(function (it) { return opts.types.indexOf(it.type) >= 0; });
    }
    if (opts.theme) {
      pool = pool.filter(function (it) { return it.theme === opts.theme; });
    }
    if (opts.requireEmoji) {
      pool = pool.filter(function (it) { return !!it.emoji; });
    }
    if (opts.itemIds) {
      var wanted = {};
      opts.itemIds.forEach(function (id) { wanted[id] = true; });
      pool = pool.filter(function (it) { return wanted[it.id]; });
    }
    if (opts.startedOnly) {
      // Modi wie Wisch/Paare/Blitz sind Abruf-Spiele: nur bereits Gelerntes,
      // sonst ist es fuer den Nutzer reines Raten.
      pool = pool.filter(function (it) { return !isNew(it.id); });
    }
    var due = shuffle(pool.filter(function (it) { return isDue(it.id, now); }).slice());
    var fresh = pool.filter(function (it) { return isNew(it.id); })
      .sort(function (a, b) {
        // Neue Woerter themenkohaerent einfuehren (R8): erst das empfohlene
        // Thema, dann der Rest — jeweils nach Haeufigkeit.
        if (opts.preferTheme) {
          var pa = a.theme === opts.preferTheme ? 0 : 1;
          var pb = b.theme === opts.preferTheme ? 0 : 1;
          if (pa !== pb) return pa - pb;
        }
        return (a.freq - b.freq) || (a.id < b.id ? -1 : 1);
      });
    var rest = pool.filter(function (it) { return !isNew(it.id) && !isDue(it.id, now); })
      .sort(function (a, b) { return state.srs[a.id].dueTs - state.srs[b.id].dueTs; });

    count = Math.min(count, pool.length);
    var nRev = Math.round(count * 0.7);
    // Nicht mehr als ~6 NEUE Woerter pro Session (kein Overload); Rest wird
    // mit Faelligem/Geuebtem aufgefuellt.
    var newCap = opts.newCap === undefined ? 6 : opts.newCap;
    var out = [], i;
    for (i = 0; i < due.length && out.length < nRev; i++) out.push(due[i]);
    var dueUsed = out.length;
    var freshUsed = 0;
    for (i = 0; i < fresh.length && out.length < count && freshUsed < newCap; i++) { out.push(fresh[i]); freshUsed++; }
    for (i = dueUsed; i < due.length && out.length < count; i++) out.push(due[i]);
    for (i = 0; i < rest.length && out.length < count; i++) out.push(rest[i]);
    return shuffle(out);
  }

  /** Modus-Wahl fuer die Smart-Session (neue Items zuerst als Karte).
   *  Buchstaben werden nicht abgesprochen (STT kann einzelne Zeichen nicht sinnvoll pruefen). */
  function smartKind(item) {
    if (isNew(item.id)) return "flash";
    // Saetze: bevorzugt zusammenbauen (Produktion), sonst erkennen.
    if (item.type === "sentence") return Math.random() < 0.6 ? "build" : "mc";
    var pool = ["mc", "mc", "flash", "flash"];
    if (TTS.available && TTS.hasHebrew()) pool.push("listen");
    if (getMastery(item.id) >= 2 && item.type !== "letter") pool.push("speak");
    if (item.emoji) pool.push("image");
    return pool[randInt(pool.length)];
  }

  /* ==========================================================
   * 9b. Band-System: Level-Gating & Auto-Aufstieg
   * effectiveBand = manuelle Grenze (levelCap) oder das erreichte Band.
   * Aufstieg passiert automatisch, wenn genug vom aktuellen Band (und allen
   * darunter) wirklich sitzt.
   * ========================================================== */

  /** Aktuell wirksames Band: bei 'auto' das erreichte, sonst die manuelle Grenze. */
  function effectiveBand() {
    var lc = state.profile.levelCap;
    return lc === "auto" ? state.profile.unlockedBand : lc;
  }

  /** Ist ein Band freigeschaltet (<= wirksames Band)? */
  function bandUnlocked(band) {
    return bandIndex(band) <= bandIndex(effectiveBand());
  }

  /** Anteil gemeisterter Items (mastery >= 3) innerhalb eines Bands. */
  function bandProgress(band) {
    var total = 0, mastered = 0;
    for (var i = 0; i < CONTENT.items.length; i++) {
      var it = CONTENT.items[i];
      if (itemBand(it) !== band) continue;
      total++;
      if (getMastery(it.id) >= 3) mastered++;
    }
    return total ? mastered / total : 0;
  }

  /**
   * Prueft nach jeder Session, ob das naechste Band freigeschaltet wird:
   * das aktuelle Band UND alle darunter muessen jeweils >= 40 % sitzen.
   * Der Level-Cap (levelCap) beeinflusst das Verdienen NICHT — nur die Anzeige.
   */
  function maybeAdvanceBand() {
    var curIdx = bandIndex(state.profile.unlockedBand);
    if (curIdx >= BANDS.length - 1) return; // schon oberstes Band
    for (var i = 0; i <= curIdx; i++) {
      if (bandProgress(BANDS[i]) < 0.4) return;
    }
    var next = BANDS[curIdx + 1];
    state.profile.unlockedBand = next;
    toast("🎉 Neues Level freigeschaltet: " + next + "!", "gold");
  }

  /* ==========================================================
   * 10. Screens: Home / Lernen / Fortschritt / Profil
   * ========================================================== */

  var MODES = [
    { id: "flash",  title: "Karten",   emoji: "🃏", desc: "Karteikarten mit 4 Stufen" },
    { id: "mc",     title: "Auswahl",  emoji: "✅", desc: "Multiple Choice" },
    { id: "match",  title: "Paare",    emoji: "🧩", desc: "Deutsch ↔ Hebräisch" },
    { id: "swipe",  title: "Wisch",    emoji: "💚", desc: "Stimmt das Paar?" },
    { id: "reels",  title: "Reels",    emoji: "📱", desc: "Lern-Feed mit Audio" },
    { id: "signs",  title: "Schilder", emoji: "🪧", desc: "Echte Schilder lesen" },
    { id: "listen", title: "Hören",    emoji: "👂", desc: "Nur mit den Ohren" },
    { id: "speak",  title: "Sprechen", emoji: "🎤", desc: "Laut auf Hebräisch" },
    { id: "dialog", title: "Dialog",   emoji: "💬", desc: "Gespräche durchspielen" },
    { id: "build",  title: "Satzbau",  emoji: "🧱", desc: "Sätze zusammensetzen" },
    { id: "image",  title: "Bilder",   emoji: "🖼️", desc: "Bild → Wort, ohne Deutsch" },
    { id: "blitz",  title: "Blitz",    emoji: "⚡", desc: "60 Sekunden Schnellrunde" },
    { id: "audio",  title: "Audio-Kurs", emoji: "🎧", desc: "Hören & nachsprechen, ohne Hände" }
  ];

  var currentScreen = "home";

  function showScreen(name) {
    cleanupSession();
    currentScreen = name;
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.screen === name);
    });
    if (name === "home") renderHome();
    else if (name === "course") renderCourse();
    else if (name === "vocab") renderVocab();
    else if (name === "grammar") renderGrammar();
    else if (name === "progress") renderProgress(); // kein Tab mehr: via Statistik-Tipp
    else if (name === "profile") renderProfile();
    window.scrollTo(0, 0);
  }

  /** Fortschritts-Kennzahlen eines Themas (Basis fuer Pfad + Empfehlung). */
  function themeStats(theme) {
    var items = CONTENT.items.filter(function (it) { return it.theme === theme.id; });
    var mastered = 0, started = false;
    items.forEach(function (it) {
      if (getMastery(it.id) >= 3) mastered++;
      if (!isNew(it.id)) started = true;
    });
    return {
      total: items.length,
      mastered: mastered,
      started: started,
      pct: items.length ? Math.round(mastered / items.length * 100) : 0
    };
  }

  /** Empfehlung "als Naechstes": erstes Thema (in Pfad-Reihenfolge) unter 80 % gemeistert. */
  function recommendedTheme() {
    for (var i = 0; i < CONTENT.themes.length; i++) {
      var t = CONTENT.themes[i];
      if (!bandUnlocked(themeBand(t))) continue;
      if (themeStats(t).pct < 80) return t;
    }
    return null;
  }

  function themeRowHtml(theme) {
    var items = CONTENT.items.filter(function (it) { return it.theme === theme.id; });
    var mastered = items.filter(function (it) { return getMastery(it.id) >= 3; }).length;
    var pct = items.length ? Math.round(mastered / items.length * 100) : 0;
    var band = themeBand(theme);
    var locked = !bandUnlocked(band);
    return '<div class="theme-row' + (locked ? ' locked' : '') + '" role="button" tabindex="0" data-theme="' + esc(theme.id) + '"' +
      (locked ? ' data-locked="' + esc(band) + '" aria-disabled="true" aria-label="' +
        esc(theme.title) + ' – gesperrt bis Level ' + esc(band) + '"' : '') +
      ' title="' + (locked ? 'Gesperrt bis Level ' + esc(band) : 'Gezielt üben: ' + esc(theme.title)) + '">' +
      '<span class="theme-emoji">' + (locked ? '🔒' : esc(theme.emoji)) + '</span>' +
      '<div class="theme-info"><div class="theme-title">' + esc(theme.title) +
      (locked ? ' <span class="band-tag">ab ' + esc(band) + '</span>' : '') + '</div>' +
      '<div class="bar mini"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>' +
      '<span class="theme-count">' + mastered + '/' + items.length + '</span>' +
      '</div>';
  }

  /** Themen-Zeilen anklickbar machen: startet eine gezielte Smart-Session nur mit diesem
   *  Thema. Gesperrte (Band noch nicht frei) zeigen stattdessen einen Hinweis-Toast. */
  function wireThemeRows(root) {
    root.querySelectorAll("[data-theme]").forEach(function (row) {
      var go;
      if (row.dataset.locked) {
        go = function () {
          toast("🔒 Dieses Thema ist ab Level " + row.dataset.locked +
            " frei. Lern weiter oder stell dein Level im Profil um.");
        };
      } else {
        go = function () { startSession("smart", { theme: row.dataset.theme }); };
      }
      row.addEventListener("click", go);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
  }

  /**
   * Themen-Liste fuer Home & Fortschritt: nur freigeschaltete Themen, die
   * gesperrten in EINE Sammelzeile zusammengefasst (weniger Rauschen). Der
   * vollstaendige Pfad mit allen Themen bleibt im Lernen-Tab.
   */
  function themeListHtml() {
    var unlocked = CONTENT.themes.filter(function (t) { return bandUnlocked(themeBand(t)); });
    var locked = CONTENT.themes.filter(function (t) { return !bandUnlocked(themeBand(t)); });
    var html = unlocked.map(themeRowHtml).join("");
    if (locked.length) {
      var firstBand = locked.map(function (t) { return themeBand(t); })
        .sort(function (a, b) { return bandIndex(a) - bandIndex(b); })[0];
      html += '<div class="theme-row locked-summary" role="button" tabindex="0" data-locked-summary="1" ' +
        'aria-label="' + locked.length + ' weitere Themen ab Level ' + esc(firstBand) +
        ', im Vokabeln-Tab freischalten">' +
        '<span class="theme-emoji">🔒</span>' +
        '<div class="theme-info"><div class="theme-title">' + locked.length +
        ' weitere Themen ab Level ' + esc(firstBand) + '</div>' +
        '<div class="setting-sub">dein Training im Vokabeln-Tab schaltet sie frei</div></div>' +
        '<span class="next-go">▶</span></div>';
    }
    return html;
  }

  /** Sammelzeile der gesperrten Themen: fuehrt in den Vokabeln-Tab (volles Training). */
  function wireLockedSummary(root) {
    root.querySelectorAll("[data-locked-summary]").forEach(function (row) {
      var go = function () { showScreen("vocab"); };
      row.addEventListener("click", go);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
  }

  /** Dezente Footer-Links der Hauptscreens: Feedback, Kontakt, Datenschutz. */
  function footerLinksHtml() {
    return '<div class="footer-links">' +
      '<a href="#" data-goto="feedback">Feedback</a> · ' +
      '<a href="#" data-goto="contact">Kontakt</a> · ' +
      '<a href="#" data-goto="privacy">Datenschutz</a>' +
      '</div>';
  }

  function wireFooterLinks(root) {
    root.querySelectorAll("[data-goto]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var t = a.dataset.goto;
        var from = currentScreen; // dahin zurueck, wo der Link angetippt wurde
        if (t === "feedback") renderFeedback(from);
        else if (t === "contact") renderContact(from);
        else if (t === "privacy") renderPrivacy(from);
      });
    });
  }

  function modeTilesHtml(wide) {
    return '<div class="tile-grid' + (wide ? " wide" : "") + '">' +
      MODES.map(function (m) {
        return '<button class="tile" data-mode="' + m.id + '">' +
          '<span class="tile-emoji">' + m.emoji + '</span>' +
          '<span class="tile-title">' + esc(m.title) + '</span>' +
          (wide ? '<span class="tile-desc">' + esc(m.desc) + '</span>' : '') +
          '</button>';
      }).join("") + '</div>';
  }

  function wireModeTiles(root) {
    root.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { startSession(b.dataset.mode); });
    });
  }

  /** Modul-Kacheln (gefuehrte Mini-Lektionen). Rendert nichts, wenn keine
   *  Module im Content sind (defensiv, falls Content-Update noch aussteht). */
  /** Eine einzelne Modul-Kachel (band-gated, mit Schrittzahl/Dauer, Done-State). */
  function moduleTileHtml(m, done) {
    var band = (BANDS.indexOf(m.band) >= 0) ? m.band : "A0";
    var locked = !bandUnlocked(band);
    var isDone = !!done[m.id];
    // Umfang transparent machen: Schrittzahl + grobe Dauer (~2 Schritte/Min).
    var steps = (m.steps || []).length;
    var mins = Math.max(1, Math.ceil(steps / 2));
    var stepInfo = ' · ' + steps + ' Schritte · ~' + mins + ' Min';
    // Fertige Module zeigen den Haken im Emoji-Slot (nicht nur am Rahmen).
    var emoji = locked ? '🔒' : (isDone ? '✅' : esc(m.emoji || "📚"));
    return '<button class="module-tile' + (locked ? ' locked' : '') + (isDone ? ' done' : '') +
      '" data-module="' + esc(m.id) + '"' + (locked ? ' data-locked="' + esc(band) + '"' : '') + '>' +
      '<span class="module-emoji">' + emoji + '</span>' +
      '<span class="module-body"><span class="module-title">' + esc(m.title) +
      (locked ? ' <span class="band-tag">ab ' + esc(band) + '</span>' : '') + '</span>' +
      '<span class="module-sub">' + esc(m.sub || "") + stepInfo + '</span></span>' +
      '</button>';
  }

  /** Eine Modul-Sektion (Ueberschrift + Kacheln); leer -> nichts (Heading entfaellt). */
  function moduleSectionHtml(heading, mods, done) {
    if (!mods.length) return "";
    return '<h2 class="h2">' + heading + '</h2>' +
      '<div class="module-list">' +
      mods.map(function (m) { return moduleTileHtml(m, done); }).join("") +
      '</div>';
  }

  /** Modul-Kacheln, in zwei Sektionen: "📚 Module" (ohne group) und
   *  "🧠 Grammatik" (group === "grammar"). Rendert nichts, wenn keine Module da
   *  sind (defensiv, falls Content-/Grammatik-Update noch aussteht). */
  function moduleTilesHtml() {
    var mods = (CONTENT && CONTENT.modules) || [];
    if (!mods.length) return "";
    var done = state.gamification.counters.modulesDone || {};
    var basic = mods.filter(function (m) { return m.group !== "grammar"; });
    var grammar = mods.filter(function (m) { return m.group === "grammar"; });
    return moduleSectionHtml('📚 Module <span class="h2-sub">· geführte Mini-Lektionen</span>', basic, done) +
      moduleSectionHtml('🧠 Grammatik <span class="h2-sub">· Regeln verstehen &amp; üben</span>', grammar, done);
  }

  function wireModuleTiles(root) {
    root.querySelectorAll("[data-module]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.locked) {
          toast("🔒 Dieses Modul ist ab Level " + b.dataset.locked + " frei.");
          return;
        }
        startSession("module", { moduleId: b.dataset.module });
      });
    });
  }

  function renderHome() {
    var app = $("#app");
    var g = state.gamification;
    var today = todayLog();
    var goal = goalItems();
    var pct = Math.min(100, Math.round(today.answers / goal * 100));
    var snack = dailySnack();
    var lesson = nextLesson();
    var picks = dailyPicks();
    var tile = function (item, label) {
      if (!item) return "";
      return '<div class="today-tile" role="button" tabindex="0" data-today="' + esc(item.id) + '">' +
        '<div class="today-label">' + label + '</div>' +
        '<div class="today-he" dir="rtl" lang="he">' + esc(item.niqqud || item.he) + '</div>' +
        '<div class="today-meta">' + esc(item.translit || "") + ' · ' + esc(item.de) + '</div>' +
        '<button class="icon-btn small-btn" data-say="' + esc(item.id) + '" title="Anhören">🔊</button></div>';
    };
    app.innerHTML =
      '<header class="brand"><div class="brand-title">🕊️ Tacheles</div>' +
      '<div class="brand-sub">dein Schalömchen</div></header>' +
      '<section class="stats-row tappable" id="stats-row" role="button" tabindex="0" title="Fortschritt ansehen">' +
      '<div class="stat" title="Streak-Freezes retten verpasste Tage"><div class="stat-num">🔥 ' + g.streakDays +
      (g.streakDays > 0 && freezesAvailable() > 0 ? ' <span class="freeze-mini">❄️' + freezesAvailable() + '</span>' : '') +
      '</div><div class="stat-label">Streak</div></div>' +
      '<div class="stat"><div class="stat-num">⭐ ' + g.xpTotal + '</div><div class="stat-label">XP</div></div>' +
      '<div class="stat"><div class="stat-num">🏅 ' + g.masteredCount + '</div><div class="stat-label">gemeistert</div></div>' +
      '</section>' +
      // Kurs-Karte: DER primaere CTA (WS-A).
      (lesson ?
        '<section class="card goal-card"><div class="setting-label">🎓 Deine Lektion</div>' +
        '<div class="setting-sub">' + esc(lesson.emoji + " " + lesson.title) + ' · ' + esc(lesson.band) +
        (lessonState(lesson.id).step > 0 ? ' · angefangen' : '') + '</div>' +
        '<button class="btn primary big" id="cta-lesson">▶ Weiterlernen</button></section>' :
        (courseAvailable() ?
          '<section class="card goal-card"><div class="setting-label">🎉 Kurs komplett!</div>' +
          '<button class="btn primary big" id="cta-lesson-vocab">▶ Vokabeln trainieren</button></section>' :
          '<section class="card goal-card"><button class="btn primary big" id="cta-lesson-vocab">▶ Los geht’s</button></section>')) +
      // Heute-Block (WS-D): Snack des Tages + Buchstabe/Wort des Tages.
      '<section class="card today-card"><div class="setting-label">🌅 Heute</div>' +
      (snack ?
        '<div class="snack-card"><span class="tile-emoji">' + esc(snack.emoji) + '</span>' +
        '<div class="theme-info"><div class="theme-title">' + esc(snack.title) + '</div>' +
        '<div class="setting-sub">Häppchen des Tages · 2 Minuten' +
        (state.profile.snackVocab ? ' · + fällige Vokabeln' : '') + '</div></div>' +
        '<button class="btn primary" id="btn-snack">▶</button></div>' : '') +
      '<div class="today-tiles">' + tile(picks.letter, "Buchstabe des Tages") + tile(picks.word, "Wort des Tages") + '</div>' +
      '</section>' +
      '<section class="card goal-card">' +
      '<div class="goal-line"><span>Heute fällig: <b>' + dueCount() + '</b> · Neu: <b>' + newCount() + '</b></span>' +
      '<span>' + today.answers + ' / ' + goal + '</span></div>' +
      '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      (today.answers > 0 ?
        '<div class="today-line">Heute: ' + today.answers + ' Antworten · ' +
        Math.round((today.correct || 0) / today.answers * 100) + ' % richtig' +
        ((today.mastered || 0) > 0 ? ' · 🏅 ' + today.mastered + ' neu gemeistert' : '') + '</div>' : "") +
      (today.goalMet ? '<div class="goal-done">Tagesziel erreicht – schön! 🎉</div>' : "") +
      '</section>' +
      '<div class="footer-tag">Reden wir Tacheles. 🕊️</div>' + footerLinksHtml();
    // Verdrahtung: stats-Tipp, Kurs-CTA, Snack, Tages-Kacheln, Footer.
    var stats = $("#stats-row");
    if (stats) {
      var goProg = function () { showScreen("progress"); };
      stats.addEventListener("click", goProg);
      stats.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goProg(); }
      });
    }
    var cta = $("#cta-lesson");
    if (cta && lesson) cta.addEventListener("click", function () { startSession("lesson", { lessonId: lesson.id }); });
    var ctaV = $("#cta-lesson-vocab");
    if (ctaV) ctaV.addEventListener("click", function () { startSession("smart"); });
    var sn = $("#btn-snack");
    if (sn && snack) sn.addEventListener("click", function () {
      startSession("snack", { snackId: snack.id, withVocab: state.profile.snackVocab });
    });
    app.querySelectorAll("[data-today]").forEach(function (row) {
      var go = function () { startSession("smart", { itemIds: [row.dataset.today], size: 3, label: "🌅 Heute" }); };
      row.addEventListener("click", go);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
    app.querySelectorAll(".today-card [data-say]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var it = itemById(b.dataset.say);
        if (it) say(it);
      });
    });
    wireFooterLinks(app);
  }

  /** Eine Station des gefuehrten Pfads (Lernen-Screen). */
  function pathRowHtml(theme, isNext) {
    var s = themeStats(theme);
    var band = themeBand(theme);
    var locked = !bandUnlocked(band);
    var status, cls;
    if (locked) { status = "🔒"; cls = "locked"; isNext = false; }
    else if (s.pct >= 80) { status = "✓"; cls = "done"; }
    else if (isNext) { status = "▶"; cls = "next"; }
    else if (s.started) { status = "…"; cls = "started"; }
    else { status = ""; cls = "todo"; }
    return '<div class="path-row ' + cls + '" role="button" tabindex="0" data-theme="' + esc(theme.id) + '"' +
      (locked ? ' data-locked="' + esc(band) + '" aria-disabled="true" aria-label="' +
        esc(theme.title) + ' – gesperrt bis Level ' + esc(band) + '"' : '') + '>' +
      '<span class="path-status">' + status + '</span>' +
      '<span class="theme-emoji">' + esc(theme.emoji) + '</span>' +
      '<div class="theme-info"><div class="theme-title">' + esc(theme.title) +
      (isNext ? ' <span class="path-next-tag">als Nächstes</span>' : (locked ? ' <span class="band-tag">ab ' + esc(band) + '</span>' : '')) + '</div>' +
      '<div class="bar mini"><div class="bar-fill" style="width:' + s.pct + '%"></div></div></div>' +
      '<span class="theme-count">' + s.mastered + '/' + s.total + '</span>' +
      '</div>';
  }

  /** Lernen-Tab (interim, T7 ersetzt das durch die Kurs-UI): Pfad + Smart-CTA.
   *  Module und "Alle Modi" sind in T5 in die Grammatik-/Vokabeln-Tabs gewandert. */
  /** Kurs-Tab (WS-B): Lektionspfad in Sektionen, Zustaende, Vorschau, Quereinstieg. */
  function renderCourse() {
    var app = $("#app");
    if (!courseAvailable()) {
      // Defensiv: ohne course.js bleibt der Tab nutzbar (Hinweis + Ausweich-CTA).
      app.innerHTML = '<header class="brand"><div class="brand-title">Lernen</div></header>' +
        '<section class="card"><p>Der Kurs ist in dieser Installation nicht geladen.</p>' +
        '<button class="btn primary big" id="cta-fallback">▶ Smart-Session</button></section>' + footerLinksHtml();
      $("#cta-fallback").addEventListener("click", function () { startSession("smart"); });
      wireFooterLinks(app);
      return;
    }
    var next = nextLesson();
    var html = '<header class="brand"><div class="brand-title">Lernen</div>' +
      '<div class="brand-sub">dein Kurs: eine Lektion nach der anderen</div></header>';
    if (next) {
      html += '<section class="card goal-card"><div class="setting-label">🎓 Deine Lektion</div>' +
        '<div class="setting-sub">' + esc(next.emoji + " " + next.title) + ' · ' + esc(next.band) + '</div>' +
        '<button class="btn primary big" id="cta-lesson-go">▶ Weiterlernen</button></section>';
    } else {
      html += '<section class="card goal-card"><div class="setting-label">🎉 Kurs komplett!</div>' +
        '<div class="setting-sub">Alle Lektionen erledigt – im Vokabeln-Tab bleibt es frisch.</div></section>';
    }
    COURSE.sections.forEach(function (sec) {
      var lessons = COURSE.lessons.filter(function (l) { return l.section === sec.id; });
      if (!lessons.length) return;
      var done = lessons.filter(function (l) { return lessonState(l.id).done; }).length;
      html += '<h2 class="h2 course-section-h">' + esc(sec.emoji) + ' ' + esc(sec.title) +
        ' <span class="h2-sub">· ' + esc(sec.band) + ' · ' + done + '/' + lessons.length + '</span></h2>' +
        '<div class="theme-list">' +
        lessons.map(function (l) {
          var i = lessonIndex(l.id);
          var st = lessonState(l.id);
          var isNext = next && l.id === next.id;
          var locked = !lessonUnlocked(i);
          var cls = st.done ? "done" : (isNext ? "next" : (locked ? "locked" : "open"));
          var mark = st.done ? "✓" : (isNext ? "▶" : (locked ? "🔒" : ""));
          var resume = !st.done && st.step > 0 ? ' · fortsetzen ab Schritt ' + (st.step + 1) : '';
          var entryTag = state.course.entry === l.id ? ' <span class="entry-tag">dein Einstieg</span>' : '';
          // Buchstaben-Lektionen zaehlen Buchstaben, nicht Woerter (Mehrheit entscheidet).
          var letters = l.newItemIds.filter(function (id) { var it = itemById(id); return it && it.type === "letter"; }).length;
          var noun = letters * 2 > l.newItemIds.length ? ' neue Buchstaben' : ' neue Wörter';
          return '<div class="theme-row lesson-row ' + cls + '" role="button" tabindex="0" data-lesson="' + esc(l.id) + '"' +
            (locked ? ' aria-disabled="true"' : '') + '>' +
            '<span class="path-status">' + mark + '</span>' +
            '<span class="theme-emoji">' + esc(l.emoji) + '</span>' +
            '<div class="theme-info"><div class="theme-title">' + esc(l.title) + entryTag + '</div>' +
            '<div class="setting-sub">' + l.newItemIds.length + noun + resume + '</div></div>' +
            '</div>';
        }).join("") + '</div>';
    });
    app.innerHTML = html + footerLinksHtml();
    var go = $("#cta-lesson-go");
    if (go && next) go.addEventListener("click", function () { startSession("lesson", { lessonId: next.id }); });
    app.querySelectorAll("[data-lesson]").forEach(function (row) {
      var act = function () {
        var l = lessonById(row.dataset.lesson);
        if (!l) return;
        if (!lessonUnlocked(lessonIndex(l.id))) {
          toast("🔒 Erst die Lektion davor abschließen – der Kurs ist ein Pfad.");
          return;
        }
        showLessonPreview(l);
      };
      row.addEventListener("click", act);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); }
      });
    });
    wireFooterLinks(app);
    // Waehrend der Tour (Spotlight-Overlay/Demo) kein Einstiegs-Overlay stapeln;
    // der Quereinstieg wird beim naechsten natuerlichen Kurs-Besuch angeboten.
    if (!tourDemo && !document.querySelector(".tour-dim")) maybeOfferEntry();
  }

  /** Vorschau-Overlay: Woerter der Lektion + Grammatikpunkt + Start. */
  function showLessonPreview(lesson) {
    var o = buildOverlay(lesson.emoji + " " + lesson.title);
    o.box.classList.add("lesson-preview");
    var st = lessonState(lesson.id);
    var list = el("div", "done-review");
    lesson.newItemIds.forEach(function (id) {
      var item = itemById(id);
      if (!item) return;
      var row = el("div", "done-review-row");
      var he = el("span", "done-review-he", item.he);
      he.dir = "rtl"; he.lang = "he";
      row.appendChild(he);
      if (item.translit) row.appendChild(el("span", "done-review-tr", item.translit));
      row.appendChild(el("span", "done-review-de", item.de));
      var p = btn("🔊", "icon-btn small-btn", function () { say(item); });
      row.appendChild(p);
      list.appendChild(row);
    });
    o.box.appendChild(list);
    if (lesson.grammar && lesson.grammar.moduleId) {
      var gm = moduleById(lesson.grammar.moduleId);
      if (gm) o.box.appendChild(el("div", "setting-sub", "🧠 Grammatik: " + gm.title));
    }
    if (st.done) o.box.appendChild(el("div", "setting-sub", "✓ Schon erledigt – nochmal spielen setzt nichts zurück."));
    var actions = el("div", "overlay-actions");
    var startBtn = btn(st.step > 0 && !st.done ? "▶ Fortsetzen" : "▶ Lektion starten", "btn primary big", function () {
      o.close();
      startSession("lesson", { lessonId: lesson.id });
    });
    startBtn.id = "btn-lesson-start";
    actions.appendChild(startBtn);
    actions.appendChild(btn("Abbrechen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }

  /** Quereinstieg (WS-B): beim ersten Kurs-Besuch mit Vorkenntnissen anbieten. */
  function maybeOfferEntry() {
    if (!courseAvailable() || state.course.entry) return;
    var anyDone = Object.keys(state.course.lessons).some(function (id) { return state.course.lessons[id].done; });
    if (anyDone) return;
    var rec = recommendedEntryLesson();
    if (!rec || lessonIndex(rec.id) === 0) return; // Anfaenger: kein Overlay noetig
    var o = buildOverlay("🎯 Wo steigst du ein?");
    o.box.appendChild(el("div", "overlay-text",
      "Du kannst schon einiges! Die ersten " + lessonIndex(rec.id) + " Lektionen sitzen bei dir zu großen Teilen. " +
      "Empfehlung: starte bei „" + rec.emoji + " " + rec.title + "“. Übersprungene Lektionen werden als erledigt " +
      "markiert – du kannst sie jederzeit nachholen."));
    var actions = el("div", "overlay-actions");
    var ok = btn("Ab „" + rec.title + "“ starten", "btn primary big", function () {
      confirmEntry(rec.id);
      o.close();
      renderCourse();
      toast("🎯 Einstieg gesetzt. Frühere Lektionen gelten als erledigt.");
    });
    ok.id = "btn-entry-ok";
    var first = btn("Ganz vorn anfangen", "btn ghost big", function () {
      state.course.entry = COURSE.lessons[0].id; // Entscheidung merken: kein erneutes Overlay
      saveState();
      o.close();
    });
    first.id = "btn-entry-first";
    actions.appendChild(ok);
    actions.appendChild(first);
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }

  /** Vokabeln-Tab (WS-E): starkes freies Training auf erster Ebene. */
  function renderVocab() {
    var app = $("#app");
    var next = recommendedTheme();
    app.innerHTML =
      '<header class="brand"><div class="brand-title">Vokabeln</div>' +
      '<div class="brand-sub">dein freies Training – so viel du willst</div></header>' +
      '<section class="card power-card">' +
      '<div class="setting-label">⚡ Power-Training</div>' +
      '<div class="setting-sub">Fälliges + Neues im smarten Mix. Wie lang?</div>' +
      '<div class="data-actions" style="margin-top:10px">' +
      '<button class="btn" data-power="5">5 Aufgaben</button>' +
      '<button class="btn primary" id="cta-power" data-power="10">10 Aufgaben</button>' +
      '<button class="btn" data-power="20">20 Aufgaben</button>' +
      '</div></section>' +
      '<h2 class="h2">Alle Modi</h2>' + modeTilesHtml(true) +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">🏅 Mastery-Check</div>' +
      '<div class="setting-sub">' + esc(MASTERY_RULE_TEXT) + '</div></div>' +
      '<button class="btn" id="btn-mastercheck">Start</button></section>' +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">💪 Knacknüsse</div>' +
      '<div class="setting-sub">Deine am häufigsten vergessenen Wörter gezielt üben.</div></div>' +
      '<button class="btn" id="btn-hard">Start</button></section>' +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">📖 Vokabelliste</div>' +
      '<div class="setting-sub">Alle Wörter nach Level durchsehen und anhören.</div></div>' +
      '<button class="btn" id="btn-vocab">Öffnen</button></section>' +
      '<h2 class="h2">Themen-Training <span class="h2-sub">· ✓ sitzt · ▶ dran · antippen zum Üben</span></h2>' +
      '<div class="theme-list path-list">' +
      CONTENT.themes.map(function (t) {
        return pathRowHtml(t, next && t.id === next.id);
      }).join("") + '</div>' + footerLinksHtml();
    app.querySelectorAll("[data-power]").forEach(function (b) {
      b.addEventListener("click", function () { startSession("smart", { size: parseInt(b.dataset.power, 10) || 10 }); });
    });
    var mch = $("#btn-mastercheck");
    if (mch) mch.addEventListener("click", function () { startSession("mastercheck"); });
    $("#btn-hard").addEventListener("click", function () {
      var hard = CONTENT.items.filter(function (it) {
        var e = state.srs[it.id]; return e && (e.lapses || 0) >= 2;
      }).sort(function (a, b) { return state.srs[b.id].lapses - state.srs[a.id].lapses; }).slice(0, 5);
      if (!hard.length) { toast("🕊️ Keine Knacknüsse – alles im Griff!"); return; }
      startSession("smart", { itemIds: hard.map(function (it) { return it.id; }) });
    });
    $("#btn-vocab").addEventListener("click", function () { renderVocabBrowser(effectiveBand(), false, "vocab"); });
    wireModeTiles(app);
    wireThemeRows(app);
    wireFooterLinks(app);
  }

  /** Grammatik-Tab (WS-A): Module nach Level + Empfehlung + Lesen-Block. */
  function renderGrammar() {
    var app = $("#app");
    var mods = (CONTENT && CONTENT.modules) || [];
    var done = state.gamification.counters.modulesDone || {};
    var grammar = mods.filter(function (m) { return m.group === "grammar"; });
    var basic = mods.filter(function (m) { return m.group !== "grammar"; });
    // "empfohlen fuer dich": erstes offene, noch nicht erledigte Grammatik-Modul.
    var rec = null;
    for (var i = 0; i < grammar.length; i++) {
      var b = (BANDS.indexOf(grammar[i].band) >= 0) ? grammar[i].band : "A0";
      if (bandUnlocked(b) && !done[grammar[i].id]) { rec = grammar[i].id; break; }
    }
    var byBand = BANDS.map(function (band) {
      var list = grammar.filter(function (m) { return (m.band || "A0") === band; });
      if (!list.length) return "";
      return '<h2 class="h2 gram-band-h">🧠 ' + band + '</h2><div class="module-list">' +
        list.map(function (m) {
          var tile = moduleTileHtml(m, done);
          if (m.id === rec) tile = tile.replace('class="module-tile', 'class="module-tile recommended');
          return tile;
        }).join("") + '</div>';
    }).join("");
    app.innerHTML =
      '<header class="brand"><div class="brand-title">Grammatik</div>' +
      '<div class="brand-sub">Regeln verstehen &amp; üben – plus Lesen lernen</div></header>' +
      (rec ? '<div class="setting-sub rec-tag">▶ empfohlen für dich ist markiert</div>' : '') +
      byBand +
      '<h2 class="h2">👓 Lesen</h2>' +
      '<section class="card" id="reading-block">' +
      '<div class="setting-row"><div><div class="setting-label">👓 Lesen lernen</div>' +
      '<div class="setting-sub">Buchstabe für Buchstabe zum ersten Wort</div></div>' +
      '<button class="btn" id="btn-reading-path">Start</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">🔤 Alef-Bet-Tafel</div>' +
      '<div class="setting-sub">Alle 27 Buchstaben mit deinem Lernstand</div></div>' +
      '<button class="btn" id="btn-alefbet">Ansehen</button></div>' +
      '<div id="drill-list"></div>' + // T6 fuellt die Silben-Drills hier ein
      '</section>' +
      moduleSectionHtml('📚 Module <span class="h2-sub">· geführte Mini-Lektionen</span>', basic, done) +
      footerLinksHtml();
    $("#btn-reading-path").addEventListener("click", function () {
      startSession("module", { moduleObj: buildReadingModule() });
    });
    $("#btn-alefbet").addEventListener("click", function () { renderAlefbetChart("grammar"); });
    // T6: Silben-Trainer-Drills als Zeilen in #drill-list.
    var dl = $("#drill-list");
    if (dl && READING && READING.drills.length) {
      dl.innerHTML = '<div class="setting-label" style="margin-top:12px">🔡 Silben-Trainer</div>' +
        READING.drills.map(function (d) {
          var lvl = d.level === 1 ? "Silben" : (d.level === 2 ? "Wörter" : "Tempo");
          return '<div class="setting-row"><div><div class="setting-label">' + esc(d.title) + '</div>' +
            '<div class="setting-sub">Stufe ' + d.level + ' · ' + lvl + '</div></div>' +
            '<button class="btn" data-drill="' + esc(d.id) + '">Üben</button></div>';
        }).join("");
      dl.querySelectorAll("[data-drill]").forEach(function (b) {
        b.addEventListener("click", function () { startSession("reading", { drillId: b.dataset.drill }); });
      });
    }
    wireModuleTiles(app);
    wireFooterLinks(app);
  }

  function renderProgress() {
    var app = $("#app");
    var totalItems = CONTENT.items.length;
    var answers = 0, correct = 0;
    Object.keys(state.log).forEach(function (k) {
      answers += state.log[k].answers || 0;
      correct += state.log[k].correct || 0;
    });
    var hitRate = answers ? Math.round(correct / answers * 100) : 0;
    var week = currentWeekDays();
    var metCount = week.filter(function (d) { return (state.log[d] || {}).goalMet; }).length;
    var dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    var today = todayStr();
    var weekHtml = week.map(function (d, i) {
      var met = (state.log[d] || {}).goalMet;
      return '<div class="day-dot' + (met ? " met" : "") + (d === today ? " today" : "") + '">' +
        (met ? "✓" : dayNames[i]) + '</div>';
    }).join("");

    app.innerHTML =
      '<header class="brand"><div class="brand-title">Fortschritt</div>' +
      '<div class="brand-sub">ehrlich gemessen: was wirklich sitzt</div></header>' +
      '<section class="card big-metric">' +
      '<div class="big-metric-num">' + state.gamification.masteredCount + ' / ' + unlockedItemCount() + '</div>' +
      '<div class="big-metric-label">Wörter gemeistert · in deinen Leveln<br>' +
      '<span class="h2-sub">insgesamt ' + totalItems + ' Wörter</span></div>' +
      '</section>' +
      (function () {
        // Survival-Check ehrlich einordnen: vor ~30 gemeisterten A0-Woertern
        // ist er eher demotivierend als aussagekraeftig.
        var a0 = {};
        CONTENT.themes.forEach(function (t) { if (t.band === "A0") a0[t.id] = true; });
        var a0Mastered = countMastered(function (it) { return a0[it.theme]; });
        var ready = a0Mastered >= 30;
        return '<section class="card exam-card">' +
          '<div><div class="setting-label">🎓 Survival-Check (A0)</div>' +
          '<div class="setting-sub">Kannst du die Basics ohne Stützräder? 12 Fragen, ohne Hilfe.' +
          ((state.gamification.counters.bestExam || 0) > 0 ? ' Bestes Ergebnis: <b>' + state.gamification.counters.bestExam + '/12</b>' : '') +
          (ready ? '' : '<br>💡 Empfohlen ab ~30 gemeisterten A0-Wörtern (du: ' + a0Mastered + ').') +
          '</div></div>' +
          '<button class="btn ' + (ready ? 'primary' : 'ghost') + '" id="btn-exam">Start</button>' +
          '</section>';
      })() +
      '<section class="card exam-card">' +
      '<div><div class="setting-label">🔤 Alef-Bet-Tafel</div>' +
      '<div class="setting-sub">Alle 27 Buchstaben im Überblick, mit deinem Lernstand.</div></div>' +
      '<button class="btn" id="btn-alefbet">Ansehen</button>' +
      '</section>' +
      (state.gamification.masteredCount > 0 ?
        '<section class="card exam-card">' +
        '<div><div class="setting-label">🏅 Mastery-Check</div>' +
        '<div class="setting-sub">Sitzt das wirklich noch? Kurze Prüf-Häppchen über deine gemeisterten Wörter, ' +
        'mit der Möglichkeit, einzelne zurückzunehmen.</div>' +
        '<div class="setting-sub" style="margin-top:6px">' + esc(MASTERY_RULE_TEXT) + '</div></div>' +
        '<button class="btn" id="btn-mastercheck">Start</button>' +
        '</section>' : '') +
      (function () {
        // Knacknuesse: die 5 am haeufigsten vergessenen Woerter (lapses >= 2)
        var hard = CONTENT.items.filter(function (it) {
          var e = state.srs[it.id];
          return e && (e.lapses || 0) >= 2;
        }).sort(function (a, b) {
          var ea = state.srs[a.id], eb = state.srs[b.id];
          return (eb.lapses - ea.lapses) || ((ea.mastery || 0) - (eb.mastery || 0));
        }).slice(0, 5);
        var html = '<section class="card"><div class="setting-label">💪 Knacknüsse</div>';
        if (!hard.length) {
          html += '<div class="setting-sub" style="margin-top:6px">🕊️ Keine Knacknüsse – alles im Griff!</div></section>';
          return html;
        }
        html += '<div class="setting-sub">Deine am häufigsten vergessenen Wörter:</div>' +
          '<div class="hard-list">' +
          hard.map(function (it) {
            return '<div class="done-review-row">' +
              '<span class="done-review-he" dir="rtl" lang="he">' + esc(it.he) + '</span>' +
              '<span class="done-review-de">' + esc(it.de) + '</span>' +
              '<span class="hard-lapses">' + state.srs[it.id].lapses + '× vergessen</span>' +
              '<button class="icon-btn small-btn" data-say="' + esc(it.id) + '">🔊</button>' +
              '</div>';
          }).join("") +
          '</div><button class="btn primary" id="btn-hard" data-ids="' +
          hard.map(function (it) { return it.id; }).join(",") + '">💪 Jetzt üben</button></section>';
        return html;
      })() +
      '<section class="card">' +
      '<div class="kv-row"><span>Diese Woche gelernt</span><b>' + metCount + ' von 7 Tagen</b></div>' +
      '<div class="week-strip">' + weekHtml + '</div>' +
      '<div class="kv-row" style="margin-top:14px"><span>Letzte 14 Tage</span><span class="h2-sub">Antworten pro Tag</span></div>' +
      (function () {
        // Mini-Aktivitaets-Historie: ein Balken pro Tag, heute markiert.
        var days = [], d = new Date();
        d.setDate(d.getDate() - 13);
        var max = 1;
        for (var i = 0; i < 14; i++) {
          var k = dateStr(d);
          var a = (state.log[k] || {}).answers || 0;
          if (a > max) max = a;
          days.push({ k: k, a: a });
          d.setDate(d.getDate() + 1);
        }
        return '<div class="hist-strip">' + days.map(function (x) {
          var h = Math.max(6, Math.round(x.a / max * 40));
          return '<div class="hist-col' + (x.k === today ? " today" : "") + '" title="' + x.k + ': ' + x.a + '">' +
            '<div class="hist-bar' + (x.a ? " on" : "") + '" style="height:' + h + 'px"></div></div>';
        }).join("") + '</div>';
      })() +
      '</section>' +
      '<section class="card">' +
      '<div class="kv-row"><span>Review-Trefferquote</span><b>' + (answers ? hitRate + " %" : "–") + '</b></div>' +
      '<div class="kv-row"><span>Antworten gesamt</span><b>' + answers + '</b></div>' +
      '<div class="kv-row"><span>XP gesamt</span><b>' + state.gamification.xpTotal + '</b></div>' +
      '<div class="kv-row"><span>Streak</span><b>🔥 ' + state.gamification.streakDays + ' Tage</b></div>' +
      '<div class="kv-row"><span>Streak-Freezes übrig</span><b>❄️ ' + freezesAvailable() + '</b></div>' +
      '</section>' +
      '<h2 class="h2">Abzeichen</h2>' +
      '<section class="card"><div class="ach-grid">' +
      ACHIEVEMENTS.map(function (a) {
        var got = state.gamification.achievements.indexOf(a.id) >= 0;
        return '<div class="ach' + (got ? " got" : "") + '" title="' + esc(a.title) + '">' +
          '<span class="ach-emoji">' + a.emoji + '</span>' +
          '<span class="ach-title">' + esc(a.title) + '</span>' +
          '</div>';
      }).join("") +
      '</div></section>' +
      '<h2 class="h2">Themen <span class="h2-sub">· antippen zum gezielten Üben</span></h2>' +
      '<div class="theme-list">' + themeListHtml() + '</div>' +
      '<h2 class="h2">Daten</h2>' +
      '<section class="card"><div class="data-actions">' +
      '<button class="btn" id="btn-export">📤 Export</button>' +
      '<button class="btn" id="btn-import">📥 Import</button>' +
      '</div></section>' + footerLinksHtml();
    $("#btn-export").addEventListener("click", exportState);
    $("#btn-import").addEventListener("click", importState);
    $("#btn-exam").addEventListener("click", function () { startSession("exam"); });
    $("#btn-alefbet").addEventListener("click", renderAlefbetChart);
    var mcheckBtn = $("#btn-mastercheck");
    if (mcheckBtn) mcheckBtn.addEventListener("click", function () { startSession("mastercheck"); });
    var hardBtn = $("#btn-hard");
    if (hardBtn) {
      hardBtn.addEventListener("click", function () {
        startSession("smart", { itemIds: hardBtn.dataset.ids.split(",") });
      });
    }
    app.querySelectorAll("[data-say]").forEach(function (b) {
      b.addEventListener("click", function () {
        var it = itemById(b.dataset.say);
        if (it) say(it);
      });
    });
    wireThemeRows(app);
    wireLockedSummary(app);
    wireFooterLinks(app);
  }

  function renderProfile() {
    var app = $("#app");
    var p = state.profile;
    function opt(v, label, cur) {
      return '<option value="' + v + '"' + (String(cur) === String(v) ? " selected" : "") + '>' + label + '</option>';
    }
    app.innerHTML =
      '<header class="brand"><div class="brand-title">Profil</div>' +
      '<div class="brand-sub">Einstellungen &amp; Daten</div></header>' +
      '<section class="card">' +
      '<div class="setting-row"><div><div class="setting-label">Tagesziel</div>' +
      '<div class="setting-sub">Streak zählt Tage mit erreichtem Ziel</div></div>' +
      '<select id="goal-sel">' +
      opt(5, "5 Min", p.dailyGoalMin) + opt(10, "10 Min", p.dailyGoalMin) +
      opt(15, "15 Min", p.dailyGoalMin) + opt(20, "20 Min", p.dailyGoalMin) +
      '</select></div>' +
      '<div class="setting-row"><div><div class="setting-label">Stützräder (Niqqud &amp; Umschrift)</div>' +
      '<div class="setting-sub">verblassen mit wachsender Sicherheit</div></div>' +
      '<select id="fade-sel">' +
      opt("auto", "Automatisch", p.fadeMode) + opt("off_early", "Früher weg", p.fadeMode) +
      opt("keep", "Immer zeigen", p.fadeMode) +
      '</select></div>' +
      '<div class="setting-row"><div><div class="setting-label">Audio-Autoplay</div>' +
      '<div class="setting-sub">Aussprache automatisch abspielen</div></div>' +
      '<input type="checkbox" id="autoplay-chk"' + (p.autoplay ? " checked" : "") + '></div>' +
      '<div class="setting-row"><div><div class="setting-label">Häppchen mit Vokabeln</div>' +
      '<div class="setting-sub">hängt dem Tages-Häppchen 2-3 fällige Wörter an</div></div>' +
      '<input type="checkbox" id="snackvocab-chk"' + (p.snackVocab ? " checked" : "") + '></div>' +
      '</section>' +
      '<h2 class="h2">Inhalt &amp; Level</h2>' +
      '<section class="card">' +
      '<div class="setting-row"><div><div class="setting-label">Inhalts-Level</div>' +
      '<div class="setting-sub">Bis zu welchem Niveau Themen erscheinen. „Automatisch“ schaltet mit deinem Fortschritt frei.</div></div>' +
      '<select id="level-sel">' +
      LEVEL_CAPS.map(function (v) { return opt(v, v === "auto" ? "Automatisch" : v, p.levelCap); }).join("") +
      '</select></div>' +
      (p.levelCap !== "auto" && bandIndex(p.levelCap) < bandIndex(p.unlockedBand) ?
        '<div class="setting-sub" style="margin-top:-4px;color:var(--accent)">Du siehst gerade weniger, ' +
        'als du schon freigeschaltet hast (' + esc(p.levelCap) + ' &lt; ' + esc(p.unlockedBand) + ').</div>' : '') +
      '<div class="kv-row"><span>Erreichtes Level</span><b>' + esc(p.unlockedBand) + '</b></div>' +
      '<div class="setting-row"><div><div class="setting-label">Einstufungstest</div>' +
      '<div class="setting-sub">Schon Vorkenntnisse? Lass dich passend einstufen.' +
      (p.placementDone ? ' (bereits gemacht)' : '') + '</div></div>' +
      '<button class="btn" id="btn-placement">Starten</button></div>' +
      '</section>' +
      '<section class="card">' +
      '<div class="kv-row"><span>Hebräische Stimme (Vorlesen)</span><b>' +
      (TTS.available ? (TTS.hasHebrew() ? "✓ gefunden" : "keine gefunden") : "nicht verfügbar") + '</b></div>' +
      '<div class="kv-row"><span>Spracherkennung (Sprechen)</span><b>' +
      (STT.available() ? "✓ verfügbar" : "nicht verfügbar") + '</b></div>' +
      '</section>' +
      '<h2 class="h2">Statistik</h2>' +
      '<section class="card">' +
      '<div class="kv-row"><span>Antworten gesamt</span><b>' + (state.gamification.answersTotal || 0) + '</b></div>' +
      '<div class="kv-row"><span>Wörter gemeistert</span><b>🏅 ' + state.gamification.masteredCount + '</b></div>' +
      '<div class="kv-row"><span>Abzeichen</span><b>' + state.gamification.achievements.length + ' / ' + ACHIEVEMENTS.length + '</b></div>' +
      '<div class="kv-row"><span>Beste Blitz-Runde</span><b>⚡ ' + (state.gamification.counters.bestBlitz || 0) + ' richtig</b></div>' +
      '<div class="kv-row"><span>Streak-Freezes übrig</span><b>❄️ ' + freezesAvailable() + '</b></div>' +
      '</section>' +
      '<h2 class="h2">Mehr</h2>' +
      '<section class="card" id="more-card">' +
      '<div class="setting-row"><div><div class="setting-label">📖 Vokabelliste</div>' +
      '<div class="setting-sub">Alle Wörter nach Level durchsehen, anhören, Aussprache melden</div></div>' +
      '<button class="btn" id="btn-vocab">Öffnen</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">💬 Feedback</div>' +
      '<div class="setting-sub">Notizen sammeln und als GitHub-Issue oder E-Mail übermitteln</div></div>' +
      '<button class="btn" id="btn-feedback">Öffnen</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">📮 Kontakt / Impressum</div>' +
      '<div class="setting-sub">Wer hinter Tacheles steckt</div></div>' +
      '<button class="btn" id="btn-contact">Öffnen</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">🔒 Datenschutz</div>' +
      '<div class="setting-sub">Was mit deinen Daten passiert (kurz: sie bleiben bei dir)</div></div>' +
      '<button class="btn" id="btn-privacy">Öffnen</button></div>' +
      '<div class="setting-row"><div><div class="setting-label">✨ Einführung ansehen</div>' +
      '<div class="setting-sub">Die kurze Tour durch die App, jederzeit erneut</div></div>' +
      '<button class="btn" id="btn-tour">Starten</button></div>' +
      '</section>' +
      '<h2 class="h2">Daten</h2>' +
      '<section class="card">' +
      '<div class="data-actions data-grid">' +
      '<button class="btn" id="btn-export">📤 Export</button>' +
      '<button class="btn" id="btn-import">📥 Import</button>' +
      '<button class="btn" id="btn-sync-copy">🔗 Sync-Code kopieren</button>' +
      '<button class="btn" id="btn-sync-paste">📋 Sync-Code einfügen</button>' +
      '</div>' +
      '<p class="setting-sub" style="margin:12px 0 0">Dein Fortschritt liegt nur auf diesem Gerät. ' +
      'Per Datei (Export/Import) oder Sync-Code nimmst du ihn mit – beim Einspielen kannst du ' +
      'zusammenführen statt ersetzen. Tipp: Die Export-Datei kann auch in einem ' +
      'OneDrive-/Google-Drive-Ordner liegen.</p>' +
      '<p class="setting-sub" style="margin:8px 0 0">Der Sync-Code enthält deinen gesamten ' +
      'Lernfortschritt und landet in der Zwischenablage – auf Geräten mit Cloud-Zwischenablage ' +
      '(Windows/Android) kann er dabei synchronisiert werden.</p>' +
      '<p class="setting-sub" style="margin:8px 0 0"><b>Datenschutz:</b> Alle Lerndaten bleiben im ' +
      'localStorage dieses Geräts. Kein Server, keine Konten, keine Telemetrie. Einzige Ausnahme ist ' +
      'die Spracherkennung im Sprechen-Modus (Cloud des Browser-Herstellers, siehe Hinweis vor der ' +
      'ersten Aufnahme). Über Export und Zurücksetzen hast du die volle Kontrolle über deine Daten.</p>' +
      '<div class="data-actions" style="margin-top:14px">' +
      '<button class="btn danger" id="btn-reset">🗑 Zurücksetzen</button>' +
      '</div></section>' +
      '<div class="footer-tag">🔊 Sprach-Samples erzeugt mit ElevenLabs (elevenlabs.io)</div>' +
      '<div class="footer-tag">Tacheles · Version ' + esc(CONTENT.version) + ' · Reden wir Tacheles. 🕊️</div>' +
      footerLinksHtml();
    $("#goal-sel").addEventListener("change", function (e) {
      state.profile.dailyGoalMin = parseInt(e.target.value, 10) || 5;
      saveState();
    });
    $("#fade-sel").addEventListener("change", function (e) {
      state.profile.fadeMode = e.target.value;
      saveState();
    });
    $("#autoplay-chk").addEventListener("change", function (e) {
      state.profile.autoplay = !!e.target.checked;
      saveState();
    });
    $("#snackvocab-chk").addEventListener("change", function (e) {
      state.profile.snackVocab = !!e.target.checked;
      saveState();
    });
    $("#level-sel").addEventListener("change", function (e) {
      state.profile.levelCap = LEVEL_CAPS.indexOf(e.target.value) >= 0 ? e.target.value : "auto";
      saveState();
      renderProfile(); // Sub-Zeile "Erreichtes Level" bleibt, Gating wirkt sofort
    });
    $("#btn-placement").addEventListener("click", function () { startPlacement(false); });
    $("#btn-vocab").addEventListener("click", function () { renderVocabBrowser(effectiveBand(), false, "profile"); });
    $("#btn-feedback").addEventListener("click", function () { renderFeedback("profile"); });
    $("#btn-contact").addEventListener("click", function () { renderContact("profile"); });
    $("#btn-privacy").addEventListener("click", function () { renderPrivacy("profile"); });
    $("#btn-tour").addEventListener("click", function () { renderTour(0); });
    $("#btn-export").addEventListener("click", exportState);
    $("#btn-import").addEventListener("click", importState);
    $("#btn-reset").addEventListener("click", resetProgress);
    $("#btn-sync-copy").addEventListener("click", copySyncCode);
    $("#btn-sync-paste").addEventListener("click", pasteSyncCode);
    wireFooterLinks(app);
  }

  /* ==========================================================
   * 11. Session-Rahmen & Task-Modi
   * ========================================================== */

  var session = null;

  var MODE_TITLES = {
    smart: "Smart-Session", flash: "Karten", mc: "Multiple Choice", match: "Paare",
    swipe: "Wisch", reels: "Reels", signs: "Schilder lesen", listen: "Hören", speak: "Sprechen",
    dialog: "Dialog", build: "Satzbau", image: "Bilder", blitz: "Blitz", audio: "Audio-Kurs",
    module: "Modul", mastercheck: "Mastery-Check", reading: "Lesen üben",
    lesson: "Lektion", snack: "Häppchen"
  };

  function startSession(modeId, opts) {
    opts = opts || {};
    tourDemo = false; // defensiv: eine echte Session verbucht immer normal
    cleanupSession();
    var size = opts.size ? clamp(opts.size, 1, 20) : sessionSize();
    session = {
      mode: modeId, answered: 0, correct: 0, wrong: 0, xp: 0, mastered: 0,
      timer: null, keyHandler: null, startedAt: Date.now(), lastWheel: 0,
      label: null, decide: null,
      startOpts: opts // damit "Nochmal" Themen-/Item-Kontext behaelt
    };
    // Themen-Session: gleiche Engine, aber Pool auf ein Thema begrenzt.
    var q = { };
    if (opts.theme) {
      q.theme = opts.theme;
      var th = themeById(opts.theme);
      if (th) session.label = th.emoji + " " + th.title;
    }
    // Gezielte Item-Liste (z. B. Knacknuesse vom Fortschritt-Screen)
    if (opts.itemIds && opts.itemIds.length) {
      q.itemIds = opts.itemIds;
      session.label = opts.label || "💪 Knacknüsse";
    }
    // Ohne explizites Thema: neue Woerter bevorzugt aus dem empfohlenen Thema
    // ziehen, damit sich eine Session wie EINE Lerneinheit anfuehlt.
    if (!q.theme && !q.itemIds) {
      var recTheme = recommendedTheme();
      if (recTheme) q.preferTheme = recTheme.id;
    }

    if (modeId === "dialog") {
      // Dialog-Modus: erst Gespraech waehlen, dann Zeile fuer Zeile durchspielen.
      session.dialogue = null;
      session.lineIdx = 0;
      if (!unlockedDialogues().length) { session = null; toast("Keine Dialoge vorhanden."); return; }
    } else if (modeId === "exam") {
      // Survival-Check: 12 zufaellige A0-Vokabeln, Lesen ohne Stuetzraeder.
      // Geprueft wird nur, was schon einmal gelernt wurde — sonst ist es Raten,
      // kein Test (fuer den echten Ernstfall gibt es die Empfehlung ab 30).
      var a0Themes = {};
      CONTENT.themes.forEach(function (t) { if (t.band === "A0") a0Themes[t.id] = true; });
      var examPool = CONTENT.items.filter(function (it) {
        return a0Themes[it.theme] && !isNew(it.id) &&
          ["word", "phrase", "sign", "number"].indexOf(it.type) >= 0;
      });
      if (examPool.length < 12) { return renderModeEmpty("exam"); }
      session.tasks = shuffle(examPool.slice()).slice(0, 12).map(function (it) {
        return { item: it, kind: "mc", dir: "he2de", requeued: false };
      });
      session.i = 0;
      session.exam = true;
      session.label = "🎓 Survival-Check";
    } else if (modeId === "audio") {
      // Audio-Kurs: hands-free Sequenz (DE-Frage -> Sprechpause -> HE-Antwort).
      q.types = ["word", "phrase", "number", "sentence", "sign"];
      session.tasks = buildQueue(size, q).map(function (it) {
        return { item: it, kind: "audio", dir: null, requeued: false };
      });
      session.i = 0;
      session.audioPhase = "frage";   // 'frage' | 'pause' | 'antwort'
      session.paused = false;
      if (!session.tasks.length) { session = null; toast("Nicht genug Inhalte."); return; }
    } else if (modeId === "match") {
      q.types = ["word", "phrase", "sign", "number", "letter"]; // keine langen Saetze im Raster
      q.startedOnly = true; // Zuordnen ist Abruf: nur schon Gesehenes
      session.rounds = buildMatchRounds(buildQueue(Math.min(size, 16), q));
      session.roundIndex = 0;
      if (!session.rounds.length || session.rounds[0].length < 3) { return renderModeEmpty(modeId); }
    } else if (modeId === "swipe") {
      q.types = ["word", "phrase", "sign", "number", "letter"];
      q.startedOnly = true; // Richtig/Falsch zu Unbekanntem waere Muenzwurf
      session.cards = buildSwipeCards(buildQueue(15, q));
      session.i = 0;
      if (session.cards.length < 6) { return renderModeEmpty(modeId); }
    } else if (modeId === "reels") {
      session.i = 0;
      if (q.theme) {
        // themenspezifisch direkt starten (z. B. aus Themen-Session heraus)
        session.feed = buildFeed(buildQueue(size, q));
        if (!session.feed.length) { session = null; toast("Nicht genug Inhalte."); return; }
      } else {
        // erst fragen: gemischter Feed oder aktuelles Thema?
        session.feed = null;
        session.reelsSize = size;
      }
    } else if (modeId === "module") {
      // Modul: gefuehrte Mini-Lektion, linearer Schritt-Ablauf (kein Task-Mix).
      // opts.moduleObj erlaubt ein zur Laufzeit gebautes Modul (z. B. "Lesen lernen").
      var mod = opts.moduleObj || moduleById(opts.moduleId);
      if (!mod || !mod.steps || !mod.steps.length) { session = null; toast("Modul nicht gefunden."); return; }
      session.module = mod;
      session.steps = mod.steps.slice();
      session.stepIdx = 0;
      session.label = (mod.emoji || "📚") + " " + mod.title;
    } else if (modeId === "mastercheck") {
      // Mastery-Check (1.2): Haeppchen-Wiederholung NUR ueber gemeisterte
      // Items. Rotation ohne neues Feld: am laengsten ungeprueft zuerst
      // (lastReviewTs aufsteigend) + etwas Zufall, damit ueber die Runden
      // alle drankommen.
      var mastered = CONTENT.items.filter(function (it) { return getMastery(it.id) >= 3; });
      if (!mastered.length) { session = null; toast("Noch nichts gemeistert – erst lernen, dann prüfen. 🙂"); return; }
      mastered.sort(function (a, b) { return (getSrs(a.id).lastReviewTs || 0) - (getSrs(b.id).lastReviewTs || 0); });
      var chunk = shuffle(mastered.slice(0, 10)).slice(0, 6);
      session.tasks = chunk.map(function (it, idx) {
        // Erkennen und Produzieren im Wechsel (wie im normalen Lernen).
        return { item: it, kind: "mc", dir: idx % 2 === 0 ? "he2de" : "de2he", requeued: false };
      });
      session.i = 0;
      session.masteryCheck = true;
      session.label = "🏅 Mastery-Check";
    } else if (modeId === "reading") {
      // Lese-Drill: feste Aufgabenliste aus der Drill-Definition (reading.js).
      var drill = null;
      if (READING) READING.drills.forEach(function (d) { if (d.id === opts.drillId) drill = d; });
      if (!drill) { session = null; toast("Übung nicht gefunden."); return; }
      session.drill = drill;
      session.drillTasks = buildDrillTasks(drill);
      session.i = 0;
      session.label = "👓 " + (drill.title || "Lesen üben");
      if (!session.drillTasks.length) { session = null; toast("Übung ist leer."); return; }
    } else if (modeId === "lesson") {
      // Lektions-Player (T8): fester 8-Schritt-Bogen als flache Schrittliste.
      // Resume: bei gespeichertem, nicht erledigtem Schritt dort fortsetzen.
      var lesson = lessonById(opts.lessonId);
      if (!lesson) { session = null; toast("Lektion nicht gefunden."); return; }
      session.lesson = lesson;
      session.steps = buildLessonSteps(lesson);
      if (!session.steps.length) { session = null; toast("Diese Lektion ist noch leer."); return; }
      var saved = lessonState(lesson.id);
      session.stepIdx = (!saved.done && saved.step > 0 && saved.step < session.steps.length) ? saved.step : 0;
      session.label = lesson.emoji + " " + lesson.title;
    } else if (modeId === "snack") {
      // Wissens-Haeppchen (WS-D): laeuft auf dem Modul-Runner (Schritte sind
      // Modul-Schritte). Optionaler Vokabel-Anhang haengt 2-3 faellige Woerter an.
      var snack = snackById(opts.snackId);
      if (!snack) { session = null; toast("Häppchen nicht gefunden."); return; }
      var ssteps = snack.steps.slice();
      if (opts.withVocab) {
        buildQueue(3, {}).filter(function (it) { return isDue(it.id, Date.now()); })
          .slice(0, 3).forEach(function (it) { ssteps.push({ type: "quiz", itemId: it.id }); });
      }
      session.module = { id: snack.id, title: snack.title, emoji: snack.emoji, steps: ssteps };
      session.steps = ssteps;
      session.stepIdx = 0;
      session.snackId = snack.id;
      session.label = snack.emoji + " " + snack.title;
    } else {
      // Schilder-Modus: nur Schilder. Sprechen: keine Einzelbuchstaben. Satzbau: nur Saetze.
      // Bilder: nur Items mit Emoji. Blitz: schnelle MC-Runde gegen die Uhr.
      if (modeId === "signs") q.types = ["sign"];
      else if (modeId === "speak") q.types = ["word", "phrase", "sign", "number", "sentence"];
      else if (modeId === "build") { q.types = ["sentence"]; q.newCap = 99; } // Satzbau lehrt selbst
      else if (modeId === "image") q.requireEmoji = true;
      else if (modeId === "blitz") { q.types = ["word", "phrase", "sign", "number", "letter"]; q.startedOnly = true; }
      var count = modeId === "signs" ? 10 : (modeId === "blitz" ? 40 : size);
      var queue = buildQueue(count, q);
      var kindFor = function (it) {
        if (modeId === "smart") return smartKind(it);
        if (modeId === "blitz") return "mc"; // Blitz = MC gegen die Uhr
        return modeId;
      };
      session.tasks = queue.map(function (it) {
        return { item: it, kind: kindFor(it), dir: null, requeued: false };
      });
      session.i = 0;
      if (modeId === "blitz" && session.tasks.length < 8) { return renderModeEmpty(modeId); }
      if (!session.tasks.length) { session = null; toast("Nicht genug Inhalte."); return; }
      if (modeId === "blitz") {
        session.blitzUntil = Date.now() + 60 * 1000;
        session.label = "⚡ Blitz";
        // Live-Countdown im Kopf; Ende der Zeit beendet die Session.
        session.tick = setInterval(function () {
          if (!session || !session.blitzUntil) return;
          var left = Math.max(0, Math.ceil((session.blitzUntil - Date.now()) / 1000));
          var t = $(".session-title");
          if (t) t.textContent = "⚡ Blitz · " + left + "s · " + session.correct + " richtig";
          if (left <= 0) endSession();
        }, 250);
      }
    }

    document.body.classList.add("in-session");
    renderSession();
  }

  /**
   * Freundlicher Hinweis statt sinnloser Rate-Session: Abruf-Spiele (Wisch,
   * Paare, Blitz) brauchen erst ein paar gelernte Woerter.
   */
  function renderModeEmpty(modeId) {
    cleanupSession();
    var m = null;
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === modeId) m = MODES[i];
    var name = m ? m.emoji + " " + m.title : (modeId === "exam" ? "🎓 Der Survival-Check" : "Dieser Modus");
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "done-screen");
    wrap.appendChild(el("div", "done-emoji", "🌱"));
    wrap.appendChild(el("div", "done-title", name + " wartet noch"));
    wrap.appendChild(el("div", "done-sub",
      "Hier fragen wir nur ab, was du schon gelernt hast – sonst wäre es Raten. " +
      "Lern erst ein paar Wörter, dann macht das richtig Spaß."));
    var actions = el("div", "done-actions");
    actions.appendChild(btn("▶ Jetzt lernen", "btn primary", function () { startSession("smart"); }));
    actions.appendChild(btn("Zu den Vokabeln", "btn ghost", function () { showScreen("vocab"); }));
    wrap.appendChild(actions);
    app.appendChild(wrap);
  }

  /** Raeumt Timer/Listener/Audio einer laufenden Session auf. */
  function cleanupSession() {
    if (session) {
      clearTimeout(session.timer);
      if (session.tick) clearInterval(session.tick);
      if (session.keyHandler) document.removeEventListener("keydown", session.keyHandler);
      if (session.optKeyHandler) document.removeEventListener("keydown", session.optKeyHandler);
      session = null;
    }
    TTS.stop();
    STT.abort();
    document.body.classList.remove("in-session");
  }

  function quitSession() {
    // Wer mitten in der Session aufhoert, hat trotzdem gelernt: Abschluss-Screen
    // mit dem bisherigen Ergebnis statt kommentarlosem Verwerfen.
    if (session && session.answered > 0) return endSession();
    cleanupSession();
    showScreen("home");
  }

  /** setTimeout, das nur feuert, solange DIESE Session noch laeuft. */
  function later(fn, ms) {
    var s = session;
    session.timer = setTimeout(function () { if (session === s) fn(); }, ms);
  }

  /**
   * Tastatur-Slot fuer die aktuelle Aufgabe (1-4 = Option/Bewertung,
   * Enter/Leertaste = Aufdecken/Weiter). Pro Aufgabe genau EIN Handler;
   * der vorherige wird ersetzt (kein Listener-Leak).
   */
  function setOptKeys(fn) {
    if (session && session.optKeyHandler) {
      document.removeEventListener("keydown", session.optKeyHandler);
      session.optKeyHandler = null;
    }
    if (session && fn) {
      session.optKeyHandler = fn;
      document.addEventListener("keydown", fn);
    }
  }

  /** Gemeinsamer Kopf jeder Session; gibt den Body-Container zurueck. */
  function sessionShell(subtitle, progress, bodyClass) {
    var app = $("#app");
    app.innerHTML = "";
    activeCorrectLabel = null; // pro Render zuruecksetzen; drillOptions setzt neu
    var head = el("div", "session-head");
    var quit = btn("✕", "quit-btn", quitSession);
    quit.title = "Session beenden";
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", subtitle));
    var barWrap = el("div", "bar mini");
    var bar = el("div", "bar-fill");
    bar.style.width = Math.round(clamp(progress, 0, 1) * 100) + "%";
    barWrap.appendChild(bar);
    mid.appendChild(barWrap);
    head.appendChild(quit);
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", "⭐ " + session.xp));
    var body = el("div", "session-body" + (bodyClass ? " " + bodyClass : ""));
    app.appendChild(head);
    app.appendChild(body);
    return body;
  }

  function renderSession() {
    if (!session) return;
    clearTimeout(session.timer);
    var m = session.mode;
    if (m === "match") return renderMatchRound();
    if (m === "swipe") return renderSwipeCard();
    if (m === "reels") return renderReel();
    if (m === "dialog") return renderDialog();
    if (m === "audio") return renderAudio();
    if (m === "module" || m === "snack") return renderModuleStep();
    if (m === "lesson") return renderLessonStep();
    if (m === "reading") return renderDrillTask();
    return renderTask();
  }

  /* ---------- Audio-Kurs (hands-free, Pimsleur-Prinzip) ---------- */

  function renderAudio() {
    var s = session;
    var task = s.tasks[s.i];
    if (!task) return endSession();
    var item = task.item;
    var title = "🎧 Audio-Kurs · " + (s.i + 1) + "/" + s.tasks.length;
    var body = sessionShell(title, s.i / s.tasks.length, "audio");

    var teaching = s.audioPhase === "teach";
    var card = el("div", "card learn-card audio-card");
    card.appendChild(el("div", "audio-phase",
      teaching ? "🆕 Neues Wort" : (s.audioPhase === "antwort" ? "Antwort:" : "Wie sagt man …")));
    card.appendChild(el("div", "de-prompt big", item.de));
    var heWrap = el("div", "audio-he");
    if (teaching || s.audioPhase === "antwort") {
      // Neues Wort wird erst GELEHRT (Pimsleur-Prinzip), nie kalt abgefragt.
      heWrap.appendChild(heEl(item, { big: true, showHint: true }));
      heWrap.appendChild(el("div", "translit", item.translit));
    } else {
      heWrap.appendChild(el("div", "audio-dots", s.audioPhase === "pause" ? "… sprich jetzt laut! …" : "🎧"));
    }
    card.appendChild(heWrap);
    body.appendChild(card);

    // Steuerleiste: Pause/Weiter, Ueberspringen, ehrliche Selbstbewertung
    var ctrl = el("div", "audio-ctrl");
    var pauseBtn = btn(s.paused ? "▶ Weiter" : "⏸ Pause", "btn", function () {
      s.paused = !s.paused;
      if (s.paused) { TTS.stop(); clearTimeout(s.timer); renderSession(); }
      else audioStep();
    });
    ctrl.appendChild(pauseBtn);
    ctrl.appendChild(btn("⏭ Überspringen", "btn ghost", function () {
      TTS.stop(); clearTimeout(s.timer);
      s.i++; s.audioPhase = "frage"; audioStep();
    }));
    body.appendChild(ctrl);

    if (!teaching) {
      // Selbstbewertung ergibt nur Sinn, wenn wirklich abgefragt wurde.
      var grade = el("div", "self-grade-row");
      grade.appendChild(btn("✓ Konnte ich", "btn", function () {
        recordAnswer(item.id, "listen", "good");
        TTS.stop(); clearTimeout(s.timer);
        s.i++; s.audioPhase = "frage"; audioStep();
      }));
      grade.appendChild(btn("✗ Noch nicht", "btn ghost", function () {
        recordAnswer(item.id, "listen", "again");
        TTS.stop(); clearTimeout(s.timer);
        s.i++; s.audioPhase = "frage"; audioStep();
      }));
      body.appendChild(grade);
    }
    body.appendChild(el("div", "tts-hint",
      (TTS.hasGerman() ? "" : "Keine deutsche Stimme gefunden – Frage wird nur angezeigt. ") +
      (TTS.hasHebrew() ? "" : "Keine hebräische Stimme – Antwort wird nur angezeigt.")));

    // Automatik nur anstossen, wenn nicht pausiert und gerade frisch gerendert
    if (!s.paused && !s.audioRunning) audioStep();
  }

  /** Treibt die Audio-Sequenz: Frage (de) -> Sprechpause -> Antwort (he) -> naechstes. */
  function audioStep() {
    var s = session;
    if (!s || s.mode !== "audio" || s.paused) return;
    var task = s.tasks[s.i];
    if (!task) { s.audioRunning = false; return endSession(); }
    var item = task.item;
    s.audioRunning = true;

    // Neues Wort: erst lehren ("X heisst auf Hebraeisch ..."), nicht abfragen.
    if (isNew(item.id)) {
      s.audioPhase = "teach";
      renderAudioShell();
      TTS.speakSeq("Neu: " + item.de + ". Auf Hebräisch:", "de", function () {
        if (!session || session !== s || s.paused) return;
        TTS.speakSeq(spoken(item), "he", function () {
          if (!session || session !== s || s.paused) return;
          // kurz wirken lassen, einmal wiederholen, dann weiter
          s.timer = setTimeout(function () {
            if (!session || session !== s || s.paused) return;
            TTS.speakSeq(spoken(item), "he", function () {
              if (!session || session !== s || s.paused) return;
              s.timer = setTimeout(function () {
                if (!session || session !== s || s.paused) return;
                s.i++;
                s.audioPhase = "frage";
                audioStep();
              }, 900);
            });
          }, 700);
        });
      });
      return;
    }
    if (s.audioPhase === "teach") s.audioPhase = "frage"; // (nur falls Item inzwischen beantwortet wurde)

    if (s.audioPhase === "frage") {
      renderAudioShell();
      TTS.speakSeq("Wie sagt man: " + item.de + "?", "de", function () {
        if (!session || session !== s || s.paused) return;
        s.audioPhase = "pause";
        renderAudioShell();
        s.timer = setTimeout(function () {
          if (!session || session !== s || s.paused) return;
          s.audioPhase = "antwort";
          audioStep();
        }, 3200);
      });
    } else if (s.audioPhase === "antwort") {
      renderAudioShell();
      TTS.speakSeq(spoken(item), "he", function () {
        if (!session || session !== s || s.paused) return;
        // kurze Nachwirkzeit, dann automatisch weiter
        s.timer = setTimeout(function () {
          if (!session || session !== s || s.paused) return;
          s.i++;
          s.audioPhase = "frage";
          audioStep();
        }, 1200);
      });
    } else {
      // Phase 'pause' (z. B. nach Unterbrechung fortgesetzt): Timer neu spannen.
      renderAudioShell();
      s.timer = setTimeout(function () {
        if (!session || session !== s || s.paused) return;
        s.audioPhase = "antwort";
        audioStep();
      }, 2200);
    }
  }

  /** Rendert den Audio-Screen neu, ohne die Automatik neu zu starten. */
  function renderAudioShell() {
    if (!session || session.mode !== "audio") return;
    var keep = session.audioRunning;
    session.audioRunning = true; // verhindert Doppelstart durch renderAudio
    renderAudio();
    session.audioRunning = keep;
  }

  function nextTask() {
    if (!session) return;
    session.i++;
    renderSession();
  }

  /** Modi, vor deren ERSTER Abfrage ein neues Wort vorgestellt wird (Teach-First).
   *  Ausnahmen: Satzbau (die Aufgabe lehrt selbst), Pruefung (absichtlich hart). */
  var INTRO_KINDS = { flash: 1, mc: 1, listen: 1, image: 1, signs: 1, speak: 1 };

  function renderTask() {
    var task = session.tasks[session.i];
    if (!task) {
      // Mastery-Check: vor dem Abschluss die Auswahl-Ansicht (Zuruecknehmen).
      if (session.masteryCheck) return renderMasteryCheckReview();
      return endSession();
    }
    setOptKeys(null); // alter Aufgaben-Tastaturhandler weg; Renderer setzen ggf. neu
    var title = (session.label || MODE_TITLES[session.mode]) + " · " + (session.i + 1) + "/" + session.tasks.length;
    // Teach-First: nie eine Frage zu einem Wort stellen, das die App noch nie
    // gezeigt hat. Neue Items bekommen zuerst eine Vorstellungs-Karte.
    if (!session.exam && INTRO_KINDS[task.kind] && isNew(task.item.id) && !task.introduced) {
      return renderIntro(task, title);
    }
    switch (task.kind) {
      case "flash": return renderFlash(task, title);
      case "listen": return renderListen(task, title);
      case "speak": return renderSpeak(task, title);
      case "signs": return renderSignTask(task, title);
      case "build": return renderBuild(task, title);
      case "image": return renderImage(task, title);
      default: return renderMC(task, title);
    }
  }

  /* ---------- 11g. Bild-Wort (Emoji -> Hebraeisch, ohne Deutsch) ---------- */

  function renderImage(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    if (!item.emoji) { task.kind = "mc"; return renderMC(task, title); }

    body.appendChild(el("div", "task-question", "Welches Wort passt zum Bild?"));
    var pic = el("div", "img-emoji", item.emoji);
    pic.title = "";
    body.appendChild(pic);
    body.appendChild(speakRow(item));

    var feedback = el("div", "feedback-note");
    // Optionen auf Hebraeisch: direktes Bild->Wort-Denken, ohne Umweg ueber Deutsch.
    buildOptionButtons(body, item, "image", "he", function (correct) {
      if (!correct) feedback.textContent = "Richtig ist: " + item.he + " (" + item.translit + " = " + item.de + ")";
      else feedback.textContent = item.translit + " = " + item.de;
    }, task);
    body.appendChild(feedback);
  }

  /* ---------- 11f. Satzbau (Woerter in die richtige Reihenfolge) ---------- */

  function renderBuild(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    if (!item.tokens || item.tokens.length < 2) {
      // Ohne Tokens kein Satzbau moeglich -> als Karte zeigen.
      task.kind = "flash";
      return renderFlash(task, title);
    }

    body.appendChild(el("div", "task-question", "Baue den Satz:"));
    var card = el("div", "card learn-card");
    card.appendChild(el("div", "de-prompt", item.de));
    if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    body.appendChild(card);

    // Antwortzeile (RTL: erstes gewaehltes Wort erscheint rechts = Leserichtung)
    var answer = el("div", "build-answer");
    answer.dir = "rtl";
    body.appendChild(answer);

    // Wortkacheln, gemischt (bei nur 2 Tokens sicherstellen, dass sie NICHT in Loesung starten)
    var order = shuffle(item.tokens.map(function (t, i) { return i; }));
    if (order.length === 2 && order[0] === 0) order = [1, 0];
    var bank = el("div", "build-bank");
    bank.dir = "rtl";
    body.appendChild(bank);

    var picked = [];
    var feedback = el("div", "feedback-note");
    body.appendChild(feedback);

    function finish() {
      var built = picked.map(function (i) { return item.tokens[i].he; }).join(" ");
      var target = item.tokens.map(function (t) { return t.he; }).join(" ");
      var correct = built === target;
      answer.classList.add(correct ? "ok" : "no");
      if (correct) {
        feedback.textContent = "Richtig! " + item.translit + " · " + item.de;
        say(item);
      } else {
        feedback.textContent = "Richtige Reihenfolge: " + item.translit + " · " + item.de;
        // Loesung anzeigen
        answer.innerHTML = "";
        item.tokens.forEach(function (t) {
          answer.appendChild(el("span", "build-chip done", t.he));
        });
      }
      recordAnswer(item.id, "build", correct ? "good" : "again");
      later(nextTask, correct ? 1200 : 2600);
    }

    order.forEach(function (tokenIdx) {
      var t = item.tokens[tokenIdx];
      var tile = el("button", "build-tile");
      var he = el("div", "b-he", t.he); he.dir = "rtl"; he.lang = "he";
      tile.appendChild(he);
      tile.appendChild(el("div", "b-translit", t.translit));
      tile.title = t.de;
      tile.addEventListener("click", function () {
        if (tile.disabled) return;
        tile.disabled = true;
        tile.classList.add("used");
        picked.push(tokenIdx);
        answer.appendChild(el("span", "build-chip", t.he));
        if (picked.length === item.tokens.length) finish();
      });
      bank.appendChild(tile);
    });

    body.appendChild(btn("↺ Zurücksetzen", "btn ghost", function () {
      picked = [];
      answer.innerHTML = "";
      answer.classList.remove("ok", "no");
      bank.querySelectorAll(".build-tile").forEach(function (x) { x.disabled = false; x.classList.remove("used"); });
    }));
  }

  /* ---------- 11a0. Intro-Karte (Teach-First fuer neue Woerter) ---------- */

  var INTRO_TAGS = {
    letter: "🆕 Neuer Buchstabe", sign: "🆕 Neues Schild", phrase: "🆕 Neue Wendung",
    number: "🆕 Neue Zahl", sentence: "🆕 Neuer Satz", word: "🆕 Neues Wort"
  };

  function renderIntro(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;

    // Erstkontakt-Merker (1.1): die erste Abfrage dieses Worts in DIESER
    // Session zaehlt nicht fuer die Mastery.
    if (session) {
      if (!session.introducedThisSession) session.introducedThisSession = {};
      session.introducedThisSession[item.id] = true;
    }

    body.appendChild(el("div", "intro-tag", INTRO_TAGS[item.type] || INTRO_TAGS.word));
    var card = el("div", "card learn-card intro-card");
    if (item.emoji) card.appendChild(el("div", "intro-emoji", item.emoji));
    card.appendChild(heEl(item, { big: true, tapReveal: false })); // neu => volle Stuetzraeder
    // Schilder rendern grundsaetzlich ohne Umschrift — beim VORSTELLEN zeigen wir sie.
    if (item.type === "sign") card.appendChild(el("div", "translit", item.translit));
    card.appendChild(el("div", "de-prompt", item.de));
    if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    card.appendChild(speakRow(item, true));
    body.appendChild(card);
    if (state.profile.autoplay) say(item);

    body.appendChild(el("div", "intro-hint", "Präg es dir kurz ein – gleich fragen wir nach."));
    var go = btn("Weiter →", "btn primary big", function () {
      task.introduced = true;
      // Kurzzeit-Spacing: dasselbe Wort kommt spaeter in der Session noch einmal —
      // als ERKENNEN (he->de), Produktion kommt erst mit wachsender Sicherheit (R4).
      if (!task.requeued && session.tasks) {
        session.tasks.push({ item: item, kind: "mc", dir: "he2de", requeued: true, introduced: true });
      }
      renderSession();
    });
    body.appendChild(go);
    setOptKeys(function (e) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); go.click(); }
    });
  }

  /* ---------- 11a. Karten (Flashcards) ---------- */

  function renderFlash(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    // Richtung: Erkennen (he->de) ist der Standard. Die Produktions-Richtung
    // (de->he, "wie heisst das auf Hebraeisch?") gibt es NUR im dedizierten
    // Karten-Modus und nur fuer Woerter mit etwas Sicherheit — in Smart-/
    // Themen-Sessions laeuft Produktion ueber Auswahl/Satzbau/Sprechen, wo man
    // wirklich antworten KANN (R4).
    if (!task.dir) {
      var allowProduction = session.mode === "flash" && getMastery(item.id) >= 1;
      task.dir = allowProduction && Math.random() < 0.5 ? "de2he" : "he2de";
    }

    // Klarer Auftrag statt kommentarloser Karte
    body.appendChild(el("div", "task-question",
      task.dir === "he2de" ? "Was bedeutet das?" : "Wie heißt das auf Hebräisch?"));

    var card = el("div", "card learn-card");
    if (task.dir === "he2de") {
      card.appendChild(heEl(item, { big: true, showHint: true, quiz: true }));
      card.appendChild(speakRow(item));
      if (state.profile.autoplay) say(item);
    } else {
      card.appendChild(el("div", "de-prompt", item.de));
      if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    }

    // Rueckseite
    var answer = el("div", "flash-answer hidden");
    if (task.dir === "he2de") {
      answer.appendChild(el("div", "de-prompt", item.de));
      if (item.note) answer.appendChild(el("div", "note-line", "(" + item.note + ")"));
    } else {
      answer.appendChild(heEl(item, { big: true, showHint: true }));
      answer.appendChild(speakRow(item));
    }
    card.appendChild(answer);
    body.appendChild(card);

    // Bewertungsleiste (erst nach dem Aufdecken)
    var pv = intervalPreview(item.id);
    var grades = el("div", "grade-row hidden");
    [["again", "Nochmal", pv.again], ["hard", "Schwer", pv.hard],
     ["good", "Gut", pv.good], ["easy", "Leicht", pv.easy]].forEach(function (def) {
      var g = el("button", "grade-btn " + def[0]);
      g.appendChild(el("span", null, def[1]));
      g.appendChild(el("span", "grade-sub", def[2]));
      g.addEventListener("click", function () {
        recordAnswer(item.id, "flash", def[0], task.dir);
        // "Nochmal" haengt das Item einmal hinten an die Session an.
        if (def[0] === "again" && !task.requeued) {
          session.tasks.push({ item: item, kind: task.kind, dir: null, requeued: true });
        }
        nextTask();
      });
      grades.appendChild(g);
    });

    // Das Abruf-Ritual in einer Zeile erklaeren (Anki-Prinzip, aber selbsterklaerend)
    var think = el("div", "flash-think", "Sag die Antwort erst im Kopf (oder laut) – dann:");
    body.appendChild(think);

    var gradeQ = el("div", "grade-question hidden", "Und – wusstest du es?");

    var revealed = false;
    var reveal = btn("Aufdecken", "btn primary big", function () {
      revealed = true;
      reveal.remove();
      think.remove();
      answer.classList.remove("hidden");
      gradeQ.classList.remove("hidden");
      grades.classList.remove("hidden");
      if (task.dir === "de2he" && state.profile.autoplay) say(item);
    });
    body.appendChild(reveal);
    body.appendChild(gradeQ);
    body.appendChild(grades);

    // Tastatur: Leertaste/Enter = aufdecken, danach 1-4 = Nochmal/Schwer/Gut/Leicht.
    setOptKeys(function (e) {
      if (!session) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        reveal.click();
      } else if (revealed && e.key >= "1" && e.key <= "4") {
        var gs = grades.querySelectorAll(".grade-btn");
        var g = gs[+e.key - 1];
        if (g) { e.preventDefault(); g.click(); }
      }
    });
  }

  /* ---------- 11b. Multiple Choice ---------- */

  /** 3 Distraktoren: erst gleiches Thema, dann Rest; nie doppelte de/he-Texte. */
  /** Grobe Typ-Gruppe fuer plausible Distraktoren: Buchstaben zu Buchstaben,
   *  Saetze zu Saetzen, "normale" Vokabeln untereinander. */
  function typeGroup(t) {
    if (t === "letter") return "letter";
    if (t === "sentence") return "sentence";
    return "wordlike";
  }

  /**
   * Verwechsler-Gruppen: optisch aehnliche Buchstaben. Bei Buchstaben-Fragen
   * kommen Distraktoren BEVORZUGT aus dieser Map — genau das Unterscheiden
   * dieser Paare macht fluessiges Lesen aus (ד/ר, ה/ח/ת, ב/כ ...).
   */
  var CONFUSABLES = {
    let_dalet:  ["let_resh", "let_kaf_s"],
    let_resh:   ["let_dalet", "let_kaf_s"],
    let_kaf_s:  ["let_dalet", "let_resh"],
    let_he:     ["let_chet", "let_tav"],
    let_chet:   ["let_he", "let_tav"],
    let_tav:    ["let_chet", "let_he"],
    let_bet:    ["let_kaf", "let_nun"],
    let_kaf:    ["let_bet", "let_nun"],
    let_vav:    ["let_zayin", "let_nun_s"],
    let_zayin:  ["let_vav", "let_nun_s"],
    let_nun_s:  ["let_vav", "let_zayin"],
    let_mem_s:  ["let_samech"],
    let_samech: ["let_mem_s"],
    let_pe_s:   ["let_tsadi_s"],
    let_tsadi_s:["let_pe_s"],
    let_gimel:  ["let_nun", "let_bet"],
    let_nun:    ["let_gimel", "let_kaf"],
    let_tet:    ["let_mem", "let_samech"],
    let_mem:    ["let_tet"],
    let_ayin:   ["let_tsadi"],
    let_tsadi:  ["let_ayin"]
  };

  /**
   * Distraktoren, die mit wachsender Sicherheit haerter werden:
   *  1. Buchstaben -> optische Verwechsler zuerst (siehe CONFUSABLES).
   *  2. Gegenteil (item.opposite) IMMER als klassische Falle, wenn gueltig.
   *  3. Rest der Typ-Gruppe, nach Aehnlichkeit zur Loesung bewertet.
   * Ab mastery >= 2 werden die AEHNLICHSTEN Distraktoren genommen (mit etwas
   * Zufall), damit man nicht mehr "an der Wortlaenge" raten kann. Frueher
   * (mastery <= 1) bleibt es freundlich (gleiches Thema, sonst Zufall).
   */
  function wordCount(s) { return String(s || "").trim().split(/\s+/).length; }

  function distractorScore(item, c) {
    var s = 0;
    var dw = wordCount(item.de), cw = wordCount(c.de);
    if (cw === dw) s += 3; else if (Math.abs(cw - dw) === 1) s += 1;
    if (wordCount(c.he) === wordCount(item.he)) s += 2;
    if (Math.abs((c.he || "").length - (item.he || "").length) <= 2) s += 2;
    if (c.theme === item.theme) s += 2;
    if ((c.he || "").charAt(0) === (item.he || "").charAt(0)) s += 1;
    return s;
  }

  function pickDistractors(item, n) {
    var seenDe = {}, seenHe = {};
    seenDe[item.de] = true;
    seenHe[item.he] = true;
    var out = [];
    function tryAdd(c) {
      if (!c || c.id === item.id || out.length >= n) return;
      if (seenDe[c.de] || seenHe[c.he]) return;
      seenDe[c.de] = true; seenHe[c.he] = true;
      out.push(c);
    }
    // 1. Buchstaben: zuerst die Verwechsler (aehnlich aussehende Buchstaben)
    if (item.type === "letter" && CONFUSABLES[item.id]) {
      CONFUSABLES[item.id].forEach(function (cid) { tryAdd(itemById(cid)); });
    }
    // 2. Gegenteil immer einbauen (beide Richtungen der klassischen Falle);
    // defensiv nur innerhalb derselben Typ-Gruppe (Satz nie als Wort-Option).
    if (item.opposite) {
      var oppo = itemById(item.opposite);
      if (oppo && typeGroup(oppo.type) === typeGroup(item.type)) tryAdd(oppo);
    }

    var grp = typeGroup(item.type);
    var pool = CONTENT.items.filter(function (x) {
      return x.id !== item.id && typeGroup(x.type) === grp && !seenDe[x.de] && !seenHe[x.he];
    });

    // 3. Immer nach Aehnlichkeit sortiert (+ kleiner Jitter) die Top-n:
    // plausible Distraktoren statt Raten "an der Wortlaenge" (1.1).
    var scored = pool.map(function (c) { return { c: c, s: distractorScore(item, c) + Math.random() }; });
    scored.sort(function (a, b) { return b.s - a.s; });
    for (var i = 0; i < scored.length && out.length < n; i++) tryAdd(scored[i].c);
    // 5. Notfall-Auffuellung, falls die Gruppe zu klein ist (sollte nicht passieren).
    if (out.length < n) {
      var rest = shuffle(CONTENT.items.filter(function (x) {
        return x.id !== item.id && !seenDe[x.de] && !seenHe[x.he];
      }).slice());
      for (var k = 0; k < rest.length && out.length < n; k++) tryAdd(rest[k]);
    }
    return out;
  }

  /**
   * Falsch beantwortete Woerter kommen in DERSELBEN Session noch einmal dran
   * (Kurzzeit-Spacing) — mit beruhigendem Hinweis statt Frustgefuehl.
   */
  function requeueOnWrong(task) {
    if (!session || !session.tasks || !task || task.requeued) return;
    session.tasks.push({ item: task.item, kind: "mc", dir: "he2de", requeued: true, introduced: true });
    toast("↻ Keine Sorge – das kommt gleich nochmal.");
  }

  /**
   * Gemeinsames Optionen-UI: baut 4 Knoepfe, verbucht die Antwort und
   * geht weiter (richtig: automatisch, falsch: mit "Weiter"-Knopf).
   * Optional: task fuer den Fehler-Requeue.
   */
  function buildOptionButtons(body, item, mode, optionKind, afterAnswer, task) {
    var options = shuffle([item].concat(pickDistractors(item, 3)));
    var list = el("div", "opt-list");
    var done = false;
    options.forEach(function (opt) {
      var isHe = optionKind === "he";
      var b = el("button", "opt" + (isHe ? " he-opt" : ""), isHe ? heOptionText(opt) : opt.de);
      if (isHe) { b.dir = "rtl"; b.lang = "he"; }
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = opt.id === item.id;
        list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
        b.classList.remove("dim");
        if (correct) {
          b.classList.add("correct");
        } else {
          b.classList.add("wrong");
          var btns = list.querySelectorAll(".opt");
          for (var i = 0; i < btns.length; i++) {
            if (btns[i].dataset.itemId === item.id) { btns[i].classList.add("correct"); btns[i].classList.remove("dim"); }
          }
        }
        recordAnswer(item.id, mode, correct ? "good" : "again", task && task.dir);
        if (!correct) requeueOnWrong(task);
        if (afterAnswer) afterAnswer(correct);
        if (correct) {
          later(nextTask, 1000);
        } else {
          var cont = btn("Weiter", "btn primary big", nextTask);
          cont.dataset.k = "cont";
          body.appendChild(cont);
          cont.focus();
        }
      });
      b.dataset.itemId = opt.id;
      list.appendChild(b);
    });
    body.appendChild(list);

    // Tastatur: 1-4 waehlt die Option, Enter/Leertaste = Weiter (nach Fehler).
    setOptKeys(function (e) {
      if (!session) return;
      if (e.key >= "1" && e.key <= "4") {
        var btns = list.querySelectorAll(".opt");
        var target = btns[+e.key - 1];
        if (target && !target.disabled) { e.preventDefault(); target.click(); }
      } else if (e.key === "Enter" || e.key === " ") {
        var cont2 = body.querySelector('[data-k="cont"]');
        if (cont2) { e.preventDefault(); cont2.click(); }
      }
    });
    return list;
  }

  function renderMC(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    if (!task.dir) {
      // Frische Woerter (gerade erst vorgestellt): NUR Erkennen he->de.
      // Produktion (de->he) und Nur-Hoeren kommen erst mit etwas Sicherheit (R4).
      if (getMastery(item.id) <= 0) {
        task.dir = "he2de";
      } else {
        var dirs = ["he2de", "de2he"];
        if (TTS.available && TTS.hasHebrew()) dirs.push("audio2de");
        task.dir = dirs[randInt(dirs.length)];
      }
    }

    var card = el("div", "card learn-card");
    if (task.dir === "he2de") {
      body.appendChild(el("div", "task-question", "Was bedeutet das?"));
      card.appendChild(heEl(item, { big: true, showHint: true, quiz: true }));
      card.appendChild(speakRow(item));
    } else if (task.dir === "de2he") {
      body.appendChild(el("div", "task-question", "Wie heißt das auf Hebräisch?"));
      card.appendChild(el("div", "de-prompt", item.de));
      if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    } else { // audio2de
      body.appendChild(el("div", "task-question", "Was hörst du?"));
      var play = btn("🔊", "icon-btn large", function () { say(item); });
      play.title = "Nochmal anhören";
      card.appendChild(play);
      say(item);
    }
    body.appendChild(card);

    var feedback = el("div", "feedback-note");
    buildOptionButtons(body, item, "mc", task.dir === "de2he" ? "he" : "de", function (correct) {
      if (task.dir !== "de2he") {
        // Nach der Antwort das Hebraeische zeigen/vorlesen (Lern-Moment)
        if (task.dir === "audio2de") {
          var reveal = el("div", "listen-reveal");
          reveal.appendChild(heEl(item, {}));
          card.appendChild(reveal);
        }
      } else if (state.profile.autoplay) {
        say(item);
      }
      if (!correct) feedback.textContent = "Richtig wäre: " + item.de + (item.note ? " (" + item.note + ")" : "");
      else if (item.note) feedback.textContent = "Hinweis: " + item.note;
    }, task);
    body.appendChild(feedback);
  }

  /* ---------- 11c. Hoeren ---------- */

  function renderListen(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    var hasVoice = TTS.available && TTS.hasHebrew();

    body.appendChild(el("div", "task-question", "Hör zu – was bedeutet das?"));
    var card = el("div", "card learn-card");
    var playRow = el("div", "speak-row");
    var play = btn("🔊", "icon-btn large", function () { say(item); });
    play.title = "Nochmal anhören";
    playRow.appendChild(play);
    var slow = btn("🐢", "icon-btn large", function () { TTS.speakSlow(spoken(item)); });
    slow.title = "Langsam anhören";
    playRow.appendChild(slow);
    card.appendChild(playRow);
    if (!hasVoice) {
      // Graceful degradation: ohne he-Stimme wird die Umschrift zum "Ohr".
      // Bei Buchstaben waere die Umschrift die Loesung -> Zeichen zeigen.
      var isLetter = item.type === "letter";
      card.appendChild(el("div", "tts-hint",
        "Hebräische Stimme im Browser nicht verfügbar – " + (isLetter ? "Zeichen:" : "Umschrift:")));
      var earSub = el("div", "de-prompt", isLetter ? item.he : (item.translit || item.he));
      if (isLetter) { earSub.dir = "rtl"; earSub.lang = "he"; }
      card.appendChild(earSub);
    }
    body.appendChild(card);
    if (hasVoice) say(item);

    var feedback = el("div", "feedback-note");
    buildOptionButtons(body, item, "listen", "de", function (correct) {
      // Erst NACH der Antwort wird der Text sichtbar.
      var reveal = el("div", "listen-reveal");
      reveal.appendChild(heEl(item, {}));
      card.appendChild(reveal);
      if (!correct) feedback.textContent = "Das war: " + item.de;
    }, task);
    body.appendChild(feedback);
  }

  /* ---------- 11d. Sprechen ---------- */

  /**
   * Einmaliger Hinweis vor der ERSTEN Sprachaufnahme: die Browser-eigene
   * Spracherkennung (Chrome/Edge) schickt die Aufnahme in die Cloud des
   * Browser-Herstellers. Erst nach Bestaetigung wird STT.listen gestartet;
   * danach nie wieder gezeigt.
   */
  function showSttNotice(onConfirm) {
    var o = buildOverlay("🎤 Spracherkennung");
    o.box.appendChild(el("div", "overlay-text",
      "🎤 Hinweis: Die Spracherkennung von Chrome/Edge sendet deine Sprachaufnahme " +
      "zur Auswertung an einen Dienst des Browser-Herstellers (meist Google). " +
      "Die Aufnahme wird von Tacheles nicht gespeichert. Ohne Mikrofon kannst du " +
      "dich mit '✓ Konnte ich' / '✗ Noch nicht' selbst bewerten."));
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn("Verstanden, aufnehmen", "btn primary big", function () {
      state.profile.sttNoticeConfirmed = true;
      saveState();
      o.close();
      if (onConfirm) onConfirm();
    }));
    actions.appendChild(btn("Abbrechen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }

  function renderSpeak(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    var answered = false;

    // Frisch vorgestellte Woerter werden NACHgesprochen (fair), Bekanntes wird
    // aktiv aus dem Gedaechtnis produziert.
    var fresh = getMastery(item.id) <= 0;
    body.appendChild(el("div", "task-question", fresh ? "Hör zu und sprich nach:" : "Sag das laut auf Hebräisch:"));
    var card = el("div", "card learn-card");
    card.appendChild(el("div", "de-prompt", item.de));
    if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    card.appendChild(heEl(item, { big: true, showHint: true }));
    card.appendChild(speakRow(item, true)); // mit 🐢 (langsam vorsprechen)
    body.appendChild(card);
    if (fresh && state.profile.autoplay) say(item);

    var status = el("div", "stt-status");
    body.appendChild(status);

    function finish(grade) {
      if (answered || !session) return;
      answered = true;
      STT.abort();
      recordAnswer(item.id, "speak", grade);
      later(nextTask, grade === "good" ? 900 : 600);
    }

    if (STT.available()) {
      var mic = btn("🎤 Jetzt sprechen", "btn big mic-btn", function () {
        if (answered) return;
        // Vor der ERSTEN Aufnahme einmalig ueber die Cloud-Erkennung aufklaeren.
        if (!state.profile.sttNoticeConfirmed) { showSttNotice(startListen); return; }
        startListen();
      });
      function startListen() {
        if (answered) return;
        mic.classList.add("recording");
        status.className = "stt-status";
        status.textContent = "Ich höre zu … sprich jetzt.";
        STT.listen(function (res) {
          if (!session || answered) return;
          mic.classList.remove("recording");
          if (res.error) {
            status.className = "stt-status";
            if (res.error === "aborted") {
              status.textContent = "Aufnahme gestoppt (es wurde vorgesprochen). Tipp nochmal auf 🎤.";
            } else if (res.error === "nichts-gehoert" || res.error === "no-speech") {
              status.textContent = "Ich habe nichts gehört. Tipp auf 🎤 und sprich direkt los.";
            } else {
              status.textContent = "Erkennung hat nicht geklappt (" + res.error + "). Bewerte dich einfach selbst. 🙂";
            }
            return;
          }
          if (speechMatches(item, res.transcripts)) {
            status.className = "stt-status ok";
            status.textContent = "Kol hakavod! Das klang richtig. ✓ (+ XP)";
            finish("good");
          } else {
            status.className = "stt-status no";
            status.textContent = "Verstanden: ";
            var heard = el("span", "stt-heard", (res.transcripts && res.transcripts[0]) || "…");
            status.appendChild(heard);
            status.appendChild(document.createTextNode(" – probier’s nochmal oder bewerte selbst."));
          }
        });
      }
      body.appendChild(mic);
      // Auf file:// merkt sich der Browser die Mikrofon-Erlaubnis nicht (fragt
      // pro Wort neu). Ueber localhost (Tacheles-starten.cmd) nur einmal.
      if (location.protocol === "file:" && !state.profile.micHintDismissed) {
        var hint = el("div", "tts-hint mic-hint",
          "💡 Der Browser fragt hier bei jedem Wort nach dem Mikrofon. " +
          "Starte die App über „Tacheles-starten.cmd“ (im App-Ordner), dann fragt er nur einmal. " +
          "Fortschritt vorher exportieren, danach importieren.");
        var ok = btn("Verstanden", "btn ghost small", function () {
          state.profile.micHintDismissed = true;
          saveState();
          hint.remove();
        });
        hint.appendChild(ok);
        body.appendChild(hint);
      }
    } else {
      status.textContent = "Spracherkennung ist in diesem Browser nicht verfügbar – sprich laut und bewerte dich selbst. 🙂";
    }

    var selfRow = el("div", "self-grade-row");
    selfRow.appendChild(btn("✓ Konnte ich", "btn", function () { finish("good"); }));
    selfRow.appendChild(btn("✗ Noch nicht", "btn ghost", function () {
      // Ehrliches "hab ich nicht geschafft": zaehlt als Fehlversuch, geht aber
      // IMMER weiter (das Wort kommt am Ende der Session nochmal).
      if (answered || !session) return;
      answered = true;
      STT.abort();
      recordAnswer(item.id, "speak", "again");
      if (!task.requeued) session.tasks.push({ item: item, kind: "speak", dir: null, requeued: true });
      later(nextTask, 400);
    }));
    body.appendChild(selfRow);
  }

  /* ---------- 11e. Schilder lesen ---------- */

  function renderSignTask(task, title) {
    var body = sessionShell(title, session.i / session.tasks.length);
    var item = task.item;
    body.appendChild(el("div", "task-question", "Was bedeutet dieses Schild?"));
    var frame = el("div", "sign-frame");
    // heEl zeigt Schilder immer ohne Niqqud; Umschrift nur per Tap (wie in echt).
    frame.appendChild(heEl(item, { big: true, showHint: true }));
    body.appendChild(frame);
    body.appendChild(speakRow(item));

    var feedback = el("div", "feedback-note");
    buildOptionButtons(body, item, "signs", "de", function (correct) {
      if (!correct) feedback.textContent = "Das Schild heißt: " + item.de;
    }, task);
    body.appendChild(feedback);
  }

  /* ---------- 11h. Lese-Drills (hearPick/readPick/blend/speed) ---------- */

  /** Aufgabenliste eines Drills (auch vom Lektions-Player genutzt, T8). */
  function buildDrillTasks(drill) {
    var tasks = [];
    var types = drill.types || [];
    if (!READING) return tasks;
    if (drill.level === 1) {
      (drill.syllables || []).forEach(function (he, i) {
        var syl = null;
        READING.syllables.forEach(function (s) { if (s.he === he) syl = s; });
        if (!syl) return; // Silbe nicht im Inventar -> ueberspringen (defensiv)
        // Typen abwechseln: hoeren->waehlen und sehen->lesen im Wechsel.
        var kind = types[i % types.length] || "hearPick";
        tasks.push({ kind: kind, syl: syl });
      });
    } else {
      (drill.wordIds || []).forEach(function (id, i) {
        var item = itemById(id);
        if (!item || !item.niqqud) return;
        var parts = READING.syllabify(item.niqqud);
        if (!parts) return; // nicht sicher zerlegbar -> ueberspringen (nie crashen)
        var kind = types[i % types.length] || (drill.level === 3 ? "speed" : "blend");
        tasks.push({ kind: kind, item: item, parts: parts });
      });
    }
    return tasks;
  }

  /** Distraktor-Silben: gleicher Buchstabe ODER gleicher Vokal zuerst (verwechselbar). */
  function pickSylDistractors(syl, n) {
    var close = READING.syllables.filter(function (s) {
      return s.he !== syl.he && (s.letter === syl.letter || s.vowel === syl.vowel) && s.translit !== syl.translit;
    });
    var rest = READING.syllables.filter(function (s) {
      return s.he !== syl.he && s.translit !== syl.translit && close.indexOf(s) < 0;
    });
    return shuffle(close.slice()).concat(shuffle(rest.slice())).slice(0, n);
  }

  // Label der aktuell korrekten Drill-/Szene-/Demo-Option. Nur ein Debug-/Testhook:
  // die Korrektheit selbst bleibt in der Closure (kein data-correct-opt im DOM).
  var activeCorrectLabel = null;

  /** Gemeinsames Options-UI der Drills; correctIdx bleibt in der Closure. */
  function drillOptions(body, labels, correctIdx, isHe, onAnswer) {
    var list = el("div", "opt-list");
    var done = false;
    activeCorrectLabel = labels[correctIdx];
    labels.forEach(function (label, i) {
      var b = el("button", "opt" + (isHe ? " he-opt" : ""), label);
      if (isHe) { b.dir = "rtl"; b.lang = "he"; }
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = i === correctIdx;
        list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
        b.classList.remove("dim");
        b.classList.add(correct ? "correct" : "wrong");
        if (!correct) list.querySelectorAll(".opt")[correctIdx].classList.add("correct");
        onAnswer(correct);
      });
      list.appendChild(b);
    });
    body.appendChild(list);
    setOptKeys(function (e) {
      if (!session) return;
      if (e.key >= "1" && e.key <= "4") {
        var btns = list.querySelectorAll(".opt");
        var t = btns[+e.key - 1];
        if (t && !t.disabled) { e.preventDefault(); t.click(); }
      } else if (e.key === "Enter" || e.key === " ") {
        var cont = body.querySelector('[data-k="cont"]');
        if (cont) { e.preventDefault(); cont.click(); }
      }
    });
    return list;
  }

  function renderDrillTask() {
    var s = session;
    var task = s.drillTasks[s.i];
    if (!task) return endSession();
    setOptKeys(null);
    var title = s.label + " · " + (s.i + 1) + "/" + s.drillTasks.length;
    var body = sessionShell(title, s.i / s.drillTasks.length);
    renderDrillTaskInto(task, body, function () { s.i++; renderSession(); });
  }

  /** Gemeinsamer Drill-Renderer (T6/T8): rendert EINEN Task in `body`.
   *  `onDone` = "weiter zum naechsten Task" (Reading: session.i++;
   *  Lektion: moduleStepNext). Mehrschritt-Tasks (blend) rendern denselben Task
   *  ueber renderSession neu, bis sie fertig sind, und rufen dann onDone. */
  function renderDrillTaskInto(task, body, onDone) {
    // Nach einer Antwort: richtig -> automatisch weiter, falsch -> "Weiter"-Button.
    var next = function (correct) {
      if (correct) { later(onDone, 900); }
      else {
        var cont = btn("Weiter", "btn primary big", onDone);
        cont.dataset.k = "cont";
        body.appendChild(cont);
        cont.focus();
      }
    };
    if (task.kind === "hearPick") {
      // Silbe hoeren -> geschriebene Silbe waehlen. Kein Item -> recordFreeAnswer.
      body.appendChild(el("div", "task-question", "Welche Silbe hörst du?"));
      var card = el("div", "card learn-card syl-card");
      var play = btn("🔊", "icon-btn large", function () { saySyl(task.syl); });
      card.appendChild(play);
      body.appendChild(card);
      saySyl(task.syl);
      var opts = shuffle([task.syl].concat(pickSylDistractors(task.syl, 3)));
      drillOptions(body, opts.map(function (o) { return o.he; }), opts.indexOf(task.syl), true, function (correct) {
        recordFreeAnswer("mc", correct);
        next(correct);
      });
    } else if (task.kind === "readPick") {
      // Silbe sehen -> Umschrift waehlen.
      body.appendChild(el("div", "task-question", "Wie liest man das?"));
      var card2 = el("div", "card learn-card syl-card");
      var he = el("div", "syl-he", task.syl.he);
      he.dir = "rtl"; he.lang = "he";
      card2.appendChild(he);
      body.appendChild(card2);
      var opts2 = shuffle([task.syl].concat(pickSylDistractors(task.syl, 3)));
      drillOptions(body, opts2.map(function (o) { return o.translit; }), opts2.indexOf(task.syl), false, function (correct) {
        recordFreeAnswer("mc", correct);
        if (correct) saySyl(task.syl);
        next(correct);
      });
    } else if (task.kind === "blend") {
      renderBlendTask(task, body, next);
    } else { // speed
      renderSpeedTask(task, body, next);
    }
  }

  /** Wort zusammenlesen: Silbe fuer Silbe aufdecken, pro Silbe die Lesung waehlen,
   *  am Ende Ganzwort-Audio + eine SRS-Verbuchung (Erkennen he->de). */
  function renderBlendTask(task, body, next) {
    var item = task.item, parts = task.parts;
    var pos = task.pos || 0;
    body.appendChild(el("div", "task-question", "Lies das Wort Silbe für Silbe:"));
    var card = el("div", "card learn-card syl-card");
    var row = el("div", "blend-row");
    row.dir = "rtl"; row.lang = "he";
    parts.forEach(function (p, i) {
      row.appendChild(el("span", "blend-syl" + (i < pos ? " read" : (i === pos ? " current" : " hidden")), p.he));
    });
    card.appendChild(row);
    body.appendChild(card);
    var cur = parts[pos];
    var distr = shuffle(parts.filter(function (p) { return p.translit !== cur.translit; })
      .concat(pickSylDistractors({ he: cur.he, letter: cur.he.charAt(0), vowel: "", translit: cur.translit }, 3))).slice(0, 3);
    var opts = shuffle([cur].concat(distr));
    drillOptions(body, opts.map(function (o) { return o.translit; }), opts.indexOf(cur), false, function (correct) {
      if (correct) saySyl(cur);
      task.errs = (task.errs || 0) + (correct ? 0 : 1);
      if (pos + 1 < parts.length) {
        task.pos = pos + 1;
        later(renderSession, correct ? 700 : 1600); // gleiche Aufgabe, naechste Silbe
      } else {
        // Ganzwort: vorlesen + verbuchen (Lesen = Erkennen, deckelt bei 2).
        say(item);
        recordAnswer(item.id, "mc", task.errs ? "again" : "good", "he2de");
        var reveal = el("div", "listen-reveal");
        reveal.appendChild(el("div", "de-prompt", item.translit + " · " + item.de));
        body.appendChild(reveal);
        next(!task.errs);
      }
    });
  }

  /** Tempo-Lesen: Wort kurz zeigen, dann Bedeutung waehlen. */
  function renderSpeedTask(task, body, next) {
    var item = task.item;
    body.appendChild(el("div", "task-question", "Schnell lesen – was heißt das?"));
    var card = el("div", "card learn-card syl-card");
    var flash = el("div", "speed-flash", item.niqqud || item.he);
    flash.dir = "rtl"; flash.lang = "he";
    card.appendChild(flash);
    body.appendChild(card);
    setTimeout(function () { flash.classList.add("gone"); }, 1600); // CSS blendet aus
    var distr = pickDistractors(item, 3);
    var opts = shuffle([item].concat(distr));
    drillOptions(body, opts.map(function (o) { return o.de; }), opts.indexOf(item), false, function (correct) {
      recordAnswer(item.id, "mc", correct ? "good" : "again", "he2de");
      flash.classList.remove("gone"); // Aufloesung wieder zeigen
      next(correct);
    });
  }

  /* ==========================================================
   * 12. Gruppen-Modi: Paare, Wisch, Reels
   * ========================================================== */

  /* ---------- 12a. Matching (Paare) ---------- */

  function buildMatchRounds(queue) {
    // Innerhalb einer Session keine doppelten de-/he-Texte (waere unloesbar).
    var seenDe = {}, seenHe = {}, items = [];
    queue.forEach(function (it) {
      if (seenDe[it.de] || seenHe[it.he]) return;
      seenDe[it.de] = true; seenHe[it.he] = true;
      items.push(it);
    });
    var rounds = [];
    for (var i = 0; i < items.length; i += 4) {
      var chunk = items.slice(i, i + 4);
      if (chunk.length >= 3 || rounds.length === 0) rounds.push(chunk);
    }
    return rounds.filter(function (r) { return r.length >= 2; });
  }

  function renderMatchRound() {
    var round = session.rounds[session.roundIndex];
    if (!round) return endSession();
    var title = "Paare · Runde " + (session.roundIndex + 1) + "/" + session.rounds.length;
    var body = sessionShell(title, session.roundIndex / session.rounds.length);
    body.appendChild(el("div", "task-question", "Tippe links Deutsch, rechts das passende Hebräisch."));

    var erred = {}, solved = 0, selL = null, selR = null;
    var grid = el("div", "match-grid");
    var colL = el("div", "match-col"), colR = el("div", "match-col");
    grid.appendChild(colL);
    grid.appendChild(colR);
    body.appendChild(grid);

    function makeBtn(item, side) {
      var isHe = side === "R";
      var b = el("button", "match-btn" + (isHe ? " he" : ""), isHe ? heOptionText(item) : item.de);
      if (isHe) { b.dir = "rtl"; b.lang = "he"; }
      b.dataset.id = item.id;
      b.addEventListener("click", function () {
        if (b.classList.contains("done")) return;
        if (isHe) say(item);
        var col = isHe ? colR : colL;
        col.querySelectorAll(".match-btn").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        if (isHe) selR = b; else selL = b;
        checkPair();
      });
      return b;
    }

    function checkPair() {
      if (!selL || !selR) return;
      var l = selL, r = selR;
      selL = null; selR = null;
      if (l.dataset.id === r.dataset.id) {
        var id = l.dataset.id;
        [l, r].forEach(function (x) { x.classList.remove("sel"); x.classList.add("done"); });
        recordAnswer(id, "match", erred[id] ? "again" : "good");
        solved++;
        if (solved >= round.length) {
          session.roundIndex++;
          later(renderSession, 700);
        }
      } else {
        erred[l.dataset.id] = true;
        erred[r.dataset.id] = true;
        [l, r].forEach(function (x) { x.classList.remove("sel"); x.classList.add("bad"); });
        setTimeout(function () { [l, r].forEach(function (x) { x.classList.remove("bad"); }); }, 500);
      }
    }

    shuffle(round.slice()).forEach(function (it) { colL.appendChild(makeBtn(it, "L")); });
    shuffle(round.slice()).forEach(function (it) { colR.appendChild(makeBtn(it, "R")); });
  }

  /* ---------- 12b. Wisch (Tinder-Stil) ---------- */

  function buildSwipeCards(queue) {
    return queue.map(function (it) {
      var makeWrong = Math.random() < 0.5;
      var shownDe = it.de, isTrue = true;
      if (makeWrong) {
        var d = pickDistractors(it, 1)[0];
        if (d) { shownDe = d.de; isTrue = false; }
      }
      return { item: it, shownDe: shownDe, isTrue: isTrue };
    });
  }

  function renderSwipeCard() {
    var card = session.cards[session.i];
    if (!card) return endSession();
    var item = card.item;
    var title = "Wisch · " + (session.i + 1) + "/" + session.cards.length;
    var body = sessionShell(title, session.i / session.cards.length);
    body.appendChild(el("div", "task-question", "Stimmt dieses Paar?"));

    var area = el("div", "swipe-area");
    var cardEl = el("div", "swipe-card");
    cardEl.appendChild(heEl(item, { big: true, showHint: true, quiz: true }));
    cardEl.appendChild(el("div", "swipe-eq", "bedeutet"));
    cardEl.appendChild(el("div", "swipe-de", card.shownDe));
    area.appendChild(cardEl);
    body.appendChild(area);

    var decided = false;
    function decide(saidTrue) {
      if (decided || !session) return;
      decided = true;
      var correct = saidTrue === card.isTrue;
      recordAnswer(item.id, "swipe", correct ? "good" : "again");
      if (session) session.decide = null; // Karte ist entschieden, Tasten erst wieder bei der naechsten
      cardEl.classList.add(saidTrue ? "fly-right" : "fly-left");
      var fb = el("div", "swipe-fb " + (correct ? "ok" : "no"));
      fb.appendChild(el("div", "fb-big", correct ? "✓" : "✗"));
      fb.appendChild(el("div", null, correct ? "Richtig!" : "Leider nein."));
      if (!correct || !card.isTrue) {
        var corr = el("div", "fb-corr");
        var heSpan = el("span", "he-inline", item.he);
        heSpan.dir = "rtl";
        corr.appendChild(heSpan);
        corr.appendChild(document.createTextNode(" = " + item.de));
        fb.appendChild(corr);
      }
      area.appendChild(fb);
      later(function () { session.i++; renderSession(); }, correct ? 900 : 2000);
    }

    // Maus-/Touch-Drag mit Pointer Events
    var startX = null, dragging = false;
    cardEl.addEventListener("pointerdown", function (e) {
      if (decided) return;
      startX = e.clientX;
      dragging = true;
      try { cardEl.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    });
    cardEl.addEventListener("pointermove", function (e) {
      if (!dragging || decided) return;
      var dx = e.clientX - startX;
      cardEl.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 14) + "deg)";
      cardEl.classList.toggle("lean-right", dx > 40);
      cardEl.classList.toggle("lean-left", dx < -40);
    });
    function endDrag(e) {
      if (!dragging || decided) return;
      dragging = false;
      var dx = e.clientX - startX;
      cardEl.classList.remove("lean-right", "lean-left");
      if (dx > 90) decide(true);
      else if (dx < -90) decide(false);
      else cardEl.style.transform = "";
    }
    cardEl.addEventListener("pointerup", endDrag);
    cardEl.addEventListener("pointercancel", function () {
      dragging = false;
      if (!decided) cardEl.style.transform = "";
    });

    var actions = el("div", "swipe-actions");
    var no = btn("✗", "swipe-no", function () { decide(false); });
    no.title = "stimmt nicht (Taste ←)";
    var play = btn("🔊", "icon-btn", function () { say(item); });
    var yes = btn("✓", "swipe-yes", function () { decide(true); });
    yes.title = "stimmt (Taste →)";
    actions.appendChild(no);
    actions.appendChild(play);
    actions.appendChild(yes);
    body.appendChild(actions);
    body.appendChild(el("div", "swipe-hint", "→ wischen oder Taste → = stimmt · ← = stimmt nicht"));

    // Tastatur: ←/→ entscheiden die AKTUELLE Karte (einmal pro Session verdrahtet).
    session.decide = decide;
    if (!session.keyHandler) {
      session.keyHandler = function (e) {
        if (!session || session.mode !== "swipe" || !session.decide) return;
        if (e.key === "ArrowRight") { e.preventDefault(); session.decide(true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); session.decide(false); }
      };
      document.addEventListener("keydown", session.keyHandler);
    }
    if (state.profile.autoplay) say(item);
  }

  /* ---------- 12c. Reels (vertikaler Lern-Feed) ---------- */

  function buildFeed(queue) {
    var feed = [], recent = [];
    queue.forEach(function (it, idx) {
      feed.push({ kind: "reel", item: it });
      recent.push(it);
      // Jedes 4. Reel: Quiz zu einem der zuletzt gezeigten Items (echter Abruf).
      if ((idx + 1) % 4 === 0) {
        var pool = recent.slice(-4);
        feed.push({ kind: "quiz", item: pool[randInt(pool.length)] });
      }
    });
    if (feed.length && feed[feed.length - 1].kind !== "quiz" && recent.length) {
      feed.push({ kind: "quiz", item: recent[recent.length - 1] });
    }
    return feed;
  }

  function reelAdvance() {
    if (!session || session.mode !== "reels") return;
    var entry = session.feed[session.i];
    if (!entry || entry.kind === "quiz") return; // Quiz muss beantwortet werden
    session.i++;
    renderSession();
  }

  /** Startwahl fuer den Reels-Feed: gemischt oder gezielt das empfohlene Thema. */
  function renderReelsChooser() {
    var body = sessionShell("Reels · was schauen wir?", 0);
    body.appendChild(el("div", "task-question", "Womit soll dein Feed gefüllt werden?"));
    var list = el("div", "dlg-list");
    var start = function (theme) {
      var q = theme ? { theme: theme.id } : {};
      session.feed = buildFeed(buildQueue(session.reelsSize || sessionSize(), q));
      if (theme) session.label = theme.emoji + " " + theme.title;
      if (!session.feed.length) { quitSession(); toast("Nicht genug Inhalte."); return; }
      renderSession();
    };
    var mixed = el("button", "dlg-card");
    mixed.appendChild(el("span", "dlg-emoji", "🔀"));
    var mi = el("div", "dlg-info");
    mi.appendChild(el("div", "dlg-title", "Gemischt"));
    mi.appendChild(el("div", "dlg-sub", "Fälliges + Neues quer durch alle Themen"));
    mixed.appendChild(mi);
    mixed.addEventListener("click", function () { start(null); });
    list.appendChild(mixed);
    var rec = recommendedTheme();
    if (rec) {
      var tc = el("button", "dlg-card");
      tc.appendChild(el("span", "dlg-emoji", rec.emoji));
      var ti = el("div", "dlg-info");
      ti.appendChild(el("div", "dlg-title", rec.title));
      ti.appendChild(el("div", "dlg-sub", "dein aktuelles Thema"));
      tc.appendChild(ti);
      tc.addEventListener("click", function () { start(rec); });
      list.appendChild(tc);
    }
    body.appendChild(list);
  }

  function renderReel() {
    if (!session.feed) return renderReelsChooser();
    var entry = session.feed[session.i];
    if (!entry) return endSession();
    var item = entry.item;
    var title = "Reels · " + (session.i + 1) + "/" + session.feed.length;
    var body = sessionShell(title, session.i / session.feed.length, "reels");

    // Tastatur einmal pro Session verdrahten (↑/↓/Leertaste = weiter)
    if (!session.keyHandler) {
      session.keyHandler = function (e) {
        if (!session || session.mode !== "reels") return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " ") {
          e.preventDefault();
          reelAdvance();
        }
      };
      document.addEventListener("keydown", session.keyHandler);
    }
    // Mausrad/Trackpad: nur nach UNTEN blaettert weiter (wie im echten Feed)
    body.addEventListener("wheel", function (e) {
      if (!session) return;
      if (e.deltaY < 25) return;
      var now = Date.now();
      if (now - session.lastWheel < 700) return;
      session.lastWheel = now;
      reelAdvance();
    }, { passive: true });

    if (entry.kind === "reel") {
      var theme = themeById(item.theme);
      body.appendChild(el("div", "reel-theme", (theme ? theme.emoji + " " + theme.title : "")));
      var mid = el("div", "reel-mid");
      mid.appendChild(heEl(item, { big: true, showHint: true }));
      mid.appendChild(el("div", "reel-de", item.de));
      if (item.note) mid.appendChild(el("div", "note-line", "(" + item.note + ")"));
      var play = btn("🔊", "icon-btn", function () { say(item); });
      play.title = "Nochmal anhören";
      mid.appendChild(play);
      if (!TTS.available || !TTS.hasHebrew()) {
        mid.appendChild(el("div", "tts-hint", "Hebräische Stimme im Browser nicht verfügbar"));
      }
      body.appendChild(mid);
      body.appendChild(btn("↑ Weiter", "reel-next", reelAdvance));
      if (state.profile.autoplay) say(item);
    } else {
      // Quiz-Reel: schnelle MC-Frage zu einem gerade gezeigten Item
      body.appendChild(el("div", "quiz-tag", "⚡ Quiz"));
      var mid2 = el("div", "reel-mid");
      mid2.appendChild(el("div", "reel-de", "Was bedeutet …"));
      mid2.appendChild(heEl(item, { big: true, quiz: true }));
      body.appendChild(mid2);

      var options = shuffle([item].concat(pickDistractors(item, 3)));
      var list = el("div", "opt-list");
      var done = false;
      options.forEach(function (opt) {
        var b = el("button", "opt", opt.de);
        b.addEventListener("click", function () {
          if (done) return;
          done = true;
          var correct = opt.id === item.id;
          list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
          b.classList.remove("dim");
          b.classList.add(correct ? "correct" : "wrong");
          if (!correct) {
            list.querySelectorAll(".opt").forEach(function (ob) {
              if (ob.dataset.itemId === item.id) { ob.classList.add("correct"); ob.classList.remove("dim"); }
            });
          }
          recordAnswer(item.id, "reel", correct ? "good" : "again");
          later(function () { session.i++; renderSession(); }, correct ? 900 : 1800);
        });
        b.dataset.itemId = opt.id;
        list.appendChild(b);
      });
      body.appendChild(list);
      body.appendChild(el("div", null, "")); // Platzhalter unten (Layout)
    }
  }

  /* ---------- 12d. Dialog (Gespraeche durchspielen) ---------- */

  /** Alle "me"-Zeilen aller Dialoge (als Distraktoren-Pool). */
  function allMyLines() {
    var out = [];
    (CONTENT.dialogues || []).forEach(function (d) {
      d.lines.forEach(function (l) { if (l.who === "me") out.push(l); });
    });
    return out;
  }

  function dialogueBubble(line) {
    var b = el("div", "bubble " + (line.who === "me" ? "me" : "partner"));
    var he = el("div", "b-he", line.he);
    he.dir = "rtl"; he.lang = "he";
    b.appendChild(he);
    b.appendChild(el("div", "b-translit", line.translit));
    b.appendChild(el("div", "b-de", line.de));
    b.addEventListener("click", function () { sayText(line.he); });
    return b;
  }

  /** Dialoge des freigeschalteten Level-Bereichs (Dialoge ohne band sind immer offen). */
  function unlockedDialogues() {
    return (CONTENT.dialogues || []).filter(function (d) {
      return !d.band || bandUnlocked(d.band);
    });
  }

  function renderDialog() {
    // Schritt 1: Gespraech auswaehlen (nur freigeschaltete Level, wie beim Pfad)
    if (!session.dialogue) {
      var body = sessionShell("Dialog · wähle ein Gespräch", 0);
      body.appendChild(el("div", "task-question", "Welches Gespräch möchtest du üben?"));
      var list = el("div", "dlg-list");
      unlockedDialogues().forEach(function (d) {
        var card = el("button", "dlg-card");
        card.appendChild(el("span", "dlg-emoji", d.emoji));
        var info = el("div", "dlg-info");
        info.appendChild(el("div", "dlg-title", d.title));
        info.appendChild(el("div", "dlg-sub", "mit " + d.partner + " · " + d.lines.length + " Zeilen"));
        card.appendChild(info);
        card.addEventListener("click", function () {
          session.dialogue = d;
          session.lineIdx = 0;
          renderSession();
        });
        list.appendChild(card);
      });
      body.appendChild(list);
      return;
    }

    var d = session.dialogue;
    var idx = session.lineIdx;
    if (idx >= d.lines.length) return endSession();

    var title = d.emoji + " " + d.title + " · " + (idx + 1) + "/" + d.lines.length;
    var body2 = sessionShell(title, idx / d.lines.length);

    // Bisheriger Gespraechsverlauf als Chat
    var chat = el("div", "chat");
    for (var i = 0; i < idx; i++) chat.appendChild(dialogueBubble(d.lines[i]));
    body2.appendChild(chat);

    var line = d.lines[idx];

    if (line.who === "partner") {
      // Partnerzeile erscheint, wird gesprochen; weiter per Knopf.
      chat.appendChild(dialogueBubble(line));
      if (state.profile.autoplay) sayText(line.he);
      body2.appendChild(btn("Weiter →", "btn primary big", function () {
        session.lineIdx++;
        renderSession();
      }));
    } else {
      // Eigene Zeile: richtige Antwort aus 3 Moeglichkeiten waehlen.
      body2.appendChild(el("div", "task-question dlg-prompt", "Du sagst: „" + line.de + "“"));
      var pool = shuffle(allMyLines().filter(function (l) { return l.he !== line.he; })).slice(0, 2);
      var options = shuffle([line].concat(pool));
      var list2 = el("div", "opt-list");
      var done = false;
      options.forEach(function (opt) {
        var b = el("button", "opt he-opt dlg-opt");
        var he = el("div", "b-he", opt.he); he.dir = "rtl"; he.lang = "he";
        b.appendChild(he);
        b.appendChild(el("div", "b-translit", opt.translit));
        b.addEventListener("click", function () {
          if (done) return;
          done = true;
          var correct = opt.he === line.he;
          list2.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
          b.classList.remove("dim");
          b.classList.add(correct ? "correct" : "wrong");
          if (!correct) {
            list2.querySelectorAll(".opt").forEach(function (ob) {
              if (ob.dataset.he === line.he) { ob.classList.add("correct"); ob.classList.remove("dim"); }
            });
          }
          if (line.itemId && itemById(line.itemId)) {
            recordAnswer(line.itemId, "dialog", correct ? "good" : "again");
          } else {
            recordFreeAnswer("dialog", correct);
          }
          sayText(line.he);
          later(function () { session.lineIdx++; renderSession(); }, correct ? 1000 : 2200);
        });
        b.dataset.he = opt.he;
        list2.appendChild(b);
      });
      body2.appendChild(list2);
    }
    // Chat ans Ende scrollen
    window.scrollTo(0, document.body.scrollHeight);
  }

  /* ==========================================================
   * 13. Abschluss-Screen, Konfetti, Init
   * ========================================================== */

  function endSession() {
    if (!session) return;
    var stats = {
      answered: session.answered, correct: session.correct, wrong: session.wrong,
      xp: session.xp, mastered: session.mastered, mode: session.mode,
      startOpts: session.startOpts || {},
      seen: (session.seenList || []).map(function (id) {
        return { id: id, ok: !!session.seenIds[id] };
      })
    };
    // Lektions-Player (T8): Lektion fuer den Rueckblick + Naechste-Lektion-CTA merken.
    if (session.lesson) stats.lesson = { id: session.lesson.id, title: session.lesson.title, emoji: session.lesson.emoji };
    // Modus-Zaehler fuer Abzeichen (nur bei ECHTEM Session-Ende, nicht bei Abbruch)
    var counters = state.gamification.counters;
    if (session.mode === "blitz" && session.correct > (counters.bestBlitz || 0)) {
      counters.bestBlitz = session.correct;
    }
    if (session.mode === "dialog" && session.dialogue &&
        session.lineIdx >= session.dialogue.lines.length) {
      counters.dialogsDone[session.dialogue.id] = true; // nur KOMPLETT gespielte Dialoge
    }
    if (session.exam) {
      stats.exam = true;
      if (session.correct > (counters.bestExam || 0)) counters.bestExam = session.correct;
    }
    counters.sessionsDone = (counters.sessionsDone || 0) + 1;
    stats.firstSession = counters.sessionsDone === 1;
    clearTimeout(session.timer);
    if (session.tick) clearInterval(session.tick);
    if (session.keyHandler) document.removeEventListener("keydown", session.keyHandler);
    if (session.optKeyHandler) document.removeEventListener("keydown", session.optKeyHandler);
    session = null;
    TTS.stop();
    STT.abort();
    checkAchievements();
    maybeAdvanceBand(); // Level-Aufstieg pruefen (Gold-Toast bei neuem Band)
    saveState();
    renderDone(stats);
    celebrate();
  }

  function renderDone(stats) {
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "done-screen");
    if (stats.exam) {
      // Pruefungs-Ergebnis: Score gross + ehrliche Einordnung
      var passed = stats.correct >= 10;
      wrap.appendChild(el("div", "done-emoji", passed ? "🎓" : "📚"));
      wrap.appendChild(el("div", "done-title", passed ? "Bestanden!" : "Survival-Check"));
      wrap.appendChild(el("div", "exam-score", stats.correct + " von " + stats.answered));
      wrap.appendChild(el("div", "done-stats",
        passed ? "Survival-Level erreicht – du liest ohne Stützräder! 🎉" :
        (stats.correct >= 7 ? "Fast! Noch eine Runde Schilder & Basics, dann sitzt es." :
          "Guter Anfang – der Pfad im Lernen-Tab bringt dich hin.")));
      if (passed) celebrate();
    } else {
      var perfect = stats.answered >= 5 && stats.correct === stats.answered;
      wrap.appendChild(el("div", "done-emoji", stats.firstSession ? "🎉" : (perfect ? "💯" : "🕊️")));
      wrap.appendChild(el("div", "done-title",
        stats.firstSession ? "Deine erste Runde!" : (perfect ? "Perfekte Runde!" : "Schön gemacht!")));
      if (stats.firstSession) {
        wrap.appendChild(el("div", "done-sub", "Du hast angefangen – das ist der schwerste Teil. Kol hakavod! 🕊️"));
      }
      wrap.appendChild(el("div", "done-stats",
        stats.answered + " geübt · " + stats.mastered + " neu gemeistert · +" + stats.xp + " XP"));
      if (perfect || stats.firstSession) celebrate();
    }
    var sub = [];
    if (stats.answered) sub.push(Math.round(stats.correct / stats.answered * 100) + " % richtig");
    if (todayLog().goalMet) sub.push("Tagesziel erreicht 🔥");
    else sub.push("noch " + Math.max(0, goalItems() - todayLog().answers) + " bis zum Tagesziel");
    wrap.appendChild(el("div", "done-sub", sub.join(" · ")));

    // Rueckblick: was in dieser Session dran war (zum Nachhoeren)
    if (stats.seen && stats.seen.length) {
      var review = el("div", "done-review");
      review.appendChild(el("div", "done-review-title", "Diese Runde geübt:"));
      var maxShow = 10;
      stats.seen.slice(0, maxShow).forEach(function (s) {
        var item = itemById(s.id);
        if (!item) return;
        var row = el("div", "done-review-row");
        row.appendChild(el("span", "done-review-mark " + (s.ok ? "ok" : "re"), s.ok ? "✓" : "↻"));
        var he = el("span", "done-review-he", item.he);
        he.dir = "rtl"; he.lang = "he";
        row.appendChild(he);
        row.appendChild(el("span", "done-review-de", item.de));
        var p = btn("🔊", "icon-btn small-btn", function () { say(item); });
        row.appendChild(p);
        review.appendChild(row);
      });
      if (stats.seen.length > maxShow) {
        review.appendChild(el("div", "done-review-more", "… und " + (stats.seen.length - maxShow) + " weitere"));
      }
      wrap.appendChild(review);
    }

    // Lektions-Rueckblick: EIN klarer CTA auf die naechste Lektion (statt Themen-Tipp).
    if (stats.lesson && courseAvailable()) {
      var nl = nextLesson();
      if (nl) {
        var lrow = el("div", "done-next", "Als Nächstes: " + nl.emoji + " " + nl.title);
        lrow.setAttribute("role", "button");
        lrow.tabIndex = 0;
        lrow.id = "btn-next-lesson";
        lrow.addEventListener("click", function () { startSession("lesson", { lessonId: nl.id }); });
        wrap.appendChild(lrow);
      }
    }
    // "Was jetzt?": ein klarer naechster Schritt statt Sackgasse (nicht in Lektionen).
    var rec = recommendedTheme();
    if (rec && !stats.exam && !stats.lesson) {
      var nextRow = el("div", "done-next", "Weiter geht’s: " + rec.emoji + " " + rec.title);
      nextRow.setAttribute("role", "button");
      nextRow.tabIndex = 0;
      nextRow.addEventListener("click", function () { startSession("smart", { theme: rec.id }); });
      wrap.appendChild(nextRow);
    }

    var actions = el("div", "done-actions");
    actions.appendChild(btn("Nochmal", "btn ghost", function () { startSession(stats.mode, stats.startOpts); }));
    actions.appendChild(btn("Fertig", "btn primary", function () {
      document.body.classList.remove("in-session");
      showScreen("home");
    }));
    wrap.appendChild(actions);
    app.appendChild(wrap);
  }

  /** Mastery-Check-Abschluss (1.2): Items der Runde mit Checkboxen; falsch
   *  beantwortete sind vorausgewaehlt. "Zuruecknehmen" demotet die angehakten,
   *  der Rest bleibt gemeistert. Danach normaler Abschluss-Screen. */
  function renderMasteryCheckReview() {
    var s = session;
    if (!s) return;
    setOptKeys(null);
    var body = sessionShell("🏅 Mastery-Check · Runde fertig", 1);
    body.appendChild(el("div", "task-question", "Sitzt das wirklich noch? Hake an, was zurück in die Übung soll."));
    var list = el("div", "mcheck-list");
    var boxes = {};
    (s.seenList || []).forEach(function (id) {
      var item = itemById(id);
      if (!item) return;
      var row = el("label", "mcheck-row");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !s.seenIds[id]; // falsch beantwortete vorausgewaehlt
      boxes[id] = cb;
      row.appendChild(cb);
      var he = el("span", "done-review-he", item.he);
      he.dir = "rtl"; he.lang = "he";
      row.appendChild(he);
      row.appendChild(el("span", "done-review-de", item.de));
      row.appendChild(el("span", "mcheck-mark " + (s.seenIds[id] ? "ok" : "re"), s.seenIds[id] ? "✓" : "✗"));
      list.appendChild(row);
    });
    body.appendChild(list);
    var actions = el("div", "done-actions");
    actions.appendChild(btn("Ausgewählte zurücknehmen", "btn primary", function () {
      var n = 0;
      Object.keys(boxes).forEach(function (id) { if (boxes[id].checked && demoteMastery(id)) n++; });
      if (n) toast("💪 " + n + (n === 1 ? " Wort" : " Wörter") + " zurück in die Übung.");
      endSession();
    }));
    actions.appendChild(btn("Alles bleibt gemeistert", "btn ghost", function () { endSession(); }));
    body.appendChild(actions);
  }

  /** Dezentes Konfetti; respektiert prefers-reduced-motion. */
  function celebrate() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch (e) { /* egal */ }
    var layer = $("#confetti-layer");
    if (!layer) return;
    var emojis = ["🎉", "✨", "🕊️", "⭐", "💙"];
    for (var i = 0; i < 26; i++) {
      var s = el("span", "confetti", emojis[i % emojis.length]);
      s.style.left = (Math.random() * 100) + "%";
      s.style.animationDelay = (Math.random() * 0.6) + "s";
      s.style.fontSize = (14 + Math.random() * 18) + "px";
      layer.appendChild(s);
      (function (node) { setTimeout(function () { node.remove(); }, 3400); })(s);
    }
  }

  /* ---------- Alef-Bet-Referenztafel ---------- */

  /** Die 27 Buchstaben in echter Alef-Bet-Reihenfolge (Endformen direkt nach ihrer Grundform). */
  var ALEFBET_ORDER = [
    "let_alef", "let_bet", "let_gimel", "let_dalet", "let_he", "let_vav", "let_zayin",
    "let_chet", "let_tet", "let_yod", "let_kaf", "let_kaf_s", "let_lamed", "let_mem",
    "let_mem_s", "let_nun", "let_nun_s", "let_samech", "let_ayin", "let_pe", "let_pe_s",
    "let_tsadi", "let_tsadi_s", "let_qof", "let_resh", "let_shin", "let_tav"
  ];

  /** "Lesen lernen" (1.4): baut zur Laufzeit ein gefuehrtes Modul aus
   *  vorhandenen Items. Bis zu 3 noch nicht gemeisterte Buchstaben in
   *  Alef-Bet-Reihenfolge; je Buchstabe: Buchstabe vorstellen -> ein kurzes
   *  freigeschaltetes Wort, das ihn ENTHAELT ("so liest man das") ->
   *  Erkennungsfrage zum Buchstaben. Kein neuer Engine, kein neuer Content. */
  function buildReadingModule() {
    var letters = ALEFBET_ORDER.map(itemById).filter(function (it) {
      return it && getMastery(it.id) < 3;
    }).slice(0, 3);
    if (!letters.length) {
      // Alles gemeistert: von vorn wiederholen statt leer auszusteigen.
      letters = ALEFBET_ORDER.map(itemById).filter(Boolean).slice(0, 3);
    }
    var steps = [];
    letters.forEach(function (L) {
      steps.push({ type: "teach", itemId: L.id });
      var word = CONTENT.items.filter(function (it) {
        return (it.type === "word" || it.type === "phrase") &&
          bandUnlocked(itemBand(it)) && String(it.he).indexOf(L.he) >= 0;
      }).sort(function (a, b) {
        // kurz vor lang, dann haeufig vor selten: das lesbarste Aha-Wort zuerst
        return (a.he.length - b.he.length) || ((a.freq || 999) - (b.freq || 999));
      })[0];
      if (word) steps.push({ type: "teach", itemId: word.id, hlLetter: L.he });
      steps.push({ type: "quiz", itemId: L.id });
    });
    return {
      id: "lesen_lernen", title: "Lesen lernen", emoji: "👓",
      sub: "Buchstabe für Buchstabe zum ersten Wort", steps: steps
    };
  }

  function renderAlefbetChart(backScreen) {
    cleanupSession();
    // Default "progress"; als Event-Handler direkt verdrahtet -> Event ist kein String.
    backScreen = (typeof backScreen === "string") ? backScreen : "progress";
    document.body.classList.add("in-session"); // voller Fokus, Nav aus
    var app = $("#app");
    app.innerHTML = "";

    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen(backScreen);
    });
    back.title = "Zurück";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", "🔤 Alef-Bet-Tafel"));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);

    var grid = el("div", "ab-grid");
    ALEFBET_ORDER.forEach(function (id) {
      var it = itemById(id);
      if (!it) return;
      var m = getMastery(id);
      var started = !isNew(id);
      var cell = el("button", "ab-cell");
      var dot = el("span", "ab-dot " + (m >= 3 ? "done" : (started ? "started" : "")));
      dot.title = m >= 3 ? "sitzt" : (started ? "in Arbeit" : "noch neu");
      cell.appendChild(dot);
      var heDiv = el("div", "ab-letter", it.he);
      heDiv.dir = "rtl"; heDiv.lang = "he";
      cell.appendChild(heDiv);
      cell.appendChild(el("div", "ab-name", it.translit));
      // Laut-Kurzform: alles nach dem Gedankenstrich im de-Feld
      var sound = (it.de.split("–")[1] || "").trim();
      if (sound) cell.appendChild(el("div", "ab-sound", sound));
      if (/sofit/.test(it.translit)) cell.appendChild(el("span", "ab-final-tag", "Ende"));
      cell.addEventListener("click", function () { say(it); });
      cell.title = it.de + (it.note ? " · " + it.note : "");
      grid.appendChild(cell);
    });
    app.appendChild(grid);

    var legend = el("div", "ab-legend",
      "🟢 sitzt · 🟡 in Arbeit · ⚪ neu · „Ende“ = Endform am Wortschluss · antippen zum Anhören");
    app.appendChild(legend);

    var practice = btn("🔤 Buchstaben üben", "btn primary big", function () {
      document.body.classList.remove("in-session");
      startSession("smart", { theme: "alefbet" });
    });
    practice.style.marginTop = "14px";
    app.appendChild(practice);
    window.scrollTo(0, 0);
  }

  /* ---------- Vokabel-Browser (Settings -> "Vokabelliste") ---------- */

  /** Bandweise Vokabelliste (WS2): lesen, anhoeren, Mastery zuruecknehmen,
   *  Aussprache als falsch melden. Immer genau EIN Band gerendert (Performance). */
  function renderVocabBrowser(band, onlyMastered, backScreen) {
    cleanupSession();
    document.body.classList.add("in-session");
    if (BANDS.indexOf(band) < 0) band = "A0";
    onlyMastered = !!onlyMastered;
    backScreen = backScreen || "profile";
    var app = $("#app");
    app.innerHTML = "";

    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen(backScreen);
    });
    back.title = "Zurück";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", "📖 Vokabelliste"));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);

    // Steuerleiste: Band-Waehler (nur Baender mit Items) + Gemeistert-Filter.
    var bar = el("div", "vocab-bar");
    var sel = document.createElement("select");
    sel.id = "vocab-band";
    sel.setAttribute("aria-label", "Level-Band wählen");
    BANDS.filter(function (b) {
      return CONTENT.items.some(function (it) { return itemBand(it) === b; });
    }).forEach(function (b) {
      var o = document.createElement("option");
      o.value = b; o.textContent = b;
      if (b === band) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () { renderVocabBrowser(sel.value, chk.checked, backScreen); });
    bar.appendChild(sel);
    var lbl = el("label", "vocab-filter");
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = "vocab-mastered";
    chk.checked = onlyMastered;
    chk.addEventListener("change", function () { renderVocabBrowser(sel.value, chk.checked, backScreen); });
    lbl.appendChild(chk);
    lbl.appendChild(document.createTextNode(" nur gemeisterte"));
    bar.appendChild(lbl);
    if (state.gamification.masteredCount > 0) {
      bar.appendChild(btn("🏅 Mastery-Check", "btn small", function () {
        document.body.classList.remove("in-session");
        startSession("mastercheck");
      }));
    }
    app.appendChild(bar);

    var items = CONTENT.items.filter(function (it) { return itemBand(it) === band; });
    if (onlyMastered) items = items.filter(function (it) { return getMastery(it.id) >= 3; });
    app.appendChild(el("div", "vocab-count",
      items.length + (items.length === 1 ? " Wort" : " Wörter") + " · Band " + band));
    app.appendChild(el("div", "vocab-rule setting-sub", MASTERY_RULE_TEXT));

    var list = el("div", "vocab-list");
    items.forEach(function (item) {
      var m = getMastery(item.id);
      var row = el("div", "vocab-row");
      var play = btn("🔊", "icon-btn small-btn", function () { say(item); });
      play.title = "Anhören";
      row.appendChild(play);
      var mainCol = el("div", "vocab-main");
      mainCol.appendChild(el("div", "vocab-de", item.de));
      mainCol.appendChild(el("div", "vocab-translit", item.translit || ""));
      row.appendChild(mainCol);
      var he = el("div", "vocab-he", item.niqqud || item.he);
      he.dir = "rtl"; he.lang = "he";
      row.appendChild(he);
      var badge = el("span", "vocab-badge " + (m >= 3 ? "done" : (!isNew(item.id) ? "started" : "fresh")),
        m >= 3 ? "gemeistert" : (!isNew(item.id) ? "in Arbeit" : "neu"));
      row.appendChild(badge);
      if (m >= 3) {
        row.appendChild(btn("nicht gemeistert", "btn ghost small vocab-demote", function () {
          if (demoteMastery(item.id)) {
            toast("💪 " + item.he + " ist zurück in der Übung.");
            renderVocabBrowser(band, onlyMastered, backScreen);
          }
        }));
      }
      var pron = btn("🎙 Aussprache falsch?", "btn ghost small pron-btn" +
        (state.feedback.pronIssues[item.id] ? " active" : ""), function () {
        // "Aussprache falsch"-Schalter (WS2): schreibt/entfernt feedback.pronIssues.
        if (state.feedback.pronIssues[item.id]) {
          delete state.feedback.pronIssues[item.id];
          pron.classList.remove("active");
        } else {
          state.feedback.pronIssues[item.id] = true;
          pron.classList.add("active");
        }
        saveState();
      });
      pron.title = "Aussprache als falsch melden (landet im Feedback)";
      row.appendChild(pron);
      list.appendChild(row);
    });
    app.appendChild(list);
    window.scrollTo(0, 0);
  }

  /* ---------- Feedback (WS3): lokale Notizen + Uebermittlung ---------- */

  var FEEDBACK_ISSUE_BASE = "https://github.com/caol-ila/tacheles/issues/new";
  var FEEDBACK_MAIL = "tacheles@mahlberg.rocks";
  var FEEDBACK_URL_MAX = 6000; // GitHub-Issue-Prefill (grosszuegig)
  var FEEDBACK_MAILTO_MAX = 1800; // mailto: viel enger (Betriebssystem-/Client-Limits)

  /** Notizen + gemeldete Aussprache-Woerter als Markdown-Body. */
  function feedbackBody() {
    var fb = state.feedback;
    var lines = ["Feedback aus der Tacheles-App (Version " + CONTENT.version + ")", ""];
    if (fb.notes.length) {
      lines.push("## Notizen");
      fb.notes.forEach(function (n) {
        lines.push("- (" + dateStr(new Date(n.ts || 0)) + ") " + n.text);
      });
      lines.push("");
    }
    var ids = Object.keys(fb.pronIssues);
    if (ids.length) {
      lines.push("## Aussprache klingt falsch");
      ids.forEach(function (id) {
        var it = itemById(id);
        lines.push(it ? "- " + it.he + " (" + it.translit + " = " + it.de + ") [" + id + "]" : "- " + id);
      });
      lines.push("");
    }
    return lines.join("\n");
  }

  /** base + encodeURIComponent(body), auf max Zeichen gekappt (mit Hinweis im
   *  Text). Surrogat-sicher: Kappen kann ein Emoji mitten in einem Surrogatpaar
   *  auftrennen; ein alleinstehendes High-Surrogate am Ende wuerde
   *  encodeURIComponent werfen. Wir schneiden dann ein Zeichen mehr weg und
   *  fangen den Wurf zusaetzlich ab. */
  function capUrl(base, body, max) {
    var suffix = "\n\n… [gekürzt – Rest bitte anhängen]";
    function enc(s) { try { return encodeURIComponent(s); } catch (e) { return null; } }
    var truncated = false;
    var e = enc(body);
    var url = e === null ? null : base + e;
    while (url === null || url.length > max) {
      truncated = true;
      if (body.length === 0) { url = base + enc(suffix); break; }
      body = body.slice(0, Math.max(0, body.length - 200));
      // Einzelnes High-Surrogate am Ende (halbes Emoji)? Noch ein Zeichen weg.
      var last = body.charCodeAt(body.length - 1);
      if (body.length && last >= 0xD800 && last <= 0xDBFF) body = body.slice(0, body.length - 1);
      var e2 = enc(body + suffix);
      url = e2 === null ? null : base + e2;
    }
    return { url: url, truncated: truncated };
  }

  function feedbackIssueUrl() {
    return capUrl(FEEDBACK_ISSUE_BASE + "?title=" + encodeURIComponent("App-Feedback") + "&body=",
      feedbackBody(), FEEDBACK_URL_MAX);
  }

  function feedbackMailtoUrl() {
    return capUrl("mailto:" + FEEDBACK_MAIL + "?subject=" + encodeURIComponent("Tacheles-Feedback") + "&body=",
      feedbackBody(), FEEDBACK_MAILTO_MAX);
  }

  /** Link nutzerinitiiert oeffnen (funktioniert auch auf file:// und fuer mailto:). */
  function openExternal(url) {
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** Feedback-Hub (WS3): Notizen erfassen/ansehen/loeschen, gemeldete
   *  Aussprache-Woerter, Uebermitteln via GitHub-Issue-Prefill oder mailto.
   *  Uebermitteln leert die lokale Sammlung bewusst NICHT. */
  function renderFeedback(backScreen) {
    backScreen = backScreen || "profile";
    cleanupSession();
    document.body.classList.add("in-session");
    var app = $("#app");
    app.innerHTML = "";

    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen(backScreen);
    });
    back.title = "Zurück";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", "💬 Feedback"));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);

    // Erfassen
    var card = el("section", "card");
    card.appendChild(el("div", "setting-label", "Was soll besser werden?"));
    var ta = el("textarea", "fb-textarea");
    ta.rows = 3;
    ta.maxLength = 2000;
    ta.placeholder = "Tippfehler, komische Übersetzung, Wunsch … alles hilft.";
    ta.setAttribute("aria-label", "Feedback-Notiz");
    card.appendChild(ta);
    card.appendChild(btn("Notiz speichern", "btn primary", function () {
      var text = ta.value.trim();
      if (!text) { toast("Erst etwas schreiben. 🙂"); return; }
      state.feedback.notes.push({ ts: Date.now(), text: text.slice(0, 2000) });
      saveState();
      toast("Gespeichert. 📝");
      renderFeedback(backScreen);
    }));
    app.appendChild(card);

    // Gesammelte Notizen
    var notes = state.feedback.notes;
    var nCard = el("section", "card");
    nCard.appendChild(el("div", "setting-label", "Deine Notizen (" + notes.length + ")"));
    if (!notes.length) {
      nCard.appendChild(el("div", "setting-sub", "Noch keine Notizen."));
    } else {
      notes.forEach(function (n, idx) {
        var row = el("div", "fb-note");
        row.appendChild(el("span", "fb-note-date", dateStr(new Date(n.ts || 0))));
        row.appendChild(el("span", "fb-note-text", n.text));
        var del = btn("🗑", "icon-btn small-btn", function () {
          state.feedback.notes.splice(idx, 1);
          saveState();
          renderFeedback(backScreen);
        });
        del.title = "Notiz löschen";
        row.appendChild(del);
        nCard.appendChild(row);
      });
      nCard.appendChild(btn("Alle Notizen löschen", "btn ghost small", function () {
        if (!confirm("Wirklich alle Notizen löschen?")) return;
        state.feedback.notes = [];
        saveState();
        renderFeedback(backScreen);
      }));
    }
    app.appendChild(nCard);

    // Gemeldete Aussprache (aus der Vokabelliste)
    var ids = Object.keys(state.feedback.pronIssues);
    var pCard = el("section", "card");
    pCard.appendChild(el("div", "setting-label", "Aussprache gemeldet (" + ids.length + ")"));
    if (!ids.length) {
      pCard.appendChild(el("div", "setting-sub",
        "Nichts markiert. In der 📖 Vokabelliste kannst du Wörter mit „🎙 Aussprache falsch?“ melden."));
    } else {
      ids.forEach(function (id) {
        var it = itemById(id);
        var row = el("div", "fb-note");
        var he = el("span", "done-review-he", it ? it.he : id);
        he.dir = "rtl"; he.lang = "he";
        row.appendChild(he);
        row.appendChild(el("span", "fb-note-text", it ? (it.translit + " = " + it.de) : ""));
        var del = btn("🗑", "icon-btn small-btn", function () {
          delete state.feedback.pronIssues[id];
          saveState();
          renderFeedback(backScreen);
        });
        del.title = "Meldung entfernen";
        row.appendChild(del);
        pCard.appendChild(row);
      });
    }
    app.appendChild(pCard);

    // Uebermitteln (ehrlicher Hinweis: oeffentlich + Login, nichts automatisch)
    var sCard = el("section", "card");
    sCard.appendChild(el("div", "setting-label", "Übermitteln"));
    // Betonung ueber <b> statt Grossbuchstaben (barrierefreier, ruhiger Ton).
    var note = el("p", "setting-sub");
    note.appendChild(document.createTextNode(
      "Die App sendet nichts von selbst. „Auf GitHub übermitteln“ öffnet ein vorbefülltes, "));
    note.appendChild(el("b", null, "öffentliches"));
    note.appendChild(document.createTextNode(
      " GitHub-Issue (GitHub-Konto nötig). Ohne GitHub geht es per E-Mail. " +
      "Deine Sammlung hier bleibt danach erhalten, löschen kannst du sie oben selbst."));
    sCard.appendChild(note);
    var actions = el("div", "data-actions");
    actions.appendChild(btn("🐙 Auf GitHub übermitteln", "btn primary", function () {
      var r = feedbackIssueUrl();
      if (r.truncated) toast("Hinweis: Das Feedback war zu lang und wurde gekürzt.");
      openExternal(r.url);
    }));
    actions.appendChild(btn("✉️ Per E-Mail senden", "btn", function () {
      var r = feedbackMailtoUrl();
      if (r.truncated) toast("Hinweis: Das Feedback war zu lang und wurde gekürzt.");
      openExternal(r.url);
    }));
    sCard.appendChild(actions);
    app.appendChild(sCard);
    window.scrollTo(0, 0);
  }

  /* ---------- Kontakt/Impressum + Datenschutz (WS4, In-App-Screens) ---------- */

  /** Statischer Info-Screen (Kontakt/Datenschutz): Titel + HTML-Body,
   *  Zurueck fuehrt ins Profil. Inhalte sind feste, vertrauenswuerdige Strings. */
  function renderInfoScreen(titleText, bodyHtml, backScreen) {
    backScreen = backScreen || "profile";
    cleanupSession();
    document.body.classList.add("in-session");
    var app = $("#app");
    app.innerHTML = "";
    var head = el("div", "session-head");
    var back = btn("✕", "quit-btn", function () {
      document.body.classList.remove("in-session");
      showScreen(backScreen);
    });
    back.title = "Zurück";
    head.appendChild(back);
    var mid = el("div", "session-info");
    mid.appendChild(el("div", "session-title", titleText));
    head.appendChild(mid);
    head.appendChild(el("div", "session-xp", ""));
    app.appendChild(head);
    var body = el("div", "legal-body");
    body.innerHTML = bodyHtml;
    app.appendChild(body);
    window.scrollTo(0, 0);
  }

  var LEGAL_DISCLAIMER =
    '<section class="card legal-disclaimer"><p class="setting-sub"><b>Hinweis:</b> Dieser Text ist eine ' +
    'Laien-Vorlage und keine Rechtsberatung. Vor einem Betrieb über den privaten Rahmen hinaus ' +
    'bitte fachlich prüfen lassen.</p></section>';

  var LEGAL_STAND = '<p class="setting-sub legal-stand" style="margin-top:12px">Stand: Juli 2026</p>';

  function renderContact(backScreen) {
    renderInfoScreen("📮 Kontakt / Impressum",
      '<section class="card">' +
      '<p>Tacheles ist ein privates, nicht-kommerzielles Lernprojekt, ohne Werbung, ' +
      'ohne Bezahlfunktionen, ohne geschäftsmäßigen Hintergrund.</p>' +
      '<p style="margin-top:10px"><b>Verantwortlich:</b> Thomas Mahlberg<br>' +
      '<b>Kontakt:</b> <a href="mailto:tacheles@mahlberg.rocks">tacheles@mahlberg.rocks</a></p>' +
      '<p class="setting-sub" style="margin-top:10px">Als rein privates Angebot besteht keine ' +
      'Impressumspflicht mit ladungsfähiger Anschrift. Sollte Tacheles einmal kommerzielle Züge ' +
      'bekommen (Werbung, Spenden, Verkauf), wäre eine ladungsfähige Anschrift nachzurüsten.</p>' +
      LEGAL_STAND +
      '</section>' + LEGAL_DISCLAIMER, backScreen);
  }

  function renderPrivacy(backScreen) {
    renderInfoScreen("🔒 Datenschutz",
      '<section class="card">' +
      '<h3 class="legal-h">Verantwortlicher</h3>' +
      '<p>Thomas Mahlberg · <a href="mailto:tacheles@mahlberg.rocks">tacheles@mahlberg.rocks</a></p>' +

      '<h3 class="legal-h">Hosting (GitHub Pages)</h3>' +
      '<p>Wenn du Tacheles über das Internet aufrufst, wird die App von GitHub Pages ausgeliefert ' +
      '(GitHub Inc., ein Unternehmen von Microsoft, USA). Dabei verarbeitet GitHub technisch bedingt ' +
      'Verbindungsdaten, insbesondere deine IP-Adresse und Server-Logs. Darauf haben wir keinen ' +
      'Einfluss. Es findet dabei eine Datenübermittlung in die USA statt (Drittland). Rechtsgrundlage ' +
      'ist unser berechtigtes Interesse an einer sicheren und effizienten Bereitstellung der App ' +
      '(Art. 6 Abs. 1 lit. f DSGVO). GitHub ist nach eigenen Angaben unter dem EU-U.S. Data Privacy ' +
      'Framework zertifiziert. Details: ' +
      '<a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" ' +
      'target="_blank" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>' +

      '<h3 class="legal-h">Keine eigene Datenerhebung</h3>' +
      '<p>Tacheles selbst erhebt nichts: kein Tracking, keine Cookies, keine Analyse, keine Konten. ' +
      'Dein gesamter Lernfortschritt liegt ausschließlich lokal in deinem Browser (localStorage) und ' +
      'verlässt dein Gerät nur, wenn du ihn selbst exportierst oder einen Sync-Code erzeugst.</p>' +

      '<h3 class="legal-h">Mikrofon &amp; Spracherkennung</h3>' +
      '<p>Nur wenn du den Sprechen-Modus aktiv nutzt, greift die Spracherkennung deines Browsers ' +
      '(Chrome/Edge). Diese sendet die Aufnahme zur Auswertung an einen Dienst des ' +
      'Browser-Herstellers. Tacheles speichert keine Aufnahmen. Vor der ersten Aufnahme wirst du in ' +
      'der App darauf hingewiesen.</p>' +

      '<h3 class="legal-h">Sprachausgabe</h3>' +
      '<p>Die vorproduzierten Audiodateien werden zusammen mit der App ausgeliefert. Zur Laufzeit ' +
      'wird dafür nichts bei Dritten abgerufen. Fehlt eine Audiodatei, nutzt Tacheles ersatzweise die ' +
      'Sprachausgabe deines Browsers. Je nach Browser und Stimme kann dabei der vorzulesende Text an ' +
      'einen Dienst des Browser-Herstellers übertragen werden.</p>' +

      '<h3 class="legal-h">Feedback</h3>' +
      '<p>„Übermitteln“ im Feedback-Bereich öffnet auf deinen Klick hin GitHub (öffentliches Issue, ' +
      'GitHub-Konto nötig) oder dein E-Mail-Programm. Erst dann verlassen die von dir eingegebenen ' +
      'Inhalte dein Gerät. Die App sendet nichts automatisch.</p>' +

      '<h3 class="legal-h">Deine Rechte</h3>' +
      '<p>Auskunft, Berichtigung, Löschung und Co. laufen mangels serverseitiger Speicherung faktisch ' +
      'über dein Gerät: Im Profil kannst du alle Daten exportieren oder vollständig zurücksetzen; ' +
      'zusätzlich löscht das Leeren der Browserdaten alles. Außerdem hast du das Recht, dich bei einer ' +
      'Datenschutz-Aufsichtsbehörde zu beschweren. Bei Fragen: ' +
      '<a href="mailto:tacheles@mahlberg.rocks">tacheles@mahlberg.rocks</a>.</p>' +
      LEGAL_STAND +
      '</section>' + LEGAL_DISCLAIMER, backScreen);
  }

  /* ---------- Onboarding (nur beim allerersten Start) ---------- */

  function renderOnboarding(step) {
    cleanupSession();
    document.body.classList.add("in-session"); // Nav ausblenden, voller Fokus
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "onb");

    if (step === 1) {
      wrap.appendChild(el("div", "onb-logo", "🕊️"));
      wrap.appendChild(el("div", "onb-title", "Tacheles"));
      wrap.appendChild(el("div", "onb-sub", "dein Schalömchen"));
      wrap.appendChild(el("div", "onb-tag", "Reden wir Tacheles. Sag Schalom."));
      var pitch = el("div", "onb-pitch");
      [["👁️", "Lesen: echte Schilder entziffern, Schritt für Schritt ohne Stützräder"],
       ["👂", "Hören: jedes Wort mit Aussprache"],
       ["🎤", "Sprechen: vom ersten Tag an, in echten Dialogen"]].forEach(function (p) {
        var row = el("div", "onb-pitch-row");
        row.appendChild(el("span", "onb-pitch-emoji", p[0]));
        row.appendChild(el("span", null, p[1]));
        pitch.appendChild(row);
      });
      wrap.appendChild(pitch);
      wrap.appendChild(btn("Los geht’s →", "btn primary big", function () { renderOnboarding(2); }));
    } else if (step === 2) {
      wrap.appendChild(el("div", "onb-step", "Schritt 1 von 3"));
      wrap.appendChild(el("div", "onb-title small", "Wie viel Zeit pro Tag?"));
      wrap.appendChild(el("div", "onb-sub", "Ehrlich bleiben – dranbleiben schlägt Marathon. Du kannst es jederzeit ändern."));
      var goals = el("div", "onb-goals");
      [[5, "5 Min", "der Klassiker"], [10, "10 Min", "zügig voran"],
       [15, "15 Min", "ambitioniert"], [20, "20 Min", "Vollgas"]].forEach(function (g) {
        var b = el("button", "onb-goal" + (state.profile.dailyGoalMin === g[0] ? " sel" : ""));
        b.appendChild(el("div", "onb-goal-num", g[1]));
        b.appendChild(el("div", "onb-goal-sub", g[2]));
        b.addEventListener("click", function () {
          state.profile.dailyGoalMin = g[0];
          saveState();
          renderOnboarding("know");
        });
        goals.appendChild(b);
      });
      wrap.appendChild(goals);
    } else if (step === "know") {
      // Vorkenntnisse abfragen: bei null anfangen oder einstufen lassen.
      wrap.appendChild(el("div", "onb-step", "Schritt 2 von 3"));
      wrap.appendChild(el("div", "onb-title small", "Kennst du schon etwas Hebräisch?"));
      wrap.appendChild(el("div", "onb-sub",
        "Wenn du schon Wörter kannst, stufen wir dich passend ein. Sonst fangen wir gemütlich bei null an."));
      // Anfaenger sind die Regel: "bei null anfangen" steht oben und primaer.
      var nein = btn("Nein, ich fange bei null an", "btn primary big", function () { renderOnboarding(3); });
      var ja = btn("Ja, einstufen lassen", "btn ghost big", function () { startPlacement(true); });
      wrap.appendChild(nein);
      wrap.appendChild(ja);
    } else {
      var shalom = itemById("shalom");
      wrap.appendChild(el("div", "onb-step", "Schritt 3 von 3"));
      wrap.appendChild(el("div", "onb-title small", "Dein erstes Wort 🎉"));
      var card = el("div", "card learn-card onb-word");
      var he = el("div", "he-text big", (shalom && shalom.niqqud) || "שָׁלוֹם");
      he.dir = "rtl"; he.lang = "he";
      card.appendChild(he);
      card.appendChild(el("div", "translit", "shalom"));
      card.appendChild(el("div", "de-prompt", "Hallo · Friede · Tschüss"));
      if (shalom) card.appendChild(speakRow(shalom));
      wrap.appendChild(card);
      wrap.appendChild(el("div", "onb-sub",
        "Die Punkte unter den Buchstaben (Niqqud) und die Umschrift sind deine Stützräder. " +
        "Sie verblassen automatisch, sobald ein Wort sitzt – bis du liest wie auf echten Schildern."));
      wrap.appendChild(btn("Und los! 🚀", "btn primary big", function () {
        state.profile.onboarded = true;
        saveState();
        toast("Schalom! Schön, dass du da bist. 🕊️");
        // Frisch onboarded: die Tour einmal automatisch (skippbar, WS5).
        renderTour(0);
      }));
    }
    app.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  /* ---------- Interaktive Tour (WS-F): Spotlight auf ECHTE Bedienung ---------- */

  var tourDemo = false;      // Demo-Modus: recordAnswer verbucht NICHTS (WS-F)
  var tourKeyHandler = null; // Escape beendet die Tour (immer entkommbar)

  function setTourKeys() {
    clearTourKeys();
    tourKeyHandler = function (e) {
      if (e.key === "Escape") { e.preventDefault(); finishTour(); }
    };
    document.addEventListener("keydown", tourKeyHandler);
  }
  function clearTourKeys() {
    if (tourKeyHandler) { document.removeEventListener("keydown", tourKeyHandler); tourKeyHandler = null; }
  }

  /** Schritte: screen = vorher rendern; sel = Spotlight-Ziel (fehlt/null -> zentrierte Karte);
   *  demo = eine echte Beispiel-Frage in der Karte. */
  var TOUR_STEPS = [
    { screen: "home", sel: "#btn-snack", title: "Dein Häppchen",
      text: "Jeden Tag ein kleines Wissens-Häppchen: zwei Minuten, ein Aha. Hier startest du es." },
    { screen: "home", sel: null, demo: true, title: "So fühlt sich Lernen an",
      text: "Probier eine echte Frage – die Antwort zählt in der Tour noch nicht." },
    { screen: "home", sel: "#cta-lesson", title: "Dein Kurs",
      text: "Der Kurs führt dich Lektion für Lektion von Schalom bis zu echten Gesprächen. Weiterlernen ist immer der schnellste Weg." },
    { screen: "course", sel: ".lesson-row.next", title: "Dein Pfad",
      text: "Jede Lektion: Szene, neue Wörter, ein Grammatik-Punkt, Hören, Quiz. Erledigtes bleibt spielbar." },
    { screen: "vocab", sel: "#cta-power", title: "Freies Training",
      text: "So viel du willst: Power-Training, 13 Modi, Themen, Blitz. Alles zahlt auf dein SRS ein." },
    { screen: "grammar", sel: "#reading-block", title: "Grammatik & Lesen",
      text: "Regeln verstehen und Silben zu Wörtern verschmelzen – hier wird aus Erkennen echtes Lesen." },
    { screen: "home", sel: "#stats-row", title: "Ehrlicher Fortschritt",
      text: "Tippe auf deine Statistik für den vollen Fortschritt. „Gemeistert“ heißt: aktiv abgerufen – und du kannst jederzeit dein Veto einlegen." }
  ];

  /** Tour-Schritt idx rendern: echten Screen zeigen, Spotlight aufs Ziel-Element
   *  (fehlt es, zentrierte Karte). Immer skippbar (Button + Escape). */
  function renderTour(idx) {
    cleanupSession();
    idx = idx || 0;
    // Defensiv: kein zweites Overlay stapeln.
    var oldDim = document.querySelector(".tour-dim");
    if (oldDim) oldDim.remove();
    // Tour gilt beim START als gesehen (idempotent): wer neu ist und die Tour
    // mittendrin verlaesst, bekommt spaeter NICHT den Bestandsnutzer-Hinweis.
    if (!state.profile.tourSeen) { state.profile.tourSeen = true; saveState(); }
    var step = TOUR_STEPS[idx];
    if (!step) return finishTour();
    tourDemo = true;
    showScreen(step.screen); // echten Screen rendern (Nav bleibt sichtbar)
    setTourKeys();
    // Overlay nach dem Rendern aufsetzen (Ziel-Element messen).
    var target = step.sel ? document.querySelector(step.sel) : null;
    var dim = el("div", "tour-dim");
    if (target) {
      var r = target.getBoundingClientRect();
      var spot = el("div", "tour-spot");
      spot.style.top = (r.top - 6) + "px";
      spot.style.left = (r.left - 6) + "px";
      spot.style.width = (r.width + 12) + "px";
      spot.style.height = (r.height + 12) + "px";
      dim.appendChild(spot);
    }
    var card = el("div", "tour-card" + (target ? "" : " centered"));
    card.appendChild(el("div", "onb-step", "Einführung · " + (idx + 1) + "/" + TOUR_STEPS.length));
    card.appendChild(el("div", "onb-title small", step.title));
    card.appendChild(el("div", "onb-sub", step.text));
    if (step.demo) buildTourDemo(card);
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn(idx + 1 < TOUR_STEPS.length ? "Weiter →" : "Los geht’s 🚀", "btn primary big", function () {
      dim.remove();
      renderTour(idx + 1);
    }));
    actions.appendChild(btn("Überspringen", "btn ghost big", function () {
      dim.remove();
      finishTour();
    }));
    card.appendChild(actions);
    dim.appendChild(card);
    if (target && card.classList.contains("centered") === false) {
      // Karte unter/ueber dem Spot positionieren (einfach: unteres Drittel vs. oberes).
      var below = (target.getBoundingClientRect().top < window.innerHeight / 2);
      card.style.top = below ? "auto" : "12px";
      card.style.bottom = below ? "12px" : "auto";
    }
    document.body.appendChild(dim);
    window.scrollTo(0, 0);
  }

  /** Demo-Frage: echte MC-Bedienung, verbucht via tourDemo-Flag nichts. */
  function buildTourDemo(card) {
    var item = itemById("shalom") || CONTENT.items[0];
    var q = el("div", "card learn-card");
    var he = el("div", "he-text big", item.niqqud || item.he);
    he.dir = "rtl"; he.lang = "he";
    q.appendChild(he);
    card.appendChild(q);
    var opts = shuffle([item].concat(pickDistractors(item, 3)));
    var list = el("div", "opt-list");
    var done = false;
    activeCorrectLabel = item.de;
    opts.forEach(function (o) {
      var b = el("button", "opt", o.de);
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = o.id === item.id;
        list.querySelectorAll(".opt").forEach(function (x) { x.disabled = true; x.classList.add("dim"); });
        b.classList.remove("dim");
        b.classList.add(correct ? "correct" : "wrong");
        recordAnswer(item.id, "mc", correct ? "good" : "again", "he2de"); // no-op im Demo-Modus
        say(item);
        // Gold-Moment inkl. Veto ZEIGEN (nur Demo-Toast, kein State):
        toast("🏅 So sieht’s aus, wenn ein Wort sitzt · tippen wäre dein Veto", "gold", function () {
          toast("Genau so nimmst du ein Wort zurück. 💪");
        });
      });
      list.appendChild(b);
    });
    card.appendChild(list);
  }

  function finishTour() {
    tourDemo = false;
    clearTourKeys();
    state.profile.tourSeen = true;
    saveState();
    var dim = document.querySelector(".tour-dim");
    if (dim) dim.remove();
    document.body.classList.remove("in-session");
    showScreen("home");
  }

  /** Einmaliger Hinweis fuer Bestandsnutzer (onboarded && !tourSeen).
   *  tourSeen wird schon beim ANZEIGEN gesetzt: der Hinweis kommt garantiert
   *  nur einmal, egal wie das Overlay geschlossen wird. */
  function showTourNotice() {
    state.profile.tourSeen = true;
    saveState();
    var o = buildOverlay("✨ Neu: kurze Einführung");
    o.box.appendChild(el("div", "overlay-text",
      "Tacheles hat jetzt einen richtigen Kurs, Wissens-Häppchen und einen Lese-Trainer. " +
      "Eine kurze interaktive Tour zeigt dir alles an Ort und Stelle. Du findest sie " +
      "jederzeit im Profil unter „Einführung ansehen“."));
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn("Ansehen", "btn primary big", function () {
      o.close();
      renderTour(0);
    }));
    actions.appendChild(btn("Überspringen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }

  /* ==========================================================
   * 15. Einstufungstest (Placement)
   * Eigenstaendiger Screen-Fluss (wie Onboarding, NICHT die Session-Engine).
   * Pro Band A0..C2 vier MC-Fragen he->de in Ziel-Ansicht (ohne Stuetzraeder).
   * Bestanden ab 3/4, Stopp beim ersten Fehlversuch. KEIN SRS/XP/Log.
   * ========================================================== */

  var placement = null;
  var placementKeyHandler = null;

  function setPlacementKeys(fn) {
    clearPlacementKeys();
    placementKeyHandler = fn;
    if (fn) document.addEventListener("keydown", fn);
  }
  function clearPlacementKeys() {
    if (placementKeyHandler) {
      document.removeEventListener("keydown", placementKeyHandler);
      placementKeyHandler = null;
    }
  }

  function startPlacement(fromOnboarding) {
    cleanupSession();
    placement = { fromOnboarding: !!fromOnboarding, bandIdx: 0, highestPassed: -1 };
    document.body.classList.add("in-session");
    placementNextBand();
  }

  function placementNextBand() {
    if (!placement) return;
    if (placement.bandIdx >= BANDS.length) return placementFinish();
    var band = BANDS[placement.bandIdx];
    var pool = CONTENT.items.filter(function (it) {
      return itemBand(it) === band && (it.type === "word" || it.type === "phrase");
    });
    // Zu wenig Material fuer diese Stufe (z. B. Band noch ohne Inhalte): Test endet.
    if (pool.length < 4) return placementFinish();
    placement.band = band;
    placement.pool = pool;
    placement.questions = shuffle(pool.slice()).slice(0, 4);
    placement.q = 0;
    placement.correct = 0;
    renderPlacementQuestion();
  }

  function renderPlacementQuestion() {
    var p = placement;
    var item = p.questions[p.q];
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "onb placement");
    // Ausweg statt Sackgasse: Abbrechen fuehrt zurueck, ohne etwas zu veraendern.
    var head = el("div", "session-head");
    var quit = btn("✕", "quit-btn", function () {
      var fromOnb = p.fromOnboarding;
      clearPlacementKeys();
      placement = null;
      if (fromOnb) {
        renderOnboarding("know");
      } else {
        document.body.classList.remove("in-session");
        showScreen("profile");
      }
    });
    quit.title = "Einstufung abbrechen";
    head.appendChild(quit);
    // Gesamtfortschritt ueber alle Baender (BANDS.length Stufen), damit klar ist, wie weit es noch geht.
    var info = el("div", "session-info");
    var barWrap = el("div", "bar mini");
    var barFill = el("div", "bar-fill");
    barFill.style.width = Math.round(p.bandIdx / BANDS.length * 100) + "%";
    barWrap.appendChild(barFill);
    info.appendChild(barWrap);
    head.appendChild(info);
    wrap.appendChild(head);
    wrap.appendChild(el("div", "onb-step", "Einstufung · Level " + p.band));
    wrap.appendChild(el("div", "placement-progress", "Frage " + (p.q + 1) + " von " + p.questions.length));
    wrap.appendChild(el("div", "onb-title small", "Was bedeutet das?"));
    var card = el("div", "card learn-card");
    var he = el("div", "he-text big", item.he); // Ziel-Ansicht: keine Niqqud-/Umschrift-Hilfe
    he.dir = "rtl"; he.lang = "he";
    card.appendChild(he);
    wrap.appendChild(card);

    // Optionen: richtig + bis zu 3 aus demselben Band. Distraktoren werden auch
    // untereinander dedupliziert (nach de UND he), damit keine zwei Optionen
    // denselben Text tragen (seen-set-Muster wie moduleFillDistractors).
    var seenDe = {}, seenHe = {}, distr = [];
    seenDe[item.de] = true; seenHe[item.he] = true;
    shuffle(p.pool.slice()).forEach(function (x) {
      if (distr.length >= 3) return;
      if (x.id === item.id || seenDe[x.de] || seenHe[x.he]) return;
      seenDe[x.de] = true; seenHe[x.he] = true;
      distr.push(x);
    });
    var options = shuffle([item].concat(distr));
    var list = el("div", "opt-list");
    var done = false;
    options.forEach(function (opt) {
      var b = el("button", "opt", opt.de);
      b.dataset.itemId = opt.id;
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = opt.id === item.id;
        list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
        b.classList.remove("dim");
        if (correct) { b.classList.add("correct"); p.correct++; }
        else {
          b.classList.add("wrong");
          list.querySelectorAll(".opt").forEach(function (ob) {
            if (ob.dataset.itemId === item.id) { ob.classList.add("correct"); ob.classList.remove("dim"); }
          });
        }
        // Bewusst KEIN recordAnswer/SRS/XP/Log — reine Diagnose.
        setTimeout(placementAnswerNext, correct ? 650 : 1100);
      });
      list.appendChild(b);
    });
    wrap.appendChild(list);

    // "Weiß ich nicht": zaehlt als Fehlversuch, geht sofort weiter (weniger Rate-Glueck).
    var unsure = btn("Weiß ich nicht", "btn ghost", function () {
      if (done) return;
      done = true;
      list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
      list.querySelectorAll(".opt").forEach(function (ob) {
        if (ob.dataset.itemId === item.id) { ob.classList.add("correct"); ob.classList.remove("dim"); }
      });
      setTimeout(placementAnswerNext, 900);
    });
    unsure.style.marginTop = "6px";
    wrap.appendChild(unsure);

    app.appendChild(wrap);
    setPlacementKeys(function (e) {
      if (e.key >= "1" && e.key <= "4") {
        var btns = list.querySelectorAll(".opt");
        var t = btns[+e.key - 1];
        if (t && !t.disabled) { e.preventDefault(); t.click(); }
      }
    });
    window.scrollTo(0, 0);
  }

  function placementAnswerNext() {
    var p = placement;
    if (!p) return;
    p.q++;
    if (p.q < p.questions.length) return renderPlacementQuestion();
    // Band ausgewertet: bestanden ab 3/4.
    if (p.correct >= 3) {
      p.highestPassed = p.bandIdx;
      p.bandIdx++;
      placementNextBand();
    } else {
      placementFinish();
    }
  }

  function placementFinish() {
    var p = placement;
    clearPlacementKeys();
    // Ergebnis-Band = Band NACH dem hoechsten bestandenen (max. letztes Band),
    // aber nie unter dem aktuellen Stand (Einstufung nimmt nichts weg).
    var resultIdx;
    if (p.highestPassed < 0) resultIdx = bandIndex("A1"); // A0 nicht bestanden -> Default A1
    else resultIdx = Math.min(p.highestPassed + 1, BANDS.length - 1);
    resultIdx = Math.max(resultIdx, bandIndex(state.profile.unlockedBand));
    var band = BANDS[resultIdx];
    var passedBand = p.highestPassed >= 0 ? BANDS[p.highestPassed] : null;
    state.profile.unlockedBand = band;
    state.profile.placementDone = true;
    saveState();
    renderPlacementResult(band, passedBand);
  }

  function renderPlacementResult(band, passedBand) {
    var fromOnb = placement && placement.fromOnboarding;
    placement = null;
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "onb");
    wrap.appendChild(el("div", "onb-logo", "🎯"));
    wrap.appendChild(el("div", "onb-title small", "Einstufung fertig"));
    wrap.appendChild(el("div", "onb-sub",
      passedBand
        ? "Stark – Level " + passedBand + " sitzt schon! Du startest mit Level " + band +
          ", passende Themen sind jetzt frei."
        : "Wir fangen gemütlich vorne an. Die Themen der Level A0 und A1 sind offen, " +
          "weitere schalten sich frei, während du lernst."));
    wrap.appendChild(btn("Und los! 🚀", "btn primary big", function () {
      if (fromOnb) {
        renderOnboarding(3); // zurueck in den Onboarding-Fluss: Shalom-Karte
      } else {
        document.body.classList.remove("in-session");
        showScreen("profile");
        toast("Level gesetzt: " + band);
      }
    }));
    app.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  /* ==========================================================
   * 16. Module-Runner (gefuehrte Mini-Lektionen)
   * Schrittarten: explain (Lehrkarte), teach (Vorstellungskarte, keine Wertung),
   * quiz (MC he->de mit FESTEN Distraktoren), pairquiz (de-Frage, he-Optionen,
   * Gegenteil garantiert dabei), cloze (Lueckensatz he -> fehlende Form waehlen),
   * form (deutsche Aufgabe -> richtige he-Form waehlen). Grammatik-Module (aus
   * grammar.js) nutzen v. a. cloze/form. Alle Abfragen verbuchen als "mc"
   * (recordAnswer bei gesetztem itemId, sonst recordFreeAnswer). */

  function moduleStepNext() {
    if (!session) return;
    session.stepIdx++;
    // Lektions-Player: Resume-Zeiger nach jedem Schritt sichern.
    if (session.mode === "lesson" && session.lesson) setLessonStep(session.lesson.id, session.stepIdx);
    renderSession(); // verzweigt nach mode (module -> renderModuleStep, lesson -> renderLessonStep)
  }

  function renderModuleStep() {
    var s = session;
    if (!s) return;
    var step = s.steps[s.stepIdx];
    if (!step) {
      // Modul komplett: Zaehler setzen, dann normaler Abschluss-Screen.
      // Nur echte Module aus CONTENT.modules zaehlen — das zur Laufzeit gebaute
      // "Lesen lernen" (synthetisch, nicht im Content) darf keinen Phantom-
      // Zaehler schreiben.
      if (moduleById(s.module.id)) {
        state.gamification.counters.modulesDone[s.module.id] = true;
        saveState();
      }
      if (s.snackId) {
        state.course.snacksSeen[s.snackId] = true; // Rotation: als gesehen markieren
        saveState();
      }
      return endSession();
    }
    setOptKeys(null);
    var title = s.label + " · " + (s.stepIdx + 1) + "/" + s.steps.length;
    if (step.type === "explain") return renderModuleExplain(step, title);
    if (step.type === "teach") return renderModuleTeach(step, title);
    if (step.type === "pairquiz") return renderModulePairQuiz(step, title);
    if (step.type === "cloze") return renderModuleCloze(step, title);
    if (step.type === "form") return renderModuleForm(step, title);
    return renderModuleQuiz(step, title);
  }

  function moduleContinueBtn(body) {
    var go = btn("Weiter →", "btn primary big", moduleStepNext);
    body.appendChild(go);
    setOptKeys(function (ev) {
      if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); go.click(); }
    });
  }

  function renderModuleExplain(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    // Lehr-Schritte vergeben keine XP: den "⭐"-Zaehler leer lassen (erst ab Quiz).
    var xpEl = $(".session-xp"); if (xpEl) xpEl.textContent = "";
    if (step.title) body.appendChild(el("div", "task-question", step.title));
    var card = el("div", "card module-explain");
    if (step.text) card.appendChild(el("p", "module-text", step.text));
    body.appendChild(card);
    if (step.examples && step.examples.length) {
      var ex = el("div", "module-examples");
      step.examples.forEach(function (e) {
        // RTL-App: Hebraeisch rechts, Umschrift/Bedeutung links, 🔊 auf der Meta-Seite.
        var row = el("div", "module-example");
        var he = el("span", "module-ex-he", e.he);
        he.dir = "rtl"; he.lang = "he";
        row.appendChild(he);
        row.appendChild(el("span", "module-ex-meta",
          (e.translit || "") + (e.de ? " · " + e.de : "")));
        var say = btn("🔊", "icon-btn small-btn", function (ev) {
          ev.stopPropagation();
          if (e.he) sayText(e.he);
        });
        say.title = "Anhören";
        row.appendChild(say);
        if (e.he) row.addEventListener("click", function () { sayText(e.he); });
        ex.appendChild(row);
      });
      body.appendChild(ex);
    }
    moduleContinueBtn(body);
  }

  /** Hebt die Vorkommen eines Buchstabens im .he-text von `wrap` hervor.
   *  Trailing-Niqqud (U+0591–U+05C7) wird in die Markierung eingeschlossen,
   *  damit der Grapheme-Cluster zusammenbleibt. */
  function highlightLetterIn(wrap, letter) {
    var heDiv = wrap.querySelector(".he-text");
    if (!heDiv || !letter) return;
    var text = heDiv.textContent;
    if (!text || text.indexOf(letter) < 0) return;
    heDiv.textContent = "";
    var i = 0, idx;
    while ((idx = text.indexOf(letter, i)) >= 0) {
      if (idx > i) heDiv.appendChild(document.createTextNode(text.slice(i, idx)));
      var end = idx + letter.length;
      while (end < text.length) {
        var cc = text.charCodeAt(end);
        if (cc >= 0x0591 && cc <= 0x05C7) end++; else break;
      }
      var sp = el("span", "he-hl", text.slice(idx, end));
      heDiv.appendChild(sp);
      i = end;
    }
    if (i < text.length) heDiv.appendChild(document.createTextNode(text.slice(i)));
  }

  function renderModuleTeach(step, title) {
    var item = itemById(step.itemId);
    if (!item) return moduleStepNext();
    // Erstkontakt-Merker (1.1), siehe renderIntro: NUR fuer wirklich neue Items,
    // sonst wuerde ein erneut gelehrtes, laengst bekanntes Wort faelschlich
    // "neutralisiert" (erster Abruf zaehlt dann nicht).
    if (session && isNew(item.id)) {
      if (!session.introducedThisSession) session.introducedThisSession = {};
      session.introducedThisSession[item.id] = true;
    }
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    // Vorstellungs-Schritt vergibt keine XP: "⭐"-Zaehler leer lassen (erst ab Quiz).
    var xpEl = $(".session-xp"); if (xpEl) xpEl.textContent = "";
    if (step.hlLetter) {
      // "Lesen lernen": zeigen, welcher Buchstabe im Wort steckt.
      var tag = el("div", "intro-tag");
      tag.appendChild(document.createTextNode("Hier steckt dein Buchstabe drin: "));
      var lsp = el("span", "hl-letter", step.hlLetter);
      lsp.dir = "rtl"; lsp.lang = "he";
      tag.appendChild(lsp);
      body.appendChild(tag);
    } else {
      body.appendChild(el("div", "intro-tag", INTRO_TAGS[item.type] || INTRO_TAGS.word));
    }
    var card = el("div", "card learn-card intro-card");
    if (item.emoji) card.appendChild(el("div", "intro-emoji", item.emoji));
    var heWrap = heEl(item, { big: true, tapReveal: false });
    if (step.hlLetter) highlightLetterIn(heWrap, step.hlLetter);
    card.appendChild(heWrap);
    if (item.type === "sign") card.appendChild(el("div", "translit", item.translit));
    card.appendChild(el("div", "de-prompt", item.de));
    if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    card.appendChild(speakRow(item, true));
    body.appendChild(card);
    if (state.profile.autoplay) say(item);
    moduleContinueBtn(body);
  }

  /** Options-UI fuer Module: explizite Distraktoren, verbucht als "mc",
   *  geht danach zum naechsten Schritt (kein Task-Requeue). */
  function moduleOptionButtons(body, item, distractors, optionKind, afterAnswer) {
    var options = shuffle([item].concat(distractors.slice(0, 3)));
    var list = el("div", "opt-list");
    var done = false;
    options.forEach(function (opt) {
      var isHe = optionKind === "he";
      var b = el("button", "opt" + (isHe ? " he-opt" : ""), isHe ? heOptionText(opt) : opt.de);
      if (isHe) { b.dir = "rtl"; b.lang = "he"; }
      b.dataset.itemId = opt.id;
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = opt.id === item.id;
        list.querySelectorAll(".opt").forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
        b.classList.remove("dim");
        if (correct) b.classList.add("correct");
        else {
          b.classList.add("wrong");
          list.querySelectorAll(".opt").forEach(function (ob) {
            if (ob.dataset.itemId === item.id) { ob.classList.add("correct"); ob.classList.remove("dim"); }
          });
        }
        recordAnswer(item.id, "mc", correct ? "good" : "again", optionKind === "he" ? "de2he" : "he2de");
        if (afterAnswer) afterAnswer(correct);
        if (correct) later(moduleStepNext, 1000);
        else {
          var cont = btn("Weiter", "btn primary big", moduleStepNext);
          cont.dataset.k = "cont";
          body.appendChild(cont);
          cont.focus();
        }
      });
      list.appendChild(b);
    });
    body.appendChild(list);
    setOptKeys(function (e) {
      if (!session) return;
      if (e.key >= "1" && e.key <= "4") {
        var btns = list.querySelectorAll(".opt");
        var target = btns[+e.key - 1];
        if (target && !target.disabled) { e.preventDefault(); target.click(); }
      } else if (e.key === "Enter" || e.key === " ") {
        var cont2 = body.querySelector('[data-k="cont"]');
        if (cont2) { e.preventDefault(); cont2.click(); }
      }
    });
  }

  /** Baut bis zu 3 Distraktoren: erst feste IDs, dann mit Score aufgefuellt. */
  function moduleFillDistractors(item, fixedIds) {
    var seenDe = {}, seenHe = {}, out = [];
    seenDe[item.de] = true; seenHe[item.he] = true;
    (fixedIds || []).forEach(function (did) {
      if (out.length >= 3) return;
      var d = itemById(did);
      if (d && d.id !== item.id && !seenDe[d.de] && !seenHe[d.he]) {
        seenDe[d.de] = true; seenHe[d.he] = true; out.push(d);
      }
    });
    if (out.length < 3) {
      var fill = pickDistractors(item, 3);
      for (var i = 0; i < fill.length && out.length < 3; i++) {
        var f = fill[i];
        if (!seenDe[f.de] && !seenHe[f.he]) { seenDe[f.de] = true; seenHe[f.he] = true; out.push(f); }
      }
    }
    return out;
  }

  function renderModuleQuiz(step, title) {
    var item = itemById(step.itemId);
    if (!item) return moduleStepNext();
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    body.appendChild(el("div", "task-question", "Was bedeutet das?"));
    var card = el("div", "card learn-card");
    card.appendChild(heEl(item, { big: true, showHint: true, quiz: true }));
    card.appendChild(speakRow(item));
    body.appendChild(card);
    var feedback = el("div", "feedback-note");
    moduleOptionButtons(body, item, moduleFillDistractors(item, step.distractorIds), "de", function (correct) {
      if (!correct) feedback.textContent = "Richtig wäre: " + item.de;
      else if (item.note) feedback.textContent = "Hinweis: " + item.note;
    });
    body.appendChild(feedback);
  }

  function renderModulePairQuiz(step, title) {
    var item = itemById(step.itemId);
    if (!item) return moduleStepNext();
    var pair = itemById(step.pairId);
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    body.appendChild(el("div", "task-question", "Was heißt „" + item.de + "“?"));
    // Optionen auf Hebraeisch: richtig + Gegenteil (garantiert) + Auffuellung.
    var fixed = (pair && pair.id !== item.id) ? [pair.id] : [];
    var distractors = moduleFillDistractors(item, fixed);
    var feedback = el("div", "feedback-note");
    moduleOptionButtons(body, item, distractors, "he", function (correct) {
      if (!correct) feedback.textContent = "Richtig ist: " + item.he + " (" + item.de + ")";
      else if (state.profile.autoplay) say(item);
    });
    body.appendChild(feedback);
  }

  /**
   * Options-UI fuer cloze/form: freie Optionen ({ he, translit, correct }),
   * GENAU eine correct:true. He-Buttons (RTL) mit Umschrift-Zeile wie bei den
   * Dialog-Optionen. Verbucht als "mc": recordAnswer, wenn ein gueltiges
   * step.itemId gesetzt ist, sonst recordFreeAnswer. Richtig -> Auto-Weiter,
   * falsch -> "Weiter"-Knopf. Tastatur 1-4 / Enter wie ueberall.
   */
  function moduleChoiceButtons(body, step, afterAnswer) {
    var options = (step.options || []).filter(function (o) { return o && o.he; });
    // Defekter Schritt (Optionen ohne he): nicht in einer Sackgasse enden,
    // sondern ueberspringbar machen.
    if (!options.length) {
      var skip = btn("Weiter", "btn primary big", moduleStepNext);
      skip.dataset.k = "cont";
      body.appendChild(skip);
      skip.focus();
      return;
    }
    var shuffled = shuffle(options.slice());
    var list = el("div", "opt-list");
    var done = false;
    shuffled.forEach(function (opt) {
      var b = el("button", "opt he-opt dlg-opt");
      var he = el("div", "b-he", opt.he); he.dir = "rtl"; he.lang = "he";
      b.appendChild(he);
      if (opt.translit) b.appendChild(el("div", "b-translit", opt.translit));
      b.addEventListener("click", function () {
        if (done) return;
        done = true;
        var correct = opt.correct === true;
        var kids = list.querySelectorAll(".opt");
        kids.forEach(function (ob) { ob.disabled = true; ob.classList.add("dim"); });
        b.classList.remove("dim");
        b.classList.add(correct ? "correct" : "wrong");
        if (!correct) {
          // die tatsaechlich richtige Option markieren (Index-treu zu shuffled)
          shuffled.forEach(function (o, i) {
            if (o.correct === true && kids[i]) { kids[i].classList.add("correct"); kids[i].classList.remove("dim"); }
          });
        }
        if (step.itemId && itemById(step.itemId)) {
          recordAnswer(step.itemId, "mc", correct ? "good" : "again", "de2he");
        } else {
          recordFreeAnswer("mc", correct);
        }
        if (afterAnswer) afterAnswer(correct);
        if (correct) later(moduleStepNext, 1000);
        else {
          var cont = btn("Weiter", "btn primary big", moduleStepNext);
          cont.dataset.k = "cont";
          body.appendChild(cont);
          cont.focus();
        }
      });
      list.appendChild(b);
    });
    body.appendChild(list);
    setOptKeys(function (e) {
      if (!session) return;
      if (e.key >= "1" && e.key <= "4") {
        var btns = list.querySelectorAll(".opt");
        var target = btns[+e.key - 1];
        if (target && !target.disabled) { e.preventDefault(); target.click(); }
      } else if (e.key === "Enter" || e.key === " ") {
        var cont2 = body.querySelector('[data-k="cont"]');
        if (cont2) { e.preventDefault(); cont2.click(); }
      }
    });
  }

  /** cloze: hebraeischer Lueckensatz (mit ___) gross RTL + Umschrift + Bedeutung,
   *  darunter die he-Optionen. Note nach dem Antworten (feedback-note). */
  function renderModuleCloze(step, title) {
    if (!step.options || !step.options.length) return moduleStepNext();
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    body.appendChild(el("div", "task-question", "Welche Form passt?"));
    var card = el("div", "card learn-card module-cloze");
    var wrap = el("div", "he-wrap big");
    var heDiv = el("div", "he-text", step.he || "");
    heDiv.dir = "rtl"; heDiv.lang = "he";
    wrap.appendChild(heDiv);
    wrap.appendChild(el("div", "translit", step.translit || ""));
    card.appendChild(wrap);
    if (step.de) card.appendChild(el("div", "de-prompt", step.de));
    body.appendChild(card);
    var feedback = el("div", "feedback-note");
    moduleChoiceButtons(body, step, function () {
      if (step.note) feedback.textContent = step.note;
    });
    body.appendChild(feedback);
  }

  /** form: deutsche Aufgabe als Frage, darunter die he-Optionen.
   *  Note nach dem Antworten (feedback-note). */
  function renderModuleForm(step, title) {
    if (!step.options || !step.options.length) return moduleStepNext();
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    body.appendChild(el("div", "task-question", step.prompt || "Welche Form passt?"));
    var feedback = el("div", "feedback-note");
    moduleChoiceButtons(body, step, function () {
      if (step.note) feedback.textContent = step.note;
    });
    body.appendChild(feedback);
  }

  /* ==========================================================
   * 16b. Lektions-Player (Modus "lesson", 8-Schritt-Bogen, Resume)
   *
   * Der Kurs orchestriert die vorhandenen Aufgaben-Renderer: eine Lektion
   * wird zu einer FLACHEN Schrittliste (Bogen) gebaut, jeder Schritt traegt
   * `arc` (Index in LESSON_ARCS) fuer die sichtbare Phasen-Beschriftung.
   * Fortschritt/Weiter laeuft ueber moduleStepNext (persistiert den Schritt).
   * ========================================================== */

  var LESSON_ARCS = ["Aufwärmen ↺", "Szene 🎬", "Neue Wörter ✨", "Grammatik 🧠", "Lesen 👓", "Hören 👂", "Quiz 🏁"];

  /** Baut den Bogen einer Lektion als flache Schrittliste. Defensiv gegen
   *  fehlende Refs: fehlt etwas, wird die Phase uebersprungen (nie crashen). */
  function buildLessonSteps(lesson) {
    var steps = [];
    var idx = lessonIndex(lesson.id);
    var now = Date.now();
    // 1. Aufwaermen: 2-3 Abrufaufgaben aus FRUEHEREN Lektionen, faellige SRS zuerst.
    //    Fuer die erste Lektion / ohne frueher Gelerntes: entfaellt.
    if (COURSE && idx > 0) {
      var earlier = [];
      for (var i = 0; i < idx; i++) earlier = earlier.concat(COURSE.lessons[i].newItemIds || []);
      var pool = earlier.map(itemById).filter(function (it) { return it && !isNew(it.id); });
      var due = pool.filter(function (it) { return isDue(it.id, now); });
      var rest = pool.filter(function (it) { return !isDue(it.id, now); });
      var warm = shuffle(due.slice()).concat(shuffle(rest.slice())).slice(0, 3);
      warm.forEach(function (it, w) {
        steps.push({ arc: 0, type: "task", item: it, kind: "mc", dir: w % 2 === 0 ? "he2de" : "de2he" });
      });
    }
    // 2. Szene: Dialog-/Inline-Zeilen mit Audio + 1 Verstaendnisfrage.
    var lines = null;
    if (lesson.scene && lesson.scene.dialogueId) {
      var d = null;
      (CONTENT.dialogues || []).forEach(function (x) { if (x.id === lesson.scene.dialogueId) d = x; });
      if (d) lines = d.lines;
    } else if (lesson.scene && lesson.scene.lines) {
      lines = lesson.scene.lines;
    }
    if (lines && lines.length >= 2) {
      steps.push({ arc: 1, type: "scene", lines: lines });
      steps.push({ arc: 1, type: "sceneQuiz", lines: lines });
    }
    // 3. Neue Woerter: teach-Karten (markieren introducedThisSession -> Erstkontakt).
    (lesson.newItemIds || []).forEach(function (id) {
      if (itemById(id)) steps.push({ arc: 2, type: "teach", itemId: id });
    });
    // 4. Grammatik: referenzierte Modul-Schritte oder inline (grammar.js-Schema).
    if (lesson.grammar) {
      var gsteps = [];
      if (lesson.grammar.moduleId) {
        var gm = moduleById(lesson.grammar.moduleId);
        if (gm) (lesson.grammar.steps || []).forEach(function (ix) { if (gm.steps[ix]) gsteps.push(gm.steps[ix]); });
      } else if (lesson.grammar.inline) {
        gsteps = lesson.grammar.inline;
      }
      gsteps.forEach(function (g) { if (g && g.type) steps.push({ arc: 3, type: g.type, gstep: g }); });
    }
    // 5. Lesen: Drill-Aufgaben inline (nur fruehe Lektionen).
    if (lesson.reading && READING) {
      var drill = null;
      READING.drills.forEach(function (dd) { if (dd.id === lesson.reading.drill) drill = dd; });
      if (drill) buildDrillTasks(drill).forEach(function (t) { steps.push({ arc: 4, type: "drill", task: t }); });
    }
    // 6. Hoeren: 2-3 audio2de ueber die Lektionswoerter (nur Ohr).
    if (lesson.listening !== false) {
      shuffle((lesson.newItemIds || []).slice()).slice(0, 3).forEach(function (id) {
        var it = itemById(id);
        if (it) steps.push({ arc: 5, type: "task", item: it, kind: "mc", dir: "audio2de" });
      });
    }
    // 7. Quiz: dynamisch NUR ueber diese Lektion; Erkennen + Produzieren im Wechsel.
    var quizItems = shuffle((lesson.newItemIds || []).map(itemById).filter(Boolean));
    quizItems.forEach(function (it, q) {
      var dir = ["he2de", "de2he"][q % 2];
      if (it.type === "sentence" && it.tokens && it.tokens.length >= 2 && q % 3 === 2) {
        steps.push({ arc: 6, type: "task", item: it, kind: "build", dir: null });
      } else {
        steps.push({ arc: 6, type: "task", item: it, kind: "mc", dir: dir });
      }
      // Jedes 3. Wort zusaetzlich hoeren; Sprechen nur, wenn Mikro da (ueberspringbar).
      if (q % 3 === 0) steps.push({ arc: 6, type: "task", item: it, kind: "mc", dir: "audio2de" });
      else if (STT.available() && q % 3 === 1 && it.type !== "letter") {
        steps.push({ arc: 6, type: "task", item: it, kind: "speak", dir: null });
      }
    });
    return steps;
  }

  function renderLessonStep() {
    var s = session;
    if (!s) return;
    var step = s.steps[s.stepIdx];
    if (!step) {
      markLessonDone(s.lesson.id);
      return endSession();
    }
    setOptKeys(null);
    var arcLabel = LESSON_ARCS[step.arc] || "";
    // Sichtbare Phasen-Beschriftung im Session-Titel (mit Lektion + Fortschritt).
    var title = "🎓 Lektion · " + arcLabel + " · " + (s.stepIdx + 1) + "/" + s.steps.length;
    // Grammatik-Schritte laufen durch die unveraenderten Modul-Renderer (gstep).
    if (step.type === "teach") return renderModuleTeach({ type: "teach", itemId: step.itemId }, title);
    if (step.type === "explain") return renderModuleExplain(step.gstep, title);
    if (step.type === "cloze") return renderModuleCloze(step.gstep, title);
    if (step.type === "form") return renderModuleForm(step.gstep, title);
    if (step.type === "quiz") return renderModuleQuiz(step.gstep, title);
    if (step.type === "pairquiz") return renderModulePairQuiz(step.gstep, title);
    if (step.type === "scene") return renderLessonScene(step, title);
    if (step.type === "sceneQuiz") return renderLessonSceneQuiz(step, title);
    if (step.type === "drill") return renderLessonDrill(step, title);
    return renderLessonTask(step, title); // type "task"
  }

  /** Weiter-Logik der Lesson-Zwischenschritte (wie drillNext, aber moduleStepNext). */
  function drillNextLesson(body, correct) {
    if (correct) { later(moduleStepNext, 900); }
    else {
      var cont = btn("Weiter", "btn primary big", moduleStepNext);
      cont.dataset.k = "cont";
      body.appendChild(cont);
      cont.focus();
    }
  }

  /** Szene 🎬: Zeilen als Chat mit Audio, Weiter-Knopf (kein Abruf, keine XP). */
  function renderLessonScene(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    var xpEl = $(".session-xp"); if (xpEl) xpEl.textContent = "";
    body.appendChild(el("div", "task-question", "Hör dir die Szene an:"));
    var chat = el("div", "chat");
    step.lines.forEach(function (l) { chat.appendChild(dialogueBubble(l)); });
    body.appendChild(chat);
    if (state.profile.autoplay && step.lines[0]) sayText(step.lines[0].he);
    moduleContinueBtn(body);
  }

  /** Szene-Verstaendnisfrage: 1 MC ueber eine Zeile (deutsche Bedeutung). */
  function renderLessonSceneQuiz(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    var lines = step.lines;
    // Verstaendnisfrage nur auf inhaltstragende Zeilen stellen: sehr kurze
    // Bestaetigungen (< 3 Woerter, z. B. "כן, נכון" / "באמת?") waeren trivial.
    var meaty = lines.filter(function (l) { return l.he && l.he.trim().split(/\s+/).length >= 3; });
    var pool = meaty.length ? meaty : lines;
    var target = pool[dayHash(session.lesson.id + "|scene") % pool.length];
    body.appendChild(el("div", "task-question", "Was bedeutet diese Zeile?"));
    var card = el("div", "card learn-card");
    var he = el("div", "he-text big", target.he);
    he.dir = "rtl"; he.lang = "he";
    card.appendChild(he);
    card.appendChild(el("div", "translit", target.translit || ""));
    card.appendChild(btn("🔊", "icon-btn", function () { sayText(target.he); }));
    body.appendChild(card);
    var distr = shuffle(lines.filter(function (l) { return l.de !== target.de; })).slice(0, 3);
    var opts = shuffle([target].concat(distr));
    drillOptions(body, opts.map(function (o) { return o.de; }), opts.indexOf(target), false, function (correct) {
      // Dialog-Zeilen koennen ein Item referenzieren -> dann SRS, sonst frei.
      if (target.itemId && itemById(target.itemId)) recordAnswer(target.itemId, "dialog", correct ? "good" : "again");
      else recordFreeAnswer("dialog", correct);
      drillNextLesson(body, correct);
    });
  }

  /** Lesen 👓: ein Drill-Task im Bogen; delegiert an den gemeinsamen T6-Renderer. */
  function renderLessonDrill(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    renderDrillTaskInto(step.task, body, function () { moduleStepNext(); });
  }

  /** Aufgaben-Schritt (mc/build/speak) auf einem Einzel-Item, Modul-Runner-Stil. */
  function renderLessonTask(step, title) {
    var body = sessionShell(title, session.stepIdx / session.steps.length);
    var item = step.item;
    if (!item) return moduleStepNext();
    if (step.kind === "build" && item.tokens && item.tokens.length >= 2) {
      return renderLessonBuild(step, body);
    }
    if (step.kind === "speak") {
      // Sprechen im Quiz: optional ueberspringbar (Selbstbewertung, kein Zwang).
      body.appendChild(el("div", "task-question", "Sag das laut auf Hebräisch:"));
      var scard = el("div", "card learn-card");
      scard.appendChild(el("div", "de-prompt", item.de));
      scard.appendChild(heEl(item, { big: true, showHint: true }));
      scard.appendChild(speakRow(item, true));
      body.appendChild(scard);
      var self = el("div", "self-grade-row");
      self.appendChild(btn("✓ Konnte ich", "btn", function () {
        recordAnswer(item.id, "speak", "good");
        later(moduleStepNext, 700);
      }));
      self.appendChild(btn("✗ Noch nicht", "btn ghost", function () {
        recordAnswer(item.id, "speak", "again");
        later(moduleStepNext, 500);
      }));
      self.appendChild(btn("⏭ Überspringen", "btn ghost", function () { moduleStepNext(); }));
      body.appendChild(self);
      return;
    }
    // mc (he2de | de2he | audio2de): Distraktoren bevorzugt aus der Lektion.
    var seenDe = {}, seenHe = {}, distr = [];
    seenDe[item.de] = true; seenHe[item.he] = true;
    var lessonDistr = (session.lesson.newItemIds || []).map(itemById)
      .filter(function (x) { return x && x.id !== item.id; });
    shuffle(lessonDistr.slice()).forEach(function (x) {
      if (distr.length >= 3 || seenDe[x.de] || seenHe[x.he]) return;
      seenDe[x.de] = true; seenHe[x.he] = true; distr.push(x);
    });
    pickDistractors(item, 3).forEach(function (x) {
      if (distr.length >= 3 || seenDe[x.de] || seenHe[x.he]) return;
      seenDe[x.de] = true; seenHe[x.he] = true; distr.push(x);
    });
    var card = el("div", "card learn-card");
    if (step.dir === "he2de") {
      body.appendChild(el("div", "task-question", "Was bedeutet das?"));
      card.appendChild(heEl(item, { big: true, showHint: true, quiz: true }));
      card.appendChild(speakRow(item));
    } else if (step.dir === "de2he") {
      body.appendChild(el("div", "task-question", "Wie heißt das auf Hebräisch?"));
      card.appendChild(el("div", "de-prompt", item.de));
      if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    } else { // audio2de - nur Ohr
      body.appendChild(el("div", "task-question", "Was hörst du?"));
      card.appendChild(btn("🔊", "icon-btn large", function () { say(item); }));
      say(item);
    }
    body.appendChild(card);
    var isHe = step.dir === "de2he";
    var opts = shuffle([item].concat(distr));
    drillOptions(body,
      opts.map(function (o) { return isHe ? heOptionText(o) : o.de; }),
      opts.indexOf(item), isHe, function (correct) {
        recordAnswer(item.id, "mc", correct ? "good" : "again", step.dir);
        if (step.dir === "audio2de") {
          var reveal = el("div", "listen-reveal");
          reveal.appendChild(heEl(item, {}));
          card.appendChild(reveal);
        }
        drillNextLesson(body, correct);
      });
  }

  /** Satzbau-Schritt im Quiz: Token-Kacheln wie renderBuild, aber auf step.item
   *  und mit moduleStepNext statt nextTask. */
  function renderLessonBuild(step, body) {
    var item = step.item;
    body.appendChild(el("div", "task-question", "Baue den Satz:"));
    var card = el("div", "card learn-card");
    card.appendChild(el("div", "de-prompt", item.de));
    if (item.note) card.appendChild(el("div", "note-line", "(" + item.note + ")"));
    body.appendChild(card);
    var answer = el("div", "build-answer");
    answer.dir = "rtl";
    body.appendChild(answer);
    var order = shuffle(item.tokens.map(function (t, i) { return i; }));
    if (order.length === 2 && order[0] === 0) order = [1, 0];
    var bank = el("div", "build-bank");
    bank.dir = "rtl";
    body.appendChild(bank);
    var picked = [];
    var feedback = el("div", "feedback-note");
    body.appendChild(feedback);
    function finish() {
      var built = picked.map(function (i) { return item.tokens[i].he; }).join(" ");
      var target = item.tokens.map(function (t) { return t.he; }).join(" ");
      var correct = built === target;
      answer.classList.add(correct ? "ok" : "no");
      if (correct) {
        feedback.textContent = "Richtig! " + item.translit + " · " + item.de;
        say(item);
      } else {
        feedback.textContent = "Richtige Reihenfolge: " + item.translit + " · " + item.de;
        answer.innerHTML = "";
        item.tokens.forEach(function (t) { answer.appendChild(el("span", "build-chip done", t.he)); });
      }
      recordAnswer(item.id, "build", correct ? "good" : "again");
      later(moduleStepNext, correct ? 1200 : 2600);
    }
    order.forEach(function (tokenIdx) {
      var t = item.tokens[tokenIdx];
      var tile = el("button", "build-tile");
      var he = el("div", "b-he", t.he); he.dir = "rtl"; he.lang = "he";
      tile.appendChild(he);
      tile.appendChild(el("div", "b-translit", t.translit));
      tile.title = t.de;
      tile.addEventListener("click", function () {
        if (tile.disabled) return;
        tile.disabled = true;
        tile.classList.add("used");
        picked.push(tokenIdx);
        answer.appendChild(el("span", "build-chip", t.he));
        if (picked.length === item.tokens.length) finish();
      });
      bank.appendChild(tile);
    });
    body.appendChild(btn("↺ Zurücksetzen", "btn ghost", function () {
      picked = [];
      answer.innerHTML = "";
      answer.classList.remove("ok", "no");
      bank.querySelectorAll(".build-tile").forEach(function (x) { x.disabled = false; x.classList.remove("used"); });
    }));
  }

  /* ==========================================================
   * 17. Sync: Merge-Import, Sync-Code (Base64), Import-Overlay
   * ========================================================== */

  /**
   * Zwei Zustaende zu EINEM verschmelzen (verlustarm):
   *  - srs: pro Item spaeteres lastReviewTs gewinnt (bei Gleichstand mehr reps).
   *  - log: pro Tag feldweises Max, goalMet per ODER.
   *  - gamification: xp/answers max, achievements/frozenDays/counters vereinigt.
   *  - profile: lokale Einstellungen bleiben; onboarded/placementDone per ODER,
   *    unlockedBand das weitere von beiden, levelCap lokal.
   *  - feedback: notes vereinigt (dedupliziert nach ts+text), pronIssues vereinigt.
   */
  function mergeStates(local, imported) {
    var a = normalizeState(local);
    var b = normalizeState(imported);
    var m = defaultState();

    // srs
    var ids = {}, srs = {};
    Object.keys(a.srs).forEach(function (k) { ids[k] = 1; });
    Object.keys(b.srs).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) {
      var ea = a.srs[id], eb = b.srs[id];
      if (ea && !eb) { srs[id] = ea; return; }
      if (eb && !ea) { srs[id] = eb; return; }
      var la = ea.lastReviewTs || 0, lb = eb.lastReviewTs || 0;
      if (la > lb) srs[id] = ea;
      else if (lb > la) srs[id] = eb;
      else srs[id] = (eb.reps || 0) > (ea.reps || 0) ? eb : ea;
    });
    m.srs = srs;

    // log
    var days = {}, log = {};
    Object.keys(a.log).forEach(function (k) { days[k] = 1; });
    Object.keys(b.log).forEach(function (k) { days[k] = 1; });
    Object.keys(days).forEach(function (d) {
      var da = a.log[d] || {}, db = b.log[d] || {};
      var entry = {
        answers: Math.max(da.answers || 0, db.answers || 0),
        correct: Math.max(da.correct || 0, db.correct || 0),
        xp: Math.max(da.xp || 0, db.xp || 0),
        goalMet: !!(da.goalMet || db.goalMet)
      };
      var mastered = Math.max(da.mastered || 0, db.mastered || 0);
      if (mastered) entry.mastered = mastered;
      log[d] = entry;
    });
    m.log = log;

    // gamification
    var ga = a.gamification, gb = b.gamification;
    m.gamification.xpTotal = Math.max(ga.xpTotal || 0, gb.xpTotal || 0);
    m.gamification.answersTotal = Math.max(ga.answersTotal || 0, gb.answersTotal || 0);
    var lad = [ga.lastActiveDay, gb.lastActiveDay].filter(Boolean).sort();
    m.gamification.lastActiveDay = lad.length ? lad[lad.length - 1] : null;
    var achSet = {};
    (ga.achievements || []).concat(gb.achievements || []).forEach(function (x) { achSet[x] = 1; });
    m.gamification.achievements = Object.keys(achSet);
    // Vereinigung kann mehr verbrauchte Freezes ergeben, als EIN Geraet je
    // verdient haette — bewusst akzeptiert: gerettete Tage bleiben gerettet,
    // dafuer sinkt freezesAvailable() nach dem Merge eher auf 0.
    var fz = {};
    Object.keys(ga.frozenDays || {}).forEach(function (k) { fz[k] = true; });
    Object.keys(gb.frozenDays || {}).forEach(function (k) { fz[k] = true; });
    m.gamification.frozenDays = fz;
    var ca = ga.counters, cb = gb.counters, mc = m.gamification.counters;
    mc.bestBlitz = Math.max(ca.bestBlitz || 0, cb.bestBlitz || 0);
    mc.bestExam = Math.max(ca.bestExam || 0, cb.bestExam || 0);
    mc.sessionsDone = Math.max(ca.sessionsDone || 0, cb.sessionsDone || 0);
    var unionObj = function (x, y) {
      var o = {};
      Object.keys(x || {}).forEach(function (k) { o[k] = true; });
      Object.keys(y || {}).forEach(function (k) { o[k] = true; });
      return o;
    };
    mc.dialogsDone = unionObj(ca.dialogsDone, cb.dialogsDone);
    mc.modulesDone = unionObj(ca.modulesDone, cb.modulesDone);

    // feedback: Notizen nach (ts, text) dedupliziert vereinigen, pronIssues vereinigen.
    var seenNotes = {};
    m.feedback.notes = a.feedback.notes.concat(b.feedback.notes).filter(function (n) {
      var k = n.ts + "|" + n.text;
      if (seenNotes[k]) return false;
      seenNotes[k] = true;
      return true;
    }).sort(function (x, y) { return x.ts - y.ts; });
    m.feedback.pronIssues = unionObj(a.feedback.pronIssues, b.feedback.pronIssues);

    // course: done per ODER, step max, entry das weitere (Kurs-Reihenfolge),
    // snacksSeen vereinigt. snackVocab ist Geraete-Einstellung -> lokal (unten).
    var lids = {};
    Object.keys(a.course.lessons).forEach(function (k) { lids[k] = 1; });
    Object.keys(b.course.lessons).forEach(function (k) { lids[k] = 1; });
    Object.keys(lids).forEach(function (id) {
      var la = a.course.lessons[id], lb = b.course.lessons[id];
      m.course.lessons[id] = {
        done: !!((la && la.done) || (lb && lb.done)),
        step: Math.max(la ? la.step : 0, lb ? lb.step : 0)
      };
    });
    var ea = a.course.entry, eb = b.course.entry;
    if (ea && eb) m.course.entry = lessonIndex(eb) > lessonIndex(ea) ? eb : ea;
    else m.course.entry = ea || eb || null;
    m.course.snacksSeen = unionObj(a.course.snacksSeen, b.course.snacksSeen);

    // profile: lokale Geraete-Einstellungen behalten, Fortschritts-Flags verschmelzen
    m.profile.dailyGoalMin = a.profile.dailyGoalMin;
    m.profile.fadeMode = a.profile.fadeMode;
    m.profile.autoplay = a.profile.autoplay;
    m.profile.snackVocab = a.profile.snackVocab; // Geraete-Einstellung wie autoplay
    m.profile.micHintDismissed = a.profile.micHintDismissed;
    m.profile.levelCap = a.profile.levelCap;
    m.profile.sttNoticeConfirmed = !!(a.profile.sttNoticeConfirmed || b.profile.sttNoticeConfirmed);
    m.profile.onboarded = !!(a.profile.onboarded || b.profile.onboarded);
    m.profile.placementDone = !!(a.profile.placementDone || b.profile.placementDone);
    m.profile.tourSeen = !!(a.profile.tourSeen || b.profile.tourSeen);
    m.profile.unlockedBand = bandIndex(a.profile.unlockedBand) >= bandIndex(b.profile.unlockedBand)
      ? a.profile.unlockedBand : b.profile.unlockedBand;

    return normalizeState(m);
  }

  /** Import anwenden: zusammenfuehren oder ersetzen, dann neu berechnen. */
  function applyImportedState(obj, mode) {
    if (mode === "merge") state = mergeStates(state, obj);
    else state = normalizeState(obj);
    updateMasteredCount();
    state.gamification.streakDays = recomputeStreak();
    saveState();
    showScreen(currentScreen);
    toast(mode === "merge" ? "Fortschritt zusammengeführt 🔀" : "Fortschritt ersetzt 📥");
  }

  /**
   * Modales Overlay mit Dialog-Semantik: role=dialog, aria-modal, aria-labelledby
   * auf den Titel; Escape und Klick auf den Hintergrund schliessen. Gibt Container
   * und eine close()-Funktion zurueck.
   */
  var overlayIdSeq = 0;
  function buildOverlay(titleText) {
    var id = "ov-title-" + (++overlayIdSeq);
    var ov = el("div", "overlay");
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-labelledby", id);
    var box = el("div", "overlay-box");
    var title = el("div", "overlay-title", titleText);
    title.id = id;
    box.appendChild(title);
    ov.appendChild(box);
    function close() {
      document.removeEventListener("keydown", onKey);
      ov.remove();
    }
    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }
    document.addEventListener("keydown", onKey);
    // Klick auf den abgedunkelten Hintergrund (nicht die Box) schliesst.
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    return { ov: ov, box: box, title: title, close: close };
  }

  /** Overlay: Zusammenfuehren / Ersetzen / Abbrechen (statt bare confirm()). */
  function showImportChoice(obj, onChoose) {
    var o = buildOverlay("Fortschritt importieren");
    o.box.appendChild(el("div", "overlay-text",
      "Zusammenführen behält beides (empfohlen). Ersetzen überschreibt deinen aktuellen Fortschritt."));
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn("Zusammenführen (empfohlen)", "btn primary big", function () { o.close(); onChoose("merge"); }));
    actions.appendChild(btn("Ersetzen", "btn ghost big", function () { o.close(); onChoose("replace"); }));
    actions.appendChild(btn("Abbrechen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
  }

  /** State als unicode-sicherer Base64-Code in die Zwischenablage. */
  function copySyncCode() {
    var code;
    try { code = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
    catch (e) { toast("Sync-Code konnte nicht erzeugt werden."); return; }
    var done = function () { toast("Sync-Code kopiert 🔗 – auf dem anderen Gerät einfügen."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () { fallbackCopy(code, done); });
    } else {
      fallbackCopy(code, done);
    }
  }

  /** Clipboard-Fallback fuer file:// (execCommand), sonst Code zum Abschreiben zeigen. */
  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { /* egal */ }
    ta.remove();
    if (ok) { if (done) done(); }
    else showSyncCodeText(text);
  }

  function showSyncCodeText(code) {
    var o = buildOverlay("Sync-Code");
    o.box.appendChild(el("div", "overlay-text",
      "Automatisches Kopieren ging nicht. Markiere den Code und kopiere ihn von Hand."));
    var ta = el("textarea", "overlay-textarea");
    ta.rows = 4; ta.value = code; ta.readOnly = true;
    ta.setAttribute("aria-label", "Sync-Code");
    ta.placeholder = "Code hier einfügen…";
    o.box.appendChild(ta);
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn("Schließen", "btn primary big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
    ta.focus(); ta.select();
  }

  /** Overlay mit Textfeld: Sync-Code einfuegen -> dekodieren -> Merge/Ersetzen-Overlay. */
  function pasteSyncCode() {
    var o = buildOverlay("Sync-Code einfügen");
    o.box.appendChild(el("div", "overlay-text", "Füge den Sync-Code vom anderen Gerät ein."));
    var ta = el("textarea", "overlay-textarea");
    ta.rows = 4;
    ta.setAttribute("aria-label", "Sync-Code");
    ta.placeholder = "Code hier einfügen…";
    o.box.appendChild(ta);
    var actions = el("div", "overlay-actions");
    actions.appendChild(btn("Übernehmen", "btn primary big", function () {
      var code = ta.value.trim();
      if (!code) { toast("Kein Code eingegeben."); return; }
      // Laengenlimit: ein echter Sync-Code bleibt klar darunter. Riesige
      // Eingaben nicht dekodieren (kein Haenger bei Junk).
      if (code.length > 1400000) { toast("Der Sync-Code ist ungültig."); return; }
      var json, obj;
      try { json = decodeURIComponent(escape(atob(code))); }
      catch (e) { toast("Der Sync-Code ist ungültig."); return; }
      try { obj = JSON.parse(json); }
      catch (e2) { toast("Der Sync-Code ist ungültig."); return; }
      if (!obj || typeof obj !== "object" || obj.version !== 1 || !obj.srs || typeof obj.srs !== "object") {
        toast("Das ist kein gültiger Tacheles-Code.");
        return;
      }
      if (Object.keys(obj.srs).length > 10000) { toast("Der Sync-Code ist ungültig."); return; }
      o.close();
      showImportChoice(obj, function (mode) { applyImportedState(obj, mode); });
    }));
    actions.appendChild(btn("Abbrechen", "btn ghost big", function () { o.close(); }));
    o.box.appendChild(actions);
    document.body.appendChild(o.ov);
    ta.focus();
  }

  /* ---------- Init ---------- */

  function init() {
    if (!CONTENT || !CONTENT.items || !CONTENT.items.length) {
      $("#app").innerHTML = '<div class="card" style="margin-top:40px;text-align:center">' +
        "<b>Inhalte fehlen.</b><br>content.js konnte nicht geladen werden. " +
        "Bitte index.html im selben Ordner wie content.js öffnen.</div>";
      return;
    }
    mergeGrammarModules();
    loadState();
    saveState();
    TTS.init();
    loadAudioManifest(); // vorproduzierte Samples (falls vorhanden); sonst TTS
    // Prefetch nachziehen, sobald der Service Worker die Seite kontrolliert.
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      try { navigator.serviceWorker.ready.then(function () { maybePrefetchAudio(); }); } catch (e) { /* egal */ }
    }
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.addEventListener("click", function () { showScreen(b.dataset.screen); });
    });
    // Erster Start: kurze Willkommens-Tour statt Home.
    if (state.profile.onboarded) {
      showScreen("home");
      // Bestandsnutzer: einmaliger Hinweis auf die neue Einfuehrung (WS5).
      if (!state.profile.tourSeen) showTourNotice();
    } else {
      renderOnboarding(1);
    }
  }

  // Kleine, lesbare Debug-Oberflaeche fuer den Regressionstest.
  window.TACHELES_DEBUG = {
    mergeStates: mergeStates,
    BANDS: BANDS,
    // Ist ein Band beim AKTUELLEN Zustand freigeschaltet? (Gating-Check im Test)
    bandUnlocked: function (band) { return bandUnlocked(band); },
    // Mastery-Reform (Tests): Klassifikation, direkte Verbuchung, Mastery-Read.
    isProduction: function (mode, dir) { return isProduction(mode, dir); },
    getMastery: function (id) { return getMastery(id); },
    recordAnswer: function (id, mode, grade, dir) { return recordAnswer(id, mode, grade, dir); },
    demoteMastery: function (id) { return demoteMastery(id); },
    // Aktuelle Session (Modus + Task-Item-IDs) fuer Mastery-Check-/Heute-Tests.
    sessionInfo: function () {
      if (!session) return null;
      return { mode: session.mode, taskIds: (session.tasks || []).map(function (t) { return t.item.id; }) };
    },
    dayHash: function (s) { return dayHash(s); },
    dailyPicks: function () {
      var p = dailyPicks();
      return { letter: p.letter && p.letter.id, word: p.word && p.word.id };
    },
    readingModuleSteps: function () {
      return buildReadingModule().steps.map(function (s) { return s.type + ":" + s.itemId; });
    },
    feedbackIssueUrl: function () { return feedbackIssueUrl(); },
    feedbackMailtoUrl: function () { return feedbackMailtoUrl(); },
    capUrl: function (base, body, max) { return capUrl(base, body, max); },
    // Item-ID der aktuellen Session-Aufgabe (fuer den Erstkontakt-Test).
    currentTaskItem: function () {
      if (session && session.mode === "lesson") {
        var ls = session.steps[session.stepIdx];
        if (!ls) return null;
        if (ls.item) return ls.item.id;
        if (ls.itemId) return ls.itemId;
        return (ls.gstep && ls.gstep.itemId) ? ls.gstep.itemId : null;
      }
      if (!session || !session.tasks) return null;
      var t = session.tasks[session.i];
      return t ? t.item.id : null;
    },
    // Aktueller Modul-Schritt-Typ (fuer den Grammatik-E2E-Walk).
    moduleStepType: function () {
      if (!session || !session.steps) return null;
      var st = session.steps[session.stepIdx];
      return st ? st.type : null;
    },
    // he-Text der korrekten Option im aktuellen cloze/form-Schritt (kein DOM-Leak).
    moduleCurrentCorrect: function () {
      if (!session || !session.steps) return null;
      var st = session.steps[session.stepIdx];
      if (!st) return null;
      // Lektions-Grammatik: Optionen liegen im gestellten gstep.
      var opts = Array.isArray(st.options) ? st.options : (st.gstep && Array.isArray(st.gstep.options) ? st.gstep.options : null);
      if (!opts) return null;
      var c = opts.filter(function (o) { return o && o.correct === true; })[0];
      return c ? c.he : null;
    },
    // Audio-Schicht (fuer die Regression, ohne echte Dateien anzufassen).
    audioActive: function () { return !!AUDIO; },
    audioUrlFor: function (id) { return audioUrl(itemById(id)); },
    reloadAudioManifest: function () { AUDIO = null; loadAudioManifest(); },
    // Kurs-Runde: Kurs-/Reading-Hooks fuer die Regression.
    courseInfo: function () {
      return {
        available: courseAvailable(),
        lessons: COURSE ? COURSE.lessons.length : 0,
        sections: COURSE ? (COURSE.sections || []).length : 0,
        entry: state.course.entry
      };
    },
    lessonStateOf: function (id) { return lessonState(id); },
    dailySnackId: function () { var s = dailySnack(); return s ? s.id : null; },
    // Lektions-Player (T8): aktuelle Phasen-Beschriftung + Phasen-Komposition.
    lessonStepLabel: function () {
      if (!session || session.mode !== "lesson") return null;
      var st = session.steps[session.stepIdx];
      return st ? (LESSON_ARCS[st.arc] || "") : null;
    },
    lessonArcLabels: function (id) {
      var l = lessonById(id);
      if (!l) return null;
      var seen = {}, out = [];
      buildLessonSteps(l).forEach(function (s) {
        var lab = LESSON_ARCS[s.arc];
        if (lab && !seen[lab]) { seen[lab] = 1; out.push(lab); }
      });
      return out;
    },
    startLesson: function (id) { return startSession("lesson", { lessonId: id }); },
    srsReps: function (id) { var e = state.srs[id]; return e ? (e.reps || 0) : 0; },
    introducedCount: function () {
      return (session && session.introducedThisSession) ? Object.keys(session.introducedThisSession).length : 0;
    },
    // Quereinstieg (T7): Ueberspringbarkeit + empfohlener Einstieg fuer die Regression.
    lessonSkippable: function (id) { var l = lessonById(id); return l ? lessonSkippable(l) : null; },
    recommendedEntry: function () { var l = recommendedEntryLesson(); return l ? l.id : null; },
    syllabify: function (s) { return READING ? READING.syllabify(s) : null; },
    // Lese-Drill: aktueller Drill + Position + Aufgabentyp (fuer die Regression).
    readingInfo: function () {
      if (!session || session.mode !== "reading") return null;
      var t = session.drillTasks[session.i];
      return { drillId: session.drill.id, i: session.i, total: session.drillTasks.length, kind: t ? t.kind : null };
    },
    // Interaktive Tour (T10): laeuft gerade ein Spotlight-Overlay?
    tourActive: function () { return !!document.querySelector(".tour-dim"); },
    // Label der aktuell korrekten Drill-/Szene-/Tour-Demo-Option (kein DOM-Leak,
    // ersetzt den frueheren data-correct-opt-Testhook).
    optCorrectLabel: function () { return activeCorrectLabel; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
