# Suhl – Straßen: Suhls Straßen als Daten für das Straßensystem der Region (Paket S2-3)

Stand: 13.11.2026, 1:35 Uhr. Hilfs-Agent `suhl-strassen`, Stufe 2 des Suhl-Plans (Auftrag `docs/plans/auftraege/suhl-strassen.md`,
gemeinsamer Teil `suhl-gemeinsam.md`, `suhl-stufe2.md`). Zweig `suhl/strassen`. Dieses Paket ändert keine vorhandene Datei.

**Grundsatz:** Suhl baut kein zweites Straßensystem. Die Straßen der Stadt kommen im Format der Fahrtdaten (`fahrt/strassen.json`).
Gezeichnet werden sie vom Straßensystem des Straßen-Chats (`feat/strassen`, Stand `f06ee1a` vom 13.11. 0:52). Dieses Dokument sagt
zuerst, wie dieses System die Daten liest und was Suhl von ihm braucht (Schritt 1). Die Schritte 2 bis 6 des Auftrags folgen unten,
sobald sie fertig sind.

| Schritt | Stand |
|---|---|
| 1 Format verstehen, Grenzen und Fragen | **fertig** (Abschnitte 1, 2 und „Für den Suhl-Chat“) |
| 2 Probesatz Zentrum (`s/`-Kacheln und `fahrt/suhl-zentrum.json`) | in Arbeit |
| 3 Ganze Stadt in GitHub Actions, Wasser, Bahn, beide Routen | offen |
| 4 Ausstattung (Werkzeug des Straßen-Chats, dazu Ampeln, Überwege, Haltestellen, Laternen, Straßenschilder) | offen |
| 5 Prüfungen | offen |

## 1 Das Format der Fahrtdaten – so liest es das Straßensystem

Gelesen aus `viz3/extra/fahrt/strecke.py` (schreibt die Datei), `viz3/src/welt/fahrt.js` (`parse`, lädt sie), und auf `feat/strassen`:
`viz3/src/strassen/strassen_stil.js`, `strassen_karte.js`, `strassen_daten.js`, `viz3/src/world/roads.js` (`roadShade`),
`viz3/extra/strassen/daten.py`. `strecke.py`, `fahrt.js` und `tools/welt/roads.py` sind auf `feat/strassen` und auf unserem Zweig gleich.

Eine Datei, JSON, Version `v: 1`. Alle Lagen in Modellmetern (x Ost, y Nord, z = Höhe über NHN minus `H0`), als ganze Zahlen in
Dezimetern.

| Feld | Inhalt | Wer es liest |
|---|---|---|
| `kinds` | Liste der Straßenarten. Die Stelle in der Liste ist die Nummer: 0 `motorway`, 1 `main`, 2 `county`, 3 `street`, 4 `lane`, 5 `service`, 6 `track`, 7 `path`, 8 `foot` | `fahrt.js`, Straßenkarte, Shader |
| `surf` | Liste der Beläge: 0 `asphalt`, 1 `concrete`, 2 `paving`, 3 `gravel`, 4 `ground`, 5 `grass` | ebenso |
| `names` | Tabelle der Namen und Nummern (Stelle 0 ist leer) | `fahrt.js` (Ortsanzeige) |
| `ways` | je Straßenstück: `[Art, Belag, Breite in dm, Merker, Name, Nummer, [x, y, z, x, y, z, …]]` | alle |
| Merker `fl` | Bit 1 Brücke, Bit 2 Tunnel, Bit 4 Einbahnstraße. Die App wertet nur 1 und 2 aus. Der erste Suhl-Versuch setzte dazu 8 (Autobahn-Fahrbahn) und 16 (Rampe) und eine Liste `lanes` neben `ways`. | `fahrt.js`, `strassen_karte.js`, `daten.py` |
| z der Punkte | das **geglättete Längsprofil**. Die App schneidet den Boden danach zurecht: Fahrbahn mit 2,5 % Dachgefälle, daneben 2,5 m ebener Streifen, dann Böschung 1 : 2, Reichweite 18 m (`fahrt.js`, `carveZ`). | `fahrt.js` |
| `places` | bebaute Flächen je Ort: Name, Art (`town`, `village`, `hamlet`), Mittelpunkt, Gemeinde, Ringe in Metern | `fahrt.js` (Ortsanzeige), `daten.py` |
| `signs` | Ortstafeln (`ort`) und Wegweiser (`weg`) | `fahrt.js` |
| `routes` | Routen als Punktlisten mit Länge | `fahrt.js`, Karte |
| `park`, `metric` | Parkplatz der Baumschule; die Prüfzahlen je Art | – |

Was **nicht** in der Datei steht und trotzdem das Aussehen bestimmt:

