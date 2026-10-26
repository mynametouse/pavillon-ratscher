# Frei reden mit Hubert und Ronald (feat/ki, 25.10.2026)

Grundlage: Falkos Nachricht vom 25.10.2026: „Ich möchte mit Ronald und Hubert reden können wie mit einer KI – sie sollen auf meine Stimme
hören und darauf antworten können … ein sehr schnelles, sehr token-effizientes KI-Modell (z. B. Haiku) … am besten auch Sprachausgabe … je
nach Gesprächsverlauf neue Quests, Aktionen oder auch Meinungen über mich entwickeln und ggf. den anderen erzählen, wenn sie miteinander
sprechen.“ Dazu: „Alle sollen sich um mich übrigen duzen, nicht siezen im Dorf.“

**Seit V16t (25.10.2026 spät):** auch mit den **acht Dorfbewohnern** frei reden (Gerhard, Manfred, Wolfgang, Uwe, Katrin, Ingrid, Jens,
Heike – ihr Charakter aus ihren Sätzen in `dorf/dorf_text.js`, Startmeinung aus dem Wahlkampf), **jede Person mit eigener Stimme**
(`audio/stimme.js`), **Lautstärke** getrennt für Gesamt, Stimmen, Umgebung, Effekte und Musik (Menü → Einstellungen → Lautstärke). Was ein
Dorfbewohner hört, macht im Dorf die Runde (zwei, drei andere merken es sich). Weitere Personen (Spaziergänger, Autofahrer) melden sich mit
`KI.person({ … })` an und öffnen das Gespräch mit `KI.talk(key)`.

## So geht es

1. Menü → Einstellungen → **KI-Gespräche**: eigenen Claude-API-Schlüssel eintragen (Anthropic-Konsole → API Keys), „Schlüssel prüfen“.
   Der Schlüssel bleibt nur in diesem Browser (`SAVE`, `secret`) und geht direkt an Anthropic – nichts davon steht in der öffentlichen Seite.
   Statt des Schlüssels geht auch ein eigener Server, der an die Claude-API weiterleitet und den Schlüssel hinzufügt („Server statt Schlüssel“).
2. Zu Hubert oder Ronald gehen, ansprechen (E / Knopf). Nach der Begrüßung hört das Spiel zu (Mikrofon rot): einfach reden. Nach jeder
   Antwort hört es wieder zu („Zuhören: nach jeder Antwort“) – oder nur per Mikrofon-Knopf. Schreiben geht immer (Textfeld, Enter).
3. Die Antwort kommt Satz für Satz, während das Modell noch schreibt, und wird gesprochen – in der Stimme der Person (`audio/stimme.js`):
   **Gerät** (kostenlos: für jede Person die beste deutsche Stimme des richtigen Geschlechts, die das Gerät hat – in Edge die neuronalen
   Microsoft-Stimmen, auf iPhone/Mac die „Premium“-/„Erweitert“-Stimmen, sonst die Google-Stimme; Alter macht Tonhöhe und Tempo; zwei Personen
   teilen sich eine Stimme nur, wenn es zu wenige gibt, dann klingt die zweite höher oder tiefer; unter „Stimmen der Personen“ von Hand wählbar
   und probehörbar), **ElevenLabs** (eigener Schlüssel, je Person eine deutsche Bibliotheksstimme, z. B. „Darius – Grumpy & Critical“ für Hubert,
   „Silke“ für Katrin, Voice-IDs änderbar) oder nur Text. Piper (natürliche Stimmen im Browser, kostenlos) kommt als weitere Wahl dazu.
4. Ohne Schlüssel bleibt alles wie bisher (aufgenommene Sätze, Themen-Knöpfe); im Gesprächsfenster steht dann „Frei reden – KI-Gespräche
   einrichten …“. Wer darüber den Schlüssel einträgt, redet beim Schließen der Einstellungen gleich frei mit derselben Person (seit 26.10.,
   Falko am iPhone: vorher blieben die Themen-Knöpfe stehen, der Hinweis verschwand). Der Schlüssel wird bei jedem Buchstaben gespeichert.
   Auf dem iPhone öffnet der erste Fingertipp die Sprachausgabe (Safari spricht sonst erst nach einem Tipp).

Spracherkennung: Chrome, Edge und Safari (auch iPhone, Diktierfunktion muss an sein); Firefox hat keine – dort das Textfeld.

## Was sie tun können

| Werkzeug des Modells | Wirkung im Spiel |
|---|---|
| `meinung_aendern` | Meinung über den Spieler 0–100 (Start: Hubert 35, Ronald 45 wie beim Ortsvorsteher), höchstens ±15 je Schritt; ab 65 zählt er als befreundet (`QUESTS.befriend`: freundlichere Begrüßung, Hubert redet länger, Bonus im Wahlkampf) |
| `merken` | eine Notiz über den Spieler; mit `weitererzaehlen` erzählt er es dem anderen beim nächsten Treffen am Tisch |
| `aufgabe_geben` | eine Aufgabe als Daten (`TASKS.define`, im Tagebuch J): 1–3 Schritte aus geprüften Orten (`KI_ORTE`: Ort im Kopfzeilen-Namen oder in der Nähe eines Menü-Orts) und Tätigkeiten (`KI_TUN`: Ereignisse wie `garage:gemaeht`, `fell`, `gplan:gepflanzt`, `einrichtung:schale` …), danach „zurück zu ihm“ (Ereignis `talk`); erledigt hebt die Meinung um die Belohnung (bis 20) und er weiß es im nächsten Gespräch |
| `spielaufgabe` | eine der alten Aufgaben aus `game/quests.js`, die gerade als Knopf angeboten wird (Diesel, Frieda, Brett, Holz …): macht, was der Knopf tut; das Modell sagt den wichtigen Inhalt in eigenen Worten |
| `taetigkeit` | was er nach dem Gespräch tut (`LIFE.force`): Hubert Holz hacken/sägen/stapeln, am Kombi schrauben, Bank, mit dem Traktor ins Dorf, mit Ronald an den Tisch; Ronald füttern, Weide, mähen, Stall, zu Hubert rübergehen – für etwa 2½ Minuten, Fahrt und Mähen bis zum Ende |
| `gespraech_beenden` | er beendet das Gespräch nach seinem letzten Satz |

