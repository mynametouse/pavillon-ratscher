# Ratscher von oben – der Aufbau- und Strategie-Modus (feat/strategie)

Falkos Wunsch (5.11.2026, 23:11–23:30, Konzept `docs/plans/plan_strategie.md`): dieselbe Welt von oben, gesteuert wie Die Siedler 3,
Age of Empires und Warcraft 3, mit einem Hauch Black & White – realistisch in Logik, Zahlen und Abläufen; man soll dabei wirklich etwas lernen.
Gebaut in der Nacht 5./6.11.2026 vom Hilfs-Agenten `strategie` (Auftrag `docs/plans/auftraege/strategie.md`).

## Was es gibt (Stand: 6.11.2026, Nacht)

- **Die Szene** „Ratscher von oben“ (Menü → Erleben → Szenen, `?szenario=strategie`): die Draufsicht (`world/siteplan.js`) wird zum Spielfeld,
  oben links die Leiste der Vorräte (Euro, Stämme in fm, Bretter in m³, Brennholz in rm, Strom der Powerstation in %, Benzin und Diesel in l –
  alles aus der Welt gelesen: dieselben Stämme, Bretter und Liter wie zu Fuß), links die fünf Leute mit Stufe, Zustand und Bedürfnissen
  (Kraft, Essen, Stimmung), rechts die Zeit (Pause, 1×, 5×, 30×, Zeitraffer bis zum Auftrag, zum Wochenende, bis morgen), Kasse, Ebenen und
  „Zur Welt“. Für die langen Wartezeiten des Holzes: im Kalender ⏩ 1 Woche, 4 Wochen, 3 Monate; im Holzlager „bis lufttrocken (≈ n Tage)“
  nach der Vorhersage des Trocknungsmodells; in der Werkstatt „1 Woche nachtrocknen“ – alles läuft im Zeitraffer weiter. Taste **U**
  wechselt zwischen oben und der Welt, die Leertaste hält die Zeit an.
- **Leute:** Falko, Sarah, Christoph (deine Leute, die Spielfiguren) und Hubert, Ronald (die Nachbarn mit eigenem Willen und eigenen Tagen).
  Jede Person hat Können (Holz, Maschinen, Garten, Bauen, Reden), Lehrgänge, Schutzausrüstung, Erfahrung und Stufen, Fähigkeiten mit
  Abklingzeit (Falko „Meisterstück“, „Wochenplan“; Sarah „Dorfversammlung“, „Gut verhandelt“; Christoph „Notreparatur“) und ständige Wirkungen.
- **Wer ist wann da** (Falkos Wahl): deine Leute vom Vorabend freier Tage (19:30) bis zum Nachmittag des letzten (16:00) – Wochenenden,
  Thüringer Feiertage (Ostern berechnet, Weltkindertag, Reformationstag …), Urlaub (`STRAT.S.plan.urlaub`). Hubert und Ronald helfen werktags
  und samstags von 7:30 bis 18 Uhr gegen einen Gefallen (♥ in der Liste); sonntags ruhen sie, nachts sind sie daheim.
- **Steuern:** Maus – Klick wählt, Rahmen wählt mehrere, Rechtsklick schickt hin (Boden) oder gibt einen Auftrag (Ort), Rechts ziehen oder
  Pfeiltasten verschieben, Mausrad zoomt; Doppelklick auf eine Person: selbst übernehmen. Touch – antippen wählt, mit Auswahl auf den Boden oder
  einen Ort tippen schickt, ziehen verschiebt, zwei Finger zoomen, „Rahmen“ für eine Rahmenauswahl.
- **Orte** mit Feld (Vorrat, Aufträge, wer dort ist, was fehlt): Werkstatt, Holzlager, Alte Garage, Garten, die Klinge, Huberts Hof, Ronalds Hof,
  Bungalow.
- **Aufträge über die echten Abläufe:** der erste ist „Rasen mähen“ (Benzinmäher aus der Garage, ~1 l/h, 300–500 m²/h je nach Können; der
  Rasen wird in der Welt wirklich kurz – `garden/grass.js`; laut: nicht sonntags, werktags nur 7–20 Uhr). Ein Auftrag läuft unsichtbar weiter,
  wenn niemand hinsieht (auch beim Gehen in der Ich-Sicht), und wartet mit Grund (Regel, Feierabend, Wetter, Benzin).
