# Einrichtung der Gartengebäude: Stile mit einem Klick, das Atelier, das Klappsofa, der Wohnwagen gespiegelt (feat/einrichtung, 23.10.2026)

Grundlage: Falkos Wunsch vom 23.10. 9:54 (Auftrag `docs/plans/auftraege/einrichtung.md`).

## Was es gibt

- **Das Holzhaus ist ein Atelier** (`garden/atelier.js`; Hülle, Nordtür, Dach nach Westen und außen wie bisher in `garden/holzhaus.js`):
  - Töpferecke: Töpferscheibe mit Spritzschutz und Pedal, Hocker, Knettisch mit Ton, Draht, Schwamm und Werkzeug, Tonsäcke,
    Schlickereimer; Regal an der Nordwand mit Tonsäcken, lederharten, geschrühten und glasierten Stücken; kleiner Toplader-Brennofen in
    der Nordostecke mit Steuerung an der Wand.
  - Malecke: Arbeitstisch unter dem Fensterband (Palette, Pinsel in Gläsern, Wasserglas, Farbtuben, Lappen, Skizzenbuch, Klemmlampe),
    Staffelei mit Leinwand (Bild wächst beim Malen), fertige Bilder an den Wänden und an die Wand gelehnt.
  - **Schaukelstuhl** (Südostecke): „In den Schaukelstuhl setzen“ – er schaukelt sacht (Stuhl und Blick), knarzt ab und zu; nach dem
    Aufstehen kommt er zur Ruhe.
  - **Klappsofa als Gästebett** an der Ostwand: „Sofa ausklappen“ – die Lehne klappt in ~1,6 s nach hinten, der Sitz gleitet vor
    (Klick-Klack-Sofa, Bett 1,22 × 1,9 m, Bettzeug liegt dann darauf, die Kissen verschwinden); dann „Hinlegen“ (nachts „Schlafen bis
    7 Uhr“) und „Sofa zusammenklappen“. Zusammengeklappt: „Aufs Sofa setzen“. Die Kollision folgt (Bett tiefer und niedriger). Der Zustand
    bleibt gespeichert.
  - Kleine Arbeiten mit Tipps: an die Töpferscheibe setzen → „Eine Schale drehen“ (die Scheibe dreht und brummt, der Ton wird zur Schale)
    → „Schale zum Trocknen ins Regal stellen“ (bis sechs); „Schalen in den Brennofen“ (Schrühbrand, die Anzeige glüht, danach sind sie hell);
    „Schalen glasieren“ (drei Glasureimer vor dem Regal), „Glasurbrand starten“ – danach glänzen sie in der Akzentfarbe des Ateliers;
    „Am Bild weitermalen“ (fünf Schritte, dann „Neues Bild beginnen“: Landschaft, Stillleben, Abstrakt). Lampe mit Schalter an der Tür
    (wie bisher, Schlüssel `holzhaus`).
  - Kleine Geräusche (im Browser erzeugt, nur in der Nähe): Klick-Klack des Klappsofas (auch die Sitzecke im Wohnwagen), Brummen der
    Scheibe, Knarzen des Schaukelstuhls, Relais des Brennofens, ein Plopp beim Glasieren, Pinselstriche an der Staffelei.
  - Ortsname „Atelier“, Menü → Orte „Atelier“ (`KERN.spot`), Startsituation `?szenario=atelier` (drinnen an der Tür).
  - Im Tagebuch (J): drei kleine Aufgaben als Daten (`core/tasks.js` `TASKS.define`), sie beginnen beim ersten Betreten des Ateliers
    und rücken über die Ereignisse des Ateliers vor: „Töpfern: eine Schale drehen und brennen“, „Malen: ein Bild fertig malen“,
    „Ein Gästebett für Besuch“ – mit Ziel.
  - Beim ersten Betreten eines der drei Gebäude ein Hinweis auf den Knopf „Einrichtung“ (er leuchtet kurz).
  - Die Anzuchtschalen und „Setzlinge gießen“ stehen jetzt im **Gewächshaus** (unteres Brett des Anzuchtregals); Schlauchwagen,
    Schubkarre, Kranz, Blumenkasten und PV-Modul bleiben draußen.
