# Plan: Bewuchs in 3D – Rasen, Gras, Wildblumen, Büsche, Beete (die ganze Welt)

Stand: 17.11.2026, 21:00 · Straßen-Chat (session_01WqScFDtq8GSy4n7wU7foJx) · **nur Plan** – gebaut wird nach Falkos Okay. Falkos Wunsch
vom 17.11., 20:19:

> „… insbesondere nochmal um den Garten kümmern, um [Rasen] und eine Vorlage für Gras bauen, denn das Gras ist noch 2D, komplett flach,
> also Bäume sind in 3D, was aber fehlt, sind sowas wie Büsche mit Beeren, Gräser, Blumen und was so üblicherweise dort wächst auf Wiesen.
> Sowohl für den Garten, so normaler Rasen, fehlt zum Beispiel noch vollständig, natürlich sehr kurz bei entsprechenden Stellen. … wenn er
> sehr flach ist, und das ist ja häufig so im Garten beziehungsweise auf gemähten Flächen, dort ist 2D beziehungsweise komplett flach einfach
> nicht ausreichend. … Und das jetzt nicht nur im Garten oder in [Ratscher], sondern auch in der kompletten Welt. … Also 3D, Rasen, Gras,
> Wildblumen, aber auch gestaltete, also durch Menschen gestaltete Flächen, also bepflanzte Flächen, sowohl im Garten als auch in den
> Städten oder auf Verkehrsinseln und so weiter, dort wo üblicherweise eben ein bisschen angepflanzt wird. … wobei es trotzdem im Browser
> weiterhin flüssig laufen können soll.“

## 1. Was es heute gibt (nachgesehen im Code, `src` mit V18v)

| Bereich | Heute | Wo |
|---|---|---|
| Rasen | nur um den Pavillon: bis ~40 000 Grasbüschel aus je drei gekreuzten Bildkarten (Telefon ~11 000), dicht bis ~27 m, dünner im Rest des Gartens; ab 22 m halb so viele, ab 40 m ein Viertel, ab 70 m keine; mähbar (Raster 25 cm, Streifen, wächst in gut 5 Spieltagen nach), biegt sich im Wind | `garden/grass.js`, Mähen `garden/garage_play.js`, Wind `wetter/wx_wind.js` |
| Blumen und Kräuter | ~320 Wiesenblumen in drei Farben, hohe Büschel an Sockel, Wegrand, Stämmen und Bach, Farne im Schatten, Löwenzahn – nur im Garten | `garden/grass.js` |
| Boden überall sonst | das Luftbild (nah 20 cm je Bildpunkt) mit einer Kornstruktur „Gras“ oder „Erde“, gewählt nach der Farbe des Bilds, bis 150 m – **flach**: Gärten, Anger, Wiesen, Bankette, Verkehrsinseln | `world/roads.js` (`landDetail`), `welt/welt.js`, `garden/env.js` |
| Bäume und Wald | Ratscher ~21 000 gemessene Bäume; der Wald an der Klinge mit Farnen und Moosboden; Jahreszeit nach Spieldatum | `world/ratscher.js`, `world/forest.js` |
| Sträucher | nur die Pflanzen des Gartenplaners (zwei EZ-Tree-Büsche, Blüte und Frucht als Punkte) und die geschnittenen Hecken am Anger | `gplan/gplan_3d.js`, `world/dorfkern.js` |
| Beete | vor den Häusern der Dorfleute je ein Beet mit Brettrand (Erde und zwei Reihen farbiger Klötzchen) | `dorf/dorf_life.js` |
| Fehlt ganz | Rasen mit Tiefe außerhalb des Gartens, Wiesengräser, Wildblumen, Büsche mit Beeren, bepflanzte Flächen in Orten, auf Verkehrsinseln, im Kreisel, am Friedhof; Waldboden außerhalb der Klinge | – |

## 2. Ziel

Wo es grün ist, steht nahe am Spieler echtes 3D-Grün, das zur Stelle passt – kurzer, gemähter Rasen im Garten und Vorgarten, höheres Gras
auf öffentlichen Flächen, Wiesen mit Gräsern und Wildblumen, Säume und Bankette, Büsche mit Blüten und Beeren, Beete, Kübel und
Verkehrsinseln –, mit der Jahreszeit des Spieldatums, gemäht nach Kalender, im Wind, niedergetreten, wo jemand läuft oder fährt. Nach
hinten geht es unsichtbar ins Luftbild über. **Eine Vorlage für alles:** dieselben Bausteine im Garten, in Ratscher, in Schleusingen und in
der ganzen Welt – nur die Daten sagen, was wo wächst. Flüssig: am Telefon und auf Falkos Laptop nicht spürbar langsamer als heute.

