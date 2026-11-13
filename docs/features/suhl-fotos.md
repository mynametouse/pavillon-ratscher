# Suhl – Fotoabdeckung (Stufe 1): welche echten Fotos es gibt, wo sie stehen und wohin sie blicken

Stand **13.11.2026** (Hilfs-Agent `suhl-fotos` des Suhl-Chats, Zweig `suhl/fotos`, Auftrag `docs/plans/auftraege/suhl-fotos.md`).
Kein App-Code. Alle Zahlen stammen aus den Dateien in `tools/suhl/out/fotos/` – hinter jeder Zahl steht die Datei.
Gebiete: die genauen Flächen von `suhl-bestand` (`gebiete.geojson`, Stand Commit `05c7235`; eine Kopie liegt in `tools/suhl/out/fotos/gebiete.geojson`):
Stadt 141,8 km², Kernstadt 22,0 km², **Zentrum 0,68 km²** (Hülle um Markt, Steinweg, Rathaus, Kirchen, Waffenmuseum, CCS, Bahnhof, Neues Rathaus).

## Das Wichtigste in Kürze

1. **Straßenfotos gibt es nur von den Fahrstraßen.** Panoramax hat im Gemeindegebiet 2 139 verschiedene Fotos (im Zentrum 171), bis auf eines
   aus fahrenden Autos, Juni 2025 bis Mai 2026. Die Fußgängerzone hat **kein einziges**: Steinweg, Marktplatz, Rathaus, Kreuzkirche,
   Waffenmuseum, Bahnhof, Platz der Deutschen Einheit – je 0 Straßenfotos mit Blick darauf (`abdeckung.json`, `wahrzeichen`).
2. **Abdeckung nach Länge:** Kernstadt 20,1 % von 185,9 km benannter Straßen haben ein Straßenfoto im Umkreis von 25 m, 187 von 358 Straßen
   haben gar keins. Zentrum 42,9 % von 14,4 km, 21 von 49 Straßen ohne Foto (`abdeckung.json`, `summen`).
3. **Fast kein Foto blickt quer auf eine Fassade.** Die Kameras schauen nach vorn durch die Frontscheibe. Quer auf eine Straßenseite blickt ein
   Foto nur auf 1,5 % der Straßenlänge in der Kernstadt und auf 2,6 % / 4,5 % (je Seite) im Zentrum.
4. **Die gespeicherte Blickrichtung der Handy-Fotos ist unzuverlässig.** Bei allen Fotos des Zentrums (Urheber „sixsixfive“, Handy-Kompass)
   weicht sie im Median 42° von der Fahrtrichtung ab; nur 19 % liegen innerhalb von 20°. Ich rechne deshalb dort mit der Fahrtrichtung
   (Feld `blick` im Katalog). Für den späteren Foto-Abgleich im Test ist das wichtig.
5. **Wikimedia Commons füllt die Mitte – aber nur mit Einzelbildern.** 6 229 Fotos, davon 512 mit Standort im Zentrum (meist 2014 und 2023–2025).
   Am Steinweg stehen 130 Kamerastandorte, am Marktplatz 91, rund ums Rathaus 154. Nur 23 dieser 512 haben eine Blickrichtung.
   Straßenfoto **oder** Commons-Standort: 78,1 % der Straßenlänge im Zentrum.
6. **Was fehlt:** zusammenhängende Aufnahmen beider Straßenseiten mit bekannter Position und Richtung – genau das, was Fassaden und der
   Foto-Abgleich brauchen. Am meisten hilft ein Rundgang von Falko (Liste unten).

## Was es gibt

| Was | Wo |
|---|---|
| Katalog aller gefundenen Fotos (9 666 Einträge: Panoramax 3 254, Commons 6 229, Openverse 183) | `tools/suhl/out/fotos/katalog_suhl.json.gz` |
| Zahlen je Quelle (Jahre, Lizenzen, Gebiete, Blickrichtung) | `tools/suhl/out/fotos/quellen.json` |
| Abdeckung je Straße, je Viertel, Zentrum, Wahrzeichen | `tools/suhl/out/fotos/abdeckung.json`, als Tabelle `abdeckung_strassen.csv` |
| Messpunkte alle 5 m entlang der Straßen (für Karten) | `tools/suhl/out/fotos/abdeckung_punkte.json.gz` |
| Commons-Fotos je Wahrzeichen und Straße des Zentrums | `tools/suhl/out/fotos/commons_zentrum.json` (aus GitHub Actions, mit den Namen der Blätter) und `commons_zentrum_lokal.json` (auf dem Chat-Rechner nachgerechnet; gleiche Zahlen bis auf eine – mit dem strengeren Lizenzfilter für Blätter 216 statt 217 bei „Bahnhof“) |
| Rohlisten je Quelle | `panoramax.json.gz`, `commons.json.gz`, `openverse.json`, `kartaview.json`; Straßennetz `strassen.json.gz` (OpenStreetMap) |
| Kontaktabzüge des Zentrums, Karten, `CREDITS.md` | Zweig **`ref/suhl-fotos`** (ein einzelner Commit, wird nie gemergt): `zentrum/*.jpg` (49 Blätter zu 34 Straßen und Orten, Panoramax), `commons/*.jpg` (77 Blätter zu 48 Gruppen, Wikimedia Commons, mit eigener `commons/CREDITS.md`), `karten/abdeckung_zentrum.png`, `karten/abdeckung_kernstadt.png`, `index.json` |
| Werkzeuge | `tools/suhl/fotos/` (siehe „Neu erzeugen“), Workflow `.github/workflows/suhl-fotos.yml` |

