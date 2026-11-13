# Datenkatalog – woher echte Zahlen, Namen, Türen und Fotos kommen

Stand 13.11.2026 (Hilfs-Agent `daten-katalog`, Branch `feat/daten`). Für Falko: was es gibt, was es kostet (nichts), was wir schon geholt haben
und was als Nächstes lohnt. Falkos Wunsch (13.11. 16:42/16:50): echte Bezeichnungen von Geschäften und Orten, Einwohnerzahlen, Karten-,
Verkehrs- und Kulturdaten, Architektur; wo Fotos fehlen, logische Gebäude nach Regeln; echte Namen nur als schlichter Schriftzug, ohne Logo.

**Zeichen in der Spalte „Stand“:** ✔ = am 13.11.2026 abgerufen und gelesen (von der Sitzung oder aus GitHub Actions) · ○ = nur aus der Quelle
übernommen oder vermutet, vor dem Einbau prüfen · ✘ = geht nicht. **Erreichbar:** „hier“ = vom Chat-Rechner, „Actions“ = nur aus GitHub Actions.

## Das Wichtigste vorweg

1. **Ratscher hat nach dem Zensus 2022 mindestens 93 Einwohner** in 8 bewohnten 100-m-Zellen, **43 Haushalte** (12 Einpersonen-, 23 Zweipersonen-,
   9 Dreipersonen-, 3 Vierpersonenhaushalte), **46 Wohngebäude** (31 vor 1919 gebaut, 37 freistehende Einfamilienhäuser, 6 Zweifamilienhäuser,
   kein Mehrfamilienhaus), Durchschnittsalter etwa **53 Jahre**, kein Ausländeranteil in den sichtbaren Zellen. Wikipedia nennt 123 (Stand 2013).
   Die Rasterzahlen sind Untergrenzen: Zellen mit weniger als 3 Fällen sind verdeckt, die Werte leicht verfremdet.
2. **Kein Windvorranggebiet nahe Ratscher.** Im 2. Entwurf des Regionalplans Südwestthüringen (03/2026; Beteiligung 18.05.–20.07.2026; 40 Gebiete
   W-01 bis W-40) liegt das nächste, **W-22 „Ahlstädter Berg“, etwa 4,6 km west-nordwestlich von Ratscher** (bei Gethles, Fischbach und
   Rappelsdorf, etwa 2,4 km westlich von Schleusingens Mitte); danach W-27 „Häselriether Forst“ in etwa 6,8 km Entfernung. Der Entwurf ist noch kein Beschluss.
   Bestehende Windräder verzeichnet OpenStreetMap in unseren Ausschnitten nicht (0). Für die Zeitreise: ein Windpark im Blickfeld des Gartens ist
   nach heutigem Planungsstand nicht vorgesehen; Sichtbarkeit von W-22 aus dem Garten ist nicht geprüft (Gelände dazwischen).
3. **Alle drei Geschäfte, die Falko vermisst, stehen in OpenStreetMap** mit Name, Gebäudeumriss, Öffnungszeiten und Parkplatz: OBI (Gebäude
   5537 m²), Mega Center mit Mega-Möbel (16 887 m²) und McDonald’s mit Drive-in (435 m²). Insgesamt **211 Orte** (POIs) in den drei Ausschnitten,
   davon 176 in Schleusingen, 32 in Kloster Veßra, nur 3 in Ratscher (Feuerwehr, Brunnen, Aussichtspunkt).
4. **Türen und Höfe sind in OSM dünn:** Schleusingen 31 Türen (10 mit Hausnummer), 6 Wege mit Überdachung, davon genau ein echter Durchgang unter
   einem Haus (Burgstraße 6); von 4 Höfen (aus den Gebäudeumrissen berechnet) hat einer einen erfassten Zugang. Ratscher: 0 Türen, 0 von 150
   Gebäuden mit Hausnummer. Kloster Veßra ist dagegen gut erfasst (25 Klostergebäude mit Namen und Denkmalstatus, 17 Türen am Museum).
   → Türen und Durchgänge müssen nach Regeln ergänzt werden (`docs/plans/daten_gebaeudetypen.md`).
