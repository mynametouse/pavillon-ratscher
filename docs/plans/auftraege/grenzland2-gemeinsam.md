# Grenzland, Runde 2 – gemeinsamer Teil der Aufträge (13.11.2026, ~11:30)

Für die Hilfs-Agenten `kino`, `stimmen`, `licht`, `figuren`, `welt` des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ).
Code comments English, the UI German. This part first, then your own brief `grenzland-<thema>.md`.

---

## What Falko wants (verbatim)

- 13.11. 0:21: „… eine Variante …, die letztendlich GTA 6 Vibes reinbekommen, um auch Spielspaß und ähnliche Stories, aber passend zur Region
  und zur Karte … möglichst nah an GTA 6 ranreichen.“ – 1:14: „… dass die Fahrzeuge möglichst realistisch aussehen und auch die Innenansicht …
  schön detailreich ist …“ – 8:57: „Du hast alle Freigaben, bitte weiterarbeiten, damit ich schlafen kann.“
- **10:59:** „Ok, schau dir zunächst nochmal Kapitel 1 an und mach Verbesserungsvorschläge für gta6 vibes und immersivität“
- **~11:25, clicked:** packages **A** (immersion breakers out – the lead builds it), **B** (cinema feel), **C** (living world). Not D (car theft,
  fighting) – do not build it.

## Where we stand