Ansehen: `git fetch origin ref/suhl-fotos && git show FETCH_HEAD:karten/abdeckung_zentrum.png > /tmp/zentrum.png`.

## Quellen

| Quelle | Fotos | Jahre | Lizenz | mit Blickrichtung | Woher geholt |
|---|---|---|---|---|---|
| **Panoramax** (Straßenfotos) | 3 254 im Rechteck um die Stadt, davon 284 doppelt hochgeladen → **2 970 verschiedene**; im Gemeindegebiet 2 139 (Zentrum 171, übrige Kernstadt 1 070, übrige Stadt 898) | 2025: 2 095, 2026: 1 159 | alle CC BY-SA 4.0 | alle (aber siehe unten); kein 360°-Foto | Chat-Rechner, `api.panoramax.xyz`, 28 Abfragen |
| **Wikimedia Commons** (Einzelfotos) | **6 229**; mit Standort 3 358 (Kamera 3 299, nur Objekt 59); Zentrum 512, übrige Kernstadt 826, übrige Stadt 1 025, außerhalb 995, ohne Standort 2 871 | vor 1945: 55 · 1945–1990: 457 · 1991–2009: 230 · 2010–2019: 1 613 · 2020–2026: 3 794 · ohne: 80 | CC BY-SA 4.0: 3 985 · CC BY-SA 3.0 de: 691 · CC BY 4.0: 392 · CC BY-SA 3.0: 386 · CC0: 347 · CC BY 3.0: 122 · CC BY-SA 2.0: 100 · gemeinfrei: 97 · sonst 109; **frei nutzbar 6 185**, nur ansehen 44 | 250 | GitHub Actions (Lauf 43326964578), 1 107 Abfragen |
| **Openverse** (vor allem Flickr) | 183, alle ohne Standort | nicht angegeben | CC BY-NC 2.0: 99 · CC BY-SA 2.0: 28 · CC BY-ND 2.0: 23 · CC BY-NC-SA 2.0: 16 · CC BY 2.0: 12 · sonst 5; **frei 41, nur ansehen 142** | 0 | Chat-Rechner |
| **KartaView** | **0 im ganzen Gemeindegebiet** (369 Kreisabfragen, alle leer) | – | laut OpenStreetMap-Wiki CC BY-SA 4.0 | – | Chat-Rechner, `api.kartaview.org` (ohne Konto); Gegenprobe in Erfurt liefert Bilder (`kartaview.json`) |
| **Mapillary** | nicht abgefragt | – | laut Mapillary CC BY-SA 4.0 (nicht geprüft) | – | braucht einen Zugangsschlüssel und damit ein Konto – keines angelegt |

**Panoramax im Einzelnen** (`quellen.json`, verschiedene Fotos): „sixsixfive“ 1 449 (Fairphone 6, Bildwinkel 74°, 26.–30.12.2025) – von ihm stammen
alle Fotos der Kernstadt und des Zentrums bis auf eines; „R_A“ 773 (12.4.2026: Garmin VIRB nach vorn, 380; Sony-Kamera seitlich, 393 –
alle außerhalb der Kernstadt, die Sony-Bilder zeigen die Autobahn); „r_a“ 385 (23.5.2026, andere Panoramax-Instanz, außerhalb der Kernstadt);
„cucu“ 362 (Juni 2025; 69 im Gemeindegebiet außerhalb der Kernstadt, 293 jenseits der Stadtgrenze); „mapcomplete“ 1. 284 Fotos von „sixsixfive“ liegen in zwei Folgen doppelt vor; sie zählen überall nur einmal.

**Blickrichtung geprüft** (`abdeckung.json` → `method.heading_check`): Ich habe die gespeicherte Richtung mit der Fahrtrichtung aus der Bildfolge
verglichen. „R_A“/Garmin: gleich (Abweichung im Median 6°). „R_A“/Sony: fest 120° nach links – eine echte Seitenkamera. „sixsixfive“: streut
(Abweichung im Median 42°, nur 19 % innerhalb 20°), „cucu“ ebenso (70°). Auf den Kontaktabzügen sieht man: beide fotografieren nach vorn durch die
Frontscheibe. Für sie gilt deshalb die Fahrtrichtung als Blickrichtung (Katalogfelder `heading` = gespeichert, `heading_fahrt`, `blick`, `blick_quelle`).
Beispiel für den Fehler: `pmx:3ae9acd8…` und `pmx:5555523f…` zeigen dasselbe Autohaus vom selben Punkt, gespeichert sind 36° und 158°.

**Commons im Einzelnen** (`commons.json.gz`, `log/commons.log`): gefunden über Standorte (2 855 Dateien, 144 Kreisabfragen über das Gemeindegebiet),
über den Kategorienbaum „Suhl“ (6 342 Dateien; Personen, Fahrzeuge, Waffen, Karten ausgelassen) und über zwei Textsuchen nach Bundesarchiv und
Deutscher Fotothek (615). 5 536 gelten nach Wörtern als Außenansicht. Die meisten Fotos: Strubbl 1 173, Sven Mandel 997, Sandro Halank 479,
Steffen Prößdorf 394, Helmut Schaar 320. Im Zentrum: Strubbl 319 von 512; Jahre dort vor allem 2014 (71), 2023 (114), 2024 (92), 2025 (125).
Historisch (vor 1991): 499 Fotos, davon 69 frei lizenzierte Außenansichten; nur 8 haben einen Kamerastandort.

