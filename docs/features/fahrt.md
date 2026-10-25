# Fahrt aus dem Quadrat – nach Schleusingen und nach Kloster Veßra

Stand 23.10.2026 (Hilfs-Agent `fahrt`, Branch `feat/fahrt`). Falko (9:27): „Es ist nicht allzu weit von Ratscher, vielleicht kriegst du ja
doch hin, dass man hinfahren kann.“ – zur Baumschule Kammbach in Kloster Veßra (Schulstraße 52), wohin der Gartenplaner zum Einkaufen
schickt; unterwegs Schleusingen.

## Was es gibt
- **Fahren über den Rand des 2,4-km-Quadrats**: Auto und Traktor fahren überall weiter, wo die Welt-Kacheln (`welt/welt.js`) Boden haben –
  bis Schleusingen, Geisenhöhn, Rappelsdorf (Block B, 9,6 × 9,6 km) und mit dem Kachel-Satz `zonen/vessra/` (`WELT.addSet`) auf der L 1625
  weiter bis Kloster Veßra (Block Veßra, 8,0 × 6,4 km).
- **Nichts beim Start**: `welt/fahrt.js` (`FAHRT`) wacht erst auf, wenn ein gefahrenes Fahrzeug auf den Rand zufährt (geradeaus vor ihm
  liegt der Rand näher als 350 m), 60 m davor ist oder man draußen ist; dann holt es die Straßendaten (`fahrt/strassen.json`, 290 kB) und
  bittet `WELT` um Kacheln – um einen Punkt **vor** dem Fahrzeug (bis 110 m, je nach Tempo), damit der Boden vor den Rädern da ist;
  hinten werden sie beim schnellen Fahren nach 12 s frei. 450 m zurück im Quadrat schläft es wieder ein (Kacheln, Schilder, Brücken frei).
- **Rand**: wo der Boden noch lädt, bremst das Fahrzeug rechtzeitig ab und wartet („Gelände lädt …“), es fällt nie durch; wo keine
  Kacheln mehr sind: „Hier endet die Karte.“
- **Straßen**: alle Autostraßen aus OpenStreetMap um Schleusingen bis Kloster Veßra (828 Wege, 175 km) mit einem **geglätteten
  Längsprofil** – derselbe Glätter wie die Kachel-Pipeline (`tools/welt/roads.py`: gemeinsame Knoten, Brücken gerade), gerechnet auf den
  Kachelhöhen (Wellen je km: Landstraßen 9,0 → 0,1, Ortsstraßen 13,8 → 3,1). Das Kachelnetz wird an den Straßen auf dieses Profil
  **eingeschnitten** (Fahrbahn mit Dachprofil, Bankett, Böschungen 1 : 2; `WELT.setPads` unter den Flächen der Zonen) – Räder, Füße
  und Augen stehen auf demselben Boden. Am Rand des Quadrats treffen die Profile das 10-m-Gelände: im Quadrat hält der Glätter sie an
  dessen Höhen fest, geglättet wird draußen – an allen 29 Übergängen weniger als 5 cm Unterschied (frei geglättet waren es bis 4,7 m). Fahrbahnbelag für Haftung und Rollwiderstand (`KERN.surface`); auf dem Luftbild
  nahe dem Fahrzeug Asphalt statt der Pflastersteine, die der Kachel-Shader sonst aus grauen Flächen macht (`WELT.setOverlay`, solange
  keine Zone ihre Straßen auflegt); Brücken mit Fahrbahnplatte und Geländer (die Geländer halten die Räder auf der Brücke, unten fährt
  man durch); Wände der Zonen (Schleusingen) halten Fahrzeuge auf (`KERN.pushOut`).
- **Ankommen**: am Markt „Markt Schleusingen.“; die Route nach Kloster Veßra endet vor dem Tor der Baumschule an der Schulstraße
  (Parkschild), durchs Tor geht es auf die Parkplätze im Verkaufshof (`welt/vessra.js`: `VESSRA.baumschule.parkplatz`) – „Baumschule
  Kammbach – hier parken.“
- **Ortsnamen** im HUD: „L 1625 · bei Rappelsdorf“, „Burgstraße, Schleusingen“, „Feldflur bei …“ (`KERN.place`).
- **Ortstafeln** (gelb, schwarzer Rand) an den Ortseingängen: vorn Name und Gemeinde („Stadt Schleusingen“) bzw. Landkreis, hinten der
  nächste Ort und der durchgestrichene Name; wo OSM sie kennt, an ihrem Ort, sonst am Rand der Bebauung. **Wegweiser** an den Kreuzungen
  der beiden Routen („Kloster Veßra 8,4 ↑ / Schleusingen 0,7 →“). Gebaut nur im Umkreis von 450 m.
