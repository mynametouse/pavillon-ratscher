# Realismus Stufe 1: Ratscher und Schleusingen – gemeinsamer Teil der Aufträge (17.11.2026, ~14:15)

For the helper agents of the Grenzland chat (lead: session_01L6Yrpf75YEUJPnMQdXevjQ) working on the realism push in **Ratscher and
Schleusingen**: the new agents `gebaeude`, `laeden-leben`, `innen-real` and – with their own briefs `grenzland4-*.md`, refocused – `alltag`,
`ruf`, `strasse`. Code comments English, the UI German. Read this part first, then your own brief.

---

## What Falko wants (verbatim, 17.11.2026)

- **13:27:** „Also 2 Nächte mit Hilfsagenten ist mir zu lange. Versuch einen schnelleren Weg zu finden. Bei im besten Fall noch höherer
  Qualität. Wie gesagt, ist mir auch wichtig, dass es realistischer wird. Die Geschäfte sollen zum Beispiel auch belebt sein. Man soll dort
  wirklich einkaufen können. Es muss realistischer aussehen, nicht bloß so schemenhaft. Auch in den Geschäften, in den Häusern. … Mir ist
  Realismus wichtiger, als schnell irgendwas schemenhaft aufzubauen. Du sollst auch logisch durchdenken, ob eine Darstellung, eine visuelle so
  in Wirklichkeit aussehen kann. Zum Beispiel ein Haus ohne Tür macht keinen Sinn. In Suhl, in der Aue hast du zum Beispiel die Hofeingänge,
  die teilweise durch Tunnel eben funktionieren, also wo man quasi zwischen die Gebäude durchgeht, was man auf der Satellitenansicht
  eigentlich auch gut erkennen kann, völlig außen vor gelassen. Also der Innenhof ist einfach nicht betretbar. Das ist zum Beispiel Quatsch.
  Und das ist an anderen Stellen auch so. Teilweise hast du auch große Gebäude komplett ohne Fenster. … So etwas macht das Spiel leider sehr,
  ja, realitätsfremd und stört die Immersivität. Es ist okay, wenn man nicht in jedes Gebäude reingehen kann. Das kann man ja im echten Leben
  auch nicht. Aber Verkehr und das, was sich so tut auf den Straßen, vielleicht hier und da auch mal eine Clique und ein paar Sidequests,
  würden dem Ganzen wesentlich mehr Leben einhauchen. Vielleicht fliegen auch mal Vögel rum … Na, natürlich braucht es auch der Menschen, die
  im Supermarkt rumlaufen, Kassierer und all das. Also öffentliche Gebäude sollten, so gut es geht, zugänglich sein und dann eben auch
  entsprechende auch Öffnungszeiten haben, aber eben auch entsprechende Optionen, vielleicht die sogar sinnvoll sind, entweder für die Quest
  oder für Sidequests oder einfach Inventarisierung von Dingen oder lustige Nebenschauplätze. … in den … nächsten 12 Stunden oder bis in den
  nächsten 20 Stunden … für die nächste Version schon mal für einen Ort eine höhere Realismusstufe und dann in der nächsten Version den
  nächsten Ort … Und achte immer darauf, dass es immer noch im Browser gut spielbar, flüssig läuft.“
- **~13:45, clicked:** the first places are **Ratscher and Schleusingen** (Suhl's Aue comes in a later version).

## The yardstick: could it look like this in reality?

Before you build and again on your screenshots, check every thing against reality – the satellite and street views you can find, the map
data (OSM tags), photos, common sense:

- Every building has an entrance where one would be (street or yard side; a barn a gate, a garage a garage door); facades have windows
  (blank walls only where real ones are blank: fire walls between row houses, the back of a hall); passages through buildings and gateways
  into yards exist where the real ones are (OSM `tunnel=building_passage`, `covered=yes`, gaps in the satellite picture); yards behind them are
  walkable.
- A shop is open at its hours: lights on, staff at the till and the counters, customers between the shelves, goods that look like goods; at
  night closed, dark or with a night light, the door locked. A public building likewise.
- People do what people do at that hour and place; vehicles drive where vehicles drive; nothing floats, nothing sinks into the ground,
  nothing stands inside something else.
- **Realism beats quantity.** Three convincing shops beat twelve sketchy ones. No grey placeholder boxes, no ghostly figures, no stand-ins
  that look like stand-ins up close.
- Smooth in the browser: measure frame time and draw calls in your test before and after; build things near the player only, reuse
  materials and geometry (instancing), keep the iPhone's memory in mind (`viz3/test/memphone.py`, and for the mode
  `viz3/test/grenzland_speicher.py`).

