# Suhl – Datenkarte: was es über die Stadt als Daten gibt, wie gut, und wo die Lücken sind

Stand: 13.11.2026, 0:50 Uhr. Hilfs-Agent `suhl-bestand`, Stufe 1 des Suhl-Plans (Auftrag `docs/plans/auftraege/suhl-bestand.md`,
gemeinsamer Teil `docs/plans/auftraege/suhl-gemeinsam.md`). Zweig `suhl/bestand`, Bilder auf `ref/suhl-bestand`.
Die Anleitung für die Landesdaten steht in `docs/features/suhl-landesdaten.md`. Alle Zahlen maschinenlesbar in
`tools/suhl/out/bestand/bestand.json`; hinter jeder Tabelle steht die Datei, aus der sie stammt.

## Kurzfassung

- **Grundrisse gibt es reichlich und doppelt:** 22.180 Gebäude in OpenStreetMap, 30.929 in ETHOS.BUILDA (aus dem LoD2 des Landes
  abgeleitet, jedes mit Höhe). Dazu – neu gefunden – die Gebäude des Katasters mit Nutzung und Geschosszahl aus einem offenen
  Dienst des Landes.
- **Was den Gebäuden fehlt, sind Dach und Gesicht:** Nur 11,9 % der OSM-Gebäude haben eine Dachform, 1,7 % eine Angabe zur
  Fassade. Echte Dachformen stecken im LoD2 des Landes – das gibt es nur hinter dem CAPTCHA.
- **Gelände und Oberfläche in 1 m fehlen.** Kein offener Dienst liefert sie als Zahlen. Das ist die Aufgabe für Falko
  (`suhl-landesdaten.md`): 20 Dateien für das Zentrum, 526 für alles.
- **Das Luftbild ist einheitlich:** Die ganze Stadt wurde am 15.05.2024 beflogen, es gibt keine Naht im Stadtgebiet.
- **Der Straßenraum ist in OSM lückenhaft:** Fahrbahnen ja (164,7 km in der Kernstadt, fast alle mit Namen), aber Gehwege nur für
  48 % der Länge, Spuren für 25 %, nur 907 Einzelbäume und 723 Laternen. Hier müssen Luftbild und Straßenfotos helfen.
- **Der Nahverkehr ist gut erfasst:** 35 Linien, 621 Fahrten an einem Werktag mit Halt in Suhl; Linie 203 fährt nach Ratscher.

## 1 Gebiete

Datei: `tools/suhl/out/bestand/gebiete.geojson` (WGS84; jedes Gebiet trägt sein Rechteck in UTM 32N in km). Skript:
`tools/suhl/bestand/gebiete.py`. Quelle: OpenStreetMap über die OSM-API, 12./13.11.2026.

| Gebiet | Fläche | Rechteck UTM 32N in km (Ost von–bis, Nord von–bis) | OSM-Gebäude | Regel |
|---|---:|---|---:|---|
| `stadt` | 141,81 km² | 609,823–630,374 · 5602,294–5616,762 | 22.180 | Gemeindegrenze, OSM-Relation 62450 (kreisfreie Stadt, AGS 16054000) |
| `kernstadt` | 22,04 km² | 614,423–624,124 · 5604,548–5611,782 | 16.168 | Gebäude ab 40 m², Lücken bis etwa 180 m zählen als zusammenhängend; der Teil mit dem Stadtmittelpunkt; Rand 60 m um die äußersten Gebäude |
| `zentrum` | 0,682 km² | 618,966–620,190 · 5607,131–5608,314 | 595 | konvexe Hülle der Landmarken plus 120 m |

- Die Kernstadt folgt der üblichen 200-m-Regel für zusammenhängende Bebauung. Sie reicht von **Mäbendorf** im Westen bis
  **Goldlauter und Heidersbach** im Nordosten und schließt Heinrichs, Neundorf, Aue, Linsenhof, Lautenbergsiedlung, Himmelreich,
  Lauter und Suhl-Nord ein. Mit einer strengeren Regel (Lücken bis 100 m) wären es 16,5 km² ohne Goldlauter und Heidersbach.
- Im Zentrum liegen: Marktplatz, Steinweg, Rathaus am Markt, Hauptkirche St. Marien, Kreuzkirche, Waffenmuseum im Malzhaus,
  Congress Centrum Suhl, Platz der Deutschen Einheit, Bahnhof und das Neue Rathaus. Dazu 54 benannte Straßen; die Liste steht
  in der Datei.