5. **Dachformen, Etagen, Höhen fehlen fast überall in OSM** (Schleusingen: 44 von 1752 Gebäuden mit Etagen, 23 mit Dachform, 0 mit Höhe; Ratscher:
   keine). Die 3D-Gebäude (ETHOS.BUILDA, Höhe und Grundriss) bleiben die Hauptquelle; LoD2 (echte Dachformen) wäre der große Gewinn.
6. **LoD2 aus Thüringen ist weiter nicht automatisch abrufbar** (13.11.2026): das neue Portal `geoportal.thueringen.de` zeigt ein Link11-CAPTCHA,
   der alte Host liefert für DGM1-Kacheln die Wartungsseite (970 Byte HTML). **Neu:** das Bundesamt für Kartographie (BKG) führt „LoD2-DE“ mit
   Thüringen „komplett“ (Produktstand 04/2026, Download oder Datenträger) – Lizenz und Abrufweg sind noch zu klären (Workflow prüft die Seiten).
7. **Straßenfotos:** Panoramax hat nur **eine Fahrt vom 03.10.2025** (222 Bilder in unseren Ausschnitten), und die führt **südlich an Schleusingen
   vorbei** (Breite 50,491–50,498): Ratscher und Umgebung 92 Bilder in 26 Zellen (nächstes Bild zur Dorfmitte 190 m, zum Garten 434 m),
   Kloster Veßra 100 in 21 Zellen, **die Stadt Schleusingen selbst kein einziges** (zum Markt 1,3 km, zu OBI, Mega Center und McDonald’s 1,8–2,0 km).
   Mapillary ist vorbereitet und wartet auf Falkos Schlüssel. Deshalb die Fotoliste (`docs/plans/daten_fotoliste.md`): Suhler Straße (Läden), Höfe der
   Altstadt, Ratscher.

## Was schon im Spiel steckt (nicht doppelt holen)

Gelände und Luftbilder (Thüringen DOP/DGM, Copernicus), OSM (Straßen, Grundrisse, Landnutzung), 3D-Gebäude aus ETHOS.BUILDA, der echte
Busfahrplan, MaStR (Energieanlagen), PVGIS, Parkplätze aus OSM (`tools/welt-dinge`), die Quellenliste der Welt (`tools/welt/QUELLEN.md`).
Das Suhl-Datenhaus (`tools/suhl`, öffentliches Datenrepo `mynametouse/pavillon-daten`, 695 MB, bisher Gebäudekacheln der Stadt Suhl) schreibt nur
über GitHub Actions mit `secrets.DATEN_TOKEN`; hier wird nichts dorthin geschrieben, nur das Muster (Quelle, Lizenz und Namensnennung reisen mit den Daten) übernommen.

## 1. Menschen und Zahlen

