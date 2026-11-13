# Suhl – Gebäude: ein Datensatz je Gebäude der ganzen Stadt (Stufe 2, Paket S2-2)

Stand: 13.11.2026, Hilfs-Agent `suhl-gebaeude` (Auftrag `docs/plans/auftraege/suhl-gebaeude.md`, gemeinsam `suhl-gemeinsam.md`,
`suhl-stufe2.md`). Zweig `suhl/gebaeude`. Das Format ist das des Datenvertrags: `docs/features/suhl-daten.md`, Abschnitt 5
(Schema 1, Fassung 1.1; Prüfer `tools/suhl/lib/validate.py`). Dieses Dokument sagt, **woher jedes Feld kommt und wie gut es ist**.
Zahlen stehen maschinenlesbar in `tools/suhl/out/gebaeude/` (Probesatz) und `tools/suhl/out/gebaeude/actions/` (ganze Stadt, aus GitHub Actions).

## Kurzfassung

- **Ein Datensatz je Gebäudekörper** des Katasters/LoD2: 31 719 in der Stadt (Lauf 43340470432), 2 502 in den 11 Probekacheln des
  Zentrums. Die App baut die Geometrie aus dem Datensatz – ein Szenario kann ein Haus ändern.
- **Gemessen oder amtlich:** Grundriss und Höhe (ETHOS.BUILDA aus dem LoD2 des Landes), Nutzung, Geschosse und Adresse (Kataster).
  Geschosse aus dem Kataster haben 74,9 % der Datensätze der Stadt, eine Adresse 99,2 %.
- **Aus Daten abgeleitet:** Dachdeckung und Dachfarbe je Dachfläche (Luftbild 2024), Dachform dort, wo OpenStreetMap sie nennt
  (11 %) oder das Luftbild hilft (8 %); ab Lauf 2 Dachform, First und Traufe **gemessen am Oberflächenmodell DOM1** (zuerst Zentrum).
- **Geschätzt (immer markiert):** die übrigen Dächer (Regel aus Geschossen, Höhe, Grundriss, Nachbarn), Fassaden-Parameter,
  Haustyp, Baualter (für 89 % unbekannt, solange das Zensus-Gitter fehlt).
- **Zwei Befunde:** Das Luftbild über Suhl ist ein echtes Orthofoto – Dächer liegen auf den Grundrissen, kein Versatz zu korrigieren.
  Und: 271 Körper aus ETHOS/LoD2 stehen nicht mehr im Kataster – an einer Stelle am Luftbild geprüft: abgerissen. Sie tragen den
  Merker „steht nicht mehr“ und sollen nicht gezeichnet werden.

## 1 Was es gibt

| Was | Wo |
|---|---|
| Probesatz Zentrum (11 Kacheln, 2 502 Gebäude, 2,98 MB, gültig: 0 Fehler, 0 Warnungen) | `tools/suhl/out/gebaeude/probe/suhl/g/v0/10/{x}/{y}.json`, `…/v0/index.json` |
| Probesatz mit Dächern aus dem Oberflächenmodell (schreibt der Workflow) | `tools/suhl/out/gebaeude/probe/suhl/g/v1/…` |
| Ganze Stadt | Artefakt `suhl-gebaeude-kacheln` des Workflows (Lauf-Nummer in `actions/lauf.json`); Veröffentlichen über `suhl-publish`, wenn `lauf.txt` es bestellt |
| Zahlen der Stadt | `tools/suhl/out/gebaeude/actions/`: `bauen_stadt.json` (Mengen, Güte), `pruefen_stadt.json` (Prüfungen, Hochhäuser), `vertrag_stadt.json` (Prüfer des Vertrags), `alkis_stadt.json`, `index_stadt.json`, `lauf.json` |
| Zahlen des Probesatzes | `tools/suhl/out/gebaeude/bauen_probe.json`, `pruefen_probe.json`, `alkis_probe.json`, `versatz.json` |
| Workflow | `.github/workflows/suhl-gebaeude.yml`; ein Lauf startet, wenn sich die Workflow-Datei oder `tools/suhl/gebaeude/lauf.txt` ändert (dort: Version, Umfang easygeodata, Veröffentlichen ja/nein) |

