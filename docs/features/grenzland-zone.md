# Grenzland: die Grenz-Zone am Grünen Band bei Eisfeld (Kapitel 2, Etappe 2)

Hilfs-Agent `zone` des Grenzland-Chats, Branch `feat/grenzland-zone` (Auftrag `docs/plans/auftraege/grenzland5-zone.md`, gemeinsam
`grenzland5-gemeinsam.md`; Falko 17.11.2026 22:26 „Ok dann weiter“, 18.11. 18:42: erster fester Stand bis 20 Uhr, Heide, Museum und
Einzelheiten danach).

## Was es gibt

- **Die Zone hat ihren eigenen Boden.** Sie liegt ~13 km südöstlich vom Garten, jenseits aller Kachelsätze der Region und jenseits
  des 120-m-Geländes von `world/ratscher.js`. Deshalb bringt sie einen kleinen Kachelsatz im Format von `tools/welt` mit
  (`viz3/extra/grenzland-zone/dist/grenzland-zone/welt/`, ~7,7 MB): Stufe 10 und 11 über 2,8 × 1,2 km (UTM 636 300–639 100 /
  5 583 200–5 584 400), Stufe 12 nur entlang des Kolonnenwegs, am Grenzturm und an der Heide (85 Kacheln, `has`-Liste). `welt/welt.js`
  zeichnet ihn wie jeden anderen Satz (`WELT.addSet` mit eigener Adresse, Haken W1/W2 des Suhl-Chats), auch die Höhen für `KERN` und
  das „frei“ für die Füße kommen von dort.
- **Gelände:** das **DGM1 Bayern** (1 m, Gelände ohne Bäume, CC BY 4.0) – seine Grenzkacheln reichen einige hundert Meter nach
  Thüringen hinein, also über den ganzen Grenzstreifen und den Kolonnenweg; wo es endet (der Grenzturm, der Norden), Copernicus GLO-30
  mit abgesenkten Kronen, an den Rand des DGM1 angeglichen. Das thüringische DGM1 ist weiter nur hinter einem CAPTCHA zu haben.
  Straßen, Parkplatz und das Bunkerfundament sind eben eingeschnitten, der Kolonnenweg zuletzt (sein geglättetes Längsprofil gewinnt).
- **Luftbild:** DOP Thüringen und DOP20 Bayern zusammengesetzt (jedes ist jenseits seiner Landesgrenze weiß), die Farben des bayerischen
  an das thüringische angeglichen.
- **Der Kolonnenweg** (OSM: `surface=grass_paver`, 2,6 km in der Zone): zwei Spuren aus Lochbetonplatten 0,75 × 2,5 m (Maße nach
  Wikipedia), 0,75 m Gras dazwischen, Fugen von 3,5 cm, vier Reihen Löcher mit Erde, Moos und Gras gefüllt; je Platte ein wenig Spiel,
  einige gebrochen, abgesackt oder fehlend (immer dieselben), verwittertes Grau. Instanzen je ~120 m: nah mit Löchern, weiter als glatte
  Platten (`VEG`-Stufen, 45 m). Man fährt ihn mit der Simson; Grasbüschel zwischen den Spuren und an den Rändern.
- **Der Streifen und die Heide:** Heidekraut (im Dezember braun) dort, wo das Luftbild Heide zeigt (Klasse „Heide“ der Auswertung des
  Luftbilds), junge Kiefern und Birken darin; die **Waldränder** aus 24 615 Bäumen der Auswertung (Fichten/Kiefern in den Beständen,
  Birken und Laub im Jungwuchs, Höhen nach Copernicus minus Gelände, am Rand niedriger) – fern als Kreuzkarten aus dem Atlas von
  `world/ratscher.js` (dessen Material, kein neues Programm), innerhalb von 45 m als 3D-Bäume des Gartens; Stämme halten Fußgänger und
  Fahrzeuge auf. Ein **Beobachtungsstand** (erfunden, wie sie in Schutzgebieten stehen) am Rand der Heide.
