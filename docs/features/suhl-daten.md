# Suhl – Datenhaus: der Vertrag der Suhl-Daten (Schema 1), Prüfen, Veröffentlichen

Stand 13.11.2026, Agent `suhl-daten` (Zweig `suhl/daten`), Stufe 2 des Suhl-Plans, Pakete S2-0 (Datenhaus) und S2-9 (Szenario-Zahlen,
Abschnitt 13 – dort steht auch der Vertrag für `SUHL.data`). Auftrag: `docs/plans/auftraege/suhl-daten.md`.
Dieses Dokument ist der **Vertrag**: Die Daten-Agenten liefern so, die Laufzeit (`suhl-laufzeit`) liest so. Der Prüfer
`tools/suhl/lib/validate.py` prüft genau das, was hier steht (Schema 1, Fassung 1.2 vom 13.11.2026, 03:25; für `g`, `s`, `m`, `b`, `gr`, `w`, `boden` unverändert seit Fassung 1.1). Wer ein Feld anders braucht, sagt es `suhl-daten`
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
| `index.json` schreiben oder ergänzen | `python3 -I tools/suhl/lib/validate.py --index <…/suhl/<produkt>/v<N>> [--area probe] [--sources ethos,alkis,osm,dop] [--based-on boden=1,s=1]` – schreibt den gemeinsamen Teil aus den Dateien; alle eigenen Schlüssel eines vorhandenen Index bleiben, Gebiet, Quellen und Namensnennung werden von dort übernommen |
| Quellen-Kürzel ansehen | `python3 -I tools/suhl/lib/validate.py --sources-list` |
| Feldliste (englisch, aus dem Code) | `python3 -I tools/suhl/lib/validate.py --doc` |
| Tests | `python3 -I tools/suhl/lib/test_lib.py`, `test_schema.py`, `test_easygeodata.py`, `tools/suhl/daten/test_zahlen.py`, `test_zensus.py` (zusammen 4 s, ohne Netz) |
| Szenario-Zahlen rechnen (Abschnitt 13) | `python3 -I tools/suhl/daten/zahlen.py --g <…/suhl/g/v1> --out <wurzel>/suhl/d/v1 --area stadt --zensus tools/suhl/out/daten/zensus` |
| Stadtteil eines Punkts | `import viertel; viertel.build().at(E, N)` (aus `tools/suhl/daten/`) – oder das Raster in `viertel.json` |
| Zensus-Zelle eines Punkts | `S.census_cell(E, N)` → (Spalte, Zeile) im 100-m-Gitter EPSG:3035; `S.laea_from_utm`, `S.utm_from_laea` |
| Höhen von easygeodata holen (nur im Workflow) | `python3 -I tools/suhl/lib/easygeodata.py --product dgm --prio P1 --raw ~/suhl-raw` (Abschnitt 9) |
| Veröffentlichen | nicht selbst: den Ordner `…/suhl/<produkt>/v<N>` als Artefakt mit festem Namen hochladen (`suhl-g-v1` …) und dem Suhl-Chat den Lauf nennen – Abschnitt 8 |
| Erfundenes Beispiel aller Produkte | `tools/suhl/lib/beispiel/suhl/…` (kleinstes Beispiel in der Form der Fassung 1.1; Kennungen `BEISPIEL_…`) |
| Probekacheln | `tools/suhl/lib/probe.json` – die 11 Kacheln der Stufe 10, die `zentrum` berühren, mit Grenzen in UTM und Modellmetern |

## 2 Koordinaten: welcher Rahmen in welcher Datei

Entschieden in der Nacht zum 13.11.2026 (Suhl-Chat). **Jedes Produkt hat genau einen Rahmen. Wer liest, rechnet um – nie raten.**

| Produkt | Rahmen der Lagen | Einheit | Warum |
|---|---|---|---|
| `g` Gebäude, `m` Möbel | **Kachel-lokale Modellmeter**: x = Modell-x − `o[0]`, y = Modell-y − `o[1]`. `o` = Mitte der Kachel in Modellmetern, steht in **jeder** Datei. Achsen wie im Modell (x Ost, y Nord, gegen UTM um 4,36° gedreht). | m, 2 Nachkommastellen | Die App und `prep.py` rechnen in Modellmetern. Kleine Zahlen: kein Zittern weit weg vom Ursprung (Plan 1.3). |
| `s` Straßen | **Kachel-lokale Modell-Dezimeter**: x, y relativ zu `o` entlang der Modellachsen, z = NHN − H0, ganze Zahlen | dm | So liefert es `suhl-strassen` (Zeilen wie in `fahrt/strassen.json`, aber je Kachel). |
| `b` Bäume | **UTM-Zentimeter ab der Südwest-Ecke der Kachel** (Ost, Nord), ganze Zahlen 0…39 999 | cm | So liefert es `suhl-gruen`; passt in 2 × 16 Bit. |
| `gr` Grünflächen | **UTM-Dezimeter ab der Südwest-Ecke der Kachel**, ganze Zahlen 0…4 000 | dm | `suhl-gruen` |
| `w` Waldbestände | Raster 20 × 20 Zellen zu 20 m, Zeile 0 = Südrand, Zelle 0 = Westrand (UTM) | – | `suhl-gruen` |
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
| `s` → Modell | – | `x = o[0] + v / 10` (z: `v / 10`) |
| `gr` → Modell | – | `E = E0 + dmX / 10; N = N0 + dmY / 10`, dann UTM → Modell |
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
| Dach, Traufe, Wände | `g`: Meter **über dem Fuß** (`e`, `h`, `rv`, `F`); das Gelände an den Hausecken über dem Fuß: `zv` | |
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
suhl/boden/v<N>/meta.json, t/<L>/<x>/<y>.bin, i/<L>/<x>/<y>.webp     der Boden im Format, das WELT heute liest; meta.json ist sein Index
```

| Produkt | Ordner | Stufe | Datei | Besitzer |
|---|---|---|---|---|
| Boden | `suhl/boden/v<N>/t/`, `i/` | 6–12 | WTH1 `.bin`, WebP 512 px | `suhl-boden` |
| Gebäude | `suhl/g/v<N>/` | 10 | JSON | `suhl-gebaeude` |
| Straßenraum | `suhl/s/v<N>/` | 10 | JSON | `suhl-strassen` |
| Möbel der Straße | `suhl/m/v<N>/` | 10 | JSON | `suhl-strassen` |
| Bäume | `suhl/b/v<N>/` | 10 | binär, 8 Byte je Baum | `suhl-gruen` |
| Grünflächen | `suhl/gr/v<N>/` | 10 | JSON | `suhl-gruen` |
| Waldbestände | `suhl/w/v<N>/` | 10 | binär, 2 400 Byte | `suhl-gruen` |
| Szenario-Zahlen | `suhl/d/v<N>/` | 10 | JSON | `suhl-daten` (Paket S2-9) |
| Dach-Atlas, Fernmodell | `suhl/da/`, `suhl/f/` | 10, 8 | WebP, binär | Stufe 3, zweite Welle |

Regeln: Eine veröffentlichte Version wird **nie** geändert; Besseres bekommt die nächste Nummer. `v0` ist der Probesatz. Kacheln ohne
Inhalt werden nicht geschrieben. Ein Gebäude, ein Baum, ein Möbelstück steht in **genau einer** Kachel (in der sein Bezugspunkt liegt).

### `suhl/aktuell.json`

```json
{"schema": 1, "made": "2026-11-13T01:30:00Z", "base": "https://mynametouse.github.io/pavillon-daten/suhl/",
 "products": {"g": {"version": 1, "schema": 1, "path": "g/v1/", "index": "g/v1/index.json", "made": "…", "area": "probe", "tiles": 11, "bytes": 2952088, "based_on": {"boden": 1}},
              "boden": {"version": 1, "schema": 1, "path": "boden/v1/", "index": "boden/v1/meta.json", "made": "…", "area": "probe", "tiles": 370, "bytes": 7572480, "based_on": {"s": 1}}}}
