# Auftrag `licht` – Grenzland Runde 2: nights like GTA nights (13.11.2026)

Read `grenzland2-gemeinsam.md` first (same folder). Worktree `/home/claude/wt-g2-licht`, branch `feat/grenzland-licht`, port 9014.
Your files: new `gl_licht.js`; `gl_auto.js`, `gl_modelle.js`, `gl_cockpit.js` (and `gl_karosse.js`, `gl_typen.js`, `gl_zweirad.js` if you
need them); `gl_1989_welt.js` (all in `viz3/src/grenzland/`), `viz3/test/grenzland_licht*.py`, `viz3/extra/grenzland-licht/**`,
`docs/features/grenzland-licht.md`.

## Why

Half of chapter 1 plays at dusk and at night. In the review the nights were so dark that people were black silhouettes, light came from
nowhere: the flare in mission 4 is a dot in the sky, the police's blue light floods the whole street evenly, cars drive without visible
headlights. GTA's nights are readable and full of light sources: headlight cones on the road, tail lights, blinking blue that bounces off
walls, torches, a burning red flare that turns a forest red. Look at the pictures named in the common part first.

## What to build (in this order; push each step when it works)

1. **Vehicle lights.** All Grenzland vehicles (the drivable moped and Trabant, police cars, the night's traffic types in `gl_modelle.js`)
   switch on at dusk: emissive lamp glass (warm yellow for 1989 cars and the Simson, whiter for today), soft additive light cones in front,
   a light pool on the road ahead (a ground decal – additive textured quad), red tail lights, brighter when braking. The player's own vehicle
   may **borrow one real light** for the road ahead (`KERN.lights.borrow`, see `viz3/src/core/kern.js` – no new lights of your own).
2. **Police beacons.** Two alternating blue lamps on the roof (GTA rhythm), a small pulsing blue glow sprite at the car and a blue pulse on
   the ground and the nearest wall – **not** a whole street lit blue: find where the blue flood comes from (a borrowed light with a large
   distance in `gl_fahndung.js` / `gl_auto.js` / `gl_heli.js`; if it is in a file of `welt`, describe the fix in your report and do the
   visual side in yours). The helicopter's searchlight if it has one: a cone sprite and a moving ground spot.
3. **Torches.** Any `GLFIG` figure with `F.lampe` (set by `kino` and `welt`) carries a torch: a small cone sprite and a moving ground spot,
   lamp glass at the hand; the 1989 border guards in `gl_1989_welt.js` likewise.
4. **The flare (mission 4).** On `KERN.on('grenzland:flare', { x, y, z })` (emitted by `kino`; you can test it by emitting it yourself): the
   flare rises with a smoke trail, then burns bright red for ~40 s while it sinks slowly on its parachute, sparks falling; it lights the
   forest red – one borrowed point light that follows it, a large red additive glow, a red tint of fog and ambient while it burns – then
   fades. That is the image of the chapter: make it beautiful.
5. **Readable nights.** While the mode runs at night, lift the darkness so people read as people at 15 m (moonlight blue from above, a
   little more hemisphere light; restore exactly on stop), street lamps in Schleusingen glow (if the town has lamps, make their light visible
   on the ground with decals), 1989: sparse orange street lamps, yellowish Trabant light.
6. **Rain in the Klinge night.** Find the mission step(s) at the Klinge (`gl_mission_data.js`: mission 4 „Nachts an der Klinge“): rain
   streaks around the camera (instanced, cheap), a wet look on the road (darker, a bit shinier – material clones only while the mode runs),
   drops on the cockpit window if you can. The sound of rain: ask the lead (`gl_ton.js`).
7. **A filmic grade for today** (GTA 6's warm evenings): a vignette and a gentle warm/contrast grade – the cheapest way that works on the
   iPhone profile (measure: a CSS filter on the whole canvas may cost too much on phones; a vignette div plus the renderer's exposure in the
   mode may be enough). 1989 keeps its own look (`gl_1989.js` – not yours; do not fight it).
8. **The bare 1989 linden** (`gl_1989_welt.js`): in the review it looked like a bunch of spikes – make it read as a bare November tree
   (finer twigs, a twig-card texture or more, shorter branches).

Rules: no new point or spot lights except borrowed ones; at most two new shader programs (count them in your test); by day nothing of this
costs anything (sprites hidden, lights returned); everything removed on „Beenden“; phone memory (`viz3/test/grenzland_speicher.py`) stays
far below +150 MB.

## Tests and pictures

`viz3/test/grenzland_licht.py` (one area per page): free play at 22:00 at the garden and on the road to Schleusingen – the moped's headlight
pool brightens the road ahead (mean brightness of a patch in front vs. behind), a police car's beacon alternates; mission 4 with
`grenzland:flare` emitted – the picture turns red (mean red clearly above green in the upper half); rain in the Klinge step; program count;
no page errors. Pictures in `out/grenzland_licht/` before/after side by side – **look at them**. Lines for CI in
`viz3/extra/grenzland-licht/tests.txt`.

## For the lead (in `docs/features/grenzland-licht.md`)

What you changed in which file, the cost on the phone profile, sound wishes (rain, flare hiss), what is open.
