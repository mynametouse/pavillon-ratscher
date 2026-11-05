# Busse nach dem echten Fahrplan (feat/bus)

Falko, 5.11.2026 23:02 (gewählt): „Busse nach echtem Fahrplan – einsteigen und mitfahren (z. B. Ratscher – Schleusingen)“; 23:17: „Wichtig
ist natürlich trotzdem immer der Realismus. Es soll möglichst eine Spiegelwelt oder ein digitaler Zwilling sogar werden.“ Hilfs-Agent `bus`,
Nacht 5./6.11.2026 (Auftrag `docs/plans/auftraege/bus.md`).

## Was es gibt

- **Echter Fahrplan** (`viz3/extra/bus/dist/bus/fahrplan.json`, 280 KB): aus dem freien Deutschland-Feed von gtfs.de (Daten DELFI e.V.,
  CC BY 4.0, Stand 31.10.2026, gültig November 2026) alles, was die Welt berührt: 33 Haltestellen auf ihren Straßen (Ratscher,
  Schleusebrücke · Ratscher · Ratscher, Schulbushaltestelle · Ratscher, Stausee · Schleusingen mit Zentralhaltestelle, Krankenhaus,
  Gerhardt-Hauptmann-Schule, Felsenkeller, Einkaufszentrum … · Geisenhöhn, Rappelsdorf, Kloster Veßra, Themar, Binnenfischerei …),
  294 Fahrten der Linien 200–205, 207, 214, 222–225, 268 (Werrabus) und 700 (OVG Sonneberg), je Fahrt der Abschnitt in der Welt mit allen
  Minuten. In Ratscher halten werktags die 203 (Suhl – Schleusingen – Ratscher – Hinternah – Masserberg) und die 205 (Schleusingen –
  Ratscher – Eisfeld – Coburg), dazu Schulbusse (268 um 7:02, 214 um 7:40 an der Schulbushaltestelle) und die 700 nach Sonneberg.
- **Welcher Tag gilt**: Kalender des Spiels (`DN.e0` + Spieltag). Wochentag aus einer Bezugswoche des Feeds (16.–22.11.2026);
  Thüringer Feiertage (Neujahr, Karfreitag, Ostermontag, 1. Mai, Himmelfahrt, Pfingstmontag, Weltkindertag 20.9., 3.10., Reformationstag
  31.10., Weihnachten) fahren wie Sonntag. **Schulferien Thüringens** (2025/26–2027) stehen in den Daten; der Feed kennt keine Schultage –
  deshalb fallen in den Ferien die Fahrten aus, die an einer Schule beginnen oder enden (Schätzung, steht so im Fahrplanfenster nicht).
- **Haltestellen**: im Umkreis von 240 m ein Haltestellenschild (grünes H auf gelbem Grund, Name, Fahrplankasten) an der Bordsteinkante jeder
  Fahrtrichtung und jedes Steigs (die Zentralhaltestelle in Schleusingen hat fünf); im Kasten hängt der **echte Aushangfahrplan** dieser
  Richtung (Stunden mit Minuten für Montag–Freitag, Samstag, Sonn- und Feiertag, „s“ = an Schultagen). An der Schulbushaltestelle an der
  alten Schule steht das Wartehäuschen mit Schild schon (`world/village_props.js`); der Bus hält dort mit der Tür am Häuschen (die Lage aus
  Falkos Video, `world/dorfkern_data.js`, statt der 17 m daneben im Feed).
- **Fahrplan am Schild** („Fahrplan: …“): die nächsten Abfahrten dieser Richtung (Zeit, Linie, Ziel, „in 3 min“, „steht da“), der Tag
  („Mittwoch, Schultag“), **„Auf den Bus warten“** (die Uhr springt wie beim Schlafen bis eine Minute vor den Bus).
- **Zufahrt vom Rand**: eine Fahrt, die von außerhalb der Welt kommt (z. B. die 205 aus Coburg über Wiedersbach), fährt vom Rand des
  Straßennetzes der Welt (dort, wo die Straße zur vorigen Haltestelle hinausführt) zu ihrer ersten Haltestelle – mit der Zeit, die ein Bus
  dafür braucht –, und eine, die weiterfährt, bis zum Rand; kein Bus taucht an einer Haltestelle auf (Ausnahme: Hinternah, Neuhof,
  Neuendambach liegen selbst am Rand der Karte).
