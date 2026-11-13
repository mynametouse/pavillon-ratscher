# Auftrag `stimmen` – Grenzland Runde 2: real voices for chapter 1 (13.11.2026)

Read `grenzland2-gemeinsam.md` first (same folder). Worktree `/home/claude/wt-g2-stimmen`, branch `feat/grenzland-stimmen`, port 9013.
Your files: new `viz3/src/grenzland/gl_stimmen.js`, `tools/voices/grenzland_*`, new `.github/workflows/stimmen_grenzland.yml`,
`viz3/extra/grenzland-stimmen/**`, `viz3/test/grenzland_stimmen*.py`, `docs/features/grenzland-stimmen.md`, and the few lines for `vx_add` in
`viz3/build.py` (described below; nothing else outside).

## Why

Every talk of the mode is spoken by the device's voice (or not at all on iPhone) – the single biggest gap to GTA after the camera. The
village already has natural voices: `tools/voices/record_lines.py` records fixed lines with Microsoft Edge neural voices (edge-tts, used in
this project since 25.10.2026) **on GitHub Actions** (`.github/workflows/stimmen.yml`; the chat machine cannot reach that speech service),
into the feature extra `viz3/extra/saetze` → `window.VOICEX.lines` → `STIMME.say(who, text)` plays the recording when one has these words
(`viz3/src/audio/stimme.js`, `recorded()`). Do the same for Grenzland.

## What to build

1. **Collect the lines** – `tools/voices/grenzland_linien.mjs` (like `tools/voices/linien.mjs`) or a headless browser dump, whichever is
   robust: every spoken line of the mode as `{ who: 'gl_<cast key>', id, text }` with a stable id from who + text (style of
   `x_gerhard_1gxnwae`) into `tools/voices/grenzland_linien.json`. Sources: the mission talks (`GLMDATA.R` and single lines in
   `gl_mission_data.js` / `gl_kapitel1.js`), everything the mission runner and the modules pass to `STIMME.say('gl_…', …)` (grep for it),
   1989 (`gl_1989_data.js`), the police radio (`gl_fahndung.js`), radio host lines if they go through `STIMME`, side missions. New lines
   from `welt` (`GLREAKTION.linien()`, `GLFAHNDUNG.linien()`, `GLEREIGNIS.linien()`) and `kino` arrive at the merges – make the collector
   pick up any module's `linien()` so a re-run after a merge covers them. Lines with variable parts are not recordable: list them in your
   doc for the owners.
2. **Casting** (`GLDATA.CAST` in `gl_data.js`: Falko, Sarah, the stranger, Jule, Timo, Gerhard, Dieter Krähwinkel, guard, Yuki, Maik, Ines,
   the officers, the 1989 people, …): one Edge voice per person with rate and pitch for age and character, distinct from each other; on
   Actions edge-tts offers de-DE Conrad, Florian(Multilingual), Killian, Katja, Amala, Seraphina(Multilingual), de-AT Jonas, Ingrid, de-CH Jan,
   Leni, and the multilingual en-US voices speak German (see `record_lines.py`: the villagers use them). If a Grenzland person is a villager
   who already has a recorded voice (Gerhard?), keep that voice; Gerhard in 1989 (35) the same voice, younger (rate up, pitch up a little).
   The police radio (`gl_funk`, Zentrale) gets a baked radio sound (band-pass ~300–3400 Hz, light drive, squelch click before and after).
   Falko and Sarah are real people (Sarah agreed 13.11. 10:44): natural, warm, not cartoonish.
3. **Record on Actions** – `tools/voices/grenzland_record.py` (edge-tts + ffmpeg like `record_lines.py`: mono, 24 kHz, MP3 ~40 kbit/s,
   loudness-normalised) and `.github/workflows/stimmen_grenzland.yml`: on a push to `feat/grenzland-stimmen` or `feat/grenzland` that changes
   `tools/voices/grenzland_linien.json` (or the record script / workflow), record what is new or changed, write
   `viz3/extra/grenzland-stimmen/dist/snd/voice/gl/<id>.mp3` and `viz3/extra/grenzland-stimmen/manifest.json`, commit back to the same branch
   (`[skip ci]` in that bot commit is fine – the tests run on your next push). Pull before you push again. Budget: all files together ≤ 6 MB,
   each < 5 MB (extras rule). Print a table (line, voice, seconds, loudness) into the job summary.
4. **`viz3/build.py`** – lists in extra manifests replace each other (`_merge`), so `vx.lines` of your extra would wipe the village's:
   add, right after the `vm_replace` loop, the few lines that append the list `vx_add` of an extra manifest to `M.setdefault('vx', {})
   .setdefault('lines', [])` (pop it like `vm_replace`, keep the order). Your manifest: `{ "vx": { "voices": { … } }, "vx_add": [ … ] }`.
5. **`gl_stimmen.js`** (small, runs only while the mode is on): prefetch the recordings of the next talks when a mission step starts (into
   the HTTP cache, a few at a time); ducking – while `STIMME` speaks lower the car radio and the score (`GLRADIO` / `GLSCORE.duck` public
   APIs if they exist; `gl_radio*.js` are nobody's this round – if there is no volume hook, report it); `GLSTIMMEN.fehlend()` → lines
   without a recording (for the test and for Falko).
6. If Actions cannot reach the Edge service: Piper works on the chat machine (`pip download piper-tts` and huggingface.co answer) – a
   fallback with a German Piper voice per person, same file layout. Edge first.

## Tests

`viz3/test/grenzland_stimmen.py`: after the build `VOICEX.lines` contains the Grenzland lines and the village's lines (count both against
the baseline), `STIMME.speaks('gl_<who>', text)` is true for ≥ 95 % of the collected lines, one line plays and its Promise ends within
dur + 1 s (headless audio may be muted – check the timing, not the sound), `GLSTIMMEN.fehlend()` lists the rest; no page errors. A unit test
for the id function and the collector (`viz3/test/unit/grenzland_stimmen.test.mjs`). Lines for CI in `viz3/extra/grenzland-stimmen/tests.txt`.

## For the lead (in `docs/features/grenzland-stimmen.md`)

The cast table (person → voice, rate, pitch), what is recorded, what is missing and why, how to re-record after a merge (push a changed
`grenzland_linien.json`), the size.
