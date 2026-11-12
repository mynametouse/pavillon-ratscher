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
| Die Kamera sieht 30 km weit, die Draufsicht kommt aber nicht bis Suhl. | `far` = 30 000 m, sobald die Umgebung geladen ist (sonst 12 000), `near` = 0,1 m; die Mitte der Draufsicht ist auf ±11 000 m begrenzt, ihr Bild höchstens 9 000 m hoch | `viz3/src/game/camera.js` (`FAR0`, `TOPMAX`, `applyCam`: `lim`) | Die Skyline ist aus der Ferne zeichenbar. Für die Sicht von oben über Suhl (y = 12 256) braucht es einen Haken (K1 in 6.4). |

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
| Tiefenpuffer (`near` 0,1 m, `far` 30 km) | Flimmern eng übereinander liegender Flächen in der Ferne – unabhängig vom Ursprung | Straßenflächen nie in gleicher Höhe wie der Boden (Abschnitt 4c); in der Ferne nur die Bodentextur |

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

## 3 Laufzeit

### 3.1 Was es heute gibt (und was Suhl davon nutzt)

| Baustein | Was er tut | Zahlen im Code | Für Suhl |
|---|---|---|---|
| `KERN.zone` (`core/kern.js`, `zone`, `zoneBuild`, `zoneDrop`) | baut, wenn der Beobachter (`KERN.where()`) näher als `near` kommt, gibt jenseits von `far` frei; ein Kreis je Zone | Schleusingen und Veßra: 950 m / 1 350 m | **eine** Zone `suhl` für die ganze Gemeinde (Paket, Index, Fernsicht); darin streamt Suhl selbst nach Kacheln |
| `WELT` (`welt/welt.js`) | Boden-Kacheln in Ringen um Figur, Kamera oder einen Punkt vor dem Fahrzeug (`WELT.focus`) | Stufe 12 bis 150 m, 11 bis 380 m, 10 bis 760 m (`RING`); 4 Abrufe zugleich (`pump`); frei nach 30 s (`WELT.keep`); gezeichnet 51 × 51 Punkte je Kachel (`NS`) | unverändert für den nahen Boden; **jenseits von 760 m zeichnet `WELT` nichts** – dort braucht Suhl den Fernboden (3.3) |
| `WELT.setPads`, `WELT.padAt` | ebnet oder formt den Boden in einem Polygon, auch per Funktion; `under: true` für Straßen | je Eckpunkt werden alle Polster der Reihe nach geprüft (`padZ`) | **ein** Polster je Kachel mit einer Funktion, die im Raster nachschlägt – nie Tausende Polygone |
| `WELT.setOverlay` | **eine** Straßenkarte (Canvas) über einem Quadrat | Schleusingen: 1024² über 920 m | wandert in Suhl mit der Figur mit (neu gezeichnet nach 150 m Weg) für die mittlere Entfernung; nah ersetzt echte Straßengeometrie |
| `GEB` (`gebaeude/gebaeude.js`, `zTick`, `runJobs`) | Gebäude-Zellen à 400 m holen, in Scheiben bauen, freigeben | näher als 700 m (Telefon 500), frei ab 900 m (680); 8 ms je Bild, 2 ms solange Kacheln laden; eine Zelle zur Zeit | dasselbe Muster für Stufe L1; `GEB` baut weiter die Dörfer an den Anfahrtsstraßen |
| `VNEAR` (`world/village_near.js`) | Nahdetails je 80-m-Zelle | gebaut ab 95 m, verworfen ab 170 m und in der Draufsicht | Muster für Stufe L0 |
| `FAHRT` (`welt/fahrt.js`) | Kacheln vor dem Fahrzeug, Straßen einschneiden, Rand der Karte | Punkt bis 110 m voraus; hinten frei nach 12 s | Anfahrt; in der Stadt übergibt `FAHRT` an Suhl (Haken F1) |
| `BUS` (`bus/bus.js`) | Busse nach Fahrplan, Modell nur in der Nähe | 620 m (Telefon 420 m), höchstens 3 (2) Busse | braucht Haltestellen und Fahrten in Suhl in `bus/fahrplan.json` und ein durchgehendes Straßennetz |
| `VNETZ` (`verkehr/verkehr_netz.js`, `graph`) | Netz aus Wegen `{ kind, w, p }` eines Orts | heute höchstens 3 Autos und 4 Fußgänger (Telefon 2) je Ort (`docs/features/verkehr.md`) | Suhl liefert die Wege je Viertel in diesem Format |
| Pakete bei Bedarf (`src/lazy/*.js`, `build.py`) | einzeln gebaut nach `dist/lazy/`, geladen mit `import(new URL('lazy/….js', document.baseURI).href)`; auch als Worker (`lazy/piper.js`) | – | der gesamte Suhl-Code außer einem kleinen Anmelde-Modul |

### 3.2 Aufbau der Suhl-Laufzeit

