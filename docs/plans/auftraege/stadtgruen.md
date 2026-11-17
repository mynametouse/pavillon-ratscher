# Auftrag: Straßenbäume und Grün in Schleusingen (Hilfs-Agent `stadtgruen`)

Gestartet 17.11.2026 ~17:50 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/stadtgruen` (von `src`), Worktree
`/home/claude/wt-stadtgruen`, Port 9051. Falko, 17.11. ~17:30, nach einem Vergleich des Modells mit Ansichten von der Straße
(Lage stimmt, aber die Straßen sind kahl, die Häuser falsch gefärbt, der Markt unfertig) gewählt: „Straßenbäume und Grün“,
„Fassaden nach Ansicht“, „Markt fertig machen“ – die zwei anderen hat der Hilfs-Agent `schleusingen-ansicht`.

## Brief (English)

Goal: Schleusingen's streets as green as they are – the avenues along Hildburghäuser Straße, Suhler Straße and Ilmenauer Straße, street
trees elsewhere, trees in yards, gardens and the castle's surroundings, green strips and hedges where the data shows them – in the
normal game, with the season of the game's date (autumn colours in October, bare in winter, like Ratscher's trees).

1. **Data.** OpenStreetMap (natural=tree, tree_row, hedge; landuse=grass, leisure=park/garden), the aerial images (Thüringen DOP
   20 cm via `tools/geo/dop_th.py`, colour infrared too if the service offers it; the world tiles' images), the town's data
   (`viz3/extra/schleusingen/dist/schleusingen/stadt.json`: buildings `b`, streets `st`, lamps, benches, fountains), the shops' pads and
   car parks (`viz3/extra/laeden/dist/laeden/laeden.json`), parked-car places (DINGE). Tree positions, a species class (lime, maple,
   chestnut, birch, ash, oak, conifer, fruit), height and crown width; avenues as rows with their real spacing. Check species, size and
   spacing along the three roads against the **private reference views** in `/home/claude/ref-ansichten/schleusingen/` (taken by the
   helper `schleusingen-ansicht`; `index.json` lists position, heading and date of each). These pictures are private references: never
   into the repo, a CI artifact, a doc or a texture; the repo and the docs call them „private Ansichten von der Straße“ only.
2. **Where not.** No tree inside a building, on a carriageway or footway, in a car-park bay, on a shop's pad, in front of a door or a
   bus stop, under a lamp. Keep the Markt trees of `welt/schleusingen.js` (no duplicates within 3 m). Only the town (its zone in
   `stadt.json`) and the three roads to the zone's edge – Suhl, Ratscher and the world tiles stay as they are.
3. **Module.** New `viz3/src/stadtgruen/` (`STADTGRUEN`) and `tools/stadtgruen/` → `viz3/extra/stadtgruen/dist/stadtgruen/*.json`.
   Built when the town is there and freed when it goes (follow `SCHL.status()` or its events). **Do not edit `welt/schleusingen.js`,
   `fassade/**`, `laeden/**`, `schleusingen/si_*`, `haeuser/**`, `zombie/**`:** the Grenzland chat's helpers have them (see
   `docs/PARALLEL.md`). If a hook is unavoidable, at most one marked line (`// feat/stadtgruen`) and say so in the report. Reuse the
   species of `garden/trees.js` (`TREES`) and the way Ratscher's trees are drawn (instancing, detail levels, far cards, the trunks as
   colliders like the village's trees, shadows); one module line under `# feat/stadtgruen` in `modules.txt`.
4. **Performance.** Few draw calls (state the budget you hold, in the doc), at most 150 000 tree triangles in view on a computer and
   60 000 with the phone flag, no new shader programs if the existing tree materials do, `memphone` green, nothing at all built
   before the town loads.
5. **Tests and docs.** `viz3/test/stadtgruen.py` (no tree in a building, road, bay, pad; counts per street and the avenues' spacing;
   draw calls and triangles at the Markt and in Hildburghäuser Straße; summer and autumn; the phone flag; screenshots from the
   reference spots in `index.json` – the model only), unit tests for the pure placement code, `viz3/extra/stadtgruen/tests.txt`
   (smoke, stadtgruen, memphone, laeden with a group near the trees – each CI job under 60 minutes), `docs/features/stadtgruen.md`
   (what there is, sources and licences, interface, performance, tests, open points).
6. **Way of working.** Only your worktree and branch. Browser runs only through `bash tools/browser_lock.sh …` on port 9051 (one
   browser at a time on this machine). WIP to `wip/stadtgruen` (no CI). Before pushing to `feat/stadtgruen`: merge `origin/src`, run
   `bash tools/check.sh` and your tests through the lock, then one solid push (CI costs credits). Never merge into `src` or `live`,
   never force-push, no bare `git stash`. Report 1 with screenshots (to
   `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/stadtgruen/`) as soon as the first avenue stands; final
   report with the CI run id, test counts, screenshots and open points.
7. Code comments English, UI German; no keys, no parcel or private raw data in the repo. Commit messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
