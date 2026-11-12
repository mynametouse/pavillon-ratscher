# Zukünfte erproben – der Was-wäre-wenn-Modus (feat/zukunft)

Falko, 5.11.2026: „Möglichkeitsraum, in dem Zukünfte virtuell erprobt werden, ausgehend von einer digitalen Spiegelwelt. Desto realer die
Spiegelwelt, desto wertvoller die erprobbaren Szenarien.“ Erste Fassung (12.11.2026, Hilfs-Agent `zukunft`, Auftrag
`docs/plans/auftraege/zukunft.md`): der Kern eines halben Tags im Dorf – Moderation, Beamer, eine Gruppe aus Ratscher (Ortsteil von
Schleusingen).

## Was es gibt

- **Aufruf:** Menü → Erleben → Szenen → „Zukünfte erproben“, `?szenario=zukunft`, Knopf „🔮 Zukunft“ in der Leiste des Strategie-Modus. Es läuft
  von oben (Knopf „Von oben ansehen“ setzt die Draufsicht auf den Ort des Themas) und zu Fuß („Hingehen: …“).
- **Vier Themen**, je „Heute“ und Varianten (`viz3/src/zukunft/zk_data.js`):
  - *Mobilität:* Mitfahrbank am Anger · Rufbus auf Bestellung · sechs Fahrten mehr nach Schleusingen. Grundlage: der echte Fahrplan
    (`BUS.plan`, gtfs.de: Fahrten werktags von Ratscher nach Schleusingen und die Fahrzeit, aus den Haltestellen „Ratscher …“ und „Schleusingen …“).
  - *Energie:* Solarmodule auf den geeigneten Dächern (aus den 3D-Dächern gezählt) · Solarpark am Ortsrand (Annahme für den Platz) ·
    Wärmepumpen in den Häusern (Nahwärme als Zahl im „Warum?“).
  - *Klimaanpassung:* Starkregen ohne / mit Vorsorge · Hochwasser der Schleuse · Dürresommer.
  - *Wald nach dem Käfer:* natürliche Verjüngung · Waldumbau (Mischwald pflanzen).
- **Jahr:** Regler 2026 · 2030 · 2035 · 2045 · 2060; Welt und Zahlen folgen.
- **Nebeneinander:** Spalten Heute · A · B; A und B sind frei aus den Varianten des Themas wählbar. „Die Welt zeigt: Heute | A | B“ und die
  Taste **Y** (A ↔ B) setzen die Welt sofort um – es gibt nur eine Welt, die Variante wird hinein gesetzt und beim Wechsel oder Beenden
  zurückgenommen.
- **Fünf Kennzahlen**, je mit „?“ (Warum): Kosten (Investition und jährlich, mit Spanne) · CO₂ (t/Jahr gegenüber heute, minus ist gut) · Lärm
  (Stufe 0–4, betroffene Häuser) · Naturwert (0–100, Ausgangswert `TEINFLUSS.naturwert()` wie im Entdeckerbuch, plus Änderung) · Stimmung (Mittel
  der Haltungen der Dorfbewohner aus „Wahl und Amt“, drei bis vier Stimmen mit Grund). Jede Zahl auf zwei Stellen gerundet, Spannen wo unsicher,
  jedes „Warum?“ sagt „Annahme“ oder nennt Quellen mit Link.
- **In der Welt zu sehen** (`zk_welt.js`, alles rückgängig bei „Beenden“): Solarmodule auf den Dachflächen (instanziert, ein Material; die
  Ebenen der Dach-Dreiecke der 3D-Gebäude: Neigung 10–60°, bis 70° von Süd, ab 5 m², Randabstand 0,3 m; Flachdächer mit aufgeständerten Reihen;
  die Belegung wächst Dach für Dach mit dem Jahr), ein Solarpark aus Modultischen (Reihen von Süd nach Nord), Wärmepumpen-Außengeräte an der
  längsten Wand von Wohnhäusern, die Mitfahrbank (der Bau der Ortsvorsteher-Welt `AMTWORLD`, eigene wird beim Beenden entfernt, eine echte bleibt),
  ein Rufbus-Schild mit Kleinbus an der Schulbushaltestelle, das Hochwasser (ein Band entlang des Tals, dessen Ränder dem Gelände folgen, auf
  dem gewählten Pegel), nasser Boden und Starkregen über die Wettervoreinstellung `starkregen` (`WETTER.preset`), trockener Boden und gelbes
  Gras im Dürresommer (Haken `WXBODEN.setDry`) mit gestressten Fichten, und der Wald: die Fichten werden nach einer Kurve „getroffen“ (rotbraune,
  dann graue Kronen über `FOREST.tint`), nach 2,5 Jahren geräumt (die Höhe schrumpft) und wachsen als Pionierwald bzw. gepflanzter Mischwald nach
  (Höhe nach dem Alter; `t.h`/`t.w` und `FOREST.retilt`; beim Beenden steht alles wieder wie vorher).
- **Präsentation:** Knopf im Kopf des Fensters: große Schrift, Fenster breiter, Hotbar, Joystick und Menüknopf aus – nur Fenster und Welt. Maus und
  Tastatur; am Handy ein Blatt unten (die Telefone der Teilnehmenden kommen später).
