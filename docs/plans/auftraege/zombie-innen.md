# Auftrag `zombie-innen` – die Häuser von Ratscher von innen (Zombie-Nacht)

Gestartet am 4.11.2026 ~23:30 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv (baut mit Falko die Zombie-Nacht auf `feat/zombie`) als Hilfs-Agent,
Branch `feat/zombie-innen` (von `feat/zombie`), Worktree `/home/claude/wt-zombie-innen`, Port 8997. Hier steht der Auftrag wörtlich
(englisch, so wie der Agent ihn bekam), damit ein neuer Chat ihn nach einem Absturz wieder starten kann – Anleitung: `docs/WORKFLOW.md`,
Abschnitt „Wiederanlauf“. Was schon fertig ist: `docs/features/zombie-innen.md` und `git log origin/feat/zombie-innen`.

---

You are a helper agent of the chat that builds, together with Falko, the "zombie night" of his browser 3D model/game "Pavillon Ratscher"
(three.js r169, ES modules, German UI, English code comments): his garden near the village Ratscher (Thuringian Forest, part of the town of
Schleusingen), the real village around it from geodata and photos, neighbours, villagers, cars. Today (Wed 4.11.2026, now ~23:30 CET) you
work alone on ONE topic, delivering in increments. The chat (your lead) merges your branch into `feat/zombie`, tests and publishes. Do not
publish yourself.

## The zombie night (context – the lead builds this part)
Falko (4.11.2026 22:59), in his words: „Okay, also wir starten zuerst mit dem Zombie-Szenario. Wie du gesagt hast, die Häuser sollen begehbar
sein. Es gibt Personen, die sich bei Ertönen der Silent Hill-Sirene in Zombies verwandeln und nachts herumstreifen und mich angreifen. Ich muss
aber auch die Möglichkeit haben, sie mit einer Motorsäge oder anderen Waffen, die ich finden kann, zu töten. … sich entsprechend tagsüber
vorzubereiten, Vorräte zu sammeln und Häuser zu verbarrikadieren … Und die Inneneinrichtung soll typisch Thüringer Wald, Dorf-Style sein, wobei
jede Einrichtung durchaus auch interaktiv nutzbar sein soll und individuell gestaltet sein soll. Orientiere dich an echten Fotos, die du finden
kannst.“
The lead writes the mode, the siren, the zombies, the weapons, the houses as places of the game (`zombie/z_haus.js`: entering through the front
door with a short fade like Resident Evil, searching containers for supplies, barricading doors and windows, sleeping, the radio). YOU write
the interiors those houses need: `viz3/src/zombie/z_innen.js` (ZINNEN). Its contract is already in that file (read it first) – keep the API,
you may add to it (tell the lead in your report).

