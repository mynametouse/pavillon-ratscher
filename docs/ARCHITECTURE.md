# Architektur der App (viz3)

Stand: V16a + Umbau (Oktober 2026). Kurz: **ein Bündel, ein gemeinsamer Gültigkeitsbereich, Module in fester Reihenfolge, jede
Schnittstelle als `window.NAME`**. Kommentare im Code sind Englisch, Texte in der Oberfläche Deutsch.

## 1 Grundprinzip

- `viz3/build.py` hängt die Dateien aus `src/modules.txt` in dieser Reihenfolge aneinander (`src/_main.js`, nicht einchecken) und bündelt
  sie mit esbuild zu `dist/app.js` (Importe nur in `core/head.js`: three r169 + Addons, n8ao, ez-tree aus `src/eztree/`).
- Alle Module teilen **einen** Gültigkeitsbereich: ein Modul sieht jede Top-Level-Konstante/-Funktion der Module **über** ihm
  (z. B. `scene`, `MAT`, `B()`, `markDirty()`, `P`). Was andere Module oder Tests brauchen, steht zusätzlich auf `window`
  (`window.WERK`, `window.DN` …). Neue Querverbindungen bitte über diese `window`-Objekte, nicht über interne Namen fremder Module.
- Viele Module sind IIFEs (`const X = (() => { … return api; })();`): innen privat, außen nur die Rückgabe.
- **Reihenfolge zählt**: Module laufen beim Laden von oben nach unten. Was `render/zmerge.js` vorfindet, wird zu wenigen Draw-Calls
  zusammengefasst; spätere Module (Spiel, Werkstatt, Tag/Nacht) bleiben einzelne Meshes. Punktlichter entstehen in
  `pavilion/interior.js` (7, `window.LIGHTS`) und `garden/workshop_lamp.js` (1).
- Die Seite liegt in Teilen unter `viz3/shell/` (Reihenfolge `parts.txt`): `head.html`, CSS je Bereich (`css/layout, stage3d, siteplan, variants, pano,
  gallery, phases, game, hud, werk_clock`), `header.html`, `panel_3d.html` (Bühne, HUD, Overlays), `menu.html` (Menü mit Orten, Licht, Spiel,
  Steuerung/Hilfe), `windows.html` (Inventar, Maschine, Uhr, PSA, Werkstattbuch), `panel_pano|film|gallery.html`, `notes.html`, `tail.html`.
  Der Build setzt Skript, Manifeste und die Quellenliste ein (`<!--SCRIPTS-->`, `<!--CREDITS-->`).

## 2 Koordinaten

- **Grundstück (site)**: x Ost, y Nord, z oben, Meter, Ursprung SW-Ecke der Bodenplatte (Garage). Helfer `V(x, y, z)` → three
  `Vector3(x, z, −y)`. Richtungen als Kompass-Azimut (0 = Nord, 90 = Ost); `dirFromAz(az, el)`.
- **Verschiebbare Gebäude** (`bldBegin(key, …) … bldEnd()`, `BUILD[key]`): gebaut in Original-Koordinaten unter einer Gruppe am Drehpunkt;
  `BUILD[key].tf(x, y)` rechnet Original- in aktuelle Koordinaten (nach Verschieben in der Draufsicht). Werkstatt-Spiel: `WERK.WT()`.
- **Echte Welt**: `GEOMAN.xf` (`a, b, ex, ey`) bildet Grundstück → UTM 32N ab (`world/ratscher.js`, Geländehöhe `RATSCHER.hAt`).

## 3 Laden

1. Module bauen die Szene (Bauphasen: `phase(n)` setzt die Phase neuer Teile, `tagPh(obj)`; Varianten: `varOn('A'|'B') … varOff()`;
   Kollision/Begehbarkeit: `B()`, `cyl()`, `beam()` tragen in `COL`/`WALK` ein).
2. Assets laden über `LM` (LoadingManager); `whenLoaded(fn)` läuft, wenn alles da ist.
3. `boot/boot.js`: Lichtmodus (`setMode`), Variante, erster Ort, dann `prepareGPU()` (alle Shader kompilieren, Texturen hochladen,
   Grafikstufe einmal messen – entfällt, wenn `localStorage['pav-tier']` gesetzt ist), Ladebildschirm weg, `window.GAME`.

## 4 Frame-Schleife

`game/game.js` `frame()`: Physik (Gehen, Kollision, Türen), `cam3Update`, `adaptExposure`, dann alle `TICKS` (Liste von
Pro-Frame-Funktionen, `window.TICKS.push(dt => …)`). **Gezeichnet wird nur, wenn etwas `markDirty()` gerufen hat**: in Bewegung billige
Frames (geringere Auflösung, ohne AO), im Stand ein volles Bild. `markDirty(true)` zeichnet zusätzlich die Schattenkarte der Sonne neu
(nur bei Änderungen an Statischem oder Sonnenstand). Tests setzen `window.FREEZE = true` und treiben die Welt mit `GAME.step(sek)`
(Physik + TICKS, ohne Zeichnen), Bilder mit `GAME.shot()`.

