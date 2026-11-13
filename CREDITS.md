# Bilderbögen von suhl-gruen (Wegwerf-Zweig `ref/suhl-gruen`, wird nie eingemischt)

Alle Bögen zeigen Ausschnitte amtlicher Geodaten des Landes Thüringen mit Zeichnungen des Agenten `suhl-gruen` darüber.

| Inhalt | Urheber, Lizenz | Quelle |
|---|---|---|
| Luftbild DOP20, Farbe (`th_dop`) und Infrarot (`th_dop20cir`), Bildflug 15.05.2024 | © GDI-Th (Thüringer Landesamt für Bodenmanagement und Geoinformation), CC BY 4.0 (Datenlizenz Deutschland – Namensnennung – 2.0) | WMS https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP |
| Höhenmodell nDOM1 (Oberfläche minus Gelände, 1 m, Laser 2020–2025) – die farbigen Höhenbilder | © GDI-Th, CC BY 4.0, bezogen über easygeodata.de | https://easygeodata.de (Schnittstelle, nur aus GitHub Actions) |
| Kartierte Bäume (magenta Kreuze), Gebäude-Umrisse, Fahrbahnen, Waldflächen | © OpenStreetMap-Mitwirkende, ODbL 1.0 | https://www.openstreetmap.org |
| Gebäude-Grundrisse im „Modell von oben“ | ETHOS.BUILDA, Forschungszentrum Jülich, ODbL 1.0 | Zenodo 11845992 |
| Kronen, Arten, Höhen, Waldklassen | Agent `suhl-gruen`, Zweig `suhl/gruen` | `tools/suhl/gruen/` |

Ordner (Stand 13.11.2026, Probesatz Zentrum, Läufe 43348531474 und 43340725672):

- `v0_gegen_v1/` – derselbe Ort zweimal: links die Bäume nur aus dem Luftbild (v0), rechts mit dem Höhenmodell (v1; hellblau =
  Höhe gemessen, orange = geschätzt). Darunter das Fenster Steinweg / Markt / Herrenteich (E 619 500–619 900, N 5 607 500–5 607 900)
  in vier Vierteln zu 200 m und als Ganzes; dazu Markt, Plattenbau-Gebiet Aue und Waldrand am Domberg. Zahlen: `v0v1.json`.
- `hoehenmodell/` – links das Luftbild mit den Kronen, rechts das Höhenmodell in Farben (0 m dunkelblau, 5 m grün, 15 m gelb,
  30 m rot) mit denselben Kronen; `…_mitte` ist die Mitte in 20 cm. Hier sieht man: der Laser flog ohne Laub.
- `vergleich/` – drei Orte: Luftbild neben dem Modell von oben, mit den Zahlen aus Plan 5.2.
- `zentrum_v1/` – die 11 Kacheln des Probesatzes v1 (je 400 m), Luftbild mit Kronen nach Art.
- `wald/` – Infrarot-Luftbild 1 m neben den Waldklassen der 20-m-Zellen.

Die Bögen sind höchstens 1024 Bildpunkte breit. Es sind keine Menschen oder Kennzeichen erkennbar (20 cm von oben).
