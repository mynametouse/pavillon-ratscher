# Läden belebt, echt einkaufen, Öffnungszeiten (`feat/laeden-leben`)

Hilfs-Agent `laeden-leben` des Grenzland-Chats (session_01L6Yrpf75YEUJPnMQdXevjQ), 17.11.2026, Branch `feat/laeden-leben` (Auftrag
`docs/plans/auftraege/realismus1-laeden.md`, gemeinsamer Teil `realismus1-gemeinsam.md`). Falko (17.11. 13:27): „Die Geschäfte sollen
zum Beispiel auch belebt sein. Man soll dort wirklich einkaufen können. … natürlich braucht es auch der Menschen, die im Supermarkt
rumlaufen, Kassierer und all das. Also öffentliche Gebäude sollten, so gut es geht, zugänglich sein und dann eben auch entsprechende auch
Öffnungszeiten haben …“

## Was es gibt (Stand 4, 17.11. 15:40)

- **Leute im Laden** (`laeden/leben.js`, `LLEBEN`): Solange ein Laden geöffnet hat und man drin ist oder auf ihn zugeht (seine Räume
  stehen, `LINNEN`), hat er seine Leute:
  - **Kassiererinnen und Kassierer** sitzen auf dem Stuhl an den Kassen, die offen sind (wie viele, hängt am Andrang: etwa eine Kasse je
    drei Kunden, mindestens eine), und bewegen beim Kassieren die Hände (ziehen die Ware über den Scanner);
  - an der **Bäckertheke** (REWE, Café & Backshop Drei Ähren bei Lidl) steht jemand und bedient (bei viel Andrang zwei);
  - in ruhigen Stunden **füllt jemand Regale auf** (mit einem Rollwagen voller Kartons), eine halbe Stunde vor dem Öffnen auch schon;
  - bei **OBI** die **Information** und der **Holzzuschnitt**;
  - **Kundinnen und Kunden** mit **Einkaufskorb** (rot oder blau, in der Hand) oder **Einkaufswagen** (geschoben, beide Hände am Griff;
    vor einem Regal bleibt der Wagen im Gang stehen) gehen zwischen den Regalen, bleiben stehen, greifen hinein (unten bücken sie sich),
    stellen sich an einer offenen Kasse an (die Schlange beginnt auf der Seite des Ladens), bezahlen und gehen durch die Schiebetür hinaus
    (die Tür geht für sie auf); neue kommen von draußen herein.
  - **Wie viele**: nach Stunde und Wochentag (`laeden/leben_plan.js`, `LLPLAN.andrang`): Samstagvormittag voll, nach Feierabend viel,
    Dienstagnachmittag ruhig, Bäcker morgens früh und zum Kaffee; Supermarkt höchstens 10 Leute auf einmal (Telefon 5), dazu das Personal
    im selben Budget. Geschlossen: niemand.
  - **Figuren**: die Rocketbox-Leute der Straßen (`chars/vk_*.json`, MIT; Alter und Größe aus `verkehr/verkehr_leute.js` – hinter der Kasse
    nur die im Arbeitsalter), bewegt mit den Bewegungen der Spielfigur über `rbPerson` (`npc/npc_real.js`): gehen, stehen, sitzen, greifen,
    reden, wer nah ist, wird angeschaut. Jede Datei wird einmal geladen und geklont (SkeletonUtils); in einem Laden kein Zwilling, solange es
    andere gibt. Gebaut nur für den Laden, in dem man ist oder vor dessen Tür man steht (30 m), freigegeben, wenn man weg ist (Geometrie,
    Texturen).
  - **Wege**: ein Raster von 0,4 m aus den Umrissen und den Wänden und Einbauten des Ladens (`LLPLAN.grid`), Wege mit A* und gerade gezogen
    (`LLPLAN.pfad`), Plätze vor den Regalen (`LLPLAN.regalPlaetze`); Leute warten, wenn jemand vor ihnen steht (auch die Spielfigur), und
    schieben die Spielfigur aus dem Weg (sie stoßen sich nicht durch sie hindurch).
  - **Licht**: Die Räume sind unbeleuchtet (Licht eingebacken); die Figuren bekommen eine geliehene Lampe in der Nähe der Spielfigur
    (`KERN.lights.borrow`, `laeden:leben`, nur drinnen) – keine neue Lampe, kein neues Shader-Programm (Korb, Wagen, Rollwagen in den
    Parametern des Materials der Dinge des Verkehrs).