## 3. Was wo wächst (die Vorlagen)

| Flächenart | Höhe | Pflege | Was wächst (Auswahl) | Wo |
|---|---|---|---|---|
| Zierrasen | 3–8 cm | wöchentlich gemäht, April–Oktober (Streifen) | Gräser, Gänseblümchen, Weißklee, Löwenzahn, Moos im Schatten, Kahlstellen | Gärten, Vorgärten, Falkos Garten (mähbar wie heute) |
| Öffentliches Grün | 5–15 cm | 4–8× im Jahr | dazu Schafgarbe, Wegerich, Klee | Anger, Kirche, Schule, Park, Grünstreifen in Orten |
| Bankett, Straßenrand | 10–60 cm | 2× (Juni, September), der Streifen an der Fahrbahn öfter | Wiesenkerbel, Rainfarn, Wegwarte, Schafgarbe, Wilde Möhre | an allen Straßen außerorts (aus den Straßendaten) |
| Mähwiese (Heu) | bis 80–100 cm vor dem 1. Schnitt (Anfang Juni), danach bis ~50 cm (2. Schnitt August) | 2–3× | Glatthafer, Knaulgras, Fuchsschwanz mit Rispen; Margerite, Glockenblume, Storchschnabel, Hahnenfuß, Rot- und Weißklee, Flockenblume, Bärenklau, Herbstzeitlose | Wiesen um die Orte, Hangwiesen |
| Weide | 5–25 cm, ungleich | beweidet | Geilstellen (stehengelassene Büschel), Disteln, Brennnesseln am Zaun, Trittpfade | Ronalds Ziegen, Rinderweiden |
| Streuobstwiese | wie Mähwiese | 1–2× | unter Obstbäumen | Hänge um Ratscher |
| Saum, Brache, Bachufer | 50–150 cm | selten oder nie | Brennnessel, Disteln, Mädesüß, Springkraut, Weidenröschen, Schilf, Brombeerranken | Feldraine, Gräben, Bäche |
| Ackerrand | 20–80 cm | – | Klatschmohn, Kornblume, Kamille | Ränder der Äcker (die Äcker selbst: Entscheidung 2) |
| Waldboden | 10–60 cm | – | Farne, Heidelbeeren, Moos; Brombeeren, Himbeeren und Fingerhut auf Lichtungen | Wälder (mit welt-wald, Abschnitt 6) |
| Büsche, wild | 1–4 m | – | Holunder, Weißdorn, Schlehe, Hundsrose, Hasel, Brombeere, Himbeere, Hartriegel, Pfaffenhütchen, Salweide | Feldgehölze, Wegränder, Bäche, Gartenränder |
| Büsche im Garten | 0,5–3 m | geschnitten | Johannis- und Stachelbeere, Himbeere, Flieder, Forsythie, Hortensie, Sommerflieder, Buchskugeln, Thuja | Gärten, Vorgärten |
| Beet | 0,1–1,2 m | gepflegt | Stauden (Lavendel, Katzenminze, Sonnenhut, Fetthenne, Ziergräser, Astern), Wechselflor (Tulpen, Stiefmütterchen – Geranien, Begonien, Tagetes – Heide, Chrysanthemen), Rosen | Markt, Rathaus, Kirche, Vorgärten, Friedhof |
| Gemüsebeet | 0–1,8 m | nach Kalender | Salat, Kohl, Bohnen an Stangen, Tomaten, Kartoffeln, Zwiebeln, Rhabarber, Erdbeeren, Dahlien, Sonnenblumen | Hausgärten, die Beete der Dorfleute |
| Verkehrsgrün | 0,1–1 m | 2–4× | Bodendecker (Zwergmispel, Fingerstrauch, Bodendeckerrosen) in Rindenmulch, Ziergräser, Rasen | Verkehrsinseln, Kreisel, Mittelstreifen, Inseln der Parkplätze |
| Kübel, Grab | – | gepflegt | Geranien, Begonien, Heide, Stiefmütterchen, Bodendecker, kleine Koniferen | Markt, vor Läden, Friedhof |

### Jahreszeit (aus dem Spieldatum; das Wetter kommt dazu)

