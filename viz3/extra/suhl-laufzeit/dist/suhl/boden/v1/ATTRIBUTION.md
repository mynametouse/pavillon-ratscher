# Quellen und Lizenzen der Boden-Kacheln von Suhl (Gelände `t/`, Luftbild `i/`)

Bei jeder Weitergabe oder Darstellung bitte nennen:

| Daten | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbilder (DOP20, Dienst WMS TH DOP, Ebene `th_dop`; Bildflug über Suhl am 15.05.2024) | Thüringer Landesamt für Bodenmanagement und Geoinformation (TLBG), Geoportal Thüringen | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.de) | © GDI-Th |
| Geländemodell DGM1 (nur wo `meta.json` → `sources.dgm1_tiles_km` Kacheln nennt, bezogen über easygeodata.de) | TLBG, Geoportal Thüringen | CC BY 4.0 | © GDI-Th |
| Copernicus DEM GLO-30 (Gelände überall sonst) | European Space Agency, Copernicus | Copernicus-Lizenz (frei, mit Namensnennung) | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved |
| Landbedeckung (Wald: Kronenabzug im Copernicus-Gelände) | ESA WorldCover 2021 | CC BY 4.0 | © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium |
| Gebietsgrenzen (Stadt, Kernstadt, Zentrum), Ortsteile, Straßenkorridore, Gebäudezahl je Kachel – daraus die Kachel-Listen | OpenStreetMap | ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/) | © OpenStreetMap-Mitwirkende |

Bearbeitung: Höhen umgerechnet, gemischt und gekachelt (Format WTH1), Luftbilder neu gekachelt (WebP 512 px).
Werkzeug: `tools/suhl/boden/` im Repo https://github.com/mynametouse/pavillon-ratscher (Branch `suhl/boden`), aufgebaut auf `tools/welt/`.
