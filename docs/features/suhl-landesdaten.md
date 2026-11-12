# Suhl – Landesdaten: was fehlt, wie viel davon, und wie du es holst

Stand: 13.11.2026, 0:40 Uhr. Geschrieben vom Hilfs-Agenten `suhl-bestand` (Stufe 1 des Suhl-Plans, Auftrag
`docs/plans/auftraege/suhl-bestand.md`). Alle Zahlen stammen aus Dateien in `tools/suhl/out/bestand/` auf dem Zweig `suhl/bestand`;
die Quelle steht jeweils dabei.

## Das Wichtigste in sechs Sätzen

1. Für ein Suhl „in höchster Qualität“ fehlen drei Dinge vom Land Thüringen: das **Gelände** in 1 m (DGM1), die **Oberfläche** mit
   Häusern und Bäumen in 1 m (DOM1) und die **Gebäude mit echten Dachformen** (LoD2).
2. Die alten Download-Adressen des Landes liefern weiter nur eine Wartungsseite, das neue Portal zeigt ein CAPTCHA
   (am 13.11.2026 zwischen 0:11 und 0:35 Uhr viermal geprüft, immer dieselbe Antwort; siehe unten). Automatisch geht dort also nichts.
3. Für das **Pilotquartier Zentrum** reichen **20 Dateien**: 8 Kacheln Gelände, 8 Kacheln Oberfläche, 4 Kacheln Gebäude.
   Das ist von Hand gut machbar.
4. Die **ganze Stadt** wären 445 Dateien, mit den Straßen vom Garten nach Suhl 526. Das klickt niemand von Hand – dafür gibt es
   Weg A (unten) oder wir warten, bis das Land den Dienst wieder öffnet.
5. Neu gefunden: Die **Gebäudegrundrisse des Katasters mit Nutzung und Geschosszahl** gibt das Land über einen offenen Dienst
   aus, den wir automatisch abfragen können. Dafür brauchst du nichts zu tun.
6. Nur für die **Dachformen (LoD2)** habe ich keinen anderen Weg gefunden als das Portal mit CAPTCHA.

## Wie viele Kacheln wofür

Eine Kachel DGM1 oder DOM1 ist 1 × 1 km groß, eine Kachel LoD2 2 × 2 km. Die Vorrangstufen:

- **P1** = Zentrum (Markt, Steinweg, Rathaus, Kirchen, Waffenmuseum, CCS, Bahnhof, Neues Rathaus) plus 300 m Rand
- **P2** = übrige Kernstadt (zusammenhängend bebautes Gebiet von Mäbendorf bis Goldlauter) plus 300 m Rand
- **P3** = der Rest des Stadtgebiets (Albrechts, Dietzhausen, Wichtshausen, Vesser, Schmiedefeld, Gehlberg und viel Wald)
- **P4** = die beiden Straßen vom Garten nach Suhl (Autobahn A 73/A 71 und Landstraße), je 600 m links und rechts, soweit
  nicht schon in P1–P3

| Stufe | DGM1 (1 km) | DOM1 (1 km) | LoD2 (2 km) | Dateien zusammen |
|---|---:|---:|---:|---:|
| P1 Zentrum | 8 | 8 | 4 | 20 |
| P2 Kernstadt | 49 | 49 | 16 | 114 |
| P3 übrige Stadt | 136 | 136 | 39 | 311 |
| P4 Straßen Garten – Suhl | 35 | 35 | 11 | 81 |
| **alles** | **228** | **228** | **70** | **526** |

