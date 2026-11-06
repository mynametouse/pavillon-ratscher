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
  Grundbuch, dann Genehmigung (Grundstückverkehrsgesetz, beim Wald das Vorkaufsrecht nach § 17 ThürWaldG) und Grundbuch. Preise:
  Thüringen Ackerland 2024 Ø 14.900 €/ha, Neupacht Ackerland 2023 Ø 257 €/ha (Destatis/Agrarstrukturerhebung), Südthüringen deutlich
  darunter; Grünland am Hang (0,90 €/m², 120 €/ha Pacht) und Wald mit Bestand (1,30 €/m²) als ausgewiesene Annahmen. Auf der Karte: die
  Flächen gestrichelt, gepachtet grün gestrichelt, eigene grün.
- **Streuobstwiese** auf der gepachteten (oder gekauften) Hangwiese: Sorten mit Gerhard und Heike wählen, zwölf Hochstämme in der Baumschule
  bei Kloster Veßra holen (864 €), pflanzen – nur in der Pflanzzeit (Mitte Oktober bis Ende März, Regel mit „Warum?“). Danach stehen
  **zwölf junge Bäume in der Welt** (`strategie/st_dorf_welt.js`): Pfahl auf der Wetterseite, Drahthose gegen Rehe, von Mai bis Oktober mit
  Laub. Lernen: § 30 BNatSchG (Streuobstwiesen geschützt seit 2022), Abstände, alte Sorten.
- **Förderantrag (LEADER):** „Treffpunkt am Anger“ (24.000 €; Ingrids zweiter Wunsch) – Beratung beim Regionalmanagement, drei Angebote,
  Ortsteilrat, Stadtrat übernimmt den **Eigenanteil** (35 %, gleiche Regel wie `AMTMODEL.council`), Projektskizze zum **Stichtag** der
  Aktionsgruppe Hildburghausen-Sonneberg (31.3./30.9., Annahme), **Bewertungsmatrix** (Beratung, Beteiligung – fünf Leute kennen –,
  Sarahs Dorfversammlung, einstimmiger Ortsteilrat, Vorbereitung, Gemeinschaft, Klima, zugesagte Eigenleistung; mindestens 24 Punkte),
  **Bewilligungsbescheid** des Landes (TLLLR) – erst dann baut die Zimmerei (Regel „Vorhabenbeginn“, VV zu § 44 ThürLHO), Arbeitseinsatz
  mit Jens, Manfred, Uwe, **Verwendungsnachweis**, Auszahlung. Fertig steht die überdachte Sitzgruppe mit Fahrradständer und
  E-Bike-Ladesäule am Anger in der Welt.
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
- **Ebene „Dorf“:** die Häuser der Leute mit ihrer Meinung von dir (grün, gelb, rot; Unbekannte grau mit „?“) und die Flächen; **Ebene
  „Einsätze“**.
- **Kapitel 5 · Das Dorf** mit vier Zielen (fünf Leute kennen, ein Projekt durch den Ortsteilrat, ein Projekt fertig, bei einem Einsatz helfen).

## Testen

- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9004 --serve strategie_dorf` (Abschnitte
  `reden,projekt,land,obst,foerder,krise,welt,reload`);
  auf GitHub über `viz3/extra/strategie-dorf/tests.txt` (dazu die schnellen Abschnitte des Kern-Tests `strategie`), Bilder in `out/strategie_dorf/`.

## Offen

Siehe unten, wird in der Nacht fortgeschrieben.

## Für den Lead

- Gemeinsame Dateien: `viz3/src/modules.txt` (Block `# feat/strategie-dorf` direkt unter `strategie/st_hud.js`) und **ein markierter Haken in
  `viz3/src/amt/amt.js` `begin()`**: Bisher ersetzte der Brief von Ingrid (beim ersten Gehen ab Spieltag 2) den ganzen Zustand des
  Ortsvorsteher-Spiels durch einen frischen – was das Dorf von oben schon getan hatte (Meinungen, gebaute Dinge, Anliegen, Geld des Ortsteils)
  war danach weg (CI-Lauf 42137549204: die Mitfahrbank stand nach dem Neuladen nicht mehr). Jetzt bleiben `built`, `anl`, `log`, `pos`,
  `budget`, `byear`, `kd`, und die Meinungen behalten ihre Änderung über dem Bonus der Welt.
- `amt/amt.js` hat kein exportiertes `save`: das Modul schreibt den Zustand des Ortsvorsteher-Spiels genauso wie es selbst
  (`SAVE.set('pav-amt-v1', AMT.ST)`, danach `AMT.renderBook()`). Schöner wäre `save` in der Rückgabe von `AMT` (eine Zeile).
- Neue `window`-Namen: `STDORF` (Tests). Zustand im Kern-Speicher: `STRAT.S.ext.dorf` (geprüft beim Laden).
- Neue KERN-Ereignisse: `strategie:dorfprojekt` {id, state: begonnen | beschlossen | stadt | vertagt | abgelehnt | fertig, t},
  `strategie:dorfbuchung` {eur, text, saldo} (Geld des Ortsteils – absichtlich nicht `strategie:buchung`, das ist deine Kasse).
- Für den Kern-Helfer: `STRAT.ui.H.panel()` neu zeichnen nach eigenen Knöpfen im Feld (`info()` mit `data-dorf`) – ein kleiner offizieller
  Haken (`STRAT.ui.repaint()`) wäre sauberer.
