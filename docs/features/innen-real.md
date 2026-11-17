# Häuser von innen: echt statt schemenhaft (`feat/innen-real`)

Hilfs-Agent `innen-real` des Grenzland-Chats (session_01L6Yrpf75YEUJPnMQdXevjQ), 17.11.2026, Auftrag
`docs/plans/auftraege/realismus1-innen.md` (gemeinsamer Teil `realismus1-gemeinsam.md`). Falko (13:27): „Es muss realistischer aussehen,
nicht bloß so schemenhaft. Auch in den Geschäften, in den Häusern. … Du sollst auch logisch durchdenken, ob eine Darstellung, eine visuelle
so in Wirklichkeit aussehen kann.“

## 1 Was das Spiel verraten hat (Rundgang vorher)

Durch ein Dutzend Häuser gegangen – in Ratscher das Haus am Anger (4004, „heute“), Gerhards Haus (247, die DDR-Stube behalten), Manfreds
(219, Eiche der Neunziger), ein Haus wie vor 1960 (189), das größte Haus von heute (253) und ein kleines; in Schleusingen ganze Häuser und
Wohnungen in Treppenhäusern (Bilder der Prüfläufe vom 14.11.). Bilder „vorher“: `out/innen_real/vorher/` (Test `innen_real:ratscher,tag=vorher`),
dieselben Räume „nachher“: `out/innen_real/nachher/`. Was ein Fremder sofort sieht, nach Gewicht:

1. **Polster als Kisten**: Sofas, Sessel, Kissen, Matratzen, Bettdecken waren harte Quader mit scharfen Kanten; die DDR-Sessel ein Block
   mit einer Platte als Lehne, ohne Beine und Armlehnen.
2. **Blaue Glanzflächen**: Spüle, Kochfeld, Dunstabzug, Wasserhahn, Spiegel spiegelten den Himmel draußen – blau, wie im Freien.
3. **Die Decke braun**: weiß gestrichene Decken kamen schmutzig braun heraus (nur vom Boden beleuchtet, warm getönt).
4. **Was jedes Zimmer hat, fehlte**: keine Sockelleisten (Wand stößt hart auf den Boden), **kein Heizkörper** unter den Fenstern (ein Haus in
   Thüringen ohne Heizung), keine Lichtschalter, keine Steckdosen.
5. **Türen**: ein glattes Blatt mit einem braunen Klötzchen als Griff; die Treppe im Flur von unten offen wie ein Stapel schwebender Bretter.
6. **Gezeichneter Boden**: das „Laminat“ eine gemalte Fläche mit sich wiederholenden Dielen.
7. **Räume, die es so nicht gibt**: in den langen Bauernhäusern (bis 22 m tief) ein Bad mit 22 m², Schlafzimmer 8 m lang.
8. **Lampenschirme** als Kristalle mit zwölf Kanten.
9. **Leere Häuser**: der Bewohner saß zu jeder Stunde auf dem Sofa (oder schlief unsichtbar).
10. Flache Wandbilder im Comicstil, Topfpflanzen als grüne Kristalle mit roter Kappe, kein Lichtfleck vor den Fenstern, Brettstühle aus
    vier Stöcken und einer Planke (am Tisch seitlich stehend), Sofakissen als drei Rollen, Häkeldeckchen, die über der Lehne in der Luft
    standen, der Bewohner bis zur Hüfte im Sofa, die Bettdecke über dem Schlafenden eine weiße Kiste.

## 2 Was jetzt anders ist

- **Weiche Dinge sind weich** (`zombie/z_innen_mob.js`, `Mesher.rbox`): jedes Polster, Kissen, jede Matratze und Bettdecke bekommt
  abgerundete Kanten (Radius nach Größe, glatte Normalen), Kissen und Matratzen wölben sich in der Mitte leicht. Das gilt für alle Stile –
  auch die von heute in `haeuser/haeuser_heute.js`, ohne diese Datei zu ändern: weich ist eine matte Palettenfarbe (Rauheit ≥ 0,9) im
  Möbel-Mesher und die Stoffe des Baukastens (Velours, Karo, Bettzeug); dünne Dinge (Teppich, Decke, Papier) bleiben flach. Keine neue
  Draw-Call, kein neues Programm (die Palette).
