# Suhl – Altbestand vom 26.10.2026: was da ist, was davon bleibt

Stand 13.11.2026, Agent `suhl-technik` (Zweig `suhl/technik`). Gesichtet wurden die vier alten Zweige `feat/suhl`, `feat/suhl-fahrt`,
`feat/suhl-innen`, `feat/suhl-leute`, ihre Wegwerf-Zweige `ref/suhl-innen-fotos` und `ref/suhl-leute-fotos` und ihre Läufe in GitHub
Actions. Alle Zahlen stammen aus den genannten Dateien und Protokollen. Der technische Entwurf steht in `docs/plans/plan_suhl.md`.

## Kurz

- **App-Code gibt es von damals keinen.** Kein `viz3/src/welt/suhl.js`, kein Test, keine Daten der Stadt. Die vier Agenten liefen etwa
  eine Stunde und kamen nur bis zu Werkzeugen und Recherche.
- **Brauchbar sind:** die Daten der Anfahrt (`feat/suhl-fahrt`: beide Routen, Autobahn, Schilder, Brücken, Tunnel – der Lauf war grün),
  die Kontaktbögen und Texte der Recherche (Wegwerf-Zweige) und einige Ideen aus `zone_suhl.py`.
- **Der Kachel-Lauf scheiterte an zwei Fehlern im eigenen Skript**, nicht an den Landesdaten: falsche Breitengrade im Suchrahmen
  (die Abfrage lag in Nigeria) und eine überschriebene Variable. Er kam nie bis zum Bau einer Kachel.
- **Vorschlag:** die alten Zweige nicht mit `src` zusammenführen. Die wenigen brauchbaren Dateien in neue Zweige übernehmen.

Alle vier Zweige zweigen von `4a5019e` ab (Stand V16u, 26.10.2026). `src` ist seitdem 443 Commits weiter
(`git diff --shortstat 4a5019e origin/src`: 690 Dateien, +126 737 Zeilen).

## Warum der Kachel-Lauf scheiterte

Lauf „Welt-Zone Suhl“, Nummer 40261745877, `feat/suhl`, 26.10.2026 02:58 UTC, Ergebnis `failure` nach 15 min 15 s
(`gh run view 40261745877 --log`). Gescheitert ist der erste Job „Stadtdaten und Kachel-Plan“ im Schritt „Stadt Suhl aus OSM“.
Die Jobs „Kacheln Suhl bauen“ und „Nach gh-pages/welt-test/zonen/suhl/“ liefen deshalb nicht. Auf `gh-pages` gibt es kein
`welt-test/zonen/suhl/` (geprüft über die GitHub-API am 13.11.).

| # | Was geschah | Beleg |
|---|---|---|
| 1 | Die drei Overpass-Server antworteten nicht (HTTP 502, 504, 504). Das kostete 6 Minuten. | Protokoll 03:06:25, 03:08:33, 03:12:43 |
| 2 | Der Ersatzweg (OSM-API in Stücken) fragte den falschen Ort ab. `BBOX = (10.625, 10.570, 10.765, 10.660)` soll West, Süd, Ost, Nord sein. Süd und Nord sind aber 10,57 und 10,66 statt 50,57 und 50,66. Der Rahmen liegt bei 10,6° Nord im Nordosten Nigerias. | `tools/welt/zone_suhl.py` Zeile 21; Protokoll: Orte „Damba village“, „Zange hamlet“ |
| 3 | Folge: 0 Gebäude, 0 Straßen, 0 Laternen in der Zone. | Protokoll 03:13:11 „Gebäude in der Zone: 0“, „Straßen: 0“ |
| 4 | Absturz in Zeile 839: `round()` auf ein numpy-Feld, `TypeError: type numpy.ndarray doesn't define __round__ method`. Ursache ist ein zweiter Fehler: Die Baumsuche im Luftbild belegt die Variable `b_` neu (`r_, g_, b_ = img[...]`, Blaukanal). `b_` ist aber auch ein Beiwert der Umrechnung `toU` (Modell → UTM). Danach liefert `toU` Bilder statt Zahlen. | Funktion `town()`, Zeilen 325–326 und 779; am 13.11. nachgestellt, gleiche Fehlermeldung |
| 5 | Derselbe Tippfehler steckt in `ROUTE_BBOX = (10.600, 10.470, 10.830, 10.665)`. Der nächste Schritt (Routen und Kachel-Plan) hätte deshalb keine Straße gefunden. | Zeile 24 |

