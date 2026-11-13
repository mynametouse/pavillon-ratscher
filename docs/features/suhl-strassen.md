# Suhl – Straßen: Suhls Straßen als Daten für das Straßensystem der Region (Paket S2-3)

Stand: 13.11.2026, 1:55 Uhr. Hilfs-Agent `suhl-strassen`, Stufe 2 des Suhl-Plans (Auftrag `docs/plans/auftraege/suhl-strassen.md`,
gemeinsamer Teil `suhl-gemeinsam.md`, `suhl-stufe2.md`). Zweig `suhl/strassen`. Dieses Paket ändert keine vorhandene Datei.

**Grundsatz:** Suhl baut kein zweites Straßensystem. Die Straßen der Stadt kommen im Format der Fahrtdaten (`fahrt/strassen.json`).
Gezeichnet werden sie vom Straßensystem des Straßen-Chats (`feat/strassen`, Stand `f06ee1a` vom 13.11. 0:52). Dieses Dokument sagt
zuerst, wie dieses System die Daten liest und was Suhl von ihm braucht (Schritt 1). Die Schritte 2 bis 6 des Auftrags folgen unten,
sobald sie fertig sind.

| Schritt | Stand |
|---|---|
| 1 Format verstehen, Grenzen und Fragen | **fertig** (Abschnitte 1, 2 und „Für den Suhl-Chat“) |
| 2 Probesatz Zentrum (`s/`-Kacheln und `fahrt/suhl-zentrum.json`) | **erste Fassung da** (Abschnitte 3 und 4); Wasser und Bahn folgen |
| 3 Ganze Stadt in GitHub Actions, Wasser, Bahn, beide Routen | offen |
| 4 Ausstattung (Werkzeug des Straßen-Chats, dazu Ampeln, Überwege, Haltestellen, Laternen, Straßenschilder) | offen |
| 5 Prüfungen | offen |

## 1 Das Format der Fahrtdaten – so liest es das Straßensystem

Gelesen aus `viz3/extra/fahrt/strecke.py` (schreibt die Datei), `viz3/src/welt/fahrt.js` (`parse`, lädt sie), und auf `feat/strassen`:
`viz3/src/strassen/strassen_stil.js`, `strassen_karte.js`, `strassen_daten.js`, `viz3/src/world/roads.js` (`roadShade`),
`viz3/extra/strassen/daten.py`. `strecke.py`, `fahrt.js` und `tools/welt/roads.py` sind auf `feat/strassen` und auf unserem Zweig gleich.

Eine Datei, JSON, Version `v: 1`. Alle Lagen in Modellmetern (x Ost, y Nord, z = Höhe über NHN minus `H0`), als ganze Zahlen in
Dezimetern.

| Feld | Inhalt | Wer es liest |
|---|---|---|
| `kinds` | Liste der Straßenarten. Die Stelle in der Liste ist die Nummer: 0 `motorway`, 1 `main`, 2 `county`, 3 `street`, 4 `lane`, 5 `service`, 6 `track`, 7 `path`, 8 `foot` | `fahrt.js`, Straßenkarte, Shader |
| `surf` | Liste der Beläge: 0 `asphalt`, 1 `concrete`, 2 `paving`, 3 `gravel`, 4 `ground`, 5 `grass` | ebenso |
| `names` | Tabelle der Namen und Nummern (Stelle 0 ist leer) | `fahrt.js` (Ortsanzeige) |
| `ways` | je Straßenstück: `[Art, Belag, Breite in dm, Merker, Name, Nummer, [x, y, z, x, y, z, …]]` | alle |
| Merker `fl` | Bit 1 Brücke, Bit 2 Tunnel, Bit 4 Einbahnstraße. Die App wertet nur 1 und 2 aus. Der erste Suhl-Versuch setzte dazu 8 (Autobahn-Fahrbahn) und 16 (Rampe) und eine Liste `lanes` neben `ways`. | `fahrt.js`, `strassen_karte.js`, `daten.py` |
| z der Punkte | das **geglättete Längsprofil**. Die App schneidet den Boden danach zurecht: Fahrbahn mit 2,5 % Dachgefälle, daneben 2,5 m ebener Streifen, dann Böschung 1 : 2, Reichweite 18 m (`fahrt.js`, `carveZ`). | `fahrt.js` |
| `places` | bebaute Flächen je Ort: Name, Art (`town`, `village`, `hamlet`), Mittelpunkt, Gemeinde, Ringe in Metern | `fahrt.js` (Ortsanzeige), `daten.py` |
| `signs` | Ortstafeln (`ort`) und Wegweiser (`weg`) | `fahrt.js` |
| `routes` | Routen als Punktlisten mit Länge | `fahrt.js`, Karte |
| `park`, `metric` | Parkplatz der Baumschule; die Prüfzahlen je Art | – |

