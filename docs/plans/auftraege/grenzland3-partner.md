# Grenzland, Runde 3 – Auftrag `partner`: jederzeit mit der Partnerin / dem Partner reden (13.11.2026, ~21:00)

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Code comments English, the UI German.
Read first: `docs/plans/auftraege/grenzland2-gemeinsam.md` – sections „Interfaces“ (voices: fixed strings, `X.linien()`) and „How to work“
(build, checks, tests, browser lock, CI annotations, hard rules, commit identity). What differs for you is below.

## What Falko wants (verbatim)

- 13.11. 20:33 (screenshot: Falko calls Sarah on the phone at the bus stop in Schleusingen, Sarah stands in front of him and answers „Ja? Ich
  bin noch im Garten.“): „Schau mal, das macht keinen Sinn. Sie sagt, sie wäre im Garten, dabei steht sie vor mir in Schleusingen.“
  → **fixed by the lead** (`edd72b2f`, `GLHANDY.rufZeilen(id)`: a call goes by where the one called is – in sight „ich steh doch hier“, else
  garden / village / Schleusingen / Talsperre / wood). Build on it, do not undo it.
- **13.11. 20:37:** „Ich möchte aber die Möglichkeit haben, ständig mit der Partnerin bzw. mit dem Partner zu sprechen. Also wenn ich vor
  Sarah stehe, dann möchte ich mit Sarah sprechen können, möglichst mit KI. Oder relevante Themen rund um die Quests und umgekehrt genauso.“
  („umgekehrt“: playing Sarah, talk to Falko the same way.)

## What to build

