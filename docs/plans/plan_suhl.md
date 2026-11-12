# Suhl – technischer Entwurf: die ganze Stadt als Teil der Spiegelwelt

Stand 13.11.2026, Agent `suhl-technik` (Zweig `suhl/technik`), Stufe 1 des Suhl-Plans. Dieses Dokument ändert keinen Code. Es sagt, wie
Stufe 2 (die ganze Stadt aus Daten) und Stufe 3 (das Pilotquartier Zentrum in höchster Güte) gebaut werden, ohne dass sich Agenten
oder Chats in die Quere kommen. Der Altbestand vom 26.10. steht in `docs/plans/suhl/altbestand.md`.

**Lesehilfe.** „gemessen“ = aus einer Datei, einem Protokoll oder der GitHub-API, Quelle steht dabei. „Annahme“ und „Schätzung“ sind
so benannt und müssen in Stufe 2 durch Messung ersetzt werden. Alle Verweise auf Code gelten für `origin/src` Stand `34b2518` (V17v).

Inhalt: 1 Maßstab · 2 Datenprodukte, Pipeline, Kacheln, Hosting · 3 Laufzeit · 4 „Realer als Schleusingen“ · 5 Qualitätskontrolle ·
6 Verträge und Haken · 7 Arbeitspakete · 8 Risiken und offene Fragen

## Das Wichtigste vorweg

| Thema | Entscheidung des Entwurfs |
|---|---|
| Koordinaten | Das Modell-Koordinatensystem bleibt (Ursprung Garten). Suhl bekommt **keinen eigenen Welt-Ursprung**, aber jedes Suhl-Mesh einen **lokalen Ursprung je Kachel** (Abschnitt 1). |
| Kachelung | Der vorhandene Quadtree von `tools/welt` (UTM 32N) für alles: Boden Stufen 7–12, Inhalte (Gebäude, Straßenraum, Bäume) in Kacheln der Stufe 10 (400 m), Fernmodelle in Stufe 8 (1,6 km). |
| Gebäude | Ein **Datensatz je Gebäude** (parametrisch, veränderbar), die Geometrie entsteht im Browser in einem Worker. Kein Photogrammetrie-Netz. |
| Hosting | `gh-pages` ist mit 809 MB fast voll (Grenze 1 GB). Suhl braucht etwa 230–300 MB (Schätzung). Empfehlung: **eigenes Daten-Repo mit GitHub Pages** (gleiche Herkunft, kostenlos); Aufbau so, dass ein Umzug zu Cloudflare R2 nur die Basis-Adresse ändert. |
| Laden | Nichts beim Start. Ein kleines Modul meldet Zone, Sprungziele und Menü an; der eigentliche Code kommt als Paket bei Bedarf (`src/lazy/`). Vier Detailstufen nach Entfernung. |
| Neue Shader | Höchstens 8 neue Programme für ganz Suhl, jedes höchstens 8 Texturen (Grenze des Tests `gpu`: 16). |
| Kontrolle | Fotoabgleich (Modell vom Standpunkt eines Straßenfotos neben dem Foto) und Abgleich von oben gegen das Luftbild laufen in GitHub Actions und liefern Zahlen je Straße. |

## 1 Maßstab

### 1.1 Gebiete und Mengen

Gebiete aus `origin/suhl/bestand:tools/suhl/out/bestand/gebiete.geojson` (Commit `3131dc3`, erster Stand aus der OSM-API). Flächen
und Kachelzahlen am 13.11. aus diesen Polygonen nachgerechnet (UTM 32N, Quadtree von `tools/welt/wlib.py`).

| Gebiet | Fläche | Ausdehnung (UTM) | Modell x (Ost) | Modell y (Nord) | Kacheln Stufe 10 / 11 / 12 | Landes-Kacheln 1 km / 2 km (mit 300 m Rand) |
|---|---|---|---|---|---|---|
| `stadt` (Gemeinde, OSM-Relation 62450) | 141,81 km² | 20,6 × 14,5 km | −14 860 … 6 396 | 6 180 … 21 920 | 1 013 / 3 814 / 14 746 | 213 / 69 |
| `kernstadt` | 22,04 km² | 9,7 × 7,2 km | −10 176 … −112 | 8 861 … 16 688 | 216 / 722 / 2 581 | 57 / 20 |
| `zentrum` (Pilot) | 0,68 km² | 1,2 × 1,2 km | −5 523 … −4 233 | 11 690 … 12 943 | 11 / 31 / 93 | 8 / 4 |

