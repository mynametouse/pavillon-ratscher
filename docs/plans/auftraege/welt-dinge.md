# Auftrag `welt-dinge` – Autos, Stellplätze und Dinge aus dem Luftbild in 3D

Gestartet am 5.11.2026 ~23:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/welt-dinge` (von `src` 2d2d35cc),
Worktree `/home/claude/wt-welt-dinge`, Port 8998. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (context, Falko's words and decisions, data reachability,
where you work, testing, delivering). Your thema: `welt-dinge`, port 8998.

## Your topic: what lies flat in the aerial photo stands in 3D – cars and parking places first
Falko walks over parked cars printed on the ground. Find what the 2024 aerial photo (20 cm) shows besides buildings and put it in 3D at its
true place: **cars** (as parking places, occupied by time of day – his choice), trailers, caravans, tractors/farm machines standing in yards,
woodpiles, round and square bales, pools, trampolines, greenhouses and garden sheds too small to be buildings (the helper `welt-gebaeude` does
the buildings from ETHOS.BUILDA – leave anything it has to it), containers, benches, playground things, maybe hedges/fences/walls where clear
(OpenStreetMap has some – `world/village_props.js` already puts fences, hedges, bins, woodpiles in the village: read it and do not double).

1. **Find them.** Ratscher's 2.4-km square first (model ↔ UTM in `tools/geo/dop_th.py`; the photo's RGB and CIR – infrared shows vegetation),
   then Schleusingen and the roads (the tiled world, `welt/*`). Ways: a pretrained aerial detector (e.g. an Ultralytics YOLO OBB model trained on
   DOTA – classes small-vehicle, large-vehicle, swimming-pool, tennis-court …; pip and GitHub are reachable; CPU is enough for a few hundred tiles),
   candidates from simple image analysis (non-vegetation blobs off the roads and roofs, their shadows for height), and **your own eyes**: look at
   crops with the Read tool in batches and classify or check them. Keep a list with type, position, orientation, size, confidence; check a sample
   of every type by eye. Make it reproducible (a script in `tools/welt-dinge/` or your extra; the photos themselves stay out of the repo).
2. **Cars as parking places** (Falko: „Stellplätze, belebt“): every detected car marks a place (driveway, yard, street side, public parking –
   OSM `amenity=parking` adds lots); a car stands there depending on the time of day and the day of the week (night most, workday mornings fewer,
   weekends more; lots by the time: the school, the shop, the church). Cars only change where nobody sees it (out of view or far). Models: a few
   generic body types (small car, estate, SUV, van, pick-up) without any brand, true size, plain materials, colours as on German streets, instanced;
   reuse what the game has (`vehicles/*`, `verkehr/verkehr_auto.js` draws driving cars – read it; do not change its behaviour). Parked cars are
   solid for the walker and for cars (`VEH.extra` boxes or the world's collision – see `vehicles/vehicle.js`, `world/worldcol.js`). Cars that
   `verkehr` drives may park on free places if it is cheap – else list it.
3. **The other things** in true size, simple and readable, instanced, plain materials; lazily built per area; few draw calls (merge per area).
4. **Off the ground image:** the flat cars and things must vanish from the ground (else a flat car lies beside the 3D one or where the place is
   empty). The helper `welt-gebaeude` owns the ground retouch; you deliver masks: `viz3/extra/welt-dinge/maske_dinge.json` (schema
   `{ "src": "welt-dinge", "polys": [[[x, y], …], …], "pad": m }`, model metres for Ratscher; for tiles UTM 25832 in a second file
   `maske_dinge_utm.json`). Until both are merged the photo may still show them – say so in your feature doc.
5. **Test** `viz3/test/welt_dinge.py`: numbers per type, a few known places checked (pictures from the ground and from above), parking places
   occupied differently at 3:00 and at 10:00 on a workday, nothing changes in view, walking into a parked car stops, no new shader programs, no
   page errors, the normal start, Schleusingen and the zombie night unharmed (in the zombie night parked cars may stay as they are).
