# Autos, Stellplätze und Dinge aus dem Luftbild in 3D (`welt-dinge`)

Hilfs-Agent `welt-dinge` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, Nacht 5./6.11.2026, Branch `feat/welt-dinge`
(Auftrag `docs/plans/auftraege/welt-dinge.md`, gemeinsame Regeln `nacht-6-11-gemeinsam.md`).

Falko (5.11. 22:52): Autos und Parkplätze, über die man als flaches Bild läuft, sollen in 3D an ihrer echten Stelle stehen; (23:02) die Autos
des Luftbilds als **Stellplätze, belebt nach Tageszeit**; (23:17) „Wichtig ist … immer der Realismus“.

## Was es gibt

- **Gebiete** (je eine Datei `dist/dinge/<gebiet>.json`, geladen, wenn man näher als r an die Mitte kommt): `ratscher` (das Dorf, die
  Agrargenossenschaft mit zwei Güllebehältern, die ETHOS nicht kennt, der Holzlagerplatz), `schleusingen` (die Stadt), `geisenhoehn` (das
  Dorf im Westen des Quadrats), `talsperre` (Campingplatz an der Talsperre Ratscher), `vessra` (Kloster Veßra mit Baumschule),
  `zollbrueck` und alle Orte der Kachelwelt mit Gebäuden (Block B und Zone Veßra): `gottfriedsberg`, `rappelsdorf`, `stkilian`,
  `gerhardtsgereuth`, `fischbach`, `neuendambach`, `gethles`, `ehrenberg`, `grimmelshausen`, `themar`, `siegritz`, `neuhof` (ihr bebauter
  Bereich aus den Gebäuden von `welt-gebaeude` + 50 m), dazu die Siedlungen ohne Ort in den Daten der Fahrt – `hinternah`, `wiedersbach`,
  `heckengereuth` (benannt nach den Ortsnamen des OSM-Auszugs) –, die Außenteile von Schleusingen (eine Datei, geladen auch von drei
  weiteren Punkten `t` aus) und `strecke` (die Strecken zum Markt und nach Veßra außerhalb der Orte) – siehe „Stand“ unten.
- **Erkennung** (`tools/welt-dinge/`): das Luftbild Thüringen 2024 (DOP 20 cm, Flug 07.04.2024 – dasselbe Bild wie das Bodenbild des
  Spiels `ortho_near.jpg`) auf Modellachsen über den WMS der GDI-Th (`wdlib.fetch`), darauf ein vortrainierter Luftbild-Detektor
  (Ultralytics YOLO11-OBB auf DOTA v1: „small/large vehicle“, „swimming pool“, „storage tank“ …; `detect.py`). Ratscher: fünf Durchgänge
  (Modell m/l, 0,1 und 0,2 m/px, niedrige Schwellen), jeder Kandidat auf Kontaktbögen von Auge geprüft (`review.py`), dazu von Auge gesetzt:
  Holzlagerplatz südlich der Hauptstraße, die fünf Güllebehälter der Agrargenossenschaft, ein Anhänger. Größere Gebiete (Stadt) nach
  Regeln aus dem Dorf (`decide.py`: „small vehicle“ ≥ 0,4 war im Dorf immer ein Auto), eine Stichprobe und die Zweifelsfälle von Auge
  (Lkw-Höfe, Busdepot, Holzhof, Wohnwagen, Pools); dort je ein Durchgang mit 0,1 und mit 0,2 m/px.
  Entscheidungen: `viz3/extra/welt-dinge/pruefung_<gebiet>.json` (`ja` mit Art, `nein` mit Lage, `dazu` von Auge).
  `prep.py` macht daraus die Spieldaten und die Masken. **Nichts auf Gebäuden** (Lead, 6.11. ~0:00): was zu mehr als einem Viertel auf
  einem Grundriss steht, der in 3D gebaut wird – OSM-Gebäude von Ratscher, Altstadt Schleusingen, die ETHOS-Gebäude von `welt-gebaeude`
  (`--geb <ordner>` mit dessen `dist/gebaeude/`, nach dem Zusammenführen aus dem eigenen Checkout) –, fällt weg samt Maske (in Ratscher
  drei der fünf Güllebehälter, die `welt-gebaeude` mit echtem Umriss und Höhe baut, und ein Auto unter einem Carport).