Mittelpunkt von Suhl (`centre` der Datei): 50,60865° N, 10,69264° O = UTM (619 765, 5 607 674) = **Modell (−4 698, 12 256)**. Vom
Garten sind das 13,13 km in Modellmetern und 13,33 km in der Natur.

| Menge | Zahl | Herkunft |
|---|---|---|
| Gebäude in OSM, `kernstadt` | 16 168 | gemessen, `gebiete.geojson` (`gebaeude_osm`, Grundfläche ≥ 40 m²) |
| Gebäude in OSM, `zentrum` | 594 | gemessen, ebenda |
| Gebäude insgesamt mit Schuppen und Garagen, `stadt` | 25 000–35 000 | **Schätzung** – ETHOS zählt jedes Nebengebäude; Zahl kommt aus `suhl/bestand` (ETHOS-Lauf) |
| Bäume außerhalb des Waldes, `kernstadt` | 30 000–60 000 | **Schätzung** – erst das Kronenhöhenmodell (DOM1 − DGM1) zählt sie |
| Straßen und Wege, `kernstadt` | 300–450 km | **Schätzung** – der alte Auszug `ref/suhl-leute-fotos:recherche/osm.json` hat 6 577 Wege im Rahmen 50,585–50,650° N |
| Straßenfotos (Panoramax), Gemeinde | 3 254 | gemessen, Commit `d0d212a` auf `suhl/fotos` |

Die geschätzten Zeilen werden ersetzt, sobald `suhl/bestand` Zahlen hat (`git fetch origin suhl/bestand`).

### 1.2 Das Modell-Koordinatensystem – drei Tatsachen, die Suhl betreffen

| Tatsache | Zahl | Beleg | Folge für Suhl |
|---|---|---|---|
| Ein Modellmeter ist **1,0157 m** in UTM, die Achsen sind um **4,36°** gedreht. | √(a² + b²) = 1,015725; atan2(b, a) = 4,3566° | `xf` in `viz3/manifests.json` (`geoman.xf`: a = 1,01279, b = 0,07716) | Flächen, Längen und Erträge für Szenarien **nie** aus der Modellgeometrie rechnen, sondern in der Pipeline in UTM. Modell-m² × 1,0317 = m². Höhen sind echte Meter (z = NHN − `H0`, `H0` = 374,617). |
| Die bisherige Welt endet 400 m südlich vom Suhler Markt. | Fern-Gelände: 201 × 201 Punkte à 120 m, y bis 11 864; `ortho_far` bis N 5 607 500 | `geoman.terrain.outer`, `geoman.tex.far` | Suhl braucht eigenen **Fernboden** (Abschnitt 3.3). Die Naht läuft quer durch den Süden der Kernstadt. |
| Die Kamera sieht 12 km weit. | `far` = 12 000 m, `near` = 0,1 m | `viz3/src/core/head.js` Zeile 65 | Die Skyline wird bis 12 km gezeichnet, nicht weiter. |

### 1.3 Genauigkeit so weit vom Ursprung

Die Grafikkarte rechnet mit 32-Bit-Zahlen. Je größer die Koordinate, desto gröber die Schritte.

| Ort | Größte Koordinate | Schrittweite (float32) | Wie es heute gelöst ist |
|---|---|---|---|
| Schleusingen, Markt (−1 085, 1 242) | 1,2 km | 0,12 mm | absolute Modellkoordinaten in den Vertex-Puffern (`welt/schleusingen.js`) |
| Kloster Veßra (−8 850, −300) | 8,9 km | 0,98 mm | absolut, ohne Sondermaßnahme (`welt/vessra.js`; `welt/welt.js` `makeGeo` schreibt x, z, −y direkt) |
| Suhl, Zentrum (−4 698, 12 256) | 12,3 km | 0,98 mm | – |
| Suhl, Gehlberg (y bis 21 900) | 21,9 km | 1,95 mm | – |

Suhl liegt also im selben Zahlenbereich wie Kloster Veßra (8,2–16,4 km), nur der Norden der Gemeinde eine Stufe gröber.

