/*
 * Tacheles - Mini-Localhost-Server (nur Node-Bordmittel, kein npm noetig).
 *
 * Warum? Ueber file:// merkt sich der Browser die Mikrofon-Erlaubnis NICHT
 * (Sicherheitsregel fuer lokale Dateien) und fragt im Sprechen-Modus bei jedem
 * Wort neu. Ueber http://localhost wird die Erlaubnis genau EINMAL erteilt
 * und dauerhaft gespeichert.
 *
 * Start:  Doppelklick auf "Tacheles-starten.cmd"  (oder: node server.js)
 * Danach: http://localhost:8017 im Browser.
 *
 * Hinweis: localhost ist ein anderer Browser-Speicher als file://.
 * Vorher unter file:// gesammelten Fortschritt einmal per Export/Import
 * (Profil -> Daten) mitnehmen.
 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var PORT = 8017;
var ROOT = __dirname;

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".mp3":  "audio/mpeg",
  ".opus": "audio/ogg",   // Opus im Ogg-Container (unsere Sprach-Samples)
  ".m4a":  "audio/mp4",   // AAC-Variante der Samples
  ".md":   "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

var server = http.createServer(function (req, res) {
  // Fehlerhaft kodierte URLs (z. B. /%c0, /%ZZ, /%) werfen in
  // decodeURIComponent — sauber mit 400 abfangen statt den Prozess zu killen.
  var urlPath;
  try {
    urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch (e) {
    res.writeHead(400); res.end("Bad request"); return;
  }
  if (urlPath === "/") urlPath = "/index.html";

  // Pfad sicher auf den App-Ordner begrenzen (kein ../ nach draussen).
  // Entweder exakt der ROOT oder ein Kind davon (ROOT + Trennzeichen davor),
  // damit ein Geschwister-Ordner mit gleichem Praefix nicht durchrutscht.
  var file = path.normalize(path.join(ROOT, urlPath));
  if (file !== ROOT && file.indexOf(ROOT + path.sep) !== 0) { res.writeHead(403); res.end("Forbidden"); return; }

  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end("Not found: " + urlPath); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.on("error", function (err) {
  if (err && err.code === "EADDRINUSE") {
    console.log("Port " + PORT + " ist schon belegt - laeuft Tacheles vielleicht bereits?");
    console.log("Einfach im Browser oeffnen: http://localhost:" + PORT);
  } else {
    console.log("Serverfehler: " + err.message);
  }
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("");
  console.log("  Tacheles laeuft:  http://localhost:" + PORT);
  console.log("  (Fenster offen lassen. Beenden mit Strg+C)");
  console.log("");
});
