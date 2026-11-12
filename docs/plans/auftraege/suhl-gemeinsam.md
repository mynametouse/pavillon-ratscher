# Suhl als digitaler Zwilling – gemeinsamer Kontext und Regeln der Suhl-Agenten (ab 12.11.2026)

Gestartet am 12./13.11.2026 vom **Suhl-Chat** (session_01L6YrpcuzUozgpZNSC5CdVL), der mit Falko die Stadt Suhl als Teil der Spiegelwelt baut.
Jeder Suhl-Auftrag vom 12.11. an (`suhl-bestand.md`, `suhl-fotos.md`, `suhl-wissen.md`, `suhl-technik.md`) verweist auf diese Datei; hier
steht der gemeinsame Teil wörtlich (englisch, so wie die Agenten ihn bekommen). Die alten Aufträge vom 26.10.2026 (`suhl.md`, `suhl-innen.md`,
`suhl-leute.md`, `suhl-fahrt.md`) sind Altbestand – jene Agenten liefen nur etwa eine Stunde. Wiederanlauf: `docs/WORKFLOW.md`, Abschnitt 5;
die Zweige der Stufe 1 heißen `suhl/<thema>` (nicht `feat/…`, siehe Regel 3), `bash tools/agents.sh` zeigt sie deshalb nicht.

---

You are a helper agent of the **Suhl-Chat** (your lead, session_01L6YrpcuzUozgpZNSC5CdVL). Read this file and your own brief fully before
you start.

## The project in three sentences

"Pavillon Ratscher" is Falko Carl's browser 3D world (three.js r169, ES modules, German UI, English code comments): a mirror world
("Spiegelwelt") of his garden near the village Ratscher (Thuringia), the village, the town of Schleusingen and Kloster Veßra, built from open
geodata and photos, with driving, buses on the real timetable, live weather, people, animals, a strategy view from above and – in progress
by another chat – a what-if mode for futures. Its purpose (Falko, 5.11.2026): „Möglichkeitsraum, in dem Zukünfte virtuell erprobt werden,
ausgehend von einer digitalen Spiegelwelt. Desto realer die Spiegelwelt, desto wertvoller die erprobbaren Szenarien.“ Repo
`mynametouse/pavillon-ratscher` (public), source on branch `src`; the website is built and published by GitHub Actions from `src`.

## The Suhl task (Falko, 12.11.2026, 23:34–23:40, his words)

- „… eine Art Szenario 3D-Welt …, in dem ein reales Bild von der Stadt Schleusingen, aber auch dem Dorf Ratscha und auch Suhl, Erfurt und
  später auch Berlin erschaffen werden soll. Zunächst … Schleusingen, das Dorf Ratscha, die umliegenden Dörfer und insbesondere auch die Orte
  bis zur Stadt Suhl, inklusive der Stadt Suhl, … um eben verschiedene Zukunftsszenarien zu entwickeln.“
- „… die Stadt Suhl als digitalen Zwilling bzw. Spiegelwelt zu entwerfen, in höchster Qualität.“
- „Mein Ziel wäre, dass die gesamte Stadt Suhl realistisch und nach höchsten Ansprüchen … aus allen Perspektiven, realistisch umsetzt. Du
  beziehungsweise die anderen Chats setzen ja bereits Ratscher, Schleusing und Umgebung realistisch um. Suhl muss noch realistischer werden.
  … später eben auch integrierst in diese Spiegelwelt, sodass Suhl natürlich auch ganz normal in der Simulation zu erreichen ist, per Auto,
  Bus und so weiter.“

## Falko's decisions of 12.11.2026 (clicked, ~23:55)

- **Pilot quarter: the Zentrum** (Markt, Steinweg, Rathaus, CCS) – built first in the highest quality; it sets the bar for the rest.
- **State data** (terrain 1 m, surface model 1 m, LoD2 buildings): the Thuringian download services cannot be used automatically since
  ~22.10.2026 (old host: maintenance page; new portal: CAPTCHA). **Falko downloads the tiles by hand** from a list we prepare.
- **Helper agents in parallel** (he accepts the higher credit use).
- **Start now with stage 1, the inventory.** Nothing goes live in this stage.

## The lead's plan (told to Falko)

Quality bar per perspective – this is what "more real than Schleusingen" means:

- **From above** (strategy view, map): true roof shapes, roof surfaces from the aerial image (20 cm), trees at their real positions.
- **In the street** (on foot, by car, by bus): every facade after street photos (material, colour, floors, window grid, shops), plus kerbs,
  markings, signals, signs, lamps, real shop names.
- **From afar**: the skyline in the valley, the motorway viaducts.
- **Control**: the model rendered from the standpoint of a real photo, side by side with it, automatically in the tests; the model from
  above against the aerial image.

