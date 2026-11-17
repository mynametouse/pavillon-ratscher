# Grenzland: Das Dorf redet über euch, Nebenjobs (Hilfs-Agent `ruf`, 17.11.2026)

Auftrag: `docs/plans/auftraege/grenzland4-ruf.md` (gemeinsamer Teil `grenzland4-gemeinsam.md`, seit ~14:15 auch
`realismus1-gemeinsam.md`). Branch `feat/grenzland-ruf`. Falko, 17.11. 12:26: **„Das Dorf redet über euch“** – „Leute grüßen, tuscheln
oder rufen die Polizei – je nach euren Taten; Gerüchte im Gasthaus und im Dorf-Chat.“ – und **„Nebenjobs“** – „Brennholz fahren, Brötchen
ausliefern, bei der Feuerwehr helfen – kleines Geld und guter Ruf.“ Dazu (13:27, über den Lead): Realismus zuerst, ein paar kleine,
lustige, glaubwürdige Nebenaufgaben in Ratscher und Schleusingen.

Dateien (`viz3/src/grenzland/`): neu `gl_ruf_data.js` (`GLRUFDATA`, rein), `gl_ruf.js` (`GLRUF`), `gl_jobs_data.js` (`GLJOBSDATA`, rein),
`gl_jobs.js` (`GLJOBS`); übernommen `gl_reaktion.js`, `gl_reaktion_data.js`, `gl_handy.js`. Tests `viz3/test/grenzland_ruf.py`
(`:ruf`, `:jobs`), `viz3/test/unit/grenzland_ruf.test.mjs`, CI-Zeilen `viz3/extra/grenzland-ruf/tests.txt`.

## 1 Der Ruf (`GLRUF`)

- **Ein Wert je Ort**, `ratscher` und `schleusingen`, von −100 bis +100, gespeichert unter eigenem Schlüssel `pav-gl-ruf-v1` (strenge
  Prüfung beim Laden). Ein neues Spiel beginnt bei 0, „Beenden“ behält die Werte, ein neu geladener Stand macht weiter.
- **Taten, die jemand gesehen hat** (`grenzland:tat` mit Zeugen): die Tat kostet den Ort, wo sie geschah (Schleusingen: 750 m um den
  Markt; alles andere – Dorf, Talsperre, Klinge, Feldscheune – ist Ratscher). Ganz, wenn man weiß, wer es war (ein Zeuge, der Falko und Sarah
  kennt, oder die Polizei kennt den Namen), halb, wenn nur eine Beschreibung da ist; der andere Ort hört ein Drittel davon. Kosten:
  Einbruch 18, Fahrzeugdiebstahl 15, Körperverletzung 12, Widerstand 10, Sperre 8, Hausfriedensbruch 7, Rempelei und Flucht 5,
  Böller und Pöbelei 4, Raserei 3, Angeln ohne Karte 2, ohne Helm nichts. Festnahme vor allen Leuten: −6.
- **Ein Zeuge, den man umgestimmt hat**, gibt die Hälfte zurück. Die vier Antworten zählen ein wenig: Grüßen +0,5 (einmal am Tag je
  Person), Beruhigen +1, Sprüche −1, Provozieren −3.
- **Gute Taten** über `GLRUF.add(ort, n, grund)`: Nebenjobs (`job:<id>`), Nebenaufgaben (`aufgabe:<id>`), Hilfe auf der Straße
  (`hilfe`, Agent `strasse`), ein Fest (`fest`, Agent `alltag`), die drei Entscheidungen von Kapitel 2 (`entscheidung:<id>`).
- **Vergessen:** je Spieltag 6 Punkte zurück zur 0 (nie darüber hinaus).
- **Stufen:** beliebt ab 30, neutral ab −20, misstrauisch ab −55, darunter verhasst – mit 4 Punkten Spielraum an jeder Grenze, damit nichts
  flackert. Ein Wechsel steht klein unter dem Radar („Ruf in Ratscher: misstrauisch – Es wird getuschelt.“, `GLHUD.ort`) und geht als
  `grenzland:ruf` hinaus.

