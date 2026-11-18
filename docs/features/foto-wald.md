# Fotorealismus: Wald und Unterwuchs (`foto-wald`)

Hilfs-Agent des Fotorealismus-Chats (session_01L6Yrpe4euXqyTbnuvdamYz), Zweig `feat/foto-wald`, gestartet 18.11.2026 19:35. Auftrag
`docs/plans/auftraege/foto-wald.md`, gemeinsame Regeln `docs/plans/auftraege/foto-gemeinsam.md`. Falko (18.11. 18:50): „… Gebäude, die
gesamte Atmosphäre, auch im Wald. Nichts sollte so ständig wiederholend sein, sondern natürlich und organisch und abwechslungsreich.“

Ziel: im Wald des Modells stehen soll sich anfühlen wie im Wald stehen – ein dunkler Boden aus Streu und Moos, Pflanzen im Schatten in
Flecken, Abwechslung statt Teppich, und das in jedem Wald der Welt, nicht nur an der Klinge.

## Vorher (Befund des Fotorealismus-Chats, Bilder `wald_a`, `wald_c`, `wald_weg`, `wald_rand`, `wald_boden`)

Die Pflanzen der Flächenart „Waldboden“ (Klasse 11: Farn, Heidelbeere, Fingerhut, Brennnessel als Bildkarten, `bw_blume.js`) standen
als **heller, gleichmäßiger Teppich** im dunklen Fichtenwald: beleuchtet wie offener Boden (die ganze Sonne, der ganze Himmel), 1,5 Farne
auf jedem Quadratmeter, alle gleich groß und gleich grün. Die Halme des Waldgrases standen einzeln wie Haare auf der Streu.

## Was neu ist (Schritte 1 und 2 des Auftrags, dazu ein Stück von 3)

1. **Das Licht des Bestands** für Pflanzen und Halme. Die Klassentabelle der Halme und Pflanzen hat eine achte Spalte (`k 7`,
   `bw_phaeno.js`): der Anteil der direkten Sonne und des offenen Himmels, der unter den Bäumen ankommt. Für den Waldboden
   0,38 der Sonne und kein offener Himmel (das Himmelslicht grün-braun getönt wie am Boden des Walds an der Klinge:
   × (0,46, 0,5, 0,36)); alle anderen Flächen bleiben offen (1, 1). **An der Klinge** nehmen Pflanzen und Halme stattdessen das
   Kronenraster des Walds (`FOREST.CU`, 2 m), mit denselben Zahlen wie sein Boden (`FOREST.LIGHT`: Sonne × (1 − 0,86 · Krone) außerhalb
   des Schattenkastens der Sonne, im Kasten 80 % davon – dort werfen die Bäume ihre eigenen Schatten): auf der Lichtung stehen sie in
   der Sonne, unter geschlossenen Kronen im Dunkeln – wie der Boden, auf dem sie stehen. Ob eine Kachel im Wald an der Klinge liegt,
   sagt ihr der Hauptprozessor mit (`FOREST.owns`, das freie vierte Feld der Kachel) – kein Vieleck im Shader.
2. **Der Waldboden außerhalb der Klinge** (`bw_ferne.js`): kein anderer Wald kennt seine Kronen – sein Boden (seit dem Zwischenstand
   des Fotorealismus-Chats Streu und Moos statt der Baumkronen des Luftbilds) lag in der offenen Sonne zwischen ein paar Stämmen. Er
   nimmt jetzt den Lichtanteil seiner Pflanzen (0,38) als Farbe: dunkel wie ein Waldboden, Pflanzen und Boden passen bei jedem Wetter
   zusammen. Die Schatten der Bäume fallen wie bisher darauf.
3. **Flecken statt Teppich** (`bw_arten.js` `flaechen[11].flecken`, `bw_blume.js`, `bw_halm.js`): die Krautschicht steht in weichen
   Flecken von 8–20 m (ein Feld aus zwei Größen des Rauschens, `bwField`), dazwischen kahle Streu. Jede Art hat ihr eigenes Feld (seine
   Nummer aus dem Namen der Art – die Flecken bleiben, wo sie sind):
   - **Heidelbeere als niedriger Teppich**: auf einem Sechstel der Fläche, dort acht Pflanzen je m², sonst keine; in ihren Flecken
     steht nichts anderes.
   - **Wurmfarn in lockeren Gruppen**: auf einem Zehntel der Fläche (Flecken von ~7 m), dort etwa zwei je m²; vorher 1,5 je m² überall.
   - **Fingerhut und Brennnessel selten**, in kleinen Gruppen (je ~1 % der Fläche).
   - **Das Waldgras** (Draht-Schmiele, Straußgras, Honiggras) auf zwei Fünfteln der Fläche und **in Horsten**: ganze Büschel stehen
     oder fehlen (Zellen von 30 cm, gedreht und reihenweise versetzt), nicht mehr einzelne Halme überall; die Ähren stehen, wo die
     Halme stehen.
   - An der Klinge wächst unter geschlossenen Kronen (Krone > 0,72) nur die Hälfte.
