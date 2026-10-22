# Stufe 3 – Arbeitsplan (nach V15b)

Reihenfolge (Zwischenversionen, jeweils veröffentlichen):
1. **V16a Tag/Nacht – FERTIG (21.10.2026)** an CLOCK gekoppelt (src/time/skydata.js, time/daynight.js; GI-Mischung in render/render.js; weiche GI-Kanten + Lampen-Maske in core/assets.js): Sonnenstand für Ratscher (50,47° N, 10,78° O) nach Datum/Uhrzeit, kontinuierliche Licht-Interpolation
   zwischen Schlüsselbildern (Nacht/Dämmerung/Gold/Tag), Nacht neu (Mond, Sterne, Lampen an). Umsetzung:
   - Sky: photoSkyMat um zweite Textur + Mischfaktor erweitern; Nachthimmel prozedural (Sterne, Mond).
   - Env: zwei PMREM-Ziele per Vollbild-Shader mischen (gleiches CubeUV-Layout) → gemischtes RT als scene.environment, nur bei Änderung > 2 %.
   - GI (baked, GIMAN per Modus): zwischen zwei Sätzen mischen (Shader-Chunk erweitern) oder Schwelle; Nacht: GI ~0.
   - Lampen (MODES.L), Ofen, Papier, Screen: interpolieren; Straßenlaternen Ratscher nachts an.
   - Schatten: Sonnenrichtung in 0,5°-Schritten (Shadow-Map-Update), nachts Schatten aus/Mond schwach.
   - Menü „Licht“: „Tageslauf (Uhr)“ + feste Modi.
