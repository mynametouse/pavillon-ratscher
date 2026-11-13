# Grenzland: Orte und Nebenbeschäftigungen (feat/grenzland-neben, 13.11.2026)

Hilfs-Agent `grenzland-neben` des Grenzland-Chats. Auftrag: `docs/plans/auftraege/grenzland-neben.md`, gemeinsame Regeln:
`docs/plans/auftraege/grenzland-gemeinsam.md`. Falko, 13.11.2026: „Spielspaß … passend zur Region und zur Karte“, 0:34: „Integriere auch an
passender Stelle die Sushi in Suhl Story“.

Module (`viz3/src/grenzland/`): `gl_neben_logik.js` (`GLNLOGIK`, reine Regeln mit Einheitentests), `gl_orte.js` (`GLORTE`: die Orte),
`gl_wagen.js` (`GLWAGEN`: Verkaufswagen), `gl_kegeln.js` (`GLKEGELN` und das kleine Feld der Nebenspiele `GLSPIEL`), `gl_angeln.js`
(`GLANGELN`), neu `gl_neben.js` (`GLNEBEN`: die Nebenmission; Zeile in `modules.txt` direkt unter `gl_angeln.js`).
Tests: `viz3/test/unit/grenzland_neben.test.mjs` (5 Tests, ohne Browser), `viz3/test/grenzland_neben.py` (Browser, Bilder in
`out/grenzland_neben/`), Themen-Test `viz3/extra/grenzland-neben/tests.txt`.

## Was es gibt

- **Die Feldscheune der Clique** am asphaltierten Feldweg südlich von Ratscher (`GLDATA.ORTE.treff`, [117, −304]; der Punkt liegt unter
  ihrem Dach, die Mitte 0,8 m weiter zum Weg hin): 10 × 5,4 m, Pfosten und Rähm, Wände aus stehenden, verwitterten Brettern (ein paar
  fehlen), Pultdach aus Blechtafeln mit Rost, die Front zum Weg offen. Drinnen der Unterschlupf: Strohballen, Werkbank mit Schraubstock,
  Werkzeugwand, Motor, ein altes Moped auf Klötzen (Räder ab, zwei Reifen daneben), ein Kühlschrank, das Sofa mit Teppich und Kistentisch,
  Dartscheibe. Die Scheune ist ein **Versteck** (`GLFAHNDUNG.extra`, drei Kreise über dem Boden, und `KERN.inside`).
  In der Rückblende (**1989**) steht dieselbe Scheune mit frischem Holz und blankem Blech, innen nur Stroh an beiden Enden, Leiter,
  zwei Milchkannen – keine Kegelbahn, kein Hof, kein Sofa (Ereignis `grenzland:era`).
- **Die Freiluftkegelbahn** neben der Scheune, parallel zum Weg: Anlauf aus Brettern (man steht darauf – eigener Boden), Bohlenbahn
  19,5 m × 1,5 m mit Rinnen und Banden, Kegelstand mit aufgemalter Raute, Kugelfang mit Matte im Kegelhäuschen, Kugelrücklauf als
  Holzrinne auf Böcken mit Kugelkasten, Pultdach aus Blech auf acht Pfostenpaaren über die ganze Länge, grünes Schild „KEGELBAHN – ALLE
  NEUNE!“, Schiefertafel mit der besten Partie. Die Bahn liegt waagerecht (am fernen Ende auf Unterbau, das Feld fällt dort um ~0,4 m).
- **Der Hof** davor: Grill aus einem halben Ölfass mit Rost, Glut (glüht nachts) und Bratwürsten, Biertisch mit zwei Bänken, Flaschen,
  eine Kiste Bier (ohne Marke), Brennholz und Hackklotz, Aushang „KEGELFREUNDE RATSCHER“, **Lichterkette** von der Traufe über den Hof
  (leuchtet nachts: Material mit Emission, dazu ein geliehenes Punktlicht `KERN.lights.borrow` – kein neues Licht).