## 2 Was die Leute tun (`gl_reaktion.js`, kein zweites System)

Je nach Stufe des Ortes, an dem die Person steht:

- **beliebt:** winkt, wenn sie einen sieht; freundliche Sätze („Grüß dich! Danke noch mal für neulich.“); Grüßen wird herzlich beantwortet.
- **misstrauisch:** tuschelt (der Untertitel zeigt „(leise)“) und zeigt auf einen („Das ist doch der vom Garten. Pass auf deine Tasche
  auf.“); Grüßen: „Hm. Ja. Guten Tag auch.“
- **verhasst:** winkt ab und dreht sich weg, filmt („Lächeln! Das kommt ins Netz.“ – mit Post im Feed) oder **ruft die Polizei**
  („Ich ruf jetzt die Polizei …“): eine Meldung `verdacht` (wie die Pöbelei klein und beredbar: „Mit … reden“ oder Beruhigen hält sie auf),
  sonst ein Stern; höchstens alle 150 s.
- **Gerede an Plätzen:** am Verkaufswagen, an der Feldscheune und dort, wo die Leute von `alltag` stehen (Gasthaus, Linde, Laden, Fest),
  erzählt eine Person, was im Dorf geredet wird – in festen Satzteilen hintereinander (jedes Teil wird einzeln aufgenommen):
  „Weißt du das Neueste?“ · „Der Falko hat“ · „an der Linde“ · „Böller geworfen.“ · „Ach, du bist ja einer von denen.“ Jede Person
  erzählt jedes Thema nur einmal; Themen gelten einen Spieltag.

## 3 Gerede im Dorf-Chat und im Feed (über `GLHANDY`)

- 40–80 s nach einer gesehenen Tat ein Satz im Dorf-Chat „Ratscher aktuell“ (die erfundenen Dorfbewohner, trocken wie der übrige Chat):
  „Das mit dem Böller an der Linde war übrigens Falko. Hat man mir gesagt.“ Weiß niemand, wer es war, sagen sie, was die Zeugen sahen
  („einer im roten Karohemd“). Höchstens alle 50 s eine Zeile; die bisherigen Sofort-Reaktionen des Chats bleiben.
- Große Taten (ab 8 Punkten) und eine Festnahme bringen dazu einen Post im Feed; ein Stufenwechsel einen Satz im Chat („Ich schließe jetzt
  immer ab. Seit die zwei vom Garten da sind.“), gute Taten einen Dank.

## 4 Nebenjobs und Nebenaufgaben (`GLJOBS`, `GLJOBSDATA`)

Angebote kommen als SMS von dem, der fragt, zu einer passenden Stunde, eins nach dem anderen (frühestens 20 s nach Beginn des freien
Spiels, nie während einer Mission oder einer Szene); jedes steht danach im Tagebuch (J) mit „wann“ und „wo“ und – sobald der erste Job
läuft – im Handy unter **„Aufträge“** (dort mit dem Ruf beider Orte, Wegpunkt per Tipp, „Bis zum Beginn warten“ als Zeitraffer,
„Auftrag abbrechen“). Ein Job beginnt an seinem Ort mit dem Aktionsknopf; ein Job zur Zeit; eine beginnende Mission bricht ihn ab;
1989 gibt es keine. Lohn über `GL.earn` (der Auftrag nannte `GL.pay`, das zieht Geld ab – Lohn ist `earn`), Ruf über `GLRUF.add`,
dazu ein Thema fürs Gerede (`GLRUF.merke`). Jeder Job und jede Aufgabe hat ein Feld `hinweis` für Kapitel 2 (noch leer).

