# Suhl – die Laufzeit: Suhl in der App (Paket S2-6)

Stand 13.11.2026, 03:27 Uhr. Agent `suhl-laufzeit`, Zweig `feat/suhl-laufzeit` (von `src`). Auftrag: `docs/plans/auftraege/suhl-laufzeit.md`;
Entwurf: `docs/plans/plan_suhl.md` (auf `suhl/basis`), Abschnitte 1, 3 und 6. Nichts hiervon ist veröffentlicht.

**Kurz:** Beim Start der Seite wird nichts von Suhl geladen. Kommt man in die Nähe, lädt ein Paket (35 kB) mit seinem Rechner
(Worker, 20 kB) und baut die Stadt in Stufen auf: Boden, Fernboden, jedes Gebäude aus seinem Datensatz, Bäume, Straßen. Gehen und
Fahren gehen, Wände halten auf, der Vertrag `SUHL.*` antwortet. Gebaut und geprüft gegen den Probesatz Zentrum (11 Kacheln) in der
Generation v1 der Daten-Agenten: 1-m-Gelände mit eingeschnittenen Straßen, Gebäude nach Schema 1, Fassung 1.1.

## 1 Was es gibt

| Datei | Was |
|---|---|
| `viz3/src/welt/suhl.js` (213 Zeilen, im Bündel) | Anmeldung: eine Zone um die ganze Gemeinde (`KERN.zone`, Mitte −4 362 / 13 836, baut ab 11,8 km), Sprungziele `suhl`, `suhl_steinweg`, `suhl_bahnhof`, `suhl_ccs`, Szene `?szenario=suhl`, der Vertrag `SUHL.*` als Hülle, die Umrechnungen. **Kein Netzabruf beim Start.** |
| `viz3/src/lazy/suhl.js` → `dist/lazy/suhl.js` | das Paket: Index der Daten, Ablauf je Bild (`tick`), Vertrag, Auskunft für die Fahrt (`FAHRT.ground`) |
| `viz3/src/lazy/suhl-worker.js` → `dist/lazy/suhl-worker.js` | der Rechner (Modul-Worker): holt Kacheln, entpackt sie, erzeugt die Geometrie der Gebäude und die Lage der Bäume; gibt fertige Puffer zurück |
| `viz3/src/lazy/suhl/kern/index.js` | liest `aktuell.json` in der Form des Daten-Vertrags (`products`, `version`, `path`, `index`, `based_on`) und die Indexe; Kachel-Listen unter `has` (ältere Schreibweisen werden noch gelesen) |
| `viz3/src/lazy/suhl/kern/boden.js` | Boden: Suhls Kachelsatz bei `WELT` anmelden (nah), Fernboden Stufen 6–9 selbst zeichnen, altes Gelände absenken |
| `viz3/src/lazy/suhl/kern/stadt.js` | Gebäude und Bäume je Kachel der Stufe 10: Stufen nach Entfernung, ein fertiges Stück je Bild, Kollision, Datensätze für `SUHL.building` |
| `viz3/src/lazy/suhl/kern/strassen.js` | Straßen, alles an einer Stelle: Übergabe jeder `s`-Kachel an das Straßensystem (`FAHRT.add`), solange es das nicht gibt eine gemalte Karte im Boden; Straßennamen, `SUHL.ways` (Abschnitt 8) |
| `viz3/src/lazy/suhl/bau/haus.js`, `kachel.js` | im Rechner: ein Datensatz → Wände und Dach in der Anordnung von `world/village.js` (übertragen aus `gebaeude/gebaeude.js`), die schlanke Fernstufe, Regeln für das Aussehen |
| `viz3/src/lazy/suhl/kern/geo.js`, `probe.js` | Kachel-Rechnung, WTH1-Höhen, das Buch über alles Erzeugte (`LIVE`); die Prüfungen des ersten Tages |
| `viz3/extra/suhl-laufzeit/dist/suhl/` | der Probesatz (10,9 MB): `boden/v1`, `g/v1`, `b/v1`, `s/v1` (dazu `gr`, `w`, `m`, noch nicht gelesen) und ein vorläufiges `aktuell.json`. Herkunft steht in `aktuell.json` (`sources`): `suhl/boden` 8d5bffbc, `suhl/gebaeude` bacb45ed, `suhl/gruen` 92f47feb, `suhl/strassen` 7ef29c0e. |
| `viz3/extra/suhl-laufzeit/probe_holen.py` | holt die Probesätze von `origin/suhl/<paket>` neu: von jedem Produkt die zuletzt erzeugte Version; schreibt `aktuell.json` in der Form des Vertrags |
| `viz3/extra/suhl-laufzeit/lint.mjs`, `bau_test.mjs` | Lint für das Paket; Test des Rechners ohne Browser |
| `viz3/test/suhl.py`, `viz3/extra/suhl-laufzeit/tests.txt` | Browser-Test in Abschnitten; die Läufe bei GitHub |

## 2 Ausprobieren

- Bauen: `cd viz3 && python3 build.py --fast` (kopiert den Probesatz nach `dist/suhl/`), Testserver `bash tools/csp/start8951.sh`.
- `…/index.html?szenario=suhl` – Start auf dem Suhler Markt. `?suhl=1` zeigt zusätzlich den Menüknopf „Suhl“ unter Hingehen → Weiter weg.
- `?suhl=<Adresse>` – andere Daten-Basis. Ohne Angabe: auf der Website `https://mynametouse.github.io/pavillon-daten/suhl/`, am
  Testserver `suhl/` (also `dist/suhl/`).
- In der Konsole: `SUHL.status()` (Zustand, Versionen, Kacheln je Stufe, Zeiten, Fehler), `SUHL.building('DETHL57P00006FVC')`,
  `SUHL.data.building(…)`, `SUHL.buildingAt(x, y)`, `SUHL.override(id, { hidden: true })` (Abriss), `SUHL.reset()`.
- Neue Probedaten: `python3 viz3/extra/suhl-laufzeit/probe_holen.py`, dann neu bauen.
- Prüfen ohne Browser: `node viz3/extra/suhl-laufzeit/lint.mjs`, `node viz3/extra/suhl-laufzeit/bau_test.mjs`.
- Im Browser (nur über die Sperre, Port 9021): `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9021 --serve suhl:sprung`.

## 3 Die Prüfungen des ersten Tages (Befunde)

