# Ton, Runde 1 – Auftrag `ton-musik`: freie Musik finden, prüfen, aufbereiten (13.11.2026, ~23:30)

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Read first `docs/plans/auftraege/ton-gemeinsam.md` (Falko's words,
hard rules, the sound repository, interfaces, ownership, ElevenLabs, timetable), then `grenzland2-gemeinsam.md` „How to work“.
You write **no game code**: you deliver the music and the pipeline that every sound agent uses.

## Goal

Real songs by real bands under CC0 / CC BY for four radio stations, and instrumental pieces for the mission music – found, licence-checked,
screened, measured, normalised and listed, so `ton-radio` can play them and Falko can choose by ear.

## 1 · Find candidates (research with WebSearch / WebFetch; the chat machine's shell cannot reach these sites – Actions can)

Station profiles (the DJs and texts exist in `viz3/src/grenzland/gl_radio_data.js`; Funkloch FM is new):

| Station | Wanted | Notes |
|---|---|---|
| Radio Zweitakt 97,6 (DJ Ecki) | Rock & Punk: Deutschrock, Punk, Garage, Indie-Rock, Stoner | energy for riding the Simson; German vocals first |
| Funkloch FM 101,3 (new) | Rap & Elektro: Deutschrap (boom bap, trap), Electro, Techno, House | German rap first; instrumental electronic is fine |
| Neonfunk 104,2 (DJ Synthia) | Synthpop & New Wave: Synthpop, New Wave, Italo, Synthwave, Darkwave | vocals preferred |
| Kirmeswelle 92,4 (DJ Gundula) | Schlager & Kirmes: Party-Schlager, Discofox, Polka, Walzer, Blasmusik-Pop, Volksmusik | German vocals first – **probably scarce**: report what exists and propose fallbacks (instrumental polka/waltz, English party songs, …) – do not decide, the lead asks Falko |
| Score (for `GLSCORE`, instrumental only) | layers `spannung` (sneaking, a pulse), `flucht` (chase; ideally two intensities), `1989` (memory: dark, sparse piano/strings, no drums), `szene` (soft pad under cutscenes); stings `start`, `bestanden`, `gescheitert` (≤ 5 s, may be cut from a longer piece) | one composer or album per layer set sounds coherent; loopable sections; note tempo and key where known |

- Aim: **12–16 candidates per station** (Falko keeps ~8) and **10–14 for the score**. Quality over count: real production, a good mix,
  a voice that carries; no demo-tape noise unless it is the charm of punk.
- Where to look (check every file's own page): Free Music Archive (licence filter), ccMixter (open query API, e.g.
  `https://ccmixter.org/api/query?f=json&lic=by&tags=…`), Internet Archive netlabels (`https://archive.org/advancedsearch.php` with
  `licenseurl:*by/4.0*` / `*by/3.0*` / `*publicdomain/zero*`, `mediatype:audio`), Wikimedia Commons (music categories), Kevin MacLeod /
  incompetech (CC BY 4.0 – good for the score), Jamendo only if a track page states CC BY and a direct file is reachable, Bandcamp only when the
  page states CC BY / CC0 and a direct file exists. German scenes: netlabels and archives with German punk, rap, synth – search in German too.
- Language: German first, English is fine, instrumental where the station allows it.

## 2 · Manifest (`tools/ton/quellen/musik.json`, `tools/ton/quellen/score.json`)

One entry per file, e.g.
`{ "id": "zweitakt-03", "kind": "musik", "sender": "zweitakt", "titel": "…", "interpret": "…", "album": "…", "lizenz": "CC BY 4.0",
"lizenz_url": "https://creativecommons.org/licenses/by/4.0/", "quelle": "<page of this track>", "datei": "<direct file URL>",
"geprueft": "2026-11-14", "sprache": "de" | "en" | "-", "gesang": true, "sek": 214, "warum": "…", "risiko": "…" }`.
Score entries: `"kind": "score", "schicht": "flucht" | …`, optional `"start"`/`"ende"` (seconds) to cut a section and `"loop": true`.
The format is the shared one for all agents (`ton-welt` → `klang.json`, `ton-motoren` → `motor.json`); write it down in
`tools/ton/README.md` with the processing options below.

