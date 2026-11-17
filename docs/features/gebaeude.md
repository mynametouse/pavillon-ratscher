# Gebäude von außen plausibel – Türen, Fenster, Durchgänge, Höfe (`feat/gebaeude`)

Hilfs-Agent `gebaeude` des Grenzland-Chats (session_01L6Yrpf75YEUJPnMQdXevjQ), 17.11.2026, Branch `feat/gebaeude` (Auftrag
`docs/plans/auftraege/realismus1-gebaeude.md`, gemeinsamer Teil `realismus1-gemeinsam.md`). Falko (13:27): „ein Haus ohne Tür macht keinen
Sinn … die Hofeingänge, die teilweise durch Tunnel eben funktionieren … der Innenhof ist einfach nicht betretbar. Das ist zum Beispiel
Quatsch. … Teilweise hast du auch große Gebäude komplett ohne Fenster.“ Erste Orte: Ratscher und Schleusingen (Suhls Aue später – die
Werkzeuge sind dafür gebaut, siehe unten).

## Was es gibt

- **Die Prüfung `FASSADE.audit(ort)`** (`viz3/src/fassade/fassade.js`, Regeln rein in `fassade/fassade_audit.js` mit Unit-Tests): für jedes
  Gebäude eines Orts, so wie es wirklich gezeichnet wird, was noch unplausibel ist – `[{ id, ort, art: 'tuer' | 'fenster' | 'durchgang' |
  'hof', x, y, text, rest? }]`. `rest` sagt, warum etwas bleiben darf (z. B. ein Zwickel zwischen zwei Häusern ohne Zugang). Regeln:
  - **Tür**: jedes Gebäude ab 6 m² hat einen Eingang (Haustür, Tor einer Scheune oder Halle, Tür eines Schuppens); keine Tür steht vor der
    Wand eines Nachbarn (0,7 m davor). Wahrzeichen haben ihre Türen aus den Modellen (Portal der Kirche, Rathaustür, Burgtore).
  - **Fenster**: gezählt genau so, wie der Fassaden-Shader des Dorfs sie malt (Achsen, Geschosse, Traufe/Giebellinie, die Tür-Achse, die
    Lücken der Scheunen) und nur dort, wo kein Nachbar davorsteht. Ein Wohnhaus hat auf jeder freien Wandstrecke ab 3 m Fenster; eine Halle
    ab 150 m², eine Scheune ab 250 m² hat überhaupt Fenster, eine Halle auf jeder Wand ab 25 m. Brandwände bleiben blank, **wo** ein Nachbar
    davorsteht – nicht auf ihrer ganzen Länge.
  - **Durchgang**: was OpenStreetMap als Durchgang kennt (`tunnel=building_passage`, `covered=yes`, ein Fußweg-Tunnel durch ein Gebäude), ist
    offen.
  - **Hof**: jede von Gebäuden umschlossene Freifläche (Lücken unter ~1 m gelten als zu: da kommt niemand durch) ist erreichbar – oder klein
    genug, dass es keinen Zugang braucht (unter 25 m²: Zwickel; 25–60 m²: kleiner Hof, nur durch die Häuser daneben).
  - `FASSADE.audit(ort, { vorher: true })` gibt dasselbe für den Stand vor den Korrekturen (zum Vergleich im Test).
