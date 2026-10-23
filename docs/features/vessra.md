# Kloster Veßra – begehbar: Klosteranlage, Ort, Baumschule Kammbach

Stand 23.10.2026 (Hilfs-Agent `vessra`, Branch `feat/vessra`). Detailzone aus `claude/pavillon-welt.md`, Ziel für den Gartenplaner
(`claude/pavillon-gartenplaner.md`): zur Baumschule fahren, Pflanzen aussuchen, einladen, daheim pflanzen. Diese Runde: der Ort selbst.

## Was es gibt
- **Welt-Kacheln** für Kloster Veßra und die Straße dorthin: eigener Block, gleiche Kachelung und Pipeline wie der Testblock
  (`tools/welt/build.py --plan V`, Copernicus DEM + Luftbilder GDI-Th, Straßen eingeschnitten), veröffentlicht unter
  `welt-test/zonen/vessra/` (eigene `meta.json`) vom eigenen Workflow `.github/workflows/welt-vessra.yml` (Push auf `feat/vessra`, der
  die Pipeline-Dateien ändert, oder von Hand). Stufe 12 (100-m-Kacheln, Luftbild 20 cm/px) über 2 × 2 km um Klosteranlage und
  Baumschule, Stufen 7–11 über 8,0 × 6,4 km. Lauf 39918421150 (23.10. 9:32): 4359 Dateien, **71,8 MB**, 273 s.
- **Menü → Orte → „Kloster Veßra“**: auf den Vorplatz an der Schleusinger Straße vor dem **Torhaus** neben der Torkirche (dem Eingang
  von Klosteranlage und Museum), Blick durch die Durchfahrt zu den Türmen (`KERN.spot('vessra')`). **Startsituationen**
  `?szenario=vessra` (dort) und `?szenario=baumschule` (auf der Schulstraße vor dem Tor der Baumschule, Blick in den Verkaufshof;
  Sprungziel `KERN.spot('baumschule')` ohne Menüeintrag).
- **Nichts davon beim Start**: eine Zone des Kerns (`KERN.zone({ id: 'vessra' })`) – gebaut, wenn der Beobachter (`KERN.where()`: die
  Spielfigur, sonst die Kamera) näher als 950 m an der Ortsmitte (−8850, −300) ist, ab 1350 m wieder freigegeben (Gebäude sofort,
  Welt-Kacheln nach 20 s); Stand in `KERN.zones()`. Beim Laden der Seite meldet `welt/vessra.js` nur seinen Kachel-Satz an (ohne Abruf),
  die Sprungziele, die Startsituationen, den Aktionsknopf „Hinsetzen“ (`KERN.act`) und die `KERN`-Anbieter (Ort, Wände, frei).
- **Gelände und Boden** aus den eigenen Welt-Kacheln (Luftbild 20 cm/px nah). Das 30-m-Oberflächenmodell trägt im Ort Häuser und
  Bäume mit, die Pipeline schneidet die Straßen mit Böschungen 1:1,5 hinein – die Straße lag in einer Rinne. Neben den Autostraßen wird der
  Boden deshalb zur Straße hin abgesenkt (höchstens 10 cm + 6 % des Abstands vom Rand + etwas Krümmung über der Straße, höchstens
  2,5 m, auslaufend 20–40 m, am Zonenrand über 100 m ausgeblendet; ein Polster von `WELT` mit derselben Funktion, Kacheln, Boden des Kerns
  und Hausfüße stimmen überein). Darüber die **Straßen** (OSM, Karte 1024² über 920 m):
  Asphalt mit Bordstein auf Schleusinger, Neuhofer und Schulstraße, rötlicher Kies auf den Wegen der Klosteranlage, dem Besucherparkplatz
  und im Verkaufshof der Baumschule (neue Belagsart „Kies“ in `welt/welt.js`).
- **Ort**: 156 Gebäude aus OpenStreetMap (`tools/welt/zone_vessra.py` → `viz3/extra/vessra/dist/vessra/ort.json`, 0,15 MB) mit den
  Fassaden- und Dach-Shadern des Dorfs: Putzhäuser im Ort (weiß, creme, hellgelb, grau), die Klausur-, Domänen- und Wirtschaftsbauten aus
  rotem Sandstein, die Fachwerkhäuser des Freilichtmuseums (Bauernhaus aus Witzelroda, Schmiede, Dorfbrauhaus, Backhaus,
  Totenhofkapelle …), Ziegeldächer mit Farbe aus dem Luftbild, Brandwände ohne Fenster, Türen zur Straße.
