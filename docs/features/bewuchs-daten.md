# Bewuchs: Flächenart je Zelle – was wo wächst (`bewuchs-daten`)

Hilfs-Agent `bewuchs-daten` des Straßen-Chats (session_01WqScFDtq8GSy4n7wU7foJx), Branch `feat/bewuchs-daten`, ab 17.11.2026.
Auftrag: `docs/plans/auftraege/bewuchs-daten.md`, Plan: `docs/plans/plan_bewuchs.md` (Abschnitt 4.5). Die Vorlage, die daraus Halme,
Blumen, Büsche und Beete zeichnet, baut der Straßen-Chat (`viz3/src/bewuchs/`); die Arten macht `bewuchs-pflanzen`.

## Was es gibt

Teil a (17.11.): Ratschers Quadrat und Falkos Garten. Teil b (17./18.11.): die Strecken nach Schleusingen und Kloster Veßra, Schleusingens
Stadtzone und Kloster Veßra – im selben Format, im selben Index (Abschnitt „Teil b“ unten).


- **Eine Karte je 400-m-Zelle** des Rasters von `gebaeude/z/` (Schlüssel `i_j`: Modell-x ∈ [400 i, 400 (i + 1)), y ∈ [400 j, 400 (j + 1))):
  `viz3/extra/bewuchs-daten/dist/bewuchs/z/<i>_<j>.png` → nach dem Bauen `dist/bewuchs/z/`. 8-Bit-Graustufen, 800 × 800 Punkte zu
  0,5 m, Norden oben: Punkt (u, v) hat seine Mitte bei (400 i + (u + 0,5) · 0,5, 400 (j + 1) − (v + 0,5) · 0,5).
  **Wert = Klasse (Bits 0–4) + 32 × Wuchs (Bits 5–7: 0 kahl oder abgetreten … 7 üppig).**
- **Ratschers Quadrat** (`RATSCHER.box`, x −1032…1368, y −1336…1064): die 49 Zellen i −3…3, j −4…2 (sie reichen über das Quadrat
  hinaus, das Luftbild und die Daten auch), zusammen 2,6 MB, die größte 91 KB.
- **Falkos Garten** fein: `dist/bewuchs/garten.png`, 25 cm, dieselben Werte und dieselbe Lage (Norden oben), über der modellierten
  Zone x −50…42, y −52…48 (368 × 400 Punkte; dort gilt das Modell, nicht OSM – `docs/ARCHITECTURE.md` §11). In den Zellen steht die
  Zone ebenfalls, aus dieser Karte übernommen.
- **`dist/bewuchs/z/index.json`**: `{ "v": 1, "cell": 400, "classes": [Namen nach id], "cells": { "i_j": { "res": 0.5, "n": { "<id>":
  Punkte } } }, "quelle": "…", "stand": "JJJJ-MM-TT", "garten": { "x0": -50, "y0": -52, "res": 0.25, "w": 368, "h": 400, "n": {…} },
  "vigour": { "<Klasse>": [NDVI für 0, NDVI für 7] } }` (`w`, `h`, `n` im Garten und `vigour` sind Zusätze zum Format des Auftrags).
- `viz3/extra/bewuchs-daten/manifest.json`: die Quellenzeile (`credits_add`).

### Teil b: Strecken, Schleusingen, Kloster Veßra

- **Zellen** (`gebiete.py korridor`): die 400-m-Zellen der Gebäude jenseits des Quadrats (`dist/gebaeude/z/index.json`: die Orte an den
  Straßen nach Schleusingen und Kloster Veßra, Schleusingen um die Altstadt, Kloster Veßra), die Zellen bis 60 m neben den beiden Routen
  der Fahrt (`dist/fahrt/strassen.json` `routes` – die Strecken zwischen den Orten, wo die Gebäudezellen Lücken lassen) und alle Zellen der
  beiden Stadtzonen (`dist/schleusingen/stadt.json`, `dist/vessra/ort.json` `zone`) – 239 Zellen. **0,5 m**, wo eine bebaute Fläche der
  Fahrtdaten (`dist/strassen/ausstattung.json` `orte`, ab 1000 m² in der Zelle) oder eine Stadtzone liegt (118 Zellen), sonst **1 m**
  (400 × 400, 121 Zellen).
  `index.json` nennt je Zelle `res` und den Flugtag des Luftbilds (`flug`).
