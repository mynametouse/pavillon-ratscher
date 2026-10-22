# Hinweise für Claude-Sitzungen in diesem Repo

- **Parallel arbeitende Chats stimmen sich über `docs/PARALLEL.md` ab** (Branch `src`): Belegung (wer, welcher Branch, welche gemeinsamen
  Dateien an welcher Stelle), Absprachen, Nachrichten zwischen den Chats. Die Chats können sich nicht direkt schreiben – diese Datei ist der
  Kanal, Falko soll nichts hin- und herkopieren müssen.
  - **Lesen**: beim Start, vor jedem Push, vor Rebase/Merge auf `src` und vor dem Veröffentlichen:
    `git fetch -q origin && git show origin/src:docs/PARALLEL.md` – Nachrichten an dich dort beantworten.
  - **Eintragen**: beim Start eine Zeile unter „Belegung“ (Thema, Sitzung, Branch, eigene und gemeinsame Dateien mit Stelle); ändern nur
    über Git auf `src` (eigener Worktree: `git worktree add ../pr-coord src`).
  - **Veröffentlichen** nur nach Eintrag unter „Veröffentlichung“, einer zur Zeit; Versionsnamen wie im Plan.
- Einstieg: `README.md`, `docs/WORKFLOW.md` (bauen, testen, veröffentlichen, parallel arbeiten), `docs/ARCHITECTURE.md` (Aufbau, Modulkarte).
- Stand für Menschen: Claude-Projekt „Garten“, Dokumente `claude/pavillon-ratscher-stand.md` und `claude/pavillon-entwicklung.md`
  (vor dem Schreiben neu lesen – `project_write` ersetzt das ganze Dokument).
- Code-Kommentare Englisch, Oberfläche Deutsch; keine Schlüssel, keine Flurstücks- oder privaten Rohdaten ins Repo.