| Teil | Datei (neu) | Wann geladen | Inhalt |
|---|---|---|---|
| Anmeldung | `viz3/src/welt/suhl.js` (im Bündel, klein – Ziel < 200 Zeilen) | beim Start | `KERN.zone({ id: 'suhl', x: -4698, y: 12256, near: 9000, far: 10500, keep: 60 })`, `KERN.spot`, `KERN.scenario`, Vertrag `SUHL.*` als Hülle, die bis zum Laden wartet. **Kein Netzabruf.** |
| Kern | `viz3/src/lazy/suhl.js` | wenn die Zone baut (9 km vor der Mitte, also rund 3 km vor der Gemeindegrenze im Süden) | Index, Streamer, Detailstufen, Materialien, Anbieter für `KERN` |
| Rechner | `viz3/src/lazy/suhl-worker.js` (Worker) | mit dem Kern | Kacheln holen, entpacken, Geometrie erzeugen; gibt fertige Puffer zurück |
| Nahbereich | `viz3/src/lazy/suhl-nah.js` | wenn man in bebautes Gebiet kommt | Straßenraum, Möbel, Fassadenrelief, Ladenschilder, Ampeln |
| Wahrzeichen | `viz3/src/lazy/suhl-lm-<name>.js` | näher als 300 m am Bau | handgebaute Modelle, Innenräume |
| Leben | `viz3/src/lazy/suhl-leute.js` | im Nahbereich | Suhler Figuren, Verkehr in der Stadt |

Weil ein Paket bei Bedarf einzeln gebaut wird, darf es **keine Module der App importieren** – sonst steckte eine zweite Kopie von
three.js und `KERN` darin. Das Anmelde-Modul reicht dem Paket deshalb alles hinein: `mod.start({ THREE, KERN, WELT, VILLAGE, VEH, … })`.
**Annahme, in Stufe 2 als Erstes zu prüfen:** `tools/check/deps.mjs` und der Lint lassen das zu (das Paket von `npc/ki.js` importiert
nichts aus der App).

### 3.3 Detailstufen einer ganzen Stadt

Radien sind Vorschläge; sie skalieren mit der Grafikstufe wie heute (`applyTier` in `render/render.js`: „mittel“ × 0,8, „schnell“ × 0,6).

| Stufe | Entfernung Rechner / Telefon | Was man sieht | Daten | Einheit | Draw-Calls (Ziel) |
|---|---|---|---|---|---|
| **L0 Straße** | bis 160 m / 110 m | Fahrbahn, Bordstein, Gehweg und Markierungen als Geometrie; Laternen, Schilder, Ampeln, Bänke; Balkone, Loggien, Stufen, Schaufenster als Relief; volle Bäume; Ladenschilder | `s/`, `m/`, Teile von `g/` | Kachel Stufe 12 (100 m) | ≤ 40 |
| **L1 Viertel** | bis 700 m / 500 m | jedes Gebäude mit echtem Dach und Dach-Atlas, Fassaden-Shader (Fenster, Läden, Material ohne Geometrie), Schornsteine und Gauben instanziert, Bäume mittlere Stufe | `g/`, `da/`, `b/` | Kachel Stufe 10 (400 m); je Kachel Wände, Dächer, Aufbauten, Bäume | ≤ 70 |
| **L2 Stadt** | bis 3 500 m / 2 000 m | jedes Gebäude als Wände und Dachflächen mit Farbe je Fläche, nachts Fensterpunkte; keine Textur | `f/` (gebacken) | Kachel Stufe 8 (1,6 km), ein Mesh | ≤ 16 |
| **L3 Ferne** | darüber, bis zur Sichtweite | nur das Prägende: Hochhäuser, Wohnblöcke, Kirchen, Hallen, CCS, die Talbrücken der A 71/A 73 | `fern/skyline.bin` | ganze Stadt | ≤ 2 |
| **Nahboden** | bis 760 m | Luftbild 20–78 cm, Gelände 2–8 m | `t/`, `i/` Stufen 10–12 | `WELT`, wie heute (etwa 40 Kacheln) | wie in Veßra |
| **Fernboden** | 760 m bis Rand | Luftbild 1,6–12,5 m je Bildpunkt | `t/`, `i/` Stufen 6–9 | eigene Kacheln von Suhl: Stufe 9 bis 1,6 km, 8 bis 3,2 km, 7 bis 6,4 km, 6 darüber | ≤ 30 im Bild |

Warum diese Ringe: ein Bildpunkt deckt bei 60° Sichtfeld und 1080 Zeilen etwa 1 m je Kilometer Entfernung. Stufe 10 (0,78 m) reicht
also bis rund 800 m – das ist der Ring von `WELT` –, jede gröbere Stufe doppelt so weit.

Der **Fernboden** ist Pflicht, nicht Kür: nördlich von y = 11 864 gibt es heute keinen Boden jenseits der `WELT`-Ringe. Zwei Wege:

| Weg | Was | Eingriff | Urteil |
|---|---|---|---|
| A | `WELT` selbst lernt die Stufen 6–9 (`RING`, `plan`, `display`, `heightAt`, `lowerOuter` verallgemeinern) | etwa 30 Zeilen in `welt/welt.js`, betrifft Schleusingen, Veßra und die Fahrt | langfristig richtig („Welt bis 150 km“), aber Risiko für fremde Tests |
| **B** | Suhl zeichnet den Fernboden selbst (`lazy/suhl.js`): eigene Meshes aus denselben Kachel-Dateien; wo `WELT` zeichnet, blendet der Fernboden aus – er liest `WELT.covers(x, y)` und `WELT.visible` (beides gibt es) | nur Haken W3 (das alte 120-m-Gelände unter dem Fernboden absenken) | **Empfehlung für Stufe 2**; später als Weg A in den Kern übernehmen |

