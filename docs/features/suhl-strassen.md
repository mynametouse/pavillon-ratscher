# Suhl – Straßen: Suhls Straßen als Daten für das Straßensystem der Region (Paket S2-3)

Stand: 13.11.2026, 2:30 Uhr. Hilfs-Agent `suhl-strassen`, Stufe 2 des Suhl-Plans (Auftrag `docs/plans/auftraege/suhl-strassen.md`,
gemeinsamer Teil `suhl-gemeinsam.md`, `suhl-stufe2.md`). Zweig `suhl/strassen`. Dieses Paket ändert keine vorhandene Datei.

**Grundsatz:** Suhl baut kein zweites Straßensystem. Die Straßen der Stadt kommen im Format der Fahrtdaten (`fahrt/strassen.json`).
Gezeichnet werden sie vom Straßensystem des Straßen-Chats (`feat/strassen`, Stand `f06ee1a` vom 13.11. 0:52). Dieses Dokument sagt
zuerst, wie dieses System die Daten liest und was Suhl von ihm braucht (Abschnitte 1 und 2), dann, was Suhl liefert (3), die Zahlen
(4) und den Stand der Absprache mit dem Straßen-Chat (5).

| Schritt | Stand |
|---|---|
| 1 Format verstehen, Grenzen und Fragen | fertig (Abschnitte 1 und 2); der Straßen-Chat hat um 2:00 Uhr alle Fragen beantwortet (Abschnitt 5) |
| 2 Probesatz Zentrum | fertig, **gerechnet auf dem 1-m-Gelände von `suhl-boden`** (Abschnitt 4.1) |
| 3 Ganze Stadt in GitHub Actions, Wasser, Bahn, beide Routen, Anfahrt | läuft durch, auf dem Gelände von `suhl-boden` für die Stadt (heute noch 30 m; Abschnitt 4.2) |
| 4 Ausstattung | fertig über das unveränderte Werkzeug des Straßen-Chats, dazu Ampeln, Querungen, Haltestellen, Straßennamensschilder |
| 5 Prüfungen | laufen mit; drei bestehen noch nicht (Abschnitt 4) |

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
| Fußgängerzone und verkehrsberuhigt als Linie | gilt als `street`: Bordstein, Rinne, Gehweg | Zentrum: 0,89 km `pedestrian`, 1,88 km `living_street` | Wunsch W1 – zugesagt: Bit 64 wird in der Karte die Art 9 ohne Bord; Suhl liefert beide als `street` mit Bit 64 |
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

### 3.1 Dateien

**Probesatz Zentrum** – die 11 Kacheln der Stufe 10 aus `tools/suhl/lib/probe.json`, im Zweig unter `tools/suhl/out/strassen/probe/`:

| Datei | Inhalt |
|---|---|
| `suhl/s/v0/10/{x}/{y}.json`, `suhl/s/v0/index.json` | Straßenraum je Kachel: Wege, Flächen, Gleise, Bahnpunkte, Gewässer |
| `suhl/m/v0/10/{x}/{y}.json`, `suhl/m/v0/index.json` | Möbel der Straße je Kachel |
| `fahrt/suhl-zentrum.json` | alle Wege ungeteilt **im Format von `fahrt/strassen.json`**; zugleich die eine Quelle der Straßenhöhen |
| `strassen/suhl-zentrum-ausstattung.json` | die Ausstattung in einer Datei im Format von `strassen/ausstattung.json` |
| `zahlen.json`, `moebel.json`, `pruefung.json` | die Zahlen dazu |

**Ganze Stadt** – 1 013 Kacheln der Gemeinde und die Kacheln an den zwei Routen vom Garten. Die Kacheln liegen als Artefakt
`suhl-strassen-stadt` am Lauf des Workflows (14 Tage), bis es das Daten-Repo gibt. Auf den Zweig kommen nach jedem Lauf nur kleine
Dateien unter `tools/suhl/out/strassen/stadt/`: `zahlen.json`, `moebel.json`, `routen.json`, `pruefung.json`, die zwei
`index.json`, `fahrt/suhl.json.gz` (Stadt), `fahrt/suhl-anfahrt.json.gz` (Anfahrt), `fahrt/routen-suhl.json.gz`,
`strassen/suhl-ausstattung.json.gz`, `hoehen.txt` (welches Gelände), `osm-stand.txt`, `lauf.txt` (Nummer des Laufs).

### 3.2 Kachel `s` (Schema 1, Version 0)

Rahmen wie in `tools/suhl/lib/suhllib.py` (`TileFrame`): `o` ist die Kachelmitte in Modellmetern. Alle Lagen sind ganze Dezimeter
relativ zu `o`, die Achsen wie im Modell; z = NHN − `H0`. Durch das Runden liegen die Schnittpunkte zweier Nachbarkacheln bis
5 cm auseinander, die Höhe ist gleich. Die Feldnamen stehen noch einmal in `index.json` (`fields`).

- `ways`: `[Art, Belag, Breite dm, Merker, Name, Nummer, [x, y, z, …], OSM-Weg, s0, Spuren, OSM-Klasse, Tempo, Stil]`. Die ersten
  sieben Stellen sind die der Fahrtdaten. Wege sind an den Kachelkanten geschnitten. `s0` sind die Dezimeter entlang des ganzen
  Wegs am ersten Punkt des Stücks – damit die Strichfolge der Mittellinie an der Kachelkante nicht springt. `OSM-Klasse` zeigt in
  die Liste `hws` (`residential`, `living_street`, `steps` …). `Stil`: 2 Stadt, 3 Dorf, 0 freie Strecke – ein Hinweis, die App
  rechnet den Stil selbst aus `orte`.
- `areas`: `[Typ, Belag, Merker, Name, OSM-Kennung, home, q, [x, y, z, …], [Löcher]]`. Typen (`atypes`): `platz` (Fußgängerfläche,
  Platz), `parken`, `bus`, `steig`. Eine Fläche steht ganz in jeder Kachel, die sie berührt; `home` ist 1 in der Kachel ihres
  Bezugspunkts (so zeichnet man sie nur einmal). Die Höhen kommen aus einer Ebene: `q` 1 = durch die Wegpunkte auf der Fläche
  gelegt, `q` 0 = aus dem Gelände am Rand.
