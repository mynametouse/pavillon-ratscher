# Grenzland, Kapitel 2 Etappe 2 – gemeinsamer Teil der Aufträge (17.11.2026, ~22:45)

For the helper agents `zone` and `kapitel2` of the Grenzland chat (lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Code comments English, the UI
German. Read this part first, then your own brief `docs/plans/auftraege/grenzland5-<thema>.md`.

## What Falko wants (verbatim)

- 17.11. 22:25: „Ist Kapitel 2 online?“ – the lead: no, only stage 1 (V18v); stage 2 (the border zone, missions 1–2, cracking cars) needs
  helper agents again. **22:26: „Ok dann weiter“.**
- The plan: `docs/plans/plan_kapitel2.md` (story, places, the six missions, Paket D, section 8 with all of Falko's additions). Stage 2 =
  the border zone with the Kolonnenweg and the bunker's outside, mission 1 „Grünes Band“, mission 2 „Ein Auto für die Nacht“, cracking and
  repainting cars. Winter (snow, ice) only as far as it is cheap (see the `kapitel2` brief); Eisfeld, Rottenbach and the bunker's inside are
  stage 4.
- Realism over quantity, always – the yardstick of `docs/plans/auftraege/realismus1-gemeinsam.md` („could it look like this in reality?“),
  smooth in the browser and on an iPhone. Hubert and Ronald are never culprits or targets; no real firms or logos; history with sources and
  respect (the border, 1989).
- **Credits are short** (Falko 21:30): work in small, complete increments and push each one (with `[skip ci]` unless it is your hourly CI
  push), so that nothing is lost if the session stops. A solid mission 1 beats two shaky ones.

## Where we stand

- Live: V18v (17.11. 21:39) – stage 1 of chapter 2 (village people by the clock, festivals, reputation `GLRUF`, side jobs `GLJOBS`, traffic
  with a purpose `GLLINIEN`, encounters), realistic shops (`INVENTAR`, `GELD`, `OEFFNUNG`), houses, facades (`FASSADE`), birds. Feature docs:
  `docs/features/grenzland*.md`, `gebaeude.md`, `laeden-leben.md`, `innen-real.md`.
- Other chats right now (read `docs/PARALLEL.md` on src before you start and before every push): the Suhl chat builds **Suhl 1989** for
  mission 3 (`SUHL.jahr1989(on)` – not yours) and region work; the chat session_01Mmpsvp11QsXpPSQRRbZ4Jv builds **the region in 3D**
  (`welt-orte`: the flat villages of the world tiles, `welt-wald`: forests) and Schleusingen by view. Do not touch their files; if the zone
  lies in their tiles, use what they build and say in PARALLEL (through your report) what you need.

## Ownership (edit only your files; read everything)

| Agent | Branch / worktree / port | Files (in `viz3/src/grenzland/` unless said) |
|---|---|---|
| Lead | `src` | `gl_modus.js`, `gl_state.js`, `gl_hud.js`, `gl_karte.js`, `gl_data.js`, `gl_radio*.js`, `gl_score.js`, `gl_stimmen.js`, `tools/voices/*` |
| `zone` | `feat/grenzland-zone`, `/home/claude/wt-grenzland-zone`, 9061 | new `gl_zone.js`, `gl_zone_data.js`; `viz3/extra/grenzland-zone/**`; `tools/grenzland/zone_*.py` |
| `kapitel2` | `feat/grenzland-kapitel2`, `/home/claude/wt-grenzland-kapitel2`, 9062 | new `gl_kapitel2.js`, `gl_kapitel2_data.js`, `gl_knacken.js`; marked hooks (`// grenzland-kapitel2`) in `gl_mission.js` and `gl_mission_data.js` where the runner must know chapter 2 |

Besides: one tick and one stop line each in `gl_modus.js` (marked), one line per new module in `viz3/src/modules.txt` (the `# feat/grenzland`
block), your tests (`viz3/test/grenzland_<thema>*.py`, `viz3/test/unit/grenzland_<thema>*.test.mjs`), your extra with `tests.txt`, your
feature doc `docs/features/grenzland-<thema>.md` (German, with „Für den Lead“). Nothing else.

## Interfaces (build yours early; guard calls: `window.X && X.f ? … : fallback`)

- **`zone`:** `GLZONE.da()` → loaded and drawn · `GLZONE.ort(name)` → `{ x, y, z, name }` for `'kolonnenweg_a'`, `'kolonnenweg_b'`,
  `'bunker'`, `'museum'`, `'heide'`, `'parkplatz'` · `GLZONE.weg()` → the Kolonnenweg as a line (for routes and the chase) ·
  `GLZONE.anfahrt()` → how one gets there from Schleusingen (a road line for the radar's route) · `KERN.emit('grenzland:zone', { an })`.
- **`kapitel2`:** registers missions `k2m1`, `k2m2` with the runner; `GLKNACKEN` (crack a car, repaint, swap plates) for later missions;
  uses `GLZONE` (until it is there: a stand-in in tests), `GLRUF`, `GLFESTE` (the Christmas market as cover), `GLLINIEN`, `GLSCORE`
  (`lage`, `stich`), `GLKAMERA` for the talks, `GLHUD.titel` for the title cards.
- Voices: fixed strings, `X.linien()` – collected by the lead.

## How to work

As in `docs/plans/auftraege/grenzland4-gemeinsam.md` („How to work“, „Hard rules learned“): worktree ready (`bash tools/agents.sh worktree …`),
`python3 viz3/build.py --fast`, `bash tools/check.sh` before every push, browser only through
`bash tools/browser_lock.sh python3 viz3/test/run.py --port <yours> --serve <test>`, at most one CI push per hour (the rest `[skip ci]`),
commit identity and the two trailer lines, push only your branch. The mode in a test: `?szenario=grenzland` and the free-play snippet of
`grenzland2-gemeinsam.md`; the sound repository through the test server: `window.GLTON_BASE = location.origin + '/pavillon-ton/'`.
Do not ask Falko; decide and document. Do not spawn agents. Report when done (branch, last commit, what works and how tested, pictures,
what is open, what the lead must do); the lead merges when you report.
