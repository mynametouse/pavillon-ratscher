# Spiegelwelt: jedes Gebäude in 3D (`feat/welt-gebaeude`)

Falko (5.11.2026): Dächer, die nur flach im Luftbild liegen – Schuppen, Garagen, Scheunen, die OpenStreetMap fehlen –, sollen als Gebäude
stehen wie die anderen, an ihrem echten Platz, und ihr Dach soll aus dem Bodenbild verschwinden. Hilfs-Agent `welt-gebaeude`, Nacht 5./6.11.

## Was es gibt

- **Gebäude aus Daten (Ratschers Quadrat):** `viz3/src/gebaeude/gebaeude.js` (`GEB`) baut die **308 Gebäude, die OSM fehlten**, aus
  ETHOS.BUILDA (Forschungszentrum Jülich, Grundriss und Höhe jedes Gebäudes in Deutschland, für Thüringen aus dem LoD2 des Landes; ODbL 1.0):
  44 Häuser, 34 Scheunen und Hallen, 221 Schuppen und Garagen, 3 runde Behälter (Gülle/Silage), 6 Türme/Silos. Echte Lage, echte Höhe
  (Boden bis höchster Punkt), Dachform geschätzt (Satteldach längs, große Häuser teils Walmdach, Schuppen Pultdach, Garagen flach, Hallen
  flach geneigt; bei fast quadratischen Häusern und Scheunen die Firstrichtung aus dem Luftbild – die beiden Dachseiten sind von der Sonne
  verschieden hell, die Trennlinie ist der First: in Ratscher 9, jenseits 770 Gebäude), Dachfarbe aus dem Luftbild 2024. Aussehen wie das
  Dorf: dieselben Fassaden- und Dach-Shader von `world/village.js`
  (Schuppen aus Brettern, Garagen verputzt oder Ziegel mit hellem Tor, Scheunen mit Bretterwand auf Sockel, Hallen aus Blech, Häuser im
  Dorfstil, Schornsteine) – keine neuen Shader-Programme.
- **Fest:** ihre Wände stehen in den Kollisionen des Quadrats (`RATSCHER.walls` → `WCOL`, Fußgänger über `KERN.pushOut`, Fahrzeuge); keins
  reicht in das Lauf-Raster des Gartens (x −50…50, y −55…55 – der Test prüft das). Zäune, Hecken, Tonnen und Holzstapel, die
  `world/village_near.js` um die Häuser des Dorfs stellt, halten Abstand zu ihnen (`GEB.footFree`).
- **Keine Doppelten:** ein ETHOS-Gebäude, das zu mehr als der Hälfte unter einem OSM-Gebäude liegt, ist schon da; ragt ein Teil heraus
  (z. B. ein angebauter Schuppen), wird nur der Teil gebaut – nicht aber schmale Streifen, die nur aus einem etwas anderen Umriss kommen
  (der Rest muss mindestens 2 m breit und 8 m² groß sein). Im handmodellierten Garten mit Huberts und Ronalds Höfen (x −58…42,
  y −52…48) nichts Neues.
- **Bäume, die Dächer waren:** 40 „Bäume“ des Kronenmodells standen auf diesen Dächern (gefunden, wo OSM keinen Grundriss hatte) –
  ausgeblendet.
- `?nogeb` lässt die neuen Gebäude weg (Vergleich). Gebaut wird nach dem Laden in Stücken von wenigen Millisekunden je Bild
  (`KERN.tick` „gebaeude/bau“), die Kollisionen stehen schon beim Laden.
- **Jenseits des Quadrats (Kachelwelt):** 11 386 Gebäude in 180 Zellen à 400 m (`gebaeude/z/<i>_<j>.json`, Index `z/index.json`):
  Schleusingen um die Altstadt herum (1,7 km um den Markt, ohne die 789 Häuser von `welt/schleusingen.js`), die Straßen, die man fährt
  (`welt/fahrt.js`, 260 m beiderseits: Richtung Schleusingen und Kloster Veßra mit den Dörfern unterwegs), Kloster Veßra (950 m, ohne die
  156 Häuser von `welt/vessra.js`). Eine Zelle wird geholt und gebaut, wenn man ihr näher als 700 m kommt, und jenseits von 900 m
  freigegeben; ihr Fuß auf dem Gelände, wie es dort gezeichnet ist (die Kacheln von `welt/welt.js`, sonst das grobe Gelände – kommt eine
  Kachel später, wird die Zelle neu gesetzt). Fest über `KERN.pushOut` (Rang 15, antwortet nur, wenn es verschoben hat – Schleusingen und
  Veßra werden danach gefragt; Fahrzeuge draußen über `VEH.hitsOut`). `?nogebz` lässt sie weg.
