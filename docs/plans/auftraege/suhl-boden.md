# Auftrag `suhl-boden` – Stufe 2, Paket S2-1 „Boden“: Gelände und Luftbild für ganz Suhl

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~1:30 als Hilfs-Agent, Branch `suhl/boden`, Worktree
`/home/claude/wt-suhl-boden`. Zuerst lesen: `suhl-gemeinsam.md`, `suhl-stufe2.md`, dann `docs/plans/plan_suhl.md` Abschnitte 1, 2.1,
2.2, 2.4, 2.5, 3.5 und die Zeile S2-1 in 7.1. Hier steht der Auftrag wörtlich (englisch). Stand: `docs/features/suhl-boden.md`,
`git log origin/suhl/boden`.

---

## Your topic: the ground of the whole city – terrain and aerial image as tiles

You own (only these): `tools/suhl/boden/**`, `tools/suhl/out/boden/**`, `.github/workflows/suhl-boden.yml`, `docs/features/suhl-boden.md`.

Build on the existing pipeline without changing it: `tools/welt/build.py`, `tiles.py`, `dem.py`, `fetch.py`, `wlib.py`,
`.github/workflows/welt-vessra.yml` (the zone Kloster Veßra is the nearest pattern), `tools/welt/QUELLEN.md`. The first Suhl attempt
patched `build.py`, `tiles.py`, `wlib.py` for tile masks (`git fetch --depth 30 origin feat/suhl`; idea: a mask per level, a list `has`
in `meta.json`) – take the idea into your own wrapper module instead of editing shared files; the app-side counterpart is hook W2
(plan 6.4), which the runtime agent prepares.

## Deliver

1. **Sample set first (~45 minutes):** terrain `t/` and aerial image `i/` for the sample tiles of the Zentrum (level-10 tiles touching
   `zentrum`, with their level-11 and level-12 children, plus the coarser levels above them), in the format `WELT` reads today
   (`meta.json`, WTH1 height tiles, WebP 512 px), committed under `tools/suhl/out/boden/probe/suhl/…` (≤ 8 MB; if the full level 12 is
   too big, keep level 12 only for the four tiles around the Markt and say so). The aerial image through the WMS `th_dop` (reachable
   from this machine; flight day 15.05.2024 over the whole city, so no colour seams inside it). Terrain: Copernicus as `tools/welt`
   does today – 1-m terrain comes in step 3.
2. **The whole city in GitHub Actions** (plan 2.5): level 12 over `kernstadt`, level 11 over built-up parts and the village centres
   (decide the rule from the building data in `tools/suhl/out/bestand/`, write it down), level 10 and coarser over `stadt`, plus the
   two road corridors garden → Suhl outside the existing block (routes: `origin/feat/suhl-fahrt:viz3/extra/suhl-fahrt/dist/fahrt/suhl.json`,
   `recherche.json`; 600 m to both sides); tile lists instead of rectangles; process the terrain mosaic in blocks of 4 × 4 km with a
   300 m margin (plan 2.2). Measure and report: tiles and megabytes per level, run time. The seam to the existing world (its outer
   terrain ends at model y = 11 864, about 400 m south of the Suhl Markt, plan 1.2): describe exactly what the runtime must do there.
3. **1-m terrain where it exists:** `suhl-daten` writes the easygeodata client; as soon as `EASYGEODATA_KEY` exists (it may not yet),
   your workflow fetches DGM1 for the 1-km tiles of P1, then P2, P3, P4 (`tools/suhl/out/bestand/kacheln.csv`), mixes it as
   `tools/welt/dem.py` does (offset, 300 m blend) and marks per level-10 tile whether the terrain is real (`dgm: 0|1` in the index).
   Without the key the step is skipped with a clear note. Also try the old state URL first in every run (pattern
   `tools/suhl/bestand/landesdienste.py` recognises the maintenance page) – the day the state serves tiles again, the run uses them.
4. **Checks** (plan 5.3) in the workflow: edges of neighbouring tiles match, lists complete, sizes per level within the expected
   range, the centre of Suhl is inside (guard from `tools/suhl/lib` once it is there – merge `origin/suhl/daten`), a picture sheet of
   a few tiles on the scratch branch `ref/suhl-boden` that you look at yourself.
5. Hand the finished product to the publish action of `suhl-daten` (`suhl/boden/v1/…`) – or leave it as a workflow artifact with its
   run id in your document until the data repo exists.
6. `docs/features/suhl-boden.md` (German): what exists, numbers, sources and attribution (aerial image and terrain „© GDI-Th“, CC BY
   4.0; Copernicus DEM), how to run again, what waits for Falko, „Für den Suhl-Chat“.

Under 3D buildings the printed roofs should later disappear from the ground image (as `tools/welt-gebaeude/kacheln.py` does for
Ratscher): prepare for it, do it only when `suhl-gebaeude` has footprints for the whole city (ask the lead).
