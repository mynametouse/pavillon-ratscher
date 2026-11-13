# Auftrag `kino` – Grenzland Runde 2: talks and mission beats like a film (13.11.2026)

Read `grenzland2-gemeinsam.md` first (same folder). Worktree `/home/claude/wt-g2-kino`, branch `feat/grenzland-kino`, port 9012.
Your files: `gl_mission.js`, `gl_kapitel1.js`, `gl_mission_data.js`, `gl_lager.js`, new `gl_kamera.js`, new `gl_score.js` (all in
`viz3/src/grenzland/`), `viz3/test/grenzland_kino*.py`, `viz3/extra/grenzland-kino/**`, `docs/features/grenzland-kino.md`.

## Why

In the review the talks were the strongest writing and the weakest picture: the camera stays behind the player, the speaker is often not
in the frame (Gerhard tells the key line of mission 3 while we look at Falko's back), there is no letterbox, no cut, no music under it. GTA's
missions start with a title card and a sting, cut between speakers in a cutscene, and score the action. That is your round.

## What to build (in this order; push each step when it works)

1. **Talk cutscenes – `gl_kamera.js`.** When a talk runs (`GLMISSION`: `rede()` / `zeile()` in `gl_mission.js`) and the player stands
   (not in a vehicle, no chase, at least two lines), the camera frames the scene like a film: a two-shot to open (both people, side-on, at
   eye height), then per line a cut to the speaker – over the shoulder of the listener, speaker's face on a third, or a medium close-up –
   never crossing the 180° line, a soft push-in on long lines. Letterbox with `GLHUD.kino(true)` / `false` (lead, arrives ~12:30 on
   `feat/grenzland`; guard and draw your own bars until then). The player cannot walk away during a cutscene (pause the walk input the way the
   game does for its own cutscenes – find it, e.g. how a sit or a ride locks movement), Space / Enter / a tap = next line (`weiter()` exists),
   Esc = skip the rest of the talk (its `done` must still run). Talks while driving, riding or chased stay as they are: subtitles only, no
   cutscene (GTA does the same). The speaker turns to the listener and back (`GLFIG.face`), the listener looks at the speaker; small gestures
   via `GLFIG.geste(F, art)` and `GLFIG.blick(F, x, y, z)` (agent `figuren`; guard: `GLFIG.geste && …`). Afterwards blend back to the
   follow camera in ~0.6 s. Find how the game camera is driven (`viz3/src/` – the follow camera, its per-frame update) and override it from
   outside after the game's update while a cutscene runs; no edits to base files.
2. **Mission title cards and stings.** At each mission start: `GLHUD.titel(GLMDATA.M[id].title, unter, sec)` (lead) plus
   `GLSCORE.stich('start')`; the review saw the chapter card („Grenzland · Kapitel 1 …“) again at mission starts – the card at the very start
   of the scene (`gl_modus.js`, lead) stays, anything in your files that repeats it goes. A failed mission gets a sting
   (`GLSCORE.stich('gescheitert')`) under the existing fade. **The chapter end card** (`ende()` in `gl_mission.js`) currently overlaps
   „Mission bestanden“: show it only after `await (GLHUD.ruhig ? GLHUD.ruhig() : wait(4500))`.
3. **Adaptive score – `gl_score.js`.** Self-made music only (Falko 13.11. 1:25: own compositions or public domain): synthesise in WebAudio –
   look at `gl_radio_musik.js` (read-only) for the night's music engine and reuse what you can through its public API, else a small own
   layered synth. Layers: `spannung` (mission objectives, sneaking – low pulse, pad), `flucht` (wanted ≥ 1: drums and bass ostinato, more with
   more stars, from `GLFAHNDUNG.stand()`), `1989` (dark drone, sparse piano or strings, no drums), stings `start`, `bestanden`, `gescheitert`.
   Crossfades of ~2 s; silent in free play and **whenever the car radio plays** (`GLRADIO` on – GTA has no score over the radio); ducked by
   ~8 dB while a voice line plays (`STIMME` active). API: `GLSCORE.lage(name | '')`, `GLSCORE.stich(name)`, `GLSCORE.duck(on)`. A step can
   carry `lage: 'spannung'` in `gl_mission_data.js`; add it where it fits (mission 2 the clique, mission 4 the Klinge night, mission 5 the coup).
   Volume goes through the game's music volume (find the bus / setting); everything stops in `GLMISSION.stop()` and on „Beenden“.
4. **Camera viewfinder for photo steps** (if time): find the mission steps where the player photographs something; while aiming show a
   viewfinder overlay (frame lines, focus brackets, today: phone camera UI; 1989: a film camera finder with frame counter), shutter sound
   (`GLTON` read-only, else WebAudio), a white flash; the picture goes to the phone gallery through `GLHANDY`'s public API (agent `welt` owns
   `gl_handy.js`: guard, report what you need).
5. **Pacing.** A talk line lasts as long as its recording when one plays (`STIMME.say(...)` resolves when done; agent `stimmen` records the
   lines – wait for the Promise, cap at `GLMLOGIK.dauer(text) * 1.6`), never under 1.6 s, 0.25 s between lines.

## Tests and pictures

`viz3/test/grenzland_kino.py` (one mission per page – memory): mission 1's first talk and mission 3's Gerhard talk via
`GLMISSION.debug.go(id, step)`: during the talk the camera is within 4 m of the speaker and the speaker's head projects into the middle 80 %
of the screen, the bars are shown, afterwards the camera is behind the player again; the title card shows at a mission start; the score
layer is `flucht` with a wanted level and silent with the radio on; no page errors; shader program count unchanged ± 1. Pictures in
`out/grenzland_kino/` – one per shot type and mission, before/after – **look at them** and fix what looks wrong. Lines for CI in
`viz3/extra/grenzland-kino/tests.txt`.

## For the lead (write it into `docs/features/grenzland-kino.md`)

What you need from `GLHUD` / `GLTON` / `GLHANDY` beyond the interfaces in the common part, decisions you took, known gaps.
