# Auftrag `laeden-innen` – die Läden in Schleusingen von innen

Gestartet am 14.11.2026 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv, nachdem die Läden außen live sind (V18o). Branch `feat/laeden-innen` von
`origin/src`, Worktree `/home/claude/wt-laeden-innen`, Port 9019. Falko 13.11. 23:56: „wann kann ich alle Gebäude begehen?“; zum Anklicken
gewählt (~0:00): **Ratscher + Läden** – die Häuser in Ratscher (Hilfs-Agent `haeuser`), nach dem Livegang der Läden die Läden innen, danach
Schleusingen. Wörtlich (englisch):

---

**Your part: walk into the shops of Schleusingen.** The shops stand outside since this night (`viz3/src/laeden/laeden.js`, `LAEDEN`, data
`viz3/extra/laeden/dist/laeden/laeden.json`, read `docs/features/laeden.md`): OBI with its garden centre, the Mega Center (Mega-Möbel, Aldi,
the Mega-Restaurant, the Apotheke and the other tenants), EDEKA, the Getränkequelle and the strip, Shell, McDonald's with the drive-in,
Lidl, REWE – each with its doors, opening hours and plain lettering. Make them enterable, each inside its own outline (`LAEDEN.shop(id)`:
outline, height, doors, hours).

1. **Going in:** the automatic sliding doors open as you come near while the shop is open (by the game clock); closed, they stay shut and the
   label says so. Inside: the interior built on approach or on going in, freed when you are away (memory back), the outside world stays
   visible through the glazed front. Walls stop you, the floor carries you, you can push a trolley if it is cheap (else leave it standing).
2. **The types**, after photos of such shops in Germany (generic, no chain's design): **Baumarkt** (OBI) – high-bay shelving in long rows with
   plain hanging department signs (Werkzeug, Farben, Holz, Sanitär, Elektro, Garten), the checkout line at the entrance, the info desk, the
   wood-cutting corner, pallets, the garden centre (warm house with plant tables, the cold house, bagged soil); **Möbelhaus** (Mega-Möbel) –
   room islands with sofas, beds, kitchens on display, price tags; **Supermarkt/Discounter** (Aldi, EDEKA, Lidl, REWE) – fruit and vegetables at
   the entrance, shelf rows, chillers and freezers, the bakery corner, the bottle return machine, checkouts with belts; **Schnellrestaurant**
   (McDonald's) – counter with menu boards in plain text, order kiosks, tables, the corridor to the toilets; **Tankstellen-Shop** (Shell) –
   shelves, counter, coffee machine; **Getränkemarkt** – crates stacked on pallets; **Mall** (Mega Center) – the corridor with the tenants'
   shop fronts and their names. Goods as generic packaging (coloured boxes, bottles, cans with plain or no labels) – **no logos, no brand
   colours, no packaging designs, no real product brands**.
3. **Light and life:** ceiling light rows (emissive panels, borrowed lights only – `KERN.lights.borrow`, never new point lights), at night after
   closing only the night lighting; a cashier or two at open tills if the people kit (`npc/`, `dorf/`) gives figures cheaply – read only.
4. **Performance:** shelves and goods instanced or merged by material, a few dozen draw calls per shop at most, the big ones (OBI, Mega Center)
   in parts that only show what you can see from where you stand; **no new shader programs**; the phone memory check (`memphone`) green.
   Your code in new modules `viz3/src/laeden/innen*.js` (global `LINNEN`), registered in `viz3/src/modules.txt` right after
   `laeden/laeden.js` under a `# feat/laeden-innen` line. Changes in `laeden/laeden.js` only as small marked hooks (`// feat/laeden-innen`) – e.g. the door state – and say them in PARALLEL.
5. **Test** `viz3/test/laeden_innen.py` (1920×1080) and `viz3/extra/laeden-innen/tests.txt` (`smoke`, `laeden`, `laeden_innen`): for each shop the
   door opens when open and stays shut when closed, going in, walls stop you, the floor carries you, going out, memory freed, no new programs,
   draw calls inside OBI and the Mega Center; screenshots inside every type (by day, one at night) – look at them yourself and improve. Describe it in `docs/features/laeden-innen.md`.

Rules: work only in your worktree on `feat/laeden-innen`; merge `origin/src` now and then; never push to `src` or `live`; no force push; browser
runs only via `bash tools/browser_lock.sh` on port 9019; GitHub's runners are shared – run your tests locally first and push real increments
only (about hourly); code comments English, UI German; no keys, no private raw data. Report to the lead (SendMessage to `main`) with screenshots
once OBI and one supermarket can be entered, then a final report with what is open, and stop.
