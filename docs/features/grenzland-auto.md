# Grenzland – Fahrzeuge und Cockpits (Hilfs-Agent `grenzland-auto`)

Branch `feat/grenzland-auto`, Auftrag `docs/plans/auftraege/grenzland-auto.md`, gemeinsame Regeln `grenzland-gemeinsam.md`.
Falko, 13.11.2026 1:14: „… dass die Fahrzeuge möglichst realistisch aussehen und auch die Innenansicht, also die Cockpit-Variante, schön
detailreich ist …“ – und gewählt: die Fahrzeuge von 1989 erkennbar wie die echten Typen, mit Namen im Text, ohne Logos und Embleme.

## Was es gibt

- **Karosserien statt Kästen** (`viz3/src/grenzland/gl_karosse.js`, reine Geometrie, ohne Szene): eine Karosserie entsteht aus
  Querschnitten entlang ihrer Länge – Schweller, Flanke mit Einzug, Schulter, darüber Haube/Kofferraum oder Fahrgastzelle mit Sims,
  Scheiben zwischen Dichtungen, Dachkante und gewölbtem Dach; Windschutz- und Heckscheibe sind die Flächen zwischen Haube und Dach,
  A-, B- und C-Säulen, Türfugen, ausgeschnittene Radläufe mit Radkasten, eine Innenschale (man sieht durch die Scheiben ins Auto).
  Normalen weich, wo die Fläche rund ist, Kanten ab 38°. Dazu ein Baukasten (Rohre, Drehkörper, gezogene Profile, weiche Polster,
  runde Zifferblätter mit Texturkoordinaten).
- **Typen in echten Maßen** (`gl_typen.js`: Trabant 601 Limousine und Universal, Wartburg 353 – auch als Funkstreifenwagen der
  Volkspolizei –, Barkas B 1000, W 50 mit Pritsche, Streifenwagen von heute, kleiner Kombi, Kastenwagen; `gl_zweirad.js`: Simson S 51,
  Schwalbe): siehe Tabelle. Jeder Typ mit Stoßstangen, Grill, Lampen, Blinkern, Spiegeln, Wischern, Griffen, Kennzeichen ohne Zeichen,
  Sitzen, Armaturenbrett und Lenkrad. Die Namen der ersten Fassung gelten weiter: `limo89` → Wartburg 353, `klein89` → Trabant 601,
  `lkw89` → W 50, `moped` → Simson S 51; `streife`, `kombi`, `kasten` bleiben. `GLAUTO.spawn(typ, { col, col2, band, band2, bar,
  plane, text })`: `band` ist beim Streifenwagen die blaue Folie, beim Wartburg die Farbe des unteren Karosserieteils; `bar: 'balken'`
  der Lichtbalken, `bar: 'rundum'` die Sondersignalbrücke der Volkspolizei; `text` schreibt einen Namen auf den Kastenwagen.
- **Keine neuen Shader für Lack, Glas, Chrom** (`gl_modelle.js`): der Lack ist eine Kopie des Lacks von Falkos Auto
  (`vehicles/car.js`, Klarlack; je Farbe eine Kopie – eine Kopie behält das Shader-Programm), Glas und Chrom Kopien seines Glases und
  Chroms, Kleinteile aus Vertexfarben im Material des Verkehrs (`VFIG.mat()`), Lampen Kopien der Verkehrslampen, Schriftzüge und
  Zifferblätter mit kleinen Canvas-Bildern (≤ 256 px). Fehlt Falkos Auto, fällt alles auf das Verkehrsmaterial zurück.
- **Schatten:** unter jedem Fahrzeug liegt ein weicher dunkler Fleck (nimmt Licht weg, kein Schattenwurf in die Sonnenkarte – wie bei
  den Autos des Verkehrs); die beiden Fahrzeuge des Spielers werfen den echten Sonnenschatten.
- **Shader-Programme** (gemessen im Test auf GitHub Actions, 13.11. 3:40): die Fahrzeuge benutzen sieben Programme, sechs davon gab
  es im Spiel schon (Lack, Glas, Chrom, Vertexfarben, Lampen, das unbeleuchtete Bild der Busanzeige für die Zifferblätter); neu ist
  eines – der Schattenfleck. Höchstens 15 Texturen je Programm.
- **Das Moped des Spielers** (`GLAUTO.mopedVeh`, Fahrzeug `gl-moped`): Simson S 51 – 3,7 PS, vier Gänge, gut 60 km/h, 165 kg mit
  Fahrer; legt sich in die Kurve (Augpunkt und Figur gehen mit), der Lenker dreht die Gabel, die Räder mit Speichen rollen; über dem
  Motorton des Fahrzeugkerns (`vehicles/vsound.js`) liegt eine eigene Zweitakt-Stimme (Klingeln des Auspuffs, Rasseln zwischen den
  Zündungen, unrunder Leerlauf – alles synthetisch). Für die Anzeige beim Aufsteigen: `name` „Simson S 51“, `gl.sub`
  („Moped · 3,7 PS · Baujahr 1984 · Tank 3,1 l“ – der Tankinhalt steht dort, unter 0,8 l „(Reserve)“).
