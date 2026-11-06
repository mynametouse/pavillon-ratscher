# Auftrag `strategie-dorf` – „Ratscher von oben“: das Dorf (Projekte, Ansehen, Haushalt, Infrastruktur, Land, Krisen)

Gestartet am 6.11.2026 ~1:25 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent der zweiten Welle, Branch `feat/strategie-dorf`
(von `feat/strategie` 8cfa8e38 – dem Kern des Modus), Worktree `/home/claude/wt-strategie-dorf`, Port 9004. Gemeinsame Regeln:
`docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Konzept: `docs/plans/plan_strategie.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (where you work, testing, delivering; its „Why“ is
about the first helpers of the night). Your thema: `strategie-dorf`, port 9004. Then read the concept `docs/plans/plan_strategie.md` completely
(Falko's wishes and clicked decisions, sections 1–13) and the core's API: `docs/features/strategie.md` („API für Erweiterungen“) and
`viz3/src/strategie/*` – your branch starts from `feat/strategie` (the core, built tonight by the helper `strategie`, still working: get its
newer state with `git fetch origin && git merge origin/feat/strategie`; also `git merge origin/src` after the lead's integrations). Build ON
the API; where it lacks something, add it in a small, marked way and tell the core helper through your feature doc (the lead relays).
Falko: „Wichtig ist natürlich trotzdem immer der Realismus … Spiegelwelt oder ein digitaler Zwilling“ – and his top priority: learn about
nature, crafts, people, politics, social matters, history; much to discover.

## Your topic: the village in „Ratscher von oben“
1. **Village projects and reputation:** with the villagers (`dorf/*`, `npc/*`; their opinion of you exists in the Ortsvorsteher system
   `amt/*` – read it and use it, never a second copy): Mitfahrbank, Bushäuschen, Streuobstwiese, LED street lamps, a Dorffest/Kirmes, the fire
   brigade's needs, paths – each with real steps (who decides, what it costs, who helps, how long), visible in the world when done (where the
   Ortsvorsteher system already places results, reuse it). Reputation grows by helping, keeping promises, quiet hours, fair dealing (Falko's
   „your style shapes the world“ – the core keeps the style measure; feed it).
2. **Village budget and infrastructure (SimCity):** the Ortsteilrat's small budget (the amt system has it), bigger things through the town
   council and funding (e.g. LEADER, the EU programme for rural areas; Thuringian village renewal) – applications with real logic (own share,
   deadlines, approvals), infrastructure: fibre broadband, lamps, bus stop, paths; explain every step with a real source (ThürKO etc.).
3. **Land (instead of conquest):** lease or buy plots (a meadow orchard, a piece of forest, a field strip) at plausible Thuringian 2026 prices
   (research; note sources) – the area grows by contracts, with the neighbours' and owners' consent.
4. **Crisis missions (C&C/StarCraft, real):** storm, flood at the stream/the Schleuse, forest fire in a dry summer, a road blocked by fallen
   trees: the volunteer fire brigade (Manfred, the Wehrführer) and helpers dispatched under time pressure, with real procedures (alarm, roles,
   safety), damage avoided or not; tie to the weather (`WETTER`, feat/wetter – live or by date) where it is in src.
5. **Exploration for the village:** what villagers need, who knows whom, where help is wanted – known when someone goes and talks (the core's
   exploration); the Aushang (notice board) exists in the village (`dorf/*`).
6. **Test** `viz3/test/strategie_dorf.py`: a project from idea to done (time-lapse), reputation changing, a budget booking, a funding application,
   a lease, a crisis mission, the result standing in the first-person world, saved state after a reload, no new shader programs for your things, no
   page errors, the core's own test unharmed; pictures you look at.

Push complete increments (not every small fix – CI is crowded tonight; at most about every 40 minutes). First increment by ~3:00, finish by ~6:45
with the final report.
