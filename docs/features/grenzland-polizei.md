# Grenzland: Fahndung und Polizei (feat/grenzland-polizei, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland-polizei.md` (gemeinsamer Teil `grenzland-gemeinsam.md`). Falko, 13.11.2026: „GTA 6 Vibes …
passend zur Region“ – Fahndung nur über Zeugen, hohle Sterne, bis man erkannt ist, Streife über die Landstraße, Sperre, Hubschrauber,
Spezialkräfte; 1989 die Volkspolizei. Module: `viz3/src/grenzland/gl_logik.js` (`GLLOGIK`: alle Regeln und Entscheidungen, ohne Szene),
`gl_fahndung.js` (`GLFAHNDUNG`: die Welt dazu), `gl_heli.js` (`GLHELI`).

## Wie es gebaut ist

- **Alles, was die Polizei entscheidet, ist reine Logik** (`GLLOGIK.einsatz(world)`): wer geschickt wird, woher, wohin, wann eine Streife
  sieht, folgt, hält, aussteigen lässt, wieder einsammelt, abzieht. Die Welt (`gl_fahndung.js`) zeigt nur, was entschieden ist: sie
  stellt die Autos (`GLAUTO.spawn/onLine/drive/park`), die Figuren (`GLFIG`), Sichtlinien (`WCOL`) und Texte.
- Dadurch läuft **die ganze Polizei ohne Browser** auf dem echten Straßennetz und zwischen den echten Hauswänden des Quadrats
  (`viz3/extra/grenzland-polizei/fixtures/ratscher.json`: die OSM-Wege und die Wandfüße, wie sie die Website ausliefert;
  `viz3/extra/grenzland-polizei/sim/welt.mjs`: eine Welt ohne Bild, die Autos fahren wie in `GLAUTO.drive`). Die Unit-Tests
  (`viz3/test/unit/grenzland_polizei.test.mjs`, 20 Stück, ~8 s) spielen Szenen in Sekunden durch: Anfahrt von jedem Straßenende,
  Suche, Sehen bei Tag und Nacht und nicht durch Wände, Festnahme, Flucht zu Fuß, Moped auf und neben der Straße, Sperre, 1989,
  Spezialkräfte, Hubschrauber, eine halbe Stunde Durcheinander im ganzen Quadrat (kein Auto verlässt die Straße, keines steht ewig).
  Eine Szene Schritt für Schritt ansehen: `node viz3/extra/grenzland-polizei/sim/lauf.mjs suche | fuss | flucht | moped | acker`.
- Der Browser-Test `viz3/test/grenzland_polizei.py` (Port 9016) prüft dasselbe in der echten Welt und macht die Bilder
  (`out/grenzland_polizei/`): Zeugin, Streife, Beamte, Verfolgung, Sperre, Nacht, ABV 1989, Hubschrauber, Riegel, Stadt. Er läuft in
  Teilen (`grenzland_polizei:roads,witness,patrol,escape`, `…:moped,block,night,1989,heli`, einzeln auch `sek`, `stadt`), weil
  eine Seite mit allen Szenen hier an die Speichergrenze kam. Bei GitHub schreibt er, was fehlschlug, als Anmerkung des Jobs
  (öffentlich lesbar: `curl https://api.github.com/repos/…/check-runs/<job>/annotations`) – die Logs selbst sind es nicht.

## Was es gibt

- **Zeugen** (`GLFAHNDUNG.zeugen`, `tat`): Leute des Modus, Dorfbewohner (kennen Falko und Sarah beim Namen → gefüllte Sterne),
  Passanten und Autofahrer des Verkehrs (nur eine Beschreibung → hohle Sterne), die Polizei selbst, Kameras einer Mission
  (`hooks.zeuge`). Die Gauner der Geschichte (Fremder, Clique, Krähwinkel, Wachleute, Lutz) rufen keine Polizei (eine Mission kann
  eine Figur mit `F.zeuge = true` doch zum Zeugen machen).
- **Die Meldung dauert**: wer etwas sieht, greift zum Telefon („… hat es gesehen und greift zum Telefon“), die Sterne kommen erst,
  wenn der Anruf durch ist (`GLLOGIK.meldeZeit`: 3,5–7 s; schwere Taten schneller, wer einen kennt, ist sich schneller sicher). In
  der Zeit kann man **mit dem Zeugen reden** (Aktionsknopf „Mit … reden“, nur bei Kleinigkeiten bis Hitze 0,9: Rempelei, Raserei,
  Böller, Hausfriedensbruch, Flucht, Angeln, Helm) – dann wird nichts gemeldet. **Umstoßen lohnt sich nie**: der laufende Anruf bricht
  ab, aber das Opfer meldet die Körperverletzung selbst, sobald es wieder steht (Opfer melden wie in GTA 6). Polizei als Zeuge und
  erzwungene Zeugen (`force`, `sofort`) zählen sofort.
