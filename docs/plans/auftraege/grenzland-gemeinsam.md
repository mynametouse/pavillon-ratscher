# Grenzland – gemeinsame Regeln der Hilfs-Agenten (Nacht 13.11.2026)

Gestartet am 13.11.2026 ~2:00 vom Grenzland-Chat session_01L6Yrpf75YEUJPnMQdXevjQ (arbeitet mit Falko, Lead der Agenten) mit sechs
Hilfs-Agenten: `grenzland-auto`, `grenzland-radio`, `grenzland-1989`, `grenzland-neben`, `grenzland-polizei`, `grenzland-mission`. Jeder Auftrag
(`docs/plans/auftraege/grenzland-<thema>.md`) verweist auf diese Datei; hier steht der gemeinsame Teil wörtlich (englisch, so wie die Agenten ihn
bekamen). Plan und Falkos Wünsche: `docs/plans/plan_grenzland.md`. Wiederanlauf: `docs/WORKFLOW.md`, Abschnitt 5.

---

You are a helper agent of the Grenzland chat (your lead). Together with Falko Carl the lead builds a GTA-like mode called „Grenzland“ into
Falko's browser 3D world „Pavillon Ratscher“ (three.js r169, ES modules, German UI, English code comments): his garden near the village
Ratscher (Thuringian Forest), the real village around it, Schleusingen and Kloster Veßra, neighbours and villagers with daily lives, traffic,
buses, weather, a zombie night, a strategy mode. Tonight (Fri 13.11.2026, from ~2:00 CET) you work alone on ONE topic, in increments, through
the night. Falko sleeps and cannot answer – decide sensibly yourself and write down what you decided. The lead merges your branch, tests
and publishes. Do not publish yourself, do not push to `src`, `live` or `feat/grenzland`.

## What Falko wants (verbatim, 13.11.2026)
- 0:21 „… wie wir eine Variante reinbringen können … die letztendlich GTA 6 Vibes reinbekommen, um auch Spielspaß und ähnliche Stories, aber
  passend zur Region und zur Karte … passende Quests und überhaupt Gameplay Varianten hinbekommen, die möglichst nah an GTA 6 ranreichen.“
- 0:30 (clicked): story **Grenzland** (smuggling towards Bavaria, flashbacks to 1989), the two to play **Falko and Sarah** (switch any time,
  like Jason and Lucia), tone **like GTA** (satire, chases, fights; adults only), first step **everything**: chapter 1 with 5 missions, wanted
  level and police, phone and radio, vehicles and side activities.
- 0:30 „Okay, bitte setzt das Ganze richtig gut um. Achte darauf, nicht mit den anderen Chats in die Quere zu kommen.“
- 0:32 „… achte bei den Rückblenden auf 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion und sonstigen, sodass es
  wirklich gut ankommt und realistisch wirkt.“
- 0:34 „Integriere auch an passender Stelle die Sushi in Suhl Story in diese GTA-Variante. … Recherchiere die Story.“ (done: the true story
  of Rolf Anschütz and the Japanese restaurant „Waffenschmied“ in Suhl is in `GLDATA.SUSHI` and `GLDATA.RADIO.sushi`, with sources)
- 1:14 (after seeing the first, boxy vehicles) „… bitte achte darauf, dass die Fahrzeuge möglichst realistisch aussehen und auch die
  Innenansicht, also die Cockpit-Variante, schön detailreich ist und auch verschiedene Radiosender eingestellt werden können. Ähnlich wie bei
  GTA. … arbeite bitte die Nacht durch …“
- 1:25 (clicked): up to six helper agents; publish live once all tests are green (the lead does that); the vehicles of 1989 **recognisable
  like the real types, with their names in the text** (Trabant, Wartburg, Simson, Barkas, W50 – but no logos or badges on the models);
  radio music **synthesised by ourselves plus public-domain recordings that are already in the game** (no licensed hits).

