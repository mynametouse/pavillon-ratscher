# Auftrag `fahrt`, Runde 2 – der Sprung auf der L 3004 im Quadrat und andere Stellen der Routen

Vom Kern-Chat am 23.10.2026 um 12:45 an den Hilfs-Agenten `fahrt` geschickt (Fortsetzung, gleicher Agent, Sitzung
session_01GdUYaP2XXAAEDXZpGWVkBm), Branch `feat/fahrt`. Runde 1: `docs/plans/auftraege/fahrt.md` (fertig, in `src` als V16q).
Wiederanlauf nach einem Absturz: `docs/WORKFLOW.md`, Abschnitt 5; Stand: `docs/features/fahrt.md`, `git log origin/feat/fahrt`.

---

Kern-Chat → fahrt, round 2 (Fri 23.10.2026, ~12:45 CEST). Thanks for round 1 – merged (7c1f048, with vessra's gate fix 11f7b20) and in
the Prüfpaket as V16q. Your report found a defect on the way Falko will drive most: on the L 3004 inside the square at (−360, 833), just
before the Schleusingen place sign, the grade jumps from 5 to 17 % and the car takes off at 60 km/h (141 m/s², ~0.5 s in the air) in
every run. That is the inner model's road, not fahrt.js – and it is yours now, if you take it:

1. Find every such spot on both routes inside the square (garden → west edge on the L 1625, garden → north edge on the L 3004 to
   Schleusingen, and the way through Ratscher): frames above 8 m/s², flights, grade jumps. Find the cause (the 10 m terrain under the
   road, the V16f smoother `tools/geo/smooth_roads.py` and what it fixed or left, a junction, a bridge, the edge of the modelled garden).
2. Fix it the least invasive way. The published inner terrain is a site asset (gh-pages `geo/`, see `docs/WORKFLOW.md` „Straßen und
   Wege“ and the V16f entries in `docs/CHANGELOG.md`); new site assets need publishing before a build can use them – if you go that way,
   say exactly what must be published and how, and do not publish yourself. A run-time correction is also fine if it is clean: the
   ground providers by priority (`KERN.ground`, core/kern.js), or the road profile pinning you built in strecke.py applied to the inner
   roads. Whatever you choose: wheels, feet and eyes on the same ground, the road look unchanged, nothing new at start-up that costs time.
3. Tests: your fahrt test measures both routes from the garden to the edges (frames above 8 m/s², no flights, the grade along the
   route); the Prüfpaket's „Straßen glatt“ (`smooth_roads.py --measure`) must stay green; v16b (driving) and v16d (trailer, bridge) too.

Same rules as round 1 (your files, shared files only in marked places and listed, browser through the lock on port 8982, long runs on
CI, `tools/check.sh` before every push, commits with the two trailer lines, push only to `origin feat/fahrt`). Report the green sha and
what you changed outside your files. Finish by ~16:00.
