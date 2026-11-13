# Auftrag Hilfs-Agent `grenzland-polizei` – Fahndung und Polizei (13.11.2026)

Branch `feat/grenzland-polizei`, Worktree `/home/claude/wt-gl-polizei`, Port 9016. Gemeinsamer Teil: `grenzland-gemeinsam.md` (zuerst lesen).

---

**Your topic: the wanted level in the world – make the police a real opponent, as in GTA 6, fitted to the country.**
GTA 6 (previews of autumn 2026): wanted levels come only from crimes that are witnessed by people, reported by victims or caught by
cameras; six stars; the police build a profile of the suspect and the stars are hollow until they have identified him; a couple that
splits up loses a star. Ours: five stars, `gl_logik.js` has the rules, `gl_fahndung.js` a first version of the world side that works end
to end (the lead's test `viz3/test/grenzland.py` shows it: a seen deed → hollow stars → a patrol car comes over the roads from a road
end → searches → the stars go → it leaves; an arrest).

Your files: `viz3/src/grenzland/gl_logik.js` (GLLOGIK, pure, unit-tested), `gl_fahndung.js` (GLFAHNDUNG), `gl_heli.js` (GLHELI). Keep
the interface in the headers (the mode, the missions, the side games call `tat`, `zeugen`, `wo`, `los`, `versteckt`, `clear`, `stand`,
`off`, `extra`, `hooks.zeuge`, `erwischt`, and listen to `grenzland:tat`, `:sterne`, `:erwischt`, `:entkommen`, `:streife`, `:sperre`).

Harden and deepen, in this order (each step tested and pushed):
1. **Play it through and fix what is wrong** – with the browser, step by step (`GLFAHNDUNG.stand()`): does the patrol car find its way
   from every road end to any place of the square, does it search sensibly around the last known position (it should come to that spot
   first, then cruise the roads near it), does it see the player when it should (range by day and night, line of sight through the
   village's walls, not through the forest's trees – read `world/worldcol.js`), does it follow a moped on the road, stop near somebody
   on foot, do the two officers get out, walk after him, arrest him when he stands, give up when he is gone, get in again; does the level
   calm down in the right time; nothing left behind after `clear()`. The road graph has dead ends and field tracks – no car may leave
   the road, drive through a house or stand still for ever. The player's moped can leave the road: that is his advantage.
2. **Witnesses that feel fair and alive:** who sees (people of the mode, villagers, walkers and drivers of the traffic, cameras a mission
   adds through `hooks.zeuge`), who knows the two by name (villagers), what a stranger gives (a description: hollow stars); a witness
   reacts (turns, takes out a phone – a gesture or a subtitle –, the report reaches the police after a few seconds: **knock the witness
   down or talk to him in that time and the report is not made** – careful: no reward for hurting people; make running away, hiding and
   changing the look the better ways). Changing the look: at the garden's bungalow „Umziehen“ clears a description (hollow stars) but not
   a name; a vehicle the police have seen is known until one changes it.
3. **Deeds from the systems** (the list is `GLLOGIK.CRIMES`; add what the others need – the agent `grenzland-neben` asks for `angeln`
   without a permit): speeding through the village on the moped, a banger in the village, shoving and hitting, resisting, breaking
   through a road block, fleeing from a patrol, riding without a helmet if you like the idea, trespassing where a mission says so.
   **Stealing a vehicle:** if you find a clean way without editing the traffic's files – e.g. a parked vehicle of this mode that one can
   take (`GLAUTO`), with its owner or a passer-by as the witness – build it; else leave it and say so.
4. **The answer by stars, as in the country:** 1 – one patrol car (it takes its time: the real distances; the delays are in
   `GLLOGIK.antwort`), 2 – two, 3 – three and a **road block** on the main road ahead of the player's way (two cars across the road, cones,
   an officer with a stop sign; passing it is a deed; it can be driven round over the field), 4 – the **helicopter** (`gl_heli.js`: a model
   without a brand, rotor, its sound from `GLTON.add`, a search light at night as a borrowed light or an additive cone; it circles over
   the last known position, sees whoever is in the open, not under the forest's canopy or under a roof – then the player must hide),
   5 – special forces in vans (the same logic, more of them, they block the exits). Tune numbers so that one star is harmless fun and
   five is nearly hopeless but not impossible (hide in the forest of the Klinge).
5. **1989:** the Volkspolizei (`GL.era === '1989'`): one Wartburg patrol car with a single blue beacon and the horn of the time, the ABV
   on foot who knows everybody (always filled stars in the village), no helicopter, no road block; „Stehenbleiben!“; an arrest ends the
   flashback's attempt (event `grenzland:erwischt` with `era: '1989'` – the mission restarts it).
6. **Beyond the square** (Schleusingen has no road graph here): officers on foot from round a corner – make that sound and feel right,
   or find the town's streets (`welt/schleusingen.js` exposes `segs`; the traffic has a network for the town: `VERKEHR.places`) and let a
   car come there too.
7. **What one sees and hears:** the panel is the lead's (`gl_hud.js`) – tell him what it should show (wishes under „Für den Lead“);
   yours are the police radio's lines as subtitles („Zentrale für Streife 3 …“ – invented call signs), the horn (`GLTON.siren`), the
   officers' shouts, a flash of blue on walls at night if cheap.

Test: `viz3/test/grenzland_polizei.py` (each of the above as far as a test can show it: routes from every road end, seeing and not
seeing through a wall, the chase of a moped along a road and off it, officers out and in, arrest standing and escape running, road
block placed ahead and passed, helicopter sees in the open and not in the forest, 1989's police, nothing left after `clear()`; pictures
of the patrol car with lights at night, the officers, the road block, the helicopter), unit tests for every rule in `gl_logik.js`.
Feature doc `docs/features/grenzland-polizei.md` (with the numbers you tuned).
