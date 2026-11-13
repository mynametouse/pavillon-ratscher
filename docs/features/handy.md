# Das gemeinsame Handy (`viz3/src/handy/`, `HANDY`)

Stand 13.11.2026, Hilfs-Agent `handy` des Grenzland-Chats (Branch `feat/handy`, Test `viz3/test/handy.py`, CI `viz3/extra/handy/tests.txt`).

## Was Falko wollte (13.11.2026, 13:09)

„Achte auch darauf, dass das Handy im Spiel realistischer aussieht. … wenn er auf das Handy schaut, … das Handy dann eben vors Gesicht
gehalten wird. … die Chats … schlecht dargestellt. Also man scrollt von links nach rechts … anstatt ganz normal wie bei einem vertikalen
Handybildschirm von oben nach unten. Es sollten auch irgendwie Apps auf dem Handy sein, die man starten und schließen kann. … Personen
anrufen … diese Bewegung, das Handy in die Hand zu nehmen, vielleicht sogar zu drücken, das muss gut aussehen und sollen noch später
weitere Funktionen freigeschaltet werden können … ein sehr gutes Modell, dann kann das nämlich auch die anderen Chats nutzen. Zum Beispiel …
Zukunftsszenario-Chat … in der jeweiligen Welt auch andere Inhalte.“

**Woher das Seitwärts-Scrollen kam:** Der alte Handy-Körper (`gl_handy.js`) hatte die Klasse `.hb`, die das Grundspiel in
`shell/css/hud.css` als Knopfleiste gestaltet (`display:flex`) – jede Nachricht stand neben der vorigen. Das neue Handy benutzt nur eigene
Klassen `hy-…` (Hinweis von Agent `welt`).

## Das Modell in einem Satz

`handy/` ist das **Gerät mit seinem kleinen Betriebssystem** und kennt keine Welt; eine **Welt** (Grenzland jetzt, der Zukunfts-Chat
später) macht ihr Handy mit `HANDY.welt(id, cfg)` aktiv und bringt Inhalte (Kontakte, Chats, Feed, Bank, Notizen, Orte, Uhrzeit),
Aktionen (antworten, anrufen, Foto, Ziel) und eigene Apps (`HANDY.app`).

| Datei | Global | Inhalt |
|---|---|---|
| `handy/handy.js` | `HANDY` | Gerät, Sperr- und Startbildschirm, Apps öffnen/schließen, Mitteilungen, Anrufe, Sucher, Alarm, Töne, Tasten, Gesten |
| `handy/handy_apps.js` | `HANDYAPPS` | die Standard-Apps: Nachrichten, Telefon, Kamera, Fotos, Karte, Feed, Bank, Notizen, Einstellungen, Uhr |
| `handy/handy_pose.js` | `HANDYPOSE` | die Haltung: die Figur hebt das Handy, schaut darauf, tippt, hält es ans Ohr; das Handy in der Hand |
| `grenzland/gl_handy.js` | `GLHANDY` | Grenzlands Welt auf `HANDY` (die alte Schnittstelle bleibt) |

## Das Gerät

- **Aussehen:** ein Smartphone ohne Marke und Logo (kein Apple-/Samsung-Look, keine App eines echten Herstellers nachgebaut): schmaler
  Rand, runde Ecken (Maße 71,6 × 147,6 mm), Kamera-Pille oben, Lautstärke- und Seitentaste, Glanz auf dem Glas, dunkles Design.
  Alles DOM/CSS, keine Bilder; Größen in Container-Einheiten (`cqmin`) – dasselbe Handy skaliert ohne Umbau.
- **Wo:** am Rechner unten rechts, aufrecht (wie bei GTA; bei 1100 × 680 etwa 290 × 600 px); am Handy hochkant **groß in der Mitte**; am
  Handy quer **seitlich gehalten** (Querformat-Gerät rechts unten); `HANDY.layout('gross')` für Präsentationen: ~72 % der Höhe am rechten
  Rand, senkrecht mittig.
- **Ablauf:** herausnehmen (gleitet von unten herein, 0,34 s in Spielzeit) → **Sperrbildschirm** mit Uhrzeit, Datum und den letzten
  Mitteilungen → entsperrt sich nach ~0,6 s von selbst („Gesicht“; Klick/Wischen geht schneller) → **Startbildschirm** (Uhr-Widget, App-
  Raster, Dock mit vier Apps, Zähler an den Symbolen) → eine **App wächst aus ihrem Symbol** und schrumpft beim Schließen dorthin zurück.
  Eine offene App bleibt beim Weglegen offen (wie am echten Handy).