- **Ortsteile** als Punkte (19): in der Kernstadt Aue 1, Aue 2, Heinrichs, Lauter, Linsenhof, Neundorf, Suhl Nord, Himmelreich,
  Lautenbergsiedlung, Goldlauter, Heidersbach, Mäbendorf; außerhalb Albrechts (3,9 km vom Mittelpunkt), Dietzhausen (7,1 km),
  Wichtshausen (8,5 km), Vesser (7,1 km), Schmiedefeld am Rennsteig (8,6 km), Gehlberg (10,4 km), Schmücke (7,7 km).
- **Grenzen von Ortsteilen** sind in OSM nur für Gehlberg (20,62 km²) und Schmiedefeld am Rennsteig (18,26 km²) erfasst.

## 2 Gebäude

Dateien: `osm_bestand.json` (Skript `osm_bestand.py`), `ethos.json` (Skripte `ethos_filter.py`, `ethos.py`).

| | Stadt | Kernstadt | Zentrum |
|---|---:|---:|---:|
| **OpenStreetMap** `building=*` | 22.180 | 16.168 | 595 |
| davon ab 40 m² Grundfläche | 14.079 | 10.386 | 526 |
| Grundfläche zusammen | 257,5 ha | 197,1 ha | 16,9 ha |
| mit Geschosszahl | 15,3 % | 20,2 % | 29,7 % |
| mit Höhe | 0,9 % | 1,2 % | 4,4 % |
| mit Dachform | 11,9 % | 15,6 % | 43,4 % |
| mit Dachfarbe oder -material | 11,6 % | 15,6 % | 40,8 % |
| mit Fassadenfarbe oder -material | 1,7 % | 2,3 % | 8,7 % |
| mit Baujahr | 0,1 % | 0,1 % | 1,8 % |
| mit Namen | 0,8 % | 0,7 % | 5,9 % |
| mit Hausnummer am Gebäude | 6,1 % | 6,0 % | 10,4 % |
| Adresspunkte daneben (eigene Knoten) | 8.421 | 6.427 | 558 |
| Gebäudeart genauer als „yes“ | 22,9 % | 28,6 % | 43,9 % |
| Gebäudeteile (`building:part`) | 625 | 587 | 190 |
| **ETHOS.BUILDA** | 30.929 | 23.282 | 1.012 |
| davon ab 40 m² | 14.606 | 10.754 | 596 |
| Grundfläche zusammen | 246,3 ha | 189,2 ha | 15,8 ha |
| Höhe: Mitte (Median) / 90 % darunter / höchste | 4,9 / 11,0 / 68,0 m | 4,7 / 11,2 / 68,0 m | 9,6 / 16,5 / 56,6 m |

- **ETHOS.BUILDA** (Forschungszentrum Jülich, Zenodo 11845992, Datei `DEG.csv`, 882 MB, ODbL): vier Spalten – Kennung, Quelle,
  Grundriss, Höhe. In Suhl stammen alle 30.929 Grundrisse und Höhen aus dem LoD2 des Landes (`lod2_de_th`). Die Kennungen sind
  die des Katasters (`DETHL57P…`) – dieselben, die der Dienst „ALKIS vereinfacht“ liefert. Darüber lassen sich Höhe, Nutzung und
  Geschosszahl später zusammenführen.
- ETHOS zählt mehr Gebäude als OSM, weil dort auch Anbauten, Garagen und Lauben einzeln stehen. Höhenklassen in der Stadt:
  unter 3 m 6.254 · 3–6 m 12.039 · 6–10 m 7.820 · 10–15 m 4.102 · 15–25 m 655 · 25–40 m 39 · ab 40 m 20.
- **Wie gut passen beide zusammen** (nach Überdeckung der Grundrisse): 84,1 % der OSM-Gebäude der Stadt sind zu mindestens der
  Hälfte von einem ETHOS-Grundriss bedeckt, bei den Gebäuden ab 40 m² sind es 95,4 %. Umgekehrt sind 75,5 % der ETHOS-Gebäude
  zur Hälfte von OSM bedeckt, ab 40 m² 92,3 %. 2.918 OSM-Gebäude haben kein Gegenstück in ETHOS, 5.249 ETHOS-Gebäude keines in
  OSM – auf beiden Seiten vor allem Kleines. Im Zentrum: 92,6 % und 75,6 % (ab 40 m²: 94,9 % und 94,3 %).
