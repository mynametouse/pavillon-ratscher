# Region-Dossier: Ratscher, Schleusingen, Kloster Veßra, Suhl – heute, gebaut, erlebt

Stand 13.11.2026, Hilfs-Agent `region-dossier` (Auftrag `docs/plans/auftraege/region-dossier.md`, Branch `feat/region`). Für Falko, für
alle, die bauen, und für alle, die Geschichten schreiben. **Jede Aussage hat eine Quelle** in eckigen Klammern; die Liste steht am Ende
(Abschnitt 6). „(unsicher)“ und „→ prüfen“ markieren, was nicht belegt oder nur abgeleitet ist. Keine Privatpersonen; Amtsträger nur in
ihrer Rolle. Was das Spiel heute zeigt, wurde in `docs/features/`, `docs/plans/plan_grenzland.md`, `plan_zeitreise.md` und in den Texten
unter `viz3/src/` nachgelesen.

---

## 0 Kurzfassung – zehn Erkenntnisse

1. **In der DDR gehörte Ratscher nicht zum Kreis Hildburghausen**, sondern zum Kreis Suhl (ab 1967 „Kreis Suhl-Land“, Sitz Zella-Mehlis,
   Bezirk Suhl) – wie Schleusingen. Nur 1950–1952 lagen Ratscher, Schleusingen und Kloster Veßra im Landkreis Hildburghausen; seit
   1.7.1994 wieder. Kloster Veßra steht nicht in der Gemeindeliste von Suhl-Land, lag also wohl im Kreis Hildburghausen. Das Spiel sagt an
   einer Stelle „bis 1994 … im Kreis Hildburghausen“ (`viz3/src/strategie/st_dorf_data.js:729`). [W-KSL] [W-KS] [W-Schl]
2. **Preußisch – ja (im Auftrag „check“):** Ratscher, Schleusingen, Kloster Veßra und Suhl gehörten 1815/16–1945 zum preußischen Kreis
   Schleusingen (Regierungsbezirk Erfurt, Provinz Sachsen), einer Exklave zwischen thüringischen Kleinstaaten (das Heldburger Land im
   Süden etwa gehörte bis 1918 zu Sachsen-Meiningen). [W-Rat] [W-KS] [W-KV] [W-Bill]
3. **Die Talsperre Ratscher hat keine Mauer, sondern einen Damm:** 1975–1983 für den Hochwasserschutz gebaut, 15 m hoher Schüttdamm aus
   Schotter mit Asphaltbeton-Außendichtung, Krone 630 m; seit 1987 auch Erholungsgebiet „Bergsee Ratscher“; die kleine Insel haben die
   Bauarbeiter „in einer Bierlaune“ aufgeschoben. Das Spiel sagt „Staumauer“. [W-TR]
4. **Ratscher lag 1989 nicht im Grenz-Sperrgebiet.** Das Sperrgebiet war rund 5 km breit; Ratscher liegt nach Kartenlage rund 15 km von
   der früheren Grenze (eigene Abschätzung → prüfen mit dem Atlas „Sperrgebiete in der DDR“). Im Dorf also keine Grenzer und kein
   Passierschein – den brauchte man aber, um Verwandte in Dörfern der Sperrzone zu besuchen. [W-IG] [BArch-Atlas]
5. **1989/90 in Suhl ist gut belegt und spielbar:** ab September Treffen in Kreuz- und Marienkirche, erste Großdemonstration am
   4.11.1989, am Abend des 4.12. rund 3000 Menschen vor der Bezirksverwaltung der Staatssicherheit, kurz vor Mitternacht öffnet sich das
   Tor, ein Bürgerkomitee bewacht das Gelände. [W-Suhl] [bpb-Suhl]
6. **Die Region schrumpft und pendelt:** Suhl von 56 345 Einwohnern (1988) auf 34 685 (2024); Landkreis Hildburghausen von 75 168 (1995)
   auf 59 987 (2024); 47,4 % der im Landkreis wohnenden Beschäftigten pendeln aus, das wichtigste Ziel ist Coburg (A 73). [W-Suhl] [W-HBN] [IAB]
7. **Ratschers echtes Dorfgefüge am Anger** (Denkmalliste): Dorfgasthof mit Saal und Nebengebäude, Gemeindesaal mit Ausstattung,
   Gemeindehaus (Anger 24, im Spiel die alte Schule von 1828 mit Glockenturm; ab 1957 Kindergarten, dann Gemeindebüro, heute
   Feuerwehrverein),
   Feuerwehrgerätehaus, Tränke, Gehöfte. Gasthof und Saal fehlen im Spiel – der „Konsum“ der Rückblende ist erfunden. [W-KD] [W-Rat]
8. **Schleusingen liegt auf einer Sprachgrenze:** westlich sagt man zum Thüringer Kloß „Hütes“ (Hennebergisch), östlich „Klüeß“
   (Itzgründisch); die Linie läuft Ilmenau – Schleusingen – Gleichamberg. Hennebergisch ist ein ostfränkischer (mainfränkischer) Dialekt.
   [W-Kl] [W-Henn] [W-Schl]
9. **Kloster Veßra ist mehr als die Ruine:** preußisches Hauptgestüt 1815–1840, Domäne, ab 1953 LPG mit Baumschule und Schäferei, 1975
   „Agrarhistorisches Museum des Bezirkes Suhl“, heute Hennebergisches Museum mit einem Neubauernhaus von 1948 am alten Platz.
   **Heikel:** Das Lokal „Goldener Löwe“ ist seit 2014 ein bundesweit bekannter Neonazi-Treffpunkt – im Spiel steht es als
   Restaurant-POI (`viz3/extra/vessra/dist/vessra/ort.json`). [W-KV] [HMKV]
10. **Die Welt von 1989 sah anders aus als heute:** keine A 73 (Anschluss Schleusingen 2006, durchgehend 2008), die Bundesstraßen hießen
    F 4 und F 247, die Züge fuhren noch nach Suhl, Ilmenau und Themar (eingestellt 1997/98), Autokennzeichen begannen mit „O“ (Bezirk Suhl),
    auf dem Küchentisch lag das „Freie Wort“, die SED-Bezirkszeitung. [W-Schl] [W-KSL] [W-Kfz] [W-FW]

---

## 1 Heute

### 1.1 Landschaft: Täler, Wasser, Wald, Felder

- **Lage.** Ratscher (376 m, Gemarkung 4,41 km²) liegt südöstlich von Schleusingen und südwestlich der A 73 „im kupierten Gelände der
  südlichen Vorgebirgslagen des Thüringer Waldes“; Straßenanschluss L 3004. [W-Rat] Das Vorland zwischen Kamm und Werra ist ein Streifen
  „gemäßigten Berglandes“, rechts der Schleuse mit Schneeberg (692 m) und Schleusinger Berg (671 m), dort liegt auch der Kleine Thüringer
  Wald; vorherrschend ist **Buntsandstein** (die Landesanstalt nennt den Teil „Südthüringer Buntsandstein-Waldland“). Schleusingen liegt
  „am Unterlauf (372 m) von Nahe und Schleuse, nur wenige Kilometer hinter dem Ratscher Bergsee“. [W-HBN] Auf Schleusinger Gebiet steht
  der Adlersberg (850 m). [W-Schl] Über der Talsperre: der Merbelsroder Wachberg (621 m) – von dort das bekannte Foto des Sees. [W-TR]
- **Die Schleuse.** 34,2 km lang, Einzugsgebiet 282,9 km², Hauptquellast „Böse Schleuse“ am Großen Dreiherrnstein; speist zuerst die
  Talsperre Schönbrunn, fließt durch Schleusegrund und die östlichen Ortsteile Schleusingens, durch die **Talsperre Ratscher**, am
  Südrand Schleusingens vorbei und mündet nach weiteren rund acht Kilometern **bei Kloster Veßra in die Werra**. Erstmals 1545 erwähnt;
  der Flussname ist aus dem Ortsnamen Schleusingen rückgebildet. Größter Zufluss: die Nahe (17,8 km), die durch die Kernstadt fließt (dort
  mündet die Erle); weitere: Biber, Wiedersbach (Zufluss der Talsperre Ratscher), Roßbach, der „Bach von Gethles“. [W-Sch] [W-Schl] [W-TR]
- **Talsperre Ratscher.** Bauzeit **1975–1983**, „zum Hochwasserschutz errichtet“; seit **1987** touristisch als „Bergsee Ratscher“
  (Badestrand, Campingplatz, Wassersport, jährlich u. a. ein Countryfestival und ein Rockfestival). Damm: 15 m hoch, Schotter mit
  Asphaltbeton-Außendichtung, Krone 630 m lang und 5,5 m breit, Böschungen 1:2,5; Hochwasserentlastung über einen festen Überlauf in einem
  Turmbauwerk mit Stollen in der Dammmitte (dort auch der Grundablass). Stauziel 392,93 m, im Winter abgesenkt auf 385,50 m; Seefläche
  0,93 km², Stauraum 5,64 Mio. m³, Einzugsgebiet 120 km². „Etwa in der Mitte“ eine kleine Insel, „während der Bauphase von den
  Bauarbeitern in einer ‚Bierlaune‘ aufgeschoben“. [W-TR] Betreiber: Thüringer Fernwasserversorgung; beim Weihnachtshochwasser 2023 hielt
  sie rund 900 000 m³ zurück (so die Quellen des Spiels, Landtags-Drucksache 7/9624 – hier nicht neu gelesen). [Spiel-Wissen]
- **Bergsee heute (Campingportal, Stand unklar):** Saison Ende April bis Anfang Oktober, rund 160 Stellplätze (davon 50 Dauercamper),
  5 Bungalows, „längster Badestrand der Region“ (~500 m Sand), Textil- und **FKK-Bereiche**, Boots- und Tretbootverleih, Segel- und
  Surfschule, Gaststätte, Imbiss, kleiner Laden, Riesenrutsche, Minigolf, Kegeln. [Camp] Das Festival heißt „Schleusinger Countryfestival am
  Bergsee Ratscher“. [Country]
