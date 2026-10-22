# Hinweise für Claude-Sitzungen in diesem Repo

- **Ein Chat, Hilfs-Agenten:** Seit 22.10.2026 arbeitet ein Chat (der Kern-Chat) mit Falko; parallele Arbeit erledigen Hilfs-Agenten, die er
  startet und prüft. Wer woran arbeitet, steht in `docs/PARALLEL.md` (Branch `src`) – beim Start und vor jedem Push lesen:
  `git fetch -q origin && git show origin/src:docs/PARALLEL.md`. Agenten arbeiten nur in ihren Ordnern und auf eigenen Branches.
- **Veröffentlichen** über GitHub Actions: grünes Prüfpaket → Vorschau `/vorschau/`, „Live stellen“ von Hand (`docs/WORKFLOW.md`, Abschnitt 4).
- Einstieg: `README.md`, `docs/WORKFLOW.md` (bauen, testen, veröffentlichen, parallel arbeiten), `docs/ARCHITECTURE.md` (Aufbau, Modulkarte).
- Stand für Menschen: Claude-Projekt „Garten“, Dokumente `claude/pavillon-ratscher-stand.md` und `claude/pavillon-entwicklung.md`
  (vor dem Schreiben neu lesen – `project_write` ersetzt das ganze Dokument).
- Code-Kommentare Englisch, Oberfläche Deutsch; keine Schlüssel, keine Flurstücks- oder privaten Rohdaten ins Repo.
