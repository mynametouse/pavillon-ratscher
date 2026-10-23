# Dorfleben (feat/dorf) – Skatabend in der alten Schule, Feuer am Acker, Dorfbewohner

Wunsch von Falko (`docs/plans/plan_leben.md`, Abschnitt 2, 23.10.2026).

## Was es gibt

- **Kalender** (`viz3/src/dorf/dorf_cal.js`, `DCAL`): Wochentag aus Spieluhr und Kalender (`DN.e0`). **Freitag 19–23 Uhr** Skat- und
  Rommé-Abend in der alten Schule; **jeden zweiten Samstag 19–23:30 Uhr** Feuer am Acker Richtung Klinge. Ein Abend, bei dem man dabei ist,
  endet nicht unter den Füßen: er geht weiter, solange man drinnen bzw. am Feuer bleibt.
- **Raum in der alten Schule** (`dorf_school.js`, `DSCHOOL`; Gebäude 215): Eichendielen, Lehmputz mit Holzpaneel, Bretterdecke bis unters Dach
  mit Kehlbalken, Fenster an den Stellen der Fassade, Theke mit Flaschenregal und Zapfhahn, runder Skattisch, Rommé-Tisch mit freiem Stuhl,
  langer Tisch der Feuerwehr, Ofen, alte Schultafel, Wimpel, Garderobe. Gebaut erst, wenn man auf 170 m herankommt. Die Fassade bekommt eine
  echte Türöffnung (das Wand-Viereck mit der gemalten Tür wird durch vier Teile um die Öffnung ersetzt – gleiches Material, kein neuer Shader),
  die Tür geht freitagabends nach innen auf, sonst ist abgeschlossen („Tür der alten Schule“ sagt, wann wieder). Daneben hängt der **Aushang**.
  Licht: keine neuen Lampen (sonst würde jeder Shader neu übersetzt) – drei Innenlampen des Pavillons werden geliehen, solange der Abend läuft
  und man in der Nähe ist, und hängen dann über den Tischen und der Theke.
- **Leben im Raum**: am Skattisch wird Stich für Stich gespielt (Karten fliegen in die Mitte, der Stich geht zum Gewinner), Karten klatschen
  auf den Tisch, ab und zu klirren Gläser (Web Audio, nach Entfernung). Ist ein Abend und man ist im Garten oder im Dorf unterwegs, kommt
  einmal ein Hinweis („In der alten Schule brennt Licht …“). Sitzt man fest (Tür zu), führt „Hinausgehen“ vor die Tür.
- **Dorfbewohner** (`dorf_text.js`, `dorf_people.js`): Gerhard (72, Lehrer i. R., Dorfchronik), Manfred (56, Wehrführer), Wolfgang (59,
  Waldarbeiter), Uwe (46, Landwirt, freitags hinter der Theke), Katrin (39, Pflegerin, Rommé), Ingrid (58, Ortsteilbürgermeisterin),
  Jens (34, Kfz-Mechaniker, Feuerwehr), Heike (47, Gemüsegarten, Hühner) –
  Microsoft-Rocketbox-Figuren (MIT) mit den Bewegungen der Spielfiguren, gebaut mit `tools/player/build_villagers.sh` →
  `viz3/extra/dorf/dist/chars/dorf_*.json` (0,7–1,2 MB je Figur, Gesicht 1024 px, Rest 512 px; unter den durchsichtigen Pixeln der
  Haarkarten liegt die mittlere Haarfarbe, sonst gäbe es dunkle Ränder; Gerhard ohne Haarkarten; Manfred schwarze Schuhe, Wolfgang
  dunkle Arbeitsschuhe – die hellbraunen sahen im Feuerschein wie nackte Füße aus, `tools/player/dorf_shoes.py`). Geladen werden sie
  **nur**, wenn sie gebraucht werden (Abend in der Nähe, Garten, Auto), jede gleich an ihren Platz, danach wieder freigegeben.
