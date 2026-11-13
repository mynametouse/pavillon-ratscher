# Cockpit: realistische Innenansicht der Autos, Spiegel, Wischer, Blinker, Navi – und die Grafik beim Bewegen

Hilfs-Agent `cockpit` (Auftrag `docs/plans/auftraege/cockpit.md`), Branch `feat/cockpit`. Falko, 13.11.2026 15:54/16:05: das Auto innen
„viel realistischer … nicht so spielzeughaft … mit Tacho, bewegtem Lenkrad, Händen am Lenkrad, Schalten“; Karosserien baut der Straßen-Chat,
das Innere dieser Agent; dazu echte Spiegel, Wischer bei Regen, Blinker und Lichtschalter, Navi in der Mitte; die Grafik beim Fahren
einstellbar (Stufen und Automatik, Bildrate anzeigen).

## Was es gibt

### Teil 0 – Grafik beim Bewegen (Menü → Einstellungen → Grafik)
- **Beim Bewegen**: *Auto* (wie bisher: die Stufe folgt der Bildrate, Ziel ≥ 50 Bilder/s; Standard), *Voll* (keine Vereinfachung), *Leicht*
  (ohne weiche Eckschatten und Kantenglättung, volle Auflösung), *Mittel* (ohne Effekte, ~¾ Auflösung), *Stark* (halbe Auflösung). Unter der
  Zeile steht die Erklärung der gewählten Stufe; bei *Auto* auch, was die Automatik gerade gewählt hat. Technisch: `render/render.js`
  `MOTION.user` (null = automatisch, sonst eine feste Stufe von `MLEVELS`: Voll 0, Leicht 1, Mittel 3, Stark 5), `setMotionUser(l)`;
  `motionTrack` ändert eine von Hand gewählte Stufe nicht; beim Laden wird die gespeicherte Stufe erst am Ende von `prepareGPU` gesetzt
  (der Bewegungs-Pfad ist dann schon übersetzt – Umschalten bringt kein neues Shader-Programm).
- **Bildrate** (Knopf daneben): kleine Anzeige oben in der Mitte – gezeichnete Bilder je Sekunde (`MOTION.frames`, gezählt in `renderFrame`;
  steht das Bild, zeichnet die App nichts: „Bild steht“) und die Stufe beim Bewegen.
- Der Knopf „Qualität“ (Grafikstufe hoch/mittel/schnell, `#qualbtn`) ist aus „Mehr“ in den neuen Abschnitt „Grafik“ gezogen.
- Gespeichert je Browser in `pav-cockpit-v1` (`{ v: 1, mot, fps, mir, nav }`, jedes Feld einzeln geprüft; `mir`/`nav` für die Spiegel und
  die Karte im Auto).

### Teil 1–5 – das Cockpit von Falkos Kombi (Fahrersicht, Taste V)
- **Gebaut beim ersten Einsteigen** (`vehicles/cockpit_build.js`, `CPBUILD.build`), als eigene Gruppe `cockpit` unter `model.body`; das
  einfache Innere der heutigen Karosserie (`model.inside`, Haken in `car.js`) wird dann ausgeblendet. Die neuen Materialien werden in diesem
  Moment einmal übersetzt (`warmUp`), danach kommen keine Programme mehr dazu.
- **Armaturenbrett** aus seitlichen Profilen mit weichen Kanten (Softtouch oben, härterer Kunststoff unten, feine Körnung), vor dem Fahrer
  eine Mulde mit Haube über den Instrumenten; **Kombiinstrument** (`vehicles/cockpit_cluster.js`, Canvas-Textur, ungeleuchtet – die
  Helligkeit setzt das Cockpit: tags nach dem Tageslicht, bei laufendem Motor hinterleuchtet, nachts hell): Drehzahl 0–7000 (rot ab 6300),
  Tacho 0–200 km/h, Kühlwasser und Tank in den unteren Lücken, dazwischen ein Display mit Uhrzeit (Spielzeit), Außentemperatur (Wetter),
  Gang (P, R, D mit dem Gang der Automatik), Kilometerstand (gespeichert in `pav-cockpit-v1`), Tageskilometer, Kontrollleuchten
  (Abblendlicht, Lichtautomatik „A“, Handbremse, ESP beim Rutschen, Batterie und Öl beim Anlassen). Nadeln als eigene Meshes, sie folgen
  `VEH` (Geschwindigkeit, Drehzahl) mit etwas Trägheit, beim Anlassen einmal Vollausschlag.