- **Der Stil** (0 freie Strecke, 1 Überholverbot, 2 Stadt, 3 Dorf) ist kein Feld. Die App rechnet ihn je Teilstück aus den Flächen
  `orte` der Datei `strassen/ausstattung.json` (`STRDAT.placeAt`): liegt die Mitte des Teilstücks in einer Fläche mit `t: 2`, ist
  es Stadt, bei `t: 1` Dorf. `daten.py` macht diese Flächen aus `places`: `town` wird 2, `village` 1, `hamlet` entfällt.
- **Die Ränder** sind keine Linien in den Daten. Die Karte merkt je Bildpunkt den Abstand zum Fahrbahnrand (−4 bis +8 m) und den
  Abstand zur Achse (±8 m). Bordstein, Rinne, Gehweg und Linien entstehen im Shader aus diesen zwei Zahlen. Die Fahrbahn ist
  also immer ein Band gleicher Breite um die Achse.
- **Die Breite** kommt aus OSM `width`, sonst aus `lanes` × 3,25 m (nur Arten 0 bis 2), sonst ein Wert je Art: 9,0 / 6,5 / 6,0 /
  5,0 / 3,6 / 3,0 / 3,0 / 1,4 / 1,8 m. Erlaubt sind 1 bis 16 m (`tools/welt/roads.py`, `classify`).
- Zuordnung der OSM-Arten (`classify`): `secondary` und höher → `main`, `tertiary` → `county`, `residential`, `living_street`,
  `pedestrian` → `street`, `unclassified` → `lane`, `footway`, `cycleway`, `steps` → `foot`. Wege mit `area=yes` und `busway`
  ordnet `classify` gar nicht ein.

In der Stadt (Stil 2) zeichnet der Shader: den Belag nach `surf`; Bordstein und Gehweg auf beiden Seiten an allen Arten 0 bis 3
mit festem Belag (Gehweg 1,7 m an Haupt- und Kreisstraßen, 1,3 m an Straßen), die Rinne nur an Asphalt; eine gestrichelte
Mittellinie (3 m Strich, 6 m Lücke) auf Haupt- und Kreisstraßen ab 5,5 m Breite; keine Randlinien. Quelle: `world/roads.js`
(`roadShade`), `strassen_stil.js` (`marks`).

Die Karte selbst: ein Fenster um den Beobachter, 1 536 m mit 1,5 m je Bildpunkt (Telefon 1 024 m mit 2 m). Die Straßen der Karte reichen
bis 500 m um den Beobachter (Telefon 324 m). Je Bildpunkt gilt **eine** Straße – die, in der er am tiefsten liegt. Brücken und
Tunnel lässt die Karte aus. Die Kodierung hat Platz für 4 Stile × 10 Arten × 6 Beläge. Alle vier Stile und alle sechs Beläge sind
vergeben, **eine Art (Nummer 9) ist frei**.

## 2 Was die Straßenkarte in einer dichten Stadt zeigt – und was nicht

Zahlen für das Zentrum aus `tools/suhl/out/strassen/fenster.json` (Skript `tools/suhl/strassen/fenster.py`; OSM-Stand der Stufe 1
vom 12.11. 23:07 UTC). Die Zahlen der Kernstadt stehen in `docs/features/suhl-bestand.md`.