- **Gespräche**: Aktionsknopf „Mit … sprechen“ → Gesprächsfenster (`#dorfpanel`, Aussehen wie bei den Nachbarn, `shell/css/dorf.css`) mit
  Themen: Schule (1828, heute Vereinshaus der Feuerwehr), Dorflinde (1888), Talsperre, Wald und Klinge, Wetter, Hubert und Ronald …
  Tischgespräche und Geschichten laufen als Untertitel (`#dorfsub`).
- **Aufgabe „Freitagabend in der alten Schule“** (gespeichert in `pav-dorf-v1`): Aushang lesen → freitags hingehen → Ingrid begrüßen →
  am Rommé-Tisch hinsetzen → Gerhards Geschichte von der Schuluhr → mit Katrin „Höher oder tiefer“ spielen (fünf Runden, Skatblatt) → zum
  Feuer am Acker kommen und mit Wolfgang sprechen. Stand im Gesprächsfenster oben.
- **Feuer am Acker** (`dorf_fire.js`, `DFIRE`): Feuerstelle mit einem Ring aus Feldsteinen (rund, unregelmäßig, jeder etwas anders,
  zum Feuer hin verrußt) und Holzbänken (immer da); beim Feuer ein Kegel aus Rundhölzern mit Rinde, oben verkohlt mit glühenden Rissen
  (Leuchtkarte statt einer Farbe über dem ganzen Scheit), Flammen (Rausch-Shader), festgetretener Boden mit Asche ringsum, der im
  Feuerschein glimmt (Normalen senkrecht – auf dem groben Gelände zeigte das Licht sonst Dreieckskanten), Funkenflug, Rauch, flackerndes Licht
  (geliehene Ofenlampe des Pavillons), Knistern (Web Audio). Die Shader werden schon beim Herankommen übersetzt (kein Ruckeln, wenn das
  Feuer angeht). Ortsname „Feuer am Acker · Richtung Klinge“.

- **Alltag im Dorf** (`dorf_life.js`, `DLIFE`; Falko 23.10. 2:52): Die Leute sind meist im Haus. Jeder hat ein eigenes Haus am Anger
  (aus `world/village.js`, eines mit Tür, die Häuser verteilt), eine Haustür und einen Platz im Vorgarten neben dem Weg. Der Tag kommt
  aus Spieluhr und Kalender, jeden Tag anders: April bis Oktober morgens und abends eine Runde im Garten (Unkraut jäten kniend, in den
  warmen Monaten gießen mit der Kanne), im Winter ab und zu kurz an die Tür; Heike und Katrin reden an manchen Abenden am Gartenzaun.
  Sie kommen aus der Tür, gehen die paar Schritte, arbeiten an ihrem Beet (Gemüse bei Heike, Uwe und Wolfgang, Rosen bei Ingrid, sonst
  Blumen – ein Beet mit Brettrand vor jedem ihrer Häuser), gehen wieder hinein; wer angesprochen wird, steht auf, dreht sich her und
  grüßt nach der Uhrzeit („Guten Morgen! Brauchst du Eier? …“), die Abendgrüße gibt es nur in der Schule und am Feuer.
  Geladen werden nur die, die draußen sind und in der Nähe (140 m), wenige auf einmal; nach 25 s ohne Bedarf wieder freigegeben.
- **Autos** (`dorf_cars.js`, `DCARS`): Katrin und Jens fahren werktags zur Arbeit, Ingrid dienstags und donnerstags ins Rathaus, Manfred
  manchmal einkaufen. Das Auto (schlicht, ohne Marke) parkt am Straßenrand der nächsten Straße, rechts in Fahrtrichtung hinaus; der
  Besitzer kommt aus dem Haus, geht zur Fahrertür, steigt ein, es fährt langsam auf der rechten Spur aus dem Dorf (weg vom Anger, ~200 m)
  und kommt später auf der Gegenspur zurück, parkt gegenüber, der Besitzer geht ins Haus. Es wartet, wenn man davor steht. Gebaut erst
  im Umkreis von 450 m um den Anger; weiter weg gilt nur der Fahrplan.
