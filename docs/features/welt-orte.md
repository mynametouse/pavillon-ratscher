# Die flachen Orte der Region in 3D (`feat/welt-orte`)

Falko (17.11.2026 19:41): „Bitte check auch nochmal den Landstraßenweg von Ratscher nach Suhl. Hier gibt es einen Ort, Hirschbach, der ist
noch überhaupt nicht abgedeckt, sondern es ist noch flach. … einige Orte, die einfach noch flach sind, also ohne 3D-Gebäude, obwohl sie
eindeutig auf der Satellitenansicht als Gebäude zu erkennen sind. Die bitte auch realistisch nachbauen …“ Hilfs-Agent `welt-orte` des Chats
session_01Mmpsvp11QsXpPSQRRbZ4Jv, Abend 17.11. (Auftrag `docs/plans/auftraege/welt-orte.md`).

## Was es gibt

- **Daten, dazu zwei kleine Haken (unten):** die Zellen von `gebaeude/gebaeude.js` (400 m, `gebaeude/z/<i>_<j>.json`, Index `z/index.json`; seit V17r
  um die Straßen, die man fährt, um Schleusingen und Kloster Veßra) sind erweitert – derselbe Lader baut sie in Stücken, wenn man näher als
  700 m kommt (Telefone 500 m), und gibt sie jenseits von 900 m (680 m) frei. Jedes Gebäude wie dort: Grundriss und Höhe aus ETHOS.BUILDA
  (für Thüringen aus dem LoD2 des Landes, ODbL), Art, Dachform und -neigung geschätzt, Firstrichtung bei fast quadratischen Häusern und
  Dachfarbe aus dem Luftbild 2024 (WMS der GDI-Th, je Zelle), Fassaden mit Fenstern, Wände an Nachbarn ohne Fenster, dieselben Shader wie
  das Dorf. Werkzeug `tools/welt-gebaeude/orte.py` (nutzt `prep.py`, `wglib.py`).
- **Stufe 1 – der Weg nach Suhl** (600 m beiderseits, wie die Korridore von V17r): die Wege, die `welt/suhl.js` aus dem Daten-Repo in die
  Fahrt gibt (`suhl/anfahrt.json`, `anfahrt-grund.json`: die Landstraße L 3247 über St. Kilian, Erlau und Hirschbach, die A 73, die
  benannten Routen `suhl_land`/`suhl_ab` des Autopiloten) – **2 000 Gebäude** in 38 Zellen (33 neu, 5 ergänzt): 515 Häuser, 289 Scheunen und
  Hallen, 1 188 Schuppen und Garagen, 5 Türme/Silos, 3 Behälter. Erlau 1 122, Hirschbach 599, Breitenbach 138, St. Kilian 25,
  Altendambach 8, einzeln an der Strecke 108.
- **Stufe 2 – jeder übrige Ort der Kacheln:** alles, was in der feinen Stufe (10, 0,8 m je Pixel) der Kachelsätze liegt, auf denen man
  fährt – der Testblock `welt-test/` (9,6 × 9,6 km um den Garten) und `welt-test/zonen/vessra/` (Kloster Veßra bis Themar) –, aber noch flach
  war: **3 397 Gebäude** in 89 Zellen (73 neu, 16 ergänzt). Waldau 1 018, Schwarzbach 696, Breitenbach 557, St. Bernhard 394,
  Schleusingerneundorf 277, Silbach 150, Henfstädt 106, Hinternah 74, Lichtenau 31, Beinerstadt 27, Themar 16, Oberrod 12 und
  Einzelne (Tabelle unten).
- **Zusammen jetzt 18 422 Gebäude in 323 Zellen (13,4 MB)**, vorher 13 025 in 217 (9,5 MB). Die Datensätze der alten Zellen sind
  unverändert (eine ergänzte Zelle hat ihre alten Gebäude vorn, die neuen dahinter); jedes neue trägt `o: "suhl"` bzw. `o: "welt"`
  (welche Stufe es baute; der Lader liest es nicht).