| Job | wann, wo | wie | Lohn, Ruf |
|---|---|---|---|
| **Brötchen ausliefern** (Backstube Schleusetal, erfunden) | Mo–Sa, Kiste ab 5:30 am Verkaufswagen, alles hängt bis 7:30 | Kiste nehmen (sie fährt auf dem Gepäckträger der Simson mit), sechs Tüten an sechs Türen der Dorfbewohner (die Häuser aus `dorf/dorf_life.js`; Uwe fährt sonst, er muss aufs Feld); die Uhr läuft dabei in Echtzeit; ein harter Stoß zerdrückt eine Tüte | 12 € + bis 8 € Trinkgeld (voll bis 5 min, nichts ab 12 min), −2 € je zerdrückte Tüte und eine Beschwerde per SMS; Ruf +5 (+1 schnell und heil) |
| **Brennholz fahren** (Wolfgang, Waldarbeiter) | Mo–Sa 8–17 Uhr, Stapel gespaltener Buche am Waldweg zur Klinge | mit dem Kombi (Laderaum von `vehicles/car.js`): heranfahren, „Holz einladen“ (gehalten, die Scheite liegen im Kofferraum), zu Gerhard, „Holz abladen“ (ein Stapel neben der Tür), noch einmal für Katrin | 20 € je Fuhre, Ruf +3 je Fuhre |
| **Übung der Feuerwehr** (Manfred ist beim Kreisfeuerwehrtag, Löschmeister Steffen und Maschinistin Anja – erfunden – leiten) | Samstag 8:40–9:30 an der alten Schule (dem Feuerwehrhaus) | Faltbehälter, Tragkraftspritze, Ziel mit Fallklappe, Bierzeltgarnitur; Saugschlauch kuppeln, Pumpe anwerfen, mit dem Schlauch zur Markierung laufen (die Leitung rollt sich hinter einem ab), „Wasser marsch!“ – auf Zeit; danach Kaffee und Kuchen am Tisch | 10 € aus der Kameradschaftskasse („für den Sprit“), Ruf +8; Steffen sagt etwas zur Zeit |

Nebenaufgaben (laufen ab der SMS, höchstens eine neue alle 5 Minuten):

- **Die gelbe Tonne** (Ingrid, Ortsteilbürgermeisterin, bis morgen in Erfurt): ihre Tonne vom Haus an die Straße stellen – Griff und Deckel
  zur Straße. Ruf +2.
- **Das Paket beim Nachbarn** (Katrin): der Paketbote hat es wieder bei Gerhard abgegeben – abholen, ihr vor die Tür legen. Ruf +2.
- **Milchreis für Gerhard**: ein Päckchen am Verkaufswagen kaufen (dessen Öffnungszeiten), Gerhard bringen – das Geld zurück und 1888 die
  Linde als Geschichte obendrauf. +4 €, Ruf +3.
- **Fotos für das Stadtarchiv** (Gerhard): die Mappe abholen und im Rathaus Schleusingen abgeben – nur zu den Öffnungszeiten (aus
  `OEFFNUNG` des Agenten `laeden-leben`, sonst Mo–Fr 9–12, Di 13–18, Do 13–16 Uhr); am Schalter in der Halle, sobald die Stadt steht.
  Ruf Schleusingen +3, Ratscher +1.

## 5 Schnittstelle

`GLRUF.wert(ort)` → −100 … +100 · `GLRUF.stufe(ort)` → `'beliebt' | 'neutral' | 'misstrauisch' | 'verhasst'` (ohne `ort`: wo der
Spieler ist) · `GLRUF.add(ort, n, grund)` → die Änderung · `GLRUF.ortVon(x, y)` · `GLRUF.merke(gruppe, ort, o)` (ein Thema fürs Gerede) ·
`GLRUF.gerede(id)` / `erzaehlt(id, thema)` · `GLRUF.platz(x, y)` · `GLRUF.tick(dt)` · `GLRUF.stop()` · `GLRUF.dazu({ tick, stop })` ·
`GLRUF.linien()` · `GLRUF.debug` (`set`, `flush`, `info`, `gespeichert`). Ereignis `grenzland:ruf { ort, wert, stufe, alt, n, grund }`.
`GLREAKTION.stufeBei(F)`, `GLREAKTION.ruft(F)` (neu).

