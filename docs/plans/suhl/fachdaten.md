# Suhl – Fachdaten für Szenarien (Stufe 1)

Stand: 13.11.2026, Hilfs-Agent `suhl-wissen`. Welche offenen Fachdaten gibt es je Gebäude oder Quartier – und welche davon habe
ich wirklich mit einer Anfrage geprüft?

**Spalte „Geprüft“:**
- **Abruf** = am 12.11.2026 (23:28–23:40 UTC) von diesem Rechner mit einer echten Anfrage getestet; das Ergebnis steht dabei.
- **gelesen** = Dokument oder Seite gelesen, Daten selbst nicht abgerufen.
- **nur gefunden** = Adresse bekannt, Abruf von hier nicht möglich oder nicht versucht.
- **nicht gefunden** = gesucht, nichts Verlässliches.

Alle Anfragen liefen einzeln und mit Pause, mit der Kennung `PavillonRatscher-Suhl/0.1`. Rohdaten liegen nicht im Repo.

## Das Wichtigste vorweg: was wirklich da ist

| Thema | Wirklich nutzbar? | Kurz |
|---|---|---|
| Überschwemmungsgebiete | **ja, Abruf** | Landes-WMS, Ebene `uesg`; im Zentrum und in der Kernstadt sind Flächen eingezeichnet |
| Starkregen | **ja, Abruf** | Bundes-WMS mit Überflutungstiefe, Fließgeschwindigkeit und -richtung für Thüringen; liefert Werte am Marktplatz |
| Straßenlärm | **ja, Abruf** | Landes-WMS „Lärmkartierung 2022“; deckt Zentrum und Kernstadt ab |
| Verkehrsmengen | **ja, Abruf** | Landes-WMS „SVZ 2015“ (alt: Zählung 2015) |
| Fahrplan | **ja, Abruf** | GTFS-Datei vom 7.11.2026, 276 MB |
| Wetter/Klima | **ja, Abruf** | DWD-Stationsliste; nächste laufende Station: Schmücke (938 m, 7,5 km) – keine Station in Suhl selbst |
| Unfälle | **ja, Abruf (Verzeichnis)** | Punktdaten 2016–2025 als CSV und Shape |
| Einwohner je Stadtteil | **ja, gelesen** | nur als PDF-Tabellen der Stadt (Stand 31.12.2022), 17 Stadtteile |
| Vorausberechnung | **ja, gelesen** | Land: 26 600 Einwohner 2042 |
| Zensus-Gitter 100 m | **nur gefunden** | Download-Rechner von hier gesperrt – über GitHub Actions holen |
| Solaranlagen (Register) | **nur gefunden** | Seite erreichbar; kleine Anlagen ohne Adresse – je Gebäude nicht möglich |
| Solarkataster | **nur gefunden** | Solarrechner Thüringen von hier nicht erreichbar |
| Bodenrichtwerte | **nein** | Ebene im Landes-WMS vorhanden, Kartenabruf aber verweigert |
| Denkmalliste | **offen** | amtliche Online-Liste nicht gefunden; die Denkmal-Ebenen im Landes-WMS sind im Zentrum leer; Ersatz: OSM, Wikipedia |
| Ratsinformationssystem | **nur gefunden** | `suhltrifft.ris-portal.de` – lässt automatische Abrufe nicht zu; Einladungen stehen auch als Meldungen auf suhl.eu |
| Waldschäden | **nicht gefunden** | nur Ebenen zu Wald und Waldeigentum im Landes-WMS |

---

## 1. Menschen und Wohnen