- **Bodenbild ohne gedruckte Dächer (Ratscher):** `tools/welt-gebaeude/retusche.py` nimmt aus den Bodenbildern des Quadrats
  (`ortho_near` 4096² über 920 m, `ortho_near_lq`, `ortho_inner` 2048² über 2,4 km) jedes Dach, wo ein Gebäude in 3D steht – die 337 OSM-
  Gebäude, die neuen, die handmodellierten im Garten und auf den Höfen –, samt Dachüberstand und der Neigung des Luftbilds (kein echtes
  Orthofoto: ein Dach liegt um Höhe × Abstand / Flughöhe vom Bildmittelpunkt weg versetzt; je Gebäude am Bild gemessen, mit den Nachbarn
  geglättet, dazu ein mit der Höhe wachsender Rand) und füllt die Stelle mit dem hellen Boden der Umgebung (Push-Pull-Füllung, Korn der
  Umgebung, weicher Rand). Die **Schatten der Häuser im Luftbild bleiben**: die Häuser des Dorfs werfen keine eigenen (`castShadow` aus in
  `world/ratscher.js`/`village.js`, die neuen ebenso) – ohne die Schatten des Fotos stünden sie wie aufgesetzt. Wer sie doch entfernen will:
  `USE_SHADOW_ZONE = True` in `retusche.py` (wo ein Schatten beim Flug am 07.04.2024 hinfiel – Nordnordwest, etwa 1 m je Meter Höhe –,
  wird das Dunkle mit gefüllt; ausprobiert, sieht aus der Luft sauberer aus). Neue Dateien
  `ortho_near_r.jpg`, `ortho_near_r_lq.jpg`, `ortho_inner_r.jpg`; die Originale bleiben, `?bodenalt` zeigt sie (Schalter in
  `gebaeude/geb_dach.js`, vor `world/ratscher.js`). Die Dachfarben des Dorfs (`world/village.js` nahm sie aus dem Bodenbild) kommen jetzt
  aus 1024²-Kopien der Originale (`ortho_near_dach.jpg`, `ortho_inner_dach.jpg`). Das Bodenbild ist dasselbe Luftbild wie der DOP 2024
  (gemessen: Versatz 3 cm) – ein Tausch war nicht nötig.
  **Was welches Gerät lädt:** Rechner (`QUALITY` „high“) `ortho_near_r.jpg` (4096²) und `ortho_inner_r.jpg`; Telefone und Tablets (`lq`)
  `ortho_near_r_lq.jpg` (2048², aus demselben retuschierten Bild verkleinert) und `ortho_inner_r.jpg` (es gibt kein `_lq` davon), beim Laden
  wie bisher von `TEXHALF` halbiert; `ortho_outer`/`ortho_far` (≥ 4,9 m je Pixel) bleiben unverändert. Die KTX2-Texturen (`tools/tex`,
  `gh-pages/tex2/`) enthalten nur `tex/<name>_col|nrm|orm` und glTF-Bilder – keine Bodenbilder (geprüft), dort gibt es nichts nachzuziehen.

- **Kacheln ohne gedruckte Dächer (Kachelwelt):** `tools/welt-gebaeude/kacheln.py` retuschiert die Luftbild-Kacheln (Stufen 10–12) unter
  jedem Gebäude, das jenseits des Quadrats in 3D steht (Schleusingens Altstadt, Kloster Veßra, die Zellen): **882 Kacheln, 28 MB, als neuer
  Satz unter `gh-pages/welt-test/v2/`** (nur die retuschierten `i/{L}/{x}/{y}.webp` + `index.json`; die veröffentlichten Kacheln bleiben
  unberührt). Gebaut und veröffentlicht vom Workflow `.github/workflows/welt-gebaeude-kacheln.yml` (bei jedem Push auf
  `feat/welt-gebaeude`, der das Werkzeug, die Zellen oder Masken ändert; schreibt nur `welt-test/v2/`). Die App nimmt sie **nur mit dem
  Schalter**: `?welt2` zum Ausprobieren, `GEB.TILES2` (`S.TILES2 = false` in `gebaeude/gebaeude.js`) legt ihn für alle um. Ohne Schalter
  fragt die App `welt-test/v2/` gar nicht an.

