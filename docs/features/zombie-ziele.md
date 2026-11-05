# Zombie-Nacht: Ziele mit Wegweiser und ein Ende (feat/zombie-ziele, 5.11.2026)

Falko, 5.11.2026 17:57: „Ziele mit Wegweiser“ (Aufgaben für Tag und Nacht mit Pfeil und Entfernung) und „Steigende Nächte mit Ende“
(3. Nacht: Bus an der alten Schule – wer ihn erreicht, hat gewonnen). Auftrag: `docs/plans/auftraege/zombie-ziele.md`.
Module: `viz3/src/zombie/z_ziele.js` (`ZZIEL`: Kette, Ziele, Markierung, Karte) und `viz3/src/zombie/z_ziele_bus.js` (`ZBUS`: Radio,
Bus, letzte Welle, Ende).

## Was es gibt

- **Eine Kette von Aufgaben** auf dem Aufgabensystem des Spiels (`TASKS`, gespeichert in `pav-tasks-v1`, im Tagebuch J). Immer läuft
  genau eine; die Aufgabenkarte zeigt Schritt, Pfeil und Entfernung:
  - Tag 1: „Huberts Flinte“ (Ziel: die Flinte auf seinem Tisch) → „Hubert fragen“ (Ziel: Hubert, wo er gerade ist) → „Vorräte“ (Ziel:
    das nächste noch nicht durchsuchte Haus; drinnen der nächste Schrank) → „Ein Haus vernageln“ (ohne Bretter: wo man sie findet;
    drinnen das nächste Fenster ohne Bretter).
  - Jede Nacht: „Halte durch, bis die Sirene heult“ (wenn der Tag vorher geschafft ist), dann „Überlebe bis zum Morgengrauen – noch etwa
    N Stunden“ mit dem Hinweis, wo es am sichersten ist (das vernagelte Haus; drinnen die schwächste Barrikade; sonst die Verbündeten).
  - Tag 2: „Ronald hat Hunger“ → „Benzin für die Säge“ (erst die Säge aus der Werkstatt, dann Wolfgangs Haus mit der zweiten Säge, sonst
    Werkbänke und Kisten) → „Mehr Vorräte“ (mit Verbandskasten) → „Das Haus dicht machen“ (vier Öffnungen).
  - Tag 3: zuerst „Nachrichten“ – das Radio in einem Haus (Ziel: das Radio) sagt den Bus an: „Um 4 Uhr hält ein Bus an der alten Schule.
    Wer mit will, muss da sein.“ (dazu die große Zeile im Bild); hat man es bis 12 Uhr nicht gehört, plärrt es aus einem offenen Fenster.
  - Nacht 3: „Der Bus um vier“ – zur alten Schule (Ziel: die Schulbushaltestelle), dort durchhalten, „Steig ein!“ (Ziel: die Bustür).
  - Was am Abend offen ist, wartet auf den nächsten Tag (der erste Tag ist kurz: vier Spielstunden auf „normal“, beim üblichen Tempo
    vier Minuten); eine Aufgabe des Tages mit Vorrang (das Radio) kommt vor dem Rest.
- Jeder Schritt prüft, was wirklich ist (`Z`, `ZBUND`, die Häuser) – was man schon vorher erledigt hat, zählt sofort; jedes Ziel folgt der
  Welt (ein durchsuchtes Haus ist kein Ziel mehr, Hubert wird verfolgt, wo er geht).
- **Die Karte** steht im Modus neben dem Zombie-Panel (schmale Bildschirme: darunter), nicht im Auto, nicht in der freien Sicht.
- **Die Markierung in der Welt**: ein hellgelber Ring mit pulsierendem Punkt über dem Ziel der verfolgten Aufgabe, wenn es 3,5–150 m
  entfernt ist; immer obenauf, in der Ferne kleiner, nachts gedämpft (gegen die hohe Belichtung), in der freien Sicht („Sicht“) weg.
  Zwei Sprites mit dem Programm der Aufgaben-Markierung des Spiels; das Programm entsteht einmal beim Start des Modus (kein neues
  Programm beim Spielen). Die eigene Raute von `game/quests.js` erscheint für diese Ziele nicht (`target.ownMark`).
- **Der Bus** (Nacht 3, 4:00): ein Reisebus ohne Marke in wahrer Größe (12 × 2,55 × 3,3 m, cremefarben mit dunklem Band, dunkle Scheiben,
  Scheinwerfer, Rücklichter, Zielanzeige; Materialien von `plain`, das Scheinwerferlicht ein geliehenes Punktlicht) kommt die Straße
  entlang (OSM-Straße an der Haltestelle, rechte Spur, Tür zur Haltestelle), hält mit der Tür am Wartehäuschen, hupt (synthetisch,
  zweistimmig; laut für die Zombies: 140 m), wartet ~90 s; Diesel-Brummen. **Letzte Welle**: bis zu 10 (Handy 5) mehr aus den Türen um die
  Schule, alle der Nacht laufen zum Bus (`ZHORDE.wave`, alle 10 s erneuert, Hupe alle 30 s).
- **Einsteigen** an der Tür → Abblende → **das Ende**: „Ihr seid raus.“ mit überstandenen Nächten, erledigten Zombies, wer mitkam
  (Verbündete im Umkreis von 25 m, der Mitspieler), wie oft gestorben; „Weiterspielen“ (der nächste Morgen zurück in Ratscher, die
  Nacht zählt als überlebt, die Nächte gehen weiter – mit den allgemeinen Nacht-Aufgaben) oder „Neu beginnen“ (der 31. Oktober von vorn).
