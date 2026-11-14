# Häuser von innen im normalen Spiel (`feat/haeuser`)

Hilfs-Agent `haeuser` (Auftrag `docs/plans/auftraege/haeuser.md`), Falko 13.11.2026 23:56: „wann kann ich alle Gebäude begehen?“

## Was es gibt

- **Jedes Wohnhaus von Ratscher mit Haustür** (die 230 Häuser von `ZINNEN.list()`) lässt sich im normalen Spiel betreten, bei Tag und
  bei Nacht: an der Haustür der Aktionsknopf **„Hineingehen“**, kurz schwarz, man steht im Flur; drinnen an der Haustür
  **„Hinausgehen“**. Gebaut wird der Innenraum erst beim Hineingehen (der Baukasten der Zombie-Nacht, `zombie/z_innen*.js`: Grundriss im
  eigenen Umriss des Hauses, Flur mit Treppe, Stube, Küche, Kammern, Bad, Keller unter der Küche mit Luke, Dachboden, Fenster genau hinter
  den gemalten), beim Hinausgehen wieder freigegeben.
- **Heute (2026)**: zu jedem Haus aus seiner Nummer immer derselbe Stil –
  - **„heute“** (die meisten): Einbauküche mit Kochfeld, Backofen, Spülmaschine, Dunstabzug, hohem Kühlschrank, Kaffeemaschine; Esstisch
    mit vier Stühlen und Pendelleuchte; Laminat oder große Fliesen; Ecksofa mit Recamiere, Couchtisch mit Tablet oder Laptop,
    Fernbedienung; Lowboard mit Flachbild-Fernseher, Soundbar und **Router mit leuchtenden Lämpchen**; Würfelregal, Sideboard,
    Leselampe, große Topfpflanze, Kunstdrucke; **LED-Deckenleuchten**; Schlafzimmer mit Polsterbett, Nachttischen mit Lampen und
    Telefon, Schwebetürenschrank mit Spiegel; **Kinderzimmer mit Schreibtisch**, Schreibtischlampe, Tablet/Laptop, Drehstuhl, Regal mit
    bunten Kisten und Spielzeug, rundem Teppich, Raketen-Poster; **Bad mit Dusche** (Glas, Regendusche), Wand-WC, Waschtisch mit
    Spiegelschrank, Handtuchheizkörper, große Wannen in großen Bädern, Waschmaschine, wo es keinen Hauswirtschaftsraum gibt;
    Kammer als Arbeits- oder Gästezimmer; Hauswirtschaftsraum mit Waschmaschine und Trockner; Keller mit Heizung, Warmwasserspeicher,
    Regal mit Eingemachtem, Werkbank, Fahrrädern und Getränkekisten; Flur mit Garderobe, Schuhbank, Schuhschrank und Spiegel.
  - **„heute-90“** (einige): nach 1990 eingerichtet und so geblieben (Eiche rustikal, Ledercouch – die „Nachwende“ des Baukastens), der
    alte Röhrenfernseher ist ein Flachbildfernseher mit Router daneben; Bad und Kinderzimmer von heute.
  - **„heute-ddr“** (Häuser alter Leute): Wohn- und Schlafzimmer der DDR (Schrankwand mit Vitrine, Sitzgruppe, Perserteppich,
    Häkeldeckchen), im Fernsehfach der Schrankwand ein kleiner Flachbildfernseher und der Router, ein Tablet auf dem Couchtisch;
    Küche der Neunziger, neues Bad mit Dusche.
  - **„alt“** (zwei Häuser im Dorf, Fachwerk oder Schiefer): wie vor 1960 – so wie in der Zombie-Nacht.
  - Die Dorfbewohner: Gerhard (72) wohnt „heute-ddr“, Manfred und Wolfgang „heute-90“, Uwe, Katrin, Ingrid und Heike „heute“; ihre
    persönlichen Dinge (Gerhards Bücherregal und Skatkarten, Manfreds Feuerwehrhelm, Wolfgangs Geweihe …) bleiben.