Lauf `suhl:start,tag1` am 13.11. 01:37, 169 s, Chromium mit SwiftShader, Stufe „mittel“. Zahlen: `out/suhl/tag1.json`.

| Frage | Befund |
|---|---|
| (a) App-Code als Paket bei Bedarf | **Geht.** Das Anmelde-Modul lädt `dist/lazy/suhl.js` mit `import()` und reicht hinein: `THREE` (dasselbe Objekt, r169), `KERN`, `WELT`, `VILLAGE`, `RATSCHER`, `TREES` (9 Arten), Szene, Kamera, `VEH`. Der Modul-Worker startet unter den Sicherheitsregeln des Testservers, bekommt ein Zahlenfeld hin und zurück übergeben (nicht kopiert) und darf selbst abrufen (Antwort 200). `build.py` bündelt beide Dateien; Hilfsdateien unter `src/lazy/suhl/` werden hineingebündelt. |
| … und die Prüfwerkzeuge | Prettier prüft `src/lazy/**` mit (schlug an, bis formatiert war). **Lint und die Abhängigkeits-Prüfung sehen nur `modules.txt`** – Paket-Code wäre ungeprüft. Deshalb `viz3/extra/suhl-laufzeit/lint.mjs` (gleiche Regeln). Vorschlag dazu unter „Für den Suhl-Chat“. |
| Grenze des Workers | Einem Worker kann man keine Objekte der App geben, nur Daten (die Umrechnung `xf`, Adressen, Kacheln). Die Geometrie entsteht dort deshalb ohne three.js, als fertige Puffer. |
| (b) Himmel | **Der Entwurf hatte recht.** Am Garten und in Kloster Veßra ist der Himmel in allen vier Richtungen da. An Suhls Koordinaten, Blick 35° nach oben: Norden und Westen **schwarz**, Osten und Süden zeigen ein Stück der Kugel. Im waagerechten Blick zum Garten steht der Himmel als Ball im Schwarzen (Bild `out/suhl/tag1_suhl_zum_garten.jpg`). Kugel: 9 000 m um den Ursprung. → Haken S1 nötig. |
| … Sterne | **Abweichung vom Entwurf:** die Sterne folgen der Kamera schon (`time/daynight.js`, `pts.onBeforeRender`). Nur die Kugel in `garden/env.js` braucht den Haken. |
| (b) Sicht von oben | Gewollt war die Mitte (−4 698, 12 256), die App stellte y = 11 000 ein. → Haken K1 nötig. |
| Boden vor Suhl | Ohne Suhl sagt `KERN` dort: Boden 77,08 m (der Rand des alten Fern-Geländes, festgehalten), `free` = nein, Ort „Feldflur“. |
| (c) Genauigkeit 13 km vom Ursprung | Leitern aus 2-mm-Stäben, aus 12 cm betrachtet (Bild `out/suhl/tag1_praezision.jpg`). Mit lokalem Ursprung: Stäbe 7–8 Bildpunkte, gleichmäßig. Mit absoluten Koordinaten: 7–9, unregelmäßig, einzelne Stäbe sichtbar dicker. Das sind Fehler von etwa ±0,25–0,5 mm, wie die Schrittweite von 0,98 mm erwarten lässt. Sichtbar erst näher als etwa 0,5 m. → Suhls Netze bekommen den Ursprung ihrer Kachel; der Fernboden bleibt absolut (sein Shader liest die Weltlage). |

## 4 Wie Suhl lädt

| Schritt | Wann | Was |
|---|---|---|
| Zone baut | Beobachter näher als 11,8 km an der Mitte der Gemeinde | Paket und Index (`aktuell.json`, Indexe von `boden`, `g`, `b`, `s`). Fehlen die Daten, bleibt alles still (kein Fehler für Besucher), `SUHL.state` = `error`. |
| Fernsicht | näher als 2,5 km an Suhls Boden | Fernboden Stufen 6–9, die schlanke Stufe der Gebäude; das eine neue Programm wird vorab übersetzt (`warmUp`) |
| Nahboden | näher als 900 m | `WELT.need('suhl')`: Kacheln 10–12 aus Suhls Satz, wie in Schleusingen |
| Gebäude voll (Stufe 1) | Kachel näher als 700 m (Telefon 500 m) | Wände und Dächer mit den Programmen des Dorfs, Ursprung = Kachelmitte |
| Gebäude schlank (Stufe 2) | bis 3 500 m (Telefon 2 000 m) | Wände und Dachflächen mit je einer Farbe, ein Netz je Kachel |
| Bäume | Kachel näher als 600 m (Telefon 420 m) | Karten aus dem Baum-Atlas, ein Netz je Kachel |
| Straßen | mit dem Nahboden | Kacheln näher als 620 m; Übergabe an das Straßensystem oder gemalte Karte (Abschnitt 8) |
| Von oben | Bildhöhe bis 600 m: Stufe 1 und Bäume; darüber Stufe 2 | |
| Verlassen | 60 s jenseits von 12,4 km | alles frei; der Index bleibt |

Stufe 0 (Straßenraum als Geometrie) und Stufe 3 (Skyline aus `fern/skyline.bin`) gibt es noch nicht – sie brauchen Daten der
zweiten Welle (S2-5) und Stufe 3 des Plans. `SUHL.levelAt` meldet heute 1, 2 oder −1.

**Ohne Ruckeln:** der Rechner erzeugt die Puffer; der Hauptfaden setzt je Bild höchstens eine Kachel zusammen (gemessen: bis
13,7 ms). Höchstens drei Aufträge laufen zugleich.