## Principles of the mode
- **A world of its own like the zombie night** (`viz3/src/zombie/` is the model to read): its own save `pav-grenzland-v1`, started by the scene
  „Grenzland“ (`?szenario=grenzland`), nothing of it runs or loads before (no meshes, no listeners doing work, no requests at page load),
  „Beenden“ puts everything back. The normal game, the other modes and the other chats' work must not change in any way.
- **Real map, invented culprits.** Ratscher, Schleusingen, the dam, the Klinge are real; crooks, firms and victims are invented (the haulier
  „Spedition Krähwinkel“, the moped clique Jule/Timo/Basti, the stranger). **Hubert and Ronald (Falko's real neighbours), real firms, real
  living persons are never culprits, targets, witnesses or the butt of a joke.** The invented villagers (Gerhard, Ingrid, Manfred, Uwe,
  Wolfgang, Katrin, Jens, Heike) may play parts. Rolf Anschütz (1932–2008) appears only in what is historically true, respectfully.
- **Tone:** satire on the region as in GTA (bureaucracy, the village chat, local radio), warm, never sneering at East Germans or anyone;
  no stereotypes as punchlines; no slurs; no sexual content; nobody under 18 appears. Violence as in the zombie night's human side at
  most (shoves, punches, chases) – no gore here.
- **No brands' logos, no licensed music, no real photos, no keys.** Names of the 1989 vehicle types in texts are fine (Falko's choice).
- **Performance:** runs on a Dell laptop with Intel onboard graphics and on an iPhone. No new point lights (borrow: `KERN.lights.borrow`),
  as few new shader programs as possible (reuse materials: `VFIG.mat()` for vertex-colour meshes – see `gl_modelle.js`; a clone of an existing
  material keeps its program), at most 16 textures per program, free what you load when it is no longer needed, nothing per frame that allocates.
  Windows compiles every new shader program slowly – every new material type costs load time.

## The core (already there, on `feat/grenzland`; read these first)
`viz3/src/grenzland/` – every file has a header that says what it is and its interface:
- `gl_state.js` **GL**: the state (`GL.on`, `GL.era` 'heute' | '1989', `GL.wer` 'm' | 'f', money `GL.geld` with `GL.pay/earn`, things
  `GL.has/add/use`, missions `GL.m`, `GL.W` the wanted level, `GL.save()`, `GL.emit(name, data)` → KERN event `grenzland:<name>`).
- `gl_logik.js` **GLLOGIK** (pure, unit-tested): the wanted rules. `gl_neben_logik.js` **GLNLOGIK** (pure): skittles, fishing.
- `gl_data.js` **GLDATA**: `ORTE` (places in site metres), `CAST` (people → Rocketbox figure, clothes, headwear), `KLEID` (clothes per body
  zone), `T` (texts), `RADIO`, `CHAT`, `FEED`, `SUSHI`, `WAGEN`, `J89` (1989). **Do not edit this file** – copy what is yours into your own
  data module and extend from there (`GLDATA.CAST.neu = {…}` at load is fine); tell the lead if the core's data must change.
- `gl_fig.js` **GLFIG**: `make(castId, { kleid, hut, era })` → figure F (async; Rocketbox figure with clothes painted by body zone and a hat),
  `place(F, x, y, hd)`, `go(F, [x, y] | [[x, y], …], v, done)`, `stop`, `down(F, sec)`, `face`, `drop(F)`, `F.x/y/z/hd/st`, `F.sees`, `F.r`,
  `F.era`; `GLFIG.dress(model, KLEID entry, restoreList)`, `hatOn`, `MUSTER`, `HUTC`.
- `gl_modelle.js` **GLMOD** / `gl_auto.js` **GLAUTO**: vehicle models and driving along the road graph (`spawn`, `park`, `onLine`, `drive`,
  `route`, `netz`, `nodeNear`, `zufahrten`, `mopedAt`, `mopedHide`).
