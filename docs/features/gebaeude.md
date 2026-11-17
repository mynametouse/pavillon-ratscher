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
  - **Die Burgtreppe**: vor dem Westtor der Burg führt laut OSM (Weg 204348789) eine gerade Treppe von 25,7 m zur Schloßstraße hinab
    (Luftbild 2024). Gebaut: ein ebener Absatz vom Tor bis zur Treppe mit Brüstungen, Stufen aus Sandsteinplatten (je ~17 cm), gestufte
    Wangenmauern beiderseits, bis zum Gelände am Fuß (12,0 m → −2,1 m); man geht sie hinauf und hinab (Boden über die Pads der Stadt).
  - **Stufen vor den Haustüren**: Der Fassaden-Shader malt eine Haustür auf den Sockel – 35 cm über dem Fuß des Hauses, 60 cm bei
    Hochparterre; sie hing in der Luft. Jetzt steht vor jeder Haus-, Hof- und zweiten Tür, deren Schwelle über dem Boden liegt, eine Treppe
    aus Steinblöcken (je ~17 cm Steigung, 50 cm Podest, 30 cm Auftritt), und man steigt sie hinauf (`KERN.ground`, Priorität 11 – nur auf
    den Stufen selbst, sonst antwortet der nächste Anbieter). Die Blöcke liegen im Mesh der Requisiten der Stadt (kein Draw-Call mehr).
  - **Hohe graue Blöcke in der Altstadt weg**: Am Markt stand links ein 16,6 m hoher, fensterloser grauer Block (der Test fand ihn mit einem
    Strahl aus der Kamera: ein ETHOS-Gebäude der Art „Turm“ aus `gebaeude/gebaeude.js`). Sechs solche „Türme“ (12–18 m hoch, 21–37 m²)
    stehen in Lücken der Altstadtdaten, jeder berührt ein Haus von `stadt.json` und ist in ETHOS ringsum angebaut – Teile der LoD2-Dächer
    von Altstadthäusern, die die Stadt selbst zeichnet. Sie bleiben weg (`GEB.skip`, nach dem von `laeden`; Liste aus
    `viz3/extra/gebaeude/quellen/teile.py`).
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
  - **Die ETHOS-Häuser** (`gebaeude/gebaeude.js`, unverändert) zeichnen eine Brandwand auf ganzer Länge blank und manchmal gar keine Tür.
    Wo eine Brandwand ab 3 m frei steht oder ein Gebäude keine Tür hat, liegt 4 cm vor der Wand eine **Haut aus Fassaden-Vierecken** im
    Fassaden-Layout des Dorfs: der Shader des Dorfs malt darauf Fenster im Stil des Hauses (Fachwerk, Putz, Klinker …) und die Tür
    (Material der Dorfwände: kein neues Programm, ein Mesh). Ein Gebäude, das ringsum eingebaut ist bis auf ein kurzes freies Stück
    (ab 1,4 m), bekommt dort eine schmale Tür (ein 9 m hoher Schuppen hinter den Häusern, zuvor der letzte „kein Eingang“).
  - **Stufen vor den Haustüren** wie in Schleusingen (Dorf- und ETHOS-Häuser), im Mesh der Stallfenster-Rahmen (dasselbe Material).
- **Die ETHOS-Zellen** (`gebaeude/gebaeude.js`, die Gebäude von `welt-gebaeude` beiderseits der Strecken – 217 Zellen von 400 m, beim
  Gehen gebaut und wieder weggeworfen: Schleusingens Stadtteile außerhalb der Altstadt, das Gewerbegebiet, die Ränder Ratschers, die Dörfer
  an den Strecken): dieselben Korrekturen je Zelle, sobald sie steht – die Haut
  (Fenster an freien Brandwand-Strecken, Türen, wo keine ist) **in das Wand-Mesh der Zelle gemischt** (kein Draw-Call mehr), die
  Stallfenster der Hallen ohne Fenster und die Stufen vor den Haustüren in **einem** Mesh für alle Zellen (Material der Requisiten, das Glas
  dunkel – Hallen am Stadtrand sind nachts dunkel). Eine Zelle, die neu gebaut wird (ihr Boden kam später), wird neu korrigiert; eine
  weggeworfene nimmt ihren Teil mit. `FASSADE.audit('zonen')` prüft die gerade gebauten Zellen, `FASSADE.zonen()` gibt die Zahlen.
