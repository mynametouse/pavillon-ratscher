# Grenzland – Kapitel 1: fünf Missionen (Hilfs-Agent `grenzland-mission`)

Branch `feat/grenzland-mission`, Auftrag `docs/plans/auftraege/grenzland-mission.md` (gemeinsam: `grenzland-gemeinsam.md`), Plan
`docs/plans/plan_grenzland.md`. Stand: Nacht 13.11.2026.

## Was es gibt

- **Der Läufer** (`viz3/src/grenzland/gl_mission.js`, GLMISSION): Missionen sind Daten – Schritte mit Text, Ziel (Pfeil, Entfernung, Radar),
  Prüfung, Aufbau und Abbau. Zustand in `GL.m` / `GL.cur` (mit dem Modus gespeichert). Die Regeln sind reine Logik
  (`GLMLOGIK.runner` in `gl_mission_data.js`, Unit-Tests): eine Mission läuft, ein Fehlschlag (erwischt, Rennen verloren, vom Wachmann gefasst)
  startet den **Kontrollpunkt** des Schritts neu – nie das Kapitel –, ein Neuladen ebenso. Im Tagebuch (Quelle `grenzland`): erledigte
  Missionen, die laufende (verfolgt: `QUESTS.track = 'grenzland:<id>'`) und die nächste als Hinweis; jeder Eintrag hat `target` und `ort`.
- **Die Bühne**: je Schritt sagt die Mission, wer und was in der Welt steht (`szene(i, A)`: `A.fig`, `A.auto`, `A.ding`, `A.reiter`). Was
  der nächste Schritt nicht mehr nennt, verschwindet; Figuren laden erst, wenn ein Schritt sie braucht. Reiter sitzen auf ihren Mopeds,
  Gerhard sitzt auf der Bank. Beim Ende, Fehlschlag und „Beenden“ ist alles wieder weg.
- **Gespräche**: Untertitel mit Namen (`GLHUD.sub`), gesprochen über `STIMME.say('gl_<castId>')`, wenn Stimmen an sind; die Figur
  gestikuliert und dreht sich zum Spieler. **E / Aktionsknopf „Weiter“** überspringt eine Zeile.
- **Kapitel 1** (`gl_kapitel1.js`, Texte in `gl_mission_data.js`):
  1. **Ein Gefallen** – Zentralhaltestelle Schleusingen (Abblende, bis die Stadt steht), der Fremde kommt und drückt das Paket in die Hand
     (+50 €). Nach Ratscher mit Bus, Anhalter, zu Fuß oder **„Mitfahrgelegenheit“** im Grenzland-Feld (Abblende, 30 Minuten später am
     Wartehäuschen). Alte Schule: niemand da. **Wechseln (Tab)** – Sarah hat das Paket geöffnet: halbe Grenzkarte (`karte1`). SMS von
     Unbekannt, Dorf-Chat; **Handy (T)**, **Radio (R)**; Nacht im Garten → nächster Morgen.
  2. **Die Clique** – SMS von Jule; Moped betanken (Aktion des Kerns `gl:tanken`, sonst eigene Ersatz-Aktion), zur Feldscheune, Gespräch;
     **Rennen** zur Staumauer entlang der Straßen (`GLAUTO.route`, Kontrollpunkte alle 200 m, Countdown, Fehlstart, Platzanzeige, faires
     Gummiband). Verloren → wieder an den Start. Gewonnen → Gespräch an der Mauer, +80 €, 4 Böller, Hinweis auf Kegeln und Angeln
     (`grenzland:mission { id: 'clique', st: 'erledigt' }`).
  3. **Gerhards Geschichte** – Gerhard sitzt unter der Dorflinde (der Dorf-Gerhard bleibt solange weg). `GL89.enter` (Schulhof): Kiste
     nehmen (halten), sie hängt vor dem Körper, man geht langsam und rennt nicht; erste Minute ruhig (`GLFAHNDUNG.off`), danach meldet jeder
     Zeuge die Kiste (`GLFAHNDUNG.tat('kiste')`). An der Feldscheune unter das Stroh (halten, nicht unter Beobachtung), warten, bis die
     Sterne weg sind. Erwischt → die Erinnerung beginnt wieder an der Kiste. `GL89.leave`, Gespräch unter der Linde.
  4. **Nachts an der Klinge** – SMS von Jule; „Bis zum Abend warten“; im Wald Transporter, drei Männer, Kisten. Ein Böller abseits lockt
     zwei weg; **drei Fotos** aus höchstens 40 m (E „Foto machen“, zusätzlich ist `GLHANDY.kamera` scharf). Die Männer sehen mit
     `GLLOGIK.sieht` (Rücken blind, Dunkelheit und Ducken helfen, ein Moped hören sie): entdeckt → sie rennen los, gefasst → wieder vom
     Waldrand. Danach Leuchtkugel, Dorf-Chat, **drei hohle Sterne**; fertig, wenn die Sterne weg sind und man im Garten steht.
  5. **Der Coup** – Fotos zu Jule, Plan wählen (**leise**: nachts durch die Lücke; **laut**: Zeichen geben, Batterie am Tor, beide Wachen
     rennen hin, dafür ein hohler Stern). Im Außenlager Bürotür aufbrechen (halten; jeder Schlag ist zu hören), Karte von der Wand
     (`karte2`), raus und zur Feldscheune. Gesehen → Einbruch wird gemeldet; gefasst → wieder vor dem Zaun. Abschluss: +250 €,
     **Abschlussbild** (Taten, Entkommen, Erwischt, Kilometer, Kegeln, Fische, Kasse; „Fortsetzung in Kapitel 2“), freies Spiel.
