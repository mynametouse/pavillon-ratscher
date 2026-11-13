# Suhl – Grün: Bäume, Wald, Grünflächen (Paket S2-4)

Stand 13.11.2026, Agent `suhl-gruen`, Zweig `suhl/gruen`. Auftrag: `docs/plans/auftraege/suhl-gruen.md`.
Der Zweig ist die Wahrheit; dieses Dokument wächst mit. Jede Zahl nennt ihre Datei.

**Lesehilfe.** „gemessen“ = aus dem Luftbild oder dem Höhenmodell abgelesen. „geschätzt“ = nach einer Regel gesetzt; in den Daten
trägt jedes solche Feld einen Merker.

## 1 Was es gibt

| Produkt | Inhalt | Ordner im Probesatz | Größe (11 Kacheln) |
|---|---|---|---|
| `b` Bäume | jeder einzelne Baum: Lage, Höhe, Kronenradius, Art, Merker (8 Byte) | `tools/suhl/out/gruen/probe/suhl/b/v0/` (nur Luftbild), `…/b/v1/` (mit Höhenmodell) | 78 kB |
| `w` Waldbestände | je Kachel 20 × 20 Zellen zu 20 m im kartierten Wald: Klasse, Nadelanteil, Deckung, Höhe, Dichte, Merker; dazu Bestands-Umrisse | `…/suhl/w/v0/`, `…/w/v1/` | 3 Kacheln, je 2,4 kB |
| `gr` Grünflächen | kartierte Flächen mit Belag (Rasen, Wiese, Park, Garten, Friedhof, Sportplatz …) als Polygone je Kachel; dazu je Kachel eine **Grünmaske** (2-m-Zellen: kein Grün / niedriges Grün / Gehölz), gemessen im Luftbild | `…/suhl/gr/v0/`, `…/gr/v1/` | 11 Kacheln, 88 kB + Masken |

- **Probesatz Zentrum:** die 11 Kacheln der Stufe 10 (je 400 m), die `zentrum` berühren. `v0` = nur aus dem Luftbild, `v1` = mit
  dem Höhenmodell nDOM1. Zahlen: `tools/suhl/out/gruen/probe/statistik_v0.json`, `statistik_v1.json`.
- **Ganze Stadt:** rechnet der Workflow `.github/workflows/suhl-gruen.yml`; die Produkte liegen als Artefakte `suhl-b-v<N>`,
  `suhl-w-v<N>`, `suhl-gr-v<N>` am Lauf (Abschnitt 9), die Zahlen unter `tools/suhl/out/gruen/actions/stadt/`. Veröffentlicht wird
  nicht hier: `suhl-daten` nimmt die Artefakte und veröffentlicht sie als Satz.
- **Vertrag:** `b`, `w` und `gr` sind seit Fassung 1.1 im Schema von `suhl-daten` eingetragen (`docs/features/suhl-daten.md`);
  der Prüfer `tools/suhl/lib/validate.py` läuft in jedem Lauf mit und ergänzt den gemeinsamen Teil der drei `index.json`.
- **Bilderbögen** (Luftbild mit den Bäumen, Vergleich Modell gegen Luftbild, Waldklassen, Höhenmodell) liegen nur auf dem
  Wegwerf-Zweig `ref/suhl-gruen` – ansehen mit `git fetch origin ref/suhl-gruen && git show origin/ref/suhl-gruen:CREDITS.md`.

## 2 Zahlen

### Probesatz Zentrum, v0 (nur Luftbild) – `statistik_v0.json`, `kachel_statistik_v0.json`

