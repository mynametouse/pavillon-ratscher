# Auftrag `suhl-wissen` – Wahrzeichen, Stadtstruktur, Planungen und Fachdaten für Suhl

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~0:15 als Hilfs-Agent, Branch `suhl/wissen`, Worktree
`/home/claude/wt-suhl-wissen`. Gemeinsamer Teil: `docs/plans/auftraege/suhl-gemeinsam.md` (zuerst lesen). Hier steht der Auftrag wörtlich
(englisch). Was schon fertig ist: die Dokumente unter `docs/plans/suhl/` und `git log origin/suhl/wissen`.

---

## Your topic: what makes Suhl Suhl

Stage 1 of the Suhl plan. Pure research with WebSearch and WebFetch (coordinates from the OSM API or Nominatim, both reachable): the
buildings and places that define the look of the city, how the city is structured, what is being planned there, and which thematic data
exist for future scenarios. No code.

You own (only these): `docs/plans/suhl/wahrzeichen.md`, `docs/plans/suhl/stadt.md`, `docs/plans/suhl/planungen.md`,
`docs/plans/suhl/fachdaten.md`.

Earlier research to reuse: the scratch branches `ref/suhl-innen-fotos` and `ref/suhl-leute-fotos` of 26.10.2026 (OSM candidates, Wikipedia
extracts, contact sheets – `git fetch --depth 1 origin ref/suhl-innen-fotos ref/suhl-leute-fotos`, then look what is there) and the old
briefs `docs/plans/auftraege/suhl-innen.md`, `suhl-leute.md`.

## Deliver (German documents; every fact with its source URL; what is uncertain is marked)

1. **`wahrzeichen.md`** – the buildings and places that define the look of Suhl, grouped by quarter: the Zentrum first and most complete
   (it is the pilot quarter), then the other quarters of the Kernstadt, the Ortsteile, and what is seen from afar (towers, high-rises,
   hills with their towers, the motorway viaducts). Per entry: name, position (lat/lon from OSM or Nominatim, or the address), year or
   era, type and material (half-timbered, slate, Gründerzeit, GDR modernism, prefab type, after 1990), today's use, why it is
   characteristic, whether it is a candidate to enter (public interior), listed monument or not, sources, where good free photos are (the
   Commons category). Aim for 40–60 entries; for the 15 most important of the Zentrum a few sentences on how they look, taken from sources
   and photo descriptions – nothing invented. Check that things still exist: several buildings of the GDR-era centre were demolished – say
   what stood there and what stands now.
2. **`stadt.md`** – structure and numbers on one dense page: Stadtteile and Ortsteile (the official list, incorporations), population
   (total, trend, by district if published), area, altitudes, valleys and rivers, main roads with their numbers and the motorway
   junctions, the railway (station, lines), the bus operator and network (lines, hub), the building eras by quarter (what was built when:
   remains of the old town, 19th-century industry, the GDR centre of the 1960s–80s, the prefab estates, demolitions since 1990, new
   buildings) and the typical facade and roof types per quarter – what a facade generator must be able to produce.
3. **`planungen.md`** – current plans and projects as raw material for future scenarios. Per item: what, where, who, status and date,
   source, and the scenario question it suggests. Start with: the urban development concept ISEK (update of 2023); Suhl-Nord (the LEG's
   „Umsetzungsorientiertes Realisierungskonzept 2022 bis 2040“ and the development plan „Gewerbe- und Forschungspark Suhl-Nord 1. BA“ –
   status in November 2026); the Simson industrial park; the inner city and the Steinweg; the closure of the reception centre on the
   Friedberg; public transport (the council's temporary committee); heat and energy planning; the wind-power debate in the region; flood
   protection on Lauter and Hasel; the forest (bark beetle, forest conversion); demography (ageing, shrinking); tourism. Add whatever else
   is substantial. Also which institutions could be partners for a pilot workshop (offices of the city, the LEG, the FH Erfurt – roles and
   institutions only, no private persons).
4. **`fachdaten.md`** – thematic open data usable per building or quarter for scenarios. Per source: what, provider, URL, format or
   service, resolution, licence, last update, and whether you verified it with a request or only found it. Look at least for: the census
   2022 grid (100 m: population, age, year of construction, heating, vacancy), the state statistics office for Suhl, the
   Marktstammdatenregister (PV, heat pumps), a solar cadastre, noise maps, flood hazard and risk maps (the what-if agents already use an
   official flood area – their source is in `docs/features/zukunft-welt.md` on `origin/feat/zukunft-welt`; read it with
   `git fetch --depth 1 origin feat/zukunft-welt` and `git show`), heavy-rain hazard maps, forest data, climate data (DWD), traffic
   counts, the accident atlas, public transport (GTFS/DELFI), charging stations, land values (BORIS-TH), the monuments list, the council
   information system of the city.

Priorities if time runs short: 1 (Zentrum) and 3, then 2, then 4. Commit and push each document as soon as it has substance.