- **Bewohnt**: tagsüber Tageslicht durch die Fenster (das warme Eigenlicht der Räume und ein geliehenes Punktlicht am Fenster wie in der
  Zombie-Nacht); **nachts geht das Licht an** – der Flur beim Hineingehen, jeder Raum, den man betritt (die zwei zuletzt betretenen
  bleiben an); Lichtschalter an jeder Zimmertür. **Sitzen** auf Sofa, Sesseln, Stühlen, am Schreibtisch, **liegen** auf Betten und der
  Recamiere (nachts „Schlafen bis 7 Uhr“ wie im Garten), **Fernseher** und **Radio** an und aus, Wasserhahn, Dusche, Badewanne,
  Herd mit einem Gedanken; die Türen zwischen den Räumen gehen auf, die Kellerluke und der Dachboden wie in der Zombie-Nacht.
- **Nichts aus der Zombie-Nacht**: keine Schränke zum Durchsuchen, keine Barrikaden, keine Waffen (Wolfgangs Motorsäge und Axt liegen
  da, nehmen kann man sie nicht), keine Einbrüche, keine Sirene. In der Zombie-Nacht und im Grenzland gibt es dieses Hineingehen nicht
  (die Zombie-Nacht hat ihr eigenes).
- **Ausgedacht**: Es sind echte Häuser echter Menschen – die Einrichtung ist erfunden und allgemein (keine Namen an Klingeln oder
  Briefkästen, keine Fotos von Menschen). Beim ersten Hineingehen sagt das Spiel das einmal („Ausgedacht: so könnte es heute in einem
  Haus in Ratscher aussehen …“).
- **Speichern**: Solange man in einem Haus ist, steht in `pav-haeuser-v1` `{ v: 1, id, out: [x, y, z, Richtung] }`; nach einem Neuladen
  steht man vor der Haustür draußen. Landet ein Sprung (Menü, ein Spielstand eines anderen Modus) im Umriss eines Hauses ohne
  Innenraum, steht man ebenfalls vor seiner Tür.
- **Szene** „Häuser von innen“ (Menü → Erleben → Szenen, `?szenario=haeuser`, `&haus=<id>`, `&drin=1`): vor einem Haus nahe am Anger.

## Schnittstelle

`HAEUSER` (`viz3/src/haeuser/haeuser.js`): `list()`, `lookOf(id)`, `enter(id)`, `leave()`, `H` (der Handle von `ZINNEN`), `near`
(die Tür, die der Knopf anbietet), `KEY`, `pal()` (belegte Felder der Gartenpalette). Ereignisse `haeuser:enter` `{ id, look }`,
`haeuser:leave` `{ id }`. `HHEUTE` (`viz3/src/haeuser/haeuser_heute.js`): der Stil „heute“ als Erweiterung des Baukastens
(`ZIEINR.looks`), `mats()`, `roomLook(plan, raum)`.

**Haken in `zombie/`** (je mit `// feat/haeuser` markiert; ohne Stil-Erweiterung – also in der Zombie-Nacht – verhalten sie sich wie
vorher): `ZINNEN.mount(id, { look })` baut eine Kopie des Plans in diesem Stil; je Raum ein Stil (`ZIEINR.looks[stil].room`), eigene
Materialien (`mats`), Deckenleuchten (`ceiling`), Möbel (`furnish`), Schmuck (`deko`), Vorhänge (`curtains`), Fernseher in der
Schrankwand (`tv`) und die Farbe der Innentüren (`leaf`); `ZIEINR` gibt `looks`, `top`, `onWall`, `fillTops`, `deko` heraus.

## Leistung

Nichts beim Laden außer zwei kleinen Modulen; die Pläne der Häuser werden nach dem Laden in Scheiben gerechnet (je Bild ≤ 3 ms, zusammen
≈ 140 ms), danach findet ein Raster von 8 m die Tür nahebei (fünfmal je Sekunde). Gebaut wird erst beim Hineingehen, freigegeben beim
Hinausgehen (Geometrien und Texturen zurück); drinnen höchstens 60 Draw-Calls; keine neuen Shader-Programme (Zwillinge der Materialien
des Baukastens, Farben in der Gartenpalette, Leinwand-Texturen mit denselben Programmen) – außer dem einen des Gelände-Ausschnitts beim
ersten Haus (wie in der Zombie-Nacht, hinter dem Schwarz).

## Testen

- `?szenario=haeuser` (vor einem Haus), `&drin=1` (gleich drinnen), `&haus=<id>`.
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9018 --serve haeuser` (Bilder in `out/haeuser/`), Abschnitte
  `haeuser:only=door+walk+night+shots+sweep+save`. Themen-Tests `viz3/extra/haeuser/tests.txt`: `smoke`, `haeuser`, `zombie_innen`.

## Offen

- (wird ergänzt)
