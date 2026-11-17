# Grenzland, Kapitel 2 Etappe 1 – Auftrag `strasse`: Verkehr mit Ziel, Begegnungen unterwegs, Rast an der A 73 (17.11.2026, ~13:30)

First read `docs/plans/auftraege/grenzland4-gemeinsam.md` (ownership, interfaces, how to work) and `docs/plans/plan_kapitel2.md` (section 8,
„Straßen“). Branch `feat/grenzland-strasse`, worktree `/home/claude/wt-grenzland-strasse`, port **9043**. Your files: new `gl_linien.js`,
`gl_linien_data.js`, `gl_rast.js`; and now yours: `gl_ereignis.js`, the table `EREIGNISSE` (only it, with its unit test) in `gl_logik.js`,
`gl_typen.js` (new vehicle types only) – all in `viz3/src/grenzland/` – your tests, `viz3/extra/grenzland-strasse/`,
`docs/features/grenzland-strasse.md`. Winter (snow, ice) is **not** stage 1.

Falko clicked (17.11. 12:26): **„Verkehr mit Ziel“** – „Schulbus, Milchlaster, Holztransporter, Streifen mit festen Runden – und Krähwinkels
Lkw zum Verfolgen.“ – **„Begegnungen unterwegs“** – „Anhalter, Panne am Straßenrand, Blitzer, Jäger am Hochsitz (Wildwechsel und Nebel sind
schon geplant).“ – and **„Rast an der A 73“** – „Tankstelle mit Kasse, Imbiss, Lkw-Parkplatz – Treffpunkt, Versteck, Ausspähen.“

## 1 Traffic with a purpose (`gl_linien.js`, `gl_linien_data.js`)

- Vehicles with a reason and a timetable, driven with `GLAUTO` (`spawn`, `route`, `onLine`, `drive`, `remove`; read `gl_auto.js` first and
  how chapter 1 drives its cars): the **school bus** Schleusingen ↔ Ratscher with a stop at the Anger (about 6:50/7:20 and 13:15/14:40 on
  school days; children get on and off – small figures if cheap, `alltag` sends its children to the stop if `GLALLTAG` exists), the **milk
  lorry** on its morning round of the farms, the **timber lorry** loaded with logs out of the forest by the Klinge, a **patrol** with a fixed
  round when the wanted level is 0 (read `gl_fahndung.js`; your patrol must not fight its cars – hand over or step aside when a star comes,
  through its public API; describe any hook you need for the lead), and **Krähwinkel's lorries** (the invented haulier of chapter 1,
  `gl_lager.js`, its yard „Außenlager Krähwinkel“): tours between the yard, the A 73 and the rest stop, so that chapter 2 can follow them
  (`GLLINIEN.folgen(id)` → the tour).
- Types: what `gl_typen.js` has (cars, vans, the lorry); a bus, a milk tanker or a timber lorry you may add there with the `GLKAROSSE` kit –
  realistic proportions, invented markings, no logos.
- Few vehicles, each with a reason. Only near the player: spawn on the way in, vanish out of sight; simulate the rest as positions on the
  timetable. Frame time and memory low (count draw calls in your test).
- **API:** `GLLINIEN.fahrzeuge()`, `GLLINIEN.folgen(id)`, `GLLINIEN.tick(dt)`, `GLLINIEN.stop()`, `GLLINIEN.debug`.

## 2 Encounters on the way (`gl_ereignis.js`)

- New kinds next to the existing ones (blitzer, traktorstau, korso, boeller, wildunfall): a **hitchhiker** (pick up, drive to a place, a tip
  or a word about the region; now and then an odd one), a **breakdown** (a car with its hazard lights at the roadside – help: a tow, a can of
  petrol, a push; money or Ruf), a **hunter on his high seat** at dusk at the forest edge (a shot in the distance, he waves you off the
  meadow, or wants a lift with his rucksack – calm, nothing gory). Add them to `EREIGNISSE` in `gl_logik.js` (with where/when like the
  others) and to its unit test; each with a point on the radar like the others, cleared away when over or left behind, a good deed calling
  `GLRUF.add(…)` when `window.GLRUF` exists.
- **Switch off the old `kirmes` event when `window.GLFESTE` exists** (`alltag` brings the fair by the calendar).
- **API:** as today (`GLEREIGNIS.*`), plus `linien()` for the new spoken lines.

## 3 A rest stop on the A 73 (`gl_rast.js`)

- A petrol station with a till (an invented brand, no real logo), a snack bar, a lorry park – at a plausible place by the A 73 (the roads of
  kind `motorway` in the road data; the map label „A 73“ lies at about x 1609, y −89; look at the exits near Schleusingen and how far the
  detailed terrain reaches – if the motorway itself is too far out, a filling station at the junction is fine; say what you chose and why).
- Things to do: refuel (the mode already refuels – read `GL.emit('getankt')` in `gl_modus.js` and use the same path), buy a coffee or a
  sandwich (`GL.pay`), sit in the snack bar; at night Krähwinkel's lorries park there. A place for chapter 2 meetings: `GLRAST.ort()`.
- **API:** `GLRAST.ort()`, `GLRAST.tick(dt)`, `GLRAST.stop()`, `GLRAST.linien()`, `GLRAST.debug`.

## 4 Tests and delivery

- `viz3/test/grenzland_strasse.py` with sections `:linien`, `:begegnung`, `:rast` (and `viz3/extra/grenzland-strasse/tests.txt`); unit tests
  for the timetables and the new event kinds; existing tests that use `GLEREIGNIS` or `GLLOGIK.plan` must stay green (find them with grep).
  Pictures: the school bus at the Anger, the timber lorry on the forest road, a breakdown at dusk, the rest stop at night.
- Report as in the common part; in the feature doc „Für den Lead“: the lines for `gl_modus.js` if you did not add them, what `alltag` and
  `ruf` should call, open wishes.
