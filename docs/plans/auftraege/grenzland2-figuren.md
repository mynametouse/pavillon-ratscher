# Auftrag `figuren` – Grenzland Runde 2: people who move like people (13.11.2026)

Read `grenzland2-gemeinsam.md` first (same folder). Worktree `/home/claude/wt-g2-figuren`, branch `feat/grenzland-figuren`, port 9015.
Your files: `gl_fig.js`, new `gl_pose.js` (in `viz3/src/grenzland/`), `viz3/test/grenzland_figuren*.py`, `viz3/extra/grenzland-figuren/**`,
`docs/features/grenzland-figuren.md`.

## Why

In the review the riders sat on the moped in the chair pose of the avatar (legs straight forward, hands in the lap), officers walked after
a fleeing player, people in talks stood stiff. GTA's people sit on bikes, sprint, point, shrug, look at whoever speaks. Two other agents
(`kino` for talk cutscenes, `welt` for reactions and police) call what you build – build the API first, then the quality.

## What to build (in this order; push each step when it works)

1. **API first (stubs that work, within the first hour):** `GLFIG.geste(F, art, o)` (arts below; `o.ziel = [x, y, z]` for pointing),
   `GLFIG.blick(F, x, y, z)` / `GLFIG.blick(F, null)` (head and upper body turn toward a point, within natural limits),
   `GLFIG.sitz(F, x, y, hd, z)` (sit on a chair / bench / wall at height z) and `GLFIG.steh(F)`, `GLFIG.go(F, x, y, { renn: true })`
   (run). Keep every existing `GLFIG` function and field working (`talking`, `face`, `go`, `F.sitzt`, `F.reitet`, `F.partner`, …).
2. **Riding pose – `gl_pose.js`.** The player on the moped (`VEH.cur.id === 'gl-moped'`, the avatar of the base game) and riding figures
   (`F.reitet`): hips on the saddle, thighs forward and down, knees bent, feet on the pegs, arms forward to the handlebar grips, a slight
   forward lean, head up; lean with the vehicle's roll in curves; at standstill one foot down. Bone overrides applied **after** the game's
   own animation update of the frame (find the order of the avatar's mixer update and `KERN.tick`; if the mixer runs later, apply in a later
   hook, e.g. `scene.onBeforeRender` followed by `updateMatrixWorld` of the bones) – no edits to base files. Find the avatar's skeleton and
   the figures' skeleton (`VFIG`); bone names differ – map them once. Same for the Trabant driver if the driver is visible (hands on the
   wheel).
3. **Running.** `renn: true`: the run cycle (a run clip if the rigs have one; else the walk clip faster with longer strides and arm swing)
   at 4–5 m/s, a short acceleration; `welt` uses it for officers on foot, `kino` for scripted moments.
4. **Gestures** (blended in and out over ~0.25 s, a few seconds each unless held): `zeigen` (point at `o.ziel`), `nicken`, `kopf` (shake
   head), `achsel` (shrug), `arme` (arms crossed, held), `winken`, `telefon` (phone at the ear, held), `filmen` (phone held up in front,
   filming – `welt`'s witnesses), `haende` (hands up), `abwinken`. Talking figures (`GLFIG.talking(F, true)`) make small natural hand
   movements on their own. A phone prop for `telefon` / `filmen`: a tiny box with the screen lit, attached to the hand bone, reused.
5. **Sitting** where the story has seats: the Kegelbahn bar and benches (`gl_kegeln.js`, read-only – call `GLFIG.sitz` from your module
   if seat spots exist in `GLDATA.ORTE`, else document the API for the owners), the bus stop in Schleusingen at the start of mission 1.

## Tests and pictures

`viz3/test/grenzland_figuren.py` (one page, free play): the player mounted on the moped – a close side picture and the hip bone's height
within the saddle range; a riding figure; an officer told to run covers ≥ 3.5 m per second; a sitting figure; a contact sheet of all
gestures; `blick` turns the head toward the target (angle check); no page errors; shader program count unchanged. Pictures in
`out/grenzland_figuren/` – **look at them closely** (hands at the grips? feet on the pegs? no broken limbs) and fix what looks wrong. Lines
for CI in `viz3/extra/grenzland-figuren/tests.txt`.

## For the lead (in `docs/features/grenzland-figuren.md`)

The API with examples, bone mapping, what does not work yet.
