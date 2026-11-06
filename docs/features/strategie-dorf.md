# Ratscher von oben – das Dorf (feat/strategie-dorf)

Falkos Wunsch (5.11.2026, 23:14–23:30, Konzept `docs/plans/plan_strategie.md`, Abschnitte 6 und 13): im Strategie-Modus „Ratscher von oben“
das Dorf – Projekte mit den Leuten und Ansehen, der kleine Haushalt des Ortsteils und die Stadt für Größeres, Land pachten oder kaufen statt
erobern, Krisen-Einsätze mit der Freiwilligen Feuerwehr, Erkunden. Realistisch: wer entscheidet, was es kostet, wer hilft, wie lange es
dauert – jeder Schritt mit Quelle. Gebaut in der Nacht 5./6.11.2026 vom Hilfs-Agenten `strategie-dorf` (Auftrag
`docs/plans/auftraege/strategie-dorf.md`) auf dem Kern von `feat/strategie` (API: `docs/features/strategie.md`).

## Was es gibt (Stand: 6.11.2026, Nacht)

- **Orte des Dorfs** auf dem Spielfeld: der Anger mit der Dorflinde (Ansehen, Dorfprojekte), die alte Schule (Ortsteilrat, Geld des
  Ortsteils, Feuerwehr, Aushang), die Bushaltestelle, das Rathaus Schleusingen (Stadtrat, Mittel der Stadt).
- **Erkunden statt Nebel:** am Anfang kennst du im Dorf niemanden. Der Auftrag „Im Dorf herumhören“ (am Anger, Reden) bringt neue
  Bekanntschaften – Sarah (Reden 5) lernt drei Leute kennen, Falko zwei; jede ist eine Entdeckung mit dem, was man über sie erfährt, und sie
  erzählen, wen sie kennen. Erst dann kennt man ihre Wünsche: Ingrid die Mitfahrbank, Gerhard die Infotafel, Manfred die Kirmes, Wolfgang
  das Bushäuschen, Katrin die Laterne. „Aushang lesen“ an der alten Schule: die Feuerwehr sucht Leute.
- **Ansehen = die Meinungen des Ortsvorsteher-Spiels** (`AMT.ST.rep`, `amt/amt_model.js`) – keine zweite Kopie. Sie ändern sich mit dem
  Gespräch (gefragt werden: +1 bis +2 am Tag), mit dem gemeinsamen Anpacken (+2 für jeden Helfer), mit fertigen Projekten (die „Fans“ des
  Anliegens), mit abgelehnten (−), mit gehaltenen Versprechen; und was sich im Dorf über deinen Stil herumspricht (eine verspätete Bestellung,
  Käferbäume zu spät aus dem Wald: −1 bei allen, die du kennst). Umgekehrt nährt jedes fertige Dorfprojekt deinen Stil (+3).
- **Dorfprojekte mit echten Schritten** (fünf, alle Anliegen des Ortsvorsteher-Spiels): Mitfahrbank (Ortsteilrat, 380 €), Infotafel an
  der alten Schule (Ortsteilrat, 260 €), Kirmes (Ortsteilrat, 450 €, Gestattung für den Ausschank), Bushäuschen (Stadtrat, 1.600 €, Bauhof),
  LED-Laterne am Gartenweg (Stadtrat, 4.200 €, Kompromiss: abgeschirmt, warmweiß, Bewegungsmelder – Kommunalrichtlinie). Schritte:
  Aufträge für deine Leute (mit Dorfbewohnern als Helfern), der **Ortsteilrat** (am nächsten Freitag- oder Samstagabend mindestens drei Tage
  später, öffentlich – abgestimmt nach `AMTMODEL.ortsrat`: die Mitglieder nach ihrer Meinung von dir und ihrer Haltung zur Sache; wer von
  deinen Leuten da ist, redet in der Einwohnerfragestunde), der **Stadtrat** donnerstags (`AMTMODEL.council`: beschlossen, vertagt,
  abgelehnt – mit Grund), der Bauhof (Werktage), Lieferungen. Fertig steht es **in der Welt**: `AMT.ST.built`, gebaut von `amt/amt_world.js`
  (dieselbe Bank wie in der Ich-Sicht).
