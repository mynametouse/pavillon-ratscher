# Auftrag `werkstatt-heute` – die Werkstatt von heute (Bauphase 0) stimmig und nutzbar

Vom Kern-Chat am 30.10.2026 (~0:30) als Hilfs-Agent gestartet (Sitzung session_01GdUYaP2XXAAEDXZpGWVkBm), Branch `feat/werkstatt-heute`,
Worktree `/home/claude/wt-werkstatt`. Hier steht der Auftrag wörtlich (englisch, so wie der Agent ihn bekam).

---

You are a helper agent of the "Kern-Chat" (the main Claude session) working on Falko's browser 3D model/game "Pavillon Ratscher" (three.js r169,
ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringia), the village, driving, small jobs and tasks.
You work alone on ONE topic in your own worktree and branch; the Kern-Chat merges your green states.

## Background (what happened on 29.10.2026)
Falko photographed his garden (125 photos, 26.10.2026) and decided: **construction phase 0 (the start scene, "Bestand") shows the garden as it is
today; everything planned comes with phase 1 and later.** So the Kern-Chat made the big timber workshop hall with the band sawmill, machines,
LED lamps, drying cabinet and log yard (garden/workshop.js) phase ≥ 1 (`export const SAW_PH = 1`, `phase(SAW_PH)` around the hall, a pass that
tags meshes/colliders/walk surfaces made without tagPh, the generator kept for all phases) and built for phase 0 today's **open lean-to**
(`phase(0, SAW_PH)` block at the end of workshop.js: timber posts, mono-pitch corrugated roof, plywood back wall with a tool board, workbench,
table saw on a stand, drawer cabinet; east of it a red machine under a blue tarp; west a pile of offcuts under a blue tarp). Sawing is gated by
`window.PHASE < SAW_PH` in werk/holz_saw.js (opAt, seating a log), the drying cabinet (werk/holz_dry.js) and lamps (garden/workshop_lamp.js)
are phase 1; test viz3/test/v16d.py switches to phase 1 for its fork/saw sections.

## What Falko said after looking at it (30.10.2026, 0:12, in his words)
„vieles macht jetzt in der Werkstatt keinen Sinn mehr, die Objekte sind nicht mehr nutzbar bzw. werden dort angezeigt, wo keine sind – du musst
das alles nochmal auf Stimmigkeit prüfen … also auch die Objekte und Stories bzw. Quests müssen umgebaut werden, um ans neue Gelände zu passen.
In der Werkstatt ist links zwar die Trommelschleifmaschine richtig und abgedeckt dargestellt (Holzmann ZS 560), aber man kann sie nicht
aufdecken und nutzen. Die Blockbandsäge steht eher zwischen den vorderen Balken der Werkstatt, wie auf den Fotos zu sehen (hier abgedeckt).
… vieles auf den Fotos ist nicht integriert – bitte genauer hinschauen und realistisch und sinnvoll integrieren."

