# Suhl Stufe 2 – die ganze Stadt aus Daten: gemeinsamer Teil für die Agenten der Stufe 2 (ab 13.11.2026)

Gestartet am 13.11.2026 ~1:30 vom **Suhl-Chat** (session_01L6YrpcuzUozgpZNSC5CdVL). Jeder Auftrag der Stufe 2 (`suhl-daten.md`,
`suhl-boden.md`, `suhl-gebaeude.md`, `suhl-strassen.md`, `suhl-gruen.md`, `suhl-laufzeit.md`) verweist hierher. Es gelten weiter
`suhl-gemeinsam.md` (Ziel, Regeln) und der Entwurf `docs/plans/plan_suhl.md` (auf `suhl/basis`). Englisch, so wie die Agenten es bekommen.

---

You are a helper agent of the **Suhl-Chat** (your lead) in stage 2 of the Suhl plan. Read, in this order: `docs/plans/auftraege/suhl-gemeinsam.md`
(the goal, Falko's words, the binding rules – they still apply, with the changes below), this file, your own brief, and the parts of
`docs/plans/plan_suhl.md` your brief names. Stage 1 results are on the branch `suhl/basis` (your branch starts there, except `feat/suhl-laufzeit`):
`docs/features/suhl-bestand.md`, `suhl-fotos.md`, `suhl-landesdaten.md`, `docs/plans/suhl/*.md`, `tools/suhl/out/bestand/**`, `tools/suhl/out/fotos/**`.

## Falko's decisions of 13.11.2026 (~1:15, clicked)

- **Stage 2 now, fully in parallel** (six helper agents side by side; he accepts the credit use). Nothing goes live without him.
- **Data live in a separate public repo `mynametouse/pavillon-daten`** with GitHub Pages (same origin as the app:
  `https://mynametouse.github.io/pavillon-daten/`). Falko creates it and puts a write token into this repo's secrets as **`DATEN_TOKEN`**.
  It may not exist yet when you start.
- **easygeodata.de with account and key:** Falko creates a free account and stores the API key as the secret **`EASYGEODATA_KEY`**
  (terrain DGM1, surface DOM1 and object heights nDOM1 at 1 m for the whole city). It may not exist yet. LoD2 (true roof shapes) stays
  manual and comes later.
- **No photo walk for now.** Facades stay rule-based in stage 2; stage 3 will use the 512 located Commons photos of the Zentrum.

## What changed since the plan was written

- **Roads: Suhl builds no second road system.** Another chat (the „Straßen-Chat“, branch `feat/strassen`, not yet in `src`) makes the
  region's roads real: a road map around the observer drawn in the ground shader (asphalt, markings by class and setting, kerb, gutter,
  sidewalk; styles 0 open road, 1 no overtaking, 2 town, 3 village) fed by the drive data (`fahrt/strassen.json`), plus roadside furniture
  (delineators, crash barriers, traffic signs, lamps, poles) from `viz3/extra/strassen/daten.py`. Suhl delivers its roads **in that data
  format** and has its furniture computed by that tool; Suhl adds its own geometry only where a map is not enough (steps, retaining
  walls, kerb edges in the Zentrum, working signals – stage 3). Plan sections 4c, S2-3 and S3-5 are to be read with this change.
- **Hosting is decided** (above): product folders `suhl/<produkt>/v<N>/…` in the data repo, `suhl/aktuell.json`, base address in the
  app `SUHL.BASE` (default `https://mynametouse.github.io/pavillon-daten/suhl/`, override `?suhl=<url>`), as in plan section 2.4.
- The aerial image over Suhl carries `Bezug=bDOM` (rectified on a surface model): check whether roofs lie in place before you correct
  any lean (plan 4a).

## The team of stage 2 (first wave, started 13.11.2026 ~1:30)

| Agent | Package (plan section 7.1) | Branch | Worktree | Owns (only these) |
|---|---|---|---|---|
| `suhl-daten` | S2-0 Datenhaus, afterwards S2-9 Zahlen | `suhl/daten` | `/home/claude/wt-suhl-daten` | `tools/suhl/lib/**`, `tools/suhl/daten/**`, `tools/suhl/out/daten/**`, `.github/actions/suhl-publish/**`, `.github/workflows/suhl-daten.yml`, `docs/features/suhl-daten.md` |
| `suhl-boden` | S2-1 Boden | `suhl/boden` | `/home/claude/wt-suhl-boden` | `tools/suhl/boden/**`, `tools/suhl/out/boden/**`, `.github/workflows/suhl-boden.yml`, `docs/features/suhl-boden.md` |
| `suhl-gebaeude` | S2-2 Gebäude | `suhl/gebaeude` | `/home/claude/wt-suhl-gebaeude` | `tools/suhl/gebaeude/**`, `tools/suhl/out/gebaeude/**`, `.github/workflows/suhl-gebaeude.yml`, `docs/features/suhl-gebaeude.md` |
| `suhl-strassen` | S2-3 Straßen, Ausstattung, Daten der Anfahrt | `suhl/strassen` | `/home/claude/wt-suhl-strassen` | `tools/suhl/strassen/**`, `tools/suhl/out/strassen/**`, `.github/workflows/suhl-strassen.yml`, `docs/features/suhl-strassen.md` |
| `suhl-gruen` | S2-4 Grün | `suhl/gruen` | `/home/claude/wt-suhl-gruen` | `tools/suhl/gruen/**`, `tools/suhl/out/gruen/**`, `.github/workflows/suhl-gruen.yml`, `docs/features/suhl-gruen.md` |
| `suhl-laufzeit` | S2-6 Laufzeit | `feat/suhl-laufzeit` | `/home/claude/wt-suhl-laufzeit` | `viz3/src/welt/suhl.js`, `viz3/src/lazy/suhl.js`, `viz3/src/lazy/suhl-worker.js`, `viz3/src/lazy/suhl/**`, `viz3/extra/suhl-laufzeit/**`, `viz3/test/suhl.py`, `viz3/test/suhl_tiles.py`, `docs/features/suhl.md` |

