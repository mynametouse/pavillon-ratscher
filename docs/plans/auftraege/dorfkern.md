# Auftrag `dorfkern` – der Dorfkern von Ratscher nach Falkos Rundum-Video vom Anger

Vom Kern-Chat am 30.10.2026 (~0:40) als Hilfs-Agent gestartet (Sitzung session_01GdUYaP2XXAAEDXZpGWVkBm), Branch `feat/dorfkern`,
Worktree `/home/claude/wt-dorfkern`, Port 8994. Hier steht der Auftrag wörtlich (englisch, so wie der Agent ihn bekam).

---

You are a helper agent of the "Kern-Chat" (the main Claude session) working on Falko's browser 3D model/game "Pavillon Ratscher" (three.js r169,
ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringia), the village, driving, small jobs and tasks.
You work alone on ONE topic in your own worktree and branch; the Kern-Chat merges your green states.

## What Falko said (30.10.2026, 0:31, in his words)
„Schau dir bitte dieses Video an. Hier siehst du den Anger 15, das Gebäude, dessen Innenraum ich gefilmt habe, was du aber erst nochmal
ignorierst. Aber du siehst ja auch einen Rundumblick 360 Grad in der Dorfmitte, das du bitte analysierst und nutzt, um ein realistischeres
Abbild des Dorfkerns darzustellen. Schau dir genau an, wo es sich befindet. Du siehst hier auch die alte Schule, die du schon gut dargestellt
hast, und nutze auch die anderen Bilder im Video, um ein möglichst realistisches Bild zu zeichnen von den Häusern und Umgebungen."
(Earlier he said: a different video, of the INTERIOR of the old house Anger 15, is to be ignored. You only get the outdoor video.)

## The material (private – never into the repo, never published, never uploaded anywhere)
- The video: `/mnt/user-data/attachments/6d555239-896b-5282-95eb-3a95cf088316/d719bf00-IMG_1119.mov` – 24.2 s, 1920×1080 HEVC 30 fps,
  iPhone SE (2nd generation, one wide camera, ~28 mm equivalent; video is cropped/stabilised a little), 10.04.2023 15:26 local time
  (Easter Monday – hence the Easter decoration on the fountain). QuickTime GPS `+50.4983 +010.7729` with ±36 m horizontal accuracy →
  model ≈ (256, −105) (UTM 32N → model with XF {a 1.0127906473420232, b 0.07715765993901931, ex 625469.0070213208, ey 5595624.323524626}:
  x = (a·dE + b·dN)/(a²+b²), y = (−b·dE + a·dN)/(a²+b²); x east, y north, metres). It is one standing 360° pan next to a blue car
  (its roof with a roof rack is in the first and last frames).
- Frames at 2 fps (960 px): `/tmp/claude-0/-home-claude/6d555239-896b-5282-95eb-3a95cf088316/scratchpad/anger_vid/f_001.jpg … f_048.jpg`
  (t = (n−1)/2 s), contact sheets `sheet_0..2.jpg`. Extract full-resolution frames yourself where you need detail
  (`ffmpeg -ss T -i <video> -frames:v 1 x.png`). What the pan shows, roughly: 0–3 s houses behind big (partly pollarded) lime trees and the
  stone fountain with benches (a cream house with half-timbering, grey slate houses, a dark slate house with an orange ground floor and a
  brown-red roof, a light green house); 3.5–7.5 s the street curving away with a row of dark slate houses, a large cream house with dormers,
  green window frames and a blue door; 8–10 s picket fence, a white box/wall, a farmstead with a half-timbered gable, trees on the slope behind;
  10–12 s the timber bus shelter (brown frame with X-braces, white panels, bench), a low red-brick building; 12–18 s the old school
  (red-on-white half-timbering below, dark slate gable, red tiles, ridge turret with clocks and weather vane), a concrete power pole with
  overhead lines, lantern street lamps, a yellow post box and a red-white vending machine, picket fence; 18.5–19.5 s a view down a street with
  ochre houses and a carport; 20–23.5 s a big lime on the green, a long trimmed hedge, picnic tables on the lawn, a grey slate house with a small
  porch roof, an ochre house, a light green house.