1. **Talk to the partner anywhere in today's Grenzland** (not in 1989 – the partner is not there; not during a scripted talk or a kino
   scene `body[data-gl-kino="1"]`; not while a mission line is being spoken): standing near the partner (≈ ≤ 3 m, roughly facing) a prompt
   appears in the mode's style – e.g. „E · Mit Sarah reden“ / „Mit Falko reden“; the key opens the talk. Find how the mode offers E-actions
   today (the base game's interaction prompts, `PLAY`, `KERN` providers) and use that; if E is taken there, choose a free key and document it.
   During the talk the partner stops (no following), turns to the player (`GLFIG.blick(F, 'spieler')`), mouth moves while speaking; after the
   talk the partner follows again as before (`GRENZLAND.folgen`, `GL.folgt`). Riding together in a car or on the Simson: talking should work
   there too if you can make it clean (GTA has banter on drives) – your call, document it.
2. **With AI (preferred, Falko: „möglichst mit KI“):** the game has free AI talks already – `viz3/src/npc/ki.js` (+ `ki_core.js`, `ki_text.js`):
   voice or text in, Claude Haiku answers, spoken by the person's voice, memory per person; key and settings under Menü → Einstellungen →
   „KI-Gespräche“ (`KI.ready`). Register the partner as a person through **`KI.person({ key, name, g, age, role, sheet, intro, start, pos, mouth,
   sub, show, host, close, line })`** (example: `viz3/src/verkehr/verkehr.js` ~l. 820) – two persons, e.g. `gl_p_sarah` and `gl_p_falko` (who is
   the partner depends on whom one plays; `GL.wer`, `GL.other()`, `GL.name()`), your own panel as `host()` (the AI puts its microphone and text
   field there), then `KI.talk(key)` / `KI.ended(key)`.
   - **Character sheets** (German, second person „Du bist …“): Sarah and Falko are a couple from Berlin with a garden in Ratscher; in Grenzland
     they got pulled into the story of chapter 1 (an old border map from 1989, the moped clique Jule/Timo/Basti, Gerhard the village chronicler,
     the invented haulier Krähwinkel and his depot). Tone like GTA: dry humour, banter, loyal to each other, adult, no explicit content. Real
     people play no villain: Hubert, Ronald and real firms are never culprits or targets (the site is public). They talk like a couple
     („du“, nicknames sparingly), short sentences.
   - **Quest-aware:** each turn the AI must know the current state: chapter, current mission and step with its objective text (what the
     journal / `GLMISSION` shows), what is done, stars and what the police know (`GLFAHNDUNG.stand()`), time, place, whether they ride
     together, money – and the story so far as a short recap per mission done. The AI's per-turn block is built in `ki.js` `sit()` /
     `ki_core.js` `situation()`; today it carries the garden's building phase and the base game's tasks, which are wrong here. **You may make a
     small additive change in these two shared modules:** an optional adapter hook, e.g. `lage()` → text lines for `<lage>`, and when it is
     there skip the building phase and the base tasks (or let the adapter supply `aufgaben()`). Nothing else changes for the other people;
     run the existing AI tests (`viz3/test/` – look for `ki*.py`, unit tests `viz3/test/unit/ki*.test.mjs`) to prove it.
   - The village tools (`aufgabe_geben` with village places, the gossip to Hubert/Ronald) do not fit the partner: if `ki_core.js` cannot
     already leave them out per person, add an optional profile flag for that (additive, default unchanged).
   - Partner actions through the existing `spielaufgabe` tool and the adapter's `themen()` / `quest(q)`: at least „mitkommen“ / „hier warten“
     (`GRENZLAND.folgen(true/false)`); more if it is clean (e.g. „zum nächsten Ziel“ shows the objective on the radar).
3. **Without AI (no key, or AI off) – topics like GTA's dialogue choices:** 3–5 chips in the panel, with fixed, recorded lines by mission
   state: „Was machen wir jetzt?“ (the partner says the current objective in her/his words – one line per mission step of chapter 1, both
   voices), „Was wissen wir bisher?“ (recap by progress), „Alles gut bei dir?“ (banter, a few variants, by stars / time of day / after a chase),
   „Komm mit“ / „Warte hier“. Every line a fixed string in a data module, offered by **`GLPARTNER.linien()`**; add `GLPARTNER` to the
   collector `tools/voices/grenzland_linien.mjs` (it prints which modules it read) and run it, so the workflow `stimmen_grenzland.yml` records
   the lines when the list changes on your push (it commits the recordings back with `[skip ci]`; pull before you push again).
4. **Optional, if time is left:** with AI ready, calling the partner on the phone while far away becomes an AI phone call (the call screen of
   `viz3/src/handy/` as the panel; `GLHANDY.rufZeilen` stays the fallback without AI).

## Files (yours)

New `viz3/src/grenzland/gl_partner.js` (+ `gl_partner_data.js` if useful), one line each in `viz3/src/modules.txt` inside the `# feat/grenzland`
block (after what they import); the small hooks in `viz3/src/npc/ki.js` and `viz3/src/npc/ki_core.js`; `tools/voices/grenzland_linien.mjs`
(add your module); tests `viz3/test/grenzland_partner.py` (+ unit tests `viz3/test/unit/grenzland_partner*.test.mjs` for pure logic),
`viz3/extra/grenzland-partner/tests.txt`; feature doc `docs/features/grenzland-partner.md` (German, with „Für den Lead“).
Read-only (hook in from your module, ask the lead in your report): `gl_modus.js`, `gl_hud.js`, `gl_handy.js`, `gl_mission*.js`, `gl_fig.js`,
everything else outside `viz3/src/grenzland/`.

## Tests (must pass before your last push)

Without a key: near the partner the prompt shows, the key opens the panel, each chip plays the right fixed line for the mission state (check
two states, e.g. mission 1 step 1 and free play after chapter 1), „Warte hier“ stops the following and „Komm mit“ resumes it, Esc/the key
closes, nothing in 1989, nothing during a kino scene; playing Sarah and playing Falko. With AI: no real API call in tests – check that both
persons are registered (`KI.people()`), that the `<lage>` text built for the partner carries the current objective and the stars, and that the
other people's `<lage>` is unchanged (a unit test on `ki_core.situation`). Pictures of the prompt and the panel (desktop and phone layout) in
`out/grenzland_partner/` – look at them.

## Worktree, timetable, report

- Worktree `/home/claude/wt-g2-welt`, branch **`feat/grenzland-partner`** (from `feat/grenzland` `edd72b2f`, with this brief), port **9016**.
  Push `git -c push.negotiate=true push -u origin feat/grenzland-partner`; never to `src`, `live`, `feat/grenzland`.
- **Deliver by 22:15 (Berlin, `date`)**: pushed, `bash tools/check.sh` green, your test green here (and on Actions if it ran). A solid half
  (topics without AI + the AI person with quest context) beats a shaky whole. Push small increments.
- Falko is around but busy: do not ask him; decide and write it into the feature doc. Do not spawn agents.
- Finish with a report: branch and last commit, what works and how it was tested (picture paths), what is open, wishes for the lead.
