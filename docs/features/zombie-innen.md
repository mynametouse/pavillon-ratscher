# Zombie-Nacht: die Häuser von Ratscher von innen (`feat/zombie-innen`)

Hilfs-Agent `zombie-innen` (Auftrag `docs/plans/auftraege/zombie-innen.md`), für die Zombie-Nacht auf `feat/zombie`.
Fotos und was daraus folgt: `docs/plans/zombie_einrichtung.md`.

## Was es gibt

- **Jedes Wohnhaus mit Haustür** (`ZINNEN.list()`, 230 Häuser) bekommt beim Betreten einen Innenraum **in seinem eigenen Grundriss**:
  das größte Rechteck des Grundrisses an der Haustürseite (der Rest eines L-Grundrisses bleibt massiv), Außenwände 0,4 m stark,
  Geschosse zu 2,75 m wie die Fassade sie malt, **Fenster genau hinter den gemalten** (gleiche Regel wie der Fassaden-Shader:
  Sockel 0,35/0,6 m, Brüstung 0,85 m, Achsen L / nb) mit Laibung, Rahmen, Sprossen, Glas, Fensterbank, Gardinen, Geranien.
- **Grundriss eines Ernhauses**: Flur (Ern) von der Haustür durchs Haus mit der Treppe, auf der Schornsteinseite Stube (Straßenecke) und
  Küche dahinter – der Kachelofen steht an der Küchenwand –, auf der anderen Seite Kammer und Bad/Vorratskammer/Waschküche;
  oben Schlafzimmer, Kinderzimmer, Kammer, Bad; die Treppe wiederholt sich in jedem Geschoss; **Keller** unter der Küche mit Falltür
  (Luke, öffnet vom Absteigenden weg; von unten „Luke aufdrücken“) und steiler Treppe; **Dachboden** unter dem Dach mit Abseiten
  (Kniestock, wo das Dach unter 1,2 m kommt), Dachuntersicht aus Brettern, Sparren, Kehlbalken, Schornstein mit **Räucherkammer**,
  Wäscheleine, Truhe, Kiste; Bodentreppe im obersten Flur, die dorthin steigt, wo das Dach hoch ist. Oben endet das Geländer an
  einem Pfosten 45 cm vor der letzten Stufe – dort tritt man seitlich ab; neben jeder Treppe bleibt ein Streifen von 50 cm frei von
  Möbeln (der Weg vorbei). **Lange Häuser** (eine Flurseite breiter als 6,6 m) bekommen nebeneinander mehrere Räume: der erste vom
  Flur aus, jeder weitere durch den davor (Kammer vorn, Vorratskammer/Waschküche/Kammer hinten, oben Kammern und Kinderzimmer);
  **tiefe Häuser** (innen ≥ 11,5 m) bekommen hinten ein drittes Zimmer (Stube 42 %, Küche bis 72 %, dahinter Vorrat/Kammer/Waschküche).
- **Drei Zeitschichten** je Haus (aus der Gebäudenummer, immer gleich): „alt“ (Dielen, Streifen- oder Schablonentapete, Lambris,
  Holzdecke, Kachelofen mit Ofenbank, Eckbank, Küchenbüfett/Vertiko mit Röhrenradio, Kohleherd, Spülstein, Federbetten kariert,
  Waschtisch mit Krug, Wandspruch „Auch in dunkler Nacht Gottes Auge wacht“, röhrender Hirsch, Wand- oder Kuckucksuhr,
  Wandschoner „Erst besinn’s, dann beginn’s“), „DDR“ (Schrankwand mit Vitrine, RFT-Radio und Fernseher, Sitzgruppe zum Fernseher,
  Perserteppich, Tischdecke, Häkeldeckchen, Stehlampe, Stores mit Schals, Linoleum, Anbauküche, Kühlschrank, Kohleofen, Bettbrücke,
  Stockbett, Fliesen hellblau-weiß), „Nachwende“ (Eiche rustikal, Ledercouch, Laminat, Einbauküche).