| Zeit | Was man sieht |
|---|---|
| November–Februar | Gras graugrün bis braun und niedergedrückt, Raureif und Schnee nach Wetter; Büsche kahl (Hagebutten und Schlehen hängen); Beete leer oder abgedeckt, Gräber mit Tannengrün |
| März–April | frisches Grün, Löwenzahn, Gänseblümchen, Wiesenschaumkraut; Schlehe und Forsythie blühen; Tulpen, Narzissen, Stiefmütterchen; erstes Mähen |
| Mai | die Wiesen wachsen hoch, Hahnenfuß, Wiesenkerbel an jedem Straßenrand; Weißdorn, Flieder; aus Löwenzahn werden Pusteblumen |
| Juni | Gräser mit Rispen, Margeriten, Glockenblumen; **Heuschnitt** (nicht alle Wiesen am selben Tag – ein Flickenteppich aus gemäht und hoch); Holunder blüht, Mohn am Feld, Rosen |
| Juli–August | Beeren (Johannis-, Stachel-, Himbeere, dann Brombeere), Kornblume, Wilde Möhre, Rainfarn, Wegwarte; bei Trockenheit gelblich; zweiter Schnitt |
| September–Oktober | Holunderbeeren, Hagebutten, Weißdornfrüchte; Astern, Heide; Herbstzeitlose; das Laub färbt sich; letztes Mähen |

## 4. Technik – wie es flüssig bleibt

Grundsatz: **nah echtes 3D, weiter weg einfacher, ganz hinten das Luftbild** – je Ring ein Zeichenaufruf, nichts je Halm im
Hauptprozessor.

### 4.1 Halme (Rasen, Wiese, Saum)

- **Ringe um die Kamera:** nah (bis ~12 m) einzelne gebogene Halme (3 Dreiecke, Breite und Krümmung je Art), mittel (bis ~35 m) einfache
  Halme (1 Dreieck), weit (bis ~80 m) nur hohes Gras als Büschel. Die Halme stehen in Kacheln von 1 m² mit einem festen Muster der Welt –
  sie wandern nicht mit der Kamera, nichts flimmert beim Gehen.
- **Was jeder Halm an seiner Wurzel liest:** die Flächenart (Höhe, Dichte, Form, Farbton), die Farbe des Luftbilds (so passt er nach hinten
  genau zum Boden; Wege, kahle Stellen und Maulwurfshügel bleiben frei), ob gemäht wurde (im Garten das Mähraster, sonst der Kalender),
  die Spur (niedergetreten), Schnee.
- **Rasen mit Tiefe:** dichte kurze Halme nah; dazu im Boden selbst bis ~40 m eine Halmstruktur mit Licht und Schatten, Glanz gegen die
  Sonne und Mähstreifen (auch am Telefon); längere Büschel an den Kanten – an Wänden, Pfosten, Stämmen, Zäunen, Wegrändern –, wo der Mäher
  nicht hinkommt.
- **Licht** wie die übrige Szene: empfängt die Schatten von Bäumen und Häusern, wirft selbst keinen, dunkler an der Wurzel; Gegenlicht lässt
  Wiesen abends leuchten.
- **Bewegung:** Wind über `WXWIND` wie heute (bei Windstille kein zusätzliches Bild – die Ruhebilder bleiben); wo Spieler, Leute, Tiere und
  Fahrzeuge gehen und fahren, legt sich hohes Gras um und richtet sich langsam wieder auf; Schnee drückt es nieder.
- **Draufsicht und Fahren:** mit der Höhe der Kamera blenden die Ringe aus (von oben zählt das Luftbild); bei schneller Fahrt wird der nahe
  Ring schmaler.

### 4.2 Wildblumen

- ~20 Arten in **einem** Bildatlas (eine Textur, ein Material): Löwenzahn (Blüte und Pusteblume), Gänseblümchen, Weiß- und Rotklee,
  Hahnenfuß, Wiesenschaumkraut, Margerite, Wiesen-Glockenblume, Storchschnabel, Flockenblume, Schafgarbe, Wilde Möhre, Bärenklau,
  Wiesenkerbel, Rainfarn, Wegwarte, Klatschmohn, Kornblume, Kamille, Herbstzeitlose; für Säume und Lichtungen Distel, Brennnessel,
  Springkraut, Fingerhut.