- **Verpasst**: der Bus fährt ab, „Weg. Dann eben allein.“, die Aufgabe „Allein weiter“, die Nächte gehen weiter. Nach einem Zeitsprung
  über 4:45 hinaus (Bett, Warten) ist er schon weg.
- **Zu zweit** (`z_netz.js`, nur Nachrichten): der Bus des Gastgebers entscheidet – er fährt, wenn seine Zeit um ist oder der Gastgeber
  eingestiegen ist (dann noch 6 s für den anderen; wer an der Tür steht, steigt mit ein); der Gast steigt für sich ein, der Gastgeber
  erfährt es (und hat ihn im Bus).
- Beim Beenden des Modus verschwinden die Aufgaben aus dem Tagebuch, die vorher verfolgte Aufgabe wird wieder verfolgt.
- Gespeichert: nur über `TASKS` (`zz-…`, „erledigt“ bei `zz-bus` = eingestiegen, `zz-allein` = verpasst, `zz-radio` = gehört); der Bus
  selbst nicht (ein Neuladen während er wartet: er kommt noch einmal, solange es vor 4:45 ist). Ein Neuladen mitten in Nacht 2 macht
  mit der Kette weiter (Test).

## Schnittstelle

- `ZZIEL.add({ id, day, first, title, text(), target(), done(), fin })` – eine Aufgabe eines Tages anhängen (so kommt das Radio dazu).
- `ZZIEL.NIGHTS.custom[n]` – eigene Aufgabe für Nacht n (Id oder Funktion), `ZZIEL.NIGHTS.siren` – deren erster Schritt wartet auf die Sirene.
- `ZZIEL.hook = () => bool` – solange wahr, startet die Kette nichts Neues (der Endbildschirm).
- `ZZIEL.own(fn)` – eine Zielfunktion mit eigener Markierung; `ZZIEL.safeHouse()`, `nearHouse()`, `searchTarget()`, `barTarget()`, `nightTarget()`.
- `ZBUS.BUS` (Nacht, Uhrzeit, Wartezeit), `ZBUS.st` (`aus | kommt | steht | faehrt | weg`), `ZBUS.come/arrive/leave/board/weiter/neu`,
  `ZBUS.announce()`, `ZBUS.stopPt()`, `ZBUS.doorAt()`.
- Ereignisse: `zombie:bus` (`{ st: 'kommt' | 'steht' | 'drin' | 'faehrt' | 'weg' }`), `zombie:radio`, `zombie:ende`
  (`{ nights, kills, with, deaths }`); zu zweit `znetz:bus`.

## Testen

- `python3 viz3/test/run.py --port 8998 --serve zombie_ziele` (~7 min hier; Abschnitte `tag1,nacht,reload,tag3,bus,verpasst`, z. B.
  `zombie_ziele:bus,verpasst`) – Kette, Karte, Ziele, fallende Entfernung, Markierung (da, weg nah/fern/freie Sicht, keine neuen
  Programme), Sirene, Morgen, Neuladen in Nacht 2, Radio, Bus um 4, letzte Welle, Einsteigen, Ende, Weiterspielen, verpasster Bus.
  Bilder in `out/zombie_ziele/`.
- Zur Laufzeit: `ZZIEL.cur` (die laufende Aufgabe), `TASKS.state('zz-…')`, `ZZIEL.MK.on`, `ZBUS.st`; den Bus sofort: Nacht 3 (`ZSTATE.night = 2`,
  Uhr auf die Sirene), dann `CLOCK.t` auf 4:00.

## Für den Lead (Änderungen an gemeinsamen Dateien, alle markiert `feat/zombie-ziele`)

- `zombie/z_modus.js`: die Aufgabe `zombie-1` und der Import von `TASKS` entfernt (ein Kommentar verweist hierher).
- `zombie/z_horde.js`: neue Funktion `wave(x, y, n)` (letzte Welle: n mehr aus den Türen 35–110 m um den Punkt, alle Wandernden und
  Suchenden dorthin), in `Object.assign` ausgegeben.
- `zombie/z_netz.js`: `ZNETZ.tell(name, data)` und im Ereignis-Empfang `x:<name>` → `KERN.emit('znetz:<name>', …)` (allgemein, für den Bus).
- `game/quests.js`: eine Bedingung – für ein Ziel mit `target.ownMark` zeichnet die Aufgabenkarte keine eigene Raute.
- `zombie/z_hud.js`: nicht geändert; die Karte blendet `z_ziele.js` mit einer eigenen, spezifischeren Regel ein (im Auto und in der freien
  Sicht bleibt sie aus).
- `modules.txt`: `zombie/z_ziele.js`, `zombie/z_ziele_bus.js` nach `zombie/z_modus.js`.
- Beobachtet: nach dem Neuladen einer laufenden Zombie-Nacht (ohne `?szenario=`) steht die Seite in der Übersicht (`P.mode` 'orbit'),
  die Uhr läuft erst nach „Losgehen“ – vielleicht soll `begin(false)` in den Gehen-Modus wechseln.

## Offen

- Der Bus hält Spieler und Zombies nicht auf (man läuft hindurch); er ist ein Modell, kein Fahrzeug.
- Zu zweit nur über `?lokal=1` gedacht und nicht im Browser getestet (der Test `zombie_netz` ist des Leads); die Nachrichten sind klein.
- Die Tage 4 ff. haben nur die Nacht-Aufgaben (und was von früher offen ist); neue Tages-Aufgaben für das Endlos-Spiel wären möglich.
- Die Hupe und der Diesel sind synthetisch (keine Aufnahme).