| Quelle | Inhalt | Abdeckung | Lizenz / Namensnennung | Zugang | Format, Größe | Aktualität | Erreichbar | Nutzen im Spiel | Prio | Stand |
|---|---|---|---|---|---|---|---|---|---|---|
| **Zensus 2022, 100-m-Gitter, Bevölkerungszahl** | Einwohner je 100-m-Zelle | ganz Deutschland | „© Statistische Ämter des Bundes und der Länder, 2024“, „Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet“ (Datensatzbeschreibung) | `https://www.destatis.de/static/DE/zensus/gitterdaten/Zensus2022_Bevoelkerungszahl.zip` | ZIP 18,5 MB, CSV `;` mit `GITTER_ID_100m;x_mp_100m;y_mp_100m;Einwohner` (EPSG:3035), auch 1 km und 10 km | Stichtag 15.05.2022, veröffentlicht 2024 | hier | Zahl der Bewohner, Figuren je Haus, Altersmischung | 1 | ✔ |
| Zensus 2022, weitere Raster | Haushaltsgröße, Durchschnittsalter, Alter in 10er-Gruppen und 5 Klassen, Gebäude nach Baujahr, Typ, Wohnungszahl, Heizungsart und Energieträger, Eigentümerquote, Leerstand, Miete, Staatsangehörigkeit, Religion, Familienstand | wie oben | wie oben | gleiches Muster, **Dateinamen unregelmäßig**; vollständige Liste von der Seite `https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Zensus2022/_inhalt.html` (50 ZIPs) | je ca. 10–40 MB | wie oben | hier | Haus- und Heiztypen, Baujahre (Ratscher: 31 von 46 vor 1919) | 2 | ✔ (11 Produkte geholt) |
| Zensus 2022, Zensusatlas | Ergebnisse je Gemeinde, interaktiv | Deutschland | dto. | `https://ergebnisse.zensus2022.de` | Web, Tabellen-Download | 2024 | ○ nicht geprüft | Einwohner der Stadt und Ortsteile | 3 | ○ |
| Thüringer Landesamt für Statistik | Einwohner je Gemeinde, Ortsteile nicht | Thüringen | dl-de/by-2-0 (üblich) | `statistik.thueringen.de` | Tabellen | jährlich | ○ | Vergleichswert | 4 | ○ |
| **Wikipedia „Ratscher (Schleusingen)“** | 123 Einwohner (2013), Eingemeindung 08.03.1994, Altes Schulgebäude mit Glockenturm (1828), Dorflinde (1888), Talsperre, Country-Fest | Ort | CC BY-SA 4.0 | `https://de.wikipedia.org/wiki/Ratscher_(Schleusingen)` | Text | 2013 | hier (nur Lesen, API oft 429) | Orte und Feste für Aufgaben | 3 | ✔ |
| **Wikidata** (Ratscher Q2132850, Schleusingen Q504914) | Einwohner mit Stichtag, Fläche, Koordinaten, Commons-Kategorie, Denkmalnummern | Welt | CC0 | `https://www.wikidata.org/wiki/Special:EntityData/<Q>.json`; Skript `tools/daten/wikidata_orte.py` | JSON | laufend | hier (gelegentlich 429), Actions | Verknüpfung der Orte mit Artikeln | 3 | ✔ Q-Nummern; Werte per Workflow |
| Stadt Schleusingen (Ortsteile, Vereine, Feste, Verzeichnis) | Ortsteilseiten, Vereinsverzeichnis, Veranstaltungen, Freibad | Stadt | Seitentext: Urheberrecht der Stadt – nur lesen und Fakten übernehmen, nicht kopieren | `https://www.schleusingen.de` (101 KB, antwortet) | HTML | laufend | hier | Feste und Vereine für das Dorfleben | 3 | ✔ Seite erreichbar, Inhalt noch nicht ausgewertet |
| Telefon- und Branchenverzeichnisse | Betriebe | – | **Nutzung per Scraping verboten** | – | – | – | – | **nicht verwenden** | – | ✘ |

## 2. Orte und Geschäfte

| Quelle | Inhalt | Abdeckung | Lizenz / Namensnennung | Zugang | Format | Aktualität | Erreichbar | Nutzen | Prio | Stand |
|---|---|---|---|---|---|---|---|---|---|---|
| **OpenStreetMap, API 0.6** | alle Orte (`shop`, `amenity`, `office`, `craft` …) mit `name`, `brand`, `opening_hours`, Adresse, Gebäudeumriss; Türen `entrance=*`; Durchgänge `tunnel=building_passage`; Etagen, Dachform, Alter | Welt | ODbL 1.0, „© OpenStreetMap-Mitwirkende“ | `https://api.openstreetmap.org/api/0.6/map?bbox=W,S,E,N` (≤ 0,25 Grad², ≤ 50 000 Knoten; Skript holt Kacheln zu 0,0125 Grad, 1 Anfrage/s, mit User-Agent) | XML, 64 KB je Kachel | Schleusingen: neuester Eintrag 12.11.2026 | **hier** | alles unten Beschriebene; Skript `tools/daten/osm_extrakt.py` | 1 | ✔ |
| OSM Geofabrik-Auszug Thüringen | dieselben Daten als Tageskopie | Thüringen | ODbL | `https://download.geofabrik.de/europe/germany/thueringen-latest.osm.pbf` | PBF ≈ 100 MB | täglich | Actions (hier nicht: Verbindung scheitert) | wenn die API für Ringe bis 150 km zu langsam wird | 3 | ✔ (Actions) / ✘ hier |
| OSM Overpass | gezielte Abfragen | Welt | ODbL | `overpass-api.de` | JSON | live | ✘ hier, in Actions oft 504 | nicht nötig | – | ✘ |
| Wikidata `brand:wikidata` | Marke → Q-Nummer (OBI Q300518, McDonald’s Q38076) | – | CC0 | in OSM-Tags | – | – | hier | Marke eindeutig, Branchen-Typ | 3 | ✔ |
| Webseiten der Ketten (OBI, McDonald’s, Aldi, Lidl, REWE, EDEKA) | Marktdetails: Gartencenter, Drive-in, Öffnungszeiten | je Markt | Seitenbedingungen der Firmen; kein Scraping | `https://www.obi.de/markt/schleusingen` (Adresse aus OSM `website`) | HTML | laufend | Actions (Probe) | nur Lesen für Typ und Ausstattung, **nicht abgreifen**; Logos nie übernehmen | 4 | ○ |
| Wikimedia Commons (Kategorien je Ort, Straße) | Fotos von Gebäuden und Straßen | Welt | CC BY(-SA)/gemeinfrei je Datei, Urheber nennen | API `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch…` (User-Agent nötig, schnell 429) | JSON | laufend | hier (kurz), Actions | Fassaden, Material, Farben | 2 | ✔ erreichbar, Zahlen per Workflow |
| Panoramax (offene Straßenfotos) | 360°/Straßenbilder mit Position und Richtung | Europa, hier eine Fahrt | Bilder CC BY-SA 4.0 (Urheber nennen) | `https://api.panoramax.xyz/api/search?bbox=…` | JSON (STAC), Bilder per Link | Fahrt **03.10.2025** | **hier** | Fassaden, Türen am Straßenrand | 1 | ✔ |
| Mapillary (Graph API v4) | Straßenfotos, Sequenzen, Position, Datum | Welt | Bilder CC BY-SA 4.0 | `https://graph.mapillary.com/images?bbox=…&fields=…`, **Schlüssel nötig** (ohne: Fehler 500 bei Probe) | JSON | laufend | Actions (Workflow vorbereitet) | Abdeckung je Straße, Fotoliste ergänzen | 1 | ✔ vorbereitet, wartet auf Secret `MAPILLARY_TOKEN` |

