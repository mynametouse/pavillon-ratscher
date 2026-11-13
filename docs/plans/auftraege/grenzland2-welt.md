# Auftrag `welt` – Grenzland Runde 2: a world that notices you (13.11.2026)

Read `grenzland2-gemeinsam.md` first (same folder). Worktree `/home/claude/wt-g2-welt`, branch `feat/grenzland-welt`, port 9016.
Your files: `gl_fahndung.js`, `gl_logik.js`, `gl_heli.js`, `gl_handy.js`, new `gl_reaktion.js`, new `gl_reaktion_data.js`, new
`gl_ereignis.js` (all in `viz3/src/grenzland/`), `viz3/test/grenzland_welt*.py`, `viz3/test/unit/grenzland_welt*.test.mjs`,
`viz3/extra/grenzland-welt/**`, `docs/features/grenzland-welt.md`.

## Why

GTA 6's previews sell a world that reacts: witnesses film you and it shows up on social media, the police know what they saw (face, outfit,
vehicle) and you can change it, people react to being stared at and comment on your outfit, you choose how to answer, things happen on the
road. In chapter 1 the world does not notice the player yet. Make it notice – with regional satire, friendly, never mean.

## What to build (in this order; push each step when it works)

1. **What the police know** (`gl_fahndung.js`): `stand().wissen = { gesicht, kleidung, fahrzeug }` from sightings (an officer, a
   witness who calls, a camera: the face only close and in light, the clothing at a medium distance, the vehicle when seen in it), and
   `stand().cars[i].gesehen` (the car sees the player now or did within ~4 s). The lead's radar shows police cars only when `gesehen` and
   the wanted panel shows icons from `wissen` (~12:30). Change the facts and the knowledge changes: another outfit or a helmet / balaclava
   (find how the base game changes the avatar's clothes and what the mode has – `GL.inv`, the helmet deed in `gl_data.js`) resets
   `kleidung` (and hides `gesicht` while worn); leaving the vehicle unseen resets `fahrzeug`; the search then looks for the old
   description, and the radio says so.
2. **The police radio describes the player** – fixed fragments said one after another (`await STIMME.say('gl_funk', teil)` each, so
   `stimmen` can record every fragment): „Zentrale an alle Streifen.“, „Gesucht wird eine Person,“, „männlich,“ / „weiblich,“
   (Falko / Sarah), clothing („dunkle Jacke.“, „helle Jacke.“, „mit Helm.“, „mit Sturmhaube.“ – from what the player wears), vehicle
   („auf einem Moped.“, „in einem Trabant.“, „zu Fuß.“), direction („Richtung Schleusingen.“, „Richtung Ratscher.“, …), „Kommen.“ – on a
   new wanted level and when the knowledge changes; the subtitle shows the sentence once (`GLHUD.funk` / `GLHUD.sub`, lead). Offer
   `GLFAHNDUNG.linien()`.
3. **Witnesses film, the feed posts** (`gl_reaktion.js`, `gl_handy.js`): when the player does something wild near people (a chase
   passing, a crash, speeding over the market square, Böller), one to three figures nearby raise their phones (`GLFIG.geste(F, 'filmen')`
   – agent `figuren`; guard) for a few seconds; ~20 s later a post appears in the phone's feed with **a real snapshot of that moment**
   (render the view once into a small target, ~320×180, or read the canvas right after a frame – once per post, mind the cost) and a
   caption in local style („Was ist denn in Schleusingen los?? 😳“, „Polizei auf der L 1625 …“, „#Schleusingen“), likes and comments
   counting up; a big event becomes a „LIVE“ post. The radio's police report of the player's deeds exists (`gl_radio*.js`, read-only) –
   do not duplicate it.
4. **Reactions and choices** (`gl_reaktion.js`, `gl_reaktion_data.js`): people near the player look at him when he stops or looks at them
   (`GLFIG.blick`, guard), comment on outfit, vehicle or behaviour with short lines (standard German with regional words – Kirmes, Kloß,
   Rostbratwurst, Grenzer –, no dialect spelling, nothing mean); when the player stands by a named person of the mode, a small choice
   (keys 1–4 / taps, styled like the mode's HUD): „Grüßen · Sprüche klopfen · Beruhigen · Provozieren“ – greet: a friendly answer;
   taunt: a comeback, the person remembers; defuse: lowers a search nearby; provoke: the person gets angry and may call the police (one
   star). Small, funny consequences. `GLREAKTION.linien()` for `stimmen` (all texts fixed strings).
5. **Random events** (`gl_ereignis.js`): one at a time, only in free play (never during a mission step), every few minutes of driving, each
   with a radar point (register a source with `GLKARTE.src(fn)` – the lead's module, read its API), a small reward or consequence, cleaned up
   when done or left behind: **Blitzer auf der L 1625** (a mobile speed camera in a parked car; too fast → a white flash and a fine letter in
   the phone a minute later), **Traktorstau** (a slow tractor with trailer, cars queueing, honking), **Kirmes** in a village (music, people,
   a stall), **Hochzeitskorso** (three or four cars with ribbons honking through Schleusingen), **Böller aus dem Kofferraum** (a man sells
   fireworks out of season from a car boot in a car park; „Knallkörper im September“ exists as a deed in `gl_data.js` – read it),
   **Wildunfall** (a deer crosses the forest road at dusk; brake or it bumps the car and runs away – no gore). Use the existing vehicle and
   figure APIs (`GLAUTO`, `GLFIG`, the base traffic) – no heavy new assets. `GLEREIGNIS.debug.start(name)` for tests, `GLEREIGNIS.linien()`.

Rules: Hubert and Ronald are never culprits, targets or victims (they may comment kindly). No real firms, no logos; the places and roads
are real. Nothing runs before the scene starts; all gone after „Beenden“.

## Tests and pictures

`viz3/test/grenzland_welt.py` (free play, one area per page): a sighting sets `wissen` flags, a helmet resets `kleidung`; the radio queue
says the fragments in order; a witness films (gesture flag set) and a post with an image appears (`img` data URL > 1000 chars); each event
starts by `GLEREIGNIS.debug.start(name)`, shows, and ends cleanly (no figures or vehicles left); the choice offers four answers and
„Provozieren“ can give a star; no page errors. Unit tests for the pure logic (knowledge rules, event scheduling). Pictures in
`out/grenzland_welt/` – **look at them**. Lines for CI in `viz3/extra/grenzland-welt/tests.txt`.

## For the lead (in `docs/features/grenzland-welt.md`)

What the HUD should show from `wissen`, the radar source you registered, what you need from `GLHUD`, open points.
