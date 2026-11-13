# Suhl – der Boden: Gelände und Luftbild als Kacheln (Paket S2-1)

Stand 13.11.2026, Agent `suhl-boden` (Zweig `suhl/boden`), Stufe 2 des Suhl-Plans. Auftrag: `docs/plans/auftraege/suhl-boden.md`.
Dieses Paket ändert keine vorhandene Datei. Es baut auf `tools/welt/` auf (nur gelesen und importiert).

## Was es gibt

| Was | Wo | Stand |
|---|---|---|
| **Probesatz Zentrum** (für die Laufzeit) | `tools/suhl/out/boden/probe/suhl/boden/v0/` – `meta.json`, `t/{Stufe}/{x}/{y}.bin`, `i/{Stufe}/{x}/{y}.webp`, `ATTRIBUTION.md` | fertig, geprüft: 185 Kacheln, 370 Dateien, 7,6 MB |
| Kachel-Plan (welche Kacheln je Stufe) | `tools/suhl/out/boden/plan/probe.json`, später `stadt.json` | Probesatz fertig |
| Prüfergebnis des Probesatzes | `tools/suhl/out/boden/probe/pruefen.json` | alle Prüfungen bestanden |
| Werkzeug | `tools/suhl/boden/` (`plan.py`, `gelaende.py`, `bild.py`, `boden.py`, `pruefen.py`, `bogen.py`, `blib.py`, `korridor.json`) | läuft lokal (Probesatz) |
| Ganze Stadt in GitHub Actions | `.github/workflows/suhl-boden.yml` | in Arbeit |

## Der Probesatz in Zahlen (gemessen, `pruefen.json`)

Die 11 Kacheln der Stufe 10 (400 m), die das Gebiet `zentrum` berühren, mit allen Kindern der Stufe 11 und den Eltern der Stufen 9 bis 6.
Stufe 12 gibt es im Probesatz nur dort, wo das Zentrum liegt (siehe unten).

| Stufe | Kachel | Bild / Gelände | Kacheln | Gelände | Luftbild | je Kachel Bild |
|---|---|---|---|---|---|---|
| 12 | 100 m | 20 cm / 1 m | 120 | 0,28 MB | 3,32 MB | 27,6 kB |
| 11 | 200 m | 39 cm / 2 m | 44 | 0,14 MB | 2,10 MB | 47,6 kB |
| 10 | 400 m | 78 cm / 4 m | 11 | 0,05 MB | 0,75 MB | 68,3 kB |
| 9 | 800 m | 1,6 m / 8 m | 4 | 0,03 MB | 0,34 MB | 83,9 kB |
| 8 | 1,6 km | 3,1 m / 16 m | 2 | 0,02 MB | 0,18 MB | 91,5 kB |
| 7 | 3,2 km | 6,3 m / 32 m | 2 | 0,03 MB | 0,17 MB | 84,0 kB |
| 6 | 6,4 km | 12,5 m / 64 m | 2 | 0,03 MB | 0,14 MB | 69,7 kB |
| Summe | | | 185 | 0,58 MB | 6,99 MB | |

- **Stufe 12 ist gekürzt.** Alle 176 Kinder wären mit dem Rest zusammen 8,7 MB (Grenze 8 MB). Geblieben sind die 120 Kacheln der
  Stufe 12, die das Zentrum berühren, aufgefüllt zu ganzen Vierern. Das steht in `meta.json` unter `suhl.cut` – und ist zugleich ein
  guter Test für die Liste `has`: 14 der 44 Kacheln der Stufe 11 haben keine Kinder.
- **Die Bilder der Stadt sind größer als geplant.** Der Plan rechnete mit 17,7 kB (Stufe 12), 27 kB (11) und 30 kB (10) je Kachel –
  gemessen im Wald und in Dörfern. In der Innenstadt sind es 27,6 / 47,6 / 68,3 kB. Die Zahl für die ganze Stadt kommt aus dem ersten Lauf.
- Höhe am Mittelpunkt von Suhl: 440,0 m NHN. Höhen im Probesatz: 357,5 bis 882,3 m NHN.
- Kanten: 304 Paare benachbarter Gelände-Kacheln, größter Unterschied 0 cm.

## Format – was die Laufzeit wissen muss

`meta.json` hat das Format, das `WELT` heute liest (`tools/welt/build.py`), mit einem Zusatz:

- `tiling.levels[L].rect` = Rahmen `[x0, y0, x1, y1]` wie bisher. **Neu: `tiling.levels[L].has`** = sortierte Liste `[x, y]` der Kacheln, die es
  gibt. `rect` ist nur noch der Rahmen um diese Liste. Der Haken W2 in `welt.js` (`setOf`) muss `has` beachten: eine Kachel gehört nur zum
  Satz, wenn sie in `has` steht. Fehlt `has` (alte Sätze), gilt `rect` allein.
- Die Listen halten drei Regeln ein, auf die sich `WELT` verlassen kann (`plan` in `welt.js` verfeinert eine Kachel nur, wenn alle vier
  Kinder im Satz sind): (1) Stufe 10 deckt alles, wo man stehen kann; (2) die Stufen 11 und 12 stehen **in ganzen Vierern**; (3) jede
  Kachel der Stufen 7 bis 12 hat ihre Elternkachel im Satz.
- `tiling.levels["10"].dgm` läuft parallel zu `has`: `1` = die Kachel steht zu mindestens 99 % auf echtem 1-m-Gelände (DGM1), `0` =
  Copernicus 30 m. Heute überall `0`.