- **Die Silhouette:** ETHOS nennt 59 Körper ab 25 m, davon 20 mit mindestens 100 m² Grundfläche (die übrigen sind Dachaufbauten,
  Schornsteine oder Teile eines Hochhauses). Die 20: ein Hotel-Hochhaus neben dem Congress Centrum mit 56,6 m, acht Wohnhochhäuser mit
  40 bis 46 m (sieben davon im Zentrum), fünf Wohnscheiben mit 35 m und vier mit 30 bis 31 m westlich des Bahnhofs, das Haus der
  Geschichte mit 25,8 m und ein Krankenhausgebäude mit 25,2 m (Art und Namen aus OSM). Liste mit Lage: `ethos.json` → `hohe_gebaeude_ab_25_m`. 12 der 59 liegen
  im Zentrum, 47 in der Kernstadt.

## 3 Straßenraum in OpenStreetMap (Kernstadt)

Datei: `osm_bestand.json` → `strassenraum` (auch für Stadt und Zentrum).

| Wege nach Art | km | | Fahrstraßen (164,7 km) mit … | Anteil der Länge |
|---|---:|---|---|---:|
| Zufahrten, Höfe (`service`) | 147,0 | | Namen | 98,1 % |
| Wohnstraßen (`residential`) | 118,5 | | Belag | 84,1 % |
| Feld- und Waldwege (`track`) | 79,1 | | Gehweg-Angabe | 48,2 % |
| Fußwege (`footway`) | 67,2 | | Radweg-Angabe | 47,0 % |
| Pfade (`path`) | 51,5 | | Tempolimit | 44,9 % |
| Landesstraßen (`secondary`) | 19,2 | | Beleuchtung | 37,5 % |
| `tertiary` | 10,9 | | Spurenzahl | 25,2 % |
| `unclassified` | 10,2 | | Zustand (`smoothness`) | 24,8 % |
| verkehrsberuhigt | 4,25 | | Parken am Rand | 6,4 % |
| Treppen (206 Stück) | 2,0 | | Breite | 3,4 % |
| Autobahn | 1,6 | | Steigung | 2,3 % |
| Fußgängerzone | 0,95 | | | |
| **zusammen** | **513,2** | | | |

„Fahrstraßen“ sind Autobahn bis verkehrsberuhigte Straße. Gehwege als eigene Linie gibt es nur für 4,5 km.

| Dinge im Straßenraum (Kernstadt) | Anzahl |
|---|---:|
| Ampeln (Knoten) | 94 |
| Querungen | 181 – davon 66 mit Ampel, 59 ohne Angabe der Art, 86 mit Blindenleitstreifen |
| Straßenlaternen | 723 |
| Bushaltestellen (`bus_stop`) / Bussteige / Haltepunkte der Busse | 152 / 149 Knoten und 13 Flächen / 132 |
| Einzelbäume | 907, davon 754 mit Art oder Laub/Nadel |
| Baumreihen | 15 (1,3 km) |
| Stützmauern / Mauern | 88 (3,8 km) / 22 (1,7 km) |
| Zäune / Hecken / Leitplanken | 185 (27,4 km) / 199 (4,9 km) / 32 (4,7 km) |
| Brücken an Straßen und Wegen / an der Bahn | 101 Abschnitte (2,2 km) / 15 (0,4 km) |
| Tunnel und Durchgänge an Straßen und Wegen / an der Bahn | 55 (1,4 km) / 3 (0,06 km) |
| Bahn: Gleis in Betrieb / stillgelegt / abgebaut | 9,3 km / 3,3 km / 7,8 km |
| Bahnhöfe und Haltepunkte / Bahnübergänge | 2 (Suhl, Suhl-Heinrichs) / 5 |
| Gewässer: Fluss / Bach / Graben | 4,6 km / 23,3 km / 1,4 km – Lauter 6,7 km, Hasel 6,1 km |
| davon verrohrt oder überdeckt | 4,0 km |
| Parkplätze | 399 Flächen (31,6 ha) und 31 Punkte; 28 mit Stellplatzzahl |
| Spielplätze / Sportfelder / Parks / Kleingartenanlagen | 50 / 44 / 9 / 72 |
| Hydranten / Bänke / Papierkörbe / Poller / Schranken | 780 / 129 / 31 / 41 / 34 |
| Geschäfte mit Namen | 250 – Friseur 24, Kleidung 24, Autowerkstatt 22, Autohaus 20, Supermarkt 17, Bäcker 15 |
| Einrichtungen mit Namen | 273 – Restaurant 34, Arzt 23, Imbiss 23, Schule 14, Kita 13, Kirche 10 |
| Tourismus mit Namen | 85 – Infotafeln 44, Pensionen 13, Kunstwerke 9, Hotels 6, Museen 2 |

