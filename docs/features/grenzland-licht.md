# Grenzland – Licht der Nacht (Hilfs-Agent `licht`, Runde 2)

Branch `feat/grenzland-licht`, Auftrag `docs/plans/auftraege/grenzland2-licht.md`, gemeinsamer Teil `grenzland2-gemeinsam.md`.
Falko, 13.11.2026 10:59/11:25 (Paket B, Kino-Gefühl): In der Durchsicht waren die Nächte so dunkel, dass Menschen schwarze Umrisse
waren, Licht kam von nirgends – die Leuchtkugel ein Punkt am Himmel, das Blaulicht flutete die ganze Straße, Autos fuhren ohne
sichtbare Scheinwerfer. GTA-Nächte sind lesbar und voller Lichtquellen.

## Was es gibt

Neues Modul `viz3/src/grenzland/gl_licht.js` (`GLLICHT`), dazu kleine Änderungen in `gl_auto.js`, `gl_modelle.js` und
`gl_1989_welt.js`. **Kein neues Licht, kein neues Shader-Programm:** alles Sichtbare sind weiche Karten (additiv bzw. Rauch normal
gemischt) im Programm des Schattenflecks unter den Fahrzeugen (`gl_modelle.js`: unbeleuchtet, eine Textur, durchsichtig – die
Mischart gehört nicht zum Programm), mit einem kleinen Atlas, den das Modul selbst zeichnet (Lichtkegel, Lichtfleck auf der Straße,
Glühen weiß/rot, Fleck einer Taschenlampe, Stern), und einem Rauchbild. Wo echtes Licht nötig ist, wird es geliehen
(`KERN.lights.borrow`). Am Tag wird nichts gezeigt; bei „Beenden“ ist alles weg und jeder Wert wieder genau wie vorher.

- **Fahrzeuge:** Sobald die Lampen brennen (Dämmerung, Nacht): weiche Lichtkegel vor den Scheinwerfern (drei Karten je Lampe, eine
  flach und zwei um 38° gekippt – eine senkrechte stand von hinten als heller Strich im Bild), ein schwacher Lichtfleck auf der Straße
  voraus, ein Glanz auf dem Glas, rotes Glühen der Rückleuchten, beim Bremsen größer und heller
  – auch das Glas der Bremsleuchten selbst (eine hellere Kopie des Rückleuchten-Materials). Warm (Glühlampe der Zeit) für 1989 und
  die Simson, weißer für die Autos von heute. Das gilt für alle Fahrzeuge von `gl_auto.js` (Streife, Kombi, Kasten, Trabant, Wartburg,
  Barkas, W 50, Mopeds der Clique) und für Moped und Trabant des Spielers; beim Moped hängt der Kegel an der Gabel (lenkt und legt
  sich mit), der Fleck bleibt flach auf der Straße; aus dem eigenen Sattel bzw. vom Fahrersitz sieht man die Kegel des eigenen
  Fahrzeugs nicht (sie stünden als Streifen mitten im Bild), nur Fleck und Licht. Das echte Abblendlicht des Spielerfahrzeugs ist der Scheinwerfer, den
  `vehicles/vehicle.js` ohnehin für das nächste Fahrzeug mit Licht hat – dafür war kein geliehenes Licht nötig.
- **Blaulicht:** Die beiden blauen Lampen auf dem Dach blitzen im Doppeltakt von heute (zweimal links, zweimal rechts, 0,84 s,
  `GLAUTO.blauPuls`), dazu ein blaues Glühen an jeder Lampe und ein blauer Puls auf dem Boden um den Wagen. Die Rundumleuchte der
  Volkspolizei schlägt wie ein drehender Spiegel. **Woher die blaue Flut kam:** `gl_fahndung.js` (Datei von `welt`) leiht ein Licht
  mit 24 m Reichweite, Abfall 1,4 und zwischen den Blitzen nicht aus (Stärke 4) – das färbte die ganze Straße gleichmäßig blau. Bis
  `welt` das ändert, setzt `gl_licht.js` dieses geliehene Licht nach dessen Takt jeden Frame auf 12 m, Abfall 2 und zwischen den
  Blitzen 0 (siehe „Für den Lead“).