- **Stellplätze** (`viz3/src/dinge/dinge.js`, `DINGE`): jedes Auto ist ein Platz – Einfahrt/Hof (`hof`), Straßenrand (`strasse`, Mitte
  höchstens 2,5 m außerhalb des OSM-Fahrbahnrands), Betriebshof (`betrieb`) oder Straßenrand in der Stadt (`stadt`). Ob gerade ein Auto
  dort steht, folgt Wochentag und Stunde (Kurven je Art in `CURVES`: werktags fahren Pendler 6–8 Uhr weg und kommen 15:30–18:30 zurück,
  Betriebshöfe sind werktags voll, sonntags bleiben die meisten daheim, in der Stadt sind die Ränder fast immer belegt); dieselben Plätze
  sind eher die der Pendler (Gewohnheit), der Rest wechselt von Tag zu Tag. Ein Auto kommt oder geht **nur, wo es niemand sieht** (außer
  Sicht oder weiter als 320 m; im Blickfeld oder näher als 14 m bleibt es, `DINGE.held` zählt das). Das Auto behält Bauart (aus der
  gemessenen Länge: Kleinwagen < 4,05 m, Kompakt < 4,45 m, Kombi oder SUV, Transporter) und Farbe aus dem Foto: Hell und Dunkel jedes
  Fotos werden erst auf das von Ratscher gelegt (andere Flugtage sind dunkler oder klarer), Dunst abgezogen, dann die nächste der üblichen
  Farben; die Graustufen (schwarz, dunkelgrau, silber, weiß) je Gebiet nach Rang wie im deutschen Bestand (32/19/22/27 % der Unbunten) –
  sonst wäre St. Kilian zu 45 % schwarz und Veßra zu 47 % weiß gewesen. Ratschers 40 sind einzeln von Auge geprüft und behalten ihre.
- **Parkplätze aus OSM** (`tools/welt-dinge/osm_parkplaetze.py` auf GitHub Actions, Workflow `welt-dinge-osm.yml`: der Tagesauszug
  Thüringen von Geofabrik, mit osmium auf die Gebiete geschnitten – Overpass nur als Ersatz, beides ist von hier nicht erreichbar;
  Artefakt `osm-parkplaetze`; `plaetze.py` macht daraus Stellplätze, abgelegt in `viz3/extra/welt-dinge/plaetze_<gebiet>.json`): das Foto
  ist von einem Sonntagvormittag – der Supermarkt-Parkplatz ist leer und gäbe keine Plätze. Jeder öffentliche Parkplatz
  (`amenity=parking`, nicht privat, nicht Tiefgarage/Parkhaus) wird mit Reihen gefüllt (2,5 m breit, 5 m tief, 6 m Gasse), ein Streifen
  am Straßenrand (`parking=street_side/lane` oder schmaler als 4,6 m) mit einer Reihe Längsparker im Abstand von 6 m; nie mehr Plätze als
  `capacity`. Er bekommt die Art dessen, wozu er gehört (nächster Laden, Kirche, Schule, Arzt/Amt, Gaststätte, Sportplatz, Friedhof binnen
  80 m oder sein Name; „Parkplatz …“ ist `allgemein`, `access=employees` ein Betriebshof, der Markt Stadtrand; ein großer Platz
  (> 3000 m²) an einem See, Bad oder Sportplatz binnen 250 m gehört diesem, nicht dem Kiosk daneben – Bergsee Ratscher): `laden` (Mo–Sa
  Öffnungszeiten, Samstagvormittag voll, sonntags leer), `kirche` (Sonntagsgottesdienst), `schule`, `dienst`, `gaststaette`, `sport`,
  `friedhof`, `allgemein`. Bauart und Farbe zufällig nach dem Bestand auf deutschen Straßen, je Platz fest.