- **Die Holzkette** (`strategie/st_holz.js`): Waldbegang (erst wer hinsieht, weiß, was markiert ist – Erkunden statt Nebel) → markierten
  Baum fällen und aufarbeiten (Lehrgang, zu zweit, beide mit Forst-Schutzausrüstung, Tageslicht, kein Sturm; `FELL.simFell`: derselbe
  Datensatz, derselbe liegende Stamm, dieselben vermessenen Abschnitte wie von Hand – der Baum fehlt danach auch in der Ich-Sicht) → rücken mit
  Traktor und Seilwinde, Rungenanhänger (5 t), über den Feldweg ins Holzlager (von oben fährt das Gespann mit der Ladung den Weg entlang) →
  Blockbandsäge (Benzinmotor, 1,4 l/h; Bretter 30 mm oder Bohlen 52 mm, `HOLZSAW.simSaw`) → Trockenstapel
  (`HOLZDRY.simStack`, das Feuchtemodell nach dem Klima von Meiningen) → Werkstatt. **Entschieden:** die Klinge gibt Fichte, Lärche, Kiefer –
  Bauholz für den Pavillon, Bretter, Brennholz; Klingenholz-Bretter sind Hartholz: Leimholz Eiche wird gekauft (eine Platte = zwei Bretter,
  wie im Werkstatt-Spiel), bis ein Laubbaum da ist – aus eigener Lärche (dem härtesten heimischen Nadelholz) gibt es eine kleine eigene Reihe.
- **Die Bestellung** „5 Schneidebretter Eiche“ (mindestens 3 Sterne, 21 Tage): Leimholz bestellen (Lieferung 9 Uhr), Bretter bauen
  (`WERK.simBoard`: das Brett liegt im Regal der Werkstatt mit den Sternen dessen, der es gebaut hat; Falkos „Meisterstück“ +1 Stern; müde →
  schlechtere Fugen), ausliefern (`WERK.handOut`, Euro, Stil +2 bei Pünktlichkeit). Ein in der Ich-Sicht selbst gebautes Brett zählt mit seinen Sternen.
- **Eigenes Holz in der Werkstatt:** lufttrocken (im Mittel ≤ 21 %, sonst Absage mit Grund: Risse durch das Feuchtegefälle) werden die
  Bohlen auf 1 m abgelängt und nachgetrocknet – heute, ohne die Halle, unter dem Pultdach (im Sommer 11–12 %, im Winter nicht unter 18 %),
  mit der Halle im Trockenschrank (9 %); bei höchstens 12 % (Schrank 10,5 %) werden sie zu Leimholz verleimt (`HOLZDRY.simKiln`,
  `HOLZDRY.simShop` → `WERK.addOwn`: Platten Lärche oder Fichte aus der Klinge im Werkstattregal, Bohlen ab 35 mm). Die erste Platte
  Lärche bringt die zweite Bestellung „3 Schneidebretter Lärche aus der Klinge“ (ein Hofladen in Schleusingen, 119 € das Stück –
  Annahme); Bretter daraus baut der Auftrag „Schneidebrett Lärche“ (Fichte lehnt er mit Grund ab: zu weich, Rohdichte ~450 kg/m³).
- **Brennholz:** die Schwarten der Bandsäge (je ~0,04 rm) am Sägebock auf 33 cm sägen, spalten, aufsetzen (0,45–0,85 rm/h je Person nach
  Können, Motorsäge mit Sonderkraftstoff gebucht); trocken nach einem Jahr unter Dach (1. BImSchV: unter 25 % Feuchte). Verkauf an Ronald
  nebenan mit der Schubkarre: trocken 110 €/rm (TFZ Bayern), frisch 80 €/rm (Annahme) – Warten lohnt sich.
- **Schutzausrüstung:** jede Person hat ihre eigene (Werkstatt: Gehörschutz, Brille, FFP2; Hubert auch Forst); in der Forstkiste am Traktor
  liegt eine Forst-Ausrüstung (wie in der Welt). Fällen braucht zwei (Säge und Helfer im Gefahrenbereich), eine zweite kauft man im
  Fachhandel (390 €, Auftrag in Schleusingen).
- **Ereignisse** (`strategie/st_ereignis.js`): Sturm mit Windwurf (erst beim Waldbegang bekannt; Forstunternehmer beauftragen, 32 €/fm),
  Borkenkäfer in den Fichten (sechs Wochen Zeit, sonst fliegen sie aus und befallen mehr – Stil −6), Maschinenschaden (Sägeband, Zündkerze,
  Seil – reparieren oder Christophs „Notreparatur“), Großbestellung mit knappem Termin, Unfälle bei müder Arbeit (Ausfalltage, kein Blut;
  Erste-Hilfe-Kurs halbiert sie), Gefallen bei Hubert und Ronald zurückgeben.
