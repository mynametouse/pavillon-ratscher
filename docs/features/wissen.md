# Entdecken und Lernen: das Entdeckerbuch (feat/wissen)

Falko, 5.11.2026 23:28: „… dass man hier viel über die Natur lernt … über verschiedene Handwerke, über die Menschen, über die Politik
letztendlich sogar, über Soziales, über die Geschichte. Viel zu entdecken soll es geben und viel zu lernen.“ Gebaut in der Nacht 5./6.11.2026
vom Hilfs-Agenten `wissen` (Auftrag `docs/plans/auftraege/wissen.md`, Konzept `docs/plans/plan_strategie.md` Abschnitt 13).

## Was es gibt

- **Das Entdeckerbuch** (Menü → Startseite → „Entdeckerbuch“ – am Handy „Buch“, mit Aufgaben und Inventar in einer Reihe, damit die
  Startseite ohne Scrollen passt –, Taste **N**, im Strategie-Modus ein Knopf „📖 Buch“ in seiner Leiste):
  Kapitel **Natur, Handwerk, Geschichte, Politik & Soziales, Orte** und dazu **Regeln** (die „Warum?“-Gründe). Jeder Eintrag: was es ist,
  warum es hier bei Ratscher zählt, ein Symbol, die echten Quellen als Links, wie er gefunden wurde. Noch nicht Gefundenes steht grau mit
  einem Tipp. Fortschritt je Kapitel und gesamt; eine **Suche** im Buch (findet Entdecktes und verstandene Regeln, Unentdecktes nur als Zahl). 81 Einträge und 28 Regeln (76 Einträge in `viz3/src/wissen/wissen_data.js`, 5 der
  Daten-Ansichten in `wissen_daten.js`), dazu Einträge, die aus Ereignissen entstehen (Erkundetes, gepflanzte Arten) – und mit feat/tiere jede
  Art seiner Steckbriefe (`TARTEN`) als Eintrag zum Entdecken, mit Steckbrief und Quellen.
- **Gefunden durch Tun und Sehen** (`viz3/src/wissen/wissen.js`):
  - **Orte** (Ereignis `place`): Anger, Dorflinde, alte Schule, Bach, Klinge, Schleusingen (Markt, Bertholdsburg, St. Johannis, Rathaus),
    Kloster Veßra (Klosterkirche, Henneberger Kapelle), Baumschule, Ziegenweide …
  - **Ereignisse der anderen**: `tiere:entdeckt` (feat/tiere – eine bekannte Art öffnet ihren Eintrag, eine unbekannte wird ein neuer Eintrag
    mit dem Steckbrief aus `TARTEN` und dessen Quellen), `strategie:entdeckt` (feat/strategie – Erkunden statt Nebel; Käferbäume, Sturmholz, der Waldbegang in der Klinge und der
    Motorsägen-Lehrgang öffnen die passenden Einträge, Leute, die man kennenlernt, landen unter Politik & Soziales, anderes wird ein eigener
    Eintrag), `strategie:dorfprojekt` (feat/strategie-dorf: Beschluss oder Ablehnung im Ortsteilrat → „Der Ortsteilrat“, an die Stadt →
    „Stadtrat und Bürgermeister“, von der Aktionsgruppe ausgewählt oder bewilligt → „LEADER“), `hund:befehl` (den Hund rufen → sein
    Steckbrief) und `hund:gelernt` (loben oder tadeln → „Wie ein Hund lernt“), `bus:fahrplan` und `bus:ein` (feat/bus → „Der Bus auf dem
    Land“: wer den Busverkehr bestellt, § 3 ThürÖPNVG), `einrichtung:schale|brand|glasur`
    (Töpfern im Atelier), `einrichtung:bild` (Malen), `gplan:gepflanzt|geschnitten|gemulcht`, `garage:gemaeht`, `fell`, `verkehr:mitfahrt`,
    Aktionen (`act`: Forstkiste, Seilwinde). **Gepflanzte Arten** des Gartenplaners werden eigene Einträge – Text, Pflege und Quellen aus
    seiner Pflanzendatenbank (`gartenplaner/pflanzen.json`).
  - **Zustände, auf die das Buch alle 1,5 s schaut**: Fällschritte (`FELL.trees`: Fallkerb, entasten, ablängen, vermessen), Werkstücke des
    Werkstatt-Spiels (`WERK.W.list`: leimen, Stirnholz, ölen), Blockbandsäge und Trockenstapel, Wahl und Amt (`AMT.ST.phase`), der Gartenplaner
    offen, eine Bauphase des Pavillons (die Phase mit den Solarmodulen → „Strom von der Sonne“, Erträge nach PVGIS; die Fassade → „Yakisugi“;
    der Lehmputz → „Lehmputz“), ein Monat im Spiel – und das **Wetter** (feat/wetter, `WETTER.S.w`): Regen → Steigungsregen am
    Gebirge, Schnee → Schnee und Raureif, Gewitter → Blitz und Donner (3 s je km), Sturm (Böen ab 75 km/h oder Wind ab Stärke 8) → Sturm und
    Windwurf. Mit „wie draußen“ kommt das live von Open-Meteo.