- **Echt einkaufen** (`laeden/kauf.js`, `LKAUF`): Jeder Warenblock im Regal ist ein Produkt (`einkauf/waren.js`, `WAREN`: nach der
  Abteilung, aus deren Farben er gemalt ist, und der Art der Packung): vor der Ware sagt der Aktionsknopf **„Nehmen: Frische Vollmilch 1 l ·
  1,19 €“** (E/Tippen), sie kommt in den Korb (oben im Bild „Im Korb: 3 Artikel · 5,47 €“). An einer **offenen Kasse** (mit Personal)
  **„An Kasse 2 bezahlen · 5,47 €“**: die Kassiererin zieht Stück für Stück über den Scanner (es piept), sagt die Summe, man zahlt **bar**
  (Wechselgeld auf dem Bon) oder **mit Karte**, bekommt den **Kassenbon**, die Sachen sind im **Inventar**. Reicht das Geld nicht, bleibt die
  Ware an der Kasse. Geht man mit unbezahlter Ware hinaus, bleibt sie im Laden. An der **Bäckertheke**: „An der Theke bestellen“ – Brötchen,
  Bauernbrot, Pfannkuchen, Streuselkuchen, Kaffee zum Mitnehmen.
- **Waren** (`WAREN`): rund 95 Produkte ohne Marken mit Preisen wie 2026 in einem deutschen Laden (gerundet wie Regalpreise), Gewicht,
  Abteilung, Bild (eine kleine Zeichnung der Packung in der Farbe der Abteilung): Kaffee, Frühstück, Konserven, Nudeln, Gewürze, Süßes,
  Knabbereien, Backzutaten, Drogerie, Haushalt, Tierbedarf, Wein, Getränke (mit Pfand im Preis), Molkerei, Käse, Wurst (Thüringer
  Rostbratwurst), Tiefkühl, Obst, Gemüse, Backwaren, Blumen und Pflanzen; im Baumarkt Werkzeug, Farben (Holzlasur, Leinölfirnis), Elektro
  (LED-Taschenlampe), Eisenwaren (Holzschrauben, Nägel, **Kuhfuß**), Garten (Blumenerde, Saatgut), Bodenbeläge, Fliesen, Baustoffe, **Holz**
  (Dachlatte, Brett, Kantholz, Leimholzplatte).
- **Geldbörse** (`einkauf/geld.js`, `GELD`): ein Weg für beide Spielarten. Im freien Spiel eine eigene Börse (Start **150 €**, gespeichert
  `pav-geld-v1`, in Cent); im **Grenzland-Modus** das Geld des Modus (`GL.geld`, ganze Euro, `GL.pay`/`GL.earn`) – die Cent, die eine Kasse
  will, kommen aus dem Kleingeld, das `GELD` für den Modus daneben führt (3,47 € mit 12 Cent Kleingeld: 4 € über `GL.pay`, 53 Cent zurück
  ins Kleingeld). Verdienen: `GELD.verdienen(cent, wofür)` für die Module, die etwas verkaufen (Garten, Werkstatt, Nebenjobs von `ruf`).
- **Inventar** (`einkauf/inventar.js`, `INVENTAR`): was man gekauft hat, nach Anzahl, gespeichert (`pav-inventar-v1`); im Grenzland-Modus
  sind es die Dinge des Modus (`GL.inv` über `GL.add`/`GL.has`/`GL.use` – ein im Modus bei OBI gekaufter Kuhfuß ist `GL.has('brecheisen')`).
  Das Fenster **„Einkäufe“** (der Knopf mit dem Geld oben rechts, im Laden oder sobald man etwas hat): Geldbörse, die Sachen mit Bild,
  Anzahl und Gewicht, der letzte Kassenbon; dieselbe Liste unten im Inventarfenster (I).