- **Modelle** (`viz3/src/dinge/dinge_modelle.js`, `DMOD`): Kleinwagen, Kompakt, Kombi, SUV, Transporter ohne Marke in echten Außenmaßen
  (Karosserie, Glas, A-/B-/C-Säulen, Radläufe, Lampen, Schilder ohne Nummer); Dinge: Pool rund/eckig, Anhänger, Wohnwagen, Wohnmobil,
  Traktor, Lkw, Rund-/Quaderballen, Holzstapel (abgedeckt), Stammholz, Güllebehälter, Trampolin, Container. Ein Material (`plain()`),
  Lackfarbe als Instanzfarbe nur auf reinweißen Ecken. **Weiche Schatten** unter jedem Auto und Ding (ein instanziertes Viereck je Zelle
  wie die Klecks-Schatten der Figuren in `npc/npc.js`): unter dem Wagen dunkel, zur Schattenseite um Höhe × Kotangens der Sonnenhöhe
  gezogen, nachts nur das Dunkel darunter – sonst schweben die Autos außerhalb der Schattenbox (±16 m um den Gehenden). Die drei Programme
  (Autos, Dinge, Schatten) werden beim Laden mit der Szene übersetzt (Warm-Meshes) – danach kommt keins dazu.
- Je Zelle (Dorf 120 m, Stadt 200 m) gebaut, wenn man näher als 380 m kommt (Telefon 260 m), frei ab +160 m; Autos instanziert (ein
  Draw-Call je Bauart und Zelle), Dinge zusammengefasst, ein Draw-Call Schatten je Zelle; kommt der Boden später (Kacheln der Stadt),
  wird die Zelle neu aufgesetzt.
  Fest für Gehende und Fahrzeuge (`VEH.extra`), der Verkehr (`verkehr/verkehr_auto.js`) hält vor ihnen und fährt herum. In der
  Zombie-Nacht bleiben sie, wie sie sind. Steht ein Dorfauto (`dorf/dorf_cars.js`) auf demselben Platz, bleibt unseres weg.

- **Freihalten** (der Lead, 6.11. ~1:45: ein Auto stand 2,5 m vor der Rathaustür in Schleusingen und versperrte den Weg hinein): was die
  Orte selbst modellieren, bleibt frei – mit den Zonen von `welt-gebaeude` (`tools/welt-gebaeude/prep.py keepout()`, übernommen in
  `tools/welt-dinge/wdlib.py keepout()`): Rathaus und St. Johannis 8 m, Bertholdsburg 20 m, Heckenturm 6 m, der Markt 3 m, Brunnen 4 m,
  Bänke 1,5 m, Laternen 0,6 m; in Kloster Veßra Kirchenruine, Türme und Portal 8 m, der Klosterbezirk (Museum) 15 m, die Baumschule 8 m,
  Mauern, Tore, Zäune (der Besucherparkplatz nicht – dort gehören die Autos hin); in Ratscher die Dinge des Dorfkerns
  (`world/dorfkern_data.js`). Dazu jede **Bushaltestelle** (`bus/fahrplan.json`, `feat/bus`): 15 m vor und nach dem Halt kein Parken
  (StVO § 12), Fahrbahn und beide Ränder. Was dort im Foto stand, wird kein Platz (seine Maske bleibt, der Boden wird trotzdem
  retuschiert). Zur Laufzeit (`dinge.js`): **2 m vor jeder Tür** der Häuser der Stadt (`SCHL.bld[].doorFac`) und des Dorfs
  (`VILLAGE.bld[].fac[].door`) bleibt frei – geprüft, wenn eine Zelle gebaut wird, und wieder bei ihrer regelmäßigen Prüfung (die Häuser
  der Stadt können nach der Zelle kommen). Die ETHOS-Häuser von `gebaeude/gebaeude.js` geben ihre Türen nicht heraus – dort nicht.

- **Fahrspuren frei** (der Lead, 6.11. ~2:00: das Testauto der Fahrt zum Markt rammte ein geparktes Auto 1,5 m neben der Mittellinie):
  die Box eines abgestellten Fahrzeugs mit dem Rand der Maske (0,35 m) bleibt 1,75 m von der Mittellinie eines schmalen Wegs (w < 6 m:
  eine freie Spur von 3,5 m) und w/2 − 0,5 m von einem breiteren (höchstens halb auf dem Bordstein) – für jeden befahrbaren Weg
  (Autobahn … Zufahrt) aus `world/roads.js`, `welt/fahrt.js` und den Straßen der Stadt (`stadt.json`, 5 m). Wer im Foto mitten auf der
  Straße stand, fuhr gerade – oder die OSM-Linie liegt daneben: dort kein Platz (die Maske bleibt). In Schleusingen fallen so 488 weg
  (mit den Außenteilen); breitere gemessene Straßen brächten nach dieser Regel keine zurück (sie wird bei w ≥ 6 strenger), und der
  Verkehr fährt auf den OSM-Linien (Arten 1–5, mit Zufahrten).

