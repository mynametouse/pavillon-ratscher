# Zombie-Nacht: Basteln und Reparieren (feat/zombie-werk, 5.11.2026)

Falko, 5.11.2026 17:57, gewählt: „In der Werkstatt: Nagelbrett aus Brett und Nägeln, Molotow aus Benzin, Axt schärfen, abgenutzte Waffen
flicken.“ Auftrag wörtlich: `docs/plans/auftraege/zombie-werk.md`. Code: `viz3/src/zombie/z_werk.js` (`ZWERK`).

## Was es gibt

- **Werkbank:** in der Werkstatt im Garten (Bauphase 0 die weiße Bank im Unterstand, danach die Hobelbank der Halle), an der Werkbank der
  alten Garage (nur Bauphase 0) und an jeder Kellerwerkbank der Dorfhäuser (`ZHAUS.H`, Behälter `werkbank` – zuerst die Schublade
  durchsuchen, dann basteln). Knopf „An der Werkbank basteln“ (E) öffnet ein kleines Fenster im Stil des Zombie-Panels: Rezepte mit
  Bedarf und Vorrat, Reparieren der Waffen, die man trägt, Schärfen. Bedienung: Maus/Antippen, ↑↓ und Enter, Esc oder ✕ schließt; wer
  weggeht, schließt es auch.
- **Arbeit kostet Spielzeit** (Zeitraffer der Uhr, 10–25 min in ~2–3 s) und ist zu hören: Handsäge, Hammer auf Holz bzw. Stahl (hören
  die Zombies wie beim Verbarrikadieren), Wetzstein – echte Aufnahmen (OpenGameArt, CC0 und CC BY 3.0, Nachweise
  `viz3/extra/zombie-werk/quellen/CREDITS_TON.md`, Zuordnung `dist/zombie/werk.json`, Schnitt `quellen/werkton.py`); Feile, Benzin, Lappen
  im Browser erzeugt (ebenso alles, solange die Aufnahmen nicht geladen sind). Weggehen bricht ab, dann wird nichts verbraucht.
- **Nagelbrett** (2 Bretter + 1 Hand voll Nägel, 15 min): neue Nahkampfwaffe `nagelbrett` – stumpf, die Nägel reißen (manchmal ein Glied),
  schnell (31 Schaden, 0,64 s), nutzt sich schnell ab (~30 Treffer). Modell in wahrer Größe (0,86 m, zwei Fichtenbretter, Lappen am
  Griff, neun 90-mm-Nägel und zwei seitliche), in der Ich-Sicht mit beiden Händen wie ein Schläger, schlägt die Diagonale der Axt.
  Nach dem Neuladen liegt es auf der Werkbank im Garten (Waffen im Rucksack werden nicht gespeichert, nur ihr Zustand).
- **Molotow-Cocktail** (1 leere Flasche + 1 Liter Benzin + 1 Lappen, 10 min): kommt in den Rucksack. **Werfen mit F** (in der
  Zombie-Nacht ist F nicht mehr Vollbild; am Handy der Knopf 🔥 über den anderen): in der Ich-Sicht holt die linke Hand die Flasche vom
  Gürtel, der Lappen fängt Feuer (Licht auf den Händen), ausholen neben dem Kopf, Wurf – die rechte Hand behält ihre Waffe. Die Flasche fliegt
  im Bogen (12,5 m/s, taumelnd, der Lappen brennt) und zerspringt am Boden, an einer Wand oder an einem Zombie: Glas klirrt, das Benzin
  verpufft (Aufnahmen: Flasche, Feuerstoß; der Lappen fängt mit einer Fackel-Zündung), ein Feuer von 3 m brennt 8 s. Zombies darin nehmen 16 Schaden/s, fangen Feuer (Flammen an der Figur), torkeln, brennen 6 s
  weiter (9/s) und stecken Nachbarn an; ein Brennender stirbt. Der Feuerwehrmann (`e.art`) brennt nur kurz und nimmt ein Drittel.
  Das Feuer leiht eines der geteilten Lichter (`KERN.lights.borrow`, kein neues Licht; im Garten nur in Bauphase 0 frei, wie bei
  Taschenlampe und Dorffeuer), knistert (Aufnahme des Ofens `amb_stove`) und ist für die Horde laut (`Z.noise` 45 m beim Zerspringen,
  28 m beim Brennen). Wer drinsteht, verbrennt sich (14/s).
