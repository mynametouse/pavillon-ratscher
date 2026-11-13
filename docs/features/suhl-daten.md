# Suhl – Datenhaus: der Vertrag der Suhl-Daten (Schema 1), Prüfen, Veröffentlichen

Stand 13.11.2026, Agent `suhl-daten` (Zweig `suhl/daten`), Stufe 2 des Suhl-Plans, Paket S2-0. Auftrag: `docs/plans/auftraege/suhl-daten.md`.
Dieses Dokument ist der **Vertrag**: Die Daten-Agenten liefern so, die Laufzeit (`suhl-laufzeit`) liest so. Der Prüfer
`tools/suhl/lib/validate.py` prüft genau das, was hier steht (Schema 1, Fassung 1.0). Wer ein Feld anders braucht, sagt es `suhl-daten`
oder dem Suhl-Chat; dann ändert sich Schema und Dokument zusammen (Abschnitt 12).

## 1 Kurz für Agenten

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))   # aus tools/suhl/<paket>/
import suhllib as S          # nur Standardbibliothek, läuft mit python3 -I

S.guard(box=mein_utm_rahmen, what='suhl-gebaeude')      # ZUERST: liegt die Mitte von Suhl in meinem Rahmen? sonst Abbruch mit klarer Meldung
for x, y in S.area_tiles('zentrum', 10): ...            # Kacheln der Stufe 10 (400 m), die ein Gebiet berühren: zentrum 11, kernstadt 216, stadt 1 013
fr = S.tile_frame(10, x, y)                             # Kachel-Rahmen: fr.o (Mitte in Modellmetern), fr.from_utm(E, N), fr.to_utm(x, y)
S.tile_path('g', 0, 10, x, y)                           # 'suhl/g/v0/10/497/542.json'
S.guard(buildings=n, area='stadt')                      # plausible Menge? (stadt: 10 000–80 000 Gebäude) sonst Abbruch
```

| Was | Befehl |
|---|---|
| Zweig holen | `git fetch origin suhl/daten && git merge origin/suhl/daten` (mischen, nie umsetzen; die Dateien überschneiden sich nicht) |
| Probesatz prüfen | `python3 -I tools/suhl/lib/validate.py tools/suhl/out/<paket>/probe --probe` |
| Ganze Stadt prüfen (im Workflow) | `python3 -I tools/suhl/lib/validate.py <ordner mit suhl/> --json bericht.json` – Ende 0 = gültig, 1 = Fehler |
| `index.json` schreiben | `python3 -I tools/suhl/lib/validate.py --index <…/suhl/<produkt>/v<N>> --area zentrum --sources ethos,alkis,osm,dop` (eigene Schlüssel eines vorhandenen Index bleiben erhalten) |
| Quellen-Kürzel ansehen | `python3 -I tools/suhl/lib/validate.py --sources-list` |
| Feldliste (englisch, aus dem Code) | `python3 -I tools/suhl/lib/validate.py --doc` |
| Tests der Bibliothek | `python3 -I tools/suhl/lib/test_lib.py`, `test_schema.py`, `test_easygeodata.py` (zusammen 3 s, ohne Netz) |
| Höhen von easygeodata holen (nur im Workflow) | `python3 -I tools/suhl/lib/easygeodata.py --product dgm --prio P1 --raw ~/suhl-raw` (Abschnitt 9) |
| Erfundenes Beispiel aller Produkte | `tools/suhl/lib/beispiel/suhl/…` (zum Einlesen, bevor echte Daten da sind; Kennungen `BEISPIEL_…`) |
| Probekacheln | `tools/suhl/lib/probe.json` – die 11 Kacheln der Stufe 10, die `zentrum` berühren, mit Grenzen in UTM und Modellmetern |

## 2 Koordinaten: welcher Rahmen in welcher Datei

Entschieden am 13.11.2026 (Suhl-Chat, 01:52). **Jedes Produkt hat genau einen Rahmen. Wer liest, rechnet um – nie raten.**

| Produkt | Rahmen der Lagen | Einheit | Warum |
|---|---|---|---|
| `g` Gebäude, `m` Möbel | **Kachel-lokale Modellmeter**: x = Modell-x − `o[0]`, y = Modell-y − `o[1]`. `o` = Mitte der Kachel in Modellmetern, steht in **jeder** Datei. Achsen wie im Modell (x Ost, y Nord, gegen UTM um 4,36° gedreht). | m, 2 Nachkommastellen | Die App und `prep.py` rechnen in Modellmetern. Kleine Zahlen: kein Zittern weit weg vom Ursprung (Plan 1.3). |
| `s` Straßen | **Modell-Dezimeter, absolut** (x Ost, y Nord, z = NHN − H0), ganze Zahlen – wie `fahrt/strassen.json` | dm | Das Straßen-System der Region liest diese Zahlen, wie sie sind. |
| `b` Bäume | **UTM-Zentimeter ab der Südwest-Ecke der Kachel** (Ost, Nord), ganze Zahlen 0…39 999 | cm | So liefert es `suhl-gruen`; passt in 2 × 16 Bit. |
| `boden` (`t/`, `i/`) | UTM-Kacheln wie im übrigen `WELT`-Boden (`tools/welt/wlib.py`) | – | unverändert |
| alle | **Höhen sind echte Meter**: Modell-z = NHN − H0, H0 = 374,617 | m | |

Ein Modellmeter ist **1,0157 m**, die Modellachsen sind um **4,3566°** gegen das UTM-Gitter gedreht (`xf` in `viz3/manifests.json`).
Deshalb gilt: **Flächen, Längen, Neigungen und Himmelsrichtungen für Szenarien stehen als eigene Zahlen in den Daten** (in UTM
gerechnet, echte m², Grad von geografisch Nord) und werden nie aus der Geometrie der Datei gerechnet. Beispiel: ein Haus von
14 × 9 Modellmetern hat 126,0 Modell-m², aber 130,0 m² (Feld `d.fa`).

Umrechnungen (Python: `suhllib`; JavaScript daneben):

| Von → nach | Python | JavaScript |
|---|---|---|
| Kachel → UTM-Grenzen | `S.tbounds(L, x, y)` | `s = 409600 / 2 ** L; E0 = 420700 + x * s; N0 = 5390800 + y * s` |
| UTM → Modell | `S.model_from_utm(E, N)` | `dE = E - xf.ex; dN = N - xf.ey; q = xf.a * xf.a + xf.b * xf.b; mx = (xf.a * dE + xf.b * dN) / q; my = (-xf.b * dE + xf.a * dN) / q` |
| Modell → UTM | `S.utm_from_model(x, y)` | `E = xf.a * x - xf.b * y + xf.ex; N = xf.b * x + xf.a * y + xf.ey` |
| `g`, `m` → three.js | `fr = S.tile_frame(L, x, y)`; `fr.to_model(x, y)` | `mesh.position.set(o[0], 0, -o[1])`; Eckpunkt `(x, z, -y)` |
| `b` → Modell | `schema.tree_model(key, baum)` | `E = E0 + cmX / 100; N = N0 + cmY / 100`, dann UTM → Modell |
| `s` → Modell | – | `x = v / 10` |
| WGS84 ↔ UTM | `S.utm_from_lonlat(lon, lat)`, `S.lonlat_from_utm(E, N)` – **immer (lon, lat)**, vertauschte Werte werden abgelehnt | (in der App vorhanden) |
| Richtung im Modell → geografisch Nord | `S.true_azimuth_from_model(az)` = az − 4,357° + 1,308° (in Suhl also az − 3,05°) | dieselbe Rechnung |

Die Mitte von Suhl: UTM E 619 762, N 5 607 680 (`S.CENTRE_UTM`, der Punkt des Wächters) = Kachel `10/497/542`. Bezugspunkt der App
`SUHL.O = [-4698.2, 12255.7]` (`S.O_MODEL`, der Verwaltungs-Mittelpunkt aus `gebiete.geojson`, 7 m daneben).

## 3 Wem welche Höhe gehört

Entschieden am 13.11.2026 (Suhl-Chat): Suhl ist eine Zone mit eigenem Boden, wie Kloster Veßra.

| Höhe | Gehört | Die anderen |
|---|---|---|
| Fahrbahnen (Längsprofile, Kreuzungen, Brücken) | **`s`** (`suhl-strassen`) | `suhl-boden` schneidet die Straßen in die Geländekacheln; das Fahr-Modul schneidet in Suhl zur Laufzeit **nicht** |
| Gelände | **`boden`** (`suhl-boden`): Roh-Gelände (DGM1, wo es das gibt, sonst Copernicus) mit eingeschnittenen Straßen = das **End-Gelände** | alle lesen es, keiner ändert es |
| Hausfuß `z0` | **`g`** (`suhl-gebaeude`), **abgelesen vom End-Gelände** | Der Index von `g` nennt, von welcher Boden-Version: `based_on: {"boden": N, "s": M}`. Fehlt `z0` (Probesatz), stellt die Laufzeit das Haus auf ihren Boden. |
| Dach, Traufe, Wände | `g`: Meter **über dem Fuß** (`e`, `h`, `rv`, `F`) | |
| Bäume | keine Höhe in `b` | die Laufzeit fragt den Boden |
| Möbel | `z` in `m` nur, wenn etwas nicht auf dem Boden steht (Brücke) | sonst Boden |

Folge: Ein neuer Boden (etwa mit DGM1 von easygeodata) braucht einen neuen Lauf von `g`, damit `z0` passt. `aktuell.json` nennt beide
Versionen; passt `based_on` nicht zur gültigen Boden-Version, nimmt die Laufzeit ihren Boden statt `z0`.

## 4 Ordner, Versionen, `aktuell.json`, `index.json`

Basis: `https://mynametouse.github.io/pavillon-daten/` (Repo `mynametouse/pavillon-daten`, Zweig `main`). In der App `SUHL.BASE` =
Basis + `suhl/`.

