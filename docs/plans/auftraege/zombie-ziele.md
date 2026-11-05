# Auftrag `zombie-ziele` – Ziele mit Wegweiser und ein Ende (Zombie-Nacht)

Gestartet am 5.11.2026 ~18:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv (baut mit Falko die Zombie-Nacht auf `feat/zombie`) als Hilfs-Agent,
Branch `feat/zombie-ziele` (von `feat/zombie` 79a8b3f2), Worktree `/home/claude/wt-zombie-ziele`, Port 8998. Hier steht der Auftrag wörtlich
(englisch, so wie der Agent ihn bekam), damit ein neuer Chat ihn nach einem Absturz wieder starten kann – Anleitung: `docs/WORKFLOW.md`,
Abschnitt „Wiederanlauf“. Was schon fertig ist: `docs/features/zombie-ziele.md` und `git log origin/feat/zombie-ziele`.

---

You are a helper agent of the chat (your lead) that builds, together with Falko, the "zombie night" of his browser 3D model/game "Pavillon
Ratscher" (three.js r169, ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringian Forest), the real
village around it, neighbours, villagers. Today (Thu 5.11.2026, ~18:20 CET) you work alone on ONE topic, in increments. The lead merges your
branch, tests and publishes. Do not publish yourself.

## The zombie night (context)
Live since this morning: `?szenario=zombie` – a day to prepare (the game clock starts on 31 October in the afternoon), at dusk the siren on
the old school, villagers turn into zombies and hunt the player; dawn sends them into the houses; the nights repeat (`Z.night`, numbers per
night in `ZDATA.night(n)`). Weapons to find (Hubert's double-barrelled shotgun on his table, spade, axe, chainsaw …), all 230 houses
enterable with Thuringian interiors, searching containers for supplies, barricading doors and windows, allies (Hubert, Ronald, survivors),
two players over the internet. Read `docs/features/zombie.md`, `docs/plans/plan_zombie.md` (Falko's wishes verbatim) and the headers of the
`viz3/src/zombie/z_*.js` files.

Falko chose today (5.11., 17:57), among other things: **„Ziele mit Wegweiser“** – offered to him as „Aufgaben für Tag und Nacht (Flinte
holen, Haus vernageln, Ronald Essen bringen) mit Pfeil und Entfernung“ – and **„Steigende Nächte mit Ende“** – „Jede Nacht härter; in der
3. Nacht Evakuierung (Bus an der alten Schule) – wer ihn erreicht, hat gewonnen.“ Earlier today he could not find the shotgun at Hubert's –
the game must lead the player. Your topic: the objectives with way markers, and the ending. (The lead does how hard each night is, zombie
kinds, difficulty, stealth, the zombies in houses; helper `zombie-werk` does crafting at the workbench – its events may come later, treat
them as optional.)

## Your topic
1. **Objectives as a chain through the days and nights** (German, short, the player is „du“), built on the game's own task system:
   `TASKS.define` in `core/tasks.js` (steps on events or checks, `target: () => [x, y]` – the task card `game/quests.js` then shows arrow and
   distance; read `docs/ARCHITECTURE.md` „Dienste für Erweiterungen“, `test/unit/tasks.test.mjs`). The zombie mode already defines one task
   `zombie-1` in `zombie/z_modus.js` – move it into your module and replace it (a minimal edit there, marked). A sketch – make it a good
   game, not a checklist:
   - Day 1: „Hol Huberts Doppelflinte“ (target: the gun on `HOF.table`, `ZWAFFE.things.flinte`), „Such Vorräte: zwei Konserven und Wasser“
     (target: the nearest house not yet searched – `ZHAUS`/`ZINNEN` know the houses and searched containers in `Z.houses`), „Vernagle die
     Fenster eines Hauses“ (`zombie:barricade`), „Frag Hubert, ob er mitkommt“ (`zombie/z_bund.js`, his topic `q_zhilf`), then „Halte durch,
     bis die Sirene heult“.
   - Night 1: „Überlebe bis zum Morgengrauen“ with the time left; a hint where to go (a barricaded house, the allies).
   - Day 2: „Bring Ronald etwas zu essen“ (he wants food before he helps), „Hol Benzin für die Motorsäge“, more supplies; Night 2.
   - Day 3: the radio (houses have one – `zombie/z_haus.js` „Radio einschalten“; and a message on screen) announces the evacuation: „Um 4 Uhr
     hält ein Bus an der alten Schule. Wer mit will, muss da sein.“ Night 3: get to the old school by 4:00 (`dorf/` knows the school; the
     Anger), hold out until the bus comes.
   - Every step has a target where it makes sense, so the task card points the way; the targets follow what is real (a house already
     searched is not a target again). Text in the HUD only through the existing paths (`ZHUD.say`, `PLAY.think`, the task card/journal).
2. **A marker in the world** for the active step's target when it is near enough to matter (≤ ~150 m): a slim, readable marker over the
   target (e.g. a soft light-yellow ring/diamond with a pulsing dot, drawn on top, small at distance) – cheap: one sprite or a few lines,
   no new shader programs (count `GAME.R.info.programs.length` before/after in your test). At night it must be readable but not glaring;
   not shown in third-person photo modes if the game has a „Sicht“ toggle (the eye button hides the HUD – follow it).
3. **The ending (night 3, the number in your data):** at 4:00 a bus comes along the road to the old school (a generic coach or a
   Bundeswehr-like truck without any brand, simple true-size model, plain materials, lights on, horn), stops for ~90 s; the zombies of the
   night converge on the school in a last wave (ask the horde through its API – `ZHORDE` – keep your change in `z_horde.js` to an exported
   helper or two, marked). The player boards it (action „Einsteigen“) → fade, a short ending screen in German: survived nights, zombies
   killed, allies saved (those near the bus come along), deaths; buttons „Weiterspielen“ (endless: the nights go on) and „Neu beginnen“. If
   the player misses it: the bus leaves, a thought („Weg. Dann eben allein.“), the nights go on. Two players: the host decides, both board
   (`zombie/z_netz.js` – keep it to events if it is cheap; else list it).
4. **Saving:** the chain's state through `TASKS` (it saves itself) and, if you need more, inside `Z` (saved as `pav-zombie-v1`, read
   `zombie/z_state.js`) or with `SAVE` (`core/save.js`, a check and a default – `savefuzz` throws nonsense at every saved value). A reload
   in the middle of night 2 must continue the chain correctly.

## Where you work
- Worktree `/home/claude/wt-zombie-ziele`, branch `feat/zombie-ziele` (from `feat/zombie`), own `viz3/dist` (node_modules linked). Remote
  origin (GitHub mynametouse/pavillon-ratscher; `gh` authenticated).
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, KERN, SAVE, TASKS), `docs/PARALLEL.md` (rules),
  `docs/features/zombie.md`, then `core/tasks.js`, `game/quests.js`, `zombie/z_state.js`, `z_modus.js`, `z_data.js`, `z_hud.js`, `z_haus.js`,
  `z_bund.js`, `z_horde.js` (API at its end).