- **Öffnungszeiten** (`einkauf/oeffnung.js`, `OEFFNUNG`): ein Verzeichnis für jeden Laden (`laeden/innen.js` trägt jede Einheit ein: die
  Zeiten aus OSM, sonst die üblichen ihrer Art – „angenommen“) und die öffentlichen Gebäude:
  - **Rathaus Schleusingen** (Stadtverwaltung): Mo, Di 9–11:30 und 14–16, Do 9–11:30 und 14–17:30, Fr 9–11:45 – nach buergerservice.info
    (11/2026, ohne Gewähr);
  - **Naturhistorisches Museum Schloss Bertholdsburg**: Di–Fr 9–17, Sa, So 10–18 (museum-schleusingen.de, 11/2026; Eintritt 6 €,
    ermäßigt 4 €, Familienkarte 14 €, Turm 2 €);
  - Stadtkirche St. Johannis (Mo–Sa 10–17, So 10–17 – um 10 der Gottesdienst), Stadtbibliothek, Postfiliale, Feuerwehr Ratscher
    (Dienstabend, Samstagsdienst) – **angenommen**; Alte Schule Ratscher: der Skatabend freitags (aus `dorf/dorf_cal.js`).
  - Die Läden stehen von Anfang an im Verzeichnis (die Zeiten aus OSM, sonst angenommen – auch die kleinen Läden der Altstadt hinter ihren
    Schildern), damit Nebenaufgaben fragen können, bevor die Daten der Läden geladen sind.
- **Die Kassen wie in echt** (`laeden/innen_markt.js`): bis zum 17.11. lagen Band und Süßwarenregal am Ausgang und das Packfach im Laden;
  jetzt beginnt die Schlange auf der Seite des Ladens (Süßwaren, Band), dann Scanner und Kassiererin, das Packfach zum Ausgang hin. Jede
  Kasse kennt ihren eigenen Bezahlplatz (gegenüber der Kassiererin, 1,6–1,9 m über das Band) und den Anfang ihrer Schlange.
- **Waren, die wie Waren aussehen** (`laeden/waren_bild.js`, `WBILD`): jedes Produkt hat eine bedruckte Vorderseite wie so eine Packung –
  ohne Marke, ohne Logo: das Wort der Ware in schlichter Schrift („Kaffee“, „Spirelli“, „Vollmilch“, „Wandfarbe“), was es ist („gemahlen“),
  die Menge („500 g“), ein einfaches Bild des Inhalts (Bohnen, Tomate, Milch, Ähren, Nudeln …) auf den Farben der Abteilung; Flaschen sind
  Glas mit Etikett, Holz ist Holz mit Aufkleber. An jedem Warenblock auf der Preisschiene das **Preisschild** (weiß, der Preis groß, der
  Name klein, gelber Rand) – der Preis, den die Kasse nimmt. Alles in einem Canvas-Atlas (Rechner 2048², Telefon 1024², ~0,1 s), gemalt,
  wenn die erste Gruppe Läden in 900 m Nähe kommt; gezeichnet je Abschnitt in einem Mesh auf einem Basic-Material mit dem Atlas (ein
  Programm für alle Läden, mit dem Programm der Räume vorab übersetzt). Die dunklen leeren Schildchen an den Schienen sind weg.
  **Lose Ware von oben**: auf den Kisten, Steigen und Pflanztischen liegen Äpfel, Orangen, Bananen, Birnen, Trauben, Pflaumen, Salat,
  Möhren, Tomaten, Kartoffeln, Zwiebeln, Gurken, Brötchen, Brote, Kräuter und blühende Töpfe als gemalte Draufsicht – jede Kiste das
  Produkt ihrer Farbe (das, was die Kasse nimmt).
- **Arbeitskleidung**: das Personal trägt schlichte Arbeitskleidung, nach Körperzonen in die eigenen Texturen der Figur gemalt
  (`GLFIG.dress` des Grenzland-Moduls, wenn es da ist): an der Kasse ein dunkelblaues Polo, an der Bäckertheke weißes Oberteil mit
  Schürze, im Baumarkt eine dunkelgrüne Arbeitsjacke – keine Farbe einer Kette. Die Leute an öffentlichen Schaltern tragen ihre eigene
  Kleidung.
