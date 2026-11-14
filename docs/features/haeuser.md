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
- **Wer zu Hause ist**: Ist der Bewohner eines Hauses laut `dorf/dorf_life.js` gerade daheim (nicht im Garten, nicht mit dem Auto weg,
  kein Skatabend, kein Feuer – nur gelesen, an den Tagesläufen ändert sich nichts), sitzt er im Wohnzimmer auf dem Sofa (sonst am
  Küchentisch): eine eigene Kopie seiner Figur (`haeuser/haeuser_gast.js`, `HGAST`, beim Hineingehen geladen, beim Hinausgehen
  freigegeben), mit der Aktion „… grüßen“ und einem kurzen Satz. Nachts (22:30–6:30) schläft er („… schläft schon – ganz leise.“),
  ist er weg: „Bei … – niemand zu Hause.“ Geht er laut seinem Tag hinaus, solange man drin ist, steht da „… ist hinausgegangen.“
- **Bewohnt**: tagsüber Tageslicht durch die Fenster (das warme Eigenlicht der Räume und ein geliehenes Punktlicht am Fenster wie in der
  Zombie-Nacht); **nachts geht das Licht an** – der Flur beim Hineingehen, jeder Raum, den man betritt (die zwei zuletzt betretenen
  bleiben an); Lichtschalter an jeder Zimmertür. Brennt die Lampe des Raums, in dem man steht, kommt ein schwaches warmes Fülllicht
  zwischen Auge und Kopf dazu (das von Wänden und Decke zurückgeworfene Lampenlicht – sonst wirkten nachts alle von der Lampe
  abgewandten Seiten blau wie im Mondlicht): eines der fünf geliehenen Punktlichter des Pavillons (`KERN.lights`, Kennung
  `haeuser:fill`, Vorrang 0), also keine neue Lampe und kein neues Programm. **Sitzen** auf Sofa, Sesseln, Stühlen, am Schreibtisch,
  **liegen** auf Betten und der Recamiere (nachts „Schlafen bis 7 Uhr“ wie im Garten), **Fernseher** und **Radio** an und aus,
  Wasserhahn, Dusche, Badewanne, Herd mit einem Gedanken; die Türen zwischen den Räumen gehen auf, die Kellerluke und der Dachboden wie
  in der Zombie-Nacht.
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
(die Tür, die der Knopf anbietet), `guest` (der Bewohner, der gerade zu Hause sitzt), `KEY`, `pal()` (belegte Felder der
Gartenpalette). Ereignisse `haeuser:enter` `{ id, look }`, `haeuser:leave` `{ id }`. Aktionen `haeuser:rein`, `haeuser:raus`,
`haeuser:tv`, `haeuser:radio`, `haeuser:gast`; geliehenes Licht `haeuser:fill`. `HHEUTE` (`viz3/src/haeuser/haeuser_heute.js`): der
Stil „heute“ als Erweiterung des Baukastens (`ZIEINR.looks`), `mats()`, `roomLook(plan, raum)`. `HGAST`
(`viz3/src/haeuser/haeuser_gast.js`): `show(key, at)`, `hide()`, `f`, `head()`. Speicherschlüssel `pav-haeuser-v1`,
`pav-haeuser-hinweis` (Hinweis „Ausgedacht“ einmal gezeigt).

**Haken in `zombie/`** (je mit `// feat/haeuser` markiert; ohne Stil-Erweiterung – also in der Zombie-Nacht – verhalten sie sich wie
vorher): `ZINNEN.mount(id, { look })` baut eine Kopie des Plans in diesem Stil; je Raum ein Stil (`ZIEINR.looks[stil].room`), eigene
Materialien (`mats`), Deckenleuchten (`ceiling`), Möbel (`furnish`), Schmuck (`deko`), Vorhänge (`curtains`), Fernseher in der
Schrankwand (`tv`) und die Farbe der Innentüren (`leaf`); `ZIEINR` gibt `looks`, `top`, `onWall`, `fillTops`, `deko` heraus.

## Leistung

