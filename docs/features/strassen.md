# Straßen: Markierung, Ränder, Ausstattung (`strassen`)

Chat session_01WqScFDtq8GSy4n7wU7foJx mit Falko, 12./13.11.2026, Branch `feat/strassen`.

Falko (12.11. 23:10): Die Region soll „aus der 3D-Perspektive noch realistischer“ werden – „Gebäude, aber auch Straßen und sonstige
Bedingungen … auch der Verkehr“. (23:13) „starte mit Paket 1“ – den Straßen –, „was du schon aus den anderen Paketen in diesem Zug mit
umsetzen kannst, das tu“.

## Was es gibt

- **Vier Stile je Straßenstück** (`strassen/strassen_stil.js`, rein, mit Unit-Tests): 0 freie Strecke, 1 freie Strecke mit durchgezogener
  Mittellinie (enge Kurven: Radius unter 115 m, 30 m Vorlauf – nach Regel, niemand hat sie vermessen), 2 Stadt (Schleusingen, Themar),
  3 Dorf. Woher: die bebauten Flächen der Fahrtdaten (`orte` in der Datendatei), Weiler zählen als freie Strecke.
- **Straßenkarte** wie bisher (`world/roads.js`), neu kodiert: G = Stil × 60 + Art × 6 + Belag, A = Meter längs des Wegs modulo 36
  (daraus alle Strichfolgen: 4 m/8 m außerorts, 3 m/6 m innerorts, 6 m/12 m Autobahn). Der Shader `roadShade` zeichnet daraus:
  - **Markierung nach Klasse, Breite und Lage:** Mittellinie ab 5,5 m Breite auf Haupt- und Kreisstraßen (gestrichelt oder durchgezogen),
    Randlinien außerorts auf Hauptstraßen und auf Kreisstraßen ab 5 m; schmale Kreisstraßen nur Randlinien; innerorts keine Randlinien.
  - **Ränder:** außerorts ein Bankett aus Schotter und Gras; in der Stadt Bordstein (Steine von 1 m, dunkle Kante zur Rinne), Rinne
    aus zwei Reihen Pflaster und Gehweg aus Betonpflaster (1,7 m an Durchgangsstraßen, 1,3 m an Wohnstraßen); im Dorf Bordstein und Rinne
    nur an den Durchgangsstraßen (Haupt-/Kreisstraße) – die Gassen bleiben, wie sie sind.
  - **Belag aus der Nähe:** zwei Fahrstreifen leicht verschieden, Flickstellen mit vergossenem Rand, vergossene Risse längs und quer – mehr
    davon auf kleinen Straßen, in Abschnitten; polierte Fahrspuren.
  - **Nässe:** `uRoad.y` (aus `WXBODEN`, gesetzt von `strassen/strassen.js`) – nasser Asphalt wird dunkler und glänzt, Wasser steht in den
    Fahrspuren und am Rand (`gRdGloss`, `gRdPud` → Rauheit über `ROADS.gloss(fragmentShader)`; unter Schnee nichts davon).
- **Jenseits des Quadrats** (`strassen/strassen_karte.js`): dieselbe Karte für ein Fenster um den Beobachter (1536 m mit 1,5 m/px, auf
  Telefonen 1024 m mit 2 m/px), aus den Straßen von `welt/fahrt.js`, ein paar Wege je Bild in einen zweiten Puffer gerastert (2,5 ms je
  Bild) und dann getauscht. Der Kachel-Shader (`welt/welt.js`) liest sie über eigene Uniform-Halter (`ROADS.W`, derselbe Sampler-Platz wie
  die Karte des Quadrats – keine zusätzliche Textur im Shader). Über dem Asphalt einer Zone (Schleusingen, Kloster Veßra) gilt sie ebenfalls
  (die helle Bordsteinlinie der Zone weicht dort dem Rand aus der Karte); Pflaster, Platten und Kies einer Zone bleiben, wie die Zone
  sie gelegt hat. Graue Fotoflächen werden in einer Zone nahe der Kamera weiter zu Pflaster – aber nicht mehr dort, wo die Karte eine
  Straße hat (vorher schien das Pflaster durch den Asphalt der L 1625 vor Kloster Veßra). Die Straßen enden 70 m vor dem nächsten Fensterrand (`uRoad.z`).
