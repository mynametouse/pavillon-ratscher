# Komprimierte Texturen (KTX2/Basis) – feat/texturen, 23.10.2026

Umbau Phase 2, Baustein 4 (`docs/plans/plan_phase2.md`). Die Texturen gibt es jetzt zusätzlich als **KTX2 mit Basis Universal**
(`gh-pages/tex2/`): die 93 PBR-Bilder (`tex/<name>_col|nrm|orm`, 31 Materialien) und die 270 Bilder in den glTF-Modellen
(`models/`, `chars/`, `grass/`). Die Seite lädt sie mit three `KTX2Loader`: ein Worker wandelt jede Datei in das Format, das die
Grafik direkt liest, mit allen Mip-Stufen aus dem Kodierer – kein Entpacken von JPEG/WebP und keine Mipmaps auf dem Hauptthread,
ein Viertel (ETC2/BC1: ein Achtel) des Grafikspeichers. Noch Bilder sind: Bäume (`tree/`), Himmel, Luftbilder, Bodendetails (`DETAIL`).

**Wo es an ist:** in der Vorschau (`/vorschau/`) und auf den Testservern (`localhost`); auf der Live-Seite nur mit `?tex2=1`, bis Falko
die Vorschau am iPhone und am Laptop angesehen hat. Für alle einschalten: in `viz3/src/core/assets.js` `const TEX2_LIVE = false;` auf
`true`. `?tex2=0` schaltet es überall ab (die Bilder wie bisher), `?tex2=1` überall an. Rechner ohne Grafikkarte: `TEX2_SOFT` (unten).
`TEX2_MODELS = false` nimmt die Modellbilder als KTX2 nur noch auf Telefonen und Tablets – auf Rechnern dann ~50 MB weniger beim ersten
Laden (die Modelle tragen ihre Bilder ohnehin mit, die KTX2-Dateien kommen dazu).

## Was es gibt

| Teil | Datei |
|---|---|
| Kodierer: `tex/` → `tex2/<name>.ktx2` (1024 px) und `tex2/h/` (512 px, Telefon/Tablet); die Bilder der glTF-Modelle → `tex2/g/<schlüssel>.ktx2` (+ `g/h/` ab 256 px), Schlüssel aus dem Bildinhalt (Länge + FNV-1a des Base64-Texts – dieselbe Funktion im Code), Rolle aus den Materialien. Farbe: ETC1S (BasisLZ, sRGB, klein); Normal- und ORM-Karten: UASTC + RDO + Zstandard (linear – ETC1S macht dort Blöcke); Alpha bleibt. Alle Mip-Stufen; `tex/` gespiegelt wie die Bilder (`flipY`), glTF nicht. `tex2/tex2.json`: Quellen (SHA-1 bzw. Schlüssel), Rezepte, Größen | `tools/tex/ktx2.py` |
| GitHub: KTX-Software 4.4.2 (Release), kodieren (alles ~10 min, sonst nur Neues), **messen** (Job „Messen“: Build mit dem neuen `tex2/`, `ktx2` + `ktx2prof`), veröffentlichen **nur** `gh-pages/tex2/` – bei Pushes auf `src`, von Hand, oder auf `feat/texturen`, wenn die erste Zeile der Commit-Nachricht mit `[tex2 veröffentlichen]` beginnt | `.github/workflows/texturen-ktx2.yml` |
| `tex2/` liegt nur einmal auf gh-pages, an der Wurzel: `deploy_site.py` kopiert es nie (weder live noch in die Vorschau) und lässt es beim Live-Stellen stehen (KEEP); die Vorschau lädt `../tex2/`. Die Builds und Tests holen es für `TEX2MAN` nach `dist/` (je ein Kopierschritt) | `viz3/deploy_site.py`, `live.yml`, `pruefpaket.yml` (Browser-, Feature-, Themen-, WebKit-, Vorschau-Job), `check.yml`, `feat.yml` |
| Build: Transkodierer von three nach `dist/basis/` (0,59 MB); `window.TEX2MAN = { t: [tex/-Namen], g: { schlüssel: größere Seite } }` – `tex/` nur, wo die Quelle (SHA-1) zum Bild in `dist/tex/` passt; ein geändertes Bild bleibt Bild, bis `tex2/` neu gebaut ist | `viz3/build.py`, `viz3/buildlib/assets.py` |
| Laden (`TEX2`): nur wenn die GPU ein passendes Format hat. `tex/`: `texFile` macht aus dem Platzhalter an Ort und Stelle eine `CompressedTexture` (auch die schon gemachten Klone) – Wiederholung, Drehung, Anisotropie, Farbraum und **die Shader-Programme bleiben gleich**. glTF: der Bildlader in `gltfDataURIs` gibt dem Parser eine fertige Textur (komprimiert oder das Bild wie bisher). Jeder Fehler (Datei, Transkodierer, 40 s keine Antwort) → das Bild, je Textur. Telefon: Dateien halber Größe, nach abgebrochenem Versuch eine Mip-Stufe weniger (zählen bei TEXHALF als verkleinert); ein Worker (Rechner bis drei), die Worker enden 3 s nach der letzten Textur. Ladeprotokoll: „Texturen KTX2: n + m Modellbilder (Formate), MB“ | `viz3/src/core/assets.js` |
| Bodendetails (`DETAIL`, Textur-Array) bleiben Bilder (sie werden in eine Canvas gezeichnet): `texFile(datei, srgb, true)` | `viz3/src/core/detail.js` (eine Zeile) |
| Tests: `ktx2` (KTX2 gegen `?tex2=0`: Programme, fünf Bilder, Speicher, Telefon), `ktx2prof` (Startzeit: Aufwärmen, abwechselnd, Median von 3) | `viz3/test/ktx2.py`, `viz3/test/ktx2prof.py`, `viz3/extra/texturen/tests.txt` |