- **Der Trabant zum Fahren (1989)** (`GLAUTO.trabiAt(x, y, hd)` / `trabiHide()`, Fahrzeug `gl-trabi`, `GLAUTO.trabi`): Trabant 601 –
  594 cm³, zwei Zylinder, 26 PS bei 4200/min, vier Gänge, rund 105 km/h, 695 kg mit Fahrer, weiche Federn, Frontantrieb, derselbe
  Zweitakt-Ton. `name` „Trabant 601“, `gl.sub` „Zweitakter · 26 PS · Baujahr 1986 · keine Tankuhr: Reservehahn und Peilstab“.
- **Cockpits** (`gl_cockpit.js`; die Teile gehören zu den Modellen):
  - *Simson S 51:* Lenker mit Griffen, Kupplungs- und Bremshebel, Schalter, Gasdrehgriff; der Tacho im runden Gehäuse über dem
    Lampentopf (Skala bis 100 km/h, roter Punkt bei 60), Zündschloss mit Schlüssel im Lampentopf, zwei Kontrollleuchten, Spiegel,
    Tank mit Deckel, Benzinhahn; die Hände des Fahrers in Handschuhen an den Griffen (nur in der Sitzansicht).
  - *Trabant 601:* Armaturentafel in Wagenfarbe mit schwarzem Polsterwulst, runder Tacho bis 120 km/h hinter dem dünnen
    Zweispeichen-Lenkrad (dreht mit), drei Kontrollleuchten, Zugknöpfe und Kippschalter, Zündschloss, Aschenbecher, der
    Krückstock-Schalthebel aus der Tafel neben der Lenksäule, offene Ablage, Heizungsschieber, Radio mit beleuchteter Skala,
    Entfrosterschlitze, Innenspiegel, Sonnenblenden, Türverkleidung mit Armlehne, Fensterkurbel und Griff, Handbremse, Pedale,
    Hutablage; die Hände des Fahrers am Lenkradkranz (nur in der Sitzansicht); vorn die Haube, die Wischer, der Außenspiegel.
  - *Instrumente leben:* die Nadel zeigt die wahre Geschwindigkeit (`VEH.cur.st.u`, zittert leicht), der Kilometerzähler zählt mit
    (Zehntel in Rot), die Ladekontrolle (rot) glimmt kurz nach dem Start, die blaue Leuchte brennt bei von Hand eingeschaltetem Licht
    (Fernlicht), die grüne blinkt beim Abbiegen im Schritttempo; der Benzinhahn des Mopeds steht unter 0,8 l auf Reserve; die
    Radioskala zeigt die Sender von `window.GLRADIO.stations()` und den Zeiger beim eingestellten (`GLRADIO.cur()`, Ereignis
    `grenzland:radio`); nachts leuchten die Zifferblätter, wenn das Licht an ist – ohne neue Lichtquelle (unbeleuchtete Materialien,
    deren Helligkeit das Modul nach Tageslicht und Lampe setzt). Die Bilder der Zifferblätter werden beim Beenden freigegeben.

## Ausprobieren

- Szene „Grenzland“ starten, im Garten aufs Moped (E), V wechselt zwischen Außen- und Sitzansicht.
- Alle Typen nebeneinander: `python3 viz3/test/grenzland_auto.py 9012` (Bilder in `out/grenzland_auto/`).
- Formen ohne Browser ansehen (kleiner Software-Renderer, Sekunden):
  `node viz3/extra/grenzland-auto/werkzeug/bild.mjs trabant out/karosse/trabant.png --views v34,h34,seite,front`.

## Test

`viz3/test/grenzland_auto.py` (für Actions eingetragen in `viz3/extra/grenzland-auto/tests.txt`; lokal rund 8 Minuten, auf GitHub
Actions gut 5):
neun Teile, jeder läuft für sich – Start (Freispiel wie vom Lead vorgegeben: alle Missionen erledigt, Radio aus, Freitag 17:20,
Garten), Aufstellung aller 14 Typnamen mit Bildern, Linienfahrt, die Simson (fährt, Tacho, Schräglage, Hände, Tank, Reservehahn), der
Trabant (fährt, Tacho, Lenkrad, Radio), Nacht (Zifferblätter, Lampen, Blaulicht), Shader-Programme gegen den Stand vor dem Start,
„Beenden“. Was scheitert, steht auf Actions als Anmerkung des Laufs (öffentlich lesbar), Zwischenwerte als Notiz.