- **Klosterkirche St. Marien** (Ruine seit dem Brand 1939; Fotos Wikimedia Commons 2017–2025, Drohnenbilder Ermell 2021, Plan des
  Klosterbezirks): die **Doppelturmfront** – heller Quaderbau mit Lisenen, zwei Rundbogenfriesen und dem gestuften Rundbogenportal
  (man geht hindurch ins Langhaus), darüber die roten Sandsteintürme mit drei Geschossen (spitzbogige Blendarkaden, Uhr am Nordturm,
  Zwillingsfenster), Pyramidendächern und Stangen, dazwischen die Galerie mit Satteldach; das **Langhaus** ohne Dach: die beiden
  Außenwände mit hohen Rundbogenfenstern, in der Südwand die Tür zum Kreuzgang, die Stümpfe der Arkadenpfeiler (die östlichsten hoch);
  die **Vierung** mit Triumphbogen und zwei Seitenbögen, die Querhausmauern mit Fenstern und dem vermauerten Chorbogen, die
  **Fundamente des Chors** mit Apsis im Gras; die **Henneberger Kapelle** (Sandstein; ihr niedrigerer quadratischer Chor, dahinter die weiß verputzte runde Apsis mit
  Kegeldach – OSM `w121648571`, `w121648565`, Drohnenbild 2021) und die
  **Südkapelle** mit ihrer Apsis. Alle Mauern als Geometrie: die Kirche aus Quadern (das Pflasterbild des Dorfplatzes dreifach vergrößert:
  Lagen von etwa 33 cm), Bruchstein (das Plattenbild) für Klostermauer und Torhaus – beides Programme, die es schon gibt. Auf den
  Mauerkronen der Ruine (Langhaus, Triumphbogenwand, Querhaus) Firste aus Ziegeln wie auf dem Drohnenbild.
- **Torhaus** als hoher Torturm nach dem Foto 2025: unten rote Sandsteinquader mit weitem Rundbogen und gewölbter Durchfahrt (man geht
  hindurch in den Klosterhof), darüber Bruchstein in Rosa und Gelb mit zwei Schlitzfenstern je Giebelseite, First längs der Durchfahrt;
  **Torkirche St. Erhard** (Kalkputz, Spitzbogenfenster, Eckquader aus Sandstein, Tür; Fotos 2019, 2022), **Klostermauer** (OSM:
  graubeiger Bruchstein mit rosa Stich, 3,2 m, bemooste Abdeckung, Fotos 2025; an den Toren Lücken mit Pfeilern), Zäune (Holz; der grüne Metallzaun der Baumschule) und Hecken, der **Friedhof**
  nördlich der Kirche (Gräber in Reihen mit Steinen und Kreuzen), die Teiche (Klosterteich, Dorfteich) als Wasserfläche.
- **Bäume**: 450 Kronen aus dem Luftbild (dunkles Grün, Abstand ≥ 6 m, nicht auf Häusern, Straßen, Wasser, in der Kirche, in der
  Baumschule; die nächsten an der Klosteranlage zuerst) und 250 Laubbäume nach Regeln auf den Wiesen der Klosteranlage und in den Gärten
  (das Luftbild vom April zeigt sie unbelaubt) – die 30 nächsten an der Kirche als Esche des Gartens (instanziert), die übrigen als
  einfache Kronen in Herbstfarben (unregelmäßig, mit zwei Nebenkronen) und Nadelbäume (ein Mesh).
- **Baumschule Kammbach** (OSM `landuse=plant_nursery`, Schulstraße 52; Name auf Schild und im HUD, Falko 23.10. 9:27, kein Logo):
  hinter dem Südtor ein Verkaufshof aus Kies, südlich des Wegs drei Parkplätze und die **Verkaufshütte** mit Theke, Kasse und Vordach,
  nördlich **fünf Beete** nach Art – Obstgehölze (Bäumchen im Container, angepfählt), Beerenobst, Ziergehölze (Herbstlaub: rot, gelb,
  panaschiert), Kletterpflanzen (am Bambus-Dreibein), Bodendecker – mit Bändchengewebe, Brettereinfassung und Schild; die Gebäude der
  Baumschule wie in OSM; westlich davon **Jungbäume in Reihen** auf dem Feld (rund 700, die Wege bleiben frei). Im Hof zwei
  Pflanzenwagen mit drei Etagen Töpfen, hinter der Hütte eine Palette Blumenerde und Stapel leerer Container. Der Hof ist eben (eine
  Ebene, höchstens 1 % Gefälle, 4 m Übergang – ebenfalls ein Polster). Schild „Baumschule Kammbach“ am Tor und an der Hütte. Ohne Fotos
  vom Gelände (nur von der Straße aus): generisch.