Was **nicht** in der Datei steht und trotzdem das Aussehen bestimmt:

- **Der Stil** (0 freie Strecke, 1 Überholverbot, 2 Stadt, 3 Dorf) ist kein Feld. Die App rechnet ihn je Teilstück aus den Flächen
  `orte` der Datei `strassen/ausstattung.json` (`STRDAT.placeAt`): liegt die Mitte des Teilstücks in einer Fläche mit `t: 2`, ist
  es Stadt, bei `t: 1` Dorf. `daten.py` macht diese Flächen aus `places`: `town` wird 2, `village` 1, `hamlet` entfällt.
- **Die Ränder** sind keine Linien in den Daten. Die Karte merkt je Bildpunkt den Abstand zum Fahrbahnrand (−4 bis +8 m) und den
  Abstand zur Achse (±8 m). Bordstein, Rinne, Gehweg und Linien entstehen im Shader aus diesen zwei Zahlen. Die Fahrbahn ist
  also immer ein Band gleicher Breite um die Achse.
- **Die Breite** kommt aus OSM `width`, sonst aus `lanes` × 3,25 m (nur Arten 0 bis 2), sonst ein Wert je Art: 9,0 / 6,5 / 6,0 /
  5,0 / 3,6 / 3,0 / 3,0 / 1,4 / 1,8 m. Erlaubt sind 1 bis 16 m (`tools/welt/roads.py`, `classify`).
- Zuordnung der OSM-Arten (`classify`): `secondary` und höher → `main`, `tertiary` → `county`, `residential`, `living_street`,
  `pedestrian` → `street`, `unclassified` → `lane`, `footway`, `cycleway`, `steps` → `foot`. Wege mit `area=yes` und `busway`
  ordnet `classify` gar nicht ein.

In der Stadt (Stil 2) zeichnet der Shader: den Belag nach `surf`; Bordstein und Gehweg auf beiden Seiten an allen Arten 0 bis 3
mit festem Belag (Gehweg 1,7 m an Haupt- und Kreisstraßen, 1,3 m an Straßen), die Rinne nur an Asphalt; eine gestrichelte
Mittellinie (3 m Strich, 6 m Lücke) auf Haupt- und Kreisstraßen ab 5,5 m Breite; keine Randlinien. Quelle: `world/roads.js`
(`roadShade`), `strassen_stil.js` (`marks`).

Die Karte selbst: ein Fenster um den Beobachter, 1 536 m mit 1,5 m je Bildpunkt (Telefon 1 024 m mit 2 m). Die Straßen der Karte reichen
bis 500 m um den Beobachter (Telefon 324 m). Je Bildpunkt gilt **eine** Straße – die, in der er am tiefsten liegt. Brücken und
Tunnel lässt die Karte aus. Die Kodierung hat Platz für 4 Stile × 10 Arten × 6 Beläge. Alle vier Stile und alle sechs Beläge sind
vergeben, **eine Art (Nummer 9) ist frei**.

## 2 Was die Straßenkarte in einer dichten Stadt zeigt – und was nicht