Bauen ohne Ruckeln: der Worker liefert fertige Puffer; der Hauptfaden legt je Bild höchstens 8 ms lang Geometrien an (2 ms, solange
`WELT.state().loading > 0` – die Regel von `gebaeude.js`), Shader werden beim Bau der Zone einmal mit `compileAsync` übersetzt, bevor
das erste Suhl-Mesh sichtbar wird (wie `compileShown` in `core/assets.js`).

### 3.4 Budgets

Vorhandene Grenzen (Tests) und Vorschläge für Suhl. „Rechner“ meint Falkos Laptop (Dell Latitude 7290, Intel UHD 620, 16 GB), der
laut `docs/ARCHITECTURE.md` §10 auf Stufe „mittel“ oder „schnell“ landet.

| Größe | Heute (Quelle) | Suhl darf dazu (Vorschlag) | Geprüft durch |
|---|---|---|---|
| Texturen je Shader-Programm | höchstens 16 (`test/gpu.py`, `GLCHECK`) | Suhl-Programme höchstens 8 | `gpu`-artiger Abschnitt im Suhl-Test |
| Shader-Programme | ≈ 156 (V17f, ARCHITECTURE §10); Veßra-Test erlaubt + 6 | **+ 8 für ganz Suhl**: Fassade, Dach, Straßenfläche, Fernmodell, Fernboden, Wasser/Glas, zwei Reserve; Requisiten, Schilder, Bäume teilen vorhandene | `GAME.R.info.programs` vor/nach |
| Neue Punktlichter | keine (jedes neue Licht übersetzt alle Shader neu, ARCHITECTURE §1) | **0**; Laternen leuchten als Emission, Lichtfleck und über Uniforms; die zwei nächsten über `KERN.lights.borrow` | Zählung der Lichter |
| Entpackte Bilder am Telefon | < 350 MB beim Start (`test/memphone.py`) | beim Start **0**; in Suhl + 80 MB (Telefon), + 250 MB (Rechner) – Rechnung unten | Suhl-Test im iPhone-13-Kontext |
| Draw-Calls im Bild | – (alter Auftrag `suhl.md`: + 150) | + 180 im Zentrum (Rechner), + 110 (Telefon) | Zählung wie `test/leistung.py` |
| Dreiecke im Hauptpass | – | + 800 000 (Rechner), + 350 000 (Telefon) – **Annahme**, am ersten Stand messen | wie oben |
| Längstes Bild beim Nachladen | – (alter Auftrag: 50 ms) | 50 ms auf dem Laptop bei einer Fahrt durch die Stadt | Fahrt-Test mit Autopilot |
| Daten bis zum ersten Straßenbild in Suhl | – | etwa 7–10 MB (**Schätzung**: 40 Nah-Kacheln ≈ 1 MB, 50 Fern-Kacheln ≈ 1,5 MB, Gebäude von 14 Kacheln ≈ 2 MB gepackt, Atlas, Straßen, Möbel ≈ 2 MB, Paket ≈ 0,3 MB) | Netz-Protokoll im Test |
| Nach dem Verlassen | alles frei (Schleusingen-Test) | Geometrien und Texturen wieder wie vorher | `GAME.R.info.memory` |

Textur-Rechnung für Suhl (unkomprimiert, mit Mipmaps; Telefone laden Bilder ab 512 px in halber Größe, `TEXHALF` in `core/assets.js`):

| Posten | Rechner | Telefon |
|---|---|---|
| Nahboden, etwa 40 Kacheln 512² (wie heute in Veßra) | 56 MB | 14 MB |
| Fernboden, etwa 50 Kacheln 512² | 70 MB | 17 MB |
| Dach-Atlas, 9 nahe Kacheln 1024² | 50 MB | 13 MB |
| Schilder, Wahrzeichen, Fassaden-Tafeln | ≤ 40 MB | ≤ 20 MB |
| **Summe** | **≈ 215 MB** | **≈ 65 MB** |

Mit KTX2 (Werkzeug `tools/tex`, Workflow `texturen-ktx2.yml` gibt es) sinkt das auf etwa ein Fünftel; das ist der Hebel, wenn die
Telefon-Grenze reißt.

### 3.5 Boden und Kollision

| Dienst | Heute | Suhl |
|---|---|---|
| `KERN.ground`, `KERN.terrain` | `WELT.heightAt` (Rang 5): die gezeichneten Dreiecke, auf Stufe 12 ein 2-m-Raster | zusätzlich ein Anbieter mit höherem Rang **nur auf Straßen- und Gehwegflächen** (`s/`-Kacheln: Fahrbahn, Bordstein 12 cm, Stufen, Rampen); außerhalb `undefined`, dann antwortet `WELT` |
| Boden unter der Straßengeometrie | – | je Kachel ein Polster (`WELT.setPads`, `under: true`, eine Funktion): Boden 15 cm unter die Straßenfläche, damit nichts flimmert |
| `KERN.pushOut` (Wände) | `gebaeude.js` `zPush` (Rang 15), Schleusingen und Veßra (10) | Wandsegmente je Kachel Stufe 10 im Raster, Rang 15; antwortet nur, wenn es verschoben hat |
| Fahrzeuge außerhalb des Quadrats | `VEH.hitsOut` (gesetzt in `welt/fahrt.js`), `VEH.edge`, `VEH.limit` | über `KERN.pushOut` wie heute; Rand der Karte = Rand der Suhl-Kacheln |
| `KERN.free` | `WELT.covers` | wie heute |
| `KERN.place`, `KERN.surface`, `KERN.inside` | Zonen melden sich an | „Steinweg, Suhl“ (Straße + Viertel), Belag aus `s/`, Innenräume der Wahrzeichen |
| Brücken, Tunnel | Brückenplatten in `fahrt.js`; kein Tunnel bisher | Talbrücken als Platten mit Geländer (Daten aus `suhl-fahrt`: 45 Brücken); Tunnel Berg Bock (A 71, 2,7 km): Röhre unter dem Gelände, `KERN.ground(x, y, z)` wählt nach der Höhe – **neu, eigenes Arbeitspaket** |

