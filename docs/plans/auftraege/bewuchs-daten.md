# Auftrag: Flächenart für den Bewuchs – eine Karte je Zelle, was wo wächst (Hilfs-Agent `bewuchs-daten`)

Gestartet 17.11.2026 ~21:40 vom Straßen-Chat (session_01WqScFDtq8GSy4n7wU7foJx). Branch `feat/bewuchs-daten` (von `src`), Worktree
`/home/claude/wt-bewuchs-daten`, Port 8966. Plan: `docs/plans/plan_bewuchs.md` (Falko 17.11. 20:19; um 21:30 gewählt: Rasen und Gras
**und** Wiesen und Wildblumen zugleich, Äcker als letzter Schritt, zwei Hilfs-Agenten – dieser für die Daten, `bewuchs-pflanzen` für die
Arten).

## Brief (English)

Goal: for every place of the world a small map that says what grows on the ground – the **where** of the vegetation template. The lead
(Straßen-Chat) builds the template that draws grass blades, flowers, bushes and beds from it (`viz3/src/bewuchs/`); the helper
`bewuchs-pflanzen` makes the species (the **what**). You make the maps.

1. **Format** (fixed – ask the lead in your report before changing it):
   - Cells of 400 m on the model grid of `gebaeude/z/` (key `i_j`: model x ∈ [400 i, 400 (i + 1)), y ∈ [400 j, 400 (j + 1)); model
     metres, x east, y north of the site frame – the frame of `tools/geo/dop_th.py` (`model_xf`: scale 1.0157, 4.36°)).
   - One 8-bit greyscale PNG per cell: `viz3/extra/bewuchs-daten/dist/bewuchs/z/<i>_<j>.png`, (400 / res)² pixels, north up: the centre
     of pixel (u, v) is model (400 i + (u + 0.5) · res, 400 (j + 1) − (v + 0.5) · res). res = 0.5 m inside Ratscher's square and in
     villages and towns, 1 m elsewhere (per cell in the index).
   - Value = class (bits 0–4) + 32 × vigour (bits 5–7: 0 bare or worn … 7 lush; from the infrared and colour image within the class).
   - Classes (ids fixed): **0** nothing (carriageway, path, yard, sealed, building, water, unknown) · **1** zierrasen (private lawn,
     mown weekly) · **2** oeffentlich (public green: Anger, church, school, playground, park, green strips in villages and towns) ·
     **3** bankett (verge outside built-up areas: from ~0.3 m beyond the carriageway edge out to ~2.5 m or to the ditch or field edge) ·
     **4** maehwiese (hay meadow) · **5** weide (pasture) · **6** streuobst (orchard meadow) · **7** saum (margins between fields and
     meadows, fallow, ditches, embankments, unmanaged strips; tall herbs) · **8** ufer (stream and pond banks) · **9** acker (arable
     field) · **10** ackerrand (the outer ~2 m of a field towards a path, meadow or road) · **11** waldboden (under closed canopy) ·
     **12** gebuesch (scrub, bush groups, not trees) · **13** beet (ornamental beds) · **14** gemuese (vegetable plots) ·
     **15** verkehrsgruen (traffic islands, roundabout centres, medians, car-park islands) · **16** friedhof · **17** sportrasen
     (pitches) · 18–31 reserved.
   - `z/index.json`: `{ "v": 1, "cell": 400, "classes": [names by id], "cells": { "i_j": { "res": 0.5, "n": { "<id>": pixels } } },
     "quelle": "…", "stand": "YYYY-MM-DD" }`.
   - **Falko's garden:** one finer map `viz3/extra/bewuchs-daten/dist/bewuchs/garten.png` (0.25 m, same codes, same orientation) over
     the modelled site x −50…42, y −52…48 (the zone where the model, not OSM, applies – `docs/ARCHITECTURE.md` §11), with its box in
     the index (`"garten": { "x0": -50, "y0": -52, "res": 0.25 }`): lawn (1) where it is mown today (the lawn of `garden/grass.js`),
     fringe (7) where it is not (along fences, hedge feet, the edges of the plot), the brook's banks (8), beds (13, 14) only where the
     docs show them (`docs/features/garten.md` „Garten wie heute“, `docs/plans/garten_fotos_abgleich.md`). Leave buildings, gravel and
     the ditch itself to the runtime (they move with the plan view; mark them as lawn).
