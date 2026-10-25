# Übergabe – Stand und offene Punkte (25.10.2026)

Für eine neue Claude-Code-Sitzung (lokal, Desktop oder Cloud), die den Kern-Chat übernimmt. Zuerst lesen: `CLAUDE.md`, dann
`docs/WORKFLOW.md` (bauen, testen, veröffentlichen, Wiederanlauf), `docs/ARCHITECTURE.md` (Modulkarte, Dienste), `docs/PARALLEL.md`
(Belegung, Absprachen; `git fetch -q origin && git show origin/src:docs/PARALLEL.md`) und `docs/plans/plan_phase2.md`.
Der Stand für Menschen liegt zusätzlich im Claude-Projekt „Garten“ (`claude/pavillon-ratscher-stand.md`, `claude/pavillon-entwicklung.md`);
Agenten und lokale Sitzungen können es nicht lesen – maßgeblich ist dieses Repo.

## Worum es geht

Browser-3D-Modell und Spiel „Pavillon Ratscher“ von Falko Carl (three.js r169, ES-Module, Oberfläche Deutsch, Code-Kommentare Englisch).
Repo `mynametouse/pavillon-ratscher`. Der Kern-Chat arbeitet mit Falko, führt grüne Zwischenstände der Hilfs-Agenten zusammen und
veröffentlicht.

## Stand

- **Live: V16r** (`PAV_BUILD` src `e50dbd2`, 25.10.2026): Gartenplaner Runde 2 (pflanzen, pflegen, ernten, kaufen bei Baumschule Kammbach,
  Zeitraffer), Aufgabe „Rasen mähen“ (alte Garage), geglättete Fahrt (kein Sprung auf der L 3004), Atelier-Geräusche und Einrichtungsdetails,
  Kloster Veßra ruckelfrei, `KERN.tick`. Davor V16q: Fahren bis Schleusingen und Kloster Veßra, alte Blechgarage als Start (Bauphase 0).
- **Neu seit 25.10. abends (Sitzung session_01C3rwfQiBXst7Xxmc9qjjx7):** freie **KI-Gespräche** mit Hubert und Ronald (Stimme, Claude
  Haiku 5.5 mit eigenem Schlüssel, Sprachausgabe, Meinung, Aufgaben, Weitererzählen am Tisch – `docs/features/ki.md`) und **Duzen im Dorf**
  (Texte in `game/quests.js`, `amt/*`; Huberts 16 Sätze neu aufgenommen über `.github/workflows/stimmen.yml`, Extra `viz3/extra/stimmen/`).
  **Live als V16s** (src 09201b1, 25.10.2026 abends, Prüfpaket grün).
- Arbeitszweig des Kern-Chats: `wip/kern` (Worktree `kern-wt`); `src` bekommt `git push origin wip/kern:src`, Prüfpaket läuft dort.
- Veröffentlichen: grüner Stand ohne Rückfrage live (`git push origin <sha>:refs/heads/live`, danach `PAV_BUILD` auf der Seite prüfen),
  Eintrag unter „Veröffentlichung“ in `docs/PARALLEL.md`. Kein Force-Push auf `main`.
- Tests: `tools/check.sh` vor jedem Push; Browser nie zweimal gleichzeitig (`tools/browser_lock.sh`, eigener Port); lange Läufe auf GitHub
  (`feat.yml` auf `feat/**`, `pruefpaket.yml` auf `src` und `kern/**`). Auslösen per `workflow_dispatch` aus dem Chat geht nicht (403).
- Commit-Nachrichten enden mit den Zeilen `Co-Authored-By: …` und `Claude-Session: …` (siehe Hinweis der Sitzung).

## Hilfs-Agenten

Aufträge wörtlich in `docs/plans/auftraege/`, Stand mit `bash tools/agents.sh`. Fertig: `vessra`, `garage`, `pflanzen`. Angehalten durch das
Wochenlimit bis 28.10.2026 5:00 (Berlin), danach per SendMessage fortsetzen: `gartenplaner`, `fahrt`, `einrichtung`, `texturen`.
Ohne die alte Sitzung gehen die Agenten verloren – dann neu starten mit dem Auftrag aus `docs/plans/auftraege/` und `docs/features/<thema>.md`.

## Offen, in dieser Reihenfolge sinnvoll