- **Geld des Ortsteils:** 600 € im Jahr (§ 45 Abs. 6 ThürKO, `AMT.ST.budget`), jede Ausgabe im Haushaltsbuch des Ortsteils (Feld der alten
  Schule); ab Januar neues Geld. Die Stadt hat für kleine Maßnahmen aller Ortsteile 12.000 € im Jahr (vereinfacht wie im Ortsvorsteher-Spiel).
  In der Leiste: „Dorf Ø 52 · 600 €“ (Ansehen der Leute, die du kennst, und das Geld des Ortsteils).
- **Land statt Eroberung** (Ort „Flur“ auf der Wiese zwischen Garten und Dorf): die Hangwiese (0,35 ha Grünland, Uwe) pachten oder kaufen,
  einen Ackerstreifen am Feldweg pachten (0,25 ha), ein Waldstück an der Klinge kaufen (0,81 ha, eine Erbengemeinschaft – Wolfgang kennt es).
  Wem was gehört, weiß man erst nach dem Gespräch. Der Eigentümer stimmt zu, wenn er dir traut (Pacht ab Meinung 40, Kauf ab 50), die
  Nachbarn müssen einverstanden sein (Heike, Ronald; Hubert am Wald). **Fair** (ortsüblich) oder **knapp** (−20 %) bieten: knapp verärgert
  (−4) und wird unter Meinung 70 abgelehnt; fair gibt +3. Pacht: Vertrag am Küchentisch, die Jahrespacht aus deiner Kasse, danach zu
  **Martini** (11.11.). Kauf: Notar in Schleusingen, Kaufpreis + **5 % Grunderwerbsteuer** (Thüringen seit 1.1.2024) + ~2 % Notar und
  Grundbuch, dann Genehmigung (Grundstückverkehrsgesetz; beim Wald zwei Monate Vorkaufsrecht der Gemeinde, dann des Landes, § 17
  ThürWaldG) und Grundbuch. Preise: Thüringen Ackerland 2024 Ø 14.900 €/ha, Neupacht Ackerland 2023 Ø 257 €/ha
  (Destatis/Agrarstrukturerhebung), Südthüringen deutlich darunter; Grünland am Hang (0,90 €/m², 120 €/ha Pacht) und Wald mit Bestand
  (1,30 €/m²) als ausgewiesene Annahmen. Auf der Karte: die Flächen gestrichelt, gepachtet grün gestrichelt, eigene grün.
- **Streuobstwiese** auf der gepachteten (oder gekauften) Hangwiese: Sorten mit Gerhard und Heike wählen, zwölf Hochstämme in der Baumschule
  Kammbach bei Kloster Veßra holen (864 €; derselbe Ort `kammbach` wie beim Garten von `strategie-bau`), pflanzen – nur in der Pflanzzeit
  (Mitte Oktober bis Ende März, Regel mit „Warum?“). Danach stehen **zwölf junge Bäume in der Welt** (`strategie/st_dorf_welt.js`): Pfahl
  auf der Wetterseite, Drahthose gegen Rehe, von Mai bis Oktober mit Laub. Lernen: § 30 BNatSchG (Streuobstwiesen geschützt seit 2022),
  Abstände, alte Sorten.
- **Förderantrag (LEADER):** „Treffpunkt am Anger“ (24.000 €; Ingrids zweiter Wunsch) – Beratung beim Regionalmanagement, drei Angebote,
  Ortsteilrat, Stadtrat übernimmt den **Eigenanteil** (35 %, gleiche Regel wie `AMTMODEL.council`), Projektskizze zum **Stichtag** der
  Aktionsgruppe Hildburghausen-Sonneberg (31.3./30.9., Annahme), **Bewertungsmatrix** (Beratung, Beteiligung – fünf Leute kennen –,
  Sarahs Dorfversammlung, einstimmiger Ortsteilrat, Vorbereitung, Gemeinschaft, Klima, zugesagte Eigenleistung; mindestens 24 Punkte),
  **Bewilligungsbescheid** des Landes (TLLLR) – erst dann baut die Zimmerei (Regel „Vorhabenbeginn“, VV zu § 44 ThürLHO), Arbeitseinsatz
  mit Jens, Manfred, Uwe, **Verwendungsnachweis**, Auszahlung. Fertig steht die überdachte Sitzgruppe mit Fahrradständer und
  E-Bike-Ladesäule am Anger in der Welt. Die Beratung erklärt auch, warum nicht die **Dorferneuerung** des Landes (Richtlinie ILE/REVIT
  2022: 65 % für Gemeinden, Antrag bis 15. Januar beim TLLLR, Geld vor allem für anerkannte Förderschwerpunkte mit Gemeindlichem
  Entwicklungskonzept – Ratscher ist im Spiel keiner, Annahme).
