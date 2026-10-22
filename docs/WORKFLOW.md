# Arbeiten am Pavillon-Modell: einrichten, bauen, testen, veröffentlichen, parallel arbeiten

## 1 Neue Sitzung einrichten

```bash
# Repo in die Sitzung holen (Claude: add_repo mynametouse/pavillon-ratscher, Zugriff push), dann:
git clone https://github.com/mynametouse/pavillon-ratscher ~/pr-src && cd ~/pr-src && git checkout src
bash tools/bootstrap.sh
```

`tools/bootstrap.sh` klont die Website (Branch `gh-pages`, flach) nach `~/pavillon-ratscher` (Arbeitskopie für das Hochladen der Website),
kopiert deren Dateien als Asset-Basis nach `viz3/dist` und `viz3/dist_pub` (= was veröffentlicht ist), `npm ci`, installiert Playwright
falls nötig und baut einmal schnell. Die Original-Assets (2,4 GB Texturen, Modelle, Töne, Geodaten) braucht man dafür nicht.

Git-Identität für Commits: `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit …`; jede Commit-Nachricht endet
mit den Zuordnungszeilen der laufenden Sitzung (Systemhinweis), für die Website über `COMMIT_TRAILER`.

## 2 Bauen

```bash
cd viz3
python3 build.py --fast          # Code/Seite neu, Assets bleiben (Sekunden). Standard, wenn keine Originale da sind
python3 build.py --fast --min    # dasselbe minifiziert – so wird veröffentlicht
python3 build.py --min           # Voll-Build mit Originalen (<repo>/assets, <repo>/geo oder PAV_ASSETS): Assets → dist, manifests.json neu
```

Neue oder geänderte Assets (Texturen, Modelle, Töne …) gehen nur mit Voll-Build, also mit den Originalen. Ohne Originale: die
neue Datei direkt nach `viz3/dist/<ordner>/` legen und `manifests.json` von Hand ergänzen (z. B. Eintrag in `sm` für einen Ton) –
oder das Asset im Code laden (wie die Sterndaten in `time/skydata.js`).

## 3 Testen

```bash
bash tools/csp/start8951.sh &            # Testserver für viz3/dist (CSP wie beim Artefakt)
python3 viz3/test/smoke.py 8951          # Grundtest: lädt, keine Fehler, Spielschichten da
```

- Chromium läuft hier mit SwiftShader (Software-GPU): ein Bild braucht Sekunden, das Laden **≈ 2 min** (mit `lib.preset`, sonst 5–6 min
  wegen des GPU-Tests), mit `?nogeo=1` (ohne echte Umgebung) ≈ 1 min. Die Tests stoppen die Schleife (`window.FREEZE = true`) und
  treiben die Welt mit `GAME.step(sek)`; Bilder mit `GAME.shot()` → `lib.shot()`. Ausgaben nach `out/<test>/` (nicht eingecheckt).
- `viz3/test/lib.py`: `browser()`, `page()`, `preset()`, `boot()`, `shot()`, `out()`, `settle_light()` (nach Uhr-/Lichtwechsel warten,
  bis Himmel, Umgebungslicht und GI-Mischung fertig sind), `check_gl(pg, 16)` (Texturen je kompiliertem Programm, kaputte Programme).
- SwiftShader erlaubt 32 Texturen je Shader, echte GPUs oft nur 16 – deshalb prüft `check_gl` gegen 16, nicht gegen das, was der Test-Browser kann.
- Wichtige Tests:

| Skript | prüft | Dauer |
|---|---|---|
| smoke.py | Laden, keine Fehler | 3 min |
| softgl.py | **Laden ohne Grafikkarte** (V16b2/V16b3): ohne Stufen-Voreinstellung, Software-Grafik erkannt, gleich „schnell“, Vorbereitung < 3 min, Ladeanzeige bleibt nicht bei „100 %“ stehen und zählt die Shader, Seite bleibt beim Vorbereiten ansprechbar (≤ 12 s am Stück), Hinweis | 5 min |
| gpu.py | **GPU-Grenzen**: höchstens 16 Texturen je Shader-Programm (wie auf Laptops/Macs/Telefonen), kein Programm kaputt, Boden an 7 Orten tags und nachts sichtbar (kein Himmel im unteren Bilddrittel), dazu Innenraum, Werkstatt, Auto, Draufsicht. **Vor jeder Veröffentlichung**, bei neuen Texturen in Shadern immer | 6 min |
| v15b.py | Werkstatt-Spiel komplett vom Leimholz bis zum geölten Brett (Regression) | 20 min |
| v15b_reload.py | Spielstand speichern/laden, Handy-Ansicht | 15 min |
| v16a.py, v16a_b.py, v16a_c.py | Tag/Nacht: Stunden, Mondphasen, Draufsicht nachts, Nachbarn nachts, Oktober | je 10–20 min |
| v16a_lapse.py, v16a_video.py | Zeitraffer eines Tages (Bilderbogen, mp4) | 15–25 min |
| v16b.py | Fahrzeuge: Einsteigen, Gas/Bremse/rückwärts, Hauswand, Route Garten → Klinge mit Ortsnamen, Aussteigen und Gehen im Gelände, Traktor mit Frontlader, Licht nachts, HUD mit Karte, Zurückstellen, Telefon (Antippen, Kreis, Platz der Anzeigen) (Abschnitte: `car,drive,crash,route,walk,tractor,night,ui,phone`) | 20–30 min |
| v16e.py | Dorf nach Fotos: Stile und Dächer aller Gebäude, Schule mit Uhr (folgt der Spielzeit), Dorflinde (Messbäume ausgeblendet), Laternen, Ortsnamen, Menüort „Dorf“, Nahdetails laden/verwerfen, Kollision Brunnen/Laternen/Linde, Nacht (Fenster, Laternen, Licht an Wänden), Bilder von den Fotostellen, Texturen je Shader (Abschnitte: `load,places,near,walk,night,shots,gl`) | 10–15 min |
| prof.py, loadtime.py | Kosten pro Frame (TICKS), Draw-Calls/Speicher; Ladezeiten | 10 min |
| bilder.py `b21 B` | Galeriebilder nach `dist/img` (`?offline=1`, hohe Qualität) | je 2 min |
| pano.py, tour.py, gi.py, bake.py | 360°-Bilder, Raumführung, GI- und Himmelssichtbarkeits-Volumen backen | lang |

