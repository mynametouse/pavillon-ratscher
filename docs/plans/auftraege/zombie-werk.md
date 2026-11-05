# Auftrag `zombie-werk` – Basteln und Reparieren in der Zombie-Nacht

Gestartet am 5.11.2026 ~18:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv (baut mit Falko die Zombie-Nacht auf `feat/zombie`) als Hilfs-Agent,
Branch `feat/zombie-werk` (von `feat/zombie` 79a8b3f2), Worktree `/home/claude/wt-zombie-werk`, Port 8997. Hier steht der Auftrag wörtlich
(englisch, so wie der Agent ihn bekam), damit ein neuer Chat ihn nach einem Absturz wieder starten kann – Anleitung: `docs/WORKFLOW.md`,
Abschnitt „Wiederanlauf“. Was schon fertig ist: `docs/features/zombie-werk.md` und `git log origin/feat/zombie-werk`.

---

You are a helper agent of the chat (your lead) that builds, together with Falko, the "zombie night" of his browser 3D model/game "Pavillon
Ratscher" (three.js r169, ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringian Forest), the real
village around it, neighbours, villagers. Today (Thu 5.11.2026, ~18:20 CET) you work alone on ONE topic, in increments. The lead merges your
branch, tests and publishes. Do not publish yourself.