## Welches Format wo – und was es bringt

| Gerät | Format (Farbe / Normal+ORM) | Grafikspeicher der Texturen | Start |
|---|---|---|---|
| **iPhone, iPad** (Safari) | ETC2 (4 bit/Pixel) / ASTC 4×4 (8 bit) | **~125 MB statt ~314 MB** (Schätzung, iPhone-Profil) | etwa gleich; weniger Spitze beim Hochladen; ~16 MB mehr Download beim ersten Besuch |
| Rechner mit Grafikkarte (Windows/Chrome: Direct3D) | BC7 / BC7 | ~430 MB statt ~1180 MB (dazu weniger Bilddaten im Arbeitsspeicher) | nichts zu entpacken, keine Mipmaps auf dem Hauptthread; dafür ~125 MB statt ~37 MB Texturen beim ersten Laden (danach im Browser-Cache) |
| Mac mit Apple-Chip | BC7 / ASTC | wie oben | wie oben |
| Rechner **ohne** Grafikkarte (SwiftShader, „Microsoft Basic Render Driver“, llvmpipe) | nur BC7 (`TEX2_SOFT = true`), ohne BC7 die Bilder | wie oben | etwa gleich, siehe unten |

**Ohne Grafikkarte** wird jede komprimierte Textur beim Hochladen auf dem Prozessor entpackt; BC7 ist dort das günstigste Format, ASTC
das teuerste. Gemessen (SwiftShader bei GitHub, Aufwärmen, abwechselnd, Median von 3, Zeit bis das Modell zu sehen ist):
nur `tex/` als KTX2: BC7 21,6 s gegen Bilder 19,1 s (die Bilder schwanken 15,6–21,1 s); `tex/` + Modellbilder: BC7 **24,3 s** gegen
Bilder **27,3 s**, ASTC 27,8 s, BC1 26,5 s (anderer, langsamerer Rechner). Ehrlich gesagt: am Start ohne Grafikkarte ändert sich wenig –
es lohnt sich für den **Speicher am iPhone** und auf Rechnern mit Grafikkarte. `TEX2_SOFT = false` nimmt dort wieder die Bilder.

## Messungen (GitHub, SwiftShader)