## 3. Gebäude und Architektur

| Quelle | Inhalt | Abdeckung | Lizenz / Namensnennung | Zugang | Format, Größe | Aktualität | Erreichbar | Nutzen | Prio | Stand |
|---|---|---|---|---|---|---|---|---|---|---|
| **LoD2 Thüringen (TLBG)** | 3D-Gebäude mit Dachformen | Thüringen | CC BY 4.0, „© GDI-Th“ | Downloadbereich `https://geoportal.thueringen.de/gdi-th/download-offene-geodaten` | CityGML, Kacheln | laufend | ✘ **CAPTCHA** (Link11) auch hier am 13.11.; in Actions laut `tools/welt/QUELLEN.md` ebenso | Dächer, Höhen aller Häuser | 1 | ✘ |
| **LoD2-DE (BKG)** | LoD2 bundesweit, Thüringen „komplett“ (2,33 Mio. Gebäude), jährlich von den Ländern übernommen | Deutschland | ○ **Lizenz unklar** (Produktblatt nennt Bereitstellung per Download oder Datenträger) | `https://gdz.bkg.bund.de` (Produktseite; Probe im Workflow) | CityGML | Produktstand 04/2026 | Produktblatt hier ✔ (`https://sg.geodatenzentrum.de/web_public/gdz/dokumentation/deu/lod2-de.pdf`), Daten ○ | Ausweg, falls Thüringen gesperrt bleibt | 1 | ○ |
| LoD2 Bayern (für Orte jenseits der Grenze) | LoD2 je 2-km-Kachel | Bayern | CC BY 4.0, „Bayerische Vermessungsverwaltung“ | Metalink (`tools/welt/QUELLEN.md`) | CityGML | laufend | Actions ✔ | Coburger Land, Grenzland | 3 | ✔ (aus Welt-Chat) |
| ETHOS.BUILDA | Grundriss + Höhe aller Gebäude | Europa | siehe Welt-Chat | schon in `tools/welt` | – | – | – | **läuft schon** | – | ✔ |
| ALKIS „Hausumringe“ (ohne Flurstücke) | amtliche Gebäudegrundrisse, Hauskoordinaten mit Hausnummern | Thüringen | CC BY 4.0 (offene Geobasisdaten) | im Download-Portal; ATOM-Namen geraten, Probe im Workflow | Shape/GML | laufend | ✘ wie LoD2, ○ ATOM | **Hausnummern für Ratscher** (OSM hat keine) – Flurstücke nie übernehmen | 2 | ○ |
| Denkmalliste Landkreis Hildburghausen | Kulturdenkmale je Ort | Landkreis | amtlich (TLDA); Wikipedia-Listen „Liste der Kulturdenkmale in …“ CC BY-SA | `https://de.wikipedia.org/wiki/Liste_der_Kulturdenkmale_in_Schleusingen` (Seitenname nicht geprüft, 429), OSM-Tag `heritage` | Text, Tabellen | uneinheitlich | hier (langsam) | Wahrzeichen, Beschriftungen | 3 | ○ |
| OSM-Gebäudetags | Etagen, Dachform, Höhe, Material, Baujahr, Farbe | Welt | ODbL | wie OSM oben, `tools/daten/ergebnis/gebaeude.csv` | CSV 179 KB | laufend | hier | wo vorhanden: Etagen und Dachform | 2 | ✔ (dünn: siehe unten) |
| Bildquellen für Aussehen | Wikimedia Commons, Panoramax, Mapillary, eigene Fotos | – | je Bild | oben | – | – | – | Farben, Material, Eingänge | 1 | ✔ |

