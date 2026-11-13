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

## Stand

Gerüst mit vollem Ablauf (13.11. 13:45). Quellen werden geprüft und ergänzt; die Stimmen werden über `stimmen/zeitreise` aufgenommen.