`GLJOBS.angebote()` → `[{ id, titel, art: 'job' | 'aufgabe', von, text, wann, ort, st, jetzt, ziel }]` · `GLJOBS.start(id)` ·
`GLJOBS.warten(id)` · `GLJOBS.abbrechen()` · `GLJOBS.aktiv()` · `GLJOBS.tick(dt)` / `stop()` (über `GLRUF.dazu`) · `GLJOBS.linien()` ·
`GLJOBS.debug` (`angebot`, `go`, `info`, `strahl`, `haus`, `strasse`, …). Ereignis `grenzland:job { id, st: 'angeboten' | 'läuft' |
'erledigt' | 'abgebrochen', lohn, ruf }`. Gespeichert unter `pav-gl-jobs-v1`: was angeboten und erledigt ist, die Nebenaufgaben; ein
laufender Job nicht (nach dem Neuladen wird er wieder angeboten).

## Tests

- `node --test viz3/test/unit/grenzland_ruf.test.mjs` – Stufen mit Spielraum, Kosten der Taten, Vergessen, Orte, Satzteile (alle in
  `linien()`), Chatzeilen (mit Name und mit Beschreibung lesbar, nie Hubert oder Ronald).
- `python3 viz3/test/grenzland_ruf.py 9042 ruf` (21 Prüfungen, hier grün 17.11. 13:58): Böller vor einem, der Falko kennt → Ratscher −4,
  Schleusingen −1,2, Ereignis, Speicher; Chatzeile; Verkäuferin am Wagen erzählt in Satzteilen; misstrauisch: Gerhard tuschelt und
  zeigt; beliebt: winkt, Grüßen herzlich (+0,5); verhasst: Anruf, Stern; einen Tag später 6 Punkte vergessen; `add` für Jobs und
  Entscheidungen; nach „Beenden“ ändert sich nichts mehr. Bilder `out/grenzland_ruf/01_chat_nach_tat`, `02_gerede_am_wagen`,
  `03_stufe_hud`, `04_tuscheln_anger`, `05_beliebt_winken`, `06_verhasst_polizei`.

- `python3 viz3/test/grenzland_ruf.py 9042 jobs`: Angebote per SMS (Freitagabend: Feuerwehr, Brötchen), Liste mit „wann“, Tagebuch;
  Brötchen am Samstag 5:45 (Kiste am Wagen, auf dem Gepäckträger, eine zerdrückte Tüte, sechs Türen, Lohn mit Trinkgeld und Abzug,
  Beschwerde-SMS); Feuerwehr am Samstag 8:55 (zwei Freiwillige, Becken, Pumpe, Ziel, Tisch; Saugschlauch, Pumpe, Schlauchleitung bis zur
  Markierung, Wasser marsch, Kaffee und Kuchen, 10 €); Brennholz (Stapel, Kombi, zwei Fuhren, 40 €); Nebenaufgaben (Tonne, Krümel,
  Paket, Milchreis, Fotomappe mit Öffnungszeiten); „Aufträge“ im Handy; nach „Beenden“ bleibt nichts liegen. Bilder
  `out/grenzland_ruf/10_broetchen_moped` … `21_hund_leine`.

## Entscheidungen

- Der Ruf hängt am Ort der Tat, nicht an der Person (Falko und Sarah zählen gemeinsam – das Dorf redet über „die zwei vom Garten“).
- Die Stufe „verhasst“ ruft die Polizei nur, wenn eine benannte Person einen eine Weile ansieht – nicht im Vorbeifahren.
- 1989 gibt es keinen Ruf (eine andere Zeit, ein anderes Dorf); nichts davon läuft vor dem Start des Modus.

## Für den Lead

- **`gl_modus.js`:** zwei Zeilen sind drin (markiert `// grenzland-ruf`): `if (window.GLRUF) window.GLRUF.tick(dt);` nach
  `GLUMGEBUNG.tick(dt)` und `if (window.GLRUF) window.GLRUF.stop();` nach `GLUMGEBUNG.stop()`. `GLRUF.tick` führt auch `GLJOBS.tick` aus
  (`GLRUF.dazu`) – eine Zeile für beide Module.