- **Öffentliche Gebäude** (`einkauf/oeffentlich.js`, `OEFFENTLICH`; Personal über `LLEBEN.posten`: eine Figur am Schalter, solange
  geöffnet ist und man in der Nähe ist):
  - **Rathaus, Bürgerbüro** (die Halle von `welt/schleusingen.js`): zu den echten Zeiten steht die Sachbearbeiterin am Schalter und
    arbeitet; „Bürgerbüro: am Schalter fragen“ – wann was offen hat, **Meldebescheinigung** (10 €, ins Inventar), **gelbe Säcke** (umsonst,
    wie in Thüringer Städten üblich), während der Wahl des Ortsvorstehers „Wahlamt, Bauamt, Stadtrat“ (`AMT.rathaus(true)`); geschlossen
    sagt der Schalter die Zeiten. Die Aktion von `amt/` bleibt (sie gewinnt, solange die Wahl läuft).
  - **Naturhistorisches Museum, Schloss Bertholdsburg** (`einkauf/museum.js`, `MUSEUM`): an der Tür der Burg zur Stadt (die Fassade am
    Informationsbrett östlich der Burg) „Naturhistorisches Museum – hineingehen“ (kurz schwarz, wie in die Häuser); drinnen im Ostflügel
    die **Eingangshalle mit der Kasse** (Kassierer zu den Öffnungszeiten, Preistafel, Bank, Garderobe) – Karte für Erwachsene 6 €,
    ermäßigt 4 €, Turm 2 € (`museumskarte`, `turmkarte` ins Inventar) – und durch eine Öffnung der **Ausstellungsraum**: Vitrinen mit
    Mineralen aus Thüringen und den **Schneekopfkugeln** (aufgeschnitten unter Glas), eine Platte **Muschelkalk mit Ceratiten**, ein
    Gemälde **Thüringen vor 300 Millionen Jahren**, das **Wappen der Henneberger** (schwarze Henne auf grünem Dreiberg) mit der Geschichte
    der Burg, an jedem eine Texttafel; „Ansehen …“ zeigt den Text. Ohne Karte schickt einen die Aufsicht zurück zur Kasse. Am Wochenende
    stehen Besucher an den Vitrinen. Gezeichnet mit dem Baukasten der Läden (`LINNEN.drawPlan`) und einer Bilder-Canvas auf dem Programm
    der bedruckten Waren – nichts Neues zu übersetzen; gebaut näher als 90 m an der Burg, frei ab 150 m. Montags geschlossen.
  - **Stadtkirche St. Johannis** (`einkauf/kirche.js`, `KIRCHE`): am Portal in der Mitte der Südwand (wo `welt/schleusingen.js` es
    zeichnet) „Stadtkirche St. Johannis – hineingehen“; drinnen, in den eigenen Mauern der Kirche (ihr Umriss 1 m nach innen für die
    Wände), eine **dreischiffige Halle**: Pfeiler im Takt der Fenster, **Bänke** in Blöcken mit Mittelgang und dem Quergang vom Portal,
    roter Läufer, **Emporen** an der West- und Nordwand mit der **Orgel**, der um eine Stufe erhöhte **Chor** mit **Altar** (Tuch,
    Leuchter, Bibel), Altaraufsatz mit dem Kreuz und **Abendmahlsschranke**, die **Kanzel** am Fuß des Turms mit Treppe und
    Schalldeckel, der **Taufstein**, die Liedtafel, Epitaphe, Messingkronleuchter, die hohen **Fenster** aus hellem Bleiglas genau dort,
    wo die Kirche sie außen hat (im Chor zwei farbige). Der Fuß des Turms steht als verputzter Block mit der Tür zur Sakristei in der
    Ecke. Am Eingang ein **Kerzenständer** („Eine Kerze anzünden · 1,00 €“ – sie brennt weiter), die Begrüßungstafel und das
    **Gästebuch**; am Mittelgang „In die Bank setzen – einen Moment Ruhe“. Am Wochenende sitzt eine **Aufsicht** am Tisch neben der Tür,
    tagsüber sitzt oft jemand still in einer Bank; **sonntags 10–11 der Gottesdienst**: die Pfarrerin in Schwarz am Altar, sechs Leute
    in den vorderen Bänken (an der Tür „Gottesdienst, leise hineingehen“). Eine allgemeine evangelische Stadtkirche in Thüringen – kein
    Anspruch auf das echte Innere. Gezeichnet wie das Museum (`LINNEN.drawPlan` und eine Bilder-Canvas, drei Meshes, nur sichtbar, solange man drin ist),
    gebaut näher als 90 m, frei ab 150 m. Ereignisse `kirche` `{ was: 'betreten' | 'gottesdienst' | 'kerze' | 'sitzen' | 'gaestebuch' |
    'verlassen' }` (Orgel und Glocken gehören dem Klang des Leads – `gottesdienst` ist sein Stichwort).
  - **Stadtbibliothek** (der OSM-Ort östlich der Altstadt, er liegt in einem Haus): an dessen Tür „Stadtbibliothek: Buch ausleihen“ –
    Leseausweis 10 € im Jahr, ein Buch ins Inventar, zurückgeben.
  - **Feuerwehr Ratscher** (die alte Schule ist das Feuerwehrhaus, `dorf/dorf_school.js` nur gelesen): am Aushangkasten „Aushang der
    Feuerwehr lesen“ – Dienstzeiten, Mitmachen ab 16, „Zum nächsten Dienst vormerken“ (Ereignis für Nebenaufgaben). Der Skatabend
    freitags bleibt, wie er ist.
  - Alle Optionen sind Ereignisse `oeffentlich` `{ id, was }` bzw. `museum` `{ was, id }` für die Nebenaufgaben von `ruf`.