- **Reste:** Betonpfähle des alten Zauns auf der Grenzseite (einer schief, einer abgebrochen, an einem ein Fetzen Draht), **Grenzsteine**
  aus Granit („DDR“ / „B“) – einer dort, wo OSM ihn kennt, drei auf der alten Grenzlinie –, die **Tafeln** am Nordende der Heide, wo OSM
  sie hat: „Kolonnenweg und Grünes Band“ (unser Text mit Quellen), Naturschutzgebiet Görsdorfer Heide, Grünes Band – Nationales
  Naturmonument; „Tafel lesen“ zeigt den Text. **Hochsitze** an den sieben Stellen von OSM.
- **Der Grenzturm von außen:** der Turm der früheren Grenzübergangsstelle Eisfeld/Rottenbach (eröffnet 21.6.1973, Bundesarchiv) an der
  OSM-Stelle – Schaft 4,2 m, verglaster Raum oben, Brüstung, Scheinwerfer, die Tür zu –, daneben drei Mauerelemente, ein Stück
  Streckmetallzaun auf Betonpfosten, der Unterstand mit der Tafel der Gedenkstätte. Öffnungszeiten über `OEFFNUNG.add('grenzturm-eisfeld')`
  (täglich 8–18 Uhr, ohne Gewähr); „Tür“ sagt, ob offen. Hinein geht es in dieser Etappe nicht.
- **Der Bunker von außen (erfunden):** in der Görsdorfer Heide, ~95 m vom Kolonnenweg, das alte Fundament eines abgebauten Turms (4,2 m
  im Quadrat, Moos, vier rostige Anker, ein Rohrstumpf – man steht darauf), dahinter ein Erdhügel mit einer Betonfront und einer rostigen
  Eisentür mit neuem Vorhängeschloss: „Tür ansehen“ → „Abgeschlossen …“ (`KERN.emit('grenzland:zone:tuer')`). Hinein geht es in Etappe 4.
- **Laden und Freigeben:** nur im Modus und heute (nicht 1989), wenn man näher als 2,6 km kommt oder eine Mission sie braucht
  (`GLZONE.need`); frei, wenn man 3,6 km weg ist und 15 s keiner sie braucht – Meshes, Straßen (`FAHRT.drop`), Kollisionen, Aktionen,
  die `VEG`-Einträge, der Bedarf an Kacheln.
- **Straßen der Zone** gehen als Satz an `welt/fahrt.js` (`FAHRT.add`, nichts geschnitten; der Kolonnenweg darin nur als schmale Spur,
  damit die Straßenkarte kein Betonband zwischen die Plattenspuren malt): das Radar zeigt sie, der Ortsname, der Griff der Räder; die
  Fahrzeuge dürfen dorthin, wo die Kacheln der Zone gezeichnet sind (`FAHRT.ground`).
- **Hinkommen:** `GLZONE.hin({ ort, mit })` – ein Schnitt mit Abblende („Grünes Band · bei Eisfeld“): erst zu Fuß dort (die Kacheln
  kommen um den Fußgänger), das Fahrzeug erst, wenn sein Boden gezeichnet ist. Über die Straße: wer auf der A 73 aus Schleusingen nach
  Südosten über das Ende der Straßendaten fährt (bei x 2619 / y −1058), kommt an der Ausfahrt Eisfeld-Süd an (K 530 Richtung Grenzturm);
  auf der K 530 nach Norden aus der Zone geht es zurück auf die A 73 Richtung Schleusingen. `GLZONE.anfahrt()` ist die echte Strecke für
  das Radar (Schleusingen → L 3247 → A 73 → Eisfeld-Süd → K 530, 20,9 km, OSRM auf OSM-Daten); `GLZONE.route(true)` zeichnet sie
  magenta ins Radar und setzt eine Nadel an den Parkplatz. Der Autopilot (`navi/navi.js`) hat keine öffentliche Zielliste – ein Ziel
  „Grünes Band“ dort wäre ein Haken für den Suhl-Chat (Für den Lead).

## Schnittstelle (für `kapitel2`)

