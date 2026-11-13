# Gebäudetypen ohne Foto – Rezepte für logische Häuser

Stand 13.11.2026 (Hilfs-Agent `daten-katalog`). Falko (13.11. 16:42): wo visuelle Informationen fehlen, trotzdem „realistische, sinnvolle, logische
Gebäudekonstrukte“ bauen – bei einem Wohnhaus mit Innenhof „muss es natürlich einen Zugang zu diesem Innenhof geben“. Echte Namen nur als
**schlichter Schriftzug**, nie Logo, Farbwelt oder Schriftart einer Marke (Falko 16:50).

**Wie man die Zahlen liest:** „OSM“ = am 13.11.2026 aus dem Gebäudeumriss in OpenStreetMap gemessen (`tools/daten/ergebnis/pois.csv`), gilt für genau diesen
Ort. „Faustwert“ = gängige Größe dieses Typs aus allgemeinem Wissen (Bauordnung, Branchenüblichkeit), **nicht** für den einzelnen Ort geprüft –
zum Ausfüllen, solange kein Foto da ist; ein Foto oder ein Maß aus ETHOS.BUILDA geht vor.

## Der Entwurfsablauf (für jedes Gebäude ohne Foto)

1. **Nutzung** aus den OSM-Tags: `shop=*`, `amenity=*`, `office=*`, `craft=*`, `building=*` (Spalte `art` und `gebaeude` in `pois.csv`).
2. **Grundriss und Höhe** aus ETHOS.BUILDA oder dem OSM-Umriss (Fläche `flaeche_m2`); Etagen aus `building:levels`, sonst nach Typ (Tabelle unten).
3. **Seiten bestimmen** (Regeln unten): Straßenseite, Parkplatzseite, Rückseite (Anlieferung), Hofseite.
4. **Dach:** `roof:shape` wenn vorhanden, sonst Typ (Handel und Gewerbe: Flachdach mit Attika oder flaches Pultdach; Wohnhaus im Ort: Satteldach
   40–50°, Fachwerk-/Sandsteinhäuser mit Schiefer oder roten Ziegeln; Dachfarbe aus dem Luftbild).
5. **Türen, Tore, Fenster, Schild** setzen (Regeln), **Name als Schriftzug** (`name`, in Großbuchstaben oder Schreibweise des OSM-Namens, einfache Schrift).
6. **Prüfen:** von jedem Parkplatz, jeder Straße und jedem Hof führt ein begehbarer Weg zu mindestens einer Tür (siehe „Prüfregeln“).

## Typen nach Nutzung

Größen mit **OSM** sind gemessen, alle anderen Faustwerte. „Etagen“ zählt Geschosse über dem Boden; Höhe = Traufe/Attika.

