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

**Schnellprüfung und Testläufer (Umbau Phase 0, Plan im Projektdokument `claude/pavillon-umbau.md`):**

```bash
bash tools/check.sh                              # ohne Browser, ~10 s: Build, Lint (Datei:Zeile), Testskripte, Format-Bericht, Abhängigkeiten
python3 viz3/test/run.py --serve smoke           # Browser-Tests nacheinander: je Test PASS/FAIL in einer Zeile, Exit-Code, Logs in out/run/
python3 viz3/test/run.py --serve gate            # Prüfpaket vor dem Veröffentlichen: smoke gpu softgl loadlog
# bei GitHub läuft bei jedem Stand auf src das ganze Prüfpaket gleichzeitig (.github/workflows/pruefpaket.yml):
#   smoke gpu softgl loadlog memphone savefuzz + Straßen (Wellen je km) + Safari-Engine (Versuch)
```

- Vor jedem Push `tools/check.sh`. Neue Tests melden über `ck = lib.Checks('name')`, `ck('was', bedingung, info)`, `ck.errors(errs)`, `ck.done()`
  (Ergebniszeile `RESULT`, Exit-Code 1 bei Fehlern); ältere Tests beurteilt `run.py` nach Exit-Code, Zeitlimit, `FAIL`-Zeilen, `PAGEERR` und Tracebacks.
- GitHub Actions (`.github/workflows/check.yml`) führt bei jedem Push auf `src`, `kern/*`, `feat/*`, `fix/*`, `perf/*` dieselbe Schnellprüfung und den
  Kurztest aus (reine Doku-Commits nicht); Ergebnis: `gh run list -R mynametouse/pavillon-ratscher --branch <zweig>`.

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
| savefuzz.py | **Kaputte Spielstände** (Umbau Phase 0): jeder gespeicherte Schlüssel mit Unsinn belegt (kein JSON, falsche Typen, NaN, alte Namen) – die Seite startet trotzdem, `SAVE.problems` zählt, was ignoriert wurde | 6 min |
| webkit.py | **Safari-Engine** (WebKit, iPhone-13-Profil): lädt ohne Fehler, Renderer und Ladezeit; im Prüfpaket bei GitHub als Versuch | 5 min |
| memphone.py | **Speicher wie am iPhone** (V16b6): iPhone-13-Kontext ohne Stufen-Voreinstellung – Texturen halbiert, entpackte Bilder < 350 MB; nach einem abgebrochenen Versuch Viertel (gemerkt); Prozess-Speicher (ps). `texhalf.py`: dieselben Bilder mit `?tex=full` und `?tex=half` – halbierte Texturen sehen gleich aus (mittlere Abweichung < 8) | 4 + 5 min |
| fellcrash.py | **Absturz nach dem Fällen** (V16b5): Baum aus den Kollisionen genommen, Traktor fährt zum Stubben (von Hand gesteppt und mit echter Bildschleife), Zustand bleibt endlich; NaN im Ton verworfen, NaN im Fahrzeug zurückgesetzt, Fehler in einem Bild nach dem Laden: keine Lademeldung, Bilder laufen weiter, Hinweis und Protokoll | 4 min |
| loadlog.py | **Laden Schritt für Schritt** (V16b4): Aufbau gezählt, Sekunden unter der Ladeanzeige, Ladeprotokoll geschlossen, nach einem abgebrochenen Versuch Hinweis, wo er stand; `loadprof.py`: Zeitachse der Ladeanzeige, CPU-Profil je Funktion, Programme | 6 min |
| softgl.py | **Laden ohne Grafikkarte** (V16b2/V16b3): ohne Stufen-Voreinstellung, Software-Grafik erkannt, gleich „schnell“, Vorbereitung < 3 min, Ladeanzeige bleibt nicht bei „100 %“ stehen und zählt die Shader, Seite bleibt beim Vorbereiten ansprechbar (≤ 20 s am Stück: das erste Bild), Hinweis | 5 min |
| gpu.py | **GPU-Grenzen**: höchstens 16 Texturen je Shader-Programm (wie auf Laptops/Macs/Telefonen), kein Programm kaputt, Boden an 7 Orten tags und nachts sichtbar (kein Himmel im unteren Bilddrittel), dazu Innenraum, Werkstatt, Auto, Draufsicht. **Vor jeder Veröffentlichung**, bei neuen Texturen in Shadern immer | 6 min |
| v15b.py | Werkstatt-Spiel komplett vom Leimholz bis zum geölten Brett (Regression) | 20 min |
| v15b_reload.py | Spielstand speichern/laden, Handy-Ansicht | 15 min |
| v16a.py, v16a_b.py, v16a_c.py | Tag/Nacht: Stunden, Mondphasen, Draufsicht nachts, Nachbarn nachts, Oktober | je 10–20 min |
| v16b.py | Fahrzeuge: Einsteigen, Gas/Bremse/rückwärts, Hauswand, Route Garten → Klinge mit Ortsnamen, Aussteigen und Gehen im Gelände, Traktor mit Frontlader, Licht nachts, HUD mit Karte, Zurückstellen, Telefon (Antippen, Kreis, Platz der Anzeigen) (Abschnitte: `car,drive,crash,route,walk,tractor,night,ui,phone`) | 20–30 min |
| v16e.py | Dorf nach Fotos: Stile und Dächer aller Gebäude, Schule mit Uhr (folgt der Spielzeit), Dorflinde (Messbäume ausgeblendet), Laternen, Ortsnamen, Menüort „Dorf“, Nahdetails laden/verwerfen, Kollision Brunnen/Laternen/Linde, Nacht (Fenster, Laternen, Licht an Wänden), Bilder von den Fotostellen, Texturen je Shader (Abschnitte: `load,places,near,walk,night,shots,gl`) | 10–15 min |
| v16c.py | Wald an der Klinge: Bestand (Bäume, Arten, Kern), Ansichten (Waldrand, Familienwald, Bestand, Blick nach oben, Drohne, Felder), Gehen zwischen Stämmen (Ortsname, Waldton, Stamm hält auf), Traktor auf dem Waldweg und am Stamm, Lärche nach Jahreszeit, Nacht, Telefon; Abschnitte `stand,views,walk,tractor,season,night,phone` (+ `fell` ab V16c2) | 20–30 min |
| v16d.py | Holz (V16d): Anhänger (kuppeln, ziehen, Knickgrenze, abgestellt als Hindernis), mit Anhänger vom Feldweg über die Gartenbrücke bis ans Holzlager (kein Rad im Bach, nichts gerammt), Stamm auf den Anhänger und durch Öffnen der Rungen ins Holzlager, Gabel → Blockbandsäge, Einschnitt Brett für Brett, Trockenstapel, Feuchtemesser, Zeitraffer; Bilder in `out/v16d/`. Abschnitte einzeln: `python3 viz3/test/v16d.py 8954 bridge,load` (~5–8 min je Abschnitt) |
| prof.py, loadtime.py | Kosten pro Frame (TICKS), Draw-Calls/Speicher; Ladezeiten | 10 min |
| gi.py, bake.py | GI- und Himmelssichtbarkeits-Volumen backen | lang |