- **Schleusingen** (`welt/schleusingen.js`, beim Aufbau der Stadt, `fassPlan`):
  - **Türen**: wo ein Gebäude keine Haustür zur Straße hat (Hinterhäuser, Anbauten, Schuppen und Hallen im Hof – 196 von 789), bekommt es
    eine Tür auf der Seite mit Platz davor (Hof, Garten; Schuppen und Hallen ein Tor), in einer Fensterachse wie die Haustüren. Diese
    Hoftüren sind nur gemalt – hineingehen kann man wie bisher durch die Haustüren zur Straße (`SINNEN` liest `doorFac` unverändert).
  - **Fenster an freien Brandwand-Strecken**: Die Altstadtdaten nennen eine Wand „Brandwand“, wenn in ihrer Mitte ein Nachbar steht – auch
    wenn er nur ein Stück davon deckt. Jetzt bleibt nur das gedeckte Stück blank; jede freie Strecke ab 3 m wird als eigene Fassade
    gezeichnet, mit Fenstern im Rhythmus des Hauses (84 solche Strecken, die längsten 8–12 m). Nachts leuchten sie wie alle Fenster.
  - **Eingänge laut OSM** (26 in der Altstadt, vor allem am Schulcampus und an der Helmut-Kohl-Straße): liegt einer an der Wand der
    Haustür, rückt die Tür an seine Stelle; liegt er an einer anderen Wand, ist er eine zweite Tür (eine je Wand – so malt der Shader).
  - **Durchgänge und Höfe**: Die **Bertholdsburg** bekommt ihre zwei Tore laut OSM (Westflügel: `tunnel=building_passage`, Pflaster;
    Ostflügel: der Fußweg-Tunnel) – der Burghof ist jetzt zu Fuß erreichbar. Der große Innenhof des Blocks Klosterstraße/Bertholdstraße
    (~840 m², von 21 Häusern umschlossen) und der Hof an der Zeile (~110 m²) bekommen je eine **Tordurchfahrt** durch das Haus zwischen Hof
    und Straße, das den kürzesten Weg hat (Bertholdstraße 6, Zeile 1; ein Haus statt eines Wahrzeichens, gerade durch, 2,8 m breit,
    höchstens 3,4 m hoch und 0,6 m unter der Traufe) – **angenommen**: OSM kennt diese Einfahrten nicht, die Altstadt hat solche
    Einfahrten. Eine Durchfahrt nur von einer Straße (höchstens 12 m entfernt) und nur, wenn ihr Boden keine Rampe wird (höchstens 12 %
    Steigung – sonst das nächste Haus am Hof). Die Durchfahrt: echte Öffnungen in beiden Fassaden (die Obergeschosse mit ihren Fenstern
    darüber bleiben), an beiden Enden ein Gewände aus Sandstein mit Stichbogen, die zwei Flügel des hölzernen Tors offen an den Wänden,
    verputzte Seitenwände und Decke, Kopfsteinpflaster (Burg: Platten), der Boden als sanfte Rampe von der Straße auf die Höhe des Hofs
    mit einem Absatz von 4 m davor, der in das Gelände übergeht (das Oberflächenmodell der Kacheln hat an großen Gebäuden Buckel); die
    Haustür des Hauses steht, wenn sie auf dieser Seite war, jetzt in der Durchfahrt. Das Haus mit der Durchfahrt gilt für die Häuser von
    innen als „Tor“ (nicht begehbar – sonst liefen seine Zimmer durch die Durchfahrt). Der Boden der Höfe dahinter folgt den Füßen der
    Häuser ringsum (gewichtet nach Abstand: am Hang trifft jede Wand den Hof auf Höhe ihres Erdgeschosses; vorher Buckel aus dem
    Oberflächenmodell), bis 2,5 m unter die Wände gezogen (das 2-m-Netz der Kacheln trifft die Wände eben). Im HUD: „Tordurchfahrt,
    Bertholdstraße 6“, „Hof hinter Bertholdstraße 6“, im Burghof „Schloss Bertholdsburg“.
  - `?nofassade` baut die Stadt wie vorher (zum Vergleich).
- **Ratscher** (`fassade/fassade.js`, von außen eingehängt – `world/village.js` und `gebaeude/gebaeude.js` bleiben unverändert):
  - **Türen**, wo ein Gebäude keine hatte (kleine Schuppen: keine Wand lang genug für die Regel des Dorfs), und Türen von Scheunen und
    Schuppen, die vor die Wand eines Nachbarn zeigten, auf eine freie Seite – über das Fassaden-Attribut `aD` des Dorfs (der Shader malt sie).
    Haustüren bleiben, wo sie sind (durch sie geht man ins Haus, `HAEUSER`).
  - **Stallfenster an den langen Hallen**: Die großen Ställe der Höfe (bis 76 m lang, Traufe 3,2–4 m) hatten keine Fenster – der Shader malt
    das Fensterband einer Halle erst ab 3,2 m Höhe. Jetzt eine Reihe Stallfenster (1,2 × 0,8 m, Brüstung ~1,75 m, alle 3 m, Betonrahmen,
    Sprossenkreuz) auf beiden Langseiten, nicht vor Toren und nicht dort, wo ein Nachbar anbaut – ebenso an den Hallen aus ETHOS
    (`gebaeude/gebaeude.js`), die der Shader aus demselben Grund ohne Fenster ließ. Ein Mesh im Material der Dorf-Requisiten
    (kein neues Shader-Programm), das Glas in drei Gruppen, die nachts mit den Fenstern des Dorfs nach der Uhrzeit angehen (emissiv, keine
    Lampen).
- **`FASSADE.eingang(id)`** → `{ x, y, hd }` (hd: Kompassrichtung, in die die Tür schaut) für Ratscher (Nummern von `VILLAGE`), Schleusingen
  (900000 + Index wie `SINNEN`): die Haustür, sonst die Hoftür – für `alltag` (Leute, die in ein Haus oder einen Laden gehen).

## Prüfung: Zahlen

Stand nach dem ersten Lauf (vorher → nachher; „erklärt“ = mit `rest`):

| Ort | Tür | Fenster | Durchgang | Hof | erklärt |
|---|---|---|---|---|---|
| Ratscher | (folgt) | | | | |
| Schleusingen | (folgt) | | | | |

## Schnittstelle

- `FASSADE` (`viz3/src/fassade/fassade.js`): `audit(ort, { vorher })`, `count(liste)` → `{ tuer, fenster, durchgang, hof, rest, n }`,
  `eingang(id)`, `status()` (Zustand, Zahlen der Korrekturen, Zeiten, Höfe und Durchgänge von Schleusingen), `doors` (Ratscher: neue Türen je
  Gebäude), `win` (Ratscher: Stallfenster je Gebäude und Fassade), `meshes`, `glass`.
