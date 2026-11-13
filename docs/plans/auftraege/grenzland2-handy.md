# Auftrag `handy` – ein gemeinsames Handy für alle Welten (13.11.2026, ~13:35)

Read `grenzland2-gemeinsam.md` first (same folder) – its rules (tests, browser lock, commits, no questions to Falko, timetable) hold for you
too. Worktree `/home/claude/wt-g2-handy`, branch **`feat/handy`** (CI: `viz3/extra/handy/tests.txt`), port **9017**.

## What Falko wants (verbatim, 13.11.2026 13:09)

„Achte auch darauf, dass das Handy im Spiel realistischer aussieht. Die Chats und vielleicht, wenn er auf das Handy schaut, irgendwie das
Handy dann eben vors Gesicht gehalten wird. Und außerdem ja realistischer aussieht vom Gerät her. Und außerdem sind die Chats halt sehr, wie
soll ich sagen, schlecht dargestellt. Also man scrollt von links nach rechts zum Beispiel gerade, anstatt ganz normal wie bei einem vertikalen
Handybildschirm von oben nach unten. Es sollten auch irgendwie Apps auf dem Handy sein, die man starten und schließen kann. Alles Mögliche
soll man sozusagen, oder sehr vieles soll man am Handy eben machen können. Und natürlich auch Personen anrufen und so weiter. Aber diese
Bewegung, das Handy in die Hand zu nehmen, vielleicht sogar zu drücken, das muss gut aussehen und sollen noch später weitere Funktionen
freigeschaltet werden können und so weiter. Überleg dir da mal ein sehr gutes Modell, dann kann das nämlich auch die anderen Chats nutzen.
Zum Beispiel arbeiten wir hier parallel an einem Zukunftsszenario-Chat, wo Bilder der Zukunft und Szenarien der Zukunft erzeugt werden. Auch
hier spielt das Handy eine Rolle und es wäre gut, wenn ihr euch hier gemeinsam ein gutes Handymodell teilen könnt, das natürlich jeweils in
der jeweiligen Welt auch andere Inhalte haben kann oder hat.“

## What exists

`viz3/src/grenzland/gl_handy.js` (`GLHANDY`, 745 lines, from the night): a phone-shaped panel with seven **tabs** in a row (that is the
sideways scrolling Falko means) – Nachrichten, Dorf-Chat, Feed, Bank, Notizen, Kamera, Radio; T opens it. Its public API is used by the
missions, the police, the radio and the tests (header of the file) – **keep every function of it working** (`sms, chat, feed, note,
open(tab), close, toggle, isOpen, unread, tick, stop, kamera(o), foto, cam, zu, unlock`, the events). Look at it in the game:
`viz3/test/grenzland_radio.py` and `grenzland_mission.py` open it; pictures from the night in `out/grenzland_blick/03_handy.png`,
`04_handy.png`.

## The model (decide the details yourself, write them into `docs/features/handy.md` – the Zukunft chat reads it)

A **shared phone** in a new folder **`viz3/src/handy/`** that knows no world; a world (Grenzland now, the Zukunft chat later, others) brings
its content and its own apps. Suggested shape – improve it:

- `handy.js` – **`HANDY`** core: the device and its little operating system. A realistic modern slab phone without brand or logo (thin
  bezel, rounded corners, a camera pill at the top, side buttons, glass sheen), shown upright: on wide screens at the lower right like GTA's
  phone (about a third of the height), on phones large in the middle. Lock screen (time, date, notifications) → home screen (app grid,
  dock, page dots if more apps) → apps that **open and close** with an animation from their icon; home bar (swipe up / click / Esc / T)
  closes the app, back (← button, swipe from the left edge, Backspace) goes back. **Everything scrolls vertically**, natively (overflow-y,
  momentum on touch, overscroll contained) – no horizontal tab rows. Status bar with the world's time, signal (weak out in the country is
  fine – realism), battery. Notifications: a banner drops in from the top (sound, a tap opens the app), badges on icons. Sounds synthesised
  (taps, notification, ringtone, shutter) – nothing licensed. Keys and touch both work; while the phone is open the game's mouse look must
  not fight it.
