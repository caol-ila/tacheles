# Tacheles – Tests

## Regressionstest

```
node test/regression.cjs
```

(aus dem `app/`-Ordner heraus ausführen)

Prüft headless in Edge die Kernpfade der App: Content-Integrität (IDs, Themen-Referenzen,
Dialog-Verknüpfungen, Satz-Tokens), Onboarding, alle Modus-Kacheln, Antworten + Heute-Zeile,
Lernpfad, Fortschritt-Buttons, Export und Konsolenfehler. Exit-Code 0 = PASS.

**Voraussetzungen**
- Node.js
- Microsoft Edge (der Test startet `channel: "msedge"` headless)
- `playwright-core` irgendwo lokal. Pfad per Umgebungsvariable setzen, falls nicht am Default:

```
$env:PLAYWRIGHT_PATH = "C:/pfad/zu/node_modules/playwright-core"
node test/regression.cjs
```

Der Test läuft gegen `file://` mit frischem Browser-Profil und berührt den echten
Lern-Fortschritt im normalen Browser **nicht**.
