# Die Ferne – der Übergang zwischen Horizont und Nahdarstellung (`feat/ferne`)

Auftrag: Falko, 19.11.2026 21:19 (an den Karten-Chat, von dort an den Fotorealismus-Chat übergeben): „Es ist manchmal etwas befremdlich,
wenn sich der Horizont und Objekte in der Ferne am Horizont erst sehr langsam aufbauen. Es wäre schöner, wenn man die Felder auch von
größerer Ferne aus sehen könnte und nicht dann plötzlich auftauchen, selbst in der vollen Grafikauflösung … einen flüssigen Ablauf im
Browser, aber einen flüssigeren Übergang zwischen Horizontdarstellung und detaillierter Nahdarstellung. Das gleiche gilt übrigens auch
für Personen.“ Ziel: nichts poppt sichtbar auf, Orte, Wälder und Felder sind schon von Weitem erkennbar, im Browser bleibt es flüssig.
Schwerpunkt Laptop (Stufe „hoch“), das Handy wird nicht schlechter.

## Die harten Grenzen vorher (Stufe „hoch“)

| Was | Wo | Grenze |
|---|---|---|
| Häuser der Weltzellen | `gebaeude/gebaeude.js` | gebaut ab 700 m, weg ab 900 m – dahinter nur das Luftbild |
| Altstadt Schleusingen | `welt/schleusingen.js` | 950 m um den Markt |
| Bäume der Region | `weltwald/weltwald.js` | 3D bis 24/105 m, Karten bis 520 m, Zellen ab 760 m – dahinter nichts |
| Feldfrüchte im Boden | `bewuchs/bw_ferne.js` | ausgeblendet 260–340 m |
| Kacheln | `welt/welt.js` | Stufen 10/11/12 bis 760/380/150 m; dahinter das Gelände von `world/ratscher.js` (12 km um Ratscher) – **bei Meiningen und Trusetal (25–35 km) dahinter gar kein Gelände** |
| Personen | Dorf, Schleusingen, Verkehr | nur auf kurze Entfernung |

## Schritt 1: Häuser in der Ferne (`ferne/ferne.js`, `FERNE`)

- **Daten:** `tools/ferne/haeuser.py` rechnet beim Bauen (`viz3/build.py`, nach dem Kopieren der Extras) aus den Zellen
  `dist/gebaeude/z/*.json` und Schleusingens `dist/schleusingen/stadt.json` je Gebäude einen Datensatz von 16 Byte
  (`dist/ferne/haeuser.bin`): das gedrehte Rechteck um den Grundriss (auf die Fläche des Grundrisses verkleinert, ein L-förmiges Haus
  wird nicht zu seinem ganzen Umriss), Trauf- und Firsthöhe, Dachform (Sattel, Walm, flach, Pult; die Firstrichtung aus den
  Dachflächen), Art (Haus, Scheune/Halle, Schuppen, Behälter, Turm), Dachfarbe aus dem Luftbild 2024, Zelle. Garagen und
  Gartenhäuschen unter 60 m² und 4 m bleiben weg. Heute 28 849 von 40 819 Gebäuden in 129 Blöcken zu 1,6 km, 452 KB. **Neue Zellen
  des Karten-Chats kommen ohne Zutun mit.**
- **Darstellung:** je Gebäude ein Block – Wände bis zur Traufe (4 m unter den Boden gezogen), Giebel, Dach in seiner Form und Farbe;
  Wände nach Art: Putz in den Pastelltönen des Dorfs, ein Viertel der Häuser verschiefert, Scheunen Holz, Hallen Putz oder Blech.
  Fenster als Reihen dunklerer Scheiben (2,9 m Achsabstand, Geschosse 2,75 m), die, wo sie kleiner als ein Bildpunkt werden, in einen
  gleichmäßigen Ton übergehen (gemittelt im Shader: kein Flimmern); nachts beleuchtet wie im Dorf (dieselben Uniforms `uNight`,
  `uWinP`, `uWinK` aus `world/village.js`).
