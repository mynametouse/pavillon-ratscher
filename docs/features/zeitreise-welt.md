# Zeitreise – wie die Zukünfte aussehen und klingen (`ZKZEITWELT`, `viz3/src/zukunft/zk_zeitwelt*.js`)

Hilfs-Agent `zeitreise-welt`, 13.11.2026, Stufe 1 der „Zeitreise durch vier Welten“ (Plan `docs/plans/plan_zeitreise.md`, Aufträge
`docs/plans/auftraege/zeitreise-gemeinsam.md` und `zeitreise-welt.md`). Die Regie (`ZKREGIE`) gibt je Bild einen oder zwei Zustände der Chronik
(`ZKCHRONIK.state`, STATE v1); dieses Modul macht daraus das Dorf, wie es dann aussieht und klingt. Falko (13.11. 12:15): eine leichte
Farbänderung der Kronen „macht kaum etwas mit dem Bewusstsein der Menschen“ – deshalb ändern sich ganze Hänge, in Flecken.

## Schnittstelle (Vertrag v1)

- `warm()` einmal beim Start der Zeitreise: alle Programme (danach keine neuen), die Hänge vorbereiten, Ton-Takt anmelden.
- `set(L, R)` – `R = null`: eine Welt, alles auf Layer 0. Zwei Welten: was gleich ist, Layer 0; was verschieden ist, eine Kopie auf Layer 21
  (links, L) und eine auf 22 (rechts, R). Gelände und ferne Bäume sind in beiden Welten dieselben Meshes: sie nehmen ihre Werte **je Bild**
  aus den Layern der Kamera (`scene.onBeforeRender`, angehängt an das, was dort schon war; außerhalb der geteilten Ansicht wirkungslos).
- `place(id)` → `{ pos, look }` in Grundstücksmetern (x Ost, y Nord, z absolute Höhe, Augenhöhe 1,65 m) für `strasse`, `heizhaus`,
  `kahlflaeche`, `windrad`; `null` für die Orte der Regie.
- `sound(L, R, side)` – Atmosphäre für den Zustand, `side` `'L' | 'R' | 'both'`; in den Umgebungs-Bus (`audio.raw().amb`): die Lautstärke
  des Spielers und das Ducken der Regie unter einer Stimme gelten.
- `clear()` – alles wie heute: Hänge aus, Dinge weg, die Lichter des Dorfs wieder ihre eigenen, Vögel und Ton zurück.
- Für Tests: `stats()`, `demo(w, yf)` (= `ZKCHRONIK.state`), `hang.debug(1|2)` (Waldmaske / Stufenfarben).

## Was man sieht

**Die Hänge** (`zk_zeitwelt_hang.js`): die 21 000 Bäume des Kronenhöhenmodells (`world/ratscher.js`, Nadelbäume `con`) und das Luftbild des
Geländes. Jede Fichte und jeder dunkle Waldpixel bekommt einen Rang aus einem Fleckenfeld (drei Lagen Rauschen, Nester ~100 m) plus Zufall;
die Anteile des Zustands – in der Reihenfolge jung, geräumt, liegend, grau, rot – werden über die gemessene Verteilung der Ränge zu
Schwellen. So stimmen die Anteile auf dem Bildschirm mit der Chronik überein; die ältesten Nester liegen innen (jung, geräumt), das frische
Rot an ihren Rändern – wie sich ein Befall ausbreitet. Karten: rotbraun, grau und licht (Totholz), weg (geräumt/liegend: das Gelände zeigt
es), klein und von anderer Art (jung: Pionierbaum Birke/Fichte oder die gepflanzte Mischung Buche, Ahorn, Tanne). Gelände: dunkle
Waldpixel außerhalb des Dorfs (12 Kreise um die Häuser ausgespart) in der Farbe der Stufe – auch die Hügel bis 12 km, für die es keine
Baumdaten gibt. Zwei frühe Nester sind gesetzt: die Käferfläche mit der Pflanzung (120, −980) und die Windrad-Fläche auf dem Rücken
(230, −1290). Zwei Programme (Karten, Gelände), zur Laufzeit gepatcht (kein Haken in `ratscher.js`), in `warm()` übersetzt.

**Die Dinge** (`zk_zeitwelt_dinge.js`, `zk_zeitwelt_nacht.js`, Bausatz `zk_zeitwelt_kit.js`) – Orte sind **Annahmen**:

