# Alte Blechgarage: Schiebetore nach Norden, Werkzeug, Rasenmäher mit Benzin (feat/garage, 23.10.2026)

Grundlage: Falkos Nachricht vom 23.10.2026, 10:53 (Auftrag `docs/plans/auftraege/garage.md`): zwei Schiebetüren nach Norden, Geräte drin,
den Rasenmäher herausholen und den Rasen mähen, Werkzeug in den Regalen, Benzin für Mäher und Aggregat.

## Was es gibt

| Was | Wo im Code |
|---|---|
| **Garage von Bauphase 0** (4 × 4 m Wellblech auf der Platte): Wände West, Süd (jetzt geschlossen), Ost; Nordseite mit 2,5 m breiter Öffnung, Sturz, verzinkte Winkel; oben eine **Laufschiene**, die über beide Ecken hinausläuft | `garden/garage.js` (vorher der Block oben in `pavilion/house_common.js`) |
| **Zwei Schiebetore** (Stahlrahmen mit Wellblech, je zwei Rollen in der Schiene, Griff außen und innen, Überwurf mit Vorhängeschloss am Osttor): jedes einzeln „Tor aufschieben“ / „Tor zuschieben“, es schiebt sich in gut einer Sekunde 1,3 m zur Seite, mit Blechrumpeln; es hält Fußgänger und Fahrzeuge dort auf, wo es gerade steht (`VEH.extra`) | `garden/garage.js` (`mkLeaves`), `garden/garage_play.js` (Schieben, Ton, Kollision) |
| **Innen**: Schwerlastregale an West- und Ostwand (Kartons, Kisten, Farbdosen, Öl, Sprühdosen, Blumentöpfe, Kabeltrommel, Heckenschere, Werkzeugkoffer rot und blau), Werkbank an der Südwand mit Schraubstock und Lochwand (Säge, Hammer, Schraubendreher, Schlüssel, Zangen, Winkel), Gartengeräte an der Wand (Spaten, Rechen, Hacke, Grabegabel, Besen), Erdsäcke und alte Reifen, Schubkarre, Bügelsäge, Schlauch am Wandhalter; **Leuchtstoffröhre** mit Schalter an der Tür („Licht an/aus“, flackert beim Einschalten; ihr Licht ist eines der Pavillon-Lichter, die vor dem Innenausbau frei sind – `KERN.lights.borrow`, keine neue Lampe) | `garden/garage.js`, Licht in `garden/garage_play.js` |
| Vor dem Tor ist der Boden ausgetreten (keine Farne, kein hohes Gras – `GRASS.bare`) | `garden/grass.js`, `garden/garage_play.js` |
| **Ab Phase 1 (Garage versetzt)**: die Garage am Südende des Gartens, jetzt mit offener Nordseite, Laufschiene und denselben zwei Schiebetoren, Bretterboden auf Betonplatten, Flachdach mit den zwei PV-Modulen wie bisher; innen das **Holzlager** (Bretter auf Stapelleisten an beiden Wänden, Balken an der Rückwand), Platz für Mäher und Kanister an der Tür; Ort „Garage (Holzlager)“; verschiebbar in der Draufsicht wie bisher | `garden/garage.js` (bis heute ein geschlossener Kasten in `garden/env.js`) |
| **Rasenmäher** (Benzin, grünes Stahlgehäuse, Grasfangkorb): „Rasenmäher nehmen“ am Griff → man schiebt ihn (er bleibt vorn, dreht mit dem Blick, S zieht ihn zurück, er stößt an Wände, Regale, Bäume, Tore, Fahrzeuge), „Motor starten“ (Seilzug; kalt erst beim zweiten Zug; nur mit Benzin); wo der laufende Mäher fährt, wird der Rasen kurz und heller bzw. dunkler je Richtung (**Mähstreifen**), in 5 Spieltagen wächst er nach; Tank 1 l ≈ 1 Spielstunde; Q lässt los (Sicherheitsbügel: der Motor geht aus) | `garden/garage_play.js`, Mäh-Schnittstelle `GRASS.cut/grow/cutSave/cutLoad/cutArea/bare` in `garden/grass.js` |
| **Aufgabe „Rasen mähen“** im Tagebuch (J): beginnt, wenn der Mäher zum ersten Mal läuft („Mäh den Rasen: 120 m² sollen kurz werden.“, dann je Viertel „Mäh weiter: gut 30 von 120 m² sind kurz.“ – die Karte klappt nur bei jedem Viertel auf), dann „Stell den Rasenmäher zurück in die Garage.“ (mit Pfeil); ist der Rasen nachgewachsen, beginnt sie beim nächsten Mähen neu | `garden/garage_play.js` (`TASKS.define`, Zustand in `pav-tasks-v1`) |
| **Roter Benzinkanister** (10 l): „Rasenmäher tanken“, „Aggregat tanken“; leer ist er am nächsten Morgen wieder voll (Tankstelle) | `garden/garage_play.js` |
| **Stromaggregat an der Werkstatt läuft mit Benzin**: Tank 12 l, leert sich, solange Maschinen laufen (1,1 l/h); leer bleiben die Maschinen aus; Anzeige „Stromaggregat (Benzin) · Tank …“, mit dem Kanister „Aggregat tanken“ | `garden/garage_play.js`, Beschriftung `garden/workshop.js` |
| **Huberts Dieselkanister** (jetzt olivgrün, der rote ist Benzin) steht in der alten Garage (Phase 0) bzw. in der Garage am Südende (ab Phase 1); Text der Aufgabe und Huberts Antworten (als Untertitel) nennen die Garage; durch das geschlossene Tor nimmt man nichts | `game/quests.js` (Diesel-Teile), `GARAGE.home` |
| Wechselt die Bauphase, ziehen Mäher und Kanister mit um, wenn sie an ihrem Platz standen (oder auf der Platte der alten Garage) | `garden/garage_play.js` (`onPhase`) |
| Sprungziel `garage`, Startsituation `?szenario=garage` (Bauphase 0, vor dem Tor; im Menü unter „Szenen“), drinnen „innen“ (`KERN.inside`); beim ersten Besuch ein Gedanke („Die alte Blechgarage – zwei Schiebetore …“) | `garden/garage_play.js` |
| Gespeichert: `pav-garage-v1` (Tore, Mäher: Ort, Richtung, Tank; Kanister: Ort, Inhalt; Aggregat-Tank; Licht; gemähter Rasen als Raster 0,25 m mit Stunden seit dem Mähen und Streifenrichtung, lauflängenkodiert) | `core/save.js` (eine Zeile), `garden/garage_play.js` |

