# Hinweise für Claude-Sitzungen in diesem Repo

- **Ein Chat, Hilfs-Agenten:** Seit 22.10.2026 arbeitet ein Chat (der Kern-Chat) mit Falko; parallele Arbeit erledigen Hilfs-Agenten, die er
  startet und prüft. Wer woran arbeitet, steht in `docs/PARALLEL.md` (Branch `src`) – beim Start und vor jedem Push lesen:
  `git fetch -q origin && git show origin/src:docs/PARALLEL.md`. Agenten arbeiten nur in ihren Ordnern und auf eigenen Branches.
- **Veröffentlichen** über GitHub Actions: grünes Prüfpaket → Vorschau `/vorschau/`; ein grün getesteter Stand geht ohne Rückfrage live
  (Falko, 23.10.2026: `git push origin src:live`), neue Stände zwischendurch in die Vorschau zum Ausprobieren (`docs/WORKFLOW.md`, Abschnitt 4).
- **Absturz/Neustart:** alles Wichtige liegt auf GitHub (`src`, `feat/*`, `wip/kern`) und im Projekt „Garten“ – Anleitung `docs/WORKFLOW.md`,
  „Wiederanlauf nach einem Absturz des Chats“; Aufträge der Agenten wörtlich in `docs/plans/auftraege/`, Stand mit `bash tools/agents.sh`.
- **Browser** im Chat-Rechner nie zwei gleichzeitig: jeder Lauf über `bash tools/browser_lock.sh …` mit eigenem Port.
- **Übernahme durch eine neue Sitzung:** zuerst `docs/UEBERGABE.md` (Stand, offene Punkte, Wünsche von Falko).
- Einstieg: `README.md`, `docs/WORKFLOW.md` (bauen, testen, veröffentlichen, parallel arbeiten), `docs/ARCHITECTURE.md` (Aufbau, Modulkarte).
- Stand für Menschen: Claude-Projekt „Garten“, Dokumente `claude/pavillon-ratscher-stand.md` und `claude/pavillon-entwicklung.md`
  (vor dem Schreiben neu lesen – `project_write` ersetzt das ganze Dokument).
- Code-Kommentare Englisch, Oberfläche Deutsch; keine Schlüssel, keine Flurstücks- oder privaten Rohdaten ins Repo.