## Daten neu erzeugen

```bash
curl -sSL https://zenodo.org/api/records/11845992/files/DEG.csv/content | python3 -I tools/welt-gebaeude/filter_ethos.py ETHOS.jsonl   # ~1,5 min
python3 -I tools/welt-gebaeude/dop.py DOP.jpg 624320 5594170 626980 5596830 0.5      # Luftbild 2024 des Quadrats (Dachfarben)
pip install mapbox_earcut                                                            # Dachflächen (wie tools/welt/zone_schleusingen.py)
python3 tools/welt-gebaeude/prep.py --ethos ETHOS.jsonl --dop DOP.jpg               # → viz3/extra/welt-gebaeude/dist/gebaeude/ratscher.json
python3 tools/welt-gebaeude/prep.py --tiles --ethos ETHOS.jsonl --debug DIR         # → gebaeude/z/ (Dachfarben: DOP je Zelle vom WMS, ~3 min)
python3 tools/welt-gebaeude/prep.py --heights --ethos ETHOS.jsonl                   # Höhen der OSM-Gebäude gegen ETHOS (Liste unten)
python3 tools/welt-gebaeude/lod2.py                                                 # geht der LoD2-Download wieder? (und wie er die Dächer ersetzt)
```

Je Gebäude (Format wie `schleusingen/stadt.json`): Grundriss `f`, Art `k` (0 Haus, 1 Scheune/Halle, 2 Schuppen/Garage, 4 Behälter,
5 Turm), Traufe `e`, Höhe `h`, Fassaden `F`, Dachflächen `rv`/`rt`, Dachart `rk` und -farbe `rc`; die **Schätzung, die LoD2 später
ersetzt**: Dachform `r` (0 flach, 1 Pult, 2 Sattel, 3 Walm), Firstrichtung `az` (Grad von Nord; `rq: "foto"`, wenn sie aus dem Luftbild
gelesen ist, sonst längs der langen Seite), Neigung `p`, und die ETHOS-Kennung `id` (= Gebäude-ID des Thüringer LoD2, z. B.
`DETHL51P000004BA`).

### Masken anderer Features (Retusche)

Die Retusche gehört diesem Thema; andere Features geben Masken: `viz3/extra/*/maske*.json` =
`{ "src": "…", "polys": [[[x, y], …], …], "pad": m }` – für Ratscher in **Modellmetern** (x Ost, y Nord, wie `world/ratscher.js`), für die
Kacheln in **UTM 25832** als `viz3/extra/*/maske*_utm.json`. Nach dem Zusammenführen (z. B. `feat/welt-dinge`) einmal neu rechnen und die
Bilder einchecken (Ratscher); die Kacheln rechnet der Workflow neu, sobald eine `maske*_utm.json` auf `feat/welt-gebaeude` ankommt (oder
von Hand: `python3 tools/welt-gebaeude/kacheln.py --out site/v2`):

```bash
python3 tools/welt-gebaeude/retusche.py      # liest viz3/dist/geo/ortho_*.jpg (Originale), alle viz3/extra/*/maske*.json, schreibt viz3/extra/welt-gebaeude/dist/geo/
git add viz3/extra/welt-gebaeude/dist/geo/ortho_*_r*.jpg && git commit …     # die drei Bilder (die Kopien *_dach.jpg ändern sich nicht)
```

Ohne `--ethos` nimmt es die ETHOS-Grundrisse des Gartens und der Streifen aus `tools/welt-gebaeude/retusche_etc.json` (mit `--ethos` neu
geschrieben). Die Kacheln: der Workflow `welt-gebaeude-kacheln.yml` läuft auch auf `src`, sobald dort eine `maske*_utm.json`, eine Zelle oder
das Werkzeug ankommt – nach dem Zusammenführen von `feat/welt-dinge` entsteht `welt-test/v2/` also von selbst neu (nur dieser Ordner).

