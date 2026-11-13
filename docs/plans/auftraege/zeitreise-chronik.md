# Auftrag `zeitreise-chronik` – die Chronik der Welten „Allein im Sturm“ und „Gewappnet“

Gestartet am 13.11.2026 ~13:30 (großes Modell). Branch `feat/zeitreise-chronik` von `origin/feat/zeitreise`, Worktree
`/home/claude/wt-zeitreise-chronik`, Port 9011. Gemeinsamer Teil: `zeitreise-gemeinsam.md`. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/zeitreise-gemeinsam.md` (the whole team, the contracts, the rules – they apply to you), then
`docs/plans/plan_zeitreise.md`, `docs/features/zukunft.md` and `viz3/src/zukunft/zk_data.js` (the first version's data: sources, assumptions,
households, PV yields, prices, emission factors – stay consistent with it and reuse its values where they fit).

**Your part: the content – the single source every other part draws from.** You own `viz3/src/zukunft/zk_chronik.js` (global `ZKCHRONIK`,
contract in the shared brief), `viz3/test/unit/zeitreise.test.mjs`, `viz3/extra/zeitreise-chronik/tests.txt`, `docs/features/zeitreise-chronik.md`,
and the new voice lines (recording pipeline, below).

1. **Skeleton within ~45 minutes, pushed:** WORLDS (four, two of them stubs), PAIRS, SPAN, CHAPTERS, a dozen events across the three chapters,
   `state()` with plausible curves, `kpi()` and `lines()` with placeholders, the unit test. The other three build on this – keep the contract.
2. **The chronicle 2026–2060 for `allein` and `gewappnet`** (both *heavy climate* – high emissions; same climate events in the same years:
   `same:true`), chapters **Wald, Wasser, Energie**:
   - *Wald:* drought summers, the beetle building up (more generations per year in warmer years), the mass attack with slopes turning
     red-brown and grey within a year or two, logging (harvester, log piles, trucks), clearings; afterwards „jeder für sich“: a patchwork of
     cleared and standing dead stands, pioneer birch/rowan/willow, bramble, dead wood lying; „gemeinsam“: owners join forces (a
     Forstbetriebsgemeinschaft-like working group), clear quickly, plant mixed forest (beech, oak, fir, maple … in tree guards), the slopes green
     again by the 2040s. Heights and timing from forestry sources, the pace of the Harz and the Thuringian Forest since 2018.
   - *Wasser:* a heavy-rain night (a July night around 23:40 in a 2030s year) in the street of the flood-prone part of the village – sirens,
     water rising, cellars; the morning after: mud, bulky waste („Allein im Sturm“) vs. a wet but undamaged street where the village prepared
     (retention on the slopes, property protection, early warning, a prepared fire brigade – only measures that fit Ratscher); a later river
     flood at the Schleuse bigger than December 2023 (the first version's HQ100 area: 37 buildings, `docs/features/zukunft.md`); flood marks on a
     house wall (2023 real, the future one).
   - *Energie (the core of the energy village):* beetle wood heats the village – a heating house with wood chips and a heat network (trench
     through the street, then running; the oil truck stops coming) in „gemeinsam“; oil heating and rising costs in „jeder für sich“; the wind
     turbine question on a beetle clearing (a decision; in „jeder für sich“ maybe an investor's turbine without local benefit or nothing –
     decide plausibly); the **blackout night** (a winter evening in the 2030s, the region dark for hours): the old school as the lit emergency
     point (village battery/emergency power) vs. a few houses with their own batteries. Text only for the price shock (2022, the Hormus crisis
     2026) as context.
   - *Decisions* (kind `entscheidung`, for later voting): Genossenschaft gründen, Nahwärme nach der Wärmeplanung, Windrad auf der Käferfläche,
     Dorfspeicher mit Notstrom, Waldumbau gemeinsam.
   - An epilogue 2060 per world (the Dorflinde of 1888 still stands; what became of the forest, the water, the energy).
3. **`state(w, yf)`** for every year (curves, not steps; events with their phase), **`kpi(w, chapter)`** – 3 to 5 numbers per chapter, both
   worlds comparable (e.g. dead/cleared/regrown share, wood sold vs. burnt at home, damage in €, preparation costs, share of own heat and power,
   money that stays in the village per year, hours with light and heat in the blackout), each with a range, sources and a short „Warum?“;
   **two questions per chapter** for the room (open, not leading).
4. **Voices:** short lines (1–2 sentences, spoken German, informal, no dialect spelling) for Wolfgang (forest, wood), Manfred (fire brigade,
   water), Uwe (farmer, drought, land), Katrin (care worker, commutes), Gerhard (chronicler, the long view), Ingrid (Ortsteil, decisions); line
   ids stable. Record them free with the existing pipeline: read `.github/workflows/stimmen.yml` and `tools/voices/`; add your lines to its input
   on a branch `stimmen/zeitreise` (from your branch; mind the note about a second commit on a new branch), let GitHub record them, merge the
   recorded files back into your branch and say in your report where they lie (the regie plays them by id; it falls back to the browser voice).
5. **Check the facts, cite them** (`SRC`, with URLs): climate projections for the area (ReKIS, DWD Klimaatlas: hot days, dry spells, heavy rain
   for high vs. low emissions); ThüringenForst forest condition reports and damage since 2018; growth of pioneers and plantings; KOSTRA and the
   first version's flood sources (Drs. 7/9624, HQ100); the energy facts in the project concept (Feldheim, Schlöben eG: since 2009, 6 km network,
   550 kW chip boiler, 6.6 ct/kWh for members; Energy Sharing § 42c EnWG since 1.6.2026; § 6 EEG 0.2 ct/kWh; Wärmeplanung § 4 WPG; the
   Bundesverfassungsgericht on wind in Thuringian forests, 1 BvR 2661/21; the draft Regionalplan Südwestthüringen with 40 wind priority areas
   – find out whether one lies near Ratscher); energy content of spruce wood chips; real long blackouts in Germany for plausibility (e.g.
   Münsterland 2005, Berlin-Köpenick 2019 – verify). Try to find Ratscher's real number of inhabitants/households (Zensus 2022, Stadt
   Schleusingen); if not found keep the first version's 55 households as a marked assumption.
6. **Test** `zeitreise.test.mjs` (node, no browser): contract shape, events sorted and inside SPAN, every place id known, `state()` continuous
   and within 0..1, same-climate events identical in both worlds, every kpi has range and source, line ids unique, no Hubert/Ronald.
   `tests.txt`: `smoke` plus the unit test runner as other topics do (look how `viz3/test/unit/*.test.mjs` run in CI).

Report as in the shared brief: sha, the chronicle in a few lines per world, open facts, the recordings' path.
