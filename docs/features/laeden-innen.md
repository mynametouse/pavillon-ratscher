# Läden in Schleusingen von innen (`feat/laeden-innen`)

Hilfs-Agent `laeden-innen` des Chats session_01Mmpsvp11QsXpPSQRRbZ4Jv, Nacht 14.11.2026, Branch `feat/laeden-innen` (Auftrag
`docs/plans/auftraege/laeden-innen.md`). Falko (13.11. 23:56): „wann kann ich alle Gebäude begehen?“ – nach den Häusern von Ratscher die
Läden: jeder Laden von `laeden/laeden.js` (V18o) ist begehbar, jeder in seinem eigenen Umriss.

## Was es gibt

- **Die Einheiten** (`LIPLAN.units`, aus `laeden.json`): EDEKA (Halle und Windfang, das Lager bleibt zu), REWE (Halle und
  Eingangsstreifen), Lidl und das **Café & Backshop Drei Ähren** an seiner eigenen Tür (die Nordecke, 10 × 8,5 m), OBI mit Kassenzone im
  Windfang, Haupthalle, den Südteilen und dem **Gartencenter** (Warmhaus unter dem Glasdach, Kalthaus mit Glaswänden – man sieht den
  Himmel und hinaus), das **Mega Center** in fünf Einheiten (die Ladenstraße hinter dem Südportal, **Aldi** hinter dem Nordportal, das
  **Mega-Restaurant** unter dem Turm, **Mega-Möbel** im Nordflügel, die **Spangenberg-Apotheke** an ihrer Tür zum Hof), die
  Getränkequelle, die Ladenzeile (**Turan Kebap Haus**, **Wäscheservice**), Shell, McDonald’s – 15 Einheiten, keine überlappt.
- **Schiebetüren**: Die beiden Flügel jeder Ladentür sind jetzt eigene Teile (Rahmen auf dem Material der parkenden Autos, Glas aus dem
  Glas des Ladens) und gleiten auseinander, wenn man davor steht und der Laden **nach der Spieluhr geöffnet** hat; von innen gehen sie
  immer auf (man kommt hinaus). Geschlossen bleiben sie zu, der Hinweis an der Tür sagt „geschlossen“. Wo OSM keine Öffnungszeiten kennt
  (Getränkequelle, Shell, Mega Center, Mega-Restaurant, Mega-Möbel, Turan), gelten übliche Zeiten – **angenommen**, im Code
  `DEFAULT_OH` in `laeden/innen.js`.
- **Aufbau beim Herankommen**: näher als 45 m an einer Tür eines Ladens (seine Gruppe steht) baut LINNEN seine Räume (EDEKA ≈ 0,3 s im
  Test-Browser, eine Einheit je Takt), jenseits von 80 m (und nicht drinnen) gibt es sie wieder frei – Geometrien und Material zurück
  (`LINNEN.mem()`). Höchstens zwei Läden stehen zugleich (auf dem Telefon einer); kommt man einem dritten näher, weicht der fernste.
  Solange sie stehen, ist das Glas der Fronten und Türen dieses Ladens weg (nur die Rahmen bleiben): man sieht hinein und von innen
  hinaus. Dafür hat die Fassade von `laeden.js` hinter jeder verglasten Front eine Öffnung (sonst stünde dahinter die Wand); solange
  die Räume nicht stehen, deckt das dunkle Glas sie wie bisher.
