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
- **Solarpark** (Variante „Park“): auf dem Feld **südlich** des Dorfs innerhalb der Umgehung (Luftbild 2024: ein grünes Feld, keine
  Bäume, Wege, Gebäude oder Wasser darauf; vom Anger aus Richtung 170°, also nicht „südwestlich“), 1,71 ha Zaunfläche, 144 Tische à
  2 × 12 Modulen hochkant, 22° nach Süden, Unterkante 0,8 m, Oberkante 2,1 m, Reihen 5,9 m auseinander (2,7 m frei), Rammpfosten mit
  Streben, die Tische dem Gelände nach; 2,2 m Maschendrahtzaun (das Geflecht des Gartens, `garden/fences.js`) mit Pfosten alle 3 m,
  Spanndrähten und Stacheldraht, ein Tor, eine Kompaktstation aus Beton mit Kabelschrank, ein Schotterweg zum Hofweg. ≈ 1,5 MWp
  (0,9 MWp/ha). Dunkles Glas mit dem Himmel darin, weiche Schatten unter und hinter den Tischen (die Schatten der Autos,
  `dinge/dinge_modelle.js`). Die Kennzahlen lesen Fläche und Leistung aus der Welt (`ZKWELT.ctx()`).
- **Wärmepumpen** (Variante „Wärme“): Außengeräte (1,1 × 0,95 × 0,45 m, Lüftergitter) auf einer kleinen Platte an einer Giebelwand von
  Wohnhäusern, wo davor Platz ist.
- **Mobilität:** die Mitfahrbank im Ort (der Bau des Ortsvorsteher-Spiels, `amt/amt_world.js`, am Anger); das Rufbus-Schild an der
  Haltestelle am alten Schulhaus (die Schilder des Fahrplans, `bus/bus.js`), dort wartet ein weißer Kleinbus mit Seitenfenstern und
  grünem Band (der Transporter von welt-dinge) – nur wenn der Rufbus fährt: werktags ab 20:45 (nach dem letzten Bus), samstags ab 13 Uhr,
  sonntags ab 8 Uhr (Annahme wie in `zk_data.js`).
- **Hochwasser der Schleuse** (unterhalb der Talsperre Ratscher; Flusslinie aus der OpenStreetMap-Karte der App nachgezogen):
  - *Schwerer als 2023* (HQ100): die Fläche ist das **amtliche Überschwemmungsgebiet** (Geoproxy Thüringen, WMS „UESG“, © GDI-Th /
    TLUBN, dl-de/by-2-0, am 12.11.2026 abgerufen, als Maske aus 4-m-Zellen im Code). Es umfasst die Auen ab dem Damm und den größten Teil
    des Dorfs – das Wasser steht dort also mit Beleg. Der Wasserspiegel folgt den Höhen, an denen die Fläche endet (unteres Viertel), und
    fällt talab; im Bild stehen 37 Häuser des Dorfs im Wasser (zk_data rechnet mit 9 – bitte prüfen).
  - *Wie im Dezember 2023*: die Talsperre hielt etwa 900 000 m³ zurück; gezeigt wird die Schleuse randvoll und die tiefsten Wiesen bis
    35 m neben ihr innerhalb der amtlichen Fläche, so tief, dass höchstens so viele Häuser nass werden, wie die Variante annimmt (Annahme).
  - Der Fluss selbst als randvolles Band (~10 m; das 10-m-Gelände hat kein Bett). Trübes braungrünes Wasser mit Spiegelung (Fresnel) und
    bewegten Wellen (das Programm des Bachs, `garden/stream.js`), ein weicher Saum aus nassem Schlamm am Ufer, Treibgut (Zweige, Stroh,
    Treibholz).