- Jede Art blüht in ihren Wochen (Knospe → Blüte → Samenstand); Dichte nach Flächenart und Mähstand (frisch gemäht keine Blüten, nach zwei,
  drei Wochen wieder).
- Nah als kleine Pflanzen (Instanzen, ein Zeichenaufruf je Ring), weiter weg als Farbtupfen im Boden – eine Juniwiese leuchtet auch aus
  300 m.

### 4.3 Büsche

- Gebaut wie die Bäume: EZ-Tree-Sträucher je Art (wie die Büsche des Gartenplaners), drei Detailstufen und Bildkarten in der Ferne, in
  32-m-Zellen; ~16 Arten (Tabelle oben).
- Blüte und Beeren als kleine Punkte auf den Blattkarten (wie bei den Planer-Pflanzen) nach Monat; das Laub treibt aus, färbt sich und fällt
  wie bei den Bäumen; Hagebutten und Schlehen hängen im Winter.
- Ab ~1 m Höhe fest für Spieler und Fahrzeuge (wie Stämme), darunter durchgehbar; Schatten nur nah.
- Später möglich: Beeren pflücken (das Inventar `INVENTAR` gibt es seit V18v).

### 4.4 Gestaltete Flächen

- Ein Beet = Fläche + Rand (Brett, Rasenkante, Bordstein, Pflaster) + Boden (Erde, Rindenmulch, Kies) + Pflanzliste; Pflanzen aus einem
  kleinen Katalog (Stauden, Wechselflor, Rosen, Bodendecker, Ziergräser, Buchs, Gemüse) als Instanzen in einem Material.
- Nach Kalender: der Wechselflor wechselt dreimal im Jahr, Gemüse wächst und wird geerntet, im Winter leere Erde.
- Woher: OpenStreetMap (Beete, Gärten, Friedhöfe, Parks), die Straßendaten (Verkehrsinseln, Kreiselmitten, Mittelstreifen), die Parkplätze
  der Läden (Inseln zwischen den Stellplätzen), Regeln für Vorgärten und Hausgärten (zwischen Haus und Straße; hinter dem Haus Rasen,
  Gemüse, Beerensträucher), die Beete der Dorfleute (`dorf/`); geprüft gegen die privaten Ansichten von der Straße.

### 4.5 Daten: woher die Flächenart kommt

- Je 400-m-Zelle (dasselbe Raster wie die Gebäude der Welt, `gebaeude/z/`) eine kleine Karte der Flächenart (1 m je Punkt, ~5–15 KB) und
  Listen der Büsche und Beete; für Falkos Garten eine feinere (25 cm) aus den Masken, die es dort schon gibt (Wege, Bach, Gebäude).
- Gebaut in GitHub Actions aus OpenStreetMap (Wiese, Grünland, Acker, Obstwiese, Kleingärten, Friedhof, Park, Garten, Sportplatz, Gebüsch,
  Hecke, Beet), den Straßen von Paket 1, den Gebäuden (OSM, ETHOS, welt-orte), dem Thüringer Luftbild 20 cm in Farbe und Farb-Infrarot
  (grün oder kahl; gemähter Rasen ist glatt, Wiese körnig; Büsche als kleine Kronen) und der Höhe über Gelände, wo es sie gibt (Büsche
  0,5–4 m hoch). Regeln: Kalender je Art; jede Wiese wird an einem etwas anderen Tag gemäht.
- Geprüft mit Bilderbögen (Luftbild mit den gesetzten Flächen); Falkos Gartenfotos und die privaten Ansichten von der Straße nur zum
  Vergleich, nie ins Repo.
- Geladen wird nur, was um den Spieler liegt (wie die Gebäude- und Baumzellen); die ganze Region sind wenige MB.

### 4.6 Budget je Gerät (Ziel, in jeder Stufe gemessen)

| | hoch | mittel (z. B. Falkos Laptop) | schnell / Telefon |
|---|---|---|---|
| einzelne Halme bis | 14 m | 10 m | 7 m |
| einfache Halme bis | 40 m | 28 m | 18 m |
| hohes Gras, Blumen bis | 90 m | 60 m | 40 m |
| Dreiecke Bewuchs im Bild | ≤ 600 000 | ≤ 300 000 | ≤ 150 000 |
| neue Zeichenaufrufe | ≤ 14 | ≤ 14 | ≤ 10 |
| Grafikzeit je Bild | ≤ 2,5 ms | ≤ 3 ms | ≤ 3 ms |
| Speicher | ≤ 30 MB | ≤ 30 MB | ≤ 15 MB |

