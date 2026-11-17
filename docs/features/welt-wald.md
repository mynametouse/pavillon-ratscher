# Wald und Bäume der Region in 3D (`feat/welt-wald`)

Falko (17.11.2026, nach der Fahrt von Ratscher nach Suhl): die Region ist flach – Wälder und Bäume gibt es nur im Luftbild. „Stück für
Stück diese flachen Satellitenbilder mit realem Leben und realen 3D-Darstellungen ergänzen.“ Hilfs-Agent `welt-wald`, Auftrag
`docs/plans/auftraege/welt-wald.md`.

## Was es gibt

- **Jeder Baum als Datensatz:** jenseits von Ratschers 2,4-km-Quadrat steht in Zellen zu 400 m (dasselbe Raster wie `gebaeude/z/`)
  jeder Baum der Wälder, Gehölze, Baumreihen und Felder: Lage, Höhe, Kronenradius, Art, Merker (Waldrand, Höhe gemessen, im Wald, jung)
  und ein Rang (welche Bäume bleiben, wenn eine Stufe ausdünnt). `weltwald/z/<i>_<j>.bin` (8 Byte je Baum, gepackt), Verzeichnis
  `weltwald/z/index.json` (Bäume, Bytes und Arten je Zelle).
- **Wo:** zuerst die Straße, die man nach Suhl fährt – von Schleusingen über St. Kilian und Hirschbach (`suhl_land`, Suhls Anfahrt),
  400 m beiderseits: 86 Zellen, 310 726 Bäume, 1,0 MB. Die Korridore nach Schleusingen (`markt`) und nach Kloster Veßra (`baumschule`,
  `welt/fahrt.js`) sind erzeugt, aber noch nicht dabei (Stand auf `wip/welt-wald`); die übrigen Kacheln der Welt folgen. **Nicht**, wo
  andere pflanzen: Ratschers Quadrat (seine gemessenen Bäume, der Wald an der Klinge), Schleusingens Stadtzone (`stadt.json` `zone`,
  Hilfs-Agent `stadtgruen`), Suhls Kacheln (die 416 Kacheln der Stufe 10 seines Produkts `b`, Suhl-Chat) und was Kloster Veßra selbst
  modelliert (`wglib.keepout('zonen')`).
- **Woher (alle offen, ohne Anmeldung):**
  - **Luftbild DOP 20 cm, RGB und Infrarot** (WMS `th_dop`, `th_dop20cir`; © GDI-Th, Datenlizenz Deutschland – Namensnennung 2.0,
    `dl-de/by-2-0`): was jetzt steht (Bildflüge 7.4.2024, 15.5.2024, 12.5.2025) – grün im Infrarot (NDVI), keine helle Fläche (Schlag,
    Holz, Gras der Kahlfläche nach dem Borkenkäfer), Nadel oder Laub, wo die Karte es nicht weiß (im April-Flug ist das Laub noch kahl, im
    Mai sind Nadelbäume bläulicher und dunkler; eine Lärche ist im April kahl wie ein Laubbaum).
  - **High Resolution Canopy Height Maps by WRI and Meta** (Tolan et al. 2024, 1 m, CC BY 4.0; öffentliche COG-Datei auf AWS): Höhe des
    Kronendachs, seine Spitzen (ein Baum je Spitze). Das Oberflächenmodell DOM1 des Landes ist weiter nur hinter einem CAPTCHA zu haben
    (`tools/welt/QUELLEN.md`) – nicht benutzt.
  - **Copernicus High Resolution Layer Dominant Leaf Type 2018** (10 m; © European Union, Copernicus Land Monitoring Service, European
    Environment Agency): Laub- oder Nadelwald (über den offenen Bilddienst der EEA).
  - **OpenStreetMap** (ODbL 1.0): Wege und Gleise, auf denen kein Baum steht; Waldflächen (die Abfrage in Stücken läuft, der erste Stand
    kommt ohne sie aus). Die App-Straßen (`fahrt/strassen.json`, Suhls Anfahrt) mit 1,5 m Abstand zur Fahrbahn.
  - **ETHOS.BUILDA** (Forschungszentrum Jülich, ODbL 1.0): kein Baum in einem Gebäude.
  - Alle Quellen stehen in den Credits (`credits_add` in `viz3/extra/welt-wald/manifest.json`) und in `weltwald/z/index.json` (`src`).
