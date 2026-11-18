# Zusammen spielen über das Internet (feat/mehrspieler, `viz3/src/netz/`)

Falko, 17.11.2026: 20:30 „Ein Konzept für einen Mehrspieler-Modus, wo man auch andere Spieler sieht, mit eigenen Avataren und so weiter … Sowohl
in der Zombie-Version als auch in der GTA-Version als auch in der normalen freien Simulation.“ 20:40 „Schau nochmal kritisch auf das Konzept und
optimiere .. auch hinsichtlich Spielspaß“. 21:21 „Dann bitte erste funktionsfähige Version umsetzen die dann später erweitert werden kann“.
Konzept (Fassung 2): `docs/plans/plan_mehrspieler.md` (= Projekt-Dokument `claude/pavillon-mehrspieler.md`). Gebaut vom Mehrspieler-Chat
session_01L6Yrpdv3z6vdQt8B5XJNP3.

## Stufe 1 – „Zu zweit im Garten“ (in der freien Simulation)

- **Raum:** Menü → „Zusammen spielen“ → „Raum erstellen“ gibt einen Code (sechs Zeichen) und den Link `…/?zusammen=CODE` (kopieren, am
  Handy „Teilen“); die anderen öffnen den Link oder tippen den Code bei „Beitreten“. Die Browser verbinden sich direkt (Trystero über
  öffentliche Nostr-Relais, `lazy/raum.js` wie die Zombie-Nacht, eigene App-Kennung `pavillon-ratscher-netz-1`) – kein eigener Server,
  kein Konto. Bis etwa vier Spieler (jeder schickt an jeden). In der Leiste oben rechts „Zusammen“ mit der Zahl der Spieler.
- **Avatare:** Name für die anderen; Figur: Falko, Sarah, Christoph (so wie sie sind) oder eine der zehn Leute der Straßen (`vk_*`,
  Rocketbox) mit Farben für Oberteil, Hose und Schuhe, Muster (kariert, gestreift, Strick, Leder, gesteppt; Jeans, Cord), Kopf (Basecap in
  der eigenen Farbe, Mütze, Schiebermütze, Hut, Kopftuch), Brille, Schnauzer; die eigene Farbe (Name und Zeigen); „Zufall“, „Ansehen (V)“.
  Übertragen wird nur der Plan (`NETZLOGIK.avClean`, ein paar Zahlen); jeder Browser baut die Figur selbst.
  - Die eigene Figur ist die des Spiels (`AVATAR`); die Leute der Straßen sind dort eigene Arten (markierter Haken in `game/avatar.js`,
    Datei aus `CHARMAN`, Größe `h`), bemalt wie der junge Gerhard in `grenzland/gl_1989.js` (`GLFIG.pixels` → `dress` → `hatOn`/`kopf` →
    `forget`). Wählt man im Menü (Einstellungen → Spielfigur) Falko, Sarah oder Christoph, folgt der Avatar.
  - Die anderen sind Figuren von `GLFIG` (Kleidung nach Körperzonen, Kopfbedeckungen, Gesten, Sitzen) unter eigenen Einträgen
    `netz_<pid>` in `GLDATA.CAST` und `GLDATA.KLEID`, jedes Bild von `NAVATAR.pose` gestellt (nicht über `GLFIG.tick`, das Wege läuft):
    gehen, laufen und rennen nach der Geschwindigkeit (`GLPOSE.nach`), ducken, kriechen, liegen, springen (Clips des Satzes über dem Gehen),
    sitzen wie die eigene Figur auf dem Sitz. Christoph trägt bei den anderen eine dunkle Basecap statt seiner eigenen Mütze (die baut nur
    `game/avatar.js`). Markierter Haken in `grenzland/gl_fig.js`: `fileOf` kennt jede Spielfigur von `PLAYERMAN` (`player_c`).
- **In der Welt:** jeder rechnet seine Figur und das Fahrzeug, das er fährt; 10 Zustände je Sekunde (Ort, Richtung, Tempo, Haltung, Sitz,
  Fahrzeug, Haus), weich nachgezogen. Der Name hängt über dem Kopf in der Farbe des Spielers, auch durch Wände (mit „· 120 m“, „· im
  Haus“, „· fährt“). Im Haus sieht man nur, wer im selben Haus ist (wie in der Zombie-Nacht). Das Fahrzeug, das einer fährt, fährt bei
  allen; einsteigen kann man dort nicht („Tom fährt“).
- **Uhr:** die des Gastgebers (Uhrzeit, Tempo, Datum, alle 2 s); ein Gast hat danach seine eigene wieder (`NETZ.uhr`, auch über ein Neu
  laden). Jeder sieht in dieser Stufe seinen eigenen Garten, Pavillon und Wald.
- **Zeigen:** G oder die mittlere Maustaste (am Handy der Knopf „Zeigen“): ein Ring in der eigenen Farbe, wohin man schaut, mit einem Wort –
  „Hier!“, „Hier rein!“ (ein Haus), „Das Auto!“, „Der Traktor!“, „Da: Sarah!“; bei den anderen zeigt die Figur dorthin.