**Weitererzählen:** Nach jedem Gespräch schreibt eine kleine zweite Anfrage (strukturierte Ausgabe, JSON-Schema) die Zusammenfassung fürs
Gedächtnis und – wenn es etwas gibt – einen kurzen Dialog, in dem er es dem anderen erzählt. Sitzen die beiden das nächste Mal am Tisch vor
Huberts Werkstatt (`npc/life.js`, `LIFE.talkSource`), reden sie darüber statt über ein festes Thema; wer in der Nähe ist, hört es (mit Stimme).
Der Zuhörer merkt sich, was er gehört hat (Notiz „von Hubert“), und seine Meinung ändert sich ein wenig.

## Aufbau

| Teil | Datei |
|---|---|
| Figuren, Welt, Orte, Tätigkeiten (Daten, Deutsch) | `viz3/src/npc/ki_text.js` |
| Gedächtnis (`pav-ki-v1`), Prompts, Werkzeuge und ihre Wirkung, Aufgaben für `TASKS`, Zusammenfassung, Weitererzählen, Sätze für die Stimme – ohne Seite | `viz3/src/npc/ki_core.js` (Unit-Tests `viz3/test/unit/ki.test.mjs`) |
| Gespräch, Spracherkennung, Personen (Nachbarn, Dorfbewohner, angemeldete), Einstellungen (`#kipanel`), Haken | `viz3/src/npc/ki.js` |
| Stimmen je Person: Wahl der Gerätestimme, ElevenLabs, weitere Engines (`STIMME.engine`), Einstellungsteil (`pav-stimme-v1`) | `viz3/src/audio/stimme.js` |
| Lautstärke: eigene Kanäle für Stimmen und Musik, je ein Regler (`pav-ton-v1`, `audio.vol`, `audio.voiceBuf`) | `viz3/src/audio/audio.js`, `#volbox` in `viz3/shell/menu.html` |
| Claude-SDK als eigenes Paket, erst bei der ersten Anfrage geladen (~350 KB, die Seite bleibt so klein wie vorher) | `viz3/src/lazy/anthropic.js` → `dist/lazy/anthropic.js` (`viz3/build.py`) |
| Haken in fremden Modulen | `NPCUI.extend` (`npc/npc.js`), `DORF.extend` (`dorf/dorf.js`), `QUESTS.befriend` und Ereignis `reset` (`game/quests.js`), `LIFE.talkSource` (`npc/life.js`) |
| Aussehen | `viz3/shell/css/ki.css`, Menüknopf `#kibtn` in `viz3/shell/menu.html` |
| Browsertest (gegen einen nachgebauten KI-Dienst auf demselben Server) | `viz3/test/ki.py`, `viz3/extra/ki/tests.txt` |

**Anfragen:** Modell `claude-haiku-5-5`, gestreamt, `thinking: disabled` und `effort: low` (das erste Wort so früh wie möglich, Small Talk
braucht kein Nachdenken), `max_tokens` 600. Der Systemprompt hat zwei Blöcke: die Figur mit Welt und Regeln (immer gleich, mit
`cache_control` – wird zwischengespeichert) und das Gedächtnis (zu Beginn des Gesprächs fest). Jede Spieleräußerung beginnt mit
`<lage>…</lage>` (Zeit, Ort, was er in der Hand hat, Baustand, laufende Aufgaben, Spielaufgaben-Schlüssel, Meinung, beim ersten Mal die
Begrüßung und Erledigtes). Das Gespräch wird nur angehängt, nie umgeschrieben (Prompt-Cache). Werkzeuge: nach `tool_use` gehen die Ergebnisse
gleich zurück, damit er weiterreden kann (höchstens drei Runden); beim Ende bleiben sie liegen. Ein abgebrochener Zug nimmt seine Nachricht
wieder heraus. Kosten (Haiku 5.5: 0,10 $ / 0,50 $ je Million Token, Cache-Lesen ein Zehntel): ein Gespräch meist unter einem Cent; die
Einstellungen zeigen Anfragen und Token des Tages.

**Duzen:** Hubert, Ronald, die Dorfbewohner, der Wahlvorsteher und der Wahlleiter im Dorf duzen den Spieler, der Spieler duzt zurück
(`game/quests.js`, `amt/amt.js`, `amt/amt_data.js`). Huberts 16 aufgenommene Sätze mit „Sie“ sind mit derselben Edge-Stimme neu aufgenommen
(`tools/voices/du_lines.py` auf GitHub Actions, `.github/workflows/stimmen.yml`, Extra `viz3/extra/stimmen/`, `vm_replace` in `build.py`).
Beim „Sie“ bleiben das Bürgerbüro und der Bürgermeister in Schleusingen und der Kassenzettel der Baumschule.

## Offen

- Ein eigener kleiner Server (z. B. Cloudflare Worker), der den Schlüssel hält, damit auch Sarah und Christoph ohne eigenen Schlüssel reden
  können – Feld „Server statt Schlüssel“ ist schon da.
- Die Gespräche am Skattisch und am Feuer könnten das Weitererzählte vorlesen (heute nur die Notizen).
- Echte Probe mit Schlüssel auf iPhone und Laptop (die Tests laufen gegen einen nachgebauten Dienst).
