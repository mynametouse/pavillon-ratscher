# Auftrag `zeitreise-welt` – wie die Zukünfte aussehen und klingen: Hänge, Starkregennacht, Heizhaus, Windrad, Blackout

Gestartet am 13.11.2026 ~13:30 (großes Modell). Branch `feat/zeitreise-welt` von `origin/feat/zeitreise`, Worktree
`/home/claude/wt-zeitreise-welt`, Port 9013. Gemeinsamer Teil: `zeitreise-gemeinsam.md`. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/zeitreise-gemeinsam.md` (team, contracts, rules), then `docs/features/zukunft-welt.md` and the top comment
of `viz3/src/zukunft/zk_welt.js` (the first version's visuals: PV, solar park, flood at the Schleuse, the family forest's beetle states and
regrowth – reuse what fits by importing; the first version must keep working).

**Your part: what the states of the chronicle LOOK and SOUND like – so strongly that people feel the change** (Falko: a slight colour shift
of crowns „macht kaum etwas mit dem Bewusstsein der Menschen“). You own `viz3/src/zukunft/zk_zeitwelt*.js` (global `ZKZEITWELT`, contract in
the shared brief), assets under `viz3/extra/zeitreise-welt/`, `viz3/test/zeitreise_welt.py`, `viz3/extra/zeitreise-welt/tests.txt`,
`docs/features/zeitreise-welt.md`; marked hooks where needed in `world/forest.js`, `world/ratscher.js` (far trees), the terrain/aerial material,
the village's lights, `wetter/`, the audio system.

1. **API stub within ~45 minutes, pushed** (`warm/set/place/sound/clear`, doing little yet), so the regie can integrate. Then build:
2. **The slopes around the village** – the biggest lever: the coniferous forest on all slopes visible from the village (not only the family
   forest at the Klinge) follows `state.forest`: green → red-brown → grey → cleared (brown-grey ground with slash) → young green, in patches
   (beetle nests, stands), not as a uniform tint. Find where the conifers are (canopy data, CIR/aerial classification, OSM forest – what the
   repo already has) and how the far landscape is drawn (terrain with the aerial photo, far tree cards) and drive it with a mask and a few
   uniforms. Consistent with the near trees of the family forest (FOREST). Seen from the Anger and from the slope the change must be obvious.
3. **Logging:** harvester and forwarder at a forest edge, log piles by the road, a timber truck through the village in harvest years.
4. **Heating house and heat network:** a plausible small heating house (chip bunker, chimney, a pile of beetle-wood chips; site as an assumption,
   e.g. at a farm or the village edge), during construction the trench through the main street (excavator, barriers, pipe sections), afterwards
   a patched strip in the asphalt; in „Allein im Sturm“ the heating-oil truck at a house in winter.
5. **The wind turbine on a beetle clearing** (only where plausible, Annahme): construction (access road, foundation, crane), then a modern
   turbine (hub ~160 m, rotor ~160 m, turning) visible from the village; a red kite circling.
6. **The heavy-rain night:** heavy rain (weather presets), water flowing and rising in the street at place `strasse` with the phase, blue lights
   of the fire brigade, sirens; the morning after: mud on the street and bulky waste in front of the houses (sofas, mattresses, carpets) in
   „Allein im Sturm“, sandbags/barriers and a wet but intact street in „Gewappnet“; flood-mark plates on a house wall (2023 and the future year).
7. **The blackout night:** street lamps and windows of the village off, the glow of the towns on the horizon gone, stars; in „Gewappnet“ the
   old school lit warmly with a battery/generator container beside it, in „Allein im Sturm“ a few houses with their own batteries lit.
8. **Signs from the future** (recognisably fictional, marked „mögliche Zukunft“): at the planted area, at the heating house.
9. **Sound** (`sound(L, R, side)`): forest ambience by state (fewer birds with more dead trees, wind in dead crowns), harvester, heavy rain,
   sirens, running water, pumps, a generator's hum, the blackout's silence – through the app's audio system; only free sounds with licence
   notes (see how `wetter-ton.yml` / `zombie-ton.yml` fetched theirs).
10. **Split:** everything that differs between the two worlds of the pair on layer 21 (left) / 22 (right), common things on 0 – cheap
    (instancing, one material per kind, visibility by layers, no per-frame rebuilds). Budget: programs only in `warm()`, +0 on `set()`; draw
    calls and triangles within the phone budget when not split, within the desktop budget in the split.
11. **Pictures and test:** contact sheets at 1920×1080 from the regie's places (or your own poses until they exist) per chapter and year, both
    worlds; compare critically with real photos (dead spruce slopes in the Harz and the Thuringian Forest, streets after heavy rain, a heat-network
    trench in a village, a wind turbine in forest); fix what looks fake. `zeitreise_welt.py`: each state shows its objects, the slopes' colour
    changes with the years, layers 21/22 differ in the split, `clear()` restores today, programs and draw calls in budget, no page errors;
    `tests.txt`: `smoke`, `zeitreise_welt`, `zukunft`, `zukunft_welt`.

Report as in the shared brief: sha, what is visible, picture paths, frame cost, shared-file hooks, open points.