| Typ | Beispiele hier | Grundfläche | Etagen / Höhe | Dach | Merkmale, die ihn erkennbar machen |
|---|---|---|---|---|---|
| **Baumarkt mit Gartencenter und Bauhof** | OBI Suhler Straße (OSM: **5537 m²**, Mo–Fr 08:30–19:00, Sa 08:30–18:00, Parkplätze w55843094, w160476205) | 4000–8000 m² Halle (Faustwert), Gartencenter 1000–3000 m² dazu | 1 / 7–9 m | Flachdach mit Attika, Oberlichter | **Hauptzugang** zur Parkplatzseite (Windfang mit Schiebetüren, Einkaufswagenbox daneben, Pylon am Parkplatzrand); **Gartencenter** seitlich: Freifläche mit Zaun, Folien- oder Glasdach, eigener Eingang; **Bauhof** an der Seite oder hinten: überdachte Regale, Zufahrt für Lkw mit Tor; **Anlieferung** hinten mit Rampe und Rolltor; Schriftzug quer über der Eingangsfront |
| **Möbelhaus / Einkaufszentrum** | Mega Center Suhler Straße (OSM: **16 887 m²** Gebäudekomplex mit Mega-Möbel, Aldi Nord, EDEKA, Restaurant, Parkplatz w160476205) | 5000–20 000 m² | 1–2 / 8–10 m | Flachdach | langer, fast fensterloser Baukörper mit Eingangsrisalit, Vordach, Schriftzug groß am Giebel; mehrere Läden mit **eigenen Eingängen** an einer Passage oder Front zum Parkplatz; Lager und Rampen hinten |
| **Supermarkt** | EDEKA (OSM **2173 m²**), REWE Hildburghäuser Straße 32 (OSM **2334 m²**, Mo–Fr 06:00–22:00, Sa 06:00–20:00) | 1500–2500 m² | 1 / 5–6 m | Flachdach, flaches Pultdach | Eingang an der Ecke zur Parkplatzseite mit Vordach und Einkaufswagen; Fensterband (Schaufenster) mit Aufklebern; Anlieferung hinten oder seitlich mit Rampe; Pfandrückgabe außen |
| **Discounter** | Lidl Jägerhausstraße 8 (OSM **1493 m²**, Mo–Sa 07:00–20:00), Aldi Nord Suhler Straße 34 (Mo–Sa 07:00–20:00, So zu) | 1000–1800 m² | 1 / 5 m | flaches Pultdach, Fensterband unter dem Dach | Eingang an der Schmalseite oder Ecke mit Vordach, 60–100 Stellplätze davor, Pylon, Anlieferung seitlich/hinten mit Rampe |
| **Fast-Food-Restaurant mit Drive-in** | McDonald’s Kurhausstraße 1a (OSM **435 m²**, Mo–So 09:00–24:00, `drive_through=yes`, Parkplatz w128886077) | 300–500 m² | 1 / 4–5 m, mit Dachaufbauten | Flachdach | Gebäude frei auf dem Grundstück; **Fahrspur** (Drive-in) umläuft das Gebäude: Bestellsäule, Fenster Bezahlen, Fenster Ausgabe auf der Fahrerseite; **Eingang** zur Parkplatzseite; Terrasse; Schriftzug schlicht |
| **Tankstelle** | Shell Suhler Straße 56 (OSM: Dach **463 m²**) | Überdachung 400–600 m² (OSM), Shop 80–200 m² | 1 / 5,0–5,5 m lichte Höhe der Überdachung | Flachdach der Überdachung auf Stützen | 4–6 Zapfsäulen unter dem Dach, Kassenhaus mit Eingang zur Zapfsäulenseite, Luft/Wasser, ggf. Waschanlage seitlich (`amenity=car_wash` an der Suhler Straße) |
| **Autohaus mit Werkstatt** | Autohaus Staffel Ilmenauer Straße 36 (OSM **2704 m²**), Hommel Am Sättel 1 (OSM **574 m²**), AHAG (430 m²) | 500–3000 m² | 1–2 / 5–7 m | Flachdach | Glasfront zur Straße mit Ausstellung; **Freigelände** mit Fahrzeugreihen davor; **Werkstatt** mit Rolltoren an der Rückseite oder Seite; Kundeneingang in der Glasfront |
| **Gewerbehalle / Handwerk / Lager** | Am Sättel 1–16 (Autohaus, Reifenservice Kolb, Gebr. Dobberkau KG, Cargo Forst Naturstein), Raab Karcher Baustoffhandel (OSM Fläche **7852 m²**) | 300–3000 m² | 1 / 5–8 m | flaches Satteldach 5–15°, Trapezblech | Rolltor (4 × 4 m) zur Hofseite, kleine Tür daneben, Büroanbau mit Fenstern; Hof befestigt; Lagerplatz oder Silo; Name auf Schild am Zaun |
| **Bäckerei, Friseur, Apotheke, Bank, Getränkemarkt im Wohn-/Geschäftshaus** | Suhler Straße 38 (Bäckerei), Nr. 40 (Wäscheservice, Imbiss); Getränkequelle (OSM **656 m²**) | Laden im Erdgeschoss 40–150 m² | Haus 2–3 / 7–10 m | Satteldach | Ladentür und Schaufenster zur Straße, Schriftzug über der Tür oder als Ausleger; Wohnungseingang daneben (eigene Tür); Lieferung über die Haupttür oder den Hof |
| **Gaststätte / Imbiss / Hotel** | Goldener Löwe (Kloster Veßra), Am Waldrand (Suhler Straße 81), Turan Kebap Haus (Suhler Straße 40) | 100–600 m² | 2–3 / 8–11 m | Satteldach | Haupteingang zur Straße, Gastraum mit Fenstern, Anlieferung hinten oder im Hof, Terrasse oder Biergarten |
| **Feuerwehr-Gerätehaus** | Ratscher (OSM Gebäude **52 m²**, Vereinsgebäude im Alten Schulhaus), Kloster Veßra (OSM **199 m²**), Schleusingen (3 Wachen) | 50–400 m² | 1 / 4–6 m | Satteldach | zwei Rolltore zur Straße für die Fahrzeuge, Seitentür, Schlauchturm; vor den Toren ein freier Streifen |
| **Schule, Kindergarten, Rathaus, Museum** | drei Schulen, zwei Kindergärten (OSM), Rathaus Markt 1, Hennebergisches Museum (OSM **52 797 m²** Gelände) | 500–3000 m² | 2–3 / 9–12 m | Walm- oder Satteldach | **Haupteingang** mit Treppe/Rampe zur Straße oder zum Platz; Nebeneingänge zum Hof; Schild mit Namen am Eingang (Museum: 17 Türen in OSM) |
| **Stadthaus mit Hof und Toreinfahrt** | Altstadt Schleusingen (z. B. Bertholdstraße 6–16, Burgstraße 6) | Haus 80–200 m², Hof 40–700 m² | 2–3 / 8–11 m | Satteldach 40–50° | **Toreinfahrt** zum Hof (Faustwert: 2,5–3,5 m breit, 2,8–3,5 m hoch – Feuerwehrzufahrt braucht nach üblicher Regel mindestens 3 m × 3,5 m) mit Tor oder offen; Haustür zur Straße; Hoftür zum Hof; im Hof Nebengebäude (Schuppen, Garage) |
| **Plattenbau** | in Schleusingen: nach OSM-Etagen prüfen (`gebaeude.csv`, Spalte `etagen` ≥ 4) | 12–60 m lang, 11 m tief | 4–6 oder 11 / 12–18 m | Flachdach | Treppenhäuser alle 12–15 m mit Eingang auf der Straßen- oder Hofseite (Typen WBS 70, Q6 u. a. – Faustwert), Balkone/Loggien auf einer Längsseite, Fensterraster |
| **Bauernhof / Gehöft der Region** | Neubauerngehöft, Domänenscheune, Kornhaus, Schafstall im Kloster Veßra (alle OSM, Denkmal); Höfe in Ratscher | Haus 100–200 m² + Scheune 150–400 m² | Haus 2 / 7–9 m, Scheune 6–10 m | Satteldach | fränkisch-hennebergisch geprägt: **Drei- oder Vierseithof** mit geschlossenem Hof und Hoftor zur Straße; Wohnhaus mit Sandsteinsockel, Fachwerk im Obergeschoss, Schiefer oder rote Ziegel; Scheune mit großem Tor zum Hof; Misthaufen, Stall, Backhaus |
| **Wohnhaus im Dorf (Ratscher)** | nach Zensus 2022: 37 freistehende Einfamilienhäuser, 6 Zweifamilienhäuser, 31 von 46 Gebäuden vor 1919 | 80–150 m² | 1,5–2 / 5–8 m | Satteldach 35–50° | Haustür zur Straße oder zum Hof, Garage/Schuppen daneben, Garten hinter dem Haus, Zaun und Hoftor |

