# Grenzland, Kapitel 2 Etappe 1 – Auftrag `alltag`: Tagesablauf der Leute, Feste im Kalender (17.11.2026, ~13:30)

First read `docs/plans/auftraege/grenzland4-gemeinsam.md` (ownership, interfaces, how to work) and `docs/plans/plan_kapitel2.md` (section 8,
„Dörfer“). Branch `feat/grenzland-alltag`, worktree `/home/claude/wt-grenzland-alltag`, port **9041**. Your files: new `gl_alltag.js`,
`gl_alltag_data.js`, `gl_feste.js`, `gl_feste_data.js` (in `viz3/src/grenzland/`), your tests, `viz3/extra/grenzland-alltag/`,
`docs/features/grenzland-alltag.md`.

Falko clicked (17.11. 12:26): **„Tagesablauf der Leute“** – „Morgens Bäcker und Schulbus, tagsüber Hof und Feld, abends Gasthaus und
Feldscheune, sonntags Kirche.“ – and **„Feste im Kalender“** – „Kirmes in Ratscher, Weihnachtsmarkt in Schleusingen, Feuerwehrfest – Musik,
Menge, Deckung für Missionen.“

## 1 The day of the village people (`gl_alltag.js`, `gl_alltag_data.js`)

- **Who:** about 10–14 people of Ratscher and 4–6 of Schleusingen, invented, with names and a little character. In Ratscher use the people who
  already write in the village chat „Ratscher aktuell“ (`GLRDATA.CHAT` and the chat lines in `gl_radio_data.js`: Ingrid, Uwe, Manfred,
  Heike, Wolfgang, Katrin, Jens …) – then the chat and the street are the same village. Not Hubert, not Ronald (they belong to the base game),
  nobody of the cast of chapter 1 twice (`GLDATA.CAST` in `gl_data.js`). Figures through `GLFIG` (Rocketbox characters of `CHARMAN`, clothes
  painted by body zone) – look how chapter 1 builds its people.
- **A day plan per person** (pure data and logic in `gl_alltag_data.js`, unit-tested): by `CLOCK.t` (minutes) and the weekday (`DN`) a place
  and a doing – mornings the shop on wheels at the Anger (`gl_wagen.js`, `GLDATA.ORTE.wagen`) and the bakery in Schleusingen, the school bus
  stop at the Anger (children about 7:00, back about 13:30 on school days – `strasse` drives the bus; meet it if `GLLINIEN` exists), the farm,
  the field, the workshop and the garden by day, the Feldscheune (`GLDATA.ORTE.treff`) and an inn in the evening, the church on Sunday
  morning, a dog walker late. Winter (November–February): indoors earlier, fewer people. Night: almost nobody. Real places of Ratscher and
  Schleusingen where they exist (look at the map labels, `KERN.place`, the base game's village props); an invented inn is fine.
- **Drawn only near the player** (≈ 200 m, at most ~8 figures at once): the rest are positions moving along their plan. They walk on paths
  and pavements, stand in twos and threes and talk (gestures, `GLFIG.geste`), sit on benches (`GLFIG.sitz`), carry a bag or a dog lead if the
  kit allows. When the player passes: a nod, a short greeting, a look away – by `GLRUF.stufe(ort)` (from `ruf`; fallback `'neutral'`).
  With E: one short fixed line per person and situation, German, the dry humour of the village chat (`STIMME.say`, `linien()`).
- **API:** `GLALLTAG.leute()`, `GLALLTAG.person(name)`, `GLALLTAG.tick(dt)`, `GLALLTAG.stop()`, `GLALLTAG.linien()`,
  `GLALLTAG.debug` (`zeit(min)` to set the clock in tests, `stand()`).

## 2 Festivals by the calendar (`gl_feste.js`, `gl_feste_data.js`)

- **Kirmes in Ratscher** (a weekend in autumn – look for a source on the real date; else the second weekend of October, and say so in the
  feature doc), **Weihnachtsmarkt in Schleusingen** (the Advent weekends, on the Markt), **Feuerwehrfest** (a weekend in summer, at the fire
  station or the Anger – find out where Ratscher's fire station is; invent nothing that says a real club did something it did not).
- Each with stalls built of the props kit (reuse materials), strings of lights at night (emissive, **no new lights**), a crowd (a few
  `GLFIG` near the player plus cheap stand-ins further away, or none), music (one media element, positional – see „Sound“ in the common
  part: a polka of the Kirmeswelle for Kirmes and Feuerwehrfest; for the Christmas market a free or public-domain piece – ask the lead in
  your report, he has the sound repository), things to do: a Rostbratwurst, a Glühwein or Kinderpunsch, a tombola, a dance floor.
- **Takes over the old random event `kirmes`** (`gl_ereignis.js`, owned by `strasse`, who switches it off when `window.GLFESTE` exists): read
  it and reuse its Kirmesbaum, stall and figures where that helps.
- **API:** `GLFESTE.aktiv()`, `GLFESTE.kalender(t)`, `KERN.emit('grenzland:fest', { id, an })`, `GLFESTE.tick(dt)`, `GLFESTE.stop()`,
  `GLFESTE.linien()`, `GLFESTE.debug.zu(id)` (jumps the date and clock to a festival – tests and Falko's look).

## 3 Tests and delivery

- `viz3/test/grenzland_alltag.py` with sections `:tag` and `:fest` (and `viz3/extra/grenzland-alltag/tests.txt` with both lines); unit tests
  for the day plans and the calendar; pictures: morning at the Anger, evening at the Feldscheune, Sunday at the church, the Kirmes at night,
  the Christmas market, the Feuerwehrfest. Memory with `viz3/test/grenzland_speicher.py` (your share in the feature doc).
- Report as in the common part; in the feature doc „Für den Lead“: the two lines for `gl_modus.js` if you did not add them, what
  `ruf`/`strasse` should call, open wishes.