- **Zu zweit:** das Feuer geht als Ereignis `feuer` über den Raum (`zombie/z_netz.js` reicht unbekannte Ereignisse als `znetz:ev` weiter):
  der andere sieht und hört es, seine Zombies brennen darin sichtbar; den Schaden rechnet der Werfer (beim Gast als Treffer an den
  Gastgeber). Der Flug der Flasche selbst wird nicht übertragen.
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
- `zombie/z_fp.js`: `ZFP.play(clip)` spielt einen Clip eines anderen Moduls (der Wurf); `clip.c.free` lässt die Handspur auch eine
  freie Faust führen (Fäuste ohne Waffe, Finger dann „grip“); `clip.c.prop(hP, hQ, ct, rig)` setzt ein Ding in die Hand (die Flasche) –
  vier markierte Stellen.
- `zombie/z_netz.js`: im Ereignis-Empfang `else KERN.emit('znetz:ev', { d, from })` für unbekannte Arten – drei Zeilen.
- `modules.txt`: `zombie/z_werk.js` und `zombie/z_werk_molotow.js` nach `zombie/z_modus.js`.
- Feuer-Schaden geht für eigene Zombies direkt an `e.hp` (Taumeln, Jagen, `ZHORDE.kill` wie in `damage`), weil `ZHORDE.damage` die
  Geräusche und das Blut eines Schlags spielt; nur die Puppen des Gasts gehen über `ZHORDE.damage(…, { kind: 'fire' })`. Wenn `damage`
  bei `kind: 'fire'` still bleibt (kein `ZTON.hit`/`splat`, kein `ZFX.spray`), kann `burnHit` ganz darauf umgestellt werden (eine Zeile).
- Neu in den gemeinsamen Tabellen (aus `z_werk.js` beim Laden): `ZDATA.ITEMS.molotow`, `ZDATA.WEAPONS.nagelbrett`,
  `ZWMOD.MODELS/LIE/GRIP/HANDS.nagelbrett`, `ZFP.POSE.nagelbrett`. Neue `window`-Namen `ZWERK`, `ZMOLO`. Ereignisse `zombie:werkbank`, `zombie:werk`, `zombie:molotow`; zwei Lichtwünsche
  `zombie:feuer0/1` (Rang 5, zwischen Taschenlampe 6 und Haus 4).
- Gespeichert wird nichts Neues außerhalb von `pav-zombie-v1` (`Z.weap[id].sharp`, `Z.sup.molotow`).
- **Shader-Programme:** Werkbank und Nagelbrett bringen keine neuen (gemessen). Die Flammen sind `plain`-Materialien, nur emissiv, additiv –
  sie brauchen die durchsichtige Variante des Standard-Programms: eine in der Welt (vorne), eine in der Ebene der Hände (beidseitig, dieselbe
  wie das Mündungsfeuer der Flinte in `z_fp.js`). Beide werden übersetzt, sobald der erste Molotow im Rucksack liegt (`ZMOLO.warm`: zwei
  Bilder lang winzig unter der Kamera gezeichnet – `renderer.compile` übersetzte sie für eine andere Tonwertabbildung als die des Composers);
  beim Werfen, Fliegen, Brennen kommt keins dazu (Test `zombie_werk:molotow`).
- Neue Dateien: `viz3/extra/zombie-werk/dist/zombie/werk.json` und `werk/*.mp3` (15 Aufnahmen, zusammen ~170 KB), `manifest.json`
  (`credits_add` für die Quellenliste).

## Offen

- Feile (Motorsäge), Benzin einfüllen und Lappen stopfen sind noch im Browser erzeugt.
- Der Flug der Flasche beim Mitspieler (nur das Feuer wird übertragen); Feuer, das Barrikaden oder Häuser ansteckt (nein, mit Absicht).