**Aussehen der Gebäude (Stufe 2 des Plans, „nach Regeln“):** Gelesen wird der Datensatz des Daten-Vertrags (Schema 1, Fassung 1.1,
`docs/features/suhl-daten.md` Abschnitt 5 auf `suhl/daten`). Er bestimmt alles, was das Fassaden-Programm des Dorfs zeigen kann:
Material → Stil (`fas` über der Tabelle `fat` der Kachel: Putz, Platte, Klinker, Schiefer, Fachwerk, Sandstein, Sichtbeton, Blech,
Holz), Wandfarbe, Fensterachsen, Giebel (aus `F`), Brandwände ohne Fenster, eigenes Material einer Wand (`S`). Dächer: jede Fläche
(`R`) mit ihrer Deckung (Klassen 0–8) und Farbe aus dem Luftbild. Überdachungen (`bt` = `ueberdachung`) haben keine Wände.
**Gebäude, die es nicht mehr gibt (`fg` Bit 32), werden nicht gezeichnet** – im Probesatz 23 von 2 502. Der Hausfuß `z0` gilt,
solange `g.based_on.boden` die gültige Boden-Version nennt (heute: `g` v1 auf `boden` v1); sonst stellt die Laufzeit das Haus auf
ihre Kacheln. Geschosshöhe, Sockel, Balkone, Ladenzonen und Schilder kann das Programm des Dorfs nicht – das ist Stufe 3
(`suhl-wall`); die Angaben stehen in `SUHL.building(id).sides[].params` und `.signs` bereit.

## 5 Der Vertrag `SUHL.*`

Alles ist ab dem Laden der Seite aufrufbar. Vor dem Bau der Zone antworten Abfragen mit `null`, `undefined`, `-1` oder `[]`.

| Name | Stand |
|---|---|
| `SUHL.state`, `SUHL.near`, `SUHL.O`, `SUHL.BASE`, `SUHL.version` | da |
| `SUHL.toModel(lat, lon)`, `toLatLon(x, y)`, `toUTM(x, y)`, `fromUTM(E, N)` | da, geprüft am Mittelpunkt (auf 2 · 10⁻⁵ Grad) |
| `SUHL.ready()`, `onBuilt(fn)`, `onFreed(fn)`, `SUHL.load()` | da (`load` holt Paket und Index, ohne etwas zu zeichnen) |
| `SUHL.areas`, `areaAt(x, y)` | `stadt`, `kernstadt`, `zentrum` als Kreise; Umrisse und Viertel fehlen (Abschnitt 9) |
| `SUHL.quarters()` | leer, bis Viertel-Daten kommen |
| `SUHL.levelAt(x, y)`, `whenLevel(x, y, n)` | da |
| `SUHL.ground(x, y)` | Nahboden, sonst Fernboden, sonst `undefined` |
| `SUHL.building(id)`, `buildingAt(x, y)`, `buildingsIn(gebiet)` | da, für geladene Kacheln: `id`, `osm`, `name`, `adr`, `use`, `groundUse`, `fn`, `typ`, `era`, `year`, `kind`, `part`, `landmark`, `pts`, `holes`, `z0`, `eave`, `h`, `levels`, `roofForm`, `roof[]` (Ecken, Dreiecke, Fläche, Grundfläche, Richtung, Neigung, Klasse, Farbe), `sides[]` (Enden, Länge, Oberkanten, Brandwand, Giebel, Hof, Straße, Abstand, Erdgeschoss, Schilder, Fassaden-Parameter), `flags` (Wahrzeichen, Denkmal, begehbar, Leerstand, Abriss geplant, nicht mehr vorhanden, nur Kataster, neu), `q`, `tile`, `raw`. Was nicht mehr steht, nennen `buildingAt` und `buildingsIn` nicht; `building(id)` antwortet mit `flags.gone`. |
| `SUHL.buildingAsync(id)` | antwortet nur für geladene Kacheln (ein Verzeichnis Kennung → Kachel fehlt, Abschnitt 9) |
| `SUHL.override(id, patch)`, `reset(id?)` | da: `{ hidden: true }`, `{ col }`, `{ levels }`, `{ replace: {…} }`; die Kachel wird neu erzeugt, Ereignis `suhl:changed` |
| `SUHL.add(datensatz)`, `remove(id)` | da (Datensatz in Modellmetern: `f`, `e`, optional `F`, `rv`/`rt`) |
| `SUHL.detail(id, …)` | nimmt Anmeldungen an; gebaut wird noch nichts (Stufe 3) |
| `SUHL.ways(cx, cy, r)` | da: Wege aus den `s`-Kacheln als `{ kind, w, p, name, surf, fl }` |
| `SUHL.stops()`, `SUHL.signal(id)` | leer / `null` (Produkt `m` wird noch nicht gelesen) |
| `SUHL.data.building(id)`, `roofPlanes(id)`, `each(gebiet, fn)`, `meta` | da: Zahlen aus dem Feld `d` des Datensatzes (in UTM gerechnet, echte m²): `footprint` (`fa`), `floorArea` (`gfa`), `roofArea` (`rf`), `levels`; `volume`, `roofByDir`, `roofUsable`, `residents`, `heat`, `pvKwp` sind `null`, bis die Daten sie führen. Dachebenen in Modellkoordinaten. `data.quarter(id)` = `null`, bis `viertel.json` kommt |
| `SUHL.ownFade(x, y)` | 0 auf Suhls eigenem Boden, 1 ab 100 m außerhalb (für Zonen-Abfragen; die Fahrt fragt über `FAHRT.ground`, Abschnitt 8) |
| `SUHL.status()` | da; neu: `live` (was das Paket erzeugt und noch nicht freigegeben hat), `stadt.gone`, `stadt.z0`, `strassen.given` |
| Ereignisse | `suhl:built`, `suhl:freed`, `suhl:tile`, `suhl:quarter`, `suhl:changed` |
| Dienste für `KERN` | `free` (10), `pushOut` (15: Wandfüße und Stämme), `place` (20: „Steinweg, Suhl“), `ground` (8: Straßenflächen, heute leer; 3: Fernboden, bis die nahen Kacheln da sind), `terrain` (3) |

## 6 Gemessene Zahlen gegen die Budgets (Plan 3.4)

Gemessen am 13.11. gegen 03 Uhr im Test `viz3/test/suhl.py` (SwiftShader, 1100 × 680, Stufe „mittel“, Probesatz Zentrum v1,
Testserver am selben Rechner). Bildzeiten sagen in SwiftShader nichts; gezählt wird.