- Falko's photo of Anger 15 (also private): `…/scratchpad/anger_vid/anger15_photo.jpg` (1512×2016, no EXIF position; same Easter time):
  Anger 15 – two storeys clad in dark slate with a light diamond ornament band between the floors, the gable above the upper floor in vertical
  brown boarding, red tile roof, two chimneys, white window frames, house-number plate 15; right of it a lane to a farmyard with a
  half-timbered barn; right in front No. 17 (apricot/orange plaster ground floor, dark slate above, plate 17); left a house in light grey slate;
  in front the polygonal sandstone fountain wall with copings, an Easter egg garland arch, a brown and a green bench, a green litter bin,
  concrete paving (rectangular pavers), a lawn edged with granite kerbs.

## What exists in the model (read the code before changing anything)
- `world/ratscher.js` (RATSCHER): 337 village buildings from OSM footprints, heights and roof shapes fitted to the surface model.
- `world/village.js` (VILLAGE): the look of every building in one facade shader + rebuilt roofs. `styleOf(b)` picks style
  (PLASTER, MODERN, SLATE, SLATE_UP, SLATE_GABLE, FW, FW_UP, BARN, BARN_FULL, BRICK, HALL, SHED, SCHOOL), colour, timber, frame, door,
  shutters, ornament band, raised plinth, window spacing **by a hash of the building id** – only the old school (id 215) is fixed. Roof colour
  from the orthophoto. `S.ANGER = [222, -108]`.
- `world/village_props.js` (VPROPS): school turret and clocks, the Dorflinde (1888) with a ring of benches, the sunken sandstone fountain
  (OSM amenity=fountain at (191.3, −114.4)), the school bus stop with shelter, post box, signpost, street lamps, light at night.
- `world/village_near.js` (VNEAR): fences, hedges, flower boxes, bins, woodpiles, door lamps near the walker.
- `dorf/*` (village life: evenings in the school, people, cars, calendar `dorf/dorf_cal.js`).
- Sources used so far (V16e): Wikimedia Commons photos with camera positions (`tools/fotos/katalog.json`, `tools/fotos/README.md`), OSM,
  the orthophoto (`viz3/dist/geo/…`).

## Your task: the village core as in the video – located exactly, house by house
1. **Locate the camera and every building.** Stitch the pan into a panorama (OpenCV 5.0 is installed: `cv2.Stitcher`, or estimate the yaw
   per frame from feature matches) and measure the bearing of landmarks (the school turret, the Dorflinde, the fountain, gable edges, the
   street axes). Render the model from candidate positions (`GAME.view(x, y, z, yawDeg, pitchDeg, vfovDeg)` – see the compare script
   `…/scratchpad/garten_cmp.py`, adapt it; eye height ~1.5 m) and fit position and heading so the model's landmarks line up with the video.
   Then name every building you see with its id (`VILLAGE.byId`, `RATSCHER` footprints) and, where OSM has it, its address
   (`addr:street`/`addr:housenumber` – check whether the data in `viz3/dist/geo/` or `tools/welt` carries addresses). Find out which
   fountain the video and the photo show (the model's one at (191, −114) or another), and where Anger 15 and 17 are.
2. **Each visible building as it really is** – instead of the hash: a small data table (id → style and parameters) applied in
   `styleOf()`: cladding per floor (plaster colour of the ground floor, slate above), slate tone (dark blue-black vs. light silver-grey), the
   ornament band, a gable in vertical boarding, half-timbering colour, window-frame colour (white, green), door colour (the blue door),
   number of storeys/plinth, dormers, roof tone (red-orange clay vs. brown-red), chimneys, the small porch roof. Extend the facade shader
   only where it lacks something you need (one program, no new ones per building); keep the hash for all buildings nobody has seen.
   Use also the Commons photos and the orthophoto for the buildings around the Anger that the video sees only from far.
3. **The open space of the centre** as in the video and the photo, where it is: the fountain (polygonal sandstone wall with copings) with
   benches (brown and green) and the green bin, the paving (concrete pavers, kerbs), lawns, the long trimmed hedge, picnic tables on the
   green, the big limes (the pollarded ones near the fountain), the bus shelter as it looks (timber frame with X-braces, white panels), the
   lantern street lamps, the concrete power poles with the overhead line along the street, the yellow post box, the vending machine, the
   picket fences (brown pickets, red-brown posts), the white box/wall, the red-brick building. In the Easter weeks (`dorf/dorf_cal.js` or
   the game date) the fountain may wear its egg garland (small, optional).
4. **Compare and iterate:** side-by-side views video frame | model from the fitted camera, at least 8 headings around (every 45°) and the
   photo's view of Anger 15; keep them in `…/scratchpad/anger_vid/cmp/` (they contain Falko's frames – NOT in the repo, not in `out/`,
   not as CI artifacts). Before/after for the report.