- **Weitere Talsperren:** Schönbrunn (oberhalb, 1967–1979, Trinkwasser für rund 230 000 Menschen in Südthüringen, 23,28 Mio. m³; Brücke
  zum 76 m hohen Entnahmeturm – erste Anwendung des Taktschiebeverfahrens in der DDR) und Erletor (an der Erle, Stadt Schleusingen;
  Baujahr → prüfen). [W-TSch] [W-HBN] Schönbrunn und Ratscher sind Bauten der DDR.
- **Wald und seine Besitzer.** Thüringen: 550 000 ha Wald, rund ein Drittel der Landesfläche; **Privatwald 43 %**, **Staatswald 37 %**
  (ThüringenForst, „insbesondere im Thüringer Wald und im Schiefergebirge“), **Körperschaftswald 16 %** (rund 800 Kommunen und andere),
  Bundeswald 3 %, Treuhandrest 1 %; Kirchenwald (~6000 ha) zählt zum Privatwald; rund 180 000 Waldbesitzer, viele Kleinstflächen. [TF-2015]
  Ein örtliches Beispiel für Kommunalwald: der Hildburghäuser Stadtwald auf dem Buntsandstein-Kamm (500–550 m). [W-HBN] **Schäden
  (Stand April 2025):** 127 000 ha (knapp 23 %) der Waldfläche Thüringens müssen wieder bewaldet werden (u. a. nach Borkenkäferbefall);
  rund 6 Mio. Bäume im Staatswald gepflanzt. [topagrar] Wem der Wald an der Klinge gehört und welches Forstamt zuständig ist: offen → prüfen (vermutlich ThüringenForst, Forstamt
  Schleusingen – nicht belegt).
- **Felder.** Ratscher ist „landwirtschaftlich geprägt“ [W-Rat]; im DDR-Kreis Suhl lag die Landwirtschaft „am Südwestrand“ – also genau hier
  [W-KSL]. Welcher Betrieb die Flur heute bewirtschaftet: offen (→ `daten-katalog`).

### 1.2 Ratscher

- **Ortsteil der Stadt Schleusingen** seit 1994 (Eingemeindung 22.2.1994 laut Artikel Schleusingen, 8.3.1994 laut Artikel Ratscher –
  widersprüchlich). Erste urkundliche Erwähnung 22.7.1318. **Einwohner:** 123 (2013), 142 laut Website der Stadt (abgerufen 12/2025).
  Postleitzahl 98553, Vorwahl 036841. [W-Rat] [W-Schl]
- **Wahrzeichen:** „das alte Schulgebäude mit dem Glockenturm aus dem Jahr 1828 sowie die alte Dorflinde, welche im Jahr 1888 gepflanzt
  worden ist“; die Schule war ab 1957 Kindergarten, dann Büro der Gemeindeverwaltung, heute Vereinsgebäude des **Feuerwehrvereins
  Ratscher**. „Der Ort ist durch das alljährlich stattfindende Country-Fest überregional bekannt.“ [W-Rat]
- **Denkmale (Thüringer Denkmalliste, über Wikipedia; Straße „Ratschner Anger“):** Ensemble mit **Tränke** in der Ortsmitte und einem
  Gehöft; Einzeldenkmale **Feuerwehrgerätehaus**, **Gemeindehaus** (Anger 24 – im Spiel die „alte Schule“), ein **Gehöft**, der
  **Gemeindesaal mit Ausstattung**, der **Gasthof mit Ausstattung und Nebengebäude / Dorfgasthof**. Keine Kirche. [W-KD] [Spiel-Dorfkern]
  Ob Gasthof und Saal heute betrieben werden: offen → prüfen.
- **Bus:** WerraBus (RBA Regionalbus Arnstadt) – Linie 203 Masserberg – Schönbrunn – Waldau – Ratscher – Schleusingen (zweistündlich,
  Mo–Fr bis Suhl) und Linie 205 Coburg – Eisfeld – Brattendorf – Ratscher – Schleusingen (stündlich, am Wochenende zweistündlich). [W-Schl]
  Das Spiel hat beide aus dem Fahrplan. [Spiel-Bus]
- **Nachbarn:** Merbelsrod (Gemeinde Auengrund) am Wachberg ist Sitz der **NIDEC GPM**, eines Autozulieferers (1939 als Karl Schmidt
  Präzisions-Flugzeugteile gegründet, seit 1949 Wasserpumpen für Fahrzeuge); die größten Industriebetriebe des Landkreises stehen in
  Merbelsrod (Autozulieferer), Schönbrunn (Lebensmittel; dort auch ein Gewürzmuseum) und Schleusingen (Glas). [W-Merb] [W-HBN]
- **Kirche, Kirmes:** In Ratscher steht keine Kirche in der Denkmalliste; zu welcher Kirchgemeinde das Dorf gehört, ist offen. Im
  Pfarrbereich Schleusingen stehen im Herbst Kirmes-Gottesdienste im Kalender (Gemeindebrief Sept.–Nov. 2025, Orte in der Tabelle nicht
  eindeutig). [EKM] → vor Ort fragen: Kirmestermin, Kirmesbaum, Saal.
- **Persönlichkeit:** der Städtebauer und Gebietsplaner Rolf Kuhn (1946–2024) ist in Ratscher geboren. [W-Rat]

### 1.3 Schleusingen

- **Größe:** 10 225 Einwohner (2024; 2022: 10 542), davon Kernstadt 4122 (2013). 17 Ortsteile: Altendambach, Breitenbach, Erlau,
  Fischbach, Geisenhöhn, Gethles, Gottfriedsberg, Heckengereuth, Hinternah, Hirschbach, Oberrod, Rappelsdorf, Ratscher,
  Schleusingerneundorf, Silbach, St. Kilian, Waldau. Volkstümliche Namen für Wohngebiete: Ober- und Unterstadt, Schmuckplatz, Weißer Berg,
  Hirtengrund, Kalkrangen, Sonneneck, Rubetal. [W-Schl]
- **Mitte:** Markt mit Rathaus und **Elisabethbrunnen**, Schloss **Bertholdsburg** (darin das Naturhistorische Museum), Stadtkirche
  **St. Johannis** (1725 barock umgebaut; Ägidienkapelle seit 1566 Grablege der Henneberger), die **Kreuzkirche** am Friedhof im Norden
  (Gottesackerkirche 1600–1602, Orgel 1896), die **Teutsche Schule**, Reste der Stadtmauer mit Türmen, der **Wilhelmsbrunnen** (Badehaus ab
  1709). [W-Schl]
- **Schule:** Hennebergisches Gymnasium „Georg Ernst“, am 7.6.1577 eingeweiht, eines der ältesten Gymnasien Deutschlands; Neubau 1870–1874.
  [W-Schl] Weitere Schulen: die Fahrplandaten der App kennen die Haltestelle „Gerhardt-Hauptmann-Schule“ (Schulart → prüfen). [Spiel-Bus]
- **Arbeit:** größte Arbeitgeber mit je rund 250 Beschäftigten: das **Behälterglaswerk** (seit Ende 2011 Wiegand-Glas; täglich zusammen mit
  drei weiteren Werken über acht Millionen Glasbehälter) und die **Stiftung Rehabilitationszentrum Thüringer Wald**; viele Arbeitsplätze im
  **MEGA-Einkaufszentrum**; Gewerbegebiete „gut ausgelastet“, niedrigster Gewerbesteuer-Hebesatz im Landkreis (300 ab 2018). Das frühere
  Krankenhaus (Regiomed) ist heute eine Pflegeeinrichtung. [W-Schl] [W-WG]
- **Sicherheit, Vereine, Feste:** Freiwillige Feuerwehr Schleusingen als Stützpunktfeuerwehr des Landkreises; Rettungswache der
  Johanniter. SC 07 Schleusingen (Kreisliga, Hennebergstadion). **Burg- und Stadtfest** mit der **Abitaufe**: die Abiturienten werden in
  geschmückten Handwagen zum Elisabethbrunnen gefahren und mit Brunnenwasser „getauft“; früher schickte jeder vom Postamt ein Telegramm
  „Abi bestanden. Schickt Geld!“. Städtepartnerschaft mit Plettenberg (Sauerland) seit 1990. [W-Schl]
- **Stadtspitze:** Bürgermeister seit 2024 aus der CDU (1990–2018 ebenfalls CDU, 2018–2024 Freie Wählergemeinschaft). [W-Schl] Keine
  echten Amtsträger als Spielfiguren.
- **Zivilcourage 2007:** Als ein NPD-Funktionär in die Freiwillige Feuerwehr Schleusingen eintreten wollte, legte die Wehr eine Liste mit
  42 Mitgliedern vor, die dann austreten würden; der Bürgermeister lehnte ab – „machte den Ort in ganz Deutschland bekannt“. [W-Schl]

### 1.4 Kloster Veßra

- **Gemeinde** im Landkreis Hildburghausen, Verwaltungsgemeinschaft Feldstein (Sitz Themar), Ortsteile Neuhof und Zollbrück; „an der
  Einmündung der Schleuse in die Werra“, im „fränkisch geprägten Süden von Thüringen“. Der Ort war immer klein (1790 knapp 150, 1910 etwa
  250 Einwohner). Gemeinderat (2024) aus vier Wählergruppen, zwei davon Feuerwehrvereine. [W-KV]
- **Hennebergisches Museum Kloster Veßra:** Freilichtmuseum auf 6 ha; Gebäude aus dem Henneberger Land wurden **1978–2001** hierher
  versetzt (Bauern- und Wirtschaftsgebäude, Handwerkerhäuser, Gemeinschaftsbauten), am Platz steht ein **Neubauernhaus von 1948**.
  [HMKV] Dazu u. a. das umgesetzte **Dorfbrauhaus aus Wolfmannshausen** (die Brauanlage wird mehrmals im Jahr betrieben), ein Bauernhaus
  von 1716, eine Wassermühle (teilweise um 1600). Die **Henneberger Kapelle** (Grablege bis 1566) dient heute als Dorfkirche. Im Klosterhof
  (rund 6 ha, ummauert): Ruine von St. Marien („bedeutendstes romanisches Baudenkmal zwischen Rhön, Grabfeld und Rennsteig“), Torkapelle,
  Klausur, Rest des Kreuzgangs, Bibrasche Kapelle. [W-KV]
