# Zeitreise – die Chronik (`ZKCHRONIK`, `viz3/src/zukunft/zk_chronik.js`)

Hilfs-Agent `zeitreise-chronik`, 13.11.2026, Stufe 1 der „Zeitreise durch vier Welten“ (Plan `docs/plans/plan_zeitreise.md`, Aufträge
`docs/plans/auftraege/zeitreise-gemeinsam.md` und `zeitreise-chronik.md`). Die Chronik ist die eine Quelle für alle Inhalte: Welten, Kapitel,
Ereignisse, der Zustand der Welt in jedem Jahr, die Kennzahlen der Kapitelkarten und die Stimmen. Reine Daten und Funktionen (kein DOM, kein
three.js); Einheitentest `viz3/test/unit/zeitreise.test.mjs` (läuft in der Schnellprüfung, `bash tools/check.sh`).

## Vertrag v1 – und was die Chronik genauer festlegt

Der Vertrag steht im gemeinsamen Auftrag. Zusätzlich (Entscheidungen der Chronik, 13.11.):

- **Zeit:** Gleitjahr `yf = y + (doy − 1 + hour/24) / Tage(y)`; `ZKCHRONIK.yf(y, doy, hour)`, `date(yf) → { y, doy, hour }`, `doyOf(y, m, d)`.
- **Kapitel nacheinander, jedes durch seine eigenen Jahre:** Wald 2026–2050, Wasser 2026–2050, Energie 2026–2060 (jedes beginnt „heute“; die
  Zeitreise springt am Kapitelanfang zurück). `events(w)` ist in **Abspielreihenfolge**: Kapitel, dann Zeit (`ev.t` = Gleitjahr des Beginns).
- **Gleiche Momente:** Ein Ereignis mit derselben `id` in beiden Welten des Paars geschieht im selben Moment (`y, doy, hour, t, place, halt,
  dur, weather` gleich) – im geteilten Bild hält die Regie einmal. `same: true` heißt zusätzlich: Titel, Text und Sätze sind gleich (einmal
  zeigen). Ereignisse nur einer Welt haben eine eigene `id` (`energie-wind-dreht` nur „Gewappnet“, `energie-wind-investor` nur „Allein“).
- **Phase:** `dur` = Stunden, die die Phase 0..1 eines Halts überdeckt (Starkregennacht 4 h ab 23:40, Hochwasser 6 h, Blackout 6 h ab 17:15).
  `at(ev, p)` → Gleitjahr für `state()`, `phase(ev, yf)` zurück. Wasserstand, Schlamm, Sperrmüll und das Licht im Blackout folgen daraus.
- **`halt`** ist mindestens so lang wie die längere Rede der beiden Welten plus 4 s; Sätze gibt es nur bei Ereignissen mit Halt.
- **Entscheidungen** (`kind: 'entscheidung'`) tragen `fork: { q, options, pick }` für das Abstimmen später (Stufe 5); die beiden Welten
  entscheiden verschieden.
- **Platzhalter-Welten** „Rückenwind“ und „Glück gehabt“ (`stub: true`): `events()` und `kpi()` geben `[]`, `state()` gibt milde Kurven.
- **Weitere Daten:** `PLACES` (Ortsnamen für die Oberfläche), `WHO` (Sprecher mit Rolle und Geburtsjahr – niemand spricht älter als 86),
  `SIGNS` und `SIGN_NOTE` (Schilder aus der Zukunft, „Mögliche Zukunft“), `SRC`, `find(w, id)`.
- **`kpi(w, kapitel)`**: je Eintrag zusätzlich `text` und `rangeText` (deutsch formatiert) und `annahme` (Überschlag).

## STATE v1 – wie die Werte gemeint sind

- `forest`: Anteile der heutigen Fichtenfläche (alle sichtbaren Hänge und der Familienwald), **Summe 1**: `green` lebend, `red` rotbraune
  Kronen, `grey` stehendes Totholz, `fallen` liegendes Totholz, `cleared` geräumt und noch kahl (Reisig, Brombeere), `young` junger Wald der
  Höhe `regrowH` und Art `regrow`. `planted` = gepflanzter Anteil der Fichtenfläche (Wuchshüllen, solange die Bäume klein sind),
  `harvest` = Stärke der Holzernte gerade jetzt (Harvester, Polter, Holzlaster). 2026 ist alles `green` (= die Welt von heute).
