# Grenzland, Kapitel 2 Etappe 1 – Auftrag `ruf`: Das Dorf redet über euch, Nebenjobs (17.11.2026, ~13:30)

First read `docs/plans/auftraege/grenzland4-gemeinsam.md` (ownership, interfaces, how to work) and `docs/plans/plan_kapitel2.md` (section 8,
„Dörfer“). Branch `feat/grenzland-ruf`, worktree `/home/claude/wt-grenzland-ruf`, port **9042**. Your files: new `gl_ruf.js`,
`gl_ruf_data.js`, `gl_jobs.js`, `gl_jobs_data.js`; and now yours: `gl_reaktion.js`, `gl_reaktion_data.js`, `gl_handy.js` (in
`viz3/src/grenzland/`), your tests, `viz3/extra/grenzland-ruf/`, `docs/features/grenzland-ruf.md`.

Falko clicked (17.11. 12:26): **„Das Dorf redet über euch“** – „Leute grüßen, tuscheln oder rufen die Polizei – je nach euren Taten;
Gerüchte im Gasthaus und im Dorf-Chat.“ – and **„Nebenjobs“** – „Brennholz fahren, Brötchen ausliefern, bei der Feuerwehr helfen – kleines
Geld und guter Ruf.“ In the plan the reputation also hangs on chapter 2's three decisions (Westgeld, the traitor, the file) – make that
possible (`GLRUF.add(ort, n, 'entscheidung:<id>')`), the decisions themselves come later.

## 1 Reputation (`gl_ruf.js`, `gl_ruf_data.js`)

- Pure logic in `gl_ruf_data.js` with unit tests: a value per place (`'ratscher'`, `'schleusingen'`), −100 … +100, from **deeds somebody
  saw** (the wanted level knows them: read `gl_logik.js`, `gl_fahndung.js` and the events they emit, e.g. what `GLREAKTION` already listens
  to), from **good deeds** (jobs, help in an encounter of `strasse`, a festival of `alltag`), and **slowly forgotten** (a few points a game
  day back towards 0). Stufen `beliebt` / `neutral` / `misstrauisch` / `verhasst` with clear thresholds. Saved under your own key.
- **What it changes:** people greet, nod, whisper or turn away, film or call the police (`gl_reaktion.js` and `gl_reaktion_data.js` are yours
  now: put the Ruf into the existing reactions rather than building a second system). The village people of `alltag` read `GLRUF.stufe`.
  A shown change: a small, unobtrusive line on the HUD when a step changes (`GLHUD` message API; ask the lead if you need more).
- **Gossip:** what the village says about the two – new lines in the village chat „Ratscher aktuell“ and the feed **through the phone adapter**
  (`gl_handy.js` is yours; the existing chat texts in `gl_radio_data.js` stay the lead's – put your lines into `gl_ruf_data.js` and post them
  through `GLHANDY`), and spoken by people standing at the Feldscheune, the shop on wheels or the inn (fixed fragments: who, what, where –
  „Hast du gehört? An der Kirche …“). Funny and dry like the existing chat, never mean about real people.
- **API:** `GLRUF.wert(ort)`, `GLRUF.stufe(ort)`, `GLRUF.add(ort, n, grund)`, `KERN.emit('grenzland:ruf', …)`, `GLRUF.tick(dt)`,
  `GLRUF.stop()`, `GLRUF.linien()`, `GLRUF.debug`.

## 2 Side jobs (`gl_jobs.js`, `gl_jobs_data.js`)

- **Brötchen ausliefern:** early morning (before 7:30), from the bakery in Schleusingen (or the shop on wheels) by moped to five or six houses
  in Ratscher; a tip for being quick, a complaint for squashed rolls (a hard landing, a fall).
- **Brennholz fahren:** split logs from a wood pile at the forest edge to two or three houses – with what the mode has (moped with a trailer?
  a car or the van of `gl_typen.js`? read `gl_auto.js` and `vehicles/`; pick what works and looks right; loading as a short timed action).
- **Feuerwehr:** the exercise on Saturday at 9:00 that the village chat mentions (Manfred: „Übung der Feuerwehr Samstag 9 Uhr …“): at the
  fire station, roll out the hose, start the pump, a timed task with the volunteers; afterwards coffee and cake (a short scene).
- Offers come by SMS or the village chat, or a notice board at the Anger; pay through `GL.pay`; Ruf +; each job may carry a field `hinweis`
  for chapter 2 (a story hint dropped in passing – leave them empty or harmless for now). If the mission runner (`gl_mission.js`,
  `GLMISSION`) fits a job, use it; else a small runner of your own with the HUD's messages. Never while a mission runs, never in 1989.
- **API:** `GLJOBS.angebote()`, `GLJOBS.start(id)`, `GLJOBS.tick(dt)`, `GLJOBS.stop()`, `GLJOBS.linien()`, `GLJOBS.debug`.

## 3 Tests and delivery

- `viz3/test/grenzland_ruf.py` with sections `:ruf` and `:jobs` (and `viz3/extra/grenzland-ruf/tests.txt`); unit tests for the reputation
  rules and the job data; existing tests that touch your files must stay green (`viz3/test/grenzland_*` that use `GLREAKTION` or `GLHANDY` –
  find them with grep, run the relevant sections). Pictures: a whisper at the Anger, the chat after a deed, each job underway.
- Report as in the common part; in the feature doc „Für den Lead“: the two lines for `gl_modus.js` if you did not add them, what `alltag`
  and `strasse` should call, open wishes.
