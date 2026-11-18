# Fotorealismus – Bildqualität Schritt für Schritt

Auftrag von Falko (18.11.2026, „Projektauftrag: Fotorealismus-Upgrade“): das Modell konsequent in Richtung Fotorealismus entwickeln –
im Browser, mit three.js, flüssig auch auf schwachen Geräten; zuerst den Bestand analysieren, die zehn größten Schwächen benennen, dann
die wirkungsvollsten Verbesserungen direkt einbauen, jede mit erkennbarem Nutzen, an festen Blickpunkten vorher/nachher verglichen.
Seit 18.11. 11:13 gehört auch der **Bewuchs in 3D** zu diesem Chat (übernommen vom Straßen-Chat, `docs/features/bewuchs.md`).

Zweig `feat/fotorealismus`, Sitzung session_01L6Yrpe4euXqyTbnuvdamYz. Module `viz3/src/foto/`, Tests `viz3/test/fotorealismus.py`,
`viz3/test/fotoref.py`, Blickpunkte `viz3/extra/fotorealismus/views.json`.

## Bestand (Phase A)

Die Pipeline war schon weit: AgX-Tonemapping, EffectComposer (Bild → N8AO → Ausgabe → Farbkorrektur → SMAA), Bewegungsbilder in
kleinerer Auflösung (`MOTION`), drei Stufen (`hoch`/`mittel`/`schnell`, beim Start gemessen), Himmelsfotos und vorgefilterte HDRIs nach
Sonnenhöhe gemischt (`DN`), gebackenes Streulicht und Himmelssichtbarkeit am Pavillon (`patchSV`), PBR-Materialien, Bewuchs in
Detailstufen, kleine Dinge in der Ferne ausgeblendet (`CULL`), ein Bild nur bei Bedarf (`markDirty`). Ersetzt wurde davon nichts.

## Die zehn größten Schwächen (Stand 18.11. früh) und was daraus wurde

| # | Schwäche | Stand |
|---|---|---|
| 1 | Sonnenschatten nur im Kasten ±16 m um die Spielfigur: Bäume ab 30 m, das ganze Dorf und die Landschaft schattenlos; das echte Gelände, Häuser und Bäume der Welt warfen und empfingen nichts | **erledigt** – Schatten in drei Zonen (unten) |
| 2 | Tiefe Sonne: ferne Wälder leuchteten blass-cremefarben, egal aus welcher Richtung; die tiefe Sonne schien in jedes Tal, Felder spiegelten sie wie ein See | **erledigt** – Kronen-Licht der fernen Bäume, lange Schatten mit 1, seit V19e **Hügelschatten** und kein Spiegel mehr auf dem Land (unten); offen: Laub in der tiefen Sonne (cremefarben), die Lichtstimmung selbst |
| 3 | Luft: eine Dunstfarbe ringsum, gleiche Dichte in jeder Höhe | **erledigt** – Dunst nach Höhe und Sonnenrichtung (unten) |
| 4 | Blühende Wiesen von oben wie Konfetti (40 cm bis 3 m große Farbkleckse) | **erledigt** – Blüte als Tönung in Flecken (unten) |
| 5 | Äcker: dunkle Halme auf dem hellen Luftbild-Boden, nur im Ring um die Kamera; dahinter kahles Luftbild | **erledigt** – Bestand im Boden bis ~340 m, Halme passen dazu (unten) |
| 6 | Der modellierte Rasen (240 m) ist von oben eine gleichmäßig grüne Fläche | offen |
| 7 | Häuser der Welt: flache, prozedurale Fassaden, Dächer satter als das Bodenfoto | offen (Grenzland-/Suhl-Chat arbeiten an Fassaden) |
| 8 | Wasser des Stausees: glatter Spiegel ohne Wellen und Ufer | offen |
| 9 | Bäume jenseits von ~100 m sind Karten (gekreuzte Bilder) | gemildert (Licht und Schatten passen jetzt), Modell offen |
| 10 | Keine Stufe über „hoch“ für starke Rechner (Auflösung höchstens 1,5-fach, AO „Medium“) | offen – Plan unten |

## Was neu ist

### 1 Sonnenschatten in drei Zonen (`foto/schatten_glsl.js`, `foto/schatten.js`, `SCHATTEN`)