4. **Kein Grün wie das andere** (`bw_blume.js`): jede Pflanze heller oder dunkler (überall ±9 %; im Wald 0,4–0,74 der Zeichnung und
   weniger grün – Schattenblätter, und klein im Bild ist jede ein Büschel einer Farbe), im Wald dazu gelblicher oder blaugrüner, jede
   zwanzigste braun wie ein alter Wedel; im Wald sind die meisten klein und wenige ausgewachsen (Größe nach dem Quadrat des
   Zufalls), im Schatten kleiner (bis × 0,62).
5. **Kleine Pflanzen bleiben in der Ferne sichtbar** (`bw_blume.js`): die Zeichnungen sind offen (ein Heidelbeerzweig deckt ein Fünftel
   seiner Zelle) – klein gezeichnet fiel ihr Alpha unter die Schwelle, ein Heidelbeerteppich bestand aus ein paar Zweigen vor den
   Füßen. Im Wald wächst das Alpha jetzt mit der Verkleinerungsstufe (wie bei den Nadelzweigen des Walds): die Pflanze wird ein
   Büschel ihrer Farbe statt nichts. Wiesenblumen und Grasähren bleiben, wie sie waren.
6. **Die Krautschicht im Boden** (`bw_ferne.js`, eine markierte Zeile in `world/forest.js`): Pflanzen stehen bis 26 m, Halme bis
   40 m – dahinter hörte ein Heidelbeerteppich an einer Linie auf. Der Boden der Wälder trägt dieselben Flecken (dieselben Felder) als
   Farbe: gesprenkelt (Büschel und Streu dazwischen, aus Rauschen – keine Tupfen in gleichem Abstand), mit einem Viertel vom Braun
   der Streu darin, flach gesehen dichter. An der Klinge liegt sie über der eigenen Nadelstreu des Walds.
7. **Ähren** (Schritt 3, erster Teil): das Bild eines Getreides ist seine Ähre allein – sie wurde so hoch gezeichnet wie der Bestand
   (Ähren von 90 cm: die „blassen Kleckse“ über dem Feld). Jetzt so lang, wie die Artentabelle sagt (`kopf.laenge_m`, eine Handbreit),
   oben auf dem Bestand, ein Viertel dunkler als gezeichnet, dafür 8 statt 4 je m². Die Ähren und Rispen der Gräser sind dunkler
   getönt (0,5 statt 0,72 ihrer Farbe): als geschlossene Form in voller Farbe standen sie zwei- bis dreimal so hell wie die Halme.

## Annahmen (generisch – keine Aufnahme dieser Bestände)

- Der Wald um Ratscher steht auf den armen, sauren Sandsteinböden im Vorland des Thüringer Walds: Fichten- und Kiefernforste, deren
  Boden überwiegend kahle Nadelstreu mit Moos ist; die Krautschicht aus Heidelbeere (Teppiche, wo der Bestand lichter ist),
  Draht-Schmiele in Horsten, Farn in Gruppen, Fingerhut und Brennnessel an Lücken und nährstoffreichen Stellen. Dichten und Anteile
  sind Schätzungen nach dem üblichen Bild solcher Bestände; die Lage der Flecken ist Zufall (kein Ort ist belegt).
- „0,38 der Sonne“ für Wälder ohne Kronenraster ist ein Mittelwert, abgestimmt auf den Boden daneben; die echten Schatten der
  Bäume kommen dazu, wo es sie gibt (Stufen „hoch“ und „mittel“).

## Dateien

- `viz3/src/bewuchs/bw_phaeno.js` – Spalte `k 7` der Klassentabelle (`TW` 8), `fieldT` (Quantile des Felds), `schirm`/`flecken` aus der
  Artentabelle; 8 Ähren je m² Getreide.
- `viz3/src/bewuchs/bw_arten.js` – `flaechen[11]`: `schirm`, `flecken`, Dichten der Arten (Mittel der Fläche), Halmdichte 0,4 in den Flecken.
- `viz3/src/bewuchs/bw_halm.js` – `woodGlsl` (`bwField`, `bwLight`), `woodLight`, Flecken und Horste der Halme, Kachel-Kennzeichen „an der Klinge“.
- `viz3/src/bewuchs/bw_blume.js` – Mischungstextur doppelt so breit (die Flecken je Art), Teppichart, Licht, Größe, Farbe, Alpha
  nach Verkleinerung; Ähren des Getreides in ihrer Größe; Tönung der Grasähren.