### 3.6 Karte und Sicht von oben

| Sicht | Heute | Was Suhl braucht |
|---|---|---|
| Draufsicht und Strategie-Modus (`world/siteplan.js`, `P.mode === 'top'`) | dieselbe 3D-Szene von oben; Bildhöhe bis 9 000 m | Die echten Dächer kommen von selbst, weil L1 den Dach-Atlas trägt. Die Stufe richtet sich oben nach der **Bildhöhe**: bis 600 m L1, bis 3 000 m L2, darüber L3. `VNEAR`-artige Nahdetails bleiben oben aus. Haken K1 (Begrenzung ±11 000 m). |
| Karte beim Fahren (`vehicles/minimap.js`) | `MMAP.more` und `MMAP.dest`, gesetzt von `welt/fahrt.js` | Die Straßen der Stadt zeichnet `FAHRT`, sobald sie in seinen Daten sind; für Stadtteile, Haltestellen und Ziele eine Liste statt eines einzelnen Hakens (M1). |
| Ebenen des Strategie-Modus (`STRAT.layer.define`) | Ebenen als SVG über der Karte | Stufe 4: Viertel und Kennzahlen aus `SUHL.data` als Ebene |

### 3.7 Nacht, Wetter, Jahreszeit

| Thema | Heute | Suhl |
|---|---|---|
| Fensterlicht | `uWinP`, `uNight` in `world/village.js` (`VILLAGE.night()`), nach Uhrzeit | derselbe Takt: das Suhl-Fassadenprogramm liest diese Werte; Läden leuchten bis Ladenschluss (OSM `opening_hours`, sonst **Annahme** 9–18 Uhr); L2 zeigt Fensterpunkte, L3 einen Schimmer |
| Laternen | Emission, Lichtflecken, die 8 nächsten beleuchten Wände (`uLampV`), 2 geliehene Lichter (Veßra) | gleich; Laternen-Standorte aus `m/` |
| Nasser Boden, Schnee | `wetter/wx_boden.js` erkennt Boden- und Dachmaterial am Programm-Schlüssel (`welt-tile`, `geoterrain`, `fields` …) und ändert nur Farbe und Rauheit | Suhl-Materialien lesen `WXBODEN.shown` und `WXBODEN.snowShown` selbst und setzen ihre Uniforms – kein Haken nötig; die Boden-Kacheln werden schon erkannt |
| Regen | „Kein Regen unter Dächern“: Tiefenkarte von oben (64 × 64) | funktioniert mit Suhls Dächern von selbst |
| Jahreszeit | Lärchen und Laub nach Spieldatum (`seasonOf` in `world/forest.js`) | Laubbäume der Stadt nach demselben Wert. **Grenze:** das Luftbild zeigt immer den Flugtag (April/Mai, Laub teils noch nicht da). |
| Schatten | Häuser des Dorfs werfen keine eigenen Schatten; die Schatten des Luftbilds bleiben | zunächst gleich. Für später (Stufe 3, optional): Schatten der Häuser aus dem Oberflächenmodell als Horizontkarte je Kachel – dann stimmt der Schatten zu jeder Tageszeit. |

## 4 „Realer als Schleusingen“ – die Hebel

Was Schleusingen heute hat (`docs/features/schleusingen.md`): 789 Gebäude aus OSM, Dachform und Höhe geschätzt, **ein Stil je
Gebäude** (14 Stile `ST` in `world/village.js`, Fensterachsen gleichmäßig verteilt), Dachfarbe als ein Mittelwert je Haus, Straßen
als aufgelegte Karte, fünf handgebaute Wahrzeichen.

### 4a Dächer