Zum Vergleich das **Zentrum**: 34,8 km Wege, davon 12,9 km Fahrstraßen (Gehweg-Angabe 71,6 %, Beleuchtung 87,0 %, Spuren
35,3 %); 26 Ampeln, 26 Querungen, 91 Laternen, 18 Bushaltestellen, 263 Einzelbäume, 58 Parkplatzflächen, 114 Geschäfte und 94
Einrichtungen mit Namen. Die **ganze Stadt**: 1.559,1 km Wege, davon 288,4 km Fahrstraßen; 26,5 km Gleis in Betrieb; Bahnhöfe
und Haltepunkte: Suhl, Suhl-Heinrichs, Dietzhausen, Gehlberg, Schmiedefeld, Rennsteig.

**Was das heißt:** Fahrbahnachsen, Namen, Brücken, Treppen, Gewässer, Haltestellen und Geschäfte kann die Stadt aus OSM bekommen.
Fahrbahnbreite, Bordsteine, Markierungen, Gehwege, die meisten Bäume und Laternen stehen nicht drin. Bäume kommen besser aus der
Oberfläche (DOM1 minus DGM1) und dem Luftbild, der Rest aus Straßenfotos.

## 4 Luftbild

Datei: `luftbild.json` (Skript `luftbild.py`; Dienst des Landes, Ebene `th_dop_info`, eine Abfrage je Kachelmitte).

- **Alle 193 Kacheln der Stadt: Bildflug am 15.05.2024**, veröffentlicht 2025-02. Keine Naht im Stadtgebiet – ein Farbausgleich
  zwischen Flugtagen ist in Suhl nicht nötig.
- Auf den Straßen vom Garten nach Suhl liegen 27 Kacheln im selben Flug und 8 Kacheln (beim Garten) im Flug vom 07.04.2024.
- Der Dienst nennt je Kachel den Bezug „bDOM“. Das spricht dafür, dass das Bild auf ein Oberflächenmodell aus Luftbildern
  entzerrt ist; Hauswände kippen dann weniger. Geprüft habe ich das am Bild nicht.
- Weitere Ebenen desselben Dienstes: Infrarot 20 cm (`th_dop20cir`), Grau 20 cm (`th_dop20pan`), dazu alle drei in 2 m. Höchstens
  5000 × 5000 Punkte je Abruf. Eine Zeitachse oder alte Jahrgänge hat der Dienst nicht.
- Alte Jahrgänge: Das Portal easygeodata.de führt für Suhl Links zu den Kacheln des Landes für 16 Jahrgänge von 2008 bis 2025
  (ab 2019 jeweils alle 193 Kacheln) und nennt als neuesten Flug den 27./28.04.2025. Der Dienst des Landes zeigt also noch nicht
  das neueste Bild. Die Links selbst konnte ich nicht prüfen (siehe `suhl-landesdaten.md`, Weg A).

## 5 Dienste: was automatisch geht

Datei: `landesdienste.json` (Skript `landesdienste.py`, 51 Proben, 13.11.2026 um 0:35 Uhr vom Chat-Rechner). ✔ = mit einer echten
Abfrage für eine kleine Fläche im Zentrum geprüft.