## 3 · Pipeline (`tools/ton/holen.py` + `.github/workflows/ton-holen.yml`)

Triggers: `workflow_dispatch` and push to `feat/ton-*` touching `tools/ton/**`. Steps per entry (skip what is unchanged – cache by URL and
options):

1. **Fetch** the file; **check the licence** on `quelle` (fetch the page, find the licence link/string that matches `lizenz`; keep the snippet
   and the date in the evidence; an entry without evidence fails with a clear annotation).
2. **ElevenLabs gap fillers** (entries `"kind": "eleven_sfx", "prompt": "…", "sek": 20, "loop": true` – used by `ton-welt` / `ton-motoren`):
   call the Sound Effects API only with the secret, within the budget of that manifest file (see `ton-gemeinsam.md`), else skip with a notice.
3. **Process**: cut (`start`/`ende`), trim silence at both ends, short fades (or, for `loop: true`, make it seamless: crossfade end into start,
   check the joint), mono/stereo, loudness to the target of its kind (two-pass `loudnorm`; music −16 LUFS / −1 dBTP, ambience −24 LUFS,
   effects peak −1 dBFS), encode MP3 (bitrates from `ton-gemeinsam.md`), ID3 tags (title, artist, licence URL, source).
4. **Measure**: duration, LUFS, true peak, for loops the seam; **transcribe** vocals with faster-whisper (`small`, int8, CPU, language auto):
   text and segment times → `gesang_ab` (first vocal) and `gesang_bis` (last vocal) in seconds – `ton-radio` uses them so the DJ talks over the
   intro and the outro, never over the singing.
5. **Write** `index.json` (all kinds; the fields of `ton-gemeinsam.md`), `CREDITS.md`, measurements and transcripts as text
   (`tools/ton/messung/`, committed back by the workflow with `[skip ci]` – pull before you push again); the audio stays a **workflow
   artifact** until the sound repository exists (the lead then moves the publishing step there).

Also a self-test (`python3 tools/ton/holen.py --selbsttest`: an ffmpeg tone + noise through the whole chain, checks loudness, the loop seam and
`index.json`) that runs on Actions with every pipeline change.

## 4 · Screen and choose

- Read every transcript; drop songs that break the content rules (`ton-gemeinsam.md` 2); note anything borderline in `risiko`.
- Rank per station (fit, sound quality from what you can measure and read – production notes on the page, release, label).
- **Hörprobe page** `tools/ton/hoerprobe/index.html` (one page, phone-friendly, German): sections per station, the score, and whatever the
  other agents list in `tools/ton/hoerprobe/*.json`; per entry: title, artist, licence, a player (`<audio>` with the hosted file when a base
  URL is set, else a big link to the track's own page), the lyric excerpt (first lines of the transcript), 👍 / 👎 stored in `localStorage`,
  and a button **„Auswahl kopieren“** that puts a short text on the clipboard (e.g. „Hörprobe 14.11.: 👍 zweitakt-03, … 👎 …“) for Falko to
  paste into the chat.

## Files (yours)

`tools/ton/**` (except the manifest and Hörprobe files of `ton-welt` / `ton-motoren`), `.github/workflows/ton-holen.yml`,
`docs/features/ton-musik.md` (German: what was found per station, gaps, the fallback options for Schlager as choices the lead can ask, a
licence table, „Für den Lead“). No game code, no `viz3/extra/**`.

## Deliverables

- **02:30:** ≥ 8 licence-checked candidates per station and ≥ 8 for the score in the manifests; the pipeline ran on Actions for a first batch
  (artifact + measurements + transcripts); `tools/ton/README.md` with the manifest format.
- **06:00:** all candidates processed and screened, `index.json` and `CREDITS.md` complete, the Hörprobe page with every list, the feature doc.

## Worktree

`/home/claude/wt-ton-musik`, branch **`feat/ton-musik`** (from `src` with these briefs), port **9031** (only if you need a browser for the
Hörprobe page). Push `git -c push.negotiate=true push -u origin feat/ton-musik`; never to `src`, `live`, `feat/grenzland`.