## Abdeckung

So gerechnet (`tools/suhl/fotos/coverage.py`): jede benannte Straße aus OpenStreetMap alle 5 m abgetastet; „mit Foto“ = ein Straßenfoto im Umkreis
von 25 m; „Blick quer“ = ein Foto höchstens 15 m längs versetzt, Blick höchstens 60° von der Senkrechten, nicht von hinter der Häuserzeile.
Fahrbahnen, die in OpenStreetMap getrennt gezeichnet sind, zählen doppelt (z. B. Friedrich-König-Straße). Plätze, die als Fläche gezeichnet sind,
stehen mit ihrem Umriss eigens da („[Fläche]“).

**Kernstadt** (`summen.kernstadt`): 358 benannte Straßen, 185,9 km. Mit Straßenfoto 37,4 km = **20,1 %**. Blick quer: 1,5 % je Seite.
187 Straßen ohne jedes Straßenfoto, 23 Straßen zu mindestens 90 % erfasst. Commons-Standort im Umkreis von 25 m: 8,1 % der Länge;
Straßenfoto oder Commons: 26,3 %; weder noch: 140 Straßen. Benannte Fußwege: 33 mit 10,5 km, 6,1 %. Straßen ohne Namen (Zufahrten): 129,3 km, 8,9 %.

Nach Straßenart (`strassenklasse`): Hauptstraßen (secondary) 23,3 km – 62,1 %; tertiary 12,7 km – 77,1 %; unclassified 10,8 km – 30,4 %;
**Wohnstraßen (residential) 119,4 km – 7,6 %**, 144 von 268 ohne Foto; verkehrsberuhigt 2,4 km – 11,5 %; Zufahrten mit Namen 16,7 km – 3,1 %;
Fußgängerzone 0,55 km – 0 %.

| Viertel (nächster OSM-Ortspunkt) | Straßen | km | mit Straßenfoto | Blick quer (Mittel beider Seiten) | Straßen ohne Foto |
|---|---|---|---|---|---|
| Suhl-Mitte | 71 | 30,5 | 34,0 % | 3,2 % | 25 |
| Suhl Nord | 33 | 24,5 | 29,6 % | 2,0 % | 15 |
| Himmelreich | 48 | 21,2 | 11,0 % | 0,9 % | 22 |
| Neundorf | 37 | 21,3 | 1,5 % | 0,1 % | 33 |
| Heinrichs | 20 | 15,3 | 35,8 % | 1,6 % | 7 |
| Linsenhof | 16 | 11,2 | 6,3 % | 0,1 % | 14 |
| Heidersbach | 24 | 11,0 | 26,6 % | 1,7 % | 8 |
| Lautenbergsiedlung | 24 | 9,1 | 3,0 % | 0,3 % | 19 |
| Goldlauter | 25 | 9,0 | 12,6 % | 0,9 % | 15 |
| Aue 2 | 12 | 8,7 | 15,8 % | 2,1 % | 8 |
| Aue 1 | 16 | 8,7 | 10,1 % | 0,4 % | 9 |
| Mäbendorf | 22 | 8,2 | 19,0 % | 2,5 % | 9 |
| Lauter | 10 | 7,3 | 38,9 % | 1,0 % | 3 |

**Zentrum** (`summen.zentrum`): 49 benannte Straßen, 14,44 km. Mit Straßenfoto 6,19 km = **42,9 %**; Blick quer 2,6 % (Seite A) und 4,5 % (Seite B).
21 Straßen ohne Straßenfoto, 10 zu mindestens 90 % erfasst; 182 verschiedene Fotos. Commons-Standort im Umkreis von 25 m: 44,0 %;
Straßenfoto oder Commons: **78,1 %**; weder noch: 3 Straßen. Die sechs Platzflächen (2,2 km Umriss): Straßenfoto 0,7 %, Commons 84,6 %.

Die am schlechtesten erfassten Straßen des Zentrums, nach fehlenden Metern (`zentrum_schlecht`; „Commons“ = Kamerastandorte im Umkreis von 25 m):

| Straße | Länge im Zentrum | mit Straßenfoto | Commons | Bemerkung |
|---|---|---|---|---|
| Friedrich-König-Straße | 2 176 m (beide Fahrbahnen) | 49 % | 57 | Hauptstraße; nur Blick längs |
| Steinweg (Fußgängerzone) | 417 m, dazu 996 m Platzrand | 0 % | 130 / 144 | kein Straßenfoto |
| Bahnhofstraße | 787 m | 6 % | 87 | 14 Straßenfotos, fast alle von einer Stelle |
| Am Bahnhof | 719 m | 1 % | 21 | Bahnhofsvorplatz ohne Straßenfoto |
| Marktplatz | 382 m, dazu 216 m Platzrand | 0 % | 91 / 80 | kein Straßenfoto |
| Rimbachstraße | 226 m, dazu 364 m Platzrand | 0 % | 17 | |
| Pfarrstraße | 343 m | 0 % | 40 | |
| Platz der Deutschen Einheit | 140 m, dazu 336 m Platzrand | 0 % | 12 / 22 | |
| Dombergweg | 270 m | 2 % | 3 | |
| Döllstraße | 250 m | 0 % | 33 (nur an 36 % der Länge) | |
| Kirchgasse | 237 m | 0 % | 27 | |
| Schleusinger Straße | 225 m | 0 % | 33 | |
| Am Domberg | 207 m | 0 % | **0** | gar kein Foto |
| Gutenbergstraße | 204 m | 0 % | 9 (23 % der Länge) | |
| Friedensstraße | 183 m | 0 % | 15 | |
| Kefersteinstraße | 177 m | 0 % | **0** | gar kein Foto |
| Kommerstraße | 167 m | 0 % | 17 | |
| Am Burghof | 156 m | 0 % | 6 (26 % der Länge) | |
| Friedrich-Engels-Straße | 122 m | 0 % | 2 (12 % der Länge) | |
| Lauwetter | 221 m | 18 % | 0 | |

