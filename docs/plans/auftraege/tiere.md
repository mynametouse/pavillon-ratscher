# Auftrag `tiere` – die Tiere der Gegend in der Welt, und ein Hund, der lernt

Gestartet am 5.11.2026 ~23:35 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/tiere` (von `src`),
Worktree `/home/claude/wt-tiere`, Port 9003. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Konzept:
`docs/plans/plan_strategie.md` (Abschnitt 12). Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (where you work, testing, delivering; its „Why“ is about
tonight's other helpers). Your thema: `tiere`, port 9003. Then read `docs/plans/plan_strategie.md`, above all section 12 – Falko's wish (5.11.
23:20) and his choices (23:24): all four animal groups, and from Black & White a companion animal that learns from you. Falko, before going to
sleep: „Wichtig ist natürlich trotzdem immer der Realismus. Es soll möglichst eine Spiegelwelt oder ein digitaler Zwilling sogar werden.“

## Your topic: the animals that really live around Ratscher – in the world (seen in the first-person view too) and with influence
1. **Which and where – real:** find out which animals really live around Ratscher / Schleusingen (Thuringian Forest, Landkreis Hildburghausen):
   web search is fine (state wildlife and hunting statistics, nature conservation pages); write the list with sources into your feature doc.
   Expected among them: roe deer, wild boar, red deer, fox, badger, brown hare, raccoon, marten; birds like red kite, buzzard, eagle owl, black stork,
   raven, woodpeckers; wildcat and lynx (rare). Domestic: Ronald's goats exist already (`npc/*`, `garden/*` – find them; do not break them),
   chickens, a dog. Pests: bark beetle (in spruces), voles.
2. **Their life (realistic behaviour):** where (forest edge, fields, the stream, gardens), when (dawn and dusk, night; seasons – rut, young ones,
   winter), in groups or alone, shy (they flee from the walker at a realistic distance, from cars, from noise like the chainsaw), sounds (free
   recordings with credits). Few at a time near the player, more in the distance as cheap silhouettes or not at all; seen in the first-person view
   (a deer at the Klinge's edge at dusk, wild boar on the field at night, the red kite circling above the meadows by day).
3. **Their influence (for the world and the strategy mode):** browsing young trees and plants (the garden planner's plants – `gplan/*` – and the
   forest's young trees: protection by tree guards and fences), wild boar digging up lawn and beds (an electric fence helps), the fox and the
   chickens, the raccoon at the bins, the bark beetle in the spruces of the Klinge (`world/forest.js`, `world/fell.js` – infested trees, brown
   crowns, must go out within weeks), voles at the roots (the vole basket exists in the garden planner), rare species as „Naturwert“ and quiet zones
   (no felling near a black stork's nest in the breeding season). Make it an API (documented in `docs/features/tiere.md`, „API für Erweiterungen“):
   events, counts, damage per area and season, protection measures – the helper `strategie` (feat/strategie, „Ratscher von oben“) builds its
   events and heroes on it; Ronald as the hero of animals.
4. **The companion dog (Black & White, Falko's choice):** a dog (realistic, true size; name and breed decide sensibly – a German working breed fits
   a garden with goats and forest) that follows you, is called and sent, and **learns from you**: praise and scolding (keys/buttons in first person,
   clicks from above later) change its tendencies (herding the goats, driving off wild boar and deer from the garden, finding things, staying calm
   with the neighbours); its character and what it learned are saved (SAVE keys with checks). In the zombie night it may bark at zombies (optional).
5. **Models:** realistic where possible – free licences only (CC0 / CC BY with credits; no logins or API keys – sites that need them are out),
   animated (walk, run, graze, flee; the dog sits, lies, wags). If only stylised models are free, choose the most realistic and say so. Lazy loaded,
   few draw calls (instancing for groups), no new shader programs after the start (compile ahead), never a new light.
6. **Test** `viz3/test/tiere.py`: the animals appear where and when they should (jump the clock: dusk at the Klinge, night on the field, noon over the
   meadow), they flee from the walker, a protected young tree is not browsed and an unprotected one is (time-lapse), the bark beetle marks spruces,
   the dog follows, learns (praise/scold changes a tendency, saved after a reload), no new shader programs, no page errors, the normal game, the zombie
   night and Schleusingen unharmed; pictures you look at.

Order: (1) a few species really placed and moving (deer, wild boar, red kite) and the dog following (by ~1:30, pushed, green); (2) more species,
behaviour by time and season, sounds; (3) influence and the API; (4) the dog's learning; (5) polish, phone. Finish by about 6:30 with the final report.
