/*
 * Tacheles - Wissens-Haeppchen (Sprach- & Kulturwissen, alle Baender)
 * Klassisches Script, definiert genau EIN Global:
 *   window.TACHELES_SNACKS = { version, snacks }
 *
 * Schema (Vertrag C2): snacks: [{ id ("snack_..."), title, emoji, band,
 *   steps: [explain, dann 1-2x quiz/cloze/form] }] - Schritt-Schema identisch zu grammar.js.
 * Snack-IDs sind heilig (state.course.snacksSeen haengt daran).
 * Validierung: node tools/validate-snacks.cjs
 *
 * Ton: warm, persoenlich, "du"-Ton. Inhalt im Geist "mit wenigen Woertern viel
 * erreichen" - Slang-Perlen, Kultur-Gotchas, Mini-Grammatik-Aha, Schilder-Wissen,
 * Hoeflichkeit. quiz laeuft NUR ueber bestehende content.js-Items (kein neues
 * Lernvokabular). explain.examples[].he tragen Niqqud (werden vertont, C7);
 * cloze/form-Optionen bleiben ohne Niqqud (wie echte Schilder), Ausnahme: Formen,
 * die sich NUR in den Vokalen unterscheiden (rotze/rotza, shlomcha/shlomech).
 *
 * WICHTIG: Sorgfaeltig erstellt, muttersprachliches Gegenlesen (Niqqud,
 * Transliteration, Register) steht vor einem echten Release noch aus.
 */
