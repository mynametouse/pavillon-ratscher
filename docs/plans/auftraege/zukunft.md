# Auftrag `zukunft` – Was-wäre-wenn-Modus, erste Fassung (Szenario-Werkstatt, virtuelles Reallabor)

Gestartet am 12.11.2026 ~21:05 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/zukunft` (von `src` a0ebb285, V17v),
Worktree `/home/claude/wt-zukunft`, Port 9007. Konzept: Projekt-Dokument `claude/pavillon-geschaeftsmodelle.md`, Abschnitt 1. Falkos Wahl
(12.11. 20:58): zuerst der Was-wäre-wenn-Modus; erster Testlauf für eine Kommune bzw. das Dorf (Ortsteil Ratscher, Stadt Schleusingen), ein halber
Tag vor Ort (Beamer, Moderation); alle vier Themen: Mobilität, Energie, Klimaanpassung, Wald nach dem Käfer. Wörtlich (englisch):

---

Read first: `docs/plans/auftraege/nacht-6-11-gemeinsam.md` (where you work, testing, delivering – its night timings do not apply), `docs/WORKFLOW.md`
(testing, helpers), `docs/ARCHITECTURE.md`, and the feature docs you build on: `docs/features/strategie.md` („API für Erweiterungen“: the top view,
its camera, layers, HUD), `docs/features/wissen.md` (WISSEN.add/found/why, the data views), `docs/features/strategie-dorf.md` (village projects, the
villagers' opinions in `amt/*`), `docs/features/tiere.md` (FOREST.tint, TIERE.kaefer), `docs/features/wetter.md` (wet/dry ground, WETTER),
`docs/features/bus.md` (BUS, BUSPLAN, the real timetable), `docs/features/welt-gebaeude.md` (the 3D buildings and their roofs).

**Goal** (Falko, 5.11.: „Möglichkeitsraum, in dem Zukünfte virtuell erprobt werden, ausgehend von einer digitalen Spiegelwelt. Desto realer die
Spiegelwelt, desto wertvoller die erprobbaren Szenarien.“): a mode in which a moderator and a village group explore futures of Ratscher in the twin,
compare variants side by side and see them in the world – the core of a half-day workshop on site.

## The first version
1. **Entry:** Menü → Erleben → Szenen → „Zukünfte erproben“, `?szenario=zukunft`, and a button in the strategy mode's HUD. It works from the top view
   (reuse the strategy mode's camera and layers) and in first person (walk there to see a variant).
2. **Four topics**, each with „Heute“ and 2–3 variants a village would really discuss:
   - *Mobilität:* Mitfahrbank (where), Rufbus/On-demand (research Thuringian examples), more trips to Schleusingen; the baseline from the real
     timetable (BUSPLAN / fahrplan.json: trips per day, travel time).
   - *Energie:* PV on suitable roofs (from the 3D buildings: orientation, area; PVGIS yield for Ratscher – wissen has „Strom von der Sonne“), a
     ground-mounted PV park on a plausible field (Annahme; keep distances, no protected areas), heat (heat pumps / Nahwärme as numbers).
   - *Klimaanpassung:* Starkregen (runoff, wet ground via wetter), Hochwasser at the Schleuse (a water level in the valley; the Thuringian flood
     hazard maps if reachable, else Annahme), Dürresommer (dry ground and grass, low stream, stressed forest).
   - *Wald nach dem Käfer:* decades in time-lapse – spruce die-back (tiere's beetle, FOREST.tint), clearings, natural regeneration vs. planted mixed
     forest (Waldumbau after ThüringenForst), how it looks in 2030 / 2040 / 2060.
3. **Time:** a year slider (2026 → 2030 → 2035 → 2045 → 2060 where it makes sense); the world and the numbers follow.
4. **Side by side:** variants A and B; the panel shows their indicators in two columns next to „Heute“; one key/button switches the world between A
   and B instantly (no double rendering).
5. **Five indicators, simple and honest:** Kosten (Investition und jährlich, €), CO₂ (t/Jahr), Lärm (betroffene Häuser/Stufen), Naturwert (index,
   consistent with wissen's data view), Stimmung (from the villagers' opinions – who is for or against and why, a few voices). Every number has a
   „Warum?“ (WISSEN.why): the calculation and its source, or „Annahme“. Ranges where uncertain, no false precision.
6. **Visible in the world** where cheap: PV modules on roofs and the PV field (instanced, one material, warmed at load), the Mitfahrbank and a
   Rufbus sign or vehicle at the stop, the flood water plane, wet or dry ground and grass, forest stages. Leaving the mode restores „Heute“.
7. **Workshop use:** a „Präsentation“ toggle for a projector (large type, clean screen: only the panel and the world), mouse and keyboard; phones must
   not break (participants' phones come later).
8. **Learning:** each topic opens entries in the Entdeckerbuch (WISSEN.add) – Rufbus, PV yield, HQ100, Waldumbau … – with sources.
9. Saved state (a SAVE key with checks), no new shader programs after load (`warmUp` from `render/render.js`), no page errors; the normal game, the
   strategy mode and the zombie night unharmed.
10. **Test** `viz3/test/zukunft.py`: open the mode; per topic switch variants – the indicators change plausibly and the world shows the variant
    (pictures you look at); the year slider changes forest and PV; A/B switch; a „Warum?“ with source; reload keeps the state; leaving restores
    „Heute“; no new programs; no page errors. `viz3/extra/zukunft/tests.txt` also runs `strategie` and `wissen`.

Not in this version: comments at places (Mitmach-Schicht), moderator/phone sync, a real hydraulic simulation.

## Realism
Realism first, true facts with sources (web search is fine): PVGIS yield, PV prices 2026, Rufbus examples and costs in Thuringia, emission factors
(UBA), flood levels (TLUBN) if reachable, forest conversion (ThüringenForst), DWD climate projections for Südthüringen. Cite in your feature doc and in
the „Warum?“; mark every assumption „Annahme“ in the interface.

## Working rules
- Branch `feat/zukunft`, worktree via `bash tools/agents.sh worktree zukunft`, port 9007, the browser only via `bash tools/browser_lock.sh …`; only
  your folders (`viz3/src/zukunft/`, `viz3/extra/zukunft/`, `viz3/test/zukunft*.py`, `docs/features/zukunft.md`, `tools/zukunft/`); shared files only
  with small marked hooks (`// feat/zukunft`), listed in your doc.
- **Credits are scarce (Falko):** think before you build, read only what you need, few screenshot rounds; rely on CI (`feat.yml` runs your
  `tests.txt` on every push to `feat/zukunft`); push complete increments.
- Code comments English, interface German, no keys, no private data.
- **Report** when the first full version is green: the green sha, what is in it, picture paths, shared-file edits, open points – then stop.
