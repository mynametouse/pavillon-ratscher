# Bewuchs: Flächenart je Zelle – was wo wächst (`bewuchs-daten`)

Hilfs-Agent `bewuchs-daten` des Straßen-Chats (session_01WqScFDtq8GSy4n7wU7foJx), Branch `feat/bewuchs-daten`, ab 17.11.2026.
Auftrag: `docs/plans/auftraege/bewuchs-daten.md`, Plan: `docs/plans/plan_bewuchs.md` (Abschnitt 4.5). Die Vorlage, die daraus Halme,
Blumen, Büsche und Beete zeichnet, baut der Straßen-Chat (`viz3/src/bewuchs/`); die Arten macht `bewuchs-pflanzen`.

## Was es gibt

Teil a (17.11.): Ratschers Quadrat und Falkos Garten. Teil b (17./18.11.): die Strecken nach Schleusingen und Kloster Veßra, Schleusingens
Stadtzone und Kloster Veßra – im selben Format, im selben Index (Abschnitt „Teil b“ unten).

- **Eine Karte je 400-m-Zelle** des Rasters von `gebaeude/z/` (Schlüssel `i_j`: Modell-x ∈ [400 i, 400 (i + 1)), y ∈ [400 j, 400 (j + 1))):
  `viz3/extra/bewuchs-daten/dist/bewuchs/z/<i>_<j>.png` → nach dem Bauen `dist/bewuchs/z/`. 8-Bit-Graustufen, 800 × 800 Punkte zu
  0,5 m (im Quadrat, in Dörfern und Städten) oder 400 × 400 zu 1 m (Freiland jenseits des Quadrats; `res` je Zelle im Index), Norden
  oben: Punkt (u, v) hat seine Mitte bei (400 i + (u + 0,5) · res, 400 (j + 1) − (v + 0,5) · res).
  **Wert = Klasse (Bits 0–4) + 32 × Wuchs (Bits 5–7: 0 kahl oder abgetreten … 7 üppig).**
- **Ratschers Quadrat** (`RATSCHER.box`, x −1032…1368, y −1336…1064): die 49 Zellen i −3…3, j −4…2 (sie reichen über das Quadrat
  hinaus, das Luftbild und die Daten auch), zusammen 2,5 MB, die größte 89 KB.
- **Falkos Garten** fein: `dist/bewuchs/garten.png`, 25 cm, dieselben Werte und dieselbe Lage (Norden oben), über der modellierten
  Zone x −50…42, y −52…48 (368 × 400 Punkte; dort gilt das Modell, nicht OSM – `docs/ARCHITECTURE.md` §11). In den Zellen steht die
  Zone ebenfalls, aus dieser Karte übernommen.
- **`dist/bewuchs/z/index.json`**: `{ "v": 1, "cell": 400, "classes": [Namen nach id], "cells": { "i_j": { "res": 0.5, "n": { "<id>":
  Punkte }, "flug": "JJJJ-MM-TT" } }, "quelle": "…", "stand": "JJJJ-MM-TT", "garten": { "x0": -50, "y0": -52, "res": 0.25, "w": 368,
  "h": 400, "n": {…} }, "vigour": { "<Flugtag>": { "<Klasse>": [NDVI für 0, NDVI für 7] } } }` (`flug`, `w`, `h`, `n` im Garten und
  `vigour` sind Zusätze zum Format des Auftrags; `vigour` ist seit Teil b nach Flugtag geteilt – die Laufzeit liest es nicht).
- `viz3/extra/bewuchs-daten/manifest.json`: die Quellenzeile (`credits_add`).

### Teil b: Strecken, Schleusingen, Kloster Veßra

- **Zellen** (`gebiete.py korridor`): die 400-m-Zellen der Gebäude jenseits des Quadrats (`dist/gebaeude/z/index.json`: die Orte an den
  Straßen nach Schleusingen und Kloster Veßra, Schleusingen um die Altstadt, Kloster Veßra), die Zellen bis 60 m neben den beiden Routen
  der Fahrt (`dist/fahrt/strassen.json` `routes` – die Strecken zwischen den Orten, wo die Gebäudezellen Lücken lassen) und alle Zellen der
  beiden Stadtzonen (`dist/schleusingen/stadt.json`, `dist/vessra/ort.json` `zone`) – 239 Zellen. **0,5 m**, wo eine bebaute Fläche der
  Fahrtdaten (`dist/strassen/ausstattung.json` `orte`, ab 1000 m² in der Zelle), eine Stadtzone oder ein Dorf mit 25 und mehr Gebäuden in
  der Zelle liegt (`dist/gebaeude/z/`: die Dörfer abseits der Routen, die die Fahrtdaten nicht kennen) – 155 Zellen –, sonst **1 m**
  (400 × 400, 84 Zellen).
  `index.json` nennt je Zelle `res` und den Flugtag des Luftbilds (`flug`).