| Größe | Zahl |
|---|---|
| Bäume in 11 Kacheln (176 ha) | 9 730, das sind 55 je Hektar |
| nach Art | 8 816 Laubbäume, 250 Nadelbäume (2,6 %), 650 Sträucher/sehr kleine Bäume, 14 mit kartierter Art (13 Buchen, 1 Erle) |
| nach Standort (ohne Sträucher) | 1 695 im Wald, 1 249 Straßenbäume, 897 in Park/Grünanlage/Friedhof, 3 892 in Garten/Hof/Wohngebiet, 1 347 sonst |
| Kronenradius | Median 4,0 m (5 %: 1,4 m, 95 %: 8,4 m); Kronenfläche zusammen 72 ha |
| Höhe | alle geschätzt (Median 12,9 m) |
| Dichte nach Nutzung | Wald 78 je ha, Wohngebiet 45, Kleingarten 107, Parkplatz 21, Sportplatz 6 |
| kartierte OSM-Bäume | 389 der Bäume sind in OSM kartiert; 86 stehen an der OSM-Lage (keine eigene Krone gefunden) |
| auf Dach / in Fahrbahn / auf Wasser / doppelt | 0 / 0 / 0 / 0 |
| Waldzellen (`w`) | 21,4 ha in 3 Kacheln: 16,6 ha Laubwald, 1,0 ha Mischwald, 3,8 ha „glatte Krone“ |

### Probesatz Zentrum, v1 (mit Höhenmodell) und ganze Stadt

Stehen nach den Läufen in Abschnitt 9 („Läufe“) und in den dort genannten Dateien.

## 3 Wie die Bäume gefunden werden

Werkzeug: `tools/suhl/gruen/baeume.py`. Eingaben: das Infrarot-Luftbild des Landes (20 cm, Bildflug 15.05.2024, das Laub ist
da), OpenStreetMap, Gebäude-Grundrisse – und, wo es vorliegt, das Höhenmodell nDOM1 (Laser, 1 m, 2020–2025).

1. **Grün.** Pflanzen sind im nahen Infrarot hell und im Rot dunkel (Index NDVI über 0,15). Nie auf Wasser.
2. **Gehölz statt Rasen.** Kronen sind im Meter-Maßstab unruhig (Licht und Schatten zwischen den Ästen), Rasen ist glatt.
   Schatten von Bäumen auf Rasen sehen ähnlich unruhig aus, sind aber dunkel – deshalb zählt ohne Höhenmodell nur, was in der
   Sonne liegt (im kartierten Wald auch der Schatten).
3. **Kronen trennen.** Wasserscheiden-Verfahren. Ohne Höhenmodell entscheiden die hellen Kronenspitzen; in Nadelholz enger.
   Kronenradius aus der Kronenfläche.
4. **Mit Höhenmodell:** Der Laser flog **ohne Laub** (auf den ersten Bögen gesehen, 13.11.2026): Nadelbäume, Hecken und
   geschlossene Bestände sieht er dicht, eine kahle Laubkrone gibt nur einzelne Treffer oder keinen. Deshalb gilt:
   Grün mit Laser-Höhe ab 2,5 m zählt als Krone auch im Schatten von Häusern – dort konnte das Luftbild allein nichts finden.
   Baumspitzen des Lasers gelten nur in großem, dichtem Kronendach (ab 300 m²: Nadelholz, geschlossener Bestand); sonst
   entscheiden weiter die hellen Kronenspitzen des Luftbilds. Die Höhe eines Baums ist die zweithöchste Laser-Zelle unter seiner
   Krone (eine einzelne kann eine Laterne sein), nicht näher als 2 m an einer Hauswand. Sie zählt als **gemessen**, wenn der
   Laser genug von der Krone gesehen hat: mindestens drei Zellen mit Treffer, und entweder dicht (40 % der Zellen) oder passend
   zur Krone (mindestens 0,6 der Schätzung – darunter kamen die Treffer von den unteren Ästen). Sonst bleibt die Schätzung.
5. **Kein Baum auf dem Dach oder in der Fahrbahn.** Der Stamm steht in der Mitte des Kronenteils, der weder auf einem
   Gebäude-Grundriss (OSM und ETHOS, 0,3 m Rand) noch auf einer Fahrbahn (OSM-Achse, Breite nach Straßenart, 0,5 m Rand) liegt.
   Eine Krone, die ganz auf einem Dach liegt (Dachgarten), entfällt.