- **Baumschule Kammbach** (Schulstraße) – im Spiel schon Ziel des Gartenplaners. [Spiel-Veßra]
- **Heikel:** „Im Dezember 2014 kaufte [ein bekannter Neonazi-Aktivist und NPD-Kreistagsabgeordneter] … das Lokal *Goldener Löwe* und
  machte daraus einen weit bekannten Neonazi-Treffpunkt und Veranstaltungsort“; 2022 erhielt er bei der Bürgermeisterwahl 30 %, der
  Amtsinhaber gewann. [W-KV] → Siehe Korrektur K6.

### 1.5 Suhl und seine Rolle für die Gegend

- **Oberzentrum mit Schwund:** höchster Stand 56 345 Einwohner (31.12.1988), 2024 noch 34 685. [W-Suhl] Von 2001 bis 2013 wurden 5729
  Wohnungen zurückgebaut; Suhl-Nord (2001: 5358 Wohnungen) soll bis 2025 fast ganz abgerissen sein. Wohnungsunternehmen: städtische GeWo
  und AWG „Rennsteig“ eG. Große Neubaugebiete: Aue, Friedbergsiedlung, Suhl-Nord, Ilmenauer Straße, Himmelreich/Döllberg. [W-Suhl]
- **Was man in Suhl holt:** das **SRH Zentralklinikum** – „das größte Klinikum Südthüringens“; das **Congress Centrum Suhl** (CCS, 1995
  aus der alten „Stadthalle der Freundschaft“, Saal bis 5000 Besucher; darin seit 2007 das Fahrzeugmuseum mit rund 220 Stücken, vor allem
  Simson); das Waffenmuseum im Malzhaus (Fachwerk, 1663); der Regionalexpress nach Erfurt (Anschluss der Buslinie 200 aus Schleusingen).
  [W-Suhl] [W-Schl]
- **Arbeit nach 1990:** u. a. Merkel Jagd- und Sportwaffen, das Zimbo-Werk (bis 1990 Fleischkombinat), Großbäckerei Gramss, ein
  CD/DVD-Presswerk, Autozulieferer; Simson ging 2002/2003 endgültig in die Insolvenz. Einzige Berufsfachschule für Büchsenmacher in
  Deutschland (seit 1992). [W-Suhl] [W-Sim]
- **Neue Leute:** seit Juli 2014 Erstaufnahmeeinrichtung für Asylsuchende auf dem Friedberg (in den Gebäuden der früheren
  Offiziershochschule der Grenztruppen), Ende 2015 über 1600 Bewohner; 2015 Proteste der rechtsextremen „Sügida“ und Gegendemonstrationen.
  [W-Suhl]
- **Feste:** Straßentheaterfestival (seit 2014, erstes Septemberwochenende), Kulturfestival „Provinzschrei“, Geschichtsmesse (seit 2008).
  [W-Suhl]

### 1.6 Mobilität

- **Straße:** A 73 Suhl – Coburg – Nürnberg, Anschluss Schleusingen seit 2006, nach Süden durchgehend seit 2008; L 3004 (früher B 4)
  Ilmenau – Schleusingen – Eisfeld; L 3247 (früher B 247) nach Suhl/Zella-Mehlis und Oberhof. [W-Schl]
- **Bus:** Schleusingen ist Knoten des WerraBus-Netzes (RBA); Linien 200 (Suhl – Schleusingen – Hildburghausen, stündlich), 201, 202, 203,
  205, 225/226 (Themar – Kloster Veßra – Rappelsdorf – Schleusingen, ohne Takt, nicht am Wochenende); dazu Schülerfahrten. [W-Schl]
- **Schiene:** keine mehr. Friedbergbahn Schleusingen – Suhl 1997 stillgelegt („eine der steilsten normalspurigen Strecken“),
  Rennsteigbahn (Ilmenau – Schleusingen – Themar) 1998 eingestellt; Dampfsonderfahrten der „Dampfbahnfreunde mittlerer Rennsteig“. [W-Schl] [W-Suhl]
- **Pendeln:** Im Landkreis Hildburghausen 12 312 Aus- und 4751 Einpendler, Auspendlerquote **47,4 %** (30.6.2024); 34 110 Thüringer
  arbeiten in Bayern; „Landkreis und Stadt Coburg sind die wichtigsten bayerischen Ziele“, 92,1 % der Auspendler nach Coburg kommen aus
  Sonneberg und Hildburghausen. Suhl hat mehr Ein- als Auspendler (7310 zu 6393). [IAB]

### 1.7 Stimmung der Region

- **Weniger und älter:** Landkreis Hildburghausen 75 168 (1995) → 67 007 (2010) → 59 987 (2024). [W-HBN] Suhl verlor seit 1988 fast
  40 % (eigene Rechnung aus [W-Suhl]). Im Zukunftsatlas 2022 Platz 272 von 400 („ausgeglichene Chancen/Risiken“). [W-HBN]
- **Grenzlage als Haltung:** 2013 brachte der damalige Landrat aus Protest gegen Großkreis-Pläne einen Wechsel des Landkreises nach Bayern
  ins Gespräch; die Gebietsreform scheiterte 2017. [W-HBN] Der Alltag ist bayerisch verflochten (Pendeln nach Coburg, Bus 205). [IAB] [W-Schl]
- **Wald im Umbruch, Wasser als Gefahr:** fast ein Viertel des Waldes muss neu begründet werden [topagrar]; Weihnachtshochwasser 2023
  [Spiel-Wissen].
- **Rechtsextreme Präsenz und Widerspruch** gehören zur Wirklichkeit (Kloster Veßra, Sügida in Suhl, NPD-Versuche in Schleusingen) – ebenso
  die Zivilcourage der Schleusinger Feuerwehr. [W-KV] [W-Suhl] [W-Schl] Für das Spiel: zeigen, wenn überhaupt, dann nur über die Gegenwehr,
  nie als Kulisse.

### 1.8 Medien

- **Freies Wort** (Suhl): Regionalzeitung für Suhl und die Landkreise Hildburghausen und Sonneberg und Teile weiterer Kreise; gegründet
  15.8.1952 als *Das Freie Wort*, „Organ der SED-Bezirksleitung“, seit 9.3.1956 *Freies Wort*, galt mit 157 400 Exemplaren als kleinste
  SED-Bezirkszeitung; 1991 an Süddeutschen Verlag (70 %) und ddvg (30 %); Lokalredaktion Hildburghausen. [W-FW] Weitere Lokalmedien
  (Amtsblatt, Wochenblätter, Radio, Lokal-TV): nicht geprüft.

### 1.9 Küche

- **Thüringer Klöße** („Grüne Klöße“, „Hütes“, „Knölla“): handgeformt aus ⅔ rohen geriebenen und ⅓ gekochten Kartoffeln; dazu
  geröstete Semmelwürfel – in Suhl „**Weckbröckle**“, in Meiningen „Semmelbröckchen“. [W-Kl] Das klassische Sonntags- und Festessen:
  Klöße mit Apfelrotkohl, Rinderrouladen, fette Bratensoße, Pils oder Schwarzbier. **Thüringer Rostbratwurst**, Rostbrätel, viel Wurst und
  Wild, Gehacktes. **Blechkuchen** statt Torte (Schmandkuchen, Zwiebelkuchen …); auf Dörfern wird teils noch der Gemeinschaftsbackofen
  angeheizt. [W-ThK]
- **Hütesfest** in Meiningen (Juni/Juli) mit dem Hütes-Ritual nach einer Meininger Sage. [W-Kl]

### 1.10 Mundart

- **Hennebergisch** gehört zum nordwestlichen Ostfränkischen und wird in Schleusingen, Themar, Suhl und ganz Schmalkalden-Meiningen
  gesprochen; im Landkreis Hildburghausen überwiegt sonst das **Itzgründische**, im Süden das **Grabfeldische**. [W-Henn] [W-HBN] [W-Schl]
- **Die Kloß-Linie:** westlich der Linie Ilmenau – Schleusingen – Gleichamberg (Südhennebergische Staffelung) heißen die Klöße **Hütes,
  Höbes, Hebes**; östlich auf Itzgründisch **Klüeß**, auf Ilmthüringisch **Knölla/Gleeß**. [W-Kl] Ratscher liegt südöstlich von
  Schleusingen, also an oder knapp hinter dieser Linie (unsicher – im Dorf fragen, welches Wort man sagt).
- **Echte Suhler Mundart** (aus einem Buch des Rates des Kreises Suhl von 1955, zitiert bei Wikipedia):
  „*Off’n Sonntig gitt’s Hütes / Mit Flaisch on mit Brüh; / Uehne Hütes kai Sonntig, / Doe gähtt halt niß drü.*“ – Am Sonntag gibt es Klöße
  mit Fleisch und Brühe; ohne Klöße kein Sonntag, da geht nichts drüber. Und: „*D’r Hütes muß weiß sei / On net taubegroe*“ (weiß, nicht
  taubengrau). [W-Kl] Daraus: **net** (nicht), **niß** (nichts), **kai** (kein), **on** (und), **Fra** (Frau), **senn** (sind),
  **Soppe** (Suppe), **verze Töä** (vierzehn Tage), Verkleinerung auf **-le** (Weckbröäckle).
- **Ostfränkisch allgemein** (für Ratscher nicht einzeln belegt): **mir** für „wir“ („mir mähn, ihr mäht“), **i** für „ich“, weiche
  Konsonanten (t wie d, k wie g, p wie b), **Berch** für Berg, **Vochel** für Vogel, teils **Brurer** für Bruder. [W-Ofr]