Zahlen für das Zentrum aus `tools/suhl/out/strassen/fenster.json` (Skript `tools/suhl/strassen/fenster.py`; OSM-Stand der Stufe 1
vom 12.11. 23:07 UTC). Die Zahlen der Kernstadt stehen in `docs/features/suhl-bestand.md`.

| Thema | Was das System kann | Was in Suhl anfällt | Folge |
|---|---|---|---|
| Menge im Fenster | laut `docs/features/strassen.md` 10–14 ms je Karte, gerechnet in Scheiben von 2,5 ms je Bild | Fenster 1 536 m um den Suhler Mittelpunkt: **88,7 km Wege in 1 482 OSM-Wegen mit 6 826 Teilstücken** (Auto: 52,7 km; Fußwege 21,7; Pfade 8,8; Wirtschaftswege 5,5). Telefon-Fenster: 45,4 km, 3 525 Teilstücke. Zum Vergleich: die ganze heutige Datei `fahrt/strassen.json` hat rund 168 km in 828 Stücken. | Frage F2 |
| Auflösung | 1,5 m je Bildpunkt; Kanten entstehen aus dem geglätteten Abstand | Fußweg 1,8 m = 1,2 Bildpunkte. Zwei Wege mit weniger als etwa 3 m Abstand laufen ineinander (Richtungsfahrbahnen, Fußweg neben der Straße). | in Stufe 3 eigene Geometrie im Zentrum |
| Datenmenge | eine Datei, einmal geladen; alle Wege im Speicher | Stadt: 1 559 km Wege, davon 288 km für Autos. Zentrum allein: 34,5 km. | Kacheln nötig, Frage F1 |
| Plätze, Fußgängerzone als Fläche | nichts – das Format kennt nur Bänder | Zentrum: **9 Flächen, 21 685 m²** (Steinweg 7 311 m², Platz der Deutschen Einheit 5 565, Marktplatz 2 811, Rimbachstraße, Backstraße, Stadelstraße); dazu 64 Parkplatzflächen, 38 006 m² | Wunsch W2; bis dahin liefert Suhl die Flächen in den `s/`-Kacheln, die Laufzeit legt sie selbst |
| Fußgängerzone und verkehrsberuhigt als Linie | gilt als `street`: Bordstein, Rinne, Gehweg | Zentrum: 0,89 km `pedestrian`, 1,88 km `living_street` | Wunsch W1; bis dahin als Art `foot` (Fußgängerzone) und `service` (verkehrsberuhigt) geliefert – beide ohne Bord |
| Gehwege | überall beidseitig an Arten 0–3, feste Breite; an Zufahrten keine | 9,29 km der Wege im Zentrum tragen eine Gehweg-Angabe; 7,84 km Zufahrten | Wunsch W3 |
| Fahrstreifen, Einbahnstraßen | nur die Mittellinie ab 5,5 m; keine Pfeile, keine Busspur | 4,59 km mit `lanes`, 8,02 km Einbahnstraße. Eine Einbahnstraße ab 5,5 m bekommt eine Mittellinie – richtig bei zwei Spuren, falsch bei einer. | Wunsch W4 |
| Kreisverkehr | ein Ring als Band; ab 5,5 m mit Mittellinie | im Zentrum keiner; in der Stadt und an ihrem Rand 19 Ringstücke (OSM-Stand der Stufe 1), 14 davon an Haupt- und Landesstraßen | Wunsch W4 |
| Kreuzungen | jeder Bildpunkt gehört einer Straße; Einmündungen bleiben offen (kein Bord quer). Mittellinien laufen durch. Haltlinien und Zebrastreifen kommen als `linien` aus der Ausstattung. | 26 Ampelknoten und 26 Querungen im Zentrum | Ampeln fehlen dem System (Stufe 3) |
| Brücken, Tunnel | aus der Karte ausgelassen; Brücken bekommen von `fahrt.js` ein Deck ohne Markierung, Tunnel nichts | Zentrum: 7 Brückenstücke, 22 Tunnelstücke, 5 Hausdurchgänge | Frage F4 |
| Treppen, Stützmauern | Treppen sind `foot` (ein Band); Mauern kennt das Format nicht | Zentrum: 57 Treppen (0,59 km), 1,5 km Stützmauern | Stufe 3, eigene Geometrie |
| Bushaltebucht, Busbahnhof | nichts; `busway` wird nicht eingeordnet | ein Busweg am Bahnhof | Suhl liefert ihn als `service` |
| Boden | `fahrt.js` schneidet den Boden an **jedem** Weg der Datei zurecht (18 m weit) | in der Stadt stehen Häuser direkt am Gehweg | „An die anderen Suhl-Pakete“ unten |

