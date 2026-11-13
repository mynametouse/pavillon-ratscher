# Grenzland – der GTA-Modus (feat/grenzland, ab 13.11.2026)

Plan und Falkos Wünsche wörtlich: `docs/plans/plan_grenzland.md`. Für Menschen: Projekt-Dokument `claude/pavillon-gta.md`. Gebaut vom
Grenzland-Chat (Lead) und sechs Hilfs-Agenten; ihre Teile stehen in eigenen Dokumenten:

| Teil | Dokument | Auftrag |
|---|---|---|
| Fahrzeuge, Cockpits | `docs/features/grenzland-auto.md` | `docs/plans/auftraege/grenzland-auto.md` |
| Radiosender, Handy | `docs/features/grenzland-radio.md` | `…/grenzland-radio.md` |
| Rückblende 1989 | `docs/features/grenzland-1989.md` | `…/grenzland-1989.md` |
| Orte, Kegeln, Angeln, „Karpfen für Suhl“ | `docs/features/grenzland-neben.md` | `…/grenzland-neben.md` |
| Fahndung, Polizei | `docs/features/grenzland-polizei.md` | `…/grenzland-polizei.md` |
| Kapitel 1, Missionen | `docs/features/grenzland-mission.md` | `…/grenzland-mission.md` |

Gemeinsame Regeln für alle Teile: `docs/plans/auftraege/grenzland-gemeinsam.md`.

## Runde 2 (13.11.2026 ab ~12:00): GTA-Gefühl und Immersion

Falko hat um 10:59 eine Durchsicht von Kapitel 1 erbeten („Verbesserungsvorschläge für gta6 vibes und immersivität“) und gegen 11:25 die
Pakete **A** (Störendes raus), **B** (Kino-Gefühl) und **C** (lebendige Welt) gewählt; um 13:09 kam das **gemeinsame Handy** dazu. A baut der
Lead, B und C fünf Hilfs-Agenten (`kino`, `stimmen`, `licht`, `figuren`, `welt`), das Handy der Agent `handy` (Aufträge
`docs/plans/auftraege/grenzland2-*.md`, ihre Dokumente `docs/features/grenzland-<thema>.md` und `docs/features/handy.md`).

### Paket A – ruhig wie bei GTA (Lead, `gl_hud.js`, `gl_modus.js`, Test `grenzland_ruhe.py`)

- **Weg im Modus:** Kopfzeile der Seite mit den Reitern, die Leiste der Dinge (1–8), die Knöpfe des Hundes, Uhrzeit-, Figur- und
  Sicht-Knopf (die Tasten bleiben), die Hinweise und „Neu im Entdeckerbuch“ des Spiels, das Banner „Neue Aufgabe“, die Tastenhilfe beim
  Fahren; am Rechner auch die Knöpfe der Fahrzeugtafel (Tempo und Gang bleiben). Oben rechts bleiben nur das Auge (freie Sicht) und das Menü
  als kleine runde Knöpfe.
- **Tafel oben rechts:** nur noch die fünf Sterne und das Geld (wie GTA); gesucht zusätzlich, **was die Polizei weiß** – Gesicht, Kleidung,
  Fahrzeug als drei Zeichen (rot, wenn bekannt; aus `GLFAHNDUNG.stand().wissen`, Agent `welt`) – und eine kurze Zeile („Sie sehen dich!“).
  Ein Tipp auf Sterne oder Geld (oder ⋯) öffnet die alte Tafel mit Wechseln, Handy, Radio, Warte hier, Böller, Stoßen, „Anzeigen“ und
  Beenden; sie klappt nach ein paar Sekunden von selbst zu. Ein Knopf einer Mission steht gelb unter dem Geld.
- **Taste O** (oder „Anzeigen“): alles aus – Tafel und Radar weg (die freie Sicht des Spiels); O noch einmal holt sie zurück. Beim Start
  wird **Vollbild** angeboten, wo der Browser es kann.
- **Titelkarte:** der Modus beginnt mit „Kapitel 1 · Grenzland“ und den Tasten groß in der Mitte; Missionen bekommen ihre eigene Karte
  (`GLHUD.titel(name, über, sek, unter)`, Agent `kino`), Karten warten aufeinander und auf „Mission bestanden“; `GLHUD.ruhig()` wartet, bis
  keine Karte mehr steht (davor kommt die Abschlusskarte des Kapitels nicht mehr über „Bestanden“).
- **Szenen:** `GLHUD.kino(an)` legt schwarze Balken über und unter das Bild, die Untertitel stehen im unteren Balken, Tafel, Radar,
  Aufgabenkarte gehen aus dem Weg (Gespräche als Filmszenen: Agent `kino`).
