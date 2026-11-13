# Suhl – der Boden: Gelände und Luftbild als Kacheln (Paket S2-1)

Stand 13.11.2026, Agent `suhl-boden` (Zweig `suhl/boden`), Stufe 2 des Suhl-Plans. Auftrag: `docs/plans/auftraege/suhl-boden.md`.
Dieses Paket hat keine vorhandene Datei geändert. Es baut auf `tools/welt/` auf (nur gelesen und importiert) und benutzt die
Bibliothek von `suhl-daten` (`tools/suhl/lib/`) und die Profile von `suhl-strassen` (`tools/suhl/strassen/profil.py`) – beide Zweige
sind hier hineingemergt.

**Lesehilfe.** Jede Zahl stammt aus einer Datei oder einem Protokoll, die Quelle steht dabei. Was nicht gemessen ist, heißt „offen“.

## 1 Was es gibt

| Was | Wo | Stand |
|---|---|---|
| **Probesatz v1** (Zentrum, für alle Pakete) | `tools/suhl/out/boden/probe/suhl/boden/v1/` | echtes 1-m-Gelände (DGM1), Straßen eingeschnitten, Farben wie die übrige Welt; geprüft, Lauf 43346733058, Commit `02a4b9be` |
| Gelände des Zentrums **vor** dem Einschnitt | `tools/suhl/out/boden/probe/roh/v1/` | darauf rechnet `suhl-strassen`; Lauf 43342715807, Commit `d262745d` |
| Probesatz v0 | `tools/suhl/out/boden/probe/suhl/boden/v0/` | erster Stand: Copernicus, ohne Einschnitt, Farben wie geflogen – bleibt zum Vergleich |
| **Ganze Stadt, Lauf 1** | Artefakt `suhl-boden-v1` des Laufs 43340569202 (14 Tage) | Messung der Mengen: Copernicus, ohne Einschnitt, Farben wie geflogen. Nicht zum Veröffentlichen. |
| **Ganze Stadt, Lauf 2** | Artefakte `suhl-boden-v1` (292 MB) und `suhl-boden-roh` (40 MB) des Laufs 43347038164, bis 27.11. | grün, alle Prüfungen bestanden: DGM1 unter der ganzen Gemeinde (228 Kacheln), Farben angeglichen, **noch ohne Einschnitt** (Schritt a, siehe 5.3). 290 MB. |
| Zahlen der Läufe | `tools/suhl/out/boden/actions/<modus>/` (`lauf.json`, `pruefen.json`, `meta.json`, `validate*.json`, `easygeodata.json`) | vom Workflow geschrieben |
| Kachel-Plan | `tools/suhl/out/boden/plan/stadt.json`, `probe.json`; Regel in `tools/suhl/boden/plan.py` | fertig |
| Bildbögen | Wegwerf-Zweig `ref/suhl-boden`: `probe-v0/`, `probe-roh-v1/`, `probe-v1/`, `stadt-v1/`, `farbe/` | angesehen (Abschnitt 7) |
| Werkzeug | `tools/suhl/boden/` und `.github/workflows/suhl-boden.yml` | Abschnitt 10 |

## 2 Zahlen

### 2.1 Die ganze Stadt

Lauf 1 (43340569202, 13.11. 01:52–02:13): Copernicus-Gelände, kein Einschnitt, Farben wie geflogen. Quelle:
`tools/suhl/out/boden/actions/stadt/pruefen.json` und `meta.json` (Stand `7acc851b`).

| Stufe | Kachel | Bild / Gelände | Kacheln | Gelände | Luftbild | Bild je Kachel |
|---|---|---|---|---|---|---|
| 12 | 100 m | 20 cm / 1 m | 2 884 | 6,64 MB | 76,65 MB | 26,6 kB |
| 11 | 200 m | 39 cm / 2 m | 1 820 | 5,70 MB | 73,34 MB | 40,3 kB |
| 10 | 400 m | 78 cm / 4 m | 1 102 | 5,33 MB | 60,51 MB | 54,9 kB |
| 9 | 800 m | 1,6 m / 8 m | 303 | 2,39 MB | 19,89 MB | 65,6 kB |
| 8 | 1,6 km | 3,1 m / 16 m | 91 | 0,95 MB | 6,63 MB | 72,9 kB |
| 7 | 3,2 km | 6,3 m / 32 m | 48 | 0,62 MB | 3,46 MB | 72,2 kB |
| 6 | 6,4 km | 12,5 m / 64 m | 31 | 0,45 MB | 2,11 MB | 68,1 kB |
| **Summe** | | | **6 279** (12 558 Dateien) | **22,08 MB** | **242,61 MB** | |

- Zusammen **264,7 MB**. Der Plan rechnete mit 159 MB (139 Bild + 20 Gelände, `docs/plans/plan_suhl.md` 2.5): die Bilder sind um
  75 % größer. Die Annahme war am Testblock und an der Zone Veßra gemessen (Wald und Dörfer); eine Kachel der Stufe 12 hat in Suhl
  26,6 kB statt der angenommenen knapp 18 kB.