| Hebel | Wie | Kosten | Grenze, Ausweg |
|---|---|---|---|
| Echte Dachgeometrie | LoD2 `RoofSurface` je Gebäude (Tausch über die Kennung, beschrieben in `tools/welt-gebaeude/lod2.py`); bis dahin Schätzung wie `prep.py` mit Merker | keine zusätzlichen Laufzeitkosten | LoD2 hat Standard-Dachformen ohne Gauben – die kommen aus Zeile 4 |
| Aussehen je Dachfläche: **Klasse und Farbe** | Luftbild 20 cm innerhalb der Fläche abtasten (Schatten und Glanz weglassen wie `photoSampler` in `village.js`), daraus Klasse und Farbe; nah zeichnet der Shader das Muster der Klasse (Ziegel, Schiefer, Bahnen, Kies) | 2 Byte je Fläche | allein zu glatt für den Blick von oben |
| Dazu ein **Dach-Atlas** aus dem Luftbild | je Kachel Stufe 10 ein Bild 1024² (40 cm), jede Dachfläche entzerrt hineingeschnitten, auf Mittelwert 1 normiert; der Shader multipliziert es mit der Klassenfarbe: von oben volle Wirkung (Flecken, Flicken, Dachfenster, Solarmodule sind echt), nah blendet das Muster der Klasse ein | Platz 10–25 MB (Schätzung), Textur 13–50 MB | Empfehlung: **beides zusammen**. Ein reiner Foto-Atlas wäre nah unscharf (20 cm) und nicht veränderbar; reine Klassen wären von oben künstlich. |
| Das Luftbild ist **kein echtes Orthofoto** | Dächer liegen um Höhe × Abstand zum Bildmittelpunkt / Flughöhe versetzt. Lösung wie `tools/welt-gebaeude/retusche.py`: Versatz je Gebäude am Bild messen (Dachumriss gegen Bildkanten), mit den Nachbarn glätten, beim Abtasten und Ausschneiden anwenden. Mit LoD2 wird die Messung besser (echte Trauf- und Firstlinien). | Rechenzeit in Actions | Bleibt ein Dach schief ausgeschnitten, zeigt es der Abgleich von oben (5.2). Zu prüfen (`suhl-bestand`): ob das Land ein echtes Orthofoto anbietet. |
| Gauben, Schornsteine, Dachfenster | DOM1 minus Dachebene: was mehr als 0,4 m übersteht, ist ein Aufbau (klein = Schornstein, 1,5–12 m² = Gaube); Dachfenster und helle Flächen aus dem Atlas. Instanzierte Bauteile an den gemessenen Stellen. | wenige Dreiecke je Stück | ohne DOM1 nur Schornsteine nach Regel (wie im Dorf) |
| Vorhandene Solarmodule | im Luftbild erkennen (dunkle, regelmäßige Rechtecke in einer Dachfläche), Kandidaten auf Kontaktbögen von Auge prüfen (Vorgehen von `tools/welt-dinge/review.py`); als Aufbau `A` gespeichert und als Module gezeichnet | klein | wichtig für den Was-wäre-wenn-Modus: „heute“ muss stimmen, bevor man „mehr PV“ zeigt |
| Dach aus dem Bodenbild nehmen | Luftbild-Kacheln der Stufen 10–12 unter 3D-Gebäuden füllen (`tools/welt-gebaeude/kacheln.py`) – für Suhl gleich beim Bau der Kacheln, nicht als zweiter Satz | Rechenzeit | sehr dichte Bebauung: ruhige Füllfläche zwischen den Häusern (bekannt aus Schleusingen) |

### 4b Fassaden je Gebäudeseite

Parameter je Seite (Feld `S` des Datensatzes). Alles Aufzählungen und kleine Zahlen – so können Agenten sie eintragen und Szenarien
sie ändern (dämmen, streichen, Laden schließen).

| Parameter | Werte | Regel, wenn niemand hingesehen hat (Güte 0–1) |
|---|---|---|
| `mat` Material | Putz, Platte WBS 70 (Fugenraster 6,0 × 2,8 m), Klinker, Schiefer, Fachwerk, Sandstein, Sichtbeton, Glasfassade, Blech, Holz | nach Art und Baualter |
| `col`, `col2` | Hauptfarbe, Farbe von Sockel, Bändern, Faschen | Luftbild taugt dafür nicht; aus dem nächsten Foto (automatisch, Mittelwert der Wandfläche), sonst Palette des Baualters |
| `fl`, `h0`, `hf` | Geschosse, Höhe Erdgeschoss, Geschosshöhe | Traufhöhe ÷ 2,8 m (Platte), 3,2 m (vor 1918); OSM `building:levels` |
| `sock` | Sockelhöhe und -material | 0,5 m; am Hang bis zum tiefsten Punkt (wie Schleusingen) |
| `win` | Achsen (Zahl), Fenstermaß, Brüstung, Art (Lochfenster, Fensterband, bodentief, Schaufenster), Rahmenfarbe, Sprossen | Achsabstand nach Baualter |
| `eg` Erdgeschoss | nichts, Laden (Schaufensterband, Schildzone, Markise), Arkade, Garagentore, Durchfahrt, Hauseingang (Lage) | Laden, wenn OSM hier ein Geschäft hat |
| `balk` | keine, Balkone, Loggien, französische Fenster; welche Achsen; Tiefe | Platte: Loggien-Achsen nach Typ |
| `gable`, `brand` | Giebelseite, Brandwand ohne Fenster | aus Dachflächen; Nachbarwand aus der Geometrie (Idee aus `zone_suhl.py`) |
| `sign` | Ladenname (aus OSM), Art des Schilds | OSM `name` + `shop`/`amenity` |
| `q`, `src` | Güte 0–3, Foto-Kennungen | – |