Grenzland is **live as V17x** (`viz3/src/grenzland/`, 33 modules; story in `docs/plans/plan_grenzland.md`; what exists in
`docs/features/grenzland.md` and `docs/features/grenzland-{auto,radio,1989,neben,polizei,mission}.md` – the night's six agents, now gone).
The lead played all five missions through and looked at every scene. **Look at the pictures** (Read them):
`/home/claude/pavillon-ratscher/out/grenzland_mission/*_hud.png` (missions 2–5), `/home/claude/scratch/out/grenzland_durchsicht.jpg`
(six problems in one picture). The findings:

- The systems work, the talks are good, 1989 already has atmosphere.
- **What costs the GTA feeling:** far too much UI (the lead fixes that in A); talks without a camera – the speaker is often not in the
  picture (Gerhard tells the key line, we see Falko's back); device voices; nights so dark that people are silhouettes, no light sources
  (the flare is a dot in the sky, the police's blue floods the whole street); riders sit on the moped in the chair pose of the avatar;
  officers walk after you; the world does not react to you (villagers do not look, comment, film; the police radio does not describe you).
- GTA 6 as the yardstick (previews Aug.–Nov. 2026, gtabase.com recap): a HUD that can disappear; police not as radar dots, a „what they
  know“ display (face, outfit, vehicle) built from sightings; witnesses film, social media livestreams of events one can go to; NPCs react
  to being stared at, comment on your outfit, dialogue choices Greet / Taunt / Defuse / Provoke; random events.

## Ownership in round 2 (edit only your files; read everything)

| Agent | Branch / worktree / port | Files (in `viz3/src/grenzland/` unless said) |
|---|---|---|
| Lead | `feat/grenzland` | `gl_hud.js`, `gl_karte.js`, `gl_modus.js`, `gl_state.js`, `gl_data.js`, `gl_ton.js`; package A |
| `kino` | `feat/grenzland-kino`, `/home/claude/wt-g2-kino`, 9012 | `gl_mission.js`, `gl_kapitel1.js`, `gl_mission_data.js`, `gl_lager.js`, new `gl_kamera.js`, new `gl_score.js` |
| `stimmen` | `feat/grenzland-stimmen`, `/home/claude/wt-g2-stimmen`, 9013 | new `gl_stimmen.js`; `tools/voices/grenzland_*.py`; new `.github/workflows/stimmen_grenzland.yml`; `viz3/extra/grenzland-stimmen/**` |
| `licht` | `feat/grenzland-licht`, `/home/claude/wt-g2-licht`, 9014 | new `gl_licht.js`; `gl_auto.js`, `gl_modelle.js`, `gl_cockpit.js` (+ `gl_karosse.js`, `gl_typen.js`, `gl_zweirad.js` if you need them); `gl_1989_welt.js` |
| `figuren` | `feat/grenzland-figuren`, `/home/claude/wt-g2-figuren`, 9015 | `gl_fig.js`, new `gl_pose.js` |
| `welt` | `feat/grenzland-welt`, `/home/claude/wt-g2-welt`, 9016 | `gl_fahndung.js`, `gl_logik.js`, `gl_heli.js`, `gl_handy.js`, new `gl_reaktion.js`, new `gl_reaktion_data.js`, new `gl_ereignis.js` |

Nobody edits (ask the lead through your report if you must): `gl_radio*.js`, `gl_1989.js`, `gl_1989_data.js`, `gl_orte.js`, `gl_wagen.js`,
`gl_kegeln.js`, `gl_angeln.js`, `gl_neben*.js`, and **every file outside `viz3/src/grenzland/`** except your own tests
(`viz3/test/grenzland_<thema>*.py`, `viz3/test/unit/grenzland_<thema>*.test.mjs`), your `viz3/extra/grenzland-<thema>/**`, your feature doc
`docs/features/grenzland-<thema>.md` and, for a new module, **one line in `viz3/src/modules.txt` inside the `# feat/grenzland` block** (place it
after the modules it imports; the lead merges the block). Shared game modules (`game/`, `world/`, `vehicles/`, `audio/`, `tiere/`, …) are
read-only: hook in from outside (events, public APIs, CSS from your module, per-frame overrides after the game's own update).

## Interfaces between you (build yours early, guard calls to the others: `window.X && X.f ? … : fallback`)

- **Lead (A, by ~12:30 on `feat/grenzland`):** `GLHUD.titel(name, unter, sec)` – big GTA-style mission title card · `GLHUD.kino(on)` – black
  bars top and bottom, HUD hidden, `body[data-gl-kino="1"]` · `GLHUD.sub` shows **one** line at a time (a queue; police and talk lines no
  longer overlap) · the radar shows a police car only if `GLFAHNDUNG.stand().cars[i].gesehen` (when the field is missing: always) · the
  wanted panel shows icons from `GLFAHNDUNG.stand().wissen = { gesicht, kleidung, fahrzeug }` (booleans) · base-game UI hidden in the mode.
- **Voices – how a line is spoken, for everyone:** `STIMME.say('gl_' + who, text, { at: [x, y] })` as today. It already plays a **recording**
  when `window.VOICEX.lines` has one with exactly these words (`viz3/src/audio/stimme.js`, `recorded()`; the Promise ends when the line is
  done), else the device voice. So: keep every spoken text a fixed string (a dynamic sentence = fixed fragments said one after another),
  and every module with spoken lines offers `X.linien()` → `[[who, text], …]` so that `stimmen` can collect and record them.
- **kino:** paces a talk line by its recording when one plays (await the Promise), else by `GLMLOGIK.dauer(text)`; emits
  `KERN.emit('grenzland:flare', { x, y, z })` when the flare goes up in mission 4; sets `F.lampe = true` on figures that carry a torch
  (guards at night, the Volkspolizei at dusk); `GLSCORE.stich('start' | 'bestanden' | 'gescheitert')`, `GLSCORE.lage(name)`; before the
  chapter end card it awaits `GLHUD.ruhig()` (lead: resolves when no title / passed / fade card shows).
- **stimmen:** recordings in the format of `viz3/extra/saetze` (`{ who: 'gl_<who>', id, text, file, dur }`) in your extra's manifest as a list
  `vx_add` – you add the few lines to `viz3/build.py` that append `vx_add` to `M['vx']['lines']` (next to `vm_replace`; lists in extra
  manifests replace each other otherwise) – the one edit outside your area. Ducking (radio and score lower while a line plays).
- **licht:** renders lights for any `GLFIG` figure with `F.lampe`, the flare on `grenzland:flare`, headlights, beacons; listens to
  `grenzland:schritt` / `grenzland:mission` for mission moods (rain in the Klinge night).
- **figuren:** `GLFIG.sitz(F, x, y, hd, z)`, `GLFIG.geste(F, art)`, riding pose for the player and for riders (`F.reitet`), a run for officers
  (`GLFIG.go(F, x, y, { renn: true })`); kino and welt call these.
- **welt:** `GLFAHNDUNG.stand()` gains `wissen` and `cars[i].gesehen`; the police radio describes the player in fixed fragments
  (`'gl_funk'`); reaction lines in `gl_reaktion_data.js`; `GLREAKTION.linien()`, `GLFAHNDUNG.linien()`, `GLEREIGNIS.linien()`.

## How to work (same as the night, see `grenzland-gemeinsam.md` for details)

- Worktree and branch are ready (from `src` 17001edd, with `viz3/dist` and linked `node_modules`). Build `python3 viz3/build.py --fast`,
  check `bash tools/check.sh` (must pass before every push), unit tests without a browser wherever logic can be pure.
- **The game is integrated now:** the scene `?szenario=grenzland` starts mission 1 in Schleusingen. For a test of free play, right after boot:
  `for _ in range(6): steps(0.3); time.sleep(0.3)` then
  `E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true); })()")`.
  A single mission: `GLMISSION.debug.go(id, step)` (see `viz3/test/grenzland_mission.py`). Compare counts against a baseline, not zero.
- **Browser:** one at a time through `bash tools/browser_lock.sh python3 viz3/test/run.py --port <yours> --serve <test>`; the chat machine's
  Chrome is killed at ~3.7 GB – keep a local run to one area (Schleusingen and Ratscher in one page is too much); do not rebuild `viz3/dist`
  while your run is queued or running.
- **GitHub Actions as the second test bench:** a push without `[skip ci]` runs smoke and your `viz3/extra/grenzland-<thema>/tests.txt` (one
  `name[:args]` per line, each a job). Wrap your test's checks with `viz3/test/grenzland_ci.py` (`ck = grenzland_ci.wrap(lib.Checks('x'), 'x')`):
  failures become public annotations; read them with `curl -s "https://api.github.com/repos/mynametouse/pavillon-ratscher/actions/runs?branch=feat/grenzland-<thema>&per_page=1"`
  → `jobs_url` → each job's `check_run_url` + `/annotations`. At most one such push per ~30 min; all others with `[skip ci]` in the first line.
- **Hard rules learned:** `Object.assign(S, { fn })` must not overwrite state fields of the same name · no code after `//` on the same line ·
  ≤ 16 textures per shader · **no new point lights or spot lights** in the scene (borrow one: `KERN.lights.borrow`; else emissive/additive
  sprites and ground decals) · reuse materials (`VFIG.mat()`, clones keep the program) – no new shader programs without need, count them in
  your test · nothing runs before the scene starts, everything is gone after „Beenden“ · phone memory: `viz3/test/grenzland_speicher.py`
  (now +33 MB textures for the mode; stay well below +150 MB).
- Commit identity `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit …`; every message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01L6Yrpf75YEUJPnMQdXevjQ`.
  Push `git -c push.negotiate=true push -u origin feat/grenzland-<thema>`; never to `src`, `live`, `feat/grenzland`.
- **Timetable (by `date` on the machine – it shows Berlin time):** the lead merges at **14:00** and **15:45**; what is pushed, passes
  `tools/check.sh` and has its test green (here or on Actions) goes in. Push small increments; a solid half beats a shaky whole.
- Falko sleeps: do not ask him; decide, write decisions into `docs/features/grenzland-<thema>.md` (German, for humans) with a section
  „Für den Lead“. Look at your own pictures – presentation is the point of this round. Do not spawn agents.
- Finish with a report: branch and last commit, what works and how it was tested (with picture paths), what is open, wishes for the lead.
