# Grenzland, Kapitel 2 Etappe 2 – Auftrag `kapitel2`: Mission 1 und 2, Autos knacken (17.11.2026, ~22:45)

First read `docs/plans/auftraege/grenzland5-gemeinsam.md` and `docs/plans/plan_kapitel2.md` (all of it: story, section 3 missions 1 and 2,
section 4 Paket D, section 8 the additions). Then how chapter 1 is built: `docs/features/grenzland-mission.md`, `grenzland-kino.md`,
`viz3/src/grenzland/gl_kapitel1.js`, `gl_mission.js`, `gl_mission_data.js`, `gl_kamera.js`. Branch `feat/grenzland-kapitel2`, worktree
`/home/claude/wt-grenzland-kapitel2`, port **9062**.

## What to build

1. **The chapter's start:** after chapter 1 (`GLSTATE.kap1`), chapter 2 „Kolonnenweg“ opens with a title card and a short scene that sets up
   the story of the plan (the box was evidence with Westgeld; Krähwinkel wants it); the stranger of chapter 1 now hunts it himself (plan
   section 8: his father was spied on by Krähwinkel in 1989 – invented); the traitor in the clique leaves first traces (an SMS, a lorry of the
   haulier at the Feldscheune – who it is stays open until mission 4).
2. **Mission 1 „Grünes Band“:** by Simson over the Kolonnenweg into the Görsdorfer Heide, find the bunker, photograph it with the phone –
   Krähwinkel's men are already there, the stranger at the edge; retreat through the Grünes Band (deer, fog, no mobile signal). Uses `GLZONE`
   (agent `zone`); until it exists, build and test against a stand-in with the same API and say so.
3. **Mission 2 „Ein Auto für die Nacht“** (Paket D): get an inconspicuous old car – crack a Wartburg or a Golf II with wire or by breaking the
   window (the owner becomes a witness: wanted level „Fahrzeug“), repaint it in the Feldscheune (choose a colour – the police lose the
   vehicle), swap the plates; the haulier's work jacket as a disguise; the Christmas market in Schleusingen (`GLFESTE`, from the 1st Advent)
   as cover when it runs, else the evening crowd at the Markt.
4. **`GLKNACKEN`** (`gl_knacken.js`): cracking (old cars only; new ones refuse – an alarm), repainting (the car's paint changes, the wanted
   system's knowledge of the vehicle is cleared – read `gl_fahndung.js`/`gl_logik.js` and use their public API; describe what you need
   beyond it for the lead), plates; usable later by missions 4–6.
5. **December, cheaply:** chapter 2 plays in December – where the game's weather (`WETTER`, `docs/features/wetter.md`) can be set to a
   winter day during the missions through its public API, do it; no new physics (ice comes later).
6. Talks with the camera as in chapter 1 (`GLKAMERA`), fixed lines with `linien()` (the lead records them as far as the budget goes), the
   score (`GLSCORE.lage`, `stich`), title cards (`GLHUD.titel`), the radar's points, saving and loading of the progress like chapter 1.

## Tests and delivery

- `viz3/test/grenzland_kapitel2.py` with sections `:start`, `:m1`, `:m2`, `:knacken` (and `viz3/extra/grenzland-kapitel2/tests.txt`):
  each mission played through by the test like `grenzland_mission.py` does, pictures of the key moments, existing mission tests stay green.
  Unit tests for the mission rules and `GLKNACKEN`'s logic.
- Push small increments (mission 1 complete first); report as in the common part.