- Die Schattenkarte der Sonne wird ein **Atlas**: links wie bisher der Kasten um die Spielfigur (±16 m, 4096² auf „hoch“), rechts
  zwei Kacheln halber Größe – **fern** (±96 m) und **weit** (±640 m). Kein neues Licht, keine neue Textur, kein neues Shader-Programm:
  die Kachel-Koordinaten rechnet der Fragment-Shader aus der Schattenkoordinate, die er ohnehin hat (zwei Matrizen als gemeinsame
  Uniforms). Die Grenze von 16 Texturen je Programm bleibt eingehalten (der Boden am Pavillon steht genau bei 16).
- three's eigener Schattenpass zeichnet jede Kachel (für ein verstecktes Richtungslicht), danach wird sie in den Atlas kopiert. Eine
  Kachel entsteht neu, wenn die Sonne 1° (fern) bzw. 2° (weit) weitergewandert ist, die Figur ein Drittel des Kachelradius gegangen ist
  oder sich im Sonnenkasten etwas geändert hat – höchstens eine Kachel je Bild, nie im selben Bild wie die Karte des Kastens.
- In den Kacheln stehen Bäume in ihrer gröbsten Stufe, kleine Dinge (unter 1 m bzw. 2,5 m Radius) fehlen, in der weiten Kachel auch
  dichte Kleinbäume. Was der Kamera folgt (die Bäume des Walds an der Klinge) bleibt beim Kasten – der Wald dunkelt sein Licht jenseits
  davon selbst ab.
- **Die Welt wirft und empfängt jetzt Schatten:** das echte Gelände, Wände und Dächer des Dorfs und aller Orte (`gebaeude …`),
  die Bäume der Welt (3D-Zellen und ferne Karten mit eigenem Tiefenmaterial), die Bodenkacheln der weiten Welt (`welt …`). Andere
  Module melden eigene Dinge mit `SCHATTEN.add(mesh, { cast, receive, roof })` an.
- Am Rand des Kastens laufen die Zonen weich ineinander (kein harter Schattenabriss mehr bei 16 m – auch ohne Kacheln).
- **Schalter:** Menü → Einstellungen → Grafik → „Schatten in der Ferne“: auto – an – aus (`pav-schatten-v1`). „auto“ = an auf Rechnern
  ab Stufe „mittel“, aus auf „schnell“ und auf Telefonen/Tablets. `?kaskade=an|aus`, `?nokaskade`.

### 2 Bewuchs in der Ferne (`bewuchs/bw_ferne.js`, `BWFERNE`)

- **Blüte als Tönung statt Konfetti:** jenseits der gezeichneten Blumen (~25 m) nimmt der Boden den Anteil der Blüten als Farbton –
  mehr davon, je flacher man über die Wiese schaut (die Köpfe stehen vor dem Gras dahinter), in Flecken (hier dichter, dort dünner).
  Einzelne Tupfer (12 cm) nur noch, wo ein Bildpunkt feiner ist als sie (aus der Nähe von oben).
- **Äcker als Bestand:** auf den Feldern der Fruchtklassen zeigt der Boden die Frucht, die dort auch als Halme steht (dieselbe Wahl je
  Feld, derselbe Zufall wie bei den Halmen): die Farbe des Bestands von heute nach seiner Deckung, der Boden der Phase
  (`BWARTEN.ackerboden`) dazwischen, in den Erntetagen jedes Feld an seinem Tag gemäht. Das Hell und Dunkel des Luftbilds bleibt
  (Fahrgassen, nasse Senken). Reichweite ~340 m um die Kamera; über ~70 m Höhe behalten die Felder das Luftbild (ein Kreis aus
  Modellfarben wäre von oben zu sehen).
- **Halme der Feldfrüchte** (`bw_halm.js`): nicht mehr vom Luftbild ausgedünnt und eingefärbt (das Feld ist, was die Fruchttabelle
  sagt), von oben beleuchtet wie der Bestand im Boden, im äußeren Ring ohne dunklen Fuß – sonst standen sie als dunkle Haare darauf.
- Eine Textur für beides (512 × 1024: oben die Blüte, unten die Flächenklasse), kein zusätzlicher Sampler.

