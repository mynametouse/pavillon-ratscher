# Auftrag `suhl-gebaeude` – Stufe 2, Paket S2-2 „Gebäude“: ein Datensatz je Gebäude der ganzen Stadt

Gestartet vom Suhl-Chat (session_01L6YrpcuzUozgpZNSC5CdVL) am 13.11.2026 ~1:30 als Hilfs-Agent, Branch `suhl/gebaeude`, Worktree
`/home/claude/wt-suhl-gebaeude`. Zuerst lesen: `suhl-gemeinsam.md`, `suhl-stufe2.md`, dann `docs/plans/plan_suhl.md` Abschnitte 2.1,
2.3, 2.4, 4a, 4b, 5.3, 6.3 und die Zeile S2-2 in 7.1; dazu `docs/features/suhl-bestand.md` (Abschnitte Gebäude und Dienste),
`docs/plans/suhl/wahrzeichen.md`, `docs/plans/suhl/stadt.md` (Baualter und Haustypen je Viertel). Hier steht der Auftrag wörtlich
(englisch). Stand: `docs/features/suhl-gebaeude.md`, `git log origin/suhl/gebaeude`.

---

## Your topic: every building of Suhl as one parametric record

About 31,000 buildings. One record each (plan 2.3), in level-10 tiles `g/10/{x}/{y}.json`; the browser generates the geometry from
the record, so a scenario can change a house. This is the heart of „more real than Schleusingen“ – and of the scenario data.

You own (only these): `tools/suhl/gebaeude/**`, `tools/suhl/out/gebaeude/**`, `.github/workflows/suhl-gebaeude.yml`,
`docs/features/suhl-gebaeude.md`.

Sources, best first, joined by the building id (ETHOS id = cadastre id = LoD2 id, e.g. `DETHL57P00006FYsBL`):
- **ETHOS.BUILDA** (footprint, height; `tools/suhl/bestand/ethos.py`, `ethos_filter.py`, pattern `tools/welt-gebaeude/prep.py`; ODbL);
- **cadastre WFS „ALKIS vereinfacht“** `https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wfs`, type
  `ave:GebaeudeBauwerk` (fields `oid`, `funktion` in words, `anzahlgs` = floors above ground, `lagebeztxt` = addresses, `aktualit`,
  geometry; CC BY 4.0 „© GDI-Th“; seed `tools/suhl/bestand/alkis_probe.py`; about 40 boxed requests for the city, politely, cached;
  works from this machine and from GitHub Actions). **Never request `ave:Flurstueck`** or anything about parcels or owners;
- **OpenStreetMap** (name, shop/amenity names inside or at the building, roof shape and levels where tagged, heritage; Geofabrik
  extract in Actions, the OSM API in small boxes from here);
- **the aerial image** (WMS `th_dop` 20 cm RGB and `th_dop20cir` infrared): roof class and colour per roof face, existing PV panels
  as a later refinement;
- `docs/plans/suhl/wahrzeichen.md`: flags for landmarks (own model later), monuments, enterable.
LoD2 (true roof faces) comes later from Falko's manual downloads: build the swap in (records keep their id; a roof from LoD2 replaces
the estimate, flag `rq`), as `tools/welt-gebaeude/lod2.py` describes.

## Deliver

1. **Sample set first (~45 minutes):** records for the sample tiles of the Zentrum under
   `tools/suhl/out/gebaeude/probe/suhl/g/v0/10/{x}/{y}.json` (≤ 3 MB), with at least id, footprint, heights, estimated roof (as
   `prep.py` estimates it, with its flag), kind, use and floors from the cadastre, address, name. Tell the lead when it is pushed –
   the runtime agent waits for it. Validate with `tools/suhl/lib/validate.py` once `suhl-daten` has pushed it (merge `origin/suhl/daten`);
   if the schema lacks something you need, say so.
2. **Roofs:** estimate shape and ridge direction better than today where you can (footprint shape, neighbours, cadastre function,
   typical forms per building type: prefab slabs and point high-rises flat, old town houses pitched …), always flagged as estimate;
   per roof face class (tile red, tile dark, concrete tile, slate, bitumen/gravel, metal, green roof, glass) and colour from the aerial
   image. First check whether the roofs in the image lie on the footprints (`Bezug=bDOM`); only if they do not, correct the lean as
   `tools/welt-gebaeude/retusche.py` does. Area in m² per face, computed in UTM.
3. **Sides:** per facade start and end, top edge, flag party wall, distance to and name of the street it faces (ideas in
   `origin/feat/suhl:tools/welt/zone_suhl.py`), and rule-based facade parameters (plan 4b) with quality 0 or 1: floors from the
   cadastre, a window grid by building type and era, ground-floor shop zone where OSM or the cadastre function says trade, plinth,
   balconies/loggias for prefab blocks. Stage 3 will overwrite these per side after photos – keep the structure ready for it.
4. **Kind, use, era:** kind and use from the cadastre function (keep the original words too), era class from rules (form, quarter,
   what `stadt.md` says about when each quarter was built), flagged as estimate; high-rises (≥ 25 m) checked one by one against
   `tools/suhl/out/bestand/ethos.json`.
5. **The whole city in GitHub Actions**, tiles for every level-10 tile with a building; checks (plan 5.3): ids unique, footprints
   valid, no building in two tiles, heights plausible, counts against `bestand.json` (30,929 ETHOS bodies in `stadt`), the centre of
   Suhl inside. Report sizes (kB per building, MB in total) and run time. Hand over to the publish action of `suhl-daten`
   (`suhl/g/v1/…`) or keep the artifact with its run id.
6. `docs/features/suhl-gebaeude.md` (German): what a record holds, where each field comes from and how good it is (measured, from
   data, estimated), numbers, sources and attribution, what LoD2 will improve, „Für den Suhl-Chat“.
