# Läden in Schleusingen – echte Namen, Türen, Parkplätze (`feat/laeden`)

Hilfs-Agent `laeden` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, Nacht 13./14.11.2026, Branch `feat/laeden` (Auftrag
`docs/plans/auftraege/laeden.md`). Falko (13.11. 16:42/16:50/22:05): OBI, Mega Center, McDonald’s und die anderen Läden in Schleusingen als
„realistische, sinnvolle, logische Gebäudekonstrukte … ein Eingang, eine Tür“ – **echter Name, schlichte Schrift** (kein Logo, keine Hausfarbe,
keine Markenschrift).

## Was es gibt

- **Die Läden an ihrem echten Platz**, jeder als das, was er ist (Modul `viz3/src/laeden/laeden.js`, `LAEDEN`; Daten
  `viz3/extra/laeden/dist/laeden/laeden.json` aus `tools/laeden/laeden.py`):
  - **OBI** (Suhler Straße, Baumarkt): Halle aus den Teilen von ETHOS (Haupthalle 9,8 m, Ostteil 10,5 m, Südteile 8,5 und 6 m) mit Attika und
    Solarfeldern auf dem Dach wie im Luftbild, der **Windfang mit Kassenzone** an der Westseite zum Parkplatz (ETHOS-Grundrisse, 3,9 m), das
    **Eingangsportal** (6,6 m) mit dem Namen, das **Gartencenter** im Südwesten (Warmhaus mit Glasdach, Kalthaus aus Glas nach dem Luftbild),
    zwei Anliefertore an der Nordseite, Pylon an der Einfahrt.
  - **Mega Center** (Suhler Straße 34/36): ein langer Block (ETHOS 10,6 m) mit zwei **Eingangsportalen** an der Westseite (je 10,8 m, ETHOS) –
    Süd „MEGA CENTER“ mit der **Tafel aller Läden** (aus OSM: Aldi, JYSK, Mäc-Geiz, KiK, Febana, Ernsting’s family, Müller, Deichmann, Café &
    Backshop Drei Ähren, Uhren Schmuck, Friseur, Zoofachhandel, AWG-Modecenter, Repo-Markt, Mega-Restaurant, Mega-Möbel,
    Spangenberg-Apotheke), Nord „ALDI“ –, eigene Türen und Schriftzüge für **Mega-Restaurant**, **Mega-Möbel** und die **Apotheke**, der Turm
    am Restaurant (ETHOS 12,5 m) mit dem Namen, drei Anliefertore an der Ostseite (wo im Luftbild die Lkw stehen). Die **Lieferstraße
    rings um das Haus** (OSM, Einbahn) und der Hof darin liegen auf der Höhe des Ladens; wo das Gelände dahinter höher liegt, hält es eine
    Stützmauer (siehe „Der Boden“).
  - **EDEKA** (Halle 7,2 m, Lager 5,5 m) mit dem Windfang an der Nordwestecke zum Parkplatz (ETHOS, Luftbild).
  - **Getränkequelle** und die **Ladenzeile Suhler Straße 40** davor mit **Turan Kebap Haus** und **Wäscheservice** (je eigene Tür, Schaufenster,
    Schriftzug).
  - **Shell** (Suhler Straße 56): das Dach über den Zapfsäulen aus OSM (`building=roof`) auf Stützen, weiß mit dem Namen, darunter Lichtfelder,
    vier Zapfinseln mit Säulen, das Kassenhaus (ETHOS) mit Tür und Schaufenster zur Zapfsäulenseite, Asphalt ringsum, Pylon mit dem Namen
    und den Kraftstoffen (ohne Preise – keine erfundenen Zahlen); die Lichtfelder unter dem Dach brennen Tag und Nacht.
  - **McDonald’s** (Kurhausstraße 1a): eingeschossig (4,6 m, dunkel), die Tür dort, wo OSM sie kennt (`entrance=main`), der **Drive-in** auf der
    OSM-Spur (`service=drive-through`, Einbahn in ihrer Richtung: das Haus links vom Fahrer): Asphalt, gelbe Randlinie, Pfeile,
    Höhenbegrenzung 2,8 m an der Einfahrt, **Bestellsäule** mit Tafel 16 m vor dem ersten Fenster, **Kasse** und **Ausgabe** als Fenster
    auf der Fahrerseite. Das Haus der Altstadt-Daten, das dort stand (zweigeschossig mit Walmdach), ist weg. Nachts hinter dem dunklen Glas
    warmes Licht mit dem Raum dahinter: Deckenlichter, die Theke mit hellen Menütafeln, Tische und Stühle als Schatten (so auch beim
    Mega-Restaurant und beim Turan Kebap Haus).
  - **Lidl** (Jägerhausstraße 8): Halle mit Glasfront an der Nordwestseite zum Kundenparkplatz (Lage nach dem Luftbild), daneben die Tür
    des **Café & Backshop Drei Ähren**; Höhe ein Faustwert (6,2 m – ETHOS führt das Gebäude nicht, es stand in der Altstadt-Zone).
  - **REWE** (Hildburghäuser Straße 32): Halle (ETHOS 6,6 m) mit dem niedrigeren Eingangsstreifen (4,8 m) an der Westseite, die Tür an der
    OSM-Stelle beim Zebrastreifen.
  - **Gaststätte „Am Waldrand“** (Suhler Straße 81): das Haus bleibt (ETHOS), es bekommt Tür und Schild zur Straße.
  - Der **Nahkauf** am Markt 19 hat sein Schild schon aus `welt/schleusingen.js` (Ladennamen aus OSM) – nichts zu tun.
