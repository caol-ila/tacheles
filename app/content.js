/*
 * Tacheles - Content-Daten (Band A0 "Survival" + A1, ~300 Eintraege, 20 Themen)
 * Klassisches Script (kein ES-Modul), damit es per file:// direkt im Browser laeuft.
 * Definiert global: window.TACHELES_CONTENT = { version, themes, items, dialogues }
 *
 * Schema pro Item:
 *   id        eindeutig, stabil (NIE aendern - der Lern-Fortschritt haengt daran)
 *   type      'word' | 'phrase' | 'sentence' | 'letter' | 'sign' | 'number'
 *   he        Hebraeisch OHNE Niqqud (Ziel-Ansicht, wie echte Schilder)
 *   niqqud    Hebraeisch MIT Niqqud (Stuetzrad; bei letters/sentences = he)
 *   translit  deutschfreundliche Umschrift (Stuetzrad); "ch" wie in "Bach"
 *   de        deutsche Bedeutung
 *   theme     Themen-id (muss in themes existieren)
 *   freq      grober Haeufigkeits-/Nutzenrang (kleiner = frueher lernen)
 *   note      optionaler Hinweis (Genus, weibliche Form, Eselsbruecke ...)
 *   speak     optionaler Sprech-Text fuer TTS (Buchstaben: der NAME, z. B. "שין")
 *   emoji     optionales Bild fuer den Bilder-Modus (wird unten per EMOJI-Map gesetzt)
 *   tokens    nur type 'sentence': Woerter in Lesereihenfolge fuer den Satzbau-Modus
 *
 * Am Dateiende: dialogues (Dialog-Modus, Zeilen optional mit itemId-Verknuepfung)
 * und die EMOJI-Map (haelt die Item-Definitionen schlank).
 *
 * Hinweis: Audio kommt zur Laufzeit aus der browsereigenen Sprachausgabe (he-IL).
 * Niqqud/Transliteration/Dialoge sind sorgfaeltig erstellt, sollten aber vor einem
 * "echten" Release muttersprachlich gegengelesen werden.
 */