- **Wie gezeichnet** (`viz3/src/weltwald/weltwald.js`, `WWALD`): eine kleine, feste Zahl instanzierter Meshes, die um die Kamera neu
  gefüllt werden (nur was im Blick ist, mit Rand):
  - **nah** – Laubbäume bis 24 m („hoch“; 20 „mittel“, 16 „schnell“, 12 am Telefon), Nadelbäume bis 15 m (12 / 10 / 7): die Fichten,
    Kiefern und Lärchen des Walds an der Klinge (`world/forest.js`, seine Modelle und Programme) und die Laubbaum-Arten des Gartens
    (`garden/trees.js` `TREES`, ihre Materialien); Schatten; die Stämme halten Fußgänger und Fahrzeuge auf (`KERN.pushOut`, Rang 14).
  - **Mitte** – Nadelbäume bis 105 / 90 / 72 / 50 m: dieselben Modelle gröber, jeder Baum am Waldrand, ein Teil der inneren.
  - **Karten** – bis 520 / 450 / 380 / 300 m, die Laubbäume schon jenseits des Nahbereichs (ihre 3D-Kronen sind schwer): ein beim Laden
    gezeichneter Atlas der fünf Arten (Fichte, Kiefer, Lärche, Laubbaum, Birke) von der Seite (zwei gekreuzte Ebenen) und von oben (eine
    waagrechte Ebene in der Krone – ein Bestand bleibt vom Hang oder aus der Luft geschlossen); gezeichnet mit dem Programm der fernen
    Bäume Ratschers (`world/ratscher.js`, `geotree`); mit der Entfernung ausgedünnt, die übrigen Karten etwas breiter.
  - **dahinter** das Luftbild der Kacheln wie bisher.
  - **Grenzen:** höchstens 10 Zeichenaufrufe (Telefon 8) und 145 000 Dreiecke (Telefon 56 000) der Bäume im Blick – die nächsten Bäume in
    3D zuerst, die Karten bekommen den Rest (die fernen dann stärker ausgedünnt). Keine neuen Shader-Programme: die Materialien der
    Klinge und des Gartens, die Karten mit Ratschers Programm (eine Kopie seines Materials mit eigenem Atlas).
- **Jahreszeit:** das Laub nach dem Spieldatum – frisches Grün im Mai, Herbstfarben ab Ende September (Buche kupfern, Birke gelb, Eiche
  braun), kahl ab Mitte November bis Ende April (nur Stamm und Äste; der Atlas der Karten wird ohne Laub neu gezeichnet); die Lärche wie
  an der Klinge. Nur Instanzfarben und der Atlas, keine neuen Programme.
- `?nowald` lässt alles weg (zum Vergleich).

## Daten neu erzeugen

```bash
export WW_RAW=~/ww-raw                                           # Zwischenablage der Downloads (nicht ins Repo)
pip install rasterio                                             # die Kronenhöhen (COG über HTTP)
python3 tools/weltwald/osm.py 50.47 10.58 50.63 10.82 --step 0.04 # OSM in Stücken (Overpass; Geofabrik und overpass-api.de sind vom Chat-Rechner nicht erreichbar)
python3 tools/weltwald/baeume.py --corridor --routes suhl_land,markt,baumschule --ethos ETHOS.jsonl   # → viz3/extra/welt-wald/dist/weltwald/z/
python3 tools/weltwald/baeume.py --cells=-4_15 --debug DIR       # eine Zelle mit Bildern (Luftbild mit den Kronen, Kronendach, Höhen)
```