| Thema | Was das System kann | Was in Suhl anfällt | Folge |
|---|---|---|---|
| Menge im Fenster | laut `docs/features/strassen.md` 10–14 ms je Karte, gerechnet in Scheiben von 2,5 ms je Bild | Fenster 1 536 m um den Suhler Mittelpunkt: **88,7 km Wege in 1 482 OSM-Wegen mit 6 826 Teilstücken** (Auto: 52,7 km; Fußwege 21,7; Pfade 8,8; Wirtschaftswege 5,5). Telefon-Fenster: 45,4 km, 3 525 Teilstücke. Zum Vergleich: die ganze heutige Datei `fahrt/strassen.json` hat rund 168 km in 828 Stücken. | Frage F2 |
| Auflösung | 1,5 m je Bildpunkt; Kanten entstehen aus dem geglätteten Abstand | Fußweg 1,8 m = 1,2 Bildpunkte. Zwei Wege mit weniger als etwa 3 m Abstand laufen ineinander (Richtungsfahrbahnen, Fußweg neben der Straße). | in Stufe 3 eigene Geometrie im Zentrum |
| Datenmenge | eine Datei, einmal geladen; alle Wege im Speicher | Stadt: 1 559 km Wege, davon 288 km für Autos. Zentrum allein: 34,5 km. | Kacheln nötig, Frage F1 |
| Plätze, Fußgängerzone als Fläche | nichts – das Format kennt nur Bänder | Zentrum: **9 Flächen, 21 685 m²** (Steinweg 7 311 m², Platz der Deutschen Einheit 5 565, Marktplatz 2 811, Rimbachstraße, Backstraße, Stadelstraße); dazu 64 Parkplatzflächen, 38 006 m² | Wunsch W2; bis dahin liefert Suhl die Flächen in den `s/`-Kacheln, die Laufzeit legt sie selbst |
| Fußgängerzone und verkehrsberuhigt als Linie | gilt als `street`: Bordstein, Rinne, Gehweg | Zentrum: 0,89 km `pedestrian`, 1,88 km `living_street` | Wunsch W1; bis dahin als Art `foot` mit echter Breite geliefert (kein Bord) |
| Gehwege | überall beidseitig an Arten 0–3, feste Breite; an Zufahrten keine | 9,29 km der Wege im Zentrum tragen eine Gehweg-Angabe; 7,84 km Zufahrten | Wunsch W3 |
| Fahrstreifen, Einbahnstraßen | nur die Mittellinie ab 5,5 m; keine Pfeile, keine Busspur | 4,59 km mit `lanes`, 8,02 km Einbahnstraße. Eine Einbahnstraße ab 5,5 m bekommt eine Mittellinie – richtig bei zwei Spuren, falsch bei einer. | Wunsch W4 |
| Kreisverkehr | ein Ring als Band; ab 5,5 m mit Mittellinie | im Zentrum keiner; in der Stadt und an ihrem Rand 19 Ringstücke (OSM-Stand der Stufe 1), 14 davon an Haupt- und Landesstraßen | Wunsch W4 |
| Kreuzungen | jeder Bildpunkt gehört einer Straße; Einmündungen bleiben offen (kein Bord quer). Mittellinien laufen durch. Haltlinien und Zebrastreifen kommen als `linien` aus der Ausstattung. | 26 Ampelknoten und 26 Querungen im Zentrum | Ampeln fehlen dem System (Stufe 3) |
| Brücken, Tunnel | aus der Karte ausgelassen; Brücken bekommen von `fahrt.js` ein Deck ohne Markierung, Tunnel nichts | Zentrum: 7 Brückenstücke, 22 Tunnelstücke, 5 Hausdurchgänge | Frage F4 |
| Treppen, Stützmauern | Treppen sind `foot` (ein Band); Mauern kennt das Format nicht | Zentrum: 57 Treppen (0,59 km), 1,5 km Stützmauern | Stufe 3, eigene Geometrie |
| Bushaltebucht, Busbahnhof | nichts; `busway` wird nicht eingeordnet | ein Busweg am Bahnhof | Suhl liefert ihn als `service` |
| Boden | `fahrt.js` schneidet den Boden an **jedem** Weg der Datei zurecht (18 m weit) | in der Stadt stehen Häuser direkt am Gehweg | „An die anderen Suhl-Pakete“ unten |

**Was das System für Suhl abdeckt:** Asphalt, Pflaster und Wege mit ihrem Aussehen aus der Nähe, Bordstein, Rinne und Gehweg an
den Fahrstraßen, Mittellinien, Nässe, das geglättete Profil unter den Rädern, Decks auf Brücken, Ortsanzeige mit Straßennamen,
dazu die Ausstattung (Schilder, Laternen, Planken, Leitpfosten, Masten, Haltlinien, Zebrastreifen).

**Was es nicht abdeckt:** Plätze und alle anderen Flächen, die Fußgängerzone ohne Bord, Gehwege nach Seite, Fahrstreifen und
Pfeile, Ampeln, Treppen, Mauern, Haltebuchten, mehrere Ebenen übereinander. Dafür liefert Suhl Daten in eigenen Feldern und
Kacheln (Abschnitt 3); gezeichnet wird das in Stufe 3 (Paket S3-5) oder nach den Wünschen unten vom Straßen-Chat.

## 3 Was Suhl liefert

Folgt mit Schritt 2 (Probesatz) – Aufbau der Kacheln `s/10/{x}/{y}.json` und der Datei `fahrt/suhl-zentrum.json`.

## Quellen und Nennung

- Straßen, Wege, Plätze, Gewässer, Bahn, Ampeln, Laternen: © OpenStreetMap-Mitwirkende, ODbL 1.0.
- Haltestellennamen: Fahrplandaten von DELFI e.V. über gtfs.de, CC BY 4.0 (`tools/suhl/out/bestand/oepnv.json`).
- Höhen: Copernicus DEM GLO-30 (© DLR e.V. 2010–2014 und © Airbus Defence and Space GmbH 2014–2018, bereitgestellt unter COPERNICUS
  durch die Europäische Union und ESA), später DGM1 „© GDI-Th“, CC BY 4.0.

## Für den Suhl-Chat

Fragen und Wünsche an den Straßen-Chat. Jeder Wunsch ist so klein wie möglich gehalten. Suhl liefert in jedem Fall schon heute
alle Angaben mit – die App überliest unbekannte Felder und Bits (`fahrt.js` prüft nur `fl & 1`, `fl & 2`).