## 5 Licht und Material

- **Feste Stimmungen** `MODES.day | gold | dusk` (`render/modes.js`, `setMode`): Sonne, Himmel, HDRI-Umgebungslicht, gebackenes GI.
- **Tageslauf** `setMode('auto')` und **Nacht** `setMode('night')` übernimmt `DN` (`time/daynight.js`): Sonnen- und Mondstand aus Datum/Uhrzeit,
  Schlüsselbilder nach Sonnenhöhe (`DN.KF`), Mischen von zwei Himmelsfotos, zwei vorgefilterten HDRIs (`ENVB`, eigener Render-Target) und
  zwei GI-Volumen (`render/render.js`: `giMix`, 8 Schichten pro Frame). `MODES.auto` hält die Werte, die andere Module lesen.
- **`patchSV(material)`** (`core/assets.js`) erweitert Standard-Materialien: Himmelssichtbarkeit (Raum-Verschattung), gebackenes GI im
  Kasten um den Pavillon (weicher Rand 1,5 m, Tönung `GI.tint`), Figurenschatten (`FIGSH`), Maske gegen Lampenlicht durch Wände
  (`material.userData.leak`, Rasen/Kies). Programm-Cache-Schlüssel beachten (`customProgramCacheKey`), sonst teilen Varianten Shader.
- Lichter nie per `visible` an/aus (ändert die Shader-Varianten → alles neu kompilieren); stattdessen `intensity = 0`.

## 6 Spielschicht

| Objekt | Modul | Aufgabe |
|---|---|---|
| `PLAY` | game/play.js | Aktionsknopf (`PLAY.act({id, r, label, pos, run, …})`), Dinge in der Hand und Inventar (`PLAY.thing`), Sitzen/Liegen (`PLAY.sit`), zeitliche Arbeit mit Balken und Zielfeld (`hold`, `gauge`), Gedanken (`PLAY.think`) |
| `HUD` | game/hud.js | Menü, HUD, Inventarfenster, Mausfang |
| `AVATAR` | game/avatar.js | Spielfigur (Mann/Frau), Bewegungen, Schutzausrüstung an der Figur |
| `QUESTS` | game/quests.js | Aufgaben, Tagebuch (J), Zielanzeige |
| `NPC` | npc/npc.js, npc_real.js, hours.js | Hubert, Ronald, Ziegen, Traktor; Dialoge; nachts daheim |
| `CLOCK` | time/clock.js | Spielzeit (Minuten seit Tag 1, 0:00), Tempo, Warten/Zeitraffer, `CLOCK.on(fn)`, `CLOCK.jobs(fn)` |
| `DN` | time/daynight.js | Kalender, Sonne/Mond/Sterne, Licht; `DN.sky(jd)`, `DN.jdOf(t)`, `DN.dateStr()` |
| `GEAR` | werk/gear.js | Schutzausrüstung, `GEAR.check(req)` |
| `WERK`, `WUI` | werk/ | Werkstatt-Spiel (Werkstücke, Stationen, Schritte), Maschinenfenster, Werkstattbuch |
| `WORKS`, `WLAMP` | garden/workshop*.js | Werkstattgebäude mit Maschinen und Ton; LED-Licht mit Bewegungsmelder |
| `RATSCHER` | world/ratscher.js | echte Umgebung: Gelände (`hAt`), Luftbilder, Gebäude, Bäume |
| `SITEPLAN`, `PLANNER` | world/siteplan.js, pavilion/plan.js | Draufsicht (Gebäude verschieben, Zäune), Möbel planen, Plan veröffentlichen |
| `GAME` | boot/boot.js | Test- und Steuer-API: `go(spot)`, `view(x,y,z,yaw,pitch)`, `step`, `shot`, `setMode`, `setPhase`, `setVariant` … |

## 7 Assets

- Ordner in `dist/`: `tex/ hdri/ models/ grass/ chars/ snd/ sky/ gi/ pano/ geo/ tree/ img/` + `sv*.png`, `plan.json`, `tour.mp4`.
- Der Build schreibt die Manifeste inline in die Seite (`window.TEXMAN, HDRIMAN, MODELMAN, SNDMAN, SVMAN(_B), VOICEMAN, PANOMAN, SKYMAN,
  CHARMAN, PLAYERMAN, GIMAN_A/_B, MUSICMAN, GEOMAN`) und speichert sie in `viz3/manifests.json` (Schnell-Build ohne Originale).
- Bilder der glTF-Modelle stecken als Data-URI im JSON (ein Artefakt-Stand darf höchstens 511 Dateien haben).
- Erzeugt von Werkzeugen, nicht vom Build: `img/*.jpg` (test/bilder.py), `pano/` (test/pano.py), `gi/` (test/gi.py), `sv*.png` (test/bake.py),
  `tour.mp4` (test/tour.py), `time/skydata.js` (tools/nightsky/mk_sky.py).