- **Straßen** jenseits des Quadrats: die Wege der Fahrt (`dist/fahrt/strassen.json`, was `welt/fahrt.js` lädt: Art, Breite) und aus
  OpenStreetMap die Straßen der Orte, Feldwege und Pfade mit den Breiten von `tools/geo/build_roads.py` (`quellen.road_of`, ein Unit-Test
  vergleicht die Regeln mit dem Skript). Im Quadrat bleiben es die Wege von `dist/geo/roads.b64.json`; Zellen am Rand des Quadrats nehmen
  jenseits davon die Fahrt- und OSM-Wege (in Teil a fehlten dort die Straßen).
- **Bankett nur außerhalb der Ortslage des Basis-DLM** (vorher: bebaute Flächen der Fahrtdaten, die gilt jetzt auch im Quadrat); in der
  Ortslage die Grünstreifen an den Straßen (bis 1,5 m) öffentlich.
- **Gebäude** dazu: ETHOS-Zellen (`dist/gebaeude/z/`), die eigenen Häuser der Stadtzonen (`stadt.json`, `ort.json` `b`). Hecken von
  `stadtgruen` in Schleusingen (`baeume.json`) und die Hecken und Mauern von Kloster Veßra (`ort.json`) sind 0 – sie zeichnen sie selbst.
- **Kein Höhenmodell** jenseits des Quadrats: keine Büsche aus Höhen, keine Böschungen; Gebüsch dort nur aus OSM und dem Basis-DLM.
  Kronen von Bäumen im Ort sind im Maibild grün und zählen dann zum Rasen darunter.
- **Zwei Flüge:** südlich von etwa N 5 597 000 der 07.04.2024, nördlich der 15.05.2024 (Laub, längeres Gras). Der Wuchs wird je Flugtag
  auf die Spanne seiner eigenen Zellen gelegt (`index.json` `vigour`: je Flugtag die Spannen je Klasse); eine Zelle, die über die Grenze
  reicht, nimmt den Tag ihrer Mitte.
- Basis-DLM jenseits des Quadrats in Blöcken von 5 × 5 Zellen (2 km, 1 m, 15 Ebenen).

### Klassen (ids fest)

