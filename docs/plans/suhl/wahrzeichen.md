# Suhl – Wahrzeichen und prägende Orte (Stufe 1, Bestandsaufnahme)

Stand: 13.11.2026, Hilfs-Agent `suhl-wissen` (Auftrag: `docs/plans/auftraege/suhl-wissen.md`). Reine Recherche, kein Code.

**Wozu:** Diese Liste sagt, welche Bauten und Orte Suhl unverwechselbar machen – zuerst im Pilotquartier Zentrum. Sie ist die
Arbeitsliste für Stufe 3 (Zentrum in höchster Qualität): Was muss einzeln gebaut werden, was darf der Fassaden-Generator erledigen.

**Wie lesen:**
- Lage = Breite, Länge (WGS84) aus OpenStreetMap. Quelle je Zeile: OSM-Objekt (`w…` = Weg, `n…` = Punkt;
  Adresse `https://www.openstreetmap.org/way/<Nummer>` bzw. `/node/<Nummer>`). Abgerufen am 12.11.2026 über die OSM-API
  (Kartenabruf Zentrum) und über Nominatim. Lizenz ODbL, „© OpenStreetMap-Mitwirkende“.
- „Denkmal: OSM“ heißt: Das Objekt trägt in OSM die Marke `heritage`. Das ist **kein** amtlicher Nachweis. Die amtliche Liste
  (Thüringisches Landesamt für Denkmalpflege und Archäologie) habe ich nicht prüfen können – siehe „Offen“.
- „Betretbar“ = Kandidat für einen öffentlichen Innenraum im Modell.
- Quellenkürzel in eckigen Klammern stehen am Ende der Datei. Alles ist in eigenen Worten wiedergegeben.
- **„unsicher“** steht dort, wo Quellen sich widersprechen oder nur eine schwache Quelle vorliegt.

---

## 1. Zentrum (Pilotquartier)

Gebiet vorläufig: Kreis von 900 m um 50.6087° N, 10.6926° E (Vorgabe aus `suhl-gemeinsam.md`). In diesem Kreis liegen laut OSM
2 318 Gebäude (Abruf 12.11.2026, eigene Auszählung aus dem Kartenabruf).

### 1.1 Das Bild in drei Sätzen

Das Zentrum besteht aus zwei Schichten, die hart aneinanderstoßen. Die alte Stadt ist ein schmaler Streifen vom Markt über den
Steinweg bis zur Kreuzkirche: Rathaus, Amtshaus, Bürgerhäuser, zwei Barockkirchen, das Fachwerk-Malzhaus [Jahn 2017].
Rundherum steht das Zentrum der Bezirksstadt aus den Jahren 1953 bis 1982: breite Durchgangsstraße, Punkthochhäuser, Stadthalle,
Hotelturm, Kulturhaus-Portal, Warenhaus-Standort – gruppiert um den Herrenteich [Bauwelt 2006] [Jahn 2017].

### 1.2 Die 15 wichtigsten Objekte im Zentrum – wie sie aussehen

Nur was in den Quellen steht. Farben und Details ohne Quelle müssen aus den Straßenfotos kommen (Agent `suhl-fotos`).

1. **Marktplatz mit Waffenschmied-Denkmal** (50.61072, 10.69329; `n292840267`, Brunnenbecken `w247095898`).
   Das Denkmal von 1903 gilt als Wahrzeichen der Stadt [WP-Suhl]. OSM führt es als Sandsteinfigur (Bildhauer Georg Ringel,
   Entwurf Rudolf Ludloff) auf einem Brunnen. Der Platz ist verkehrsberuhigt bzw. Fußgängerbereich (`w32083902`, `w1136763414`).
   Markt und Steinweg wurden 1998 bis 2000 erneuert [Uske 2017].
2. **Rathaus (Altes Rathaus), Marktplatz 1** (50.61042, 10.69286; `w42484464`). Vorgängerbau von 1590, mehrfach ausgebrannt
   (zuletzt 1753), 1812–17 um zwei Geschosse erhöht, 1902/03 von Rudolf Ludloff umgebaut, Fassaden 1913 neubarock überarbeitet
   [WP-Rathaus]. Aussehen laut [WP-Rathaus]: dunkel verputzte Fassaden, im Erdgeschoss Eckquader aus Putz, die zwei Obergeschosse
   durch Pilaster über beide Geschosse gegliedert, Fenster mit „Ohren“, Walmdach mit Dachreiter als kleinem Uhrturm, in der Mitte
   ein kleiner Schweif- bzw. Dreiecksgiebel. Am Haus steht der Spruch vom „zerschossenen Rathaus“ (Kapp-Putsch 1920) [WP-Suhl].
   **unsicher:** [WP-Suhl] und [Uske 2017] nennen 1910 für den neubarocken Umbau, [WP-Rathaus] 1902/03 und 1913.
3. **Hauptkirche St. Marien, Kirchgasse** (50.60998, 10.69362; `w38867533`). Erster Bau 1487–1491; nach dem Stadtbrand von
   1753 ab 1757 neu gebaut, 1761 geweiht, Turm 1769 fertig [WP-Marien]. Aussehen laut [WP-Marien]: Saalbau mit steilem
   Satteldach, gelb verputzt, flachbogige Fenster in zwei Reihen, quadratischer Turm mit welscher Haube und Laterne, beiderseits
   runde Treppentürme; Westseite mit Portal, breiten Lisenen und einem Strahlenkranz mit Pelikan im Giebel. Innen Rokoko mit
   dreigeschossiger Empore und Kanzelaltar mit Orgel darüber. Vom Steinweg führen Treppen hinauf (Foto-Titel in
   `ref/suhl-innen-fotos:CREDITS.md`). **unsicher:** Hausnummer – OSM sagt Kirchgasse 9, [Wikivoyage] Kirchgasse 6.
4. **Steinweg (Fußgängerzone) mit den erhaltenen Bürgerhäusern** (Achse 50.60920, 10.69177; `w40437966`).
   Die Bürger- und Geschäftshäuser des Steinwegs haben den Umbau der DDR-Zeit überstanden [Jahn 2017]; von den Rokokohäusern
   blieb nach [WP-Suhl] nur eines. In OSM einzeln erfasst: **Steinweg 24 „Pfarrhaus“** von 1753, Fachwerk, zwei Geschosse,
   Mansard-/Gambrel-Dach, hellgrau (`w83820777`, Denkmal: OSM); **Spangenberghaus** von 1745, zwei Geschosse, Gambrel-Dach, mit
   Gedenktafel (`w83820784`, `n11459574621`); **Steinweg 10 „Mohren-Apotheke“**, zwei Geschosse, weiß, Satteldach (`w83910663`,
   Denkmal: OSM); **Steinweg 14**, drei Geschosse, Satteldach (`w83910652`, Denkmal: OSM); **Steinweg 26** (Adresse des
   „Rokokohauses“ nicht belegt – **unsicher**, `n1385078306` ist nur die Hausnummer). Am Steinweg außerdem der
   Dianabrunnen (Bronze, Waldo Dörsch; `w366851054`) und der Vogelbrunnen vor der Kreuzkirche (`w366852280`).
