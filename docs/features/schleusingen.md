# Schleusingen – begehbar, nach Fotos

Stand 23.10.2026 (Hilfs-Agent `schleusingen`, Branch `feat/schleusingen`). Falko (2:58): „Schleusingen, soweit es geht, auch begehbar
und detailliert ausgearbeitet, anhand von echten Bildern“ – Grundlage für die Aufgabe „Ortsvorsteher bringt die Anliegen ins Rathaus“.

## Was es gibt
- **Menü → Orte → „Schleusingen“**: auf den Markt, Blick zum Rathaus. Zu Fuß geht es auch (vom Dorf nach Nordwesten).
- **Nichts davon beim Start**: geladen wird erst, wenn die Spielfigur (sonst die Kamera) näher als 950 m am Markt ist; ab 1350 m wird alles
  wieder freigegeben (Gebäude sofort, Welt-Kacheln nach 20 s). Messung im Test: beim Start 0 Anfragen, Shader-Programme 142 → 143 nach
  dem Besuch (+ Schilder), Texturen 368 → 434 (Kacheln, wieder frei).
- **Gelände und Boden** aus den Welt-Kacheln (`tools/welt`, auf der Website unter `welt-test/`): Stufen 10–12 (400/200/100 m) in Ringen um die
  Spielfigur, Luftbild 20 cm/px nah, im Shader wie das Land um Ratscher (`ROADS.shader`: Dunst weg, helles Land gedämpft, Korn nah). Darüber
  die **Straßen** der Altstadt (OSM, eigene Karte 1024² über 920 m): Asphalt mit Bordstein auf den Durchgangsstraßen, Kopfsteinpflaster in
  der Altstadt und auf dem Markt, Platten auf Fußwegen. Modul `viz3/src/welt/welt.js` (`WELT`) – meldet sich bei `KERN` für Gelände, Boden
  und `free` (dort darf man laufen); `WELT.setPads` ebnet Flächen (Rathaus-Halle, Burghof), `WELT.setOverlay` legt die Straßen auf.
  Unter den Kacheln wird das grobe 120-m-Gelände abgesenkt; das 10-m-Gelände um Ratscher bleibt, die Kacheln gehen an seinem Rand hinein.
- **Altstadt**: 789 Gebäude aus OpenStreetMap (`tools/welt/zone_schleusingen.py` → `viz3/extra/schleusingen/dist/schleusingen/stadt.json`,
  0,7 MB): Fassaden mit Traufe/Giebel, Dächer mit Überstand, Dachfarbe aus dem Luftbild, Brandwände ohne Fenster, Türen zur Straße, Gauben
  rund um den Markt, Bäume auf dem Markt. Gezeichnet mit den Fassaden- und Dach-Shadern des Dorfs (`world/village.js`) – keine neuen
  Shader-Programme. Farben nach den Markt-Fotos (gelb, lachs, ocker, salbeigrün, creme, weiß), Schiefer an Obergeschossen und Giebeln,
  Fachwerk in den Seitengassen. Am Hang bleibt das Erdgeschoss oben, die Wand geht bis zum tiefsten Punkt hinunter (Burg, Kirche).
- **Wahrzeichen** (Fotos Wikimedia Commons 2008–2025): **Rathaus** mit dem Giebel zum Markt (gestufter Renaissancegiebel, Uhr), Dachreiter
  mit Uhr und dunkler Haube, rotem Portal und Schild – die Tür ist offen, dahinter der **Ratssaal mit Bürgerbüro**: Tische in U-Form, der
  Platz des Vorsitzenden unter dem Wappen, Fahnen (Thüringen, Deutschland), Stuhlreihen für Besucher, Rednerpult, Tresen „Bürgerbüro“
  mit Schild, Fenster, Deckenbalken und -leuchten, Holzvertäfelung, Parkett. **St. Johannis** mit Turm, Achteck und Haube, hohen
  Rundbogenfenstern, Portal; **Bertholdsburg**: Vierflügelbau aus Sandstein mit Fachwerk-Obergeschoss und hohen Dächern, Rundtürme mit
  Spitzhelmen, zwei Treppentürme im Hof mit Fachwerk und dunklen Hauben, Uhrturm, Brunnen im Hof; **Marktbrunnen** (achteckiges Becken,
  Säule mit Frauenfigur); Heckenturm.
- **Laternen** (OSM und entlang der Altstadtgassen, 208): nachts an, Lichtflecken am Boden, sie beleuchten die Wände wie im Dorf.
  **Bänke** aus OSM. **Schilder** über Läden und Gasthäusern (Namen aus OSM: Ratsstube, Stadtcafé, Adler Apotheke …).
