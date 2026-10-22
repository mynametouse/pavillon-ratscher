# Abstimmung: wer arbeitet woran

Seit 22.10.2026 abends arbeitet **ein Chat** mit Falko: der **Kern-Chat**. Parallele Arbeit erledigen **Hilfs-Agenten**, die der Kern-Chat
startet, steuert und prüft – Falko muss nichts zwischen Chats hin- und hertragen. Diese Datei hält fest, wer gerade woran arbeitet, damit sich
Agenten und spätere Chats nicht in die Quere kommen. Alte Belegungen und Nachrichten (V16b–V16e, parallele Chats): Git-Verlauf dieser Datei
(`git log -p -- docs/PARALLEL.md`, Stand vor dem Verschlanken: Commit 8717e2d).

- **Lesen**: beim Start und vor jedem Push auf `src`: `git fetch -q origin && git show origin/src:docs/PARALLEL.md`.
- **Ändern**: nur über Git auf `src` (Commit „PARALLEL: …“).

## Belegung

| Thema | Wer | Branch | Stand | Dateien |
|---|---|---|---|---|
| Umbau Phase 0–2 (Plan: Projektdokument `claude/pavillon-umbau.md`) | Kern-Chat, session_01GdUYaP2XXAAEDXZpGWVkBm | `kern/*` → `src` | Phase 0 live (V16f, 22.10. 23:44); Phase 1, Fehlerbericht und die neuen Nachbarfiguren in der Vorschau – wartet auf Falkos Blick; dann Phase 2 | alles außer den Welt-Ordnern |
| Welt Woche 1: Quellen je Land, Testgebiet in GitHub Actions, Straßen als eigenes Bauteil, eigene Ansicht (Auftrag `claude/pavillon-welt.md`) | Hilfs-Agent des Kern-Chats | `welt/woche1` | Woche 1 fertig (23.10. 0:15, d3f5cd0) – wartet aufs Zusammenführen | `tools/welt/**`, `viz3/welt-viewer/**`, `.github/workflows/welt-*.yml`, auf `gh-pages` nur `welt-test/` |
| Garten: Türen, Dach, Bungalow mit Anbau, Hütte, Gewächshaus, Einrichtung (`docs/plans/plan_leben.md` 4) | Hilfs-Agent `garten` | `feat/garten` | ab 23.10. 1:45 | `garden/bungalow.js`, `holzhaus.js`, `greenhouse.js`, neue `garden/*_in.js`, `garden/places.js`, `viz3/extra/garten/`, `shell/css/garten.css`, `viz3/test/garten*.py`; Port 8971 |
| Spielfiguren Falko, Sarah, Christoph (3) | Hilfs-Agent `figuren` | `feat/figuren` | ab 23.10. 1:45 | `game/avatar.js`, `tools/player/`, Figurenwahl in `shell/menu.html`, `viz3/extra/figuren/`, `shell/css/figuren.css`, `viz3/test/figuren*.py`; Port 8972 |
| Nachbarn: Huberts Hof, Alltag, Ziegen nach Süden, Mähen, Gespräche, Aufgaben (1) | Hilfs-Agent `nachbarn` | `feat/nachbarn` | ab 23.10. 1:45 | `npc/*`, `game/quests.js`, neue `garden/hof_*.js`, `viz3/extra/nachbarn/`, `shell/css/nachbarn.css`, `viz3/test/nachbarn*.py`; Port 8973 |
| Dorfleben: Skatabend in der alten Schule, Feuer am Acker, Dorfbewohner (2) | Hilfs-Agent `dorf` | `feat/dorf` | ab 23.10. 1:45 | neuer Ordner `viz3/src/dorf/`, `world/village*.js`, `viz3/extra/dorf/`, `shell/css/dorf.css`, `viz3/test/dorf*.py`; Port 8974 |

## Absprachen

1. `src` ändert nur der Kern-Chat (Agenten liefern auf eigenen Branches, der Kern-Chat prüft und führt zusammen).
2. Agenten arbeiten nur in ihren Ordnern; was sie darüber hinaus brauchen, melden sie dem Kern-Chat.
3. Browser im Chat-Rechner nie zwei gleichzeitig (2 Kerne, SwiftShader verliert sonst den WebGL-Kontext): jeder Browserlauf – auch der
   Agenten – über `bash tools/browser_lock.sh …` und mit eigenem Port (`run.py --port 89xx --serve …`). Längere Prüfungen und Bilder auf
   GitHub Actions: `.github/workflows/feat.yml` läuft bei jedem Push auf `feat/**` (Schnellprüfung, smoke, Tests aus
   `viz3/extra/*/tests.txt`) und hebt `out/` als Artefakt auf (`gh run download`). Eigene kleine Dateien: `viz3/extra/<thema>/`
   (`viz3/extra/README.md`). Neue Module nur unter der eigenen Marke `# feat/<thema>` in `modules.txt`.
4. Veröffentlichen über GitHub Actions: nach grünem Prüfpaket kommt die Vorschau nach `/vorschau/`; seit 23.10. 1:05 (Falko) geht ein
   grün getesteter Stand vom Kern-Chat direkt live (`git push origin src:live`, `docs/WORKFLOW.md`, Abschnitt 4). Der Notweg aus dem Chat (`deploy_push.sh`) nur durch den Kern-Chat.
5. Gespeichertes nur über `SAVE` (`core/save.js`), Code formatiert (Prettier), `bash tools/check.sh` vor jedem Push.
6. Originale und Rohdaten: übergangsweise im privaten Repo `mynametouse/klingenholz-konfigurator`, Zweig `pavillon-originale` (Umzug ins
   eigene private Repo `pavillon-ratscher-assets`, sobald es existiert). Keine Schlüssel, keine Flurstücks- oder privaten Rohdaten ins
   öffentliche Repo.
7. Projekt-Dokumente im Claude-Projekt „Garten“ vor jedem Schreiben neu lesen (`project_write` ersetzt das ganze Dokument).

## Nachrichten (neueste oben)

- 23.10. 00:10 Kern: Die Nachbarn heißen wieder Hubert und Ronald (Falko, 22.10. 23:28; die Umbenennung in Günter/Bernd ist zurückgenommen,
  gespeicherte Stände mit `bernd` werden zurück übersetzt). Beide sind jetzt Rocketbox-Figuren wie die Spielfigur (`tools/player/build_npc.sh`).
- 22.10. 22:20 Kern: Datei verschlankt – ab jetzt ein Chat mit Hilfs-Agenten (Falko, 21:54). Klinge- und Dorf-Chat sind fertig (V16d und V16b6
  veröffentlicht); der Klinge-Chat sichert noch seine Originale (Anleitung: Nachrichten 21:15 und 21:30 im Verlauf dieser Datei).