- **Gesten:** Winken, Nicken (die eigene Figur mit den Clips `greet`/`nod`), Kopf schütteln, Schulterzucken (nur bei den anderen).
- **„Hin“:** springt neben den Mitspieler (aus dem Fahrzeug, aus einem Haus; ist er in einem Haus, ins selbe Haus).
- **Verstecken im Dorf** (`netz/netz_verstecken.js`): der Gastgeber startet (wer sucht: Zufall, ich, ein Mitspieler). 30 s zählen (dunkel,
  der Suchende steht fest), 5 Minuten suchen, die Namen verschwinden; „<Name> gefunden!“ (E), wenn der Suchende daneben steht (3 m, gleiche
  Höhe, beide draußen oder im selben Haus) – geprüft beim Gastgeber an den letzten Zuständen beider; alle gefunden oder Zeit um: Ergebnis,
  „Nochmal“ (der zuerst Gefundene sucht). Der reine Ablauf: `NETZLOGIK.vs*`.
- **Wiederverbinden:** ist man 20 s allein, nachdem schon jemand da war (ein Handy schlief, ein Relais hakte), öffnet NETZ denselben Raum
  neu; beim Zurückkommen auf die Seite sofort. Neu laden innerhalb von 15 Minuten geht zurück in den Raum (`pav-netz-raum`). Solange man im
  Raum ist, bleibt der Bildschirm wach (Wake Lock). Ein neu geladener Browser hat eine neue Kennung (`<Browser>-<Seite>`), der alte Eintrag
  geht, wenn er 3 s schweigt; zwei Tabs eines Browsers sind zwei Spieler.
- Zombie-Nacht und Grenzland schließen den Raum (sie haben ihre eigene Welt; die Zombie-Nacht ihr eigenes `ZNETZ`).

## Dateien

| Datei | Fenstername | Inhalt |
|---|---|---|
| `netz/netz_logik.js` | `NETZLOGIK` | rein: Codes, Namen, Avatar-Plan und Farben, Prüfung aller Nachrichten, Verstecken (`vsNew/Step/Found/Leave/Wire/FromWire/CanFind/Next`) |
| `netz/netz_raum.js` | `NETZRAUM` | Übertragung: Trystero (`lazy/raum.js`) oder BroadcastChannel; `NETZRAUM.ice`/`turn` für einen späteren TURN-Dienst |
| `netz/netz_avatar.js` | `NAVATAR` | eigenes Avatar (`pav-netz-v1`), Figuren der anderen über `GLFIG`, `pose`, `geste` |
| `netz/netz.js` | `NETZ` | Raum, Mitspieler, Zustände, Namen, Fahrzeuge, Uhr, Zeigen, Gesten, „Hin“, Wiederverbinden (`pav-netz-raum`) |
| `netz/netz_verstecken.js` | `NVERSTECK` | Verstecken im Dorf |
| `netz/netz_ui.js` | `NETZUI` | Fenster „Zusammen spielen“, Menüeintrag, Knöpfe in der Leiste, Tasten |

Nachrichten (`NETZLOGIK.PROTO` = 1; eine andere Version wird gemeldet): `hi` { pid, name, av, role, v, build }, `st` (10/s), `ev` { k: 'uhr'
| 'ping' | 'geste' | 'spiel' | 'bye' | 'x:<name>' }. Alles Ankommende geht durch `hiClean`/`stClean`/`evClean` (endliche Zahlen in Grenzen,
bekannte Arten, sonst verworfen) und ist je Mitspieler begrenzt (30 Zustände, 8 Ereignisse je Sekunde). Für andere Module:
`NETZ.tell(name, daten)` → drüben das Ereignis `netz:<name>`; `NETZ.spiel(d, pid?)` → `netz:spiel`; Ereignisse `netz:open`, `netz:close`,
`netz:peer` { k: 'neu' | 'weg' }, `netz:ping`, `netz:avatar`; `NETZ.labelRule`/`figRule` (Spiele blenden Namen oder Figuren aus).

## Testen

- `node --test viz3/test/unit/netz.test.mjs` (in `tools/check.sh`).
- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8979 --serve mehrspieler` – zwei Seiten eines Browsers über `?lokal=1`
  (Abschnitte `raum,welt,zeigen,auto,haus,verstecken,ende`); Bilder in `out/mehrspieler/`. Themen-Test `viz3/extra/mehrspieler/tests.txt`.
- Über das echte Internet: zwei Tabs (oder zwei Geräte) mit `?zusammen=CODE` – der Chat-Rechner erreicht keine Relais.

## Offen (Stufe 2 und weiter, Konzept Abschnitt 14)

- Raum-Dienst (Cloudflare, kostenlos, braucht ein Konto): schnelleres Finden und TURN für Mobilfunknetze; Workshop-Leichtansicht.
- Eine gemeinsame Welt (Garten, Pavillon, Bäume des Gastgebers für die Gäste, mit „Rückgängig“), Beifahrer, Sprache in der Nähe.
- Zombie-Nacht auf NETZ (Avatare, zu viert), Grenzland zu zweit, „Oben und unten“, weitere Spiele („Wo bin ich?“, Rennen, Skat).
- Christophs eigene Mütze bei den anderen (`figHeadwear` aus `game/avatar.js` exportieren); die Gesten Kopf schütteln und Schulterzucken
  auch an der eigenen Figur.