| Skript in `tools/suhl/gebaeude/` | Tut |
|---|---|
| `alkis.py` | Kataster-Gebäude vom WFS „ALKIS vereinfacht“ in Kästen von 1,6 km, mit Pause und Cache; **nur** `ave:GebaeudeBauwerk`, nie Flurstücke |
| `osmdaten.py` | OpenStreetMap: Gebäude mit Marken, benannte Läden und Einrichtungen, Straßen mit Namen (Geofabrik-Auszug in Actions, OSM-API-Kästen am Chat-Rechner) |
| `dachbild.py` | Luftbild je Kachel (0,4 m, Farbe und Infrarot): Deckung und Farbe je Dachfläche, flach oder geneigt, Firstrichtung |
| `dom.py` | Dach am Oberflächenmodell messen (DOM1, DGM1 über easygeodata, nur in Actions); `--selftest` |
| `dach.py`, `fassade.py`, `regeln.py` | Dach schätzen und Flächen bauen; Seiten und Fassaden-Regeln; Art, Nutzung, Haustyp, Baualter, Wahrzeichen |
| `zensus.py` | Zensus-Gitter 2022 (Gebäude nach Baujahr, 100 m) auf Suhl schneiden und je Haus nachschlagen |
| `bauen.py` | fügt alles zusammen, schreibt Kacheln, `index.json`, Zahlen |
| `fuss.py` | liest die Fußhöhen `z0` vom Gelände ab und ändert **nur** `z0`, `q.z0`, `zv` |
| `pruefen.py` | Prüfungen nach Plan 5.3 |
| `versatz.py` | misst, ob Dächer im Luftbild auf den Grundrissen liegen |

So entsteht der Probesatz am Chat-Rechner (Rohdaten in `/tmp/suhl-gebaeude/raw`, nie in git):

```
python3 -I tools/suhl/gebaeude/alkis.py --area probe
python3 -I tools/suhl/gebaeude/bauen.py --area probe --osm-api <Ordner mit den OSM-API-Kästen> --dop
python3 -I tools/suhl/gebaeude/fuss.py --tiles tools/suhl/out/gebaeude/probe/suhl/g/v0 --terrain <…/boden/v<N>/t> --boden <N>
python3 -I tools/suhl/gebaeude/pruefen.py --tiles tools/suhl/out/gebaeude/probe/suhl/g/v0 --area probe --max-bytes 3000000
python3 -I tools/suhl/lib/validate.py tools/suhl/out/gebaeude/probe --probe
```

## 2 Woher die Gebäude kommen und wie sie zusammenfinden

Die Kennung ist überall dieselbe: ETHOS `DEG_DETHL57P00006G0l` = LoD2 `DETHL57P00006G0l` = Kataster `DETHL57P00006G0lBL`
(die ersten 16 Zeichen; alle 33 394 Kataster-Kennungen der Abfrage enden auf `BL`). `id` ist die 16-stellige Form.

| Schritt | Ganze Stadt (Lauf 43340470432) | Probekacheln |
|---|---:|---:|
| ETHOS-Körper im Gebiet (Stufe 1 zählte 30 929) | 30 928 – ein Körper von 1 m² entfällt | 2 431 |
| davon im Kataster mit derselben Kennung oder nach Lage (≥ 50 % Überdeckung) | 30 657 | 2 408 |
| davon **nicht mehr im Kataster** (`fg` 32, `kat` 0) | 271 | 23 |
| nur im Kataster (neu seit dem LoD2; `fg` 64; Höhe geschätzt, ab Lauf 2 am Oberflächenmodell gemessen) | 791 | 77 (6 davon Tiefgaragen) |
| Kataster-Gebäude, die ein ETHOS-Körper schon zu ≥ 30 % deckt (nicht doppelt gebaut) | 324 | 50 |
| **Datensätze** | **31 719** | **2 502** |