window.TACHELES_SNACKS = {
  version: 1,
  snacks: [

    // ===================== Band A0 =====================
    {
      id: "snack_shalom", title: "Schalom in drei Bedeutungen", emoji: "👋", band: "A0",
      steps: [
        { type: "explain", title: "Ein Wort, das nie falsch ist",
          text: "Schalom ist dein Schweizer Taschenmesser: Es heißt „Hallo“, „Tschüss“ und „Frieden“ zugleich. Du kannst es beim Kommen und beim Gehen sagen, morgens wie abends. Wenn du nur ein einziges Wort kannst, dann dieses.",
          examples: [
            { he: "שָׁלוֹם", translit: "shalom", de: "Hallo / Friede / Tschüss" },
            { he: "לְהִתְרָאוֹת", translit: "lehitraot", de: "Auf Wiedersehen" },
            { he: "בַּיי", translit: "bay", de: "Tschüss (locker)" }
          ] },
        { type: "quiz", itemId: "shalom", distractorIds: ["toda", "slicha"] }
      ]
    },
    {
      id: "snack_bevakasha", title: "Bitte und gern geschehen", emoji: "🙏", band: "A0",
      steps: [
        { type: "explain", title: "Bevakasha kann beides",
          text: "Bevakasha ist doppelt praktisch: Es heißt „bitte“, wenn du etwas möchtest, und „gern geschehen“, wenn dir jemand dankt. Reichst du jemandem etwas, sagst du auch bevakasha, so wie „hier, bitte“. Zusammen mit toda kommst du überall höflich durch.",
          examples: [
            { he: "בְּבַקָשָׁה", translit: "bevakasha", de: "bitte / gern geschehen" },
            { he: "תּוֹדָה", translit: "toda", de: "danke" },
            { he: "תּוֹדָה רַבָּה", translit: "toda raba", de: "vielen Dank" }
          ] },
        { type: "quiz", itemId: "bevakasha", distractorIds: ["toda", "slicha"] }
      ]
    },
    {
      id: "snack_10_woerter", title: "Mit 10 Wörtern durch den Tag", emoji: "🔟", band: "A0",
      steps: [
        { type: "explain", title: "Weniger ist mehr",
          text: "Mit einer Handvoll Wörter kommst du erstaunlich weit. Schalom, toda, ken, lo, slicha und bevakasha decken Begrüßung, Höflichkeit und die halbe Verständigung ab. Den Rest erledigen ein Lächeln und die Hände.",
          examples: [
            { he: "כֵּן", translit: "ken", de: "ja" },
            { he: "לֹא", translit: "lo", de: "nein" },
            { he: "סְלִיחָה", translit: "slicha", de: "Entschuldigung" },
            { he: "תּוֹדָה", translit: "toda", de: "danke" }
          ] },
        { type: "form", prompt: "„Nein“ sagst du mit",
          options: [ { he: "לא", translit: "lo", correct: true }, { he: "כן", translit: "ken" } ],
          note: "לא (lo) = nein, כן (ken) = ja." },
        { type: "quiz", itemId: "toda", distractorIds: ["ken", "lo"] }
      ]
    },
    {
      id: "snack_ken_lo", title: "Ja, Nein und die Hand", emoji: "🙆", band: "A0",
      steps: [
        { type: "explain", title: "Kurz und bestimmt",
          text: "Ken heißt Ja, lo heißt Nein. Statt langer Erklärungen hörst du oft ein knappes „lo lo lo“, dazu eine Handbewegung. Das klingt bestimmter als im Deutschen, ist aber nicht unhöflich gemeint, sondern einfach direkt.",
          examples: [
            { he: "כֵּן", translit: "ken", de: "ja" },
            { he: "לֹא", translit: "lo", de: "nein" }
          ] },
        { type: "quiz", itemId: "ken", distractorIds: ["lo", "beseder"] }
      ]
    },
    {
      id: "snack_no_vowels", title: "Warum schreibt man ohne Vokale?", emoji: "🔤", band: "A0",
      steps: [
        { type: "explain", title: "Die Punkte sind nur Stützräder",
          text: "Hebräisch schreibt vor allem Konsonanten. Die Vokale erschließt man aus dem Zusammenhang, so wie du „Bhnhf“ als Bahnhof liest. Die Pünktchen (Niqqud) sind Stützräder für Anfänger und Kinder, auf echten Schildern und in Zeitungen fehlen sie fast immer.",
          examples: [
            { he: "מַיִם", translit: "mayim", de: "Wasser (mit Punkten)" },
            { he: "מים", translit: "mayim", de: "Wasser (so auf dem Schild)" }
          ] },
        { type: "form", prompt: "So steht „Wasser“ auf einem echten Schild",
          options: [ { he: "מים", translit: "mayim", correct: true }, { he: "לחם", translit: "lechem" } ],
          note: "מים (mayim) = Wasser, לחם (lechem) = Brot." }
      ]
    },
    {
      id: "snack_final_letters", title: "Fünf Buchstaben mit Zweitgestalt", emoji: "✍️", band: "A0",
      steps: [
        { type: "explain", title: "Am Wortende ändern sie sich",
          text: "Fünf Buchstaben sehen anders aus, wenn sie am Wortende stehen: Kaf, Mem, Nun, Pe und Zade bekommen dann eine lange Endform. Aus מ wird ם, aus נ wird ן. Der Laut bleibt gleich, nur die Gestalt wechselt.",
          examples: [
            { he: "מ ← ם", translit: "mem", de: "Mem, normal und Endform" },
            { he: "נ ← ן", translit: "nun", de: "Nun, normal und Endform" },
            { he: "פ ← ף", translit: "pe", de: "Pe, normal und Endform" }
          ] },
        { type: "quiz", itemId: "let_mem_s", distractorIds: ["let_nun_s", "let_pe_s"] }
      ]
    },
    {
      id: "snack_greetings_time", title: "Guten Morgen, guten Abend", emoji: "🌅", band: "A0",
      steps: [
        { type: "explain", title: "Grüße nach der Tageszeit",
          text: "Tageszeiten haben feste Grüße: boker tov am Morgen, erev tov am Abend, laila tov zur Nacht. „Tov“ heißt gut, das steckt in allen dreien. Antworten kannst du ganz einfach, indem du den Gruß zurückgibst.",
          examples: [
            { he: "בֹּקֶר טוֹב", translit: "boker tov", de: "guten Morgen" },
            { he: "עֶרֶב טוֹב", translit: "erev tov", de: "guten Abend" },
            { he: "לַיְלָה טוֹב", translit: "laila tov", de: "gute Nacht" }
          ] },
        { type: "form", prompt: "Am Morgen begrüßt du jemanden mit",
          options: [ { he: "בוקר טוב", translit: "boker tov", correct: true }, { he: "לילה טוב", translit: "laila tov" } ],
          note: "בוקר (boker) = Morgen, לילה (laila) = Nacht." }
      ]
    },
    {
      id: "snack_ma_shlomcha", title: "Wie geht's? Zwei Formen", emoji: "🙂", band: "A0",
      steps: [
        { type: "explain", title: "Zu Mann und Frau anders",
          text: "„Wie geht es dir?“ heißt ma shlomcha zu einem Mann und ma shlomech zu einer Frau. Geschrieben sieht beides gleich aus (מה שלומך), nur die Vokale am Ende unterscheiden sich. Am Klang hörst du also, wen jemand gerade anspricht.",
          examples: [
            { he: "מַה שְׁלוֹמְךָ", translit: "ma shlomcha", de: "Wie geht's? (zu einem Mann)" },
            { he: "מַה שְׁלוֹמֵךְ", translit: "ma shlomech", de: "Wie geht's? (zu einer Frau)" }
          ] },
        { type: "form", prompt: "Zu einer Frau sagst du",
          options: [ { he: "מַה שְׁלוֹמֵךְ", translit: "ma shlomech", correct: true }, { he: "מַה שְׁלוֹמְךָ", translit: "ma shlomcha" } ],
          note: "Zur Frau: shlomech. Zum Mann: shlomcha. Gleiche Schrift, andere Vokale." }
      ]
    },
    {
      id: "snack_slicha", title: "Slicha: mehr als Entschuldigung", emoji: "🙋", band: "A0",
      steps: [
        { type: "explain", title: "Dein höflicher Türöffner",
          text: "Slicha heißt „Entschuldigung“, ist aber auch dein Türöffner: um dich durchzudrängeln, um jemanden anzusprechen oder um höflich nachzufragen. Ein freundliches „slicha?“ bedeutet so viel wie „Verzeihung, darf ich mal?“.",
          examples: [
            { he: "סְלִיחָה", translit: "slicha", de: "Entschuldigung / Verzeihung" }
          ] },
        { type: "quiz", itemId: "slicha", distractorIds: ["bevakasha", "toda"] }
      ]
    },
    {
      id: "snack_beseder", title: "Beseder: das Allzweck-Okay", emoji: "👌", band: "A0",
      steps: [
        { type: "explain", title: "Die Antwort auf fast alles",
          text: "Beseder heißt „in Ordnung“ und ist die Antwort auf fast alles: alles klar, passt, machen wir. Willst du betonen, dass es wirklich bestens ist, hängst du gamur an: beseder gamur, absolut in Ordnung.",
          examples: [
            { he: "בְּסֵדֶר", translit: "beseder", de: "in Ordnung / okay" },
            { he: "בְּסֵדֶר גָּמוּר", translit: "beseder gamur", de: "absolut in Ordnung" }
          ] },
        { type: "quiz", itemId: "beseder", distractorIds: ["tov", "sababa"] }
      ]
    },
    {
      id: "snack_counting_one", title: "Eins, zwei, drei zum Zählen", emoji: "🔢", band: "A0",
      steps: [
        { type: "explain", title: "Erst die Zählform",
          text: "Beim einfachen Zählen sagst du achat, shtayim, shalosh. Kleiner Stolperstein: Hebräisch hat für Zahlen männliche und weibliche Formen. Die hier sind die weiblichen, und genau die nimmst du zum reinen Abzählen.",
          examples: [
            { he: "אַחַת", translit: "achat", de: "eins" },
            { he: "שְׁתַּיִם", translit: "shtayim", de: "zwei" },
            { he: "שָׁלוֹשׁ", translit: "shalosh", de: "drei" }
          ] },
        { type: "quiz", itemId: "achat", distractorIds: ["shtayim", "shalosh"] }
      ]
    },
    {
      id: "snack_signs_door", title: "Schilder: rein und raus", emoji: "🚪", band: "A0",
      steps: [
        { type: "explain", title: "Vier Wörter für jede Tür",
          text: "Zwei Wörter retten dich an jeder Tür: knisa ist der Eingang, yetsia der Ausgang. Steht patuach dran, ist offen, bei sagur ist geschlossen. Diese vier liest du in Israel wirklich überall.",
          examples: [
            { he: "כְּנִיסָה", translit: "knisa", de: "Eingang" },
            { he: "יְצִיאָה", translit: "yetsia", de: "Ausgang" },
            { he: "פָּתוּחַ", translit: "patuach", de: "offen" },
            { he: "סָגוּר", translit: "sagur", de: "geschlossen" }
          ] },
        { type: "quiz", itemId: "knisa", distractorIds: ["yetsia", "sagur"] }
      ]
    },

    // ===================== Band A1 =====================
    {
      id: "snack_yesh_ein", title: "Yesh und Ein: haben und nicht haben", emoji: "🈶", band: "A1",
      steps: [
        { type: "explain", title: "Zwei winzige Wörter, riesige Reichweite",
          text: "Yesh heißt „es gibt“, ein heißt „es gibt nicht“. Mit „li“ (mir) baust du daraus Besitz: yesh li heißt „ich habe“, ein li „ich habe nicht“. So drückst du ohne echtes Verb „haben“ trotzdem aus, was du hast.",
          examples: [
            { he: "יֵשׁ", translit: "yesh", de: "es gibt" },
            { he: "אֵין", translit: "ein", de: "es gibt nicht" },
            { he: "יֵשׁ לִי", translit: "yesh li", de: "ich habe" }
          ] },
        { type: "cloze", he: "___ לי כסף", translit: "___ li kesef", de: "Ich habe kein Geld.",
          options: [ { he: "אין", translit: "ein", correct: true }, { he: "יש", translit: "yesh" } ],
          note: "ein li = ich habe nicht, yesh li = ich habe." }
      ]
    },
    {
      id: "snack_rotze_rotza", title: "Ich möchte: rotze oder rotza?", emoji: "🙋", band: "A1",
      steps: [
        { type: "explain", title: "Das Verb richtet sich nach dir",
          text: "„Ich möchte“ heißt ani rotze, wenn ein Mann spricht, und ani rotza, wenn eine Frau spricht. Es kommt darauf an, wer redet, nicht was gewünscht wird. Geschrieben ist beides רוצה, der Unterschied steckt in den Vokalen.",
          examples: [
            { he: "אֲנִי רוֹצֶה", translit: "ani rotze", de: "ich möchte (Mann spricht)" },
            { he: "אֲנִי רוֹצָה", translit: "ani rotza", de: "ich möchte (Frau spricht)" }
          ] },
        { type: "form", prompt: "Eine Frau sagt „ich möchte einen Kaffee“",
          options: [ { he: "אֲנִי רוֹצָה", translit: "ani rotza", correct: true }, { he: "אֲנִי רוֹצֶה", translit: "ani rotze" } ],
          note: "Frau: rotza. Mann: rotze. Gleiche Schrift, andere Vokale." }
      ]
    },
    {
      id: "snack_bargain", title: "Wie viel kostet das?", emoji: "🛒", band: "A1",
      steps: [
        { type: "explain", title: "Auf dem Markt gehört Handeln dazu",
          text: "Auf dem shuk (Markt) darfst du feilschen. Frag kama ze ole, „wie viel kostet das?“. Findest du es yakar (teuer), sag es ruhig, oft wird der Preis dann zol (günstiger). Ein Lächeln hilft mehr als hartes Verhandeln.",
          examples: [
            { he: "כַּמָּה זֶה עוֹלֶה", translit: "kama ze ole", de: "Wie viel kostet das?" },
            { he: "יָקָר", translit: "yakar", de: "teuer" },
            { he: "זוֹל", translit: "zol", de: "billig / günstig" }
          ] },
        { type: "form", prompt: "„teuer“",
          options: [ { he: "יקר", translit: "yakar", correct: true }, { he: "זול", translit: "zol" } ],
          note: "יקר (yakar) = teuer, זול (zol) = günstig." }
      ]
    },
    {
      id: "snack_streetfood", title: "Falafel, Hummus, Pita", emoji: "🧆", band: "A1",
      steps: [
        { type: "explain", title: "Streetfood-Wörter kannst du sofort",
          text: "Israels Streetfood-Wörter kannst du fast blind: Falafel, Hummus und Pita klingen wie bei uns. Bestell eine Pita mit Falafel, und du bist mittendrin. Chumus wird übrigens mit „ch“ wie in „Bach“ gesprochen.",
          examples: [
            { he: "פָלָאפֶל", translit: "falafel", de: "Falafel" },
            { he: "חוּמוּס", translit: "chumus", de: "Hummus" },
            { he: "פִּיתָה", translit: "pita", de: "Pita (Fladenbrot)" }
          ] },
        { type: "quiz", itemId: "falafel", distractorIds: ["chumus", "salat"] }
      ]
    },
    {
      id: "snack_loanwords", title: "Wörter, die du schon kennst", emoji: "🤝", band: "A1",
      steps: [
        { type: "explain", title: "Mehr Hebräisch, als du denkst",
          text: "Viele Alltagswörter sind entlehnt und klingen vertraut: otobus (Bus), telefon, radyo. Du kennst also mehr Hebräisch, als du glaubst, oft musst du es nur mit hebräischem Akzent aussprechen.",
          examples: [
            { he: "אוֹטוֹבּוּס", translit: "otobus", de: "Bus" },
            { he: "טֶלֶפוֹן", translit: "telefon", de: "Telefon" },
            { he: "רַדְיוֹ", translit: "radyo", de: "Radio" }
          ] },
        { type: "quiz", itemId: "otobus", distractorIds: ["rakevet", "monit"] }
      ]
    },
    {
      id: "snack_colors", title: "Farben auf einen Blick", emoji: "🎨", band: "A1",
      steps: [
        { type: "explain", title: "Die Grundfarben lohnen sich früh",
          text: "Ein paar Farben helfen beim Einkaufen und im Verkehr: adom (rot), kachol (blau), yarok (grün). Die Endung ändert sich je nach Geschlecht des Wortes, aber die Grundform bringt dich erst einmal weit.",
          examples: [
            { he: "אָדֹם", translit: "adom", de: "rot" },
            { he: "כָּחֹל", translit: "kachol", de: "blau" },
            { he: "יָרֹק", translit: "yarok", de: "grün" }
          ] },
        { type: "quiz", itemId: "adom", distractorIds: ["kachol", "yarok"] }
      ]
    },
    {
      id: "snack_family", title: "Ima, Aba und die Familie", emoji: "👪", band: "A1",
      steps: [
        { type: "explain", title: "Nah am Kindersprech vieler Sprachen",
          text: "Familie heißt mishpacha. Mama ist ima, Papa aba, ganz nah am Kindersprech vieler Sprachen. Bruder ist ach, Schwester achot. Mit diesen Wörtern erzählst du schon von deinen Liebsten.",
          examples: [
            { he: "אִמָּא", translit: "ima", de: "Mama" },
            { he: "אַבָּא", translit: "aba", de: "Papa" },
            { he: "אָח", translit: "ach", de: "Bruder" },
            { he: "אָחוֹת", translit: "achot", de: "Schwester" }
          ] },
        { type: "quiz", itemId: "ima", distractorIds: ["aba", "achot"] }
      ]
    },
    {
      id: "snack_directions", title: "Rechts, links, geradeaus", emoji: "🧭", band: "A1",
      steps: [
        { type: "explain", title: "Drei Wörter fürs Taxi",
          text: "Im Taxi oder zu Fuß brauchst du drei Wörter: yamina (nach rechts), smola (nach links), yashar (geradeaus). „Yashar, yashar“ hörst du oft, wenn es einfach weitergehen soll. Zeig ruhig mit der Hand dazu.",
          examples: [
            { he: "יָמִינָה", translit: "yamina", de: "nach rechts" },
            { he: "שְׂמֹאלָה", translit: "smola", de: "nach links" },
            { he: "יָשָׁר", translit: "yashar", de: "geradeaus" }
          ] },
        { type: "form", prompt: "„nach links“",
          options: [ { he: "שמאלה", translit: "smola", correct: true }, { he: "ימינה", translit: "yamina" } ],
          note: "שמאלה (smola) = links, ימינה (yamina) = rechts." }
      ]
    },
    {
      id: "snack_emergency", title: "Im Notfall das Wichtigste", emoji: "🚑", band: "A1",
      steps: [
        { type: "explain", title: "Ruhig und laut",
          text: "Für den Ernstfall solltest du ezra (Hilfe) und hatsilu (Hilfe!, als Ruf) kennen. Die Polizei ist mishtara, der Arzt rofe. Ruhig und laut gesprochen, dann versteht man dich auch mit wenig Hebräisch.",
          examples: [
            { he: "עֶזְרָה", translit: "ezra", de: "Hilfe" },
            { he: "הַצִּילוּ", translit: "hatsilu", de: "Hilfe! (Ruf)" },
            { he: "מִשְׁטָרָה", translit: "mishtara", de: "Polizei" }
          ] },
        { type: "quiz", itemId: "hatsilu", distractorIds: ["ezra", "rofe"] }
      ]
    },
    {
      id: "snack_small_words", title: "Kleine Wörter, große Wirkung", emoji: "🔗", band: "A1",
      steps: [
        { type: "explain", title: "Scharniere für ganze Gedanken",
          text: "Mit gam (auch), aval (aber) und rak (nur) verbindest du plötzlich ganze Gedanken. „Ani rotze kafe, aval bli sukar“ heißt schon „ich möchte Kaffee, aber ohne Zucker“. Solche Scharnierwörter machen dich verständlich.",
          examples: [
            { he: "גַּם", translit: "gam", de: "auch" },
            { he: "אֲבָל", translit: "aval", de: "aber" },
            { he: "רַק", translit: "rak", de: "nur" }
          ] },
        { type: "form", prompt: "„aber“",
          options: [ { he: "אבל", translit: "aval", correct: true }, { he: "גם", translit: "gam" } ],
          note: "אבל (aval) = aber, גם (gam) = auch." }
      ]
    },

    // ===================== Band A2 =====================
    {
      id: "snack_shabbat", title: "Schabbat-Grüße", emoji: "🕯️", band: "A2",
      steps: [
        { type: "explain", title: "Der Ruhetag prägt die Woche",
          text: "Von Freitagnachmittag bis Samstagabend ist Schabbat, der Ruhetag. Freitags wünscht man sich Schabbat schalom, zu Wochenbeginn shavua tov, „gute Woche“. Vieles hat dann geschlossen, das solltest du beim Planen mitdenken.",
          examples: [
            { he: "שַׁבָּת שָׁלוֹם", translit: "shabat shalom", de: "friedlichen Schabbat" },
            { he: "שָׁבוּעַ טוֹב", translit: "shavua tov", de: "gute Woche" },
            { he: "שַׁבָּת", translit: "shabat", de: "Samstag / Schabbat" }
          ] },
        { type: "quiz", itemId: "shabat", distractorIds: ["shavua", "yom"] }
      ]
    },
    {
      id: "snack_office", title: "Im Büro: Chef, Gehalt, Urlaub", emoji: "💼", band: "A2",
      steps: [
        { type: "explain", title: "Drei Wörter, die weit tragen",
          text: "Ein paar Arbeitswörter helfen dir schnell: menahel ist der Chef, maskoret das Gehalt, chufsha der Urlaub. Über die maskoret spricht man in Israel oft offener als in Deutschland. Und die chufsha ist heilig, gönn sie dir.",
          examples: [
            { he: "מְנַהֵל", translit: "menahel", de: "Chef / Manager" },
            { he: "מַשְׂכֹּרֶת", translit: "maskoret", de: "Gehalt" },
            { he: "חֻפְשָׁה", translit: "chufsha", de: "Urlaub" }
          ] },
        { type: "quiz", itemId: "maskoret", distractorIds: ["chufsha", "avoda"] }
      ]
    },
    {
      id: "snack_weather", title: "Übers Wetter reden", emoji: "🌤️", band: "A2",
      steps: [
        { type: "explain", title: "Small Talk geht immer",
          text: "Über das Wetter kommt man leicht ins Gespräch: shemesh (Sonne), geshem (Regen). Im Sommer ist es oft cham (heiß), im Winter kann es kar (kalt) werden. „Cham hayom“ heißt schlicht „heute ist es heiß“.",
          examples: [
            { he: "שֶׁמֶשׁ", translit: "shemesh", de: "Sonne" },
            { he: "גֶּשֶׁם", translit: "geshem", de: "Regen" },
            { he: "חַם", translit: "cham", de: "heiß / warm" }
          ] },
        { type: "form", prompt: "„heiß / warm“",
          options: [ { he: "חם", translit: "cham", correct: true }, { he: "קר", translit: "kar" } ],
          note: "חם (cham) = heiß, קר (kar) = kalt." }
      ]
    },
    {
      id: "snack_past_ti", title: "Gestern: die Endung -ti", emoji: "⏳", band: "A2",
      steps: [
        { type: "explain", title: "Ein -ti verrät die Ich-Vergangenheit",
          text: "Die Vergangenheit in der Ich-Form erkennst du oft an der Endung -ti. Halachti heißt „ich ging“, achalti „ich aß“, amarti „ich sagte“. Hörst du am Wortende ein -ti, geht es meist um dich und um gestern.",
          examples: [
            { he: "הָלַכְתִּי", translit: "halachti", de: "ich ging" },
            { he: "אָכַלְתִּי", translit: "achalti", de: "ich aß" },
            { he: "אָמַרְתִּי", translit: "amarti", de: "ich sagte" }
          ] },
        { type: "cloze", he: "אתמול ___ לים", translit: "etmol ___ la-yam", de: "Gestern ging ich zum Meer.",
          options: [ { he: "הלכתי", translit: "halachti", correct: true }, { he: "אלך", translit: "elech" } ],
          note: "halachti = ich ging (gestern), elech = ich werde gehen." }
      ]
    },
    {
      id: "snack_home", title: "Zuhause: die wichtigsten Wörter", emoji: "🏠", band: "A2",
      steps: [
        { type: "explain", title: "Vom Haus bis zum Schlüssel",
          text: "Ein bayit ist ein Haus, eine dira eine Wohnung. In der Küche (mitbach) und im Wohnzimmer verbringst du die meiste Zeit, und den mafteach (Schlüssel) solltest du nie vergessen.",
          examples: [
            { he: "בַּיִת", translit: "bayit", de: "Haus" },
            { he: "מִטְבָּח", translit: "mitbach", de: "Küche" },
            { he: "מַפְתֵּחַ", translit: "mafteach", de: "Schlüssel" }
          ] },
        { type: "quiz", itemId: "mafteach", distractorIds: ["delet", "chalon"] }
      ]
    },
    {
      id: "snack_hobbies", title: "Freizeit: Sport, Musik, Kino", emoji: "⚽", band: "A2",
      steps: [
        { type: "explain", title: "Über Hobbys plaudern verbindet",
          text: "Über Hobbys zu plaudern verbindet: sport, muzika, seret (Film). „Ani ohev muzika“ heißt „ich mag Musik“. Frag ruhig zurück, viele erzählen gern von ihren tiyulim, den Ausflügen in die Natur.",
          examples: [
            { he: "סְפּוֹרְט", translit: "sport", de: "Sport" },
            { he: "מוּזִיקָה", translit: "muzika", de: "Musik" },
            { he: "סֶרֶט", translit: "seret", de: "Film" }
          ] },
        { type: "quiz", itemId: "seret", distractorIds: ["sefer", "shir"] }
      ]
    },

    // ===================== Band B1 =====================
    {
      id: "snack_opinion", title: "Meine Meinung: leda'ati", emoji: "💭", band: "B1",
      steps: [
        { type: "explain", title: "So steigst du in eine Debatte ein",
          text: "Willst du deine Meinung einleiten, sag leda'ati, „meiner Meinung nach“. Ani choshev heißt „ich denke“, und nachon bestätigt „richtig, stimmt“. Mit diesen drei Bausteinen mischst du in jeder Diskussion mit.",
          examples: [
            { he: "לְדַעְתִּי", translit: "leda'ati", de: "meiner Meinung nach" },
            { he: "חוֹשֵׁב", translit: "choshev", de: "ich denke / meine" },
            { he: "נָכוֹן", translit: "nachon", de: "richtig / stimmt" }
          ] },
        { type: "form", prompt: "„Meiner Meinung nach ...“ leitest du ein mit",
          options: [ { he: "לדעתי", translit: "leda'ati", correct: true }, { he: "באמת", translit: "be'emet" } ],
          note: "לדעתי (leda'ati) = meiner Meinung nach, באמת (be'emet) = wirklich." }
      ]
    },
    {
      id: "snack_teudat_zehut", title: "Teudat Zehut: der Ausweis zählt", emoji: "🪪", band: "B1",
      steps: [
        { type: "explain", title: "Ohne Ausweis geht fast nichts",
          text: "Kaum ein Dokument ist so zentral wie die teudat zehut, der Personalausweis. Für Ämter brauchst du oft einen tor (Termin) und füllst ein tofes (Formular) aus. Trag die teudat zehut lieber immer bei dir.",
          examples: [
            { he: "תְּעוּדַת זֶהוּת", translit: "te'udat zehut", de: "Personalausweis" },
            { he: "תּוֹר", translit: "tor", de: "Termin / Warteschlange" },
            { he: "טֹפֶס", translit: "tofes", de: "Formular" }
          ] },
        { type: "quiz", itemId: "teudat_zehut", distractorIds: ["darkon", "tofes"] }
      ]
    },
    {
      id: "snack_media", title: "Nachrichten & Medien", emoji: "📰", band: "B1",
      steps: [
        { type: "explain", title: "Auch super Hörtraining",
          text: "Nachrichten heißen chadashot, eine Zeitung iton. Viele hören sie im radyo oder lesen einen maamar (Artikel) online. Ein täglicher Blick in die chadashot ist nebenbei starkes Hörtraining.",
          examples: [
            { he: "חֲדָשׁוֹת", translit: "chadashot", de: "Nachrichten" },
            { he: "עִיתּוֹן", translit: "iton", de: "Zeitung" },
            { he: "רַדְיוֹ", translit: "radyo", de: "Radio" }
          ] },
        { type: "quiz", itemId: "chadashot", distractorIds: ["iton", "maamar"] }
      ]
    },
    {
      id: "snack_civil_status", title: "Verheiratet, ledig, geschieden", emoji: "💍", band: "B1",
      steps: [
        { type: "explain", title: "Beim Kennenlernen fällt es schnell",
          text: "Der Familienstand kommt beim Kennenlernen oft zur Sprache: nasui (verheiratet), ravak (ledig, Single), garush (geschieden). Für Frauen ändert sich die Endung, ravak wird zu ravaka. In Israel fragt man da manchmal direkter als bei uns.",
          examples: [
            { he: "נָשׂוּי", translit: "nasui", de: "verheiratet" },
            { he: "רַוָּק", translit: "ravak", de: "ledig / Single" },
            { he: "גָּרוּשׁ", translit: "garush", de: "geschieden" }
          ] },
        { type: "form", prompt: "„ledig / Single“ (über einen Mann)",
          options: [ { he: "רווק", translit: "ravak", correct: true }, { he: "נשוי", translit: "nasui" } ],
          note: "רווק (ravak) = ledig, נשוי (nasui) = verheiratet." }
      ]
    },
    {
      id: "snack_feelings", title: "Gefühle in Worte fassen", emoji: "💞", band: "B1",
      steps: [
        { type: "explain", title: "Sag, wie es dir wirklich geht",
          text: "Wie es dir wirklich geht, sagst du mit sameach (fröhlich), atsuv (traurig), koes (wütend). „Ani sameach“ heißt „ich bin froh“. Auch hier hängt die Endung am Geschlecht: sameach wird für Frauen zu smecha.",
          examples: [
            { he: "שָׂמֵחַ", translit: "sameach", de: "fröhlich / froh" },
            { he: "עָצוּב", translit: "atsuv", de: "traurig" },
            { he: "כּוֹעֵס", translit: "ko'es", de: "wütend" }
          ] },
        { type: "quiz", itemId: "sameach", distractorIds: ["atsuv", "koes"] }
      ]
    },

    // ===================== Band B2 =====================
    {
      id: "snack_slang_top", title: "Slang der Woche: achla", emoji: "😎", band: "B2",
      steps: [
        { type: "explain", title: "Drei Wörter für „top“",
          text: "Willst du sagen, dass etwas super ist, hast du die Wahl: achla, sababa und magniv heißen alle „top, cool, geil“. Achla und sababa kommen aus dem Arabischen und sind im Alltag überall zu hören.",
          examples: [
            { he: "אַחְלָה", translit: "achla", de: "super / top" },
            { he: "סַבַּבָּה", translit: "sababa", de: "super / passt" },
            { he: "מַגְנִיב", translit: "magniv", de: "cool / geil" }
          ] },
        { type: "quiz", itemId: "achla", distractorIds: ["magniv", "sababa"] }
      ]
    },
    {
      id: "snack_yalla", title: "Yalla: das Wort für alles", emoji: "🚀", band: "B2",
      steps: [
        { type: "explain", title: "Halb Aufbruch, halb Tschüss",
          text: "Yalla treibt an: „los!“, „komm schon!“, „auf geht's!“. Es steht am Anfang, am Ende, überall. „Yalla, bye“ ist eine der häufigsten Verabschiedungen überhaupt, halb Aufbruch, halb Tschüss.",
          examples: [
            { he: "יַאללָּה", translit: "yalla", de: "los! / komm!" },
            { he: "יַאללָּה בַּיי", translit: "yalla bay", de: "na dann, tschüss" }
          ] },
        { type: "quiz", itemId: "yalla", distractorIds: ["dai", "nu"] }
      ]
    },
    {
      id: "snack_idiom_sagenhaft", title: "Chaval al ha-zman", emoji: "🤯", band: "B2",
      steps: [
        { type: "explain", title: "Wörtlich das Gegenteil des Gemeinten",
          text: "Wörtlich heißt chaval al ha-zman „schade um die Zeit“, gemeint ist aber meist das Gegenteil: „sagenhaft, umwerfend“. Am Tonfall hörst du, ob etwas grandios oder wirklich Zeitverschwendung war. Ähnlich stark: sof ha-derech, „das Ende des Wegs“, also spitze.",
          examples: [
            { he: "חֲבָל עַל הַזְּמַן", translit: "chaval al ha-zman", de: "sagenhaft (Idiom)" },
            { he: "סוֹף הַדֶּרֶךְ", translit: "sof ha-derech", de: "spitze (Idiom)" }
          ] },
        { type: "form", prompt: "Welcher Ausdruck bedeutet „spitze, sagenhaft“?",
          options: [ { he: "סוף הדרך", translit: "sof ha-derech", correct: true }, { he: "על הפנים", translit: "al ha-panim" } ],
          note: "sof ha-derech = spitze, al ha-panim = mies / grottig." }
      ]
    },
    {
      id: "snack_tachles", title: "Tachles: Butter bei die Fische", emoji: "🎯", band: "B2",
      steps: [
        { type: "explain", title: "Der Namensgeber dieser App",
          text: "Tachles heißt „zur Sache, im Grunde, Butter bei die Fische“. Es kommt aus dem Jiddischen und ist auch bei uns als „Tacheles reden“ bekannt. Sag „tachles“, wenn du Schluss mit dem Drumherum machen willst.",
          examples: [
            { he: "תַּכְלֶס", translit: "tachles", de: "im Grunde / zur Sache" }
          ] },
        { type: "quiz", itemId: "tachles", distractorIds: ["stam", "davka"] }
      ]
    },

    // ===================== Band C1 =====================
    {
      id: "snack_negotiation", title: "Verhandeln: masa umatan", emoji: "🤝", band: "C1",
      steps: [
        { type: "explain", title: "Tragen und Geben",
          text: "Eine Verhandlung heißt masa umatan, wörtlich „Tragen und Geben“. Ziel ist oft eine pshara (Kompromiss), am Ende steht ein heskem (Vereinbarung). Wer gut verhandelt, kennt seinen yitaron, den eigenen Vorteil.",
          examples: [
            { he: "מַשָּׂא וּמַתָּן", translit: "masa umatan", de: "Verhandlung" },
            { he: "פְּשָׁרָה", translit: "pshara", de: "Kompromiss" },
            { he: "הֶסְכֵּם", translit: "heskem", de: "Vereinbarung / Abkommen" }
          ] },
        { type: "form", prompt: "„Kompromiss“",
          options: [ { he: "פשרה", translit: "pshara", correct: true }, { he: "דרישה", translit: "drisha" } ],
          note: "פשרה (pshara) = Kompromiss, דרישה (drisha) = Forderung." }
      ]
    },
    {
      id: "snack_literature", title: "Dichter, Werke, Kritik", emoji: "🎭", band: "C1",
      steps: [
        { type: "explain", title: "In Israel wird viel gelesen",
          text: "Kultur hat einen hohen Stellenwert: Ein sofer ist ein Schriftsteller, ein meshorer ein Dichter, ihre shira (Poesie) füllt Cafés und Festivals. Über ein yetsira (Werk) wird leidenschaftlich diskutiert, samt bikoret, der Kritik.",
          examples: [
            { he: "סוֹפֵר", translit: "sofer", de: "Schriftsteller" },
            { he: "מְשׁוֹרֵר", translit: "meshorer", de: "Dichter" },
            { he: "שִׁירָה", translit: "shira", de: "Poesie / Dichtung" }
          ] },
        { type: "quiz", itemId: "sofer", distractorIds: ["meshorer", "oman"] }
      ]
    },

    // ===================== Band C2 =====================
    {
      id: "snack_davka", title: "Davka und kivyachol", emoji: "😏", band: "C2",
      steps: [
        { type: "explain", title: "Zwei Wörter, die Haltung verraten",
          text: "Zwei kaum übersetzbare Wörter: davka heißt „gerade, ausgerechnet, erst recht“ und trägt oft einen trotzigen Unterton. Kivyachol bedeutet „angeblich, sogenannt“ und macht eine Aussage ironisch. Beide verraten Haltung, nicht nur Inhalt.",
          examples: [
            { he: "דַּוְקָא", translit: "davka", de: "gerade / ausgerechnet" },
            { he: "כִּבְיָכוֹל", translit: "kivyachol", de: "angeblich / sogenannt" }
          ] },
        { type: "form", prompt: "Welches Wort bedeutet „angeblich, sogenannt“?",
          options: [ { he: "כביכול", translit: "kivyachol", correct: true }, { he: "דווקא", translit: "davka" } ],
          note: "kivyachol = angeblich, davka = ausgerechnet." }
      ]
    },
    {
      id: "snack_gematria", title: "Zahlen & Gematria", emoji: "🔯", band: "C2",
      steps: [
        { type: "explain", title: "Als Buchstaben noch zählten",
          text: "Vor den arabischen Ziffern zählte man mit Buchstaben: Alef ist 1, Jod ist 10. Zusammengezählt ergibt חַי (chai, „lebendig“) 18, deshalb schenkt man in Israel gern Geld in Vielfachen von 18. Die 15 schreibt man übrigens ט״ו und nicht mit den naheliegenden Buchstaben, aus Respekt vor einem Gottesnamen.",
          examples: [
            { he: "א", translit: "alef", de: "Alef = 1" },
            { he: "י", translit: "jod", de: "Jod = 10" },
            { he: "חַי", translit: "chai", de: "chai = 18 (lebendig)" }
          ] },
        { type: "form", prompt: "Welche zwei Buchstaben ergeben zusammen 18 (chai)?",
          options: [ { he: "י״ח", translit: "jod-chet (10+8)", correct: true }, { he: "ט״ו", translit: "tet-waw (9+6=15)" } ],
          note: "Jod (10) + Chet (8) = 18. ט״ו steht für 15 (9+6)." }
      ]
    }

  ]
};
