# Abstimmung: wer arbeitet woran

Seit 22.10.2026 abends arbeitet **ein Chat** mit Falko: der **Kern-Chat**. Parallele Arbeit erledigen **Hilfs-Agenten**, die der Kern-Chat
startet, steuert und prüft – Falko muss nichts zwischen Chats hin- und hertragen. Diese Datei hält fest, wer gerade woran arbeitet, damit sich
Agenten und spätere Chats nicht in die Quere kommen. Alte Belegungen und Nachrichten (V16b–V16e, parallele Chats): Git-Verlauf dieser Datei
(`git log -p -- docs/PARALLEL.md`, Stand vor dem Verschlanken: Commit 8717e2d).

- **Lesen**: beim Start und vor jedem Push auf `src`: `git fetch -q origin && git show origin/src:docs/PARALLEL.md`.
- **Ändern**: nur über Git auf `src` (Commit „PARALLEL: …“).

## Belegung

| Thema | Wer | Branch | Stand | Dateien |
|---|---|---|---|---|
| Umbau Phase 0–2 (Plan: Projektdokument `claude/pavillon-umbau.md`) | Kern-Chat, session_01GdUYaP2XXAAEDXZpGWVkBm | `kern/*` → `src` | Phase 0 live (V16f, 22.10. 23:44), Phase 1 live (V16g, 23.10. 2:20); Falkos Wünsche der Nacht mit acht Hilfs-Agenten live als V16h–V16k (23.10. 3:30–6:27); Phase 2 (`docs/plans/plan_phase2.md`) ab 23.10. 9:30: Baustein 1 auf `src` (10:40), Bausteine 2 und 3 begonnen (ein Tagebuch, `?szenario=`); Start in Bauphase 0 (Falko 9:54); Zwischenstände auf `wip/kern`, Prüfläufe auf `kern/phase2`; Datenvertrag des Gartenplaners `viz3/src/gplan/gplan_schema.js` | alles außer den Welt-Ordnern und den Ordnern der Agenten |
| Welt Woche 1: Quellen je Land, Testgebiet in GitHub Actions, Straßen als eigenes Bauteil, eigene Ansicht (Auftrag `claude/pavillon-welt.md`) | Hilfs-Agent des Kern-Chats | `welt/woche1` | Woche 1 fertig (23.10. 0:15, d3f5cd0), auf `src` zusammengeführt (2:05); offen: Thüringer DGM1/DOM1 (Server-Wartung, CAPTCHA), R2-Zugang von Falko | `tools/welt/**`, `viz3/welt-viewer/**`, `.github/workflows/welt-*.yml`, auf `gh-pages` nur `welt-test/` |
| Garten: Türen, Dach, Bungalow mit Anbau, Hütte, Gewächshaus, Einrichtung (`docs/plans/plan_leben.md` 4) | Hilfs-Agent `garten` | `feat/garten` | fertig 23.10. 5:20 (03b5c2e, in `src`) | `garden/bungalow.js`, `holzhaus.js`, `greenhouse.js`, neue `garden/*_in.js`, `garden/places.js`, `viz3/extra/garten/`, `shell/css/garten.css`, `viz3/test/garten*.py`; Port 8971 |
| Spielfiguren Falko, Sarah, Christoph (3) | Hilfs-Agent `figuren` | `feat/figuren` | fertig 23.10. 4:55 (18b223d, in `src`) | `game/avatar.js`, `tools/player/`, Figurenwahl in `shell/menu.html`, `viz3/extra/figuren/`, `shell/css/figuren.css`, `viz3/test/figuren*.py`; Port 8972 |
| Nachbarn: Huberts Hof, Alltag, Ziegen nach Süden, Mähen, Gespräche, Aufgaben (1) | Hilfs-Agent `nachbarn` | `feat/nachbarn` | fertig 23.10. 4:45 (f112d2f, in `src`); offen: Laufzeit-Haken in die Besitzer-Dateien (`docs/features/nachbarn.md`) | `npc/*`, `game/quests.js`, neue `garden/hof_*.js`, `viz3/extra/nachbarn/`, `shell/css/nachbarn.css`, `viz3/test/nachbarn*.py`; Port 8973 |
| Dorfleben: Skatabend in der alten Schule, Feuer am Acker, Dorfbewohner (2) | Hilfs-Agent `dorf` | `feat/dorf-leben` (`feat/dorf` ist ein alter Zweig des V16e-Chats) | fertig 23.10. 5:30 (9de80ff, in `src`) | neuer Ordner `viz3/src/dorf/`, `world/village*.js`, `viz3/extra/dorf/`, `shell/css/dorf.css`, `viz3/test/dorf*.py`; Port 8974 |
| Rückewinde am Traktor: Stamm aus dem Bestand an den Weg ziehen, Hinweise beim Laden (Falko 2:24) | Hilfs-Agent `winde` | `feat/winde` | fertig 23.10. 4:50 (f8af1b5, in `src`) | `vehicles/tractor.js`, `werk/holz*.js`, `world/fell.js` (Hinweise, Übergabe), neues `werk/winde.js`, `viz3/extra/winde/`, `shell/css/winde.css`, `viz3/test/winde*.py`; Port 8975 |
| Kleine Bäume weichen Fahrzeugen: biegen sich, kippen um (Falko 2:52) | Hilfs-Agent `baeume` | `feat/baeume` | fertig 23.10. 5:15 (49f1375, in `src`) | `world/worldcol.js`, Bauminstanzen in `world/ratscher.js`, `world/forest.js`, kleine Gartenbäume `garden/trees.js`, neues `world/treehit.js`, kleiner Haken in `vehicles/vehicle.js`, `viz3/extra/baeume/`, `viz3/test/baeume*.py`; Port 8976 |
| Schleusingen begehbar und detailliert nach Fotos, Rathaus zum Betreten (Falko 2:58) | Hilfs-Agent `schleusingen` | `feat/schleusingen` (+ `welt/woche2` für die Daten) | fertig 23.10. 6:00 (7477edd, in `src`); offen: Fahrzeuge über das 2,4-km-Quadrat hinaus (`KERN.free` in `vehicles/vehicle.js`) | neuer Ordner `viz3/src/welt/` bzw. `world/schleusingen*.js`, `tools/welt/**`, `viz3/extra/schleusingen/`, `shell/css/schleusingen.css`, ein Eintrag Orte → „Schleusingen“, `viz3/test/schleusingen*.py`; Port 8977 |
| Ortsvorsteher: Wahlkampf mit Ansehen je Person, Wahl, Amt, Anliegen ins Rathaus Schleusingen (Falko 2:57) | Hilfs-Agent `ortsvorsteher` | `feat/ortsvorsteher` | fertig 23.10. 5:00 (c87d6e0, in `src`) | neuer Ordner `viz3/src/amt/`, `viz3/extra/amt/`, `shell/css/amt.css`, `viz3/test/amt*.py`, `viz3/test/unit/amt.test.mjs`; kleine Haken am Ende von `dorf/dorf.js`/`dorf_text.js`; Port 8978 |
| Gartenplaner: Pflanzen setzen in Draufsicht und vor Ort, Wachsen über Jahre, Schatten, Warnungen, Gilden, Pflanz- und Einkaufsliste (`claude/pavillon-gartenplaner.md`, Meilensteine 1 und 4) | Hilfs-Agent `gartenplaner` | `feat/gartenplaner` | gestartet 23.10. 9:20 (Auftrag `docs/plans/auftraege/gartenplaner.md`) | `viz3/src/gplan/*` (außer `gplan_schema.js`), `viz3/extra/gartenplaner/`, `shell/css/gartenplaner.css`, `viz3/test/gartenplaner*.py`, `viz3/test/unit/gplan_*.test.mjs` (außer `gplan_schema.test.mjs`), ein Menüeintrag, eine Zeile in `core/save.js`; Port 8979 |
| Pflanzen-Datenbank: 30–50 Arten und Sorten mit Quellen, Grenzabstände nach ThürNRG, Gilden (Daten im Vertrag `gplan/gplan_schema.js`) | Hilfs-Agent `pflanzen` | `feat/pflanzen` | fertig 23.10. 10:40 (7270bcf, in `src`; Vorschläge für den Datenvertrag in `docs/features/pflanzen.md`) | `viz3/extra/pflanzen/` (`dist/gartenplaner/pflanzen.json`, `regeln.json`, `gilden.json`), `viz3/test/unit/pflanzen.test.mjs`, `docs/features/pflanzen.md`; kein Browser |
| Kloster Veßra begehbar: Klosteranlage, Ort, Baumschule (Detailzone aus `claude/pavillon-welt.md`, für den Gartenplaner) | Hilfs-Agent `vessra` | `feat/vessra` (+ `welt/vessra` für die Kacheln) | gestartet 23.10. 9:20 (Auftrag `docs/plans/auftraege/vessra.md`) | `viz3/src/welt/vessra.js` (unter `# feat/vessra`), kleine Änderungen an `welt/welt.js`, `tools/welt/zone_vessra.py` und der Kachel-Plan für Veßra, eigener Workflow, `viz3/extra/vessra/`, `shell/css/vessra.css`, `viz3/test/vessra*.py`, ein Eintrag Orte → „Kloster Veßra“; Port 8981 |
| Hinfahren: Fahrzeuge aus dem 2,4-km-Quadrat heraus nach Schleusingen und Kloster Veßra, Gelände beim Fahren nachladen, Orts- und Wegweiserschilder (Falko 9:27) | Hilfs-Agent `fahrt` | `feat/fahrt` | gestartet 23.10. 9:30 (Auftrag `docs/plans/auftraege/fahrt.md`) | neues `viz3/src/welt/fahrt.js` (unter `# feat/fahrt` nach `vehicles/minimap.js`), Kartenrand in `vehicles/vehicle.js`, `vehicles/minimap.js` (klein), wenige markierte Zeilen in `welt/welt.js`, `viz3/extra/fahrt/`, `viz3/test/fahrt*.py`, `docs/features/fahrt.md`; Port 8982 |
| Einrichtung der Gartengebäude mit einem Klick umstellen (Stile, Akzentfarben), Holzhaus als Atelier (Töpfern, Malen, Schaukelstuhl, Klappsofa als Gästebett), Wohnwagen gespiegelt – Bett rechts (Falko 9:54) | Hilfs-Agent `einrichtung` | `feat/einrichtung` | gestartet 23.10. 10:10 (Auftrag `docs/plans/auftraege/einrichtung.md`) | `garden/holzhaus.js` (innen), `garden/garten_in.js`, `garden/garten_kit.js`, Wohnwagen innen in `garden/carport.js`, Bungalow innen in `garden/bungalow.js`, neue Module unter `garden/garten_in.js`, `viz3/extra/einrichtung/`, `shell/css/einrichtung.css`, `viz3/test/einrichtung*.py`, `docs/features/einrichtung.md`, ein Menüeintrag, eine Zeile in `core/save.js`; Port 8983 |