- Kataster-Abfrage: 83 Kästen, 190 Sekunden, 33 394 Gebäude (mit Umland der Kästen), 25 293 mit Geschosszahl; Stände 2013–2026.
- **Bauteile:** Das Kataster führt Treppentürme, Erker, Balkontürme und Anbauten als eigene Körper. Ein kleiner Körper (< 60 m²,
  höchstens halb so groß wie der Nachbar, gemeinsame Wand ≥ 1,5 m) trägt `teil` = Kennung des Hauptgebäudes und dessen Farbe.
  Hohe „Überdachungen“ an Häusern (bis 34 m an den Zwölfgeschossern der Aue) sind Balkon- oder Loggientürme, keine Carports.
- **Tiefgaragen** (Kataster-Funktion „Tiefgarage“, 11 in der Stadt) stehen nicht in `b`, sondern als Umriss in `tief` der Kachel.
- **Abgerissen:** drei Körper mit 14–16 m Höhe (`DETHL57P00002jP4`, `…jP5`, `…jP6`, bei UTM E 619 225, N 5 607 395) liegen im
  Luftbild vom 15.05.2024 auf einer Brachfläche (von Auge geprüft, nur diese Stelle). Ab Lauf 2 zählt der Lauf, bei wie vielen das Oberflächenmodell ebenes Gelände zeigt.

## 3 Der Datensatz – woher jedes Feld kommt

Güte wie im Vertrag: 0 Regel oder Annahme · 1 aus Daten abgeleitet · 2 gemessen oder amtlich · 3 von Auge geprüft. Was in `q` fehlt, ist 0.
Die Kachel nennt in `src` die übliche Quelle je Feld; ein Gebäude nennt in `src` nur, was davon abweicht.

| Feld | Inhalt | Quelle | Güte |
|---|---|---|---|
| `id` | LoD2-/ETHOS-Kennung | ETHOS, sonst Kataster | – |
| `f`, `fh` | Grundriss, Löcher; um 0,12 m vereinfacht, Zacken ohne Breite entfernt | ETHOS (aus LoD2); nur-Kataster-Gebäude: Kataster | 2 |
| `h` | Höhe vom tiefsten Geländepunkt zum höchsten Dachpunkt | ETHOS; nur-Kataster: geschätzt (Geschosse × 3 m + 1,5 m), ab Lauf 2 am DOM1 gemessen | 2 / 0 / 1 |
| `e` | Traufe | Regel (Geschosse × Geschosshöhe des Haustyps + Sockel) oder DOM1 | 0 / 1 |
| `z0`, `zv` | Fuß (Modell-z) und Gelände über dem Fuß an jeder Grundriss-Ecke | Geländekacheln von `suhl-boden` (`based_on`), sonst Copernicus | 1 (mit DGM1: 2) |
| `r`, `az`, `p`, `rq` | Dachform, Firstrichtung (Modellrahmen), Neigung | DOM1 (`src.r` `dom1`) > OpenStreetMap `roof:shape` (`osm`) > Luftbild + Regel (`dop`) > Regel | `rq` 1 / 1 / 1 / 0 |
| `rv`, `rt`, `R` | Dach-Netz und Dachflächen: Neigung, Fallrichtung von geografisch Nord, Fläche in echten m² (ohne Dachüberstand, in UTM gerechnet) | aus `r`, `az`, `p`, `e`, `h` gebaut | wie `rq` |
| `rk`, `rc`, `R[].c`, `R[].col` | Deckung und Farbe, je Fläche und fürs ganze Haus | Luftbild 2024 (Farbe und Infrarot); `roof:material` aus OSM geht vor | 1 (ohne Bild 0) |
| `F` | Wände: Enden, Oberkanten, Lage der Giebelspitze als Anteil 0…1, Merker Nachbarwand, Meter zur Straße | Geometrie; Straßen aus OSM | – |
| `S` | je Wand nur, was sie Eigenes hat: `st` Straße, auf die sie blickt (kein Haus dazwischen), `eg: laden`, `sign` Namen, `hof` | OSM | 1 |
| `fas`, Kachel `fat` | Fassaden-Parameter des ganzen Hauses nach Regel: `col`, und über `t` aus der Tabelle der Kachel `mat`, `col2`, `sock`, `win`, `balk`; Geschosshöhe = (`e` − `sock`) / `lv` | Regel nach Haustyp; `building:colour`/`material` aus OSM gehen vor | 0 (1 mit Geschossen aus Daten) |
| `k` | Art: 0 Haus, 1 Halle, 2 Nebengebäude, 3 Kirche, 4 Behälter, 5 Turm | Kataster-Funktion, sonst OSM, sonst Form | 2 / 1 / 0 |
| `use`, `eg`, `fkt` | Nutzung in den Worten des Vertrags, Erdgeschoss-Nutzung, Funktion in den Worten des Katasters | Kataster; ist dessen Wort allgemein, OSM | 2 / 1 |
| `lv`, `lvk` | Geschosse; `lvk` = Kataster-Zahl, die nicht unter die Höhe des Körpers passt (dann ist `lv` geschätzt) | Kataster `anzahlgs`, sonst OSM, sonst Traufe ÷ Geschosshöhe | 2 / 1 / 0 |
| `bt` | Haustyp: punkthochhaus, platte, zeilenbau, stadthaus, villa, efh, dorfhaus, block, halle, kirche, garage, laube, nebengebaeude, ueberdachung, behaelter, turm | Regel aus Nutzung, Geschossen, Form, Nachbarn, Lage | 0 |
| `era`, `yr` | Baualter-Klasse, Jahr | Jahr aus OSM oder `wahrzeichen.md`; Platte und Hochhaus → 1949–1990; Altstadt-Streifen und Dorfkerne → vor 1918; Zensus-Gitter, sobald es da ist | 1 / 0 |
| `n`, `adr` | Name, Adresse | Kataster, sonst OSM, Name auch aus `wahrzeichen.md` | 2 / 1 |
| `osm` | OSM-Gebäude mit > 50 % Überdeckung | OSM | – |
| `fg` | 1 Wahrzeichen, 2 Denkmal (OSM `heritage` oder Liste – kein amtlicher Nachweis), 4 betretbar, 32 steht nicht mehr, 64 neu | `wahrzeichen.md`, OSM, Abgleich ETHOS–Kataster | – |
| `lm`, `teil`, `kat` | Nummer in `wahrzeichen.md`; Hauptgebäude eines Bauteils; 1 = dem Kataster nach Lage zugeordnet, 0 = nicht im Kataster | – | – |
| `d` | `fa` Grundfläche, `lv`, `gfa` Geschossfläche = Grundfläche × Geschosse, `rf` Dachfläche – echte m², in UTM gerechnet | gerechnet | wie `lv`, `rq` |