- **Zum Vergleich Itzgründisch** (Sonneberger Gegend, nicht Ratscher): „*Des Kindla ka fei g’schrei.*“ – Verkleinerung auf **-la**
  (Mädla, in Sonneberg Meadla), die Partikel **fei**. [W-Itz]
- **Das Fest heißt** in Thüringen „Kirmes“, in Dörfern der Stadt Suhl teils „**Kermes**“, im Heldburger Land (Ummerstadt, Bad Colberg)
  fränkisch „**Kerwa/Kärwa**“. [W-Kw]
- **Zum Nachlesen:** Gudrun Bock, *Die Mundart von Waldau bei Schleusingen* (1965; Waldau liegt an der Linie 203 gleich neben Ratscher);
  Julius Kober, *Die
  Mundart der Stadt Suhl im Thüringer Wald* (1963); Erhard Köhler, *Mundart – Kleiner Thüringer Wald / Hennebergisch-fränkischer Dialekt –
  Wörterbuch* (2004); W. F. H. Reinwald, *Hennebergisches Idiotikon* (1793/1801, Google Books). [W-Henn]

### 1.11 Sagen

- **„Schleusingens Ursprung und Name“** (Bechstein, Deutsches Sagenbuch, Nr. 725): Ein Graf jagt eine weiße Hirschkuh bis in eine
  glitzernde Grotte; eine Wasserfei erzählt, die Hirschkuh sei ihre von einem bösen Zauberer verwandelte Tochter. Der Graf schläfert den
  Zauberer ein, tötet ihn, besprengt die Hirschkuh mit Quellwasser – sie wird Mädchen, er heiratet sie, nennt sich „von der Brunstätt“ und
  gründet Burg und Stadt, deren Name aus den Buchstaben SLVS kommt. „Die Wasserfei soll noch im **Schloßbrunnen**, dem klarsten und besten
  der Stadt, wohnen.“ [Bechstein]
- **Die Meininger Hütes-Sage:** Frau Holle lässt wegen sauren Weins die Reben erfrieren und schenkt den Meiningern zum Trost die Kartoffel
  und das Kloßrezept („Hüt es!“). [W-Kl]
- **Die Henne:** Das Schleusinger Wappen zeigt im Tor der Burg eine schwarze, rot bewehrte Henne auf grünem Dreiberg (Stadtsiegel von
  1430, heutige Form 1938). [W-Schl] Dass die Henne für Henneberg steht, ist allgemein bekannt, hier aber nicht eigens belegt.
- **Ein Spruch aus Suhl** (keine Sage, aber Stoff): Am Rathaus erinnert die Inschrift „Im grünen Wald die rote Stadt, die ein zerschossen’
  Rathaus hatt“ an die Kämpfe beim Kapp-Putsch 1920. [W-Suhl]

---

## 2 Architektur – so baut man hier

### 2.1 Die alte Bauweise

- **Fränkisches Fachwerk.** „Fränkisches Fachwerk ist überwiegend in Franken, Thüringen, Hessen … vertreten“; typische Formen: der
  **Mann** (Strebenkreuz, auch „Wilder Mann“), **Andreaskreuz**, Rauten. [W-Fw] Suhl-Heinrichs hat ein Fachwerkensemble mit Rathaus von 1657
  (Erdgeschoss 1515), „Prunkstück des Henneberger Fachwerkstils“. [W-Suhl]
- **Verkleidet, nicht nackt.** „Insbesondere im 18. und 19. Jahrhundert wurden Fachwerkwände häufig mit Holz oder **Schiefer** verkleidet“;
  viel heute freigelegtes Fachwerk war ursprünglich verputzt oder verschiefert. [W-Fw] → Für das Modell: Wetterseiten und Giebel mit
  Schiefer, viele Häuser verputzt; Sichtfachwerk nicht überall. So zeigt es das Spiel in Schleusingen schon (Schiefer an Obergeschossen und
  Giebeln, Fachwerk in den Seitengassen, nach Fotos). [Spiel-Schleusingen]
- **Schiefer** kommt aus dem Thüringer Schiefergebirge (z. B. Lehesten, Abbau bis 1999). [Spiel-Wissen] Das Mittlere Schleusetal gehört
  bereits zum Schiefergebirge. [W-Sch]
- **Stein:** Der Untergrund ist Buntsandstein [W-HBN]; Bertholdsburg, Kirchen und die Klosterbauten von Veßra zeigen roten und hellen
  Sandstein (so im Spiel nach Fotos gebaut). [Spiel-Veßra] [Spiel-Schleusingen]
- **Hof und Dorf:** In der Denkmalliste der Schleusinger Ortsteile stehen sehr viele **Gehöfte**, dazu **Backhäuser**, ein „Gehöft /
  Rindermannshof“, ein Wirtschaftshof mit Stiftsscheune, ein **Laubengang**; in Ratscher Tränke, Gasthof mit Saal, Gemeindesaal,
  Feuerwehrgerätehaus. [W-KD] Gemeinschaftsbacköfen sind in Thüringer Dörfern teils noch in Gebrauch. [W-ThK] Welche Hofform (Haken-,
  Drei- oder Vierseithof) in Ratscher vorherrscht: nicht belegt → Luftbild und Fotos.
- **Vorbilder zum Anschauen:** das Freilichtmuseum Kloster Veßra mit Bauten aus dem ganzen Henneberger Land [HMKV] [W-KV].

### 2.2 Was die DDR baute

- **Neubauernhäuser:** Nach der Bodenreform mussten viele Neubauern jahrelang ohne eigene Hofgebäude auskommen; ein größeres Bauprogramm
  begann erst im Herbst 1947. [W-BR] Ein Neubauernhaus von 1948 steht am Ort im Museum Kloster Veßra. [HMKV]
- **LPG:** erste LPG der DDR am 8.6.1952 (Merxleben, Thüringen); Typen I–III; Vollkollektivierung im Frühjahr 1960 („Sozialistischer
  Frühling“); ab Anfang der 1970er Kooperative Abteilungen Pflanzenproduktion (KAP), die Feldwirtschaft mehrerer LPG zusammen; jedem Mitglied
  standen 0,5 ha für die „individuelle Hauswirtschaft“ zu. [W-LPG] In Veßra: nach Auflösung der Domäne 1945 eine LPG (Sitz ab 1953) mit
  Baumschule und Schafzuchtanlage. [W-KV] → Für das Modell (Rückblende): große Stallanlagen und Maschinenhöfe am Ortsrand, Silos; welche LPG
  in Ratscher wirtschaftete: offen.
- **Talsperren** Schönbrunn (1967–1979) und Ratscher (1975–1983) – Betonturm, Asphaltdichtung, Brücken. [W-TSch] [W-TR]
- **Suhl als sozialistische Bezirksstadt:** Der alte Stadtkern wurde großteils abgebrochen und unter Hermann Henselmann neu gestaltet –
  Kulturhaus (1956, heute Portalbau „Haus der Geschichte“), Stadthalle (nach dem Vorbild des Leningrader Eispalasts; heute CCS), Hochhäuser,
  Schnellstraße, **Centrum-Warenhaus** (1966–1969, metallplastische Strukturfassade, nach 1990 Kaufhof, 2000 geschlossen). [W-Suhl]
  **Plattenbau:** Aue, Friedberg, Suhl-Nord (Baustelle 1980 auf einem Bundesarchiv-Foto), Ilmenauer Straße, Döllberg; in Suhl saß das
  Wohnungsbaukombinat WBK Suhl (welches Viertel es baute, ist hier nicht belegt). [W-Suhl] In Schleusingen: ob und wo DDR-Wohnblöcke stehen, ist hier nicht belegt → Luftbild/OSM.
- **Machtorte:** Bezirksverwaltung der Staatssicherheit (1951–1989) in der früheren Fliegerschule von 1940 „auf dem Berg über der Stadt“;
  Offiziershochschule „Rosa Luxemburg“ der Grenztruppen auf dem Friedberg (ab 1984). [W-Suhl] [bpb-Suhl]
- **Dorfladen:** Fast jedes Dorf hatte einen Konsum (so die Quellen der Rückblende). [Spiel-1989]

### 2.3 Nach 1990

- Rückbau der Plattenbauten in Suhl (siehe 1.5); Neubau Stadtbibliothek Suhl 2004; Wohnprojekt „Lebensräume Auengrund“ (2015). [W-Suhl]
- Schleusingen: Gewerbegebiete, MEGA-Einkaufszentrum, Autobahnanschluss 2006 mit Brücken der A 73. [W-Schl]
- Sanierungen: viel freigelegtes Fachwerk (siehe 2.1). [W-Fw] Eigenheime der 1990er und 2000er am Ortsrand sind für die Gegend
  typisch, für Ratscher aber nicht einzeln belegt → Luftbild.

### 2.4 Bildquellen (nur als Vorlage, keine Bilder ins Repo)

- **Wikimedia Commons**, Dateien aus den gelesenen Artikeln: „Ratscher Bergsee.jpg“ (vom Wachberg), „Ratscher-Talsperre.jpg“ (Damm),
  „Ratscher, Schleusingen 3.jpg“ (im Ort; die Reihe 1–7 nutzt der Dorfkern schon), „Johann Ulrich Stähelin – Schleusinger Marktplatz mit
  Festumzug zum Schützenfest 1874.jpg“, „Kloster Vessra 03.jpg“ (Bauernhaus 1716), „Kloster Vessra 04.jpg“ (Wassermühle), „Kloster Vessra
  06.jpg“ (Ruine), „HütesMgn.JPG“ (Kloßdenkmal Meiningen). Kategorien: *Kloster Veßra*, *Kreis Suhl-Land*, *Schleuse (Werra)*,
  *Cultural heritage monuments in Schleusingen*, *LPGs of the German Democratic Republic*, *Inner German border*. [W-TR] [W-Rat] [W-Schl]
  [W-KV] [W-Kl] [W-KSL] [W-Sch] [W-KD] [W-LPG] [W-IG]