- Laufzeit: 20 Minuten. Bauschritt 1 136 s, davon Gelände 60 s (29 Blöcke) und Luftbild 1 076 s (182 Abrufe beim WMS).
- **Entschieden (Suhl-Chat, 13.11.): nichts wird verkleinert**, Qualität 74 und der ganze Plan bleiben.
- Kleinere Qualität brächte wenig (an den Probekacheln gemessen): Qualität 68 spart 7 %, 62 spart 13 %, 56 spart 20 %, 50 spart 25 %.

**Lauf 2 (43347038164, 13.11. 02:43–03:00): der Stand der ganzen Stadt.** DGM1 unter der ganzen Gemeinde, Farben angeglichen,
Fernstufen als Quadtree, noch kein Einschnitt. Quelle: `tools/suhl/out/boden/actions/stadt/lauf.json`, `pruefen.json`, `meta.json`,
`validate.json`, `easygeodata.json` (Stand `48718d2f`).

| Stufe | Kacheln | Gelände | je Kachel | Luftbild | je Kachel |
|---|---|---|---|---|---|
| 12 | 2 884 | 17,08 MB | 5,9 kB | 76,83 MB | 26,6 kB |
| 11 | 1 820 | 12,14 MB | 6,7 kB | 73,58 MB | 40,4 kB |
| 10 | 1 102 | 8,07 MB | 7,3 kB | 60,89 MB | 55,3 kB |
| 9 | 364 | 3,00 MB | 8,2 kB | 23,88 MB | 65,6 kB |
| 8 | 116 | 1,17 MB | 10,1 kB | 8,23 MB | 70,9 kB |
| 7 | 40 | 0,50 MB | 12,5 kB | 2,87 MB | 71,6 kB |
| 6 | 23 | 0,34 MB | 14,7 kB | 1,58 MB | 68,7 kB |
| **Summe** | **6 349** (12 698 Dateien) | **42,30 MB** | | **247,85 MB** | |

- Zusammen **290,15 MB**. Das echte Gelände ist fast doppelt so groß wie das glatte (42,3 statt 22,1 MB).
- DGM1: alle 228 Kacheln da (220 in diesem Lauf von easygeodata geholt, 8 lagen im Cache; 319 MB, 221 Aufrufe, kein Fehler).
  1 082 der 1 102 Kacheln der Stufe 10 stehen ganz auf echtem Gelände; die übrigen 20 liegen dort, wo die geholten Kacheln enden
  (13 am Rand der Gemeinde, 7 im Korridor außerhalb).
- Laufzeit: 16,5 Minuten. DGM1 holen 8 min; Bauschritt 394 s, davon Gelände 93 s (42 Blöcke) und Luftbild 277 s (16 neue Abrufe
  für die Fernstufen – die Stufen 10 bis 12 lagen vom ersten Lauf im Cache und wurden nur neu angeglichen und kodiert).
- Caches bei GitHub nach diesem Lauf: Rohdaten 418 MB, DGM1 rund 320 MB, kodierte Bilder rund 250 MB (dazu die kleinen des
  Probesatzes).
- Prüfungen: 16 von 16 bestanden; 11 930 Nachbarpaare, größter Unterschied 0 cm; Höhen 279,2 bis 983,0 m NHN; Mittelpunkt 436,5 m.
  Schema: gültig, 0 Fehler, 0 Warnungen.

### 2.2 Probesatz v1 (Lauf 43346733058, `tools/suhl/out/boden/actions/probe/lauf.json`)

| Stufe | Kacheln | Gelände | Luftbild |
|---|---|---|---|
| 12 | 48 | 0,27 MB | 1,28 MB |
| 11 | 44 | 0,31 MB | 2,11 MB |
| 10 | 11 | 0,09 MB | 0,76 MB |
| 9 | 8 | 0,07 MB | 0,66 MB |
| 8 | 12 | 0,13 MB | 0,95 MB |
| 7 | 4 | 0,05 MB | 0,33 MB |
| 6 | 4 | 0,06 MB | 0,28 MB |
| Summe | 131 | 0,98 MB | 6,37 MB |

- Zusammen 7,35 MB (Grenze 8 MB). **Stufe 12 gibt es nur noch 300 m um den Mittelpunkt** (48 Kacheln; in v0 waren es 120): der Ring
  aus Fernkacheln, den die Laufzeit braucht, und das echte Gelände kosten Platz. Mit 10 MB Grenze blieben alle 120.
- Gelände: DGM1 unter allen 11 Kacheln der Stufe 10 (8 Kacheln von easygeodata, 11,27 MB, einmal geholt). Höhe am Mittelpunkt 436,5 m
  NHN (Copernicus sagte 440,0).
- **Die Profile passen zum Gelände:** Straßenhöhe minus Gelände an 40 861 Achspunkten vor dem Einschnitt: Mittel +0,01 m, die Hälfte
  unter 0,2 m, 95 % unter 0,7 m. (Beim ersten Versuch, Profile auf fremdem Gelände: 1,0 m und 4,5 m.)