## Your topic: every house of Ratscher enterable, with a Thuringian village interior built from its footprint
1. **Photos first (≤ 45 min).** Real photos of Thuringian / Henneberg-Franconian village interiors are on the scratch branch
   `ref/zombie-innen-fotos` (`git fetch origin ref/zombie-innen-fotos`, then `git archive origin/ref/zombie-innen-fotos | tar -x -C <your
   scratchpad dir>`): contact sheets `sheets/<topic>_NN.jpg` (6 photos each with number, Commons title, licence), `CREDITS.md` (author,
   licence, link of every photo), `wiki/*.txt` (German Wikipedia: Ernhaus, Wohnstallhaus, Kachelofen, Schrankwand, Badeofen, Einkochen,
   Waschküche, Dachboden, Räucherkammer, Fachwerkhaus, the open-air museums Hohenfelden, Kloster Veßra, Fladungen …). Topics: hohenfelden,
   vessra, fladungen (open-air museums: Stube, Küche, Kammer), stube, ofen, kueche, ddr (GDR living rooms with the Schrankwand), kammer,
   keller, bad, flur, boden, scheune, jaeger, sirene. Look at the sheets with the Read tool (they are images). The research script is
   `viz3/extra/zombie/quellen/quellen.py`, run by `.github/workflows/zombie-quellen.yml` on pushes to `feat/zombie`; if you need other photos,
   add your branch to that workflow's `branches` on your branch, change the TOPICS (env THEMEN limits the run to some topics) and push –
   results land on `ref/zombie-innen-fotos` (it replaces the branch's content each run; never merge that branch). Write what you learn into
   **`docs/plans/zombie_einrichtung.md`** (German, compact): per room kind the typical furniture with sizes, materials, colours (hex),
   arrangement and the three looks – „alt“ (farmhouse before 1960: Dielen, Kachelofen with Ofenbank, Eckbank, Herrgottswinkel is Catholic –
   rare in Protestant Thuringia, rather a framed Bible verse or a Hirsch picture), „DDR“ (1965–1990: Schrankwand, Sitzgruppe, Teppich,
   Gardinen with Stores, Häkeldeckchen, RFT TV/radio, Kohleofen, Linoleum, Badeofen), „Nachwende“ (1990–2010: Eiche rustikal, Ledercouch,
   Laminat, Einbauküche) – each line with the photo numbers it comes from. These photos are only models: do not copy them as textures.
2. **The floor plan from the footprint.** `world/village.js` (VILLAGE) keeps each building: `VILLAGE.bld` / `VILLAGE.byId` – `b.id`, `b.typ`
   (0 = house), `b.foot` (z of the wall foot), `b.eave`, `b.st` (style; `raised` = Hochparterre, `sp` = window bay spacing), `b.fac` (facades:
   `ax, ay, bx, by, dx, dy` (unit along), `nx, ny` (outward normal), `L`, `kind` ('eave' | 'gable' | …), `t0, t1, tA, uA` (top heights),
   `door: { u, w }` on one facade). The facade shader puts the windows by a fixed rule – copy it from `world/village_near.js` `windows(b, f)`
   (plinth 0.35 m or 0.6 m raised, storey 2.75 m, window 0.95 × 1.3 m, sill 0.85 m, bays of `L / nb`) so your window openings sit exactly
   behind the painted windows. Build the interior INSIDE the footprint: inner faces of the outer walls 0.3–0.45 m inside the facade line, floors
   at the plinth height, a storey for each 2.75 m that fits under the eave, a cellar (most old houses have one: under the Stube or the kitchen,
   reached by a trapdoor or a steep stair) and an attic under the roof (ask `VILLAGE.roofZ(id, x, y)` / the roof data for its slopes: the attic
   needs its own sloped ceiling – seen from inside the roof is a back face too). Layout of the mitteldeutsches Ernhaus: front door into the
   Ern/Flur that runs through the house with the stairs; on one side the Stube (street corner, Kachelofen fed from the kitchen) and the Küche
   behind it, on the other side Kammer and (in old houses) the former stable, today Bad/WC or Vorratskammer; upstairs Schlafzimmer, Kammern,
   Kinderzimmer. Non-rectangular footprints: use the largest rectangle in the house's own frame, the rest stays solid. Footprints are 6–20 m.
3. **Furniture, individual per house.** A catalogue of Thuringian furniture as small procedural meshes (`garden/garten_kit.js` shows the house
   style: `soft`, `armchair`, `curtain`, `picture`, `jar`, `put`, KM materials, `paletteize`, `mergeGroup`, `indoor`/`dimIndoor`): Kachelofen
   (green, brown or cream tiles, Ofenbank, Ofenrohr), Eckbank with table and chairs, Küchenbüfett, Kohleherd or electric stove, Spüle,
   Kühlschrank, Schrankwand, Couch and armchairs, TV, radio, carpet, curtains, pictures (röhrender Hirsch, a Bible verse), Kuckucksuhr,
   Häkeldeckchen, beds with Federbetten, Kleiderschrank, Nachttisch, Waschtisch, Badeofen with tub and WC, cellar shelves with Einweckgläser,
   Kartoffelhorde, coal heap, Werkbank, attic junk (Truhe, old chairs, Wäscheleine, a smoke chamber at the chimney). Each house gets its look
   (alt / DDR / Nachwende), its colours and its pick of furniture from a seed of `b.id` – always the same for the same house, different between
   houses. The named villagers live in fixed houses (`dorf/dorf_life.js` `PIN`, people in `dorf/dorf_text.js` `DTEXT.P`): give their houses a
   few personal touches (cards and a Skat pad at Gerhard's, …).
4. **Usable.** Inner doors as hinged doors (`hingeDoor` from `core/geo.js` – reset `d.ph = null` and the group's `userData.ph` so the
   construction phases never hide them), walls and big furniture as `COL` boxes (rotated boxes: index 9 `{ cx, cy, c, s }`, see
   `game/walkable.js`), floors and stair steps as `WALK` slabs (rise ≤ 0.2 m, `STEP` is 0.42), then `rebuildGrids()` (`game/walkable.js`) – the
   walker, the third-person camera and the doors already use these. Unmount must neutralise your entries (as `werk/holz.js` `setCol` does)
   and rebuild the grids. Actions through `KERN.act` (ids `zinnen:<house>:<thing>`, German labels: „Schublade durchsuchen“, „Schrank
   öffnen“, „Licht an/aus“, „Radio einschalten“, „Ofen anheizen“, „Ins Bett legen“, „Luke öffnen“ …): containers open with a small animation
   and call `H.onSearch(c, H)` (null in your tests: show a short thought with `PLAY.think`), spots call `H.onUse(spot, H)`. Light: never a new
   light (it recompiles every shader) – borrow with `KERN.lights.borrow` (core/kern.js) one or two of the shared point lights for the room
   one is in (the switch at the door), and give lamps an emissive glow.
5. **Cheap.** Nothing runs or is built at load time. `mount` ≤ ~150 ms on a laptop (slices with `await` pauses are fine), ≤ ~60 draw calls
   and ≤ ~150 k triangles per house after merging (`mergeGroup`, palette), no new shader programs (reuse the kit's materials and `plain`/`indoor`
   with the same settings; count `GAME.R.info.programs.length` before and after a mount in your test – it must not grow, or say why), canvas
   textures created once and shared by all houses (≤ 512², few), everything disposed on unmount (geometries and textures back to the count
   before). The iPhone matters: memory stays small.

## Where you work
- Worktree `/home/claude/wt-zombie-innen`, branch `feat/zombie-innen` (from `feat/zombie`), own copy of `viz3/dist` (node_modules linked).
  Remote origin (GitHub mynametouse/pavillon-ratscher; `gh` authenticated).
- Read first: `README.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md` (module map, KERN, SAVE, §13 the village after photos),
  `docs/PARALLEL.md` (rules), `viz3/src/zombie/z_innen.js` (your contract), `world/village.js`, `world/village_near.js`, `garden/garten_kit.js`,
  `garden/garten_in.js` (lamps, seats, actions in the garden buildings), `core/geo.js` (COL, WALK, hingeDoor), `game/walkable.js`.
- Your files: `viz3/src/zombie/z_innen.js`, new `viz3/src/zombie/z_innen_*.js` (each listed in `viz3/src/modules.txt` directly ABOVE
  `zombie/z_innen.js` – you may edit only those lines of modules.txt), `viz3/extra/zombie-innen/**`, `viz3/test/zombie_innen*.py`,
  `docs/features/zombie-innen.md`, `docs/plans/zombie_einrichtung.md`. Do not edit other files (the lead writes `zombie/z_*.js`; other parts
  belong to others). If you need a change in a shared file, keep it minimal, mark it with a comment `// feat/zombie-innen` and list it in
  your report.
- Code: ES modules, imports only from modules above in modules.txt (`tools/check/deps.mjs`; later modules via LATE, `core/late.js`). No
  assignments to other modules' `window` names. Comments English, UI German. Prettier (`cd viz3 && ../tools/check/node_modules/.bin/prettier
  --write <files>`). Build `cd viz3 && python3 build.py --fast --min`; `bash tools/check.sh` must pass before every push (it also flags code
  after a `//` comment on the same line – never do that).
- Implement the test scenario in your module: `?szenario=zombie-innen` (and `?szenario=zombie-innen&haus=<id>`) mounts a house near the
  Anger (or the given one), puts the walker at `H.entry` in third person – your tests and the lead use it.

## Testing – IMPORTANT rules
- Never two browsers on this machine: ALWAYS through the lock and YOUR port 8997: `bash tools/browser_lock.sh python3 viz3/test/run.py
  --port 8997 --serve smoke`. Keep each hold short (≤ ~10 min; batch your views into one run). The lead uses the same lock – do long runs
  and picture series on CI. Software graphics in the container: pictures look plain and frames are slow; count draw calls and triangles.
- Write `viz3/test/zombie_innen.py` (patterns: `viz3/test/garten.py`, `einrichtung.py`, `lib.py`): mount 4–6 different houses (small,
  large, raised, Fachwerk, DDR look …), pictures from the entry and in every room (camera inside), the walker walks from the entry into the
  Stube, up the stairs and down into the cellar, a door opens, a container is searched, the light goes on; program count does not grow, draw
  calls / triangles / mount time per house in the log, unmount frees everything, no page errors. Look at your images with the Read tool and
  improve what looks wrong. List it in `viz3/extra/zombie-innen/tests.txt` (line: `zombie_innen`). Every push to `feat/zombie-innen` runs
  `.github/workflows/feat.yml` (quick checks, smoke, your test) and keeps `out/` as artifact "out" (`gh run list --branch feat/zombie-innen
  --workflow feat.yml`, `gh run download <id> -n out -D <your scratchpad>/ci_<n>`).
- Memory is shared (7 GB): keep processes small.

## Deliver
- Commit often (English messages), each ending with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv
- Push to `origin feat/zombie-innen` only (never src, live, gh-pages, feat/zombie or other branches; no force-push). If you need the lead's
  newer state: `git fetch origin && git merge origin/feat/zombie` (merge, never rebase).
- **First usable increment within ~2.5 h** (by ~02:00 CET): the photo notes, the ground floor of any house (Flur, Stube with Kachelofen and
  Eckbank, Küche, Kammer) with windows behind the painted ones, doors, collisions, a light, two or three searchable containers, the test with
  pictures – then cellar and upper floor with stairs, attic, the three looks, personal touches, more furniture and actions.
- Keep `docs/features/zombie-innen.md` (German, short): what exists, how to use it, how to test, „Für den Lead“. Do not edit shared docs
  (PARALLEL, CHANGELOG, ARCHITECTURE, UEBERGABE).
- Finish by about 06:00 CET with a final report: what is done (screenshot paths), what is not, anything needed outside your files, the API
  additions, last commit hash, CI result.