- **Menschen als Lehrer** (`viz3/src/wissen/wissen_lehrer.js`): ein Thema im Gespräch öffnet einen Eintrag – **Gerhard** (Lehrer i. R.,
  Dorfchronist): Henneberger, Kloster Veßra, Reformation, DDR, die Wende, alte Handwerke (Glas in Lauscha, Köhlerei, Schiefer, Fachwerk – je Satz eins);
  **Wolfgang** (Waldarbeiter, „der Förster“ des Dorfs – einen Förster als Figur gibt es nicht): Borkenkäfer, Waldumbau, richtig fällen;
  **Ingrid** (Ortsteilbürgermeisterin): Ortsteilrat, wer was entscheidet, LEADER, Bauen im Außenbereich; **Hubert**: Holz trocknen, Saftruhe,
  Festmeter; **Ronald**: Rotmilan, Rehe, Ziegen, die Erle, die zehn Jahreszeiten der Natur, Wildschweine und – wenn es ihn gibt (feat/tiere) – der Hütehund Hasso. Die eigenen Themen der Dorfbewohner zählen auch (Gerhard „Die alte Schule“,
  Manfred „Die Feuerwehr“, Uwe „Die Talsperre“ …). Sie sagen den Satz in ihren Worten (Hubert und Ronald mit ihrer Stimme), dann ist er im Buch –
  beim ersten Mal öffnet sich das Buch neben dem Gespräch auf dem Eintrag (am Handy statt dessen der Hinweis mit „Lesen“).
- **„Warum?“** an Regeln: `WISSEN.why(id)` → ein Satz mit Quelle (32. BImSchV, BNatSchG, ThürNRG, WHG, BauGB, DGUV …); dieselben IDs wie die
  Regeln des Strategie-Modus (`STRAT.D.RULES`), unbekannte IDs fallen auf dessen Text zurück. Tippt man im Strategie-Modus auf dessen eigenes
  „Warum?“, gilt die Regel auch im Buch als verstanden, und der Grund bekommt „Quellen ›“ mit den verlinkten Quellen des Buchs. Ein Gedanke der Spielfigur, der eine Regel nennt
  (z. B. „Sonn- und Feiertagsruhe“ beim Mäher), bekommt ein kleines **„?“** daneben; angetippt erscheinen Grund und Quelle, die Regel gilt als
  verstanden (Kapitel „Regeln“). Ebenso die Warnungen des Gartenplaners, die auf einem Gesetz beruhen (Grenzabstand nach ThürNRG, am Bach
  der Gewässerrandstreifen nach § 38 WHG) – `WISSEN.chips(root)`.
