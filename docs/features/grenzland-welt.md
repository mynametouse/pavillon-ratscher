# Grenzland, Runde 2 – eine Welt, die einen bemerkt (Hilfs-Agent `welt`, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland2-welt.md` (gemeinsamer Teil `grenzland2-gemeinsam.md`). Branch `feat/grenzland-welt`.
Dateien: `viz3/src/grenzland/gl_fahndung.js`, `gl_logik.js`, `gl_heli.js`, neu `gl_reaktion.js`, `gl_reaktion_data.js`,
`gl_ereignis.js`; Test `viz3/test/grenzland_welt.py`, Unit-Test `viz3/test/unit/grenzland_welt.test.mjs`, CI-Zeilen
`viz3/extra/grenzland-welt/tests.txt`. (`gl_handy.js` gehört seit 13:09 dem Agenten `handy` – meine Änderungen daran sind
zurückgenommen, die Posts gehen über die öffentliche Schnittstelle.)

## 1. Was die Polizei weiß (Gesicht, Kleidung, Fahrzeug)

Wie in den Vorschauen zu GTA 6: Die Polizei kennt nur, was jemand gesehen hat, und ihr Wissen verfällt, wenn sich die Tatsachen ändern.

- **Beschreibung** (`GL.W.bild`, reine Regeln in `GLLOGIK.sicht` / `GLLOGIK.wissen`, ohne Browser getestet): wer (Mann/Frau), Gesicht,
  Kleidung (mit Kopfbedeckung), Fahrzeug, „zu Fuß“, wo und in welche Richtung.
  - Gesicht: nur von nah und im Hellen – tagsüber bis 9 m, nachts bis 4 m (die Taschenlampe im Gesicht); oder ein Zeuge, der Falko und
    Sarah kennt, nennt die Namen. Eine Meldung ohne Abstand (ein Anruf) bringt nie ein Gesicht.
  - Kleidung: tagsüber bis 34 m, nachts bis 15 m. Fahrzeug: bis 70 m, sobald die Streife es eine Sekunde gesehen hat (wie bisher `W.fz`).
  - Zeugen beschreiben, wie der Spieler **zum Zeitpunkt der Tat** aussah und aus welcher Entfernung sie es sahen (die Meldung kommt
    Sekunden später); wer niedergeschlagen wurde, sah das Gesicht.
- **Was davon noch passt** (`GLFAHNDUNG.stand().wissen = { gesicht, kleidung, fahrzeug }`): Helm oder Sturmhaube verdecken das Gesicht,
  solange sie getragen werden, und gehören zur Kleidung; andere Jacke → Kleidung passt nicht mehr; ausgestiegen → Fahrzeug passt nicht
  (wieder aufgestiegen auf dasselbe Moped: passt wieder – das Moped ist bekannt). Neues Kennzeichen → Fahrzeug unbekannt.
- **Wirkung auf die Suche:** Mit Helm erkennt niemand den Spieler beim bloßen Hinsehen (die Sterne bleiben hohl, nur ein Name füllt
  sie); passt nichts mehr von der Beschreibung, läuft die Suche 1,4-mal so schnell aus.
- **Der Helm:** hängt im Carport am Haken („Helm vom Haken nehmen“, `GL.inv.helm`; nicht am Moped selbst – dort steigt der Knopf auf);
  wer ohne ihn losfährt, bekommt einmal den Hinweis, wo er hängt. Danach setzt der Spieler ihn auf dem Moped von selbst auf (wie in
  GTA), ein roter Jethelm aus `GLFIG.hatOn` auf dem Kopfknochen der Spielfigur. Die Tat „Fahren ohne Helm“ zählt nur noch ohne Helm.