5. **Kreuzkirche, Steinweg** (50.60833, 10.69028; `w38807115`). 1731–1739 gebaut, am 20.9.1739 geweiht, damals am Stadtrand
   zwischen zwei Toren; deshalb steht der Turm mit dem Hauptportal an der Ostseite zur Stadt hin [WP-Kreuz]. Aussehen laut
   [WP-Kreuz]: barocker Saalbau, dreigeschossiger Turm mit geschweifter Haube und Laterne, Wetterfahne als Adler, über dem Portal
   ein dreiteiliges Wappen; Langhaus mit sechs Achsen, Rundbogenfenster in zwei Reihen auf hohem Sockel, kräftige Pilaster.
   OSM nennt die Farbe gelb. Innen dreigeschossige Empore, Kanzelaltar von 1736, Orgel von Eilert Köhler (1738–40).
   Daneben die ältere **Kreuzkapelle** (Gottesackerkirche, 1555, Chor 1618) [WP-Suhl] (50.60819, 10.69055; `w1433085660`).
6. **Waffenmuseum im Malzhaus, Friedrich-König-Straße 19** (50.61023, 10.68947; `n10732305087`, Gebäude vermutlich
   `w69995462`). Dreiflügelige Anlage direkt an der Lauter: durchgehende Gewölbekeller, massives Sockelgeschoss, Obergeschoss
   in Fachwerk, steiles Dach; die heutige Fensterfront stammt vom Umbau zu Wohnungen 1917; Museum seit 1971; 2006–2008
   entkernt und restauriert [WP-Waffenmuseum]. Der Bau gehört zum wenigen, was den Stadtbrand von 1753 überstand [WP-Suhl].
   **unsicher:** Baujahr 1663 [WP-Suhl] oder 1668 [WP-Waffenmuseum].
7. **Congress Centrum Suhl (CCS), Friedrich-König-Straße 7** (50.61024, 10.68781; `w42871446`). Gebaut 1969–1972 als
   „Stadthalle der Freundschaft“ (Übergabe 7.11.1972), Planung Heinz Luther, Seilnetzdach von Rolf Witte und Peter Bochus,
   nach dem Vorbild einer Sporthalle in Leningrad [Jahn 2017] [Carthalia-Stadthalle]. Schwimmhalle und Vorplatz kamen
   1979/80 dazu [Jahn 2017]. In den 1990er Jahren umgebaut: runde Halle geblieben, dazu Parkhaus, weitere Säle, Läden und ein
   großes gläsernes Atrium; Eröffnung als CCS am 2.12.1995; Großer Saal rund 2 350 Plätze [WP-CCS] [Uske 2017].
   Die Wandbilder der DDR-Zeit (u. a. Willi Neubert, Willi Sitte) sind beim Umbau verschwunden [WP-CCS] [Jahn 2017].
   Im Atrium: Tourist-Information, Galerie, Fahrzeugmuseum (seit 2007, 1 100 m²) [WP-CCS]. OSM nennt als Farbe ein helles Gelb.
8. **Hotelturm am CCS, Friedrich-König-Straße 1** (50.60967, 10.68627; `w42871444`, Hotel `n10801184216`).
   1977 als Wohnhochhaus mit 26 Etagen und 88 m gebaut – damals das höchste Haus des Bezirks. 1993 entkernt, Bau ruhte drei
   Jahre; dann wurden das Dachgeschoss, das oberste Doppelgeschoss und neun weitere Etagen abgetragen. Heute 16 Etagen mit neuer
   Fassade, obenauf ein ovales verglastes Restaurant, Aussichtsplattform und Antenne; eine Glasbrücke führt zum CCS
   [WP-CCS]. Eröffnet im Juni 1998 als Kongresshotel [Uske 2017]; Name 2022 und in OSM heute „City Hotel am CCS“.
   OSM gibt 60 m Höhe an (nicht geprüft).
9. **Punkthochhäuser an der Friedrich-König-Straße** (fünf in einer Reihe nördlich der Straße: 50.61117, 10.68866 `w45393690`;
   50.61132, 10.68941 `w45393691`; 50.61133, 10.69032 `w45393692`; 50.61124, 10.69146 `w45393693`; 50.61134, 10.69350
   `w45393694` = Friedrich-König-Straße 20; dazu 50.60957, 10.69088 `w45393695` und 50.61375, 10.69710 `w66319441`).
   OSM: Wohnhäuser, 43–45 m hoch, zwei davon mit 14 Geschossen und Flachdach erfasst. [WP-CCS] spricht von sechs
   Hochhäusern mit 14 Etagen im neuen Zentrum, [Jahn 2017] von vier Hochhäusern an der vierspurigen Straße Richtung Domberg.
   **unsicher:** genaue Zahl, Baujahre und Bautyp – bitte mit Fotos und LoD2 abgleichen.
10. **Einkaufscentrum „Am Steinweg“ – Standort des Centrum-Warenhauses** (50.61015, 10.69171; `w42484467`, Parkhaus
    `w32083739`). Das Warenhaus (1966–1969, Entwurf Heinz Luther mit Kollektiv; viergeschossiger Würfel mit einer
    vorgehängten Metallfassade des Berliner Metallgestalters Fritz Kühn, Dachterrasse) war der Mittelpunkt des DDR-Zentrums
    [Bauwelt 2006] [WP-Suhl]. Ende 2000 geschlossen; ab Oktober 2006 bis auf die entkernten unteren Geschosse abgetragen;
    geplant waren rund 10 000 m² Verkaufsfläche, 25 Läden, ein Parkhaus mit sieben Ebenen und eine Fassade aus Glas und
    Naturstein [Bauwelt 2006]. Eröffnung als Einkaufszentrum am 13.3.2008 [Uske 2017]. Die Kühn-Fassade gibt es nicht mehr
    [Jahn 2017]. OSM: zwei Verkaufsgeschosse, Flachdach, Parkhaus 26 m.
11. **Lauterbogen-Center, Friedrich-König-Straße 21** (50.61079, 10.69077; `w42484465`). Einkaufszentrum der Nachwendezeit,
    eröffnet am 2.11.1996 [Uske 2017]; OSM: zwei Geschosse. Aussehen: noch aus Fotos zu klären.