- **Karte beim Fahren**: draußen die Straßen und die beiden Routen (Garten → Markt Schleusingen 3,7 km, Garten → Baumschule 10,7 km),
  unten das Ziel in Fahrtrichtung mit Entfernung.

- **Szenarien** `?szenario=fahrt` („Im Auto auf der Straße nach Schleusingen“): im Auto auf der L 3004, 160 m vor der Ortstafel von
  Schleusingen; `?szenario=fahrt-vessra` („Im Auto auf der L 1625 nach Kloster Veßra“): auf der L 1625 kurz vor dem Westrand des Quadrats,
  8,4 km bis zur Baumschule. **Ereignis** `fahrt:ankunft` `{ ziel: 'markt' | 'baumschule', x, y }` beim Ankommen (`KERN.on`).

## Hinfahren
Ins Auto (Menü „Zum Auto“), dann über den Ratschner Anger und den Geisenhöhner Weg auf den Flurweg; für Schleusingen nach Norden
(Weißer Berg, Schützenstraße, Burgstraße zum Markt), für Kloster Veßra auf der L 1625 nach Westen, an Rappelsdorf und Zollbrück vorbei,
in Kloster Veßra rechts in die Schulstraße. Die Karte links oben zeigt beide Routen.

## Straßen im Quadrat (Runde 2, 23.10. nachmittags)
Die L 3004 warf das Auto vor der Ortstafel Schleusingen in die Luft (−360, 833: Gefälle 5 → 17 % auf 10 m, bei 60 km/h 0,5 s Flug),
dazu Sprünge bis 34 % an einer Brücke und am Steilstück nördlich des Gartens. Ursachen im veröffentlichten 10-m-Gelände (V16f,
`tools/geo/smooth_roads.py`): ein Gitterpunkt nahe mehrerer Straßen nahm den Mittelwert ihrer Profile (der Feldweg neben der L 3004 zog
ihre Fahrbahn auf seine Höhe), dabei je Weg dessen nächsten Knoten (das Ende eines Wegs an der Kreuzung 8 m weiter zählte voll), die
Krümmung war an den Stößen zwischen zwei OSM-Wegen frei (ein Knick an jeder Teilung), die Punkte bis 6 m neben einer Brücke blieben im
Tal (eine Mulde vor dem Brückenkopf), T-Kreuzungen wurden nur bis 0,3 m verbunden (Dezimeter mit 3 verglichen).
`viz3/extra/fahrt/innen.py` bessert das veröffentlichte Gelände nach (gleiches Netz, gleiche Profile wie smooth_roads.py): Klassen in
Rangfolge (die höhere Straße bestimmt ihre Fahrbahn), je Klasse der nächste Knoten, Krümmung über die Stöße, Brückenköpfe auf das Profil
(unter den ersten und letzten 9 m einer Brücke steigt der Boden zur Straße), T-Kreuzungen bis 3 m. Ergebnis auf den Routen im Quadrat
(Sprünge der Steigung > 5 % über ±4 m): Garten → Schleusingen 36 → 2 (größter 34 → 5,8 %), Garten → Kloster Veßra 1 → 0; amtliches Maß
(„Straßen glatt“, `smooth_roads.py --measure`): Hauptstraße 3,9 → 0,2, Kreisstraße 4,6 → 2,6 Wellen je km; 6905 Gitterpunkte geändert
(Ø 0,25 m, p95 0,76 m; an Hauswänden begrenzt wie in smooth_roads.py). Die Datei reist als Extra (`viz3/extra/README.md`):
`viz3/extra/fahrt/dist/geo/terrain.b64.json` ersetzt im Bau die der Website – so haben CI, Vorschau und die nächste Veröffentlichung sie.
Soll sie ein gewöhnliches Website-Asset werden: nach `gh-pages` `geo/terrain.b64.json` (und `vorschau/geo/`) kopieren und aus dem
Extra löschen. Neu bauen: `python3 -I viz3/extra/fahrt/innen.py <veröffentlichtes geo/> viz3/manifests.json` (nicht `viz3/dist/geo`, dort
liegt nach dem Bau schon diese Datei – das Skript erkennt sie an ihrer Marke und bricht ab).

