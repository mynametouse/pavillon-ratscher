# Nacht 5./6.11.2026 – gemeinsame Regeln der vier Hilfs-Agenten (Spiegelwelt realer)

Gestartet am 5.11.2026 ~23:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv (Kern-Chat, arbeitet mit Falko) mit vier Hilfs-Agenten:
`welt-gebaeude` (Port 8997), `welt-dinge` (8998), `bus` (8999), `wetter` (9001). Jeder Auftrag (`docs/plans/auftraege/<thema>.md`) verweist auf
diese Datei; hier steht der gemeinsame Teil wörtlich (englisch, so wie die Agenten ihn bekamen). Wiederanlauf: `docs/WORKFLOW.md`, Abschnitt 5.

---

You are a helper agent of the chat (your lead) that builds, together with Falko, his browser 3D world "Pavillon Ratscher" (three.js r169,
ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringian Forest), the real village around it,
Schleusingen and Kloster Veßra (drive or walk there), neighbours and villagers with daily lives, a planned pavilion in construction phases,
a zombie night. Tonight (Thu 5.11.2026 → Fri 6.11., from ~23:20 CET) you work alone on ONE topic, in increments, through the night. Falko
sleeps and cannot answer – decide sensibly yourself and write down what you decided. The lead merges your branch, tests and publishes. Do not
publish yourself.

## Why (Falko, 5.11. 22:52, verbatim)
„Möglichkeitsraum in dem Zukünfte virtuell erprobt werden ausgehend von einer digitalen Spiegelwelt. Desto realer, die spiegelwelt desto
wertvoller die erprobbaren szenarien. Wie kannst du die Spiegelwelt realer machen und als digitalen zwillinge ausbauen? Was schlägst du vor?
Zum Beispiel sehe ich an einigen Stellen noch die 2D-Satellitenansichten, die flach auf dem Boden sind. Also zum Beispiel Häuserdächer, die von
oben vom Satellitenbild aus hier integriert wurden, aber flach sind. … analysieren, was für Objekte das sein könnten, ob es zum Beispiel Autos,
Parkplätze, Häuser sind oder andere Dinge. Und nach dieser Analyse diese Dinge dann eben auch in 3D darstellen, sodass man nicht mehr über
Häuserdächer läuft, in Ratscha zum Beispiel oder auch in Schleusingen und der sonstigen Umgebung, sondern dass diese Häuserdächer aus 2D in ein
vollständiges, typisches, passendes, dreidimensionales Gebäude wie die anderen auch umgesetzt werden. Genau das gleiche gilt für offensichtliche
Parkplätze mit Autos, über die ich gerade laufen kann, als flache 2D-Oberfläche. … um einfach eine vollständige Abbildung der Satellitendaten in
3D an der richtigen Position zu erstellen. … einen digitalen Zwilling, zum Beispiel im Sinne von passendem Verkehr, in die Welt zu bringen.“