Gut erfasst (Straßenfoto an mindestens 98 % der Länge, aber Blick längs): Dr.-Theodor-Neubauer-Straße, Würzburger Straße, Werner-Seelenbinder-Straße,
Mühltorstraße, Alte Schmiedefelder Straße, Paul-Greifzu-Straße, Auf der Mauer, Mühlhügel.

**Wahrzeichen** (`wahrzeichen`): Straßenfotos im Umkreis von 80 m, deren Bildfeld das Objekt trifft; Commons = Kamerastandorte im Umkreis von 80 m
(was sie zeigen, ist damit nicht gesagt) und Fotos, die das Objekt im Namen tragen (`commons_zentrum_lokal.json`).

| Wahrzeichen | Straßenfotos mit Blick darauf (bis 80 m insgesamt) | Commons-Standorte bis 80 m | Commons nach Namen (frei lizenzierte Außenansichten) |
|---|---|---|---|
| Rathaus am Markt | 0 (0) | 154 | 41 (38) |
| Marktplatz | 0 (7) | 147 | 81 (75) |
| Steinweg | 0 (3) | 240 | 98 (90) |
| Hauptkirche St. Marien | 1 (1) – zeigt nur einen Parkscheinautomaten | 119 | 43 (35) |
| Kreuzkirche | 0 (0) | 66 | 83 (53) |
| Waffenmuseum (Malzhaus) | 0 (0) | 27 | 73 (34) |
| Congress Centrum Suhl | 7 (16) | 29 | 18 (8) |
| Bahnhof (Empfangsgebäude) | 0 (0) | 19 | nicht sauber zählbar – „Bahnhof“ trifft auch die Bahnhofstraße (228) |
| Platz der Deutschen Einheit | 0 (0) | 58 | 24 (18) |
| Neues Rathaus | 10 (25) | 10 | – |
| Lauterbogen-Center | 0 (7) | 44 | 7 (7) |
| Einkaufszentrum „Am Steinweg“ | 0 (0) | 105 | – |
| Haus der Geschichte | 0 (0) | 37 | – |
| Stadtbücherei | 0 (0) | 24 | 4 (4) |
| Waffenschmied-Denkmal, Dianabrunnen | 0 (0) | 107, 77 | 78 (64) zusammen mit dem Vogelbrunnen |
| Villa Simson | 0 (0) | 1 | 4 (0) |

## Blick ins Zentrum – was die Straßenfotos zeigen

Ich habe die Kontaktabzüge auf `ref/suhl-fotos` selbst angesehen (zu jeder der 34 Straßen und Orte das erste Blatt, bei den Hauptstraßen beide). Hier steht nur, was auf den
Bildern zu sehen ist. Alle Bilder bis auf eines: Dezember 2025, Bäume kahl, tiefe Sonne, durch die Frontscheibe – Farben oft verfälscht, einige Bilder fast nur Gegenlicht.
Baustoffe nenne ich nach dem Aussehen (zum Beispiel „Schiefer“ für dunkelgraue Schindeln); geprüft sind sie nicht.

- **Friedrich-König-Straße** (`friedrich-koenig-strasse_1/2`): breite Hauptstraße, zwei bis vier Spuren mit Abbiegepfeilen, Ampeln an Auslegermasten,
  Grünstreifen, Gehweg aus grauem Rechteckpflaster. Daneben Scheibenhochhäuser mit gemusterter Fassade (eines rot-weiß gewürfelt, weitere blau-gelb und grau),
  etwa elf bis vierzehn Geschosse. Eine lange Ladenzeile mit durchlaufendem Vordach und Schaufenstern, darüber Wohnblöcke mit verglasten Balkonen
  (sechs bis acht Geschosse), Erdgeschoss teils Klinker. Eine hohe Stützmauer aus dunklem Naturstein mit Geländer; Bushaltestelle am Gehweg.
- **Dr.-Theodor-Neubauer-Straße** (`dr-theodor-neubauer-strasse_1/2`): mehrspurige Talstraße. Sie unterquert ein **Eisenbahnviadukt**: Pfeiler und
  Bögen aus rotbraunen Bossenquadern (Naturstein), dazwischen ein grauer Stahlträger über der Fahrbahn; Graffiti an den Pfeilern. Ein Autohaus mit
  gerundeter Glasfront an einer Ampelkreuzung, große gelbe Wegweiser, braune Hinweisschilder (Waffenmuseum, Fahrzeugmuseum). Am Nordende
  schieferverkleidete Giebelhäuser (zwei bis drei Geschosse) direkt an der Fahrbahn.
