# Dorfkern nach Falkos Video (feat/dorfkern, 30.10.2026)

Wunsch von Falko (30.10.2026, 0:31): „… einen Rundumblick 360 Grad in der Dorfmitte, das du bitte analysierst und nutzt, um ein realistischeres
Abbild des Dorfkerns darzustellen. Schau dir genau an, wo es sich befindet … nutze auch die anderen Bilder im Video, um ein möglichst
realistisches Bild zu zeichnen von den Häusern und Umgebungen." Grundlage: sein Video `IMG_1119.mov` (10.04.2023, 15:26, Ostermontag,
iPhone SE 2, 24 s, ein Schwenk im Stand neben einem blauen Auto) und sein Foto von Anger 15 (gleiche Zeit). **Beides ist privat und liegt
nicht im Repo** – hier stehen nur die daraus gemessenen Zahlen. Das Video vom Innenraum von Anger 15 ist (wie gewünscht) nicht verwendet.

## Was es gibt

- **Die Häuser um den Anger, wie sie sind** (`world/dorfkern_data.js`, `DKDATA.houses`, angewendet in `world/village.js` `styleOf`):
  16 Gebäude bekommen statt des Zufalls aus der Gebäudenummer ihr Aussehen aus einer Tabelle – Stil, Putz- oder Schindelfarbe, Schieferton
  (blauschwarz, silbergrau, mittelgrau, farbige Schindeln), Schmuckband aus Rauten, Giebel in senkrechten Brettern, helle Fensterfaschen,
  Fensterrahmen (weiß, braun, grün), Türfarbe und -seite (die hellblaue Tür von Anger 18), Ziegelfarbe, Schornsteine – und, wo das
  Oberflächenmodell danebenlag, ihre im Video gemessene Traufe und First. Alle anderen Häuser bleiben, wie sie waren.
