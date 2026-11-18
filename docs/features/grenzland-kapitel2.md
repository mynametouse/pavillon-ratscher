# Grenzland – Kapitel 2 „Kolonnenweg“, Etappe 2: Kapitelstart, Mission 1 und 2, Autos knacken (Hilfs-Agent `kapitel2`)

Auftrag: `docs/plans/auftraege/grenzland5-kapitel2.md` (gemeinsam: `grenzland5-gemeinsam.md`), Plan `docs/plans/plan_kapitel2.md`
(Abschnitte 3, 4, 8). Branch `feat/grenzland-kapitel2`. Falko 17.11. 22:26 „Ok dann weiter“; 18.11. 18:42 (über den Lead): **eine
Vorabversion von Kapitel 2 um ~20:30** – zuerst Kapitelstart und Mission 2 (spielt in Ratscher, Schleusingen und der Feldscheune, braucht
die Zone nicht), Mission 1 mit der Zone in der nächsten Version. Die Vorabversion ist V19g (live 18.11. 20:24, mit der Zone von `zone`);
**seit diesem Stand ist Mission 1 an** (`GLK2DATA.KAP.vorab = false`): Kapitelstart → Mission 1 „Grünes Band“ → Mission 2.

Dateien (`viz3/src/grenzland/`): neu `gl_kapitel2_data.js` (`GLK2DATA`, `GLK2LOGIK`, `GLKNLOGIK` – rein), `gl_knacken.js` (`GLKNACKEN`),
`gl_kapitel2.js` (`GLKAP2`); markierte Haken (`// grenzland-kapitel2`) in `gl_mission.js` und `gl_mission_data.js`, je eine Zeile in
`gl_modus.js` (`tick`, `stop`, nach den Zeilen von `GLHANDY`), drei Zeilen in `modules.txt`. Tests `viz3/test/grenzland_kapitel2.py`
(`:start`, `:m2`, `:knacken`, `:m1`, `:m1e`), `viz3/test/unit/grenzland_kapitel2.test.mjs` (13), CI-Zeilen
`viz3/extra/grenzland-kapitel2/tests.txt`.

## Was es gibt

### Der Kapitelstart (nach Kapitel 1)

- **Wann:** im freien Spiel nach Kapitel 1 – über **„Kapitel 2 beginnen“** im Grenzland-Feld (ein Gedanke sagt es nach ein paar Sekunden),
  wenn man (nach einem Weg) zur Feldscheune kommt, oder nach drei Minuten ruhigen Spiels; nie mitten in etwas (Mission, Fahndung,
  Nebenjob, Handy offen, Abschlussbild, Blende). Die Missionen von Kapitel 2 bleiben bis dahin geheim (Tagebuch: fünf erledigte).
- **„Drei Monate später“:** Schwarz – „Dezember. Krähwinkel hat sich nicht gerührt …“ –, der Kalender der Geschichte springt auf **Freitag,
  4. Dezember 2026, 16:40** (der Weihnachtsmarkt in Schleusingen ist an diesem Wochenende offen), **Schnee** (`WETTER.preset('schnee')`,
  nur für den Besuch; nach „Beenden“ kommt die eigene Wetterwahl zurück). Die beiden stehen an der Feldscheune; Jule, Timo, Basti und
  Gerhard warten dort (Wintermützen, Gerhard mit Hut). Die Kapitelkarte **„Kapitel 2 · Kolonnenweg“** (in V19g: „Kapitel 2 –
  Vorabversion · Kolonnenweg“).
- **Die Szene** (Zwischensequenz, 16 Sätze): Gerhard war im Stasi-Unterlagen-Archiv in Suhl, seine eigene Akte – „Am zehnten November nahm
  der Lehrer G. eine Kiste in Verwahrung. Inhalt: Unterlagen der Bezirksverwaltung und Devisen.“ – die Kiste kam aus einem Wagen der
  Bezirksverwaltung, gefahren hat ihn der junge Krähwinkel (Namen Dritter werden in den Akten geschwärzt, die von Mitarbeitern nicht);
  Westgeld ist die Versuchung (Basti); vor einer Woche hat ein Mann im Mantel nach Lutz gefragt – **der Fremde jagt die Kiste selbst**.