- **Eine Zeile zur Zeit:** Untertitel stehen untereinander statt übereinander; der Polizeifunk wartet, solange jemand spricht (und verfällt
  nach 9 s Spielzeit), Menschen sprechen sofort; die Worte des Autoradios treten zurück, solange jemand spricht; die Sprechzeile des Spiels
  (Dorfbewohner) weicht einem Untertitel.
- **Leiser:** das Aufgabenbuch zeigt im Modus nur die Aufgaben des Modus (die Gartenaufgaben „Futter für die Ziegen“ usw. ruhen); Gedanken
  des Spiels über gesehene Tiere, Gartenaufgaben und neue Funktionen („Neu: …“) kommen nicht, die eigenen Gedanken des Modus warten, bis
  kein Untertitel und keine Karte mehr steht.
- **Hasso bleibt daheim:** war der Hund dabei, ist er während des Modus weg und kommt beim Beenden zurück (`GL.hund`).
- **Kamera und Mitspieler:** steht die Kamera in der oder dem anderen des Duos (nach einer Fahrt, eng), blendet die Figur aus, statt das Bild
  mit Haaren zu füllen.
- **Radar:** eine Streife oder ein Beamter steht nur auf dem Radar, solange sie dich sehen oder eben gesehen haben (`gesehen`, wie GTA 6).
- **Altes Handy:** seine Einträge standen nebeneinander (die Klasse `.hb` teilt es mit den runden Knöpfen des Spiels) – wieder
  untereinander, bis das gemeinsame Handy (Agent `handy`) es ersetzt.

## Stand (13.11.2026, 9:30)

- **V17x**: Kern und die Endstände der sechs Hilfs-Agenten (sie sind gegen 4 Uhr am Nutzungslimit stehen geblieben) zusammen mit
  `src` (V17w). Prüfpaket auf `kern/grenzland`: alle Pflicht-Tests grün; die 14 Grenzland-Tests in Actions (Stand 2a38294a: Kern,
  Fahrzeuge, Radio, Nebenbei, Polizei, Missionen 1–5, Lager und Neu laden; 1989 nach einer Testkorrektur).
- **Was die Agenten offen ließen**, steht in ihren Dokumenten jeweils unter „Offen“ bzw. „Für den Lead“.
- **Speicher:** im Chat-Rechner beendet der Container Chrome (Software-Grafik) bei ~3,7 GB – ein Rundgang durch Stadt und Dorf in
  einer Seite schafft das nicht; in Actions laufen alle Teile. Die Messung im iPhone-Profil macht `viz3/test/grenzland_speicher.py`.
- **Neue Werkzeuge:** `viz3/test/grenzland_ci.py` schreibt Fehlschläge als öffentliche Anmerkungen an den Actions-Job (die Logs sind
  ohne Anmeldung nicht lesbar), `viz3/test/grenzland_blick.py` macht Bilder für das Auge.

## Was es gibt (Kern)

- **Start:** Menü → Erleben → Szenen → „Grenzland“ oder `?szenario=grenzland`. Eine eigene Welt wie die Zombie-Nacht: eigener Spielstand
  `pav-grenzland-v1`, nichts davon läuft vorher, „Beenden“ (zweimal tippen) stellt alles zurück – Figur, Kalender, Aufgabe, Fahrzeuge,
  Orte. Während der Zombie-Nacht startet es nicht. Ein neu geladener Stand macht weiter, wo man stand. Nur für Erwachsene; die Karte ist
  echt, Geschichte, Firmen und Gauner sind erfunden (Hubert, Ronald und echte Betriebe kommen nicht vor).
- **Kalender der Geschichte:** sie beginnt am **Freitag, 4. September 2026, 17:20** (`DN.e0`, im Stand `e0neu`; das Datum des Spiels
  `e0alt` kommt am Ende zurück). Die Rückblende spielt am Freitag, 10. November 1989.
- **Das Duo:** Falko und Sarah, mit **Tab** (Knopf „Wechseln“) umschalten wie Jason und Lucia. Wer nicht gespielt wird, läuft als Figur
  mit („Komm mit“) oder wartet („Warte hier“), fährt auf dem Moped mit; getrennt unterwegs zeigt die Fahndung einen Stern weniger.