- **Ausstattung** (`strassen/strassen.js`, Modelle `strassen/strassen_modelle.js`, Daten `dist/strassen/ausstattung.json`): je Zelle von
  128 m gebaut, wenn man näher als 430 m kommt (Telefon 300 m), 150 m weiter wieder frei; zwei Zellen je Runde (0,2 s). Alles steht auf
  dem Boden des Augenblicks (`KERN.ground`) und wird neu gesetzt, wenn feinere Kacheln kommen. Nichts steht auf einer Fahrbahn: jedes
  Ding rückt beim Bauen vom Rand ab oder entfällt (`STRASSEN.audit` für den Test).
  - **Leitpfosten** an Haupt- und Kreisstraßen außerorts, beidseitig alle 50 m, in Kurven enger (25/15/10 m) – nach Regel; rechts der
    senkrechte Rückstrahler, links zwei Punkte.
  - **Schutzplanken**, wo OpenStreetMap sie hat (`barrier=guard_rail`, 19 km, vor allem A 73), 0,6 m neben die Fahrbahn gesetzt, Enden
    abgesenkt; für Fahrzeuge fest (`VEH.extra`).
  - **Verkehrszeichen** (350): Tempolimits, wo sich `maxspeed` zwischen zwei OSM-Wegen ändert (274, Ende 278, Zone 274.1); Vorfahrt
    gewähren und Stopp (OSM-Knoten, dazu nach Regel, wo eine Straße auf eine klassifizierte trifft) mit Warte-/Haltlinie; Vorfahrt (301)
    150 m davor auf der klassifizierten Straße außerorts; Kreisverkehre (205 + 215); Andreaskreuze an Bahnübergängen; Fußgängerüberweg
    (350, mit Zebrastreifen); Stationszeichen (OSM `milestone`); Richtungstafeln in engen Kurven (Radius unter 62 m); Wildwechsel (142),
    wo eine klassifizierte Straße 350 m und mehr durch Wald führt. Formen als echte Umrisse (kein Ausschnitt), ein Bild für alle Flächen
    (Felder von 128 Pixeln, auf Telefonen und Tablets 64 – ein Viertel des Speichers).
  - **Straßenlaternen** (1596): OSM-Knoten (55) und nach Regel an beleuchteten Straßen (`lit=yes`) und den Straßen der bebauten Flächen,
    die OSM nicht „unbeleuchtet“ nennt – eine Seite, alle 36 m. Nicht in Ratscher (dort stehen die Laternen aus `world/village_props.js`),
    nicht neben den Laternen einer Zone. Nachts leuchten Glas und Lichtfleck mit den Dorflaternen (deren Materialien bzw. Programme),
    die nächsten beleuchten die Fassaden (`VPROPS.lamps`).
  - **Strommasten und Leitungen** (711 Masten, davon 203 Gittermasten; OSM `power`): Zellen von 512 m, sichtbar bis 1,5 km; die Seile als
    Linien (ein Pixel breit in jeder Entfernung), nur bis 800 m.
  - **Linien quer** (`linien`): Halt- und Wartelinien, Zebrastreifen – Farbe auf dem Asphalt, unter Schnee verdeckt.
  - **Brücken:** die Straßenkarte lässt Brücken aus (sonst läge unter dem Deck eine Straße auf dem Talboden) – ihre Mittel- und
    Randlinien liegen als Farbe auf dem Deck (`STRMOD.deckMarks`; die Decks des Quadrats und die von `welt/fahrt.js`).
  - **Rückstrahler:** nachts leuchten die Rückstrahler der Leitpfosten dem Auto entgegen, das man fährt (kleine helle Flächen, addiert).