- **Sessel der Sitzgruppe** (DDR, Nachwende) neu: kurze Holzbeine, Polsterunterbau, Sitzkissen zwischen zwei Armlehnen, Rückenlehne mit
  Kissen; Leder wird auch gerundet.
- **Licht drinnen**: die Möbel sehen um sich herum ein **Zimmer statt des Himmels** – ihre Palette im normalen Spiel ist ein Zwilling
  (`M.palIn`, dasselbe Programm) mit eigener Umgebung: ein einmal vorgefiltertes Zimmer (weiße Decke, helle Wände, Holzboden, ein helles
  Fenster an einer Seite; PMREM im Format der Umgebung der Szene, also kein neues Programm; ≈ 6 MB Grafikspeicher, solange ein Haus steht,
  frei mit dem Baukasten), Stärke folgt Tag und Nacht (`ZIMOB.indoorEnv`); am Telefon der Himmel mit 60 % (kein Speicher dafür). Dazu
  Metall halbmatt (höchstens 0,5 metallisch), nichts glatter als Rauheit 0,22. Decken weiß (`0xf4f3ef`), heller vom zurückgeworfenen
  Tageslicht, nicht mehr braun; nachts sitzt das geliehene Licht unter einer Deckenleuchte einen halben Meter tiefer (die Decke um sie
  herum bekommt Licht, kein heißer Fleck darüber).
- **Helle Fenster bei Tag** (normales Spiel): auf dem Glas von innen ein heller Schleier, dessen Stärke dem Tageslicht folgt
  (`M.glare`, das Programm des Saums) – wie auf einem Foto eines Zimmers sind die Fenster die hellsten Flächen; nachts weg.
- **Dunklere Ecken und Kontaktschatten** (normales Spiel): wo Boden, Wände und Decke aneinanderstoßen ein weicher dunkler Saum, unter
  allem, was auf dem Boden steht (Sofa, Bett, Schrank, Tisch – ihre Kollisionsflächen), ein weicher Schatten mit gleich breitem Rand
  (neun Teile je Fläche) – ein Netz, ein Material (`M.schatten`, schwarz mit Alpha aus einer Canvas), das erste Haus übersetzt es hinter
  dem Schwarz; ohne das standen die Möbel wie auf den Boden gestellt (Möbel werfen keinen Sonnenschatten).
- **Was jedes Zimmer hat** (`zombie/z_innen.js` `fittings`): Sockelleisten (heute weiß, sonst Holz), unter jedem Fenster einer Außenwand ein
  **Flachheizkörper** mit Profil, Abdeckung, Thermostatventil und Rohren in den Boden (nicht in den Kohleofen-Häusern „alt“ und „ddr“ der
  Zombie-Nacht, nicht im Bad von heute – dort hängt der Handtuchheizkörper), **Lichtschalter** auf der Klinkenseite jeder Tür in 1,05 m,
  **Steckdosen** in 0,3 m. Alles Palette im Möbel-Netz: keine Draw-Call.
- **Türen**: von heute glatt (Weißlack), ältere mit Füllungen; **Drückergarnitur** auf Rosette in 1,05 m, Schlüsselrosette darunter,
  Edelstahl (alt: Messing). Die **Haustür** von innen: in den Häusern von heute weiß oder anthrazit mit Milchglasstreifen, sonst die
  Holztür mit Füllungen; Langschild mit Drücker und Schließzylinder.