- **Bundesarchiv, Bild 183** (DDR-Pressefotos auf Commons): „183-13229-0003, Suhl, Stadtansicht“ (1952), „183-K1117-0300, Suhl,
  Fachwerkhaus“ (1971, heute Waffenmuseum), „183-W0926-0014, Baustelle Suhl-Nord“ (1980), „183-Z0829-001, Suhl, Steinweg, Fußgängerzone“
  (1981), „183-Z0202-010, Dreiherrenstein, Holzrücken“ (1981, Waldarbeiter des Forstwirtschaftsbetriebs Ilmenau). [W-Suhl] [W-BS]
- **Deutsche Fotothek** (über die Deutsche Digitale Bibliothek), z. B. „Schleusingen, Schloss Bertholdsburg, Teilansicht von Osten“, 1930,
  Glasnegativ – Rechte vorbehalten. [DDB]

---

## 3 Geschichte – Zeitleiste

**Henneberger und Kloster (1131–1583)**
- 1131 Graf Godebold II. von Henneberg und Liutgard stiften das Prämonstratenser-Doppelkloster Veßra; 1138 Weihe durch Otto von Bamberg;
  Hauskloster und bis 1566 Grablege der Henneberger. [W-KV]
- 1226–1232 Graf Poppo VII. baut die Bertholdsburg; 1232 erste Nennung „villa Slusungen“. 1274 Teilung der Grafschaft in drei Linien, die
  Bertholdsburg wird Residenz der Linie Henneberg-Schleusingen. [W-Schl]
- 22.7.1318 erste Erwähnung Ratschers. [W-Rat] 1353 erster großer Stadtbrand in Schleusingen (weitere 1679, 1765, 1773, 1876). 1412
  Stadtrecht, 1533 Marktrecht. 1430 Stadtsiegel (Grundlage des Wappens). [W-Schl]
- 1502 Barfüßerkloster in Schleusingen. Frühjahr 1525 (Bauernkrieg): Mönche, Urkunden und Schätze aus Veßra und Trostadt werden auf die
  Bertholdsburg gerettet. [W-Schl]
- Reformation: Veßra 1533 säkularisiert (die Kirche wird Dorfkirche), 1543/44–1573 zur landesherrlichen Domäne; in Schleusingen 1544. Ab
  1560 Schule im alten Kloster, **7.6.1577 Gymnasium** (Graf Georg Ernst). 1545 erste Nennung der Schleuse. [W-KV] [W-Schl] [W-Sch]
- **1583** stirbt Georg Ernst, die Linie erlischt – Ende der Henneberger Herrschaft. [W-Schl] [W-KV]

**Sächsisch (1583–1815)**
- Gemeinsame Verwaltung durch die sächsischen Häuser; 1660 kommen die Ämter Schleusingen, Suhl und Kühndorf an Sachsen-Zeitz, nach dem
  Erlöschen dieser Linie an Kursachsen. [W-Schl] [W-KS]
- 1621–1622 Kippermünzstätte in Schleusingen. 1634 bewahrt der Stadtkommandant die Stadt vor der Plünderung durch Isolanis Kroaten, die hier
  aber Winterquartier nehmen. [W-Schl]
- Glasmacher aus dem hessischen Gläsnerbund und dem Spessart siedeln sich an – Holz des Thüringer Waldes als Grundlage für Glashütten und
  Porzellan bis ins 19. Jh. [W-Schl]
- Ab 1646 landwirtschaftliche Nutzung in Veßra, ab 1677 kurfürstliches Gestüt (rund 100 Mutterstuten). 1709 Badehaus am Wilhelmsbrunnen.
  [W-KV] [W-Schl]

**Preußisch (1815–1945)**
- 1815 an Preußen; 1.10.1816 „Kreis Henneberg“, später **Kreis Schleusingen**, Regierungsbezirk Erfurt, Provinz Sachsen – eine Exklave.
  Ratscher, Veßra und Suhl gehören dazu. [W-KS] [W-Rat] [W-KV]
- 1815–1840 **königlich-preußisches Hauptgestüt Veßra** (Trakehner, Graditzer, orientalische Hengste; 1830 Reitschule); das Kirchenschiff
  wird Scheune; 1840 zugunsten von Graditz aufgegeben. [W-KV]
- 1817 Kunststraßen nach Suhl, Hildburghausen, Veßra, Ilmenau; 1846/47 Hungerjahre; 1848 Volksversammlung und Krawalle auf dem Markt; 1849
  Straße nach Eisfeld. [W-Schl]
- Industrie: in Suhl Waffen (J. P. Sauer & Sohn, C. G. Haenel, 1856 Simson & Co.), 1893 erste Beschussanstalt Deutschlands, 1896
  Fahrräder, 1906 Autos; Porzellan in Suhl (1861–um 1930) und Veßra (1893–1921). Bahn: Suhl 1882/1884, Schleusingen – Themar 1888,
  Rennsteigbahn nach Ilmenau 1904, Friedbergbahn nach Suhl 1911. [W-Suhl] [W-Sim] [W-KV] [W-Schl]
- 1881 neue Synagoge in Schleusingen (Ecke Berthold-/Walchstraße). 1.7.1929 Landratsamt von Schleusingen nach Suhl. [W-Schl] [W-KS]
- NS-Zeit: Simson wird 1935/36 enteignet („arisiert“) und Grundstock der Wilhelm-Gustloff-Stiftung; Novemberpogrom 1938 zerstört die
  Synagogen in Schleusingen und Suhl; 1942 Deportationen jüdischer Bürger aus beiden Städten. [W-Sim] [W-Suhl] [W-Schl]
- Krieg: Zwangsarbeit – in Schleusingen 1612 Menschen (Land- und Forstwirtschaft, Zieh- und Stanzwerk, Glashütte, Bahnmeisterei), in
  Veßra 124 (Krieghoff-Nebenwerk ab 1939, Domäne), in Suhl etwa 10 000 bei 20 000 Einwohnern. Gedenkanlage in Schleusingen für 44
  verstorbene Häftlinge des Arbeitserziehungslagers Römhild. 1939 brennt die Klosterkirche Veßra aus. 26.3.1945 Bomben auf die Siedlung
  Fröhlicher Mann in Suhl. [W-Schl] [W-KV] [W-Suhl]
- April 1945 US-Truppen (Suhl 3.4.), am 3.7.1945 übernimmt die Rote Armee. [W-Suhl] [W-Schl]

**SBZ und DDR (1945–1989)**
- Bodenreform; die Domäne Veßra wird aufgelöst. 30.1.1946 Kreis Schleusingen → „Landkreis Suhl“. 1947 Sprengung bzw. Demontage der
  Rüstungswerke in Suhl. [W-KV] [W-KS] [W-Suhl]
- 1.7.1950–1952: Schleusingen, Ratscher, Veßra u. a. im Landkreis Hildburghausen. **Juli 1952** Verwaltungsreform: **Bezirk Suhl** –
  der kleinste der 14 Bezirke (3856 km², 1989 rund 549 400 Einwohner, die Hälfte Wald) – und am 25.7.1952 der **Kreis Suhl** (mit
  Schleusingen und Ratscher). 15.8.1952 erscheint „Das Freie Wort“. [W-KS] [W-KSL] [W-BS] [W-FW]
- **Grenze:** ab 1952 rund 5 km breites **Sperrgebiet** (Passierschein, Kontrollpunkte), darin der 500 m breite Schutzstreifen und der 10 m
  breite Kontrollstreifen. [W-IG] **Juni 1952 „Aktion Ungeziefer“**, **Oktober 1961** die zweite Aussiedlung (im Bezirk Suhl „Aktion
  Blümchen“ genannt); zusammen 11 000–12 000 Menschen umgesiedelt, etwa 3000 flohen vorher. [W-ZA] Im Kreis Hildburghausen: aus
  **Billmuthausen** flohen 1952 34 Menschen gemeinsam nach Bayern; 1961 zwei Familien ausgesiedelt, 1965 Kirche, 1977 Mühle abgerissen, 1978
  das ganze Dorf geschleift; ebenso Erlebach (1975–1986) und Leitenhausen (1971/72); Streufdorf: 18 Familien. [W-Bill] [W-ZA]
- LPG ab 1952, Veßra 1953, Vollkollektivierung 1960. [W-LPG] [W-KV] 1950 Motorräder AWO 425 bei Simson; 1952 VEB, ab 1962 nur Mopeds;
  ab 1969 **VEB Fahrzeug- und Jagdwaffenwerk „Ernst Thälmann“**, Ende der 1980er rund 4000 Beschäftigte und knapp 200 000 Kleinkrafträder
  im Jahr (Schwalbe, S 50, S 51 …). [W-Sim] [W-Suhl]
- Suhl wird Bezirksstadt und neu gebaut (siehe 2.2); 12.5.1967 kreisfrei, der Kreis heißt nun **Suhl-Land**, Sitz **Zella-Mehlis**.
  [W-KSL] Kfz-Kennzeichen des Bezirks: „O“; Kreis Suhl-Land ab 1974 OV, OW, OX. [W-Kfz] [W-KSL]
- 21.6.1973 Grenzübergangsstellen Eisfeld – Rottenbach und Meiningen – Eußenhausen. [BArch-GÜSt] (Quelle der Rückblende)
- 1967–1979 Talsperre Schönbrunn, **1975–1983 Talsperre Ratscher**, **1987** Erholungsgebiet Bergsee. [W-TSch] [W-TR]
- 1975 „Agrarhistorisches Museum des Bezirkes Suhl“ in Veßra, ab 1978 versetzte Häuser. [W-KV] [HMKV]
- 1978 Europameisterschaft, 1986 Weltmeisterschaft im Sportschießen in Suhl; 1984 Offiziershochschule der Grenztruppen. [W-Suhl]