6. **OSM-Bäume.** Ein kartierter Baum bestätigt die Krone neben sich als Baum und gibt die Art, wo eine eingetragen ist. Die
   Lage bleibt die der Krone (das Luftbild ist schärfer; die Baumreihen am Markt liegen in OSM 2–3 m daneben). Kartierte Bäume
   ohne eigene Krone werden an der OSM-Lage gesetzt, wenn dort Grün ist – oder wenn sie nach dem Bildflug neu kartiert wurden
   (Neupflanzung, als Jungbaum 4 m).
7. **Art.** Nadelbäume sind im nahen Infrarot auch in der Sonne dunkel (im Wald über Goldlauter zwei klare Gruppen). Im
   kartierten Wald gilt ein Nadelbaum als Fichte (Schätzung). Mit Höhenmodell heißt „Strauch“: gemessen unter 3 m.

### Laser und Luftbild: wer entscheidet was

Das Luftbild ist vom 15.05.2024 (mit Laub), der Laser aus den Jahren 2020–2025 (ohne Laub; den Tag nennt der Dienst nicht –
`statistik_v1.json` → `ndom.datenstand_laut_dienst`). Der Laser kann also vor **oder** nach dem Bild geflogen sein, und eine
kahle Laubkrone sieht er oft kaum. Die Regel:

| Luftbild 2024 | Laser | Ergebnis | Merker |
|---|---|---|---|
| Krone | genug Treffer | Baum; Höhe aus dem Laser | Höhe gemessen |
| Krone | wenige oder keine Treffer | Baum bleibt (kahle Krone oder seither gewachsen); Höhe geschätzt wie ohne Laser | Höhe geschätzt |
| Grün im Schatten oder mit ruhiger Oberfläche | hoch | Baum (der Laser sieht, was das Bild nicht beurteilen kann) | Höhe gemessen, wenn genug Treffer |
| glatter Rasen in der Sonne | hoch | kein Baum – hier stand einer (die Fläche wird gezählt) | – |
| kein Grün | hoch | kein Baum (Haus, Mast, Brücke oder gefällt) | – |
| dicht gesehen und unter 3 m | – | Strauch, Hecke, sehr kleiner Baum | Höhe gemessen |

Kurz: **Das Bild entscheidet, ob etwas da ist. Der Laser gibt die Höhe, wo er genug gesehen hat. Der Laser beweist nie, dass
eine Krone des Bilds nicht da ist.** Bäume, die nach dem Bildflug gefällt wurden, bleiben deshalb stehen, bis ein neueres
Luftbild kommt.

## 4 Wald: Bestände statt Einzelbäume (Produkt `w`) – Vorschlag

Im geschlossenen Wald steht nicht jeder Baum einzeln in den Daten. Vorschlag für die Aufteilung:

- **`b` enthält alle Einzelbäume der Kacheln, in denen Menschen nah an Bäume kommen:** Kernstadt, jede Kachel mit mindestens
  drei Gebäuden, jede Kachel mit öffentlicher Straße außerhalb des geschlossenen Walds (416 von 1 013 Kacheln der Stadt). Auch
  Waldbäume in diesen Kacheln stehen in `b` (Merker Bit 7 „im Wald“).
- **`w` beschreibt den kartierten Wald der ganzen Stadt als Raster:** je Kachel 20 × 20 Zellen zu 20 m. Die Laufzeit füllt
  eine Zelle mit Bäumen (Klasse, Höhe, Dichte) – **außer** der Merker Bit 0 sagt „die Einzelbäume dieser Zelle stehen in `b`“.
  Aus der Ferne trägt das Luftbild auf dem Boden die Farbe des Walds.
- **Bestands-Umrisse** für Menschen und Szenarien: `bestaende.geojson.gz` (Zellen einer Klasse zusammengefasst, Fläche in UTM
  gerechnet, Umrisse folgen dem 20-m-Raster).

Datei `w/10/{x}/{y}.bin`: sechs Ebenen zu je 400 Byte, je Ebene 20 Zeilen zu 20 Zellen, **Zeile 0 = Südrand**, Zelle 0 = Westrand.