| Ding | Wann (STATE) | Wo |
|---|---|---|
| Heizhaus (Holzhalle 14 × 9 m, Hackschnitzelbunker, 14-m-Stahlschornstein, Haufen nach `chips`) | `energy.heatNet ≥ 1` | freier Platz am Südostrand bei (392, −262), an der Gasse zur Umgehung |
| Graben der Nahwärme (offen vor dem Anger, Bagger, Absperrungen, Rohre) / geflickter Streifen mit Hausanschlüssen | `heatNet` 1 / 2 | von der Gasse am Heizhaus über die Dorfstraße bis zur alten Schule |
| Heizöl-Laster an einem Haus | `energy.oilTruck` | Straße am Anger |
| Windrad: Bau (Zufahrt, Kranstellfläche, Fundament, Turmstück, Kran, Blätter) / Anlage (Nabe 160 m, Rotor 160 m, roter Turmring, rot-weiß-rote Blattspitzen, dreht ~9/min) | `energy.windrad` 1 / 2 | Rücken südlich des Dorfs (230, −1290), ~1 km vom letzten Haus |
| Rotmilan kreist über der Fläche | `windrad = 2` | zwischen Pflanzung und Windrad |
| Holzernte: Harvester, Forwarder, Polter am Waldweg; Holzlaster durchs Dorf | `forest.harvest` > 0,04 / > 0,25 | Käferfläche (120, −980), Laster auf der Grabenstrecke |
| Käferfläche nah: Stubben, Reisig, liegende graue Stämme, junge Bäume, Wuchshüllen | Stufen des Fleckenfelds dort | um (120, −980) |
| Wasser in der Straße (braun, fließt, Schaumstreifen) | `water.level` | die Dorfstraße westlich des Angers („Straße am Bach“, tiefster Teil) |
| Feuerwehr mit Blaulicht (zwei Blitze je halbe Sekunde) | `water.rain` oder `level` > 3 cm | oberes Ende der Straße |
| Schlamm / Sperrmüll (Sofa, Matratze, Teppich, Kühlschrank, Säcke) | `water.mud` / `water.debris` | Straße / vor den Häusern an ihr |
| Sandsäcke an den Türen, mobile Sperre | `water.prepared ≥ 0,5` während und nach dem Ereignis | dieselben Häuser |
| Hochwassermarken (Schild mit Jahr, Wellenlinie in Höhe der Marke) | `water.marks` | Hauswand nahe der Kamera |
| Blackout: alle Lampen und Fenster aus (`VILLAGE.night` = 0), Stadtlicht am Horizont weg | `energy.blackout` | – |
| Notfall-Treffpunkt alte Schule: Fenster warm, Lichtschein; Dorfspeicher im Container | `blackout.school`; Container ab `battery` > 0,4 | alte Schule am Anger |
| Häuser mit eigenem Licht | `blackout.islands` (Anteil) | Wohnhäuser im Dorf, fest gewählt |
| Schilder aus der Zukunft („Mögliche Zukunft“) | `signs` (`ZKCHRONIK.SIGNS`) | Pflanzung, Heizhaus, Windrad-Zufahrt, Schule |

Alles aus Kästen, Kegelstümpfen und Röhren mit Eckfarben, je Teil eine Geometrie, gezeichnet als InstancedMesh (CULL fasst sie nicht an).
Keine Lichter (eine andere Lichtzahl hieße neue Programme), nichts wirft Schatten; Fenster und Lampen sind unbeleuchtete Farben.

**Wetter und Uhr** gehören der Regie (`ev.weather`, die Zeit des Ereignisses) – dieses Modul zeichnet Wasser, Schlamm und Licht.

## Ton (`zk_zeitwelt_ton.js`)

Im Browser erzeugt (noch keine Aufnahmen): Wind in toten Kronen, ein Harvester in der Ferne (Motor, Sägen in Stößen), Wasser in der Straße,
das Martinshorn der Feuerwehr (a¹–d², ~440/585 Hz, in Stößen), Pumpen am Morgen danach, Wechselrichter und Lüfter des Dorfspeichers.
Die Vögel des Spiels werden mit dem Totholz leiser (ihr Wetterfaktor wird skaliert, solange die Zeitreise klingt). Freie Aufnahmen mit
Lizenzangaben können eine Schicht später ersetzen (wie `wetter/wx_ton.js`).

## Kosten

Programme nur in `warm()` (Bausatz: sechs Materialien; Hänge: zwei gepatchte statt der zwei alten), `set()` und geteiltes Bild +0. Je Ding
ein bis drei Draw-Calls; Neubau nur, wenn sich die Beschreibung eines Dings ändert (Anteile gerundet), Bewegung (Rotor, Blaulicht, Wasser,
Milan, Laster) im Takt. Nichts lädt oder übersetzt, solange die Zeitreise aus ist.

## Test

`viz3/test/zeitreise_welt.py` (1920 × 1080): API und Orte; Hänge je Jahr und Welt (Farbe der Hangregion ändert sich), Stufenfarben;
Heizhaus, Graben, Käferfläche, Ernte, Windrad (Bau, dreht, vom Dorf), Heizöl; Starkregennacht, Morgen danach, Blackout beider Welten;
geteiltes Bild (Layer 21/22, die Hälften unterscheiden sich); `clear()`; Programme und Draw-Calls. Kontaktbögen `out/zeitreise_welt/hang.jpg`,
`dinge.jpg`, `nacht.jpg`, `split.jpg`. Thema `viz3/extra/zeitreise-welt/tests.txt`: smoke, zeitreise_welt, zukunft, zukunft_welt.