| Dienst | Was kommt | Lizenz | Urteil |
|---|---|---|---|
| ✔ WFS „ALKIS vereinfacht“ des Landes, `https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wfs`, Objektart `ave:GebaeudeBauwerk` | Gebäudegrundrisse des Katasters als Flächen (GML, UTM 32N) mit Kennung, Nutzung in Worten, Geschosszahl, Stand. Im 200-m-Quadrat am Markt: 97 Gebäude in 0,8 s, 89 davon mit Geschosszahl; Stände von 2018 bis 2026 | CC BY 4.0, „© GDI-Th“ | **bester Fund** – aus GitHub Actions nutzbar; Flurstücke desselben Dienstes rühren wir nicht an |
| ✔ WMS des Landes, Ebene `alkis_geb` (Auskunft an einem Punkt) | Geschosszahl, Gebäudefunktion als Schlüssel, Grundfläche, Datum | CC BY 4.0 | geht, aber nur ein Gebäude je Abruf; der WFS ist besser |
| ✔ WFS des Landes, `tlvermgeo:GAZHKO_HNR` | Hausnummern als Punkte mit Straßenschlüssel | CC BY 4.0 | nutzbar für Adressen |
| ✔ WMS Luftbild `…/geoproxy/services/DOP` | Farbe, Infrarot, Grau in 20 cm und 2 m; Flugtag je Kachel | CC BY 4.0 | nutzbar, läuft schon in der Welt |
| ✔ WMS Gelände `…/geoproxy/services/DGM` (Ebenen `DGM2`, `DGM5`) und Ebene `EL.GridCoverage` | nur ein Schummerungsbild: auch als TIFF kommen drei Farbkanäle, keine Höhen | CC BY 4.0 | **keine Höhendaten** |
| ✔ WCS am Dienst des Landes | Fehler „No service for service type 'WCS'“ | – | gibt es nicht |
| ✔ alle 514 Ebenen des Landes-WMS | keine Ebene für Oberfläche (DOM), LoD2, 3D-Netz, Schrägbilder oder ein eigenes „True-Orthofoto“ | – | gibt es nicht |
| ✔ Katalog GeoMIS.Th (CSW, Volltextsuche) | keine Treffer für LoD2, 3D-Gebäude, WCS, bDOM, Schrägluftbild, TrueDOP, 3D-Mesh, historische Orthofotos; ein Datensatz „Hausumringe“ (Download nur im Portal); gefunden wurde so der WFS „ALKIS vereinfacht“ | – | stützt die Lücke; die Volltextsuche ist aber grob und schwankt (eine frühere Probe fand auch einen Datensatz „Digitales Oberflächenmodell“, die letzte nicht) |
| ✔ basemap.de Vektorkacheln, `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/{z}/{x}/{y}.pbf` | Ebene `Gebaeudeflaeche` mit Höhe in ganzen Metern, Klasse und Lage, bis Zoom 15; in der Kachel des Zentrums 1.100 Gebäudeflächen (Höhen 3–18 m) und 523 Adressen | Bedingungen von basemap.de (Namensnennung GeoBasis-DE); Wortlaut vor der Nutzung prüfen | brauchbar als Ersatz, aber gröber als ETHOS; Dachformen fehlen |
| ✔ basemap.de Schummerung (WMS) | Reliefbilder aus dem 5-m-Gelände des Bundes, Stand 2021 | wie oben | keine Höhendaten |
| ✔ ETHOS.BUILDA (Zenodo) | Grundriss und Höhe für jedes Gebäude | ODbL | nutzbar; in 3 Minuten gefiltert, auch vom Chat-Rechner |
| alte Download-Adressen des Landes | Wartungsseite | – | nicht nutzbar (`suhl-landesdaten.md`) |
| neues Portal des Landes | CAPTCHA | – | nur von Hand |
| easygeodata.de | Kopien von DGM1, DOM1, nDOM1 und Hausumringe; kein LoD2 | „© GDI-Th“ | nur mit Schlüssel aus einem kostenlosen Konto automatisch – Falkos Entscheidung |
| Katalog der GDI-DE | Verbindung vom Chat-Rechner abgewiesen | – | nicht geprüft |

Nebenbei gefunden: Im Katalog des Landes stehen offene Datensätze **der Stadt Suhl** – Bebauungspläne und Satzungen,
Schulstandorte, Kindertagesstätten, Spielplätze, Sportanlagen, Bäder, Feuerwehren – über
`https://www.geoproxy.geoportal-th.de/geoproxy/services/kommunal/komm_wfs`. Nicht abgefragt; ein Hinweis für `suhl-wissen`
(Planungen, Fachdaten) und für die Szenarien.

## 6 Nahverkehr

Datei: `oepnv.json` (Skript `oepnv.py`; freier Deutschland-Fahrplan von gtfs.de, Daten von DELFI e.V., CC BY 4.0; geladen am
13.11.2026). Gezählt für die Woche ab Montag, 16.11.2026: Dienstag als Werktag, dazu Samstag und Sonntag.