| Was | Anbieter | Adresse | Format | Auflösung | Lizenz | Stand | Geprüft |
|---|---|---|---|---|---|---|---|
| **Zensus 2022, Gitterdaten**: Einwohner, Alter, Staatsangehörigkeit, Haushalte, Gebäude nach Baujahr (Jahrzehnte), Gebäudetyp, Wohnungen je Gebäude, Heizungsart, Energieträger, Leerstand (auch marktaktiv), Nettokaltmiete, Eigentumsquote, Wohnfläche | Statistische Ämter des Bundes und der Länder | Übersicht: https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Zensus2022/_inhalt.html · Dateien unter `static.destatis.de/static/DE/zensus/gitterdaten/` (z. B. `Zensus2022_Bevoelkerungszahl.zip`, `Zensus2022_Heizungsart.zip`, `Zensus2022_Energietraeger.zip`) | ZIP mit CSV und Excel-Beschreibung | 100 m, 1 km, 10 km | offene Daten mit Quellenangabe (Lizenzname auf der Seite nicht genannt – **unsicher**) | Stichtag 15.5.2022 | **nur gefunden** – Seite gelesen; der Download-Rechner antwortet von hier mit Fehler 502 (Sperre des Zugangs dieser Sitzung). Werte sind zur Geheimhaltung leicht verändert (Cell-Key-Verfahren). |
| **Einwohner je Stadtteil** (17 Stadtteile; Alter, Ausländeranteil, Wanderung, Durchschnittsalter) | Stadt Suhl | https://www.suhl.eu/_files/ugd/a83f98_713b12cbfee94ce8b0efd5fb901d219d.pdf · https://www.suhl.eu/_files/ugd/a83f98_20874720c4a24c0fbb113fcbbfb6ec20.pdf | PDF | Stadtteil | keine Angabe | 31.12.2022 | **gelesen** (Tabelle in `stadt.md`) |
| **Suhl-Nord: Eigentum, Blöcke, Rückbau-Stand** (Tabellen und Karten, Stand April 2022) | LEG Thüringen | https://www.leg-thueringen.de/fileadmin/user_upload/leg_portal/downloads/publikationen/stadt_regionalentwicklung/suhl-nord_realisierungskonzept_2022-2040_langfassung.pdf | PDF | Block, Straße | keine Angabe | 2022 | **gelesen** (erstes Viertel): Eigentumsanteile, Blöcke mit Abriss-Stand – siehe `planungen.md`, Nr. 2 |
| **Einwohner der Stadt**, halbjährlich | Thüringer Landesamt für Statistik | https://statistik.thueringen.de/presse/2025/pr_224_25.pdf | PDF/Datenbank | Kreis | amtliche Statistik | 30.6.2025: 34 034 | **gelesen** |
| **Bevölkerungsvorausberechnung** bis 2042 (3. regionalisierte) | Thüringer Landesamt für Statistik | https://statistik.thueringen.de/webshop/pdf/2024/80116_2024_51.pdf | PDF | Kreis (nur 2022 und 2042 für Suhl) | amtliche Statistik | Ausgabe 2024 | **gelesen**. Die Gemeinde-Vorausberechnung bis 2045 gilt nur für kreisangehörige Gemeinden, nicht für Suhl (https://statistik.thueringen.de/presse/2026/pr_035_26.pdf). |
| **Gebäude heute** (Grundriss, Höhe) | Forschungszentrum Jülich (ETHOS.BUILDA) | https://zenodo.org/records/11845992 | CSV | Gebäude | ODbL | 2024 | Seite erreichbar (Abruf); Auswertung beim Agenten `suhl-bestand` |
| **Gebäude im Kataster**: Umrisse (`alkis_geb`, `AngabeZurGebaeudefunktion`); Beschriftungen für Funktion, Dachform, Geschosszahl, Name (`Gebaeudefunktion`, `DachformGebaeude`, `GeschossanzahlGebaeude`, `GebaeudeName`) | TLBG (Landesvermessung) | https://www.geoproxy.geoportal-th.de/geoproxy/services (WMS) | WMS | Gebäude | für diese Ebenen nicht geprüft | laufend | **Abruf:** Die Umriss-Ebenen liefern ein Kartenbild (Ausschnitt 300 m am Markt). Die Beschriftungs-Ebenen für Geschosse, Dachform, Funktion und Namen werden **verweigert** („Missing WMS:GetMap right“). Geschosse und Dachform müssen also aus LoD2 kommen. Flurstücks- und Eigentümer-Ebenen bleiben tabu (Regel 6). |
| **Bodenrichtwerte** (BORIS-TH) | TLBG | Ebene `BODENRICHTWERTZONE_aktuell` im selben WMS; Metadaten: Lizenz CC BY 4.0 | WMS | Richtwertzone | CC BY 4.0 laut Metadaten | – | **Abruf: verweigert** („Missing WMS:GetMap right“). Der Viewer des Landes war von hier nicht erreichbar. Vorerst nicht automatisch nutzbar. |