- **Übergang zur Nähe:** wo das Detail steht, weichen die Blöcke – eine von `gebaeude.js` gebaute 400-m-Zelle, Schleusingens Altstadt,
  sobald ihre Zone steht. Die Blöcke dieser Zelle lösen sich in 0,8 s auf (Rasterblende im Shader: ein 4×4-Muster verwirft Bildpunkte,
  keine echte Transparenz, keine Sortierung), während die Häuser im Detail – gleicher Grundriss, gleiche Höhe, gleiche Dachfarbe – schon
  stehen; wird eine Zelle in der Ferne freigegeben, sind ihre Blöcke sofort wieder da (keine Lücke). Neue Blöcke blenden in 1 s ein,
  am Rand der Reichweite lösen sie sich über den letzten Kilometer auf, unter 300 m werden sie nie gezeichnet (keine groben Kästen neben
  der Spielfigur, bevor die Zellen da sind). Die Blende je Zelle liegt in einer kleinen Textur (256 × 256 Byte), die der Vertex-Shader
  liest; eine ausgeblendete Zelle fällt dort auf einen Punkt zusammen (keine Bildpunkte, keine Kosten im Fragment-Shader).
- **Reichweite:** „hoch“ 6 km (ausgeblendet ab 5 km), „mittel“ 4,2 km, „schnell“ 2,5 km, Telefon 1,5 km.
- **Boden:** wie gezeichnet – die Kacheln der Welt nahe der Kamera, dahinter das Gelände von `world/ratscher.js` (DGM1 um das Dorf, das
  Oberflächenmodell bis 12 km: ein Ort steht dort auf seinen eigenen, geglätteten Dächern, wie der gezeichnete Boden). Kommen später
  feinere Kacheln, setzt sich ein Block bis 1,5 km nahe neu. **Jenseits von 12 km (Meiningen, Trusetal, die B 89) ist heute kein Boden
  gezeichnet** – dort keine Blöcke, sie würden im Dunst hängen (Schritt 1b).
- **Kosten:** ein Zeichenaufruf je Block in Reichweite (an den festen Blickpunkten 14–20), 70–135 Tsd. Dreiecke, keine Schatten, ein
  neues Shader-Programm (8 Texturen); gebaut wird in Scheiben von höchstens 3 ms je Bild. Daten 452 KB, einmal nach dem Laden.
- `?noferne` lässt alles weg (zum Vergleichen). `FERNE.state()`, `FERNE.set({ on, far })`, `FERNE.cellFade(i, j)`.
- **Nicht dabei:** Suhls eigene Gebäude (Suhl-Chat), Kloster Veßras Dorf (`welt/vessra.js`), die Wahrzeichen der Orte (Kirchtürme,
  Bertholdsburg) als eigene Form – sie stehen als Blöcke ihrer ETHOS-Höhe da, soweit sie in den Zellen sind.

## Tests

- `viz3/test/ferne.py` (`viz3/extra/ferne/tests.txt`: smoke, ferne, leistung, memphone): Daten da (über 20 000 Gebäude, über 100
  Blöcke), Reichweite je Stufe, an sechs festen Blickpunkten (`viz3/extra/ferne/views.json`: Ratscher Anger, über dem Markt von
  Schleusingen, B 89 bei Belrieth, über dem Markt von Meiningen, über Trusetal, über dem Anger von Ratscher) Bilder mit und ohne
  (`out/ferne/<Blick>_mit.jpg`, `_ohne.jpg`), Blöcke in Reichweite (im Gebiet um Ratscher) bzw. keine (jenseits von 12 km), die nahen
  Zellen ohne Blöcke, Kosten (≤ 40 Aufrufe, ≤ 500 000 Dreiecke), keine Bauscheibe über 12 ms, kein Programm über 16 Texturen. Der Test
  kopiert die Kacheln um die Blickpunkte in `dist/` (wie die anderen Welt-Tests).

## Nächste Schritte

1. **1b – Boden in der Ferne für die Zonen jenseits von 12 km** (Meiningen, Trusetal, Werratal): ihre groben Kacheln (Stufen 7–9 gibt es
   schon) als Fernring bis zum Horizont; danach die Blöcke auch dort. Berührt `welt/welt.js` – wird in `docs/PARALLEL.md` angekündigt.
2. **Wald in der Ferne:** hinter den Baumkarten eine erhabene, dunkle Kronenfläche nach den Kronenhöhen der Waldzellen, bis zum
   Horizont; die Karten ab 450 m weich in sie überblendet.
3. **Felder weiter sichtbar:** ein zweites, gröberes Feld-Fenster bis 1–2 km in `bewuchs/bw_ferne.js`.
4. **Personen in der Ferne** als leichte, bewegte Silhouetten bis 200–300 m, weich eingeblendet.
5. **Vorausladen** in Blick- und Fahrtrichtung; beim Start erst die Fernsicht, dann einblenden.