- **Treppe** im Erdgeschoss unten geschlossen: verputzte Untersicht und das Dreieck unter der offenen Seite (mit Sockelleiste).
- **Wände mit Raufaser**: gestrichene Wände über Raufaser, wie in den meisten deutschen Zimmern (`M.raufaser(hex)`, auf die Farbe der
  Wand getönt; auch die farbigen Wände von heute, getauscht wie der Boden). Die Raufaser ist gezeichnet: 22 000 Holzspäne von 1–4 mm auf
  einer nahtlosen Kachel von einem halben Meter, die Kanten weich, daraus Farbe (die Späne kaum heller) und Relief (Normalen) – je 512²,
  am Telefon 256² auf einem Viertelmeter; in den Fächern des Putz-Materials, also dessen Programm (kein neues). Prüflauf 4 hatte noch das
  Foto des Außenputzes des Pavillons: seine Wetterstreifen und Flecken auf jeder Wand sahen nach altem Putz aus; vorher (ohne) wie Pappe.
- **Böden aus echter Eiche**: Laminat/Parkett aus dem Foto der Eiche des Pavillons (mit Relief), im Programm der Böden der Gartenhäuser;
  vier Töne (hell, natur, grau, dunkel) – je Haus einer aus seiner Nummer (`haeuser/haeuser.js` `floors`: tauscht vor jedem Haus den Boden
  in der Materialtafel von `HHEUTE`; der Baukasten selbst für „nachwende“).
- **Räume so groß wie echte** (`zombie/z_innen_plan.js` `deepen`): ein Band tiefer als ein Raum seiner Art wäre, wird geteilt – das Bad
  vorn 3,0 m, dahinter ein Hauswirtschaftsraum; Schlafzimmer, Kinderzimmer, Kammern, Küchen ebenso (hinten Kammer, Vorratskammer,
  Hauswirtschaftsraum). Jedes Zimmer hat seine Tür vom Flur.
- **Jedes Haus hat ein Bad** (vorher hatte ein eingeschossiges Haus mit Waschküche hinten keins): die Waschküche, die Vorratskammer oder
  eine Kammer wird es; im ganz kleinen Haus (Flur, Stube, Küche, 6 × 6 m) wird hinter der Stube ein Bad von 2,2 m abgeteilt (Tür vom Flur;
  die Küche behält ihre langen Wände für Spüle und Herd). **Ein Schlafzimmer** bekommt ein eingeschossiges Haus ohne eins hinter der Stube
  (sonst der Küche), wenn der Raum mindestens 2,6 m breit ist – Tiefe 42 % des Raums, 2,6–3,4 m (Gerhards Haus: 3,9 × 2,9 m); schmaler
  nicht: eins von 2,1 × 2,5 m ließ neben dem Weg von der Tür keinen Platz für ein Bett, dort schläft man auf dem Schlafsofa der Stube
  („Aufs Sofa legen“). Ein abgeteilter Raum hinten bekommt seine Tür vom Flur: die Treppe, die der Plan auch im eingeschossigen Haus
  vorsah, wird dort nie gebaut und versperrte die Wand (Prüflauf 3: das Bad nur durch die Küche, die Küche darum ohne Platz für die
  Zeile). **Jedes Bad hat WC und Waschbecken**: fand der Stil keinen Platz (kleine Bäder), kommen kompakte hinzu
  (`ZIEINR.furnish`). **Jede Küche hat Spüle und Herd**: fand die Küchenzeile keine Wand, stehen ein Spülenschrank (60 cm, eingelassenes
  Becken) und ein Herd, wo sie passen (Prüflauf 1 fand eine Küche in Schleusingen ohne beides).
- **Spülen mit Becken**: in der Küchenzeile des Baukastens ein eingelassenes Becken (16 cm tief, Rand, Ablauf, die Arbeitsplatte darum
  herum); die Spüle von heute (eine Platte in `haeuser_heute.js`) bekommt Rand, dunkleres Inneres und Ablauf darauf gezeichnet.
- **Trennwände nicht durch Fenster**: Wände zwischen den Zimmern rücken bis 0,6 m (neue bis 1 m), wenn sie ein Fenster der Seitenfassade
  zerschneiden würden – sonst fehlte das Fenster drinnen, das draußen zu sehen ist (die Prüfung zählt verlorene Fenster).
