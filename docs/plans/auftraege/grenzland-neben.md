# Auftrag Hilfs-Agent `grenzland-neben` – Orte und Nebenbeschäftigungen (13.11.2026)

Branch `feat/grenzland-neben`, Worktree `/home/claude/wt-gl-neben`, Port 9015. Gemeinsamer Teil: `grenzland-gemeinsam.md` (zuerst lesen).

---

**Your topic: the mode's own places and what one can do there besides the story** – as GTA has its side activities, fitted to the region.

Your files: `viz3/src/grenzland/gl_neben_logik.js` (GLNLOGIK, pure), `gl_orte.js` (GLORTE), `gl_wagen.js` (GLWAGEN), `gl_kegeln.js`
(GLKEGELN), `gl_angeln.js` (GLANGELN). Keep the interfaces in the headers of the first versions (the missions call them:
`GLORTE.P`, `GLORTE.build()/drop()/inScheune()`, `GLWAGEN.open()`, `GLKEGELN.spielen()`, `GLANGELN.angeln(koeder)`).

Build:
1. **The clique's place: the field barn** (`GLDATA.ORTE.treff`, site [117, −304], beside a field track running at compass −154°; a level
   field – check the ground and the trees there and shift a few metres if needed). An invented place, built by this mode and gone when it
   ends: an open-fronted **Feldscheune** of weathered boards on posts with a tin roof (one can walk in; inside straw bales, a workbench,
   two old mopeds' parts, a sofa – the clique's den; it is a hiding place: add it to `GLFAHNDUNG.extra`), beside it a roofed **open-air
   skittle alley** (a „Freiluftkegelbahn“ as Thuringian villages have them: a long narrow lane of boards under a lean-to roof, ball return
   channel, the pin stand at the far end – research how they look), a **grill** made of an oil drum with a bench and a crate of beer, a
   string of bulbs (no new light: emissive, or a borrowed light at night), a noticeboard. In 1989 (`GL.era === '1989'`, event
   `grenzland:era`) the same barn stands newer and emptier (the mission hides a crate in its straw) – no skittle alley sign, no sofa.
   Geometry: merged meshes of vertex colours in an existing material (read `world/village_props.js` `kit()` and how `wissen/wissen_orte.js`
   builds its boards) – no new shader programs; collision so that walls stop the walker and the moped (read how others register
   colliders: `COL`/`KERN` providers, `VEH.extra` boxes as in `gl_auto.js`); place names (`KERN.area`) „Feldscheune“, „Kegelbahn“.
2. **Kegeln** (the rules are `GLNLOGIK.wurf`; improve them if the game needs more – with tests): at the alley „Kegeln (2 €)“ → a game of
   its own view down the lane: aim (where to let go), direction, spin, strength (a swinging bar or hold-and-release – it must work with
   mouse, keys and touch), the ball rolls (seen, heard: `GLTON.fx('wurf' | 'rollen' | 'kegel' | 'rinne')`), the pins fall as the rules say
   (animate them falling), five throws „in die Vollen“ and the count; „Alle Neune!“; a board with the best score (`GL.stats.kegel`);
   against Timo of the clique for a stake if he stands there (the mission agent places the clique; `GLFIG.near`).
3. **Angeln at the dam** (`GLDATA.ORTE.damm`, the board of the Talsperre Ratscher is at [853, −817]; the water level is at about
   z = 15 – find the shore: where the ground is flat at the water's height; read `world/ratscher.js` `S.water`): an angling spot with a
   little jetty or a stone step you place (invented, small), „Angeln“ needs bait (`GL.inv.mais | wurm | blinker`, bought at the shop on
   wheels): cast (a rod in the hands – first person and shoulder view –, the float on the water), wait (the float bobs; the time
   to a bite from `GLNLOGIK` by month, hour and bait – the real fish of the reservoir: research which species live in the Talsperre
   Ratscher and correct `GLNLOGIK.FISCH`), the bite (strike in time), the fight (keep the line's tension in a band – heavier fish pull
   harder), the catch with its weight; fish go into `GL.inv` and are sold at the shop on wheels (or kept: the side mission needs a carp of
   2 kg or more). A fishing permit is real life (in Thuringia one needs a „Fischereischein“ and a permit for the water) – make it part of
   the game in GTA's way: a permit from the shop on wheels for a few euros, or fishing without one is a deed if somebody sees it
   (`GLFAHNDUNG.tat('angeln', …)` – ask the agent `grenzland-polizei` through your feature doc to add the deed; until then use `rempeln`'s
   weight via `{ k }`).
4. **The shop on wheels** („Verkaufswagen“, as they really tour Thuringian villages – research what they look like and sell) at the
   Anger (`GLDATA.ORTE.wagen`, check the spot is free of walls, lamps and the bus): the van itself (ask `GLMOD.bau('kasten', …)` of the
   agent `grenzland-auto` for the body or build your own counter van), an awning, crates, a price board, the saleswoman
   (`GLDATA.CAST.haendler`), opening hours by the game clock (mornings and late afternoons), „Einkaufen“ → the goods of `GLDATA.WAGEN`
   (copy the list into your file and extend: Rostbratwurst that is eaten at once, bait, bangers under the counter, Milchreis and
   Worcestersauce for the side mission, a fishing permit), prices in euros, selling fish.
5. **The side mission „Karpfen für Suhl“** – the Sushi in Suhl story at the fitting place (Falko 0:34): Yuki (`GLDATA.CAST.yuki`, invented),
   a young cook, prepares a memorial dinner „Sukiyaki wie im Waffenschmied“ and needs what Rolf Anschütz improvised with in the GDR
   (reports on the film name rice pudding for sushi rice, carp instead of salmon, Worcestershire sauce for soy sauce): she writes
   (`GLHANDY.sms`) once the player has met the clique (event `grenzland:mission` `{ id: 'clique', st: 'erledigt' }`; for tests a function
   to start it), stands at the school bus stop in Ratscher (site [249, −101]) at the agreed time; bring a carp of 2 kg or more, a packet
   of Milchreis and a bottle of Worcestersauce → money, her thanks, and the true story as a note in the phone
   (`GLHANDY.note(GLDATA.SUSHI.titel, GLDATA.SUSHI.text, GLDATA.SUSHI.quellen)`) – told accurately and with respect; she says what is
   true and what is her own homage. List it in the journal through your own `KERN.tasks.source({ id: 'grenzland-neben', … })`.

Test: `viz3/test/grenzland_neben.py` (the place stands and disappears with the mode, one can walk into the barn and it hides; a game of
skittles through its API with fixed seeds; a fishing round with a forced bite; buying and selling at the shop; the side mission from
SMS to reward; pictures of the barn, the alley, the game views, the jetty, the van), unit tests for the pure rules. Feature doc
`docs/features/grenzland-neben.md` with your sources.