- **Straßen** jenseits des Quadrats: die Wege der Fahrt (`dist/fahrt/strassen.json`, was `welt/fahrt.js` lädt: Art, Breite) und aus
  OpenStreetMap die Straßen der Orte, Feldwege und Pfade mit den Breiten von `tools/geo/build_roads.py` (`quellen.road_of`, ein Unit-Test
  vergleicht die Regeln mit dem Skript). Im Quadrat bleiben es die Wege von `dist/geo/roads.b64.json`; Zellen am Rand des Quadrats nehmen
  jenseits davon die Fahrt- und OSM-Wege (in Teil a fehlten dort die Straßen). In den Fenstern, in denen **Schleusingen und Kloster
  Veßra ihre Straßen selbst über das Luftbild malen** (`welt/schleusingen.js`, `welt/vessra.js` `streetMap()`: 920 m um den Markt bzw.
  das Kloster), zählen deren Breiten je Art mit (Haupt-, Kreis-, Ortsstraße, Zufahrt, Fußweg 8 / 7 / 5,6 / 3,6 / 2,2 m in Schleusingen,
  7 / 6,5 / 5,2 / 3,2 / 1,8 m in Veßra; `quellen.TOWN_ST`, ein Unit-Test vergleicht sie mit den Modulen); wo zwei Wege übereinander
  liegen, gilt der breitere – kein Gras auf dem gemalten Asphaltrand.
- **Bahnstrecken** (OSM `railway` = rail, disused, auch Gleisanschlüsse; nicht auf Brücken, nicht im Tunnel): das Schotterbett (4,4 m) 0,
  je 3 m daneben (Randweg, Böschung) Saum, wo das Bild Rasen, Wiese oder Bankett sagt; das Grün von Bahnflächen (OSM `landuse=railway`,
  vor allem an den Bahnhöfen) Saum, ihr kahler Boden 0; im Schotter keine Gemüsebeete (vorher lag die Strecke durch Kloster
  Veßra als Reihe von Beeten in der Karte, die Gleise zum Teil als Rasen).
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
- **Größen:** die 239 Zellen zusammen 11,1 MB (0,5 m: Ø 60 KB, höchstens 97 KB; 1 m: Ø 22 KB, höchstens 29 KB); alle 288 Zellen mit
  dem Quadrat 13,6 MB, `index.json` 45 KB, `garten.png` 13 KB.

### Teil c: die Welt-Blöcke und die flachen Orte (18.11.)

- **Zellen** (`gebiete.py welt`): Block B (9,6 km um den Garten) und der Block von Kloster Veßra – die Detailblöcke der Welt-Kacheln
  (`tools/welt/wlib.py` `BLOCK_B`, `VESSRA_BLK`) –, dazu die flachen Orte der Region von `welt-orte` (`dist/gebaeude/z/index.json`
  `order` hinter `stats.cells`), ohne die Zellen von Teil a und b: 607 Zellen (565 in den Blöcken, 42 Orte außerhalb). Suhls Korridore
  nicht (Straßen-Chat 18.11.). **0,5 m** nach den Regeln von Teil b und wo OpenStreetMap 25 und mehr Gebäude in der Zelle hat
  (`holen.py welt` zählt sie nach dem OSM-Abruf, `osm_haeuser.json` im Cache) – 51 Zellen –, sonst **1 m** (556 Zellen).
- **Das Repo wächst nicht bei jedem Neubau:** `bauen.py` schreibt ein PNG nur, wenn sich seine Werte ändern (`save_if_changed`, ein
  Unit-Test), und behält die Wuchs-Spannen der Flugtage, die der Index schon hat – ein neues Gebiet verschiebt den Wuchs der alten nicht
  (`--spannen` rechnet sie neu aus den gebauten Zellen); ein neuer Flugtag bekommt seine Spannen aus seinen Zellen, fehlende Klassen vom
  Flugtag mit den meisten Zellen. Die Spannen stehen seit Teil c mit 6 Stellen im Index (vorher 3: ein Neubau des Quadrats oder der
  Strecken schreibt deren PNGs einmal neu, danach bleiben sie bitgleich). Teil c hat keine Zelle von Teil a oder b angefasst.
- Downloads zu dritt nebeneinander (Luftbilder mit Flugtag, Basis-DLM-Blöcke), OSM weiter eine Anfrage je Sekunde.
- Flugtage wie in Teil b: 412 Zellen vom 07.04.2024, 195 vom 15.05.2024 (kein neuer Flugtag; die Spannen von Teil a/b gelten).
- **Größen:** die 607 Zellen 14,7 MB (0,5 m: Ø 65 KB, höchstens 99 KB; 1 m: Ø 21 KB, höchstens 35 KB) – Block B 10,5 MB (433 Zellen),
  Block Veßra 2,6 MB (132), die Orte außerhalb 1,6 MB (42). Alle 895 Zellen zusammen 28,4 MB (Ø 32 KB), `index.json` 114 KB; die
  größten 4 × 4 Zellen 1,14 MB (Themar). Bauen 21 min, Downloads 16 min (Luftbilder 0,3 GB, 23 DLM-Blöcke, 67 OSM-Kacheln).