**Was das System für Suhl abdeckt:** Asphalt, Pflaster und Wege mit ihrem Aussehen aus der Nähe, Bordstein, Rinne und Gehweg an
den Fahrstraßen, Mittellinien, Nässe, das geglättete Profil unter den Rädern, Decks auf Brücken, Ortsanzeige mit Straßennamen,
dazu die Ausstattung (Schilder, Laternen, Planken, Leitpfosten, Masten, Haltlinien, Zebrastreifen).

**Was es nicht abdeckt:** Plätze und alle anderen Flächen, die Fußgängerzone ohne Bord, Gehwege nach Seite, Fahrstreifen und
Pfeile, Ampeln, Treppen, Mauern, Haltebuchten, mehrere Ebenen übereinander. Dafür liefert Suhl Daten in eigenen Feldern und
Kacheln (Abschnitt 3); gezeichnet wird das in Stufe 3 (Paket S3-5) oder nach den Wünschen unten vom Straßen-Chat.

## 3 Was Suhl liefert

### 3.1 Dateien des Probesatzes (Zentrum, 11 Kacheln der Stufe 10)

Ordner `tools/suhl/out/strassen/probe/` (Liste der Kacheln: `tools/suhl/lib/probe.json`). Erzeugt mit
`python3 -I tools/suhl/strassen/lauf.py --gebiet probe --out tools/suhl/out/strassen/probe` in 6 Sekunden.

| Datei | Inhalt | Größe |
|---|---|---|
| `suhl/s/v0/10/{x}/{y}.json` | je Kachel die Wegstücke (an den Kachelkanten geschnitten) und die Flächen | 8–32 kB, zusammen 222 kB |
| `suhl/s/v0/index.json` | Kachelliste (Bitfeld von `suhllib`), Feldnamen, Merker, Quellen, Zahlen des Laufs | 6 kB |
| `fahrt/suhl-zentrum.json` | dasselbe ungeteilt **im Format von `fahrt/strassen.json`** (Abschnitt 1) – das könnte `fahrt.js` so laden | 268 kB |
| `zahlen.json` | Kilometer und Stückzahlen je Art, Wellen je km, Kreuzungen, Brücken | 6 kB |

### 3.2 Kachel `s` (Schema 1, Version 0)

Rahmen wie in `tools/suhl/lib/suhllib.py` (`TileFrame`): `o` ist die Kachelmitte in Modellmetern. Alle Lagen sind ganze Dezimeter
relativ zu `o`, die Achsen wie im Modell; z = NHN − `H0`. Durch das Runden liegen die Schnittpunkte zweier Nachbarkacheln bis
5 cm auseinander, die Höhe ist gleich.

- `ways`: `[Art, Belag, Breite dm, Merker, Name, Nummer, [x, y, z, …], OSM-Weg, s0, Spuren, OSM-Klasse, Tempo, Stil]`. Die ersten
  sieben Stellen sind die der Fahrtdaten. `s0` sind die Dezimeter entlang des ganzen Wegs am ersten Punkt des Stücks – damit die
  Strichfolge der Mittellinie an der Kachelkante nicht springt. `OSM-Klasse` zeigt in die Liste `hws` (`residential`,
  `living_street`, `steps` …). `Stil`: 2 Stadt, 3 Dorf, 0 freie Strecke – nur ein Hinweis, die App rechnet den Stil selbst.
