# Grenzland: jederzeit mit der Partnerin / dem Partner reden (feat/grenzland-partner, 13.11.2026)

Falko, 13.11.2026 20:37: „Ich möchte aber die Möglichkeit haben, ständig mit der Partnerin bzw. mit dem Partner zu sprechen. Also wenn ich
vor Sarah stehe, dann möchte ich mit Sarah sprechen können, möglichst mit KI. Oder relevante Themen rund um die Quests und umgekehrt
genauso.“

## Was es gibt

- **Überall im heutigen Grenzland**: Steht man zu Fuß bis etwa 3 m vor Sarah (oder, wenn man Sarah spielt, vor Falko) und schaut grob zu
  ihr, zeigt der Aktionsknopf des Spiels **„Mit Sarah reden · E“** / „Mit Falko reden · E“ (am Handy: antippen). Nicht 1989 (dort ist der
  Partner nicht da), nicht während einer Filmszene (`body[data-gl-kino="1"]`), nicht während ein Missionsgespräch läuft
  (`GLMISSION.redet()`), nicht bei offener Auswahl, nicht im Fahrzeug.
- **Das Gespräch**: E öffnet rechts ein kleines Feld im Look des Modus (dunkel, gelber Name, wie die Auswahl von `GLHUD.wahl`). Die
  Partnerin bleibt stehen, dreht sich zum Spieler und schaut ihn an (`GLFIG.face`, `GLFIG.blick(F, 'spieler')`), der Mund bewegt sich,
  während sie spricht (`GLFIG.talking`), die Zeile steht als Untertitel (`GLHUD.sub`) und im Feld. Zur Begrüßung ein kurzes „Was gibt es?“.
  **E oder Esc** beendet das Gespräch, ebenso Weggehen (> 4,6 m), eine Szene, ein Missionsgespräch, Tab, die Reise nach 1989, eine
  Festnahme. Danach folgt sie wieder wie vorher (`GL.folgt` wird während des Gesprächs angehalten – so wie es `gl_kegeln.js` an der Bahn
  macht – und danach wiederhergestellt).
- **Ohne KI (kein Schlüssel oder KI aus) – Themen wie die Dialogauswahl in GTA** (Tasten 1–4 oder antippen):
  - „Was machen wir jetzt?“ – die Partnerin sagt das aktuelle Ziel in ihren Worten: **eine Zeile pro Missionsschritt von Kapitel 1, in
    beiden Stimmen** (36 Schritte), zwischen zwei Missionen das Nächste („Jemand weiß von der Karte …“), nach Kapitel 1 das freie Spiel.
  - „Was wissen wir bisher?“ – Rückblick nach Fortschritt: die letzten zwei geschafften Missionen (je ein Satz), vorher „noch nichts“.
  - „Alles gut bei dir?“ – Frotzelei, mehrere Varianten: mit Sternen, kurz nach einer Flucht (3 Minuten nach `grenzland:entkommen`),
    nachts, morgens, tagsüber.
  - „Warte hier“ / „Komm mit“ – je nach Stand; wirkt sofort (`GRENZLAND.folgen`, die Anzeige im HUD und das Radar wissen es), sie bleibt aber
    stehen, solange das Gespräch läuft. Der Spieler stellt die Frage mit seiner eigenen Stimme, die Partnerin antwortet.
  - Jede Zeile ist ein fester Text in `gl_partner_data.js` (144 Zeilen, je 72 für Sarah und Falko), angeboten über `GLPARTNER.linien()` /
    `GLPDATA.linien()`; `tools/voices/grenzland_linien.mjs` findet sie (gelaufen, JSON aktualisiert: +144 Zeilen) – der Workflow
    `stimmen_grenzland.yml` nimmt sie beim Push auf.