- **Haltestellen im Stadtgebiet:** 331 Einträge mit 211 verschiedenen Namen; 208 Einträge (132 Namen) werden im Fahrplan
  angefahren. 151 Namen liegen in der Kernstadt, 15 im Zentrum. Meiste Halte: Am Bahndamm/SNG, Suhl Zentrum,
  Friedrich-König-Straße, Suhl Bahnhof, Neues Rathaus.
- **Fahrten mit Halt in Suhl:** 621 am Werktag, 234 am Samstag, 172 am Sonntag.
- **35 Linien** (36 Einträge im Fahrplan, weil die RB43 auch als Bus geführt wird): Stadtbus der Städtischen
  Nahverkehrsgesellschaft Suhl/Zella-Mehlis (A/G, A1, A2, A3, B, C1, C12, C2, D1, D2, G, H, K, R und mit wenigen Fahrten S21, S30,
  S31, S33, S40); Werrabus 200, 201, 202, 203; Meininger Busbetriebs GmbH 400, 419, 447,
  448, 449; Omnibusverkehr GmbH Ilmenau 300, 307.
- **Bahn:** RE7 (DB Regio, 16 Fahrten am Werktag), RB44 (Süd-Thüringen-Bahn, 21), RE50 (12), RB43 (4), RB46 (nur am Wochenende, 8).
- **Nach Schleusingen:** Werrabus 200, 201, 202 und 203. **Nach Ratscher: nur die 203**, 16 Fahrten am Werktag, am Wochenende
  keine.

## 7 Wie es gemacht ist

| Skript in `tools/suhl/bestand/` | Tut | Ergebnis in `tools/suhl/out/bestand/` |
|---|---|---|
| `osm_api.py` | OSM für das ganze Stadtgebiet: 39 Abrufe der OSM-API in Kästen, mit Pause; Rohdaten bleiben außerhalb von git | – |
| `gebiete.py` | Gebiete, Ortsteile, Landmarken | `gebiete.geojson` |
| `kacheln.py` | Kachelliste und Karten | `kacheln.csv`, `kacheln.json`, Bilder |
| `landesdienste.py` | Proben der Download-Adressen und Dienste | `landesdienste.json` |
| `osm_bestand.py` | Gebäude und Straßenraum aus OSM | `osm_bestand.json` |
| `ethos_filter.py`, `ethos.py` | ETHOS im Strom filtern; Zahlen und Abgleich | `ethos.json` |
| `luftbild.py` | Flugtag je Kachel | `luftbild.json` |
| `oepnv.py` | Fahrplan | `oepnv.json` |
| `bestand.py` | trägt alles zusammen | `bestand.json` |
| `bilder.sh` | legt die Karten als einen Commit auf `ref/suhl-bestand` | – |
| `sblib.py` | gemeinsame Helfer | – |

- **Woher die Zahlen kommen:** Alles in diesem Dokument ist am 12./13.11.2026 **vom Chat-Rechner** gerechnet: OSM über die
  OSM-API (heutiger Stand), ETHOS direkt von Zenodo, Dienste des Landes direkt.
- **GitHub Actions** (`.github/workflows/suhl-bestand.yml`) rechnet dasselbe noch einmal als Gegenprobe: OSM aus dem
  Geofabrik-Auszug Thüringen, ETHOS, die Proben der Dienste von GitHub aus. Ergebnisse in `tools/suhl/out/bestand/actions/`;
  `bestand.json` → `aus_github_actions` zeigt, was da ist. Der Lauf startet, wenn sich die Workflow-Datei oder
  `tools/suhl/bestand/lauf.txt` ändert.
- **Ergebnis der Gegenprobe** (Lauf 43330687251, 13.11.2026, 0:39–0:42 Uhr, vier Minuten): OSM aus dem Geofabrik-Auszug ergibt
  dieselben Zahlen wie die OSM-API (22.180 / 16.168 / 595 Gebäude; 1.559,1 / 513,2 / 34,8 km Wege), ETHOS ebenso (30.929 /
  23.282 / 1.012). Die Download-Adressen des Landes antworten auch von GitHub aus mit Wartungsseite und CAPTCHA. Der WFS „ALKIS
  vereinfacht“ und die Vektorkacheln von basemap.de antworten von GitHub aus wie vom Chat-Rechner.
- In `kacheln.csv` zählt `gebaeude_osm` alle OSM-Gebäude in der Kachel, auch die jenseits der Stadtgrenze (Zella-Mehlis). Für
  die P4-Kacheln außerhalb des geladenen Ausschnitts ist die Spalte leer.

