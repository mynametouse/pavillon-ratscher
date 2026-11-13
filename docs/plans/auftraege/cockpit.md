# Auftrag `cockpit` – realistische Innenansicht der Autos, Spiegel, Wischer, Blinker, Navi; Grafik beim Bewegen einstellbar

Gestartet am 13.11.2026 ~16:10 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv (großes Modell). Branch `feat/cockpit` von `origin/src`, Worktree
`/home/claude/wt-cockpit`, Port 9016. Falko 15:54 (Auszug): „… das Standardfahrzeug, also dieser Dacia Logan … noch viel realistischer … bisher
noch etwas eckig … nicht so spielzeughaft … auch die Innenansicht sollte realistisch sein mit Tacho, bewegtem Lenkrad, Händen am Lenkrad, Schalten
und so weiter. Das gilt im Prinzip auch für die anderen Autos und Fahrzeuge. Auch Spiegeleffekte … wenn ich fahre … dass dann die Grafik ein Stück
weit reduziert wird … Ich möchte es zumindest optional ein- und ausschalten können oder die Stärke einstellen können …“ Entschieden (zum Anklicken,
16:05): **Karosserien baut der Straßen-Chat** (auch den Kombi), **dieser Chat das Innere**; Schalten: **Automatik, Hand sichtbar**; dazu **echte
Spiegel, Scheibenwischer bei Regen, Blinker und Lichtschalter, Navi in der Mitte**; Grafik beim Bewegen: **Stufen und Automatik** mit
Bildraten-Anzeige. Wörtlich (englisch):

---

You are a helper agent of the chat (your lead) that builds, together with Falko, his browser 3D world "Pavillon Ratscher" (three.js r169, ES
modules, German UI, English code comments): his garden near Ratscher (Thuringian Forest), the real village and region as a mirror world, drivable
vehicles (his estate car, a tractor; traffic cars one can stop and drive). Read `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`,
`docs/plans/auftraege/nacht-6-11-gemeinsam.md` (how helpers work here) and `git show origin/src:docs/PARALLEL.md` (who works on what – the
**Straßen-Chat** builds realistic vehicle bodies in `verkehr/vk_*.js` with the Grenzland chat's `grenzland/gl_karosse.js`; never edit their files).

**Your part: the inside of the cars – what the driver sees and touches – and a graphics setting.** You own new files `viz3/src/vehicles/cockpit*.js`
(global `COCKPIT`), `viz3/test/cockpit.py`, `viz3/extra/cockpit/tests.txt`, `docs/features/cockpit.md`; minimal marked hooks (`// feat/cockpit: …`)
in `vehicles/car.js`, `vehicles/vehicle.js`, `vehicles/minimap.js`, `render/render.js`, `shell/menu.html` and the settings code.

0. **First, as its own small push: the motion graphics setting.** Today `render/render.js` (`MOTION`, `MLEVELS`, `setMotionLevel`) draws moving
   frames from a cheaper path (lower resolution, no ambient occlusion, no SMAA), its level adapting to the measured frame rate (target ≥ 50 fps).
   Add under Menu → Einstellungen → Grafik „Beim Bewegen“: *Automatisch* (as today), *Volle Qualität* (no reduction), *Leicht*, *Mittel*, *Stark*
   – each with a one-line explanation – plus „Bildrate anzeigen“ (a small fps counter). Saved per browser (try/catch, the app's `SAVE`); the
   automatic stays the default. Test it; push; report.
1. **The cockpit of Falko's estate car** (the driver view, key V): a realistic dashboard and console instead of today's simple one – instrument
   cluster with speedometer (0–200 km/h) and rev counter whose needles follow the physics (`VEH`: speed, rpm, gear), fuel gauge, warning lights,
   odometer, clock; backlit at night. The **steering wheel turns** with the steering angle (a realistic ratio, ~15:1), **the player figure's
   hands on it** (reuse the first-person arms the zombie night built for its Ich-Sicht – find them, don't duplicate), hands following the wheel;
   with the automatic gearbox **the right hand reaches to the gear lever when a gear changes** and returns; pedals; seat, door panels, A-pillars,
   sun visors, the roof lining – modest polygon counts, merged, no toy look (soft bevels, real materials: dark grained plastic, fabric, chrome).
   Generic: no maker's logo or a copy of a real brand's design.
2. **Mirrors:** the interior and both door mirrors show what is behind, live (render targets at low resolution, updated at 15–30 Hz, mirrored
   view, sensible near/far, no shadows inside them); a setting „Echte Spiegel“ (on for desktops, off on phones by default); within a frame budget.
3. **Wipers** move when it rains (the weather system `wetter/` knows rain: interval, normal, fast by intensity), drops on the windscreen if cheap.
4. **Indicators and lights:** stalks that move, blinking arrows in the cluster with the click, the light switch (today key L: automatic/on/off)
   shown in the cluster; pick free keys for the indicators (check every existing binding) and add them to the help. The exterior lamps belong to
   the body: agree with the Straßen-Chat through `docs/PARALLEL.md` on a state they read (e.g. `blink: 'L'|'R'|null`, `lights`) – until then light
   today's lamps in `car.js`.
5. **Navi in the middle:** a screen in the centre console showing the route and the goal (render the existing minimap's content into it);
   while it is in view the corner minimap can hide (setting).
6. **Other drivable vehicles:** the same cockpit sized for the traffic cars one can drive (types and measures from the Straßen-Chat's table,
   read only), the tractor's cab (wheel, hands, simple gauges) – after 1–5, as far as time allows.
7. **The bodies come from the Straßen-Chat.** Their new body for the estate (same size and class) will replace today's in `car.js`; build your
   cockpit relative to a seat/H-point and the wheel position so it fits theirs, keep it in its own group they do not touch, and write the anchor
   points you need into `docs/features/cockpit.md`. Post the agreement in `docs/PARALLEL.md` (on `src`, docs-only commits; read it first).
8. **Budget:** no new shader programs after load except those compiled once when the cockpit is first needed (warm them at that moment, not every
   time); mirrors and the cockpit within a frame budget you measure and report; phones work; no page errors.
9. **Test** `cockpit.py`: the setting changes the motion level and is kept after a reload; fps counter shows; in the driver view the cockpit is
   there, the speed needle moves when accelerating, the wheel turns when steering, hands are on it, a gear change sends the hand to the lever,
   mirrors render (and are gone when switched off), rain moves the wipers, indicators blink, the navi shows the map; programs and draw calls in
   budget; a phone width works. `tests.txt`: `smoke`, `cockpit` and the existing driving tests (look which ones in `viz3/test/`).

Rules: work only in your worktree on `feat/cockpit`; merge `origin/src` now and then; never push to `src` or `live`; no force push; browser runs
only via `bash tools/browser_lock.sh` on port 9016; GitHub's runners are congested – push real increments only (part 0 first, then about hourly),
run your test locally before pushing. Credits are scarce: read with `rg` and line ranges, few screenshot rounds. Report to the lead (SendMessage to
`main`) on every green push with screenshots of the driver view (day, night, rain), then a final report and stop.
