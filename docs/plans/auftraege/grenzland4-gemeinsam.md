# Grenzland, Kapitel 2 Etappe 1 – gemeinsamer Teil der Aufträge (17.11.2026, ~13:30)

For the helper agents `alltag`, `ruf`, `strasse` of the Grenzland chat (lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Code comments English, the
UI German. Read this part first, then your own brief `docs/plans/auftraege/grenzland4-<thema>.md`.

---

## What Falko wants (verbatim)

- **17.11. 12:26:** „… das neue Kapitel 2 an und versuche es anzureichern, was die Story angeht und die Lebendigkeit insgesamt in den
  Szenarien und in den Dörfern, auf den Straßen und in den Städten drumherum. Mache hier entsprechende Vorschläge zum Anklicken …“ – he
  clicked **all 16 proposals** (`docs/plans/plan_kapitel2.md`, section 8) and then **„Etappe 1 starten“**: village life and roads first, with
  helper agents. Stage 1 makes free play in today's Grenzland livelier before any chapter-2 mission exists; build it so the chapter-2
  missions can use it later (the APIs below).
- Still true from 13.11.: GTA-like fun fitting the region and the map; things look and behave realistically. **Hubert and Ronald** (real
  neighbours) are never culprits, targets or butts of jokes – and they are not duplicated as figures of the mode. **No real firms, brands or
  logos** (invented names only). History with sources and respect.

## Where we stand

- The mode is live (`viz3/src/grenzland/`, ~45 modules; what exists: `docs/features/grenzland.md` and `docs/features/grenzland-*.md`).
  Chapter 1 (five missions) is done; chapter 2 is planned (`docs/plans/plan_kapitel2.md`). V18r (17.11.) added real mission music
  (`gl_score.js`), the sound of the places (`gl_umgebung.js`) and 32 real songs on the radio – their files lie in the sound repository
  `https://mynametouse.github.io/pavillon-ton/` (`GLRDATA.ton()`), not on the game's site (it is at 891 MB of 1 GB – keep new files small,
  nothing over a few hundred kB without asking the lead).
- Already there and yours to build on (read them before you plan): people react to the player (`gl_reaktion.js`, `gl_reaktion_data.js`),
  random events on the way (`gl_ereignis.js` with the planner `GLLOGIK.plan` in `gl_logik.js`: blitzer, traktorstau, kirmes, korso, boeller,
  wildunfall), the mode's vehicles (`gl_auto.js` – road graph, routes, `GLAUTO.spawn/route/drive`; types in `gl_typen.js`, `gl_karosse.js`),
  figures (`gl_fig.js`: cast, clothes, walking; `gl_pose.js`; `GLFIG.sitz`, `GLFIG.geste`, `GLFIG.go`), the phone with the village chat
  „Ratscher aktuell“ and the feed (`gl_handy.js`; texts in `gl_radio_data.js` `CHAT`, `CHATEV`, `FEED`, `FEEDEV`), the shop on wheels at the
  Anger (`gl_wagen.js`), skittles and fishing (`gl_kegeln.js`, `gl_angeln.js`), places of the mode (`gl_orte.js`, `GLDATA.ORTE` in
  `gl_data.js`), the wanted level (`gl_fahndung.js`, `gl_logik.js`), money (`GL.pay`), the clock and the date (`time/clock.js` `CLOCK.t` in
  minutes, `time/daynight.js` `DN` with weekday and date), the place names (`KERN.place(x, y)`).

## Ownership in stage 1 (edit only your files; read everything)

