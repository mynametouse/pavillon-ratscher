# Auftrag: Schleusingen nach Ansicht, Runde 3 (Hilfs-Agent `schleusingen-ansicht-3`)

Gestartet 18.11.2026 ~21:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/schleusingen-ansicht-3` (von `src`), Worktree
`/home/claude/wt-schleusingen-ansicht-3`, Port 9056. Falko, 18.11. ~21:15 angeklickt: „Schleusingen Runde 3“ (Gauben, Fenster, Türen,
Ladenfronten nach den privaten Ansichten). Runden 1 und 2 (V18y): `docs/features/schleusingen-ansicht.md`, Auftrag
`docs/plans/auftraege/schleusingen-ansicht.md`.

## Brief (English)

Goal: the houses of Schleusingen that the private views show get what rounds 1–2 left out – **dormers, the windows' rhythm, doors and shop
fronts** – first as data per building, then visible in the game.

1. **References.** The private views from the street in `/home/claude/ref-ansichten/schleusingen/` (`index.json`: 173 views; the rules in
   `AUFNAHME.md`: private references only – never into the repo, a CI artifact, a doc or a texture; the repo and the docs call them
   „private Ansichten von der Straße“). No new pictures are taken without asking the lead. Identify buildings as in round 1 (render the
   model from the view's spot and heading; heading from true north, the model's north ~3° off: `viz3/manifests.json` `geoman.xf`).
2. **Data (round 3).** Per building that a view shows clearly, read off: **dormers** (count per roof side, kind: Schlepp-, Giebel-,
   Walm-, Fledermaus-, Flachdachgaube; width, position), **windows** (axes per storey on the street side, rows, tall or square, arched
   tops – e.g. `#72` –, sashes/bars, shutters), **doors** (position along the street face, kind: Haustür, Tor/Durchfahrt, Ladentür;
   arched or square), **shop fronts** (ground-floor display windows: count and width, door, awning; lettering only where the view shows a
   real shop name – as plain lettering, no logo, no house colours), **bands and cornices** (`#80`), and corrections of rounds 1–2 (the
   half-timbering tone 1 reads too bright red). Write them as new fields of the looks in
   `viz3/extra/schleusingen-ansicht/dist/fassade/ansicht.json` (one key per building as now) with how sure you are; define the field
   contract (names, units, ranges) in `docs/features/schleusingen-ansicht.md`, section „Runde 3“, and extend the checking tool
   (`tools/schleusingen-ansicht/`) and the unit tests.
3. **Rendering – agree first.** The facades and roofs are drawn by `fassade/fassade.js` (Grenzland chat's `FASSADE`), `world/village*.js`
   and `gebaeude/` – and the Fotorealismus chat's helper `foto-gebaeude` works in exactly these files right now (windows with depth,
   plinths, roofs; its step 4 plans „individual features from real data … nach Ansicht“). **Do not edit these files until the lead has
   agreed it in `docs/PARALLEL.md`.** Meanwhile: the data, tests and a short proposal for the lead – which fields the renderer needs, the
   smallest marked hooks (`// feat/schleusingen-ansicht`) or what `foto-gebaeude` would read; performance limits as before (no extra draw
   calls for the facades, no new shader programs; dormers as part of the roof meshes).
4. **Tests and docs.** `viz3/test/schleusingen_ansicht.py` (the new fields for the buildings the views show; plausible values; once a
   renderer uses them: model pictures from the reference spots – the model only), unit tests, `viz3/extra/schleusingen-ansicht/tests.txt`
   (each CI job under 60 minutes), the feature doc.
5. **Way of working.** Only your worktree and branch. Browser runs only through `bash tools/browser_lock.sh …` on port 9056. WIP to
   `wip/schleusingen-ansicht-3` (no CI). Before pushing to `feat/schleusingen-ansicht-3`: merge `origin/src`, `bash tools/check.sh` and
   your tests through the lock, then one solid push. Never merge into `src`, `kern/*` or `live`, never force-push, never delete branches,
   no bare `git stash`. Report 1 when the data of the first street stands (Markt and Hildburghäuser Straße) with model/reference pairs –
   pairs only to `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/schleusingen-ansicht-3/`; final report with
   the CI run id, counts, the hook proposal and open points.
6. Code comments English, UI German; no keys, no parcel or private raw data in the repo; Hubert and Ronald never in Schleusingen.
   Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
   `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
