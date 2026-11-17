# Schleusingen nach Ansicht – Fassaden und Markt (`feat/schleusingen-ansicht`)

Hilfs-Agent `schleusingen-ansicht` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, 17.11.2026, Branch `feat/schleusingen-ansicht` (Auftrag
`docs/plans/auftraege/schleusingen-ansicht.md`). Falko (~17:30, nach einem Vergleich des Modells mit Ansichten von der Straße): „Fassaden
nach Ansicht“ und „Markt fertig machen“; ~18:20: Schleusingen vollständig, dann Ratscher.

## Was es gibt

- **Fassadendaten** `viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json` – je Gebäude der Altstadtdaten
  (`viz3/extra/schleusingen/dist/schleusingen/stadt.json`, Index `i` in `b`, mit Schwerpunkt `x, y` zum Prüfen), von Hand gelesen aus
  **privaten Ansichten von der Straße** (die Bilder liegen nur im Arbeitsordner des Chat-Rechners, nie im Repo, in einem CI-Artefakt
  oder einer Textur; ins Repo kommt nur, was man daran abliest):
  - `art` (haus, block, villa, geschaeft, halle, autohaus, schuppen, garage, scheune, schule, kirche, pavillon),
  - `material` (putz, putz_modern, schiefer, schiefer_og, schiefer_giebel, fachwerk, fachwerk_og, fachwerk_giebel, klinker, bretter,
    blech, stein, verkleidung = helle oder farbige Schindeln, glas), `wand` (sRGB) mit `wand_quelle` (`gemessen` an einer besonnten
    Stelle, `geschätzt` wo die Ansicht nur Schatten zeigt), `eg` (Erdgeschoss: Material und Farbe – bei *_og immer),
    `fachwerk` (braun, rot, schwarz), `schiefer` (hell, mittel, dunkel), `ausfachung`, `giebel`,
  - `dach` (`material` ziegel, schiefer, blech, flach, faserzement; `farbe` sRGB), `laeden` (Fensterläden), `laden` (Ladenfront),
    `rahmen`, `besonders` (was man sieht, deutsch), `sicher` (hoch, mittel, niedrig), `ansichten` (Blickpunkte).
  - `nicht_lesbar`: Gebäude, die eine Ansicht zeigt, aber nicht lesbar (Bäume, Hecke, unscharf) – mit Grund.
  - Stand: Runde 1 (Hildburghäuser, Suhler, Ilmenauer Straße, Markt; 71 Ansichten), Königstraße (16) und Bertholdstraße (zwei
    360°-Ansichten, je 6 Richtungen): 141 Gebäude gelesen (63 hoch, 56 mittel, 22 niedrig sicher), 30 als nicht lesbar benannt;
    Wahrzeichen (Rathaus, Kirche, Burg, Türme) zeichnet die Stadt selbst – sie stehen nicht in den Daten.
  - `dach.farbe_quelle`: `Ansicht` (von der Straße gesehen) oder `Luftbild 2024` (nur von oben, DOP 2024 © GDI-Th, dl-de/by-2-0 –
    Dachart von oben, Farbe die Klasse der Tabelle, nicht der blasse Farbwert des Luftbilds).
- **Blickpunkte** `viz3/extra/schleusingen-ansicht/views.json` (Modellachsen, Blickrichtung `yaw` von Modell-Nord, die wahre Nordrichtung –
  hier etwa +3,0° – eingerechnet aus `manifests.json` `geoman.xf`; Bildwinkel senkrecht 90°, 1366 × 559) – für die Modellbilder des
  Tests und die Abdeckungsprüfung. Bei 360°-Ansichten (`p5_*`, `p6_*`, Augenhöhe 1,6 m) stimmen weder der angegebene Standort noch die
  eigene Nordrichtung des Fotos: Standort und Drehung sind an die Gebäude der Stadt angepasst (Ecken, Dachlinien, Straßenfluchten; bei
  `p6` dazu der Sonnenstand und die Lage des Ladens laut OSM) – `p5` 4 m östlich und 2 m südlich, Drehung +26,5°; `p6` 28 m nordöstlich
  am Eckeingang von Bertholdstraße 19, Drehung −63°.
- **Prüfwerkzeug** `tools/schleusingen-ansicht/check.py`: Schema, jedes Gebäude existiert und liegt, wo die Daten sagen, und **Abdeckung**:
  von jedem Blickpunkt ein Strahl je Spalte – jedes Gebäude, das über ≥ 40 px innerhalb 45 m das vorderste ist, steht in `gebaeude` oder
  `nicht_lesbar`. `--list` zeigt je Blickpunkt, welche Gebäude er zeigt.
