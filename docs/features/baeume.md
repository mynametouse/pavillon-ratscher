# Bäume geben Fahrzeugen nach (Branch `feat/baeume`)

Falko, 23.10.2026 2:52: kleine Bäume lassen sich mit Traktor und Auto umfahren – alles, was realistischerweise umfallen würde, oder es
biegt sich wenigstens. Das Spiel soll dabei etwas lehren: Stammdurchmesser, Kraft, Hebel.

## Die Regel

1. **Stammdurchmesser** in Brusthöhe (BHD, 1,3 m) aus Höhe und Schlankheitsgrad H/D (forstliche Faustregel): Fichte ≈ 80, Lärche ≈ 77,
   Kiefer ≈ 74 (herrschende Bäume etwas stärker) – so trägt es jeder Baum des Walds an der Klinge schon (`world/forest.js` `dbh`);
   Kronen aus dem Kronenhöhenmodell: Nadelbaum H/D 75, Laubbaum 55 (frei gewachsen: Feldrand, Gärten). Beispiel: Fichte 8 m → Ø 10 cm.
2. **Widerstand**: das Moment, das den Stamm bricht oder den Wurzelteller herausreißt, M = σ · π · D³ / 32 (Widerstandsmoment des runden
   Stamms) mit σ ≈ 30 N/mm² (grünes Holz mit Ästen), mal Verankerung: Fichte 0,9 (Flachwurzler, kippt mit dem Wurzelteller), Lärche 1,0,
   Kiefer 1,1 (Pfahlwurzel), Laubbaum 1,2. In der Höhe h, in der das Fahrzeug anstößt, braucht es die Kraft **F = M / h**.
   Doppelter Durchmesser → achtfache Kraft; höher angesetzt (Frontlader oben) → mehr Hebel.
3. **Fahrzeug**: was seine Front an einem dünnen Stamm aushält, ohne kaputt zu gehen – Auto ≈ 6 kN am Stoßfänger (0,45 m), Traktor
   ≈ 22 kN an den Frontgewichten (0,75 m) bzw. am Frontlader in dessen Höhe (gesenkt ≈ 0,5 m, gehoben bis 1,6 m). Die Kraft kommt aus
   dem Aufprall (m · v² / 2 s, Nachgeben von Stamm, Wurzel und Stoßfänger s ≈ 0,35 m) oder aus dem Schieben mit Gas (Zugkraft: Auto
   ≈ 4 kN, Traktor mehr als seine Front aushält). Mit Anhänger zählt dessen Masse mit.
4. **Ergebnis**:

| Stamm | Auto (≥ 7 km/h) | Traktor |
|---|---|---|
| Jungbaum Ø < 4 cm (bis ≈ 3 m) | biegt sich unter dem Fahrzeug, federt zurück (bleibt etwas schief), bremst kaum | ebenso |
| Fichte bis ≈ 9–10 cm (≈ 8 m) | kippt mit dem Wurzelteller in Schubrichtung, bleibt liegen | ebenso |
| Fichte bis ≈ 16–18 cm (≈ 14 m) | hält das Auto auf, Krone schwankt | kippt um |
| dicker | hält auf (wie bisher), Krone schwankt, bei starkem Stoß ein Knarzen | hält auf |

   Zum Vergleich: Die Richtlinien für passiven Schutz an Straßen (RPS 2009) zählen Bäume ab 25 cm Stammumfang (≈ 8 cm Durchmesser) als
   nicht verformbares Hindernis.
   Schnell (ab ≈ 4 km/h) geht ein Stamm, der nachgibt, sofort; **langsam geschoben** neigt er sich mit dem Fahrzeug (es kriecht mit
   höchstens 0,4 m/s weiter, der Wurzelteller hebt sich, es knarzt) und reißt bei ≈ 16° aus – setzt man vorher zurück, richtet er sich
   wieder auf. Langsam schafft das Auto nur, was es mit Gas schieben kann (≈ 8 cm). Das Fahrzeug verliert die Arbeit, die das Umdrücken
   kostet (M · 0,35 rad), es wird langsamer, hält aber nicht an. Ein Stamm, der hält, gibt elastisch nach: unter dem Anteil r der Kraft,
   die ihn ausreißen würde, neigt er sich um r · 5° (eine 11-cm-Fichte am Auto ≈ 3,5°, ein dicker Stamm kaum), ein Stoß
   lässt ihn etwa so weit schwingen. Ein kurzer Hinweis nennt Durchmesser und Kräfte (umgedrückt jedes Mal, „zu stark“ alle 8 s,
   Biegen höchstens alle 90 s).
   Gehende werfen keine Bäume um. Vom Förster markierte Bäume und solche, an denen gerade gefällt wird, bleiben, wie sie sind (Fällen hat
   seinen eigenen Zustand).
5. **Liegen bleiben**: ein umgedrückter Baum verlässt sofort die Kollisionen (kein Hindernis mehr, auch nicht für Gehende), liegt auf dem
   Boden (Hang beachtet, Krone hält den Stamm etwas hoch) mit aufgestelltem Wurzelteller und bleibt nach dem Neuladen liegen
   (Speicher `pav-trees-v1`: `{ v: 1, t: [[x, y, Richtung°, Winkel], …] }`, höchstens 2000). Darüberfahren: rollt ein Rad über den
   liegenden Stamm, ruckt das Fahrzeug (Nicken/Wanken) und verliert Tempo – je dicker und schneller, desto mehr –, in der Krone knacken Äste.

## Wo der Code ist