- `areas`: `[Typ, Belag, Merker, Name, OSM-Kennung, home, q, [x, y, z, …], [Löcher]]`. Typen (`atypes`): `platz` (Fußgängerfläche,
  Platz), `parken`, `bus`, `steig`. Eine Fläche steht ganz in jeder Kachel, die sie berührt; `home` ist 1 in der Kachel ihres
  Bezugspunkts (so zeichnet man sie nur einmal). Die Höhen kommen aus einer Ebene: `q` 1 = durch die Wegpunkte auf der Fläche
  gelegt, `q` 0 = aus dem Gelände am Rand.
- `names`, `kinds`, `surf`, `hws`, `atypes`: die Tabellen dazu. `m`: Meter je Art in der Kachel.

### 3.3 Die Datei im Format der Fahrtdaten

Die Pflichtfelder sind genau die von `fahrt/strassen.json`: `kinds`, `surf`, `names`, `ways`, `places` (Suhl als `town` mit dem
Umriss der Kernstadt), `signs` (noch leer), `routes`, `park`. Dazu kommen Suhls Felder, die die App überliest:
`lanes`, `ids` (OSM-Weg), `hw`/`hws` (OSM-Klasse), `ms` (Tempo), `s0` – je eine Liste neben `ways`; `areas`
(`[Belag, Merker, Name, [x, y, z, …], [Löcher], Typ, OSM-Kennung, q]`); `orte` im Format von `strassen/ausstattung.json`
(`t: 2` = Stadt, Ringe in dm) für `STRDAT`; `fl_bits`; `bridges`, `tunnels`; `metric`, `heights`, `junctions`.

| Bit in `fl` | Bedeutung | Wer es heute liest |
|---|---|---|
| 1 | Brücke | App |
| 2 | Tunnel (kein Hausdurchgang) | App |
| 4 | Einbahnstraße in Punktrichtung (`oneway=-1` ist schon umgedreht) | – (`strecke.py` schreibt es) |
| 8, 16 | Autobahn-Fahrbahn, Rampe | – (erster Suhl-Versuch) |
| 32 | Kreisverkehr | Vorschlag Suhl |
| 64 | niveaugleich ohne Bord (Fußgängerzone, verkehrsberuhigt; auch Plätze) | Vorschlag Suhl |
| 128 | Treppe | Vorschlag Suhl |
| 256, 512 | links / rechts kein Gehweg (OSM `sidewalk`) | Vorschlag Suhl |
| 1024 | nicht öffentlich (`access=private/no`) | Vorschlag Suhl |
| 2048, 4096 | Hausdurchgang, überdacht | Vorschlag Suhl |
| 8192, 16384 | eigens kartierter Gehweg neben einer Straße; Querung über die Fahrbahn | Vorschlag Suhl |

Wie OSM auf die Arten kommt: die Regel der Region (`tools/welt/roads.py`, `classify`), mit vier Abweichungen, damit das heutige
Straßensystem die Stadt richtig zeichnet:

- Fußgängerzone als Linie (`pedestrian`) → Art `foot` mit Bit 64 und echter Breite; verkehrsberuhigt (`living_street`) → Art
  `service` mit Bit 64. Beide zeichnet der Shader ohne Bord und Gehweg. Die OSM-Klasse bleibt in `hw` stehen. Kommt Wunsch W1,
  werden beide wieder `street`.
- `busway` → `service`; Treppen → `foot` mit Bit 128, 1,6 m breit.
- Breite ohne OSM-Angabe: Einbahnstraßen 3,25 m je Spur plus 0,5 m (ohne Spurangabe 4,5 m an Hauptstraßen, 4,0 m an Straßen) –
  sonst bekäme jede Richtungsfahrbahn 6,5 m und eine Mittellinie.
- Flächen (`area=yes`), Baustellen und Bahnsteige sind keine Wege; die Flächen stehen in `areas`.

### 3.4 Die Höhen – wer sie besitzt und worauf sie gerechnet sind