```

`schema` ist die Schema-Nummer, die die App mindestens können muss. GitHub Pages liefert mit `cache-control: max-age=600`: die App
holt `aktuell.json` mit `cache: 'no-cache'` (sonst ist sie bis zu 10 Minuten alt); Versionsordner dürfen lange im Cache bleiben.

### `index.json` einer Produkt-Version

Pflicht in jedem Index (der Prüfer verlangt sie): `schema`, `product`, `version`, `made`, `area`, `has`, `based_on`, `sources`,
`attribution`. Freiwillig gemeinsam: `rev`, `n`, `marks`, `run`, `note`. **Daneben führt jedes Produkt eigene Schlüssel**, wie es sie
braucht (Bäume: `format`, `arten`, `merker`, `kacheln`; Straßen: `fields`, `fl`, `kinds`; Gebäude: `counts`, `x_z0` …) – sie werden
nicht geprüft. Der Befehl `validate.py --index <ordner>` schreibt den gemeinsamen Teil und lässt alles andere stehen.

| Schlüssel | Inhalt |
|---|---|
| `schema`, `rev` | Schema-Nummer (1), Fassung („1.1“) |
| `product`, `version` | Produkt (`g`, `s`, `m`, `b`, `gr`, `w`, `d`), das N aus `v<N>` als Zahl (auch `"v<N>"` gilt) |
| `made` | Zeit in UTC, `2026-11-13T01:30:00Z` |
| `area` | ein Wort: `probe`, `zentrum`, `kernstadt`, `stadt` (bei `zentrum`/`kernstadt`/`stadt` prüft der Prüfer die Mengen) |
| `has` | `{"10": Kachelmenge}` – je Stufe, welche Kacheln es gibt |
| Kachelmenge | `{"x0", "y0", "w", "h", "n", "bits"}`: Bitfeld über das Rechteck, Bit k = (y − y0) · w + (x − x0), Bit 0 = niedrigstes Bit von Byte 0, base64 (`S.tileset_encode`) |
| `based_on` | `{"boden": 1, "s": 1}` – auf welcher Generation der anderen Produkte gerechnet wurde (Abschnitt 3); `{}`, wenn auf keiner. Ein Satz, dessen Produkte nicht zueinander passen, wird nicht veröffentlicht. |
| `n` | `{"tiles", "items", "bytes"}` – Kacheln, Dinge (Gebäude, Bäume, Wege …), Bytes |
| `marks` | `{"dgm": {"10": Kachelmenge}}` – Kacheln mit einer Eigenschaft (Gelände ist DGM1, Dächer aus LoD2) |
| `sources` | Liste von Einträgen `{id, title, licence, attribution, url, by, via, date}` (die Kürzel `ethos`, `alkis`, `lod2`, `dop`, `dgm1`, `dom1`, `ndom1`, `cop30`, `osm`, `gtfs`, `worldcover`, `wissen`, `regel` füllt der Katalog: `schema.source('dgm1', via='bezogen über easygeodata.de')`) – oder ein Objekt `{Kürzel: Text}` |
| `attribution` | die Zeile, die die App zeigt („© GDI-Th (CC BY 4.0) · © OpenStreetMap-Mitwirkende (ODbL) …“) |

**Boden:** kein `index.json`. `meta.json` trägt dasselbe: `suhl: {product: "boden", version, schema: 1, area, balanced, based_on}`,
je Stufe `tiling.levels[L].has` = Liste `[[x, y], …]` der vorhandenen Kacheln (für `t` und `i` gleich), `sources`, `attribution`.
`suhl.balanced` (wahr/falsch) sagt, ob die Bildkacheln den Farbausgleich der übrigen Welt haben.

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

Kachel: `{"schema": 1, "product": "g", "key": "10/497/542", "o": [-4752.698, 12383.984], "b": [Gebäude, …]}`; freiwillig `made`, `n`
(Zahl der Gebäude), `src` (`{Feld: Quelle}` für die ganze Kachel), `fat` (Tabelle der Fassaden-Parameter, auf die `fas.t` zeigt),
`tief` (Tiefgaragen `[{id, f, fkt, adr, fa}]` – nur Grundriss, nicht gezeichnet), `dgm`, `lod2` (0/1).

Der Datensatz ist der der Fassung 1.0; `suhl-gebaeude` schreibt ihn seit Commit 4c9e9722 (2 501 Gebäude im Probesatz). Ausgangspunkt
ist das Format, das `gebaeude/gebaeude.js` heute liest (`tools/welt-gebaeude/prep.py`). Zwei Namen weichen deshalb vom Plan 2.3 ab:
**`h` bleibt die Höhe** (die Löcher des Grundrisses heißen `fh`), **`fl` bleibt „Flachdach“** (die Merker heißen `fg`). Fassung 1.1
gibt den Feldern, die `suhl-gebaeude` vorläufig privat führte (`x_…`), ihren Platz: `fas` + `fat`, `teil`, `zv`, `lvk`, `lm`, `kat`,
Seite `hof`, Kachel `tief`. P = Pflicht, F = freiwillig.

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
| `F` | P | `[[10 Zahlen], …]` | Kachel-lokal, Höhen über dem Fuß | Wände: `[ax, ay, bx, by, Oberkante bei a, Lage der Spitze u, Oberkante an der Spitze, Oberkante bei b, Merker (1 = Nachbarwand, keine Fenster), Meter zur nächsten Straße (99 = keine)]`. **u ist ein Bruchteil 0…1 der Wandlänge** (das heutige `gebaeude.js` rechnet in Metern – die Laufzeit rechnet um). |
| `S` | F | Liste | | Seiten: ein Eintrag (Objekt oder `null`) je Zeile von `F`, gleiche Reihenfolge – **nur was eine Seite Eigenes hat**: `{st` Straßenname, `sd` Meter dorthin, `hof: 1` (Hofseite), `eg`: nichts \| laden \| arkade \| garagen \| durchfahrt \| eingang, `sign: [Namen]`, `q` Güte der Fassaden-Parameter, `src` Foto-Kennungen, und jeder Parameter, der von `fas` abweicht: `mat`, `col`, `col2`, `lv`, `h0`, `hf`, `sock`, `win`, `balk`, `gable`, `brand}` |
| `fas` | F | Objekt | | Fassaden-Parameter des ganzen Hauses (Plan 4b): `{t` Nummer in der Kachel-Tabelle `fat`, `col: [r, g, b]`, `q` Güte, `lv` (nur wenn das Haus kein `lv` hat)`}` – gemischt über `fat[t]` = `{mat` (putz, platte, klinker, schiefer, fachwerk, sandstein, sichtbeton, glas, blech, holz), `col2`, `sock`, `win: [Achsabstand, Breite, Höhe, Brüstung, Art, …]`, `balk` (keine, balkone, loggien, franzoesisch)`}`. Geschosshöhe `hf` = (`e` − `sock`) / `lv`, Erdgeschoss `h0` = `hf`, wenn nicht genannt. Eine Seite in `S` überschreibt einzelne Werte. |
| `fl` | F | 0/1 | | 1 = Flachdach (wie heute; dasselbe wie `r` = 0) |
| `lv` | F | Zahl | | Geschosse über der Erde |
| `lvk` | F | Zahl | | Geschosse laut Kataster, wenn sie nicht unter die gemessene Höhe dieses Körpers passen (`lv` ist dann geschätzt) |
| `use` | F | Wort | | Hauptnutzung: wohnen, handel, buero, gastro, hotel, schule, kita, kirche, kultur, gesundheit, verwaltung, gewerbe, industrie, lager, landwirtschaft, verkehr, garage, neben, sport, versorgung, leer, sonst |
| `eg` | F | Wort | | Nutzung des Erdgeschosses, wenn sie abweicht (Laden unter Wohnungen) |
| `fkt` | F | Text | | Funktion in den Worten des Katasters (ALKIS) |
| `era` | F | Zahl | | Baualter: 0 unbekannt, 1 vor 1918, 2 1919–1948, 3 1949–1990, 4 nach 1990 |
| `yr` | F | Zahl | Jahr | Baujahr, wenn bekannt |
| `bt` | F | Wort | | Bautyp: wbs70, zeilenbau, punkthochhaus, fachwerk, gruenderzeit, efh, reihenhaus … |
| `n` | F | Text | | Name |
| `adr` | F | Text | | Adresse „Straße Nummer“ (mehrere mit „; “) |
| `osm` | F | Text | | zugeordnetes OSM-Objekt (Überdeckung > 50 %): `way/<n>`, `relation/<n>` |
| `fg` | F | Zahl | Bits | Merker: 1 Wahrzeichen (eigenes Modell), 2 Denkmal, 4 betretbar, 8 leer stehend, 16 Abriss geplant, **32 steht nicht mehr (nicht mehr im Kataster – wird nicht gezeichnet)**, **64 nur im Kataster** (ETHOS/LoD2 kennt es nicht), 128 neu oder im Bau |
| `lm` | F | Text | | Nummer des Wahrzeichens in `docs/plans/suhl/wahrzeichen.md` (z. B. `Z10`) |
| `kat` | F | 0/1 | | Zuordnung zum Kataster, wenn sie nicht über dieselbe Kennung läuft: 1 = nach der Lage zugeordnet, 0 = nicht im Kataster |
| `teil` | F | Text | | Kennung des größeren Gebäudes, an dem ein kleiner Bauteil hängt (Treppenturm, Erker, Balkonstapel, Anbau) |
| `zv` | F | `[m, …]` | m über `z0` | Gelände über dem Fuß an jeder Ecke von `f`, dann der Löcher `fh` (am Hang steht das Haus bergseits tiefer im Boden) |
| `d` | F | Objekt | echte m², in UTM | Szenario-Zahlen (Plan 6.3): `{fa` Grundfläche, `lv` Geschosse, `gfa` Geschossfläche, `vol` m³, `rf` Dachfläche, `ro: {N, NO, O, SO, S, SW, W, NW, flach}` Dachfläche je Richtung, `ru` nutzbare Dachfläche, `res` Bewohner, `heat: {k, kwh}`, `pv` kWp heute, `q}` – auch als eigenes Produkt `d` |
| `q` | P | `{Feld: 0…3}` | Güte | Güte jedes geschätzten Felds: Schlüssel `f, h, e, z0, k, use, eg, era, yr, bt, lv, rk, rc, n, adr, S, A, d`. Was hier fehlt, gilt als 0. |
| `src` | F | `{Feld: Quelle}` | | Herkunft: ethos, lod2, alkis, osm, dop, dgm1, dom1, ndom1, cop30, foto, wissen, zensus, regel |

**Güte** (überall gleich: `rq`, `q`, `fas.q`, `S[].q`, `A[].q`): 0 = Regel oder Annahme · 1 = aus Daten abgeleitet (Luftbild, Oberflächenmodell,
OSM-Angaben) · 2 = gemessen oder amtlich (LoD2, Kataster, ein Foto, das ein Agent gelesen hat) · 3 = von Auge geprüft. So kann die App
im „Warum?“ ehrlich sagen, was gemessen und was angenommen ist.

Der Prüfer verlangt außerdem: Kennungen eindeutig; Grundriss in der richtigen Kachel und im richtigen Rahmen (kein Punkt weiter als
700 m von der Kachelmitte – sonst sind es wohl absolute Modellmeter); `rt` zeigt nur auf vorhandene Eckpunkte; `S` so lang wie `F`;
Summe der `ap` passt zur Grundfläche (Warnung); Geschosse passen zur Traufe (Warnung); `fas.t` zeigt in `fat`; `zv` hat so viele
Werte wie `f` und `fh` Ecken; unbekannte Felder sind eine Warnung (eigene Hilfsfelder beginnen mit `x_` und werden nicht geprüft).

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
| 7 | uint8 | Merker: Bits 0–1 Herkunft der Lage (0 Regel, 1 Luftbild, 2 OSM, 3 nDOM1); 4 = Höhe gemessen (nDOM1); 8 = Kronenradius gemessen; 16 = Art kartiert; 32 = vom Dach oder der Fahrbahn weggerückt; 64 = in OSM kartiert; 128 = steht in kartiertem Wald |

Python: `schema.tree_pack(liste)`, `schema.tree_unpack(bytes)`, `schema.tree_model(key, baum)`. Geprüft wird: Größe durch 8 teilbar,
jeder Baum in der Kachel (< 40 000 cm), bekannte Art, Höhe und Radius > 0.

### `gr` Grünflächen und `w` Waldbestände (Format von `suhl-gruen`)

`gr`: `{"f": [[Klasse, "<OSM-Kennung>", [Ring, …]], …]}` – Ring = `[x0, y0, x1, y1, …]` in **Dezimetern ab der Südwest-Ecke der Kachel
(UTM)**, erster Ring Umriss, weitere Löcher; spätere Flächen liegen über früheren. Klassen: 1 Wald, 2 Gebüsch, 3 Wiese, 4 Rasen, 5 Park,
6 Garten, 7 Kleingarten, 8 Friedhof, 9 Sportplatz, 10 Spielplatz, 11 Acker, 12 Obstwiese, 17 Heide, 18 Feuchtgebiet. Ein Kopf ist nicht
nötig (kein Kachel-lokaler Modell-Rahmen).

`w`: 2 400 Byte = 6 Ebenen zu 20 × 20 Zellen (20 m), ein Byte je Zelle, Zeile 0 = Südrand, Zelle 0 = Westrand: Art (0 kein Bestand,
1 Laubwald, 2 Nadelwald, 3 Mischwald, 5 Jungbestand/Schlagflur, 6 Blöße), Nadelholz-Anteil in %, Kronendeckung in %, Höhe in 0,25 m,
Dichte, Merker. Geprüft: Größe, bekannte Arten, Prozentwerte ≤ 100. Die Einheiten stehen im Index (`format`).

### `s` Straßenraum (Format von `suhl-strassen`)

`{"schema": 1, "product": "s", "key": "…", "o": […], "unit": "dm; x, y relative to o along the model axes, z = NHN - H0", "kinds": […],
"surf": […], "hws": […], "atypes": […], "names": […], "ways": [Zeile, …], "areas": [Zeile, …], "m": {…}}`

- Weg: `[kind, surf, width_dm, fl, name, ref, xyz_dm, osm_way, s0_dm, lanes, hw, maxspeed, style]` – die ersten sieben wie in
  `fahrt/strassen.json`; `kind`, `surf`, `name`, `ref`, `hw` sind Nummern in den Tabellen der Kachel; die Merker `fl` stehen im Index.
- Fläche (Platz, Parkplatz, Busbucht, Bahnsteig): `[type, surf, fl, name, osm, home, q, xyz_dm, holes]`.
- `xyz_dm` = `[x, y, z, …]` in **ganzen Dezimetern, x und y relativ zu `o`** (Kachel-lokal), z = NHN − H0.

Geprüft wird der Kopf, `unit`, die Tabellen, die Form der Zeilen und dass kein Punkt weiter als 330 m von der Kachelmitte liegt
(sonst sind es absolute Dezimeter). Die Einzelheiten (Felder, Merker, Stile) beschreibt `docs/features/suhl-strassen.md`.

### `m` Möbel der Straße (Format von `suhl-strassen`)

`{"schema": 1, "product": "m", "key": "…", "o": […], "unit": "dm; …", "lampen": […], "schilder": […], …}` – je Art eine Liste, Lagen in
**ganzen Dezimetern relativ zu `o`** (wie `s`), Richtungen in Grad. Die Zeilen beschreibt der Index (`fields`):

| Liste | Zeile |
|---|---|
| `pfosten`, `lampen` | flach: `x, y, az` bzw. `x, y, az, kind` (0 an einer Straße, 1 frei stehend) |
| `planken` | `[side, x, y, x, y, …]` |
| `schilder` | `[code, x, y, az(, text)]` |
| `masten` | `[x, y, type, az, [x, y, … der nächsten Masten]]` |
| `linien` | `[halt \| warte \| zebra, x, y, az, halbe Breite]` |
| `ampeln` | `[kind (0 Fahrzeuge, 1 Fußgänger), x, y, arms, OSM-Knoten, [Mast x, y, az, …]]` |
| `querungen` | `[type, x, y, az, …, OSM-Knoten]` |
| `halte` | `[x, y, az, Name, …]` |
| `namen` | `[x, y, Straßenname, az, Name der Querstraße, az]` |

Geprüft wird der Kopf, die Form der Listen und dass nichts weiter als 330 m von der Kachelmitte liegt. Erbeten: die Zeile `unit` wie
in `s` (Warnung, wenn sie fehlt).

### `d` Szenario-Zahlen

Je Gebäude die Zahlen für Szenarien (Flächen, Geschosse, Dachebenen mit Richtung von geografisch Nord, Solar-Potenzial, Wärmebedarf,
Bewohner- und Heizungs-Schätzung aus dem Zensus) auf denselben Kacheln wie `g`, dazu `viertel.json` (Stadtteile: Raster, Umrisse,
Summen, amtliche Zahlen, Annahmen). **Felder, Regeln, Ergebnisse und der Vertrag für `SUHL.data`: Abschnitt 13.** Das kleine Feld `d` im
Gebäude-Datensatz (`fa`, `lv`, `gfa`, `rf`) bleibt erlaubt.

### `boden`

`meta.json` im Format, das `welt/welt.js` heute liest (`format: "welt-test/1"`, `tiling.levels`, `sources`, `attribution`) mit den
Zusätzen aus Abschnitt 4 (`suhl`, `has` je Stufe). Geprüft werden die Listen gegen die Dateien (`t/` und `i/`), die ersten Bytes der
Kacheln (`WTH1`, WebP), `suhl.product/version/schema`; `suhl.balanced` und `suhl.based_on` sind erbeten (Warnung, wenn sie fehlen).

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

## 8 Veröffentlichen: eine Tür, ein Satz, ein Commit

Entschieden in der Nacht zum 13.11.2026 (Suhl-Chat). **Die Daten-Workflows veröffentlichen nicht selbst.** Gründe: GitHub Pages baut
etwa zehnmal in der Stunde und liefert höchstens 1 GB je Seite; ein Satz muss zusammenpassen (Boden auf die Straßen geschnitten,
Hausfüße auf diesem Boden abgelesen); Browser behalten `aktuell.json` zehn Minuten.

| Schritt | Wer | Was |
|---|---|---|
| 1 | jeder Daten-Workflow | lädt seinen Produkt-Ordner `…/suhl/<produkt>/v<N>` (mit Index) als **Artefakt mit festem Namen** hoch: `suhl-boden-v1`, `suhl-g-v1`, `suhl-s-v1`, `suhl-m-v1`, `suhl-b-v1`, `suhl-gr-v1`, `suhl-w-v1` – und nennt dem Suhl-Chat die Nummer des Laufs |
| 2 | Suhl-Chat → `suhl-daten` | trägt den Satz in `tools/suhl/daten/satz.json` ein: je Produkt `version` und die Herkunft – `{run, artifact}` (Artefakt eines Laufs), `{branch, commit, path}` (Ordner eines Zweigs an einem genannten Commit, etwa ein Probesatz) oder `{folder}` (Ordner dieses Zweigs); dazu `dry_run`, `remove` (auch `entfernen`) |
| 3 | Job `satz` in `.github/workflows/suhl-daten.yml` (Zweig `suhl/daten`, bestellt über `tools/suhl/daten/lauf.txt`: `lauf: satz`) | holt die Artefakte, prüft jedes Produkt mit `validate.py`, prüft `based_on` quer über den Satz und gegen das schon Veröffentlichte, legt die Ordner unter `suhl/<produkt>/v<N>/` ab, schaltet `suhl/aktuell.json` um, schreibt `ATTRIBUTION.md` – **ein Commit** mit `secrets.DATEN_TOKEN` |
| 4 | derselbe Job | wartet, bis GitHub Pages `aktuell.json` mit dem neuen Stand ausliefert |

Regeln der Tür (`.github/actions/suhl-publish/publish.py`, Tests `test_publish.py`):

- **Abgelehnt** wird ein Satz, wenn ein Produkt nicht gültig ist; wenn die Generationen nicht passen („g v1 wurde auf boden v0
  gerechnet, nach diesem Satz gilt boden v1“); wenn eine veröffentlichte Version sich ändern würde (dann die nächste Nummer nehmen;
  nur ein Probesatz darf mit `"replace": true` ersetzt werden); wenn die Seite danach über 900 MB hätte. Dann schlägt der Schritt fehl
  und nichts wird geschrieben.
- **Alte Versionen** löscht nie derselbe Satz von selbst, sondern ein späterer über die Liste `remove` (`["g/v0"]`); die gültige
  Version lässt sich nicht löschen.
- **Bericht** jeder Veröffentlichung (Protokoll, Zusammenfassung, Artefakt `suhl-satz-bericht`): Dateien neu / geändert / entfernt,
  neue MB im Repository (nach Inhalt gezählt: eine neue Version mit denselben Bildkacheln kostet nichts), Größe der Seite danach –
  Warnung über 700 MB. `.nojekyll` wird geprüft und nötigenfalls ergänzt.
- **Trockenlauf** (`"dry_run": true` in `satz.json`): alles außer dem Push; braucht kein Geheimnis.
- Fehlt das Geheimnis oder das Repo, wird nichts veröffentlicht und der Lauf sagt es klar – er schlägt deshalb nicht fehl. Der
  Schlüssel erscheint nie im Protokoll. In dieses Repo (auch `gh-pages`) schreibt die Tür nie.
- GitHub lässt in einer `concurrency`-Gruppe höchstens einen Lauf warten; weil nur noch dieser eine Job schreibt, stört das nicht.
  Ein abgelehnter Push wird trotzdem geholt, umgesetzt und wiederholt (bis zu 8 Versuche).

**So wird ein Satz bestellt** (nur auf Ansage des Suhl-Chats):

1. `tools/suhl/daten/satz.json` ändern, zum Beispiel für den Probesatz Zentrum v1:
   ```json
   {"name": "zentrum-v1", "dry_run": true,
    "products": {"boden": {"run": 123, "artifact": "suhl-boden-probe-v1", "version": 1},
                 "s": {"branch": "suhl/strassen", "commit": "1aadb6c…", "path": "tools/suhl/out/strassen/probe/suhl/s/v1", "version": 1},
                 "g": {"run": 456, "artifact": "suhl-g-v1", "version": 1}},
    "remove": []}
   ```
2. In `tools/suhl/daten/lauf.txt` eine Zeile anfügen und die letzte Zeile auf `lauf: satz` setzen, beides committen und nach
   `suhl/daten` pushen – der Job `satz` läuft.
3. Bericht lesen (Zusammenfassung des Laufs oder Artefakt `suhl-satz-bericht`). Ist der Trockenlauf sauber: `"dry_run": false`
   setzen, wieder `lauf.txt` ändern, pushen – jetzt wird geschrieben und `aktuell.json` umgeschaltet.

Geprüft am 13.11.2026:

| Lauf | Was | Ergebnis |
|---|---|---|
| 43339309234 (01:43) | Probe `suhl/_probe/hallo.json` mit `DATEN_TOKEN` | geschrieben; GitHub Pages lieferte die Datei 30 Sekunden nach dem Push aus |
| 43345327046 (02:30) | **Trockenlauf eines Satzes**: der Boden der ganzen Stadt, Artefakt `suhl-boden-v1` aus Lauf 43340569202 | geholt, geprüft (0 Fehler, 2 Warnungen: `balanced`, `based_on` fehlen), eingeordnet, Bericht gedruckt, **nichts geschrieben**. 12 560 Dateien, 264,8 MB; mit `aktuell.json` und `ATTRIBUTION.md` 12 562 neue Dateien; die Seite wüchse von 0,0 auf 264,8 MB in 12 565 Dateien; `.nojekyll` ist da. Dauer des ganzen Laufs: etwa eine Minute. |

Der Boden allein belegt also gut ein Viertel der 1 GB von GitHub Pages; zwei Generationen nebeneinander (beim Umschalten) mehr als die Hälfte.
Deshalb bekommen Gelände und Bild im Boden eigene Versionen (`suhl-boden` baut das): ein neuer Straßen-Einschnitt kostet dann 22–55 MB
statt 290.

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
| Straßen-Korridore (P4, 35 Kacheln außerhalb der Gemeinde) | nicht in der Gemeinde-Liste; der Client fragt sie mit **einer** Abfrage über den Rahmen um alle fehlenden Kacheln ab. Geprüft am echten Dienst (Lauf 43345805762): die Kacheln 618/5611 und 626/5594 kamen so (2,4 MB, 3 Abrufe), je 1000 × 1000 Zellen, keine leere Zelle. |
| Hält der Cache? | Ja: der zweite Lauf desselben Workflows (43345805762) fand alle 24 P1-Kacheln im wiederhergestellten Cache und holte nichts. |

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
| Daten-Repo `mynametouse/pavillon-daten` mit GitHub Pages | ✔ angelegt, Pages antwortet; `.nojekyll` liegt an der Wurzel |
| Geheimnis `DATEN_TOKEN` | ✔ vorhanden, schreibt (Lauf 43339309234) |
| Geheimnis `EASYGEODATA_KEY` | ✔ vorhanden, gilt (Läufe 43340656226, 43341000214, 43341830636, 43345805762); 20 GB im Monat frei, bisher etwa 35 MB verbraucht |
| LoD2 (echte Dachformen) | weiter von Hand, später |
| Platz bei GitHub Pages | nichts zu tun – zur Kenntnis: 1 GB je Seite. Der Boden der ganzen Stadt hat 265 MB (mit echtem Gelände etwa 290 MB). Solange alte und neue Generation kurz nebeneinander liegen, ist mehr als die Hälfte belegt; die Tür warnt ab 700 MB und lehnt ab 900 MB ab. |

## 11 Für den Suhl-Chat

Stand der vier Probesätze gegen Fassung 1.1 (geprüft 13.11.2026, 02:25, mit `validate.py --probe`):

| Probesatz | Stand | Ergebnis | Was der Besitzer ändert |
|---|---|---|---|
| `suhl-boden` (`origin/suhl/boden` 7acc851b) | 370 Kacheln, 7,6 MB | **gültig**, 2 Warnungen | in `meta.json` → `suhl`: `balanced` (wahr/falsch) und `based_on` (`{}` oder `{"s": N}`) ergänzen |
| `suhl-gebaeude` (4c9e9722) | 2 501 Gebäude, 2,96 MB | Datensätze in Ordnung; Kopf und Index nach alter Fassung 1.0 | Kopf der Kacheln `v` → `schema`, `p` → `product`; Index: `validate.py --index …/suhl/g/v0`; private Felder umbenennen: `x_fa` → `fas`, `x_fat` → `fat`, `x_teil` → `teil`, `x_zv` → `zv`, `x_lv` → `lvk`, `x_lm` → `lm`, `x_kat` → `kat`, `S[].x_hof` → `hof`, `x_tief` → `tief`. An einer umgeschriebenen Kopie geprüft: gültig, 7 Warnungen (5–6 Geschosse passen nicht unter Traufen von 6,8–9,8 m) |
| `suhl-strassen` (26ed5201) | `s`: 1 497 Wege, 176 Flächen; `m`: 11 Kacheln | Kacheln in Ordnung (bei `m` fehlt die Zeile `unit`: Warnung); beiden Index-Dateien fehlen `version`, `area`, `has`, `based_on` | `validate.py --index …/suhl/s/v0 --area probe --based-on boden=0` und dasselbe für `m` (der Schlüssel `v` wird `version`, `tiles` wird `has`) |
| `suhl-gruen` (182f22c0) | 9 730 Bäume, 225 Grünflächen, 536 Waldzellen | Kacheln in Ordnung; den drei Index-Dateien fehlt der gemeinsame Teil | `validate.py --index …/suhl/b/v0 --area probe`, ebenso `w`; für `gr` zusätzlich `--sources osm` |

Sonst:

- **Ein Kopf für alle:** `schema` + `product` + `key` + `o` – das kostet über die vier Probesätze am wenigsten (nur `suhl-gebaeude`
  schreibt seinen Kopf um).
- `s` und `m` sind Kachel-lokale Dezimeter (nicht absolut, wie ich zuerst annahm) – Abschnitt 2 ist berichtigt.
- Wer holt was von easygeodata: `suhl-boden` DGM1, `suhl-gruen` nDOM1, `suhl-gebaeude` DOM1 und nDOM1, `suhl-strassen` nichts.
- `suhl-laufzeit`: `aktuell.json` mit `cache: 'no-cache'` holen (Pages: `max-age=600`); Pages sendet `access-control-allow-origin: *`.
  `F[i][5]` ist ein Bruchteil der Wandlänge. Gebäude mit `fg & 32` nicht zeichnen. `z0` gilt nur, wenn `based_on.boden` zur gültigen
  Boden-Version passt.
- Veröffentlicht wird nur an einer Stelle: Job `satz` auf `suhl/daten` (Abschnitt 8). Zuerst geht der Probesatz Zentrum v1 hinaus,
  sobald der Suhl-Chat die Läufe und Artefakte nennt.
- Die Korridor-Kacheln P4 (außerhalb der Gemeinde) gehen über eine Rahmen-Abfrage; an zwei Kacheln am echten Dienst geprüft (Abschnitt 9).

**Paket S2-9 (Stand 13.11.2026, 03:25) – das Wichtigste für den Suhl-Chat:**

- Produkt `d` und `viertel.json` stehen (Abschnitt 13); Probesatz Zentrum `tools/suhl/out/daten/probe/suhl/d/v1` gültig; die ganze Stadt
  rechnet der Job `zahlen` (Artefakt `suhl-d-v1`). In einen Satz gehört `d` erst, wenn sein `g` mit hinausgeht (`based_on: {"g": 1}`).
- **Dachrichtungen:** `R[].az` von `suhl-gebaeude` ist von geografisch Nord (nachgerechnet, Abweichung in der Mitte 0,004°). Keine
  Umrechnung nötig; nur das Gebäude-Feld `az` (First) steht im Modellrahmen.
- **Dachüberstand:** Das Dach-Netz von `g` ist bei geneigten Dächern 13–24 % größer als der Grundriss. Flächen für Szenarien kommen aus
  `R[].a` (ohne Überstand). `suhl-laufzeit` sollte Solarmodule nicht nach der Netz-Fläche zählen.
- **Zensus-Gitter sind vom Chat-Rechner abrufbar** (`www.destatis.de/static/DE/zensus/gitterdaten/…`), Lizenz dl-de/by-2-0 mit
  Abrufdatum. Zwölf Themen liegen geschnitten unter `tools/suhl/out/daten/zensus/` – auch für andere Agenten (`zensus.Grid`).
- **Schwachstelle:** die Umrisse der Stadtteile in der Kernstadt (Annahme, Abweichungen −29 % bis +65 % zu den Zahlen der Stadt,
  Abschnitt 13.5). Für Falko: Gibt es von der Stadt ein Straßenverzeichnis der 17 Stadtteile oder eine Karte?
- Der Job `satz` meldet nach dem ersten echten Push, was ein Browser bekommt (Status, `access-control-allow-origin`, `cache-control`,
  `content-type`, `content-encoding`, Bytes) für `aktuell.json`, jeden Index und eine Kachel je Produkt. An `_probe/hallo.json` geprüft:
  200, `*`, `max-age=600`, `application/json`, gzip, 332 von 464 Byte.

## 12 Änderungen am Schema

| Fassung | Datum | Was |
|---|---|---|
| 1.0 | 13.11.2026, 01:50 | erste Fassung: `g` (Gebäude), `b` (Bäume, Format von `suhl-gruen`), `m`, `s`, `d`, `index.json`, `aktuell.json`; Kopf `v`, `p` |
| 1.1 | 13.11.2026, 02:25 | **Kopf einheitlich `schema`, `product`, `key`, `o`** (statt `v`, `p`). Index: `has` (statt `tiles`), `based_on` Pflicht, `sources` auch als Objekt. `g`: Datensatz wie 1.0, dazu `fas` + Kachel-Tabelle `fat`, `teil`, `zv`, `lvk`, `lm`, `kat`, `S[].hof`, `S[].eg`/`sign`, Kachel `tief`, `n`, `src`; `fg` 32 = steht nicht mehr, 64 = nur im Kataster, 128 = neu. `s` und `m` im Format von `suhl-strassen` (Kachel-lokale Dezimeter). Neu: `gr`, `w` (`suhl-gruen`). Boden: `meta.json` mit `has`-Listen ist sein Index; `suhl.balanced`, `suhl.based_on`. |
| 1.2 | 13.11.2026, 03:25 | **Produkt `d` neu gefasst (Paket S2-9)**: Kachel mit Kopf `o`, Datensatz je Gebäude mit `vt`, `m`, `use`, `era`, `k`, `bt`, `fa`, `lv`, `gfa`, `dg`, `h`, `e`, `vol`, `rf`, `R` (Zeilen aus 8 Zahlen), `ru`, `pv`, `pe`, `res`, `heat {k, p, d}`, `fg`, `q`; neu `viertel.json` (Pflicht im Ordner von `d`). Quelle `zensus` im Katalog (dl-de/by-2-0). `suhllib` 0.3.0: EPSG:3035 (`laea_from_utm`, `census_cell`). Alle anderen Produkte unverändert – ein Index mit `rev: "1.1"` bleibt gültig. |

Regel: Die Schema-Nummer bleibt 1, solange nur Probesätze (`v0`) existieren und nichts veröffentlicht ist; die Fassung zählt hoch. Ab
der ersten Veröffentlichung gilt: ein neues freiwilliges Feld erhöht die Fassung, die Schema-Nummer steigt nur, wenn ein Leser
umgebaut werden muss; `aktuell.json` nennt sie je Produkt.

## 13 Szenario-Zahlen (Paket S2-9): Produkt `d`, `viertel.json`, Vertrag für `SUHL.data`

Stand 13.11.2026, 03:25. Werkzeuge in `tools/suhl/daten/`: `zahlen.py` (rechnet), `viertel.py` + `viertel_saat.json` (Stadtteile),
`zensus.py` (Zensus-Gitter), Tests `test_zahlen.py`, `test_zensus.py` (18 Tests, ohne Netz). Probesatz Zentrum:
`tools/suhl/out/daten/probe/suhl/d/v1/` (11 Kacheln, 2 479 Gebäude, 0,74 MB + `viertel.json` 102 kB, gültig mit `--probe`).
Die ganze Stadt rechnet der Job `zahlen` in `suhl-daten.yml` (Auftrag `tools/suhl/daten/zahlen.json`) und lädt den Ordner als
Artefakt `suhl-d-v<N>` hoch – hinaus geht er wie alles durch die eine Tür (Abschnitt 8).

```
python3 -I tools/suhl/daten/zahlen.py --g <…/suhl/g/v1> --out <wurzel>/suhl/d/v1 --area stadt --zensus tools/suhl/out/daten/zensus --report bericht.json
python3 -I tools/suhl/daten/zensus.py --fetch --raw ~/suhl-raw/zensus --out tools/suhl/out/daten/zensus      # Zensus-Gitter holen und schneiden
python3 -I tools/suhl/daten/viertel.py                                                                        # die Stadtteile ansehen
```

**Grundsätze (so prüft es der Prüfer, so steht es in jeder Datei):**

- **Flächen sind echte Quadratmeter**, in UTM (EPSG:25832) aus den Modellkoordinaten von `g` gerechnet (1 Modellmeter = 1,0157 m);
  Höhen echte Meter. Dachflächen **ohne Dachüberstand**: Das Dach-Netz von `g` trägt einen gezeichneten Überstand (seine Grundfläche ist
  bei geneigten Dächern 13–24 % größer als der Grundriss); gerechnet wird mit den Flächen `R[].a`/`ap` von `g`, deren Grundflächen sich
  auf ±0,3 % zum Grundriss summieren.
- **Richtungen sind Grad von geografisch Nord** (180 = die Fläche schaut nach Süden): hier aus dem Dach-Netz gerechnet (Fallrichtung im
  UTM-Gitter + Meridiankonvergenz am Gebäude, bei Suhl +1,31°). Geprüft gegen `g`: Dessen `R[].az` ist ebenfalls von geografisch Nord
  (Abweichung in der Mitte 0,004°, 5 %/95 %: −0,11°/+0,12° über 24 732 geneigte Flächen). Nur das Gebäude-Feld `az` (Firstrichtung) von
  `g` steht im Modellrahmen (3,05° daneben).
- **Was nicht gemessen ist, ist eine Schätzung nach einer genannten Regel** und trägt seine Güte in `q` (0 Regel/Annahme, 1 aus Daten
  abgeleitet, 2 gemessen/amtlich, 3 geprüft). Alle Regeln mit ihren Zahlen stehen in `viertel.json` → `meta.annahmen` und `meta.regeln`
  (für das „Warum?“ der App).
- **Zensus:** Zahlen je Gebäude sind **Modell-Schätzungen** aus den Werten der 100-m-Zellen. Was eine Zelle nicht zeigt, bleibt
  unbekannt – nichts wird aus Summen oder Nachbarn zurückgerechnet. Nichts über Personen, Eigentümer oder Flurstücke.

### 13.1 Kachel `d/v<N>/10/<x>/<y>.json`

`{"schema": 1, "product": "d", "key": "10/497/542", "o": [x, y], "made": …, "n": 325, "d": {"<Gebäude-Kennung>": {…}}}` – dieselben
Kacheln und Kennungen wie `g` (`based_on: {"g": N}` im Index), ohne Gebäude mit `fg & 32` (stehen nicht mehr). 280 Byte je Gebäude.

| Feld | P/F | Einheit | Bedeutung |
|---|---|---|---|
| `vt` | P | Nummer | Stadtteil: `nr` aus `viertel.json` (1…17), 0 = außerhalb der Gemeinde |
| `m` | P | Kachel-lokal, m | Mitte des Grundrisses `[x, y]` im Rahmen von `g` (Modellmeter relativ zu `o`) |
| `use`, `era`, `k`, `bt` | P (`bt` F) | wie `g` | Nutzung, Baualter (0 unbekannt … 4 ab 1991; Güte `q.era`), Art, Haustyp |
| `fa` | P | m² | Grundfläche (ohne Innenhöfe) |
| `lv` | P | – | Geschosse über Gelände: Kataster (`q.lv` 2), von `g` geschätzt (1) oder Regel Traufhöhe / 2,9 m (0) |
| `gfa` | P | m² | Geschossfläche = `fa` × `lv` (brutto, ohne Keller und Dachgeschoss) |
| `dg` | F | m² | Dachgeschoss nach Regel (geneigtes Dach ab 2,5 m über der Traufe: 60 % der Grundfläche); nicht in `gfa` |
| `h`, `e` | P | m | Höhe und Traufhöhe über dem Fuß, wie `g` |
| `vol` | P | m³ | Raum zwischen Fußebene und Dach (`q.vol` 0, wo das Dach-Netz den Grundriss nicht deckt: Regel) |
| `rf` | P | m² | Dachfläche (geneigt gemessen, ohne Überstand) = Summe der Flächen in `R` |
| `R` | P | Liste | **Dachebenen in der Reihenfolge von `g.R`** (gleiche Nummern): `[a, ap, az, sl, c, us, kwp, ir]` = Fläche m², Grundfläche m², Richtung in Grad von geografisch Nord (`null` = flach, unter 10°), Neigung °, Deckung (Klasse von `g`), belegbare Fläche m² (Regel), deren Leistung kWp, Einstrahlung in % der besten Fläche |
| `ru`, `pv`, `pe` | F | m², kWp, kWh/Jahr | belegbare Fläche, **Solar-Potenzial** und Jahresertrag auf den geeigneten Ebenen (`ir` ≥ 75). Was heute auf dem Dach liegt, ist nicht bekannt. |
| `res` | F | Personen | Bewohner – **Modell-Schätzung** (13.4); fehlt, wo der Zensus für die Zelle nichts zeigt |
| `heat` | F | `{k, p, d}` | `k` wahrscheinlicher Energieträger der Heizung (nur Wohngebäude; der häufigste seiner Zensus-Zelle: `fern`, `gas`, `oel`, `holz`, `bio`, `wp`, `strom`, `kohle`, `kein`), `p` dessen Anteil in der Zelle (`q.heat` 1 ab 0,6), `d` Wärmebedarf in kWh/Jahr – immer nach Regel |
| `fg` | F | Bits | Merker von `g` (2 Denkmal, 8 Leerstand, 16 Abriss geplant, 64 nur im Kataster, 128 neu) |
| `q` | P | `{Feld: 0…3}` | Güte von `lv`, `rf` (Dachebenen: wie `rq` von `g`), `pv`, `era`, `vol`, `res`, `heat` |

### 13.2 `d/v<N>/viertel.json` (115 kB für die ganze Stadt)

| Schlüssel | Inhalt |
|---|---|
| `schema`, `product`, `version`, `made`, `area` | Kopf; `partial: true` heißt: nur ein Teil der Stadt (Probesatz) – dann gilt `complete` je Eintrag |
| `raster` | die **eine Festlegung der Stadtteile**: `{level: 12, cell: 100, x0, y0, w, h, e0, n0, data}` – ein Byte je 100-m-Zelle (= Kachel der Stufe 12), Zeile 0 im Süden, Spalte 0 im Westen, Wert = `nr` des Stadtteils, 0 = außerhalb der Gemeinde; `data` ist Base64. Nachschlagen: `spalte = floor((E − e0) / 100)`, `zeile = floor((N − n0) / 100)`, `nr = data[zeile · w + spalte]` |
| `viertel[]` | die 17 Stadtteile: `nr`, `id` (`mitte`, `nord`, `lautenberg`, `aue`, `friedberg`, `doellberg`, `ilmenauer`, `goldlauter`, `neundorf`, `heinrichs`, `maebendorf`, `albrechts`, `dietzhausen`, `wichtshausen`, `vesser`, `schmiedefeld`, `gehlberg`), `name`, `kind` (`viertel` \| `ortsteil`), `area` km², `center` `[E, N]`, `r` m, `poly` (Umriss-Ringe in UTM, aus dem Raster nachgezogen und geglättet), `outline: {q, src, how}`, `tiles` (Kacheln der Stufe 10 mit Gebäuden des Stadtteils, `"x/y"`), `official: {residents, year, date, src}`, dazu die Summen |
| `gebiete[]` | dieselben Summen für `zentrum`, `kernstadt`, `stadt` |
| Summen je Eintrag | `buildings`, `byUse: {Nutzung: [Zahl, Grundfläche, Geschossfläche]}`, `byEra: {"0"…"4": [Zahl ohne Nebengebäude und Garagen, Geschossfläche]}`, `footprint`, `floorArea`, `floorAreaHousing`, `attic`, `volume`, `roofArea`, `roofBy: {flach, N, NO, O, SO, S, SW, W, NW}`, `roofUsable`, `pvKwp` (Potenzial), `pvKwh`, `pvKwpToday: null` (nicht bekannt), `heatDemand`, `listed`, `vacant`, `quality`, `complete` |
| `residents` | `{model, q, buildings, unassigned, how}` – Summe der Schätzungen der Gebäude (+ Einwohner von Zellen ohne passendes Gebäude) |
| `census` | Zensus 2022 der Zellen, deren Mitte im Stadtteil liegt: `residents`, `cells`, `age: {u18, 18_29, 30_49, 50_64, 65plus, shown, share65, shareU18}`, `households: {1 … 6plus, n, share1}`, `housingBuildings`, `heatBy` (Gebäude mit Wohnraum nach Energieträger), `heatType`, `buildingTypes`, `dwellings`, `vacantShown`, `vacancyMin`, `ownerShown`, `ownerRateMin`, `livingArea`, `livingAreaPerResident` |
| `meta` | `stand`, `g` (Version der Gebäude), `annahmen: [{id, text}]`, `regeln` (die Zahlen), `einstrahlung` (Tabelle), `felder`, `zensus` (Quelle, Lizenz, Abrufdatum), `hinweise` |

`vacancyMin` und `ownerRateMin` sind **Untergrenzen**: leere bzw. vom Eigentümer bewohnte Wohnungen der Zellen mit Angabe, geteilt durch
alle Wohnungen – Zellen ohne Angabe (unter 3 Fälle) fehlen im Zähler.

### 13.3 Vertrag für `SUHL.data` (Plan 6.3) – woraus die Laufzeit jeden Aufruf bedient

Weg: `aktuell.json` → `products.d.version` → `d/v<N>/viertel.json` (einmal laden, 115 kB) und die Kacheln `d/v<N>/10/<x>/<y>.json` bei Bedarf.

| Aufruf | Quelle |
|---|---|
| `SUHL.data.building(id)` | Eintrag der `d`-Kachel: `quarter` = `viertel[vt − 1].id`, `use`, `era`, `levels` = `lv`, `footprint` = `fa`, `floorArea` = `gfa`, `height` = `h`, `volume` = `vol`, `roof[i]` = `{area: R[i][0], areaPlan: R[i][1], az: R[i][2], slope: R[i][3], cls: R[i][4], usable: R[i][5], pvKwpPotential: R[i][6], irradiation: R[i][7], pvKwp: null}`, `roofFlat` = Summe der Flächen mit `az == null`, `residents` = `res`, `heat` = `{kind: heat.k, share: heat.p, demand: heat.d}`, `listed` = `fg & 2`, `vacant` = `fg & 8`, `q`, `src` (Quellen aus `index.json`). **`pvKwp` („heute vorhanden“) ist `null`** – das Register nennt Anlagen unter 30 kW ohne Adresse. |
| `SUHL.data.roofPlanes(id)` | aus `g`: Ebene `i` = die Dreiecke `R[i].ti` über `rv`/`rt` – dieselben Nummern wie `roof[i]`. Achtung Überstand: Wer Module auf die Polygone des Netzes legt, zählt 13–24 % zu viel; maßgeblich ist `usable`. |
| `SUHL.data.quarter(id)` | Eintrag aus `viertel.json` (`viertel[]` oder `gebiete[]`): `area`, `buildings`, `byUse`, `byEra`, `floorArea`, `roofArea`, `roofUsable`, `pvKwpToday` (null), `residents.model`, `official`, dazu `census` |
| `SUHL.data.each(area, fn)` | Kacheln aus `viertel[].tiles` laden, Einträge mit passendem `vt` durchlaufen (keine Geometrie nötig; Lage aus `m`) |
| `SUHL.data.meta` | `viertel.json` → `meta` + `sources`/`attribution` aus `index.json` |
| `SUHL.areaAt(x, y)`, `SUHL.quarters()` | Modell → UTM, dann das `raster`; Umrisse zum Zeichnen: `poly` |

### 13.4 Zensus 2022 (Gitter 100 m)

Quelle: Statistische Ämter des Bundes und der Länder, Zensus 2022, Stichtag 15.05.2022, Gitter in EPSG:3035; **Datenlizenz Deutschland –
Namensnennung – Version 2.0**, zu nennen mit Abrufdatum (steht in jeder Datei und im Index). Werte sind zur Geheimhaltung leicht
verändert; Zahlen unter 3 werden nicht gezeigt. Die Dateien nennt die amtliche Download-Seite
(`destatis.de/…/Zensus2022/_inhalt.html`, 51 Gitter-Dateien unter `www.destatis.de/static/DE/zensus/gitterdaten/`); **dieser Host
antwortet auch vom Chat-Rechner** (anders als `static.destatis.de`, das die Bestandsaufnahme nannte). `zensus.py --fetch` holt zwölf
Themen (je 15–37 MB, bleiben außerhalb von git) und behält die Zellen, die die Gemeinde berühren: `tools/suhl/out/daten/zensus/<thema>.json`
(zusammen 1,3 MB; `abruf.json` nennt Datei, Zeilen, Zellen).

| Thema | Datei | Zellen | Verwendung |
|---|---|---|---|
| `einwohner` | Zensus2022_Bevoelkerungszahl | 1 346 | **je Gebäude verteilt** (`res`), Summe je Stadtteil |
| `alter`, `alter10` | Alter_in_5_Altersklassen, Alter_in_10er-Jahresgruppen | 1 346 | nur je Stadtteil |
| `haushalte` | Zensus2022_Groesse_des_privaten_Haushalts_in_Gitterzellen | 1 161 | nur je Stadtteil |
| `energietraeger` | Gebaeude_mit_Wohnraum_nach_Energietraeger_der_Heizung | 1 126 | je Stadtteil gezählt; je Gebäude der häufigste der Zelle als Schätzung (`heat.k`) |
| `heizungsart`, `gebaeudetyp` | Gebaeude_mit_Wohnraum_nach_ueberwiegender_Heizungsart, …_nach_Gebaeudetyp_Groesse | 1 126 | nur je Stadtteil |
| `wohnungen`, `leerstand`, `eigentum`, `wohnflaeche` | Wohnungen_nach_Gebaeudetyp_Groesse, Leerstandsquote_…, Eigentuemerquote_…, Durchschnittliche_Wohnflaeche_je_Bewohner_… | 1 149–1 209 | nur je Stadtteil (Leerstand und Eigentum als Untergrenze) |
| `baujahr` | Gebaeude_nach_Baujahr_in_Mikrozensus_Klassen | 1 126 | bei `suhl-gebaeude` (Baualter `era`) |

**Bewohner je Gebäude:** Die Einwohner jeder Zelle werden auf die Wohngebäude verteilt, die in die Zelle hineinreichen – nach
Wohn-Geschossfläche (`gfa` + `dg`, ein Ladengeschoss abgezogen, Nebengebäude und leer gemeldete Häuser 0) mal Anteil des Grundrisses in
der Zelle. So zählt ein langer Block mit jedem Eingang in seiner Zelle. Güte `q.res` 1; steht in der Zelle kein Wohngebäude, nehmen
andere Häuser die Einwohner auf (`q.res` 0: Heim, Unterkunft, anders benanntes Haus); gibt es gar keines, bleiben sie beim Stadtteil
(`unassigned`). Ergebnis für die Stadt: 35 199 der 35 234 Einwohner liegen auf 11 403 Gebäuden, 27 in 6 Zellen ohne Gebäude.

**Nie:** einen Wert, den eine Zelle nicht zeigt, aus „Insgesamt minus die anderen“ oder aus Nachbarzellen bilden; Alter, Haushalte,
Eigentum oder Leerstand einem einzelnen Gebäude zuschreiben.

### 13.5 Stadtteile: woher die Umrisse kommen – und wie gut sie sind

Die Stadt führt 17 statistische Stadtteile (`docs/plans/suhl/stadt.md`), **Grenzen gibt es nicht als Geodaten**. `viertel.py` legt
deshalb fest: Jede 100-m-Zelle der Gemeinde gehört zu Gehlberg oder Schmiedefeld, wenn ihre Mitte in deren Grenze aus OpenStreetMap
liegt (`outline.q` 2), sonst zum Stadtteil des **nächsten Saatpunkts** aus `viertel_saat.json` (`outline.q` 0 – eine **Annahme**).
Saatpunkte: Ortspunkte aus OpenStreetMap und Schwerpunkte der Gebäude an Straßen, die dem Namen nach zum Stadtteil gehören. Das Raster
(206 × 146 Zellen, 141,67 km²) ist die eine Festlegung für Gebäude, Zensus-Zellen und Laufzeit.

Probe: Einwohner des Zensus in diesen Umrissen gegen die Zahlen der Stadt (Melderegister 31.12.2022; es liegt in der Summe 4,8 % über dem
Zensus vom 15.5.2022, die Reihen sind nicht dieselbe Zählung):

| Nr. | Stadtteil | Umriss | km² | Gebäude | Geschossfläche ha | davon Wohnen ha | Einwohner Stadt 2022 | Zensus 2022 im Umriss | Abweichung | Modell (Summe der Gebäude) | 65 und älter | Leerstand mindestens | Gas / Öl / Fernwärme (Gebäude mit Wohnraum) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Suhl-Mitte | Annahme | 2,35 | 2 751 | 90,6 | 52,4 | 5 943 | 5 496 | −8 % | 5 564 | 35 % | 7,4 % | 641 / 28 / 168 |
| 02 | Suhl-Nord | Annahme | 7,84 | 2 590 | 59,9 | 25,0 | 3 375 | 2 933 | −13 % | 2 988 | 26 % | 19,4 % | 269 / 18 / 113 |
| 03 | Suhl-Lautenberg | Annahme | 5,94 | 4 443 | 39,6 | 29,3 | 3 988 | 3 529 | −12 % | 3 556 | 35 % | 1,3 % | 835 / 124 / 57 |
| 04 | Suhl-Aue | Annahme | 3,57 | 1 759 | 43,0 | 24,6 | 3 179 | 3 934 | +24 % | 3 812 | 42 % | 7,5 % | 201 / 23 / 161 |
| 05 | Suhl-Friedberg | Annahme | 5,18 | 1 950 | 48,0 | 11,2 | 2 609 | 1 863 | −29 % | 1 851 | 16 % | 12,9 % | 101 / 82 / 9 |
| 06 | Suhl-Döllberg | Annahme | 2,18 | 1 366 | 31,2 | 17,1 | 2 346 | 2 863 | +22 % | 2 489 | 43 % | 7,9 % | 394 / 13 / 64 |
| 07 | Suhl-Ilmenauer Straße | Annahme | 2,70 | 852 | 42,0 | 33,7 | 5 503 | 4 406 | −20 % | 4 870 | 38 % | 11,9 % | 154 / 3 / 231 |
| 08 | Goldlauter-Heidersbach | Annahme | 21,07 | 3 548 | 36,1 | 22,0 | 2 403 | 2 439 | +1 % | 2 436 | 34 % | 5,5 % | 493 / 128 / 44 |
| 09 | Neundorf | Annahme | 5,47 | 1 735 | 19,8 | 11,4 | 770 | 1 274 | +65 % | 1 219 | 33 % | 5,6 % | 331 / 24 / 18 |
| 10 | Heinrichs | Annahme | 9,09 | 2 021 | 28,9 | 10,3 | 1 288 | 1 074 | −17 % | 1 024 | 30 % | 9,9 % | 301 / 22 / 19 |
| 11 | Mäbendorf | Annahme | 5,64 | 1 186 | 17,5 | 6,2 | 591 | 608 | +3 % | 607 | 28 % | 1,0 % | 107 / 37 / 16 |
| 12 | Albrechts | Annahme | 9,37 | 1 470 | 20,0 | 10,2 | 1 217 | 1 135 | −7 % | 1 132 | 28 % | 6,1 % | 229 / 94 / 21 |
| 13 | Dietzhausen | Annahme | 6,73 | 1 498 | 14,8 | 10,0 | 1 032 | 1 038 | +1 % | 1 038 | 26 % | 2,4 % | 178 / 109 / 3 |
| 14 | Wichtshausen | Annahme | 5,41 | 831 | 9,8 | 5,1 | 486 | 434 | −11 % | 433 | 38 % | 2,1 % | 62 / 59 / 0 |
| 15 | Vesser | Annahme | 10,24 | 306 | 3,3 | 2,0 | 165 | 143 | −13 % | 143 | 31 % | 9,5 % | 20 / 40 / 0 |
| 16 | Schmiedefeld am Rennsteig | OSM | 18,27 | 2 141 | 21,7 | 12,3 | 1 641 | 1 600 | −2 % | 1 600 | 32 % | 8,0 % | 454 / 19 / 9 |
| 17 | Gehlberg | OSM | 20,62 | 990 | 8,3 | 3,7 | 463 | 465 | +0 % | 465 | 39 % | 9,9 % | 157 / 3 / 0 |
|  | **Zentrum (Pilotquartier)** |  | 0,68 | 1 019 | 55,3 | 29,4 |  | 2 749 |  | 2 854 | 37 % | 9,4 % | 224 / 3 / 101 |
|  | **Kernstadt** |  | 22,04 | 23 653 | 437,8 | 243,1 |  | 30 390 |  | 30 384 | 35 % | 9,0 % | 3 822 / 502 / 900 |
|  | **Stadt Suhl** |  | 141,81 | 31 437 | 534,6 | 286,8 | 36 999 | 35 228 |  | 35 220 | 34 % | 8,6 % | 4 927 / 826 / 933 |

Lesart: Wo ein Dorf für sich liegt oder eine echte Grenze hat, stimmen die Umrisse (Goldlauter, Mäbendorf, Dietzhausen, Schmiedefeld,
Gehlberg: innerhalb von 3 %). **In der Kernstadt reichen die angenommenen Umrisse noch nicht für Aussagen je Stadtteil** (Aue +24 %,
Döllberg +22 %, Neundorf +65 % zu viel; Ilmenauer Straße −20 %, Friedberg −29 % zu wenig – dort zählt das Register die Erstaufnahme mit).
Die Saatpunkte sind bewusst nicht an die Zahlen angepasst worden. Abhilfe: ein Straßenverzeichnis der 17 Stadtteile oder eine Karte der
Stadt ersetzt `viertel_saat.json`; Raster, Summen und Kacheln entstehen dann neu, das Format bleibt.

### 13.6 Die Regeln und ihre Zahlen (`zahlen.py` → `RULES`, in `viertel.json` → `meta.regeln`)

| Regel | Wert |
|---|---|
| Flach heißt eine Dachebene | unter 10° Neigung |
| Geschosse ohne Kataster-Angabe | Traufhöhe / 2,9 m, mindestens 1; Nebengebäude und Garagen 1 |
| Dachgeschoss | geneigtes Dach ab 2,5 m über der Traufe: 60 % der Grundfläche (Feld `dg`) |
| Belegbare Dachfläche | 70 % einer geneigten Ebene, 45 % eines Flachdachs; unter 10 m² zählt nichts; nichts auf Glasdächern, Gartenlauben, Behältern, Türmen |
| Solar-Leistung | 0,20 kWp je m² belegbarer Fläche; „geeignet“ ab 75 % der besten Einstrahlung (Tabelle `meta.einstrahlung`: Süd 30–40° = 100, flach 87, Ost/West 30° 84, Nord 30° 61); Ertrag 950 kWh je kWp und Jahr auf der besten Fläche |
| Solar – nicht berücksichtigt | Schatten von Bäumen, Nachbarn und Talhängen, Statik, Denkmalschutz (`fg & 2` nennt die Denkmale), vorhandene Anlagen |
| Wärmebedarf | 80 % von (Geschossfläche + Dachgeschoss) × Kennwert in kWh/m² und Jahr: Wohnen nach Baualter 150 (unbekannt) / 165 (bis 1918) / 170 (1919–1948) / 140 (1949–1990) / 90 (ab 1991), Plattenbau 1949–1990: 110; Hotel 150, Gastronomie 200, Handel/Büro/Verwaltung/Schule 110, Kita 130, Gesundheit 180, Kultur 100, Sport 120, Gewerbe/Industrie 90, Verkehr 50, Kirche 50, Lager 40; Nebengebäude, Garagen, Versorgung, Landwirtschaft, Unbekanntes 0 |

Alle Werte sind **eigene Annahmen in der Größenordnung üblicher Kennwerte**, keine Messwerte und keinem Gutachten entnommen; sie stehen an
einer Stelle und lassen sich tauschen.

### 13.7 Ergebnisse und Prüfungen (ganze Stadt, `tools/suhl/out/daten/zahlen_stadt.json`, `viertel_stadt.json`)

Gerechnet aus dem Artefakt `suhl-g-v1` des Laufs 43345898563 von `suhl-gebaeude` (397 Kacheln, 31 708 Datensätze), 9 Sekunden:

| Größe | Wert | Güte, Anmerkung |
|---|---|---|
| Gebäude (Baukörper) | 31 437 | 271 nicht mehr stehende (`fg` 32) ausgelassen |
| Grundfläche | 249,8 ha | gemessen (Kataster/LoD2) |
| Geschossfläche | 534,6 ha, davon Wohnen 286,8 ha | Geschosse: 23 239 aus dem Kataster, 524 von `g` geschätzt, 7 674 nach Regel |
| Volumen | 20,0 Mio. m³ | aus Traufe und Dach-Netz |
| Dachfläche | 277,5 ha, davon flach 133,9 ha; N 18,6 · NO 16,9 · O 16,0 · SO 20,3 · S 18,7 · SW 16,5 · W 16,0 · NW 20,7 ha | Dächer: 15 991 aus Daten (Oberflächenmodell, OSM, Luftbild), 15 446 nach Regel |
| Solar-Potenzial | 224,7 MWp auf 112,4 ha, 189 GWh/Jahr | Regel, ohne Verschattung – eine Obergrenze |
| Wärmebedarf | 494 GWh/Jahr | Regel; zum Vergleich: die Stadtwerke gaben 2025 78,7 GWh Fernwärme ab |
| Einwohner (Zensus-Zellen) | 35 234 in 1 346 Zellen; auf Gebäuden 35 199 | Stadt nennt 36 999 (Melderegister 31.12.2022), Land 34 685 (31.12.2024) |
| Haushalte (Zensus-Zellen) | 18 732, davon 46 % mit einer Person | amtlich 18 968 und 47,25 % – die Zellen unter 3 fehlen |
| 65 und älter | 34,1 % | Stadt: 31,27 % sind 66 oder älter (2022) |
| Wohnungen, Leerstand | 21 792; mindestens 8,6 % leer (Suhl-Nord mindestens 19,4 %) | Zensus 2011: 8 % |
| Gebäude mit Wohnraum nach Energieträger | Gas 4 927 · Fernwärme 933 · Heizöl 826 · Holz 272 · Wärmepumpe/Solar 161 · Strom 152 · Kohle 93 · ohne 111 | von 8 179; der Wärmeplan nennt „über 1 000 Ölheizungen“ |
| Wohnfläche laut Zensus / Wohn-Geschossfläche des Modells | 168 ha / 287 ha = 0,58 | üblich wären 0,6–0,75 bei 9 % Leerstand: die Geschossfläche des Modells liegt wohl 10–20 % zu hoch (jeder Baukörper zählt mit allen Geschossen) |

Prüfungen im Lauf: Dachrichtungen und Neigungen gegen `g` (oben), Grundflächen der Dachebenen gegen den Grundriss (5 %/95 %: 0,997/1,003),
wahre Fläche × cos(Neigung) gegen Grundfläche (0,998/1,002), Wächter (Mitte von Suhl im Rahmen, plausible Gebäudezahl), der Prüfer des
Vertrags (0 Fehler, 0 Warnungen). Der Prüfer hat dabei einen eigenen Fehler gefunden und behoben: Schwerpunkte mit UTM-Zahlen ohne
lokalen Bezug gerechnet lagen bei schmalen Grundrissen hunderte Meter daneben.

### 13.8 Die fünf Szenario-Themen (`docs/plans/suhl/planungen.md`): was jetzt beantwortbar ist, was fehlt

| Thema | Jetzt da | Fehlt |
|---|---|---|
| 1 Suhl-Nord | je Gebäude Nutzung, Typ (Platte/Block), Geschossfläche, Dach, Bewohner-Schätzung; Stadtteil: mindestens 19,4 % Leerstand, 26 % über 64, 113 Gebäude an Fernwärme | Umriss des Stadtteils ist eine Annahme; die Blöcke mit Abriss-Stand (LEG 2022) sind nicht mit Kennungen verknüpft (`fg` 16 setzt bisher niemand) |
| 2 Schrumpfen und Altern | je Stadtteil Einwohner, Altersklassen, Haushaltsgrößen (Zensus 2022), dazu die Zahlen der Stadt; je Gebäude Bewohner-Schätzung – ein Szenario „−28 % bis 2042“ kann je Gebäude oder Stadtteil rechnen | Vorausberechnung gibt es nur für die ganze Stadt; Umrisse der Kernstadt-Stadtteile |
| 3 Innenstadt, Herrenteich | Zentrum vollständig im Probesatz: 1 019 Gebäude, 55,3 ha Geschossfläche, 2 854 Bewohner (Modell), 61 % Ein-Personen-Haushalte, 37 % über 64, mindestens 9,4 % Leerstand | Flächen des Wettbewerbs (Park) als Geometrie; Verkaufsflächen der Einkaufszentren |
| 4 Wärmewende | je Stadtteil Gebäude nach Energieträger und Heizungsart; je Gebäude Wärmebedarf (Regel) und wahrscheinlicher Energieträger mit Anteil | Karte des Wärmeplan-Entwurfs (Gebietstypen), Fernwärme-Netz; Ölheizungen sind je Gebäude nur eine Zellen-Schätzung |
| 5 Friedberg | Gebäude, Flächen, Dächer des Stadtteils; Zensus 1 863 Einwohner im Umriss gegen 2 609 im Register (mit Erstaufnahme) | welche Baukörper zur Erstaufnahme gehören (Kennungen), Umriss |

### 13.9 Offen

- **Stadtteilgrenzen der Kernstadt** (13.5) – der größte Mangel.
- Der Job `zahlen` rechnet die Stadt aus dem Artefakt eines Laufs von `suhl-gebaeude`; ein neuer Stand von `g` braucht einen neuen
  Lauf (`zahlen.json` ändern, `lauf: zahlen`). `d` wird mit `based_on: {"g": N}` veröffentlicht; der Veröffentlicher lehnt einen Satz
  ab, dessen `d` auf einem anderen `g` steht.
- Das Feld `d` im Gebäude-Datensatz von `g` (`fa`, `lv`, `gfa`, `rf`) bleibt erlaubt; maßgeblich für Szenarien ist das Produkt `d`.
- Geschossfläche: Baukörper eines Hauses (Anbau, Veranda) zählen einzeln mit ihren Geschossen – daher die Abweichung zur Wohnfläche.
- Wünsche des Was-wäre-wenn-Chats (Plan 6.3: Stellplätze, Baujahr genauer, Fernwärme-Anschluss) sind nicht enthalten.
