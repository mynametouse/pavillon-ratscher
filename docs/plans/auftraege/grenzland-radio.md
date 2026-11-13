# Auftrag Hilfs-Agent `grenzland-radio` – Radiosender und Handy (13.11.2026)

Branch `feat/grenzland-radio`, Worktree `/home/claude/wt-gl-radio`, Port 9013. Gemeinsamer Teil: `grenzland-gemeinsam.md` (zuerst lesen).

---

**Your topic: the radio with several stations one can switch between as in GTA, and the phone.** Falko (13.11. 1:14): „… und auch
verschiedene Radiosender eingestellt werden können. Ähnlich wie bei GTA.“ His choice for the music: synthesised by ourselves plus the
public-domain recordings that are already in the game (`window.MUSICMAN`, `audio/music.js`: Satie, Joplin) – no licensed hits.

Your files: `viz3/src/grenzland/gl_radio_data.js` (GLRDATA), `gl_radio_musik.js` (GLRMUSIK), `gl_radio.js` (GLRADIO), `gl_handy.js`
(GLHANDY). Keep the interfaces in the headers of the first versions (the mode, the missions and the cockpit call them).

A. **The radio.**
- **Five or six invented stations**, each with a name, a frequency, a voice, a programme and its own music – e.g. the satire talk and
  news station „Radio Grenzland 89,1“ (the core's texts in `GLDATA.RADIO` are a start), a Schlager and folk-music wave, a rock station
  (Ostrock-like, instrumental), an electronic/80s station, a classical one that plays the public-domain recordings, and from across the
  border a Bavarian station (brass music, adverts) that only comes in near the south of the map or with noise. In the flashback
  (`GL.era === '1989'`, event `grenzland:era`) the dial shows the stations of 1989 instead (a GDR station with the news of 10 November
  1989 – true to what was really reported that day, research it –, march and dance music of the time in our own synthesis, and Western
  radio with noise) – the core's `GLDATA.J89.radio` is a start.
- **Music synthesised per station** (`gl_radio_musik.js`, WebAudio through `GLTON.raw()` on the music bus): real little pieces, not a
  loop of four bars – several songs per station with form (intro, verse, chorus), bass, chords, lead, drums made of noise and sine
  kicks, different keys and tempi, a seeded generator so that a station has a recognisable repertoire. The core's `GLTON.musik` shows the
  simplest possible start. It must sound pleasant at low volume in a car – listen critically to what you can verify (render offline with
  `OfflineAudioContext` in a unit or browser test and check level, clipping, spectrum; you cannot hear it, so be careful and conservative
  with levels, and say so in your doc).
- **The programme:** music, then a presenter's link, jingles, adverts of invented local firms (satire), weather (the real one of the game:
  `WETTER` – read `wetter/wetter.js` for its state), traffic, the news – and **the police report of the player's own deeds**
  (`KERN.on('grenzland:tat', d => …)`, `GL.W.log`; „Die Polizei sucht Zeugen …“ when wanted) – that is the GTA moment. The feature
  „Grenzgeschichten: Sukiyaki in Suhl“ (true, `GLDATA.RADIO.sushi`, sources in `GLDATA.SUSHI`) runs on the talk station.
  Spoken words: as subtitles (`GLHUD.sub`) and, where the player has voices switched on, spoken through `STIMME`
  (`audio/stimme.js`: `STIMME.person(key, { name, g, age })`, `STIMME.say` / `prepare` / `play` – read how `npc/ki.js` and `dorf/dorf.js`
  use it); music ducks under speech.
- **Switching as in GTA:** `R` next station (the mode module calls `GLRADIO.next()`), hold or a second key for the list; a small station
  wheel or bar shows name and frequency for a moment; the choice is kept (`GL.radio`). The radio plays in a vehicle and from the phone
  on foot (quieter, tinny); it goes quiet when the mode ends. In a vehicle of 1989 only the stations of 1989.

B. **The phone** (`T`, the panel's button; closes with the same key or Esc – read how `game/hud.js` handles Esc and the pointer lock):
a phone-shaped panel with tabs – **Nachrichten** (SMS of the story: `GLHANDY.sms(von, text)`, unread badge, the sound), **Dorf-Chat**
„Ratscher aktuell“ (satire; the core's `GLDATA.CHAT`; new lines arrive over time and react to what happens: a patrol car in the
village, bangers, the player's arrest), **Feed** (regional posts and „livestreams“ that point to places and events – `GLDATA.FEED`; a
post can set a marker: emit `grenzland:ziel` `{ pos, name }`), **Bank** (the money and its last movements – listen to `grenzland:geld`),
**Notizen** (`GLHANDY.note(titel, zeilen, quellen)`: the true story „Sushi in Suhl“ with its sources as links), **Kamera** (a mission's
camera: `GLHANDY.kamera({ ziel, r, n, sicht, done })` – a viewfinder overlay, „Foto“ button / key, the count), **Radio** (stations).
Works on a phone screen (touch, portrait and landscape) and on a laptop. State in `GL.sms`, `GL.feed` (through `GL.save()`).

Test: `viz3/test/grenzland_radio.py` (stations switch, programme advances, the police report tells a deed, 1989 changes the dial, the
phone opens with every tab, an SMS arrives and is read, the camera counts, everything is silent and gone after the mode ends; pictures
of the phone and the station bar), unit tests for the pure parts (programme scheduler, song generator: deterministic, in key, no
clipping). Feature doc `docs/features/grenzland-radio.md`.