Die Längsprofile draußen hält `strecke.py` an den Rändern am inneren Gelände fest; es liest es aus `viz3/dist/geo/terrain.b64.json`,
also nach dem Bau das nachgebesserte. Reihenfolge beim Neubauen: `innen.py` → bauen (`build.py` legt das Extra nach `dist/geo/`) →
`strecke.py` (sonst eine Stufe am Rand: die Nachbesserung hatte die Übergänge um bis 1,4 m verschoben).
**Brückenköpfe im Quadrat**: `world/roads.js` setzt das Ende einer Brückenplatte auf das höchste Gelände quer über ihre Breite + 8 cm –
0,1 bis 0,5 m über der Straße davor (14 von 16 Enden der 8 Brücken im Quadrat). Räder und Füße rollen dort über die letzten 5 m eine
Rampe hinauf (`KERN.ground` in `welt/fahrt.js`, nur im Quadrat, nie auf einer Platte); die gezeichnete Straße bleibt, an der Kante liegen
die Räder also bis zur Stufenhöhe darüber. Sauberer wäre in `world/roads.js` (`endZ`) die Höhe der Straßenmitte + 2 cm statt des
Höchsten quer + 8 cm – das ist die Datei des Kern-Chats.

**Zonen mit eigenen Straßen** (Kern-Chat 23.10. 14:05): Kloster Veßra behandelt seine Straßen selbst (Straßenkappe, Böschungen, der Hof
der Baumschule; Häuser stehen auf `VESSRA.gz`). Dort bleibt das Einschneiden der Fahrt draußen – es blendet über die 100 m vor dem
Quadrat der Zone (`VESSRA.ORT` ± 650 m) aus, die Brückenplatten der Fahrt dort entfallen; am Rand der Zone ist ihre Anpassung null, das
Profil trifft also ihren Boden ohne Stufe. Schleusingen (nur Rathaus, Burghof, Markt als Flächen) baut weiter auf den eingeschnittenen
Straßen auf.

## Grenzen
- Gelände über Schleusingen und westlich davon: Copernicus 30 m (Oberflächenmodell) – die Straßen sind geglättet, das Land daneben
  bleibt grob; Bäume und Häuser außerhalb der Zonen gibt es dort nur auf dem Luftbild.
- Brücken über andere Straßen: die Höhe kennt das 30-m-Modell nicht – manche Überführung ist niedrig (das Auto passt darunter durch).
- Ein draußen abgestelltes Auto steht nach dem Neuladen wieder vor dem Garten.
- Im Quadrat bleibt es das 10-m-Gitter: an steilen Stellen (die Hauptstraße nördlich des Gartens, 11 %) wechselt die Steigung noch um
  bis 6 % über wenige Meter – spürbar, aber ohne Abheben.
- Der Hof der Baumschule: der Test fährt durchs Tor in den Hof, wenn die Einfahrt flacher als 25 % ist, sonst hält er davor und
  schreibt eine NOTE ins Protokoll (23.10. mittags war das Tor durch die ebene Hoffläche eine Rampe von 52 %; behoben in vessra 11f7b20,
  Hof am Tor auf Straßenhöhe, höchstens 8,8 %).

## Für den Kern-Chat (gemeinsame Dateien)
- `vehicles/vehicle.js`: Rand der Karte (`VEH.edge`: `null` | `'wait'` | `'end'`, ohne FAHRT wie vorgeschlagen `KERN.free`), Tempo-Grenze
  (`VEH.limit(v, inp)`), Wände außerhalb (`VEH.hitsOut` in `boxHits`) – drei markierte Stellen.
- `vehicles/minimap.js`: `export const MMAP`, Haken `MMAP.more` (zeichnet draußen) und `MMAP.dest` (Ziel-Beschriftung).
- `welt/welt.js`, fünf markierte Stellen `// feat/fahrt`: `WELT.focus` (Punkt vor dem Fahrzeug statt der Spielfigur für den
  Kachelplan), `WELT.keep` (ms bis zum Freigeben, Standard 30 s), `setPads` mit `under: true` (Straßen zuletzt einsortiert), `padZ`
  (erst die Straßen, dann baut die Fläche einer Zone darauf auf: ihr Rand blendet in die eingeschnittene Straße statt ins rohe Gelände)
  und `setOverlay(tex, x0, y0, size, pave)` mit der Uniform `uPave`: der Kachel-Shader machte graue Flächen nahe der Kamera überall zu
  Pflaster – auf dem Land neben den Straßen sah das wie Kopfsteinpflaster auf Feldern aus; das Asphalt-Overlay der Fahrt setzt 0, die
  Zonen bleiben bei 1 (ohne fünften Wert wie bisher).
