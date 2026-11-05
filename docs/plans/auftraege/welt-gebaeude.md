# Auftrag `welt-gebaeude` – jedes Gebäude in 3D, die flachen Dächer weg aus dem Bodenbild

Gestartet am 5.11.2026 ~23:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/welt-gebaeude` (von `src` 2d2d35cc),
Worktree `/home/claude/wt-welt-gebaeude`, Port 8997. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (context, Falko's words and decisions, data reachability,
where you work, testing, delivering). Your thema: `welt-gebaeude`, port 8997.

## Your topic: every building in 3D – no more walking over roofs printed on the ground
Falko walks over house roofs that are only in the aerial photo (flat on the ground) – in Ratscher (sheds, garages, barns, carports that
OpenStreetMap lacks), around Schleusingen beyond the old town, along the roads to Schleusingen and Kloster Veßra. Every building must stand
in 3D like the others, typical and fitting, at its true place – and its flat roof must vanish from the ground image.

1. **The buildings from data.** Source tonight: ETHOS.BUILDA (`DEG.csv`, Thuringia: footprint + height of every building, from the state's
   LoD2; ODbL). Stream it and keep only our areas (Ratscher's 2.4-km square – `world/ratscher.js`, `world/village.js`, the model ↔ UTM
   transform in `tools/geo/dop_th.py`; the tiled world – `welt/welt.js`, `tools/welt/wlib.py` (zones and blocks), `welt/schleusingen.js`
   (789 OSM buildings of the old town, `tools/welt/zone_schleusingen.py`), `welt/fahrt.js` (the roads to Schleusingen and Veßra),
   `welt/vessra.js`; Suhl if there is time). Reproject EPSG:3035 → 25832 → model. Compare with what stands already (OSM buildings of
   `world/ratscher.js`/`village.js`, the hand-modelled garden and its neighbours `garden/*`, Hubert's yard, the Dorfkern after Falko's video
   `world/dorfkern*.js`, Schleusingen's old town, Veßra): add only the missing ones (overlap test), never a second copy; leave existing
   buildings as they are tonight (note obvious height errors for the lead).
2. **Their look:** the village's own style (`world/village.js`: facades, windows, roofs, chimneys; Schleusingen's in `welt/schleusingen.js`)
   by size and height – a garage or shed (small, low: flat or mono-pitch roof, sheet or boards, a door/gate), a carport (posts and a roof, open),
   a barn (boards on a plinth, big gable roof), a house (the house styles); roof shape estimated (gable along the long side for houses, mono-pitch
   or flat for small and very large ones), roof colour from the orthophoto as `village.js` does. Keep the roof type a data field so the state's
   LoD2 (real roof shapes) can replace it later: write a small script that tries the LoD2 URL pattern and documents the swap (today the service
   answers „nicht verfügbar“).
3. **Solid:** they stop the walker and cars like the others (`world/worldcol.js`, `KERN.pushOut`, Ratscher's collision grid – find how the
   village's buildings collide). Cheap: merged per area/tile, lazy where possible; on phones the same buildings (they are few polygons).
4. **The roofs out of the ground image:** where a 3D building stands (the old ones and the new ones), the roof printed on the ground goes –
   including the part an orthophoto shows leaning beside the footprint (not a true orthophoto: the roof is displaced away from the photo's
   centre by roughly height × distance / flying height; estimate it from the photo or be generous with a buffer on the side away from the
   nadir). Fill with plausible ground from the surroundings (grass, yard, paving – inpainting, e.g. OpenCV Telea/NS or patch fill), soft edges,
   no seams, the colours of the surroundings. Ratscher first: its ground images are `viz3/dist/geo/ortho_*.jpg` (delivered from the gh-pages asset
   base; override them through `viz3/extra/welt-gebaeude/dist/geo/…` as `viz3/extra/fahrt/dist/geo/terrain.b64.json` does; mind the `_lq` variants
   and the compressed textures of `tools/tex`/`tex2` if they cover these files – find out). Consider replacing Ratscher's near ground with the 2024
   orthophoto (sharper, newer, matching today's buildings) if it fits in the night – then retouch that one.
   Then the tiles (`tools/welt`: orthophoto tiles 512 px WebP, built by the `welt-*.yml` workflows on GitHub Actions and published on gh-pages under
   `welt-test/…`): **never overwrite the live tiles** – build a retouched set into a NEW folder (e.g. `welt-test/v2/…`, by a workflow of your own
   or a new input of the existing ones), point the code at it behind a switch the lead flips after testing. If the tiles are too big for tonight,
   do Ratscher completely and write down exactly how to do the tiles.
5. **Masks from the helper `welt-dinge`:** it detects cars, trailers, woodpiles, pools … in the same 2024 photo and must remove them from the ground
   too. Your retouch tool owns the ground: it reads mask files `viz3/extra/*/maske*.json` (schema: `{ "src": "...", "polys": [[[x, y], …], …],
   "pad": m }` in model metres for Ratscher; for tiles UTM 25832 – document it in your feature doc) besides your own building footprints, so the
   lead can run it once more after merging both branches (document the command).
6. **Test** `viz3/test/welt_gebaeude.py`: the number of buildings added per area, none doubled (overlap), places where a roof was flat now have a
   building (pick a few known spots and look from the ground and from above – pictures before/after), walking into one stops, the ground image
   under/next to buildings shows no roof edge (pictures), no new shader programs, no page errors, the normal start and Schleusingen unharmed.
