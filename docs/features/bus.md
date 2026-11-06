# Busse nach dem echten Fahrplan (feat/bus)

Falko, 5.11.2026 23:02 (gewählt): „Busse nach echtem Fahrplan – einsteigen und mitfahren (z. B. Ratscher – Schleusingen)“; 23:17: „Wichtig
ist natürlich trotzdem immer der Realismus. Es soll möglichst eine Spiegelwelt oder ein digitaler Zwilling sogar werden.“ Hilfs-Agent `bus`,
Nacht 5./6.11.2026 (Auftrag `docs/plans/auftraege/bus.md`).

## Was es gibt

- **Echter Fahrplan** (`viz3/extra/bus/dist/bus/fahrplan.json`, 340 KB): aus dem freien Deutschland-Feed von gtfs.de (Daten DELFI e.V.,
  CC BY 4.0, Stand 31.10.2026, gültig November 2026) alles, was die Welt berührt: 33 Haltestellen auf ihren Straßen (Ratscher,
  Schleusebrücke · Ratscher · Ratscher, Schulbushaltestelle · Ratscher, Stausee · Schleusingen mit Zentralhaltestelle, Krankenhaus,
  Gerhardt-Hauptmann-Schule, Felsenkeller, Einkaufszentrum … · Geisenhöhn, Rappelsdorf, Kloster Veßra, Themar, Binnenfischerei …),
  294 Fahrten der Linien 200–205, 207, 214, 222–225, 268 (Werrabus) und 700 (OVG Sonneberg), je Fahrt der Abschnitt in der Welt mit allen
  Minuten. In Ratscher halten werktags die 203 (Suhl – Schleusingen – Ratscher – Hinternah – Masserberg) und die 205 (Schleusingen – Ratscher
  – Eisfeld – Coburg), dazu Schulbusse (268 um 7:02, 214 um 7:40 an der Schulbushaltestelle) und die 700 nach Sonneberg.
- Ziele und Haltestellen mit dem Namen der Station („Schleusingen, Zentralhaltestelle“ statt der Steig-Kurzform „Schleusingen, ZH“,
  „Themar, Bahnhof“ statt „Themar, Bahnof Steig 1“); auf der Zielanzeige, wenn zu lang, nur der Ort.
- **Die fünf Steige der Zentralhaltestelle** in Schleusingen: der Feed legt sie auf einen Punkt (dort standen zwei Busse ineinander) – ihre
  Lage kommt aus OpenStreetMap (Steig mit `local_ref` = `platform_code` des Feeds), entlang der Suhler Straße wie in echt.
- **Welcher Tag gilt**: Kalender des Spiels (`DN.e0` + Spieltag). Wochentag aus einer Bezugswoche des Feeds (16.–22.11.2026);
  Thüringer Feiertage (Neujahr, Karfreitag, Ostermontag, 1. Mai, Himmelfahrt, Pfingstmontag, Weltkindertag 20.9., 3.10., Reformationstag
  31.10., Weihnachten) fahren wie Sonntag. **Schulferien Thüringens** (2025/26–2027) stehen in den Daten; der Feed kennt keine Schultage –
  deshalb fallen in den Ferien die Fahrten aus, die an einer Schule beginnen oder enden (Schätzung).
- **Haltestellen**: im Umkreis von 240 m ein Haltestellenschild (grünes H auf gelbem Grund, Name, Fahrplankasten) an der Bordsteinkante jeder
  Fahrtrichtung und jedes Steigs; im Kasten hängt der **echte Aushangfahrplan** dieser Richtung (Stunden mit Minuten für Montag–Freitag,
  Samstag, Sonn- und Feiertag, „s“ = an Schultagen; an einer Endhaltestelle „Ausstieg“). An der Schulbushaltestelle an der alten Schule steht
  das Wartehäuschen mit Schild schon (`world/village_props.js`): der Bus hält mit der Tür am Häuschen (Lage aus Falkos Video,
  `world/dorfkern_data.js`, statt der 17 m daneben im Feed), ein Fahrplan dort für beide Richtungen, der Aushang an der Rückwand.
- An einer Haltestelle heißt der Ort „Haltestelle …“ (Ortsanzeige); beim ersten Mal an einem Schild ein Hinweis, was man dort tun kann.
- **Fahrplan am Schild** („Fahrplan: …“): die nächsten Abfahrten dieser Richtung (Zeit, Linie, Ziel, „in 3 min“, „fährt ein“, „steht da“),
  der Tag („Mittwoch, Schultag“), **„Auf den Bus warten“** (die Uhr springt wie beim Schlafen bis eine Minute vor den Bus).
