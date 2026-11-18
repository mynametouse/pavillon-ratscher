# Böden aus der Nähe – Straßen, Plätze, Höfe, Wege (`foto-boeden`)

Hilfs-Agent `foto-boeden` des Fotorealismus-Chats (session_01L6Yrpe4euXqyTbnuvdamYz), Zweig `feat/foto-boeden`, seit 18.11.2026.
Auftrag: `docs/plans/auftraege/foto-boeden.md`, gemeinsame Regeln `foto-gemeinsam.md`. Falko: „Straßen mit Asphaltstruktur, Rissen und
Reparaturstellen … Detailtexturen im Nahbereich. Vermeidung sichtbarer Texturwiederholungen.“ – und zum Markt von Schleusingen: das
Pflaster sei ein „Rauschteppich“.

Stand: **Schritt 1** (Asphalt und feste Straßen) und aus Schritt 2 **das Pflaster** (Markt von Schleusingen, Pflaster der Kacheln).

## Wie der Boden gezeichnet wird (Befund)

- **Drei Boden-Materialien, ein Straßen-GLSL.** Das Gelände um Ratscher (`world/ratscher.js`, Programm `geoterrain`, innen 10 m, außen
  120 m), der Gartenboden (`garden/env.js` `mkGroundMat`) und die Kacheln der weiten Welt (`welt/welt.js` `tileMat`, Programm
  `welt-tile`) hängen alle `ROADS.shader()` aus `world/roads.js` vor ihren Fragment-Shader: `landDetail()` (das Luftbild entschleiert,
  aus der Nähe die Körnung von Rasen oder Waldboden aus dem Textur-Array `core/detail.js`), `roadShade()` (alles an Straßen und Wegen
  aus der Straßenkarte: Kante, Art, Belag, Abstand zur Achse, Meter längs) und die Nässe (`gRdGloss`, `gRdPud` → Rauheit über
  `ROADS.gloss`). Der Asphalt lebt also allein in der Farbe (Albedo); eine Normal- oder Rauheitskarte hat das Gelände nicht.
- **Warum der Asphalt aus der Nähe wie Filz aussah:** `roadShade()` nahm Hell und Dunkel des Asphalts aus der Bodenfarbe, die
  `landDetail()` ihr übergibt – und die trägt schon die Halme der Rasentextur. Auf der Landstraße lag deshalb ein Grasmuster im
  Asphalt (Bild `vorher/l1625_unten.jpg`). Die eigene Asphalttextur des Arrays (`asphalt_col`) ist dagegen fast strukturlos
  (Kontrast 15 %, kein Korn zu sehen).
- **Graue Flächen bekommen Rasenkorn.** `landDetail()` wählt zwischen Rasen- und Waldbodenkorn nach Grün gegen Rot; neutrales Grau
  (Höfe, Plätze, der Anger) gilt zu 70 % als Rasen – daher das gleichmäßige grau-grüne „Gesprenkel“ auf Hof und Anger (Schritt 3).
- **Pflaster der Orte, zwei Wege.** (1) Eine Zone legt ihre Straßen als Bild über die Kacheln (`WELT.setOverlay`, in Schleusingen
  `welt/schleusingen.js` `streetMap()`: Rot = Deckung, Grün/Rot = Belag – Asphalt, Pflaster, Platten, Kies; der Marktplatz als
  gefülltes Polygon „Pflaster“); der Kachel-Shader (`weltGround()`) zeichnet daraus `setts()`. Ohne Bild wird graues Land nahe der
  Kamera zu Pflaster (`uPave`). (2) Über dem Markt liegt zusätzlich ein eigenes Netz mit einem Kachelbild von 4 m
  (`schleusingen-ansicht/sa_markt.js`, `settCanvas()`), weil die Steine des Shaders ab ~6 m verschwanden.