- **Orte der Geschichte – Infotafeln** (`viz3/src/wissen/wissen_orte.js`): kleine Tafeln mit Dach auf zwei Pfosten an der alten Schule (an der
  Wand mit der Tür, ≥ 2 m von der Tür und vom Weg zur Schulbushaltestelle, frei vom Biertisch des Dorfabends), unter der Dorflinde, am
  Platz am Bach, an der Forstkiste der Unteren Klinge und auf dem Damm der Talsperre Ratscher (Lage nach Structurae,
  50° 29′ 31,5″ N, 10° 46′ 54,7″ E → UTM → Grundstück über `GEOMAN.xf`); „Tafel lesen“ öffnet das Buch beim Eintrag. Ein Mesh im Material der
  Dorf-Requisiten (`VPROPS.mat.paint`) – kein neues Shader-Programm, kein Licht. Dazu je eine Tafel an **Schloss Bertholdsburg** (auf der Seite
  zum Markt) und an der **Henneberger Kapelle in Kloster Veßra** (zum Klostertor hin): gebaut, sobald die Zone der Stadt steht, und mit ihr
  wieder freigegeben.
- **Daten-Ansichten** (`viz3/src/wissen/wissen_daten.js`, „Lernen durch Sehen“ wie in SimCity): auf der Draufsicht (Hingehen → Draufsicht) ein
  kleines Feld links unten (über Maßstab und Quellenzeile; sein Titel klappt es auf eine Zeile zusammen) mit sechs Schaltern und der Legende – **Orte der Geschichte** (die Infotafeln, gelesene gefüllt, und die Orte in
  Schleusingen und Veßra), **Lärm** (Straßen nach ihrer OSM-Klasse mit Bändern über 55 und 45 dB(A),
  Maschinen, solange sie laufen: Mäher, Motorsäge, Blockbandsäge, die lauten Aufträge des Strategie-Modus; dazu die Ruhezeiten des Spieltags
  mit „?“), **Verkehr** (Straßen nach Klasse, die fahrenden Autos des Verkehrs, die Autos der Dorfbewohner, die Busse;
  wie viele Busse am Spieltag in Ratscher halten und welche Linien – aus dem echten Fahrplan von feat/bus), **Sonne**
  (Sonnenstunden des Spieltags auf einem 3-m-Raster über dem Garten – Sonnenstand und Schatten von Gebäuden und Kronen wie im Gartenplaner,
  einmal je Tag gerechnet), **Naturwert** (Wald an der Klinge, Hecken um den Garten, Bach mit 5-m-Uferstreifen, alte Bäume, Dorflinde; gesehene Tiere, Käferbäume
  und die Ruhezone am Schwarzstorch-Horst, sobald man von ihnen weiß – feat/tiere), **Stimmung** (Meinung der Leute von dir, 0–100, an ihrer
  Haustür – „Wahl und Amt“; im Strategie-Modus dazu der Stil). Nur SVG über der Draufsicht: kein Shader-Programm, kein Mesh. Im Strategie-Modus
  sind es Ebenen seines Felds „Ebenen“ (`STRAT.layer.define`, anfangs aus); die Legende erscheint, sobald eine an ist – rechts unter seiner
  Uhr und seinen Feldern, frei von Leuten und Kapitelkarte links. Wer eine Ansicht
  einschaltet, findet ihren Eintrag (Lärm und Ruhe, Straßen und ihre Klassen, Sonne und Schatten, Was Natur wertvoll macht, Ansehen im Dorf).
  Feiertage (Ostern nach Gauß, Thüringer Feiertage), Ruhezeiten und der Abfall des Schalls mit dem Abstand sind reine Helfer in
  `wissen_data.js` (Einheitentests).
- **Hinweis**: „Neu im Entdeckerbuch: …“ oben in der Mitte mit „Lesen“ (im Strategie-Modus als dessen Meldung, `STRAT.note`; am Handy ein
  Balken über der Mitte, bei offenen Daten-Ansichten über deren Feld).