- **Busse**: jede Fahrt ist ihr Fahrplan; nahe am Beobachter (620 m, Telefon 420 m, höchstens 3 bzw. 2 Busse) bekommt sie ein Modell und
  fährt ihren Weg mit Anfahren, Bremsen und Kurventempo eines Busses in den Minuten des Fahrplans (zu früh: wartet an der Haltestelle), hält an
  jeder Haltestelle mit der Vordertür am Schild, Türen auf und zu (Zischen). **Wer an einer Haltestelle steht, wenn ein Bus fällig ist, und
  wer mitfährt, hat die Uhr in Echtzeit** (`CLOCK.focus('bus')`) – so kommt der Bus zu seiner Minute und fährt so schnell wie ein Bus. Ein Bus
  anderswo fährt in Echtzeit von dort, wo ihn sein Fahrplan hinstellte (er bleibt hinter der schnellen Spieluhr zurück).
- **Verkehr**: Autos des Verkehrs (`verkehr/*`) warten hinter einem Bus an der Haltestelle und fahren dann vorbei, Fußgänger gehen um ihn
  herum; für die Spielfigur und Fahrzeuge ist er fest (`VEH.extra`).
- **Einsteigen** an der Vordertür (Aktionsknopf), Platz rechts hinter der Mitteltür (Ich-Sicht), Fenster mit Linie, Ziel, den nächsten
  Haltestellen und Zeiten; „Aussteigen an der nächsten Haltestelle“ oder eine Haltestelle antippen = dort aussteigen (Halt-Glocke);
  **„Fahrt abkürzen“** (Abblenden, die Uhr springt zur
  Ankunft, das Gelände dort lädt vorher); **„Aussteigen“**, wenn der Bus steht. Am Ende seines Wegs in der Welt steigt man aus („Weiter fährt
  der Bus über die Karte hinaus – nach …“). Gespeichert während der Fahrt (`pav-bus-v1`): die Haltestelle, an der man einstieg oder zuletzt
  hielt – Neu laden stellt einen dorthin.
- **Das Modell**: 12-m-Niederflur-Überlandbus ohne Marke (12,0 × 2,55 × 3,1 m, Radstand 5,95 m), Vorder- und Mitteltür als Schwenkschiebetüren,
  2+2-Sitze, gelbe Haltestangen, Fahrerplatz mit Fahrer, Klimaanlage auf dem Dach, getönte Scheiben zum Durchsehen, LED-Zielanzeige vorn, an
  der Seite und hinten mit Linie und Ziel, ein paar Fahrgäste. Nachts Scheinwerfer, Rücklichter, beleuchteter Innenraum; ein geliehenes Licht
  vor dem nächsten Bus (`KERN.lights.borrow`, kein neues Licht). Gebaut beim ersten Bus; Material des Verkehrs (Vertexfarben), Glas, Lampen und
  Anzeige mit eigenem Material, die schon beim Laden übersetzt werden (unsichtbare Träger) – keine neuen Shader-Programme.
- **Ton** (synthetisch): Diesel des nächsten Busses, Türen, Haltewunsch-Glocke.
- **Zombie-Nacht**: keine Linienbusse (sie hat ihren eigenen Bus).
- Szene **„Mit dem Bus nach Schleusingen“** (`?szenario=bus`): nächster Schultag 7:38 an der Haltestelle Ratscher, Schleusebrücke (Richtung
  Schleusingen); um 7:46 kommt die 205 zur Zentralhaltestelle.

## Benutzen und prüfen

- Im Spiel: zur Haltestelle (Schleusebrücke nördlich vom Anger, Schulbushaltestelle an der alten Schule), „Fahrplan“, „Auf den Bus warten“,
  „Einsteigen“; im Busfenster Ziel antippen, „Fahrt abkürzen“.
