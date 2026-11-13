# Auftrag `workshop` – Workshop-Modus: klar umschalten, Ebenen mit Beschriftung, Menüführung für den großen Bildschirm

Gestartet am 13.11.2026 ~13:30 (Sonnet). Branch `feat/workshop` von `origin/feat/zeitreise`, Worktree `/home/claude/wt-workshop`, Port 9014.
Gemeinsamer Teil: `zeitreise-gemeinsam.md`. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/zeitreise-gemeinsam.md` (team, contracts, big-screen rules – they apply to you), then
`viz3/src/zukunft/zk_modus.js` (the first version's mode: its scene entry, panel, presentation class `zk-pres`).

**Your part: the Workshop mode – everything the facilitator and the room see and touch.** You own `viz3/src/zukunft/zk_workshop*.js` (global
`WORKSHOP`), `viz3/test/workshop.py`, `viz3/extra/workshop/tests.txt`, `docs/features/workshop.md`; marked hooks where needed in the menu
(`shell/`), in HUD modules, in `zukunft/zk_modus.js` and the one-line fix in `strategie/st_hud.js` (below).

1. **A clear switch into and out of the mode:** a tile on the menu's start page („Workshop: Zukünfte erproben“), Menu → Erleben → Szenen →
   „Zukünfte erproben“ leads to the workshop's start screen, URL `?workshop` (and `?workshop=allein-gewappnet&autoplay=1` for the projector);
   inside, a quiet badge „Workshop“ with „Zurück ins Spiel“. Leaving restores everything (HUD, systems, clock, saved state of the game).
2. **What does not belong is gone:** the game HUD (task card, inventory bar, action buttons, „Neu“ hints, journal pop-ups, clock box, minimap,
   talk prompts), game input (E/Q, number keys …), entries of other modes (zombie, strategy, Grenzland, Suhl). Prefer one body class + CSS
   over edits in many files; where a system must really stop, use its own API or a minimal marked hook.
3. **Ebenen – labelled, readable on a projector:** a panel with icon + label + one line of explanation per layer: Leute (Dorfbewohner,
   Spaziergänger), Verkehr (Autos), Busse, Tiere, Ortsnamen, Untertitel, Stimmen, Umgebungston, Jahreszahl und Zeitleiste, Kennzahlen am
   Kapitelende, Daten-Ansichten (the existing Lärm, Verkehr, Sonne, Naturwert, Stimmung – plan view). Each toggle really switches its system
   (find each module's switch; tiny marked hooks where none exists). Sensible workshop defaults (say which and why), remembered per browser
   (try/catch), `WORKSHOP.layers.list/on/set` for the regie.
4. **Fix Falko's bug in the strategy mode's „Ebenen“ panel** („Häkchen … aber daneben keine Schrift“): in `strategie/st_hud.js` the CSS rule that
   gives the HUD boxes their `font` and `color:#f3efe6` lists `#sthud,#stppl,#stpan,#stnotes,#sttime,#stcard` but not `#stlayers`, so its labels
   inherit the page's dark text on the dark box. Add `#stlayers` there (keep its own z-index rule), check with a screenshot, and add an assertion
   (the label text's colour is light) to your test.
5. **The workshop flow** (big screen first, the shared rules): start screen (title „Ratscher 2026 → 2060“, one sentence what this is, a small
   key legend); the **Szenario-Kreuz** (2×2: Klima mild/heftig × gemeinsam/jeder für sich – four worlds, „Allein im Sturm“ and „Gewappnet“
   active, the others marked „kommt in Stufe 2“); choose „Zwei Wege nebeneinander“ or one world; chapters (Wald, Wasser, Energie, alles);
   „Werkbank“ (the first version's panel) as a secondary entry. During playback, driven only by `ZKREGIE.state()` and its events: the year
   (large), the world titles over each half in the split, the chapter title, subtitles with the speaker's name, a timeline with chapter
   segments and event markers, the chapter-end card (`ZKCHRONIK.kpi()` side by side, ranges, a small source line, the two questions), a
   pause screen for discussion, a black screen. Letterbox bars while it plays.
6. **Presenter's keys** (presentation clickers send PageDown/PageUp or arrows, „B“ or „.“ for black, F5/Esc): PageDown/→ next (play when
   stopped), PageUp/← back, Space/K play-pause, B/„.“ black, F/F5 fullscreen, Esc back to the workshop menu (a second Esc or the badge leaves
   the mode). Mouse: controls appear on movement and fade after 2 s.
7. Until `ZKREGIE` and `ZKCHRONIK` land, use mocks with their contract (fake years and events); merge `origin/feat/zeitreise` often and switch
   to the real ones as soon as they are there.
8. **Test** `workshop.py` at 1920×1080 (and 1280×720; a phone width must not break): `?workshop` enters, game HUD hidden, badge visible, the
   start screen and the cross readable (font sizes in px ≥ the rules), Ebenen labels visible and each toggle changes its system, keys call the
   right `ZKREGIE` functions, Esc/badge leave and everything is back; the strategy panel's labels are light; no page errors; screenshots.
   `tests.txt`: `smoke`, `workshop`, `zukunft`, `strategie`.

Report as in the shared brief: sha, screenshots, the defaults of the Ebenen, shared-file hooks, open points.