| Größe | Budget | Gemessen | Abschnitt |
|---|---|---|---|
| Abrufe zu Suhl beim Start | 0 | 0 | `start` |
| Daten bis zum ersten Straßenbild | 7–10 MB | **8,96 MB in 222 Antworten** | `sprung` |
| Zeit vom Sprung bis alles steht | – | 4 s (Index 13–43 ms, erstes Gebäude nach 2,7 s) | `sprung` |
| Draw-Calls für Suhl am Markt | + 180 | **66 (40 Suhl + 26 Boden-Kacheln; ganzes Bild 134)** | `zahlen` |
| Dreiecke für Suhl am Markt | + 800 000 | **335 000 (195 000 Suhl + 140 000 Boden; ganzes Bild 424 000)** | `zahlen` |
| Schlanke Stufe aus 2 km | ≤ 16 | 11 Netze für die Gebäude (+ 18 Fernboden) | `stufen` |
| Neue Shader-Programme | + 8 | **+ 2**: `suhl-fern` (neu) und `welt-tile` (vorhanden, aber vor der ersten Kachel nie übersetzt) | `zahlen` |
| Texturen je Programm | ≤ 16 | höchstens 15 | `zahlen` |
| Neue Lichter | 0 | 0 (10 vorher und nachher, auch nachts) | `zahlen`, `nacht` |
| Texturen | + 300 MB | + 96 Stück, höchstens 134 MB (wenn alle Boden-Kacheln mit 512 × 512 wären) | `zahlen` |
| Eine Kachel zusammensetzen (Hauptfaden) | Bild ≤ 50 ms | höchstens 13,7 ms (in den Läufen dieser Nacht 4–14 ms) | `zahlen` |
| Der Rechner (in node gemessen) | – | 2 479 Gebäude voll in 0,46–0,55 s (0,18–0,22 ms je Gebäude), schlank in 0,10–0,11 s | `bau_test.mjs` |
| Größe des Pakets | etwa 0,3 MB | 35 kB + 20 kB (verkleinert, ungepackt) | `dist/lazy/` |
| Am Markt geladen | – | 8 Kacheln voll, 3 schlank, 2 479 Gebäude (23 nicht mehr vorhandene ausgelassen, 0 unlesbar), 9 026 Bäume in 8 Kacheln, 9 885 Wandfüße, 6 764 Stämme, 1 083 Wegstücke, 28 Kacheln Fernboden | `sprung` |
| Hausfüße | – | 1 von 2 479 liegt mehr als 2,5 m neben der Geländekachel und steht deshalb auf der Kachel (im ersten Probesatz, vor dem Ablesen vom Boden: 1 061 von 2 501) | `sprung`, `bau_test.mjs` |
| Nach dem Verlassen | alles frei | kein Netz von Suhl in der Szene, keine Kachel, keine Straßenkarte. Das Buch des Pakets steht nach dem ersten und nach dem zweiten Besuch auf 0 Geometrien / 0 Texturen / 0 Materialien. Zähler des Renderers (Geometrien / Texturen / Programme): vor jedem Besuch 781 / 378 / 164, in Suhl 1 068 / 490 / 166, nach dem ersten Besuch 971 / 403 / 164, nach dem zweiten 971 / 405 / 164. Der Abstand zum Anfang sind Dinge der App, die beim Besuch zum ersten Mal gezeichnet wurden (three.js zählt erst dann). | `frei` |
| Telefon: Bilder | + 90 MB | **+ 23,3 MB** (244,9 → 268,2 MB, 88 Bilder, Textur-Stufe 1). Radien 500 / 2 000 / 420 m, Daten 8,96 MB in 221 Antworten, höchstens 15 Texturen je Programm | `telefon` |

Was der Test außerdem zeigt: der Boden unter den Füßen ist die gezeichnete Kachel (auf 1 cm); eine Hauswand hält den Gänger auf
(21 cm vor der Wand); `KERN.place` sagt „Steinweg, Suhl“ und „Marktplatz, Suhl“; ein Auto fährt 219 m die Gothaer Straße entlang,
bis 26 km/h, die Räder am Boden (Abweichung 5 cm); von oben steht die Kamera über dem Zentrum (nicht mehr bei 11 km festgehalten);
nachts leuchten die Fenster nach der Uhr des Dorfs. Rund um den Markt (220 m) kennt `SUHL.building` 304 Häuser mit 521 Dachflächen,
55 539 m² Grundfläche und 61 529 m² Dachfläche (Summe der Felder `d.fa` und `d.rf`); 183 haben eine Seite an einer benannten
Straße, 156 Schilder stehen in den Daten. Keine Anfrage nach einer Datei von Suhl schlägt fehl.

**Ankunftspunkt:** Mit den Bäumen von v1 stand der alte Punkt auf dem Markt unter einer Krone – eine flache Baum-Karte 2 m vor
der Kamera füllte das erste Bild. Der Punkt `suhl` liegt jetzt 15 m weiter in der Mitte des Platzes (−4 638,5 / 12 474,5), 10 m
von jeder Krone. Alle Zahlen der Tabelle sind an diesem Punkt gemessen (lokale Läufe 03:04–03:18).

**Die Bilder auf dem Probesatz v1** (lokal `out/suhl/`, bei GitHub im Artefakt `out` des Laufs): `suhl_markt.jpg`, `suhl_markt_s.jpg`,
`suhl_markt_w.jpg`, `suhl_steinweg.jpg`, `suhl_schraeg.jpg`, `suhl_hoch.jpg`, dazu `suhl_fern.jpg`, `suhl_wand.jpg`, `suhl_fahrt.jpg`,
`suhl_oben_400/1500/6000.jpg`, `suhl_nacht.jpg`, `suhl_telefon.jpg`. Am Markt: gepflasterter Platz, Häuser mit Fenstern und Dächern,
drei Bäume, hinten ein Hochhaus. **Der graue Buckel quer über den Steinweg ist mit v1 weg:** die
Straße liegt eben zwischen den Häusern. Es bleibt ein Absatz am Fuß der linken Häuserzeile, wo der Einschnitt auf das Gelände am
Haus trifft (im Bild etwa einen halben Meter).

## 7 Die Haken in gemeinsamen Dateien

Ein eigener Commit: `b0d40d80` („the hooks in shared files“), 4 Dateien, 23 Zeilen dazu, 8 weg. Jeder Haken trägt `feat/suhl`.

