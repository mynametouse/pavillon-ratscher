# Umbau Phase 2 – Dienste, Aufgaben, Szenarien, Pakete (Plan, 23.10.2026)

Grundlage: Projektdokument `claude/pavillon-umbau.md` (Zielbild, Phase 2) und die Nacht vom 22. auf den 23.10.2026: acht Hilfs-Agenten
parallel an Falkos Wünschen (`docs/plans/plan_leben.md`), zusammengeführt vom Kern-Chat.

## Was die Nacht gezeigt hat

- **Parallel arbeiten klappt:** eigene Ordner, eine Marke je Thema in `modules.txt`, kleine Dateien über `viz3/extra/<thema>/`, Tests
  bei jedem Push (`feat.yml`) und auf `src` (Themen-Tests im Prüfpaket). Konflikte gab es nur in `core/save.js` (eine Zeile je
  Spielstand) und in den Dokumenten.
- **Engpass Browser:** im Chat-Rechner läuft ein Browser zur Zeit (2 Kerne) – Agenten warteten 10–20 min auf einen lokalen Lauf; auf
  GitHub dauert ein Thema 4–7 min, mit Einrichten 6–9 min.
- **Haken zur Laufzeit in fremde Teile:** das Dorf ersetzt eine Wand der alten Schule (`RATSCHER.bld[0]`) und leiht Lampen des
  Pavillons (`LIGHTS[0,1,3,4]`), die Nachbarn überschreiben `window.sitePlace` und ergänzen `SPOTS`, Winde und Bäume ändern den
  Fahrzeug- und Waldcode. Das geht, solange einer daran arbeitet – zwei Themen an derselben Stelle merken es erst im Spiel.
- **Drei Aufgaben-Systeme:** `game/quests.js` (fest verdrahtet, ~1 900 Zeilen, Tagebuch und Aufgabenkarte), das Dorf mit eigenem
  Tagebuch im Gesprächsfenster (`pav-dorf-v1`), der Ortsvorsteher mit Ansehen je Person. Das Tagebuch zeigt nicht alles.
- **Alles lädt beim Start**, auch was man nie besucht (gute Ausnahmen: der Raum der alten Schule erst ab 170 m, die Dorfbewohner nur
  abends). Shader-Übersetzungen beim Start: V16g 374, V16h 456; Programme 145 → 157.
- **Tests laden die ganze Welt** (GitHub ~35 s bis zum Bild, im Chat-Rechner 1–2 min) und prüfen Logik über Bilder und Schritte im Browser.

## Bausteine, in dieser Reihenfolge

1. **Kern-Dienste für Erweiterungen** (~1 Tag) – statt Haken in fremde Objekte. **Erledigt 23.10.2026** (`core/kern.js`, `docs/ARCHITECTURE.md`
   „Dienste für Erweiterungen“; umgezogen: Ortsnamen von Garten und Nachbarn, Sprungziele, Aktionsknopf, Lampen von Schulraum und Feuer;
   Schleusingen läuft auf `KERN.zone`; offen: der Schulraum auf `KERN.zone`, `window.TICKS` → ein Kern-Dienst):
   - `KERN.places`: Ortsnamen und Menüorte als Register (Fläche oder Kreis, Name, Vorrang, Innen/Außen) – ersetzt das Überschreiben von
     `window.sitePlace` und das Ergänzen von `SPOTS`.
   - `KERN.lights`: ein fester Satz geteilter Punktlichter, nach Nähe ausgeliehen und automatisch zurückgegeben (keine neuen Lampen, also
     keine neu übersetzten Shader) – ersetzt das Ausleihen von `LIGHTS[i]`.
   - `KERN.zones`: bauen und freigeben nach Entfernung (Muster des Schulraums): `zone({ x, y, r, build, drop })` mit Hysterese, Zeit
     und Speicher je Zone im Ladeprotokoll.
   - `KERN.act`: Einträge für den Aktionsknopf („Mit … sprechen“, „Öffnen“, „Aufheben“) als Register statt Abfragen in `game/play.js`.
   - `KERN.emit/on`: Ereignisse (gesprochen, aufgehoben, angekommen, gefällt, geladen …) für Aufgaben und Statistik.
