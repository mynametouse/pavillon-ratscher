# Grenzland, Kapitel 2 Etappe 2 – Auftrag `zone`: die Grenz-Zone am Grünen Band (17.11.2026, ~22:45)

First read `docs/plans/auftraege/grenzland5-gemeinsam.md` and `docs/plans/plan_kapitel2.md` (section 2 „Schauplätze“, mission 1).
Branch `feat/grenzland-zone`, worktree `/home/claude/wt-grenzland-zone`, port **9061**.

## The place

The Grünes Band south of Eisfeld at the A 73: the **Kolonnenweg** of perforated concrete slabs (two lanes of slabs with holes, grass between
and through them), the 50–200 m wide strip between the path and the former border, the **Görsdorfer Heide** with its lonely tracks, the
junction Eisfeld Süd with the former crossing point Eisfeld/Rottenbach (opened 21.6.1973), today the **Grenzturm-Museum** (only to look at and
learn – never a scene of a crime), and the invented **bunker** off in the heath under an old foundation (outside and its door in this stage;
the inside is stage 4). Sources in the plan; check what the real place looks like (OSM: the Kolonnenweg is mapped as tracks with concrete
slab surface; the border line; photos of the Grünes Band and of the Grenzturm), and build it so it could look like that.

## What to build

1. **Where it is in the game:** find out how far the game's world reaches there today – the world tiles (`welt/`, the test tiles under
   `welt-test/` on the site, `welt/fahrt.js` for the region's roads), the outer terrain of `world/ratscher.js` – and whether the chat
   session_01Mmpsvp11QsXpPSQRRbZ4Jv's `welt-orte` / `welt-wald` will cover it. Load only what the zone needs (a small terrain tile from open
   data like the existing pipeline does, the OSM ways of the zone – kept small in your extra), only when the player is near or a chapter-2
   mission needs it; gone again after leaving. Say in your feature doc what you chose and why.
2. **The Kolonnenweg** as a path one can ride the Simson on (two strips of slabs with holes, the joints, grass, a little moss, puddles in the
   holes after rain), the strip beside it (young birches, heather, the old ploughed control strip grown over), a few **remains** (a concrete
   post of the old fence, a sign „Grünes Band“ of the nature reserve, an information board with a text in our words and its source).
3. **The Görsdorfer Heide**: sandy tracks, heather, pines, a hide for birdwatchers; at dusk quiet, deer (the base game's animals if they can
   be placed – read `tiere/`).
4. **The Grenzturm-Museum** at the old crossing point as one sees it from outside (a watchtower, a fence piece, the museum building), a board
   with opening hours (`OEFFNUNG.add` if it exists) – not enterable in this stage.
5. **The bunker's outside**: an old foundation in the heath, an iron hatch or a door in a concrete wall half sunk in the ground, a padlock;
   `GLZONE.ort('bunker')`.
6. **Getting there:** from Schleusingen over the A 73 to Eisfeld Süd (the region's roads, `welt/fahrt.js`; the autopilot of the Suhl chat
   knows places – read `docs/features/navi.md` and add „Grünes Band“ through its public API only if it has one, else describe it for the
   lead), the radar shows the zone.

## Tests and delivery

- `viz3/test/grenzland_zone.py` with sections `:weg`, `:heide`, `:bunker` (and `viz3/extra/grenzland-zone/tests.txt`): the zone loads and
  unloads, ground heights on the Kolonnenweg, the moped rides it, frame time and draw calls, memory (`viz3/test/grenzland_speicher.py`),
  pictures by day and at dusk. Unit tests for the pure parts.
- Push small increments; report as in the common part.