- **Essen und Betten** (wie „Supply“): Bungalow (2), Wohnwagen (1), Atelier-Klappsofa (1); Mahlzeiten aus dem Vorrat (drei am Tag je Person;
  wer zum Wochenende kommt, bringt bei leerem Vorrat sechs Mahlzeiten von zu Hause mit – für Urlaubswochen heißt es einkaufen in
  Schleusingen: Lebensmittel, Benzin, Diesel, gebucht). **Wissen und Ausbau:** Lehrgänge, PV-Module, zweite Powerstation, die Halle; **Zeitalter** nach der Bauphase;
  **Kapitel** mit Zielen, die sich selbst abhaken.
- **Figuren:** deine Leute als Rocketbox-Figuren aus der Nähe (von oben eingezoomt und in der Ich-Sicht bis 60 m), nicht am Telefon.
- **Regeln mit „Warum?“:** jede Absage nennt die Regel, ihren Grund und die Quelle (`STDATA.RULES`): Sonn- und Feiertagsruhe (Thüringer
  Feiertagsgesetz, 32. BImSchV), Ruhezeit 20–7 Uhr (32. BImSchV § 7), Tageslicht im Wald, Lehrgang und Alleinarbeitsverbot (DGUV Regel 114-018),
  Forst-Schutzausrüstung für jeden an der Säge und im Gefahrenbereich (DGUV I 214-046), Gehörschutz und Eichenstaub (TRGS 553), Sturm,
  nasses Gras, Saftruhe.
- **Strom:** zwei PV-Module (0,86 kWp, Ertrag nach Monat und Bewölkung, PVGIS Südthüringen) laden die Powerstation (2 kWh); reicht sie nicht,
  springt das Benzin-Aggregat der Garage an (2,8 kW, 1,1 l/h aus demselben Tank wie zu Fuß).
- **Euro mit echten Preisen** (`STDATA.PRICES`, jede mit Quelle oder ausgewiesener Annahme; Benzin und Diesel: ADAC Oktober 2026), Startkapital
  2.500 €, Kasse mit Buchungen.
- **Dein Stil** (Black & White): ein Wert von −100 (rücksichtslos) bis +100 (vorbildlich), unten links angezeigt.
- **Wetter:** nahe der Spieluhr das, was feat/wetter zeigt (`window.WETTER.state().w`: draußen live, eine Stunde des Spieltags oder ein
  ausprobiertes – Bewölkung, Regen mm/h, Wind und Böen m/s → km/h, Sturm ab Böen über 17,2 m/s = Bft 8 oder Mittelwind über
  13,9 m/s = Bft 7); für fernere Zeiten im Zeitraffer und beim Wetter nach Kalender aus dem Klima von Meiningen Tag für Tag gewürfelt.
- **Tiere** (feat/tiere): laute Arbeiten (Mähen, Motorsäge, Traktor, Bandsäge) machen Lärm, solange sie laufen (`TIERE.addNoise(x, y, r, s)`,
  Wald 250 m, sonst 150 m, zweimal je Sekunde erneuert) – Rehe und Sauen ziehen weg; `tiere:entdeckt` erscheint als Meldung von oben.
  Vor dem Fällen und Rücken fragt der Modus die Ruhezone des Schwarzstorchs (`TIERE.ruhe(x, y)`: am Horst nie, bis 300 m vom 1. März bis
  15. September nicht) – eine Absage mit Grund und Quelle. Läuft das Käfermodell der Tiere (`TIERE.kaefer.list()`), würfelt der Modus
  keinen eigenen Käfer: der Waldbegang meldet ihre Käferfichten, die Ebenen „Natur“ und „Krisen“ zeigen sie, der Forstunternehmer holt
  die mit Bohrmehl heraus (gefällt über `FELL.simFell` → `KERN 'fell'` – dann ist der Baum für die Tiere aus dem Wald).
- **Speichern:** ein Schlüssel `pav-strat-v1` (über `SAVE`, mit Prüfung); ein Neuladen mitten im Auftrag geht weiter, auch von oben.

## Testen