- `viz3/src/bewuchs/bw_ferne.js` – Lichtanteil und Krautschicht im Boden der Wälder (`uBwFarW`, `uBwFarH`, `uBwFarHc`, `bwHerb`), Kennzeichen
  „an der Klinge“ im grünen Kanal der Klassen-Texel.
- `viz3/src/world/forest.js` – zwei markierte Stellen: `FOREST.CU` (Kronenraster und Schattenkasten für `bewuchs/`), die Krautschicht über der Nadelstreu.
- `viz3/test/unit/bewuchs_phaeno.test.mjs` – eine markierte Stelle: `TW` 8 und die neue Spalte.
- `viz3/test/foto_wald.py` (neu), `viz3/test/bewuchs.py` (Abschnitt `wald`), `viz3/extra/foto-wald/tests.txt`.

Neue Assets: **keine**. Neue Texturen, Programme, Zeichenaufrufe: **keine**.

## Kosten

Gezählt im Chat-Rechner (Software-Grafik – Bildzeiten sagen dort nichts), Stufe „hoch“, 960 × 540, 1. Juni 15:30, vorher = `7b7ca61e`
(der Zwischenstand des Fotorealismus-Chats), nachher = dieser Stand:

| Blickpunkt | vorher: Aufrufe / Dreiecke | nachher |
|---|---|---|
| `w1` Klinge, am Stamm (-475, -600) | 598 / 3,27 M | 597 / 3,27 M |
| `w2` Klinge, im Bestand (-440, -650) | 611 / 3,15 M | 613 / 3,16 M |
| `w3` Klinge, Blick auf den Boden (-460, -610) | 197 / 2,69 M | 196 / 2,68 M |
| `w4` Klinge, Lichtung (-400, -530) | 259 / 2,41 M | 260 / 2,42 M |
| `w5` Wald außerhalb der Klinge (-380, -420) | 243 / 1,12 M | 243 / 1,12 M |

- **Zeichenaufrufe:** unverändert – fünf für den Bewuchs (drei Ringe Halme, zwei Ringe Pflanzen), je Ring einer.
- **Dreiecke:** unverändert (dieselben Kacheln und Plätze: am Blickpunkt `w1` Halme 112 320 + 136 800 + 32 320, Pflanzen 15 960 +
  20 352); gezeichnet wird weniger, weil die meisten Plätze im Wald leer bleiben (ihre Ecken fallen zusammen).
- **Programme:** unverändert (182 vor und nach der Änderung, vor dem Zusammenführen mit `src`); kein neues Material.
- **Texturen je Programm:** die vier Programme des Bewuchses lesen im Vertex-Shader eine Textur mehr, das Kronenraster der Klinge
  (5 → 6); im Fragment-Shader unverändert (Halme 6, Pflanzen 7). Der Boden bleibt bei 16 (keine neue Textur: Lichtanteil und
  Krautschicht kommen über Uniforms, das Kennzeichen „an der Klinge“ über einen freien Kanal der vorhandenen Bewuchs-Textur).
- **Je Bild auf der Grafikkarte:** je Ecke eines Halms oder einer Pflanze ein Texel-Abruf mehr (die neue Spalte), an der Klinge einer
  aus dem Kronenraster; in Wäldern dazu zwei bis vier Auswertungen des Rauschens (das Feld der Flecken). Je Bildpunkt Waldboden bis
  240 m sechs Auswertungen des Rauschens (zwei Felder, die Sprenkel); je Bildpunkt einer Pflanze zwei Ableitungen (die Verkleinerungsstufe).
- **Hauptprozessor:** beim Listen der Kacheln (nur wenn die Kamera sich bewegt hat) je Kachel eine Abfrage `FOREST.owns` (Kasten,
  dann das Vieleck des Walds); beim Füllen der Bewuchs-Textur der Ferne dieselbe Abfrage je Waldboden-Texel (in den 3 ms je Bild wie bisher).
- **Speicher:** die Mischungstextur 24 × 48 statt 12 × 48 Texel, die Klassentabelle 8 × 32 statt 7 × 32.
- **Nicht gemessen:** Bildzeiten auf einer Grafikkarte, auf Falkos Laptop (Intel UHD 620) und am iPhone.

## Tests

