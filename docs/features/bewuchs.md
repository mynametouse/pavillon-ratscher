# Bewuchs in 3D: Rasen, Gras und Wildblumen – die Vorlage (`bewuchs`)

Straßen-Chat session_01WqScFDtq8GSy4n7wU7foJx mit Falko, 17.11.2026, Branch `feat/bewuchs`. Plan: `docs/plans/plan_bewuchs.md`
(Projektdokument `claude/pavillon-bewuchs.md`). Hilfs-Agenten: `bewuchs-daten` (wo was wächst, `docs/features/bewuchs-daten.md`),
`bewuchs-pflanzen` (Gräser, Wildblumen, ihr Jahr, der Blumenatlas, `docs/features/bewuchs-pflanzen.md`).

Falko (17.11. 20:19): „… das Gras ist noch 2D, komplett flach … was fehlt, sind sowas wie Büsche mit Beeren, Gräser, Blumen und was so
üblicherweise dort wächst auf Wiesen … normaler Rasen … sehr kurz bei entsprechenden Stellen … Plastizität … in der kompletten Welt …
wobei es trotzdem im Browser weiterhin flüssig laufen können soll.“ Gewählt (21:30): Rasen und Gras **und** Wiesen und Wildblumen zugleich,
Äcker als letzter Schritt, zwei Hilfs-Agenten.

## Was es gibt (Stufe 1 + 2)

- **Halme in drei Ringen um die Kamera** (`bewuchs/bw_halm.js`, `BWHALM`): dicht (bis 6 m, 480 Halme je m²-Kachel), nah (bis 14 m,
  160 je Kachel), weiter (bis 40 m, Kacheln von 2 m, 64 einfache Halme, nur wo das Gras hoch genug steht). Ein Halm sind drei Dreiecke
  (nah) oder eines (weiter); die Halme wachsen in **Horsten** (um eine Mitte, nach außen geneigt), das Muster jeder Kachel ist nach ihrem
  Zufallswert gedreht und gespiegelt (kein Raster sichtbar). Die Ringe kommen und gehen durch Ausdünnen, der äußerste sinkt am Ende in
  den Boden – nichts springt.
- **Alles rechnet der Grafikprozessor** je Halm an seiner Wurzel: die Art der Fläche und ihre Kraft (Karten von `BWKARTE`), die Höhe
  heute (gewachsen seit dem letzten Schnitt dieses Feldes – jedes Feld an seinem eigenen Tag), das Mähen im Garten (das Mähraster von
  `GRASS` als Textur: gemähte Zellen kurz und mit dem Streifen des Mähers), das Luftbild (kein Halm, wo es nicht grün ist: Wege, kahler
  Boden, Dächer; die Farbe ein wenig zum Bild hin), der Wind (`WXWIND`, dieselben Wellen wie der alte Rasen), die Entfernung. Der
  Hauptprozessor listet nur die Kacheln im Blick (nächste zuerst) und ihre Eckhöhen (`KERN.ground`, auf einem Gitter zwischengespeichert),
  wenn sich die Kamera bewegt oder dreht.
- **Das Jahr** (`bewuchs/bw_phaeno.js`, `BWPHAENO`, rein, Unit-Tests): je Flächenart Höhe nach Schnitt und ungeschnitten, Wachstum je
  Monat, Mähen (Zierrasen wöchentlich April–Oktober, öffentliches Grün alle drei bis vier Wochen, Bankett im Juni und September, Heuwiese
  Anfang Juni und im August, je Feld ± einige Tage), Farben (frisch, Sommer, trocken, Herbst, Winter), Samenstände im Juni.
  **Falkos eigener Rasen** (Klasse 18) wird von niemandem gemäht als vom Spieler: er wächst bis an die Knöchel, der Mäher macht ihn kurz.
