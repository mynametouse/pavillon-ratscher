# Auftrag: Bäume – Laub mit Licht und Farbe, ferne Bäume ohne Wiederholung und ohne Herbst im Juni (Hilfs-Agent `foto-baeume`)

Gestartet 18.11.2026 ~19:35 vom Fotorealismus-Chat (session_01L6Yrpe4euXqyTbnuvdamYz). Branch `feat/foto-baeume` (von `feat/fotorealismus` `6ecd5194` = `src` mit
V19e und dem Zwischenstand Wald), Worktree `/home/claude/wt-foto-baeume`, Port 9075, Berichte und Bilder
`/home/claude/scratch/foto/baeume/`. **Zuerst lesen:** `docs/plans/auftraege/foto-gemeinsam.md` (Falkos Auftrag, die Regeln für alle).
Bilder des Bestands von heute Abend: `/home/claude/scratch/foto/*.jpg` (Wald, Dorf, Schleusingen, Wiese).

## Brief (English)

Goal: trees that look like the trees of this land in this month – leaves that glow green against the light instead of turning
cream, crowns with depth, and rows and woods in the distance in which no two trees look alike.

What the lead found tonight (pictures `dorf_strasse` – the lime at the Anger; `wald_innen` – the far rows; `/home/claude/scratch/out/land/f_2_an.jpg`
– the lime at 20:00):
- **Leaves of the 3D trees** (`garden/trees.js` `buildTreeKind`: EZ-Tree, a `MeshStandardMaterial` with crown-shaped normals,
  roughness 0.8): pale grey-green in the afternoon, **cream-white in the evening sun** (the sun's keys in `time/daynight.js` are not
  yours: at 8° the sun is as strong as at noon and warm – the leaves must cope). Leaf cards read as flat cut-outs.
- **Far trees** (`world/ratscher.js`: the canopy model's ~21 000 trees, 3D cells near, crossed cards from an atlas beyond ~100 m):
  kinds with **orange-yellow crowns and white trunks stand among the green in June** (which kind is that, and should its colour
  follow the date like the larches of `world/forest.js`?), rows of small round trees of one size and one green, evenly lit.
- Plant cards and blades mirrored the sky at a grazing view until tonight (`reflectedLight.indirectSpecular` – see `bw_blume.js`,
  `bw_halm.js`); leaves probably do the same.

Your steps (the first one is 1 + 2):
1. **Leaves in the light:** no mirror of the sky or the sun on a leaf card beyond a faint sheen; light through the leaf (a cheap
   transmission term: lit from behind a leaf glows yellow-green – by the sun's direction against the view and the normal); deep,
   natural greens that stay green in strong warm light (check tint × texture against real leaf reflectance, and what AgX does with
   bright greens); darker inside the crown (the cards' place in the crown is known – a baked occlusion per vertex or per card).
2. **No two alike:** per tree a hue, a brightness, a size and a turn of its own (instance colour and matrix, hash of its place) for
   the 3D trees and the far cards; the cards mirrored and stretched a little; in a row the heights uneven.
3. **The month's colours:** every kind of the far atlas and of the 3D kinds in June green (and in October what it is then, if the
   kinds are known) – find the orange ones and give them their real season; birch and poplar trunks light, the rest dark.
4. **Near to far:** the change from the 3D tree to the card at ~100 m without a jump in colour or size; the cards' light (the lead
   made their normal half up, half towards the viewer in V19c – `world/ratscher.js`, marked `feat/fotorealismus`).
5. Later: bark detail and moss at the foot, more kinds for the region (the canopy model knows leaf or needle and height), fruit
   trees in bloom by date.

Your files: `viz3/src/garden/trees.js`, `viz3/src/eztree/**`, the trees' parts of `viz3/src/world/ratscher.js` (marked lines),
`viz3/src/stadtgruen/**` and `viz3/src/weltwald/**` only by marked lines for the same leaf light, new `viz3/test/foto_baeume.py`,
`viz3/extra/foto-baeume/**`, `docs/features/foto-baeume.md`. Not yours: `world/forest.js` (helper `foto-wald`), `viz3/src/bewuchs/**`.
Budgets: the trees' draw calls and triangles as they are (`leistung`); the shadow pass unchanged; `smoke`, `leistung`, `gpu`,
`memphone`, `baeume` (trees give way to vehicles), `garten` green.
Views (x, y, eye height m, yaw °, pitch °, vertical fov °; 1 June, weather `klar`, tier `hoch`; each at 15:30 and at 20:00):
the lime at the Anger `242,-101,1.6,292,2,62` and `240,-112,1.6,250,0,62` · the garden's trees `4,23,1.6,186,6,62` and
`-26,46,15,143,-24,52` · the far rows `-520,-480,1.6,40,2,62` · a wood's edge from the field `62,31,1.6,112,1,60` · the valley from
above `20,60,60,150,-12,55`.