- **Bedienung:** Maus/Touch wie am Handy. Tasten: **Esc** legt weg, **Backspace** ← zurück, **1–9** öffnet die n-te App bzw. wählt eine
  Antwort, Pfeile scrollen. Der untere Balken (Klick oder hochwischen) → Startbildschirm; vom linken Rand wischen → zurück. T legt die Welt
  fest (in Grenzland: `gl_modus.js`). Solange es oben ist, ist die Maus frei; klickt man ins Bild (Maus fängt den Blick), legt man es weg.
- **Alles scrollt senkrecht**, nativ (`overflow-y:auto`, Schwung am Touch, `overscroll-behavior:contain`), nichts seitwärts.
- **Statusleiste:** Uhrzeit der Welt, Netz (Balken, „E“ bei schwachem Netz, „Kein Netz“ bei `netz() < 0`), Akku der Welt.
- **Mitteilungen:** Banner fällt oben ins Handy (Ton; Tipp öffnet die App an der richtigen Stelle); ist das Handy weg, erscheint die
  Mitteilung klein an der Bildschirmecke („Peek“, abschaltbar mit `peek: false`); Liste auf dem Sperrbildschirm; Zähler an den Symbolen.
- **Töne:** alle synthetisiert (Tippen, Mitteilung, Senden/Empfang, eigener Klingelton, deutsches Freizeichen 425 Hz, Auflegen, Auslöser,
  ein Alarm, der bewusst **nicht** wie der amtliche Warnton klingt). Lautstärke über den Effekt-Regler des Spiels.
- **Einstellungen** (für alle Welten gleich, gespeichert `pav-handy-v1`): Töne, Mitteilungen vorlesen, Hintergrund (4 Verläufe, der erste:
  Hügel in der Dämmerung), „Kommt später“-Liste.

## Die Haltung (`HANDYPOSE`)

- Wenn die Welt `halten: true` sagt und die Spielfigur zu Fuß in der Dritte-Person-Sicht ist: Die rechte Hand hebt das Handy **vor die
  Brust**, der Kopf neigt sich darauf, die Finger umgreifen den Rand, **der Daumen drückt**, wenn man tippt (0,25 s); bei einem **Anruf ans
  Ohr**; im **Sucher vor die Augen**; beim Weglegen sinkt der Arm (alles ~0,35 s weich). Im Fahrzeug keine Haltung (nur die Oberfläche).
- Ein **Handy in der Hand**: flache abgerundete Platte mit Kamerabuckel, der Bildschirm leuchtet in der Farbe der offenen App (Material
  des Verkehrs `VFIG.mat()` – kein neues Shader-Programm außer höchstens einem).
- Die Kamera der dritten Person rückt dabei etwas näher (höchstens 2,25 m) und geht danach genau dorthin zurück, wo man sie hatte.
- Technik: Knochen nach der eigenen Pose der Figur (später `KERN.tick` nach `game/avatar.js`), Zwei-Knochen-IK für den Arm, Hand nach den
  Fingerknochen ausgerichtet; jede Drehung in der `sv`-Liste der Figur, die sie vor dem nächsten Animationsschritt zurücknimmt – keine
  Basisdatei geändert, nichts aus Grenzland importiert.

## Schnittstelle für Welten