- **Der Wohnwagen gespiegelt** (`garden/carport.js`): von der Tür aus liegt das Querbett jetzt **rechts** (vorn unter dem Panoramafenster,
  1,3 × 2,1 m, Kopf an der Nordseite), daneben die Kleiderschränke, links neben der Tür der Schrank, gegenüber die Küche, hinten die
  Sitzgruppe; die Fenster folgen der Einrichtung, die Tür bleibt. Neu: „In die Sitzecke setzen“, „Ins Bett legen“ und
  **die Sitzecke als Bett**: „Tisch absenken – Bett bauen“ (der Tisch geht auf die Bänke herunter, zwei Polster schließen die Lücke, die
  Laterne fährt mit), dann „Hinlegen“, „Bett wieder zur Sitzecke“ – gespeichert. Deckenleuchte (80er-Kuppel) mit Schalter an der
  Tür: „Licht an/aus“ (sie leiht sich das eine Gartenlicht).
- **Stile mit einem Klick** (`garden/stil.js`, Bungalow und Wohnwagen in `garden/stil_bauten.js`): Feld „Einrichtung“ – Knopf
  „Einrichtung“ oben rechts, solange man in einem der Gebäude ist, und Menü → Gestalten → „Gartengebäude“. Je Gebäude ein Reiter, fünf Stile
  und acht Akzentfarben (Senfgelb, Rost, Flaschengrün, Petrol, Taubenblau, Altrosa, Aubergine, Salbei):
  - Bungalow: Wie heute · Skandinavisch hell · Landhaus · Industrie/Loft · Boho
  - Atelier: Atelier hell · Skandinavisch · Landhaus · Industrie/Loft · Boho
  - Wohnwagen: Wie heute (80er) · Retro 70er · Skandinavisch hell · Landhaus · Boho

  Ein Stil ändert Wände, Decke, Boden (auch Bild und Struktur: Dielen, gekalkt, Eiche, Beton), Möbelholz, Polster, Vorhänge, Teppiche,
  Bettwäsche, Bilder, im Bungalow auch Küchenfronten und Kleiderschrank (bei „Wie heute“ creme und taubenblau wie bisher) – und die
  Einrichtung: im Bungalow das Sofa (Polstersofa, schlankes Holzsofa, Chesterfield, Landhaussofa mit Volant, Tagesbett), den Couchtisch,
  den Lampenschirm um die Glühbirne (Papier, Falten, Gitter, Rattan), Pflanzen (auch hängend), Schaffell, Teller und Uhr, Bogenlampe,
  Makramee, Lichterkette, Sitzkissen; im Atelier Lampenschirm, Bilder, Kissen, Pflanzen, Schaffell, Korb, Trockenblumen, Metallhocker,
  Makramee, Lichterkette; im Wohnwagen Vorhänge, Kissen, Tischdecke, Läufer, Steppdecke, Blumen und eine Hängelampe über dem Tisch
  (70er-Kuppel, Papierkugel, Faltenschirm, Rattan). Die Akzentfarbe färbt Kissen, Vasen, Becher und die glasierten Schalen.
- Gespeichert in **`pav-stil-v1`** (eine Zeile in `core/save.js`): `{ v: 1, h: { bungalow|atelier|wohnwagen: { s: Stil, a: Akzent } },
  x: { atelier: { sofa, bowls, fired, glazed, gfired, pic, motif }, wohnwagen: { bed }, hint } }`.
- Ereignisse (`KERN.on`): `einrichtung:stil` { house, style, acc }, `einrichtung:sofa`, `einrichtung:schale`, `einrichtung:brand` { glaze },
  `einrichtung:glasur`, `einrichtung:bild` – für Aufgaben oder Statistik.

## Technik

- **Keine neuen Shader-Programme**: Jedes Gebäude hat eigene Materialien als Zwillinge der vorhandenen (`garten_kit.js` `twin`: gleicher
  Programmschlüssel), die Stile ändern nur Farben, Rauheit, Bilder (`useMaps`: Dielen/Eiche/Beton/Farbe – gleiche Kanäle) und
  Canvas-Muster (`stil.js` `PATTERN`, `ART`). Einfarbige Teile gehen in die Palette (`paletteize`, jetzt 1024 Felder).
- **Stil-Schicht**: je Gebäude eine Gruppe im Gebäuderahmen (bewegt sich mit der Draufsicht), beim Wechsel verworfen und neu gebaut,
  nach Material zusammengefasst (`mergeGroup`, wenige Draw-Calls, nicht von `render/zmerge.js` angefasst).