```
suhl/aktuell.json                            welche Version je Produkt gilt – die einzige Datei, die überschrieben wird
suhl/<produkt>/v<N>/index.json               welche Kacheln es gibt, Quellen, Namensnennung, Zahlen – einmal geschrieben, nie geändert
suhl/<produkt>/v<N>/<L>/<x>/<y>.<ext>        Kacheln im Quadtree von tools/welt/wlib.py (x nach Osten, y nach NORDEN)
suhl/boden/v<N>/meta.json, t/<L>/<x>/<y>.bin, i/<L>/<x>/<y>.webp     der Boden im Format, das WELT heute liest
```

| Produkt | Ordner | Stufe | Datei | Besitzer |
|---|---|---|---|---|
| Boden | `suhl/boden/v<N>/t/`, `i/` | 6–12 | WTH1 `.bin`, WebP 512 px | `suhl-boden` |
| Gebäude | `suhl/g/v<N>/` | 10 | JSON | `suhl-gebaeude` |
| Straßenraum | `suhl/s/v<N>/` | 10 | JSON | `suhl-strassen` |
| Möbel der Straße | `suhl/m/v<N>/` | 10 | JSON | `suhl-strassen` |
| Bäume | `suhl/b/v<N>/` | 10 | binär, 8 Byte je Baum | `suhl-gruen` |
| Szenario-Zahlen | `suhl/d/v<N>/` | 10 | JSON | `suhl-daten` (Paket S2-9) |
| Dach-Atlas, Fernmodell | `suhl/da/`, `suhl/f/` | 10, 8 | WebP, binär | Stufe 3, zweite Welle |

