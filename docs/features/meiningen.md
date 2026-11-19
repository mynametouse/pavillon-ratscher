# Meiningen und der Weg dorthin in 3D (dazu Wald um Schleusingen und an der Strecke nach Kloster Veßra)

Falko, 19.11.2026 18:52: „… parallel auch Suhl und Schleusingen weiter verfeinern … und bitte inkludiere nun auch Meiningen entsprechend und
den Weg nach Meiningen, sodass dort keine flache Karte erscheint, sondern echte Gebäude …“ (Karten-Chat)

- **Kacheln:** zwei eigene Blöcke wie Trusetal (`tools/welt/wlib.py` `ZONES['MG']`, `ZONES['MR']`, Workflow
  `.github/workflows/welt-meiningen.yml`, Matrix je Block, Push auf `feat/meiningen`):
  - **Meiningen** (`welt-test/zonen/meiningen/`, 146 MB): Stufen 7–11 über 6,4 × 8 km von Obermaßfeld bis zum Dampflokwerk, Stufe 12 über
    2,4 × 2,8 km um Markt, Stadtkirche, Schloss Elisabethenburg, Theater und Bahnhof. Achtung: der Ortspunkt von Wikidata liegt 2 km südlich
    des Markts – der Block steht auf dem echten Zentrum.
  - **Werratal** (`welt-test/zonen/werratal/`, 74 MB): die B 89 von Kloster Veßras Block (E 614 000) über Henfstädt, Leutersdorf,
    Vachdorf, Belrieth, Einhausen nach Meiningen, Stufen 7–11 über 11,2 × 4,8 km.
  - Gelände in beiden ganz aus DGM1 (easygeodata, 150 Kacheln), Luftbild 2024, Straßen eingeschnitten.
- **Häuser:** 15 000 Gebäude aus ETHOS.BUILDA/LoD2 in 204 neuen Zellen von `gebaeude/gebaeude.js` (`filter_ethos.py` mit den Blöcken,
  `orte.py --stage welt` nimmt die beiden Kachelsätze), Dachfarbe aus dem Luftbild.
- **Wahrzeichen** (`welt/meiningen.js` mit dem Baukasten `welt/bau.js`, nach Fotos auf Commons): die Stadtkirche (Sandstein, zwei
  Westtürme mit Schallöffnungen, Achteck, grüne Kupferhelme mit Kreuz bei ~58 m, Rosenfenster, Portal, hohe Spitzbogenfenster, steiles
  Schieferdach) und das Staatstheater (Baukörper, Säulenvorhalle mit sechs Säulen, Gebälk, Giebel, Treppe, drei Türen). Die ETHOS-Körper
  darunter nimmt `tools/welt/zone_trusetal.py --zone MG --drop-cells` aus den Zellen.
- **Straßennamen:** OSM (1 413 Wege in Meiningen, 307 im Werratal) für die Ortsanzeige oben links und die Karte; der Markt als Platzname.
- **Wald:** Bäume in den Zellen um Meiningen (2,2 km) und 600 m beiderseits der B 89 (`tools/weltwald/baeume.py --cells …` mit OSM-Wegen
  und Grünflächen); dazu die Korridore nach Schleusingen (`markt`) und Kloster Veßra (`baumschule`, L 1625; 79 Zellen, 194 000 Bäume),
  die der Hilfs-Agent `welt-wald-2` am 18.11. angefangen hatte.
- **Hinkommen:** Karte → „Meiningen“ → Hinfliegen, Jetpack-Ziel „Meiningen, Markt“, `?szenario=meiningen`.
- **Test:** `viz3/test/meiningen.py` (`viz3/extra/meiningen/tests.txt`: smoke, meiningen, welt_orte:daten, welt_wald:data).
- **Offen:** Schloss Elisabethenburg und Englischer Garten als eigene Modelle, Fahren auf der B 89 (Straßenprofile der Fahrt), Wiesen als
  Halme.
