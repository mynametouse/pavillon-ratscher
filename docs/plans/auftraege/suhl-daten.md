# Auftrag `suhl-daten` – Stufe 2, Paket S2-0 „Datenhaus“ (danach S2-9 „Zahlen“)

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~1:30 als Hilfs-Agent, Branch `suhl/daten`, Worktree
`/home/claude/wt-suhl-daten`. Zuerst lesen: `suhl-gemeinsam.md`, `suhl-stufe2.md`, dann `docs/plans/plan_suhl.md` Abschnitte 2.3, 2.4,
2.6, 5.3, 6.3 und die Zeile S2-0 in 7.1. Hier steht der Auftrag wörtlich (englisch). Stand: `docs/features/suhl-daten.md`,
`git log origin/suhl/daten`.

---

## Your topic: the common ground of all Suhl data – library, schema, publishing

You are the first dependency of five other agents who start at the same time. **Push small and early.**

You own (only these): `tools/suhl/lib/**`, `tools/suhl/daten/**`, `tools/suhl/out/daten/**`, `.github/actions/suhl-publish/**`,
`.github/workflows/suhl-daten.yml`, `docs/features/suhl-daten.md`.

## Deliver, in this order

1. **Within ~30 minutes: `tools/suhl/lib/` v0** – a small importable Python package (no heavy dependencies beyond what
   `tools/welt/*.py` already uses):
   - tile keys and bounds on the quadtree of `tools/welt/wlib.py` (import it, do not copy or change it); level-10 tiles (400 m) that
     touch an area; the product paths `suhl/<produkt>/v<N>/<L>/<x>/<y>.<ext>` of plan 2.4;
   - UTM 32N ↔ model metres with `xf` from `viz3/manifests.json`, UTM ↔ WGS84;
   - the areas `stadt`, `kernstadt`, `zentrum` from `tools/suhl/out/bestand/gebiete.geojson` (point-in-area, tiles of an area);
   - `probe.json`: the list of sample tiles = the level-10 tiles touching `zentrum`, with their bounds in UTM and model metres;
   - the guard every tool calls first: is the centre of Suhl (UTM E 619 762, N 5 607 680) inside my box, and did I get a plausible
     number of buildings/streets – otherwise stop with a clear message (the lesson of 26.10.: a typo sent the old run to Nigeria);
   - polite HTTP (User-Agent of the common file, pauses, retries, an on-disk cache directory given by the caller).
   Unit tests that run without network in seconds (`python3 -I tools/suhl/lib/test_lib.py`).
2. **Within ~45 minutes: the schemas v0** of the products (plan 2.3 and 2.4): the building record, the tile files `g/`, `s/`, `b/`, `m/`,
   the `index.json` (which tiles exist per product and level, sources, attribution), `aktuell.json`. As JSON Schema or plain Python
   validators in `tools/suhl/lib/schema/`, with a command `python3 -I tools/suhl/lib/validate.py <folder>` that the other agents run
   on their sample sets and in their workflows. Start from the format `gebaeude/gebaeude.js` reads today (`tools/welt-gebaeude/prep.py`)
   and add the new fields; mark optional fields; give every estimated field its quality flag. Write the field list with meaning, units
   and frames (metres relative to the tile centre, UTM for areas) into `docs/features/suhl-daten.md` – that document is the contract
   the runtime agent codes against. When another agent needs a field changed, they tell you (or the lead); you version the schema.
3. **The publish action** `.github/actions/suhl-publish/` (composite): takes a folder `suhl/<produkt>/v<N>/` produced by a workflow and
   commits it into the repo `mynametouse/pavillon-daten` (branch `main`, GitHub Pages from the root; add `.nojekyll` and an
   `ATTRIBUTION.md` once) with the token `secrets.DATEN_TOKEN`, then updates `suhl/aktuell.json` there. One shared `concurrency` group
   `suhl-daten-publish`, never cancelled; push with retry and rebase like the existing gh-pages loops (see
   `.github/workflows/welt-vessra.yml`). **If the secret or the repo is missing: do nothing but say so clearly** in the log and the
   job summary, and upload the folder as a workflow artifact instead. Never write to `gh-pages` of this repo. A small test workflow
   `suhl-daten.yml` on your branch publishes a tiny `suhl/_probe/` folder to prove the path works once Falko has created the repo
   and the secret – check now and then whether they exist (`gh api repos/mynametouse/pavillon-daten` answers 200 when the repo is
   there) and report it.
4. **The easygeodata client** (`tools/suhl/lib/easygeodata.py`): fetch DGM1, DOM1 and nDOM1 tiles for a list of 1-km tiles through the
   site's API with `secrets.EASYGEODATA_KEY`, into the raw-data folder under the names `tools/welt/fetch.py` expects
   (`<raw>/dgm1/dgm1_32_{E}_{N}.zip` or what `read_dgm1` can read – check; the site serves Cloud-Optimized GeoTIFF). Read the API
   documentation only when the key exists and only from GitHub Actions (the site excludes programs without a key); until then write
   the client against a small interface with the unknowns marked, and a workflow step that probes the API as soon as the secret is
   there and prints what it offers. Record licence and „via easygeodata.de“ in the sources.
5. `docs/features/suhl-daten.md` (German): the contract (fields), how to validate, how publishing works, what waits for Falko, a
   section „Für den Suhl-Chat“.
6. **Afterwards (S2-9), when building records exist on `origin/suhl/gebaeude`:** the first scenario numbers per building and quarter
   (plan 6.3): floor area, roof area per orientation, sums per quarter – in UTM – with the quarter outlines you can get (the 17
   statistical districts are named in `docs/plans/suhl/stadt.md`); compare sums with official numbers. Ask the lead before starting this.

Report to the lead after step 3 (short), then continue.
