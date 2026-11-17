# Autopilot im Auto (Stufe 1)

Falko, 17.11.2026 15:05: „… schnell herumzureisen. Auch sonst im Auto, auch im Autopiloten optional bei Zielangabe.“

## Bedienung

Im Fahrzeug der Knopf mit der Stecknadel im Fahrzeugfeld unten rechts → **„Ziel – der Autopilot fährt hin“**: Garten, Ratscher,
Schleusingen, Kloster Veßra, Suhl (Markt, Bahnhof, Congress Centrum). Der Wagen fährt los; der Weg steht orange auf der kleinen Karte und
im Navi, darunter der Ort und die Strecke. **W/A/S/D, Pfeile, Leertaste oder der Stick** übernehmen („Du fährst wieder selbst.“),
Aussteigen beendet ihn auch, im Knopf-Menü „Selbst fahren“. Am Ziel: „Angekommen: … – zu Fuß noch … m“, wo der Ort selbst keine Straße ist
(Markt von Suhl).

## Wie es funktioniert

- Modul `viz3/src/navi/navi.js` (`window.NAVI`), in `modules.txt` nach dem Jetpack. Keine Änderung in `vehicles/`: es setzt `VEH.auto`
  (den Haken für Tests) und hängt sich an `MMAP.more`/`MMAP.dest` (vorige Funktionen bleiben, es zeichnet dazu).
- **Straßennetz:** die Wege des Dorfes (`ROADS.ways`) und der Fahrt (`FAHRT.data.ways`: Region, später Suhls Anfahrt und Straßenkacheln),
  ein eigener Graph wie `VNETZ.graph`, aber mit Raster für Segmente (≈ 20 ms statt > 1 s für die Region); Höhen trennen Brücke und
  Unterführung (> 2,5 m: kein Knoten); Einbahnstraßen (`fl & 4`) nur vorwärts; nicht für Autos: Fußgängerzone, Treppe, privat, Hausdurchgang
  (`fl & 64|128|1024|2048|32768`).
- **Route:** Dijkstra nach Zeit (Tempo je Art; Hauptstraßen im Ort – `STRDAT.ortAt` – 50 km/h), Linie über `VNETZ.line` (rechte Spur, in engen
  Straßen näher zur Mitte, Kurven gerundet, Tempo je Meter mit Kurve und Bremsen). Sie beginnt unter dem Wagen (das Stück seiner Straße bis
  zur Kreuzung) und endet am Punkt neben dem Ziel; Ziel ist dort, wo die eigene Route der Fahrt zu diesem Ort endet (`FAHRT.data.routes`:
  `markt`, `suhl_ab`, `suhl_land`).
- **Noch nicht geladene Straßen** (Suhl lädt seine Straßen kachelweise): fahren bis so weit, wie die Route der Fahrt im Netz erreichbar ist,
  sonst entlang dieser Route selbst; neu planen, sobald neue Wege kommen (höchstens alle 8 s) oder 400 m vor dem Ende. Garten → Suhl:
  13 km, ≈ 22 min Spielzeit.
- **Fahren:** Pure Pursuit (Punkt 4,5–30 m voraus), Tempo der Linie, Abstand zu Autos des Verkehrs, Bussen, anderen Fahrzeugen,
  Fußgängern, Autos der Dorfleute und geparkten Autos auf der eigenen Spur; ein stehendes Hindernis nach 4 s links umfahren (langsam);
  wartet, wo das Gelände lädt (`FAHRT.cap`); festgefahren → zurücksetzen, beim zweiten Mal neu planen, dann seitlich versuchen, nach sieben
  Versuchen am selben Ort übernimmt der Fahrer („Hier komme ich nicht vorbei – fahr kurz selbst …“).

## Test

`python3 viz3/test/navi.py <port>` (8 Prüfungen): Knopf und Ortsliste, Plan vom Garten, Fahrt nach Schleusingen bis 90 m an den Markt (am
Ende der Route der Fahrt), nicht lange festgefahren, Weg und Beschriftung auf der Karte, W übernimmt, Aussteigen beendet, keine Fehler.
Lokal mit `?suhl=suhl_stadt/` auch Garten → Suhl (Markt) bis ans Ende der Anfahrtsroute.

## Offen (Stufe 2)

- Ampeln und Vorfahrt (`VKREGELN`, `VKAMPEL.attach`), Tempo nach Schild (`VKREGELN.limits`).
- Engstellen der Altstädte: selten noch ein Anstoßen an Hausecken (dann zurücksetzen und neu planen).
- Steile Kuppen an der Grenze des Quadrats: kurz in der Luft bei hohem Tempo.