## 2. Energie

| Was | Anbieter | Adresse | Format | Auflösung | Lizenz | Stand | Geprüft |
|---|---|---|---|---|---|---|---|
| **Marktstammdatenregister**: Solar, Wind, Speicher, Biomasse, Verbrennung, Wasser u. a. | Bundesnetzagentur | https://www.marktstammdatenregister.de/MaStR/Datendownload · Beschreibung: https://open-mastr.readthedocs.io/en/latest/dataset/ | ZIP mit XML (Gesamtauszug); aufbereitete CSV auf Zenodo (doi 10.5281/zenodo.6807425) | Anlage; **unter 30 kW ohne Straße, Hausnummer und Koordinaten** – nur Postleitzahl/Gemeinde | Datenlizenz Deutschland – Namensnennung 2.0 | laufend | **nur gefunden** – Download-Seite antwortet (Abruf des Seitenkopfs), Daten nicht geladen. Folge: Dach-Solaranlagen lassen sich **nicht je Gebäude** verorten, nur je Postleitzahl zählen; große Anlagen punktgenau. Ob Wärmepumpen enthalten sind, nennt die gelesene Beschreibung nicht – **unsicher**. |
| **Solarkataster** (Eignung je Dachseite nach Neigung, Ausrichtung, Verschattung, Größe) | ThEGA (Landesenergieagentur) | https://www.solarrechner-thueringen.de/ · Beschreibung: https://www.thega.de/fileadmin/user_upload/Publikationen/Effiziente_Stadt/lilie_solarrechner.pdf | Web-Karte | Dachfläche | nicht bekannt | online seit Mai 2018 | **nur gefunden** – Beschreibung gelesen; die Seite brach von hier die Verbindung ab. Download der Daten: nicht bekannt. Ersatz: Dachflächen aus LoD2 selbst rechnen (so macht es schon `zukunft-welt` für Ratscher). |
| **Kommunaler Wärmeplan (Entwurf)**: Karte mit Gebietstypen (Fernwärme, Ausbau, Einzellösung) | Stadt Suhl | https://www.suhl.eu/planen-bauen-wohnen · Karte: `https://www.suhl.eu/_files/ugd/b4a114_6cfe1295a87b49c799bf4a564686b74f.pdf` | PDF-Karte | Quartier/Baublock | keine Angabe | Entwurf, öffentlich seit März 2026 | **gelesen** (Seite); die Karte selbst ist von hier **nicht abrufbar**. Für Szenarien die wichtigste Energie-Quelle – bitte von Hand holen oder über GitHub Actions. |
| **Fernwärme-Kennzahlen** (Einspeisung, Abgabe, Verluste; Strategie 2040) | Stadtwerke Suhl/Zella-Mehlis | https://www.swsz.de/fernwaerme · https://www.swsz.de/images/downloads/geschaeftskunden/fernwaerme/KonzeptFW2040.pdf | Web, PDF | Netz | – | 2025: 104 151 MWh eingespeist, 78 656 MWh abgegeben | **gelesen**. Ein Netzplan (welche Straßen angeschlossen sind) war im gelesenen Teil nicht enthalten. |
| **Geothermie-Karte**, **Versiegelung**, **Hangneigung** | Land Thüringen | Ebenen `gesamtkarte`, `versiegelung`, `hangneigung` im Landes-WMS | WMS | Fläche | wie oben | – | **Abruf** der Ebenenliste; Inhalte nicht abgefragt |
| **Windenergie-Anlagen** („raumbedeutsame WKA“) | Land Thüringen | Ebene `wka` im Landes-WMS | WMS | Anlage | wie oben | – | **Abruf** der Ebenenliste; Inhalt nicht abgefragt. Die Vorranggebiete des Regionalplan-Entwurfs 2026 habe ich als Geodaten nicht gefunden. |
| **Ladesäulen** | Bundesnetzagentur | https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/E-Mobilitaet/Ladesaeulenkarte/start.html | Karte, Liste zum Herunterladen | Ladepunkt mit Adresse | nicht geprüft | laufend | **nur gefunden** – Seite antwortet; Liste nicht geladen. Ersatz: OSM (`amenity=charging_station`). |