- **Treppenhäuser der Altstadt** (`schleusingen/si_innen.js`): Steinplatten statt Laminat, Ölsockel bis 1,45 m mit dunkler Linie, ringsum
  zwischen den Türen und unter den Fenstern.
- **Alltag nach Haushalt** (`ZIEINR.L.alltag`, aus dem Zufall des Hauses): Schuhe neben der Haustür (Kinderschuhe in Familien), ein
  Getränkekasten in der Küche, der Wäschekorb im Schlaf- oder Badezimmer, Bauklötze und ein Ball im Kinderzimmer (manchmal im
  Wohnzimmer).
- **Gemalte Bilder** (`ZIMOB` `DRAW.bilder`): der Röhrende Hirsch und die Thüringer-Wald-Landschaft in Schichten von fern (blasser,
  bläulicher) nach nah, mit weichen Wolken und Dunst, Wald aus Fichten, See mit Lichtreflexen, Dorf mit Kirche, und darüber ein paar
  tausend kurze Pinselstriche in der Farbe darunter – wie ein Öldruck; vorher flache Formen. (Die Drucke von heute in `haeuser_heute.js` –
  abstrakte Formen, Strichzeichnungen – sind, was 2026 an solchen Wänden hängt.) Der **Wandkalender** der Küchen (`DK.kalender`) mit
  Monatsbild (Himmel, blaue Hügel, grüner Hang mit Feld), rotem Monatsbalken, den Tagen in sieben Spalten (Sonntage rot) und der
  Drahtbindung oben – vorher ein farbiger Block über grauen Strichen wie ein Symbol.
- **Topfpflanzen** (`ZIEINR.DK.pflanze`, auf den Fensterbrettern aller Häuser): die Geranie ein Busch aus zwölf runden, nach außen
  gekippten Blättern mit drei Dolden auf Stielen, die Grünlilie überhängende Blattbänder grün und hell, Erde im Topf; vorher ein grüner
  Kegel mit roter Kappe.
- **Stühle** (`ZIEINR.L.chair`): wie ein Tischler sie baut – Sitz auf einer Zarge, Streben unten, die Hinterbeine gehen in die Lehne über;
  in alten Häusern ein Lehnbrett, sonst drei Sprossen. Die Stühle am Küchentisch mit der Eckbank stehen jetzt zum Tisch (vorher seitlich).
- **Sofa der DDR**: Kissen mit Knick aus zwei Hälften (vorher drei Rollen), das Häkeldeckchen liegt über der Lehne und hängt vorn mit
  gezacktem Saum herab (`L.ueberwurf`; vorher eine flache Scheibe, die über der gerundeten Lehne in der Luft stand).
- **Lichtfleck** vor jedem Fenster bei Tag: ein weicher heller Fleck auf dem Boden, 0,6–1,4 m in den Raum, im Material und Netz des
  Fensterschleiers (keine Draw-Call), nachts weg.
- **Lampenschirme rund** (22 Segmente statt 12). Das Tageslicht-Fülllicht (geliehen) 1,3 m vor dem Fenster in Sturzhöhe (vorher 1 m in
  halber Höhe: sein Glanzpunkt saß auf Duschglas und Spiegeln wie eine Glühbirne). Der Badeofen aus Kupfer mit Nähten statt eines
  orangefarbenen Zylinders.