2. **V16b Fahrzeuge – FERTIG (22.10.2026)**: eigenes Auto (generischer Kombi in Logan-MCV-Größe 4473×1740×1640, Radstand 2905 – seit V16b1, vorher Stufenheck; Farbe „Beige Sable“ #A89F88 metallic,
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
5. **V16e Dorf – FERTIG (22.10.2026, parallel zu V16c)**: Ratscher nach Fotos (research/ratscher_photos, ratscher_roofs.json): Fassaden (Schiefer, Fachwerk, Putz pastell),
   Ziegeldächer, Dorfbrunnen, Dorflinde (1888), alte Schule mit Glockentürmchen; Straßenlaternen; Streaming/LOD für Performance.

Recherche: research/klinge.md, klinge_geo.json (Polylinien Route, Waldrand, Kandidatenflächen, Höhenprofil), dl_car/ (Logan-Fotos),
dl_paint/ (Farbtafeln), ratscher_photos/.

## V16a – umgesetzt
- Kalender: Spieltag 1 = Mo 1. Juni 2026 (DN.e0, 'pav-dn-v1'), MEZ/MESZ-Regel, Datum im Uhr-Fenster (Monat ±, Heute).
- Sonne NOAA (+ Refraktion, gegen PyEphem auf ±1 min geprüft), Mond Almanac-Kurzreihe (Topozentrik, Phase), Sterne Hipparcos ≤ 6m + Milchstraße (d3-celestial, BSD-3, Lizenz im Credits-Block).
- Schlüsselbilder nach Sonnenhöhe: 35° Tag, 8° Gold, 1,5° Gold+Abendlicht, −2,5° Dämmerungsfoto, −7° blaue Stunde, −14° Nacht (KF in time/daynight.js).
- Himmel: zwei Fotos überblendet, Elevations-Warp (Fotosonne auf echte Höhe), Nachtverlauf, Milchstraße, Mondscheibe mit Phase/Maria, Halo. Sterne als THREE.Points (renderOrder −9).
- Env: zwei PMREM-Ziele per texelFetch-Shader gemischt (+ Tönung), GI: CPU-Mischung 8 Schichten/Frame (Ping-Pong), GI.tint, weiche Box-Kanten (1,5 m).
- Licht nachts: Mond als Richtungslicht (0,11 × Phase^3,5), Lampen automatisch (MODES.auto.L), Werkstatt-LED mit Bewegungsmelder (WLAMP), Grillen (Mai–Sep), NPC nachts daheim (22–6 Uhr, nur wenn nicht im Blick), Schlafen auf Liegen (bis 7 Uhr).
- Offen/später: Straßenlaternen + Fensterlicht im Dorf (V16e), Jahreszeiten der Vegetation, Wolkenzug/Wetter.

## V16b – umgesetzt
- Straßen und Wege aus OSM (tools/geo/build_roads.py → geo/roads.b64.json, 250 Wege, 45 km im befahrbaren Quadrat 2,4 km): Art, Belag, Breite,
  Brücken; im modellierten Grundstück der Feldweg und ein Verbindungsweg mit kleiner Brücke über den Bach zum Weg ins Dorf.
- Straßenkarte beim Laden gerastert (world/roads.js), im Boden-Shader: Asphalt (Textur, Flicken nach dem Luftbild), Beton, Pflaster, Schotter,
  Erdwege mit Fahrspuren, Bankett, Rand- und Leitlinien (L 3004, Kreisstraße, A 73); Luftbild entdunstet, Gras-/Erdkorn in der Nähe.
- Brücken mit Deck und Geländer (Höhe gerade zwischen den Enden), Bäume nicht mehr mitten auf Wegen.
- Fahrzeuge (vehicles/): Einspurmodell 120 Hz mit Reifenschlupf, Reibkreis, Automatik, Rückwärts per Bremse im Stand, Handbremse, Haftung nach
  Belag/Wiese/Acker, Federung, Kollision mit allen Gebäudewänden, Stämmen, Geländern, Gartenobjekten, Nachbarn, Günters Traktor.
- Auto: Kombi in Logan-MCV-Größe (seit V16b1; Ladefläche ~1,6 m bis zur Rückbank, geteilte Hecktüren, Dachreling), Beige Sable metallic, ohne Markenzeichen, Innenraum; Kennzeichen HBN (ausgedacht). Parkt neben dem Feldweg.
- Traktor: ~100 PS, Allrad, Kabine, Frontlader mit Parallelführung und Palettengabel (R/G/T); steht an der Unteren Klinge.
- Kamera hinterher (folgt, Maus schaut um) oder Fahrersicht (V/Mausrad), Licht automatisch nachts (ein Spot), Bremslichter, Rückfahrlicht,
  Motor-/Reifen-/Wind-/Hupenton (synthetisch, Traktor aus der Aufnahme), Tacho, Kleinkarte mit Route und Ziel, Ortsnamen unterwegs.
- Gehen im ganzen Quadrat (Gelände, Wände, Stämme, geparkte Fahrzeuge), Menü „Zum Auto“/„Zum Traktor“/„Fahrzeuge zurückstellen“; am Telefon
  Kreis links (Gas/Bremse/Lenken), Knöpfe am Tacho, Antippen zum Ein-/Aussteigen.
- Offen/später: Verkehr, Straßenlaternen und Dorf nach Fotos (V16e), Wald an der Klinge in 3D (V16c), Anhänger/Lasten (V16d).

## V16e – umgesetzt
- Vorlage: 17 Fotos auf Wikimedia Commons (Kategorie „Ratscher (Schleusingen)“: Aschroet 1.8.2026 CC0 mit Kamerastandort, Störfix 2013,
  Michael Köhler 1986/1997), OpenStreetMap (amenity=fountain, Brunnen, Bushaltestelle mit Wartehäuschen, Briefkasten, Bänke,
  Straßennamen, Hausnummern), Wikipedia (alte Schule 1828 mit Glockenturm, heute Vereinsheim der Feuerwehr; Dorflinde gepflanzt 1888).
- Fassaden-Shader auf den Wänden aus `ratscher.js` (die Datei bleibt unverändert): Schiefer (ganz, nur oben, nur Giebel; weiße Rauten),
  Fachwerk (ganz oder Obergeschoss; Dunkelbraun, Ochsenblutrot, Schwarz), Putz pastell, Neubau-Putz mit großen Fenstern, Scheunen aus
  Brettern auf Mauersockel, Ziegel, Hallen aus Trapezblech. Fenster mit Laibung (Sehstrahl im Wandsystem), Rahmen, Flügeln, Kämpfer,
  Gardinen, Sohlbank, manchmal Läden; Türen und Tore zur nächsten Straße (Straßenkarte). Dächer neu: Überstand an Traufe und Ortgang,
  Untersicht, Stirnbrett, Rinne, Fallrohr, Firstziegel, Schornstein; Farbe aus dem Luftbild je Gebäude; Flachdächer grau mit Attika.
- Alte Schule (Gebäude 215): rotes Fachwerk, Schiefergiebel, Dachreiter (Schiefer, Uhr mit Spielzeit auf vier Seiten, Schallläden,
  welsche Haube, Kugel, Wetterfahne), Sirene, Ziegel-Schornstein, Tür an der Südseite. Dorflinde 21 m, Bankring, Pflaster; Brunnen
  (versenktes Sandsteinbecken, Stufen, Blumen) auf gepflastertem Platz mit Bordstein, Bank und Laterne; Wartehäuschen mit H-Schild,
  Briefkasten, Wegweiser. Laternen (Laternenkopf wie auf dem Foto) an den Dorfstraßen nahe Häusern, nachts mit Lichtflecken und Licht
  an den Wänden (acht nächste); Fensterlicht nach Uhrzeit.
- Nahdetails nach Entfernung (80-m-Zellen, laden ab 95 m, verwerfen ab 170 m): Zäune und Hecken zur Straße mit Gartentor, Briefkasten,
  Blumenkästen, Mülltonnen, Holzstapel, Türlampe, blaue Hausnummer, Satellitenschüssel.
- Ortsnamen beim Gehen („Ratscher · Dorflinde am Anger“, „… · Alte Schule (1828)“, Straßen aus OSM), Menüort „Dorf“. Kollision mit Brunnen,
  Laternen, Linde, Wartehäuschen, Bänken.
- Offen/später: Bäume im Dorf in 3D nahe der Kamera (mit dem Wald-LOD von V16c abstimmen), Gauben, Fassaden einzelner Häuser nach
  Falkos eigenen Fotos (Stil je Gebäudenummer in `styleOf`), Verkehr.