### 3 Luft (`foto/luft.js`, `LUFT`)

- Der Dunst **liegt in den Tälern**: seine Dichte fällt mit der Höhe (Skalenhöhe 450 m; am Garten bleibt sie, wie Tageszeit und
  Wetter sie setzen). Entlang eines Blicks zählt das Mittel zwischen Kamera- und Zielhöhe.
- Er **streut zur Sonne hin**: dort heller, bei tiefer Sonne auch wärmer (in der Farbe der Sonne), von ihr weg etwas dunkler – so
  stark, wie die Sonne scheint (unter geschlossener Decke gar nicht).
- In three's Nebel-Bausteinen, also für jedes Material mit Nebel und für das Ausblenden des fernen Geländes; drei gemeinsame Uniforms,
  ein Varying, keine Textur. `?noluft` lässt die Bausteine, wie sie waren; `LUFT.set({ H, on })`.

### 4 Ferne Bäume (`world/ratscher.js`, markierte Zeilen)

- Die Karten der fernen Bäume hatten eine Normale senkrecht nach oben – beleuchtet wie flacher Boden. Jetzt halb nach oben, halb zum
  Betrachter (eine Krone, von dort gesehen): von vorn beschienen leuchtet der Waldrand, gegen das Licht steht er dunkel; der untere
  Teil der Krone liegt im eigenen Schatten.

### 5 Hügel werfen Schatten (V19e: `foto/schatten_land.js` `SCHLAND`, `foto/schatten_glsl.js` `sunLand`)

- **Was fehlte:** das Gelände warf keinen Schatten. Am 1. Juni geht die Sonne um 5:10 auf – der Garten liegt aber bis 6:00 im
  Schatten der Hügel im Nordosten (die Sonne steht dann schon 6° hoch) und abends ab 20:55 (Untergang 21:19); im Winter steht die
  Mittagssonne bei 16°, ganze Hänge bleiben im Schatten. Ohne das schien die tiefe Sonne mit fast voller Stärke in jedes Tal.
- **Wie:** das Gelände ist ein Höhenfeld – sein Schatten ist je Ort eine Zahl: die Höhe, unter der das Land zur Sonne hin sie verdeckt.
  Diese „Schattenhöhe“ rechnet die CPU für 256 × 256 Zellen von 24 m (±3 km um die Spielfigur): ein Raster der Geländehöhen
  (`KERN.terrain`, ±7,7 km, in jedem Bild ein paar Dutzend Zellen aufgefrischt, schneller, wenn eine Kachel der Welt dazukommt) wird in
  Sonnenrichtung abgetastet und je Spalte einmal durchlaufen. Zwei Höhen je Zelle (oberer und unterer Sonnenrand): die Schattenkante
  ist so weich, wie die Sonne breit ist – umso weicher, je weiter der Hügel weg ist.
- **Wo es liegt:** als 256 Texel breiter Streifen rechts neben den Kacheln im Schatten-Atlas der Sonne (zwei Höhen zu 16 Bit je Texel).
  Keine neue Textur für irgendein Programm. Jedes beleuchtete Material liest ihn – auch eines, das sonst keinen Schatten empfängt
  (ferne Baumkarten, Waldbäume): im Hügelschatten liegt das ganze Tal, und die Baumwipfel darüber leuchten noch.
- **Wann:** nur bei Sonne (oder Mond) unter 19° (darüber liegt hier kein Fünfhundertstel des Lands im Hügelschatten; die Shader lesen
  das Feld dann nicht). Bei 10° ein Fünfzehntel des Lands, bei 6° ein Fünftel, bei 3° die Hälfte. Neu bei jedem Sonnenschritt (0,12°).
- Teil von „Schatten in der Ferne“ (aus auf „schnell“ und am Telefon). `?nohuegel` lässt nur die Hügelschatten weg.
- **Grenzen:** das Raster ist 24 m grob und punktweise abgetastet – schmale Böschungen und Dämme werfen nur ungefähre Schatten; Wald
  innerhalb des Quadrats von Ratscher steht nicht im Raster (seine Bäume werfen ihre Schatten in den Kacheln, also nur bis 640 m);
  jenseits von ±3 km kein Hügelschatten.

