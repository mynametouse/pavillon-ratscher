# Straßenbäume und Grün in Schleusingen und an der Straße südlich von Ratscher (`stadtgruen`)

Hilfs-Agent `stadtgruen` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, 17.11.2026, Branch `feat/stadtgruen` (Auftrag
`docs/plans/auftraege/stadtgruen.md`).

Falko (17.11. ~17:30), nach einem Vergleich des Modells mit privaten Ansichten von der Straße: die Lage stimmt, aber die Straßen sind
kahl – in Wirklichkeit säumen Bäume die Hildburghäuser, die Suhler und die Ilmenauer Straße. Gewählt: „Straßenbäume und Grün“.
(18:20) Ganz Schleusingen, nicht nur die drei Straßen; danach Ratscher: nur ergänzen, was dort wirklich fehlt, nie ein Baum doppelt,
Falkos Garten und die Grundstücke der beiden Nachbarn bleiben, wie sie sind.

## Was es gibt

- **Die Allee der Hildburghäuser Straße** bei den Wohnblöcken Nr. 15–24: Linden auf den Grünstreifen zwischen Bordstein und Gehweg auf
  beiden Seiten, etwa alle 9,5 m, gut 14 m hoch, im Oktober goldgelb (nach den privaten Ansichten von der Straße, Oktober 2022). Die
  Reihen stehen am Straßenrand, wie das Modell die Straße zeichnet (OSM-Mittellinie und Breite der Klasse); ob der Streifen dort grün ist
  (keine Einfahrt, kein Zugang), sagt das Infrarot-Luftbild am wirklichen Bordstein.
- **Bäume in der ganzen Stadt** (Zone von stadt.json, mit Königstraße, Suhler und Ilmenauer Straße, Schloss, Schleuse, Hängen) aus den
  Luftbildern: Laubbäume (Linde, Ahorn, Kastanie, Birke, Esche, Eiche), Nadelbäume und Obstbäume – die Art nach dem Ort (Park und
  Friedhof, Garten, am Wasser) und danach, ob die Krone im April schon grün ist (Nadelbaum). 4703 Bäume und Büsche.
- **Hecken** (OpenStreetMap `barrier=hedge`) als Reihen von Büschen; Einzelbäume und Baumreihen aus OSM (`natural=tree`, `tree_row`).
- **Die Jahreszeit des Spieldatums** (in der Stadt): frisches Grün im Austrieb, Sommergrün, Herbstfarben nach Art (Linde goldgelb, Ahorn
  orange, Kastanie braun, Birke hellgelb …, der Farbton des Laubbilds bleibt), Laubfall lichtet die Krone, im Winter kahl; Eichen und
  Hainbuchenhecken behalten trockenes Laub, Nadelbäume bleiben grün.
- **Ratscher, L 1625 südlich des Dorfs** (zwischen x ≈ −830 und 360): die Gürtel aus Birken, Kiefern, Ahorn, Esche und Eiche auf den
  Böschungen, die die privaten Ansichten von der Straße (Oktober 2025) zeigen und die den ~21 000 Bäumen der Welt (Kronenhöhenmodell)
  fehlen – vor allem die Südseite: hohe Birken bei x −830 … −480, junge Birken und Kiefern, ein dichter Gürtel x −390 … 160, junge Bäume
  und Büsche hinter der Leitplanke bis zur Kreuzung mit der L 3004; auf der Nordseite nur, wo die Ansichten Bäume zeigen. Offen bleibt,
  was offen ist (das Feld bei x −440 … −400, die L 3004 nach Süden). 624 Bäume und Büsche, keiner näher als 4 m an einem Baum der Welt
  (ein Busch 2 m), keiner auf Straße oder Bankett, nichts im Umkreis von 150 m um Falkos Garten und die Nachbarn (der nächste steht
  425 m entfernt). Im Dorf selbst zeigen die Ansichten nichts Fehlendes; OSM hat dort keine Hecken.
- **Stämme sind Hindernisse** für Fußgänger und Fahrzeuge (`KERN.pushOut`).
- **Nur wenn man dort ist:** die Stadt-Bäume werden gebaut, wenn die Zone `schleusingen` (welt/schleusingen.js) steht, und freigegeben,
  wenn sie geht; die an der L 1625, wenn man ihr näher als 380 m kommt (vom Garten sind es 490 m), und jenseits von 470 m wieder
  freigegeben. Beim Start nichts.