**Fragen**

- **F1 Mehr als eine Datei:** `fahrt.js` lädt genau `fahrt/strassen.json`, die Karte liest `FAHRT.data.ways`. Suhl hat 1 559 km Wege
   und darf beim Start nichts laden. Können Fahrtdaten zur Laufzeit dazukommen und wieder gehen – etwa `FAHRT.add(name, json)` und
   `FAHRT.drop(name)` je Kachel (400 m) oder je Gebiet? Wer baut das: ihr, der Kern-Chat oder Suhl als Haken F1?
- **F2 Dichte:** Verträgt die Karte 6 800 Teilstücke im Fenster (Zentrum Suhl), 3 500 am Telefon? Sollen Fußwege, Pfade und Treppen
   (Arten 6 bis 8, im Zentrum 12,6 km) überhaupt in die Karte, oder nur die Arten 0 bis 5?
- **F3 Bleibt das Format stabil**, wenn `feat/strassen` in `src` ist? Suhl hängt an: Reihenfolge von `kinds` und `surf`, Aufbau von
   `ways`, Bedeutung von `fl`, `places` mit `k`.
- **F4 Brücken:** Bekommen die Decks bald Asphalt und Markierung aus der Karte? Suhl hat Talbrücken der A 73 und viele kleine Brücken.
   Und: Was soll in einem Tunnel und unter einer Brücke gelten, wenn zwei Wege übereinander liegen?

**Wünsche**

- **W1 Ohne Bord:** ein Merker je Weg für „niveaugleich“ (Fußgängerzone, verkehrsberuhigter Bereich): kein Bordstein, keine Rinne,
   kein Gehweg, keine Linie. Vorschlag: Bit 64 in `fl`; beim Rastern schreibt ihr dafür die freie Art 9 in die Karte, der Shader
   lässt bei Art 9 Bord und Linien weg. Suhl setzt Bit 64 schon jetzt.
- **W2 Flächen:** ein Feld `areas` neben `ways`: `[Belag, Merker, Name, [x, y, z, …]]` (Ring in dm). Die Karte rastert sie wie einen
   Weg: Abstand zum Rand der Fläche statt zum Band, Art 9. Damit wären Markt, Steinweg, Platz der Deutschen Einheit und Parkplätze
   da. Suhl liefert `areas` schon jetzt in derselben Datei.
- **W3 Gehweg je Seite:** Bit 256 „links kein Gehweg“, Bit 512 „rechts kein Gehweg“ (aus OSM `sidewalk`). Suhl setzt die Bits. Ob
   und wie ihr sie in die Karte bringt, entscheidet ihr.
- **W4 Mittellinie:** keine Mittellinie bei Bit 32 (Kreisverkehr) und bei Einbahnstraßen mit einer Spur (Bit 4 und `lanes` = 1).
   Kleinste Lösung ohne Shader-Änderung: beim Rastern den Achsabstand auf den Höchstwert setzen.
- **W5 Ausstattung für Suhl:** `daten.py` liest die Straßen der App aus zwei festen Dateien (eine davon gibt es nur nach einem Bau
   der App) und OSM über die Zellen von `strecke.py`. Suhl ruft deshalb die Funktionen einzeln auf (`guard_rails`, `delineators`,
   `signs`, `lamps`, `power`) und füllt `Net`, `Places` und `Osm` selbst – das geht ohne Änderung. Schöner wären drei Schalter:
   `--fahrt <Datei>`, `--osm <OPL-Datei>`, `--out <Datei>`.
- **W6 Ausstattung und Orte zur Laufzeit:** `strassen/ausstattung.json` lädt beim Start. Suhls Flächen `orte` (sie machen den Stil
   „Stadt“) und Suhls Ausstattung dürfen erst beim Hinkommen laden: bitte `STRDAT.add(json)` (hängt `orte` und die Listen an)
   und das Gegenstück zum Entfernen.

**An die anderen Suhl-Pakete**

- **Boden zwischen den Häusern (`suhl-laufzeit`, `suhl-gebaeude`, `suhl-boden`):** Sobald Suhls Straßen in den Fahrtdaten
  stehen, schneidet `fahrt.js` den Boden an jeder Straße auf das Profil zurecht (18 m weit). Die Hausfüße müssen zu diesem Boden
  passen, nicht zum rohen 30-m-Gelände. Vorschlag: `suhl-gebaeude` nimmt die Fußhöhe eines Hauses an einer Straße aus dem
  Straßenprofil (liegt in den `s/`-Kacheln), oder die Laufzeit meldet Suhl bei `fahrt.js` als Zone mit eigenem Boden an (so macht
  es Kloster Veßra, `ownFade`).