### 6 Das Land spiegelt die tiefe Sonne nicht mehr (V19e: markierte Zeilen in `world/ratscher.js`, `garden/env.js`, `welt/welt.js`, `bewuchs/bw_halm.js`)

- Gegen die tiefe Sonne glänzte jedes Feld wie ein See: eine Fläche mit Rauheit 1 wirft im Rechenmodell bei streifendem Licht noch ein
  Vielfaches ihres Streulichts als Glanz zurück – Gras und Erde tun das nicht, sie beschatten sich selbst. Der direkte Glanz der Sonne
  auf dem Land (Gelände um Ratscher, Gartenboden, Kacheln der Welt) ist auf 30 % gesenkt: es bleibt der Schimmer einer Wiese im
  Gegenlicht. Straßen und Wege behalten ihren Glanz (nasser Asphalt, Pfützen). Die Halme glitzern etwas ruhiger (60 %).

## Geänderte Shader und Render-Methoden

| Stelle | Änderung |
|---|---|
| three `shadowmap_pars_fragment`, `lights_fragment_begin` | `sunShadow()` statt `getShadow()` für Richtungslichter: Kasten, ferne und weite Kachel aus einem Atlas, weiche Übergänge (`foto/schatten_glsl.js`); Uniforms `csmM/csmN/csmP/csmQ` in `THREE.ShaderLib` (typisierte Arrays, von allen Materialien geteilt) |
| `core/assets.js` (eine Zeile) | das Muster für den Figurenschatten erkennt auch `sunShadow(` |
| three `fog_pars_vertex`, `fog_vertex`, `fog_pars_fragment`, `fog_fragment` | Dunst nach Höhe und Sonnenrichtung (`foto/luft.js`); Uniforms `luftA/luftS/luftG`, Varying `vLuft` |
| Bodenshader (`world/roads.js` `landDetail` → `bwFar`) | Blüte als Tönung, Feldfrüchte im Boden (`bewuchs/bw_ferne.js`) |
| Halme (`bewuchs/bw_halm.js`) | Feldfrüchte: Dichte/Farbe ohne Luftbild, Normale, Fuß |
| ferne Baumkarten (`world/ratscher.js`) | Normale und Eigenschatten der Krone |
| Schattenpass | zusätzlich je Kachel ein Pass von three (`R.shadowMap.render` für ein verstecktes Licht), Kopie in den Atlas mit einem kleinen Vollbild-Dreieck |
| three `shadowmap_pars_fragment`, `lights_fragment_begin` (V19e) | `sunLand()`: das Höhenfeld der Hügelschatten aus dem Streifen des Atlas, vier Texel gewichtet, für jedes beleuchtete Material (außerhalb der Abfrage `receiveShadow`); Uniforms `csmL` (Matrix), `csmH` |
| Schatten-Atlas (V19e) | 256 Texel breiter als bisher (1,5 Karten + 256); das Feld wird wie die Kacheln hineinkopiert |
| Boden: `world/ratscher.js`, `garden/env.js`, `welt/welt.js` (V19e) | `reflectedLight.directSpecular` × 0,3 außerhalb von Straßen und Pfützen |
| Halme `bewuchs/bw_halm.js` (V19e) | `reflectedLight.directSpecular` × 0,6 |

Neue Assets: **keine** (keine Texturen, keine Modelle, keine fremden Daten).

## Leistung

Gezählt mit `viz3/test/fotoref.py` (Stufe „hoch“, 1280 × 720, Wetter „klar“, 15:30 Uhr; Software-Grafik – Zeiten sagen dort nichts,
deshalb Zeichenaufrufe und Dreiecke). Vorher = V19b (`c71a27ee`), nachher = dieser Stand.

