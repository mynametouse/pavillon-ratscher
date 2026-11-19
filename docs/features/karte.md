# Karte, Ortsanzeige und Ziel (`feat/karte`)

Falko, 19.11.2026 2:22: „… wenn ich mit dem Jetpack drüber fliege und auch sonst, eine optional einschaltbare Karte, die mir zeigt, wo ich
mich gerade befinde. Und links oben sollte auch optional immer angezeigt werden die Straße und das Gebiet, in dem ich mich gerade befinde,
beziehungsweise Ort und Gebiet, sodass ich mich orientieren kann. Ich möchte auch selbstständig Zielorte eingeben können, die mir dann an
der Karte angezeigt werden können, die ich dann verfolgen kann.“ Die Analyse davor (welche Daten es gibt, was flach ist, was fehlt) steht
im Projekt „Garten“ unter `claude/pavillon-karte-daten.md`, die Werkzeuge unter `tools/karte/`.

## Bedienung

| | Laptop | Handy |
|---|---|---|
| kleine Karte an/aus | Taste **K**, Knopf **„Karte“** oben rechts, Menü → Hingehen → Karte und Ziel | Knopf oben rechts |
| große Karte mit Suche | **Shift+K**, Klick auf die kleine Karte oder auf die Ortsanzeige | antippen |
| verschieben, zoomen | ziehen, Mausrad, **+ −**, **◎** = wo bin ich | ziehen, zwei Finger |
| Ziel setzen | Ort, Straße, Berg, **Straße mit Hausnummer** („Ratschner Anger 12“) ins Suchfeld (↑ ↓ Enter) oder auf die Karte klicken | tippen |
| Ziel verfolgen | **„Hinfliegen“** (Jetpack), im Auto **„Autopilot“**; sonst Linie und Pfeil | dasselbe |
| Ortsanzeige oben links an/aus | Haken „Ortsanzeige“ in der großen Karte | dasselbe |

- **Oben links** (statt der bisherigen Ortszeile): das Haus daneben mit Straße und Hausnummer (amtliche Hauskoordinaten, in 32 m; im Auto
  nur die Straße, in 45 m; V19t), sonst die Straße (benannte Straßen der Fahrt-Daten in 22 m, im Auto 14 m), sonst was
  `KERN.place` weiß (Räume des Pavillons, Plätze im Dorf, Schleusingen …); darunter Ort · Gemeinde · Landkreis, draußen „bei …“ oder der
  Berg, Wald, See in der Nähe („am Adlersberg“); im Flug die Höhe über NN und über Grund; mit Ziel dessen Name, die Entfernung und ein
  Pfeil dorthin (nach der Blickrichtung).
- **Kleine Karte** (oben rechts, rund, in Blickrichtung gedreht): Luftbild der Kacheln, Straßen, Ortsnamen, das Ziel (am Rand ein Pfeil,
  wenn es weiter weg ist), Norden am Rand. Zu Fuß 180 m Radius, im Jetpack mit der Höhe wachsend bis 4 km. Im Fahrzeug weicht sie der
  Fahrzeugkarte (`vehicles/minimap.js`), die das Ziel und seine Entfernung zeigt.
- **Große Karte**: Norden oben, Luftbild aller Kachelsätze (Block um den Garten, Kloster Veßra, Suhl, Grenz-Zone), darauf Straßen, Orte,
  Berge, Gewässer; Maßstab unten rechts; unten das Ziel mit Entfernung, Richtung, Ort · Gemeinde · Kreis und den Knöpfen.
- **Ziel in der Welt**: ein oranger Lichtstrahl, dessen Höhe und Dicke mit der Entfernung wachsen, darüber Name und Entfernung (immer
  sichtbar). Erreicht in 25 m (Fahrzeug 60 m): „Ziel erreicht: …“, das Ziel verschwindet. Fliegt der Jetpack oder fährt der Autopilot hin,
  melden sie die Ankunft selbst.
- Die **Liste des Autopiloten** und die **Ziele des Jetpacks** bekommen das eigene Ziel als ersten Eintrag („Mein Ziel: …“).

## Wie es funktioniert

- Modul `viz3/src/karte/karte.js` (`window.KARTE`), in `modules.txt` nach `navi/navi.js`. Keine Änderung an anderen Modulen: das Ziel ist
  der Sprungpunkt `KERN.spot('kartenziel')`, zu dem `JET.flyTo` und `NAVI.go` schon fliegen und fahren können; `NAVI.DEST` (Liste der
  Ziele) bekommt einen Eintrag; die Fahrzeugkarte über `MMAP.more`/`MMAP.dest` (die vorigen Funktionen laufen weiter, wie bei `NAVI`).
- **Ortsverzeichnis** `karte/orte.json` (`viz3/extra/karte/dist/`, 196 KB, gepackt ~62 KB; geholt 4 s nach dem Start oder beim ersten
  Öffnen): 2 378 Einträge – Städte, Gemeinden, Ortsteile, Stadtteile, Weiler, Berge, Hügel, Wälder, Talsperren, Seen, Flüsse, Burgen,
  Schlösser, Kirchen, Museen, Bahnhöfe, Aussichtstürme – aus Wikidata (CC0) im Kasten 50,15–50,85° N, 9,95–11,45° O (Berge, Gewässer,
  Bauwerke nur, wo die Karte ist); je Eintrag Modellmeter, Gemeinde (Wikidata „liegt in“), Landkreis, Einwohner, Rang, und ob er fein,
  grob oder gar nicht auf der Karte liegt. Dazu die Grenzen von zwölf Landkreisen (Nominatim/OSM, auf 120 m vereinfacht).
  Werkzeug: `tools/karte/wd_orte.py` (Abfrage), `tools/karte/orte.py` (Datei), `tools/karte/abdeckung.py` (Abdeckung, liefert die
  Lage auf der Karte), `tools/karte/karte_bild.py` (Bild der Abdeckung).