## Your task: the workshop of today (phase 0) consistent and usable – and the plan (phase ≥ 1) unchanged
1. **Nothing where nothing is.** In phase 0 find every object other modules place in or around the workshop area (werk/*.js, holz*.js,
   gear.js, quests.js, garden/*.js; e.g. tools lying on the hall's benches, the sawmill bunks, the chopping block with the axe, boards in the
   rack, stacks, signs, crates, PPE) and every interaction target (PLAY.act, PLAY.run, DOORS, KERN.act) there. Each must either belong to
   today's lean-to (then it stands/lies on something that exists in phase 0) or be phase ≥ 1 (hidden, no collider, no action). Probe it in the
   running app (traverse the scene for visible meshes in the workshop rects at phase 0, list actions whose positions are there).
2. **The band sawmill (Blockbandsäge) stands between the lean-to's front posts** in phase 0, covered with a blue tarpaulin; its rails run out
   north in front of the lean-to on wooden blocks (photo IMG_7290: the covered head between the front posts, the steel rail on blocks in front
   right). An action "Plane abnehmen" / "Plane auflegen" (saved state); uncovered it works as the sawmill works today (werk/holz_saw.js: clamp,
   plan the cut, saw – the log comes on its bunks with the tractor's fork, werk/holz.js). In phase ≥ 1 it stays where the plan has it (outside
   north of the hall): make its position phase-dependent cleanly (one offset/transform used by the meshes, colliders, bunks, head travel, sounds
   and the actions), not two copies.
3. **The drum sander Holzmann ZS 560** is the red machine under the blue tarp at the left of the lean-to (seen from the garden): uncover it
   (action), switch it on/off (sound), and the production steps that need the drum sander work there in phase 0.
4. **The table saw** on its stand in the lean-to is the workshop's table saw in phase 0 (switch on/off, sound, the steps that need it).
   The generator powers them as today (garden/garage_play.js refuels it).
5. **The Klingenholz production chain and its tasks** (werk/werk.js, werk/werkui.js, werk/holz*.js, the workshop tasks in game/quests.js and
   core/tasks.js if any): in phase 0 only what today's lean-to can do (band sawmill, table saw, drum sander, workbench – by hand: chisel,
   sanding by hand/orbital sander, oil, branding if it fits); steps that need the thicknesser, planer, glue table, fuming tent or drying
   cabinet are not offered in phase 0, or have a sensible today's alternative (e.g. glue-up with clamps on the workbench; air drying under the
   lean-to roof instead of the cabinet). Texts in the journal/task cards must match. In phase ≥ 1 everything as before.
6. **Look at the photos** (private, never into the repo, never published): `/tmp/claude-0/-home-claude/6d555239-896b-5282-95eb-3a95cf088316/scratchpad/garten/IMG_7270.jpg` … `IMG_7294.jpg`
   (1024 px JPEGs) – the lean-to and its surroundings; the camera positions Falko confirmed are in `…/scratchpad/garten/meta.json`
   (model x, y, yaw in degrees from model north, fl35 = 35 mm focal length: 14 = 0.5× ultra-wide, 26 = main camera). Side-by-side views of
   photo and model at those positions are in `…/scratchpad/garten/cmp/<name>.jpg` (left photo, right the model before your changes) – the
   script that renders them: `…/scratchpad/garten_cmp.py PORT names…` (adapt the port; uses viz3/test/lib.py). Integrate what the photos show
   inside and around the lean-to realistically (tool wall, clamps, sanding discs, cabinet, buckets, the tarps, a wheelbarrow …), within reason.
7. **Tests:** a new browser test `viz3/test/werkstatt_heute.py` (phase 0: the lean-to there, the hall not; uncover the sawmill and the sander,
   switch on and off; one production step at each machine; no visible mesh in the hall area that is not today's; no action target there
   without an object) – add it to a tests list so CI runs it (see how other features list theirs: `viz3/extra/<thema>/tests.txt` and
   .github/workflows); keep `v15b`, `v16d` (its fork/saw run in phase 1), `garage` green. Long runs on GitHub (push to your branch triggers
   `feat.yml`).
8. **Docs:** `docs/features/werkstatt.md` (what is where in which phase, actions, tests, open points).

## Where and how you work
- Worktree `/home/claude/wt-werkstatt`, branch `feat/werkstatt-heute` (based on the Kern-Chat's `wip/kern`, already pushed to origin). Push only
  to `origin feat/werkstatt-heute`. Never to src, live, main or other branches. Do not delete branches or worktrees.
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, KERN services, phases: `core/geo.js` phase()/tagPh,
  `game/walkable.js` setPhase/applyVisibility/phOk/doorOn), `docs/UEBERGABE.md` (current state).
- Build: `cd viz3 && python3 build.py` (node_modules are linked). A fresh build lacks some runtime assets (figures …): after building copy them
  from the Kern-Chat's build: `cp -rn /home/claude/kern-wt/viz3/dist/. /home/claude/wt-werkstatt/viz3/dist/`.
- Browser runs only through the lock, with YOUR port 8993: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8993 --serve <test>`.
  If you start a server yourself (`python3 tools/csp/cspserve.py 8993 viz3/dist &`) do it inside the same command as the test. Never run two
  browsers at once. Python Playwright and Chromium are installed (`require('playwright')` / `import playwright`; never `playwright install`).
- Never use `pkill -f <pattern>` with a pattern that also appears in your own command line (it kills your own shell).
- Code: ES modules, imports only from modules above in `viz3/src/modules.txt`; comments English, UI German (du), Prettier; `bash tools/check.sh`
  must pass before every push. Commit messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GdUYaP2XXAAEDXZpGWVkBm`.
- Your files: `viz3/src/garden/workshop.js`, `viz3/src/garden/workshop_lamp.js`, `viz3/src/werk/*.js`, the workshop/Klingenholz parts of
  `viz3/src/game/quests.js`, your test and doc. Shared core files (`core/*.js`, `game/walkable.js`, `game/play.js`) only for small, clearly
  commented changes – list them in your report. The Kern-Chat works at the same time on trees, the garden houses, the caravan shelter, Hubert's
  yard, the path and brook (garden/trees.js, bungalow.js, carport.js, washhouse.js, garten_heute.js, hof_hubert.js, npc/*.js, world/roads.js,
  garden/stream_geo.js) – do not touch those.
- Performance: no new shader programs if avoidable (reuse plain()/existing materials), nothing heavy at start.

## Report when done (or by ~05:00)
The green sha on `feat/werkstatt-heute` (with the CI run), what you changed outside your files, what you could not do, and three to five
screenshots' paths (in your worktree's `out/`) of phase 0: the lean-to with the covered and the uncovered sawmill and sander.