## Absprachen

1. `src` ändert nur der Kern-Chat (Agenten liefern auf eigenen Branches, der Kern-Chat prüft und führt zusammen).
2. Agenten arbeiten nur in ihren Ordnern; was sie darüber hinaus brauchen, melden sie dem Kern-Chat.
3. Browser im Chat-Rechner nie zwei gleichzeitig (2 Kerne, SwiftShader verliert sonst den WebGL-Kontext): jeder Browserlauf – auch der
   Agenten – über `bash tools/browser_lock.sh …` und mit eigenem Port (`run.py --port 89xx --serve …`). Längere Prüfungen und Bilder auf
   GitHub Actions: `.github/workflows/feat.yml` läuft bei jedem Push auf `feat/**` (Schnellprüfung, smoke, Tests aus
   `viz3/extra/*/tests.txt`) und hebt `out/` als Artefakt auf (`gh run download`). Eigene kleine Dateien: `viz3/extra/<thema>/`
   (`viz3/extra/README.md`). Neue Module nur unter der eigenen Marke `# feat/<thema>` in `modules.txt`.
4. Veröffentlichen über GitHub Actions: nach grünem Prüfpaket kommt die Vorschau nach `/vorschau/`; seit 23.10. 1:05 (Falko) geht ein
   grün getesteter Stand vom Kern-Chat direkt live (`git push origin src:live`, `docs/WORKFLOW.md`, Abschnitt 4). Der Notweg aus dem Chat (`deploy_push.sh`) nur durch den Kern-Chat.