| Ebene | Inhalt |
|---|---|
| `art` | 0 kein Bestand, 1 Laubwald, 2 Nadelwald (Fichte), 3 Mischwald, 5 Jungbestand/Schlagflur, 6 Blöße/Kahlfläche |
| `nadel` | Anteil Nadelholz an der Krone in Prozent |
| `deckung` | Kronendeckung in Prozent |
| `hoehe` | Bestandshöhe in 0,25 m – gemessen (95-%-Quantil des Höhenmodells in der Zelle), wenn Merker Bit 1; sonst Schätzung nach Klasse |
| `dichte` | Bäume je Hektar / 10 – gezählt (Merker Bit 2: Kronen aus `b` oder Baumspitzen des Höhenmodells), sonst Schätzung |
| `merker` | Bit 0 Einzelbäume in `b`; Bit 1 Höhe gemessen; Bit 2 Dichte gezählt; Bit 3 **seit dem Laserflug geräumt** (Laser zeigt Wald, das Luftbild 2024 keinen – Borkenkäfer-Flächen, Einschlag) |

Klassen aus dem Infrarot-Luftbild bei 1 m: Nadelholz ist dunkel und rau, Laubholz hell, Wiese und junger Aufwuchs glatt.
Lärche lässt sich so nicht von Fichte oder Laubholz trennen (im Mai hellgrün) – offen.

## 5 Grünflächen (Produkt `gr`)

`gr/10/{x}/{y}.json`: `{"f": [[klasse, osm-kennung, [ring, …]], …]}`; ein Ring ist `[x0, y0, x1, y1, …]` in **Dezimetern ab der
Südwest-Ecke der Kachel** (UTM), der erste Ring der Umriss, weitere sind Löcher. Spätere Flächen liegen über früheren.
Klassen: 1 Wald, 2 Gebüsch, 3 Wiese, 4 Rasen, 5 Park, 6 Garten, 7 Kleingarten, 8 Friedhof, 9 Sportplatz, 10 Spielplatz,
11 Acker, 12 Obstwiese, 17 Heide, 18 Feuchtgebiet. Vorschlag für den Belag je Klasse und der kartierte Belag der Sportplätze
stehen im `index.json`. **Grenze:** nur was in OSM als Fläche kartiert ist; Rasen zwischen Wohnblöcken fehlt dort oft.

**Grünmaske** (für die Kacheln mit Einzelbäumen): `gr/10/{x}/{y}.png`, 200 × 200 Bildpunkte zu 2 m, 8 Bit Grau, **Zeile 0 =
Nordrand**, Pixelwert = Klasse: 0 kein Grün (versiegelt, Dach, Wasser, kahler Boden), 1 niedriges Grün (Rasen, Wiese, Beete),
2 Gehölz (Kronendach). Sie ist im Luftbild gemessen (mit Höhenmodell: Gehölz auch im Schatten) und zeigt auch das Grün, das
niemand kartiert hat. Im Probesatz v0: 11,6 ha niedriges Grün, 73,7 ha Gehölz auf 176 ha (`index.json` → `gruenmaske`).

## 6 Format `b` (Bäume)

Eine Datei je Kachel, **8 Byte je Baum**, ohne Kopf, Little Endian. So steht es auch im Vertrag `docs/features/suhl-daten.md`.

| Feld | Typ | Inhalt |
|---|---|---|
| `x` | uint16 | Zentimeter östlich des **Westrands** der Kachel (UTM, 0 … 39 999) |
| `y` | uint16 | Zentimeter nördlich des **Südrands** |
| `h` | uint8 | Baumhöhe in 0,25 m |
| `r` | uint8 | Kronenradius in 0,1 m |
| `art` | uint8 | 0 Laubbaum, 1 Nadelbaum, 2 Fichte, 3 Kiefer, 4 Lärche, 5 Tanne/Douglasie, 10 Linde, 11 Ahorn, 12 Eiche, 13 Buche, 14 Birke, 15 Esche, 16 Rosskastanie, 17 Platane, 18 Pappel, 19 Weide, 20 Obstbaum, 21 Robinie, 22 Hainbuche, 23 Eberesche, 24 Erle, 25 Zierkirsche, 30 Strauch/Hecke/sehr kleiner Baum |
| `merker` | uint8 | Bits 0–1 Herkunft der Lage: 1 Krone im Luftbild, 2 OSM-Baum, 3 Baumspitze des Höhenmodells; Bit 2 (4) Höhe gemessen; Bit 3 (8) Kronenradius gemessen; Bit 4 (16) Art kartiert; Bit 5 (32) Stamm von Dach oder Fahrbahn weggerückt; Bit 6 (64) in OSM kartiert; **Bit 7 (128) steht im kartierten Wald** |

