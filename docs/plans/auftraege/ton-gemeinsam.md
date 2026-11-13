# Ton, Runde 1 – gemeinsamer Teil der Aufträge (13.11.2026, ~23:30)

For the helper agents `ton-musik`, `ton-radio`, `ton-stimmen`, `ton-welt`, `ton-motoren` of the Grenzland chat (lead:
session_01L6Yrpf75YEUJPnMQdXevjQ). Code comments English, the UI German. Read this first, then your own brief `ton-<thema>.md`, then
`docs/plans/auftraege/grenzland2-gemeinsam.md`, sections „Interfaces“ (voices: fixed strings, `X.linien()`) and „How to work“ (build,
checks, tests, browser lock, CI annotations, hard rules, commit identity) – they still hold. The concept for humans is the project document
`claude/pavillon-sound.md` (the lead keeps it); everything you need from it is in this file.

## What Falko wants (verbatim)

- **13.11. 23:02:** „Okay, überlege dir, wie du die Soundatmosphäre im Spiel noch wesentlich verbessern kannst, insbesondere was Sprachen,
  Stimmen und auch das Radio angeht. Das Radio klingt wirklich wie ein Kinderradio. Das müssen echte coole Songs sein. Und auch ansonsten
  versuch ein atmosphärisches Soundkonzept zu entwickeln und mach ihr Vorschläge zum Anklicken.“
- **~23:20, clicked:**
  - Radio songs: **„Freie Musik von Bands“** – real bands from free archives (CC0 / CC BY). He was offered own AI songs (ElevenLabs Music)
    and did **not** take them: **no AI music anywhere**.
  - Stations first: **all four** – Rock & Punk (Radio Zweitakt), Rap & Elektro (a new station „Funkloch FM“), Synthpop & New Wave (Neonfunk),
    Schlager & Kirmes (Kirmeswelle). The 1989 stations come with chapter 2; brass (Radio Blasius) and classical (Klassik am Kamm) later.
  - Voices: **all four** – an own voice per character (the same in the free AI talk), feeling and situation (whispering in hiding, out of
    breath on the run, shouting against the wind, laughing), the dialect of the area (south of the Rennsteig people speak Hennebergisch,
    East Franconian – a light colour for older locals; Falko decides by ear), people on the street (greetings, short remarks, walla at the
    Kirmes, the market, the pub).
  - World: **all four** – places and time of day, real engines (Simson, Trabant, Wartburg as two-strokes, Martinshorn with Doppler,
    helicopter), film music at missions, room sound (reverb in bunker and church, muffled in the car, the phone's sound, direction audible
    with headphones).

## What you replace (why it sounds like a children's radio)

- `gl_radio_musik.js`: all 51 radio pieces are synthesised in the browser (mono, 24 kHz, sine/saw/FM, drums from noise) – no voice, no real
  instrument. Only „Klassik am Kamm“ plays real public-domain records. **Keep the synth as the fallback** (offline, missing file).
- `gl_score.js`: the mission music is synthesised; `gl_ton.js`: siren, moped rattle, banger synthesised; `vehicles/vsound.js` (base game, not
  ours) synthesises car engines.
- Voices: Microsoft Edge voices recorded on Actions (`tools/voices/grenzland_record.py`, workflow `stimmen_grenzland.yml`), one per person,
  no feeling, no region; 937 lines, ~52,000 characters (`tools/voices/grenzland_linien.json`).
- Ambience: the base game's loops `amb_birds_day`, `amb_wind`, `amb_dusk`, `amb_stove` (`audio/audio.js`) plus the extras `tiere`, `wetter`.

## Hard rules for all sound (on top of the hard rules in `grenzland2-gemeinsam.md`)