- **Die Arten**, nach Fotos solcher Läden in Deutschland, ohne die Gestaltung einer Kette:
  - **Supermarkt/Discounter** (EDEKA, REWE, Aldi, Lidl; `laeden/innen_markt.js`): Obst und Gemüse in Kisten auf schrägen Tischen gleich
    hinter dem Eingang, Regalreihen quer zur Front (Supermarkt 2,05 m mit fünf Böden, Discounter 1,65 m), Kopfregale, Preisschienen mit
    Etiketten, eine Querachse in langen Reihen, Kühlregale an den Rückwänden (Molkerei, Käse, Wurst · Fleisch – mit Lichtleiste), an den
    Seitenwänden Regale (Getränke auf der Seite der Kassen, Haushalt gegenüber), Tiefkühltruhen in den letzten Reihen, die Bäckerei
    (Theke mit Vitrine und Brotregal; beim Discounter die Backwaren-Wand zur Selbstbedienung), der Leergutautomat, die Kassen mit Band,
    Scanner, Kasse, Stuhl und Quengelware, Einkaufswagen. Schilder über den Gängen („Kaffee · Tee“, „Konserven“, „Nudeln · Reis“ …).
  - **Baumarkt** (OBI; `laeden/innen_bau.js`): Hochregale in langen Reihen (Waren in Griffhöhe, darüber drei Ebenen mit Paletten und
    Kartons), Abteilungsschilder hoch über den Gängen (Werkzeug, Farben, Elektro, Sanitär, Eisenwaren, Leuchten, Haushalt, Garten),
    Angebotspaletten am Hauptgang, die Information, der **Holzzuschnitt** mit der Plattensäge, im hohen Südteil Baustoffe auf Paletten
    und Holz auf Kragarmregalen, im niedrigen Bodenbeläge und Fliesen, die **Kassenzone im Windfang**, das Gartencenter mit
    Pflanztischen im Warmhaus, Sträuchern in Töpfen und Erde auf Paletten im Kalthaus; Hallenbinder unter dem Dach.
  - **Möbelhaus** (Mega-Möbel; `laeden/innen_haus.js`): Rauminseln auf Teppich mit hellen Wegen dazwischen – Wohnen (Sofa, Sessel,
    Couchtisch, Teppich, Lowboard, Stehlampe), Schlafen (Doppelbett, Nachttische, Kleiderschrank), Küchen (Zeile mit Arbeitsplatte, Spüle,
    Kochfeld, Oberschränke, Backofen-Hochschrank), Essen (Tisch mit sechs Stühlen, Sideboard), Büro, Kinder (Etagenbett) – je ein
    Schildchen mit dem, was es ist (keine Preise: keine erfundenen Zahlen).
  - **Ladenstraße** (Mega Center): die Eingangshalle vom Südportal mit der Tafel aller Läden, Pflanzkübeln, dann der Gang (7 m) mit den
    Schaufenstern der Mieter und ihren Namen (JYSK, Repo-Markt, AWG-Modecenter, Müller, KiK, Deichmann, Zoofachhandel, Mäc-Geiz,
    Ernsting’s family, Febana, Uhren Schmuck, Friseur, Café & Backshop Drei Ähren) – hinter jedem Glas ein flacher Laden seiner Art
    (Kleiderständer, Schuhregale, Drogerieregal, Aquarien, Spiegel und Stühle, Kuchenvitrine …), Bänke, Pflanzen, Lichtfelder.
  - **Schnellrestaurant** (McDonald’s, Mega-Restaurant): Theke mit Kassen, darüber Menütafeln in schlichter Schrift (Gerichte, keine Preise,
    keine Marken), Küche dahinter, Bestellsäulen am Eingang (McDonald’s), Tische für zwei und vier, der Gang zu den Toiletten („WC“).
  - **Tankstellen-Shop** (Shell): Theke mit Kasse, Zigarettenregal dahinter, Brötchen in der Vitrine, Kaffeeautomaten, Getränkekühlung,
    zwei kurze Regale (Knabbereien, Süßwaren).
  - **Getränkemarkt** (Getränkequelle): Paletten mit Kästen in Reihen (fünf Lagen, oben die Flaschenköpfe), Leergutautomaten, Kasse,
    Kühlregal.
  - **Apotheke, Bäckerei, Imbiss, Wäscheservice**: HV-Tisch mit drei Plätzen und Schubladenwand, Freiwahl an den Seiten; Theke mit
    Vitrine, Brot an der Wand, Tische; Theke mit Salatvitrine und Drehspieß, Tafel „Döner · Dürüm · Lahmacun“; Theke, Maschinen an der
    Wand, Regal mit Wäsche, Falttisch.
  - Waren als schlichte Verpackungen: Kartons, Flaschen, Dosen, Gläser, Tüten, Packungen in gedämpften Farben mit hellem Etikettenband –
    **keine Logos, keine Hausfarben, keine Verpackungsgestaltung, keine echten Produktmarken**. In echter Größe: eine Flasche 7–9 cm
    breit und 27–33 cm hoch, eine Dose 6,5–8 cm, Farbe im Baumarkt als Eimer; jede Ware steht auf einem Boden (oder auf der Lage
    darunter), nicht über dessen Kante, und unter dem nächsten Boden bleibt Luft (Unit-Test). Vitrinen ohne Scheiben, die das
    Dahinter verdecken: Bäckertheke, Salatvitrine, Tiefkühltruhen sind offen, vom Glas nur die Kanten.
  - Im Baumarkt stehen an den Wänden der Verkaufsfläche Wandregale (die eine Seite eines Hochregals) mit dem Schild ihrer Abteilung
    darüber – überall dort, wo sonst nichts steht und vor ihnen ein Gang frei bleibt.