- **`modules.txt`:** `gl_ruf_data.js`, `gl_ruf.js` (und `gl_jobs_data.js`, `gl_jobs.js`) direkt nach `gl_modus.js`, vor
  `gl_reaktion_data.js` – `gl_reaktion.js` importiert `GLRUF`.
- **`alltag`:** eure Leute lesen `GLRUF.stufe(ort)` (Fallback `'neutral'`). Wo eure Leute stehen und reden (Gasthaus, Linde, Laden, Fest),
  erzählen sie das Gerede, wenn ihr `GLALLTAG.leute()` mit `ort`/`tun` wie „gasthaus“, „linde“, „laden“, „fest“ liefert und die Figuren
  benannte Leute in `GLREAKTION.REDNER` sind (oder ihr ruft `GLRUF.gerede(id)` selbst und sprecht `GLRUFDATA.spruch(...)`). Ein Fest:
  `GLRUF.add(ort, 2, 'fest')`.
- **`strasse`:** eine gute Tat bei einer Begegnung: `window.GLRUF && GLRUF.add(GLRUF.ortVon(x, y), 4, 'hilfe')`; fürs Gerede dazu
  `GLRUF.merke('hilfe', ort)`.
- **Stimmen:** `GLRUF.linien()` (Gerede und Stufensätze für jeden Sprecher in `GLREAKTION.REDNER`) und `GLJOBS.linien()` (die Feuerwehr:
  Sprecher `fw_steffen`, `fw_anja` – ihre Gerätestimmen meldet `gl_jobs.js` selbst an).
- **Zur Laufzeit ergänzt** (wie es `welt` mit den Leuten der Ereignisse macht): `GLDATA.CAST.fw_steffen`, `GLDATA.CAST.fw_anja`,
  `GLDATA.KLEID.fw_einsatz` (dunkelblaue Einsatzkleidung mit gelb-silbernen Streifen), `GLLOGIK.CRIMES.verdacht` (0,5, beredbar),
  `TKOERPER.PLANS.gl_kruemel` (Heikes Hund: der Hund des Tier-Baukastens mit eigenem braun-weißem Fell, 0,68-fach). Gern fest übernehmen.
- **Handy „Aufträge“:** bleibt gesperrt („Kommt mit Kapitel 2.“), bis der erste Job beginnt – so bleibt der Test `handy` (er prüft die
  Sperre) grün; danach listet die App Jobs und Nebenaufgaben mit dem Ruf beider Orte.
- **Uhr:** solange ein Job mit Zeitdruck läuft (Brötchen ab der Kiste, Feuerwehr ab der Begrüßung), läuft die Spieluhr in Echtzeit
  (`CLOCK.focus('gl-jobs')`); „Bis zum Beginn warten“ ist der Zeitraffer der Uhr (`CLOCK.wait`).
- **Tagebuch:** Quelle `grenzland-jobs` (Ordnung 6); ein laufender Job wird verfolgt (`QUESTS.track = 'grenzland-jobs:<id>'`) und beim
  Ende zurückgestellt – `GRENZLAND.stop` stellt nur `grenzland:`-Einträge zurück, darum macht `GLJOBS.stop` das selbst.
- **`tests.txt`:** enthält vorübergehend `grenzland_welt:film,wahl`, `handy`, `grenzland_radio` (die Tests der übernommenen Dateien,
  einmal auf meinem Zweig auf Actions) – vor dem Zusammenführen wieder heraus; wenn sie beim Zusammenführen noch drin sind: streichen
  (sie stehen schon in ihren eigenen `tests.txt`).
- **Lohn:** der Auftrag nennt `GL.pay`; das zieht Geld ab – Lohn geht über `GL.earn(n, wer)` (Bank-Buchung im Handy mit Absender).
- `src` 2e33dec02 (Klang-Archiv nur vom eigenen Ursprung) ist in meinen Zweig gemergt (kein Rebase, damit kein Force-Push nötig ist).