- **Die erste Spur des Verräters:** draußen auf dem Feldweg steht ein Lkw der Spedition Krähwinkel mit laufendem Motor; eine Nachricht von
  Unbekannt: „Schöne Grüße in die Feldscheune. Bei Schnee sieht man jede Spur.“ – wer das wusste, bleibt offen (Jule: nur wer heute hier
  war; Timo: oder wer von der Straße aus guckt; Basti: „Hm.“). Der Lkw fährt los. Im Dorf-Chat fragt Wolfgang, was Krähwinkel in die
  Feldflur liefert.
- **Die Nacht im Garten** → Samstag, 5. Dezember, 9:40 – Mission 1 (in V19g: 10:20 Uhr und Mission 2, mit dem Satz, dass „Grünes Band“ in
  der nächsten Version kommt).
- **Einmal:** beide Missionen beginnen mit diesen drei Schritten (ihre Schrittlisten bleiben ab der Vorabversion gleich – ein Spielstand
  behält seinen Schritt); gespielt werden sie nur von der ersten Mission, die kommt. Ist die andere Mission des Kapitels schon erledigt,
  geht eine Mission an ihnen vorbei: Mission 2 nach Mission 1 am selben Tag; Mission 1 nach der Mission 2 einer Vorabversion am nächsten
  Morgen um 9:40 („Am nächsten Morgen“).

### Mission 1 „Grünes Band“ (`k2m1`) – an seit diesem Stand (in V19g noch aus)

Im Browser durchgespielt – gegen den Ersatz (`grenzland_kapitel2:m1`) und gegen `GLZONE` von `feat/grenzland-zone` (`:m1z`, Stand unten
unter „Tests“): mit der Simson zum Grünen Band
(„Hinfahren“ im Grenzland-Feld), Sarah am Grenzturm über die Grenzübergangsstelle Eisfeld–Rottenbach (21. Juni 1973) und das Grüne Band
(Hof, 9. Dezember 1989), der Kolonnenweg in die Görsdorfer Heide, der Bunker unter einem alten Fundament – Krähwinkels Leute schon dort
(sie sehen mit den Augen; ducken hilft, ein Moped hört man), zwei Fotos aus der Deckung, der Fremde am Rand der Heide, Rückzug weg vom
Kolonnenweg (ihr Transporter fährt ihn ab), seine Nachricht, sobald wieder Netz ist: „Ich will die Akte, nicht das Geld.“ Nutzt `GLZONE`
(Agent `zone`); solange es fehlt oder nicht geladen ist, ein Ersatz mit derselben Schnittstelle (ein Schotterweg westlich von Ratscher).
In der echten Zone liegt der Bunker ~95 m abseits des Kolonnenwegs: der Weg endet, wenn man an ihm vorbeifährt; neu anfangen am Rand der
Heide höchstens 75 m vor ihm; Krähwinkels Leute gehen zu ihrem Transporter auf dem Kolonnenweg und steigen ein, erst dann fährt er.
Das Kapitel beginnt mit Mission 1 (mit dem Kapitelstart), Mission 2 folgt am selben Samstag. Zurück zur Vorabversion (nur Mission 2):
`GLK2DATA.KAP.vorab = true`.

### Mission 2 „Ein Auto für die Nacht“ (`k2m2`, nach Mission 1 am selben Samstag; in V19g die erste des Kapitels)

1. **Treff** (Missionskarte „Kapitel 2 · Mission 2“): Nachricht von Jule; an der Scheune der Plan – in den Bunker geht man nachts und nicht
   mit drei Mopeds, die Krähwinkel kennt; ein altes Auto ohne Wegfahrsperre; Basti weiß, dass Rentner Rudi Fiedler (erfunden) mit seinem
   Wartburg samstags zum Weihnachtsmarkt fährt und um sechs beim Glühwein steht („Man guckt halt.“ – eine zweite, leise Spur); ausleihen,
   nach der Nacht zurück („Das sagen sie alle.“). Timo gibt Draht und eine **Arbeitsjacke der Spedition** (vom Paletten-Abladen im Sommer).
2. **Abend:** „Bis zum Abend warten“ (Zeitraffer bis 17:50), dann nach Schleusingen. Der **weiße Wartburg 353** (HBN-RF 53) steht am
   Bordstein bei der Zentralhaltestelle, dahinter ein Kombi von heute. Fiedler steht am Glühweinstand des Weihnachtsmarkts (ist der Markt
   zu – ein anderer Tag –, sitzt er in der Gaststätte am Markt).