- **Ortsnamen** im HUD: Rathaus, Markt, Kirche, Burg, sonst die nächste Straße („Burgstraße, Schleusingen“).
- **Kollision**: alle Hauswände, Brunnen, Laternen, Türme, Bäume; im Saal die Wände, die Tische, der Tresen, das Pult.

## Für die Aufgabe „Ortsvorsteher“ (`feat/ortsvorsteher`)
`window.SCHL` / `import { SCHL } from '../welt/schleusingen.js'` (Modul liegt nach `world/village_near.js`): `SCHL.state` (`'ready'`, wenn
gebaut), `SCHL.rathaus`: `door` [x, y] Mitte der Tür außen, `inside` [x, y] 3,5 m hinter der Tür, `floor` Höhe des Saalbodens, `Q(u, w, z)`
Punkt in Saal-Koordinaten (u längs der Front, w in den Raum), und **`spots`** – benannte Stellen `{ x, y, z, yaw }` (yaw = Blickrichtung,
Kompass in Grad): `vorsitz` (Platz des Vorsitzenden), `seats` (alle Ratsplätze, der dritte ist der Vorsitz), `visitors` (Besucherstühle),
`rednerpult` (wo der Ortsvorsteher spricht, Blick zum Vorsitz), `counter` (vor dem Tresen des Bürgerbüros), `clerk` (dahinter).
Außerdem `SCHL.inHall(x, y)`, `SCHL.place(x, y)`, `SPOTS.schleusingen`.

## Für den Kern-Chat (gemeinsame Dateien, auf diesem Branch schon geändert)
- `viz3/src/core/kern.js`: ein Anbieter darf `undefined` liefern – dann fragt `KERN` den nächsten (eine Zone antwortet nur in sich);
  neuer Dienst `KERN.free(x, y)` (dort darf man laufen, obwohl außerhalb des 2,4-km-Quadrats). Typen ergänzt.
- `viz3/src/game/walkable.js`: `groundZ` über `KERN.ground` (statt direkt `ROADS.groundAt`), `walkBounds` fragt zuerst `KERN.free`.
- `viz3/src/modules.txt`: Marke `# feat/schleusingen` mit `welt/welt.js` und `welt/schleusingen.js` direkt unter `world/village_near.js`.
- `viz3/shell/menu.html`: ein Eintrag Orte → „Schleusingen“ (nach „Dorf“); `viz3/shell/parts.txt`: `css/schleusingen.css` nach `css/dorf.css`.
- `.github/workflows/schleusingen-bilder.yml`: nur der Schleusingen-Test auf `feat/schleusingen` (schnelle Bilder) – kann nach dem Zusammenführen
  entfallen oder bleiben (läuft nur auf diesem Branch).
- Noch offen für den Kern-Chat: `docs/ARCHITECTURE.md` (WELT, SCHL in Abschnitt 6/9, `KERN.free`), `docs/CHANGELOG.md`; die Fahrzeuge bleiben
  im 2,4-km-Quadrat (`vehicles/vehicle.js` müsste `KERN.free` fragen, dann ginge die Fahrt bis Schleusingen).

## Quellen
Gebäude, Straßen, Orte © OpenStreetMap-Mitwirkende (ODbL); Gelände/Luftbild der Kacheln © GDI-Th (CC BY 4.0), Copernicus DEM, ESA WorldCover
(`welt-test/ATTRIBUTION.md`); Fotos nur als Vorlage (`tools/fotos/katalog.json`), keine Bilder im Repo. Liste in der App über
`viz3/extra/schleusingen/manifest.json` (`credits_add`).

## Testen
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8977 --serve schleusingen` – holt die nötigen Welt-Kacheln nach
  `viz3/dist/welt-test/`, prüft: nichts beim Start, Menü, Laden, Boden, Wand hält auf, durch die Tür in den Saal, Rückwand, Namen, Nacht,
  Freigeben, Texturen je Shader; Bilder in `out/schleusingen/`. Bei GitHub: `feat.yml` (alle Features) und `schleusingen-bilder.yml`.
- Daten neu bauen: `python3 -I tools/welt/zone_schleusingen.py --raw <Cache-Ordner>` (OSM-API, Luftbild-Kacheln der Website).

## Offen
- Gelände: die Kacheln haben über Schleusingen nur Copernicus (30 m Oberflächenmodell, Straßen eingeschnitten) – DGM1 Thüringen war am
  22./23.10. nicht abrufbar. Sobald es da ist, reicht ein neuer Lauf der Welt-Pipeline.
- Auto-Fahrt bis Schleusingen (siehe oben, `vehicles/vehicle.js`).
- Wahrzeichen weiter verfeinern: Treppengiebel an der Burg, Chor von St. Johannis mit Walm, Fachwerk-Erker am Rathaus.