- **Würzburger Straße** (`wuerzburger-strasse_1/2`): vier Spuren unter dem Viadukt. Blickfang ist ein **weißes rundes Hochhaus** mit Ringaufsatz;
  dahinter ein bewaldeter Hang. Autohäuser mit Fahnen und Werbepylon, Geländer am Gehweg, hohe Peitschenleuchten.
- **Mühltorstraße, Ort CCS** (`muehltorstrasse_1`, `ort-congress-centrum-suhl-ccs_1`): große Kreuzung. Zu sehen sind ein **runder, ockergelb
  gebänderter Baukörper mit offenen Decks** und Fahnen auf dem Dach, eine stählerne Außentreppe, daneben das rot-weiß gewürfelte Hochhaus
  (etwa dreizehn Geschosse) und ein graues Turmhochhaus mit Mast. Den Haupteingang des CCS zeigt kein Bild.
- **Werner-Seelenbinder-Straße, Burgweg** (`werner-seelenbinder-strasse_1`, `burgweg_1`): läuft unter einer Grasböschung mit Leitplanke. Ein langes
  modernes Bürohaus mit Fensterbändern und weißen Sonnenschutz-Lamellen (vier Geschosse), weiße Wohnhäuser mit Flachdach über einer glatten grauen Stützmauer,
  ältere Putzhäuser mit rotem Ziegeldach, Werbetafel, Parkschilder.
- **Bahnhofstraße, Am Bahnhof** (`bahnhofstrasse_1`, `am-bahnhof_1`): nur die Einmündung an der Hauptstraße ist erfasst: ein großer Altbau mit
  geschweiftem Giebel (vier bis fünf Geschosse, grau, ein Teil gelb), daneben ein moderner Bau mit dunkler Glas-Metall-Fassade und spitzem Giebel,
  alte Häuser in Orange und Gelb. Vom Bahnhof und seinem Vorplatz gibt es kein Bild.
- **Gothaer Straße, Mühlhügel, Hofleitengasse, Ort Neues Rathaus** (`gothaer-strasse-suhl-nord_1`, `muehlhuegel_1`, `ort-neues-rathaus_1`): Altstadtstraße
  bergauf. Zwei- bis dreigeschossige Häuser, verputzt in Creme, Gelb und Hellgrün, **viele mit dunkelgrauer Schieferverkleidung**, rote Ziegeldächer
  mit Gauben. Ein Eckhaus mit Laden im Erdgeschoss (Schaufenster, Schriftzug). Vor den Häusern Streifen aus Kleinpflaster, Fahrbahn Asphalt,
  Laternen mit Bogenhals, Bruchstein-Stützmauer, parkende Autos an einer Seite.
- **Alte Schmiedefelder Straße, Hohe Röder, Dr.-Erfurth-Straße** (`alte-schmiedefelder-strasse_1`, `hohe-roeder_1`): gleiche Bauart am Hang. Schieferhäuser,
  ein Fachwerkgiebel, **Bruchsteinmauern an beiden Seiten**, erhöhter Gehweg mit Geländer, Treppen zu den Haustüren, Mülltonnen an der Straße.
  Am Ende der Straße steht in der Ferne ein gemustertes Hochhaus im Bild – der Maßstabssprung zwischen Altstadt und Hochhäusern.
- **Auf der Mauer** (`auf-der-mauer_1`): schmale Gasse nach Norden. Schiefer- und Fachwerkhäuser, eines sichtbar verfallen (bröckelnder Putz,
  altes Holztor), Häuser auf Terrassen über der Straße, schwarze Geländer, Außentreppen, Parkstreifen aus Kleinpflaster, Tempo-30-Schild.
- **Adam-Riese-Straße, Paul-Greifzu-Straße** (`adam-riese-strasse_1`, `paul-greifzu-strasse_1`): ein **roter Backsteinbau** mit Spitzbogenfenstern
  (drei Geschosse) auf einer Böschung; Reihen dreigeschossiger Putzhäuser (weiß, rote Dächer, Gauben), die dem Gefälle folgen; kahle Straßenbäume,
  Drahtzäune, Parken auf einer Seite.
- **Stadelstraße, Backstraße, Roschstraße, Thomas-Müntzer-Straße** (`stadelstrasse_1`, `backstrasse_1`): Wohnstraßen. Viergeschossige Wohnblöcke,
  saniert, cremefarbener Putz, Balkone, Erdgeschoss teils Klinker, Ziegeldach mit Gauben; daneben zweigeschossige Einzelhäuser mit Walmdach.
  Grüne Straßennamenschilder, Parkzonen-Schilder, junge Bäume mit Pfählen.
- **Rüssenstraße, Drusselstraße, Lauwetter** (`ruessenstrasse_1`, `drusselstrasse_1`, `lauwetter_1`): nur die Einmündungen an der Friedrich-König-Straße.
  Gemusterte Hochhäuser, ein Schieferhaus mit weißen Fensterrahmen direkt an der Kreuzung, ein rot verputztes Haus, ein langer Büroriegel mit
  Fensterbändern, Natursteinmauer am Gehweg.