- `rail`: `[Typ, Merker, Name, [x, y, z, …], OSM-Weg, s0, Nebengleis]` – Typ 0 in Betrieb, 1 stillgelegt; Merker 1 Brücke, 2 Tunnel.
  Abgebaute Gleise (`abandoned`) fehlen mit Absicht. `railpts`: `[Typ, x, y, z, Name, OSM-Knoten]` – 0 Bahnhof, 1 Haltepunkt,
  2 Bahnübergang, 3 Übergang für Fußgänger.
- `water`: `[Typ, Merker, Breite dm, Name, [x, y, z, …], OSM-Weg, s0]` – Typen (`wtypes`) `river`, `stream`, `canal`, `ditch`,
  `drain`; Merker 2 = verrohrt oder überdeckt. `wareas`: `[Art, Name, OSM-Kennung, home, z, [x, y, …], [Löcher]]` – Teiche,
  Becken, Brunnen; eine Höhe je Fläche.
- `names`, `kinds`, `surf`, `hws`, `atypes`, `wtypes`: die Tabellen dazu. `m`: Meter je Art in der Kachel.

### 3.3 Die Datei im Format der Fahrtdaten

Die Pflichtfelder sind genau die von `fahrt/strassen.json`: `kinds`, `surf`, `names`, `ways`, `places`, `signs` (noch leer),
`routes`, `park`. Dazu kommen Suhls Felder: `lanes`, `ids` (OSM-Weg), `hw`/`hws` (OSM-Klasse), `ms` (Tempo), `s0` – je eine
Liste neben `ways`; `areas` (`[Belag, Merker, Name, [x, y, z, …], [Löcher]]` in dm, dahinter Typ, OSM-Kennung, q); `orte` im
Format von `strassen/ausstattung.json` (`t` 2 Stadt, 1 Dorf; Ringe in dm); `fl_bits`; `bridges`, `tunnels`; `rail`, `railpts`,
`water`, `wareas`; `metric`, `heights`, `junctions`. `lanes`, `areas` und `orte` liest das Straßensystem nach seiner Runde 2
(Abschnitt 5), den Rest überliest die App.

**Orte:** Die Kernstadt ist `town` (Stil Stadt). Die Dörfer sind `village` (Stil Dorf): Goldlauter, Heidersbach und Mäbendorf –
sie liegen in der Kernstadt und sind herausgeschnitten – und Albrechts, Dietzhausen, Wichtshausen, Vesser, Schmiedefeld am
Rennsteig, Gehlberg. Ihr Umriss kommt aus den bebauten Flächen in OSM im Umkreis des Ortspunkts.

| Bit in `fl` | Bedeutung | Wer es liest |
|---|---|---|
| 1 | Brücke | App |
| 2 | Tunnel (kein Hausdurchgang) | App |
| 4 | Einbahnstraße in Punktrichtung (`oneway=-1` ist schon umgedreht) | Runde 2 (Mittellinie) |
| 8, 16 | Autobahn-Fahrbahn, Rampe | – |
| 32 | Kreisverkehr | Runde 2: keine Mittellinie |
| 64 | niveaugleich ohne Bord (Fußgängerzone, verkehrsberuhigt) | Runde 2: Art 9 in der Karte |
| 128 | Treppe | Runde 2: nicht in der Karte |
| 256, 512 | links / rechts kein Gehweg (OSM `sidewalk`) | Runde 2: diese Seite im Stil Dorf |
| 1024 | nicht öffentlich (`access=private/no`) | Suhl |
| 2048, 4096 | Hausdurchgang, überdacht | Suhl |
| 8192, 16384 | eigens kartierter Gehweg neben einer Straße; Querung über die Fahrbahn | Suhl |
| 32768 | die Achse führt in ein Gebäude (Parkhaus-Einfahrt, Durchfahrt ohne Tunnel-Angabe) | Suhl |

Wie OSM auf die Arten kommt: die Regel der Region (`tools/welt/roads.py`, `classify`), mit diesen Zusätzen für die Stadt
(`tools/suhl/strassen/netz.py`, `record`):

- Fußgängerzone als Linie (`pedestrian`) und verkehrsberuhigt (`living_street`) sind `street` mit Bit 64; Pflaster, wenn OSM
  keinen Belag nennt. `busway` ist `service`. Treppen sind `foot` mit Bit 128, 1,6 m breit.
- Breite ohne OSM-Angabe: Einbahnstraßen 3,25 m je Spur plus 0,5 m (ohne Spurangabe 4,5 m an Hauptstraßen, 4,0 m an Straßen) –
  sonst bekäme jede Richtungsfahrbahn 6,5 m. Autobahn: Randstreifen, Spuren, Standstreifen wie im ersten Versuch.
- **Kein Haus in der Fahrbahn:** Steht ein Gebäude näher an der Achse als die halbe angenommene Breite, wird die Straße so schmal,
  wie das Haus es zulässt (mindestens 2,2 m). Eine Breite aus OSM bleibt. Läuft die Achse selbst in ein Gebäude, bekommt der Weg
  Bit 32768.
- Flächen (`area=yes`), Baustellen und Bahnsteige sind keine Wege; die Flächen stehen in `areas`.

### 3.4 Die Höhen – ein Boden für alle

Entscheidung des Suhl-Chats (13.11., 1:45 und 2:05 Uhr): Suhl ist eine Zone mit eigenem Boden. **Die Straßenhöhen gehören diesem
Paket.** Je Datenstand gilt diese Reihenfolge:

1. `suhl-boden` gibt sein Gelände **ungeschnitten** heraus (Probesatz: `tools/suhl/out/boden/probe/roh/v1/t` auf `suhl/boden`;
   Stadt: Artefakt `suhl-boden-roh` seines Laufs).
2. Dieses Paket rechnet die Profile **auf genau diesen Kacheln** (`lauf.py --tiles <Ordner t>`), nie auf einer eigenen Abtastung.
3. `suhl-boden` schneidet die Straßen in seine Kacheln. 4. `suhl-gebaeude` liest die Hausfüße aus diesem Gelände.