| Blickpunkt | Bild vorher: Aufrufe / Dreiecke | nachher | Schattenkarte des Kastens vorher | nachher |
|---|---|---|---|---|
| Garten gesamt (r1) | 996 / 2,14 M | 987 / 2,14 M | 81 / 89 Tsd. | 94 / 175 Tsd. |
| Pavillon nah (r2) | 869 / 1,88 M | 867 / 1,87 M | 343 / 550 Tsd. | 355 / 585 Tsd. |
| Vegetation (r3) | 390 / 1,54 M | 379 / 1,54 M | 243 / 380 Tsd. | 249 / 416 Tsd. |
| Gebäude und Landschaft, Anger (r4) | 631 / 1,33 M | 629 / 1,34 M | 54 / 29 Tsd. | 68 / 102 Tsd. |
| Bodenperspektive (r5) | 892 / 1,72 M | 884 / 1,72 M | 214 / 372 Tsd. | 218 / 407 Tsd. |
| Abendblick West (r6) | 354 / 1,05 M | 356 / 1,04 M | 367 / 503 Tsd. | 383 / 545 Tsd. |
| Feldweg (r7) | 294 / 0,86 M | 284 / 0,86 M | 56 / 22 Tsd. | 66 / 115 Tsd. |
| Tal von oben (r8) | 469 / 1,13 M | 458 / 1,13 M | 62 / 54 Tsd. | 63 / 87 Tsd. |

Das Bild selbst kostet gleich viel (dieselben Aufrufe und Dreiecke); die Schattenkarte des Kastens wächst um 33–93 Tsd. Dreiecke, weil
Häuser und Bäume der Welt jetzt hineinzeichnen. Programme: 185 statt 183 (Bauphase 0), 173 statt 170 (fertig), höchstens 16 Texturen.

- Eine Kachel kostet einmal 250–600 Tsd. Dreiecke (wie die Schattenkarte des Kastens, die schon bisher alle paar Meter neu entsteht),
  aber nur alle paar Sekunden beim Gehen bzw. alle 1–2° Sonnenlauf; im Stand keine.
- Speicher: Atlas 6144 × 4096 statt 4096² auf „hoch“ (+50 % dieser einen Karte), dazu zwei Kacheln 2048²; auf „mittel“ die Hälfte je
  Kante. Bewuchs-Textur 2 MB statt 1 MB. Auf Telefonen und auf „schnell“ bleibt die Karte, wie sie war.
- Die Budgets von `viz3/test/leistung.py` gelten unverändert.
- **Nicht gemessen:** echte Bildzeiten auf einer Grafikkarte, auf Falkos Laptop (Intel UHD 620) und am iPhone – im Chat-Rechner gibt
  es nur Software-Grafik. Deshalb ist „auto“ vorsichtig (aus auf „schnell“ und am Telefon).

**Hügelschatten (V19e):** kein Zeichnen, keine Dreiecke. Ein Feld kostet auf der CPU rund 2 ms (im Chat-Rechner gemessen, eine
Spielstunde am Morgen: 121 Felder, je Bild im Mittel 0,6 ms über drei, vier Bilder, 1 % der Schritte über 3 ms), neu bei jedem
Sonnenschritt – bei normaler Spielzeit etwa zweimal je Sekunde, in Echtzeit alle halbe Minute; über 19° Sonnenhöhe gar nicht. Das Höhenraster: einmal 0,3 s Rechenzeit, verteilt mit 1 ms je Bild (einige Sekunden nach dem
Laden), danach 0,08 ms je Bild. Im Bild: vier Texel-Abrufe je beleuchtetem Bildpunkt aus der Schattenkarte, die das Programm ohnehin
liest (nur unter 19°). Speicher: 4 MB Felder, der Atlas 256 Texel breiter (6400 × 4096 statt 6144 × 4096 auf „hoch“). Zeichenaufrufe
und Dreiecke der Blickpunkte bleiben, wie sie waren (Tabelle oben; `leistung` 15/15). Die Blickpunkte bei tiefer Sonne, V19c → V19e
(`fotoref`, Schattenkarte 2048²): Abendblick West (r6) 358 / 1,06 M → 358 / 1,06 M, Morgen im Tal (r9) 246 / 0,84 M → 239 / 0,85 M,
Sonnenaufgang von oben (r10) 193 / 0,48 M → 188 / 0,48 M; Schattenkarte des Kastens unverändert (545 / 231 / 195 Tsd. Dreiecke).

## Qualitätsstufen