| # | Datei | Änderung | Geht es ohne? |
|---|---|---|---|
| H1 | `viz3/src/modules.txt` | eine Zeile `welt/suhl.js` unter der Marke; Text der Marke angepasst | nein |
| W1 | `welt/welt.js`, `addSet(sub, base)` | ein Satz darf eine eigene Adresse haben | ja: das Paket setzt `base` auch am zurückgegebenen Satz; W1 macht es amtlich |
| W2 | `welt/welt.js`, `setOf` | `tiling.levels[L].has` = Liste `[x, y]`; `rect` ist dann nur der Rahmen | nein (die 11 Kacheln der Stufe 10 füllen ihr Rechteck von 4 × 4 nicht) |
| W3 | `welt/welt.js`, `lowerOuter` | `WELT.lowerAlso(x, y)` wird gefragt; `WELT.lowerOuter` zum Neu-Rechnen | nein |
| **W4** | `welt/welt.js` | `WELT.tileMat` – das Material der Kacheln | **neu, nicht im Plan.** Ja, mit einem eigenen Programm für den Fernboden; dann aber anderes Aussehen an der Naht und ein Programm mehr. So folgt der Fernboden allem, was der Straßen-Chat am Kachel-Material ändert. |
| S1 | `garden/env.js` | Himmelskugel folgt der Kamera, wird nicht weggeschnitten | nein |
| K1 | `game/camera.js`, `applyCam` | Mitte der Draufsicht bis x −16 km, y +23 km | nein |
| H2 | – | **nicht nötig:** der Menüknopf entsteht mit `?suhl=1` im Anmelde-Modul | |
| F1 | – | **nicht von mir:** der Straßen-Chat hat `FAHRT.add/drop/ground` gebaut (Runde 2, `kern/strassen` 4d69fa03). Die Laufzeit ruft nur diese Funktionen und fasst `welt/fahrt.js` nicht an (Abschnitt 8). | |

Der Straßen-Chat ändert in `welt/welt.js` den Shader-Text und `tileMat`; die Haken liegen an anderen Stellen (Zeilen 65–69,
100–111, 261, 628, 635). W4 steht direkt unter `tileMat` – **beim Zusammenführen mit `src` nach dem Straßen-Paket ist dort Handarbeit
möglich.** Der Straßen-Chat hat gegen keinen Haken etwas (Nachricht des Suhl-Chats, 02:41). Auf dem Stand der Haken waren bei
GitHub grün (Lauf 43343522921): `smoke`, `fahrt`, `schleusingen`, `vessra`, `gpu`, `strategie_oben`.

```diff
diff --git a/viz3/src/game/camera.js b/viz3/src/game/camera.js
index 0b3bf83c..9b77bb85 100644
--- a/viz3/src/game/camera.js
+++ b/viz3/src/game/camera.js
@@ -24,9 +24,10 @@ export const ORBMAX = () => (window.RATSCHER && LATE.RATSCHER.ready ? 420 : 70);
 export function applyCam() {
   if (P.mode === 'top') {
     P.th = Math.min(P.th, TOPMAX());
-    const lim = TOPMAX() > 1000 ? 11000 : 400;
-    P.tx = THREE.MathUtils.clamp(P.tx, -lim, lim);
-    P.ty = THREE.MathUtils.clamp(P.ty, -lim, lim);
+    const lim = TOPMAX() > 1000 ? 11000 : 400,
+      big = lim > 1000; // feat/suhl (K1): the frame holds the municipality of Suhl too (west to −14.9 km, north to 21.9 km)
+    P.tx = THREE.MathUtils.clamp(P.tx, big ? -16000 : -lim, lim);
+    P.ty = THREE.MathUtils.clamp(P.ty, -lim, big ? 23000 : lim);
     const h = topH();
     cam.fov = TOP_FOV;
     cam.near = Math.max(0.5, h * 0.04);
diff --git a/viz3/src/garden/env.js b/viz3/src/garden/env.js
index 55f18bd5..0fa82614 100644
--- a/viz3/src/garden/env.js
+++ b/viz3/src/garden/env.js
@@ -79,6 +79,10 @@ export const skyMat = new THREE.ShaderMaterial({
 export const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), skyMat);
 sky.userData.noMerge = true;
 sky.renderOrder = -10;
+// feat/suhl (S1): the sphere stands around whichever camera draws it (only its place; the directions stay) – beyond 9 km from the garden
+// the sky was a ball in a black void (Suhl), and it must not be culled as an object far away
+sky.frustumCulled = false;
+sky.onBeforeRender = (r, s, c) => sky.matrixWorld.copyPosition(c.matrixWorld);
 scene.add(sky); // drawn first: the real land reaches beyond the sky sphere
 // photographic sky (Poly Haven CC0, log-encoded upper hemisphere, see tools/mksky.py): replaces the painted sky as soon as its image is loaded;
 // rotated so the bright sun region of the photo lies where the modelled sun stands
diff --git a/viz3/src/modules.txt b/viz3/src/modules.txt
index acf21896..c561ac2d 100644
--- a/viz3/src/modules.txt
+++ b/viz3/src/modules.txt
@@ -87,7 +87,8 @@ welt/welt.js                # the tiled world (tools/welt) streamed around the c
 welt/schleusingen.js        # Schleusingen after photos: the old town walkable, Rathaus to enter, landmarks, lamps, street names (SCHL)
 # feat/vessra: Kloster Veßra below this line (the monastery, the village, the tree nursery)
 welt/vessra.js              # Kloster Veßra: the monastery ruin and its grounds, the village, the tree nursery Baumschule Kammbach – walkable (VESSRA)
-# feat/suhl: Suhl below this line, in this order: welt/suhl.js (the town), welt/suhl_innen.js (buildings to enter), welt/suhl_leute.js (the people)
+# feat/suhl: Suhl below this line – only its registration; the city itself is a package loaded on demand (src/lazy/suhl.js, src/lazy/suhl/**)
+welt/suhl.js                # feat/suhl Suhl: the zone around the municipality, places, ?szenario=suhl, the contract SUHL.* as a shell – no request at the start (SUHL)
 # feat/welt-gebaeude: every building in 3D below this line (after the village and the zones, before world/worldcol.js: its collisions)
 gebaeude/gebaeude.js        # feat/welt-gebaeude the buildings the app lacked, from ETHOS.BUILDA: footprint, height, estimated roof, village shaders (GEB)
 world/worldcol.js          # V16b collisions with the real surroundings: walls, trunks, bridge railings (WCOL)
diff --git a/viz3/src/welt/welt.js b/viz3/src/welt/welt.js
index 2e739ac6..215d18e5 100644
--- a/viz3/src/welt/welt.js
+++ b/viz3/src/welt/welt.js
@@ -62,9 +62,10 @@ export const WELT = (() => {
   // ---- tile sets: the test block and the blocks of detail zones (sub path below the base, own meta.json) ----
   const MAIN = { sub: '', base: S.base, meta: null, p: null, fail: -1e9, err: '' },
     SETS = [MAIN];
-  S.addSet = sub => {
+  S.addSet = (sub, base) => {
     let st = SETS.find(q => q.sub === sub);
-    if (!st) SETS.push((st = { sub, base: S.base + sub, meta: null, p: null, fail: -1e9, err: '' }));
+    // feat/suhl (W1): a set may live at an address of its own (base: the data repo of Suhl), not below WELT's base
+    if (!st) SETS.push((st = { sub, base: base || S.base + sub, meta: null, p: null, fail: -1e9, err: '' }));
     return st;
   };
   // ---- zones that need the tiles (a zone may name its own tile set: WELT.need('vessra', true, 'zonen/vessra/')) ----
@@ -99,8 +100,13 @@ export const WELT = (() => {
   // the set whose level rect holds tile (L, x, y)
   const setOf = (L, x, y) => {
     for (const st of SETS) {
-      const r = st.meta && st.meta.tiling.levels[L] && st.meta.tiling.levels[L].rect;
-      if (r && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return st;
+      const lv = st.meta && st.meta.tiling.levels[L],
+        r = lv && lv.rect;
+      if (!r || x < r[0] || x > r[2] || y < r[1] || y > r[3]) continue;
+      // feat/suhl (W2): a level may list its tiles (has: [[x, y], …]) – a municipality is no rectangle; rect is then only their frame
+      if (lv.has && !(lv.hasSet || (lv.hasSet = new Set(lv.has.map(q => q[0] + '/' + q[1])))).has(x + '/' + y))
+        continue;
+      return st;
     }
     return null;
   };
@@ -252,6 +258,7 @@ export const WELT = (() => {
     m.customProgramCacheKey = () => 'welt-tile' + (window.GLCHECK && GLCHECK.lite ? '-lite' : '');
     return m;
   }
+  S.tileMat = tileMat; // feat/suhl (W4): Suhl's far ground (levels 6–9) is drawn with the tiles' own material – same look, no new program
   // ---- level pads: a zone may set the terrain flat inside a polygon (a courtyard, the floor of a hall) ----
   const pads = [];
   const inPoly = (P, x, y) => {
@@ -618,12 +625,14 @@ export const WELT = (() => {
         const [E, N] = toU(x, y);
         low = cov(E - 130, N - 130) && cov(E + 130, N - 130) && cov(E - 130, N + 130) && cov(E + 130, N + 130);
       }
+      if (!low && S.lowerAlso && !insideBox(x, y)) low = !!S.lowerAlso(x, y); // feat/suhl (W3): under the far ground a zone draws itself
       p[i + 1] = saved[i + 1] - (low ? 40 : 0);
       if (low) n++;
     }
     S.lowered = n;
     outer.geometry.attributes.position.needsUpdate = true;
   }
+  S.lowerOuter = lowerOuter; // feat/suhl (W3): asked again when a zone's far ground came or went
   // ---- heights for KERN: the triangles of the finest drawn tile (as drawn) ----
   function heightAt(x, y) {
     if (!S.active || !S.visible || !S.visible.size || insideBox(x, y)) return undefined;
```