## 4 Dächer

**Regel** (`dach.py`, `rq` 0): Mit Geschossen aus dem Kataster sitzt die Traufe auf den Geschossen (Geschosshöhe je Haustyp 2,7–3,5 m
plus Sockel), der First ist die gemessene Höhe; bleibt weniger als 1,5 m, ist das Dach flach. Platten und Hochhäuser flach, Hallen
flach geneigt, Garagen flach. Der First läuft entlang der längeren Seite – in einer Häuserzeile entlang der Zeile, quer zu den
Nachbarwänden. Ohne Geschosse: Neigung des Haustyps, das Dach höchstens die halbe Haushöhe.

**OpenStreetMap** (`rq` 1, `src.r` `osm`): `roof:shape` – in den Probekacheln bei 806 von 2 502 Gebäuden. Mansard-, Krüppelwalm- und
Zeltdach stehen als Form in `r`; gebaut werden sie vorerst als Walm- oder Satteldach.

**Luftbild** (`rq` 1, `src.r` `dop`): Zwei Hälften eines Dachs gleich hell und ohne Ziegelrot = flach; die Linie zwischen heller und
dunkler Hälfte = First (Idee aus `tools/welt-gebaeude/prep.py`).

**Oberflächenmodell DOM1** (`dom.py`, `rq` 1, `src.r` `dom1`, `q.e` 1 – die beste Quelle bis LoD2): Die 1-m-Zellen im Grundriss
(0,7 m vom Rand), als Höhe über dem Fuß (tiefster Punkt des DGM1 am Umriss). Daran werden Flachdach, Pultdach, Sattel- und Walmdach
angepasst, First längs oder quer, auch außermittig; das Modell mit dem kleinsten robusten Fehler gewinnt (15 % Ausreißer wie
Schornsteine und Aufzugshäuser zählen nicht). Passt nichts auf 0,5 m, bleibt die Regel. Selbsttest: 13 von 13 erfundenen Dächern
wiedergefunden (Neigung auf 3°, Traufe auf 0,6 m). Zahlen am echten Modell: `actions/bauen_stadt.json` und `bauen_probe.json` → `dom`
(wie viele Dächer gemessen, wie viele gegenüber der Regel die Form wechseln).