- **Gespeichert**: `pav-wissen-v1` (über `SAVE`, mit Prüfung) – gefunden (Spielminute, wie), verstandene Regeln, gelesene Einträge und die
  aus Ereignissen erzeugten Einträge (feat/tiere meldet eine Art nur einmal).

## API für alle Features

```js
import { WISSEN } from '../wissen/wissen.js';   // oder window.WISSEN, wenn das eigene Modul vor dem Buch lädt
WISSEN.add({ id: 'mein:eintrag', ch: 'handwerk', icon: '🧱', title: 'Kalkputz', text: 'Was es ist …', here: 'Warum hier …',
  src: [['Titel der Quelle', 'https://…']], hint: 'Wie man es findet', find: { place: ['Regex'], ev: [['mein:ereignis', d => d.ok]] } });
WISSEN.found('mein:eintrag', 'tun:den Putz angerührt')  // true, wenn neu (Hinweis, Ereignis 'wissen:neu')
WISSEN.has(id); WISSEN.open(id | 'natur' | … | 'regeln'); WISSEN.close(); WISSEN.progress()
WISSEN.why('ruhe_sonntag')   // { id, title, text, src: [[titel, url]] } | null
WISSEN.explain(id, element)  // zeigt „Warum?“ neben dem Element; WISSEN.whyHTML(id) → '<button data-wiwhy=…>?</button>' für jedes Panel
WISSEN.chips(root)           // Warnungen in Listen wie denen des Gartenplaners (ul.gp-warns, ul.gp-w), die auf einem Gesetz beruhen, bekommen ihr „?“
```

- Kapitel: `natur`, `handwerk`, `geschichte`, `politik`, `orte`. Das „wie gefunden“ (`how`) beginnt mit `ort:`, `gespraech:`, `tafel:`, `tun:`,
  `gesehen:` oder `erkundet:` – das Buch macht daraus einen Satz.
- Ereignisse: `wissen:neu` `{ id, ch, how }`, `wissen:warum` `{ id }`, `wissen:offen` `{ on }`, `wissen:tafel` `{ id }`; zum Fragen in Gesprächen
  `dorf:thema` `{ who, id, n }` (aus `dorf/dorf.js`, für jeden nutzbar).
- Lehrer für weitere Leute: in `WDATA.TEACH` (Dorfbewohner aus `dorf/dorf_text.js` bekommen die Themen in ihr Gespräch; Hubert und Ronald über
  `NPCUI.extend({ topics(w), ask(w, k) })`).

## Testen