- **Warum der Markt in den Testbildern ein Rauschteppich war:** im Test-Browser gibt es die Kacheln der weiten Welt nicht (sie kommen
  von der Website; der lokale Server antwortet 404), wenn der Test sie nicht vorher nach `viz3/dist/welt-test/` holt (so machen es
  `schleusingen.py`, `strassen.py`). Ohne Kacheln bleibt das grobe Außengelände von Ratscher stehen (es wird nur unter gezeichneten
  Kacheln abgesenkt) und verdeckt Kacheln, Pflaster und Markt: zu sehen war dessen unscharfes Luftbild mit Rasenkorn. Mit Kacheln
  (so sieht es Falko) lag auf dem Markt das Bild aus `sa_markt.js` – Zellen eines Voronoi-Musters in acht flachen Farben: aus der
  Nähe ein Mosaik, aus Augenhöhe buntes Rauschen, die 4-m-Kachel sichtbar (`sett/alt_flach.png`). Die Straßen ringsum: Quadrate im
  strengen Halbverband in kräftigen Tönungen, ab 6 m eine glatte Fläche.

## Was neu ist

### Asphalt (`world/roads.js`, `roadShade()`)

- **Kein Rasenkorn mehr im Asphalt:** `landDetail()` merkt sich die Helligkeit des Luftbilds vor der Körnung (`gLdL`), der Asphalt
  (und der Gehweg) nimmt sein Hell und Dunkel von dort.
- **Korn aus der Nähe:** helle Steine im dunklen Bindemittel – je Zelle zweier gegeneinander gedrehter Gitter (8 mm, 1 cm) ein Stein
  mit weichem Rand an zufälliger Stelle (`rdGrit`), dazu weiche Sprenkel von 2 cm, 4 cm und 14 cm; jede Stufe verschwindet, wo ein
  Bildpunkt breiter ist als sie (nichts flimmert in der Ferne). Bewusst zurückhaltend (wenige Prozent): harte Zellen von
  Bildpunktgröße zog die Kantenglättung des Bilds (SMAA) zu einem Webmuster.
- **Alter und Klasse:** frischer Asphalt dunkel und bläulich, verwitterter heller und wärmer – kleine Straßen älter, in Abschnitten
  von ~90 m; die Landstraße ist am besten gehalten (dunkler, kaum Flicken, fester Rand), die Dorfstraße heller, fleckiger, mit
  Aufbrüchen, der Wirtschaftsweg mit ausgefranstem Rand und Schmutz und Moos zwischen den Spuren.
- **Befahren:** die Radspuren als breite, weiche Bänder (ein halber Meter und die Flanken), etwas dunkler und glatter (weniger Korn,
  die Rauheit dort bis 16 % geringer – `gRdWorn`), auf zweistreifigen Straßen zwei je Fahrstreifen, auf schmalen ein Paar in der
  Mitte; in der Streifenmitte stellenweise ein schwacher dunkler Fleck (Öl). Im Regen steht das Wasser in diesen Spuren.
- **Reparaturen als Fläche, nicht als Umriss:** ein Flicken ist ein anderes Grau und ein anderes Korn (neuer Asphalt: dunkler,
  bläulich, glatter), sein Rand eine dünne Bitumennaht, die wandert und stellenweise fehlt. Weniger Flicken als vorher. Neu:
  **Leitungsgräben** – ein Streifen längs der Straße über einen Abschnitt (in Dorf und Stadt, selten an kleinen Straßen, nicht auf
  der Landstraße) und quer über eine Straßenhälfte (Hausanschluss, nur innerorts).
- **Ränder:** ein offener Rand (ohne Bord) wandert stärker und bricht stellenweise aus – dort liegt auch mehr Schotter auf dem
  Bankett; auf den letzten Dezimetern liegt Sand und Staub. Am Bordstein liegen streckenweise Schmutz und altes Laub in der Rinne.
- Unverändert: Markierungen, Bord, Rinne, Gehweg, vergossene Risse, Beton, Kies, Erdwege (spätere Schritte).

### Pflaster