window.TACHELES_CONTENT = {
  version: 1,
  themes: [
    { id: "alefbet",   title: "Aleph-Bet (Buchstaben)",   emoji: "🔤", band: "A0" },
    { id: "greetings", title: "Begrüßung & Höflichkeit", emoji: "👋", band: "A0" },
    { id: "self",      title: "Ich & Du",                 emoji: "🧑", band: "A0" },
    { id: "questions", title: "Fragewörter",              emoji: "❓", band: "A0" },
    { id: "numbers",   title: "Zahlen 0–10",              emoji: "🔢", band: "A0" },
    { id: "signs",     title: "Wichtige Schilder",        emoji: "🪧", band: "A0" },
    { id: "directions",title: "Richtung & Ort",           emoji: "🧭", band: "A0" },
    { id: "cafe",      title: "Café & Bestellen",         emoji: "☕", band: "A0" },
    { id: "time",      title: "Zeit & Wochentage",        emoji: "🕐", band: "A0" },
    { id: "feelings",  title: "Small Talk & Gefühle",     emoji: "🙂", band: "A0" },
    { id: "verbs",     title: "Verben im Alltag",         emoji: "🏃", band: "A1" },
    { id: "food",      title: "Essen & Trinken",          emoji: "🍎", band: "A1" },
    { id: "shopping",  title: "Einkaufen & Markt",        emoji: "🛒", band: "A1" },
    { id: "small_words", title: "Kleine Wörter, große Wirkung", emoji: "🔗", band: "A1" },
    { id: "adjectives", title: "Gegensatz-Paare",           emoji: "⚖️", band: "A1" },
    { id: "transport", title: "Unterwegs & Reisen",       emoji: "🚌", band: "A1" },
    { id: "family",    title: "Menschen & Familie",       emoji: "👪", band: "A1" },
    { id: "emergency", title: "Notfall & Gesundheit",     emoji: "🚑", band: "A1" },
    { id: "colors",    title: "Farben",                   emoji: "🎨", band: "A1" },
    { id: "numbers2",  title: "Zahlen 11–1000 & Geld",    emoji: "💯", band: "A1" }
  ],
  items: [
    // --- Aleph-Bet (type 'letter') ---
    // freq ist so gewaehlt, dass die Buchstaben der haeufigsten Woerter zuerst kommen:
    // nach Stufe 1-2 kann man שלום lesen, nach Stufe 3 auch תודה, לא, כן ...
    // 'speak' = ausgeschriebener Buchstabenname fuer die Sprachausgabe.
    { id: "let_shin",   type: "letter", he: "ש", niqqud: "ש", translit: "schin",   de: "Schin – sch/s",             speak: "שין",   theme: "alefbet", freq: 1, note: "שׁ = sch (Punkt rechts), שׂ = s (Punkt links). Erster Buchstabe von שלום" },
    { id: "let_lamed",  type: "letter", he: "ל", niqqud: "ל", translit: "lamed",   de: "Lamed – l",                 speak: "למד",   theme: "alefbet", freq: 1, note: "ragt als einziger nach oben heraus" },
    { id: "let_vav",    type: "letter", he: "ו", niqqud: "ו", translit: "waw",     de: "Waw – w / o / u",           speak: "וו",    theme: "alefbet", freq: 1, note: "auch Vokalträger für o und u. Ähnlich: ז und Endform ן" },
    { id: "let_mem",    type: "letter", he: "מ", niqqud: "מ", translit: "mem",     de: "Mem – m",                   speak: "מם",    theme: "alefbet", freq: 2, note: "am Wortende: ם" },
    { id: "let_mem_s",  type: "letter", he: "ם", niqqud: "ם", translit: "mem sofit", de: "Mem (Endform) – m",       speak: "מם סופית", theme: "alefbet", freq: 2, note: "nur am Wortende, wie in שלום. Ähnlich: ס" },
    { id: "let_tav",    type: "letter", he: "ת", niqqud: "ת", translit: "taw",     de: "Taw – t",                   speak: "תו",    theme: "alefbet", freq: 2, note: "erster Buchstabe von תודה. Ähnlich: ח" },
    { id: "let_dalet",  type: "letter", he: "ד", niqqud: "ד", translit: "dalet",   de: "Dalet – d",                 speak: "דלת",   theme: "alefbet", freq: 3, note: "Ähnlich: ר (Dalet hat eine Ecke, Resch ist rund)" },
    { id: "let_he",     type: "letter", he: "ה", niqqud: "ה", translit: "he",      de: "He – h",                    speak: "הא",    theme: "alefbet", freq: 3, note: "am Wortende oft stumm (a-Laut). Ähnlich: ח (He hat links eine Lücke)" },
    { id: "let_alef",   type: "letter", he: "א", niqqud: "א", translit: "alef",    de: "Alef – stumm (Vokalträger)",speak: "אלף",   theme: "alefbet", freq: 3, note: "trägt Vokale wie a/e, z. B. in אני (ich)" },
    { id: "let_kaf",    type: "letter", he: "כ", niqqud: "כ", translit: "kaf",     de: "Kaf – k / ch",              speak: "כף",    theme: "alefbet", freq: 4, note: "mit Punkt (כּ) = k, ohne = ch. Endform: ך. Ähnlich: ב" },
    { id: "let_nun",    type: "letter", he: "נ", niqqud: "נ", translit: "nun",     de: "Nun – n",                   speak: "נון",   theme: "alefbet", freq: 4, note: "am Wortende: ן, wie in כן (ja)" },
    { id: "let_nun_s",  type: "letter", he: "ן", niqqud: "ן", translit: "nun sofit", de: "Nun (Endform) – n",       speak: "נון סופית", theme: "alefbet", freq: 4, note: "nur am Wortende. Ähnlich: ו (länger nach unten)" },
    { id: "let_bet",    type: "letter", he: "ב", niqqud: "ב", translit: "bet",     de: "Bet – b / w",               speak: "בית",   theme: "alefbet", freq: 5, note: "mit Punkt (בּ) = b, ohne = w. Ähnlich: כ (Bet hat unten eine Ecke)" },
    { id: "let_qof",    type: "letter", he: "ק", niqqud: "ק", translit: "qof",     de: "Qof – k",                   speak: "קוף",   theme: "alefbet", freq: 5, note: "wie in קפה (Kaffee)" },
    { id: "let_yod",    type: "letter", he: "י", niqqud: "י", translit: "jod",     de: "Jod – j / i",               speak: "יוד",   theme: "alefbet", freq: 5, note: "kleinster Buchstabe, auch Vokalträger für i" },
    { id: "let_resh",   type: "letter", he: "ר", niqqud: "ר", translit: "resch",   de: "Resch – r",                 speak: "ריש",   theme: "alefbet", freq: 6, note: "rund. Ähnlich: ד (das hat eine Ecke)" },
    { id: "let_ayin",   type: "letter", he: "ע", niqqud: "ע", translit: "ajin",    de: "Ajin – stumm (Kehllaut)",   speak: "עין",   theme: "alefbet", freq: 6, note: "wie in ערב (Abend)" },
    { id: "let_chet",   type: "letter", he: "ח", niqqud: "ח", translit: "chet",    de: "Chet – ch (wie „Bach“)",   speak: "חית",   theme: "alefbet", freq: 6, note: "Ähnlich: ה (Chet ist geschlossen) und ת" },
    { id: "let_pe",     type: "letter", he: "פ", niqqud: "פ", translit: "pe",      de: "Pe – p / f",                speak: "פא",    theme: "alefbet", freq: 7, note: "mit Punkt (פּ) = p, ohne = f. Endform: ף" },
    { id: "let_tet",    type: "letter", he: "ט", niqqud: "ט", translit: "tet",     de: "Tet – t",                   speak: "טית",   theme: "alefbet", freq: 7, note: "wie in טוב (gut)" },
    { id: "let_zayin",  type: "letter", he: "ז", niqqud: "ז", translit: "sajin",   de: "Sajin – s (stimmhaft)",     speak: "זין",   theme: "alefbet", freq: 7, note: "wie s in „Rose“. Ähnlich: ו" },
    { id: "let_gimel",  type: "letter", he: "ג", niqqud: "ג", translit: "gimel",   de: "Gimel – g",                 speak: "גימל",  theme: "alefbet", freq: 8 },
    { id: "let_tsadi",  type: "letter", he: "צ", niqqud: "צ", translit: "zade",    de: "Zade – z (ts)",             speak: "צדי",   theme: "alefbet", freq: 8, note: "Endform: ץ" },
    { id: "let_samech", type: "letter", he: "ס", niqqud: "ס", translit: "samech",  de: "Samech – s",                speak: "סמך",   theme: "alefbet", freq: 8, note: "Ähnlich: Endform ם (Samech ist rund)" },
    { id: "let_kaf_s",  type: "letter", he: "ך", niqqud: "ך", translit: "kaf sofit", de: "Kaf (Endform) – ch",      speak: "כף סופית", theme: "alefbet", freq: 9, note: "nur am Wortende, wie in שלך (dein)" },
    { id: "let_pe_s",   type: "letter", he: "ף", niqqud: "ף", translit: "pe sofit",  de: "Pe (Endform) – f",        speak: "פא סופית", theme: "alefbet", freq: 9, note: "nur am Wortende, wie in כסף (Geld)" },
    { id: "let_tsadi_s",type: "letter", he: "ץ", niqqud: "ץ", translit: "zade sofit",de: "Zade (Endform) – z",      speak: "צדי סופית", theme: "alefbet", freq: 9, note: "nur am Wortende" },

    // --- Begrüßung & Höflichkeit ---
    { id: "shalom",     type: "word",   he: "שלום",        niqqud: "שָׁלוֹם",         translit: "shalom",       de: "Hallo / Friede",        theme: "greetings", freq: 1 },
    { id: "toda",       type: "word",   he: "תודה",        niqqud: "תּוֹדָה",          translit: "toda",         de: "Danke",                 theme: "greetings", freq: 2 },
    { id: "toda_raba",  type: "phrase", he: "תודה רבה",    niqqud: "תּוֹדָה רַבָּה",     translit: "toda raba",    de: "Vielen Dank",           theme: "greetings", freq: 6 },
    { id: "bevakasha",  type: "word",   he: "בבקשה",       niqqud: "בְּבַקָשָׁה",       translit: "bevakasha",    de: "Bitte / Gern geschehen",theme: "greetings", freq: 3 },
    { id: "ken",        type: "word",   he: "כן",          niqqud: "כֵּן",             translit: "ken",          de: "Ja",                    theme: "greetings", freq: 2 },
    { id: "lo",         type: "word",   he: "לא",          niqqud: "לֹא",              translit: "lo",           de: "Nein",                  theme: "greetings", freq: 2 },
    { id: "slicha",     type: "word",   he: "סליחה",       niqqud: "סְלִיחָה",         translit: "slicha",       de: "Entschuldigung",        theme: "greetings", freq: 4 },
    { id: "boker_tov",  type: "phrase", he: "בוקר טוב",    niqqud: "בֹּקֶר טוֹב",       translit: "boker tov",    de: "Guten Morgen",          theme: "greetings", freq: 5 },
    { id: "erev_tov",   type: "phrase", he: "ערב טוב",     niqqud: "עֶרֶב טוֹב",        translit: "erev tov",     de: "Guten Abend",           theme: "greetings", freq: 7 },
    { id: "laila_tov",  type: "phrase", he: "לילה טוב",    niqqud: "לַיְלָה טוֹב",       translit: "laila tov",    de: "Gute Nacht",            theme: "greetings", freq: 8 },
    { id: "lehitraot",  type: "phrase", he: "להתראות",     niqqud: "לְהִתְרָאוֹת",      translit: "lehitraot",    de: "Auf Wiedersehen",       theme: "greetings", freq: 5 },
    { id: "bay",        type: "word",   he: "ביי",         niqqud: "בַּיי",            translit: "bay",          de: "Tschüss",               theme: "greetings", freq: 6 },
    { id: "ma_shlomcha",type: "phrase", he: "מה שלומך",    niqqud: "מַה שְׁלוֹמְךָ",      translit: "ma shlomcha",  de: "Wie geht es dir?",      theme: "greetings", freq: 9, note: "an einen Mann" },
    { id: "ma_shlomech",type: "phrase", he: "מה שלומך",    niqqud: "מַה שְׁלוֹמֵךְ",      translit: "ma shlomech",  de: "Wie geht es dir?",      theme: "greetings", freq: 9, note: "an eine Frau" },
    { id: "naim_meod",  type: "phrase", he: "נעים מאוד",   niqqud: "נָעִים מְאוֹד",      translit: "na'im me'od",  de: "Sehr angenehm",         theme: "greetings", freq: 12 },
    { id: "beseder",    type: "word",   he: "בסדר",        niqqud: "בְּסֵדֶר",          translit: "beseder",      de: "in Ordnung / okay",     theme: "greetings", freq: 8 },
    { id: "efshar",     type: "word",   he: "אפשר",        niqqud: "אֶפְשָׁר",          translit: "efshar",       de: "kann man? / geht das?", theme: "greetings", freq: 11, note: "Gold-Wort: efshar + Substantiv = höfliche Bitte" },

    // --- Ich & Du ---
    { id: "ani",        type: "word",   he: "אני",         niqqud: "אֲנִי",            translit: "ani",          de: "ich",                   theme: "self", freq: 3 },
    { id: "ata",        type: "word",   he: "אתה",         niqqud: "אַתָּה",           translit: "ata",          de: "du",                    theme: "self", freq: 4, note: "männlich" },
    { id: "at",         type: "word",   he: "את",          niqqud: "אַתְּ",            translit: "at",           de: "du",                    theme: "self", freq: 4, note: "weiblich" },
    { id: "hu",         type: "word",   he: "הוא",         niqqud: "הוּא",             translit: "hu",           de: "er",                    theme: "self", freq: 5 },
    { id: "hi",         type: "word",   he: "היא",         niqqud: "הִיא",             translit: "hi",           de: "sie",                   theme: "self", freq: 5 },
    { id: "shem",       type: "word",   he: "שם",          niqqud: "שֵׁם",             translit: "shem",         de: "Name",                  theme: "self", freq: 10 },
    { id: "eich_korim", type: "phrase", he: "איך קוראים לך",niqqud: "אֵיךְ קוֹרְאִים לְךָ",translit: "eich kor'im lecha", de: "Wie heißt du?",   theme: "self", freq: 11, note: "an einen Mann" },

    // --- Fragewörter ---
    { id: "eifo",       type: "word",   he: "איפה",        niqqud: "אֵיפֹה",           translit: "eifo",         de: "wo",                    theme: "questions", freq: 6 },
    { id: "ma",         type: "word",   he: "מה",          niqqud: "מָה",              translit: "ma",           de: "was",                   theme: "questions", freq: 4 },
    { id: "mi",         type: "word",   he: "מי",          niqqud: "מִי",              translit: "mi",           de: "wer",                   theme: "questions", freq: 7 },
    { id: "matai",      type: "word",   he: "מתי",         niqqud: "מָתַי",            translit: "matai",        de: "wann",                  theme: "questions", freq: 9 },
    { id: "kama",       type: "word",   he: "כמה",         niqqud: "כַּמָּה",          translit: "kama",         de: "wie viel",              theme: "questions", freq: 8 },

    // --- Zahlen 0–10 (Zählform) ---
    { id: "efes",       type: "number", he: "אפס",         niqqud: "אֶפֶס",            translit: "efes",         de: "null",                  theme: "numbers", freq: 20 },
    { id: "achat",      type: "number", he: "אחת",         niqqud: "אַחַת",            translit: "achat",        de: "eins",                  theme: "numbers", freq: 13 },
    { id: "shtayim",    type: "number", he: "שתיים",       niqqud: "שְׁתַּיִם",         translit: "shtayim",      de: "zwei",                  theme: "numbers", freq: 13 },
    { id: "shalosh",    type: "number", he: "שלוש",        niqqud: "שָׁלוֹשׁ",          translit: "shalosh",      de: "drei",                  theme: "numbers", freq: 14 },
    { id: "arba",       type: "number", he: "ארבע",        niqqud: "אַרְבַּע",          translit: "arba",         de: "vier",                  theme: "numbers", freq: 14 },
    { id: "chamesh",    type: "number", he: "חמש",         niqqud: "חָמֵשׁ",           translit: "chamesh",      de: "fünf",                  theme: "numbers", freq: 15 },
    { id: "shesh",      type: "number", he: "שש",          niqqud: "שֵׁשׁ",            translit: "shesh",        de: "sechs",                 theme: "numbers", freq: 15 },
    { id: "sheva",      type: "number", he: "שבע",         niqqud: "שֶׁבַע",           translit: "sheva",        de: "sieben",                theme: "numbers", freq: 16 },
    { id: "shmone",     type: "number", he: "שמונה",       niqqud: "שְׁמוֹנֶה",         translit: "shmone",       de: "acht",                  theme: "numbers", freq: 16 },
    { id: "tesha",      type: "number", he: "תשע",         niqqud: "תֵּשַׁע",          translit: "tesha",        de: "neun",                  theme: "numbers", freq: 17 },
    { id: "eser",       type: "number", he: "עשר",         niqqud: "עֶשֶׂר",           translit: "eser",         de: "zehn",                  theme: "numbers", freq: 17 },

    // --- Wichtige Schilder (Ziel: ohne Niqqud lesen) ---
    { id: "knisa",      type: "sign",   he: "כניסה",       niqqud: "כְּנִיסָה",         translit: "knisa",        de: "Eingang",               theme: "signs", freq: 10 },
    { id: "yetsia",     type: "sign",   he: "יציאה",       niqqud: "יְצִיאָה",          translit: "yetsia",       de: "Ausgang",               theme: "signs", freq: 10 },
    { id: "patuach",    type: "sign",   he: "פתוח",        niqqud: "פָּתוּחַ",          translit: "patuach",      de: "offen",                 theme: "signs", freq: 11 },
    { id: "sagur",      type: "sign",   he: "סגור",        niqqud: "סָגוּר",           translit: "sagur",        de: "geschlossen",           theme: "signs", freq: 11 },
    { id: "sherutim",   type: "sign",   he: "שירותים",     niqqud: "שֵׁירוּתִים",       translit: "sherutim",     de: "Toilette",              theme: "signs", freq: 9 },
    { id: "dchof",      type: "sign",   he: "דחוף",        niqqud: "דְּחוֹף",           translit: "dchof",        de: "drücken",               theme: "signs", freq: 18 },
    { id: "mshoch",     type: "sign",   he: "משוך",        niqqud: "מְשׁוֹךְ",          translit: "mshoch",       de: "ziehen",                theme: "signs", freq: 18 },
    { id: "asur_leashen",type:"sign",   he: "אסור לעשן",   niqqud: "אָסוּר לְעַשֵּׁן",   translit: "asur le'ashen",de: "Rauchen verboten",      theme: "signs", freq: 19 },
    { id: "sakana",     type: "sign",   he: "סכנה",        niqqud: "סַכָּנָה",          translit: "sakana",       de: "Gefahr",                theme: "signs", freq: 19 },
    { id: "tachana",    type: "sign",   he: "תחנה",        niqqud: "תַּחֲנָה",          translit: "tachana",      de: "Station / Haltestelle", theme: "signs", freq: 15 },

    // --- Richtung & Ort ---
    { id: "yamina",     type: "word",   he: "ימינה",       niqqud: "יָמִינָה",          translit: "yamina",       de: "nach rechts",           theme: "directions", freq: 12 },
    { id: "smola",      type: "word",   he: "שמאלה",       niqqud: "שְׂמֹאלָה",         translit: "smola",        de: "nach links",            theme: "directions", freq: 12 },
    { id: "yashar",     type: "word",   he: "ישר",         niqqud: "יָשָׁר",           translit: "yashar",       de: "geradeaus",             theme: "directions", freq: 13 },
    { id: "po",         type: "word",   he: "פה",          niqqud: "פֹּה",             translit: "po",           de: "hier",                  theme: "directions", freq: 10 },
    { id: "sham",       type: "word",   he: "שם",          niqqud: "שָׁם",             translit: "sham",         de: "dort",                  theme: "directions", freq: 11 },
    { id: "karov",      type: "word",   he: "קרוב",        niqqud: "קָרוֹב",           translit: "karov",        de: "nah",                   theme: "directions", freq: 16 },
    { id: "rachok",     type: "word",   he: "רחוק",        niqqud: "רָחוֹק",           translit: "rachok",       de: "weit",                  theme: "directions", freq: 16 },

    // --- Café & Bestellen ---
    { id: "mayim",      type: "word",   he: "מים",         niqqud: "מַיִם",            translit: "mayim",        de: "Wasser",                theme: "cafe", freq: 8 },
    { id: "kafe",       type: "word",   he: "קפה",         niqqud: "קָפֶה",            translit: "kafe",         de: "Kaffee",                theme: "cafe", freq: 9 },
    { id: "te",         type: "word",   he: "תה",          niqqud: "תֵּה",             translit: "te",           de: "Tee",                   theme: "cafe", freq: 11 },
    { id: "lechem",     type: "word",   he: "לחם",         niqqud: "לֶחֶם",            translit: "lechem",       de: "Brot",                  theme: "cafe", freq: 12 },
    { id: "cheshbon",   type: "word",   he: "חשבון",       niqqud: "חֶשְׁבּוֹן",        translit: "cheshbon",     de: "die Rechnung",          theme: "cafe", freq: 14 },
    { id: "tafrit",     type: "word",   he: "תפריט",       niqqud: "תַּפְרִיט",         translit: "tafrit",       de: "die Speisekarte",       theme: "cafe", freq: 15 },
    { id: "ani_rotze",  type: "phrase", he: "אני רוצה",    niqqud: "אֲנִי רוֹצֶה",       translit: "ani rotze",    de: "ich möchte",            theme: "cafe", freq: 13, note: "männlich" },
    { id: "ani_rotza",  type: "phrase", he: "אני רוצה",    niqqud: "אֲנִי רוֹצָה",       translit: "ani rotza",    de: "ich möchte",            theme: "cafe", freq: 13, note: "weiblich" },
    { id: "kama_ze_ole",type: "phrase", he: "כמה זה עולה", niqqud: "כַּמָּה זֶה עוֹלֶה",  translit: "kama ze ole",  de: "Wie viel kostet das?",  theme: "cafe", freq: 14 },
    { id: "kesef",      type: "word",   he: "כסף",         niqqud: "כֶּסֶף",           translit: "kesef",        de: "Geld",                  theme: "cafe", freq: 15 },

    // --- Zeit ---
    { id: "hayom",      type: "word",   he: "היום",        niqqud: "הַיּוֹם",           translit: "hayom",        de: "heute",                 theme: "time", freq: 12 },
    { id: "machar",     type: "word",   he: "מחר",         niqqud: "מָחָר",            translit: "machar",       de: "morgen",                theme: "time", freq: 13 },
    { id: "etmol",      type: "word",   he: "אתמול",       niqqud: "אֶתְמוֹל",          translit: "etmol",        de: "gestern",               theme: "time", freq: 14 },

    // --- Small Talk & Gefühle ---
    { id: "tov",        type: "word",   he: "טוב",         niqqud: "טוֹב",             translit: "tov",          de: "gut",                   theme: "feelings", freq: 7 },
    { id: "ra",         type: "word",   he: "רע",          niqqud: "רַע",              translit: "ra",           de: "schlecht",              theme: "feelings", freq: 13 },
    { id: "raev",       type: "word",   he: "רעב",         niqqud: "רָעֵב",            translit: "ra'ev",        de: "hungrig",               theme: "feelings", freq: 16, note: "männlich" },
    { id: "ayef",       type: "word",   he: "עייף",        niqqud: "עָיֵף",            translit: "ayef",         de: "müde",                  theme: "feelings", freq: 16, note: "männlich" },
    { id: "sababa",     type: "word",   he: "סבבה",        niqqud: "סַבַּבָּה",          translit: "sababa",       de: "super / passt (Slang)", theme: "feelings", freq: 14, note: "sehr gängiger Alltags-Slang" },
    { id: "taim",       type: "word",   he: "טעים",        niqqud: "טָעִים",           translit: "ta'im",        de: "lecker",                theme: "feelings", freq: 15 },
    { id: "yofi",       type: "word",   he: "יופי",        niqqud: "יוֹפִי",            translit: "yofi",         de: "prima / schön",         theme: "feelings", freq: 17 },

    // --- Gold-Phrasen (Überleben im Gespräch) ---
    { id: "lo_mevin",   type: "phrase", he: "אני לא מבין",  niqqud: "אֲנִי לֹא מֵבִין",    translit: "ani lo mevin",  de: "ich verstehe nicht",   theme: "greetings", freq: 10, note: "männlich; weiblich: ani lo mevina" },
    { id: "lo_mevina",  type: "phrase", he: "אני לא מבינה", niqqud: "אֲנִי לֹא מְבִינָה",   translit: "ani lo mevina", de: "ich verstehe nicht",   theme: "greetings", freq: 10, note: "weiblich" },
    { id: "leat_bevakasha", type: "phrase", he: "לאט בבקשה", niqqud: "לְאַט בְּבַקָשָׁה", translit: "le'at bevakasha", de: "langsam, bitte",     theme: "greetings", freq: 11 },
    { id: "medaber_anglit", type: "phrase", he: "אתה מדבר אנגלית", niqqud: "אַתָּה מְדַבֵּר אַנְגְּלִית", translit: "ata medaber anglit", de: "Sprichst du Englisch?", theme: "greetings", freq: 13, note: "an einen Mann" },
    { id: "ein_baaya",  type: "phrase", he: "אין בעיה",     niqqud: "אֵין בְּעָיָה",      translit: "ein be'aya",    de: "kein Problem",         theme: "greetings", freq: 12 },
    { id: "beteavon",   type: "word",   he: "בתיאבון",      niqqud: "בְּתֵיאָבוֹן",       translit: "bete'avon",     de: "guten Appetit",        theme: "cafe", freq: 16 },
    { id: "lechaim",    type: "phrase", he: "לחיים",        niqqud: "לְחַיִּים",          translit: "lechaim",       de: "Prost! (auf das Leben)", theme: "cafe", freq: 17 },
    { id: "mazal_tov",  type: "phrase", he: "מזל טוב",      niqqud: "מַזָּל טוֹב",        translit: "mazal tov",     de: "Herzlichen Glückwunsch", theme: "greetings", freq: 14 },

    // --- Zeit & Wochentage ---
    { id: "yom",        type: "word",   he: "יום",         niqqud: "יוֹם",             translit: "yom",          de: "Tag",                   theme: "time", freq: 10 },
    { id: "shavua",     type: "word",   he: "שבוע",        niqqud: "שָׁבוּעַ",          translit: "shavua",       de: "Woche",                 theme: "time", freq: 15 },
    { id: "achshav",    type: "word",   he: "עכשיו",       niqqud: "עַכְשָׁיו",          translit: "achshav",      de: "jetzt",                 theme: "time", freq: 11 },
    { id: "yom_rishon", type: "phrase", he: "יום ראשון",   niqqud: "יוֹם רִאשׁוֹן",      translit: "yom rishon",   de: "Sonntag",               theme: "time", freq: 18, note: "wörtl. „erster Tag“ – die Woche beginnt am Sonntag!" },
    { id: "yom_sheni",  type: "phrase", he: "יום שני",     niqqud: "יוֹם שֵׁנִי",        translit: "yom sheni",    de: "Montag",                theme: "time", freq: 18 },
    { id: "yom_shlishi",type: "phrase", he: "יום שלישי",   niqqud: "יוֹם שְׁלִישִׁי",     translit: "yom shlishi",  de: "Dienstag",              theme: "time", freq: 19 },
    { id: "yom_revii",  type: "phrase", he: "יום רביעי",   niqqud: "יוֹם רְבִיעִי",      translit: "yom revi'i",   de: "Mittwoch",              theme: "time", freq: 19 },
    { id: "yom_chamishi",type:"phrase", he: "יום חמישי",   niqqud: "יוֹם חֲמִישִׁי",      translit: "yom chamishi", de: "Donnerstag",            theme: "time", freq: 19 },
    { id: "yom_shishi", type: "phrase", he: "יום שישי",    niqqud: "יוֹם שִׁישִׁי",       translit: "yom shishi",   de: "Freitag",               theme: "time", freq: 18 },
    { id: "shabat",     type: "word",   he: "שבת",         niqqud: "שַׁבָּת",           translit: "shabat",       de: "Samstag / Schabbat",    theme: "time", freq: 17, note: "Ruhetag: vieles ist geschlossen" },

    // --- Essen & Trinken (A1) ---
    { id: "ochel",      type: "word",   he: "אוכל",        niqqud: "אֹכֶל",            translit: "ochel",        de: "Essen",                 theme: "food", freq: 20 },
    { id: "falafel",    type: "word",   he: "פלאפל",       niqqud: "פָלָאפֶל",          translit: "falafel",      de: "Falafel",               theme: "food", freq: 21 },
    { id: "chumus",     type: "word",   he: "חומוס",       niqqud: "חוּמוּס",           translit: "chumus",       de: "Hummus",                theme: "food", freq: 21 },
    { id: "salat",      type: "word",   he: "סלט",         niqqud: "סָלָט",            translit: "salat",        de: "Salat",                 theme: "food", freq: 22 },
    { id: "tapuach",    type: "word",   he: "תפוח",        niqqud: "תַּפּוּחַ",          translit: "tapuach",      de: "Apfel",                 theme: "food", freq: 23 },
    { id: "banana",     type: "word",   he: "בננה",        niqqud: "בַּנָנָה",           translit: "banana",       de: "Banane",                theme: "food", freq: 24 },
    { id: "beitsa",     type: "word",   he: "ביצה",        niqqud: "בֵּיצָה",           translit: "beitsa",       de: "Ei",                    theme: "food", freq: 23 },
    { id: "gvina",      type: "word",   he: "גבינה",       niqqud: "גְּבִינָה",          translit: "gvina",        de: "Käse",                  theme: "food", freq: 23 },
    { id: "dag",        type: "word",   he: "דג",          niqqud: "דָּג",              translit: "dag",          de: "Fisch",                 theme: "food", freq: 24 },
    { id: "basar",      type: "word",   he: "בשר",         niqqud: "בָּשָׂר",           translit: "basar",        de: "Fleisch",               theme: "food", freq: 24 },
    { id: "of",         type: "word",   he: "עוף",         niqqud: "עוֹף",             translit: "of",           de: "Hähnchen",              theme: "food", freq: 24 },
    { id: "chalav",     type: "word",   he: "חלב",         niqqud: "חָלָב",            translit: "chalav",       de: "Milch",                 theme: "food", freq: 22 },
    { id: "mits",       type: "word",   he: "מיץ",         niqqud: "מִיץ",             translit: "mits",         de: "Saft",                  theme: "food", freq: 23 },
    { id: "bira",       type: "word",   he: "בירה",        niqqud: "בִּירָה",           translit: "bira",         de: "Bier",                  theme: "food", freq: 22 },
    { id: "yayin",      type: "word",   he: "יין",         niqqud: "יַיִן",             translit: "yayin",        de: "Wein",                  theme: "food", freq: 23 },
    { id: "glida",      type: "word",   he: "גלידה",       niqqud: "גְּלִידָה",          translit: "glida",        de: "Eis (Speiseeis)",       theme: "food", freq: 22 },
    { id: "uga",        type: "word",   he: "עוגה",        niqqud: "עוּגָה",            translit: "uga",          de: "Kuchen",                theme: "food", freq: 24 },

    // --- Restaurant-Paket (food) ---
    { id: "pita",    type: "word", he: "פיתה",   niqqud: "פִּיתָה",   translit: "pita",     de: "Pita (Fladenbrot)",   theme: "food", freq: 22 },
    { id: "shnitzel",type: "word", he: "שניצל",  niqqud: "שְׁנִיצֶל",  translit: "shnitsel", de: "Schnitzel",           theme: "food", freq: 23, note: "israelischer Klassiker" },
    { id: "marak",   type: "word", he: "מרק",    niqqud: "מָרָק",     translit: "marak",    de: "Suppe",               theme: "food", freq: 24 },
    { id: "orez",    type: "word", he: "אורז",   niqqud: "אֹרֶז",     translit: "orez",     de: "Reis",                theme: "food", freq: 24 },
    { id: "tschips", type: "word", he: "צ'יפס",  niqqud: "צִ'יפְּס",   translit: "tschips",  de: "Pommes",              theme: "food", freq: 23, note: "צ׳ = tsch-Laut (Apostroph)" },
    { id: "mana",    type: "word", he: "מנה",    niqqud: "מָנָה",     translit: "mana",     de: "Gericht / Portion",   theme: "food", freq: 25 },
    { id: "kos",     type: "word", he: "כוס",    niqqud: "כּוֹס",     translit: "kos",      de: "Glas (zum Trinken)",  theme: "food", freq: 24 },
    { id: "bakbuk",  type: "word", he: "בקבוק",  niqqud: "בַּקְבּוּק", translit: "bakbuk",   de: "Flasche",             theme: "food", freq: 25 },
    { id: "mazleg",  type: "word", he: "מזלג",   niqqud: "מַזְלֵג",    translit: "mazleg",   de: "Gabel",               theme: "food", freq: 27 },
    { id: "sakin",   type: "word", he: "סכין",   niqqud: "סַכִּין",    translit: "sakin",    de: "Messer",              theme: "food", freq: 27 },
    { id: "kaf_l",   type: "word", he: "כף",     niqqud: "כַּף",      translit: "kaf",      de: "Löffel",              theme: "food", freq: 27, note: "gleich geschrieben wie der Buchstabe Kaf" },
    { id: "sukar",   type: "word", he: "סוכר",   niqqud: "סֻכָּר",    translit: "sukar",    de: "Zucker",              theme: "food", freq: 26 },
    { id: "melach",  type: "word", he: "מלח",    niqqud: "מֶלַח",     translit: "melach",   de: "Salz",                theme: "food", freq: 26 },

    // --- Einkaufen & Markt (A1) ---
    { id: "yesh",       type: "word",   he: "יש",          niqqud: "יֵשׁ",             translit: "yesh",         de: "es gibt",               theme: "shopping", freq: 12, note: "Gold-Wort: יש קפה? = Gibt es Kaffee?" },
    { id: "ein",        type: "word",   he: "אין",         niqqud: "אֵין",             translit: "ein",          de: "es gibt nicht",         theme: "shopping", freq: 12 },
    { id: "chanut",     type: "word",   he: "חנות",        niqqud: "חֲנוּת",            translit: "chanut",       de: "Laden / Geschäft",      theme: "shopping", freq: 20 },
    { id: "shuk",       type: "word",   he: "שוק",         niqqud: "שׁוּק",             translit: "shuk",         de: "Markt",                 theme: "shopping", freq: 20 },
    { id: "yakar",      type: "word",   he: "יקר",         niqqud: "יָקָר",            translit: "yakar",        de: "teuer",                 theme: "shopping", freq: 19 },
    { id: "zol",        type: "word",   he: "זול",         niqqud: "זוֹל",             translit: "zol",          de: "billig / günstig",      theme: "shopping", freq: 19 },
    { id: "od",         type: "word",   he: "עוד",         niqqud: "עוֹד",             translit: "od",           de: "noch / mehr",           theme: "shopping", freq: 15 },
    { id: "ze",         type: "word",   he: "זה",          niqqud: "זֶה",              translit: "ze",           de: "das / dieses",          theme: "shopping", freq: 9, note: "extrem häufig: כמה זה? = Wie viel (kostet) das?" },
    { id: "hakol",      type: "word",   he: "הכל",         niqqud: "הַכֹּל",            translit: "hakol",        de: "alles",                 theme: "shopping", freq: 18 },

    // --- Kleine Wörter, große Wirkung (A1) ---
    { id: "gam",     type: "word", he: "גם",     niqqud: "גַּם",     translit: "gam",     de: "auch",              theme: "small_words", freq: 14 },
    { id: "aval",    type: "word", he: "אבל",    niqqud: "אֲבָל",    translit: "aval",    de: "aber",              theme: "small_words", freq: 14 },
    { id: "o",       type: "word", he: "או",     niqqud: "אוֹ",      translit: "o",       de: "oder",              theme: "small_words", freq: 15 },
    { id: "ki",      type: "word", he: "כי",     niqqud: "כִּי",     translit: "ki",      de: "weil",              theme: "small_words", freq: 16 },
    { id: "im_mit",  type: "word", he: "עם",     niqqud: "עִם",      translit: "im",      de: "mit",               theme: "small_words", freq: 15 },
    { id: "bli",     type: "word", he: "בלי",    niqqud: "בְּלִי",    translit: "bli",     de: "ohne",              theme: "small_words", freq: 15, note: "Gold: kafe bli sukar = Kaffee ohne Zucker" },
    { id: "rak",     type: "word", he: "רק",     niqqud: "רַק",      translit: "rak",     de: "nur",               theme: "small_words", freq: 15 },
    { id: "betach",  type: "word", he: "בטח",    niqqud: "בֶּטַח",    translit: "betach",  de: "klar! / sicher",    theme: "small_words", freq: 16 },
    { id: "ulai",    type: "word", he: "אולי",   niqqud: "אוּלַי",    translit: "ulai",    de: "vielleicht",        theme: "small_words", freq: 16 },
    { id: "kvar",    type: "word", he: "כבר",    niqqud: "כְּבָר",    translit: "kvar",    de: "schon",             theme: "small_words", freq: 17 },
    { id: "adain",   type: "word", he: "עדיין",  niqqud: "עֲדַיִן",   translit: "adain",   de: "noch / immer noch", theme: "small_words", freq: 17 },
    { id: "germanya",type: "word", he: "גרמניה", niqqud: "גֶּרְמַנְיָה", translit: "germanya", de: "Deutschland",     theme: "self", freq: 13 },

    // --- Gegensatz-Paare (A1, männliche Form) ---
    { id: "cham",    type: "word", he: "חם",    niqqud: "חַם",     translit: "cham",    de: "heiß / warm",       theme: "adjectives", freq: 18 },
    { id: "kar",     type: "word", he: "קר",    niqqud: "קַר",     translit: "kar",     de: "kalt",              theme: "adjectives", freq: 18 },
    { id: "gadol",   type: "word", he: "גדול",  niqqud: "גָּדוֹל",  translit: "gadol",   de: "groß",              theme: "adjectives", freq: 17, note: "weiblich: gdola" },
    { id: "katan",   type: "word", he: "קטן",   niqqud: "קָטָן",    translit: "katan",   de: "klein",             theme: "adjectives", freq: 17, note: "weiblich: ktana" },
    { id: "chadash", type: "word", he: "חדש",   niqqud: "חָדָשׁ",   translit: "chadash", de: "neu",               theme: "adjectives", freq: 19, note: "weiblich: chadasha" },
    { id: "yashan",  type: "word", he: "ישן",   niqqud: "יָשָׁן",   translit: "yashan",  de: "alt (Sache)",       theme: "adjectives", freq: 20, note: "gleich geschrieben wie „schläft“ (yashen)" },
    { id: "maher",   type: "word", he: "מהר",   niqqud: "מַהֵר",    translit: "maher",   de: "schnell",           theme: "adjectives", freq: 19 },
    { id: "le_at",   type: "word", he: "לאט",   niqqud: "לְאַט",    translit: "le'at",   de: "langsam",           theme: "adjectives", freq: 18, note: "le'at le'at = immer mit der Ruhe (Redewendung)" },

    // --- Unterwegs & Reisen (A1) ---
    { id: "otobus",     type: "word",   he: "אוטובוס",     niqqud: "אוֹטוֹבּוּס",        translit: "otobus",       de: "Bus",                   theme: "transport", freq: 20 },
    { id: "rakevet",    type: "word",   he: "רכבת",        niqqud: "רַכֶּבֶת",           translit: "rakevet",      de: "Zug",                   theme: "transport", freq: 21 },
    { id: "monit",      type: "word",   he: "מונית",       niqqud: "מוֹנִית",           translit: "monit",        de: "Taxi",                  theme: "transport", freq: 21 },
    { id: "kartis",     type: "word",   he: "כרטיס",       niqqud: "כַּרְטִיס",          translit: "kartis",       de: "Ticket / Karte",        theme: "transport", freq: 22 },
    { id: "rechov",     type: "word",   he: "רחוב",        niqqud: "רְחוֹב",            translit: "rechov",       de: "Straße",                theme: "transport", freq: 20, note: "steht auf jedem Straßenschild: רח׳" },
    { id: "ir",         type: "word",   he: "עיר",         niqqud: "עִיר",             translit: "ir",           de: "Stadt",                 theme: "transport", freq: 22 },
    { id: "yam",        type: "word",   he: "ים",          niqqud: "יָם",              translit: "yam",          de: "Meer",                  theme: "transport", freq: 21 },
    { id: "chof",       type: "word",   he: "חוף",         niqqud: "חוֹף",             translit: "chof",         de: "Strand",                theme: "transport", freq: 22 },
    { id: "malon",      type: "word",   he: "מלון",        niqqud: "מָלוֹן",            translit: "malon",        de: "Hotel",                 theme: "transport", freq: 21 },
    { id: "lean",       type: "word",   he: "לאן",         niqqud: "לְאָן",             translit: "le'an",        de: "wohin",                 theme: "transport", freq: 19 },
    { id: "sde_teufa",  type: "phrase", he: "שדה תעופה",   niqqud: "שְׂדֵה תְּעוּפָה",     translit: "sde te'ufa",   de: "Flughafen",             theme: "transport", freq: 23 },

    // --- Menschen & Familie (A1) ---
    { id: "mishpacha",  type: "word",   he: "משפחה",       niqqud: "מִשְׁפָּחָה",         translit: "mishpacha",    de: "Familie",               theme: "family", freq: 20 },
    { id: "ima",        type: "word",   he: "אמא",         niqqud: "אִמָּא",            translit: "ima",          de: "Mama",                  theme: "family", freq: 19 },
    { id: "aba",        type: "word",   he: "אבא",         niqqud: "אַבָּא",            translit: "aba",          de: "Papa",                  theme: "family", freq: 19 },
    { id: "yeled",      type: "word",   he: "ילד",         niqqud: "יֶלֶד",             translit: "yeled",        de: "Junge / Kind",          theme: "family", freq: 20 },
    { id: "yalda",      type: "word",   he: "ילדה",        niqqud: "יַלְדָּה",           translit: "yalda",        de: "Mädchen",               theme: "family", freq: 20 },
    { id: "ach",        type: "word",   he: "אח",          niqqud: "אָח",              translit: "ach",          de: "Bruder",                theme: "family", freq: 21 },
    { id: "achot",      type: "word",   he: "אחות",        niqqud: "אָחוֹת",            translit: "achot",        de: "Schwester",             theme: "family", freq: 21 },
    { id: "chaver",     type: "word",   he: "חבר",         niqqud: "חָבֵר",            translit: "chaver",       de: "Freund",                theme: "family", freq: 18 },
    { id: "chavera",    type: "word",   he: "חברה",        niqqud: "חֲבֵרָה",           translit: "chavera",      de: "Freundin",              theme: "family", freq: 18 },
    { id: "ish",        type: "word",   he: "איש",         niqqud: "אִישׁ",             translit: "ish",          de: "Mann",                  theme: "family", freq: 19 },
    { id: "isha",       type: "word",   he: "אישה",        niqqud: "אִשָּׁה",           translit: "isha",         de: "Frau",                  theme: "family", freq: 19 },

    // --- Notfall & Gesundheit (A1) ---
    { id: "ezra",       type: "word",   he: "עזרה",        niqqud: "עֶזְרָה",           translit: "ezra",         de: "Hilfe",                 theme: "emergency", freq: 18 },
    { id: "hatsilu",    type: "word",   he: "הצילו",       niqqud: "הַצִּילוּ",          translit: "hatsilu",      de: "Hilfe! (Hilferuf)",     theme: "emergency", freq: 22 },
    { id: "rofe",       type: "word",   he: "רופא",        niqqud: "רוֹפֵא",            translit: "rofe",         de: "Arzt",                  theme: "emergency", freq: 20 },
    { id: "beit_cholim",type: "phrase", he: "בית חולים",   niqqud: "בֵּית חוֹלִים",      translit: "beit cholim",  de: "Krankenhaus",           theme: "emergency", freq: 21, note: "steht so auf Schildern" },
    { id: "mishtara",   type: "word",   he: "משטרה",       niqqud: "מִשְׁטָרָה",         translit: "mishtara",     de: "Polizei",               theme: "emergency", freq: 21 },
    { id: "beit_mirkachat", type: "phrase", he: "בית מרקחת", niqqud: "בֵּית מִרְקַחַת",   translit: "beit mirkachat", de: "Apotheke",            theme: "emergency", freq: 22 },
    { id: "trufa",      type: "word",   he: "תרופה",       niqqud: "תְּרוּפָה",          translit: "trufa",        de: "Medikament",            theme: "emergency", freq: 23 },
    { id: "koev",       type: "word",   he: "כואב",        niqqud: "כּוֹאֵב",           translit: "ko'ev",        de: "es tut weh",            theme: "emergency", freq: 21, note: "כואב לי = mir tut es weh" },
    { id: "chole",      type: "word",   he: "חולה",        niqqud: "חוֹלֶה",            translit: "chole",        de: "krank",                 theme: "emergency", freq: 22, note: "männlich; weiblich: chola" },

    // --- Verben im Alltag (A1, Gegenwart, männliche Form; weibliche in note) ---
    { id: "holech",  type: "word", he: "הולך",  niqqud: "הוֹלֵךְ",   translit: "holech",  de: "gehen (ich/du/er geht)",    theme: "verbs", freq: 24, note: "weiblich: holechet" },
    { id: "ba",      type: "word", he: "בא",    niqqud: "בָּא",      translit: "ba",      de: "kommen",                    theme: "verbs", freq: 24, note: "weiblich: ba'a" },
    { id: "ochel_v", type: "word", he: "אוכל",  niqqud: "אוֹכֵל",    translit: "ochel",   de: "essen (Verb)",              theme: "verbs", freq: 25, note: "weiblich: ochelet · gleich geschrieben wie „Essen“" },
    { id: "shote",   type: "word", he: "שותה",  niqqud: "שׁוֹתֶה",   translit: "shote",   de: "trinken",                   theme: "verbs", freq: 25, note: "weiblich: shota" },
    { id: "medaber", type: "word", he: "מדבר",  niqqud: "מְדַבֵּר",   translit: "medaber", de: "sprechen",                  theme: "verbs", freq: 24, note: "weiblich: medaberet" },
    { id: "gar",     type: "word", he: "גר",    niqqud: "גָּר",      translit: "gar",     de: "wohnen",                    theme: "verbs", freq: 25, note: "weiblich: gara" },
    { id: "oved",    type: "word", he: "עובד",  niqqud: "עוֹבֵד",    translit: "oved",    de: "arbeiten",                  theme: "verbs", freq: 26, note: "weiblich: ovedet" },
    { id: "lomed",   type: "word", he: "לומד",  niqqud: "לוֹמֵד",    translit: "lomed",   de: "lernen",                    theme: "verbs", freq: 25, note: "weiblich: lomedet" },
    { id: "roe",     type: "word", he: "רואה",  niqqud: "רוֹאֶה",    translit: "ro'e",    de: "sehen",                     theme: "verbs", freq: 26, note: "weiblich: ro'a" },
    { id: "shomea",  type: "word", he: "שומע",  niqqud: "שׁוֹמֵעַ",   translit: "shomea",  de: "hören",                     theme: "verbs", freq: 26, note: "weiblich: shoma'at" },
    { id: "yodea",   type: "word", he: "יודע",  niqqud: "יוֹדֵעַ",    translit: "yodea",   de: "wissen",                    theme: "verbs", freq: 25, note: "weiblich: yoda'at" },
    { id: "ohev",    type: "word", he: "אוהב",  niqqud: "אוֹהֵב",    translit: "ohev",    de: "mögen / lieben",            theme: "verbs", freq: 24, note: "weiblich: ohevet" },

    // --- Ergänzungen zu Ich & Du ---
    { id: "ivrit",   type: "word", he: "עברית", niqqud: "עִבְרִית",  translit: "ivrit",   de: "Hebräisch (die Sprache)",   theme: "self", freq: 11 },
    { id: "ktsat",   type: "word", he: "קצת",   niqqud: "קְצָת",     translit: "ktsat",   de: "ein bisschen",              theme: "self", freq: 12, note: "Gold-Wort: ani medaber ktsat ivrit" },

    // --- Farben (A1, männliche Form) ---
    { id: "adom",    type: "word", he: "אדום",  niqqud: "אָדֹם",    translit: "adom",    de: "rot",     theme: "colors", freq: 26, note: "männliche Form" },
    { id: "kachol",  type: "word", he: "כחול",  niqqud: "כָּחֹל",    translit: "kachol",  de: "blau",    theme: "colors", freq: 26 },
    { id: "yarok",   type: "word", he: "ירוק",  niqqud: "יָרֹק",    translit: "yarok",   de: "grün",    theme: "colors", freq: 27 },
    { id: "tsahov",  type: "word", he: "צהוב",  niqqud: "צָהֹב",    translit: "tsahov",  de: "gelb",    theme: "colors", freq: 27 },
    { id: "lavan",   type: "word", he: "לבן",   niqqud: "לָבָן",    translit: "lavan",   de: "weiß",    theme: "colors", freq: 26 },
    { id: "shachor", type: "word", he: "שחור",  niqqud: "שָׁחֹר",   translit: "shachor", de: "schwarz", theme: "colors", freq: 26 },
    { id: "katom",   type: "word", he: "כתום",  niqqud: "כָּתֹם",    translit: "katom",   de: "orange",  theme: "colors", freq: 28 },
    { id: "varod",   type: "word", he: "ורוד",  niqqud: "וָרֹד",    translit: "varod",   de: "rosa",    theme: "colors", freq: 28 },
    { id: "chum",    type: "word", he: "חום",   niqqud: "חוּם",     translit: "chum",    de: "braun",   theme: "colors", freq: 29 },
    { id: "afor",    type: "word", he: "אפור",  niqqud: "אָפֹר",    translit: "afor",    de: "grau",    theme: "colors", freq: 29 },

    // --- Zahlen 11–1000 & Geld (A1; 11–19 in der Zählform) ---
    { id: "achat_esre",  type: "number", he: "אחת עשרה",   niqqud: "אַחַת עֶשְׂרֵה",   translit: "achat-esre",  de: "elf",      theme: "numbers2", freq: 30 },
    { id: "shtem_esre",  type: "number", he: "שתים עשרה",  niqqud: "שְׁתֵּים עֶשְׂרֵה", translit: "shtem-esre",  de: "zwölf",    theme: "numbers2", freq: 30 },
    { id: "shlosh_esre", type: "number", he: "שלוש עשרה",  niqqud: "שְׁלוֹשׁ עֶשְׂרֵה", translit: "shlosh-esre", de: "dreizehn", theme: "numbers2", freq: 31 },
    { id: "arba_esre",   type: "number", he: "ארבע עשרה",  niqqud: "אַרְבַּע עֶשְׂרֵה", translit: "arba-esre",   de: "vierzehn", theme: "numbers2", freq: 31 },
    { id: "chamesh_esre",type: "number", he: "חמש עשרה",   niqqud: "חֲמֵשׁ עֶשְׂרֵה",  translit: "chamesh-esre",de: "fünfzehn", theme: "numbers2", freq: 31 },
    { id: "esrim",       type: "number", he: "עשרים",      niqqud: "עֶשְׂרִים",       translit: "esrim",       de: "zwanzig",  theme: "numbers2", freq: 30 },
    { id: "shloshim",    type: "number", he: "שלושים",     niqqud: "שְׁלוֹשִׁים",     translit: "shloshim",    de: "dreißig",  theme: "numbers2", freq: 31 },
    { id: "arbaim",      type: "number", he: "ארבעים",     niqqud: "אַרְבָּעִים",     translit: "arba'im",     de: "vierzig",  theme: "numbers2", freq: 32 },
    { id: "chamishim",   type: "number", he: "חמישים",     niqqud: "חֲמִשִּׁים",      translit: "chamishim",   de: "fünfzig",  theme: "numbers2", freq: 31 },
    { id: "shishim",     type: "number", he: "שישים",      niqqud: "שִׁשִּׁים",       translit: "shishim",     de: "sechzig",  theme: "numbers2", freq: 33 },
    { id: "shivim",      type: "number", he: "שבעים",      niqqud: "שִׁבְעִים",       translit: "shiv'im",     de: "siebzig",  theme: "numbers2", freq: 33 },
    { id: "shmonim",     type: "number", he: "שמונים",     niqqud: "שְׁמוֹנִים",      translit: "shmonim",     de: "achtzig",  theme: "numbers2", freq: 33 },
    { id: "tishim",      type: "number", he: "תשעים",      niqqud: "תִּשְׁעִים",      translit: "tish'im",     de: "neunzig",  theme: "numbers2", freq: 33 },
    { id: "mea",         type: "number", he: "מאה",        niqqud: "מֵאָה",          translit: "me'a",        de: "hundert",  theme: "numbers2", freq: 30 },
    { id: "elef_num",    type: "number", he: "אלף",        niqqud: "אֶלֶף",          translit: "elef",        de: "tausend",  theme: "numbers2", freq: 32 },
    { id: "shekel_w",    type: "word",   he: "שקל",        niqqud: "שֶׁקֶל",         translit: "shekel",      de: "Schekel (₪)", theme: "numbers2", freq: 29, note: "Mehrzahl: shkalim" },

    // --- Mehr echte Schilder ---
    { id: "atsor",     type: "sign", he: "עצור",      niqqud: "עֲצֹר",        translit: "atsor",     de: "STOP / Halt",        theme: "signs", freq: 20, note: "das rote Stoppschild" },
    { id: "zehirut",   type: "sign", he: "זהירות",    niqqud: "זְהִירוּת",     translit: "zehirut",   de: "Vorsicht",           theme: "signs", freq: 21 },
    { id: "ein_knisa", type: "sign", he: "אין כניסה", niqqud: "אֵין כְּנִיסָה", translit: "ein knisa", de: "kein Eintritt / keine Einfahrt", theme: "signs", freq: 21 },
    { id: "chanaya",   type: "sign", he: "חניה",      niqqud: "חֲנָיָה",       translit: "chanaya",   de: "Parkplatz / Parken", theme: "signs", freq: 22 },
    { id: "kupa",      type: "sign", he: "קופה",      niqqud: "קֻפָּה",        translit: "kupa",      de: "Kasse",              theme: "signs", freq: 22 },
    { id: "mivtsa",    type: "sign", he: "מבצע",      niqqud: "מִבְצָע",       translit: "mivtsa",    de: "Angebot / Aktion",   theme: "signs", freq: 22, note: "steht in jedem Supermarkt" },
    { id: "kasher",    type: "sign", he: "כשר",       niqqud: "כָּשֵׁר",       translit: "kasher",    de: "koscher",            theme: "signs", freq: 23 },
    { id: "tafus",     type: "sign", he: "תפוס",      niqqud: "תָּפוּס",       translit: "tafus",     de: "besetzt",            theme: "signs", freq: 23 },
    { id: "panui",     type: "sign", he: "פנוי",      niqqud: "פָּנוּי",       translit: "panui",     de: "frei (verfügbar)",   theme: "signs", freq: 23 },

    // --- Sätze für den Satzbau-Modus (type 'sentence' mit tokens) ---
    // tokens in LESE-Reihenfolge (rechts nach links gerendert); niqqud = he (kein Fade noetig).
    { id: "s_ma_ze",       type: "sentence", he: "מה זה?",                 niqqud: "מה זה?",                 translit: "ma ze?",                    de: "Was ist das?",                     theme: "questions", freq: 30,
      tokens: [ { he: "מה", translit: "ma", de: "was" }, { he: "זה", translit: "ze", de: "das" } ] },
    { id: "s_ani_kafe",    type: "sentence", he: "אני רוצה קפה",           niqqud: "אני רוצה קפה",           translit: "ani rotze kafe",            de: "Ich möchte Kaffee.",               theme: "cafe", freq: 31, note: "männliche Form",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "רוצה", translit: "rotze", de: "möchte" }, { he: "קפה", translit: "kafe", de: "Kaffee" } ] },
    { id: "s_mayim_bev",   type: "sentence", he: "אני רוצה מים בבקשה",     niqqud: "אני רוצה מים בבקשה",     translit: "ani rotze mayim bevakasha", de: "Ich möchte Wasser, bitte.",        theme: "cafe", freq: 33,
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "רוצה", translit: "rotze", de: "möchte" }, { he: "מים", translit: "mayim", de: "Wasser" }, { he: "בבקשה", translit: "bevakasha", de: "bitte" } ] },
    { id: "s_eifo_sher",   type: "sentence", he: "איפה השירותים?",         niqqud: "איפה השירותים?",         translit: "eifo ha-sherutim?",         de: "Wo ist die Toilette?",             theme: "directions", freq: 31,
      tokens: [ { he: "איפה", translit: "eifo", de: "wo" }, { he: "השירותים", translit: "ha-sherutim", de: "die Toilette" } ] },
    { id: "s_kama_ole",    type: "sentence", he: "כמה זה עולה?",           niqqud: "כמה זה עולה?",           translit: "kama ze ole?",              de: "Wie viel kostet das?",             theme: "shopping", freq: 32,
      tokens: [ { he: "כמה", translit: "kama", de: "wie viel" }, { he: "זה", translit: "ze", de: "das" }, { he: "עולה", translit: "ole", de: "kostet" } ] },
    { id: "s_ze_yakar",    type: "sentence", he: "זה יקר מאוד",            niqqud: "זה יקר מאוד",            translit: "ze yakar me'od",            de: "Das ist sehr teuer.",              theme: "shopping", freq: 33,
      tokens: [ { he: "זה", translit: "ze", de: "das" }, { he: "יקר", translit: "yakar", de: "teuer" }, { he: "מאוד", translit: "me'od", de: "sehr" } ] },
    { id: "s_ein_kesef",   type: "sentence", he: "אין לי כסף",             niqqud: "אין לי כסף",             translit: "ein li kesef",              de: "Ich habe kein Geld.",              theme: "shopping", freq: 34, note: "wörtl.: es-gibt-nicht mir Geld",
      tokens: [ { he: "אין", translit: "ein", de: "es gibt nicht" }, { he: "לי", translit: "li", de: "mir" }, { he: "כסף", translit: "kesef", de: "Geld" } ] },
    { id: "s_yesh_po",     type: "sentence", he: "יש שירותים פה?",         niqqud: "יש שירותים פה?",         translit: "yesh sherutim po?",         de: "Gibt es hier eine Toilette?",      theme: "directions", freq: 34,
      tokens: [ { he: "יש", translit: "yesh", de: "es gibt" }, { he: "שירותים", translit: "sherutim", de: "Toilette" }, { he: "פה", translit: "po", de: "hier" } ] },
    { id: "s_eifo_tach",   type: "sentence", he: "איפה התחנה?",            niqqud: "איפה התחנה?",            translit: "eifo ha-tachana?",          de: "Wo ist die Haltestelle?",          theme: "transport", freq: 35,
      tokens: [ { he: "איפה", translit: "eifo", de: "wo" }, { he: "התחנה", translit: "ha-tachana", de: "die Haltestelle" } ] },
    { id: "s_rachok_po",   type: "sentence", he: "זה רחוק מפה?",           niqqud: "זה רחוק מפה?",           translit: "ze rachok mi-po?",          de: "Ist das weit von hier?",           theme: "directions", freq: 35,
      tokens: [ { he: "זה", translit: "ze", de: "das" }, { he: "רחוק", translit: "rachok", de: "weit" }, { he: "מפה", translit: "mi-po", de: "von hier" } ] },
    { id: "s_kafe_taim",   type: "sentence", he: "הקפה טעים",              niqqud: "הקפה טעים",              translit: "ha-kafe ta'im",             de: "Der Kaffee ist lecker.",           theme: "cafe", freq: 36,
      tokens: [ { he: "הקפה", translit: "ha-kafe", de: "der Kaffee" }, { he: "טעים", translit: "ta'im", de: "lecker" } ] },
    { id: "s_mi_berlin",   type: "sentence", he: "אני מברלין",             niqqud: "אני מברלין",             translit: "ani mi-Berlin",             de: "Ich komme aus Berlin.",            theme: "self", freq: 32, note: "wörtl.: ich aus-Berlin",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "מברלין", translit: "mi-Berlin", de: "aus Berlin" } ] },
    { id: "s_ohev_falafel",type: "sentence", he: "אני אוהב פלאפל",         niqqud: "אני אוהב פלאפל",         translit: "ani ohev falafel",          de: "Ich mag Falafel.",                 theme: "food", freq: 33, note: "männlich; weiblich: ohevet",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "אוהב", translit: "ohev", de: "mag" }, { he: "פלאפל", translit: "falafel", de: "Falafel" } ] },
    { id: "s_boker_shlom", type: "sentence", he: "בוקר טוב, מה שלומך?",    niqqud: "בוקר טוב, מה שלומך?",    translit: "boker tov, ma shlomcha?",   de: "Guten Morgen, wie geht es dir?",   theme: "greetings", freq: 34,
      tokens: [ { he: "בוקר", translit: "boker", de: "Morgen" }, { he: "טוב", translit: "tov", de: "gut" }, { he: "מה", translit: "ma", de: "wie/was" }, { he: "שלומך", translit: "shlomcha", de: "geht es dir" } ] },
    { id: "s_slicha_eifo", type: "sentence", he: "סליחה, איפה השוק?",      niqqud: "סליחה, איפה השוק?",      translit: "slicha, eifo ha-shuk?",     de: "Entschuldigung, wo ist der Markt?", theme: "shopping", freq: 36,
      tokens: [ { he: "סליחה", translit: "slicha", de: "Entschuldigung" }, { he: "איפה", translit: "eifo", de: "wo" }, { he: "השוק", translit: "ha-shuk", de: "der Markt" } ] },
    { id: "s_kafe_shachor", type: "sentence", he: "הקפה שחור",             niqqud: "הקפה שחור",              translit: "ha-kafe shachor",           de: "Der Kaffee ist schwarz.",          theme: "colors", freq: 37,
      tokens: [ { he: "הקפה", translit: "ha-kafe", de: "der Kaffee" }, { he: "שחור", translit: "shachor", de: "schwarz" } ] },
    { id: "s_yam_kachol",  type: "sentence", he: "הים כחול",               niqqud: "הים כחול",               translit: "ha-yam kachol",             de: "Das Meer ist blau.",               theme: "colors", freq: 37,
      tokens: [ { he: "הים", translit: "ha-yam", de: "das Meer" }, { he: "כחול", translit: "kachol", de: "blau" } ] },
    { id: "s_rotze_glida", type: "sentence", he: "אני רוצה גלידה",         niqqud: "אני רוצה גלידה",         translit: "ani rotze glida",           de: "Ich möchte ein Eis.",              theme: "food", freq: 37,
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "רוצה", translit: "rotze", de: "möchte" }, { he: "גלידה", translit: "glida", de: "Eis" } ] },
    { id: "s_falafel_meod",type: "sentence", he: "הפלאפל טעים מאוד",       niqqud: "הפלאפל טעים מאוד",       translit: "ha-falafel ta'im me'od",    de: "Der Falafel ist sehr lecker.",     theme: "food", freq: 38,
      tokens: [ { he: "הפלאפל", translit: "ha-falafel", de: "der Falafel" }, { he: "טעים", translit: "ta'im", de: "lecker" }, { he: "מאוד", translit: "me'od", de: "sehr" } ] },
    { id: "s_ole_esrim",   type: "sentence", he: "זה עולה עשרים שקל",      niqqud: "זה עולה עשרים שקל",      translit: "ze ole esrim shekel",       de: "Das kostet zwanzig Schekel.",      theme: "numbers2", freq: 38,
      tokens: [ { he: "זה", translit: "ze", de: "das" }, { he: "עולה", translit: "ole", de: "kostet" }, { he: "עשרים", translit: "esrim", de: "zwanzig" }, { he: "שקל", translit: "shekel", de: "Schekel" } ] },
    { id: "s_yesh_kartis", type: "sentence", he: "יש לי כרטיס",            niqqud: "יש לי כרטיס",            translit: "yesh li kartis",            de: "Ich habe ein Ticket.",             theme: "transport", freq: 38, note: "wörtl.: es-gibt mir Ticket",
      tokens: [ { he: "יש", translit: "yesh", de: "es gibt" }, { he: "לי", translit: "li", de: "mir" }, { he: "כרטיס", translit: "kartis", de: "Ticket" } ] },
    { id: "s_eifo_chof",   type: "sentence", he: "איפה החוף?",             niqqud: "איפה החוף?",             translit: "eifo ha-chof?",             de: "Wo ist der Strand?",               theme: "transport", freq: 39,
      tokens: [ { he: "איפה", translit: "eifo", de: "wo" }, { he: "החוף", translit: "ha-chof", de: "der Strand" } ] },
    { id: "s_monit_po",    type: "sentence", he: "המונית פה",              niqqud: "המונית פה",              translit: "ha-monit po",               de: "Das Taxi ist hier.",               theme: "transport", freq: 39,
      tokens: [ { he: "המונית", translit: "ha-monit", de: "das Taxi" }, { he: "פה", translit: "po", de: "hier" } ] },
    { id: "s_ima_aba",     type: "sentence", he: "אמא ואבא פה",            niqqud: "אמא ואבא פה",            translit: "ima ve-aba po",             de: "Mama und Papa sind hier.",         theme: "family", freq: 39,
      tokens: [ { he: "אמא", translit: "ima", de: "Mama" }, { he: "ואבא", translit: "ve-aba", de: "und Papa" }, { he: "פה", translit: "po", de: "hier" } ] },
    { id: "s_ayef_hayom",  type: "sentence", he: "אני עייף היום",          niqqud: "אני עייף היום",          translit: "ani ayef hayom",            de: "Ich bin heute müde.",              theme: "feelings", freq: 39, note: "männlich; weiblich: ayefa",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "עייף", translit: "ayef", de: "müde" }, { he: "היום", translit: "hayom", de: "heute" } ] },
    { id: "s_bira_zola",   type: "sentence", he: "הבירה זולה",             niqqud: "הבירה זולה",             translit: "ha-bira zola",              de: "Das Bier ist billig.",             theme: "food", freq: 40, note: "zol wird weiblich zu zola",
      tokens: [ { he: "הבירה", translit: "ha-bira", de: "das Bier" }, { he: "זולה", translit: "zola", de: "billig (f)" } ] },
    { id: "s_lomed_ivrit", type: "sentence", he: "אני לומד עברית",         niqqud: "אני לומד עברית",         translit: "ani lomed ivrit",           de: "Ich lerne Hebräisch.",             theme: "verbs", freq: 40, note: "männlich; weiblich: lomedet",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "לומד", translit: "lomed", de: "lerne" }, { he: "עברית", translit: "ivrit", de: "Hebräisch" } ] },
    { id: "s_gar_tlv",     type: "sentence", he: "אני גר בתל אביב",        niqqud: "אני גר בתל אביב",        translit: "ani gar be-Tel-Aviv",       de: "Ich wohne in Tel Aviv.",           theme: "verbs", freq: 41, note: "männlich; weiblich: gara",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "גר", translit: "gar", de: "wohne" }, { he: "בתל אביב", translit: "be-Tel-Aviv", de: "in Tel Aviv" } ] },
    { id: "s_medaber_ktsat",type:"sentence", he: "אני מדבר קצת עברית",     niqqud: "אני מדבר קצת עברית",     translit: "ani medaber ktsat ivrit",   de: "Ich spreche ein bisschen Hebräisch.", theme: "verbs", freq: 40, note: "DER Reise-Satz überhaupt",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "מדבר", translit: "medaber", de: "spreche" }, { he: "קצת", translit: "ktsat", de: "ein bisschen" }, { he: "עברית", translit: "ivrit", de: "Hebräisch" } ] },
    { id: "s_marak_salat", type: "sentence", he: "אני רוצה מרק וסלט",      niqqud: "אני רוצה מרק וסלט",      translit: "ani rotze marak ve-salat",  de: "Ich möchte Suppe und Salat.",      theme: "food", freq: 41,
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "רוצה", translit: "rotze", de: "möchte" }, { he: "מרק", translit: "marak", de: "Suppe" }, { he: "וסלט", translit: "ve-salat", de: "und Salat" } ] },
    { id: "s_kos_mayim",   type: "sentence", he: "כוס מים בבקשה",          niqqud: "כוס מים בבקשה",          translit: "kos mayim bevakasha",       de: "Ein Glas Wasser, bitte.",          theme: "food", freq: 40,
      tokens: [ { he: "כוס", translit: "kos", de: "Glas" }, { he: "מים", translit: "mayim", de: "Wasser" }, { he: "בבקשה", translit: "bevakasha", de: "bitte" } ] },
    { id: "s_mi_germanya", type: "sentence", he: "אני מגרמניה",            niqqud: "אני מגרמניה",            translit: "ani mi-germanya",           de: "Ich komme aus Deutschland.",       theme: "self", freq: 32, note: "wörtl.: ich aus-Deutschland",
      tokens: [ { he: "אני", translit: "ani", de: "ich" }, { he: "מגרמניה", translit: "mi-germanya", de: "aus Deutschland" } ] },
    { id: "s_bli_sukar",   type: "sentence", he: "קפה בלי סוכר בבקשה",     niqqud: "קפה בלי סוכר בבקשה",     translit: "kafe bli sukar bevakasha",  de: "Kaffee ohne Zucker, bitte.",       theme: "food", freq: 41,
      tokens: [ { he: "קפה", translit: "kafe", de: "Kaffee" }, { he: "בלי", translit: "bli", de: "ohne" }, { he: "סוכר", translit: "sukar", de: "Zucker" }, { he: "בבקשה", translit: "bevakasha", de: "bitte" } ] },
    { id: "s_efshar_cheshbon", type: "sentence", he: "אפשר חשבון בבקשה",   niqqud: "אפשר חשבון בבקשה",       translit: "efshar cheshbon bevakasha", de: "Die Rechnung, bitte.",             theme: "cafe", freq: 39, note: "wörtl.: möglich Rechnung bitte? – die übliche Art zu bitten",
      tokens: [ { he: "אפשר", translit: "efshar", de: "kann man" }, { he: "חשבון", translit: "cheshbon", de: "Rechnung" }, { he: "בבקשה", translit: "bevakasha", de: "bitte" } ] },
    { id: "s_efshar_mayim", type: "sentence", he: "אפשר מים?",             niqqud: "אפשר מים?",              translit: "efshar mayim?",             de: "Kann ich Wasser haben?",           theme: "cafe", freq: 39,
      tokens: [ { he: "אפשר", translit: "efshar", de: "kann man" }, { he: "מים", translit: "mayim", de: "Wasser" } ] },
    { id: "s_kafe_cham",   type: "sentence", he: "הקפה חם",                niqqud: "הקפה חם",                translit: "ha-kafe cham",              de: "Der Kaffee ist heiß.",             theme: "adjectives", freq: 42,
      tokens: [ { he: "הקפה", translit: "ha-kafe", de: "der Kaffee" }, { he: "חם", translit: "cham", de: "heiß" } ] },
    { id: "s_chof_gadol",  type: "sentence", he: "החוף גדול",              niqqud: "החוף גדול",              translit: "ha-chof gadol",             de: "Der Strand ist groß.",             theme: "adjectives", freq: 42,
      tokens: [ { he: "החוף", translit: "ha-chof", de: "der Strand" }, { he: "גדול", translit: "gadol", de: "groß" } ] }
  ],

  /*
   * Dialoge fuer den Dialog-Modus: kurze Alltagsgespraeche.
   * who: 'partner' (spricht automatisch) | 'me' (Nutzer waehlt die richtige Zeile).
   * itemId verknuepft eine Zeile optional mit einem LernItem (dann zaehlt die
   * Antwort auch fuer dessen SRS-Fortschritt).
   */
  dialogues: [
    {
      id: "cafe", title: "Im Café", emoji: "☕", partner: "Kellner",
      lines: [
        { who: "partner", he: "שלום! מה תרצה?",            translit: "shalom! ma tirtze?",             de: "Hallo! Was möchtest du?" },
        { who: "me",      he: "אני רוצה קפה בבקשה",        translit: "ani rotze kafe bevakasha",       de: "Ich möchte einen Kaffee, bitte.", itemId: "ani_rotze" },
        { who: "partner", he: "עוד משהו?",                 translit: "od mashehu?",                    de: "Noch etwas?" },
        { who: "me",      he: "כן, מים בבקשה",             translit: "ken, mayim bevakasha",           de: "Ja, Wasser bitte.", itemId: "mayim" },
        { who: "partner", he: "בבקשה!",                    translit: "bevakasha!",                     de: "Bitte sehr!" },
        { who: "me",      he: "תודה! חשבון בבקשה",         translit: "toda! cheshbon bevakasha",       de: "Danke! Die Rechnung, bitte.", itemId: "cheshbon" }
      ]
    },
    {
      id: "market", title: "Auf dem Markt", emoji: "🛒", partner: "Verkäufer",
      lines: [
        { who: "partner", he: "בוקר טוב! מה תרצה?",        translit: "boker tov! ma tirtze?",          de: "Guten Morgen! Was möchtest du?" },
        { who: "me",      he: "בוקר טוב! כמה זה עולה?",    translit: "boker tov! kama ze ole?",        de: "Guten Morgen! Wie viel kostet das?", itemId: "kama_ze_ole" },
        { who: "partner", he: "עשרה שקלים",                translit: "asara shkalim",                  de: "Zehn Schekel." },
        { who: "me",      he: "זה יקר!",                   translit: "ze yakar!",                      de: "Das ist teuer!", itemId: "yakar" },
        { who: "partner", he: "בסדר, שמונה שקלים",         translit: "beseder, shmona shkalim",        de: "Okay, acht Schekel." },
        { who: "me",      he: "סבבה, תודה!",               translit: "sababa, toda!",                  de: "Super, danke!", itemId: "sababa" }
      ]
    },
    {
      id: "way", title: "Nach dem Weg fragen", emoji: "🧭", partner: "Passantin",
      lines: [
        { who: "me",      he: "סליחה, איפה השירותים?",     translit: "slicha, eifo ha-sherutim?",      de: "Entschuldigung, wo ist die Toilette?", itemId: "sherutim" },
        { who: "partner", he: "ישר, ואז ימינה",            translit: "yashar, ve-az yamina",           de: "Geradeaus, und dann rechts." },
        { who: "me",      he: "זה קרוב?",                  translit: "ze karov?",                      de: "Ist das nah?", itemId: "karov" },
        { who: "partner", he: "כן, מאוד קרוב",             translit: "ken, me'od karov",               de: "Ja, sehr nah." },
        { who: "me",      he: "תודה רבה!",                 translit: "toda raba!",                     de: "Vielen Dank!", itemId: "toda_raba" },
        { who: "partner", he: "בבקשה, יום טוב!",           translit: "bevakasha, yom tov!",            de: "Bitte, schönen Tag!" }
      ]
    },
    {
      id: "meet", title: "Sich kennenlernen", emoji: "👋", partner: "Noa",
      lines: [
        { who: "partner", he: "שלום! מה שלומך?",           translit: "shalom! ma shlomcha?",           de: "Hallo! Wie geht es dir?" },
        { who: "me",      he: "טוב, תודה! מה שלומך?",      translit: "tov, toda! ma shlomech?",        de: "Gut, danke! Wie geht es dir?", itemId: "tov" },
        { who: "partner", he: "מצוין! איך קוראים לך?",     translit: "metsuyan! eich kor'im lecha?",   de: "Super! Wie heißt du?" },
        { who: "me",      he: "קוראים לי תומס",            translit: "kor'im li Thomas",               de: "Ich heiße Thomas.", itemId: "eich_korim" },
        { who: "partner", he: "נעים מאוד!",                translit: "na'im me'od!",                   de: "Sehr angenehm!" },
        { who: "me",      he: "נעים מאוד! להתראות!",       translit: "na'im me'od! lehitraot!",        de: "Sehr angenehm! Auf Wiedersehen!", itemId: "naim_meod" }
      ]
    },
    {
      id: "taxi", title: "Im Taxi", emoji: "🚕", partner: "Fahrer",
      lines: [
        { who: "partner", he: "שלום! לאן?",               translit: "shalom! le'an?",                 de: "Hallo! Wohin?" },
        { who: "me",      he: "לרחוב הרצל בבקשה",         translit: "le-rechov Herzl bevakasha",      de: "Zur Herzl-Straße, bitte.", itemId: "rechov" },
        { who: "partner", he: "בסדר. עשרים שקל",          translit: "beseder. esrim shekel",          de: "Okay. Zwanzig Schekel." },
        { who: "me",      he: "סבבה. זה רחוק?",           translit: "sababa. ze rachok?",             de: "Okay. Ist das weit?", itemId: "rachok" },
        { who: "partner", he: "לא, עשר דקות",             translit: "lo, eser dakot",                 de: "Nein, zehn Minuten." },
        { who: "me",      he: "תודה רבה!",                translit: "toda raba!",                     de: "Vielen Dank!", itemId: "toda_raba" }
      ]
    },
    {
      id: "restaurant", title: "Im Restaurant", emoji: "🍽️", partner: "Kellnerin",
      lines: [
        { who: "partner", he: "ערב טוב! כמה אתם?",        translit: "erev tov! kama atem?",           de: "Guten Abend! Wie viele seid ihr?" },
        { who: "me",      he: "ערב טוב! שניים בבקשה",     translit: "erev tov! shnayim bevakasha",    de: "Guten Abend! Zwei (Personen), bitte.", itemId: "erev_tov" },
        { who: "partner", he: "בבקשה, התפריט",            translit: "bevakasha, ha-tafrit",           de: "Bitte, die Speisekarte." },
        { who: "me",      he: "תודה. יש פלאפל?",          translit: "toda. yesh falafel?",            de: "Danke. Gibt es Falafel?", itemId: "yesh" },
        { who: "partner", he: "כן, בטח!",                 translit: "ken, betach!",                   de: "Ja, klar!" },
        { who: "me",      he: "מצוין! שניים בבקשה",       translit: "metsuyan! shnayim bevakasha",    de: "Super! Zwei, bitte.", itemId: "falafel" }
      ]
    },
    {
      id: "hotel", title: "Im Hotel", emoji: "🏨", partner: "Rezeption",
      lines: [
        { who: "partner", he: "שלום, ברוכים הבאים!",      translit: "shalom, bruchim haba'im!",       de: "Hallo, herzlich willkommen!" },
        { who: "me",      he: "שלום! יש חדר פנוי?",       translit: "shalom! yesh cheder panui?",     de: "Hallo! Gibt es ein freies Zimmer?", itemId: "panui" },
        { who: "partner", he: "כן. ללילה אחד?",           translit: "ken. le-laila echad?",           de: "Ja. Für eine Nacht?" },
        { who: "me",      he: "כן, לילה אחד",             translit: "ken, laila echad",               de: "Ja, eine Nacht.", itemId: "ken" },
        { who: "partner", he: "חדר מספר עשר",             translit: "cheder mispar eser",             de: "Zimmer Nummer zehn." },
        { who: "me",      he: "תודה! איפה החדר?",         translit: "toda! eifo ha-cheder?",          de: "Danke! Wo ist das Zimmer?", itemId: "eifo" }
      ]
    },
    {
      id: "pharmacy", title: "In der Apotheke", emoji: "💊", partner: "Apothekerin",
      lines: [
        { who: "partner", he: "שלום, מה נשמע?",           translit: "shalom, ma nishma?",             de: "Hallo, wie geht's?" },
        { who: "me",      he: "לא טוב. כואב לי הראש",     translit: "lo tov. ko'ev li ha-rosh",       de: "Nicht gut. Mir tut der Kopf weh.", itemId: "koev" },
        { who: "partner", he: "יש לי תרופה טובה",         translit: "yesh li trufa tova",             de: "Ich habe ein gutes Medikament." },
        { who: "me",      he: "כמה זה עולה?",             translit: "kama ze ole?",                   de: "Wie viel kostet das?", itemId: "kama_ze_ole" },
        { who: "partner", he: "עשרים שקל",                translit: "esrim shekel",                   de: "Zwanzig Schekel." },
        { who: "me",      he: "בסדר, תודה רבה!",          translit: "beseder, toda raba!",            de: "In Ordnung, vielen Dank!", itemId: "beseder" }
      ]
    }
  ]
};