| id | Name | was | woher (Reihenfolge: spätere Regeln gewinnen) |
|---|---|---|---|
| 0 | nichts | Fahrbahn und 0,3 m Schulter, Weg, Hof, versiegelt, Gebäude, Wasser, unbekannt | Straßen der App (`dist/geo/roads.b64.json`), Gebäude (OSM, ETHOS `dist/gebaeude/ratscher.json`, dazu Bauten aus dem Höhenmodell), Wasser (OSM, Basis-DLM), kahle graue Flächen im Bild |
| 1 | zierrasen | privater Rasen | grüne Flächen im Dorf (Basis-DLM Wohnbau/gemischt/Ortslage, OSM residential), nicht öffentlich |
| 2 | oeffentlich | Anger, Schulwiese, Brunnen, Badewiese, Sportanlagen-Grün, Grünstreifen an Dorfstraßen (bis 1,5 m) | OSM (park, school, village_green …), Basis-DLM (Bildung, Freibad, Sport), Handdaten (`handdaten.py`: Anger, Schulwiese, Brunnen – OSM hat dort nichts) |
| 3 | bankett | Bankett außerorts, 0,3 m bis 3 / 2,5 / 2 / 1,5 / 1 / 0,5 m hinter dem Fahrbahnrand (Autobahn / Haupt-, Kreisstraße / Straße, Weg / Zufahrt / Feldweg / Pfad), am Acker höchstens bis 1,5 m | Straßen der App |
| 4 | maehwiese | Wiese | Basis-DLM Grünland, OSM meadow/grass; breite unbekannte grüne Flächen; raue Grasflächen in großen Gärten (Schwelle des NDVI je Zelle: das 60. Perzentil des Grüns im Ort – im Mai üppiger als im April); das Gras von Höfen, Gewerbe- und Industrieflächen (Basis-DLM, OSM farmyard/industrial) |
| 5 | weide | Weide | OSM pasture (keine im Quadrat), Basis-DLM Tiergehege, Ronalds Ziegenweide (`npc/npc.js` PAD) |
| 6 | streuobst | Streuobstwiese | OSM orchard, Basis-DLM Streuobst – im Quadrat keine (auch im Bild keine gefunden) |
| 7 | saum | Rain, Brache, Graben, Böschung | 1 m Wiese am Acker, 2 m Waldsaum, 1,2 m um Gräben (OSM ditch), steile Hänge (> 31°) außerorts, Straßenland der Autobahn jenseits des Banketts, Basis-DLM „naturnahe Fläche“, schmale unbekannte grüne Streifen (< 8 m), Gartenrand am Zaun |
| 8 | ufer | Ufer | 2,5 m an Flüssen, Bächen, Teichen, der Talsperre (auch unter den Bäumen der Galerie); Basis-DLM Gewässerbegleitfläche; der Gartenbach |
| 9 | acker | Acker | Basis-DLM Ackerland (gewinnt gegen OSM), OSM farmland; kahler Boden in einer Wiese ab 0,1 ha |
| 10 | ackerrand | äußere 2 m eines Ackers | zum Weg (hinter dem Bankett), zur Wiese, zum Dorf; dazu, wo in einem Feldblock ein gepflügter und ein grüner Teil (je ≥ 0,5 ha) aneinanderstoßen |
| 11 | waldboden | unter geschlossenem Kronendach | Basis-DLM Wald, OSM forest/wood; geschlossenes Kronendach ab 0,15 ha außerhalb des Dorfs (Feldgehölze, Galerie am Fluss) |
| 12 | gebuesch | Gebüsch, Hecke | 0,5–4 m über Grund (DOM1 − DGM1), grün oder kahl, nicht Gebäude, Auto, gemessener Baum; Basis-DLM Gehölz und Bewuchs-Flächen, OSM scrub, OSM-Hecken (1,6 m) |
| 13 | beet | Zierbeet | im Quadrat keine (im Bild nicht von anderem zu unterscheiden; Stufe 4) |
| 14 | gemuese | Gemüsebeet | im Dorf und in Kleingärten: umgegrabene Flecken im Aprilbild (NDVI 0,12–0,27, rau, flach, 8–400 m², von Grün umgeben) |
| 15 | verkehrsgruen | Verkehrsinsel, Kreiselmitte | grüne Inseln ≤ 500 m², zu ≥ 75 % von Fahrbahn umgeben – im Quadrat praktisch keine |
| 16 | friedhof | Friedhof | OSM, Basis-DLM – im Quadrat keiner |
| 17 | sportrasen | Spielfeld | OSM pitch mit Rasen (Kunstrasen, Tartan, Sand: 0) |

Nicht im Bild: die Hecken des Angers (`world/dorfkern_data.js`) und von `stadtgruen` (`ratscher.json`, solange es nicht in `src` ist, von
`origin/feat/stadtgruen`) sind 0 – sie zeichnen ihre Hecken selbst; ebenso das Pflaster und der Brunnen des Angers.

### Wuchs (Bits 5–7)

NDVI aus dem Farb-Infrarotbild (NIR, Rot), über 1,5 m geglättet (Gauß), je Klasse vom 5. zum 95. Perzentil des ganzen Quadrats auf 0…7
gelegt (die Spannen stehen in `index.json` unter `vigour`). Klasse 0 hat Wuchs 0. Kahle Stellen, Trampelpfade, der Schatten von Kronen und
Häusern geben kleine Werte; im Acker heißt 0 im April kahler Boden.

### Falkos Garten (`garten.py`)

- Erst die allgemeinen Regeln über die Zone (das Basis-DLM führt die Grundstücke als bebautes Land: Gärten), ohne die OSM-Gewässer (der
  modellierte Bach ersetzt sie) und ohne Büsche aus dem Höhenmodell (die Pflanzen der Zone sind die der App; das Modell steht dort ein paar
  Meter neben dem Luftbild).
- Im Zaun des Gartens (`viz3/site.js` `garden`) **Rasen** – so mäht ihn `garden/grass.js` heute; **Saum** 0,5 m am Zaun und 0,6 m um die
  Stämme der Gartenbäume (`site.js` `trees`, wie `garden/stream_geo.js` sie aus dem Graben rückt).