3. **Knacken** (die Uhr läuft jetzt in Echtzeit, Fiedler bleibt zweieinhalb Minuten): **„Mit Draht öffnen“** (E halten, 8 s, leise – nur
   wer zusieht, meldet es) oder **„Scheibe einschlagen“** (1 s, laut: wer im Umkreis von 32 m ist, hört es; Glas am Boden, dann
   „Kurzschließen“ 3 s). Der Kombi von heute: „Auto aufbrechen“ → Wegfahrsperre, die Alarmanlage heult, Warnblinker; wer in 60 m ist,
   ruft an. Ist Fiedler zurück, bevor der Wagen weg ist: „Zu spät“ – noch einmal, eine Stunde früher.
4. **Weg:** Fiedler sieht seinen Wagen davonfahren – „Mein Wartburg!“ – und ruft die Polizei: **Fahndung, die Polizei kennt das Fahrzeug**
   (HUD: Fahrzeug). Zu Fuß in der Menge des Weihnachtsmarkts ist man versteckt (`GLFAHNDUNG.extra`). Ziel: die Feldscheune. Danach im
   Dorf-Chat „Wer klaut denn einen Wartburg?“ und ein Post im Feed.
5. **Lackieren:** den Wagen unters Dach der Scheune, aussteigen, „Umlackieren“ – **Farbe wählen** (Dunkelblau, Tannengrün, Weinrot, Grau),
   „Drei Stunden später“; nicht, solange gesucht wird. Die Polizei verliert das Fahrzeug.
6. **Schilder:** „Kennzeichen tauschen“ (E halten) – die Schilder von Bastis altem Golf, HBN-BM 47 („Solange keiner nachguckt, ist das ein
   Kennzeichen.“).
7. **Jacke:** „Arbeitsjacke der Spedition anziehen“ – orange, Reflexstreifen, „Spedition Krähwinkel“ auf dem Rücken; Jule sieht es sich an.
8. **Ende** mit der Clique; „Mission bestanden · Ein Wartburg ohne Vergangenheit“, danach **„Fortsetzung folgt – Als Nächstes: „Die Nacht
   am Tor“**. Der Wagen bleibt (gespeichert) in der Scheune für die Missionen 4–6.

### Autos knacken (`GLKNACKEN`, Regeln `GLKNLOGIK`)

- **Alte Autos** mit Draht (leise, langsam) oder Scheibe (schnell, laut, dann kurzschließen); **neue** gar nicht – Wegfahrsperre (seit Ende
  der Neunziger in Neuwagen Pflicht) und Alarm. Ein Auto der Geschichte wird mit `GLKNACKEN.stelle(id, o)` hingestellt; ein altes ist ein
  fahrbares Fahrzeug von `vehicles/vehicle.js` (`gl-wartburg`): Wartburg 353, 993 cm³ Dreizylinder-Zweitakter, 37 kW (50 PS), vier Gänge,
  Frontantrieb, ~990 kg mit Fahrer, Karosserie aus `gl_typen.js`, eigene Kennzeichen mit Schrift (weißes Feld, blauer Rand), der Klang des
  Zweitakters wie beim Trabant (`v.gl.zweitakt`). Verschlossen bleibt die Tür, bis er geknackt ist.
- **Was die Polizei weiß:** die Anzeige des Besitzers (`melde`): Farbe und Kennzeichen; sitzt man im Wagen, ist es eine Tat mit dem
  Besitzer als Zeugen (die Fahndung kennt das Fahrzeug), sonst gilt sie, sobald man ihn wieder fährt, solange er noch so aussieht.
  **Umlackieren** und **andere Schilder** ändern das Aussehen; die Fahndung verliert das Fahrzeug (`GLLOGIK.umkennzeichnen`). Die reine
  Regel (`GLKNLOGIK.erkennt`): eine Streife erkennt den Wagen an der Farbe von weitem (70 m am Tag, 30 m nachts), am Kennzeichen von nah
  (12 / 6 m); `sauber`, wenn nichts mehr passt.