## Wo kein Baum steht

In den Daten (tools/stadtgruen/build.py): in oder an einem Gebäude (Stadt und OSM, Stamm mindestens 0,6 m von der Wand), auf einer
Fahrbahn oder einem Gehweg (Mittellinie und Breite, wie die Stadt sie zeichnet), in einer Parkbucht (Parkplätze der Läden und der
Welt-Dinge), auf der Fläche eines Ladens, vor einer Tür (ein Gang von 8 m) oder einem Ladenschild (12 m), unter einer Laterne, an einem
Schild oder Pfosten, an einer Bushaltestelle, auf dem Markt. Ein Baum, der näher als 3 m an einem anderen steht, fällt weg (Reihen
zuerst, dann OSM, dann die Luftbilder). Beim Bauen in der App noch einmal mit der Welt, wie sie dann steht (`SGREGELN.blocked`): die
Häuser und Türen der Stadt (`SCHL.bld`, `doorFac`; vor einer Tür ein Gang 4 m × ±1,3 m, vor einem Ladenschild 9 m × ±2,6 m), Laternen,
der Markt und seine Bäume (kein Baum näher als 3 m an einem Marktbaum von welt/schleusingen.js), die Läden und Parkplätze, falls geladen
(`LAEDEN.data`, `DINGE.places`); in Ratscher die Straßen, wie die Welt sie zeichnet (`ROADS.edgeAt`: 1,5 m Abstand vom Rand), die Bäume
der Welt (`RATSCHER.treeXY`, auch die des Walds an der Klinge), Laternen und alles Feste (`KERN.pushOut`).
Der Blick vom Kreisel auf die Bertholdsburg: dort stehen nur Bäume, die die Luftbilder zeigen (der Rasen am Schlosspark bleibt frei).

## Quellen und Lizenzen

- Orthophotos DOP 20 cm in Farbe und Infrarot, © GDI-Th, Datenlizenz Deutschland – Namensnennung 2.0 (WMS `th_dop`, `th_dop20cir`).
  Die Kacheln südlich von N = 5 597 000 sind am 07.04.2024 beflogen (vor dem Laubaustrieb: eine Laubkrone ist ein grau-braunes Geäst
  über dem Rasen, auf etwa 2 m Maßstab rau – Standardabweichung des Grauwerts über 2,25 m: Kronen 13–27, Rasen 7–8; Nadelbäume grün
  und dunkel), die nördlichen am 15.05.2024 (mit Laub: jede Krone ist grün, ein Nadelbaum im Infrarot dunkler).
- OpenStreetMap © OpenStreetMap-Mitwirkende, ODbL 1.0: Bäume, Baumreihen, Hecken, Gebäude, Straßen, Parks, Friedhof, Gärten, Wasser.
- Die Daten der Stadt (`viz3/extra/schleusingen/…/stadt.json`), der Läden, der Parkplätze und der Straßenausstattung (alle ODbL/GDI-Th);
  in Ratscher die Bäume der Welt (`viz3/dist/geo/trees.b64.json`, tools/geo).
- Arten, Größe und Abstand der Alleen und die Gürtel an der L 1625 sind an **privaten Ansichten von der Straße** geprüft – sie sind
  nicht im Repository, in keinem Artefakt und keiner Textur.
- Nicht verwendet (17.11.2026 nicht erreichbar): DGM1/DOM1 des Geoportals Thüringen (Höhendaten-Download meldete „noch nicht
  verfügbar“) – mit ihnen gäbe es Höhen und Kronen aus dem Oberflächenmodell wie bei Ratscher.
- Die Quellen stehen in der Quellenliste der App (`viz3/extra/stadtgruen/manifest.json`, `credits_add`) und in den Daten (`src`).

## Daten