- `suhl` = `{ product: "boden", version, schema: 1, mode, centre_utm, centre_model, plan, cut, has }`.
- Die Rahmen können sich mit denen der vorhandenen Sätze überschneiden (Block B, Zone Veßra), die Listen nicht.
- Gelände `t/…bin`: WTH1, 101 × 101 Höhen in cm, unverändert. Luftbild `i/…webp`: 512 px, Qualität 74, unverändert.

## Wie das Gelände entsteht

Quelle heute: **Copernicus GLO-30** (Oberflächenmodell, 30 m) mit abgesenktem Wald, so wie `tools/welt/dem.py` es für Schleusingen und
Kloster Veßra tut. Die Absenkung unter Wald (ESA WorldCover) wird aus den Daten geschätzt, für Suhl immer im selben Fenster (Rahmen der
Gemeinde): **9,33 m**; 82 % dieses Fensters sind Wald. DGM1 (1 m) gibt es noch nicht: die alte Landes-Adresse zeigt weiter die
Wartungsseite (jeder Lauf fragt zuerst dort), der Schlüssel für easygeodata fehlt noch.

Neu gegenüber `tools/welt`: das Mosaik wird **in Blöcken** gerechnet (ein Block = eine Kachel der Stufe 7, 3,2 km, plus 320 m Rand), weil
die Gemeinde für ein einziges 1-m-Mosaik zu groß ist. Die Stufen 10 bis 12 kommen aus dem 1-m-Mosaik des Blocks, die Stufen 6 bis 9 aus
einem einzigen 8-m-Mosaik über das ganze Gebiet. Alle Blöcke teilen sich dieselbe Wald-Absenkung und denselben Höhenversatz, damit
Nachbarn an ihrer gemeinsamen Kante auf den Zentimeter gleich sind.

**Straßen sind im Probesatz v0 nicht eingeschnitten.** `tools/welt/build.py` schneidet Straßen mit `roads.py` ins Gelände; dieser Schritt
ist hier bewusst weggelassen, weil die Straßenhöhen in Stufe 2 einen eigenen Besitzer haben (`suhl-strassen`). Im Probesatz liegt also
das rohe 30-m-Gelände: Straßen in Hängen liegen schief, Häuser der Innenstadt heben den Boden um einige Meter an. Der Einschnitt aus den
Profilen von `suhl-strassen` ist der nächste Schritt (siehe unten).

## Wie das Luftbild entsteht

Dienst WMS TH DOP, Ebene `th_dop` (20 cm), Bildflug 15.05.2024 über der ganzen Gemeinde (`tools/suhl/out/bestand/luftbild.json`), also
keine Farbnähte in der Stadt. **Jede Stufe wird in ihrer eigenen Auflösung vom Dienst geholt** – nicht aus der feineren Stufe verkleinert:
die Gemeinde ist kein Rechteck, eine verkleinerte Kachel hätte am Rand graue Löcher. Ein Abruf umfasst höchstens 8 × 8 Kacheln (4096
Bildpunkte) und nur den Rahmen der wirklich gebrauchten Kacheln. Höchstens zwei Abrufe gleichzeitig, Pause nach jedem Abruf, alles im
Rohdaten-Ordner zwischengespeichert. Der Probesatz brauchte 14 Abrufe.

## Quellen und Namensnennung

| Daten | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbild | TLBG, WMS TH DOP (`th_dop`) | CC BY 4.0 | © GDI-Th |
| Gelände heute | Copernicus DEM GLO-30 | Copernicus-Lizenz | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA |
| Wald (Absenkung im Gelände) | ESA WorldCover 2021 | CC BY 4.0 | © ESA WorldCover project 2021 |
| Gelände später | DGM1 Thüringen (über easygeodata.de oder die Landes-Adresse) | CC BY 4.0 | © GDI-Th |
| Gebiete, Ortsteile, Straßenkorridore (daraus die Kachel-Listen) | OpenStreetMap | ODbL 1.0 | © OpenStreetMap-Mitwirkende |

Die Angaben stehen in jedem Satz in `meta.json` (`sources`, `attribution`) und in `ATTRIBUTION.md`.

## So läuft es noch einmal

```
# Probesatz (Chat-Rechner, etwa 1 Minute; lokal braucht rasterio die Zeile mit GDAL_CURL_CA_BUNDLE)
export GDAL_CURL_CA_BUNDLE=$CURL_CA_BUNDLE
python3 -I tools/suhl/boden/boden.py --mode probe --cut 1 --out tools/suhl/out/boden/probe/suhl/boden/v0
python3 -I tools/suhl/boden/pruefen.py --set tools/suhl/out/boden/probe/suhl/boden/v0 --mode probe --json tools/suhl/out/boden/probe/pruefen.json
python3 -I tools/suhl/boden/bogen.py --set tools/suhl/out/boden/probe/suhl/boden/v0 --out /tmp/suhl-boden/bogen --name probe
```

Ein zweiter Start macht dort weiter, wo der erste aufgehört hat (Abrufe, fertige Blöcke und Bild-Kacheln bleiben).

## Für den Suhl-Chat

- Der Probesatz v0 hat **keinen Straßeneinschnitt** (siehe oben). Nächster Schritt nach deiner Nachricht vom 13.11., 1:45: Einschnitt
  aus den Profilen von `suhl-strassen`, Brücken und Tunnel ausgenommen.
- Der Haken W2 muss `has` lesen (Format oben). Ohne ihn hielte `WELT` jede Kachel im Rahmen für vorhanden.
- Die Bilder der Innenstadt sind etwa doppelt so groß wie im Plan angenommen (Tabelle oben).