- **Gespeichert** unter `pav-gl-knacken-v1` (strenge Prüfung); ein gestohlener Wagen steht beim nächsten Start des Modus wieder, wo er
  war. „Beenden“ stellt ihn weg.

## Ausprobieren

- **Direkt in Kapitel 2** (Falko 18.11. 20:28 über den Lead): `?szenario=grenzland&kapitel=2` – oder `?kapitel=2` in der Adresse und
  Szenen → Grenzland. Beim Start des Modus (einen Frame nach seinem frischen Start) wird Kapitel 1 als erledigt eingetragen, wenn es das
  nicht ist (wie `KAP1` im Browser-Test), und Kapitel 2 beginnt sofort wie mit „Kapitel 2 beginnen“; hat Kapitel 2 schon begonnen,
  passiert nichts. Ohne den Parameter ändert sich nichts. Ein frischer Start ist eine neue Geschichte: die Autos der alten (der gestohlene
  Wartburg) sind dann weg (`GLKNACKEN`).
- Kapitel 1 erledigt, dann im Grenzland-Feld „Kapitel 2 beginnen“. Konsole: `GLMISSION.debug.go('k2m2')` (vom Kapitelstart an),
  `…go('k2m2', 'abend')`, `…go('k2m2', 'lackieren')`; `GLKAP2.debug.info()`, `GLKNACKEN.stand()`.
- Tests: `node --test viz3/test/unit/grenzland_kapitel2.test.mjs`; `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9062 --serve
  grenzland_kapitel2:start,m2,knacken`; Mission 1 allein: `…:m1` (Ersatz) oder `…:m1z` (mit `feat/grenzland-zone`; beide schalten Mission 1
  vor dem Laden ein: `window.GLK2_M1`). Bilder in `out/grenzland_kapitel2/` (`m1z`: mit „z“, z. B. `22z_kolonnenweg.jpg`).

## Tests (lokal, 18.11.2026)

- `grenzland_kapitel2:start,m2` **21/21** (360 s, 7b057883c – der Stand der Vorabversion): Bilder `01_dezember_scheune` (Feldscheune im
  Schnee, die Clique), `02_szene_gerhard` (Zwischensequenz), `03_lkw_feldweg`, `04_samstag_garten`, `10_plan_scheune`, `11_wartburg` (am
  Bordstein in Schleusingen), `12_markt`, `13_alarm`, `14_fiedler_ruft`, `15_lackiert`, `16_schilder`, `17_jacke`, `18_ende` (der blaue
  Wartburg mit HBN-BM 47 unter dem Dach, „Fortsetzung folgt“).
- `grenzland_kapitel2:m1` (Ersatz) **12/12** (b59b41327): `20_aufbruch` … `26_heim`.
- `grenzland_kapitel2:m1z` (mit `feat/grenzland-zone` d33922a60 zusammengeführt, nur lokal): 11/13 vor den Änderungen für den echten Bunker
  (der lag zu weit vom Weg für die alte Schwelle); `22z_kolonnenweg.jpg` zeigt die Simson auf den Lochplatten.
- CI-Lauf 44369745177 (2f06e7f79): 2 Fehler, beide behoben (die Kapitelkarte steht in der Reihe hinter der Startkarte des Modus; der
  Sprung direkt in Mission 2 landete am Freitag).

## Quellen (Geschichte im Kapitel)

- Bundesarchiv (Stasi-Unterlagen-Archiv): Grenzübergangsstellen für den Bezirk Suhl – Eisfeld/Rottenbach öffnete am 21. Juni 1973; der
  Grenzturm bei Eisfeld ist heute Gedenkstätte mit Ausstellung.
- BUND Naturschutz in Bayern, Pressemitteilung 117/14: Gründung des Grünen Bandes am 9. Dezember 1989 in Hof.
- Wikivoyage, Grünes Band (Deutschland) – Kolonnenweg aus Lochbetonplatten.
- Erfunden: Krähwinkel, seine Spedition, die Kiste, der Bunker, der Fremde und sein Vater, Rudi Fiedler und sein Wartburg, die Kennzeichen.

## Entscheidungen

- **Der Kapitelstart ist Teil der ersten Mission des Kapitels** (drei Schritte vor ihr), nicht eine eigene „Mission“ – sonst stünde nach der
  Szene „Mission bestanden“. Ihre Missionskarte zeigt die Mission erst bei ihrem ersten eigenen Schritt (`titelBei`), davor zeigt das
  Kapitel seine Karte.