- **Lenkrad** (Dreispeichen, Lederkranz, Prallplatte) dreht mit dem Lenkeinschlag × 15; **Hände** der Spielfigur daran
  (`vehicles/cockpit_hands.js`): dieselben Arme wie die Ich-Sicht der Zombie-Nacht – `ZFP.makeBody` (Kopie der gewählten Figur, Kopf
  weg, Zwei-Knochen-Löser `ZFP.placeBodyArm`, Finger `ZFP.fingers`), sitzend nach ihrem Sitz-Clip; die Hände folgen dem Kranz etwa eine
  Vierteldrehung, darüber gleitet der Kranz durch die Hände. **Automatik, Hand sichtbar:** wechselt der Gang, greift die rechte Hand in
  0,3 s zum Wählhebel, tippt ihn an und kehrt zurück. Die Beine bleiben weg (der Boden des heutigen Kombis liegt zu hoch, siehe offen).
- Mittelkonsole mit **Navi** (16:9, `MMAP.drawTo` in `vehicles/minimap.js`: dieselbe Karte, rechteckig, das Fahrzeug unten; oben das Ziel
  mit Entfernung, unten die Uhrzeit), Lüftungsdüsen, Warnblinkschalter, drei Klimaregler, Wählhebel P R N D, Handbremshebel (hebt sich bei
  Leertaste), Pedale (Gas, Bremse), Sitze mit Wangen und Kopfstützen (Stoff), Türverkleidungen (Armlehne, Griff, Fensterheber,
  Lautsprecher), A-Säulen-Verkleidung (dunkelgrauer Kunststoff, ~8 cm), Innenspiegel, Außenspiegelköpfe.
- **Dach innen** (Hinweis des Leads 13.11. ~18:00, „oben offen, spielzeughaft“): die heutige Karosserie verglast weit nach oben und hinten
  (die Oberkante der Scheibe liegt fast über dem Kopf). Innen schließt das Cockpit dort, wo das Dach eines Logan beginnt: ein dunkles
  Band auf der Scheibe (Siebdruck und Dachrahmen, daran hängt der Innenspiegel), der hellgraue Dachhimmel, zwei hochgeklappte
  Sonnenblenden mit Haltern, die oberen Rahmen der Türfenster (Anker `head`). Dazu im Armaturenbrett eine gröbere Narbung, die
  Gummifuge zur Scheibe, die Abdeckung des Beifahrer-Airbags als feine Fuge.
- **Blickwinkel** in der Fahrersicht: 62° senkrecht auf breiten Bildschirmen (vorher 70°, das zog Säulen und Armaturen in die Breite;
  `vehicles/vehicle.js`, markiert), schmal (< 760 px) wie bisher 76°. Lenkrad näher an den Augen (Kranz oben ~0,54 m vor ihnen).
- **Spiegel** (`vehicles/cockpit_mirror.js`): Innen- und beide Außenspiegel zeigen live, was hinten ist – ein kleines Renderziel
  (512 × 256, am Handy 256 × 128) mit drei Streifen, je Spiegel eine Kamera am Glas (Blickwinkel wie das Glas vom Auge aus), höchstens ein
  Spiegel je Bild, jeder ~15 Mal je Sekunde, nur die im Blick, keine neue Schattenkarte. Einstellung „Echte Spiegel“ (Menü → Einstellungen
  → Grafik; Computer an, Handy aus) – aus: poliertes Metall mit dem Himmelslicht.
