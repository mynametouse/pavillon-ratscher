# Jetpack (V18s)

Falko, 17.11.2026 15:05: „… eine Funktion, dass ich mir einen Jetpack anlegen kann und hoch und weit fliegen kann und übersichtlich sehen
kann, optional. Das soll einfach nur dazu helfen, dass lange Strecken auch ohne Autos schnell überwunden werden können und ich einen
Überblick sehen kann über der Stadt … Das soll cool aussehen, Spaß machen und einfach dienen, um schnell herumzureisen.“

## Bedienung

| | Laptop | Handy |
|---|---|---|
| anlegen / ablegen | Taste **9**, Knopf **„Jetpack“** oben rechts, Menü → Hingehen → Fliegen | Knopf oben rechts |
| abheben, steigen | **Leertaste** | **▲** |
| sinken | **C** | **▼** |
| fliegen | W/A/S/D, Maus dreht | Stick links |
| schnell | **Shift** | **»** |
| Überblick | **Mausrad** (bis 400 m zurück) oder **„Übersicht“** | zwei Finger oder **„Übersicht“** |
| von selbst hinfliegen | **„Ziel“** → Garten, Ratscher, Schleusingen, Kloster Veßra, Suhl (Markt, Bahnhof, CCS) | dasselbe |

Am Boden bleibt der Jetpack auf dem Rücken (weitergehen, Leertaste hebt wieder ab). Jede Taste übernimmt vom Zielflug.

## Wie es funktioniert

- Modul `viz3/src/jetpack/jetpack.js` (`window.JET`), in `modules.txt` vor `game/tutorial.js`.
- Haken **J1** in `game/game.js` `physics()`: solange `JET.flying`, bewegt `JET.physics(dt, f, turn, side, run)` die Figur statt des Gehens
  (Ortsnamen wie beim Gehen).
- Tempo nach der Höhe über Grund: 24 m/s, mit Shift 45 m/s unter 40 m, 90 m/s unter 150 m, 160 m/s (576 km/h) darüber; steigen 9 (18) m/s,
  sinken 14 m/s; Decke 1200 m über Grund. Niedrig (unter 12 m) halten Wände wie beim Gehen (`blocked`).
- Karte: das 2,4-km-Quadrat, wo man gehen darf (`KERN.free`: Kachelwelt, Suhl) und überall, wo das Land eine Höhe hat (`KERN.ground`, die
  Region bis Suhl); `welt/fahrt.js` weckt die Kacheln, sobald die Figur außerhalb des Quadrats ist, die Zone Suhl lädt die Stadt ab 11,8 km.
- Zielflug: steigt auf 140 m über den höchsten Grund der nächsten 300 m, fliegt mit 160 m/s geradeaus, sinkt in den letzten 450 m und landet
  am Ort (unter 4 m genau); Garten → Suhl etwa anderthalb Minuten.
- Überblick: je weiter die Kamera zurück ist (`CAM3.d`, im Flug `CAM3.MAX` = 400), desto steiler schaut sie hinunter (bis 55°); über 45 m
  stehen die Namen der Orte über dem Land.
- Aussehen: zwei Druckflaschen mit orangen Ringen, grafitgrauer Rahmen, Gurte, Düsen; zwei Flammenkegel und ein Glühen je Düse, ihre Länge
  nach dem Schub, flackernd; die Figur in der Sprungpose, leicht nach vorn geneigt.
- Klang: gefiltertes Rauschen (Fauchen nach Schub) und ein tiefes Grollen auf dem Effektbus des Spiels, leiser mit der Kameraentfernung.
- Nicht in der Zombienacht, in Grenzland und in „Zukünfte erproben“; nicht im Fahrzeug, nicht im Sitzen.

## Test

`python3 viz3/test/jetpack.py <port>` (9 Prüfungen): Knopf und Menü-Chip, anlegen (Dritte Person, auf dem Rücken, Anzeige), abheben mit der
Leertaste, schnell mit Shift, Überblick, Zielflug nach Schleusingen mit Landung, 9 legt ab, in der Zombienacht bleibt er aus, keine Fehler.
Bilder in `out/jetpack/`.

## Offen

- Der Autopilot im Auto mit Zielangabe (nächster Schritt des Suhl-Chats).
- Klang und Flammen bei Nacht noch einmal auf dem echten Handy ansehen.