`GLZONE.da()` (gebaut, und der Boden unter dem Spieler gezeichnet) · `GLZONE.ort(name)` → `{ x, y, z, name }` für `kolonnenweg_a`
(am Grenzturm), `kolonnenweg_b` (Richtung Görsdorf), `bunker`, `museum`, `heide`, `parkplatz`, `hide`, `ankunft` · `GLZONE.weg()` →
der Kolonnenweg `[[x, y, z], …]` alle 2 m · `GLZONE.anfahrt()` → `[[x, y], …]` · `GLZONE.hin(o)` → Promise (`o.ort`, `o.mit`:
`'moped'` | `'fuss'` | sonst das Fahrzeug, in dem man sitzt) · `GLZONE.need(id, an)` · `GLZONE.route(an)` · `GLZONE.state()` ·
`KERN.emit('grenzland:zone', { an })`. Daten und Texte: `GLZDATA` (`gl_zone_data.js`, rein).

## Daten

`tools/grenzland/zone_gruenes_band.py fetch|build --raw <Ordner>` lädt OSM (API-Ausschnitt), die DGM1-Kacheln Bayerns, Copernicus,
beide Luftbilder (WMS) und die Strecke (OSRM) in einen Rohordner außerhalb des Repos und baut daraus den Kachelsatz und `zone.json`
(Kolonnenweg mit Profil, alte Grenze, Wege im Format von `fahrt/strassen.json`, Orte, Bewuchs als 2-m-Raster, 24 615 Bäume an den
Waldrändern, Anfahrt). Quellen und Lizenzen: `meta.json` → `attribution`, `manifest.json` → `credits_add`.

## Tests

- `viz3/test/grenzland_zone.py` – Abschnitte `weg` (laden, Boden auf dem Profil, 300 m mit der Simson, Zeichenaufrufe, Dreiecke,
  Programme, Bilder Tag und Dämmerung), `bunker` (Fundament, Tür, Wand, Ortsname, Bilder), `heide` (Heidekraut, Gras, Bäume, Tafeln,
  Bilder Tag und Dämmerung), `turm` (Tür, Tafel, Öffnungszeiten, Ortsname, Bild), am Ende Verlassen und Freigeben. Bilder
  `out/grenzland_zone/`. In `tests.txt` zwei Zeilen: `weg,bunker` und `heide,turm`.
- `viz3/test/unit/grenzland_zone.test.mjs` – Linien, Platten (Maße, Fugen, Spuren), Texte mit Quellen, `zone.json`.

## Für den Lead

- **Zwei Zeilen** in `gl_modus.js` (tick, stop; markiert `// grenzland-zone`), **zwei Modulzeilen** in `modules.txt` nach `gl_lager.js`.
- **Größe:** ~8,4 MB im Extra (Kacheln 7,7 MB, `zone.json` 0,7 MB) – jede Datei klein, zusammen etwas über „ein paar hundert kB“; Stufe 11
  ist der größte Teil (3 MB). Wenn die Seite knapp wird: Stufe 12 entlang des Wegs behalten, Stufe 11 mit niedrigerer Qualität.
- **Wunsch an den Fotorealismus-Chat (Bewuchs):** `BWKARTE` kennt nur seine eigenen Zellen; außerhalb wächst nichts. Ein Weg, dass eine
  Zone eigene Karten mitbringt (etwa `BWKARTE.zone(base, zellen)`), gäbe der Heide und dem Streifen Gras und Blumen.
- Der Partner, der zu Fuß folgt, bleibt bei `hin()` zurück (nur wer mitfährt, kommt mit) – `gl_modus.js` kennt das Nachholen.

## Offen

- Rehe in der Dämmerung (die Tiere des Grundspiels stehen nach `tiere/` an ihren Orten; ein Rudel am Heiderand wäre ein Haken dort),
  Pfützen in den Löchern nach Regen, der Waldboden unter den Kronen (das Luftbild zeigt dort grüne Kronen von oben).
- Der Speichertest (`grenzland_speicher.py`) mit der Zone; das iPhone: die Zone braucht ~105 Kacheln (wie Schleusingen).
- Die kurze Abzweigung des Kolonnenwegs (364 m) hat am Anschluss eine Stufe im Profil (1,3 m auf 2 m) – sie liegt abseits der Fahrt.
