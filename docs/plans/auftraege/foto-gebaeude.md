# Auftrag: Gebäude – Fassaden mit Tiefe, Sockel, Dächer, Alterung, natürliche Abweichungen (Hilfs-Agent `foto-gebaeude`)

Gestartet 18.11.2026 ~19:35 vom Fotorealismus-Chat (session_01L6Yrpe4euXqyTbnuvdamYz). Branch `feat/foto-gebaeude` (von `feat/fotorealismus` `6ecd5194` = `src` mit
V19e und dem Zwischenstand Wald), Worktree `/home/claude/wt-foto-gebaeude`, Port 9073, Berichte und Bilder
`/home/claude/scratch/foto/gebaeude/`. **Zuerst lesen:** `docs/plans/auftraege/foto-gemeinsam.md` (Falkos Auftrag, die Regeln für alle).
Bilder des Bestands von heute Abend: `/home/claude/scratch/foto/*.jpg` (Wald, Dorf, Schleusingen, Wiese).

## Brief (English)

Goal: the houses of the world shall look built and lived in, not like painted boxes – from the street, at eye height.

What the lead found tonight (pictures `schleusingen`, `dorf_strasse`, `dorf_strasse2`, `dorf_fassade`, `halle_welt`):
- The market of Schleusingen and the houses of the world (`gebaeude/`, `fassade/`): **flat walls of one colour, windows without depth,
  no plinth, no eaves detail, no wear** – cardboard. The village of Ratscher (`world/village*.js`, `world/dorfkern*.js`) is better
  (half-timbering, slate, shutters, textures) but clean as a model: no dirt at the foot of a wall, no weathering, every wall evenly
  lit and evenly coloured.
- Falko's brief asks for: „Fassadengeometrien, Fenster und Türen, Dächer und Dachkanten, Schornsteine, Dachrinnen, Anbauten, Balkone,
  Materialien und Alterung, Sockel und Fundamente, individuelle architektonische Merkmale“ and: „Fassaden mit Putzstruktur,
  Gebrauchsspuren und natürlichen Farbabweichungen“, „Dächer mit einzelnen Ziegeln beziehungsweise realistischen Dachmaterialien“.

Find out first how the buildings are made (who builds walls, roofs, windows for the village, for the cells of the world
`gebaeude/gebaeude.js`, for the facades „nach Ansicht“ `fassade/fassade.js`, and what their materials share), what one draw call
holds, and where one change reaches the most houses. `core/assets.js` has `grime(m, k, h, v, st)` (soil and splash at the foot,
weathering patches, rain streaks – for materials that go through `patchSV`): see where it is used and where not.

Your steps (the first one is 1, with 2 if it is near):
1. **Walls that are not flat colour:** plaster grain and soft unevenness (normal and roughness detail from a procedural function or
   an existing texture), natural colour deviation per house (hash of its id: a little lighter, darker, warmer, greyer – within what
   the real colour allows) and within a wall (large soft patches, a touch of sun-bleaching high up, damp darker at the foot), a plinth
   (Sockel) band, dirt and splash at the foot, streaks under sills and eaves – strongest on old barns, least on new houses if the
   data tells them apart. One mechanism for village, world and town houses where their materials allow it.
2. **Windows and doors with depth:** a reveal (the pane sits back a hand's width: geometry where windows are quads of their own,
   else a shaded edge in the shader), frames and sills that catch light, panes that mirror a little sky (dark by day, not black, not
   glowing) – and not every window alike (curtains, a blind half down, by hash).
3. **Roofs:** the tile or slate pattern readable up close (relief in the normal, not only a colour), ridge and verge, an eaves line
   with a gutter, darkening and moss by age and side (north), colour variation per roof; chimneys where a dwelling has none (generic,
   plausible for the house's size – say so in the doc).
4. Later: annexes, balconies, individual features from real data (LoD2, photos „nach Ansicht“), interiors' windows at night.

Your files: `viz3/src/gebaeude/**`, `viz3/src/fassade/**`, `viz3/src/world/village*.js`, `viz3/src/world/dorfkern*.js` (marked lines –
these belong to earlier chats: add, do not restructure; the hooks `// feat/welt-orte` in `gebaeude/gebaeude.js` stay as they are),
`core/assets.js` only `grime` and only compatibly, new `viz3/test/foto_gebaeude.py`, `viz3/extra/foto-gebaeude/**`,
`docs/features/foto-gebaeude.md`. Not yours: Suhl (`viz3/src/lazy/suhl/**`), Grenzland, the interiors (`haeuser/`, `laeden/`).
Budgets: no draw call more per cell of buildings or per house of the village; triangles of a street view at most +15 %; no new
texture per program beyond 16 (count with `lib.check_gl`); the buildings' tests stay green (`welt_gebaeude`, `welt_orte`,
`schleusingen`, `dorfkern` – run the ones of the files you touched, plus `smoke`, `leistung`, `memphone`).
Views (x, y, eye height m, yaw °, pitch °, vertical fov °; 15:30 on 1 June, weather `klar`, tier `hoch`; Schleusingen needs ~40 s of
`GAME.step` after the jump until the town is built):
market of Schleusingen `-1100,1215,1.6,-118,4,62` · the Anger `242,-101,1.6,292,2,62` · `250,-118,1.6,200,6,55` ·
`300,-160,1.6,20,2,62` · a wall at two metres (pick one) · a street of a place of the world (pick one from `gebaeude`'s cells, e.g.
towards Geisenhöhn) · one view at 20:00.
