# Bäume im Licht – Laub, Kronen, ferne Bäume (Hilfs-Agent `foto-baeume`, Zweig `feat/foto-baeume`)

Teil des Fotorealismus-Auftrags (Falko, 18.11.2026; Regeln `docs/plans/auftraege/foto-gemeinsam.md`, Auftrag
`docs/plans/auftraege/foto-baeume.md`). Stand: **Schritt 1 + 2 und der dringende Teil von 3** – Laub im Licht, kein Baum wie der andere,
kein Herbstlaub im Juni.

## Was vorher falsch aussah (Bilder vom 18.11., 1. Juni, Wetter „klar“)

- Die Linde am Anger: nachmittags blass graugrün, **abends cremeweiß**, helle und dunkle Laubkarten wie ausgeschnitten nebeneinander.
- **Jeder vierte Laubbaum orange-gelb im Juni** – in den fernen Reihen, im Tal, an der L 1625, in den Hecken des Gartens.
- Ferne Reihen: gleiche runde Bäume in einem Grün, gleich beleuchtet.

## Ursachen (gefunden, nicht vermutet)

1. **Spiegelglanz auf Laubkarten.** Jede Karte wird als Stück ihrer Krone beleuchtet (ihre Normale zeigt aus der Krone heraus). Für eine
   solche Fläche rechnet three einen Spiegelanteil: streifend gesehen wirft sie den Himmel (`indirectSpecular`) und die Sonne
   (`directSpecular`) um ein Vielfaches stärker zurück als ihr eigenes Grün – tagsüber ein blasser Schleier, in der tiefen, warmen Sonne
   Creme. Blätter schimmern nur.
2. **Umgedrehte Normalen.** Das Laubmaterial ist doppelseitig; three dreht die Normale auf der Rückseite einer Karte um. Die Hälfte der
   Karten einer Krone war deshalb beleuchtet, als hinge sie auf der anderen Seite des Baums – hell und dunkel nach Zufall, keine runde
   Krone mit Licht- und Schattenseite.
3. **Das Laubbild der Espe zeigt Oktoberlaub** (`tree/aspen_color.png`: goldgelb, Mittel sRGB 195/150/56). Damit wurden die Espe des
   Gartens und der Welt (jeder vierte Laubbaum des Kronenmodells und seine ferne Karte), die Heckensträucher (`bushB`) und die Birke
   der Straßenbäume gezeichnet – das ganze Jahr.
4. **Laubbilder enthalten nur das Blattgrün**: kaum Blau (ein Siebtel dessen, was ein Blatt zurückwirft), wenig Rot. Ohne den
   Spiegelschleier wirkte das Laub smaragdgrün wie in einem Computerspiel.
5. **Ferne Karten:** Farbvariation `offsetHSL` auf Weiß (ändert nichts), Drehung und Helligkeit aus derselben Zufallszahl wie die Art –
   jede Art stand innerhalb von 90° gleich gedreht und gleich hell.

## Was neu ist

### Das Licht des Laubs (`garden/trees.js`, `LAUB`)

Ein Shader-Zusatz für jedes Laubmaterial aus `buildTreeKind` (Garten, Welt, Dorflinde, Straßenbäume, Gartenplaner – alle bekommen ihn,
alle teilen sich weiter dieselben Programme):

- **Kein Spiegel:** vom Glanz des Himmels und der Sonne bleibt ein Schimmer (16 %).
- **Die Krone als Körper:** beide Seiten einer Karte behalten die Normale der Krone, dazu ein Anteil der eigenen Kartenfläche (aus den
  Bildschirm-Ableitungen), damit Zweige sich unterscheiden. Die Krone hat jetzt eine Licht- und eine Schattenseite.
- **Licht durch das Blatt:** eine Karte, die man von ihrer unbeleuchteten Seite sieht, leuchtet gelbgrün, wo die Sonne hinkommt – von
  unten in der besonnten Krone und am Rand der Krone im Gegenlicht (je weiter der Weg durch die Krone, desto weniger). Nadeln lassen
  ein Drittel davon durch.
- **Innen dunkler:** jede Kartenecke kennt ihre Tiefe in der Krone (`aLfIn`, ein Byte je Ecke, beim Bauen der Art gerechnet: die Ecken
  in einem groben Raster gezählt, von jeder Ecke der Weg nach außen und nach oben durch das Laub summiert). Weniger Himmel und weniger
  Sonne kommen dort an. Das steckt auch in den Bildern der fernen Karten (sie werden mit diesem Material gezeichnet).