**Deckung und Farbe** (`dachbild.py`): je Dachfläche die Mitte der Bildpunkte (dunkelstes Viertel = Schatten und hellste 15 % =
Glanz weggelassen, Baumkronen über das Infrarotbild weggelassen). Klassen: Ziegel rot, Ziegel dunkel, Betonstein/grau, Schiefer,
Bitumen/Kies, Blech, Gründach. Die Flächen eines Dachs sind verschieden besonnt: Die Fläche im Schatten übernimmt Deckung und Farbe
der besonnten, wenn beide dieselbe Farbart haben. Probekacheln: 4 022 von 4 129 Flächen aus dem Bild. **Schwäche:** „Betonstein“
ist jedes graue geneigte Dach – Faserzement, alte Ziegel und Schiefer in der Sonne sind am Bild nicht sicher zu trennen.

**Liegen die Dächer im Bild auf den Grundrissen?** Ja. Der Dienst nennt für Suhl „bDOM“. Messung (`versatz.py`, `versatz.json`): Der
Umriss wird in Schritten von 0,4 m über das Bild geschoben, bis die Bildkanten darunter am stärksten sind. Bei den 13 Gebäuden ab
30 m Höhe liegt das Dach 0,4–2,4 m neben dem Grundriss, in der Mitte 1,2 m, **unabhängig von der Höhe** (45-m-Hochhäuser: 0,4–1,6 m).
Ein gewöhnliches Orthofoto zeigte bei diesen Höhen viele Meter. Eine Korrektur wie in `tools/welt-gebaeude/retusche.py` ist nicht nötig.

## 5 Seiten und Fassaden

- Eine Wand je Kante des Grundrisses (`F`), Höfe eingeschlossen. Nachbarwand: zwei von drei Probepunkten 0,5 m vor der Wand liegen
  an einem anderen Gebäude. In der Stadt haben 19 634 Gebäude mindestens eine Wand an einer Straße.
- „Blickt auf eine Straße“: ein Strahl senkrecht zur Wand trifft binnen 40 m eine Straße aus OSM, ohne dass ein anderes Haus
  dazwischen steht. Abstand = bis zum Fahrbahnrand (halbe Breite nach Straßenklasse oder OSM `width`/`lanes` – eine Annahme).
- Regeln je Haustyp (`fassade.py`): Material (Platte für Platten und Hochhäuser, sonst Putz; in Dorfkernen 35 % Fachwerk als Regel),
  Farbe aus einer Palette je Typ (gleiches Haus, gleiche Wahl), Sockel, Fensterraster (Achsabstand 2,3–3,6 m), Loggien für Platten
  und Hochhäuser, Balkone für einen Teil der Zeilen. Ladenzone (`eg: laden`) an den Straßenseiten, wenn OSM im Haus einen Laden,
  eine Gaststätte, Bank, Apotheke oder ein Handwerk führt oder das Kataster „Handel“ sagt; Schilder mit den Namen aus OSM.
- Stufe 3 schreibt je Seite nach Fotos in `S[i]` (Güte 2–3); `fas` bleibt der Rückfall. Lücke im Vertrag: `S` kennt keine
  Parameter fürs ganze Haus – deshalb `fas`/`fat` (je Seite wiederholt hätten sie die Kacheln fast verdreifacht).

## 6 Art, Nutzung, Haustyp, Baualter