- Heute kostet der Rasen im Garten bis ~240 000 Dreiecke als Bildkarten mit viel Überzeichnen; die Vorlage ersetzt ihn dort und soll
  höchstens gleich viel kosten.
- Keine neuen Shader-Programme während des Spiels (alle beim Laden), höchstens 16 Texturen je Programm (die Karte der Flächenart kommt als
  Ebene in die vorhandene Detail-Texturliste `DETAIL`, kein neuer Platz), die Ruhebilder bleiben.
- Regelt selbst nach: wird ein Bild zu langsam, nimmt die Vorlage zuerst ihre Dichte zurück, bevor es ruckelt. Im Grafikmenü
  „Bewuchs: voll / einfach / aus“; zum Vergleichen `?nobewuchs`.

## 5. Stufen (jede geht einzeln live, nach Prüfung)

1. **Rasen und Gras in 3D – die Vorlage.** Halme in drei Ringen, Struktur im Boden, Wind, Niedertreten, Jahreszeit, Budget je Gerät;
   **Falkos Garten** auf der Vorlage (Mähen, Speicherstand und die Aufgabe „Rasen mähen“ bleiben, wie sie sind); **Ratschers 2,4-km-Quadrat**
   mit Karte der Flächenart (Gärten, Anger, Wiesen, Weiden, Bankette). Prüfung: Bilder Garten, Anger, Wiese im Mai, Juli, Oktober, Januar;
   Mähen; Zählungen und Grafikzeit am Gartentor, an Huberts Hof, am Anger; Telefon.
2. **Wiesen und Wildblumen.** Mähkalender (Heuschnitt als Flickenteppich), ~20 Arten mit Blütezeit, Farbtupfen in der Ferne, Säume,
   Ackerränder; Ratscher und die Strecken nach Schleusingen und Kloster Veßra.
3. **Büsche und Beeren.** ~16 Arten, Blüte, Beeren und Laub nach Monat, fest ab ~1 m; in Ratscher nach dem Höhenmodell (die Büsche, die dort
   wirklich stehen), sonst nach Luftbild und Regeln.
4. **Gestaltete Flächen.** Vorgärten und Hausgärten im Dorf (die Beete der Dorfleute echt bepflanzt), Anger, Kirche, Friedhof;
   Schleusingen: Markt, Burg, Schulen, Kreisel, Verkehrsinseln, Mittelstreifen, Parkplätze der Läden, Kübel.
5. **Die ganze Welt.** Alle Welt-Kacheln, Kloster Veßra, die Orte von welt-orte, Waldboden (mit welt-wald); Suhl über den Suhl-Chat; falls
   gewünscht Äcker mit Feldfrüchten nach Monat (Entscheidung 2).

## 6. Wer (Abstimmung im Repo in `docs/PARALLEL.md`)

- **Straßen-Chat** (dieser): das Thema „Bewuchs“ – Rasen, Gras, Wildblumen, Sträucher, Beete; neue Ordner `viz3/src/bewuchs/`,
  `tools/bewuchs/`, `viz3/extra/bewuchs/`, Test `viz3/test/bewuchs.py`; Branch `feat/bewuchs` → `kern/bewuchs` → `src`. Kein anderer Chat
  hat Rasen, Gras, Blumen, Büsche oder Beete (PARALLEL, 17.11. 20:30).
- **stadtgruen** (Schleusingen, dann Ratscher): Straßenbäume, Alleen, Hecken und die Bäume der Grünstreifen bleiben dort; der Boden darunter
  (Rasen der Grünstreifen, Baumscheiben, Beete) kommt von hier; keine Büsche näher als 1,5 m an ihren Hecken und Stämmen.
- **welt-wald** (Wald und Bäume der Region): Bäume, Gehölze, Baumreihen und der Waldmantel mit Sträuchern am Waldrand bleiben dort; die
  Krautschicht im Wald (Farne, Heidelbeeren, Moos, Lichtungen) käme von hier, auf ihren Waldflächen – Vorschlag, Rückmeldung erbeten.
- **welt-orte** (flache Orte in 3D): ihre Gebäude sind Sperrflächen; Vorgärten und Gärten an ihren Häusern kommen von hier.
- **Suhl-Chat:** die Stadt Suhl bleibt dort; die Vorlage steht ihnen offen (die Grünflächen von `suhl-gruen` als Flächen mit Flächenart);
  ihr Haken W5 in `welt/welt.js` bleibt unberührt.
