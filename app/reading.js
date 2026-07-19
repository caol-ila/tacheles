/*
 * Tacheles - Lese-Trainer-Daten (Silben-Inventar, Silbifizierer, Drills)
 * Klassisches Script, definiert genau EIN Global:
 *   window.TACHELES_READING = { version, syllables, exceptions, syllabify, drills }
 *
 * Vertrag C3: syllabify(niqqud) -> [{he, translit}] oder null; Round-Trip:
 * die Silben ergeben (ohne Leerzeichen-Beruecksichtigung) wieder den Input.
 * Drill-IDs sind heilig (course.js referenziert sie).
 * Validierung: node tools/validate-reading.cjs
 */
(function () {
  "use strict";

  var syllables = [];   // T4: programmatisch erzeugt (Buchstaben x Vokalzeichen inkl. Schwa)
  var exceptions = {};  // T4: kuratierte Woerter, die die Heuristik nicht sauber trifft

  /** Silbifizierer (Vertrag C3). Skeleton: nur exceptions, sonst null. */
  function syllabify(niqqud) {
    var s = String(niqqud == null ? "" : niqqud).trim();
    if (!s) return null;
    if (exceptions[s]) return exceptions[s].slice();
    return null; // T4 ersetzt das durch die echte Heuristik
  }

  window.TACHELES_READING = {
    version: 1,
    syllables: syllables,
    exceptions: exceptions,
    syllabify: syllabify,
    drills: []
  };
})();
