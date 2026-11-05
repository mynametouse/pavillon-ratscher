# Zombie-Nacht: Basteln und Reparieren (feat/zombie-werk, 5.11.2026)

Falko, 5.11.2026 17:57, gewählt: „In der Werkstatt: Nagelbrett aus Brett und Nägeln, Molotow aus Benzin, Axt schärfen, abgenutzte Waffen
flicken.“ Auftrag wörtlich: `docs/plans/auftraege/zombie-werk.md`. Code: `viz3/src/zombie/z_werk.js` (`ZWERK`).

## Was es gibt

- **Werkbank:** in der Werkstatt im Garten (Bauphase 0 die weiße Bank im Unterstand, danach die Hobelbank der Halle), an der Werkbank der
  alten Garage (nur Bauphase 0) und an jeder Kellerwerkbank der Dorfhäuser (`ZHAUS.H`, Behälter `werkbank` – zuerst die Schublade
  durchsuchen, dann basteln). Knopf „An der Werkbank basteln“ (E) öffnet ein kleines Fenster im Stil des Zombie-Panels: Rezepte mit
  Bedarf und Vorrat, Reparieren der Waffen, die man trägt, Schärfen. Bedienung: Maus/Antippen, ↑↓ und Enter, Esc oder ✕ schließt; wer
  weggeht, schließt es auch.
- **Arbeit kostet Spielzeit** (Zeitraffer der Uhr, 10–25 min in ~2–3 s) und ist zu hören: Handsäge, Hammer (hören die Zombies wie beim
  Verbarrikadieren), Wetzstein, Feile, Benzin, Lappen (im Browser erzeugt). Weggehen bricht ab, dann wird nichts verbraucht.
- **Nagelbrett** (2 Bretter + 1 Hand voll Nägel, 15 min): neue Nahkampfwaffe `nagelbrett` – stumpf, die Nägel reißen (manchmal ein Glied),
  schnell (31 Schaden, 0,64 s), nutzt sich schnell ab (~30 Treffer). Modell in wahrer Größe (0,86 m, zwei Fichtenbretter, Lappen am
  Griff, neun 90-mm-Nägel und zwei seitliche), in der Ich-Sicht mit beiden Händen wie ein Schläger, schlägt die Diagonale der Axt.
  Nach dem Neuladen liegt es auf der Werkbank im Garten (Waffen im Rucksack werden nicht gespeichert, nur ihr Zustand).
- **Molotow-Cocktail** (1 leere Flasche + 1 Liter Benzin + 1 Lappen, 10 min): kommt in den Rucksack; Werfen mit F (Teil 2).
- **Reparieren** auf 100 %: Holz und Stiele (Spaten, Mistgabel, Beil, Axt, Sense, Nagelbrett) mit 1 Brett + 1 Nägel, die Brechstange
  geraderichten, die Motorsäge – Kette spannen und schärfen – nur Zeit, die Flinte reinigen mit einem Lappen.
- **Schärfen** (Axt, Beil, Sense, Spaten; 12 min, nur Zeit): +30 % Schaden für die nächsten 25 Treffer (`Z.weap[id].sharp`).
- **Anzeige:** unter der Waffe der Zustand (jetzt auch Motorsäge und Flinte), „scharf (24)“, „F: Molotow (2)“; ein Gedanke, wenn die Waffe in
  der Hand fast hinüber ist („… An einer Werkbank flicken.“).

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8997 --serve zombie_werk` (Abschnitte `zombie_werk:bank,molotow,reload`),
  bei GitHub über `viz3/extra/zombie-werk/tests.txt`. Bilder in `out/zombie_werk/`.
- Zur Laufzeit: `ZWERK.info()`, `ZWERK.openAt(ZWERK.gardenBench())`, `ZWERK.start(ZWERK.rows[i])`, `ZWERK.sharp('axt')`.

## Für den Lead (Eingriffe in gemeinsame Dateien, alle mit `// feat/zombie-werk` markiert)

- `zombie/z_waffe.js` `land`: Schadensfaktor `S.dmgK(id)` (die geschärfte Klinge) – zwei Zeilen.
- `zombie/z_hud.js` `tick`: `S.wmore(w)` hängt `info` an den Zustand und `keys` an die Tastenzeile – drei Zeilen.
- `modules.txt`: `zombie/z_werk.js` nach `zombie/z_modus.js`.
- Neu in den gemeinsamen Tabellen (aus `z_werk.js` beim Laden): `ZDATA.ITEMS.molotow`, `ZDATA.WEAPONS.nagelbrett`,
  `ZWMOD.MODELS/LIE/GRIP/HANDS.nagelbrett`, `ZFP.POSE.nagelbrett`. Neuer `window`-Name `ZWERK`. Ereignisse `zombie:werkbank`, `zombie:werk`.
- Gespeichert wird nichts Neues außerhalb von `pav-zombie-v1` (`Z.weap[id].sharp`, `Z.sup.molotow`).

## Offen

- Molotow werfen, Feuer, Licht (Teil 2, läuft).
