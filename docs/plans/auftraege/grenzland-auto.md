# Auftrag Hilfs-Agent `grenzland-auto` – Fahrzeuge realistisch, Cockpits (13.11.2026)

Branch `feat/grenzland-auto`, Worktree `/home/claude/wt-gl-auto`, Port 9012. Gemeinsamer Teil: `grenzland-gemeinsam.md` (zuerst lesen).

---

**Your topic: the vehicles of the mode „Grenzland“ – make them look as real as possible, with a detailed view from the driver's seat.**
Falko saw the first, boxy vehicles (13.11. 1:14): „… bitte achte darauf, dass die Fahrzeuge möglichst realistisch aussehen und auch die
Innenansicht, also die Cockpit-Variante, schön detailreich ist …“. And he chose: the vehicles of 1989 recognisable like the real types, with
their names in the texts – no logos or badges on the models.

Your files: `viz3/src/grenzland/gl_modelle.js` (GLMOD – the models), `gl_auto.js` (GLAUTO – driving; keep its interface, the police and the
missions call it), `gl_cockpit.js` (GLCOCKPIT – new).

What to build, in this order (each step working and pushed before the next):
1. **Bodies that look like vehicles, not boxes.** Replace `bodyGeo` by a real body builder: a body lofted from cross-sections along its
   length (rounded corners, tumblehome, wheel arches cut in, a windscreen and windows as their own surfaces, pillars, door seams, bumpers,
   grille, lamps, mirrors, wipers, number plates without numbers), smooth normals where a surface is curved. The player's own car
   (`viz3/src/vehicles/car.js`) and the traffic's cars (`verkehr/verkehr_auto.js`) show what this project already does – read both; yours
   must look clearly better than the traffic's and fit beside the player's car. Stay with vertex colours in `VFIG.mat()` for the painted
   parts (one program); for glass and chrome reuse or clone materials that exist in the scene (the player's car has them) rather than
   inventing new shader variants – check the program count before and after (`GAME.R.info.programs.length`).
2. **The types** (measures and proportions of the real ones – research them, cite your sources in your feature doc):
   - today: a patrol car (an estate of today, silver/blue foil with the neon-yellow stripe, a light bar that flashes – `c.blau`),
     a panel van (white – the haulier Krähwinkel's), an ordinary small estate;
   - 1989: **Trabant 601** (limousine and Universal; the pastel colours of the time), **Wartburg 353** (also as the Volkspolizei's
     „Funkstreifenwagen“ – research its real livery of 1989 and its single blue beacon), **Barkas B 1000** (van/bus), **W 50** (flatbed
     lorry), a **Lada** saloon if time allows;
   - two-wheelers: **Simson S 51** and the **Schwalbe (KR 51)**, for the clique today (old mopeds are what a moped clique in Thuringia
     rides) and for 1989.
   Keep `GLMOD.TYP` keys that exist (`streife`, `kombi`, `kasten`, `limo89`, `klein89`, `lkw89`, `moped`) working (alias them to the new
   types) – the police module spawns `streife` and `limo89` with the options `{ col, band, band2, bar }`.
3. **The player's moped** (`GLAUTO.mopedVeh`, a vehicle of `vehicles/vehicle.js` with id `gl-moped`): the S 51 model; the rider is the
   player's own figure (the avatar sits on it – look at a picture and adjust seat, eye point, lean); tune the physics so that it rides
   like a 50 cm³ two-stroke (about 60 km/h, lively, light), sounds like one (the vehicle's own sound is `VSND` – read `vehicles/vsound.js`;
   if it cannot do a two-stroke without editing it, add your own in your files) and leans into curves.
4. **A car to drive in 1989: the Trabant.** `GLAUTO.trabiAt(x, y, hd)` / `trabiHide()` like the moped (id `gl-trabi`): two-stroke sound,
   26 PS, four gears, about 100 km/h, soft springs.
5. **The cockpits** (`gl_cockpit.js`): what one sees from the driver's eyes (`CAM3`/`V` switches to the eyes – read `vehicles/vehicle.js`
   `applyCam`, `eyeW`, and how the player's car shows its inside):
   - S 51: handlebar that turns with the steering, the round speedometer with a moving needle (to 100 km/h), the lamp housing, the
     mirror(s), the tank with its filler cap, the fuel shown as the real thing has it or as a small mark; the hands on the grips if
     you can do it well, else none;
   - Trabant: the thin two-spoke steering wheel that turns, the speedometer with needle, the few pull knobs and switches, the
     dash-mounted gear lever, the glove shelf, the heater slider, the radio of the time in the dash (its dial shows the station of
     `GLRADIO.cur()`), the bonnet's edge ahead, wipers, the mirror;
   - the instruments must read the truth (speed from `VEH.cur.st.u`, fuel from `GL.tank` for the moped), lit at night without a new light.
   Detailed and beautiful is the point here – Falko asked for it explicitly. Look at your pictures.
6. **Fuel:** the moped's tank is `GL.tank` (litres, the lead's mode module burns it); show it in the cockpit and in the vehicle's HUD
   if there is a clean way without editing other chats' files.

Test: `viz3/test/grenzland_auto.py` (every type spawns, parks on the ground, drives a line; the moped and the Trabant ride; pictures of
every type from outside in three-quarter view and of both cockpits by day and at night; program count; 16-texture limit with
`lib.check_gl`). Unit tests for anything pure. Feature doc `docs/features/grenzland-auto.md`.