Die Quelle für Schritt 3 ist die Datei im Format der Fahrtdaten – je Weg die Achse mit z, Breite, Art, Belag, Merker:

```python
sys.path.insert(0, 'tools/suhl/strassen'); import profil
pos, chains, h, meta = profil.load('tools/suhl/out/strassen/probe/fahrt/suhl-zentrum.json', town=True)   # liest auch .gz
roads.carve(dem, pos, chains, h, area)   # tools/welt/roads.py, unverändert: Brücken behalten ihren Korridor, Tunnel bleiben draußen
```

`pos` sind UTM-Punkte im Abstand von höchstens 2 m, `h` Höhen über NHN, `chains` die Wege so, wie `roads.py` sie liest. Mit
`town=True` ist die Breite um Bord und Gehwege erweitert (dieselbe Regel wie im Shader): der Schnitt ist über den ganzen
Straßenraum eben. Treppen, Hausdurchgänge, überdachte Wege, Gehwege neben der Straße, Querungen und Wege in Gebäude lässt
`suhl-boden` aus dem Schnitt (Bits 128, 2048, 4096, 8192, 16384, 32768).

**Worauf gerechnet wurde**, steht in jeder Datei (`heights.solved_on`, `heights.ground`, `heights.tiles_from`) und oben in den
Zahlen. `heights.zaehlt` ist nur wahr, wenn mindestens drei Viertel der Stützwerte aus den Kacheln von `suhl-boden` stammen. Am Rand
außerhalb dieser Kacheln (400 m Umgebung für die Profile) tastet das Paket Copernicus selbst ab – mit dem Kronenabzug und dem
Höhenversatz, die der Kachelsatz in seiner `meta.json` nennt, damit dort keine Stufe entsteht.

So entstehen die Profile (`tools/suhl/strassen/netz.py`, `solve`): eine Ausgleichsrechnung für alle Wege und Gleise zusammen, mit
den Gewichten von `tools/welt/roads.py`. Kreuzungsknoten sind geteilt, also treffen sich die Wege auf einer Höhe; Brücken und
Tunnel bleiben gerade. Neu für die Stadt:

- Wo OSM eine Straße in zwei Wege teilt, läuft die Glättung über die Nahtstelle.
- **Kreuzungen als Ebene:** einmündende Wege folgen auf den ersten Metern der Ebene der durchgehenden Straße. Am Bahnübergang
  ist das Gleis die durchgehende „Straße“.
- **Richtungsfahrbahnen** einer Straße liegen auf einer Höhe.
- Brücken über anderen Wegen: die Anhebung aus `strecke.py` (`overpasses`, höchstens 3,5 m) geht in das Gelände ein, und es
  wird noch einmal gerechnet – ein Profil aus einem Guss statt einer aufgesetzten Rampe.
- Ein Tunnel oder Durchgang mit losem Ende wird am Gelände gehalten (sonst lief einer 41 m in die Tiefe).
- Solange das Gelände das 30-m-Oberflächenmodell ist (Häuser, Baumkronen), werden Straßen und kleinere Wege über die 1,3-fache
  Wellenlänge ihrer Klasse geglättet. Liegt unter mindestens der Hälfte der Kacheln 1-m-Gelände, entfällt der Faktor von selbst.

### 3.5 Ausstattung – Kacheln `m` und die Datei im Format von `ausstattung.json`

Das Werkzeug des Straßen-Chats (`viz3/extra/strassen/daten.py` auf `feat/strassen`) läuft **unverändert**: `moebel.py` lädt
seinen Quelltext als Modul (er liegt nicht auf diesem Zweig und wird nicht kopiert), füllt seine Klassen `Net`, `Places` und
`Osm` mit Suhls Straßen, Orten und OSM-Daten und ruft seine Funktionen `guard_rails`, `delineators`, `signs`, `lamps`, `power`.
Alles steht dadurch neben Suhls Fahrbahnen, nach denselben Regeln wie in der Region. Fußgängerzone und verkehrsberuhigte
Straßen gelten dabei als Straßen, damit Laternen an ihnen stehen.

Dazu kommt, was eine Stadt hat und das Werkzeug nicht kennt:

| Liste | Inhalt | Herkunft |
|---|---|---|
| `ampeln` | `[Art (0 Fahrzeuge, 1 Fußgänger), x, y, Arme, OSM-Knoten, [Mast x, y, Richtung, …]]` – je Zufahrt ein Mast rechts der Fahrbahn | OSM `highway=traffic_signals`, `crossing=traffic_signals`; Maste nach Regel |
| `querungen` | `[Art (0 ohne Markierung, 1 markiert, 2 Zebrastreifen, 3 Ampel), x, y, Richtung der Straße, halbe Breite, Leitstreifen, Insel, OSM-Knoten]` | OSM `highway=crossing` – jede, nicht nur Zebrastreifen |
| `halte` | `[x, y, Richtung, Name, Wartehalle, Bank, Name steht im Fahrplan, IFOPT, OSM-Knoten]` | OSM `highway=bus_stop` |
| `namen` | `[x, y, Name 1, Richtung 1, Name 2, Richtung 2]` – ein Pfosten an der Ecke, wo zwei Straßen mit verschiedenen Namen sich treffen | nach Regel, nur in Stadt und Dorf |

Die Listen des Werkzeugs heißen wie dort: `pfosten`, `planken`, `schilder`, `lampen`, `masten`, `linien`. In den Kacheln trägt
jeder Mast die Lage der nächsten Maste seiner Leitung (eine Kachel braucht keine andere). Lagen in dm relativ zu `o`, Richtungen
in Grad im Uhrzeigersinn von Nord, keine Höhen – alles steht auf dem Boden des Augenblicks.

**Zu den Haltestellen:** `tools/suhl/out/bestand/oepnv.json` enthält keine Lagen, nur Zählungen und die Namen im Zentrum. Deshalb
kommen Lage und Name aus OSM; das Feld „steht im Fahrplan“ gilt nur für die Namen, die Stufe 1 aufgehoben hat. Der Abgleich mit
den Haltestellen des Fahrplans (über IFOPT) gehört zum Bus-Paket.

**Nach Regel und nicht vermessen** sind: Laternen an Straßen ohne OSM-Laterne (alle 36 m, eine Seite), Leitpfosten, ein Teil der
Schilder, die Maste der Ampeln, die Straßennamensschilder.

