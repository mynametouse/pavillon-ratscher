# Auftrag Hilfs-Agent `grenzland-mission` – Kapitel 1, fünf Missionen (13.11.2026)

Branch `feat/grenzland-mission`, Worktree `/home/claude/wt-gl-mission`, Port 9017. Gemeinsamer Teil: `grenzland-gemeinsam.md` (zuerst lesen).

---

**Your topic: the story – chapter 1 of „Grenzland“ in five missions**, told and staged as GTA tells its missions (a way to go, somebody
to meet, something to do, something going wrong, getting away), each fitted to the real places. Plan: `docs/plans/plan_grenzland.md`.

Your files: `viz3/src/grenzland/gl_mission_data.js` (GLMDATA – texts, places), `gl_lager.js` (GLLAGER – the haulier's yard),
`gl_mission.js` (GLMISSION – the runner and the missions). Keep the interface in the header of `gl_mission.js` (the mode calls
`neu()` at a fresh start, `start(GL.cur)` after a reload, `tick`, `stop`, `reset`).

**The runner:** missions as data with steps (text, target for the arrow, a check or an event that finishes the step, what to set up when
the step begins and to take down when it ends), state in `GL.m` / `GL.cur` (saved; a reload goes on at the step's beginning with
everything set up again), listed in the game's journal through `KERN.tasks.source({ id: 'grenzland', order: 4, list })` (entries
`{ id, title, who, status, text, target: () => [x, y] | null, z }` – read `core/tasks.js` and `game/quests.js`; track the running one:
`QUESTS.track = 'grenzland:<id>'` – the game's task card then shows text, arrow and distance and draws its marker; `QUESTS.banner`),
checkpoints (failing – caught, the bus missed, the race lost – starts the step or the mission again, never the whole chapter), a
debug API for tests and for Falko (`GLMISSION.debug.go(id, step)`, `.skip()`), events `grenzland:mission` `{ id, st }` and
`grenzland:schritt` `{ id, i }`. Talks: subtitles with the speaker's name (`GLHUD.sub`), spoken through `STIMME.say('gl_<castId>', text)`
where the player has voices on (the mode registers a voice per cast member), choices with `GLHUD.wahl`; the figure talks
(`GLFIG.talking(F, true)`), faces the player. A talk can be skipped. Short cut-scenes: the camera may be moved for a moment only if it is
simple and safe (`GAME.view`) – else stage it in the world and let the player look.

**The cast** is in `GLDATA.CAST` (figures through `GLFIG.make(id)`; load them when a step needs them, drop them after): the stranger,
the clique Jule, Timo, Basti, Gerhard (the old one: the villagers' own Gerhard may walk about too – hide him while yours is on stage:
`DPEOPLE.hide('gerhard')` read-only use), the haulier Krähwinkel, two guards; 1989: Lutz (a friend in the border troops), the ABV, the
people of the village (the agent `grenzland-1989` owns them: `GL89.leute`).

**The missions** (write the talks well – dry, warm, with wit; the two are Falko and Sarah from Berlin with a garden in Ratscher):
1. **„Ein Gefallen“.** Friday evening. The two arrive in Schleusingen at the Zentralhaltestelle (`GLDATA.ORTE.zh`, site [−1340, 1243] –
   Schleusingen is a `KERN.zone` outside the square; read `welt/schleusingen.js`, `bus/bus.js`; put the player there with
   `GRENZLAND.hin`). A stranger presses a parcel into Falko's hands – „nach Ratscher, zur alten Schule“ – and is gone (+50 €). Get to
   Ratscher: by the real bus (the timetable board at the stop: „Auf den Bus warten“), by stopping a car („Auto anhalten“ →
   „Mitfahren“, the traffic's feature) or on foot; and so that nobody is ever stuck, a button „Mitfahrgelegenheit“ on the panel
   (`GLHUD.extra`) that fades and puts them at the school bus stop of Ratscher half an hour later. At the old school (`ORTE.schule`)
   nobody waits. „Wechsle zu Sarah“ (Tab – teach it): she has long opened the parcel – half of an old border map of 1989 with a cross
   (`GL.add('karte1')`). An SMS from an unknown number: the parcel went to the wrong people. The village chat wakes up. Teach the
   phone (T) and the radio (R). The night: the garden.
2. **„Die Clique“.** An SMS from Jule: whoever has such a map should talk to them – the field barn (`GLORTE.P.scheune`). The moped
   stands in the garden (`GLAUTO.mopedAt` at `ORTE.moped`): fill it with two-stroke mix from a canister beside it (hold; `GL.tank = 5`;
   `GLTON.fx('kanister')`), ride to the barn. Jule, Timo and Basti with their mopeds (`GLAUTO.spawn('moped', …)`, riders seated:
   `c.seat`). Trust is earned: **a race to the dam** (`ORTE.damm`) along the roads (`GLAUTO.route` gives the line; two of them race:
   `GLAUTO.drive(c, dt, { k })`, with rubber-banding that is fair; countdown; the player's position shown; riding through the village
   too fast in front of people is a deed – the wanted system counts it by itself). Lose → again from the barn. Win → at the dam they
   read the map: the old „Kolonnenweg“. „Frag den Gerhard, der war damals dabei.“ +80 €, four bangers; skittles and fishing are
   pointed out (the agent `grenzland-neben` builds them; event `grenzland:mission` `{ id: 'clique', st: 'erledigt' }` starts his side
   mission).
3. **„Gerhards Geschichte“ (1989).** Gerhard sits on the bench under the Dorflinde (`ORTE.linde`). He looks at the map for a long time.
   → `GL89.enter({ pos: ORTE.schulhof.pos, … })`: Friday, 10 November 1989, the afternoon. The player is Gerhard, 35, teacher. Lutz, a
   friend who serves in the border troops, has left a crate in the school the night before: „Heb die auf, bis sich alles beruhigt hat.“
   Now the ABV is on his way to the school (somebody talked). Take the crate (hold; carried in both arms in front of the body –
   a simple crate mesh that follows the player; slower walking; no running) and bring it unseen to the field barn (`GLORTE.P.scheune`,
   about 250 m): through the back gardens, ducking (C) behind fences; the villagers are witnesses who know the teacher
   (`GLFAHNDUNG.tat('kiste')` when one of them or the ABV sees the crate – then the Volkspolizei searches for him); hide the crate
   under the straw (hold), wait in the barn until they are gone. Caught → the memory starts again (`grenzland:nochmal`). Back in the
   present (`GL89.leave()`): „Am nächsten Morgen war die Kiste weg. Und Lutz auch.“ The other half of the map: Lutz had it. If Krähwinkel
   is looking for the crate, he has it. (Use the wanted system switched to 1989 as the agent `grenzland-polizei` builds it; `GLFAHNDUNG.off`
   for the first quiet minute.)
4. **„Nachts an der Klinge“.** An SMS from Jule: Krähwinkel's people reload tonight at the Untere Klinge (`ORTE.klinge`), 23 o'clock.
   „Bis zum Abend warten“ (`CLOCK.wait`) or ride there. In the forest: a van with its lamps on (`GLAUTO.spawn('kasten')`), three men,
   crates. **The two split:** one distracts (a banger on the far side – `grenzland:boeller` – makes the guards walk there), the other
   photographs from cover (`GLHANDY.kamera({ ziel, r: 40, n: 3, sicht })`; the guards see with `GLLOGIK.sieht` – ducking and the dark
   help; seen → they come running: get away, try again). With three photos a guard fires a flare – the village chat: „Schüsse an der
   Klinge?!“ – residents call the police: three hollow stars (`GLFAHNDUNG.tat('hausfrieden', { force: [{ name: 'Anwohner' }], k: … })`).
   **Get away:** back to the garden without being recognised – the main road is blocked (the road block of three stars), the field
   tracks are free; done when the stars are gone.
5. **„Der Coup“.** Show Jule the photos at the barn: the crates go to Krähwinkel's yard in the fields towards the motorway
   (`ORTE.lager`, site [523, 549], beside a track running at compass 81°; check the ground). The other half of the map hangs framed in
   his office container. **Plan it** (`GLHUD.wahl`): *leise* (at night over the fence at the back while the guard makes his round) or
   *laut* (the clique sets off a battery of bangers at the gate, the guards run there) – each with its own risks; later the plan may
   move into the strategy lens, not tonight. **The yard** (`gl_lager.js`, invented, built by this mode, gone when it ends): a fence with
   a gate, four sea containers, the office container with a door and a lit window, a lorry (`GLAUTO.spawn('lkw89' or the van)`), a
   floodlight (borrowed light), a camera at the gate (a witness that knows nobody: `GLFAHNDUNG.hooks.zeuge`), two guards on rounds
   (`GLFIG.go` along points; they see with `GLLOGIK.sieht`), a gap in the fence at the back. Break the office door open (hold; noise),
   take the map (`GL.add('karte2')`); seen → the guards call the police: burglary. **Get away** and bring the map to the barn. The two
   halves together point to a bunker at the old Kolonnenweg, just before Bavaria. End of chapter 1: a closing screen with what was done
   (deeds, escapes, arrests, kilometres, the best skittles, fish) and „Fortsetzung in Kapitel 2“; free play goes on.

Order of work: the runner and mission 1 end to end first (tested, pushed), then 2, 3, 4, 5; each mission playable alone through the debug
API. Where another agent's part is not there yet, the first versions of the core are (they work): build against them and note what you
expect. Everything a mission puts into the world is taken down when it ends, fails or the mode stops.

Test: `viz3/test/grenzland_mission.py` in sections (`m1`, `m2`, `m3`, `m4`, `m5`, `reload`): each mission played through by the test with
the debug API where a human would ride for minutes (but the steps' checks must be the real ones), a reload in the middle of a mission
goes on, the journal lists the missions, the end screen; pictures of every scene. Feature doc `docs/features/grenzland-mission.md`
(what each mission asks, the places, the debug API).