- Bewegliches (Sofa: Sitz, Lehne, Bettzeug; Schaukelstuhl; Scheibenkopf; eigene Schalen) sind eigene, zusammengefasste Gruppen.
- Keine neuen Punktlichter: das Atelier nutzt die eine Gartenlampe (`garten_in.js`, Schlüssel `holzhaus`).
- `garden/garten_in.js`: Sitze können jetzt eine eigene Hauptaktion, ein bewegtes Auge (`follow`) und `onSit/onLeave` haben, Labels
  als Funktion; Arbeiten weiter unten registrierter Module bekommen ihren Zustand.
- `garten_kit.js` `picture()`: die Rahmenleisten liegen jetzt um das Bild (vorher eine Leiste in Höhe der Wanddicke).
- Gemessen (GitHub, SwiftShader, `nogeo`): **116 Shader-Programme vor und nach allen 15 Stilen und 8 Akzenten** (keins neu), höchstens
  15 Texturen je Programm. Je Stil-Schicht 4–11 Draw-Calls (≈ 2 300–10 800 Dreiecke; „Wie heute“ im Wohnwagen braucht keine). Die drei
  Gartengebäude zusammen vom Bungalow-Eingang aus (Gartentest): 244 Draw-Calls, 142 000 Dreiecke (auf `src` vor dem Atelier 196 und 138 000)
  – das Atelier hat mehr Kleinteile als die Pflanzhütte, dazu Sofa, Schaukelstuhl und Scheibe als eigene bewegliche Gruppen.

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8983 --serve einrichtung:nogeo=1` (im Chat-Rechner lang, dort besser einzelne
  Teile mit `only=…`): Atelier von der Tür und aus den Ecken, Staffelei, Töpferscheibe, Schaukelstuhl (schaukelt), Klappsofa (ausklappen →
  hinlegen → aufstehen → einklappen, Kollision), Brennofen, Glasieren, Aufgaben im Tagebuch, Nacht mit Lampe, Startsituation, Knopf
  „Einrichtung“ (drinnen da, draußen weg); Wohnwagen von der Tür (Bett rechts), Bett, Sitzecke als Bett (die Laterne wird weggeräumt),
  Deckenlicht, außen; jeder Stil jedes Gebäudes (Bilder `stil_<haus>_<stil>_<n>.jpg`), Akzentfarben, **Zahl der Shader-Programme vor/nach
  allen Stilen gleich**, Feld „Einrichtung“ (auch am Handy); Neuladen behält Stile, Akzente und das ausgeklappte Sofa. Einzelne Teile:
  `only=atelier+caravan+styles+reload`. Bei GitHub ≈ 14 min (23.10. 13:00: 51/51 grün, Gartentest 33/33).
- `garten` (Gartentest) prüft Ort „Atelier“ und „Setzlinge gießen“ jetzt im Gewächshaus.
- Bei GitHub: `viz3/extra/einrichtung/tests.txt` (einrichtung, garten), Bilder im Artefakt `out`.

## Für den Kern-Chat (gemeinsame Dateien)

- `core/save.js`: eine Zeile `pav-stil-v1` (mit Prüfung). `shell/menu.html`: ein Eintrag „Gartengebäude“ (Gestalten) und der Ort
  „Holzhaus“ heißt „Atelier“. `shell/parts.txt`: `css/einrichtung.css` nach `css/garten.css`. `modules.txt`: drei Module unter
  `garden/garten_in.js`.
- `test/garten.py`: zwei Prüfungen angepasst (Ort „Atelier“; Gießen im Gewächshaus). `garden/greenhouse.js`: unteres Regalbrett mit drei
  Anzuchtschalen und „Setzlinge gießen“ (vorher im Holzhaus).
- In `docs/ARCHITECTURE.md` stehen `STIL`, `ATELIER` und `pav-stil-v1` schon (V16o); noch nachzutragen: `WOHNWAGEN` (Abschnitt 6) und in
  `pav-stil-v1` die Felder `x.atelier.glazed`, `x.atelier.gfired` und `x.hint` (der Hinweis beim ersten Besuch). Für `docs/CHANGELOG.md`
  nach V16q: weichere Kissen, Hängelampe über dem Tisch im Wohnwagen (je Stil), Küchenfronten und Kleiderschrank im Bungalow je Stil, die
  Laterne wird beim Bettenbauen weggeräumt, kleine Geräusche (Brennofen, Glasieren, Malen), das Regal im Atelier aufgeräumt.
- Neue `window`-Namen: `STIL`, `ATELIER`, `WOHNWAGEN` (nur für Tests). Der Takt des Knopfes „Einrichtung“ läuft schon über `KERN.tick`
  (`garden/garten_in.js` nutzt wie bisher `window.TICKS`).
