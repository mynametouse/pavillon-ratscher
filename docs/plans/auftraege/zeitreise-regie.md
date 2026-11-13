# Auftrag `zeitreise-regie` – Zeitraffer, Kamera, Halte, Stimmen, geteiltes Bild

Gestartet am 13.11.2026 ~13:30 (großes Modell). Branch `feat/zeitreise-regie` von `origin/feat/zeitreise`, Worktree
`/home/claude/wt-zeitreise-regie`, Port 9012. Gemeinsamer Teil: `zeitreise-gemeinsam.md`. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/zeitreise-gemeinsam.md` (team, contracts, big-screen rules, later screens and VR – they apply to you).

**Your part: the director – time, camera, the halts, the voices and the split screen.** You own `viz3/src/zukunft/zk_regie*.js` (global
`ZKREGIE`, contract in the shared brief), `viz3/test/zeitreise.py`, `viz3/extra/zeitreise-regie/tests.txt`, `docs/features/zeitreise-regie.md`;
minimal marked hooks in core files (render loop, camera, clock) where you cannot do without.

1. **API skeleton within ~45 minutes, pushed** (start/play/pause/next/prev/seek/speed/stop/state/on with a fake timeline), so `workshop` can
   wire its overlays and keys to it. Until `ZKCHRONIK` and `ZKZEITWELT` land, use stubs with the same contract; merge `origin/feat/zeitreise`
   often.
2. **The timeline player:** from `ZKCHRONIK.events(w)` of the pair; between events a time-lapse (default ~2 s per year, speed adjustable), a
   fixed time of day per chapter while the days advance (seasons, the sun's height – no day–night flicker); at an event with `halt > 0`:
   ease out of the time-lapse, cross-fade to the event's place, set its date, hour and weather, run the event's phase (water rising, lights
   going out), play its lines (voice + `line` events for the subtitles), hold, then continue. Chapter ends emit `card` (the workshop shows
   `kpi()` and the questions) and wait for „next“. `seek`, `next`/`prev` jump between events and chapters cleanly. `stop()` restores clock,
   weather, camera and world exactly as before.
3. **Places and camera:** poses for the place ids (`anger`, `hang`, `waldrand`, `kahlflaeche`, `strasse`, `bruecke`, `heizhaus`, `windrad`,
   `schule`; built things via `ZKZEITWELT.place(id)`): find views that *show* the change – from the Anger past the Dorflinde to forested slopes;
   an overview from the slope; eye height at the edge of the family forest at the Klinge; the street in the flood area; the old school at night.
   Calm moves only (slow dolly or pan, none in halts – VR later), ~1 s cross-fades, eye height 1.65 m on foot. Find out how the app's camera,
   clock (`time/clock.js`, `time/daynight.js`), weather presets (`wetter/`) and scenes (`KERN.scenario`) are controlled and use those APIs.
4. **Split screen:** both worlds of the pair at once, identical camera, the scene drawn twice with scissor – left `camera.layers` 0+21, right
   0+22 (`ZKZEITWELT.set(L, R)` puts what differs on 21/22; check nothing else uses these layers, shadows included). One world: layers 0 + its
   side. Keep the frame in budget (shadow-map updates are costly – throttle them in the time-lapse; lower the pixel ratio only in the split if
   needed); no new programs from splitting.
5. **Voices:** play the recorded line by id if the chronik's recordings exist (path from its report / `docs/features/zeitreise-chronik.md`),
   else the browser voice (`audio/stimme.js`, per person), else text only; duck the ambience under a voice; volumes follow the player's settings.
6. **Quiet futures:** walkers, traffic, NPC talk and game prompts must not wander into the shots – respect the workshop's Ebenen (the workshop
   switches systems on and off; you only ask it, `WORKSHOP.layers`, or keep defaults if it is not there yet).
7. **Test** `zeitreise.py` (1920×1080): start via `?workshop` (or directly via `ZKREGIE.start`) – autoplay advances the year; the heavy-rain night
   halts and its phase advances; in the split the left and right halves differ in a year where the worlds differ; next/prev/seek; stop
   restores clock, camera and world; programs: start ≤ the agreed budget, playing and splitting +0; no page errors; a contact sheet of the
   places per chapter. `tests.txt`: `smoke`, `zeitreise`, `zukunft`.

Report as in the shared brief: sha, what plays, frame cost in the split (draw calls, triangles), the hooks in core files, open points.