- **Wildblumen** (`bewuchs/bw_blume.js`, `BWBLUME`) auf denselben Kacheln: je Kachel Plätze für kleine Pflanzen aus zwei gekreuzten
  Bildern des Blumenatlas von `bewuchs-pflanzen` (`dist/bewuchs/blumen.png`, 64 Zellen; Kartenhöhe = Pflanzenhöhe / `oben`, Breite nur so
  weit, wie die Zeichnung reicht – `blumen.json`); die Art aus der Mischung der Fläche (bis 12 je Flächenart nach Pflanzen je m²:
  Gänseblümchen, Weißklee, Löwenzahn im Rasen; Hahnenfuß, Margerite, Rotklee, Wiesen-Schaumkraut, Pippau, Glockenblume … in der Heuwiese;
  Mohn, Kamille, Kornblume am Ackerrand; Heidelbeere und Farn am Waldboden …). **Jede Pflanze ihr eigenes Jahr:** vier Gruppen je Art,
  um ¾ und ¼ ihrer Streuung früher oder später als die Tabelle – so blühen in einer Wiese manche noch, andere sind schon Pusteblume;
  Anteile je Phase (die übrigen zeigen ihre Blätter), Wuchs je Monat. **Nach dem Schnitt** (dasselbe Feld wie die Halme): einige Tage
  nichts, dann Blätter, nach `nach_schnitt_tage` blüht sie wieder (wenn ihre Zeit es zulässt, ~60 % so lange) – Gänseblümchen drei Tage
  nach dem Rasenmähen, Margeriten sechs Wochen nach dem Heuschnitt.
- **Die Flächenarten** aus der Artentabelle von `bewuchs-pflanzen` (`bewuchs/bw_arten.js`, `BWARTEN.flaechen`, über
  `BWPHAENO.fromArten`): Höhen, Wachstum je Monat, Pflege (Rasen alle n Tage je Monat, Schnitttage je Feld mit Anteilen, Weide), Gräser
  (Breite, Biegung, Farben der Jahreszeiten, Samenstände), **Wuchskraft** (Bits 5–7 der Karte: magere Stellen dünner und niedriger, mit
  mehr Blumen; fette dicht) und **Kahlstellen** (Anteil und Größe je Flächenart: im Rasen selten und klein, am Waldboden die Hälfte).
- **Was wo wächst** (`bewuchs/bw_karte.js`, `BWKARTE`): die Karten des Hilfs-Agenten `bewuchs-daten` (je 400-m-Zelle ein 8-Bit-PNG,
  Klasse + Kraft), nahe der Kamera geladen und weit weg freigegeben; daraus zwei Texturen für die Halme – die Leitkarte (512² zu 0,5 m
  um die Kamera) und das Grundstück (0,25 m über Garten und Nachbarn, mit dem, was die Laufzeit besser weiß: kein Gras im Pavillon-Quadrat,
  im Graben des Bachs, auf Brücke und Terrasse, in den Grundrissen der Gebäude – auch verschoben in der Planansicht –, auf abgetretenen
  Stellen, ab Bauphase 1 auf den Kieswegen). Ohne Karten: Regeln (Garten Rasen, Rest des Grundstücks Wiese, sonst öffentliches Grün).
- **Garten:** die alten Rasenbüschel und die drei Wiesenblumen von `garden/grass.js` werden nicht mehr gebaut (markierter Haken
  `feat/bewuchs`); `GRASS.cut/grow/cutSave/cutLoad/cutArea/bare` bleiben die Schnittstelle (Mäher, Aufgabe „Rasen mähen“, Mähen aus der
  Draufsicht, Speicherstand), `GRASS.cutCount` zählt die Zellen des Mährasters; ein leeres Büschel-Mesh bleibt für `zukunft/zk_welt.js`.
  Die Büschel an Sockeln, Stämmen und Bach, die Farne und der Löwenzahn von `buildDetailPlants` bleiben.
- **Menü → Einstellungen → Grafik → „Gras und Blumen“:** voll – einfach (eine Stufe leichter und dünner) – aus; gespeichert als
  `pav-bewuchs-v1`. `?nobewuchs` schaltet alles ab (der alte Rasen kommt zurück).

- **Grasähren** (Stufe 2b, `BWBLUME`): die Ähren und Rispen der Gräser aus der untersten Zeile des Blumenatlas, als eigene „Arten“ in den
  Mischungen der Flächen (Anteil des Grases × Anteil der Büschel mit Ähre); grün in der Blüte (`aehre.von`–`bis`), strohfarben reif (bis
  `reif_bis`), je Gras getönt (seine Farbe über der Zellfarbe – die Zellen sind hell und neutral gezeichnet); nur der obere Teil der Karte
  steht über den Blättern; nach dem Schnitt weg.
