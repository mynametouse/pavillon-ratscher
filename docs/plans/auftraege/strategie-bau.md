# Auftrag `strategie-bau` – „Ratscher von oben“: den Pavillon bauen und den Garten von oben

Gestartet am 6.11.2026 ~1:25 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent der zweiten Welle, Branch `feat/strategie-bau`
(von `feat/strategie` 8cfa8e38 – dem Kern des Modus), Worktree `/home/claude/wt-strategie-bau`, Port 9005. Gemeinsame Regeln:
`docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Konzept: `docs/plans/plan_strategie.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (where you work, testing, delivering; its „Why“ is
about the first helpers of the night). Your thema: `strategie-bau`, port 9005. Then read the concept `docs/plans/plan_strategie.md` completely
(Falko's wishes and clicked decisions, sections 1–13) and the core's API: `docs/features/strategie.md` („API für Erweiterungen“) and
`viz3/src/strategie/*` – your branch starts from `feat/strategie` (the core, built tonight by the helper `strategie`, still working: get its
newer state with `git fetch origin && git merge origin/feat/strategie`; also `git merge origin/src` after the lead's integrations). Build ON
the API; where it lacks something, add it in a small, marked way and say so in your feature doc. Falko: realism first – a mirror world, even a
digital twin – and learning (crafts, nature) with much to discover.

## Your topic: building the pavilion and the garden, from above
1. **The pavilion (the big goal; Age of Empires' ages = construction phases):** the world has the pavilion in construction phases
   (`pavilion/phases.js`, `pavilion/*`, the phase switch of the world – `setPhase` in `game/walkable.js`; read the planning facts in
   `docs/` and the cost estimate: about 42–67 k€ depending on variant and own work). Make each phase a real project: uncover and check the old
   garage's slab (dimensions, thickness, reinforcement, frost apron), building law (Gebäudeklasse 1, outer area – what needs a permit in
   Thuringia; the ladder as the only access is an open question: ThürBO § 34), structural design (cantilevers 0.9 m, ring beam over the west glass),
   materials (own timber from the wood chain – structural timber must be dried and graded; bought windows, concrete, fixings), helpers (Christoph's
   „building & craft“, Hubert's tractor), weather windows (`WETTER` when in src), costs in Euro, durations. A finished phase advances the world's
   phase – both worlds show it.
2. **The garden from above:** the garden planner (`gplan/*` – planning, planting, growing over the years, care, harvest, buying at Baumschule Kammbach,
   the neighbour-law distances) steered from above: persons plant, water, cut, harvest (skills; Falko's garden, Ronald's know-how), the real
   seasons, wildlife damage and protection (the helper `tiere`, feat/tiere, gives an API for browsing, wild boar digging, voles – use it when it is
   in src or note the hook), harvests into stocks (food, gifts for reputation, the market).
3. **Learning:** each step says why (a sentence with the real source – building law, timber grading, planting time, guards against browsing).
4. **Test** `viz3/test/strategie_bau.py`: a phase from its first step to done in time-lapse with materials, helpers, costs and a weather window,
   the world's phase advanced; a tree planted, watered, protected, growing, harvested from above; the result visible in the first-person world;
   saved state after a reload; no new shader programs for your things; no page errors; the core's test unharmed; pictures you look at.

Push complete increments (CI is crowded tonight; at most about every 40 minutes). First increment by ~3:00, finish by ~6:45 with the final report.