- Daten neu: `python3 -I viz3/extra/bus/quellen/fahrplan.py --gtfs <latest.zip> [--woche 2026-11-16] [--bild wege.png]` (der Feed:
  `https://download.gtfs.de/germany/free/latest.zip`, ~280 MB; braucht `pyproj`; `--bild` zeichnet die Wege über das Straßennetz).
- Tests: `node --test viz3/test/unit/bus.test.mjs` (Kalender, Daten, Abfahrten in Ratscher, Fahrt nach Schleusingen im Takt, Zufahrt vom
  Rand); `python3 viz3/test/bus.py <port> [fahrt,nacht,reload,zombie]` (Bilder in `out/bus/`: `a_fahrplan` Fahrplanfenster am Schild,
  `b_bus_an_der_haltestelle`, `b2_tuer_offen`, `c_im_bus_panel` Busfenster, `d_aus_dem_bus`, `e_schleusingen_zh` nach „Fahrt abkürzen“,
  `f_nacht_vorn`, `g_nacht_seite`), auf CI über `viz3/extra/bus/tests.txt`. Der Test holt die Welt-Kacheln entlang des Wegs
  Ratscher – Schleusingen von der Website nach `viz3/dist/welt-test/` (wie `viz3/test/fahrt.py`).
- `BUS.state()` (Zahlen), `BUS.plan` (BUSPLAN), `BUS.spawn(trip, tag, minute)`, `BUS.einsteigen()`, `BUS.want(k)`, `BUS.shorten()`.

## Entscheidungen (nachts, ohne Falko)

- Realismus vor Bequemlichkeit: die echten Linien, Haltestellen (GTFS-Lage auf die Straße gezogen, ≤ 45 m) und Minuten; die Wege der Busse
  sind der schnellste Weg auf dem Straßennetz der Welt (OSM) – ein Abschnitt, den der Fahrplan so nicht fahren kann (> 90 km/h oder viel länger
  als die Luftlinie), beendet die Fahrt in der Welt (der Bus kommt dort von einer Straße, die die Welt nicht hat).
- Uhr in Echtzeit nur beim Warten an der Haltestelle und beim Mitfahren (sonst liefe der Tag im Dorf viel langsamer, weil alle 15 Minuten ein
  Bus durch Ratscher fährt).
- Der Fahrplan gilt im November 2026; das Spiel nimmt für jedes Datum den Wochentag (und Feiertage, Ferien) – Fahrplanwechsel im Dezember
  kennt es nicht.

## Offen

- Fahrgäste steigen nicht sichtbar ein und aus (im Bus sitzen ein paar).
- Der Bus selbst wartet nicht auf Autos vor ihm (er fährt nach seinem Fahrplan).
- Aufnahmen statt synthetischer Töne.

## Für den Lead

- Gemeinsame Dateien: `viz3/src/modules.txt` (Block `# feat/bus` nach `zombie/z_ziele_bus.js`), `viz3/shell/parts.txt` (eine Zeile
  `css/bus.css` nach `css/verkehr.css`), neue Datei `viz3/shell/css/bus.css`; markiert `// feat/bus`: `welt/fahrt.js` (eine Zeile:
  `WELT.focus` auch ein Punkt vor dem Bus, in dem man sitzt – `FAHRT.focusBus`), `time/clock.js` (die Echtzeit-Uhr für den Bus heißt
  „Echtzeit – Bus“ statt „Leim offen“, Warten ist dann erlaubt), `verkehr/verkehr_auto.js` und `verkehr/verkehr.js` (je eine Zeile: die Busse
  als Hindernisse, über `window.BUS.obstacles`, weil `bus/bus.js` später lädt). Der Speicherschlüssel `pav-bus-v1` ist in `bus/bus.js` mit
  `SAVE.key` angemeldet (Prüfung, Standard) – keine Zeile in `core/save.js`.
- Quellen: `credits_add` in `viz3/extra/bus/manifest.json` (gtfs.de/DELFI CC BY 4.0, OSM ODbL, Schulferien).
- Neue `window`-Namen: `BUS`, `BUSMOD`. Ereignisse `bus:bereit`, `bus:warten`, `bus:ein`, `bus:aus`.