- **Anzeige** (`gl_hud.js`, selbst gebaut): Tafel oben rechts (am Handy eingeklappt) mit Geld, fünf Sternen – hohl, solange die Polizei
  nur eine Beschreibung hat, voll, wenn sie weiß, wer es ist, blinkend, während die Suche ausläuft –, was die Polizei gerade tut („… telefoniert
  (4 s)“, „Sie sehen dich!“, „versteckt“, „das Moped kennen sie“, „Hubschrauber“), wer gespielt wird, Knöpfe (Wechseln, Handy mit Zähler,
  Radio, Warte hier / Komm mit, Böller, Stoßen, Beenden). Große Zeile für Kapitel, **„Mission bestanden“** mit Titel und Lohn,
  Festnahme-Bild, Untertitel mit Namen, eine eigene Zeile für das Radio, Auswahltafel (Gespräche, Laden, Plan), Blende für die Zeitreise.
  **1989** ist das Bild wie ein verblasster Farbabzug getönt (CSS-Filter auf dem Bild, Vignette, feines Korn) – am Renderer ändert sich nichts.
- **Radar** (`gl_karte.js`): die kleine runde Karte wie bei GTA, immer da – am Rechner unten links, auf Touch-Geräten oben links unter
  der Aufgabenkarte (unten links liegt der Daumenknüppel). Voraus ist oben; Straßen und Wege; in der Mitte der Spieler; darauf das Ziel
  der Mission (gelb, am Rand gehalten, solange es fern ist; Name und Entfernung an der Karte), der oder die andere des Duos, Polizei (rot
  und blau im Wechsel; rote Scheibe, wo sie zuletzt suchten), Sperre, Hubschrauber, Wegpunkt aus dem Handy, die Orte des Modus. Der Rand
  blinkt rot-blau, solange sie einen sehen, und pulsiert gelb, solange sie suchen. Auf dem Moped zeigt die Karte mehr, je schneller man
  fährt. 1989 ist sie ein Blatt Papier mit brauner Tinte. Die kleine Karte des Spiels beim Fahren ist währenddessen ausgeblendet.
- **Fahrzeugname:** beim Aufsteigen oder Einsteigen steht der Name kurz über der Karte.
- **Tanken:** das Moped verbraucht 2,6 l auf 100 km; leer bleibt es stehen. Am Moped „Moped betanken“ (halten): zu Hause im Garten aus
  dem Kanister, unterwegs mit einem gekauften Kanister (Verkaufswagen).
- **Böller** (Knopf): ein paar Meter voraus geworfen; ein Knall ist weit zu hören – im Dorf eine Tat, anderswo eine Ablenkung.
  **Stoßen** (G): ein Stoß gegen den, der vor einem steht – eine Tat, wenn es jemand sieht.
- **Erwischt:** Bußgeld, am nächsten Morgen im Garten; in der Rückblende beginnt die Erinnerung von vorn.

## Module (Kern, `viz3/src/grenzland/`)

| Datei | Name | was |
|---|---|---|
| `gl_state.js` | `GL` (`window.GLSTATE`) | Zustand und Spielstand: wer spielt, Geld, Dinge, Missionen, Kalender; `pay/earn/has/add/use`, Ereignisse `grenzland:*` |
| `gl_data.js` | `GLDATA` | Orte, Besetzung, Kleidung, Texte, Dorf-Chat, Feed, Sushi in Suhl, Waren, 1989 |
| `gl_ton.js` | `GLTON` | alle Geräusche synthetisch (Martinshorn, Moped, Böller, Kegel …) |
| `gl_hud.js` | `GLHUD` | Tafel, Meldungen, Untertitel, Auswahl, Blende, Bild von 1989 |
| `gl_karte.js` | `GLKARTE` | Radar; `GLKARTE.src(fn)` für eigene Marken |
| `gl_modus.js` | `GRENZLAND` | Start, Ende, Duo, Tasten, Böller, Tanken, der Takt für alle Module |

## Tests

- Ohne Browser: `viz3/test/unit/grenzland*.test.mjs` (Fahndungsregeln, Kegeln, Angeln und die Teile der Agenten).
- Im Browser: `viz3/test/grenzland.py` (Kern: Start, Kalender, Radar, Wechsel, Folgen, Moped, Taten mit und ohne Zeugen, Streife,
  Entkommen, Festnahme, „Mission bestanden“, Neu laden, Beenden, 16 Texturen je Shader), `grenzland_blick.py` (Bilder von Tafel und Radar),
  dazu je Teil `grenzland_<thema>.py`. Liste für die Actions: `viz3/extra/grenzland/tests.txt`.

## Offen

- Erledigt: Sarah ist einverstanden, als Figur aufzutreten (Falko, 13.11. 10:44; gefragt hatte er 0:30 „nur, wenn Sarah das mag“).
- Zu zweit über das Internet; Coups von oben planen (Strategie-Linse); Autos knacken; Besitz kaufen; Kapitel 2 braucht eine Detailzone an
  der alten Grenze zu Bayern (Kolonnenweg, Grünes Band).
- Der Modus liegt im Hauptpaket der App (wie die Zombie-Nacht); als Paket auf Abruf würde er den ersten Seitenaufbau entlasten.
