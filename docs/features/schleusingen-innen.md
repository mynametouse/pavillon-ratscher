# Schleusingen von innen (`feat/schleusingen-innen`)

Hilfs-Agent `schleusingen-innen` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, 14.11.2026, Branch `feat/schleusingen-innen` (Auftrag
`docs/plans/auftraege/schleusingen-innen.md`). Falko (13.11. 23:56): „wann kann ich alle Gebäude begehen?“ – nach den Häusern von
Ratscher (V18p) die Häuser der Altstadt von Schleusingen.

## Was es gibt

- **Hineingehen wie in Ratscher**: an der Haustür eines Hauses der Altstadt der Aktionsknopf **„Hineingehen · E“** (auf dem
  Touchscreen derselbe `#doorbtn`), kurz schwarz, man steht drinnen; drinnen an dieser Tür **„Hinausgehen · E“**. Tür, Abblenden,
  Lampen bei Nacht, Fülllicht, Fernseher, Sitzen und Liegen, Speichern (`pav-haeuser-v1`) sind die von `HAEUSER`
  (`haeuser/haeuser.js`); die Räume baut der Baukasten der Zombie-Nacht (`ZIPLAN`, `ZIEINR`, `ZINNEN`: Grundriss im eigenen Umriss des
  Hauses, Fenster genau hinter den gemalten, Möbel im Stil von heute aus `haeuser/haeuser_heute.js`).
- **Welche Häuser** (`SIPLAN.rules`, Stand der Stadt von `welt/schleusingen.js` aus `stadt.json`): von 787 Gebäuden sind **500
  begehbar** – **338 ganze Häuser**, **158 Häuser mit Treppenhaus**, **4 Läden**. Nicht begehbar:
  - Wahrzeichen (Bertholdsburg u. a., `lm`): 4; Kirchen: 2; Gebäude mit Namen (Rathaus – es hat seine Halle –, Schulen, Museum …): 24;
  - Schuppen und Garagen (`k` 2): 31; Hallen (`k` 1): 28;
  - ohne Haustür zu einer Straße (Hinterhäuser, Anbauten): 159; ein Tor statt einer Tür (Tür breiter als 1,3 m) oder höchstens 2,4 m
    Traufe: keins in den heutigen Daten;
  - **zu schmal**: höher als ein Geschoss, aber im Flur ist kein Platz für die Treppe des Baukastens (unter 1,45 m) – ein Geschoss
    unter einer hohen Fassade wäre falsch: 11;
  - **Grundriss**: der Baukasten findet keinen Plan, oder ein Raum hätte keine Tür (ein flaches hohes Haus): 28;
  - die Läden von `laeden/` (McDonald’s, Lidl) sind gar nicht in der Stadt (`LAEDEN.skipStadt`, Zeile in `welt/schleusingen.js`
    bleibt) – sie haben `LINNEN`.
- **Ganze Häuser** (bis zwei Geschosse und kleiner als 140 m², oder ein höheres Haus, neben dessen Treppenhaus keine Wohnung passt):
  das ganze Haus wie in Ratscher – Flur mit Treppe, Wohnzimmer, Küche, Bad, Schlafzimmer, Kinderzimmer, Kammer, Keller unter der Küche
  mit Luke, Dachboden, wo der Baukasten sie hat (Geschosse: 5 × eins, 304 × zwei, 29 × drei).
- **Häuser mit Treppenhaus** (drei und mehr Geschosse, oder zwei auf mindestens 140 m²; 53 × zwei, 104 × drei, eins mit fünf
  Geschossen): der Flur des Baukastens ist auf jedem Geschoss das **Treppenhaus**, die Treppen übereinander bis oben, der Dachboden vom
  obersten Podest. Im Erdgeschoss an der Wand neben der Haustür die **Briefkästen** (einer je Wohnung, Front 32 × 38 cm, 10 cm tief, in
  einer oder zwei Reihen 1,0–1,6 m hoch, Schlitz, Schloss, **leeres Schild**), die Fußmatte. Je Geschoss links und rechts eine Wohnung:
  **eine ist offen** (Wohnungstür mit Matte, Klingel und leerem Namensschild), die andere **„Verschlossen“** („Die Wohnungstür ist
  verschlossen – hier wohnt jemand anderes.“). Die offene Wohnung: Flur (Garderobe, Schuhschrank mit Spiegel, Läufer), Wohnzimmer, Küche,
  Bad, je nach Größe Schlafzimmer und Kinderzimmer – nach einem von zwei Mustern (Flur quer an der Tür mit Zimmern davor und dahinter;
  bei flachen Seiten ein Flur längs mit den Zimmern nebeneinander), jedes Zimmer erreichbar (geprüft).