Regeln: Eine veröffentlichte Version wird **nie** geändert; Besseres bekommt die nächste Nummer. `v0` ist der Probesatz. Kacheln ohne
Inhalt werden nicht geschrieben. Ein Gebäude, ein Baum, ein Möbelstück steht in **genau einer** Kachel (in der sein Bezugspunkt liegt).

### `suhl/aktuell.json`

```json
{"v": 1, "made": "2026-11-13T01:30:00Z", "base": "https://mynametouse.github.io/pavillon-daten/suhl/",
 "products": {"g": {"version": 0, "schema": 1, "path": "g/v0/", "index": "g/v0/index.json", "made": "…", "area": "probe", "tiles": 11, "bytes": 123456}}}
```

`schema` ist die Schema-Nummer, die die App mindestens können muss. GitHub Pages liefert mit `cache-control: max-age=600`: die App
holt `aktuell.json` mit `cache: 'no-cache'` (sonst ist sie bis zu 10 Minuten alt); Versionsordner dürfen lange im Cache bleiben.

### `index.json` einer Produkt-Version

Pflicht in jedem Index (der Prüfer verlangt sie): `v`, `p`, `version`, `made`, `area`, `tiles`, `sources`, `attribution`.
Freiwillig gemeinsam: `rev`, `ext`, `n`, `marks`, `based_on`, `run`, `stats`, `note`. **Daneben darf jedes Produkt eigene Schlüssel
führen** (der Baum-Index hat `format`, `arten`, `merker`, `kacheln` …) – sie werden nicht geprüft.

| Schlüssel | Inhalt |
|---|---|
| `v`, `rev` | Schema-Nummer (1), Fassung („1.0“) |
| `p`, `version` | Produkt (`g`, `s`, `m`, `b`, `d`, `boden` …), das N aus `v<N>` |
| `made` | Zeit in UTC, `2026-11-13T01:30:00Z` |
| `area` | ein Wort: `probe`, `zentrum`, `kernstadt`, `stadt` (bei `zentrum`/`kernstadt`/`stadt` prüft der Prüfer die Mengen) |
| `tiles` | `{"": {"10": Kachelmenge}}` – je Unterordner (`""` = direkt im Versionsordner; Boden: `"t"`, `"i"`) und Stufe |
| Kachelmenge | `{"x0", "y0", "w", "h", "n", "bits"}`: Bitfeld über das Rechteck, Bit k = (y − y0) · w + (x − x0), Bit 0 = niedrigstes Bit von Byte 0, base64 |
| `n` | `{"tiles", "items", "bytes"}` – Kacheln, Dinge (Gebäude, Bäume …), Bytes |
| `marks` | `{"dgm": {"10": Kachelmenge}}` – Kacheln mit einer Eigenschaft (Gelände ist DGM1, Dächer aus LoD2) |
| `based_on` | `{"boden": 1}` – aus welchen Produkt-Versionen gerechnet (Abschnitt 3) |
| `sources` | Liste `{id, title, licence, attribution, url, by, via, date}`; die Kürzel `ethos`, `alkis`, `lod2`, `dop`, `dgm1`, `dom1`, `ndom1`, `cop30`, `osm`, `gtfs`, `worldcover`, `wissen`, `regel` füllt der Katalog (`schema.source('dgm1', via='bezogen über easygeodata.de')`) |
| `attribution` | die Zeile, die die App zeigt („© GDI-Th (CC BY 4.0) · © OpenStreetMap-Mitwirkende (ODbL) …“) |

Kachelmenge in JavaScript lesen:

```js
function hat(ts, x, y) {
  const i = x - ts.x0, j = y - ts.y0;
  if (i < 0 || j < 0 || i >= ts.w || j >= ts.h) return false;
  if (!ts._b) ts._b = Uint8Array.from(atob(ts.bits), (c) => c.charCodeAt(0));
  const k = j * ts.w + i;
  return ((ts._b[k >> 3] >> (k & 7)) & 1) === 1;
}
```

## 5 Produkt `g`: ein Datensatz je Gebäude

Kachel: `{"v": 1, "p": "g", "key": "10/497/542", "o": [-4752.698, 12383.984], "b": [Gebäude, …]}`; freiwillig `made`, `dgm` (0/1),
`lod2` (0/1), `src`.

