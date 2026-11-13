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

## Runde 2: Straßendaten und Ausstattung, die zur Laufzeit kommen und gehen (13.11.2026)

Falko, 13.11. 1:54: „Das Ganze muss hier über Nacht automatisch laufen, deswegen erfüllt bitte gegenseitig eure Wünsche. Ihr habt die
Freigabe.“ – die Wünsche des Suhl-Chats (`docs/PARALLEL.md`, 13.11. 1:50: Fragen F1–F4, Wünsche W1–W6; Suhl baut kein zweites
Straßensystem, sondern liefert seine Straßen im Format von `fahrt/strassen.json`).

- **`FAHRT.add(name, json, opts)` / `FAHRT.drop(name)`** (`welt/fahrt.js`, Blöcke „feat/strassen round 2“; F1): eine Datei im Format von
  `fahrt/strassen.json` kommt dazu und geht wieder – `ways` (mit den Tabellen `kinds`, `surf`, `names`), dazu, was sie hat: `places`,
  `signs`, `routes`, `areas`, die Listen `lanes` und `s0` neben `ways`, `orte`. `opts.carve: false`: dort wird kein Boden
  zurechtgeschnitten (eine Zone mit eigenem Boden); `opts.decks: false`: die Zone baut ihre Brücken selbst; `opts.places: false`: sie
  nennt ihre Orte selbst (`KERN.place`). Eine Route mit Namen (`routes.x.n`) ist ein Ziel auf der kleinen Karte („Suhl 12 km“). Kommt
  ein Satz, bevor die Straßen der Region geladen sind, wartet er auf sie; ein Satz gehört dem, der ihn gebracht hat (er bleibt, wenn
  `FAHRT` einschläft). Gedacht für viele kleine Sätze (je Kachel einer Stadt einer): ein Aufruf ordnet nur ein. Ortsanzeige, Karte beim Fahren, `KERN.surface`, die Straßenkarte um den
  Beobachter und die Farbe auf den Brückendecks ziehen nach; `FAHRT.rev` zählt die Änderungen, `FAHRT.sets()` nennt die Sätze.
  Intern hält das Raster jetzt (Weg, Teilstück)-Paare statt Indizes, Wege und Schilder tragen eine Kennung – so kann ein Satz gehen,
  ohne dass etwas neu aufgebaut wird (gemessen mit dem Probesatz des Suhler Zentrums, 1 328 Wege und 153 Flächen: dazu 6–9 ms, weg
  3–7 ms).
- **Merker je Weg** (`fl`, gelesen von `strassen_karte.js`, `STRKARTE.optsOf`): 1 Brücke und 2 Tunnel wie bisher (nicht in der Karte);
  **32 Kreisverkehr** und **4 Einbahnstraße** mit einer Spur oder ohne Spurangabe (Arten 1 und 2): keine Mittellinie (W4 – der
  Achsabstand wird nicht näher als 0,55 m an die Achse geschrieben, der Shader malt nur innerhalb von 0,5 m; zwei Spuren in einer
  Richtung behalten ihre Leitlinie); **64 niveaugleich** (Fußgängerzone, verkehrsberuhigt): in der Karte **Art 9** – kein Bord, keine
  Rinne, kein Gehweg, keine Linie, kein Bankett, scharfe Kante, Belag wie geliefert (W1); **128 Treppe**: nicht in der Karte;
  **256 / 512 links / rechts kein Gehweg** (in Punktrichtung): diese Hälfte bekommt in der Stadt Bord und Rinne ohne Gehweg dahinter
  (W3; die Karte merkt den Kode je Bildpunkt, es braucht kein weiteres Byte: die Hälfte wird als Durchgangsstraße im Stil „Dorf“
  geschrieben, eine Straße der Art 3 dort als Art 2 – `STRKARTE.at` nennt auf dieser Hälfte also Art 2).
  `s0` (Meter längs des ganzen Wegs am ersten Punkt eines Stücks) hält die Strichfolge über Kachelschnitte hinweg.
- **Flächen** (`areas`: `[Belag, Merker, Name, Ring x, y, z in dm, Löcher, Typ …]`; W2): Plätze, Fußgängerbereiche, Parkplätze. In der
  Karte Art 9 mit dem Belag der Fläche und dem Abstand zu ihrem Rand (`STRSTIL.rasterArea`, nach den Wegen gerastert): eine Straße, die
  über die Fläche führt, verschwindet dort in der Fläche (kein Bord, keine Linie – und keine Treppenkante, wo sich zwei Kodes
  treffen). `KERN.surface` meldet auf einer Fläche `{ kind: 9, surf, e: 1, area: true }` (Haftung wie der Belag; Laternen dürfen
  darauf stehen), `FAHRT.areaAt(x, y)` die Fläche selbst.