- **Nichts, was andere modellieren:** Ratschers Quadrat (`gebaeude/ratscher.json`, `world/ratscher.js`), was die Zellen schon haben
  (ETHOS-Kennung), **die Stadt Suhl** – ihr ganzes Gemeindegebiet (OSM-Relation 62450, aus `origin/suhl/bestand`
  `tools/suhl/out/bestand/gebiete.geojson`): dort baut der Suhl-Chat jedes Gebäude selbst (Produkt `g` des Daten-Repos); auf Suhls Boden nur
  der Korridor der Anfahrt, der Rest seiner Kacheln ist die Stadt und ihr Rand (Zella-Mehlis, soweit der Rahmen der Kacheln es schneidet) –
  sowie `keepout('zonen')` (Bertholdsburg, Rathaus, St. Johannis, Markt …, Klosterruine, Klosterbezirk, Baumschule …) und die OSM-Häuser,
  die Schleusingens Altstadt und Kloster Veßra selbst bauen (zu mehr als der Hälfte darunter: dasselbe Haus). An einer gezeichneten Straße
  (Fahrt, Schleusingens Straßen, die Anfahrt nach Suhl) bis an den Fahrbahnrand gekürzt (8), weggelassen, wo eine Straße hindurchführt (25).
  Grundrisse unter 4 m² (Kamine, Teile von Dächern im LoD2) bleiben weg (780).
- Geprüft gegen die Gebäude des Suhl-Chats: 57 unserer Gebäude liegen in 4 seiner 397 Kacheln (außerhalb der Stadtgrenze), keins auf einem
  seiner (Kennung und Grundriss, Test `welt_orte`).

## Orte

Jedes ETHOS-Gebäude in den Kacheln, auf denen man fährt (ohne die Stadt Suhl), dem nächsten OSM-Ort zugeordnet (Dorf/Stadt bis 1,2 km, mit
Vorrang vor Weilern und Fluren): „vorher in 3D“ = in den Zellen von V17r, in Ratschers Quadrat oder von Schleusingens Altstadt bzw. Kloster
Veßra selbst gebaut; „nicht gebaut“ = unter 4 m², frei gehalten (Burg, Kloster …) oder von einer Straße durchquert.
(`python3 tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --report`)