- **Lernen:** zehn Einträge im Entdeckerbuch (Mitfahrbank, Rufbus, Wann ein Bus dem Klima nützt, Dach-PV, Solarpark, Wärmepumpe, Starkregen,
  HQ100, Dürresommer, Waldumbau, Natürliche Verjüngung), jeweils gefunden, wenn die Variante in der Welt gezeigt wird.
- **Gespeichert:** `pav-zukunft-v1` (über `SAVE`, mit Prüfung): Thema, Jahr, Varianten A/B je Thema, was die Welt zeigt, Präsentation, ob der Modus an
  war (nach dem Neuladen geht er weiter).

## Ehrlichkeit der Zahlen

- Fest aus Quellen: PV-Ertrag ≈ 1000 kWh/kWp bei Ratscher (PVGIS, wie im Entdeckerbuch „Strom von der Sonne“), PV-Kosten 700–2000 €/kW (Fraunhofer
  ISE 2024), Strommix ≈ 0,38 kg/kWh (UBA), Gemeindebeteiligung 0,2 ct/kWh (§ 6 EEG), reine Rufbuslinien in Thüringen (Landtag Drs. 7/8819),
  Nachtrichtwerte (TA Lärm).
- **Annahmen** (so im Fenster gekennzeichnet): Kosten je Rufbus-Fahrt, Fahrgastzahlen, Schadenssummen und betroffene Häuser bei Starkregen,
  Hochwasser und Dürre, der Hochwasser-Pegel (die Hochwassergefahrenkarte des Landes war vom Chat-Rechner nicht abrufbar – im „Warum?“ steht,
  dass sie zu prüfen ist), der Platz des Solarparks, der Verlauf des Fichtensterbens (Kurve `DIEBACK`), Flächen- und Kostenwerte des Waldumbaus,
  Entwicklung des Strommix, Fahrzeugflotten und Preise nach 2026.
- Die Dorfbewohner (Stimmung) sind Figuren des Spiels – keine Umfrage in Ratscher; das steht im „Warum?“.

## Schnittstelle Modus ↔ Welt (zk_modus.js ruft zk_welt.js)

`ZKWELT.warm()` (einmal beim Start, kompiliert alle Materialien) · `ZKWELT.apply(world, jahr)` (eine Variante sofort in die Welt setzen; `world`
kommt aus `ZKDATA.calc(...).world`: pvRoof, pvField, wp, bank, rufbus, wet, rain, flood, dry, forest) · `ZKWELT.clear()` (Beenden: alles wieder
„Heute“) · `ZKWELT.ctx()` (Zahlen aus der Welt für die Kennzahlen: Dach-kWp, Fahrplan, Naturwert). Genauer im Kopfkommentar von `zk_welt.js`.
Ab dem ersten Push gehört `zk_welt.js` dem Helfer `zukunft-welt` (Branch feat/zukunft-welt); `zukunft` ändert die Datei nicht mehr.

## Testen

- Ohne Browser: `node --test viz3/test/unit/zukunft.test.mjs` (jede Variante und jedes Jahr: fünf Kennzahlen mit Grund, Annahme oder Quelle;
  Rundung; Plausibilität; die Kurve des Waldes).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9007 --serve zukunft` (Abschnitte
  `start,mobil,energie,klima,wald,warum,praes,telefon,reload,ende`); auf GitHub über `viz3/extra/zukunft/tests.txt` (dazu `strategie`, `wissen`),
  Bilder in `out/zukunft/`.

## Offen (nicht in dieser Fassung)

- Shader-Programme: `zukunft-welt` hat gezeigt, dass `ZKWELT.warm()` alles abdeckt; die früher gezählten Programme kamen vom Laden der Welt an den Kamerapunkten. Der Test besucht darum zuerst jede Ansicht und verlangt danach 0 neue Programme (`MAX_NEW = 0`).
- Der Fahrplan-Wert „Fahrzeit nach Schleusingen“ ist der Mittelwert von der ersten Ratscher- bis zur letzten Schleusinger Haltestelle (im Test 6 min).

- Mitmach-Schicht (Kommentare an Orten), Moderator-/Handy-Synchronisation, echte hydraulische Simulation.
- Die Lage des Hochwasserbands ist aus dem Luftbild und dem Gelände abgeleitet (Tal der Schleuse), nicht aus der Hochwassergefahrenkarte.
- Gebäude jenseits des Quadrats und die Falko-Gartenbauten tragen keine Module; eine Rufbus-Fahrt, ein Starkregen-Abfluss sind nicht animiert.
- Nur eine Mitfahrbank (die der Ortsvorsteher-Welt); „zwei Bänke“ wären ein Zweiteiler.

## Für den Lead

- Gemeinsame Dateien (markiert `feat/zukunft`): `viz3/src/wetter/wx_boden.js` – `S.dry`, `setDry(v)`, `dk` je Bodenart, ein `import * as THREE`,
  eine Farbe `DRYC` (nur Farben, kein Programm); `viz3/src/modules.txt` – Block `# feat/zukunft` (3 Module) nach `wissen/wissen_daten.js`.
- Neuer Speicher-Schlüssel `pav-zukunft-v1` (bitte in `docs/ARCHITECTURE.md` §8 eintragen). Neue `window`-Namen: `ZKWELT`, `ZUKUNFT`.
- Credits: `credits_add` in `viz3/extra/zukunft/manifest.json`.