5. **Tests:** a browser test `viz3/test/dorfkern.py` (the table applied: the named buildings have their style; no console errors; the centre
   renders; frame time at the Anger not worse than before by more than a few percent on the light tier) listed in
   `viz3/extra/dorfkern/tests.txt` so `feat.yml` runs it; keep the existing village/dorf tests green (`viz3/test/dorf*.py`, the V16e ones
   – find them with `grep -l VILLAGE viz3/test/*.py`).
6. **Docs:** `docs/features/dorfkern.md` – the fitted camera, the building table (id, address if known, what it looks like, source frame
   time), sources, open points (what the video does not show).

## Where and how you work
- Worktree `/home/claude/wt-dorfkern`, branch `feat/dorfkern` (on the Kern-Chat's `wip/kern` 162a0bc, pushed). Push only to
  `origin feat/dorfkern`. Never to src, live, main or other branches. Do not delete branches or worktrees.
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, `docs/UEBERGABE.md`, `docs/PARALLEL.md`.
- Build: `cd viz3 && python3 build.py`; the worktree has a copy of the Kern-Chat's `viz3/dist` (runtime assets); if a build lacks assets:
  `cp -rn /home/claude/kern-wt/viz3/dist/. /home/claude/wt-dorfkern/viz3/dist/`.
- Browser runs only through the lock, with YOUR port 8994: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8994 --serve <test>`;
  a server you start yourself (`python3 tools/csp/cspserve.py 8994 viz3/dist &`) belongs in the same command as the browser run and is
  stopped at its end. Never two browsers at once (two other sessions use the same machine). Python Playwright and Chromium are installed –
  never `playwright install`. Never `pkill -f <pattern>` with a pattern that is also in your own command line.
- Code: ES modules, imports only from modules above in `viz3/src/modules.txt` (a new module goes under a marker `# feat/dorfkern`);
  comments English, UI German (du), Prettier; `bash tools/check.sh` must pass before every push. Commit messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GdUYaP2XXAAEDXZpGWVkBm`.
- Your files: `world/village.js`, `world/village_props.js`, `world/village_near.js`, new `world/dorfkern*.js` if you want one, data in
  `world/ratscher.js` only if needed (small, commented), your test, `viz3/extra/dorfkern/`, your doc. Not yours (others work on them right
  now): `garden/*`, `werk/*`, `npc/*`, `world/roads.js`, `garden/stream_geo.js`, `game/quests.js`; `dorf/*` only small commented hooks.
- Performance: the village has 337 buildings and is already heavy on phones – data, not geometry, wherever possible; reuse materials; nothing
  heavy at start; check the frame time at the Anger on the light tier.

## Report when done (or by ~06:00)
The green sha on `feat/dorfkern` (with the CI run), the fitted camera, the table of buildings, what you changed outside your files, what you
could not do, and three to five before/after comparison paths (in the scratchpad).