| Ort | Art | ETHOS-Gebäude | vorher in 3D | neu: Weg nach Suhl | neu: übrige Orte | nicht gebaut (klein, frei gehalten, Straße) | Mitte (x, y) |
|---|---|---|---|---|---|---|---|
| Erlau | Dorf | 1510 | 331 | 1122 | 0 | 57 | -919, 4725 |
| Waldau | Dorf | 1050 | 0 | 0 | 1018 | 32 | 3644, 38 |
| Schwarzbach | Dorf | 737 | 0 | 0 | 696 | 41 | 4159, -1958 |
| Breitenbach | Dorf | 762 | 28 | 138 | 557 | 39 | 731, 4196 |
| Hirschbach | Dorf | 641 | 0 | 599 | 0 | 42 | -1814, 7038 |
| St. Bernhard | Dorf | 404 | 0 | 0 | 394 | 10 | -12331, -3605 |
| Schleusingerneundorf | Dorf | 300 | 0 | 0 | 277 | 23 | 4079, 4228 |
| Silbach | Dorf | 156 | 0 | 0 | 150 | 6 | 2568, 4046 |
| einzeln (Höfe, Mühlen, Hütten an der Strecke) | – | 111 | 0 | 107 | 2 | 2 | -2901, 9200 |
| Henfstädt | Dorf | 106 | 0 | 0 | 106 | 0 | -12297, 2399 |
| Hinternah | Dorf | 2059 | 1924 | 0 | 74 | 61 | 1918, 2035 |
| Lichtenau | Dorf | 31 | 0 | 0 | 31 | 0 | 4633, 338 |
| St. Kilian | Dorf | 631 | 586 | 25 | 5 | 15 | -190, 3118 |
| Beinerstadt | Dorf | 564 | 521 | 0 | 27 | 16 | -12198, -2299 |
| Themar | Stadt | 2857 | 2733 | 0 | 16 | 108 | -10473, 1143 |
| Oberrod | Dorf | 124 | 106 | 0 | 12 | 6 | 2595, -1467 |
| Altendambach | Dorf | 8 | 0 | 8 | 0 | 0 | -2937, 7195 |
| Wiedersbach | Dorf | 411 | 400 | 0 | 5 | 6 | 1926, -2588 |
| Ehrenberg | Dorf | 365 | 349 | 0 | 5 | 11 | -7837, -1577 |
| Villa Iltenburg | Flur | 33 | 28 | 0 | 5 | 0 | -10373, -305 |
| Schleusingen | Stadt | 4154 | 3952 | 0 | 0 | 202 | -1088, 1279 |
| Neuendambach | Weiler | 91 | 87 | 0 | 4 | 0 | -3340, -2953 |
| Rasenmühle | Einzelhof/Mühle | 125 | 121 | 0 | 3 | 1 | -11000, 1717 |
| Kloster Veßra | Dorf | 335 | 304 | 0 | 2 | 29 | -8754, -104 |
| Heckengereuth | Dorf | 203 | 199 | 0 | 2 | 2 | 1689, -924 |
| Tachbachsmühle | Einzelhof/Mühle | 36 | 33 | 0 | 2 | 1 | -10752, 2182 |
| Poppenwind | Dorf | 2 | 0 | 0 | 2 | 0 | 3738, -4745 |
| Gerhardtsgereuth | Dorf | 292 | 288 | 0 | 1 | 3 | -1640, -3126 |
| Trostadt | Dorf | 46 | 44 | 0 | 1 | 1 | -9193, -3293 |
| Schießplatz | Flur | 1 | 0 | 1 | 0 | 0 | -2458, 10388 |
| Rappelsdorf | Dorf | 790 | 748 | 0 | 0 | 42 | -3139, 21 |
| Gethles | Dorf | 378 | 367 | 0 | 0 | 11 | -4798, 1702 |
| Siegritz | Dorf | 362 | 359 | 0 | 0 | 3 | -7680, -3043 |
| Grimmelshausen | Dorf | 338 | 330 | 0 | 0 | 8 | -9338, -1570 |
| Fischbach | Dorf | 249 | 240 | 0 | 0 | 9 | -2439, 3225 |
| Ratscher | Dorf | 201 | 201 | 0 | 0 | 0 | 225, -143 |
| Geisenhöhn | Dorf | 193 | 193 | 0 | 0 | 0 | -997, -501 |
| Gottfriedsberg | Dorf | 159 | 154 | 0 | 0 | 5 | -832, -1551 |
| Neuhof | Dorf | 142 | 138 | 0 | 0 | 4 | -6535, 1911 |
| Reurieth | Dorf | 120 | 117 | 0 | 0 | 3 | -8407, -3982 |
| Rindermannshof | Einzelhof/Mühle | 79 | 78 | 0 | 0 | 1 | 141, 1675 |
| Zollbrück | Weiler | 9 | 8 | 0 | 0 | 1 | -5250, -968 |
| **zusammen** | | **21165** | **14967** | **2000** | **3397** | **801** | |

## Daten neu erzeugen

```bash
curl -sSL https://zenodo.org/api/records/11845992/files/DEG.csv/content | python3 -I tools/welt-gebaeude/filter_ethos.py ETHOS.jsonl   # ~1,5 min
pip install mapbox_earcut shapely pyproj pillow                      # wie prep.py (ohne -I: earcut liegt im Nutzer-Verzeichnis)
python3 tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --stage suhl --cache /tmp/welt-orte --no-osm    # ~20 s (Luftbilder im Cache)
python3 tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --stage welt --cache /tmp/welt-orte --no-osm    # ~30 s
python3 tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --report --cache /tmp/welt-orte                 # die Tabelle oben
```

Eine Stufe darf wieder laufen: was schon in den Zellen steht, kommt nicht doppelt. Ganz neu: erst
`git checkout viz3/extra/welt-gebaeude/dist/gebaeude/z/` (und neue Zellen löschen). Der Cache hält die Meta-Dateien der Kachelsätze, die
Wege der Anfahrt, die OSM-Orte und je Zelle das Luftbild (0,5 m je Pixel; nie ins Repo). `--no-osm`: ohne die Straßen der Dörfer aus
Overpass (am 17.11. abends nicht erreichbar) – die Fassaden kennen dann nur die Straßen der Fahrt und der Anfahrt (wie V17r).

## Testen

`viz3/test/welt_orte.py` (`viz3/extra/welt-orte/tests.txt`, dazu `welt_gebaeude` und `memphone`):