- Your files: new `viz3/src/zombie/z_ziele*.js` (listed in `viz3/src/modules.txt` right after the last `zombie/z_` line of the `# feat/zombie`
  block – you may edit only those lines), `viz3/extra/zombie-ziele/**`, `viz3/test/zombie_ziele*.py`, `docs/features/zombie-ziele.md`.
  Shared files only where you must (`z_modus.js` to move the task out, a helper in `z_horde.js` for the last wave, `z_hud.js` for the ending
  screen if it cannot be your own element): minimal, each spot marked `// feat/zombie-ziele`, listed in your report – the lead edits
  `z_horde.js`, `z_haus.js`, `z_data.js`, `z_modus.js` at the same time.
- Code: ES modules, imports only from modules above in modules.txt (`tools/check/deps.mjs`; later ones via `LATE`), no assignments to other
  modules' window names. Comments English, UI German. Prettier (`cd viz3 && ../tools/check/node_modules/.bin/prettier --write <files>`).
  `bash tools/check.sh` must pass before every push (it builds; it flags code after a `//` comment on the same line – never do that).

## Testing – IMPORTANT rules
- Never two browsers on this machine: ALWAYS through the lock and YOUR port 8998, e.g. `bash tools/browser_lock.sh python3 viz3/test/run.py
  --port 8998 --serve zombie_ziele`. Keep each hold short (≤ ~10 min; batch pictures). The lead and another helper use the same lock.
  Long runs on CI: every push to `feat/zombie-ziele` runs `.github/workflows/feat.yml` (quick checks, smoke, the tests in your
  `viz3/extra/zombie-ziele/tests.txt`), pictures as artifact `out` (`gh run download <id> -n out -D <scratch>`).
- Write `viz3/test/zombie_ziele.py` (patterns: `viz3/test/zombie_kampf.py`, `zombie_haus.py`, `lib.py`): the chain starts with the mode,
  each day-1 step completes on its event and points at a real target (the task card's distance falls as the walker goes there), the marker
  appears and goes, the day-3 radio, night 3 at 4:00 the bus comes (jump the clock), boarding ends with the screen, „Weiterspielen“ goes
  on, a missed bus leaves, a reload keeps the chain, no new shader programs, no page errors. Look at your pictures with the Read tool.
- Memory is shared (7 GB): keep processes small.

## Deliver
- Commit often (English messages), each ending with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv
- Push to `origin feat/zombie-ziele` only (never src, live, gh-pages, feat/zombie or other branches; no force push). Need the lead's newer
  state: `git fetch origin && git merge origin/feat/zombie` (merge, never rebase).
- **First usable increment within ~2 h** (by ~20:30 CET): the day-1 chain with targets and the marker, pushed and green on CI. Then the
  nights, the radio, the bus and the ending, polish.
- Keep `docs/features/zombie-ziele.md` (German, short): what exists, how to use it, how to test, „Für den Lead“ (shared-file edits). Do not
  edit shared docs (PARALLEL, CHANGELOG, ARCHITECTURE, UEBERGABE).
- Finish by about 23:00 CET with a final report: what is done (picture paths), what is not, the shared-file edits, last commit hash, CI result.