- **Umziehen** am Bungalow (Aktionsknopf, nur während einer Fahndung): eine Beschreibung ist nichts mehr wert – hohle Sterne sind sofort
  weg, alles zieht ab; ein Name bleibt ein Name; nicht, während jemand zuschaut. **Das Moped** kennen sie, sobald eine Streife es eine
  Sekunde gesehen hat oder ein Zeuge die Tat darauf sah (`GL.W.fz`): dann sehen sie es auf 120 statt 100 m. „Kennzeichen tauschen“ am
  Carport (Moped in der Nähe) macht es wieder unbekannt.
- **Die Streife** kommt nach der Wartezeit der Sterne vom Straßenende mit der kürzesten Fahrzeit zum gemeldeten Ort (nie von einem,
  an dem man steht; die zweite lieber von einer anderen Seite), mit Blaulicht und Horn, fährt **zuerst genau dorthin**, hält 3 s,
  dreht dann Runden über die Kreuzungen in der Nähe (noch nicht besuchte zuerst, eher in der Richtung, in die man lief; der Kreis
  wächst mit der Zeit bis 380 m). Sieht sie einen (Tag 80 m, Nacht 42 m; auf dem Moped ×1,25, geduckt ×0,5, unter Bäumen ×0,35; nie
  durch Hauswände, nicht durch einen Wald – mehr als gut 20 m unter Kronen auf der Sichtlinie, eine Straße durch den Wald zählt
  nicht –, nie ins Haus), folgt sie **auf der Straße**: einem
  Moped fährt sie auf 7–8 m auf (so schnell wie es, plus was der Abstand hergibt), wendet auf der Fahrbahn, wenn es an ihr vorbei ist.
  Neben der Straße kann sie nicht folgen: sie fährt zum nächsten Straßenpunkt, und wenn man dort draußen steht (bis 170 m), steigen
  die Beamten aus und kommen zu Fuß.
- **Die Beamten** (zwei je Streife, höchstens vier zu Fuß zugleich, am Handy zwei – jede Figur kostet Speicher; die Figuren werden
  geladen, wenn die Streife losfährt, und bleiben bis zum Ende der Fahndung versteckt erhalten, damit das Aussteigen nicht ruckelt): steigen aus, wenn man zu Fuß näher
  als 24 m ist, gehen hinterher (1–2 Sterne 2,15 m/s – wer geht, ist schneller; 3: 3,0; 4: 3,3; 5: 3,6 – dann muss man rennen),
  rufen „Halt! Polizei!“. **Wer steht, wird erwischt** (ein Beamter 1,2 s auf Armlänge; auch auf dem stehenden Moped; ein Auto dicht
  hinter dem stehenden Moped). Außer Sicht gehen sie dorthin, wo man zuletzt gesehen wurde, 16 m weiter um die Ecke, schauen sich 4 s
  um, gehen zum Auto zurück und steigen ein; die Streife sucht weiter. Fährt man mit dem Moped davon, laufen sie zurück – das sind
  ein paar Sekunden Vorsprung. Umstoßen (Taste G) ist Widerstand; sie stehen wieder auf. Solange ein Beamter einen sieht, ruft
  sein Wagen ihn nicht zurück; einem, der geht, laufen sie den Weg ab (sie zielen dorthin, wo man gleich ist). Die haltende Streife
  fährt an den Rand, so weit die Straße es zulässt – auf einer richtigen Straße kommen die anderen an ihr vorbei.
- **Antwort nach Sternen** (`GLLOGIK.kraefte`): 1 – eine Streife (38 s Wartezeit); 2 – zwei (30 s); 3 – drei und eine **Sperre** (24 s);
  4 – dazu der **Hubschrauber** (20 s); 5 – dazu zwei Wagen der **Spezialkräfte**, die mitjagen, und je einer quer an jedem der fünf
  Straßenenden (16 s). Fällt die Fahndung, fährt heim, wer zu viel ist. Kein Auto verlässt die Straße; steht eines 20 s, obwohl es
  fahren soll, bekommt es erst einen neuen Weg und wird sonst weggenommen (Meldung in der Konsole – in den Tests kommt das nicht vor).
- **Die Sperre**: 320 m voraus auf der Straße, die man fährt (an Kreuzungen die Straße, die am geradesten weitergeht, nie auf Wege),
  mindestens 150 m entfernt und nicht direkt vor den Augen: zwei Streifenwagen quer, Leitkegel, ein Schild, daneben ein Beamter
  (nicht am Handy). Sie sieht 70 m weit
  (nachts 45). Mit dem Moped vorbei, solange sie einen sieht – ob durch die Lücke oder über den Acker –, ist „Sperre durchbrochen“.