- ohne Browser (`daten`): Index und Zellen stimmen überein, kein ETHOS-Gebäude doppelt, die Zahlen der Stufen, Hirschbach hat seine Häuser,
  keins unserer Gebäude auf einem des Suhl-Chats (seine Kacheln des Produkts `g`), keins mehr als 0,3 m in einer Straße der Anfahrt, Größe.
- im Browser (`hirschbach`, `strecke`): die Kacheln der Welt und Suhls Daten kommen wie auf der Website vom eigenen Ursprung (der Test
  reicht `welt-test/…` und `suhl/…` an die Website und das Daten-Repo durch, Zwischenspeicher `out/welt_orte_netz/`), `?suhl=1`.
  St. Kilian, Erlau, Hirschbach von der Landstraße: die Zellen kommen, die Gebäude stehen (Zahl in 350 m gegen die Daten), in Hirschbach
  keins auf der gezeichneten Straße, die Füße auf dem gezeichneten Boden, Draw-Calls und Dreiecke der Zellen, ihr Speicher; 1,5 km weiter
  frei, zurück wieder gebaut. Bilder in `out/welt_orte/`.

### Zahlen (Chat-Rechner, SwiftShader, `hoch`, 1920 × 1080; 17.11. abends)

- **Daten:** 323 Zellen, 18 422 Gebäude, 13,4 MB (+106 Zellen, +5 397 Gebäude, +3,9 MB); die größte neue Zelle `-3_11` (Erlau) 390
  Gebäude in 280 KB; jede Datei < 0,3 MB, geholt nur in der Nähe.
- **Hirschbach** (von der L 3247): 13 Zellen gebaut, 403 von 403 Gebäuden in 350 m um die Mitte, keins auf der gezeichneten Straße
  (511 geprüft); ihre Meshes: 28 (Wände und Dächer je Zelle, zwei Zellen mit je einem Gebäude über der Kante), 26 600 Dreiecke, 5,3 MB
  Geometrie; im Bild 152 Draw-Calls gegen 140 ohne die Zellen (+12, Kegel-Ausschnitt), 448 000 gegen 430 000 Dreiecke; JS-Speicher 212 MB.
  Gebaut in Stücken von höchstens 8 ms je Bild (2 ms, solange Kacheln laden) wie alle Zellen; vom Holen bis fertig je Zelle 1–2 s
  Wanduhr im Test (Schritte mit Pausen), die ersten in 40–70 ms. 1,5 km weiter alle 13 frei (Meshes und Daten), zurück wieder gebaut.
- **Füße:** der Lader setzt die Wände bis 0,8 m unter den tiefsten Punkt (`zmin`) und den Boden neu, wenn er sich unter jedem siebten
  Gebäude um mehr als 0,4 m ändert; bei 11 von 449 Gebäuden in Hirschbach lag `zmin` 0,35–0,75 m über den Kacheln (die feinere Stufe kam
  nach dem Bauen) – innerhalb dieser 0,8 m, keine Lücke. Der Test prüft deshalb die Unterkante der Wände gegen die Kacheln.

## Offen

- **Leben in den neuen Orten** (geparkte Autos, Anhänger, Holzstapel aus dem Luftbild wie `welt-dinge`): der Haken in `dinge/dinge.js`
  liest die Gebiete aus `dinge/orte.json` (noch leer); Luftbild 0,1 m und Erkennung für Hirschbach, Erlau, Breitenbach und Waldau laufen
  im Arbeitsordner (`tools/welt-dinge`: `detect.py`, `decide.py`, `prep.py … --wege`).
- **Gebäude, die ETHOS fehlt:** neue Häuser nach dem LoD2-Stand des Landes oder dort vergessene – die Stufe `osm` von `orte.py` (OSM-
  Gebäude ohne ETHOS-Grundriss, Höhe aus den Angaben oder nach Art) folgt im zweiten Push.
- **Dachflächen im Luftbild:** der Satz ohne gedruckte Dächer (`welt-test/v2/`, `tools/welt-gebaeude/kacheln.py`) entsteht nach dem
  Zusammenführen auf `src` von selbst neu (der Workflow `welt-gebaeude-kacheln.yml` läuft, wenn Zellen kommen) – für Waldau, Schwarzbach,
  St. Bernhard … Suhls Kacheln (Hirschbach, Erlau-Nord) kennt `kacheln.py` nicht: dort liegen die Dächer weiter im Bild, unter den Häusern
  (Suhls Luftbild ist ein echtes Orthofoto, die Dächer liegen auf den Grundrissen).