- Zwei CPU-Kerne: nicht mehrere Browser-Tests gleichzeitig laufen lassen (SwiftShader verliert sonst den WebGL-Kontext).
- **Windows misst anders** (V16b3): Chrome übersetzt dort jeden Shader über Direct3D (0,3–1,4 s je Programm ohne Grafikkarte), SwiftShader hier nicht. Wer viele neue Materialien/Shader bringt, prüft das Laden vor dem Veröffentlichen zusätzlich im Chrome des Owners (Claude in Chrome, Testseite mit `window.ASSET_BASE` auf die Website, siehe Branch `test/softgl`): Zeitstrahl der Ladeanzeige und Lücken > 1,5 s mitschreiben.

## 4 Veröffentlichen (Checkliste)

1. `cd viz3 && python3 build.py --fast --min` (bzw. Voll-Build), dann `smoke.py`, `gpu.py` und die Tests des geänderten Bereichs.
2. Neue/geänderte Galeriebilder: `PORT=8951 python3 test/bilder.py <name> B` (schreibt `dist/img/<name>.jpg`), Bildunterschrift in `viz3/shell/panel_gallery.html`.
3. **Artefakt** (Claude): `python3 ../tools/publish/pubmap.py dist_pub dist /tmp/pm.json` listet neue/geänderte Dateien. Dann Artifact
   publish: `url` = https://claude.ai/artifact/Py7y37HTE5ojmFp1Wrg7MC, `file_path` = `viz3/dist/pavillon-ratscher.html`, `root` = `viz3/dist`,
   `files` = `{"app.js": "app.js", …Einträge aus pm.json}`, `label` = Version. Aus einem neuen Chat vorher `Artifact read` mit derselben URL.
4. **Website**: `rm -rf dist_pub && cp -a dist dist_pub && COMMIT_TRAILER="<Zuordnungszeilen>" bash deploy_push.sh "V…: …"`; nach ≈ 1 min live
   (`curl -s https://mynametouse.github.io/pavillon-ratscher/ | grep "Version …"`). Der veröffentlichte Plan (`plan.json`) bleibt erhalten.
5. **Quellcode**: Commit auf `src`, `git push origin src`.
6. `docs/CHANGELOG.md` ergänzen; Projekt-Dokument `claude/pavillon-ratscher-stand.md` (Claude-Projekt „Garten“) aktualisieren.

## 5 Parallel arbeiten (mehrere Chats gleichzeitig)

- **Abstimmung zwischen den Chats: `docs/PARALLEL.md`** (Belegung, gemeinsame Dateien je Thema, Absprachen, Nachrichten). Lesen beim Start,
  vor Rebase/Merge und vor dem Veröffentlichen: `git fetch -q origin && git show origin/src:docs/PARALLEL.md`; ändern nur über Git auf `src`.
- **Ein Thema = ein Branch** von `src`: `git checkout -b feat/<thema> origin/src` (z. B. `feat/fahrzeuge`, `feat/dorf`, `feat/figuren`).
- **Nur im eigenen Bereich ändern**: eigener Ordner unter `viz3/src/` (neu oder bestehend), eigene Tests, eigene Zeilen in `modules.txt`.
  Gemeinsame Dateien knapp und gezielt anfassen: `src/modules.txt`, `shell/menu.html` (Menü, Hilfe), `shell/panel_3d.html` (HUD), `shell/css/*.css`, `build.py`/`buildlib/`, `manifests.json`,
  `boot/boot.js`, `game/game.js`, `core/*`, Dokumente. Neue `window`-Namen und Speicher-Schlüssel vorher in ARCHITECTURE.md prüfen/eintragen.
