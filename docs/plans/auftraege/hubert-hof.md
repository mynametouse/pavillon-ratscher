# Auftrag `hubert-hof` – Huberts Hof wie heute (Bauphase 0)

Vom Kern-Chat am 30.10.2026 (~4:00) als Hilfs-Agent gestartet (Sitzung session_01GdUYaP2XXAAEDXZpGWVkBm), Branch `feat/hubert-hof`,
Worktree `/home/claude/wt-hubert`. Hier steht der Auftrag wörtlich (englisch, so wie der Agent ihn bekam).

---

You are a helper agent of the "Kern-Chat" (the main Claude session) working on Falko's browser 3D model/game "Pavillon Ratscher" (three.js r169,
ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringia), the village, driving, small jobs and tasks.
You work alone on ONE topic in your own worktree and branch; the Kern-Chat merges your green states.

## Background
Falko photographed his garden and the neighbours' yards (125 photos, 26.10.2026) and decided: **construction phase 0 (the start scene) shows
everything as it is today.** West of his garden lies the yard of his neighbour **Hubert** (an NPC in the game: he walks, works in his sheds,
chops and stacks firewood, drives his green tractor along the field path, gives small tasks). Falko's description from 23.10.: „Die Gebäude
auf seiner Seite sind nach Osten offene, überdachte Werkstätten, in denen er Werkzeug hat. Er hackt viel Holz, sägt Holz klein und stapelt es
in kleinen, hohen Trockenhütchen, die er selbst gebaut hat: etwa 1 × 1 m, 2 m hoch, mit kleinen Ziegeldächern." On 30.10. (0:12) he wrote:
„Huberts Gelände bzw. die Überdächer sind völlig übertrieben, schau hier nochmal auf die Fotos und Satellitenbilder … Hubert hat nur den
grünen Traktor … also auch die Objekte und Stories bzw. Quests müssen umgebaut werden, um ans neue Gelände zu passen." The Kern-Chat then
only shrank the yard (V17a: two of the four buildings of `SITE.neigh` left out, the other two smaller and flatter; the red tractor removed,
Hubert's tractor recoloured green with red rims). **Now make the yard look like the photos.**

## What the photos and the aerial show (the Kern-Chat's reading – check it yourself)
- **From the field path (7186, 7189, 7190, 7191, 7192):** at the garden's north-west corner the gravel field path widens into Hubert's gravel
  yard. At its back (west) a **long, low, open timber shed** (dark weathered boards, mono-pitch or flat corrugated roof, open towards the
  yard) with vehicles and stuff inside; in front of it a white board leaning, a wooden table with a bench, stacks of boards, an upright thick
  log section; a big tree on the south side of the yard entrance, a bushy willow on the north side; a strapped stack of sawn boards with a red
  frame on the yard's south edge.
- **The black gate (7193):** on the yard's south side a **black wooden farm gate** (two wings of horizontal boards with a diagonal brace) opens
  onto a **grass lane running south** along the west boundary of Falko's garden.
- **The lane (7194, 7195, 7196, also 7204 and 7208 from inside the garden):** on its west side a **row of small drying huts** made of pallets
  and boards with small roofs of old red tiles (Biberschwanz), stacks of roof tiles on pallets in front and between them; on its east side the
  hedge of Falko's garden; far south white caravans / box bodies and fruit trees.
- **The aerial photo** (older than the photos – it shows neither the caravan nor the yellow hut in Falko's garden) shows west of the lane a
  continuous row of long buildings along the plot's west edge (x ≈ −45 … −25, y ≈ 50 … −10 in model metres) with dark, red-brown and light
  roofs, and between them and the lane a yard full of small objects. Overlay of the aerial on model axes with the photo positions and the
  current `SITE.neigh` rectangles: `/tmp/claude-0/-home-claude/6d555239-896b-5282-95eb-3a95cf088316/scratchpad/trees/ortho_hubert.jpg`
  (script `ortho_hubert.py` next to it; change the extent/scale to zoom).

## Your task: Hubert's yard of today, and his day and tasks fitting it
1. **Layout from aerial + photos:** the yard by the path, the long open shed(s) at the back, the black gate and the grass lane with the row of
   drying huts and tile stacks along Falko's west boundary, the buildings along the west edge as the aerial shows them (simple, low, roofs in
   the right colours; open sides towards the yard where the photos show it). Fewer, plainer things placed right beat many invented ones.
   Make positions data (a small table in the module), not scattered literals.
2. **Hubert's life and tasks must still work** (npc/life.js uses `HOF` and `SHEDS` from garden/hof_hubert.js: benches in front of the sheds,
   `inShed`, the wood yard, chopping; game/quests.js uses `SHEDS[3] || SHEDS[0]`, the drying huts, the firewood tasks). Keep the exported
   shapes (`HOF`, `SHEDS` entries with what life.js/quests.js read) or update those uses accordingly – with tests green. His tractor
   (vehicles/tractor.js: home, round along the field path) and the car on the ramp (garden/hof_auto.js) must stay reachable and not stand in
   a building.