## The zombie night (context)
Live since this morning: `?szenario=zombie` – a day to prepare, at dusk the siren on the old school, villagers turn into zombies; weapons
(spade, hatchet, axe, fork, crowbar, chainsaw, scythe, Hubert's double-barrelled shotgun), first-person arms and hands of the player's own
figure (`zombie/z_fp.js`), all 230 houses enterable with Thuringian interiors (`zombie/z_innen*.js`), searching containers for supplies,
barricading doors and windows (`zombie/z_haus.js`), allies (`zombie/z_bund.js`), two players over the internet (`zombie/z_netz.js`). Read
`docs/features/zombie.md`, `docs/plans/plan_zombie.md` (Falko's wishes verbatim) and the headers of the `viz3/src/zombie/z_*.js` files.

Falko chose today (5.11., 17:57), among other things: **„Basteln und Reparieren“** – as offered to him: „In der Werkstatt: Nagelbrett aus
Brett und Nägeln, Molotow aus Benzin, Axt schärfen, abgenutzte Waffen flicken.“ That is your topic. (The lead does the zombies in houses,
stealth, zombie kinds, difficulty; another helper `zombie-ziele` does objectives with way markers and the ending.)

## Your topic
1. **A workbench to craft at.** In Falko's garden workshop (the open shed of today, `KERN.spot('werkstatt')`, look at `garden/` and
   `werk/` for its bench) and at every workbench the house interiors have (cellar `Werkbank` in `zombie/z_innen_mob.js` / the house's
   containers and spots – find how to reach them through `ZHAUS.H`). Action (`KERN.act`, German label „An der Werkbank basteln“) opens a small
   German panel (own DOM element, same look as `#zhud` in `zombie/z_hud.js`, usable with mouse, keys and touch, closes with Esc/✕): the
   recipes, what each needs from the backpack (`Z.sup`, item ids in `ZDATA.ITEMS`: brett, nagel, benzin, flasche, lappen, schnaps …), what
   you have, „Bauen“. Building takes game time (10–30 game minutes, `CLOCK.t`), plays a fitting sound (sawing/hammering – `zombie/z_ton.js`
   and the game's own sounds; real recordings with a free licence are welcome, credits like `viz3/extra/zombie/dist/zombie/kampf/CREDITS_TON.md`).
2. **Recipes** (balance them; numbers in your module's data):
   - **Nagelbrett** (2 Bretter + 1 Hand voll Nägel): a new melee weapon `nagelbrett` – a board with nails, blunt with tearing, quick, wears
     fast. A model in true size (`zombie/z_waffe_mod.js` shows how: plain materials only, no new shaders), held in first person (poses
     like `ZFP.POSE`), lying in the world like the other weapons (`ZWAFFE.thing`).
   - **Molotow** (1 leere Flasche + 1 Liter Benzin + 1 Lappen): a supply item, thrown with a key (suggest `F`; a touch button too). In first
     person the hand with the bottle, the lit rag, the throw (the clip system of `z_fp.js` – read it). The bottle flies on an arc, shatters
     (sound), a fire of ~3 m burns ~8 s: zombies inside take damage over time (`ZHORDE.damage(e, dmg, { kind: 'fire', … })`), catch fire,
     stagger and burn (a flame on the figure), the fire lights the night (borrow a light with `KERN.lights.borrow` – NEVER a new light, it
     recompiles every shader), it is loud (`Z.noise`/the noises the horde hears). The player standing in it gets hurt too.
   - **Reparieren**: worn weapons back to full condition (`Z.weap[id].cond`, 0 = broken, see `ZWAFFE`): wood and handles with Bretter/Nägel,
     the chainsaw needs something else (Kette spannen: nothing but time?) – decide sensibly.
   - **Schärfen** (axe, hatchet, scythe, spade): +30 % damage for the next ~25 hits, a whetstone sound.
   - Ideas if time: Stachelbrett for a window (a barricade that hurts), Rohrbombe NO (no explosives).
3. **Show it:** the weapon's condition in the panel (`zombie/z_hud.js`, where the weapon and its keys are listed – a minimal edit), a short
   thought when a weapon is nearly worn out. All texts German, short, the player is „du“.
4. **Two players** (`zombie/z_netz.js`): a molotov's fire should appear for the other player too if it is cheap (an event over the room);
   otherwise list it as open.
5. **Cheap and robust:** nothing built at load time (lazy on first use), no new shader programs (count `GAME.R.info.programs.length`
   before/after in your test), fire sprites shared and few, everything disposed. Saving: anything persistent goes into `Z` (it is saved as
   `pav-zombie-v1`; read `zombie/z_state.js`) or through `SAVE` (`core/save.js`) with a check and a default – the test `savefuzz` throws
   nonsense at every saved value.

## Where you work
- Worktree `/home/claude/wt-zombie-werk`, branch `feat/zombie-werk` (from `feat/zombie`), own `viz3/dist` (node_modules linked). Remote
  origin (GitHub mynametouse/pavillon-ratscher; `gh` authenticated).
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, KERN, SAVE), `docs/PARALLEL.md` (rules),
  `docs/features/zombie.md`, then `zombie/z_state.js`, `z_data.js`, `z_waffe.js`, `z_waffe_mod.js`, `z_fp.js`, `z_hud.js`, `z_horde.js`
  (damage, noises), `z_fx.js`, `z_ton.js`.
- Your files: new `viz3/src/zombie/z_werk*.js` (listed in `viz3/src/modules.txt` right after the last `zombie/z_` line of the
  `# feat/zombie` block – you may edit only those lines), `viz3/extra/zombie-werk/**`, `viz3/test/zombie_werk*.py`,
  `docs/features/zombie-werk.md`. Register into the shared objects from your own module at load (`Object.assign(ZDATA.ITEMS, …)`,
  `ZDATA.WEAPONS.nagelbrett = …`, `ZWMOD.MODELS…`, `ZFP.POSE.nagelbrett = …`) instead of editing their files where you can. If you must change
  a shared file (`z_waffe.js` for the throw key, `z_hud.js` for the condition, `z_fp.js` for a throw clip), keep it minimal, mark each spot
  with a comment `// feat/zombie-werk` and list it in your report – the lead edits `z_horde.js`, `z_haus.js`, `z_data.js`, `z_modus.js` at the
  same time, so stay out of those or keep it to a line.
- Code: ES modules, imports only from modules above in modules.txt (`tools/check/deps.mjs`; later ones via `LATE`), no assignments to other
  modules' window names. Comments English, UI German. Prettier (`cd viz3 && ../tools/check/node_modules/.bin/prettier --write <files>`).
  `bash tools/check.sh` must pass before every push (it builds; it flags code after a `//` comment on the same line – never do that).

## Testing – IMPORTANT rules
- Never two browsers on this machine: ALWAYS through the lock and YOUR port 8997, e.g. `bash tools/browser_lock.sh python3 viz3/test/run.py
  --port 8997 --serve zombie_werk` (or your test script directly through the lock with a server on 8997: see `viz3/test/run.py` – it starts
  `tools/csp/cspserve.py <port> viz3/dist`). Keep each hold short (≤ ~10 min; batch pictures into one run). The lead uses the same lock.
  Long runs on CI: every push to `feat/zombie-werk` runs `.github/workflows/feat.yml` (quick checks, smoke, the tests in your
  `viz3/extra/zombie-werk/tests.txt`), pictures as artifact `out` (`gh run list --branch feat/zombie-werk`, `gh run download <id> -n out -D
  <scratch>`).
- Write `viz3/test/zombie_werk.py` (patterns: `viz3/test/zombie_kampf.py`, `zombie_haus.py`, `lib.py`): the workbench action and panel,
  each recipe (supplies taken, the result in the backpack/hand, game time passed), the nail board in first person (picture) and a hit with
  it, a molotov thrown at two held zombies (`ZHORDE.ent`, `e.hold`): fire, damage over time, a burning zombie dies, the light borrowed and
  given back, no new shader programs, repair and sharpening change the numbers, saved state survives a reload, no page errors. Look at your
  pictures with the Read tool and improve what looks wrong.
- Memory is shared (7 GB): keep processes small.

## Deliver
- Commit often (English messages), each ending with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv
- Push to `origin feat/zombie-werk` only (never src, live, gh-pages, feat/zombie or other branches; no force push). Need the lead's newer
  state: `git fetch origin && git merge origin/feat/zombie` (merge, never rebase).
- **First usable increment within ~2 h** (by ~20:30 CET): workbench panel, nail board (model, first person, hits), repair – pushed and green
  on CI. Then the molotov with fire, sharpening, polish.
- Keep `docs/features/zombie-werk.md` (German, short): what exists, how to use it, how to test, „Für den Lead“ (shared-file edits). Do not
  edit shared docs (PARALLEL, CHANGELOG, ARCHITECTURE, UEBERGABE).
- Finish by about 23:00 CET with a final report: what is done (picture paths), what is not, the shared-file edits, last commit hash, CI result.