Wichtig: Fehler 4 hätte den Lauf **auch mit richtigem Rahmen** beendet, sobald das Luftbild geladen ist. Mit den Landesdaten
(Geoportal seit etwa 22.10. gestört) hat das Scheitern nichts zu tun – so weit kam der Lauf nicht.

Der Lauf „Feature“ desselben Pushs (die Tests der App) wurde nach 1 h 16 min abgebrochen (`cancelled`); den Grund nennt die Liste nicht.

## Die vier Zweige

| Zweig (Kopf) | Was da ist | Güte | Lauf in Actions |
|---|---|---|---|
| `feat/suhl` (`8939590`) | `tools/welt/zone_suhl.py` (889 Zeilen), `.github/workflows/welt-suhl.yml` (235 Zeilen), 44 Zeilen in `tools/welt/build.py`, `tiles.py`, `wlib.py` (Kachel-Maske, Plan aus einer Datei, Zone `S`). Keine Daten, kein App-Code, keine Doku. | Nie gelaufen. Zwei Fehler (oben). Nur OSM, nur 3,4 km um den Markt. | „Welt-Zone Suhl“ rot |
| `feat/suhl-fahrt` (`77d83fc`) | `viz3/extra/suhl-fahrt/suhl_strecke.py` (838 Zeilen), `recherche.json` (67 kB), `dist/fahrt/suhl.json` (385 kB), `.github/workflows/suhl-fahrt.yml`. Kein App-Code (`welt/fahrt.js` unverändert), kein Test. | Daten vollständig und geprüft (siehe unten). Höhen aber zu 94 % aus dem 30-m-Modell. | „Suhl-Fahrt Daten“ grün (8 min 29 s), „Feature“ grün |
| `feat/suhl-innen` (`ee75529`) | `viz3/extra/suhl-innen/quellen/quellen.py` (407 Zeilen), Workflow. Ergebnis auf `ref/suhl-innen-fotos` (`4c18090`): 55 Dateien, 9,0 MB. | 41 Kontaktbögen und 11 Wikipedia-Auszüge sind da. `osm.json` ist **leer** (Overpass 502/Zeitüberschreitung), deshalb auch 0 Panoramax-Fotos. | „Suhl innen – Quellen“ grün (18 min) |
| `feat/suhl-leute` (`380fb49`) | `viz3/extra/suhl-leute/recherche.py` (196 Zeilen), Workflow. Ergebnis auf `ref/suhl-leute-fotos` (`c02e39f`): 43 Dateien, 3,4 MB. | `recherche/osm.json` (2,75 MB): 3 795 benannte Orte und 6 577 Wege in Modellmetern, Abruf 26.10. 03:04 UTC. 40 Wikipedia-Auszüge. Keine Fotos, trotz des Namens. | „Suhl-Leute Recherche“ grün (14 min) |

### `feat/suhl-fahrt` im Einzelnen (das Wertvollste)

Aus `viz3/extra/suhl-fahrt/dist/fahrt/suhl.json` und `recherche.json` (Quelle OpenStreetMap, ODbL; Stand 26.10.2026 03:10 UTC):

| Inhalt | Zahl |
|---|---|
| Route Autobahn (A 73 → A 71) hin / zurück | 28 439 m / 28 294 m |
| Route Landstraße hin / zurück | 18 875 m / 18 900 m |
| Straßenstücke mit Längsprofil | 1 251: Ortsstraße 340, Hauptstraße 289, Zufahrt 271, Autobahn 215, Kreisstraße 89, Gasse 47 |
| Schilder | 67: 20 Ortstafeln, 32 Autobahn-Schilder, 15 Wegweiser |
| Orte | 11 |
| Brücken (davon an der Autobahn laut `recherche.json`) | 45 (40), z. B. Talbrücke Haseltal 335 m |
| Tunnelröhren | 2 (Tunnel Berg Bock, A 71: 2 674 m und 2 694 m) |
| Anschlussstellen-Punkte / Rampen mit Zielangaben | 15 / 37 |
| Wellen je km vor → nach dem Glätten | Autobahn 16,4 → 0,0; Hauptstraße 16,4 → 0,2; Kreisstraße 13,7 → 0,1; Ortsstraße 15,1 → 2,4 |
| Höhen-Stützpunkte aus Kacheln / aus Copernicus 30 m | 90 661 / 1 416 009 |

Das Format ist das von `fahrt/strassen.json` (so der Kopf von `suhl_strecke.py`), erweitert um Autobahn, Tunnel und Brücken. Das
Skript nutzt `viz3/extra/fahrt/strecke.py` und `tools/welt/roads.py`; beide sind auf `src` seit dem 26.10. unverändert
(`git diff --stat 4a5019e origin/src -- tools/welt viz3/extra/fahrt` ist leer). Es läuft also heute noch.