- **Der Verkaufswagen** am Anger (Kundenplatz = `GLDATA.ORTE.wagen`, der Wagen steht längs zur Gasse südlich der Hecke): weißer
  Kastenwagen mit grünem Band, die Klappe als Dach aufgestellt mit rot-weißer Schabracke, Theke mit Würsten, Brot, Käse, Brötchenkorb,
  Regale mit Packungen, Waage, Kisten mit Äpfeln und Kartoffeln, Preistafel als Aufsteller. **Geöffnet 8:00–11:30 und 15:30–18:30**
  nach der Spieluhr; sonst Klappe zu („GESCHLOSSEN“ mit den Zeiten), niemand hinter der Theke. Die Verkäuferin (`GLDATA.CAST.haendler`)
  wird nur geladen, wenn jemand in der Nähe ist; sie kennt die beiden (Zeugin mit Namen).
  „Einkaufen“: Regale nach Art (Auf die Hand · Lebensmittel und Bedarf · Angelbedarf · Unter der Theke), jeder Tipp legt ein Stück in den
  Korb, bezahlt wird auf ganze Euro aufgerundet („Kleingeld hab ich keins“). Waren: Rostbratwurst und Kaffee (sofort verzehrt),
  Milchreis, Worcestersauce Dresdner Art, Kanister Gemisch 1:50 (Wunsch des Leads, `GL.inv.kanister`), Mais, Tauwürmer, Blinker,
  Gastkarte Talsperre, Böller (nur wer `karte1` hat oder die Clique kennt). **Fisch verkaufen**: alles oder alles bis auf einen großen
  Karpfen; Stückpreise in `GLNLOGIK.ANKAUF`.
- **Die Angelstelle** an der Staumauer (`GLDATA.ORTE.damm`): von der Tafel auf der Krone führen Steinstufen mit Handlauf die Böschung
  hinunter zu einem 7 m langen Steg (0,4 m über dem Wasser, eigener Boden), Bank, Eimer, Rutenhalter, Hocker am Ende, Schild „ANGELN NUR
  MIT GASTKARTE – KARTEN AM VERKAUFSWAGEN“. Der Ort wird beim Start aus dem Gelände gesucht (wo die Böschung beginnt, wo das Deck den
  Boden trifft).
- **Kegeln** („Kegeln (2 €)“ am Anlauf): fünf Wurf in die Vollen, höchstens 45 Holz. 1 Kugel setzen (◀ ▶, Pfeiltasten, A/D) und Drall
  wählen (↶ ↷, Pfeil hoch/runter, W/S) – eine Kreidelinie auf der Bahn zeigt den Weg; 2 „Richtung“: die Linie pendelt, anhalten;
  3 „Schwung“: der Balken pendelt, anhalten – Wurf. Ein Knopf für alles (großer Knopf im Feld, Aktionsknopf, E, Enter, Leertaste).
  Das Auge fährt der Kugel nach; Kugel und Kegel bewegen sich, wie die Regeln es rechnen (Scheiben auf dem Kegelstand: ein Treffer knapp
  neben dem vordersten Kegel räumt am meisten, die tote Mitte nimmt nur die Mittelreihe, „Pudel“ in der Rinne); Töne Wurf, Rollen, Kegel,
  Rinne; „Alle Neune!“; die beste Partie steht in Kreide auf der Tafel (`GL.stats.kegel`). Steht **Timo** in der Nähe (`GLFIG.near`), kann
  man gegen ihn um 10 € spielen (abwechselnd, sein Arm: `GLNLOGIK.gegner`). Die Kegel hängen am Seil (kein Kegeljunge – im Spiel
  kommt niemand unter 18 vor) und werden nach jedem Wurf hochgezogen und neu gesetzt. Am Aushang („Aushang lesen“) stehen Bahnrekord,
  die Zeiten des Verkaufswagens und der Weg zur Angelstelle. Ein Bahnrekord ab 30 Holz kommt in den Regional-Feed.
