# Auftrag `laeden` – die Läden in Schleusingen: echte Namen, Türen, Parkplätze

Gestartet am 13.11.2026 ~22:10 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv. Branch `feat/laeden` von `origin/src`, Worktree
`/home/claude/wt-laeden`, Port 9017. Falko 16:42 (Auszug): „Es gibt ja zum Beispiel den Obi in Schleusingen, es gibt Megamöbel in Schleusingen,
es gibt McDonalds in Schleusingen … realistische, sinnvolle, logische Gebäudekonstrukte … ein Eingang, eine Tür“; 16:50 zum Anklicken:
**Echter Name, schlichte Schrift** (kein Logo, keine Markengestaltung); 22:05 als Nächstes gewählt: **Läden in Schleusingen** („OBI, Mega
Center, McDonald's u. a. mit echten Namen, Türen und Parkplätzen aus den Daten“). Wörtlich (englisch):

---

**Your part: make the shops of Schleusingen real places.** Today the big shops north of the old town (Suhler Straße: OBI, the Mega Center with
Mega-Möbel, Aldi, EDEKA and the Mega-Restaurant, Shell, Getränkequelle, Turan Kebap Haus, Gaststätte „Am Waldrand“; Kurhausstraße 1a:
McDonald's with drive-in; Jägerhausstraße 8: Lidl; Hildburghäuser Straße 32: REWE) stand as generic ETHOS halls of `gebaeude/gebaeude.js`
(cells around the old town) or not at all. Make each one read as what it is, at its real place: the building, its name in plain lettering, its
entrance where it really is, its parking lot. Nothing of a brand's design: no logo, no brand colours or trade dress, no slogan – the real name
in a plain sans-serif on a neutral sign band (that is Falko's choice). The Nahkauf at Markt 19 lies in the old town (`welt/schleusingen.js`):
only its sign, if that is simple.

Read first: `docs/plans/daten_katalog.md`, `docs/plans/daten_gebaeudetypen.md` (types Baumarkt, Einkaufszentrum, Discounter/Supermarkt,
Tankstelle, Schnellrestaurant, Gaststätte; door, delivery and sign rules), the extracts in `tools/daten/ergebnis/` (`pois.csv` with names,
opening hours, floor area, linked parking ids; `entrances.csv`; `gebaeude.csv`), `docs/features/welt-gebaeude.md` (how the ETHOS cells around
Schleusingen are built and placed) and `docs/features/schleusingen.md`. The OSM API in small tiles works from the chat machine
(`tools/daten/osm_extrakt.py` shows how); Overpass does not.

1. **Data (tools/laeden/, small JSON in `viz3/extra/laeden/dist/laeden/`):** for each shop its outline (OSM way, else the ETHOS footprint under
   the POI), height (ETHOS), entrances (OSM `entrance=*` on or near the outline; where none: by the rules – the wide main door on the side facing
   the parking lot or street, delivery at the back), the parking lots (`amenity=parking` polygons linked in `pois.csv`, their aisles and rows
   from the polygon's long axis, 2.5 × 5 m bays), the name and kind, opening hours. Licence notes (ODbL) as in the catalogue.
2. **Buildings:** replace the generic ETHOS hall at each shop (a small, marked hook in `gebaeude/gebaeude.js`, e.g. a skip list the cell builder
   honours – the file belongs to no running helper; say it in PARALLEL) with the type's look: big-box retail with a flat roof and attica,
   trapezoid or panel cladding in neutral greys, a glazed entrance front with an automatic sliding door and a canopy, a sign band with the
   name; the Mega Center as one long block with several entrances (Mega-Möbel, Aldi, EDEKA, the restaurant – each its own door and lettering);
   Shell as a forecourt canopy with pumps, the kiosk with its door; McDonald's as a single-storey restaurant with the drive-in lane (the order
   post, the window on the driver's side, the lane's direction as in OSM or the aerial image) and the entrance; the Getränkequelle and the
   kebab house as small shops in their houses. Reuse the materials and shaders of `world/village.js` and `gebaeude/` – **no new shader
   programs**; lettering as one canvas texture atlas. A few draw calls per shop (merge by material), a far version (or none) beyond ~400 m.
3. **Doors and parking:** the doors are where people go: an interaction label at each main door („OBI – Baumarkt · Mo–Fr 8:30–19, Sa 8:30–18“,
   today open or closed by the game clock) – going inside is not part of this task. Parking lots: bay lines, a few lamp posts, trolley shelters
   at the supermarkets, kerbs; check what `welt-dinge` already puts there (parked cars from the aerial image) and keep them, or move them into
   the bays. The roads themselves belong to the Straßen-Chat (`verkehr/`, `fahrt/`): touch no road file; if a lot's access needs a road change,
   ask in `docs/PARALLEL.md`.
4. **Defects table:** the rows for these shops in Falko's sheet are seeded from `tools/daten/maengel_start.csv`; report which you closed.
5. **Test** `viz3/test/laeden.py` (1920×1080) and `viz3/extra/laeden/tests.txt` (`smoke`, `laeden`): each shop's building, lettering and main
   door at the right place (distances to the OSM entrance and POI), the parking lots with bays, no ETHOS hall left inside a shop, collisions
   (walk into the door area, drive onto the lot), no new programs after the first visit, draw calls and triangles near the Mega Center, no page
   errors; screenshots at eye height from the street and from the lot, one from 60 m above, and the drive-in lane.

Rules: work only in your worktree on `feat/laeden`; merge `origin/src` now and then; never push to `src` or `live`; no force push; browser runs
only via `bash tools/browser_lock.sh` on port 9017; GitHub's runners are shared – run your tests locally first and push real increments only
(about hourly); code comments English, UI German; no keys, no private raw data. Report to the lead (SendMessage to `main`) with screenshots after
the first shops stand (OBI and the Mega Center first), then a final report with what is open, and stop.