5. Gespeichertes nur über `SAVE` (`core/save.js`), Code formatiert (Prettier), `bash tools/check.sh` vor jedem Push.
6. Originale und Rohdaten: übergangsweise im privaten Repo `mynametouse/klingenholz-konfigurator`, Zweig `pavillon-originale` (Umzug ins
   eigene private Repo `pavillon-ratscher-assets`, sobald es existiert). Keine Schlüssel, keine Flurstücks- oder privaten Rohdaten ins
   öffentliche Repo.
7. Projekt-Dokumente im Claude-Projekt „Garten“ vor jedem Schreiben neu lesen (`project_write` ersetzt das ganze Dokument).
8. Daten des Gartenplaners: Felder und Prüfung stehen im Vertrag `viz3/src/gplan/gplan_schema.js` (Kern-Chat); Planer und Datenbank halten
   sich daran, Änderungen nur über den Kern-Chat (Testdaten: `viz3/test/unit/fixtures/gplan_mini.json`).

## Nachrichten (neueste oben)

- 23.10. 10:40 Kern: Phase 2, Baustein 1 ist auf `src` – neue Dienste in `core/kern.js` (`docs/ARCHITECTURE.md`, „Dienste für Erweiterungen“):
  `KERN.place`-Anbieter/`KERN.area`, `KERN.spot`, `KERN.act`, `KERN.on/emit`, `KERN.zone` (Beispiel `welt/schleusingen.js`), `KERN.until`,
  `KERN.lights.borrow`, `KERN.where`, `KERN.scenario` (`?szenario=…`), `KERN.tasks.source` (ein Tagebuch, J). `GAME.step` treibt `KERN.update`.
  Agenten: `git fetch origin && git merge origin/src`, neue Orte, Sprungziele, Aktionen, Zonen, Lampen, Startsituationen und Aufgaben über diese
  Dienste. Die Seite startet jetzt in Bauphase 0 (alte Garage); auf dem Testserver wie bisher fertig, `?bauphase=0` zeigt den echten Start.
  Die Pflanzen-Datenbank (`feat/pflanzen`) ist auf `src`.