- **`STRDAT.add(name, json)` / `STRDAT.drop(name)`** (W6): `orte` (bebaute Flächen: `t` 2 Stadt, 1 Dorf) und Ausstattung im Format von
  `strassen/ausstattung.json` je Gebiet; `FAHRT.add` reicht ein Feld `orte` seiner Datei als Satz `fahrt:<name>` weiter. `STRDAT.rev`
  zählt die Änderungen (die Karte rechnet die Stile ihrer Wege dann neu), `STRDAT.onChange(fn)` sagt es der Ausstattung: ihre Dinge
  kommen in dieselben Zellen (jedes trägt den Namen seines Satzes), gebaute Zellen werden neu gebaut.
- **Das Bild der Schildflächen wächst** (`STRMOD.atlas(...).add(list)`): neue Flächen (ein Tempo, das es bisher nicht gab, ein
  Stationszeichen) kommen in die freien Felder; sind die Zeilen voll, wird das Bild nach unten größer. Die gebauten Schilder behalten
  ihre Texturkoordinaten – sie zählen in einem Bild von 32 Zeilen, die Transformation der Textur bildet sie auf die Zeilen ab, die es
  gibt (bis 256 Flächen). Die Farbe auf den Brückendecks folgt `FAHRT.rev` Brücke für Brücke (nur was kam oder ging, wird angefasst).
- **`STRKARTE.refresh()`**: rastert das Fenster sofort neu (ruft `FAHRT.add`/`drop` selbst).
- **`FAHRT.ground(fn)`**: eine Zone mit eigenem Boden jenseits der Kachelsätze, die `welt/fahrt.js` kennt, sagt, wo er ist –
  `fn(x, y)` → `true` (da), `false` (wird geladen) oder `undefined` (nicht ihr Land). Ohne das hieße es am Rand noch ladender
  Kacheln „Hier endet die Karte.“ statt „Gelände lädt …“.
- **Bebaute Flächen einmal schicken:** `orte` und `places` einer Stadt als eigener Satz (`FAHRT.add('stadt/orte', { ways: [], places,
  orte })`), nicht mit jeder Kachel – sonst liegt dieselbe Fläche vielfach in der Suche. Sätze von `STRDAT.add` ohne `orte` (nur
  Ausstattung) lassen die Stile der Straßen in Ruhe (`STRDAT.orev` zählt nur Änderungen der Flächen).
- **Werkzeug** (W5): `daten.py --fahrt <Straßendatei> --osm <Auszug.opl> --out <Datei>` rechnet die Ausstattung für ein anderes Gebiet
  (ohne das Quadrat der App; OpenStreetMap aus einer OPL-Datei von osmium statt aus den Zellen des API-Caches).
- **Gemessen mit dem echten Probesatz des Suhler Zentrums** (`suhl/strassen`: 1 328 Wege, 6 759 Teilstücke, 153 Flächen im Fenster):
  Raster des Fensters 1 536 m bei 1,5 m je Bildpunkt 79–104 ms für die Wege, 19 ms für die Flächen, 27 ms für die Stile – in Scheiben
  von 2,5 ms je Bild, also etwa eine Sekunde, bis die neue Karte steht; am Telefon (1 024 m, 2 m) 30 + 3 + 14 ms. Die größte
  Fläche 0,5 ms (jede Kante schreibt nur ihren Abstandsstreifen, das Innen kommt zeilenweise aus den Schnittpunkten – vorher 12 ms).
- **Test**: Abschnitt `sets` in `viz3/test/strassen.py` – ein ausgedachtes Städtchen auf einer Wiese an der L 1625 mit jedem Fall
  (Hauptstraße, Kreisverkehr, Einbahnstraßen mit einer und zwei Spuren, Straße mit einem Gehweg, gepflasterte Straße ohne Bord, Platz
  mit Loch, Parkplatz mit Zufahrt, Treppe; vier Laternen, ein Tempo-40-Schild und ein Stationszeichen mit neuen Flächen, ein
  Zebrastreifen) kommt, wird geprüft und fotografiert (`out/strassen/11…17`) und geht wieder – danach ist alles wie vorher.

## Daten

`python3 -I viz3/extra/strassen/daten.py --raw <cache> [--plot bild.png]` → `viz3/extra/strassen/dist/strassen/ausstattung.json` (221 KB).
Quellen: OpenStreetMap (API 0.6 `/map` in Zellen, derselbe Cache wie `viz3/extra/fahrt/strecke.py`; Overpass ist aus dem Chat-Rechner
nicht erreichbar) und die Straßen der App selbst (Quadrat: `dist/geo/roads.b64.json`; draußen: `fahrt/strassen.json`) – alles wird an
deren Achsen und Breiten ausgerichtet. Braucht `pyproj`, `numpy`. Nach neuen Fahrtdaten oder neuem OSM-Stand neu laufen lassen.