- **Natürliches Grün statt Smaragd:** zum Blattgrün des Bilds kommt das Weiß, das jede Blattoberfläche von jedem Licht zurückwirft
  (als kleiner fester Anteil in der Farbe, nicht als Spiegel); das Himmelslicht fällt mit festem Anteil auf das Laub (bisher war es
  mit dem Spiegel heruntergedreht – Kronen im Gegenlicht standen schwarz); dazu Licht, das die Blätter einer besonnten Krone einander
  zuwerfen (Schattenseite und Inneres sind nicht schwarz).
- **Kein Baum wie der andere:** Farbton (gelbgrün … blaugrün) und Helligkeit je Baum aus seinem Standort (aus der Instanz-Matrix – nichts
  zu speichern, und wer diese Kronen zeichnet, bekommt es mit).

### Sommerlaub statt Oktoberlaub (`eztree/textures.js`, `getSummerLeafTexture`)

Das Espen-Laubbild wird beim Laden einmal in dieselben Blätter im Sommer umgerechnet (eine Matrix auf den linearen Farben: mattes,
leicht graues Grün, Hell und Dunkel und Adern bleiben). Arten mit `sommer: true` bekommen dieses Bild: die Espe und die Heckensträucher
des Gartens, die Birke der Straßenbäume (eine markierte Zeile in `stadtgruen/stadtgruen.js`; ihre Herbstfärbung macht dort wie bei den
anderen Arten die Kronenfarbe). Die eigenen Arten des Gartenplaners behalten das Originalbild (er färbt jede Pflanze selbst auf ihren
Monatston). **Kein neues Asset**, keine neue Datei – das Bild entsteht im Browser aus dem vorhandenen.

### Ferne Bäume (`world/ratscher.js`, markierte Zeilen)

- Die Karte der Espe ist grün (der Atlas wird aus den Arten des Gartens gezeichnet).
- Farbton und Helligkeit je Baum aus seinem Standort (gilt auch für die fernen Karten der Straßenbäume – dasselbe Material), jede Krone
  fängt das Licht etwas anders (Normale je Baum leicht geneigt), beliebige Drehung (von hinten gesehen ist die Karte ihr Spiegelbild),
  jede Karte etwas anders gestreckt (± 6 % Höhe, ± 10 % Breite).
- Dasselbe Licht wie die 3D-Kronen: Schimmer statt Spiegel (auch der Sonne – der war noch ganz da), Himmelslicht mit demselben Anteil,
  Licht zwischen den Blättern, im Gegenlicht leuchtet die obere Krone etwas.
- Die 3D-Bäume um den Garten: beliebige Drehung statt einer Vierteldrehung je Art, Helligkeit je Baum unabhängig von der Art.

## Dateien

| Datei | Änderung |
|---|---|
| `viz3/src/garden/trees.js` | `LAUB` (Shader-Zusatz, Kronentiefe, Schalter für Tests), `buildTreeKind`: Tiefe backen, Zusatz anwenden, `sommer` |
| `viz3/src/eztree/textures.js` | `getSummerLeafTexture` |
| `viz3/src/world/ratscher.js` | markierte Zeilen: Atlas ohne Baumfarbe zeichnen, Zufallszahlen je Baum, ferne Karten (Farbe, Licht, Drehung, Streckung) |
| `viz3/src/stadtgruen/stadtgruen.js` | eine markierte Zeile: Birke mit Sommerbild |
| `viz3/test/foto_baeume.py`, `viz3/extra/foto-baeume/tests.txt` | Test |

Neuer `window`-Name: `LAUB` (bitte in `docs/ARCHITECTURE.md` eintragen – gemeinsame Datei). Kein neuer Speicher-Schlüssel.

## Schnittstelle

- `LAUB.patch(material, { thru, crown })` – der Zusatz für ein Laubmaterial (nach `patchSV`, vor dem Wind-Haken); `crown: false` für
  Modelle mit eigenen Kartennormalen (noch von niemandem benutzt).
- `LAUB.crownDepth(geometry)` – backt `aLfIn`; `thinCards()` und Klone tragen es weiter.
- `LAUB.set({ sheen, thru, inside, vary, wrap, card, sky, white, bounce, gain })` zum Abstimmen im Browser, `LAUB.set({ on: false })`
  zeigt das Laub mit vollem Spiegel und ohne die Zusätze (die Kronen-Normale bleibt), `LAUB.state()`.

## Kosten

PLATZHALTER_KOSTEN

## Tests

PLATZHALTER_TESTS

## Bilder

Vorher/nachher von den festen Blickpunkten des Auftrags (im Chat-Rechner, nicht im Repo): `/home/claude/scratch/foto/baeume/`,
`<blick>_<stunde>_vor.jpg` und `<blick>_<stunde>_nach.jpg`.

## Grenzen und offen

PLATZHALTER_OFFEN