- **Krisen-Einsätze mit der Freiwilligen Feuerwehr** (`strategie/st_dorf_krise.js`): Sturm wirft Fichten über den Weg zur Klinge (aus dem
  Sturm-Ereignis des Kerns), Starkregen lässt den Bach am Durchlass des Gartens steigen (ein Tag mit Starkregen – oder echter Starkregen
  draußen über feat/wetter), Bodenfeuer an der Klinge nach Wochen ohne Regen (April–September). Ablauf echt: Alarm (Sirene auf der alten
  Schule, Funkmeldeempfänger), Ausrücken, Hilfsfrist, Erkunden und Absichern, Arbeit, Freigabe; **wer kommt, hängt von der Zeit ab**
  (werktags tagsüber drei – die anderen arbeiten in der Stadt –, sonst sieben; beim Waldbrand nach einer halben Stunde Schleusingen dazu).
  „Leute hinschicken“ an der Meldung oder der Auftrag „Der Feuerwehr helfen“ an der Einsatzstelle (unter der Woche Hubert und Ronald).
  Die Zeit bis zum Schaden läuft (auf der Karte: Einsatzstelle mit Fortschritt und Uhr, das Feuerwehrauto unterwegs); zu spät: der Schaden
  (beim Hochwasser 650 € für Trocknen und Aufräumen). Geholfen: Meinungen (Manfred, Jens, Wolfgang, Hubert …) und Stil steigen. In der Welt:
  die Fichten quer über dem Weg, danach die Stämme am Rand; der Sandsackwall am Durchlass; Rauch, danach die Brandfläche – je ein paar Tage.
  Sicherheit mit Quelle (verspanntes Holz, 15 cm strömendes Wasser, Bodenfeuer nie von vorn).
- **Was die Feuerwehr braucht:** Projekt „Feuerwehr: Ausrüstung für Waldbrände“ (Ortsteilrat, 480 €: vier Löschrucksäcke, Feuerpatschen –
  beim Waldbrand greift die Wehr dann schneller an) und der Auftrag **Grundausbildung Feuerwehr (Truppmann)** für deine Leute (im Spiel zwei
  Lehrgangstage; wirklich rund 70 Stunden): danach sind sie Mitglieder – der Melder alarmiert sie mit, wenn sie in Ratscher sind, und im
  Einsatz richten sie mehr aus. Manfred und Jens freut es.
- **Nachbarschaftshilfe** (sobald man die Leute kennt): Heikes Hühnerstall flicken, Gerhard auf dem Dachboden der alten Schule helfen (eine
  Entdeckung zur Geschichte), Ingrid zum Arzt fahren, Wolfgangs Holz spalten – je mit einer Lehre; beim ersten Mal +5 und Stil +1, danach
  alle zwei Wochen wieder (+2).
- **Feldweg: Schotter in die Löcher** (Wolfgangs zweite Sorge): Ortsteilrat empfiehlt, Stadtrat bezahlt 20 t Schotter (650 €), der Bauhof
  kippt ihn ab, das Dorf baut ihn an einem Samstag ein (Hubert, Uwe, Wolfgang). Danach liegen helle Schotterflecken auf dem Weg zur Klinge.
- **Glasfaser für Ratscher** (Jens): Infoabend in der alten Schule, von Tür zu Tür (wer gut redet, holt mehr Unterschriften), sechs Wochen
  Vorvermarktung – die **Quote** (40 % von 55 Haushalten, Annahme) hängt am Ansehen bei den Leuten, die du kennst. Erreicht: die Tiefbaufirma
  legt Leerrohre, ein grauer Netzverteiler steht am Anger. Verfehlt: neu anfangen oder auf den geförderten Ausbau hoffen.
- **Straßenbeleuchtung auf LED** (Katrins zweiter Wunsch, Stadtrat, 9.100 €): Leuchten zählen und den Verbrauch schätzen (die Zahlen für die
  Einsparprognose), Ortsteilrat, Stadtrat trägt 60 %, **Kommunalrichtlinie** 40 % (adaptiv geregelt; 25 % bei Zeit-/Präsenzschaltung) – ohne
  Stichtag, Antrag beim Projektträger ZUG, Zuwendungsbescheid nach etwa vier Monaten, erst dann tauscht die Elektrofirma die Köpfe.
  Lernen: 70–125 W alt gegen 15–25 W LED, rund 3.000 kWh und 900 € im Jahr, höchstens 3000 K wegen der Insekten. Auf der Karte: die
  Leuchten des Dorfs als LED markiert (das Licht in der Welt bleibt, wie es ist – die Leuchten des Dorfs sind schon warmweiß gezeichnet).
