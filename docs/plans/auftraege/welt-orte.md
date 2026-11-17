# Auftrag: Die flachen Orte der Region in 3D (Hilfs-Agent `welt-orte`)

Gestartet 17.11.2026 ~19:50 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/welt-orte` (von `src`), Worktree
`/home/claude/wt-welt-orte`, Port 9053. Falko, 17.11. 19:41: „Bitte check auch nochmal den Landstraßenweg von Ratscher nach Suhl. Hier
gibt es einen Ort, Hirschbach, der ist noch überhaupt nicht abgedeckt, sondern es ist noch flach. … einige Orte, die einfach noch flach
sind, also ohne 3D-Gebäude, obwohl sie eindeutig auf der Satellitenansicht als Gebäude zu erkennen sind. Die bitte auch realistisch
nachbauen … Stück für Stück diese flachen Satellitenbilder mit realem Leben und realen 3D-Darstellungen ergänzen.“

## Brief (English)

Goal: no village of the region lies flat any more. Every place whose buildings the world tiles show only in the aerial image gets
them in 3D, the way the corridors to Schleusingen and Kloster Veßra have them since V17r–V17t (`docs/features/welt-gebaeude.md`).

1. **Order.** First the country road from Ratscher/Schleusingen to Suhl with the villages on it (St. Kilian, Hirschbach, … – find
   the road the game's drive and autopilot use, `welt/fahrt.js`, `navi/`), 600 m both sides like the existing corridors. Then every
   other place inside the world tiles' extent that is still flat: list them (OSM place nodes, built-up areas in the aerial image and
   the landcover) with a count of buildings each, in the doc. Leave out what others model: Ratscher's square, Schleusingen's town
   module zone, Kloster Veßra's module, the city of Suhl (the Suhl chat's own buildings) – `keepout()` in
   `tools/welt-gebaeude/wglib.py`.
2. **Data.** As `tools/welt-gebaeude/` does: ETHOS.BUILDA footprints and heights (ODbL), OSM, roof colour and ridge from the aerial
   images, no duplicates; the same 400 m cells (`gebaeude/z/<i>_<j>.json`, `z/index.json`) and the same loader – the new cells simply
   extend the index. „Leben“: the parked cars, trailers, wood piles … of `tools/welt-dinge/` for the new villages too, if their
   aerial images allow it.
3. **Code.** Prefer data only. `gebaeude/gebaeude.js` is also being changed by the Grenzland chat's helper `gebaeude` (branch
   `feat/gebaeude`, merge into `src` planned 20:30): do not edit it before the lead tells you that merge is in `src`; then at most
   small marked hooks (`// feat/welt-orte`). Do not touch `welt/welt.js` (hook W5 of the Suhl chat), `welt/schleusingen.js`,
   `fassade/**`, `lazy/suhl/**`.
4. **Performance.** As the existing cells: built in small slices only near the player, freed behind; report data size (MB), the
   cells' build time, draw calls and triangles in the densest new village, memory with the phone flag (`memphone` green).
5. **Tests and docs.** `viz3/test/welt_orte.py` (Hirschbach from the road: buildings stand, none on the road, feet on the drawn
   ground, the cells load and free; counts per village; draw calls; pictures from the road at eye height and from 60 m above),
   `viz3/extra/welt-orte/tests.txt` (smoke, welt_orte, memphone and the existing building test – each CI job under 60 minutes),
   `docs/features/welt-orte.md`.
6. **Way of working.** Only your worktree and branch. Browser runs only through `bash tools/browser_lock.sh …` on port 9053. WIP to
   `wip/welt-orte` (no CI). Before pushing to `feat/welt-orte`: merge `origin/src`, `bash tools/check.sh`, your tests through the
   lock, then one solid push. Never merge into `src` or `live`, never force-push, no bare `git stash`. Report 1 with pictures (to
   `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/welt/`) when Hirschbach stands; final report with the CI
   run id, numbers, pictures and open points.
7. Code comments English, UI German; no keys, no parcel or private raw data in the repo. Commit messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