- Die 38 Funktions-Worte des Katasters in den Probekacheln und ihre Übersetzung: `bauen_probe.json` → `function_to_use` (Stadt:
  `actions/bauen_stadt.json`). Nutzungen in der Stadt (Lauf 1): Wohnen 13 132, Freizeit (vor allem Lauben; Kataster „Gebäude zur
  Freizeitgestaltung“) 6 470, unbekannt 4 517, Nebengebäude und Überdachungen 2 869, Garagen 2 294, Gewerbe 1 113.
- Baualter in der Stadt (Lauf 1): unbekannt 28 216 (89 %), vor 1918 3 026 (Regel: Dorfkerne im Umkreis von 280 m um den Ortspunkt,
  Altstadt-Streifen Markt/Steinweg/Topfmarkt/Kirchgasse), 1949–1990 461 (Platten, Zeilen, Hochhäuser), mit Jahr aus Daten 71.
  Ohne das Zensus-Gitter gibt es für Einfamilienhäuser keine Grundlage – „unbekannt“ ist ehrlicher als eine Vermutung.
- **Hochhäuser ab 25 m, einzeln gegen `tools/suhl/out/bestand/ethos.json` geprüft:** 58 von 59 Körpern, alle Höhen gleich; der
  fehlende hat 1 m² Grundfläche (39,8 m) und wird als zu klein weggelassen. 20 haben mindestens 100 m²: der Hotelturm (56,6 m,
  19 Geschosse laut Kataster), acht Wohnhochhäuser mit 40–46 m (die sieben in den Probekacheln: 14–16 Geschosse), fünf Scheiben mit
  35 m (12 Geschosse) – in den Probekacheln alle als Flachdach. Die übrigen sind Bauteile (Balkontürme, Aufzugshäuser), Schornsteine und Masten. Liste: `pruefen_*.json` → `tall`.

## 7 Fußhöhen

`fuss.py` liest die Höhe am Umriss (Ecken und alle 2 m) aus Geländekacheln (WTH1) – Ordner oder Adresse, die feinste vorhandene Stufe
gilt – und schreibt nur `z0` (tiefster Punkt, Modell-z), `q.z0`, `zv` (Gelände über `z0` je Ecke, ab 0,4 m Unterschied) und in den
Index `based_on: {boden: N}`. Ein neuer Boden braucht nur diesen Schritt. Probesatz v0: Geländeprobe von `suhl-boden` v0 (Copernicus),
2 500 von 2 502 Gebäuden. Reihenfolge (Suhl-Chat, 13.11.): `suhl-boden` rohes Gelände → `suhl-strassen` Profile → `suhl-boden`
schneidet die Straßen ein → **dann** `fuss.py` auf den eingeschnittenen Kacheln.

## 8 Die ganze Stadt und die Prüfungen

Lauf 43340470432 (13.11.2026, 18 Minuten, noch im ersten Format; Zahlen bis auf die Größe gelten weiter): 397 Kacheln, 31 719
Datensätze, 24,0 MB JSON (0,74 kB je Gebäude; im Vertragsformat etwa 1,15 kB je Gebäude), als tar.gz 5,5 MB. Zeiten: OSM-Auszug 15 s,
ETHOS 2,4 min, Kataster 3,2 min, Bauen mit 794 Luftbildern 11,9 min, Prüfungen 2 s. Rohdaten im Actions-Cache (274 MB).

| Prüfung (`pruefen.py`) | Ergebnis Stadt, Lauf 1 |
|---|---|
| Kennungen eindeutig; Grundrisse gültig; kein Gebäude in zwei Kacheln; alle in der Gemeinde | ja (31 719) |
| Höhen 0,3–120 m, Traufe ≤ Höhe | ja |
| Dach geschlossen (Flächen decken den Grundriss auf 6 %); Flächen in echten m² (auf 3 %) | ja |
| Wände passen zu den Kanten; Geschosse passen zur Traufe | ja |
| Grundrisse überlappen nicht | 73 Paare über 1 m² (größte 48 m²: Kataster-Neubau über altem ETHOS-Körper) – Warnung |
| Menge gegen Stufe 1 (30 929) | 30 928 |
| Mitte von Suhl dabei; mehr als 10 000 Gebäude | ja |