- **Die Bewohner nach der Uhr** (`haeuser/haeuser.js` `doing`, `haeuser/haeuser_gast.js`): 6:30–8 Frühstück am Küchentisch, vormittags
  Sofa oder Tisch mit der Zeitung, 11:30–12:30 **am Herd** (stehend, die Hände bei der Arbeit – `interactLoop`), Mittag am Tisch,
  nachmittags Sofa, 17:30–18:30 wieder am Herd, Abendbrot am Tisch, ab 19:15 **Sofa mit laufendem Fernseher**, nachts **im Bett unter der
  Decke** (Schlafpose `lie`, der Körper vom Kissen zum Fußende gedreht, die Decke darüber – 28 cm hoch, bis zur Matratze gerundet, in der
  Bettwäsche des Haushalts: weiß, hellblau, rosé oder salbei); **sitzend auf der Höhe des Polsters** (ein Strahl von oben findet die
  Sitzfläche: die Couch der DDR ist höher als ein Sofa von heute – vorher saß Gerhard bis zur Hüfte im Kissen); geht die Stunde weiter, solange man drin ist,
  wechseln sie den Platz; „… grüßen“ nicht, solange einer schläft. Nachts brennt im Raum, in dem sie sind, das Licht. Getestet an Gerhard
  (247) um 14, 11:40, 19:30 und 23 Uhr (`out/innen_real/<tag>/r_gerhard_{nachmittag,mittag,abend,nacht}.jpg`).
- **Prüfung** (`ZINNEN` `H.survey()`): Küche mit Spüle und Herd, Bad mit WC und Waschbecken, Bett in jedem Schlafzimmer, Haustür in den Flur,
  Fenster innen wie außen, Lampe in jedem Wohnraum, die Ausstattung gezählt, eine Signatur des Wohnzimmers (keine zwei gleich).

## 3 Bilder

- Vorher/nachher nebeneinander: `python3 viz3/test/innen_real_vergleich.py vorher nachher` → `out/innen_real/vergleich/*.jpg` (links
  vorher, rechts nachher; gleiche Häuser, gleiche Räume, gleicher Standpunkt – wo ein Raum geteilt wurde, ist die Ansicht eine andere).
- Vorher: `out/innen_real/vorher/` (Ratscher vom Stand `aba42c02c`, Schleusingen aus einem Arbeitsbaum dieses Stands); nachher: die Läufe
  der Feature-CI (Artefakte `out-innen_real-ratscher`, `out-innen_real-schleusingen`) und lokal `out/innen_real/nachher*/`.

## 4 Leistung

Alles im Baukasten wie bisher: ein Netz je Material, gebaut beim Hineingehen, frei beim Hinausgehen (auch die Zimmer-Umgebung). Zahlen je
Haus im Test (`out/innen_real/<tag>/metrics_<ort>.json`: Draw-Calls und Dreiecke je Haus, je Bild Draw-Calls, Dreiecke und Zeit des ganzen
Bildes; der Vergleich oben druckt sie):

| Haus | Draw-Calls vorher → nachher | Dreiecke vorher → nachher |
|---|---|---|
| Ratscher 4004 (heute, Szene) | 29 → 34 | 11 300 → 20 300 |
| Ratscher 247 Gerhard (heute-ddr) | 33 → 38 | 19 500 → 28 800 |
| Ratscher 219 Manfred (heute-90) | 33 → 40 | 18 500 → 40 600 |
| Ratscher 189 (alt) | 30 → 32 | 14 000 → 21 500 |
| Ratscher 253 (heute, das größte) | 46 → 56 | 38 700 → 90 500 |
| Ratscher 281 (heute, das kleinste) | – → 21 | – → 10 200 |
| Schleusingen 900244 (Szene) | 39 → 41 | 18 100 → 38 200 |
| Schleusingen 900462 (heute-ddr) | 44 → 46 | 17 000 → 39 100 |
| Schleusingen 900245 (heute) | 36 → 38 | 19 000 → 40 500 |

(nachher: Prüflauf 4 der Feature-CI, `1af25e80`; der Durchgang aller 230 Häuser in `haeuser:bilder=1`, Prüflauf 5: höchstens 60
Draw-Calls – über 60 lässt ein Haus erst den Fensterschleier, dann den Schatten-Saum weg –, höchstens 116 000 Dreiecke, Bauzeit im Mittel
175 ms, höchstens 686 ms.)