## 8 Was fehlt oder unsicher ist

- **DGM1, DOM1, LoD2:** nicht automatisch erreichbar (siehe `suhl-landesdaten.md`).
- **easygeodata.de:** Ich habe nur die öffentlichen Seiten gelesen. Was die Links dort liefern, in welchem Format genau und mit
  welchen Grenzen, ist nicht geprüft. Die Beschreibung der Schnittstelle (`https://easygeodata.de/api/docs`) wurde nicht
  abgerufen: Die Seite schließt Programme von `/api/` aus.
- **Portal des Landes hinter dem CAPTCHA:** Aufbau unbekannt; ob es Pakete je Gemeinde gibt, weiß ich nicht.
- **Zeitraum der Höhendaten je Kachel** (2020–2025 oder 2014–2019): unbekannt, die Übersicht des Landes liegt auf dem
  abgeschalteten Server.
- **Neuester Bildflug:** Das Land zeigt im Dienst den Flug vom 15.05.2024; laut easygeodata.de gibt es Kacheln vom 27./28.04.2025.
- **Lizenz der basemap.de-Vektorkacheln:** nicht im Wortlaut geprüft.
- **Kernstadt:** Die Regel ist eine von mehreren möglichen. Wer Goldlauter, Heidersbach und Mäbendorf nicht zur Kernstadt zählen
  will, nimmt die strengere Regel – dann sinkt P2 entsprechend.
- **Zentrum:** eine einfache Hülle um die Landmarken, nicht an Straßen ausgerichtet. Für den Bau des Pilotquartiers sollte die
  Grenze an Straßenachsen gelegt werden.
- **ETHOS und OSM** sind verschieden alt (ETHOS: Stand des LoD2 von 2024 oder früher, OSM: heute). Neubauten und Abrisse seither
  sind nicht einzeln geprüft.
- **Haltestellen:** Bahnhöfe im Fahrplan sind nicht eigens ausgewertet; die sechs Bahnhöfe oben stammen aus OSM.

## Für den Suhl-Chat

1. **Stufe 2 kann mit Gebäuden sofort anfangen:** Grundriss und Höhe aus ETHOS, Nutzung und Geschosszahl aus dem WFS „ALKIS
   vereinfacht“ (gleiche Kennungen), Namen und Geschäfte aus OSM. Der WFS ist der Fund dieser Runde – bitte als Quelle in
   `tools/welt/QUELLEN.md` aufnehmen (ich ändere keine vorhandene Datei). Für die ganze Stadt reichen etwa 40 Abrufe in Kästen.
2. **Dachformen** gibt es nur mit LoD2: 4 Kacheln für das Zentrum, 20 für die Kernstadt (79,8 % aller Gebäude der Stadt).
3. **Gelände:** Ohne DGM1 bleibt nur Copernicus (30 m) – für eine Stadt im Tal mit Treppen und Stützmauern zu grob. Das ist der
   stärkste Grund, P1 schnell von Hand zu holen.
4. **Bäume, Laternen, Gehwege, Markierungen** stehen kaum in OSM. Plan: Bäume aus DOM1 minus DGM1 und Luftbild (Infrarot ist als
   Ebene da), das Übrige aus den Straßenfotos von `suhl-fotos`.
5. **`.gitignore`:** Die Regel `out/` trifft `tools/suhl/out/`. Entweder mit `git add -f` leben (so mache ich es) oder eine
   Ausnahme `!tools/suhl/out/` eintragen.
6. **Workflow:** `suhl-bestand.yml` reagiert nur auf die Workflow-Datei und `lauf.txt`, nicht auf jedes Skript (Abweichung vom
   Auftrag, mit Absicht: so verdrängt ein Skript-Commit keinen wartenden Lauf). Der Lauf nimmt beim Start den neuesten Stand des
   Zweigs.
7. **Fragen an Falko:** siehe `suhl-landesdaten.md`, Abschnitt „Für den Suhl-Chat“. Dazu: Soll das Zentrum bis zum Neuen Rathaus
   reichen (so ist es jetzt, 0,68 km²) oder am Markt enden (0,53 km²)? Zählen Goldlauter, Heidersbach und Mäbendorf zur Kernstadt?
8. **Für `suhl-wissen`:** offene Datensätze der Stadt Suhl im Katalog des Landes (Abschnitt 5, letzter Absatz).
