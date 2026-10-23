# Alte Blechgarage: Schiebetore nach Norden, Werkzeug, Rasenmäher mit Benzin (feat/garage, 23.10.2026)

Grundlage: Falkos Nachricht vom 23.10.2026, 10:53 (Auftrag `docs/plans/auftraege/garage.md`): zwei Schiebetüren nach Norden, Geräte drin,
den Rasenmäher herausholen und den Rasen mähen, Werkzeug in den Regalen, Benzin für Mäher und Aggregat.

## Was es gibt

| Was | Wo im Code |
|---|---|
| **Garage von Bauphase 0** (4 × 4 m Wellblech auf der Platte): Wände West, Süd (jetzt geschlossen), Ost; Nordseite mit 2,5 m breiter Öffnung, Sturz, verzinkte Winkel; oben eine **Laufschiene**, die über beide Ecken hinausläuft | `garden/garage.js` (vorher der Block oben in `pavilion/house_common.js`) |
| **Zwei Schiebetore** (Stahlrahmen mit Wellblech, je zwei Rollen in der Schiene, Griff außen und innen, Überwurf mit Vorhängeschloss am Osttor): jedes einzeln „Tor aufschieben“ / „Tor zuschieben“, schiebt sich in gut einer Sekunde 1,3 m zur Seite, mit Blechrumpeln; es hält Fußgänger und Fahrzeuge dort auf, wo es gerade steht (`VEH.extra`) | `garden/garage.js` (Tore), `garden/garage_play.js` (Schieben, Ton, Kollision) |
| **Innen**: Schwerlastregale an West- und Ostwand (Kartons, Kisten, Farbdosen, Öl, Sprühdosen, Blumentöpfe, Kabeltrommel, Heckenschere, Werkzeugkoffer rot und blau), Werkbank an der Südwand mit Schraubstock und Lochwand (Säge, Hammer, Schraubendreher, Schlüssel, Zangen, Winkel), Gartengeräte an der Wand (Spaten, Rechen, Hacke, Grabegabel, Besen), Erdsäcke und alte Reifen, Schubkarre, Bügelsäge und Schlauchtrommel, Leuchtstoffröhre | `garden/garage.js` |
| **Rasenmäher** (Benzin, grünes Stahlgehäuse, Grasfangkorb): „Rasenmäher nehmen“ am Griff → man schiebt ihn (er bleibt vorn, dreht mit dem Blick, S zieht ihn zurück, er stößt an), „Motor starten“ (Seilzug; kalt erst beim zweiten Zug; nur mit Benzin), wo der laufende Mäher fährt, wird der Rasen kurz (Streifen hell/dunkel je Richtung) und wächst in 5 Spieltagen nach; Tank 1 l ≈ 1 Spielstunde; Q lässt los (Sicherheitsbügel: der Motor geht aus) | `garden/garage_play.js`, Mäh-Schnittstelle `GRASS.cut/grow/cutSave/cutLoad/cutArea` in `garden/grass.js` |
| **Roter Benzinkanister** (10 l): „Rasenmäher tanken“, „Aggregat tanken“; leer ist er am nächsten Morgen wieder voll (Tankstelle) | `garden/garage_play.js` |
| **Stromaggregat an der Werkstatt läuft mit Benzin**: Tank 12 l, leert sich, solange Maschinen laufen (1,1 l/h); leer bleiben die Maschinen aus; Anzeige „Stromaggregat (Benzin) · Tank …“, mit dem Kanister „Aggregat tanken“ | `garden/garage_play.js`, Beschriftung `garden/workshop.js` |
| **Huberts Dieselkanister** (jetzt olivgrün, der rote ist Benzin) steht in der alten Garage (Phase 0) bzw. an der Garage am Südende (ab Phase 1); Text der Aufgabe und Huberts Antworten (als Untertitel) nennen die Garage; durch das geschlossene Tor nimmt man nichts | `game/quests.js` (Diesel-Teile), `GARAGE.home` |
| Ab Phase 1 (Garage versetzt) stehen Mäher und Kanister an der Nordseite der Garage am Südende (folgt ihr in der Draufsicht) | `GARAGE.home` in `garden/garage.js` |
| Ort „Alte Garage“ (schon da), Sprungziel `garage`, Startsituation `?szenario=garage` (Bauphase 0, vor dem Tor), innen „drinnen“ (`KERN.inside`) | `garden/garage_play.js` |
| Gespeichert: `pav-garage-v1` (Tore, Mäher: Ort, Richtung, Tank; Kanister: Ort, Inhalt; Aggregat-Tank; gemähter Rasen als Raster 0,5 m, Stunden seit dem Mähen, lauflängenkodiert) | `core/save.js` (eine Zeile), `garden/garage_play.js` |

Ereignisse: `garage:start` beim Anspringen, `garage:gemaeht` `{ m2, gesamt }` beim Abstellen (und alle 10 m² während des Mähens, dann mit
`laeuft: true`) – für eine spätere Aufgabe („Rasen mähen“).

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8984 --serve garage:nogeo=1     # ~8 min
```

Abschnitte (`only=doors+inside+mower+petrol+diesel+reload`): Tore zu/halb/offen, sie halten auf, Südwand zu; Bilder innen; Mäher
herausschieben, drehen, starten, Streifen mähen (gekürzte Büschel gezählt), Tank sinkt, leerer Tank stoppt, Q, tanken, zurück in die
Garage; Aggregat (Benzin, tanken, leer → Maschinen aus); Dieselkanister in der Garage, nicht durchs Tor, Phase 1 an der Garage im Süden;
Neuladen behält Mäher und gemähten Rasen, nach gut 5 Spieltagen ist er nachgewachsen. Bilder in `out/garage/`.
Bei GitHub läuft `garage` bei jedem Push auf `feat/garage` mit (`viz3/extra/garage/tests.txt`).

## Für den Kern-Chat

- Gemeinsame Dateien (klein): `viz3/src/modules.txt` (zwei Marken mit je einem Modul: `garden/garage.js` unter `garden/fences.js`,
  `garden/garage_play.js` unter `werk/kran.js`), `core/save.js` (eine Zeile `pav-garage-v1`), `pavilion/house_common.js` (der alte
  Garagenblock ist jetzt ein Verweis), `pavilion/phases.js` („zwei Schiebetore nach Norden“ statt „Zufahrt von Süden“, A und B),
  `garden/grass.js` (Mäh-Schnittstelle; `footHideReg` merkt sich die Art: Rasen, Blume, Pflanze), `garden/workshop.js` (Beschriftung),
  `game/quests.js` (nur Diesel-Teile: Ort und Farbe des Kanisters, Text, zwei Antworten Huberts als Untertitel statt der Aufnahme, Umzug
  alter Spielstände).
- `docs/ARCHITECTURE.md`: neue `window`-Namen `GARAGE`, `GPLAY`; Schlüssel `pav-garage-v1`; Modulkarte `garden/garage.js`,
  `garden/garage_play.js`; `GRASS` hat jetzt eine Schnittstelle (mähen).
- Die Aufnahmen `hubert_t_q_hilfe` / `hubert_t_q_kanister` (Aggregat) werden nicht mehr gespielt; neu vertonen wäre: `tools/voices/lines3.py`.