12. **Haus der Geschichte (Portal des Kulturhauses) und Haus der Wirtschaft, Platz der Deutschen Einheit** (50.60883, 10.68880
    `w110458614`; 50.60846, 10.68891 `w412429677`). Das Kulturhaus „7. Oktober“ (Entwurf Hermann Räder; Theatersaal mit 690,
    Kino mit 407 Plätzen) war der erste Bau am späteren Ernst-Thälmann-Platz; um 1990 hieß es „Haus Philharmonie“
    [Jahn 2017] [Carthalia-Kulturhaus]. 2010 wurde es abgerissen – bis auf die Säulenvorhalle mit Dreiecksgiebel und Relief
    und den Eingangsflügel [Carthalia-Kulturhaus] [Jahn 2017]. Dahinter steht der Neubau „Haus der Wirtschaft“ der IHK
    (in OSM: Baubeginn/Eröffnung 03/2016). Der Portalbau heißt heute „Haus der Geschichte“ [WP-Suhl]; OSM: 25 m hoch.
    **unsicher:** Baujahre (1954–58 [Jahn 2017], 1955–57 [Carthalia-Kulturhaus], „1956“ [WP-Suhl]); und wo das Stadtarchiv
    heute sitzt ([WP-Suhl]: im Portalbau; OSM: Zellaer Straße 159, `n12112614600`).
13. **Hotel am Platz der Deutschen Einheit – das frühere Interhotel „Thüringen Tourist“** (50.60906, 10.68990; `w42871447`).
    Bettenhaus 1965, Wirtschaftsflügel 1966, Entwurf Heinz Luther [Jahn 2017]. 2017 „Michel Hotel“ [Jahn 2017], in OSM heute
    „Achat Hotel Suhl“ (Höhe dort 16 m – **unsicher**, wirkt für ein mehrgeschossiges Bettenhaus zu niedrig).
14. **Bahnhof Suhl, Bahnhofstraße 28** (50.60515, 10.68310; `w116951221`; Station `n3059296510`). Bahnanschluss 1882 nach
    Süden, 1884 nach Norden [WP-Suhl] [Uske 2017]. OSM: Empfangsgebäude mit drei Geschossen, Satteldach, dunkle Deckung,
    Baujahr dort 1887. Stadtbus-Haltestelle gegenüber dem Bahnhof (Umbau 2017–2019) [WP-SNG].
15. **Domberg über dem Zentrum: Ottilienkapelle, Ottilienstein, Bismarckturm** (Kapelle 50.61324, 10.69210 `w198660171`;
    Aussicht Ottilienstein 50.61321, 10.69216 `w1488971691`; Turm 50.61708, 10.68590 `w139966525`; Gipfel 675 m).
    Der bewaldete Hausberg reicht bis an das Zentrum; aus dem Wald ragen die Felsen des Ottiliensteins [WP-Domberg].
    Kapelle: Neubau von 1843, 1945 ausgebrannt, 1953 wieder aufgebaut; OSM: ein Geschoss, weiß, dunkles Satteldach. Daneben die
    Ruine des Gasthauses mit Schäden vom April 1945 [Uske 2017] (`w259649468`). Bismarckturm: 21 m, 1895/96 aus Porphyr und
    Kalkstein gebaut, ganzjährig offen; rund 50 m nordwestlich ein Sendemast [WP-Domberg].

### 1.3 Alle Einträge im Zentrum (Tabelle)