- **Zella-Mehlis** (Rand von Suhls Kacheln, ~590 ETHOS-Gebäude, vom Rahmen der Kacheln geschnitten) bleibt flach – Sache des Suhl-Chats.
- Straßen der Dörfer aus OSM (Overpass war nicht erreichbar): die Fassaden der neuen Häuser wissen nur von den Straßen der Fahrt und der
  Anfahrt, wo die Straße ist (Tür und Fenster zur Straße) – ein zweiter Lauf mit Overpass (ohne `--no-osm`) verbessert das.
- Wie in V17r: Dachformen geschätzt (LoD2-Dächer, sobald der Download des Landes geht), Carports als geschlossene Schuppen, die Schatten
  der Häuser im Luftbild bleiben.

## Für den Lead

- **Zwei kleine Haken** (markiert `// feat/welt-orte`, angekündigt in `docs/PARALLEL.md` df1ee8f4):
  - `viz3/src/gebaeude/gebaeude.js` `zIndex()`: die Reihenfolge der Zellen aus `index.json` `order` (die alten zuerst, wie sie waren, die
    neuen dahinter; ohne `order` sortiert wie bisher). Der Lader nummeriert die Gebäude einer Zelle 10000 + 400 · Platz in dieser Liste –
    der Keim ihrer zufälligen Stile (`styleOf`: Putzfarbe, Fachwerk, Tür, Läden); ohne den Haken hätten 12 333 der 13 025 alten Gebäude
    einen anderen Stil bekommen.
  - `viz3/src/dinge/dinge.js` `round()`: die Gebiete der später gebauten Orte aus `dinge/orte.json` (`{ areas: [{ id, c, r, cell }] }`,
    in `viz3/extra/welt-orte/dist/dinge/`), einmal geholt, sobald man jenseits des Quadrats ist; noch leer (die Daten der Orte folgen).
- Daten in `viz3/extra/welt-gebaeude/dist/gebaeude/z/` (106 neue Zellen, 21 ergänzt, `index.json` mit `orte` – den Zahlen der Stufen –
  und `order`), das Werkzeug `tools/welt-gebaeude/orte.py`; `tools/welt-gebaeude/kacheln.py` retuschiert jetzt auch Suhls Korridor-Kacheln
  unter unseren Gebäuden (Daten-Repo, nur wo unsere Zellen stehen; `--no-suhl` wie bisher); `tools/welt-dinge/prep.py --wege DATEI`
  (Fahrspuren der Anfahrt und der Dorfstraßen für die Stellplatz-Regel); der Test `viz3/test/welt_orte.py`,
  `viz3/extra/welt-orte/tests.txt`, dieses Dokument.
- `CHANGELOG`: „Die flachen Orte der Region in 3D: 5 397 Gebäude mehr – an der Landstraße nach Suhl Erlau, Hirschbach, Breitenbach,
  St. Kilian; abseits Waldau, Schwarzbach, Schleusingerneundorf, Silbach, Hinternah, Lichtenau, St. Bernhard, Henfstädt, Beinerstadt …“
- `ARCHITECTURE` (Kachelwelt/`GEB.Z`): die Zellen decken jetzt alle Kacheln, auf denen man fährt (ohne die Stadt Suhl); Feld `o` je
  Gebäude (`suhl`/`welt`, die Stufe von `welt-orte`), `order` im Index; `DINGE` liest `dinge/orte.json`.
- `PARALLEL`: Zeile `welt-orte`; **an den Suhl-Chat:** Hirschbach, Erlau-Nord und die Höfe an der Strecke stehen jetzt auf euren
  Korridor-Kacheln (ETHOS-Zellen, keine in eurem Gemeindegebiet); `kacheln.py` legt für diese Kacheln Fassungen ohne Dächer in
  `welt-test/v2/` (nur dort, wo unsere Gebäude stehen); Zella-Mehlis am Rand eurer Kacheln bleibt euch.
- Der Workflow `welt-gebaeude-kacheln.yml` läuft nach dem Zusammenführen auf `src` (neue Zellen, neues `kacheln.py`) und schreibt
  `welt-test/v2/` neu – mehr Kacheln als die 950 bisher (die neuen Orte und Suhls Korridor; Grenze 300 MB).