## 3. Wasser, Wetter, Wald

| Was | Anbieter | Adresse | Format | Auflösung | Lizenz | Stand | Geprüft |
|---|---|---|---|---|---|---|---|
| **Überschwemmungsgebiete** (festgesetzt, vorläufig gesichert, nach altem Recht) | TLUBN | WMS https://www.geoproxy.geoportal-th.de/geoproxy/services, Ebene `uesg`; Metadaten-Nr. 5372325c-fe68-4074-8bad-8fc9bee4f35d | WMS, abfragbar | Fläche | CC BY 4.0 „© GDI-Th“ | Datensatz überarbeitet am 3.6.2026 (Metadaten des Landes) | **Abruf:** Kartenbild für das Zentrum (1,8 km × 1,8 km) und die Kernstadt (10 km × 10 km) geholt – in beiden sind Flächen eingezeichnet (1 895 bzw. 2 586 gefärbte Bildpunkte von 262 144). Auch ein Ausschnitt von 300 m um den Markt enthält Flächen (9 028 von 360 000 Bildpunkten). Es gibt also ein amtliches Überschwemmungsgebiet mitten im Zentrum. Die Fläche habe ich nicht vermessen; die Punktabfrage lieferte keinen Text. |
| **Hochwasser-Gefahren- und Risikokarten** (Wassertiefen für seltene, mittlere, häufige Ereignisse) | TLUBN | https://tlubn.thueringen.de/wasser/hochwasser-niedrigwasser/hochwasserrisikomanagement | Web-Karte | – | – | Risikobewertung überprüft 26.8.2024 | **nur gefunden** – Seite antwortet; einen offenen Dienst mit Wassertiefen habe ich nicht gefunden. Ob Lauter und Hasel Risikogewässer sind: offen (siehe `planungen.md`, Nr. 9). |
| **Starkregen-Hinweiskarte**: größte Überflutungstiefe, Fließgeschwindigkeit, Fließrichtung; zwei Regen: außergewöhnlich (100-jährlich) und extrem (100 mm in einer Stunde) | Bundesamt für Kartographie und Geodäsie (BKG) | WMS https://sgx.geodatenzentrum.de/wms_starkregen – Ebenen `th_tiefe_agw`, `th_tiefe_extrem`, `th_geschw_agw`, `th_geschw_extrem`, `th_fr_agw`, `th_fr_extrem`, `th_gewaesser` | WMS, abfragbar (auch JSON) | Raster auf Basis des 1-m-Geländemodells | Datenlizenz Deutschland – Namensnennung 2.0 | – | **Abruf:** Kartenbilder für das Zentrum enthalten Daten (30 388 bzw. 39 470 gefärbte Bildpunkte); Punktabfrage am Marktplatz (50.6107, 10.6933) für den extremen Regen liefert `Tiefe: 141` (Einheit nicht geprüft, vermutlich Zentimeter – **unsicher**). |
| **Pegel, Rückhaltebecken, Gewässernetz** | Land Thüringen | Ebenen `ver06_p_9` (Pegel), `ver06_f_14` (Rückhaltebecken), Gewässerachsen im Landes-WMS | WMS | Objekt | wie oben | – | **Abruf** der Ebenenliste |
| **Wetter- und Klimadaten** (Tageswerte: Temperatur, Niederschlag, Schnee, Wind, Sonne) | Deutscher Wetterdienst | https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/ | Textdateien je Station | Station | freie Nutzung mit Quellenangabe (Wortlaut nicht geprüft) | täglich | **Abruf** der Stationsliste (Stand 11.11.2026). Im Umkreis von 30 km laufen: **Schmücke** (Nr. 04501, 938 m, 7,5 km, seit 1936), Martinroda (03204, 19 km), Meiningen (03231, 23 km), Veilsdorf (07428, 23 km). Frühere Stationen: Schleusingen (1938–1980), Oberhof (1950–1981), Schmiedefeld (1937–1977), Gehlberg (1958–1982). In Suhl selbst führt diese Liste keine Station. |
| **Wald**: Waldflächen, Waldeigentum, Baumarten-Herkunftsgebiete, mögliche natürliche Vegetation | Land Thüringen | Ebenen `Wald`, `waldeigentum`, `hkgebiete_840` (Fichte) u. a. im Landes-WMS | WMS | Fläche | wie oben | – | **Abruf** der Ebenenliste; Inhalte nicht abgefragt |
| **Waldschäden** (Käfer, Dürre) | Landesforstverwaltung | – | – | – | – | – | **nicht gefunden.** Ein Vortrag zur Thüringer Waldschadens-Kartierung aus Satellitendaten ist nicht mehr abrufbar. Landeszahl: 127 000 von 550 000 ha neu zu bestocken (siehe `planungen.md`, Nr. 10). Ersatz: Infrarot-Luftbild des Landes (`th_dop20cir`) und Vergleich zweier Befliegungen. |
| **Schutzgebiete**: Naturschutz, Landschaftsschutz, Biosphärenreservat mit Zonen, FFH, Vogelschutz, Wasserschutz | TLUBN | Ebenen `nsg`, `lsg`, `biosreserv`, `biosreserv_zon`, `spa`, `wsg_hqsg` im Landes-WMS | WMS, abfragbar | Fläche | CC BY 4.0 | – | **Abruf** der Ebenenliste |

