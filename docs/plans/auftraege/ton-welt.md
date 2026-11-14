# Ton, Runde 1 – Auftrag `ton-welt`: Orte, Tageszeit, Wetter und Raumklang (13.11.2026, ~23:30)

> **Stand 14.11.2026, 0:30 – angehalten.** Falko 23:54: „ich möchte keine Credit Labs bezahlen“ – ElevenLabs entfällt ganz (siehe `ton-gemeinsam.md`, „Costs: none“); wo dieser Auftrag ElevenLabs nennt, gilt das nicht mehr. 23:57: nur Schnelles – die Agenten wurden um 23:58 angehalten, ihre angefangene Arbeit liegt unbesehen auf dem Branch. Schon gebaut vom Lead (V18n): acht Songs in `GLRDATA.LIEDER`, Funkloch FM, `gl_nacht.js` (Grillen, Stundenschlag).

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Read first `docs/plans/auftraege/ton-gemeinsam.md` (Falko's words,
hard rules, the sound repository, interfaces, ownership, ElevenLabs budgets, timetable), then `grenzland2-gemeinsam.md` „How to work“, then
what exists: `viz3/src/audio/audio.js` (buses `audio.raw()`, the base ambience loops, `muffle`, the convolver, `inside()`), the extras
`viz3/extra/wetter/` (weather sounds and their credits) and `viz3/extra/tiere/` (animal sounds), `docs/features/grenzland.md` (places of the mode).

## Goal

With closed eyes one hears **where** one is and **when** it is: every place of Grenzland has its own sound, morning, day, evening and night
differ, rain and wind are heard, a church strikes the hour, and every sound sits in its room – reverb in the bunker and the church, muffled in
the car and indoors, its direction audible with headphones.

## What to build

1. **`GLRAUM`** (new `gl_raum.js`) exactly as in `ton-gemeinsam.md` „Interfaces“ – first, the others use it:
   - `lage()`: the room (`frei`, `auto` – in a vehicle with a cabin, `innen` – in a building (`audio.inside()`), `bunker`, `kirche`,
     `tunnel` – zones that missions may set: `GLRAUM.zone(name, polygon | circle, raum)`), and the place's zone (below).
   - `quelle(node, { x, y, z })`: HRTF `PannerNode` (`inverse` distance model, sensible `refDistance` per source kind), air absorption (a
     low-pass falling with distance), occlusion (outdoor sources heard from `auto` / `innen`: low-pass and a few dB down), a reverb send by
     room; returns `{ pos(x, y, z), ende() }`; few nodes per source, cheap per frame.
   - Reverb: one convolver per room kind with a generated impulse response (decaying filtered noise with the room's reverb time and
     pre-delay; real impulse responses only with CC0/CC BY) on the game's wet path; switch smoothly when the room changes.
   - `telefon(node)` (band 300–3400 Hz, a little compression and grit) and `lautsprecher(node, art)` (`auto`, `handy`, `koffer`) for the radio.
2. **`GLKLANG`** (new `gl_klang.js` + `gl_klang_data.js`), only while the mode runs (`GL.on`), everything gone after „Beenden“; while it runs
   it replaces the base game's ambience loops (find a clean way to lower them – an API of `audio.js` or the `amb` bus; a change in `audio.js`
   only as a patch in your report) and gives them back afterwards.
   - **Zones** from the place (`KERN.place`, `KERN.area`), the distance to water and the forest (`FOREST.canopy` if usable): Dorf Ratscher,
     the garden, Wald and Klinge, Talsperre, Schleusingen, Suhl (today), the country road, and prepared entries for chapter 2 (Grünes Band,
     the bunker – set by missions later). Each zone: a stereo bed (−24 LUFS) plus random one-shots placed around the player through
     `GLRAUM.quelle` (dog, tractor passing far off, woodpecker, crows, ducks, a door, footsteps in town …) at natural intervals. Crossfade
     2–4 s between zones.
   - **Time of day and season** (`CLOCK`, the calendar): dawn chorus, day birds, blackbird in the evening, night – crickets in summer, owl,
     fox; winter quieter. **Weather** (`WETTER` of the wetter extra – live or by calendar): rain by intensity on leaves, on roofs, on the car
     roof when inside a vehicle, thunder with storms, gusts with the wind; reuse the wetter extra's recordings where they fit (check licences).
   - **Point sources:** church bells striking the full hour (count = hour) at the real churches of the map (find positions in the world data),
     brooks and the Schleuse, the pub's door (music and talk spill out nearby), the Kirmes (brass, rides, voices) and the market in
     Schleusingen when they happen (find how the mode starts them), dogs in yards.
   - **Walla beds:** Kirmes, market, pub (the voices of single people are `ton-stimmen`'s).
3. **Sources:** licence-checked recordings in `tools/ton/quellen/klang.json` (format of `tools/ton/README.md` by `ton-musik`; Wikimedia Commons,
   Freesound CC0 / CC BY only, archive.org …); gaps as `eleven_sfx` entries with a precise prompt and `loop: true` (budget 3,000 credits – the
   pipeline skips them without the key). Your Hörprobe entries in `tools/ton/hoerprobe/ton-welt.json`.

## Files (yours)

New `gl_raum.js`, `gl_klang.js`, `gl_klang_data.js` (one line each in `viz3/src/modules.txt` inside `# feat/grenzland`, `gl_raum.js` before
the modules that use it), `tools/ton/quellen/klang.json`, `tools/ton/hoerprobe/ton-welt.json`, `viz3/extra/grenzland-klang/**`, tests
`viz3/test/grenzland_klang*.py`, `viz3/test/unit/grenzland_klang*.test.mjs`, `docs/features/grenzland-klang.md` (German, „Für den Lead“).

## Tests (must pass before your last push)

- Unit: the zone by place and position, layer weights by hour, season and weather, the one-shot scheduler, the bell count, the room rules,
  the panner settings.
- Browser, with test files you make during the test (ffmpeg noise and tones into `out/ton/…`, a small `index.json`; `GLMEDIEN.BASE` there –
  if `GLMEDIEN` is not merged yet, a guarded local loader): teleport to the village, the Klinge, the Talsperre and Schleusingen → the bed
  changes; night → the night layer sounds; a rain override → the rain layer; in a car → occlusion and the car room; HRTF panners exist for
  point sources; outside the mode nothing of `GLKLANG` plays and the base ambience is back; missing files → base ambience, no error; the
  number of live audio nodes stays bounded over a minute. Measurements and node counts in your feature doc.

## Worktree

`/home/claude/wt-ton-welt`, branch **`feat/ton-welt`** (from `src` with these briefs), port **9034**. Push
`git -c push.negotiate=true push -u origin feat/ton-welt`; never to `src`, `live`, `feat/grenzland`.
**02:30:** `GLRAUM` complete, `GLKLANG` with the zones on test files, ≥ 20 licence-checked recordings in the manifest. **06:00:** the rest.
