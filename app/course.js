/*
 * Tacheles - Kurs-Curriculum (Baender A0 bis C2)
 * Klassisches Script (kein ES-Modul, kein fetch), definiert genau EIN Global:
 *   window.TACHELES_COURSE = { version, sections, lessons }
 *
 * Schema (Vertrag, siehe docs/superpowers/plans/2026-07-19-kurs-umbau-plan.md, C1):
 *   sections: [{ id, title, emoji, band }]            // 16-20, band aufsteigend
 *   lessons:  [{ id, section, title, emoji, band,     // Array-Reihenfolge = Kurs-Reihenfolge
 *                newItemIds: [5-8 Item-IDs],           // JEDES Content-Item in GENAU einer Lektion
 *                scene: {dialogueId} | {lines:[{he,translit,de}]} | null,
 *                grammar: {moduleId, steps:[idx]} | {inline:[...]} | null,
 *                reading: {drill} | null,              // nur fruehe A0-Sektionen
 *                listening: true|false }]
 *
 * Lektions-IDs sind heilig (Kurs-Fortschritt haengt daran): nie umbenennen.
 * Validierung: node tools/validate-course.cjs (muss Exit 0 liefern).
 */
window.TACHELES_COURSE = {
  version: 1,
  sections: [
    {
      id: "sec_a0_erste_worte",
      title: "Erste Worte",
      emoji: "👋",
      band: "A0"
    },
    {
      id: "sec_a0_lesen_zaehlen",
      title: "Lesen & Zählen",
      emoji: "🔤",
      band: "A0"
    },
    {
      id: "sec_a0_unterwegs",
      title: "Unterwegs & Schilder",
      emoji: "🧭",
      band: "A0"
    },
    {
      id: "sec_a0_cafe_alltag",
      title: "Café & Alltag",
      emoji: "☕",
      band: "A0"
    },
    {
      id: "sec_a1_essen_markt",
      title: "Essen & Markt",
      emoji: "🍎",
      band: "A1"
    },
    {
      id: "sec_a1_menschen",
      title: "Menschen & Verben",
      emoji: "👪",
      band: "A1"
    },
    {
      id: "sec_a1_unterwegs2",
      title: "Reisen & Notfall",
      emoji: "🚌",
      band: "A1"
    },
    {
      id: "sec_a1_feinschliff",
      title: "Farben & Feinschliff",
      emoji: "🎨",
      band: "A1"
    },
    {
      id: "sec_a2_arbeit_wohnen",
      title: "Arbeit & Wohnen",
      emoji: "💼",
      band: "A2"
    },
    {
      id: "sec_a2_wetter_hobbys",
      title: "Wetter & Freizeit",
      emoji: "🌤️",
      band: "A2"
    },
    {
      id: "sec_a2_zeiten",
      title: "Gestern & Morgen",
      emoji: "⏳",
      band: "A2"
    },
    {
      id: "sec_b1_meinung_medien",
      title: "Meinung & Medien",
      emoji: "💭",
      band: "B1"
    },
    {
      id: "sec_b1_amt_beziehung",
      title: "Behörden & Beziehungen",
      emoji: "📑",
      band: "B1"
    },
    {
      id: "sec_b2_gesellschaft",
      title: "Gesellschaft & Ideen",
      emoji: "🏛️",
      band: "B2"
    },
    {
      id: "sec_b2_slang_arbeit",
      title: "Slang & Arbeitswelt",
      emoji: "😎",
      band: "B2"
    },
    {
      id: "sec_c1_verhandeln_kultur",
      title: "Verhandeln & Kultur",
      emoji: "🤝",
      band: "C1"
    },
    {
      id: "sec_c1_wissen_gefuehl",
      title: "Wissenschaft & Gefühle",
      emoji: "🔬",
      band: "C1"
    },
    {
      id: "sec_c2_rhetorik_ironie",
      title: "Rhetorik & Ironie",
      emoji: "🗣️",
      band: "C2"
    },
    {
      id: "sec_c2_recht_idiome",
      title: "Recht & Idiome",
      emoji: "📜",
      band: "C2"
    }
  ],
  lessons: [
    {
      id: "l_a0_01",
      section: "sec_a0_erste_worte",
      title: "Die ersten Worte",
      emoji: "👋",
      band: "A0",
      newItemIds: ["shalom", "ken", "lo", "toda", "bevakasha", "slicha"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_02",
      section: "sec_a0_erste_worte",
      title: "Begrüßen & Verabschieden",
      emoji: "🙋",
      band: "A0",
      newItemIds: ["boker_tov", "lehitraot", "bay", "toda_raba", "erev_tov", "beseder"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_genus",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a0_03",
      section: "sec_a0_erste_worte",
      title: "Wie geht's?",
      emoji: "😊",
      band: "A0",
      newItemIds: ["laila_tov", "ma_shlomcha", "ma_shlomech", "lo_mevin", "lo_mevina", "efshar"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_04",
      section: "sec_a0_erste_worte",
      title: "Höflich bleiben",
      emoji: "🙏",
      band: "A0",
      newItemIds: ["leat_bevakasha", "ein_baaya", "naim_meod", "medaber_anglit", "mazal_tov", "s_boker_shlom"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_artikel",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a0_05",
      section: "sec_a0_erste_worte",
      title: "Ich & Du",
      emoji: "🧑",
      band: "A0",
      newItemIds: ["ani", "at", "ata", "hi", "hu", "shem"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_pronomen",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a0_06",
      section: "sec_a0_erste_worte",
      title: "Wer bist du?",
      emoji: "🪪",
      band: "A0",
      newItemIds: ["eich_korim", "ivrit", "ktsat", "germanya", "s_mi_berlin", "s_mi_germanya"],
      scene: {
        dialogueId: "meet"
      },
      grammar: {
        moduleId: "mod_gram_pronomen",
        steps: [3, 4, 5]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a0_07",
      section: "sec_a0_erste_worte",
      title: "Wie fühlst du dich?",
      emoji: "🙂",
      band: "A0",
      newItemIds: ["tov", "ra", "sababa", "taim", "ayef", "raev", "yofi", "s_ayef_hayom"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_genus",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a0_08",
      section: "sec_a0_lesen_zaehlen",
      title: "Die ersten Buchstaben",
      emoji: "🔤",
      band: "A0",
      newItemIds: ["let_lamed", "let_shin", "let_bet", "let_mem", "let_mem_s", "let_tav", "let_alef"],
      scene: null,
      grammar: null,
      reading: {
        drill: "drill_a0_01"
      },
      listening: false
    },
    {
      id: "l_a0_09",
      section: "sec_a0_lesen_zaehlen",
      title: "Mehr Buchstaben",
      emoji: "🔡",
      band: "A0",
      newItemIds: ["let_dalet", "let_he", "let_kaf", "let_nun", "let_nun_s", "let_vav", "let_qof"],
      scene: null,
      grammar: null,
      reading: {
        drill: "drill_a0_02"
      },
      listening: false
    },
    {
      id: "l_a0_10",
      section: "sec_a0_lesen_zaehlen",
      title: "Buchstaben & Laute",
      emoji: "✍️",
      band: "A0",
      newItemIds: ["let_yod", "let_ayin", "let_chet", "let_resh", "let_pe", "let_tet", "let_zayin"],
      scene: null,
      grammar: null,
      reading: {
        drill: "drill_a0_03"
      },
      listening: false
    },
    {
      id: "l_a0_11",
      section: "sec_a0_lesen_zaehlen",
      title: "Endformen der Buchstaben",
      emoji: "🔠",
      band: "A0",
      newItemIds: ["let_gimel", "let_samech", "let_tsadi", "let_kaf_s", "let_pe_s", "let_tsadi_s"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_artikel",
        steps: [3, 4]
      },
      reading: {
        drill: "drill_a0_04"
      },
      listening: false
    },
    {
      id: "l_a0_12",
      section: "sec_a0_lesen_zaehlen",
      title: "Zählen bis sechs",
      emoji: "🔢",
      band: "A0",
      newItemIds: ["achat", "shtayim", "shalosh", "arba", "chamesh", "shesh"],
      scene: null,
      grammar: null,
      reading: {
        drill: "drill_a0_05"
      },
      listening: true
    },
    {
      id: "l_a0_13",
      section: "sec_a0_lesen_zaehlen",
      title: "Zählen bis zehn",
      emoji: "🔟",
      band: "A0",
      newItemIds: ["efes", "sheva", "shmone", "tesha", "eser"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_genus",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a0_14",
      section: "sec_a0_unterwegs",
      title: "Schilder lesen",
      emoji: "🪧",
      band: "A0",
      newItemIds: ["sherutim", "knisa", "yetsia", "patuach", "sagur", "tachana", "dchof"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_artikel",
        steps: [5, 6]
      },
      reading: {
        drill: "drill_a0_06"
      },
      listening: true
    },
    {
      id: "l_a0_15",
      section: "sec_a0_unterwegs",
      title: "Achtung, Vorsicht!",
      emoji: "⚠️",
      band: "A0",
      newItemIds: ["mshoch", "asur_leashen", "sakana", "atsor", "ein_knisa", "zehirut"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_16",
      section: "sec_a0_unterwegs",
      title: "Schilder im Alltag",
      emoji: "🅿️",
      band: "A0",
      newItemIds: ["chanaya", "kupa", "mivtsa", "kasher", "panui", "tafus"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_17",
      section: "sec_a0_unterwegs",
      title: "Links, rechts, geradeaus",
      emoji: "🧭",
      band: "A0",
      newItemIds: ["po", "sham", "smola", "yamina", "yashar"],
      scene: {
        dialogueId: "way"
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_18",
      section: "sec_a0_unterwegs",
      title: "Nah oder weit?",
      emoji: "📍",
      band: "A0",
      newItemIds: ["karov", "rachok", "s_eifo_sher", "s_yesh_po", "s_rachok_po"],
      scene: null,
      grammar: null,
      reading: {
        drill: "drill_a0_07"
      },
      listening: true
    },
    {
      id: "l_a0_19",
      section: "sec_a0_unterwegs",
      title: "Fragewörter",
      emoji: "❓",
      band: "A0",
      newItemIds: ["ma", "eifo", "mi", "kama", "matai", "s_ma_ze"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_fragen",
        steps: [0, 1, 2]
      },
      reading: {
        drill: "drill_a0_08"
      },
      listening: true
    },
    {
      id: "l_a0_20",
      section: "sec_a0_cafe_alltag",
      title: "Im Café bestellen",
      emoji: "☕",
      band: "A0",
      newItemIds: ["mayim", "kafe", "te", "lechem", "ani_rotza", "ani_rotze"],
      scene: {
        dialogueId: "cafe"
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_21",
      section: "sec_a0_cafe_alltag",
      title: "Bezahlen & Rechnung",
      emoji: "🧾",
      band: "A0",
      newItemIds: ["cheshbon", "kama_ze_ole", "kesef", "tafrit", "beteavon", "lechaim"],
      scene: {
        dialogueId: "restaurant"
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_22",
      section: "sec_a0_cafe_alltag",
      title: "Café-Sätze",
      emoji: "💬",
      band: "A0",
      newItemIds: ["s_ani_kafe", "s_mayim_bev", "s_kafe_taim", "s_efshar_cheshbon", "s_efshar_mayim"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_23",
      section: "sec_a0_cafe_alltag",
      title: "Zeit & Tage",
      emoji: "🕐",
      band: "A0",
      newItemIds: ["yom", "achshav", "hayom", "machar", "etmol", "shavua", "shabat"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a0_24",
      section: "sec_a0_cafe_alltag",
      title: "Die Wochentage",
      emoji: "📅",
      band: "A0",
      newItemIds: ["yom_rishon", "yom_sheni", "yom_shlishi", "yom_revii", "yom_chamishi", "yom_shishi"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_01",
      section: "sec_a1_essen_markt",
      title: "Essen & Trinken",
      emoji: "🍽️",
      band: "A1",
      newItemIds: ["ochel", "chumus", "falafel", "bira", "chalav", "glida", "pita"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_praesens",
        steps: [0, 1, 3]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_02",
      section: "sec_a1_essen_markt",
      title: "Auf dem Teller",
      emoji: "🥗",
      band: "A1",
      newItemIds: ["salat", "beitsa", "gvina", "mits", "shnitzel", "tapuach"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_03",
      section: "sec_a1_essen_markt",
      title: "Mehr Lebensmittel",
      emoji: "🍗",
      band: "A1",
      newItemIds: ["tschips", "yayin", "banana", "basar", "dag", "kos"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_praesens",
        steps: [4, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_04",
      section: "sec_a1_essen_markt",
      title: "Speisen & Portionen",
      emoji: "🍲",
      band: "A1",
      newItemIds: ["marak", "of", "orez", "uga", "bakbuk", "mana"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_05",
      section: "sec_a1_essen_markt",
      title: "Am Tisch",
      emoji: "🍴",
      band: "A1",
      newItemIds: ["melach", "sukar", "kaf_l", "mazleg", "sakin", "s_ohev_falafel"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_besitz",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_06",
      section: "sec_a1_essen_markt",
      title: "Essen bestellen",
      emoji: "💬",
      band: "A1",
      newItemIds: ["s_rotze_glida", "s_falafel_meod", "s_bira_zola", "s_kos_mayim", "s_bli_sukar", "s_marak_salat"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_07",
      section: "sec_a1_essen_markt",
      title: "Es gibt, es gibt nicht",
      emoji: "🛒",
      band: "A1",
      newItemIds: ["ze", "ein", "yesh", "od", "hakol", "yakar", "zol"],
      scene: {
        dialogueId: "market"
      },
      grammar: {
        moduleId: "mod_gram_besitz",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_08",
      section: "sec_a1_essen_markt",
      title: "Auf dem Markt",
      emoji: "🏪",
      band: "A1",
      newItemIds: ["chanut", "shuk", "s_kama_ole", "s_ze_yakar", "s_ein_kesef", "s_slicha_eifo"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_09",
      section: "sec_a1_menschen",
      title: "Familie & Freunde",
      emoji: "👪",
      band: "A1",
      newItemIds: ["chaver", "chavera", "aba", "ima", "ish", "isha"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_plural",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_10",
      section: "sec_a1_menschen",
      title: "Die ganze Familie",
      emoji: "👨‍👩‍👧",
      band: "A1",
      newItemIds: ["mishpacha", "yalda", "yeled", "ach", "achot", "s_ima_aba"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_pronomen",
        steps: [6, 7, 8]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_11",
      section: "sec_a1_menschen",
      title: "Verben im Alltag",
      emoji: "🏃",
      band: "A1",
      newItemIds: ["ba", "holech", "medaber", "ohev", "gar", "lomed", "ochel_v", "shote"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_praesens",
        steps: [2, 5, 8]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_12",
      section: "sec_a1_menschen",
      title: "Was ich tue",
      emoji: "🗣️",
      band: "A1",
      newItemIds: ["yodea", "oved", "roe", "shomea", "s_lomed_ivrit", "s_medaber_ktsat", "s_gar_tlv"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_fragen",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_13",
      section: "sec_a1_unterwegs2",
      title: "Bus, Taxi & Zug",
      emoji: "🚕",
      band: "A1",
      newItemIds: ["lean", "otobus", "rechov", "malon", "monit", "rakevet"],
      scene: {
        dialogueId: "taxi"
      },
      grammar: {
        moduleId: "mod_gram_plural",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_14",
      section: "sec_a1_unterwegs2",
      title: "Reisen & Tickets",
      emoji: "🎫",
      band: "A1",
      newItemIds: ["yam", "chof", "ir", "kartis", "sde_teufa", "s_eifo_tach", "s_yesh_kartis", "s_eifo_chof"],
      scene: {
        dialogueId: "hotel"
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_15",
      section: "sec_a1_unterwegs2",
      title: "Hilfe rufen",
      emoji: "🆘",
      band: "A1",
      newItemIds: ["ezra", "hatsilu", "mishtara", "s_monit_po", "beit_cholim"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_fragen",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_16",
      section: "sec_a1_unterwegs2",
      title: "Beim Arzt",
      emoji: "🚑",
      band: "A1",
      newItemIds: ["koev", "rofe", "trufa", "beit_mirkachat", "chole"],
      scene: {
        dialogueId: "pharmacy"
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_17",
      section: "sec_a1_feinschliff",
      title: "Farben",
      emoji: "🎨",
      band: "A1",
      newItemIds: ["adom", "kachol", "lavan", "shachor", "tsahov", "yarok"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_plural",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_18",
      section: "sec_a1_feinschliff",
      title: "Mehr Farben",
      emoji: "🌈",
      band: "A1",
      newItemIds: ["katom", "varod", "afor", "chum", "s_kafe_shachor", "s_yam_kachol"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_19",
      section: "sec_a1_feinschliff",
      title: "Kleine Wörter",
      emoji: "🔗",
      band: "A1",
      newItemIds: ["aval", "gam", "bli", "im_mit", "o", "rak"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_fragen",
        steps: [7, 8]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_20",
      section: "sec_a1_feinschliff",
      title: "Mehr kleine Wörter",
      emoji: "➕",
      band: "A1",
      newItemIds: ["betach", "ki", "ulai", "adain", "kvar", "gadol", "s_chof_gadol"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_21",
      section: "sec_a1_feinschliff",
      title: "Gegensätze",
      emoji: "⚖️",
      band: "A1",
      newItemIds: ["katan", "cham", "kar", "le_at", "chadash", "maher", "yashan", "s_kafe_cham"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_besitz",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a1_22",
      section: "sec_a1_feinschliff",
      title: "Zahlen bis zwanzig",
      emoji: "🔢",
      band: "A1",
      newItemIds: ["achat_esre", "shtem_esre", "esrim", "mea", "shekel_w"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_23",
      section: "sec_a1_feinschliff",
      title: "Zahlen bis fünfzig",
      emoji: "🔢",
      band: "A1",
      newItemIds: ["shlosh_esre", "arba_esre", "chamesh_esre", "shloshim", "chamishim"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a1_24",
      section: "sec_a1_feinschliff",
      title: "Zahlen & Geld",
      emoji: "💯",
      band: "A1",
      newItemIds: ["arbaim", "elef_num", "shishim", "shivim", "shmonim", "tishim", "s_ole_esrim"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a2_01",
      section: "sec_a2_arbeit_wohnen",
      title: "Arbeit & Beruf",
      emoji: "💼",
      band: "A2",
      newItemIds: ["avoda", "miktsoa", "misrad", "menahel", "chevra", "lakoach", "pgisha"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_vergangenheit",
        steps: [0, 1, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_02",
      section: "sec_a2_arbeit_wohnen",
      title: "Im Büro",
      emoji: "🏢",
      band: "A2",
      newItemIds: ["yeshiva_w", "proyekt", "mesima", "maskoret", "chufsha", "reayon"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a2_03",
      section: "sec_a2_arbeit_wohnen",
      title: "Bewerbung & Technik",
      emoji: "💻",
      band: "A2",
      newItemIds: ["korot_chaim", "machshev", "telefon", "email", "mumche", "s_oved_misrad"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_zukunft",
        steps: [0, 1, 3]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_04",
      section: "sec_a2_arbeit_wohnen",
      title: "Wohnung & Zimmer",
      emoji: "🏠",
      band: "A2",
      newItemIds: ["bayit", "dira", "cheder", "mitbach", "ambatya", "salon", "delet"],
      scene: {
        dialogueId: "apartment"
      },
      grammar: {
        moduleId: "mod_gram_praepositionen",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_05",
      section: "sec_a2_arbeit_wohnen",
      title: "Möbel",
      emoji: "🪑",
      band: "A2",
      newItemIds: ["chalon", "shulchan", "kise", "mita", "aron", "mekarer"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a2_06",
      section: "sec_a2_arbeit_wohnen",
      title: "Zuhause",
      emoji: "🔑",
      band: "A2",
      newItemIds: ["sapa", "mafteach", "shachen", "shchirut", "male", "rek"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_adjektiv",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_07",
      section: "sec_a2_wetter_hobbys",
      title: "Wetter",
      emoji: "🌤️",
      band: "A2",
      newItemIds: ["mezeg_avir", "shemesh", "geshem", "anan", "ruach", "sheleg", "shamayim"],
      scene: {
        dialogueId: "weather_chat"
      },
      grammar: {
        moduleId: "mod_gram_vergangenheit",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_08",
      section: "sec_a2_wetter_hobbys",
      title: "Natur & Jahreszeiten",
      emoji: "🌳",
      band: "A2",
      newItemIds: ["chom", "kor", "etz", "perach", "har", "nahar", "kayitz"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_zukunft",
        steps: [4, 5]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_09",
      section: "sec_a2_wetter_hobbys",
      title: "Wetter & Klima",
      emoji: "☔",
      band: "A2",
      newItemIds: ["choref", "stav", "aviv", "ratuv", "yavesh", "s_hayom_cham"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a2_10",
      section: "sec_a2_wetter_hobbys",
      title: "Hobbys & Sport",
      emoji: "⚽",
      band: "A2",
      newItemIds: ["tachbiv", "sport", "kaduregel", "muzika", "seret", "sefer"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_praepositionen",
        steps: [3, 4, 5]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_11",
      section: "sec_a2_wetter_hobbys",
      title: "Freizeit",
      emoji: "🎨",
      band: "A2",
      newItemIds: ["shir", "mischak", "tsiyur", "ritsa", "sechiya", "tiyul"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_adjektiv",
        steps: [3, 4, 5]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_12",
      section: "sec_a2_wetter_hobbys",
      title: "Ausgehen",
      emoji: "🎭",
      band: "A2",
      newItemIds: ["mesiba", "rikud", "tsilum", "bishul", "teatron", "muzeon"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_a2_13",
      section: "sec_a2_zeiten",
      title: "Gestern",
      emoji: "⏮️",
      band: "A2",
      newItemIds: ["hayiti", "halachti", "amarti", "raiti", "achalti", "shatiti"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_vergangenheit",
        steps: [2, 3, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_14",
      section: "sec_a2_zeiten",
      title: "Was war & was kommt",
      emoji: "🔄",
      band: "A2",
      newItemIds: ["kaniti", "avadti", "ratsiti", "elech", "eshte", "avo"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_zukunft",
        steps: [2, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_a2_15",
      section: "sec_a2_zeiten",
      title: "Morgen",
      emoji: "⏭️",
      band: "A2",
      newItemIds: ["ekne", "yihye", "shavua_avar", "shavua_haba", "s_etmol_yam"],
      scene: {
        lines: [
          {
            he: "מחר יהיה גשם",
            translit: "machar yihye geshem",
            de: "Morgen wird es regnen."
          },
          {
            he: "טוב, אנחנו צריכים גשם",
            translit: "tov, anachnu tsrichim geshem",
            de: "Gut, wir brauchen Regen."
          }
        ]
      },
      grammar: {
        moduleId: "mod_gram_praepositionen",
        steps: [6, 7, 8]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_01",
      section: "sec_b1_meinung_medien",
      title: "Meinung sagen",
      emoji: "💭",
      band: "B1",
      newItemIds: ["dea", "choshev", "maskim", "neged", "bishvil", "batuach", "kanire"],
      scene: {
        dialogueId: "opinion_talk"
      },
      grammar: {
        moduleId: "mod_gram_binjanim",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_02",
      section: "sec_b1_meinung_medien",
      title: "Diskutieren",
      emoji: "🗣️",
      band: "B1",
      newItemIds: ["ledaati", "beemet", "nachon", "taut", "beaya", "pitaron", "siba"],
      scene: {
        dialogueId: "job_talk"
      },
      grammar: {
        moduleId: "mod_gram_et",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_03",
      section: "sec_b1_meinung_medien",
      title: "Recht haben & streiten",
      emoji: "⚖️",
      band: "B1",
      newItemIds: ["dugma", "vikuach", "chashuv", "muzar", "efshari", "s_ledaati_nachon"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_smichut",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_04",
      section: "sec_b1_meinung_medien",
      title: "Nachrichten & Medien",
      emoji: "📰",
      band: "B1",
      newItemIds: ["chadashot", "iton", "televizya", "radyo", "internet", "maamar"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_binjanim",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_05",
      section: "sec_b1_meinung_medien",
      title: "Online & Werbung",
      emoji: "📱",
      band: "B1",
      newItemIds: ["katava", "pirsomet", "sirton", "reshet_chevratit", "hodaa", "mismach"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_et",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_06",
      section: "sec_b1_meinung_medien",
      title: "Sendungen",
      emoji: "📺",
      band: "B1",
      newItemIds: ["tmuna", "idkun", "arutz", "shidur", "magish"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_b1_07",
      section: "sec_b1_amt_beziehung",
      title: "Ämter & Papiere",
      emoji: "📑",
      band: "B1",
      newItemIds: ["teuda", "teudat_zehut", "darkon", "tofes", "bakasha", "ishur"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_smichut",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_08",
      section: "sec_b1_amt_beziehung",
      title: "Behördengänge",
      emoji: "🏛️",
      band: "B1",
      newItemIds: ["chatima", "tor", "pakid", "mas", "bituach", "bituach_leumi"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_et",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_09",
      section: "sec_b1_amt_beziehung",
      title: "Amtssprache",
      emoji: "📝",
      band: "B1",
      newItemIds: ["cheshbon_bank", "rishayon", "ashra", "knas", "iriya"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_binjanim",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_10",
      section: "sec_b1_amt_beziehung",
      title: "Gefühle",
      emoji: "💞",
      band: "B1",
      newItemIds: ["ahava", "regesh", "atsuv", "sameach", "koes", "mefached", "mitragesh"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_smichut",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b1_11",
      section: "sec_b1_amt_beziehung",
      title: "Beziehungen",
      emoji: "💑",
      band: "B1",
      newItemIds: ["boded", "zug", "chatuna", "nasui", "garush", "ravak", "neshika"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_b1_12",
      section: "sec_b1_amt_beziehung",
      title: "Liebe & Freundschaft",
      emoji: "❤️",
      band: "B1",
      newItemIds: ["chibuk", "gaagua", "kina", "yedidut", "emun", "s_ohev_otach"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_b2_01",
      section: "sec_b2_gesellschaft",
      title: "Gesellschaft & Politik",
      emoji: "🏛️",
      band: "B2",
      newItemIds: ["chevra_soc", "memshala", "politika", "bchirot", "medina", "ezrach", "zchuyot", "chok"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_passiv",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_02",
      section: "sec_b2_gesellschaft",
      title: "Staat & Recht",
      emoji: "⚖️",
      band: "B2",
      newItemIds: ["mishpat", "shofet", "milchama", "shvita", "hafgana", "kalkala", "miut", "rov"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_konditional",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_03",
      section: "sec_b2_gesellschaft",
      title: "Ideen & Wahrheit",
      emoji: "🧠",
      band: "B2",
      newItemIds: ["raayon", "machshava", "emet", "sheker", "chofesh", "tikva"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_relativ",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_04",
      section: "sec_b2_gesellschaft",
      title: "Ziele & Träume",
      emoji: "💡",
      band: "B2",
      newItemIds: ["matara", "chalom", "zikaron", "yeda", "chochma", "koach"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_passiv",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_05",
      section: "sec_b2_gesellschaft",
      title: "Einfach oder schwer",
      emoji: "🎚️",
      band: "B2",
      newItemIds: ["shinui", "mashmaut", "mesubach", "pashut", "kal", "kaved"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_konditional",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_06",
      section: "sec_b2_slang_arbeit",
      title: "Slang, den alle sagen",
      emoji: "😎",
      band: "B2",
      newItemIds: ["achla", "yalla", "walla", "stam", "chaval_zman", "eize_basa"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_relativ",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_07",
      section: "sec_b2_slang_arbeit",
      title: "Noch mehr Slang",
      emoji: "🤙",
      band: "B2",
      newItemIds: ["dai", "nu", "magniv", "sof_haderech", "al_hapanim", "ein_matzav"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_konditional",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_08",
      section: "sec_b2_slang_arbeit",
      title: "Slang-Perlen",
      emoji: "💎",
      band: "B2",
      newItemIds: ["tachles", "beseder_gamur", "mabsut", "sof_sof", "s_yalla_nelech"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_passiv",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_09",
      section: "sec_b2_slang_arbeit",
      title: "Startup & Geld",
      emoji: "📈",
      band: "B2",
      newItemIds: ["yazamut", "yazam", "startap", "hashkaa", "hefsed", "revach"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_relativ",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_b2_10",
      section: "sec_b2_slang_arbeit",
      title: "Budget & Team",
      emoji: "💰",
      band: "B2",
      newItemIds: ["taktziv", "mimun", "yaad", "tafkid", "kidum", "tsevet"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_b2_11",
      section: "sec_b2_slang_arbeit",
      title: "Druck & Qualität",
      emoji: "⚡",
      band: "B2",
      newItemIds: ["lachatz", "eichut", "yeilut", "tacharut", "hizdamnut"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c1_01",
      section: "sec_c1_verhandeln_kultur",
      title: "Verhandeln",
      emoji: "🤝",
      band: "C1",
      newItemIds: ["masa_umatan", "hatsaa", "drisha", "vitur", "pshara", "heskem"],
      scene: {
        dialogueId: "salary_talk"
      },
      grammar: {
        moduleId: "mod_gram_hitpael",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c1_02",
      section: "sec_c1_verhandeln_kultur",
      title: "Vertrag & Bedingungen",
      emoji: "📄",
      band: "C1",
      newItemIds: ["choze", "tnai", "saif", "hitchayvut", "shituf_peula", "yitaron"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_register",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c1_03",
      section: "sec_c1_verhandeln_kultur",
      title: "Feilschen & Fristen",
      emoji: "⏰",
      band: "C1",
      newItemIds: ["chisaron", "samchut", "mikuach", "temura", "moed_acharon", "s_masa_heskem"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_hitpael",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c1_04",
      section: "sec_c1_verhandeln_kultur",
      title: "Kultur & Literatur",
      emoji: "🎭",
      band: "C1",
      newItemIds: ["tarbut", "sifrut", "sofer", "meshorer", "shira", "roman"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_register",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c1_05",
      section: "sec_c1_verhandeln_kultur",
      title: "Geschichten & Figuren",
      emoji: "📖",
      band: "C1",
      newItemIds: ["sipur", "alila", "dmut", "yetsira", "oman", "tsayar"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c1_06",
      section: "sec_c1_verhandeln_kultur",
      title: "Kunst & Kritik",
      emoji: "🖼️",
      band: "C1",
      newItemIds: ["pesel", "taarucha", "kahal", "bikoret", "hashpaa", "s_sefer_hishpia"],
      scene: {
        lines: [
          {
            he: "הספר הזה השפיע עליי מאוד",
            translit: "ha-sefer ha-ze hishpia alai me'od",
            de: "Dieses Buch hat mich sehr beeinflusst."
          },
          {
            he: "באמת?",
            translit: "be'emet?",
            de: "Wirklich?"
          }
        ]
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c1_07",
      section: "sec_c1_wissen_gefuehl",
      title: "Wissenschaft & Forschung",
      emoji: "🔬",
      band: "C1",
      newItemIds: ["mada", "mechkar", "nisui", "madaan", "teorya", "gilui", "hamtsaa"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_hitpael",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c1_08",
      section: "sec_c1_wissen_gefuehl",
      title: "Technik & Daten",
      emoji: "💻",
      band: "C1",
      newItemIds: ["tofaa", "technologya", "pituach", "netunim", "tochna", "chumra"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_register",
        steps: [5, 6]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c1_09",
      section: "sec_c1_wissen_gefuehl",
      title: "Umwelt & Zukunft",
      emoji: "🌍",
      band: "C1",
      newItemIds: ["manganon", "taasiya", "sviva", "hitpatchut", "bina_melachutit", "s_mechkar_gila"],
      scene: {
        lines: [
          {
            he: "המחקר גילה תופעה חדשה",
            translit: "ha-mechkar gila tofa'a chadasha",
            de: "Die Studie entdeckte ein neues Phänomen."
          },
          {
            he: "באמת?",
            translit: "be'emet?",
            de: "Wirklich?"
          }
        ]
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c1_10",
      section: "sec_c1_wissen_gefuehl",
      title: "Gefühle im Detail",
      emoji: "💗",
      band: "C1",
      newItemIds: ["tiskul", "achzava", "hargasha", "charata", "ashma", "busha"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c1_11",
      section: "sec_c1_wissen_gefuehl",
      title: "Stolz & Respekt",
      emoji: "🙏",
      band: "C1",
      newItemIds: ["gaava", "kavod", "hakarat_toda", "empatya", "rachamim", "hitragshut"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c1_12",
      section: "sec_c1_wissen_gefuehl",
      title: "Innere Ruhe",
      emoji: "🧘",
      band: "C1",
      newItemIds: ["shalva", "metach", "kavana", "kirva", "neemanut", "s_margish_gaava"],
      scene: {
        lines: [
          {
            he: "אני מרגיש גאווה גדולה",
            translit: "ani margish ga'ava gdola",
            de: "Ich empfinde großen Stolz."
          },
          {
            he: "כן, נכון",
            translit: "ken, nachon",
            de: "Ja, das stimmt."
          }
        ]
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c2_01",
      section: "sec_c2_rhetorik_ironie",
      title: "Reden & Überzeugen",
      emoji: "🗣️",
      band: "C2",
      newItemIds: ["neum", "tguva", "taana", "shichnua", "manhig", "shilton"],
      scene: {
        lines: [
          {
            he: "הנאום שלו שכנע את הקהל",
            translit: "ha-ne'um shelo shichnea et ha-kahal",
            de: "Seine Rede überzeugte das Publikum."
          },
          {
            he: "באמת?",
            translit: "be'emet?",
            de: "Wirklich?"
          }
        ]
      },
      grammar: {
        moduleId: "mod_gram_gehoben",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c2_02",
      section: "sec_c2_rhetorik_ironie",
      title: "Politik & Macht",
      emoji: "🏛️",
      band: "C2",
      newItemIds: ["opozitsya", "koalitsya", "mediniyut", "reforma", "hatsbaa", "taamula"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_syntax",
        steps: [0, 1, 2]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c2_03",
      section: "sec_c2_rhetorik_ironie",
      title: "Rhetorik",
      emoji: "📣",
      band: "C2",
      newItemIds: ["demagogya", "retorika", "meser", "hasata", "s_neum_shichnea"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_gehoben",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c2_04",
      section: "sec_c2_rhetorik_ironie",
      title: "Ironie & Humor",
      emoji: "😏",
      band: "C2",
      newItemIds: ["ironya", "sarkazm", "tsiniyut", "humor", "bdicha", "liglug", "mischak_milim", "remez"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_syntax",
        steps: [3, 4]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c2_05",
      section: "sec_c2_rhetorik_ironie",
      title: "Sarkasmus & Wortspiel",
      emoji: "🎭",
      band: "C2",
      newItemIds: ["kinui", "hagzama", "mashmaut_kfula", "parodya", "satira", "davka", "kivyachol", "s_kivyachol_mumche"],
      scene: {
        lines: [
          {
            he: "הוא כביכול מומחה גדול",
            translit: "hu kivyachol mumche gadol",
            de: "Er ist angeblich ein großer Experte."
          },
          {
            he: "באמת?",
            translit: "be'emet?",
            de: "Wirklich?"
          }
        ]
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c2_06",
      section: "sec_c2_recht_idiome",
      title: "Recht & Gesetz",
      emoji: "📜",
      band: "C2",
      newItemIds: ["takanon", "takana", "chukika", "din", "orech_din", "tviaa"],
      scene: {
        dialogueId: "contract_talk"
      },
      grammar: {
        moduleId: "mod_gram_gehoben",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c2_07",
      section: "sec_c2_recht_idiome",
      title: "Urteil & Berufung",
      emoji: "⚖️",
      band: "C2",
      newItemIds: ["psak_din", "irur", "hafara", "pitsui", "chova", "zchut"],
      scene: null,
      grammar: {
        moduleId: "mod_gram_syntax",
        steps: [5, 6, 7]
      },
      reading: null,
      listening: true
    },
    {
      id: "l_c2_08",
      section: "sec_c2_recht_idiome",
      title: "Verträge",
      emoji: "✍️",
      band: "C2",
      newItemIds: ["tokef", "nispach", "chatum", "mechayev", "s_chatmu_choze"],
      scene: {
        lines: [
          {
            he: "שני הצדדים חתמו על החוזה",
            translit: "shnei ha-tsdadim chatmu al ha-choze",
            de: "Beide Seiten unterschrieben den Vertrag."
          },
          {
            he: "החוזה מחייב את שני הצדדים",
            translit: "ha-choze mechayev et shnei ha-tsdadim",
            de: "Der Vertrag verpflichtet beide Seiten."
          }
        ]
      },
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c2_09",
      section: "sec_c2_recht_idiome",
      title: "Feine Redewendungen",
      emoji: "🎩",
      band: "C2",
      newItemIds: ["lav_davka", "af_al_pi_ken", "lemaase", "mikol_makom", "beikar", "achen"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c2_10",
      section: "sec_c2_recht_idiome",
      title: "Gehobene Idiome",
      emoji: "📚",
      band: "C2",
      newItemIds: ["lefichach", "al_kotso", "ein_navi", "harei", "bilti_efshari", "chad_paami"],
      scene: null,
      grammar: null,
      reading: null,
      listening: true
    },
    {
      id: "l_c2_11",
      section: "sec_c2_recht_idiome",
      title: "Register & Nuancen",
      emoji: "🧐",
      band: "C2",
      newItemIds: ["mishum_kach", "kelomar", "muchlat", "zot_omeret", "s_lemaase_tsadak"],
      scene: {
        lines: [
          {
            he: "למעשה, הוא צדק לגמרי",
            translit: "lema'ase, hu tsadak legamrei",
            de: "Tatsächlich hatte er völlig recht."
          },
          {
            he: "אתה צודק, זו בעיה",
            translit: "ata tsodek, zo be'aya",
            de: "Du hast recht, das ist ein Problem."
          }
        ]
      },
      grammar: null,
      reading: null,
      listening: true
    }
  ]
};