## Regeln, damit Häuser logisch sind

**Türen**
- Jedes bewohnte oder genutzte Gebäude bekommt **mindestens eine Tür**, bevorzugt an der Seite, die einer begehbaren Fläche zugewandt ist (Straße, Hof, Parkplatz).
  Wo OSM eine Tür (`entrance`) kennt, gilt diese; sonst setzt die Regel eine (nur 31 von 1752 Gebäuden in Schleusingen haben eine erfasste Tür).
- **Läden mit Parkplatz:** Haupteingang an der Seite, die dem Parkplatz am nächsten liegt (`parkplaetze_120m` in `pois.csv`); bei Läden an der Straße die
  Straßenseite. Der Eingang bekommt Vordach oder Windfang und davor eine freie, befestigte Fläche von mindestens 3 m.
- **Wohn-/Geschäftshaus:** Ladentür und **getrennte Wohnungstür**; im Hof eine weitere Tür.
- Türbreiten: Haustür 1,0 m, Ladentür 1,2–2,0 m (Schiebetür), Tor 3–4 m. Türschwelle auf Geländehöhe, bei Gefälle Stufe oder Rampe.

**Höfe und Durchgänge**
- **Jeder Innenhof ist erreichbar.** `hofzugaenge.csv` zeigt Höfe, die in OSM keinen Zugang haben: dort entsteht ein **Durchgang** (Toreinfahrt) in
  das Haus mit der Hausnummer an der Straße, mit der kürzesten Verbindung zwischen Hof und öffentlichem Weg, bevorzugt unter dem Haus mit dem
  breitesten Giebel zur Straße (Faustwert 2,5–3,5 m breit, 2,8–3,5 m hoch), und zusätzlich Hoftüren der Häuser, die den Hof umschließen.
