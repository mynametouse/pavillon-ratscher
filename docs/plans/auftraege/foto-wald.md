# Auftrag: Wald und Unterwuchs – natürlich, schattig, abwechslungsreich (Hilfs-Agent `foto-wald`)

Gestartet 18.11.2026 ~19:35 vom Fotorealismus-Chat (session_01L6Yrpe4euXqyTbnuvdamYz). Branch `feat/foto-wald` (von `feat/fotorealismus` `6ecd5194` = `src` mit
V19e und dem Zwischenstand Wald), Worktree `/home/claude/wt-foto-wald`, Port 9072, Berichte und Bilder
`/home/claude/scratch/foto/wald/`. **Zuerst lesen:** `docs/plans/auftraege/foto-gemeinsam.md` (Falkos Auftrag, die Regeln für alle).
Bilder des Bestands von heute Abend: `/home/claude/scratch/foto/*.jpg` (Wald, Dorf, Schleusingen, Wiese).

## Brief (English)

Goal: standing in a wood of the model shall feel like standing in a wood – a dark floor of litter and moss, plants in the shade in
patches, variety instead of a carpet, and the same for every wood of the world, not only the forest at the Klinge.

What the lead found tonight (pictures `wald_a`, `wald_c`, `wald_weg`, `wald_rand`, `wald_boden`, `wald_innen2`):
- The plants of the vegetation class `waldboden` (`bewuchs/bw_arten.js` `flaechen[11]`: farn, heidelbeere, fingerhut, brennnessel –
  cards of `bw_blume.js`) form a **bright, even carpet**: they are lit like open ground (normal up, the whole sun and sky – nothing
  knows that they stand under trees), far too dense and regular, all of one size and one green. In a dark spruce wood they glow.
- The **grass heads** (Grasähren, `bw_blume.js`: the cards whose drawing is light and neutral, tinted by `vFlTint`) look like pale
  translucent blobs up close (`wald_innen2`, also in the garden's lawn): shape, colour, size and light need work.
- Already done by the lead in the base commit (keep, refine): where the maps say wood the ground is litter and moss instead of the
  aerial photo's crowns (`bw_ferne.js`, class 11, the detail layers `forestfloor`/`mossfloor`); the forest's own ground cover
  (`world/forest.js` `cover()`: Poly Haven fern, stumps, logs) takes the canopy's shade per plant, a colour of its own and stands in
  patches; plant cards and blades no longer mirror the sky (`lights_fragment_end` lines in `bw_blume.js`, `bw_halm.js`).

Your steps (the first one is 1 + 2):
1. **Plants and blades of the woods in the wood's light:** a shade per class (a column of the class table that the shaders of
   `bw_blume.js` and `bw_halm.js` read) – the direct sun and the sky dimmed for class 11 (and a little for `gebuesch`, `saum` next to
   woods if it helps), tuned against the ground around them (the forest's floor gets `indirectDiffuse × (0.46, 0.5, 0.36)` and the
   direct light × (1 − 0.86 · canopy) under closed crowns, `world/forest.js` `S.LIGHT`). Outside the forest at the Klinge nothing
   knows the canopy – a constant per class is fine; where `FOREST` has its canopy map you may use it if it is cheap.
2. **Distribution like a wood:** patches and bare stretches (a soft field of 8–20 m, the vigour bits of the maps, the class's
   `kahl`), fewer and smaller ferns, the blueberry as a low carpet in places, sizes and greens varied per plant (hash), some brown
   fronds; nothing in rows, nothing evenly spaced. Check `flaechen[11]` (density, mix) against a real spruce and mixed wood of the
   Thuringian Forest's foreland – say in the doc what you assumed.
3. **Grass heads** that read as seed heads of grasses at arm's length and at ten metres (and do not glow).
4. **More variety on the floor without new draw calls:** moss cushions, cones, twigs and fallen needles in the floor's shader (near
   the camera), the dead branch of `wald_a` (a model part that shows as black scribbles – `cover()`'s `deadlog`), young trees if the
   budget allows. The far look of a wood's edge from the fields (dark inside, lit rim).
5. Later: the same care for `gebuesch`, `saum`, `ufer`.

Your files: `viz3/src/bewuchs/**`, `viz3/src/world/forest.js` (marked lines), `viz3/test/bewuchs.py` (extend), new
`viz3/test/foto_wald.py`, `viz3/extra/foto-wald/**`, `docs/features/foto-wald.md`, `docs/features/bewuchs.md` (a paragraph).
Budgets: one draw call per ring as now; the triangles of the rings as `viz3/test/bewuchs.py` (section `leistung`) checks them; run
`bewuchs`, `smoke`, `leistung`, `fotorealismus:ferne` before the report.
Views (x, y, eye height m, yaw °, pitch °, vertical fov °; 15:30 on 1 June, weather `klar`, tier `hoch`):
`-475,-600,1.6,40,3,62` · `-440,-650,1.6,350,2,62` · `-460,-610,1.6,130,-32,62` · `-400,-530,1.6,250,0,62` · `-380,-420,1.6,240,2,60` ·
meadow with heads `-490,-450,1.6,200,0,62` · the garden's lawn `4,23,1.6,186,-9,62`; one of them again at 9:00 and at 20:00.