Ausgangspunkt ist das Format, das `gebaeude/gebaeude.js` heute liest (`tools/welt-gebaeude/prep.py`). Zwei Namen weichen deshalb vom
Plan 2.3 ab: **`h` bleibt die Höhe** (die Löcher des Grundrisses heißen `fh`), **`fl` bleibt „Flachdach“** (die Merker heißen `fg`).
P = Pflicht, F = freiwillig.

| Feld | | Typ | Einheit, Rahmen | Bedeutung |
|---|---|---|---|---|
| `id` | P | Text | | LoD2-/ETHOS-/Kataster-Kennung (`DETHL51P000004BA`), bleibt über alle Datenstände gleich. Teil eines geteilten Gebäudes: `<id>_<n>`. Nur in OSM: `way/<n>`. Neubau eines Szenarios: `neu-…`. Eindeutig im Produkt. |
| `f` | P | `[x0, y0, x1, y1, …]` | Kachel-lokal, m | Grundriss, äußerer Ring, **gegen den Uhrzeigersinn**, nicht geschlossen, ≥ 3 Punkte |
| `fh` | F | `[[x0, y0, …], …]` | Kachel-lokal, m | Löcher (Innenhöfe), je Ring im Uhrzeigersinn |
| `k` | P | Zahl | | Art: 0 Haus, 1 Halle/Scheune, 2 Nebengebäude (Schuppen, Garage), 3 Kirche, 4 runder Behälter, 5 Turm/Silo/Schornstein |
| `h` | P | Zahl | m | Höhe vom Fuß bis zum höchsten Punkt |
| `e` | P | Zahl | m | Traufhöhe über dem Fuß (0 ≤ e ≤ h) |
| `z0` | F | Zahl | m, Modell-z | Höhe des Fußes (NHN − 374,617), vom End-Gelände abgelesen (Abschnitt 3) |
| `r` | P | Zahl | | Dachform: 0 flach, 1 Pult, 2 Sattel, 3 Walm, 4 Krüppelwalm, 5 Mansard, 6 Zelt, 7 Tonne, 8 Shed, 9 frei (Flächen aus LoD2) |
| `az` | F | Zahl | Grad, Modell | Richtung des Firsts, im Uhrzeigersinn von der Modell-y-Achse, 0 ≤ az < 180 |
| `p` | F | Zahl | Grad | Dachneigung (echt) |
| `rq` | P | 0…3 | Güte | wie das Dach (`r`, `az`, `p`, `rv`, `rt`, `R`) gefunden wurde: 0 Regel aus Grundriss und Höhe, 1 mit Daten (Luftbild, OSM), 2 LoD2, 3 geprüft. (`prep.py` schreibt `"foto"` – das ist hier 1.) |
| `rk` | P | Zahl | | Deckung des ganzen Hauses: 0 Ziegel rot, 1 Faserzement, 2 Blech, 3 Schiefer, 4 flach (Bitumen, Kies), 5 Ziegel dunkel, 6 Betonstein, 7 Gründach, 8 Glas |
| `rc` | P | `[r, g, b]` | sRGB 0…1 | Dachfarbe |
| `rv` | P | `[x, y, z, …]` | Kachel-lokal, z über dem Fuß | Dach-Netz: Eckpunkte |
| `rt` | P | `[i, j, k, …]` | Nummern in `rv` | Dach-Netz: Dreiecke |
| `R` | F | Liste | | Dachflächen: `{vi: [erster Eckpunkt, Zahl]` (Umriss, der Reihe nach in `rv`), `ti: [erstes Dreieck, Zahl]` in `rt`, `c` Deckung wie `rk`, `col`, `sl` Neigung in Grad, `az` **Fallrichtung in Grad von geografisch Nord**, `a` **Fläche in m² (echt, in der Schräge, in UTM gerechnet)**, `ap` Fläche im Grundriss m², `at` Ausschnitt im Dach-Atlas`}` |
| `A` | F | Liste | | Aufbauten: `{t: kamin \| gaube \| dachfenster \| pv \| aufbau \| antenne, x, y, z, w, d, h, az, f` (Nummer der Dachfläche)`, q}` |
| `F` | P | `[[10 Zahlen], …]` | Kachel-lokal, Höhen über dem Fuß | Wände: `[ax, ay, bx, by, Oberkante bei a, Lage der Spitze u (0…1), Oberkante an der Spitze, Oberkante bei b, Merker (1 = Nachbarwand, keine Fenster), Meter zur nächsten Straße (99 = keine)]` |
| `S` | F | Liste | | Seiten: ein Eintrag (Objekt oder `null`) je Zeile von `F`, gleiche Reihenfolge: `{st` Straßenname, `sd` Meter dorthin, `q` Güte der Fassaden-Parameter, `src` Foto-Kennungen, und die Parameter aus Plan 4b: `mat` (putz, platte, klinker, schiefer, fachwerk, sandstein, sichtbeton, glas, blech, holz), `col`, `col2`, `lv`, `h0`, `hf`, `sock`, `win`, `eg`, `balk`, `gable`, `brand`, `sign}` |
| `fl` | F | 0/1 | | 1 = Flachdach (wie heute; dasselbe wie `r` = 0) |
| `lv` | F | Zahl | | Geschosse über der Erde |
| `use` | F | Wort | | Hauptnutzung: wohnen, handel, buero, gastro, hotel, schule, kita, kirche, kultur, gesundheit, verwaltung, gewerbe, industrie, lager, landwirtschaft, verkehr, garage, neben, sport, versorgung, leer, sonst |
| `eg` | F | Wort | | Nutzung des Erdgeschosses, wenn sie abweicht (Laden unter Wohnungen) |
| `fkt` | F | Text | | Funktion in den Worten des Katasters (ALKIS) |
| `era` | F | Zahl | | Baualter: 0 unbekannt, 1 vor 1918, 2 1919–1948, 3 1949–1990, 4 nach 1990 |
| `yr` | F | Zahl | Jahr | Baujahr, wenn bekannt |
| `bt` | F | Wort | | Bautyp: wbs70, zeilenbau, punkthochhaus, fachwerk, gruenderzeit, efh, reihenhaus … |
| `n` | F | Text | | Name |
| `adr` | F | Text | | Adresse „Straße Nummer“ (mehrere mit „; “) |
| `osm` | F | Text | | zugeordnetes OSM-Objekt (Überdeckung > 50 %): `way/<n>`, `relation/<n>` |
| `fg` | F | Zahl | Bits | Merker: 1 Wahrzeichen (eigenes Modell), 2 Denkmal, 4 betretbar, 8 leer stehend, 16 Abriss geplant, 32 steht nicht mehr, 64 neu oder im Bau |
| `d` | F | Objekt | echte m², in UTM | Szenario-Zahlen (Plan 6.3): `{fa` Grundfläche, `lv` Geschosse, `gfa` Geschossfläche, `vol` m³, `rf` Dachfläche, `ro: {N, NO, O, SO, S, SW, W, NW, flach}` Dachfläche je Richtung, `ru` nutzbare Dachfläche, `res` Bewohner, `heat: {k, kwh}`, `pv` kWp heute, `q}` – auch als eigenes Produkt `d` |
| `q` | P | `{Feld: 0…3}` | Güte | Güte jedes geschätzten Felds: Schlüssel `f, h, e, z0, k, use, eg, era, yr, bt, lv, rk, rc, n, adr, S, A, d`. Was hier fehlt, gilt als 0. |
| `src` | F | `{Feld: Quelle}` | | Herkunft: ethos, lod2, alkis, osm, dop, dgm1, dom1, ndom1, cop30, foto, wissen, zensus, regel |

