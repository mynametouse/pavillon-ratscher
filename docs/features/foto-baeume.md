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
des Gartens (`aspen`, `bushB` – damit auch die Espen der Welt, ihre ferne Karte, die Hecken der Straßenbäume und die Birken des Walds
der Region, die diese Arten zeichnen) und die Birke der Straßenbäume (eine markierte Zeile in `stadtgruen/stadtgruen.js`; ihre
Herbstfärbung macht dort wie bei den anderen Arten die Kronenfarbe). Der Wald der Region (`weltwald/weltwald.js`) hatte das goldene
Bild selbst ausgeglichen (Sommer-Tönung 0,56 / 0,98 / 1,35 – ein Gelboliv); zwei markierte Zeilen dort: die Birke nimmt das Sommerbild,
wie es ist, und ihr Oktobergold kommt als Tönung (5,65 / 1,64 / 0,57 – derselbe Farbton wie bisher). Die eigenen Arten des
Gartenplaners behalten das Originalbild (er färbt jede Pflanze selbst auf ihren Monatston). **Kein neues Asset**, keine neue Datei –
das Bild entsteht im Browser aus dem vorhandenen.

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
| `viz3/src/weltwald/weltwald.js` | zwei markierte Zeilen: Sommer- und Herbsttönung der Birke für das Sommerbild |
| `viz3/test/foto_baeume.py`, `viz3/extra/foto-baeume/tests.txt` | Test |

Neuer `window`-Name: `LAUB` (bitte in `docs/ARCHITECTURE.md` eintragen – gemeinsame Datei). Kein neuer Speicher-Schlüssel.

## Schnittstelle

- `LAUB.patch(material, { thru, crown })` – der Zusatz für ein Laubmaterial (nach `patchSV`, vor dem Wind-Haken); `crown: false` für
  Modelle mit eigenen Kartennormalen (noch von niemandem benutzt).
- `LAUB.crownDepth(geometry)` – backt `aLfIn`; `thinCards()` und Klone tragen es weiter.
- `LAUB.set({ sheen, thru, inside, vary, wrap, card, sky, white, bounce, gain })` zum Abstimmen im Browser, `LAUB.set({ on: false })`
  zeigt das Laub mit vollem Spiegel und ohne die Zusätze (die Kronen-Normale bleibt), `LAUB.state()`.

## Kosten

Gezählt wie in `docs/features/fotorealismus.md` (Stufe „hoch“, 960 × 540, Wetter „klar“, Software-Grafik – Bildzeiten sagen dort
nichts, deshalb Zeichenaufrufe und Dreiecke).

- **Zeichenaufrufe, Dreiecke: unverändert.** Kein neues Mesh, keine neue Geometrie (die Kartenstreckung der fernen Bäume ändert die
  Dreieckszahl nicht). Zahlen je Blickpunkt vorher/nachher: 15:30 Uhr, Aufrufe / Dreiecke: Linde 702 / 1,37 M → 701 / 1,36 M
  und 639 / 1,37 M → 647 / 1,36 M, Garten 894 / 1,75 M → 900 / 1,75 M und 1027 / 2,17 M → 1029 / 2,16 M, ferne Reihen 584 / 1,32 M →
  588 / 1,32 M, Waldrand 287 / 0,86 M → 289 / 0,86 M, Tal 462 / 1,13 M → 462 / 1,12 M; Schattenkarte des Kastens bei allen gleich
  (z. B. Garten 404 890 Dreiecke vorher und nachher). Die kleinen Unterschiede kommen vom zusammengeführten `src` (V19f–V19j).
- **Programme: unverändert** (vorher 193 nach allen Blickpunkten, nachher 195 – mit `src` bis V19j, dem Wald der Region; der Stand davor mit dem Laublicht allein zählte keine mehr). Alle Laubmaterialien bekommen denselben
  Zusatz und denselben Cache-Schlüssel und teilen sich ihre Programme wie bisher; die fernen Karten bleiben ein Programm (auch für die
  Karten der Straßenbäume und des Walds der Region).
- **Texturen je Programm: höchstens 16 wie vorher** (das Laub selbst liegt weit darunter); kein neuer Sampler, keine neue Textur im
  Shader.
- **Speicher:** ein Byte je Kartenecke (`aLfIn`) – bei den 23 Arten der Blickpunkte zusammen unter 1 MB mit allen Detailstufen. Das
  Sommerbild der Espe ist ein Bild 1024 × 1024 im Arbeitsspeicher (auf Telefonen halbiert wie alle Bilder); auf der Grafikkarte ersetzt
  es das Original, das erst wieder gebraucht wird, wenn der Gartenplaner seine eigenen Arten zeichnet.
- **Laden:** die Kronentiefe aller Arten zusammen 84 ms (23 Kronen, im Chat-Rechner gemessen, `LAUB.state().ms`); das Sommerbild einmal
  eine Schleife über die deckenden Bildpunkte (ein Sechstel des Bilds) – nicht einzeln gemessen.
- **Je Bildpunkt Laub:** zwei Bildschirm-Ableitungen, ein `exp`, zwei `smoothstep`, einige Skalarprodukte mehr; kein Textur-Abruf mehr
  als vorher. **Nicht gemessen:** Bildzeiten auf einer echten Grafikkarte (Falkos Laptop, iPhone) – im Chat-Rechner gibt es nur
  Software-Grafik.

## Tests