`tools/stadtgruen/fetch.py <cache>` holt OSM, DOP (Farbe, Infrarot) und – sobald erreichbar – DGM1/DOM1 der Zone in einen Ordner
**außerhalb** des Repositorys; `tools/stadtgruen/build.py <cache>` schreibt `viz3/extra/stadtgruen/dist/stadtgruen/baeume.json`.
Für Ratscher: `fetch.py <anderer cache> --ratscher` (die L 1625 südlich des Dorfs; OSM des Dorfs und seiner Straßen) und
`build.py <der cache> --ratscher` → `ratscher.json` (die Gürtel `RAT_BELTS` im Werkzeug: Seite, Abschnitt, Arten, Höhen, Reihen; in
einem Gürtel die Kronen der Luftbilder, wo keine zu finden ist, alle 4,5 m ein Baum je Reihe – im offenen Land sehen Feldränder und
Bankette im Luftbild ebenso rau aus, darum nur dort, wo die Ansichten einen Gürtel zeigen).
Format beider Dateien: `b` = 6 ganze Zahlen je Baum (x, y in dm Modell, Art, Höhe dm, Kronenradius dm, Bits: 1 Reihe, 2 Straßenbaum,
4 Hof/Garten, 8 Park/Schloss, 16 aus den Luftbildern, 32 aus OSM, 64 Hecke/Busch), `arten`, `reihen`, `anzahl`, `zone`, `src`.
Die Reihen der Stadt (Straße, Seite, Abschnitt, Art, Abstand, Abstand vom Bordstein) stehen in `ROWS` im Werkzeug.

## Schnittstelle

`STADTGRUEN` (`viz3/src/stadtgruen/stadtgruen.js`, auf `window`): `status()` (Gebiet `schleusingen` | `ratscher` | null, Zustand, Bäume,
ausgelassene nach Grund, Stufen, Dreiecke, Meshes, Jahreszeit, Bauzeit, gebaut/freigegeben), `list(x, y, r)` (Bäume als Zahlen),
`cost()` (Dreiecke je Art und Stufe), `setDoy(tag | null)` (Jahreszeit von Hand, sonst Spieldatum), `refresh()`, `live` (die gezeichneten
Bäume), `meshes`, `G` (= `SGREGELN`). Ereignis `stadtgruen:ready` ({ n, ms }). `?nostadtgruen` schaltet es ab. Reiner Teil `SGREGELN`
(`stadtgruen/sg_regeln.js`, mit Unit-Tests): Arten und ihr Jahr (`season`), Herbstfarbe (`tint`), Datensätze (`decode`), Ausschluss
(`blocked`), Stufen und Budget (`level`, `radii`, `budget`, `assign`, `leafLevel`), Stämme (`pushOut`).

