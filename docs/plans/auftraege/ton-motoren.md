# Ton, Runde 1 – Auftrag `ton-motoren`: echte Motoren, Martinshorn mit Doppler, Hubschrauber (13.11.2026, ~23:30)

> **Stand 14.11.2026, 0:30 – angehalten.** Falko 23:54: „ich möchte keine Credit Labs bezahlen“ – ElevenLabs entfällt ganz (siehe `ton-gemeinsam.md`, „Costs: none“); wo dieser Auftrag ElevenLabs nennt, gilt das nicht mehr. 23:57: nur Schnelles – die Agenten wurden um 23:58 angehalten, ihre angefangene Arbeit liegt unbesehen auf dem Branch. Schon gebaut vom Lead (V18n): acht Songs in `GLRDATA.LIEDER`, Funkloch FM, `gl_nacht.js` (Grillen, Stundenschlag).

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Read first `docs/plans/auftraege/ton-gemeinsam.md` (Falko's words,
hard rules, the sound repository, interfaces, ownership, ElevenLabs budgets, timetable), then `grenzland2-gemeinsam.md` „How to work“, then
what exists: `viz3/src/grenzland/gl_ton.js` (synthesised siren, moped rattle, banger – **you take it over from the lead**), the Grenzland
vehicles (`gl_auto.js`, `gl_zweirad.js`, `gl_wagen.js`, `gl_typen.js`, `gl_1989_welt.js`, the police in `gl_fahndung.js`, `gl_heli.js`),
and the base game's `viz3/src/vehicles/vsound.js` (synthesised engines, tyres, wind – read-only).

## Goal

The vehicles sound like the real ones: the clique's Simson as a two-stroke that rings and crackles, Trabant and Wartburg in 1989 as
two-strokes, today's cars as four-strokes, the police with a real Martinshorn that rises and falls as it passes (Doppler), and from four
stars a helicopter overhead.

## What to build

1. **`GLMOTOR`** (new `gl_motor.js` + `gl_motor_data.js`), only in the mode, gone after „Beenden“:
   - Per engine type 3–5 recorded loops (idle, low, mid, high; for two-strokes also the overrun crackle off the throttle), **crossfaded by
     revs** (equal power) and pitched within a small range; throttle on/off as load and overrun layers; start and stop one-shots; the horn.
     Types: Simson (S51 / Schwalbe, 50 cm³ two-stroke), Trabant 601 (two-cylinder two-stroke), Wartburg 353 (three-cylinder two-stroke),
     today's petrol and diesel car, the police car of today; find which Grenzland vehicles exist and map them.
   - Revs and throttle from the vehicle's state (speed, gear, input – read-only); where there are no revs, a small gear model from speed.
   - The engine of the player's vehicle in the cabin view sounds inside (through `GLRAUM`'s `auto` room if there), others positional through
     `GLRAUM.quelle` (or straight to the bus as a fallback).
   - For Grenzland vehicles the base game's `VSND` engine voice must be silent (find a public way; a change in `vsound.js` only as a patch in
     your report); keep its tyres unless you replace them with recordings (gravel, asphalt, grass).
2. **Martinshorn:** a real recording of the German two-tone horn of today; **Doppler** from the relative speed of the police car to the
   listener (smoothed playback rate, ±), distance and direction through `GLRAUM`. For 1989 research what the Volkspolizei's cars used and
   choose a fitting sound (note your source; if unclear, an older timbre of the two-tone and a note in the doc).
3. **Helicopter** from four stars (`gl_heli.js`, read-only – use its public state or poll its position): a rotor loop with blade slap,
   Doppler and distance, overhead loud.
4. **Sources:** licence-checked recordings in `tools/ton/quellen/motor.json` (format of `tools/ton/README.md` by `ton-musik`; Freesound CC0 /
   CC BY, Wikimedia Commons, archive.org – there are recordings of Simsons, Trabants and Wartburgs); gaps as `eleven_sfx` entries with a
   precise prompt (budget 3,000 credits). Cut loops at whole engine cycles where you can, so they loop cleanly. Your Hörprobe entries in
   `tools/ton/hoerprobe/ton-motoren.json` (what to listen for: idle, pulling away, full throttle, overrun).
5. **Fallback:** without files the synth of `gl_ton.js` and `VSND` sound as today.

## Files (yours)

`gl_ton.js`, new `gl_motor.js`, `gl_motor_data.js` (one line each in `viz3/src/modules.txt` inside `# feat/grenzland`),
`tools/ton/quellen/motor.json`, `tools/ton/hoerprobe/ton-motoren.json`, `viz3/extra/grenzland-motor/**`, tests `viz3/test/grenzland_motor*.py`,
`viz3/test/unit/grenzland_motor*.test.mjs`, `docs/features/grenzland-motor.md` (German, „Für den Lead“).

## Tests (must pass before your last push)

- Unit: revs → layer weights (equal power, sum), the pitch range, throttle and overrun, Doppler (approaching higher, receding lower, no jump
  when passing), the mapping of vehicles to engine types.
- Browser, with test loops you make during the test (ffmpeg tones into `out/ton/…`, a small `index.json`): riding the Simson builds the layers
  and their gains follow the speed over a 5 s run-up; the siren's playback rate rises as a police car approaches and falls after it passed
  (set positions); the rotor plays at four stars; the base engine voice is silent for Grenzland vehicles; nothing after „Beenden“; without files
  the synth plays; live audio nodes stay bounded.

## Worktree

`/home/claude/wt-ton-motoren`, branch **`feat/ton-motoren`** (from `src` with these briefs), port **9035**. Push
`git -c push.negotiate=true push -u origin feat/ton-motoren`; never to `src`, `live`, `feat/grenzland`.
**02:30:** `GLMOTOR` with the Simson on test loops, the Doppler siren, the manifest with licence-checked recordings for every engine type,
the siren and the rotor. **06:00:** the rest.