- Neue Quelle mit Namensnennung: Zeile in `viz3/buildlib/credits.py` (Töne: `assets/snd/CREDITS.md`).

## 8 Gespeichert im Browser (localStorage)

| Schlüssel | Inhalt |
|---|---|
| `pav-tier` | Grafikstufe (hoch/mittel/schnell) |
| `pav-light2` | Lichtmodus (auto/day/gold/dusk/night) |
| `pav-variant`, `pav-facade`, `pav-style`, `pav-layout`, `pav-site`, `pav-plan-ts` | Entwurf: Variante, Fassade, Innenstil, Möbel, Gebäude/Zäune, Stand des veröffentlichten Plans |
| `pav-gh-token` | GitHub-Schlüssel des Eigentümers zum Veröffentlichen des Plans (nur in seinem Browser, nie im Repo) |
| `pav-view`, `pav-fig`, `pav-lock`, `pav-sound`, `pav-wpcard` | Kamera (Figur/Augen), Spielfigur, Mausfang, Ton, Werkstück-Karte |
| `pav-clock-v1`, `pav-dn-v1` | Spielzeit und Tempo; Kalender (Tag 1 = Datum) |
| `pav-quests-v1`, `pav-werk-v1`, `pav-gear-v1` | Aufgaben, Werkstatt-Spiel, Schutzausrüstung |
| `pav-v14`, `pav-v15`, `pav-v15b`, `pav-v16a` | „Neu in …“-Hinweise schon gezeigt |

Neue Schlüssel: Präfix `pav-`, Versionssuffix bei Spielständen (`-v1`), hier eintragen.

## 9 Modulkarte

Reihenfolge und Kurzbeschreibung: `viz3/src/modules.txt`. Ordner:

- `core/` – three.js, Renderer, Szene, Kamera, Lader, Material-Erweiterung, Geometrie-Helfer mit Kollision, Materialien
- `pavilion/` – der geplante Pavillon: `house_base` (Maße, Wand-/Fenster-Helfer), `house_common`, `house_tower` (Variante A),
  `house_ladder` (B), Innenausbau, Bauphasen/Kosten, Möbelplanung, Fassade, Stil, Variantenwechsel
- `garden/` – Grundstück: Bach, Himmel/Sonne/Boden (`env`), je Bestandsgebäude eine Datei (carport, holzhaus, greenhouse, bungalow,
  washhouse), Werkstattgebäude, Zäune, Bäume, Gras, Werkstattlicht
- `render/` – Pipeline, Stimmungen, Zusammenfassen statischer Meshes, Leistungstest, Panoramen
- `game/` – Gehen/Kamera/Schleife, Aktionen/Inventar, Haus (Schalter, Ofen, Sitzen), Aufgaben, HUD, Spielfigur
- `audio/` – Ton-Engine (Aufnahmen, Synthese, Atmosphäre, Stimmen), Musik (Klavier, Platten, Ukulele)
- `npc/` – Nachbarn und Ziegen, echte Figuren, Tagesrhythmus
- `world/` – Draufsicht/Planen, Umgebung Ratscher
- `time/` – Uhr, Sterndaten, Tag und Nacht
- `werk/` – Schutzausrüstung, Werkstatt-Spiel, Werkstatt-Fenster
- `boot/` – Start
- (geplant) `vehicles/` – Auto, Traktor (V16b)

## 10 Leistung (gemessen, SwiftShader-Test, test/prof.py)

- Spiel-Logik pro Frame (alle TICKS zusammen) < 0,5 ms; teuerster Posten die GI-Mischung während eines Übergangs (≈ 0,2 ms) und die Spielfigur.
- Szene ≈ 1080 Meshes, ≈ 120 Shader-Programme, ≈ 400 Texturen, JS-Heap ≈ 150 MB. Kosten liegen auf der GPU (Draw-Calls, Schatten, AO).
- Regeln: in TICKS nichts pro Frame allozieren, Arbeit drosseln (Zeitakkumulator), nur bei echter Änderung `markDirty()`;
  große Rechnungen in Teilen über mehrere Frames (Beispiel `giMix`); neue statische Geometrie vor `render/zmerge.js` einhängen oder
  selbst zusammenfassen (InstancedMesh, `BufferGeometryUtils.mergeGeometries`).

## 11 Erweitern – Beispiel neues Modul (z. B. Fahrzeuge)

1. Ordner/Datei anlegen (`src/vehicles/car.js`), Zeile in `src/modules.txt` vor `boot/boot.js` (nach allem, was gebraucht wird).
2. Als IIFE schreiben, API auf `window` (`window.VEH = …`), Pro-Frame-Arbeit über `window.TICKS.push(dt => …)`, Aktionen über `PLAY.act`.
3. Spielstand mit eigenem Schlüssel (`pav-veh-v1`, oben eintragen); Texte deutsch; Quellen in `buildlib/credits.py`.
4. Test-Skript `viz3/test/<thema>.py` mit `lib.py`; Eintrag in docs/CHANGELOG.md.
