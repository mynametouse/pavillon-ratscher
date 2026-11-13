# Suhl – Gebäude: ein Datensatz je Gebäude der ganzen Stadt (Stufe 2, Paket S2-2)

Stand: 13.11.2026, 03:40 Uhr, Hilfs-Agent `suhl-gebaeude` (Auftrag `docs/plans/auftraege/suhl-gebaeude.md`, gemeinsam `suhl-gemeinsam.md`,
`suhl-stufe2.md`). Zweig `suhl/gebaeude`. Das Format ist das des Datenvertrags: `docs/features/suhl-daten.md`, Abschnitt 5
(Schema 1, Fassung 1.1; Prüfer `tools/suhl/lib/validate.py`). Dieses Dokument sagt, **woher jedes Feld kommt und wie gut es ist**.
Alle Zahlen stehen maschinenlesbar in `tools/suhl/out/gebaeude/actions/` (ganze Stadt und Probesatz v1, aus GitHub Actions) und in
`tools/suhl/out/gebaeude/` (Probesatz v0 vom Chat-Rechner). Wo nichts anderes steht, gelten die Zahlen für **Lauf 4 (43348109758)**.

## Kurzfassung

- **Ein Datensatz je Gebäudekörper** des Katasters/LoD2: **31 709 in der ganzen Stadt** (397 Kacheln, 35,0 MB; Lauf 43348109758 grün,
  Prüfer des Vertrags: gültig, 0 Fehler, 0 Warnungen), 2 502 in den 11 Probekacheln des Zentrums (2,96 MB). Die App baut die Geometrie
  aus dem Datensatz – ein Szenario kann ein Haus ändern.
- **Gemessen oder amtlich:** Grundriss und Höhe (ETHOS.BUILDA aus dem LoD2 des Landes; 97,5 % der Datensätze), Nutzung, Geschosse
  (73,3 %) und Adresse (99,2 %) aus dem Kataster.
- **Am Oberflächenmodell gemessen** (DOM1, Zentrum und Kernstadt, 57 km²): Dachform, First und Traufe für 13 671 Gebäude, nur die
  Höhen für weitere 362. Gegenüber der Regel wechselt bei 5 004 von 13 671 die Dachform (37 %): 3 151 Dächer, die die Regel geneigt
  schätzte, sind flach; 1 361, die sie flach schätzte, sind geneigt.
- **Aus Daten abgeleitet:** Dachdeckung und Dachfarbe je Dachfläche (Luftbild 2024); Dachform aus OpenStreetMap (938) oder mit Hilfe
  des Luftbilds (1 041); Baualter aus dem Zensus-Gitter 2022 für 6 865 Häuser (4 851 davon mit klarer Mehrheit in ihrer Zelle).
- **Geschätzt (immer markiert):** die übrigen 15 697 Dächer (Regel aus Geschossen, Höhe, Grundriss, Nachbarn – vor allem außerhalb
  der Kernstadt und bei kleinen Nebengebäuden), Fassaden-Parameter, Haustyp. Das Baualter bleibt für 70,6 % unbekannt.
- **Befunde:** Das Luftbild über Suhl ist ein echtes Orthofoto – Dächer liegen auf den Grundrissen, kein Versatz zu korrigieren.
  271 Körper aus ETHOS/LoD2 stehen nicht mehr im Kataster (Merker „steht nicht mehr“, nicht zeichnen); bei 112 davon ließ sich das
  Oberflächenmodell befragen: 61-mal ebenes Gelände, 51 standen beim Laserflug noch. 781 Gebäude kennt nur das Kataster; 387 davon
  haben ihre Höhe jetzt aus dem Oberflächenmodell, 4 zeigt es nicht (neu gebaut oder unter der Erde).
- **7 130 Datensätze sind Bauteile** eines größeren Hauses (Treppenturm, Erker, Anbau; Feld `teil`) – das Kataster teilt so.

## 1 Was es gibt

| Was | Wo |
|---|---|
| **Ganze Stadt** (397 Kacheln, 31 709 Gebäude, 35,0 MB, gültig) | Artefakt **`suhl-g-v1`** des Laufs **43348109758** (Zip 7,0 MB): der Versionsordner mit `index.json` und `10/{x}/{y}.json`. `suhl-daten` veröffentlicht ihn; dieses Paket veröffentlicht nicht selbst. |
| **Probesatz v1** des Zentrums (11 Kacheln, 2 502 Gebäude, 2 963 501 Byte, gültig: 0 Fehler, 0 Warnungen) – mit Dächern aus dem Oberflächenmodell, Baualter aus dem Zensus, Fußhöhen von `suhl-boden` Probesatz v1 | `tools/suhl/out/gebaeude/probe/suhl/g/v1/10/{x}/{y}.json`, `…/v1/index.json` (schreibt der Workflow) |
| Probesatz v0 (vom Chat-Rechner, ohne Oberflächenmodell und Zensus; 2 948 712 Byte, gültig) | `tools/suhl/out/gebaeude/probe/suhl/g/v0/…` |
| Zahlen der Stadt | `tools/suhl/out/gebaeude/actions/`: `bauen_stadt.json` (Mengen, Güte, Dächer am Oberflächenmodell), `pruefen_stadt.json` (Prüfungen, Hochhäuser), `vertrag_stadt.json` (Prüfer des Vertrags), `alkis_stadt.json`, `index_stadt.json`, `lauf.json`, `easygeodata.json`, `zensus_baujahr.json` |
| Zahlen der Probesätze | v1: `actions/bauen_probe.json`, `actions/pruefen_probe.json`; v0: `tools/suhl/out/gebaeude/bauen_probe.json`, `pruefen_probe.json`, `alkis_probe.json`; Dachversatz: `versatz.json` |
| Workflow | `.github/workflows/suhl-gebaeude.yml`; ein Lauf startet, wenn sich die Workflow-Datei oder `tools/suhl/gebaeude/lauf.txt` ändert (dort: Version, Umfang easygeodata) |

