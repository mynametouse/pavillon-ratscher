# Fotos der Detailzonen – Vorlagen zum Bauen

Echte Fotos aus Ratscher (mit Garten), von der Talsperre/dem Bergsee Ratscher, aus Schleusingen, Kloster Veßra (Klosteranlage, Baumschule
Kammbach), Geisenhöhn, Rappelsdorf und Suhl – als Vorlage für Fassaden, Dächer, Straßen, Bäume und Wahrzeichen der Detailzonen
(`claude/pavillon-welt.md`). **Nicht Teil der App.** Geht ein Foto sichtbar in ein Modell ein (z. B. als Textur), kommt die Namensnennung nach
`viz3/buildlib/credits.py`; bei Lizenzen mit **ND** nur ansehen, nicht als Textur verwenden.

## Inhalt
- `katalog.json` – alle Fotos mit Quelle, Zone, Position (WGS84; bei Commons Kamera- oder Objektposition), **Blickrichtung** (Grad, 0 = Nord),
  Datum, Urheber, Lizenz, Seite, Bild-URL (≈ 2048 px) und Original-URL; `relevant` = Außenansicht (keine Museumsobjekte, Innenräume, Dokumente, Grabsteine).
- `fetch.py` – lädt die Bilder in einen Ordner **außerhalb des Repos** (Standard: nur relevante, ≈ 2048 px; `--zone`, `--source`, `--large`, `--all`;
  `--geojson` schreibt nur eine Karte der Aufnahmepunkte).
- `collect_panoramax.py`, `collect_commons.py`, `collect_openverse.py`, `merge.py` – so ist der Katalog entstanden; zum Aktualisieren erneut ausführen.

## Stand 22.10.2026 (Fotos je Zone, relevant)
| Zone | Panoramax (Straßenfotos mit Blickrichtung) | Wikimedia Commons | Openverse (Flickr) |
|---|---|---|---|
| Ratscher mit Garten | 72 | 17 | 2 |
| Talsperre/Bergsee Ratscher mit Umgebung | 513 | 31 | – |
| Schleusingen (Stadt) | – | 662 | 10 |
| Kloster Veßra mit Klosteranlage und Baumschule Kammbach | 135 | 291 | 92 |
| Geisenhöhn | 42 | 3 | – |
| Rappelsdorf | 25 | 36 | – |
| Suhl | 1484 | 2 | – |
| Umland (bis ~10 km, keine Detailzone) | 260 | 264 | – |
| **zusammen** | 2531 | 1306 | 104 |

Dazu 90 Fotos, die nicht als Außenansicht gelten (Museumsobjekte, Innenräume, Grabsteine …); `fetch.py --all` lädt auch sie.

Zonen nach Position (Mittelpunkt und Radius in `merge.py`, geprüft mit OpenStreetMap): Garten = Ursprung des Modells **50,4991° N, 10,7692° O**,
Ortsmitte Ratscher 50,4971/10,7736, Talsperre 50,4875/10,7913, Schleusingen 50,5098/10,7526 (Bertholdsburg 50,5093/10,7495), Klosteranlage Veßra
50,4915/10,6430, **Baumschule Kammbach 50,4932/10,6417**, Geisenhöhn 50,4948/10,7573, Rappelsdorf 50,4985/10,7208, Suhl 50,6087/10,6926.

## Benutzen
```
python3 -I tools/fotos/fetch.py ~/fotos --zone ratscher,talsperre        # Straßenfotos und Commons, wenige Minuten
python3 -I tools/fotos/fetch.py ~/fotos --zone kloster-vessra --large    # Originalgröße
python3 -I tools/fotos/fetch.py ~/fotos --geojson                        # fotos.geojson, z. B. auf geojson.io ansehen
```
Ein Foto einem Ort im Modell zuordnen: lat/lon → UTM 32N (ETRS89) → Modellkoordinaten über `xf` in `viz3/manifests.json`
(`geoman.xf`: Drehung/Maßstab `a`, `b`, Verschiebung `ex`, `ey`). Panoramax-Fotos haben Position und Blickrichtung – damit lässt sich die Kamera im
Modell an dieselbe Stelle setzen und das Foto daneben vergleichen.

## Quellen und Lizenzen
- **Panoramax** (https://panoramax.xyz, offene Straßenfotos, Gesichter und Kennzeichen verpixelt): CC BY-SA 4.0. Fast alles aus zwei Fahrten von
  „R_A“ am 3.10.2025 (Kamera Garmin VIRB hinter der Frontscheibe, 100° Bildwinkel, ein Bild alle 10–22 m, zusammen knapp 20 km Straße) – zeigt die
  Straßen so, wie man sie fährt; Suhl von „sixsixfive“
  (12/2025). Namensnennung: „Foto: R_A, CC BY-SA 4.0, via Panoramax“.
- **Wikimedia Commons**: Lizenz je Foto (CC0, CC BY, CC BY-SA, gemeinfrei); viel aus „Wiki Loves Monuments“ 2016–2025, Luftbilder, Fotos von 1986/1997.
- **Openverse** (https://openverse.org, v. a. Flickr): Lizenz je Foto, meist **NC** (nur nichtkommerziell) und teils **ND** (keine Bearbeitung).
- Weitere Quellen (mit Konto/Schlüssel, nur als Link, eigene Fotos): Projektdokument `claude/pavillon-fotos.md`.

## Sicherung
Die Bilder bleiben bei den Quellen abrufbar (feste Links). Eine Kopie gehört ins private Repo `pavillon-ratscher-assets` – als normale Git-Dateien,
denn Releases dürfen Chat-Sitzungen nicht anlegen (GitHub-API: „not permitted for this session type“).
