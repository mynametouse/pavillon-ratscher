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
   0,42 der Sonne und kein offener Himmel (das Himmelslicht grün-braun getönt wie am Boden des Walds an der Klinge:
   × (0,46, 0,5, 0,36)); alle anderen Flächen bleiben offen (1, 1). **An der Klinge** nehmen Pflanzen und Halme stattdessen das
   Kronenraster des Walds (`FOREST.CU`, 2 m), mit denselben Zahlen wie sein Boden (`FOREST.LIGHT`: Sonne × (1 − 0,86 · Krone) außerhalb
   des Schattenkastens der Sonne, im Kasten 80 % davon – dort werfen die Bäume ihre eigenen Schatten): auf der Lichtung stehen sie in
   der Sonne, unter geschlossenen Kronen im Dunkeln – wie der Boden, auf dem sie stehen. Ob eine Kachel im Wald an der Klinge liegt,
   sagt ihr der Hauptprozessor mit (`FOREST.owns`, das freie vierte Feld der Kachel) – kein Vieleck im Shader.
2. **Der Waldboden außerhalb der Klinge** (`bw_ferne.js`): kein anderer Wald kennt seine Kronen – sein Boden (seit dem Zwischenstand
   des Fotorealismus-Chats Streu und Moos statt der Baumkronen des Luftbilds) lag in der offenen Sonne zwischen ein paar Stämmen. Er
   nimmt jetzt den Lichtanteil seiner Pflanzen (0,42) als Farbe: dunkel wie ein Waldboden, Pflanzen und Boden passen bei jedem Wetter
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
4. **Kein Grün wie das andere** (`bw_blume.js`): jede Pflanze heller oder dunkler (überall ±9 %; im Wald 0,55–1,0), im Wald dazu
   gelblicher oder blaugrüner, jede zwanzigste braun wie ein alter Wedel; im Wald sind die meisten klein und wenige ausgewachsen
   (Größe nach dem Quadrat des Zufalls), im Schatten kleiner (bis × 0,62).
5. **Kleine Pflanzen bleiben in der Ferne sichtbar** (`bw_blume.js`): die Zeichnungen sind offen (ein Heidelbeerzweig deckt ein Fünftel
   seiner Zelle) – klein gezeichnet fiel ihr Alpha unter die Schwelle, ein Heidelbeerteppich bestand aus ein paar Zweigen vor den
   Füßen. Im Wald wächst das Alpha jetzt mit der Verkleinerungsstufe (wie bei den Nadelzweigen des Walds): die Pflanze wird ein
   Büschel ihrer Farbe statt nichts. Wiesenblumen und Grasähren bleiben, wie sie waren.
6. **Die Krautschicht im Boden** (`bw_ferne.js`, eine markierte Zeile in `world/forest.js`): Pflanzen stehen bis 26 m, Halme bis
   40 m – dahinter hörte ein Heidelbeerteppich an einer Linie auf. Der Boden der Wälder trägt dieselben Flecken (dieselben Felder) als
   Farbe: gesprenkelt (Büschel und Streu dazwischen), flach gesehen dichter. An der Klinge liegt sie über der eigenen Nadelstreu des Walds.
7. **Ähren** (Schritt 3, erster Teil): das Bild eines Getreides ist seine Ähre allein – sie wurde so hoch gezeichnet wie der Bestand
   (Ähren von 90 cm: die „blassen Kleckse“ über dem Feld). Jetzt so lang, wie die Artentabelle sagt (`kopf.laenge_m`, eine Handbreit),
   oben auf dem Bestand, dafür 8 statt 4 je m². Die Ähren und Rispen der Gräser sind dunkler getönt (0,5 statt 0,72 ihrer Farbe):
   als geschlossene Form in voller Farbe standen sie zwei- bis dreimal so hell wie die Halme.

## Annahmen (generisch – keine Aufnahme dieser Bestände)

- Der Wald um Ratscher steht auf den armen, sauren Sandsteinböden im Vorland des Thüringer Walds: Fichten- und Kiefernforste, deren
  Boden überwiegend kahle Nadelstreu mit Moos ist; die Krautschicht aus Heidelbeere (Teppiche, wo der Bestand lichter ist),
  Draht-Schmiele in Horsten, Farn in Gruppen, Fingerhut und Brennnessel an Lücken und nährstoffreichen Stellen. Dichten und Anteile
  sind Schätzungen nach dem üblichen Bild solcher Bestände; die Lage der Flecken ist Zufall (kein Ort ist belegt).
- „0,42 der Sonne“ für Wälder ohne Kronenraster ist ein Mittelwert, abgestimmt auf den Boden daneben; die echten Schatten der
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

KOSTEN_PLATZHALTER

## Tests

TESTS_PLATZHALTER

## Bilder vorher/nachher

`/home/claude/scratch/foto/wald/vorher/` und `…/nachher/` (im Chat-Rechner, nicht im Repo): die festen Blickpunkte des Auftrags
(`w1`–`w5` im Wald, `wiese`, `rasen`; `w2` um 9 und um 20 Uhr, `w5` um 20 Uhr), 960 × 540, Stufe „hoch“, 1. Juni 15:30, Wetter „klar“.

## Offen (nächste Schritte)

OFFEN_PLATZHALTER