- **Hubschrauber:** wo der Suchscheinwerfer auf den Boden fällt, ein heller Fleck (dreht sich langsam), am Hubschrauber der Glanz
  der Lampe (der Lichtkegel und das geliehene Licht sind schon in `gl_heli.js`).
- **Taschenlampen:** Jede Figur von `gl_fig.js` mit `F.lampe = true` trägt eine: Glanz an der Hand (die linke, wenn die rechte etwas
  hält), ein schwacher Lichtkegel nach vorn unten, der beim Gehen und Umsehen pendelt (nahe an der Kamera blasser – von nah gesehen
  addierten sich die Karten zu einem weißen Keil), und ein Lichtfleck auf dem Boden, der mitgeht. Ohne die
  Angabe tragen nachts von sich aus eine: die Beamten der Polizei (`F.cop`), die Wachleute (`kleid: 'wache'`), Volkspolizei und Grenzer
  1989. `F.lampe = false` schaltet das ab.
- **Leuchtkugel** (`KERN.emit('grenzland:flare', { x, y, z })` oder `GLLICHT.flare(x, y, z)`): steigt in 3 s auf etwa 60 m
  mit einer weißen Rauchspur (alle 30 cm ein Wölkchen), ploppt auf, brennt dann 40 s am Fallschirm, sinkt langsam (knapp 1 m/s) und treibt mit dem Wind des
  Wetters, Funken fallen, ein weißglühender Kern, ein roter Hof und ein großer roter Dunst in der Luft, darüber eine dünne Rauchfahne,
  rot angeleuchtet; ein geliehenes rotes Licht folgt ihr (das macht den Wald rot), Nebel und Himmelslicht werden rot getönt; dann
  erlischt sie in 3,5 s, der Rauch zieht noch ab. Geht in der Mission die rote Kugel von `gl_kapitel1.js` hoch, ohne dass das
  Ereignis kam, startet `gl_licht.js` die Leuchtkugel selbst an ihrer Stelle; solange unsere brennt, ist die Kugel ausgeblendet.
- **Lesbare Nächte:** Solange der Modus läuft, gibt es nachts mehr Himmelslicht (das Halbkugel-Licht, mondblau, unten ein dunkles
  Blaugrau) und etwas mehr Belichtung (bis ×1,28), die Lichtflecken der Straßenlaternen sind heller (1989 oranger). Alles wird auf
  den Wert gesetzt, den der Tageslauf gerade will, plus unseren Teil – und beim Beenden genau zurück.
- **Regen an der Klinge:** In „Nachts an der Klinge“ vom Ansehen des Umladeplatzes bis zur Flucht (Schritte 1–4), nachts: der Regen
  des Wetters (`WETTER.preset('regen')`: Regenstriche um die Kamera, nasse, glänzende Straßen, Regengeräusch – alles schon da, nichts
  neu übersetzt), danach das Wetter von vorher.
- **Farbstimmung für heute:** etwas mehr Kontrast und Farbe, dunklere Ecken (nachts mehr) über den Farbausgleich, den der Renderer
  ohnehin rechnet (`render/render.js` `GRADE`), und eine wärmere Abendsonne bei tiefem Sonnenstand. Kein CSS-Filter, kein zusätzlicher
  Durchgang – auf dem Telefon kostet das nichts. 1989 behält seinen eigenen Look (`gl_hud.js`).
- **Kahle Linde 1989** (`gl_1989_welt.js`): Ohne Laub blieben von der Dorflinde nur die Äste, die in Spitzen enden. Jetzt sitzen dort,
  wo die Blätter waren (auf der gröberen Hälfte ihrer Blattkarten), Büschel feiner Zweige – eine Kopie des Blattmaterials (sein
  Programm) mit einer Zeichnung verzweigter Zweige. Weg beim Verlassen von 1989.

## Ausprobieren

- Szene „Grenzland“, Abend abwarten (oder Uhr auf 22 Uhr), aufs Moped: Kegel, Fleck auf der Straße, Rücklicht; bremsen.
- In der Konsole: `GLLICHT.an(false)` / `GLLICHT.an(true)` – alles aus und an (für Vorher/Nachher-Bilder),
  `GLLICHT.flare(x, y)` – eine Leuchtkugel, `GLLICHT.regnen(true | false | null)` – Regen von Hand (null: wie die Mission will),
  `GLLICHT.stand()` – Zahlen.

