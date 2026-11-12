# Auftrag `zukunft-welt` – Was-wäre-wenn-Modus: die sichtbaren Zukünfte in der Welt

Gestartet am 12.11.2026 ~21:45 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als zweiter Hilfs-Agent (großes Modell) neben `zukunft` (Sonnet: Daten,
Anzeige, Kennzahlen, Tests – Auftrag `zukunft.md`). Branch `feat/zukunft-welt` von `origin/feat/zukunft` (nach dessen erstem Push), Worktree
`/home/claude/wt-zukunft-welt`, Port 9008. Falko (12.11. 21:40): schneller und besser – ein zweiter Agent für die Optik. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/zukunft.md` (the whole what-if mode and its rules – they apply to you too), `docs/plans/auftraege/nacht-6-11-gemeinsam.md`
(where you work, testing, delivering), `docs/WORKFLOW.md`, and on feat/zukunft: `docs/features/zukunft.md` and the comment at the top of
`viz3/src/zukunft/zk_welt.js` (the interface `zk_modus.js` uses – keep it; if it must change, tell the lead).

**Your part: what the futures LOOK like in the world** – first person and from above, realistic (Falko: realism first, a mirror world, even a digital
twin). You own `viz3/src/zukunft/zk_welt*.js` (take over `zk_welt.js` from `zukunft`, which no longer edits it), assets under `viz3/extra/zukunft-welt/`,
`viz3/test/zukunft_welt.py`, `docs/features/zukunft-welt.md`. `zukunft` keeps data, panel, indicators and its tests.

Build, cheap but convincing (instanced, one material per kind, compiled ahead with `warmUp`, restored when the mode is left):
- **PV on roofs:** modules on the suitable real roof planes (3D buildings and village houses: orientation, tilt, area), 1.7 × 1.1 m with frames, rows
  with gaps and the edge distances installers keep, dark glass with a faint reflection; the share of roofs per variant.
- **A ground-mounted PV park:** rows of tables facing south on a plausible field (Annahme, from `zk_data.js`), 2–3 m high, row spacing, fence,
  inverter/transformer station, standing on the terrain.
- **Mobility:** the Mitfahrbank at its places (reuse the village-project bench of `amt/*` if it fits), a Rufbus sign at the stop and a small on-demand
  van (reuse the bus or traffic models).
- **Flood at the Schleuse:** a water surface at the level of the variant, only where the terrain lies below it (follow the valley, never a flat plate
  through hills), a muddy edge; Talsperre-like water material.
- **Heavy rain and drought:** wet or dry ground and grass via `wetter` (its ground uniforms), the stream's level.
- **Forest after the beetle, 2026 → 2060:** spruce die-back (grey-brown crowns, then fallen or cleared), clearings, regeneration and the planted mixed
  forest growing through the decades (tiere's young trees by kind, FOREST.tint).
- **Pictures:** 3–4 places per topic from the ground and from 60 m, before/after, compared critically with real photos of PV roofs, solar parks and
  floods; fix what looks fake.
- **Budget:** draw calls and memory fit a phone (instancing, no per-object meshes), no new shader programs after load, no page errors.
- **Test** `viz3/test/zukunft_welt.py` (each variant shows its objects, the year slider changes the forest, leaving restores „Heute“, programs and
  draw calls within budget, phone); your `viz3/extra/zukunft-welt/tests.txt` also runs `zukunft` and `strategie`.

Working rules as in `zukunft.md` (credits are scarce: plan first, targeted reads, few screenshot rounds, rely on CI). Merge `origin/feat/zukunft`
regularly (the other helper keeps pushing). **Report** when green: sha, what is in it, picture paths, shared-file edits, open points – then stop.