## Masken für die Boden-Retusche (`welt-gebaeude`)

- `viz3/extra/welt-dinge/maske_dinge.json`: `{ "src": "welt-dinge", "polys": [[[x, y], …], …], "pad": 0.35, "gebiete": { … } }` in
  Modellmetern; `maske_dinge_utm.json`: dieselben Vielecke in UTM 32N (EPSG:25832) für die Kacheln. Je Auto/Ding die Box mit 0,35 m Rand,
  zur Schattenseite (NNW, ~1 m je m Höhe beim Flug 07.04.2024) gestreckt – alle erkannten, auch Plätze, die gerade leer sind, und auch
  die, die keine Plätze wurden (freigehaltene Orte, Bushaltestellen, Fahrspuren: das Foto zeigt sie trotzdem).
- Ratscher ist mit diesen Masken retuschiert (Integration 2 des Leads, 6.11. ~2:00); für die Kacheln der übrigen Gebiete muss die
  Retusche mit `maske_dinge_utm.json` noch laufen – bis dahin zeigt das Bodenbild dort die flachen Autos noch.

## Benutzen und testen

- Im Spiel einfach hingehen; `DINGE.state()` (Zahlen), `DINGE.info(i)`, `DINGE.share(art, t)`, `DINGE.want(i, t)`, `DINGE.seen(i)`,
  `DINGE.settle()` (alles Nahe bauen), `DINGE.areaState()`.
- Tests: `welt_dinge` (Dorf: Daten, 3:00/10:00/19:00/Sonntag 11:00, nichts ändert sich im Blick, Auto hält auf, Programme, Türen,
  Bushaltestelle frei, Zombie-Nacht, Bilder) und `welt_dinge_stadt` (Schleusingen mit den Kacheln der Website: Plätze, Boden, Rathaustür
  frei, Draw-Calls, Laden-Parkplatz Samstag/Sonntag, Bilder) – `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8998 --serve
  welt_dinge`; auf GitHub über `viz3/extra/welt-dinge/tests.txt` (dazu `schleusingen`, `vessra`, `dorfkern`, `fahrt`, `verkehr`).
- Daten neu machen: Luftbild holen und erkennen (`wdlib.fetch`, `detect.py` mit Ultralytics in einer eigenen venv; für ein großes Gebiet
  in Blöcken von 350 m `b_<x0>_<y1>.jpg/.json`, je ein Durchgang mit 0,1 m/px und einer mit 0,2 m/px `_s05.json`), Dorf: `review.py` und
  von Auge entscheiden, sonst `decide.py <gebiet> <ordner> --sheets <ordner>` (Regeln, Stichprobe und Zweifelsfälle als Kontaktbögen; was
  schon entschieden ist, kommt nicht wieder); Parkplätze: `plaetze.py <osm.json> <gebiet>` (Artefakt des Workflows); dann
  `prep.py <gebiet> <bild> x0 y1 s` bzw. `prep.py <gebiet> <ordner>` (Daten, Masken, Freihalten, Fahrspuren).

## Stand und offen

Stand 6.11.2026 ~4:45 (`feat/welt-dinge` 59fa2186). Plätze = Stellplätze (Autos, die je nach Tag und Stunde dort stehen), in Klammern
die aus OSM-Parkplätzen; Dinge stehen immer. Bauart und Farbe der Autos des Fotos aus dem Foto (Graustufen je Gebiet nach Rang, s. o.).

