# Grenzland – Fahrzeuge und Cockpits (Hilfs-Agent `grenzland-auto`)

Branch `feat/grenzland-auto`, Auftrag `docs/plans/auftraege/grenzland-auto.md`, gemeinsame Regeln `grenzland-gemeinsam.md`.
Falko, 13.11.2026 1:14: „… dass die Fahrzeuge möglichst realistisch aussehen und auch die Innenansicht, also die Cockpit-Variante, schön
detailreich ist …“ – und gewählt: die Fahrzeuge von 1989 erkennbar wie die echten Typen, mit Namen im Text, ohne Logos und Embleme.

## Was es gibt (Stand siehe „Verlauf“ unten)

- **Karosserien statt Kästen** (`viz3/src/grenzland/gl_karosse.js`, reine Geometrie, ohne Szene): eine Karosserie entsteht aus
  Querschnitten entlang ihrer Länge – Schweller, Flanke mit Einzug, Schulter, darüber Haube/Kofferraum oder Fahrgastzelle mit Sims,
  Scheiben zwischen Dichtungen, Dachkante und gewölbtem Dach; Windschutz- und Heckscheibe sind die Flächen zwischen Haube und Dach,
  A-, B- und C-Säulen, Türfugen, ausgeschnittene Radläufe mit Radkasten, eine Innenschale (man sieht durch die Scheiben ins Auto).
  Normalen weich, wo die Fläche rund ist, Kanten ab 38°. Dazu ein Baukasten (Rohre, Drehkörper, gezogene Profile, weiche Polster).
- **Typen in echten Maßen** (`gl_typen.js`, `gl_zweirad.js`): siehe Tabelle. Die Namen der ersten Fassung gelten weiter:
  `limo89` → Wartburg 353, `klein89` → Trabant 601, `lkw89` → W 50, `moped` → Simson S 51; `streife`, `kombi`, `kasten` bleiben.
- **Keine neuen Shader für Lack, Glas, Chrom** (`gl_modelle.js`): der Lack ist eine Kopie des Lacks von Falkos Auto
  (`vehicles/car.js`, Klarlack; je Farbe eine Kopie – eine Kopie behält das Shader-Programm), Glas und Chrom Kopien seines Glases und
  Chroms, Kleinteile aus Vertexfarben im Material des Verkehrs (`VFIG.mat()`), Lampen Kopien der Verkehrslampen. Fehlt Falkos Auto,
  fällt alles auf das Verkehrsmaterial zurück.
- **Das Moped des Spielers** (`GLAUTO.mopedVeh`, Fahrzeug `gl-moped`): Simson S 51 – 3,7 PS, vier Gänge, gut 60 km/h, 165 kg mit
  Fahrer; legt sich in die Kurve (Augpunkt und Figur gehen mit), der Lenker dreht die Gabel, die Räder mit Speichen rollen; über dem
  Motorton des Fahrzeugkerns (`vehicles/vsound.js`) liegt eine eigene Zweitakt-Stimme (Klingeln des Auspuffs, Rasseln zwischen den
  Zündungen, unrunder Leerlauf – alles synthetisch). Für die Anzeige beim Aufsteigen: `name` „Simson S 51“, `gl.sub`.
- **Cockpit** (`gl_cockpit.js`): aus den Augen des Fahrers sieht man Lenker mit Griffen und Hebeln, Tacho, Lampentopf, Spiegel, Tank mit
  Deckel. Der Tacho zeigt die wahre Geschwindigkeit (`VEH.cur.st.u`, Nadel bis 100 km/h, zittert leicht), darunter eine kleine
  Tankmarke (`GL.tank` von 8,7 l – die echte S 51 hat keine Tankuhr, nur den Reservehahn), nachts leuchtet das Zifferblatt, wenn das
  Licht an ist – ohne neue Lichtquelle.

## Ausprobieren

- Szene „Grenzland“ starten, im Garten aufs Moped (E), V wechselt zwischen Außen- und Sitzansicht.
- Alle Typen nebeneinander: `python3 viz3/test/grenzland_auto.py 9012` (Bilder in `out/grenzland_auto/`).
- Formen ohne Browser ansehen (kleiner Software-Renderer, Sekunden):
  `node viz3/extra/grenzland-auto/werkzeug/bild.mjs trabant out/karosse/trabant.png --views v34,h34,seite,front`.

## Typen, Maße, Quellen