- **Zufahrt vom Rand**: eine Fahrt, die von außerhalb der Welt kommt (z. B. die 205 aus Coburg über Wiedersbach), fährt vom Rand des
  Straßennetzes der Welt (dort, wo die Straße zur vorigen Haltestelle hinausführt) zu ihrer ersten Haltestelle – mit der Zeit, die ein Bus
  dafür braucht –, und eine, die weiterfährt, bis zum Rand; kein Bus taucht an einer Haltestelle auf (Ausnahme: Hinternah, Neuhof,
  Neuendambach liegen selbst am Rand der Karte).
- **Busse**: jede Fahrt ist ihr Fahrplan; nahe am Beobachter (620 m, Telefon 420 m, höchstens 3 bzw. 2 Busse – ein viel näherer nimmt einem
  fernen, den man nicht sieht, das Modell) bekommt sie ein Modell und fährt ihren Weg mit Anfahren, Bremsen und Kurventempo eines Busses in den
  Minuten des Fahrplans (zu früh: wartet an der Haltestelle), hält an jeder Haltestelle mit der Vordertür am Schild, Türen auf und zu
  (Zischen); steht man an der offenen Vordertür, wartet der Fahrer. **Wer an einer Haltestelle steht, wenn ein Bus fällig ist, und wer mitfährt, hat die Uhr in Echtzeit** (`CLOCK.focus('bus')`,
  Uhrfenster: „Echtzeit – Bus“) – so kommt der Bus zu seiner Minute und fährt so schnell wie ein Bus. Ein Bus anderswo fährt in Echtzeit; fällt
  er hinter die schnelle Spieluhr zurück (eine Stunde je Minute), holt er auf, wo man nicht hinsieht – einer, dem man zusieht, fährt weiter
  wie ein Bus fährt.
- **Bedarfshalt**: zwischen seiner ersten und letzten Haltestelle hält ein Bus nur, wo jemand ein- oder aussteigt (die Leute des Verkehrs,
  dieselbe Zahl wie beim Halten – in anderen Orten unsichtbare), wo die Spielfigur wartet (25 m, ihre Richtung), wo man aussteigen will;
  ein Schulbus überall. Sonst fährt er mit dem Tempo der Straße durch (kein Blinker, keine Türen). Kommt jemand später an die Haltestelle
  oder drückt man im Bus „Halt“, hält er doch – wenn er noch bremsen kann (`BUSPLAN.serve`: der Lauf wird ab der Stelle, an der er ist,
  neu gerechnet, ohne Sprung); sonst „Zu spät … – der Bus hält an der nächsten Haltestelle“.
- **Was im Weg steht**: der Bus bremst und hält vor dem, was in seiner Spur steht – die Spielfigur, ihr Auto, ein Auto des Verkehrs, ein
  Bus vor ihm an der Haltestelle – und hupt die Spielfigur an; danach ist er eben ein paar Sekunden (oder Minuten) verspätet. Einem Auto, das
  ihm 20 s lang Spur gegen Spur gegenübersteht, weicht er nicht länger aus (keine Verklemmung).
- **Verkehr**: Autos des Verkehrs (`verkehr/*`) warten hinter einem Bus an der Haltestelle und fahren dann vorbei, Fußgänger gehen um ihn
  herum; für die Spielfigur und Fahrzeuge ist er fest (`VEH.extra`).
- **Fahrgäste** (`bus/bus_leute.js`, `BUSLEUTE`): die Leute des Verkehrs aus Ratscher und Schleusingen fahren auch Bus – ein paar Minuten vor
  einem Bus kommen 0–2 am Straßenrand zur Haltestelle (nach einem Zeitraffer stehen sie schon da) und warten neben dem Schild in die Richtung,
  aus der er kommt; steht er mit offenen Türen, steigen sie vorn ein (der Bus wartet auf sie, ein Bus, in dem man sitzt, fährt ein paar
  Sekunden später ab); hält ein Bus in der Nähe, steigen 0–2 hinten aus und gehen am Rand davon. Wie viele: aus Fahrt, Tag und Haltestelle
  (derselbe Bus bringt dieselben Leute), nachts und früh weniger; wer kommt, wird bis zur Abfahrt weiter gesucht (Leute des Verkehrs können
  gerade unterwegs sein). Wer einsteigt, sitzt danach im Bus, wer aussteigt, steht von einem Platz auf; ein Bus, der in der Welt
  beginnt, ist vor seiner ersten Haltestelle leer. Wer neben einem wartet, sagt etwas („Na, auch auf den Bus?“). Ihre Figuren sind für den Verkehr belegt
  (`VERKEHR.S.busy[k] = 'bus'`), damit niemand doppelt läuft.
