# Architektur der App (viz3)

Stand: V16e (Oktober 2026). Kurz: **ein Bündel, ein gemeinsamer Gültigkeitsbereich, Module in fester Reihenfolge, jede
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
  gallery, phases, game, hud, werk_clock, vehicles`), `header.html`, `panel_3d.html` (Bühne, HUD, Overlays), `menu.html` (Menü mit Orten, Licht, Spiel,
  Steuerung/Hilfe), `windows.html` (Inventar, Maschine, Uhr, PSA, Werkstattbuch), `panel_pano|film|gallery.html`, `notes.html`, `tail.html`.
  Der Build setzt Skript, Manifeste und die Quellenliste ein (`<!--SCRIPTS-->`, `<!--CREDITS-->`).

## 2 Koordinaten

- **Grundstück (site)**: x Ost, y Nord, z oben, Meter, Ursprung SW-Ecke der Bodenplatte (Garage). Helfer `V(x, y, z)` → three
  `Vector3(x, z, −y)`. Richtungen als Kompass-Azimut (0 = Nord, 90 = Ost); `dirFromAz(az, el)`.
- **Verschiebbare Gebäude** (`bldBegin(key, …) … bldEnd()`, `BUILD[key]`): gebaut in Original-Koordinaten unter einer Gruppe am Drehpunkt;
  `BUILD[key].tf(x, y)` rechnet Original- in aktuelle Koordinaten (nach Verschieben in der Draufsicht). Werkstatt-Spiel: `WERK.WT()`.
- **Echte Welt**: `GEOMAN.xf` (`a, b, ex, ey`) bildet Grundstück → UTM 32N ab (`world/ratscher.js`). Höhen: `RATSCHER.hAt` (bilinear, glatt),
  `RATSCHER.hMesh` (genau die gezeichneten Dreiecke des 10-m-Geländes), `ROADS.groundAt(x, y, z)` = befahrbarer/begehbarer Boden
  (modelliertes Grundstück mit Bach innerhalb ±120 m, sonst Gelände, Brückendecks). Befahrbar ist das Quadrat des 10-m-Geländes (`RATSCHER.box`, 2,4 km).

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
- **Höchstens 16 Texturen je Shader-Programm** (Fragment- und Vertex-Shader getrennt gezählt). Das ist die Untergrenze von WebGL 2 und
  auf vielen Laptops, Macs und Telefonen auch die Obergrenze; SwiftShader in den Tests erlaubt 32. Mehr Texturen → das Programm kompiliert
  nicht, das Mesh fehlt (V16b: Boden um den Garten mit 21 Texturen, der Himmel schien durch). Gleichartige Kacheltexturen deshalb als
  `sampler2DArray` bündeln (`DETAIL`, Abschnitt 11) oder in einen Atlas legen. `test/gpu.py` und `lib.check_gl(pg)` prüfen jedes Programm.

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
| `RATSCHER` | world/ratscher.js | echte Umgebung: Gelände (`hAt`, `hMesh`, `box`), Luftbilder, Gebäude (`walls`: Wandfüße), Bäume (`treeXY`) |
| `ROADS` | world/roads.js | Straßen und Wege aus OSM: Straßenkarte für die Boden-Shader (`roadShade`, `landDetail`), Oberfläche unter einem Punkt (`at`), Boden (`groundAt`), Brücken (`decks`), Ortsnamen (`place`), Routen (`routes.klinge`) |
| `WCOL` | world/worldcol.js | Kollision mit der echten Umgebung: Wände aller Gebäude, Stämme, Brückengeländer (`each`, `pushCircle`) |
| `VILLAGE` | world/village.js | V16e Ratscher nach Fotos: Fassaden-Shader auf den Wänden von `RATSCHER`, neu gebaute Dächer mit Überstand, Schornsteine, Fensterlicht (`bld`, `byId`, `ST`, `night()`, `U`) |
| `VPROPS` | world/village_props.js | V16e Ortsmitte: alte Schule mit Dachreiter und Uhr, Dorflinde, Brunnen, Bushaltestelle, Laternen, Ortsnamen (`place`), Geometrie-Baukasten (`kit`) |
| `VNEAR` | world/village_near.js | V16e Nahdetails je 80-m-Zelle, nach Entfernung geladen und verworfen: Zäune, Hecken, Blumenkästen, Tonnen, Holzstapel, Türlampen (`state()`) |
| `VEH`, `VSND`, `MMAP` | vehicles/ | Fahrzeuge (`VEH.add(spec, model)`, `enter/exit/goTo/place/state/follow/reset`, Kameras, Licht, HUD); Fahrzeugtöne; Karte beim Fahren |
| `SITEPLAN`, `PLANNER` | world/siteplan.js, pavilion/plan.js | Draufsicht (Gebäude verschieben, Zäune), Möbel planen, Plan veröffentlichen |
| `GAME` | boot/boot.js | Test- und Steuer-API: `go(spot)`, `view(x,y,z,yaw,pitch)`, `step`, `shot`, `setMode`, `setPhase`, `setVariant` … |

## 7 Assets

- Ordner in `dist/`: `tex/ hdri/ models/ grass/ chars/ snd/ sky/ gi/ pano/ geo/ tree/ img/` + `sv*.png`, `plan.json`, `tour.mp4`.
- Der Build schreibt die Manifeste inline in die Seite (`window.TEXMAN, HDRIMAN, MODELMAN, SNDMAN, SVMAN(_B), VOICEMAN, PANOMAN, SKYMAN,
  CHARMAN, PLAYERMAN, GIMAN_A/_B, MUSICMAN, GEOMAN`) und speichert sie in `viz3/manifests.json` (Schnell-Build ohne Originale).
- Bilder der glTF-Modelle stecken als Data-URI im JSON (ein Artefakt-Stand darf höchstens 511 Dateien haben).
- Erzeugt von Werkzeugen, nicht vom Build: `gi/` (test/gi.py), `sv*.png` (test/bake.py), `time/skydata.js` (tools/nightsky/mk_sky.py).
  Nur noch Bestand auf `gh-pages`, nicht mehr gepflegt (Falko, 22.10.2026; Skripte entfernt): Galeriebilder `img/*.jpg`, 360°-Bilder `pano/`, Raumführung `tour.mp4`.
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
| `pav-veh-v1` | Fahrzeuge: Standort und Richtung je Fahrzeug, Frontlader, Lichtmodus (auto/an/aus) |
| `pav-fell-v1` | Fällen (V16c2): Forstkiste genommen, Bäume in Arbeit/gefällt mit Schnittmaßen und Lage, Holzliste |
| `pav-trailer-v1`, `pav-holz-v1` | Holz (V16d): Anhänger (Lage, angekuppelt); Stämme (wo, Lage), Säge, Bretter mit Feuchte, Stapel, Trockenschrank |
| `pav-v14`, `pav-v15`, `pav-v15b`, `pav-v16a`, `pav-v16b`, `pav-v16c`, `pav-v16c2`, `pav-v16e` | „Neu in …“-Hinweise schon gezeigt |

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
- `world/` – Draufsicht/Planen, Umgebung Ratscher, Straßen und Wege (`roads`), Wald an der Klinge (`forest`), Fällen (`fell`, V16c2), das Dorf nach Fotos (`village`, `village_props`, `village_near`),
  Kollision mit der Umgebung (`worldcol`)
- `time/` – Uhr, Sterndaten, Tag und Nacht
- `werk/` – Schutzausrüstung, Werkstatt-Spiel, Werkstatt-Fenster; Holz vom Stamm zum Brett (`holz`, `holz_saw`, `holz_dry`, V16d)
- `boot/` – Start
- `vehicles/` – Fahrzeug-Kern (`vehicle`: Physik, Ein-/Aussteigen, Kameras, Licht, HUD), Töne (`vsound`), Auto (`car`), Traktor mit Frontlader (`tractor`), Rungenanhänger (`trailer`, V16d), Karte beim Fahren (`minimap`)

## 10 Leistung (gemessen, SwiftShader-Test, test/prof.py)

- Spiel-Logik pro Frame (alle TICKS zusammen) < 0,5 ms; teuerster Posten die GI-Mischung während eines Übergangs (≈ 0,2 ms) und die Spielfigur.
- Szene ≈ 1080 Meshes, ≈ 120 Shader-Programme, ≈ 400 Texturen, JS-Heap ≈ 150 MB. Kosten liegen auf der GPU (Draw-Calls, Schatten, AO).
- Regeln: in TICKS nichts pro Frame allozieren, Arbeit drosseln (Zeitakkumulator), nur bei echter Änderung `markDirty()`;
  große Rechnungen in Teilen über mehrere Frames (Beispiel `giMix`); neue statische Geometrie vor `render/zmerge.js` einhängen oder
  selbst zusammenfassen (InstancedMesh, `BufferGeometryUtils.mergeGeometries`).

## 11 Boden, Straßen, Fahrzeuge (V16b, V16b1)

- **Straßen**: `tools/geo/build_roads.py` liest die OSM-Wege (`<repo>/geo`, Originale), klassifiziert sie (Art: motorway, main, county, street,
  lane, service, track, path, foot; Belag: asphalt, concrete, paving, gravel, ground, grass; Breite; Brücke), vereinfacht sie und schreibt
  `geo/out/pub/roads.b64.json` + den Eintrag `roads` in `geo.json` (→ `dist/geo/`, `manifests.json` `geoman.roads`). Im modellierten Grundstück
  (Zone x −50…42, y −52…48) gelten statt OSM der modellierte Feldweg und ein Verbindungsweg mit Brücke über den Bach (dort im Skript erklärt).
  Route `routes.klinge`: Garten → Anger → Geisenhöhner Weg → Feldweg über die L 1625 → Waldrand → Untere Klinge.
- **Straßenkarte** (`world/roads.js`, beim Laden gerastert, 1,25 m/px bzw. 2 m auf Telefonen): R Abstand zum Straßenrand, G Art×8+Belag,
  B seitlicher Versatz zur Mittellinie, A Phase der Leitlinie (18 m). Die Boden-Shader holen sich `ROADS.shader(sh)` (Uniforms + GLSL) und rufen
  `landDetail(p, farbe, abstand)` (Luftbild entdunstet, helle kalte Flächen wie Acker/Schotter gedämpft und wärmer – `landHi`, auch für
  die modellierten Felder in garden/env.js –, Gras-/Erdkorn aus Detailtexturen in der Nähe) und `roadShade(p, farbe, abstand)` auf
  (Asphalt, Beton, Pflaster, Schotter, Fahrspuren, Bankett, Markierungen). Kein Straßen-Mesh: keine Z-Kämpfe, Kreuzungen fügen sich von selbst.
- **Fahrzeuge** (`vehicles/vehicle.js`): ein Fahrzeug = `VEH.add(spec, model)`. `model`: `g` (Gruppe, Ursprung am Boden unter dem Schwerpunkt,
  x rechts, y vorn), `body` (federnder Teil), `wheels` (`{x, y, r, steer, drive, piv, node}`), `lamps` (`head/tail/brake/rev`: Materialien mit
  Emission), optional `update(v, dt)` (Spielzeit), `key(k, down)`, `save()/load(a)`, `beam` (Lichtquelle lokal). `spec`: Masse, Trägheit, Achsabstände `a/b`,
  Spur, Schwerpunkthöhe, Radradius, Reifensteifigkeit `Cf/Cr`, Haftung, Lenkung (`steerMax`, `steerV`), Motor (`eng.curve` Nm über U/min),
  Gänge, Bremsen, Luftwiderstand, Kasten für Kollisionen (`box`), Augenpunkt (`eye`), Tür (`door`), Kamera, Ton (`petrol`/`diesel`), `home()`.
  Physik 120 Hz (Einspurmodell, Reibkreis je Achse, Automatik ohne Pendeln: hoch nur in einen Gang über der Rückschaltdrehzahl und solange er zieht, zurück erst nach 1,2 s im Gang), Boden aus `ROADS.groundAt`/`ROADS.at`, Kollision mit `WCOL`, `COL`, Fahrzeugen,
  Nachbarn und Huberts Traktor. Kamera: `VEH.applyCam` (aus `game.js applyCam`), Nachführen in Spielzeit (`camTick`). Licht: ein SpotLight für das
  nächste Fahrzeug mit Licht an. Haken in `game/game.js`: `groundZ`, Gehgrenzen (`walkBounds`), Kollision des Gehenden, Kamera, Schattenkasten,
  Ortsnamen; in `game/play.js`: Sitzart `drive`; in `npc/npc.js`: Huberts Traktor wartet, wenn ein Fahrzeug im Weg steht.
  Karte beim Fahren (`vehicles/minimap.js`): 2D-Canvas `#vmap`, Fahrtrichtung oben, Wege nach Art, Route zur Klinge, 10 Hz nur beim Fahren.
- **Detailtexturen der Böden** (`core/detail.js`, V16b1): `DETAIL.tex` ist *ein* `DataArrayTexture` mit allen Kachel-Detailtexturen
  (Ebenen `lawn`, `lawn2`, `gravel`, `forestfloor`, `asphalt`, `needles`, `mossfloor`; 1024 px auf „hoch“, sonst 512, mit Mipmaps), Index über
  `DETAIL.L[name]`. Bis die Bilder geladen sind, liegt ein graues Platzhalter-Array darin. Im Shader: `uniform highp sampler2DArray tDet;`
  und `texture(tDet, vec3(uv, Ebene))` (Straßen-GLSL: `rdTex(ebene, p, kachel, dx, dy)` mit `textureGrad`). Neue Bodentextur: Namen in
  `DETAIL.NAMES` ergänzen, kein neuer Sampler.
- **LOADLOG** (`core/assets.js`, V16b4): Ladeprotokoll – `note(text)` (Schritt mit Zeit; gleiche Art höchstens einmal je Sekunde), `err(e)`, `end()`; steht während des Ladens in `localStorage` (`pav-loadlog`, `open: true`). Brach ein Versuch ab (Absturz, Hänger), kennt der nächste ihn als `LOADLOG.prev`; `boot.js` zeigt unter der Ladeanzeige (`#loadinfo`) die Sekunden, den abgebrochenen Schritt und nach 25 s bzw. mit `?diag=1` die letzten Schritte. Die `whenLoaded`-Rückrufe laufen seit V16b4 einzeln mit Atempause (`flushLoaded`, Zähler „Modell wird aufgebaut … k von n“); was während des Aufbaus registriert wird, läuft wie bisher sofort. `compileShown` übersetzt je Material ein Objekt, in Portionen von 3 neuen Programmen (ohne `KHR_parallel_shader_compile`: eines), und wartet dazwischen per Abfrage, Anzeige „Shader k von n“ (gezählt nach Materialien) – vorher blockierte `compile()` der ganzen Szene die Seite, bis der GPU-Prozess alles übernommen hatte. `prepareGPU` nimmt auf allen Geräten den sparsamen Weg (`RENDER.lite`; `?prep=full` zum Vergleich).
- **Texturen auf Mobilgeräten** (`core/assets.js`, V16b6): `TEXHALF.level` – 0 Rechner, 1 Telefon/Tablet (jedes Bild ab 512 px halb so groß), 2 nach einem abgebrochenen Ladeversuch auf Stufe 1 (ab 512 px ein Viertel, ab 256 px halb; gemerkt in `pav-texlevel`, das Ladeprotokoll speichert `tex`). Verkleinert wird beim Laden: `THREE.ImageLoader.load` (alle `TextureLoader`-Bilder außer `gi/`, `pano/`, `img/`, `sv*.png`) und die glTF-Bilder in `gltfDataURIs` – das Bild wird in eine Canvas gezeichnet, das Original freigegeben. Pixeldaten-Leser (`svLoad`, `giImg`) laden mit `new Image()` und bleiben unberührt. `?tex=full|half|quarter` erzwingt eine Stufe.
- **Fehler zur Laufzeit** (V16b5): Ein Fehler in einem Bild beendet die Schleife nicht mehr (`game/game.js` `frame` → `frame0` in `try`, dasselbe höchstens alle 5 s gemeldet über `reportError`). Der erste Fehlerhandler aus `build.py` zeigt „Das 3D-Modell konnte nicht geladen werden“ nur noch während des Ladens (`window.PAV_LOADED` setzt `hideLoading`); danach nennt `boot.js` den Fehler höchstens alle 30 s als kurzen Hinweis, `LOADLOG.err` schreibt ihn nach `pav-loadlog` (`errs`). `core/assets.js` verwirft nicht endliche Werte an `AudioParam` (`setTargetAtTime`, `setValueAtTime`, Rampen, `value`) statt zu werfen. `vehicles/vehicle.js` setzt ein Fahrzeug mit NaN/unendlichem Zustand auf den letzten guten zurück (`sane`), `circBox`/`sat` werten NaN als „kein Treffer“. `WCOL.removeTree` nimmt einen gefällten Stamm aus seiner Zelle (bis V16b5 NaN – der Absturz nach dem Fällen). Test: `test/fellcrash.py`.
- **GLINFO** (`render/render.js`, V16b2): Name des Renderers (`WEBGL_debug_renderer_info`), `soft` bei Software-Grafik (SwiftShader, „Basic Render Driver“, llvmpipe). `prepareGPU` nimmt dann sofort die Stufe „schnell“ und misst nicht (die Messung kostete dort Minuten); sonst entscheidet zuerst ein einzelnes Probebild (> 250 ms → „schnell“). Die Ladeanzeige nennt die drei Schritte (Shader, Texturen, Grafikkarte); `LM.onProgress` überschreibt sie nach dem Laden nicht mehr. Test: `test/softgl.py` (ohne Stufen-Voreinstellung).
- **Laden ohne Einfrieren** (V16b3): Während der Ladeanzeige zeichnet die Schleife (`game/game.js` `frame`) nichts. `prepareGPU`: `compileShown` (alle Programme über `compileAsync`, Fortschritt per `KHR_parallel_shader_compile`/`COMPLETION_STATUS_KHR` ohne Warten, „Shader k von n“; weiter erst, wenn 60 s nichts fertig wird), `uploadTextures` (einzeln mit `R.initTexture`, Pause alle 40 ms; Software-Grafik nur, was im ersten Bild liegt), dann das erste Bild (mit Grafikkarte wie bisher einmal ohne Culling). `LOAD.alive` = letzter Fortschritt (Dateien, Schritte); die Notbremse in `boot/boot.js` öffnet erst nach 2 min ohne Fortschritt. `LM.onLoad` zeigt „Modell wird aufgebaut …“ und ruft die `whenLoaded`-Rückrufe 40 ms später (`LOAD.finished` erst dann). Software-Grafik: Sonnenschatten 1024² mit PCF statt PCF-Soft.
- **GLCHECK** (`core/detail.js`): `GLCHECK.run(limit)` zählt nach dem Kompilieren die aktiven Sampler-Uniforms jedes Programms und meldet
  Programme, die nicht linken. `GLCHECK.guard()` läuft am Ende von `prepareGPU`: Erlaubt die GPU weniger Texturen, als ein Programm braucht,
  schaltet er auf `lite` (Bodenshader ohne Straßen- und Kornteil, `ROADS.shader` liefert `S.STUB`) und lässt die Materialien neu bauen –
  der Boden wird einfacher, verschwindet aber nicht.
- **Auto** (`vehicles/car.js`, V16b1): generischer Kombi in Logan-MCV-Proportionen (4473 × 1740 × 1640 mm, Radstand 2905), Karosserie als
  Profil-Extrusion (Unterteil, Fensterband, Dach), Teile vorn auf der gemessenen Frontfläche (`frontAt`), geteilte Hecktüren, Dachreling,
  Ladefläche `model.load` (`y0…y1`, `z`, halbe Breite, Höhe) für spätere Ladung (V16d).

## 11b Wald an der Klinge (V16c)

- **Bestand** (`world/forest.js`, `FOREST`): der Nordwest-Lappen des großen Walds südlich der L 1625 (`LOBE`, 16,8 ha, ALKIS „Nadelholz“),
  darin der vermutete Familienwald `CORE` (2,3 ha an der Wegekreuzung J). `world/ratscher.js` gibt die Bäume des Kronenhöhenmodells in diesem
  Lappen ab (`RATSCHER.forestCHM`, ~2300 herrschende Bäume) statt sie als Baumbilder zu zeichnen; dazwischen pflanzt das Modul den Rest
  (Raster 3,6 m mit Zufall, Höhen nach den gemessenen Nachbarn, Unterstand, Jungwuchs in Lücken) – deterministisch, ~9300 Bäume.
  Arten: Fichte (Kammfichte mit hängenden Zweigen), Lärche (licht, schlank), Kiefer (Spiegelrinde oben); je Art „Bestand/Rand/Jung“.
- **Modelle**: prozedural (Stamm mit Rinde, Quirle aus Nadelzweig-Karten aus `public/tree/fir_twig_color.png`, Totäste unten) in drei
  Stufen: nah (bis 34–44 m, Schatten), mittel (bis 140–175 m), fern (Kreuzkarten aus einem beim Laden gerenderten Atlas, Seiten- und
  Draufsicht). Übergänge mit Bildschirm-Dither über einige Meter; außerhalb ihres Bandes klappt eine Stufe ihre Ecken zusammen (kein Overdraw).
  Der Atlas wird erst gezeichnet, wenn Zweig- und Rindenbilder geladen sind (sonst schwarze Stämme ohne Nadeln). Radien: `LODS` je Grafikstufe.
- **Licht und Boden**: Kronenraster 2 m (`tCan`, Rohsummen in `S.cov`): unter den Kronen Nadelstreu mit Moosflecken (Ebenen `needles`,
  `mossfloor` im `DETAIL`-Array – kein eigener Sampler), außerhalb des Sonnenschatten-Kastens gedämpfte Sonne, Himmelslicht grün-braun
  getönt statt blau (`FOREST.LIGHT` im Geländeshader, `vShade` in den Baum-Shadern). In der Ferne übernimmt das Luftbild.
- **Jahreszeit**: Lärchen nach dem Spieldatum (`seasonOf`): frisches Grün ab Mitte April, gelb-golden ab Mitte Oktober, Nadelfall im
  November, kahl im Winter (`uSeas`; auch der Fernatlas wird neu gezeichnet).
- **Bodendeckung** nah an der Kamera: Farne, Stubben, liegendes Totholz (glTF, instanziert). Stämme sind Hindernisse (`WCOL`, `FOREST.trunks`).
  Ortsnamen „Die Klinge – Familienwald“ / „Wald an der Klinge“ (`FOREST.place` → `ROADS.place`), Wind und Vögel (`FOREST.amb` → `audio`).
- **Schnittstellen für das Fällen** (V16c2): `FOREST.model(m)` (Geometrie und Stammprofil `rAt`), `trunkR(t, z)` (Radius in Weltmetern),
  `soloMats(sp, U)` (Materialien für einen einzelnen Baum: Rinde unter `uCut` verborgen, Karten unter `uDelimb` weg), `patchSolo`, `hide(t)`
  (aus Instanzen, Fernkarte, Kollision und Kronenraster nehmen).
- **Fällen** (`world/fell.js`, `FELL`, V16c2): Forstkiste am Traktor (`fell:kit`: Forst-PSA in `GEAR` mit Feldern head/body/legs/feet/hands,
  Motorsäge in `PLAY.things.motorsaege`, Keile, Maßband, Kluppe), vom Förster markierte Bäume (`S.marked`, orange Striche), Ablauf je Baum
  `S.trees[id].st`: plan → Fallkerb (Sohle, Dach) → Splintschnitte → Warnruf → Fällschnitt als Stechschnitt (Bruchleiste ~1/10 Ø) → Keil →
  Warnruf → Halteband → fallen (`outcome`, `landing`: Richtung, Abweichung, Reißen, Sterne) → entasten → Stammfuß, Zopf → ablängen (Druckseite
  zuerst) → vermessen (`S.logs`: Länge, Mittendurchmesser, Festmeter, Güte). Der Stammfuß des Baums in Arbeit wird hier gebaut (Rinde,
  Schnittflächen mit Jahrringen, Fallkerbstück, Keil), der Rest ist das Waldmodell (`FOREST.soloMats`). Waldbuch mit Taste B, Maschinenfenster
  mit Zeichnung (`WUI.machine({ fig })`). Kleidung: Warnjacke, Schnittschutzhose, Stiefel und Handschuhe färben die eigene Kleidung der Figur
  nach Körperzonen um (`game/avatar.js` `wearZones`, Hautgewichte), der Helm ist ein eigenes Modell; von hinten (3. Person) zeigt die Säge am
  Schnitt (`cutSaw`). Speicher `pav-fell-v1`.

## 11c Holz: vom Stamm zum Brett (V16d)

- **Anhänger** (`vehicles/trailer.js`, `TRAILER`): Rungenanhänger mit Tandemachse (Ladefläche 4,4 × 2,0 m, vier Rungen je Seite, Stirngitter,
  Zugdeichsel mit Öse 4,1 m vor der Achsmitte, Stützfuß). Kein eigenes VEH-Fahrzeug: angekuppelt läuft die Achse auf einer Schleppkurve hinter
  dem Zugpendel des Traktors her (Deichsellänge bleibt, kein Querschlupf), Knickwinkel höchstens 75°; die Ladefläche stößt über
  `VEH.boxHits` an Wände, Stämme, Gartenobjekte und hält den Traktor zurück. Abgestellt ist sie ein Hindernis (`VEH.extra`), auch für Fußgänger.
  Masse und Ladung zieht der Traktor mit (`spec.tow` in `VEH.step`: Trägheit, Rollwiderstand, Hang, Auflaufbremse). Kuppeln mit K (Knopf am
  Tacho) oder zu Fuß an der Deichsel. `TRAILER.local(p)`, `TRAILER.slot(x, r)` (Querschnitt: ein Stamm rollt in die tiefste Lücke zwischen den
  Rungen), `TRAILER.cargo`/`cargoH` (von HOLZ gesetzt).
- **Stämme** (`werk/holz.js`, `HOLZ`): übernimmt die vermessenen Abschnitte aus `FELL.logs` (FELL blendet seine eigenen Stammstücke dann aus,
  `FELL.hideLogs`). Gezeichnet instanziert je Holzart (Rinde + Hirnholz, zwei Draw-Calls für alle Stämme; Form aus `iLog`: Radius unten/oben,
  Länge). Zustände: `ground` (Boden, auf anderen Stämmen, auf den Unterlegern im Holzlager nördlich der Säge), `fork`, `trailer`, `saw`,
  `sawn`. Gabel (`TRACTOR2.model.fork`, Zinken bis zum Boden `LD.min`): beim Heben mit den Zinken unter einem quer liegenden Stamm liegt er auf
  der Gabel; beim Senken bleibt er dort liegen, wo er aufsetzt (Boden, Stamm, Anhänger zwischen den Rungen, Blockbandsäge). Ungekippte Gabel
  und hartes Bremsen: er rollt herunter. Auf der Gabel stößt er an wie ein Fahrzeug. Beim Senken kommt er bis 30 cm über seiner Ablage von
  den (zurückgekippten) Zinken (`HOLZ.SETTLE`); liegend ruht er auf dem Höchsten darunter (`restOn`: entlang des Stamms abgetastet).
  Die Gartenbrücke trägt Fahrzeuge (`ROADS.groundAt`); unsichtbare Führungen (`VEH.extra`, `guide`) an ihren Kanten halten **nur die Räder**
  (`VEH.guideHits` mit `VEH.wheelBox`: Spur, Reifenbreite, Radius aus dem Modell) und nur so weit, wie der Graben darunter liegt (±2,1 m der
  6,2 m langen Platte, an den Enden aufgeweitet) – Frontlader, Ladung und Ladefläche dürfen über den Rand ragen. Damit kommen Traktor und
  Anhänger von der Brücke zwischen den zwei Gartenbäumen dahinter auf den Weg (Test `v16d.py bridge`: Pure Pursuit `VEH.follow(pts, v, { look })`
  vom Feldweg bis ans Holzlager).
- **Kollision Traktor** (`model.colParts` → `VEH.collide`): Rumpf bis zu den Frontgewichten in voller Höhe, davor der Frontlader nur so hoch,
  wie Geräteträger und Zinken gerade stehen – gehoben greift die Gabel über das Bett der Säge oder die Ladefläche (deren Box reicht nur bis
  knapp unter den Boden). Ohne `colParts` (Auto) bleibt es die eine Box aus `spec.box`.
- **Abladen** (`HOLZ.unload`, zu Fuß an der Rückseite oder vorn am Anhänger): wie beim echten Rungenwagen werden die Rungen der anderen Seite
  geöffnet, die Stämme rollen nebeneinander ab – steht der Anhänger längs neben dem Holzlager, direkt auf dessen Kanthölzer. Seite: weg von dem,
  der öffnet; aus der Mitte zum Holzlager hin, sonst rechts.
- **Blockbandsäge** (`werk/holz_saw.js`, `HOLZSAW`): das Modell aus V15b (`garden/workshop.js`, Sägeaggregat jetzt als Gruppe `SAW.unit`
  höhenverstellbar). Festklemmen, Einschnitt planen (24/30 mm Bretter, 40/52 mm Bohlen; Zeichnung des Zopfendes mit den Schnitten), Schwarte,
  dann Schnitt für Schnitt (Schnittfuge 2 mm) bis 3 cm über die Bänke. Bretter mit Baumkante (`boardGeos`: gesägte Flächen, Rinde, Hirnholz;
  `mergeSet` fasst sie je Stapel zu drei Meshes zusammen), Blockware je Stamm neben der Säge. Jedes Brett: Stärke, Breiten an beiden Enden,
  Herzbrett, Frischfeuchte nach seiner Lage im Stamm (Fichte Splint ~140 %, Kern ~50 %; Lärche schmaler Splint).
- **Trocknen** (`werk/holz_dry.js`, `HOLZDRY`): Stapel nördlich der Werkstatt (Unterbau 15/45 cm, Leisten alle 50/100 cm, Fuge, Hirnholzschutz,
  Dach mit Gewicht). Klima Meiningen (DWD 1991–2020): Monatsmittel Temperatur und Gleichgewichtsfeuchte (13 % Sommer, 21 % Winter); je Brett
  täglich `u ← E + (u − E)·exp(−k)` mit k aus Dicke^1,5, Temperatur, Holzart (Lärche ×0,6), Lage im Stapel, unter Fasersättigung halb so
  schnell. Fehler: Bläue (nasser warmer Splint, wenig Luft), Endrisse (ohne Hirnholzschutz), Verzug (Leisten zu weit, kein Gewicht), Herzriss.
  Feuchtemesser (Werkzeug von der Hobelbank: Holzartengruppe, Temperaturkorrektur, genau 6–30 %), Zeitraffer über `CLOCK.wait`, Kurve im
  Fenster. Trockenschrank an der Westwand der Werkstatt (Entfeuchter, 8 %): ab ≤ 20 % lufttrocken auf 9 %, dann Bohlen ab 35 mm als
  Leimholzplatten ins Werkstattregal (`WERK.addOwn`, Lärche/Fichte statt Eiche: `softCol`, Räuchern wirkt kaum).
- Kollisionen der Holzplätze (Blöcke, Stapel, Schrank) als `COL`-Einträge mit Tag (`HOLZ.setCol`, Gitter neu). Speicher: `pav-trailer-v1`,
  `pav-holz-v1`. Test `test/v16d.py`.

## 12 Erweitern – Beispiel neues Fahrzeug

1. Datei `src/vehicles/<name>.js` nach dem Muster von `car.js` (Modell bauen, `spec` mit Physikwerten, `return VEH.add(spec, model)`),
   Zeile in `src/modules.txt` nach `vehicles/vehicle.js`.
2. Eigene Tasten über `model.key(k, down)` (belegt: E, Q, V, L, H, Leertaste, R/G/T beim Traktor, F Vollbild, M, I, J, B, C, X, Z, Ziffern);
   Knöpfe im HUD (`shell/panel_3d.html` `#vhud`, `data-vb`).
3. Test in `viz3/test/v16b.py` ergänzen (Abschnitte wählbar), Eintrag in docs/CHANGELOG.md.
4. Allgemein für neue Module: IIFE, API auf `window`, Pro-Frame-Arbeit über `window.TICKS`, Aktionen über `PLAY.act`, Spielstand mit eigenem
   `pav-…-v1`-Schlüssel (Abschnitt 8), Texte deutsch, Quellen in `buildlib/credits.py`.

## 13 Das Dorf nach Fotos (V16e)

- **Grundlage**: die 337 Gebäude aus `world/ratscher.js` (OSM-Grundrisse, Höhe und Dachform aus dem Oberflächenmodell). Die Wände bleiben dessen
  Geometrie (Quads `[A Fuß, A oben, B Fuß, B oben]`, `aW` = u um den Grundriss, v über dem Fuß, Oberkante, 4·id+Typ); `ratscher.js` bleibt
  unverändert. `VILLAGE` liest die Meshes nach dem Aufbau (`whenLoaded`, Modul-Reihenfolge vor `worldcol.js`), fasst kollineare Quads zu
  Fassaden zusammen (Traufe, Giebel mit First, Pultseite), gibt jedem Gebäude einen Stil (`styleOf`: Typ, Größe, Nähe zum Anger, Zufall aus
  der Nummer; die alte Schule = Gebäude 215) und setzt neue Attribute: `aV` (u auf der Fassade, Länge, Traufhöhe, Stil), `aG` (Oberkante:
  Anfang, First und seine Lage, Ende), `aD` (Tür/Tor, Achsabstand, Bits: Giebel, Läden, Ornament, Hochparterre), `aC` (Farbe, Indizes für
  Holz, Rahmen, Tür, Läden), `aTan` (Wandrichtung). **Ganzzahlige Codes im Shader runden** (`floor(x + 0.5)`) – interpoliert kommen sie
  einen Hauch daneben heraus, sonst flackern Bits pixelweise.
- **Fassaden-Shader** (`wallMat`): Fensterachsen gleichmäßig über die Fassade, ein Fenster nur, wo es unter Traufe/Giebellinie passt (so
  entstehen Dachfenster im Giebel von selbst); Schiefer mit Schuppen und Rauten, Fachwerk (Schwelle, Rähm, Riegel, Pfosten an den
  Fenstern, Streben in den Endfeldern), Bretter, Ziegel, Blech, Putz mit Sockel. **Fenster mit Tiefe ohne Geometrie**: Der Sehstrahl wird in
  das Wandsystem (u, v, Normale) umgerechnet; trifft er die Laibung, bekommt das Pixel deren Normale (die Sonne beleuchtet sie richtig),
  sonst Glas, Rahmen, Sprossen, Gardinen in der Glasebene. Fern: Mittelwerte statt feiner Linien (`fwidth`). Nachts: Fensterlicht nach
  Uhrzeit (`uWinP`), die acht nächsten Laternen beleuchten die Wände (`uLampV`, Sichtraum).
- **Dächer**: die angepassten Dreiecke je Grundriss neu gebaut. Ecken auf dem Umriss rücken nach außen (Traufe 0,45 m, Ortgang 0,3 m) und
  in ihrer Dachebene nach unten; dazu Untersicht, Stirnbrett, Rinne mit Fallrohr, Firstziegel, Schornstein. Dachfarbe aus dem Luftbild
  (Median im Grundriss, Schatten und Glanz weggelassen) → Tonziegel, Faserzement, Blech, Schiefer oder Flachdach mit Attika.
- **Ortsmitte** (`VPROPS`): Geometrie aus dem Baukasten `kit()` (Lage in Grundstücks-Koordinaten, uv in Metern, Vertexfarben); Dorflinde aus
  `buildTreeKind` (Transform in die Geometrie gebacken: `VEG.lod` und Frustum lesen die Kugel als Weltraum), die gemessenen Kronen dort werden
  ausgeblendet. Laternen als `InstancedMesh` entlang der OSM-Straßen nahe Häusern; Lichtflecken additiv. Kollision: Segmente und Pfosten
  werden vor `WCOL.build` an `RATSCHER.walls`/`treeXY` gehängt.
- **Nahdetails** (`VNEAR`): je 80-m-Zelle ein Mesh, gebaut wenn die Kamera auf 95 m herankommt (eine Zelle pro Takt), verworfen ab 170 m und in der
  Draufsicht. Fensterlage für Blumenkästen wie im Shader (gleiche Achsen-Regel). Neues Detail: in `house()` ergänzen, Material-Arten über `aK`.
- Texturen je Programm (`GLCHECK`): Fassaden 5, Dächer 7, Requisiten 3, Nahdetails 2.