- **Angeln** („Angeln“ am Stegende): Köder wählen (Mais, Tauwurm, Blinker – je Wurf einer), man sitzt auf dem Hocker (Ich-Sicht und
  Schulterblick: Rute, Schnur und Pose sind Dinge in der Welt), die Pose wippt; Wartezeit und Fisch nach Monat, Stunde und Köder; manchmal
  zupft es nur. Biss: Pose taucht ab → „Anhieb!“ binnen 1,5 s (zu früh: Fisch gewarnt, zu spät: Köder weg). Drill: Kurbel halten (Knopf,
  Leertaste, E) und die Spannung im grünen Feld halten – zieht der Fisch, loslassen, sonst reißt die Schnur; zu lange schlaff, und er
  schlitzt aus. Der Fang hängt kurz an der Schnur, mit Gewicht; Fische kommen in den Rucksack (`GL.inv`: `karpfen`, `karpfen_gross` ab
  2 kg, `silberkarpfen`, `schleie`, `rotauge`, `barsch`, `hecht`, `zander`), `GL.stats.fische`, `GL.stats.best`. Die Köderwahl sagt, was
  auf den Köder „jetzt am ehesten“ geht; ein Fang ab 5 kg kommt in den Regional-Feed.
  **Erlaubnis**: wie im echten Leben braucht man eine (in Thüringen Fischereischein plus Erlaubnisschein des Gewässers) – im Spiel die
  Gastkarte vom Verkaufswagen (8 €). Ohne Karte ist jeder Wurf eine Tat, wenn es jemand sieht (`GLFAHNDUNG.tat`).
- **Nebenmission „Karpfen für Suhl“** (`GLNEBEN`): sobald die Clique bekannt ist (`grenzland:mission` `{ id: 'clique', st: 'erledigt' }`),
  schreibt Yuki (erfunden, Köchin aus Suhl) eine Nachricht. Abends 17:30–22:00 steht sie an der Schulbushaltestelle in Ratscher (vor dem
  Wartehäuschen). Sie erzählt vom „Waffenschmied“ und bittet um drei Dinge für ihr Gedenkessen „Sukiyaki wie im Waffenschmied“: einen
  Karpfen ab 2 kg, ein Päckchen Milchreis, eine Flasche Worcestersauce. Auf Nachfrage sagt sie, was wahr ist (alles über Anschütz) und
  was ihre eigene Verbeugung ist (das Essen). Abgabe → 80 €, Dank, und die wahre Geschichte als Notiz im Handy
  (`GLHANDY.note(GLDATA.SUSHI…)`, mit dem Zusatz: „Yuki und ihr Gedenkessen gehören zum Spiel und sind erfunden.“). Im Tagebuch als
  Quelle `grenzland-neben` mit Ziel und kurzem Ort (Schulbushaltestelle / Verkaufswagen / Angelstelle); Stand in `GL.m.karpfen`.

## Ausprobieren

Menü → Erleben → Szenen → „Grenzland“ (`?szenario=grenzland`). Die Scheune liegt 320 m südlich des Gartens am Feldweg (in der
Konsole: `GRENZLAND.hin(...GLORTE.P.treff, 300)`), der Wagen am Anger (`GLORTE.P.wagen`), der Steg unter der Tafel der Talsperre
(`GLORTE.P.angel`). Nebenmission ohne die Clique: `GLNEBEN.start()`; Yuki steht ab 17:30 an der Haltestelle.
Für Tests: `GLKEGELN.spielen({ seed, auto: [{ aim, dir, drall, kraft }], gegner: 'Timo' })`, `GLANGELN.angeln('mais', { seed, biss: 1.4,
fisch: { art: 'karpfen', kg: 3.4 }, auto: true })`, `GLWAGEN.kaufen({ mais: 1 })`, `GLWAGEN.verkaufen({ karpfen_gross: 1 })`.

## Schnittstellen (für die Missionen)

- `GLORTE.P` → `{ scheune, kegel, grill, wagen, angel, treff, tafel }` – jeder Punkt ist frei begehbar (Test). `GLORTE.build()/drop()`,
  `GLORTE.inScheune(x, y)`, `GLORTE.UV(u, v)` (Meter längs/quer zum Feldweg vom Treffpunkt), `GLORTE.BX(r, f)` (im Rahmen der Scheune).
- `GLWAGEN.open()` → Promise (zuletzt Gekauftes oder `null`), `kaufen(korb)`, `verkaufen(behalten)`, `offen()`.
- `GLKEGELN.spielen(o)` → Promise `{ punkte, wuerfe, liste, gegner, gewonnen, abbruch, neun }`; Ereignisse `grenzland:kegeln`,
  `grenzland:kegelwurf`.