- **Der Stil 2026** je Haus fest aus seiner Nummer (`SIPLAN.lookOf`): 334 × „heute“, 96 × „heute-90“, 55 × „heute-ddr“, 16 × „alt“
  (die Läden „heute“).
- **Läden**: von den Schildern der Altstadt (die ersten Zeilen der Liste, die die Stadt malt – Bürgerbüro zuerst) haben vier eine Art,
  die passt; dahinter statt einer Wohnung ein Laden mit dem Baukasten von `LINNEN` (`schleusingen/si_laden.js`, gezeichnet von
  `LINNEN.drawPlan` in Scheitelfarben): **Adler Apotheke** (900203), **Stadtcafé** (900228), **Ratsstube** (900213) und **Zum Goldenen
  Löwen** (900226). Die Verkaufsfläche reicht höchstens 12 m tief von der Front und hat 60–120 m² (`SIPLAN.SALES`), der Rest des
  Erdgeschosses bleibt hinter einer geschlossenen Tür **„Nur für Personal“** (Lager, Büro; die Treppe zu den Wohnungen darüber hat ihren
  eigenen Eingang, nicht gebaut). Apotheke: HV-Tisch mit zwei oder drei Plätzen und Bildschirmen, Regale mit Waren dahinter, Freiwahl an
  den Wänden, eine Gondel, ein Stuhl. Café/Bäckerei: die Theke mit Vitrine nah an der Tür, Kasse, Brotregal oder Kaffeemaschine und
  Kuchen, Tische an den Fenstern (Café höchstens acht). Gaststätte: Tresen, Tische mit Stühlen, Garderobe. Geöffnet nach üblichen Zeiten
  (**angenommen**, OSM kennt sie nicht: Bäcker Mo–Sa 6–18, So 7:30–11; Apotheke Mo–Fr 8–18:30, Sa 8–12; Café täglich 9–18; Gaststätte
  täglich 11–22; Laden Mo–Fr 9–18, Sa 9–13); geschlossen sagt die Tür **„Geschlossen“** mit den Zeiten. Die übrigen Schilder (Bibliothek,
  Arzt, Bank, Pflegedienst, Namen) bleiben Häuser mit Wohnungen.
- **Ausgedacht und allgemein**: keine Namen an Klingeln und Briefkästen, keine Fotos von Menschen, keine Marken; Ladennamen nur als die
  schlichte Schrift, die die Fassade schon hat. Beim ersten Hineingehen einmal: „Ausgedacht: so könnte es heute in einem Haus in
  Schleusingen aussehen – die echten Bewohner kennt das Spiel nicht.“ (in einem Laden: „… mit dem echten Geschäft hat er nichts zu
  tun.“). Die echten Nachbarn Hubert und Ronald haben in Schleusingen weder Wohnung noch Szene.
- **Auf dem HUD** der Ort „Treppenhaus, Schleusingen“, „Wohnzimmer, Schleusingen“, „Apotheke, Schleusingen“ …
- **Szene** „Schleusingen von innen“ (`?szenario=schleusingen-innen`, `&art=haus|treppenhaus|laden`, `&haus=<id>`, `&drin=1`): vor einem
  Haus nahe am Markt (oder gleich drinnen).

## Schnittstelle

- `SINNEN` (`viz3/src/schleusingen/si_innen.js`): `status()` (Zustand, Zahl je Art, Gründe der anderen, Schilder, Läden, Planzeit,
  `mounted`), `list()` (die Türen: `id`, `kind`, `shop`, `door`), `info(id)` (Art, Laden, Stil, Geschosse, Räume, offene und
  verschlossene Wohnungen, `check`), `pick(art, x, y)`, `nearDoor()`, `H()`, `before(id)`, `setPhone(v)` (das Budget des Telefons:
  eine Wohnung je Treppenhaus), `shopOpen(art)`, `scen`, `err`. Ereignis **`schleusingen-innen:ready`** `{ n }` (Index fertig).
  Aktionen **`si:zu:<id>:<i>`** („Verschlossen“), **`si:personal:<id>`** („Nur für Personal“), **`si:geschlossen`** („Geschlossen“).
  Speicherschlüssel **`pav-schl-innen-hinweis`** (Hinweis „Ausgedacht“ gezeigt). Ort-Anbieter `place` mit Vorrang 96.
