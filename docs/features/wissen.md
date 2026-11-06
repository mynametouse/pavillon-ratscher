# Entdecken und Lernen: das Entdeckerbuch (feat/wissen)

Falko, 5.11.2026 23:28: „… dass man hier viel über die Natur lernt … über verschiedene Handwerke, über die Menschen, über die Politik
letztendlich sogar, über Soziales, über die Geschichte. Viel zu entdecken soll es geben und viel zu lernen.“ Gebaut in der Nacht 5./6.11.2026
vom Hilfs-Agenten `wissen` (Auftrag `docs/plans/auftraege/wissen.md`, Konzept `docs/plans/plan_strategie.md` Abschnitt 13).

## Was es gibt

- **Das Entdeckerbuch** (Menü → Startseite → „Entdeckerbuch“, Taste **N**, im Strategie-Modus ein Knopf „📖 Buch“ in seiner Leiste):
  Kapitel **Natur, Handwerk, Geschichte, Politik & Soziales, Orte** und dazu **Regeln** (die „Warum?“-Gründe). Jeder Eintrag: was es ist,
  warum es hier bei Ratscher zählt, ein Symbol, die echten Quellen als Links, wie er gefunden wurde. Noch nicht Gefundenes steht grau mit
  einem Tipp. Fortschritt je Kapitel und gesamt. 57 Einträge und 25 Regeln im ersten Stand (`viz3/src/wissen/wissen_data.js`).
- **Gefunden durch Tun und Sehen** (`viz3/src/wissen/wissen.js`):
  - **Orte** (Ereignis `place`): Anger, Dorflinde, alte Schule, Bach, Klinge, Schleusingen (Markt, Bertholdsburg, St. Johannis, Rathaus),
    Kloster Veßra (Klosterkirche, Henneberger Kapelle), Baumschule, Ziegenweide …
  - **Ereignisse der anderen**: `tiere:entdeckt` (feat/tiere – eine bekannte Art öffnet ihren Eintrag, eine unbekannte wird ein neuer Eintrag
    mit dem Steckbrief aus `TARTEN` und dessen Quellen), `strategie:entdeckt` (feat/strategie – Erkunden statt Nebel), `einrichtung:schale|brand|glasur`
    (Töpfern im Atelier), `gplan:gepflanzt`, `garage:gemaeht`, `fell`, `verkehr:mitfahrt`, Aktionen (`act`: Forstkiste, Seilwinde).
  - **Zustände, auf die das Buch alle 1,5 s schaut**: Fällschritte (`FELL.trees`: Fallkerb, entasten, ablängen, vermessen), Werkstücke des
    Werkstatt-Spiels (`WERK.W.list`: leimen, Stirnholz, ölen), Blockbandsäge und Trockenstapel, Wahl und Amt (`AMT.ST.phase`), der Gartenplaner
    offen, eine Bauphase des Pavillons.
- **Menschen als Lehrer** (`viz3/src/wissen/wissen_lehrer.js`): ein Thema im Gespräch öffnet einen Eintrag – **Gerhard** (Lehrer i. R.,
  Dorfchronist): Henneberger, Kloster Veßra, Reformation, DDR, alte Handwerke (Glas in Lauscha, Köhlerei, Schiefer, Fachwerk – je Satz eins);
  **Wolfgang** (Waldarbeiter, „der Förster“ des Dorfs – einen Förster als Figur gibt es nicht): Borkenkäfer, Waldumbau, richtig fällen;
  **Ingrid** (Ortsteilbürgermeisterin): Ortsteilrat, wer was entscheidet, LEADER, Bauen im Außenbereich; **Hubert**: Holz trocknen, Saftruhe,
  Festmeter; **Ronald**: Rotmilan, Rehe, Ziegen, die Erle. Die eigenen Themen der Dorfbewohner zählen auch (Gerhard „Die alte Schule“,
  Manfred „Die Feuerwehr“, Uwe „Die Talsperre“ …). Sie sagen den Satz in ihren Worten (Hubert und Ronald mit ihrer Stimme), dann ist er im Buch.
- **„Warum?“** an Regeln: `WISSEN.why(id)` → ein Satz mit Quelle (32. BImSchV, BNatSchG, ThürNRG, WHG, BauGB, DGUV …); dieselben IDs wie die
  Regeln des Strategie-Modus (`STDATA.RULES`), unbekannte IDs fallen auf dessen Text zurück. Ein Gedanke der Spielfigur, der eine Regel nennt
  (z. B. „Sonn- und Feiertagsruhe“ beim Mäher), bekommt ein kleines **„?“** daneben; angetippt erscheinen Grund und Quelle, die Regel gilt als
  verstanden (Kapitel „Regeln“).
