# Grenzland, Runde 2: Figuren – Menschen, die sich wie Menschen bewegen

Hilfs-Agent `figuren` des Grenzland-Chats (13.11.2026, Paket B). Auftrag: `docs/plans/auftraege/grenzland2-figuren.md`.
Dateien: `viz3/src/grenzland/gl_fig.js` (die Schnittstelle `GLFIG`), neu `viz3/src/grenzland/gl_pose.js` (die Haltungen `GLPOSE`),
`viz3/test/grenzland_figuren.py`, `viz3/extra/grenzland-figuren/tests.txt`.

## Was es gibt

- **Auf dem Moped sitzen wie ein Fahrer** – der Spieler (die Figur des Grundspiels auf der Simson, Ansicht von außen) und jede Figur,
  die reitet (`F.reitet` aus `gl_mission.js`, oder `GLFIG.reite(F, moped)`): Hüfte auf der Sitzbank, Oberschenkel nach vorn und unten,
  Knie gebeugt, Füße auf den Rasten (Schwalbe: auf den Trittbrettern), Arme nach vorn, Hände um die Griffe (sie drehen mit dem Lenker),
  etwas nach vorn gebeugt – so weit, dass die Ellbogen leicht gebeugt bleiben –, Kopf oben. Die Figur neigt sich mit dem Moped in die
  Kurve. Im Stand kommt der linke Fuß auf den Boden.
- **Rennen**: `GLFIG.go(F, x, y, { renn: true })` – nach einem kurzen Antritt 4,6 m/s, dazu der Sprint aus dem Bewegungssatz der
  Spielerfiguren über den Gehschritt gelegt. Ein Tempo über 2,6 m/s läuft auch mit der alten Form `go(F, pts, v)` als Rennen.
- **Gesten** (`GLFIG.geste(F, art, o)`), weich ein- und ausgeblendet (¼ s): `zeigen` (auf `o.ziel`, der Blick geht mit), `nicken`,
  `kopf` (Kopfschütteln), `achsel`, `arme` (verschränkt, gehalten), `winken`, `telefon` (Handy am Ohr, gehalten), `filmen` (Handy vor
  dem Gesicht, gehalten), `haende` (Hände hoch, gehalten), `abwinken`. Das Handy ist ein kleines dunkles Kästchen mit leuchtendem
  Bildschirm in der rechten Hand.
- **Blick** (`GLFIG.blick(F, x, y, z)`): Brust, Hals und Kopf drehen zum Ziel, so weit ein Körper das ohne Umdrehen kann.
- **Sitzen** (`GLFIG.sitz(F, x, y, hd, z)`, `GLFIG.steh(F)`): Hüfte auf die Sitzhöhe `z` über dem Boden, Füße auf den Boden vor dem
  Sitz (über 0,62 m: auf die Stange eines Barhockers).
- **Reden mit Händen**: wer redet (`GLFIG.talking(F, true)`) und steht, bewegt die freien Hände ab und zu und nickt ein wenig; wer
  sitzt, gestikuliert mit der Sitzhaltung des Grundspiels.

## Für den Lead

Die Schnittstelle (alle Aufrufe sind sicher, wenn die Figur fehlt; Koordinaten wie überall im Modus: x Ost, y Nord, z Höhe in Metern):

```js
GLFIG.go(F, x, y, { renn: true, done: F => … })   // rennen (welt: Polizisten zu Fuß; kino: Szenen)
GLFIG.go(F, [[x, y], [x2, y2]], { renn: true })     // eine Strecke rennen
GLFIG.geste(F, 'zeigen', { ziel: [x, y, z] })        // → Dauer in s; ziel auch eine Figur oder 'spieler'
GLFIG.geste(F, 'telefon')                            // gehalten bis GLFIG.geste(F, null)
GLFIG.geste(F, 'nicken', { sec: 2 })                 // o.sec: Dauer (0 = gehalten), o.halten: gehalten
GLFIG.blick(F, x, y, z)                              // z: Höhe in der Welt; ohne: Augenhöhe über dem Boden dort
GLFIG.blick(F, andereFigur) · GLFIG.blick(F, 'spieler') · GLFIG.blick(F, null)
GLFIG.sitz(F, x, y, hd, 0.47)                        // z: Sitzhöhe über dem Boden (wie o.sitz in gl_mission.js)
GLFIG.steh(F)
GLFIG.reite(F, moped) · GLFIG.reite(F, null)         // moped: ein Fahrzeug von GLAUTO mit form 'moped'
```

Felder: `F.gest` (die laufende Geste), `F.look`, `F.sitzt`, `F.reitet`, `F.renn`.

Noch offen: siehe unten (wird fortgeschrieben).