- Einschnitt: 1 328 Wege in der Datei, 131 nach Merker ausgelassen, 1 197 gehen an den Einschnitt – darunter 13 Brücken (behalten
  ihren Korridor) und 27 Tunnel (bleiben draußen). 615 118 m² Boden verändert, im Mittel um 0,33 m, nirgends um mehr als 2,5 m. 13 Wegstücke (196 m) liegen weiter als 2,5 m vom
  Gelände und sind nicht eingeschnitten; auf 14 630 m² hätte der Schnitt mehr als 2,5 m bewegt – dort bleibt das DGM1.
- Kanten: 201 Nachbarpaare, größter Unterschied 0 cm. Alle 15 Prüfungen bestanden.
- Die Stelle am Steinweg (E 619 600 / N 5 607 700, Fenster 80 m, `hoehe.py`): v0 hatte 15,2 m Höhenunterschied und Buckel bis 3,1 m
  über der mittleren Ebene; v1 hat 7,9 m und 1,45 m. Der Punkt selbst liegt 2,5 m tiefer (432,0 statt 434,5 m NHN).

### 2.3 Die anderen Sätze

| Satz | Kacheln | Gelände | Luftbild | Quelle |
|---|---|---|---|---|
| Probesatz v0 | 185 (12: 120, 11: 44, 10: 11, 9: 4, 8: 2, 7: 2, 6: 2) | 0,58 MB | 6,99 MB | `probe/pruefen.json` |
| Gelände vor dem Einschnitt `roh/v1` | 331 (12: 176, 11: 124, 10: 31) | 2,13 MB | – | `actions/probe-roh/pruefen.json` |

## 3 Was die Laufzeit wissen muss

### 3.1 Format und Listen

`meta.json` hat das Format, das `WELT` heute liest (`tools/welt/build.py`), mit Zusätzen. Es ist zugleich der Index des Produkts
(Schema 1, Fassung 1.1 von `suhl-daten`; kein `index.json`).

- `tiling.levels[L].rect` = Rahmen wie bisher. **`tiling.levels[L].has`** = sortierte Liste `[x, y]` der Kacheln, die es gibt, für `t/`
  und `i/` gleich. Der Haken W2 (`setOf` in `welt.js`) muss `has` beachten; fehlt `has` (alte Sätze), gilt `rect`.
- Die Rahmen überschneiden sich mit denen von Block B und der Zone Veßra, die Listen nicht.
- Vier Regeln, auf die sich die Laufzeit verlassen kann (geprüft in jedem Lauf):
  1. Stufe 10 deckt alles, wo man stehen kann (Gemeinde und Straßenkorridore).
  2. Die Stufen 11 und 12 stehen in ganzen Vierern – `WELT` verfeinert eine Kachel nur, wenn alle vier Kinder da sind.
  3. Jede Kachel der Stufen 7 bis 12 hat ihre Elternkachel.
  4. Der Fernboden (Stufen 6 bis 9) ist ein Quadtree: eine Kachel der Stufe 6, 7 oder 8 hat vier Kinder oder keins. Frei ist nur der
     Schritt von Stufe 9 zu 10. **Gilt ab Stadt-Lauf 2; im Probesatz gilt Regel 4 nicht** (dort Stufe 9: alle Kinder der beiden
     Eltern-Kacheln der Stufe 8; Stufe 8: diese und ihre acht Nachbarn; 7 und 6: die Eltern).
- `tiling.levels["10"].dgm` läuft parallel zu `has`: `1` = die Kachel steht zu mindestens 99 % auf echtem 1-m-Gelände.
- `suhl` = `{ product: "boden", version, schema: 1, area: "probe" | "stadt", balanced, based_on, t_version, i_version, i_key, … }`.
  `balanced` = Farben wie die übrige Welt. `based_on` = `{}` ohne Einschnitt, `{"s": N}` mit den Profilen des Straßen-Produkts N.
- `terrain` = `{ version, source, roads_cut, … }`, `image` = `{ version, balance: "garten-2024-04-07" | "wie-geflogen", key, quality, flight }`.
- Kacheln unverändert: `t/…bin` WTH1 (101 × 101 Höhen in cm), `i/…webp` 512 px, Qualität 74.

### 3.2 Die Naht zur vorhandenen Welt

Das alte Fern-Gelände (`geoman.terrain.outer` in `viz3/manifests.json`) ist ein Quadrat **in Modellmetern**: x von −11 831,6 bis
12 168,4, y von −12 135,6 bis 11 864,4, Raster 120 m. In UTM ist es um 4,36° gedreht; seine Nordkante läuft von (612 571, 5 606 728) nach
(636 878, 5 608 579). Der Mittelpunkt von Suhl liegt 397 m nördlich davon. Innerhalb des Quadrats liegen 41,9 der 141,8 km² der
Gemeinde, 8,5 der 22,0 km² der Kernstadt und nur die Südspitze des Zentrums (0,02 km²).

| Stufe | Suhl-Kacheln (Plan Lauf 2) | davon berühren das alte Fern-Gelände | liegen ganz jenseits |
|---|---|---|---|
| 12 | 2 884 | 1 075 | 1 809 |
| 11 | 1 820 | 872 | 948 |
| 10 | 1 102 | 408 | 694 |
| 9 | 364 | 156 | 208 |
| 8 | 116 | 58 | 58 |
| 7 | 40 | 18 | 22 |
| 6 | 23 | 6 | 17 |

