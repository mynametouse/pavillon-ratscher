# Auftrag: Schleusingen nach Ansicht – Fassaden und Markt (Hilfs-Agent `schleusingen-ansicht`)

Gestartet 17.11.2026 ~17:50 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/schleusingen-ansicht` (von `src`), Worktree
`/home/claude/wt-schleusingen-ansicht`, Port 9052. Falko, 17.11. ~17:30, nach einem Vergleich des Modells mit Ansichten von der
Straße gewählt: „Fassaden nach Ansicht“ und „Markt fertig machen“ (dazu „Straßenbäume und Grün“ für den Hilfs-Agenten `stadtgruen`).

## Brief (English)

Goal: the houses along Hildburghäuser Straße, Suhler Straße and Ilmenauer Straße and round the Markt look like they do – wall colour
and material, slate, half-timbering, roof – and the Markt is complete. Positions are already right; this is about the look.

1. **References.** Private views from the street, taken on the chat machine into `/home/claude/ref-ansichten/schleusingen/`
   (`plan.json` the spots, `index.json` what was taken; how to take them: the private note there). Private references only: never into
   the repo, a CI artifact, a doc or a texture; the repo and the docs call them „private Ansichten von der Straße“. What goes into the
   repo are attributes you read off them, nothing more.
2. **Facades (data).** For every building of the town (`viz3/extra/schleusingen/dist/schleusingen/stadt.json`, index `i` of `b`)
   that a reference shows: wall colour (sRGB hex, read off a lit part, no shadow), material (plaster, slate cladding – whole, upper
   floors or gables –, half-timbering, clinker, boards, metal), roof material and colour, shutters, a shop front, special buildings
   (e.g. the modern school in Ilmenauer Straße), how sure you are. Identify the buildings by rendering the model from the same spot and
   heading (`index.json`; heading is from true north, the model's north is about 3° off – compute it from
   `viz3/manifests.json` `geoman.xf`). Output `viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json` and the tool
   that checks it (`tools/schleusingen-ansicht/`).
3. **Facades (in the game).** The Grenzland chat's helper `gebaeude` has the town's buildings (`welt/schleusingen.js`) and the new
   `fassade/**` (branch `feat/gebaeude`, merges into `src` at 20:30 and 23:30). **Do not edit either until the lead tells you
   `feat/gebaeude` is in `src`.** Then apply `fassaden.json` through the smallest marked hook (`// feat/schleusingen-ansicht`) or the
   override mechanism `FASSADE` offers. Until then build the data and the tests.
4. **Markt.** First check what is really missing against the references (the town loads its props in fields – wait until they are
   there): the sett, the Marktbrunnen (place and form, the figure on it), the seated bronze figure, benches, planters, the young trees,
   and a grey block without a facade seen from the south-east corner (find what it is). Build what is missing as props in a new
   module of your own (`viz3/src/markt/` or `viz3/src/schleusingen-ansicht/`, `# feat/schleusingen-ansicht` in `modules.txt`); figures
   are generic, no likeness of a real person. What needs `welt/schleusingen.js` (the fountain's place, a building) goes as a list to
   the lead, who agrees it with the Grenzland chat.
5. **Performance.** Facades: no extra draw calls (colours and materials in the existing meshes). Markt props: at most +4 draw calls,
   no new shader programs, `memphone` green.
6. **Tests and docs.** `viz3/test/schleusingen_ansicht.py` (the data covers the buildings the references show; after the hook the
   game uses it for the right buildings; the Markt props are there; draw calls; model pictures from the reference spots – the model
   only), unit tests for pure code, `viz3/extra/schleusingen-ansicht/tests.txt` (smoke, schleusingen_ansicht, memphone, gebaeude once
   it is in `src` – each CI job under 60 minutes), `docs/features/schleusingen-ansicht.md`.
7. **Way of working.** Only your worktree and branch. Browser runs of the game only through `bash tools/browser_lock.sh …` on port
   9052. WIP to `wip/schleusingen-ansicht` (no CI). Before pushing to `feat/schleusingen-ansicht`: merge `origin/src`, run
   `bash tools/check.sh` and your tests through the lock, then one solid push. Never merge into `src` or `live`, never force-push, no
   bare `git stash`. Report 1 with model/reference pairs (to
   `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/schleusingen-ansicht/`) when the facade data stands;
   final report with the CI run id, test counts, pictures and open points.
8. Code comments English, UI German; no keys, no parcel or private raw data in the repo. Commit messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