Mehr Draw-Calls: der Schatten-Saum und der Fensterschleier (je +1; ein Haus über 60 lässt erst den Schleier, dann den Saum weg), neue
Bäder mit ihren Fliesen (wo vorher keins war), mehr Türen, wo Räume geteilt wurden. Das
ganze Bild (Haus und was durch die Fenster zu sehen ist, SwiftShader, Stufe „mittel“): Draw-Calls im Mittel 227 → 250, Dreiecke
609 000 → 635 000, Zeit je Bild 13,0 → 9,8 s (auf der geteilten Maschine schwankend – kein Rückschritt). Neue Shader-Programme: zwei,
beide nur im normalen Spiel und beim ersten Haus hinter dem Schwarz übersetzt (`HAEUSER` `warmLooks`): der Schatten-Saum (Basic mit
Alpha-Karte) und das Material, mit dem `PMREM` das Zimmer einmal zeichnet; die Innen-Palette und das Eichenparkett sind Zwillinge
vorhandener Programme. Keine neuen Lichter. Am Telefon keine Zimmer-Umgebung (6 MB gespart), dafür der Himmel mit 60 %. Neue Texturen:
die Raufaser (Farbe und Relief je 512², ≈ 3 MB mit Mipmaps; am Telefon 256², < 1 MB), gezeichnet beim ersten Haus, frei mit dem Baukasten.
Mehr Dreiecke vor allem durch die gerundeten Polster, Pflanzen und Stühle – im Möbel-Netz, ohne Draw-Call.

## 5 Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9046 --serve innen_real:ratscher` (und `:schleusingen`; `tag=vorher` für
  die Bilder vor einer Änderung, `n=` Zahl der Häuser, `nacht=0` ohne Nachtbilder, `nur=klein+alt` nur diese Häuser, `gast=0` ohne
  Gerhards Tag – ein schneller Blick). Bilder und Zahlen in `out/innen_real/<tag>/`; fehlt einem Haus etwas, druckt der Test, was seine
  Räume beim Einrichten verlangt haben und wo die Türen sind (Zeile `why`).
- Prüfungen (je Haus aus `H.survey()`): ≤ 60 Draw-Calls; Küche mit Spüle und Herd, Bad mit WC und Waschbecken, ein Bett in jedem
  Schlafzimmer, es gibt Bad und Küche; Haustür in den Flur, kein Fenster der Fassade drinnen von einer Trennwand verschluckt, eine Lampe
  in jedem Wohnraum; keine zwei Wohnzimmer gleich; Gerhard zu vier Tageszeiten am richtigen Platz; keine Fehler der Seite; Programme ≤ 16
  Texturen.
- Themen-Tests `viz3/extra/innen-real/tests.txt`: `smoke`, `innen_real:ratscher`, `innen_real:schleusingen`, `haeuser:bilder=1`,
  `schleusingen_innen` (zwei Hälften), `zombie_innen`, `memphone`. Prüfläufe: 1 (9d78fe66) alles grün außer `innen_real:schleusingen`
  (eine Küche ohne Spüle – behoben), 2 (826e8109) grün außer `innen_real` (ein kleines Haus ohne Bad, ein Treppenhaus mit falsch
  gezählten Fenstern – beides behoben), 3 (957b859c) grün außer dem kleinen Haus 281 (Küche ohne Zeile, Schlafzimmer ohne Bett – behoben),
  4 (1af25e80) grün außer Gerhard nachts (sein Haus hatte kein Schlafzimmer mehr: die Teilung war zu streng – behoben), 5 (83754066)
  **alles grün** (der Stand zum Zusammenführen um 17:30; `haeuser:bilder=1` 35/35, Durchgang aller 230 Häuser: höchstens 60 Draw-Calls,
  116 000 Dreiecke, Bauzeit im Mittel 175 ms). Danach Stufe 2 (siehe oben: Bilder, Pflanzen, Stühle, Sofa, Bettdecke, Sitzhöhe,
  Lichtfleck, gezeichnete Raufaser) – Prüflauf 6.

## 6 Für den Lead