- **Naumannstraße, Senfte, Blücherstraße, Puschkinstraße, Dombergweg**: je ein Bild von der Hauptstraße aus – ein Fachwerkhaus an einer Ampel,
  ein hellgrünes Haus mit Wegweiser, ein Geschäftshaus mit großem verglastem Bogen, das Viadukt. Die Straßen selbst sind nicht erfasst.
- **Hauptkirche St. Marien**: das einzige Straßenfoto im Umkreis zeigt einen Parkscheinautomaten.

### Der Kern in den Commons-Fotos

Die Fußgängerzone zeigen nur die Commons-Blätter (`commons/` auf `ref/suhl-fotos`, 77 Blätter mit 357 Fotos, gemacht in GitHub Actions). Angesehen habe
ich `steinweg_1/2`, `markt_1/2`, `rathaus-am-markt_2`, `kreuzkirche_1`, `hauptkirche-st-marien_1`, `waffenmuseum-malzhaus_1`, `congress-centrum-suhl_1`,
`strasse-am-bahnhof_1`, `strasse-platz-der-deutschen-einheit_1`, `strasse-kirchgasse_1`. Die Fotos sind meist von 2023 bis 2026, zu Fuß aufgenommen,
scharf und farbtreu – für Fassaden die beste Quelle. Die Gruppen sind nach Wörtern gebildet: unter „Rathaus“ stehen auch das Neue Rathaus und das
ehemalige Rathaus von Schmiedefeld.

- **Rathaus am Markt:** dreigeschossiger Barockbau, **dunkelrot verputzt**, weiße Fensterrahmen und Lisenen, geschweifter Mittelgiebel mit Uhr,
  Schiefer-Mansarddach mit Dachreiter. Freitreppe, Fahnen. Rechts schließt ein weißer zweigeschossiger Bau mit rotem Ziegeldach an.
- **Marktplatz:** graues Kleinpflaster, Bäume mit Bänken, ein Brunnen aus großen Findlingen. Dreigeschossige Häuser in Rosa, Creme und Weiß mit
  roten Ziegeldächern und Gauben, Läden im Erdgeschoss. Die Adler-Apotheke (Marktplatz 4) trägt einen goldenen Adler an der rosa Fassade.
  Marktplatz 10: Erdgeschoss aus hellem Naturstein mit Rundbögen, darüber Schiefer. Marktplatz 2: weiß verputzt, Ecken und Fensterrahmen aus Naturstein.
- **Steinweg:** Fußgängerzone mit hellem Platten- und Pflasterbelag. Steinweg 13: drei Geschosse und Dachgauben, gelb verputzt, Läden mit
  Schriftzügen, verglaster Eck-Erker. Am Nordende das Einkaufszentrum „Am Steinweg“ mit dunkelroter Fassade – **im August 2025 eingerüstet** –,
  davor Bushaltestellen mit langem Dach an der Friedrich-König-Straße und ein Imbiss-Häuschen aus Holz. Über die Friedrich-König-Straße
  führt beim Lauterbogen-Center eine Fußgängerbrücke (auf einem Foto im Hintergrund zu sehen). Am Südende die Kreuzkirche und das ehemalige Postamt aus rotem Backstein.
- **Hauptkirche St. Marien:** gelb verputzt, graue Gliederung, hohe Rundbogenfenster, rotes Ziegeldach, Turm mit Schieferhaube. Sie steht erhöht:
  eine breite Steintreppe führt vom Steinweg hinauf, davor ein großer alter Baum. Westportal mit Natursteinrahmen, im Giebel ein goldfarbenes Strahlenrelief.
- **Kreuzkirche:** Barockkirche, gelb und weiß, Turm mit Schieferzwiebel und grüner Laterne, rotes Ziegeldach; steht über der Schleusinger Straße
  an einem Hang mit Treppen und Geländern. Ein Drohnenfoto von 2025 (CC0) zeigt Kirche, Postamt und die Dächer ringsum.
- **Waffenmuseum (Malzhaus):** langer Bau, Erdgeschoss hell verputzt, Obergeschoss **Fachwerk** (dunkles Holz, weiße Felder), großes rotes Ziegeldach;
  davor eine dunkle Metallfigur auf einer Bank. Daneben ein kleineres Fachwerkhaus mit roten Fensterrahmen, dahinter Hochhäuser.
- **CCS und Platz der Deutschen Einheit:** großer gepflasterter Platz mit Streifenmuster. Das CCS ist ein langer, niedriger, gelber Bau mit einer
  runden Trommel darüber und einem Glasvordach am Eingang; der Eingang zum Fahrzeugmuseum liegt in einem runden Eckbau auf Säulen. Daneben ein graues
  Turmhochhaus mit rundem Kranz und Antenne. Am Platz: das Haus der Geschichte (Pfeilerfront mit Giebel, auf einer Terrasse mit breiter Treppe),
  ein etwa siebengeschossiges Bürohaus mit blau-weißer Rasterfassade über einem Säulengang, ein Hotel mit Glasfront, ein Wohnhochhaus mit roten Balkonbändern.
- **Am Bahnhof:** ein etwa elfgeschossiges Wohnhochhaus (Am Bahnhof 1) mit verwahrlosten, besprühten Nebengebäuden (Fotos vom 4.10.2026), ein gelbes Haus
  mit rotem Dach (Nr. 10), eine bemalte Unterführung, das Grand Hotel. Das Empfangsgebäude ist auf dem angesehenen Blatt nicht dabei.
