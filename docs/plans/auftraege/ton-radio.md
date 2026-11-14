# Ton, Runde 1 – Auftrag `ton-radio`: das Radio spielt echte Songs, Missionsmusik aus Dateien (13.11.2026, ~23:30)

> **Stand 14.11.2026, 0:30 – angehalten.** Falko 23:54: „ich möchte keine Credit Labs bezahlen“ – ElevenLabs entfällt ganz (siehe `ton-gemeinsam.md`, „Costs: none“); wo dieser Auftrag ElevenLabs nennt, gilt das nicht mehr. 23:57: nur Schnelles – die Agenten wurden um 23:58 angehalten, ihre angefangene Arbeit liegt unbesehen auf dem Branch. Schon gebaut vom Lead (V18n): acht Songs in `GLRDATA.LIEDER`, Funkloch FM, `gl_nacht.js` (Grillen, Stundenschlag).

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Read first `docs/plans/auftraege/ton-gemeinsam.md` (Falko's words,
hard rules, the sound repository, interfaces, ownership, ElevenLabs, timetable), then `grenzland2-gemeinsam.md` „How to work“, then what
exists: `docs/features/grenzland-radio.md` (the radio of the night: six stations today, three in 1989, the station clock, the police report
about one's own deeds, the phone) and `viz3/src/grenzland/gl_radio*.js`, `gl_score.js`.

## Goal

GTA's radio feeling with real songs: four stations play the free songs that `ton-musik` delivers (Radio Zweitakt, the new **Funkloch FM**,
Neonfunk, Kirmeswelle), the DJs talk into intros and outros, reception and speakers sound real, and the mission music comes from files.
What works today (station clock, news with the game's weather, the police report, the Eilmeldung, the 1989 stations) stays.

## What to build

1. **`GLMEDIEN`** (new `gl_medien.js`) exactly as in `ton-gemeinsam.md` „Interfaces“ – the others depend on it, so first. Songs stream through a
   media element (`MediaElementSource`, created once per element – keep two elements and reuse them: one playing, one preloading the next);
   short things (station IDs, stings) as decoded buffers in a small LRU. iPhone: the game unlocks audio on the first click – create the
   elements early and reuse them.
2. **Stations with songs:** entries of `index.json` with `kind: 'musik'` and `sender` (`zweitakt`, `funkloch`, `neon`, `kirmes`), without
   `aus: true` (the lead sets it for songs Falko rejects). Shuffle per station, no repeat before all were played, start **mid-song** when tuning
   in (as if the station had been running – a station clock from the game time, as today). Gaps and crossfades like a radio (short, tight).
3. **Funkloch FM 101,3** (new, today only, between Radio Blasius 99,9 and Neonfunk 104,2): Rap & Elektro. Invent its DJ (young, from the area,
   dry humour – no stereotype that mocks East Germans or anyone) and its program in `gl_radio_data.js` like the other stations: ID line,
   moderations, ads of invented firms, news, traffic, greetings, its own tone in the police report. All fixed strings (`linien()` reaches them).
4. **DJ over intro and outro:** `index.json` gives `gesang_ab` / `gesang_bis` (first and last sung second; missing for instrumentals). A
   moderation may start at the song's start and must end ≥ 1 s before `gesang_ab`; an outro moderation starts after `gesang_bis`. Too long for
   the window → speak it between the songs over a short bed. The music ducks under the voice as today.
5. **Station IDs** spoken by the DJ over a 4–6 s bed cut from one of the station's own songs (pick a loud instrumental moment; no AI music).
6. **Callers** („Hörer rufen an“): 2–3 short call segments on Radio Grenzland, Kirmeswelle and Funkloch FM – the caller's lines through the
   phone band (`GLRAUM.telefon` if there, else your own band-pass 300–3400 Hz). Fixed strings; caller voices are recorded by `ton-stimmen`.
7. **Reception:** stations hiss and drop out in the forest and deep valleys („Funkloch“): from the place (`KERN.place` names: Klinge, Wald …)
   and the terrain (ground height against the surroundings – find the world's height function), plus distance to an invented transmitter per
   station; noise band, short dropouts, collapse to mono. Radio Blasius stays south-only (reuse the existing logic). Switching stations:
   0.3–0.5 s of tuning noise and a whistle sweep.
8. **Speakers:** car (stereo, slight low-mid warmth, soft compression), phone on foot and on the moped (mono, thin, quieter), 1989 the
   portable radio (narrow band) – through `GLRAUM.lautsprecher(node, art)` if `ton-welt` provides it, else your own small chains.
9. **Display and credits:** the radio display shows „Titel – Interpret“ and the licence („CC BY 4.0“ / „CC0“); the station list (hold R, the
   phone tab „Radio“) lists the station's songs with author and licence; the game's credits get a section „Musik im Radio“ (find how
   `credits_add` works in `viz3/build.py`; songs come from `index.json`, so build the credits text at runtime or at build time – your call).
10. **Mission music from files:** `GLSCORE` plays the layers of `index.json` (`kind: 'score'`, `schicht`: `spannung`, `flucht`, `1989`, `szene`;
    stings `start`, `bestanden`, `gescheitert`) with today's logic (crossfade ~2 s, silent in free play and under the car radio, ducked under
    voices). Keep its API (`lage`, `mission`, `szene`, `stich`, `duck`, `tick`, `stop`, `stand`).
11. **Fallback:** no repository, no file, no connection → the synth pieces and the synth score play as today, silently, no error on screen.

## Files (yours)

`gl_radio.js`, `gl_radio_data.js`, `gl_radio_musik.js`, `gl_score.js`, new `gl_medien.js` (+ one line in `viz3/src/modules.txt` inside
`# feat/grenzland`, before the modules that import it), `viz3/extra/grenzland-radio/**`, tests `viz3/test/grenzland_radio*.py`,
`viz3/test/unit/grenzland_radio*.test.mjs`, new `viz3/test/ton_radio*.py` / `viz3/test/unit/ton_radio*.test.mjs`,
`docs/features/grenzland-radio.md` (update it: what changed, „Für den Lead“). Everything else read-only (`gl_handy.js` shows the radio tab –
if it needs a change, write the patch into your report).

## Tests (must pass before your last push)

- Unit (node): shuffle without repeats per station, the mid-song start, the talk window from `gesang_ab` / `gesang_bis` (and the fallback
  between songs), the reception value by place and terrain, the credits text, `GLMEDIEN`'s LRU limits.
- Browser, with test files you make during the test (ffmpeg tones, noise and a spoken-like burst into `out/ton/…` plus a small `index.json`;
  point `GLMEDIEN.BASE` there): each of the four stations plays a file (the element's `currentTime` advances), the display shows title, artist
  and licence, a DJ line ducks the music, switching plays tuning noise, the Klinge hisses and Schleusingen is clear, a missing file falls back
  to the synth without an error, the score switches layers when stars rise, the 1989 stations still work. Pictures of the display and the
  station list (desktop and phone layout) in `out/ton_radio/` – look at them.
- New lines for the voices are in `GLSTIMMEN.linien()` (run `node tools/voices/grenzland_linien.mjs`; the workflow records on the branches it
  watches – `ton-stimmen` adds `feat/ton-*`).

## Worktree

`/home/claude/wt-ton-radio`, branch **`feat/ton-radio`** (from `src` with these briefs), port **9032**. Push
`git -c push.negotiate=true push -u origin feat/ton-radio`; never to `src`, `live`, `feat/grenzland`.
**02:30:** `GLMEDIEN`, file playback on the four stations with test files, the fallback, the display with licence. **06:00:** the rest.