- **Kein neues Shader-Programm zur Laufzeit:** alles mit Vertexfarben auf dem Material der geparkten Autos (`DMOD.mat`), die
  Schildflächen, das Lampenglas, die Seile und die Linien mit je einem Material, das beim Laden mitkompiliert wird (Träger-Dreiecke).

## Daten

`python3 -I viz3/extra/strassen/daten.py --raw <cache> [--plot bild.png]` → `viz3/extra/strassen/dist/strassen/ausstattung.json` (221 KB).
Quellen: OpenStreetMap (API 0.6 `/map` in Zellen, derselbe Cache wie `viz3/extra/fahrt/strecke.py`; Overpass ist aus dem Chat-Rechner
nicht erreichbar) und die Straßen der App selbst (Quadrat: `dist/geo/roads.b64.json`; draußen: `fahrt/strassen.json`) – alles wird an
deren Achsen und Breiten ausgerichtet. Braucht `pyproj`, `numpy`. Nach neuen Fahrtdaten oder neuem OSM-Stand neu laufen lassen.

## Schnittstellen

- `STRDAT` (früh geladen, vor `world/roads.js`): `ready`, `when(fn)`, `placeAt(x, y)` → 0/1/2, `ortAt`, `data`.
- `STRSTIL` (rein): `code/decode`, `styles`, `solids`, `marks`, `raster`, `read`.
- `ROADS`: neu `W` (Uniform-Halter der Fensterkarte), `gloss(fs)`, `edgeAt(x, y)` (Randabstand zwischen den Pixeln), `at().style`.
- `STRKARTE`: `active`, `at(x, y)`, `flush()` (Tests), `n`, `ms`.
- `STRASSEN`: `state()`, `fill()` (Tests: alles Nahe sofort bauen), `audit(x0, y0, x1, y1)`.
- `?nostrassen`: ohne Ausstattung, ohne Fensterkarte, alle Straßen als freie Strecke.

## Tests

- `node --test viz3/test/unit/strassen.test.mjs` (12): Kodierung, Radius, durchgezogene Strecken, Stile, Raster; Geometrie nach außen
  gewunden, Rückstrahler zur richtigen Seite, Welle der Planke zur Straße, Schildfläche gegen die Fahrtrichtung und nicht gespiegelt.
- `python3 viz3/test/run.py --port 89xx --serve strassen` (31 Prüfungen, Abschnitte `start,moebel,stadt,nass,fahrt,gl`; Bilder in
  `out/strassen/`).
- Gemessen (13.11., SwiftShader im Chat-Rechner): auf 900 m Fahrt mit 70 km/h im Mittel 0,06 ms je Bild für die Ausstattung und
  0,02 ms für die Fensterkarte, längste Runde 4 ms, eine Karte 10–14 ms in Scheiben; ~10.000 Dreiecke auf freier Strecke.

## Offen

- **Einmündungen in spitzem Winkel:** zwei Mittellinien nebeneinander, wo zwei Wege fast parallel zusammenlaufen (wie vorher).
- **Schilder** sind nachts dunkel (die Rückstrahler der Leitpfosten leuchten im Licht des Autos, das man fährt).
- **Ampeln** (drei Fußgängerampeln in OSM) fehlen; **Gehwege** stehen überall in der Stadt beidseitig – OSM `sidewalk` wird nicht gelesen.
- **Kloster Veßra:** der Asphalt der Zone bekommt die neue Straßenkarte, soweit die Fahrtdaten die Straße kennen; Wege nur der Zone
  (Klosterhof, Baumschule) bleiben, wie die Zone sie zeichnet.
- Durchgezogene Linien, Leitpfosten, die meisten Laternen und ein Teil der Schilder sind **nach Regel** gesetzt, nicht nach Vermessung.
- Vorschläge für die nächsten Pakete (Bäume draußen, Gewässer, Eisenbahn, Verkehr nach Schildern): Projekt-Dokument
  `claude/pavillon-realismus.md`.