Deliberately **no rigid photogrammetry mesh** (Google-Earth style): it would look real from above, melted in the street, and could not be
changed for scenarios. Instead true geometry and true colours, everything parametric and changeable (PV on a roof, demolition, new building).

Four stages: **(1) inventory** (now) → **(2) the whole city from data** (terrain, aerial image, every building, streets, trees; reachable by
country road and motorway A 73/A 71 and by bus line 203) → **(3) the pilot quarter Zentrum in the highest quality**, then quarter by quarter
(landmarks, interiors, typical Suhl people, city buses) → **(4) scenario data** per building and quarter for the what-if mode.

Integration without conflicts: Suhl loads only when one gets there, lives in its own branches and folders, and reaches `src` only through
small marked hooks – later, by the Suhl-Chat, after an announcement in `docs/PARALLEL.md` and a green test suite.

## Stage 1 team (four helper agents, started 13.11.2026 ~0:15 CET)

| Agent | Branch | Worktree | Owns (only these) | Brief |
|---|---|---|---|---|
| `suhl-bestand` | `suhl/bestand` (+ scratch `ref/suhl-bestand`) | `/home/claude/wt-suhl-bestand` | `tools/suhl/bestand/**`, `tools/suhl/out/bestand/**`, `.github/workflows/suhl-bestand.yml`, `docs/features/suhl-bestand.md`, `docs/features/suhl-landesdaten.md` | `suhl-bestand.md` |
| `suhl-fotos` | `suhl/fotos` (+ scratch `ref/suhl-fotos`) | `/home/claude/wt-suhl-fotos` | `tools/suhl/fotos/**`, `tools/suhl/out/fotos/**`, `.github/workflows/suhl-fotos.yml`, `docs/features/suhl-fotos.md` | `suhl-fotos.md` |
| `suhl-wissen` | `suhl/wissen` | `/home/claude/wt-suhl-wissen` | `docs/plans/suhl/wahrzeichen.md`, `stadt.md`, `planungen.md`, `fachdaten.md` | `suhl-wissen.md` |
| `suhl-technik` | `suhl/technik` | `/home/claude/wt-suhl-technik` | `docs/plans/plan_suhl.md`, `docs/plans/suhl/altbestand.md` | `suhl-technik.md` |

## Areas – the shared vocabulary

- `stadt` = the whole municipality of Suhl (kreisfreie Stadt, incl. all Ortsteile).
- `kernstadt` = the contiguous built-up area in the valleys around the centre.
- `zentrum` = the pilot quarter: Markt, Steinweg, Rathaus, Hauptkirche St. Marien, Kreuzkirche, Waffenmuseum, Congress Centrum Suhl (CCS),
  Bahnhof and what lies between.

`suhl-bestand` publishes the exact polygons early as `tools/suhl/out/bestand/gebiete.geojson` on `suhl/bestand`
(`git fetch origin suhl/bestand && git show origin/suhl/bestand:tools/suhl/out/bestand/gebiete.geojson`). **Until then, provisional:** centre
of Suhl = 50.6087° N, 10.6926° E; `zentrum` = circle of 900 m around it; `kernstadt` = circle of 5 km; `stadt` = the OSM boundary.

## Coordinates, names, sources already known

- Model origin = Falko's garden, 50.4991° N, 10.7692° E; Suhl lies ~13 km NNW. Projection of all state data: ETRS89 / UTM 32N (EPSG:25832);
  model metres come from UTM through `xf` in `viz3/manifests.json` (see `tools/welt/wlib.py`).
- State data tiles (Thuringia, TLBG/GDI-Th, CC BY 4.0, „© GDI-Th“), names as in `tools/welt/QUELLEN.md`, lower-left corner in km:
  DGM1 `dgm1_32_{E}_{N}_1_th_2020-2025.zip` (also `…_2014-2019`), DOM1 `dom1_32_{E}_{N}_1_th_2020-2025.zip` (1-km tiles),
  LoD2 `LoD2_32_{E}_{N}_2_TH.zip` (2-km tiles, even numbers). Old download host `geoportal.geoportal-th.de` (maintenance page since
  ~22.10.2026, checked again 12.11.), new portal `geoportal.thueringen.de` (CAPTCHA).
- Aerial image: WMS `https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP` (layer `th_dop` 20 cm, `th_dop_info` = flight date per
  tile) – works, also from this machine.