Nichts beim Laden außer zwei kleinen Modulen; die Pläne der Häuser werden nach dem Laden in Scheiben gerechnet (je Bild ≤ 3 ms, zusammen
≈ 140 ms), danach findet ein Raster von 8 m die Tür nahebei (fünfmal je Sekunde). Gebaut wird erst beim Hineingehen, freigegeben beim
Hinausgehen (Geometrien und Texturen zurück); drinnen höchstens 60 Draw-Calls (alle 230 Häuser: 27–56, Bauzeit im Mittel ≈ 120 ms,
höchstens ≈ 360 ms – im Testrechner mit SwiftShader, hinter dem Schwarz). Keine neuen Shader-Programme (Zwillinge der Materialien des
Baukastens, Farben in der Gartenpalette, Leinwand-Texturen mit denselben Programmen): das erste Haus übersetzt hinter dem Schwarz die
Programme aller Stile auf einmal (je Material ein winziges Netz, `render/render.js` `warmUp` – auch Eiche und Lärche des Pavillons, die
die alten Stuben teilen und die ein Spiel, das im Dorf beginnt, noch nicht gezeigt hat) und dazu das eine des Gelände-Ausschnitts wie in
der Zombie-Nacht; jedes weitere Haus übersetzt für seine eigenen Netze nichts (was durch die Fenster vom Dorf zu sehen ist, etwa die
Gärten hinter den Häusern, gehört zur Straße). Das Fülllicht ist eines der geliehenen Punktlichter (ihre Zahl bleibt gleich).

## Testen

- `?szenario=haeuser` (vor einem Haus), `&drin=1` (gleich drinnen), `&haus=<id>`.
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9018 --serve haeuser` (Bilder in `out/haeuser/`, ≈ 25 min), Abschnitte
  `haeuser:only=door+walk+night+shots+looks+gast+sweep+save`: Tür mit Knopf (Bildschirmfotos mit dem Aktionsknopf „Hineingehen · E“,
  drinnen „Hinausgehen · E“, `*_hud.png`), Laufen (Wände, Boden, Treppe, Dachboden, Kellerluke, Innentür, Sitzen, Liegen), rein und raus
  ohne Speicherrest, nachts Licht, drei Häuser in Bildern bei Tag und Nacht, die übrigen Stile einmal gezeichnet ohne neues Programm,
  Gerhard zu Hause, alle Häuser einmal gebaut und freigegeben, Speichern und Neuladen. Themen-Tests `viz3/extra/haeuser/tests.txt`:
  `smoke`, `haeuser`, `zombie_innen`.

## Offen

- **Maße**: Innentüren 2,0 × 0,86 m (schmale 0,72 m, wo die Treppe wenig Wand lässt), lichte Raumhöhe 2,53 m (Geschoss 2,75 m, wie die
  Fassade es malt, Decke 0,22 m) – etwas höher als in alten Ernhäusern (2,2–2,4 m); über der Tür bleiben gut 0,5 m. Niedriger ginge nur mit
  einer dickeren Decke im Baukasten (die Fenster müssen zur gemalten Fassade passen) – nicht geändert.
- **Baukasten (`zombie/`, nicht meine Dateien)**: (1) Die DDR-Schrankwand verdeckt in der Zombie-Nacht ihr Fernsehfach (`skip` des Kastens
  meint Seiten im Hausrahmen, nicht die Vorderseite des Möbels); in den Stilen von heute ist das Fach offen (Haken), in der Zombie-Nacht
  unverändert – eine Zeile in `L.schrankwand` könnte es auch dort öffnen. (2) In manchen Häusern zeichnet sich oberhalb der Stubentür ein
  Streifen in Stufenform auf der Wand ab (Haus 23, Wohnzimmer: die Treppe im Flur dahinter) – Geometrie des Baukastens (Treppe und
  Wand), nicht des Stils, also vermutlich auch in der Zombie-Nacht; Ursache noch nicht gefunden. (3) Die Zombie-Nacht
  könnte den Stil „heute“ mit einer Zeile in `ZIPLAN.lookOf` mitbenutzen – nicht gemacht (die Zombie-Nacht bleibt, wie sie ist).
- **Dorfbewohner**: nur ein Gruß, kein Gespräch über die Gesprächsführung von `dorf/`; der Platz, auf dem einer sitzt, bleibt bis zum
  nächsten Hineingehen belegt.
- **Nicht dabei**: Gartenhäuser, Garagen, Scheunen und Ställe ohne Haustür; die Läden (`laeden/`, Hilfs-Agent `laeden-innen`); Schleusingen.
- **Für `docs/ARCHITECTURE.md`** (Datei des Kern-Chats): neue Fenster-Namen `HAEUSER`, `HHEUTE`, `HGAST`; Speicherschlüssel
  `pav-haeuser-v1`, `pav-haeuser-hinweis`; Ereignisse `haeuser:enter`, `haeuser:leave`; Licht-Leihe `haeuser:fill`.