- Ohne Browser: `node --test viz3/test/unit/wissen.test.mjs` (jeder Eintrag mit Kapitel, Text, Fundweg und Quelle; jede Regel mit Satz und
  Quelle; Lehrer-Themen zeigen auf vorhandene Einträge; Tafeln; die Talsperre liegt im Quadrat; Fakten, die stimmen müssen; Gedanken der
  Spielfigur → Regel; Thüringer Feiertage 2026 und Ruhezeiten; Schallabfall; die Wetter-Einträge).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9006 --serve wissen menu` (`menu`: die Startseite am Handy) (Abschnitte `buch,ereignis,ort,lehrer,warum,
  wetter,tafel,daten,reload,telefon,zombie,strategie`; dazu `stadt` – die Tafel an der Bertholdsburg, braucht die Kacheln der Stadt); auf GitHub über `viz3/extra/wissen/tests.txt`, Bilder in `out/wissen/`.

## Offen

- Lärm und Verkehr sind Näherungen (Straßenklasse, typische Schallpegel); Zählwerte für die Straßen um Ratscher lagen nicht vor – echt
  gezählt sind nur die Busse (Fahrplan).
- Die Pfosten der Tafeln halten einen auf (ein `KERN.pushOut`-Anbieter, Vorrang 20, außerhalb des Garten-Quadrats); die Tafel am Bach im
  Quadrat nicht – dort hat `game/walkable.js` eigene Kollisionen. Die Tafeln in Schleusingen und Veßra sind bei GitHub nicht prüfbar (dort
  fehlen die Kacheln der Städte) – Abschnitt `stadt` lokal.
- Die Hauptsatzung von Schleusingen war nicht online zu finden: dass Ratscher eine Ortsteilverfassung hat, ist eine Annahme (wie in „Wahl und Amt“).
- Talsperre Ratscher: im Buch die Angaben nach „Talsperren in Thüringen“ (Thüringer Talsperrenverwaltung 1993, über die Wikipedia):
  Schotterdamm mit Asphaltbeton-Außendichtung, 15,2 m über der Gründung, 13,5 m über Tal, 630 m lang; Structurae nennt 16 m und eine
  Betondichtung (dort nur für Bauzeit und Lage benutzt). Das Hochwasser im Dezember 2023 nach der Antwort der Landesregierung
  (Landtag, Drs. 7/9624).
- Der Tag der Eingemeindung 1994 ist in den Quellen uneinheitlich (22. Februar in den Wikipedia-Artikeln „Schleusingen“ und „Heckengereuth“,
  8. März in „Ratscher (Schleusingen)“ und „Gethles“) – im Buch steht nur „seit 1994“. Dorflinde 1888 und Schule 1828: Wikipedia „Ratscher
  (Schleusingen)“; dass dort freitags Skat gespielt wird, ist das Dorfleben des Spiels und so gekennzeichnet.

## Für den Lead

- Gemeinsame Dateien (markiert `feat/wissen`):
  - `viz3/src/dorf/dorf.js` – eine Zeile in `ask()`: `KERN.emit('dorf:thema', { who: k, id, n })`.
  - `viz3/src/npc/npc.js` – `NPCUI.extend` kennt `topics(w)` und `ask(w, k)` (Themen von Erweiterungen in `renderTopics`, Antwort in `ask`).
  - `viz3/src/modules.txt` – Block `# feat/wissen` nach den Blöcken von feat/bus und feat/tiere, vor `game/tutorial.js` (fünf Module); der
    Block von feat/strategie darf davor oder danach stehen (das Buch fragt `window.STRAT`, `TARTEN`, `TIERE`, `TEINFLUSS`, `HUND`, `BUS`,
    `WETTER` erst zur Laufzeit).
- Ohne Eingriff in fremde Dateien: ein `KERN.pushOut`-Anbieter (Vorrang 20, nur die Pfosten der Tafeln), ein `MutationObserver` auf `#npcsub`
  (das „?“ neben Gedanken) und auf `#gplan` (das „?“ an Warnungen des Gartenplaners), ein Klick-Lauscher in der Capture-Phase für
  `[data-wiwhy]` und das „Warum?“ des Strategie-Modus. Gelesene Ereignisse: `tiere:entdeckt`, `strategie:entdeckt`, `hund:befehl`,
  `hund:gelernt`, `bus:fahrplan`, `bus:ein`, `zombie:siren` (→ „Sirenen und Warnung“), `einrichtung:*`, `gplan:*`, `garage:*`, `fell`, `act`, `verkehr:*`, `zinnen:mount`, `place`.
- Neuer Speicher-Schlüssel `pav-wissen-v1` (im Modul über `SAVE.key` angemeldet, Prüfung `v === 1` und `f` ein Objekt) – bitte in
  `docs/ARCHITECTURE.md` §8 eintragen. Neue `window`-Namen: `WISSEN`, `WLEHRER`, `WORTE`, `WDATEN`.
- Quellen: als Text und Links in den Einträgen; eine Sammelzeile über `credits_add` in `viz3/extra/wissen/manifest.json`.
- Taste **N** (beim Fahren nicht: dort ist N die Seilwinde des Traktors).