- **Starkregen und Dürre:** Wetter (`WETTER.preset`), nasser bzw. trockener Boden (`WXBODEN`), der Bach im Garten höher bzw. niedriger.
- **Wald nach dem Käfer** (Familienwald an der Unteren Klinge und der Bestand drumherum, `world/forest.js`): in beiden Varianten
  dasselbe Sterben nach der Kurve von `ZKDATA` (2030 schon zu sehen) – die Fichten erst rotbraun, dann grau mit lichterer Krone, das
  Kronendach geht auf (das Licht kommt auf den Boden, die Nadelstreu bleibt; Haken `FOREST.canopy`). Danach: beim Waldumbau geräumt
  (Stubben, Reisighaufen) und im Familienwald in Gruppen gepflanzt (Buche, Tanne, Eiche, Ahorn; Eiche, Tanne und Ahorn die ersten acht
  Jahre in Wuchshüllen); bei natürlicher Verjüngung im Familienwald stehen die toten Bäume erst, liegen dann, und Birke, Eberesche, Fichte
  und Buche kommen dichter und ungleichmäßig. Höhen nach Wuchs junger Bäume (Annahme nach Ertragstafeln: gepflanzte Buche/Eiche etwa
  4–5 m nach 15, 10–13 m nach 30 Jahren; Pioniere schneller, Tanne langsamer). Junge Laubbäume über 2,5 m sind die echten Baumarten des
  Gartens (`garden/trees.js`: Eiche, Esche, Espe – mit Rinde und Blattkarten, Laubfarbe nach Jahreszeit: Buche und Eiche behalten im
  Winter trockenes Laub), junge Nadelbäume über 2,5 m wieder die Bäume des Waldmodells; darunter einfache Formen.

## Grenzen (ehrlich)

- **Wald:** junge Laubbäume fern vom Familienwald (über 1 400 echte Bäume hinaus) und alle unter 2,5 m sind einfache Formen; der Boden
  der geräumten Fläche bleibt Nadelstreu (kein Gras, keine Brombeeren); Buche und Ahorn haben die Form von Eiche bzw. Esche.
- **Hochwasser:** kein Abflussmodell; keine nasse Linie an Wänden und Stämmen, keine Schaumstreifen.
- **Dürre:** `WXBODEN.setDry` (Haken von `zukunft` in `wetter/wx_boden.js`) mischt die Farbe der Bodenbilder mit Stroh – das macht grüne
  Felder nur dunkler, nicht gelb. Ein Faktor über 1 im Rot (etwa `DRYC` = 1,7 / 1,15 / 0,75 multiplikativ) wäre nötig.
- „Mehr Fahrten“ (Takt) zeigt nichts in der Welt (die Busse fahren nach dem echten Fahrplan).

## Kosten

Instanziert, im Material von welt-dinge (dessen Programme beim Laden übersetzt werden), das Wasserprogramm des Bachs, die Schatten der
Autos, der Maschendraht des Gartens. `ZKWELT.warm()` beim Start des Modus übersetzt zwei Programme (der weiche Schlammsaum, das Schild)
und gibt den Fernkarten des Walds ihre Instanzfarben. Danach übersetzen die Zukünfte nichts mehr (Test: alle Themen, Varianten und Jahre
an schon besuchten Orten: 0 neue Programme). Was ein Test sonst an neuen Programmen sieht, kommt von der Welt selbst, wenn die Kamera
zum ersten Mal an einen Ort kommt (Bäume, Figuren, glTF-Modelle). Eigene Draw-Calls: Dächer 3, Park 8, Wald bis 10; Dreiecke bis
~0,7 Mio. für einen ganzen Wald im Bild, am Telefon weniger Bäume und Stubben.

## Testen

`bash tools/browser_lock.sh python3 viz3/test/run.py --port 9008 --serve zukunft_welt` (Abschnitte
`start,pv,park,mobil,wasser,wald,budget,ende,telefon`); Bilder in `out/zukunft_welt/` (je Thema vorher/nachher, zu Fuß und aus 60 m).
Auf GitHub über `viz3/extra/zukunft-welt/tests.txt` (dazu `zukunft` und `strategie`).

## Für den Lead

- Gemeinsame Dateien: `viz3/src/world/forest.js` – `S.canopy` (save, reset, open, upload; markiert `feat/zukunft-welt`): das Kronendach
  für eine Zukunft öffnen und zurück. Sonst nichts geändert (gelesen: `RATSCHER.bld`, `VILLAGE.bld/parts`, `DKDATA.houses`, `BUS.STOPS()`, `AMTWORLD`, `FOREST`,
  `DMOD`, `FENCE_MAT`, `WETTER`, `WXBODEN`, das Wassermaterial des Bachs).
- Quellen: `viz3/extra/zukunft-welt/manifest.json` (`credits_add`: Überschwemmungsgebiet © GDI-Th / TLUBN, dl-de/by-2-0; Flusslinie
  OpenStreetMap, ODbL); Maße nach Herstellerdaten üblicher Module (1722 × 1134 mm, 108 Halbzellen) und Freiflächenanlagen.