- **Einsteigen** an der Vordertür (Aktionsknopf; der Fahrer grüßt nach der Tageszeit: „Morgen!“, „Tag!“, „’n Abend!“), Platz rechts am Fenster hinter der Mitteltür (Ich-Sicht), Fenster mit Linie, Ziel, den
  nächsten Haltestellen und Zeiten; „Nächster Halt: …“ mit Gong beim Abfahren und auf der Anzeige unter der Decke hinter dem Fahrer; „Aussteigen an der nächsten Haltestelle“ oder eine Haltestelle
  antippen = dort aussteigen (Halt-Glocke, „Wagen hält“ rot auf der Anzeige und im Fenster); will an der nächsten Haltestelle jemand anderes
  aussteigen (dieselbe Zahl wie dort beim Halten), drückt er ein paar Sekunden nach der Abfahrt den Haltewunsch; **„Fahrt abkürzen“** (Abblenden, die Uhr springt zur Ankunft, das Gelände dort lädt
  vorher, die Türen sind offen); **„Aussteigen“**, wenn der Bus steht. **„Von außen“** (oder die Ansichtstaste V, der Knopf „Figur/Augen“):
  der Blick von hinten oben auf den fahrenden Bus – mit der Maus um ihn herum, nach einem Moment schwenkt er wieder hinter ihn (wie die
  Verfolgerkamera der Fahrzeuge, nicht durch Hauswände); „Vom Sitz aus“ zurück. Nach dem Aussteigen ist die Ansicht beim Gehen wie vorher. Der Bus fährt seinen echten Weg auch über das 2,4-km-Quadrat hinaus –
  die Kacheln laden vor ihm wie vor einem Auto (`welt/welt.js`, `welt/fahrt.js` schneidet die Straßen ein). Am Ende seines Wegs in der Welt
  steigt man aus („Weiter fährt der Bus über die Karte hinaus – nach …“). Gespeichert während der Fahrt (`pav-bus-v1`): die Haltestelle, an der
  man einstieg oder zuletzt hielt – Neu laden stellt einen dorthin.
- **Aufgabe „Mit dem Bus nach Schleusingen“** (Tagebuch J, `TASKS`, Spielstand `pav-tasks-v1`): beginnt an einer Haltestelle in Ratscher (oder
  mit der Szene) – Fahrplan anschauen, in einen Bus nach Schleusingen steigen (203 oder 205), in Schleusingen aussteigen.
- **Das Modell**: 12-m-Niederflur-Überlandbus ohne Marke (12,0 × 2,55 × 3,1 m, Radstand 5,95 m), Vorder- und Mitteltür als Schwenkschiebetüren,
  2+2-Sitze (Polster im Stoff, Lehne 12° geneigt mit dunkler Schale, Haltegriff an den Gangplätzen), gelbe Haltestangen mit roten
  Haltewunschtastern, Fahrerplatz mit Fahrer, Klimaanlage auf dem Dach, getönte Scheiben zum Durchsehen, Scheinwerfer in den Ecken, LED-Zielanzeige
  vorn, an der Seite und hinten mit Linie und Ziel, ein paar sitzende Fahrgäste und der Fahrer (Beine, Arme, Kopf mit Haaren – aus
  einfachen Körpern, alle in einem Netz). **Blinker**: rechts auf den letzten 45 m vor einer Haltestelle, links in
  den letzten Sekunden vor der Abfahrt und auf den ersten Metern (im Bus das Klicken des Relais); eigenes Material derselben Art wie die
  Rücklichter (kein neues Programm), nur beim Blinken ein Draw-Call mehr. Nachts Scheinwerfer, Rücklichter, beleuchteter
  Innenraum; ein geliehenes Licht vor dem nächsten Bus (`KERN.lights.borrow`, kein neues Licht). Gebaut beim ersten Bus; Material des Verkehrs
  (Vertexfarben), Glas, Lampen und Anzeige mit eigenem Material, die schon beim Laden übersetzt werden (unsichtbare Träger) – keine neuen
  Shader-Programme. Kein Schatten in der Sonnenkarte (ein fahrender Schattenwerfer verlangte jedes Bild eine neue Karte, die Autos des
  Verkehrs werfen auch keinen), dafür ein weicher Schatten auf der Straße unter ihm; neue Bilder fordert ein Bus nur an, wenn man ihn sehen
  kann. 14 Draw-Calls je Bus (gemessen).