- **Zusammenführen**: `git fetch origin && git rebase origin/src`, testen, dann `git checkout src && git merge --ff-only feat/<thema> && git push origin src`.
- **Veröffentlichen immer nur von `src`** und nur einer zur Zeit: vorher `git pull` auf `src`, bauen, testen, veröffentlichen (Abschnitt 4).
  Hat jemand dazwischen veröffentlicht, ist `origin/gh-pages` neuer: erst `src` aktualisieren, dann `bash tools/bootstrap.sh` (holt `dist` und
  `dist_pub` neu von `gh-pages`) und neu bauen – `deploy_site.py` ersetzt die Website komplett durch `dist_pub`, Galeriebilder des anderen
  (sie liegen nur auf `gh-pages`, nicht im Repo) gingen sonst verloren.
- Versionsnummern: nächste freie Nummer aus `docs/CHANGELOG.md` beim Veröffentlichen vergeben (nicht vorher reservieren).
- Arbeitsstand für Menschen und andere Chats: Projekt-Dokument `claude/pavillon-ratscher-stand.md` (Was ist fertig, was läuft, was als Nächstes).

## 6 Regeln

- Keine Schlüssel/Passwörter ins Repo (der GitHub-Schlüssel für „Plan veröffentlichen“ liegt nur im Browser des Eigentümers).
- Keine Recherche-Rohdaten mit Flurstücken oder privaten Fotos ins Repo; Geodaten nur aufbereitet (wie in `dist/geo`).
- Lizenzen: jede Fremdquelle mit Namensnennung in `buildlib/credits.py`; Lizenztexte, die mitgeliefert werden müssen, stehen dort (MIT Rocketbox, BSD d3-celestial).
- Code-Kommentare Englisch, Oberfläche Deutsch. Einheiten: Meter, Grad, Minuten Spielzeit.
- Vor dem Teilen großer Dateien: Bündel-Gleichheit ist ein gutes Werkzeug – nach reinem Umordnen muss `dist/app.js` (min) byte-gleich bleiben.

## 7 Rezepte

- **Gebäude im Garten ändern**: `viz3/src/garden/<gebäude>.js` (eine Datei je Gebäude, `bldBegin … bldEnd`). Neues Gebäude: neue Datei nach dem Muster, Zeile in `modules.txt` vor `garden/places.js`, Eintrag in `site.js` (`SITE.bld`).
- **Pavillon**: Maße/Helfer `pavilion/house_base.js`; Teile beider Varianten `house_common.js`; Turm `house_tower.js`; Leiter-Variante `house_ladder.js`; Bauphasen/Kosten `pavilion/phases.js`.
- **Ton**: Engine `audio/audio.js` (`tone()`, `burst()`, `playBuf()`, Atmosphäre in `scheduleOneShots`); neue Aufnahmen nach `dist/snd` + Manifest `sm`.
- **Figuren**: Spielfigur `game/avatar.js` (Werkzeug `tools/player`), Nachbarn `npc/`.
- **Licht/Tageszeit**: Schlüsselbilder `DN.KF` in `time/daynight.js`; feste Stimmungen `render/modes.js`.
- **Aufgaben/Dialoge**: `game/quests.js`, Stimmen `tools/voices/lines3.py` (edge-tts).
- **Werkstatt-Spiel**: `werk/werk.js` (Stationen und Schritte), Fenster `werk/werkui.js`, Gebäude/Maschinen `garden/workshop.js`.
- **Fahrzeuge**: Modell und Fahrwerte je Fahrzeug in `vehicles/<name>.js` (`car.js`, `tractor.js`), Kern `vehicles/vehicle.js` (Physik, Kollision,
  Kameras, Licht, HUD), Töne `vehicles/vsound.js`; Anleitung ARCHITECTURE.md Abschnitt 11/12. Test `v16b.py`.
- **Straßen und Wege**: `python3 tools/geo/build_roads.py` (braucht die Geo-Originale unter `<repo>/geo` bzw. `PAV_GEO`), dann
  `geo/out/pub/roads.b64.json` nach `viz3/dist/geo/` kopieren und in `viz3/manifests.json` `geoman.roads` aus `geo/out/pub/geo.json` übernehmen
  (oder Voll-Build). Aussehen der Straßen: GLSL in `world/roads.js` (`roadShade`, `landDetail`).
- **Dorf** (V16e): Stil eines Hauses in `world/village.js` `styleOf` (nach Gebäudenummer festlegbar, z. B. die Schule 215); Fassadenbild im GLSL von
  `wallMat`, Dächer in `roofOf`; Wahrzeichen und Laternen in `world/village_props.js` (Lage in Grundstücks-Koordinaten, Fotostandorte im Kopf
  von `test/v16e.py`); Zäune, Tonnen usw. in `world/village_near.js` `house()`. Gebäudenummer an einer Stelle: im Testserver
  `VILLAGE.bld.filter(b => Math.hypot(b.cx - x, b.cy - y) < 20)`. Test `v16e.py`.
- **Oberfläche**: Menü-Einträge `shell/menu.html`, HUD-Knöpfe `shell/panel_3d.html`, Fenster-Container `shell/windows.html`, Stil im passenden `shell/css/*.css`, Hinweise „Was das Modell zeigt“ `shell/notes.html`.
