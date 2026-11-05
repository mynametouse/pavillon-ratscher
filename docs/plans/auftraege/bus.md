# Auftrag `bus` – Busse nach dem echten Fahrplan, einsteigen und mitfahren

Gestartet am 5.11.2026 ~23:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/bus` (von `src` 2d2d35cc),
Worktree `/home/claude/wt-bus`, Port 8999. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (context, Falko's words and decisions, data reachability,
where you work, testing, delivering). Your thema: `bus`, port 8999.

## Your topic: the real buses – they run after the timetable, and one can ride them
A digital twin needs the traffic that is really there. Bring the real bus lines through Ratscher, Schleusingen and towards Kloster Veßra
into the world after the real timetable (Falko chose: „Einsteigen und mitfahren“ – e.g. Ratscher → Schleusingen).

1. **The timetable:** gtfs.de's free Germany feed (reachable; find and credit its licence – DELFI data, check the gtfs.de terms). Stream it and
   keep only what touches our world: the stops inside Ratscher's square, Schleusingen, along the roads of `welt/fahrt.js` to Kloster Veßra (and
   Suhl if it is in the world); their routes (e.g. Transdev Werra's lines like 225 Schleusingen – Themar), stop sequences, shapes if present,
   trips with times for the service days (workday, school days if the feed tells, Saturday, Sunday and holidays – Thuringia's), compact as JSON
   in `viz3/extra/bus/dist/…`. The game's calendar (time/clock.js `CLOCK`, time/daynight.js `DN` with its date) picks the service day.
2. **The buses run:** at the timetable's minutes on the roads (`verkehr/verkehr_netz.js` VNETZ: the street network of Ratscher and Schleusingen;
   `welt/fahrt.js`: the roads between, with the terrain that streams in as you drive – read how a car crosses the tiles), stop at the real stops
   (Ratscher's bus stop at the old school has a shelter in the world – `world/village_props.js`/`dorf/*`; a stop sign and a timetable board
   where none stands), doors open, a few passengers (`verkehr/verkehr_leute.js` people) may get on or off. Only buses near the player or the one
   you ride are drawn and simulated in detail; the others are just their timetable. The cars of `verkehr` let them pass/wait as they do for the
   player's car if that is cheap.
3. **Ride:** at a stop a board shows the next departures („225 Schleusingen 7:42“); „Auf den Bus warten“ can skip the waiting time (the clock
   jumps, like sleeping); when the bus stands there: „Einsteigen“ (KERN.act). Inside: sit (a view from a seat, or the third-person camera), a small
   German panel with the next stops and times, „Aussteigen an der nächsten Haltestelle“ / choose the stop, „Fahrt abkürzen“ (fade, the clock jumps to
   the arrival – for the long rides). The bus drives the real route across the tiles (streaming like a car). Getting off puts the player at the stop.
   Saving: during a ride, a reload puts you at the stop you boarded or the next one (SAVE key with a check).
4. **The bus:** a regional bus (~12 m low-floor/overland, no brand, plain materials, lit windows and destination display at night with line and
   target in German, true size), lazily built, few draw calls, headlights by `KERN.lights.borrow` (never a new light), no new shader programs;
   engine and door sounds (free recordings with credits, else synthesised). The zombie night has its own bus (`zombie/z_ziele_bus.js` – read it,
   its model may help you, but do not change it); while the zombie night runs (`ZSTATE.on`) no regular buses.
5. **Test** `viz3/test/bus.py`: the data (stops in our world, a workday's departures at Ratscher), a bus appears in time at Ratscher's stop (jump
   the clock), stops, the board, boarding, riding a part of the route (fast), the panel, getting off at another stop, the reload during a ride, no new
   shader programs, no page errors, nothing in the zombie night; pictures you look at.
