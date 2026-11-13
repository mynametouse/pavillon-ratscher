# Auftrag `daten-katalog` – Quellen erschließen, erste Daten holen, Geschäfte und Eingänge, Mängel und Fotoliste

Gestartet am 13.11.2026 ~17:00 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv (Sonnet). Branch `feat/daten` von `origin/src`, Worktree
`/home/claude/wt-daten`. Falko 16:42 (Auszug): „… wo du noch sinnvolle Daten herbekommen kannst … Einwohnerzahlen, Kartendaten … reale
Bezeichnungen von Geschäften, Orten, aber auch Verkehrsdaten, sonstige kulturelle, lokale Informationen … Architektur … Es gibt ja zum Beispiel
den Obi in Schleusingen, es gibt Megamöbel in Schleusingen, es gibt McDonalds in Schleusingen. Die fehlen alle noch … nutzt Datenbanken und
Informationsquellen … Und wenn dir visuelle Informationen fehlen, dann denk drüber nach, wie du es hinbekommen kannst, dennoch möglichst
realistische, sinnvolle, logische Gebäudekonstrukte zu erstellen … wenn klar ist, da befindet sich ein Wohnhaus und … einen Innenhof, da muss es
natürlich einen Zugang zu diesem Innenhof geben … zunächst geht es erstmal hier darum, die Informationen zu sammeln, relevante Quellen zu finden,
vielleicht auch Downloads zu starten …“ Entschieden (16:50): **alle bestehenden Orte** (Ratscher, Schleusingen, Kloster Veßra, Strecken; Suhl
macht der Suhl-Chat); **echte Namen als schlichter Schriftzug ohne Logo und Markendesign**; Straßenbilder aus **offenen Quellen**, dazu ein
**Mapillary-Konto** von Falko (Schlüssel nur als GitHub-Secret) und eine **Fotoliste** für ihn; Sammeln als **Projekt-Dokument plus
Mängel-Tabelle**. Wörtlich (englisch):

---

You are a helper agent of the chat (your lead) that builds, with Falko, his browser 3D mirror world "Pavillon Ratscher" (three.js, German UI,
English code comments): his garden near Ratscher (Thuringian Forest, Landkreis Hildburghausen), the village, Schleusingen, Kloster Veßra and the
roads between, built from open data (terrain, aerial photos, OSM, 3D buildings from ETHOS.BUILDA, the real bus timetable, MaStR, PVGIS …). Read
`docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, `git show origin/src:docs/PARALLEL.md`, and skim `docs/features/` (what data the world already uses –
don't collect it twice). The Suhl chat has its own data house (`tools/suhl/lib`, the public data repo `mynametouse/pavillon-daten`, written only
by GitHub Actions with `secrets.DATEN_TOKEN`) – read it, reuse its patterns, never edit their files.

**Your part: open up the world through data – collect, check, fetch first extracts; build nothing in the 3D world yet.**
1. **The catalogue** `docs/plans/daten_katalog.md` (German, for Falko): per category – people (Zensus 2022 100-m grid: inhabitants, age,
   households, buildings, heating; TLS; the town's own figures), places and businesses (OSM POIs with brand/opening hours/entrances/passages/levels,
   Wikidata, Wikipedia, the town of Schleusingen's pages – Ortsteile, Vereine, Feste; chains' store pages for type and features), buildings and
   architecture (the state's LoD2 – check whether its download works again –, ALKIS open data without parcels, the Denkmalliste of the Landkreis,
   Wikimedia Commons categories per place and street, Panoramax, Mapillary), traffic (BASt counting stations, the Thuringian traffic volume map,
   charging stations, broadband), environment (DWD, flood and heavy-rain maps), planning (Regionalplan Südwestthüringen: **find out whether a wind
   priority area lies near Ratscher** – the Zeitreise needs it), history (SLUB Kartenforum georeferenced old maps, Deutsche Fotothek, Bundesarchiv on
   Commons). For each source: what it holds, coverage, licence and attribution, access (URL/API), format and size, how current, reachable from this
   machine or only from GitHub Actions, use for the game, priority, status. Mark clearly what you verified and what you only assume.
2. **First extracts** for the existing places (small, processed, licence-clean, committed under `tools/daten/` with the script that made them; big
   raw data only via a GitHub Actions workflow into the data repo or as an artifact – never commit raw downloads):
   - **every POI** (shops, gastronomy, services, public buildings, workshops, farms) with real name, type, address, position, opening hours where
     known – e.g. OBI, Mega Möbel and McDonald's in Schleusingen, and all the others;
   - **entrances** (OSM `entrance=*`) and **passages into courtyards** (`tunnel=building_passage`, footways into blocks) with their coverage;
   - **Ratscher's real population and households** from the Zensus 2022 grid (sum the cells that cover the village; say how);
   - whatever else is cheap and high-value (building levels and roof shapes in OSM, Denkmal list entries for our places).
3. **Building types when photos are missing** – `docs/plans/daten_gebaeudetypen.md`: archetypes by use with typical measures and features from
   sources (DIY store with garden centre and builder's yard, furniture store, fast-food restaurant with drive-in, discounter, petrol station, car
   dealer, supermarket, bakery, pharmacy, bank branch, town house with courtyard and gateway, Plattenbau types, farmsteads of the region) and rules
   that make buildings logical (doors to the street and the car park, a courtyard reachable, delivery ramps at the back, signage placement) – a
   recipe the builders can follow later. Real names only as plain lettering, never logos or a brand's design.
4. **Seeds for Falko's defects table** (`tools/daten/maengel_start.csv`: Ort, Stelle, Was fehlt oder falsch, Kategorie, Wie es wirklich ist /
   Quelle, Priorität) – missing places like the three he named, wrong or missing entrances, things the data shows that the world lacks; and a
   **photo list** for him (`docs/plans/daten_fotoliste.md`: views that open sources do not cover, by place, with a reason – short and practical).
5. **Mapillary:** prepare a small workflow that uses `secrets.MAPILLARY_TOKEN` (Falko will add it; never ask for the key in chat) to list image
   coverage around our places; skip cleanly while the secret is missing.
Rules: open data and official APIs first; respect terms of use (no scraping where forbidden, e.g. business directories); no personal data of
private persons, no Flurstück data, no keys in the repo; cite every source. Work only in your worktree; push to `feat/daten` (docs, tools, small
data); never to `src`/`live`; no force push. GitHub's runners are congested – few pushes. Credits are scarce: fetch and read targeted.
Report to the lead (SendMessage to `main`) with the catalogue's headline findings, the POI count, Ratscher's population, the wind question, then stop.