| | Bilder (`?tex2=0`) | KTX2 |
|---|---|---|
| Grafikspeicher aller Szenen-Texturen, Rechner (Schätzung: komprimiert exakt, Bilder RGBA mit Mipmaps) | 1182 MB | 428 MB (252 komprimiert, 223 MB; 79 Bilder, 206 MB) |
| dasselbe, iPhone-13-Profil | 314 MB | 125 MB (56 MB komprimiert + 69 MB Bilder) |
| davon die 78 benutzten `tex/`-Texturen, Rechner / Telefon | 436 / ~109 MB | 109 / 27 MB |
| Start bis zum Modell, Rechner (Median von 3, `tex/` + Modelle) | 27,3 s | 24,3 s |
| Start, iPhone-Profil (je 1 Lauf) | 23 s | 22 s |
| `memphone` (iPhone-Profil, nur `tex/`): Spitze GPU-Prozess erster Besuch / nach Abbruch | 1314 / 815 MB | 1178 / 749 MB |
| Shader-Programme nach dem Laden / nach fünf Ansichten | 141 / 151 | 141 / 151 (dieselben Schlüssel) |
| Bilder an fünf Orten (Garten, Pavillon, innen, Dorf, Wald): mittlere Abweichung | – | 0,10–0,55 von 255, keine stark veränderten Flächen |
| Download der Texturen beim ersten Besuch | ~37 MB (`tex/` 19,6 MB + die Bilder in den Modellen ~17 MB) | Rechner ~125 MB (`tex2/` 58 MB statt `tex/`, die Modelle mit ihren Bildern ~17 MB, dazu `tex2/g/` bis 65 MB), Telefon ~53 MB (16 + 17 + bis 20 MB); + Transkodierer 0,59 MB |

Kodierer-Qualität (PSNR der größten Stufe): Farbe (ETC1S) 35–43 dB (Dachziegel 35, Putz 40, Lärche 43), Normalkarten (UASTC) 34 dB
(rauschiger Rasen) bis 50 dB (Lärche), ORM 41–51 dB; nebeneinander bei doppelter Vergrößerung kein sichtbarer Unterschied.
Transkodierer: 0,59 MB (Worker-Skript 58 KB + WebAssembly 527 KB), gleich beim Start geladen; jeder Worker übersetzt das WebAssembly
einmal und hält dessen Speicher, bis er 3 s nach der letzten Textur beendet wird. Bei GitHub war die erste Textur 7–9 s nach der ersten
Anfrage fertig, die letzte nach ~12 s – der Hauptthread baut bis dahin die Szene und nimmt die Ergebnisse der Worker erst danach an; die
Ladephase dauert dadurch ~0,6 s länger, die Texturen gehen danach schneller hoch.

Am echten Gerät misst das noch niemand: die Tests sehen nur SwiftShader (das komprimierte Texturen beim Hochladen in eine eigene
entpackte Kopie wandelt – die Prozess-Spitzen aus `memphone` zeigen den Gewinn deshalb nur zum Teil). Am iPhone liest die Grafik die
komprimierten Daten direkt.

## Was Falko ansehen sollte

- **iPhone (Safari):** die Vorschau `…/pavillon-ratscher/vorschau/` laden (erster Besuch ~53 MB Texturen statt ~37 MB, am besten im WLAN). Bricht die Seite nicht mehr ab,
  auch nicht beim Herumgehen? Sehen Holz (Pavillon, Lärche), Dach, Rasen, Putz, Steine, die Möbel innen und die Figuren aus wie auf der
  Live-Seite – keine Blöcke, keine falschen Farben, nichts auf dem Kopf, Blätter mit sauberen Rändern? Menü → Einstellungen →
  Fehlerbericht: im Ladeprotokoll „Texturen KTX2: … (… ASTC, … ETC2), … MB“.
- **Laptop (Chrome):** Vorschau mit Stoppuhr vom Öffnen bis zum Modell, dann dieselbe Seite mit `?tex2=0` (die Bilder) – schneller,
  ruhiger beim Laden? Fehlerbericht: „… BC7 …“. Nahaufnahmen (Wand, Boden, Möbel) mit und ohne `?tex2=0` vergleichen.
- Fällt etwas auf: `?tex2=0` hilft sofort; Bescheid an den Kern-Chat (mit dem Fehlerbericht).

## `tex2/` neu bauen

