/*
 * Tacheles - Lese-Trainer-Daten (Silben-Inventar, Silbifizierer, Drills)
 * Klassisches Script, definiert genau EIN Global:
 *   window.TACHELES_READING = { version, syllables, exceptions, syllabify, drills }
 *
 * Vertrag C3: syllabify(niqqud) -> [{he, translit}] oder null; Round-Trip:
 * die Silben ergeben (ohne Leerzeichen-Beruecksichtigung) wieder den Input.
 * Drill-IDs sind heilig (course.js referenziert sie).
 * Validierung: node tools/validate-reading.cjs
 *
 * Umschrift folgt den content.js-Konventionen: sch -> "sch"? NEIN: wie im Korpus
 * "sh" (schin), "ch" wie in "Bach" (chet/chaf), "ts" (zade), Ajin/Alef stumm.
 * Vokale wie im Grammatik-Modul mod_pronunciation: Kamatz/Patach = a, Segol/Tsere = e,
 * Chirik = i, Cholam = o, Kubbuz/Schuruk = u, Schwa = kurzes e ("be" wie im Modul).
 *
 * Grundsatz (Vertrag C3): Korrektheit vor Abdeckung. Ist eine Zerlegung unsicher,
 * liefert die Heuristik null; harte Faelle liegen kuratiert in exceptions.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. Silben-Inventar (programmatisch: haeufige Buchstaben x Vokale)   *
   * ------------------------------------------------------------------ */

  // Konsonanten in Lese-Lernreihenfolge (grob wie content.js freq).
  // "he" ist der reine Buchstabe (schin traegt den Schin-Punkt, damit er
  // als "sch/sh" gelesen und vertont wird). "tr" = Umschrift des Konsonanten.
  var CONS = [
    { he: "ב", tr: "b" }, { he: "שׁ", tr: "sh" }, { he: "ל", tr: "l" }, { he: "מ", tr: "m" },
    { he: "ת", tr: "t" }, { he: "ד", tr: "d" }, { he: "ה", tr: "h" }, { he: "כּ", tr: "k" },
    { he: "נ", tr: "n" }, { he: "ק", tr: "k" }, { he: "י", tr: "j" }, { he: "ר", tr: "r" },
    { he: "ח", tr: "ch" }, { he: "פּ", tr: "p" }, { he: "ט", tr: "t" }, { he: "ז", tr: "s" },
    { he: "ג", tr: "g" }, { he: "צ", tr: "ts" }, { he: "ס", tr: "s" }, { he: "ו", tr: "w" },
    { he: "א", tr: "" }, { he: "ע", tr: "" }
  ];

  // Vokalzeichen (Niqqud) inkl. Schwa. "mark" = combining codepoint(s).
  var VOWELS = [
    { id: "patach", mark: "ַ", tr: "a" }, { id: "kamatz", mark: "ָ", tr: "a" },
    { id: "segol", mark: "ֶ", tr: "e" }, { id: "tsere", mark: "ֵ", tr: "e" },
    { id: "chirik", mark: "ִ", tr: "i" }, { id: "cholam", mark: "ֹ", tr: "o" },
    { id: "kubutz", mark: "ֻ", tr: "u" }, { id: "shva", mark: "ְ", tr: "e" }
  ];

  // Sprech-Overrides fuer die Vertonung: einzelne Silben, die die TTS-API als
  // nackten String nicht synthetisieren kann, sprechen mit einem lautgleichen
  // Ersatz (Key/Anzeige bleiben das Original; nur der VORGELESENE Text weicht ab).
  var SPEAK_OVERRIDES = {
    "קְ": "קֶ" // Qof+Schwa: API liefert Leerdaten; Segol klingt gleich ("ke")
  };

  var syllables = [];
  CONS.forEach(function (c) {
    VOWELS.forEach(function (v) {
      // Stumme Traeger (Alef/Ajin) tragen kein Schwa (klingt nach nichts).
      if (!c.tr && v.id === "shva") return;
      var he = c.he + v.mark;
      var syl = {
        he: he,
        // Schwa = kurzes e; ansonsten Konsonant + Vokal. Stille Traeger -> nur Vokal.
        translit: (c.tr || "") + v.tr,
        letter: c.he.charAt(0),
        vowel: v.id
      };
      if (SPEAK_OVERRIDES[he]) syl.speak = SPEAK_OVERRIDES[he];
      syllables.push(syl);
    });
  });

  /* ------------------------------------------------------------------ *
   * 2. Kuratierte Ausnahmen (gehen der Heuristik vor, exakter Match)    *
   * ------------------------------------------------------------------ */

  // Woerter, die die Heuristik nicht sauber (oder nicht didaktisch) trifft.
  // Jede Zerlegung ist von Hand geprueft; Round-Trip haelt per Konstruktion.
  var exceptions = {
    // Eigennamen / bekannte Sonderfaelle
    "יִשְׂרָאֵל": [ // יִשְׂרָאֵל Israel
      { he: "יִשְׂ", translit: "jis" },
      { he: "רָ", translit: "ra" },
      { he: "אֵל", translit: "el" }
    ],

    // Drill-Woerter (von course.js/den Drills referenziert): fest verankert, damit
    // spaetere Heuristik-Feinschliffe die Drill-Zerlegung nie still veraendern.
    // Alle Splits gegen die Heuristik geprueft; Round-Trip haelt.
    "שָׁלוֹם": [ { he: "שָׁ", translit: "sha" }, { he: "לוֹם", translit: "lom" } ], // shalom
    "תּוֹדָה": [ { he: "תּוֹ", translit: "to" }, { he: "דָה", translit: "da" } ],    // toda
    "כֵּן": [ { he: "כֵּן", translit: "ken" } ],                                     // ken
    "לֹא": [ { he: "לֹא", translit: "lo" } ],                                        // lo
    "מַיִם": [ { he: "מַ", translit: "ma" }, { he: "יִם", translit: "jim" } ],       // mayim
    "קָפֶה": [ { he: "קָ", translit: "ka" }, { he: "פֶה", translit: "fe" } ],        // kafe
    "תֵּה": [ { he: "תֵּה", translit: "te" } ],                                      // te
    "לֶחֶם": [ { he: "לֶ", translit: "le" }, { he: "חֶם", translit: "chem" } ],      // lechem
    "סָגוּר": [ { he: "סָ", translit: "sa" }, { he: "גוּר", translit: "gur" } ],     // sagur
    "קָרוֹב": [ { he: "קָ", translit: "ka" }, { he: "רוֹב", translit: "rov" } ],     // karov
    "רָחוֹק": [ { he: "רָ", translit: "ra" }, { he: "חוֹק", translit: "chok" } ]     // rachok
  };

  /* ------------------------------------------------------------------ *
   * 3. Heuristischer Silbifizierer                                      *
   * ------------------------------------------------------------------ */

  function isHebrewLetter(ch) { var c = ch.charCodeAt(0); return c >= 0x05D0 && c <= 0x05EA; }
  function isMark(ch) { var c = ch.charCodeAt(0); return c >= 0x0591 && c <= 0x05C7; }

  var DAGESH = "ּ", SHIN_DOT = "ׁ", SIN_DOT = "ׂ", SHVA = "ְ";

  /** Vollvokal-Laut eines Clusters oder null (Schwa zaehlt hier NICHT als voll). */
  function fullVowel(marks) {
    if (/[ֲַ]/.test(marks)) return "a";       // Patach, Chataf-Patach
    if (/ָ/.test(marks)) return "a";               // Kamatz
    if (/[ֱֶ]/.test(marks)) return "e";       // Segol, Chataf-Segol
    if (/ֵ/.test(marks)) return "e";               // Tsere
    if (/ִ/.test(marks)) return "i";               // Chirik
    if (/[ֳֹֺ]/.test(marks)) return "o"; // Cholam (male/haser), Chataf-Kamatz
    if (/ֻ/.test(marks)) return "u";               // Kubbuz
    return null;
  }

  /** Umschrift des Konsonanten eines Clusters (kontextfrei). */
  function consTr(letter, marks) {
    var dagesh = marks.indexOf(DAGESH) >= 0;
    switch (letter) {
      case "א": return "";  // Alef (stumm)
      case "ע": return "";  // Ajin (stumm)
      case "ב": return dagesh ? "b" : "v";   // Bet / Wet
      case "ג": return "g"; // Gimel
      case "ד": return "d"; // Dalet
      case "ה": return "h"; // He
      case "ו": return "w"; // Waw (als Konsonant; Mater wird separat behandelt)
      case "ז": return "s"; // Sajin (stimmhaftes s)
      case "ח": return "ch";// Chet
      case "ט": return "t"; // Tet
      case "י": return "j"; // Jod (als Konsonant)
      case "כ": return dagesh ? "k" : "ch"; // Kaf / Chaf
      case "ך": return dagesh ? "k" : "ch"; // Kaf sofit
      case "ל": return "l"; // Lamed
      case "מ": case "ם": return "m"; // Mem (+ sofit)
      case "נ": case "ן": return "n"; // Nun (+ sofit)
      case "ס": return "s"; // Samech
      case "פ": return dagesh ? "p" : "f"; // Pe / Fe
      case "ף": return "f"; // Pe sofit
      case "צ": case "ץ": return "ts"; // Zade (+ sofit)
      case "ק": return "k"; // Qof
      case "ר": return "r"; // Resch
      case "ש": return marks.indexOf(SIN_DOT) >= 0 ? "s" : "sh"; // Sin / Schin
      case "ת": return "t"; // Taw
      default: return null;      // unbekannt -> Heuristik gibt spaeter null
    }
  }

  /**
   * Umschrift eines silbenschliessenden / stummen Clusters (Koda oder Mater).
   * prevTr = bisherige Umschrift der Silbe (fuer Diphthong-/Mater-Entscheidung).
   */
  function codaTr(letter, marks, prevTr) {
    if (letter === "י") return /[i]$/.test(prevTr) ? "" : "i"; // Jod: Chirik male stumm, sonst Diphthong-i
    if (letter === "ה") return "";                             // He am Silbenende meist stumm
    if (letter === "ו") return "";                             // blankes Waw als Koda: still
    return consTr(letter, marks);
  }

  /** Cluster: Buchstabe + alle direkt folgenden Marks. null bei Fremdzeichen. */
  function clusterize(w) {
    var clusters = [];
    for (var i = 0; i < w.length; i++) {
      var ch = w.charAt(i);
      if (isHebrewLetter(ch)) {
        clusters.push({ he: ch, letter: ch, marks: "" });
      } else if (isMark(ch)) {
        if (!clusters.length) return null; // Mark vor jedem Buchstaben
        var last = clusters[clusters.length - 1];
        last.he += ch; last.marks += ch;
      } else {
        return null; // Fremdzeichen (Geresch, Ziffern, ...) -> Ausnahmefall
      }
    }
    return clusters.length ? clusters : null;
  }

  /** Ein WORT (ohne Leerzeichen) in Silben zerlegen; null bei Unsicherheit. */
  function splitWord(w) {
    var clusters = clusterize(w);
    if (!clusters) return null;

    // Cluster typisieren.
    var units = [];
    for (var i = 0; i < clusters.length; i++) {
      var cl = clusters[i], L = cl.letter, mk = cl.marks;
      var cons = consTr(L, mk);
      if (cons === null) return null; // unbekannter Buchstabe
      var fv = fullVowel(mk);
      // Waw als Mater: Cholam (o) oder Schuruk (Dagesch ohne Vollvokal) -> reiner Vokal.
      if (L === "ו") {
        if (/[ֹֺ]/.test(mk)) { units.push({ he: cl.he, kind: "full", vt: "o", cons: "" }); continue; }
        if (mk.indexOf(DAGESH) >= 0 && fv === null) { units.push({ he: cl.he, kind: "full", vt: "u", cons: "" }); continue; }
      }
      if (fv !== null) { units.push({ he: cl.he, kind: "full", vt: fv, cons: cons, letter: L, marks: mk }); continue; }
      if (mk.indexOf(SHVA) >= 0) { units.push({ he: cl.he, kind: "shva", cons: cons, letter: L, marks: mk }); continue; }
      units.push({ he: cl.he, kind: "bare", cons: cons, letter: L, marks: mk });
    }

    var out = [];
    var onset = "", onsetTr = "";
    var prevShva = false;

    for (var k = 0; k < units.length; k++) {
      var u = units[k], prev = out[out.length - 1], next = units[k + 1];

      if (u.kind === "full") {
        out.push({ he: onset + u.he, translit: onsetTr + u.cons + u.vt });
        onset = ""; onsetTr = ""; prevShva = false;

      } else if (u.kind === "shva") {
        // Schwa na (eigene Mini-Silbe) am Wortanfang, mit haengendem Onset,
        // oder als zweites zweier Schwas. Sonst Schwa nach (stille Koda).
        if (!prev || onset !== "" || prevShva) {
          out.push({ he: onset + u.he, translit: (onsetTr + u.cons + "e") || "e" });
          onset = ""; onsetTr = "";
        } else {
          prev.he += u.he;
          prev.translit += codaTr(u.letter, u.marks, prev.translit);
        }
        prevShva = true;

      } else { // bare
        prevShva = false;
        // Mater lectionis: Jod nach i/e, Waw nach o/u, End-He -> stumm an vorige Silbe.
        if (prev && onset === "" && u.letter === "י" && /[ie]$/.test(prev.translit)) {
          prev.he += u.he;
        } else if (prev && onset === "" && u.letter === "ו" && /[ou]$/.test(prev.translit)) {
          prev.he += u.he;
        } else if (prev && onset === "" && u.letter === "ה" && !next) {
          prev.he += u.he;
        } else {
          var startsNext = next && (next.kind === "full" || next.kind === "shva");
          if (startsNext) {
            onset += u.he; onsetTr += u.cons;
          } else if (prev) {
            prev.he += u.he; prev.translit += codaTr(u.letter, u.marks, prev.translit);
          } else {
            // fuehrender Konsonant ohne folgenden Vokal (z. B. Wortanfang) -> Onset sammeln
            onset += u.he; onsetTr += u.cons;
          }
        }
      }
    }

    if (onset) {
      // Rest-Onset ohne eigenen Vokal: an letzte Silbe haengen, sonst unsicher.
      if (!out.length) return null;
      out[out.length - 1].he += onset;
      out[out.length - 1].translit += onsetTr;
    }

    // Jede Silbe braucht eine nicht-leere Umschrift (Vertrag R2).
    for (var j = 0; j < out.length; j++) {
      if (!out[j].translit) return null;
    }
    return out.length ? out : null;
  }

  /** Silbifizierer (Vertrag C3): exceptions zuerst, dann Heuristik, sonst null. */
  function syllabify(niqqud) {
    var s = String(niqqud == null ? "" : niqqud).trim();
    if (!s) return null;
    if (exceptions[s]) return exceptions[s].slice();
    var words = s.split(/\s+/), all = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      var parts = exceptions[w] ? exceptions[w].slice() : splitWord(w);
      if (!parts) return null; // ein unsicheres Wort => null fuers Ganze (Vertrag C3)
      all = all.concat(parts);
    }
    return all.length ? all : null;
  }

  /* ------------------------------------------------------------------ *
   * 4. Drills (feste IDs; von course.js referenziert)                  *
   *    01-04 = Level 1 (Silben), 05-07 = Level 2 (blend), 08 = Level 3 *
   * ------------------------------------------------------------------ */

  // Silben-Strings stammen exakt aus dem Inventar oben (gleiche Erzeugung).
  var S = {};
  syllables.forEach(function (x) { S[x.he] = true; });

  var drills = [
    {
      id: "drill_a0_01",
      title: "Erste Silben: ba, scha, la",
      level: 1,
      types: ["hearPick", "readPick"],
      syllables: ["בָ", "שָׁ", "לָ", "מָ", "תָ"], // בָ שָׁ לָ מָ תָ
      wordIds: []
    },
    {
      id: "drill_a0_02",
      title: "Neue Vokale: be, sche, le",
      level: 1,
      types: ["hearPick", "readPick"],
      syllables: ["בֶ", "שֶׁ", "לֶ", "מֶ", "דֶ"], // בֶ שֶׁ לֶ מֶ דֶ
      wordIds: []
    },
    {
      id: "drill_a0_03",
      title: "Der i-Laut: bi, schi, li",
      level: 1,
      types: ["hearPick", "readPick"],
      syllables: ["בִ", "שִׁ", "לִ", "מִ", "נִ", "קִ"], // בִ שִׁ לִ מִ נִ קִ
      wordIds: []
    },
    {
      id: "drill_a0_04",
      title: "o-Laut und Schwa",
      level: 1,
      types: ["hearPick", "readPick"],
      syllables: ["בֹ", "מֹ", "שֹׁ", "בְ", "לְ", "מְ"], // בֹ מֹ שֹׁ בְ לְ מְ
      wordIds: []
    },
    {
      id: "drill_a0_05",
      title: "Erste Woerter zusammenlesen",
      level: 2,
      types: ["blend"],
      syllables: [],
      wordIds: ["shalom", "toda", "ken", "lo"]
    },
    {
      id: "drill_a0_06",
      title: "Im Cafe lesen",
      level: 2,
      types: ["blend"],
      syllables: [],
      wordIds: ["mayim", "kafe", "te", "lechem"]
    },
    {
      id: "drill_a0_07",
      title: "Schilder lesen",
      level: 2,
      types: ["blend"],
      syllables: [],
      wordIds: ["sagur", "karov", "rachok", "kafe"]
    },
    {
      id: "drill_a0_08",
      title: "Tempo: schnell erkennen",
      level: 3,
      types: ["speed"],
      syllables: [],
      wordIds: ["shalom", "toda", "ken", "lo", "mayim", "kafe"]
    }
  ];

  window.TACHELES_READING = {
    version: 1,
    syllables: syllables,
    exceptions: exceptions,
    syllabify: syllabify,
    drills: drills
  };
})();
