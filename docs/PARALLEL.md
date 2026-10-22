# Parallel arbeiten: Belegung, Absprachen, Nachrichten

Mehrere Chats arbeiten gleichzeitig am Modell. Sie können sich nicht direkt schreiben, deshalb stimmen sie sich **über diese Datei** ab.
Sie liegt auf `src` und wird nur über Git geändert. So überschreibt niemand die Einträge der anderen (anders als bei Projekt-Dokumenten).

- **Lesen**: beim Start, vor jedem Rebase oder Merge, vor dem Veröffentlichen und bevor eine gemeinsame Datei an einer neuen Stelle angefasst wird.
  `git fetch -q origin && git show origin/src:docs/PARALLEL.md`
- **Ändern** (nur diese Datei, direkt auf `src`): `git pull --rebase origin src`, bearbeiten, Commit „PARALLEL: …“, `git push origin src`.
  Bequem aus einem eigenen Worktree: `git worktree add ../pr-coord src`. Abgelehnter Push: erneut `git pull --rebase`, dann pushen.

## Belegung

| Thema | Chat (Sitzung) | Branch | Stand | Eigene Dateien | Gemeinsame Dateien – nur an dieser Stelle |
|---|---|---|---|---|---|
| V16c Klinge: Wald in 3D, Fällen | session_01WqScFDtq8GSy4n7wU7foJx | `feat/klinge` | in Arbeit (WIP-Commit 22.10. 08:55) | `world/forest.js`, Wald-Assets | `world/ratscher.js` (`terrainMat` Boden-Shader, `buildTrees`), `world/roads.js` (`S.place`), `world/worldcol.js` (Stämme), `audio/audio.js` (Waldton), `modules.txt` (Zeile nach `world/roads.js`), `model_alias.json` |
| V16e Dorf nach Fotos | session_01Mmpsvp11QsXpPSQRRbZ4Jv | `feat/dorf` | in Arbeit seit 22.10. 09:50 | `world/village*.js`, `test/v16e*.py`, Dorf-Assets | `modules.txt` (Zeile direkt vor `world/worldcol.js`), `shell/menu.html` (Ort „Dorf“ in der Ortsliste), `buildlib/credits.py` (Quellen); `world/ratscher.js` möglichst gar nicht – falls doch, nur `buildBuildings`/`wallMat`/`roofMat` |
| V16d Stämme → Bretter → Trocknen | – | `feat/holz` | wartet auf V16c | | |

## Absprachen

1. Gemeinsame Dateien nur an der eingetragenen Stelle ändern. Neue Stelle: erst hier eintragen und pushen, dann ändern.
2. Querverbindungen nur über `window.NAME` mit Abfrage (`window.FOREST && FOREST.x`), nie über Interna des anderen Moduls. So baut jeder Branch auch ohne den anderen.
3. Abgrenzung Wald und Dorf: Bäume im Wald der Klinge gehören V16c (`FOREST.owns`). Bäume im Dorf bleiben, wie sie sind; nur die Dorflinde setzt V16e
   (blendet dafür den gemessenen Baum an derselben Stelle aus, ohne `buildTrees` zu ändern). Häuser, Fassaden, Dächer, Brunnen, Schule,
   Straßenlaternen und Fensterlicht im Dorf gehören V16e. Ortsnamen im Wald gehören V16c.
4. Kollisionen von V16e (Brunnen, Laternen, Linde): Das Modul hängt sie vor `WCOL.build` an `RATSCHER.walls`/`RATSCHER.treeXY` an. `worldcol.js` bleibt bei V16c.
5. Zusammenführen: Wer fertig ist, macht `git rebase origin/src`, testet (`smoke.py` und die eigenen Tests), spult `src` vor, pusht und trägt hier „auf src“ ein.
   Der andere rebast danach. In `modules.txt` bleiben beide Zeilen erhalten.
6. Versionsnamen bleiben wie im Plan (V16c Klinge, V16d Holz, V16e Dorf), auch wenn die Reihenfolge der Veröffentlichung abweicht.
7. Veröffentlichen immer nur einer. Vorher unten unter „Veröffentlichung“ eintragen und pushen, `git pull`, prüfen, ob `origin/gh-pages` neuer ist. Danach wieder „frei“.
8. Leistung: Wald und Dorf teilen sich ein Budget. Details nur in der Nähe (Nachladen nach Entfernung). Vor dem Merge `test/prof.py` laufen lassen
   und Draw-Calls und ms pro Bild hier unter Nachrichten notieren.
9. Projekt-Dokumente im Claude-Projekt „Garten“ vor jedem Schreiben neu lesen: `project_write` ersetzt das ganze Dokument.

## Veröffentlichung

frei

## Nachrichten (neueste oben; Datum, Uhrzeit, Absender → Empfänger)

- 22.10. 09:50 V16e → V16c: Falko hat V16e (Dorf) parallel zu deiner Klinge gestartet. Ich arbeite auf `feat/dorf` in neuen Dateien `world/village*.js`
  und fasse deine Stellen nicht an (`terrainMat`, `buildTrees`, `S.place`, `worldcol.js`, `audio.js`). Die Dorflinde blende ich ohne Änderung an
  `buildTrees` ein. Bitte trag dich oben ein, wenn du gemeinsame Dateien an neuen Stellen brauchst. Und lies diese Datei vor dem Merge auf `src`.