- **Nachts vor dem Laden**: Solange ein Laden leuchtet, liegt vor jeder verglasten Front ein weicher warmer Lichtschein auf dem
  Vorplatz, an der Scheibe am hellsten (offen das Licht des Ladens, geschlossen das Nachtlicht) – auf dem Material der Lichtkegel der
  Straßenlampen (`world/village_props.js`: dessen Programm und Verlauf, je Tür ein Klon für die eigene Helligkeit), kein neues Licht.
- **Licht**: Innen wird alles **unbeleuchtet in Eckfarben** gezeichnet, das Licht ist eingebacken – Oberseiten hell, Seiten nach ihrer
  Richtung, unten dunkler, der Boden an Regalen dunkler (ein Raster dessen, was steht); die Lichtbänder an der Decke leuchten (Farben über 1).
  So sieht ein Laden bei Tag und Nacht gleich hell aus (die höhere Belichtung der Nacht wird ausgeglichen); geschlossen nur das Nachtlicht
  (16 %), bei Tag geschlossen gedämpft. **Keine Punktlichter, keine neuen Shader-Programme**: das Material ist das der Halle des
  Rathauses (`welt/schleusingen.js`, `MeshBasicMaterial` mit Eckfarben), die Türflügel auf `DMOD.mat` (sein schlichtes Programm wird beim
  Start übersetzt), ihr Glas das Glasmaterial des Ladens. Schrift ist Geometrie: jede Zeile wird in eine Canvas geschrieben und zu
  Rechtecken in Eckfarben (kein Texturatlas, nachts lesbar wie bei Tag).
- **Gehen**: Wände (mit Öffnungen zwischen den Teilen eines Ladens), Regale, Theken, Kassen halten auf (`KERN.pushOut`, Rang 17 – vor
  den Wänden von `laeden.js`; in der offenen Tür und im Laden antwortet nur LINNEN, Fahrzeuge bleiben bei `laeden.js`); der Boden trägt
  (`KERN.ground`, Rang 11): er folgt der Ebene des Parkplatzes durch die Haupttür (`WELT.setPads` von `laeden.js`, höchstens 2,5 %
  Gefälle). Drinnen ist drinnen (`KERN.inside`: Hall, kein Regen), der Ortsname nennt die Einheit („Aldi, Schleusingen“, „OBI
  Gartencenter, Schleusingen“). Ein **Einkaufswagen** je Laden lässt sich schieben (Aktionsknopf „Einkaufswagen schieben“ /
  „abstellen“): er rollt vor einem her, Regale halten ihn auf, aus dem Laden heraus bleibt er stehen.