- **Datei `haeuser/haeuser_heute.js`** (der Stil „heute“ – die Einrichtung, nicht die Fassade) steht in der Tabelle bei `gebaeude`. Ich
  habe sie nicht geändert, sondern von außen gehakt: die Rundung der Polster kommt aus dem Mesher, Boden (Eiche) und Wände (Raufaser) werden
  in `haeuser.js` vor jedem Haus in ihrer Materialtafel (`HHEUTE.mats()`) getauscht, ihre Spüle wird in `ZIEINR.furnish` übermalt. Braucht
  `gebaeude` sie nicht: in der nächsten Runde zu `innen-real` geben (dann Sofa, Küche, Bad, Pflanzen, Bilder dort direkt).
- Geänderte Dateien: nur meine (`haeuser/haeuser.js`, `haeuser_gast.js`, `schleusingen/si_innen.js`, `zombie/z_innen*.js`), dazu Test
  (`viz3/test/innen_real.py`, `innen_real_vergleich.py`), Extra (`viz3/extra/innen-real/tests.txt`), diese Doku. Kein neues Modul, keine
  Zeile in `modules.txt`, kein neuer Speicherschlüssel, keine neue Datei in `dist/`.
- **Die Zombie-Nacht** baut mit demselben Baukasten: sie bekommt die gerundeten Polster, die neuen Sessel, Stühle, Pflanzen, Bilder,
  Heizkörper (nur „nachwende“ – „alt“ und „ddr“ heizen mit Öfen), Schalter, Steckdosen, Griffe, die geschlossene Treppe, die geteilten
  tiefen Räume, Bad in jedem Haus, Spülen, Fliesenspiegel, Alltagsdinge, die Raufaser. Nicht: Innen-Palette, Zimmer-Umgebung,
  Schatten-Saum, Fensterschleier und Lichtfleck (nur mit `ZINNEN.mount(id, { still: true })`, also im normalen Spiel) – ihre Programme
  und Tests bleiben, wie sie waren (`zombie_innen` in jedem Prüflauf grün).
- **Übernommen von `wip/zombie-kit`** (3af4303a, Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv, auf Wunsch des Leads von Hand): der Putz über
  Innentüren 4 mm zurückgesetzt auch in der Zombie-Nacht (kein Flimmern), die Schrankwand mit offenen Fächern auch dort (Fernseher,
  Gläser, Bücher). Die Notiz dazu in `docs/features/haeuser.md` (91e216cb) habe ich nicht übernommen – nicht meine Datei; sie kann mit
  diesem Merge mitkommen oder entfallen. `wip/zombie-kit` ist damit erledigt.
- **Merge**: keine Konflikte erwartet, außer `gebaeude` ändert doch `haeuser_heute.js` (dann bleiben meine Haken gültig: sie lesen nur
  `HHEUTE.mats()` und die Namen `laminat`, `wand`). Nach dem Merge reichen `haeuser:bilder=1`, `zombie_innen`, `innen_real:ratscher`.
- **Für `docs/ARCHITECTURE.md`** (Zeile `HAEUSER`): Bewohner nach der Uhr (`HAEUSER.doing`, `HGAST.show` mit `mode: 'lie'`, `clip`,
  `duvet`, `seatTop` aus einem Strahl auf das Polster, `front` – die Vorderkante der Couch, die Knie darüber); `ZIMOB` neu `M.palIn`,
  `M.schatten`, `M.glare`, `M.parkett`, `M.raufaser(hex)` (gezeichnete Raufaser), `indoorEnv(scene, k)`, `isSoft`, `Mesher.rbox`;
  `ZIEINR.L.ueberwurf`; `ZINNEN` `H.survey()`, `H.fitted`; `ZIPLAN` teilt Bad und Schlafzimmer im eingeschossigen Haus ab (`splitBack`),
  ein so abgeteilter Raum hat seine Tür vom Flur.
- **Zusammenführen um 20:30**: der Stand dieses Zweigs nach Prüflauf 6 (Stufe 2). Stufe 1 (`83754066`, Prüflauf 5 ganz grün) ist darin
  enthalten; wer nur Stufe 1 will, nimmt `83754066`.