- **Straßenschilder**: je benannter Straße ein weißes Namensschild mit schwarzer Schrift an der Einmündung, die dem Klostertor am
  nächsten ist (6: Schleusinger Straße, Schulstraße, Gartenstraße, Fabrikstraße, Neuhofer Straße, Zwick), beidseitig lesbar.
- **Laternen** (OSM und entlang der Straßen nahe Häusern, 53): nachts an, Lichtflecken, sie beleuchten die Wände wie im Dorf, und in
  den beiden nächsten stehen geliehene Punktlichter des Pavillons (`KERN.lights.borrow`) – echtes Licht auf Boden, Ruine und Bäume;
  **Bänke** (OSM, zur Kirche gewandt; eine an der Hütte der Baumschule) – **Hinsetzen** mit dem Aktionsknopf.
- **Ortsnamen** im HUD: „Klosterkirche St. Marien (Ruine)“, die benannten Gebäude (Torkirche St. Erhard, Henneberger Kapelle, Kornhaus,
  Westklausur …), „Baumschule Kammbach“, Friedhof, Teiche, die nächste Straße („Schleusinger Straße, Kloster Veßra“), sonst
  „Klosteranlage (Hennebergisches Museum)“ bzw. „Kloster Veßra“.
- **Kollision**: alle Hauswände, die Mauern der Kirche (Tür und Bögen offen), Pfeiler, Kloster- und andere Mauern (Tore offen), Zäune,
  Hecken, Gräber, Bäume, Laternen, Beete und Hütte der Baumschule, die Teichufer.

## Für den Gartenplaner
`window.VESSRA` / `import { VESSRA } from '../welt/vessra.js'` (Modul direkt unter `welt/schleusingen.js`). `VESSRA.state === 'ready'`, wenn
gebaut; `VESSRA.baumschule` (sonst `null`):
- `name`: „Baumschule Kammbach“; `eingang`, `kasse`, `parkplatz`: `{ x, y, z, yaw }` – Modellmeter, `yaw` Blickrichtung in Grad wie
  `SCHL.rathaus.spots`, `P.yaw` und `GAME.view` (0 = Modell-Nord +y, 90 = Ost +x; Kompass ≈ yaw − 3,1°): am Tor in den Hof blickend, vor
  der Theke zur Kasse blickend, auf dem mittleren Parkplatz (ein Auto steht dort mit der Front in diese Richtung).
- `beete`: je Beet `{ x, y, w, h, yaw, art, name, slots, label }` – Mitte `[x, y]`, Länge `w` entlang `yaw` (Grad wie oben), Breite `h`
  quer dazu, `art` ∈ `'obst' | 'beeren' | 'zier' | 'kletter' | 'boden'`, `name` (Schildtext), `slots`: die Stellplätze der Töpfe
  `[[x, y], …]` (30–78 je Beet), `label`: Schild `[x, y, z]`.
- `frame`: `{ G, u, w }` – Ursprung am Südtor, `u` entlang der Schulstraße nach Norden, `w` ins Gelände (für eigene Stellen).
- `VESSRA.place(x, y)` nennt im Gelände „Baumschule Kammbach, Kloster Veßra“; `VESSRA.gz(x, y)` ist der Boden.
- Hinkommen ohne Fahrt: `KERN.scenario('baumschule').run()` bzw. `?szenario=baumschule` (vor dem Tor); gebaut ist alles, sobald
  `VESSRA.state === 'ready'` (z. B. `await KERN.until(() => VESSRA.state === 'ready', 300)`).

## Für den Kern-Chat
- Gemeinsame Dateien (auf diesem Branch geändert): `viz3/src/modules.txt` (eine Zeile `welt/vessra.js` direkt unter `# feat/vessra`),
  `viz3/shell/menu.html` (ein Eintrag Orte → „Kloster Veßra“ nach „Schleusingen“), `.github/workflows/welt-testblock.yml`: **`apply()`
  behält jetzt `welt-test/zonen/`** (beiseite, `welt-test/` ersetzen, zurück) – sonst löschte der nächste Testblock-Lauf die Zonen-Kacheln.
- `welt/welt.js` (eigene Datei): Kachel-Sätze (siehe „Für die Fahrt“), `WELT.overlay()`, Belag „Kies“ (g/r > 0,86) im Straßen-Overlay;
  Schleusingen unverändert (seine Codes 40/120/200 bleiben Asphalt/Pflaster/Platten).