**Bilder ohne den Browser des Chat-Rechners:** jeder Actions-Lauf legt `out/grenzland_auto/*.jpg` und das Protokoll als Artefakt
`out-grenzland_auto` ab; `gh api repos/<owner>/<repo>/actions/runs/<id>/artifacts` listet es, `…/actions/artifacts/<id>/zip` lädt es
(so sind die Cockpit-Bilder dieser Nacht entstanden, als die Warteschlange des Browsers eine Stunde lang war).

**Eine Falle für alle Browser-Tests:** `pg.evaluate("GLAUTO.trabiAt(…)")` gibt den letzten Wert zurück – ein Fahrzeug, und an ihm
hängt über `parent` die ganze Szene. Playwright versucht, das zu übertragen: im Chat-Rechner wuchs der Browser auf 3,5 GB und wurde
vom Speicherwächter beendet („Target crashed“), auf Actions brach die Auswertung mit „Execution context was destroyed“ ab. Der Test
schickt Anweisungen deshalb über `do(…)` (gibt nichts zurück) und holt Werte nur als Zahlen oder JSON.

## Typen, Maße, Quellen

| Typ (`GLMOD.TYP`) | Vorbild | Maße L × B × H, Radstand | Quelle |
|---|---|---|---|
| `trabant` (`klein89`), `trabant_kombi` | Trabant 601 Limousine / Universal | 3555 × 1505 × 1437 mm (Universal 3560 × 1510 × 1467), 2020 mm, 145 SR 13, 26 PS bei 4240/min, 105 km/h, Leergewicht 620 kg, Tank 26 l | Historische Sammlung der Westsächsischen Hochschule Zwickau, Datenblatt „Trabant P 601“ (whz.de/fileadmin/service/historische_sammlung/kraftfahrzeug/docs/trabant_p601.pdf); de.wikipedia.org/wiki/Trabant_601 (Reifen, Farben der 1980er: Papyrusweiß, Delphingrau, Cliffgrün, Pastellblau …) |
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
- **Keine erfundene Tankuhr:** weder die S 51 noch der Trabant 601 haben eine. Beim Moped steht der Tankinhalt in der kleinen Zeile
  unter dem Namen und der Benzinhahn dreht auf Reserve; beim Trabant sagt die kleine Zeile „Reservehahn und Peilstab“.
- **Kontrollleuchten:** der Fahrzeugkern kennt weder Fernlicht noch Blinker. Blau leuchtet deshalb, wenn das Licht von Hand
  eingeschaltet ist (Taste L auf „an“), Grün blinkt, wenn im Schritttempo stark eingelenkt wird (der Fahrer „blinkt“ beim Abbiegen).
  Außen blinken die Blinker nicht.
- **Hände nur in der Sitzansicht:** am Moped dunkle Jackenärmel und schwarze Handschuhe an den Griffen (drehen mit dem Lenker),
  im Trabant braune Lederhandschuhe und die Ärmel einer Wattejacke am Lenkradkranz auf zehn und zwei (gehen eine Vierteldrehung
  mit, dann läuft das Lenkrad unter ihnen durch). Handschuhe, weil es eigene Geometrie ist und zu beiden Spielfiguren und zum
  November 1989 passt; die Spielfigur selbst ist in der Sitzansicht ausgeblendet.
- **Augpunkte der Sitzansicht:** Moped 0,32 m hinter der Mitte und 1,22 m hoch, Trabant 6 cm tiefer als der echte Kopf – sonst
  lägen Lenker, Tacho und Radio bei 70° Bildwinkel und −4° Blick unter dem Bildrand. In der Außenansicht bestimmt ein zweiter
  Punkt, wo die Figur sitzt (im Trabant ist der Fahrersitz dafür 6 cm tiefer als in den geparkten Trabanten, sonst stieße der Kopf
  ans Dach).
- **Motordrehzahl des Mopeds halb gezählt:** der Motorton des Fahrzeugkerns rechnet Zündungen wie ein Viertakt-Vierzylinder
  (Drehzahl / 30 Hz). Ein Einzylinder-Zweitakter zündet einmal je Umdrehung – deshalb stehen im Datensatz halbe Drehzahlen, doppelte
  Momente, halbe Endübersetzung: Kräfte und Fahrleistungen sind die echten, der Ton stimmt. Beim Trabant (zwei Zylinder) stimmt die
  Rechnung des Kerns von selbst.
- **Umgesetzte Fahrzeuge sofort sichtbar:** die Szene blendet kleine Dinge fern der Kamera aus (`CULL`, nach ihrem Ort beim letzten
  Blick). Ein aus der Ferne geholtes Moped blieb so einen Moment unsichtbar – `GLAUTO` stellt die Ebenen beim Umsetzen selbst zurück.

