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
    „Am Bild weitermalen“ (fünf Schritte, dann „Neues Bild beginnen“: Landschaft, Stillleben, Abstrakt). Lampe mit Schalter an der Tür
    (wie bisher, Schlüssel `holzhaus`).
  - Ortsname „Atelier“, Menü → Orte „Atelier“ (`KERN.spot`), Startsituation `?szenario=atelier` (drinnen an der Tür).
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
  Bettwäsche, Bilder – und die Einrichtung: im Bungalow das Sofa (Polstersofa, schlankes Holzsofa, Chesterfield, Landhaussofa mit Volant,
  Tagesbett), den Couchtisch, den Lampenschirm um die Glühbirne (Papier, Falten, Gitter, Rattan), Pflanzen (auch hängend), Schaffell,
  Teller und Uhr, Bogenlampe, Makramee, Lichterkette, Sitzkissen; im Atelier Lampenschirm, Bilder, Kissen, Pflanzen, Schaffell, Korb, Trockenblumen,
  Metallhocker, Makramee, Lichterkette; im Wohnwagen Vorhänge, Kissen, Tischdecke, Läufer, Steppdecke, Blumen. Die Akzentfarbe färbt
  Kissen, Vasen, Becher.
- Gespeichert in **`pav-stil-v1`** (eine Zeile in `core/save.js`): `{ v: 1, h: { bungalow|atelier|wohnwagen: { s: Stil, a: Akzent } },
  x: { atelier: { sofa, bowls, fired, pic, motif }, wohnwagen: { bed } } }`.
- Ereignisse (`KERN.on`): `einrichtung:stil` { house, style, acc }, `einrichtung:sofa`, `einrichtung:schale`, `einrichtung:brand`,
  `einrichtung:bild` – für Aufgaben oder Statistik.

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

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8983 --serve einrichtung:nogeo=1` (≈ 10 min): Atelier von der Tür und aus
  den Ecken, Staffelei, Töpferscheibe, Schaukelstuhl (schaukelt), Klappsofa (ausklappen → hinlegen → aufstehen → einklappen, Kollision),
  Brennofen, Nacht mit Lampe; Wohnwagen von der Tür (Bett rechts), Bett, Sitzecke, außen; jeder Stil jedes Gebäudes (Bilder
  `stil_<haus>_<stil>.jpg`), Akzentfarben, **Zahl der Shader-Programme vor/nach allen Stilen gleich**, Feld „Einrichtung“; Neuladen behält
  Stile, Akzente und das ausgeklappte Sofa. Einzelne Teile: `only=atelier+caravan+styles+reload`.
- `garten` (Gartentest) prüft Ort „Atelier“ und „Setzlinge gießen“ jetzt im Gewächshaus.
- Bei GitHub: `viz3/extra/einrichtung/tests.txt` (einrichtung, garten), Bilder im Artefakt `out`.

## Für den Kern-Chat (gemeinsame Dateien)

- `core/save.js`: eine Zeile `pav-stil-v1` (mit Prüfung). `shell/menu.html`: ein Eintrag „Gartengebäude“ (Gestalten) und der Ort
  „Holzhaus“ heißt „Atelier“. `shell/parts.txt`: `css/einrichtung.css` nach `css/garten.css`. `modules.txt`: drei Module unter
  `garden/garten_in.js`.
- `test/garten.py`: zwei Prüfungen angepasst (Ort „Atelier“; Gießen im Gewächshaus). `garden/greenhouse.js`: unteres Regalbrett mit drei
  Anzuchtschalen und „Setzlinge gießen“ (vorher im Holzhaus).
- Bitte nachtragen: `docs/ARCHITECTURE.md` (Abschnitt 6: `STIL`, `ATELIER`; Abschnitt 8: `pav-stil-v1`; Modulkarte), `docs/CHANGELOG.md`.
- Neue `window`-Namen: `STIL`, `ATELIER` (nur für Tests).