**1989/90**
- Ab September 1989 in Suhl immer mehr Menschen in Kreuz- und Marienkirche; **4.11.1989** erste Großdemonstration; Montagsdemonstrationen.
  [W-Suhl] [bpb-Suhl]
- **9./10.11.1989** Grenzöffnung; täglich fahren Tausende über die Übergänge nach Bayern und Hessen. [bpb-Suhl] (Einzelheiten der Rückblende:
  `docs/features/grenzland-1989.md`)
- **2.12.1989** treffen sich Menschen aus Hellingen (Kreis Hildburghausen) und dem bayerischen Allertshausen am Zaun – Gedenkstein: „Am
  2.12.1989 reichten wir uns hier wieder die Hand.“ 13.12. Vereinbarung der Landkreise, ab 14.12. reißen NVA-Pioniere den Zaun auf etwa
  20 m ab, **26.1.1990** Eröffnung des neuen Übergangs. [Frankenland]
- **4./5.12.1989** Abends ziehen rund 3000 Menschen zur Bezirksverwaltung der Staatssicherheit, rütteln am Tor; kurz vor Mitternacht werden
  16 Demonstranten und der Bezirksstaatsanwalt eingelassen und versiegeln Schränke; am 5.12. Hunderte auf dem Gelände, Busfahrer blockieren
  die Zufahrten, Volkspolizei sichert die Tore; ein **Bürgerkomitee** bewacht die Ausgänge. Zum Ende gehören auch zwei Selbsttötungen
  von MfS-Offizieren (Dezember 1989, Januar 1990) – nur als Tatsache, nicht als Spielstoff. [bpb-Suhl]
- 17.5.1990 Kreis Suhl-Land → Landkreis Suhl; Juni 1990 Landwirtschaftsanpassungsgesetz (LPG werden aufgelöst oder umgewandelt; bis 1992
  meist Agrargenossenschaften; binnen zehn Jahren verlieren über drei Viertel der Beschäftigten in der Landwirtschaft ihre Arbeit).
  [W-KSL] [W-LPG] Bis 2.10.1990 Bezirk Suhl, „anschließend“ Land Thüringen. [W-KSL] 1990 wird das Museum Veßra zum Hennebergischen
  Museum. [W-KV] Simson: Treuhand, Exportmarkt bricht weg. [W-Sim]

**Seit 1991**
- 1991 Kennzeichen SHL; Freies Wort privatisiert. 1992 Neustart der Moped-Fertigung durch frühere Simson-Beschäftigte. [W-KSL] [W-FW] [W-Sim]
- **1994** Ratscher, Gethles, Heckengereuth zu Schleusingen; **1.7.1994** Kreisreform: Schleusingen und Ratscher in den **Landkreis
  Hildburghausen**. [W-Schl] [W-KSL] 1995 CCS; 1996 Rappelsdorf zu Schleusingen. [W-Suhl] [W-Schl]
- 1997/1998 Bahnen stillgelegt; 2001–2013 Rückbau in Suhl; 2002 Simson-Insolvenz; 2006/2008 A 73; 2007 Zivilcourage der Feuerwehr;
  2011 Wiegand-Glas übernimmt das Glaswerk. [W-Schl] [W-Suhl] [W-Sim] [W-WG]
- 2013 Debatte über Großkreis und Bayern-Wechsel; 2014 Erstaufnahme Suhl; 2014 Neonazi-Treffpunkt in Veßra; 2017 Gebietsreform gescheitert;
  6.7.2018 Nahetal-Waldau und St. Kilian zu Schleusingen. [W-HBN] [W-Suhl] [W-KV] [W-Schl]
- Waldschäden durch Dürre und Borkenkäfer (Stand April 2025: rund 23 % der Waldfläche Thüringens neu zu bewalden); Dezember 2023
  Hochwasser; 2024 neuer Bürgermeister in Schleusingen. [topagrar] [Spiel-Wissen] [W-Schl]

---

## 4 Was das für das Spiel heißt

### 4.1 Echte Orte, Namen und Dinge zum Ergänzen

| Ort | Was | Wofür | Quelle |
|---|---|---|---|
| Ratscher | **Dorfgasthof mit Saal und Nebengebäude** (Denkmal, Ratschner Anger) | Kirmes, Tanz, Feiern; 1989 und heute (Betrieb heute → prüfen) | [W-KD] |
| Ratscher | **Gemeindesaal mit Ausstattung** (Denkmal) | Versammlungen, Ortsteilrat, Wahllokal (Annahme) | [W-KD] |
| Ratscher | **Feuerwehrgerätehaus** (Denkmal, am Anger) und **Tränke** in der Ortsmitte | Feuerwehr-Aufgaben; die Tränke beim Brunnen benennen | [W-KD] |
| Ratscher | Alte Schule: **Glockenturm**, 1957 Kindergarten, später Gemeindebüro | Gerhards Chronik, Wissen | [W-Rat] |
| Ratscher | „Ratschner Anger“ als Straßenname, PLZ 98553, Vorwahl 036841 | Briefe, Schilder, Handy | [W-Rat] [W-KD] |
| Talsperre | **Insel** aus der „Bierlaune“, **Wiedersbach** als Zufluss, Turm mit Überlauf in der Dammmitte, Winterabsenkung 392,9 → 385,5 m | Angeln, Boot, Geschichte vom Bau | [W-TR] |
| Bergsee | Badestrand, Camping, FKK-Bereich, Bootsverleih, **„Schleusinger Countryfestival am Bergsee Ratscher“**, Rockfestival | Sommerabende, Feste | [W-TR] [Camp] [Country] |
| Umgebung | **Merbelsroder Wachberg** (621 m) mit Blick auf See und Franken; Merbelsrod mit NIDEC GPM | Aussichtspunkt; Arbeitsplatz eines Dorfbewohners | [W-TR] [W-Merb] |
| Schleusingen | **Elisabethbrunnen** (so heißt der Marktbrunnen) und die **Abitaufe** beim Burg- und Stadtfest | Name im HUD; Fest | [W-Schl] |
| Schleusingen | **Schlossbrunnen** der Bertholdsburg mit der Wasserfei, Naturhistorisches Museum in der Burg | Sage, Ausflug | [Bechstein] [W-Schl] |
| Schleusingen | **Kreuzkirche** am Friedhof (1600–1602), **Teutsche Schule**, **Wilhelmsbrunnen**, Stadtmauerreste | Stadtbild, Rundgang | [W-Schl] |
| Schleusingen | Gedenktafel der Synagoge (Ecke Berthold-/Walchstraße, 1988), **Jüdischer Friedhof im Judengrund**, Gedenkanlage für die Häftlinge des AEL Römhild (Friedhof Ilmenauer Straße) | Erinnerungsorte, still und ohne Spielmechanik | [W-Schl] |
| Schleusingen | **Bahnhof** (Abzweig Friedbergbahn/Rennsteigbahn, stillgelegt), Dampfsonderfahrten | heute Ruhe, 1989 Zugbetrieb | [W-Schl] |
| Schleusingen | Behälterglaswerk (Wiegand-Glas), Reha-Zentrum Thüringer Wald, MEGA-Einkaufszentrum, Hennebergstadion (SC 07), Johanniter-Rettungswache | Arbeitswege, Leben | [W-Schl] |
| Kloster Veßra | **Henneberger Kapelle als Dorfkirche**, Bibrasche Kapelle, **Dorfbrauhaus aus Wolfmannshausen** (Brautage), Bauernhaus 1716, Wassermühle, **Neubauernhaus 1948** | Museumstag, Rückblende | [W-KV] [HMKV] |
| Kloster Veßra | Geschichte des **Hauptgestüts** (1815–1840) und der Domäne; Mündung der Schleuse in die Werra; Ortsteile Neuhof, Zollbrück | Wissen, Reitpfad-Idee | [W-KV] |
| Kloster Veßra | „Café am Klostergarten“ (OSM, schon in den Daten) statt „Goldener Löwe“ als Einkehr | Gartenplaner-Ausflug | [Spiel-Veßra] |
| Suhl | Waffenschmied-Denkmal (1903), Rathaus-Inschrift von 1920, Waffenmuseum im Malzhaus (1663), Marienkirche (Rokoko 1761), Kreuzkirche, Rokokohaus im Steinweg, Bismarckturm auf dem Domberg (1896), Fachwerk-Rathaus Heinrichs (1657), CCS mit Fahrzeugmuseum, Haus der Geschichte (Portal des Kulturhauses) | für den Suhl-Chat | [W-Suhl] |
| Suhl | Bezirksverwaltung der Staatssicherheit (frühere Fliegerschule von 1940, „auf dem Berg über der Stadt“; genaue Lage → prüfen) | Rückblende 4./5.12.1989, sensibel | [W-Suhl] [bpb-Suhl] |
| Suhl | Friedberg: Offiziershochschule der Grenztruppen (ab 1984), heute Gewerbepark, TU Ilmenau und Erstaufnahme | Rückblende, Gegenwart | [W-Suhl] |
| weiter weg | **Gedenkstätte Billmuthausen** (Friedhof, Trafoturm, Kapelle 2004, Mahnkreuz, Grenzturm am Finkenberg), Glocken im Museum Eisfeld | Kapitel 2 Grenzland, Erinnerung | [W-Bill] |
| weiter weg | Hellingen – Allertshausen, Gedenkstein „Am 2.12.1989 reichten wir uns hier wieder die Hand“ | Kapitel 2 | [Frankenland] |
| Küche | Hütes/Klüeß, **Weckbröckle**, Rostbratwurst, Rostbrätel, Rouladen mit Rotkohl, Schmandkuchen, Zwiebelkuchen | Freitagabend, Kirmes, Handy-Rezepte | [W-Kl] [W-ThK] |

### 4.2 Korrekturen – wo Welt oder Texte der Wirklichkeit widersprechen