- `SIPLAN` (`viz3/src/schleusingen/si_plan.js`, rein, Unit-Tests): Nummernbereich ab **900000** (`ID0`, `has`, `idOf`), `rules(b)`,
  `record(b)` (das Gebäude als Datensatz in der Form von `VILLAGE.bld`: Rahmen, Fassaden mit Tür und Normalen, Fuß, Traufe, Dach, Kamin,
  `maxSt` 5), `signed`, `shopType`, `shopOf`, `kindOf`, `lookOf`, `flats(P, { phone, seed })`, `shop(P, art)`, `salesRoom(P)`, `SALES`,
  `check(P)`, `SHOPNAME`.
- `SILADEN` (`viz3/src/schleusingen/si_laden.js`, rein, Unit-Tests): `plan(einheit, Deckenhöhe)` – Kästen, Waren, Schilder, Lichter,
  Hindernisse einer Ladenart im Raum; `LAY`.
- Fenster-Namen `SINNEN`, `SIPLAN`, `SILADEN`.
- **Haken** (je mit `// feat/schleusingen-innen` markiert; ohne die Quelle verhalten sie sich wie vorher):
  - `zombie/z_innen_plan.js`: `ZIPLAN.source({ has, get })` – Gebäude eines anderen Orts mit eigenen Nummern (nichts zwischengespeichert,
    solange die Stadt nicht steht), `ZIPLAN.forget(id)`; im Datensatz `roofTris` (eigene Dachflächen), `maxSt` (mehr als drei
    Geschosse), `post(P)` (der Plan umgebaut: Treppenhaus und Wohnungen, Laden).
  - `zombie/z_innen_einr.js`: `room.own(C, room, Pl)` – ein Raum, den sein Plan selbst einrichtet (Treppenhaus, Wohnungsflur, Laden).
  - `haeuser/haeuser.js`: `HAEUSER.addSource({ has, get, near, lookOf, hint, hintKey })`, `HAEUSER.sources` – Türen eines anderen Orts
    (`HAEUSER.list()` bleibt die von Ratscher); `enter(id)` nimmt auch deren Nummern; ihr Hinweis einmal.
  - `laeden/innen.js`: `LINNEN.drawPlan(plan, umriss, zf)` – die Einrichtung eines Plans mit dem Baukasten der Läden in einer Geometrie.
  - `modules.txt`: drei Module nach `haeuser/haeuser.js` (eigener Block). `welt/schleusingen.js` unverändert (die Zeile
    `LAEDEN.skipStadt` bleibt).

## Leistung

- Beim Laden nichts außer drei kleinen Modulen. Steht die Stadt, plant `SINNEN` ihre Gebäude in Scheiben (≤ 3 ms je Bild, zusammen
  ≈ 110–150 ms im Testrechner); ein Raster von 8 m findet die Tür nahebei (fünfmal je Sekunde).
- **Höchstens ein Haus** steht: gebaut beim Hineingehen hinter dem Schwarz (im Mittel ≈ 130 ms, höchstens ≈ 390 ms mit SwiftShader),
  freigegeben beim Hinausgehen – Geometrien und Texturen genau zurück (alle 500 einmal gebaut und freigegeben: dieselben Zahlen wie
  vorher). Drinnen höchstens 58 Draw-Calls (das Haus mit fünf Geschossen; sonst 27–50), höchstens ≈ 48 000 Dreiecke; mit dem Budget des
  Telefons (`SINNEN.setPhone`, `LINNEN.phone`) weit unter **120 000** je Haus.
- **Keine neuen Shader-Programme** für die Häuser: Möbel und Wände sind die Zwillinge des Baukastens wie in Ratscher; der Boden der
  Welt-Kacheln unter dem Haus wird ausgespart (sonst schaute das Gelände durch die Böden) – eine Kopie des Kachel-Materials, die das
  Rechteck des Hauses verwirft, **ein** Programm, beim ersten Haus hinter dem Schwarz übersetzt und gehalten; die Ladeneinrichtung
  zeichnet in Scheitelfarben ohne Licht (das Programm der Rathaushalle und der Läden), beim ersten Laden hinter dem Schwarz vorbereitet.
- **Keine neuen Lichter**: Lampen und Fülllicht nur geliehen (`KERN.lights.borrow`, `zinnen` und `haeuser:fill` wie in Ratscher).