Die Geländehöhe steht nicht in der Datei – die Laufzeit fragt den Boden. Lesen: `baeume.unpack` (Python);
`E = E0 + x / 100`, `N = N0 + y / 100`, dann UTM → Modell mit `xf`.

## 7 Wie sicher ist was

| Feld | ohne Höhenmodell (v0) | mit Höhenmodell (v1) |
|---|---|---|
| Lage | Mitte der Krone im Luftbild; frei stehende Bäume auf etwa 1 m, in geschlossenem Kronendach 2–4 m (eine Krone kann zwei Bäume sein oder umgekehrt) | Baumspitze des Lasers bestimmt die Krone; in geschlossenem Kronendach deutlich sicherer |
| Kronenradius | aus der Kronenfläche bei 20 cm; frei stehend gut, im Kronendach von der Trennung abhängig | gleich, Trennung besser |
| Höhe | **geschätzt** aus Radius und Art – kann um mehrere Meter falsch sein | **gemessen**, Laser auf wenige Dezimeter; gilt für den Tag des Laserflugs (bis zu vier Jahre vor dem Bild) |
| Art Laub/Nadel | aus der Infrarot-Signatur; im Wald zuverlässig, in der Stadt unsicher (Laubbäume im Halbschatten sehen wie Nadelbäume aus) | gleich |
| Baumart | nur wo OSM sie nennt | gleich |
| Bäume im Schatten von Häusern | **fehlen** | gefunden |
| Sträucher | nach Kronengröße geraten | nach gemessener Höhe (unter 3 m) |

## 8 Prüfungen

`tools/suhl/gruen/pruefen.py` (läuft in jedem Lauf, Ergebnis in `statistik*.json` → `pruefung`): kein Baum auf einem
Gebäude-Grundriss, in einer Fahrbahn oder auf Wasser; keine doppelten (unter 0,75 m); die Kachel mit dem Mittelpunkt von Suhl ist
dabei; Bäume je Hektar nach Nutzung; Zählung gegen OSM. Der Prüfer von `suhl-daten` (`tools/suhl/lib/validate.py`) läuft mit.

Vergleich Modell gegen Luftbild an drei Orten (`bogen.py --vergleich`, Bögen auf `ref/suhl-gruen`, Ordner `vergleich/`), für v0:

| Ort | Bäume | Gehölz des Bilds von Kronen bedeckt | Kronenfläche auf Nicht-Grün |
|---|---|---|---|
| Zentrum (Markt) | 73 | 85 % | 11 % |
| Plattenbau-Gebiet (Aue) | 190 | 85 % | 4 % |
| Waldrand (Domberg) | 288 | 86 % | 2 % |

Die Kreise sind eine Vereinfachung der Kronen: 100 % sind nicht erreichbar. Am Markt stehen kleine Bäume vor Pflaster, dort
ragt ein Kreis schnell über das Grün hinaus.

## 9 Läufe

| Lauf | Gebiet | Was | Ergebnis |
|---|---|---|---|
| 43340725672 | stadt | v0: nur Luftbild, ganze Stadt | siehe unten |

## 10 Quellen und Nennung