1. **Texturen (KTX2/Basis) übernehmen:** Branch `feat/texturen` (3bf0169, 312b723; Abschlussbericht des Agenten steht aus). Zusammenführen: `tex/`
   und glTF-Bilder, Doku, in `viz3/deploy_site.py` die Zeile „tex2/ für Wurzel und Vorschau überspringen“ (7efcf02), Kopierzeilen in
   `pruefpaket.yml` und `check.yml`. `TEX2_LIVE` bleibt `false` (core/assets.js), bis Falko die Vorschau auf iPhone **und** Laptop geprüft hat.
   Geschätzter Texturspeicher am iPhone: 125 statt 314 MB. `tex2/` auf gh-pages bleibt (`KEEP` in `deploy_site.py`).
2. **Letzte `window.TICKS`-Nutzer auf `KERN.tick` umstellen:** `boot.js`, `game.js`, `home.js`, `quests.js` (3 Stellen), `garten_in.js`,
   `workshop_lamp.js`, `render.js`, `minimap.js`, `vehicle.js`, `fahrt.js`, `welt.js`. Werkzeug: `node tools/check/ticks_to_kern.mjs <Dateien>`
   (Entfernungsstellen von Hand); Figur/Avatar läuft mit `{ late: true }`. Danach `window.TICKS` entfernen.
3. **Speicher nach einem Zonenbesuch:** nach Fahrt zum Markt und zurück 371 → 410 Texturen, 770 → 1266 Geometrien. Prüfen, ob `drop` der Zonen
   (Schleusingen, Veßra) und die Felder des Dorfs alles freigeben. Ein Testentwurf (`zonemem.py`) liegt nur im Scratchpad der alten Sitzung;
   er braucht die gemeinsamen Kachel-Hilfen (`viz3/test/*_tiles.py`).
4. **`world/roads.js`:** `endZ` der Brückenenden = Höhe der Straßenmitte + 0,02 (statt höchster Boden quer + 0,08); dann können die Rampen
   in `welt/fahrt.js` wieder weg.
5. **Aufgaben als Daten:** alte Aufgaben aus `game/quests.js` auf `TASKS.define` (`core/tasks.js`, Spielstand `pav-tasks-v1`) umziehen;
   Schulraum auf `KERN.zone`.
6. **Hubert:** zwei Antworten neu einsprechen (`tools/voices/lines3.py`).
7. **Aufräumen:** fertige Worktrees (`kern-ticks`, Agenten-Worktrees) löschen – die Auto-Freigabe der alten Sitzung hat das als
   „unwiderrufliche Zerstörung“ verweigert; Falko muss es erlauben oder selbst tun.
8. **Phase 2, Rest:** Szenarien mit Zonen/Paketen (`?szenario=…`), Pakete nachladen (erst Texturen, dann Code) – `docs/plans/plan_phase2.md`.
9. **Rückmeldungen der Agenten nach dem 28.10.:** Gartenplaner Runde 2 und Fahrt Runde 2 haben Nachläufer; Berichte lesen, grüne Stände mergen.

10. **KI-Gespräche, nächste Schritte** (`docs/features/ki.md`, „Offen“): echte Probe mit Schlüssel auf iPhone und Laptop (ElevenLabs aus dem
    Browser ist ungetestet), ein kleiner Server für den Schlüssel, damit Sarah und Christoph ohne eigenen reden können, Dorfbewohner frei
    reden lassen.

## Wünsche von Falko (23.–25.10.2026), die weiter gelten

Mit Hubert und Ronald frei reden (KI, Stimme, Sprachausgabe, Meinungen, Aufgaben, Weitererzählen); im Dorf duzen alle den Spieler
(und er sie); Gartenplaner mit Baumschule Kammbach; Fahren von Ratscher nach Schleusingen und Kloster Veßra; Startszene = Bauphase 0 (alte Blechgarage mit
zwei Schiebetoren nach Norden, Rasenmäher mit Benzin, Werkzeug, Stromerzeuger mit Benzin); umschaltbare Innenräume der Gartengebäude (Holzhaus
als Atelier mit Schaukelstuhl und ausklappbarem Gästesofa, Wohnwagen gespiegelt mit Bett rechts); Zwischenstände früh in die Vorschau und ihm
Bescheid sagen; alles dokumentieren, damit ein Chat-Absturz nichts kostet; sauberer Code.

Spielstand auf Anfang: Browser-Konsole `localStorage.clear()`; auf dem iPhone Websitedaten löschen; im Tagebuch „Neu beginnen“.

## Regeln

Keine Schlüssel, Flurstücks- oder privaten Rohdaten und keine Rohfotos ins öffentliche Repo. Vor `project_write` das Projektdokument neu lesen
(es ersetzt das ganze Dokument). Texturen-KTX2 bleibt auf live aus (siehe oben).
