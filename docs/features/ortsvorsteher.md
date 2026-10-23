# Die Wahl des Ortsvorstehers und das Amt (feat/ortsvorsteher, 23.10.2026)

Wunsch von Falko (23.10.2026, 2:52 und 2:57): Jemand sagt, dass ein neuer Ortsvorsteher gesucht wird, und fragt, ob man sich zur Wahl
stellt. Wer antritt, muss Aufgaben erfüllen, um die Leute auf seine Seite zu bekommen. Als Ortsvorsteher hat man ein anderes Ansehen,
bestimmt im Rathaus Schleusingen mit und trägt die Anliegen aus Ratscher dorthin. Realistisch – man soll dabei lernen, wie kommunale
Selbstverwaltung funktioniert.

## Wie es wirklich ist (Thüringen)

- Ratscher ist seit 1994 ein **Ortsteil der Stadt Schleusingen** (rund 120 Einwohner). Eine Stadt kann in ihrer Hauptsatzung für Ortsteile
  eine **Ortsteilverfassung** einführen (**§ 45 Thüringer Kommunalordnung**, ThürKO). Dann gibt es einen **Ortsteilbürgermeister** – im Dorf
  sagen viele „Ortsvorsteher“, das Spiel auch; das Tagebuch nennt einmal den offiziellen Namen – und einen **Ortsteilrat**.
- **Wahl**: nach den Regeln für ehrenamtliche Bürgermeister (§ 24 Thüringer Kommunalwahlgesetz): gewählt ist, wer **mehr als die Hälfte der
  gültigen Stimmen** hat, sonst Stichwahl zwei Wochen später. Wählen ab 16 (Deutsche, EU-Bürger, drei Monate gemeldet), gewählt werden ab 18.
  **Einzelbewerber** brauchen **Unterstützungsunterschriften**: fünfmal so viele Wahlberechtigte, wie der Ortsteilrat Mitglieder hat – unter
  500 Einwohnern hat er 4, also **20**. Die **Auszählung ist öffentlich**. Amtszeit wie der Stadtrat (fünf Jahre), nach einer Nachwahl der Rest.
- **Amt**: Ehrenbeamter der Stadt (Diensteid, Ernennungsurkunde, Aufwandsentschädigung). Vorsitz im Ortsteilrat. **Beratende** Teilnahme an
  allen Sitzungen des Stadtrats und seiner Ausschüsse, die den Ortsteil betreffen, mit **Antragsrecht** – aber ohne Stimme.
- **Ortsteilrat**: berät die Angelegenheiten des Ortsteils, macht Vorschläge; die Stadt muss sie **binnen drei Monaten** behandeln und
  Bescheid geben; er wird vor wichtigen Entscheidungen **angehört** (Haushalt, Bebauungspläne), Abweichungen muss die Stadt begründen.
  Er **entscheidet selbst** über Haushaltsmittel für Kultur, Sport, Soziales, **Brauchtum** (Kirmes) und die Unterstützung der **Ortsfeuerwehr** –
  ohne eigene Festsetzung **5 Euro je Einwohner** im Jahr, für Ratscher also rund 600 Euro. Bei Stimmengleichheit ist ein Antrag abgelehnt.
- **Wer entscheidet was**: Straßenlaternen, Feldwege, Bauhof – die Stadt. **Tempo 30** auf einer Durchgangsstraße – die
  Straßenverkehrsbehörde im **Landratsamt Hildburghausen**; die Stadt kann es nur beantragen. Schulbus – der Landkreis. Streit unter
  Nachbarn – keine Ratssache (miteinander reden, notfalls die Schiedsstelle).
- Quellen: ThürKO § 45 (Ortsteile, Ortsteilverfassung), ThürKWG § 24 (Wahl der Bürgermeister), Hinweise der Thüringer Wahlbehörden zur
  Kommunalwahl 2024 (Unterstützungsunterschriften: fünffache Zahl der Ortsteilratsmitglieder; Fristen 58./44. Tag vor der Wahl),
  Wikipedia „Ratscher (Schleusingen)“ (123 Einwohner 2013; die Schule von 1828, ab 1957 Kindergarten, dann Gemeindeverwaltung, heute
  Feuerwehrverein). Die Hauptsatzung der Stadt Schleusingen war nicht online zu finden – das Spiel nimmt an, dass sie für Ratscher eine
  Ortsteilverfassung eingeführt hat.