M1 (Karte) ist später dran und nicht gebaut.

## 8 Straßen: wer sie zeichnet

Suhl baut kein zweites Straßensystem. `kern/strassen.js` kennt zwei Wege und wählt selbst:

| | Heute in `src` (ohne Runde 2) | Sobald `FAHRT.add` und `FAHRT.drop` da sind |
|---|---|---|
| Wer zeichnet | Suhl malt Wege und Plätze der `s`-Kacheln in die eine Straßenkarte von `WELT` (Fenster 768 m, neu nach 150 m Weg): Asphalt mit Bord, Pflaster, Platten | die Karte des Straßensystems; Suhl malt nichts und setzt keine eigene Karte |
| Was Suhl gibt | – | jede `s`-Kachel als eigener Satz `suhl/s/<x>/<y>` an `FAHRT.add(name, json, { carve: false, places: false })`: Tabellen `kinds`, `surf`, `names`; `ways` mit den sieben Feldern der Fahrtdaten, Lagen als **absolute Modell-Dezimeter**; daneben `s0` und `lanes`; `areas` als `[Belag, Merker, Name, Ring, Löcher, Typ]`, jede Fläche nur aus der Kachel ihres Bezugspunkts (`home`) |
| Bebaute Flächen | – | einmal als Satz `suhl/orte` (`orte` und `places` aus dem Index von `s`); sie machen den Stil „Stadt“ |
| Boden-Auskunft | – | `FAHRT.ground(fn)`, einmal je Seite: `true` (naher Boden ist gezeichnet), `false` (Suhls Land, lädt noch – das Auto wartet), `undefined` (nicht Suhl oder Suhl nicht gebaut) |
| Verlassen | Karte weg | `FAHRT.drop` für jeden Satz |

Nimmt die Fahrt eine Kachel nicht an (ausgeschaltet, Fehler), bleibt für diese das eigene Malen. Die Kacheln stehen im Rahmen des
Vertrags (Dezimeter relativ zur Kachelmitte `o`); der Probesatz von 02:28 Uhr schrieb absolute Dezimeter und sagte das im Index
(`unit`) – gelesen wird, was die Datei nennt.

**Geprüft:** Abschnitt `uebergabe` des Tests. Solange `FAHRT.add` fehlt, stehen dort Platzhalter, die nur mitschreiben; gibt es die
Funktionen, werden die echten umhüllt. Ergebnis mit Platzhaltern: 6 von 6 Prüfungen – 8 Kacheln als 8 Sätze (1 083 Wege,
103 Flächen), `suhl/orte` einmal; `FAHRT.ground` antwortet am Markt `true`, 1,2 km entfernt auf Suhls Land `false`, außerhalb
`undefined`; beim Verlassen 9 Sätze gekommen und 9 gegangen. **Gegen das echte Straßensystem ist die Übergabe noch nicht
gelaufen** – das geht erst, wenn `src` die Runde 2 enthält.