### Teil e: gestaltete Flächen (18.11.)

Was das Luftbild nicht trennt, aber jedes Dorf hat – nach Regeln, mit einer festen Zufallszahl je Haus bzw. Ort (`gestaltung.h01`: dasselbe
Haus bekommt in jedem Bau und in beiden Zellen, die es berührt, dieselben Beete). `gestaltung.py`, aufgerufen in `klassen.classify` vor
den Gebäuden; die modellierte Zone des Gartens bleibt der Gartenkarte.

- **Wohnhäuser:** ETHOS-Umrisse der Art 0 (`dist/gebaeude/ratscher.json`, `z/`), OSM-Gebäude, die kein Schuppen, keine Scheune, Garage,
  Halle … sind, und die Häuser der Stadtzonen; 40–400 m², nicht lang (Seiten ≤ 2,6 : 1); ein Umriss je Ort (ETHOS vor OSM vor Stadt).
- **Vorgartenbeete (13)**, nur in 0,5-m-Zellen: bei 60 % der Häuser entlang jeder Wand, die einer Straße (Haupt-, Kreis-, Ortsstraße,
  Weg; nicht Autobahn, Zufahrt, Feldweg) zugewandt ist – die Straße höchstens 25 m vor der Wand –, ein Streifen von 0,6–1,5 m (je Haus),
  0,3 m vor den Ecken endend, nur wo die Karte Rasen (1) oder öffentliches Grün (2) hatte. Dazu OSM `landuse=flowerbed` und öffentliche
  `leisure=garden` (ihr Grün).
- **Gemüsebeete (14):** bei 30 % der Häuser ein Rechteck von 10–40 m² (Seiten 1,3 : 1 bis 2,5 : 1) hinter dem Haus (von der nächsten
  Straße abgewandt, 3, 6 oder 10 m hinter der Rückwand, seitlich versetzt), wenn es zu ≥ 90 % auf Rasen liegt und 1 m darum weder Haus noch
  Fahrbahn noch Wasser ist. In Kleingärten (OSM `landuse=allotments`) 30 % ihres Rasens als Beete von 3 × 8 m entlang der langen Seite der
  Anlage. Die umgegrabenen Flecken aus dem Aprilbild bleiben.
- **Verkehrsgrün (15):** die Mitte von Kreiseln (OSM `junction=roundabout`, die Fläche im Ring), Verkehrsinseln (`traffic_calming=island`,
  `area:highway=traffic_island`), Mittelstreifen zwischen zwei Einbahn-Fahrbahnen (Autobahn, Haupt- und Kreisstraßen; Lücken bis 6 m
  geschlossen), das Grün auf Parkplätzen (`amenity=parking`) – jeweils, wo die Karte Grün hatte (Rasen, Wiese, Bankett, Saum, Gebüsch …).
- **Friedhof (16)** wie bisher; OSM-Wege im Friedhof (Fußwege, Pfade, Zufahrten, Feldwege mit ihren Breiten) sind 0.
- **Fläche vorher → nachher** (alle 895 Zellen): Beet 0 → 2,2 ha, Gemüsebeet 3,5 → 11,8 ha, Verkehrsgrün 0,5 → 3,1 ha, Friedhof 6,2 ha
  (die Wege darin kaum, sie waren als Fahrbahn schon 0); dafür Zierrasen 543,6 → 532,5 ha, öffentliches Grün 43,2 → 41,9 ha. Quadrat:
  Beet 0,2 ha, Gemüse 0,1 → 1,0 ha, Verkehrsgrün 0,04 → 1,5 ha (Parkplatzgrün an der Talsperre); Strecken: Beet 1,2 ha, Gemüse 2,6 →
  8,9 ha (Kleingärten); Welt: Beet 0,8 ha, Gemüse 0,8 → 1,9 ha. Nebenbei in den Strecken +3,4 ha Waldboden, −3 ha Mähwiese: der
  OSM-Cache hat seit Teil c mehr Kacheln, große Wald-Multipolygone am Rand der Strecken sind jetzt vollständig.
- Neubau aller 895 Zellen 52 min; 225 PNGs mit geänderter Karte geschrieben, 133 weitere unterschieden sich nur im Wuchs durch die auf 3
  Stellen gespeicherten Spannen von Teil a/b und blieben (`bauen.same_map`: gleiche Klassen, Wuchs höchstens eine Stufe in ≤ 2 % der
  Punkte – so schreibt auch `save_if_changed` künftig nur echte Änderungen).

### Teil d: die Feldfrüchte (18.11.)

Die Ackerpunkte (9) bekommen die Frucht ihres Feldes, aus dem Luftbild ihres Flugtags (Farbe und Infrarot) – ein Feld, eine Klasse: das
zusammenhängende Ackerland einer Zelle zwischen den Ackerrändern (10), geteilt an den OSM-Flächen `landuse=farmland` und an der
Flugtag-Grenze (N 5 597 000: nördlich der 15.05.2024, südlich der 07.04.2024; ganz im Westen auch nördlich April); entscheidend sind die
Mediane des Feldes (NDVI, Anteil offenen Bodens mit NDVI < 0,25, Gelbton (R + G) / 2 − B je Helligkeit). Unter 400 m² bleibt 9, ebenso in
der modellierten Zone (die Gartenkarte). Neue Klassen (vom Straßen-Chat 18.11. vergeben; 18 bleibt frei):

