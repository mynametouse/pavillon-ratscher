# Auftrag: Wald und Bäume der Region in 3D (Hilfs-Agent `welt-wald`)

Gestartet 17.11.2026 ~19:50 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/welt-wald` (von `src`), Worktree
`/home/claude/wt-welt-wald`, Port 9054. Falko, 17.11. 19:41: „… Das gleiche gilt für den Wald und für die Bäume. Also Stück für Stück
diese flachen Satellitenbilder mit realem Leben und realen 3D-Darstellungen ergänzen.“

## Brief (English)

Goal: along the region's roads and around its villages, what the aerial image shows as forest, copse, tree row or single tree stands
as 3D trees – near the player in full, a little further as cards, far away the ground image as now – with the right kind (spruce,
pine, larch, beech, oak, birch, …), forest edges with undergrowth, the season of the game's date like Ratscher's trees.

1. **Where.** The world tiles outside Ratscher's 2.4 km square (it has its measured trees and the Klinge forest), outside
   Schleusingen's town zone (helper `stadtgruen`) and outside the city of Suhl (the Suhl chat's trees). First the roads one drives
   (to Schleusingen, Kloster Veßra and Suhl – `welt/fahrt.js`, `navi/`), 400 m both sides, then the rest of the tiles.
2. **Data.** OSM forest and wood polygons, tree rows; the landcover (`tools/welt/landcover.py`); the aerial images (Thüringen DOP 20 cm,
   colour infrared too if offered; leaf-on and leaf-off flights apart); conifer or broadleaf from colour and season; heights from the
   surface model DOM1 when the GDI-Th download works (retrying is fine; on a CAPTCHA or login stop, no workaround), otherwise from
   open data (e.g. Copernicus tree cover/forest type) or typical heights per kind. Positions as cells on the 400 m grid of
   `gebaeude/z/` (separate files of your own).
3. **Module.** New `viz3/src/weltwald/` and `tools/weltwald/` → `viz3/extra/weltwald/dist/weltwald/…`; reuse the species of
   `garden/trees.js` (`TREES`) and the way Ratscher's and the Klinge's trees are drawn (instancing, detail levels, far cards, trunk
   colliders via `KERN.pushOut` and `VEH.hitsOut`, shadows near). No tree on a road, in a building (`GEB` cells), in a field the image
   shows open, in a village garden where `welt-orte`'s buildings stand. One module line under `# feat/welt-wald` in `modules.txt`;
   do not touch `welt/welt.js` (hook W5 of the Suhl chat), `gebaeude/**`, `lazy/suhl/**`, `stadtgruen/**`.
4. **Performance.** At most 150 000 tree triangles in view on a computer and 60 000 with the phone flag, at most +10 draw calls, no new
   shader programs if the tree materials do, `memphone` green; at 100 km/h on the road the streaming keeps up (no tree popping up right
   in front); report the numbers in a forest, at a forest edge from a road and in a valley view.
5. **Tests and docs.** `viz3/test/welt_wald.py` (no tree on roads, in buildings, in open fields; counts; draw calls and triangles;
   streaming while driving; summer, autumn, winter; pictures from the road and from above), `viz3/extra/welt-wald/tests.txt` (smoke,
   welt_wald, memphone – each CI job under 60 minutes), `docs/features/welt-wald.md`.
6. **Way of working.** Only your worktree and branch. Browser runs only through `bash tools/browser_lock.sh …` on port 9054. WIP to
   `wip/welt-wald` (no CI). Before pushing to `feat/welt-wald`: merge `origin/src`, `bash tools/check.sh`, your tests through the lock,
   then one solid push. Never merge into `src` or `live`, never force-push, no bare `git stash`. Report 1 with pictures (to
   `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/welt/`) when the first forest along a road stands; final
   report with the CI run id, numbers, pictures and open points.
7. Code comments English, UI German; no keys, no parcel or private raw data in the repo. Commit messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
