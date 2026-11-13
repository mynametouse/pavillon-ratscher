# Grenzland, Runde 2 – eine Welt, die einen bemerkt (Hilfs-Agent `welt`, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland2-welt.md` (gemeinsamer Teil `grenzland2-gemeinsam.md`). Branch `feat/grenzland-welt`.
Dateien: `viz3/src/grenzland/gl_fahndung.js`, `gl_logik.js`, `gl_heli.js`, `gl_handy.js`, neu `gl_reaktion.js`, `gl_reaktion_data.js`,
`gl_ereignis.js`; Test `viz3/test/grenzland_welt.py`, Unit-Test `viz3/test/unit/grenzland_welt.test.mjs`, CI-Zeilen
`viz3/extra/grenzland-welt/tests.txt`.

## 1. Was die Polizei weiß (Gesicht, Kleidung, Fahrzeug)

Wie in den Vorschauen zu GTA 6: Die Polizei kennt nur, was jemand gesehen hat, und ihr Wissen verfällt, wenn sich die Tatsachen ändern.

- **Beschreibung** (`GL.W.bild`, reine Regeln in `GLLOGIK.sicht` / `GLLOGIK.wissen`, ohne Browser getestet): wer (Mann/Frau), Gesicht,
  Kleidung (mit Kopfbedeckung), Fahrzeug, „zu Fuß“, wo und in welche Richtung.
  - Gesicht: nur von nah und im Hellen – tagsüber bis 9 m, nachts bis 4 m (die Taschenlampe im Gesicht); oder ein Zeuge, der Falko und
    Sarah kennt, nennt die Namen. Eine Meldung ohne Abstand (ein Anruf) bringt nie ein Gesicht.
  - Kleidung: tagsüber bis 34 m, nachts bis 15 m. Fahrzeug: bis 70 m, sobald die Streife es eine Sekunde gesehen hat (wie bisher `W.fz`).
  - Zeugen beschreiben, wie der Spieler **zum Zeitpunkt der Tat** aussah und aus welcher Entfernung sie es sahen (die Meldung kommt
    Sekunden später); wer niedergeschlagen wurde, sah das Gesicht.
- **Was davon noch passt** (`GLFAHNDUNG.stand().wissen = { gesicht, kleidung, fahrzeug }`): Helm oder Sturmhaube verdecken das Gesicht,
  solange sie getragen werden, und gehören zur Kleidung; andere Jacke → Kleidung passt nicht mehr; ausgestiegen → Fahrzeug passt nicht
  (wieder aufgestiegen auf dasselbe Moped: passt wieder – das Moped ist bekannt). Neues Kennzeichen → Fahrzeug unbekannt.
- **Wirkung auf die Suche:** Mit Helm erkennt niemand den Spieler beim bloßen Hinsehen (die Sterne bleiben hohl, nur ein Name füllt
  sie); passt nichts mehr von der Beschreibung, läuft die Suche 1,4-mal so schnell aus.
- **Der Helm:** hängt am Moped im Garten („Helm mitnehmen“, `GL.inv.helm`); danach setzt der Spieler ihn auf dem Moped von selbst auf (wie
  in GTA), ein roter Jethelm aus `GLFIG.hatOn` auf dem Kopfknochen der Spielfigur. Die Tat „Fahren ohne Helm“ zählt nur noch ohne Helm.
- **Die Warnjacke:** am Bungalow „Warnjacke anziehen / ausziehen“ (vorher „Umziehen“, nur mit Sternen). Sichtbar über die eigene
  Umfärbung des Spiels (`AVATAR.wear`, wie die Forstkleidung; keine neue Textur, kein neues Shader-Programm). Mit Sternen gilt weiter die
  Regel von vorher (`GLLOGIK.umziehen`: hohle Sterne sind sofort weg, ein Name bleibt ein Name; nicht, wenn jemand zuschaut).
- **Streifenwagen:** `stand().cars[i].gesehen` – dieser Wagen sieht den Spieler gerade oder hat ihn in den letzten 4 s gesehen.

## 2. Der Polizeifunk beschreibt den Spieler