- **Grenzland-Chat:** Blumenkästen an Fenstern gehören zu den Fassaden (`FASSADE`); die Pflanzen gibt es von hier, wenn gewünscht.
- **Geteilte Dateien** nur über markierte Haken `// feat/bewuchs`, vorher hier mit Diff angekündigt: `garden/grass.js` (die alten Büschel
  aus, wenn die Vorlage läuft; `GRASS.cut/grow/bare/cutSave/cutLoad/cutArea/cutCount`, `GRASS.wxSway` und `GRASS.meshes` bleiben die
  Schnittstelle für Mähen, Draufsicht und Zukunft), `world/roads.js` (`landDetail`), `welt/welt.js` (Bodenfarbe), `garden/env.js`
  (Boden im Garten), `dorf/dorf_life.js` (`beds()`).

## 7. Entscheidungen (offen – Falko)

1. **Anfang:** Stufe 1 (Rasen und Gras, Garten und Ratscher) – Empfehlung; sonst Wiesen und Blumen zuerst.
2. **Äcker:** Weizen, Gerste, Raps, Mais nach Monat, Stoppeln, Furchen – ein großer Teil der heute flachen Fläche; Empfehlung: ja, als
   letzter Schritt von Stufe 5.
3. **Tempo:** Stufe für Stufe in diesem Chat, oder mit Hilfs-Agenten parallel (Vorlage, Daten, Pflanzenmodelle) – schneller, aber mehr
   Abstimmung und Kosten.
4. Büsche ab ~1 m fest (wie Stämme), darunter durchgehbar – so geplant.

## 8. Technik im Detail (für die Umsetzung)

- **Module** (je eine Zeile unter `# feat/bewuchs` in `modules.txt`): `bewuchs/bw_phaeno.js` (rein: Kalender, Wachstum, Mähen, Blüte,
  Beeren je Art und Tag; Unit-Tests), `bw_karte.js` (Zellen laden und freigeben, die feine Gartenkarte, die Leitkarte um den Spieler),
  `bw_halm.js` (Ringe, Material, Wind, Spur), `bw_blume.js`, `bw_strauch.js`, `bw_beet.js`, `bewuchs.js` (`BEWUCHS`: an/aus, Stufe nach
  Gerät, Zählungen, Test-Haken, die Brücke zu `GRASS`).
- **Halme:** eine Kachel-Geometrie (1 m², K Halme: nah ~192, mittel ~48) als Instanzen, Instanz = Ursprung der Kachel; im Vertex-Shader aus
  einem Hash der Weltposition Versatz, Höhe, Biegung und Farbton; Halme über der Dichte der Flächenart fallen auf einen Punkt zusammen
  (nichts zu rastern). Die CPU füllt nur die Liste der Kacheln im Sichtkegel (nah → fern), beim Gehen schrittweise.
- **Leitkarte um den Spieler** (256²–512² Punkte): Flächenart, Mäh- und Spurstand, Höhe aus `KERN.terrain`; die Luftbildfarbe aus den
  vorhandenen Bodentexturen (Ratschers Bildkästen `GEOGU`, die Welt-Kacheln, die nahe Gartentextur) – neu gezeichnet, wenn man ~12 m weiter
  ist oder eine Kachel nachkommt (Bruchteil einer Millisekunde).
- **Farbe** = Luftbild an der Wurzel durch dieselbe Farbkorrektur wie der Boden (`landDetail`: Dunst, gedämpfte helle Felder, ×0,8) × die
  Halmfarbe nach Art und Jahreszeit → kein sichtbarer Rand, wo die Halme enden.
- **`GRASS` bleibt die Schnittstelle** (`cut`, `grow`, `bare`, `cutSave`, `cutLoad`, `cutArea`, `cutCount`, `wxSway`, `meshes`): Mähen,
  Speicherstand, Aufgabe, Mähen aus der Draufsicht (`strategie/st_welt.js`) und die Zukunft (`zukunft/zk_welt.js`) laufen weiter.
- **Tests:** `viz3/test/bewuchs.py` (Abschnitte rasen, maehen, wiese, blumen, strauch, beet, jahreszeit, leistung, telefon), Unit-Tests für
  Kalender und Platzierung, `viz3/extra/bewuchs/tests.txt` (smoke, bewuchs, garage, leistung, memphone); `viz3/test/leistung.py` vorher und
  nachher.
