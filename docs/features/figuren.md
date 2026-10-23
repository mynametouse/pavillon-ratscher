# Spielfiguren Falko, Sarah, Christoph (feat/figuren)

Wunsch von Falko (23.10.2026, `docs/plans/plan_leben.md` Abschnitt 3): drei wählbare Figuren statt „Mann/Frau“.
Wahl im Menü → Spiel → „Spielfigur“ (`#figseg`), gespeichert in `pav-fig` als Kürzel: `m` = Falko, `f` = Sarah, `c` = Christoph
(die alten Werte `m`/`f` von „Mann/Frau“ gelten weiter).

## Figuren

| Figur | Körper (Kleidung) | Kopf | Bewegungen | Besonderes |
|---|---|---|---|---|
| Falko | Rocketbox `Professions/Delivery_Male_01` (bisherige Figur, unverändert) | dto. | `pclips_m` | – |
| Sarah | `Adults/Female_Adult_04` – die bisherige Frau: Gesicht, Haut, Ohrringe, Lederjacke, Cargohose, Stiefel bleiben | dto., nur die Haare neu: die gewellten Locken bis zur Schulter von `Adults/Female_Party_01`, brünett gefärbt (auch die eigenen aufgemalten Haare und die Brauen); der eigene Dutt fällt weg | `pclips_f` | Sarah ist eine echte Person: nur geändert, was Falko wollte (brünett, Locken) |
| Christoph | `Adults/Male_Adult_09`: dunkles T-Shirt, Jeans (Tattoo entfernt), Arme, Schultern, Brust etwas kräftiger | `Professions/Sports_Male_01`: kurze braune Haare, leichter Bart | `pclips_m` | gut 1 cm kleiner als Falko (Kopf 1,2 cm tiefer); Schildmütze und Ohrhörer (`figHeadwear` in `game/avatar.js`) |

Alle erwachsenen Rocketbox-Frauen teilen ein Skelett, alle Männer ein anderes – deshalb passen Kopf, Haare und Körper verschiedener
Figuren zusammen und die Bewegungen der bisherigen Figuren ohne Änderung. Sarahs neue Haare: die Dreiecke des Spenderkopfs, die als Haar
bemalt sind und mehr als 1,5 mm außerhalb ihres Kopfes liegen (das Haarvolumen), dazu seine Haarkarten (ohne Wimpern, ohne die schwarzen
Streuhaare); kleine Inseln unter 10 Dreiecken fallen weg. Lizenz MIT (Microsoft), Nennung über `viz3/extra/figuren/manifest.json`.

- **Mütze und Ohrhörer** werden beim Laden aus den Kopf-Punkten der Figur gebaut, im Raum des Kopfknochens: sie sitzen in jeder Haltung.
  Die Mütze fällt unter dem Forsthelm und dem Kapselgehörschutz weg, die Ohrhörer bei jedem Gehörschutz; sonst sind sie „manchmal“
  drin (einige Minuten an, einige aus); im Gespräch mit einem Nachbarn nimmt er sie heraus. Test-Haken: `AVATAR.buds(true|false|null)`.
- Schutzausrüstung (Brille, Maske, Gehörschutz, Forsthelm, Forstkleidung) wirkt auf alle drei Figuren. Unter dem Forsthelm drückt der
  Vertex-Shader die Haare oberhalb des Helmrands in die Schale (`helmHair`) – Sarahs Locken standen sonst durch den Helm.

## Neu bauen

```bash
PAV_WORK=/tmp/figuren bash tools/player/build_figures.sh [sarah] [christoph]
```

Holt die Originale aus dem Rocketbox-Klon (`RB=…`, Standard `/home/claude/microsoft/microsoft-rocketbox`), setzt Körper und Kopf zusammen
(`tools/player/fig_mesh.mjs`: Dreiecke nach Material, Knochen nach Namen, Hals und Brust des Kopfes unter die Kleidung,
Haare eines dritten Avatars, Verdickung der Arme), bereitet die Texturen vor (`fig_tex.py`, `fig_texattach.mjs`) und schreibt `viz3/extra/figuren/dist/chars/player_sarah.json` und
`player_christoph.json` (je < 2 MB, Texturen 1024 px WebP). `build.py` kopiert sie nach `dist/chars/`; das Manifest legt
`PLAYERMAN.player_f` auf Sarah und `player_c` auf Christoph.

Ohne Browser ansehen (Bilder von vorn, Seite, hinten, gehend, hockend, Kopf nah; ein Sammelbild `<prefix>_sheet.jpg`):

```bash
cd tools/player && node fig_preview.mjs ../../viz3/extra/figuren/dist/chars/player_christoph.json ../../viz3/dist/chars/pclips_m.json \
  /tmp/fig/christoph fig_views.json --headwear
```

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8972 --serve figuren
```

`viz3/test/figuren.py`: Menü, gespeicherter alter Wert `f`, eigene Modelle, Größen, Mütze über dem Kopf (stehen, gehen, hocken), Ausrüstung;
Bilder aller Figuren von vorn, der Seite und hinten nah und ganz, stehend, gehend, hockend → `out/figuren/`. Läuft bei jedem Push auf
`feat/figuren` in GitHub Actions (`viz3/extra/figuren/tests.txt`) in zwei Teilen: `figuren:f,m` (Sarah, Falko) und `figuren:c`
(Christoph mit Mütze, Ohrhörern, Ausrüstung, Größenvergleich) – je etwa 10 Minuten.

## Offen

- Sarahs Stiefel haben (wie bei der bisherigen Frau) einen kleinen Absatz; Rocketbox hat keine flachen Stiefel zu dieser Hose.
- Die neuen Haare sind gewellte Locken bis zur Schulter (aus Rocketbox); engere Locken bräuchten ein anderes Haarmodell.
