# Auftrag `suhl-fotos` – Fotoabdeckung Suhl: Straßenfotos und Commons je Straße, Kontaktabzüge des Zentrums, Fotoliste für Falko

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~0:15 als Hilfs-Agent, Branch `suhl/fotos`, Worktree
`/home/claude/wt-suhl-fotos`. Gemeinsamer Teil: `docs/plans/auftraege/suhl-gemeinsam.md` (zuerst lesen). Hier steht der Auftrag wörtlich
(englisch). Was schon fertig ist: `docs/features/suhl-fotos.md` und `git log origin/suhl/fotos`.

---

## Your topic: which real photos of Suhl exist – where, looking where

Stage 1 of the Suhl plan. Realistic facades and street space will be built after photos, and the later quality test renders the model from
the standpoint of real photos. You find out what there is, how well each street is covered, and you take the first look at the pilot
quarter. No app code.

You own (only these): `tools/suhl/fotos/**` (scripts), `tools/suhl/out/fotos/**` (small results), `.github/workflows/suhl-fotos.yml`,
`docs/features/suhl-fotos.md`; scratch branch `ref/suhl-fotos` (contact sheets, maps).

Read first: `tools/fotos/README.md`, `tools/fotos/collect_panoramax.py`, `collect_commons.py`, `collect_openverse.py`, `merge.py` and the
structure of `tools/fotos/katalog.json` (do not change these files; reuse the patterns in your own scripts). The areas: see the common
file (provisional circles until `suhl-bestand` has pushed `gebiete.geojson`).

## Deliver

1. **A catalogue for the whole city** → `tools/suhl/out/fotos/katalog_suhl.json.gz` (per photo: id, source, lat, lon, heading, field of
   view or a 360° flag, date, author, licence, page URL, image URL small/large – the fields of `tools/fotos/katalog.json` where possible):
   - Panoramax through the meta catalogue `https://api.panoramax.xyz/api` (search by bounding box with paging, all instances; flat or 360°),
   - Wikimedia Commons (geosearch in a grid over `stadt`, and the category tree of Suhl: buildings, streets, aerial photographs, historic
     pictures from the Bundesarchiv or the Deutsche Fotothek; camera position or object position; heading if present),
   - KartaView (is there an open API and coverage? licence),
   - Mapillary needs an access token: create no account – only say what would be needed and what is known about its coverage of Suhl,
   - Openverse/Flickr with CC licences (pattern `collect_openverse.py`).
   Per source: count, years, licence mix, how many with a viewing direction.
2. **Coverage** → `tools/suhl/out/fotos/abdeckung.json` and map pictures on the scratch branch. For every named street of `kernstadt`
   (OSM highways – from the OSM API in boxes, from your workflow via Geofabrik/osmium, or from `suhl-bestand` if it publishes an extract):
   the share of its length with a street-level photo within 25 m; separately the share where a photo looks across the street at a facade
   (within ±60° of the perpendicular, or a 360° photo) – per side of the street if you can; the newest photo date. Sums per quarter and
   for `zentrum`. The streets of `zentrum` with no or poor coverage. For the landmarks (Markt and Rathaus, Hauptkirche St. Marien,
   Kreuzkirche, Waffenmuseum, CCS, Bahnhof, Steinweg and others you find): the number of photos within 80 m that look at them.
3. **Look at the Zentrum.** Contact sheets on `ref/suhl-fotos`: one sheet per street or place of `zentrum`, 6–12 photos each, ≤ 1024 px,
   with id, place, direction and date written on them, plus `CREDITS.md`. Then look at them yourself (Read tool after
   `git fetch origin ref/suhl-fotos`) and write for each street two to four sentences about what matters for building it: building types
   and eras, materials and colours, number of floors, roofs, shop fronts, street surface, kerbs, lamps, trees, slopes and retaining walls,
   things that OpenStreetMap does not have. Only what you really see – no assumptions.
4. **A shot list for Falko** (in your document, German, at most ten lines): where his own photos or a 360° walk in the Zentrum would help
   most (streets and sides without usable photos), in order of priority, and how to take them so that they are usable (both sides,
   overlap, position and direction from the phone).
5. `docs/features/suhl-fotos.md` (German): the numbers, where the maps and sheets are, findings, gaps, licences and attribution, a section
   „Für den Suhl-Chat“.

## Method

- One workflow `.github/workflows/suhl-fotos.yml`: `on: push` to `suhl/fotos` with `paths` = your scripts and the workflow file;
  `permissions: contents: write`; `concurrency: { group: suhl-fotos, cancel-in-progress: true }`; timeout 60 min; an Actions cache. The
  job commits `tools/suhl/out/fotos/**` back to `suhl/fotos` and puts pictures as one orphan commit on `ref/suhl-fotos`.
- Download only what the contact sheets need (a few hundred small images) – never the large originals in bulk. Panoramax is reachable from
  this machine for quick tests; Wikimedia only from GitHub Actions (with the User-Agent of the common file and pauses).
- Licences decide: only CC0 / CC BY / CC BY-SA / public domain on the sheets; note ND/NC photos in the catalogue as „nur ansehen“ and do
  not put them on sheets.