## 4. Verkehr

| Quelle | Inhalt | Abdeckung | Lizenz | Zugang | Erreichbar | Nutzen | Prio | Stand |
|---|---|---|---|---|---|---|---|---|
| BASt automatische Zählstellen | Jahresdurchschnitt je Zählstelle, Lkw-Anteil | Autobahnen, Bundesstraßen | BASt-Nutzungsbedingungen (frei mit Quelle) | Seite `bast.de` → Verkehrszählung → Daten; **direkte CSV-Pfade `…/Daten/2024_1/Jawe2024.csv` liefern 404** | Seite hier, CSV ○ | A 73, B 247, B 89: Verkehrsstärke | 3 | ○ Dateipfad suchen |
| Thüringer Straßenverkehrszählung 2021 / Verkehrsmengenkarte | Kfz/24 h je Streckenabschnitt Bundes- und Landesstraßen | Thüringen | ○ unklar (Bayern verweist auf eigene BAYSIS-Bedingungen; für Thüringen nicht gefunden) | Thüringen-Viewer, Landesamt für Bau und Verkehr | ○ | Dichte der Autos auf L 3004 und B 247 | 3 | ○ |
| Ladesäulenregister (BNetzA) | Ladepunkte, Betreiber, Leistung | Deutschland | frei mit Quelle | Seite `https://www.bundesnetzagentur.de/…/Ladesaeulenkarte/start.html` antwortet ✔; Datei-Link nicht geprüft; OSM kennt 1 Ladesäule in Schleusingen | hier | Ladesäulen an Märkten | 4 | ○ |
| Breitbandatlas | Internetversorgung | Deutschland | Nutzungsbedingungen | `https://www.breitbandatlas.de/` | Actions (Probe) | Dorfleben, Zukunft | 5 | ○ |
| Busfahrplan (GTFS) | echte Haltestellen und Zeiten | – | – | **läuft schon** (`docs/features/bus.md`) | – | – | – | ✔ |
| MaStR | Wind-, Solar-, Speicheranlagen | Deutschland | DL-DE/by-2-0 | **läuft schon** | – | Zeitreise: Energie | – | ✔ |

## 5. Umwelt, Planung, Geschichte