| Typ (`GLMOD.TYP`) | Vorbild | Maße L × B × H, Radstand | Quelle |
|---|---|---|---|
| `trabant` (`klein89`), `trabant_kombi` | Trabant 601 Limousine / Universal | 3555 × 1505 × 1437 mm (Universal 3560 × 1510 × 1467), 2020 mm, 145 SR 13, 26 PS, 105 km/h | Historische Sammlung der Westsächsischen Hochschule Zwickau, Datenblatt „Trabant P 601“ (whz.de/fileadmin/service/historische_sammlung/kraftfahrzeug/docs/trabant_p601.pdf); de.wikipedia.org/wiki/Trabant_601 (Reifen, Farben der 1980er: Papyrusweiß, Delphingrau, Cliffgrün, Pastellblau …) |
| `wartburg` (`limo89`) | Wartburg 353 | 4220 × 1640 × 1495 mm, 2450 mm, 50 PS, 125 km/h | WHZ Zwickau, Datenblatt „Wartburg 353“ (…/docs/wartburg_353.pdf); de.wikipedia.org/wiki/Wartburg_353 (Chrom ab 1984 schwarz, Farben) |
| `barkas` | Barkas B 1000 | 4520 × 1860 × 1910 mm, 2400 mm, 46 PS, 100 km/h | WHZ Zwickau, Datenblatt „Barkas B 1000“ (…/docs/barkas_b_1000.pdf) |
| `w50` (`lkw89`) | IFA W 50 L (Pritsche) | 6535 × 2500 × 2600 mm, 3200 mm, 125 PS | Radstand und Motor: de.wikipedia.org/wiki/IFA_W50; Außenmaße nach dem Typenblatt (nicht online geprüft) |
| `s51` (`moped`) | Simson S 51 | 1890 × 635 × 1200 mm, Radstand 1210 mm, 2.75-16, 8,7 l, 2,7 kW (3,7 PS) bei 5500/min, 5 Nm bei 4800/min, 60 km/h, 4 Gänge | de.wikipedia.org/wiki/Simson_S_51 (Motor, Tank, Tacho 60 mm bis 100 km/h, Farben); motorradundreisen.de, Datenblatt S 51 B1-4; Länge/Radstand nach der Betriebsanleitung (nicht online geprüft) |
| `schwalbe` | Simson Schwalbe KR 51 | 1815 × 745 × 1125 mm, Radstand 1190 mm, 2.75-16 | motorradundreisen.de, Datenblatt „Schwalbe KR 51“; de.wikipedia.org/wiki/Simson_Schwalbe (Farben) |
| `streife` | Streifenwagen von heute: Kombi der oberen Mittelklasse, silber mit verkehrsblauer Folie und gelb fluoreszierendem Streifen, Lichtbalken | 4,77 × 1,83 × 1,50 m, 2,79 m (kein bestimmtes Modell) | de.wikipedia.org/wiki/Streifenwagen (Verkehrsblau RAL 5017 mit Silber, foliert, „fluoreszierend gelbe Applikationen“) |
| `kombi`, `kasten` | kleiner Kombi (Maße von Falkos Auto), Kastenwagen | 4,47 × 1,74 × 1,55 m; 5,41 × 1,99 × 2,50 m | – |

**Funkstreifenwagen der Volkspolizei 1989** (`limo89` mit `{ col, band, bar: 'rundum' }`): hellelfenbein, der untere Teil der Karosserie
olivgrün überlackiert, auf dem Dach eine Sondersignalbrücke mit einem blauen Rundumlicht, links und rechts je ein
Presstonlautsprecher, dahinter die Funkantenne; Schriftzug „VOLKSPOLIZEI“. Quellen: autobild.de, „Wartburg 353 W der DDR-Volkspolizei:
Ein Vopo im Westen“ (ab Werk weiß, unten olivgrün überlackiert, Sondersignalbrücke mit Blaulicht, zwei Presstonlautsprechern und
Sirene, Antenne dahinter); de.wikipedia.org/wiki/Streifenwagen („hellelfenbein- und olivgrünfarbene Fahrzeuge der Volkspolizei“).

## Entscheidungen

- **Lack als Kopie des Autolacks statt Vertexfarben:** der Auftrag nennt Vertexfarben in `VFIG.mat()` für die lackierten Teile, damit
  kein neues Shader-Programm entsteht. Eine Kopie des Lackmaterials von Falkos Auto erfüllt dasselbe (gleiches Programm, geprüft im
  Test über die Programmliste) und sieht nach Autolack aus statt nach mattem Kunststoff. Kleinteile bleiben Vertexfarben.
- **Durchsichtige Scheiben mit Innenraum** (Sitze, Armaturenbrett, Lenkrad, Hutablage) statt dunkler Flächen.
- **Kennzeichen ohne Zeichen**, keine Typenschilder, keine Embleme. Der Schriftzug der Behörde („POLIZEI“, „VOLKSPOLIZEI“) ist kein
  Markenzeichen und gehört zum Erkennen dazu; Wappen und Polizeistern bleiben weg.
- **Augpunkt in der Sitzansicht des Mopeds** liegt etwas hinter und unter dem echten Kopf (0,5 m hinter der Mitte, 1,36 m hoch), sonst
  wären Lenker und Tacho bei 70° Bildwinkel nicht im Bild. In der Außenansicht bestimmt ein zweiter Punkt, wo die Figur sitzt.
- **Motordrehzahl des Mopeds halb gezählt:** der Motorton des Fahrzeugkerns rechnet Zündungen wie ein Viertakt-Vierzylinder
  (Drehzahl / 30 Hz). Ein Einzylinder-Zweitakter zündet einmal je Umdrehung – deshalb stehen im Datensatz halbe Drehzahlen, doppelte
  Momente, halbe Endübersetzung: Kräfte und Fahrleistungen sind die echten, der Ton stimmt.

## Offen

- siehe „Verlauf“ – was noch nicht umgebaut ist, fährt mit der Karosserie der ersten Fassung.

## Für den Lead

- `viz3/src/modules.txt`: drei neue Zeilen **über** `grenzland/gl_modelle.js` (nicht unter meiner letzten Datei – `gl_modelle.js`
  importiert sie): `gl_karosse.js`, `gl_typen.js`, `gl_zweirad.js`.

## Verlauf

- 13.11. ~2:45: Baukasten, Trabant 601 (Limousine, Universal), Simson S 51 mit Cockpit, Moped des Spielers neu; Test
  `viz3/test/grenzland_auto.py`, Unit-Tests `viz3/test/unit/grenzland_auto.test.mjs`.