His decisions (23:02, clicked): **weather live as the default** (like outside in Ratscher right now, switchable to the calendar's);
**cars of the aerial photo as parking places, occupied by time of day** (more at night, fewer by day; models without any brand);
**buses after the real timetable – one can board and ride** (e.g. Ratscher – Schleusingen); **real roof shapes (the state's LoD2) later,
automatically** when the state's download service works again – tonight footprint and height of every building, roof shapes estimated.

## Data reachability (checked by the lead, 5.11. 22:58, from this machine)
- Thuringian orthophoto 2024 (DOP 20 cm, flown 07.04.2024 around the garden) via WMS: reachable – `tools/geo/dop_th.py` (model ↔ UTM
  transform inside). Also CIR (`th_dop20cir`, infrared – vegetation) on the same WMS. Analysis copies only; never commit the photos (size, licence
  credit „© GDI-Th“ if anything derived is shown).
- ETHOS.BUILDA (Forschungszentrum Jülich; Zenodo record 11845992; footprints + heights of all buildings in Germany, per state CSV, Thuringia =
  `DEG.csv` 882 MB, EPSG:3035 WKT, ODbL 1.0, from the state's LoD2 for Thuringia): reachable (zenodo.org HTTP 200).
- The state's LoD2 download (`https://geoportal.geoportal-th.de/3dgebaeude/LoD2/LoD2_32_{E_km}_{N_km}_2_TH.zip`): answers with a page „Dieser
  Geodaten-Dienst ist im Moment leider noch nicht verfügbar“ (since ~22.10.); the portal itself sits behind a CAPTCHA – never try to get past a
  CAPTCHA. DGM1/DOM1 (same host) are probably down as well.
- gtfs.de (German timetables, `https://download.gtfs.de/germany/free/latest.zip`): reachable.
- Open-Meteo (`api.open-meteo.com`): answers 429 from this machine (shared address) – fine from browsers; tests mock it.
- GitHub Actions can reach more than this machine (PyPI, GitHub, Zenodo, the state's WMS); `.github/workflows/welt-*.yml` show how tiles are built.

## Where you work
- Worktree `/home/claude/wt-<thema>`, branch `feat/<thema>` (from `src` 2d2d35cc), own `viz3/dist` copy, `node_modules` linked. Remote origin
  (GitHub mynametouse/pavillon-ratscher; `gh` authenticated).
- Read first: `CLAUDE.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, KERN services, SAVE, TASKS, LATE), `docs/PARALLEL.md` (rules),
  `docs/CHANGELOG.md` (top rows), then the files your brief names.
- Your files: the folders/files your brief names, `viz3/extra/<thema>/**` (data, `tests.txt`, `manifest.json` with `credits_add` like other
  extras), `viz3/test/<thema>*.py`, `docs/features/<thema>.md`. Your modules in `viz3/src/modules.txt` in a block `# feat/<thema>` placed after the
  modules you import from (`tools/check/deps.mjs` checks the order; later ones only via `LATE`) – edit only your lines there.
- Shared files (`core/*`, `boot/*`, `game/*`, `shell/*`, `build.py`/`buildlib/*`, `world/*`, `welt/*`, `verkehr/*`, `time/*`, `zombie/*`, docs
  outside your feature doc) only where you must: minimal, each spot marked with a comment `// feat/<thema>` (Python: `# feat/<thema>`), and listed in
  your report and in your feature doc under „Für den Lead“. Credits for new sources: list the exact lines for `buildlib/credits.py` under „Für den
  Lead“ (or `credits_add` in your extra's manifest). Other helpers work at the same time on neighbouring topics (welt-gebaeude: buildings and the
  ground image; welt-dinge: cars, parking places and things from the aerial photo; bus: buses after the timetable; wetter: weather) – keep out
  of their files.
- Code: ES modules, comments English (never code after a `//` comment on the same line – `tools/check.sh` flags it), UI German (the player is
  „du“), Prettier (`cd viz3 && ../tools/check/node_modules/.bin/prettier --write <files>`). `bash tools/check.sh` must pass before every push.
- Cheap and robust (Falko plays on a laptop and an iPhone): build lazily (on first need, not at load), instancing and merged geometry, plain
  materials (`plain()` in `core/assets.js`), **no new shader programs** after the start (count `GAME.R.info.programs.length` before/after in
  your test; compile ahead what you need, once), **never a new light** (`KERN.lights.borrow`), dispose what you free, fewer things on phones
  (`COARSE`). Saving only through `SAVE` (`core/save.js`: key + check + default – `test/savefuzz.py` throws nonsense at every saved value).
- Data in the repo: only prepared, compact data (JSON/binary in your extra), never raw downloads (CSV, ZIP, photos); keep sizes sensible (a few MB).
  Licences: credit every source; ODbL data (ETHOS.BUILDA, OpenStreetMap) with attribution.

## Testing – IMPORTANT rules
- Never two browsers on this machine at once: ALWAYS through the lock and YOUR port, e.g.
  `bash tools/browser_lock.sh python3 viz3/test/run.py --port <port> --serve <test>` (or a server `python3 tools/csp/cspserve.py <port> viz3/dist`
  in the background and your script through the lock). Keep each hold short (≤ ~10 min; batch pictures). Four helpers and the lead share the lock.
- Long runs on CI: every push to `feat/<thema>` runs `.github/workflows/feat.yml` (quick checks, smoke, the tests in `viz3/extra/<thema>/tests.txt`),
  pictures as artifact `out` (`gh run list --branch feat/<thema>`, `gh run download <id> -n out -D <scratch>`).
- Write your test (`viz3/test/<thema>.py`; patterns: `viz3/test/zombie_ziele.py`, `zombie_werk.py`, `lib.py`): checks with numbers, pictures you
  LOOK AT with the Read tool (improve what looks wrong), no new shader programs, no page errors, the normal game and the zombie night unharmed.
- Memory is shared (7 GB) – keep processes small; big downloads streamed and filtered, scratch files in your own scratch folder, deleted after use.

## Deliver
- Commit often (English messages), each ending with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv
- Push only to `origin feat/<thema>` (never src, live, gh-pages, other branches; no force push). Need the newer `src`: `git fetch origin && git merge
  origin/src` (merge, never rebase). Exception for tiles on gh-pages: only if your brief says so, and only into a NEW folder.
- **First usable increment within ~2 h** (by ~1:30 CET), pushed and green on CI – the lead merges and publishes increments during the night. Then
  more, in order of value. Finish by about 6:30 CET.
- Keep `docs/features/<thema>.md` (German, short): what exists, how to use it, how to test, open points, „Für den Lead“ (shared-file edits, credits).
- Final report (as your last message): what is done (picture paths), what is not, the shared-file edits, last commit hash, CI result.