## Offen

- **Lada** nicht gebaut (`lada` zeigt den Wartburg der ersten Fassung, wird von niemandem angefordert).
- **Die Figur auf dem Moped** sitzt in der Stuhlhaltung der Spielfigur (Knie über dem Tank, Hände auf den Schenkeln) und bleibt
  aufrecht, wenn sich das Moped in die Kurve legt – eine eigene Fahrhaltung bräuchte einen Eingriff in `game/avatar.js`.
- **Tank im Fahr-HUD** (`#vhud`): nicht ohne Eingriff in fremde Dateien; der Tank steht in der kleinen Zeile beim Aufsteigen.
- **Detailstufen:** ein Fahrzeug hat 13 000–20 000 Dreiecke in rund zwölf Zeichenaufrufen; eine grobe Fernstufe gibt es nicht
  (kleine Teile blendet `CULL` in der Ferne aus). Bei vielen Fahrzeugen zugleich (über zehn) wäre das der nächste Schritt.
- **Cockpit des Streifenwagens** (heute fährt der Spieler nur Moped): nicht gebaut.

## Für den Lead

- `viz3/src/modules.txt`: drei neue Zeilen **über** `grenzland/gl_modelle.js` (nicht unter meiner letzten Datei – `gl_modelle.js`
  importiert sie): `gl_karosse.js`, `gl_typen.js`, `gl_zweirad.js`.
- **1989:** `GLAUTO.trabiAt(x, y, hd)` stellt den Trabant hin, `GLAUTO.trabiHide()` nimmt ihn weg (auch `GLAUTO.mopedHide()` und
  `removeAll()` tun das, also auch „Beenden“). `gl_modus.js` steigt beim Beenden nur aus `gl-moped` aus – `trabiHide()` steigt selbst
  aus, es ist nichts zu ändern; wer in 1989 die Verbrauchsrechnung des Mopeds auch für den Trabant will, braucht dort eine Zeile.
- **Kastenwagen der Spedition:** `GLAUTO.spawn('kasten', { col: '#f1f1ee', text: 'Spedition Krähwinkel' })` schreibt den Namen auf
  beide Seiten.
- **Reiter auf den Mopeds der Missionen** (`gl_mission.js` `reiterTick`): der Sitz der S 51 liegt 0,79 m hoch und 0,42 m hinter
  dem Ursprung (`c.T.seat = [0, −0.42, 0.79]`), bei der Schwalbe `[0, −0.4, 0.78]` – die Hüfte der Figur also etwa bei
  `c.z + 0.88` und 0,40 m hinter dem Ursprung (die erste Fassung hatte 0,84 und 0,22).
- **Kastenwagen des SEK** (`{ col, band, bar: 'balken' }` aus dem Polizei-Modul): bekommt den Lichtbalken und das Band in `band`.
- **Radio:** benutzt wird `window.GLRADIO.stations()` → `[{ id, name, freq }]` und `GLRADIO.cur()` → `id | null` (die Schnittstelle
  der ersten Fassung), dazu das Ereignis `grenzland:radio`. Heißen sie nach dem Umbau anders: `gl_cockpit.js`, Abschnitt „the
  radio's dial“.
- **Kleine Zeile:** `VEH.by['gl-moped'].gl.sub` ist ein Getter (der Tankinhalt ändert sich) – beim Anzeigen lesen, nicht merken.

## Verlauf

- 13.11. ~2:30: Baukasten, Trabant 601 (Limousine, Universal), Simson S 51 mit Cockpit, Moped des Spielers neu; Test
  `viz3/test/grenzland_auto.py`, Unit-Tests `viz3/test/unit/grenzland_auto.test.mjs`.
- ~2:55: Streifenwagen von heute, Wartburg 353 (Volkspolizei), Kastenwagen, Barkas B 1000, W 50; Trabant zum Fahren mit Cockpit.
- ~3:05: Schwalbe; Cockpits lebendig (Kilometerzähler, Kontrollleuchten, Hände, Benzinhahn, Radioskala), Schatten unter den
  Fahrzeugen.
- ~3:20–3:50: Lichtbalken für den Kastenwagen der Polizei; Radioskala mit Namen und Frequenz des Senders; Test in unabhängigen
  Teilen mit Anmerkungen für Actions und Freispiel nach dem Start; Ursache der roten Läufe gefunden (ein zurückgegebenes Fahrzeug,
  siehe „Test“); Schriftzüge auf der linken Wagenseite standen mit der Rückseite nach außen und waren nie zu sehen – behoben, mit
  Unit-Test; der Schattenfleck war zu schwach (die Wagen schienen zu schweben) – kräftiger.