| Agent | Branch / worktree / port | Files (in `viz3/src/grenzland/` unless said) |
|---|---|---|
| Lead | `src` | `gl_modus.js`, `gl_state.js`, `gl_hud.js`, `gl_karte.js`, `gl_data.js`, `gl_radio*.js`, `gl_score.js`, `gl_nacht.js`, `gl_umgebung.js`, `gl_stimmen.js`, `tools/voices/*` |
| `alltag` | `feat/grenzland-alltag`, `/home/claude/wt-grenzland-alltag`, 9041 | new `gl_alltag.js`, `gl_alltag_data.js`, `gl_feste.js`, `gl_feste_data.js` |
| `ruf` | `feat/grenzland-ruf`, `/home/claude/wt-grenzland-ruf`, 9042 | new `gl_ruf.js`, `gl_ruf_data.js`, `gl_jobs.js`, `gl_jobs_data.js`; `gl_reaktion.js`, `gl_reaktion_data.js`, `gl_handy.js` |
| `strasse` | `feat/grenzland-strasse`, `/home/claude/wt-grenzland-strasse`, 9043 | new `gl_linien.js`, `gl_linien_data.js`, `gl_rast.js`; `gl_ereignis.js`; the table `EREIGNISSE` (and only it) in `gl_logik.js`; `gl_typen.js` (new vehicle types only) |