3. **Phase 0 only changes what is today** – Hubert's yard has no planned future in the model, so one state for all phases is fine.
4. **Photos (private – never into the repo, never published):** `/tmp/claude-0/-home-claude/6d555239-896b-5282-95eb-3a95cf088316/scratchpad/garten/IMG_7186.jpg` …
   `IMG_7196.jpg`, `IMG_7204.jpg`, `IMG_7208.jpg` (1024 px). Rough camera positions (model x, y; yaw in degrees clockwise from model north;
   placed by hand, ±3–6 m, ±10–40°): `…/scratchpad/lage/lage/IMG_<n>.json`. Most photos are 0.5× ultra-wide (iPhone, about 100° horizontal).
   Compare photo and model side by side: render the model from the photo's position (see `…/scratchpad/views.py` – a Playwright script that
   boots the page, sets `window.FOVX`, `GAME.view(x, y, z, yaw, pitch, fov)` and saves pictures; adapt the port) and put both next to each
   other with PIL. Comparison pictures stay in the scratchpad (private).
5. **Tests:** keep `nachbarn` (Hubert and Ronald: day, talk, tasks) green; add `viz3/test/hubert_hof.py` (phase 0: the gate, the lane, the
   huts, the open shed there; Hubert can walk from his shed to the huts; no collider blocks the lane; the tractor's home is free) and list it
   with `nachbarn` in `viz3/extra/hubert-hof/tests.txt` (CI runs each line: `.github/workflows/feat.yml` on your branch).
6. **Docs:** `docs/features/hubert-hof.md` (what is where, sources, what the photos did not settle).

## Where and how you work
- Worktree `/home/claude/wt-hubert`, branch `feat/hubert-hof` (create it from `origin/src`: `git -C /home/claude/kern-wt fetch -q origin src &&
  git -C /home/claude/kern-wt worktree add -b feat/hubert-hof /home/claude/wt-hubert origin/src`, then `git push -u origin feat/hubert-hof`).
  Push only to `origin feat/hubert-hof`. Never to src, live, main or other branches. Do not delete branches or worktrees.
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, KERN services, phases), `docs/UEBERGABE.md`,
  `docs/features/nachbarn.md` if it exists, and `docs/plans/garten_dorf_abgleich.md` (sources and open questions).
- Build: `cd viz3 && python3 build.py` (node_modules are linked). A fresh build lacks some runtime assets (figures …): after building copy them
  from the Kern-Chat's build: `cp -rn /home/claude/kern-wt/viz3/dist/. /home/claude/wt-hubert/viz3/dist/`.
- Browser runs only through the lock, with YOUR port 8995: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8995 --serve <test>`.
  If you start a server yourself (`python3 tools/csp/cspserve.py 8995 viz3/dist &`) do it inside the same command as the browser run. Never run
  two browsers at once. **Memory is tight (all sessions share ~5.8 GB; a SwiftShader page takes 3–4 GB):** no big image processing while your
  browser runs, keep comparison images small (≤ 1100 px), close browsers at the end of every script.
- Never use `pkill -f <pattern>` with a pattern that also appears in your own command line (it kills your own shell); kill by PID.
- Code: ES modules, imports only from modules above in `viz3/src/modules.txt`; comments English, UI German (du), Prettier; `bash tools/check.sh`
  must pass before every push (`set -o pipefail` if you pipe it). Commit messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GdUYaP2XXAAEDXZpGWVkBm`.
- Your files: `viz3/src/garden/hof_hubert.js`, `viz3/src/garden/hof_auto.js`, a new `garden/hof_hubert_*.js` if useful, the Hubert parts of
  `npc/life.js` and `game/quests.js`, `viz3/site.js`/`site.json` key `neigh` only, your test and doc. The Kern-Chat works at the same time on
  the garden itself (trees, terrace at the brook, stream, garage, garden houses: garden/trees.js, garten_heute.js, stream*.js, garage.js,
  bungalow.js, carport.js, washhouse.js) and another helper on the village centre (world/village*.js, world/dorfkern*.js) – do not touch those.
- Performance: no new shader programs if avoidable (reuse plain()/existing materials: MAT.*, the yard's own), merge static geometry as the
  module does now, nothing heavy at start.

## Report when done (or by ~08:00)
The green sha on `feat/hubert-hof` (with the CI run), what you changed outside your files, what you could not settle from photos and aerial,
and three to five screenshots' paths (in your worktree's `out/`) of phase 0: the yard from the field path, the black gate and the lane with
the drying huts, a top view.
