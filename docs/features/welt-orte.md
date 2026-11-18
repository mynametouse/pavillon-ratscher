# Die flachen Orte der Region in 3D (`feat/welt-orte`)

Falko (17.11.2026 19:41): „Bitte check auch nochmal den Landstraßenweg von Ratscher nach Suhl. Hier gibt es einen Ort, Hirschbach, der ist
noch überhaupt nicht abgedeckt, sondern es ist noch flach. … einige Orte, die einfach noch flach sind, also ohne 3D-Gebäude, obwohl sie
eindeutig auf der Satellitenansicht als Gebäude zu erkennen sind. Die bitte auch realistisch nachbauen …“ Hilfs-Agent `welt-orte` des Chats
session_01Mmpsvp11QsXpPSQRRbZ4Jv, Abend 17.11. (Auftrag `docs/plans/auftraege/welt-orte.md`).

## Was es gibt

- **Daten, dazu drei kleine Haken (unten):** die Zellen von `gebaeude/gebaeude.js` (400 m, `gebaeude/z/<i>_<j>.json`, Index `z/index.json`; seit V17r
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
- **Stufe 3 – was ETHOS fehlt, aus OpenStreetMap** (Hinweis des Leads auf Bildern von Hirschbach): jedes OSM-Gebäude der
  Quadratkilometer mit Gebäuden in den Zellen (117 km², OSM-API, 11 058 Gebäude), das kein ETHOS-Grundriss deckt (15 % davon, eine
  ETHOS-Mitte darin oder seine Mitte in einem ETHOS-Gebäude) – neuer als der LoD2-Stand oder dort vergessen: **357 Gebäude** (Höhe aus `height`/`building:levels`, sonst nach Art
  und Größe): 289 Schuppen und Garagen, 26 Scheunen und Hallen, 38 Häuser, 4 Behälter (in 98 Zellen ergänzt, eine neu) – darunter die **Logistikhalle nördlich von
  Schleusingen** (37 000 m², im Luftbild 2024, in ETHOS nicht), dazu St. Kilian 74, Breitenbach 81, Schwarzbach 19, Erlau 13. Nicht aus OSM:
  Carports, Dächer auf Stützen, Gewächshäuser, Ruinen, Stadtmauern (`OSM_SKIP`), ein Stall ohne Dach im Luftbild (`OSM_NOT`). Hirschbach
  selbst ist fast vollständig: 641 ETHOS-Körper, 599 gebaut, 40 Teile unter 4 m² (Kamine, Dachteile), einer auf der Straße; OSM bringt
  drei Schuppen; im Luftbild bleiben einige kleine Hütten ohne Grundriss in beiden Quellen (Überlagerung: Luftbild mit den Umrissen
  unserer Zellen, der ETHOS- und der OSM-Gebäude).
- **Türen zur Straße:** die Fassaden der neuen Gebäude kennen jetzt auch die Dorfstraßen aus OSM (3 382 Wege; vorher nur die Straßen der
  Fahrt) – die Haustür liegt auf der Seite zur nächsten Straße (in Waldau 287 Fassaden statt keiner mit Straße in der Nähe).
- **Zusammen jetzt 18 779 Gebäude in 324 Zellen (13,6 MB)**, vorher 13 025 in 217 (9,5 MB). Die Datensätze der alten Zellen sind
  unverändert (eine ergänzte Zelle hat ihre alten Gebäude vorn, die neuen dahinter); jedes neue trägt `o: "suhl"`, `"welt"` oder `"osm"`
  (welche Stufe es baute; der Lader liest es nicht). `index.json` `order` hält die Reihenfolge der Zellen fest (Haken unten): die alten
  und die neuen Häuser behalten ihr Aussehen, wenn später Zellen dazukommen.
- **Keine Häuser mehr in der Luft, wenn die feineren Kacheln kommen** (Haken in `gebaeude/gebaeude.js`): eine Zelle wird oft auf dem
  gröberen Boden gebaut – sie kommt auf 700 m, die feineren Kacheln erst auf 380 und 150 m. Zeichnet `welt/welt.js` eine Kachel, die
  vorher nicht gezeichnet war (sein `WELT.visible` ist dann ein neuer Satz) und die nicht nur eine gröbere ist, die wieder für ihre Kinder
  steht, sind die Zellen darunter fällig (gebaute und solche im Bau): jedes ihrer Gebäude wird geprüft – der Boden an Anfang und Mitte
  jeder Wand, wie der Lader den Fuß setzt –, die Zelle am nächsten zuerst, und eine Zelle mit einem Gebäude mehr als 0,25 m daneben wird
  neu gebaut, ihr Auftrag vor den Zellen, die noch kommen. Alles im Budget des Laders von 8 ms je Bild (2 ms, solange Kacheln laden), die
  Prüfung höchstens die Hälfte davon. Vorher fand das nur die Probe (jedes siebte Gebäude, eine Zelle alle 2 s) – und gar nicht für die
  Gebäude einer Zelle, die gebaut wurde, während die Kachel kam (ihre Probe wird beim Fertigwerden genommen): bei GitHub standen in
  Hirschbachs engem Tal 15 Häuser bis zu 7,5 m über dem Boden (Lauf 44163767746).
- **Leben** (wie `welt-dinge`: geparkte Autos, Wohnmobile, Anhänger, Pools aus dem Luftbild, nach Wochentag und Stunde belegt): die neuen
  Gebiete stehen in `dinge/orte.json` (Haken in `dinge/dinge.js`), die Daten je Gebiet in `viz3/extra/welt-dinge/dist/dinge/<gebiet>.json`,
  geprüft wie dort (Regeln aus `decide.py`, Stichprobe von 30 und die Zweifelsfälle von Auge, `pruefung_<gebiet>.json`): **Hirschbach**
  48 Autos (Stichprobe 29 von 30 Autos), **Erlau** 105 Autos, 3 Wohnmobile, 2 Pools, 1 Anhänger, 1 Lkw, **Breitenbach** 55 Autos,
  1 Wohnmobil, 1 Wohnwagen, 2 Pools, **Waldau** 136 Autos, 1 Lkw (Hirschbach in zwei Durchgängen – 0,1 und 0,2 m je Pixel –, die anderen drei im schnellen mit 0,2 m wie die Strecken von `welt-dinge`). Fahrspuren frei wie dort, jetzt auch an der Anfahrt nach Suhl und den Dorfstraßen aus
  OSM (`tools/welt-dinge/prep.py --wege`); was schon in einem anderen Gebiet steht (Breitenbach/St. Kilian: 3), kommt nicht doppelt.
  Ihre Masken gehen in `maske_dinge_utm.json` – die Retusche nimmt die gedruckten Autos aus den Kacheln.
- **Kacheln ohne gedruckte Dächer auch hier:** `tools/welt-gebaeude/kacheln.py` (der Satz `welt-test/v2/`, Workflow
  `welt-gebaeude-kacheln.yml`) nimmt jetzt auch Suhls Korridor-Kacheln (Daten-Repo, nur wo unsere Gebäude stehen, ~106 Kacheln); der
  Workflow läuft nach dem Zusammenführen auf `src` von selbst (neue Zellen, neues Werkzeug) – geschätzt 1 421 Kacheln statt 950. Vorab
  hier gerechnet für Hirschbach, Erlau, St. Kilian und Waldau (109 Kacheln, 3,9 MB, 57 s) und im Test gezeigt (`WELT_V2_LOCAL`).
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
Veßra selbst gebaut; „neu aus OSM“ = Gebäude, die ETHOS nicht kennt (nicht in der ETHOS-Spalte); „nicht gebaut“ = unter 4 m², frei
gehalten (Burg, Kloster …) oder von einer Straße durchquert.
(`python3 tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --report`)

| Ort | Art | ETHOS-Gebäude | vorher in 3D | neu: Weg nach Suhl | neu: übrige Orte | neu aus OSM (ETHOS hat sie nicht) | nicht gebaut (klein, frei gehalten, Straße) | Mitte (x, y) |
|---|---|---|---|---|---|---|---|---|
| Erlau | Dorf | 1510 | 331 | 1122 | 0 | 13 | 57 | -919, 4725 |
| Waldau | Dorf | 1050 | 0 | 0 | 1018 | 4 | 32 | 3644, 38 |
| Breitenbach | Dorf | 762 | 28 | 138 | 557 | 81 | 39 | 731, 4196 |
| Schwarzbach | Dorf | 737 | 0 | 0 | 696 | 19 | 41 | 4159, -1958 |
| Hirschbach | Dorf | 641 | 0 | 599 | 0 | 3 | 42 | -1814, 7038 |
| St. Bernhard | Dorf | 404 | 0 | 0 | 394 | 5 | 10 | -12331, -3605 |
| Schleusingerneundorf | Dorf | 300 | 0 | 0 | 277 | 0 | 23 | 4079, 4228 |
| Silbach | Dorf | 156 | 0 | 0 | 150 | 4 | 6 | 2568, 4046 |
| einzeln (Höfe, Mühlen, Hütten an der Strecke) | – | 111 | 0 | 107 | 2 | 4 | 2 | -2901, 9200 |
| Henfstädt | Dorf | 106 | 0 | 0 | 106 | 0 | 0 | -12297, 2399 |
| St. Kilian | Dorf | 631 | 586 | 25 | 5 | 74 | 15 | -190, 3118 |
| Hinternah | Dorf | 2059 | 1924 | 0 | 74 | 5 | 61 | 1918, 2035 |
| Themar | Stadt | 2857 | 2733 | 0 | 16 | 31 | 108 | -10473, 1143 |
| Beinerstadt | Dorf | 564 | 521 | 0 | 27 | 19 | 16 | -12198, -2299 |
| Lichtenau | Dorf | 31 | 0 | 0 | 31 | 0 | 0 | 4633, 338 |
| Gethles | Dorf | 378 | 367 | 0 | 0 | 21 | 11 | -4798, 1702 |
| Schleusingen | Stadt | 4154 | 3952 | 0 | 0 | 9 | 202 | -1088, 1279 |
| Rappelsdorf | Dorf | 790 | 748 | 0 | 0 | 12 | 42 | -3139, 21 |
| Gerhardtsgereuth | Dorf | 292 | 288 | 0 | 1 | 11 | 3 | -1640, -3126 |
| Oberrod | Dorf | 124 | 106 | 0 | 12 | 0 | 6 | 2595, -1467 |
| Wiedersbach | Dorf | 411 | 400 | 0 | 5 | 6 | 6 | 1926, -2588 |
| Neuhof | Dorf | 142 | 138 | 0 | 0 | 10 | 4 | -6535, 1911 |
| Altendambach | Dorf | 8 | 0 | 8 | 0 | 2 | 0 | -2937, 7195 |
| Heckengereuth | Dorf | 203 | 199 | 0 | 2 | 7 | 2 | 1689, -924 |
| Neuendambach | Weiler | 91 | 87 | 0 | 4 | 5 | 0 | -3340, -2953 |
| Ehrenberg | Dorf | 365 | 349 | 0 | 5 | 1 | 11 | -7837, -1577 |
| Villa Iltenburg | Flur | 33 | 28 | 0 | 5 | 0 | 0 | -10373, -305 |
| Siegritz | Dorf | 362 | 359 | 0 | 0 | 4 | 3 | -7680, -3043 |
| Tachbachsmühle | Einzelhof/Mühle | 36 | 33 | 0 | 2 | 2 | 1 | -10752, 2182 |
| Kloster Veßra | Dorf | 335 | 304 | 0 | 2 | 1 | 29 | -8754, -104 |
| Rasenmühle | Einzelhof/Mühle | 125 | 121 | 0 | 3 | 0 | 1 | -11000, 1717 |
| Trostadt | Dorf | 46 | 44 | 0 | 1 | 2 | 1 | -9193, -3293 |
| Poppenwind | Dorf | 2 | 0 | 0 | 2 | 0 | 0 | 3738, -4745 |
| Grimmelshausen | Dorf | 338 | 330 | 0 | 0 | 1 | 8 | -9338, -1570 |
| Fischbach | Dorf | 249 | 240 | 0 | 0 | 1 | 9 | -2439, 3225 |
| Schießplatz | Flur | 1 | 0 | 1 | 0 | 0 | 0 | -2458, 10388 |
| Ratscher | Dorf | 201 | 201 | 0 | 0 | 0 | 0 | 225, -143 |
| Geisenhöhn | Dorf | 193 | 193 | 0 | 0 | 0 | 0 | -997, -501 |
| Gottfriedsberg | Dorf | 159 | 154 | 0 | 0 | 0 | 5 | -832, -1551 |
| Reurieth | Dorf | 120 | 117 | 0 | 0 | 0 | 3 | -8407, -3982 |
| Rindermannshof | Einzelhof/Mühle | 79 | 78 | 0 | 0 | 0 | 1 | 141, 1675 |
| Zollbrück | Weiler | 9 | 8 | 0 | 0 | 0 | 1 | -5250, -968 |
| **zusammen** | | **21165** | **14967** | **2000** | **3397** | **357** | **801** | |

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
  keins unserer Gebäude auf einem des Suhl-Chats (seine Kacheln des Produkts `g`), keins mehr als 0,3 m in einer Straße der Anfahrt, die
  Gebäude aus OSM liegen auf keinem ETHOS-Gebäude (höchstens ein Fünftel), jedes Gebiet von `dinge/orte.json` hat seine Daten, Größe.
- im Browser (`hirschbach`, `strecke`): die Kacheln der Welt und Suhls Daten kommen wie auf der Website vom eigenen Ursprung (der Test
  reicht `welt-test/…` und `suhl/…` an die Website und das Daten-Repo durch, Zwischenspeicher `out/welt_orte_netz/`), `?suhl=1`.
  St. Kilian, Erlau, Waldau und Hirschbach von der Straße: die Zellen kommen, die Gebäude stehen (Zahl in 350 m gegen die Daten),
  Draw-Calls und Dreiecke der Zellen, ihr Speicher, Bilder von der Straße und aus 60 m; in Hirschbach die geparkten Autos (Gebiet aus
  `dinge/orte.json`), keins auf der gezeichneten Straße, die Füße auf dem gezeichneten Boden, 1,5 km weiter frei, zurück wieder gebaut,
  Bilder mit und ohne die Zellen (`*_vorher`). Bilder in `out/welt_orte/`.
- **Neusetzen:** nach Hirschbach zuerst 600 m von Süden (die Zellen des Südens kommen dort auf den groben Kacheln der Stufe 10), dann in
  die Mitte – die feineren Kacheln kommen unter die gebauten Zellen: jede Zelle, die danach daneben stand, ist binnen 240 Bildern (4 s bei
  60 Bildern je Sekunde; der Test geht 25 ms je Bild) neu gebaut (`GEB.Z.rs.log`), erst dann die strenge Prüfung der Füße (Lauf
  44163767746 war rot: 15 Lücken bis 7,5 m). Der Test wartet nur, bis nichts mehr geholt, gebaut oder geprüft wird (`GEB.Z.rs.due`).
- `WELT_V2_LOCAL=<Ordner>`: ein hier gerechneter Satz ohne Dächer (`kacheln.py --out <Ordner> --near "E,N;E,N"`) über dem der
  Website – so sehen die Bilder aus, bevor der Workflow ihn veröffentlicht hat.

### Zahlen (Chat-Rechner, SwiftShader, `hoch`, 1920 × 1080; 17.11. 21:33, `welt_orte` 26/26 in 692 s)

- **Daten:** 324 Zellen, 18 779 Gebäude, 13,6 MB (gegen V17r +107 Zellen, +5 754 Gebäude, +4,1 MB); die größte neue Zelle `9_0` mit
  351 Gebäuden in 241 KB, die größte ergänzte `-3_11` (Erlau) 391 in 281 KB; jede Datei < 0,5 MB, geholt nur in der Nähe.
- **Im Bild** (von der Straße, die Zellen in 700 m gebaut; JS-Speicher 254 MB an jedem Ort):

  | Ort | Zellen | Gebäude in 350 m | Meshes | Dreiecke der Zellen | Geometrie | Draw-Calls (ohne Zellen) | Dreiecke im Bild (ohne) |
  |---|---|---|---|---|---|---|---|
  | St. Kilian | 13 | 370 | 28 | 34 144 | 6,7 MB | 123 (109) | 341 000 (314 000) |
  | **Erlau** (am dichtesten) | 12 | 705 | 30 | 71 888 | 14,2 MB | 153 (139) | 462 000 (411 000) |
  | Waldau | 11 | 572 | 28 | 52 684 | 10,4 MB | 85 (75) | 252 000 (222 000) |
  | Hirschbach | 13 | 406 | 28 | 26 660 | 5,3 MB | 193 (181) | 450 000 (432 000) |

  Zwei Meshes je Zelle (Wände, Dächer; vier, wo ein Gebäude über die Kante reicht); gebaut in Stücken von höchstens 8 ms je Bild (2 ms,
  solange Kacheln laden); vom Holen bis fertig je Zelle höchstens 1 s Wanduhr im Test (Schritte mit Pausen). In Hirschbach keins auf der
  gezeichneten Straße (514 geprüft), 1,5 km weiter alle Zellen frei (Meshes und Daten), zurück wieder gebaut.
- **Neusetzen** (Hirschbach, von 600 m Süd in die Mitte): 6-mal eine Zelle neu gesetzt (`-5_17`, `-5_18`, `-4_17`; die feineren
  Stufen kommen nacheinander), je 1–33 Bilder nach ihrer Kachel (0,02–0,55 s bei 60 Bildern je Sekunde), 0,29–0,71 m daneben; im ganzen
  Lauf 87 Zellen markiert, 7 646 Gebäude geprüft, 36-mal neu gesetzt, längstens nach 50 Bildern (0,8 s).
- **Füße:** 452 Gebäude in 400 m um Hirschbachs Mitte, keine Lücke; `zmin` höchstens 0,22 m über und 0,19 m unter den Kacheln (vorher
  bis 0,75 m hier, bei GitHub bis 7,5 m).

## Offen

- **Neusetzen nur auf neue Kacheln hin:** wird der Boden gröber (man fährt weg, die Eltern-Kachel steht wieder für ihre Kinder) oder
  ändert er sich ohne neue Kachel (Suhls Paket bringt seinen fernen Boden `terrainFar`), bleibt es bei der Probe des Laders (jedes siebte
  Gebäude, eine Zelle alle 2 s) – meist weit weg vom Blick.
- **Leben in weiteren Orten:** geparkte Autos usw. gibt es jetzt in Hirschbach, Erlau, Breitenbach und Waldau; Schwarzbach, St. Bernhard,
  Schleusingerneundorf, Silbach, Henfstädt … gehen genauso (Luftbild 0,1 m in Blöcken von 350 m, `detect.py`, `decide.py`, Stichprobe von
  Auge, `prep.py … --wege`, Eintrag in `dinge/orte.json`) – etwa 20 min je Dorf hier.
- **Kacheln ohne Dächer** entstehen erst mit dem Workflow nach dem Zusammenführen (bis dahin liegen die gedruckten Dächer und Autos
  neben/unter den neuen Häusern im Bild); Suhls Korridor-Kacheln kopiert `kacheln.py` für `welt-test/v2/` – bringt der Suhl-Chat neue
  Luftbilder, zeigen diese ~106 Kacheln das alte, bis der Workflow wieder läuft.
- **Grüne Streifen auf Suhls Korridor-Kacheln** in Hirschbach (von oben ein Kreuz entlang der Kachelkanten, auch ohne unsere Zellen
  und schon im Lauf vor diesen Änderungen, `hirschbach_oben_vorher.jpg`) – der ferne Boden unter den Kacheln scheint an den Kanten durch;
  Sache von `welt/welt.js`/Suhl, hier nicht angefasst.
- **Zella-Mehlis** (Rand von Suhls Kacheln, ~590 ETHOS-Gebäude, vom Rahmen der Kacheln geschnitten) bleibt flach – Sache des Suhl-Chats.
- Im Luftbild von Hirschbach einige kleine Hütten ohne Grundriss in ETHOS und OSM – ohne Quelle für Umriss und Höhe nicht gebaut.
- Wie in V17r: Dachformen geschätzt (LoD2-Dächer, sobald der Download des Landes geht), Carports als geschlossene Schuppen, die Schatten
  der Häuser im Luftbild bleiben; Gebäude aus OSM ohne Höhe nach Art und Größe geschätzt (die Logistikhalle mit 12 m).

## Für den Lead

- **Drei kleine Haken** (markiert `// feat/welt-orte`; die ersten zwei angekündigt in `docs/PARALLEL.md` df1ee8f4, der dritte auf
  Wunsch des Leads, 17.11. abends):
  - `viz3/src/gebaeude/gebaeude.js` `zIndex()`: die Reihenfolge der Zellen aus `index.json` `order` (die alten zuerst, wie sie waren, die
    neuen dahinter; ohne `order` sortiert wie bisher). Der Lader nummeriert die Gebäude einer Zelle 10000 + 400 · Platz in dieser Liste –
    der Keim ihrer zufälligen Stile (`styleOf`: Putzfarbe, Fachwerk, Tür, Läden); ohne den Haken hätten 12 333 der 13 025 alten Gebäude
    einen anderen Stil bekommen.
  - `viz3/src/dinge/dinge.js` `round()`: die Gebiete der später gebauten Orte aus `dinge/orte.json` (`{ areas: [{ id, c, r, cell }] }`,
    in `viz3/extra/welt-orte/dist/dinge/`), einmal geholt, sobald man jenseits des Quadrats ist: Hirschbach, Erlau, Breitenbach, Waldau.
  - `viz3/src/gebaeude/gebaeude.js` `runJobs()` (zwei Zeilen: `rsWatch()` vorn, `rsCheck(t0 + budget / 2)` vor der Schleife; die
    Abbruchbedingung auch bei fälligen Zellen) und ein Block hinter `zPush()` (`RS` = `GEB.Z.rs`, `rsWatch`, `rsCheck`): das Neusetzen
    auf neue Kacheln hin (oben, „Keine Häuser mehr in der Luft“). Die Probe des Laders bleibt, wie sie war; nichts in `welt/welt.js`.
- Daten in `viz3/extra/welt-gebaeude/dist/gebaeude/z/` (107 neue Zellen, alte ergänzt, `index.json` mit `orte` – den Zahlen der Stufen –
  und `order`), das Werkzeug `tools/welt-gebaeude/orte.py`; in `viz3/extra/welt-dinge/` (Ordner von `welt-dinge`) die Daten der vier
  Gebiete (`dist/dinge/<gebiet>.json`), ihre Prüfungen (`pruefung_<gebiet>.json`) und ihre Masken (`maske_dinge*.json`, um die
  Gebiete ergänzt, die alten unverändert); `tools/welt-gebaeude/kacheln.py` retuschiert jetzt auch Suhls Korridor-Kacheln
  unter unseren Gebäuden (Daten-Repo, nur wo unsere Zellen stehen; `--no-suhl` wie bisher); `tools/welt-dinge/prep.py --wege DATEI`
  (Fahrspuren der Anfahrt und der Dorfstraßen für die Stellplatz-Regel); der Test `viz3/test/welt_orte.py`,
  `viz3/extra/welt-orte/tests.txt`, dieses Dokument.
- `CHANGELOG`: „Die flachen Orte der Region in 3D: 5 754 Gebäude mehr – an der Landstraße nach Suhl Erlau, Hirschbach, Breitenbach,
  St. Kilian; abseits Waldau, Schwarzbach, Schleusingerneundorf, Silbach, Hinternah, Lichtenau, St. Bernhard, Henfstädt, Beinerstadt …;
  357 Gebäude, die das LoD2 noch nicht kennt, aus OpenStreetMap (die Logistikhalle nördlich von Schleusingen); Haustüren zur Dorfstraße;
  geparkte Autos, Wohnmobile und Anhänger in Hirschbach, Erlau, Breitenbach und Waldau; die Häuser der alten Zellen sehen aus wie zuvor;
  kommt der feinere Boden, setzen sich die Häuser sofort neu darauf (keine schwebenden Häuser mehr in engen Tälern wie Hirschbach).“
- `ARCHITECTURE` (Kachelwelt/`GEB.Z`): die Zellen decken jetzt alle Kacheln, auf denen man fährt (ohne die Stadt Suhl); Feld `o` je
  Gebäude (`suhl`/`welt`/`osm`, die Stufe von `welt-orte`), `order` im Index; `DINGE` liest `dinge/orte.json`; der Lader setzt eine
  Zelle neu, sobald `WELT.visible` eine feinere Kachel darunter zeigt (`GEB.Z.rs`: fällige Zellen `due`, Zähler, `log` der letzten 40).
- `PARALLEL`: Zeile `welt-orte`; **an den Suhl-Chat:** Hirschbach, Erlau-Nord und die Höfe an der Strecke stehen jetzt auf euren
  Korridor-Kacheln (ETHOS-Zellen, keine in eurem Gemeindegebiet); `kacheln.py` legt für diese Kacheln Fassungen ohne Dächer in
  `welt-test/v2/` (nur dort, wo unsere Gebäude stehen); Zella-Mehlis am Rand eurer Kacheln bleibt euch.
- Der Workflow `welt-gebaeude-kacheln.yml` läuft nach dem Zusammenführen auf `src` (neue Zellen, neues `kacheln.py`) und schreibt
  `welt-test/v2/` neu – mehr Kacheln als die 950 bisher (die neuen Orte und Suhls Korridor; Grenze 300 MB).