- `bash tools/check.sh`: ok (Build, Lint, Format, Abhängigkeiten, 427 Unit-Tests, Typen) auf dem Stand mit `src` bis V19j.
  `viz3/test/unit/bewuchs_phaeno.test.mjs` prüft die neue Spalte (offene Flächen 1/1/0/0, der Waldboden unter 60 % der Sonne, Flecken
  8–20 m, die Schwelle der Gräser aus `fieldT`).
- `viz3/test/foto_wald.py` (neu; Abschnitte `tabelle`, `klinge`, `wald`, `kosten`): Klassentabelle und Mischungstextur tragen Licht und
  Flecken, offene Flächen bleiben offen; an der Klinge nehmen alle Kacheln das Kronenraster, außerhalb keine; im Bestand kaum ein heller
  Bildpunkt am Boden (vorher 27 % heller als 105 von 255, jetzt unter 1 %), hier ein Fleck der Krautschicht, 60 m weiter kahle Streu
  (vorher 39 % des Bodens grün); ein Wald außerhalb der Klinge ist deutlich dunkler, als er als offene Fläche wäre; ein Zeichenaufruf
  je Ring, Dreiecke im Budget, höchstens 6 Texturen im Vertex-Shader des Bewuchses, kein Programm über 16. Bilder in `out/foto_wald/`.
- `viz3/test/bewuchs.py`: neuer Abschnitt `wald` (Spalte, Flecken, Lichtanteil des Bodens, ein Bild eines Walds der Karten im Juni).
- Themen-Tests bei GitHub (`viz3/extra/foto-wald/tests.txt`): `foto_wald`, `bewuchs`, `fotorealismus:ferne`, `leistung`, `memphone`.
  Seit 18.11. 21:00 laufen die Browser-Tests der Hilfs-Agenten nur noch dort (der Browser des Chat-Rechners ist für Bilder da); im
  Chat-Rechner sind die Bilder der Blickpunkte gerechnet, `foto_wald.py` ist dort nicht durchgelaufen.

## Bilder vorher/nachher

`/home/claude/scratch/foto/wald/vorher/` und `…/nachher/` (im Chat-Rechner, nicht im Repo): die festen Blickpunkte des Auftrags
(`w1`–`w5` im Wald, `wiese`, `rasen`; `w2` um 9 und um 20 Uhr, `w5` um 20 Uhr), 960 × 540, Stufe „hoch“, 1. Juni 15:30, Wetter „klar“.
`…/a2/` ist der Stand einen Feinschliff früher mit Varianten (Stärke der Krautschicht im Boden, Lichtanteil, Alpha nach
Verkleinerung: `cmp_*.jpg`). Bei GitHub legt `foto_wald` seine Bilder unter `out/foto_wald/` ab (`gh run download <Lauf> --name out`).

## Offen (nächste Schritte)

1. **Grasähren und -rispen** (Rest von Schritt 3): Form und Größe der Köpfe der Wiesen und des Rasens ansehen – aus der Nähe bleiben sie
   unscharf (128 Bildpunkte je Zelle des Atlas); die Ähren des Getreides in der Ferne (sie verschwinden nach wenigen Metern, die
   Halmspitzen tragen dort die Farbe).
2. **Mehr Abwechslung am Boden ohne neue Zeichenaufrufe** (Schritt 4): Moospolster, Zapfen, Zweige, Nadeln im Shader des Bodens nahe der
   Kamera; der tote Ast von `wald_a` (ein Modellteil, das als schwarze Striche erscheint – `deadlog` in `cover()`); Jungwuchs.
3. **Waldrand aus der Ferne** (innen dunkel, der Rand im Licht): der Boden der Wälder wird heute an der Kante der Kartenklasse hart
   dunkel; an der Klinge läuft eine gerade Kante durch die Lichtung (Blickpunkt `w4`, schon vorher).
4. **Licht der Flecken:** wo die Krautschicht steht, ist der Bestand lichter – Boden und Pflanzen dort etwas heller (heute eine Zahl
   je Wald; an der Klinge das Kronenraster).
5. **Gebüsch, Saum, Ufer** (Schritt 5): eigene Werte für `schirm` und `flecken` (die Spalte ist da), Schattenfarbe der Gräser
   (`farbe.schatten` der Artentabelle ist noch ungenutzt).
6. Die Farne des Walds an der Klinge aus `world/forest.js` (`cover()`, glTF) stehen in eigenen Flecken – mit denen der Bildkarten
   abstimmen; ihr Grün ist heller als das der Karten.
7. Der Teppich in der Ferne an der Klinge reicht, so weit der Boden des Walds reicht (120–260 m); von oben (über 30–70 m) zeigt der
   Boden das Luftbild wie bisher.