- Ohne Browser: `node --test viz3/test/unit/strategie.test.mjs` (Feiertage, wer wann da ist, Ruhezeiten mit Quellen, PV, Speicher, Stufen,
  Bedürfnisse, Wege, Preise mit Quellen).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9002 --serve strategie` (Abschnitte
  `start,leute,auftrag,regel,holz,strom,ereignis,reload,welt` – `holz` ist die ganze Kette bis zur Lieferung) und `strategie_telefon`
  (iPhone-Größe mit Touch: HUD ohne Überdeckung, antippen, ziehen) und `strategie_oben` (die Klinge von oben: was über dem Boden steht,
  keine fernen Baumkarten über den Wiesen, in der Welt wieder da); auf GitHub über `viz3/extra/strategie/tests.txt`, Bilder in `out/strategie/`.

## API für Erweiterungen

Stabil ab dem ersten Zuwachs (6.11.2026). Alles über `STRAT` (`viz3/src/strategie/st_modus.js`, `import { STRAT } from '../strategie/st_modus.js'`,
für Tests auch `window.STRAT`); Daten in `STDATA` (`st_data.js`), reine Logik in `STCORE` (`st_core.js`), die Brücken in die Welt in `STWELT`
(`st_welt.js`, `STRAT.W`). Neue Module eines Themas kommen in `viz3/src/modules.txt` in einen eigenen Block **unter** `strategie/st_hud.js`
(z. B. `# feat/dorfprojekte`) und importieren `STRAT`; Ereignisse kommen als `KERN.emit('strategie:<name>', daten)`.

**Grundsatz:** der Modus ist eine Linse auf die eine Welt. Ein Auftrag ändert denselben Zustand wie die Ich-Sicht (über `STRAT.W` bzw. die
Module der Welt), nie eine Kopie. „Was wäre wenn“-Zukünfte sind später eigene Kopien, nicht dieser Modus.

### Orte
```js
STRAT.place.define({
  id: 'kirche', name: 'Dorfkirche', icon: '⛪', order: 60, r: 8,  // r: Umkreis (m), in dem jemand „dort“ ist
  pos: () => [x, y],                         // Lage in Grundstücks-Metern (sonst STWELT.placePos(id) bzw. STDATA.PLACES)
  sub: () => 'Text unter dem Titel',          // optional
  stock: () => [['Bretter', '1,2 m³'], …],    // Vorrat im Feld
  info: () => '<h4>…</h4>…',                  // eigenes HTML im Feld (optional)
  missing: () => ['Es fehlt: …'],             // Engpässe
  badge: () => '3 Aufträge',                  // kurzer Text an der Karte (Ebene „Wirtschaft“)
  beds: 2,                                    // Betten für die Nacht (Grenze wie „Supply“: STRAT.beds())
});
```

### Vorräte der Leiste
```js
STRAT.res.define({ id: 'obst', label: 'Obst', icon: '🍎', unit: 'kg', order: 70, get: () => kg, fmt: v => …, tip: 'Text' | () => 'Text' });
STRAT.res.val('obst');  // der Wert jetzt
```
Vorräte werden aus der Welt **gelesen** (`get`), nicht doppelt gehalten. Was es in der Welt noch nicht gibt, hält das Thema selbst
(eigener SAVE-Schlüssel oder `STRAT.S.ext[thema]`).

### Aufträge (Jobs)
```js
STRAT.job.define({
  id: 'zaun', label: 'Zaun reparieren', place: 'garten', order: 20,
  people: [1, 2],                 // wie viele
  skill: 'bauen', min: 2,         // Können (holz | maschinen | garten | bauen | reden), Mindeststufe 1–5
  cert: 'motorsaege', certOne: true, // Lehrgang: alle – oder einer im Team (certOne)
  psa: 2,                         // so viele im Team brauchen eine Forst-Schutzausrüstung (eigene oder die eine aus der Forstkiste)
  loud: true, where: 'dorf',      // laut → Ruhezeiten; 'wald' → Tageslicht; saw: true → Sonntagsruhe auch im Wald
  heavy: 0.5, xp: 1,              // wie sehr es ermüdet (0–1), Erfahrung je Minute
  watt: 2000,                     // Strom der Maschinen, solange gearbeitet wird (PV → Powerstation → Aggregat)
  favour: 1,                      // Gefallen, den ein Nachbar dafür kostet
  text: 'Kurzbeschreibung', learn: 'Was man dabei lernt (echt, mit Zahlen)',
  dur: (j, cx) => 90,             // Arbeitsminuten bei Tempo 1 (oder eine Zahl)
  can: cx => null | 'regel_id' | { no: true, text, why, src },  // Bedingungen: Wetter, Material, Jahreszeit …
  init: (j, cx) => {}, start: (j, cx) => {}, step: (j, cx, minuten, anteil) => {}, finish: (j, cx) => ({ text }), stop: (j, cx) => {},
  speed: (j, cx) => 1, spot: (j, personId) => [x, y], show: () => true,
  pose: 'saw',                    // Arbeitshaltung der Figuren (npc/npc_real.js POSE: saw, chop, carry, place, bench, pick, bonnet)
  move: true, ride: (j, id) => bool, // die Leute sind beim Arbeiten dort, wo spot(j, id) sie gerade hat (z. B. auf dem Feldweg);
                                  // ride: sie sitzen auf einem Fahrzeug (Figur nicht zu sehen, auf der Karte das Gespann der Ebene „Wege“)
  bau: true,                      // ein Bauauftrag (Christophs ständige Wirkung: 15 % schneller)
  hours: [8 * 60, 19 * 60], anytime: false, // Arbeitszeit deiner Leute (Standard 8–19 Uhr); die Nachbarn haben ihre eigene
});
STRAT.job.check('zaun', ['falko'])        // null oder eine Absage { rule, text, why, src }
STRAT.job.add('zaun', ['falko', 'sarah']) // der Auftrag { id, def, place, who, st: 'go'|'work'|'wait'|'done'|'stop', why, need, done, dur, d }
STRAT.job.cancel(id); STRAT.job.running(); STRAT.job.of(id); STRAT.job.at(placeId)
```
`cx` (Kontext): `{ t, m, day, date, sun, wx, job, who, S, STRAT, W, eff, skill }` – `day` aus `STCORE.day` (Wochentag, Feiertag, frei),
`sun` = `{ up, down }` in Minuten, `wx` = `{ cloud, rain, wind, storm, src }`, `eff` = Tempo des Teams aus den Bedürfnissen und Stufen,
`skill` = das beste Können im Team. `step` bekommt die Arbeitsminuten dieses Schritts (Spielzeit × Tempo) und den Anteil 0–1 – dort
verändert der Auftrag die Welt Stück für Stück (so sieht man es, wenn man hinsieht, und es stimmt auch im Zeitraffer).