## 4. Verkehr und Lärm

| Was | Anbieter | Adresse | Format | Auflösung | Lizenz | Stand | Geprüft |
|---|---|---|---|---|---|---|---|
| **Fahrplan** aller Linien (Bus, Bahn) | gtfs.de (aus den DELFI-Daten) | https://download.gtfs.de/germany/free/latest.zip | GTFS (ZIP) | Haltestelle, Fahrt | CC BY 4.0 (laut `suhl-gemeinsam.md`) | Datei vom 7.11.2026, 275 947 223 Bytes | **Abruf** (Kopfzeilen). Werkzeug vorhanden: `viz3/extra/bus/quellen/fahrplan.py`. |
| **Verkehrsmengen** der Straßenverkehrszählung | Land Thüringen | Ebenen `SVZ2015_VMenge`, `SVZ2015_Zst` im Landes-WMS | WMS, abfragbar | Straßenabschnitt, Zählstelle | wie oben | Zählung 2015 | **Abruf:** Kartenbild der Kernstadt enthält Daten. Neuere Zählungen (2021) im Dienst nicht gesehen. |
| **Straßenlärm** (Tag-Abend-Nacht, Nacht; Lärmschutzwände; Statistik je Gemeinde) | TLUBN | Ebenen `laermindex_tan`, `laermindex_n`, `laermschutzwand`, `laermstatistik` im Landes-WMS; Seite: https://tlubn.thueringen.de/umweltschutz/immissionsschutz/ul/laermkartierung | WMS, abfragbar | Pegelflächen | CC BY 4.0 „© GDI-Th“ | Lärmkartierung 2022 (4. Stufe; Datensatz vom 30.6.2022) | **Abruf:** Kartenbilder für Zentrum und Kernstadt enthalten Daten (im Zentrum-Ausschnitt 31 % der Bildpunkte gefärbt). Kartiert sind Hauptverkehrsstraßen. |
| **Schienenlärm** | Eisenbahn-Bundesamt | WMS https://geoinformation.eisenbahn-bundesamt.de/wms/isophonen (Ebenen `isophonen_ek_lden`, `isophonen_ek_lnight` u. a.) | WMS | Pegelflächen | Datenlizenz Deutschland – Namensnennung 2.0 | Runde 4 | **Abruf** der Ebenenliste; Abdeckung der Strecke durch Suhl nicht geprüft |
| **Unfälle mit Personenschaden**, punktgenau | Statistische Ämter des Bundes und der Länder | Karte: https://unfallatlas.statistikportal.de/ · Dateien: https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/ (`Unfallorte2016…2025_EPSG25832_CSV.zip` und `…_Shape.zip`) | CSV, Shape | Unfallort | nicht geprüft | Jahre 2016–2025 | **Abruf** des Verzeichnisses. Ab welchem Jahr Thüringen enthalten ist, habe ich nicht geprüft. |
| **Straßen, Wege, Haltestellen, Buslinien** | OpenStreetMap | API `https://api.openstreetmap.org/api/0.6/map?bbox=…` (kleine Ausschnitte); in großen Mengen über den Geofabrik-Auszug in GitHub Actions | XML | Objekt | ODbL | laufend | **Abruf:** Zentrum und acht Quartier-Ausschnitte am 12.11.2026 (Buslinien der SNG und Regionallinien als Relationen vorhanden, siehe `stadt.md`) |
| **Straßenfotos** | Panoramax | https://api.panoramax.xyz/ | API | Foto | je Foto (meist CC BY-SA) | laufend | bekannt aus `tools/fotos/katalog.json` (1 484 Fotos im 5-km-Umkreis, 22.10.2026) |