```js
HANDY.welt('meinewelt', {
  name: 'Meine Welt',
  ids: { root: 'handy', sucher: 'handysucher' },   // Element-IDs (nur nötig, wenn alte Tests andere Namen kennen)
  farbe: '#5aa9ff',            // Akzentfarbe (Links, Chips, eigene Sprechblasen)
  tapeten: ['linear-gradient(…)', …],              // eigene Hintergründe (sonst die vier eingebauten)
  zeit: () => minuten,         // Minuten (der Tag = % 1440; ältere Tage zeigen „Gestern“)
  datum: () => 'Freitag, 13. November',
  netz: () => 0..4 | -1,       // -1: „Kein Netz“
  akku: () => 0..100,
  apps: ['nachrichten', 'telefon', 'kamera', …],   // Reihenfolge auf dem Startbildschirm
  dock: ['telefon', 'nachrichten', 'kamera', 'feed'],
  gesperrt: { auftraege: 'Kommt mit Kapitel 2.' }, // grau, ein Tipp sagt den Text; HANDY.freischalten(id)
  layout: 'auto' | 'gross',
  halten: true,                // die Spielfigur hält es (nur in Welten mit Spielfigur)
  peek: true,                  // Mitteilung an der Bildschirmecke, wenn es weg ist
  darf: () => true | 'warum nicht',               // z. B. 1989: kein Handy
  badge: appId => zahl,
  feedName, feedSub, notizenLeer,                 // Texte der Standard-Apps
  daten: {
    threads: () => [{ id, name, gruppe, stumm, mitglieder, neu, letzte: { text, t, aus, von } }],
    nachrichten: id => [{ von, text, t, aus, neu, gelesen, img, sprach: sekunden, sys }],  // älteste zuerst
    gelesen: id => {}, tippt: id => bool, hinweis: id => 'Text im Eingabefeld',
    kontakte: () => [{ id, name, rolle, nummer, bild, fav, chat: threadId, info }],
    anrufe: () => [{ wer, id, art: 'ein'|'aus'|'verpasst', d, t }],
    feed: () => [{ wer, text, t, live, img, likes, kom: [[wer, text]], ort, ortName }],   // neueste zuerst
    bank: () => ({ name, claim, stand, waehrung, konto, buchungen: [{ wer, text: '+50 €', t }] }),
    notizen: () => [{ titel, zeilen: [], quellen: [[name, url]] }],
    orte: () => [{ id, name, pos: [x, y], art }], wo: () => [x, y], ziel: () => ortId, ortName: () => 'hier',
  },
  aktionen: {
    antworten: threadId => [{ id, text }],        // Antwort-Chips (wie die Antworten im Dialog bei GTA)
    antwort: (threadId, a) => {},                 // die Welt speichert die eigene Nachricht
    anruf: (kontakt, ctl, art) => Promise | null, // was gesagt wird: await ctl.sag(wer, text); ctl.warte(s); ctl.aktiv()
    anrufListe: eintrag => {},                    // für „Zuletzt“
    sag: (wer, text, o) => Promise,               // Stimme + Untertitel der Welt (sonst STIMME.say)
    foto: (img, f) => {}, teilen: (img, f) => {}, ziel: ort => {}, zeigOrt: ortId => {},
    sucher: () => ({ n: 'FOTO 1/3', text: 'Motiv im Bild', gut: true }),   // die Zeile im Sucher
    ausloesen: () => false | anything,            // false: kein Bild (Motiv nicht im Bild)
    hinweis: text => {},                          // warum es nicht geht (darf)
  },
});
HANDY.welt(null);   // kein Handy (Ende der Welt)
```

- **Eigene App:** `HANDY.app('radio', { name, kurz, icon: '<SVG-Pfad 24er Raster>', farbe: [c1, c2], render(el, ctx, view, arg) → { titel,
  sub, unten }, fuss(el, ctx, view, arg), klick(key, button, ctx) (für Elemente mit data-hy="key"), tick(dt, ctx), oeffnen(ctx) → false })`.
  `ctx.zu(view, arg)` öffnet eine Unteransicht (schiebt von rechts herein), `ctx.zurueck()`, `ctx.neu()`, `ctx.av(name)` ein rundes
  Bild mit Initialen. Klassen in Apps bitte `hy-…` (oder eigene mit Präfix).
- **Steuern:** `HANDY.mount(el)`, `HANDY.open(app?, { view, arg })`, `close()`, `toggle()`, `home()`, `back()`, `zeige(app, view, arg)`, `refresh()`,
  `zu()` (Promise bis weggelegt), `isOpen()`, `S` (Zustand).
- **Ereignisse** (`KERN.on`): `handy:auf`, `handy:zu`, `handy:app` { app, view }, `handy:tipp`, `handy:mitteilung` { app },
  `handy:anruf` { st, wer }, `handy:foto` { n }, `handy:sucher` { on }, `handy:alarm`, `handy:frei` { app }.

### Für den Zukunfts-Chat (große Leinwand, ohne Spielfigur)

- **Gerät groß am rechten Rand:** `HANDY.layout('gross')` oder `layout: 'gross'` in der Welt (~72 vh, senkrecht mittig, rechts 3,5 vw).
  `HANDY.mount(el)` hängt Handy, Peek und Sucher in einen eigenen Container (z. B. `WORKSHOP.slot('phone')`); `sperre: false` in der Welt
  lässt den Sperrbildschirm weg.
- **Push zu einem Zeitpunkt der Regie:** `HANDY.mitteilung({ app: 'nachrichten', von: 'Dorfgruppe …', text: '…', ziel: { v: 'faden', arg:
  'gruppe' } })` – Banner mit Ton; ist das Handy zu, öffnet `HANDY.open('nachrichten', { view: 'faden', arg: 'gruppe' })` die Stelle.