| Nr. | Objekt | Lage (Breite, Länge; OSM) | Zeit | Typ, Material | Nutzung heute | Betretbar | Denkmal | Quellen |
|---|---|---|---|---|---|---|---|---|
| Z1 | Marktplatz, Waffenschmied-Denkmal | 50.61072, 10.69329; `n292840267` | 1903 | Brunnen mit Sandsteinfigur | Platz, Wahrzeichen | – (Außenraum) | nicht geprüft | [WP-Suhl], OSM |
| Z2 | Rathaus, Marktplatz 1 | 50.61042, 10.69286; `w42484464` | 1590 / 1812–17 / 1902–13 | Putzbau, neubarock, Walmdach, Dachreiter | Rathaus | ja (Verwaltung) – Umfang offen | ja [WP-Rathaus]; OSM | [WP-Rathaus] |
| Z3 | Amtshaus, Marktplatz 2 (Arbeitsgericht) | 50.61061, 10.69290; `w70713098` | klassizistisch (OSM) | Putzbau, Walmdach, rote Deckung (OSM) | Arbeitsgericht Suhl | Gericht | OSM | OSM; [Jahn 2017] nennt „Amtshaus“ am Markt |
| Z4 | Marktplatz 4 | 50.61101, 10.69279; `w70713118` | offen | zwei Geschosse, Mansarddach, Putz, orange (OSM) | Wohnen/Geschäft | – | OSM | OSM |
| Z5 | Geschäftshaus Marktplatz 13 | 50.61046, 10.69385; `w70713138` | 1928 | Neue Sachlichkeit, Architekt Karl Otto (OSM) | Handel | Laden | OSM | OSM (Hausnummer aus der Commons-Marke des Objekts); früherer Name offen |
| Z6 | Hauptkirche St. Marien | 50.60998, 10.69362; `w38867533` | 1487–91; 1757–61; Turm 1769 | Saalbau, gelber Putz, Satteldach, Turm mit welscher Haube | ev. Kirche | ja | ja [WP-Marien]; OSM | [WP-Marien] |
| Z7 | Steinweg (Fußgängerzone) | 50.60920, 10.69177; `w40437966` | Wiederaufbau nach 1753; erneuert 1998–2000 | Bürgerhäuser, zwei bis drei Geschosse, Sattel-/Mansarddächer | Einkaufsstraße | Läden | einzelne Häuser | [Jahn 2017], [Uske 2017] |
| Z8 | Steinweg 24 „Pfarrhaus“ | 50.60898, 10.69116; `w83820777` | 1753 | Fachwerk, Gambrel-Dach | Wohnen | – | OSM | OSM |
| Z9 | Spangenberghaus (Steinweg) | 50.60864, 10.69125; `w83820784` | 1745 | zwei Geschosse, Gambrel-Dach | Wohnen/Geschäft | – | nicht geprüft | OSM (Tafel `n11459574621`) |
| Z10 | Steinweg 10 „Mohren-Apotheke“ | 50.60953, 10.69187; `w83910663` | offen | zwei Geschosse, weiß, Satteldach | Apotheke/Wohnen | Laden | OSM | OSM |
| Z11 | Steinweg 14 | 50.60940, 10.69173; `w83910652` | offen | drei Geschosse, Satteldach | Wohnen/Geschäft | – | OSM | OSM |
| Z12 | Dianabrunnen (Topfmarkt/Steinweg) | 50.60994, 10.69245; `w366851054` | DDR-Zeit (offen) | Bronze, Waldo Dörsch | Brunnen | – | nicht geprüft | OSM |
| Z13 | Kreuzkirche | 50.60833, 10.69028; `w38807115` | 1731–39 | Barock, gelb, Turm mit Schweifhaube | ev. Kirche | ja | ja [WP-Kreuz]; OSM | [WP-Kreuz] |
| Z14 | Kreuzkapelle „Zum Hl. Kreuz“ | 50.60819, 10.69055; `w1433085660` | 1555, Chor 1618 | gotische Kapelle | Kapelle | ja | nicht geprüft | [WP-Suhl] |
| Z15 | Waffenmuseum im Malzhaus | 50.61023, 10.68947; `n10732305087` | 1663/1668; Museum 1971; saniert 2006–08 | massiver Sockel, Fachwerk, steiles Dach | Museum | ja | nicht geprüft | [WP-Waffenmuseum] |
| Z16 | Herrenteich | 50.60967, 10.68965; `w30781507` | – | Teich | Mitte des DDR-Zentrums | – | – | [Bauwelt 2006], OSM |
| Z17 | Congress Centrum Suhl (CCS) | 50.61024, 10.68781; `w42871446` | 1969–72; Umbau bis 1995 | Rundhalle, Glas-Atrium, Parkhaus | Kongress, Konzerte, Tourist-Info | ja | nein (offen) | [WP-CCS], [Jahn 2017] |
| Z18 | Fahrzeugmuseum im CCS | 50.61019, 10.68726; `n361133609` | seit 2007 | Ausstellung, 1 100 m² | Museum (Simson u. a.) | ja | – | [WP-CCS] |
| Z19 | Ottilienbad | 50.61003, 10.68686; `w42871445` | Schwimmhalle der Stadthalle 1979/80 [Jahn 2017]; ob das heutige Bad derselbe Bau ist: **unsicher** | Hallenbad zwischen CCS und Hotel | Freizeit- und Wellnessbad der CCS GmbH | ja | – | [WP-CCS], [Jahn 2017] |
| Z20 | Hotelturm (City Hotel am CCS) | 50.60967, 10.68627; `w42871444` | 1977; Rückbau und Umbau 1993–98 | Hochhaus, heute 16 Etagen, ovaler Glasaufsatz | Hotel, Panorama-Restaurant | ja (Lobby, Restaurant) | – | [WP-CCS], [Uske 2017] |
| Z21 | Punkthochhäuser Friedrich-König-Straße (7 Stück in OSM) | 50.6112–50.6113, 10.6887–10.6935 u. a. | 1960er/70er – **unsicher** | Wohnhochhäuser, 14 Geschosse, 43–45 m | Wohnen | – | – | OSM, [WP-CCS], [Jahn 2017] |
| Z22 | Einkaufscentrum „Am Steinweg“ (früher Centrum-Warenhaus) | 50.61015, 10.69171; `w42484467` | 1966–69; Umbau 2006–08 | Einkaufszentrum, Parkhaus 7 Ebenen | Handel | ja | – | [Bauwelt 2006], [Uske 2017] |
| Z23 | Lauterbogen-Center | 50.61079, 10.69077; `w42484465` | 1996 | Einkaufszentrum, zwei Geschosse | Handel | ja | – | [Uske 2017] |
| Z24 | Haus der Geschichte (Portal des Kulturhauses) | 50.60883, 10.68880; `w110458614` | 1950er; Rest nach Abriss 2010 | Säulenvorhalle, Dreiecksgiebel mit Relief | Stadtgeschichte, Depot | offen | nicht geprüft | [Jahn 2017], [Carthalia-Kulturhaus] |
| Z25 | Haus der Wirtschaft (IHK Südthüringen) | 50.60846, 10.68891; `w412429677` | 2016 | Büro-Neubau | IHK (Bahnhofstraße 4–8 laut OSM) | – | – | OSM, [Carthalia-Kulturhaus] |
| Z26 | Hotel am Platz der Deutschen Einheit (früher Interhotel) | 50.60906, 10.68990; `w42871447` | 1965/66 | Bettenhaus der DDR-Moderne | Hotel | ja (Lobby) | – | [Jahn 2017], OSM |
| Z27 | Platz der Deutschen Einheit (früher Ernst-Thälmann-Platz) | 50.60941, 10.68842; `w69995472` | eingeweiht 18.10.1963 | Platz | Fußgängerbereich | – | – | [Jahn 2017] |
| Z28 | Haus der Gewerkschaften | gegenüber dem Herrenteich – Lage offen | 1959–63 | Verwaltungsbau (Schenk, Schacke) | heutige Nutzung offen – **unsicher** | – | – | [Jahn 2017] |
| Z29 | Stadtbücherei, Bahnhofstraße 10 | 50.60816, 10.68834; `n1385078177` | eröffnet 4.6.2004 | Neubau (Weingart, Bauer, Bracke, Hoffmann) | Bibliothek | ja | – | [Uske 2017], [WP-Suhl] |
| Z30 | Bahnhof Suhl | 50.60515, 10.68310; `w116951221` | 1882/1887 | drei Geschosse, Satteldach | Bahnhof | Halle – offen | nicht geprüft | [WP-Suhl], OSM |
| Z31 | Eisenbahn-Viadukt an der Dr.-Theodor-Neubauer-Straße | 50.60936, 10.68516; `w24929243`, `w1152772544` | Strecke seit 1882/84; Baujahr der Brücke nicht belegt | Bahnbrücke mit Bogen- und Balkenteil (OSM) | Bahnstrecke 6298 Neudietendorf–Ritschenhausen | – | – | OSM (Brückenname „Viadukt“) |
| Z32 | Kath. Kirche St. Kilian, Windmühlenweg | 50.60512, 10.69041; `w24927887` | 1898 | Kirche | kath. Kirche | ja | nicht geprüft | [WP-Suhl], OSM |
| Z33 | Stadtpark mit Gedenkstätten | 50.60640, 10.69134; `r1085152` | Gedenkstätte 1979 | Park mit Rotbuchen | Park | – | – | [WP-Suhl] |
| Z34 | Windmühle | 50.60561, 10.69119; `w128989331` | 1848 | Sandstein, vier Geschosse, Zeltdach (OSM) | offen | offen | OSM | OSM |
| Z35 | Friedrich-König-Gymnasium, Haus am Stadtpark | 50.60769, 10.69118; `w71131869` | offen | Ziegelbau, drei Geschosse, Walmdach (OSM) | Schule | – | nicht geprüft | OSM |
| Z36 | Villa Simson | 50.61260, 10.68997; `w99691622` | offen | Villa, vier Geschosse (OSM) | offen | – | nicht geprüft | OSM |
| Z37 | Neues Rathaus, Friedrich-König-Straße 42 | 50.61292, 10.69652; `w40348754` | offen | Verwaltungsbau | Stadtverwaltung, Sitzungsort der Ausschüsse | ja (Verwaltung) | – | OSM; Sitzungsort: [Suhl-Bekanntm.] |
| Z38 | Ottilienkapelle und Ottilienstein | 50.61324, 10.69210; `w198660171` | 1843; Wiederaufbau 1953 | kleine Kapelle, weiß | Kapelle, Aussicht | ja | nicht geprüft | [WP-Domberg] |
| Z39 | Bismarckturm auf dem Domberg | 50.61708, 10.68590; `w139966525` | 1895/96 | Porphyr und Kalkstein, 21 m | Aussichtsturm, offen | ja | nicht geprüft | [WP-Domberg] |
| Z40 | Sowjetisches Ehrenmal | 50.60847, 10.68269; `n1558004513` | DDR-Zeit | Stein, Inschrift | Ehrenmal | – | nicht geprüft | [WP-Suhl], OSM |
| Z41 | Jüdischer Friedhof, Straße der Opfer des Faschismus | 50.60408, 10.69439; `w171069395` | 1903 | Friedhof | Gedenkort | – | OSM | OSM |
| Z42 | Stele für die Synagoge (1906 gebaut, 1938 zerstört) | Straße der Opfer des Faschismus – Punkt offen | Stele 1985 | Gedenkstein | Gedenkort | – | – | [WP-Suhl] |
| Z43 | Karabinerbau (Industriebau) | 50.60926, 10.68191; `w127199552` | 1937 (OSM) | Industriebau, vier Geschosse | offen | – | OSM | OSM – Werk und Geschichte **unsicher** |
| Z44 | Schul- und Volkssternwarte, Hoheloh 1 | 50.60247, 10.69801; `w1175859109` | offen | Kuppel aus Metall | Sternwarte mit Planetarium | ja | – | [WP-Suhl], OSM |
| Z45 | Kino Cineplex | 50.60880, 10.68596; `w300432514` | nach 1990 | Kino | Kino | ja | – | OSM |