- `water`: `level` m über normal an `strasse` während der Ereignisse, `rain: 'starkregen'` während der Gewitterzelle, `mud`/`debris` am
  Morgen danach (werden in Tagen bis Wochen abgeräumt), `prepared` = Vorsorge an Hang und Häusern, `marks` die Hochwassermarken an der Hauswand.
- `energy`: `heatNet` 0/1/2 (nichts, Graben, läuft), `oilTruck` (Heizsaison und kein Netz), `chips` (Hackschnitzelhaufen, im Winter kleiner),
  `windrad` 0/1/2, `pvRoof` (Anteil der Dächer mit Modulen), `battery` (Dorfspeicher an der Schule, 0..1 Aufbau), `blackout` während der
  30 Stunden ohne Strom: `{ school, islands }` (Schule als Notfall-Treffpunkt; Anteil der Häuser mit eigenem Licht).
- `signs`: Ids aus `SIGNS`, die zu dieser Zeit stehen.

## Die Chronik (Stufe 1, heftiges Klima in beiden Welten)

Gleiche Klima-Ereignisse in denselben Jahren (Ereignisjahre sind Beispiele, „ein mögliches Jahr“): Dürresommer 2027, Käfersommer Juli 2028
(Massenbefall, die Hänge rotbraun im September, grau im Frühjahr 2029), Starkregennacht 15.7.2034 23:40 (rund 55 mm in einer Stunde), Blackout
12.1.2037 17:15 (Eisregen, 30 Stunden ohne Strom), großes Hochwasser der Schleuse 4.2.2046 (Tauwetter und Dauerregen, nahe HQ100).

- **Allein im Sturm** (jeder für sich): Die Waldbesitzer räumen jeder für sich, die Unternehmer sind ausgebucht, Käferholz bringt fast nichts;
  ein Drittel der toten Fichten bleibt stehen und fällt um. Auf den Flächen kommen Birke, Vogelbeere, Weide und Brombeere – um 2040 ein
  Flickenteppich, 2060 grün, aber ein anderer Wald ohne Holz fürs Sägewerk. Vorsorge gegen Starkregen bleibt ein Merkblatt: In der
  Starkregennacht laufen zwölf Keller voll, am Morgen Schlamm und Sperrmüll, eine neue Marke an der Hauswand; beim Hochwasser 2046
  schwimmen Öltanks auf. Keine Genossenschaft, der Wärmeplan sagt „Einzelversorgung“, der Öllaster kommt weiter; ein Investor stellt nach
  Jahren vor Gericht 2039 ein Windrad auf die Käferfläche (Pacht für einen Besitzer, 0,2 ct/kWh für die Stadt). In der Blackout-Nacht bleibt
  die Schule dunkel, nur Häuser mit eigenem Speicher haben Licht, warm ist es nur am Holzofen.
- **Gewappnet** (gemeinsam): Eine Waldgemeinschaft (ähnlich einer Forstbetriebsgemeinschaft) räumt schnell mit einem Unternehmer für alle
  Parzellen, das schlechte Holz wird Hackschnitzel; Pflanztag 2031 (Buche, Traubeneiche, Weißtanne, Bergahorn in Wuchshüllen), 2038 mannshoch,
  in den 2040ern grün und gemischt. Das Dorf geht 2032 mit der Starkregen-Gefahrenkarte die Straße ab (Mulden am Hang, Rückstauklappen,
  Schwellen, mobile Wände, Übung): ein nasser Keller in der Starkregennacht, 2046 Wasser in Höfen, kaum in Häusern. Energiegenossenschaft
  2028 (38 von 55 Haushalten, Vorbild Schlöben), Wärmenetz nach dem Wärmeplan: Graben im Sommer 2029, Heizhaus mit Käferholz-Hackschnitzeln
  ab Oktober 2030; Bürgerwindrad auf der Käferfläche (Bau 2033, dreht ab März 2034, Pacht an alle Waldbesitzer, Strom über Energy Sharing);
  Dorfspeicher mit Notstrom an der alten Schule (2033). In der Blackout-Nacht ist die Schule Notfall-Treffpunkt, das Heizhaus läuft mit
  Notstrom, Akkustationen treiben die Heizungspumpen.
- **Epilog 2060** am Anger: Die Dorflinde von 1888 steht in beiden Welten; Jens schreibt Gerhards Chronik weiter.

Entscheidungen (`entscheidung`, mit `fork`): Waldumbau gemeinsam (`wald-rat`), Genossenschaft gründen (`energie-eg`), Nahwärme nach der
Wärmeplanung (`energie-waermeplan`), Windrad auf der Käferfläche (`energie-wind`), Dorfspeicher mit Notstrom (`energie-speicher`).

