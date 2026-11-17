# Auftrag: Pflanzen für den Bewuchs – Gräser, Wildblumen, ihr Jahr; später Büsche und Beetpflanzen (Hilfs-Agent `bewuchs-pflanzen`)

Gestartet 17.11.2026 ~21:40 vom Straßen-Chat (session_01WqScFDtq8GSy4n7wU7foJx). Branch `feat/bewuchs-pflanzen` (von `src`), Worktree
`/home/claude/wt-bewuchs-pflanzen`, Port 8967. Plan: `docs/plans/plan_bewuchs.md` (Falko 17.11. 20:19; um 21:30 gewählt: Rasen und Gras
**und** Wiesen und Wildblumen zugleich, Äcker als letzter Schritt, zwei Hilfs-Agenten – dieser für die Arten, `bewuchs-daten` für die
Flächen).

## Brief (English)

Goal: the **what** of the vegetation template – every grass and wildflower of the region (later the bushes and bed plants) as data the
template can draw: look, size, colours and the calendar of the year, and one picture atlas for the flowers. The lead (Straßen-Chat) draws
them (`viz3/src/bewuchs/`: blades, flowers, the ground far away); the helper `bewuchs-daten` makes the maps of where each kind of area
lies (classes 0–17, `docs/plans/auftraege/bewuchs-daten.md`).

1. **Species table** `viz3/src/bewuchs/bw_arten.js` – `export const BWARTEN = { v: 1, gras, blumen, flaechen }`; pure (no three.js, no
   window, no DOM), keys German like the UI, every number with its unit in the name or a comment; checked by
   `viz3/test/unit/bewuchs_arten.test.mjs` (fields present, ranges sane, every atlas cell exists, every class 0–17 has an entry, the
   calendars are day-of-year windows inside 1–366).
   - `gras` – the grasses of lawns, meadows, pastures, verges and banks of southern Thuringia (~400–500 m): Deutsches Weidelgras,
     Wiesen-Rispe, Rotschwingel, Glatthafer, Knaulgras, Wiesen-Fuchsschwanz, Wolliges Honiggras, Rasenschmiele, Quecke, Seggen, Schilf
     …: blade length range (m), width (mm), how stiff (bend 0–1), colour by season (`frisch`, `sommer`, `trocken`, `herbst`, `winter` –
     `#rrggbb`, linear light not needed), seed heads (from–to day of year, height above the leaves, colour, form: Rispe, Ähre,
     Ährenrispe).
   - `blumen` – the plan's ~20 wildflowers and herbs (Löwenzahn with flower and seed head, Gänseblümchen, Weiß- und Rotklee, Hahnenfuß,
     Wiesenschaumkraut, Margerite, Wiesen-Glockenblume, Storchschnabel, Flockenblume, Schafgarbe, Wilde Möhre, Bärenklau, Wiesenkerbel,
     Rainfarn, Wegwarte, Klatschmohn, Kornblume, Kamille, Herbstzeitlose; for fringes and banks Distel, Brennnessel, Springkraut,
     Fingerhut, Mädesüß): height range (m), the atlas cells of its frames (`knospe`, `bluete`, `frucht`/`samen`, `blatt` – leaves only),
     day-of-year windows of each frame for southern Thuringia (with sources), bloom colour (for the ground far away), how many days after
     a cut it flowers again.
   - `flaechen` – one entry per class id 0–17: the grass mix (shares), the flower mix (plants per m² at peak), the height model (mown
     height m, maximum height m, growth per month in cm/day), the care (mowing weekly from–to day; or cut days with a spread ±days per
     field; grazing), shifts of colour (drought, shade) and how bare spots look. Real-world numbers – sources in the doc (e.g. the
     Thuringian grassland and verge-mowing practice, FLL lawn rules, regional floras).
   - Part 2 (later, when the lead says so), in the same file: `straeucher` (the plan's ~16 bushes: form, height, EZ-Tree preset and its
     changes like `gplan/gplan_3d.js` `OWN`, leaf colour by season, bloom and berry windows and colours) and `beet` (perennials, bedding,
     roses, ground cover, vegetables with their stages through the year). The garden planner's database
     (`viz3/extra/gartenplaner/…` `pflanzen.json`, contract `gplan/gplan_schema.js`) already has bloom, fruit and autumn data for many
     garden plants – reuse its numbers where they overlap and say so.
2. **Flower atlas** – one picture `viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.png`, 1024 × 1024 RGBA: 8 × 8 cells of 128 px, cell
   (c, r) counted from the top left; a cell is one plant in side view, its stem foot at the bottom centre, the plant at its full height
   filling the cell's height; straight alpha with the colour bled into the transparent pixels (no dark or white halo in the mipmaps).
   Made by your own generator `tools/bewuchs/pflanzen/atlas.py` (Python with Pillow and numpy – procedural petals, umbels, heads, leaves,
   stems, soft shading; no photos, no foreign artwork, so it is our own work), with `blumen.json` (cell → species and frame). Look:
   natural, not cartoonish, readable at the size a flower has on screen (5–60 px). Judge it in sheets at 1:1 and 1:4 and in the game.
   Room permitting, a few cells of grass seed heads (Rispen, Ähren).
3. **Seeing it in the game:** until the lead's template draws flowers, `viz3/test/bewuchs_pflanzen.py` places your plants as crossed
   quads on a patch of lawn in the garden (e.g. around (10, 10)) on days in April, June, August and October and takes pictures for your
   report (only a test – the real drawing is the lead's `viz3/src/bewuchs/bw_blume.js`). Use only the existing engine (`THREE`, `GAME`,
   `CLOCK`); the only module line you add to `modules.txt` is `bewuchs/bw_arten.js` under `# feat/bewuchs-pflanzen`.
4. **Files:** only `viz3/src/bewuchs/bw_arten.js`, `tools/bewuchs/pflanzen/**`, `viz3/extra/bewuchs-pflanzen/**`,
   `viz3/test/unit/bewuchs_arten.test.mjs`, `viz3/test/bewuchs_pflanzen.py`, `docs/features/bewuchs-pflanzen.md` (what there is,
   sources and how sure, how to rebuild the atlas). The atlas < 3 MB.
5. **Way of working:** only your worktree and branch. Browser only through `bash tools/browser_lock.sh …` on port 8967 (one browser at a
   time on this machine; the lead and `bewuchs-daten` use it too). CPU work with `nice -n 10`. WIP to `wip/bewuchs-pflanzen` (no CI).
   Before pushing to `feat/bewuchs-pflanzen`: merge `origin/src`, `bash tools/check.sh`, your unit test, then one solid push (CI costs
   credits). Never merge into `src` or `live`, never force-push, no bare `git stash`. Report 1 (the table's state, the atlas sheet, the
   game pictures, open questions) to `/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/bewuchs/pflanzen/` as
   soon as part 1 stands – then end your turn with a short report; the lead resumes you for part 2.
6. Code comments English, UI German; no keys, no private data. Commits with `-c user.name="Claude" -c user.email="noreply@anthropic.com"`;
   messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
   `Claude-Session: https://claude.ai/code/session_01WqScFDtq8GSy4n7wU7foJx`.
