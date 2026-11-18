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

`viz3/test/bewuchs.py` (Abschnitte rasen, wiese, ferne, jahr, maehen, leistung): Artentabelle und Atlas geladen, Ringe und Kacheln im
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
- Stufe 3 (Büsche und Beeren), 4 (gestaltete Flächen), 5 (die ganze Welt, Äcker) – `docs/plans/plan_bewuchs.md`.