Der Auftrag nennt Ultra / High / Balanced / Performance. Vorhanden: **hoch** (= High), **mittel** (= Balanced), **schnell**
(= Performance), beim Start gemessen und im Menü umschaltbar; beim Bewegen dazu eine eigene Auflösungsstufe (`MOTION`). **Ultra fehlt
noch** – geplant als eigene Stufe über „hoch“ nur für starke Grafikkarten (Bild über der Bildschirmauflösung gerechnet, AO „High“,
Detailstufen und kleine Dinge weiter hinaus, ferne Schattenkachel größer); sie braucht Eingriffe in `render/render.js`, `core/save.js`
und die Anzeige (andere Module lesen `RENDER.tier` als hoch/mittel/schnell) und einen Test auf einer echten Grafikkarte.

## Schnittstelle

- `SCHATTEN.state()` → `{ ok, on, mode, atlas, tiles: [{ name, R, texel, n, calls, tris, due }], P, land: { on, have, inAtlas, k,
  shown, n, ready, missing, field: { ms, shaded, el, az } } }`; `SCHATTEN.set({ mode, debug, land })` (`debug`: rot/grün/blau zeigt,
  welche Zone antwortet, magenta den Hügelschatten; `land: false` lässt ihn weg); `SCHATTEN.settle()` zeichnet fällige Kacheln und
  rechnet das Feld sofort (Tests, Bilder); `SCHATTEN.add(mesh, { cast, receive, roof })`.
- `SCHLAND.at(x, y)` → die zwei Schattenhöhen an einem Punkt (Tests), `SCHLAND.state()`; `?nohuegel`.
- `LUFT.state()`, `LUFT.set({ H, on })`.
- `BWFERNE.state()` → dazu `crops` (Frucht, Phase, Deckung, Erntetage), `reach`, `high`.
- Gespeichert: `pav-schatten-v1` (auto/an/aus).

## Tests und Vergleich

- `viz3/test/fotorealismus.py` (Abschnitte `schatten`, `land`, `luft`, `ferne`): gemeinsame Uniforms kommen in den Programmen an (ein
  three-Update könnte sie klonen), beide Kacheln gezeichnet und benutzt, im Budget, im Stand keine neue; mit Kacheln mehr Schatten und
  nirgends mehr Licht als ohne; Hügelschatten: das Feld gerechnet und im Atlas, um 5:45 liegen Garten und Feldweg im Schatten (das
  Bild über 5 % dunkler, nirgends heller), um 7:15 in der Sonne, nachmittags wird kein Feld gerechnet oder gelesen; der Dunst dünner
  in der Höhe; ein Feld 90 m entfernt ist im Juni grün; kein Programm über 16 Texturen.
- `viz3/test/fotoref.py`: die festen Blickpunkte (`views.json`: Garten gesamt, Pavillon nah, Vegetation, Gebäude und Landschaft,
  Bodenperspektive, Abendblick nach Westen, Feldweg, Tal von oben, seit V19e Morgen im Tal und Sonnenaufgang von oben) mit Kosten je Bild; `python3 viz3/test/fotoref.py PORT
  name=…,wetter=klar,map=4096` (`map`: Schattenkarte wie auf einer Grafikkarte). Bilder unter `out/fotoref/<name>/`.
- Vor jeder Version dazu: smoke, gpu, leistung, memphone, bewuchs, garage.

## Offen

1. **Ultra-Stufe** (oben). 2. **Tiefe Sonne, Rest:** Laub der 3D-Bäume wird in der Abendsonne cremefarben (zu hell – die Sonnenstärke
bei 8° ist in `time/daynight.js` höher als mittags, dazu die Belichtung; mit dem Kern-Chat abstimmen), Wald im Quadrat von Ratscher
als Schattenwerfer jenseits der Kacheln (Kronenhöhen ins Raster), schmale Böschungen feiner.
3. **Wasser** des Stausees (Wellen, Ufer, Spiegelung des Himmels). 4. **Rasen von oben** (Struktur, Mähspuren in der Ferne).
5. Feldfrüchte weiter als 340 m und aus der Höhe (größeres Fenster, Karten weiter laden), Fahrgassen. 6. Die übrigen offenen Punkte des
Bewuchses (`docs/features/bewuchs.md`). 7. Schatten der Detailzonen (Schleusingen, Kloster Veßra, Suhl: `SCHATTEN.add` durch ihre Module).
8. Falkos Eindruck am Laptop und am iPhone; dort „Schatten in der Ferne: an“ ausprobieren.
