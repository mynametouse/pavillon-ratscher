# Kloster Veßra – begehbar: Klosteranlage, Ort, Baumschule Kammbach

Stand 23.10.2026 (Hilfs-Agent `vessra`, Branch `feat/vessra`). Detailzone aus `claude/pavillon-welt.md`, Ziel für den Gartenplaner
(`claude/pavillon-gartenplaner.md`): zur Baumschule fahren, Pflanzen aussuchen, einladen, daheim pflanzen. Diese Runde: der Ort selbst.

## Was es gibt
- **Welt-Kacheln** für Kloster Veßra und die Straße dorthin: eigener Block, gleiche Kachelung und Pipeline wie der Testblock
  (`tools/welt/build.py --plan V`, Copernicus DEM + Luftbilder GDI-Th, Straßen eingeschnitten), veröffentlicht unter
  `welt-test/zonen/vessra/` (eigene `meta.json`) vom eigenen Workflow `.github/workflows/welt-vessra.yml` (Push auf `feat/vessra`, der
  die Pipeline-Dateien ändert, oder von Hand). Stufe 12 (100-m-Kacheln, Luftbild 20 cm/px) über 2 × 2 km um Klosteranlage und
  Baumschule, Stufen 7–11 über 8,0 × 6,4 km. Lauf 39918421150 (23.10. 9:32): 4359 Dateien, **71,8 MB**, 273 s.
- In Arbeit: Menü → Orte → „Kloster Veßra“, Gebäude aus OSM mit den Dorf-Shadern, die Klosteranlage nach Fotos, die Baumschule.

## Für die Fahrt (Hilfs-Agent `fahrt`)
- **Korridor**: die befahrbare OSM-Route Garten → Ratschner Anger → Geisenhöhner Weg → Flurweg → L 1625 (Schleusinger Straße) →
  Schulstraße 52 (Baumschule Kammbach), 10,1 km (Dijkstra über die Autostraßen). Westlich des Testblocks B (dessen Westrand
  E 620700) läuft sie in E 616502–620698, N 5594206–5594799 (UTM 32N); mit 600 m Rand **E 615902–621298, N 5593606–5595399**.
- **Block Veßra** (Stufen 8–11, ans Raster der Stufe 8 gerundet): **E 612700–620700, N 5590800–5597200** – schließt bei E 620700 lückenlos
  an Block B an (dessen Stufen 8–11: E 620700–630300, N 5590800–5600400). Stufe 12 nur über **E 615500–617500, N 5593600–5595600**
  (Klosteranlage, Ort, Baumschule); Stufe 7 nur für den Farbausgleich. In Modellmetern (x Ost, y Nord): Klosteranlage ≈ (−8770, −377),
  Baumschule ≈ (−8905, −175), Westrand von Block B bei x ≈ −4700, die Route in Kloster Veßra auf der Schleusinger Straße.
  Konstanten: `tools/welt/wlib.py` (`VESSRA_BLK`, `VESSRA_DET`, `VESSRA_ROUTE`, `ZONES`), geprüft in `tools/welt/test_welt.py`.
- **Kachel-Sätze in `welt/welt.js`**: `WELT.addSet('zonen/vessra/')` meldet einen weiteren Satz an (Basis `<welt-test>/zonen/vessra/`,
  eigene `meta.json`, mehrfacher Aufruf schadet nicht); das macht `welt/vessra.js` schon beim Laden – ohne Netzabruf, die `meta.json` wird erst geholt, wenn Kacheln
  gebraucht werden. Danach kommt **jede Kachel aus dem ersten Satz, dessen Rechteck sie enthält** – egal wo die Kamera ist: Plan um
  Fußgänger bzw. Kamera, `WELT.need(id, true)` genügt (auch für ein fahrendes Fahrzeug). `WELT.need(id, on, sub)` darf den Satz gleich
  mitnennen. `WELT.state().sets` zeigt die Sätze (`+` geladen, `!` Fehler, `?` noch nicht gefragt), `WELT.sampler(...)` liefert eine
  Höhenfunktion mit `f.tiles` (0 = kein Satz deckt das Rechteck).
- Ohne veröffentlichte Kacheln (z. B. lokaler Testserver ohne `dist/welt-test/zonen/vessra/`) bleibt der Ort auf dem 120-m-Gelände von
  `world/ratscher.js` stehen (`VESSRA.status().noTiles`).
- `welt/welt.js` gehört heute `feat/vessra`; Änderungen der Fahrt bitte nur an markierten Zeilen (`// feat/fahrt`).

## Quellen
Gebäude, Straßen, Orte © OpenStreetMap-Mitwirkende (ODbL); Gelände/Luftbild der Kacheln © GDI-Th (CC BY 4.0), Copernicus DEM GLO-30,
ESA WorldCover (`welt-test/ATTRIBUTION.md`); Fotos nur als Vorlage (`tools/fotos/katalog.json`: Panoramax 2025, Wikimedia Commons u. a.
Ermell 2021/2022, Tilman2007 2025), keine Bilder im Repo.

## Testen
- Kacheln neu bauen: Push auf `feat/vessra` mit Änderungen an `tools/welt/*.py` (außer `zone_*.py`, `test_welt.py`) oder an
  `.github/workflows/welt-vessra.yml`. Zonendaten: `python3 -I tools/welt/zone_vessra.py --raw <Cache-Ordner>` (OSM-API, Luftbild per WMS)
  → `viz3/extra/vessra/dist/vessra/ort.json`.
