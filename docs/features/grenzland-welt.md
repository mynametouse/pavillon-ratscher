# Grenzland, Runde 2 – eine Welt, die einen bemerkt (Hilfs-Agent `welt`, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland2-welt.md` (gemeinsamer Teil `grenzland2-gemeinsam.md`). Branch `feat/grenzland-welt`.
Dateien: `viz3/src/grenzland/gl_fahndung.js`, `gl_logik.js`, `gl_heli.js`, `gl_handy.js`, neu `gl_reaktion.js`, `gl_reaktion_data.js`,
`gl_ereignis.js`; Test `viz3/test/grenzland_welt.py`, Unit-Test `viz3/test/unit/grenzland_welt.test.mjs`, CI-Zeilen
`viz3/extra/grenzland-welt/tests.txt`.

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
- **Der Helm:** hängt am Moped im Garten („Helm mitnehmen“, `GL.inv.helm`); danach setzt der Spieler ihn auf dem Moped von selbst auf (wie
  in GTA), ein roter Jethelm aus `GLFIG.hatOn` auf dem Kopfknochen der Spielfigur. Die Tat „Fahren ohne Helm“ zählt nur noch ohne Helm.
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

## 3. Zeugen filmen, der Feed postet (`gl_reaktion.js`, `gl_handy.js`)

- **Was „wild“ ist:** eine Tat, die jemand gesehen hat (außer „Fahren ohne Helm“ und der Pöbelei), ein Böller, ein Zusammenstoß (das
  Fahrzeug verliert auf einmal mehr als 6,5 m/s), eine Verfolgung mit Blaulicht an Leuten vorbei (ab zwei Sternen, höchstens alle 50 s),
  Vollgas über einen Markt, eine durchbrochene Sperre, ab vier Sternen ein Großeinsatz. Höchstens alle 22 s ein Moment.
- **Wer filmt:** ein bis drei Figuren des Modus im Umkreis von 38 m heben das Handy (`GLFIG.geste(F, 'filmen', { halten: true })` des
  Agenten `figuren`, der Kopf folgt dem Spieler: `GLFIG.blick(F, 'spieler')`), 5–8 s lang; `F.filmt` (Sekunden) ist das Merkmal für
  Tests. Gibt es keine Figur, aber Leute der Basis-Welt, die zusahen, gibt es den Post trotzdem.
- **Das Bild:** im selben Augenblick ein echtes Bild – aus den Augen der nächsten filmenden Figur auf den Spieler (wenn er zu sehen ist:
  im Fahrzeug oder in der Ansicht von hinten), sonst die eigene Sicht. Ein zusätzliches Bild wird sofort gezeichnet (`renderFrame`) und
  im selben Takt gelesen (320 × 180, JPEG, ~15 kB), danach steht die Kamera wieder, wie sie war. Einmal pro Post.
- **Der Post:** ~20 s später im Feed (`GLHANDY.post`), mit Bild, Text im Ton der Gegend („Was ist denn in Ratscher los?? 😳
  #Ratscher“), erfundene Absender, Likes und Kommentare zählen hoch, während man schaut. Großes wird ein LIVE-Post von
  „suedthueringen.live“. Die Bilder bleiben nur im Speicher (höchstens zwölf; der Spielstand behält die Worte). Die eigene Feed-Reaktion
  des Handys auf dasselbe Ereignis bleibt dann weg (ein Post pro Moment). Der Polizeibericht im Radio bleibt, wie er ist.

## 4. Blicke, Sprüche, vier Antworten (`gl_reaktion.js`, `gl_reaktion_data.js`)

- Figuren des Modus in der Nähe schauen den Spieler an, wenn er bei ihnen stehen bleibt (1,2 s, 8 m) oder sie ansieht (12 m, ±12°).
  Nach 2,4 s sagt eine benannte Person etwas (nur im freien Spiel, nie in einer Zwischensequenz, je Person höchstens alle 45 s): zur
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
| Traktorstau | der Erntewagen der Agrargenossenschaft (IFA W 50 – ein Traktormodell gibt es im Modus nicht), 19 km/h, zwei Autos dahinter, die hupen | überholen: der Fahrer tippt sich an die Mütze |
| Kirmes | Kirmesbaum, Bratwurststand „ROSTBRATWURST“, Bank, Wirt, Kirmesbursche und -mädchen, Polka | Rostbratwurst für 3 € |
| Hochzeitskorso | vier Autos mit weißen Schleifen kommen entgegen und hupen | 20 s mitfahren: 10 € vom Brautvater |
| Böller aus dem Kofferraum | ein Kombi, bunte Kisten, der Böller-Mann in Ballonseide | drei Böller für 5 € |
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

## Für den Lead

- **HUD aus `wissen`:** drei Symbole (Gesicht, Kleidung/Jacke, Fahrzeug), an = die Polizei weiß es und es passt noch. Hilfreich als
  Zeile darunter: `stand().beschreibung` (z. B. „Gesucht wird eine Person, männlich, rotes Karohemd, auf einem Moped. Richtung
  Schleusingen.“). Ereignis `grenzland:wissen` `{ wissen, neu?, weg? }` bei jeder Änderung – gut für ein kurzes Aufblinken.
- **Radar:** `cars[i].gesehen` (ohne das Feld: immer zeigen). Ereignis `grenzland:funk` hat jetzt auch `k: 'bild' | 'bild-alt'` und
  `teile`.
- **Von `GLHUD` gebraucht:** `GLHUD.sub` als Warteschlange (der Funksatz ist lang, ~5 s); `body[data-gl-kino]` wird gelesen.
- **Für `stimmen`:** `GLFAHNDUNG.linien()` (Sprecher `funk`, `polizei1`, `polizei2`, `vopo`, `abv`), `GLREAKTION.linien()` (je Sprecher
  dieselben Sätze; Falko und Sarah ihre Antworten), `GLEREIGNIS.linien()`. Die Stimme `gl_funk` meldet das Modul selbst an
  (`STIMME.person`), solange es keine Aufnahme gibt.
- **Radar:** `GLEREIGNIS` meldet eine Quelle an (`GLKARTE.src`): `{ x, y, k: 'ort', name: 'Blitzer' | 'Stau' | 'Kirmes' | 'Korso' |
  'Böller' | 'Reh' }`. Eine eigene Art (z. B. `k: 'ereignis'` mit einem Symbol) wäre schöner – gern im Radar ergänzen.
- **`modules.txt`:** drei Zeilen am Ende des Blocks `# feat/grenzland` (nach `gl_modus.js`): `gl_reaktion_data.js`, `gl_reaktion.js`,
  `gl_ereignis.js`.
- **Ereignisse:** `grenzland:gefilmt`, `grenzland:post`, `grenzland:feedpost`, `grenzland:reaktion`, `grenzland:antwort`,
  `grenzland:ereignis` `{ name, ende? }`, `grenzland:geblitzt`, `grenzland:wildunfall`, `grenzland:kleid`.

## Tests

- `node --test viz3/test/unit/grenzland_welt.test.mjs` – die Regeln des Wissens (7 Tests).
- `python3 viz3/test/grenzland_welt.py 9016 wissen,funk` – im Spiel: Bilder in `out/grenzland_welt/` (`01_warnjacke`, `02_helm`,
  `03_gesehen`).
