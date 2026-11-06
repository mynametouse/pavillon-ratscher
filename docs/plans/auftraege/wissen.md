# Auftrag `wissen` – Entdecken und Lernen: das Entdeckerbuch, Erklärungen, Orte der Geschichte, Daten-Ansichten

Gestartet am 6.11.2026 ~1:25 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent der zweiten Welle, Branch `feat/wissen` (von `src`),
Worktree `/home/claude/wt-wissen`, Port 9006. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Konzept:
`docs/plans/plan_strategie.md` (Abschnitt 13). Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (where you work, testing, delivering; its „Why“ is
about the first helpers of the night). Your thema: `wissen`, port 9006. Then read `docs/plans/plan_strategie.md`, above all section 13 – Falko
(5.11. 23:28, verbatim): „… wichtig ist mir wirklich, dass man hier viel über die Natur lernt und alternative Zukünfte … aber auch wirklich
etwas lernt über die Welt, über die Natur, über verschiedene Handwerke, über die Menschen, über die Politik letztendlich sogar, über Soziales,
über die Geschichte. Viel zu entdecken soll es geben und viel zu lernen.“ He chose all four fields first: nature, crafts, history, politics &
social matters. Realism and true facts with sources are the measure.

## Your topic: a world full of things to discover and learn – across every mode
1. **The discovery book („Entdeckerbuch“):** one German book (menu entry, a key, a button in the strategy mode's HUD when it exists), chapters
   Natur, Handwerk, Geschichte, Politik & Soziales, Orte; each entry short (what it is, why it matters here, a picture or symbol, the real
   source), found by doing and seeing: listen to KERN events of the others – `tiere:entdeckt` (feat/tiere), `strategie:entdeckt` (feat/strategie),
   places reached (the place names of `game/player.js`, `KERN.spot`s, zones of `welt/*`), steps of the crafts (`werk/*` the board game, `world/fell.js`
   felling, `werk/winde.js`, `gplan/*` planting with its plant database and sources, `garden/*` atelier pottery and painting), the Ortsvorsteher
   system (`amt/*`: ThürKO, council, budget). Make it an API (`WISSEN.add(def)`, `WISSEN.found(id)`, `WISSEN.why(id)`) documented in your feature
   doc so every feature can add entries; progress per chapter; a soft notice when something new is found; saved (SAVE key with checks).
2. **Real content, researched (web search is fine; cite):** nature around Ratscher (forest, the stream, meadows, the bark-beetle crisis and the
   forest conversion, the red kite, seasons), crafts (wood from tree to board – what the game already teaches, felling after DGUV, drying, gluing;
   pottery; later Thuringian crafts: glass-blowing in Lauscha, charcoal burning, slate, half-timbering), history (the Counts of Henneberg and their
   Bertholdsburg in Schleusingen, Kloster Veßra founded by them, Ratscher's old school of 1828 and its village lime of 1888, the dam, the GDR time
   – the house interiors show three periods –, the village's past), politics & social matters (Ortsteil, Ortsteilrat and Ortsteilbürgermeister in
   Thuringian law, the town council, volunteer fire brigade, associations, village community). Short, correct, German; every fact with its source.
3. **„Warum?“ explanations:** a library of one-sentence reasons with sources for the game's rules (quiet hours, neighbour-law distances, felling in
   sap rest, protective gear, building permits …) that any feature calls (`WISSEN.why(id)` → text + source); a small „?“ next to a refusal or a rule.
4. **Places of history and teachers:** small markers or signs at the real places (where cheap; information boards as in reality), and people as
   teachers – Gerhard (retired teacher, village chronicler) for history, the forester for the forest, Ingrid for the municipality, Hubert and Ronald
   for crafts and animals: a topic in their talk („Erzähl mir von …“) that opens an entry (`npc/*`, `dorf/*` talk topics – minimal marked hooks).
5. **Data views (SimCity, „Lernen durch Sehen“):** on the plan view (the strategy mode's top view when it exists, else the existing plan view)
   switchable layers from the world's real data: noise (machines, roads, quiet hours), traffic (verkehr, the counts if known), sun hours/shade (the
   garden planner computes shade), nature value (species seen, hedges, old trees, protected zones), mood/reputation (amt) – simple coloured overlays,
   a legend, cheap.
6. **Test** `viz3/test/wissen.py`: entries found by events and by places, the book opens with chapters and sources, a „Warum?“ shows text and source,
   a teacher's topic opens an entry, a data view on and off, saved after a reload, no new shader programs, no page errors, the normal game, the zombie
   night and the strategy mode unharmed; pictures you look at.

Push complete increments (CI is crowded tonight; at most about every 40 minutes). First increment by ~3:00, finish by ~6:45 with the final report.