- `gl_ton.js` **GLTON**: synthesised sounds (`fx(name, dist, far)`, `add(name, fn)`, `tone`, `noise`, `raw()`).
- `gl_hud.js` **GLHUD**: `say(big, small, sec)`, `sub(name, text, ms)` (subtitle), `wahl(title, text, [{ t, s, off }])` → Promise<index>,
  `pick(i)` (tests), `fade(on, a, b)` → Promise, `busted`, `hint(text)`, `extra(label, fn)`, `era('1989', datum)`, `acts` (the panel's buttons).
- `gl_fahndung.js` **GLFAHNDUNG**: `tat(id, { force, laut, quiet, k })` (a deed – counts if seen), `zeugen()`, `wo()` (where the player is),
  `los(ax, ay, bx, by)`, `versteckt`, `clear()`, `stand()`, `off` (police switched off by a mission), `extra` (hiding places), `hooks.zeuge`.
- `gl_radio.js`, `gl_handy.js`, `gl_1989.js`, `gl_orte.js`, `gl_wagen.js`, `gl_kegeln.js`, `gl_angeln.js`, `gl_heli.js`, `gl_cockpit.js`,
  `gl_lager.js`, `gl_mission.js` (+ their `_data` files): **first versions or placeholders with the interface fixed** – each is owned by one
  agent (below) who replaces it. Code against these interfaces; do not wait for the others.
- `gl_modus.js` **GRENZLAND**: start/stop, Falko ↔ Sarah (`wechsel`), partner figure, keys (Tab, T, R, G), bangers, the frame tick that
  calls every module's `tick(dt)`; `GRENZLAND.hin(x, y, yaw)` puts the player somewhere.
Tests: `viz3/test/unit/grenzland*.test.mjs`, `viz3/test/grenzland.py` (browser).

## Who owns what (only the owner edits a file; everybody may read and call)
| agent / branch | files in `viz3/src/grenzland/` |
|---|---|
| lead (`feat/grenzland`) | `gl_state.js`, `gl_data.js`, `gl_ton.js`, `gl_hud.js`, `gl_modus.js`, `modules.txt` block, `core/save.js` line |
| `feat/grenzland-auto` | `gl_modelle.js`, `gl_auto.js`, `gl_cockpit.js` |
| `feat/grenzland-radio` | `gl_radio_data.js`, `gl_radio_musik.js`, `gl_radio.js`, `gl_handy.js` |
| `feat/grenzland-1989` | `gl_1989_data.js`, `gl_1989_welt.js`, `gl_1989.js`, `gl_fig.js` (clothes, hats, hair – keep its interface) |
| `feat/grenzland-neben` | `gl_neben_logik.js`, `gl_orte.js`, `gl_wagen.js`, `gl_kegeln.js`, `gl_angeln.js` |
| `feat/grenzland-polizei` | `gl_logik.js`, `gl_fahndung.js`, `gl_heli.js` |
| `feat/grenzland-mission` | `gl_mission_data.js`, `gl_lager.js`, `gl_mission.js` |
Need a further module? Add it in `viz3/src/modules.txt` directly under your last file (one line, same comment style) – nowhere else.
Need something of the lead's files (a text, a HUD function, a key, a hook in the mode) or of another agent's? Do not edit: work around it
in your own files if you can, and write the wish into your feature doc under „Für den Lead“ – the lead adds it when merging. Files outside
`viz3/src/grenzland/` belong to other chats: **read only, never edit** (not even marked hooks – Falko: „nicht mit den anderen Chats in die
Quere kommen“). The one exception is your own `viz3/extra/grenzland-<thema>/**`, `viz3/test/grenzland_<thema>*.py`,
`viz3/test/unit/grenzland_<thema>*.test.mjs` and `docs/features/grenzland-<thema>.md`.

## Where you work
- Worktree `/home/claude/wt-gl-<thema>`, branch `feat/grenzland-<thema>` (from `feat/grenzland`), own `viz3/dist` copy, `node_modules` linked.
  Work only there. Commit often (`git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit …`, end every message with the two
  attribution lines the lead gives you) and push your branch (`git -c push.negotiate=true push -u origin feat/grenzland-<thema>`) at least
  after every increment that passes `bash tools/check.sh` – the machine can restart at any time and loses nothing that is pushed.
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, `docs/plans/plan_grenzland.md`, this file, your brief, then the core's
  files above and `viz3/src/zombie/z_modus.js`, `z_hud.js` (how a mode of its own is built here).
- Coordinates: site metres, x east, y north, z up; three.js `Vector3(x, z, −y)`; headings as compass angles (0 = north, clockwise; `hd` in
  radians in the Grenzland modules, `P.yaw` in degrees). Ground height `KERN.ground(x, y)`; the player `P` (`game/walkable.js`), in a
  vehicle `VEH.cur.st`. The drivable square is `RATSCHER.box`; Schleusingen lies outside it (a `KERN.zone`).
- Lessons of this project (ARCHITECTURE.md and `claude/pavillon-entwicklung.md` have more): everything saved goes through `SAVE` (ours: only
  through `GL`); never return a scene object from `page.evaluate` (return numbers or `JSON.stringify`); never write code after `//` on the
  same line; `Object.assign(S, { fn })` must not overwrite a state field of the same name (it broke the zombie horde twice – name state and
  functions differently); NaN-safe comparisons; lights never via `visible` (use `intensity = 0`); no `compileAsync` for things that may
  disappear (`warmUp(obj)` of `render/render.js`); tests set `window.FREEZE = true` and step with `GAME.step(sec)`.

## Testing
- `bash tools/check.sh` (build, lint, format, dependencies, unit tests, types; < 1 min, no browser) before every push – it must pass.
  Format: `cd viz3 && ../tools/check/node_modules/.bin/prettier --write "src/grenzland/*.js"`.
- Unit tests for everything pure (`viz3/test/unit/grenzland_<thema>.test.mjs`, node, milliseconds).
- A browser test of your topic: `viz3/test/grenzland_<thema>.py` (pattern: `viz3/test/grenzland.py`, `viz3/test/zombie*.py`;
  `lib.Checks`), listed in `viz3/extra/grenzland-<thema>/tests.txt` (one test name per line). **The machine has 2 cores and 8 GB for all
  agents together and one page in the test browser needs 3–4 GB: never start a browser except through the lock** –
  `bash tools/browser_lock.sh python3 viz3/test/run.py --port <your port> --serve grenzland_<thema>` (it waits for the others; build
  first with `python3 viz3/build.py --fast`; a run takes 3–8 minutes plus waiting). Keep browser runs few and short; look at your
  pictures (`out/<test>/*.jpg`, `lib.shot`) – what a thing looks like is part of the job. GitHub Actions runs the tests of your branch too
  (`.github/workflows/feat.yml`: quick checks, smoke, your `tests.txt`); the `gh` CLI has no valid token here, the public API answers:
  `curl -s "https://api.github.com/repos/mynametouse/pavillon-ratscher/actions/runs?branch=feat/grenzland-<thema>&per_page=3"`.
- Kill no processes that are not yours. Do not `pkill` browsers or servers (another agent's test may be running).

## Delivery
- Increments: first something that works end to end and passes the checks, then depth and polish. After each increment: check, commit,
  push, a line in `docs/features/grenzland-<thema>.md` (German, like the other feature docs: what there is, how to try it, decisions,
  „Offen“, „Für den Lead“).
- Stop when your brief is done and tested, or when you are stuck on something only the lead or Falko can decide. Your final message to the
  lead: branch and last commit, what works (tested how), what is open, wishes for the lead's files, anything Falko must decide.