- **Bach** (`garden/stream_geo.js`, Mittellinie über `app_daten.mjs`): Ufer von der Wasserlinie (0,52 m) bis 0,6 m hinter die Oberkante
  (2,25 m); das Wasser selbst Rasen, wie der Auftrag sagt („the ditch itself … mark them as lawn“ – die Laufzeit zeichnet es). Der
  Durchlass unter der Torplatte, die Plattenterrasse und ihre Stufen 0.
- Die Pflanzflecken der jungen Bäume (`garden/garten_heute.js`) 0. Gebäude und Kieswege (sie wandern mit der Draufsicht) Rasen.
- Ronalds Ziegenweide (PAD) **Weide** mit 0,5 m Saum am Zaun, seine Wiese nördlich davon **Mähwiese**; Huberts Grundstück nach dem
  Luftbild (Rasen, Hof 0, ein Gemüsefleck); der Acker nördlich des Feldwegs mit Rand und Bankett.

## Wie sicher

| Klasse | Sicherheit | warum |
|---|---|---|
| 0, 3, 10, 11, 1 | gut | Straßen, Gebäude, Wald und Acker aus amtlichen bzw. OSM-Flächen, das Bild nur zur Verfeinerung; Rasen im Dorf deckt sich mit dem Bild |
| 2 | mittel | in Ratscher hat OSM keine öffentlichen Flächen: Anger, Schulwiese, Brunnen von Hand; die Grünstreifen an den Dorfstraßen nach Regel |
| 4 / 9 | mittel | Grünland und Acker nach dem Basis-DLM (Feldblöcke): Ackergras oder Kleegras auf Ackerland bleibt Acker; im April sieht Wintergetreide aus wie Wiese |
| 5 | schwach | Weiden sind nirgends erfasst – außer Ronalds Ziegen gilt alles Grünland als Mähwiese |
| 7, 8 | mittel | Breiten nach Regel; Gräben nur, wo OSM sie hat |
| 12 | mittel | Höhenmodell älter als das Luftbild (DOM1), Kronenränder und Stapel möglich; im Dorf vor allem Gartensträucher |
| 14 | schwach | nur, was Anfang April 2024 umgegraben war; Beete (13) gar nicht |
| 15, 16, 6 | – | im Quadrat nicht vorhanden |

## Zahlen (Teil a, 17.11.2026)

Siehe `tools/bewuchs/daten/bauen.py` (Ausgabe) – Flächen je Klasse im Quadrat (49 Zellen, 784 ha): Waldboden 27 %, Acker 24 %, Mähwiese
22 %, nichts 14 %, Zierrasen 4,7 %, Saum 2,7 %, Gebüsch 2,7 %, öffentliches Grün 0,9 %, Bankett 0,8 %, Ackerrand 0,7 %, Ufer 0,5 %, Rest
< 0,1 %. Bauen ~5 min auf dem Chat-Rechner (zwei Kerne geteilt).

## Quellen und Lizenzen

- OpenStreetMap über die API (`https://api.openstreetmap.org/api/0.6/map`, Kacheln von 0,0125°, eine Anfrage je Sekunde, im Cache) –
  © OpenStreetMap-Mitwirkende, ODbL 1.0. Overpass und Geofabrik sind vom Chat-Rechner nicht erreichbar.
- Thüringer Luftbild DOP 20 cm in Farbe (`th_dop`) und Farb-Infrarot (`th_dop20cir`), WMS `www.geoproxy.geoportal-th.de/geoproxy/services/DOP`,
  das ganze Quadrat beflogen am 07.04.2024 (vor dem Laubaustrieb) – © GDI-Th, dl-de/by-2-0.
- ATKIS Basis-DLM über den WMS `…/services/DLM` (die Ebenen als Bild, ihre Bedeutung per GetFeatureInfo gelesen: Landwirtschaft
  Ackerland/Grünland, Wald, Gehölz, Ortslage, Wohnbau, gemischte Nutzung, besondere funktionale Prägung, Sport/Freizeit mit Funktion,
  Unland, Straßenverkehr, Gewässer, Vegetationsmerkmal) – © GDI-Th, dl-de/by-2-0. Kein Flurstück, keine ALKIS-Daten.