## Schnittstellen

- `STRDAT` (früh geladen, vor `world/roads.js`): `ready`, `when(fn)`, `placeAt(x, y)` → 0/1/2, `ortAt`, `data`; Runde 2: `add(name,
  json)`, `drop(name)`, `sets`, `rev`, `orev`, `onChange(fn)`.
- `STRSTIL` (rein): `code/decode`, `styles`, `solids`, `marks`, `raster`, `read`; Runde 2: `rasterArea`, `LEVEL` (Art 9), `NC`, die
  Felder `s0`, `nc`, `noL`, `noR` eines Wegs im Raster.
- `ROADS`: neu `W` (Uniform-Halter der Fensterkarte), `gloss(fs)`, `edgeAt(x, y)` (Randabstand zwischen den Pixeln), `at().style`.
- `STRKARTE`: `active`, `at(x, y)`, `flush()` (Tests), `n`, `ms`; Runde 2: `refresh()`, `optsOf(weg)`.
- `STRASSEN`: `state()` (Runde 2: `sets`, `faces`), `fill()` (Tests: alles Nahe sofort bauen), `audit(x0, y0, x1, y1)`.
- `FAHRT` (Runde 2): `add(name, json, opts)`, `drop(name)`, `sets()`, `rev`, `areaAt(x, y)`, `ground(fn)`; `FAHRT.data.areas`,
  `FAHRT.data.dests`.
- `?nostrassen`: ohne Ausstattung, ohne Fensterkarte, alle Straßen als freie Strecke.

## Tests

- `node --test viz3/test/unit/strassen.test.mjs` (12): Kodierung, Radius, durchgezogene Strecken, Stile, Raster; Geometrie nach außen
  gewunden, Rückstrahler zur richtigen Seite, Welle der Planke zur Straße, Schildfläche gegen die Fahrtrichtung und nicht gespiegelt.
- `python3 viz3/test/run.py --port 89xx --serve strassen` (31 Prüfungen, Abschnitte `start,moebel,stadt,nass,fahrt,gl`; Bilder in
  `out/strassen/`).
- Gemessen (13.11., SwiftShader im Chat-Rechner): auf 900 m Fahrt mit 70 km/h im Mittel 0,06 ms je Bild für die Ausstattung und
  0,02 ms für die Fensterkarte, längste Runde 4 ms, eine Karte 10–14 ms in Scheiben; ~10.000 Dreiecke auf freier Strecke.
  Zeichenaufrufe mit und ohne Ausstattung (ein Bild, Stufe „hoch“): in der Stadt im Quadrat 141 → 170 am Tag, 152 → 186 nachts; in
  Schleusingen 131 → 153 bzw. 132 → 161; an der Landstraße 105 → 125; Dreiecke +0,4 bis +2,8 %.

## Offen

- **Einmündungen in spitzem Winkel:** zwei Mittellinien nebeneinander, wo zwei Wege fast parallel zusammenlaufen (wie vorher).
- **Schilder** sind nachts dunkel (die Rückstrahler der Leitpfosten leuchten im Licht des Autos, das man fährt).
- **Ampeln** (drei Fußgängerampeln in OSM) fehlen; **Gehwege** stehen in der Region überall in der Stadt beidseitig – die Fahrtdaten
  der Region tragen die Merker 256/512 noch nicht (`viz3/extra/fahrt/strecke.py` liest OSM `sidewalk` nicht), ebenso wenig 32 und 64;
  Suhls Daten bringen sie mit. In der Region gilt bis dahin: Einbahnstraßen der Arten 1 und 2 (dort sind auch die Kreisverkehre so
  markiert) ohne Mittellinie.
- **Fläche neben Fläche, Straße neben Fläche:** wo zwei verschiedene Beläge ohne Rand aneinanderstoßen, verläuft die Grenze in Stufen
  von 1,5 m (der Kode je Bildpunkt wird nicht geglättet) – deshalb gewinnt auf einer Fläche immer die Fläche.
- **Kloster Veßra:** der Asphalt der Zone bekommt die neue Straßenkarte, soweit die Fahrtdaten die Straße kennen; Wege nur der Zone
  (Klosterhof, Baumschule) bleiben, wie die Zone sie zeichnet.
- Durchgezogene Linien, Leitpfosten, die meisten Laternen und ein Teil der Schilder sind **nach Regel** gesetzt, nicht nach Vermessung.
- Vorschläge für die nächsten Pakete (Bäume draußen, Gewässer, Eisenbahn, Verkehr nach Schildern): Projekt-Dokument
  `claude/pavillon-realismus.md`.