Feste Satzteile nacheinander (`await STIMME.say('gl_funk', teil)` je Teil, damit `stimmen` jeden einzeln aufnehmen kann), der Untertitel
zeigt den ganzen Satz einmal (`GLHUD.sub('Funk', …)`):

„Zentrale an alle Streifen.“ · „Gesucht wird eine Person,“ / „Gesucht wird Falko,“ / „Gesucht wird Sarah,“ (Name nur, wenn bekannt) ·
„männlich,“ / „weiblich,“ · Kleidung („rotes Karohemd,“ – Falko, „dunkle Jacke,“ – Sarah, „orange Warnjacke,“, „helle Jacke,“,
„grüner Parka,“) · „mit Helm,“ / „mit Sturmhaube,“ · Fahrzeug („auf einem Moped.“, „in einem Trabant.“, „in einem Auto.“,
„auf einem Traktor.“, „zu Fuß.“) · Richtung („Richtung Schleusingen.“, „Richtung Ratscher.“, „Richtung Talsperre.“, „Richtung Klinge.“)
oder Ort („Zuletzt gesehen in Ratscher.“ …) · „Kommen.“

- Wann: bei einer neuen Fahndungsstufe (nach dem Satz „Rennsteig für Schleuse 12 …“), wenn die Beschreibung wächst (höchstens alle 20 s),
  und wenn der Spieler sich verändert hat – dann mit der **alten** Beschreibung: „Weiterhin gesucht wird eine Person, … rotes Karohemd …“
  (höchstens alle 15 s; aufgeschoben, nicht verworfen). Nie in einer Zwischensequenz (`body[data-gl-kino="1"]`).
- Die bisherigen Funksprüche (Rennsteig/Schleuse) werden jetzt auch mit `gl_funk` gesprochen.
- `GLFAHNDUNG.linien()` liefert alle Sätze als `[wer, text]` (Funk, dazu „Halt! Polizei!“ usw. der Beamten).

## Entscheidungen

- Falko trägt im Modell ein rot kariertes Hemd (Bilder), Sarah eine dunkle Jacke – daher „rotes Karohemd“ und „dunkle Jacke“.
- Eine Sturmhaube gibt es noch nicht zu kaufen (kein Modell); die Wörter sind im Funk und in `linien()`, `GLFAHNDUNG.haube = true` reicht.
- Der Helm ist ein Ding im Rucksack, aufgesetzt wird er nur auf dem Moped – so wechselt die Beschreibung beim Auf- und Absteigen von
  selbst, und wer unbeobachtet absteigt, passt nicht mehr zur Beschreibung.

## Für den Lead

- **HUD aus `wissen`:** drei Symbole (Gesicht, Kleidung/Jacke, Fahrzeug), an = die Polizei weiß es und es passt noch. Hilfreich als
  Zeile darunter: `stand().beschreibung` (z. B. „Gesucht wird eine Person, männlich, rotes Karohemd, auf einem Moped. Richtung
  Schleusingen.“). Ereignis `grenzland:wissen` `{ wissen, neu?, weg? }` bei jeder Änderung – gut für ein kurzes Aufblinken.
- **Radar:** `cars[i].gesehen` (ohne das Feld: immer zeigen). Ereignis `grenzland:funk` hat jetzt auch `k: 'bild' | 'bild-alt'` und
  `teile`.
- **Von `GLHUD` gebraucht:** `GLHUD.sub` als Warteschlange (der Funksatz ist lang, ~5 s); `body[data-gl-kino]` wird gelesen.
- **Für `stimmen`:** `GLFAHNDUNG.linien()` (Sprecher `funk`, `polizei1`, `polizei2`, `vopo`, `abv`). Die Stimme `gl_funk` meldet das
  Modul selbst an (`STIMME.person`), solange es keine Aufnahme gibt.

## Tests

- `node --test viz3/test/unit/grenzland_welt.test.mjs` – die Regeln des Wissens (7 Tests).
- `python3 viz3/test/grenzland_welt.py 9016 wissen,funk` – im Spiel: Bilder in `out/grenzland_welt/` (`01_warnjacke`, `02_helm`,
  `03_gesehen`).