- **Orte der Geschichte – Infotafeln** (`viz3/src/wissen/wissen_orte.js`): kleine Tafeln mit Dach auf zwei Pfosten an der alten Schule, unter der
  Dorflinde, am Platz am Bach, an der Forstkiste der Unteren Klinge und auf dem Damm der Talsperre Ratscher (Lage nach Structurae,
  50° 29′ 31,5″ N, 10° 46′ 54,7″ E → UTM → Grundstück über `GEOMAN.xf`); „Tafel lesen“ öffnet das Buch beim Eintrag. Ein Mesh im Material der
  Dorf-Requisiten (`VPROPS.mat.paint`) – kein neues Shader-Programm, kein Licht.
- **Hinweis**: „Neu im Entdeckerbuch: …“ oben in der Mitte mit „Lesen“ (im Strategie-Modus als dessen Meldung, `STRAT.note`).
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
```

- Kapitel: `natur`, `handwerk`, `geschichte`, `politik`, `orte`. Das „wie gefunden“ (`how`) beginnt mit `ort:`, `gespraech:`, `tafel:`, `tun:`,
  `gesehen:` oder `erkundet:` – das Buch macht daraus einen Satz.
- Ereignisse: `wissen:neu` `{ id, ch, how }`, `wissen:warum` `{ id }`, `wissen:offen` `{ on }`, `wissen:tafel` `{ id }`; zum Fragen in Gesprächen
  `dorf:thema` `{ who, id, n }` (aus `dorf/dorf.js`, für jeden nutzbar).
- Lehrer für weitere Leute: in `WDATA.TEACH` (Dorfbewohner aus `dorf/dorf_text.js` bekommen die Themen in ihr Gespräch; Hubert und Ronald über
  `NPCUI.extend({ topics(w), ask(w, k) })`).

## Testen

- Ohne Browser: `node --test viz3/test/unit/wissen.test.mjs` (jeder Eintrag mit Kapitel, Text, Fundweg und Quelle; jede Regel mit Satz und
  Quelle; Lehrer-Themen zeigen auf vorhandene Einträge; Tafeln; die Talsperre liegt im Quadrat; Fakten, die stimmen müssen).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9006 --serve wissen` (Abschnitte `buch,ereignis,ort,lehrer,warum,
  tafel,reload,zombie,strategie`); auf GitHub über `viz3/extra/wissen/tests.txt`, Bilder in `out/wissen/`.

## Offen

- Daten-Ansichten (Lärm, Verkehr, Sonne/Schatten, Naturwert, Stimmung) auf der Draufsicht – nächster Stand.
- Tafeln in Schleusingen und Veßra (dort finden die Orte selbst die Einträge), Kollision der Tafeln (man läuft durch die Pfosten).
- Die Hauptsatzung von Schleusingen war nicht online zu finden: dass Ratscher eine Ortsteilverfassung hat, ist eine Annahme (wie in „Wahl und Amt“).
- Das Gründungsjahr der Dorflinde (1888) stammt aus dem Dorfleben des Spiels; eine unabhängige Quelle fehlt noch.

## Für den Lead

- Gemeinsame Dateien (markiert `feat/wissen`):
  - `viz3/src/dorf/dorf.js` – eine Zeile in `ask()`: `KERN.emit('dorf:thema', { who: k, id, n })`.
  - `viz3/src/npc/npc.js` – `NPCUI.extend` kennt `topics(w)` und `ask(w, k)` (Themen von Erweiterungen in `renderTopics`, Antwort in `ask`).
  - `viz3/src/modules.txt` – Block `# feat/wissen` nach dem Wetter-Block, vor `game/tutorial.js` (vier Module).
- Neuer Speicher-Schlüssel `pav-wissen-v1` (im Modul über `SAVE.key` angemeldet, Prüfung `v === 1` und `f` ein Objekt) – bitte in
  `docs/ARCHITECTURE.md` §8 eintragen. Neue `window`-Namen: `WISSEN`, `WLEHRER`, `WORTE`.
- Quellen: als Text und Links in den Einträgen; eine Sammelzeile über `credits_add` in `viz3/extra/wissen/manifest.json`.
- Taste **N** (beim Fahren nicht: dort ist N die Seilwinde des Traktors).
