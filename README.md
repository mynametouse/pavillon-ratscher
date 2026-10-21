# Pavillon Ratscher – Quellcode

Begehbares 3D-Modell (three.js) des geplanten Gartenpavillons bei Ratscher (Thüringen) – mit Spiel: Werkstatt (Stirnholzbrett),
Tag und Nacht nach der Spieluhr, Nachbarn mit Aufgaben, Umgebung aus offenen Geodaten.

| Was | Wo |
|---|---|
| Website (für alle, ohne Anmeldung) | https://mynametouse.github.io/pavillon-ratscher/ – Branch `gh-pages` (gebaut) |
| Artefakt in Claude | https://claude.ai/artifact/Py7y37HTE5ojmFp1Wrg7MC |
| Quellcode, Werkzeuge, Doku | dieser Branch `src` |
| Stand der Planung (für Menschen) | Claude-Projekt „Garten“, Dokument `claude/pavillon-ratscher-stand.md` |

## Schnellstart in einer neuen Sitzung

```bash
git clone https://github.com/mynametouse/pavillon-ratscher pr-src && cd pr-src && git checkout src
bash tools/bootstrap.sh                 # Website als Asset-Basis holen, npm ci, Schnell-Build
bash tools/csp/start8951.sh &           # Testserver (Port 8951)
python3 viz3/test/smoke.py 8951         # lädt die Seite (≈ 2 min in SwiftShader), prüft die Spielschichten
```

## Aufbau

```
viz3/              die App
  src/             Module in Fachordnern; src/modules.txt = Reihenfolge im Bündel
  shell/           Seite in Teilen (parts.txt): css/<bereich>.css, header, panel_3d, menu, windows, panel_pano/film/gallery, notes, tail
  build.py         Bündeln (esbuild) + Seite zusammensetzen; buildlib/ = Assets/Manifeste, Quellen-Liste
  manifests.json   Asset-Manifeste des letzten Voll-Builds (macht den Schnell-Build ohne Original-Assets möglich)
  test/            Browser-Tests (Playwright) + lib.py
tools/             bootstrap, Testserver, Veröffentlichung, Werkzeuge der Asset-Pipelines (Texturen, Himmel, Figuren, Geodaten, Ton, Sterne …)
docs/              ARCHITECTURE.md · WORKFLOW.md · CHANGELOG.md · plans/
```

Weiterlesen: **docs/WORKFLOW.md** (bauen, testen, veröffentlichen, parallel arbeiten) und **docs/ARCHITECTURE.md** (wie die App aufgebaut ist, Modulkarte).
