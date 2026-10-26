# Leben auf der Straße: Leute schlendern, Autos fahren, Autos anhalten (feat/verkehr)

Falko, 25.10.2026: „Außerdem sollen ab und zu auch Leute einfach durchs Dorf schlendern oder auch mal mit dem Auto fahren. Auch in
Schleusingen. Ich möchte die Autos auch anhalten können. Wenn es sich anbietet. Ähnlich wie bei GTA.“ – und im Dorf duzen alle den Spieler.

## Was es gibt

- **Zehn Leute aus der Gegend** (`viz3/src/verkehr/verkehr_leute.js`, `VLEUTE`): Bettina (63, Rentnerin mit Dackel Lotte), Sabine (44,
  Grundschullehrerin), Anja (35, Tierarzthelferin mit Hund Bruno), Claudia (41, Bäckerei am Markt), Lea (19, Azubi Kfz), Thomas (54,
  Bauingenieur), Frank (48, Busfahrer), Marco (31, Zimmermann), Stefan (38, Krankenpfleger), Jonas (22, Student) – keiner davon ist einer
  der acht Dorfbewohner. Je Person Name, Geschlecht, Alter, Rolle, zwei Sätze Charakter (für die KI), Figur, wo sie unterwegs ist
  (Dorf, Stadt), Hund oder Tasche, Auto (Farbe), Gruß, ein Wort im Vorbeigehen, zwei bis drei Themen, Sätze als Fahrer. Alle duzen.
- **Figuren**: zehn weitere Microsoft-Rocketbox-Figuren (MIT), gebaut mit `viz3/extra/verkehr/build_figures.sh` →
  `viz3/extra/verkehr/dist/chars/vk_*.json` (0,7–1,2 MB je Figur), bewegt mit den Bewegungen der Spielfiguren (`rbPerson` aus
  `npc/npc_real.js`). Geladen erst, wenn jemand in der Nähe losgeht, nach 15 s ohne Bedarf wieder freigegeben; höchstens vier
  Spaziergänger zugleich (Telefon: zwei). Hund (Dackel, Mischling) und Tasche sind kleine Modelle aus Vertexfarben.
- **Spaziergänger in Ratscher** (`verkehr/verkehr.js`, `VERKEHR`): ab und zu kommt jemand außer Sicht ins Dorf, geht am linken
  Straßenrand (dem Verkehr entgegen; jeder Weg einmal beim Aufbau gegen die Wände geprüft – nie durch Häuser oder Zäune), bleibt an
  Vorgärten stehen, grüßt im Vorbeigehen („Hallo!“ als Untertitel), weicht dem Spieler, geparkten Autos und anderen aus und geht weiter,
  bis er außer Sicht ist. Tagsüber zwei bis drei, abends weniger, nachts fast niemand (Spieluhr). Der Garten und die Höfe von Hubert und
  Ronald bleiben frei.
- **Autos** (`verkehr/verkehr_auto.js`, `VAUTO`): ab und zu fährt ein Auto auf den echten Straßen (`ROADS.ways`) von einem Rand des Ortes
  zum anderen, rechts, im Dorf 30–35 km/h, auf der Landstraße 50 bzw. 70; vor Kurven und Kreuzungen bremst es, die Räder drehen sich, nachts
  leuchten die Scheinwerfer und ein Lichtkegel auf der Straße (keine neue Lampe). Es hält Abstand zum Vordermann, umfährt Fußgänger am
  Rand, wenn die Gegenspur frei ist, und **bremst für den Spieler** (nie hindurch) – bleibt er stehen, wird gehupt. Modell: so groß wie das
  eigene Auto, schlicht, ohne Marke; ein Shader-Programm mit den Autos der Dorfbewohner.
- **Auto anhalten** (Aktionsknopf „Auto anhalten“, wenn eines bis 45 m auf einen zukommt): es fährt an den Rand und hält neben einem, der
  Fahrer fragt. Im Fenster: **Mitfahren** (als Beifahrer, Blick von innen, bis zum Anger, zur Bushaltestelle, zum Markt oder ein Stück
  weiter, dann steigt man rechts aus), **Selbst fahren** (der Fahrer steigt aus, stimmt zu oder murrt; man fährt das Auto mit der Steuerung
  des eigenen Autos – dieselbe Physik; steigt man aus, kommt der Fahrer herüber und fährt weiter; steht es weit weg, holt er es später –
  nichts bleibt gestohlen, kein Schaden), ein paar Sätze reden oder Tschüss.
- **Schleusingen**: dasselbe in der Altstadt (Straßen aus `welt/schleusingen.js`), sobald die Stadt steht; beim Weggehen alles frei.
- **Unterwegs** (zwischen den Orten, auf der Landstraße im Quadrat und auf den Straßen von `welt/fahrt.js` draußen): fährt man selbst, kommt
  ab und zu ein Auto entgegen (aus 400 m Entfernung auf der Gegenspur, fährt vorbei, ist dahinter weg).
- **Ausweichen**: Autos warten kurz hinter einem stehenden Auto (angehalten, geparkt – auch die Autos der Dorfbewohner) und fahren dann
  langsam darum herum, wenn die Gegenspur frei ist; steht der Spieler lange auf der Fahrbahn, wird gehupt und dann langsam um ihn herum
  gefahren. Ein vorbeifahrendes Auto ist zu hören (Reifen, Motor, nach Entfernung).