| Gebiet | Plätze (davon Parkplätze aus OSM) | Dinge | geprüft |
|---|---|---|---|
| Ratscher (Dorf, Agrargenossenschaft, Holzlagerplatz) | 35 (0): Hof 29, Straße 4, Betrieb 2 | 5 Holzstapel, 3 Stammholz, 2 Güllebehälter, 1 Pool rund, 1 Wohnmobil, 1 Lkw, 1 Pool eckig, 1 Wohnwagen, 1 Anhänger, 1 Pool oval | jeder Kandidat von Auge (fünf Durchgänge) |
| Schleusingen (Stadt mit Außenteilen) | 2581 (1033): Hof 1451, Laden 519, Sport 225, öffentl. 109, Schule 101, Stadtrand 97, Gaststätte 45, Arzt/Amt 34 | 99 Lkw, 3 Container, 1 Wohnmobil, 1 Anhänger, 1 Pool eckig, 1 Wohnwagen | Regeln, Stichproben 30 (29 Autos), 237 + 95 Zweifelsfälle von Auge |
| Geisenhöhn | 14 (0): Hof 12, Straße 2 | 1 Stammholz, 1 Holzstapel, 1 Traktor | drei Durchgänge, Stichprobe (alle Autos), Holzplatz von Auge |
| Campingplatz Talsperre Ratscher | 1 (0): Hof 1 | – | Regeln |
| Gottfriedsberg | 25 (0): Hof 24, Straße 1 | 1 Pool oval | alle 27 von Auge |
| Rappelsdorf | 53 (0): Hof 48, Straße 5 | 2 Wohnmobil, 1 Pool oval, 1 Lkw | Stichprobe 30 (alle Autos), 7 Zweifelsfälle |
| St. Kilian | 98 (11): Hof 83, öffentl. 8, Straße 4, Friedhof 3 | 4 Lkw, 2 Wohnwagen, 2 Wohnmobil, 2 Pool eckig, 1 Pool oval | Stichprobe 30 (alle), 13 Zweifelsfälle |
| Gerhardtsgereuth | 46 (0): Hof 40, Straße 6 | 1 Wohnwagen | Stichprobe 30 (27 Autos), 6 Zweifelsfälle |
| Fischbach | 11 (0): Hof 8, Straße 3 | 1 Anhänger | alle 10 und 2 Zweifelsfälle |
| Neuendambach | 6 (0): Hof 6 | 1 Stammholz | alle 10 und 1 Zweifelsfall |
| Gethles | 32 (0): Hof 32 | 1 Pool eckig, 1 Anhänger, 1 Pool oval | Stichprobe 30 (29), 2 Zweifelsfälle |
| Zollbrück | 1 (0): Hof 1 | – | Regeln |
| Neuhof | 16 (0): Hof 16 | 2 Pool eckig | alle 22 von Auge |
| Ehrenberg | 49 (0): Hof 47, Straße 2 | 2 Lkw, 1 Anhänger | Stichprobe 30 (alle), 7 Zweifelsfälle |
| Siegritz | 57 (0): Hof 52, Straße 5 | – | Stichprobe 30 (alle), 2 Zweifelsfälle |
| Kloster Veßra (Dorf, Kloster, Baumschule) | 119 (13): Hof 102, öffentl. 13, Straße 4 | 5 Lkw, 1 Wohnmobil | Stichprobe 30 (alle Autos), 15 Zweifelsfälle |
| Grimmelshausen | 50 (0): Hof 44, Straße 6 | 1 Pool eckig | Stichprobe 30 (28), 2 Zweifelsfälle |
| Themar (Stadt) | 938 (217): Hof 668, Laden 170, Stadtrand 53, öffentl. 18, Friedhof 12, Sport 8, Arzt/Amt 6, Schule 3 | 23 Lkw, 2 Pool eckig, 1 Wohnmobil, 1 Wohnwagen, 1 Anhänger | Stichprobe 30 (29), 64 Zweifelsfälle (Busdepot, Lkw-Höfe) |
| Hinternah | 252 (25): Hof 217, Arzt/Amt 25, Straße 10 | 4 Pool eckig, 3 Lkw, 1 Wohnwagen | Stichprobe 30 (28), 32 Zweifelsfälle |
| Wiedersbach | 56 (0): Hof 56 | – | Stichprobe 30 (28), 3 Zweifelsfälle |
| Heckengereuth | 175 (150): Sport 150, Hof 25 | – | alle 25 und 1 Zweifelsfall |
| an den Strecken zum Markt und nach Veßra | 1 (0): Hof 1 | 2 Lkw | alle 3 von Auge (nur ein Durchgang in 0,2 m/px) |
| **zusammen** | **4616** (1449) | **198** | |