### Regeln, Absagen, Lernen
- `STDATA.RULES[id] = { text, why, src }` – jede Regel sagt in einem deutschen Satz, warum, mit Quelle. `STRAT.refuse(id, wer)` baut die Absage;
  `can` darf eine Regel-ID oder eine eigene Absage zurückgeben. Das Feld zeigt sie mit „Warum?“.
- `STCORE.rule(datum, minute, { loud, where, saw, sun })` → Regel-ID oder `null` (Ruhezeiten, Tageslicht).
- `STRAT.note(text, { kind, why, src, acts })` – eine Meldung von oben; mit `why`/`src` bekommt sie „Warum?“, mit
  `acts: [{ label, fn }]` Knöpfe (gibt `fn` einen Text zurück, ersetzt er die Meldung – so antwortet der Hund auf „Loben“/„Tadeln“).

### Leute, Helden, Bedürfnisse
- `STRAT.person.define({ id, name, short, col, own, fig, npc, role, skills, certs, gear, presence: t => ({ ok, why }) })` – weitere Leute.
- `STRAT.S.people[id]` = `{ xp, nd: { energy, food, mood }, certs, cd, buff, job, path, pos }`; `STRAT.level(id)`, `STRAT.skillOf(id, skill)`,
  `STRAT.present(id, t)`, `STRAT.pos(id, t)`, `STRAT.send(id, [x, y], { place })`, `STRAT.takeOver(id)` (Ich-Sicht).
- Fähigkeiten: Daten in `STDATA.HEROES[person].abilities` (`{ id, label, cd: Tage, text }`), Wirkung über
  `STRAT.ability.define({ id, lasts: Tage, run: ({ who, S, STRAT, t }) => ({ ok, text } | { no, text }) })`; `STRAT.ability.buff(person, id)`
  sagt, ob sie gerade wirkt (z. B. „Meisterstück“ beim nächsten Brett).
- Bedürfnisse (The Sims): `STCORE.needs`, `STCORE.eff` – Kraft und Essen bestimmen das Tempo, die Stimmung das Wohlwollen. Essen kommt aus dem
  Vorrat `STRAT.res` `essen` (mit `take(n)`), wenn ein Thema ihn anlegt; Betten über die Orte (`beds`).
- Gefallen der Nachbarn: `STRAT.favour(id, ±n, wofür)`, Stand in `STRAT.S.favours`.
- Schutzausrüstung: `STRAT.gearOf(id)` → z. B. `['werkstatt', 'forst']` (gespeichert in `STRAT.S.people[id].gear`; ein Thema darf etwas
  hinzufügen, wenn ein Auftrag es kauft).
- Freier Wille (The Sims): `STRAT.will((personId, cx) => ({ def, who, place }) | null)` – einmal je Spielstunde für jede freie Person vor Ort gefragt;
  der erste Vorschlag, der geht, wird ein Auftrag.