- **Bewohnt** (Durchsicht des Leads 5.11. früh: „zu leer“): auf jeder Ablage Kleinkram – Sammeltassen, Bleikristall, Vase mit
  Blumen, Leuchter, gerahmte Fotos, Obstschale, Zeitung/Fernsehzeitung; DDR mit Häkeldeckchen darunter, auf dem Fernseher und über der
  Couchlehne; Sofakissen mit Knick; an den Wänden 2–4 Dinge je Raum (Bilder, Wandteller, Spiegel, in Küchen ein Kalender, über dem
  Herd der Wandschoner), nie über hohen Möbeln oder Fenstern; Flickenteppiche in alten Häusern; Blumen auf den meisten Fensterbänken
  (Geranie, Grünlilie, in der DDR Kaktus); Gardinen in jedem Raum; Deckenlampen nach Zeit (Glasschale, Kugel- und Tütenlampe,
  flache Deckenschale; Deckenfluter nach 1990); alte Küchen mit Kohlenkasten, Eimer, Topfleiste, Handtuchhalter; auf den
  Arbeitsplatten Vorratsdosen, Brotkasten, Wasserkessel bzw. Kaffeemühle; im Bad Vorleger und Handtuch am Halter; große Räume eine
  zweite Gruppe (Nähtisch mit Nähmaschine, Sessel mit Beistelltisch, Kommode). Alles in Palettenfarben bzw. den Raum-Materialien –
  keine Draw-Calls dazu (höchstens 54 in allen 230 Häusern).
- **Licht bei Tag warm**: die Eigenleuchte der hauseigenen Materialien (Decken, Wände, Böden, Furniere, Teppich, Bilder) ist warm
  getönt (Uniform, kein neues Programm); steht man ohne eingeschaltetes Licht in einem Raum, leiht das Haus bei Tag dasselbe
  Punktlicht aus dem Pool als warmes Fensterlicht einen Meter vor dem Fenster (Stärke mit dem Tageslicht). **Geräusche**: Behälter
  klingen beim Öffnen mit den Türgeräuschen des Spiels (`audio.door`: Schublade gleitet, Tür/Deckel klickt), Innentüren und Luke
  wie bisher über das Türsystem.
- **Benutzbar**: Innentüren als Drehtüren (`DOORS`, Aktionsknopf „Tür öffnen“), Wände und Möbel als Kollision, Böden und Stufen
  begehbar (die Kamera bleibt drinnen), Behälter zum Durchsuchen (Tür/Schublade/Deckel öffnet sich, dann `H.onSearch`; bis zu zehn
  bewegen sich je Haus, die übrigen werden ohne Bewegung durchsucht), Licht je Raum (Schalter an der Tür, ein geliehenes Punktlicht,
  die Lampe leuchtet), Bett, Ofen, Herd, Spüle, Wanne, Tisch, Eckbank, Couch über `H.onUse` (sonst: hinlegen/hinsetzen, kurzer Gedanke).
- **Bewohner** (`dorf/dorf_life.js` PIN) mit festen Zeitschichten und persönlichen Dingen: Gerhard 247 (Bücherregal, Skatkarten und
  Block), Manfred 219 (Feuerwehrhelm, Feuerlöscher), Wolfgang 220 (Motorsäge und Axt als Spots, Waffenschrank, Geweihe), Uwe 260
  (Gummistiefel, Bierkasten), Katrin 198 (Verbandskasten), Ingrid 214 (Schreibtisch mit Ordnern), Jens 246 (Werkzeugkiste),
  Heike 191 (noch ein Regal Eingemachtes, Eierkartons).

## Benutzen (Schnittstelle in `viz3/src/zombie/z_innen.js`)