## Das Modell im Spiel

**Menschen** (`viz3/src/amt/amt_data.js`, `P`): Ingrid (die bisherige Ortsteilbürgermeisterin, hört auf), Gerhard, Manfred, Wolfgang, Katrin,
Heike, Jens (die Dorfbewohner aus `dorf/dorf_text.js`, soweit es sie im Stand gibt), Hubert und Ronald (die Nachbarn) und **Uwe Bachmann**,
der Landwirt, als **Gegenkandidat**. Jeder hat eine **Meinung von dir (0–100)**, einen Haushalt (Stimmen und Unterschriften) und einen
Freundeskreis, der ihm ein Stück weit folgt; dazu sechs Wähler ohne Kreis. Zusammen rund 100 Wahlberechtigte.

**Was Meinungen bewegt** (`amt/amt_model.js`):
- **Reden**: das erste Gespräch über die Wahl +2, danach +1 je Tag („sich Zeit nehmen“).
- **Da sein**: Skatabend in der alten Schule, Feuer am Acker: +2 für alle Dorfbewohner, einmal je Abend.
- **Versprechen**: Wer fragt (Laterne, Tempo 30, Kirmes, Feldweg), will eine Antwort. Jede Antwort freut die einen und ärgert die anderen;
  der **Kompromiss** ist oft der klügste Weg (die abgeschirmte, warmweiße Laterne mit Bewegungsmelder; „erst messen, dann beim Landratsamt
  beantragen“). **Wer seine Meinung ändert**, verliert bei allen, die das Erste gehört haben, Vertrauen (−5) – im Dorf spricht sich alles herum.
- **Aufgaben** im Wahlkampf (je eine Person): der **Hydrant** am Anger (Manfred: Hinweisschild „H 80 · 1,5 · 4,0“ lesen, den Deckel
  freiräumen), die **Chronik** (Gerhard: warum kandidierst du?), der **Schulbus** (Katrin: an einem Schultag 6:45–7:30 an der Haltestelle
  stehen), **Ziegen im Gemüse** (Heike und Ronald: Partei ergreifen – oder gemeinsam den Zaun flicken), **Briefwahl für Hubert** (er ist am
  Wahlsonntag bei seiner Schwester; Vollmacht, Unterlagen im Rathaus abholen), **Was kann das Amt?** (Ingrid fragt drei Dinge – wer sie weiß,
  bekommt ihre Empfehlung), **Vorstellen beim Skatabend** (eine kurze Rede).
- Was man vorher schon getan hat, zählt: die Freitags-Aufgabe der alten Schule, erledigte Besorgungen der Dorfbewohner, Huberts und Ronalds
  Aufgaben (`QUESTS.friendly`).

**Die Wahl**: Jeder Haushalt und Freundeskreis stimmt nach der Meinung von dir gegen Uwes Ansehen (`rival`), der Rest nach der allgemeinen
Stimmung; Wahlbeteiligung höher bei starken Gefühlen und bei denen, mit denen du geredet hast; etwa 1,5 % ungültig. Gezogen wird Stimmzettel
für Stimmzettel mit einem festen Startwert – derselbe Stand gibt dasselbe Ergebnis. Ohne Wahlkampf gewinnt Uwe (etwa ein Drittel der
Stimmen für dich); mit etwa +10 bei allen und vielen Gesprächen wird es knapp; mit +15 gewinnst du fast sicher. Das Tagebuch zeigt die
**Stimmung** (keine Umfragezahl).

**Ablauf**:
1. **Spieltag 2, morgens**: Brief von Ingrid (Knopf „Amt“ / Taste **O**) mit der **Bekanntmachung**: Nachwahl am Sonntag mindestens neun
   Tage später, 8–18 Uhr, Wahlraum alte Schule; Wahlvorschläge bis Mittwoch davor, 18 Uhr, im Rathaus.
