# Spiegelwelt: jedes Gebäude in 3D (`feat/welt-gebaeude`)

Falko (5.11.2026): Dächer, die nur flach im Luftbild liegen – Schuppen, Garagen, Scheunen, die OpenStreetMap fehlen –, sollen als Gebäude
stehen wie die anderen, an ihrem echten Platz, und ihr Dach soll aus dem Bodenbild verschwinden. Hilfs-Agent `welt-gebaeude`, Nacht 5./6.11.

## Was es gibt

- **Gebäude aus Daten (Ratschers Quadrat):** `viz3/src/gebaeude/gebaeude.js` (`GEB`) baut die **318 Gebäude, die OSM fehlten**, aus
  ETHOS.BUILDA (Forschungszentrum Jülich, Grundriss und Höhe jedes Gebäudes in Deutschland, für Thüringen aus dem LoD2 des Landes; ODbL 1.0):
  44 Häuser, 34 Scheunen und Hallen, 231 Schuppen und Garagen, 3 runde Behälter (Gülle/Silage), 6 Türme/Silos. Echte Lage, echte Höhe
  (Boden bis höchster Punkt), Dachform geschätzt (Satteldach längs, große Häuser teils Walmdach, Schuppen Pultdach, Garagen flach, Hallen
  flach geneigt), Dachfarbe aus dem Luftbild 2024. Aussehen wie das Dorf: dieselben Fassaden- und Dach-Shader von `world/village.js`
  (Schuppen aus Brettern, Garagen verputzt oder Ziegel mit hellem Tor, Scheunen mit Bretterwand auf Sockel, Hallen aus Blech, Häuser im
  Dorfstil, Schornsteine) – keine neuen Shader-Programme.
- **Fest:** ihre Wände stehen in den Kollisionen des Quadrats (`RATSCHER.walls` → `WCOL`, Fußgänger und Fahrzeuge), in Gartennähe
  zusätzlich als Kasten im Lauf-Raster.
- **Keine Doppelten:** ein ETHOS-Gebäude, das zu mehr als der Hälfte unter einem OSM-Gebäude liegt, ist schon da; ragt ein Teil heraus
  (z. B. ein angebauter Schuppen), wird nur der Teil gebaut. Im handmodellierten Garten mit Huberts und Ronalds Höfen (x −58…42,
  y −52…48) nichts Neues.
- **Bäume, die Dächer waren:** 40 „Bäume“ des Kronenmodells standen auf diesen Dächern (gefunden, wo OSM keinen Grundriss hatte) –
  ausgeblendet.
- `?nogeb` lässt die neuen Gebäude weg (Vergleich).
- **Bodenbild ohne gedruckte Dächer (Ratscher):** `tools/welt-gebaeude/retusche.py` nimmt aus den Bodenbildern des Quadrats
  (`ortho_near` 4096² über 920 m, `ortho_near_lq`, `ortho_inner` 2048² über 2,4 km) jedes Dach, wo ein Gebäude in 3D steht – die 337 OSM-
  Gebäude, die 318 neuen, die handmodellierten im Garten und auf den Höfen –, samt Dachüberstand und der Neigung des Luftbilds (kein echtes
  Orthofoto: ein Dach liegt um Höhe × Abstand / Flughöhe vom Bildmittelpunkt weg versetzt; je Gebäude am Bild gemessen, mit den Nachbarn
  geglättet) und füllt die Stelle mit dem hellen Boden der Umgebung (Push-Pull-Füllung, Korn der Umgebung, weicher Rand). Neue Dateien
  `ortho_near_r.jpg`, `ortho_near_r_lq.jpg`, `ortho_inner_r.jpg`; die Originale bleiben, `?bodenalt` zeigt sie (Schalter in
  `gebaeude/geb_dach.js`, vor `world/ratscher.js`). Die Dachfarben des Dorfs (`world/village.js` nahm sie aus dem Bodenbild) kommen jetzt
  aus 1024²-Kopien der Originale (`ortho_near_dach.jpg`, `ortho_inner_dach.jpg`). Das Bodenbild ist dasselbe Luftbild wie der DOP 2024
  (gemessen: Versatz 3 cm) – ein Tausch war nicht nötig. Die KTX2-Texturen (`tools/tex`) betreffen die Bodenbilder nicht.

## Daten neu erzeugen