`ZINNEN.list()`, `ZINNEN.info(id)`, `ZINNEN.mount(id)` → Handle `H` (entry, exit, openings, containers, spots, rooms, graph, inside,
onSearch, onUse, stats), `ZINNEN.unmount(H)`, `ZINNEN.mounted()`. Zusätzlich: `H.roomAt(x, y, z)`, `H.light(raum, an?)`, `H.doors`,
`H.hatch`, `H.plan`, `ZINNEN.pick(x, y)`, `ZINNEN.enter(H)` (Spielfigur an `H.entry`, dritte Person), **`ZINNEN.warm()`** (das eine
Programm des Gelände-Ausschnitts vorab, siehe unten), **`H.route(x, y, z, zx, zy, zz)`** → `{ x, y, z }`: wohin einer im Haus als Nächstes
geht, um zum Ziel zu kommen (im selben Raum das Ziel selbst, sonst der nächste Wegpunkt von `H.graph` auf dem kürzesten Weg – für die
Zombies im Haus; Türen müssen offen sein). `H.graph`: Wegpunkte auf beiden Seiten jeder Tür, vor der ersten und auf der letzten Stufe
jeder Treppe, oben daneben, an der Luke, am Eingang und je Raum ein freier Platz nahe der Mitte, der von seinen Türen aus erreichbar ist.
Ereignisse `zinnen:mount`, `zinnen:unmount`, `zinnen:search`, `zinnen:use`.

- Behälter-Arten: `buefett`, `schrank`, `schublade`, `kuehlschrank`, `kleiderschrank`, `nachttisch`, `truhe`, `kiste`, `regal`, `werkbank`,
  `raeucherkammer`, `verbandskasten`, `werkzeugkiste`, `waffenschrank` (bei Wolfgang).
- Spot-Arten: `bett`, `ofen`, `herd`, `spuele`, `wanne`, `tisch`, `sitz`, `radio`, `tv`, `motorsaege`, `axt` (Wolfgang, Haus 220:
  `H.spots.filter(s => s.kind === 'motorsaege' || s.kind === 'axt')`, Ids `<art>_<n>` je Haus).

Module: `zombie/z_innen_plan.js` (ZIPLAN, Grundriss), `zombie/z_innen_mob.js` (ZIMOB, Baukasten, Materialien, Texturen),
`zombie/z_innen_einr.js` (ZIEINR, Möbel), `zombie/z_innen.js` (ZINNEN).

## Testen