## Ownership (edit only your files; read everything)

| Agent | Branch / worktree / port | Files |
|---|---|---|
| Lead | `src` | `viz3/src/grenzland/` lead files (`gl_modus.js`, `gl_state.js`, `gl_hud.js`, `gl_karte.js`, `gl_data.js`, `gl_radio*.js`, `gl_score.js`, `gl_nacht.js`, `gl_umgebung.js`, `gl_stimmen.js`), `tools/voices/*`, `build.py`, `core/*`, `game/*`, `shell/*`, docs |
| `gebaeude` | `feat/gebaeude`, `/home/claude/wt-gebaeude`, 9044 | the outside of the buildings of Ratscher and Schleusingen: `viz3/src/welt/schleusingen.js` (its buildings), `viz3/src/haeuser/haeuser_heute.js` (the look „heute“ of Ratscher's houses), new `viz3/src/fassade/**` |
| `laeden-leben` | `feat/laeden-leben`, `/home/claude/wt-laeden-leben`, 9045 | `viz3/src/laeden/**` (all of it), `viz3/src/schleusingen/si_laden.js`, `viz3/src/amt/**` (the town hall), new `viz3/src/einkauf/**` (inventory, wallet, opening hours of public buildings) |
| `innen-real` | `feat/innen-real`, `/home/claude/wt-innen-real`, 9046 | the inside of the houses: `viz3/src/haeuser/haeuser.js`, `haeuser_gast.js`, `viz3/src/schleusingen/si_innen.js`, `si_plan.js`, and the interior kit they share with the zombie night: `viz3/src/zombie/z_innen*.js` (furniture, plans – the zombie night must keep working) |
| `alltag`, `ruf`, `strasse` | as in `grenzland4-gemeinsam.md` | as there (`viz3/src/grenzland/` modules); `alltag` also new `viz3/src/tiere/voegel.js` (birds) |

Besides your own files you may change: **one line per new module in `viz3/src/modules.txt`** (in the block of the folder it belongs to, after
the modules it imports), your tests (`viz3/test/<thema>*.py`, `viz3/test/unit/<thema>*.test.mjs`), your extra `viz3/extra/<thema>/**` (with
`tests.txt`), your feature doc `docs/features/<thema>.md` (German, for humans). Nothing else; shared modules (`world/`, `game/`, `core/`,
`dorf/`, `verkehr/`, `vehicles/`, `render/`, …) are read-only – hook in from outside; need more? Write it under „Für den Lead“ in your feature
doc and say so in your report. These folders had other owners until 14.11. (`docs/PARALLEL.md`); since 17.11. they are yours for this push.

## Interfaces between you (build yours early; guard calls to the others: `window.X && X.f ? … : fallback`)

- **`gebaeude`:** `FASSADE.audit(ort)` → `[{ id, ort, art: 'tuer' | 'fenster' | 'durchgang' | 'hof', x, y, text }]` (what is still
  implausible – your test drives it to zero, or to an explained rest) · `FASSADE.eingang(id)` → `{ x, y, hd }` of a building's door. Doors of
  houses one can enter come from `HAEUSER` (Ratscher) and `SINNEN` (Schleusingen, `innen-real`) – draw no second door there; read their door
  positions.
- **`laeden-leben`:** `INVENTAR` (`add(id, n)`, `has(id)`, `take(id, n)`, `list()`, saved; things with a name, a picture or icon, a weight)
  · `GELD` (the wallet of free play; in the Grenzland mode the mode's money `GL.pay` – one path for both, decide and document) ·
  `OEFFNUNG.offen(id, t)` and `OEFFNUNG.zeiten(id)` for every shop and public building · `LLEBEN.leute(id)` (staff and customers inside).
- **`innen-real`:** keeps `HAEUSER`, `SINNEN`, `ZINNEN` working (same APIs) while the rooms become real.
- **`alltag`:** people outside, by the clock (`GLALLTAG.leute()`); people heading for a shop walk to its door (`FASSADE.eingang` or the shop's
  door from `laeden/`) and go in – inside, `laeden-leben` has its own customers. Birds: `VOEGEL` (flocks, pigeons, sparrows, crows,
  swallows in summer).
- **`ruf`:** side quests may send the player to a shop or a public building (`OEFFNUNG`, `INVENTAR`).
- **`strasse`:** supply vans and lorries stop at the shops' loading bays (ask `laeden-leben` through the shop data: a field `anlieferung`).

## How to work

- Worktree and branch are ready (`bash tools/agents.sh worktree <thema>` – from `src`, a copy of `viz3/dist`, linked `node_modules`). Build
  `python3 viz3/build.py --fast`, check `bash tools/check.sh` (must pass before every push), unit tests without a browser wherever logic can
  be pure.
- **Browser:** one at a time on this machine (2 cores, six agents and the lead share it): only through
  `bash tools/browser_lock.sh python3 viz3/test/run.py --port <yours> --serve <test>`; keep local runs short (one area, mainly to look at your
  pictures); let **GitHub Actions** run the long tests (a push to your branch without `[skip ci]` runs smoke and every line of your
  `viz3/extra/<thema>/tests.txt`; at most one such push per ~30 min, others with `[skip ci]` in the first line). Do not rebuild `viz3/dist`
  while your own run is queued or running; no heavy work while it runs. The machine's Chrome is killed at ~3.7 GB.
- Free play or the mode in a test: the base game starts in the garden (`viz3/test/lib.py`; see the tests of `laeden`, `haeuser`,
  `schleusingen-innen` for how they walk into a shop or a house); the mode: `?szenario=grenzland` and the snippet in
  `docs/plans/auftraege/grenzland2-gemeinsam.md`.
- **Hard rules learned:** `Object.assign(S, { fn })` must not overwrite state fields of the same name · no code after `//` on the same line ·
  ≤ 16 textures per shader · **no new point lights or spot lights** (borrow one: `KERN.lights.borrow`; else emissive materials, baked light,
  sprites, decals) · reuse materials, no new shader programs without need · a per-frame function must never throw · free licences only for
  any asset (CC0, CC BY with credit in your extra's `credits_add`), no brand logos (shop names as plain lettering are fine, as `laeden/` does
  it) · no keys, no private or parcel data.
- Commit identity `git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit …`; every message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01L6Yrpf75YEUJPnMQdXevjQ`.
  Push `git -c push.negotiate=true push -u origin feat/<thema>`; never to `src`, `live`, `gh-pages`, `feat/grenzland`.
- **Timetable (by `date` – Berlin time):** the lead merges at **17:30**, **20:30** and **23:30**; V18s goes live after the 20:30 merge, V18t
  after the 23:30 one. What is pushed, passes `tools/check.sh` and has its test green (here or on Actions) goes in. Push small increments; a
  solid smaller result beats a big shaky one.
- Falko is around but busy: do not ask him; decide, write decisions into your feature doc with „Für den Lead“. Look at your own pictures
  (Read them) and compare with the real place. Do not spawn agents. Keep your usage reasonable – no endless polishing loops.
- Finish with a report: branch and last commit, what works and how it was tested (picture paths), what is open, what the lead must do.