| Baustein | Entwurf |
|---|---|
| **Generator** | **ein** neues Programm `suhl-wall`. Je Kachel eine kleine Daten-Textur („Fassaden-Tafel“, 8 Werte-Gruppen je Seite), die Wand trägt nur ihre Seitennummer und Wandkoordinaten (u, v). Fenster mit Tiefe ohne Geometrie wie heute im Dorf (`wallMat`: Sehstrahl im Wandsystem), dazu Geschosszonen, Ladenzone, Plattenfugen. Ganzzahlen im Shader runden (Regel aus ARCHITECTURE §13). Eine Tafel statt vieler Vertex-Attribute, damit ein Szenario eine Seite **ohne Neubau der Geometrie** ändern kann. |
| **Relief in L0** | Balkone, Loggien, Vordächer, Stufen, Schaufensterrahmen als einfache Geometrie aus denselben Parametern, nur bis 160 m |
| **Wie Agenten die Parameter gewinnen** | Der Abgleich (5.1) legt je Straße Bögen an: links das Foto, rechts das Modell mit eingeblendeten Seitennummern. Der Agent trägt je Seite die Werte in `tools/suhl/fassaden/<viertel>/<strasse>.json` ein (Schema-geprüft). Die Pipeline mischt: von Hand > aus Daten > Regel. Danach zeigt derselbe Bogen, ob es besser wurde. Ziel im Zentrum: jede Seite an einer Straße mit Foto hat Güte ≥ 2. |
| **Vorab automatisch** (Güte 1) | aus dem Foto je Seite: mittlere Wandfarbe; Zahl der Geschosse und Achsen aus der Periodizität der Kanten. Nur als Vorschlag, den der Agent bestätigt. |
| **Echte Fototexturen** | nur für Wahrzeichen, deren Schmuck kein Generator trifft (Liste von `suhl-wissen`). Bedingung: Lizenz erlaubt es (CC0, CC BY, CC BY-SA mit Nennung in den Quellen; am besten Falkos eigene Fotos), entzerrt, je Bau höchstens 2048² als KTX2. Für gewöhnliche Häuser nicht: Autos, Menschen und Schatten wären mit im Bild, und die Seite wäre nicht mehr veränderbar. |

### 4c Straßenraum

| Teil | Daten | Bau |
|---|---|---|
| Fahrbahn | OSM-Achse, auf die echte Fahrbahn geschoben (`roads.fit_axis`; in der Stadt zusätzlich die Asphaltfläche aus dem Luftbild), Breite aus OSM (`width`, `lanes`) oder aus dem Bild; Längsprofil aus DGM1, je Straßenart geglättet (`solve_profile`), Querneigung 2,5 % | Fläche als Geometrie in L0, als aufgelegte Karte (`WELT.setOverlay`) in mittlerer Entfernung |
| Bordstein, Gehweg | Bordkante aus der Fahrbahnbreite; Gehweg bis zur Hauskante oder Grundstücksgrenze; abgesenkt an Überwegen und Einfahrten (3 cm statt 12 cm) | Geometrie in L0; Gehen und Fahren lesen dieselben Höhen (3.5) |
| Kreuzungen | Fläche aus den Fahrbahnrändern der Arme, **eine** geneigte Ebene | wie der Markt in Schleusingen (Polster mit Höhenfunktion) |
| Markierungen, Überwege | OSM (`crossing`, `crossing:markings`, `turn:lanes`, Haltestellen), geprüft am Luftbild | Geometrie in L0 (`roads.markings` als Muster) |
| Ampeln, die schalten | OSM `highway=traffic_signals`, `crossing=traffic_signals` | Masten mit Signalgebern; fester Umlauf je Knoten (**Annahme**: 60–90 s, Phasen nach Armen – echte Signalpläne sind nicht öffentlich); `SUHL.signal(id)` nennt den Zustand, Verkehr und Busse halten daran |
| Schilder | OSM `traffic_sign`; Straßennamensschilder an Einmündungen (wie Veßra); im Zentrum nach Fotos | instanziert, Texte als Atlas je Kachel (im Worker mit `OffscreenCanvas`) |
| Laternen | OSM `highway=street_lamp`; sonst entlang der Straße alle ~32 m (Regel aus `zone_suhl.py`); im Zentrum nach Fotos (Bauart) | instanziert, nachts wie 3.7 |
| Haltestellen | GTFS + OSM-Steige wie `docs/features/bus.md`; Wartehäuschen aus OSM | Schild und Aushang kommen vom Bus-Modul; Suhl liefert Bordkante und Bucht |
| Bäume | Kronenhöhenmodell (Ort, Höhe, Radius), Laub/Nadel aus dem CIR-Bild; Straßenbäume aus OSM | Baumarten der App (EZ-Tree-Stufen aus ARCHITECTURE §10), instanziert je Kachel |
| Mauern, Treppen am Hang | OSM `barrier=wall`/`retaining_wall`, `highway=steps`; dazu Geländesprünge im DGM1 (> 0,8 m auf 1 m) als Stützmauer | einfache Mauer- und Stufengeometrie in L0; Treppen sind begehbar |
| Parkende Autos | Erkennung im Luftbild (`tools/welt-dinge/`: YOLO11-OBB, Regeln aus `decide.py`) | vorhandene Laufzeit `dinge/` – Suhl wird ein weiteres Gebiet |
| Ladenschilder mit echten Namen | OSM-Punkte mit `name` und `shop`/`amenity` (der alte Auszug hat 3 795 benannte Orte im Stadtrahmen) | Schildzone der Fassade, die dem Punkt am nächsten zur Straße liegt |
| Wasser, Bahn | Lauter und Hasel aus OSM, Sohle aus DGM1; Gleise der Strecke Erfurt–Meiningen und der Bahnhof | Wasserprogramm des Bachs; Gleise als Geometrie in L0 |

### 4d Wahrzeichen und Innenräume