Was die Laufzeit an der Naht tun muss:

1. **Nahboden (Stufen 10–12, `WELT`):** nichts Besonderes. `lowerOuter` senkt das alte Gelände unter den gezeichneten Kacheln ab – das
   gilt für Suhl-Kacheln südlich der Kante genauso. Nördlich von y = 11 864 gibt es kein altes Gelände.
2. **Fernboden (Stufen 6–9, Suhls eigener Code):** jede Kachel aus `has` zeichnen, wo `WELT` nicht zeichnet. Südlich der Kante liegt
   darunter das alte 120-m-Gelände: dort muss es abgesenkt werden (Haken W3, `lowerAlso`), mit demselben Sicherheitsabstand wie
   `lowerOuter` (ein Eckpunkt sinkt nur, wenn 130 m um ihn herum Suhl-Boden gezeichnet ist).
3. **Höhenstufe am Rand von Suhls Kacheln.** Das alte Gelände ist ein Oberflächenmodell (Wald steht darin als Erhebung), Suhls Boden
   ist blanke Erde. Im Wald liegt das alte Gelände deshalb um Baumhöhe darüber – am Rand der Abdeckung steht es wie eine Böschung
   über Suhls Boden. Schürzen an den Fernkacheln verdecken nur Lücken, in denen Suhls Boden höher liegt. Das ist dieselbe Stufe, die
   man heute am Rand der `WELT`-Ringe in Schleusingen sieht. Nicht gemessen: wie hoch sie mit DGM1 wirklich ist.
4. **Ring nur dort, wo die alte Welt nichts hat.** Stufe 6 hat einen Ring von 13 Kacheln für den Horizont, aber nur nördlich und
   westlich des alten Quadrats. Im Süden liefert die alte Welt den Horizont.

### 3.3 Farbe

Entschieden am 13.11. (Suhl-Chat): **Suhl bekommt die Farben der übrigen Welt** (`garten-2024-04-07`). Die vorhandene Welt zeigt jeden
Bildflug in den Farben des Flugs am Garten; Suhl ist am 15.05.2024 geflogen wie der Norden von Block B. `tools/suhl/boden/farbe.py` baut
denselben Farbausgleich wie der Lauf des Testblocks (gleiches Kontextquadrat, gleiche Flugtage, Garten als Bezug – die Kennzahlen
stimmen überein: 12 352 Punktpaare, Stufe 39 → 1) und wendet ihn je 1-km-Zelle an.

Gemessen an der Nordkante von Block B (N 5 600 400, 7 Kacheln, 19 m beiderseits; `ref/suhl-boden:farbe/naht.json` und Bild daneben):

| Suhl minus Block B, Grauwerte | Rot | Grün | Blau |
|---|---|---|---|
| wie geflogen | −27,6 | −34,2 | −39,0 |
| angeglichen | −0,5 | −0,6 | +0,1 |

Größter Einzelwert einer Kachel: 41,7 wie geflogen, 4,0 angeglichen.

- Der Schalter `--farbe wie-geflogen` (in `lauf.txt`: `farbe = wie-geflogen`) baut die andere Fassung aus dem Cache.
- **Für `suhl-gebaeude`:** Dachfarben ab jetzt aus den Kacheln `i/` lesen, nicht vom WMS – sonst passen Dach und Boden nicht zusammen.
- Die Flugtage der 729 Zellen des Kontextquadrats sind einmal abgefragt und liegen in `tools/suhl/boden/flugtage.json` (298 Zellen
  07.04.2024, 317 Zellen 15.05.2024, 107 Zellen 12.05.2025, 7 ohne Angabe). Kein Lauf fragt noch einmal.
- **Offen – der Horizont (nur Stufen 6 und 7).** Die Fernkacheln reichen über die abgefragten Flugtage hinaus. Dort nimmt der
  Ausgleich den Tag der nächsten bekannten Zelle (höchstens 6 km weit), sonst bleibt die Zelle wie geflogen. Im Stand von Lauf 2:
  Stufe 6 hat 1 018 Zellen, davon 326 mit geratenem Tag und **388 wie geflogen** (dunkler); Stufe 7 hat 442 Zellen, davon 150
  geraten und 2 wie geflogen. Die Stufen 8 bis 12 sind ganz vom 15.05.2024 – dort stimmt alles. Im Probesatz: 29 von 182 Zellen
  der Stufe 6 geraten, keine wie geflogen.
- Die Tage dieser 714 Zellen sind inzwischen einmal abgefragt: `tools/suhl/boden/flugtage_fern.json` (385 Zellen 15.05.2024,
  120 Zellen 30.04.2024 – ganz im Westen, E 599 bis 604 km; 195 Zellen 09.07.2024 – ganz im Norden, N 5 621 bis 5 627 km; 14 Zellen
  07.04.2024). Von den 326 geratenen Tagen waren 300 richtig, 26 falsch. **Die Datei wird noch nicht benutzt:** sie ändert die
  Bilder der Stufen 6 und 7 (höchstens 63 Dateien), und für die beiden neuen Bildflüge (30.04. und 09.07.2024) gibt es noch keine
  Farbtabelle. Nächster Schritt: zwei Tabellen dazulernen, `image.key` um die Fassung der Flugtage ergänzen, Stufen 6 und 7 neu.