## Schnittstellen

- `OEFFNUNG.offen(id, t?)` → `true | false | null` · `OEFFNUNG.zeiten(id)` → „Mo–Fr 8:30–19, Sa 8:30–18“ · `OEFFNUNG.text(id, t?)` →
  „geöffnet bis 20 Uhr“ / „geschlossen – öffnet Montag 7 Uhr“ · `OEFFNUNG.naechste(id, t?)` · `OEFFNUNG.info(id)` · `OEFFNUNG.liste(art?)`
  · `OEFFNUNG.add(id, { name, oh, art, ort, quelle })`. Kennungen: die Einheiten der Läden (`edeka`, `rewe`, `lidl`, `lidlbaecker`, `aldi`,
  `obi`, `mega`, `megarest`, `megamoebel`, `apotheke`, `getraenke`, `turan`, `waesche`, `shell`, `mcd`) und `rathaus`, `museum`,
  `johannis`, `bibliothek`, `post`, `feuerwehr`, `alteschule`.
- `INVENTAR.add(id, n)`, `has(id, n)`, `take(id, n)`, `anzahl(id)`, `list()` (`[{ id, n, name, kg, bild }]`), `gewicht()`, `bons()`,
  `zeigen(an?)`, `bild(id)` (Data-URL) · Ereignis `inventar` `{ id, n, d }`.
- `GELD.stand()` (Cent), `text()`, `zahlen(cent, wofür)` → `true | false`, `verdienen(cent, wofür)`, `modus()` (`'frei' | 'grenzland'`) ·
  Ereignis `geld` `{ d, stand, wofuer, modus }`.
- `WAREN.get(id)` (`{ id, name, preis, kg, art, cat, nutzen }`), `WAREN.list(cat?)`, `WAREN.euro(cent)`.
- `LLEBEN.leute(id?)` → `[{ wer, art: 'kunde' | 'kasse' | 'theke' | 'auff' | 'info' | 'zuschnitt', st, x, y, unit, sitzt, kasse, korb }]`,
  `LLEBEN.kassen()`, `LLEBEN.status()`, `LLEBEN.aktiv()` · Ereignis `laeden:leben` `{ shop }` · `?noleben` lässt die Leute weg.
- `LKAUF.korb()`, `summe()`, `nimm(id, n)`, `zurueck()`, `bezahlen()`, `theke()`, `status()` · Ereignisse `einkauf` `{ laden, unit, posten,
  summe }` (nach dem Bezahlen) und `einkauf:korb` `{ id, n }`.
- Für `ruf` (Nebenaufgaben): z. B. „Brötchen holen“ – `OEFFNUNG.offen('lidlbaecker')`, auf `einkauf` mit `posten` warten oder
  `INVENTAR.has('broetchen', 6)`; für `alltag`: die Türen der Läden aus `LAEDEN.data` (Kunden laufen auf die Haupttür zu, drinnen hat
  `LLEBEN` eigene).

## Testen