- **Kirchgasse, Untere Kirchgasse:** enge Gassen mit grauem Kleinpflaster, ein rot verputztes viergeschossiges Haus mit Erker, Reste einer Bruchsteinmauer.

Was OpenStreetMap so nicht hat und die Bilder zeigen: die **Stützmauern** (Bruchstein in der Altstadt, Quader und glatte Betonwände an den Hauptstraßen),
die **Schieferfassaden**, die **Muster der Hochhausfassaden**, Vordächer der Ladenzeilen, Geländer, Leuchtenformen (Bogenhals in der Altstadt,
Peitschenmast an den Hauptstraßen), Pflasterstreifen vor den Häusern, das Viadukt mit seinen zwei Bauarten (Natursteinbogen und Stahlträger).

## Fotoliste für Falko

Eigene Fotos helfen am meisten hier, in dieser Reihenfolge (zehn Zeilen):

1. **Steinweg** ganz (417 m Fußgängerzone): beide Seiten, jedes Haus.
2. **Marktplatz** mit Rathaus, Kirchgasse, Marienstieg und der Hauptkirche St. Marien von allen Seiten.
3. **Bahnhof:** Vorplatz, Empfangsgebäude, „Am Bahnhof“, Bahnhofstraße bis zur Friedrich-König-Straße.
4. **Platz der Deutschen Einheit**, Haupteingang des CCS, Lauterbogen-Center, Rimbachstraße; dazu Kreuzkirche, Waffenmuseum, Stadtbücherei.
5. Straßen ohne oder fast ohne Fotos: Am Domberg, Kefersteinstraße, Lauwetter, Friedrich-Engels-Straße, Gutenbergstraße, Am Burghof, Döllstraße, Dombergweg, Backstraße.
6. **Friedrich-König-Straße** zu Fuß auf dem Gehweg: Hochhäuser und Ladenzeile quer fotografiert – das fehlt ganz.
7. So aufnehmen: Standort und Kompass am Handy einschalten, Querformat, nicht zoomen, nicht durch eine Scheibe, heller bedeckter Tag.
8. Alle 5 bis 8 Schritte stehen bleiben: ein Bild geradeaus, eines genau quer nach links, eines genau quer nach rechts – so überlappen die Bilder um mehr als die Hälfte.
9. Jede Fassade zusätzlich einmal ganz von gegenüber, Ecken von beiden Straßen aus.
10. Noch besser: eine 360°-Kamera am Stab, ein Bild alle 3 bis 5 m, einmal durch jede Straße.

## Lücken und Unsicheres

