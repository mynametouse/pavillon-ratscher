# Straßenbäume und Grün in Schleusingen (`stadtgruen`)

Hilfs-Agent `stadtgruen` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, 17.11.2026, Branch `feat/stadtgruen` (Auftrag
`docs/plans/auftraege/stadtgruen.md`).

Falko (17.11. ~17:30), nach einem Vergleich des Modells mit privaten Ansichten von der Straße: die Lage stimmt, aber die Straßen sind
kahl – in Wirklichkeit säumen Bäume die Hildburghäuser, die Suhler und die Ilmenauer Straße. Gewählt: „Straßenbäume und Grün“.
(18:20) Ganz Schleusingen, nicht nur die drei Straßen; danach Ratscher.

## Was es gibt

- **Die Allee der Hildburghäuser Straße** bei den Wohnblöcken Nr. 15–24: Linden auf den Grünstreifen zwischen Bordstein und Gehweg auf
  beiden Seiten, etwa alle 9,5 m, gut 14 m hoch, im Oktober goldgelb (nach den privaten Ansichten von der Straße, Oktober 2022). Die
  Reihen stehen am Straßenrand, wie das Modell die Straße zeichnet (OSM-Mittellinie und Breite der Klasse); ob der Streifen dort grün ist
  (keine Einfahrt, kein Zugang), sagt das Infrarot-Luftbild am wirklichen Bordstein.
- **Bäume in Höfen, Gärten, am Schloss, an der Schleuse und auf den Hängen** aus den Luftbildern (siehe Quellen): Laubbäume (Linde,
  Ahorn, Kastanie, Birke, Esche, Eiche), Nadelbäume und Obstbäume – die Art nach dem Ort (Park und Friedhof, Garten, am Wasser) und
  danach, ob die Krone im April schon grün ist (Nadelbaum).
- **Hecken** (OpenStreetMap `barrier=hedge`) als Reihen von Büschen; Einzelbäume und Baumreihen aus OSM (`natural=tree`, `tree_row`).
- **Die Jahreszeit des Spieldatums**: frisches Grün im Austrieb, Sommergrün, Herbstfarben nach Art (Linde goldgelb, Ahorn orange,
  Kastanie braun, Birke hellgelb …), Laubfall lichtet die Krone, im Winter kahl; Eichen und Hainbuchenhecken behalten trockenes Laub,
  Nadelbäume bleiben grün.
- **Stämme sind Hindernisse** für Fußgänger und Fahrzeuge (`KERN.pushOut`).
- **Nur solange die Stadt da ist:** gebaut, wenn die Zone `schleusingen` (welt/schleusingen.js) steht, freigegeben, wenn sie geht –
  beim Start nichts.

## Wo kein Baum steht

In den Daten (tools/stadtgruen/build.py): in oder an einem Gebäude (Stadt und OSM, Stamm mindestens 0,6 m von der Wand), auf einer
Fahrbahn oder einem Gehweg (Mittellinie und Breite, wie die Stadt sie zeichnet), in einer Parkbucht (Parkplätze der Läden und der
Welt-Dinge), auf der Fläche eines Ladens, an einem Eingang (OSM), unter einer Laterne, an einem Schild oder Pfosten, an einer
Bushaltestelle, auf dem Markt. Ein Baum, der näher als 3 m an einem anderen steht, fällt weg (Reihen zuerst, dann OSM, dann die
Luftbilder). Beim Bauen in der App noch einmal mit der Stadt, wie sie dann steht (`SGREGELN.blocked`): ihre Häuser und Türen
(`SCHL.bld`, `doorFac`), Laternen, der Markt und seine Bäume (kein Baum näher als 3 m an einem Marktbaum von welt/schleusingen.js),
die Läden und Parkplätze, falls geladen (`LAEDEN.data`, `DINGE.places`).

## Quellen und Lizenzen

- Orthophotos DOP 20 cm in Farbe und Infrarot, © GDI-Th, Datenlizenz Deutschland – Namensnennung 2.0 (WMS `th_dop`, `th_dop20cir`,
  beflogen 07.04.2024 – vor dem Laubaustrieb). Kronen: im April ist eine Laubkrone ein grau-braunes Geäst über dem Rasen, auf etwa 2 m
  Maßstab rau (Standardabweichung des Grauwerts über 2,25 m: Kronen 13–27, Rasen 7–8), Nadelbäume grün und dunkel (NDVI hoch).
- OpenStreetMap © OpenStreetMap-Mitwirkende, ODbL 1.0: Bäume, Baumreihen, Hecken, Gebäude, Parks, Friedhof, Gärten, Wasser.
- Die Daten der Stadt (`viz3/extra/schleusingen/…/stadt.json`), der Läden, der Parkplätze und der Straßenausstattung (alle ODbL/GDI-Th).
- Arten, Größe und Abstand der Alleen sind an **privaten Ansichten von der Straße** geprüft – sie sind nicht im Repository, in keinem
  Artefakt und keiner Textur.
- Nicht verwendet (17.11.2026 nicht erreichbar): DGM1/DOM1 des Geoportals Thüringen (Höhendaten-Download meldete „noch nicht
  verfügbar“) – mit ihnen gäbe es Höhen und Kronen aus dem Oberflächenmodell wie bei Ratscher.
- Die Quellen stehen in der Quellenliste der App (`viz3/extra/stadtgruen/manifest.json`, `credits_add`) und in `baeume.json` (`src`).

## Daten