- **Der Hubschrauber** (`gl_heli.js`): fliegt 12 s nach dem vierten Stern aus 900 m an, kreist in 44 m Höhe mit 58 m Radius über der
  Stelle, an der man zuletzt gesehen wurde – über einem selbst, solange er einen sieht. Er sieht, wer im Freien ist: am Tag 95 m im
  Umkreis (Moped 120 m), nachts nur, worauf der Suchscheinwerfer fällt (15 m Radius, wandert um die Mitte, bleibt auf einem, wenn er
  einen hat). Nie unter einem Dach oder unter einer Baumkrone (die gemessenen Kronen des Quadrats, `RATSCHER.treeRecs`, und der Wald
  an der Klinge, `FOREST.owns`). Was er sieht, wissen die Streifen. Modell ohne Marke (blau/
  silber, Vertexfarben im Material des Verkehrs), Rotoren drehen, das Schlagen der Blätter synthetisch; nachts ein geliehenes
  Punktlicht am Boden und ein schwacher Lichtkegel.
- **1989** (`GL.era === '1989'`): ein Wartburg der Volkspolizei mit einer Rundumleuchte (Typ `limo89`), 60 % der Wartezeit; der **ABV
  zu Fuß** kommt schon vorher um die Ecke und **kennt jeden** (sieht er einen, sind die Sterne gefüllt); „Stehenbleiben!“; keine
  Sperre, kein Hubschrauber, keine Spezialkräfte. Festnahme → `grenzland:erwischt` mit `era: '1989'`.
- **Jenseits des Quadrats**: in Schleusingen fährt die Streife über das Straßennetz des Verkehrs dort (`VERKEHR.places.stadt`,
  sobald die Stadt gebaut ist; Sichtlinien gegen die Wände der Stadt); wo es kein Netz gibt, kommen zwei Beamte zu Fuß um die Ecke
  (von einer Stelle, die man nicht sieht, sonst von hinten).
- **Was man hört und sieht**: Funksprüche als Untertitel („Rennsteig für Schleuse 12 …“, erfundene Rufnamen; höchstens alle 9 s),
  Rufe der Beamten, das Horn (`GLAUTO`), nachts ein blauer Schein an den Wänden (ein geliehenes Punktlicht am nächsten Blaulicht).
- **Taten** (`GLLOGIK.CRIMES`): neu `angeln` (0,45, für `grenzland-neben`), `helm` (0,45 × 0,6: nur die Streife stört es, einmal je
  Vorbeifahrt); `raserei` (über 56 km/h im Ort vor Zeugen), `flucht` (22 s gesehen auf der Flucht im Fahrzeug), `sperre`,
  `widerstand` kommen aus den Systemen.

## Zahlen (abgestimmt)

| Sterne | Hitze ab | Streifen | dazu | Wartezeit | Beamte zu Fuß | ein Stern geht nach (bekannt / nur Beschreibung) |
|---|---|---|---|---|---|---|
| 1 | 0,45 | 1 | – | 38 s | 2,15 m/s | 30 s / 18 s |
| 2 | 1,5 | 2 | – | 30 s | 2,2 m/s | 38 s / 23 s |
| 3 | 2,9 | 3 | Sperre | 24 s | 3,0 m/s | 46 s / 28 s |
| 4 | 4,4 | 3 | Sperre, Hubschrauber | 20 s | 3,3 m/s | 54 s / 32 s |
| 5 | 6,2 | 3 + 2 SEK | Sperre, Hubschrauber, 5 Straßenenden dicht | 16 s | 3,6 m/s | 62 s / 37 s |

Die Zeit läuft erst, wenn jemand sucht (eine Streife ist angekommen oder Beamte sind da), im Versteck (drinnen, unter Bäumen, Scheune)
1,8-mal so schnell – außer man ist vor ihren Augen hineingegangen. Von fünf Sternen bis null: 230 s außer Sicht, 128 s im Wald
(im Test ohne Browser: es geht). Ein Stern: man geht einfach weg.

## Ausprobieren

`?szenario=grenzland`, ins Dorf, G vor jemandem (Rempelei/Schlag) oder Böller am Anger: der Zeuge telefoniert, ein Stern, nach gut
einer halben Minute hört man das Horn von der Landstraße. Stehen bleiben: zwei Beamte steigen aus. Weglaufen hinter die Häuser: sie
suchen. In der Konsole: `GLFAHNDUNG.stand()`, `GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Test', police: true }] })` (sofort),
`GLHELI.stand()`.

## Entscheidungen