## Testen

- `?szenario=schleusingen-innen` (vor einem Haus nahe am Markt), `&art=treppenhaus` oder `&art=laden`, `&haus=<id>`, `&drin=1`.
- Unit-Tests `viz3/test/unit/schleusingen_innen.test.mjs` (10, ohne Browser): Regeln, Datensatz, Schilder, Ladenarten, Stile, das
  Treppenhaus über viele Größen (Räume im Haus und getrennt, Türen in Trennwänden, jedes Zimmer erreicht, je Geschoss höchstens eine
  offene Wohnung), Telefon, kein Treppenhaus, wenn keine Wohnung passt, die Verkaufsfläche (≤ 12 m, 60–120 m², Personaltür), die
  Läden jeder Art (Einrichtung im Raum und unter der Decke, Wege frei).
- Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9022 --serve schleusingen_innen` (Bilder in
  `out/schleusingen_innen/`), Abschnitte `only=door+walk+night+mem+treppe+laden+looks+sweep+phone+save`, `bilder=1|2`: Zahlen je Art
  und Stil; die Tür bei Tag und Nacht mit Knopf (`*_hud.png`), hinein, Hinweis einmal, Wände, Boden, Treppe hinauf und hinunter, Keller,
  Dachboden, „Hinausgehen“, Kacheln wieder ganz, Speicher zurück, kein neues Programm; Treppenhaus mit Briefkästen (Maße), jedes Geschoss
  über die Treppen, Dachboden, „Verschlossen“, in die offene Wohnung; Laden geöffnet (Verkaufsfläche, „Nur für Personal“) und sonntags
  „Geschlossen“; die Stile ohne eigene Programme; alle Häuser einmal gebaut (Plan geprüft, Draw-Calls, Dreiecke, Fehler, Speicher,
  keine neuen Programme); das Budget des Telefons; Speichern und Neuladen.
- Themen-Tests `viz3/extra/schleusingen-innen/tests.txt` (jede Zeile ein eigener Job, ≤ 60 min): `smoke`, `schleusingen_innen` in zwei
  Hälften, `haeuser:bilder=1`, `zombie_innen`, `laeden_innen:mcd,lidl`, `memphone`.

## Offen

- **Über den Läden**: die Wohnungen über einem Laden sind nicht gebaut (ihre Treppe liegt hinter „Nur für Personal“).
- **Nur vier Läden**: von den Schildern hat nur ein Teil eine Art, die passt; Bäckerei und „Laden“ (Regale) sind fertig, kommen aber in
  den heutigen Schildern nicht vor. Weitere Ladenarten (Friseur, Arzt, Bank als Schalterraum) wären eigene Muster in `si_laden.js`.
- **Schmale hohe Häuser** (11) bleiben zu: der Baukasten braucht für seine Treppe 1,45 m Flur; eine schmale Wendeltreppe wäre ein
  Muster im Baukasten (`zombie/`), nicht gemacht. Ebenso die 28 ohne Grundriss.
- **Ein Haus mit fünf Geschossen** (900180, Treppenhaus): fünf, wie seine Fassade sie zeigt (der Auftrag nannte 2–4); 58 Draw-Calls.
- **Kleine Wohnungsseiten** (unter 2,5 m breit oder unter 4,6 m tief) bekommen keine offene Wohnung, nur eine verschlossene Tür;
  passt in einem hohen Haus auf keiner Seite eine, ist es ein ganzes Haus (15 so).
- **Öffnungszeiten** angenommen (siehe oben).
- **Für `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `docs/PARALLEL.md`** (Dateien des Kern-Chats): Fenster-Namen `SINNEN`, `SIPLAN`,
  `SILADEN`; Speicherschlüssel `pav-schl-innen-hinweis`; Ereignis `schleusingen-innen:ready`; Aktionen `si:zu:<id>:<i>`,
  `si:personal:<id>`, `si:geschlossen`; Szene `schleusingen-innen`, Ort-Anbieter Vorrang 96; Haken `ZIPLAN.source`/`forget`
  (`roofTris`, `maxSt`, `post`), `ZIEINR` `room.own`, `HAEUSER.addSource`/`sources`, `LINNEN.drawPlan`; neuer Ordner
  `viz3/src/schleusingen/` (Modulblock nach `haeuser/haeuser.js`); Themen-Tests `viz3/extra/schleusingen-innen/tests.txt`.