`tools/stadtgruen/fetch.py <cache>` holt OSM, DOP (Farbe, Infrarot) und – sobald erreichbar – DGM1/DOM1 der Zone in einen Ordner
**außerhalb** des Repositorys; `tools/stadtgruen/build.py <cache>` schreibt `viz3/extra/stadtgruen/dist/stadtgruen/baeume.json`:
`b` = 6 ganze Zahlen je Baum (x, y in dm Modell, Art, Höhe dm, Kronenradius dm, Bits: 1 Reihe, 2 Straßenbaum, 4 Hof/Garten,
8 Park/Schloss, 16 aus den Luftbildern, 32 aus OSM, 64 Hecke), `arten`, `reihen`, `anzahl`, `zone`, `src`.
Die Reihen (Straße, Seite, Abschnitt, Art, Abstand, Abstand vom Bordstein) stehen in `ROWS` im Werkzeug.

## Schnittstelle

`STADTGRUEN` (`viz3/src/stadtgruen/stadtgruen.js`, auf `window`): `status()` (Zustand, Bäume, ausgelassene nach Grund, Stufen, Meshes,
Jahreszeit, Bauzeit), `list(x, y, r)` (Bäume als Zahlen), `cost()` (Dreiecke je Art und Stufe), `setDoy(tag | null)` (Jahreszeit von
Hand, sonst Spieldatum), `refresh()`, `live` (die gezeichneten Bäume), `meshes`, `G` (= `SGREGELN`). Ereignis `stadtgruen:ready`
({ n, ms }). `?nostadtgruen` schaltet es ab. Reiner Teil `SGREGELN` (`stadtgruen/sg_regeln.js`, mit Unit-Tests): Arten und ihr Jahr
(`season`), Herbstfarbe (`tint`), Datensätze (`decode`), Ausschluss (`blocked`), Stufen und Budget (`level`, `radii`, `budget`,
`assign`, `leafLevel`), Stämme (`pushOut`).

Gemeinsame Dateien: eine Zeile in `modules.txt` (unter `# feat/stadtgruen`, nach `strassen/strassen.js`). Keine Änderung an
welt/schleusingen.js, fassade/**, laeden/**, schleusingen/si_*, haeuser/**, zombie/**.

## Zeichnen und Leistung

- Arten: eigene ez-tree-Arten für Linde, Ahorn, Kastanie und Birke, gebaut wie die des Gartens (`buildTreeKind` – gleiche Materialien,
  also gleiche Shader-Programme), Esche, Eiche, Nadelbaum, Obstbaum und Heckenbusch sind die Arten des Gartens. Keine neuen Programme
  (geprüft im Test). Die Fernkarten sind der Baumatlas von world/ratscher.js (sein Material und seine Geometrie).
- Je Art, Teil (Rinde, Krone) und Stufe ein InstancedMesh (Stufen wie im Garten: volle Rinde/ausgedünnte Krone, Mittel-, Fernstufe),
  nach jedem Schritt von 2 m oder Drehen um 8° neu gefüllt: die nächsten im Blick zuerst, jede Stufe bis zu ihrem Budget, dann die
  nächstgröbere, dahinter Karten (je 400-m-Zelle ein InstancedMesh). Hinter der Kamera jenseits des Nahrings: nichts.
- Budget (Computer, Stufe „hoch“): volle Stufe ≤ 3 Bäume bis 16 m, Mittelstufe ≤ 16 bis 70 m, Fernstufe ≤ 36 bis 160 m; Hecken eigene
  12/30/40; Telefon 2/8/16 mit den Stufen des Gartens eine Stufe gröber. Ziel ≤ 150 000 Dreiecke der Bäume im Blick (Telefon ≤ 60 000),
  ≤ 6 Draw-Calls je Art im Blick plus die Karten (Test: ≤ 60).
- Schatten: die volle Stufe wirft den Sonnenschatten (der Schattenkasten reicht wenige zehn Meter um die Figur).

## Tests

- `viz3/test/unit/stadtgruen.test.mjs` (ohne Browser): Jahr der Arten, Herbstfarbe, Datensätze, Ausschluss, Stufen und Budget, Stämme.
- `viz3/test/stadtgruen.py 9051 [data,stadt,bilder,telefon]`: Daten (Zone, kein Baum in Gebäude, auf Fahrbahn/Gehweg, in Parkbucht, auf
  Ladenfläche; Allee der Hildburghäuser Straße auf beiden Seiten mit Abstand 8–12 m; Bäume an den drei Straßen und der Königstraße),
  im Browser (nichts beim Start; mit der Stadt die Bäume; keiner in einem Haus der Stadt; keine neuen Programme; Draw-Calls und Dreiecke
  am Markt, in der Hildburghäuser Straße und an der Suhler Straße; Juli grün, Oktober golden, Januar kahl; ein Stamm hält auf;
  freigegeben im Garten), Bilder von den Blickpunkten `viz3/extra/stadtgruen/blick.json` (nur das Modell), Telefon-Budget.
- `viz3/extra/stadtgruen/tests.txt`: smoke, stadtgruen (zwei Jobs), memphone, laeden (Gruppe „mitte“ an der Suhler Straße).

## Offene Punkte

- Höhen und Kronen aus DOM1/DGM1, sobald der Download des Geoportals wieder geht (`tools/stadtgruen/fetch.py` holt sie dann mit).
- Weitere Reihen (Suhler, Ilmenauer, Königstraße) nach den privaten Ansichten; Hecken aus den Luftbildern; Grünstreifen.
- Ratscher: fehlende Straßenbäume, Hecken und Grünstreifen ergänzen (Falko 17.11. 18:20).