- **Teile**: Jede Einheit ist in Abschnitte geteilt (OBI: Halle, die zwei Südteile, Kassenzone, Warm- und Kalthaus); gezeigt wird der
  Abschnitt, in dem man steht, mit denen, die zu ihm offen sind – von draußen die mit einer Tür. Ein Abschnitt ist **ein Mesh**
  (ein Material): EDEKA 2, OBI 6, das Mega Center 5 Draw-Calls für alles Innere. Wo die Umrisse zweier Teile ein paar Dezimeter
  auseinander liegen (EDEKAs Windfang), schließen Boden, Decke und Laibungen die Fuge; die Lichtbänder bleiben in ihrem Abschnitt.
- **Telefon** (`COARSE`): höchstens ein Laden steht, je Warenblock eine Front (statt einer je Packung), ohne Stirnseiten, ohne
  Preisschilder und Paletten unter den Kartons im Hochregal – je Laden höchstens 120 000 Dreiecke (im Test mit `LINNEN.phone`
  geprüft); am Rechner bleibt alles wie es ist (EDEKA ≈ 0,2 Mio., OBI ≈ 0,25 Mio. Dreiecke).

## Benutzen (Schnittstelle in `viz3/src/laeden/innen.js`)

`LINNEN.status()` (Einheiten, gebaute Läden mit Meshes, Dreiecken, Bauzeit, Türen), `LINNEN.mountShop(id)` / `unmountShop(id)`,
`LINNEN.unitAt(x, y)`, `LINNEN.door('<laden>:<i>')`, `LINNEN.unitInfo(id)`, `LINNEN.meshesOf(id)`, `LINNEN.mem()`,
`LINNEN.views(id)` (je Abschnitt der Platz mit dem weitesten freien Blick, von der Tür aus erreichbar – für Bilder). Ereignis
`laeden:innen` `{ shop, state: 'gebaut' | 'frei' }`. `?noinnen` lässt alles weg (die Läden wie V18o).

Module: `laeden/innen_plan.js` (`LIPLAN`: Einheiten, Wände mit Öffnungen, Baukasten eines Plans – rein), `innen_markt.js` (`LIMARKT`),
`innen_bau.js` (`LIBAU`), `innen_haus.js` (`LIHAUS`) – die Arten, rein; `innen.js` (`LINNEN`): Türen, Aufbau, Zeichnen, Gehen.

## Testen