- `GLANGELN.angeln(koeder?, o)` → Promise (letzter Fang der Sitzung oder `null`; ohne `koeder` wird gefragt); Ereignisse
  `grenzland:fang`, `grenzland:angelwurf`.
- `GLNEBEN.start()`, `reden()`, `stand()`; Ereignis `grenzland:neben` `{ id: 'karpfen', st }`.
- Ereignisse des Wagens: `grenzland:kauf` `{ k }`, `grenzland:verkauf` `{ n, eur }`.

## Entscheidungen

- **Lage der Scheune**: Feld beiderseits frei, Bäume ≥ 20 m entfernt, Gefälle ~3,5 %. Der Feldweg (OSM `track`, Asphalt, 3 m) läuft
  16 m östlich des Treffpunkts schnurgerade von Süd-Südwest nach Nord-Nordost. Alles steht zwischen Treffpunkt und Weg; **der Streifen
  westlich der Scheune bleibt frei**, weil der Kern-Test dort das Moped fährt (von [108, −312] mit 0,5 rad; der Browser-Test prüft 1 m
  beiderseits). Deshalb liegt die Scheunenmitte 0,8 m vom Treffpunkt zum Weg hin.
- **Kein Kegeljunge**: historisch stellten Kegeljungen auf und rollten die Kugeln über eine Laufschiene zurück; im Modus kommt niemand
  unter 18 vor – die Kegel hängen am Seil (Seilzug), die Laufschiene gibt es als Holzrinne.
- **Kegel-Regeln** neu als Scheiben-Physik (statt Wahrscheinlichkeiten): so lohnt Zielen wie auf einer echten Bahn (beste Stelle
  ±8–10 cm neben der Mitte, dort ~7,5 Holz im Schnitt und 10–20 % „Alle Neune“; tote Mitte ~4,4). `GL.stats.kegel` ist jetzt die beste
  **Partie** (0–45), nicht der beste Wurf.
- **Fische**: für die Talsperre Ratscher belegt sind nur **Karpfen und Silberkarpfen** (Angler-Verzeichnis, s. Quellen; „am häufigsten
  gefangen“, Grundangeln, Gastkarten erhältlich). Schleie, Rotauge, Flussbarsch, Hecht, Zander sind die üblichen Fische der Talsperren
  und Teiche um Schleusingen (Talsperre Erletor: Barsch, Zander; Erle: Hecht; Sportplatzteich: Schleie) und im Spiel als „nicht belegt“
  markiert (`FISCH.*.belegt`). Der **Aal ist gestrichen** (kein Beleg, gefährdete Art). Der Silberkarpfen frisst Plankton und beißt im
  Spiel nur selten. Raubfische nehmen keinen Mais, Karpfen keinen Blinker. Außerhalb der besten Monate beißen Fische schwächer
  (Faktor 0,4), damit die Nebenmission in jedem Monat machbar bleibt (der Kalender der Geschichte beginnt am 4. September).
- **Fisch im Rucksack als Stück** (nicht mit Gewicht): `GL.inv` trägt nur Zahlen; ein Karpfen ab 2 kg ist das eigene Ding
  `karpfen_gross` (das will Yuki), der Wagen zahlt Stückpreise.
- **Ganze Euro**: `GL.geld` ist ganzzahlig; Preise stehen mit Cent am Regal, der Korb wird aufgerundet.
- **Der Wagen bleibt stehen**, auch wenn er zu ist (Klappe unten). Dass er zwischen den Zeiten über die Dörfer fährt, ist offen.
- **Erlaubnis**: eine Gastkarte, die nicht abläuft; ohne Karte Tat mit dem Gewicht von `rempeln` × 0,8, bis es die Tat `angeln` gibt.
- **Yuki sagt nur, was mehrfach belegt ist** (1966, einziges Japan-Restaurant der DDR, gemeinsames Bad, bis zu zwei Jahre Wartezeit,
  die drei Ersatz-Zutaten „so wird es erzählt“, gestorben 2008, Tafel in der Gothaer Straße seit 2012). Die Japanreise 1979 erwähnt sie
  nicht (Quellen widersprechen sich, siehe unten).