2. Jeder, mit dem man redet, spricht einen darauf an (ein Knopf „Die Nachwahl …“ im Gesprächsfenster der Dorfbewohner und der Nachbarn; an
   der Haustür jedes Dorfbewohners „Bei … klingeln“, 8–21 Uhr – nicht wenn er gerade mit dem Auto weg ist oder Freitagabend in der Schule).
3. **Kandidieren** → 20 Unterschriften sammeln (wer dich ein bisschen kennt – Meinung ab 40 – unterschreibt mit seinem Haushalt, damit das Dorf eine Wahl hat; gute Freunde ab 60
   sammeln noch bei den Nachbarn) → **im Rathaus einreichen** (Auto „Mit dem Auto ins Rathaus“ oder Tagebuch „Ins Rathaus fahren“).
   Frist verpasst → Uwe ist einziger Bewerber.
4. **Wahlkampf**: reden, Fragen beantworten, Aufgaben, da sein.
5. **Wahltag** (Sonntag): an der Tür der alten Schule „Wählen gehen“ (Wahlbenachrichtigung, Ausweis, Kabine, Urne; man darf sich selbst
   wählen); ab 18 Uhr „**Bei der Auszählung zuschauen**“ (öffentlich, Stapel für Stapel). Gewonnen: „Nehmen Sie die Wahl an?“ – Ingrid gibt
   die Mappe und den Schlüssel fürs Gemeindebüro, Uwe gratuliert, Gerhard schreibt es in die Chronik. Wer nicht hingeht, erfährt das Ergebnis
   um 21 Uhr. **Verloren**: Uwe ist Ortsvorsteher; nach zwölf Tagen legt er das Amt nieder (zu wenig Zeit neben dem Hof) – neue Nachwahl,
   die Meinungen bleiben.
6. **Im Amt**: Die Leute grüßen anders („Tag, Herr Ortsvorsteher!“, verärgerte eher spitz). Sie bringen **Anliegen** („Hast du ein
   Anliegen?“): Laterne am Gartenweg (Katrin), Kirmes (Manfred), Mitfahrbank (Ingrid), Infotafel an der Schule (Gerhard), Tempo 30 (Katrin),
   Feldweg zur Klinge (Hubert), Ziegen und Zaun (Heike). **Ortsteilrat** (abends 17–22 Uhr an der Schultür „Sitzung eröffnen“): Manfred,
   Katrin, Gerhard, Uwe und du stimmen ab; Sachen des Ortsteils bezahlt er selbst (600 Euro im Jahr – Kirmes **oder** Mitfahrbank und Tafel,
   nicht alles), der Rest geht als Empfehlung an die Stadt. **Stadtrat** (donnerstags 17–21 Uhr im Rathaus): zuerst die **Vereidigung**
   (Diensteid), dann trägst du vor; der Stadtrat beschließt **ja, nein oder vertagt – immer mit Begründung** (Geld im Haushalt, Zuständigkeit,
   Kostenschätzung des Bauamts, Einigkeit des Ortsteilrats, dein Ansehen in der Stadt, der Kompromiss). Tempo 30: die Stadt beantragt beim
   Landratsamt und stellt erst eine **Geschwindigkeitsanzeige** auf.
7. **Was beschlossen ist, steht ein paar Tage später im Dorf** (`amt/amt_world.js`): die abgeschirmte Laterne am Weg zu den Gärten (nachts
   warmes Licht), die **Mitfahrbank** an der Bushaltestelle, die **Geschwindigkeitsanzeige** am Ortseingang, das **Kirmes-Plakat** und die
   **Infotafel** an der alten Schule – und die Meinungen ändern sich wieder (wer es wollte +, wer dagegen war −; gehaltene Versprechen +3,
   gebrochene −6).

## Was vereinfacht ist

- **Fristen** auf Tage verkürzt (wirklich: Bekanntmachung spätestens 58 Tage vor der Wahl, Wahlvorschläge bis zum 44. Tag, Zulassung durch
  den Wahlausschuss). Die Nachwahl kommt, weil Ingrid aus familiären Gründen ihre Entlassung als Ehrenbeamtin verlangt.
- **Stichwahl**: bei Gleichstand entscheidet im Spiel gleich das Los.
- **Stadtrat** tagt im Spiel jeden Donnerstag (wirklich etwa monatlich, Tagesordnung eine Woche vorher); der Ortsteilrat, wann der
  Ortsvorsteher ihn einberuft (wirklich mit Ladungsfrist). Das „Geld der Stadt für Kleines“ (12 000 Euro im Jahr) ist eine Spielgröße.