**Güte** (überall gleich: `rq`, `q`, `S[].q`, `A[].q`): 0 = Regel oder Annahme · 1 = aus Daten abgeleitet (Luftbild, Oberflächenmodell,
OSM-Angaben) · 2 = gemessen oder amtlich (LoD2, Kataster, ein Foto, das ein Agent gelesen hat) · 3 = von Auge geprüft. So kann die App
im „Warum?“ ehrlich sagen, was gemessen und was angenommen ist.

Der Prüfer verlangt außerdem: Kennungen eindeutig; Grundriss in der richtigen Kachel und im richtigen Rahmen (kein Punkt weiter als
700 m von der Kachelmitte – sonst sind es wohl absolute Modellmeter); `rt` zeigt nur auf vorhandene Eckpunkte; `S` so lang wie `F`;
Summe der `ap` passt zur Grundfläche (Warnung); Geschosse passen zur Traufe (Warnung); unbekannte Felder sind eine Warnung (eigene
Hilfsfelder beginnen mit `x_`).

## 6 Die anderen Produkte

### `b` Bäume (Format von `suhl-gruen`, 13.11.2026)

Eine Datei je Kachel, **8 Byte je Baum, ohne Kopf**, Little Endian; Zahl der Bäume = Dateigröße / 8.

| Bytes | Typ | Inhalt |
|---|---|---|
| 0–1 | uint16 | Zentimeter östlich des Westrands der Kachel (UTM) |
| 2–3 | uint16 | Zentimeter nördlich des Südrands |
| 4 | uint8 | Baumhöhe in 0,25 m |
| 5 | uint8 | Kronenradius in 0,1 m |
| 6 | uint8 | Art: 0 Laubbaum, 1 Nadelbaum, 2 Fichte, 3 Kiefer, 4 Lärche, 5 Tanne/Douglasie, 10 Linde, 11 Ahorn, 12 Eiche, 13 Buche, 14 Birke, 15 Esche, 16 Rosskastanie, 17 Platane, 18 Pappel, 19 Weide, 20 Obstbaum, 21 Robinie, 22 Hainbuche, 23 Eberesche, 24 Erle, 25 Zierkirsche, 30 Strauch/Hecke (Nadelbäume: 1–5) |
| 7 | uint8 | Merker: Bits 0–1 Herkunft der Lage (0 Regel, 1 Luftbild, 2 OSM, 3 nDOM1); 4 = Höhe gemessen (nDOM1); 8 = Kronenradius gemessen; 16 = Art kartiert; 32 = vom Dach oder der Fahrbahn weggerückt; 64 = in OSM kartiert |

Python: `schema.tree_pack(liste)`, `schema.tree_unpack(bytes)`, `schema.tree_model(key, baum)`. Geprüft wird: Größe durch 8 teilbar,
jeder Baum in der Kachel (< 40 000 cm), bekannte Art, Höhe und Radius > 0. Bestände im Wald und Grünflächen: Format noch offen
(`suhl-gruen` schlägt vor).

