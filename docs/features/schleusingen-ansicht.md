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
  - Stand: Runde 1 (Hildburghäuser, Suhler, Ilmenauer Straße, Markt; 71 Ansichten) und Königstraße (16): 124 Gebäude gelesen
    (60 hoch, 45 mittel, 19 niedrig sicher), 27 als nicht lesbar benannt; Wahrzeichen (Rathaus, Kirche, Burg, Türme) zeichnet die Stadt
    selbst – sie stehen nicht in den Daten.
- **Blickpunkte** `viz3/extra/schleusingen-ansicht/views.json` (Modellachsen, Blickrichtung `yaw` von Modell-Nord, die wahre Nordrichtung –
  hier etwa +3,0° – eingerechnet aus `manifests.json` `geoman.xf`; Bildwinkel senkrecht 90°, 1366 × 559) – für die Modellbilder des
  Tests und die Abdeckungsprüfung. `views_ratscher.json` ebenso für Ratscher (in Arbeit).
- **Prüfwerkzeug** `tools/schleusingen-ansicht/check.py`: Schema, jedes Gebäude existiert und liegt, wo die Daten sagen, und **Abdeckung**:
  von jedem Blickpunkt ein Strahl je Spalte – jedes Gebäude, das über ≥ 40 px innerhalb 45 m das vorderste ist, steht in `gebaeude` oder
  `nicht_lesbar`. `--list` zeigt je Blickpunkt, welche Gebäude er zeigt.
- **SALOOK** (`viz3/src/schleusingen-ansicht/sa_look.js`, rein, Unit-Tests): ein Datensatz → das Aussehen der Stadt
  (`welt/schleusingen.js` `styleOf`: Stilcodes des Fassaden-Shaders aus `world/village.js`, Farbe linear × 0,82 wie die Palette der Stadt,
  Fachwerkfarbe, Rahmen, Läden, Schiefer-Ton – 3 = Schindeln in der gelesenen Farbe –, `typ` Haus/Halle/Schuppen, Dachart und -farbe).
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
- **Test** `viz3/test/schleusingen_ansicht.py` (Abschnitte `data,fassaden,markt,bilder,ratscher`): die Daten gültig; die Datensätze
  passen zu den Gebäuden der Stadt und geben das Aussehen von SALOOK (nach dem Haken: die Stadt zeichnet sie so); der Markt steht, ≤ 4
  Draw-Calls mehr, kein neues Shader-Programm, das Pflaster 2–5 cm über dem Boden, Kübel und Figur halten auf; Modellbilder von allen
  Blickpunkten (nur das Modell) nach `out/schleusingen_ansicht/`. Unit-Tests `viz3/test/unit/schleusingen_ansicht.test.mjs`.

## Für `welt/schleusingen.js` (nach dem Merge von `feat/gebaeude`, mit dem Grenzland-Chat abgesprochen)

1. Der Haken: in `build()` nach `b.st = styleOf(b, i);` die Zeile `if (window.SAFASS) SAFASS.apply(b); // feat/schleusingen-ansicht` –
   und in `building()` der Schiefer-Ton im Packwert: `pk = … + 128 * o.shut + 512 * (o.slate || 0)` (wie im Dorf; sonst ist Schiefer
   immer blauschwarz).
2. Geometrie: 580 und 717 sind eingeschossige Garagen (im Modell zwei-/dreigeschossig); Flachdächer (Schule 80, Garagen, Hallen,
   Autohäuser) haben Satteldach-Geometrie (SALOOK zeichnet sie dann als Faserzement statt Kies).
3. Die Schule an der Ilmenauer Straße (80): moderner zweigeschossiger Flachdachbau, weiß mit dunkelgrauen senkrechten Bändern.
4. Die Gottesackerkirche (72): Sandstein, Rundbogenfenster – SAFASS nimmt die Hausfenster weg, die Bögen wären Sache der Stadt.
5. Der Marktbrunnen trägt seinen grauen Winterdeckel immer (nicht nach Datum); die Ansicht vom Mai zeigt das offene Becken mit Wasser.
6. Der graue Klotz am Markt: ein ETHOS-„Turm“ aus `gebaeude/gebaeude.js` – `feat/gebaeude` lässt sechs solche weg.

## Offen

- Runde 2: Benutzer-360°-Fotos im Schlosshof (nur das Wahrzeichen), Mapillary in der Altstadt (folgt), Ratscher (Daten in eigener Datei,
  Häuser der Dorfmitte nach Falkos Video nur mit Unterschieden).
- Nachts bekommt das Pflasterstück kein Laternenlicht auf den Boden (die Kacheln auch nicht).