- **Gestaltung**: Wände im Blech-Stil der Hallen des Dorfs (Trapezblech, hell- oder mittelgrau, dunkler Sockel), Windfänge anthrazit;
  verglaste Fronten mit Pfosten, Schiebetüren, Kämpfer, Vordach mit Blende; **Schriftzug als schlichte Groteskschrift** (Helvetica/Arial/
  Liberation Sans) auf neutralem Band – weiß auf Anthrazit oder anthrazit auf Weiß, nie eine Markenfarbe; Schild mit den Öffnungszeiten
  neben der Haupttür; Pflaster vor den Eingängen. Jede Schrift wird **gemessen und eingepasst** (die Buchstaben selbst, nicht die Schriftgröße:
  rundum Rand, zu lange Namen kleiner); ein **Namensband steht immer über dem Vordach** davor – das Vordach wird dafür niedriger und
  flacher (1,8 statt 2,6 m), wo das nicht reicht, rückt das Band höher. Dächer: die Attika auf Gehrung (an spitzen Ecken endet sie in der
  Ecke); Nadeln und Splitter der ETHOS-Umrisse sind abgeschnitten (OBI: 10 m, REWE: 28 m lang).
- **Türen**: Wo OSM einen Eingang hat (McDonald’s, REWE), steht die Tür dort (Abstand 0,04 bzw. 0,08 m). Sonst nach dem Luftbild 2024
  (Windfang, Portal, Vordach – Quelle `luftbild` in den Daten) und sonst nach den Regeln von `docs/plans/daten_gebaeudetypen.md`: die
  breite Tür zur Parkplatzseite, Anlieferung hinten oder seitlich (Tore im Wandshader der Hallen, Poller davor). Vor jeder Tür bleibt der
  Weg frei (keine Parkbucht 7 m davor).
- **Am Eingang ein Hinweis** (Aktionsknopf): „OBI – Baumarkt · Mo–Fr 8:30–19, Sa 8:30–18 · geöffnet“ – geöffnet oder geschlossen nach der
  Spieluhr (Wochentag aus `dorf/dorf_cal.js`); antippen sagt, dass es hinein noch nicht geht. Ortsname im HUD: „OBI, Schleusingen“ bzw.
  „Parkplatz OBI, Schleusingen“.
- **Parkplätze** (OSM `amenity=parking` der Läden): Asphalt über dem Luftbild, **Buchten 2,5 × 5 m rechtwinklig zu beiden Seiten der
  Fahrgassen, die OSM einzeichnet** (511 Buchten auf 7 Parkplätzen; im Luftbild stehen die Autos genau so), Linien, Bordsteine an den
  Rändern (offen, wo eine Fahrgasse hinausführt), Laternen alle ~28 m am Rand (nachts an, mit den Laternen des Dorfs; die nächsten
  beleuchten die Wände), Einkaufswagenboxen bei OBI, Mega Center, EDEKA, Lidl, REWE.
