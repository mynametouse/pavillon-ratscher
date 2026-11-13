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
  Haltestelle am alten Schulhaus (die Schilder des Fahrplans, `bus/bus.js`; darauf „Mo–Fr ab 20.45 · Sa ab 13 · So“), dort wartet ein
  weißer Kleinbus mit Seitenfenstern und grünem Band (der Transporter von welt-dinge) – nur wenn der Rufbus fährt: werktags ab 20:45
  (nach dem letzten Bus), samstags ab 13 Uhr, sonntags ab 8 Uhr (Annahme wie in `zk_data.js`).
- **Hochwasser der Schleuse** (unterhalb der Talsperre Ratscher; Flusslinie aus der OpenStreetMap-Karte der App nachgezogen):
  - *Schwerer als 2023* (HQ100): die Fläche ist das **amtliche Überschwemmungsgebiet** (Geoproxy Thüringen, WMS „UESG“, © GDI-Th /
    TLUBN, dl-de/by-2-0, am 12.11.2026 abgerufen, als Maske aus 4-m-Zellen im Code). Es umfasst die Auen ab dem Damm und den größten Teil
    des Dorfs – das Wasser steht dort also mit Beleg. Der Wasserspiegel folgt den Höhen, an denen die Fläche endet (unteres Viertel), und
    fällt talab; im Bild stehen 37 Häuser des Dorfs im Wasser (so rechnet seit b3520cb1 auch `zk_data.js`).
  - *Wie im Dezember 2023*: die Talsperre hielt etwa 900 000 m³ zurück; gezeigt wird die Schleuse randvoll und die tiefsten Wiesen bis
    35 m neben ihr innerhalb der amtlichen Fläche, so tief, dass höchstens so viele Häuser nass werden, wie die Variante annimmt (Annahme).
  - Der Fluss selbst als randvolles Band (~10 m; das 10-m-Gelände hat kein Bett). Ocker- bis braungraues Lehmwasser (das Programm des
    Bachs, `garden/stream.js`), matt: der Himmel nur schwach darin, im flachen Blick etwas mehr, zum Betrachter hin dunkler; schwache
    Wellen, die talab wandern. Darauf wenig, weicher lehmfarbener Schaum, der mit der Strömung treibt (etwa 0,4 m/s), am Ufer und dort,
    wo das Wasser an Hauswände stößt. Am Ufer ein Saum aus nassem Schlamm mit vom Wasser flachgelegtem Gras
    (Streifen in Fließrichtung), Treibgut (Zweige, Stroh, Treibholz); an Häusern im Wasser die Wände dunkel und nass bis ~0,3 m über dem
    Wasser.
- **Starkregen und Dürre:** Wetter (`WETTER.preset`), nasser bzw. trockener Boden (`WXBODEN`), der Bach im Garten höher bzw. niedriger.
- **Wald nach dem Käfer** (Familienwald an der Unteren Klinge und der Bestand drumherum, `world/forest.js`): in beiden Varianten
  dasselbe Sterben nach der Kurve von `ZKDATA` (2030: 30 % der Fichten befallen). Der Käfer geht in Nestern vor (Nachbarn sterben
  zusammen); der Familienwald folgt derselben Kurve wie der ganze Bestand, mit Nestern von ~20 m (Annahme). Eine befallene Fichte wird
  erst fahl, dann für etwa ein Jahr rostrot-braun, dann wirft sie die Nadeln ab: graue, dünne Krone; etwa jede sechste tote Fichte wirft
  der Wind, bevor jemand räumt (beide Varianten). Das Kronendach geht auf (Licht auf dem Boden; Haken `FOREST.canopy`).
  - *Waldumbau:* geräumt – Stubben, Reisighaufen, liegender Schlagabraum (erst rostbraun, dann grau, nach ~12 Jahren verrottet),
    Rückegassen (4 m breit, zwei Fahrspuren, alle 30 m hangab, nur wo geräumt wurde und kein Baum steht), auch der kleine Unterstand der
    Fichten verschwindet mit der Räumung; Kiefern und Lärchen bleiben stehen. Im Familienwald in Gruppen gepflanzt (Buche, Tanne, Eiche,
    Ahorn; Eiche, Tanne und Ahorn die ersten acht Jahre in Wuchshüllen), dazu ein paar Pioniere (Birke, Eberesche, Salweide).
  - *Natürliche Verjüngung:* im Familienwald stehen die toten Bäume erst, liegen dann; der Unterstand wächst weiter; Fichte, Birke,
    Eberesche, Salweide und Buche kommen dichter und ungleichmäßig. Außerhalb des Familienwalds wird in beiden Varianten geräumt.
  - *Schlagflur:* sobald die Nadeln unten sind, kommen Reitgras (Horste, im Herbst strohfarben), Weidenröschen (im Sommer rosa
    Blütenstände, im Herbst rote Blätter und weiße Samenhaare), Fingerhut (Rosette, im Juni/Juli die purpurnen Glocken), Brombeere und
    Himbeere; am dichtesten nach 3–8 Jahren, unter den jungen Bäumen nach 15–25 Jahren weniger.
  - Höhen nach Wuchs junger Bäume (Annahme nach Ertragstafeln: gepflanzte Buche/Eiche etwa 4–5 m nach 15, 10–13 m nach 30 Jahren;
    Pioniere schneller, Tanne langsamer). Junge Laubbäume über 2,5 m: in der Nähe der Kamera die echten Baumarten des Gartens
    (`garden/trees.js`: Eiche, Esche, Espe – Rinde und Blattkarten; Laubfarbe nach dem Datum der Welt: frisch im Mai, bunt im Herbst,
    im Winter kahl, junge Buchen und Eichen mit trockenem Laub), weiter weg deren Fernbild (die gekreuzten Bildtafeln der Bäume des Dorfs,
    `world/ratscher.js`, dasselbe Programm); ab 0,7 m Höhe. Junge Fichten und Tannen von 0,7 bis 2,5 m: der Nadelbaum des Gartens
    (Quirle hängender Nadelzweige; die Tanne dunkler), darüber wieder die Bäume des Waldmodells; nur Sämlinge darunter sind einfache
    Formen. Was nah ist, wird neu gewählt, wenn die Kamera 12 m weiter ist.
  - Bei natürlicher Verjüngung bleiben die umgefallenen Stämme liegen (Totholz, über die Jahre bemoost, ~30 Jahre).

