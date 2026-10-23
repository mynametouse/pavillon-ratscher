# Nachbarn: Huberts Hof, Ronalds Weide, Alltag und Aufgaben (feat/nachbarn, 23.10.2026)

Grundlage: `docs/plans/plan_leben.md`, Abschnitt 1 (Falkos Wünsche).

## Was es gibt

| Was | Wo im Code |
|---|---|
| Huberts vier Gebäude als **nach Osten offene, überdachte Werkstätten** (Rückwand, Giebel, Pfosten und Rähm an der offenen Seite, Satteldach; innen Werkbank mit Werkzeugwand, Regale, Brennholz, Bretterstapel, Schraubstock, Werkzeugkisten, Leiter; je Gebäude ein alter Anhänger, Säcke und Schubkarre, Amboss, Ölfässer und Reifen) | `garden/hof_hubert.js` (`SHEDS`); in `garden/env.js` bauen die alten Scheunen nicht mehr |
| Sechs **Trockenhütchen** (1 × 1 m, 2 m hoch, Lattenwände, kleines Ziegeldach, vorne offen mit gestapeltem Holz); die fünfte füllt sich (`HOF.fillHut`) | `garden/hof_hubert.js` (`HOF.huts`) |
| **Holzplatz**: Stämme auf Unterlegern, Sägebock, Hackklotz, Rugel, Haufen Scheite; **Tisch mit zwei Stühlen** vor der Werkstatt | `garden/hof_hubert.js` (`HOF`) |
| **Huberts Kombi** (Mittelklasse-Kombi um 2005, generisch, ohne Marken) auf der **selbstgebauten Rampe**, Motorhaube öffnet sich | `garden/hof_auto.js` (`HOFCAR`) |
| **Ziegenweide weiter südlich** (auf Höhe der Südgrenze des Gartens), Zaun, Gatter an der Westseite, Unterstand, Heuraufe, Tränke | `npc/npc.js` (`PAD`) |
| **Ronalds Mähtraktor** (zweiter Traktor mit Mähbalken), hinter dem Balken liegt das gemähte Gras in Schwaden | `npc/npc.js` (`MOWER`), Modell `npc/npc_real.js`, Schwaden `npc/life.js` |
| **Tagesablauf** nach der Spieluhr: Hubert hackt, sägt (Kettensäge), stapelt, schraubt am Auto, sitzt mittags am Tisch und abends auf seiner Bank, fährt jeden dritten Tag nachmittags mit dem Traktor zum Anger (steigt ab, geht in ein Haus, fährt zurück). Ronald füttert morgens und abends (Heu in die Raufe, die Ziegen kommen), mäht die Wiese nördlich der Weide, kümmert sich um die Weide, abends gehen die Ziegen in den Unterstand; nachmittags geht er (außer an Ausflugstagen) um den Garten herum zu Hubert, beide sitzen am Tisch und reden übers Dorf (Untertitel, 12 Gespräche: Skat in der alten Schule, das Feuer am Acker, der Kombi, der Neue mit dem Häuschen, Wildschweine, Regen, die Linde, Holz, Egon, der Bus, Frieda im Kohl, Stirnholzbretter) – an manchen Tagen steht Ronald stattdessen beim Auto und redet, während Hubert schraubt | `npc/life.js` (`LIFE`) |
| Ortsnamen „Huberts Hof“, „Huberts Werkstatt“, „Ronalds Wiese“; Menüorte „Ziegen“ und „Bei Hubert“ zeigen auf die neuen Stellen | `npc/life.js` (ergänzt `window.sitePlace` und `SPOTS` zur Laufzeit) |
| **Arbeitshaltungen** (Axt, Kettensäge, bücken, tragen, ablegen, unter der Motorhaube, Werkbank, Gesten im Sitzen) und Werkzeug in den Händen | `npc/npc_real.js` (`POSE`, `fig.pose`, `fig.after`), `npc/life.js` |
| Neue **Aufgaben**: „Holz für die Trockenhütte“ (Hubert: viermal Scheite vom Haufen in die Hütte), „Ein Schlüssel für Hubert“ (am Auto fragen, 13er-Ringschlüssel von der Werkbank holen und geben), „Ziegen in den Stall“ (abends bei Ronald: die Ziegen laufen vor einem weg, in den Unterstand treiben) | `game/quests.js` |
| Behoben: Huberts Traktor fuhr nicht mehr (die Bewegung war in einen Kommentar gerutscht) – die Mitfahrt der Diesel-Aufgabe endet wieder | `npc/npc.js` `updateDrive` |