Galeriebilder, 360°-Rundblicke, Raumführung und Zeitraffer-Video werden nicht mehr gepflegt (Falko, 22.10.2026): die Skripte dafür sind entfernt,
die vorhandenen Bilder bleiben auf der Website (`img/`, `pano/`, `tour.mp4` liegen nur auf `gh-pages`).

- Zwei CPU-Kerne: nicht mehrere Browser-Tests gleichzeitig laufen lassen (SwiftShader verliert sonst den WebGL-Kontext).
- **Windows misst anders** (V16b3): Chrome übersetzt dort jeden Shader über Direct3D (0,3–1,4 s je Programm ohne Grafikkarte), SwiftShader hier nicht. Wer viele neue Materialien/Shader bringt, prüft das Laden vor dem Veröffentlichen zusätzlich im Chrome des Owners (Claude in Chrome, Testseite mit `window.ASSET_BASE` auf die Website, siehe Branch `test/softgl`): Zeitstrahl der Ladeanzeige und Lücken > 1,5 s mitschreiben.

## 4 Veröffentlichen (seit Umbau Phase 0: Vorschau zuerst)

1. **Push auf `src`** → GitHub Actions: Schnellprüfung, dann das **Prüfpaket gleichzeitig** (`.github/workflows/pruefpaket.yml`: smoke, gpu,
   softgl, loadlog, memphone, savefuzz, Straßen; Safari-Engine als Versuch). Sind alle grün, schreibt der Job „Vorschau veröffentlichen“
   den Stand nach **https://mynametouse.github.io/pavillon-ratscher/vorschau/** (oben ein Hinweis „Vorschau“; der veröffentlichte Plan wird
   mitkopiert, die normale Seite bleibt unverändert).