- **Die parkenden Autos von `welt-dinge`** (`dinge/dinge.js`) stehen jetzt in den Buchten: jedes Auto auf einem Parkplatz eines Ladens kommt
  in die nächste freie Bucht (die meisten vorwärts eingeparkt, einige rückwärts); was auf einem Laden, auf der Drive-in-Spur oder vor einer
  Tür stand oder keine Bucht mehr findet, verlässt seine Zelle. Belegung nach Tag und Stunde bleibt die von `welt-dinge`.
- **Der Boden**: Die Kacheln haben über Schleusingen nur das Copernicus-Oberflächenmodell (30 m, mit den Gebäuden und Bäumen darin – unter
  dem Mega Center ein Buckel von 8 m). Unter jedem Laden mit seinen Parkplätzen wird der Boden **eben gelegt** (`WELT.setPads`): eine
  Ebene durch die Unterseite der Höhen auf den Parkplätzen (Ausreißer nach oben weg, höchstens 2,5 % Gefälle), am Rand über 5 m in das
  Gelände übergeblendet, nie auf einer Hauptstraße (die Straßen bleiben, wie der Straßen-Chat sie legt; die Lieferstraße um das Mega
  Center gehört zum Laden). Pads, die sich berühren (OBI, Mega Center, EDEKA, Getränkequelle, Ladenzeile), teilen eine Ebene. Der Fußboden
  eines Ladens liegt auf der Höhe seiner Haupttür.
- **Stützmauern**: Wo das Gelände 3 m außerhalb eines Pads mehr als 1,5 m höher oder tiefer liegt als das Pad an seinem Rand (meist das
  Oberflächenmodell mit Dach und Wald neben den großen Hallen: östlich des Mega Centers bis 10 m), steht auf mindestens 6 m Länge eine
  graue Betonmauer mit Abdeckstein statt einer steilen Böschung mit verschmiertem Luftbild; sonst bleibt der sanfte Übergang über 5 m.
  Nicht dort, wo eine Straße oder eine Fahrgasse das Pad verlässt. Weil das 2-m-Netz der Kacheln keine senkrechte Stufe zeichnen kann,
  liegt die Stufe hinter der Mauer unter einer Abdeckung: am Hang steht die Mauer 1 m außerhalb des Pad-Rands, das Pad läuft in einem
  Streifen dahinter 3 m weiter und geht dann über 2,5 m ins Gelände, darüber eine Abdeckung in Grasfarbe auf der oberen Höhe; am Damm
  steht die Mauer (mit Brüstung) 2,9 m außerhalb, die Mulde dahinter ist auf Pad-Höhe abgedeckt. Flügelmauern schließen die Enden. Auf der
  Abdeckung geht man (`KERN.ground`, Rang 9), die Mauer hält Fußgänger und Autos auf.
- **Pylone und Masten** stehen auf dem Boden, den die Kacheln zeichnen (Laternen, Säulen, Pfosten jeweils am eigenen Fuß; der Sockel eines
  Pylons reicht bis zu seiner tiefsten Ecke).
- **Fest**: Wände, Glasfronten, Stützen, Pylone, Zapfsäulen, Wagenboxen, Laternenmasten halten Fußgänger und Autos auf (`KERN.pushOut`,
  Rang 16; Fahrzeuge über `VEH.hitsOut`); Bordsteine und Markierungen nicht.
- **Was sie ersetzen**: 25 ETHOS-Gebäude der Zellen (die Hallen unter den Läden, die Dächer des Shell-Dachs als Halle, Windfänge und
  Portale, das Gartencenter, das Kassenhaus) – `gebaeude/gebaeude.js` lässt sie aus (`GEB.skip`); die zwei Häuser der Altstadt-Daten für
  McDonald’s und Lidl – `welt/schleusingen.js` lässt sie aus (`LAEDEN.skipStadt`). Mit `?nolaeden` ist alles wie vorher.