- **Schilder ohne Textur**: Punktschrift 5 × 7 aus kleinen Vierecken (`GLORTE.schrift`) – keine neue Textur, kein neues Programm.
- **Das Feld der Nebenspiele** (`GLSPIEL`, in `gl_kegeln.js`): Titel, Hilfezeile, Balken mit grünem Feld und Marke, Knöpfe (gedrückt und
  losgelassen – fürs Kurbeln). Solange es offen ist, zeigt das Spiel seine eigenen Aktionsknöpfe nicht (E und Q wirken trotzdem), und die
  Untertitel des Modus rücken darüber (eine CSS-Regel auf `#glsub` aus `gl_kegeln.js`).
- **Beim Kegeln wartet der oder die andere am Anlauf** (`GL.folgt` wird für die Dauer des Spiels ausgeschaltet und danach wieder
  eingeschaltet): das Auge fährt mit der Kugel die Bahn hinunter, und wer „mitkommt“, liefe sonst hinterher.
- **Der Zufall mit Startwert** (`GLNLOGIK.rng`) verrührt den Startwert zuerst: benachbarte Startwerte (Wurf nach Wurf) gaben sonst
  ähnliche erste Zahlen – eine ganze Sitzung lang denselben Fisch.
- **Yuki steht neben dem Wartehäuschen**, einen Schritt hinter der Bordsteinkante (vor dem Häuschen halten die Busse).
- **Leistung**: alle Orte zusammen ~25 000 Dreiecke in 9 Meshes, in < 0,1 s gebaut, Materialien `VPROPS.mat.paint/metal` (vorhandene
  Programme); Lampen, Glut, Kreidelinie und Angelschnur sind Klone des Lampenmaterials des Verkehrs. Pro Bild wird nichts angelegt.

## Quellen

- Fische der Talsperre Ratscher: alleangeln.de, Gewässer „Talsperre Ratscher“ (Zielfische Karpfen, Silberkarpfen; Gastkarten) –
  https://www.alleangeln.de/gewaesser/talsperre-ratscher ; Gewässer um Schleusingen mit ihren Arten –
  https://www.alleangeln.de/angeln-in-schleusingen ; Nutzung der Talsperre (Hochwasserschutz, Erholung seit 1987) –
  https://www.seen.de/talsperre-ratscher/
- Kegelbahn: Nordkurier „Von Pudelkönigen und Kegeljungen“ (überdachte Bohlenbahn 1905, Kegeljungen stellen auf und rollen die Kugeln
  über eine Laufschiene zurück, „Pudel“, „Alle Neune“) – https://www.nordkurier.de/kultur/von-pudelkoenigen-und-kegeljungen-3223770 ;
  Freilichtmuseum Massing, Kegelbahn aus Egglkofen von 1904 (leichte Holzkonstruktion im Freien, Kugelrücklauf mit Gefälle) –
  https://www.freilichtmuseum.de/massing-open-air-museum-/the-bowling-alley-from-egglkofen . Maße der Bahn (19,5 m × 1,5 m, neun Kegel
  im Quadrat auf der Spitze): Classic-Kegeln, wie in Thüringen üblich.
- Verkaufswagen: Studie „Mobile Versorgung auf dem Land“ (2015; Bäckerwagen bei 58 % der befragten Dorf- und Kleinstadtbewohner,
  Metzgerwagen bei knapp 30 %, Lebensmittelwagen bei etwa einem Viertel) –
  https://www.yumda.com/de/news/1146356/baeckerwagen-auf-dem-land-herzlich-willkommen-studie-zur-mobilen-versorgung-auf-dem-land.html
- Rolf Anschütz und der „Waffenschmied“ (zusätzlich zu `GLDATA.SUSHI.quellen` nachgeprüft am 13.11.2026):
  Wikipedia (geb. 27.4.1932 in Hirschbach, gest. 24.4.2008 in Suhl; 1964 Objektleiter; Februar 1966 erstes japanisches Gastmahl für einen
  Journalisten-Stammtisch; 40 Plätze; Februar 1977 Erweiterung mit kleinem Sentō-Bad; 1979 vierwöchige Japanreise; Sommer 1986 Abschied;
  1991 Japanhotel „Sakura“ in Oberhof; 14.10.2012 Gedenktafel Gothaer Straße 8); Tagesspiegel 2012 (gemeinsames Bad vor dem Essen,
  jährlicher Besuch des Botschafters); yokosonews („Rice pudding was used as sushi rice, carps from the nearby lake replaced salmon and
  Worcestershire sauce became soy sauce“); nippon.com, „Japanese Cuisine Behind the Iron Curtain“ (Worcestersauce statt Shōyu,
  Spinat statt Nori, bis zu zwei Jahre im Voraus ausgebucht) – https://www.nippon.com/en/column/g00081/