| Wo es zählt | Wirkung bei 1 mm Schritt | Was Suhl tut |
|---|---|---|
| Lage der Eckpunkte auf dem Bildschirm | Punkt und Kamera werden je auf 1 mm gerundet und dann voneinander abgezogen. In 1 m Abstand sind 2 mm etwa 2 Bildpunkte (1080p, 60°). Nahe Kanten „schwimmen“ beim Gehen. In Veßra fällt es kaum auf, in Innenräumen und an Schaufenstern schon. | **Lokaler Ursprung je Kachel:** `mesh.position` = Kachelmitte, Eckpunkte relativ dazu (höchstens ±300 m, Schritt 0,03 mm). three.js rechnet Kamera × Mesh in 64 Bit auf der CPU, die Karte sieht nur kleine Zahlen. Keine Änderung am Kern nötig. |
| Muster im Fragment-Shader aus Weltkoordinaten (Pflaster, Korn: `weltGround` in `welt/welt.js`, `p * 8.0`, `p * 23.0`) | Bei 12 km etwa 1 mm Raster – unkritisch. Zufallswerte aus `sin()` mit großen Zahlen können auf manchen Telefonen Streifen zeigen. | Suhl-Shader rechnen Muster aus **kachel-lokalen** Koordinaten (Weltlage nur als Kachel-Versatz in einer Uniform). Die Boden-Kacheln von `WELT` bleiben zunächst wie in Veßra; Prüfpunkt im Telefon-Test. |
| Physik, Kollision, Boden (`KERN.ground`, `WCOL`, Fahrzeuge) | keine – JavaScript rechnet mit 64 Bit | nichts |
| Schatten der Sonne | Der Schattenkasten folgt der Figur (`garden/env.js` `sunFollow`), seine Matrizen entstehen in 64 Bit | nichts; lokale Ursprünge helfen auch hier |
| Tiefenpuffer (`near` 0,1 m, `far` 12 km) | Flimmern eng übereinander liegender Flächen in der Ferne – unabhängig vom Ursprung | Straßenflächen nie in gleicher Höhe wie der Boden (Abschnitt 4c); in der Ferne nur die Bodentextur |

**Ein eigener Ursprung für Suhl (die Welt verschieben) ist nicht nötig** und wäre ein tiefer Eingriff in den Kern (`KERN`, Physik,
Speicherstände, alle Module rechnen in Modellmetern). Der lokale Ursprung je Kachel löst dasselbe Problem ohne gemeinsame Dateien zu
berühren. Bezugspunkt für Menschen und Tests: `SUHL.O = [-4698.2, 12255.7]`.

## 2 Datenprodukte und Pipeline

Alles Rechnen läuft in GitHub Actions, nie auf dem Chat-Rechner. Rohdaten liegen im Actions-Cache, nie in git. Werkzeuge der Stufe 2
liegen unter `tools/suhl/<paket>/` und importieren `tools/welt/*.py` und `tools/welt-gebaeude/*.py`, ohne sie zu ändern.

### 2.1 Produkte