| id | Name | April (07.04.) | Mai (15.05.) |
|---|---|---|---|
| 19 | wintergetreide | grün (NDVI ≥ 0,30, nicht blaugrün) | grün bis olivgrün (NDVI ≥ 0,30, < 30 % Boden; das Maibild ist dunkler und wärmer als das Aprilbild) |
| 20 | winterraps | dicht blaugrün (NDVI ≥ 0,45, Gelbton ≤ −0,12: die Blätter des Rapses) | gelb (Gelbton ≥ 0,18 oder 90. Perzentil ≥ 0,28: Blüte) oder dicht blaugrün (Schoten) |
| 21 | hackfrucht | offener Boden (≥ 60 % des Feldes) – Mais, Rübe, Kartoffel und das noch nicht aufgegangene Sommergetreide | ebenso |
| 22 | kleegras | – (im April nicht von Getreide zu trennen) | blass (Helligkeit ≥ 90, NDVI 0,25–0,45, Gelbton 0,05–0,18, < 30 % Boden): gemäht oder dünne Narbe |
| 9 | acker | dünn bewachsen, unklar (NDVI < 0,30 bei < 60 % Boden) | unklar |

Der Wuchs der Früchte wird auf der Spanne des Ackers (9) seines Flugtags gemessen – das Teilen ändert ihn nicht. `classify` ruft
`feldfrucht.apply` auf dem Kern der Zelle auf; für die Karten von Teil a–c lief der Schritt auf den Zwischenständen
(`python3 -I tools/bewuchs/daten/feldfrucht.py`, dasselbe Ergebnis wie ein Neubau; 438 Zellen mit Acker, 395 PNGs neu, 6 min).

Anteile am Ackerland (9 und 19–22; die Ackerränder 10 bleiben):

| Gebiet | Ackerland | Wintergetreide | Winterraps | Mais, Rübe, Kartoffel | Kleegras | unklar (9) |
|---|---|---|---|---|---|---|
| Quadrat | 188 ha | 27 % | 27 % | 39 % | – | 6 % |
| Strecken | 616 ha | 44 % | 8 % | 40 % | 0,1 % | 7 % |
| Welt | 1003 ha | 50 % | 10 % | 30 % | 0,2 % | 11 % |
| alle | 1806 ha | 45 % | 11 % | 34 % | 0,1 % | 9 % |

Unsicher: „offener Boden“ im April umfasst auch Sommergetreide, Erbsen, Sonnenblumen, die noch nicht aufgegangen sind – Klasse 21 ist eher
„im Frühjahr bestellt“ als nur Mais, Rübe, Kartoffel; Kleegras und Feldfutter sind im Aprilbild nicht von Getreide zu trennen und im Maibild
nur, wo sie gemäht oder dünn sind (kaum gefunden); Felder, die über eine Zellgrenze reichen, entscheiden je Zelle (bei einheitlichen Feldern
gleich). Größen nach Teil d: alle 895 Zellen 28,5 MB (Quadrat 2,55 MB), die größten 4 × 4 Zellen 1,17 MB, `index.json` 121 KB.

### Klassen (ids fest)

