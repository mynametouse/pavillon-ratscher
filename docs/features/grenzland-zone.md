# Grenzland: die Grenz-Zone am Grünen Band bei Eisfeld (Kapitel 2, Etappe 2)

Hilfs-Agent `zone` des Grenzland-Chats, Branch `feat/grenzland-zone` (Auftrag `docs/plans/auftraege/grenzland5-zone.md`, gemeinsam
`grenzland5-gemeinsam.md`; Falko 17.11.2026 22:26 „Ok dann weiter“, 18.11. 18:42: erster fester Stand bis 20 Uhr, Heide, Museum und
Einzelheiten danach).

## Was es gibt (Stand 1)

- **Die Zone hat ihren eigenen Boden.** Sie liegt ~13 km südöstlich vom Garten, jenseits aller Kachelsätze der Region und jenseits
  des 120-m-Geländes von `world/ratscher.js`. Deshalb bringt sie einen kleinen Kachelsatz im Format von `tools/welt` mit
  (`viz3/extra/grenzland-zone/dist/grenzland-zone/welt/`, ~7,7 MB): Stufe 10 und 11 über 2,8 × 1,2 km (UTM 636 300–639 100 /
  5 583 200–5 584 400), Stufe 12 nur entlang des Kolonnenwegs, am Grenzturm und an der Heide (85 Kacheln, `has`-Liste). `welt/welt.js`
  zeichnet ihn wie jeden anderen Satz (`WELT.addSet` mit eigener Adresse, Haken W1/W2 des Suhl-Chats), auch die Höhen für `KERN` und
  das „frei“ für die Füße kommen von dort.
- **Gelände:** das **DGM1 Bayern** (1 m, Gelände ohne Bäume, CC BY 4.0) – seine Grenzkacheln reichen einige hundert Meter nach
  Thüringen hinein, also über den ganzen Grenzstreifen und den Kolonnenweg; wo es endet (der Grenzturm, der Norden), Copernicus GLO-30
  mit abgesenkten Kronen, an den Rand des DGM1 angeglichen. Das thüringische DGM1 ist weiter nur hinter einem CAPTCHA zu haben.
- **Luftbild:** DOP Thüringen und DOP20 Bayern zusammengesetzt (jedes ist jenseits seiner Landesgrenze weiß), die Farben des bayerischen
  an das thüringische angeglichen.
- **Der Kolonnenweg** (OSM: `surface=grass_paver`, 2,6 km in der Zone): zwei Spuren aus Lochbetonplatten 0,75 × 2,5 m (Maße nach
  Wikipedia), 0,75 m Gras dazwischen, Fugen von 3,5 cm, vier Reihen Löcher mit Erde, Moos und Gras gefüllt; je Platte ein wenig Spiel,
  einige gebrochen, abgesackt oder fehlend (immer dieselben). Gezeichnet als Instanzen je ~120 m: nah mit Löchern, weiter als glatte
  Platten (`VEG`-Stufen, 45 m). Das Gelände darunter ist in den Kacheln auf das geglättete Längsprofil geschnitten (30 m Fenster) – man
  fährt ihn mit der Simson, die Platten liegen 3 cm über dem Boden.
- **Der Bunker von außen (erfunden):** in der Görsdorfer Heide, ~95 m vom Kolonnenweg, das alte Fundament eines abgebauten Turms (4,2 m
  im Quadrat, Moos, vier rostige Anker, ein Rohrstumpf – man steht darauf), dahinter ein Erdhügel mit einer Betonfront und einer rostigen
  Eisentür mit neuem Vorhängeschloss: „Tür ansehen“ → „Abgeschlossen …“ (`KERN.emit('grenzland:zone:tuer')`). Hinein geht es in Etappe 4.
- **Laden und Freigeben:** nur im Modus und heute (nicht 1989), wenn man näher als 2,6 km kommt oder eine Mission sie braucht
  (`GLZONE.need`); frei, wenn man 3,6 km weg ist und 15 s keiner sie braucht – Meshes, Straßen (`FAHRT.drop`), Kollisionen, der Bedarf
  an Kacheln.
- **Straßen der Zone** gehen als Satz an `welt/fahrt.js` (`FAHRT.add`, nichts geschnitten): das Radar zeigt sie, der Ortsname, der
  Griff der Räder; die Fahrzeuge dürfen dorthin, wo die Kacheln der Zone gezeichnet sind (`FAHRT.ground`).
- **Hinkommen:** `GLZONE.hin({ ort, mit })` – ein Schnitt mit Abblende („Grünes Band · bei Eisfeld“), für Missionen und Tests; über die
  Straße: wer auf der A 73 aus Schleusingen nach Südosten über das Ende der Straßendaten fährt, kommt an der Ausfahrt Eisfeld-Süd an
  (K 530 Richtung Grenzturm); auf der K 530 nach Norden aus der Zone geht es zurück auf die A 73 Richtung Schleusingen.
  `GLZONE.anfahrt()` ist die echte Strecke für das Radar (Schleusingen → L 3247 → A 73 → Eisfeld-Süd → K 530, 20,9 km, OSRM auf
  OSM-Daten); `GLZONE.route(true)` zeichnet sie magenta ins Radar und setzt eine Nadel an den Parkplatz.

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

- `viz3/test/grenzland_zone.py` – Abschnitte `weg` (laden, Boden auf dem Profil, 300 m mit der Simson, Zeichenaufrufe, Bilder Tag und
  Dämmerung), `bunker` (Fundament, Tür, Wand, Ortsname, Bilder), am Ende Verlassen und Freigeben. Bilder `out/grenzland_zone/`.
- `viz3/test/unit/grenzland_zone.test.mjs` – Linien, Platten (Maße, Fugen, Spuren), Texte mit Quellen, `zone.json`.

## Für den Lead

- **Zwei Zeilen** in `gl_modus.js` (tick, stop; markiert `// grenzland-zone`), **zwei Modulzeilen** in `modules.txt` nach `gl_lager.js`.
- **Größe:** ~8,4 MB im Extra (Kacheln 7,7 MB, `zone.json` 0,7 MB) – jede Datei klein, zusammen etwas über „ein paar hundert kB“; Stufe 11
  ist der größte Teil (3 MB). Wenn die Seite knapp wird: Stufe 12 entlang des Wegs behalten, Stufe 11 mit niedrigerer Qualität.
- **Wunsch an den Fotorealismus-Chat (Bewuchs):** `BWKARTE` kennt nur seine eigenen Zellen; außerhalb wächst nichts. Ein Weg, dass eine
  Zone eigene Karten mitbringt (etwa `BWKARTE.zone(base, zellen)`), gäbe der Heide und dem Streifen Gras und Blumen.
- Der Partner, der zu Fuß folgt, bleibt bei `hin()` zurück (nur wer mitfährt, kommt mit) – `gl_modus.js` kennt das Nachholen.

## Offen (nächste Stände)

- Die Heide (Heidekraut, Birken, junge Kiefern, Beobachtungsstand), die Bäume der Waldränder (Daten sind in `zone.json`), Gras zwischen
  den Spuren, Reste (Betonpfahl, Grenzstein, Schild „Grünes Band“, Tafel mit Text und Quelle), der Grenzturm von außen mit Öffnungszeiten
  (`OEFFNUNG.add`), Hochsitze, Rehe in der Dämmerung, Pfützen in den Löchern nach Regen.
