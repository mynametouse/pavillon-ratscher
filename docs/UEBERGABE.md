# Übergabe – Stand und offene Punkte (25.10.2026, spät)

Für eine neue Claude-Code-Sitzung (lokal, Desktop oder Cloud), die den Kern-Chat übernimmt. Erster Satz an sie: „Lies docs/UEBERGABE.md und
mach mit den offenen Punkten weiter.“ Zuerst lesen: `CLAUDE.md`, dann `docs/WORKFLOW.md` (bauen, testen, veröffentlichen, Wiederanlauf),
`docs/ARCHITECTURE.md` (Modulkarte, Dienste), `docs/PARALLEL.md` (Belegung, Absprachen; `git fetch -q origin && git show
origin/src:docs/PARALLEL.md`) und `docs/plans/plan_phase2.md`. Der Stand für Menschen liegt zusätzlich im Claude-Projekt „Garten“
(`claude/pavillon-ratscher-stand.md`, `claude/pavillon-entwicklung.md`); Agenten und Cloud-Sitzungen können es nicht lesen – maßgeblich ist
dieses Repo. Diese Datei wird nach jedem größeren Schritt nachgetragen (Falko, 25.10.: „alles dokumentieren, damit du nicht den Kontext
verlierst“).

## Worum es geht

Browser-3D-Modell und Spiel „Pavillon Ratscher“ von Falko Carl (three.js r169, ES-Module, Oberfläche Deutsch, Code-Kommentare Englisch).
Repo `mynametouse/pavillon-ratscher`. Der Kern-Chat arbeitet mit Falko, führt grüne Zwischenstände der Hilfs-Agenten zusammen und
veröffentlicht.

## Stand

- **Live: V16u** (`PAV_BUILD` src `ec01bde`, 26.10.2026 vormittags, Falko: „stell alles live. Wenn grün“, Prüfpaket grün inkl. Thema `dorf`,
  `ki`, `piper`): KI-Gespräch gleich nach dem Schlüssel (iPhone-Fall unten), Piper-Stimmenwahl „Natürlich“, Tischgespräch im Dorf wartet auf den
  gesagten Satz. Davor V16t (`687a8e3`): Lautstärke je Kanal, KI mit allen Dorfbewohnern, eine Stimme je Person, 284 aufgenommene Sätze;
  V16s (`09201b1`): KI-Gespräche mit Hubert und Ronald, Duzen im Dorf. KTX2 weiter nur in der Vorschau.
- **Menü und Einführung (26.10., Falko: „Das Menü ist total überladen … Konzept für ein Tutorial“):** Menü in Seiten (Start: Weiter,
  Neu hier?, Aufgaben, Inventar, fünf Bereiche; Seiten Hingehen, Erleben, Gestalten, Einstellungen, Hilfe mit Zurück), Einführung
  `game/tutorial.js` (TUT, neun Schritte, erkennt selbst, was getan ist). Konzept und Umsetzung: `docs/features/tutorial.md`. Test `menu`
  49/49, `smoke` und `ki` grün; `figuren.py`/`v15a.py` öffnen jetzt die Seite. Auf `src`, live nach Falkos Freigabe.
- **Piper zusammengeführt (26.10. früh, `a049b00`):** Stimmenwahl „Natürlich“ (kostenlose Piper-Stimmen im Browser, einmal ~140 MB von
  Hugging Face, ~13 MB Laufzeit selbst gehostet, nur bei Wahl geladen); Standard bleibt „Gerät“. eSpeak NG (GPL) liegt als eigenes Programm mit
  Lizenz daneben (`viz3/extra/piper/dist/piper/`). Noch niemand hat zugehört (Artefakte aus dem Container nicht ladbar) – Falko fragen;
  iPhone-Speicher (~200 MB je Modell) erst am Gerät beurteilen. Empfehlung des Agenten: „Natürlich“ später Standard auf Rechnern.