### 3.6 Wasser und Bahn

- **Gewässer** haben kein geglättetes Straßenprofil – sie laufen bergab. Je Bach: das Gelände entlang der Linie, über 40 m
  geglättet, um die Tiefe des Betts gesenkt (Fluss 0,9 m, Bach 0,5 m), mindestens 1 m unter jeder Straße und jedem Gleis, das er
  kreuzt, dann monoton fallend in Fließrichtung – auch über die Nahtstellen der OSM-Wege und an Mündungen. Verrohrte und
  überdeckte Stücke tragen Merker 2. Teiche liegen eben am unteren Rand ihres Ufers. Auf dem 30-m-Gelände ist das ein
  glaubhaftes Bett, kein vermessenes.
- **Gleise** sind Wege desselben Netzes (Art `rail`, Wellenlänge 600 m). So hat ein Bahnübergang eine Höhe für Straße und
  Gleis, und eine Straßenbrücke hält Abstand zum Gleis darunter. Die Eisenbahnbrücken über die Talstraße tragen Merker 1.

### 3.7 Die zwei Routen und die Anfahrt

`routen.py` rechnet die Routen Garten → Markt Suhl und zurück neu aus dem heutigen OSM (Dijkstra nach Fahrzeit, Graph und
Geschwindigkeiten wie im ersten Versuch `feat/suhl-fahrt`). **Autobahntunnel sind gesperrt.** Die Autobahn-Route führt über die
Anschlussstelle 2 „Suhl-Zentrum“ der A 73 – das geht: Die schnellste Route ohne Tunnel nimmt von selbst diese Ausfahrt. Der
Tunnel Berg Bock (A 71) wird nicht gebraucht. Zahlen in Abschnitt 4.2.

**Die Anfahrt** sind die Fahrstraßen an beiden Routen außerhalb der Stadt-Kacheln (Kacheln im Abstand von 300 m), ohne das
2,4-km-Quadrat am Garten und ohne das, was schon in `fahrt/strassen.json` steht. Sie werden **in einer Rechnung mit der Stadt**
gelöst – an der Stadtgrenze gibt es keine Stufe – und an den Profilen von `fahrt/strassen.json` gehalten, wo sie diese berühren.
Ergebnis: `fahrt/suhl-anfahrt.json` (gleiches Format, mit `routes`), dieselben Stücke stehen auch in den `s`-Kacheln des
Korridors (`index.json` → `korridor`). Ortstafeln, Wegweiser und die blauen Autobahnschilder des ersten Versuchs sind noch nicht
neu gerechnet (`signs` ist leer).

## 4 Zahlen

Jede Zahl hier schreibt `tools/suhl/strassen/zahlen_md.py` aus den Dateien des Laufs zwischen die Marken.

### 4.1 Probesatz Zentrum

<!-- zahlen:probe -->
Aus `tools/suhl/out/strassen/probe/zahlen.json` (Lauf vom 2026-11-13 01:28 UTC, OSM-Stand 2026-11-12 23:07 UTC, 11 Kacheln). Längen sind echte Meter (UTM).

**Gerechnet auf:** ungeschnittene Geländekacheln von suhl-boden (DGM1 Thüringen (1 m) unter 100 % der Kacheln des Laufs, sonst Copernicus GLO-30; Stand 2026-11-13T01:10:23Z, origin/suhl/boden d262745d, tools/suhl/out/boden/probe/roh/v1/t; 737194 Stützwerte) und eigene Abtastung von Copernicus GLO-30 (30 m, Wald um 9.3 m abgesenkt; 96179 Stützwerte – nur am Rand außerhalb der Kacheln). Der Lauf zählt (ein Boden für alle).

| Art in den Fahrtdaten | km | OSM-Wege |
|---|---:|---:|
| `foot` | 21,72 | 518 |
| `street` | 17,83 | 252 |
| `service` | 17,11 | 339 |
| `path` | 7,50 | 94 |
| `main` | 5,05 | 68 |
| `track` | 2,20 | 19 |
| `lane` | 1,72 | 25 |
| `county` | 0,01 | 1 |
| **zusammen** | **73,1** | **1 316** |

Flächen: 9 Fußgängerflächen und Plätze mit 21 689 m²; 144 Parkplätze mit 84 146 m². Brückenstücke: 19, Tunnelstücke: 23. Fahrbahnen an Häusern: 99 verschmälert, 26 führen in ein Gebäude.

Bahn: in Betrieb 2,19 km, auf Brücken 0,20 km, in Betrieb, Nebengleis 0,99 km, stillgelegt, Nebengleis 0,55 km, stillgelegt 0,46 km; 1 × Bahnhof, 2 × Fußgänger-Übergang.
Wasser: stream 2,64 km, verrohrt oder überdeckt 0,94 km; 12 Wasserflächen mit 9 049 m². Mit Namen: Lauter 1,67 km, Hasel 0,94 km, Steinbach 0,03 km.

| Art (Regel der Region) | km | Wellen je km vorher → nachher | Steigungswechsel je 10 m in % | größte Steigung nachher | Grenze | eingehalten |
|---|---:|---|---|---:|---|---|
| `main` | 7,0 | 3,3 → **0,3** | 1,90 → 0,14 | 14,6 % | 2 / 0,5 | ja |
| `county` | 0,1 | 0,0 → **0,0** | 0,42 → 0,23 | 1,9 % | 3 / 0,7 | ja |
| `street` | 38,2 | 7,5 → **1,4** | 2,14 → 0,66 | 25,1 % | 4 / 1,0 | ja |
| `lane` | 2,5 | 6,1 → **1,6** | 1,78 → 0,72 | 27,6 % | 4 / 1,0 | ja |
| `service` | 25,8 | 14,1 → **2,8** | 2,35 → 0,92 | 44,3 % | 5 / 1,2 | ja |
| `track` | 9,8 | 17,9 → **3,6** | 4,15 → 1,40 | 37,4 % | 6 / 1,5 | ja |
| `path` | 15,6 | 21,3 → **6,6** | 4,95 → 2,52 | 56,5 % | – | – |
| `foot` | 24,7 | 12,3 → **4,8** | 2,19 → 1,35 | 44,2 % | – | – |
| `rail` | 13,5 | 11,9 → **0,0** | 2,95 → 0,10 | 10,3 % | – | – |

