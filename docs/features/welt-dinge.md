# Autos, Stellplätze und Dinge aus dem Luftbild in 3D (`welt-dinge`)

Hilfs-Agent `welt-dinge` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, Nacht 5./6.11.2026, Branch `feat/welt-dinge`
(Auftrag `docs/plans/auftraege/welt-dinge.md`, gemeinsame Regeln `nacht-6-11-gemeinsam.md`).

Falko (5.11. 22:52): Autos und Parkplätze, über die man als flaches Bild läuft, sollen in 3D an ihrer echten Stelle stehen; (23:02) die Autos
des Luftbilds als **Stellplätze, belebt nach Tageszeit**; (23:17) „Wichtig ist … immer der Realismus“.

## Was es gibt

- **Erkennung** (`tools/welt-dinge/`): das Luftbild Thüringen 2024 (DOP 20 cm, Flug 07.04.2024, WMS der GDI-Th) des Dorfs auf Modellachsen
  (`wdlib.fetch`), darauf ein vortrainierter Luftbild-Detektor (Ultralytics YOLO11-OBB, DOTA v1: „small/large vehicle“, „swimming pool“ …)
  in drei Durchgängen (`detect.py`: Modell m bei 0,1 m/px, m bei 0,2 m/px, l bei 0,1 m/px), zusammengeführt und als Kontaktbögen von Auge
  geprüft (`review.py`); die Entscheidungen stehen in `viz3/extra/welt-dinge/pruefung_ratscher.json` (ja mit Art, nein mit Lage).
  `prep.py` macht daraus die Spieldaten `viz3/extra/welt-dinge/dist/dinge/ratscher.json` und die Masken `maske_dinge.json`.
- **Stellplätze** (`viz3/src/dinge/dinge.js`, `DINGE`): jedes geprüfte Auto ist ein Platz – Einfahrt/Hof (`hof`), Straßenrand (`strasse`,
  Lage zur OSM-Straße) oder Betriebshof (`betrieb`: Agrargenossenschaft westlich des Gartens, Höfe am Ostende). Ob dort gerade ein Auto steht,
  folgt Wochentag und Stunde (Kurven je Art: werktags fahren Pendler 6–8 Uhr weg und kommen 15:30–18:30 zurück, Betriebshöfe sind werktags
  voll, sonntags bleiben die meisten daheim); dieselben Plätze sind eher die der Pendler (Gewohnheit), der Rest wechselt von Tag zu Tag.
  Ein Auto kommt oder geht **nur, wo es niemand sieht** (außer Sicht oder weiter als 320 m; im Blickfeld oder näher als 14 m bleibt es).
  Das Auto behält Bauart (aus der Länge: Kleinwagen, Kompakt, Kombi/SUV, Transporter) und Farbe aus dem Foto (Dunst abgezogen, dann die
  nächste der üblichen Farben).
- **Modelle** (`viz3/src/dinge/dinge_modelle.js`, `DMOD`): fünf Bauarten ohne Marke in echten Außenmaßen, Dinge (Pool rund/eckig, Anhänger,
  Wohnwagen, Traktor, Lkw, Rund-/Quaderballen, Holzstapel, Stammholz, Trampolin, Container). Ein Material (`plain()`), Lackfarbe als
  Instanzfarbe nur auf reinweißen Ecken; seine zwei Programme werden beim Laden mit der Szene übersetzt (unsichtbare Warm-Meshes).
- Je 120-m-Zelle gebaut, wenn man näher als 380 m kommt (Telefon 260 m), frei ab +160 m; Autos instanziert (ein Draw-Call je Bauart und
  Zelle), Dinge zusammengefasst. Fest für Gehende und Fahrzeuge (`VEH.extra`). In der Zombie-Nacht bleiben sie, wie sie sind.
  Steht ein Dorfauto (`dorf/dorf_cars.js`) auf demselben Platz, bleibt unseres weg.

## Benutzen und testen

- Im Spiel einfach ins Dorf gehen; `DINGE.state()` (Zahlen), `DINGE.info(i)`, `DINGE.share(art, t)`, `DINGE.settle()` (alles Nahe bauen).
- Test: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8998 --serve welt_dinge` (Bilder in `out/welt_dinge/`); auf GitHub über
  `viz3/extra/welt-dinge/tests.txt`.
- Daten neu machen: Luftbild holen (`wdlib.fetch(-260, 520, -460, 60, 0.1, 'th_dop', 0.1, cache=…)`), `detect.py` (Ultralytics in einer
  eigenen venv), `review.py`, Entscheidungen eintragen, `prep.py ratscher <bild> -260 60 0.1`.

## Offen

- Die Masken nimmt die Boden-Retusche von `welt-gebaeude`; bis beide zusammengeführt sind, zeigt das Bodenbild die flachen Autos noch
  (neben den 3D-Autos bzw. auf gerade leeren Plätzen).
- Weitere Orte im Quadrat, Schleusingen, die Straßen; mehr Dinge (Holzstapel, Ballen …) von Auge; fahrende Autos (`verkehr`) sehen die
  geparkten noch nicht.

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/welt-dinge` vor `# feat/verkehr` (zwei Module, Ordner `viz3/src/dinge/`).
- Quellen: `credits_add` in `viz3/extra/welt-dinge/manifest.json` (DOP 2024 © GDI-Th dl-de/by-2-0, YOLO11-OBB, OSM).