/*
 * Emoji-Zuordnung fuer den Bild-Wort-Modus: nur eindeutig bebilderbare Begriffe.
 * Wird beim Laden auf die Items gemappt (haelt die Item-Definitionen oben schlank).
 */
(function () {
  var EMOJI = {
    // Café & Essen
    mayim: "💧", kafe: "☕", te: "🍵", lechem: "🍞", kesef: "💰", tafrit: "📋", cheshbon: "🧾",
    ochel: "🍽️", falafel: "🧆", chumus: "🥣", salat: "🥗", tapuach: "🍎", banana: "🍌",
    beitsa: "🥚", gvina: "🧀", dag: "🐟", basar: "🥩", of: "🍗", chalav: "🥛", mits: "🧃",
    bira: "🍺", yayin: "🍷", glida: "🍦", uga: "🍰",
    // Unterwegs
    otobus: "🚌", rakevet: "🚆", monit: "🚕", kartis: "🎫", rechov: "🛣️", ir: "🏙️",
    yam: "🌊", chof: "🏖️", malon: "🏨", sde_teufa: "✈️",
    // Menschen & Familie
    mishpacha: "👪", ima: "👩", aba: "👨", yeled: "👦", yalda: "👧", ach: "👬", achot: "👭",
    chaver: "🤝", chavera: "👫", ish: "🧔", isha: "👩‍🦰",
    // Notfall
    rofe: "👨‍⚕️", beit_cholim: "🏥", mishtara: "🚓", trufa: "💊", ezra: "🆘",
    // Richtung
    yamina: "➡️", smola: "⬅️", yashar: "⬆️", po: "📍",
    // Zahlen
    efes: "0️⃣", achat: "1️⃣", shtayim: "2️⃣", shalosh: "3️⃣", arba: "4️⃣", chamesh: "5️⃣",
    shesh: "6️⃣", sheva: "7️⃣", shmone: "8️⃣", tesha: "9️⃣", eser: "🔟",
    // Gefühle & Sonstiges
    tov: "👍", ra: "👎", ayef: "😴", taim: "😋", sababa: "🤙", yofi: "👌", raev: "🍽️",
    shuk: "🧺", chanut: "🏪",
    // Farben
    adom: "🟥", kachol: "🟦", yarok: "🟩", tsahov: "🟨", lavan: "⬜", shachor: "⬛",
    katom: "🟧", varod: "🌸", chum: "🟫",
    // Zahlen & Geld
    mea: "💯", shekel_w: "₪",
    // Verben
    holech: "🚶", shote: "🥤", lomed: "📖", roe: "👀", ohev: "❤️", oved: "💼",
    // Restaurant
    pita: "🫓", shnitzel: "🍖", marak: "🍲", orez: "🍚", tschips: "🍟", mana: "🍛",
    kos: "🥂", bakbuk: "🍾", mazleg: "🍴", sakin: "🔪", kaf_l: "🥄", sukar: "🍬", melach: "🧂",
    // Gegensatz-Paare
    cham: "🔥", kar: "❄️", gadol: "🐘", katan: "🐜", chadash: "✨", yashan: "🏚️",
    maher: "🏎️", le_at: "🐌"
  };
  window.TACHELES_CONTENT.items.forEach(function (it) {
    if (EMOJI[it.id]) it.emoji = EMOJI[it.id];
  });
})();
