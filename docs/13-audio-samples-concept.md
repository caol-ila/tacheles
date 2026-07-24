# 13 – Audio-Samples & Offline-Caching (Konzept)

Status: **umgesetzt** (gemergt in PR #6; Nachbesserungen in #12/#14). Motiviert durch Feedback
„Aussprache oft falsch": die Browser-Sprachausgabe (`speechSynthesis`) hat auf vielen Geräten
keine echte he-IL-Stimme und bekommt Text meist ohne Niqqud, also ohne Vokale. Lösung: einmal
vorproduzierte, hochwertige Sprach-Samples, auf dem Handy offline gecacht, mit TTS als Rückfall.
Vertont sind sechs Arten (~1170 Clips): Items, Dialoge, Grammatik-Beispiele, Silben,
Häppchen-Beispiele und Szenen-Zeilen der Lektionen.

**Getroffene Entscheidungen (Recherche siehe Chat-Bericht):**
- **Quelle: ElevenLabs** (beste he-IL-Authentizität der geprüften Optionen), Tarif **Starter**
  (~6 €, einmalig ein Monat), gefüttert mit der **`niqqud`-Variante**. Free-Tarif (10.000 Zeichen)
  fasst die vokalisierte Menge (~12.000) nicht.
- **Lizenz:** ElevenLabs erlaubt keine Weitergabe des Outputs auf permissiveren Bedingungen als
  man selbst erhält (Prohibited Use Policy §9(n)) und kein KI-Training damit (§9(k/l)). Daher
  liegt der Code weiter offen, aber der **`app/audio/`-Ordner bekommt eine eigene Lizenz:
  CC-BY-NC 4.0 + Zusatz „keine KI-/ML-Trainingsnutzung"**. Attribution „ElevenLabs" wird genannt.
- **Erzeugung ist ein einmaliger, lokal gefahrener Batch** (`tools/generate-audio.cjs` mit dem
  ElevenLabs-API-Key des Betreibers). Die App-Infrastruktur (unten) ist quellenunabhängig und
  fällt ohne Samples sauber auf TTS zurück.

## 1. Prinzip

- **Audio-first, TTS-Fallback.** `spoken(item)` bleibt; neu sind `say(item)` (Items) und
  `sayText(he)` (Dialog/Grammatik): existiert ein Sample, wird es abgespielt, sonst greift wie
  heute die Browser-Sprachausgabe. Kein Regressionsrisiko ohne Sample.
- **Build-frei bleibt build-frei.** Samples sind statische Dateien im Repo. Erzeugt werden sie
  einmalig von einem Dev-Skript (Node, nicht Teil der Laufzeit). Die App lädt zur Laufzeit nur
  fertige Dateien plus ein kleines Manifest (als klassisches Script).
- **Keying (eine Wahrheit in `tools/audio-lib.cjs`, gespiegelt in app.js):** Items → `item.id`
  (lesbarer Dateiname, an derselben heiligen Kennung wie der Fortschritt); Dialogzeilen &
  Grammatik-Beispiele → `"h_" + hash(he)` (Text-Hash, da keine stabile ID; dedupliziert gleiche
  Texte automatisch). `app/audio/<key>.<ext>`.

## 2. Dateien im Repo

```
app/audio/
  LICENSE                # CC-BY-NC 4.0 + kein KI-Training (nur fuer diesen Ordner)
  manifest.js            # window.TACHELES_AUDIO = { version, format, clips:{<key>:{band,bytes,kind}} }
                         # (Platzhalter = null committet; Generierung ueberschreibt)
  manifest.json          # gleiche Daten als JSON (fuer Tools/Debugging)
  shalom.opus            # Item-Clips: Dateiname = item.id
  h_a1b2c3d4.opus        # Dialog-/Grammatik-Clips: Dateiname = h_<hash>
  ...                    # ~881 Clips gesamt (673 Items, 83 Dialogzeilen, 125 Grammatik-Beispiele)
tools/
  audio-lib.cjs          # gemeinsame Wahrheit: enumerateTargets(), audioHash(), Generierung, Manifest
  generate-audio.cjs     # Voll-Batch: ElevenLabs -> transkodiert -> Clips + manifest.js (Resume)
  check-audio.cjs        # Vollstaendigkeits-Check; --fill generiert fehlende nach
  audio.env              # gitignored: ELEVENLABS_API_KEY / _VOICE_ID (nie committen)
```

- Vertont wird bei Items die **`niqqud`-Variante** (mit Vokalen), bei Buchstaben `speak`, bei
  Dialog/Grammatik der `he`-Text. Niqqud ist der größte Authentizitäts-Hebel.
- Das Manifest ist die einzige Wahrheit darüber, welcher Text ein Sample hat und zu welchem Band
  es gehört. Die App fragt nie „gibt es die Datei?", sondern schaut ins Manifest.
- **Abdeckung:** Content-Items + Dialogzeilen + Grammatik-Beispiele. NICHT vertont: die einzelnen
  MC-Options-/Cloze-Formen der Grammatik-Übungen (keine Abspielstelle, oft Minimalpaar-Flexionen).

## 3. Wiedergabe (app.js)

Das Manifest wird als **klassisches Script** geladen (`audio/manifest.js` setzt
`window.TACHELES_AUDIO`), NICHT per fetch/XHR, denn ein Zugriff auf eine lokale Datei löst auf
`file://` einen Konsolenfehler aus (dieselbe Konvention wie content.js/grammar.js). `index.html`
lädt es zwischen grammar.js und app.js.

```js
var AUDIO = null;
function loadAudioManifest() {
  try {
    var m = window.TACHELES_AUDIO;
    if (m && m.clips && typeof m.clips === "object" && m.format) { AUDIO = m; maybePrefetchAudio(); }
  } catch (e) { /* ohne Manifest: reiner TTS-Betrieb wie bisher */ }
}

function audioUrl(item) {
  if (!AUDIO || !item || !AUDIO.clips[item.id]) return null;
  return "audio/" + item.id + "." + AUDIO.format;   // z. B. "audio/shalom.opus"
}

// say(item) ersetzt die direkten TTS.speak(spoken(item))-Aufrufe an den Lern-Stellen
function say(item, onDone) {
  var url = audioUrl(item);
  if (!url) { TTS.speak(spoken(item)); if (onDone) onDone(); return; }
  var a = new Audio(url);
  a.onended = function () { if (onDone) onDone(); };
  a.onerror = function () { TTS.speak(spoken(item)); if (onDone) onDone(); }; // offline & ungecacht
  var p = a.play(); if (p && p.catch) p.catch(a.onerror);
}
```

Auf `file://` (Doppelklick) spielt `new Audio("audio/...")` direkt von Platte, inhärent offline,
ganz ohne Service Worker. Der SW-Cache unten ist nur für den installierten PWA-Modus relevant,
genau den Fall „installiert über den Browser auf dem Handy".

## 4. Service Worker (sw.js)

- **Eigener Audio-Cache, getrennt vom Code-Cache.** Heute gibt es `CACHE_NAME` (aktuell v8) für
  Code/Assets. Neu: `AUDIO_CACHE = "tacheles-audio-v1"`. Getrennt, damit ein Code-Release
  (v8→v9) die teuer geladenen Samples NICHT wegwirft.
- **Strategie für `/audio/`-Anfragen: cache-first.** Ein Sample zu einer ID ändert sich nie
  (ändert es sich doch, bumpt man Manifest-Version + Audio-Cache-Name). Also: erst Cache, bei
  Miss aus dem Netz holen und in den Audio-Cache legen.
- **`activate`** löscht nur Caches, die weder aktueller Code- noch aktueller Audio-Cache sind
  (die bestehende Aufräum-Schleife wird um `AUDIO_CACHE` ergänzt).
- Die `ASSETS`-Precache-Liste bleibt unverändert (nur Code). Audio wird NICHT beim SW-Install
  zwangsvorgeladen, sondern gezielt (Abschnitt 5).

```js
var AUDIO_CACHE = "tacheles-audio-v1";
// im fetch-Handler, vor der bestehenden Logik:
if (ev.request.url.indexOf("/audio/") >= 0) {
  ev.respondWith(caches.open(AUDIO_CACHE).then(function (c) {
    return c.match(ev.request).then(function (hit) {
      return hit || fetch(ev.request).then(function (res) {
        if (res && res.ok) c.put(ev.request, res.clone());
        return res;
      });
    });
  }));
  return;
}
```

## 5. Vorladen: aktuelle + nächste Stufe (dein Wunsch)

Die App kennt das wirksame Band (`effectiveBand()`, `unlockedBand`) und über `itemBand(item)`
das Band jedes Clips. Beim Start (online) oder beim Öffnen des Lernen-Screens schickt sie dem
SW die URLs für **aktuelles Band + nächstes Band** zum Vorladen:

```js
// app.js: URLs der zwei relevanten Bänder aus dem Manifest sammeln
function bandsToPrefetch() {
  var cur = effectiveBand();
  var i = BANDS.indexOf(cur);
  return [BANDS[i], BANDS[i + 1]].filter(Boolean);
}
function prefetchAudio() {
  if (!AUDIO || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  var want = bandsToPrefetch(), urls = [];
  Object.keys(AUDIO.clips).forEach(function (id) {
    if (want.indexOf(AUDIO.clips[id].band) >= 0) urls.push("audio/" + id + "." + AUDIO.format);
  });
  navigator.serviceWorker.controller.postMessage({ type: "prefetch-audio", urls: urls });
}
```

```js
// sw.js: nur laden, was noch nicht im Cache ist (kein Doppel-Traffic)
self.addEventListener("message", function (ev) {
  var d = ev.data || {};
  if (d.type !== "prefetch-audio" || !d.urls) return;
  ev.waitUntil(caches.open(AUDIO_CACHE).then(function (c) {
    return Promise.all(d.urls.map(function (u) {
      return c.match(u).then(function (hit) { return hit || fetch(u).then(function (r) { if (r && r.ok) return c.put(u, r); }).catch(function () {}); });
    }));
  }));
});
```

Datenmenge pro Vorlade-Vorgang (aktuelles + nächstes Band, Opus): Worst Case **A0+A1 ≈ 2,3 MB**,
typisch **1–1,5 MB**. Das lädt auf Mobilfunk in Sekunden.

**Alternative, die dein Volumen erlaubt:** Weil ALLE Stufen zusammen nur ~5 MB (Opus) bzw. ~10 MB
(AAC) sind, kannst du beim ersten Online-Start auch einfach **alles** vorladen und dir die
Band-Logik sparen. „Aktuell + nächste" ist die datensparsame Variante, „alles" die einfachste.
Beides ist mit demselben `prefetch-audio`-Mechanismus abgedeckt (nur andere URL-Liste).

## 6. Verdrängung (optional, praktisch verzichtbar)

Bei 5–10 MB Gesamtvolumen lohnt Aufräumen kaum. Falls doch gewünscht: beim Bandaufstieg Clips
von Bändern löschen, die mehr als eine Stufe unter dem aktuellen liegen, per
`caches.open(AUDIO_CACHE)` + `cache.delete(url)`. Empfehlung: **weglassen**, einmal gecacht
bleibt gecacht.

## 7. Speicher & Format (aus Repo-Daten gerechnet)

~881 Clips (673 Items + 83 Dialogzeilen + 125 Grammatik-Beispiele), grob ~24 Min Audio.
Richtwerte (mono, skalieren linear mit der Clipzahl):

| Format (mono) | gesamt (~881) | pro Clip | Handy-Kompatibilität |
|---|---|---|---|
| **Opus 24 kbps** | **~4,3 MB** | ~5 KB | Android/Chrome überall; iOS erst 17+ zuverlässig |
| Opus 32 kbps | ~5,8 MB | ~7 KB | wie oben |
| **AAC 48 kbps (.m4a)** | **~8,6 MB** | ~10 KB | universell (auch ältere iPhones) |
| MP3 64 kbps | ~11,5 MB | ~13 KB | universell, aber größer/schlechter als AAC |
| WAV (unkomprimiert) | ~69 MB | ~78 KB | nur als Zwischenformat |

Selbst „alles in AAC" bleibt unter 9 MB; das aktuelle + nächste Band (Prefetch) sind je 1-2 MB.

**Empfehlung Format:** Für Sprache ist **Opus 24 kbps mono** praktisch transparent und am
kleinsten. Ist das Handy Android oder iOS ≥ 17: Opus. Für maximale Sicherheit (altes iPhone):
**AAC .m4a 48 kbps**, doppelt so groß, aber überall abspielbar und immer noch winzig. Robusteste
Variante: **beide Formate** ausliefern (~15 MB total) und per `new Audio().canPlayType(...)`
feature-detecten, dann Manifest-`format` je Gerät wählen. Bei diesem Volumen problemlos.

## 8. Format & ElevenLabs-Ausgabe

ElevenLabs liefert standardmäßig MP3. Das Generierungs-Skript transkodiert mit `ffmpeg` je Clip
in das Zielformat (Opus 24 kbps mono bzw. AAC .m4a 48 kbps mono, siehe Tabelle) und schreibt die
Dateigröße ins Manifest. Ohne `ffmpeg` fällt es auf das rohe MP3 zurück (größer, aber lauffähig).

## 9. Rollout

1. **[erledigt] Quelle/Lizenz:** ElevenLabs Starter, Audio unter CC-BY-NC 4.0 + kein-KI-Zusatz.
2. **[Infrastruktur]** `tools/audio-lib.cjs` + `generate-audio.cjs` + `check-audio.cjs`,
   `app.js`-Wiedergabe (`say`/`sayText`)/Prefetch, `sw.js`-Audio-Cache, `app/audio/LICENSE` +
   `manifest.js`-Platzhalter, Regression fürs Fallback.
3. **[einmalig, lokal durch Betreiber]** `tools/audio.env` mit Key/Voice füllen, dann
   `node tools/generate-audio.cjs`; erzeugt Clips + `manifest.js`. Danach `node tools/check-audio.cjs`
   zur Kontrolle (fehlende via `--fill` nachziehen). Ergebnis (Audios + Manifest) wird committet.
4. `sw.js`: `AUDIO_CACHE` + `/audio/`-Zweig + `prefetch-audio`-Handler; `activate`-Aufräumen
   um `AUDIO_CACHE` ergänzt. Code-`CACHE_NAME` v8→v9 wegen sw-Änderung.
5. `app.js`: Manifest laden, `playAudio()` an den Lern-/Vorlese-Stellen statt direktem
   `TTS.speak`, `prefetch-audio` beim Start/Lernen-Screen. TTS bleibt als Fallback erhalten.

## Offene Punkte

- Muttersprachliches Gegenhören der erzeugten Samples vor Release (deckt sich mit dem ohnehin
  offenen Niqqud/Content-Review).
- Vor Release die ElevenLabs-Terms erneut prüfen (Preise/Policy ändern sich); die §9(n)-konforme
  Audio-Lizenz im Repo ist eine Laien-Lesart, im Zweifel ElevenLabs-Support bestätigen lassen.
- End-to-End-Test mit echten Audios erst möglich, wenn der Batch gelaufen ist; die Infrastruktur
  ist bis dahin über das TTS-Fallback getestet.
```