- **`FASSADE.eingang(id)`** → `{ x, y, hd }` (hd: Kompassrichtung, in die die Tür schaut) für Ratscher (Nummern von `VILLAGE`), Schleusingen
  (900000 + Index wie `SINNEN`): die Haustür, sonst die Hoftür – für `alltag` (Leute, die in ein Haus oder einen Laden gehen).

## Prüfung: Zahlen

Stand von Lauf 4 (GitHub Actions 44112584752, `67d381d80`; vorher → nachher; „erklärt“ = mit `rest`):

| Ort | Tür | Fenster | Durchgang | Hof | erklärt |
|---|---|---|---|---|---|
| Ratscher vorher | 23: 4 kein Eingang, 19 Tür vor der Wand eines Nachbarn | 26: 23 Wandstrecken ohne Fenster, 3 Hallen ganz ohne | 0 | 0 | 19 |
| Ratscher nachher | 1 (seit 5c: 0, siehe unten) | **0** | **0** | **0** | 19 |
| Schleusingen vorher | 194 kein Eingang | 84 Wandstrecken ohne Fenster | 2 (Burgtore laut OSM) | 7 Höfe ohne Zugang | 3 |
| Schleusingen nachher | **0** | **0** | **0** | **0** | 7 |

In Ratscher erklärt: 16 Haustüren, vor denen 0,7 m davor ein Nachbargebäude steht – durch sie geht man ins Haus (`HAEUSER`, der Grundriss
hängt an der Tür), sie bleiben; 3 kleine umschlossene Flächen unter 80 m². Gebaut: 3 Türen, 19 verlegte Tore/Türen von Scheunen und
Schuppen, Stallfenster an 5 Hallen, die Haut der ETHOS-Häuser (Fenster an freien Brandwänden, Türen) – zusammen 241 neue Fenster. Der
letzte „kein Eingang“ von Lauf 4 (ein ETHOS-Schuppen, 9 m hoch, ringsum eingebaut bis auf 1,5 m) bekommt seit 5c eine schmale Tür
(Unit-Test; im Browser bestätigt Lauf 5).

Erklärt bleiben in Schleusingen 2–3 Zwickel unter 25 m² (zwischen zwei Häusern, kein Zugang nötig) und 4–5 kleine Höfe von 31–67 m² (nur
durch die Häuser daneben – keine Tordurchfahrt für einen Hof dieser Größe). Gebaut: 191 Hoftüren (Häuser, Schuppen, Hallen ohne Tür zur
Straße), 18 Türen nach OSM-Eingängen, 84 Fensterstrecken an Brandwänden, 4 Durchgänge (2 Burgtore, 2 Tordurchfahrten), die Burgtreppe;
seit 5 die Stufen vor den Türen.

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

- Schleusingen: der Plan beim Aufbau der Stadt 105–250 ms im Testrechner (Höfe im Raster 0,5 m je Block, Durchgänge, Türen, Brandwände,
  OSM-Eingänge); alles in den vorhandenen Meshes der Stadt (Wände, Dächer, Requisiten) – **10 → 10 Meshes, 311 598 → 315 214 Dreiecke
  (+1,2 %, mit Burgtreppe und Torgewänden)** gegenüber `?nofassade` (Lauf 4); die Stufen (seit 5) kommen ins Mesh der Requisiten.
- Das ganze Bild am Markt: der Test misst es seit 5c in zwei frischen Ladungen (mit und ohne `?nofassade`) und ohne das, was sich bewegt
  (Figuren, Verkehr, Tiere) – Lauf 4 maß die zweite Ladung nach einem langen Gang durch die Stadt und sah +29 Draw-Calls von Leuten und
  Autos, die sich inzwischen gesammelt hatten.
- Ratscher: einmal nach dem Aufbau des Dorfs 14–34 ms; 3 Meshes (Rahmen der Stallfenster mit dunklem Glas und den Stufen, das Glas, das
  nachts leuchtet, die Haut der ETHOS-Häuser) – vor der langen Halle **+4 Draw-Calls, +0,2 % Dreiecke** (Lauf 4: 1182 → 1186 Calls,
  2 026 884 → 2 030 052 Dreiecke).