- **Die Kirmes in der Welt:** am Kirmes-Wochenende (`AMT.ST.kd`, das Datum des Ortsvorsteher-Spiels) stehen von Freitagmittag bis
  Montagmittag ein Festzelt mit Bierbänken und der **Kirmesbaum** (geschälte Fichte, grüne Krone, Kranz mit Bändern) am Anger. Von oben
  beschlossen, liegt der Termin in der **Kirmeszeit im Herbst** (Kirchweih nach der Ernte; für Ratscher Annahme: der erste Samstag im
  September oder Oktober, mindestens zehn Tage nach dem Beschluss) – kein Festzelt im Schnee. `amt/amt.js` setzt ihn bei eigenen
  Beschlüssen noch zehn Tage später, ganz gleich in welchem Monat (nicht geändert).
- **Ruhezeiten halten (auch zu Fuß):** wer in der Ich-Sicht sonntags, feiertags oder nach 20 Uhr den Benzinmäher laufen lässt, hört Ronald
  über den Zaun rufen – Hubert, Ronald und Heike denken schlechter von dir, dein Stil sinkt (einmal am Tag, mit der Regel und ihrem Grund).
- **Ebene „Dorf“:** die Häuser der Leute mit ihrer Meinung von dir (grün, gelb, rot; Unbekannte grau mit „?“) und die Flächen; **Ebene
  „Einsätze“**. Im Feld des Angers bei jeder Person: was sie sich wünscht und wen sie kennt (wohin man als Nächstes geht).
- **Im Entdeckerbuch** (feat/wissen, über seine API – `strategie/st_dorf_wissen.js`): fünf eigene Einträge – „Vom Wunsch zum Dorfprojekt“
  (beim ersten Gespräch im Dorf), „Land pachten oder kaufen“, „Die Streuobstwiese“, „Fördergeld: Eigenanteil, Frist, Bescheid“, „Ein
  Einsatz: vom Alarm bis zur Freigabe“ – und die Einträge des Buchs, wenn man die Sache tut: Ehrenamt und Dorfgemeinschaft, die alte
  Schule (Dachboden), die Freiwillige Feuerwehr (Grundausbildung, Alarm), der Ortsteilrat (Aushang, Beschluss), Stadtrat, LEADER,
  Mitfahren auf dem Land, der Bus, einen Baum pflanzen, Sturm und Windwurf. Die Bekanntschaften im Dorf landen so nicht mehr als
  allgemeine Einträge im Kapitel „Natur“.
- **Kapitel 5 · Das Dorf** mit vier Zielen (fünf Leute kennen, ein Projekt durch den Ortsteilrat, ein Projekt fertig, bei einem Einsatz helfen).

## Testen