| id | Name | was | woher (Reihenfolge: spätere Regeln gewinnen) |
|---|---|---|---|
| 0 | nichts | Fahrbahn und 0,3 m Schulter, Weg, Gleisbett, Hof, versiegelt, Gebäude, Wasser, unbekannt | Straßen der App (`dist/geo/roads.b64.json`; jenseits des Quadrats Fahrt, OSM, die gemalten Straßen der Städte), Gleise (OSM), Gebäude (OSM, ETHOS `dist/gebaeude/ratscher.json`, dazu Bauten aus dem Höhenmodell), Wasser (OSM, Basis-DLM), kahle graue Flächen im Bild |
| 1 | zierrasen | privater Rasen | grüne Flächen im Dorf (Basis-DLM Wohnbau/gemischt/Ortslage, OSM residential), nicht öffentlich |
| 2 | oeffentlich | Anger, Schulwiese, Brunnen, Badewiese, Sportanlagen-Grün, Grünstreifen an Dorfstraßen (bis 1,5 m) | OSM (park, school, village_green …), Basis-DLM (Bildung, Freibad, Sport), Handdaten (`handdaten.py`: Anger, Schulwiese, Brunnen – OSM hat dort nichts) |
| 3 | bankett | Bankett außerorts, 0,3 m bis 3 / 2,5 / 2 / 1,5 / 1 / 0,5 m hinter dem Fahrbahnrand (Autobahn / Haupt-, Kreisstraße / Straße, Weg / Zufahrt / Feldweg / Pfad), am Acker höchstens bis 1,5 m | Straßen der App |
| 4 | maehwiese | Wiese | Basis-DLM Grünland, OSM meadow/grass; breite unbekannte grüne Flächen; raue Grasflächen in großen Gärten (Schwelle des NDVI je Zelle: das 60. Perzentil des Grüns im Ort – im Mai üppiger als im April); das Gras von Höfen, Gewerbe- und Industrieflächen (Basis-DLM, OSM farmyard/industrial) |
| 5 | weide | Weide | OSM pasture (keine im Quadrat), Basis-DLM Tiergehege, Ronalds Ziegenweide (`npc/npc.js` PAD) |
| 6 | streuobst | Streuobstwiese | OSM orchard, Basis-DLM Streuobst – im Quadrat keine (auch im Bild keine gefunden) |
| 7 | saum | Rain, Brache, Graben, Böschung | 3 m neben dem Gleisbett, das Grün von Bahnflächen; 1 m Wiese am Acker, 2 m Waldsaum, 1,2 m um Gräben (OSM ditch), steile Hänge (> 31°) außerorts, Straßenland der Autobahn jenseits des Banketts, Basis-DLM „naturnahe Fläche“, schmale unbekannte grüne Streifen (< 8 m), Gartenrand am Zaun |
| 8 | ufer | Ufer | 2,5 m an Flüssen, Bächen, Teichen, der Talsperre (auch unter den Bäumen der Galerie); Basis-DLM Gewässerbegleitfläche; der Gartenbach |
| 9 | acker | Acker | Basis-DLM Ackerland (gewinnt gegen OSM), OSM farmland; kahler Boden in einer Wiese ab 0,1 ha |
| 10 | ackerrand | äußere 2 m eines Ackers | zum Weg (hinter dem Bankett), zur Wiese, zum Dorf; dazu, wo in einem Feldblock ein gepflügter und ein grüner Teil (je ≥ 0,5 ha) aneinanderstoßen |
| 11 | waldboden | unter geschlossenem Kronendach | Basis-DLM Wald, OSM forest/wood; geschlossenes Kronendach ab 0,15 ha außerhalb des Dorfs (Feldgehölze, Galerie am Fluss) |
| 12 | gebuesch | Gebüsch, Hecke | 0,5–4 m über Grund (DOM1 − DGM1), grün oder kahl, nicht Gebäude, Auto, gemessener Baum; Basis-DLM Gehölz und Bewuchs-Flächen, OSM scrub, OSM-Hecken (1,6 m) |
| 13 | beet | Zierbeet | Vorgartenbeete nach Regel (Teil e: 60 % der Wohnhäuser, an der Straßenseite, 0,6–1,5 m), OSM flowerbed, öffentliche Gärten |
| 14 | gemuese | Gemüsebeet | im Dorf und in Kleingärten: umgegrabene Flecken im Aprilbild (NDVI 0,12–0,27, rau, flach, 8–400 m², von Grün umgeben); Teil e: 10–40 m² hinter 30 % der Häuser, 30 % des Rasens in Kleingärten |
| 15 | verkehrsgruen | Verkehrsinsel, Kreiselmitte, Mittelstreifen, Parkplatzgrün | grüne Inseln ≤ 500 m², zu ≥ 75 % von Fahrbahn umgeben; Teil e: Kreiselmitten, Inseln, Mittelstreifen, Parkplatzgrün nach OSM |
| 16 | friedhof | Friedhof | OSM, Basis-DLM (im Quadrat keiner); die OSM-Wege darin 0 |
| 17 | sportrasen | Spielfeld | OSM pitch mit Rasen (Kunstrasen, Tartan, Sand: 0) |
| 18 | reserviert | – | frei |
| 19–22 | wintergetreide, winterraps, hackfrucht, kleegras | die Frucht eines Ackers (Teil d) | Luftbild des Flugtags, je Feld (siehe oben) |

Nicht im Bild: die Hecken des Angers (`world/dorfkern_data.js`) und von `stadtgruen` (`ratscher.json`, solange es nicht in `src` ist, von
`origin/feat/stadtgruen`) sind 0 – sie zeichnen ihre Hecken selbst; ebenso das Pflaster und der Brunnen des Angers.

### Wuchs (Bits 5–7)

NDVI aus dem Farb-Infrarotbild (NIR, Rot), über 1,5 m geglättet (Gauß), je Klasse vom 5. zum 95. Perzentil aller Zellen desselben
Flugtags auf 0…7 gelegt (April und Mai für sich; die Spannen stehen in `index.json` unter `vigour`). Klasse 0 hat Wuchs 0. Kahle Stellen, Trampelpfade, der Schatten von Kronen und
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
| 14 | schwach | aus dem Bild nur, was Anfang April 2024 umgegraben war; dazu nach Regel (Teil e) |
| 13, 14, 15 (Teil e) | Regel | Lage und Anteil plausibel (Vorgärten an der Straßenseite, Gemüse hinter dem Haus, Kleingärten zu 30 %), aber nicht die wirklichen Beete eines Hauses; Verkehrsgrün nur, wo OSM Kreisel, Inseln, Einbahn-Fahrbahnen und Parkplätze kennt |
| 15, 16, 6 | – | im Quadrat nicht vorhanden |