- Keine neuen Shader-Programme (Wand- und Dachmaterial der Stadt, Material der Dorf-Requisiten und Klone davon), keine Lichter; höchstens
  15 Texturen je Programm (Test: 179 Programme, alle heil).

## Testen

- Unit-Tests: `node --test viz3/test/unit/fassade.test.mjs` (11; in `tools/check.sh`).
- Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9044 --serve gebaeude:ratscher,schleusingen` (Bilder in
  `out/gebaeude/`), Abschnitt `perf` lädt zum Vergleich `?nofassade`. Themen-Tests `viz3/extra/gebaeude/tests.txt`.

## Für den Lead

- **Zusammenführen**: neue Module `fassade/fassade_audit.js` (vor `welt/schleusingen.js`) und `fassade/fassade.js` (nach
  `schleusingen/si_innen.js`) in `modules.txt`; geänderte eigene Datei `welt/schleusingen.js` (die Zeile `LAEDEN.skipStadt` bleibt). Keine
  gemeinsame Datei geändert; `haeuser/haeuser_heute.js` nicht angefasst (nichts außen Sichtbares darin). Neu für alle: ein Boden-Anbieter
  `KERN.provide('ground', …, 11)` (nur auf den Stufen vor Türen, sonst `undefined`), Fenstername `FASSADE`, `FAUDIT`; `?nofassade`.
  `FASSADE` hängt sich an `GEB.skip` an (das von `laeden` bleibt vorne: `prev(b) || …`) und mischt Geometrie in die Wand-Meshes der
  ETHOS-Zellen (`GEB.Z.cells[…].meshes`, gleiches Attribut-Layout; `gebaeude.js` gibt sie beim Wegwerfen wie bisher frei).
- **Getestete Stände**: Lauf 3 (`f958ce6e3`) ganz grün; Lauf 4 (`67d381d80`) grün bis auf den Vergleich des ganzen Bilds am Markt (Leute
  und Autos, siehe „Leistung“ – der Test misst seither anders); Lauf 5 (Stufen, schmale Tür, Test-Umbau) siehe Bericht an den Lead. Die
  Themen-Tests (`viz3/extra/gebaeude/tests.txt`): `gebaeude` (Ratscher; Schleusingen mit `perf`), `schleusingen`, `schleusingen_innen`
  (zwei Teile), `haeuser` (Bilder), `laeden`.
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

- **Innen passend zu außen** (`innen-real`): die neuen Fenster an freien Brandwand-Strecken fehlen drinnen (siehe „Für den Lead“,
  `FASSADE.fenster(id)` gibt sie); Hoftüren führen nicht hinein.
- **Ratscher**: 16 Haustüren mit einem Nachbargebäude 0,7 m davor bleiben (erklärt: der Grundriss der Häuser von innen hängt an ihnen; eine
  verlegte Tür bräuchte `world/village.js` und `HAEUSER`). Hoftore in den Lücken zwischen den Gebäuden der Bauernhöfe sind nicht gebaut
  (die Höfe sind offen begehbar – realistisch wäre ein Tor, das man öffnet).
- **Burg**: das Osttor ist in OSM ein Tunnel (`layer=-1`) – hier ebenerdig mit Rampe; die Treppe vor dem Westtor folgt der OSM-Linie
  (gerade, 25,7 m), die Höhen kommen vom Gelände der Kacheln (Copernicus-Oberflächenmodell: um die Burg ungenau).
- **Gelände**: neben großen Gebäuden hat das Oberflächenmodell der Kacheln Buckel (die Gebäude stecken darin); die Höfe und Durchgänge sind
  geebnet, die Straßen ringsum nicht (`welt/welt.js`, DGM1 Thüringen würde es lösen).
- **Weitere OSM-Treppen** (24 in der Altstadt) sind nicht als Treppen gebaut – nur die vor dem Burgtor; das Werkzeug dafür liegt in
  `welt/schleusingen.js` (`stairFrom`, `addStair`, `stairGeo`).
- **ETHOS-Zellen**: geprüft und korrigiert werden Türen und Fenster; Höfe und Durchgänge nicht (Stadtrand, Gewerbe, Dörfer – Höfe zur
  Straße offen); der Test prüft die Zellen um Schleusingens Markt.
