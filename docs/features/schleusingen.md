# Schleusingen – begehbar, nach Fotos

Stand 23.10.2026 (Hilfs-Agent `schleusingen`, Branch `feat/schleusingen`). Falko (2:58): „Schleusingen, soweit es geht, auch begehbar
und detailliert ausgearbeitet, anhand von echten Bildern“ – Grundlage für die Aufgabe „Ortsvorsteher bringt die Anliegen ins Rathaus“.

## Was es gibt
- **Menü → Orte → „Schleusingen“**: auf den Markt, Blick zum Rathaus. Zu Fuß geht es auch (vom Dorf nach Nordwesten).
- **Nichts davon beim Start**: geladen wird erst, wenn die Kamera näher als 950 m am Markt ist; ab 1350 m wird alles wieder freigegeben
  (Gebäude sofort, Welt-Kacheln nach 20 s).
- **Gelände und Boden** aus den Welt-Kacheln (`tools/welt`, auf der Website unter `welt-test/`): Stufen 10–12 (400/200/100 m) in Ringen um die
  Kamera, Luftbild 20 cm/px nah. Modul `viz3/src/welt/welt.js` (`WELT`) – meldet sich bei `KERN` für Gelände, Boden und `free` (dort darf man
  laufen). Unter den Kacheln wird das grobe 120-m-Gelände abgesenkt; das 10-m-Gelände um Ratscher bleibt, die Kacheln gehen an seinem Rand
  hinein.
- **Altstadt**: 789 Gebäude aus OpenStreetMap (`tools/welt/zone_schleusingen.py` → `viz3/extra/schleusingen/dist/schleusingen/stadt.json`,
  0,7 MB): Fassaden mit Traufe/Giebel, Dächer mit Überstand, Dachfarbe aus dem Luftbild, Brandwände ohne Fenster, Türen zur Straße. Gezeichnet
  mit den Fassaden- und Dach-Shadern des Dorfs (`world/village.js`) – keine neuen Shader-Programme. Farben nach den Markt-Fotos (gelb, lachs,
  ocker, salbeigrün, creme, weiß), Schiefer an Obergeschossen und Giebeln, Fachwerk in den Seitengassen.
- **Wahrzeichen** (Fotos Wikimedia Commons 2008–2025): **Rathaus** mit Giebel zum Markt, Dachreiter mit Uhr und dunkler Haube, rotem Portal –
  die Tür ist offen, dahinter die **Halle mit dem Bürgerbüro** (Tresen, Bank, Tisch, Wappen); **St. Johannis** mit Turm, Achteck und Haube,
  hohen Rundbogenfenstern; **Bertholdsburg** (Vierflügelbau, Rundtürme mit Spitzhelmen, Uhrturm, Fachwerk-Obergeschoss); **Marktbrunnen**;
  Heckenturm.
- **Laternen** (OSM und entlang der Altstadtgassen, 208): nachts an, sie beleuchten die Wände wie im Dorf. **Bänke** aus OSM.
- **Ortsnamen** im HUD: Rathaus, Markt, Kirche, Burg, sonst die nächste Straße („Burgstraße, Schleusingen“).
- **Kollision**: alle Hauswände, Brunnen, Laternen, Türme; im Rathaus die Hallenwände und der Tresen.

## Für die Aufgabe „Ortsvorsteher“ (`feat/ortsvorsteher`)
`window.SCHL` / `import { SCHL } from '../welt/schleusingen.js'`: `SCHL.state` (`'ready'`, wenn gebaut), `SCHL.rathaus` (`door` [x, y] Mitte der
Tür außen, `inside` [x, y] 3,5 m hinter der Tür, `floor` Höhe des Hallenbodens, `Q(u, w, z)` Punkt in Hallen-Koordinaten: u längs der Front,
w in den Raum), `SCHL.inHall(x, y)`, `SCHL.place(x, y)`, `SPOTS.schleusingen`. Der Tresen steht mittig an der Rückwand (`Q(L/2, w1 − 2.2)`).

## Quellen
Gebäude, Straßen, Orte © OpenStreetMap-Mitwirkende (ODbL); Gelände/Luftbild der Kacheln © GDI-Th (CC BY 4.0), Copernicus DEM, ESA WorldCover
(`welt-test/ATTRIBUTION.md`); Fotos nur als Vorlage (`tools/fotos/katalog.json`), keine Bilder im Repo. Liste in der App über
`viz3/extra/schleusingen/manifest.json` (`credits_add`).

## Testen
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8977 --serve schleusingen` – holt die nötigen Welt-Kacheln nach
  `viz3/dist/welt-test/`, prüft: nichts beim Start, Menü, Laden, Boden, Wand hält auf, durch die Tür in die Halle, Namen, Nacht, Freigeben;
  Bilder in `out/schleusingen/`. Bei GitHub läuft er mit jedem Push auf `feat/schleusingen` (Artefakt „out“).
- Daten neu bauen: `python3 -I tools/welt/zone_schleusingen.py --raw <Cache-Ordner>` (OSM-API, Luftbild-Kacheln der Website).

## Offen
- Gelände: die Kacheln haben über Schleusingen nur Copernicus (30 m Oberflächenmodell, Straßen eingeschnitten) – DGM1 Thüringen war am
  22./23.10. nicht abrufbar. Sobald es da ist, reicht ein neuer Lauf der Welt-Pipeline.
- Auto-Fahrt bis Schleusingen: die Fahrzeuge bleiben noch im 2,4-km-Quadrat (`vehicles/vehicle.js`).