| Quelle | Wofür | Lizenz, Nennung |
|---|---|---|
| DOP20 Thüringen, Ebenen `th_dop` und `th_dop20cir` (WMS), Bildflug 15.05.2024 | Grün, Kronen, Art, Waldklassen | © GDI-Th, CC BY 4.0 |
| nDOM1 Thüringen (Oberfläche minus Gelände, 1 m, Laser 2020–2025) | Baumspitzen, Höhen, Bestandshöhen | © GDI-Th, CC BY 4.0, bezogen über easygeodata.de |
| OpenStreetMap (Geofabrik-Auszug Thüringen) | kartierte Bäume, Gebäude, Straßen, Wasser, Wald- und Grünflächen | © OpenStreetMap-Mitwirkende, ODbL 1.0 |
| ETHOS.BUILDA (Zenodo 11845992) | Gebäude-Grundrisse, nur zum Ausschluss von Dächern | Forschungszentrum Jülich, ODbL 1.0 |

Jede `index.json` trägt Quellen und die Zeile für die App.

## 11 Neu rechnen

```
# Chat-Rechner (nur Probesatz, nur Luftbild – das Höhenmodell darf nur in GitHub Actions geholt werden):
python3 -I tools/suhl/gruen/kontext.py                                  # einmal: Gebäude, Straßen, OSM-Bäume, Flächen in den Roh-Cache
python3 -I tools/suhl/gruen/stadt.py --gebiet zentrum --out /tmp/gruen   # b, w, gr, Prüfung, Statistik
python3 -I tools/suhl/gruen/bogen.py --b /tmp/gruen/suhl/b/v0 --out /tmp/bogen --vergleich
bash tools/suhl/gruen/bilder.sh /tmp/bogen                               # Bögen (mit CREDITS.md) auf ref/suhl-gruen

# GitHub Actions: tools/suhl/gruen/lauf.txt ändern und pushen = neuer Lauf
#   gebiet=zentrum|kernstadt|stadt   version=N   ndom=P1 | P1,P2 | P1,P2,P3 (leer = ohne Höhenmodell)
```

Ein späterer Lauf mit besseren Eingaben ersetzt eine Version; nichts wird von Hand geändert. Luftbilder und Höhenkacheln liegen
im Cache des Workflows und werden nie zweimal geholt.

## 12 Für den Suhl-Chat

- **Schema (an `suhl-daten`):** `w` und `gr` sind eingetragen (Fassung 1.1). Noch nachzutragen: Merker Bit 7 (128) in `b`
  („steht im kartierten Wald“), Merker Bit 3 (8) in `w` („seit dem Laserflug geräumt“) und die Grünmaske `gr/…/{y}.png`.
- **Kein `based_on`:** Dächer und Fahrbahnen kommen aus OSM und ETHOS, nicht aus einer Fassung von `g` oder `s`. Sobald `g`
  und `s` für die ganze Stadt stehen, kann der Prüfer die Bäume gegen sie prüfen (Paket S2-8).
- **Standort der Bäume** (Straßenbaum, Park, Garten, Wald) steht nicht in der Kachel; die Zahlen dazu stehen in der Statistik.
  Wenn die Laufzeit ihn braucht (Modellwahl), schlage ich Art-Nummern 40–43 vor: Straßenbaum, Parkbaum großkronig, Gartenbaum
  kleinkronig, Waldbaum Laub – als Formklassen, nicht als erfundene Baumarten.
- **Baumarten:** ein offenes Baumkataster der Stadt Suhl habe ich nicht gefunden (eine Suche). Baumarten stehen deshalb nur dort,
  wo OSM sie nennt.
- Offene Punkte und nächste Schritte: Abschnitt 13.

## 13 Offen, nächste Schritte

- Nadel/Laub in der Stadt ist unsicher (Halbschatten); mit der Kronenform aus dem Höhenmodell ließe es sich verbessern.
- Lärche im Wald nicht getrennt.
- Die Waldklassen sind nicht um die Hangbeleuchtung bereinigt: Laubwald an sonnenabgewandten Hängen kann als Mischwald gelten.
- Grünmaske aus dem Luftbild (Rasen/Gehölz je 2 m) als kleines Raster für den Boden-Shader – noch nicht gebaut.
- Jeder Waldbaum einzeln aus dem Höhenmodell (wie die 21 000 Bäume des Dorfs) – möglich, wenn die Laufzeit es will.