- **Falko am iPhone (26.10. vormittags):** Schlüssel eingetragen, aber kein KI-Gespräch (Ingrid zeigte die Themen-Knöpfe). Ursache: der
  Schlüssel kam über den Hinweis im offenen Gespräch, das Panel schaltete danach nicht um (Hinweis weg, Themen blieben). Behoben in `npc/ki.js`
  (`rewire()` beim Schließen der Einstellungen, Schlüssel bei jedem Buchstaben gespeichert, Test `ki` 64/64); `audio/stimme.js` öffnet die
  Sprachausgabe beim ersten Tipp. Hubert und Ronald „nicht gefunden“: Freitagabend nach dem Skatabend ist es nach 22 Uhr – dann sind sie zu
  Hause (`npc/hours.js`, 22–6 Uhr); Falko auf Menü → Orte bzw. die Uhr hingewiesen. Kein Fehler gefunden; falls sie auch tagsüber fehlen,
  `NPC.real` (echte Figuren laden auf dem iPhone?) prüfen.
- **Seit 26.10. früh auf `src`/`wip/kern`:** `feat/texturen` zusammengeführt (`5f06afb`, KTX2 in der Vorschau, live aus); feste Sätze werden
  gesprochen (`78ba6d1`): `STIMME.say` spielt eine Aufnahme mit genau diesen Worten (`window.VOICEX`, auf Abruf) oder liest in der Stimme der
  Person vor („Feste Sätze vorlesen“) – Dorfbewohner, Tischgespräche, Murmeln, Aufgabensätze; 284 Sätze (`tools/voices/linien.mjs` →
  `linien.json`) sind aufgenommen (Zweig `stimmen/saetze`, `record_lines.py`, Extra `viz3/extra/saetze/`, 8,6 MB, gemergt `7ec4809`).
  edge-tts hat nur drei deutsche Männer (Conrad = Hubert, Florian = Ronald, Killian): Gerhard spricht mit Andrew, Wolfgang mit Brian
  (beide „Multilingual“, evtl. leichter Akzent), Uwe mit Jonas (de-AT), Manfred und Jens mit Killian; Frauen Katja, Amala, Seraphina.
  Hörproben an Falko geschickt – seine Rückmeldung abwarten, ggf. `WHO` in `record_lines.py` ändern und neu aufnehmen lassen.
- **Offen aus dem Prüfpaket `5f06afb`:** Thema-Test `ktx2` (nur Meldung) 14/15 – mit KTX2 ein Shader-Programm weniger als mit Bildern
  (144/154 gegen 145/155, Schlüssel `physical,STANDARD,…`): vielleicht fehlt einer Oberfläche die Textur. Nur Vorschau betroffen (TEX2 live aus).
  Artefakt „thema-ktx2“ ließ sich aus dem Container nicht laden (Blob-Speicher gesperrt) – lokal mit `?tex2=1` und `tex2/` nachstellen.
- Arbeitszweig des Kern-Chats: `wip/kern`; `src` bekommt `git push origin wip/kern:src` (vorher `git merge-base --is-ancestor origin/src HEAD`).
  In der Cloud-Sitzung liegt der Worktree unter `/home/user/src-wt` (Branch `wip/kern`), das Session-Repo `/home/user/pavillon-ratscher`
  (Branch `claude/fervent-wright-c0adaf`, nur die gebaute Seite – nicht zum Arbeiten).
- **Veröffentlichen:** Push auf `src` → Prüfpaket → bei Grün Vorschau `/vorschau/`. Live: `git push origin <sha>:refs/heads/live` (Workflow
  „Live stellen“). In der Cloud-Sitzung blockiert die Sicherheitsprüfung den Live-Push, bis Falko ihn im Chat ausdrücklich freigibt („Stelle live
  wenn geht“ hat gereicht). Danach prüfen: `git fetch origin gh-pages && git show origin/gh-pages:index.html | grep -o 'PAV_BUILD=[^;]*'`
  (github.io ist aus dem Container nicht erreichbar). CHANGELOG-Eintrag mit der nächsten Nummer.