- **Markt von Schleusingen** (`schleusingen-ansicht/sa_markt.js`, `settCanvas()`): Natursteine in Reihen, wie Pflaster gesetzt
  wird – jede Reihe mit eigener Höhe (9–13 cm), jeder Stein mit eigener Breite, Kanten, die wandern, runde Ecken; die Farben des
  Markts (dieselbe Palette nach dem Foto von 2016) zur Mitte hin gezogen, jeder Stein einen Ton heller oder dunkler, jede Reihe
  einen Hauch; die Steinoberseite zur Fuge hin abgerundet (dunkler), die Fugen vertieft: dunkler Sand und Schmutz, in feuchten
  Flecken dunkler und etwas moosig; weiche Flecken, von Füßen heller getreten. Die Reihen laufen längs der langen Marktseite (vorher
  West–Ost, schief zu jeder Hausfront). Netz, Material, Programm und Speicher wie vorher (ein Bild 1024², 4 m). **Generisch:** der
  Verband des echten Markts ist nicht vermessen.
- **Pflaster der Kacheln** (`welt/welt.js`, `setts()`; alle Orte mit Straßenbild – Schleusingen, Kloster Veßra, Suhl – und graues
  Land nahe der Kamera): Reihen mit eigener Steinbreite und eigenem Versatz, leicht wandernde Linien, jeder Stein ein Ton und eine
  schwache Tönung, abgerundete Oberseite, scharfe dunkle Fugen. Wo ein Bildpunkt breiter ist als ein Stein, gehen die Steine und ihr
  Mittelwert bleibt (kein Helligkeitssprung mehr), die Töne der Reihen bleiben etwas länger. Ein Aufruf statt drei (Pflaster,
  Platten, graues Land) – ohne Grafikkarte wird jeder Aufruf an jedem Bildpunkt bezahlt.

## Dateien

| Datei | Änderung |
|---|---|
| `viz3/src/world/roads.js` | GLSL: `gLdL`, `gRdWorn`, `rdGrit()`, der Asphalt-Zweig von `roadShade()`, offene Ränder, Schmutz am Bord, Pfützen in den Radspuren; `ROADS.gloss` (Rauheit der Radspuren); der Stub |
| `viz3/src/welt/welt.js` | markierte Zeilen: `setts()` neu, ein Aufruf in `weltGround()`, `gRdWorn` an Böschungen aus, der Stub |
| `viz3/src/schleusingen-ansicht/sa_markt.js` | markiert: `settCanvas()` neu, die Texturkoordinaten des Marktpflasters zur längsten Kante gedreht |
| `viz3/test/foto_boeden.py`, `viz3/extra/foto-boeden/tests.txt` | Test (unten) |

Keine neue Textur, kein neuer Sampler (die Bodenshader bleiben bei 16), kein neues Programm, keine neuen Zeichenaufrufe, keine
neuen Assets.

## Kosten

- **Programme, Texturen, Zeichenaufrufe:** unverändert – kein neues Programm (gezählt im Bilderlauf: 187–188 wie vorher), höchstens
  16 Texturen je Programm (`lib.check_gl`: `maxFrag` 16, keines defekt), kein neuer Zeichenaufruf, keine neue Textur. Das Marktpflaster
  ist dasselbe Netz mit demselben Bild (1024², 4 m) wie vorher; sein Bild entsteht beim Aufbau der Stadt in ~0,2 s statt ~0,15 s
  (in node gemessen).