**Die Straßenhöhen gehören diesem Paket** (Entscheidung des Suhl-Chats, 13.11.). Die Quelle ist die Datei im Format der
Fahrtdaten: je Weg die Achse mit z, Breite, Art, Belag und die Merker Brücke und Tunnel. `suhl-boden` schneidet daraus die Straßen
in seine Geländekacheln, ohne neu zu rechnen:

```python
sys.path.insert(0, 'tools/suhl/strassen'); import profil
pos, chains, h, meta = profil.load('tools/suhl/out/strassen/probe/fahrt/suhl-zentrum.json', town=True)
roads.carve(dem, pos, chains, h, area)   # tools/welt/roads.py, unverändert: Brücken behalten ihren Korridor, Tunnel bleiben draußen
```

`pos` sind UTM-Punkte im Abstand von höchstens 2 m, `h` Höhen über NHN, `chains` die Wege so, wie `roads.py` sie liest. Mit
`town=True` ist die Breite um Bord und Gehwege erweitert (1,7 m an Haupt- und Kreisstraßen, 1,3 m an Straßen, je Seite – dieselbe
Regel wie im Shader): der Schnitt ist dann über den ganzen Straßenraum eben. Brücken (Bit 1) und Tunnel (Bit 2) lässt `carve` aus.

**Gerechnet auf:** Copernicus GLO-30 (30 m, Wald um 5.0 m abgesenkt; 855555 Stützwerte); kleine Klassen 1.3-fach länger geglättet (`heights.solved_on` in jeder Datei). Sobald `suhl-boden` Geländekacheln mit 1-m-Gelände hat,
läuft derselbe Schritt mit `--tiles <Ordner t/>` neu; von Hand wird nichts geändert.

So entstehen die Profile (`tools/suhl/strassen/netz.py`, `solve`): eine Ausgleichsrechnung für alle Wege zusammen mit den Gewichten
von `tools/welt/roads.py` – Kreuzungsknoten sind geteilt, also treffen sich die Wege auf einer Höhe; Brücken und Tunnel bleiben
gerade. Neu für die Stadt:

- Wo OSM eine Straße in zwei Wege teilt, läuft die Glättung über die Nahtstelle (610 Stellen im Probesatz).
- **Kreuzungen als Ebene:** einmündende Wege folgen auf den ersten Metern der Ebene der durchgehenden Straße (4908 Zeilen).
- **Richtungsfahrbahnen** einer Straße liegen auf einer Höhe (957 Verbindungen).
- Brücken über anderen Wegen: die Anhebung aus `strecke.py` (`overpasses`, hier bis 2,56 m) geht in das Gelände
  ein, und es wird noch einmal gerechnet – ein Profil aus einem Guss.
- Auf dem 30-m-Oberflächenmodell (Häuser, Baumkronen) werden Straßen und kleinere Wege über die 1,3-fache Wellenlänge
  ihrer Klasse geglättet. Mit 1-m-Gelände entfällt der Faktor.

## 4 Zahlen des Probesatzes

Aus `tools/suhl/out/strassen/probe/zahlen.json` (Lauf vom 13.11.2026, OSM-Stand 12.11.2026 23:07 UTC). Längen sind echte Meter (UTM).

| Art in den Fahrtdaten | km in den 11 Kacheln | OSM-Wege |
|---|---:|---:|
| `foot` | 22,61 | 539 |
| `service` | 19,62 | 388 |
| `street` | 14,43 | 182 |
| `path` | 7,50 | 94 |
| `main` | 5,05 | 68 |
| `track` | 2,20 | 19 |
| `lane` | 1,72 | 25 |
| `county` | 0,01 | 1 |
| **zusammen** | **73,1** | **1316** |

Flächen: 9 Fußgängerflächen und Plätze mit 21 689 m², 144 Parkplätze mit 84 146 m².
Brückenstücke: 11, Tunnelstücke: 23.

**Wellen je km** – die Prüfzahl der Region (`roads.metrics`: Ausschläge über 15 cm gegen das 62-m-Mittel), vorher = Gelände an
der Achse, nachher = Profil. Gezählt werden Wege ab 60 m ohne Brücken und Tunnel, im ganzen Rechenrahmen (Kacheln plus 300 m).