- **Fahrzeugdiebstahl gibt es nicht** (nur die Tat `autoklau` für Missionen): die Autos des Verkehrs gehören `verkehr/*` (nicht
  ändern), und ein zweites lenkbares Fahrzeug des Modus gibt es noch nicht (`GLAUTO` kennt nur das eigene Moped als `VEH`).
- **„Fahrzeug ändern“ ist ein Kennzeichentausch**, kein Umlackieren (die Moped-Farbe gehört `gl_modelle.js`).
- **Keine Belohnung für Gewalt**: siehe Zeugen. Beamte kann man umstoßen (sie stehen auf), mehr nicht; keine Waffen.
- `tat()` gibt bei gewöhnlichen Zeugen 0 zurück – die Sterne kommen mit der Meldung (Ereignis `grenzland:sterne`). Wer sofort zählen
  will (Missionen, Tests): `{ force: […] }` oder `{ sofort: true }`.
- Die Anhaltekelle hält kein Beamter in der Hand (Armhaltung der Figuren ist Sache von `gl_fig.js`): an der Sperre steht ein Schild.
- **Versteck ist, wo Bäume sind – nicht, wo die Karte „Wald“ sagt**: „im Wald“ (Streifen sehen nur 35 % so weit, die Suche läuft
  1,8-mal so schnell ab) heißt Krone über einem und in mindestens drei der vier Himmelsrichtungen 7 m weiter auch, nicht auf einer
  Straße; das sind 8 % des Quadrats. Unter einem einzelnen Baum sieht einen nur der Hubschrauber nicht.
- Wer vor ihren Augen in ein Haus geht, hat kein Versteck: die Suche läuft dann normal schnell ab und beginnt erst nach bis zu 45 s
  (solange sie noch davor stehen).
- Fällt die Fahndung auf null – entkommen, umgezogen, von einer Mission beendet –, fahren alle von selbst heim (`GLLOGIK.einsatz`).
- **Zeitwechsel beendet die Fahndung** (`grenzland:era`): eine Suche von heute läuft nicht in der Rückblende weiter und umgekehrt.
- **Ein Fehler im Bild der Polizei hält das Spiel nicht an**: `GLFAHNDUNG.tick` und `GLHELI.tick` fangen ihn ab, merken ihn einmal
  (`GLFAHNDUNG.err`, `GLHELI.err`, Konsole) und blasen die Fahndung ab – die Module, die danach ticken, laufen weiter. Der
  Browser-Test prüft, dass keiner auftrat.
- Die Autos der Polizei tragen `c.pol = true` (in `GLAUTO.cars` und über `VEH.extra` → `e.grenzland.pol`): andere Module haben auch
  Fahrzeuge des Modus; wer „nichts von der Polizei übrig“ prüft, zählt nur diese.

## Offen

- Der Verkehr (`VAUTO`) weicht den Streifen nicht aus; die Streifen reihen sich hinter fahrenden Autos derselben Richtung ein
  (an stehenden fahren sie vorbei bzw. hindurch).
- Zwischen Ratscher und Schleusingen (Landstraße außerhalb des Quadrats, `welt/fahrt.js`) kommt keine Streife.
- Beamte gehen (auch mit 3,3 m/s im Gehschritt – die Figuren haben keinen Lauf); eine Anhaltekelle in der Hand, ein Beamter an der Sperre.
- Fahrzeugdiebstahl (siehe oben).

## Für den Lead

- `GLDATA.TATEN`: `angeln: 'Angeln ohne Erlaubnisschein'`, `helm: 'Fahren ohne Helm'` (bis dahin nimmt `gl_fahndung.js` den Namen aus
  `GLLOGIK.CRIMES`).
- `GLFAHNDUNG.stand()` hat jetzt zusätzlich `heli: [x, y] | null`, `drinnen`, `wald`, `fz`, `offen: [{ id, wer, t }]`, je Auto `kind`
  (`streife | vopo | sek`) und `st: 'riegel'` für die Wagen an den Straßenenden, je Beamter `da`.
- Wünsche für das Panel (`gl_hud.js`): während eine Meldung läuft „… telefoniert (4 s)“ (`stand().offen`); „Moped bekannt“
  (`stand().fz`); statt „außer Sicht“ im Wald/Haus „versteckt“ (`stand().hidden`); ab vier Sternen „Hubschrauber“ (`GLHELI.on`).
- `gl_modus.js` `schlag()`: zählt einen Schlag gegen einen Beamten als `widerstand` – passt. Der Schlag gegen andere läuft über
  `GLFAHNDUNG.tat('schlag')`; das Opfer meldet sich über `grenzland:schlag` selbst (siehe oben).
- Neue Ereignisse: `grenzland:zeuge` `{ id, wer, sek, beredbar }` bzw. `{ still: true }`, `grenzland:funk` `{ k, text }`,
  `grenzland:heli` `{ on }`.
