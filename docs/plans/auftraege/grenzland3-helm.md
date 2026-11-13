# Grenzland, Runde 3 – Auftrag `helm`: realistische Helme (13.11.2026, ~21:00)

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Code comments English, the UI German.
Read first: `docs/plans/auftraege/grenzland2-gemeinsam.md` – section „How to work“ (build, checks, tests, browser lock, CI annotations, hard
rules: ≤ 16 textures per shader, no new lights, reuse materials/programs, nothing before the scene starts, commit identity). What differs is below.

## What Falko wants (verbatim)

- **13.11. 20:44:** „Die Helme sehen leider völlig unrealistisch aus“ – with two photos of his screen (Read them):
  `/mnt/user-data/uploads/ca8ab2fd-image.jpg` (Sarah with a helmet at the Feldscheune, Falko in the red check shirt with a strange dark face
  and a grey band on his head, a Simson on the left) and `/mnt/user-data/uploads/5887ea22-image.jpg` (Timo and Sarah in a talk scene of
  mission 2, both with helmets).

## What is wrong (the lead's reading of the photos)

- The shell is a coarse dome (16 × 8 facets, every facet visible), pale grey-white on everyone, no gloss, no thickness, no edge trim.
- A black bar across the forehead/eyes (`K.box` in `HUT.helm`, meant as a peak) reads as a blindfold; the shell sits too low – on Timo the bar
  covers his eyes, on Sarah it cuts the forehead.
- No chin strap, no ear part, no visor or peak that looks like one; hair pokes out oddly.
- Falko's head in the first photo (dark face, grey band): check what that is – a balaclava (`haube`, „Sturmhaube“ in `gl_fahndung.js`), a
  helmet over something, or a texture/skin problem – and make it look right too.

## What to build

Realistic moped helmets as worn on a Simson in Thuringia today (the clique Jule/Timo/Basti and Falko/Sarah in 2026) and, where helmets
appear in the flashback of 10 November 1989, helmets of that time:
- **Jet helmet (open face), the main type:** an oval shell following the head (longer front to back), smooth (no visible facets at normal
  distance), the cut line higher at the forehead (just above the eyebrows – eyes and brows always free) and down over the ears to the nape;
  a soft dark edge trim (rubber/vinyl) along the whole cut line, a shell thickness one can see at the edge; ear parts; a chin strap (two
  straps meeting under the chin, a small buckle); either a snap-on **peak** (curved, short) or a clear **visor** (slightly tinted,
  transparent, hinge buttons at the temples) – variety across the cast. Glossy paint in a few believable colours (cream/white, red,
  black, olive, light blue) – one per person, set in the cast data where the lead allows it (`gl_data.js` is the lead's: put a suggested
  mapping in your report, and support it via `HUTC` keys in `gl_fig.js`).
- **Optional:** one full-face helmet (a chin bar, a visor) for variety; the special forces' black helmet (`helmschwarz`, `gl_fahndung.js`)
  as a tactical helmet shape instead of a moped helmet.
- **Fit on every head:** scale to each figure's head (`headOf(model)` gives the head's measure; Rocketbox heads differ), the rim at the
  forehead above the brows, nothing intersecting the face; hair under the helmet hidden or tucked (the base game hides hair under its forest
  helmet – look how). Check all who wear one: Jule, Timo (cast data `hut: 'helm'`), Basti if he does, Falko and Sarah when they ride (find
  where the player and partner get a helmet – the riding code / `GLFIG.reite` / `GLPOSE`), the special forces.
- **Cost:** one or two materials per helmet (reuse programs – `VFIG.mat()` / the kit's existing materials; a clearcoat only if no new shader
  program comes with it), ≲ 2–3 k triangles, merged into few draw calls; built once per kind and head size and shared (the kit caches by key
  already: `hang(H, 'hut:' + kind + ':' + R …)`).

## Files (yours)

`viz3/src/grenzland/gl_fig.js` (the helmet parts of `HUT` / `HUTC` / `hatOn`; you may move the helmet geometry into a new
`viz3/src/grenzland/gl_helm.js` with one line in `viz3/src/modules.txt` inside the `# feat/grenzland` block, before `gl_fig.js` if it imports
it); tests `viz3/test/grenzland_helm.py`, `viz3/extra/grenzland-helm/tests.txt`; a section in `docs/features/grenzland-figuren.md` (German,
with „Für den Lead“). Everything else is read-only – the lead edits `gl_data.js` etc. from your report.

## Tests (must pass before your last push)

Pictures (front, side, three-quarter, close and at talk distance, by day and at night) of each wearer, standing and riding, in
`out/grenzland_helm/` – **look at them yourself and compare with photos of real jet helmets**; checks: the rim's lowest front point is above the
eye height of every head, the helmet does not intersect the face (sample points), triangles and draw calls per helmet under the budget, no new
shader program (count `renderer.info.programs` before/after), helmets are gone after „Beenden“. Run the old figure test
(`viz3/extra/grenzland/tests.txt` → `grenzland_figuren:*`) to be sure nothing else broke.

## Worktree, timetable, report

- Worktree `/home/claude/wt-g2-figuren`, branch **`feat/grenzland-helm`** (from `feat/grenzland` `edd72b2f`, with this brief), port **9015**.
  Push `git -c push.negotiate=true push -u origin feat/grenzland-helm`; never to `src`, `live`, `feat/grenzland`.
- **Deliver by 22:15 (Berlin, `date`)**: pushed, `bash tools/check.sh` green, your test green here. Push small increments.
- Falko is around but busy: do not ask him; decide and write it into the feature doc. Do not spawn agents.
- Finish with a report: branch and last commit, before/after picture paths, what is open, the suggested colour/type per person for `gl_data.js`.