- **Sträucher** (Stufe 3, `bewuchs/bw_strauch.js`, `BWSTRAUCH`, erste Fassung): je Kartenzelle einmal gesetzt nach den Plänen der Flächen
  (`BWARTEN.flaechen[k].straeucher`: Sträucher je 100 m², verteilt flächig, in Gruppen, einzeln oder am Rand), nie auf dem modellierten
  Grundstück; die Arten (`BWARTEN.straeucher`) als EZ-Tree-Sträucher (Preset, Seed, Optionspfade der Tabelle), gebaut eine je Bild, sobald
  sie in die Nähe kommen; je Art zwei Bänder (nah die volle Rinde und Krone, weiter die ausgedünnten); das Laub nach Monat über die
  Instanzfarbe (Austrieb, grün, Herbstfarbe, fallend, kahl – dann ohne Krone; immergrün und trockenes Laub der Hainbuchenhecke bleiben);
  Blüten und Beeren als Punkte auf den Blattkarten bis 70 m (vor dem Laub und im Winter an den Zweigen). Reichweite nach Grafikstufe (150 /
  110 / 70 m, höchstens 1600 / 1000 / 450 Sträucher), ausgeblendet ab 160 m über dem Boden unter der Kamera. **Fest ab 1 m** (seit V19b):
  je Zelle die Sträucher ab 1 m in einem 4-m-Raster (Kreis 0,55 des Kronenradius – die äußeren Zweige geben nach); `KERN.pushOut`
  (Anbieter mit Vorrang 20, gibt die Frage weiter, damit Wände und Stämme danach kommen) schiebt Körper zu Fuß (Radius bis 0,5 m: Figur,
  Hund, Tiere, Leute zu Fuß) heraus, Fahrzeuge (ab 0,85 m) fahren wie bisher hindurch; im Kasten des Gartens (|x| ≤ 50, |y| ≤ 55 m, dort
  fragt `game/walkable.js` nur die eigenen Hindernisse) stehen keine. Noch offen: eigene Hüllen für Buchs, Thuja und Hecken, Schatten nah.
- **Die ganze Welt** (Teile b und c von `bewuchs-daten`): die Strecken nach Schleusingen und Kloster Veßra und beide Orte, die Welt-Kacheln
  (Block B, Veßra) und die flachen Orte – 895 Zellen im Index (28 MB, je 4 × 4 Zellen unter 1,5 MB); geladen wird nur, was um die Kamera liegt.

- **Beete** (Stufe 4, `BWBLUME`): die Beetpflanzen (`BWARTEN.beet`, 44) als Arten eines zweiten Atlas (`beete.png`, in einer Leinwand
  von 8 × 16 Zellen mit den Wildblumen – ein Material); die Beetklassen 13–16 nach ihren Vorlagen (`BWARTEN.beetvorlagen`: Wechselflor,
  Kübel, Stauden, Rosen, Bauerngarten, Kiesbeet, Grab, Verkehrsinsel, Kreisel, Gemüsegarten) – ein Beet eine Vorlage (nach der Stelle,
  ~3 m), ihre Pflanzen der heutigen Phase; die Beetflächen setzt `bewuchs-daten` (Teil e: Vorgärten, Gemüse hinter dem Haus,
  Kleingärten, Kreisel, Inseln, Mittelstreifen, Parkplatzgrün, Friedhof).
- **Äcker** (Stufe 5a, `BWPHAENO` Zeilen 23–30, `BWHALM`): die Fruchtklassen der Karten (19 Wintergetreide, 20 Raps, 21 Mais/Hackfrucht,
  22 Kleegras; 9 unklar – Teil d von `bewuchs-daten`, aus den Luftbildern je Feld) wählen je Feld (~140 m, gewellte Ränder) eine Frucht
  nach den Anteilen (`BWARTEN.feldfruechte`, Landkreis Hildburghausen); ihre Zeile der Tabelle hat die Höhe heute (in der Phase
  gewachsen), Farbe, Deckung, Halm (Mais breit, Getreide schmal), Ähren; geerntet Feld für Feld über die Erntetage, Stoppel bis zum
  Pflug, Winterungen im Herbst neu gesät.
- **Die Pflanzen der Früchte** (Stufe 5b, seit V19b, `BWBLUME`): der Ackeratlas von `bewuchs-pflanzen` (`acker.png`, 37 Zellen) als
  drittes Bild der Leinwand (8 × 24 Zellen; am Telefon in der Texturstufe der übrigen Bilder, `TEXHALF`); jede Frucht eine Art
  `acker:<id>` mit einem Bild je Phase (`bilder` oder die Ähren `kopf.zellen`) – Mais jung, Streckung, Fahne, Kolben, reif, trocken;
  Kartoffel jung, Kraut, Blüte, welk, krautfrei; Raps Rosette, Knospe, Blüte, Schoten, reif; Kleegras in der Blüte; die Ähren von Weizen,
  Gerste und Triticale –, so hoch wie die Frucht heute (`BWPHAENO.cropNow`); in den Erntetagen das Bild der Phase davor, bis ihr Feld
  geschnitten ist (dieselben Felder wie die Halme), danach beim Mais die Stoppeln, sonst nichts. Der Blumen-Shader wählt die Frucht des
  Felds wie die Halme (`BWHALM.cropGlsl`: ein Text für beide); Pflanzen je m² aus k3.z der Fruchtzeile (Mais 9, Kartoffel 4, Raps 12,
  Kleegras 6, Getreide 4 Ähren – gedeckelt durch die Plätze der Kacheln), Mais und Kartoffeln in Reihen (k6.w: 75 cm, je Feld eine
  Richtung aus seinem Hash). Aus der Ferne bleibt die Farbe des Felds die des Luftbilds (keine Fernblüte für Früchte).