### Geld, Stil, Wissen
- `STRAT.book(eur, text, kategorie)` – Buchung (negativ = Ausgabe), Stand `STRAT.S.eur`, Liste `STRAT.S.ledger`; Preise in `STDATA.PRICES`.
- `STRAT.style(delta, warum)` – Black & White: wie du arbeitest (Ruhezeiten, faire Preise, schonend fällen, helfen); `STRAT.S.style` (−100 … 100);
  `STRAT.styleFx()` → `{ freundlich, natur, ruf }` (je 0–1, 0,5 neutral) für die Module, die es in der Welt zeigen (mehr Vögel, freundlichere
  Leute, ein grüneres Dorf).
- `STRAT.reveal(art, id, daten, wer, { title, source, text })` – Erkunden statt Nebel: was man über einen Ort weiß, weiß man, weil jemand
  hingegangen ist; beim ersten Mal `KERN.emit('strategie:entdeckt', { kind, id, title, source, text, by })` (Haken für das Entdeckungsbuch).
  `STRAT.known(art, id)` → `{ t, by, data }` oder `null`.
- Wissen und Ausbau (Lehrgänge, Maschinen, Stufen): `STDATA.KNOW`; Zeitalter (Bauphasen): `STDATA.AGES` mit `PHASE` aus `game/walkable.js`.

### Ereignisse, Bestellungen, Kapitel, Ebenen
- `STRAT.event.define({ id, label, chance: cx => p, run: cx => ({ text } | false), why, src })` – einmal je Spieltag gewürfelt (gleicher Tag,
  gleicher Wurf); `STRAT.fire(id)` löst es aus. Tiere (feat/tiere) melden ihre Schäden so oder über eigene KERN-Ereignisse.
- `STRAT.order.add({ title, n, minStars, days | due, price, wood, kind, … })` → `STRAT.S.orders` (`st: 'offen' | 'geliefert' | 'verspätet'`);
  Schneidebretter (ohne `kind` oder `kind: 'brett'`, Holzart `wood`, ohne: Eiche) liefert der Auftrag `liefern`, Bestellungen anderer Art
  (`kind: 'brennholz'`, `'gemuese'` …) ein eigener Auftrag des Themas, der `o.got`/`o.st = 'geliefert'` setzt und
  `strategie:bestellung` {id, state: 'geliefert'} meldet.
- `STRAT.chapter.define({ id, title, text, order })`, `STRAT.chapter.set(id)`, `STRAT.chapter.cur()`;
  Ziele: `STRAT.chapter.goal('k3', { id, text, on: 'auftrag', when: d => d.state === 'fertig' && d.def === 'zaun' })` (ein Ereignis des Modus) oder
  `{ id, text, check: () => bool }` (zweimal je Sekunde gefragt) – sind alle Ziele des aktuellen Kapitels erreicht, kommt das nächste.
- `STRAT.layer.define({ id, label, text, order, on, under, draw: (pr, W, H) => '<svg-Text>' })` – eine Ebene der Karte, im HUD schaltbar
  (`under: true` zeichnet unter Orten und Leuten, z. B. der Schleier des Wetters; ein zweites
  `define` mit derselben id ergänzt sie); `pr(x, y, dz)` → `[px, py, tiefe]`, dz Meter über dem Boden dort (auch oben in der Klinge).
  Vorhanden: leute (mit dem Hund), orte, wege (mit dem Gespann beim Rücken), beduerfnisse, wirtschaft, natur (was man vom Wald weiß), krisen,
  verkehr (Autos von `verkehr/*`, Busse mit Linie über `window.BUS.state().inst` von feat/bus), wetter (Wolkenschleier, Regen, Windpfeil –
  `STRAT.W.wx(t)` mit `dir`, live über feat/wetter).

### Zeit und Ereignisse von STRAT
- `STRAT.setSpeed(0 | 1 | 5 | 30)` (Spielminuten je Sekunde; 1× = die normale Spieluhr), `STRAT.skip(minuten | 'kommen' | 'morgen' | 'auftrag')`
  (Zeitraffer über `CLOCK.wait`), `STRAT.setDate('2026-11-07', minute)` (Tests, ohne den Sprung zu simulieren). Die Uhr läuft von oben über
  `CLOCK.drive` (time/clock.js). Die Simulation läuft, wann immer die Spieluhr läuft – auch beim Gehen.
- KERN-Ereignisse: `strategie:modus` {on}, `strategie:auftrag` {id, def, who, state: neu | begonnen | wartet | fertig | abgebrochen, out, why},
  `strategie:unterwegs`, `strategie:angekommen`, `strategie:da`, `strategie:buchung`, `strategie:stil`, `strategie:entdeckt`, `strategie:ereignis`,
  `strategie:bestellung`, `strategie:faehigkeit`, `strategie:stufe`, `strategie:gefallen`, `strategie:tag`, `strategie:kapitel`.
