# Zombie-Nacht: die Häuser von Ratscher von innen (`feat/zombie-innen`)

Hilfs-Agent `zombie-innen` (Auftrag `docs/plans/auftraege/zombie-innen.md`), für die Zombie-Nacht auf `feat/zombie`.
Fotos und was daraus folgt: `docs/plans/zombie_einrichtung.md`.

## Was es gibt

- **Jedes Wohnhaus mit Haustür** (`ZINNEN.list()`, gut 150 Häuser) bekommt beim Betreten einen Innenraum **in seinem eigenen Grundriss**:
  das größte Rechteck des Grundrisses an der Haustürseite (der Rest eines L-Grundrisses bleibt massiv), Außenwände 0,4 m stark,
  Geschosse zu 2,75 m wie die Fassade sie malt, **Fenster genau hinter den gemalten** (gleiche Regel wie der Fassaden-Shader:
  Sockel 0,35/0,6 m, Brüstung 0,85 m, Achsen L / nb) mit Laibung, Rahmen, Sprossen, Glas, Fensterbank, Gardinen, Geranien.
- **Grundriss eines Ernhauses**: Flur (Ern) von der Haustür durchs Haus mit der Treppe, auf der Schornsteinseite Stube (Straßenecke) und
  Küche dahinter – der Kachelofen steht an der Küchenwand –, auf der anderen Seite Kammer und Bad/Vorratskammer/Waschküche;
  oben Schlafzimmer, Kinderzimmer, Kammer, Bad; **Keller** unter der Küche mit Falltür (Luke) und steiler Treppe.
- **Drei Zeitschichten** je Haus (aus der Gebäudenummer, immer gleich): „alt“ (Dielen, Tapete/Schablonenmuster, Lambris, Holzdecke,
  Kachelofen mit Ofenbank, Eckbank, Küchenbüfett, Kohleherd, Spülstein, Federbetten kariert, Wandspruch, röhrender Hirsch, Wanduhr),
  „DDR“ (Schrankwand mit Vitrine und Fernseher, Sitzgruppe, Perserteppich, Tischdecke, Stehlampe, Stores mit Schals, Linoleum,
  Anbauküche, Kühlschrank, Kohleofen), „Nachwende“ (Eiche rustikal, Ledercouch, Laminat, Einbauküche).
- **Benutzbar**: Innentüren als Drehtüren (`DOORS`, Aktionsknopf „Tür öffnen“), Wände und Möbel als Kollision, Böden und Stufen
  begehbar (Kamera bleibt drinnen), Behälter zum Durchsuchen (Tür/Schublade/Deckel öffnet sich, dann `H.onSearch`), Licht je Raum
  (Schalter an der Tür, ein geliehenes Punktlicht), Bett, Ofen, Herd, Spüle, Wanne, Tisch, Eckbank, Couch über `H.onUse`.
- Bewohner (`dorf/dorf_life.js` PIN): ihre Häuser haben feste Zeitschichten und erste persönliche Dinge (Gerhard: Skatkarten, Block, Chronik).

## Benutzen (Schnittstelle in `viz3/src/zombie/z_innen.js`)

`ZINNEN.list()`, `ZINNEN.info(id)`, `ZINNEN.mount(id)` → Handle `H` (entry, exit, openings, containers, spots, rooms, graph, inside,
onSearch, onUse, stats), `ZINNEN.unmount(H)`, `ZINNEN.mounted()`. Zusätzlich: `H.roomAt(x, y, z)`, `H.light(raum, an?)`, `H.doors`,
`H.hatch`, `H.plan`, `ZINNEN.pick(x, y)`, `ZINNEN.enter(H)` (Spielfigur an `H.entry`, dritte Person). Ereignisse `zinnen:mount`,
`zinnen:unmount`, `zinnen:search`, `zinnen:use`.

Module: `zombie/z_innen_plan.js` (ZIPLAN, Grundriss), `zombie/z_innen_mob.js` (ZIMOB, Baukasten, Materialien, Texturen),
`zombie/z_innen_einr.js` (ZIEINR, Möbel), `zombie/z_innen.js` (ZINNEN).

## Testen

- `?szenario=zombie-innen` (Haus nahe am Anger) oder `?szenario=zombie-innen&haus=<id>`.
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8997 --serve zombie_innen` (Bilder in `out/zombie_innen/`); Optionen
  `zombie_innen:tier=schnell,n=3,only=shots+walk+free`. Läuft auf `feat/zombie-innen` bei jedem Push (`viz3/extra/zombie-innen/tests.txt`).

## Für den Lead

- Keine geänderten fremden Dateien. Nichts läuft beim Laden; erst `mount` baut (≈ 70 ms für ein Haus mit Keller auf dem Testrechner).
- Programme: keine neuen (Materialien der Gartengebäude bzw. deren Zwillinge, die Palette). Licht: ein Punktlicht aus dem Pool
  (`KERN.lights.borrow`, id `zinnen`). Boden im Haus: ein `ground`-Anbieter (Rang 90) gibt im gemounteten Haus eine Tiefe unter dem
  Keller zurück – nur Böden und Stufen zählen (das Gelände kann den Keller schneiden).
- Die Haustür von innen ist ein festes Türblatt; Hinausgehen macht `z_haus.js` (Aktion an `H.openings[0]` bzw. `H.exit`).
