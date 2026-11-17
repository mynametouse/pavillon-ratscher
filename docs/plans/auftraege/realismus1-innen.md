# Realismus Stufe 1 – Auftrag `innen-real`: die Häuser von innen echt statt schemenhaft (17.11.2026, ~14:15)

First read `docs/plans/auftraege/realismus1-gemeinsam.md` (Falko's words, the yardstick, ownership, interfaces, how to work). Branch
`feat/innen-real`, worktree `/home/claude/wt-innen-real`, port **9046**. Your files: `viz3/src/haeuser/haeuser.js`, `haeuser_gast.js`,
`viz3/src/schleusingen/si_innen.js`, `si_plan.js`, `viz3/src/zombie/z_innen*.js` (the interior kit shared with the zombie night – it must
keep working: run its tests), your tests, `viz3/extra/innen-real/`, `docs/features/innen-real.md`. Read first: `docs/features/haeuser.md`,
`schleusingen-innen.md` and the zombie night's interior docs (`docs/features/zombie*.md`).

Falko (13:27): „Es muss realistischer aussehen, nicht bloß so schemenhaft. Auch in den Geschäften, in den Häusern. … Mir ist Realismus
wichtiger, als schnell irgendwas schemenhaft aufzubauen. Du sollst auch logisch durchdenken, ob eine Darstellung, eine visuelle so in
Wirklichkeit aussehen kann.“ (The shops' insides are `laeden-leben`'s.)

## 1 Look first, then fix the worst

- Walk into a dozen houses in Ratscher and Schleusingen (small and large, old and new, flats in the bigger houses) and look at your pictures
  as a stranger would: what gives the game away? Typical suspects: rooms that are too big or too empty, furniture as plain boxes, the same
  room again and again, flat or wrong materials, light that comes from nowhere, windows inside that do not match the windows outside, doors
  that lead nowhere, a kitchen without a sink, a bathroom without a toilet, stairs that cannot be climbed. Write the list with pictures into
  your feature doc, then fix from the top.

## 2 Rooms that could be real

- **Plans:** room sizes and layouts of real German houses of their age (a Thuringian farmhouse, a 1930s house, a 1970s house, a flat in a
  town house of the old town); hall, kitchen, living room, bedroom, bathroom where they belong; windows where the facade has them; the front
  door into the hall.
- **Furniture and things:** modelled with proportions and detail (a kitchen with base and wall units, sink, stove, fridge; a sofa with
  cushions; a bed with a duvet; shelves with books; a table with chairs; a coat rack; lamps), materials from free textures (ambientCG, Poly
  Haven – CC0) at a modest resolution, shared and instanced; a little clutter (a cup, a newspaper, shoes in the hall, plants) varied by
  household and era („heute“ versus the zombie night's look) – variation by seed so no two houses are the same.
- **Light:** daylight through the windows (a cheap fake: an emissive window pane and a soft light patch on the floor), a ceiling lamp at
  night (emissive shade, a baked-looking pool; **no new lights**), darker corners; the residents of `haeuser_gast.js` in plausible places
  (on the sofa in the evening, at the stove at noon).
- Smooth: a room is built when one enters, kept small in memory, gone after leaving; frame time and draw calls in your test.

## 3 Tests and delivery

- `viz3/test/innen_real.py` with sections `:ratscher`, `:schleusingen` (and `viz3/extra/innen-real/tests.txt`); pictures of the same rooms
  before and after; frame time and draw calls; existing tests stay green (`haeuser.py`, `schleusingen_innen.py`, the zombie night's tests –
  find them with grep for `ZINNEN`).
- Report as in the common part.
