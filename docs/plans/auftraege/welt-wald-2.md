# Auftrag: Wald der Region, weitere Strecken (Hilfs-Agent `welt-wald-2`)

Gestartet 18.11.2026 ~21:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/welt-wald-2` (von `src`), Worktree
`/home/claude/wt-welt-wald-2`, Port 9055. Falko, 18.11. ~21:15, nach V19j (der Wald an der Straße nach Suhl) angeklickt:
„Wald: weitere Strecken“ (dazu „Ratschers Laubbäume mit Jahreszeit“ – beim Fotorealismus-Chat – und „Schleusingen Runde 3“ – Hilfs-Agent
`schleusingen-ansicht-3`).

## Brief (English)

Goal: the region's forest of V19j (`WWALD`, `docs/features/welt-wald.md`: 310 726 trees in 86 cells along the road Schleusingen – St. Kilian
– Hirschbach – Suhl) along the next roads one drives: **the corridor to Schleusingen (`markt`) and the one to Kloster Veßra (`baumschule`,
L 1625)**, 400 m both sides, in one short version; then, if the budgets hold and there is time, the remaining tiles one drives through,
stretch by stretch (each a short version of its own).

1. **Data.** The pipeline `tools/weltwald/` (`osm.py`, `baeume.py --corridor --routes …`, `wwlib.py`; sources and licences in the feature
   doc). The raw downloads (`WW_RAW`, default `~/ww-raw`) are gone – download again (the services were reachable from this machine
   yesterday). The WIP commit `85822f9d` once had 165 cells for all three corridors, but the cell format changed after it (`dc479b62`:
   packed crowns) – regenerate, do not copy old cells. Every rule of V19j holds: no tree on roads, paths, rails (clearance), in a building –
   including the 5 754 village buildings of V18y (`baeume.py --drop-in-buildings`) –, or on an open field; leave out Ratscher's square,
   Schleusingen's town zone (`stadt.json` `zone`, the street trees of `stadtgruen`), Suhl's tiles and what Kloster Veßra models itself
   (`wglib.keepout('zonen')`). State the cells, trees and MB.
2. **Runtime.** Only if needed: `viz3/src/weltwald/**` is ours. The Fotorealismus chat's helper `foto-baeume` may add marked lines there
   (`// feat/fotorealismus (foto-baeume)`, the leaves' light, „no two alike“) – merge `origin/src` before every push and keep them. The far
   broadleaf cards look like one uniform wall: that is `foto-baeume`'s „no two alike“ – do not restyle the cards. `world/forest.js` belongs
   to the helper `foto-wald` now: no edits (our only line there is `S.kit`).
3. **Budgets as V19j:** ≤ 10 draw calls and ≤ 145 000 triangles of the trees in view (phone 8 / 56 000), no new shader programs on the way,
   `memphone` green, cells ahead ready at 100 km/h.
4. **Quality.** Look at every picture yourself: from the road (eye height) and from above (the jetpack's view, 160 m): no tree on a road,
   in a yard or in a house, none floating or sunk, forest edges where the aerial image has them, kinds plausible (spruce stands dark,
   beech and oak rounder). Real-world check against the aerial image (`tools/geo/dop_th.py`) for a few spots. Report what is not right,
   also outside your files (e.g. the olive slopes of the embankment rule seen from above – known, reported to `foto-boeden`).
5. **Tests and docs.** `viz3/test/welt_wald_spots.json`: one spot on each new corridor (road and above), `welt_wald.py` covering them;
   each CI job under 60 minutes; `docs/features/welt-wald.md` (what is there now, numbers, open points).
6. **Way of working.** Only your worktree and branch. Browser runs only through `bash tools/browser_lock.sh …` on port 9055. WIP to
   `wip/welt-wald-2` (no CI). Before pushing to `feat/welt-wald-2`: merge `origin/src`, `bash tools/check.sh` and your tests through the
   lock, then one solid push. Never merge into `src`, `kern/*` or `live`, never force-push, never delete branches, no bare `git stash`.
   Report 1 with pictures (to `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/welt-wald-2/`) as soon as the
   new cells stand; final report with the CI run id, numbers, pictures and open points.
7. Code comments English, UI German; no keys, no parcel or private raw data in the repo. Commit messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
