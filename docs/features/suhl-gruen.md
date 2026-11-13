# Suhl – Grün: Bäume, Wald, Grünflächen (Paket S2-4)

Stand 13.11.2026, Agent `suhl-gruen`, Zweig `suhl/gruen`. Auftrag: `docs/plans/auftraege/suhl-gruen.md`.
Dieses Dokument wächst mit der Arbeit; der Zweig ist die Wahrheit.

## Was es schon gibt

**Probesatz Zentrum** – die Bäume der 11 Kacheln (Stufe 10, je 400 m), die das Gebiet `zentrum` berühren:
`tools/suhl/out/gruen/probe/suhl/b/v0/` (`index.json` und `10/{x}/{y}.bin`). Die Zahlen stehen in `index.json` (`kacheln`, `anzahl`).

Bilderbögen zum Ansehen (Luftbild mit den gefundenen Bäumen) liegen auf dem Wegwerf-Zweig `ref/suhl-gruen`, nie hier.

## Format des Produkts `b` (Bäume)

Eine Datei je Kachel, **8 Byte je Baum**, ohne Kopf, Little Endian. Die Zahl der Bäume ist Dateigröße / 8.

| Feld | Typ | Inhalt |
|---|---|---|
| `x` | uint16 | Abstand nach Osten vom **Westrand** der Kachel in cm (0 … 39 999) |
| `y` | uint16 | Abstand nach Norden vom **Südrand** der Kachel in cm |
| `h` | uint8 | Baumhöhe in Schritten von 0,25 m |
| `r` | uint8 | Kronenradius in Schritten von 0,1 m |
| `art` | uint8 | Art, siehe `index.json` → `arten` (0 Laubbaum, 1 Nadelbaum, 2 Fichte, 3 Kiefer, 4 Lärche, 10 Linde … 30 Strauch/sehr kleiner Baum); `nadel` nennt die Nadelbaum-Nummern |
| `merker` | uint8 | Bits 0–1: Herkunft der Lage (0 Regel, 1 Krone im Luftbild, 2 OSM-Baum, 3 Kronenhöhenmodell); Bit 2: Höhe gemessen; Bit 3: Kronenradius gemessen; Bit 4: Art aus einer kartierten Angabe; Bit 5: Stamm von Dach oder Fahrbahn weggerückt; Bit 6: Baum ist in OSM kartiert |

Lage in ETRS89 / UTM 32N: `E = E0 + x / 100`, `N = N0 + y / 100`, mit `(E0, N0)` = Südwest-Ecke der Kachel im Quadtree von
`tools/welt/wlib.py` (Stufe 10: `E0 = 420700 + x_kachel · 400`, `N0 = 5390800 + y_kachel · 400`). Ins Modell mit `xf` aus
`viz3/manifests.json`. **Die Geländehöhe steht nicht in der Datei:** das Gelände kann später getauscht werden (Copernicus → DGM1),
die Laufzeit fragt den Boden (`KERN.ground`).

Lesen in Python: `tools/suhl/gruen/baeume.py`, Funktion `unpack`. In JavaScript: `new DataView(buf)`, je Baum
`getUint16(o, true)`, `getUint16(o + 2, true)`, `getUint8(o + 4)` … `getUint8(o + 7)`.

## Wie die Bäume gefunden werden (Stand 0)

1. Infrarot-Luftbild (`th_dop20cir`, 20 cm, Bildflug 15.05.2024): Pflanzen sind im nahen Infrarot hell, im Rot dunkel (Index NDVI).
2. Gehölz statt Rasen: Kronen sind im Meter-Maßstab unruhig (Licht und Schatten), Rasen ist glatt. Schatten von Bäumen auf Rasen
   sehen ähnlich unruhig aus, sind aber dunkel – deshalb zählt nur, was in der Sonne liegt.
3. Kronen trennen: Wasserscheiden-Verfahren über „Abstand zum Rand“ und „helle Kronenspitze“. Kronenradius aus der Kronenfläche.
4. Der Stamm steht in der Mitte des Kronenteils, der weder auf einem Gebäude-Grundriss noch auf einer Fahrbahn liegt.
5. Kartierte Bäume aus OpenStreetMap bestätigen eine Krone als Baum und liefern die Art, wo sie eingetragen ist.
6. Höhe: **geschätzt** aus Kronenradius und Art, bis das Höhenmodell nDOM1 da ist (Merker Bit 2 = 0).

## Quellen

- Luftbild DOP20 (RGB `th_dop`, Infrarot `th_dop20cir`), WMS des Landes Thüringen: © GDI-Th, CC BY 4.0.
- OpenStreetMap (Bäume, Gebäude, Straßen, Wasser): © OpenStreetMap-Mitwirkende, ODbL 1.0.
- ETHOS.BUILDA (Gebäude-Grundrisse, nur zum Ausschluss von Dächern): Forschungszentrum Jülich, Zenodo 11845992, ODbL 1.0.

## Neu rechnen

```
python3 -I tools/suhl/gruen/kontext.py                 # einmal: Gebäude, Straßen, OSM-Bäume in den Roh-Cache
python3 -I tools/suhl/gruen/baeume.py --gebiet zentrum --out tools/suhl/out/gruen/probe/suhl/b/v0
python3 -I tools/suhl/gruen/bogen.py --b tools/suhl/out/gruen/probe/suhl/b/v0 --out /tmp/suhl-gruen/bogen
```
