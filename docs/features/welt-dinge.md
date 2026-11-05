# Autos, Stellplätze und Dinge aus dem Luftbild in 3D (`welt-dinge`)

Hilfs-Agent `welt-dinge` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, Nacht 5./6.11.2026, Branch `feat/welt-dinge`
(Auftrag `docs/plans/auftraege/welt-dinge.md`, gemeinsame Regeln `nacht-6-11-gemeinsam.md`).

Falko (5.11. 22:52): Autos und Parkplätze, über die man als flaches Bild läuft, sollen in 3D an ihrer echten Stelle stehen; (23:02) die Autos
des Luftbilds als **Stellplätze, belebt nach Tageszeit**; (23:17) „Wichtig ist … immer der Realismus“.

## Was es gibt

- **Gebiete** (je eine Datei `dist/dinge/<gebiet>.json`, geladen, wenn man näher als r an die Mitte kommt): `ratscher` (das Dorf, die
  Agrargenossenschaft mit zwei Güllebehältern, die ETHOS nicht kennt, der Holzlagerplatz), `schleusingen` (die Stadt), `geisenhoehn` (das Dorf im Westen des Quadrats), `talsperre`
  (Campingplatz an der Talsperre Ratscher) – siehe „Stand“ unten, was davon schon Daten hat.
- **Erkennung** (`tools/welt-dinge/`): das Luftbild Thüringen 2024 (DOP 20 cm, Flug 07.04.2024 – dasselbe Bild wie das Bodenbild des
  Spiels `ortho_near.jpg`) auf Modellachsen über den WMS der GDI-Th (`wdlib.fetch`), darauf ein vortrainierter Luftbild-Detektor
  (Ultralytics YOLO11-OBB auf DOTA v1: „small/large vehicle“, „swimming pool“, „storage tank“ …; `detect.py`). Ratscher: fünf Durchgänge
  (Modell m/l, 0,1 und 0,2 m/px, niedrige Schwellen), jeder Kandidat auf Kontaktbögen von Auge geprüft (`review.py`), dazu von Auge gesetzt:
  Holzlagerplatz südlich der Hauptstraße, die fünf Güllebehälter der Agrargenossenschaft, ein Anhänger. Größere Gebiete (Stadt) nach
  Regeln aus dem Dorf (`decide.py`: „small vehicle“ ≥ 0,4 war im Dorf immer ein Auto), eine Stichprobe und die Zweifelsfälle von Auge.
  Entscheidungen: `viz3/extra/welt-dinge/pruefung_<gebiet>.json` (`ja` mit Art, `nein` mit Lage, `dazu` von Auge).
  `prep.py` macht daraus die Spieldaten und die Masken. **Nichts auf Gebäuden** (Lead, 6.11. ~0:00): was zu mehr als einem Viertel auf
  einem Grundriss steht, der in 3D gebaut wird – OSM-Gebäude von Ratscher, Altstadt Schleusingen, die ETHOS-Gebäude von `welt-gebaeude`
  (`--geb <ordner>` mit dessen `dist/gebaeude/`, nach dem Zusammenführen aus dem eigenen Checkout) –, fällt weg samt Maske (in Ratscher
  drei der fünf Güllebehälter, die `welt-gebaeude` mit echtem Umriss und Höhe baut, und ein Auto unter einem Carport).
- **Stellplätze** (`viz3/src/dinge/dinge.js`, `DINGE`): jedes Auto ist ein Platz – Einfahrt/Hof (`hof`), Straßenrand (`strasse`, Mitte
  höchstens 2,5 m außerhalb des OSM-Fahrbahnrands), Betriebshof (`betrieb`) oder Straßenrand in der Stadt (`stadt`). Ob gerade ein Auto
  dort steht, folgt Wochentag und Stunde (Kurven je Art in `CURVES`: werktags fahren Pendler 6–8 Uhr weg und kommen 15:30–18:30 zurück,
  Betriebshöfe sind werktags voll, sonntags bleiben die meisten daheim, in der Stadt sind die Ränder fast immer belegt); dieselben Plätze
  sind eher die der Pendler (Gewohnheit), der Rest wechselt von Tag zu Tag. Ein Auto kommt oder geht **nur, wo es niemand sieht** (außer
  Sicht oder weiter als 320 m; im Blickfeld oder näher als 14 m bleibt es, `DINGE.held` zählt das). Das Auto behält Bauart (aus der
  gemessenen Länge: Kleinwagen < 4,05 m, Kompakt < 4,45 m, Kombi oder SUV, Transporter) und Farbe aus dem Foto (Dunst abgezogen, dann die
  nächste der üblichen Farben). Autos, die im Foto mitten auf einer Haupt- oder Kreisstraße fuhren, werden keine Plätze.
- **Modelle** (`viz3/src/dinge/dinge_modelle.js`, `DMOD`): Kleinwagen, Kompakt, Kombi, SUV, Transporter ohne Marke in echten Außenmaßen
  (Karosserie, Glas, A-/B-/C-Säulen, Radläufe, Lampen, Schilder ohne Nummer); Dinge: Pool rund/eckig, Anhänger, Wohnwagen, Wohnmobil,
  Traktor, Lkw, Rund-/Quaderballen, Holzstapel (abgedeckt), Stammholz, Güllebehälter, Trampolin, Container. Ein Material (`plain()`),
  Lackfarbe als Instanzfarbe nur auf reinweißen Ecken; die zwei Programme werden beim Laden mit der Szene übersetzt (Warm-Meshes) –
  danach kommt keins dazu.
