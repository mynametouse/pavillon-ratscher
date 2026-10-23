# Seilwinde am Traktor (V16h, Branch `feat/winde`)

Falko, 23.10.2026 2:24: Baum an der Unteren Klinge gefällt, mit dem Traktor kam er zwischen den Bäumen nicht an den Stamm – „Müsste man den
nicht irgendwie rausziehen mit einer Seilwinde?“ Genau so wird es gemacht: Der Traktor bleibt auf dem Weg, die Dreipunkt-Forstseilwinde am
Heck zieht den Stamm aus dem Bestand.

## So geht es (im Spiel)

1. **Traktor auf den Weg stellen**, Heck Richtung Stamm, anhalten. Ein angekuppelter Anhänger muss vorher ab (K) – sein Zugmaul sitzt unter
   der Winde. Am besten den Anhänger ein Stück weiter vorn auf dem Weg abstellen, nicht hinter dem Traktor.
2. **Winde absenken**: im Traktor **N** (am Telefon der Knopf mit der Seiltrommel am Tacho) – oder zu Fuß am linken Kotflügel
   („Winde absenken (Außenbedienung)“). Das Rückeschild greift in den Boden und hält den Traktor; so lange fährt er nicht.
3. **Seil ausziehen**: zu Fuß hinter die Winde, **E** (bzw. antippen). Mit dem Haken in der Hand zum Stamm gehen – das Seil spult ab und liegt
   hinter einem auf dem Boden, höchstens **50 m**.
4. **Seil anschlagen**: am näheren Stammende **E** – die Chokerkette kommt ums Stammende.
5. **Aus dem Gefahrenbereich gehen**: nie in der Seillinie, nicht neben dem Stamm (Seil kann reißen, der Stamm ausschlagen). Steht man dort,
   startet die Winde nicht.
6. **Einholen per Funk**: **E** „Seil einholen (Funk)“ – der Stamm kommt mit dem angeschlagenen Ende voran über den Waldboden, etwa einen
   halben Meter pro Sekunde, bis er am Rückeschild liegt. Nochmal **E** stoppt. Hängt er an einem Baum fest, bleibt die Winde stehen:
   Choker lösen und am anderen Ende anschlagen oder den Traktor versetzen.
7. **Rücken (optional)**: Liegt der Stamm am Schild, hebt **N** die Winde ein Stück an – das Stammende wird angelüftet, und der Traktor
   schleift den Stamm beim Fahren hinterher, z. B. bis zu einer breiten Stelle am Weg. **N** legt ihn wieder ab.
8. **Choker lösen** (am Stammende, **E**), dann hinter der Winde **„Seil an der Winde einhängen“**, Winde anheben (N oder Außenbedienung).
9. **Aufladen mit der Gabel**: wie bisher – die Gabel muss **quer** unter den Stamm, also von der Seite heranfahren (G ganz runter, darunter,
   R heben, T kippen). Höchstens 1500 kg.

Hinweise, wenn die Gabel nichts hebt: Der Traktor sagt jetzt, warum – Stamm liegt längs zur Gabel, Zinken nicht darunter, noch nicht weit
genug untergefahren, zu schwer, noch ein Seil daran, oder der Baum ist noch nicht aufgearbeitet (erst entasten, ablängen, **vermessen** –
Waldbuch B; erst dann gibt es Stammstücke für Gabel und Winde). Das war vermutlich Falkos Fall am 23.10.

## Code

| Was | Wo |
|---|---|
| Windenmodell (Rahmen, Rückeschild mit Zähnen, Schutzgitter, Trommel, Seilrolle und Seilführung oben, Funkempfänger, Gelenkwelle, Dreipunkt mit Unterlenkern, Oberlenker, Hubarmen), Heben/Senken, Kollision, gespeicherte Hubhöhe | `viz3/src/vehicles/tractor.js` (`model.winch`, `winchPose`, `model.hold`) |
| Seil, Choker, Ziehen des Stamms, Funk, Gefahrenbereich, Rücken, Töne, Speichern | `viz3/src/werk/winde.js` (`WINDE`) |
| Stamm am Seil (Zustand `winch`, gespeichert als liegend), Gabel-Hinweise | `viz3/src/werk/holz.js` (`whyNot`, `moved`) |
| Noch nicht vermessener Baum in der Nähe | `viz3/src/world/fell.js` (`FELL.openStem`) |
| Traktor gehalten, solange die Winde unten ist (1 Zeile) | `viz3/src/vehicles/vehicle.js` (`model.hold`) |
| Knopf am Tacho | wird von `werk/winde.js` in `#vhud .vbtns` eingesetzt; Stil `viz3/shell/css/winde.css` |

Gespeichert: die Hubhöhe der Winde als dritter Wert des Traktors in `pav-veh-v1` (fehlt er – ältere Stände –, ist sie oben); Seil und
angeschlagener Stamm in `pav-holz-v1` unter `part2.winde` (`c`, `out`, `end`, `log`, `ae`, `sh`); der Stamm am Seil steht dort als `ground` mit
seiner Lage – ältere Builds lesen ihn als liegenden Stamm. Kaputte Werte werden ignoriert (Seil wieder auf der Trommel).

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8975 --serve winde            # alles (~15 min)
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8975 --serve winde:model,pull  # Abschnitte: model,pull,fork,skid,stuck,save,hints
```

Bilder in `out/winde/` (Winde oben/unten, Seil ausgezogen, Choker, Ziehen, am Schild, Gabel, Anhänger, Rücken, festgehangen).
Bei GitHub läuft der Test bei jedem Push auf `feat/winde` mit (`viz3/extra/winde/tests.txt`).