- Gespeichert: `pav-strat-v1`; ein Thema hält Kleines in `STRAT.S.ext[thema]` (wird mitgespeichert) oder in einem eigenen SAVE-Schlüssel.
- Ereignisse der Aufträge tragen die Spielzeit `t` (im Zeitraffer laufen viele Schritte in einem Bild).
- Shader: was ein Thema in der Welt neu baut, vorher einmal übersetzen (Beispiel `STWELT.warm()` beim Start des Modus: Stämme, Bretter, ein
  gefällter Baum – `FELL.warmMats()`, die Stapelleisten); der Test prüft die Programme der eigenen Dinge (Stämme, Werkstatt und Lager mit
  Brettern, Stapel und Regal, der gefällte Baum) vor und nach der ganzen Holzkette bei denselben Ansichten – Figuren zählen nicht mit (ihre
  Programme wärmt `npc/npc_real.js` selbst vor).

### Änderungen der API seit dem ersten Zuwachs (für strategie-dorf, strategie-bau)
Nur Ergänzungen, nichts umbenannt oder entfernt:
- 6.11. 1:20 – `STRAT.note(text, { acts: [{ label, fn }] })` (Knöpfe an einer Meldung); `layer.define` mit vorhandener id ergänzt deren
  `draw` (so zeichnen der Hund in „Leute“ und das Gespann in „Wege“).
- 6.11. 1:50 – Auftragsfelder `psa`, `move`, `ride`; `STRAT.gearOf(id)`, `STRAT.S.people[id].gear` (gespeichert); Aufträge `psa_kaufen`,
  `brennholz`, `brennholz_verkaufen`; Vorrat `brennholz` zählt aufgesetztes Holz und noch nicht aufgearbeitete Schwarten
  (`STRAT.S.ext.brennholz = { used, lots: [{ rm, t0 }] }`).
- 6.11. 2:00 – Aufträge `nachtrocknen`, `leimholz_eigen`, `brett_eigen`; Bestellungen können `wood: 'larch'` tragen (geliefert werden
  Bretter dieser Holzart; ohne `wood` Eiche), `STHOLZ.shelf(minSterne, holzart)`, `STHOLZ.ownPanels()`; `WERK.simBoard({ sp })`; für Bauholz (strategie-bau): die Bretter mit Feuchte stehen in
  `HOLZSAW.boards` (`{ id, sp, t, L, wS, wW, mc, st: 'pile' | 'stack' | 'kiln' | 'shop' | 'used', blue, crack, warp }`), der Stapel in
  `HOLZDRY.stackMC()` (`{ n, avg, min, max }`) – Konstruktionsholz braucht ≤ 20 % (DIN 4074) und eine Sortierung;
  `HOLZDRY.simTake(n, { maxMC: 20, minT })` nimmt n Bretter oben vom Stapel (wie beim Abstapeln, nur trockene) und gibt sie zurück
  (`[{ id, sp, t, L, w, mc, blue, crack, warp }]`) – sie sind dann in der Welt weg (`st: 'used'`).
- 6.11. 3:05 – mit feat/tiere in src: `TIERE.ruhe` vor Fällen und Rücken, `TIERE.kaefer.list()` statt des eigenen Käfers (Waldbegang,
  Ebenen, Forstunternehmer).
- 6.11. 2:20 – Brennholz für andere Themen (der Holzofen des Pavillons im Winter): `STHOLZ.firewood.stacked()`, `.dry(t)`,
  `.take(rm, { dryOnly })` → genommene rm, trockenes zuerst (1. BImSchV: nur trockenes Holz in den Ofen).
- 6.11. 2:15 – `layer.define({ under: true })`; `STRAT.W.wx(t).dir` (Windrichtung, aus der er kommt); Knöpfe mit `data-skip="<Minuten>"` in
  einem Feld (`info()` eines Ortes) laufen im Zeitraffer.

## Offen

- Der Traktor der Welt (`vehicles/tractor.js`) bleibt beim Rücken von oben an der Klinge stehen – das Gespann fährt nur auf der Karte, die
  Stämme liegen am Ende im Lager. Ein Brennholzstapel ist in der Welt noch nicht zu sehen (nur als Vorrat); geheizt wird noch nicht
  (Holzverbrauch im Winter, wenn jemand im Bungalow schläft).
