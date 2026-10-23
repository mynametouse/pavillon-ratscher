# Fahrt aus dem Quadrat – nach Schleusingen und nach Kloster Veßra

Stand 23.10.2026 (Hilfs-Agent `fahrt`, Branch `feat/fahrt`). Falko (9:27): „Es ist nicht allzu weit von Ratscher, vielleicht kriegst du ja
doch hin, dass man hinfahren kann.“ – zur Baumschule Kammbach in Kloster Veßra (Schulstraße 52), wohin der Gartenplaner zum Einkaufen
schickt; unterwegs Schleusingen.

## Was es gibt
- **Fahren über den Rand des 2,4-km-Quadrats**: Auto und Traktor fahren überall weiter, wo die Welt-Kacheln (`welt/welt.js`) Boden haben –
  bis Schleusingen, Geisenhöhn, Rappelsdorf (Block B, 9,6 × 9,6 km), mit den Kacheln von `feat/vessra` weiter bis Kloster Veßra.
- **Nichts beim Start**: `welt/fahrt.js` (`FAHRT`) wacht erst auf, wenn ein gefahrenes Fahrzeug auf den Rand zufährt (geradeaus vor ihm
  liegt der Rand näher als 350 m), 60 m davor ist oder man draußen ist; dann holt es die Straßendaten (`fahrt/strassen.json`, 290 kB) und
  bittet `WELT` um Kacheln – um einen Punkt **vor** dem Fahrzeug (bis 110 m, je nach Tempo), damit der Boden vor den Rädern da ist;
  hinten werden sie beim schnellen Fahren nach 12 s frei. 450 m zurück im Quadrat schläft es wieder ein (Kacheln, Schilder, Brücken frei).
- **Rand**: wo der Boden noch lädt, bremst das Fahrzeug rechtzeitig ab und wartet („Gelände lädt …“), es fällt nie durch; wo keine
  Kacheln mehr sind: „Hier endet die Karte.“
- **Straßen**: alle Autostraßen aus OpenStreetMap um Schleusingen bis Kloster Veßra (828 Wege, 175 km) mit einem **geglätteten
  Längsprofil** – derselbe Glätter wie die Kachel-Pipeline (`tools/welt/roads.py`: gemeinsame Knoten, Brücken gerade), gerechnet auf den
  Kachelhöhen (Wellen je km: Landstraßen 9,0 → 0,1, Ortsstraßen 13,8 → 3,1). Das Kachelnetz wird an den Straßen auf dieses Profil
  **eingeschnitten** (Fahrbahn mit Dachprofil, Bankett, Böschungen 1 : 1,5; `WELT.setPads` unter den Flächen der Zonen) – Räder, Füße
  und Augen stehen auf demselben Boden. Am Rand des Quadrats treffen die Profile das 10-m-Gelände (im Quadrat sind dessen Höhen die
  Daten des Glätters): keine Stufe, kein Überblenden. Fahrbahnbelag für Haftung und Rollwiderstand (`KERN.surface`); auf dem Luftbild
  nahe dem Fahrzeug Asphalt statt der Pflastersteine, die der Kachel-Shader sonst aus grauen Flächen macht (`WELT.setOverlay`, solange
  keine Zone ihre Straßen auflegt); Brücken mit Fahrbahnplatte und Geländer (die Geländer halten die Räder auf der Brücke, unten fährt
  man durch); Wände der Zonen (Schleusingen) halten Fahrzeuge auf (`KERN.pushOut`).
- **Ankommen**: am Markt „Markt Schleusingen.“, an der Baumschule ein Parkschild und „Baumschule Kammbach – hier parken.“
- **Ortsnamen** im HUD: „L 1625 · bei Rappelsdorf“, „Burgstraße, Schleusingen“, „Feldflur bei …“ (`KERN.place`).
- **Ortstafeln** (gelb, schwarzer Rand) an den Ortseingängen: vorn Name und Gemeinde („Stadt Schleusingen“) bzw. Landkreis, hinten der
  nächste Ort und der durchgestrichene Name; wo OSM sie kennt, an ihrem Ort, sonst am Rand der Bebauung. **Wegweiser** an den Kreuzungen
  der beiden Routen („Kloster Veßra 8,4 ↑ / Schleusingen 0,7 →“). Gebaut nur im Umkreis von 450 m.
- **Karte beim Fahren**: draußen die Straßen und die beiden Routen (Garten → Markt Schleusingen 3,7 km, Garten → Baumschule 10,8 km),
  unten das Ziel in Fahrtrichtung mit Entfernung.

## Hinfahren
Ins Auto (Menü „Zum Auto“), dann über den Ratschner Anger und den Geisenhöhner Weg auf den Flurweg; für Schleusingen nach Norden
(Weißer Berg, Schützenstraße, Burgstraße zum Markt), für Kloster Veßra auf der L 1625 nach Westen, an Rappelsdorf und Zollbrück vorbei,
in Kloster Veßra rechts in die Schulstraße. Die Karte links oben zeigt beide Routen.

## Grenzen
- Gelände über Schleusingen und westlich davon: Copernicus 30 m (Oberflächenmodell) – die Straßen sind geglättet, das Land daneben
  bleibt grob; Bäume und Häuser außerhalb der Zonen gibt es dort nur auf dem Luftbild.
- Brücken über andere Straßen: die Höhe kennt das 30-m-Modell nicht – manche Überführung ist niedrig (das Auto passt darunter durch).
- Ein draußen abgestelltes Auto steht nach dem Neuladen wieder vor dem Garten.

## Für den Kern-Chat (gemeinsame Dateien)
- `vehicles/vehicle.js`: Rand der Karte (`VEH.edge`: `null` | `'wait'` | `'end'`, ohne FAHRT wie vorgeschlagen `KERN.free`), Tempo-Grenze
  (`VEH.limit(v, inp)`), Wände außerhalb (`VEH.hitsOut` in `boxHits`) – drei markierte Stellen.
- `vehicles/minimap.js`: `export const MMAP`, Haken `MMAP.more` (zeichnet draußen) und `MMAP.dest` (Ziel-Beschriftung).
- `welt/welt.js` (gehört heute `feat/vessra`), drei markierte Stellen `// feat/fahrt`: `WELT.focus` (Punkt vor dem Fahrzeug statt der
  Spielfigur für den Kachelplan), `WELT.keep` (ms bis zum Freigeben, Standard 30 s), `setPads` mit `under: true` (Straßen unter den
  Flächen der Zonen).
- `modules.txt`: Marke `# feat/fahrt` mit `welt/fahrt.js` unter `vehicles/minimap.js`.

## Testen
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8982 --serve fahrt` – holt die Kacheln entlang der Routen nach
  `viz3/dist/welt-test/`; Abschnitte `start,edge,markt,west,free,gl`; Bilder in `out/fahrt/`. Bei GitHub: `feat.yml` (Artefakt „out“).
- Daten neu bauen: `python3 -I viz3/extra/fahrt/strecke.py --raw <Cache-Ordner>` (OSM-API in Zellen, Kacheln der Website).

## Quellen
Straßen, Orte, Ortstafeln © OpenStreetMap-Mitwirkende (ODbL 1.0); Höhen aus den Welt-Kacheln (© GDI-Th, CC BY 4.0; Copernicus DEM
GLO-30). Liste in der App über `viz3/extra/fahrt/manifest.json` (`credits_add`).
