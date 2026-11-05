# Zombie-Nacht: Ziele mit Wegweiser und ein Ende (feat/zombie-ziele, 5.11.2026)

Falko, 5.11.2026 17:57: „Ziele mit Wegweiser“ (Aufgaben für Tag und Nacht mit Pfeil und Entfernung) und „Steigende Nächte mit Ende“
(3. Nacht: Bus an der alten Schule). Auftrag: `docs/plans/auftraege/zombie-ziele.md`. Modul `viz3/src/zombie/z_ziele.js` (`ZZIEL`).

## Was es gibt

- **Eine Kette von Aufgaben** auf dem Aufgabensystem des Spiels (`TASKS`, gespeichert in `pav-tasks-v1`, im Tagebuch J). Immer läuft
  genau eine; die Aufgabenkarte zeigt Schritt, Pfeil und Entfernung:
  - Tag 1: „Huberts Flinte“ (Ziel: die Flinte auf seinem Tisch) → „Hubert fragen“ (Ziel: Hubert, wo er gerade ist) → „Vorräte“ (Ziel:
    das nächste noch nicht durchsuchte Haus; drinnen der nächste Schrank) → „Ein Haus vernageln“ (ohne Bretter: wo man sie findet;
    drinnen das nächste Fenster ohne Bretter).
  - Nacht: „Halte durch, bis die Sirene heult“ (wenn der Tag vorher geschafft ist), dann „Überlebe bis zum Morgengrauen – noch etwa
    N Stunden“ mit dem Hinweis, wo es am sichersten ist (das vernagelte Haus, drinnen die schwächste Barrikade; sonst die Verbündeten).
  - Tag 2: „Ronald hat Hunger“ → „Benzin für die Säge“ (erst die Säge aus der Werkstatt, dann Wolfgangs Haus mit der zweiten Säge, sonst
    Werkbänke und Kisten) → „Mehr Vorräte“ (mit Verbandskasten) → „Das Haus dicht machen“ (vier Öffnungen).
  - Was am Abend offen ist, wartet auf den nächsten Tag (der erste Tag ist kurz: vier Spielstunden, beim üblichen Tempo vier Minuten).
- Jeder Schritt prüft, was wirklich ist (`Z`, `ZBUND`, die Häuser) – was man schon vorher erledigt hat, zählt sofort; jedes Ziel folgt der
  Welt (ein durchsuchtes Haus ist kein Ziel mehr).
- **Die Karte** steht im Modus neben dem Zombie-Panel (schmale Bildschirme: darunter), nicht im Auto, nicht in der freien Sicht.
- **Die Markierung in der Welt**: ein hellgelber Ring mit pulsierendem Punkt über dem Ziel der verfolgten Aufgabe, wenn es 3,5–150 m
  entfernt ist; immer obenauf, in der Ferne kleiner, nachts gedämpft (gegen die hohe Belichtung), in der freien Sicht („Sicht“) weg.
  Zwei Sprites mit dem Programm der Aufgaben-Markierung des Spiels; das Programm entsteht einmal beim Start des Modus (kein neues
  Programm beim Spielen). Die eigene Raute von `game/quests.js` erscheint für diese Ziele nicht (`target.ownMark`).
- Beim Beenden des Modus verschwinden die Aufgaben aus dem Tagebuch, die vorher verfolgte Aufgabe wird wieder verfolgt.

## Testen

- `python3 viz3/test/run.py --port 8998 --serve zombie_ziele` (~4 min hier; Abschnitte `tag1,nacht`) – Kette, Karte, Ziele, fallende
  Entfernung, Markierung (da, weg nah/fern/freie Sicht, keine neuen Programme), Sirene, Morgen. Bilder in `out/zombie_ziele/`.
- Zur Laufzeit: `ZZIEL.cur` (die laufende Aufgabe), `TASKS.state('zz-…')`, `ZZIEL.MK.on`.

## Für den Lead (Änderungen an gemeinsamen Dateien)

- `zombie/z_modus.js`: die Aufgabe `zombie-1` und der Import von `TASKS` entfernt (ein Kommentar verweist hierher).
- `game/quests.js`: eine Bedingung – für ein Ziel mit `target.ownMark` zeichnet die Aufgabenkarte keine eigene Raute.
- `zombie/z_hud.js`: nicht geändert; die Karte blendet `z_ziele.js` mit einer eigenen Regel ein (spezifischer als `#qtrack{display:none}`).
- `modules.txt`: `zombie/z_ziele.js` nach `zombie/z_modus.js`.

## Offen

- Tag 3 (Radio, Ansage), Nacht 3 (Bus um 4 Uhr, letzte Welle, Einsteigen, Ende, „Weiterspielen“, „Neu beginnen“, verpasster Bus), zu zweit.