## Zahlen und Quellen (geprüft am 13.11.2026)

- **Klima (ReKIS, Landkreis Hildburghausen, RCP8.5, gegen 1961–1990):** heiße Tage 1 → +6 (2021–2050) → +26 (2071–2100); Sommerniederschlag
  −6 % / −19 %, Winterniederschlag +6 % / +15 %; Jahresmittel +1,9 / +4,5 K. RCP2.6 steht im Steckbrief nicht (für „mild“ später).
- **Starkregen (KOSTRA-DWD-2020, Rasterfeld bei Ratscher, Zeile 151/Spalte 155):** 60 Minuten: 15,9 mm jährlich, 29,9 mm in 10 Jahren,
  47,5 mm in 100 Jahren (±26 %). Die Chronik nimmt 55 mm (Spanne 45–70) für die Nacht 2034: mehr als ein Jahrhundertregen nach heutiger Statistik.
- **Wald:** Thüringen 127 000 von 550 000 ha (23 %) neu zu bewalden (top agrar 29.04.2025 nach der Landesforstverwaltung); Birke wächst früh
  schnell und lässt nach 10–12 Jahren nach (LWF Wissen 28). Höhen der jungen Bäume (Mischwald gut 3,5 m nach 10 Jahren, 9 m nach 20; Pioniere
  gut 7 m nach 10 Jahren) sind Annahmen.
- **Hochwasser:** Dezember 2023 hielten die Talsperren Schönbrunn und Ratscher rund 900 000 m³ zurück (Drs. 7/9624); im HQ100-Gebiet rund
  37 Gebäude (erste Fassung, Geoproxy UESG). In Thüringen kann über die Hälfte der Hausbesitzer bei Elementarschäden nicht mit einer
  Versicherung rechnen (Versicherungsbote).
- **Energie:** Schlöben eG (gegründet 2009, 6 km Netz, 550-kW-Hackschnitzelkessel, 6,6 ct/kWh für Mitglieder, Holz aus höchstens 15 km);
  Feldheim (energieautarkes Dorf); Energy Sharing § 42c EnWG seit 1.6.2026; § 6 EEG 0,2 ct/kWh; Thüringer Gesetz über die Beteiligung von
  Gemeinden an Windparks (2.7.2024: Beteiligung wie § 6 EEG, sonst Ausgleichsabgabe 0,5 ct/kWh); Wärmeplanung bis 30.6.2028 für Gemeinden
  bis 100 000 Einwohner (§ 4 WPG); BVerfG 27.09.2022, 1 BvR 2661/21 (kein pauschales Verbot von Windrädern im Wald); Regionalplan
  Südwestthüringen, 2. Entwurf (Beschluss 25.03.2026) mit 40 Vorranggebieten Windenergie; Nadelholz trocken 5,4 kWh/kg, also etwa 2 MWh je
  Festmeter Fichte; Hormus: Heizöl im März 2026 binnen Tagen rund 25 % teurer (ZDFheute 03.03.2026).
- **Stromausfälle:** Münsterland 25.11.2005 (250 000 Menschen, viele tagelang, Ochtrup teils zwei Wochen), Berlin-Köpenick 2019 (rund 31 h),
  Berlin 3.–7.1.2026 (Brandanschlag, rund 45 000 Haushalte und 2 200 Betriebe, vier Tage). Die 30 Stunden der Chronik liegen dazwischen.

## Offene Punkte

- Ob ein Vorranggebiet Windenergie des 2. Entwurfs bei Ratscher liegt, ist nicht geprüft (Karte nicht ausgewertet) – das Windrad auf der
  Käferfläche ist eine Annahme.
- Einwohner von Ratscher: keine amtliche Zahl gefunden (Zensus 2022 nennt keine Ortsteile); es bleibt bei rund 120 Einwohnern, 55 Haushalten
  (Annahme des Spiels).
- Die Hochwassermarke von 2023 an der Hauswand (10 cm) ist eine Annahme: 2023 blieb das Dorf dank der Talsperren weitgehend verschont; eine
  gemessene Höhe an einem Haus ist nicht belegt.
- Geldwerte (Schäden, Vorsorge, Geld im Dorf, Wärmepreise) sind Überschläge mit Spannen.

## Stand

13.11.2026: Gerüst 13:20 (3dbc5445), Inhalte mit Quellen 13:50. Stimmen: siehe unten, sobald aufgenommen.