- DGM1/DOM1 (1 m) aus den Mosaiken von `tools/geo` (`geo/out/dgm_mosaic.npy`, `dom_mosaic.npy`) – © GDI-Th, dl-de/by-2-0.
- Daten der App: Straßen, Gebäude, Bäume (`dist/geo`, `dist/gebaeude`), bebaute Flächen (`dist/strassen/ausstattung.json`), Garten, Bach,
  Anger (`app_daten.mjs` liest `viz3/site.js`, `garden/stream_geo.js`, `world/dorfkern_data.js` in node).
- Quellenzeile: `viz3/extra/bewuchs-daten/manifest.json` (`credits_add`). Die Rohdaten (Bilder, OSM-XML) liegen nur im Cache
  (`/home/claude/bewuchs-raw`), nie im Repo; die Prüfbögen zeigen das Luftbild und bleiben ebenfalls draußen.

## Neu bauen

```bash
cd <repo>
python3 -I tools/bewuchs/daten/holen.py korridor            # Teil b: OSM, Luftbilder (0,2 m bzw. 0,4 m je Zelle), Flugtage, Basis-DLM-Blöcke
python3 -I tools/bewuchs/daten/holen.py osm                 # OpenStreetMap (Cache /home/claude/bewuchs-raw/osm, BEWUCHS_RAW ändert den Ort)
python3 -I tools/bewuchs/daten/holen.py dlm                 # Basis-DLM, 20 Ebenen, 1 m
python3 -I tools/bewuchs/daten/holen.py dop -3 -4 3 2       # Luftbild Farbe + Infrarot je Zelle (49 × 2 Bilder, ~60 MB, 5 min)
node tools/bewuchs/daten/app_daten.mjs > /home/claude/bewuchs-raw/app.json
nice -n 10 python3 -I tools/bewuchs/daten/bauen.py ratscher korridor --boegen <Berichtsordner>   # Karten, Index, Manifest; Bögen
# (nur ein Gebiet: die Zellen der anderen bleiben im Index stehen)
python3 -m unittest discover -s tools/bewuchs/daten -p 'test_*.py'                      # Unit-Tests (rein, ohne Netz)
```

Die Höhenmosaike sucht `raster.py` in `PAV_GEO`, `<repo>/geo` oder `/home/claude/pr-src/geo`; ohne sie gibt es keine Büsche aus Höhen
und keine Böschungen.

## Werkzeuge (`tools/bewuchs/daten/`)

| Datei | was |
|---|---|
| `gemeinsam.py` | Modellrahmen, Zellen, Raster (`Grid`), Klassen, Kodierung, PNG |
| `gebiete.py` | die Gebiete (Quadrat, Strecken mit den Stadtzonen) und die Auflösung je Zelle |
| `holen.py` | Downloads mit Cache (OSM, DOP, DLM; `dlm_info` für GetFeatureInfo) |
| `osm_flaechen.py` | OSM-XML → Flächen und Linien mit Tags in Modellmetern (Multipolygone) |
| `quellen.py` | alle Vektorquellen einmal geladen (OSM nach Art, Straßen, Orte, Gebäude, Bäume, App, `stadtgruen`-Hecken) |
| `raster.py` | Luftbild, Höhen und DLM auf ein Modellraster; Flächen, Linien, Kreise als Masken (Pixelmitte zählt) |
| `klassen.py` | die Regeln einer Zelle |
| `handdaten.py` | was den Quellen fehlt (Anger, Schulwiese, Brunnen, Wiese an der Haltestelle, Ziegenweide, Pflanzflecken) |
| `garten.py` | die feine Karte der modellierten Zone |
| `bauen.py`, `boegen.py`, `boegen_bauen.py` | bauen, Prüfbögen, Flächentabelle |
| `app_daten.mjs` | Garten, Bach, Anger aus den Modulen der App (node) |
| `test_gemeinsam.py`, `test_raster.py`, `test_daten.py` | Unit-Tests (Rahmen, Kodierung, Raster, Straßenraster, Bach, Abgleich mit der App, Format der gebauten Karten) |

## Offen (für die nächsten Teile)

- (c) alle Welt-Kacheln; (d) Feldfrüchte nach Flugdatum.
- Weiden sind nirgends erfasst (nur Ronalds Ziegen und ein Tiergehege); Beete (13) erkennt das Bild nicht.