- Tests: `bash tools/check.sh` vor jedem Push; Browser nie zweimal gleichzeitig (`tools/browser_lock.sh`, eigener Port); lange Läufe auf GitHub
  (`feat.yml` auf `feat/**`, `pruefpaket.yml` auf `src` und `kern/**`). Auslösen per `workflow_dispatch` aus dem Chat geht nicht (403).
  CI-Stand ohne `gh`: `curl -s "https://api.github.com/repos/mynametouse/pavillon-ratscher/actions/runs?branch=src&per_page=6"` oder die
  GitHub-MCP-Werkzeuge.
- Commit-Nachrichten enden mit den Zeilen `Co-Authored-By: …` und `Claude-Session: …` (siehe Hinweis der Sitzung).

## Eigenheiten der Cloud-Umgebung (gelernt am 25.10.)

- **Python-Playwright** fehlt anfangs: `pip install -q playwright==1.63.0` (passend zum vorinstallierten Chromium) und jeden Browsertest mit
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` starten; nie `playwright install`.
- **Gesperrte Hosts:** `speech.platform.bing.com` (edge-tts), `huggingface.co`, `cdn.jsdelivr.net`, `*.github.io`. Erreichbar: GitHub,
  npm-Registry, PyPI, `api.anthropic.com`. Was gesperrte Dienste braucht, läuft auf GitHub Actions – z. B. Sprachaufnahmen mit den
  Edge-Stimmen: Workflow `.github/workflows/stimmen.yml` (Push auf `stimmen/**` → `tools/voices/du_lines.py` → Commit des Extras
  `viz3/extra/stimmen/` in denselben Zweig; `build.py` setzt die Zeilen über `vm_replace` ein). Ein **neuer** Zweig löst den Lauf beim ersten
  Push nicht aus (der Pfadfilter vergleicht dann mit `main`, über 300 Dateien) – einen zweiten kleinen Commit hinterherschieben.
- Feste Sätze neu aufnehmen: Texte ändern → `node tools/voices/linien.mjs` → Commit → auf einen `stimmen/…`-Zweig pushen; es wird nur
  Neues aufgenommen. Stimmen je Person: `WHO` in `tools/voices/record_lines.py`.
- Die Bilder der Tests sehen schlicht aus (keine echten Texturen/Figuren im Container-Build, Stufe „schnell“, `nogeo`, Software-Grafik) –
  Falko hat danach gefragt; echte Optik nur in der Vorschau/CI.
- Ein Claude-API-Schlüssel ist im Container nicht vorhanden; die KI-Tests laufen gegen einen nachgebauten Dienst auf demselben Server
  (`viz3/test/ki.py`).

## Hilfs-Agenten

Aufträge wörtlich in `docs/plans/auftraege/`, Stand mit `bash tools/agents.sh` (alte Sitzung) bzw. `git log origin/feat/<thema>`.

- **Laufen seit 25.10. spät (diese Sitzung):** `verkehr` (Branch `feat/verkehr`, Worktree `/home/user/wt-verkehr`, Port 8986: Spaziergänger
  und Autos in Ratscher und Schleusingen, Autos anhalten, mitfahren, selbst fahren; Gespräche mit Fremden über `KI.person`) und `piper`
  (Branch `feat/piper`, Worktree `/home/user/wt-piper`, Port 8987: natürliche kostenlose Stimmen im Browser über `STIMME.engine('piper', …)`,
  testbar nur auf CI). Ihre Berichte lesen, grüne Stände in `wip/kern` mergen, testen, auf `src`.
- Fertig (alte Sitzung): `vessra`, `garage`, `pflanzen`. Angehalten durch das Wochenlimit bis 28.10.2026 5:00 (Berlin): `gartenplaner`, `fahrt`,
  `einrichtung`, `texturen` – sie gehörten zur alten Sitzung und sind von hier nicht erreichbar; bei Bedarf neu starten mit dem Auftrag aus
  `docs/plans/auftraege/` und `docs/features/<thema>.md`.
- Geht diese Sitzung verloren: `verkehr` und `piper` mit ihren Aufträgen neu starten (Worktree aus `origin/feat/<thema>`, nicht aus `src`, damit
  ihr Stand bleibt).

## Offen, in dieser Reihenfolge sinnvoll

1. **Rückmeldung von Falko zu V16u:** KI-Gespräch am iPhone (Schlüssel, Mikrofon, Sprachausgabe), Stimmen der Dorfbewohner (Edge-Aufnahmen)
   und „Natürlich“ (Piper), Hubert und Ronald tagsüber sichtbar? KTX2 in der Vorschau auf iPhone und Laptop.
2. **Agent `verkehr`** (`piper` ist gemergt): Bericht lesen, CI-Ergebnisse und Bilder (Artefakt „out“) ansehen, mergen, Vorschau, Falko fragen.
   Danach: Spaziergänger und Fahrer mit `KI.person` anmelden (falls der Agent es nicht schon tut), Piper als Standard-Stimme, wenn schnell genug.
3. **KI-Gespräche, nächste Schritte** (`docs/features/ki.md`, „Offen“): echte Probe mit Schlüssel auf iPhone und Laptop (ElevenLabs aus dem
   Browser ungetestet); ein kleiner Server für den Schlüssel, damit Sarah und Christoph ohne eigenen reden können; das Weitererzählte am
   Skattisch und am Feuer vorlesen.
4. **Texturen (KTX2/Basis):** `feat/texturen` am 26.10. früh in `wip/kern` zusammengeführt (Konflikte `deploy_site.py`: neue Regel des Agenten
   – `tex2/` nie aus einem Build kopieren, die Vorschau lädt `../tex2/`; `build.py`: `vm_replace` und TEX2 beide behalten). In der Vorschau an,
   live aus (`TEX2_LIVE = false` in `core/assets.js`) – bis Falko die Vorschau auf iPhone **und** Laptop angesehen hat (`docs/features/texturen.md`,
   „Was Falko ansehen sollte“). `extra/texturen/tests.txt`: nur noch `ktx2` (memphone/softgl/gpu laufen im Prüfpaket ohnehin, `ktx2prof` von Hand).
5. **Letzte `window.TICKS`-Nutzer auf `KERN.tick` umstellen:** `boot.js`, `game.js`, `home.js`, `quests.js`, `garten_in.js`,
   `workshop_lamp.js`, `garage_play.js`, `render.js`, `minimap.js`, `vehicle.js`, `fahrt.js`, `welt.js` (Stand 25.10.: 18 Stellen).
   Werkzeug: `node tools/check/ticks_to_kern.mjs <Dateien>`; Figur/Avatar mit `{ late: true }`. Danach `window.TICKS` entfernen.
6. **Speicher nach einem Zonenbesuch:** nach Fahrt zum Markt und zurück 371 → 410 Texturen, 770 → 1266 Geometrien – `drop` der Zonen und die
   Felder des Dorfs prüfen (Testentwurf `zonemem.py` lag nur im Scratchpad der alten Sitzung; braucht `viz3/test/*_tiles.py`).
7. **`world/roads.js`:** `endZ` der Brückenenden = Höhe der Straßenmitte + 0,02; dann die Rampen in `welt/fahrt.js` (`rampAt`) entfernen.
8. **Aufgaben als Daten:** alte Aufgaben aus `game/quests.js` auf `TASKS.define` umziehen; Schulraum auf `KERN.zone`.
9. **Hubert:** zwei Antworten neu einsprechen – geht jetzt über `stimmen.yml`/`du_lines.py` (Texte dort ergänzen).
10. **Aufräumen:** fertige Worktrees der alten Sitzung; die hiesigen (`/home/user/stimmen-wt`, später `wt-verkehr`, `wt-piper`) nach dem Merge.
11. **Phase 2, Rest:** Szenarien mit Zonen/Paketen, Pakete nachladen (Muster jetzt: `viz3/src/lazy/*.js` → `dist/lazy/`) – `plan_phase2.md`.

## Verlauf dieser Sitzung (25.10.2026, session_01C3rwfQiBXst7Xxmc9qjjx7)

- ~22:00 Übernahme nach dieser Datei; `tools/check.sh` auf `e81eb79` grün; Weg „wip/kern → src → live“ mit Falko vereinbart.
- Falko: mit Hubert und Ronald reden wie mit einer KI (Stimme, Haiku, Sprachausgabe, Aufgaben, Meinungen, Weitererzählen) → V16s.
  Entscheidungen: eigener Schlüssel im Browser (öffentliche Seite, kein Server), `thinking: disabled` + `effort: low` für schnelle erste
  Worte, Gespräch nur anhängen (Prompt-Cache), SDK nachgeladen statt im Bündel (+347 KB nur bei Nutzung), Aufgaben nur aus prüfbaren Orten
  und Ereignissen.
- Falko: im Dorf duzen alle → Texte umgestellt, Huberts Aufnahmen über GitHub Actions neu (Edge-Stimme im Container gesperrt). Beim „Sie“
  bleiben Bürgerbüro und Bürgermeister in Schleusingen und der Kassenzettel der Baumschule (Falko gefragt, keine Antwort bisher).
- Falko: Lautstärke, alle Dorfbewohner per Stimme, realistischere kostenlose Stimmen, Leute und Autos auf den Straßen, Autos anhalten
  (GTA-ähnlich, aber freundlich) → Kern-Chat: Lautstärke, `audio/stimme.js`, Dorfbewohner (`44d6fb5d`); Agenten `verkehr`, `piper`.
- Falko: alles dokumentieren → diese Datei, PARALLEL, Aufträge, `docs/features/ki.md` werden nach jedem Schritt nachgetragen.
- Falko: „Arbeite und veröffentliche weiter“ (26.10. ~0:30) → der Live-Push wurde trotzdem von der Sicherheitsprüfung blockiert (jede
  Veröffentlichung braucht seine ausdrückliche Freigabe im Chat). V16t (`44d6fb5`, Vorschau) wartet darauf. Weiter: Texturen zusammengeführt,
  feste Sätze sprechen lassen, Aufnahmen auf GitHub.

- 26.10. vormittags: Falkos iPhone-Fall (Schlüssel im offenen Gespräch) behoben, V16u live (`ec01bde`, „stell alles live. Wenn grün“).
  Dann: Menü vereinfachen und eine Einführung – Konzept in `docs/features/tutorial.md`, Menü in Seiten, `game/tutorial.js`, Test `menu`.

## Wünsche von Falko (23.–25.10.2026), die weiter gelten

Mit allen Leuten im Dorf frei reden (KI, Stimme, Sprachausgabe, Meinungen, Aufgaben, Weitererzählen), jede Person mit passender, möglichst
natürlicher Stimme ohne laufende Kosten; Lautstärke je Kanal einstellbar; im Dorf duzen alle den Spieler (und er sie); Leute schlendern durch
Ratscher und Schleusingen, Autos fahren, man kann sie anhalten; Gartenplaner mit Baumschule Kammbach; Fahren von Ratscher nach Schleusingen und
Kloster Veßra; Startszene = Bauphase 0 (alte Blechgarage mit zwei Schiebetoren nach Norden, Rasenmäher mit Benzin, Werkzeug, Stromerzeuger mit
Benzin); umschaltbare Innenräume der Gartengebäude (Holzhaus als Atelier mit Schaukelstuhl und ausklappbarem Gästesofa, Wohnwagen gespiegelt
mit Bett rechts); Zwischenstände früh in die Vorschau und ihm Bescheid sagen; alles dokumentieren, damit ein Chat-Absturz nichts kostet;
sauberer Code.

Spielstand auf Anfang: Browser-Konsole `localStorage.clear()`; auf dem iPhone Websitedaten löschen; im Tagebuch „Neu beginnen“ (setzt jetzt
auch das Gedächtnis der Leute zurück – Ereignis `reset`).

## Regeln

Keine Schlüssel, Flurstücks- oder privaten Rohdaten und keine Rohfotos ins öffentliche Repo (der Claude- und der ElevenLabs-Schlüssel des
Spielers bleiben in seinem Browser, `SAVE` mit `secret`). Vor `project_write` das Projektdokument neu lesen (es ersetzt das ganze Dokument).
Texturen-KTX2 bleibt auf live aus (siehe oben). Falko nie bitten, einen Schlüssel in den Chat zu schreiben.
