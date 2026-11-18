# Auftrag: Böden – Straßen, Plätze, Höfe, Wege ohne Wiederholung und ohne Sterilität (Hilfs-Agent `foto-boeden`)

Gestartet 18.11.2026 ~19:35 vom Fotorealismus-Chat (session_01L6Yrpe4euXqyTbnuvdamYz). Branch `feat/foto-boeden` (von `feat/fotorealismus` `6ecd5194` = `src` mit
V19e und dem Zwischenstand Wald), Worktree `/home/claude/wt-foto-boeden`, Port 9074, Berichte und Bilder
`/home/claude/scratch/foto/boeden/`. **Zuerst lesen:** `docs/plans/auftraege/foto-gemeinsam.md` (Falkos Auftrag, die Regeln für alle).
Bilder des Bestands von heute Abend: `/home/claude/scratch/foto/*.jpg` (Wald, Dorf, Schleusingen, Wiese).

## Brief (English)

Goal: the ground one walks and drives on shall look like the real thing up close – asphalt that has been driven on and patched,
setts with joints, gravel with stones, paths with ruts – and nowhere a pattern that repeats or a carpet of noise.

What the lead found tonight (pictures `dorf_strasse`, `dorf_strasse2`, `schleusingen`, `halle_welt`):
- The village street: smooth grey asphalt of one tone; the square beside it and the yards: an even speckle. The market of
  Schleusingen: a pale **carpet of noise** where setts should be. Nothing is worn, cracked, patched, stained or overgrown at its edge.
- Falko's brief: „Straßen mit Asphaltstruktur, Rissen und Reparaturstellen. Waldwege mit Erde, Steinen und Vegetation. Beton mit
  Poren, Verfärbungen und Alterung.“ – „Detailtexturen im Nahbereich. Vermeidung sichtbarer Texturwiederholungen. Realistische
  Übergänge zwischen Wald, Wiesen, Feldern, Straßen und Bebauung.“

Find out first how the ground is shaded: the roads' GLSL in `world/roads.js` (`roadShade`, `landDetail`, `landHi`, the wet road),
the terrain's material in `world/ratscher.js`, the garden's ground in `garden/env.js` (`mkGroundMat`), the world's tiles in
`welt/welt.js` (`weltGround`, `setts`), the squares and paving of the towns, and the detail texture array `core/detail.js` (seven
layers: lawn, lawn2, gravel, forestfloor, asphalt, needles, mossfloor). **The ground shaders stand at 16 textures** – new detail
only procedurally or as one more layer of that array (memory: the array is 7 × 1024² × 4 on computers, half the edge on phones).
The ground covers most of the picture: every instruction you add runs for most pixels on an Intel UHD 620 – keep the shader work
small (detail only near the camera, faded out by distance; no loops over many taps).

Your steps (the first one is 1):
1. **Asphalt and hard roads:** grain of the aggregate up close, a lighter worn track where the wheels run and a darker middle,
   cracks (few, long, branching – a procedural line field, not noise), repair patches (rectangles and strips of another grey, by a
   hash along the road, more in the village and on small roads), the edge crumbling into the verge with grass and dirt creeping in,
   manhole and drain covers in built-up streets if cheap. Different by road class (a county road is better kept than a lane).
2. **Setts and squares:** a real sett pattern with joints where the maps or zones say paving (the market of Schleusingen – see how
   `welt.js` `setts()` and the town's ground are chosen, and why the market shows noise), each stone a little different, worn
   lines where people walk, joints darker and mossy at the edges.
3. **Yards, gravel, farm tracks, field and forest paths:** gravel with single stones and fines, tyre tracks, puddle hollows (dry:
   darker, cracked silt); two ruts with a grass middle on tracks; forest paths with needles and roots.
4. **No repetition anywhere:** where a tiling texture shows its tile (look from 3 m and from 30 m, flat views), break it – two
   scales blended, a slow change of tone and roughness over tens of metres.
5. Later: concrete (pores, stains, joints), kerbs and gutters, markings worn off.

Your files: `viz3/src/world/roads.js` (the GLSL), the ground parts of `viz3/src/welt/welt.js` and `viz3/src/garden/env.js` (marked
lines; both carry one line of the lead: `reflectedLight.directSpecular *= mix( 0.3, 1.0, … )` – keep it), `viz3/src/core/detail.js`,
the paving of the towns where it is chosen (marked lines), new `viz3/test/foto_boeden.py`, `viz3/extra/foto-boeden/**`,
`docs/features/foto-boeden.md`. Not yours: the roads' geometry and data (`strassen/`, the Straßen-Chat's work), the vegetation's far
layer `bwFar` (helper `foto-wald`).
Budgets: no new sampler; the frame's draw calls unchanged; `gpu`, `softgl` (load time without a graphics card: the shaders must not
grow much – every line is paid at every pixel there), `strassen`, `smoke`, `leistung`, `memphone` green.
Views (x, y, eye height m, yaw °, pitch °, vertical fov °; 15:30 on 1 June, weather `klar`, tier `hoch`):
the Anger's street `242,-101,1.6,292,-8,62` and the same from 0.6 m · `300,-160,1.6,20,-6,62` · Hubert's yard `-12,8,1.6,-112,-10,62` ·
the field path `62,31,1.6,112,-8,60` · the market of Schleusingen `-1100,1215,1.6,-118,-6,62` (40 s of `GAME.step` after the jump) ·
the county road L 1625 (pick a spot with `KERN.surface`) · one of them wet (`?wetter=regen`).