- **Die Sturmhaube:** der Böller-Mann gibt beim Kauf eine dazu („Für den Winter. Oder für was auch immer.“, `GL.inv.haube`). Solange
  der Spieler gesucht wird (oder sie trägt), heißt der unterste Aktionsknopf „Sturmhaube aufsetzen / abnehmen“ – jeder andere Knopf in
  der Nähe geht vor (Priorität −3). Sichtbar als dunkle Strickhaube bis zum Hals mit Augenschlitz (ein Netz im Kopf-Rahmen von
  `GLFIG.headOf`, das Material des Verkehrs); verdeckt das Gesicht, ist Kleidung („mit Sturmhaube,“ im Funk), die Leute sagen etwas
  („Ist dir kalt? Es ist September.“).
- **Knöpfe:** „Ansprechen“ hat die kleinste Priorität (0,1) – am Verkaufswagen bleibt „Einkaufen“ vorn.
- **Die Warnjacke:** am Bungalow „Warnjacke anziehen / ausziehen“ (vorher „Umziehen“, nur mit Sternen). Sichtbar über die eigene
  Umfärbung des Spiels (`AVATAR.wear`, wie die Forstkleidung; keine neue Textur, kein neues Shader-Programm). Mit Sternen gilt weiter die
  Regel von vorher (`GLLOGIK.umziehen`: hohle Sterne sind sofort weg, ein Name bleibt ein Name; nicht, wenn jemand zuschaut).
- **Streifenwagen:** `stand().cars[i].gesehen` – dieser Wagen sieht den Spieler gerade oder hat ihn in den letzten 4 s gesehen.

## 2. Der Polizeifunk beschreibt den Spieler

Feste Satzteile nacheinander (`await STIMME.say('gl_funk', teil)` je Teil, damit `stimmen` jeden einzeln aufnehmen kann), der Untertitel
zeigt den ganzen Satz einmal (`GLHUD.sub('Funk', …)`):

„Zentrale an alle Streifen.“ · „Gesucht wird eine Person,“ / „Gesucht wird Falko,“ / „Gesucht wird Sarah,“ (Name nur, wenn bekannt) ·
„männlich,“ / „weiblich,“ · Kleidung („rotes Karohemd,“ – Falko, „dunkle Jacke,“ – Sarah, „orange Warnjacke,“, „helle Jacke,“,
„grüner Parka,“) · „mit Helm,“ / „mit Sturmhaube,“ · Fahrzeug („auf einem Moped.“, „in einem Trabant.“, „in einem Auto.“,
„auf einem Traktor.“, „zu Fuß.“) · Richtung („Richtung Schleusingen.“, „Richtung Ratscher.“, „Richtung Talsperre.“, „Richtung Klinge.“)
oder Ort („Zuletzt gesehen in Ratscher.“ …) · „Kommen.“

- Wann: bei einer neuen Fahndungsstufe (nach dem Satz „Rennsteig für Schleuse 12 …“), wenn die Beschreibung wächst (höchstens alle 20 s),
  und wenn der Spieler sich verändert hat – dann mit der **alten** Beschreibung: „Weiterhin gesucht wird eine Person, … rotes Karohemd …“
  (höchstens alle 15 s; aufgeschoben, nicht verworfen). Nie in einer Zwischensequenz (`body[data-gl-kino="1"]`).
- Die bisherigen Funksprüche (Rennsteig/Schleuse) werden jetzt auch mit `gl_funk` gesprochen.
- `GLFAHNDUNG.linien()` liefert alle Sätze als `[wer, text]` (Funk, dazu „Halt! Polizei!“ usw. der Beamten).

## 3. Zeugen filmen, der Feed postet (`gl_reaktion.js`)

- **Was „wild“ ist:** eine Tat, die jemand gesehen hat (außer „Fahren ohne Helm“ und der Pöbelei), ein Böller, ein Zusammenstoß (das
  Fahrzeug verliert auf einmal mehr als 6,5 m/s), eine Verfolgung mit Blaulicht an Leuten vorbei (ab zwei Sternen, höchstens alle 50 s),
  Vollgas über einen Markt, eine durchbrochene Sperre, ab vier Sternen ein Großeinsatz. Höchstens alle 22 s ein Moment.
