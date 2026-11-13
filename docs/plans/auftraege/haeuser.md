# Auftrag `haeuser` – die Häuser von Ratscher von innen, im normalen Spiel

Gestartet am 14.11.2026 ~0:05 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/haeuser` von `origin/src`, Worktree
`/home/claude/wt-haeuser`, Port 9018. Falko 13.11. 23:56: „Okay, wann kann das alles live gehen und wann kann ich alle Gebäude begehen?“;
zum Anklicken gewählt (~0:00): **Ratscher + Läden** – zuerst die 230 Häuser in Ratscher auch im normalen Spiel, nach dem Livegang der Läden
die Läden innen (eigener Agent), danach Schleusingen. Wörtlich (englisch):

---

**Your part: every house in Ratscher can be entered in the normal game.** The zombie night already has full interiors for the 230 houses with a
front door (`ZINNEN` in `viz3/src/zombie/z_innen*.js`, read `docs/features/zombie-innen.md` and `docs/plans/zombie_einrichtung.md`): built on
entering in the house's own footprint – the Ernhaus plan with hall and stairs, Stube, kitchen, chambers, bathroom, the cellar under the
kitchen, the attic under the roof, windows exactly behind the painted ones, three looks (alt, DDR, Nachwende), lived-in clutter. Outside the
zombie night the houses are closed. Bring them into the normal game, by day and by night, so Falko can walk into any house of the village.

1. **Door and going in:** at each house's front door an action via `KERN.act` („Hineingehen“; inside at the door „Hinausgehen“). Going in
   works like `zombie/z_haus.js` (short fade, the interior from `ZINNEN.mount(id)`, freed on leaving), but in a new module of your own
   (`viz3/src/haeuser/haeuser.js`, global `HAEUSER`, registered in `viz3/src/modules.txt` under a `# feat/haeuser` line after the zombie
   block) – none of the zombie machinery (barricades, searching, break-ins, weapon spots, siren, survivors). Read `z_haus.js` for what already
   works (camera, collisions, fade, freeing) and use ZINNEN's handle `H`; changes inside `zombie/` only as small marked hooks
   (`// feat/haeuser`). The zombie night must stay exactly as it is.
2. **Today's look:** the normal game is today (2026). Add a look „heute“ to the furniture kit (or weight the existing ones), from the house
   number and always the same: most houses heute/Nachwende (fitted kitchen, laminate or tiles, sofa corner, flat TV on a lowboard, a router
   with its lights, a laptop or tablet, LED ceiling lamps, a children's room with a desk, a bathroom with a shower), some houses of old people
   keep the DDR living room (Schrankwand, Sitzgruppe), „alt“ rare (one or two in the village). Reuse `ZIMOB`/`ZIEINR` and the shared
   materials – **no new shader programs**. The zombie night keeps its own mix (it may use „heute“ too if that is one line – say so).
3. **Lived in:** daylight through the windows, at night the lamps on (borrowed lights only, `KERN.lights.borrow`, never new point lights);
   where the kit has spots: sit on the sofa and the chairs, lie on a bed (as in the garden buildings); the doors between rooms open; the
   cellar hatch and the attic as in the zombie night. If a villager of `dorf/` lives in the house and is at home by the game clock, he or she
   may be inside – only if `dorf` already knows homes (read it, do not change its schedules); otherwise leave it for later and say so.
4. **No private details:** these are real houses of real people; the interiors are invented and generic – no names on bells or letter boxes,
   no photos of people, nothing that pretends to be the real interior. Falko's garden buildings keep their own interiors; the shops are not
   your part (`laeden/` belongs to the helper `laeden`, their interiors come later).
5. **Saving:** saved inside a house, a reload puts the player in front of its door outside.
6. **Performance:** built only on going in, freed on leaving (memory back to the level before); inside at most ~60 draw calls (as ZINNEN
   measures), no new programs after the first house; nothing extra while walking through the village (the door actions are cheap: one list,
   nearest door only); the phone memory check (`memphone`) must stay green.
7. **Test** `viz3/test/haeuser.py` (1920×1080) and `viz3/extra/haeuser/tests.txt` (`smoke`, `haeuser`, `zombie_innen`): in normal mode by day
   and by night the door action at a front door, going in, walls stop you, the floor carries, stairs up and down, the cellar, the attic,
   leaving, memory freed, no new programs; all 230 houses mounted and freed once headless (time per house, no errors); screenshots inside
   three houses (day and night) – look at them and improve; the zombie night unchanged (`zombie_innen`).

Rules: work only in your worktree on `feat/haeuser`; merge `origin/src` now and then; never push to `src` or `live`; no force push; browser runs
only via `bash tools/browser_lock.sh` on port 9018; GitHub's runners are shared – run your tests locally first and push real increments only
(about hourly); code comments English, UI German; no keys, no private raw data. Report to the lead (SendMessage to `main`) with screenshots once
the first houses can be entered in the normal game, then a final report with what is open, and stop.