Gemeinsame Dateien: eine Zeile in `modules.txt` (unter `# feat/stadtgruen`, nach `strassen/strassen.js`). Keine Änderung an
welt/schleusingen.js, fassade/**, laeden/**, schleusingen/si_*, haeuser/**, zombie/**, world/ratscher.js.

## Zeichnen und Leistung

- Arten: eigene ez-tree-Arten für Linde, Ahorn, Kastanie und Birke, gebaut wie die des Gartens (`buildTreeKind` – gleiche Materialien,
  also gleiche Shader-Programme), Esche, Eiche, Nadelbaum, Obstbaum und Heckenbusch sind die Arten des Gartens. Keine neuen Programme
  (geprüft im Test). Die Fernkarten sind der Baumatlas von world/ratscher.js (sein Material und seine Geometrie). Eine eigene Art wird
  erst gebaut, wenn das Gebiet sie braucht (eine je Bild), und mit dem Gebiet freigegeben.
- Je Art, Teil (Rinde, Krone) und Stufe ein InstancedMesh (Stufen wie im Garten: volle Rinde/ausgedünnte Krone, Mittel-, Fernstufe),
  nach jedem Schritt von 2 m oder Drehen um 8° neu gefüllt (höchstens alle 0,1 s): die nächsten im Blick zuerst, jede Stufe bis zu ihrer
  Zahl und solange Dreiecke übrig sind, dann die nächstgröbere, dahinter Karten (je 400-m-Zelle ein InstancedMesh; wo Bäume in 3D
  stehen, ist ihre Karte weggefaltet). Hinter der Kamera jenseits des Nahrings: nichts.
- Budget (`SGREGELN.radii`, `budget`): Computer, Stufe „hoch“: volle Stufe bis 16 m, Mittelstufe bis 55 m, Fernstufe bis 130 m, höchstens
  3/12/32 Bäume (Hecken 12/28/36) und 118 000 Dreiecke in 3D (die Karten kommen dazu); „mittel“ ×0,85 der Weiten und ×0,8 der Dreiecke,
  darunter ×0,7 und ×0,65. Telefon: 10/40/95 m, 2/9/18 Bäume (Hecken 8/14/18), 32 000 Dreiecke, und jede Stufe eine gröber.
  Ziel: ≤ 150 000 Dreiecke der Bäume im Blick (Telefon ≤ 60 000), ≤ 60 Draw-Calls der Bäume.
- Gemessen (lokal, 1920 × 1080, Stufe „hoch“; Draw-Calls / Dreiecke der Bäume im Bild, dazu der Schattenpass): Markt 22 / 55 300;
  Hildburghäuser Straße (Allee, der dichteste Blick) 39 / 135 700 (Schatten 2 / 37 200); Suhler Straße am Lidl 29 / 74 200;
  L 1625 bei den Birken 20 / 78 100 (Schatten 4 / 24 000), an der Böschung 27 / 119 200 (Schatten 6 / 35 300), vor der Kreuzung
  15 / 62 800. Bauen 0,3–0,7 s (eine Art je Bild vorher).
- Schatten: die volle Stufe wirft den Sonnenschatten (der Schattenkasten reicht wenige zehn Meter um die Figur).
- Jahreszeit in Ratscher: die Bäume der Welt (world/ratscher.js) haben für Laubbäume noch keine Jahreszeit (nur die Lärchen des Walds);
  damit die ergänzten Gürtel neben ihnen nicht allein golden oder kahl stehen, bleiben sie dort im Sommer der Welt
  (`AREAS.ratscher.seasons = false`) – siehe Offene Punkte.

## Tests

- `viz3/test/unit/stadtgruen.test.mjs` (ohne Browser): Jahr der Arten, Herbstfarbe, Datensätze, Ausschluss (Stadt und Dorf: Straße,
  Bäume der Welt), Stufen und Budget, Stämme.
- `viz3/test/stadtgruen.py 9051 [data,stadt,bilder,telefon,ratscher]`: Daten (Zone, kein Baum in Gebäude, auf Fahrbahn/Gehweg, in
  Parkbucht, auf Ladenfläche; Allee der Hildburghäuser Straße auf beiden Seiten mit Abstand 8–12 m; Bäume an den drei Straßen und der
  Königstraße; Ratscher: nichts um den Garten, kein Baum doppelt, alles in der Zone), im Browser (nichts beim Start; mit der Stadt die
  Bäume; keiner in einem Haus der Stadt; keine neuen Programme; Draw-Calls und Dreiecke am Markt, in der Hildburghäuser Straße und an
  der Suhler Straße; Juli grün, Oktober golden, Januar kahl; ein Stamm hält auf; freigegeben im Garten), Bilder von den Blickpunkten
  `viz3/extra/stadtgruen/blick.json` (nur das Modell; 20 Blicke, auch vom Kreisel „An der Insel“ und am Schlosspark zur Burg hin),
  Telefon-Budget, Ratscher (an der L 1625 gebaut, kein Baum auf der Straße oder
  doppelt, Budget an drei Stellen, Bilder, im Garten wieder freigegeben).
- `viz3/extra/stadtgruen/tests.txt`: smoke, stadtgruen (zwei Jobs), memphone, laeden (Gruppe „mitte“ an der Suhler Straße).

## Offene Punkte

- Jahreszeiten für die Laubbäume der Welt in Ratscher (world/ratscher.js, nicht dieser Branch): mit `SGREGELN.season` und `tint` auf
  ihren Instanzfarben wären Ratscher und Schleusingen am selben Tag gleich gefärbt; dann `AREAS.ratscher.seasons` hier auf `true`.
- Höhen und Kronen aus DOM1/DGM1, sobald der Download des Geoportals wieder geht (`tools/stadtgruen/fetch.py` holt sie dann mit).
- Weitere Reihen (Suhler, Ilmenauer, Königstraße) nach den privaten Ansichten, wenn sie Alleen zeigen; Hecken aus den Luftbildern.
- Ratscher: die L 3004 nach Süden und das Dorf, sobald private Ansichten dort Fehlendes zeigen.