## Testen

`python3 viz3/test/welt_gebaeude.py 8997` (Thema-Test, `viz3/extra/welt-gebaeude/tests.txt`, dazu `schleusingen`): Bodenbilder
retuschiert, Dachfarben des Dorfs unverändert (gegen `?bodenalt`), Anzahl je Art, keine Doppelten, nichts im Garten, bekannte Stellen (Halle
südlich vom Garten, runder Behälter, Schuppen im Dorf, Anger von oben) haben ein Gebäude – Bilder von oben und vom Boden, vorher
(`?nogeb&bodenalt`) und nachher –, in die Halle laufen hält an der Wand, keine neuen Shader-Programme; Schleusingen: die Zellen um den Markt
kommen, keine doppelt zur Altstadt, ein Haus vom Boden und von oben (vorher: die veröffentlichten Kacheln ohne Zellen), seine Wand hält
den Fußgänger auf, mit `?welt2` die Kacheln ohne Dächer; keine Seitenfehler. Bilder in `out/welt_gebaeude/`.

### Bilder (`out/welt_gebaeude/`, bei GitHub im Artefakt `out` des Laufs)

| Bild | zeigt |
|---|---|
| `halle_top_vorher.jpg` / `halle_top.jpg` | Agrarhalle südlich vom Garten: vorher flach im Luftbild, jetzt Halle in 3D, Bodenbild ohne Dach |
| `halle_boden_vorher.jpg` / `halle_boden.jpg` | dieselbe Halle vom Boden |
| `tank_top_vorher.jpg` / `tank_top.jpg`, `tank_boden*.jpg` | die runden Güllebehälter westlich vom Garten |
| `dorf_top*.jpg`, `dorf_boden*.jpg` | Schuppen und Nebengebäude in einem Hof im Dorf |
| `anger_top*.jpg` | der Anger von oben: zwischen den Häusern keine gedruckten Dächer mehr |
| `halle_wand.jpg` | in die Halle gelaufen: die Wand hält auf |
| `stadt_top*.jpg`, `stadt_boden_vorher.jpg` / `stadt_boden.jpg` | Schleusingen außerhalb der Altstadt (ein Haus der Zellen, ~440 m vom Markt): vorher Wiese mit Dach im Luftbild, jetzt das Haus |

## Offen

- Gebäude abseits der befahrenen Straßen jenseits des Quadrats (nur Schleusingen, Veßra und 260 m beiderseits der Straßen von
  `welt/fahrt.js` sind dabei); Suhl (noch nicht in der App).
- Echte Dachformen aus dem LoD2 des Landes, sobald der Download-Dienst wieder geht (`tools/welt-gebaeude/lod2.py` prüft das; 6.11. 0:05:
  „nicht verfügbar“).
- Carports (offen, Pfosten) sind von Schuppen nicht zu unterscheiden (ETHOS hat keine Gebäudefunktion; das LoD2 hat sie) – sie stehen als
  kleine geschlossene Bauten.
- Die Schatten der Häuser im Luftbild bleiben (Ratscher und Kacheln; siehe oben) – richtig wäre, wenn alle Häuser eigene Schatten würfen.

## Für den Lead

- `viz3/src/modules.txt`: zwei Blöcke `# feat/welt-gebaeude`: `gebaeude/geb_dach.js` direkt vor `world/ratscher.js` (Schalter der
  Bodenbilder, bevor `ratscher.js` die Namen liest) und `gebaeude/gebaeude.js` zwischen `welt/vessra.js` und `world/worldcol.js` (nach
  dem Dorf – seine Materialien –, vor `worldcol.js` – seine Kollisionen).
- `viz3/src/world/village.js` (markiert `// feat/welt-gebaeude`): ein Import und in `photoSampler` die Dachfarben aus `GEBDACH.near/inner`
  (Kopien der Originale) statt aus dem retuschierten Bodenbild.