## Test

`viz3/test/grenzland_licht.py` (für Actions in `viz3/extra/grenzland-licht/tests.txt`), eine Seite, ein Gebiet: Freispiel um 22 Uhr
auf der Dorfstraße (Moped des Spielers, Streife mit Blaulicht, ein Kombi von heute, ein Trabant), ein Wachmann mit Taschenlampe und
der Partner in 15 m; dann „Nachts an der Klinge“ (Regen, Lampen der Wachleute) und die Leuchtkugel; 1989 die Linde und der Abend.
Jedes Bild zweimal – ohne (`GLLICHT.an(false)`) und mit – und nebeneinander in `out/grenzland_licht/*_vergleich.jpg`. Geprüft wird:
der Fleck macht die Straße voraus heller (gegen dieselbe Entfernung seitlich außerhalb des Kegels), das Blaulicht blitzt abwechselnd
links und rechts und nie beide, das geliehene Blau reicht höchstens 12 m, die Figur in 15 m ist heller, Taschenlampen und Regen kommen,
unter der Leuchtkugel wird das Bild rot (obere Hälfte: Rot deutlich über Grün), sie brennt nach 25 s noch und sinkt, höchstens zwei
neue Shader-Programme (gezählt zwischen den Bildern ohne und mit), „Beenden“ gibt alles zurück, keine Seitenfehler.

## Entscheidungen

- **Kein geliehenes Licht für den Scheinwerfer des Spielers:** `vehicles/vehicle.js` hat einen echten Scheinwerfer (ein
  `SpotLight`, immer in der Szene) für das nächste Fahrzeug mit brennendem Licht – das ist das Moped bzw. der Trabant des Spielers.
  Ein zweites, geliehenes Licht hätte nur doppelt geleuchtet.
- **Regen über das Wetter statt eigener Regenstriche:** `wetter/wx_fall.js` hat Regen in einem Programm, das beim Laden schon
  übersetzt wird, dazu nasse Böden (`wx_boden.js`) und Geräusch (`wx_ton.js`). Eigene Striche wären ein neues Programm gewesen und
  hätten anders ausgesehen als jeder andere Regen im Spiel. Tropfen auf einer Scheibe: der Spieler fährt an der Klinge Moped – keine
  Scheibe; nicht gebaut.
- **Farbstimmung über `GRADE` statt CSS-Filter:** der Farbausgleich läuft in jedem Bild ohnehin; die Werte zu ändern kostet nichts.
  Ein CSS-Filter auf der ganzen Leinwand kostet auf Telefonen einen eigenen Durchgang des Browsers.
- **Belichtung als „deren Wert mal unserer“:** `render/modes.js` setzt die Belichtung jeden Frame neu (und `GAME.shot` direkt vor
  dem Zeichnen). Solange der Modus läuft, liest der Renderer deren Wert mal unseren Faktor – wie `gl_1989_welt.js` den Nebel liest.
  Beim Beenden ist die Eigenschaft wieder die gewöhnliche.
- **Taschenlampe ohne Angabe für Uniformierte nachts:** damit Wachleute, Beamte und die Polizei von 1989 auch dann Licht tragen,
  wenn `kino` und `welt` die Angabe noch nicht setzen. `F.lampe = false` hat Vorrang.
- **Die Leuchtkugel von `gl_kapitel1.js`** (eine rote Kugel, die `kino` steuert): solange `gl_licht.js` eine eigene Leuchtkugel
  zeichnet, sollte die Kugel weg (Wunsch an `kino`, unten).

## Kosten (Telefon)

- Texturen: Atlas 256 × 128 und Rauch 512 × 64 (zusammen mit Mipmaps unter 0,5 MB), Zweige 1989 256 × 256.
- Zeichenaufrufe nachts: je Fahrzeug mit Licht 2–4 (Kegel und Glanz, Fleck, Rücklicht, beim Bremsen 1 mehr; Streife +3),
  je Taschenlampe 2, die Leuchtkugel 4 (solange sie brennt). Am Tag 0.