- **Mit KI** (Menü → Einstellungen → „KI-Gespräche“, `KI.ready`): Sarah und Falko sind Personen der freien Gespräche des Spiels
  (`npc/ki.js`): `gl_p_sarah` und `gl_p_falko`, je mit eigenem Charakterbogen (Du-Form, Paar aus Berlin mit Garten in Ratscher, die
  Geschichte von Kapitel 1, GTA-Ton: trocken, Frotzeleien, loyal, erwachsen, nichts Explizites; Hubert, Ronald und echte Firmen sind nie
  Täter oder Ziel), eigenem Gedächtnis, Startmeinung 85, derselben Stimme wie ihre festen Zeilen. Mikrofon und Textfeld erscheinen im
  Gesprächsfeld; die Themen-Knöpfe fragen dann die KI (sie kennt Mission und Schritt), „Komm mit“/„Warte hier“ wirken sofort und die KI
  erfährt es. Die KI selbst kann über das Werkzeug `spielaufgabe` **mitkommen**, **warten** oder **das nächste Ziel auf der Karte markieren**
  (`grenzland:ziel` → Wegpunkt auf dem Radar).
  - **Lage pro Zug** (`<lage>`): Ort, ob man zusammen fährt, Kapitel/Mission/Schritt mit dem Zieltext aus dem Tagebuch, oder was als Nächstes
    kommt, oder freies Spiel; die bisherige Geschichte als ein Satz pro geschaffter Mission; Sterne, ob verfolgt, was die Polizei weiß
    (Gesicht/Kleidung/Fahrzeug), ob man in Deckung ist; Geld; was der Spieler dabei hat; ob sie mitkommt oder wartet – statt Baustand des
    Pavillons und der Gartenaufgaben des Grundspiels.
  - Ohne Schlüssel zeigt das Feld den Knopf „Frei reden – KI-Gespräche einrichten …“ des Spiels.

## Entscheidungen (ohne Rückfrage)

- **Taste E** über den Aktionsknopf des Spiels (`KERN.act`, Kennung `gl:partner`, Reichweite 3 m, Priorität 0,15) – E war frei, genau so
  bieten die anderen Grenzland-Aktionen (Tanken, Helm, Angeln …) ihre Knöpfe an. Im offenen Gespräch fängt das Feld E/Esc/1–4 ab (Capture),
  damit E nicht zugleich eine andere Aktion auslöst.
- **Im Fahrzeug nicht** in dieser Runde: Im Auto/auf der Simson ist E der Ausstieg, und eine eigene Taste fürs Gespräch während der Fahrt
  wäre eine Änderung in `gl_modus.js`/`gl_hud.js` (Lead). Die Daten und die KI-Person sind dafür vorbereitet (`lage()` meldet
  „ihr sitzt zusammen auf dem …“, `frei()` ist die einzige Sperre).
- **Mission-1-Test an der alten Schule** (Schritt `schule`) statt Schritt 1 (`ankunft`): Schritt 1 ist ein Missionsgespräch, dort gibt es
  absichtlich keinen Knopf; und so bleibt der Testlauf in einem Gebiet (Ratscher).
- **Rückblick**: die letzten zwei geschafften Missionen, nicht alle fünf (sonst 25 Sekunden Monolog).
- **KI-Kern nur additiv** (`npc/ki.js`, `npc/ki_core.js`): optionale Teile, ohne sie bleibt alles wie vorher –
  `KI.person({ …, themen, quest, lage, aufgaben, ohne, vertraut, klatsch })`; `lage()` ersetzt Ort, Hand, Baustand und Grundspiel-Aufgaben
  in `<lage>`; `ohne: ['aufgabe_geben']` lässt das Dorf-Werkzeug weg (auch aus dem Prompt); `vertraut` streicht „Ihr redet heute zum
  ersten Mal …“; `klatsch: false` – die beiden erzählen nichts im Dorf weiter und hören nichts aus dem Dorfklatsch (die Geschichte bleibt
  im Grenzland); `KI.lage(key)` gibt für Tests die `<lage>` aus, ohne Anfrage. Die vorhandenen KI-Unit-Tests laufen unverändert grün; ein
  neuer Unit-Test prüft, dass die `<lage>` der anderen Personen Zeichen für Zeichen gleich bleibt.