- `viz3/src/world/village_near.js` (markiert `// feat/welt-gebaeude`): `freeAt` fragt zuerst `GEB.footFree` (über `window.GEB`, kein
  Import) – Zäune, Hecken, Tonnen und Holzstapel nicht durch die neuen Schuppen und Garagen.
- `geoman.tex.near/inner` werden im Manifest der Extra auf die retuschierten Bilder gesetzt (`file`, `lq`; `orig`, `origLq`, `dach` neu).
- `viz3/src/welt/welt.js` (markiert `// feat/welt-gebaeude`): beim Laden einer Kachel die Bild-Adresse über `S.imgBase(t)`, wenn gesetzt
  (`gebaeude/gebaeude.js` setzt es nur mit dem Schalter `?welt2` / `GEB.TILES2`).
- `gh-pages/welt-test/v2/` neu (Workflow `welt-gebaeude-kacheln.yml`, schreibt nur diesen Ordner; die Kacheln unter `welt-test/` selbst
  bleiben unberührt). **Umlegen, wenn `?welt2` in der Vorschau gut aussah:** in `viz3/src/gebaeude/gebaeude.js` die Zeile
  `S.TILES2 = false;` → `S.TILES2 = true;` – sonst nichts (die App holt dann `welt-test/v2/index.json` und nimmt für die dort genannten
  Kacheln das Bild aus `v2/`, Gelände und alle anderen Kacheln wie bisher). Zurück: wieder `false`.
- Quellen: `credits_add` in `viz3/extra/welt-gebaeude/manifest.json` (ETHOS.BUILDA ODbL 1.0, LoD2 und DOP 2024 © GDI-Th dl-de/by-2-0).
- **Höhen der 337 OSM-Gebäude im Vergleich mit ETHOS/LoD2** (`world/ratscher.js`, höchste Wandoberkante = Giebelspitze vs. ETHOS-Höhe
  Boden–First; 310 zugeordnet, Median −0,3 m, mittlere Abweichung 1,1 m; 39 mit mehr als 2,5 m). Zu niedrig sind vor allem Scheunen und
  Häuser im Ortskern (bis 6 m – wie `dorfkern` schon fand: das Oberflächenmodell setzte Traufen zu tief). Die größten (Gebäudenummer =
  `VILLAGE.byId`, Lage in Modellmetern, Grundfläche m², OSM-Höhe, ETHOS-Höhe, Differenz):

  | Nr. | x, y | m² | OSM | ETHOS | Diff. |
  |---|---|---|---|---|---|
  | 241 | 200, −162 | 535 | 7,8 | 13,8 | −6,0 |
  | 89 | −807, 972 | 306 | 5,0 | 9,8 | −4,8 |
  | 252 | 274, −154 | 447 | 6,5 | 11,2 | −4,7 |
  | 232 | 134, −155 | 368 | 8,7 | 12,8 | −4,1 |
  | 235 | 152, −161 | 258 | 8,9 | 13,0 | −4,1 |
  | 194 | 149, −239 | 136 | 6,4 | 10,4 | −4,0 |
  | 211 | 296, −98 | 279 | 6,0 | 10,0 | −4,0 |
  | 228 | 97, −151 | 486 | 9,0 | 12,9 | −4,0 |
  | 155 | −858, −576 | 99 | 6,0 | 9,9 | −3,9 |
  | 205 | 346, −141 | 272 | 6,8 | 10,5 | −3,7 |
  | 230 | 121, −152 | 346 | 8,9 | 12,6 | −3,7 |
  | 275 | −740, 736 | 133 | 8,0 | 11,7 | −3,7 |
  | 212 | 286, −90 | 290 | 6,4 | 9,9 | −3,6 |
  | 167 | −880, −523 | 212 | 7,7 | 11,2 | −3,5 |
  | 198 | 329, −232 | 118 | 7,0 | 10,5 | −3,5 |

  Umgekehrt (OSM viel höher, ETHOS hat dort nur einen kleinen Teil – Gebäude anders oder abgerissen?): 271 (−893, 789: 11,0 m vs. 3,0 m),
  274 (−745, 761), 289 (−801, 799), 20 (−670, 866). Liste neu: Abschnitt „Höhen prüfen“ in `tools/welt-gebaeude/prep.py --heights`.
