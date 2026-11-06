# Auftrag `strategie` – „Ratscher von oben“: Kern des Aufbau- und Strategie-Modus und die Holzkette

Gestartet am 5.11.2026 ~23:30 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/strategie` (von `src`),
Worktree `/home/claude/wt-strategie`, Port 9002. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Konzept und Falkos
Entscheidungen: `docs/plans/plan_strategie.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (context, where you work, testing, delivering; its
„Why“ is about tonight's other helpers – yours is below). Your thema: `strategie`, port 9002. Then read the concept
`docs/plans/plan_strategie.md` (German) completely: it is Falko's wish (5.11. 23:11) and his decisions (23:14). Build the mode „Ratscher von
oben“ – the same world seen from above, steered like Die Siedler 3 / Age of Empires 3 / Warcraft 3, realistic in its logic.

## Tonight: the core and the wood chain (a second helper builds village projects, the pavilion and the garden on your core later tonight)
1. **The mode:** a scene „Ratscher von oben“ (`KERN.scenario`, menu Erleben → Szenen; read `core/kern.js`, how scenes start and end) that
   turns the existing plan view (`P.mode` 'top', `world/siteplan.js`, the zoom out over the valley) into the playing field: persons, vehicles,
   the stocks shown as figures and symbols (close up the 3D figures), a German HUD of its own (resource bar: Euro, wood – logs in fm, boards in
   m³, firewood in rm –, power of the powerstation in %, petrol and diesel in l; the persons with their availability; time controls Pause / 1× /
   5× / 30× and the calendar; notices), panels for places (Werkstatt, Holzlager, Garage, die Klinge, Huberts Hof): stock, jobs, queue, who works
   there, what is missing. Mouse: click to select (a frame for several), right click to send/assign; touch: tap, drag, pinch. Double click on a
   person: take her over in the first/third-person view (the game's normal walking), a key or button back to the top. Leaving the mode leaves
   the world as the jobs made it.
2. **The persons:** Falko, Sarah, Christoph (the player figures, `game/avatar.js` AVATAR) and whom one invites later; Hubert and Ronald (the
   neighbours, `npc/*`, with their own days – `npc/hours.js`, `npc/life.js`) helping in exchange for favours. Each has skills (wood, machines,
   garden, building, talking), stamina and mood, protective gear, certificates (a chainsaw course unlocks felling). **Who is there when**
   (Falko's choice): you and yours are in the garden at weekends and holidays (Friday evening to Sunday; a holiday plan one can set), during the
   week only the neighbours (by favours) – planning around it is a core of the game.
3. **Jobs over the real processes:** a job system: each job has a place, a duration, needs (person with skill/certificate, tools, protective gear,
   power, weather, daylight, quiet hours) and inputs → outputs. It runs as a simulation when nobody looks (time-lapse) and visibly when one looks
   (figures walk the real ways – the NPC walking of `npc/*`/`dorf/*` –, carry, work; simple, cheap). It changes THE SAME state the game has: read
   `world/fell.js` (the marked trees of the Klinge, felling, logs), `werk/winde.js` and `vehicles/*` (skidding, tractor, trailer), `werk/holz*.js`
   (log yard, band saw, drying stacks with their moisture model), `werk/*` and `garden/workshop.js` (the workshop of today, the board game), the
   SAVE keys they use (`core/save.js`). A tree felled from above is gone in the first-person view, boards sawn from above lie in the yard – never a
   second, parallel copy of the world. Where a system has no API for it, add a small one, marked `// feat/strategie`, and list it.
4. **The wood chain (first content):** the Förster marks trees → fell (best in winter) → limb, cut to length, measure → skid with tractor and winch
   → trailer → log yard in the garden → band saw → drying stack (months) → workshop → products. Realistic: the own forest gives spruce, larch,
   pine – building timber (the pavilion), boards, firewood, Hubert's drying huts; Klingenholz cutting boards are hardwood (oak, beech, walnut):
   bought as planks or glued panels (Euro) unless a hardwood tree is there – decide sensibly and say so. First goal: an order „5 Schneidebretter
   Eiche“ with a date and minimum stars (a board made by yourself in the first-person workshop game carries your stars).
5. **Mechanics from the start (Falko's choice, all four):** who is there when (2.); **power** – two PV modules and the powerstation (yield by sun
   and season, with the weather of the world), the petrol generator (fuel, noise), each machine's draw (find the real kinds: the band saw may run
   on petrol); **real rules and safety** – quiet hours for loud machines near the village (Sundays and holidays, nights; see the German machine
   noise ordinance, 32. BImSchV), protective gear or accidents with lost days (no blood), felling only with the course; **events** – storm with
   windthrow in the Klinge, bark beetle in the spruces (out within weeks), a machine breakdown, a big order with a short date.
6. **Euro with real prices** (Falko's choice): petrol, diesel, chain oil, oak planks/glued panels, plants, tools, building material, what a
   cutting board or a cubic metre of firewood fetches – research plausible 2026 prices (web search is fine), keep them as data with a note on the
   source/assumption; a start capital; a simple ledger.
7. **An API for the next helper:** document and keep stable – define a job, a place/building, a resource, an order, an event, a person's
   skill; how content adds goals (chapters). Write it into `docs/features/strategie.md` (German) under „API für Erweiterungen“ by the first
   increment, so the second helper can start (village projects and reputation – the Ortsvorsteher system `amt/*` already keeps the villagers'
   opinion –, the pavilion's construction phases, the garden with `gplan/*`).
8. **Saving:** through SAVE (keys with checks and defaults); a reload in the middle of a job goes on.
9. **Test** `viz3/test/strategie.py`: the scene starts, the HUD, selecting and sending persons, availability by weekday, the wood chain end to end in
   time-lapse (a marked tree → boards in the yard → the order done; the same tree gone in the first-person view), power (a sunny vs a cloudy day,
   the generator), a quiet-hours refusal on a Sunday, an event, Euro booked, saved state after a reload, no new shader programs, no page errors,
   the normal game, the zombie night and Schleusingen unharmed; pictures you look at (from above and close up).

Order of increments: (1) mode, HUD, persons, selecting/sending, time, one simple job (by ~1:30, pushed, green); (2) the wood chain; (3) power,
rules, events; (4) Euro and the order; (5) polish, phone. Finish by about 6:30 with the final report.
