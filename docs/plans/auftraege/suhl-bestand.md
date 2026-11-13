# Auftrag `suhl-bestand` – Datenkarte Suhl: Gebiete, Gebäude, Straßenraum, Luftbild, Landesdaten, Kachelliste für Falko

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~0:15 als Hilfs-Agent, Branch `suhl/bestand`, Worktree
`/home/claude/wt-suhl-bestand`. Gemeinsamer Teil: `docs/plans/auftraege/suhl-gemeinsam.md` (zuerst lesen). Hier steht der Auftrag wörtlich
(englisch). Was schon fertig ist: `docs/features/suhl-bestand.md` und `git log origin/suhl/bestand`.

---

## Your topic: the inventory of geodata for the whole city of Suhl

Stage 1 of the Suhl plan. You find out what data exist for Suhl, in which quality and where the gaps are – and you prepare the list of
state-data tiles that Falko will download by hand. No app code.

You own (only these): `tools/suhl/bestand/**` (scripts), `tools/suhl/out/bestand/**` (small results), `.github/workflows/suhl-bestand.yml`,
`docs/features/suhl-bestand.md`, `docs/features/suhl-landesdaten.md`; scratch branch `ref/suhl-bestand` (pictures).

## Deliver, in this order

1. **Areas** → `tools/suhl/out/bestand/gebiete.geojson` (EPSG:4326, plus each area's bounding box in UTM 32N km in the properties).
   `stadt` = the municipal boundary of Suhl from OpenStreetMap (kreisfreie Stadt; keep the relation id). `kernstadt` = the contiguous
   built-up area in the valleys around the centre (derive it from building footprints and/or landuse connected to the centre; write down
   the rule). `zentrum` = the pilot quarter: a polygon of roughly 0.5–1 km² that contains Markt, Steinweg, Rathaus, Hauptkirche St. Marien,
   Kreuzkirche, Waffenmuseum, Congress Centrum Suhl with the Platz der Deutschen Einheit and the Bahnhof – find these in OSM and list what
   is inside. Plus every named Stadtteil/Ortsteil inside the boundary (place=suburb/quarter/neighbourhood/village/hamlet) as a point, and
   their boundaries if mapped. **Push this first, within ~25 minutes** – the other agents wait for it; a first cut is fine, refine later.
2. **The state-data tile list for Falko** → `docs/features/suhl-landesdaten.md` (German), `tools/suhl/out/bestand/kacheln.csv`, and map
   pictures on the scratch branch. Which tiles of DGM1 and DOM1 (1 km) and LoD2 (2 km) cover: **P1** = `zentrum` + 300 m, **P2** =
   `kernstadt` + 300 m, **P3** = the rest of `stadt`, **P4** = the two road corridors garden → Suhl outside P1–P3 (routes in
   `origin/feat/suhl-fahrt:viz3/extra/suhl-fahrt/recherche.json` and `…/dist/fahrt/suhl.json`; 600 m to both sides). Per tile: E/N in km,
   the file names (see the common file), priority. Counts per priority and product. The maps: the tile grid with readable labels over the
   boundary, the areas and the streets or the aerial image – legible on a phone, several pictures if needed. Falko cannot be asked to click
   200 tiles without need: say honestly how many are needed for what. Also request the old download URLs for one Suhl tile of each product
   today and write down what answers, with date and time.
3. **Automated alternatives to the manual download** – probe and document, no bulk download: does
   `https://www.geoproxy.geoportal-th.de/geoproxy/services/` (or the WMS/WFS capabilities you can find through GeoMIS.Th / the GDI-DE
   catalogue) offer elevation as data (WCS, INSPIRE Elevation), 3D buildings (an INSPIRE Buildings 3D ATOM feed or WFS), ALKIS building
   footprints with their function (WFS, INSPIRE `bu2d`), house coordinates, true orthophotos, an image-based surface model, oblique images
   or a 3D mesh? Does `basemap.de` offer open 3D buildings or terrain tiles? For each: URL, what a request for a small box in Suhl returns
   (format, resolution, attributes), licence, usable from GitHub Actions or not. Mark clearly what you verified with a real request.
4. **Buildings** – counts and completeness inside `stadt`, `kernstadt`, `zentrum`: (a) OpenStreetMap `building=*`: how many, and the share
   with levels, height, roof:shape, roof colour/material, building material/colour, start_date, name, address; (b) ETHOS.BUILDA
   (`tools/welt-gebaeude/filter_ethos.py`, Zenodo 11845992 `DEG.csv`, several GB – stream it in Actions): how many, height distribution,
   which fields; how well both sets match (by overlap). A list of the tall buildings (≥ 25 m) with position – the skyline.
5. **Street space in OSM** inside `kernstadt`: km of highway by class; the share with lanes, surface, maxspeed, sidewalks (as tag or as
   separate ways), lit, cycleway; counts of traffic signals, crossings (by type), street lamps, bus stops and platforms, single trees and
   tree rows, retaining walls and walls, steps, bridges and tunnels, railway (tracks, station, level crossings), waterways (Lauter, Hasel
   …, also culverted parts), parking areas, playgrounds and pitches, shops and amenities with a name (count by type). This shows what the
   street space can be built from and where photos must fill the gaps.
6. **Aerial image:** the flight date per 1-km tile over `stadt` from the WMS layer `th_dop_info` (see `tools/welt/fetch.py`,
   `flight_dates`), where the seams between flight days are; which other products the WMS offers (infrared, older years, a time dimension
   or historic orthophoto services) – useful later for change over time.
7. **Public transport data** (last, if time allows) from the gtfs.de free feed (pattern: `viz3/extra/bus/quellen/fahrplan.py`): stops and
   lines inside `stadt` (operator, line numbers, trips per weekday type), which lines connect Suhl with Schleusingen and Ratscher, the
   railway station(s) and train lines in the feed. Counts and names only.
8. `tools/suhl/out/bestand/bestand.json` (all numbers, machine-readable, with `made` and the sources) and `docs/features/suhl-bestand.md`
   (German: the Datenkarte in words and tables – what exists where in which quality, what is missing; a section „Für den Suhl-Chat“).

## Method

- One workflow `.github/workflows/suhl-bestand.yml`: `on: push` to `suhl/bestand` with `paths` = your scripts and the workflow file;
  `permissions: contents: write`; `concurrency: { group: suhl-bestand, cancel-in-progress: true }`; timeout 60 min; Python 3.12; an
  Actions cache for raw downloads. One script per source, so that a source that fails does not lose the others (`continue-on-error` or
  try/except with the error written into the result). The job commits `tools/suhl/out/bestand/**` back to `suhl/bestand` (pull --rebase
  first; a push with the default token does not start a new run) and puts the pictures as one orphan commit on `ref/suhl-bestand`.
- OpenStreetMap: the Geofabrik extract `thueringen-latest.osm.pbf` cut to the boundary with `osmium` (apt package `osmium-tool`); the
  boundary itself through the OSM API or Nominatim. Quick experiments from this machine are fine where the host is reachable.
- Look at your own pictures (Read tool after `git fetch origin ref/suhl-bestand`) before you report: are the labels readable, is the
  boundary right, do the tile numbers match the names?
- Patterns to read: `tools/welt/fetch.py`, `tools/welt/wlib.py`, `tools/welt/QUELLEN.md`, `.github/workflows/welt-dinge-osm.yml`,
  `.github/workflows/welt-vessra.yml`, `tools/welt-gebaeude/lod2.py` (the LoD2 tile URL and what the maintenance page looks like).
