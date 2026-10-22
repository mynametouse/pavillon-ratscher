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
| Umbau Phase 0–2 (Plan: Projektdokument `claude/pavillon-umbau.md`) | Kern-Chat, session_01GdUYaP2XXAAEDXZpGWVkBm | `kern/*` → `src` | Phase 0 abgeschlossen bis auf Falkos Blick auf die Vorschau; Phase 1 beginnt | alles außer den Welt-Ordnern |
| Welt Woche 1: Quellen je Land, Testgebiet in GitHub Actions, Straßen als eigenes Bauteil, eigene Ansicht (Auftrag `claude/pavillon-welt.md`) | Hilfs-Agent des Kern-Chats | `welt/woche1` | läuft seit 22.10. 22:00 | `tools/welt/**`, `viz3/welt-viewer/**`, `.github/workflows/welt-*.yml`, auf `gh-pages` nur `welt-test/` |

## Absprachen

1. `src` ändert nur der Kern-Chat (Agenten liefern auf eigenen Branches, der Kern-Chat prüft und führt zusammen).
2. Agenten arbeiten nur in ihren Ordnern; was sie darüber hinaus brauchen, melden sie dem Kern-Chat.
3. Browser-Tests im Chat-Rechner nie zwei gleichzeitig (2 Kerne, SwiftShader verliert sonst den WebGL-Kontext); Agenten testen im Browser
   nur bei GitHub Actions.
4. Veröffentlichen über GitHub Actions: nach grünem Prüfpaket kommt die Vorschau nach `/vorschau/`, „Live stellen“ von Hand
   (`docs/WORKFLOW.md`, Abschnitt 4). Der Notweg aus dem Chat (`deploy_push.sh`) nur durch den Kern-Chat.
5. Gespeichertes nur über `SAVE` (`core/save.js`), Code formatiert (Prettier), `bash tools/check.sh` vor jedem Push.
6. Originale und Rohdaten: übergangsweise im privaten Repo `mynametouse/klingenholz-konfigurator`, Zweig `pavillon-originale` (Umzug ins
   eigene private Repo `pavillon-ratscher-assets`, sobald es existiert). Keine Schlüssel, keine Flurstücks- oder privaten Rohdaten ins
   öffentliche Repo.
7. Projekt-Dokumente im Claude-Projekt „Garten“ vor jedem Schreiben neu lesen (`project_write` ersetzt das ganze Dokument).

## Nachrichten (neueste oben)

- 22.10. 22:20 Kern: Datei verschlankt – ab jetzt ein Chat mit Hilfs-Agenten (Falko, 21:54). Klinge- und Dorf-Chat sind fertig (V16d und V16b6
  veröffentlicht); der Klinge-Chat sichert noch seine Originale (Anleitung: Nachrichten 21:15 und 21:30 im Verlauf dieser Datei).