- **Kapitel im Läufer** (`G.kap`, schon gespeichert in `GL.kap`): Missionen eines späteren Kapitels zählen erst, wenn die Geschichte dort
  ist – das Abschlussbild von Kapitel 1 kommt weiterhin nach dem Coup, das Tagebuch zeigt danach nur die fünf, und ein Neuladen im freien
  Spiel zeigt das Abschlussbild nicht noch einmal. Ein Sprung (`debug.go`) setzt das Kapitel der Mission.
- **Ein Wartburg statt eines Golf II:** den Wartburg 353 gibt es schon als Karosserie (`gl_typen.js`); ein Golf II bräuchte eine neue in
  `gl_typen.js` (nicht meine Datei). Bastis alter Golf kommt als Herkunft der Schilder vor.
- **Die Arbeitsjacke der Spedition ist eine orange Warnjacke** (wie sie Fahrer auf Logistikhöfen tragen) – über `GLFAHNDUNG.umziehen()`
  (die öffentliche Kleiderwahl der Fahndung); die Fahndung kennt sie als „orange Warnjacke“.
- **Der Besitzer meldet, während man im Wagen sitzt** (er sieht ihn davonfahren) – nur dann weiß die Fahndung über `tat(…, { force })`
  wirklich das Fahrzeug, denn sie kennt nur die Art des Fahrzeugs, in dem man gerade sitzt (`fzArt`: 'auto').
- **Echtzeit beim Knacken** (`CLOCK.focus('gl-k2')`): mit „1 Std = 1 Min“ wäre Fiedlers Glühwein in Sekunden ausgetrunken.
- **Schnee für das ganze Kapitel** über die Vorgaben des Wetters (`WETTER.preset`); Nebel mit liegendem Schnee gibt es als Vorgabe nicht –
  der Rückzug in Mission 1 geht durch Schneetreiben.

## Für den Lead

- **Stimmen:** die neuen Sätze stehen in `GLMDATA.R` (Schlüssel `k2…`, beim Laden von `gl_kapitel2_data.js` eingetragen) und in
  `GLK2DATA.linien()`; nach dem Zusammenführen `node tools/voices/grenzland_linien.mjs` laufen lassen – sonst meldet `grenzland_stimmen`
  „every line the game collects is in the list“, und die 95-%-Prüfung hängt an den Aufnahmen. Neue Sprecherin/Sprecher: `fiedler` (Rudi
  Fiedler, 71); die Wachen `wache1–3`, die Clique, Gerhard, der Fremde haben schon Stimmen.
- **Zur Laufzeit ergänzt** (gern fest übernehmen): `GLDATA.CAST.fiedler`, `GLDATA.KLEID.k2rentner`; `GLKAMERA.BARK` um die Rufe `k2…`.
- **`gl_modus.js`:** zwei Zeilen (markiert `// grenzland-kapitel2`): `if (window.GLKAP2) window.GLKAP2.tick(dt);` nach den Zeilen von
  `strasse`, dasselbe mit `stop()`. `GLKAP2.tick` führt `GLKNACKEN.tick` mit aus.
- **`modules.txt`:** `gl_kapitel2_data.js`, `gl_knacken.js`, `gl_kapitel2.js` nach `gl_feste.js`.
- **Wünsche an `gl_fahndung.js`** (nicht meine Datei): `fzArt(v)` könnte `v.gl.fz` lesen (z. B. `'wartburg:dunkelblau'`), damit die
  Fahndung einen weißen Wartburg sucht und den blauen nicht kennt, statt „ein Auto“; dazu `BILD.fz` als Funktion oder ein Eintrag je
  Art („in einem weißen Wartburg.“). Eine eigene Kleidung `'spedition'` (Farbe der Jacke nach `game/avatar.js`) wäre schöner als die
  orange Warnjacke.