- Kern-Dienste (Phase 2, Baustein 1): `KERN.zone` (`vessra`), `KERN.spot` (`vessra`, `baumschule`), `KERN.scenario` (`vessra`,
  `baumschule`), `KERN.act` (`vessra:sit`), `KERN.lights.borrow` (`vessra-laternen`: nachts zwei Lichter des Pavillons in den beiden
  Laternen, die der Spielfigur am nächsten sind, Rang 1), Anbieter `place` (20), `pushOut` (10), `free` (10). Kein `TICKS`-Eintrag,
  kein `SPOTS`-Import. Polster in `WELT` (`setPads('vessra', …)`, nur solange gebaut): Boden neben den Straßen, Hof der Baumschule.
- Neue `window`-Namen: `VESSRA`. Keine Speicher-Schlüssel. Shader-Programme: Steinmauern teilen das Programm des Dorfplatz-Pflasters
  (`v16e-kit1.5`), Requisiten und Kronen das der Schleusinger Requisiten; neu nur Schilder und Wasser (gemessen im Test).
- Eintrag für `docs/ARCHITECTURE.md` (Modulkarte, Abschnitt 6): `VESSRA` – welt/vessra.js – Kloster Veßra begehbar: Klosterkirche als
  Ruine, Klosteranlage, Ort, Baumschule Kammbach mit Beeten und Stellen für den Gartenplaner.

## Für die Fahrt (Hilfs-Agent `fahrt`)
- **Korridor**: die befahrbare OSM-Route Garten → Ratschner Anger → Geisenhöhner Weg → Flurweg → L 1625 (Schleusinger Straße) →
  Schulstraße 52 (Baumschule Kammbach), 10,1 km (Dijkstra über die Autostraßen). Westlich des Testblocks B (dessen Westrand
  E 620700) läuft sie in E 616502–620698, N 5594206–5594799 (UTM 32N); mit 600 m Rand **E 615902–621298, N 5593606–5595399**.
- **Block Veßra** (Stufen 8–11, ans Raster der Stufe 8 gerundet): **E 612700–620700, N 5590800–5597200** – schließt bei E 620700 lückenlos
  an Block B an (dessen Stufen 8–11: E 620700–630300, N 5590800–5600400). Stufe 12 nur über **E 615500–617500, N 5593600–5595600**
  (Klosteranlage, Ort, Baumschule); Stufe 7 nur für den Farbausgleich. In Modellmetern (x Ost, y Nord): Klosteranlage ≈ (−8770, −377),
  Baumschule ≈ (−8905, −175), Westrand von Block B bei x ≈ −4700, die Route in Kloster Veßra auf der Schleusinger Straße.
  Konstanten: `tools/welt/wlib.py` (`VESSRA_BLK`, `VESSRA_DET`, `VESSRA_ROUTE`, `ZONES`), geprüft in `tools/welt/test_welt.py`.
- **Kachel-Sätze in `welt/welt.js`**: `WELT.addSet('zonen/vessra/')` meldet einen weiteren Satz an (Basis `<welt-test>/zonen/vessra/`,
  eigene `meta.json`, mehrfacher Aufruf schadet nicht); das macht `welt/vessra.js` schon beim Laden – ohne Netzabruf, die `meta.json` wird erst geholt, wenn Kacheln
  gebraucht werden. Danach kommt **jede Kachel aus dem ersten Satz, dessen Rechteck sie enthält** – egal wo die Kamera ist: Plan um
  Fußgänger bzw. Kamera, `WELT.need(id, true)` genügt (auch für ein fahrendes Fahrzeug). `WELT.need(id, on, sub)` darf den Satz gleich
  mitnennen. `WELT.state().sets` zeigt die Sätze (`+` geladen, `!` Fehler, `?` noch nicht gefragt), `WELT.sampler(...)` liefert eine
  Höhenfunktion mit `f.tiles` (0 = kein Satz deckt das Rechteck).
- Ohne veröffentlichte Kacheln (z. B. lokaler Testserver ohne `dist/welt-test/zonen/vessra/`) bleibt der Ort auf dem 120-m-Gelände von
  `world/ratscher.js` stehen (`VESSRA.status().noTiles`).
- Solange die Zone gebaut ist, setzt sie zwei Polster (`WELT.setPads('vessra', …)`): den Boden neben den Autostraßen abgesenkt und den
  Hof der Baumschule eben. Die Fahrbahn selbst bleibt, wie die Pipeline sie geschnitten hat; Fahrzeuge fahren auf denselben Höhen
  (`KERN.ground`), beim Bauen der Zone (950 m) werden die geladenen Kacheln einmal neu gerechnet.
