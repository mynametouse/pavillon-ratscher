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
- **Ebene „Dorf“:** die Häuser der Leute mit ihrer Meinung von dir (grün, gelb, rot; Unbekannte grau mit „?“).
- **Kapitel 5 · Das Dorf** mit drei Zielen (fünf Leute kennen, ein Projekt durch den Ortsteilrat, ein Projekt fertig).

## Testen

- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9004 --serve strategie_dorf` (Abschnitte `reden,projekt,welt,reload`);
  auf GitHub über `viz3/extra/strategie-dorf/tests.txt` (dazu die schnellen Abschnitte des Kern-Tests `strategie`), Bilder in `out/strategie_dorf/`.

## Offen

Siehe unten, wird in der Nacht fortgeschrieben.

## Für den Lead

- Keine Änderung an gemeinsamen Dateien außer `viz3/src/modules.txt` (Block `# feat/strategie-dorf` direkt unter `strategie/st_hud.js`).
- `amt/amt.js` hat kein exportiertes `save`: das Modul schreibt den Zustand des Ortsvorsteher-Spiels genauso wie es selbst
  (`SAVE.set('pav-amt-v1', AMT.ST)`, danach `AMT.renderBook()`). Schöner wäre `save` in der Rückgabe von `AMT` (eine Zeile).
- Neue `window`-Namen: `STDORF` (Tests). Zustand im Kern-Speicher: `STRAT.S.ext.dorf` (geprüft beim Laden).
- Neue KERN-Ereignisse: `strategie:dorfprojekt` {id, state: begonnen | beschlossen | stadt | vertagt | abgelehnt | fertig, t},
  `strategie:dorfbuchung` {eur, text, saldo} (Geld des Ortsteils – absichtlich nicht `strategie:buchung`, das ist deine Kasse).
- Für den Kern-Helfer: `STRAT.ui.H.panel()` neu zeichnen nach eigenen Knöpfen im Feld (`info()` mit `data-dorf`) – ein kleiner offizieller
  Haken (`STRAT.ui.repaint()`) wäre sauberer.
