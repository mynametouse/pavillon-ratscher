# Auftrag `suhl-technik` – Technischer Entwurf: ganz Suhl als Teil der Spiegelwelt; Sichtung des Altbestands vom 26.10.

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~0:15 als Hilfs-Agent, Branch `suhl/technik`, Worktree
`/home/claude/wt-suhl-technik`. Gemeinsamer Teil: `docs/plans/auftraege/suhl-gemeinsam.md` (zuerst lesen). Hier steht der Auftrag wörtlich
(englisch). Was schon fertig ist: `docs/plans/plan_suhl.md`, `docs/plans/suhl/altbestand.md` und `git log origin/suhl/technik`.

---

## Your topic: how a whole city fits into the app

Stage 1 of the Suhl plan. You read the code and design; you change no app code. Two documents come out: what of the first attempt
(26.10.2026) can be reused, and the technical design from which helper agents can build stage 2 (the whole city from data) and stage 3
(the pilot quarter Zentrum in the highest quality) without colliding with each other or with other chats.

You own (only these): `docs/plans/plan_suhl.md`, `docs/plans/suhl/altbestand.md`.

## Read (in your worktree = `origin/src`)

- `docs/ARCHITECTURE.md` (all of it; the KERN services, zones, lazy packages, §10 with the performance rules and measured numbers),
  `docs/WORKFLOW.md`, `docs/features/` for schleusingen, vessra, fahrt, welt-gebaeude, welt-dinge, bus, verkehr, wetter, strategie, wissen,
  `tools/welt/QUELLEN.md`.
- Code: `viz3/src/welt/` (welt.js, schleusingen.js, vessra.js, fahrt.js), the 3D buildings from ETHOS (find the module that
  `docs/features/welt-gebaeude.md` names), `viz3/src/world/village*.js` (facade and roof shaders, `styleOf`, `wallMat`, `roofOf`),
  `viz3/src/verkehr/`, the bus module, `viz3/src/strategie/` (the view from above), `viz3/test/blickpunkte.py` (model pictures from photo
  standpoints) and the tests of Schleusingen, Veßra and the drive; the pipeline `tools/welt/*.py`, `tools/welt-gebaeude/*.py`,
  `.github/workflows/welt-*.yml`.
- The what-if mode that another chat is building right now – read only: `git fetch --depth 1 origin feat/zukunft feat/zukunft-welt`,
  then `docs/features/zukunft*.md` and `viz3/src/zukunft/` there – to know which hooks Suhl should offer.
- The first attempt: `origin/feat/suhl` (`tools/welt/zone_suhl.py`, `.github/workflows/welt-suhl.yml`; its run „Welt-Zone Suhl“ failed on
  26.10. – find out why: `gh run list --branch feat/suhl`, `gh run view <id> --log`), `origin/feat/suhl-fahrt`
  (`viz3/extra/suhl-fahrt/recherche.json`, `suhl_strecke.py`, `dist/fahrt/suhl.json`), `origin/feat/suhl-innen`, `origin/feat/suhl-leute`
  (research workflows), and the briefs `docs/plans/auftraege/suhl.md`, `suhl-innen.md`, `suhl-leute.md`, `suhl-fahrt.md` with the
  `SUHL.*` contracts. Those branches are two and a half weeks behind `src` (V16u → V17v). Fetch each with `--depth 30`.

Decisions and proposals of 22.10.2026 from the project document „Welt bis 150 km“ (you cannot read it; this is its core): detail zones get
the aerial image at 20 cm, terrain at 1 m, buildings with true roof shapes (LoD2) plus facade styles and near detail, single trees from the
canopy height model; a ring to 10 km the same without near detail; further out coarser. Streets as their own geometry: axis from OSM moved
onto the real carriageway, longitudinal profile from the 1-m terrain smoothed per road class, cross-section with camber, verge, ditch and
embankment cut into the terrain, junctions as areas at one height, physics reads the road surface, a CI test per road class (waves per
km). Proposed technology: quadtree tiles; buildings and trees as 3D Tiles 1.1 (glTF with meshopt), terrain as height tiles, the aerial
image as image tiles (WebP, later KTX2), ways and names as vector tiles; a moving origin; decoding in web workers; budgets for the phone:
≤ 300 MB of textures, ≤ 80 shader programs, ≤ 15 MB to the first picture. Hosting of world data: Cloudflare R2 was chosen (10 GB free) but
Falko has not set it up; today everything is on GitHub Pages. Processing in GitHub Actions, never on the chat machine.

