# Auftrag `garten-fotos` – Garten in Bauphase 0 Foto für Foto abgleichen (Runde 3)

Vom Kern-Chat am 30.10.2026 (~5:30) als Hilfs-Agent gestartet (Sitzung session_01GdUYaP2XXAAEDXZpGWVkBm), Branch `feat/garten-fotos`,
Worktree `/home/claude/wt-gfotos`. Hier steht der Auftrag wörtlich (englisch, so wie der Agent ihn bekam).

---

You are a helper agent of the "Kern-Chat" (the main Claude session) working on Falko's browser 3D model/game "Pavillon Ratscher" (three.js r169,
ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringia), the village, driving, small jobs and tasks.
You work alone on ONE topic in your own worktree and branch; the Kern-Chat merges your green states.

## Background
Falko photographed his garden on 26.10.2026 (125 photos) and decided: **construction phase 0 (the start scene) shows everything as it is
today.** Two rounds were done (V16x–V17d: trees, washhouse front, logs and board stack by the path, carport, terrace at the brook, the old tin
garage's colours, the bungalow moved to where the 2024 aerial and the photos show it). On 30.10. 0:12 he wrote: „vieles auf den Fotos ist
nicht integriert – bitte genauer hinschauen und realistisch und sinnvoll integrieren", and at 0:19: „Achte auf weitere fehlende oder bisher
falsch dargestellte Details in Garten und Dorf – finde Strategien, die aufzuklären anhand diverser Datenquellen." **Your job: compare the
model with the photos systematically, viewpoint by viewpoint, and fix what is wrong or missing in phase 0 of the garden.** Read
`docs/plans/garten_dorf_abgleich.md` first (sources, what was done, the open list) and `docs/features/garten.md`.

## Material (private – never into the repo, never published, never uploaded anywhere)
- Photos (1024 px): `/tmp/claude-0/-home-claude/6d555239-896b-5282-95eb-3a95cf088316/scratchpad/garten/IMG_<n>.jpg`; their metadata
  (camera position x, y in model metres, yaw in degrees clockwise from model north, `fl35` = 35 mm-equivalent focal length – 14 is the 0.5×
  ultra-wide, ~26 the main camera; `st`: 'ok' = Falko confirmed the position, 'neu' = rough, ±3–6 m and ±10–40°):
  `…/scratchpad/garten/meta.json` (contains GPS – never copy it into the repo). Vertical field of view of a landscape picture:
  `2·atan(21.63/fl35 · 3/5)`, portrait `2·atan(21.63/fl35 · 4/5)`.
- The 2024 aerial (DOP 20 cm, flown 07.04.2024 – older than the photos: some things moved or were built since):
  `python3 tools/geo/dop_th.py OUT.jpg x0 x1 y0 y1 0.05` gives a picture on model axes (north up, pixel (u, v) = model (x0 + u·s, y1 − v·s));
  `…/scratchpad/dop2/overlay.py` draws the model's garden, buildings, trees and photo positions on it.
- Earlier comparison pictures and the render script the Kern-Chat used: `…/scratchpad/views.py` (photo | model side by side).

## How to see the model without the chat machine's browser (it is shared and slow)
`viz3/test/blickpunkte.py` renders the model from a list of viewpoints (`viz3/extra/blickpunkte/views.json` or a file given as argument –
x, y, yaw, vfov, eye, pitch, w, h, phase; see the script's header). Put your list in `viz3/extra/garten-fotos/views.json` (names like `b7209`
are fine – only model coordinates and angles, no GPS, no photos) and a line `blickpunkte:viz3/extra/garten-fotos/views.json` in
`viz3/extra/garten-fotos/tests.txt` (together with `garten` and whatever else you need). Every push to `feat/garten-fotos` runs them on GitHub
Actions (`.github/workflows/feat.yml`, ~20 min); download the pictures with `gh run download <run> -R mynametouse/pavillon-ratscher -n out -D <dir>`
and put them beside the photos with PIL on the chat machine (keep composites ≤ 1100 px wide, in the scratchpad). Use the local browser only for
short checks: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8996 --serve <test>` (your port 8996; never two browsers at once).

## Your task
1. **Compare:** all photos with `st: 'ok'` first, then the useful 'neu' ones (check their direction against a known object in the same
   picture – the workshop lean-to, the yellow hut, the caravan, the washhouse front – a photo whose direction does not fit any known object does
   not count). Make a table in `docs/plans/garten_fotos_abgleich.md`: photo, what differs (position, size, shape, colour, missing object,
   object that is not there), what you did or why not.
2. **Fix in phase 0 (only what is today; from phase 1 on the plan stays):** positions and orientations of the garden buildings (`site.js`/
   `site.json` key `bld` – keep `neigh`, which another agent changes, and run the site through `json.dumps` as the other keys), the shape and
   colours of the small buildings and things, the trees (`site.js` key `trees`), missing objects that the photos show clearly (benches, tables,
   stacks, ladders, tarpaulins, the green potting table at the brook by the gate, the white bench by the greenhouse …). Known open items:
   - **the yellow hut's position:** 7256, 7258, 7267 see it rather at (5…7, −10) than at (11.6, −3.4); the 2024 aerial shows a light roof at
     about (7, −4.7); 7243 (confirmed) sees it close to the right of the greenhouse – settle it with renders.
   - **the fence along the field path:** chain-link on concrete posts with a gate of rusty frames (7176, 7197, 7198) – today the model has a
     hedge with a gap; the short piece of chain-link over the brook (7199, 7206).
   - **the culvert under the gate slab** (7199, 7200) instead of the asphalt bridge look (keep the bridge's driving geometry: the trailer test
     `v16d:trailer,bridge,load` drives over it and must stay green; keep `STREAM.BR`).
   - **no gravel paths in phase 0** if the photos show none (the paths are painted into the ground texture in `garden/env.js` – a phase switch
     would need a second paint; only if it stays cheap, else leave it and say so).
   - Not your topic: the brook's depth (Falko is asked), Hubert's yard west of the garden (agent `hubert-hof`), the village.
3. **Things the player uses must keep working:** the seats (`GSEATS`), doors, the bungalow, washhouse, greenhouse and hut interiors and their
   tasks, the workshop of today, the tractor/trailer route from the bridge to the log yard (`viz3/test/v16d.py`, section `bridge`), the car's
   place on the field path, the garden places (`garden/places.js`). If you move a building, move what belongs to it (paths to its door,
   the player's spot in `game/player.js` spots, colliders).
4. **Tests:** keep `garten`, `einrichtung:nogeo=1`, `v16d:trailer,bridge,load` green (list them with `blickpunkte:…` in your `tests.txt`).

## Where and how you work
- Worktree `/home/claude/wt-gfotos`, branch `feat/garten-fotos` (create it from `origin/src`: `git -C /home/claude/kern-wt fetch -q origin src &&
  git -C /home/claude/kern-wt worktree add -b feat/garten-fotos /home/claude/wt-gfotos origin/src`, then `git push -u origin feat/garten-fotos`).
  Push only to `origin feat/garten-fotos`. Never to src, live, main or other branches. Do not delete branches or worktrees.
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, phases), `docs/UEBERGABE.md`, `docs/features/garten.md`,
  `docs/plans/garten_dorf_abgleich.md`.
- Build: `cd viz3 && python3 build.py`; a fresh build lacks some runtime assets: `cp -rn /home/claude/kern-wt/viz3/dist/. /home/claude/wt-gfotos/viz3/dist/`.
- **Memory is tight (all sessions share ~5.8 GB; a SwiftShader page takes 3–4 GB):** no big image processing while a browser runs.
- Never use `pkill -f <pattern>` with a pattern that also appears in your own command line; kill by PID.
- Code: ES modules, imports only from modules above in `viz3/src/modules.txt`; comments English, UI German (du), Prettier; `bash tools/check.sh`
  must pass before every push (`set -o pipefail` if you pipe it). No `rnd()` calls added to code that runs at load in the garden (one global
  sequence – adding draws changes everything after it; use fixed values or hashes). Commit messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GdUYaP2XXAAEDXZpGWVkBm`.
- Your files: `viz3/src/garden/*.js` except `hof_hubert*.js` and `hof_auto.js`; `viz3/site.js`/`site.json` keys `bld`, `trees`, `garden`
  objects; `game/player.js` spots of the garden; your test lists, docs. The Kern-Chat does not touch the garden files while you work.
- Performance: no new shader programs if avoidable (reuse `plain()`/`MAT.*`), merge static geometry as the modules do, nothing heavy at start.

## Report when done (or by ~09:30)
The green sha on `feat/garten-fotos` (with the CI run), the comparison table's file, what you changed outside your files, what the photos did
not settle (questions for Falko, short), and five to eight before/after composite paths (photo | model before | model after) in the scratchpad.
