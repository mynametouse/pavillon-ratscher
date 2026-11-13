# Auftrag `suhl-gruen` – Stufe 2, Paket S2-4 „Grün“: Bäume, Wald, Grünflächen der ganzen Stadt

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~1:30 als Hilfs-Agent, Branch `suhl/gruen`, Worktree
`/home/claude/wt-suhl-gruen`. Zuerst lesen: `suhl-gemeinsam.md`, `suhl-stufe2.md`, dann `docs/plans/plan_suhl.md` Abschnitte 2.1, 2.4,
3.3, 5.2, 5.3 und die Zeile S2-4 in 7.1. Hier steht der Auftrag wörtlich (englisch). Stand: `docs/features/suhl-gruen.md`,
`git log origin/suhl/gruen`.

---

## Your topic: every tree where it really stands

Suhl lies in a forest valley: 142 km², most of it wooded slopes; in the town street trees, gardens, parks. From above and from afar
the trees make half the picture. Roadside furniture (lamps, signals, signs, stops) belongs to `suhl-strassen`, not to you.

You own (only these): `tools/suhl/gruen/**`, `tools/suhl/out/gruen/**`, `.github/workflows/suhl-gruen.yml`, `docs/features/suhl-gruen.md`.

Build on what exists, without changing it: `tools/welt/trees.py` and how the village's ~21,000 trees were found (canopy height model
= surface minus terrain, vegetation from the infrared aerial image, height and crown width per tree, leaf or needle by brightness and
stand – `docs/ARCHITECTURE.md`, `docs/features/` for the forest), `tools/welt/landcover.py`; the app's tree formats (how
`world/ratscher.js` and `world/forest.js` take trees: position, height, crown radius, kind) – read them so that your product can be
drawn with the existing tree models.

Sources today: the aerial image through the WMS (`th_dop` RGB and `th_dop20cir` infrared, 20 cm, flown 15.05.2024 – leaves are out),
OpenStreetMap (907 single trees and tree rows in the Kernstadt, forest and park areas, gardens, cemeteries, allotments), ESA
WorldCover (see `tools/welt/QUELLEN.md`). **Not yet:** the object-height model nDOM1 (1 m) – it comes through easygeodata as soon as
Falko's key `EASYGEODATA_KEY` exists (client in `tools/suhl/lib/`, by `suhl-daten`); with it, positions, heights and crown radii
become measured instead of estimated. Build the pipeline so that this input can be switched on without rewriting it.

## Deliver

1. **Sample set first (~45 minutes):** trees for the sample tiles of the Zentrum as `b/` tiles (plan 2.4: position, height, crown
   radius, kind, and a flag measured/estimated) under `tools/suhl/out/gruen/probe/suhl/b/v0/…` (≤ 3 MB), from the infrared image
   (vegetation index), a crown segmentation at 20 cm, and OSM trees where they exist. No tree on a roof or a carriageway (footprints
   and roads from stage 1 or from the sibling branches when they have them). A picture sheet on `ref/suhl-gruen` – the aerial image
   with your trees drawn on it – that you look at yourself: are the crowns where the trees are? Tell the lead when it is pushed.
2. **Kinds that matter for the look:** deciduous / conifer at least (infrared signature, texture, stand), larch and spruce stands in
   the forest if separable; street trees and park trees with plausible species classes; flagged as estimates. The forest's condition
   (bark-beetle clearings are visible in the 2024 image) as a layer for later scenarios – only if cheap.
3. **The whole city in GitHub Actions:** single trees in the built-up area and along roads; in closed forest not every tree
   individually but stands (polygons with kind, mean height, density) that the runtime can fill with instances and draw as texture
   from afar (plan 3.3) – propose the split and the format to `suhl-daten` (schema) and the lead. Green areas (lawn, meadow, garden,
   park, cemetery, pitch) as polygons with a surface class for the ground shader.
4. **Checks** (plan 5.2, 5.3): counts against OSM where OSM has trees, trees per hectare plausible by land use, none on roofs or
   carriageways, the centre of Suhl inside; a comparison sheet model-versus-aerial-image for three places (the Zentrum, a prefab
   estate, a forest edge).
5. `docs/features/suhl-gruen.md` (German): method, numbers (trees, stands, by kind), how sure each field is, what nDOM1 will improve,
   sources and attribution, how to run again, „Für den Suhl-Chat“.
