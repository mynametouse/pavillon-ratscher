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

## 4 Schnittstelle

`GLRUF.wert(ort)` → −100 … +100 · `GLRUF.stufe(ort)` → `'beliebt' | 'neutral' | 'misstrauisch' | 'verhasst'` (ohne `ort`: wo der
Spieler ist) · `GLRUF.add(ort, n, grund)` → die Änderung · `GLRUF.ortVon(x, y)` · `GLRUF.merke(gruppe, ort, o)` (ein Thema fürs Gerede) ·
`GLRUF.gerede(id)` / `erzaehlt(id, thema)` · `GLRUF.platz(x, y)` · `GLRUF.tick(dt)` · `GLRUF.stop()` · `GLRUF.dazu({ tick, stop })` ·
`GLRUF.linien()` · `GLRUF.debug` (`set`, `flush`, `info`, `gespeichert`). Ereignis `grenzland:ruf { ort, wert, stufe, alt, n, grund }`.
`GLREAKTION.stufeBei(F)`, `GLREAKTION.ruft(F)` (neu).

## Tests

- `node --test viz3/test/unit/grenzland_ruf.test.mjs` – Stufen mit Spielraum, Kosten der Taten, Vergessen, Orte, Satzteile (alle in
  `linien()`), Chatzeilen (mit Name und mit Beschreibung lesbar, nie Hubert oder Ronald).
- `python3 viz3/test/grenzland_ruf.py 9042 ruf` (21 Prüfungen, hier grün 17.11. 13:58): Böller vor einem, der Falko kennt → Ratscher −4,
  Schleusingen −1,2, Ereignis, Speicher; Chatzeile; Verkäuferin am Wagen erzählt in Satzteilen; misstrauisch: Gerhard tuschelt und
  zeigt; beliebt: winkt, Grüßen herzlich (+0,5); verhasst: Anruf, Stern; einen Tag später 6 Punkte vergessen; `add` für Jobs und
  Entscheidungen; nach „Beenden“ ändert sich nichts mehr. Bilder `out/grenzland_ruf/01_chat_nach_tat`, `02_gerede_am_wagen`,
  `03_stufe_hud`, `04_tuscheln_anger`, `05_beliebt_winken`, `06_verhasst_polizei`.

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
- **Stimmen:** `GLRUF.linien()` (Gerede und Stufensätze für jeden Sprecher in `GLREAKTION.REDNER`) und `GLJOBS.linien()` (die Feuerwehr).