## Behalten, verwerfen, weitertragen

| Zweig | Behalten | Verwerfen | Wie weitertragen |
|---|---|---|---|
| `feat/suhl` | **Ideen:** Kachel-Maske je Stufe für Straßen-Korridore (`wlib.MASK`, `keep`, `hits`, `--planfile`, Liste `has` in `meta.json`); je Hauswand die Merker „Nachbarwand“ und „Abstand zur Straße“ (Feld `F`); Baualter nach Form (`platte`, `alt`, `ddr`) als Notbehelf; Wahrzeichen nach Namen; Laternen entlang benannter Straßen, wo OSM keine hat; Flächen, Bäche, Haltestellen, Geschäfte aus OSM; die Schleife, die auf `gh-pages` nur einen Ordner ersetzt. | Höhen und Dächer nur aus OSM (ETHOS und später LoD2 sind besser, `tools/welt-gebaeude/` kam erst nach dem 26.10.); der Kreis von 3,4 km (jetzt die ganze Stadt); Overpass als Quelle (Regel: Geofabrik-Auszug mit osmium); Dachfarbe aus einem einzigen Bild mit 1,4 m je Pixel; Bäume als „dunkelgrüne Flecken“. | **Nicht** mit `src` zusammenführen. Die brauchbaren Funktionen in das neue Werkzeug der Stufe 2 übernehmen (`tools/suhl/…`, siehe Plan), dabei Fehler 2, 4 und 5 beheben. Der Eingriff in `tools/welt/*.py` passt noch sauber auf `src` (`git apply --check`), berührt aber gemeinsame Dateien – nur über den Suhl-Chat, oder besser ganz vermeiden. |
| `feat/suhl-fahrt` | `recherche.json` (Fakten der Strecke), `suhl_strecke.py` (läuft), `dist/fahrt/suhl.json` als erster Datensatz, die Prüfzahl „Wellen je km“ je Straßenart. | Nichts. Die Längsprofile aber neu rechnen, sobald es besseres Gelände gibt. | Die drei Dateien und den Workflow in das Arbeitspaket „Anfahrt“ der Stufe 2 übernehmen (neuer Zweig von `src`). App-Code und Test fehlen und sind neu zu schreiben. |
| `feat/suhl-innen` | Die 41 Kontaktbögen (Markt 4, Kreuzkirche 5, Marienkirche 2, Waffenmuseum 4, CCS 4, Aue 4, Nord 4, WBS 70 5, Kaufhalle 5, historisch 4) mit `CREDITS.md` als erster Blick; die Themenliste. | `quellen.py` (ersetzt durch `tools/suhl/fotos/**` des Agenten `suhl-fotos`); die leere `osm.json`. | Nichts übernehmen. Der Wegwerf-Zweig bleibt zum Nachsehen liegen, bis `suhl/fotos` mehr hat. |
| `feat/suhl-leute` | `recherche/osm.json` als schnelles Nachschlagewerk (Orte, Wege), bis `suhl/bestand` liefert; die Themen der 40 Auszüge (Simson, Jagdwaffen, Rennsteig, Stadtumbau, Nahverkehr …) als Stoff für Suhler Figuren in Stufe 3. | `recherche.py` (ersetzt durch `suhl-bestand` und `suhl-wissen`). | Nichts übernehmen. |

Dazu auf `src` schon vorhanden und weiter gültig: die vier alten Aufträge `docs/plans/auftraege/suhl.md`, `suhl-innen.md`,
`suhl-leute.md`, `suhl-fahrt.md` mit dem Vertrag `SUHL.*` (der Plan schreibt ihn für die ganze Stadt fort) und die Markierung
`# feat/suhl: …` in `viz3/src/modules.txt` (Zeile 90) unter `welt/vessra.js`.

## Für den Suhl-Chat

- Die alten Zweige und die beiden Wegwerf-Zweige nicht löschen, bevor Stufe 2 die Anfahrt-Daten übernommen hat.
- `docs/PARALLEL.md` (Zeilen 35–38) führt die vier alten Agenten schon als „stehen geblieben“. Das stimmt mit diesem Befund überein.
- Lehre für alle neuen Werkzeuge: jeden Suchrahmen beim Start prüfen (liegt der Mittelpunkt von Suhl darin?) und bei „0 Gebäude“
  sofort mit klarer Meldung abbrechen, statt weiterzurechnen.