- **Stimmen** nach Haushalten und Freundeskreisen, nicht für jeden Wahlberechtigten einzeln; Uwes Ansehen bleibt fest.
- Das Spiel nimmt an, dass du **mit Hauptwohnsitz in Ratscher** gemeldet bist (Voraussetzung für Wahlrecht und Wählbarkeit).
- Der Ortsteilrat hat feste Mitglieder (keine Ortsteilratswahl im Spiel).

## Das Rathaus – die Naht zu Schleusingen

Bis die begehbare Stadt (Branch `feat/schleusingen`) ein Rathaus mit Sitzungssaal hat, ist der Besuch eine **eigene Szene** im Fenster
(`AMT.rathaus()`): Fahrt 25 Spielminuten hin und zurück (`CLOCK.wait`), Wahlamt, Bauamt, Sitzungssaal. Einbinden später: das echte Rathaus
ruft an seinem Eingang bzw. im Sitzungssaal `AMT.rathaus()` (Bürgerbüro: Wahlamt, Bauamt) bzw. `AMT.council()` (Stadtratssitzung) auf;
`AMT.trip()` (Auto, Tagebuch) fährt dann statt der Zeitraffer-Fahrt dorthin. Mehr Stellen gibt es nicht.

## Dateien

| Was | Wo |
|---|---|
| Daten: Menschen, Themen, Aufgaben, Anliegen, Texte, „So geht’s“ | `viz3/src/amt/amt_data.js` (`AMTDATA`) |
| Modell: Meinungen, Versprechen, Unterschriften, Wahl, Ortsteilrat, Stadtrat (ohne DOM, in node getestet) | `viz3/src/amt/amt_model.js` (`AMTMODEL`) |
| Was im Dorf entsteht; Hydrant, Zaun | `viz3/src/amt/amt_world.js` (`AMTWORLD`) |
| Spiel: Brief, Gespräche, Aufgaben, Rathaus, Wahltag, Amt, Fenster `#amtpanel`, Mappe `#amtbook` (O), Knopf `#amtbtn` | `viz3/src/amt/amt.js` (`AMT`) |
| Aussehen | `viz3/shell/css/amt.css` |
| Gespeichert | `pav-amt-v1` (`core/save.js`; jedes Feld einzeln geprüft, `AMTMODEL.sanitize`) |

Außerhalb des eigenen Ordners: je eine Zeile in `core/save.js` (Schlüssel), `src/modules.txt` (vier Module am Ende des Dorf-Blocks),
`shell/parts.txt` (`css/amt.css`). In fremden Modulen wird nichts geändert: Der Knopf in den Gesprächsfenstern der Dorfbewohner
(`#dorfpanel .topics`) und der Nachbarn (`#np-topics`) wird zur Laufzeit eingefügt (MutationObserver), der Gruß im Amt über `DORF.UI.say`;
gelesen werden `DORF.S`/`DORF.ST`, `DPEOPLE.figs`, `DSCHOOL`, `DLIFE.homes/away` (wenn vorhanden), `QUESTS.friendly`, `NPCS`, `PAD`, `VEH.by.car`.

## Testen

```bash
node --test viz3/test/unit/amt.test.mjs                                                   # Modell, ohne Browser (Millisekunden)
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8978 --serve amt               # alles (~8 min), Bilder in out/amt/
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8978 --serve amt:ask,rathaus   # nur Abschnitte
```

Abschnitte: `start,ask,rathaus,wahltag,zaehlen,amt,welt,hydrant,gl`. Im Browser: `index.html?amt=brief|wahlkampf|wahltag|zaehlen|amt|stadtrat`
springt an die Stelle (`?noamt` schaltet den Brief ab). Konsole: `AMT.state()`, `AMT.jump('wahltag')`, `AMT.talk('gerhard')`,
`AMT.press('Unterschreibst')`, `AMT.count(true)`, `AMT.ortsrat()`, `AMT.council()`, `AMT.reset()`, `AMTWORLD.state()`.