Noch nicht gebaut: Möbel der Straße (Produkt `m` → `STRDAT.add` je Kachel; Ampeln, Querungen, Haltestellen und Straßennamen
zeichnet Suhl selbst), Brücken (`decks`), die Routen der Anfahrt mit Namen für die kleine Karte (`routes`; sie liegen nicht in den
Kacheln).

## 9 Was die Daten-Agenten für die Laufzeit ändern sollten

| An | Bitte | Warum |
|---|---|---|
| `suhl-gebaeude` | erledigt: `z0` vom Boden abgelesen | mit `g` v1 auf `boden` v1 liegt noch 1 von 2 479 Füßen mehr als 2,5 m neben der Kachel (im ersten Probesatz 1 061 von 2 501) |
| alle | Hinweis: auf den Zweigen liegen `v0` und `v1` nebeneinander; um 02:35 war bei `g` die `v1` die ältere (Fassung 1.0), um 02:47 die neuere | `probe_holen.py` nimmt deshalb von jedem Produkt die zuletzt erzeugte Version, nicht die höchste Nummer |
| `suhl-gebaeude` | ein Verzeichnis Kennung → Kachel (z. B. `ids.json.gz` je Viertel) | für `SUHL.buildingAsync(id)` und `SUHL.data.each`, ohne alle Kacheln zu laden |
| `suhl-gebaeude` | `d` um `vol`, `ro`, `ru`, `res`, `heat`, `pv` ergänzen, wenn Szenarien sie brauchen | `SUHL.data.building` gibt sie heute als `null` |
| `suhl-boden` | erledigt mit v1: ein Ring mehr, Farben angeglichen, 1-m-Gelände mit Einschnitt | Fernboden 28 statt 10 Kacheln; der Buckel im Steinweg ist weg |
| `suhl-boden` | `t/` und `i/` im Versionsordner lassen | `WELT` liest beide unter der Adresse des Satzes. Eigene Ordner für Gelände und Bild bräuchten einen weiteren Haken in `welt/welt.js`. |
| `suhl-boden`, `suhl-strassen`, `suhl-daten` | `based_on` im Kreis klären | `boden` v1 nennt `s` 0, `s` v1 nennt `boden` 1, `g` v1 nennt `boden` 1. Die Laufzeit prüft nur `g` gegen `boden`. |
| `suhl-strassen` | `orte` und `places` im Index von `s` lassen (oder `orte.json` im Index nennen – ist geschehen) | die Laufzeit schickt sie einmal an `FAHRT.add` |
| `suhl-strassen` | Routen der Anfahrt mit Namen als Datei im Satz | für die kleine Karte („Suhl 12 km“) |
| `suhl-gruen` | – | Format `b` passt (v1: 12 714 Bäume). `gr` und `w` liest die Laufzeit noch nicht. |
| `suhl-daten` | erledigt: `aktuell.json` und Index in der Form des Vertrags | die Laufzeit liest `products`, `version`, `path`, `index`, `based_on`, `has` |
| `suhl-daten` | Gebiete und Viertel als Datei (`gebiete.json`: Umrisse in Modellmetern, Mitte, Name, Art, Eltern) | für `SUHL.areas`, `areaAt`, `quarters()`; heute nur drei Kreise |

## 10 Offen, unsicher, nächster Schritt

- **Übergabe der Straßen** ist nur gegen Platzhalter geprüft (Abschnitt 8). Nächster Schritt, sobald `src` die Runde 2 enthält:
  `src` holen, zusammenführen, Haken prüfen, Tests neu, die fünf Bilder neu ansehen.
- **Bäume aus der Nähe** sind flache Karten (Atlas der Garten-Bäume). Aus mehr als 30 m und von oben gut, neben dem Gänger nicht –
  mit den Bäumen von v1 (viele echte Stadtbäume) fällt das auf. Nächster Schritt: die nächsten 40–80 Bäume als 3D-Modelle
  (`TREES`, wie `world/ratscher.js`), der Rest Karten.
- **Daten bis zum ersten Straßenbild** liegen mit v1 nahe an der oberen Grenze (Abschnitt 6). Mehr Fernboden-Kacheln kosten Daten;
  für die ganze Stadt den Fernboden nach Sicht staffeln (erst Stufe 6–7, dann 8–9).
- **Stufe 3 (Skyline)** und **Fensterpunkte nachts in Stufe 2** fehlen. Aus mehr als 3,5 km sieht man keine Gebäude.
- **`SUHL.detail`** baut noch nichts; **Haltestellen, Ampeln** fehlen (Produkt `m`).
- **Echte Geräte:** Bildzeiten, das Übersetzen des neuen Programms auf der Intel-Grafik und der Speicher am iPhone sind nicht
  gemessen (SwiftShader). Das prüft Falko in der Vorschau.
- **Datenstand ohne Paket:** Fehlt `aktuell.json` (kein Netz, Repo leer), bleibt Suhl still. Ein zweiter Versuch folgt erst beim
  nächsten Besuch der Zone.
- **Regen unter Dächern, nasser Boden, Schnee:** nicht geprüft. Die Dächer nutzen das Dach-Programm des Dorfs; ob `wx_boden` die
  schlanke Stufe erkennt, ist offen (sie hat ein eigenes Programm `suhl-fern`).
- **Drei Meldungen „404“** stehen in den Protokollen einiger Läufe. Zu Suhls Dateien gehören sie nicht: der Test meldet jede
  fehlgeschlagene Anfrage nach einer Datei von Suhl, und es gibt keine. Woher die drei kommen, ist nicht geklärt.

## 11 Tests

`viz3/test/suhl.py`, Abschnitte einzeln wählbar (`suhl:start,sprung`):

