# Trusetal (Brotterode-Trusetal) mit Originaldaten in 3D

Falko, 19.11.2026 16:54: „Kannst du bitte auch Trusetal, also die Stadt Trusetal, mit Originaldaten, 3D-Daten versehen?“ (Karten-Chat)

- **Kacheln:** eigener Block wie Kloster Veßra (`tools/welt/wlib.py` `ZONES['TS']`, Plan `TS`), Workflow `.github/workflows/welt-trusetal.yml`
  (Push auf `feat/trusetal`) → `gh-pages/welt-test/zonen/trusetal/`. Stufe 12 (feinste Stufe) über 2,4 × 3,2 km
  um die Stadt, Stufen 7–11 über 6,4 × 6,4 km (Herges-Auwallenburg bis Laudenbach, Wahles). Gelände DGM1 Thüringen 1 m über easygeodata
  (64 von 72 km²; die südlichste Reihe Copernicus GLO-30, Versatz −2,3 m ausgeglichen), Luftbild DOP 2024 (zwei Bildflüge, Farbausgleich),
  OSM-Straßen eingeschnitten (21 km Straßen, 48 km Wege). 131 MB, 5 107 Dateien.
- **Häuser:** 5 504 Gebäude aus ETHOS.BUILDA (LoD2 Thüringen) in 106 neuen Zellen von `gebaeude/gebaeude.js`
  (`tools/welt-gebaeude/filter_ethos.py` um den Block erweitert, `orte.py --stage welt` nimmt den Satz `trusetal` dazu; Dachfarbe aus dem
  Luftbild 2024). Kennzahlen im Index unter `orte.trusetal`.
- **App:** `welt/trusetal.js` – Zone (`KERN.zone`, lädt die Kacheln ab 2,5 km, gibt sie jenseits von 3,2 km frei), Sprungpunkt
  `trusetal` auf einer Straße im Ortskern, `?szenario=trusetal`, Jetpack-Ziel „Trusetal“; die Karte zeigt das Luftbild des Blocks.
  Hinkommen: Karte (K bzw. Shift+K) → „Trusetal“ suchen → Hinfliegen.
- **Test:** `viz3/test/trusetal.py` (`viz3/extra/trusetal/tests.txt`).
- **Offen:** Wald und Wiesen als Bewuchs, Laternen/Straßennamen, eigene Modelle (Kirche, Wasserfall, Bergbau-Museum).
