# Quellen und Lizenzen der Welt-Testkacheln

Diese Kacheln (Gelände, Luftbild, Straßen, Gebäude) sind aus offenen Daten erzeugt. Bei jeder Weitergabe oder Darstellung bitte nennen:

| Daten | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbilder (DOP20, Dienst WMS TH DOP) | Thüringer Landesamt für Bodenmanagement und Geoinformation (TLBG), Geoportal Thüringen | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.de) | © GDI-Th |
| Geländemodell DGM1 (sofern im Lauf verfügbar, siehe meta.json `sources.terrain`) | TLBG, Geoportal Thüringen | CC BY 4.0 | © GDI-Th |
| Copernicus DEM GLO-30 (Umgebung, Ersatz wenn DGM1 fehlt) | European Space Agency, Copernicus | Copernicus-Lizenz (frei, mit Namensnennung) | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved |
| Straßen, Gebäudegrundrisse, Landnutzung, Gewässer, Namen | OpenStreetMap | ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/) | © OpenStreetMap-Mitwirkende |
| Landbedeckung (Bäume, Kronenabzug im Ersatzgelände) | ESA WorldCover 2021 | CC BY 4.0 | © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium |
| Geländemodell DGM1 Bayern (nur `diag/bayern/`: Test der Straßenmethode auf 1-m-Daten) | Bayerische Vermessungsverwaltung | CC BY 4.0 | Datenquelle: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de |

Bearbeitung: Höhen umgerechnet und gekachelt, Straßen als eigene Bänder mit geglättetem Längsprofil (Gelände an Straßen
angeschnitten/aufgefüllt), Gebäude aus Grundrissen hochgezogen (Höhen geschätzt), Luftbilder neu gekachelt (WebP) und in den
Farben angeglichen (je Befliegungstag eine Tonkurve, Bezug ist der Bildflug am Garten; Tage und Flächen in meta.json `sources.imagery_balance`).
Werkzeug: `tools/welt/` im Repo https://github.com/mynametouse/pavillon-ratscher (Branch `welt/woche1`).
Die aus OpenStreetMap abgeleiteten Dateien (`roads.json`, `routes.json`, `r/`, `b/`) stehen als abgeleitete Datenbank unter der ODbL 1.0.