- Ohne Browser: `node --test viz3/test/unit/laeden_innen.test.mjs` (15 Einheiten, alles im Umriss, von der Tür aus ein großer Teil des
  Bodens erreichbar – Raster 0,3 m, Radius der Spielfigur –, jede Tür in einer Wand, Pläne gleich bei jedem Bau).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9019 --serve laeden_innen` (Abschnitte je Laden:
  `edeka,lidl,rewe,obi,mega,getraenke,zeile40,shell,mcd,nacht`); bei GitHub über `viz3/extra/laeden-innen/tests.txt` (mit `smoke`,
  `laeden`; der Test in zwei Jobs: `edeka,lidl,rewe,obi,nacht` und `mega,getraenke,zeile40,shell,mcd`, je ≈ 12 min). Je Laden: gebaut beim Herankommen, Hinweis „geöffnet“ und die Türen gehen auf (Dienstag 10:30), hinein, der Boden trägt,
  Wände halten auf (20 s geradeaus, 25 s seitwärts), die Räume zeichnen mit Programmen, die es vorher gab, Bilder innen (je Abschnitt
  der Platz mit dem weitesten Blick, `LINNEN.views`), von außen, die Tür mit dem Hinweis (ganze Seite), beim ersten Laden das
  Hineingehen in drei Bildern (zu, geht auf, drinnen), wieder hinaus, am Sonntag bleiben die Türen zu (Hinweis „geschlossen“),
  weggehen gibt alles frei, auf dem Telefon höchstens 120 000 Dreiecke; nachts (ein Novemberabend) REWE offen (innen, außen, der
  Lichtschein vor der Tür) und EDEKA geschlossen (nur das Nachtlicht). Bilder in `out/laeden_innen/`.
- Stand 14.11. ~4:00 (Commit `d2bff7bd`): lokal `smoke` grün, `laeden` 64/64, `laeden_innen:edeka,lidl,rewe,obi,nacht` 51/51,
  `laeden_innen:mega,getraenke,zeile40,shell,mcd` 54/55 (die eine Prüfung – Speicher nach dem Weggehen zählte den schiebbaren
  Einkaufswagen eines anderen Ladens nicht mit – berichtigt, `laeden_innen:mcd` danach 12/12); Unit-Tests 297. Dreiecke je Laden
  (Rechner / Telefon): EDEKA 230 k / 88 k, REWE 257 k / 99 k, Lidl 149 k / 61 k, OBI 242 k / 113 k, Mega Center 222 k / 113 k,
  Getränkequelle 24 k / 16 k, McDonald’s 15 k / 14 k, Ladenzeile 7 k / 6 k, Shell 6 k / 4 k.
- GitHub: Lauf **43554605159** grün (`feat/laeden-innen` `d2bff7bd`): `smoke`, `laeden` 64/64,
  `laeden_innen:edeka,lidl,rewe,obi,nacht` 51/51, `laeden_innen:mega,getraenke,zeile40,shell,mcd` 55/55.

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/laeden-innen` direkt nach `laeden/laeden.js`.
- Markierte Haken in `viz3/src/laeden/laeden.js` (`// feat/laeden-innen`, alle nur wirksam mit `LAEDEN.ownLeaves`, das LINNEN setzt –
  ohne LINNEN bzw. mit `?noinnen` baut `laeden.js` wie V18o):
  - `entrance()`: jede Tür merkt sich ihre Verglasung (`d.hG`, `d.z0`, `d.hD`); die Scheibe spart die Türöffnung aus, keine festen
    Flügel (die Flügel baut und bewegt LINNEN).
  - `shop()`: die Eingänge (Namensbänder, `entrance()`) kommen vor den Wänden (`function entrances()`), damit die Wände ihre Öffnungen
    kennen; die Wände laufen über `edgePieces()` – an einer Kante, vor der ein anderer Teil desselben Ladens liegt, steht die Wand nur
    über diesem (innen öffnen sich die Teile zueinander, LINNEN setzt die Innenwände), hinter der Verglasung eines Eingangs ist sie
    offen; das Muster der Fassade behält seine Grundlinie (`wallBuf().quad(…, { base })`).
  - `interior()` (die dunklen Formen hinter den Scheiben der Restaurants): mit LINNEN nur noch die Lichter, keine Formen (der echte Raum
    steht dahinter); LINNEN verbirgt das Lichterglas (`glas <laden>:licht`) mit dem Glas, solange die Räume stehen.
  - am Ende von `build()` `LAEDEN.onBuild(g)`, am Anfang von `drop()` `LAEDEN.onDrop(g)`; im Takt bleibt verborgen, was in
    `LAEDEN.hidden` steht; `doorLabel` fragt `LAEDEN.doorOpen(sh, d)` (Zustand der Türen, mit angenommenen Zeiten), `doorText` fragt
    `LAEDEN.doorInfo(sh, d)`.
- `viz3/test/laeden.py` (markiert): die Prüfung „an der Haupttür hält das Glas auf“ lässt auch das Hineingehen gelten, wenn LINNEN dort
  einen offenen Laden hat.
- Neuer `window`-Name: `LINNEN`. Keine Speicher-Schlüssel.

## Offen

- Kassiererinnen: die Leute-Bausätze (`dorf/`, `grenzland/gl_fig.js`, `verkehr/`) haben nur Menschen mit Namen, keine allgemeinen
  Figuren fürs Personal – die Läden bleiben leer (so gewollt, Lead 14.11.).
- Öffnungszeiten, wo OSM keine kennt, sind angenommen (`DEFAULT_OH`).
- Die Mieter der Ladenstraße sind flache Läden hinter ihren Scheiben (nicht begehbar); das Kalthaus des Gartencenters hat keine eigene
  Tür (man kommt durchs Warmhaus).
- Die Einrichtung ist schlicht (Kisten, Bänder, Schrift als Geometrie); keine Texturen, keine Spiegelungen auf dem Boden.