- **Neu aufgebaute Häuser:** Bei Anger 20, 18 und 16 war das angepasste Dach misslungen (flache Blöcke, im Modell „Scheunen" mit Flachdach),
  Anger 15 und 19 standen als rote Scheune bzw. Halle da. Diese fünf Grundrisse werden geteilt – das Wohnhaus an der Straße, die Scheune
  dahinter (OSM fasst beides zu einem Gebäude zusammen) – und bekommen neue Wände und ein Satteldach (Firstrichtung, Traufen links und rechts,
  Firsthöhe, Lage des Firsts; Anger 20 und 19 mit tiefer gezogener Rückseite wie im Video). Die alten Wandvierecke fallen weg, die Teile
  heißen in `VILLAGE` 4000+ (`VILLAGE.parts`: Aussehen, Dach, ursprüngliche Nummer; `VILLAGE.roofZ(teil, x, y)` die Dachhöhe). Anger 18 trägt
  zur Straße zwei Gauben in Schiefer mit weißem Fenster.
- **Fassaden-Shader** (ein Programm wie bisher): Schiefertöne und Schindeln in der Hausfarbe (das Ocker von Anger 21), Giebel in Brettern
  (ganz, ab 1,5 m über der Traufe oder nur die Spitze), Fensterfaschen, grüne und graue Rahmen, hellblaue und Eichentüren, ein neuer Stil
  „Schiefer unten, Fachwerkgiebel" (`ST.SLATE_FWG`, Anger 11). Codes in `aC.a` (Schieferton ×512) und `aD.w` (Bretter ×16, Faschen ×64).
  Eine einzelne Fassade kann anders aussehen als das Haus (`faces`: Anger 13 hat zur Straße dunklen Schiefer mit Rautenband und Vordach,
  am Westgiebel helle Schindeln).
- **Der offene Platz** (`world/dorfkern.js`, `DORFKERN`): der Brunnen vor Anger 15 (OSM `man_made=water_well`) als achteckige Sandsteinmauer
  mit Abdeckplatten, Becken, Stufen nach Süden und hölzernem Pumpenpfosten; braune und grüne Bank, grüne Tonne; Betonpflaster mit fast
  bündigem Granitbord um den Brunnen und als Parkstreifen am Südrand der Straße (dort stand Falko); die große und die gekappte Linde am
  Brunnen und die junge Linde auf der Wiese als 3D-Kronen – Kopien der Dorflinde, gedreht, auf den Stämmen aus dem Video; der Stamm bis zum
  Kronenansatz gestreckt, die Krone in die übrige Höhe gedrückt, Stamm und Krone je auf ihre eigene Breite (große Linde 13 m, Kronenansatz
  3,8 m, Kronenradius 6 m, Stamm 65 cm; gekappte 8 m mit kleinem Kopf ab 4,6 m; junge 8 m); auf der leichtesten Stufe „schnell" stehen
  stattdessen die billigen Kartenbäume des Kronenmodells auf denselben Stämmen. Auf der Wiese die Drehscheibe des Spielplatzes (sah zuerst
  wie ein Picknicktisch aus), Tonne und Balkenbank, die geschnittenen Hecken (die nahe am Parkstreifen und die quer über die Wiese, Lage aus
  ihren Fußpunkten im Video). Betonmasten mit der Freileitung auf der Nordseite der Straße; der Süßigkeitenautomat mit weißer Front zur
  Straße, tiefer als der Briefkasten, der dahinter hervorschaut; der Staketenzaun (braune Latten, rotbraune Pfosten) an der Wiese hinter der
  Haltestelle und die weiße Kiste dahinter (2 m hoch, in der Richtung 33–47° wie im Video); die kleinen Vordächer von Anger 23 und 13, der
  geschnitzte Wegweiser und die Blumenschale vor der Schule; in den Osterwochen (Palmsonntag bis Weißer Sonntag, `DORFKERN.isEaster`) ein
  Bogen mit bunten Eiern auf der Ostseite des Brunnens, wo im Video und auf dem Foto auch die Tonne steht. Alles aus dem Baukasten von
  `world/village_props.js` mit dessen Materialien und dem von `world/village_near.js` – **keine neuen Shader-Programme**; vier Meshes für
  den Platz, je Linde Rinde und Laub mit den Materialien der Dorflinde; Kollisionen vor `world/worldcol.js`.
- **Bushaltestelle wie im Video** (`world/village_props.js`): brauner Holzrahmen mit weißen Feldern und Andreaskreuzen an Rückwand und Seiten,
  Flachdach mit Blende, Bank – Lage und Richtung aus dem Video; die drei Laternen, die das Video zeigt (am Briefkasten, vor Anger 17, vor
  Anger 23), stehen fest; die Dorflinde mit dem Bankring steht in der Richtung, in der das Video ihren Stamm sieht.
- `?dorfkern=0` lädt den Dorfkern wie vorher (für Vergleiche und den Test).

## Die Kamera des Videos

Rundblick in 10 Bildern je Sekunde, Drehung von Bild zu Bild aus SIFT-Merkmalen (reine Drehung, Kabsch mit RANSAC; Autodach und naher Boden
ausgeblendet), die Senkrechte aus 12 senkrechten Kanten (Masten, Haltestellenpfosten, Hausecken), Brennweite, Standort und Richtung aus
16 Landmarken (Ecken und Giebelspitzen der alten Schule, von Anger 15, 17, 20, 23 und 19, Briefkasten, Haltestelle nach OSM):

| Größe | Wert |
|---|---|
| Standort | x 248,8, y −107,1 (Südrand der Straße am Anger, 7 m von der GPS-Angabe des Videos, die ±36 m genau ist) |
| Augenhöhe | 1,6 m über dem Boden (über das Autodach hinweg) |
| Blickrichtung erstes Bild | 158,7° (Süd-Südost, auf Brunnen, Anger 15 und 17) – der Schwenk geht gegen den Uhrzeigersinn, ~310° in 24 s |
| Brennweite | 880 px bei 960 px Breite (57,2° waagrecht) |
| Drift | die Merkmalskette verliert in den letzten 7 s 10,7° (lineare Korrektur ab Bild 170) |
| Restfehler | 1,2° (rms über die Landmarken) |

Bildvergleiche (Video | Modell vorher | Modell nachher) liegen nur im Scratchpad der Sitzung (sie enthalten Falkos Bilder); der Test
`viz3/test/dorfkern.py` rendert die Modellseite derselben Blicke (`out/dorfkern/b_*.jpg` vorher, `a_*.jpg` nachher, `p_anger15.jpg` Fotoblick).
Wichtig für solche Bilder: `GAME.view(…, fov)` allein reicht nicht – die Kamera setzt im Gehen `cam.fov = window.FOVX || 70`
(`game/camera.js`); für die Brennweite des Videos `window.FOVX = 34.1` (senkrecht, 960 × 540).

## Die Gebäude (Tabelle in `world/dorfkern_data.js`)

Nummer = `VILLAGE`-Gebäudenummer (aus `world/ratscher.js`), Adresse aus OpenStreetMap (`addr:*`, Adresspunkte im Grundriss). Höhen über dem
Fuß, gemessen im Video (Bildpunkt von Traufe bzw. First über der bekannten Ecke, abzüglich des Fußpunkts derselben Ecke).

| Nr. | Adresse | Wie es aussieht | Höhen | Video |
|---|---|---|---|---|
| 215 | Ratschner Anger 24 (alte Schule, 1828) | wie bisher (rotes Fachwerk auf Weiß, Schiefergiebel, Dachreiter); höher | Traufe 3,8 m, First 9,7 m (vorher 2,8 / 8,8) | 12–19 s |
| 250 | Ratschner Anger 15 | zweigeschossig, dunkler Schiefer mit hellem Rautenband, Giebel über dem Obergeschoss in braunen senkrechten Brettern, weiße Fenster mit hellen Faschen, braune Haustür an der Westseite mit Stufen, rotbraune Ziegel, zwei Schornsteine; neu aufgebaut, Scheune dahinter | Traufe 5,1 m, First 9,8 m | 0–4 s, Foto |
| 247 | Ratschner Anger 17 | Erdgeschoss apricotfarben verputzt, darüber dunkler Schiefer, weiße Fenster, rotbraune Ziegel | Traufe 4,7 m, First 7,4 m (vorher 5,6 / 8,2) | 0–4 s, Foto |
| 245 | Ratschner Anger 19 | hellgrün verputzt, braune Fenster, Giebel zur Straße, Dach im Osten tief heruntergezogen; neu aufgebaut, Scheune dahinter | Traufen 4,6 / 2,9 m, First 8,1 m | 0 s, 22–24 s |
| 242 | Ratschner Anger 21 | ockerfarbene Schindeln mit Rautenband, braune Fenster, dunkelbraune Ziegel | Traufe 4,3 m, First 8,8 m | 20–24 s |
| 240 | Ratschner Anger 23 | mittelgrauer Schiefer mit Rauten im Giebel und Band, braune Fenster, Haustür zur Straße unter einem roten Vordach, Laterne davor | Traufe 6,3 m, First 10,8 m | 20–24 s |
| 216 | Ratschner Anger 26 | ocker verputzt, langes Haus an der Einmündung, braune Fenster | – | 19–21 s |
| 213 | Ratschner Anger 20 | cremeweiß verputzt, grüne Sprossenfenster (fünf je Geschoss), Giebelspitze in Brettern, Sandsteinsockel, rote Ziegel; Rückseite tief heruntergezogen; neu aufgebaut, dahinter der niedrige Flügel und die Scheune: weiße Wände unter großen roten Dächern, dunkle Schiefergiebel | Traufen 4,8 (Straße) / 2,6 m, First 8,7 m; Flügel Traufe 2,8 m | 4–10 s |
| 212 | Ratschner Anger 18 | dunkler Schiefer, weiße Fenster mit Faschen, hellblaue Haustür (mit Oberlicht) zur Straße, zwei Schiefergauben, rote Ziegel; neu aufgebaut | Traufe 4,8 m, First 8,7 m | 4–9 s |
| 211 | Ratschner Anger 16 | dunkler Schiefer, weiße Fenster, rote Ziegel; neu aufgebaut | Traufe 4,9 m, First 9,2 m | 4–8 s |
| 208, 207 | Ratschner Anger 14, 12 | die Reihe dunkler Schieferhäuser entlang der Straße, weiße Fenster | – | 4–8 s |
| 205 | Ratschner Anger 10 | dunkler Schiefer, weiße Fenster (vorher zufällig Backstein) | – | 4–5 s |
| 252 | Ratschner Anger 13 | zur Straße dunkler Schiefer mit Rautenband, Haustür unter rotem Vordach; Westgiebel in hellen cremefarbenen Schindeln | – | 0–6 s |
| 253 | Ratschner Anger 11 | dunkler Schiefer, Giebel in Fachwerk (dunkle Hölzer, weiße Felder) | – | 3–6 s |
| 214 | (keine Adresse) | der niedrige Backsteinbau nördlich der Schule, rote Ziegel | – | 11–18 s |

## Quellen

- Falkos Video und Foto (privat, nicht im Repo, nicht veröffentlicht).
- OpenStreetMap (ODbL, schon in den Quellen): Adressen, `man_made=water_well` (266,6, −121,1), Bushaltestelle, Briefkasten; abgefragt über
  die OSM-API am 30.10.2026 (nur gelesen, nichts davon im Repo außer den Adressen in der Tabelle).
- Wikimedia Commons, Aschroet (2026, CC0): „Ratscher, Schleusingen 1–7" (Schule, Dorflinde, Straße, Brunnen) – zum Abgleich angesehen, nicht
  verwendet als Textur.
- Luftbild und Oberflächenmodell (`viz3/dist/geo`), Kronenmodell (Bäume).

## Offen (was das Video nicht zeigt)

- Rückseiten und Höfe, die Scheunen hinter den Häusern (ihr Aussehen ist geschätzt; bei Anger 20 sind Flügel und Scheune ein Teil mit
  einem Dach, im Video zwei Dächer und ein Stück Fachwerk), die Südseite der Schule, der Seitenflügel von Anger 17 mit geschweiftem Dach.
  Gauben nur bei Anger 18.
- Die Bäume sind belaubt (das ganze Modell zeigt Sommer), das Video zeigt sie kahl im April; die Linden sind Kopien der Dorflinde (eine Form,
  gedreht, gestreckt und skaliert) – die gekappte Linde am Brunnen hat im Video keine Krone, nur Köpfe (im Modell ein kleiner Sommerkopf).
- Vom Spielplatz auf der Wiese steht nur die Drehscheibe (die Rutsche und die Tische hinten an der Dorflinde fehlen); die Laternen am Platz
  sind im Video hellgrau, im Modell schwarz wie alle Laternen des Dorfs; der Osterstrauch mit Eiern am Briefkasten fehlt.
- Hecken, Drehscheibe, Balkenbank und Tonne liegen auf Strahlen des Videos auf dem Boden (aus zwei Blicken, mit dem Gefälle des
  Geländes) – auf 1–2 m genau; die Lage der Dorflinde nur aus der Richtung.
- Die Freileitung hängt in geraden Stücken (keine Isolatoren), der Automat ist schlicht.

## Testen

- `python3 viz3/test/run.py --serve dorfkern` (zwei Ladevorgänge: `?dorfkern=0` und normal): Tabelle angewendet, neu aufgebaute Häuser,
  offener Platz mit Kollisionen, Ostereier nur in den Osterwochen, Haltestellenname, Texturen je Shader, Bildzeit und Draw-Calls am Anger auf
  „schnell" nicht schlechter als vorher (Median + 10 % + 25 ms), keine Fehler; Bilder in `out/dorfkern/`.
- `viz3/extra/dorfkern/tests.txt` lässt auf `feat/dorfkern` außerdem `v16e` (load, places, near, walk, gl) und `dorf` (door, inside) laufen.
- GitHub-Lauf 40986728854 (2d30655, 30.10.): smoke, dorfkern 14/14, v16e, dorf grün; am Anger auf „schnell" Bildzeit (Median) 9 → 5 ms,
  Draw-Calls [39, 41, 267] → [45, 51, 260] in drei Blicken, Shader-Programme 146 → 145, höchstens 15 Texturen je Fragment-Shader, 342
  Gebäude (337 + 5 geteilte), Aufbau des Platzes 149 ms.

## Für den Kern-Chat

- Gemeinsame Dateien: `viz3/src/modules.txt` – zwei Marken `# feat/dorfkern` (vor `world/village.js` die Daten, nach
  `world/village_near.js` der Platz); `viz3/test/v16e.py` zählt die geteilten Häuser mit (337 ≤ n ≤ 350); `world/village_near.js` exportiert
  `VNEAR` und `VNEAR.mat()`, `world/village_props.js` `VPROPS.mat` (Materialien für den Platz).
- Neue `window`-Namen: `DKDATA`, `DORFKERN` (für ARCHITECTURE.md). Kein neuer Speicher-Schlüssel.
- `docs/PARALLEL.md` habe ich nicht geändert (Auftrag: nur auf `feat/dorfkern` pushen).