## Grenzen (ehrlich)

- **Wald:** junge Bäume unter 2,5 m sind einfache Formen; Buche, Ahorn, Eberesche und Salweide haben die Form von Eiche, Esche bzw. Espe;
  der Boden unter Gras und Kräutern bleibt Nadelstreu mit Moos; Rinde schält sich nicht; Weidenröschen und Fingerhut sind einfache
  Formen (aus der Nähe als Modell zu erkennen); die Rückegassen gehen nicht um die gepflanzten Gruppen herum.
- **Hochwasser:** kein Abflussmodell; Schaum und Strömung sind ein Bild, kein Wirbel an einzelnen Pfosten oder Stämmen. Aus sehr flachem Blick spiegelt ein schmaler
  Wasserstreifen in der Ferne noch den grauen Himmel.
- **Wald von heute:** wo die Kronenkarte dünn ist, zeigt der Waldboden blaugraue Flecken aus dem Luftbild. In den Zukünften verhindert das die
  Untergrenze im Haken `S.canopy` (`world/forest.js`); für die Welt von heute bräuchte `forest.js` dieselbe Untergrenze.
- **Dach-PV:** von den Dorfdächern werden nur rund 200 Ebenen erkannt, 62 davon belegt – viele Dorfhäuser bleiben ohne Module (Ursache offen).
- **Mehr Fahrten** (Mobilität) zeigt nichts in der Welt.
- **Dürre:** `WXBODEN.setDry` (Haken von `zukunft` in `wetter/wx_boden.js`) mischt die Farbe der Bodenbilder mit Stroh – das macht grüne
  Felder nur dunkler, nicht gelb. Ein Faktor über 1 im Rot (etwa `DRYC` = 1,7 / 1,15 / 0,75 multiplikativ) wäre nötig.
- „Mehr Fahrten“ (Takt) zeigt nichts in der Welt (die Busse fahren nach dem echten Fahrplan).

## Kosten

Instanziert, im Material von welt-dinge (dessen Programme beim Laden übersetzt werden), das Wasserprogramm des Bachs, die Schatten der
Autos, der Maschendraht und das Rasengras des Gartens, die Fernbilder der Bäume des Dorfs. `ZKWELT.warm()` beim Start des Modus übersetzt drei
Programme (der weiche Schlammsaum, Schaum/Ufer mit Bild, das Schild) und gibt den Fernkarten des Walds ihre Instanzfarben. Danach übersetzen die Zukünfte nichts mehr (Test: alle Themen, Varianten und Jahre
an schon besuchten Orten: 0 neue Programme). Was ein Test sonst an neuen Programmen sieht, kommt von der Welt selbst, wenn die Kamera
zum ersten Mal an einen Ort kommt (Bäume, Figuren, glTF-Modelle). Eigene Draw-Calls: Dächer 3, Park 8, Wald mit Boden bis ~30; Dreiecke
bis ~1,6 Mio. für einen ganzen Wald mit Schlagflur im Bild (je Art nur die der Kamera nächsten), am Telefon bis ~0,8 Mio.

## Testen

`bash tools/browser_lock.sh python3 viz3/test/run.py --port 9008 --serve zukunft_welt` (Abschnitte
`start,pv,park,mobil,wasser,wald,budget,ende,telefon`); Bilder in `out/zukunft_welt/` (je Thema vorher/nachher, zu Fuß und aus 60 m).
Auf GitHub über `viz3/extra/zukunft-welt/tests.txt` (dazu `zukunft`, `strategie` und `strategie_telefon`).

## Für den Lead

- Gemeinsame Dateien: `viz3/src/world/forest.js` – `S.canopy` (save, reset, open, upload; markiert `feat/zukunft-welt`): das Kronendach
  für eine Zukunft öffnen und zurück. Sonst nichts geändert (gelesen: `RATSCHER.bld`, `VILLAGE.bld/parts`, `DKDATA.houses`, `BUS.STOPS()`, `AMTWORLD`, `FOREST`,
  `DMOD`, `FENCE_MAT`, `WETTER`, `WXBODEN`, das Wassermaterial des Bachs).
- Quellen: `viz3/extra/zukunft-welt/manifest.json` (`credits_add`: Überschwemmungsgebiet © GDI-Th / TLUBN, dl-de/by-2-0; Flusslinie
  OpenStreetMap, ODbL); Maße nach Herstellerdaten üblicher Module (1722 × 1134 mm, 108 Halbzellen) und Freiflächenanlagen.
