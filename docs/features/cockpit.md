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

## Testen
`python3 viz3/test/run.py --port 9016 --serve cockpit` (über `bash tools/browser_lock.sh`), Abschnitte: `grafik`. Bilder in `out/cockpit/`.
Themen-Tests auf CI: `viz3/extra/cockpit/tests.txt`.

## Für den Lead (gemeinsame Dateien, alle Stellen markiert `feat/cockpit`)
- `viz3/src/render/render.js`: `MOTION.user`, `MOTION.auto`, `setMotionUser()`, eine Zeile in `motionTrack`, das Setzen der Stufe am Ende
  von `prepareGPU`, `MOTION.frames++` in `renderFrame`.
- `viz3/src/core/save.js`: Schlüssel `pav-cockpit-v1`.
- `viz3/shell/menu.html`: Abschnitt „Grafik“ in den Einstellungen (dorthin auch `#qualbtn`, Text „Qualität“).
- `viz3/src/modules.txt`: Block `# feat/cockpit` vor `game/tutorial.js`.
- Neuer `window`-Name: `COCKPIT` (`vehicles/cockpit.js`).