## Deliver

**A. `docs/plans/suhl/altbestand.md`** (German, short). Per old branch: what is there, its quality, why the tile run failed, what to keep
(files, ideas, data), what to drop, and how to bring it forward (merge `src` into it, or take the files over into new branches).

**B. `docs/plans/plan_suhl.md`** (German; identifiers in English). Tables rather than prose; every assumption marked as one.

1. **Scale.** Areas and expected counts (buildings, trees, km of streets – from `origin/suhl/bestand` once it has numbers:
   `git fetch origin suhl/bestand`; until then estimates, marked). The distance from the model origin (13–14 km): coordinates and
   precision in shaders and physics; how Schleusingen (3.7 km) and Kloster Veßra (10 km) handle it today; what Suhl needs (its own local
   origin?).
2. **Data products and pipeline** (GitHub Actions). Terrain (1 m where Falko's manual downloads exist, Copernicus 30 m otherwise – how to
   mix them and swap later), the aerial image, buildings (LoD2 roofs when available, ETHOS footprint and height meanwhile; one record per
   building: id, footprint, heights, roof faces, facade parameters per side, roof look, use, era, flags), streets as geometry with
   profiles, trees, water, railway, street furniture. The tile scheme (sizes, levels, formats, file sizes), names, versions. Hosting:
   measure what `gh-pages` holds today (GitHub API or `git ls-tree -r -l` on a shallow blob-less fetch), the limits of GitHub Pages, MB
   per km² per product, and a recommendation with numbers (GitHub Pages, a separate data repo, Cloudflare R2).
3. **Runtime.** Loading by distance and freeing (what `KERN.zone` and `WELT` do today), detail levels for a whole city (near: full facades
   and street space; middle: buildings with roofs; far: skyline and tile texture), building in slices, workers, the budgets on the iPhone
   tier and on Falko's laptop (Dell Latitude 7290, Intel UHD 620, 16 GB) with the existing limits and tests (`memphone`, `gpu`: at most 16
   textures per shader program; no new point lights; number of shader programs), collision and ground for walking and driving, the
   minimap and the view from above (how it gets the true roofs), night (windows, lamps without new lights), weather, seasons.
4. **"More real than Schleusingen"** – each lever and how to do it within the budgets: (a) true roof geometry and the roof's look from
   the aerial image (classification of colour and material per roof face versus a real texture atlas cut from the image; the 20-cm
   orthophoto is not a true orthophoto, roofs are displaced by building lean – options), PV panels, dormers, chimneys; (b) facades per
   building side after street photos: which parameters (material, colour, floors, window grid, shop zone on the ground floor, balconies
   and loggias of prefab blocks, plinth, gable), how agents extract them by looking at photos, the generator, and where real photo
   textures are worth their cost (landmarks); (c) street space: carriageway, kerbs, sidewalks, markings, crossings, signals that work,
   signs, lamps, bus stops with the timetable, trees, walls and steps on the slopes, parked cars from the aerial image (existing
   `welt-dinge`), shop signs with real names; (d) landmarks as detailed hand-built replacements, interiors on entering; (e) life: people,
   traffic, buses on the real timetable – what the existing modules need from Suhl; sounds.
5. **Quality control.** The photo comparison (the model from the position, direction and field of view of a real street photo next to the
   photo; a score per street; where it runs; how agents look at it), the comparison from above against the aerial image, geometric checks,
   performance tests; the acceptance criteria for „Zentrum fertig“.
6. **Contracts.** `SUHL.*` updated for a whole city with quarters (areas, `SUHL.building(id)`, `SUHL.detail`, events, and `SUHL.data` for
   the what-if mode: per building use, floor area, roof area and orientation, residents estimate, era; sums per quarter). The hooks needed
   in shared files (menu spots, `welt/welt.js`, `welt/fahrt.js`, bus data, minimap) as a list of wishes, each as small and marked as
   possible.
7. **Work packages** for stage 2 and stage 3: goal, files and folders owned (no overlaps), inputs, test, dependencies, rough size; which
   can run in parallel; the order in which things reach `src` (small, lazy, nothing loaded at the start).
8. **Risks and open questions** – for Falko only the decisions that are really his.

Push `altbestand.md` first (within ~25 minutes), then the plan in increments.