- **K1 Kreis in der DDR.** `viz3/src/strategie/st_dorf_data.js:729`: „Ratscher war bis 1994 eine eigene Gemeinde im Kreis
  Hildburghausen“ → „… im Kreis Suhl-Land (bis 1967 Kreis Suhl), Bezirk Suhl; erst mit der Kreisreform am 1.7.1994 kam es zum Landkreis
  Hildburghausen (schon 1950–1952 kurz dort)“. Für die Grenzland-Rückblende gilt dasselbe: Rat des Kreises in **Zella-Mehlis**, nicht in
  Hildburghausen. [W-KSL] [W-KS]
- **K2 Staumauer → Staudamm.** `viz3/src/grenzland/gl_data.js:19` („Staumauer der Talsperre“) und `gl_kegeln.js:872` („an der Staumauer“)
  → „Staudamm“ bzw. „Damm“. Falls das 3D-Modell eine senkrechte Betonmauer zeigt: Schüttdamm mit Böschungen 1:2,5, dunkle
  Asphalt-Außendichtung zum Wasser, Turm in der Mitte. [W-TR]
- **K3 Einwohner Ratscher.** `viz3/src/wissen/wissen_data.js` (`o_ratscher`): „2013 lebten hier 123 Menschen“ ist richtig, neuer: 142
  (Stadt Schleusingen, abgerufen 12/2025). [W-Rat]
- **K4 Rückblende 1989 – was es noch nicht gab und was es noch gab.** Keine **A 73** (das Spiel kennt sie als „Autobahn A 73“ in
  `world/roads.js`); Straßen hießen **F 4** und **F 247**; **Züge** fuhren noch auf Friedberg- und Rennsteigbahn; **Kennzeichen** „O…“
  (Volkspolizei „VP“, Grenztruppen „GT“, GST gelbe Schilder); das **Freie Wort** war SED-Bezirkszeitung (als Requisit ohne erfundene
  Schlagzeilen – der Titel erscheint heute noch). [W-Schl] [W-KSL] [W-Kfz] [W-FW]
- **K5 Sperrgebiet.** Ratscher lag (nach eigener Abschätzung) außerhalb der 5-km-Zone: keine Grenzposten im Dorf, kein Passierschein für
  Bewohner. Schilder wie „Grenzgebiet. Betreten verboten.“ gehören an die Zone weiter südlich (Heldburger Land, Eisfeld). → prüfen mit
  [BArch-Atlas]. [W-IG]
- **K6 „Goldener Löwe“ in Kloster Veßra.** In `viz3/extra/vessra/dist/vessra/ort.json` steht das Lokal als `restaurant`-POI. Wegen des
  belegten Hintergrunds [W-KV]: kein Schild, kein Ziel, keine Empfehlung im Spiel; als Einkehr das Café am Klostergarten.
- **K7 Datum der Länder.** `wissen_data.js` sagt: „Am 14. Oktober 1990 wurde das Land Thüringen wiedergegründet.“ Nach [W-KSL] gehörte
  der Landkreis Suhl bis 2.10.1990 zum Bezirk und „anschließend“ zum Land Thüringen; der 14.10.1990 war der Tag der ersten Landtagswahl
  (unsicher, hier nicht eigens belegt) → Text präzisieren: „Mit der Einheit am 3. Oktober 1990 entstand das Land Thüringen wieder, am
  14. Oktober wurde der Landtag gewählt.“
- **K8 Konsum.** Der Konsum hinter der Schule ist erfunden (die Rückblende sagt es selbst). Belegt sind am Anger Gasthof und Gemeindesaal;
  wo der Laden war: offen → Gerhard könnte im Spiel sagen „der Konsum war damals …“ erst, wenn es jemand aus dem Dorf weiß. [Spiel-1989] [W-KD]
- **K9 Kleinigkeiten.** Veßra „1543 zum Gut“ (`wissen_data.js`): genauer 1533 säkularisiert, 1543/44–1573 zur Domäne umgewandelt. [W-KV]
  Ratschers Eingemeindung: Wikipedia nennt 22.2. und 8.3.1994 – das Spiel sagt zu Recht nur „1994“. [W-Schl] [W-Rat]

### 4.3 Story-Ideen

**Heute (freies Spiel, Dorf, Zukünfte)**
1. **„Weihnachten, als das Wasser kam“** – das Hochwasser Dezember 2023: die Talsperre hält rund 900 000 m³ zurück, die Schleuse steigt
   trotzdem; Feuerwehr, Sandsäcke, Nachbarn. Passt zum Stresstest „Starkregennacht“ der Zeitreise. *Hintergrund:* [Spiel-Wissen] [W-TR]
2. **„Abi bestanden. Schickt Geld!“** – beim Burg- und Stadtfest einen Abiturienten im geschmückten Handwagen zum Elisabethbrunnen
   ziehen; danach ein Telegramm-Rätsel. *Hintergrund:* [W-Schl]
3. **„Die Wasserfei im Schlossbrunnen“** – Sagen-Aufgabe in der Bertholdsburg: weiße Hirschkuh, Grotte, die Buchstaben SLVS finden.
   *Hintergrund:* [Bechstein]
4. **„Hütes oder Klüeß?“** – Sonntagsessen kochen (⅔ roh, ⅓ gekocht, Weckbröckle) und im Dorf herumfragen, wie man den Kloß nennt –
   die Sprachgrenze liegt vor der Haustür. *Hintergrund:* [W-Kl] [W-Henn]
5. **„Die 205 nach Coburg“** – ein Morgen eines Pendlers: fast jeder Zweite arbeitet außerhalb des Landkreises, oft in Bayern.
   *Hintergrund:* [IAB] [W-Schl]
6. **„Countryfest am Bergsee“** – Sommerwochenende mit Camping, Bühne, Bootsverleih. *Hintergrund:* [W-TR] [Country] [Camp]
7. **„42 Namen“** – eine stille Geschichte über die Feuerwehr: Wie Schleusingen 2007 einen Neonazi nicht in die Wehr ließ. Ohne Namen,
   aus Sicht der Ratscher Wehr am Stammtisch erzählt. *Hintergrund:* [W-Schl]
8. **„Käferholz“** – Wolfgang und ThüringenForst: wer welchen Wald besitzt (Staat, Kommune, viele Kleinbesitzer), warum fast ein Viertel
   neu gepflanzt werden muss. *Hintergrund:* [TF-2015] [topagrar]
9. **„Brautag in Veßra“** – im Museum wird im Dorfbrauhaus gebraut; dazu die Geschichte vom preußischen Gestüt im Kirchenschiff.
   *Hintergrund:* [W-KV] [HMKV]

**Geschichte (Grenzland, Rückblenden, Chronik)**
10. **„Der neue See“ (Sommer 1988/89)** – der junge Gerhard am frisch eröffneten Bergsee: Zelte, FKK-Wiese, der Damm, die Insel aus der
    Bierlaune der Bauarbeiter. *Hintergrund:* [W-TR] [Camp] (FKK-Bereiche sind heute belegt, für 1988/89 eine Annahme)
11. **„Passierschein“** – 1989 zu Verwandten in ein Dorf der Sperrzone fahren: Antrag, Kontrollpunkt an der 5-km-Linie, Ausweis zeigen.
    *Hintergrund:* [W-IG]
12. **„Hände am Zaun“ (2.12.1989)** – Kapitel 2: in Hellingen am Zaun stehen, am 14.12. reißen NVA-Pioniere ihn ein, am 26.1.1990 rollen
    die ersten Autos. *Hintergrund:* [Frankenland]
13. **„Die Nacht am Tor“ (4./5.12.1989)** – Gerhard fährt mit nach Suhl, steht unter den 3000 vor der Bezirksverwaltung, hält im
    Bürgerkomitee Wache; drinnen keine Akten, „nur Südfrüchte in der Kantine“. Gewaltfrei, ohne Tote im Bild. *Hintergrund:* [bpb-Suhl] [W-Suhl]
14. **„Kirmes im Saal“** – Kirmes-Tanz 1989 im Gemeindesaal oder im Gasthof (das Plakat an der Litfaßsäule gibt es schon); Kirmesbaum,
    Burschen, Kuchen vom Blech. *Hintergrund:* [W-KD] [W-Kw] [W-ThK] (Bräuche in Ratscher selbst → vor Ort fragen)
15. **„Ein Moped aus Suhl“** – die Clique von heute richtet ein altes Moped her; Rückblende in die Halle von 1989 (4000 Beschäftigte,
    200 000 Kleinkrafträder im Jahr) und auf 1991/92, als ehemalige Beschäftigte die Fertigung neu starteten. Ohne Marke im Bild.
    *Hintergrund:* [W-Sim]
16. **„Das verschwundene Dorf“** – Besuch der Gedenkstätte Billmuthausen (heute) mit Gerhards Erinnerung; nur als Erinnerung, keine Mission.
    *Hintergrund:* [W-Bill]
17. **„Talsperrenbau“ (um 1980)** – Arbeiter am Damm, Asphalt, der Turm; ein Bild für die Zeitreise in die Vergangenheit. *Hintergrund:* [W-TR]
18. **Chronik- und Radiosätze** (nicht spielbar): Juni 1952 „Aktion Ungeziefer“, Oktober 1961 „Aktion Blümchen“, 1960 „Sozialistischer
    Frühling“, 1967 Kreis Suhl-Land. *Hintergrund:* [W-ZA] [W-LPG] [W-KSL]

---

## 5 Offen – zu klären

- Ratscher: Kirchgemeinde, Kirmestermin und -bräuche, ob Gasthof und Saal betrieben werden, wer die Feuerwehr stellt (Ortswehr oder nur
  Verein), welche LPG 1989 hier wirtschaftete, wo der Laden war, wo der ABV saß. → Falko, Nachbarn, Ortsteilrat, Stadt.
- Website der Stadt (Ortsteilseite Ratscher, `schleusingen.de/verzeichnis/visitenkarte.php?mandat=222405`): **Abruf blockiert** (Freigabe
  kam nicht rechtzeitig) – dort stehen vermutlich Einwohner, Amt und Vereine.