- `meta.json` nennt je Satz, woher die Flugtage kommen (`sources.imagery_balance.set`, ab `c00b9432`) – auch wenn alle Bilder aus
  der Ablage kommen. Die älteren Zähler daneben (`cells_used_by_day`, `cells_day_from_nearest`) zählen nur neu geholte Bilder; im
  endgültigen Probesatz v1 stehen sie deshalb auf 0.

## 4 Der Kachel-Plan der ganzen Stadt

Regel in `tools/suhl/boden/plan.py`, Ergebnis in `tools/suhl/out/boden/plan/stadt.json` (Listen je Stufe).

| Stufe | Kacheln | Regel |
|---|---|---|
| 10 | 1 102 | 1 013 Kacheln, die die Gemeinde berühren, + 89 Korridor-Kacheln außerhalb der Gemeinde, die die vorhandene Welt nicht hat (außerhalb von Block B und Veßra). Korridor = die vier Routen Garten ↔ Suhl aus `feat/suhl-fahrt` (`korridor.json`), 600 m zu beiden Seiten. |
| 11 | 1 820 | Kinder von 455 Kacheln der Stufe 10: berührt die Kernstadt (216), liegt im Korridor (300), hat mindestens 8 Gebäude (240), liegt bis 300 m an einem Ortsteil-Punkt (101) – die Gruppen überschneiden sich. |
| 12 | 2 884 | Kinder der 721 Kacheln der Stufe 11, die die Kernstadt berühren. |
| 9, 8, 7 | 364, 116, 40 | Eltern der Stufe 10, aufgefüllt zu ganzen Vierern (Regel 4). Gebraucht würden 303, 91, 29. |
| 6 | 23 | 10 Eltern + 13 Nachbarn dort, wo die alte Welt kein Fern-Gelände hat. |

Die Gebäudezahl je Kachel steht in `tools/suhl/boden/bebaut10.json` (14 390 OSM-Gebäude ab 40 m² in 388 Kacheln, aus den OSM-Daten der
Stufe 1; `bebaut.py` macht sie neu). Sie ist eingecheckt, damit sich die Listen nicht von Lauf zu Lauf ändern.

## 5 Das Gelände

### 5.1 Quellen und Mischung

- **DGM1** (1 m, © GDI-Th), wo eine Kachel im Rohdaten-Ordner liegt. Jeder Lauf fragt zuerst die alte Landes-Adresse (zeigt weiter
  die Wartungsseite), dann holt der Client von `suhl-daten` die Kacheln von easygeodata – einmal, danach liegen sie in einem eigenen
  Actions-Cache. Ohne Schlüssel steht das im Protokoll, der Lauf rechnet mit Copernicus weiter.
- **Copernicus GLO-30** sonst, mit abgesenktem Wald wie in `tools/welt/dem.py`. Die Absenkung ist für Suhl immer im selben Fenster
  geschätzt (Rahmen der Gemeinde): **9,33 m**; 82 % des Fensters sind Wald.
- Höhenversatz Copernicus → DGM1 (30-%-Quantil, eine Zahl für den ganzen Lauf): **−2,20 m** über die ganze Gemeinde (Lauf 2, 228
  Kacheln); an den 8 Kacheln des Zentrums allein waren es −4,90 m (Probesatz v1). Das zählt nur dort, wo DGM1 endet – an den
  Korridoren und am Rand der Gemeinde; DGM1 läuft über 300 m in Copernicus aus. Der Probesatz und der Stadt-Stand haben also am
  Rand des Probesatzes verschiedene Übergänge, im Inneren (DGM1) sind sie gleich: Mittelpunkt beide 436,5 m.

### 5.2 Rechnen in Blöcken

Die Gemeinde ist für ein einziges 1-m-Mosaik zu groß. Ein Block = eine Kachel der Stufe 7 (3,2 km) plus 320 m Rand. Die Stufen 10
bis 12 kommen aus dem 1-m-Mosaik des Blocks, die Stufen 6 bis 9 aus einem einzigen 8-m-Mosaik über das ganze Gebiet. Alle Blöcke
teilen sich Wald-Absenkung und Höhenversatz. Ergebnis: 11 930 Nachbarpaare in Lauf 2 (42 Blöcke, 93 s), größter Unterschied 0 cm.

### 5.3 Straßen einschneiden – die Reihenfolge je Datenstand

Verbindlich für alle Pakete (Suhl-Chat, 13.11.): **(a)** dieses Paket liefert das Gelände vor dem Einschnitt → **(b)**
`suhl-strassen` rechnet darauf seine Profile → **(c)** hier wird eingeschnitten → **(d)** `suhl-gebaeude` liest die Hausfüße vom
Ergebnis.

- (a): Probesatz: `probe/roh/<version>/`; ganze Stadt: Artefakt **`suhl-boden-roh`** jedes Stadt-Laufs (`meta.json` + `t/10…12`, mit
  einem Ring Stufe-10-Kacheln mehr, damit der Rand der Rechnung von `suhl-strassen` auf demselben Boden liegt).