Neue Zeilen sind nur Text (keine Aufnahmen). Gespeichert wird nur im bisherigen Aufgaben-Spielstand (`pav-quests-v1`).

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8973 --serve nachbarn          # alles (~15 min)
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8973 --serve nachbarn:yard,day  # nur Hof und Tagesablauf
```

Abschnitte: `yard` (Bilder vom Hof, der Weide), `plan` (Tagesplan nach der Uhr, nachts daheim, morgens wieder da), `day` (Hacken, Sägen,
Stapeln, Auto, Füttern, Mähen mit Schwaden), `talk` (am Tisch und beim Auto, Untertitel), `trip` (Fahrt zum Anger und zurück), `quests`
(Ziegen mit der neuen Weide, die drei neuen Aufgaben, Diesel-Mitfahrt), `daylong` (ein ganzer Tag nach Plan in 10-s-Schritten).

Bilder in `out/nachbarn/`. Im Browser (Konsole): `LIFE.force('hubert', 'chop' | 'saw' | 'stack' | 'car' | 'trip' | 'talk' …)`,
`LIFE.force('ronald', 'mow' | 'feed' | 'visit' | 'visitCar' | 'stall' …)`, `LIFE.force(name, null)` zurück zum Plan, `LIFE.force(name, 'off')`
schaltet den Tagesablauf ab (der einfache Läufer aus `npc/npc.js`, für Tests, die eine Figur von Hand stellen); `CLOCK.t` setzt die Uhrzeit.
Ein anderes Modul kann einen Nachbarn übernehmen, indem es `NPCS.<name>.ctl` auf eine eigene Steuerung setzt (wie die Aufgaben):
`npc/life.js` hält dann still und macht danach weiter.

## Für den Kern-Chat (gemeinsame Dateien, nicht in meinem Bereich)

1. **`viz3/test/v14b.py`, Abschnitt `goat`**: der Fußweg mit Frieda führt noch zur alten Weide (`path = [[-8, -6], [0, -4], … [23, 0.5]]`,
   Zeile ~73). Neuer Weg (wie in `viz3/test/nachbarn.py`): `[[-8, -20], [-8.6, -34], [-8.6, -46], [10, -47.5], [NPC.PAD.x0 - 1.5,
   NPC.PAD.gy - 0.2], [NPC.PAD.x0 + 1.5, NPC.PAD.gy], [NPC.PAD.x0 + 4, NPC.PAD.gy + 1]]`. `GAME.go('ziegen')` zeigt schon auf die neue Weide.
2. **Tests, die die Nachbarn von Hand stellen** (`npcreal.py`, `realviews.py`, ggf. `perfbase.py`): vorher
   `LIFE.force('hubert', 'off'); LIFE.force('ronald', 'off')` – sonst gehen sie zu ihrer Arbeit.
3. **`docs/ARCHITECTURE.md`**: Modulkarte (`garden/hof_hubert.js` – Huberts Hof `HOF`, `SHEDS`, `RAMP`; `garden/hof_auto.js` – `HOFCAR`;
   `npc/life.js` – Tagesablauf `LIFE`), neue `window`-Namen `HOF`, `HOFCAR`, `LIFE`, dazu `NPC.MOWER`, `NPC.PAD`; Abschnitt 6, Zeile `NPC`:
   Tagesablauf, Arbeitshaltungen (`fig.pose`, `fig.speak`, `fig.after` in `npc/npc_real.js`).
4. **Zur Laufzeit ergänzt, könnte in die Besitzer-Dateien wandern**: `SPOTS.ziegen` und `SPOTS.hubert` (neue Stellen; `game/player.js`),
   die Ortsnamen „Huberts Hof“, „Huberts Werkstatt“, „Ronalds Wiese“ über eine Hülle um `window.sitePlace` (`garden/places.js`; `deps.mjs`
   meldet `sitePlace` deshalb als von zwei Modulen geschrieben), die Beschriftung von `seat:hubertbench` (frei nur, wenn Hubert nicht selbst
   dort sitzt; `game/home.js`).
5. **Keine neuen Speicher-Schlüssel**: die drei neuen Aufgaben und ihre Dinge (`scheite`, `ringschluessel`) stehen in `pav-quests-v1`.
6. **Für andere Module**: einen Nachbarn übernehmen = `NPCS.<name>.ctl` auf eine eigene Steuerung setzen (wie die Aufgaben); `npc/life.js`
   hält still und macht danach weiter. `rbPerson(gl, set, o)` unverändert (neue, freiwillige Felder `pose`, `speak`, `after`).