| Produkt | Quelle heute | Quelle, sobald Falkos Landesdaten da sind | Werkzeug, auf dem es aufbaut | Ergebnis (Kachel) |
|---|---|---|---|---|
| Gelände | Copernicus GLO-30 mit abgesenktem Wald (`tools/welt/dem.py` `CopGround`) | DGM1 (1 m) | `tools/welt/dem.py` `Dem`, `tools/welt/tiles.py` (Format WTH1: 101 × 101 Höhen in cm) | `t/{L}/{x}/{y}.bin`, Stufen 7–12 |
| Luftbild | WMS `th_dop` (20 cm), Farbausgleich je Flugtag (`fetch.flight_dates`, `tiles.Harmonizer`) | dasselbe | `tools/welt/tiles.py` `ImagePyramid` | `i/{L}/{x}/{y}.webp` (512 px), Stufen 7–12; unter 3D-Gebäuden ohne gedruckte Dächer (wie `tools/welt-gebaeude/kacheln.py`) |
| Gebäude | ETHOS.BUILDA (Grundriss, Höhe, LoD2-Kennung) + OSM (Name, Nutzung, Adresse) + Dachform geschätzt (`tools/welt-gebaeude/prep.py`) | LoD2 (echte Dachflächen, Dachart, Funktion) | `prep.py`, `lod2.py` (beschreibt den Tausch über die Gebäude-Kennung) | `g/10/{x}/{y}.json` – ein Datensatz je Gebäude (2.3) |
| Dach-Aussehen | Luftbild 20 cm, je Dachfläche Klasse und Farbe; Detailbild 40 cm | dazu DOM1 für Gauben, Schornsteine, Aufbauten | neu (`tools/suhl/dach/`), Versatz wie `tools/welt-gebaeude/retusche.py` | in `g/…json` (Klasse, Farbe) und `da/10/{x}/{y}.webp` (Dach-Atlas) |
| Straßenraum | OSM (Geofabrik-Auszug, osmium), Längsprofil auf dem Gelände | Profil und Querschnitt aus DGM1 | `tools/welt/roads.py` (`fit_axis`, `solve_profile`, `cross`, `ribbons`, `markings`, `metrics`) | `s/10/{x}/{y}.json` (Flächen, Kanten, Markierungen, Höhen) |
| Bäume | Luftbild (Grün, CIR-Kanal `th_dop20cir`), OSM `natural=tree` | Kronenhöhenmodell DOM1 − DGM1: Ort, Höhe, Kronenradius | `tools/welt/trees.py` als Muster | `b/10/{x}/{y}.bin` (x, y, Höhe, Radius, Art) |
| Wasser, Bahn | OSM | Gewässersohle aus DGM1 | neu | in `s/…json` |
| Möbel der Straße | OSM (Laternen, Ampeln, Schilder, Haltestellen, Bänke), GTFS (Haltestellen), Regeln, Fotos | – | Ideen aus `zone_suhl.py` (Altbestand) | `m/10/{x}/{y}.json` |
| Parkende Autos | Luftbild-Erkennung | – | `tools/welt-dinge/` (`detect.py`, `decide.py`, `prep.py`) | Gebietsdateien wie heute (`dinge/<gebiet>.json`) |
| Fernmodell | aus den Gebäude-Datensätzen gebacken | – | neu (`tools/suhl/fern/`) | `f/8/{x}/{y}.bin` (alle Gebäude, vereinfacht), `fern/skyline.bin` (nur die prägenden) |
| Szenario-Daten | aus den Gebäude-Datensätzen (in UTM gerechnet) + Fachdaten von `suhl-wissen` | LoD2-Funktion | neu (`tools/suhl/daten/`) | in `g/…json` (Feld `d`), Summen in `viertel.json` |

### 2.2 Gelände mischen und später tauschen

So macht es `tools/welt/dem.py` (Klasse `Dem`) schon heute, Suhl übernimmt es:

| Schritt | Heute im Code | Für Suhl |
|---|---|---|
| Wo eine DGM1-Kachel im Rohdaten-Ordner liegt, gilt sie; sonst Copernicus | `fetch_dgm1(raw, 'dgm', ex, ny)` prüft zuerst die Datei im Cache; `self.source` = `dgm1`, `cop30` oder `dgm1+cop30` | Falkos ZIP-Dateien kommen **unverändert mit ihrem Originalnamen** in den Rohdaten-Ordner. Mehr braucht der Tausch nicht. |
| Höhenversatz Copernicus → DGM1 | 30-%-Quantil der Differenz (`cop_off`) | gleich |
| Weicher Übergang | 300 m (`blend`) | gleich |
| Ein Mosaik über das ganze Gebiet im Speicher | `mos` = Fläche × 4 Byte | Für die `stadt` (20,6 × 14,5 km = 1,2 GB) zu groß: **in Blöcken von 4 × 4 km mit 300 m Rand** rechnen (neues Hüll-Skript, `Dem` selbst bleibt). |
| Welche Kachel aus welcher Quelle | `meta.json` → `sources` | zusätzlich je Kachel der Stufe 10 ein Merker `dgm: 0 \| 1` im Index, damit Tests und Doku wissen, wo das Gelände schon echt ist |

Wohin legt Falko die Dateien? **Vorschlag:** als Anhänge einer Veröffentlichung („Release“) `landesdaten-suhl-1` im Daten-Repo
(2.6). Die Lizenz CC BY 4.0 („© GDI-Th“) erlaubt das. Der Workflow holt sie mit `gh release download` in den Actions-Cache. Menge
(Schätzung, die genaue Liste macht `suhl-bestand`): 213 Kacheln DGM1 und 213 DOM1 für die `stadt`, 69 LoD2; für die `kernstadt`
allein 57 + 57 + 20. **Reihenfolge für Falko: zuerst Zentrum (8 + 8 + 4), dann Kernstadt, dann der Rest.**

### 2.3 Der Datensatz je Gebäude