- (c): `tools/welt/roads.py` `carve`, unverändert: Fahrbahn mit Querneigung, Bankett, Böschungen 1 : 1,5. Die Breite kommt mit Bord
  und Gehwegen (`profil.load(town=True)`). Brücken behalten ihren Korridor, Tunnel bleiben draußen.
- **Nicht eingeschnitten** werden Wege mit den Merkern Treppe (128), Hausdurchgang (2048), überdacht (4096), eigens kartierter Gehweg
  neben einer Straße (8192), Querung (16384), Achse führt in ein Gebäude (32768). Bahngleise stehen nicht in der Datei.
- **Grenze 2,5 m auf echtem Gelände:** Liegt ein Wegstück weiter vom DGM1 als 2,5 m (neben Brücken, an Mauern), wird es nicht
  geschnitten und in `meta.json` gelistet (`sources.roads.clamped`). Und kein Quadratmeter echten Bodens wird um mehr als 2,5 m
  bewegt – an Stützmauern und Widerlagern bleibt das DGM1. Auf Copernicus gilt die Grenze nicht.
- Flächen (Plätze, Parkplätze) werden **nicht** eingeebnet: das DGM1 hat ihre echte Oberfläche schon (Wunsch von `suhl-strassen`).
- Jeder Satz nennt, wie gut die Profile zum Gelände passten (`sources.roads.fit_before_cut`). Meter statt Dezimeter heißt: die
  Profile sind auf anderem Gelände gerechnet.

## 6 Das Luftbild

- Dienst WMS TH DOP, Ebene `th_dop` (20 cm), Bildflug 15.05.2024 über der ganzen Gemeinde, Veröffentlichung 2025-02, Bezug bDOM.
- Jede Stufe wird in ihrer eigenen Auflösung geholt. Die Gemeinde ist kein Rechteck; eine verkleinerte Kachel hätte am Rand graue Löcher.
- Ein Abruf umfasst höchstens 8 × 8 Kacheln und nur den Rahmen der gebrauchten Kacheln. Zwei Abrufe gleichzeitig, Pause nach jedem.
- **Das Luftbild ist ein eigenes Bauprodukt.** Die kodierten Kacheln liegen je Satz von Bild-Eingaben in einer Ablage im Actions-Cache
  und kommen von dort in jeden Satz. Schlüssel (`image.key`): Ebene, Flugtag, Veröffentlichung, Farbausgleich, Qualität – zum Beispiel
  `th_dop-f2024-05-15-p2025-02-garten-2024-04-07-q74`. Gleicher Schlüssel = dieselben Dateien, Byte für Byte. Belegt: die beiden Läufe
  des Probesatzes v1 haben das Gelände geändert, die Bilder sind gleich geblieben (0 Abrufe, gleiche Bytezahlen je Stufe).
- Der Aufbau bleibt `suhl/boden/v<N>/{meta.json, t/, i/}`. `suhl.t_version` und `suhl.i_version` stehen zur Auskunft in `meta.json`.
- Offen: Dächer unter 3D-Gebäuden aus dem Bild nehmen (wie `tools/welt-gebaeude/kacheln.py`). Vorbereitet ist nur der Ablauf (das Bild
  entsteht je Abruf, vor dem Zerschneiden – dort kann eine Maske aus Grundrissen angewandt werden). Getan wird es erst, wenn
  `suhl-gebaeude` Grundrisse der ganzen Stadt hat.
- Offen: ob die Dächer genau über den Grundrissen liegen. Im 20-cm-Bild um den Markt sieht man fast nur Dachflächen, an der Südostseite
  höherer Häuser aber einen schmalen Streifen Fassade. Gemessen ist das nicht – das braucht die Grundrisse.

## 7 Prüfungen

`tools/suhl/boden/pruefen.py` läuft in jedem Lauf; schlägt eine Prüfung fehl, ist der Lauf rot.

| Prüfung | Grenze |
|---|---|
| Listen | jede Kachel aus `has` hat Gelände und Bild, keine Datei daneben; `rect` = Rahmen; Regeln 2 bis 4; Liste = Plan |
| Mittelpunkt | die Kachel mit dem Mittelpunkt von Suhl (E 619 762, N 5 607 680) ist in jeder Stufe; Höhe dort 400–480 m NHN |
| Kanten | benachbarte Gelände-Kacheln einer Stufe sind an ihrer gemeinsamen Kante auf den Zentimeter gleich – jedes Paar |
| Höhen | alle Höhen zwischen 250 und 1 000 m NHN; `hmin`/`hmax` in `meta.json` stimmen |
| Größen | Byte je Kachel und Stufe im erwarteten Bereich; jedes Bild 512 × 512, keins leer |
| Schema | `tools/suhl/lib/validate.py` (Fassung 1.1): 0 Fehler, 0 Warnungen |

Dazu Kurztests ohne Netz (`test_boden.py`, 41 Prüfungen: Plan, Blöcke mit und ohne DGM1, Einschnitt, Grenze, Höhenabfrage).