- Ohne Browser: `node --test viz3/test/unit/laeden_leben.test.mjs` (Öffnungszeiten, Waren – jeder Warenblock von EDEKA, REWE, Lidl,
  Aldi, OBI und der Bäckerei ist ein Produkt –, Andrang und Besetzung, Wege durch EDEKA, Geldbörse frei und im Grenzland-Modus).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9045 --serve laeden_leben` (Abschnitte
  `markt,obi,kaufen,oeffentlich,kirche`, einzeln z. B. `laeden_leben:kirche`; Bilder in `out/laeden_leben/`); bei GitHub über
  `viz3/extra/laeden-leben/tests.txt` (dazu `smoke`, `laeden_innen`, `laeden`). Bilder der Läufe: `markt_samstag_*`, `markt_kasse`,
  `markt_dienstag`, `markt_sonntag_tuer`, `obi_*`, `kaufen_*`, `baecker_theke`, `rathaus_*`, `museum_*`, `bibliothek`, `kirche_*`.

## Offen

- Die **Post** hat nur ihre Zeiten im Verzeichnis (OSM kennt in Schleusingen keine Filiale).
- **St. Johannis**: das Innere ist allgemein (nicht nach Fotos); die zwei farbigen Chorfenster gibt es nur innen (außen zeichnet
  `welt/schleusingen.js` nur an Wänden über 8 m Fenster); die Lage des Turms liest `KIRCHE` als Zahl aus den Requisiten von
  `welt/schleusingen.js` (−1246,0 / 1213,2, 6,6 m) – zieht der Turm um, muss die Zahl mit. Im Gottesdienst wird nicht gesungen und
  nicht gepredigt (die Pfarrerin steht und redet mit den Händen).
- Ware aus dem Baumarkt taucht noch nicht in der Werkstatt oder im Garten auf (nur im Inventar); Brecheisen und Taschenlampe sind im
  Grenzland-Modus Dinge des Modus (`GL.inv`), die Missionen fragen sie noch nicht ab.
- Getränkekästen und Tiefkühlware von oben bleiben farbig (keine Aufdrucke); die Paletten im Baumarkt zeigen von der Seite nur die
  Stirnflächen ihrer Blöcke (wie im Bausatz von `feat/laeden`).
- Die Kunden gehen auf dem Raster und warten voreinander; sie weichen einander nicht aus (nach 3 s Warten gehen sie weiter).

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/laeden-leben` vor `# feat/laeden` (vier Module `einkauf/*`), `laeden/waren_bild.js` vor
  `laeden/innen.js`, und ein Block nach `laeden/innen.js` (`laeden/leben_plan.js`, `laeden/leben.js`, `laeden/kauf.js`,
  `einkauf/oeffentlich.js`, `einkauf/museum.js`, `einkauf/kirche.js` – die drei letzten brauchen `LLEBEN` und `LKAUF`, deshalb dort).
- `KERN.provide`: `pushOut` 18, `ground` 12, `inside` 12, `place` 36 – nur im Museum (`MUSEUM`) und in der Kirche (`KIRCHE`), solange
  man drin ist.
- Neue `window`-Namen: `OEFFNUNG`, `WAREN`, `GELD`, `INVENTAR`, `LLPLAN`, `LLEBEN`, `LKAUF`, `WBILD`, `OEFFENTLICH`, `MUSEUM`, `KIRCHE`. Neue Speicher-Schlüssel (in den Modulen selbst
  über `SAVE.key` eingetragen, `core/save.js` unverändert): `pav-geld-v1`, `pav-inventar-v1` – für `docs/ARCHITECTURE.md` Abschnitt 8.
- Geliehenes Licht: `KERN.lights.borrow({ id: 'laeden:leben', n: 1, prio: 1 })` nur drinnen in einem Laden mit Leuten.
- Zur Laufzeit eingehängt (keine fremde Datei geändert): der Knopf `#einkaufbtn` in `#hudtr` vor `#menubtn`, ein Teil `.einkauf-inv` im
  Inventarfenster `#invwin` (MutationObserver), die Fenster `#einkaufpanel`, `#kassepanel`, der Hinweis `#korbchip` (Stil vom Modul selbst).
- Grenzland: `GELD`/`INVENTAR` lesen `window.GLSTATE` (nur wenn `on`) – keine Änderung an `grenzland/*`.
- Laufzeiten bei GitHub (SwiftShader): `laeden_leben:markt,obi,kaufen` ~7 min, `laeden_leben:oeffentlich,kirche` ~9 min; die
  bestehenden `laeden` (13–24 min) und `laeden_innen` (15–22 min) sind mit den bedruckten Waren und den Leuten langsamer als vorher
  (bis 766 s bzw. 645 s) – innerhalb der Grenze von 60 min, aber im Prüfpaket spürbar.
- Für den Suhl-Chat (Nachricht 15:35): die Bausätze sind `LLEBEN.posten` (eine Figur an einem Schalter), `OEFFNUNG.add`, `LKAUF.zeige`
  (ein Fenster mit Knöpfen), `GELD`/`INVENTAR` und `LINNEN.drawPlan` mit `LIPLAN.kit` (Innenräume wie Museum und Kirche).