- Buildings today: ETHOS.BUILDA (Forschungszentrum Jülich, Zenodo record 11845992, `DEG.csv`; footprint + height of every building, for
  Thuringia derived from the state's LoD2; ODbL) – `tools/welt-gebaeude/filter_ethos.py`; OpenStreetMap (ODbL).
- Street photos: `tools/fotos/katalog.json` has 1,484 Panoramax photos within 5 km of the centre of Suhl (22.10.2026), only 2 from Commons.
- Timetable: gtfs.de free feed (DELFI, CC BY 4.0), tool `viz3/extra/bus/quellen/fahrplan.py`; line 203 runs Suhl – Schleusingen – Ratscher.
- Routes garden → Suhl (26.10.2026, from OSM): motorway A 73/A 71 28.4 km, country road 18.9 km –
  `origin/feat/suhl-fahrt:viz3/extra/suhl-fahrt/recherche.json`.

## Rules (binding)

1. **Own branch, own files only.** Never push to `src`, `live`, `gh-pages`, `kern/*`, `wip/*`, `feat/*` or another agent's branch. Never
   force-push (only exception: your own scratch branch `ref/suhl-<thema>`, which holds one orphan commit with pictures). Never delete
   branches.
2. **Stage 1 changes no existing file of the repo.** You only add new files in the places you own. If something elsewhere should change,
   write it under „Für den Suhl-Chat“ in your document.
3. **Branch names `suhl/<thema>` on purpose:** a push there starts none of the app's test workflows (on `feat/**` every push would run the
   tests of all topics and slow down the chat that is testing the what-if mode right now). Only your own workflow reacts to your branch.
4. **GitHub Actions etiquette:** your workflow triggers only on your branch and your paths, `concurrency` with `cancel-in-progress: true`,
   a timeout, downloads in the Actions cache. Fetch politely: User-Agent `PavillonRatscher-Suhl/0.1
   (+https://github.com/mynametouse/pavillon-ratscher)`, pauses, retries with backoff, never hammer a public service. OpenStreetMap in bulk:
   the Geofabrik extract of Thuringia cut with osmium, not Overpass.
5. **CAPTCHA and bot protection: never try to get past them.** Use only documented public service endpoints.
6. **Data and licences:** note licence and attribution for every source. No keys or tokens in the repo, no accounts created. No private
   data, no parcel (Flurstück) or owner data. Raw downloads never in git (Actions cache or the runner's disk). What you commit are small
   derived files (JSON, GeoJSON, CSV; each under 5 MB, gzip longer lists).
7. **Photos:** never commit photos to your work branch. To look at photos: downscaled contact sheets (≤ 1024 px per sheet) with id, place,
   direction and date written on them, only CC0 / CC BY / CC BY-SA / public domain (never ND or NC), with a `CREDITS.md` (author, licence,
   source URL), on your scratch branch `ref/suhl-<thema>` (never merged). Street photos may show people and number plates: they stay there.
8. **Language:** code, comments and commit messages English; documents for Falko German – plain words, short sentences, numbers with their
   source. Nothing about private persons.
9. **Web research:** state facts in your own words, never copy passages; give the source URL for every fact; say what is uncertain; prefer
   primary sources (the city, state offices, operators) to aggregators.
10. **Commits and pushes:** small commits, message `suhl-<thema>: …`, ending with these two lines:
    `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>` and
    `Claude-Session: https://claude.ai/code/session_01L6YrpcuzUozgpZNSC5CdVL`.
    Push with `git -c push.negotiate=true push -u origin <branch>`. This session's git proxy allows only **two** git network operations at
    a time for this repo and five of us share it: on HTTP 429 or a rejected push wait 15–30 s and try again (at most 5 times). If your
    workflow commits results to your branch, `git pull --rebase origin <branch>` before you push.
11. **No sub-agents. No app build, no browser tests** in stage 1 – they are not needed.
12. **Time box:** a first useful push within ~25 minutes, the final report within ~75 minutes (wall clock). If something blocks you (a
    service is down, a rate limit), write it down and go on with the next item.
13. **Verify.** Every number you report comes from a file or log you can name. Recompute what you derive. Nothing guessed is presented as a
    fact.

## This machine

- Your working directory is your worktree (a shallow clone: do not fetch `src` without `--depth`). Python 3 (pip needs
  `--break-system-packages`), Node, git, `gh` (works for `gh run list --branch <b>`, `gh run view <id> --log`, `gh run download`, `gh api`).
- Reachable from here: github.com, api.github.com, raw.githubusercontent.com, *.github.io, PyPI, npm, `api.openstreetmap.org` (map calls
  for small boxes), `nominatim.openstreetmap.org`, `api.panoramax.xyz`, the Thuringian WMS `www.geoproxy.geoportal-th.de`,
  `download.gtfs.de`, `zenodo.org`, `basemap.de`. **Not reachable or rate-limited from here:** the Overpass servers,
  `download.geofabrik.de`, the Wikimedia APIs (HTTP 429) – use GitHub Actions for those. The tools WebSearch and WebFetch read web pages.
- Other chats work in this repo at the same time (what-if mode on `feat/zukunft*`). You never touch their branches or files.

## Reporting

Your branch is the source of truth if the chat dies: keep your document current as you go. Your final message to the lead, short:
(1) what exists – files, branch, head commit; (2) the key numbers; (3) what failed or is uncertain; (4) questions that only Falko can
answer; (5) proposals for the next stage.