Z43 und Z44 liegen knapp außerhalb des 900-m-Kreises bzw. am Rand; sie stehen hier, weil sie zum Zentrum gezählt werden.

### 1.4 Was im Zentrum nicht mehr steht – und was heute dort ist

| Früher | Zeit | Heute | Quelle |
|---|---|---|---|
| Centrum-Warenhaus mit Metallfassade von Fritz Kühn | 1966–69; zu seit Ende 2000; Rückbau ab 10/2006 | Einkaufscentrum „Am Steinweg“ (seit 13.3.2008) mit Parkhaus; nur entkernte Untergeschosse blieben | [Bauwelt 2006], [Uske 2017], [WP-Suhl] |
| Kulturhaus „7. Oktober“ / „Haus Philharmonie“ | 1950er; Saal zu seit 1997; Abriss 2010 | Portalbau = Haus der Geschichte; dahinter Haus der Wirtschaft (IHK, 2016) | [Carthalia-Kulturhaus], [Jahn 2017] |
| Stadthalle der Freundschaft (mit Wandbildern) | 1972 | Umbau zum CCS (1995); Kunst am Bau entfernt | [WP-CCS], [Jahn 2017] |
| Wohnhochhaus mit 26 Etagen, 88 m | 1977 | auf 16 Etagen gekürzt, Hotel (1998) | [WP-CCS] |
| Alte Bebauung an der heutigen Friedrich-König-Straße | Abriss ab 1959 für die Durchgangsstraße | vierspurige Straße, Hochhäuser | [Jahn 2017] |
| Südliche Innenstadt | Abriss in den 1980er Jahren | Plattenbau-Wohnhäuser | [Jahn 2017] |
| Rokokohäuser am Steinweg | DDR-Umbau | eines erhalten | [WP-Suhl] |
| Synagoge (1904–06) | 1938 niedergebrannt | Gedenkstele (1985) | [WP-Suhl] |
| Vier Hochhäuser Dr.-Theodor-Neubauer-Straße (1972–74) | zwei 2006 saniert | OSM zeigt dort zwei Wohnblöcke mit elf Geschossen (50.60758, 10.68121 `w120366626`; 50.60646, 10.67976 `w120366627`) – ob die anderen zwei noch stehen: **unsicher** | [WP-CCS], OSM |

---

## 2. Übrige Kernstadt

| Nr. | Objekt | Lage | Zeit | Typ | Nutzung heute | Betretbar | Quellen |
|---|---|---|---|---|---|---|---|
| K1 | Wohngebiet Aue (Aue 1, Aue 2) | 50.60059, 10.66659 / 50.60520, 10.67805 (`n298552220`, `n298552219`) | DDR-Zeit | Plattenbau-Wohngebiet im Lautertal | Wohnen | – | [WP-Suhl] |
| K2 | Auenstadion, Auenstraße 1 | 50.60468, 10.67507; `w107172872` | offen | Stadion | Sport | – | OSM |
| K3 | Kaufpark Aue III | Lage offen | 2015/16 | Fachmarktzentrum | Handel | ja | [Uske 2017] |
| K4 | Beschussamt, An der Hasel 2 | 50.60074, 10.67681; `n4403770906` | gegründet 1893 | Behörde | ältestes deutsches Beschussamt | – | [WP-Suhl], [WP-Neundorf] |
| K5 | Wohngebiet Schmiedefelder Straße | Lage offen | 1953–62 | Wohnhöfe der 1950er mit Risaliten, Erkern, Gesimsen | Wohnen | – | [Jahn 2017] |
| K6 | Wohngebiet Ilmenauer Straße / Himmelreich | 50.61490, 10.70133 (Straße) / 50.61336, 10.70940 | um 1960 ff. | Hochhaus und Gesellschaftsbau mit Mosaikfeldern (Foto 1961) | Wohnen | – | [Jahn 2017], [WP-Suhl] |
| K7 | Döllberg: Zentralklinikum, Albert-Schweitzer-Straße 2 | 50.60201, 10.71066; `w168857105` | offen | Großklinik am Hang | größtes Klinikum Südthüringens | Foyer | [WP-Suhl] |
| K8 | Sporthalle Wolfsgrube | 50.60571, 10.69640; `w1175859123` | offen | Sporthalle | Volleyball (VfB 91 Suhl) – Zuordnung offen | ja | OSM, [WP-Suhl] |
| K9 | Tierpark Suhl | 50.61123, 10.72024; `w61904750` | eröffnet 7.10.1969 | Zoo am Ringberg-Hang | rund 450 Tiere, 100 Arten | ja | [WP-Tierpark] |
| K10 | Ringberghaus (Hotel) auf dem Ringberg | 50.61685, 10.72297; `w936064746` | eröffnet 1979 | großer Hotelbau in Gipfellage (745 m) | Hotel | ja | [WP-Ringberg] |
| K11 | Friedberg: Schießsportzentrum, Schützenstraße 6 | 50.58299, 10.71480; `w47633500` | eröffnet 1971 | Schießanlagen auf rund 29 ha | Leistungssport | teils | [Wikivoyage], [Uske 2017] |
| K12 | Friedberg: frühere Offiziershochschule der Grenztruppen | um 50.5903, 10.7070 (Weidbergstraße) | eröffnet 1984 | Kasernen- und Lehrbauten | Erstaufnahme des Landes (Schließung zum 30.11.2026), Gewerbepark, Stasi-Unterlagen-Archiv (Weidbergstraße 34) | – | [WP-Suhl], [BZ 5/2026], [BZ 9/2026], OSM |
| K13 | Landespolizeiinspektion, Schleusinger Straße 111 | 50.60044, 10.71627; `w136168152` | offen | Behördenbau | Polizei | – | OSM, [WP-Suhl] |
| K14 | Lautenberg-Siedlung und Linsenhof | 50.61035, 10.67197 / 50.61612, 10.67137 | offen | Siedlungen auf den Höhen westlich des Zentrums | Wohnen | – | [WP-Ortsteile], OSM |
| K15 | Suhl-Nord | 50.62690, 10.70439; `n8084188541` | späte 1970er | größtes Plattenbaugebiet, zum größten Teil abgerissen | Restwohnen, geplanter Gewerbe- und Forschungspark | – | [Nordkurier 2026], [LEG 2022] |
| K16 | Lauter (Stadtteil im Lautertal) | 50.62343, 10.71082; `n2150291899` | altes Dorf | Straßendorf zwischen Zentrum und Goldlauter | Wohnen | – | [WP-Ortsteile] |
| K17 | „Fröhlicher Mann“ (früheres Gasthaus, 1945 zerstört) | 50.63440, 10.70318; `w111412181` | 1713–1945 | Ort eines Bombenabwurfs am 26.3.1945 | Zirkusplatz, Wertstoffhof in der Nähe | – | [WP-Suhl], OSM |