| Punkt | Entwurf |
|---|---|
| Ersatz für den Generator | `SUHL.detail(id, { build(ctx), free(obj), near })` – Suhl lässt das Gebäude `id` aus L0/L1 weg und ruft `build`, wenn man näher als `near` kommt. In L2/L3 bleibt die gebackene Form. |
| Jedes Wahrzeichen ein eigenes Paket | `lazy/suhl-lm-<name>.js`, eigene Datei, eigener Agent – keine Überschneidung |
| Reihenfolge im Zentrum | nach `docs/plans/suhl/wahrzeichen.md` (`suhl-wissen`); Kandidaten aus `gebiete.geojson`: Rathaus am Markt, Hauptkirche St. Marien, Kreuzkirche, Malzhaus mit Waffenmuseum, CCS, Bahnhof, Neues Rathaus |
| Innenräume | erst beim Betreten gebaut (`KERN.inside`, Ereignisse `suhl:enter`/`suhl:leave`); Vorbild Ratssaal in `welt/schleusingen.js` |

### 4e Leben

| Thema | Was das vorhandene Modul von Suhl braucht |
|---|---|
| Menschen | Wege je Viertel im Format von `VNETZ.graph` (`{ kind, w, p }`), Aufenthaltsorte (Bänke, Haltestellen, Ladentüren), Dichte je Viertel und Stunde; heute höchstens 4 Figuren je Ort – für den Steinweg eine zweite, billige Stufe (einfache Figuren in einem Mesh ab 40 m). Suhler Figuren und Themen: Stoff aus `ref/suhl-leute-fotos` und `suhl-wissen`. |
| Verkehr | dasselbe Netz mit Einbahnstraßen, Tempo, Vorfahrt und Ampeln; heute höchstens 3 Autos je Ort ohne Vorfahrtsregeln (`docs/features/verkehr.md`) – in der Stadt braucht es Vorfahrt und `SUHL.signal` |
| Busse | Haltestellen und Fahrten in Suhl in `bus/fahrplan.json` (Werkzeug `viz3/extra/bus/quellen/fahrplan.py`, Rahmen erweitern): Linie 203 bis Suhl, dazu die Stadtlinien; ein Straßennetz ohne Lücke zwischen Schleusingen und Suhl; die Steige am Bahnhof/ZOB aus OSM |
| Ton | je Viertel eine Stimmung (Stadt, Wohngebiet, Wald); Glocken der beiden Kirchen zur vollen Stunde; über die Kanäle von `audio/audio.js`, Aufnahmen nur mit freier Lizenz |

## 5 Qualitätskontrolle

### 5.1 Fotoabgleich von der Straße

Vorhanden: `viz3/test/blickpunkte.py` zeichnet das Modell von gegebenen Standpunkten (`x, y, yaw, vfov, eye, pitch, w, h, time`) und
legt Bild und Kamera nach `out/blickpunkte/`. Jedes Foto im Katalog hat Ort, Blickrichtung, Sichtfeld, Datum, Urheber und Lizenz
(`tools/fotos/katalog.json`; für Suhl `tools/suhl/out/fotos/panoramax.json.gz` auf `suhl/fotos`).

| Schritt | Wo | Was |
|---|---|---|
| 1 Standpunkte | Actions | je Foto: Lage → UTM → Modell (`xf`), Blickrichtung um 4,36° gedreht, Augenhöhe **Annahme** 2,2 m (Kamera auf dem Autodach), Sichtfeld aus dem Katalog. Rundum-Fotos: zwei Ausschnitte quer zur Fahrtrichtung (links, rechts, je 90°). |
| 2 Modellbild | Actions, Browser wie in den Tests (SwiftShader) | wie `blickpunkte.py`, dazu ein zweites Bild mit Gebäude- und Seitennummer als Farbe (für die Zuordnung) |
| 3 Feinlage | Actions | GPS liegt 3–10 m daneben: Standpunkt ±10 m längs und Richtung ±5° so wählen, dass die Himmelskante von Foto und Modell am besten passt |
| 4 Zahlen je Bildpaar | Actions | **Umriss:** Deckung der Himmelsfläche (Höhen, Dachformen, Bäume). **Farbe:** Abstand der mittleren Wandfarbe je Seite (ΔE, nach Weißabgleich an Himmel und Fahrbahn). **Raster:** Geschosse und Achsen im Foto (Periodizität der Kanten) gegen die Parameter. |
| 5 Bogen | Wegwerf-Zweig `ref/suhl-abgleich` | Foto und Modell nebeneinander, höchstens 1024 px, mit Kennung, Straße, Richtung, Datum, Zahlen; `CREDITS.md` (Panoramax: CC BY-SA 4.0). Fotos nie auf einen Arbeitszweig. |
| 6 Urteil des Agenten | Chat | `git fetch origin ref/suhl-abgleich`, Bögen mit dem Lese-Werkzeug ansehen; je Seite Noten 1–5 für Material, Farbe, Geschosse, Fenster, Erdgeschoss, Dach in `tools/suhl/out/abgleich/<viertel>.json` |
| 7 Zahl je Straße | Actions | Anteil der Seiten mit Güte ≥ 2, Median von Umriss und ΔE, schlechteste fünf Paare; Tabelle in `docs/features/suhl-abgleich.md` |

Laufzeit (Anhalt): `blickpunkte.py` braucht je Blick gut 3 s; 300 Paare ≈ 20–25 Minuten in einem eigenen Workflow
`suhl-abgleich.yml` (nicht `feat.yml`). Die Schwellen in 5.5 sind **Annahmen**; sie werden nach den ersten 50 Paaren festgelegt.

### 5.2 Abgleich von oben