- **Laden und Freigeben**: Daten (33 KB), sobald man näher als 1,6 km kommt; drei Gruppen (Suhler Straße Nord, McDonald’s/Lidl, REWE) werden
  näher als 900 m gebaut (Telefone 650 m) und jenseits von 1150 m freigegeben; die kleinen Dinge (Markierung, Bordsteine, Laternen,
  Wagenboxen, Solarfelder) nur näher als ~650 m sichtbar. Gruppe Nord: 19 Meshes, ~24 000 Dreiecke, ~0,3 s Bauzeit.
- **Keine neuen Shader-Programme**: Wände und Dächer mit den Materialien des Dorfs (`world/village.js`), alles Übrige aus Eckfarben mit dem
  Material der parkenden Autos (`DMOD.mat`), Asphalt mit dem Programm des Pflasters des Dorfs (`v16e-kit1.3`, Asphaltfoto der Texturen),
  Pflaster mit `VPROPS.mat.pave`, Markierung mit dem Programm der Straßenfarbe, Schrift als **ein Canvas-Atlas je Gruppe** mit dem Programm
  der Schilder der Stadt, Fenster und Lichtfelder mit dem Programm des Laternenglases (nachts warm, wenn der Laden offen hat, sonst
  nur ein Nachtlicht), Stützmauern und ihre Abdeckung mit dem Material der parkenden Autos.

## Daten neu erzeugen

```bash
python3 -I tools/laeden/laeden.py CACHE_DIR [--debug DIR]     # OSM-API in Kacheln (Cache), ETHOS-Zellen aus viz3/extra/welt-gebaeude
```

`--debug` zeichnet je Laden alles über das Luftbild (DOP 2024 vom WMS der GDI-Th; nur Arbeitskopien, nie einchecken). Die Läden,
ihre Teile, Türen (Punkt nahe der Wand genügt), Schilder, Parkplätze, Pylone stehen oben im Skript (`SHOPS`); wo eine Tür nach dem
Luftbild gesetzt ist, steht `src='luftbild'`. Ändert sich die Liste der ersetzten ETHOS-Gebäude (`laeden.json` → `skip`), muss sie in
`laeden.js` (`SKIP_ETHOS`, `SKIP_STADT`) nachgezogen werden – der Test vergleicht beide.

## Testen

`bash tools/browser_lock.sh python3 viz3/test/run.py --port 9017 --serve laeden` (Abschnitte `data,nord,mitte,rewe,nacht`; auf GitHub über
`viz3/extra/laeden/tests.txt` mit `smoke`). Ohne Browser: Listen gleich, jede Tür an einer Wand, OSM-Türen ≤ 1 m, Namen im Schriftzug,
Buchten in ihren Parkplätzen, Quellen. Im Browser: nichts beim Start; erst die Altstadt (ihre Programme), dann je Gruppe: gebaut, Boden vor
jeder Haupttür der ebene, keine ETHOS-Halle in einem Laden, keine Altstadt-Häuser McDonald’s/Lidl, die Autos in den Buchten, der Hinweis an
jeder Haupttür mit Öffnungszeiten, zur Tür laufen (man kommt hin, das Glas hält auf), mit dem Auto die Fahrgasse auf den Parkplatz, die
Meshes der Läden nur mit Programmen, die es vorher gab, Draw-Calls und Dreiecke am Mega Center, nachts Laternen an und McDonald’s hell,
Lidl am Sonntag dunkel; keine Seitenfehler. Seit Bericht 1 außerdem je Gruppe: jede Schrift mit Rand in ihrem Schild (gemessene
Buchstaben), kein Vordach vor einem Namensband, die Dächer auf ihren Gebäuden (keine Attika über eine Ecke hinaus), Laternen/Säulen/Pfosten
auf dem gezeichneten Boden (≤ 0,3 m), **jeder Pylon aus der Nähe** auf dem Boden (Fuß ≤ 0,3 m, Sockel an jeder Ecke bis in den Boden), die
Stützmauern (vor der Mauer das ebene Pad, auf der Abdeckung die obere Höhe).

### Bilder (`out/laeden/`, bei GitHub im Artefakt `out`)