- **SALOOK** (`viz3/src/schleusingen-ansicht/sa_look.js`, rein, Unit-Tests): ein Datensatz → das Aussehen der Stadt
  (`welt/schleusingen.js` `styleOf`: Stilcodes des Fassaden-Shaders aus `world/village.js`, Farbe linear × 0,82 wie die Palette der Stadt,
  Fachwerkfarbe, Rahmen, Läden, Schiefer-Ton – 3 = Schindeln in der gelesenen Farbe –, `typ` Haus/Halle/Schuppen, Dachart und -farbe).
  Klinker wird Putz in der Klinkerfarbe: Stil 9 (`BRICK`) fällt im Fassaden-Shader in den Zweig der Scheunen (6,5 < st < 9,5) und würde
  als Bretter gezeichnet (wie bei Suhl, `docs/PARALLEL.md` 13.11.).
- **SAFASS** (`sa_fassaden.js`): lädt die Daten, wenn die Stadt näher kommt (Zone 1100 m, die Stadt baut ab 950 m), und bietet den Haken
  `SAFASS.apply(b)` – **noch nicht eingehängt**: `welt/schleusingen.js` gehört bis zum Merge von `feat/gebaeude` dem Grenzland-Chat.
  `?nosafass` schaltet ab.
- **Der Markt** (`sa_markt.js`, `SAMARKT`), geprüft an den Ansichten (360°-Foto Mai 2016) und am Luftbild DOP 2024 (20 cm, auf 3 cm genau
  eingemessen):
  - **Pflaster bis in die Ferne**: Die Kacheln zeichnen Kopfstein nur aus der Nähe – ab ~8 m war der Markt flach grau. Jetzt ein eigenes
    Bodenstück über dem Umriss des Markts (OSM), 3 cm über dem Boden mit Polygonversatz (kein Flimmern), Dreiecke ≤ 1,6 m, mit einer im
    Browser gemalten Textur aus unregelmäßigen Natursteinen in den Farben des Fotos (grau, beige, einige rosa, blaugraue und dunkle,
    dunkle Fugen, großflächige hellere und dunklere Flecken, 4 m Wiederholung, anisotrop gefiltert) – im Material der Schilder der Stadt
    (derselbe Shader, kein neues Programm).
  - **Bänke**: drei lange Holzbänke in einer Reihe südlich und zwei östlich des Brunnens (Rücken zum Becken, Stahlgestell); die westliche
    stand schon (OSM).
  - **Vier Pflanzkübel** aus Beton an den Diagonalen um den Brunnen, mit Blumen.
  - **Die sitzende Bronzefigur** am Südwestrand des Beckens auf einem Sandsteinblock, vom Becken weg blickend – eine allgemeine sitzende
    Figur, kein Bildnis.
  - **Ein Abfalleimer**.
  - Alles in zwei Meshes (Pflaster; Ausstattung im Material der Requisiten der Stadt), Kollisionen über `KERN.pushOut` (Priorität 11, gibt
    weiter). Gebaut, wenn die Stadt steht, weg mit ihr. `?nosamarkt` schaltet ab.
- **Test** `viz3/test/schleusingen_ansicht.py` (Abschnitte `data,fassaden,markt,bilder` im Prüfpaket; von Hand dazu `vorschau` und
  `ratscher`): die Daten gültig; die Datensätze passen zu den Gebäuden der Stadt und geben das Aussehen von SALOOK (nach dem Haken: die
  Stadt zeichnet sie so); der Markt steht, ≤ 4 Draw-Calls mehr, kein neues Shader-Programm, das Pflaster 2–5 cm über dem Boden, Kübel und
  Figur halten auf; Modellbilder von allen Blickpunkten (nur das Modell) nach `out/schleusingen_ansicht/` (`SA_VIEWS=v000,p5_0` nur
  diese, `SA_VIEWS_FILE` andere Blickpunkte). `vorschau` setzt die Daten nur in der Testseite auf die Meshes der Stadt (Bilder
  `*_vorschau.jpg`, wie es mit dem Haken aussähe); `ratscher` schreibt die Häuser des Dorfs nach `ratscher_dump.json` und
  zeichnet Modellbilder von den Blickpunkten in `views_ratscher.json` (die Standorte der freien Panoramax-Fotos). Unit-Tests
  `viz3/test/unit/schleusingen_ansicht.test.mjs`.

## Für `welt/schleusingen.js` (nach dem Merge von `feat/gebaeude`, mit dem Grenzland-Chat abgesprochen)