## Flüssig

- Je Ring ein Zeichenaufruf für die Halme und einer für die Blumen (zusammen 5), die Programme beim Laden übersetzt (keine neuen im
  Spiel), höchstens 6 Texturen im Vertex-Shader, im Fragment-Shader wie die übrigen Pflanzen (`patchSV`). Die Blumen zeichnen nur die
  Kacheln bis zu ihrem Rand (die Kacheln liegen nach Entfernung sortiert vor).
- Budget nach Grafikstufe (`render/render.js`; Telefone und Tablets die leichteste): hoch dicht 6 m / nah 14 m / weiter 40 m, mittel
  5 / 10 / 28 m, schnell 4 / 7 / 18 m. Gemessen im Test (Garten, Mai): hoch ~206 000 Dreiecke (der alte Rasen: bis ~240 000 als
  Bildkarten), mittel ~104 000, schnell ~51 000.
- Wirft keinen Schatten in die Sonnenkarte, empfängt ihn; bei Windstille kein zusätzliches Bild; von oben (Kamera höher als 30 / 70 m)
  nichts.

## Schnittstelle

`BEWUCHS.state()` (Stufe, Tag, Ringe, Karten, Blumen), `BEWUCHS.set({ mode, dens, tier, doy })`; `BWKARTE.codeAt(x, y)`,
`BWKARTE.siteDirty()`; `BWPHAENO.heightAt(k, doy, off)`; `BWHALM.stats()`; `BWBLUME.atlas(tex, cells)`.

## Tests

`viz3/test/bewuchs.py` (Abschnitte rasen, maehen, wiese, ferne, jahr, strauch, beet, acker, leistung; seit V19b auch: Sträucher fest für
die Figur, nicht für Fahrzeuge; der Atlas 8 × 24 Zellen, jede Frucht mit Bildern, Mais im August mit Kolben): Artentabelle und Atlas geladen, Ringe und Kacheln im
Garten und auf der Wiese, Budget je Stufe, Blumen im Rasen im Mai und in der Wiese im Juni, die Blüte in der Ferne, Mähen erreicht die
Halme, `GRASS.cutCount` aus dem Raster, keine Programme über 16 Texturen; Bilder in `out/bewuchs/`. Unit-Tests
`viz3/test/unit/bewuchs_phaeno.test.mjs` (auch mit der echten Artentabelle) und `bewuchs_arten.test.mjs` (die Daten des Hilfs-Agenten). Dazu `garage` (Mähen, Aufgabe, Speicherstand).

- **Blühende Wiesen in der Ferne** (`bewuchs/bw_ferne.js`, `BWFERNE`): wo keine 3D-Blumen mehr stehen (ab ~20 m), färben Punkte von
  ~0,4 m den Boden (weiter weg ihr Mittel) – ein Fenster von 1 km um die Kamera (512² zu 2 m), je Texel die Farbe einer Art, die dort
  heute blüht, und der Anteil des Bodens; gemähte Felder weniger. Haken in `world/roads.js` (`landDetail` ruft `bwFar`, markiert
  `feat/bewuchs`, angekündigt in `docs/PARALLEL.md` 17.11. 22:15).

## Offen

- Grasähren aus dem Atlas (getönt), Dürre- und Schattenfarbe der Flächen, der kiesige Bankettrand, Geilstellen der Weide; die
  Jahreszeit des Bodenbilds im Garten.
- Hüllen für Buchs, Thuja und geschnittene Hecken; Schatten der Sträucher nah; die Beete der Dorfleute (`dorf/dorf_life.js`, noch
  Erde mit Klötzchen) aus den Beetvorlagen; Fahrzeuge in Sträuchern (heute fahren sie hindurch); Waldboden außerhalb der Klinge (mit
  `welt-wald`), Suhl (über den Suhl-Chat).