## Offen

- Browser-Test: Stand siehe unten „Getestet“.
- Der Wagen fährt nicht (steht immer am Anger); Verkäuferin ohne eigene Stimme (nur Untertitel), ebenso Yuki und Timo.
- Timo wird beim Kegeln nicht bewegt (er steht, wo die Mission ihn hinstellt); ohne Timo in der Nähe gibt es nur das Spiel allein.
- Kein Wellenring, wenn die Pose aufschlägt; die Rute biegt sich nicht (sie neigt sich).
- Die Angelstelle liegt an der Böschung der Staumauer (steil, 10-m-Gelände); echte Stege gibt es dort nicht.
- Aushang an der Scheune ist nur Dekoration (keine Aktion „lesen“).

## Für den Lead

- **Radar**: `GLORTE` meldet seine Orte über `GLKARTE.src` (beim Laden, falls `window.GLKARTE` schon da ist, sonst beim ersten
  `build()`): Scheune immer, heute dazu Kegelbahn, Angelstelle und – solange offen – Verkaufswagen. Der Tagebuch-Eintrag trägt `ort`.
- **Ein Haus steht im Stausee**, etwa 60 m vor der Staumauer (Gebäudedaten der Welt, nicht von mir; auf den Bildern `15_`/`16_steg…`
  zu sehen) – vermutlich ein Betriebsgebäude aus OSM, dessen Fuß auf der Wasserfläche liegt. Für den Kern-Chat.
- **`#glwahl` auf dem Handy**: das Feld der Auswahl hat keine größte Höhe; bei mehr als ~6 Knöpfen im Querformat läuft es oben aus dem
  Bild. Der Laden zeigt deshalb Regale mit höchstens 5 Einträgen. Wunsch: `max-height` + `overflow:auto` in `gl_hud.js`.
- **Tat `angeln`**: im zusammengeführten Stand gibt es `GLLOGIK.CRIMES.angeln` („Angeln ohne Erlaubnisschein“) – `gl_angeln.js` nimmt
  sie, sobald sie da ist (auf meinem Zweig allein ersatzweise ein leichtes `rempeln`). Mit der echten Polizei telefoniert der Zeuge
  erst; die Sterne kommen, wenn der Anruf durch ist. Offen: ein Satz dazu für den Polizeibericht im Radio.
- **Spielfeld `#glspiel`** (`gl_kegeln.js`, auch vom Angeln benutzt): solange es offen ist, schiebt eine CSS-Regel die Untertitel
  `#glsub` darüber (`body.glspiel #glsub`), und es blendet sich aus, solange `#glwahl` offen ist. Wenn `gl_hud.js` die Untertitel
  umbaut, bitte diese eine Regel mitnehmen.
- **`GL.folgt`** schalte ich während einer Kegelpartie aus und danach wieder so, wie es war (der Begleiter liefe sonst dem Auge auf
  die Bahn nach).
- **`GLORTE.zeit()`** (nur für Tests): übernimmt `GL.era` für meine Orte, ohne das Ereignis `grenzland:era` zu senden – im
  zusammengeführten Spiel würde das Ereignis das ganze Dorf umstellen. Im Spiel selbst hören die Orte weiter auf das Ereignis.
- **`GLDATA.WAGEN`** wird von mir nicht mehr gelesen (Waren stehen in `GLNLOGIK.WAREN`, mit Kaffee, Gastkarte und Kanister); die Liste
  im Kern kann bleiben oder entfallen. Neue Dinge in `GL.inv`: `angelkarte`, `kanister`, `karpfen_gross`, `silberkarpfen`, … (oben).
- **`GL.m.karpfen`** ist der Stand der Nebenmission (Form `{ st, i, n }` wie die Missionen) – bitte in `gl_mission.js` nicht als
  Hauptmission behandeln (falls dort über alle Einträge von `GL.m` gegangen wird).