- Nicht gemacht: Autos des Verkehrs (`verkehr/`) parken nicht auf freien Plätzen (eigenes System, nicht billig). Die ETHOS-Häuser
  (`gebaeude/gebaeude.js`) geben ihre Türen nicht heraus – vor ihnen hält nur die Fahrspurregel frei, keine Türregel. Gemessene
  Straßenbreiten (Vorschlag des Leads) brächten nach der Fahrspurregel keine Randparker zurück (s. o.).
- Die Masken (`maske_dinge.json` Ratscher in Modellmetern, `maske_dinge_utm.json` alle Gebiete in UTM) nimmt die Boden-Retusche von
  `welt-gebaeude` (`retusche.py`, für die Kacheln `kacheln.py`): Ratscher ist retuschiert (Integration 2), die Kacheln der übrigen
  Gebiete noch nicht – dort zeigt das Bodenbild die flachen Autos noch neben den 3D-Autos bzw. auf leeren Plätzen.
- Die Strecken außerhalb der Orte nur mit einem Durchgang in der Auflösung des Fotos (0,2 m/px) – wenige geparkte Autos, die fahrenden
  nur als Masken. Gebäude-Cluster mit weniger als 8 Häusern je 350-m-Block sind nicht abgesucht.
- Keine Bilder der neuen Dörfer aus dem Spiel (die Tests zeigen Ratscher und Schleusingen); Kontaktbögen der Prüfung lagen im
  Arbeitsordner des Agenten (nicht im Repo).

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/welt-dinge` vor `# feat/verkehr` (zwei Module, Ordner `viz3/src/dinge/`).
- `viz3/src/verkehr/verkehr_auto.js`: ein Import und zwei Zeilen in `obstacles()`, markiert `// feat/welt-dinge` (der Verkehr sieht die
  geparkten Autos).
- Neuer Workflow `.github/workflows/welt-dinge-osm.yml` (nur `feat/welt-dinge`, nur wenn `tools/welt-dinge/osm_parkplaetze.py` oder er
  selbst sich ändert; Tagesauszug Thüringen von Geofabrik, mit osmium auf die Gebiete geschnitten, Overpass nur als Ersatz; legt das
  Artefakt `osm-parkplaetze` ab, schreibt nichts ins Repo).
- Tests in `viz3/extra/welt-dinge/tests.txt`: `welt_dinge` (Ratscher) und `welt_dinge_stadt` (Schleusingen mit den Kacheln der Website),
  dazu auf Wunsch des Leads die Tests der Orte, die frei bleiben müssen (`schleusingen`, `vessra`, `dorfkern`), und der Fahrspuren
  (`fahrt`, `verkehr`); Einheitentest `viz3/test/unit/dinge.test.mjs`.
- Ein drittes Warm-Programm (`|dinge-schatten`, die weichen Schatten), beim Start übersetzt; ein Draw-Call Schatten je Zelle.
- Zur Laufzeit liest `dinge.js` nur `window.SCHL.bld` und `window.VILLAGE.bld` (Türen) – keine Änderung an diesen Modulen.
- Quellen: `credits_add` in `viz3/extra/welt-dinge/manifest.json` (DOP 2024 © GDI-Th dl-de/by-2-0, YOLO11-OBB, OSM).
- Retusche: `tools/welt-gebaeude/retusche.py` liest `viz3/extra/*/maske*.json` als Modellmeter – das Muster trifft auch
  `maske_dinge_utm.json` (UTM, für `kacheln.py`); diese Vielecke landen dort zweimal umgerechnet weit außerhalb der Bilder (harmlos, aber
  besser `*_utm.json` dort auslassen). Nach dem Zusammenführen beider Zweige die Retusche einmal neu rechnen (Befehl in
  `docs/features/welt-gebaeude.md`).
- Grundrisse für „nichts auf Gebäuden“: OSM-Häuser von Ratscher, die Altstadt (`stadt.json`) und die ETHOS-Gebäude aller Zellen von
  `welt-gebaeude` (aus dem eigenen Checkout, seit `src` sie hat) – damit in allen Gebieten geprüft, auch in Veßra und den neuen Dörfern.
- `prep.py` ist schnell geworden (es öffnete für jedes Auto jeden Fotoblock oben links davon: Schleusingen 35 min, jetzt 17 s).
