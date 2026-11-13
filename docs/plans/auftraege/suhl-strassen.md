# Auftrag `suhl-strassen` – Stufe 2, Paket S2-3 „Straßen“: Straßennetz, Ausstattung, Wasser, Bahn und die Daten der Anfahrt

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~1:30 als Hilfs-Agent, Branch `suhl/strassen`, Worktree
`/home/claude/wt-suhl-strassen`. Zuerst lesen: `suhl-gemeinsam.md`, `suhl-stufe2.md` (dort: Suhl baut **kein zweites Straßensystem**),
dann `docs/plans/plan_suhl.md` Abschnitte 2.1, 4c, 5.3 und die Zeilen S2-3, S2-4, S2-7 in 7.1, `docs/plans/suhl/altbestand.md`
(Abschnitt `feat/suhl-fahrt`), `docs/features/suhl-bestand.md` (Straßenraum). Hier steht der Auftrag wörtlich (englisch). Stand:
`docs/features/suhl-strassen.md`, `git log origin/suhl/strassen`.

---

## Your topic: Suhl's roads as data for the road system the region already has

Two things exist that you build on and never edit:
- **The drive data** `fahrt/strassen.json` and its tool `viz3/extra/fahrt/strecke.py` with `tools/welt/roads.py` (axis fitting,
  smoothed longitudinal profiles per road class, cross-sections, the test number „waves per km“); the first Suhl attempt extended it
  for the motorway, bridges and tunnels: `origin/feat/suhl-fahrt:viz3/extra/suhl-fahrt/suhl_strecke.py`, `recherche.json`,
  `dist/fahrt/suhl.json` (1,251 road pieces with profiles, 67 signs, 45 bridges, 2 tunnel tubes, 4 routes; its workflow ran green;
  94 % of its heights are from the 30-m terrain).
- **The roads chat's work** on `origin/feat/strassen` (not yet in `src`; `git fetch --depth 1 origin feat/strassen`):
  `docs/features/strassen.md`, `viz3/src/strassen/` (road map around the observer in the ground shader: asphalt, markings by class
  and setting, kerb, gutter, sidewalk; styles 0 open road, 1 no overtaking, 2 town, 3 village), `viz3/extra/strassen/daten.py`
  (roadside furniture: delineators, crash barriers, traffic signs, lamps, poles – so far only for the area of the drive data). Its
  message to us in `docs/PARALLEL.md` (13.11. 1:05): if Suhl's roads are in the drive data, they get the same treatment; the furniture
  tool can be run for Suhl.

You own (only these): `tools/suhl/strassen/**`, `tools/suhl/out/strassen/**`, `.github/workflows/suhl-strassen.yml`,
`docs/features/suhl-strassen.md`. You import and call the tools above from your own scripts; if one of them cannot do what Suhl needs
without a change, describe the smallest change under „Für den Suhl-Chat“ – the lead takes it to the roads chat.

## Deliver

1. **Understand the format and say what Suhl needs from it** (first 30 minutes, written into your document): the fields of
   `fahrt/strassen.json` as the roads chat reads them (class, surface, width, style, profile, edges), what its road map can show in a
   dense town (the Kernstadt has 165 km of car roads and 513 km of ways on 22 km²; the Zentrum 12.9 km of car roads), limits you see
   (map size around the observer, number of segments, junctions, one-way streets, lanes, pedestrian zones such as the Steinweg and the
   Markt, squares, parking areas, bus bays, roundabouts), and the open questions for the roads chat. Short and concrete.
2. **Sample set (~45 minutes after that):** the roads of the sample tiles of the Zentrum in the drive-data format, with class, width,
   surface, style (2 town), names, one-way, lanes where OSM has them, smoothed profiles on the terrain available today, bridges
   (e.g. the railway viaduct over the valley road), plus the pedestrian areas and squares as areas with their surface (paving). Under
   `tools/suhl/out/strassen/probe/suhl/s/v0/…` (≤ 3 MB) and, in the same push, as a file the existing drive code could load
   (`fahrt/suhl-zentrum.json`, same format as `fahrt/strassen.json`). Tell the lead when it is pushed.
3. **The whole city in GitHub Actions:** every road and way of `stadt` from the Geofabrik extract (osmium), all profiles solved
   together per block so that junctions share one height (as `suhl_strecke.py` does), the waves-per-km numbers per class before and
   after as the test; water (Lauter, Hasel and their culverted parts, ponds) and the railway (tracks, station, viaduct, level
   crossings) as their own layers; the two routes garden → Suhl taken over from the first attempt and recomputed (suggestion of the
   design: lead the motorway route over the exit Suhl-Zentrum of the A 73, so the tunnel is not needed at first – check in
   `recherche.json` whether that works).
4. **Furniture:** run `viz3/extra/strassen/daten.py` (unchanged, imported) for Suhl's roads if it can take them; otherwise produce the
   same kind of output with your own script and say why. Add what a town has and the tool may not know: signal positions (94 signal
   nodes in the Kernstadt), pedestrian crossings (181), bus stops with their names from the timetable data
   (`tools/suhl/out/bestand/oepnv.json`), street lamps where OSM has them (723) and along named streets where it has none (idea from
   the first attempt), street-name signs. As data in `m/` tiles (plan 2.4); how they are drawn is the runtime's and the roads chat's
   business.
5. **Checks** (plan 5.3): no building footprint inside a carriageway (footprints from `origin/suhl/gebaeude` when it has them, else
   ETHOS/OSM from stage 1), junctions flat, profiles within the limits per class, counts against `bestand.json`.
6. `docs/features/suhl-strassen.md` (German): what exists, numbers, what the roads chat's system covers and what not, sources and
   attribution (© OpenStreetMap contributors, ODbL; timetable DELFI CC BY 4.0), how to run again, „Für den Suhl-Chat“ (questions and
   wishes for the roads chat, each as small as possible).

Heights improve when 1-m terrain arrives (`suhl-boden`, step 3 of its brief): keep the profile step repeatable.