1. **Licences:** only CC0, the Public Domain Mark and CC BY (3.0 or 4.0, any port). **Not:** NC, ND, SA, „free for personal use“, shop
   licences („royalty free“, Pixabay, Bensound, Uppbeat, YouTube Audio Library …), anything that forbids handing out the file (the site serves
   the files). Check the licence **on the source page of that very file** (not the artist's general page), keep the evidence in the manifest
   (the licence string found, the page URL, the date).
2. **Content:** no slurs, hate, extremist or Nazi references, no sexual explicitness, no glorified hard drugs; no lyric that mocks a real
   person or names a real firm prominently. Songs with vocals are transcribed in the pipeline (faster-whisper on Actions) – read the transcript
   before you propose a song. As always: Hubert and Ronald are never culprits or targets, no real firms, no logos.
3. **Attribution:** every CC BY file carries title, author, licence (with link) and source URL – shown in the game where the sound is named
   (radio display: „Titel – Interpret · CC BY 4.0“), in the credits (`credits_add` of your extra), and in `CREDITS.md` of the sound repository.
4. **AI sound** only for voices (ElevenLabs text to speech) and as a **gap filler** for effects and ambience where no free recording fits
   (ElevenLabs Sound Effects, once the key is there). **No AI music.**
5. **Size:** the site has 826 of 1,000 MB (the GitHub Pages limit; the preview `/vorschau/` doubles everything). **No music and no long loops
   in this repository** – they go to the sound repository (below). Voices stay where they are (`viz3/extra/grenzland-stimmen/`).
6. **Loudness:** music −16 LUFS integrated, true peak ≤ −1 dBTP; ambience beds −24 LUFS; point sources and effects peak −1 dBFS before the
   game's gain; voices as today (−17 LUFS).
7. **Formats:** MP3 (LAME; plays everywhere, Safari included): music 128 kbps stereo, ambience 96 kbps stereo, point sources 64–96 kbps mono.
   Loops must be seamless – check the seam (repeat three times, look for a click: sample jump and spectral flux at the joint).
8. **Nothing loads before it is needed:** a file is fetched when its station, zone or vehicle needs it; few decoded buffers in memory
   (phone!); songs stream through a media element, they are not decoded whole.
9. **Missing file or no connection:** everything falls back to what plays today (synth, Edge voice), with no error on screen.
10. **Nobody here can hear.** Measure what can be measured (loudness, peak, seam, spectrum, transcript, length) and leave the judgement to
    Falko: every new sound gets an entry for the **Hörprobe** (below), where he gives 👍 or 👎.

## The sound repository

- Falko is asked to create **`mynametouse/pavillon-ton`** (public, with GitHub Pages) – base URL `https://mynametouse.github.io/pavillon-ton/`,
  the same origin as the game, so WebAudio may process the files (no CORS trouble). The lead attaches it and tells you when it exists.
- **Until then:** manifests and the fetch pipeline live in this repository under `tools/ton/` (owner `ton-musik`); the workflow
  `ton-holen.yml` runs on Actions (fetch, check, measure, transcribe, encode) and keeps the audio as a **workflow artifact** – never on
  `gh-pages`. Small text results (measurements, transcripts, `index.json`) may be committed to `tools/ton/messung/`. For your browser tests,
  make a few short test files during the test (e.g. ffmpeg tones and noise into `out/ton/…`, never committed) and point the base URL there.
- **Layout** (proposal, `ton-musik` decides):

  ```
  musik/<sender>/<id>.mp3      radio songs            klang/<zone>/<id>.mp3   ambience beds, layers, point sources
  score/<id>.mp3               mission music          motor/<id>.mp3          engines, sirens, rotor
  index.json                   one list of everything: { id, kind, file, title, author, licence, licence_url, source, checked,
                               sec, lufs, peak, loop, sender | zone | fahrzeug, intro, outro, … }
  CREDITS.md                   human-readable credits
  ```

## Interfaces between you (build yours early; guard calls to the others: `window.X && X.f ? … : fallback`)

- **`GLMEDIEN`** (`ton-radio` owns, new `viz3/src/grenzland/gl_medien.js`), for every file from the sound repository:
  `BASE` (one constant; tests may set it), `index()` → Promise of `index.json` (cached), `eintrag(id)`, `url(id)`,
  `buffer(id)` → Promise<AudioBuffer> (decoded, LRU-cached – at most ~6 buffers / ~40 MB), `stream(id, dest)` → `{ el, node, stop() }`
  (a media element through `MediaElementSource` into a bus – for songs), `da()` → is the repository reachable (cached).
- **Buses:** `audio.raw()` → `{ ctx, sfx, amb, master, wet, vox, mus }` (`audio/audio.js`). Use these, so the volume sliders and „Ton aus“ hold.
- **`GLRAUM`** (`ton-welt` owns, new `gl_raum.js`): `GLRAUM.lage()` → `{ raum: 'frei' | 'auto' | 'innen' | 'bunker' | 'kirche' | 'tunnel',
  zone }`; `GLRAUM.quelle(node, { x, y, z })` → routes a point source through the room (HRTF panner, distance, occlusion, reverb send) and
  returns a handle with `pos(x, y, z)` and `ende()`; `GLRAUM.telefon(node)` → the phone band chain; `GLRAUM.lautsprecher(node, art)` with
  `art` 'auto' | 'handy' | 'koffer' for the radio. Without `GLRAUM`: connect straight to the bus as today.
- **Ducking:** `GLRADIO.duck(on)` and `GLSCORE.duck(on)` (keep or add); `GLSTIMMEN` raises `grenzland:stimme { an }` while a voice speaks.
- **Voices:** fixed strings, `X.linien()`; the collector `tools/voices/grenzland_linien.mjs` reads every module with `linien()`.
- **Hörprobe:** each agent writes `tools/ton/hoerprobe/<agent>.json` – `[{ id, titel, was, datei | url, quelle, lizenz, notiz }]` (`was`: what
  Falko should listen for). `ton-musik` builds one page from all lists (`tools/ton/hoerprobe/index.html`); the lead publishes it.

## Ownership (edit only your files; read everything)

| Agent | Branch / worktree / port | Files |
|---|---|---|
| `ton-musik` | `feat/ton-musik`, `/home/claude/wt-ton-musik`, 9031 | `tools/ton/**` (pipeline, `quellen/musik.json`, `quellen/score.json`, Hörprobe page), `.github/workflows/ton-holen.yml`, `docs/features/ton-musik.md` – no game code |
| `ton-radio` | `feat/ton-radio`, `/home/claude/wt-ton-radio`, 9032 | `gl_radio.js`, `gl_radio_data.js`, `gl_radio_musik.js`, `gl_score.js`, new `gl_medien.js`; `viz3/extra/grenzland-radio/**`; tests `viz3/test/grenzland_radio*`, `viz3/test/unit/grenzland_radio*`, new `viz3/test/ton_radio*`; `docs/features/grenzland-radio.md` |
| `ton-stimmen` | `feat/ton-stimmen`, `/home/claude/wt-ton-stimmen`, 9033 | `gl_stimmen.js`, `gl_reaktion.js`, `gl_reaktion_data.js` (handed over by the lead), new `gl_leute.js` (+ `gl_leute_data.js`), `tools/voices/grenzland_*`, `.github/workflows/stimmen_grenzland.yml`, `viz3/extra/grenzland-stimmen/**`, tests `viz3/test/grenzland_stimmen*`, new `viz3/test/grenzland_leute*`, `docs/features/grenzland-stimmen.md` |
| `ton-welt` | `feat/ton-welt`, `/home/claude/wt-ton-welt`, 9034 | new `gl_klang.js`, `gl_klang_data.js`, `gl_raum.js`; `tools/ton/quellen/klang.json`, `tools/ton/hoerprobe/ton-welt.json`; `viz3/extra/grenzland-klang/**`; tests `viz3/test/grenzland_klang*`; `docs/features/grenzland-klang.md` |
| `ton-motoren` | `feat/ton-motoren`, `/home/claude/wt-ton-motoren`, 9035 | `gl_ton.js` (siren, moped – handed over by the lead), new `gl_motor.js` (+ `gl_motor_data.js`); `tools/ton/quellen/motor.json`, `tools/ton/hoerprobe/ton-motoren.json`; `viz3/extra/grenzland-motor/**`; tests `viz3/test/grenzland_motor*`; `docs/features/grenzland-motor.md` |

All files in `viz3/src/grenzland/` unless a path is given. Shared game modules (`audio/`, `vehicles/`, `game/`, `world/`, `npc/`, `handy/`
…) and the other Grenzland modules are **read-only**: hook in from outside (events, public APIs, per-frame overrides after the game's own
update); if a small additive change in a shared file is unavoidable, write it as a patch proposal in your report („Für den Lead“). One line
per new module in `viz3/src/modules.txt` inside the `# feat/grenzland` block (after the modules it imports). `tools/ton/` belongs to
`ton-musik`; `ton-welt` and `ton-motoren` write only their own manifest and Hörprobe files there.

## ElevenLabs

- Falko is asked to add the secret **`ELEVENLABS_API_KEY`** (this repository and `pavillon-ton`). Until it is there, every ElevenLabs step is
  prepared and **skips with a notice** („ELEVENLABS_API_KEY fehlt – übersprungen“).
- **Budgets** until the lead raises them: `ton-stimmen` ≤ 5,000 credits (casting samples only; the full re-recording waits for Falko's choice
  of voices), `ton-welt` ≤ 3,000, `ton-motoren` ≤ 3,000 (gap fillers). Each workflow reads the subscription's `character_count` before and
  after (`GET /v1/user/subscription`), prints what it used and stops before its budget.
- Never print, log or commit the key. The chat's ElevenLabs connector belongs to the lead (casting with Falko); you may use it to **list or
  search voices**, never to generate.

## Timetable and report

- Start ~23:45 (Berlin, `date`). **First pushed stage by 02:30, final by 06:00.** The lead merges what is pushed, passes `bash tools/check.sh`
  and has its test green (here or on Actions). Push small increments; a solid half beats a shaky whole.
- Falko sleeps: do not ask him; decide and write the decisions into your feature doc (German, for humans) with a section „Für den Lead“.
  Do not spawn agents.
- Finish with a report: branch and last commit, what works and how it was tested (measurements, picture paths), what is open, the Hörprobe
  entries, wishes for the lead.