## 5. Denkmale, Politik, Luftbild

| Was | Anbieter | Adresse | Format | Auflösung | Lizenz | Stand | Geprüft |
|---|---|---|---|---|---|---|---|
| **Denkmalliste** | Thüringisches Landesamt für Denkmalpflege und Archäologie | Online-Liste des Landes (laut Wikipedia mit Filter „Stadt Suhl“; Stand dort 8.6.2026) – Adresse nicht gefunden | – | Objekt | – | – | **offen.** Ersatzquellen: (a) die Ebenen „Denkmalschutzrecht“ `geb03_f_4`, `geb03_l_2`, `geb03_p_2` und „Denkmal“ `sie03_f_5` im Landes-WMS sind **im Zentrum leer** (Abruf: kein einziger Bildpunkt, auch im 300-m-Ausschnitt am Markt) – also keine Hilfe; (b) OSM-Marke `heritage` (15 Gebäude im Zentrum-Kreis); (c) Wikipedia-Listen der Kulturdenkmale von Kernstadt und Ortsteilen (von hier nicht abrufbar, über GitHub Actions möglich); (d) Liste im Suhler Amtsblatt 11/2012 (Stand 1.8.2012; Datei nicht gefunden). |
| **Ratsinformation** (Sitzungen, Vorlagen, Beschlüsse) | Stadt Suhl | Ratsinformationssystem: https://suhltrifft.ris-portal.de/ · Meldungen: https://www.suhl.eu/aktuelles/categories/bekanntmachungen | Web-Portal; Meldungen, PDF | Sitzung, Vorlage | – | laufend | Portal **nur gefunden** – es verbietet automatische Abrufe (robots), ich habe es nicht gelesen; ob es eine offene Schnittstelle hat, ist offen. Die Meldungen auf suhl.eu habe ich **gelesen** (Sitzungstermine); einzelne Meldungen und viele PDF waren von hier nicht abrufbar. |
| **Satzungen und Konzepte** der Stadt (Hauptsatzung, Sozialplan, ISEK, Rahmenpläne, Bebauungspläne je Stadtteil mit Übersichtskarte, Mietspiegel 2026) | Stadt Suhl | Übersicht: https://www.suhl.eu/planen-bauen-wohnen · Dateien unter `https://www.suhl.eu/_files/ugd/…pdf` und als 7z-Archive | PDF, 7z | – | – | – | teils **gelesen** (Hauptsatzung, Sozialpläne, Jugendatlas, Übersichtsseite); ISEK, Rahmenpläne und Bebauungspläne von hier **nicht abrufbar** (Weiterleitung auf einen Dateidienst, der gesperrt ist) |
| **Luftbild 20 cm** mit Flugdatum, auch Infrarot | TLBG | WMS https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP – Ebenen `th_dop`, `th_dop20cir`, `th_dop_info` | WMS | 20 cm | CC BY 4.0 „© GDI-Th“ | Flugdatum je Kachel über `th_dop_info` | **Abruf** der Dienstbeschreibung; Auswertung beim Agenten `suhl-bestand` |
| **Luftqualität** | Landesumweltamt | Messstation Suhl nahe dem Markt (in OSM `w514958992`) | – | Station | – | – | **nur gefunden** (OSM); Datenzugang nicht gesucht |

---

## 6. So kommen die Daten an Gebäude und Quartiere

- **Je Gebäude** direkt: LoD2/ETHOS (Höhe, Dachform), Gebäude-Umriss aus dem Kataster-Bild, OSM-Marken, Lage im
  Überschwemmungsgebiet (ja/nein), Starkregen-Tiefe am Gebäude, Lärmpegel an der Fassade, Schutzgebiete.