| Quelle | Inhalt | Abdeckung | Lizenz / Namensnennung | Zugang | Erreichbar | Nutzen | Prio | Stand |
|---|---|---|---|---|---|---|---|---|
| DWD Open Data (Klimadaten, Wetterstationen) | Temperatur, Niederschlag, Wind; Klimamittel | Deutschland | frei, „Quelle: Deutscher Wetterdienst“ | `https://opendata.dwd.de/climate_environment/CDC/…` | hier ✔ (Verzeichnis antwortet) | Wetter im Spiel realistisch | 3 | ✔ erreichbar, Datei nicht gewählt |
| Hochwasser- und Starkregenkarten Thüringen (TLUBN) | Gefahrenflächen | Thüringen | ○ | Thüringer Umwelt-Viewer | ○ | Steinach bei Schleusingen, Talsperre Ratscher | 4 | ○ |
| **Regionalplan Südwestthüringen, 2. Entwurf (03/2026)** | Raumnutzungskarte Ost/West mit Vorranggebieten (Wind W-01…W-40, Kulturerbe, Landwirtschaft …), Textteil, Umweltbericht | Planungsregion Südwestthüringen | amtlich, frei lesbar | `https://regionalplanung.thueringen.de/suedwestthueringen/regionalplan-suedwestthueringen/aenderung-des-regionalplanes/entwurf/entwurfsstand-032026` (PDFs `…/RPSW26-2Bet-PlU/RPSW26-2Bet-03-2-RNKOst.pdf`, 78 MB) | hier ✔ | **Windfrage beantwortet** (siehe oben); Ortslagen und Gebietsnamen aus dem PDF-Text, Lage nach Beschriftungsposition (Maßstab 1 : 100 000) | 2 | ✔ |
| SLUB Kartenforum (Dresden) | georeferenzierte Messtischblätter (um 1900, 1930er), Meilenblätter | Sachsen/Thüringen | meist gemeinfrei bzw. CC BY-SA, je Blatt | `https://kartenforum.slub-dresden.de/` (Probe im Workflow; `slubdd.de` antwortet ✔) | hier ○ | Zeitreise: altes Ratscher, Schleusingen um 1900 | 2 | ○ |
| Deutsche Fotothek / Deutsche Digitale Bibliothek | historische Fotos, Luftbilder | Deutschland | je Bild | `https://www.deutschefotothek.de/` (antwortet ✔), DDB-API nur mit Schlüssel | hier | Zeitreise: Fotos von Orten | 3 | ✔ Seite, ○ Treffer |
| Bundesarchiv auf Commons | Fotos der DDR-Zeit (CC BY-SA 3.0 de) | Deutschland | CC BY-SA 3.0 de, „Bundesarchiv, Bild …“ | Commons-Kategorien | hier (Commons) | Grenzland, DDR-Szenen | 3 | ○ |

## Was ich geholt habe (`tools/daten/ergebnis/`)

| Datei | Inhalt | Umfang | Skript |
|---|---|---|---|
| `pois.csv` | alle Orte mit echtem Namen, Marke, Betreiber, Adresse, Öffnungszeiten, Gebäudeart, Fläche, Drive-in, Türen im Umkreis 25 m, Parkplätze im Umkreis 120 m, Denkmal, OSM-Kennung | 211 Zeilen | `osm_extrakt.py` |
| `entrances.csv` | Türen (`entrance=*`, `door=*`) mit Gebäude, Adresse, Abstand | 31 + 17 | `osm_extrakt.py` |
| `passages.csv` | Durchgänge unter Gebäuden und überdeckte Wege | 6 | `osm_extrakt.py` |
| `hofzugaenge.csv` | Höfe, aus Gebäudeumrissen berechnet (Löcher im Gebäudeverbund, 40–4000 m²), mit „Zugang in OSM: ja/nein“ | 4 | `osm_extrakt.py` |
| `gebaeude.csv` | Gebäude mit Etagen, Dachform, Höhe, Material, Farbe, Baujahr, Adresse, Nutzung, Fläche | 2070 | `osm_extrakt.py` |
| `stats.json` | Vollständigkeit der OSM-Angaben je Ort | – | `osm_extrakt.py` |
| `zensus_zusammen.json`, `zensus_ratscher_zellen.json` | Summen je Ort (Einwohner, Haushalte, Alter, Baujahre, Heizung) und die 8 Zellen von Ratscher | klein | `zensus_gitter.py`, `zensus_zusammen.py` |
| `panoramax.csv`, `abdeckung.json` | Position, Datum, Lizenz der Panoramax-Bilder; Zahlen je Ort | 222 Bilder | `abdeckung.py` |
| `../maengel_start.csv` | 35 Startzeilen für Falkos Mängel-Tabelle | 35 | `maengel_start.py` |

**Vollständigkeit der OSM-Angaben (13.11.2026):**

| Ort | Gebäude | mit Etagen | mit Dachform | mit Höhe | mit Adresse | Orte (POIs) | davon mit Öffnungszeiten | Türen | Durchgänge | Höfe (ohne Zugang) |
|---|---|---|---|---|---|---|---|---|---|---|
| Ratscher (mit Geisenhöhn) | 150 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| Schleusingen | 1752 | 44 | 23 | 0 | 701 | 176 | 43 | 31 | 6 | 4 (3) |
| Kloster Veßra | 168 | 13 | 15 | 0 | 7 | 32 | 2 | 17 | 0 | 0 |