- **Das Außenlager** (`gl_lager.js`, GLLAGER; Plan als reine Daten `GLMDATA.lager`): Stabmattenzaun mit Tor zum Feldweg und Lücke hinten,
  vier Seecontainer, begehbarer Bürocontainer (Tür, nachts erleuchtetes Fenster, gerahmte Karte), Lkw, Paletten, Flutlicht (ein geliehenes
  Licht), Kamera am Tor (Zeuge, der niemanden kennt), zwei Wachen (Runde am Zaun, Posten am Tor; kommen erst, wenn man näher als 260 m ist).
  Container verdecken die Sicht, unter dem Flutlicht hilft die Dunkelheit nicht. Seite und Abstand zum Feldweg werden beim Bauen am Boden
  gemessen. 1989 ist dort nur Feld. Alles Feste sind Boxen in `VEH.extra` (Fußgänger und Fahrzeuge).

## Ausprobieren

- Szene „Grenzland“ (`?szenario=grenzland`) – die erste Mission startet von selbst.
- In der Konsole: `GLMISSION.debug.go('clique')`, `…go('gerhard', 'kiste')`, `…go('klinge', 'fotos')`, `…go('coup', 'rein')` (alles davor gilt
  als erledigt, mit dem, was es gab); `GLMISSION.debug.skip()` beendet den laufenden Schritt; `GLMISSION.debug.info()` zeigt den Stand.
  Missionen: `gefallen`, `clique`, `gerhard`, `klinge`, `coup`.
- In der Rückblende (Mission 3) springt man mit `debug.go('gerhard', 'damals')` hinein und dann mit `debug.skip()` weiter (die Schritte
  danach setzen 1989 voraus).
- Tests: `node --test viz3/test/unit/grenzland_mission.test.mjs` (13 Tests: Läufer, Gummiband, Nacht, Wachsamkeit, Bilanz, Texte, Lagerplan);
  `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9017 --serve grenzland_mission:m1,reload` (Abschnitte `m1 m2 m3 m4 m5 lager
  reload`, jeder für sich lauffähig; Bilder in `out/grenzland_mission/`); Orte nachmessen: `grenzland_mission_probe`.
- Auf GitHub Actions läuft jeder Abschnitt als eigener Job (`viz3/extra/grenzland-mission/tests.txt`), Fehlschläge stehen als Anmerkung am Job.

## Was der Browser-Test durchspielt

| Abschnitt | geprüft (echte Prüfungen der Schritte; nur Wege werden übersprungen) |
|---|---|
| `m1` | Start an der Zentralhaltestelle, Tagebuch, Gespräch, der Fremde kommt, Paket +50 €, „Mitfahrgelegenheit“, Schultür, Wechsel zu Sarah → `karte1`, SMS und Dorf-Chat, Handy, Radio, Nacht → Morgen, Ereignis mit Titel und Lohn |
| `m2` | SMS, Moped und Kanister, Tanken (halten), Clique an der Scheune, Gespräch, Strecke mit Kontrollpunkten, Reiter sitzen, Countdown, Rivalen fahren, **verlieren** → wieder am Start, **gewinnen** über alle Kontrollpunkte, Gespräch an der Mauer, +80 €, 4 Böller |
| `m3` | Gerhard sitzt (Dorf-Gerhard weg), Gespräch, 1989 am Schulhof, Kiste nehmen, langsames Gehen mit Kiste, ruhige Minute, gesehen → Sterne, **erwischt** → wieder an der Kiste (noch 1989), Stroh an der Scheune, Versteck, zurück im Heute, Gespräch |
| `m4` | SMS, Warten bis zum Abend, Transporter/Männer/Kisten bei Nacht, Foto aus 55 m zählt nicht, **entdeckt und gefasst** → wieder am Waldrand, Böller lockt zwei weg, drei Fotos geduckt, Leuchtkugel, Dorf-Chat, drei hohle Sterne, Wagen fährt ab, erst ohne Sterne im Garten fertig |
| `m5` | Gespräch, Wahl leise/laut, Lager mit zwei Wachen, Zaun hält, Zeichen → Batterie → Wachen am Tor + ein hohler Stern, durch die Lücke, Tür aufbrechen, Karte nehmen, **gesehen** → Einbruch gemeldet, **gefasst** → wieder vor dem Zaun, zweiter Anlauf, zur Scheune, Gespräch, +250 €, Abschlussbild, freies Spiel |
| `lager`, `reload` | Lager steht; 1989 verborgen und nicht fest; Debug-Sprung; Neuladen mitten in der Mission geht am Schritt weiter; „Beenden“ räumt alles ab |