`ETHOS.jsonl` wie in `docs/features/welt-gebaeude.md` (`tools/welt-gebaeude/filter_ethos.py`).

## Testen

`python3 viz3/test/welt_wald.py 9054 [data,road,drive,season,phone]` (Thema-Test, `viz3/extra/welt-wald/tests.txt`: `smoke`,
`welt_wald:data,road,drive,season`, `welt_wald:phone`, `memphone`). Orte in `viz3/test/welt_wald_spots.json`: Hirschbach, die Straße
nördlich von Schleusingen, ein Waldrand an der Straße, der Wald vor Suhl; jeweils von der Straße (Augenhöhe) und von oben (160 m, Blick
ins Tal).

**Zahlen** (CI 44174816484, Bildschirm 1920 × 1080, Stufe „hoch“; Bäume im Blick, Hauptdurchgang):

| Ort | Aufrufe | Dreiecke | 3D nah / Mitte / Karten |
| --- | ---: | ---: | --- |
| Hirschbach, an der Straße | 9 | 102 510 | 14 / 31 / 7 955 |
| Hirschbach von oben (Tal) | 7 | 122 522 | |
| Straße nördlich von Schleusingen | 9 | 111 594 | 36 / 18 / 1 571 |
| … von oben | 3 | 14 436 | |
| Waldrand, von der Straße | 3 | 32 694 | 0 / 11 / 5 042 |
| … von oben | 7 | 47 046 | |
| im Wald vor Suhl | 9 | 141 890 | 10 / 332 / 6 451 |
| … von oben | 9 | 143 434 | |
| Telefon (844 × 390, Hirschbach) | 1 | 17 988 | nur Karten |

Keine neuen Shader-Programme (0 der 12 Programme der Bäume neu); Fahrt mit 100 km/h über 1,9 km: jede Zelle bis 150 m voraus schon da,
Auswahl höchstens 3,5 ms; Sommer, Oktober (Herbstfarben), Januar (kahl, Atlas ohne Laub), Mai.

## Offen

- Die Korridore nach Schleusingen (`markt`) und nach Kloster Veßra (`baumschule`): erzeugt, auf `wip/welt-wald` (85822f9d,
  `viz3/extra/welt-wald/dist/weltwald/z/`), noch nicht dabei. Die übrigen Kacheln der Welt: 1 692 Zellen, etwa 18 MB, einige Stunden
  Abrufe (DOP, Kronenhöhen) – `baeume.py --tiles --skip-done` (mit `WW_OUT` außerhalb des Repos).
- OSM (Waldwege, Gleise, Waldflächen): der Abruf in Stücken über Overpass war zu langsam; der erste Stand kommt ohne (kein Baum auf den
  App-Straßen, die Luftbilder zeigen breite Wege als Lücken).
- Kiefer aus dem Luftbild unterscheiden (heute ist jeder Nadelbaum außer der Lärche eine Fichte).
- Die waagrechte Ebene der Karten sieht man von der Straße als dünne Linie im Bestand; sie könnte nur von oben gezeichnet werden.
- Ratschers eigene Laubbäume mit Jahreszeit (über `SGREGELN` von `stadtgruen`, wenn es in `src` ist).

## Für den Lead

- `viz3/src/modules.txt`: ein Block `# feat/welt-wald` nach `strassen/strassen_karte.js` (`weltwald/weltwald.js`).
- `viz3/src/world/forest.js`: eine markierte Zeile (`// feat/welt-wald`): `FOREST.kit()` – die Modelle des Walds an der Klinge
  (`models0`, `models1`, `VI`), seine Funktion `patch` (dieselben Programme, die Entfernungsbänder je Material), `seasonal` und die
  Jahreszeit der Lärche (`SEAS`), die Texturen (`mk`).
- Quellen: `credits_add` in `viz3/extra/welt-wald/manifest.json`; Daten `viz3/extra/welt-wald/dist/weltwald/z/`.