Aufbauend auf dem Format von `tools/welt-gebaeude/prep.py` (Felder `f`, `k`, `e`, `h`, `F`, `rv`, `rt`, `rk`, `rc`, `r`, `az`, `p`,
`id`), das `gebaeude/gebaeude.js` heute liest. Neu sind die fett gesetzten Teile. Lagen in Metern relativ zur Kachelmitte.

| Feld | Inhalt | Quelle (beste zuerst) |
|---|---|---|
| `id` | LoD2-/ETHOS-Kennung, z. B. `DETHL51P000004BA`; bleibt über alle Datenstände gleich | LoD2, ETHOS |
| **`osm`** | OSM-Kennung (`way/…`), falls zugeordnet (Überdeckung > 50 %) | OSM |
| `f`, `h` (Löcher) | Grundriss | LoD2, ETHOS, OSM |
| `z0`, `e`, `hr` | Fußhöhe, Traufe, höchster Punkt | LoD2, ETHOS; DGM1 |
| **`R`** | Dachflächen: je Fläche Eckpunkte, **Klasse** (Ziegel rot, Ziegel dunkel, Betonstein, Schiefer, Bitumen/Kies, Blech, Gründach, Glas), **Farbe**, Neigung, Richtung, **Fläche in m²**, Ausschnitt im Dach-Atlas | LoD2 `RoofSurface`; bis dahin Schätzung wie `prep.py` (Merker `rq`) |
| **`A`** | Aufbauten: Schornsteine, Gauben, Dachfenster, **vorhandene Solarmodule** (Lage, Größe) | DOM1 − Dachebene, Luftbild; von Auge geprüft |
| **`S`** | Seiten: je Fassade Anfang/Ende, Oberkante, Merker Nachbarwand, Abstand und Name der Straße, und die **Fassaden-Parameter** (Abschnitt 4b) mit Güte `q` (0 Regel, 1 aus Daten, 2 nach Foto, 3 geprüft) und den Foto-Kennungen | Agenten nach Fotos; sonst Regeln nach Art und Baualter |
| `k`, **`use`** | Art (Haus, Halle, Nebengebäude, Turm …) und Nutzung (Wohnen, Handel, Büro, Schule, Kirche, Gewerbe …) | LoD2-Funktion, OSM, Fachdaten |
| **`era`** | Baualter-Klasse (vor 1918, 1919–1948, 1949–1990 Zeilenbau/Platte WBS 70, nach 1990) | Fachdaten (`suhl-wissen`), Zensus-Raster, sonst Regel aus Form (Idee aus `zone_suhl.py`) – als Schätzung markiert |
| **`n`**, **`adr`** | Name, Adresse | OSM |
| **`fl`** | Merker: Wahrzeichen (eigenes Modell), Denkmal, betretbar, leer stehend, Abriss geplant | `suhl-wissen`, OSM |
| **`d`** | Szenario-Daten (6.3): Geschosse, Geschossfläche, Dachfläche je Richtung, Bewohner-Schätzung, Heizart-Annahme | gerechnet in UTM |

Güte und Herkunft reisen mit: jedes geschätzte Feld trägt seinen Merker, damit die App im „Warum?“ des Was-wäre-wenn-Modus ehrlich
sagen kann, was gemessen und was angenommen ist.

### 2.4 Kachel-Schema, Namen, Versionen

Ein Schema für alles: der Quadtree aus `tools/welt/wlib.py` (Wurzel 409,6 km bei E 420 700 / N 5 390 800; Stufe 12 = 100 m).

| Ordner | Stufe | Kachelgröße | Format | Größe je Kachel | Zahl (`kernstadt` / `stadt`) |
|---|---|---|---|---|---|
| `t/` Gelände | 7–12 | 3,2 km … 100 m | WTH1 (zlib) | Stufe 12: 2,4 kB, 11: 3,0 kB, 10: 4,7 kB (gemessen, Copernicus-glatt); mit DGM1 **Schätzung** × 2–3 | siehe 2.5 |
| `i/` Luftbild | 7–12 | wie oben, 512 px | WebP (später KTX2, Werkzeug `tools/tex` gibt es) | Stufe 12: 17,7 kB, 11: 27 kB, 10: 30 kB (gemessen); ohne Dächer 22 kB | siehe 2.5 |
| `g/` Gebäude | 10 | 400 m | JSON (gzip auf dem Weg) | **Schätzung** 1,5–2,5 kB je Gebäude roh (heute 0,73 kB ohne die neuen Felder: 9,5 MB für 13 025 Gebäude) | 216 / ≤ 1 013 |
| `da/` Dach-Atlas | 10 | 400 m | WebP 1024² (40 cm) | **Schätzung** 40–120 kB | 216 / nur bebaute |
| `s/` Straßenraum | 10 | 400 m | JSON | **Schätzung** 20–150 kB | 216 / bebaute + Korridore |
| `b/` Bäume | 10 | 400 m | binär, 8 Byte je Baum | **Schätzung** 1–10 kB | 216 / ≤ 1 013 |
| `m/` Möbel | 10 | 400 m | JSON | **Schätzung** 2–20 kB | 216 / bebaute |
| `f/` Fernmodell | 8 | 1,6 km | binär (Positionen 16 Bit, Farbe je Eckpunkt) | **Schätzung** 50–400 kB | 22 / 83 |
| `fern/skyline.bin` | – | ganze Stadt | binär | **Schätzung** < 1 MB | 1 |
| `index.json`, `viertel.json` | – | – | JSON | < 300 kB | 1 |