Bildbögen, selbst angesehen (`ref/suhl-boden`): das Zentrum in 20 cm; das Gelände als Schummerung (v0: Blöcke des 30-m-Modells und
Stufen am Waldrand; v1: Terrassen, Bahndamm, Rampen, Straßen als glatte Bänder); die ganze Stadt aus Stufe 8 (Lauf 2) ohne Farbnaht
und ohne Blockkante, ihr Gelände mit Tälern, Autobahn- und Bahndämmen ohne Stufe am Rand des DGM1; die Kachel-Listen als Karte; der
Farbvergleich. Nicht auf einem Bogen: die ganze Stufe 6 – der Horizont aus Abschnitt 3.3 ist also gezählt, nicht angesehen.

`validate.py --probe` meldet am Probesatz v1 36 Fehler „keine Kachel des Probesatzes“: das sind die 18 Fernkacheln des Rings, den die
Laufzeit braucht. Ohne `--probe` ist der Satz gültig. Die Probe-Regel muss für den Boden Fernkacheln um den Probesatz erlauben.

## 8 Höhenabfrage für die anderen Pakete

`tools/suhl/boden/hoehe.py`: `Hoehe(<Ordner oder Adresse eines Satzes>).nhn(E, N)` gibt die Bodenhöhe in m NHN aus der feinsten
Kachel, die den Punkt hält (`None`, wo der Satz keine hat). `nhn_many` für Felder, `z` für die Modellhöhe, `drawn=True` für die
Fläche, wie die App sie zeichnet. Auch als Befehl: `python3 -I tools/suhl/boden/hoehe.py --set <Ordner> 619762 5607680`.
Hausfüße gehören auf das Gelände **nach** dem Einschnitt (`probe/suhl/boden/v1`), Straßenprofile auf das **vor** dem Einschnitt (`probe/roh/v1`).

## 9 Quellen und Namensnennung

| Daten | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbild, Flugtage | TLBG, WMS TH DOP (`th_dop`, `th_dop_info`) | CC BY 4.0 | © GDI-Th |
| Gelände DGM1 | TLBG, bezogen über easygeodata.de | CC BY 4.0 | © GDI-Th |
| Gelände sonst | Copernicus DEM GLO-30 | Copernicus-Lizenz | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA |
| Wald (Absenkung) | ESA WorldCover 2021 | CC BY 4.0 | © ESA WorldCover project 2021 |
| Gebiete, Ortsteile, Korridore, Gebäudezahl je Kachel, Straßenprofile | OpenStreetMap (Stufe 1, `suhl-strassen`) | ODbL 1.0 | © OpenStreetMap-Mitwirkende |

Die Angaben stehen in jedem Satz in `meta.json` (`sources`, `attribution`) und in `ATTRIBUTION.md`.

## 10 So läuft es noch einmal

Ein Lauf wird bestellt, indem `tools/suhl/boden/lauf.txt` geändert und gepusht wird – **mit `[stadt]` oder `[probe]` in der
Commit-Nachricht**. Ohne Marke baut der Workflow nichts. Stadt- und Probe-Läufe brechen einander nicht ab.

| Zeile in `lauf.txt` | Bedeutung |
|---|---|
| `stadt.dgm = P1,P2,P3,P4` | DGM1 für diese Prioritäten aus `kacheln.csv` holen (was im Cache liegt, wird nicht noch einmal geholt) |
| `stadt.strassen = <Datei>` | Profile von `suhl-strassen` einschneiden; leer = kein Einschnitt |
| `stadt.farbe = garten` | oder `wie-geflogen` |
| `stadt.version`, `stadt.t`, `stadt.i` | Versionsordner und die Versionen der beiden Teile |
| `probe.schritt = roh \| produkt` | nur das Gelände vor dem Einschnitt, oder der Probesatz |

Flugtage für den Farbausgleich (einmal gefragt, eingecheckt): `python3 -I tools/suhl/boden/farbe.py --flugtage` (Kontextquadrat) und
`--flugtage-plan stadt` (Zellen unter den Fernkacheln, in `flugtage_fern.json`). Ein zweiter Aufruf fragt nichts noch einmal.

Lokal (nur Probesatz und Tests; easygeodata läuft nur in GitHub Actions):

```
export GDAL_CURL_CA_BUNDLE=$CURL_CA_BUNDLE          # nur auf dem Chat-Rechner nötig
python3 -I tools/suhl/boden/test_boden.py
python3 -I tools/suhl/boden/boden.py --mode probe --cut 1 --max-mb 7.9 --out /tmp/x/suhl/boden/v1 --roads tools/suhl/out/strassen/probe/fahrt/suhl-zentrum.json
python3 -I tools/suhl/boden/pruefen.py --set /tmp/x/suhl/boden/v1 --mode probe
python3 -I tools/suhl/boden/bogen.py --set /tmp/x/suhl/boden/v1 --out /tmp/x/bogen --name probe
```

Ein zweiter Start macht dort weiter, wo der erste aufgehört hat.

## 11 Was auf Falko wartet

- Nichts Dringendes. Der Schlüssel für easygeodata und das Daten-Repo sind da und arbeiten.
- Zum Ansehen, wenn er mag: `ref/suhl-boden`, Ordner `farbe` – Suhl wie geflogen und angeglichen nebeneinander.
- LoD2 (echte Dachformen) bleibt Handarbeit; das betrifft dieses Paket nicht.