Besides your own files you may change: **one line each in `gl_modus.js`** inside `tick(dt)` (your module's tick, after `GLUMGEBUNG.tick(dt)`)
and inside `stop()` (your module's stop), each marked `// grenzland-<thema>`; **one line per new module in `viz3/src/modules.txt`** inside the
`# feat/grenzland` block (after the modules it imports); your tests (`viz3/test/grenzland_<thema>*.py`,
`viz3/test/unit/grenzland_<thema>*.test.mjs`), your extra `viz3/extra/grenzland-<thema>/**` (with `tests.txt`), your feature doc
`docs/features/grenzland-<thema>.md` (German, for humans). **Nothing else** – every other file of the mode and every file outside
`viz3/src/grenzland/` (`game/`, `world/`, `vehicles/`, `audio/`, `dorf/`, `verkehr/`, …) is read-only: hook in from outside (events, public
APIs, per-frame work after the game's own update). Need a change elsewhere? Describe it in your feature doc under „Für den Lead“.

## Interfaces between you (build yours early; guard calls to the others: `window.X && X.f ? … : fallback`)

- **`alltag`:** `GLALLTAG.leute()` → `[{ id, name, ort, x, y, tun }]` (the village people, also those not drawn as figures right now) ·
  `GLALLTAG.person(name)` → one of them or null · `GLFESTE.aktiv()` → `{ id, name, ort, x, y, r, bis }` or null · `GLFESTE.kalender(t)` →
  the next festivals · `KERN.emit('grenzland:fest', { id, an })` when one begins or ends.
- **`ruf`:** `GLRUF.wert(ort)` → −100 … +100 (`ort`: `'ratscher'` | `'schleusingen'`) · `GLRUF.stufe(ort)` → `'beliebt'` | `'neutral'` |
  `'misstrauisch'` | `'verhasst'` · `GLRUF.add(ort, n, grund)` · `KERN.emit('grenzland:ruf', { ort, wert, stufe })` · `GLJOBS.angebote()` ·
  `GLJOBS.start(id)`. The village people of `alltag` greet, nod, whisper or turn away by `GLRUF.stufe` (fallback `'neutral'`).
- **`strasse`:** `GLLINIEN.fahrzeuge()` → `[{ id, art, x, y, linie, naechster }]` · `GLLINIEN.folgen(id)` → the tour of a vehicle (chapter 2
  follows Krähwinkel's lorries) · `GLRAST.ort()` → `{ x, y, name }` · new kinds in `GLEREIGNIS` (a good deed there: `GLRUF.add(…)` if present).
  **The old random event `kirmes` in `gl_ereignis.js` stops when `window.GLFESTE` exists** – the calendar of `alltag` takes the fair over.
- **Voices:** a line is spoken with `STIMME.say('gl_' + who, text, { at: [x, y] })`; it plays a recording when one exists, else the device
  voice. Keep every spoken text a fixed string (a dynamic sentence = fixed fragments one after another) and offer `X.linien()` →
  `[[who, text], …]` in every module with spoken lines – the lead adds your module to the collector (`tools/voices/grenzland_linien.mjs`).
- **Sound:** music at a festival is a song of the Kirmeswelle from the sound repository (`GLRDATA.LIEDER.kirmes`, file
  `GLRDATA.ton() + 'radio/' + datei`) through **one media element** (never decode a whole song into a buffer – an iPhone has no memory for
  that), routed through `audio.raw()` (`ctx`, `amb`) with its loudness by distance; the place beds stay the lead's (`GLUMGEBUNG`).
- **Saving:** your own keys through `SAVE.key('pav-gl-<thema>-v1', { owner: 'grenzland-<thema>', kind: 'json', def, check })`
  (`core/save.js`, in your module); a key that may break the start must have a strict `check`.

## How to work

- Worktree and branch are ready (`bash tools/agents.sh worktree grenzland-<thema>` – from `src` with V18r, a copy of `viz3/dist`, linked
  `node_modules`). Build `python3 viz3/build.py --fast`, check `bash tools/check.sh` (must pass before every push), unit tests without a
  browser wherever logic can be pure (`viz3/test/unit/*.test.mjs`, `node --test`).
- **The mode in a test:** the scene `?szenario=grenzland` starts mission 1 in Schleusingen. Free play right after boot: see
  `docs/plans/auftraege/grenzland2-gemeinsam.md` („How to work“, the snippet that stops the mission and marks chapter 1 done) or copy what
  `viz3/test/grenzland_radio.py` does. A single mission: `GLMISSION.debug.go(id, step)`. Compare counts against a baseline, not zero.
- **Browser:** one at a time, always through `bash tools/browser_lock.sh python3 viz3/test/run.py --port <yours> --serve <test>`; the
  machine's Chrome is killed at ~3.7 GB – keep a local run to one area; do not rebuild `viz3/dist` while your run is queued or running; do not
  run heavy work (prettier over everything, big scripts) while your own browser test runs – the game then runs slow and timing checks fail.
- **GitHub Actions:** a push to your branch without `[skip ci]` runs smoke and every line of your `viz3/extra/grenzland-<thema>/tests.txt`.
  Wrap your test's checks with `viz3/test/grenzland_ci.py` (`ck = grenzland_ci.wrap(lib.Checks('x'), 'x')`): failures become public
  annotations; read them with `curl -s "https://api.github.com/repos/mynametouse/pavillon-ratscher/actions/runs?branch=feat/grenzland-<thema>&per_page=1"`
  → `jobs_url` → each job's `check_run_url` + `/annotations`. At most one such push per ~30 min; all others with `[skip ci]` in the first line.
- **Hard rules learned:** `Object.assign(S, { fn })` must not overwrite state fields of the same name · no code after `//` on the same line ·
  ≤ 16 textures per shader · **no new point lights or spot lights** (borrow one: `KERN.lights.borrow`; else emissive/additive sprites and
  ground decals) · reuse materials (`VFIG.mat()`, clones keep the program) – no new shader programs without need · nothing runs before the
  mode starts, everything is gone after „Beenden“ and in 1989 (stage 1 is today only) · a module's `tick` must never throw (one error stops
  every module after it in the frame – guard what you call) · phone memory: `viz3/test/grenzland_speicher.py` (the mode now adds about
  +35 MB; stay well below +150 MB in all) · frame time: figures and vehicles only near the player, simulate the rest as numbers.
- Commit identity `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit …`; every message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01L6Yrpf75YEUJPnMQdXevjQ`.
  Push `git -c push.negotiate=true push -u origin feat/grenzland-<thema>`; never to `src`, `live`, `gh-pages`, `feat/grenzland`.
- **Timetable (by `date` on the machine – it shows Berlin time):** the lead merges at **16:30** and **19:00**; what is pushed, passes
  `tools/check.sh` and has its test green (here or on Actions) goes in. Push small increments; a solid smaller result beats a big shaky one.
- Falko is around but busy: do not ask him; decide, and write your decisions into `docs/features/grenzland-<thema>.md` with a section
  „Für den Lead“. Look at your own pictures (Read them) – how it looks and feels is the point. Do not spawn agents. Keep your Claude usage
  modest: no endless polishing loops.
- Finish with a report: branch and last commit, what works and how it was tested (with picture paths), what is open, wishes for the lead.
