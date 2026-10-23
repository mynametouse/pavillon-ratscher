# Auftrag `gartenplaner`, Runde 2 – pflanzen im Spiel, wachsen und ernten, kaufen bei der Baumschule Kammbach

Vom Kern-Chat am 23.10.2026 um 12:00 an den Hilfs-Agenten `gartenplaner` geschickt (Fortsetzung, gleicher Agent, Sitzung
session_01GdUYaP2XXAAEDXZpGWVkBm), Branch `feat/gartenplaner`. Runde 1: `docs/plans/auftraege/gartenplaner.md` (fertig, live als V16n).
Grundlage: Projektdokument `claude/pavillon-gartenplaner.md` („Nächste Runde: kaufen, einladen und einpflanzen, Meilensteine 2 und 3“).
Wiederanlauf nach einem Absturz: `docs/WORKFLOW.md`, Abschnitt 5; Stand: `docs/features/gartenplaner.md`, `git log origin/feat/gartenplaner`.

---

Kern-Chat → gartenplaner, round 2 (Fri 23.10.2026, ~12:00 CEST). Your planner (c1d71f0) is merged and goes live as V16n. Next round, as
the concept says (project doc `claude/pavillon-gartenplaner.md`, copied in `docs/plans/plan_gartenplaner.md`): planting, growing, buying –
milestones 2 and 3. Same branch `feat/gartenplaner`, same worktree, port 8979. First merge `origin/src`.

## Goal (in this order; usable increments, each green on CI)
1. **Planting in the game (milestone 2).** A planned plant can be planted on site. At its place (your rings on the ground) the action
   button offers the steps one after another, each a short animation with the figure: „Pflanzloch graben“ (a soil heap beside a hole,
   sized from form and container), „Wühlmauskorb einsetzen“ and „Pfahl setzen“ only where `schutz` asks for them, „Einpflanzen“,
   „Anbinden“ (trees with a stake), „Angießen“, „Mulchen“ (optional). Then the item is planted: state `geplant → gepflanzt` with the
   planting date (game calendar `DN`); the 3D plant becomes the real one at its planting size. Planted plants stay in the garden whatever
   the preview switch says („im Garten: an/aus“ then only shows or hides the planned, not yet planted ones). In the plan view planted
   and planned look different. Where the plant comes from: until buying works (3.), it comes „aus dem Vorrat“ (as if bought); once
   buying works, only bought plants can be planted – the planner lists the Vorrat (bought, not yet planted). A switch for tests is fine.
2. **Growing, seasons, care, harvest.** Planted plants grow with the game date (age = date − planting date, GPMODEL); leaves, blossom and
   fruit by month (exists). Years pass slowly in play, so the planner gets a garden time-lapse „+1 Jahr“ / „+5 Jahre“: a saved
   garden-year offset for the plants only (pure and deterministic in GPMODEL, unit tests; the game clock stays). Care: „Gießen“ for young
   plants in their first two summers (no weather module exists – a simple rule from month and days since the last watering, shown as a
   hint on the plant); „Schneiden“ for fruit trees in late winter (optional, cheap). Harvest: in the months of `ernte.monate`, from the
   bearing age on, fruit is visible (exists) and „Ernten“ gives an amount (kg from `ernte.kg_jahr`, scaled by age), counted per year in
   the planner („Ernte 2027: 14 kg Äpfel …“). Emit `gplan:gepflanzt`, `gplan:gegossen`, `gplan:geerntet` (KERN.emit) with the plant id.
3. **Buying at the Baumschule Kammbach (milestone 3).** In Kloster Veßra, when the zone is built (`VESSRA.state === 'ready'`; API
   `VESSRA.baumschule`, read `docs/features/vessra.md` „Für den Gartenplaner“: `eingang`, `kasse`, `parkplatz`, `beete` with `art` and
   `slots`): the plants of your shopping list stand as containers on free slots of the matching beds (by `art`/layer; small, instanced,
   your GP3D kinds at planting size) with a tag; „Aussuchen“ puts one in the basket; at the counter (`kasse`) „Bezahlen“ shows a receipt
   („Kassenzettel“: items, date – the game has no money; no prices from the internet). Then they are bought and wait at the counter.
   Transport: (a) „Liefern lassen“ at the counter – next game morning they stand as containers by the garden gate (works now, without
   driving); (b) „Ins Auto laden“ when the car (Kombi, `vehicles/car.js`, `spec.cargo` box) stands within ~15 m – the containers appear in
   the boot (tall standards too long → on the trailer if attached, else delivery); at home „Ausladen“ beside the car. From the containers
   at home: „Tragen“, one at a time (the figure carries it), and plant it at its place (1.). Driving there and back is the `fahrt` agent's
   topic (in progress); until it lands, `?szenario=baumschule` or Menü → Orte → „Kloster Veßra“ brings you there – in tests place the
   car at `parkplatz` to check loading.
4. **A task in the journal** with `TASKS` (`core/tasks.js`, read its header; the first feature to use it): e.g. `gplan-kaufen`
   „Pflanzen bei Kammbach kaufen“ (starts with the shopping list): at the nursery, paid, home with the plants, all planted (`check`) –
   steps finished by your `gplan:*` events or KERN's 'place'. Keep it simple and tell me what TASKS lacked.

## Rules (as in round 1) and news
- Only the VESSRA API: do not edit `welt/vessra.js` (the `vessra` agent) or `vehicles/*` (the `fahrt` agent works in
  `vehicles/vehicle.js` and `vehicles/minimap.js`; `car.js` and `trailer.js` are shared – if loading needs a change there, a few marked
  lines, and tell me first).
- The old garage (phase 0) gets steel shelves with spades, a watering can etc. from the `garage` agent (`feat/garage`, not in src yet).
  Do not depend on it: the planting steps need no tool pickup in this round; a spade or can in the hands during a step only if cheap.
- No new shader programs (your test counts them), no new point lights, nothing allocated per frame for many plants; phone budgets.
- Saving: extend `pav-gplan-v1` (`v: 2` with a migration from 1; adapt your one line in `core/save.js`).
- Tests as before: a browser only through `bash tools/browser_lock.sh … --port 8979`, short holds; long runs on CI (feat.yml runs
  `viz3/extra/gartenplaner/tests.txt`); the nursery part needs the Veßra tiles – CI loads them as `viz3/test/vessra.py` does.
- Docs: `docs/features/gartenplaner.md` (German), „Für den Kern-Chat“ with each green increment (sha, run, results). Do not edit
  PARALLEL, CHANGELOG, ARCHITECTURE.
- Commits as before (English, with the two trailer lines); push only to `origin feat/gartenplaner`.

## Pacing
First usable increment (planting with its steps from the Vorrat, planted plants in the garden) in ~1.5–2 h, then growing, care and
harvest with the time-lapse, then the nursery and the task. Final report by ~17:30: what is done (screenshot paths), what is not,
anything needed outside your files, last commit, CI result.