| Art (Regel der Region) | km | Wellen je km vorher → nachher | Steigungswechsel je 10 m in % | Grenze | eingehalten |
|---|---:|---|---|---|---|
| `main` | 7,2 | 19,7 → **0,0** | 3,07 → 0,23 | 2 / 0,5 | ja |
| `county` | 0,1 | 25,6 → **0,0** | 2,41 → 0,18 | 3 / 0,7 | ja |
| `street` | 41,4 | 16,7 → **1,6** | 3,13 → 0,68 | 4 / 1,0 | ja |
| `lane` | 2,5 | 17,9 → **1,6** | 3,39 → 0,74 | 4 / 1,0 | ja |
| `service` | 28,1 | 19,3 → **3,6** | 3,79 → 1,06 | 5 / 1,2 | ja |
| `track` | 13,6 | 15,6 → **3,3** | 3,66 → 1,19 | 6 / 1,5 | ja |
| `path` | 16,3 | 14,7 → **7,2** | 4,80 → 2,84 | – | – |
| `foot` | 25,6 | 20,4 → **9,5** | 3,33 → 1,92 | – | – |

**Kreuzungen** (alle Knoten mit drei und mehr Armen; größte Abweichung von einer Ebene, 3 m um den Knoten): 1871 Knoten,
Mitte 0,5 cm, 95 % unter 7,2 cm, größte 41,1 cm;
**88,2 % innerhalb von 3 cm** (Kreuzungen von Fahrstraßen: 916 Knoten,
85,9 %). Das Ziel des Plans (jede Kreuzung ±3 cm) ist auf dem 30-m-Gelände noch nicht erreicht.

**Brücken über anderen Wegen:** 8 Stellen, an 8 davon weniger als 4,5 m Abstand. Das 30-m-Modell kennt
keine Brücken; `overpasses` hebt höchstens 3,5 m an und lässt größere Lücken stehen. Betroffen sind vor allem Fußgängerstege.
Das wird mit 1-m-Gelände besser und ist als nächster Schritt eine eigene Regel wert.

## Quellen und Nennung

- Straßen, Wege, Plätze, Gewässer, Bahn, Ampeln, Laternen: © OpenStreetMap-Mitwirkende, ODbL 1.0.
- Haltestellennamen: Fahrplandaten von DELFI e.V. über gtfs.de, CC BY 4.0 (`tools/suhl/out/bestand/oepnv.json`).
- Höhen: Copernicus DEM GLO-30 (© DLR e.V. 2010–2014 und © Airbus Defence and Space GmbH 2014–2018, bereitgestellt unter COPERNICUS
  durch die Europäische Union und ESA), später DGM1 „© GDI-Th“, CC BY 4.0.

## Für den Suhl-Chat

Fragen und Wünsche an den Straßen-Chat. Jeder Wunsch ist so klein wie möglich gehalten. Suhl liefert in jedem Fall schon heute
alle Angaben mit – die App überliest unbekannte Felder und Bits (`fahrt.js` prüft nur `fl & 1`, `fl & 2`).

**Fragen**

- **F1 Mehr als eine Datei:** `fahrt.js` lädt genau `fahrt/strassen.json`, die Karte liest `FAHRT.data.ways`. Suhl hat 1 559 km Wege
   und darf beim Start nichts laden. Können Fahrtdaten zur Laufzeit dazukommen und wieder gehen – etwa `FAHRT.add(name, json)` und
   `FAHRT.drop(name)` je Kachel (400 m) oder je Gebiet? Wer baut das: ihr, der Kern-Chat oder Suhl als Haken F1?
- **F2 Dichte:** Verträgt die Karte 6 800 Teilstücke im Fenster (Zentrum Suhl), 3 500 am Telefon? Sollen Fußwege, Pfade und Treppen
   (Arten 6 bis 8, im Zentrum 12,6 km) überhaupt in die Karte, oder nur die Arten 0 bis 5?