- **Handy:** im Grünen Band sollte `netz()` 0 Balken zeigen (Mission 1 sagt „Kein Netz“ als Gedanke); und „Aufträge“ bleibt gesperrt.
- **Das Reden mit dem Partner** (`gl_partner_data.js`) kennt die Schritte von Kapitel 2 noch nicht.
- **Mission 1 ist an** (`GLK2DATA.KAP.vorab = false`; `tests.txt` hat `grenzland_kapitel2:m1` – in `GLZONE`). Spielstände von V19g: wer
  dort mitten in Mission 2 war, macht dort weiter (gleiche Schritte); danach – oder wer Mission 2 schon fertig hatte – kommt Mission 1 ohne
  den Kapitelstart, am nächsten Morgen. Sie nimmt von
  `GLZONE` (V19g): `ort()` für `parkplatz`, `museum`, `kolonnenweg_a`, `kolonnenweg_b`, `heide`, `bunker`,
  `weg()`, `da()`, `need('gl-k2', an)` von „Grünes Band“ bis zur Heimfahrt und `hin({ ort: 'parkplatz', mit: 'moped', fade: false })` für
  „Hinfahren“ (die eigene Blende von Mission 1 liegt darüber). Wenn es sie gibt (`feat/grenzland-zone` nach V19g): `route(true, 'land')`
  beim Aufbruch (der Weg der Simson über die L 3004 auf dem Radar), `route(false)` am Grenzturm; `ort('fremder')` für den Fremden,
  `ort('foto')` als Ziel der Fotos, `punkte('wachen')` für Krähwinkels drei Männer am Bunker (mit ihrer Blickrichtung); `netz(x, y) > 0`,
  bevor die Nachricht des Fremden kommt (in der Heide und am Kolonnenweg Richtung Görsdorf kein Netz). Solange `GLZONE.ort('bunker')`
  nichts liefert (Zone nicht geladen), gilt der Ersatz westlich von Ratscher. `feat/grenzland-zone` 8417ed4dc ist in diesem Zweig.

## Offen

- **Auf dem Zweig, noch nicht auf `src` (V19o)** – 9b8980c56 und dieser Stand, lokal `start,m2,knacken,m1` 42/42 und `direkt` 4/4: Mission 1
  nutzt die Helfer der Zone, wenn es sie gibt – `route(true, 'land')` beim Aufbruch (der Weg der Simson auf dem Radar), `route(false)` am
  Grenzturm, `ort('foto')` als Ziel der Fotos, `ort('fremder')`, `punkte('wachen')` für Krähwinkels drei Männer (mit Blickrichtung),
  `netz(x, y) > 0`, bevor die Nachricht des Fremden kommt; der Plan am Bunker wird neu gerechnet, sobald die Zone gebaut ist. Tests:
  `knacken` repariert (Modus an; Neuladen gegen frischen Start; die Tat am Ereignis) und in `tests.txt`; `m1` holt die Nachricht am
  Parkplatz ab. Der Zweig lässt sich ohne Konflikt mit `src` (V19o) zusammenführen.
- **Als Nächstes:** Mission 3 „Die Nacht am Tor“ (Suhl, Dezember 1989 – die Schnittstelle von Suhl 1989 ist auf `src`); die Zufahrten
  der Zone über die A 73 / L 3004 sind im Browser noch nicht geprüft (Agent `zone`: die Simson springt dort im Test nicht an – „Hinfahren“
  ist der sichere Weg); das Handy im Grünen Band über `GLZONE.netz` (`gl_handy.js`); das Reden mit dem Partner in Kapitel 2.

- Im Grünen Band zeigt das Ortsschild oben links in der Nähe des Museums „Feldflur“ statt des Namens der Zone (Agent `zone`).
- Schnee fällt, aber am Tag bleibt der Boden grün (die Grashalme des Bewuchses liegen über dem Schnee) – Sache des Wetters/Bewuchses.
- Sarah geht neben dem geduckten Spieler aufrecht (die Partnerin duckt sich nicht mit; `gl_partner.js`).
- Von Hand gespielt hat es noch niemand: Fiedlers zweieinhalb Minuten, die Lautstärke der Scheibe (32 m) und des Alarms (60 m) sind nach
  Rechnung eingestellt.
- Die zerbrochene Scheibe zeigt nur Glas am Boden, die Scheibe selbst bleibt sichtbar (ein Riss-Bild auf dem Glas wäre der nächste Schritt).
- Der Kombi von heute steht nach der Mission nicht mehr; Fiedlers Wartburg bekommt er nicht zurück (Kapitel 3).