- **Reden**: „Mit … sprechen“ öffnet ein kleines Fenster (`#verkehrpanel`, Aussehen wie bei den Dorfbewohnern). Mit eingerichteten
  KI-Gesprächen (`npc/ki.js`) redet man frei – alle zehn sind mit `KI.person` angemeldet (Schlüssel `vk_<name>`). Die festen Sätze
  (Gruß, Themen, Fahrer) sprechen sie mit ihrer eigenen Stimme, wenn „Feste Sätze vorlesen“ an ist (`STIMME.say`, `audio/stimme.js`).
- **Platz machen**: fährt man selbst, fahren die Autos vor einem und entgegenkommende an den Rand und langsam, damit man vorbeikommt.

## Ereignisse (KERN.on)

`verkehr:angehalten` { car, who, x, y } · `verkehr:mitfahrt` { car, who, ziel, phase: 'ein' | 'aus' } · `verkehr:selbst` { car, who } ·
`verkehr:zurueck` { car, who, faehrt, geholt } · `verkehr:gruss` { who, text } · `verkehr:ort` { id, state } · `talk` { who: 'vk_…' }.

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8986 --serve verkehr` (Abschnitte `net,walk,night,car,brake,wave,ride,selbst,
  yield,fahrt,stadt,prof,gl`, z. B. `verkehr:walk,car`); Bilder in `out/verkehr/`. Bei GitHub `feat.yml` (Artefakt „out“).
- Einheitentests: `node --test viz3/test/unit/verkehr.test.mjs` (Netz, Fahrspur rechts, Fußgänger links, Kurven, Personendaten).
- Konsole: `VERKEHR.state()`, `VERKEHR.addPed('bettina')`, `VERKEHR.addCar()`, `VERKEHR.wave()`, `VERKEHR.ride()`, `VERKEHR.selbst()`,
  `VERKEHR.force({ peds: 4, cars: 2 })`, `VERKEHR.autoOn(false)`, `VERKEHR.clear()`; Start am Anger: `?szenario=verkehr`.

## Gemessen (26.10.2026)

- Takt `verkehr/verkehr` mit vier Spaziergängern und zwei Autos: 0,02–0,08 ms je Bild (SwiftShader, `KERN.profile`).
- Figuren: je 8,4 MB entpackte Bilder am Rechner (Gesicht 1024 px, Rest 512 px – wie die Dorfbewohner), am Telefon halbiert (≈ 2 MB);
  höchstens vier Spaziergänger (Telefon zwei) und ein Fahrer zugleich, nach 15 s ohne Bedarf frei. `memphone` (Start im Garten):
  236 MB entpackte Bilder, wie ohne Verkehr (es lädt dort keine Figur).
- Schleusingen: Texturen/Geometrien vor dem Besuch, in der Stadt, danach 417/1317 → 429/1339 → 417/1317 (lokal, ohne Welt-Kacheln).
- Mit dem Verkehr laufen `dorf` (35/35), `schleusingen` (18/18) und `fahrt` (34/34) grün (GitHub-Lauf 40256092736): die Autos machen dem
  gefahrenen Auto Platz, auch dem Testfahrer, der in der Straßenmitte fährt.

## Für den Kern-Chat

- Neue Module unter der Marke `# feat/verkehr` in `modules.txt` (vor `game/game.js`, nach KI und Gartenplaner):
  `verkehr/verkehr_leute.js`, `verkehr_netz.js`, `verkehr_fig.js`, `verkehr_auto.js`, `verkehr.js`. `shell/parts.txt`: `css/verkehr.css` nach
  `css/ki.css`. Neue `window`-Namen: `VERKEHR`, `VAUTO`, `VFIG`. Keine Speicher-Schlüssel.
- **Haken außerhalb meiner Dateien: keine.** Zur Laufzeit über vorhandene Schnittstellen: `VEH.add` (ein zusätzliches Fahrzeug `verkehr`
  mit der Physik von `VEH.by.car`, wartet unsichtbar weit draußen bei −905/−1215, bis es ein angehaltenes Auto ersetzt; sein Eintrag am
  Aktionsknopf `veh:verkehr` ist durch einen eigenen ersetzt, der nur bei verliehenem Auto „Einsteigen“ zeigt), `VEH.extra` (die Autos
  sind Hindernisse für das eigene Auto und für Fußgänger), `VEH.enter/exit/place`, `PLAY.sit` (Beifahrersitz, `kind: 'ride', fp: true`),
  `KERN.zone`, `KERN.act`, `KERN.tick`, `KERN.pushOut`, `KI.person/talk/ended`, `STIMME.person/say/speaks`. `pav-veh-v1` speichert die Lage des Fahrzeugs `verkehr` mit
  (wird beim Laden wieder nach draußen gestellt).
- Personen für die KI: `VLEUTE.P` (Schlüssel = Name klein; in KI `vk_<name>`), Felder `name, full, g, age, role, sheet`.
- Neue Dateien in gemeinsamen Ordnern: `viz3/test/unit/verkehr.test.mjs`. Kein Menüeintrag (die Szene `?szenario=verkehr` hat
  `menu: false`); `dorf/dorf_cars.js` (DCARS) ist unverändert: die Verkehrsautos sind ein eigenes Modell (Räder, die sich drehen,
  Innenraum für den Beifahrer, Lampen) mit denselben Material-Parametern wie die Autos der Dorfbewohner (ein Shader-Programm); die
  geparkten und fahrenden Autos der Dorfbewohner sind für sie Hindernisse.
- Offen / denkbar: Leute kommen aus Haustüren; Kreuzungen mit Vorfahrt (bei höchstens drei Autos je Ort bisher nicht nötig); ein Bus.
