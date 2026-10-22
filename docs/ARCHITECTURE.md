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
| `pav-veh-v1` | Fahrzeuge: Standort und Richtung je Fahrzeug, Frontlader, Lichtmodus (auto/an/aus) |
| `pav-fell-v1` | Fällen (V16c2): Forstkiste genommen, Bäume in Arbeit/gefällt mit Schnittmaßen und Lage, Holzliste |
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
- `werk/` – Schutzausrüstung, Werkstatt-Spiel, Werkstatt-Fenster
- `boot/` – Start
- `vehicles/` – Fahrzeug-Kern (`vehicle`: Physik, Ein-/Aussteigen, Kameras, Licht, HUD), Töne (`vsound`), Auto (`car`), Traktor mit Frontlader (`tractor`), Karte beim Fahren (`minimap`)

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