## 12 Für den Suhl-Chat

- **Probesatz v1 ist der Stand für alle:** `02a4b9be`. `suhl-gebaeude` liest die Hausfüße davon, `suhl-gruen` und `suhl-laufzeit` den Boden.
- **Veröffentlicht wird hier nichts.** Die Artefakte heißen `suhl-boden-v1` (Produkt) und `suhl-boden-roh` (nur für `suhl-strassen`).
- **Nächster Schritt der ganzen Stadt:** `suhl-strassen` rechnet auf `suhl-boden-roh` des Laufs 43347038164 (in
  `tools/suhl/strassen/lauf.txt`: `boden_run=43347038164`, `boden_artifact=suhl-boden-roh`). Stand 13.11. 03:08: die Stadt-Profile
  von `suhl-strassen` (Lauf 43347302266, `origin/suhl/strassen` `5d38f16c`) sind noch auf dem Copernicus-Boden von Lauf 1 gerechnet
  – mit ihnen wird hier **nicht** eingeschnitten (Reihenfolge a bis d). Die Laufnummer konnte ich `suhl-strassen` nicht mehr selbst
  nennen (Nachrichten-Grenze der Agenten erreicht) – bitte weitergeben. Danach `origin/suhl/strassen` hier
  hineinmergen und einen Lauf bestellen: in `lauf.txt` bei `stadt.strassen` die beiden Dateien
  `tools/suhl/out/strassen/stadt/fahrt/suhl.json.gz` und `…/suhl-anfahrt.json.gz` mit Komma und ohne Leerzeichen, dazu
  `stadt.version = v2`, `stadt.t = 2`, und `[stadt]` in die Commit-Nachricht.
  Das Luftbild bleibt dabei Byte für Byte gleich (Ablage im Cache, Schlüssel unverändert).
- **Der Stand von Lauf 2 heißt `v1` und ist ohne Einschnitt** (`based_on: {}`), der Probesatz `v1` ist mit Einschnitt. Zum
  Ausprobieren in der Laufzeit taugt der Stadt-Stand schon; Straßen liegen darin neben dem Boden (im Probesatz vor dem Einschnitt:
  die Hälfte der Punkte unter 0,2 m, 5 % über 0,7 m). Der richtige Stand für alle ist der mit Einschnitt.
- **Platz im Daten-Repo:** Gleiche Bilddateien in einem neuen Versionsordner kosten in git nichts, auf der Seite (1 GB) zählen sie
  aber doppelt, solange beide Ordner liegen: zwei Boden-Stände sind rund 580 MB. Alte Stände also zügig löschen.
- **Geht der Bild-Cache verloren** (GitHub wirft Caches nach 7 Tagen ohne Zugriff weg), werden die Bilder neu kodiert – gleiche
  Bytes sind dann nicht sicher. Ausweg für später: die Ablage aus dem veröffentlichten Stand im Daten-Repo füllen.
- `validate.py --probe` muss für den Boden den Ring der Fernkacheln erlauben (Abschnitt 7) – bitte an `suhl-daten`.
- Haken in `welt.js`: W2 (`has`) und W3 (`lowerAlso`, Abschnitt 3.2).
- Die Zusammenführungen: `origin/suhl/daten` (zuletzt `8027fe1d`) und `origin/suhl/strassen` (`26ed5201`) sind in `suhl/boden`.
  Der git-Ordner wird von allen Agenten geteilt; holt einer einen Zweig mit `--depth 1`, verliert ein anderer seine gemeinsame
  Geschichte („unrelated histories“). Abhilfe: vor dem Mergen beide Zweige mit `--depth 40` holen.

## 13 Offen und unsicher

- Der Einschnitt für die ganze Stadt fehlt noch (wartet auf die Profile von `suhl-strassen` auf dem Gelände von Lauf 2).
- Der Horizont: Farbe der Stufen 6 und 7 außerhalb der bekannten Flugtage (Abschnitt 3.3).
- Die Höhenstufe an der Naht zum alten Fern-Gelände ist beschrieben, nicht gemessen (Abschnitt 3.2).
- Auf Copernicus-Boden (Korridore außerhalb der Gemeinde) hat der Einschnitt keine 2,5-m-Grenze; dort können Dämme oder Gruben
  entstehen, wenn Profil und Boden nicht zusammenpassen. Zu prüfen im ersten Stadt-Lauf mit Einschnitt (`fit_before_cut`).
- Lage der Dächer im Bild (Abschnitt 6).
- Die Fernstufen zeigen blanke Erde. Wald steht dort nicht als Erhebung wie im alten Fern-Gelände – Sache von Grün und Fernmodell.
- Der erste Stadt-Lauf (43340569202) und der erste Probe-Lauf (43342715807) stehen bei GitHub rot, obwohl Bau, Prüfungen und Ergebnisse
  vollständig sind: ihr letzter Schritt „Zahlen des Laufs“ kopierte eine Datei auf sich selbst. Behoben in `a77adc4d`.
