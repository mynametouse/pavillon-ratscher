# Stufe 3 – Arbeitsplan (nach V15b)

Reihenfolge (Zwischenversionen, jeweils veröffentlichen):
1. **V16a Tag/Nacht – FERTIG (21.10.2026)** an CLOCK gekoppelt (src/33_skydata.js, 34_daynight.js; GI-Mischung in 09_render.js; weiche GI-Kanten + Lampen-Maske in 01_assets.js): Sonnenstand für Ratscher (50,47° N, 10,78° O) nach Datum/Uhrzeit, kontinuierliche Licht-Interpolation
   zwischen Schlüsselbildern (Nacht/Dämmerung/Gold/Tag), Nacht neu (Mond, Sterne, Lampen an). Umsetzung:
   - Sky: photoSkyMat um zweite Textur + Mischfaktor erweitern; Nachthimmel prozedural (Sterne, Mond).
   - Env: zwei PMREM-Ziele per Vollbild-Shader mischen (gleiches CubeUV-Layout) → gemischtes RT als scene.environment, nur bei Änderung > 2 %.
   - GI (baked, GIMAN per Modus): zwischen zwei Sätzen mischen (Shader-Chunk erweitern) oder Schwelle; Nacht: GI ~0.
   - Lampen (MODES.L), Ofen, Papier, Screen: interpolieren; Straßenlaternen Ratscher nachts an.
   - Schatten: Sonnenrichtung in 0,5°-Schritten (Shadow-Map-Update), nachts Schatten aus/Mond schwach.
   - Menü „Licht“: „Tageslauf (Uhr)“ + feste Modi.
2. **V16b Fahrzeuge**: eigenes Auto (generische Stufenheck-Limousine in Logan-Größe 4290×1740×1525, Farbe „Beige Sable“ #A89F88 metallic,
   keine Marken-Logos/Design-Details), Traktor mit Frontlader/Palettengabel. Ein-/Aussteigen (E/Q), Fahrphysik (Fahrradmodell, Gelände-Höhe
   aus RATSCHER.hAt + floorAt, Kollision COL/Gebäude), Verfolgerkamera, Motorgeräusch (Auto synth., Traktor Aufnahme), Scheinwerfer nachts.
   Startplätze: Auto vor dem Garten (Nordtor, Zufahrt), Traktor an der Klinge (Kreuzung J).
3. **V16c Klinge**: Waldstück bei Modell (−458, −597) (Kern 2,3 ha, Nadelholz/Lärche, Nordhang ~12 %), Wegkreuzung J (−579, −590);
   Route Garten → Anger → Geisenhöhner Weg → Feldweg → L 1625 queren (−157, −410) → Waldweg (research/klinge_geo.json).
   Bäume (Fichte/Lärche/einzelne Eichen) instanziert + LOD; fällbare Bäume.
   Motorsäge + PSA (Schnittschutzhose, Helm mit Visier+Gehörschutz, Schnittschutzschuhe, Handschuhe); Fällen: Fällrichtung, Rückweiche,
   Fallkerb (Sohle + Dach, 1/5–1/3 Ø), Bruchleiste (1/10 Ø), Fällschnitt mit Halteband/Sicherheitsband, Keil, Ruf „Achtung, Baum fällt!“.
   Entasten, Ablängen (Kluppe, Maßband: 2,5 m / 4 m), Polter am Waldrand.
4. **V16d Stämme → Bretter → Trocknen**: Traktor-Gabel heben/stapeln, Anhänger, zum Holzlager (Werkstatt West), auf die Blockbandsäge;
   Einschnitt in Bohlen/Bretter (Stärke wählen), stapeln mit Stapelleisten (Luftfeuchte, Dach), Trocknung: frisch Eiche ~70 % → Luft ~1 Jahr je
   25 mm auf ~15 %, Trockenkammer auf 8–10 %; Feuchtemesser; Zeitraffer. Fertige Bohlen → Werkstatt (Stirnholzbrett aus eigenem Holz).
5. **V16e Dorf**: Ratscher nach Fotos (research/ratscher_photos, ratscher_roofs.json): Fassaden (Schiefer, Fachwerk, Putz pastell),
   Ziegeldächer, Dorfbrunnen, Dorflinde (1888), alte Schule mit Glockentürmchen; Straßenlaternen; Streaming/LOD für Performance.

Recherche: research/klinge.md, klinge_geo.json (Polylinien Route, Waldrand, Kandidatenflächen, Höhenprofil), dl_car/ (Logan-Fotos),
dl_paint/ (Farbtafeln), ratscher_photos/.

## V16a – umgesetzt
- Kalender: Spieltag 1 = Mo 1. Juni 2026 (DN.e0, 'pav-dn-v1'), MEZ/MESZ-Regel, Datum im Uhr-Fenster (Monat ±, Heute).
- Sonne NOAA (+ Refraktion, gegen PyEphem auf ±1 min geprüft), Mond Almanac-Kurzreihe (Topozentrik, Phase), Sterne Hipparcos ≤ 6m + Milchstraße (d3-celestial, BSD-3, Lizenz im Credits-Block).
- Schlüsselbilder nach Sonnenhöhe: 35° Tag, 8° Gold, 1,5° Gold+Abendlicht, −2,5° Dämmerungsfoto, −7° blaue Stunde, −14° Nacht (KF in 34_daynight.js).
- Himmel: zwei Fotos überblendet, Elevations-Warp (Fotosonne auf echte Höhe), Nachtverlauf, Milchstraße, Mondscheibe mit Phase/Maria, Halo. Sterne als THREE.Points (renderOrder −9).
- Env: zwei PMREM-Ziele per texelFetch-Shader gemischt (+ Tönung), GI: CPU-Mischung 8 Schichten/Frame (Ping-Pong), GI.tint, weiche Box-Kanten (1,5 m).
- Licht nachts: Mond als Richtungslicht (0,11 × Phase^3,5), Lampen automatisch (MODES.auto.L), Werkstatt-LED mit Bewegungsmelder (WLAMP), Grillen (Mai–Sep), NPC nachts daheim (22–6 Uhr, nur wenn nicht im Blick), Schlafen auf Liegen (bis 7 Uhr).
- Offen/später: Straßenlaternen + Fensterlicht im Dorf (V16e), Jahreszeiten der Vegetation, Wolkenzug/Wetter.