- `?szenario=zombie-innen` (Haus nahe am Anger) oder `?szenario=zombie-innen&haus=<id>`.
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8997 --serve zombie_innen` (Bilder in `out/zombie_innen/`); Optionen
  `zombie_innen:tier=schnell,n=3,only=shots+walk+free`. Läuft auf `feat/zombie-innen` bei jedem Push (`viz3/extra/zombie-innen/tests.txt`).
- Der Test prüft: Szenario, Häuser der Bewohner, Wolfgangs Waffen-Spots, je Haus Aufbauzeit, Draw-Calls (≤ 60), Dreiecke, keine neuen
  Shader-Programme, Auf- und Abbau ohne Rest (Geometrien und Texturen zurück), Gang in die Stube, Treppe hinauf, Bodentreppe, durch die
  Luke in den Keller, Behälter, Licht; Bilder vom Eingang und aus jedem Raum; **Abschnitt `epochen`**: je Zeitschicht ein Haus
  (alt: Gerhard 247, DDR: Manfred 219, Nachwende: Uwe 260 bzw. das erste passende) – Stube (zwei Blickrichtungen), Küche, Schlafraum,
  bei Tag und nachts mit Raumlicht (`out/zombie_innen/epoche_<zeit>_<haus>_<raum>_<tag|nacht>.jpg`). Dazu `__Z.reach(H)`: ein 10-cm-Raster im Haus mit dem
  Radius der Spielfigur, Stufen bis 0,42 m, ohne Stürze – jeder Raum muss vom Eingang zu Fuß erreichbar sein, jeder Wegpunkt von
  `H.graph` dort stehen, wo man stehen kann, und der Graph jeden Raum erreichen. **Durchlauf `sweep`**: alle 230 Häuser einmal auf-
  und abbauen (Fehler, Draw-Calls, Dreiecke, Erreichbarkeit; ≈ 2 min, lokal mit `only=…` abwählbar).

## Für den Lead

- Keine geänderten fremden Dateien. Nichts läuft beim Laden; erst `mount` baut (≈ 80–160 ms je Haus in SwiftShader).
- Programme: im Haus keine neuen (Materialien der Gartengebäude bzw. deren Zwillinge mit gleichen Einstellungen, die Palette); tagsüber
  ein wenig Eigenlicht für Decken und Wände (Emissive-Uniform, kein neues Programm). **Eine Ausnahme, mit Grund:** am Hang läuft das
  Gelände (10-m-Raster) durch Erdgeschoss und Keller (153 von 230 Häusern, bis 12 m). Solange ein Haus gemountet ist, tragen die
  Geländenetze deshalb einen Zwilling von `RATSCHER.terrainMat`, der das Innenrechteck des Hauses ausspart (`discard`, Programmschlüssel
  `geoterrain|zinnen-hole`); beim Unmount kommt das alte Material zurück. **`ZINNEN.warm()` beim Beginn der Zombie-Nacht aufrufen:** es
  zeichnet ein Bild lang das Gelände mit dem Zwilling (leeres Rechteck, schneidet nichts) – das Programm entsteht im echten Renderzustand,
  das Betreten eines Hauses kompiliert danach nichts (Test `progs`). Den Schnitt nicht ins Gelände-Programm selbst: ein `discard` dort
  machte das Gelände auf Apple-GPUs immer teurer.
  Licht: ein Punktlicht aus dem Pool
  (`KERN.lights.borrow`, id `zinnen`). Boden im Haus: ein `ground`-Anbieter (Rang 90) gibt im gemounteten Haus eine Tiefe unter dem
  Keller zurück – nur Böden und Stufen zählen (das Gelände kann den Keller schneiden); dazu `inside` und `place` (Rang 95, Raumname).
- Die Haustür von innen ist ein festes Türblatt; Hinausgehen macht `z_haus.js` (Aktion an `H.openings[0]` bzw. `H.exit`).
- `H.stats.terrain`: wie weit das Gelände im Haus über den Erdgeschossboden reicht (> 0: es würde durch den Boden schauen) – zur Kontrolle.
- `H.openings`: `front: true` tragen die Haustür (immer `openings[0]`, id `haustuer`) und auch die Fenster der Straßenseite.

## Stand und offene Punkte (Abschluss des Hilfs-Agenten, 5.11.2026 ~4 Uhr)

**Stand:** alle 230 Häuser von `ZINNEN.list()` sind begehbar (Jens' Haus 246 gehört nicht dazu, s. u.); in allen ist jeder Raum zu Fuß erreichbar
und jeder Wegpunkt von `H.graph` steht, wo man stehen kann (Durchlauf `sweep`, streng); höchstens 54 Draw-Calls und < 150 k
Dreiecke je Haus; Aufbau im Mittel ≈ 0,12 s, höchstens ≈ 0,5 s (SwiftShader-Rechner, das größte Haus); beim Betreten eines Hauses
kein neues Shader-Programm, wenn `ZINNEN.warm()` zu Beginn der Nacht lief (der Lead ruft es in `ZOMBIE.begin()`). Der Keller ist
ein gutes Versteck: Regal mit Einweckgläsern, Kartoffelhorde, Kohlenhaufen, Werkbank, eine nackte Glühbirne, Zugang nur durch die
Luke in der Küche. Lead-Merges: 9d5f2acd, 67ab2d32, d719ad66, fe9164e9 (auf `feat/zombie`).

**Offen:**
- Jens' Haus (246) ist nicht begehbar: `ZIPLAN.plan(246)` liefert null – der Grundriss (sechs Fassaden, Haustür an einer nur 4,8 m
  langen Seite) ergibt kein Rechteck, das die Tür überspannt und mindestens 4,2 × 4,2 m misst. Seine Werkzeugkiste fehlt damit.
- `H.route` kennt keine Türen: geschlossene Innentüren muss die Zombie-Logik öffnen oder einschlagen (der Lead tut das: Tür auf
  1,1 m aufbrechen). Die Wegstücke sind Geraden zwischen Wegpunkten; an Möbeln rutscht man entlang.
- Wo die Bodentreppe nur neben dem Schornstein Platz fand, fehlt der Schornstein im Dachboden (draußen steht er); ohne Platz für
  eine Bodentreppe gibt es keinen Dachboden (2 Häuser).
- Nicht gemacht: Bauernhäuser mit Stall- oder Scheunentür hinten (der Grundriss kennt nur die Haustür); ein Gelände-Programm ohne
  zweite Variante (bewusst: ein `discard` im Gelände selbst kostete auf Apple-GPUs immer).