---

## 3. Ortsteile

| Nr. | Objekt | Lage | Zeit | Typ, Material | Nutzung heute | Betretbar | Quellen |
|---|---|---|---|---|---|---|---|
| O1 | Heinrichs: Rathaus, Meininger Straße 89 | 50.59949, 10.65629; `w273160926` | Sockel 1551, Fachwerk 1657 | massives Sockelgeschoss, darüber hennebergisch-fränkisches Fachwerk mit Schaugiebeln | Volkshochschule (seit 2013), Heimatmuseum | ja | [WP-Heinrichs] |
| O2 | Heinrichs: Straßenmarkt mit Fachwerkzeilen | 50.59976, 10.65619; `n270383478` | ab Mitte 17. Jh. | traufständige Häuser mit Schmuckfachwerk zur Straße | Wohnen, Ortskern saniert | – | [WP-Heinrichs] |
| O3 | Heinrichs: Kirche St. Ulrich | 50.59891, 10.65689; `w55232000` | 1452–1503 | spätgotisch | ev. Kirche | ja | [WP-Heinrichs] |
| O4 | Heinrichs: Pfarrhaus | 50.59912, 10.65626; `w140096630` | 1627 (OSM) | giebelständiges Fachwerkhaus mit „Wildem Mann“ und Andreaskreuzen (OSM-Beschreibung) | Wohnen | – | OSM |
| O5 | Heinrichs: Jüdischer Friedhof, Schießgrund | 50.59378, 10.66259; `w316553418` | seit 1720 | Friedhof | Gedenkort | – | [WP-Heinrichs] |
| O6 | Heinrichs: Simson-Gewerbepark (früheres Simson-Werk) | 50.60379, 10.64012; `r2817061` | Werk des 19./20. Jh. | Fabrikgelände, rund 21 ha Altstandort | Gewerbe; Sanierung läuft | – | [electrive 2026], [WP-Heinrichs] |
| O7 | Heinrichs: Haltepunkt Suhl-Heinrichs | 50.60217, 10.63757; `n11426103698` | – | Bahn-Haltepunkt | Regionalverkehr | – | [WP-Heinrichs], OSM |
| O8 | Neundorf: Kirche, An der Hasel 116 | 50.59623, 10.68729; `w97222645` | 1761–63 | Dorfkirche | ev. Kirche (Filiale der Kreuzkirche) | ja | [WP-Neundorf], [WP-Kreuz] |
| O9 | Neundorf: „Goldener Hirsch“, An der Hasel 91 | 50.60052, 10.68945; `w98298055` | 1616 | Gasthaus, Fachwerkort | Hotel/Gasthaus | ja | [WP-Neundorf] |
| O10 | Neundorf: „Waisenhaus“ und Fachwerkhöfe | 50.60168, 10.68811; `w133019850` | offen | Fachwerk, weiß, Ziegeldach | Wohnen | – | OSM (Denkmal: OSM) |
| O11 | Mäbendorf: Kirche, Hauptstraße 16 | 50.60464, 10.62749; `w175074933` | offen | Dorfkirche | Kirche | ja | OSM (Denkmal: OSM) |
| O12 | Albrechts (Dorf) | 50.61813, 10.63970; `n64629145` | eingemeindet 1994 | Dorf westlich der A 71 | Wohnen, Gewerbe | – | [WP-Suhl] |
| O13 | Dietzhausen und Wichtshausen (Dörfer im Haseltal) | 50.60218, 10.59229 / 50.60106, 10.57347 | eingemeindet 1994 | Dörfer | Wohnen | – | [WP-Suhl] |
| O14 | Goldlauter-Heidersbach: Kirchen | 50.63167, 10.74822 `w159633524` / 50.63496, 10.73245 `w119960554` | offen | Dorfkirchen | Kirchen | ja | OSM |
| O15 | Goldlauter: Flugplatz Suhl-Goldlauter | 50.63223, 10.72687; `w32129623` | eingeweiht 1972 | Grasbahn 570 m, Sonderlandeplatz EDQS | Flugsport | – | [WP-Suhl] |
| O16 | Goldlauter: Justizvollzugsanstalt | 50.64256, 10.71888; `w93581450` | offen | Anstalt | JVA | – | [WP-Suhl], OSM |
| O17 | Vesser: Besucherbergwerk „Schwarzer Crux“ | Grubenfeld bei 50.60202, 10.79888 (`n441666934`) | – | Bergwerk, Museum | Museum | ja | [WP-Suhl] |
| O18 | Schmiedefeld: Bahnhof Rennsteig | 50.61515, 10.83544; `n8416450024` | – | Bahnhof auf 748 m | Rennsteigbahn, Gaststätte | ja | [WP-Suhl], OSM |
| O19 | Gehlberg: Glasmuseum (Thüringer Museumspark) | 50.67845, 10.79023; `n11368408571` | – | Museum | Museumspark | ja | [WP-Suhl], OSM |
| O20 | Gehlberg: Schmücke | 50.65463, 10.77371; `n245382657` | – | Weiler am Rennsteig, 915 m | Ausflugsziel | ja | [WP-Ortsteile], OSM |

---

## 4. Was man von weitem sieht

