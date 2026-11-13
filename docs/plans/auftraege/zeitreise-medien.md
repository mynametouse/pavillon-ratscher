# Auftrag `zeitreise-medien` – Handy-Übergänge, Radio als Tonbrücke, echte Videos von heute

Gestartet am 13.11.2026 ~13:30 als fünfter Hilfs-Agent (Sonnet). Branch `feat/zeitreise-medien` von `origin/feat/zeitreise`, Worktree
`/home/claude/wt-zeitreise-medien`, Port 9015. Gemeinsamer Teil: `zeitreise-gemeinsam.md`. Falko 13:06 (Auszug): „kreative Übergänge oder sowas wie
Zeitungsmeldung oder Online-Meldung oder Nachrichten auf dem Handy, die möglichst realistisch aussehen … Links zu YouTube-Videos … die höchst
relevant sind … Radio, Sounds … News auf dem Handy anschauen im Spiel … das ist das Beste, besser als Fernsehen … sodass man irgendwie hineingezogen
wird in diese Welt und versteht, was los ist. Man bekommt vielleicht auch Anrufe.“ Gewählt (zum Anklicken): Handy-Übergänge, Radio als Tonbrücke,
echte Videos von heute. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/zeitreise-gemeinsam.md` (team, contracts, big-screen rules, content rules – they apply to you), then the
other four briefs briefly (`zeitreise-chronik.md`, `zeitreise-regie.md`, `zeitreise-welt.md`, `workshop.md`) and, for a working example of an
in-game phone and radio in this app, the top comments of `viz3/src/grenzland/gl_handy.js` and `gl_radio.js` (another chat's mode – read only,
never edit, never import them).

**Your part: the media of the futures – they pull the room into the world and explain what is going on.** You own `viz3/src/zukunft/zk_medien*.js`
(global `ZKMEDIEN`: the media script as data keyed to `ZKCHRONIK` event ids, and the phone overlay, the radio and the video player),
`viz3/test/zeitreise_medien.py`, `viz3/extra/zeitreise-medien/tests.txt`, `docs/features/zeitreise-medien.md`, your voice lines.

1. **Phone transitions in the time-lapse** (shown large on the big screen: a generic smartphone at the right of the picture, ~70 vh high – no
   Apple/Samsung look, no real app's look-alike): before a halt the time-lapse eases out and the phone does one of:
   - *breaking news* (vibration, a push slides in, then the article of a fictional regional news portal with headline, teaser, time, a photo);
   - *the village group* (a generic messenger: villagers' messages, voice notes with a waveform, **photos that are real stills from the 3D world**
     at that place – slightly tilted, a time stamp – via `ZKREGIE.snapshot`); the photo can fill the screen and dissolve into the live scene
     from the same pose („Foto wird lebendig“);
   - *a call* (ringing, „Manfred – Feuerwehr“, his recorded voice; the picture cuts to the place during the call);
   - *a warning* (a full-screen alert for heavy rain or a large power cut – **visibly a scenario**: sender „Warnsystem (Szenario)“ and the mark
     „mögliche Zukunft“; an alarming but *distinct* tone – never the official warning tone, people in the room must not mistake it);
   - *no network* (the blackout: after a while the status bar shows „Kein Netz“; from then on only the battery radio).
   Script for Stufe 1 (both worlds, same events where `same:true`, different messages where the villages act differently): the beetle summer,
   logging and the heating house (or the oil bill), the heavy-rain night (warning, group photos, Manfred's call, the morning article), the wind
   turbine decision, the blackout night (warning; in „Gewappnet“ „Alte Schule hat Strom und Wärme – kommt rüber“, in „Allein im Sturm“ „Hat
   jemand noch Strom?“; then no network; the radio). Realistic German in each genre (news, chat, call), short; the invented villagers only.
2. **Radio as the sound bridge:** between chapters (and under parts of the time-lapse) a fictional regional station – jingle (synthesise it
   with WebAudio or use a free sound with licence note), a newsreader with the year's regional headlines in two or three sentences, weather;
   in the blackout the battery radio is the only source (crackle). Ambience and voices duck under it (`ZKREGIE.duck`).
3. **Real videos of today** (the bridge from the future to now: „das passiert heute schon“): per chapter one or two carefully chosen real
   videos – the beetle in the Thuringian Forest, an energy village like Feldheim or a Thuringian Bioenergiedorf, heavy rain/floods in the
   region, preparing for a blackout – from reputable sources (public broadcasters, ThüringenForst, BBK, energy agencies). **Verify each one**
   (exists, German, recent, embeddable, the channel is who it claims) with WebSearch/WebFetch; list title, channel, date, URL and why. Embed
   only from `www.youtube-nocookie.com` and **load nothing before a click** (a still with title, source and „Video laden – Daten gehen an
   YouTube“); a plain link as fallback. Offered on the chapter-end card (a slot the workshop gives you) and in the phone („Videos“).
4. **Names:** a fictional news portal, a fictional radio station, a fictional village group – check with a quick search that none of the names
   is a real outlet or app (e.g. „inSüdthüringen“, „Freies Wort“, „Südthüringer Zeitung“, MDR programmes, „Ratscher aktuell“ – the latter is
   the Grenzland chat's satire chat). Everything marked „mögliche Zukunft“ where it shows the future.
5. **Contracts with the others** (the lead has told them): `ZKREGIE.before(fn)` – fn({ ev, w, place }) is called before a halt and may return
   a promise (the regie waits, max. 30 s); `ZKREGIE.between(fn)` – at chapter transitions, same; `ZKREGIE.snapshot(placeId, side) → Promise
   <dataURL>`; `ZKREGIE.duck(level)`; `WORKSHOP.slot('phone'|'card-extra')` → a DOM element for you; `WORKSHOP.layers.define({ id, icon, label,
   text, on, set })` for your layers „Handy-Meldungen“, „Radio“, „Videos“. Until they exist, stub them on your side; merge `origin/feat/zeitreise`
   often. If a contract does not fit, tell the lead at once.
6. **Voices:** calls, voice notes and the newsreader recorded free with the pipeline (`.github/workflows/stimmen.yml`, `tools/voices/`) on a branch
   `stimmen/zeitreise-medien` from yours (note the second-commit rule for new branches); merge the recordings back; fall back to the browser voice.
7. **Test** `zeitreise_medien.py` at 1920×1080: at the scripted events the phone shows push/group/call/alert, the snapshot photo appears, radio
   plays between chapters (audio started, ducking called), the video card shows the consent still and **no request goes to YouTube before the
   click** (check the page's requests), the layers switch them off, no page errors, screenshots. `tests.txt`: `smoke`, `zeitreise_medien`,
   `zukunft`.

Report as in the shared brief: sha, screenshots, the list of real videos with sources, the fictional names, open points.