- **Besorgungen** (Aufgaben wie in einem Spiel, `DTEXT.ERRANDS`): „Für die Chronik“ (Gerhard: Dorflinde, Brunnen, Schuluhr ansehen),
  „Ein Brett für die Tombola“ (Ingrid: ein fertiges Stirnholzbrett aus der Klingenholz-Werkstatt bringen – `WERK.handOver`),
  „Wolfgangs Lehrstück“ (an der Klinge einen markierten Baum fällen und vermessen – `FELL.logs`), „Ein Päckchen für Hubert“ (Jens:
  Zündkerzen für den Mondeo), „Ziegenmist für die Beete“ (Heike: bei Ronald abholen). Stand in `pav-dorf-v1` (`err`).
- **Mit dem Ortsvorsteher** (`amt/amt.js`, abgesichert – ohne AMT läuft alles wie zuvor): hat Ingrid das Amt abgegeben
  (`AMT.ST.phase` `office`, `lost` oder `missed`), fährt sie nicht mehr dienstags und donnerstags ins Rathaus; im Gesprächsfenster
  steht ihre Rolle nach AMT (`AMT.roleOf`, falls es das gibt, sonst „war elf Jahre Ortsteilbürgermeisterin“), ihre Grüße am Tag und
  der Text der Freitagsaufgabe passen sich an.
- **Freitag draußen**: an milden Abenden (Mai bis September, bis 22 Uhr) sitzen Jens und Heike an einer Bierzeltgarnitur vor der Schule,
  sonst am langen Tisch drinnen.

## Testen

- Schnell im Browser: `index.html?dorf=freitag` (Freitag 20 Uhr, vor der Schultür) oder `?dorf=feuer` (Samstag 21 Uhr am Feuer).
- In der Konsole: `DORF.jump('skat', 20)`, `DORF.atDoor()`, `DORF.enter()`, `DORF.toFire()`, `DORF.state()`, `DORF.UI.open('gerhard')`.
- Browsertest `viz3/test/dorf.py` (Abschnitte `light,door,inside,talk,task,fire,life,summer,gl`), läuft bei jedem Push auf `feat/dorf-leben` in GitHub Actions
  (`viz3/extra/dorf/tests.txt`); Bilder in `out/dorf/`.

## Für den Kern-Chat

- Stand dieses Zweigs: `feat/dorf-leben` mit `origin/src` zusammengeführt (Konflikte keine). In gemeinsamen Dateien nur: zwei neue
  Zeilen unter der Marke `# feat/dorf` in `modules.txt` (`dorf/dorf_life.js`, `dorf/dorf_cars.js`); `pav-dorf-v1` in `core/save.js`
  ist schon auf `src`. Neue `window`-Namen seit Runde 1: `DLIFE`, `DCARS` (dazu `DCAL`, `DPEOPLE`, `DSCHOOL`, `DFIRE`, `DORF`).
- Die Aufgabe hat ein eigenes kleines Tagebuch im Gesprächsfenster; `game/quests.js` ist unberührt (zum späteren Einbinden: `DORF.ST.step`,
  Besorgungen in `DORF.ST.err`).
- Zur Laufzeit, ohne fremde Dateien zu ändern: die Wand der Schule (`RATSCHER.bld[0]`, Viereck mit der Tür) wird ersetzt; ein
  `KERN.provide('pushOut', …, 1)` lässt in der offenen Tür die Weltwände (`WCOL`) aus; `LIGHTS[0,3,4]` (Schule) und `LIGHTS[1]` (Feuer)
  werden während eines Abends in der Nähe geliehen und danach mit `LIGHTSTATE.apply()` zurückgegeben. Gelesen (nicht geändert) werden
  `VILLAGE.bld` (Häuser, Türen), `ROADS.ways` (Straßen für die Autos), `WCOL.pushCircle`, `NPC.NPCS` (Hubert, Ronald), `WERK`, `FELL`.
- Der Ortsvorsteher-Agent will Haken ans Ende von `dorf/dorf.js` und `dorf_text.js` hängen. Seit Runde 1 geändert: in `dorf_text.js`
  der Aushang-Text und `ERRANDS` im `return` von `DTEXT`, in `dorf.js` drei Felder in `DORF.state()`; die letzten Zeilen
  (`window.DORF = DORF;`, `})();` von `DTEXT`) sind gleich geblieben – dahinter Angehängtes trifft sich nicht mit meinen Änderungen.