2. Falko schaut sich die Vorschau an (Laptop, iPhone). **Live stellen:** GitHub → Actions → „Live stellen“ → Run workflow (Versionsname
   eintragen) – oder der Kern-Chat startet es. Die Website wird aus `src` neu gebaut; `plan.json`, `vorschau/` und `welt-test/` bleiben.
3. `docs/CHANGELOG.md` ergänzen (nächste freie Nummer), Projekt-Dokument `claude/pavillon-ratscher-stand.md` nachtragen.
4. **Notweg aus dem Chat** (z. B. wenn neue Asset-Dateien nur im Chat liegen – sie stehen nicht im Repo, die Asset-Basis ist die Website):
   `cd viz3 && python3 build.py --fast --min && rm -rf dist_pub && cp -a dist dist_pub`, dann
   `VORSCHAU=1 COMMIT_TRAILER="<Zuordnungszeilen>" bash deploy_push.sh "V…: …"` (Vorschau) und ohne `VORSCHAU` (live). Danach erst `src` pushen,
   damit die Actions-Vorschau schon die neuen Dateien als Basis hat.
- Das Artefakt in Claude wird nicht mehr aktualisiert (Falko, 22.10.2026); es bleibt auf V16d.
- Galeriebilder, 360°-Rundblicke und Raumführung werden nicht mehr erzeugt (Falko, 22.10.2026).

## 5 Parallel arbeiten (ein Chat, Hilfs-Agenten)

- Seit 22.10.2026 arbeitet **ein Chat** (Kern-Chat) mit Falko. Parallele Arbeit erledigen **Hilfs-Agenten**, die er startet: je Thema ein
  Branch (`welt/…`, `feat/…`) in einem eigenen Worktree (`git worktree add ../<name> -b <branch> src`, mit eigener Kopie von `viz3/dist`,
  sonst überschreibt ein Build die Dateien eines laufenden Tests). Wer woran arbeitet: `docs/PARALLEL.md` auf `src`.
- **Nur im eigenen Bereich ändern**: eigener Ordner (unter `viz3/src/` oder `tools/`), eigene Tests, eigene Zeilen in `modules.txt`.
  Gemeinsame Dateien (`modules.txt`, `shell/*`, `build.py`/`buildlib/`, `manifests.json`, `boot/boot.js`, `game/game.js`, `core/*`, Dokumente)
  ändert der Kern-Chat. Neue `window`-Namen und Speicher-Schlüssel in ARCHITECTURE.md bzw. `core/save.js` eintragen.
- **Zusammenführen** (Kern-Chat): `git fetch origin && git rebase origin/src`, `bash tools/check.sh` und die betroffenen Tests, dann
  `src` vorspulen und pushen – GitHub prüft und baut die Vorschau (Abschnitt 4).
- Browser-Tests im Chat-Rechner nie zwei gleichzeitig (2 Kerne); Agenten testen im Browser bei GitHub Actions.
- Versionsnummern: nächste freie Nummer aus `docs/CHANGELOG.md` beim Live-Stellen vergeben.
- Arbeitsstand für Menschen: Projekt-Dokumente `claude/pavillon-umbau.md` (Plan und Stand) und `claude/pavillon-ratscher-stand.md`.

## 6 Regeln

- Keine Schlüssel/Passwörter ins Repo (der GitHub-Schlüssel für „Plan veröffentlichen“ liegt nur im Browser des Eigentümers).
- Keine Recherche-Rohdaten mit Flurstücken oder privaten Fotos ins Repo; Geodaten nur aufbereitet (wie in `dist/geo`).
- Lizenzen: jede Fremdquelle mit Namensnennung in `buildlib/credits.py`; Lizenztexte, die mitgeliefert werden müssen, stehen dort (MIT Rocketbox, BSD d3-celestial).
- Code-Kommentare Englisch, Oberfläche Deutsch. Einheiten: Meter, Grad, Minuten Spielzeit.
- Gespeichertes nur über `SAVE` (`core/save.js`), nie direkt `localStorage`: Schlüssel dort eintragen, beim Lesen jeden Wert prüfen
  (Lehre V16b4); `test/savefuzz.py` belegt alle Schlüssel mit Unsinn – die Seite muss trotzdem starten.
- Code formatiert Prettier (`viz3/.prettierrc.json`, 120 Zeichen); `bash tools/check.sh` prüft das vor jedem Push.
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