- 23.10. 10:10 Kern: Falko (9:54): Start in Bauphase 0 (alte Garage statt Pavillon) – baut der Kern-Chat (`boot/boot.js`, Lampen bleiben
  sichtbar und werden über die Stärke geschaltet, `?bauphase=`; auf dem Testserver beginnt es wie bisher fertig). Einrichtung der Gartengebäude
  mit Stilen, Atelier, Klappsofa, Wohnwagen gespiegelt – Agent `einrichtung`.

- 23.10. 09:45 Kern: Falko (9:27): die Baumschule heißt im Modell „Baumschule Kammbach“; Hinfahren kommt dazu (Agent `fahrt`, Veßra-Agent baut
  die Kacheln für die Strecke mit). Falko (9:38): so dokumentieren, dass ein Absturz des Chats nichts kostet – Aufträge der Agenten jetzt
  wörtlich in `docs/plans/auftraege/`, Wiederanlauf in `docs/WORKFLOW.md`, Abschnitt 5; `bash tools/agents.sh`.
- 23.10. 09:20 Kern: Falko fragt nach Gartenplaner und Kloster Veßra – drei Hilfs-Agenten starten (Planer, Pflanzen-Datenbank, Veßra), parallel
  zu Phase 2. Der Datenvertrag liegt auf `src` (`gplan/gplan_schema.js`, Unit-Test `gplan_schema.test.mjs`).

- 23.10. 00:10 Kern: Die Nachbarn heißen wieder Hubert und Ronald (Falko, 22.10. 23:28; die Umbenennung in Günter/Bernd ist zurückgenommen,
  gespeicherte Stände mit `bernd` werden zurück übersetzt). Beide sind jetzt Rocketbox-Figuren wie die Spielfigur (`tools/player/build_npc.sh`).
- 22.10. 22:20 Kern: Datei verschlankt – ab jetzt ein Chat mit Hilfs-Agenten (Falko, 21:54). Klinge- und Dorf-Chat sind fertig (V16d und V16b6
  veröffentlicht); der Klinge-Chat sichert noch seine Originale (Anleitung: Nachrichten 21:15 und 21:30 im Verlauf dieser Datei).