| Skript in `tools/suhl/gebaeude/` | Tut |
|---|---|
| `alkis.py` | Kataster-Gebäude vom WFS „ALKIS vereinfacht“ in Kästen von 1,6 km, mit Pause und Cache; **nur** `ave:GebaeudeBauwerk`, nie Flurstücke |
| `osmdaten.py` | OpenStreetMap: Gebäude mit Marken, benannte Läden und Einrichtungen, Straßen mit Namen (Geofabrik-Auszug in Actions, OSM-API-Kästen am Chat-Rechner) |
| `dachbild.py` | Luftbild je Kachel (0,4 m, Farbe und Infrarot): Deckung und Farbe je Dachfläche, flach oder geneigt, Firstrichtung |
| `dom.py` | Dach am Oberflächenmodell messen (DOM1 und nDOM1 über easygeodata, nur in Actions); `--selftest` |
| `dach.py`, `fassade.py`, `regeln.py` | Dach schätzen und Flächen bauen; Seiten und Fassaden-Regeln; Art, Nutzung, Haustyp, Baualter, Wahrzeichen |
| `zensus.py` | Zensus-Gitter 2022 (Gebäude nach Baujahr, 100 m) auf Suhl schneiden und je Haus nachschlagen; `--selftest` |
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
python3 -I tools/suhl/lib/validate.py tools/suhl/out/gebaeude/probe/suhl/g/v0 --probe
```

## 2 Woher die Gebäude kommen und wie sie zusammenfinden

Die Kennung ist überall dieselbe: ETHOS `DEG_DETHL57P00006G0l` = LoD2 `DETHL57P00006G0l` = Kataster `DETHL57P00006G0lBL`
(die ersten 16 Zeichen; alle 33 394 Kataster-Kennungen der Abfrage enden auf `BL`). `id` ist die 16-stellige Form.

| Schritt | Ganze Stadt | Probekacheln (v1) |
|---|---:|---:|
| ETHOS-Körper im Gebiet (Stufe 1 zählte 30 929) | 30 928 – ein Körper von 1 m² entfällt | 2 431 |
| davon im Kataster mit derselben Kennung | 30 169 | 2 375 |
| davon im Kataster nach Lage (≥ 50 % Überdeckung; `kat` 1) | 488 | 33 |
| davon **nicht mehr im Kataster** (`fg` 32, `kat` 0) | 271 | 23 |
| nur im Kataster (`fg` 64) | 792, davon 11 Tiefgaragen | 77, davon 6 Tiefgaragen |
| Kataster-Gebäude, die ein ETHOS-Körper schon zu ≥ 30 % deckt (nicht doppelt gebaut) | 324 | 52 |
| **Datensätze** (ohne Tiefgaragen) | **31 709** | **2 502** |

- Kataster-Abfrage (Lauf 1): 83 Kästen, 190 Sekunden, 33 394 Gebäude (mit Umland der Kästen), 25 293 mit Geschosszahl; Stände
  2013–2026. Die späteren Läufe lesen sie aus dem Actions-Cache.
- **Bauteile:** Das Kataster führt Treppentürme, Erker, Balkontürme und Anbauten als eigene Körper. Ein kleiner Körper (< 60 m²,
  höchstens halb so groß wie der Nachbar, gemeinsame Wand ≥ 1,5 m) trägt `teil` = Kennung des Hauptgebäudes und dessen Farbe –
  7 130 Datensätze der Stadt, 804 im Probesatz.
  Hohe „Überdachungen“ an Häusern (bis 34 m an den Zwölfgeschossern der Aue) sind Balkon- oder Loggientürme, keine Carports.
- **Tiefgaragen** (Kataster-Funktion „Tiefgarage“, 11 in der Stadt) stehen nicht in `b`, sondern als Umriss in `tief` der Kachel.
- **Steht nicht mehr (`fg` 32):** 271 Körper aus ETHOS/LoD2 fehlen im Kataster. Geprüft auf zwei Wegen: Drei Körper mit 14–16 m Höhe
  (`DETHL57P00002jP4`, `…jP5`, `…jP6`, bei UTM E 619 225, N 5 607 395) liegen im Luftbild vom 15.05.2024 auf einer Brachfläche (von
  Auge, nur diese Stelle). Und das Oberflächenmodell: bei 112 der 271 ließ es sich befragen; bei 61 zeigt es ebenes Gelände, bei 51
  stand beim Laserflug (2020–2025) noch etwas von mindestens 2 m Höhe. Gestützt ist der Merker also nur bei den 61; die übrigen 159
  liegen außerhalb des Oberflächenmodells oder sind zum Messen zu klein.
- **Nur im Kataster (`fg` 64):** 781 Datensätze. Höhe am Oberflächenmodell gemessen bei 387, sonst geschätzt (Geschosse × 3 m +
  1,5 m). Bei 4 zeigt das Oberflächenmodell ebenes Gelände; sie tragen zusätzlich `fg` 128 (neu), ihr Dach bleibt Regel. Das ist
  eine Vermutung: gebaut nach dem Laserflug **oder** unter der Erde – einer der vier ist ein Wasserbehälter, zwei weitere dienen der
  Versorgung (`DETHL57P00017p0P`, `…p0Q`, `DETHL57P0001CYxS`, `DETHL57P0001d050`).
- Lauf 4 hat einen Datensatz mehr als Lauf 3 (31 708): ein Turm, den nur das Kataster kennt. Zwischen den Läufen wurde die
  Vereinfachung der Grundrisse von 0,12 auf 0,15 m gestellt; die genaue Ursache ist nicht nachgeprüft.

## 3 Der Datensatz – woher jedes Feld kommt

Güte wie im Vertrag: 0 Regel oder Annahme · 1 aus Daten abgeleitet · 2 gemessen oder amtlich · 3 von Auge geprüft. Was in `q` fehlt, ist 0.
Die Kachel nennt in `src` die übliche Quelle je Feld; ein Gebäude nennt in `src` nur, was davon abweicht.

| Feld | Inhalt | Quelle | Güte | Stadt, Lauf 4 |
|---|---|---|---|---|
| `id` | LoD2-/ETHOS-Kennung | ETHOS, sonst Kataster | – | eindeutig |
| `f`, `fh` | Grundriss, Löcher; um 0,15 m vereinfacht, Zacken ohne Breite entfernt | ETHOS (aus LoD2); nur-Kataster-Gebäude: Kataster | 2 | 30 928 ETHOS, 781 Kataster |
| `h` | Höhe vom tiefsten Geländepunkt zum höchsten Dachpunkt | ETHOS; nur-Kataster: am DOM1 gemessen, sonst geschätzt | 2 / 1 / 0 | 30 928 / 387 / 394 |
| `e` | Traufe | DOM1, sonst Regel (Geschosse × Geschosshöhe des Haustyps + Sockel); beim Flachdach mit amtlicher Höhe = Höhe | 1 / 0 | Güte 1 bei 24 098: 14 033 am DOM1 gemessen, dazu Flachdächer mit amtlicher Höhe |
| `z0`, `zv` | Fuß (Modell-z) und Gelände über dem Fuß an jeder Grundriss-Ecke | Geländekacheln von `suhl-boden` (`based_on`), sonst Copernicus | 2 mit DGM1, sonst 1 | Stadt: Copernicus (1); Probesatz v1: `suhl-boden` (2) |
| `r`, `fl`, `az`, `p`, `rq` | Dachform (`fl` 1 = flach), Firstrichtung (Modellrahmen), Neigung | DOM1 (`src.r` `dom1`) > OpenStreetMap `roof:shape` (`osm`) > Luftbild + Regel (`dop`) > Regel | `rq` 1 / 1 / 1 / 0 | 14 033 / 938 / 1 041 / 15 697 |
| `rv`, `rt`, `R` | Dach-Netz und Dachflächen: Neigung, Fallrichtung von geografisch Nord, Fläche in echten m² (ohne Dachüberstand, in UTM gerechnet) | aus `r`, `az`, `p`, `e`, `h` gebaut | wie `rq` | Dachfläche zusammen 279,7 ha |
| `rk`, `rc`, `R[].c`, `R[].col` | Deckung und Farbe, je Fläche und fürs ganze Haus | Luftbild 2024 (Farbe und Infrarot); `roof:material` aus OSM geht vor | 1 (ohne Bild 0) | 44 614 von 45 100 Flächen aus dem Bild, 91 aus OSM |
| `F` | Wände: Enden, Oberkanten, Lage der Giebelspitze als Anteil 0…1, Merker Nachbarwand, Meter zur Straße | Geometrie; Straßen aus OSM | – | 19 631 Gebäude mit Wand an einer Straße |
| `S` | je Wand nur, was sie Eigenes hat: `st` Straße, auf die sie blickt (kein Haus dazwischen), `eg: laden`, `sign` Namen, `hof` | OSM | 1 | Ladenzone an einer Straßenseite bei 260 Gebäuden, Schilder bei 512 |
| `fas`, Kachel `fat` | Fassaden-Parameter des ganzen Hauses nach Regel: `col`, und über `t` aus der Tabelle der Kachel `mat`, `col2`, `sock`, `win`, `balk`; Geschosshöhe = (`e` − `sock`) / `lv` | Regel nach Haustyp; `building:colour`/`material` aus OSM gehen vor | 0 (1 mit Geschossen aus Daten) | alle Regel |
| `k` | Art: 0 Haus, 1 Halle, 2 Nebengebäude, 3 Kirche, 4 Behälter, 5 Turm | Kataster-Funktion, sonst OSM, sonst Form | 2 / 1 / 0 | Häuser 15 470, Hallen 656, Nebengebäude und Überdachungen 15 437, Kirchen 18, Behälter 65, Türme 63 |
| `use`, `eg`, `fkt` | Nutzung in den Worten des Vertrags, Erdgeschoss-Nutzung, Funktion in den Worten des Katasters | Kataster; ist dessen Wort allgemein, OSM | 2 / 1 | siehe Abschnitt 6 |
| `lv`, `lvk` | Geschosse; `lvk` = Kataster-Zahl, die nicht unter die Höhe des Körpers passt (dann ist `lv` geschätzt) | Kataster `anzahlgs`, sonst OSM, sonst Traufe ÷ Geschosshöhe | 2 / 1 / 0 | 23 239 (73,3 %) / 531 / 2 854; ohne Geschosse (Nebengebäude) 5 085; `lvk` bei 557 |
| `bt` | Haustyp: punkthochhaus, platte, zeilenbau, stadthaus, villa, efh, dorfhaus, block, halle, kirche, garage, laube, nebengebaeude, ueberdachung, behaelter, turm | Regel aus Nutzung, Geschossen, Form, Nachbarn, Lage | 0 | siehe Abschnitt 6 |
| `era`, `yr` | Baualter-Klasse, Jahr | Jahr aus OSM oder `wahrzeichen.md`; Zensus-Gitter (`src.era` `zensus`); Platte und Hochhaus → 1949–1990; Altstadt-Streifen und Dorfkerne → vor 1918 | 1 / 0 | Güte 1 bei 4 922; unbekannt 22 386 (70,6 %) |
| `n`, `adr` | Name, Adresse | Kataster, sonst OSM, Name auch aus `wahrzeichen.md` | 2 / 1 | Adresse 31 446 (99,2 %), Name 469 |
| `osm` | OSM-Gebäude mit > 50 % Überdeckung | OSM | – | 23 833 (75,2 %) |
| `fg` | 1 Wahrzeichen, 2 Denkmal (OSM `heritage` oder Liste – kein amtlicher Nachweis), 4 betretbar, 32 steht nicht mehr, 64 nur im Kataster, 128 neu | `wahrzeichen.md`, OSM, Abgleich ETHOS–Kataster–Oberflächenmodell | – | 75 / 63 / 50 / 271 / 781 / 4 |
| `lm`, `teil`, `kat` | Nummer in `wahrzeichen.md`; Hauptgebäude eines Bauteils; 1 = dem Kataster nach Lage zugeordnet, 0 = nicht im Kataster | – | – | `teil` 7 130; `kat` 1: 488, 0: 271 |
| `d` | `fa` Grundfläche, `gfa` Geschossfläche = Grundfläche × Geschosse (`lv`), `rf` Dachfläche – echte m², in UTM gerechnet | gerechnet | wie `lv`, `rq` | Grundfläche 252,0 ha, Geschossfläche 480,6 ha |

**Richtungen – zwei Rahmen, so wie der Vertrag sie festlegt** (`tools/suhl/lib/schema/g.py`):

- `az` des Gebäudes ist die Richtung des Firsts **im Modellrahmen**: im Uhrzeigersinn von der y-Achse des Modells, 0 ≤ `az` < 180.
- `R[].az` ist die Fallrichtung jeder Dachfläche **von geografisch Nord**, 0 ≤ `az` < 360 (180 = die Fläche schaut nach Süden). Das
  ist die Zahl für den Solarertrag; sie braucht keine Umrechnung.
- In Suhl gilt: geografisch Nord = Modell − 3,05°. Die Achsen des Modells sind 4,36° gegen das UTM-Gitter gedreht, die
  Meridiankonvergenz beträgt +1,31°. Wer den First von geografisch Nord braucht, rechnet `az` − 3,05.
- **Nachgemessen** (`pruefen.py`, Zahlen in `tools/suhl/out/gebaeude/richtung.json`), an 855 langen Satteldächern der Stadt über
  sauberen Rechtecken: `az` weicht in der Mitte um 0,00° von der Längsachse des Grundrisses im Modellrahmen ab (90 % auf 0,06°). Gegen
  dieselbe Achse, auf der Erdkugel von geografisch Nord gemessen, liegt `az` +3,05° daneben – das ist der Modellrahmen. Die 1 684
  Flächen dieser Dächer weichen in der Mitte um 0,00° von der Fallrichtung ihres eigenen Dach-Netzes ab, auf geografisch Nord gedreht
  (90 % auf 0,07°), und um −0,01° von der Messung auf der Erdkugel. `suhl-daten` hat die Flächen unabhängig nachgerechnet und kommt
  auf dasselbe (0,004° über 24 732 Flächen, `docs/features/suhl-daten.md`).
- Nur der allererste Probesatz (Commit 13e3db02, vor dem Vertrag) nannte auch den First von geografisch Nord. Seit der Umstellung
  auf den Vertrag (Commit 4c9e9722, alle Läufe ab Lauf 2, Probesätze v0 und v1) gilt die Aufteilung oben.
- Das Dach-Netz (`rv`, `rt`) liegt in Modellmetern der Kachel; gezeichnete Dächer hängen von `az` nicht ab.

## 4 Dächer

**Regel** (`dach.py`, `rq` 0): Mit Geschossen aus dem Kataster sitzt die Traufe auf den Geschossen (Geschosshöhe je Haustyp 2,7–3,5 m
plus Sockel), der First ist die gemessene Höhe; bleibt weniger als 1,5 m, ist das Dach flach. Platten und Hochhäuser flach, Hallen
flach geneigt, Garagen flach. Der First läuft entlang der längeren Seite – in einer Häuserzeile entlang der Zeile, quer zu den
Nachbarwänden. Ohne Geschosse: Neigung des Haustyps, das Dach höchstens die halbe Haushöhe.
**Die Geschosse des Katasters gelten:** Die Traufe liegt mindestens über allen Geschossen bis auf das oberste (das darf im Dach
sitzen). Anlass: Wohnblöcke im Zentrum mit 5–6 Geschossen und einer OSM-Angabe „Mansarddach“ bekamen sonst Traufen von 7–10 m
(Hinweis von `suhl-daten`, etwa `DETHL57P00006FKH`); das Oberflächenmodell zeigt sie flach bei rund 16,5 m.

**OpenStreetMap** (`rq` 1, `src.r` `osm`): `roof:shape` – in der Stadt bei 938 Gebäuden die Quelle der Form, im Probesatz v1 bei 236.
Mansard-, Krüppelwalm- und Zeltdach stehen als Form in `r`; gebaut werden sie vorerst als Walm- oder Satteldach.

**Luftbild** (`rq` 1, `src.r` `dop`): Zwei Hälften eines Dachs gleich hell und ohne Ziegelrot = flach; die Linie zwischen heller und
dunkler Hälfte = First (Idee aus `tools/welt-gebaeude/prep.py`). In der Stadt bei 1 041 Gebäuden.

**Oberflächenmodell DOM1** (`dom.py`, `rq` 1, `src.r` `dom1`, `q.e` 1 – die beste Quelle bis LoD2): Die 1-m-Zellen im Grundriss
(0,7 m vom Rand, mindestens 12 Zellen), als Höhe über dem Fuß (tiefster Geländepunkt am Umriss; Gelände = DGM1, wo es im Cache
liegt, sonst Oberfläche minus Objekthöhe nDOM1).
So wird entschieden:

- **flach**, wenn die Zellen auf 0,3 m in einer Ebene liegen;
- **Pult-, Sattel- oder Walmdach** (First längs oder quer, auch außermittig), wenn das beste Modell auf 0,5 m passt (bei hohen Dächern
  auf 14 % der Dachhöhe) und deutlich besser ist als die Ebene; 15 % Ausreißer wie Schornsteine und Aufzugshäuser zählen nicht;
- **flach mit Aufbauten**, wenn die Ebene auf 0,55 m passt und kein geneigtes Modell klar besser ist;
- sonst **„nur Höhen“**: Traufe und Dachspitze aus den Zellen (8 % und 97 % der Höhen), die Form bleibt Regel – so bei
  zusammengesetzten Dächern wie dem Rathaus;
- **nichts**, wenn die Oberfläche am Boden liegt (unter 1,8 m) oder weit von der amtlichen Höhe abweicht.

Selbsttest: 13 von 13 erfundenen Dächern wiedergefunden (Neigung auf 3°, Traufe auf 0,6 m).

| Oberflächenmodell (`bauen_*.json` → `dom`) | Ganze Stadt | Probesatz v1 |
|---|---:|---:|
| Dach gemessen (Form, First, Traufe) | 13 671 | 1 254 |
| nur Höhen gemessen | 362 | 94 |
| nichts passt – Regel bleibt | 1 888 | 199 |
| Grundriss zu klein (unter 12 Zellen) | 6 520 | 745 |
| keine DOM-Kachel (außerhalb der Kernstadt) | 6 762 | 0 |
| **Form anders als die Regel** | **5 004 (37 %)** | **437 (35 %)** |
| Regel geneigt → gemessen flach | 3 151 | 195 |
| Regel flach → gemessen geneigt (dazu: nur Höhen) | 1 361 (+116) | 119 (+24) |
| beide geneigt – davon First gedreht | 5 424 – 939 | 671 – 95 |
| Traufe verschoben: Mitte / 90 % unter | 0,88 m / 2,86 m | 1,08 m / 3,44 m |
| Neigung geändert: Mitte / 90 % unter | 7,5° / 19,2° | 7,7° / 20,2° |
| Dachspitze im Modell minus Höhe aus ETHOS: Mitte (10 %…90 %) | +0,14 m (−0,31…+2,35), 16 446 Gebäude | +0,17 m (−0,35…+2,69), 1 593 |

Lesart: Die Regel lag bei gut einem Drittel der Dächer in der Form daneben, meist „geneigt statt flach“ (Regel Satteldach →
gemessen flach 1 904, Regel Pultdach → flach 1 188). Die Höhen aus ETHOS und die Oberfläche stimmen in der Mitte auf 14 cm überein –
ein guter Gegentest für beide. Nicht gezählt sind 2 517 Überdachungen, Behälter, Türme und Tiefgaragen; für sie wird kein Dach gemessen.
**Schwäche:** Bei „nur Höhen“ ist die Form weiter Regel, der Datensatz trägt aber `rq` 1 und `src.r` `dom1` wie ein gemessenes Dach.

**Deckung und Farbe** (`dachbild.py`): je Dachfläche die Mitte der Bildpunkte (dunkelstes Viertel = Schatten und hellste 15 % =
Glanz weggelassen, Baumkronen über das Infrarotbild weggelassen). Klassen: Ziegel rot, Ziegel dunkel, Betonstein/grau, Schiefer,
Bitumen/Kies, Blech, Gründach. Die Flächen eines Dachs sind verschieden besonnt: Die Fläche im Schatten übernimmt Deckung und Farbe
der besonnten, wenn beide dieselbe Farbart haben. Stadt: 44 614 von 45 100 Flächen aus dem Bild. Häufigste Deckung je Gebäude:
Bitumen/Kies 18 558, Betonstein/grau 4 307, Ziegel rot 3 513, Schiefer 2 393, Blech 1 993. **Schwäche:** „Betonstein“ ist jedes
graue geneigte Dach – Faserzement, alte Ziegel und Schiefer in der Sonne sind am Bild nicht sicher zu trennen. Die Klassen sind an
einem Ausschnitt von Auge angesehen, nicht ausgezählt.

**Liegen die Dächer im Bild auf den Grundrissen?** Ja. Der Dienst nennt für Suhl „bDOM“. Messung (`versatz.py`, `versatz.json`): Der
Umriss wird in Schritten von 0,4 m über das Bild geschoben, bis die Bildkanten darunter am stärksten sind. Bei den 13 Gebäuden ab
30 m Höhe liegt das Dach 0,4–2,4 m neben dem Grundriss, in der Mitte 1,2 m, **unabhängig von der Höhe** (45-m-Hochhäuser: 0,4–1,6 m).
Ein gewöhnliches Orthofoto zeigte bei diesen Höhen viele Meter. Eine Korrektur wie in `tools/welt-gebaeude/retusche.py` ist nicht nötig.

## 5 Seiten und Fassaden

- Eine Wand je Kante des Grundrisses (`F`), Höfe eingeschlossen. Nachbarwand: zwei von drei Probepunkten 0,5 m vor der Wand liegen
  an einem anderen Gebäude. In der Stadt haben 19 631 Gebäude mindestens eine Wand an einer Straße.
- „Blickt auf eine Straße“: ein Strahl senkrecht zur Wand trifft binnen 40 m eine Straße aus OSM, ohne dass ein anderes Haus
  dazwischen steht. Abstand = bis zum Fahrbahnrand (halbe Breite nach Straßenklasse oder OSM `width`/`lanes` – eine Annahme).
- Regeln je Haustyp (`fassade.py`): Material (Platte für Platten und Hochhäuser, sonst Putz; in Dorfkernen 35 % Fachwerk als Regel),
  Farbe aus einer Palette je Typ (gleiches Haus, gleiche Wahl), Sockel, Fensterraster (Achsabstand 2,3–3,6 m), Loggien für Platten
  und Hochhäuser, Balkone für einen Teil der Zeilen. Ladenzone (`eg: laden`) an den Straßenseiten, wenn OSM im Haus einen Laden,
  eine Gaststätte, Bank, Apotheke oder ein Handwerk führt oder das Kataster „Handel“ sagt; Schilder mit den Namen aus OSM.
  Ladenzone an einer Straßenseite in der Stadt: 260 Gebäude (Probesatz 110); Schilder an 512 (187); Erdgeschoss-Nutzung „handel“ (`eg`) bei 315 (102).
- Stufe 3 schreibt je Seite nach Fotos in `S[i]` (Güte 2–3); `fas` bleibt der Rückfall. `fas`/`fat` gelten fürs ganze Haus
  (je Seite wiederholt hätten die Parameter die Kacheln fast verdreifacht).

## 6 Art, Nutzung, Haustyp, Baualter

- Die Funktions-Worte des Katasters und ihre Übersetzung: `actions/bauen_stadt.json` → `function_to_use`. Nutzungen in der Stadt
  (`use`): Wohnen 13 299, Nebengebäude (darin Lauben und Überdachungen) 11 580, sonstige/unbekannt 2 386, Garagen 2 294, Gewerbe 931,
  Handel 255, Versorgung 213, Industrie 182, Verwaltung 175, Landwirtschaft 79, Schulen 76, Gesundheit 41, Büro 38, Verkehr 38,
  Kultur 34, Kirche 30, Hotel 30, Sport 18, Gastronomie 10.
- Haustypen (`bt`, Regel): Einfamilienhaus 9 329, Nebengebäude 5 660, Laube 5 118, Dorfhaus 2 926, Überdachung 2 378, Garage 2 290,
  Block 1 853, Halle 720, Stadthaus 642, Platte 231, Villa 203, Zeilenbau 165, Behälter 65, Turm 63, Punkthochhaus 47, Kirche 19.
- **Baualter:** unbekannt 22 386 (70,6 %; in Lauf 1 ohne Zensus 89 %), vor 1918 4 311, 1919–1948 1 987, 1949–1990 1 628, nach 1990
  1 397. Güte 1 (aus Daten) bei 4 922. Quelle: Zensus-Gitter 6 865, Jahr aus OSM 38, aus `wahrzeichen.md` 33, sonst Regel: Platte und
  Hochhaus → 1949–1990; Dorfkerne (280 m um den Ortspunkt) und der Altstadt-Streifen Markt/Steinweg/Topfmarkt/Kirchgasse → vor 1918.
  Probesatz v1: unbekannt 1 399 von 2 502 (56 %).
- **Zensus-Gitter 2022** (Gebäude nach Baujahr, Zellen von 100 m; 1 824 Zellen im Rechteck um Suhl, 1 398 mit Zahlen): Ein Haus
  (Art 0, kein Bauteil, kein Jahr aus anderer Quelle) bekommt die Klasse, die in seiner Zelle am häufigsten ist. Bei 4 851 Häusern
  stellt sie mindestens 60 % der Gebäude der Zelle (Güte 1); bei 2 014 ist sie nur die häufigste (Güte 0, aber besser als
  „unbekannt“); bei 966 bleibt die Regel; 3 785 Häuser liegen in keiner Zelle mit Zahlen. Hallen, Lauben und Nebengebäude werden
  nicht nachgeschlagen und bleiben „unbekannt“. Das ist eine Angabe je Zelle, nicht je Haus.
- **Hochhäuser ab 25 m, einzeln gegen `tools/suhl/out/bestand/ethos.json` geprüft:** 58 von 59 Körpern, alle Höhen gleich; der
  fehlende hat 1 m² Grundfläche (39,8 m) und wird als zu klein weggelassen. 20 haben mindestens 100 m²: der Hotelturm (56,6 m,
  19 Geschosse laut Kataster), acht Wohnhochhäuser mit 40–46 m (die sieben in den Probekacheln: 14–16 Geschosse), fünf Scheiben mit
  35 m (12 Geschosse) – in den Probekacheln alle als Flachdach. Die übrigen sind Bauteile (Balkontürme, Aufzugshäuser), Schornsteine und Masten. Liste: `pruefen_*.json` → `tall`.

## 7 Fußhöhen

`fuss.py` liest die Höhe am Umriss (Ecken und alle 2 m) aus Geländekacheln (WTH1) – Ordner oder Adresse, die feinste vorhandene Stufe
gilt – und schreibt nur `z0` (tiefster Punkt, Modell-z), `q.z0`, `zv` (Gelände über `z0` je Ecke, ab 0,4 m Unterschied) und in den
Index `based_on: {boden: N}`. Ein neuer Boden braucht nur diesen Schritt.

- **Probesatz v1:** Geländekacheln von `suhl-boden`, Probesatz v1 (DGM1 im Zentrum, außen Copernicus; Straßen eingeschnitten mit dem
  Straßensatz v0; Stand `origin/suhl/boden` 7a7b068). Alle 2 502 Gebäude, Güte 2, `based_on: {boden: 1}`.
- **Was der bessere Boden ausmacht** (gerechnet aus den Probesätzen v0 und v1 auf diesem Zweig): Zwischen den Fußhöhen auf dem
  Copernicus-Boden (v0) und auf dem 1-m-Gelände (v1) liegen in der Mitte 2,6 m, bei jedem zehnten Haus mehr als 7,7 m, höchstens
  18 m; 1 294 von 2 500 Füßen weichen um mehr als 2,5 m ab. Das erklärt den Befund von `suhl-laufzeit` (Füße neben dem Boden): Die
  Füße müssen von denselben Kacheln gelesen sein, die die App zeigt. Im Probesatz v1 tragen 1 869 Gebäude `zv`; das Gelände steigt
  am Umriss in der Mitte um 1,3 m über den Fuß, bei jedem zehnten um mehr als 3,3 m, höchstens 8,2 m.
- **Ganze Stadt:** noch Copernicus GLO-30 (30 m, vorläufig, Güte 1, ohne `based_on`), weil `suhl-boden` für die Stadt noch nichts
  veröffentlicht hat. Der Workflow fragt bei jedem Lauf `…/pavillon-daten/suhl/aktuell.json` und nimmt die Geländekacheln, sobald sie
  dort stehen.
- Reihenfolge (Suhl-Chat, 13.11.): `suhl-boden` rohes Gelände → `suhl-strassen` Profile → `suhl-boden` schneidet die Straßen ein →
  **dann** `fuss.py` auf den eingeschnittenen Kacheln.

## 8 Die ganze Stadt und die Prüfungen

| Lauf | Dauer | Ergebnis | Inhalt |
|---|---|---|---|
| 1 – 43340470432 | 18 min | rot (nur: ein Körper von 1 m² aus Stufe 1 fehlt – seither ein Hinweis) | erstes Format; 31 719 Datensätze, 24,0 MB. Zeiten: OSM-Auszug 15 s, ETHOS 2,4 min, Kataster 3,2 min, Bauen mit 794 Luftbildern 11,9 min |
| 2 – 43344549434 | 5 min | grün | Vertragsformat 1.0; Dächer am Oberflächenmodell im Zentrum (8 Kacheln); Zensus-Gitter |
| 3 – 43345898563 | 10 min | rot (3 Gebäude mit einer Traufe von wenigen Zentimetern) | Fassung 1.1; Oberflächenmodell für Zentrum und Kernstadt geholt (49 + 57 Kacheln, 139 MB) |
| **4 – 43348109758** | **7 min**, davon 3 min Warten; der Lauf selbst 4 min 7 s | **grün** | 31 709 Datensätze, 397 Kacheln, 35 018 885 Byte (1,08 kB je Gebäude), als tar.gz 6,9 MB; Bauen 136 s, Fußhöhen 10 s, Prüfungen 3 s, Prüfer des Vertrags 3 s, Probesatz 23 s |

Alle Downloads liegen im Actions-Cache (ETHOS, Kataster, Luftbilder, Oberflächenmodell, Zensus); ein neuer Lauf holt nichts doppelt.
Über easygeodata bezogen: 57 Kacheln DOM1 (102,6 MB), 57 Kacheln nDOM1 (49,8 MB), 8 Kacheln DGM1 (11,3 MB) – einmal, zusammen
164 MB von 20 GB im Monat.

| Prüfung (`pruefen.py`) | Ergebnis Stadt, Lauf 4 |
|---|---|
| Index nennt alle Dateien; Mitte von Suhl dabei; Felder vollständig | ja (397 Kacheln, Kachel 497/542) |
| Kennungen eindeutig; Grundrisse gültig; kein Gebäude in zwei Kacheln; alle in der Gemeinde | ja (31 709) |
| Höhen 0,3–120 m, Traufe ≤ Höhe | ja |
| Dach-Netz in Ordnung; Dach geschlossen (Flächen decken den Grundriss auf 6 %); Flächen in echten m² (auf 3 %) | ja |
| Wände passen zu den Kanten; Geschosse passen zur Traufe (1,9–6,5 m je Geschoss) | ja |
| Fußhöhen vorhanden | ja (31 709) |
| Grundrisse überlappen nicht | 79 Paare über 1 m² (größte 48 m²: Kataster-Neubau über altem ETHOS-Körper) – Hinweis |
| Hochhäuser gegen Stufe 1 | 58 von 59, alle Höhen gleich; der fehlende hat 1 m² |
| Menge gegen Stufe 1 (30 929) | 30 928 aus ETHOS; mehr als 10 000 Gebäude |
| **Richtungen in den Rahmen des Vertrags:** First `az` im Modellrahmen, Flächen `R[].az` von geografisch Nord (neu, 13.11. 03:35) | ja – 855 lange Satteldächer, 1 684 Flächen; an den Kacheln des Artefakts von Lauf 4 am Chat-Rechner geprüft (`richtung.json`), ab dem nächsten Lauf im Workflow. Gegenprobe: eine Kopie des Probesatzes mit vertauschtem Rahmen fällt durch. |
| **Prüfer des Datenvertrags** (`validate.py`, `vertrag_stadt.json`) | gültig, Fassung 1.1, 0 Fehler, 0 Warnungen |

Nicht geprüft (braucht andere Pakete): kein Gebäude in einer Fahrbahn (`suhl-strassen`), Hausfuß auf dem eingeschnittenen Gelände
der ganzen Stadt (`suhl-boden`).

## 9 Was LoD2 ändert

Die Datensätze behalten ihre Kennung. Aus dem CityGML je Gebäude: `bldg:RoofSurface` → `rv`/`rt`/`R` (echte Flächen, Sonderformen
als `r` 9), `roofType` → `r`, niedrigste Dachkante → `e`, Bodenfläche → `z0`; `rq` 2. `F` bekommt die Dachhöhen entlang jeder Wand.
Alles Übrige bleibt.

Was sich dadurch ändert, in Zahlen von heute: Die 15 697 Regel-Dächer (vor allem außerhalb der Kernstadt) und die 1 979 Dächer aus
OSM oder Luftbild bekämen gemessene Flächen. Die 14 033 Dächer aus dem Oberflächenmodell bekämen die echte Form statt eines der vier
einfachen Modelle – wichtig bei den 362 zusammengesetzten Dächern, bei Mansard- und Krüppelwalmdächern und bei allem unter 12 m²
Messfläche. Gauben und Aufbauten gibt LoD2 nicht her; dafür bleibt das Oberflächenmodell die Quelle.
Das Werkzeug dafür (`lod2.py` nach dem Muster von `tools/welt-gebaeude/lod2.py`) ist **noch nicht gebaut** – der nächste Schritt,
sobald Falkos Dateien da sind.

## 10 Quellen und Nennung

| Quelle | Lizenz | Nennung |
|---|---|---|
| ETHOS.BUILDA v1.0.0, Zenodo 11845992, `DEG.csv` (aus dem LoD2 Thüringen) | ODbL 1.0 | Forschungszentrum Jülich; © GDI-Th |
| WFS „ALKIS vereinfacht“, `ave:GebaeudeBauwerk` | CC BY 4.0 | © GDI-Th |
| Luftbild `th_dop`, `th_dop20cir`, Bildflug 15.05.2024 | CC BY 4.0 | © GDI-Th |
| DOM1, nDOM1, DGM1 Thüringen 2020–2025 | CC BY 4.0 | © GDI-Th, bezogen über easygeodata.de |
| OpenStreetMap | ODbL 1.0 | © OpenStreetMap-Mitwirkende |
| Copernicus DEM GLO-30 (nur vorläufige Fußhöhen) | Copernicus | © DLR e.V. 2010–2014, © Airbus Defence and Space GmbH 2014–2018 |
| Zensus 2022, Gitter 100 m, „Gebäude nach Baujahr“ (destatis.de) | Lizenzname nicht geprüft | © Statistische Ämter des Bundes und der Länder |

Jeder `index.json` trägt die Quellen und die Zeile für die App. Rohdaten und Luftbilder liegen nie in git.

## 11 Offen und unsicher

- Außerhalb von Zentrum und Kernstadt (6 762 Gebäude) gibt es noch kein Oberflächenmodell: Dächer dort sind Regel, OSM oder Luftbild.
  Die übrigen 136 Kilometer-Kacheln lassen sich über `easygeodata: P1,P2,P3,P4` in `lauf.txt` bestellen.
- Gauben, Aufbauten und Solarmodule (`A`) fehlen ganz.
- Die Dachklassen sind an einem Ausschnitt von Auge angesehen, nicht ausgezählt; „Betonstein“ ist ein Sammelbegriff für graue Dächer.
- „Steht nicht mehr“ (`fg` 32) ist nur bei 61 von 271 durch das Oberflächenmodell gestützt; 51 standen beim Laserflug noch, 159
  ließen sich nicht befragen. „Nur im Kataster“ (`fg` 64) kann auch ein Gebäude sein, das dem LoD2 nur fehlte. „Neu“ (`fg` 128)
  ist bei den 4 Gebäuden eine Vermutung – mindestens der Wasserbehälter liegt wohl unter der Erde.
- 362 Dächer („nur Höhen“) tragen `rq` 1, obwohl ihre Form Regel ist (Abschnitt 4).
- Geschosse: das Kataster zählt je Gebäude, die Höhe gilt je Körper – 557 Körper der Stadt tragen deshalb `lvk`.
- Fassadenfarben sind Paletten, keine Beobachtung; das Luftbild taugt dafür nicht.
- Dachfarben kommen vom WMS des Landes. Sobald `suhl-boden` farbausgeglichene Bildkacheln liefert, sollen sie von dort kommen,
  damit Dach und Boden zusammenpassen (Suhl-Chat, 13.11.) – noch nicht umgestellt.
- Fußhöhen der ganzen Stadt sind vorläufig (Copernicus), siehe Abschnitt 7.
- Der Probesatz v1 liegt 1,2 % unter der Grenze von 3 MB.
- Das Baualter aus dem Zensus gilt je 100-m-Zelle, nicht je Haus.

## Für den Suhl-Chat

1. **Für `suhl-daten` (veröffentlichen):** ganze Stadt = Lauf **43348109758**, Artefakt **`suhl-g-v1`** (Versionsordner `v1` mit
   `index.json` und `10/{x}/{y}.json`; 397 Kacheln, 35,0 MB, gültig nach Fassung 1.1). Probesatz v1 =
   `tools/suhl/out/gebaeude/probe/suhl/g/v1/` auf `suhl/gebaeude` (Stand des Laufs: Commit 60e89c49). Die Stadt hat noch
   vorläufige Fußhöhen (Punkt 3) – das gehört in den Hinweis zur Veröffentlichung.
2. **Nicht zeichnen:** `fg` & 32 und `tief`. `fg` 128 heißt hier: steht im Kataster, im Oberflächenmodell noch nicht.
   **Richtungen:** `R[].az` ist von geografisch Nord, das Gebäude-Feld `az` (First) im Modellrahmen – so wie im Vertrag, nachgemessen
   (Abschnitt 3). Für `suhl-daten` (S2-9): Die Stadtzahlen in `docs/features/suhl-daten.md` sind noch aus dem Artefakt des roten
   Laufs 43345898563 gerechnet (31 708 Datensätze); der gültige Lauf ist 43348109758 (31 709).
3. **Fußhöhen der Stadt:** Sobald `suhl-boden` das eingeschnittene Gelände der Stadt veröffentlicht, genügt eine neue Zeile `lauf:` in
   `tools/suhl/gebaeude/lauf.txt` (etwa 4 Minuten); der Lauf liest `z0`/`zv` dann von dort und setzt `based_on`.
4. **`tools/welt/QUELLEN.md`:** WFS „ALKIS vereinfacht“, easygeodata (DOM1, nDOM1) und das Zensus-Gitter als Quellen eintragen
   (ich ändere keine vorhandene Datei).
5. **Fragen an Falko:** keine neuen. Seine LoD2-Dateien bleiben der Weg zu echten Dachflächen.