- **F3 Bleibt das Format stabil**, wenn `feat/strassen` in `src` ist? Suhl hängt an: Reihenfolge von `kinds` und `surf`, Aufbau von
   `ways`, Bedeutung von `fl`, `places` mit `k`.
- **F4 Brücken:** Bekommen die Decks bald Asphalt und Markierung aus der Karte? Suhl hat Talbrücken der A 73 und viele kleine Brücken.
   Und: Was soll in einem Tunnel und unter einer Brücke gelten, wenn zwei Wege übereinander liegen?

**Wünsche**

- **W1 Ohne Bord:** ein Merker je Weg für „niveaugleich“ (Fußgängerzone, verkehrsberuhigter Bereich): kein Bordstein, keine Rinne,
   kein Gehweg, keine Linie. Vorschlag: Bit 64 in `fl`; beim Rastern schreibt ihr dafür die freie Art 9 in die Karte, der Shader
   lässt bei Art 9 Bord und Linien weg. Suhl setzt Bit 64 schon jetzt.
- **W2 Flächen:** ein Feld `areas` neben `ways`: `[Belag, Merker, Name, [x, y, z, …]]` (Ring in dm). Die Karte rastert sie wie einen
   Weg: Abstand zum Rand der Fläche statt zum Band, Art 9. Damit wären Markt, Steinweg, Platz der Deutschen Einheit und Parkplätze
   da. Suhl liefert `areas` schon jetzt in derselben Datei.
- **W3 Gehweg je Seite:** Bit 256 „links kein Gehweg“, Bit 512 „rechts kein Gehweg“ (aus OSM `sidewalk`). Suhl setzt die Bits. Ob
   und wie ihr sie in die Karte bringt, entscheidet ihr.
- **W4 Mittellinie:** keine Mittellinie bei Bit 32 (Kreisverkehr) und bei Einbahnstraßen mit einer Spur (Bit 4 und `lanes` = 1).
   Kleinste Lösung ohne Shader-Änderung: beim Rastern den Achsabstand auf den Höchstwert setzen.
- **W5 Ausstattung für Suhl:** `daten.py` liest die Straßen der App aus zwei festen Dateien (eine davon gibt es nur nach einem Bau
   der App) und OSM über die Zellen von `strecke.py`. Suhl ruft deshalb die Funktionen einzeln auf (`guard_rails`, `delineators`,
   `signs`, `lamps`, `power`) und füllt `Net`, `Places` und `Osm` selbst – das geht ohne Änderung. Schöner wären drei Schalter:
   `--fahrt <Datei>`, `--osm <OPL-Datei>`, `--out <Datei>`.
- **W6 Ausstattung und Orte zur Laufzeit:** `strassen/ausstattung.json` lädt beim Start. Suhls Flächen `orte` (sie machen den Stil
   „Stadt“) und Suhls Ausstattung dürfen erst beim Hinkommen laden: bitte `STRDAT.add(json)` (hängt `orte` und die Listen an)
   und das Gegenstück zum Entfernen.

**An die anderen Suhl-Pakete** (Entscheidung des Suhl-Chats vom 13.11., 1:45 Uhr)

- Suhl ist eine Zone mit eigenem Boden, wie Kloster Veßra. `fahrt.js` schneidet in Suhl zur Laufzeit nichts zurecht.
- **Die Straßenhöhen kommen aus diesem Paket.** `suhl-boden` schneidet die Straßen aus der Datei im Format der Fahrtdaten in
  seine Geländekacheln (Abschnitt 3.4, `tools/suhl/strassen/profil.py`). `suhl-gebaeude` liest die Hausfüße aus diesem Gelände.
- Die Produktliste in `tools/suhl/lib/suhllib.py` nennt `suhl-gruen` als Besitzer der Möbel-Kacheln `m`. Nach meinem Auftrag
  kommen Ampeln, Überwege, Haltestellen, Laternen und Straßenschilder von hier. Bitte klären, wer `m` schreibt.