- Wo OSM `tunnel=building_passage` kennt (Burgstraße 6), wird der Durchgang so gebaut; überdeckte Wege (`covered=yes`) sind keine Tunnel, solange keine Fotos
  das zeigen.
- Ein Hof hat einen befestigten Boden (Pflaster, Schotter oder Erde), eine Entwässerungsrinne, Nebengebäude und Müllbehälter.

**Parkplätze, Straße, Anlieferung**
- Parkplätze liegen vor dem Eingang (Läden), nicht hinter dem Gebäude; Ein- und Ausfahrt zur nächsten Straße (OSM: `amenity=parking`, Zufahrt `highway=service`).
- **Anlieferung** immer abseits der Kundenseite: Rampe und Rolltor an der Rückseite oder Schmalseite, Wendeplatz für Lkw (Radius ≥ 12 m, Faustwert).
- **Drive-in:** Einbahn um das Gebäude, Bestellstelle vor dem ersten Fenster, Ausgabefenster zuletzt, Ausfahrt zur Straße; Gebäude auf drei Seiten umfahrbar.
- Zufahrt für Feuerwehr: Gebäude, deren Rückseite zu einem Hof liegt, haben eine ≥ 3 m breite Zufahrt oder einen Durchgang.

**Schilder und Namen**
- Name aus `name` in OSM, als **schlichter Schriftzug** (Einheitsschrift, eine Farbe), über der Tür oder an der Front; bei Märkten zusätzlich ein Pylon am Parkplatzrand.
  Kein Logo, keine Hausfarbe der Marke (OBI-Orange, McDonald’s-Gelb), keine Markenschrift.
- Öffnungszeiten aus `oeffnungszeiten` im Türschild; sonntags geschlossen, wenn `Su off`.
- Hausnummernschild neben der Tür, wo `addr:housenumber` bekannt ist.

**Fassaden und Material (ohne Foto)**
- Altstadt Schleusingen: Putz in gelb, lachs, ocker, salbeigrün, creme, weiß (aus den Marktfotos), Schiefer an Obergeschossen, Fachwerk in Gassen (`docs/features/schleusingen.md`).
- Dörfer (Ratscher, Kloster Veßra): Putz oder Sandstein, Fachwerk, Satteldach mit roten Ziegeln oder grauem Schiefer, Scheunen mit Holz- oder Backsteinwänden.
- Handel und Gewerbe: Sandwichplatten oder Putz in Hellgrau/Weiß, Fensterband, Metalltüren.

## Prüfregeln für die Bauer (automatisch)

1. Zu jeder **Tür** führt ein Weg von einer Straße, einem Hof oder einem Parkplatz, höchstens 3 m über unbegehbarem Boden (Bewuchs, Wasser, Zaun).
2. Jeder **Hof** (Loch im Gebäudeverbund) enthält mindestens eine Tür oder einen Durchgang zur Straße.
3. Jeder **Laden** aus `pois.csv` mit Gebäudeumriss hat einen Eingang und einen Schriftzug.
4. **Kein Durchgang unter einem Haus**, der schmaler als 1,2 m oder niedriger als 2,2 m ist.
5. Jedes Gebäude mit Anlieferung hat auf der Rückseite weder Haupteingang noch Parkplatz.

Daten dazu: `tools/daten/ergebnis/pois.csv`, `entrances.csv`, `passages.csv`, `hofzugaenge.csv`, `gebaeude.csv`.