| Prüfung | Wie | Findet |
|---|---|---|
| Dachfarbe und -klasse | Modell je Kachel Stufe 12 senkrecht von oben (im Test eine eigene Kamera ohne Perspektive, `GAME.R.render(GAME.scene, …)`), daneben das Luftbild derselben Kachel vom WMS; mittlere Farbe je Dachfläche | falsche Klasse, schief ausgeschnittene Dächer |
| Kanten | Dachkanten des Modells gegen Bildkanten (nach dem Versatz aus 4a) | Gebäude, die es nicht mehr gibt oder die fehlen (Datenstand ETHOS/LoD2 älter als das Luftbild), falsche Firstrichtung |
| Bäume | Kronen des Modells gegen die Grünmaske (CIR) | fehlende und erfundene Bäume |
| Straßen | Asphaltfläche des Modells gegen graue Flächen im Bild | falsche Breiten, fehlende Plätze |

Ergebnis je Kachel: vier Zahlen und ein Bogen; die schlechtesten Kacheln zuerst zum Ansehen.

### 5.3 Prüfungen der Daten (ohne Browser, in der Pipeline, Muster `tools/welt/test_welt.py`)

| Prüfung | Grenze |
|---|---|
| Der Mittelpunkt von Suhl liegt im Suchrahmen; mehr als 10 000 Gebäude gefunden | sonst Abbruch (Lehre aus dem Altbestand) |
| Kein Gebäude in einer Fahrbahn | höchstens 0,3 m (wie der Test von `welt-gebaeude`) |
| Grundrisse überlappen nicht | höchstens 1 m² |
| Hausfuß auf dem Gelände | ±0,5 m an den Ecken (wo DGM1 vorliegt) |
| Dach geschlossen | jeder Punkt des Grundrisses liegt unter einer Dachfläche |
| Fassaden-Parameter | Schema; Geschosse × Geschosshöhe passt zur Traufe (±1 m) |
| Straßen je Art | „Wellen je km“ (`roads.metrics`, Job „Straßen glatt“ im Prüfpaket) unter der Grenze der Art; Kreuzung eine Ebene (±3 cm) |
| Kachelkanten | Nachbarn haben gleiche Höhen (wie `test_welt.py`) |
| Summen | Geschossfläche und Bewohner je Viertel gegen amtliche Zahlen (`suhl-wissen`), Abweichung genannt |

### 5.4 Leistung im Browser (`viz3/test/suhl.py`, Abschnitte einzeln wählbar)

| Abschnitt | Prüft |
|---|---|
| `start` | beim Start kein Abruf zur Suhl-Basis, keine neuen Programme, Texturen, Geometrien |
| `zone` | Zone baut 9 km vor der Mitte; Zeit; Fernsicht da; noch keine Nah-Kacheln |
| `orte` | an fünf Orten (Markt, Steinweg, Bahnhof, Suhl-Nord, Blick von der Talbrücke): Draw-Calls, Dreiecke, Programme, Texturen gegen 3.4 |
| `fahrt` | Autopilot quer durch die Stadt: längstes Bild ≤ 50 ms, kein Fall durch den Boden, Wände halten |
| `telefon` | iPhone-13-Kontext: Bilder-Speicher im Zentrum, Programme ≤ 16 Texturen |
| `oben` | Draufsicht über dem Zentrum in drei Bildhöhen: echte Dächer, kein Loch im Boden |
| `nacht` | Fenster, Laternen, keine neuen Lichter |
| `frei` | nach dem Verlassen alles frei |

### 5.5 Wann ist „Zentrum fertig“? (Vorschlag)

| Kriterium | Maß |
|---|---|
| Daten | DGM1, DOM1, LoD2 für die 8 + 8 + 4 Kacheln des Zentrums verarbeitet; jedes der etwa 600 Gebäude hat echte Dachflächen |
| Fassaden | jede Gebäudeseite an einer Straße mit Foto hat Güte ≥ 2; Seiten ohne Foto sind gezählt und in der Fotoliste für Falko |
| Fotoabgleich | Umriss-Deckung im Median ≥ 0,85; Wandfarbe im Median ΔE ≤ 12; Geschosse stimmen bei ≥ 95 % der bewerteten Seiten; keine Note unter 3 an Markt und Steinweg (**Annahmen**, siehe 5.1) |
| Von oben | Dachklasse stimmt bei ≥ 90 % der Flächen; kein fehlendes oder überzähliges Gebäude |
| Straßenraum | jede Straße des Zentrums hat Fahrbahn, Bordstein, Gehweg; alle Überwege, Ampeln, Haltestellen und Laternen aus OSM stehen; Ladenschilder mit Namen |
| Wahrzeichen | die Bauten der Liste von `suhl-wissen` als eigene Modelle, mindestens zwei betretbar |
| Leben | Bus 203 hält nach Fahrplan; Menschen auf dem Steinweg; Ampeln schalten |
| Leistung | alle Abschnitte von 5.4 grün auf „mittel“ und im Telefon-Kontext; Prüfpaket von `src` grün mit Suhl |
| Erreichbar | Fahrt Garten → Markt Suhl über Landstraße und Autobahn ohne Loch, Bus ebenso |
| Szenario | `SUHL.data` liefert für jedes Gebäude des Zentrums Nutzung, Flächen, Dachflächen; Summen des Viertels gegen amtliche Zahlen geprüft |
| Falko | hat es am Laptop und am iPhone gesehen und sagt, was fehlt |

*(Abschnitte 6–8 folgen im nächsten Commit.)*