```bash
curl -sSL https://zenodo.org/api/records/11845992/files/DEG.csv/content | python3 -I tools/welt-gebaeude/filter_ethos.py ETHOS.jsonl   # ~1,5 min
python3 -I tools/welt-gebaeude/dop.py DOP.jpg 624320 5594170 626980 5596830 0.5      # Luftbild 2024 des Quadrats (Dachfarben)
pip install mapbox_earcut                                                            # Dachflächen (wie tools/welt/zone_schleusingen.py)
python3 tools/welt-gebaeude/prep.py --ethos ETHOS.jsonl --dop DOP.jpg               # → viz3/extra/welt-gebaeude/dist/gebaeude/ratscher.json
```

Je Gebäude (Format wie `schleusingen/stadt.json`): Grundriss `f`, Art `k` (0 Haus, 1 Scheune/Halle, 2 Schuppen/Garage, 4 Behälter,
5 Turm), Traufe `e`, Höhe `h`, Fassaden `F`, Dachflächen `rv`/`rt`, Dachart `rk` und -farbe `rc`; die **Schätzung, die LoD2 später
ersetzt**: Dachform `r` (0 flach, 1 Pult, 2 Sattel, 3 Walm), Firstrichtung `az`, Neigung `p`, und die ETHOS-Kennung `id` (= Gebäude-ID
des Thüringer LoD2, z. B. `DETHL51P000004BA`).

### Masken anderer Features (Retusche)

Die Retusche gehört diesem Thema; andere Features geben Masken: `viz3/extra/*/maske*.json` =
`{ "src": "…", "polys": [[[x, y], …], …], "pad": m }` – für Ratscher in **Modellmetern** (x Ost, y Nord, wie `world/ratscher.js`), für die
Kacheln in **UTM 25832**. Nach dem Zusammenführen (z. B. `feat/welt-dinge`) einmal neu rechnen und die Bilder einchecken:

```bash
python3 tools/welt-gebaeude/retusche.py --ethos ETHOS.jsonl     # liest viz3/dist/geo/ortho_*.jpg (Originale), schreibt viz3/extra/welt-gebaeude/dist/geo/
```

## Testen

`python3 viz3/test/welt_gebaeude.py 8997` (Thema-Test, `viz3/extra/welt-gebaeude/tests.txt`): Anzahl je Art, keine Doppelten, bekannte
Stellen (Halle südlich vom Garten, runder Behälter, Schuppen im Dorf) haben ein Gebäude – Bilder von oben und vom Boden, vorher (`?nogeb`)
und nachher –, in die Halle laufen hält an der Wand, keine neuen Shader-Programme, keine Seitenfehler. Bilder in `out/welt_gebaeude/`.

## Offen

- Schatten der Häuser im Luftbild bleiben (die 3D-Häuser werfen ihre eigenen) – nur angrenzende sehr dunkle Flächen werden mit entfernt.
- Kachelwelt außerhalb des Quadrats (Schleusingen außerhalb der Altstadt, Strecken nach Schleusingen und Veßra): Daten und Code da
  (`gebaeude/z/`, 11 455 Gebäude in 180 Zellen à 400 m), im ersten Stand nur mit `?gebz` – in Arbeit.
- Echte Dachformen aus dem LoD2 des Landes, sobald der Download-Dienst wieder geht.

## Für den Lead

- `viz3/src/modules.txt`: zwei Blöcke `# feat/welt-gebaeude`: `gebaeude/geb_dach.js` direkt vor `world/ratscher.js` (Schalter der
  Bodenbilder, bevor `ratscher.js` die Namen liest) und `gebaeude/gebaeude.js` zwischen `welt/vessra.js` und `world/worldcol.js` (nach
  dem Dorf – seine Materialien –, vor `worldcol.js` – seine Kollisionen).
- `viz3/src/world/village.js` (markiert `// feat/welt-gebaeude`): ein Import und in `photoSampler` die Dachfarben aus `GEBDACH.near/inner`
  (Kopien der Originale) statt aus dem retuschierten Bodenbild.
- `geoman.tex.near/inner` werden im Manifest der Extra auf die retuschierten Bilder gesetzt (`file`, `lq`; `orig`, `origLq`, `dach` neu).
- Quellen: `credits_add` in `viz3/extra/welt-gebaeude/manifest.json` (ETHOS.BUILDA ODbL 1.0, LoD2 und DOP 2024 © GDI-Th dl-de/by-2-0).
- Höhenfehler bestehender Gebäude: siehe unten (wird ergänzt).