- **Ort und Gebiet**: der Umriss eines Orts aus den Fahrt-Daten (`places[].a`), sonst der nächste Ort nach Entfernung im Verhältnis zu
  seiner Größe (Großstadt 2,6 km, Stadt 1–1,5 km, Dorf/Ortsteil 650 m, Weiler 350 m); der Landkreis aus den Grenzen.
- **Hausnummern (V19t)**: die amtlichen Hauskoordinaten Thüringens (INSPIRE-Adressen, Stand 2025 Q1, © GDI-Th, CC BY 4.0; ATOM-Feed des
  Landes, Datei `ad_25832.zip`, 26 MB – die im Zugangsdokument genannte `HK-TH.zip` lieferte am 19.11. nur die Wartungsseite), auf die Karte
  zugeschnitten: 50 579 Häuser, 3 328 Straßen in 58 Gemeinden. `karte/adr/index.json` (Straßen: Name, Gemeinde, Mitte, Zahl; 120 KB, geholt
  7 s nach dem Start) und 291 Zellen zu 2 km `karte/adr/<i>_<j>.json` (zusammen 1,4 MB; nur die Zellen um den Beobachter oder um eine
  gesuchte Straße, höchstens 24 im Speicher). Werkzeug `tools/karte/adressen.py` (liest das GML von 1,4 GB als Strom in 17 s). Ortsteile
  stehen nicht in den Daten – sie kommen aus dem Ortsverzeichnis. In der großen Karte stehen die Hausnummern ab etwa 1 px je Meter.
- **Straßen**: die Wege der Fahrt (`FAHRT.data.ways`, mit Suhls Straßen, sobald Suhl sie bringt); solange die Fahrt ihre Datei nicht
  geladen hat, eine eigene, schlanke Kopie von `fahrt/strassen.json` (nur Lage, Art, Name), die mit dem Laden der Fahrt wegfällt; Raster
  von 40 m für die Straße unter den Füßen.
- **Luftbild der Karten**: dieselben Dateien wie die Kacheln der Welt (`i/{z}/{x}/{y}.webp` der Sätze `welt-test`, `zonen/vessra`,
  `grenzland-zone/welt`, Suhls `boden`), mit `crossOrigin` wie three's Lader – meist aus dem Zwischenspeicher. Die Stufe nach dem Maßstab,
  die gröberen Stufen darunter als Hintergrund; höchstens 6 Abrufe zugleich, 90 Bilder im Speicher (Telefon 36), die ältesten fallen weg.
  Nur solange eine Karte sichtbar ist. Die Kacheln liegen in UTM, das Modell ist gedreht und skaliert (`GEOMAN.xf`): jede Kachel wird
  mit einer Affinabbildung gezeichnet.
- **Gespeichert**: `pav-karte-v1` `{ v, map, ort, ziel }` über `SAVE` (Prüfung: Typen, Zahlen endlich, Name < 120 Zeichen).
- Nicht in der Zombienacht, in Grenzland und in „Zukünfte erproben“; ausgeblendet mit „Sicht“ (`data-clean`).

## Test

`python3 viz3/test/karte.py <port>` (`viz3/extra/karte/tests.txt`: `smoke`, `karte`, `memphone`): das Verzeichnis lädt; oben links im
Garten „Ratscher · Stadt Schleusingen · Landkreis Hildburghausen“, in Schleusingen Straße und Stadt; K und der Knopf schalten die kleine
Karte, sie zeichnet; Shift+K öffnet die große Karte; die Suche findet Hirschbach und eine Straße; ein Treffer setzt das Ziel (Fuß der Karte,
Listen von Autopilot und Jetpack, `KERN.spot`); ein Klick auf die Karte setzt einen Punkt; „Hinfliegen“ startet den Jetpack, die Höhe steht
oben links, der Strahl steht; Ankunft in Hirschbach; in 25 m verschwindet das Ziel; im Auto zeigt die Fahrzeugkarte das Ziel; der
Speicherschlüssel ist bei `SAVE` angemeldet; keine Seitenfehler. Bilder in `out/karte/`.

## Offen

- **Straßennamen überall**: die Fahrt-Daten decken nur die Strecke Kloster Veßra – Schleusingen – Ratscher ab (828 Wege) und Suhl, sobald
  es geladen ist. Für die ganze Karte: die benannten Straßen der Region aus dem Geofabrik-Auszug in GitHub Actions (wie
  `welt-dinge-osm.yml`), als eigene kleine Datei für Karte und Ortsanzeige.
- **Zu Fuß den Weg zeigen**: bisher Luftlinie; ein Fußweg-Graph über die Wege (wie `NAVI` für Autos) wäre der nächste Schritt.
- Außerhalb der Kacheln (Sonneberg, Schmalkalden …) bleibt die Karte dunkel – die Suche zeigt solche Orte als „nicht auf der Karte“.