- Nach neuen oder geänderten Texturen oder Modellen auf der Website: `tools/tex/stand.txt` ändern und auf `src` pushen – der Workflow
  „Texturen KTX2“ kodiert nur Neues, misst und veröffentlicht `gh-pages/tex2/`. Der nächste Build (Vorschau, Live) nimmt es mit.
- Lokal (Einstellungen ausprobieren): KTX-Software-Release entpacken, dann
  `LD_LIBRARY_PATH=<ktx>/lib python3 tools/tex/ktx2.py --src viz3/dist/tex --out /tmp/tex2 --ktx <ktx>/bin/ktx --only larch,lawn`
  (Modellbilder dazu: `--gltf viz3/dist/models,viz3/dist/chars,viz3/dist/grass`).
- Zielformate vergleichen: `?tex2fmt=astc|bc7|bc1|etc2|rgba`; `python3 viz3/test/run.py --serve ktx2prof:k2,img,bc1`.

## Nicht gemacht

- Bäume (`tree/`, ez-tree), Himmel, Luftbilder und die Bodendetails (`DETAIL`) sind noch Bilder (am Telefon ~69 MB).
- Kein Test auf einem echten Gerät (siehe oben).

## Für den Kern-Chat

- **Geänderte gemeinsame Dateien:** `viz3/src/core/assets.js` (TEX2, `texFile` mit drittem Parameter `img`, Bildlader in
  `gltfDataURIs` gibt fertige Texturen), `viz3/src/core/detail.js` (eine Zeile), `viz3/build.py` (Transkodierer, `window.TEX2MAN`),
  `viz3/buildlib/assets.py` (`tex2_manifest`, `copy_basis`), `viz3/deploy_site.py` (KEEP `tex2`; `tex2/` wird nie aus einem Build kopiert –
  **neu gegenüber deiner Übernahme auf `wip/kern`:** auch nicht in die Vorschau), Workflows `live.yml`, `pruefpaket.yml` (Vorschau-,
  Browser-, Feature-, Themen-, WebKit-Job), `check.yml`, `feat.yml` (je eine Kopierzeile, bei der Vorschau als Basis `/tex2/` im
  Sparse-Checkout).
- **Schalter** in `core/assets.js`, je eine Zeile: `TEX2_LIVE = false` (Live-Seite nur mit `?tex2=1`), `TEX2_SOFT = true` (Rechner ohne
  Grafikkarte: BC7), `TEX2_MODELS = true` (Modellbilder auch auf Rechnern; `false` spart dort ~50 MB Download beim ersten Besuch).
- **Tests:** auf `localhost` an wie in der Vorschau; `ktx2.py` und `ktx2prof.py` erzwingen es mit `?tex2=1` (unabhängig von den
  Schaltern) und prüfen die Bilder mit `?tex2=0` mit. Die Prüfpaket-Läufe werden dadurch nicht langsamer (Messung oben).
  `viz3/extra/texturen/tests.txt` enthält auch `memphone`, `softgl`, `gpu` (für die Läufe auf `feat/texturen` mit `tex2/`); auf `src`
  laufen die ohnehin im Prüfpaket – die drei Zeilen können beim Zusammenführen raus.
- **`tex2/` auf gh-pages:** nur an der Wurzel, ~160 MB (eine Kopie; in `vorschau/` hätte eine zweite die Seite auf ~830 MB von 1 GB
  gebracht). Ein Live-Stellen mit einem alten `deploy_site.py` (ohne KEEP) löscht es (so geschehen mit V16o); danach `tools/tex/stand.txt`
  ändern und pushen.
- `tools/bootstrap.sh` holt `tex2/` nicht (es nimmt die Vorschau als Basis): lokal ohne Kopierschritt also die Bilder.
- Neue `window`-Namen für `docs/ARCHITECTURE.md` (Abschnitt Texturen: TEXHALF/DETAIL): `TEX2` (Stand: `on`, `why`, `n`, `gn`, `fmt`, `mb`,
  `fails`, `soft`, `files()`), `TEX2MAN` (Build).
- `render/zmerge.js` `exportGI` (GI-Backen, `test/gi.py`) liest Bildpixel – mit KTX2 fehlen dort die Mittelwerte: zum Backen `?tex2=0`.