1. Der Haken: in `build()` nach `b.st = styleOf(b, i);` die Zeile `if (window.SAFASS) SAFASS.apply(b); // feat/schleusingen-ansicht` –
   und in `building()` der Schiefer-Ton im Packwert: `pk = … + 128 * o.shut + 512 * (o.slate || 0)` (wie im Dorf; sonst ist Schiefer
   immer blauschwarz).
2. Geometrie: als Halle gezeichnet, aber Häuser: 308 (Hildburghäuser Straße 5), 349 (langes Fachwerkhaus), 579, 430 – und 310
   (Bertholdstraße 22: ein Grundriss für zwei alte dreigeschossige Häuser mit Läden, dahinter ein Glasdach); 580 und 717 sind
   eingeschossige Garagen (im Modell zwei-/dreigeschossig); Flachdächer (Schule 80, Garagen, Hallen, Autohäuser, 417) haben
   Satteldach-Geometrie (SALOOK zeichnet sie dann als Faserzement statt Kies). Die Daten tragen dafür `art` und `besonders`.
3. Die Schule an der Ilmenauer Straße (80): moderner zweigeschossiger Flachdachbau, weiß mit dunkelgrauen senkrechten Bändern.
4. Die Gottesackerkirche (72): Sandstein, Rundbogenfenster – SAFASS nimmt die Hausfenster weg, die Bögen wären Sache der Stadt.
5. Der Marktbrunnen trägt seinen grauen Winterdeckel immer (nicht nach Datum); die Ansicht vom Mai zeigt das offene Becken mit Wasser –
   Vorschlag: zugedeckt etwa November bis März (nach der Spielzeit), sonst offen mit Wasser.
6. Der graue Klotz am Markt: ein ETHOS-„Turm“ aus `gebaeude/gebaeude.js` – `feat/gebaeude` lässt sechs solche weg.
7. Für den Kern (`world/village.js`, nicht Teil dieses Zweigs): der Zweig `st == 9.0` (Klinker) im Fassaden-Shader wird nie erreicht –
   `barn` (6,5 < st < 9,5) fängt Stil 9 vorher ab; SALOOK umgeht es.

## Abgleich und Runde 3 (geplant, Falko 19:39: Schritt für Schritt zur besten Übereinstimmung)

- **Abgleich** `tools/schleusingen-ansicht/abgleich.py --ref DIR --out DIR` (nur auf dem Chat-Rechner, der die Ansichten hat; `--ref` und
  `--out` müssen außerhalb des Repos liegen): je Blickpunkt Ansicht und Modellbild (Abschnitt `bilder` des Tests, dieselbe Kamera)
  nebeneinander, je Gebäude der Farbunterschied ΔE im Band zwischen Fuß und Traufe (CIELAB, Helligkeit halb gewichtet), dazu der
  Unterschied der Dachlinie in Grad; Wertung = mittleres ΔE + 2 × Dachlinie, Liste `abgleich.json` (nur Zahlen) mit den schlechtesten
  Blickpunkten zuerst. Jede Runde fängt bei ihnen an.
- **Runde 3** – je Gebäude, was die Ansichten zeigen, als Daten für den Weg von `gebaeude` in `FASSADE` (die Geometrie baut
  `gebaeude`): Geschosse, Dachform (Sattel, Walm, Krüppelwalm, Mansarde, flach) und Firstrichtung (trauf- oder giebelständig), Gauben,
  Fensterreihen und -größen, Türen und Tore, Ladenfronten mit ihrer Aufschrift (schlichte Schrift), Balkone, zur Straße Zaun, Mauer
  oder Hecke. Nichts von den Bildern selbst geht ins Spiel – nur, was man abliest.

## Offen

- Runde 2: die 360°-Ansichten im Schlosshof (`p0`–`p4`) zeigen nur das Wahrzeichen; `p7` (Spielplatz an der
  Johann-Sebastian-Bach-Straße, am Südrand der Stadtdaten) ließ sich nicht verorten – die Häuser südlich davon fehlen in den Daten –,
  nicht gelesen; Mapillary in der Altstadt: noch keine Ansichten.
- Ratscher (Daten in eigener Datei, Häuser der Dorfmitte nach Falkos Video nur mit Unterschieden): die 109 freien Panoramax-Fotos
  (2020/2025) stehen alle auf Wegen außerhalb des Dorfs – das nächste rund 160 m von der nächsten Hauswand –, keine Fassade
  lesbar; Mapillary an der L 3004 (Ostrand) steht noch aus.
- Nachts bekommt das Pflasterstück kein Laternenlicht auf den Boden (die Kacheln auch nicht).