| Abschnitt | Prüft |
|---|---|
| `start` | kein Abruf, kein Paket, Zone ruht; Szene und Sprungziele da, kein Menüknopf ohne `?suhl=1`; Umrechnungen; der Vertrag antwortet |
| `sprung` | Sprung zum Markt: Zone, Index, eigener Boden, Gebäude voll, Datensätze nach Fassung 1.1, Bäume, Fernboden, Datenmenge, keine fehlgeschlagene Anfrage; sechs Bilder |
| `stufen` | Stufen nach Entfernung; aus 2 km nur die schlanke Stufe und kein Nahboden; zurück am Markt wieder voll |
| `boden` | Boden an fünf Punkten; `buildingsIn`/`building`/`data.building`; eine Hauswand hält auf; Wandfüße und Stämme; Ortsnamen, Wege, Straßenkarte |
| `fahrt` | mit dem Auto eine Straße des Probesatzes entlang |
| `zahlen` | Draw-Calls, Dreiecke, Programme, Lichter, Texturen gegen die Budgets; ≤ 16 Texturen je Programm |
| `oben` | Draufsicht in 400, 1 500 und 6 000 m Bildhöhe |
| `frei` | Verlassen gibt alles frei (das eigene Buch des Pakets steht auf 0); zwei gleiche Besuche hinterlassen dasselbe |
| `nacht` | Fenster, keine neuen Lichter |
| `telefon` | iPhone-13-Kontext: kürzere Radien, Datenmenge, Bilder-Speicher, Programme |
| `uebergabe` | die Straßen gehen an das Straßensystem (Abschnitt 8); eigene Seite |
| `tag1` | die Prüfungen des ersten Tages (nicht im Standardlauf) |

Bei GitHub (`feat.yml`, je Zeile von `tests.txt` ein Job): `suhl` in drei Jobs, dazu `schleusingen`, `vessra`, `fahrt`, `gpu`,
`strategie_oben` – sie müssen mit den Haken grün bleiben.

**Stand bei GitHub** (Workflow „Feature“):

| Lauf | Commit | Ergebnis |
|---|---|---|
| 43343522921 | `b0d40d80` (die Haken) | grün: `smoke`, `fahrt`, `schleusingen`, `vessra`, `gpu`, `strategie_oben`, `suhl-telefon` (5/5). Rot: zwei Suhl-Jobs – Fehler meines Tests (siehe „Für den Suhl-Chat“). |
| 43347907819 | `ed0ce2df` (Fassung 1.1, Probesatz v1) | vom nächsten Push abgebrochen. Bis dahin grün: `smoke`, `schleusingen`, `vessra`, `strategie_oben`, `suhl-telefon-uebergabe` (12/12). Rot: `suhl-start-…` 24/25 – „Stämme in der Kollision: 0“: der Test hielt eine Pause zwischen zwei Lade-Aufträgen für Ruhe. Behoben in `0d480c79`. |
| 43350235214 | `0d480c79` | **alles grün** (03:26): `suhl:start,sprung,stufen,boden,fahrt` 26/26, `suhl:zahlen,oben,frei,nacht` 16/16, `suhl:telefon,uebergabe` 12/12, dazu `smoke`, `fahrt`, `schleusingen`, `vessra`, `gpu`, `strategie_oben`. Bilder und Protokolle im Artefakt `out`. |

Lokal auf demselben Stand (03:04–03:18): dieselben drei Suhl-Zeilen mit 26/26, 16/16 und 12/12.

## Für den Suhl-Chat

- **Nachrichten an dich gehen seit 02:47 nicht mehr durch** („Not sent“). Alles Weitere steht hier und im Abschlussbericht.
- **Die zwei roten Suhl-Jobs von Lauf 43343522921** (Stand der Haken) waren Fehler meines Tests, nicht der App und nicht der Haken:
  (1) `suhl:start,sprung,stufen,boden,fahrt`, 22/23: „0,00 MB in 0 Abrufen“ – der Test las die Abrufe aus der Liste der Seite; die
  war bei GitHub voll (250 Einträge) und sieht die Abrufe des Workers nie. Jetzt zählt er die Antworten des Browsers.
  (2) `suhl:zahlen,oben,frei,nacht`, 13/14: „zweiter Besuch hinterlässt nichts“ – three.js zählt Geometrien und Texturen erst beim
  ersten Zeichnen, und der Test schaltete zwischen den Besuchen auf Nacht. Jetzt führt das Paket ein eigenes Buch
  (`SUHL.status().live`), und verglichen werden zwei gleiche Besuche.
- **`src` zusammenführen:** Ich habe nicht geholt (dein Wort kam nicht mehr an). Schritte: `git fetch --depth=50 origin src`, in
  `feat/suhl-laufzeit` zusammenführen, W4 neben `tileMat` prüfen, `bash tools/check.sh`, Tests. Der Abschnitt `uebergabe` läuft dann
  gegen die echten Funktionen.
- **Lücke im Lint:** `tools/check/lint.mjs` und `deps.mjs` lesen nur `modules.txt`. Kleine, sichere Änderung (gemeinsame Datei, nicht
  meine): in `lint.mjs` die Dateiliste um `src/lazy/suhl.js`, `src/lazy/suhl-worker.js` und `src/lazy/suhl/**/*.js` erweitern, für
  diese Dateien `globals.worker` dazunehmen. Bis dahin: `node viz3/extra/suhl-laufzeit/lint.mjs` (0 Fehler). Fremde Pakete
  (`anthropic.js`, `piper.js`, `raum.js`) bleiben draußen.
- **W4 ist neu** (nicht in der Liste des Plans): bitte mit ankündigen. Begründung in Abschnitt 7.
- **H2 entfällt** in Stufe 2. Zum Freigeben später: die Zeile in `shell/menu.html` und `menu: true` in `welt/suhl.js`.
- **Die Zone baut auch ohne Suhl-Fahrt:** ihr Kreis (11,8 km um −4 362 / 13 836) reicht im Norden von Block B bis etwa y = 2 100.
  Wer dort fährt, löst das Laden von Paket und Index aus (klein, gewollt). Fehlen die Daten, geschieht nichts.
- **Für den Wetter-Chat:** die schlanke Stufe hat das Programm `suhl-fern` (Schlüssel `customProgramCacheKey`), falls nasse Dächer
  und Schnee auch dort gelten sollen.
- **Für den Kern-Chat:** three.js zählt Geometrien und Texturen erst beim ersten Zeichnen. Ein Vergleich „vorher/nachher“ nach
  einem Besuch weit draußen zählt deshalb Dinge mit, die es schon gab (Baum-Zellen um Ratscher, aus 13 km zum ersten Mal im Bild).
  Der Test `frei` vergleicht darum zwei gleiche Besuche.
- Der Probesatz liegt in `viz3/extra/suhl-laufzeit/dist/suhl/` (10,9 MB in git). Sobald das Daten-Repo den Probesatz hält, kann
  er dort heraus; die Tests bräuchten dann `viz3/test/suhl_tiles.py` (wie `vessra_tiles.py`) – noch nicht geschrieben.