| Nr. | Objekt | Lage | Höhe | Warum wichtig | Quellen |
|---|---|---|---|---|---|
| F1 | Hotelturm am CCS | 50.60967, 10.68627 | 60 m (OSM); 16 Etagen plus Aufsatz | höchster Bau im Tal | [WP-CCS], OSM |
| F2 | Punkthochhäuser am Nordrand des Zentrums | siehe Z21 | 43–45 m (OSM) | Reihe vor dem Domberg-Hang, prägt die Silhouette | OSM, [Uske 2017] (Hochhäuser bestimmen das Stadtbild) |
| F3 | Domberg mit Bismarckturm und Sendemast | 50.61705, 10.68577 | Gipfel 675 m; Turm 21 m | Hausberg direkt über dem Zentrum | [WP-Domberg] |
| F4 | Ringberghaus auf dem Ringberg | 50.61685, 10.72297 | Gipfel 745 m | weithin sichtbarer Hotelriegel im Osten | [WP-Ringberg], [WP-Suhl] |
| F5 | Talbrücke Haseltal (A 73) bei Heinrichs | 50.60106, 10.64345; `w211110670` | Fahrbahn rund 85 m über dem Tal | Autobahn quert das Tal hoch über Heinrichs und dem Simson-Gelände | [WP-Suhl], OSM |
| F6 | Talbrücke Albrechtsgraben (A 71) | 50.60986, 10.63462; `w754345237` | offen | Autobahnbrücke bei Albrechts, nahe dem Dreieck Suhl | OSM |
| F7 | Tunnel Berg Bock (A 71) | 50.63087, 10.66998; `w4605247` | – | Tunnelportale nordwestlich der Stadt | OSM |
| F8 | Sender Suhl-Erleshügel | 50.61241, 10.74503; `w141460687` | Mast 69 m (OSM) | Sendeturm auf dem Höhenzug im Osten (schon Gebiet Schleusingen/St. Kilian) | OSM |
| F9 | Kamm des Thüringer Waldes: Großer Beerberg, Schneekopf | 50.65847, 10.74340 / 50.66613, 10.76406 | 983 m / 978 m | Horizont im Nordosten; gehören seit 2019 zum Stadtgebiet | [WP-Suhl], OSM |
| F10 | Zentralklinikum am Döllberg-Hang | 50.60201, 10.71066 | offen | großer Baukörper über dem Tal | [WP-Suhl], OSM |
| F11 | Steinsburg (Felsen) bei Heinrichs | 50.58181, 10.67454; `n2499255703` | 641 m | Felsgruppe im Süden | [WP-Suhl], OSM |

---

## 5. Wo gute freie Fotos liegen

- **Kontaktbögen vom 26.10.2026** (nur zum Ansehen, mit Urheber und Lizenz): Zweig `ref/suhl-innen-fotos`, Ordner `sheets/` –
  Markt (`markt_01–04`), Hauptkirche (`marien_01–02`), Kreuzkirche (`kreuz_01–05`), Waffenmuseum (`waffen_01–04`), CCS
  (`ccs_01–04`), Aue (`aue_01–04`), Suhl-Nord (`nord_01–04`), Plattenbau WBS 70 (`wbs70_01–05`), Kaufhalle, historische
  Aufnahmen (`historisch_01–04`). Nachweise in `CREDITS.md` dort.