- **Worlds:** `HANDY.welt(id, cfg)` makes a world's phone current (`HANDY.welt(null)` – none; in Grenzland's 1989 there is no phone):
  name, wallpaper, the clock (`zeit()`), which standard apps in which order, data providers (contacts, chats, feed, bank, notes, photos,
  places) and actions (send a reply, call somebody, a photo was taken, „show on the map“). `HANDY.app(id, { name, icon, … render(el, ctx) })`
  for a world's own apps. **Unlocking later:** `HANDY.freischalten(appId)` / a locked app shows greyed („kommt später“) – Falko wants
  functions added over time.
- **Standard apps** (generic renderers fed by the world): **Nachrichten** (threads list → conversation: bubbles left/right, times, read
  ticks, typing dots, reply choices as chips like GTA's dialogue answers), **Telefon** (favourites, recents, contacts; call screen calling /
  ringing / incoming with the person's initials or picture, timer, mute, speaker, end; the world says what is said – lines go through
  `STIMME.say` like everywhere else, subtitles through the world), **Kamera** (viewfinder over the real picture, shutter, a real snapshot
  from the renderer → **Fotos**), **Karte** (the world's places and a waypoint; Grenzland emits `grenzland:ziel`), **Feed** (posts with
  pictures, likes, „LIVE“), **Bank**, **Notizen** (with source links), **Einstellungen** (wallpaper, sounds, read aloud), **Uhr**. Use what
  fits; keep it fast (DOM/CSS, no canvas UI).
- `handy_pose.js` – **the hold** (the part Falko stresses): when the phone is taken out while walking or standing, the player's avatar raises
  it in the right hand in front of the chest/face and looks down at it (bone overrides after the frame's animation update – look how agent
  `figuren` does it in `viz3/src/grenzland/gl_pose.js` on `origin/feat/grenzland-figuren`, but do not import Grenzland code into
  `handy/`), the thumb taps when the player taps, a call puts it to the ear; putting it away lowers it. A phone prop in the hand: a thin
  rounded slab whose screen glows in the app's colours. Smooth in and out (~0.35 s). In a vehicle: no hold pose (UI only). The third-person
  camera may ease a little closer over the shoulder while the phone is up.

## Grenzland as the first world

Turn `gl_handy.js` into Grenzland's world adapter on top of `HANDY` (you own `gl_handy.js` from now on – agent `welt` was told to stay out
and to post with `GLHANDY.feed(wer, text, ort, { img, live })`; render `img` and `live`): the story messages and the village chat become
threads, the feed, bank, notes, photos, the radio app, contacts (Sarah/Falko, the clique, Yuki, …) with calls; the mission camera
(`GLHANDY.kamera(o)`) becomes the camera app. Same saved data (`GL.sms`, `GL.feed`). The tests of the mode must stay green
(`grenzland_mission`, `grenzland_radio`, `grenzland`, `grenzland_ruhe`; run them on Actions via your `tests.txt`).

## Files

Yours: new `viz3/src/handy/**`, `viz3/src/grenzland/gl_handy.js`, CSS inside your modules (no shell CSS), the lines for your modules in
`viz3/src/modules.txt` (`handy/` before the `# feat/grenzland` block, so Grenzland can import it), `viz3/test/handy*.py`,
`viz3/test/unit/handy*.test.mjs`, `viz3/extra/handy/**`, `docs/features/handy.md`. Nothing else outside – the HUD (`gl_hud.js`, `#gltouch`,
the ☎ button) is the lead's: tell him what you need.

## Tests and pictures

`viz3/test/handy.py` (Grenzland free play like in the common part): T opens the phone – lock or home screen, the apps; open Nachrichten,
a thread scrolls vertically (scrollHeight > clientHeight, scrollTop moves on wheel); back; Telefon → call a contact → call screen → end;
Kamera → shutter → Fotos has the picture; a notification banner; a locked app unlocks; the hold: with the phone open the right hand bone is
near chest/face height and the phone prop visible, after closing it is down again; desktop 1100×680 and a phone profile (portrait). Pictures
in `out/handy/` – **look at them**: it has to look like a real phone in a real hand. Lines for CI in `viz3/extra/handy/tests.txt`.

## Timetable

Merges at **15:45** (and a later one if needed – say in your report). A solid core (device, home screen, apps open/close, vertical chats,
calls) with Grenzland on it beats a half-finished everything.