- **Ton** (synthetisch): Diesel des nächsten Busses (Drehzahl nach dem Tempo), Türen, Gong, Haltewunsch-Glocke, Hupe, Blinkerrelais.
- **Zombie-Nacht**: keine Linienbusse (sie hat ihren eigenen Bus), keine Fahrgäste.
- Szene **„Mit dem Bus nach Schleusingen“** (`?szenario=bus`, Menü → Erleben → Szenen): nächster Schultag 7:38 an der Haltestelle Ratscher,
  Schleusebrücke (Richtung Schleusingen); um 7:46 kommt die 205 zur Zentralhaltestelle.

## Benutzen und prüfen

- Im Spiel: zur Haltestelle (Schleusebrücke nördlich vom Anger, Schulbushaltestelle an der alten Schule), „Fahrplan“, „Auf den Bus warten“,
  „Einsteigen“; im Busfenster Ziel antippen, „Fahrt abkürzen“.
- Daten neu: `python3 -I viz3/extra/bus/quellen/fahrplan.py --gtfs <latest.zip> [--woche 2026-11-16] [--cache <ordner>] [--bild wege.png]`
  (der Feed: `https://download.gtfs.de/germany/free/latest.zip`, ~280 MB, gestreamt; braucht `pyproj`; die Steige aus der OSM-API werden in
  `--cache` aufgehoben; `--bild` zeichnet die Wege über das Straßennetz).
- Tests: `node --test viz3/test/unit/bus.test.mjs` (Kalender, Daten, Abfahrten in Ratscher, Fahrt nach Schleusingen im Takt, Zufahrt vom
  Rand, die Steige der Zentralhaltestelle, Stationsnamen, Bedarfshalt: durchfahren, rechtzeitig gewünscht halten, ohne Sprung); `python3 viz3/test/bus.py <port> [fahrt,nacht,schule,reload,zombie]` (Bilder in
  `out/bus/`: `a_fahrplan` Fahrplanfenster am Schild, `a2_aushang` Aushangfahrplan, `a3_leute_warten`, `b_bus_an_der_haltestelle`,
  `b0_leute_steigen_ein`, `b2_tuer_offen`, `c_im_bus_panel` Busfenster, `c2_im_bus_telefon`, `d_aus_dem_bus`, `c3_von_aussen`, `h_vorn_ausserhalb` und
  `h2_fenster_ausserhalb` aus dem Bus jenseits des Quadrats, `e_schleusingen_zh`, `f_nacht_vorn`, `g_nacht_seite`, `i_schulbus_haeuschen`),
  auf CI über `viz3/extra/bus/tests.txt`. Die Fahrt im Test: der Bus hält vor der Spielfigur in seiner Spur und hupt; zwei Leute warten und
  steigen ein; in Ratscher einsteigen, „Fahrt abkürzen“ bis zum Krankenhaus, von dort in Echtzeit über den Rand des Quadrats zur
  Zentralhaltestelle (Höhe des Busses gegen den Boden dort geprüft), dort steigt man von selbst aus (die Aufgabe ist erledigt, jemand steigt
  hinten mit aus). Der Test holt die Welt-Kacheln entlang des Wegs Ratscher – Schleusingen von der Website nach `viz3/dist/welt-test/` (wie
  `viz3/test/fahrt.py`).
- `BUS.state()` (Zahlen), `BUS.plan` (BUSPLAN), `BUS.spawn(trip, tag, minute)`, `BUS.einsteigen()`, `BUS.want(k)`, `BUS.shorten(k?)`,
  `BUS.view(außen)`,
  `BUSLEUTE.state()`, `BUSLEUTE.force = { ein, aus, line }` (Tests).

## Entscheidungen (nachts, ohne Falko)