Regeln:

- **Kachel-Listen statt Rechtecke.** `index.json` nennt je Produkt und Stufe, welche Kacheln es gibt (Bitfeld). Die Gemeinde ist
  kein Rechteck; ein Rechteck über die `stadt` hätte auf Stufe 11 doppelt so viele Kacheln wie nötig.
- **Version im Pfad:** `<basis>/suhl/v<N>/…` wird nie überschrieben. `<basis>/suhl/aktuell.json` nennt die gültige Version und
  ihre Mindest-App-Version. So passen App und Daten immer zusammen, auch während ein Lauf hochlädt, und der Browser darf lange cachen.
- **Quellen reisen mit:** `index.json` → `attribution`, `sources` je Produkt (wie `welt-test/meta.json`), dazu `ATTRIBUTION.md`.
- Der Boden (`t/`, `i/`) bleibt ein gewöhnlicher Kachel-Satz für `WELT` (`meta.json` im alten Format). Die App meldet ihn mit
  `WELT.addSet` an (Haken W1/W2 in Abschnitt 6.4).

### 2.5 Mengen: was der Boden kostet (gemessene Kachelgrößen × gezählte Kacheln)

Kachelgrößen gemessen auf `gh-pages` (GitHub-API, Baum `a54ba4f`, 13.11.): Testblock und Zone Veßra. Kachelzahlen aus den Polygonen.

| Stufe | Auflösung Bild / Gelände | Gebiet im Vorschlag | Kacheln | Bild | Gelände (Copernicus-glatt) |
|---|---|---|---|---|---|
| 12 | 20 cm / 1 m | `kernstadt` | 2 581 | 45,7 MB | 6,2 MB |
| 11 | 39 cm / 2 m | bebaute Teile, Ortsteile, Straßen-Korridore (**Annahme** 1 300 Kacheln; die ganze `stadt` wären 3 814) | 1 300 | 35,1 MB | 3,9 MB |
| 10 | 78 cm / 4 m | `stadt` | 1 013 | 30,4 MB | 4,8 MB |
| 9 | 1,6 m / 8 m | `stadt` | 279 | 8,9 MB | 2,1 MB |
| 8 | 3,1 m / 16 m | `stadt` | 83 | 2,9 MB | 0,9 MB |
| 7 | 6,3 m / 32 m | `stadt` + Rand | 25 | 1,4 MB | 0,3 MB |
| **Summe** | | | **5 281 Kacheln, 10 562 Dateien** | **124 MB** | **18 MB** (mit DGM1 **Schätzung** 30–40 MB) |

Zum Vergleich: die ganze `stadt` bis Stufe 12 wären 408 MB Bild und 39 920 Dateien – nicht sinnvoll, der größte Teil ist Wald.

| Posten | Größe | Art |
|---|---|---|
| Boden (oben) | 145–165 MB | gemessene Größen, DGM1-Anteil geschätzt |
| Gebäude-Datensätze | 45–80 MB | Schätzung (30 000 Gebäude × 1,5–2,5 kB) |
| Straßenraum, Möbel, Bäume | 15–30 MB | Schätzung |
| Dach-Atlas | 10–25 MB | Schätzung |
| Fernmodelle | 8–15 MB | Schätzung |
| **Suhl gesamt, eine Version** | **etwa 230–300 MB** | Schätzung; Stufe 2 misst es am ersten Lauf |