- **Anruf als Szene:** `HANDY.eingehend({ id: 'manfred', name: 'Manfred', rolle: 'Feuerwehr' }, { annehmen: 2.5, szene: async (k, ctl) => {
  await ctl.sag('zk_manfred', 'Wasser steht schon im Keller …'); await ctl.warte(0.4); … } })` – klingelt, wird nach 2,5 s von selbst
  angenommen, die Zeilen laufen über `aktionen.sag` (eure Stimmen/Untertitel), der Text steht als Untertitel im Anrufbildschirm, danach
  „Anruf beendet“. `HANDY.anruf(kontakt, { szene })` für einen ausgehenden Anruf.
- **Warnung:** `HANDY.alarm({ absender: 'Warnsystem (Szenario)', titel: 'Starkregen', text: '…', marke: 'mögliche Zukunft' })` – Vollbild
  im Handy, gelbe Marke, Vibration, ein Ton, der nicht wie der amtliche klingt.
- **Kein Netz:** `netz: () => -1` → „Kein Netz“ in der Statusleiste.
- **Fotos aus der 3D-Welt im Chat:** Nachrichten mit `img` (Data-URL, z. B. von `ZKREGIE.snapshot`) erscheinen als Foto-Sprechblase,
  `sprach: 12` als Sprachnachricht mit Wellenform; `HANDY.schnapp(w)` liefert ein echtes Bild der aktuellen Ansicht.
- **Nachrichtenportal / Videos:** als eigene App (`HANDY.app('news', { render })`) – Artikel mit Überschrift, Foto, Text sind normales HTML
  in `el`. Bitte nur eigene Klassen mit Präfix.
- Ohne `halten` greift `HANDYPOSE` nicht ein; ohne `aktionen.anruf` meldet sich die Mailbox. Eure Dorfgruppe heißt anders als „Ratscher
  aktuell“ (Grenzlands Satire).

## Grenzland als erste Welt (`gl_handy.js`)

- Apps: Telefon, Nachrichten, Kamera, Feed (Dock) · Karte, Bank, Notizen, Fotos, Radio, Uhr, Einstellungen, **Aufträge** (gesperrt:
  „Kommt mit Kapitel 2.“, `GLHANDY.freischalten('auftraege')`, bleibt im Spielstand frei).
- **Nachrichten:** eine Unterhaltung je Absender aus `GL.sms`; Antwort-Chips („Alles klar 👍“, „Bin unterwegs.“, „Melde mich später.“,
  bei Unbekannten „Wer ist da?“) – die eigene Antwort steht mit `aus: true` in `GL.sms`; Bekannte antworten manchmal kurz zurück (mit
  Tipp-Punkten). „Ratscher aktuell“ ist eine **stumme Gruppe** (43 Mitglieder, kein Zähler am Symbol), die wie bisher auf Streife,
  Böller, Taten, Sperren und Festnahmen reagiert; schreiben darf nur, „wer seit drei Generationen im Dorf wohnt“.
- **Telefon:** Sarah bzw. Falko (je nachdem, wen man spielt), Jule, Timo, Basti, Yuki, Gerhard – mit festen Sätzen (`GLHANDY.linien()` für
  `stimmen`), gesprochen mit `STIMME.say('gl_<wer>')` und Untertiteln `GLHUD.sub`. **`GLHANDY.ruf(wer, zeilen, { annehmen })`** lässt
  jemanden anrufen (für Missionen: `zeilen` = [[wer, text], …], `'ich'` = wer gerade spielt).
- **Kamera:** der Sucher über dem Bild (`#glcam`, wie bisher; Auftragszeile „FOTO 1/3 · Motiv im Bild“); `GLHANDY.kamera({ ziel, r, n,
  sicht, done })` zählt wie bisher, jedes Foto ist ein echtes Bild und landet in **Fotos**, von dort „Im Feed teilen“.
- **Feed:** `GLHANDY.feed(wer, text, ort, { img, live, likes, kom })` bzw. `GLHANDY.post({ … })` (Agent `welt`): Bild, LIVE, Likes und
  Kommentare zählen hoch; die eigene Feed-Reaktion des Handys auf Böller/Streife/Sperre entfällt 30 s nach einem gefilmten Beitrag.
- Gespeichert wie bisher in `GL.sms` und `GL.feed` (neue Arten `anruf`, `frei`); Bilder nur im Speicher.