- **Wer filmt:** (nur im freien Spiel – in einer Mission oder Szene bleiben die Leute der Geschichte bei ihrer Rolle, der Post kommt
  trotzdem) ein bis drei Figuren des Modus im Umkreis von 38 m heben das Handy (`GLFIG.geste(F, 'filmen', { halten: true })` des
  Agenten `figuren`, der Kopf folgt dem Spieler: `GLFIG.blick(F, 'spieler')`), 5–8 s lang; `F.filmt` (Sekunden) ist das Merkmal für
  Tests. Gibt es keine Figur, aber Leute der Basis-Welt, die zusahen, gibt es den Post trotzdem.
- **Das Bild:** im selben Augenblick ein echtes Bild – aus den Augen der nächsten filmenden Figur auf den Spieler (wenn er zu sehen ist:
  im Fahrzeug oder in der Ansicht von hinten), sonst die eigene Sicht. Ein zusätzliches Bild wird sofort gezeichnet (`renderFrame`) und
  im selben Takt gelesen (320 × 180, JPEG, ~15 kB), danach steht die Kamera wieder, wie sie war. Einmal pro Post.
- **Der Post:** ~20 s später im Feed über die öffentliche Schnittstelle des Handys:
  `GLHANDY.feed(wer, text, '', { img, live, likes, kom })` – `img` ein Bild als Data-URL (~15 kB), `live` ein großes Ereignis (der Text
  beginnt dann auch mit „LIVE: “, das zeigt schon das alte Handy als Abzeichen), `likes` eine Zahl zum Hochzählen, `kom` zwei bis vier
  Kommentare `[[wer, text], …]`. Das Handy (Agent `handy`) zeigt Bild, Likes und Kommentare. Text im Ton der Gegend („Was ist denn in
  Ratscher los?? 😳 #Ratscher“), erfundene Absender; Großes ist ein LIVE-Post von „suedthueringen.live“. `GLREAKTION.gepostet` hält die
  letzten zwölf Posts mit Bild (für Tests). Der Polizeibericht im Radio bleibt, wie er ist.

- **Fahndungsaufruf:** ab zwei Sternen postet die (erfundene) Blaulicht-Seite „blaulicht_schleusetal“ einmal je Fahndung die aktuelle
  Beschreibung der Polizei: „🚨 Fahndung bei Ratscher: Gesucht wird eine Person, männlich, rotes Karohemd, … Hinweise bitte an die
  Polizei. Teilen erwünscht!“ – mit dem letzten Bild, wenn eins da ist.

## 4. Blicke, Sprüche, vier Antworten (`gl_reaktion.js`, `gl_reaktion_data.js`)

- Figuren des Modus in der Nähe schauen den Spieler an, wenn er bei ihnen stehen bleibt (1,2 s, 8 m) oder sie ansieht (12 m, ±12°) –
  nur im freien Spiel (in Missionen und Szenen bestimmt `kino`, wohin jemand schaut; beim Wechsel lassen alle Blicke los).
  Nach 2,4 s sagt eine benannte Person etwas (je Person höchstens alle 45 s): zur
  Kleidung (Karohemd, Warnjacke, Helm), zum Fahrzeug („Eine Simson! Die läuft ja noch.“), zu einer Tat eben, dass er gesucht wird.
- **Ansprechen** (Aktionsknopf bei einer benannten Person, die steht): „Grüßen · Sprüche klopfen · Beruhigen · Provozieren“ im Auswahlfeld
  des Modus (`GLHUD.wahl`), Tasten 1–4 oder Tippen.
  - Grüßen: freundliche Antwort; wer vorher Sprüche bekam, ist beleidigt („Ach, du schon wieder. Der mit den Sprüchen.“).
  - Sprüche klopfen: Konter; die Person merkt es sich.
  - Beruhigen: ein Anruf dieser Person bei der Polizei wird abgebrochen, eine laufende Suche läuft schneller aus (+10 s).
  - Provozieren: die Person greift zum Telefon (`GLFIG.geste(F, 'telefon')`) – eine Meldung „Pöbelei“, in ein paar Sekunden ein Stern,
    außer man redet sie noch rechtzeitig um (der vorhandene Knopf „Mit … reden“). Danach redet sie nicht mehr mit einem.
- Wer spricht: die Verkäuferin am Verkaufswagen, Gerhard, die Clique, Yuki – und die Leute der Ereignisse. Alle Sätze sind feste Texte;
  `GLREAKTION.linien()` gibt sie je Sprecher (für `stimmen`), dazu die Antworten von Falko und Sarah.

## 5. Ereignisse unterwegs (`gl_ereignis.js`)

Eins zur Zeit, nur im freien Spiel heute (nie während einer Mission, nie 1989), alle 2½–5 Minuten Fahrt, jedes dort, wo es passt, keins
zweimal in einer Viertelstunde (`GLLOGIK.plan`, ohne Browser getestet). Jedes zeigt beim Start Titel und Untertitel (`GLHUD.ort`), hat einen
Punkt auf dem Radar (`GLKARTE.src`, Art `ort`) und wird weggeräumt, wenn es vorbei ist oder der Spieler 20 s weiter als 650 m weg ist.

| Ereignis | Was | Folge |
|---|---|---|
| Blitzer | ein Kombi am Straßenrand, die Kamera auf dem Stativ daneben | schneller als 50 km/h: weißer Blitz, eine Minute später der Brief im Handy, 30 € |
| Traktorstau | ein roter Traktor nach Art des Fortschritt ZT 300 mit Strohballen-Hänger (hier aus dem Bausatz gebaut, fährt auf der Linie der Straße, fest für Fahrzeug und Fußgänger), 19 km/h, zwei Autos dahinter, die hupen | überholen: der Fahrer tippt sich an die Mütze |
| Kirmes | auf einem freien Platz am Anger (abseits der Straßen, 9 m frei von Mauern und Stämmen, 18 m weg von der Linde): Kirmesbaum (geschälter Stamm mit grüner Spitze, Kranz, bunte Bänder), Bratwurststand „ROSTBRATWURST“ (zum Spieler gedreht), Bank, Wirt, Kirmesbursche und -mädchen, Polka (nicht über dem Autoradio) | Rostbratwurst für 3 € |
| Hochzeitskorso | vier Autos mit Bändern von den Spiegeln zur Schleife auf der Motorhaube (mit Sträußchen; weiß auf dunklen, rosa auf hellen Autos), am Brautauto hinten „FRISCH VERHEIRATET“ und Blechdosen an Schnüren; sie kommen entgegen und hupen | 20 s mitfahren: 10 € vom Brautvater |
| Böller aus dem Kofferraum | ein Kombi mit offenem Kofferraum, bunte Kisten auf dem Gehweg, der Böller-Mann in Ballonseide | drei Böller für 5 € |
| Wildwechsel | in der Dämmerung springt ein Reh über die Landstraße | gebremst oder „Rums!“ – das Reh läuft davon, niemandem passiert etwas |

Die Leute der Ereignisse (Böller-Mann, Bratwurst-Uwe, Kirmesbursche, Kirmesmädchen) und ihre Kleider werden beim Laden in `GLDATA.CAST`
und `GLDATA.KLEID` ergänzt (nur wenn es die Schlüssel nicht gibt); `GLEREIGNIS.linien()` gibt ihre Sätze.
`GLEREIGNIS.debug.start(name)` startet eins beim Spieler (Tests), `GLEREIGNIS.debug.info()` sagt, was davon steht.

## Entscheidungen

- Falko trägt im Modell ein rot kariertes Hemd (Bilder), Sarah eine dunkle Jacke – daher „rotes Karohemd“ und „dunkle Jacke“.
- Eine Sturmhaube gibt es noch nicht zu kaufen (kein Modell); die Wörter sind im Funk und in `linien()`, `GLFAHNDUNG.haube = true` reicht.
- Der Helm ist ein Ding im Rucksack, aufgesetzt wird er nur auf dem Moped – so wechselt die Beschreibung beim Auf- und Absteigen von
  selbst, und wer unbeobachtet absteigt, passt nicht mehr zur Beschreibung.

- Polizisten zu Fuß **rennen**, wenn sie hinter dem Spieler her sind (`GLFIG.go(F, ziel, { renn: true, v: ≥ 3,2 m/s })` – sobald die
  Figuren von Runde 2 da sind; vorher gehen sie wie bisher). Wer selbst rennt (4,75 m/s), entkommt weiter.
- „Pöbelei“ ist eine eigene kleine Tat (0,5 Hitze, ein Stern, beredbar); sie wird von `gl_reaktion.js` beim Laden in `GLLOGIK.CRIMES`
  eingetragen, damit der Unit-Test der Polizei (er zählt die beredbaren Taten) unverändert bleibt.

## Offen

- Leute der Basis-Welt (Dorfbewohner, Fußgänger des Verkehrs) zählen als Zeugen für einen Post, heben aber kein Handy – dafür hat nur
  `GLFIG` Gesten.
- Die Gesten (`filmen`, `telefon`, `nicken`) und das Rennen der Beamten wirken erst mit den Figuren von Runde 2 (`feat/grenzland-figuren`);
  ohne sie bleibt es beim Hinwenden und schnellem Gehen.
- Die Kirmes gibt es nur in Ratscher; der Hochzeitskorso kommt nach dem Plan nur in Schleusingen (mit `debug.start` überall).
- Stimmen: bis `stimmen` aufnimmt, spricht die Gerätestimme (wenn Vorlesen an ist) – die Sätze sind alle feste Texte.

## Für den Lead

- **HUD aus `wissen`:** drei Symbole (Gesicht, Kleidung/Jacke, Fahrzeug), an = die Polizei weiß es und es passt noch. Hilfreich als
  Zeile darunter: `stand().beschreibung` (z. B. „Gesucht wird eine Person, männlich, rotes Karohemd, auf einem Moped. Richtung
  Schleusingen.“). Ereignis `grenzland:wissen` `{ wissen, neu?, weg? }` bei jeder Änderung – gut für ein kurzes Aufblinken.
- `wissen.fahrzeug` ist nur an, solange der Spieler im bekannten Fahrzeug sitzt; dass die Polizei das Moped überhaupt kennt (auch wenn
  er zu Fuß ist), sagt weiter `stand().fz` – falls das Symbol zu Fuß gedimmt statt aus sein soll.
- **Radar:** `cars[i].gesehen` und `cops[i].gesehen` (ohne das Feld: immer zeigen). Ereignis `grenzland:funk` hat jetzt auch `k: 'bild' | 'bild-alt'` und
  `teile`.
- **Von `GLHUD` gebraucht:** `GLHUD.sub` als Warteschlange (der Funksatz ist lang, ~5 s); `body[data-gl-kino]` wird gelesen.
- **Für `stimmen`:** `GLFAHNDUNG.linien()` (Sprecher `funk`, `polizei1`, `polizei2`, `vopo`, `abv`), `GLREAKTION.linien()` (je Sprecher
  dieselben Sätze; Falko und Sarah ihre Antworten), `GLEREIGNIS.linien()`. Die Stimme `gl_funk` meldet das Modul selbst an
  (`STIMME.person`), solange es keine Aufnahme gibt.
- **Radar:** `GLEREIGNIS` meldet eine Quelle an (`GLKARTE.src`): `{ x, y, k: 'ereignis', name: 'Blitzer' | 'Traktor' | 'Kirmes' |
  'Korso' | 'Böller' | 'Reh' }` – das eigene Zeichen dafür kommt vom Lead (13:58).
- **Wünsche der anderen umgesetzt:** das geborgte blaue Licht der Streife pulst im Takt von `GLAUTO.blauPuls` (`licht`; Farbe 0x2a5cff
  bleibt, Reichweite 12 m, Abfall 2); die Gerätestimme der Zentrale (`gl_funk`) ist eine Frau wie die Aufnahmen (`stimmen`).
- **`modules.txt`:** drei Zeilen am Ende des Blocks `# feat/grenzland` (nach `gl_modus.js`): `gl_reaktion_data.js`, `gl_reaktion.js`,
  `gl_ereignis.js`.
- **Daten zur Laufzeit ergänzt** (damit eure Dateien unberührt bleiben): `GLDATA.CAST` + `GLDATA.KLEID` um die Leute der Ereignisse
  (`boellermann`, `wirt`, `bursche`, `maedchen`; Kleider `el_*`), `GLLOGIK.CRIMES.poebeln`. Gern fest in `gl_data.js` übernehmen; für
  `poebeln` müsste dann die Liste der beredbaren Taten im Unit-Test der Polizei (`grenzland_polizei.test.mjs`) mit.
- **`GLHUD.ort(titel, sub, 4)`** zeigt den Titel eines Ereignisses (wie GTAs „Zufallsereignis“); wenn ihr dafür lieber `GLHUD.titel`
  nehmt, ist es eine Zeile in `gl_ereignis.js` (`start`).
- **Ereignisse:** `grenzland:gefilmt`, `grenzland:post`, `grenzland:feedpost`, `grenzland:reaktion`, `grenzland:antwort`,
  `grenzland:ereignis` `{ name, ende? }`, `grenzland:geblitzt`, `grenzland:wildunfall`, `grenzland:kleid`.

- **Für den Agenten `handy` (Fehler im alten Handy, gefunden an meinen Bildern):** Der Inhaltsbereich des Handys hat die Klasse `.hb`,
  die auch die Kopfleisten-Knöpfe des Spiels haben (`viz3/shell/css/hud.css`: `.hb{display:flex;align-items:center;border-radius:999px;
  cursor:pointer;…}`). Dadurch stehen alle Einträge (Feed, Nachrichten, Chat) **nebeneinander** statt untereinander. Abhilfe, die ich
  hatte: `#glhandy .hb{display:block;gap:0;cursor:auto;backdrop-filter:none;border:0;font:inherit;color:inherit;…}` (oder eine andere
  Klasse). Und: die eigene Feed-Reaktion des Handys auf Böller/Streife/Sperre (`FEEDEV`) doppelt sich mit einem gefilmten Post – gern
  weglassen, wenn kurz vorher ein Post mit `img` kam.

## Tests

- `node --test viz3/test/unit/grenzland_welt.test.mjs` – die Regeln des Wissens und der Plan der Ereignisse (8 Tests).
- `python3 viz3/test/grenzland_welt.py 9016 wissen,funk` · `film,wahl` · `ereignis` – im Spiel (je eine Zeile in
  `viz3/extra/grenzland-welt/tests.txt`, also drei Jobs auf GitHub Actions). Bilder in `out/grenzland_welt/`: `01_warnjacke`, `01b_haube`,
  `02_helm`, `03_gesehen(_hud)`, `04_filmt(_hud)`, `05_feed` (der Post im Handy; das Bild zeigt erst das neue Handy), `06_wahl(_hud)`,
  `10_blitzer` … `15_wildunfall`.
- Verlauf: 12:46 (9aed1bb4) der Korso fand keine Strecke – behoben; afcfff67 alles grün (19 + 15 + 30); nach Merge 1 (250a60b3) auf
  dem zusammengeführten Stand hier 64/64 (14:13). Zwei Fehler, die erst mit den anderen sichtbar wurden: der Fahndungsaufruf hing an den
  *gezeigten* Sternen (einer weniger, solange Falko und Sarah getrennt sind) – jetzt an der Stufe selbst; und mit dem Rennen der Figuren
  holte der ABV von 1989 den Spieler ein, bevor der Test den Wartburg der Volkspolizei sah – gerannt wird jetzt nur von der Polizei von
  heute.
