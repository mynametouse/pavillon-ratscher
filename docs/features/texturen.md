# Komprimierte Texturen (KTX2/Basis) – feat/texturen, 23.10.2026

Umbau Phase 2, Baustein 4 (`docs/plans/plan_phase2.md`): Der Start ging fast ganz ins Hochladen der Texturen, und am iPhone waren die
entpackten RGBA-Bilder das Speicherproblem. Jetzt lädt die Seite die PBR-Texturen (`tex/<name>_col|nrm|orm`) als **KTX2 mit Basis
Universal**: ein Worker (three `KTX2Loader`) wandelt sie in das Format, das die Grafikkarte direkt liest – BC7 (bzw. BC1) am Rechner,
ASTC/ETC2 am Telefon –, mit allen Mip-Stufen aus dem Kodierer. Ein Viertel des Grafikspeichers (BC1/ETC2: ein Achtel), kein Entpacken und
keine Mipmaps auf dem Hauptthread.

## Was sich geändert hat

| Teil | Datei |
|---|---|
| Kodierer: Website-Bilder `tex/` → `tex2/<name>.ktx2` (1024 px, Rechner) und `tex2/h/<name>.ktx2` (512 px, Telefon/Tablet); Farbe ETC1S (sRGB, klein), Normal- und ORM-Karten UASTC + RDO + Zstandard (linear, ohne Blöcke); alle Mip-Stufen (Filter mit Umlauf, die Texturen kacheln); gespiegelt, damit sie aussehen wie die Bilder (flipY); `tex2/tex2.json` mit SHA-1 der Quelle | `tools/tex/ktx2.py` |
| Bauen und Veröffentlichen auf GitHub: KTX-Software 4.4.2 (Release), unveränderte Bilder werden übernommen; veröffentlicht **nur** `gh-pages/tex2/` | `.github/workflows/texturen-ktx2.yml` |
| Website-Builds nehmen `tex2/` der Seite mit (je ein Kopierschritt); `deploy_site.py` lässt `tex2/` beim Live-Stellen stehen und schreibt es nicht (nur der Workflow); die Vorschau bekommt eine Kopie (`vorschau/tex2/`, daraus holen die Tests es) | `live.yml`, `pruefpaket.yml` (Vorschau), `feat.yml`, `viz3/deploy_site.py` |
| Build: Basis-Transkodierer von three nach `dist/basis/`; `window.TEX2MAN` = die `tex2/`-Dateien, deren Quelle (SHA-1) zum aktuellen Bild in `dist/tex/` passt – ein neues Bild bleibt Bild, bis `tex2/` neu gebaut ist | `viz3/build.py`, `viz3/buildlib/assets.py` |
| Laden: `TEX2` (KTX2Loader im Worker, nur wenn die GPU ein komprimiertes Format hat: BC7, BC1 mit sRGB, ASTC, ETC2). `texFile` macht aus dem geladenen Bild-Platzhalter an Ort und Stelle eine `CompressedTexture` (auch die schon gemachten Klone) – Wiederholung, Drehung, Anisotropie, Farbraum und **die Shader-Programme bleiben gleich**. Jeder Fehler (Datei, Transkodierer, 40 s keine Antwort) → das Bild, je Textur. Telefon: Halbe-Größe-Dateien, nach abgebrochenem Versuch eine Mip-Stufe weniger. Ladeprotokoll: „Texturen KTX2: n (Formate), MB“ | `viz3/src/core/assets.js` |
| Bodendetails (`DETAIL`, Textur-Array) bleiben Bilder (werden in eine Canvas gezeichnet): `texFile(datei, srgb, true)` | `viz3/src/core/detail.js` (eine Zeile) |
| Test: KTX2 gegen `?tex2=0` – Programme, Bilder an fünf Orten, Speicher; Telefon mit halber Größe | `viz3/test/ktx2.py`, `viz3/extra/texturen/tests.txt` |

## Abschalten, vergleichen

- `?tex2=0` – die Bilder wie bisher (zum Vergleichen). `window.TEX2` zeigt den Stand (`on`, `why`, `n`, `fmt`, `mb`, `fails`, `files()`).
- Ohne `tex2/` in `dist/` (z. B. ein frisch geklonter Stand ohne Website-Kopie) läuft alles mit den Bildern.

## `tex2/` neu bauen

- Nach neuen oder geänderten Texturen auf der Website: `tools/tex/stand.txt` ändern und auf `src` (oder `feat/texturen`) pushen – der
  Workflow „Texturen KTX2“ kodiert nur, was sich geändert hat (~10 min für alles), und veröffentlicht `gh-pages/tex2/`. Danach holt der
  nächste Build (Vorschau, Live) die neuen Dateien.
- Lokal (zum Ausprobieren von Einstellungen): KTX-Software-Release entpacken, dann
  `LD_LIBRARY_PATH=<ktx>/lib python3 tools/tex/ktx2.py --src viz3/dist/tex --out /tmp/tex2 --ktx <ktx>/bin/ktx --only larch,lawn`.

## Messungen

(folgt)

## Für den Kern-Chat

- Neue `window`-Namen: `TEX2` (Stand, `core/assets.js`), `TEX2MAN` (Build) – bitte in `docs/ARCHITECTURE.md` eintragen (Abschnitt Texturen:
  TEXHALF/DETAIL); `texFile(file, srgb, img)` hat einen dritten Parameter (nur Bild).
- Workflows: `feat.yml` (Kopierschritt + `/tex2/` im Sparse-Checkout), `live.yml` und der Vorschau-Job in `pruefpaket.yml` (je ein
  Kopierschritt) – geändert, damit Tests, Vorschau und Live `tex2/` haben. Die Browser-Jobs des Prüfpakets und `check.yml` bekommen `tex2/`
  über die Vorschau (`vorschau/tex2/`, nach dem ersten Vorschau-Lauf mit diesem Stand).
- `render/zmerge.js` `exportGI` (GI-Backen) liest Bildpixel – mit KTX2 fehlen dort die Mittelwerte der `tex/`-Texturen: zum Backen `?tex2=0`.