- Je Zelle (Dorf 120 m, Stadt 200 m) gebaut, wenn man näher als 380 m kommt (Telefon 260 m), frei ab +160 m; Autos instanziert (ein
  Draw-Call je Bauart und Zelle), Dinge zusammengefasst; kommt der Boden später (Kacheln der Stadt), wird die Zelle neu aufgesetzt.
  Fest für Gehende und Fahrzeuge (`VEH.extra`), der Verkehr (`verkehr/verkehr_auto.js`) hält vor ihnen und fährt herum. In der
  Zombie-Nacht bleiben sie, wie sie sind. Steht ein Dorfauto (`dorf/dorf_cars.js`) auf demselben Platz, bleibt unseres weg.

## Masken für die Boden-Retusche (`welt-gebaeude`)

- `viz3/extra/welt-dinge/maske_dinge.json`: `{ "src": "welt-dinge", "polys": [[[x, y], …], …], "pad": 0.35, "gebiete": { … } }` in
  Modellmetern; `maske_dinge_utm.json`: dieselben Vielecke in UTM 32N (EPSG:25832) für die Kacheln. Je Auto/Ding die Box mit 0,35 m Rand,
  zur Schattenseite (NNW, ~1 m je m Höhe beim Flug 07.04.2024) gestreckt – alle erkannten, auch Plätze, die gerade leer sind.
- Bis beide Zweige zusammengeführt sind und die Retusche gelaufen ist, zeigt das Bodenbild die flachen Autos noch (neben den 3D-Autos bzw.
  auf gerade leeren Plätzen).

## Benutzen und testen

- Im Spiel einfach hingehen; `DINGE.state()` (Zahlen), `DINGE.info(i)`, `DINGE.share(art, t)`, `DINGE.want(i, t)`, `DINGE.seen(i)`,
  `DINGE.settle()` (alles Nahe bauen), `DINGE.areaState()`.
- Tests: `welt_dinge` (Dorf: Daten, 3:00/10:00/19:00/Sonntag 11:00, nichts ändert sich im Blick, Auto hält auf, Programme, Zombie-Nacht,
  Bilder) und `welt_dinge_stadt` (Schleusingen mit den Kacheln der Website) – `bash tools/browser_lock.sh python3 viz3/test/run.py
  --port 8998 --serve welt_dinge`; auf GitHub über `viz3/extra/welt-dinge/tests.txt`.
- Daten neu machen: Luftbild holen und erkennen (`wdlib.fetch`, `detect.py` mit Ultralytics in einer eigenen venv; für ein großes Gebiet
  in Blöcken von 350 m `b_<x0>_<y1>.jpg/.json`), Dorf: `review.py` und von Auge entscheiden, Stadt: `decide.py <gebiet> <ordner> --sheets
  <ordner>`; dann `prep.py <gebiet> <bild> x0 y1 s` bzw. `prep.py <gebiet> <ordner>`.

## Stand und offen

Stand 6.11.2026 ~0:30 (wird bis ~6:30 fortgeschrieben):

| Gebiet | Autos (Plätze) | Dinge | geprüft |
|---|---|---|---|
| Ratscher (Dorf, Agrargenossenschaft, Holzlagerplatz, Gewerbe am Ostende) | 40 (Hof 31, Straße 7, Betrieb 2) | 16: Pool rund/eckig, Wohnmobil, Lkw, Wohnwagen, 3 Stammholz, 5 Holzstapel, Anhänger, 2 Güllebehälter | jeder Kandidat von Auge (fünf Durchgänge) |
| Schleusingen (Altstadt und Stadt bis 1,4 × 1,45 km) | 840 (Hof 624, Stadtrand 216) | 6 Lkw | Regeln, Stichprobe 30 (28 Autos), 237 Zweifelsfälle von Auge |

- Offen: Geisenhöhn und der Campingplatz an der Talsperre (im Quadrat; erkannt, Daten folgen), die Straßen nach Schleusingen und
  Veßra, Kloster Veßra. Supermarkt-Parkplätze sind im Foto (Sonntag) leer – dort gibt es keine Plätze (OSM `amenity=parking` war von
  hier nicht erreichbar; ließe sich auf GitHub Actions holen). Fahrende Autos des Verkehrs parken nicht auf freien Plätzen (eigenes
  System in `verkehr/`, nicht billig).
- Die Masken nimmt die Boden-Retusche von `welt-gebaeude` (`retusche.py`); bis dahin zeigt das Bodenbild die flachen Autos noch.

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/welt-dinge` vor `# feat/verkehr` (zwei Module, Ordner `viz3/src/dinge/`).
- `viz3/src/verkehr/verkehr_auto.js`: ein Import und zwei Zeilen in `obstacles()`, markiert `// feat/welt-dinge` (der Verkehr sieht die
  geparkten Autos).
- Quellen: `credits_add` in `viz3/extra/welt-dinge/manifest.json` (DOP 2024 © GDI-Th dl-de/by-2-0, YOLO11-OBB, OSM).
