# Gemeinsame Regeln für die Hilfs-Agenten des Fotorealismus-Chats (`foto-*`)

Gestartet 18.11.2026 ~19:35 vom Fotorealismus-Chat (session_01L6Yrpe4euXqyTbnuvdamYz). Falko 19:22: „Parallel und so schnell wie möglich.“ Davor 18:50: „Es ging
ja nicht nur um Schatten, Rasen, Wiesen und Laub im Abendlicht oder Wasser des Stausees. Es ging natürlich auch um Gebäude, die gesamte
Atmosphäre, auch im Wald. Nichts sollte so ständig wiederholend sein, sondern natürlich und organisch und abwechslungsreich.“

## Falkos Auftrag (Auszug, wörtlich – „Projektauftrag: Fotorealismus-Upgrade für Pavillon Ratscher“, 18.11.2026)

- „Entwickle das bestehende Projekt … konsequent in Richtung maximal erreichbaren Fotorealismus. Das Ziel ist nicht lediglich eine
  optische Verbesserung oder ein typisches Browsergame mit etwas schöneren Texturen. Wir wollen eine visuell überzeugende, möglichst
  naturgetreue digitale Abbildung der realen Landschaft rund um Ratscher in Thüringen entwickeln.“
- „Oberstes Entwicklungsziel: maximale visuelle Qualität bei gleichzeitig sinnvoller Performance im Browser.“
- „Wichtig: Ersetze keine funktionierenden Komponenten ohne technischen Grund. Nutze die vorhandene Architektur und entwickle sie
  gezielt weiter.“
- Materialien: „Vermeide künstlich glatte, sterile und gleichförmige Oberflächen.“ Gelände: „Vermeidung sichtbarer
  Texturwiederholungen.“ Vegetation: „Vermeide den Eindruck eines Waldes aus identischen wiederholten 3D-Modellen.“ Gebäude: „Wo keine
  exakten Gebäudedaten vorliegen, sollen glaubwürdige Gebäude entstehen, aber niemals unbelegte Details als reale Tatsachen ausgegeben
  werden.“
- „Vermeide übertriebene Effekte, künstliche Sättigung und einen typischen Computerspiel-Look. Die Darstellung soll möglichst wie eine
  hochwertige reale Fotografie wirken.“
- „Arbeite nicht nach dem Prinzip, möglichst viele Effekte einzubauen. Jede Änderung muss einen erkennbaren visuellen oder technischen
  Mehrwert liefern.“
- „Vermeide: unnötigen Neuaufbau, rein kosmetische Änderungen, generische KI-generierte Texturen ohne Qualitätskontrolle, unrealistische
  Beleuchtung, übertriebene Postprocessing-Effekte, Performanceverschlechterungen ohne nachvollziehbaren Nutzen, nicht lizenzierte oder
  nicht nachvollziehbare Datenquellen.“
- „Implementiere die Verbesserungen direkt im bestehenden Repository. Arbeite in kleinen, nachvollziehbaren Schritten und teste nach
  jeder größeren Änderung, dass die Anwendung weiterhin funktioniert.“
- Falko am 17.11.: Realismus ist wichtiger als schnell etwas Schematisches; jede Darstellung logisch prüfen; **es muss im Browser
  flüssig bleiben**; lieber Stück für Stück in kurzen Versionen.

## Rules (English)

1. **Read first:** `CLAUDE.md`, `docs/WORKFLOW.md` (build, test, parallel work), `docs/ARCHITECTURE.md` (module map), and
   `docs/features/fotorealismus.md` (what this chat has built: the sun's shadow atlas, the hills' shadows, the air, the far vegetation;
   the changed three.js chunks – do not touch `viz3/src/foto/**`).
2. **Who looks at it:** Falko on a Dell Latitude 7290 (Intel UHD 620, Chrome/Edge) and an iPhone. The model must stay fluid there.
   So: no new work per frame worth mentioning, no new draw calls unless the brief allows them, triangles within the budgets of
   `viz3/test/leistung.py`, **at most 16 textures per shader program** (`lib.check_gl`; the ground shaders are at 16 already – new
   detail there only procedurally or as a layer of the existing array `core/detail.js`), nothing that needs the far shadows to look
   right (they are off on the tier „schnell“ and on phones). Memory on phones: `viz3/test/memphone.py` must stay green.
3. **What counts:** what a walker sees at eye height, at any time of day. Judge every change in pictures before and after from the
   fixed views of your brief (same camera, hour, weather) and look at them critically, like a photographer would: is it more natural,
   more varied, less sterile – or just different? Take out what does not clearly help.
4. **Means, in this order:** variation and wear in the existing shaders and materials (hashes per object and per place, large soft
   patches, dirt where dirt collects), per-instance variation (colour, size, turn), better use of the textures there are; then small
   geometry; new assets only CC0 (Poly Haven) with the licence noted where the project notes its credits – no generated textures
   without control, nothing unlicensed. Nothing invented may be passed off as the real place (generic detail is fine and is called
   generic in your doc).
5. **Your files only** (listed in your brief). Edits in shared files as few marked lines (`// feat/fotorealismus (<your name>)`).
   Not yours: `viz3/src/foto/**`, `docs/PARALLEL.md`, `docs/CHANGELOG.md`, `docs/UEBERGABE.md`, the other helpers' folders.
6. **Working place:** only your worktree and branch (in your brief). Build: `cd viz3 && python3 build.py --fast`. Serve:
   `python3 tools/csp/cspserve.py <your port> <your worktree>/viz3/dist` (start it once, in the background). **Browser only through**
   `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers bash tools/browser_lock.sh python3 …` – one browser at a time on this machine (2 cores;
   the lead and three other helpers use it too, the lock queues you: a load takes ~2 minutes, so plan your looks – several views per
   load, small pictures 960 × 540, `lib.page(b, 960, 540, tier='hoch')`; `viz3/test/lib.py` has the helpers, `viz3/test/fotoref.py`
   and `/home/claude/scratch/ana.py` are examples of views in one load). CPU work with `nice -n 10`.
7. **Tests:** `bash tools/check.sh` before every push. Your own test `viz3/test/foto_<name>.py` (with `lib.Checks`: a few checks that
   guard what you built – numbers from the scene or from pixels, plus `lib.check_gl`), listed in `viz3/extra/foto-<name>/tests.txt`
   (the CI's feature workflow runs what is listed there on every push to `feat/**`). Before your report run locally: your test,
   `smoke`, `leistung`, and the tests of the area you touched (your brief).
8. **Git:** commits with `-c user.name="Claude" -c user.email="noreply@anthropic.com"`, messages in English ending with
   `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01L6Yrpe4euXqyTbnuvdamYz`. WIP often to
   `wip/foto-<name>` (no CI). To `feat/foto-<name>` only a state that is worth merging (merge `origin/src` first, `tools/check.sh`
   green) – one push, then at most one more per 45 minutes. Never push to `src`, `live` or `kern/**`, never force-push, no bare
   `git stash`.
9. **Steps and reports:** work in steps a walker would notice. After the **first visible step** (aim: within an hour to an hour and a
   half) push it to `feat/foto-<name>`, write `docs/features/foto-<name>.md` (German: was neu ist, welche Dateien, Kosten, Tests,
   offen) and **end your turn with a short report**: what changed (three lines), the commit, the test results, where the before/after
   pictures lie (`/home/claude/scratch/foto/<name>/`), what you would do next. The lead looks at it, merges, publishes and resumes you
   for the next step. If something outside your files blocks you, say so in the report instead of working around it.
10. Code comments English, UI German; no keys, no private data in the repo.