Teil b (Strecken, Dörfer, Schleusingen, Kloster Veßra) – wo es anders ist als im Quadrat:

| Klasse | Sicherheit | warum |
|---|---|---|
| 0, 3 | gut | Fahrbahnen der Fahrt und von OSM (Breiten von `build_roads.py`), in den Städten die gemalten Breiten; Bankett nach Regel; Gleise aus OSM |
| 9, 4, 11 | mittel | nach dem Basis-DLM wie im Quadrat; Feldgehölze und Baumgruppen, die DLM und OSM nicht kennen, sind ohne Höhenmodell im Aprilbild kahl (0, am Acker Acker) und im Maibild grün (Wiese) |
| 12 | schwach | ohne Höhenmodell nur Basis-DLM (Gehölz) und OSM (scrub, Hecken) |
| 1, 2 | mittel | Gärten nach dem Bild; im Maibild zählen Baumkronen im Ort zum Rasen darunter, und hohes Gras großer Gärten wird nur zum Teil Wiese; öffentlich nur, wo OSM Park, Schule, Kirche, Friedhof … kennt (in Schleusingen die Parks und Schulen von OSM, in Veßra das Klostergelände) |
| 14 | schwach | nur in 0,5-m-Zellen; im Mai sind Beete grün und werden kaum gefunden |
| 7 (Bahn) | mittel | 3 m je Seite nach Regel; Bahnflächen nur, wo OSM `landuse=railway` hat |
| Wuchs | mittel | je Flugtag eigene Spannen; eine Zelle über der Flugtag-Grenze (etwa N 5 597 000, z. B. `-3_3` am Markt von Schleusingen) nimmt den Tag ihrer Mitte |

## Zahlen (18.11.2026: Quadrat und Strecken zusammen neu gebaut, dann Teil c dazu)

Flächen je Klasse und Gebiet (aus `index.json`; die Tabelle je Zelle schreibt `bauen.py --boegen` als `flaechen_*.csv`):

| Gebiet | Zellen | ha | Anteile |
|---|---|---|---|
| Ratschers Quadrat | 49 (0,5 m) | 784 | Waldboden 27 %, Acker 24 %, Mähwiese 21 %, nichts 14 %, Zierrasen 4,4 %, Saum 2,8 %, Gebüsch 2,6 %, Bankett 1,0 %, Ackerrand 0,9 %, öffentliches Grün 0,9 %, Ufer 0,5 %, Weide 0,2 % |
| Schleusingen (Stadtzone jenseits des Quadrats) | 12 (0,5 m) | 192 | nichts 39 %, Zierrasen 30 %, Mähwiese 10 %, Waldboden 8 %, Acker 4 %, öffentliches Grün 2,0 %, Gebüsch 1,7 %, Saum 1,3 %, Ufer 1,2 %, Friedhof 0,8 %, Bankett 0,5 %, Sportrasen 0,4 % |
| Kloster Veßra (Zone) | 16 (0,5 m) | 256 | Acker 37 %, Mähwiese 33 %, Waldboden 9 %, nichts 7 %, Gebüsch 4 %, Zierrasen 3,5 %, öffentliches Grün 1,6 %, Saum, Ackerrand je 1,0 %, Ufer 0,9 %, Bankett 0,8 % |
| Dörfer an den Strecken | 127 (0,5 m) | 2032 | Mähwiese 31 %, nichts 19 %, Acker 15 %, Zierrasen 14 %, Waldboden 14 %, Gebüsch 2,3 %, Saum 1,4 %, Bankett 0,9 %, Ufer, Ackerrand je 0,7 %, öffentliches Grün 0,5 % |
| Freiland zwischen den Orten | 84 (1 m) | 1344 | Waldboden 37 %, Mähwiese 34 %, Acker 16 %, nichts 4,6 %, Gebüsch 3,3 %, Bankett 1,7 %, Saum 1,3 %, Zierrasen 1,0 %, Ackerrand, Ufer je 0,6 % |
| Teil a und b | 288 | 4608 | Mähwiese 30 %, Waldboden 22 %, Acker 17 %, nichts 14 %, Zierrasen 8,7 %, Gebüsch 2,7 %, Saum 1,6 %, Bankett 1,1 %, Ackerrand 0,7 %, Ufer 0,6 %, öffentliches Grün 0,5 %, Rest je ≤ 0,1 % |
| Teil c: Dörfer (0,5 m) | 51 | 816 | Mähwiese 29 %, Waldboden 26 %, nichts 17 %, Zierrasen 15 %, Acker 5 %, Gebüsch 2,9 %, öffentliches Grün 1,4 %, Bankett, Saum je 0,9 % |
| Teil c: Freiland (1 m) | 556 | 8896 | Waldboden 66 %, Mähwiese 16 %, Acker 11 %, nichts 2,9 %, Bankett 1,3 %, Gebüsch 1,3 %, Saum 0,9 % |
| Teil c zusammen (Block B 433 Zellen, Block Veßra 132, Orte außerhalb 42) | 607 | 9712 | Waldboden 63 %, Mähwiese 17 %, Acker 10 %, nichts 4,1 %, Zierrasen 1,5 %, Gebüsch 1,4 %, Bankett 1,3 %, Saum 0,9 % |
| alle | 895 | 14320 | Waldboden 50 %, Mähwiese 21 %, Acker 13 %, nichts 7,4 %, Zierrasen 3,8 %, Gebüsch 1,8 %, Bankett 1,2 %, Saum 1,1 % |

