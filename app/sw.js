/*
 * Tacheles - Service Worker (nur aktiv, wenn ueber http/https geladen).
 * Network-first mit Cache-Fallback fuer Code/Assets: Updates kommen sofort an,
 * offline laeuft die App aus dem Cache weiter. (Cache-first hatte dazu gefuehrt,
 * dass Nutzer nach Releases auf altem Code festhingen.)
 *
 * Audio-Samples (app/audio/...) liegen in EINEM eigenen Cache und werden
 * cache-first bedient: ein Sample zu einer Item-ID aendert sich nie, und der
 * eigene Cache ueberlebt Code-Releases (der Code-Cache wird bei jedem Release
 * geleert, die teuer geladenen Samples bleiben). Vorladen per postMessage.
 */
"use strict";

var CACHE_NAME = "tacheles-v13";
var AUDIO_CACHE = "tacheles-audio-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./content.js",
  "./grammar.js",
  "./app.js",
  "./audio/manifest.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

// Nur die Sample-Dateien sind cache-first-Audio; audio/manifest.js folgt als
// Code dem network-first-Pfad (damit ein neues Manifest sofort ankommt).
function isAudio(url) { return url.indexOf("/audio/") >= 0 && !/\.js(\?|$)/.test(url); }

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // Code-Cache UND Audio-Cache behalten, alles Alte loeschen.
        if (k !== CACHE_NAME && k !== AUDIO_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  if (ev.request.method !== "GET") return;

  // Audio: cache-first (aendert sich nie), bei Miss aus dem Netz holen + ablegen.
  if (isAudio(ev.request.url)) {
    ev.respondWith(
      caches.open(AUDIO_CACHE).then(function (c) {
        return c.match(ev.request).then(function (hit) {
          if (hit) return hit;
          return fetch(ev.request).then(function (res) {
            if (res && res.ok) c.put(ev.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Code/Assets: network-first mit Cache-Fallback.
  ev.respondWith(
    fetch(ev.request).then(function (res) {
      try {
        if (res && res.ok && ev.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(ev.request, copy); });
        }
      } catch (e) { /* egal */ }
      return res;
    }).catch(function () {
      return caches.match(ev.request, { ignoreSearch: true });
    })
  );
});

// Vorladen: die App schickt die URLs des aktuellen + naechsten Bandes; nur
// laden, was noch nicht im Audio-Cache liegt (kein Doppel-Traffic).
self.addEventListener("message", function (ev) {
  var d = ev.data || {};
  if (d.type !== "prefetch-audio" || !d.urls || !d.urls.length) return;
  ev.waitUntil(
    caches.open(AUDIO_CACHE).then(function (c) {
      return Promise.all(d.urls.map(function (u) {
        return c.match(u).then(function (hit) {
          if (hit) return null;
          return fetch(u).then(function (r) { if (r && r.ok) return c.put(u, r); }).catch(function () { /* egal */ });
        });
      }));
    })
  );
});