2. **Order:** (a) **Ratscher's 2.4 km square** (`RATSCHER.box`: the village, the garden, Hubert's and Ronald's plots, the meadows,
   pastures and fields around, the L 3004 and L 1625) and the garden map – first and as soon as you can; the lead needs them for stage
   1 + 2. Then finish your turn with report 1 (below); the lead resumes you. (b) The road corridors to Schleusingen and Kloster Veßra
   (the cells of `dist/gebaeude/z/index.json`), Schleusingen's town zone, Kloster Veßra. (c) All world tiles (`welt-test/` meta) –
   with a push-triggered workflow on GitHub Actions if it is too much for this machine (never start a workflow by hand). (d) Later
   (stage 5): the crop of each field (from the image's colour by flight date and season) – the lead says when.
3. **Sources:**
   - OSM (landuse, leisure, natural, barrier=hedge, amenity=grave_yard, place, area:highway, junction=roundabout) through the OSM API
     `https://api.openstreetmap.org/api/0.6/map` – reachable here; small tiles, at most one call a second, cached, a User-Agent like
     `tools/daten/osm_extrakt.py`. Overpass and Geofabrik are **not** reachable from this machine (only in GitHub Actions, see
     `.github/workflows/welt-dinge-osm.yml`); do not retry blocked hosts.
   - The roads as the app has them: `world/roads.js` (`ROADS`), `welt/fahrt.js` (`FAHRT.data.ways`), `viz3/dist/strassen/`,
     `tools/geo/build_roads.py` – carriageway and footway widths, built-up areas.
   - Buildings: `viz3/dist/geo/buildings.b64.json`, `viz3/dist/gebaeude/ratscher.json` and `z/`, the village of `world/village.js`.
   - Thuringian orthophoto 20 cm in colour (`th_dop`) and colour infrared (`th_dop20cir`) from the WMS
     `https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP` (reachable; `tools/geo/dop_th.py` gives the model frame and the
     flight date of a tile with `--info`). Heights where they exist (Ratscher: DGM1/DOM1, see `world/ratscher.js` and `tools/geo/`) to
     tell scrub (0.5–4 m) from trees; the measured trees (`RATSCHER.trees`) for forest floor.
   - Data that only the running app has: dump it with Playwright through `bash tools/browser_lock.sh …` on port 8966 (e.g. ROADS,
     VILLAGE, GEB, RATSCHER.trees as JSON into your scratch folder).
   - Others' greens: `stadtgruen` (Schleusingen's and Ratscher's street trees, avenues, hedges: `viz3/extra/stadtgruen/dist/stadtgruen/`
     `baeume.json`, `ratscher.json`) – their hedges are 0 here; `welt-wald` (forests of the region, own 400 m cells, later) – their
     forests are 11 here.
4. **How to classify** (a guide – improve it where the image says otherwise): green or bare from NDVI (CIR); lawn (smooth, even, bright)
   versus meadow (coarser, darker or yellower, seed heads in June flights) from texture statistics at 20 cm inside the villages;
   private gardens = green inside the plots of houses (in front of and behind them) → 1; public greens from OSM and their place
   (village_green, park, grass inside the village, church, school, playground) → 2; verge (3) along every road outside built-up areas;
   pasture (5) where OSM says or the image shows grazing; fields (9) from OSM farmland and the image (bare soil, rows), margins (10);
   banks (8) along waterways (OSM, the garden brook `garden/stream_geo.js`); cemetery (16) and pitches (17) from OSM. Vigour from NDVI
   within the class (shade under trees, worn paths across meadows, bare patches).
5. **Checks:** sheets of pictures – the orthophoto with the classes drawn over it, half transparent, with a legend – for the whole
   square and five close-ups (the garden, the Anger, Hubert's yard with Ronald's meadow, the L 3004 verge, a field edge), into your
   report folder and **not** into the repo (they show the orthophoto); a table of class areas (ha) per cell; unit tests for the pure
   parts (`tools/bewuchs/daten/test_*.py`).
6. **Files:** only `tools/bewuchs/daten/**`, `viz3/extra/bewuchs-daten/**` (the dist above and a `manifest.json` with `credits_add`:
   „Flächenart aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0) und dem Luftbild Thüringen (© GDI-Th, dl-de/by-2-0)“),
   `docs/features/bewuchs-daten.md` (method, sources and licences, numbers, how sure each class is, how to run again),
   `.github/workflows/bewuchs-daten.yml` only if needed. Raw data (images, OSM XML) stay out of the repo (cache in
   `/home/claude/bewuchs-raw/`). Each PNG < 200 KB, the square together < 3 MB.
7. **Way of working:** only your worktree and branch. Browser only through the lock on port 8966. Heavy downloads and numpy work with
   `nice -n 10` (two cores shared with the lead and another agent). WIP to `wip/bewuchs-daten` (no CI). Before pushing to
   `feat/bewuchs-daten`: merge `origin/src`, `bash tools/check.sh`, then one solid push (CI costs credits). Never merge into `src` or
   `live`, never force-push, no bare `git stash`. Report 1 (the sheets, the class table, the index; what is uncertain) to
   `/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/bewuchs/daten/` when the square and the garden map
   stand – then end your turn with a short report; the final report with numbers and open points.
8. Code comments English, UI German; no keys, no parcel or private data (Falko's garden photos are private and not on this machine – do
   not look for them). Commits with `-c user.name="Claude" -c user.email="noreply@anthropic.com"`; messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01WqScFDtq8GSy4n7wU7foJx`.