Kreuzungen (Knoten mit drei und mehr Armen; größte Abweichung von einer Ebene, 3 m um den Knoten): 1 735 Knoten, Mitte 0,3 cm, 95 % unter 4,0 cm, größte 37,8 cm; **92,1 % innerhalb von 3 cm** (Kreuzungen von Fahrstraßen: 851 Knoten, 91,2 %).
Brücken über anderen Wegen: 24 Stellen, an 8 davon weniger als 4,5 m Abstand.
Rechnung: 90 927 Punkte; 608 Nahtstellen geglättet, 4 587 Zeilen für ebene Kreuzungen, 957 Verbindungen zwischen Richtungsfahrbahnen; Brücken bis 1,34 m angehoben; Glättung der kleinen Klassen × 1,0. Größe: Kacheln 316 kB, Datei im Format der Fahrtdaten 277 kB.

**Ausstattung** (`tools/suhl/out/strassen/probe/moebel.json`): 28 Verkehrszeichen, 534 Laternen, 17 Halt-, Wartelinien und Zebrastreifen, 54 Ampelknoten, 50 Querungen, 23 Bushaltestellen, 72 Straßennamensschilder. Schutzplanken 0,0 km. Zeichen nach Nummer: 274: 1, 206: 2, 205: 19, 350: 6. Ampeln: 33 für Fahrzeuge, 21 für Fußgänger, 73 Masten. Querungen: 25 ohne Markierung, 1 markiert, 3 Zebrastreifen, 21 Ampel. Haltestellen mit Namen: 23. Orte: Suhl (town). Größe: Kacheln 79 kB, eine Datei 39 kB.

**Prüfungen** (`tools/suhl/out/strassen/probe/pruefung.json`):

| Prüfung | Ergebnis | bestanden |
|---|---|---|
| Zählung `zentrum` gegen Stufe 1 | 34,8 km hier, 34,8 km in Stufe 1 (-0,12 %) | ja |
| kein Gebäude in einer Fahrbahn (Grenze 0,3 m) | 7 Treffer an 6 von 631 Straßenstücken, 7 von 1 461 Gebäuden (OSM); 22 Wege führen in ein Gebäude und sind so gemerkt | **nein** |
| Kreuzungen eben (±3 cm) | 91,2 % der Fahrstraßen-Kreuzungen, 95 % unter 4,2 cm | **nein** |
| Profile je Klasse in den Grenzen | 6 von 6 Klassen | ja |
| Brücken mit 4,5 m Abstand zum Weg darunter | 8 von 24 Stellen darunter | **nein** |
| Kachelkanten: gleiche Punkte, gleiche Höhe | 169 Übergänge, 0 mit mehr als 0,1 m Abstand, 0 mit ungleicher Höhe | ja |

<!-- /zahlen:probe -->

### 4.2 Ganze Stadt und Anfahrt

Lauf des Workflows „Suhl – Straßen (ganze Stadt)“; die Nummer steht in `tools/suhl/out/strassen/stadt/lauf.txt`.

<!-- zahlen:stadt -->
Aus `tools/suhl/out/strassen/stadt/zahlen.json` (Lauf vom 2026-11-13 01:22 UTC, OSM-Stand 2026-11-13 01:20 UTC, 1129 Kacheln). Längen sind echte Meter (UTM).

**Gerechnet auf:** ungeschnittene Geländekacheln von suhl-boden (Copernicus DEM GLO-30 (Oberflächenmodell 30 m) mit abgesenktem Wald (ESA WorldCover); DGM1 Thüringen noch nicht verfügbar; Stand 2026-11-13T01:12:29Z, suhl-boden Lauf 43340569202, Artefakt suhl-boden-v1; 9800808 Stützwerte) und eigene Abtastung von Copernicus GLO-30 (30 m, Wald um 9.3 m abgesenkt; 78270 Stützwerte – nur am Rand außerhalb der Kacheln); kleine Klassen 1.3-fach länger geglättet. Der Lauf zählt (ein Boden für alle).

| Art in den Fahrtdaten | km | OSM-Wege |
|---|---:|---:|
| `track` | 784,39 | 1 997 |
| `path` | 337,03 | 1 464 |
| `service` | 223,09 | 3 049 |
| `street` | 174,02 | 1 136 |
| `foot` | 76,35 | 1 501 |
| `main` | 73,35 | 427 |
| `motorway` | 58,13 | 227 |
| `lane` | 24,61 | 172 |
| `county` | 22,41 | 130 |
| **zusammen** | **1 773,4** | **10 103** |

Davon **Anfahrt** (Fahrstraßen an den zwei Routen außerhalb der Stadt-Kacheln): 116 Kacheln, 229 Stücke, 40,9 km (`motorway` 14,9, `street` 10,8, `main` 7,5, `service` 6,1, `lane` 1,4, `county` 0,2); 3 Punkte am Profil von `fahrt/strassen.json` gehalten.

Flächen: 13 Fußgängerflächen und Plätze mit 30 489 m²; 542 Parkplätze mit 464 684 m²; 8 Bahn- und Bussteige mit 2 994 m². Brückenstücke: 177, Tunnelstücke: 49. Fahrbahnen an Häusern: 474 verschmälert, 50 führen in ein Gebäude.

Bahn: in Betrieb, Nebengleis 2,96 km, in Betrieb 26,63 km, auf Brücken 0,54 km, im Tunnel 0,92 km, stillgelegt, Nebengleis 1,98 km, stillgelegt 8,38 km; 4 × Bahnhof, 20 × Bahnübergang, 13 × Fußgänger-Übergang, 3 × Haltepunkt.
Wasser: stream 168,14 km, river 17,11 km, verrohrt oder überdeckt 10,24 km, ditch 8,31 km, drain 0,32 km, canal 0,30 km; 370 Wasserflächen mit 191 595 m². Mit Namen: Nahe 12,24 km, Hasel 11,04 km, Vesser 7,52 km, Lauter 7,44 km, Wilde Gera 6,50 km, Erle 6,33 km, Freibach 5,56 km, Zahme Gera 4,43 km.

