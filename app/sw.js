/*
 * Tacheles - Service Worker (nur aktiv, wenn ueber http/https geladen).
 * Network-first mit Cache-Fallback: Updates kommen sofort an, offline laeuft
 * die App aus dem Cache weiter. (Cache-first hatte dazu gefuehrt, dass
 * Nutzer nach Releases auf altem Code festhingen.)
 */
"use strict";

var CACHE_NAME = "tacheles-v8";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./content.js",
  "./grammar.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

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
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    fetch(ev.request).then(function (res) {
      // Frische Antwort ausliefern UND den Cache aktualisieren.
      try {
        if (res && res.ok && ev.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(ev.request, copy); });
        }
      } catch (e) { /* egal */ }
      return res;
    }).catch(function () {
      // Offline: aus dem Cache bedienen.
      return caches.match(ev.request, { ignoreSearch: true });
    })
  );
});