**So geht es:** `python3 -I tools/daten/osm_extrakt.py CACHE OUT` (holt die OSM-Kacheln, etwa 40 s), `python3 -I tools/daten/zensus_gitter.py CACHE OUT` und
`zensus_zusammen.py` (lädt je Produkt eine ZIP, etwa 1 min), `abdeckung.py OUT --ohne-commons`. Die Wikimedia-Teile (Commons, Wikidata) antworten von
dieser Adresse oft mit 429 und laufen im Workflow `.github/workflows/daten-katalog.yml`.

## Mapillary – so schalten wir es frei

Der Workflow `daten-katalog.yml` ruft Mapillary nur auf, wenn das Secret `MAPILLARY_TOKEN` existiert; sonst steht in der Ausgabe
„übersprungen“. Falko: Konto auf mapillary.com → „Developers“ → App anlegen → **Client-Token** kopieren → GitHub, Repo `pavillon-ratscher` →
Settings → Secrets and variables → Actions → „New repository secret“, Name `MAPILLARY_TOKEN`. Den Schlüssel nie im Chat nennen. Danach den
Workflow „Daten-Katalog“ per Hand starten (Actions → Run workflow). Ergebnis: Artefakt `daten-katalog` mit `mapillary.csv` (Position, Datum, Richtung,
Sequenz, Urheber) und `mapillary_abdeckung.json` (Bilder und 100-m-Zellen je Ort und für die Strecken Schleusingen–Kloster Veßra und Schleusingen–Suhl).
Mapillary-Bilder stehen unter CC BY-SA 4.0 (Urheber nennen); im Repo bleiben nur Metadaten.

## Offene Fragen und nächste Schritte

1. **Hausnummern und Adressen für Ratscher** – amtliche Hauskoordinaten (ALKIS „Hausumringe/Hauskoordinaten“) aus Thüringen sind das Ziel, solange das
   Portal gesperrt ist: Falko lädt die Dateien einmal im Browser (CAPTCHA) und legt sie wie die DGM1-Kacheln ins private Repo.
2. **LoD2:** zwei Wege – Thüringen von Hand (wie DGM1) oder BKG LoD2-DE, sobald Lizenz und Abrufweg stehen (Workflow-Probe liefert Antwort).
3. Zensus: weitere Produkte nach Bedarf (Typ der Familie, Wohnfläche je Bewohner, Leerstand); Skript nimmt Produktnamen als Argument.
4. OSM für Ringe bis 150 km: Geofabrik-Auszug in Actions (Workflow `welt-dinge-osm.yml` zeigt das Muster) statt API-Kacheln.
5. Wikipedia-Listen der Kulturdenkmale (Schleusingen, Kloster Veßra) auswerten – eine Abfrage aus Actions.
6. Bestätigen, dass Ketten-Schriftzüge ohne Logo genügen (Falko 16:50: ja); Lizenz der Marken: nur Schriftzug mit dem Namen.

## Quellen dieses Dokuments

Zensus-Datensatzbeschreibung (in `Zensus2022_Bevoelkerungszahl.zip`), Destatis-Seite
[Zensus 2022](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Zensus2022/_inhalt.html);
[2. Entwurf Regionalplan Südwestthüringen](https://regionalplanung.thueringen.de/suedwestthueringen/regionalplan-suedwestthueringen/aenderung-des-regionalplanes/entwurf/entwurfsstand-032026)
(Textteil, Raumnutzungskarte Ost, Umweltbericht);
[Berliner Zeitung zur Informationsveranstaltung des Landratsamts](https://www.berliner-zeitung.de/article/suedthueringen-landratsamt-hildburghausen-informiert-zu-windkraft-vorranggebieten-10036812)
(40 Vorranggebiete, 1,7 % Flächenziel);
[BKG Produktblatt LoD2-DE](https://sg.geodatenzentrum.de/web_public/gdz/dokumentation/deu/lod2-de.pdf);
[Wikipedia Ratscher (Schleusingen)](https://de.wikipedia.org/wiki/Ratscher_(Schleusingen)); OpenStreetMap-API (© OpenStreetMap-Mitwirkende, ODbL);
[Panoramax-API](https://api.panoramax.xyz/api); `tools/welt/QUELLEN.md`.