| Art (Regel der Region) | km | Wellen je km vorher → nachher | Steigungswechsel je 10 m in % | größte Steigung nachher | Grenze | eingehalten |
|---|---:|---|---|---:|---|---|
| `motorway` | 43,0 | 14,1 → **0,0** | 2,40 → 0,19 | 12,2 % | 1 / 0,3 | ja |
| `main` | 79,7 | 16,2 → **0,4** | 3,08 → 0,37 | 20,7 % | 2 / 0,5 | ja |
| `county` | 25,5 | 15,3 → **1,2** | 2,99 → 0,49 | 21,8 % | 3 / 0,7 | ja |
| `street` | 165,9 | 15,8 → **2,2** | 3,21 → 0,80 | 33,0 % | 4 / 1,0 | ja |
| `lane` | 22,5 | 15,3 → **2,6** | 3,03 → 0,73 | 33,6 % | 4 / 1,0 | ja |
| `service` | 176,4 | 17,9 → **4,4** | 3,69 → 1,16 | 45,5 % | 5 / 1,2 | ja |
| `track` | 1 050,1 | 13,6 → **3,9** | 3,62 → 1,26 | 47,6 % | 6 / 1,5 | ja |
| `path` | 382,4 | 11,8 → **6,5** | 3,95 → 2,46 | 69,7 % | – | – |
| `foot` | 55,6 | 18,9 → **9,9** | 3,55 → 2,21 | 52,8 % | – | – |
| `rail` | 48,1 | 15,7 → **0,0** | 3,07 → 0,11 | 15,4 % | – | – |

Kreuzungen (Knoten mit drei und mehr Armen; größte Abweichung von einer Ebene, 3 m um den Knoten): 9 386 Knoten, Mitte 0,6 cm, 95 % unter 8,9 cm, größte 57,9 cm; **85,4 % innerhalb von 3 cm** (Kreuzungen von Fahrstraßen: 3 943 Knoten, 86,7 %).
Brücken über anderen Wegen: 177 Stellen, an 75 davon weniger als 4,5 m Abstand.
Rechnung: 1 146 501 Punkte; 2 679 Nahtstellen geglättet, 22 416 Zeilen für ebene Kreuzungen, 1 832 Verbindungen zwischen Richtungsfahrbahnen; Brücken bis 3,00 m angehoben; Glättung der kleinen Klassen × 1,3. Größe: Kacheln 4 685 kB, Datei im Format der Fahrtdaten 4 223 kB.

**Ausstattung** (`tools/suhl/out/strassen/stadt/moebel.json`): 3 413 Leitpfosten, 403 Schutzplanken-Stücke, 603 Verkehrszeichen, 5 237 Laternen, 151 Halt-, Wartelinien und Zebrastreifen, 358 Strommasten, 180 Ampelknoten, 191 Querungen, 249 Bushaltestellen, 416 Straßennamensschilder. Schutzplanken 77,8 km. Zeichen nach Nummer: 274: 90, 278: 33, 274.1: 1, 205: 219, 206: 8, 301: 22, 205+215: 3, 201: 8, 350: 12, km: 98, 625: 110. Ampeln: 112 für Fahrzeuge, 68 für Fußgänger, 294 Masten. Querungen: 88 ohne Markierung, 24 markiert, 7 Zebrastreifen, 72 Ampel. Haltestellen mit Namen: 249. Orte: Suhl (town), Albrechts (village), Dietzhausen (village), Gehlberg (village), Goldlauter (village), Heidersbach (village), Mäbendorf (village), Schmiedefeld am Rennsteig (village), Vesser (village), Wichtshausen (village). Größe: Kacheln 829 kB, eine Datei 816 kB.

**Routen** (`tools/suhl/out/strassen/stadt/routen.json`, OSM-Stand 2026-11-13):

| Route | Länge (echt) | Modellmeter | Fahrzeit | davon Autobahn | Verlauf | Tunnel |
|---|---:|---:|---:|---:|---|---|
| Landstraße hin | 18,38 km | 18 099 | 19,9 min | 0,0 km | L 3004 2,8 → L 3247 0,4 → Am Sättel 1,3 → Kilianstraße 0,3 → K 517 0,5 → L 3247 11,5 | – |
| Landstraße zurück | 18,55 km | 18 258 | 20,2 min | 0,0 km | L 3247 3,7 → L 3247 7,7 → K 517 0,5 → Kilianstraße 0,3 → Am Sättel 1,3 → L 3247 0,4 → L 3004 2,8 | – |
| Autobahn hin, über die Anschlussstelle Suhl-Zentrum | 19,70 km | 19 392 | 15,4 min | 12,3 km | L 3004 2,8 → A 73 11,4 → motorway_link 0,7 → L 3140 1,5 → An der Hasel 0,4 → Am Bahndamm 0,4 → L 3247 0,3 | An der Hasel |
| Autobahn hin, frei gerechnet (Autobahntunnel gesperrt) | 19,70 km | 19 392 | 15,4 min | 12,3 km | L 3004 2,8 → A 73 11,4 → motorway_link 0,7 → L 3140 1,5 → An der Hasel 0,4 → Am Bahndamm 0,4 → L 3247 0,3 | An der Hasel |
| Autobahn zurück, frei gerechnet | 18,45 km | 18 168 | 17,2 min | 9,0 km | L 3247 3,7 → L 3247 1,1 → motorway_link 1,1 → A 73 7,5 → motorway_link 0,4 → L 3004 2,8 | – |

Erster Versuch vom 26.10.: Autobahn 28 439 Modellmeter durch den Tunnel Berg Bock; Landstraße 18 875 Modellmeter.

**Prüfungen** (`tools/suhl/out/strassen/stadt/pruefung.json`):