- `FAUDIT` (`viz3/src/fassade/fassade_audit.js`, rein): `windows(stück)`, `cover(gebäude, wand, index)`, `openRuns`, `hoefe(gebäude)`,
  `tor(hof, …)`, `passLine(gebäude, linie)`, `hofTuer(gebäude, wände, frei)`, `fromF(gebäude der Stadtdaten)`, `index`, `audit`, `count`.
- `SCHL.fassade` (`welt/schleusingen.js`): `yards` (mit `reach`, `rest`, `z`, `at(x, y)`), `passes` (je Durchgang `A`, `B`, `d`, `w`, `h`,
  `depth`, `src` 'osm' | 'hof', `b`), `mapped` (die OSM-Durchgänge mit `open`), `n`, `ms`; je Gebäude `b.doorV` (die Tür vorher), `b.doorUse`,
  `b.doorYard`, `b.holes`, `b.open`, `b.passDoor`, `b.pieces` (die gezeichneten Fassadenstücke). `SCHL.streetDoor(b)`, `SCHL.FASS`.
- Daten: `viz3/extra/gebaeude/dist/gebaeude/osm.json` (2,7 KB: Durchgänge und Eingänge aus OSM in Modellmetern), gebaut mit
  `python3 -I viz3/extra/gebaeude/quellen/osm_fassade.py` (OSM-API in Stücken – Overpass brach am 17.11. ab).

## Leistung

- Schleusingen: der Plan beim Aufbau der Stadt ≈ (folgt) ms (Höfe im Raster 0,5 m je Block, Durchgänge, Türen, Brandwände); alles in den
  vorhandenen Wand- und Dach-Meshes der Stadt – **keine zusätzlichen Draw-Calls**, wenige Dreiecke mehr.
- Ratscher: einmal nach dem Aufbau des Dorfs ≈ (folgt) ms; 1 Mesh für Rahmen, bis 3 für das Glas (Draw-Calls +4 höchstens).
- Keine neuen Shader-Programme (Wand- und Dachmaterial der Stadt, Material der Dorf-Requisiten und Klone davon), keine Lichter.

## Testen

- Unit-Tests: `node --test viz3/test/unit/fassade.test.mjs` (9; in `tools/check.sh`).
- Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9044 --serve gebaeude:ratscher,schleusingen` (Bilder in
  `out/gebaeude/`), Abschnitt `perf` lädt zum Vergleich `?nofassade`. Themen-Tests `viz3/extra/gebaeude/tests.txt`.

## Für den Lead

- **Zusammenführen**: neue Module `fassade/fassade_audit.js` (vor `welt/schleusingen.js`) und `fassade/fassade.js` (nach
  `schleusingen/si_innen.js`) in `modules.txt`; geänderte eigene Datei `welt/schleusingen.js` (die Zeile `LAEDEN.skipStadt` bleibt). Keine
  gemeinsame Datei geändert.
- **An `innen-real`**: (1) An den freien Strecken von Brandwänden malt die Stadt jetzt Fenster (`b.open[k]`, `b.pieces`), `SIPLAN.facades`
  behandelt die ganze Wand noch als blind – drinnen fehlt dort das Fenster. Ein Zusatz in `si_plan.js`: die Stücke aus `b.pieces` statt
  `b.F` (Fenster je Stück wie `ZIPLAN.facadeWindows`). (2) Häuser mit Tordurchfahrt haben `doorFac.w` = Breite der Durchfahrt (> 1,3 m) →
  `SIPLAN.rules` sagt „tor“; bitte so lassen. (3) Hoftüren stehen in `b.doorYard` (nicht in `doorFac`) – wer Hinterhäuser begehbar machen
  will, kann sie dort lesen.
- **An `alltag`**: `FASSADE.eingang(id)` gibt die Tür; Leute können jetzt durch die Durchfahrten in die Höfe und durch die Burgtore in den
  Burghof gehen (`SCHL.fassade.passes`).
- Ratscher hat keine umschlossenen Höfe (die Höfe der Bauernhäuser sind zur Straße offen – das Hoftor wäre ein Tor in der Lücke, kein
  Durchgang; nicht gemacht).

## Suhls Aue mit denselben Werkzeugen

`FAUDIT` arbeitet auf schlichten Datensätzen (`fromF`: Grundriss, Fassaden mit Oberkante, Brandwand-Bit, Straßenabstand – das Format von
`stadt.json` und `gebaeude/gebaeude.js`): für die Aue (Plattenbauten und Blockrand mit Hofeinfahrten) (1) die Gebäude des Suhl-Datensatzes in
dieses Format bringen, (2) `hoefe()` findet die Innenhöfe, (3) OSM-Durchgänge (`osm_fassade.py` mit einem Kasten um die Aue) mit
`passLine()`, fehlende Einfahrten mit `tor()` – die Aue hat viele echte Durchgänge, die im Luftbild als Lücke im Dach nicht zu sehen sind,
in OSM aber oft gemappt; (4) zeichnen wie `welt/schleusingen.js` `building()`/`passage()` (Löcher, Seitenwände, Decke, Rampe, Hof-Pad),
(5) `FASSADE.audit('suhl')` mit einem eigenen `recs…`-Adapter.

## Offen

- (wird ergänzt)