- Arbeit je Frame: ein Blick auf die Uhr; nachts eine Schleife über die Fahrzeuge und Figuren (wenige), die Leuchtkugel ~200 Karten
  auf der CPU (nur solange sie brennt).
- Keine neuen Lichter (das geliehene Licht der Leuchtkugel kommt aus dem gemeinsamen Vorrat), keine neuen Shader-Programme.

## Für den Lead

- **Dateien:** neu `viz3/src/grenzland/gl_licht.js` (eine Zeile in `viz3/src/modules.txt` im Block `# feat/grenzland`, nach
  `gl_heli.js`); `gl_auto.js` (Blaulicht im Doppeltakt `blauPuls`, `c.bremst` in `drive()`, warmes Scheinwerfermaterial 1989
  einschalten), `gl_modelle.js` (`LM.head89` warm, `LM.head` weißer; die Typen von 1989 und die Mopeds bekommen das warme), 
  `gl_1989_welt.js` (Zweige der kahlen Linde); Test `viz3/test/grenzland_licht.py`, `viz3/extra/grenzland-licht/tests.txt`.
- **An `welt` (gl_fahndung.js, ~Zeile 795, `grenzland:blau`):** bitte `distance = 12`, `decay = 2` und als Stärke
  `46 * Math.max(...GLAUTO.blauPuls(GLAUTO.blink))` statt `… % 2 ? 30 : 4` – dann kann der Übergang in `gl_licht.js`
  (`blauLicht`) entfallen. Er findet das Licht an seiner Farbe `0x2a5cff`; ändert `welt` die Farbe, greift er nicht mehr.
- **An `kino` (gl_kapitel1.js, Schritt `flucht` der Mission `klinge`):** beim Abschuss `KERN.emit('grenzland:flare', { x: K.van[0],
  y: K.van[1], z: KERN.ground(K.van[0], K.van[1]) + 1.5 })` und die eigene rote Kugel (`leuchtkugel`) weglassen, wenn
  `window.GLLICHT` da ist – sonst sieht man zwei. Die Leuchtkugel brennt ~47 s (Steigen 3,2 s, Brennen 40 s, Erlöschen 3,5 s).
  Taschenlampen: `F.lampe = true` für die Wachleute der Klinge und des Lagers nachts; ohne die Angabe tragen sie nachts ohnehin eine.
- **Ton (gl_ton.js):** ein Zischen der Leuchtkugel (Abschuss: kurzes Fauchen; Brennen: leises Prasseln/Zischen ~40 s, aus
  `grenzland:flare` ableitbar), Regen kommt vom Wetter selbst (`wetter/wx_ton.js`).

## Offen

- Tropfen auf einer Scheibe (an der Klinge fährt man Moped – keine Scheibe).
- Die Rundumleuchte der Volkspolizei schlägt im Takt, dreht sich aber nicht sichtbar (ein Glühen, kein wandernder Strahl).

## Verlauf

- 13.11. ~12:25: erste Fassung (alle acht Punkte des Auftrags), Test geschrieben, Prüfpaket auf Actions (rot: Test brauchte PIL, das
  die Runner nicht haben – jetzt misst der Test in der Seite).
- ~12:50: nach den ersten Bildern (`out/grenzland_licht/`): die Lichtkegel ohne die senkrechte Karte (von hinten ein heller Strich),
  Taschenlampen viel schwächer und mit eigenem Glanz (die Flecken der drei Wachleute am Wagen waren grelle weiße Flächen), die
  Rauchspur der Leuchtkugel dünn (sie war eine rosa Säule), die Leuchtkugel auf 60 m (75 m lagen über dem Bild), Regen jedes Bild
  nachgeführt (das Wetter von 1989 hatte sonst den Regen als „vorher“ gemerkt und nach der Rückblende wieder eingeschaltet), die
  Zweige der Linde lichter und dunkler und im Programm der Blätter (eine Kopie des Materials hatte den Shader-Zusatz nicht – `three`
  kopiert `onBeforeCompile` nicht mit). Gemessen: keine neuen Shader-Programme, der Farbausgleich nach „Beenden“ wieder 1,06/1,08/0,32.
