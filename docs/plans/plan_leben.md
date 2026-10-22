# Leben in Garten und Dorf – Falkos Wünsche vom 23.10.2026 (0:13–1:23)

Grundlage für die Arbeit der Nacht vom 22. auf den 23.10.2026 (Kern-Chat mit Hilfs-Agenten). Falko (1:05, 1:15): was die Tests besteht, geht
direkt live; neue Stände zwischendurch in die Vorschau, damit er sie früh ausprobieren kann – keine Freigabe abwarten.
Die Feature-Pause des Umbau-Plans (`claude/pavillon-umbau.md`) ist damit für diese Wünsche aufgehoben.

## 1 Nachbarn

### Hubert (Westen)
- 70–75 Jahre, etwas älter als Ronald. Geht manchmal ein bisschen hinkend. Schnurrbart, dunkle Haare. Arbeitskluft: einfaches, hell
  kariertes Arbeitshemd, Arbeitshose, Arbeitsschuhe. *(Figur in der Vorschau seit 23.10. 1:28; das Gesicht wirkt noch zu jung.)*
- Die Gebäude auf seiner Seite sind **nach Osten offene, überdachte Werkstätten**, in denen er Werkzeug hat.
- Er **hackt viel Holz, sägt Holz klein** und stapelt es in kleinen, hohen **Trockenhütchen**, die er selbst gebaut hat: etwa 1 × 1 m,
  2 m hoch, mit kleinen **Ziegeldächern**, die er auch selbst baut. Das macht er eigentlich die ganze Zeit.
- Er **repariert oft sein Auto**: einen **Ford Mondeo Kombi, etwa Baujahr 2005**. Den fährt er auf eine kleine **selbstgebaute Rampe**
  und repariert ihn eigentlich ständig. Also: entweder Holz hacken oder reparieren.
- Manchmal fährt er mit dem **Traktor ins Dorf**, etwa zur Dorfmitte, steigt ab, geht in ein Haus, kommt wieder heraus und fährt zurück.
- Aufgaben (Quests) dürfen auf diesen Tätigkeiten aufbauen.

### Ronald (Osten)
- Etwas jünger, etwa 60. **Kein Hut** – höchstens eine Schiebermütze, und nur, wenn sie richtig sitzt.
- Seine **Ziegen** sind weiter südlich: etwa auf der Höhe der **Südgrenze von Falkos Grundstück**, dort eingezäunt.
- Er fährt oft mit einem **Traktor hin und her und mäht** z. B. die Wiese; er **füttert die Ziegen**.
- Manchmal geht er **zu Hubert rüber**; dann sitzen die beiden **am Tisch oder beim Auto auf Stühlen vor der Werkstatt** und reden über
  das, was im Dorf passiert. Auch hier sind Aufgaben interessant.

## 2 Dorfleben
- **Freitags Skat- und Rommé-Abend** in der **alten Schule** (das kirchenartige Gebäude im Dorf). Dort treffen sich alle, es werden
  Geschichten erzählt. Eine Aufgabe dazu wäre schön.
- Manchmal ein **Feuer auf dem Acker Richtung Klinge**, wo das Dorf zusammenkommt.
- Mit den verschiedenen **Dorfbewohnern** in Kontakt treten können.

## 3 Spielfiguren (wählbar)
- **Falko**: die bisherige Männerfigur – passt, nicht ändern.
- **Sarah** (Falkos Freundin): nicht blond, sondern **brünett mit gelockten Haaren**. Arbeitet an der **ockerfarbenen Holzhütte**, kümmert sich
  um die **Pflanzen** und das **Gewächshaus**.
- **Christoph** (Falkos Bruder): trägt gern eine **Schildmütze**, manchmal **Kopfhörer** in den Ohren, ganz leichter Bart, **etwas
  muskulöser** als Falko und **minimal kleiner**.

## 4 Garten
- **Gewächshaus**: die Eingangstür zeigt nach **Norden** (nicht nach Westen).
- **Ockerfarbene Holzhütte** (Sarahs Hütte): Eingangstür nach **Norden** (nicht nach Süden); das Dach fällt nach **Westen** ab (nicht nach
  Osten); die Fenster zeigen richtig. **Liebevoller einrichten.**
- **Grüner Bungalow** (Eingang von Norden):
  - gleich **rechts in der Ecke die Küche**, auf derselben Seite weiter hinten ein **Sofa**;
  - geradeaus durch kommt die **zweite Tür (Ausgang)**; **links daneben ein taubenblauer, fast weißer Kleiderschrank**, links daneben das
    **Bett für zwei**;
  - in der Mitte hängt eine **Glühbirne**; sonst gemütlich – passende gemütliche Gegenstände und Einrichtungsideen;
  - links ein **Anbau** (eine kleine angebaute Garage, ausgebaut zum Raum): etwa 1 m nach dem Eingang buchtet die linke Wand ~1,5 m
    aus, dort steht das Bett; von außen sieht es aus wie ein kleiner Anbau.
- **Alle Gebäude** liebevoller, realistischer, detaillierter und **interaktiver** ausstatten.

## 5 Bildschirm (erledigt, Vorschau 23.10. 1:28)
- „Neu“-Hinweise höchstens einer je Besuch, Antippen schließt ihn; Knopf „Sicht“ (freie Sicht); Aufgabenkarte faltet sich; Ortsname
  verblasst; Kopfzeile am Handy beim Gehen weg; Querformat.

## Umsetzung in der Nacht (Kern-Chat, Hilfs-Agenten)

| Thema | Branch | Eigene Dateien | Gemeinsame Dateien – nur hier |
|---|---|---|---|
| Garten: Türen, Dach, Bungalow mit Anbau, Hütte, Gewächshaus, Einrichtung | `feat/garten` | `garden/bungalow.js`, `garden/holzhaus.js`, `garden/greenhouse.js`, neue `garden/*_in.js`, `viz3/extra/garten/`, `shell/css/garten.css`, `viz3/test/garten*.py` | `modules.txt` unter `# feat/garten`, `garden/places.js` (Raumnamen) |
| Spielfiguren Falko, Sarah, Christoph | `feat/figuren` | `game/avatar.js`, `tools/player/*` (neue Skripte), `viz3/extra/figuren/`, `shell/css/figuren.css`, `viz3/test/figuren*.py` | Figurenwahl in `shell/menu.html`, `modules.txt` unter `# feat/figuren` |
| Nachbarn: Huberts Hof (Werkstätten, Trockenhütchen, Mondeo auf Rampe), Alltag beider, Ziegen nach Süden, Mähen, Gespräche, Aufgaben | `feat/nachbarn` | `npc/*`, `game/quests.js`, neue `garden/hof_*.js`, `viz3/extra/nachbarn/`, `shell/css/nachbarn.css`, `viz3/test/nachbarn*.py` | `modules.txt` unter `# feat/nachbarn …` |
| Dorfleben: Skatabend in der alten Schule, Feuer am Acker, Dorfbewohner | `feat/dorf` | neuer Ordner `viz3/src/dorf/`, `world/village*.js`, `viz3/extra/dorf/`, `shell/css/dorf.css`, `viz3/test/dorf*.py` | `modules.txt` unter `# feat/dorf` |

Regeln: `docs/PARALLEL.md`; Browser im Chat-Rechner nur über `tools/browser_lock.sh` und mit eigenem Port; GitHub Actions
`.github/workflows/feat.yml` prüft jeden Push auf `feat/**` und hebt Bilder auf; kleine eigene Dateien über `viz3/extra/<thema>/`.