- `viz3/src/world/treehit.js` (`TREEHIT`): Regel, Bewegungen (biegen, schwanken, fallen) nur der Bäume in Bewegung, Wurzelteller
  (ein InstancedMesh), Töne (Knacken, Rascheln, Aufschlag, Knarzen, Rad über Stamm, Zweige – synthetisch über `audio.raw()`),
  Speichern, Testhilfen (`info(i)`, `verdict(i, 'car'|'tractor', kmh)`, `state(i)`, `axisOf(i)` – die gezeichnete Stammachse aus der
  Instanzmatrix –, `stats()`, `rule`) und `standUp()` (alle umgefahrenen Bäume wieder aufstellen, Speicher leeren) – im Menü unter
  „Orte“ der Knopf **„Bäume aufstellen“** (`shell/menu.html`, `data-treereset`, kurzer Hinweis, wie viele wieder stehen).
- `viz3/src/world/worldcol.js` (`WCOL`): die Jungbäume (≤ 2,5 m) als weiche Stämme – nur Abfragen mit `each(…, soft = true)` sehen
  sie (die Fahrzeuge, die sie biegen); Gehende, ein an der Seilwinde gezogener Stamm und die Kamera nicht –,
  umgefahrene als `dead` (jede Abfrage überspringt sie – kein NaN, kein Löschen während einer Abfrage; Lehre V16b5), `src` (Baum je Stamm),
  `removeIdx`, `treeAt`, `trunk`.
- `viz3/src/world/forest.js`: `t.tilt` (Drehung um den Stammfuß + Versatz durch den Wurzelteller) in allen drei Detailstufen
  (`matrixOf`, `farMatrix`), `FOREST.retilt(t)` schreibt die Instanzen eines Baums neu.
- `viz3/src/world/ratscher.js`: `RATSCHER.treeRecs` – jede gezeichnete Krone mit ihren Instanzen und ihrem Garten-Kollisionskasten.
- `viz3/src/vehicles/vehicle.js` (eine Zeile in `boxHits`): `TREEHIT.give(i, hit, z0, fahrzeug)` – `true` = der Stamm gibt nach, kein Stoß.
- `viz3/src/core/save.js`: Schlüssel `pav-trees-v1`.

## Testen

```bash
cd viz3 && python3 build.py --fast && cd ..
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8976 --serve baeume          # alles (~20 min)
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8976 --serve baeume:car      # nur das Auto
```

`viz3/test/baeume.py`: Auto und Traktor fahren je in einen Jungbaum, einen kleinen und einen dicken Baum (freier Anlauf von 12 m wird
gesucht), der Traktor schiebt einen Baum langsam um, dazu ein Laubbaum am Feldrand (Krone aus dem Kronenhöhenmodell); geprüft werden
Biegen und Zurückfedern, Umkippen (die gezeichnete Stammachse liegt in Schubrichtung) und Weiterfahren, Anhalten und Schwanken, dann
Neuladen (liegt noch, kein Hindernis), das Auto quer über einen liegenden Stamm (Räder rucken) und der Menüknopf (alle stehen wieder).
Bilder: `out/baeume/<fahrzeug>_<fall>_1_before|2_contact|3_after.jpg`, `tractor_push_*.jpg`, `reload_<i>.jpg`, `over_stem.jpg`,
`stood_up.jpg`. Dauer ≈ 20 min (SwiftShader). Bei GitHub läuft der Test bei jedem Push auf `feat/baeume` (`viz3/extra/baeume/tests.txt`).

## Für den Kern-Chat (gemeinsame Dateien)

- `docs/ARCHITECTURE.md`: Abschnitt 6 eine Zeile `TREEHIT | world/treehit.js | kleine Bäume geben Fahrzeugen nach: biegen, umkippen
  mit Wurzelteller, liegen bleiben; dicke halten auf (give, standUp, axisOf)`; Abschnitt 8 `pav-trees-v1 | umgefahrene Bäume (Lage,
  Richtung, Winkel)`; Abschnitt 9 `world/` um `treehit` ergänzen; Abschnitt 11/11b: `WCOL.each(…, soft)` – Jungbäume (≤ 2,5 m) nur für
  Fahrzeuge (`soft`), umgefahrene `dead`, `WCOL.src/removeIdx/revive/treeAt/trunk`; `FOREST.retilt(t)`/`t.tilt`; `RATSCHER.treeRecs`;
  `VEH.boxHits` fragt `TREEHIT.give`.
- `docs/CHANGELOG.md` (V16i nennt die Bäume schon): seither dazu – langsam geschoben neigt sich der Stamm erst mit dem Fahrzeug und reißt
  bei ≈ 16° aus (zurücksetzen: er richtet sich wieder auf), ein Stamm, der hält, gibt elastisch nach (bis ≈ 5°), Räder über einem
  liegenden Stamm rucken, Äste knacken, Wurzelteller erdbraun statt beige, Hinweise seltener.
- `core/save.js` (`pav-trees-v1`) und `modules.txt` (Zeile unter `world/worldcol.js`) sind im Branch eingetragen – beim Zusammenführen
  behalten.
- Neuer `window`-Name `TREEHIT` (Tests, Fehlersuche).
- `shell/menu.html`: der Knopf „Bäume aufstellen“ nach „Fahrzeuge zurückstellen“ (`data-treereset`, Kern-Chat 23.10. 4:20) ist im Branch
  eingetragen. Kein „Neu“-Hinweis (Falko möchte weniger Meldungen). Die Gartenbäume (`garden/trees.js`, Falkos eigene Obst- und
  Laubbäume im modellierten Grundstück) bleiben feste Hindernisse.
