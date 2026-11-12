# Zukünfte erproben – wie die Zukünfte in der Welt aussehen (feat/zukunft-welt)

Hilfs-Agent `zukunft-welt` (12.11.2026, Auftrag `docs/plans/auftraege/zukunft-welt.md`), neben `zukunft` (Daten, Fenster, Kennzahlen).
Falko: „es muss möglichst realistisch werden“ – lieber wenige Zukünfte, die echt aussehen, als viele, die nach Spiel aussehen. Alles in
`viz3/src/zukunft/zk_welt.js` (`ZKWELT`); die Schnittstelle zu `zk_modus.js` (warm, apply, clear, ctx) ist unverändert.

## Was es gibt

- **Solarmodule auf den Dächern** (Variante „Dach“): die Dachflächen der 3D-Gebäude von Ratscher (Dorfhäuser `world/village.js`, Gebäude
  aus ETHOS.BUILDA `gebaeude/`), aus ihren Dachdreiecken zu Ebenen zusammengesetzt (gleiche Ebene, gleiches Dach, auch über T-Stöße).
  Nur Flächen von Ostsüdost bis West (110–275°) mit 10–60° Neigung; Flachdächer mit aufgeständerten Reihen (12° nach Süden, 1,9 m Abstand).
  Module 1,72 × 1,13 m (108 Halbzellen, 440 Wp, Rahmen 35 mm) hochkant, 2 cm Fugen, 40 cm Abstand zu Traufe, Ortgang und First, 30 cm um
  Schornsteine, mindestens sechs je Fläche, der Block in der Reihe mittig, 10 cm über den Ziegeln; Rahmen je Anlage silbern oder schwarz.
  Der Anteil der Variante füllt ganze Gebäude (Reihenfolge nach einem Zufallswert je Haus). Ausgenommen: die alte Schule mit Türmchen und
  das Haus mit Gauben am Anger (Anger 18).
- **Solarpark** (Variante „Park“): auf dem Feld südlich des Dorfs innerhalb der Umgehung (Luftbild 2024: ein grünes Feld, keine Bäume,
  Wege, Gebäude oder Wasser darauf), 1,5 ha Zaunfläche, 115 Tische à 2 × 12 Modulen hochkant, 22° nach Süden, Unterkante 0,8 m,
  Oberkante 2,1 m, Reihen 6,4 m auseinander (3,2 m frei), Rammpfosten mit Streben, die Tische dem Gelände nach; 2,2 m Maschendrahtzaun
  (das Geflecht des Gartens, `garden/fences.js`) mit Pfosten alle 3 m, Spanndrähten und Stacheldraht, ein Tor, eine Kompaktstation aus
  Beton mit Kabelschrank. ≈ 1,2 MWp. Weiche Schatten unter und hinter den Tischen (die Schatten der Autos, `dinge/dinge_modelle.js`).
- **Wärmepumpen** (Variante „Wärme“): Außengeräte (1,1 × 0,95 × 0,45 m, Lüftergitter) auf einer kleinen Platte an einer Giebelwand von
  Wohnhäusern, wo davor Platz ist.
- **Mobilität:** die Mitfahrbank (der Bau des Ortsvorsteher-Spiels, `amt/amt_world.js`), ein Rufbus-Schild an jeder echten Haltestelle von
  Ratscher (die Schilder des Fahrplans, `bus/bus.js` `BUS.STOPS()`), ein weißer Kleinbus (der Transporter von welt-dinge) wartet am Anger.
- **Hochwasser der Schleuse** (Variante „Hochwasser“): der Fluss vom Auslauf der Talsperre Ratscher bis hinter das Dorf (Linie aus der
  OpenStreetMap-Karte der App nachgezogen); die Wasserfläche fällt mit dem Talboden, steht nur dort, wo das gezeichnete Gelände tiefer
  liegt (die Tiefenprüfung schneidet das Ufer), und nur, wo sie mit dem Fluss verbunden ist. Wasserstand über dem Talboden =
  Pegelanstieg − 0,9 m (Annahme: so viel fasst das Bett, das das 10-m-Gelände glättet): 1,8 m wie im Dezember 2023 → etwa 0,9 m über den
  Wiesen. Braunes, bewegtes Wasser (das Programm des Bachs), am Ufer ein weicher Saum aus nassem Schlamm und Treibgut (Zweige, Stroh).
- **Starkregen und Dürre:** Wetter (`WETTER.preset`), nasser bzw. trockener Boden (`WXBODEN`), der Bach im Garten höher bzw. niedriger.
- **Wald nach dem Käfer** (Klinge, `world/forest.js`): die Fichten nach der Kurve von `ZKDATA` erst rotbraun, dann grau mit lichterer
  Krone; danach geräumt (Stubben, Reisighaufen) – beim Waldumbau überall, bei natürlicher Verjüngung außerhalb des Familienwalds; im
  Familienwald bleiben sie bei „Natur“ einige Jahre stehen und liegen dann. Junge Bäume nach Art: Naturverjüngung Fichte, Birke, Eberesche,
  Buche; Waldumbau Buche, Tanne, Eiche, Ahorn (im Familienwald in Gruppen gepflanzt, Eiche, Tanne und Ahorn die ersten acht Jahre in
  Wuchshüllen), Höhe nach Alter (Kurven von `ZKDATA`), Laubfarbe nach Jahreszeit des Spieltags.

## Grenzen (ehrlich)

- Kein neues Gelände: die geräumte Fläche zeigt weiter den Boden der Klinge (das Luftbild darunter zeigt Kronen); die jungen Bäume sind
  einfache Formen und wirken von Nahem schlichter als die Fichten.
- Das Hochwasser ist kein Abflussmodell: ein Wasserstand über dem Talboden, verbunden mit dem Fluss; die Hochwassergefahrenkarte des
  Landes war vom Chat-Rechner nicht erreichbar.
- „Mehr Fahrten“ (Takt) zeigt nichts in der Welt (die Busse fahren nach dem echten Fahrplan).

## Kosten

Instanziert, Material von welt-dinge (dessen zwei Programme beim Laden übersetzt werden), das Wasserprogramm des Bachs, die Schatten der
Autos, der Maschendraht des Gartens: beim Start des Modus ein neues Programm (der weiche Schlammsaum), danach keines mehr. Kein Licht,
keine Schatten werfenden Meshes, alles wird beim Beenden zurückgenommen.

## Testen

`bash tools/browser_lock.sh python3 viz3/test/run.py --port 9008 --serve zukunft_welt` (Abschnitte
`start,pv,park,mobil,wasser,wald,budget,ende,telefon`); Bilder in `out/zukunft_welt/` (je Thema vorher/nachher, zu Fuß und aus 60 m).
Auf GitHub über `viz3/extra/zukunft-welt/tests.txt` (dazu `zukunft` und `strategie`).

## Für den Lead

- Gemeinsame Dateien: keine geändert (gelesen: `RATSCHER.bld`, `VILLAGE.bld/parts`, `DKDATA.houses`, `BUS.STOPS()`, `AMTWORLD`, `FOREST`,
  `DMOD`, `FENCE_MAT`, `WETTER`, `WXBODEN`, das Wassermaterial des Bachs).
- Quellen: die Flusslinie aus OpenStreetMap (ODbL, schon in den Credits); Maße nach Herstellerdaten üblicher Module (1722 × 1134 mm,
  108 Halbzellen) und Freiflächenanlagen.