Second wave, started by the lead when the first wave delivers: S2-8 Abgleich, S2-5 Fern, S2-7 Anfahrt (app code), S2-9 Zahlen.

## How the packages fit together

1. **Schema and library first.** `suhl-daten` pushes within ~30 minutes: the shared Python package `tools/suhl/lib/` (tile keys on the
   quadtree of `tools/welt/wlib.py`, UTM ↔ model with `xf`, the areas from `gebiete.geojson`, the check „is the centre of Suhl inside
   my box, are there enough buildings“, polite HTTP with a cache, the easygeodata client), the schema of every product with a
   validator (plan 2.3, 2.4), the list of sample tiles, and the publish action. The others `git fetch origin suhl/daten && git merge
   origin/suhl/daten` (merge, never rebase; the files do not overlap) and validate what they produce. Until it is there, code against
   plan 2.3/2.4 and the existing helpers in `tools/welt/`.
2. **The sample set („Probesatz“) for the Zentrum.** Every data package delivers, within ~45 minutes and then improving, its product
   for the level-10 tiles (400 m) that touch the area `zentrum`, in the final layout, committed on its own branch under
   `tools/suhl/out/<paket>/probe/suhl/<produkt>/v0/…` (`git add -f`; `out/` is in `.gitignore`), at most 3 MB per product (ground
   images at most 8 MB). `suhl-laufzeit` copies these samples into `viz3/extra/suhl-laufzeit/dist/suhl/` and builds and tests against them.
3. **The whole city** is computed in GitHub Actions (your own workflow, your own `concurrency` group) and kept as a workflow artifact
   until the data repo exists; then the publish action of `suhl-daten` puts it into `pavillon-daten`. A run must be repeatable: a
   later run with better inputs (DGM1 from easygeodata, LoD2 from Falko) replaces a version, nothing is edited by hand.
4. **Secrets may be missing.** A workflow step that needs `DATEN_TOKEN` or `EASYGEODATA_KEY` checks for it and is skipped with a clear
   line in the log and in the result – never a failed run. easygeodata is used only through its API with the key, only from GitHub
   Actions, as its documentation describes; never from this machine, never by scraping.

## Rules – changes to `suhl-gemeinsam.md` for stage 2

- **Time and safety:** work in increments. A first useful push within ~30 minutes. **Commit and push at least every 20 minutes** –
  this machine can restart at any moment (running commands end, files stay, unpushed work in memory is lost). Write scripts so that a
  second start continues instead of starting over. Report to the lead when the goal of your brief is reached, at the latest after
  about two hours; say then what the next increment would be.
- **This machine has 2 cores and 8 GB for seven of us.** Heavy work (the whole city, large downloads, image processing) belongs in
  GitHub Actions. Locally: small tests and the sample set. No local browser except `suhl-laufzeit` (through `tools/browser_lock.sh`).
- **No existing file is changed** – with one exception: `suhl-laufzeit` may keep the hooks in shared files (plan 6.4) as **one separate
  commit** on its branch, each hook small and marked `// feat/suhl`, so the lead can show the diff to the other chats before anything
  reaches `src`. `tools/welt/*`, `tools/welt-gebaeude/*`, `viz3/extra/fahrt/*`, `viz3/extra/strassen/*` are read and imported, never edited.
- Other chats work in this repo right now (`feat/zukunft*`, `feat/strassen`, `feat/grenzland`). Read their branches if you need to
  (`git fetch --depth 1 origin <branch>`), never write to them. What you need from them goes into your document under „Für den Suhl-Chat“.
- Data packages stay on `suhl/<name>` (no app tests start there). Only `suhl-laufzeit` works on `feat/…`, where every push runs
  `feat.yml`.
- Numbers for scenarios (areas, lengths) are computed in UTM, never from model geometry: one model metre is 1.0157 m and the axes are
  turned by 4.36° (`xf` in `viz3/manifests.json`).
- Licences travel with the data: every product's index names its sources and attribution (ETHOS.BUILDA ODbL; ALKIS, DOP, DGM/DOM
  „© GDI-Th“ CC BY 4.0, via easygeodata.de where it came that way; © OpenStreetMap contributors ODbL; Copernicus DEM; GTFS DELFI CC BY 4.0).
