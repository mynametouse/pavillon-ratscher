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

   Langsam (Schrittgeschwindigkeit) schafft das Auto nur, was es mit Gas schieben kann (≈ 8 cm). Das Fahrzeug verliert die Arbeit, die das
   Umdrücken kostet (M · 0,35 rad), es wird langsamer, hält aber nicht an. Ein kurzer Hinweis nennt Durchmesser und Kräfte.
   Gehende werfen keine Bäume um. Vom Förster markierte Bäume und solche, an denen gerade gefällt wird, bleiben, wie sie sind (Fällen hat
   seinen eigenen Zustand).
5. **Liegen bleiben**: ein umgedrückter Baum verlässt sofort die Kollisionen (kein Hindernis mehr, auch nicht für Gehende), liegt auf dem
   Boden (Hang beachtet, Krone hält den Stamm etwas hoch) mit aufgestelltem Wurzelteller und bleibt nach dem Neuladen liegen
   (Speicher `pav-trees-v1`: `{ v: 1, t: [[x, y, Richtung°, Winkel], …] }`, höchstens 2000).

## Wo der Code ist

- `viz3/src/world/treehit.js` (`TREEHIT`): Regel, Bewegungen (biegen, schwanken, fallen) nur der Bäume in Bewegung, Wurzelteller
  (ein InstancedMesh), Töne (Knacken, Rascheln, Aufschlag, Knarzen – synthetisch über `audio.raw()`), Speichern, Testhilfen
  (`info(i)`, `verdict(i, 'car'|'tractor', kmh)`, `state(i)`, `stats()`, `rule`).
- `viz3/src/world/worldcol.js` (`WCOL`): die Jungbäume (≤ 2,5 m) als weiche Stämme (`soft`: Gehende gehen vorbei, Fahrzeuge biegen sie),
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
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8976 --serve baeume          # alles (~12 min)
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8976 --serve baeume:car      # nur das Auto
```

`viz3/test/baeume.py`: Auto und Traktor fahren je in einen Jungbaum, einen kleinen und einen dicken Baum (freier Anlauf von 12 m wird
gesucht); geprüft werden Biegen und Zurückfedern, Umkippen und Weiterfahren, Anhalten und Schwanken, dann Neuladen (liegt noch, kein
Hindernis). Bilder: `out/baeume/<fahrzeug>_<fall>_1_before|2_contact|3_after.jpg`, `reload_<i>.jpg`. Bei GitHub läuft der Test bei
jedem Push auf `feat/baeume` (`viz3/extra/baeume/tests.txt`).
