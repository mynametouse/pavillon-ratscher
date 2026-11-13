# Workshop-Modus (`zukunft/zk_workshop.js`, global `WORKSHOP`)

Der Modus für den großen Bildschirm: Moderator*in zeigt die Zeitreise „Ratscher 2026 → 2060“ im Dorf. Er liest nur `ZKREGIE.state()` und dessen
Ereignisse (später kann ein zweiter Bildschirm folgen) und `ZKCHRONIK` für Daten. Solange beide fehlen, springen die Attrappen aus
`zk_workshop_mock.js` ein (`WSMOCK`, nie benutzt, wenn die echten da sind). Beim ausgeschalteten Modus kostet er nichts (Stil und DOM entstehen
beim ersten Eintritt; zur Ladezeit nur die Menükachel, die Szene und der URL-Test).

## Ein- und Ausstieg
- Kachel „Workshop: Zukünfte erproben“ auf der Startseite des Menüs; Menü → Erleben → Szenen → „Workshop: Zukünfte erproben“;
  URL `?workshop`, `?workshop=allein-gewappnet&autoplay=1` (Beamer: startet gleich), `?workshop=allein` oder `=gewappnet`.
- Im Modus ein Abzeichen „Workshop“ mit „Zurück ins Spiel“. Beim Verlassen kommt alles zurück: Spiel-Oberfläche, angehaltene Systeme,
  Uhr (Zeit, Takt), Lautstärken, Spielerstellung (Pose), Werkbank-Tafel.
- Beim Eintritt werden Strategie-, Zombie-, Grenzland- und Zukunfts-Modus beendet (soweit sie laufen); die Spiel-Oberfläche verschwindet
  über **eine** Körperklasse `ws-on` und CSS (Liste `HUDIDS`), nicht über Eingriffe in viele Dateien. Die Spieltasten (E/Q, Zahlen …) fängt
  ein Capture-Handler ab; in der Werkbank gehen sie durch.

## Ablauf
1. **Startbild:** Titel, ein Satz, kleine Tastenlegende, das **Szenario-Kreuz** (Klima mild/heftig × jeder für sich/gemeinsam; „Allein im
   Sturm“ und „Gewappnet“ wählbar, „Glück gehabt“ und „Rückenwind“ als „kommt in Stufe 2“), Ansicht (Zwei Wege nebeneinander / eine Welt),
   Kapitel (Alles, Wald, Wasser, Energie), „Zeitreise starten“, daneben „Ebenen“, „Werkbank (Einzelthemen)“ und „Zurück ins Spiel“.
2. **Während es läuft:** Schwarzbalken oben und unten, Jahreszahl groß, Kapitelname, die Namen der Welten über den Hälften, Untertitel mit
   Sprechername, Zeitleiste mit Kapitelabschnitten und Ereignismarken (Klick springt), Ereignistitel beim Halt, **Kapitelkarte** (Kennzahlen
   beider Welten nebeneinander, Spannen, Quellenzeile, ein bis zwei Fragen), Pause-Bild (mit den Fragen des Kapitels), Schwarzbild, Ende.
3. Bedienung blendet sich ein, wenn die Maus sich bewegt, und nach 2 s aus.

## Tasten (Presenter/Klicker)
Bild ab / → / ↓: weiter (steht die Zeit still: abspielen; im Menü: starten) · Bild auf / ← / ↑: zurück · Leertaste / K: Pause · B / „.“: Schwarzbild
(hält die Zeit an) · F / F5: Vollbild · L: Ebenen · Esc: zurück ins Workshop-Menü, ein zweites Esc verlässt den Modus.

## Ebenen (`WORKSHOP.layers.list/on/set/reset`)
Jede Ebene schaltet wirklich ein System. Gemerkt je Browser (`pav-workshop-v1`). Voreinstellung für den Workshop – im Zeitraffer vergehen
Jahre, darum kein Alltag; die ruhigen Bilder sparen Rechenzeit der geteilten Ansicht:

| Ebene | Voreinst. | Schalter |
|---|---|---|
| Leute (Dorfbewohner, Nachbarn) | aus | `KERN.mute('dorf/dorf','npc/life')` + Figuren unsichtbar |
| Verkehr (Autos, Spaziergänger) | aus | `VERKEHR.autoOn(false)` + `clear()` |
| Busse | aus | `KERN.mute('bus')` + Busse unsichtbar |
| Tiere | aus | `KERN.mute('tiere', 'tiere-huehner', 'tiere-einfluss', 'hund')` |
| Ortsnamen | an | Körperklasse `ws-no-where` (die Ortsangabe oben) |
| Untertitel | an | `ws-no-sub` |
| Stimmen | an | `audio.vol('stimmen')` (gemerkte Lautstärke zurück beim Einschalten und beim Verlassen) |
| Umgebungston | an | `audio.vol('umgebung')` |
| Jahreszahl und Zeitleiste | an | `ws-no-year` |
| Kennzahlen am Kapitelende | an | `ws-no-card` |
| Daten-Ansichten (Lärm, Verkehr, Sonne, Naturwert, Stimmung) | aus | `WDATEN.set(…)`, nur in der Draufsicht sichtbar |

## Haken in gemeinsamen Dateien
- `core/kern.js`: `KERN.mute(name, on)` – ein benannter Takt (`KERN.tick`) läuft nicht, solange er stumm ist.
- `strategie/st_hud.js`: Zeile 47 – `#stlayers` bekommt Schrift und Farbe wie die anderen Kästen (Falkos Fehler: Häkchen ohne Schrift).
- `modules.txt`: zwei Zeilen unter `# feat/zeitreise`.

## Test
`viz3/test/workshop.py` (Abschnitte `start,ebenen,spiel,ende,strategie,telefon`), `viz3/extra/workshop/tests.txt`; Bilder in `out/workshop/`.