### `m` Möbel der Straße

`{"v": 1, "p": "m", "key": "…", "o": […], "items": [{"t": "laterne", "x": 12.3, "y": -41.0, …}]}` – Lagen Kachel-lokal in Modellmetern.
`t`: laterne, ampel, schild, strassenschild, ortstafel, wegweiser, haltestelle, wartehalle, bank, ueberweg, poller, leitpfosten,
leitplanke, mast, papierkorb, briefkasten, ladenschild, brunnen, denkmal, fahne, fahrradstaender, parkautomat, schranke, zaun, mauer,
treppe, sonst. Freiwillig: `z` (Modell-z, nur wenn nicht auf dem Boden), `az` (Grad, Modell), `h`, `w`, `k` (Unterart), `n` (Text,
Name), `pts` (Linie `[x0, y0, …]`), `osm`, `ref` (z. B. Haltestellen-Kennung im Fahrplan), `q`. Fassung 0 – `suhl-strassen` sagt, was
fehlt.

### `s` Straßenraum

`{"v": 1, "p": "s", "key": "…", "o": […], "unit": "dm", "kinds": […], "surf": […], "names": […], "ways": [[Art, Belag, Breite dm, Merker, Name,
Nummer, [x, y, z, …]], …], "areas": [{"k": "platz", "surf": 2, "n": 0, "f": [x, y, …]}], "water": […], "rail": […]}` – die Zeilen von `ways`
wie in `fahrt/strassen.json` (`viz3/extra/fahrt/strecke.py`), **Lagen in ganzen Modell-Dezimetern, absolut**. Geprüft wird der Kopf,
die Tabellen, die Form der Zeilen und dass mindestens ein Punkt jedes Wegs in der Kachel liegt. Fassung 0 – `suhl-strassen` legt die
Einzelheiten fest (Stil, Fahrspuren, Flächen, Wasser, Bahn).

### `d` Szenario-Zahlen

`{"v": 1, "p": "d", "key": "…", "d": {"<Gebäude-Kennung>": {fa, lv, gfa, …}}}` – dieselben Zahlen wie das Feld `d` eines Gebäudes; dazu
später `viertel.json` (Summen je Viertel). Kommt mit Paket S2-9.

### `boden`

`meta.json` im Format, das `welt/welt.js` heute liest (`format: "welt-test/1"`, `tiling.levels`, `sources`, `attribution`), dazu die
gemeinsame `index.json` mit den Kachelmengen für `t` und `i` (statt Rechtecken; Haken W2). Geprüft werden nur die ersten Bytes der
Kacheln (`WTH1`, WebP) und Listen gegen Dateien.

## 7 Prüfen und der Wächter

- `validate.py <ordner>` nimmt einen Ordner, der `suhl/` enthält (Probesatz, Artefakt, Kopie des Daten-Repos), eine Produkt-Version
  oder eine einzelne Kachel. Fehler = der Leser kann die Datei nicht verwenden; Warnung = verdächtig. `--strict` macht Warnungen zu
  Fehlern, `--probe` prüft zusätzlich die Regeln des Probesatzes (nur die 11 Probekacheln samt Kindern und Eltern; höchstens 3 MB, Boden 8 MB).
- **Der Wächter** (Lehre vom 26.10.: ein Tippfehler schickte den alten Lauf nach Nigeria): `S.guard(box=…)` bricht ab, wenn die Mitte
  von Suhl nicht im Rahmen liegt – auch bei vertauschtem Ost/Nord, Grad statt Metern, (Breite, Länge) statt (Länge, Breite).
  `S.guard(box=…, part_of='stadt')` für einen gewollten Ausschnitt. `S.guard(buildings=n, streets=m, area='stadt')` prüft Mengen
  (`S.PLAUSIBLE`). Der Prüfer wiederholt beides am fertigen Produkt: die Kachel mit der Mitte von Suhl muss dabei sein, und bei
  `area` = zentrum/kernstadt/stadt muss die Zahl der Gebäude oder Bäume plausibel sein.
- Höflich holen: `S.http_get(url, cache=ordner)` und `S.http_download(url, ziel)` – eigener User-Agent, Pause je Server, Wiederholung
  mit wachsender Wartezeit bei 429/5xx, kein zweiter Versuch bei 403/404, Platten-Cache. Schlüssel aus der Adresse und aus Kopfzeilen
  kommen nie in den Cache oder ins Protokoll.

## 8 Veröffentlichen: die Aktion `suhl-publish`

Geprüft am 13.11.2026, 01:43 (Lauf 43339309234): Das Geheimnis `DATEN_TOKEN` ist da und darf schreiben; `suhl/_probe/hallo.json` lag
30 Sekunden nach dem Push unter `https://mynametouse.github.io/pavillon-daten/suhl/_probe/hallo.json`.

```yaml
jobs:
  veroeffentlichen:
    concurrency: { group: suhl-daten-publish, cancel-in-progress: false }   # eine Gruppe für alle, nie abbrechen
    steps:
      - uses: actions/checkout@v4
      - …                                              # erzeugt <ordner>/suhl/g/v1/ mit index.json, prüft mit validate.py
      - uses: ./.github/actions/suhl-publish
        with:
          folder: <ordner>/suhl/g/v1
          token: ${{ secrets.DATEN_TOKEN }}
```