| Bild | zeigt |
|---|---|
| `<laden>_strasse.jpg` | Augenhöhe vom Straßenrand |
| `<laden>_parkplatz.jpg` | Augenhöhe vom Parkplatz, 24 m vor der Haupttür |
| `<laden>_oben.jpg` | von oben (60°) |
| `mega_center_west.jpg` | das Mega Center von Westen (Draw-Calls/Dreiecke gemessen) |
| `mcd_drivein_einfahrt.jpg`, `mcd_drivein_fenster.jpg`, `mcd_drivein_oben.jpg` | der Drive-in: Einfahrt mit Bestellsäule, die Fenster, von oben |
| `mcd_nacht.jpg`, `mcd_nacht_fenster.jpg` | McDonald’s nachts von der Straße und vor den Fenstern |
| `shell_nacht.jpg` | die Tankstelle nachts |
| `mega_lieferhof.jpg`, `mega_lieferhof_oben.jpg` | die Lieferseite des Mega Centers mit der Stützmauer, von unten und von oben |

## Offen

- Hinein geht es noch nicht (nicht Teil des Auftrags): die Türen sind Glas, der Hinweis sagt es.
- Dachformen: alle Läden flach mit Attika; das Restaurant des Mega Centers hat in Wirklichkeit ein Tonnendach, Mega-Möbel Lichtkuppeln,
  Lidl ein flaches rotbraunes Walmdach (Luftbild) – Faustwerte, bis LoD2 kommt.
- Die Autowaschanlagen bei Shell (SB-Box, Waschhalle mit „Autoport Ludwig“) bleiben ETHOS-Gebäude.
- Parkbuchten rechtwinklig; an der Westseite des Mega Centers parkt man in Wirklichkeit schräg (Luftbild).
- Das Luftbild zeigt unter den neuen Parkplätzen nichts mehr (Asphalt darüber); außerhalb bleiben die flachen Autos des Fotos, bis die
  Kacheln mit `maske_dinge_utm.json` retuschiert sind (`welt-gebaeude`).
- Die Stützmauern sind ein Behelf für das 30-m-Oberflächenmodell der Kacheln (Dach und Wald neben den großen Hallen, östlich des Mega
  Centers bis 10 m über dem Fußboden): mit dem DGM1 (Gelände ohne Gebäude und Bäume) entfielen die meisten; die Böschung hinter einer
  Mauer zeigt das Luftbild leicht gestreckt (1 : 2,5).

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/laeden` direkt nach `dinge/dinge.js` (vor `# feat/verkehr`).
- `viz3/src/gebaeude/gebaeude.js` (markiert `// feat/laeden`, eine Zeile in `runJobs`): ein Gebäude, für das `GEB.skip(b)` wahr ist, wird
  nicht gebaut (auch keine Wände/Kollision). `LAEDEN` setzt `GEB.skip` (25 ETHOS-Kennungen).
- `viz3/src/welt/schleusingen.js` (markiert `// feat/laeden`, eine Zeile in `build()`): ein Haus der Altstadt-Daten, für das
  `LAEDEN.skipStadt(b)` wahr ist (Name und Adresse: McDonald’s Kurhausstraße 1a, Lidl Jägerhausstraße 8), wird nicht gebaut.
- Zur Laufzeit ändert `laeden.js` Plätze von `DINGE.places` (x, y, az; Plätze ohne Bucht verlassen `cell.places`) – keine Änderung an
  `dinge.js`; bereits gebaute Zellen baut `dinge.js` mit seiner regelmäßigen Prüfung neu.
- `WELT.setPads('laeden:<gruppe>', …)` ebnet den Boden unter Läden und Parkplätzen (nie auf Straßen der Klassen bis `residential`; die
  Lieferstraße um das Mega Center, `highway=service` w226334824, liegt im Pad – an den Straßen-Chat: sie ist Teil des Ladenhofs).
- `KERN.provide('ground', …, 9)`: die Abdeckungen der Stützmauern tragen den Fußgänger (sonst `undefined`).
- Neue `window`-Namen: `LAEDEN`. Quellen: `credits_add` in `viz3/extra/laeden/manifest.json` (OSM ODbL, ETHOS ODbL, DOP 2024 dl-de/by-2-0).
- Mängel-Tabelle (`tools/daten/maengel_start.csv`): geschlossen sind die Zeilen OBI, Mega Center/Mega-Möbel, McDonald’s, EDEKA, Aldi Nord,
  Lidl, REWE, Shell, Turan Kebap Haus, Gaststätte „Am Waldrand“, Getränkequelle.
