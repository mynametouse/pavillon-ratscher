# Spielfiguren Falko, Sarah, Christoph (feat/figuren)

Wunsch von Falko (23.10.2026, `docs/plans/plan_leben.md` Abschnitt 3): drei wählbare Figuren statt „Mann/Frau“.
Wahl im Menü → Spiel → „Spielfigur“ (`#figseg`), gespeichert in `pav-fig` als Kürzel: `m` = Falko, `f` = Sarah, `c` = Christoph
(die alten Werte `m`/`f` von „Mann/Frau“ gelten weiter).

## Figuren

| Figur | Körper (Kleidung) | Kopf | Bewegungen | Besonderes |
|---|---|---|---|---|
| Falko | Rocketbox `Professions/Delivery_Male_01` (bisherige Figur, unverändert) | dto. | `pclips_m` | – |
| Sarah | `Adults/Female_Adult_04`: Lederjacke, Cargohose, Stiefel | `Adults/Female_Party_02`: brünette Locken | `pclips_f` | Haut von Händen und Ausschnitt an das Gesicht angeglichen |
| Christoph | `Adults/Male_Adult_09`: dunkles T-Shirt, Jeans (Tattoo entfernt), Arme, Schultern, Brust etwas kräftiger | `Professions/Sports_Male_01`: kurze braune Haare, leichter Bart | `pclips_m` | 1,5 cm kleiner als Falko; Schildmütze und Ohrhörer (`figHeadwear` in `game/avatar.js`) |

Alle erwachsenen Rocketbox-Frauen teilen ein Skelett, alle Männer ein anderes – deshalb passen Kopf und Körper zweier Figuren
zusammen und die Bewegungen der bisherigen Figuren ohne Änderung. Lizenz MIT (Microsoft), Nennung über `viz3/extra/figuren/manifest.json`.

- **Mütze und Ohrhörer** werden beim Laden aus den Kopf-Punkten der Figur gebaut, im Raum des Kopfknochens: sie sitzen in jeder Haltung.
  Die Mütze fällt unter dem Forsthelm und dem Kapselgehörschutz weg, die Ohrhörer bei jedem Gehörschutz; sonst sind sie „manchmal“
  drin (einige Minuten an, einige aus). Test-Haken: `AVATAR.buds(true|false|null)`.
- Schutzausrüstung (Brille, Maske, Gehörschutz, Forsthelm, Forstkleidung) wirkt auf alle drei Figuren. Unter dem Forsthelm drückt der
  Vertex-Shader die Haare oberhalb des Helmrands in die Schale (`helmHair`) – Sarahs Locken standen sonst durch den Helm.

## Neu bauen

```bash
PAV_WORK=/tmp/figuren bash tools/player/build_figures.sh [sarah] [christoph]
```

Holt die Originale aus dem Rocketbox-Klon (`RB=…`, Standard `/home/claude/microsoft/microsoft-rocketbox`), setzt Körper und Kopf zusammen
(`tools/player/fig_mesh.mjs`: Dreiecke nach Material, Knochen nach Namen, Hals und Brust des Kopfes unter die Kleidung,
Verdickung der Arme), bereitet die Texturen vor (`fig_tex.py`) und schreibt `viz3/extra/figuren/dist/chars/player_sarah.json` und
`player_christoph.json` (je < 2 MB, Texturen 1024 px WebP). `build.py` kopiert sie nach `dist/chars/`; das Manifest legt
`PLAYERMAN.player_f` auf Sarah und `player_c` auf Christoph.

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8972 --serve figuren
```

`viz3/test/figuren.py`: Menü, gespeicherter alter Wert `f`, eigene Modelle, Größen, Mütze über dem Kopf (stehen, gehen, hocken), Ausrüstung;
Bilder aller Figuren von vorn, der Seite und hinten nah und ganz, stehend, gehend, hockend → `out/figuren/`. Läuft bei jedem Push auf
`feat/figuren` in GitHub Actions (`viz3/extra/figuren/tests.txt`).