- **Je 100-m-Zelle** (dann auf Gebäude verteilen): Zensus – Einwohner, Alter, Baujahr, Heizung, Energieträger, Leerstand.
  Für Szenarien ist das die wichtigste noch fehlende Quelle.
- **Je Stadtteil:** Zahlen der Stadt (17 Stadtteile, 2022). **Je Stadt:** Vorausberechnung 2042.
- **Nicht je Gebäude möglich:** Solaranlagen und Speicher kleiner 30 kW (nur je Postleitzahl), Bodenrichtwerte (Abruf verweigert).

## 7. Für den Suhl-Chat

1. **Der Chat-Rechner erreicht mehr, als bisher notiert war:** `sgx.geodatenzentrum.de` (Starkregen), `opendata.dwd.de`,
   `geomis.geoportal-th.de` (Metadaten), `geoinformation.eisenbahn-bundesamt.de`, `www.opengeodata.nrw.de`,
   `www.marktstammdatenregister.de`, `tlubn.thueringen.de`, `statistik.thueringen.de`. **Nicht** erreichbar: `static.destatis.de`
   (502), `www.zensus2022.de` (400), `www.solarrechner-thueringen.de`, `thueringenviewer.thuringia.de`.
2. **Hinweis für die Was-wäre-wenn-Agenten:** Die Ebene `uesg` (Überschwemmungsgebiete) des Landes-WMS ist von diesem Rechner
   abrufbar, ebenso die Starkregen-Karte des Bundes mit Wassertiefen. In `docs/features/zukunft-welt.md` (Zweig
   `feat/zukunft-welt`) steht, die Hochwasserkarte des Landes sei nicht erreichbar gewesen – das gilt für diese beiden Dienste nicht.
3. **Vorschlag nächster Schritt:** ein GitHub-Actions-Lauf holt die Zensus-Gitter (Einwohner, Baujahr, Heizungsart,
   Energieträger, Leerstand), schneidet sie auf das Stadtgebiet und legt eine kleine CSV je Thema ab (unter 5 MB).
4. Die Zahlenangaben zu gefärbten Bildpunkten sind nur ein Ja/Nein-Test, keine Flächenmessung.

## Quellen der Prüfungen

- Landes-WMS „Geoproxy Thüringen“, Dienstbeschreibung mit 600 Ebenen, abgerufen 12.11.2026:
  https://www.geoproxy.geoportal-th.de/geoproxy/services?SERVICE=WMS&REQUEST=GetCapabilities
- Metadaten des Landes (Titel, Datum, Lizenz) zu Überschwemmungsgebieten, Lärmkartierung, Bodenrichtwerten, Luftbild:
  `https://geomis.geoportal-th.de/geonetwork/srv/ger/csw?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&…&ID=<Nummer>`
- Starkregen-WMS des BKG, Dienstbeschreibung: https://sgx.geodatenzentrum.de/wms_starkregen?SERVICE=WMS&REQUEST=GetCapabilities
- Isophonen-WMS des Eisenbahn-Bundesamts: https://geoinformation.eisenbahn-bundesamt.de/wms/isophonen?SERVICE=WMS&REQUEST=GetCapabilities
- DWD-Stationsliste: https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/recent/KL_Tageswerte_Beschreibung_Stationen.txt
- Lärmkartierung 2022, Bekanntmachung: https://eichsfeld-wipperaue.de/fileadmin/uploads/pdf/Bekanntmachungen/Abschluss_der_L%C3%A4rmkartierung_2022_Th%C3%BCringen.pdf
- Hochwasserrisiko-Bewertung Thüringen 2024: https://umwelt-online.de/recht/wasser/laender/th/hochwasserrisiko24.htm
- Zensus 2022: https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Zensus2022/_inhalt.html
- Marktstammdatenregister, Beschreibung: https://open-mastr.readthedocs.io/en/latest/dataset/
- Solarrechner Thüringen, Vortrag 2018: https://www.thega.de/fileadmin/user_upload/Publikationen/Effiziente_Stadt/lilie_solarrechner.pdf
- OSM-API und Nominatim, Abrufe 12.11.2026 (ODbL).