- `modules.txt`: Marke `# feat/fahrt` mit `welt/fahrt.js` unter `vehicles/minimap.js`.
- Neuer `window`-Name: `FAHRT` (`status()`, `data`, `roadAt`, `place`). Keine Speicher-Schlüssel. Shader-Programme: Schilder und Brücken
  teilen die der Schleusinger Schilder und Requisiten (Standard-Material mit Bild bzw. mit Vertexfarben); gemessen +1 bis +3.
- Eintrag für `docs/ARCHITECTURE.md` (Modulkarte, Abschnitt 6): `FAHRT` – welt/fahrt.js – Fahrt über das 2,4-km-Quadrat hinaus:
  Kacheln vor dem Fahrzeug, Rand der Karte, Straßen mit Längsprofil (eingeschnitten), Brücken, Ortstafeln, Wegweiser, Karte, Szenarien
  `fahrt` und `fahrt-vessra`.
- Das Gelände im Quadrat (Runde 2): `viz3/extra/fahrt/dist/geo/terrain.b64.json` (262 708 Bytes, die der Website 262 631: inneres
  10-m-Gitter nachgebessert, äußeres 120-m-Gitter unverändert) ersetzt im Bau `geo/terrain.b64.json` der Website; `viz3/extra/fahrt/
  manifest.json` ergänzt im gebauten Manifest die Marke `geoman.terrain.roads` (das `viz3/manifests.json` des Repos behält die alte –
  `smooth_roads.py` ohne `--measure` liest dieses und weigert sich wie bisher, ein zweites Mal zu glätten). Kein Code außerhalb der eigenen
  Dateien.
  - Grundlage bleibt die Datei der Website: `innen.py` liest sie (und `roads.b64.json`, `buildings.b64.json`) als Eingabe. „Straßen
    glatt“ im Prüfpaket misst `"$GEO"` = `geo/` der Vorschau bzw. Website, also bis zur nächsten Veröffentlichung die alte Datei (beide
    bestehen: Hauptstraße 3,9 bzw. 0,2, Kreisstraße 4,6 bzw. 2,6 Wellen je km); damit es die gebaute misst, vor dem Messen
    `cp viz3/extra/*/dist/geo/terrain.b64.json "$GEO"/ 2>/dev/null || true` (wie build.py das Extra über dist/ legt).
  - Ändert sich das Gelände der Website (neuer Geo-Bau, neues Glätten), muss das Extra neu gebaut werden, sonst überdeckt es die neue
    Datei mit der alten Grundlage: `python3 -I viz3/extra/fahrt/innen.py <Ordner mit terrain.b64.json, roads.b64.json,
    buildings.b64.json wie auf der Website> viz3/manifests.json` (etwa die drei Dateien von …/pavillon-ratscher/geo/ in einen Ordner
    laden; nicht `viz3/dist/geo` – dort liegt nach dem Bau schon das Extra, das Skript erkennt es an seiner Marke `fahrt` und bricht ab);
    numpy, scipy, ~10 s; es druckt die Sprünge auf den Routen und die Wellen je km vorher/nachher. Oder das Extra löschen (dann gilt
    wieder die Datei der Website).
- `viz3/extra/fahrt/tests.txt`: in den Runden mit Änderungen für andere auch deren Tests (Veßra, v16b, v16d); zum Übergeben nur `fahrt`.

## Testen
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8982 --serve fahrt` – holt die Kacheln entlang der Routen nach
  `viz3/dist/welt-test/`; Abschnitte `start,edge,markt,nord,garten,west,free,gl` (`nord`: vom Stellplatz im Garten auf der L 3004 bis
  zum Rand, mit 60 km/h auf den Landstraßen; `garten` und `west` zusammen sind die ganze Fahrt bis in den Hof der Baumschule Kammbach;
  beide Wege vom Garten messen Stöße > 8 m/s², Flüge und die Steigung entlang der Route auf dem Boden der App); Bilder in `out/fahrt/`.
  Bei GitHub: `feat.yml` (Artefakt „out“).
  Dauer bei GitHub knapp 10 Minuten (rund 14 Minuten Spielzeit, davon gut 11 für die ganze Fahrt vom Garten zur Baumschule).
- Daten neu bauen: `python3 -I viz3/extra/fahrt/strecke.py --raw <Cache-Ordner>` (OSM-API in Zellen, Kacheln der Website).

## Quellen
Straßen, Orte, Ortstafeln © OpenStreetMap-Mitwirkende (ODbL 1.0); Höhen aus den Welt-Kacheln (© GDI-Th, CC BY 4.0; Copernicus DEM
GLO-30). Liste in der App über `viz3/extra/fahrt/manifest.json` (`credits_add`).