- **Wischer** bei Regen (`WETTER.fall.S.kR`/`kS`): Intervall (alle ~4,5 s), normal (1,35 s), schnell (0,95 s); Tropfen sammeln sich auf der
  Scheibe zwischen den Wischerstrichen (eine durchsichtige Fläche innen an der Scheibe), der rechte Hebel rastet je Stufe.
- **Blinker**: `,` links, `.` rechts (noch einmal: aus; frei geprüft gegen alle Tasten), am Handy zwei Pfeil-Knöpfe bei den
  Fahrzeug-Knöpfen (`#vhud .vbtns`, gelb solange er blinkt), Klick des Relais, grüne Pfeile im Kombi, die
  Blinker der Karosserie (heute `car.js`, je Seite ein Material), der linke Hebel geht hoch/runter; nach dem Abbiegen schaltet er sich aus,
  wenn das Lenkrad zurückkommt. Zustand für die Karosserie: `v.st.blink` (`'L' | 'R' | null`), `v.st.blinkOn`.
- **Lichtschalter**: Drehknopf links vom Lenkrad (0 – AUTO – Abblendlicht) folgt `L`; im Kombi die Leuchte (mit „A“ bei Automatik).
- **Navi statt Eckkarte** (Einstellung, an): in der Fahrersicht weicht die kleine Karte oben links, solange das Navi zu sehen ist.

### Teil 6 – die anderen Fahrzeuge
- **Fremdes Auto** (das man im Verkehr anhalten und fahren darf, `verkehr/verkehr_auto.js` `id: 'verkehr'`, gleiche Fahrwerte und
  Augenhöhe wie der Kombi): dasselbe Cockpit, eigener Kilometerstand (nicht gespeichert).
- **Traktor** (`vehicles/tractor.js`): eigenes Lenkrad (dünner Kranz, drei Metallspeichen, Lenkradknauf) dreht mit dem Einschlag × 18 –
  das feste Lenkrad der Karosserie wird ausgeblendet (die Gruppe mit dem Ring, ohne Änderung an `tractor.js`) –, eine Instrumententafel auf
  der Säule (Drehzahl 0–3000, rot ab 2350; Geschwindigkeit, Gang F/R, Betriebsstunden, Tank, Licht, Handbremse), Blinkpfeile, die Hände am
  Lenkrad, bei Gangwechsel die rechte zu den Hebeln. Keine Spiegel, kein Navi.

### Ankerpunkte (für neue Karosserien, Absprache mit dem Straßen-Chat in `docs/PARALLEL.md`, 13.11. 17:05)
Modellrahmen wie `car.js` (x rechts, y vorn, z oben, Meter). Eine Karosserie mit eigenen Werten nennt sie in `spec.cockpit` (gleiche
Felder; was fehlt, bleibt wie beim Kombi – `CPBUILD.anchors`). Heute für den Kombi (`CPBUILD.CAR`): `eye` [−0,36, −0,22, 1,17] (= `spec.eye`),
`hp` (H-Punkt) [−0,36, −0,10, 0,62], `wheel` { c [−0,36, 0,24, 0,875], tilt 0,44, r 0,185 }, `dash` { face 0,49, top 0,966, ws 0,84,
x 0,745 }, `ws` { y0 0,82, z0 0,97, w0 0,8, y1 −0,05, z1 1,55, w1 0,64 }, `floor` 0,45, `door` 0,755, `mirL` [−0,99, 0,67, 1,04],
`mirR` [0,99, 0,67, 1,04], `mirI` [0, 0,22, 1,285], `roof` 1,51, `head` { z0 1,30, z1 1,35, back [−1,15, 1,47], w 0,635 }
(dunkles Band auf der Scheibe von z0 bis z1, Dachhimmel von dort bis `back`; eine Karosserie mit echtem Dach lässt `head` weg: `null`).

## Testen
`python3 viz3/test/run.py --port 9016 --serve cockpit` (über `bash tools/browser_lock.sh`), Abschnitte: `grafik`, `cockpit`, `phone`.
Bilder in `out/cockpit/`.
Themen-Tests auf CI: `viz3/extra/cockpit/tests.txt`.