Falkos Garten und die modellierte Zone (25 cm): Zierrasen 4045 m², nichts 1718 m², Mähwiese 1363 m², Acker 1071 m², Ufer 429 m², Ackerrand
211 m², Weide 183 m², Saum 129 m², Bankett 37 m², Gemüse 14 m² (gegenüber Teil a: Huberts Südwestecke um den runden Behälter rau,
~390 m² Mähwiese statt Rasen – die Schwelle für raues Gras je Zelle; Falkos Garten im Zaun unverändert).

Bauen: Quadrat und Strecken zusammen 25 min auf dem Chat-Rechner (zwei Kerne geteilt, `nice -n 19`), davon ~1 min für die Bögen.

## Quellen und Lizenzen

- OpenStreetMap über die API (`https://api.openstreetmap.org/api/0.6/map`, Kacheln von 0,0125°, eine Anfrage je Sekunde, im Cache) –
  © OpenStreetMap-Mitwirkende, ODbL 1.0. Overpass und Geofabrik sind vom Chat-Rechner nicht erreichbar.
- Thüringer Luftbild DOP 20 cm in Farbe (`th_dop`) und Farb-Infrarot (`th_dop20cir`), WMS `www.geoproxy.geoportal-th.de/geoproxy/services/DOP`,
  das ganze Quadrat und die Strecken südlich von etwa N 5 597 000 beflogen am 07.04.2024 (vor dem Laubaustrieb), nördlich davon
  (Schleusingens Norden, St. Kilian, Gethles, Fischbach – 72 der 288 Zellen) am 15.05.2024 – der Tag je Zelle per GetFeatureInfo (`th_dop_info`,
  `holen.flight`) – © GDI-Th, dl-de/by-2-0.
- ATKIS Basis-DLM über den WMS `…/services/DLM` (die Ebenen als Bild, ihre Bedeutung per GetFeatureInfo gelesen: Landwirtschaft
  Ackerland/Grünland, Wald, Gehölz, Ortslage, Wohnbau, gemischte Nutzung, besondere funktionale Prägung, Sport/Freizeit mit Funktion,
  Unland, Straßenverkehr, Gewässer, Vegetationsmerkmal) – © GDI-Th, dl-de/by-2-0. Kein Flurstück, keine ALKIS-Daten.
- DGM1/DOM1 (1 m) aus den Mosaiken von `tools/geo` (`geo/out/dgm_mosaic.npy`, `dom_mosaic.npy`) – © GDI-Th, dl-de/by-2-0.
- Daten der App: Straßen, Gebäude, Bäume (`dist/geo`, `dist/gebaeude` mit `z/`), die Wege der Fahrt (`dist/fahrt/strassen.json`), die
  Stadtzonen (`dist/schleusingen/stadt.json`, `dist/vessra/ort.json`), bebaute Flächen (`dist/strassen/ausstattung.json`), die Hecken von
  `stadtgruen`, Garten, Bach, Anger (`app_daten.mjs` liest `viz3/site.js`, `garden/stream_geo.js`, `world/dorfkern_data.js` in node).
- Quellenzeile: `viz3/extra/bewuchs-daten/manifest.json` (`credits_add`). Die Rohdaten (Bilder, OSM-XML) liegen nur im Cache
  (`/home/claude/bewuchs-raw`), nie im Repo; die Prüfbögen zeigen das Luftbild und bleiben ebenfalls draußen.

## Neu bauen

```bash
cd <repo>
python3 -I tools/bewuchs/daten/holen.py korridor            # Teil b: OSM, Luftbilder (0,2 m bzw. 0,4 m je Zelle), Flugtage, Basis-DLM-Blöcke
python3 -I tools/bewuchs/daten/holen.py welt                # Teil c: dasselbe für die Welt-Blöcke und die flachen Orte (zu dritt, ~15 min)
python3 -I tools/bewuchs/daten/holen.py osm                 # OpenStreetMap (Cache /home/claude/bewuchs-raw/osm, BEWUCHS_RAW ändert den Ort)
python3 -I tools/bewuchs/daten/holen.py dlm                 # Basis-DLM, 20 Ebenen, 1 m
python3 -I tools/bewuchs/daten/holen.py dop -3 -4 3 2       # Luftbild Farbe + Infrarot je Zelle (49 × 2 Bilder, ~60 MB, 5 min)
node tools/bewuchs/daten/app_daten.mjs > /home/claude/bewuchs-raw/app.json
nice -n 19 python3 -I tools/bewuchs/daten/bauen.py ratscher korridor welt --boegen <Berichtsordner>   # Karten, Index, Manifest; Bögen
# (nur ein Gebiet: die Zellen der anderen bleiben im Index stehen; nur geänderte PNGs werden geschrieben; --spannen: Wuchs-Spannen neu)
python3 -m unittest discover -s tools/bewuchs/daten -p 'test_*.py'                      # Unit-Tests (rein, ohne Netz)
```