Stand: Modus `hallo` (nur die Probe-Datei) läuft; **Modus `product` (Ordner → Daten-Repo, `aktuell.json`, `ATTRIBUTION.md`) folgt als
Nächstes** – bis dahin bleibt die ganze Stadt Artefakt des eigenen Laufs. Fehlt das Geheimnis oder das Repo, veröffentlicht die Aktion
nichts, sagt es im Protokoll, in der Zusammenfassung und in `outputs.published`/`outputs.reason` und lädt den Ordner als Artefakt hoch;
der Lauf schlägt deshalb nicht fehl. Der Schlüssel erscheint nie im Protokoll. In dieses Repo (auch `gh-pages`) schreibt sie nie.
Achtung GitHub: In einer `concurrency`-Gruppe wartet höchstens **ein** Lauf; ein dritter verdrängt den wartenden. Die Aktion schützt
sich deshalb selbst: abgelehnter Push → holen, umsetzen, noch einmal (bis zu 8 Versuche).

## 9 easygeodata: DGM1, DOM1, nDOM1 (1 m)

Geprüft am 13.11.2026 aus GitHub Actions (Läufe 43340656226 und 43341000214): Das Geheimnis `EASYGEODATA_KEY` ist gesetzt und gilt.
Gelesen wurde die Beschreibung der Schnittstelle selbst (`/api/docs`, „easygeodata Extract API 1.0“), mit Schlüssel.

| Frage | Antwort (gemessen oder aus der Beschreibung der Schnittstelle) |
|---|---|
| Wie meldet man sich an? | Kopfzeile `X-API-Key`. Ohne Schlüssel bekommen Programme 401. |
| Was gibt es für Suhl (Gemeinde, AGS 16054000)? | je **193 Kacheln** von 1 km: DGM1 282,1 MB (1,2–1,6 MB je Kachel), DOM1 361,5 MB (1,4–2,0 MB), nDOM1 189,9 MB (0,2–1,3 MB) – zusammen 833,5 MB. Es sind genau die Kacheln P1–P3 aus `kacheln.csv`. |
| Datenstand | bei allen Kacheln der Zeitraum 2020–2025 des Landes; der genaue Flugtag steht nicht dabei. DOM1 ist das Laser-Original; nDOM1 = DOM1 − DGM1 aus demselben Zeitraum. |
| Dateiformat | GeoTIFF, 1000 × 1000 Zellen zu 1 m, Float32, EPSG:25832, Zellflächen, linke obere Ecke = (E km · 1000, N km · 1000 + 1000), leer = −9999, gekachelt 512, eine Übersicht, **LERC-gepackt** (DGM1/DOM1 höchstens 1 mm Abweichung, nDOM1 höchstens 5 cm) |
| Probe-Kachel 619/5607 (Markt) | DGM1 1 243 568 Bytes, 413,62–510,18 m NHN, keine leere Zelle; nDOM1 692 899 Bytes, 0–69,86 m über Gelände |
| Liest die vorhandene Pipeline das? | Ja, unverändert: als `<raw>/dgm1/dgm1_32_619_5607.zip` (das GeoTIFF unverpackt im ZIP) findet `tools/welt/fetch.py` `fetch_dgm1` die Datei, `read_dgm1` liefert 1000 × 1000, Ecke 619 000 / 5 608 000, 1 m. **Nötig: `pip install imagecodecs`** neben `tifffile` (LERC). |
| Wie kommt die Datei? | Die Liste nennt je Kachel eine Adresse `/api/file/…`. Sie prüft Schlüssel und Kontingent und leitet auf eine 15 Minuten gültige Adresse eines anderen Servers weiter. Der Client schickt den Schlüssel nur an easygeodata.de, nie an den zweiten Server. |
| Grenzen | kostenloses Konto: **20 GB im Monat**; Mosaik und Höhenlinien bis 150 Kacheln je Abruf. Fehler tragen ein Feld `grund` (`kontingent`, `tageslimit`, `tageslimit_server`, `schluessel` …) – es gibt also auch Tagesgrenzen, Zahlen nennt die Beschreibung nicht. Antworten ohne Zähler in den Kopfzeilen. |
| Lizenz, Nennung | Daten des Landes: „© GDI-Th“ (das Land nennt CC BY 4.0, die Seite für Höhendaten dl-de/by-2-0 – gleiche Nennung). Die Beschreibung verlangt, die Quellenvermerke der Länder zu beachten. Wir nennen zusätzlich „bezogen über easygeodata.de“ (`egd.sources_entry('dgm')`). |
| Straßen-Korridore (P4, 35 Kacheln außerhalb der Gemeinde) | nicht in der Gemeinde-Liste; der Client fragt sie einzeln über einen Rahmen ab (noch nicht am echten Dienst geprüft) |

**So holt ein Workflow, was er braucht** (jeder mit eigenem Cache – Actions-Caches gelten je Zweig, einen gemeinsamen Rohdaten-Ordner gibt es nicht):

```yaml
      - uses: actions/cache@v4
        with: { path: ~/suhl-raw, key: 'suhl-raw-egd-v1-${{ github.run_id }}', restore-keys: 'suhl-raw-egd-v1-' }
      - run: pip install --quiet numpy tifffile imagecodecs
      - name: Höhen von easygeodata (übersprungen, wenn der Schlüssel fehlt)
        env: { EASYGEODATA_KEY: '${{ secrets.EASYGEODATA_KEY }}' }
        run: python3 -I tools/suhl/lib/easygeodata.py --product dgm --prio P1 --raw ~/suhl-raw --report egd.json
```

