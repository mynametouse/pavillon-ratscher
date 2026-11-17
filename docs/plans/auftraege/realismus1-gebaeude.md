# Realismus Stufe 1 – Auftrag `gebaeude`: jedes Gebäude in Ratscher und Schleusingen plausibel von außen (17.11.2026, ~14:15)

First read `docs/plans/auftraege/realismus1-gemeinsam.md` (Falko's words, the yardstick, ownership, interfaces, how to work). Branch
`feat/gebaeude`, worktree `/home/claude/wt-gebaeude`, port **9044**. Your files: `viz3/src/welt/schleusingen.js` (its buildings),
`viz3/src/haeuser/haeuser_heute.js` (the look „heute“ of Ratscher's houses), new `viz3/src/fassade/**`, your tests, `viz3/extra/gebaeude/`,
`docs/features/gebaeude.md`.

Falko (13:27): „ein Haus ohne Tür macht keinen Sinn … die Hofeingänge, die teilweise durch Tunnel eben funktionieren … der Innenhof ist
einfach nicht betretbar. Das ist zum Beispiel Quatsch. … Teilweise hast du auch große Gebäude komplett ohne Fenster.“ (His examples are from
Suhl's Aue, which comes later; build the tools so they work there too.)

## 1 The audit first (`viz3/src/fassade/fassade_audit.js`, pure parts unit-tested)

- For every building of Ratscher (the geo buildings of `world/ratscher.js`, the houses of `haeuser/`, the village props) and of Schleusingen
  (`welt/schleusingen.js`): does it have an entrance (a door, a gate, a garage door – by its kind and size), windows on the facades that should
  have them, the passages and gateways the real one has (OSM: `tunnel=building_passage`, `covered=yes`, ways that cross a building; the
  satellite picture: gaps), a reachable yard behind? `FASSADE.audit(ort)` lists what is wrong; your test prints the counts per kind and place,
  and a picture of each kind of fix. The OSM data: what the builders already load (look how `welt/schleusingen.js` gets its buildings and
  ways; `tools/` has the fetchers) – if passages are not in the data yet, fetch them the same way (Overpass) and keep the file small.

## 2 Then the fixes

- **Doors and gates:** on the side facing the street or the yard, at ground level, sized by kind (house door, double door of a shop or an
  apartment block, a barn's gate, a garage door, a hall's roller door) – geometry or decals in the style of the building's facade, one shared
  material set. Where `HAEUSER` (Ratscher) or `SINNEN` (Schleusingen) already has a door, use its position and draw nothing twice.
- **Windows:** facades without windows get them in a plausible rhythm (by storey height and the building's kind: a house, a block of flats,
  a hall with a ribbon of high windows, a church); blank walls only where the real ones are blank. At night some are lit (emissive, a share
  by the hour – no lights).
- **Passages and yards:** where a real passage goes through a building, open it (an arched or flat gateway through the ground floor, its
  walls, ceiling and floor) and make the yard behind walkable (collision, the walker of the base game – see how Schleusingen's streets are
  walkable). Schleusingen's old town has gateways into yards; find them.
- Keep the outside look of each place coherent; check your pictures against photos of the real streets (Schleusingen's Markt, the streets
  around the Bertholdsburg; Ratscher's Anger and the farms).

## 3 Tests and delivery

- `viz3/test/gebaeude.py` with sections `:ratscher`, `:schleusingen` (and `viz3/extra/gebaeude/tests.txt`): the audit's counts before and
  after, frame time and draw calls before and after (stay within a few per cent), pictures (a street in each place by day and by night, a
  passage into a yard, a hall with its new windows). Existing tests of the places must stay green (`viz3/test/schleusingen.py`,
  `haeuser.py`, `schleusingen_innen.py`, `laeden.py` – run the relevant ones, or let Actions run them through your `tests.txt`).
- Report as in the common part; in the feature doc „Für den Lead“ what is left (with the audit's numbers) and how Suhl's Aue could use the
  same tools next.
