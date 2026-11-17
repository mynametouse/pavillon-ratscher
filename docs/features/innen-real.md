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
10. Weiter offen (siehe unten): flache Wandbilder im Comicstil, Pflanzen aus wenigen Blättern, das Fensterlicht ohne Lichtfleck.

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
- **Böden aus echter Eiche**: Laminat/Parkett aus dem Foto der Eiche des Pavillons (mit Relief), im Programm der Böden der Gartenhäuser;
  vier Töne (hell, natur, grau, dunkel) – je Haus einer aus seiner Nummer (`haeuser/haeuser.js` `floors`: tauscht vor jedem Haus den Boden
  in der Materialtafel von `HHEUTE`; der Baukasten selbst für „nachwende“).
- **Räume so groß wie echte** (`zombie/z_innen_plan.js` `deepen`): ein Band tiefer als ein Raum seiner Art wäre, wird geteilt – das Bad
  vorn 3,0 m, dahinter ein Hauswirtschaftsraum; Schlafzimmer, Kinderzimmer, Kammern, Küchen ebenso (hinten Kammer, Vorratskammer,
  Hauswirtschaftsraum). Jedes Zimmer hat seine Tür vom Flur.
- **Jedes Haus hat ein Bad** (vorher hatte ein eingeschossiges Haus mit Waschküche hinten keins): die Waschküche, die Vorratskammer oder
  eine Kammer wird es. **Jedes Bad hat WC und Waschbecken**: fand der Stil keinen Platz (kleine Bäder), kommen kompakte hinzu
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
- **Lampenschirme rund** (22 Segmente statt 12).
- **Die Bewohner nach der Uhr** (`haeuser/haeuser.js` `doing`, `haeuser/haeuser_gast.js`): 6:30–8 Frühstück am Küchentisch, vormittags
  Sofa oder Tisch mit der Zeitung, 11:30–12:30 **am Herd** (stehend, die Hände bei der Arbeit), Mittag am Tisch, nachmittags Sofa, 17:30–18:30
  wieder am Herd, Abendbrot am Tisch, ab 19:15 **Sofa mit laufendem Fernseher**, nachts **im Bett unter der Decke** (Schlafpose, Kopf auf dem
  Kissen); geht die Stunde weiter, solange man drin ist, wechseln sie den Platz. Nachts brennt im Raum, in dem sie sind, das Licht.
- **Prüfung** (`ZINNEN` `H.survey()`): Küche mit Spüle und Herd, Bad mit WC und Waschbecken, Bett in jedem Schlafzimmer, Haustür in den Flur,
  Fenster innen wie außen, Lampe in jedem Wohnraum, die Ausstattung gezählt, eine Signatur des Wohnzimmers (keine zwei gleich).

## 3 Leistung

Alles im Baukasten wie bisher: ein Netz je Material, gebaut beim Hineingehen, frei beim Hinausgehen. Neu nur Dreiecke (gerundete Polster,
Heizkörper, Schalter, Griffe) – Zahlen je Haus im Test (`out/innen_real/<tag>/metrics.json`: Draw-Calls und Dreiecke je Haus, je Bild die
Draw-Calls, Dreiecke und Zeit des ganzen Bildes). Vorher (5 Häuser in Ratscher): 29–46 Draw-Calls, 11 000–39 000 Dreiecke je Haus.
Keine neuen Lichter, keine neuen Shader-Programme (die Innen-Palette ist ein Zwilling der Palette, das Eichenparkett ein Zwilling des
Gartenhaus-Bodens).

## 4 Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9046 --serve innen_real:ratscher` (und `:schleusingen`; `tag=vorher` für
  die Bilder vor einer Änderung, `n=` Zahl der Häuser, `nacht=0` ohne Nachtbilder). Bilder und Zahlen in `out/innen_real/<tag>/`.
- Themen-Tests `viz3/extra/innen-real/tests.txt`: `smoke`, `innen_real:ratscher`, `innen_real:schleusingen`, `haeuser:bilder=1`,
  `schleusingen_innen` (zwei Hälften), `zombie_innen`, `memphone`.

## 5 Für den Lead

- **Datei `haeuser/haeuser_heute.js`** (der Stil „heute“ – Einrichtung, nicht Fassade) steht in der Tabelle bei `gebaeude`. Ich habe sie
  nicht geändert, sondern von außen gehakt: die Rundung kommt aus dem Mesher, der Boden wird in `haeuser.js` vor jedem Haus in ihrer
  Materialtafel getauscht. Wenn `gebaeude` sie nicht braucht: für die nächste Runde zu `innen-real` geben (dann Sofa, Küche, Bad dort direkt).
- Geänderte Dateien: nur meine (`haeuser/haeuser.js`, `haeuser_gast.js`, `zombie/z_innen*.js`), dazu Test, Extra, diese Doku. Keine Zeile in
  `modules.txt` (kein neues Modul).
- Die Zombie-Nacht bekommt dasselbe (gerundete Polster, Heizkörper nur in „nachwende“, Schalter, Griffe, Treppe, Raumteilung); ihre
  Palette bleibt die alte (ihre Programme und Tests unverändert).