- Sperrgebietsgrenze 1989 im Kreis Hildburghausen: mit dem Atlas [BArch-Atlas] nachprüfen.
- Mundart in Ratscher selbst (Hütes oder Klüeß, -le oder -la).
- Forstamt und Waldbesitz an der Klinge.
- Kloster Veßra 1952–1994 im Kreis Hildburghausen: aus der Gemeindeliste von Suhl-Land geschlossen, nicht direkt belegt.

---

## 6 Quellen

Wikipedia-Artikel: de.wikipedia.org, Autorinnen und Autoren der Wikipedia, gelesen am 13.11.2026 (Rohtext über `action=raw`).

| Kürzel | Titel |
|---|---|
| [W-Rat] | „Ratscher (Schleusingen)“ – https://de.wikipedia.org/wiki/Ratscher_(Schleusingen) |
| [W-TR] | „Talsperre Ratscher“ – https://de.wikipedia.org/wiki/Talsperre_Ratscher |
| [W-Schl] | „Schleusingen“ – https://de.wikipedia.org/wiki/Schleusingen |
| [W-KV] | „Kloster Veßra“ – https://de.wikipedia.org/wiki/Kloster_Veßra |
| [W-KSL] | „Kreis Suhl-Land“ – https://de.wikipedia.org/wiki/Kreis_Suhl-Land |
| [W-KS] | „Kreis Schleusingen“ – https://de.wikipedia.org/wiki/Kreis_Schleusingen |
| [W-BS] | „Bezirk Suhl“ – https://de.wikipedia.org/wiki/Bezirk_Suhl |
| [W-Suhl] | „Suhl“ – https://de.wikipedia.org/wiki/Suhl |
| [W-Sim] | „Simson (Unternehmen)“ – https://de.wikipedia.org/wiki/Simson_(Unternehmen) |
| [W-HBN] | „Landkreis Hildburghausen“ – https://de.wikipedia.org/wiki/Landkreis_Hildburghausen |
| [W-Sch] | „Schleuse (Fluss)“ – https://de.wikipedia.org/wiki/Schleuse_(Fluss) |
| [W-TSch] | „Talsperre Schönbrunn“ – https://de.wikipedia.org/wiki/Talsperre_Schönbrunn |
| [W-Henn] | „Hennebergisch“ – https://de.wikipedia.org/wiki/Hennebergisch |
| [W-Ofr] | „Ostfränkische Dialekte“ – https://de.wikipedia.org/wiki/Ostfränkische_Dialekte |
| [W-Kl] | „Thüringer Klöße“ – https://de.wikipedia.org/wiki/Thüringer_Klöße (darin das Suhler Mundartlied nach Herbert Bauer, *Suhl – Stadt und Land im Thüringer Wald*, Rat des Kreises Suhl, Erfurt 1955, S. 156) |
| [W-ThK] | „Thüringer Küche“ – https://de.wikipedia.org/wiki/Thüringer_Küche |
| [W-Kw] | „Kirchweih“ – https://de.wikipedia.org/wiki/Kirchweih |
| [W-FW] | „Freies Wort“ – https://de.wikipedia.org/wiki/Freies_Wort |
| [W-KD] | „Liste der Kulturdenkmale in Schleusingen“ – https://de.wikipedia.org/wiki/Liste_der_Kulturdenkmale_in_Schleusingen (nach dem Denkmalverzeichnis des Landes) |
| [W-Merb] | „Merbelsrod“ – https://de.wikipedia.org/wiki/Merbelsrod |
| [W-Bill] | „Billmuthausen“ – https://de.wikipedia.org/wiki/Billmuthausen |
| [W-ZA] | „Zwangsaussiedlungen an der innerdeutschen Grenze“ – https://de.wikipedia.org/wiki/Zwangsaussiedlungen_an_der_innerdeutschen_Grenze |
| [W-IG] | „Innerdeutsche Grenze“ – https://de.wikipedia.org/wiki/Innerdeutsche_Grenze |
| [W-LPG] | „Landwirtschaftliche Produktionsgenossenschaft“ – https://de.wikipedia.org/wiki/Landwirtschaftliche_Produktionsgenossenschaft |
| [W-BR] | „Bodenreform in Deutschland“ – https://de.wikipedia.org/wiki/Bodenreform_in_Deutschland |
| [W-Fw] | „Fachwerkhaus“ – https://de.wikipedia.org/wiki/Fachwerkhaus |
| [W-Kfz] | „Liste der deutschen Kfz-Kennzeichen (historisch)“, Abschnitt DDR 1953–1990 – https://de.wikipedia.org/wiki/Liste_der_deutschen_Kfz-Kennzeichen_(historisch) |
| [W-WG] | „Wiegand-Glas“ – https://de.wikipedia.org/wiki/Wiegand-Glas |
| [W-Itz] | „Itzgründisch“ – https://de.wikipedia.org/wiki/Itzgründisch (Vergleich, Sonneberger Beispiele) |

Weitere Quellen:

| Kürzel | Titel, Urheber, Datum, Link |
|---|---|
| [bpb-Suhl] | Christian Dellit (Fotos Reinhard Wenzel): „Angst auf beiden Seiten – das Ende des MfS in Suhl“, Bundeszentrale für politische Bildung, 04.01.2018 – https://www.bpb.de/themen/deutsche-teilung/stasi/218545/angst-auf-beiden-seiten-das-ende-des-mfs-in-suhl/ |
| [Frankenland] | Rainer Frhr. von Andrian-Werburg, Walter Keller: „Grenzöffnung und Straßenbau zwischen den Landkreisen Haßberge und Hildburghausen zur Jahreswende 1989/90“, *Frankenland* I (2013), S. 37–47 – https://journals.bibliothek.uni-wuerzburg.de/frl-nf/article/download/8567/8609/8869 |
| [IAB] | Michaela Fuchs, Birgit Fritzsche, Uwe Sujata: „Entwicklung und Struktur der Pendlerverflechtungen Thüringens“, IAB-Regional Sachsen-Anhalt-Thüringen 2/2025 (Daten 30.6.2024) – https://doku.iab.de/regional/SAT/2025/regional_sat_0225.pdf |
| [TF-2015] | ThüringenForst AöR: „Wem gehört der Wald in Thüringen?“, Medieninformation 53/2015, 20.10.2015 – https://forstwirtschaft-in-deutschland.de/fileadmin/news_import/MI_53-15_Waldbesitz_201015.pdf |
| [topagrar] | Alfons Deter: „23 % der Wälder in Thüringen kaputt – Warum Anpflanzungen nicht reichen werden“, top agrar, 29.04.2025 (teils Bezahlschranke) – https://www.topagrar.com/jagd-und-wald/news/23-der-walder-in-thuringen-kaputt-warum-anpflanzungen-nicht-reichen-werden-20013899.html |
| [HMKV] | Hennebergisches Museum Kloster Veßra: „Sammlungskonzeption HMKV 2026 – 1. Evaluierung“, 18.05.2026 – https://museumklostervessra.de/wp-content/uploads/2026/05/Sammlungskonzeption-HMKV_2026_1.-Evaluierung_18052026.pdf |
| [Bechstein] | Ludwig Bechstein: *Deutsches Sagenbuch* (1853), Nr. 725 „Schleusingens Ursprung und Name“, Projekt Gutenberg – https://projekt-gutenberg.org/authors/ludwig-bechstein/books/deutsches-sagenbuch/chapter/727 |
| [Camp] | camperado.de: „Erholungsgebiet Bergsee Ratscher“ (Campingportal, Stand der Angaben unbekannt) – https://www.camperado.de/campingdetails/Erholungsgebiet_Bergsee_Ratscher__15133 |
| [Country] | festivalsindeutschland.de: „Schleusinger Countryfestival am Bergsee Ratscher“ (nur Titel gesehen) – https://www.festivalsindeutschland.de/festival/schleusinger-countryfestival-bergsee-ratscher |
| [EKM] | Evangelisches Pfarramt Schleusingen: Gemeindebrief September–November 2025 – https://www.ekmd.de/asset/9aXHwoagSeeM11ndgD8HaA/gemeindebrief-september-november-2025-web.pdf |
| [DDB] | Deutsche Fotothek über die Deutsche Digitale Bibliothek: „Schleusingen, Schloss Bertholdsburg … Teilansicht von Osten“, 1930 – https://www.deutsche-digitale-bibliothek.de/item/IYRO47RQAEN7ZHNICICQYHPLGJFQ53BB |
| [BArch-GÜSt] | Bundesarchiv: „Grenzübergangsstellen für den Bezirk Suhl“ (Quelle von `docs/features/grenzland-1989.md`, hier nicht neu gelesen) – https://www.bundesarchiv.de/themen-entdecken/online-entdecken/themenbeitraege/grenzuebergangsstellen-fuer-den-bezirk-suhl/ |
| [BArch-Atlas] | Horst Henkel, Wolfgang Scholz (Bearb.): *Sperrgebiete in der DDR. Ein Atlas von Standorten des MfS, des MdI, des MfNV und der GSSD*, Bundesarchiv – Stasi-Unterlagen-Archiv, Berlin 2022 (Karten der 5-km-Sperrgebiete nach Bezirken; zitiert nach [W-IG], nicht selbst eingesehen) – https://www.bundesarchiv.de/publikationen/publikation/sperrgebiete-in-der-ddr/ |
| [Spiel-Wissen] | `viz3/src/wissen/wissen_data.js` (Talsperre, Hochwasser 2023 nach Thüringer Landtag, Drs. 7/9624 vom 28.2.2024; Schiefer nach ERIH) |
| [Spiel-Dorfkern], [Spiel-Bus], [Spiel-Schleusingen], [Spiel-Veßra], [Spiel-1989] | `docs/features/dorfkern.md`, `bus.md`, `schleusingen.md`, `vessra.md`, `grenzland-1989.md` |