Quelle: `tools/suhl/out/bestand/kacheln.json`, jede Kachel einzeln in `tools/suhl/out/bestand/kacheln.csv`
([als Tabelle ansehen](https://github.com/mynametouse/pavillon-ratscher/blob/suhl/bestand/tools/suhl/out/bestand/kacheln.csv)).
Gegenprobe: Die 193 Kacheln von P1 bis P3 sind genau die Zahl, die das Portal easygeodata.de für die Gemeinde Suhl nennt.

**Ehrlich gerechnet – was wird wirklich gebraucht:**

- **Zentrum zuerst (P1, 20 Dateien).** Das Zentrum selbst liegt zu 74,1 % in der Kachel 619/5607, zu 16,9 % in 619/5608, zu 7,1 %
  in 620/5608 und zu 1,4 % in 620/5607. Die übrigen vier Kacheln sind nur der 300-m-Rand. Wenn es schnell gehen soll, genügen also
  **diese 4 Kacheln für DGM1 und DOM1 und die 4 LoD2-Kacheln = 12 Dateien**.
- **LoD2 lohnt sich am meisten.** In den 4 LoD2-Kacheln von P1 stehen 9.222 der 22.180 Gebäude der Stadt (41,6 %), in den 20
  Kacheln von P1 und P2 zusammen 17.689 (79,8 %). Gezählt sind die Gebäude aus OpenStreetMap.
- **P3 ist vor allem Wald.** Von den 136 P3-Kacheln (1 km) haben 57 kein einziges Gebäude, nur 22 haben 20 oder mehr. Von den
  39 LoD2-Kacheln in P3 haben 3 kein Gebäude und nur 16 haben 20 oder mehr. Für den Wald genügt vorerst das grobe Gelände, das die
  Welt heute schon nutzt (Copernicus, 30 m).
- **P4** bringt auch der heutigen Welt etwas: 22 der 35 Kacheln berühren den Block um den Garten und Schleusingen, der heute mit
  dem groben Gelände gebaut ist.

Mein Vorschlag: **Jetzt von Hand nur P1 (20 Dateien, notfalls 12).** Danach die 16 LoD2-Kacheln von P2. Alles andere über Weg A
mit Schlüssel – oder später, wenn das Land wieder liefert.

## Die Karten

Alle Bilder liegen auf dem Arbeitszweig `ref/suhl-bestand` (Ordner `karten/`). Die Zahlen in jeder Kachel sind die linke untere
Ecke in Kilometern: oben der Ostwert, darunter der Nordwert – genau so stehen sie im Dateinamen.

| Bild | Zeigt |
|---|---|
| [1 Übersicht](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/1_uebersicht.png) | alle Kacheln P1–P4, Stadtgrenze, Kernstadt, Zentrum, die zwei Straßen vom Garten |
| [2 Zentrum](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/2_zentrum_P1.jpg) | die 8 P1-Kacheln über dem Luftbild |
| [3 Kernstadt](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/3_kernstadt_P1_P2.png) | P1 und P2 mit Nummern in jeder Kachel |
| [4 Stadt West](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/4_stadt_west.png), [5 Stadt Ost](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/5_stadt_ost.png) | das ganze Stadtgebiet in zwei Hälften |
| [6 Straßen](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/6_korridor_P4.png) | P4, die Straßen Garten – Suhl |
| [7 LoD2](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/7_lod2_2km.png) | das 2-km-Raster der Gebäudekacheln |

![Kacheln der Kernstadt](https://raw.githubusercontent.com/mynametouse/pavillon-ratscher/ref/suhl-bestand/karten/3_kernstadt_P1_P2.png)

## Die Dateien für P1 (Zentrum)

So heißen die Dateien beim Land. Bei DGM1 und DOM1 gibt es zwei Zeiträume; nimm **2020-2025**, wenn es ihn für die Kachel gibt,
sonst 2014-2019.

| Kachel (Ost/Nord) | DGM1 | DOM1 | Anteil am Zentrum |
|---|---|---|---:|
| 619 / 5607 | `dgm1_32_619_5607_1_th_2020-2025.zip` | `dom1_32_619_5607_1_th_2020-2025.zip` | 74,1 % |
| 619 / 5608 | `dgm1_32_619_5608_1_th_2020-2025.zip` | `dom1_32_619_5608_1_th_2020-2025.zip` | 16,9 % |
| 620 / 5608 | `dgm1_32_620_5608_1_th_2020-2025.zip` | `dom1_32_620_5608_1_th_2020-2025.zip` | 7,1 % |
| 620 / 5607 | `dgm1_32_620_5607_1_th_2020-2025.zip` | `dom1_32_620_5607_1_th_2020-2025.zip` | 1,4 % |
| 618 / 5607 | `dgm1_32_618_5607_1_th_2020-2025.zip` | `dom1_32_618_5607_1_th_2020-2025.zip` | 0,6 % |
| 618 / 5608 | `dgm1_32_618_5608_1_th_2020-2025.zip` | `dom1_32_618_5608_1_th_2020-2025.zip` | nur Rand |
| 618 / 5606 | `dgm1_32_618_5606_1_th_2020-2025.zip` | `dom1_32_618_5606_1_th_2020-2025.zip` | nur Rand |
| 619 / 5606 | `dgm1_32_619_5606_1_th_2020-2025.zip` | `dom1_32_619_5606_1_th_2020-2025.zip` | nur Rand |

| LoD2-Kachel (Ost/Nord, 2 km) | Datei | Anteil am Zentrum | Gebäude der Stadt darin (OSM) |
|---|---|---:|---:|
| 618 / 5606 | `LoD2_32_618_5606_2_TH.zip` | 74,7 % | 3.611 |
| 618 / 5608 | `LoD2_32_618_5608_2_TH.zip` | 16,9 % | 1.609 |
| 620 / 5608 | `LoD2_32_620_5608_2_TH.zip` | 7,1 % | 1.691 |
| 620 / 5606 | `LoD2_32_620_5606_2_TH.zip` | 1,4 % | 2.311 |

**P2 (Kernstadt), 49 Kacheln DGM1/DOM1** – Nordwert, dann die Ostwerte dieser Reihe:

| Nord | Ost |
|---|---|
| 5612 | 621 |
| 5611 | 619, 620, 621, 622, 623, 624 |
| 5610 | 619, 620, 621, 622, 623, 624 |
| 5609 | 617, 618, 619, 620, 621, 622, 623 |
| 5608 | 614, 617, 621, 622 |
| 5607 | 614, 615, 616, 617, 621, 622 |
| 5606 | 614, 615, 616, 617, 620, 621, 622 |
| 5605 | 615, 616, 617, 618, 619, 620, 621, 622 |
| 5604 | 617, 618, 620, 621 |

**P2, 16 Kacheln LoD2** (Ost/Nord): 620/5612 · 618/5610, 620/5610, 622/5610, 624/5610 · 614/5608, 616/5608, 622/5608 ·
614/5606, 616/5606, 622/5606 · 614/5604, 616/5604, 618/5604, 620/5604, 622/5604.

P3 und P4 stehen vollständig in `kacheln.csv` und in den Karten 4 bis 7.

## Weg A – easygeodata.de (bequemer, aber eine fremde Kopie)

Die Seite `https://easygeodata.de/thueringen/kreisfreie-stadt-suhl/suhl/` ist ein privates Portal, nicht der Server des Landes.
Sie bietet für die Gemeinde Suhl aufbereitete Kopien der amtlichen Daten an (Datenstand laut Seite: 1.10.2026):

| Produkt | Umfang laut Seite | Bemerkung |
|---|---|---|
| DGM1 | 193 Kacheln, 282 MB | als GeoTIFF, leicht verlustbehaftet gepackt (laut Seite höchstens 1 mm Abweichung) |
| DOM1 | 193 Kacheln, 361 MB | wie DGM1 |
| nDOM1 (Höhe über Gelände) | 193 Kacheln, 190 MB | von der Seite selbst aus DOM1 minus DGM1 gerechnet (höchstens 5 cm Abweichung) |
| ALKIS „Nur Hausumringe“ | eine Datei, wird beim Klick erzeugt | Gebäudegrundrisse mit Gebäudefunktion als GeoPackage |
| Luftbilder, alte Jahrgänge 2008–2025, Laserpunkte | nur Links zum Server des Landes | keine eigene Kopie |
| **LoD2-Gebäude** | **nicht im Angebot** | bDOM gibt es dort für Thüringen auch nicht |

Was ich gesichert weiß (aus den öffentlichen Seiten gelesen, 13.11.2026, 0:14 Uhr):

- Bei DGM1, DOM1 und nDOM1 steht auf der Gemeindeseite je ein Link „Kachelliste (193 Kacheln, JSON)“. Ein Klick liefert also
  **keine fertige Datei für ganz Suhl, sondern eine Liste von 193 Kachel-Adressen**.
- Die Seite schreibt sinngemäß: Kleine Gebiete wie die meisten Gemeinden gehen per Klick ohne Anmeldung, große Gebiete brauchen ein
  kostenloses Konto, Skripte und GIS-Programme brauchen einen API-Schlüssel.
- An anderer Stelle steht, kleine Gebiete ließen sich auf Abruf zu einer Datei zusammensetzen. Wo genau und bis zu welcher Größe,
  steht dort nicht.

Was ich **nicht** prüfen konnte: was der Klick auf „Kachelliste“ in deinem Browser wirklich zeigt. Die Seite schließt Programme
von ihren Schnittstellen aus (robots.txt), und ohne Schlüssel darf ich sie nicht benutzen. Ich habe dort nichts heruntergeladen
und kein Konto angelegt. Die Anleitung zur Schnittstelle (`/api/docs`) habe ich deshalb auch nicht gelesen.

**So probierst du Weg A in zwei Minuten:**

1. Seite öffnen: `https://easygeodata.de/thueringen/kreisfreie-stadt-suhl/suhl/`
2. Unter „DGM1“ auf „Kachelliste (193 Kacheln, JSON)“ klicken.
3. Erscheint eine Liste mit Adressen? Dann suche darin nach `619_5607` (oder `619` und `5607`) und lade diese Kachel. So gehen
   die 8 P1-Kacheln für DGM1 und DOM1 mit 16 Klicks. Erscheint stattdessen eine Anmeldeseite, dann geht es nur mit Konto.
4. Zusätzlich lohnt ein Klick auf **„Nur Hausumringe“** (ganz oben bei ALKIS). Bitte **nicht** „Komplettpaket“ oder „Nur
   Flurstücke“ – Flurstücke nutzen wir nicht.

**Die bequemste Lösung wäre ein Schlüssel:** Wenn du dort ein kostenloses Konto anlegst und uns den API-Schlüssel als Geheimnis in
GitHub hinterlegst, kann die Pipeline alle 228 DGM1- und 228 DOM1-Kacheln selbst holen – ganz nach den Regeln der Seite. Das ist
deine Entscheidung; ich lege keine Konten an.

**Was „fremde Kopie“ bedeutet:**

- Die Daten sind die des Landes, aber umgepackt. Für unsere Zwecke (Gelände, Gebäudehöhen, Bäume) ist 1 mm Abweichung belanglos.
- Der Stand ist der 1.10.2026. Neuere Befliegungen fehlen, bis die Seite nachzieht.
- Die Seite kann sich ändern oder verschwinden. Für eine dauerhafte Pipeline ist das Land die bessere Quelle, sobald es wieder
  liefert.
- Die Namensnennung bleibt „© GDI-Th“. Die Seite nennt für Höhendaten die Datenlizenz Deutschland – Namensnennung 2.0, das Land
  selbst nennt in seinen Diensten CC BY 4.0. Beide verlangen dieselbe Nennung. Wir vermerken zusätzlich, dass die Dateien
  bearbeitet über easygeodata.de kamen.

## Weg B – das amtliche Portal (CAPTCHA, von Hand)

Für **LoD2** führt bisher kein Weg daran vorbei.

1. `https://geoportal.thueringen.de/gdi-th/download-offene-geodaten` öffnen und das CAPTCHA lösen.
2. Bereich **Höhendaten** (`…/download-offene-geodaten/download-hoehendaten`) für DGM1 und DOM1, Bereich **3D-Gebäude** für LoD2.
3. Die Kacheln nach der Liste oben wählen. Die Nummern in unseren Karten sind die linke untere Ecke in Kilometern (Ost, Nord).
4. Die ZIP-Dateien **unverändert** in einen Ordner legen, zum Beispiel `Suhl-Landesdaten/`. Nichts auspacken, nichts umbenennen.

Ehrlich: Wie die Seiten hinter dem CAPTCHA aussehen, konnte ich nicht sehen – ein CAPTCHA löse ich nicht. Es kann sein, dass man
dort Kacheln auf einer Karte anklickt, oder dass es Pakete je Gemeinde gibt. Falls es **ein Paket für die ganze Gemeinde Suhl**
gibt, nimm das: dann ist die Kachelliste überflüssig. Sag uns bitte kurz, wie es dort aussieht – dann schreibe ich diese
Anleitung genauer.

## Was heute an den Adressen antwortet

| Wann (13.11.2026) | Adresse | Antwort |
|---|---|---|
| 0:11 Uhr (von Hand), 0:24, 0:27 und 0:35 Uhr (Skript) | `geoportal.geoportal-th.de/hoehendaten/DGM/dgm_2020-2025/dgm1_32_619_5607_1_th_2020-2025.zip` | Wartungsseite (970 Bytes): „Dieser Geodaten-Dienst ist im Moment leider noch nicht verfügbar“ |
| ebenso | `…/hoehendaten/DGM/dgm_2014-2019/dgm1_32_619_5607_1_th_2014-2019.zip` | dieselbe Wartungsseite |
| ebenso | `…/hoehendaten/DOM/dom_2020-2025/dom1_32_619_5607_1_th_2020-2025.zip` | dieselbe Wartungsseite |
| ebenso | `…/3dgebaeude/LoD2/LoD2_32_618_5606_2_TH.zip` | dieselbe Wartungsseite |
| ebenso | `…/dienste/atom_th_hoehendaten_dgm` (Verzeichnis der Höhendaten) | dieselbe Wartungsseite |
| ebenso | `geoportal.thueringen.de/gdi-th/download-offene-geodaten/download-hoehendaten` | Seite „Link11 – CAPTCHA“ |

Abgefragt vom Chat-Rechner mit `tools/suhl/bestand/landesdienste.py`; das Protokoll `tools/suhl/out/bestand/landesdienste.json` hält
die letzte Probe fest (0:35 Uhr).
Dieselbe Probe aus GitHub Actions um 0:40 Uhr brachte dieselben Antworten (`tools/suhl/out/bestand/actions/landesdienste.json`).

## Was sich automatisch holen lässt – kurz

Ausführlich in `docs/features/suhl-bestand.md`, Abschnitt „Dienste“. ✔ = mit einer echten Abfrage für Suhl geprüft.

| Was | Geht automatisch? | Wo |
|---|---|---|
| Luftbild 20 cm (Farbe, Infrarot, Grau) | ✔ ja | WMS des Landes `…/geoproxy/services/DOP`; Suhl ist am 15.05.2024 beflogen |
| **Gebäudegrundrisse mit Nutzung und Geschosszahl** (Kataster) | ✔ ja, auch aus GitHub Actions | WFS „ALKIS vereinfacht“ `…/geoproxy/services/adv_alkis_wfs`, Objektart `ave:GebaeudeBauwerk` |
| Hausnummern mit Lage | ✔ ja | WFS des Landes, Objektart `tlvermgeo:GAZHKO_HNR` |
| Gebäudegrundrisse mit Höhe in ganzen Metern | ✔ ja | Vektorkacheln von basemap.de (Bund und Länder) |
| Gebäudegrundrisse mit Höhe (aus dem LoD2 des Landes abgeleitet) | ✔ ja | ETHOS.BUILDA (Forschungszentrum Jülich): 30.929 Gebäude in Suhl |
| Gelände als Zahlen (DGM1) | ✘ nein | am Dienst des Landes nur als Schummerungsbild; kein WCS |
| Oberfläche (DOM1), Dachformen (LoD2), 3D-Netz, Schrägbilder | ✘ nein | unter den 514 Ebenen des Landesdienstes nicht dabei |

## Für den Suhl-Chat

- **Frage an Falko:** (1) Was zeigt der Klick auf „Kachelliste“ bei easygeodata in seinem Browser? (2) Will er dort ein Konto
  anlegen und uns einen API-Schlüssel als GitHub-Geheimnis geben? (3) Wie sieht das amtliche Portal hinter dem CAPTCHA aus –
  Kacheln auf einer Karte, Liste oder Pakete je Gemeinde?
- **Ablage der Dateien** ist offen. Vorschlag: privates Repo `pavillon-ratscher-assets` (so stand es schon in
  `tools/welt/QUELLEN.md`), die ZIPs als Release-Anhang; Actions holt sie mit einem Token. Für P1 sind es 20 Dateien.
- Die Pipeline sollte bei jedem Lauf zuerst die alte Adresse des Landes versuchen (`tools/suhl/bestand/landesdienste.py` erkennt
  die Wartungsseite): Sobald dort wieder ZIP-Dateien kommen, braucht Falko nichts mehr zu klicken.
- `tools/suhl/out` fällt unter die Regel `out/` in `.gitignore`. Ergebnisse dort brauchen `git add -f`.
