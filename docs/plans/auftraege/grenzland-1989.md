# Auftrag Hilfs-Agent `grenzland-1989` – die Rückblende auf den November 1989 (13.11.2026)

Branch `feat/grenzland-1989`, Worktree `/home/claude/wt-gl-1989`, Port 9014. Gemeinsamer Teil: `grenzland-gemeinsam.md` (zuerst lesen).

---

**Your topic: the flashback – Ratscher on the afternoon of Friday, 10 November 1989.** Falko (13.11. 0:32): „… achte bei den Rückblenden
auf 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion und sonstigen, sodass es wirklich gut ankommt und
realistisch wirkt.“ The player is the young Gerhard (35, teacher; today the village chronicler); the mission (agent `grenzland-mission`)
lets him carry a crate from the old school to a field barn while the Volkspolizei comes. You build the world of that afternoon so that
somebody who lived there then nods: yes, that is how it looked.

Your files: `viz3/src/grenzland/gl_1989_data.js` (GL89DATA), `gl_1989_welt.js` (GL89WELT), `gl_1989.js` (GL89), `gl_fig.js` (GLFIG –
clothes, hats, hair; keep its interface, every other agent calls it). Keep the interface in the header of `gl_1989.js`
(`GL89.enter({ uhr, pos, yaw })` → Promise, `leave()` → Promise, `on`, `leute`, `tick`, `stop`).

Research first (web search; cite sources in `docs/features/grenzland-1989.md`): what a Thuringian village street looked like in late
1989 – colours of plaster and paint, roofs, fences, street lamps, signs („Konsum“, HO, the post office's yellow, slogans/„Losungen“ and
which were really hung in autumn 1989, the „Wandzeitung“), coal and briquettes on the pavement and coal smoke, overhead lines, the
bus stop of the time, telephone box, milk churn stand, hand carts, bicycles, the cars at the kerb (the agent `grenzland-auto` builds
Trabant, Wartburg, Barkas, W 50, Simson – place them through `GLAUTO.spawn/park`; until his types are there use `klein89`, `limo89`,
`lkw89`, `moped`); and above all **what people wore**: Dederon apron dresses, Wattejacke, anorak, corduroy, stone-washed denim („Wisent“,
„Boxer“ and Western jeans from the „Westpaket“), knitted jumpers, Präsent-20 suits, headscarves, „Schiebermütze“, moon boots and
trainers, perms, „Vokuhila“, moustaches; the uniforms of the Volkspolizei (and the ABV) and of the Grenztruppen in 1989 (colours,
collar patches, cap bands, the cuff band). And what really happened on 9/10/11 November 1989 in South Thuringia (the opening of the
border was announced on the evening of the 9th; when did the crossings to Bavaria near Eisfeld/Sonneberg really open; „Begrüßungsgeld“
of 100 DM) – so that what people say is true. Ratscher was not in the 5-km restricted zone (the border is ~20 km south).

Build:
1. **The village of 1989** (`gl_1989_welt.js`): on entering, hide what is newer – read (never edit) how the other modules show their
   things and hide them from outside while the flashback runs, restoring every flag exactly on leaving (keep a list; a restart of the page
   in the flashback must not leave anything hidden: the mode's `stop()` calls `GL89.stop()`): the cars of the aerial photo (`dinge/`),
   the traffic and its people (`VERKEHR.autoOn(false)`, `VERKEHR.clear()`), the buses of today (pick the hour so that none runs, or hide
   them), today's villagers (`DORF.S.hold` is a slot the zombie night uses – set it only while the flashback runs and put back what was
   there), photovoltaics, satellite dishes, today's street furniture where the village modules expose them (`world/village_near.js`,
   `village_props.js`, `dorfkern*.js` – read), the player's own car and the strategy mode's things if visible. What cannot be hidden
   cleanly, leave and note. Add the street of the time around the old school and the Anger (about 150 m around – beyond it dusk and
   haze do the rest): props as merged vertex-colour meshes in `VFIG.mat()` / the village props' material (no new programs): slogan
   banner, Konsum sign, the yellow letter box, telephone box, advertising pillar with the posters of the time (no real logos), a
   heap of briquettes with a shovel, hand cart, bicycles, benches, the bus stop sign of the time, parked cars of the time, a W 50,
   smoke from chimneys (a few soft sprites or the scene's fog – cheap), washing on a line.
   Light and air: a dull November afternoon turning to dusk (the core sets date and clock; work with `DN`/the weather module read-only
   – if the live weather fights your mood, see how the zombie night sets its fog without editing others' code), street lamps of the
   time with their yellowish light (borrowed lights only), lit windows.
2. **The picture:** the core grades the canvas like a faded colour print (`GLHUD.era('1989', datum)`: CSS filter, vignette, grain). Judge
   it on real pictures of your scene and tell the lead under „Für den Lead“ what to change in `gl_hud.js` (values), do not edit it.
3. **The people** (`gl_fig.js` + your data): improve the clothes painting where a picture shows weaknesses (seams between zones, hands
   and necks, patterns that swim, shoes), add what is missing for the time: more garments and prints, **hair** (a perm, a „Vokuhila“,
   a moustache – as small meshes on the head bone like the hats, or painted into the head texture where that looks right; test on
   several figures), glasses of the time, a shopping net, a briefcase. The cast of 1989 is in `GLDATA.CAST` (erna, horst, renate, maik,
   ines, abv, vopo, lutz – extend from your data module: more villagers, a few of each age, no children). Give them an afternoon:
   sweeping the pavement, carrying coal in buckets, standing at the fence talking, tinkering with a moped, queueing at the Konsum,
   walking home with a net – simple routines on `GLFIG.go`, lines as subtitles when the player comes near (`GLDATA.J89.leute` is a start;
   include the true bit about the „Waffenschmied“ in Suhl: two years' wait for a table, the bath before the meal, the kimonos; and the
   „Begrüßungsgeld“; write more, true to the day). They are witnesses for the wanted system (`F.sees`, `F.r`, `F.knows = true` – in the
   village everybody knows the teacher).
4. **The player as the young Gerhard:** repaint the player's own figure for the flashback (`GLFIG.dress(AVATAR.fig.model, …, restore)` –
   read `game/avatar.js` for the figure's object; a parka, corduroy trousers, shoes of the time, if possible hair and glasses) and put
   everything back exactly on leaving; if the player is Sarah, switch to the man's figure for the flashback and back afterwards
   (`AVATAR.setKind`). Check both the shoulder view and the eyes' view.
5. **Sound:** the radio through an open window (the agent `grenzland-radio` makes the stations of 1989; until then the core's
   `GLDATA.J89.radio` as subtitles near a window), a two-stroke somewhere, a church bell on the hour, a dog, coal shovelled – synthesised
   through `GLTON.add` / `GLTON.fx`.
6. `GL89.leute` gives the mission the figures by id; `GL89.enter` resolves when the world stands; everything loads only on entering
   and is freed on leaving (textures of the painted figures are big – watch the phone's memory: at most ~8 figures at a time).

Test: `viz3/test/grenzland_1989.py` (enter: date, clock, the era flag, modern things hidden – count what is visible before and after –,
props and people there, the player repainted; leave: every flag, date, clock, figure exactly as before; the mode's end inside the
flashback restores too; pictures: the street from four standpoints at the school and the Anger, each person close up front and back, the
player in shoulder view; compare with today's same standpoints). Feature doc `docs/features/grenzland-1989.md` with your sources.