| Prüfung | Ergebnis | bestanden |
|---|---|---|
| Zählung `zentrum` gegen Stufe 1 | 34,8 km hier, 34,8 km in Stufe 1 (-0,12 %) | ja |
| Zählung `kernstadt` gegen Stufe 1 | 513,2 km hier, 513,2 km in Stufe 1 (-0,01 %) | ja |
| Zählung `stadt` gegen Stufe 1 | 1 559,1 km hier, 1 559,1 km in Stufe 1 (-0,00 %) | ja |
| kein Gebäude in einer Fahrbahn (Grenze 0,3 m) | 80 Treffer an 73 von 4 884 Straßenstücken, 76 von 23 809 Gebäuden (OSM); 45 Wege führen in ein Gebäude und sind so gemerkt | **nein** |
| Kreuzungen eben (±3 cm) | 86,7 % der Fahrstraßen-Kreuzungen, 95 % unter 7,5 cm | **nein** |
| Profile je Klasse in den Grenzen | 7 von 7 Klassen | ja |
| Brücken mit 4,5 m Abstand zum Weg darunter | 75 von 177 Stellen darunter | **nein** |
| Kachelkanten: gleiche Punkte, gleiche Höhe | 5 458 Übergänge, 0 mit mehr als 0,1 m Abstand, 0 mit ungleicher Höhe | ja |

<!-- /zahlen:stadt -->

**Was die Prüfungen sagen:**

- Die Zählung stimmt mit Stufe 1 überein – es fehlt kein Weg.
- **Gebäude in der Fahrbahn:** Was bleibt, sind Wege mit einer OSM-Breite, die nicht passt, und Achsen, die dicht an einer Wand
  gezeichnet sind. Geprüft wird gegen OSM-Gebäude; die Grundrisse von `suhl-gebaeude` (Kataster) folgen.
- **Kreuzungen** sind noch nicht überall auf 3 cm eben. Auf 1-m-Gelände sind es im Zentrum gut neun von zehn.
- **Brücken:** Auf dem 30-m-Gelände fehlt an vielen Brücken der Abstand zum Weg darunter, weil das Modell keine Brücken kennt.
  Auf 1-m-Gelände bleiben im Zentrum zwei Eisenbahnbrücken knapp unter 4,5 m und ein Fußgängersteg mit Treppe. Eine eigene Regel
  dafür fehlt noch.

## 5 Der Straßen-Chat: was sein System für Suhl tut

Antwort des Straßen-Chats vom 13.11., 2:00 Uhr (`docs/PARALLEL.md` auf `src`). Er baut alles Folgende selbst als Runde 2 auf
`feat/strassen`. Suhls Dateien sind schon so, wie er sie braucht.

| Punkt | Antwort | Was Suhl dafür liefert |
|---|---|---|
| F1 Daten zur Laufzeit | `FAHRT.add(name, json, opts)` und `FAHRT.drop(name)`; `opts.carve: false` = kein Zurechtschneiden des Bodens | je Kachel oder Gebiet eine Datei im Format der Fahrtdaten |
| F2 Dichte | gemessen: 6 800 Teilstücke im Fenster brauchen 116 ms, in Scheiben knapp 50 Bilder; das trägt. Fußwege und Pfade sollen hinein, Treppen nicht | alle Arten, Treppen mit Bit 128 |
| F3 Format | stabil; Reihenfolge der Arten und Beläge fest | – |
| F4 Brücken, Tunnel | bleiben aus der Karte; das Deck trägt Linien; liegen zwei Wege übereinander, braucht der obere das Brücken-Bit | Bit 1 und 2 aus OSM |
| W1 ohne Bord | Bit 64 wird Art 9 in der Karte: kein Bord, keine Rinne, kein Gehweg, keine Linie | Fußgängerzone und verkehrsberuhigt als `street` mit Bit 64 |
| W2 Flächen | `areas` wird als Art 9 gerastert | `areas` mit Belag, Ring, Löchern |
| W3 Gehweg je Seite | die Seite ohne Gehweg bekommt den Stil „Dorf“ | Bits 256, 512 |
| W4 Mittellinie | keine bei Kreisverkehr und bei Einbahnstraßen mit einer oder ohne Spurangabe | Bits 32, 4 und `lanes` |
| W5 Werkzeug | `daten.py --fahrt <Datei> --osm <OPL-Datei> --out <Datei>` | bis dahin ruft `moebel.py` die Funktionen einzeln |
| W6 Ausstattung zur Laufzeit | `STRDAT.add(name, json)` und `STRDAT.drop(name)`; `FAHRT.add` reicht `orte` weiter | `orte` in jeder Fahrt-Datei, die Ausstattung als eine Datei und in `m`-Kacheln |

**Was auch danach bei Suhl bleibt** (Stufe 3, Paket S3-5): Ampeln, die schalten; Treppen und Stützmauern; echte Bordkanten,
Haltebuchten und Fahrstreifen im Zentrum; Tunnelröhren; mehrere Ebenen ohne Brücken-Angabe.

## 6 Noch einmal laufen lassen

```
# Probesatz (Chat-Rechner; OSM aus dem Vorrat der Stufe 1, Gelände von suhl/boden):
git fetch --depth 30 origin suhl/boden && git archive FETCH_HEAD tools/suhl/out/boden/probe/roh/v1 | tar -x -C /tmp/boden
python3 -I tools/suhl/strassen/lauf.py --gebiet probe --tiles /tmp/boden/tools/suhl/out/boden/probe/roh/v1/t \
    --tiles-from "origin/suhl/boden <Commit>" --out tools/suhl/out/strassen/probe
git show origin/feat/strassen:viz3/extra/strassen/daten.py > /tmp/daten.py     # nach: git fetch --depth 1 origin feat/strassen
python3 -I tools/suhl/strassen/moebel.py --daten /tmp/daten.py --out tools/suhl/out/strassen/probe
python3 -I tools/suhl/strassen/pruefen.py --out tools/suhl/out/strassen/probe
python3 -I tools/suhl/strassen/zahlen_md.py probe tools/suhl/out/strassen/probe

# Ganze Stadt (GitHub Actions): in tools/suhl/strassen/lauf.txt die Zeilen
#   boden_run=<Laufnummer von suhl-boden>   boden_artifact=suhl-boden-roh
# eintragen und pushen. Danach: git pull, python3 -I tools/suhl/strassen/zahlen_md.py stadt tools/suhl/out/strassen/stadt
```