## Entscheidungen (Falko schlief)

- **Ein weiteres Modul** `gl_kapitel1.js` direkt unter `gl_mission.js` in `modules.txt`: der Läufer bleibt klein, das Kapitel ist Daten.
  Die reinen Regeln stehen mit in `gl_mission_data.js` (zweiter Export `GLMLOGIK`), damit sie ohne Browser prüfbar sind.
- **Das Lager steht, solange der Modus läuft** (nicht erst in Mission 5): der Feed erwähnt die Container, man kann vorher vorbeifahren.
  Wer ohne Mission hineingeht und gefasst wird, wird vor das Tor gesetzt (Hausfriedensbruch).
- **Rennen mit Kontrollpunkten** statt freier Wahl des Wegs: sonst gewinnt die Abkürzung über den Acker. Die Strecke ist die schnellste
  Straßenroute (rund 1,6 km); Jule fährt etwa 46 km/h, liegt sie weit vorn, lässt sie nach, liegt sie hinten, gibt sie Gas (höchstens 54).
- **1989 ohne eigene Dorfleute des 1989-Agenten**: solange `GL89.leute` leer ist, stellt die Mission den ABV und zwei Nachbarn (Erna, Horst)
  selbst; sobald `GL89.leute` Leute hat, nimmt sie nur noch den ABV dazu, falls er fehlt.
- **Verhaftung in der Gegenwart** startet nur Schritte neu, die das brauchen (Flucht von der Klinge, Flucht mit der Karte); sonst geht die
  Geschichte am nächsten Morgen einfach weiter.
- **Dritter Mann an der Klinge**: `GLDATA.CAST.wache3` („Fahrer“) wird beim Laden ergänzt. Krähwinkel selbst tritt in Kapitel 1 nicht auf.
- **Das Büro steht abseits des Tors**, damit „leise“ geht: die Tür hört nur, wer näher als 7,5 m vorbeikommt (also die Runde abwarten);
  bei „laut“ sind beide Wachen 48 Sekunden am Tor, danach hört man die Tür 24 m weit.
- **Im Hof gilt nur, wer wirklich innerhalb des Zauns steht** (wer von außen am Zaun steht, wird nicht gemeldet). Hausfriedensbruch
  (vor dem Aufbrechen) und Einbruch (danach) werden je einmal gemeldet.
- **Mit der Kiste** geht man höchstens 1,9 m/s (zügiges Gehen statt 2,5; Rennen wird gebremst) – 250 m dauern so gut zwei Minuten.
- Hubert und Ronald kommen in keinem Text vor (Unit-Test prüft es); alle Täter sind erfunden.

## Offen

- Von Hand gespielt hat es noch niemand: Tempo des Rennens, Sichtweiten der Wachen und Wartezeiten sind nach Rechnung eingestellt.
- Die Wachen laufen bei der Jagd um Container herum (herausgeschoben), aber ohne Wegsuche; sie verlassen den Hof nicht.
- Fremder, Clique und Wachen haben keine eigenen Stimmenaufnahmen (nur die Geräte-Stimme über `STIMME`).
- Der Plan „leise“/„laut“ später in der Strategie-Linse (Auftrag: nicht heute).

## Für den Lead

- `docs/ARCHITECTURE.md` (Modulkarte): neu `grenzland/gl_kapitel1.js` (GLKAP1); `gl_mission_data.js` exportiert zusätzlich `GLMLOGIK`.
- Falls `gl_fig.js` (Agent 1989) Figuren künftig jede Runde auf den Boden setzt: Sitzende (`F.sitzt`) und Reiter (`F.reitet`) bitte
  auslassen – die Mission setzt ihre Höhe selbst (`F.z`), der Sitz kommt aus `F.f.mode = 'sit'`.
- `GLFAHNDUNG.sneak` und `.seen` nutze ich nur, wenn es sie gibt (sonst `P.stance` bzw. `stand().seen`).
- Die Wegpunkte des Rennens hängen an `GLAUTO.route(Scheune → Staumauer)`; ändert der Auto-Agent das Netz, ändert sich nur die Strecke.

- `GRENZLAND.start()` setzt den Spieler in den Garten und ruft dann `GLMISSION.neu()` – Mission 1 blendet ab und setzt ihn nach
  Schleusingen. `viz3/test/grenzland.py` prüft danach „Sarah steht daneben“ usw.: das hält (die Partnerfigur entsteht beim Spieler), aber
  die Uhr-Prüfung „17:20“ und alles im Garten sollte nach `GLMISSION.stop()` oder mit `GLMISSION.debug` laufen.
- `GLDATA.ORTE.schulhof` liegt auf der Hauptstraße nordwestlich der Schule (nicht hinter ihr); die Mission nimmt es, wie es ist.
- Für `GLHUD`: ein Ereignis `grenzland:kapitel { kap: 1, st: 'ende' }` kommt mit dem Abschlussbild (eigenes Element `#glende`).
- `GL.kap1` (nicht gespeichert) merkt, dass das Abschlussbild gezeigt wurde.
