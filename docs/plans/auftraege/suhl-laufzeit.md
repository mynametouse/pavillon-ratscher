# Auftrag `suhl-laufzeit` – Stufe 2, Paket S2-6 „Laufzeit“: Suhl in der App – laden beim Hinkommen, Detailstufen, Vertrag `SUHL.*`

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~1:30 als Hilfs-Agent, Branch `feat/suhl-laufzeit` (von
`src`), Worktree `/home/claude/wt-suhl-laufzeit`. Zuerst lesen: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, dann
`suhl-gemeinsam.md`, `suhl-stufe2.md` und der Entwurf `docs/plans/plan_suhl.md` (liegt nicht auf deinem Zweig:
`git fetch origin suhl/basis && git show origin/suhl/basis:docs/plans/plan_suhl.md`) – Abschnitte 1, 3, 6 und die Zeile S2-6 in 7.1 ganz,
2.3/2.4 für die Formate. Hier steht der Auftrag wörtlich (englisch). Stand: `docs/features/suhl.md`, `git log origin/feat/suhl-laufzeit`.

---

## Your topic: the app side of Suhl

Nothing of Suhl may load at the start of the site. When one gets near, the city appears in detail levels; walking and driving work;
the contract `SUHL.*` answers. You are the only Suhl agent who writes app code.

You own (only these): `viz3/src/welt/suhl.js` (the small registration module in the bundle), `viz3/src/lazy/suhl.js`,
`viz3/src/lazy/suhl-worker.js`, `viz3/src/lazy/suhl/**`, `viz3/extra/suhl-laufzeit/**` (your extra folder must have exactly this name:
`feat.yml` looks for `viz3/extra/<branch name without feat/>/tests.txt`), `viz3/test/suhl.py`, `viz3/test/suhl_tiles.py`,
`docs/features/suhl.md`.

**Your very first push** (before anything else, within minutes): `viz3/extra/suhl-laufzeit/tests.txt` with only a comment line.
Without it every push to your branch would run the tests of all topics on GitHub and slow the other chats down.

## Your working place

- Worktree `/home/claude/wt-suhl-laufzeit` on `feat/suhl-laufzeit`, made by `tools/agents.sh worktree` (node_modules linked, an own
  copy of `viz3/dist` with the site's assets). Build: `cd viz3 && python3 build.py --fast` (seconds). Quick checks before every push:
  `bash tools/check.sh`.
- Browser tests: this machine has 2 cores and other agents compute on it. Run a browser only through the lock and on your port:
  `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9021 --serve suhl` (with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`),
  short runs; everything long and all picture series on GitHub (`feat.yml` runs smoke and the tests in your `tests.txt` on every
  push; pictures: `gh run download <id> -n out`).
- Read the lessons in the project's developer notes that bind you (they are in `docs/WORKFLOW.md`/`ARCHITECTURE.md`): at most 16
  textures per shader program (test `gpu`), every new point light recompiles all shaders (borrow lamps), saved values only through
  `SAVE`, the phone tier (`memphone`), Windows compiles shaders slowly (few new programs), NaN-safe comparisons, no code after `//`
  on the same line.

## Deliver, in increments

1. **Day-one checks, written into `docs/features/suhl.md` (first hour):** (a) app code as a lazy package – the three existing packages
   under `viz3/src/lazy/` are foreign libraries; prove with a tiny package that the registration module can hand `THREE`, `KERN`,
   `WELT` … into a lazily loaded module and a module worker, that `build.py`, `tools/check.sh` (deps, Prettier) and the CSP accept it;
   (b) the sky: the design read from the code that the sky is a sphere of 9 km fixed at the model origin (`viz3/src/garden/env.js`)
   and that the top view is clamped to ±11 km (`game/camera.js`) – look at it in the browser (Kloster Veßra for the sky; move the
   camera to Suhl's coordinates) and say what is really seen; (c) precision at 13 km: a mesh with a tile-local origin versus absolute
   coordinates, seen close up.
2. **The registration module and the contract** (plan 3.2, 6.1, 6.2): zone, spots (`suhl`, later the quarters), `?szenario=suhl`,
   the menu entry only with `?suhl=1`; `SUHL.*` as a shell that waits until the package is loaded; base address `SUHL.BASE` (default
   the data repo, `?suhl=<url>` and the local test server for tests).
3. **The streamer against the sample set:** the data agents push sample tiles of the Zentrum to their branches
   (`origin/suhl/boden`, `suhl/gebaeude`, `suhl/strassen`, `suhl/gruen` under `tools/suhl/out/<paket>/probe/suhl/…`; the schema and
   the list of sample tiles come from `origin/suhl/daten`: `docs/features/suhl-daten.md`, `tools/suhl/lib/`). Copy them into
   `viz3/extra/suhl-laufzeit/dist/suhl/` (≤ 15 MB in git) and build against them: the index, loading by distance and freeing, the
   ground set registered with `WELT` (hooks W1, W2), far ground, buildings generated in the worker from the records (footprint,
   heights, estimated roofs, simple rule-based facades with the existing wall and roof materials or at most the few new programs the
   plan budgets), detail levels L1–L3 of plan 3.3 (L0, the street space, comes in stage 3; roads are drawn by the roads chat's system
   once Suhl's roads are in the drive data – until then show them the simplest way that lets one walk and drive), trees with the
   existing tree models, ground and collision providers for `KERN` (walking and driving on the terrain, walls stop you), building in
   slices (no long frames), disposal with memory measured before and after.
4. **The hooks in shared files** (plan 6.4: H1, S1, W1–W3, K1; later F1, M1): implement them on your branch as **one separate
   commit**, each as small as possible and marked `// feat/suhl`, nothing else in that commit; list them with the diff in your
   document. The lead announces them to the other chats; they may ask for changes. `welt/welt.js` and `world/roads.js` are being
   changed by the roads chat right now (`origin/feat/strassen`) – look at its diff so that your hooks touch other lines.
5. **Tests** `viz3/test/suhl.py` (plan 5.4; sections so they can run singly): nothing of Suhl is requested at the start; the jump
   to Suhl; loading and levels; ground under the feet and a wall that stops; the drive into the sample area; the top view over Suhl;
   night; leaving frees everything; counts of draw calls, shader programs and textures against the budgets of plan 3.4; the phone
   tier. Schleusingen, Kloster Veßra and the drive tests must stay green with your hooks.
6. `docs/features/suhl.md` (German): what exists, how to try it (`?szenario=suhl`, `?suhl=…`), the measured numbers against the
   budgets, the hooks with their diff, what the data agents should change for you, „Für den Suhl-Chat“.

Tell the lead after step 1 (findings), after the first picture of Suhl on your screen (send the screenshot path), and when the tests
are green on GitHub. Do not merge into `src`, do not publish; nothing goes live without Falko.