Rechenzeit (Anhalt): der Block Veßra (4 359 Dateien, 71,8 MB) brauchte 273 s (`docs/features/vessra.md`, Lauf 39918421150). Der
Suhl-Boden hat gut doppelt so viele Dateien; dazu DGM1 in Blöcken. **Schätzung** 20–40 Minuten je Lauf, gut innerhalb der Grenze
eines Jobs.

### 2.6 Hosting – gemessen und empfohlen

Was `gh-pages` heute hält (GitHub-API `git/trees/gh-pages?recursive=1`, 13.11.2026, Baum `a54ba4f`): **809,4 MB in 18 152 Dateien.**

| Ordner | Größe | Dateien | Bemerkung |
|---|---|---|---|
| `welt-test/` | 268,0 MB | 15 193 | Testblock 165 MB, `zonen/vessra/` 71,9 MB, `v2/` (Kacheln ohne Dächer) 31,2 MB |
| `vorschau/` | 190,9 MB | 1 116 | zweite Kopie der Website (auch `gebaeude/` 9,7 MB liegt doppelt) |
| `tex2/` | 159,6 MB | 725 | KTX2-Texturen |
| übrige Website | 190,9 MB | 1 118 | `chars/`, `snd/`, `pano/`, `tex/`, `models/` … |

Grenzen von GitHub Pages (Quelle: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits, gelesen
13.11.2026): veröffentlichte Website höchstens **1 GB**; Repo empfohlen höchstens 1 GB; 100 GB Datenverkehr im Monat (weiche Grenze);
ein Deployment darf höchstens 10 Minuten dauern. Es bleiben also **190 MB** – weniger, als Suhl braucht.

| Weg | Platz | Kosten | Was Falko tun muss | Technik | Urteil |
|---|---|---|---|---|---|
| A. Suhl auf `gh-pages` dieses Repos | 190 MB frei | 0 | nichts | wie Veßra | **reicht nicht** (230–300 MB), und jeder MB unter `viz3/extra/*/dist` läge doppelt (Website + Vorschau) |
| B. Eigenes Daten-Repo mit GitHub Pages, z. B. `mynametouse/pavillon-ratscher-welt` | 1 GB | 0 | Repo anlegen, Pages einschalten, es dem Suhl-Chat freigeben | gleiche Herkunft `mynametouse.github.io` → kein CORS, keine Änderung an Sicherheitsregeln; Workflows im Daten-Repo holen die Werkzeuge aus dem öffentlichen Haupt-Repo und veröffentlichen mit dem eigenen `GITHUB_TOKEN` (kein Geheimnis nötig); Ordner-weise Commits wie `welt-vessra.yml` | **Empfehlung für Stufe 2 und 3** – reicht für Suhl in 2–3 Versionen |
| C. Cloudflare R2 | 10 GB frei, danach 0,015 $ je GB und Monat; Abruf kostenlos (Quelle: https://developers.cloudflare.com/r2/pricing/, gelesen 13.11.2026) | 0 bis 10 GB | Konto, Bucket, Zugangsschlüssel als Actions-Geheimnis, öffentliche Adresse (für Dauerbetrieb eine eigene Domain – **Annahme**, bei Einrichtung prüfen), CORS-Regel für `mynametouse.github.io` | Dateien einzeln abgleichen (`rclone`/S3), keine git-Geschichte | **Ziel, sobald Erfurt oder Berlin dazukommen** (eine Stadt wie Suhl ≈ 0,25–0,3 GB; mehrere passen nicht mehr in B) |

Damit B → C später nur eine Zeile ist: die App kennt genau **eine** Basis-Adresse für Suhl-Daten (`SUHL.BASE`, überschreibbar mit
`?suhl=<url>` wie `?welt=` in `welt/welt.js`); die Dateien sind schlichte statische Dateien ohne Server-Logik. Tests kopieren die
nötigen Kacheln nach `viz3/dist/` (wie `viz3/test/vessra_tiles.py`), weil der Testserver nur die eigene Herkunft zulässt
(`tools/csp/cspserve.py`: `connect-src 'self'`).

Nebenbefund für den Kern-Chat, nicht Teil von Suhl: `vorschau/` und alter Bestand (`pano/`, `img/`, `tour.mp4`, je doppelt) binden
über 200 MB; `gh-pages` wächst mit jedem Feature weiter auf die 1-GB-Grenze zu.

*(Abschnitte 3–8 folgen in den nächsten Commits.)*
