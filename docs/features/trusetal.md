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
- **Sehenswürdigkeiten (V19w):** `tools/welt/zone_trusetal.py` holt OSM (API, in Stücken) → `viz3/extra/trusetal/dist/trusetal/ort.json`
  (Kirche, Wallenburger Turm, Wasserfall-Linie, Zwergen-Park mit Weg und Häusern, Bergwerk, Rathaus, 95 benannte Orte, 378 benannte
  Straßen) und nimmt mit `--drop-cells` die ETHOS-Körper unter Kirche und Turm aus den Zellen. Modelle in `welt/trusetal.js` nach Fotos
  (Commons: Kirche Trusetal, Wallenburgturm, Trusetaler Wasserfall), Boden aus `WELT.sampler`. Wald: `tools/weltwald/baeume.py --cells …`
  mit den OSM-Wegen und -Grünflächen (183 Zellen, 620 502 Bäume; GDAL braucht im Chat-Rechner `GDAL_CURL_CA_BUNDLE`/`GDAL_HTTP_PROXY`).
- **Test:** `viz3/test/trusetal.py` (`viz3/extra/trusetal/tests.txt`).
- **Offen:** Wiesen als Halme, Laternen, das Innere von Kirche und Bergwerk, Klangpfad, Schloss Bairoda.