| Skript in `tools/suhl/strassen/` | Tut |
|---|---|
| `lauf.py` | ein Lauf: Netz, Profile, Flächen, Gleise, Wasser → Kacheln `s`, Dateien im Format der Fahrtdaten, `zahlen.json` |
| `netz.py` | OSM → Wege mit Merkern, die Ausgleichsrechnung, Orte, Flächen, Schneiden an Kachelkanten |
| `hoehen.py` | die Höhenquelle: Geländekacheln von `suhl-boden`, am Rand Copernicus mit dessen Versatz |
| `linien.py` | Gewässer |
| `moebel.py` | Ausstattung über das Werkzeug des Straßen-Chats, dazu Ampeln, Querungen, Haltestellen, Straßennamen → Kacheln `m` |
| `routen.py` | die Routen Garten – Suhl |
| `pruefen.py` | die Prüfungen → `pruefung.json` |
| `profil.py` | die Profile für `suhl-boden` (`profil.load`) |
| `zahlen_md.py` | schreibt die Zahlen in dieses Dokument |
| `fenster.py`, `bild.py`, `sslib.py` | Zahlen zu Abschnitt 2; ein Bild zum Ansehen (nie im Zweig); Helfer |

Der Workflow `.github/workflows/suhl-strassen.yml` läuft nur auf `suhl/strassen` und nur, wenn er selbst oder `lauf.txt` sich
ändert. Er holt OSM aus dem Geofabrik-Auszug Thüringen (mit osmium geschnitten, im Cache höchstens eine Woche alt), das Gelände
aus dem bestellten Lauf von `suhl-boden`, rechnet Routen, Stadt und Anfahrt, Ausstattung, Prüfungen (zusammen etwa drei Minuten)
und legt die Kacheln als Artefakt ab. Fehlt `DATEN_TOKEN` oder die Aktion `suhl-publish`, sagt er das und veröffentlicht nichts.

## Quellen und Nennung

- Straßen, Wege, Plätze, Gewässer, Bahn, Ampeln, Laternen, Haltestellen, Gebäude der Prüfung: © OpenStreetMap-Mitwirkende, ODbL 1.0.
  Probesatz: OSM-API, Stand 12.11.2026; ganze Stadt: Geofabrik-Auszug Thüringen (`osm-stand.txt`).
- Haltestellennamen des Fahrplans: DELFI e.V. über gtfs.de, CC BY 4.0 (`tools/suhl/out/bestand/oepnv.json`).
- Höhen: Geländekacheln von `suhl-boden` – DGM1 Thüringen „© GDI-Th“, CC BY 4.0, bezogen über easygeodata.de; Copernicus DEM GLO-30
  (© DLR e.V. 2010–2014 und © Airbus Defence and Space GmbH 2014–2018, bereitgestellt unter COPERNICUS durch die Europäische
  Union und ESA); Kronenabzug mit ESA WorldCover 2021 (CC BY 4.0).
- Regeln der Ausstattung: Werkzeug des Straßen-Chats (`viz3/extra/strassen/daten.py`).

## Für den Suhl-Chat

**Erledigt mit dem Straßen-Chat:** F1–F4 und W1–W6 sind beantwortet (Abschnitt 5). Suhls Dateien sind danach ausgerichtet.
Was `FAHRT.add` für Suhls Daten können sollte, steht in meiner Nachricht vom 13.11., 2:25 Uhr: viele kleine Aufrufe je Kachel;
Stücke eines Wegs aus mehreren Kacheln (`s0`, `ids`); Lagen relativ zu `o`; Höhen wie geliefert; `orte` und `places` kommen mit
jeder Datei wieder; `routes` der Anfahrt auf die kleine Karte.

**Noch offen, kleine Wünsche an den Straßen-Chat:**

- `s0` beim Rastern als Startwert der Strecke entlang des Wegs nehmen, damit Strichfolgen an Kachelkanten nicht springen.
- Sagen, ob `FAHRT.add` Lagen relativ zu `o` annimmt oder ob `suhl-laufzeit` vorher umrechnet.

**An die anderen Suhl-Pakete**

- `suhl-boden`: Reihenfolge und Dateien stehen in 3.4. Bitte Gleise noch nicht in den Boden schneiden (ihr Abstand zum 1-m-Gelände
  ist groß: Dämme und Brücken, die OSM-Achse liegt oft ein paar Meter daneben). Flächen auf 1-m-Gelände nicht einebnen.
- `suhl-daten`: Die Kacheln `m` schreibt dieses Paket (Entscheidung 1:58 Uhr) – bitte den Besitzer in `suhllib.PRODUCTS` ändern.
  Ein Prüfer für die Felder von `s` und `m` fehlt noch; die Feldnamen stehen in den `index.json`.
- `suhl-laufzeit`: `home` in `areas` und `wareas` sagt, in welcher Kachel eine Fläche zu zeichnen ist. Für `FAHRT.add` taugt
  jede Kachel nicht direkt (Lagen relativ zu `o`), wohl aber `fahrt/suhl-zentrum.json`.
- `suhl-gebaeude`: Bit 32768 nennt die Wege, die in ein Gebäude führen (Parkhäuser, Durchfahrten) – dort braucht das Haus eine
  Öffnung. Die Prüfung „kein Haus in der Fahrbahn“ läuft bisher gegen OSM-Gebäude; sagt mir, wo eure Grundrisse liegen.

**Nächste Schritte dieses Pakets**

1. Die ganze Stadt auf 1-m-Gelände neu rechnen, sobald `suhl-boden` den Lauf mit dem Artefakt `suhl-boden-roh` nennt (eine Zeile
   in `lauf.txt`).
2. Mit 1-m-Gelände die OSM-Achsen auf die Fahrbahn schieben (`roads.fit_axis`, wie in der Region) und kürzere Wellenlängen für
   Stadtstraßen prüfen – der Abstand der Profile zum echten Boden sinkt dann weiter.
3. Eine eigene Regel für Brücken ohne Abstand (Fußgängerstege, Eisenbahnbrücken) und für Wege auf mehreren Ebenen.
4. Schilder der Anfahrt neu rechnen (Ortstafeln, Wegweiser, Autobahnschilder aus dem ersten Versuch).
5. Haltestellen mit dem Fahrplan verbinden (IFOPT), zusammen mit dem Bus-Paket.