- **KartaView:** im ganzen Gemeindegebiet keine Bilder (`kartaview.json`: 369 Kreise von 500 m, alle leer, kein Fehler; dieselbe Abfrage liefert in
  Erfurt Bilder von 2016). Der erste Versuch aus GitHub Actions ging an die alte Adresse `api.openstreetcam.org`
  und scheiterte am Zertifikat (`log/kartaview.log`); die Schnittstelle `api.kartaview.org/2.0/photo/` antwortet ohne Konto, höchstens 500 m Umkreis je Frage.
  Lizenz laut OpenStreetMap-Wiki CC BY-SA 4.0 (https://wiki.openstreetmap.org/wiki/KartaView).
- **Mapillary:** nicht abgefragt (Konto nötig). Abdeckung von Suhl unbekannt.
- **Commons:** Der Kategorienbaum wurde bei 700 Kategorien abgebrochen (Ebene 5 nur zum Teil). Eine der 144 Standort-Abfragen meldete „Suche überlastet“ –
  dort können Fotos fehlen. „Außenansicht“ und die Zuordnung zu Wahrzeichen gehen nach Wörtern, nicht nach dem Bild. Von den 77 Commons-Blättern
  habe ich zwölf angesehen (siehe oben); die übrigen sind ungesehen.
- **Blick quer:** hängt an der Blickrichtung. Für „sixsixfive“ und „cucu“ ist sie aus der Fahrtrichtung geschätzt; stehende Autos haben keine (418 verschiedene Fotos, im Katalog „metadaten (unsicher)“).
- **Position:** Handy-GPS, laut Panoramax etwa 5 m genau (`acc_m`). Für den Foto-Abgleich im Test reicht das nicht ohne Nachjustieren von Hand.
- **Seiten A/B** sind nach der Himmelsrichtung der Straßenachse benannt; bei gewundenen Straßen nur grob.
- **Viertel** = nächster Ortspunkt aus OpenStreetMap, keine amtlichen Grenzen.
- Zwei Vorschaubilder ließ der Panoramax-Server bei einem früheren Lauf nicht laden; in der jetzigen Auswahl kommen sie nicht vor (122 von 122 geladen).
- **Commons-Blätter:** Bei vielen Fotos steht statt des Datums nur „Taken on …“ unter dem Bild (das Datumsfeld von Commons war anders geschrieben als
  erwartet). Das Datum steht meist im Dateinamen und vollständig im Katalog. Im Werkzeug ist das behoben; die Blätter werden beim nächsten Lauf richtig.

## Lizenzen und Namensnennung

- **Panoramax:** CC BY-SA 4.0. Nennung: „Foto: <Urheber>, CC BY-SA 4.0, via Panoramax“. Gesichter und Kennzeichen sind dort verpixelt.
- **Wikimedia Commons:** Lizenz je Foto im Katalog (`license`, `license_url`, `author`). Feld `nutzung`: „frei“ = CC0, CC BY, CC BY-SA, gemeinfrei; sonst „nur ansehen“.
- **Openverse/Flickr:** 142 von 183 mit NC oder ND – „nur ansehen“, nie auf Blätter, nie als Textur.
- **OpenStreetMap** (Straßen, Gebiete): © OpenStreetMap-Mitwirkende, ODbL.
- Auf den Kontaktabzügen stehen nur frei lizenzierte Fotos; jedes Foto mit Urheber, Lizenz und Link in `CREDITS.md` auf `ref/suhl-fotos`.
- Fotos liegen nie auf `suhl/fotos`. Geht später ein Foto sichtbar ins Modell ein, gehört die Nennung nach `viz3/buildlib/credits.py`.

## Für den Suhl-Chat

- **`.gitignore` hat die Regel `out/`.** Alles unter `tools/suhl/out/` braucht `git add -f` (auch bei `suhl-bestand`). Vorschlag für Stufe 2: Ausnahme `!tools/suhl/out/` in `.gitignore`.
- **Für den Foto-Abgleich `blick` nehmen, nicht `heading`.** Beste Kandidaten für eine automatische Gegenüberstellung: die Folgen von „R_A“/Garmin
  (Richtung stimmt mit der Fahrt überein) – sie liegen aber außerhalb des Zentrums. Im Zentrum gibt es nur die Handy-Folgen.
- **Stufe 3 braucht je Fassade ein Foto mit bekanntem Standort.** Vorschlag: Commons-Fotos des Zentrums über Kamerastandort und Gebäudegrundrisse
  (`suhl-bestand`) dem Haus zuordnen, das sie zeigen, und je Haus ein Blatt machen. Viele Dateinamen nennen Straße und Hausnummer („Gebäude Steinweg 13 Suhl …“,
  „Marktplatz 4“) – das lässt sich mit den Adressen aus OpenStreetMap abgleichen. Die Liste je Straße steht in `commons_zentrum.json`.
- Der Workflow startet nur, wenn sich `collect_commons.py`, `collect_kartaview.py` oder die Workflow-Datei ändern. `nach_commons.py` läuft am Ende
  jedes Laufs vom dann aktuellen Stand des Zweigs. `collect_kartaview.py` fragt noch die alte, tote Adresse – ich habe es nicht angefasst, weil die
  Änderung den ganzen Lauf (1 100 Abfragen an Wikimedia) neu gestartet hätte. Beim nächsten Lauf im Workflow durch `kartaview.py` ersetzen.
- **Die Gruppen der Commons-Blätter sind nach Wörtern gebildet und teils zu weit:** „Bahnhof“ enthält auch die Bahnhöfe Dietzhausen und Rennsteig,
  „Luftbilder und Stadtansichten“ auch die Dombergbaude. Für Stufe 3 besser nach Kamerastandort und Gebäude gruppieren.
- Weitere Funde auf den Commons-Blättern: das Hochhaus Friedrich-König-Straße 44 von nahem (rot-weißes Fassadenmuster), Drohnenfotos der Punkthochhäuser
  im Wohngebiet Nord (Januar 2024), ein Blick über die Stadt von Südwesten, Metallplatten mit Schrift im Pflaster (unter „Friedrich-König-Straße“ einsortiert).
- Die 393 Seitenkamera-Fotos von „R_A“ (12.4.2026) zeigen die Autobahn mit Tunnelportalen und Leitplanken – brauchbar für die Anfahrt über A 73/A 71.
- Die Kopie der Gebiete neu holen, wenn `suhl-bestand` sie ändert: `git show origin/suhl/bestand:tools/suhl/out/bestand/gebiete.geojson > tools/suhl/out/fotos/gebiete.geojson`,
  dann `collect_panoramax.py`, `collect_osm.py`, `merge.py`, `coverage.py` neu laufen lassen.
- Die Karte `karten/abdeckung_zentrum.png` zeigt auf einen Blick, wo Falkos Rundgang nötig ist: alles Rote innerhalb des Rings der Hauptstraßen.

## Neu erzeugen

```
python3 tools/suhl/fotos/collect_panoramax.py        # Panoramax, etwa 1 Minute
python3 tools/suhl/fotos/collect_osm.py              # Straßennetz der Kernstadt, 30 Abfragen an die OSM-API
python3 tools/suhl/fotos/collect_openverse.py        # Openverse, etwa 10 Minuten
python3 tools/suhl/fotos/kartaview.py                # KartaView, 369 Abfragen über das Gemeindegebiet, etwa 7 Minuten
# Commons: nur in GitHub Actions – ein Push, der collect_commons.py ändert, startet den Lauf (etwa 30 Minuten)
python3 tools/suhl/fotos/merge.py                    # katalog_suhl.json.gz, quellen.json
python3 tools/suhl/fotos/coverage.py                 # abdeckung.json, abdeckung_strassen.csv
python3 tools/suhl/fotos/nach_commons.py /tmp/x --no-sheets   # commons_zentrum_lokal.json
python3 tools/suhl/fotos/sheets.py /tmp/suhl-ref && python3 tools/suhl/fotos/karten.py /tmp/suhl-ref
bash tools/suhl/fotos/push_ref.sh /tmp/suhl-ref      # ein Commit ohne Vorgeschichte auf ref/suhl-fotos
```