- `welt/welt.js` gehört heute `feat/vessra`; Änderungen der Fahrt bitte nur an markierten Zeilen (`// feat/fahrt`).

## Quellen
Gebäude, Straßen, Orte © OpenStreetMap-Mitwirkende (ODbL); Gelände/Luftbild der Kacheln © GDI-Th (CC BY 4.0), Copernicus DEM GLO-30,
ESA WorldCover (`welt-test/ATTRIBUTION.md`); Fotos nur als Vorlage (`tools/fotos/katalog.json`: Panoramax 2025, Wikimedia Commons u. a.
Ermell 2021/2022, Tilman2007 2025), keine Bilder im Repo.

## Testen
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8981 --serve vessra` – holt die nötigen Welt-Kacheln der Zone nach
  `viz3/dist/welt-test/zonen/vessra/` (≈ 1200 Dateien, 14 MB), prüft: nichts beim Start (Kachel-Satz nur angemeldet; Zone,
  Startsituationen, Sprungziele angemeldet), Menü, Laden, eigene Kacheln, Boden, keine Rinne neben der Schleusinger Straße, eine Hauswand
  und die Klostermauer halten auf, durchs Torhaus, durchs Westportal ins Langhaus, durch den Triumphbogen in die Vierung, die Nordwand
  hält auf, die Wahrzeichen, die Baumschule (fünf Beete, Stellen, Name, Schilder, Jungbäume, `?szenario=baumschule` vor dem Tor und
  hinein), Ortsnamen, Bilder
  (`out/vessra/`: Tor, Westfront wie das Foto von Südwesten 2025, Langhaus von Westen, Henneberger Kapelle, wie das Drohnenbild von Osten 2021,
  Torkirche, zwei Panoramax-Stellen an der Schleusinger Straße, Baumschule nah und von oben, Ort von oben), Nacht (Laternen), Freigeben,
  höchstens 6 neue Shader-Programme, Texturen je Shader. Abschnitte einzeln: `vessra:start,load,walk,kirche,baumschule,names,shots,night,free`.
  Bei GitHub: `feat.yml` (Artefakt „out“).
- `… --serve vessra_szenario` – startet mit `?szenario=baumschule`: die Spielfigur vor dem Tor der Baumschule, die Zone baut sich um sie,
  Boden, durchs Tor in den Verkaufshof, Bild `m_szenario_baumschule`. Die Kacheln holen beide Tests über `viz3/test/vessra_tiles.py`.
- Kacheln neu bauen: Push auf `feat/vessra` mit Änderungen an `tools/welt/*.py` (außer `zone_*.py`, `test_welt.py`) oder an
  `.github/workflows/welt-vessra.yml`. Zonendaten: `python3 -I tools/welt/zone_vessra.py --raw <Cache-Ordner>` (OSM-API, Luftbild per WMS)
  → `viz3/extra/vessra/dist/vessra/ort.json`.

## Offen
- Hinfahren (Agent `fahrt`), Einkaufen und Einladen (nächste Runde, Stellen in `VESSRA.baumschule`).
- Gelände: Copernicus (30 m Oberflächenmodell, Straßen eingeschnitten) – DGM1 Thüringen war am 22./23.10. nicht abrufbar; sobald es da ist,
  reicht ein neuer Lauf von `welt-vessra.yml` (ohne `--no-dgm`), dann kann das Absenken neben den Straßen (`roadCap` in
  `welt/vessra.js`) entfallen oder kleiner werden. Abseits der Straßen tragen Wiesen und Höfe noch Buckel aus Häusern und Bäumen.
- Die Kirche: die Pfeilerstümpfe ohne Sockelstufen, der Fries ohne Köpfe und Rosetten (nur die Bögen), keine Grabplatten an den Wänden.
- Die Baumschule: Pflanzen sind ein zusammengefasstes Mesh – einzelne Töpfe lassen sich noch nicht herausnehmen (zum Einkaufen müsste
  ein Beet seine Töpfe als eigene Instanzen bauen).
- Laubbäume: das Luftbild (Flug 7.4.2024) zeigt sie unbelaubt – auf den Wiesen der Klosteranlage und in den Gärten nach Regeln gesetzt,
  nicht nach ihrer echten Lage. Innenräume (Kapellen, Museumshäuser) sind nicht begehbar.