- Ohne Browser: `node --test viz3/test/unit/strategie_dorf.test.mjs` (jeder Projektschritt machbar, jede Regel und jedes Projekt mit Grund
  und Quelle, Flächen und Preise, die LEADER-Schritte in ihrer Reihenfolge, die Krisen-Zahlen: werktags allein zu spät, mit zwei Helfern
  rechtzeitig).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9004 --serve strategie_dorf` (Abschnitte
  `reden,projekt,kirmes,land,obst,foerder,krise,mehr,welt,reload`);
  auf GitHub über `viz3/extra/strategie-dorf/tests.txt` (dazu die schnellen Abschnitte des Kern-Tests `strategie`), Bilder in `out/strategie_dorf/`.

## Offen

- Die Sitzungen von Ortsteilrat und Stadtrat laufen von selbst (mit Ergebnis, Abstimmung und Grund als Meldung); in der Ich-Sicht sitzt man
  noch nicht darin (das Ortsvorsteher-Spiel hat dafür eigene Szenen – zusammenführen wäre der nächste Schritt).
- Glasfaser: in der Welt steht nur der Netzverteiler am Anger, nicht die Hausanschlüsse; der geförderte Ausbau (Gigabit-Förderung) ist nur
  erklärt, nicht spielbar. LED: das Licht der Leuchten in der Welt bleibt gleich (nur die Karte markiert sie als LED).
- Krisen: das Feuerwehrauto und die Einsatzkräfte gibt es nur auf der Karte (kein Fahrzeugmodell, keine Figuren); der Waldbrand verbrennt
  keine Bäume des Walds (nur die Brandfläche am Boden); Sandsäcke nur nach gelungenem Einsatz, kein Wasser im Garten bei Schaden.
- Treffpunkt, Obstbäume, Kirmeszelt und Spuren der Einsätze haben keine Kollision (man kann hindurchgehen).
- Die Flächen sind Rechtecke des Spiels an plausiblen Stellen (offene Wiese, Acker, Wald nach dem Luftbild 2024), keine echten Flurstücke.
- Fördersatz (65 %) und Punkte der LEADER-Auswahl, Grünland- und Waldpreise, Quote der Glasfaser, Kosten der Projekte, dass Ratscher kein
  Förderschwerpunkt der Dorferneuerung ist, sind ausgewiesene Annahmen; die Regeln (ThürKO, BGB, LPachtVG, Grunderwerbsteuer, Kommunalrichtlinie, Einsatzgrundzeit, BNatSchG) mit Quelle.
- Später nach dem Konzept: Dorfwettbewerb „Unser Dorf hat Zukunft“, Region (Radweg, Bürgerbus, Energiegenossenschaft).

## Für den Lead

- Gemeinsame Dateien: `viz3/src/modules.txt` (Block `# feat/strategie-dorf` nach dem Block von `strategie-bau`, vor `wissen`) und **ein markierter Haken in
  `viz3/src/amt/amt.js` `begin()`**: Bisher ersetzte der Brief von Ingrid (beim ersten Gehen ab Spieltag 2) den ganzen Zustand des
  Ortsvorsteher-Spiels durch einen frischen – was das Dorf von oben schon getan hatte (Meinungen, gebaute Dinge, Anliegen, Geld des Ortsteils)
  war danach weg (CI-Lauf 42137549204: die Mitfahrbank stand nach dem Neuladen nicht mehr). Jetzt bleiben `built`, `anl`, `log`, `pos`,
  `budget`, `byear`, `kd`, und die Meinungen behalten ihre Änderung über dem Bonus der Welt.
- `amt/amt.js` hat kein exportiertes `save`: das Modul schreibt den Zustand des Ortsvorsteher-Spiels genauso wie es selbst
  (`SAVE.set('pav-amt-v1', AMT.ST)`, danach `AMT.renderBook()`). Schöner wäre `save` in der Rückgabe von `AMT` (eine Zeile).
- Neue `window`-Namen: `STDORF`, `STDKRISE`, `STDWELT`, `STDWISSEN` (Tests). `st_dorf_wissen.js` lädt vor `wissen/*` und trägt seine
  Einträge über `window.WISSEN` ein, sobald alle Module geladen sind (und noch einmal beim Start des Modus) – ohne das Buch tut es nichts.
- Für `wissen`: `strategie:entdeckt` mit einer unbekannten Art (`kind`) wird im Buch ein allgemeiner Eintrag im Kapitel **Natur** – das Dorf
  verhindert das für seine Arten mit eigenen Regeln; `strategie-bau` meldet `kind: 'bau'` (die Bodenplatte), das landet noch in „Natur“.
  Vorschlag: `bau` → handwerk, `kontakt`/`dorf` → politik, `geschichte` → geschichte in `wissen/wissen.js`. Zustand im Kern-Speicher: `STRAT.S.ext.dorf` und `STRAT.S.ext.krise`
  (geprüft beim Laden).
- Zusammengeführt: `origin/src` nach Runde B (24be07de) und `origin/feat/strategie` bis 22b1bdca – Konflikte nur in `modules.txt`
  (Reihenfolge: Kern, `strategie-bau`, `strategie-dorf`, `wissen`).
- Neue KERN-Ereignisse: `strategie:dorfprojekt` {id, state: begonnen | beschlossen | stadt | vertagt | abgelehnt | fertig, t},
  `strategie:dorfbuchung` {eur, text, saldo} (Geld des Ortsteils – absichtlich nicht `strategie:buchung`, das ist deine Kasse),
  `strategie:krise` {id: baum | hochwasser | waldbrand, state: alarm | schaden | geschafft | zu spät, ok, t, helped}.
- Für den Kern-Helfer: `STRAT.ui.H.panel()` neu zeichnen nach eigenen Knöpfen im Feld (`info()` mit `data-dorf`) – ein kleiner offizieller
  Haken (`STRAT.ui.repaint()`) wäre sauberer.