- **Länge der Shader** (ohne Kommentare und Leerraum): das Straßen-GLSL 11 542 → 13 944 Zeichen (+21 %), das Kachel-GLSL
  3 972 → 4 724 (+19 %); die ganzen Fragment-Shader der Böden (mit three's Bausteinen und Kommentaren) rund 108 Tsd. → 113–121 Tsd.
  Zeichen (+5 %).
- **Was ohne Grafikkarte an jedem Bodenpunkt dazukommt** (dort werden alle Zweige gerechnet): in `roadShade()` zwei Rauschabfragen
  (`rdN`: Nahtlücken, Sprenkel 2 cm) und vier einfache Hashes (zwei für das Korn, zwei für die Gräben) – etwa ein Sechstel mehr
  Rauschen als vorher, keine Texturabfrage mehr als vorher (die neun Abfragen des Detail-Arrays kosten dort am meisten); in
  `weltGround()` ein Pflaster-Aufruf statt drei (vier Hashes und zwei Sinus statt sechs Hashes). Texturabfragen mit Bildschirm-
  Ableitungen stehen in keinem neuen Zweig (Direct3D).
- **Ladezeit ohne Grafikkarte (`softgl`) und Speicher am Telefon (`memphone`): im Chat-Rechner nicht gemessen** – die Warteschlange
  des einen Test-Browsers war am 18.11. abends ~50 Minuten lang; beide laufen mit `gpu`, `leistung` und `strassen` im Feature-Lauf
  bei GitHub (`viz3/extra/foto-boeden/tests.txt`). Nicht gemessen: Bildzeiten auf einer echten Grafikkarte, auf Falkos Laptop, am iPhone.

## Tests

`viz3/test/foto_boeden.py` (in `viz3/extra/foto-boeden/tests.txt`, dazu `strassen`): aus Bildpunkten – die Radspuren der Landstraße
sind von oben dunkler als der Asphalt daneben; aus 1,3 m zeigt der Asphalt Korn, aus 14 m nicht mehr; der Asphalt der Dorfstraße
ist wärmer als der der Landstraße; aus der Szene – das Marktpflaster liegt in Reihen (ganze Bildzeilen unterscheiden sich, Spalten
kaum) und kachelt ohne Naht; die Bodenshader bleiben in ihrer Länge, kein Programm über 16 Texturen, keines defekt, kein neues.

Stand 18.11. abends: `tools/check.sh` grün (427 Unit-Tests); im Chat-Rechner nur Bilder (alle Programme übersetzt und gelinkt,
höchstens 16 Texturen, in drei Bilderläufen); die Tests laufen im Feature-Lauf bei GitHub (Lauf-Nummer im Bericht). Die Grenzen
des eigenen Tests (`GRAIN`, `WHEEL`, `SHADER`) sind weit gesetzt und werden nach den ersten Zahlen von dort enger gezogen.

Bilder vorher/nachher (Arbeitsordner des Chats, nicht im Repo): `/home/claude/scratch/foto/boeden/` – `vorher/` (Stand vor der
Arbeit; der Markt dort ohne Kacheln), `n2/` (nachher, 20:30: Asphalt und Marktpflaster auf echten Kacheln), `nachher/` (Endstand,
sobald der Bilderlauf durch die Warteschlange ist), `sett/` (Vorschau ohne Browser: `alt_*` das alte Marktbild, `neu_*` das neue,
`shader_alt_*`/`shader_neu_*` das Pflaster der Kacheln, `grain_*` das Korn). Wer den Markt oder einen Ort jenseits des Quadrats im
Test-Browser ansieht, holt vorher die Kacheln (`fetch_tiles()` wie in `viz3/test/schleusingen.py`).

## Offen

1. **Höfe, Plätze, Kies** (Schritt 3): graue Flächen des Luftbilds bekommen Rasenkorn (`landDetail()`, oben) – der Anger und die
   Höfe in Ratscher sehen deshalb gesprenkelt aus; mineralisches Korn statt Halmen, Kies mit Steinen, Fahrspuren, Pfützenmulden.
2. **Risse:** die vergossenen Risse sind geblieben; offene Netzrisse (erster Versuch: ein verzogenes Raster) las sich als
   gezeichnetes Gitter und ist wieder draußen – braucht ein echtes Zellmuster.
3. **Schachtdeckel und Einläufe** in bebauten Straßen (billig über `u`/`lat`, noch nicht gebaut).
4. **Relief:** Pflaster und Asphalt haben keine Normalen (kein Sampler frei); die Fugen sind nur dunkler. Möglich: Normale im
   Fragment-Shader aus dem Muster rechnen (Pflaster der Kacheln), oder eine Normal-Schicht im Detail-Array.
5. **Abgenutzte Markierungen, Beton mit Fugen und Poren, Bordsteine** (Schritt 5); Feld- und Waldwege (Schritt 3).
6. Das Marktpflaster kachelt alle 4 m (von oben sichtbar wie vorher); Laufspuren liegen als weiche Flecken im Kachelbild, nicht dort,
   wo Menschen wirklich gehen.
7. Nicht gemessen: Bildzeiten auf Falkos Laptop (Intel UHD 620) und am iPhone.