- Realismus vor Bequemlichkeit: die echten Linien, Haltestellen (GTFS-Lage auf die Straße gezogen, ≤ 45 m; die Steige der Zentralhaltestelle
  aus OSM) und Minuten; die Wege der Busse sind der schnellste Weg auf dem Straßennetz der Welt (OSM) – ein Abschnitt, den der Fahrplan so nicht
  fahren kann (> 90 km/h oder viel länger als die Luftlinie), beendet die Fahrt in der Welt (der Bus kommt dort von einer Straße, die die Welt
  nicht hat).
- Uhr in Echtzeit nur beim Warten an der Haltestelle und beim Mitfahren (sonst liefe der Tag im Dorf viel langsamer, weil alle 15 Minuten ein
  Bus durch Ratscher fährt).
- Der Fahrplan gilt im November 2026; das Spiel nimmt für jedes Datum den Wochentag (und Feiertage, Ferien) – Fahrplanwechsel im Dezember
  kennt es nicht.
- Fahrgäste sind die zehn Leute des Verkehrs (ohne die mit Hund) – andere Figuren gibt es nicht; Dorfbewohner (`dorf/`) fahren nicht mit.

## Offen

- Auf dem Telefon liegen die Knöpfe des Hundes (`tiere/tiere_hund.js`, `#hund-panel`) während der Busfahrt über dem Busfenster – Vorschlag
  an `tiere`: ausblenden, solange man mitfährt (`PLAY.seat.kind === 'ride'`).
- Aufnahmen statt synthetischer Töne; eine Haltestellenansage mit Stimme (nur Text und Gong).
- Steige anderer Haltestellen aus OSM (nur, wo der Feed mehrere auf einen Punkt legt – heute nur die Zentralhaltestelle).
- Die Dorfbewohner (`dorf/`) als Fahrgäste.

## Für den Lead

- Gemeinsame Dateien: `viz3/src/modules.txt` (Block `# feat/bus` nach `zombie/z_ziele_bus.js`: `bus/bus_fahrplan.js`, `bus/bus_modell.js`,
  `bus/bus.js`, `bus/bus_leute.js`), `viz3/shell/parts.txt` (eine Zeile `css/bus.css` nach `css/verkehr.css`), neue Datei
  `viz3/shell/css/bus.css`; markiert `// feat/bus`: `welt/fahrt.js` (eine Zeile: `WELT.focus` auch ein Punkt vor dem Bus, in dem man sitzt –
  `FAHRT.focusBus`), `time/clock.js` (die Echtzeit-Uhr für den Bus heißt „Echtzeit – Bus“ statt „Leim offen“, Warten ist dann erlaubt),
  `verkehr/verkehr_auto.js` und `verkehr/verkehr.js` (je eine Zeile: die Busse als Hindernisse, über `window.BUS.obstacles`, weil `bus/bus.js`
  später lädt); `verkehr/verkehr.js` eine zweite Zeile: die Figur eines Fahrgasts (`S.busy[k] === 'bus'`) wird nicht freigegeben, solange er
  an der Haltestelle wartet. `game/hud.js` (eine Zeile in `viewChanged`: ein Sitz mit eigener Außenansicht – `PLAY.seat.view3`, die Busfahrt
  „Von außen“ – zeigt am Knopf „Figur“ statt „Augen“). `bus/bus_leute.js` schreibt in `VERKEHR.S.busy`/`VERKEHR.S.recent` (die Rollenliste des Verkehrs), statt eine
  eigene zu führen. Der Speicherschlüssel `pav-bus-v1` ist in `bus/bus.js` mit `SAVE.key` angemeldet (Prüfung, Standard) – keine Zeile in
  `core/save.js`; dazu `SAVE.once('pav-bus-hint')` (Hinweis einmal).
- Quellen: `credits_add` in `viz3/extra/bus/manifest.json` (gtfs.de/DELFI CC BY 4.0, OSM ODbL für Wege und Steige, Schulferien).
- Neue `window`-Namen: `BUS`, `BUSMOD`, `BUSLEUTE`. Ereignisse `bus:bereit`, `bus:fahrplan`, `bus:warten`, `bus:ein`, `bus:aus`,
  `bus:fahrgast`. Aufgabe `bus-schleusingen` (`TASKS`).
- Figuren der Leute: neue Programme beim ersten Anblick (Haare/Wimpern der Rocketbox-Figuren) wärmt der Lead zentral vor; der Test zählt nur
  die Programme der eigenen Materialien (Bus, Schild, Anzeige, Aushang).