## Entscheidungen (Falko hat alle Freigaben gegeben)

1. **Esc legt das Handy weg** (wie vorher und wie die Tests es erwarten); „zurück“ ist Backspace oder der Pfeil oben links, „Start“ der
   untere Balken. Der Auftrag nannte Esc für „App schließen“ – ein Tastendruck zum schnellen Wegstecken ist im Spiel wichtiger.
2. **Entsperren von selbst** nach ~0,6 s: der Sperrbildschirm ist zu sehen (Echtheit, Mitteilungen), hält aber nicht auf.
3. **Die Kamera ist der Sucher über dem Bild** (wie bei GTA), nicht ein kleines Bild im Handy. Esc führt zurück ins Handy, T steckt weg.
4. **Dunkles Design**, Akzent je Welt; keine echten App-Namen oder -Farben nachgebaut.
5. **Querformat am Handy:** das Gerät wird seitlich gehalten (sonst wäre es dort kaum lesbar).
6. **Die Dorfgruppe ist stumm** (kein Zähler) – sonst stünde am Nachrichten-Symbol ständig eine Zahl.
7. **Peek statt Gedankenblase:** kommt eine Nachricht, während das Handy weg ist, zeigt eine kleine Karte an der Ecke Absender und Text;
   ein Klick öffnet die Unterhaltung.
8. **Alte Tabs als unsichtbare Leiste:** `viz3/test/grenzland_radio.py` (nicht meine Datei) klickt `#glhandy .hn button[data-tab=…]`.
   Damit der Test grün bleibt, liegt eine **unsichtbare, 5 px hohe Leiste** am unteren Gehäuserand mit diesen sieben Knöpfen (sie öffnen
   die passende App). Sobald der Test auf `GLHANDY.open('chat')` usw. umgestellt ist, kann `compat()` in `gl_handy.js` weg.

## Tests

`viz3/test/handy.py` (Grenzland, freies Spiel, Abschnitte `app,anruf,kamera,halten,format`): T → Sperrbildschirm → Start; Nachrichten
aus dem Symbol, Dorfgruppe scrollt senkrecht (Mausrad), Sprechblasen untereinander, Backspace zurück und heim; Banner, Zähler, Antwort-
Chip; alle Apps öffnen; gesperrte App, freigeschaltet; Anruf (wählt → spricht → beendet, „Zuletzt“), Hand am Ohr; Sucher und echtes Foto in
Fotos; die Haltung (Hand vor der Brust, Handy sichtbar; weggelegt unten); Peek; hochkant/quer am Handy; Präsentationsformat; Alarm;
eingehender Anruf; nach „Beenden“ alles weg; Shader-Programme. Bilder in `out/handy/`. Auf GitHub laufen dazu `grenzland_radio`,
`grenzland_mission:m1,m4` und `grenzland`.

## Für den Lead

- **Zusammenführen:** `feat/handy` enthält schon `feat/grenzland` bis 686c7631 (Zusammenführen 1 von Runde 2, ohne Konflikt) – beim
  nächsten Zusammenführen kommen nur die Handy-Dateien dazu. Sollte `gl_handy.js` doch kollidieren (ein Agent hat ihn noch angefasst):
  **die Fassung von `feat/handy` nehmen** – sie kann alles von `welt` (`feed(…, { img, live, likes, kom })`, `post`, `posts`, `S.fotoT`).
  `modules.txt`: drei Zeilen `handy/…` direkt vor dem Block `# feat/grenzland`.
- **Die CSS-Zeile `#glhandy .hb{…}` in `gl_hud.js`** (Paket A) braucht es nicht mehr – im neuen Handy gibt es kein `.hb`; sie schadet nicht.
- **HUD:** der ☎-Knopf und T rufen weiter `GLHANDY.toggle()`; die Zahl `GLHUD.neu = GLHANDY.unread()` stimmt weiter.
- **Wünsche:** (1) `grenzland_radio.py` auf `GLHANDY.open('<tab>')` statt der Tab-Klicks umstellen – dann kann die unsichtbare Leiste weg.
  (2) Gedankenblasen „Nachricht von …“ braucht es nicht mehr (der Peek zeigt es). (3) Kino kann Anrufe als Szene nutzen:
  `GLHANDY.ruf('jule', [['jule', '…'], ['ich', '…']], { annehmen: 1.5 })`. (4) `stimmen` kann die Anrufsätze aus `GLHANDY.linien()` aufnehmen.