- Das Telefon: Layout, Antippen, Ziehen im Test (iPhone-Größe), noch nicht auf einem echten Gerät; die Zeitbox ist dort groß (drei Reihen).
- Der Hund (feat/tiere): von oben als Zeichen auf der Karte, seine Taten als Meldung mit „Loben“/„Tadeln“ – mehr (schicken, hüten als
  Auftrag) kann darauf aufbauen. Die Bestellung Lärche wird im Test begonnen (ein Brett), nicht ganz geliefert.

## Für den Lead

- Gemeinsame Dateien (jede Stelle markiert mit `feat/strategie`):
  - `viz3/src/time/clock.js` – `CLOCK.drive(fn)`: eine andere Ansicht lässt die Uhr laufen (in `running`/`rate`, ein Eintrag im Rückgabeobjekt).
  - `viz3/src/game/camera.js` – die Draufsicht steht über dem Boden unter ihrer Mitte (`KERN.ground`), nicht über der Höhe des Gartens; im
    Garten (modellierte Fläche auf 0) unverändert, an der Klinge saß die Kamera beim Hineinzoomen sonst in den Kronen.
  - `viz3/src/world/fell.js` – `FELL.simFell(id, { q, who, any })`: ein markierter Baum (any: auch Sturm-/Käferholz) gefällt und aufgearbeitet
    wie von Hand, mit Datensatz, liegendem Stamm, vermessenen Abschnitten.
  - `viz3/src/werk/holz_saw.js` – `HOLZSAW.simSaw(logId, dicke)`: ein Stamm ganz eingeschnitten (dieselben Bretter, Schwarten als Brennholz).
  - `viz3/src/werk/holz_dry.js` – `HOLZDRY` jetzt `export`iert; `HOLZDRY.simStack(o)` (alle Bretter der Blöcke in den Stapel, Dach),
    `HOLZDRY.simKiln()` (lufttrockene Bretter in den Trockenschrank bzw. heute unter das Pultdach, wie von Hand), `HOLZDRY.kilnMC()`,
    `HOLZDRY.kilnTarget()`, `HOLZDRY.simTake(n, o)` (trockene Bretter oben vom Stapel nehmen, für Bauholz), `HOLZDRY.simShop()`.
  - `viz3/src/werk/werk.js` – `WERK.simBoard({ stars, who, notes, oak, sp })`, `WERK.handOut(ids)`, `WERK.orderPanels(n)`.
  - `viz3/src/world/forest.js` – von oben (Draufsicht, `P.mode === 'top'`) zeichnen die Fernkarten des Waldes nur ihre waagrechte
    Kronenebene; die zwei stehenden Ebenen sahen von oben wie dunkle Kreuze am Waldrand aus (dasselbe Material, eine zweite Geometrie je
    Zelle; in der Ich-Sicht unverändert).
  - `viz3/src/world/ratscher.js` – in `topMode` (Draufsicht an/aus) eine Zeile: die gekreuzten Karten der fernen Bäume (aus dem
    Kronenhöhenmodell, außerhalb des Waldes) sind in der Draufsicht aus, wie schon bei der Karte – sie waren die „dunklen Blätter“ über der
    Wiese an der Klinge; das Luftbild darunter zeigt diese Kronen ohnehin. In der Ich-Sicht unverändert (Test `strategie_oben` prüft beides).
    Das gilt auch für die gewöhnliche Draufsicht ohne den Modus (dieselbe Kamera).
  - `viz3/src/render/render.js` – der warmUp-Fix des Leads (91be8c98) als Cherry-Pick (1b246322), bis er über src kommt.
- `viz3/src/modules.txt`: Block `# feat/strategie` nach `# feat/bus`, vor `game/tutorial.js`.
- Das normale Spiel bleibt unberührt, bis jemand den Modus einmal startet (`STRAT.S.used`): vorher keine Simulation, keine Figuren, keine
  Meldungen; danach läuft die Simulation mit der Spieluhr auch beim Gehen (eine Linse auf dieselbe Welt), beginnend mit dem ersten Start.
- Neuer Speicher-Schlüssel `pav-strat-v1` (im Modul über `SAVE.key` angemeldet, Prüfung `v === 1`) – bitte in `docs/ARCHITECTURE.md` §8 eintragen.
- Neue `window`-Namen: `STRAT`, `STHUD`, `STHOLZ`, `STEREIG`, `STAUSBAU`, `STFIG` (alle mit `ST`-Vorsilbe, für Tests und Erweiterungen).
- Quellen (nur als Text in den Daten, keine fremden Dateien): ADAC Kraftstoffpreise, TFZ Bayern Scheitholzpreise, PVGIS (EU JRC), DGUV, SVLFG,
  KWF, 32. BImSchV, Thüringer Feiertagsgesetz, TRGS 553 – keine Zeile in `buildlib/credits.py` nötig.