## Leistung (gemessen im Test, SwiftShader – Zeiten dort ohne Aussage)
- Cockpit: ~43 Meshes im Bild (9 zusammengeführte statische je Material, ~31 bewegliche, 3 der Arme) = Zeichenaufrufe je Szenen-Durchgang;
  ein volles Bild mit Umgebungsverdeckung zeichnet sie zweimal. Gebaut in ~130 ms beim ersten Einsteigen, Arme ~10 ms.
- Programme: 2 neue beim ersten Einsteigen (beim Bauen vorübersetzt bzw. mit dem ersten vollen Bild), danach keine mehr (Fahren,
  Schalten, Lenken, Blinken, Wischen, Spiegel an/aus).
- Spiegel: ein Spiegel je Bild, je ~15 Hz, nur die im Blick; ~60–125 Zeichenaufrufe je Spiegelbild (Ortsrand bzw. Dorf), Renderziel
  512 × 256 (Handy 256 × 128, dort standardmäßig aus).

## Offen
- Beine der Figur: im heutigen Kombi liegt der Boden (0,45 m) zu hoch für Augenhöhe 1,17 m – sie bleiben ausgeblendet; mit einer
  Karosserie mit echtem H-Punkt (Straßen-Chat) lassen sie sich mit demselben Löser auf die Pedale setzen.
- Spiegelgehäuse und A-Säulen-Verkleidung passen zur heutigen Karosserie; die neue nennt ihre Ankerpunkte (Absprache in PARALLEL).
- Warnblinker ohne eigene Taste (der rote Schalter ist da, noch ohne Funktion).

## Für den Lead (gemeinsame Dateien, alle Stellen markiert `feat/cockpit`)
- `viz3/src/render/render.js`: `MOTION.user`, `MOTION.auto`, `setMotionUser()`, eine Zeile in `motionTrack`, das Setzen der Stufe am Ende
  von `prepareGPU`, `MOTION.frames++` in `renderFrame`.
- `viz3/src/core/save.js`: Schlüssel `pav-cockpit-v1`.
- `viz3/shell/menu.html`: Abschnitt „Grafik“ in den Einstellungen (dorthin auch `#qualbtn`, Text „Qualität“).
- `viz3/src/modules.txt`: Block `# feat/cockpit` vor `game/tutorial.js`.
- `viz3/src/vehicles/car.js`: das einfache Innere (Armaturenbrett, Konsole, Lenkrad, Vordersitze, Hebel) in der Gruppe `model.inside`
  (eigens zusammengeführt), die Blinker je Seite mit eigenem Material (`model.lamps.blinkL` / `blinkR`).
- `viz3/src/vehicles/vehicle.js`: eine Zeile in `applyCam` (Fahrersicht 62° statt 70° auf breiten Bildschirmen).
- `viz3/src/vehicles/minimap.js`: `MMAP.drawTo(o)` (dieselbe Karte in eine andere Leinwand: das Navi) und `MMAP.hide` (Eckkarte weicht).
- `viz3/src/zombie/z_fp.js`: der Körper der Ich-Sicht als Fabrik `ZFP.makeBody(F, rig)` (aus `fpBody` herausgelöst, Verhalten gleich),
  dazu `ZFP.placeBodyArm` und `ZFP.fingers` nach außen – damit das Cockpit dieselben Arme nutzt, statt sie nachzubauen.
- `viz3/shell/menu.html` (Hilfe: `,` `.` blinken; Grafik: „Echte Spiegel“, „Navi statt Eckkarte“), `viz3/shell/panel_3d.html` (`#vkeys`:
  `,` `.` blinken).
- Neuer `window`-Name: `COCKPIT` (`vehicles/cockpit.js`). Absprache mit dem Straßen-Chat: `docs/PARALLEL.md`, 13.11. 17:05 (auf `src`).