`viz3/test/foto_baeume.py` (Abschnitte `szene`, `linde`, `reihen`, `tal`; in `viz3/extra/foto-baeume/tests.txt`, dazu `leistung`,
`memphone`, `gpu`, `baeume`, `garten`, `stadtgruen`, `welt_wald`, `gartenplaner` – sie laufen im Feature-Lauf bei GitHub):

- jede Art trägt den Zusatz und die Kronentiefe (außen offen, innen tief), auch in den ausgedünnten Stufen; die Uniforms kommen in
  den Programmen an (Laub und ferne Karten); das Espen-Laubbild ist grün;
- die Linde am Anger um 15:30 und 20:00: ihre Laub-Bildpunkte (gefunden, indem ihr Material für ein Bild magenta gemalt wird) sind
  grün, kaum einer blass (Creme) oder neon (kein Blau); beleuchtete und beschattete Blätter liegen im Bereich eines Fotos einer Linde
  im Juni; mit vollem Spiegel (`LAUB.set({ sheen: 1 })`) ist die Krone blasser – der Test merkt, wenn sich three's Licht unter dem Zusatz
  ändert;
- ferne Reihen: keine orangen Bäume im Juni; mit der eigenen Farbe je Baum streuen die Farbtöne weiter als ohne;
- Tal von oben: keine orangen Bäume, ferne Karten und 3D-Kronen in einem Ton;
- höchstens 16 Texturen je Programm, keines kaputt.

Stand der Läufe: `tools/check.sh` grün. Feature-Lauf 44388434205 (Stand `ab7b99f6`): smoke, gpu, memphone,
leistung, garten, welt_wald grün; `foto_baeume` rot – ein Fehler des Tests (`TREES` ist kein globaler Name), behoben auf
`wip/foto-baeume` (`LAUB.kinds`), dort noch nicht gelaufen; die Schwellen des Tests sind deshalb noch nicht an einem Lauf geprüft.
Lokal (Bilderlauf, 21 Bilder): kein Seitenfehler, 195 Programme, höchstens 16 / 5 Texturen, keines kaputt.

**Stand 18.11. 21:30 (Stopp für heute, Falko 21:21):** das Laub der 3D-Kronen ist ein vorzeigbarer Schritt (Linde 15:30: beleuchtet
sRGB 100/121/73, beschattet 48/71/30). **Halb fertig:** die fernen Karten und die Birken stehen im Blick über das Feld
(`reihen`) zu blass und zu bläulich – der Himmelsanteil der fernen Karten (jetzt 1,0 / 0,55 statt 0,6) und das Blau im Sommerbild der
Espe (Matrixzeile 0,04 / 0,09 / 0,2) müssen herunter; die selbstbeschattete Erle im Garten ist auf der Schattenseite noch dunkler
als ein Foto (39 statt 55–70 im Grün).

## Bilder

Vorher/nachher von den festen Blickpunkten des Auftrags (im Chat-Rechner, nicht im Repo): `/home/claude/scratch/foto/baeume/`,
`<blick>_<stunde>_vor.jpg` und `<blick>_<stunde>_nach.jpg`.

## Grenzen und offen

- **Herbst der Welt-Bäume:** die Laubbäume des Kronenmodells und des Gartens sind das ganze Jahr sommergrün (die Espe war bisher das
  ganze Jahr golden). Schritt 3 des Auftrags: Tönung nach Datum je Art (wie Straßenbäume und Wald der Region es schon tun), kahle
  Kronen im Winter.
- **Gartenplaner:** Pflanzen, die er mit der Espe des Gartens zeichnet (säulenförmige Kronen), erreichen ihr Herbstgold nur noch so
  weit wie seine Eichen und Eschen (seine Tönung ist auf das 2,6-Fache begrenzt, `gplan/gplan_3d.js` `tint` – nicht meine Datei).
  Seine eigenen Arten (Obstbaum, Strauch, Staude) behalten das Originalbild und sind unverändert.
- **glTF-Bäume des Gartens** (Tanne, Apfelbäume aus `instanceVariants`, `core/assets.js`): noch mit three's Standardlicht (Spiegel des
  Himmels auf den Karten). `LAUB.patch(material, { crown: false })` ist dafür vorbereitet; es braucht eine markierte Zeile in
  `core/assets.js` (ein Haken je Material) – mit dem Lead abstimmen.
- **Nadelbäume aus ez-tree** (`pine`, Kiefern der Welt nahe am Garten): ihr Laubbild ist hell (0,12 / 0,18 / 0,03) – Nadeln sind dunkler.
  Farbe je Art ist Schritt 3.
- **Ferne Karten:** fünf Bilder für 21 000 Bäume – Farbe, Licht, Drehung und Streckung unterscheiden sie jetzt, die Umrisse bleiben
  fünf. Mehr Bilder je Art (zwei Ansichten, zwei Wuchsformen) kosten nur Atlasbreite. Der Atlas speichert linear in 8 Bit; in dunklen
  Kronenteilen sind das wenige Stufen (sRGB-Atlas prüfen).
- **Übergang 3D → Karte bei ~100 m** (Schritt 4): Farbe und Licht sind angeglichen, die Größe nicht geprüft.
- **Schatten im Laub:** nahe Gartenbäume beschatten sich über die Schattenkarte selbst (hart, kartenweise); die Kronentiefe mildert das
  nicht. Die SSAO-Stufe (N8AO) dunkelt Laub aus der Nähe zusätzlich ab – nicht meine Datei.
- Falkos Eindruck am Laptop und am iPhone.