Ereignisse: `garage:start` beim Anspringen, `garage:gemaeht` `{ m2, gesamt }` beim Abstellen (und alle 10 m² während des Mähens, dann mit
`laeuft: true`) – die Aufgabe „Rasen mähen“ nutzt `garage:start`, weitere Aufgaben können darauf aufbauen.

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8984 --serve garage:nogeo=1     # ~15 min
```

Abschnitte (`only=programs+doors+inside+night+mower+petrol+diesel+sued+reload`): Shader-Programme, die die alte Garage zusätzlich braucht;
Tore zu/halb/offen, sie halten auf, Südwand zu; Bilder innen; nachts die Röhre; Mäher herausschieben, drehen, starten, Streifen mähen
(gekürzte Büschel gezählt, daneben nichts), Tank sinkt, leerer Tank stoppt, Q, tanken, zurück in die Garage, die Aufgabe „Rasen mähen“
(beginnt, nächster Schritt, erledigt, nach dem Nachwachsen wieder frei); Aggregat (Benzin, tanken,
leer → Maschinen aus); Dieselkanister in der Garage, nicht durchs Tor, Phase 1 an der Garage im Süden; Garage im Süden (Tore, innen,
Mäher heraus, zurück nach Phase 0); Neuladen behält Mäher und gemähten Rasen, nach gut 5 Spieltagen ist er nachgewachsen.
Bilder in `out/garage/`. Bei GitHub läuft `garage` bei jedem Push auf `feat/garage` mit (`viz3/extra/garage/tests.txt`).

## Für den Kern-Chat

- Gemeinsame Dateien (klein): `viz3/src/modules.txt` (zwei Marken mit je einem Modul: `garden/garage.js` unter `garden/fences.js`,
  `garden/garage_play.js` unter `werk/kran.js`), `core/save.js` (ein Eintrag `pav-garage-v1`), `pavilion/house_common.js` (der alte
  Garagenblock ist jetzt ein Verweis), `garden/env.js` (der Block der versetzten Garage und seine zwei Hilfsfunktionen sind weg, ein
  Verweis), `pavilion/phases.js` („zwei Schiebetore nach Norden“ statt „Zufahrt von Süden“, A und B), `garden/grass.js`
  (Mäh-Schnittstelle, `GRASS.bare`; `footHideReg` merkt sich die Art: Rasen, Blume, Pflanze; neuer `window.GRASS`),
  `garden/workshop.js` (Beschriftung), `game/quests.js` (nur Diesel-Teile: Ort und Farbe des Kanisters, Text, zwei Antworten Huberts als
  Untertitel statt der Aufnahme, Umzug alter Spielstände).
- `docs/ARCHITECTURE.md`: neue `window`-Namen `GARAGE`, `GPLAY`, `GRASS`; Schlüssel `pav-garage-v1`; Modulkarte `garden/garage.js`,
  `garden/garage_play.js`; das Punktlicht der Garage ist geliehen (Abschnitt 1, „Punktlichter“).
- Die Aufnahmen `hubert_t_q_hilfe` / `hubert_t_q_kanister` (sie nannten das Aggregat) werden nicht mehr gespielt; neu vertonen wäre
  `tools/voices/lines3.py`.
- Die versetzte Garage hat den Gebäudeschlüssel `garage` behalten (gleicher Drehpunkt): gespeicherte Verschiebungen gelten weiter. Ihre Wände
  sind jetzt echte Kollisionen (Typ `wall`); der alte Kasten hatte einen `house`-Kasten, durch den Fahrzeuge fuhren.
- Takt: `KERN.tick(…, 'garden/garage_play')` (läuft nach der Gehphysik und vor `window.TICKS` – die Spielfigur sieht so schon, wo der Mäher
  sie hält; kein `window.TICKS` mehr).
- Aufgabe „Rasen mähen“: `TASKS.define` mit der id `garage-rasen` (im Tagebuch unter der Quelle `aufgaben`, Zustand in `pav-tasks-v1`);
  beginnt mit `garage:start`, nach dem Nachwachsen setzt `garden/garage_play.js` sie mit `TASKS.reset` zurück.
- Durch das geschlossene Tor nimmt man nur in der alten Garage (Phase 0) nichts; an der Garage im Süden bleiben Kanister und Mäher wie bisher
  überall in Reichweite (die Aufgaben-Tests der Nachbarn holen den Dieselkanister von irgendwo um sie herum).