2. **Ein Aufgaben-System** (~1–2 Tage) – **begonnen 23.10.2026:** ein Tagebuch über `KERN.tasks` (Quellen: Nachbarn, Dorf, Ortsvorsteher;
   die Aufgabenkarte folgt jeder) und `TASKS.define` (`core/tasks.js`: Schritte auf Ereignisse oder Prüfungen, `pav-tasks-v1`); offen: die
   Logik der alten Aufgaben umziehen, Texte als JSON: `TASKS.define({ id, title, who, steps: [{ text, target, done }], reward, rep })` – ein Tagebuch,
   eine Aufgabenkarte, ein Spielstand `pav-tasks-v1` über `SAVE` (die Stände aus `pav-quests-v1` und `pav-dorf-v1` werden übernommen).
   Die festen Aufgaben, die der Nachbarn, die des Dorfs und die Ortsvorsteher-Kette ziehen um; Schritte reagieren auf Ereignisse statt
   in jedem Bild abzufragen. Texte als Daten (JSON), damit neue Aufgaben ohne Code entstehen.
3. **Szenarien** (~1 Tag) – **begonnen 23.10.2026:** `KERN.scenario`, `?szenario=…` (Liste in `docs/ARCHITECTURE.md`); offen: Menü
   „Direkt zu …“, Zonen/Pakete je Szenario, `?nogeo` als Szenario `garten`: `?szenario=garten|dorf|freitag|wald|holz|schleusingen` – Startort, Uhrzeit, Tag, welche Zonen und Pakete
   laden (Garten ohne Umgebung wie heute `?nogeo=1`). Dieselben Szenarien starten die Tests (`lib.boot(pg, port, szenario='dorf')`) und
   stehen im Menü („Direkt zu …“). Die heutigen Schalter (`?dorf=freitag`, `?nogeo=1`, `?fell` …) werden Szenarien.
4. **Pakete nachladen** (~2 Tage). Messung 23.10. (`test/loadprof.py`, Software-Grafik, fertig gebauter Pavillon): die Startzeit geht fast
   ganz in das **Hochladen der Texturen** (`uploadTextures`/`initTexture` ~24–32 s von ~430 Texturen) und `applyTier` (~9 s); das Bündel selbst
   und die Aufbauschritte sind klein; 141 Shader-Programme mit 11,7 Mio. Zeichen GLSL. Also zuerst **Texturen je Zone erst beim Hinkommen**
   (Dorf, Wald, Werkstatt innen, Holz, Schleusingen/Veßra haben es schon), dann der Code: jedes Thema in `viz3/src/<paket>/` mit `paket.json` (Module, Abhängigkeiten, Zonen, Tests, Spielstände);
   `build.py` baut den Kern und je Paket ein eigenes Bündel, geladen beim Hinkommen (`import()`). Der Start lädt Kern und Garten; Dorf,
   Wald, Holz, Schleusingen und das Rathaus erst, wenn man hinfährt.
5. **Logik ohne Browser** (laufend): Zustand und Regeln von Aufgaben, Tagesablauf der Nachbarn (`LIFE`), Dorfkalender (`DCAL`), Wahl und
   Ansehen (Ortsvorsteher) als reine Module mit Einheitentests in `viz3/test/unit` – Millisekunden statt Minuten.

**Abnahme:** ein Thema lokal unter 1 min (Szenario), Prüfpaket auf GitHub ≤ 10 min, Start-Speicher und Shader-Zahl nicht höher als V16g
trotz der neuen Themen, das Tagebuch zeigt alle Aufgaben, keine Zuweisung an fremde `window`-Namen mehr (Prüfung in `tools/check`).

## Bis dahin (für Hilfs-Agenten)

- Wer zur Laufzeit in fremde Teile greift, schreibt es in `docs/features/<thema>.md` unter „Für den Kern-Chat“ (wie Dorf und Nachbarn) –
  das ist die Liste, die Baustein 1 abarbeitet.
- Neue Aufgaben weiter im eigenen Thema; Baustein 2 zieht sie um.