| Wahl | Bedeutung |
|---|---|
| `--product dgm,dom,ndom` | DGM1, DOM1, nDOM1 – mehrere mit Komma |
| `--prio P1` / `P1,P2` / `P1,P2,P3` | Kacheln aus `tools/suhl/out/bestand/kacheln.csv`: P1 = 8 um das Zentrum, P2 = 49 Kernstadt, P3 = 136 Rest der Gemeinde, P4 = 35 Korridore |
| `--tiles 619_5607,620_5607` | einzelne Kacheln (linke untere Ecke in km) |
| `--area zentrum --margin 300` | die 1-km-Kacheln, die dem Gebiet auf 300 m nahe kommen (zentrum 8, kernstadt 60, stadt ohne Rand 193) |
| `--max-mb 1000` | Obergrenze je Lauf und Produkt |
| Ergebnis | `<raw>/dgm1/dgm1_32_{E}_{N}.zip`, `<raw>/dom1/dom1_32_{E}_{N}.zip`, `<raw>/ndom1/ndom1_32_{E}_{N}.zip`; `<raw>/egd/manifest.json` (was wann kam, Datenstand); `--report` als JSON; Ausgaben `dgm_present`, `dgm_wanted`, `dgm_complete` |

In Python: `import easygeodata as EG; egd = EG.Easygeodata(raw=RAW); rep = egd.fetch_many('ndom', EG.prio_tiles(['P1'])); a, e0, n1, px = egd.read('ndom', 619, 5607)`
(`a[0]` ist die Nordzeile, Zellmitte von `a[r, c]` = (e0 + c + 0,5, n1 − r − 0,5)).

**Abrufe und Kontingent:** je Produkt 1 Abruf für die Liste und 2 je Kachel. P1: 17 Abrufe, etwa 11 MB (DGM1). Ganze Gemeinde: 387 Abrufe
je Produkt, bei 2 s Pause etwa 15 Minuten. Alle drei Produkte einmal sind 833,5 MB = 4,2 % der 20 GB im Monat. Der Client holt
nichts doppelt (Dateien im Rohdaten-Ordner bleiben), hält bei `kontingent` oder Tagesgrenze sauber an und macht im nächsten Lauf
weiter; ein Lauf schlägt deshalb nie fehl – das Ergebnis sagt, was fehlt. Geht ein Cache verloren, kostet es dieselbe Menge noch einmal:
deshalb den Cache-Schlüssel nicht ohne Grund ändern. Benutzt wird der Dienst nur aus GitHub Actions (der Client verweigert sich sonst).

## 10 Was auf Falko wartet

| Was | Stand |
|---|---|
| Daten-Repo `mynametouse/pavillon-daten` mit GitHub Pages | ✔ angelegt, Pages antwortet |
| Geheimnis `DATEN_TOKEN` | ✔ vorhanden, schreibt (Lauf 43339309234) |
| Geheimnis `EASYGEODATA_KEY` | ✔ vorhanden, gilt (Läufe 43340656226, 43341000214); 20 GB im Monat frei |
| LoD2 (echte Dachformen) | weiter von Hand, später |

## 11 Für den Suhl-Chat

- Rahmen (Abschnitt 2) und Höhen (Abschnitt 3) sind so eingetragen, wie am 13.11. 01:52 entschieden.
- `suhl-gruen`: Die Baum-Kacheln sind gültig (9 312 Bäume in 11 Kacheln geprüft). Dem `index.json` fehlen die gemeinsamen Schlüssel –
  ein Befehl ergänzt sie und lässt die eigenen stehen:
  `python3 -I tools/suhl/lib/validate.py --index tools/suhl/out/gruen/probe/suhl/b/v0 --area zentrum --sources dop,osm,ethos`.
- `suhl-gebaeude`: `h` = Höhe, Löcher = `fh`, Merker = `fg`, `rq` ist eine Zahl 0–3 (Abschnitt 5). `z0` erst, wenn das End-Gelände steht.
- `suhl-strassen`: `s` und `m` sind Fassung 0 aus dem Plan und dem Auftrag; bitte sagen, was das Format der Fahrdaten zusätzlich braucht.
- `suhl-laufzeit`: `aktuell.json` mit `cache: 'no-cache'` holen (Pages: `max-age=600`); Pages sendet `access-control-allow-origin: *`.
- Die gemeinsame `concurrency`-Gruppe verdrängt wartende Läufe (Abschnitt 8) – die Aktion fängt das ab.

## 12 Änderungen am Schema

| Fassung | Datum | Was |
|---|---|---|
| 1.0 | 13.11.2026 | erste Fassung: `g` (Gebäude), `b` (Bäume, Format von `suhl-gruen`), `m`, `s`, `d`, `index.json`, `aktuell.json` |

Regel: Ein neues freiwilliges Feld erhöht die Fassung (1.1, 1.2 …), die Schema-Nummer bleibt 1. Die Schema-Nummer steigt nur, wenn ein
Leser umgebaut werden muss; `aktuell.json` nennt sie je Produkt.