## Tests

- `viz3/test/unit/grenzland_partner.test.mjs` (ohne Browser, in `tools/check.sh`): jede Zeile pro Schritt in beiden Stimmen, die Auswahl
  nach Stand (Mission 1, Pause, freies Spiel, Rückblick, Sterne/Flucht/Tageszeit), `linien()` ohne Platzhalter, die `<lage>`-Zeilen mit
  Ziel und Sternen, `ki_core.situation` mit und ohne Adapter-Zeilen, Werkzeuge/Prompt der Partnerin.
- `viz3/test/grenzland_partner.py` (Browser, `frei` und `ki`; auch auf Actions über `viz3/extra/grenzland-partner/tests.txt`): Knopf in 2 m,
  keiner in 6 m oder mit dem Rücken zu ihr, E öffnet, Themen spielen die richtigen Zeilen (freies Spiel, Mission 1 an der Schule),
  „Warte hier“ hält sie an (12 m weg folgt sie nicht), „Komm mit“ lässt sie wieder folgen, E/Esc/Weggehen schließen, nichts bei Szene und
  1989, als Sarah „Mit Falko reden“ mit Falkos Zeilen; KI: beide Personen registriert, `<lage>` mit Ziel und Sternen, die der Nachbarn
  unverändert, mit (falschem) Schlüssel läuft ein freies Gespräch im Feld (Bogen, kein `aufgabe_geben`) – ohne eine einzige Anfrage.
- Bilder: `out/grenzland_partner/01_prompt.jpg`, `02_panel.jpg`, `03_panel_handy.jpg`, `04_panel_ki.jpg`, `05_panel_falko.jpg`.

## Für den Lead

- **`modules.txt`**: zwei Zeilen am Ende des `# feat/grenzland`-Blocks (nach `gl_stimmen.js`): `gl_partner_data.js`, `gl_partner.js`
  (`gl_partner.js` importiert `gl_mission.js`, `gl_fahndung.js`, `gl_hud.js`, `npc/ki.js`; `GRENZLAND` liest es über `window`).
- **Keine Änderung in `gl_modus.js`, `gl_data.js`, `gl_hud.js` nötig.** Wünsche, falls gewollt:
  1. **Gespräch während der Fahrt** (GTA-Banter): eine Taste/ein Knopf im HUD, der `GLPARTNER.auf()` auch im Fahrzeug erlaubt, wenn
     `GRENZLAND.partnerOf().rides` – dafür müsste `frei()` die Fahrzeug-Sperre lockern (meine Datei) und der Lead die Taste vergeben
     (z. B. im Fahrzeug `Y`), weil E dort Aussteigen ist.
  2. Optional: der HUD-Knopf „Komm mit/Warte hier“ in `gl_hud.js` könnte während eines Gesprächs `GLPARTNER.thema('komm'|'warte')`
     rufen, damit die Partnerin antwortet (heute wirkt er still; `gl_partner.js` übernimmt den Wert nach dem Gespräch).
  3. **KI-Telefonat** (Auftrag Punkt 4) nicht gebaut: `GLHANDY.rufZeilen` bleibt der Weg. Ansatz für später: in `gl_handy.js` beim Anruf an
     den Partner mit `KI.ready` statt der festen Zeilen `GLPARTNER`-Person mit dem Anrufbildschirm als `host()`.
- `npc/ki.js` und `npc/ki_core.js` sind geteilte Module (außerhalb von `grenzland/`): die Änderung ist im Auftrag erlaubt, additiv,
  mit Unit-Test – beim Merge bitte mit `feat/ki`-Ständen abgleichen, falls dort parallel etwas kam.
- Die Stimmen: `tools/voices/grenzland_linien.json` enthält die 144 neuen Zeilen; der Workflow nimmt sie beim Push auf diesen Branch auf
  (und committet mit `[skip ci]` zurück).