- **`GLDATA.SUSHI`**: die Kolumne auf nippon.com schreibt, Anschütz sei nie in Japan gewesen und habe das Restaurant 1970 eröffnet;
  Wikipedia nennt 1966 und die vierwöchige Reise 1979 (nach anfänglicher Ablehnung genehmigt). Der Text im Kern folgt Wikipedia – das
  ist die besser belegte Fassung; wer sicher gehen will, schreibt „1979 durfte er nach anfänglicher Ablehnung für vier Wochen nach Japan
  reisen“ mit der Quelle Wikipedia. Das Schließungsjahr 1993 steht nur in der Berliner Zeitung.
- **Kern-Test**: `viz3/test/grenzland.py` fährt das Moped westlich an der Scheune vorbei (1 m Abstand geprüft). Wer die Strecke ändert:
  frei ist alles westlich von `GLORTE.UV(u, −3)`.
- `GL.stats.kegel` bedeutet jetzt „beste Partie (Holz in fünf Wurf)“.

## Für Falko zu entscheiden

- Soll der Verkaufswagen eine erfundene Firma im Namen tragen? Jetzt steht nur „FRISCH VOM LAND – WURST BROT KÄSE“ darauf.
- Die Böller „unter der Theke“ bekommt, wer die erste Kartenhälfte hat oder die Clique kennt – passt das zur Geschichte?
- Yuki bittet um die drei Ersatz-Zutaten aus den Berichten zum Film. Wenn Familie Anschütz oder Suhler das lesen: der Ton ist als
  Verbeugung gemeint; im Handy steht ausdrücklich, was erfunden ist.

## Getestet

- **Regeln ohne Browser**: `viz3/test/unit/grenzland_neben.test.mjs`, 5 Tests (Kegeln: Bahn, Gasse neben dem Vorderkegel, Alle Neune,
  Gegner; Angeln: Arten, Gewichte, November, Wartezeit, Drill; Laden: Zeiten, Korb, Waren, Ankauf) – grün in `bash tools/check.sh`
  (157 Unit-Tests insgesamt).
- **Module in node** (Werkzeug des Agenten, nicht im Repo): `gl_orte`, `gl_wagen`, `gl_kegeln`, `gl_angeln`, `gl_neben` mit Attrappen
  für Kern und Szene durch Laden, Kegelpartie (allein, von Hand, gegen Timo), Angeln, die Nebenmission von der SMS nach
  `grenzland:mission { id: 'clique', st: 'erledigt' }` bis zur Notiz im Handy, 1989 und „Beenden“ (nichts bleibt in Szene, Aktionen,
  `VEH.extra`).
- **Browser-Test** `viz3/test/grenzland_neben.py` (33 Prüfungen, 28 Bilder):
  - GitHub Actions, Stand `66174983` (03:31): `smoke` grün, `grenzland_neben` grün, „33 checks ok“.
  - Lokal (Lauf 2, Bau von 03:15): 28 von 33 – die fünf übrigen hingen alle an einer Ursache: die Uhr des Spiels war während der
    Kegelpartien über 18:30 gelaufen, der Wagen hatte zu, also kein Köder und keine Zutaten. Der Test stellt die Uhr seitdem vor dem
    Laden zurück (im Spiel selbst ist das richtig so: der Wagen schließt um halb sieben).
  - Bilder angesehen (echte Engine): der Platz vom Feldweg, Scheune von vorn und innen, Kegelbahn, die Sicht beim Kegeln mit dem
    Spielfeld, 1989, der geschlossene Wagen am Anger, der Steg, die Nacht mit Glühbirnen und geliehenem Licht, Yuki an der Haltestelle.
- **Zusammengeführter Stand** (`feat/grenzland-probe`): der Test dort lief mit meinem Stand von vor 03:31 (noch ohne freies Spiel nach
  dem Start) und war rot; seitdem angepasst (freies Spiel nach dem Start, Knöpfe nach ihren Worten, Nebenmission über `GLNEBEN.start()`,
  nur meine Orte wechseln die Zeit, der Anruf des Zeugen zählt als Meldung). Ergebnis des neuen Probelaufs: siehe Bericht an den Lead.