Nicht geprüft (braucht andere Pakete): kein Gebäude in einer Fahrbahn (`suhl-strassen`), Hausfuß auf dem Gelände (`suhl-boden`, nach
dem Einschneiden).

## 9 Was LoD2 ändert

Die Datensätze behalten ihre Kennung. Aus dem CityGML je Gebäude: `bldg:RoofSurface` → `rv`/`rt`/`R` (echte Flächen, auch Gauben-lose
Sonderformen als `r` 9), `roofType` → `r`, niedrigste Dachkante → `e`, Bodenfläche → `z0`; `rq` 2. `F` bekommt die Dachhöhen entlang
jeder Wand. Alles Übrige bleibt. Das Werkzeug dafür (`lod2.py` nach dem Muster von `tools/welt-gebaeude/lod2.py`) ist **noch nicht
gebaut** – der nächste Schritt, sobald Falkos Dateien da sind; bis dahin misst `dom.py` am Oberflächenmodell.

## 10 Quellen und Nennung

| Quelle | Lizenz | Nennung |
|---|---|---|
| ETHOS.BUILDA v1.0.0, Zenodo 11845992, `DEG.csv` (aus dem LoD2 Thüringen) | ODbL 1.0 | Forschungszentrum Jülich; © GDI-Th |
| WFS „ALKIS vereinfacht“, `ave:GebaeudeBauwerk` | CC BY 4.0 | © GDI-Th |
| Luftbild `th_dop`, `th_dop20cir`, Bildflug 15.05.2024 | CC BY 4.0 | © GDI-Th |
| DOM1, DGM1 Thüringen 2020–2025 | CC BY 4.0 | © GDI-Th, bezogen über easygeodata.de |
| OpenStreetMap | ODbL 1.0 | © OpenStreetMap-Mitwirkende |
| Copernicus DEM GLO-30 (nur vorläufige Fußhöhen) | Copernicus | © DLR e.V. 2010–2014, © Airbus Defence and Space GmbH 2014–2018 |
| Zensus 2022, Gitter 100 m | Lizenzname nicht geprüft | © Statistische Ämter des Bundes und der Länder |

Jeder `index.json` trägt die Quellen und die Zeile für die App. Rohdaten und Luftbilder liegen nie in git.

## 11 Offen und unsicher

- Dachformen ohne DOM1 und ohne OSM-Angabe sind Regeln; Gauben, Aufbauten und Solarmodule (`A`) fehlen ganz.
- Die Dachklassen sind an einem Ausschnitt von Auge angesehen, nicht ausgezählt.
- „Steht nicht mehr“ (`fg` 32) ist an einer Stelle geprüft; „neu“ (`fg` 64) kann auch ein Gebäude sein, das dem LoD2 nur fehlte.
- Geschosse: das Kataster zählt je Gebäude, die Höhe gilt je Körper – 42 Körper der Probekacheln tragen deshalb `lvk`.
- Fassadenfarben sind Paletten, keine Beobachtung; das Luftbild taugt dafür nicht.
- Dachfarben kommen vom WMS des Landes. Sobald `suhl-boden` farbausgeglichene Bildkacheln liefert, sollen sie von dort kommen,
  damit Dach und Boden zusammenpassen (Suhl-Chat, 13.11.) – noch nicht umgestellt.
- Der Probesatz liegt 0,7 % unter der Grenze von 3 MB.

## Für den Suhl-Chat

1. **Vertrag:** Bitte an `suhl-daten` für Fassung 1.1 – Plätze für `fas`/`fat` (Fassade des ganzen Hauses), `teil`, `zv`,
   `lvk`, `lm`, `kat`, `hof`, `tief`; `F[i][5]` als Anteil 0…1 (heute liest `gebaeude.js` Meter); Kachel-`src` als
   Vorgabe je Feld; Quelle `zensus` im Katalog.
2. **Nicht zeichnen:** `fg` & 32 und `tief`.
3. **`tools/welt/QUELLEN.md`:** WFS „ALKIS vereinfacht“ und easygeodata als Quellen eintragen (ich ändere keine vorhandene Datei).
4. **Fragen an Falko:** keine neuen. Seine LoD2-Dateien bleiben der Weg zu echten Dachflächen.