- **Wikimedia Commons** – Kategorien, die an den OSM-Objekten selbst vermerkt sind (Marke `wikimedia_commons`, Abruf 12.11.2026;
  Adresse jeweils `https://commons.wikimedia.org/wiki/Category:<Name>`): „Rotes Rathaus (Suhl)“ (Z2), „Marktplatz (Suhl)“,
  „Waffenschmied-Brunnen“ (Z1), „Arbeitsgericht Suhl“ (Z3), „Marktplatz 13 (Suhl)“ (Z5), „Steinweg 24 (Suhl)“ (Z8),
  „Spangenberghaus_Suhl“ (Z9), „Brunnen "Diana auf Jagd"“ (Z12), „Vogelbrunnen“, „Waffenmuseum Suhl“ (Z15),
  „Herrenteich (Suhl)“ (Z16), „Lauterbogen-Center (Suhl)“ (Z23), „Stadtbücherei Suhl“ (Z29), „St. Kilian (Suhl)“ (Z32),
  „OdF-Denkmal (Suhl)“ (Stadtpark, Z33), „Villa Simson“ (Z36), „Ottilienkapelle (Suhl)“ (Z38),
  „Sowjetisches Ehrenmal (Suhl)“ (Z40), „Jüdischer Friedhof Suhl“ (Z41), „Döllstraße (Suhl)“, „Lutherbuche (Suhl)“.
  Einzelbilder dort vermerkt u. a. für den Hotelturm (Aufnahme 22.8.2024), Marktplatz 4 und Steinweg 14.
  In Suchtreffern belegt sind außerdem „Churches in Suhl“, „Suhl in the 1970s“ und „1989 in Suhl“
  (https://commons.wikimedia.org/wiki/Category:Suhl_in_the_1970s). Den Inhalt der Kategorien habe ich nicht prüfen können,
  weil die Wikimedia-Schnittstelle von hier gesperrt ist. Viele neuere Aufnahmen stammen laut `CREDITS.md` von wenigen
  Fotografen (2023–2025, CC BY-SA 4.0).
- **Bundesarchiv-Bilder auf Commons** zeigen das DDR-Zentrum im Originalzustand (Warenhaus, Stadthalle; in `CREDITS.md` mehrfach).
- **Panoramax**: 1 484 Straßenfotos im 5-km-Umkreis (`tools/fotos/katalog.json`, Stand 22.10.2026) – Auswertung beim Agenten `suhl-fotos`.

---

## 6. Offen und unsicher

1. **Amtliche Denkmalliste nicht geprüft.** Die Wikipedia-Liste der Kulturdenkmale der Kernstadt (Stand der Landesliste dort:
   8.6.2026) ließ sich nur im Vorspann lesen; die Tabellen und die Seite selbst waren für mich nicht abrufbar
   (https://de.wikipedia.org/wiki/Liste_der_Kulturdenkmale_der_Suhler_Kernstadt). Die Denkmal-Angaben oben stammen aus OSM-Marken
   und einzelnen Wikipedia-Artikeln. Nächster Schritt: Liste über GitHub Actions abrufen (dort ist Wikimedia erreichbar).
2. **Zahl, Baujahr und Typ der Punkthochhäuser** (Z21) – Quellen nennen vier bzw. sechs, OSM zeigt sieben hohe Wohnhäuser.
3. **Haus der Gewerkschaften** (1959–63): Lage und heutiger Zustand offen.
4. **Neues Rathaus** (Friedrich-König-Straße 42): Baujahr und frühere Nutzung offen.
5. **Rokokohaus am Steinweg**: Hausnummer nicht belegt.
6. **Stadtarchiv**: Portalbau (Wikipedia) oder Zellaer Straße 159 (OSM)?
7. **Hotelname** am Platz der Deutschen Einheit: „Michel Hotel“ (2017) oder „Achat Hotel“ (OSM 2026).
8. **Baujahre** Malzhaus (1663/1668), Kulturhaus (1954–58 / 1955–57), Rathaus-Umbau (1910 / 1902–13).
9. Für viele Ortsteil-Kirchen (Albrechts, Dietzhausen, Wichtshausen, Vesser, Schmiedefeld, Gehlberg) fehlen noch Punkt und Baujahr.
10. Höhenangaben aus OSM (Hotelturm 60 m, Hochhäuser 45 m, Parkhaus 26 m) sind ungeprüfte Eintragungen von Freiwilligen –
    LoD2 und DOM1 der Landesvermessung haben Vorrang.

## 7. Für den Suhl-Chat

- Die OSM-Daten des Zentrums (Abruf 12.11.2026) zeigen, wie wenig dort an Attributen steht: von 2 318 Gebäuden im 900-m-Kreis
  haben nur 720 eine Geschosszahl, 759 eine Dachform, 191 eine Hausnummer, 45 einen Namen, 15 eine Denkmal-Marke, 10 ein Baujahr
  (eigene Auszählung). Fassaden und Geschosse müssen also aus LoD2 und Fotos kommen, nicht aus OSM.
- Vorschlag Reihenfolge Einzelbauten in Stufe 3: Markt-Ensemble (Z1–Z5) → Steinweg-Zeile mit Kreuzkirche (Z7–Z14) → Malzhaus und
  Herrenteich (Z15, Z16) → CCS mit Hotelturm und Bad (Z17–Z20) → Hochhausreihe (Z21) → Platz der Deutschen Einheit (Z24–Z27).
- Für die Fernsicht (Stufe 2) reichen zunächst F1–F5 als eigene Körper.

---

## Quellen

- **OSM** – OpenStreetMap, API-Kartenabruf des Zentrums und Nominatim-Suche am 12.11.2026 (23:10–23:20 UTC); Objekt-Adressen
  `https://www.openstreetmap.org/way/<Nr.>` bzw. `/node/<Nr.>`; ODbL. Dazu der OSM-Auszug vom 26.10.2026 auf
  `ref/suhl-leute-fotos:recherche/osm.json`.
- **[WP-Suhl]** https://de.wikipedia.org/wiki/Suhl – gelesen als Textauszug vom 26.10.2026 (`ref/suhl-innen-fotos:wiki/Suhl.txt`).
- **[WP-Rathaus]** https://de.wikipedia.org/wiki/Rathaus_Suhl (Auszug 26.10.2026, ebd.).
- **[WP-CCS]** https://de.wikipedia.org/wiki/Congress_Centrum_Suhl (Auszug 26.10.2026, ebd.).
- **[WP-Waffenmuseum]** https://de.wikipedia.org/wiki/Waffenmuseum_Suhl (Auszug 26.10.2026, ebd.).
- **[WP-Kreuz]** https://de.wikipedia.org/wiki/Kreuzkirche_%28Suhl%29 (Auszug 26.10.2026, `ref/suhl-leute-fotos:recherche/wiki/`).
- **[WP-Marien]** https://de.wikipedia.org/wiki/St._Marien_%28Suhl%29 (ebd.).
- **[WP-Domberg]** https://de.wikipedia.org/wiki/Domberg_%28Suhl%29 (ebd.).
- **[WP-Ringberg]** https://de.wikipedia.org/wiki/Ringberg_%28Suhl%29 (ebd.).
- **[WP-Tierpark]** https://de.wikipedia.org/wiki/Tierpark_Suhl (ebd.).
- **[WP-Heinrichs]** https://de.wikipedia.org/wiki/Heinrichs_%28Suhl%29 (ebd.).
- **[WP-Neundorf]** https://de.wikipedia.org/wiki/Neundorf_%28Suhl%29 (ebd.).
- **[WP-Ortsteile]** https://de.wikipedia.org/wiki/Liste_der_Ortsteile_von_Suhl (ebd.; nur Fließtext, Tabelle fehlt im Auszug).
- **[WP-SNG]** https://de.wikipedia.org/wiki/St%C3%A4dtische_Nahverkehrsgesellschaft_Suhl/Zella-Mehlis (ebd.).
- **[Jahn 2017]** Uwe Jahn: Die „Sozialistische Umgestaltung“ einer Stadt. Frankenland 3/2017, S. 191–196.
  https://journals.bibliothek.uni-wuerzburg.de/frl-nf/article/download/8805/8847/9107
- **[Uske 2017]** Holger Uske: Zur Geschichte der Stadt Suhl. Frankenland 3/2017, S. 152–156.
  https://journals.bibliothek.uni-wuerzburg.de/frl-nf/article/download/8799/8841/9101
- **[Bauwelt 2006]** Matthias Grünzig: Suhl – dem ehemaligen Centrum-Warenhaus droht der Abriss. Bauwelt 12/2006, S. 169.
  https://bauwelt.de/dl/753845/10820904_8b8753c1dc.pdf
- **[Carthalia-Kulturhaus]** https://andreas-praefcke.de/carthalia/germany/suhl_kulturhaus.htm
- **[Carthalia-Stadthalle]** https://andreas-praefcke.de/carthalia/germany/suhl_stadthalle.htm
- **[Wikivoyage]** https://de.wikivoyage.org/wiki/Suhl
- **[Suhl-Bekanntm.]** Bekanntmachungen der Stadt Suhl: https://www.suhl.eu/aktuelles/categories/bekanntmachungen (gelesen 12.11.2026).
- **[Nordkurier 2026]** Nordkurier, 10.2.2026, zu Suhl-Nord:
  https://www.nordkurier.de/panorama/ddr-vorzeigeobjekt-suhl-nord-geistersiedlung-wohnungsmangel-plattenbau-thueringer-wald-sozialismus-4329674
- **[LEG 2022]** LEG Thüringen, Meldung vom 28.9.2022 zur Absichtserklärung Suhl-Nord:
  https://www.leg-thueringen.de/en/news/three-project-partners-for-suhl-north-sign-a-declaration-of-intent-for-the-transformation-of-the-district/
- **[electrive 2026]** electrive.net, 19.5.2026: https://www.electrive.net/2026/05/19/emco-will-e-schwalbe-wiederbeleben-und-in-suhl-fertigen/
- **[BZ 5/2026]** Berliner Zeitung, 21.5.2026: https://www.berliner-zeitung.de/article/thueringen-beginnt-bald-mit-dem-leerzug-der-erstaufnahme-suhl-10037809
- **[BZ 9/2026]** Berliner Zeitung, 11.9.2026: https://www.berliner-zeitung.de/article/erstaufnahmeeinrichtung-suhl-schliesst-10382904