Die Höhenmosaike sucht `raster.py` in `PAV_GEO`, `<repo>/geo` oder `/home/claude/pr-src/geo`; ohne sie gibt es keine Büsche aus Höhen
und keine Böschungen.

## Werkzeuge (`tools/bewuchs/daten/`)

| Datei | was |
|---|---|
| `gemeinsam.py` | Modellrahmen, Zellen, Raster (`Grid`), Klassen, Kodierung, PNG |
| `gebiete.py` | die Gebiete (Quadrat, Strecken mit den Stadtzonen, Welt-Blöcke mit den flachen Orten) und die Auflösung je Zelle |
| `holen.py` | Downloads mit Cache (OSM, DOP, DLM; `dlm_info` für GetFeatureInfo) |
| `osm_flaechen.py` | OSM-XML → Flächen und Linien mit Tags in Modellmetern (Multipolygone) |
| `quellen.py` | alle Vektorquellen einmal geladen (OSM nach Art, Straßen – App, Fahrt, OSM mit den Regeln von `build_roads.py`, die gemalten Straßen der Städte –, Orte, Gebäude, Bäume, App, `stadtgruen`-Hecken) |
| `raster.py` | Luftbild, Höhen und DLM auf ein Modellraster; Flächen, Linien, Kreise als Masken (Pixelmitte zählt) |
| `klassen.py` | die Regeln einer Zelle |
| `handdaten.py` | was den Quellen fehlt (Anger, Schulwiese, Brunnen, Wiese an der Haltestelle, Ziegenweide, Pflanzflecken) |
| `garten.py` | die feine Karte der modellierten Zone |
| `gestaltung.py` | Teil e: Vorgartenbeete, Gemüsebeete, Kleingärten, Verkehrsgrün, Friedhofswege |
| `bauen.py`, `boegen.py`, `boegen_bauen.py` | bauen (schreibt nur geänderte PNGs, behält die Wuchs-Spannen), Prüfbögen, Flächentabelle |
| `app_daten.mjs` | Garten, Bach, Anger aus den Modulen der App (node) |
| `test_gemeinsam.py`, `test_raster.py`, `test_daten.py`, `test_gestaltung.py` | Unit-Tests (Rahmen, Kodierung, Raster, Straßenraster, Bach, Abgleich mit der App – Ziegenweide, Zone, Pflanzflecken, Straßenregeln von `build_roads.py`, Straßenbreiten der Städte –, die Zellen der Strecken, Format der gebauten Karten) |

## Offen (für die nächsten Teile)

- **Teil c steht** (Welt-Blöcke B und Veßra, flache Orte). Offen: die Korridore des Suhl-Chats; der Kontext der Welt (25,6 km, nur
  Stufen 5–7) braucht keine Karten in dieser Auflösung (höchstens grob für die Blüte in der Ferne).
- **Größe:** „Quadrat < 3 MB“ bleibt (49 Zellen); für größere Gebiete sagt eine Summe je Gebiet nichts, sie wächst mit der Fläche. Für
  die Laufzeit zählt, was `BWKARTE` um die Kamera hält (bis 520 m: höchstens 4 × 4 Zellen): je 4 × 4 Zellen < 1,5 MB (heute höchstens
  1,14 MB, Themar) und je PNG < 200 KB – beides prüfen die Unit-Tests.
- **Höhenmodell jenseits des Quadrats** (DOM1/DGM1 Thüringen) für Gebüsch, Feldgehölze und Böschungen; bis dahin die Wälder von
  `welt-wald` (eigene 400-m-Zellen) als Klasse 11 abgleichen, sobald es sie gibt.
- Maibild: Baumkronen im Ort zählen zum Rasen, hohes Gras großer Gärten nur zum Teil Wiese (die Regel für raues Gras ist am Aprilbild
  geeicht); die Flugtag-Grenze geht durch Zellen (Wuchs nach dem Tag der Zellmitte; besser je Bildpunkt nach den Kacheln von
  `th_dop_info`).
- Im Ort zählen graue Flächen mit Moos oder Fugengrün (NDVI 0,18–0,3: Pflaster, Rasengitter) als Rasen bzw. öffentliches Grün.
- Weiden sind nirgends erfasst (nur Ronalds Ziegen und ein Tiergehege); Beete (13) erkennt das Bild nicht; (d) Feldfrüchte nach Flugtag.
