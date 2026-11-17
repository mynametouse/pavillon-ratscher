# Grenzland – Alltag: die Leute nach der Uhr, Vögel, Feste im Kalender (feat/grenzland-alltag, 17.11.2026)

Auftrag: `docs/plans/auftraege/grenzland4-alltag.md` (gemeinsam: `grenzland4-gemeinsam.md`), seit 17.11. ~14:00 mit dem neuen Schwerpunkt
aus `docs/plans/auftraege/realismus1-gemeinsam.md`: **Realismus vor Menge**, zuerst Ratscher und Schleusingen. Reihenfolge laut Lead:
1. die Leute draußen nach der Uhr (realistisch: Figuren, Bewegung, Orte, Cliquen, Wege in die Läden), 2. Vögel, 3. Feste – erst, wenn 1
und 2 sitzen.

Falko, 17.11.2026 12:26 (angeklickt „Tagesablauf der Leute“): „Morgens Bäcker und Schulbus, tagsüber Hof und Feld, abends Gasthaus und
Feldscheune, sonntags Kirche.“ – 13:27: „… Verkehr und das, was sich so tut auf den Straßen, vielleicht hier und da auch mal eine Clique …
Vielleicht fliegen auch mal Vögel rum …“

## Die Leute (`grenzland/gl_alltag_data.js` GLALDATA, `grenzland/gl_alltag.js` GLALLTAG)

- **Wer:** 12 Leute in Ratscher, 5 in Schleusingen – erfunden. In Ratscher sind es die Leute aus dem Dorf-Chat „Ratscher aktuell“: Ingrid
  (Ortsteilbürgermeisterin), Uwe (Landwirt, „War ich nicht.“), Manfred (Wehrführer), Heike (Hühner, drei Kürbisse), Wolfgang (Waldarbeiter,
  Pilze), Katrin (Pflegerin in der Stadt), Jens (Kfz-Mechaniker) – als dieselben Menschen wie im Dorf des Grundspiels (`dorf/`), in ihren
  eigenen Figuren –, dazu Anja (deren Hund seit den Böllern unterm Sofa liegt – deshalb geht sie abends allein ihre Runde), Kalle
  („Kirmes_Kalle“ aus dem Feed), Andi („Angel_Andi“), die Schüler Lea und Max. In Schleusingen: Bärbel und Rainer (Rente, Bank am Markt),
  Sabine (Bürgerbüro im Rathaus), Tobias (kellnert abends), Jonas (Schüler). Nicht Hubert, nicht Ronald, nicht Gerhard, niemand aus
  Kapitel 1 doppelt (Unit-Test).
- **Der Tag nach Uhr und Wochentag** (rein, getestet): morgens die Schüler um ~6:50 an der Schulbushaltestelle am Anger (zurück ~13:30, nur
  an Schultagen – Mo–Fr ohne Weihnachtsferien, vereinfachte Annahme), die Schlange am Verkaufswagen (Ingrid jeden Werktag, andere an manchen
  Tagen), Uwe früh im Stall und tagsüber auf dem Feld, Manfred samstags 9 Uhr Übung an der alten Schule (wie im Dorf-Chat), Jens unterm
  Motorhaube, Wolfgang mit Brennholz; nachmittags Plausch unter der Dorflinde; abends Kegeln an der Feldscheune (Mi/Sa, Sommerhalbjahr),
  Kalles Grill (Fr/Sa), Anjas Abendrunde um den Anger; freitags hängen Lea und Max am Bushäuschen ab, samstags fahren sie in die Stadt zu Jonas
  an den Brunnen auf dem Markt; in Schleusingen morgens in den Bäcker (oder das Café, je nachdem, welche Tür offen ist), Rentner auf den
  Bänken am Markt, Sabines Mittagspause, Rainers Stammtisch, Tobias’ Zigarettenpause vor der Gaststätte; sonntags vor und nach dem Gottesdienst
  an der Südtür von St. Johannis (Gottesdienst um 10 Uhr – Annahme; in Ratscher selbst steht laut Denkmalliste keine Kirche, die
  Ratscherinnen fahren in die Stadt). Jeder Tag etwas anders (deterministisch), **Winter** (Nov.–Feb.): draußen seltener und ab 17:30 drinnen;
  **nachts** niemand.
- **Das Grundspiel zuerst:** wen das Dorf des Grundspiels gerade zeigt (Freitagabend in der alten Schule, Feuer am Acker, Vorgarten, mit dem
  Auto weg – `dorf/dorf_cal.js`, `dorf/dorf_life.js`), den zeigt der Modus nicht noch einmal. Ihre Häuser sind die des Grundspiels.
- **Figuren nur in der Nähe:** innerhalb ~150 m, höchstens 8 zugleich (Handy 5), nacheinander geladen, über ~190 m freigegeben; der Rest
  sind Zahlen. Wer neu ankommt oder in Sicht wäre, kommt von der Straße her (nicht aus dem Nichts); wer geht, geht – nach Hause durch die
  Haustür, in den Laden durch die Ladentür (die Türen der Läden der Altstadt aus `schleusingen/si_innen.js`, nur wenn der Laden offen ist;
  `FASSADE.eingang` des Agenten `gebaeude` ist vorgesehen), sonst die Straße hinunter, aus der Sicht. Aus dem Laden kommen sie nach ein paar
  Minuten mit einer Tüte wieder heraus.
- **Wie sie da sind:** Gruppen stehen im Kreis und reden (Gesten, Blicke, einer spricht), Schlange am Wagen, Reihe an der Haltestelle,
  Bänke an der Linde, am Brunnen und am Markt (freie Plätze, keiner sitzt doppelt), Arbeitshaltungen, Einkaufsnetz, Tüte, Eimer, Milchkanne,
  Tasche; allein: ein Blick in die Runde, die Jungen am Handy; im Winter Mützen für die Leute ohne eigenen Hut.
- **Vorbeigehen:** ein Nicken, „Morgen.“ / „Tach.“ / „Abend.“ – je nach Ruf des Ortes (`GLRUF.stufe` des Agenten `ruf`, ohne ihn
  `neutral`): beliebt – Winken und ein freundlicher Gruß; misstrauisch – Kopfschütteln und Tuscheln mit dem Nachbarn; verhasst – abwinken,
  umdrehen, „Mit euch red ich nicht.“ **Mit E** („Reden mit …“) ein fester Satz je Person und Lage (Wagen, Bus, Pause, Arbeit, Feuerwehr,
  Abend, Kirche, Runde, Fest) im trockenen Ton des Dorf-Chats; misstrauisch und verhasst antworten knapp.
- **Zeugen:** die Leute sind Figuren des Modus, sehen also Taten; die aus Ratscher kennen die beiden (Gesicht bekannt).
- **Wann:** nur im Modus, nur heute (nicht 1989), nicht während einer Mission (`GLALLTAG.mitMission = true` schaltet sie für Kapitel 2
  dazu), alles weg nach „Beenden“.
- **Schnittstelle:** `GLALLTAG.leute()` → `[{ id, name, ort, x, y, tun, platz, gezeigt }]` · `person(name | id)` · `reden()` ·
  `linien()` (alle festen Sätze für die Aufnahmen: `[['al_ingrid', 'Morgen.'], …]`) · `debug.zeit(min, wd)`, `debug.stand()`,
  `debug.hin(id)`, `debug.wo(id)`.

## Vögel (`tiere/voegel.js` VOEGEL – Grundspiel, im freien Spiel und im Modus)

- **Tauben** auf dem Markt in Schleusingen: laufen, nicken, picken um den Brunnen; wer näher kommt (zügig unter ~4 m, sehr nah, ein Auto),
  scheucht sie auf – sie flattern alle auf (Flügelklatschen), kreisen über dem Platz und landen wieder, wo niemand steht.
- **Spatzen** an den beiden Hecken auf dem Anger in Ratscher: hüpfen und picken davor, schießen beim Näherkommen in die Hecke und kommen
  nach einer Weile wieder heraus; ab und zu ein Tschilpen.
- **Krähen** über dem Land: ein paar in weiten, langsamen Kreisen (tags, nicht in der Stadt).
- **Schwalben** im Sommer (Mai–August, tags) schnell und tief über dem Anger und der Wiese am Garten.
- **Stare** im Herbst (September–November) in der Dämmerung: ein Schwarm über den Feldern, der sich faltet und streckt.
- **Billig:** je Art ein Netz mit 14 Dreiecken pro Vogel, die Ecken jedes Bild auf der CPU (Flügelschlag, angelegte Flügel am Boden), im
  Material der Verkehrsfiguren (`VFIG.mat`) – kein neues Shader-Programm, keine Textur, keine Lampe; nur was nah und dran ist, wird
  gerechnet. `?novoegel` lässt sie weg. `VOEGEL.scheuchen(x, y, r)` scheucht alles in der Nähe auf (ein Böller des Modus tut es schon).

## Feste im Kalender (`grenzland/gl_feste_data.js` GLFDATA, `grenzland/gl_feste.js` GLFESTE)

- **Wann:** Kirmes in Ratscher am **zweiten Oktoberwochenende** (Sa 14–24, So 10–20 Uhr) – **Annahme**: ein Datum der echten Kirmes fanden
  wir nicht (zwei Websuchen am 17.11.2026; das Region-Dossier führt es als „vor Ort fragen“). Weihnachtsmarkt in Schleusingen an den vier
  Adventswochenenden (Fr 16–21, Sa 12–21, So 12–19 Uhr; 2026: 27.11.–20.12.). Feuerwehrfest: **für das Spiel erfunden**, zweites
  Juliwochenende an der alten Schule (im Spiel das Haus des Feuerwehrvereins); es beschreibt kein Fest eines echten Vereins.
- **Wo und wie:** offen und der Spieler höchstens ~450 m entfernt, steht das Fest in der Welt – die Kirmes **rund um die Dorflinde** (unter der
  Linde wurde getanzt) mit Kirmesbaum, der Weihnachtsmarkt **rund um den Brunnen auf dem Markt** mit Holzhütten, Tannengirlanden (im Winter
  Schnee auf den Dächern) und einem Christbaum mit Lichterspirale, das Feuerwehrfest auf dem Rasen vor der alten Schule (ein Mast trägt die
  Lichterketten). Die Stände suchen sich freien Boden im Ring um die Mitte und schauen zu ihr hin; Lichterketten vom Baum zu den Ständen
  leuchten nachts (eine Kopie des Lampenmaterials der Autos wie bei den Glühbirnen der Feldscheune – keine neue Lampe, kein neues
  Shader-Programm).
- **Menge:** die Leute aus `gl_alltag.js` gehen hin – der Großteil des eigenen Ortes für eine Weile, ein Teil des anderen; wer Dienst hat,
  steht die ganze Zeit hinter dem Stand (Kirmes: Uwe am Grill – der „Bratwurst-Uwe“ –, Ingrid an der Tombola, sie hat den Hauptpreis
  gesucht, Kalle am Ausschank, Heike mit Kirmeskuchen; Weihnachtsmarkt: Tobias am Glühwein, Rainer an der Wurst, Bärbel an der Tombola,
  Sabine beim Stollen; Feuerwehrfest: Manfred am Grill, Jens am Ausschank, Heike an der Tombola).
- **Kaufen mit E:** Rostbratwurst (3 €), Bier oder Fassbrause, Kirmeskuchen, Glühwein oder Kinderpunsch, Stollen, ein Los der Tombola (1 €:
  meist Niete, manchmal Honig, Kürbis, Gutschein, selten der Präsentkorb) – der Mensch hinter dem Stand sagt seinen Satz.
- **Musik:** eine Polka der Kirmeswelle (`GLRDATA.LIEDER.kirmes`; Feuerwehrfest mit dem Waunobe March) über **ein** Media-Element, lauter, je
  näher man ist, leiser unter dem Autoradio; Lieder des Klang-Repositorys nur, wo es erreichbar ist (`GLRDATA.ton()`), sonst die der Seite.
  Weihnachtsmarkt: eine Spieluhr aus dem Synthesizer (eigene kleine Melodie, kein Weihnachtslied) – bis ein freies Stück da ist.
- **Für Missionen:** `GLFESTE.aktiv()` → `{ id, name, ort, x, y, r, bis }`, `GLFESTE.deckung(x, y)` → 0 … 1 (Menge zum Untertauchen),
  `KERN.emit('grenzland:fest', { id, an })`, `GLFESTE.kalender(t)`; zum Ausprobieren `GLFESTE.debug.zu('kirmes', 20 * 60 + 30)` (Datum und
  Uhr auf die nächste Öffnung).

## Tests

- Ohne Browser: `viz3/test/unit/grenzland_alltag.test.mjs` (Leute, Pläne, Schulbus, Wagen, Kirche, Winter, Nacht, Grundspiel zuerst,
  Feste, Kalender, Tombola, Sätze).
- Im Browser: `viz3/test/grenzland_alltag.py` mit den Abschnitten `tag` (Ratscher), `stadt` (Schleusingen), `voegel`, `fest`, `blick`
  (Draufsichten zum Platzieren); Bilder in `out/grenzland_alltag/`. Liste für Actions: `viz3/extra/grenzland-alltag/tests.txt`.

## Für den Lead

- **Keine Zeile in `gl_modus.js` nötig:** `GLALLTAG` hängt sich wie `gl_ereignis.js` mit `KERN.tick(tick, 'grenzland/alltag')` ein und
  räumt bei `grenzland:stop` und `grenzland:era` auf. Wer die Reihenfolge im Takt des Modus will: `window.GLALLTAG && GLALLTAG.tick(dt)`
  nach `GLUMGEBUNG.tick(dt)` und das `KERN.tick` hier entfernen.
- `modules.txt`: vier Zeilen am Ende des Grenzland-Blocks (`gl_alltag_data.js`, `gl_alltag.js`, `gl_feste_data.js`, `gl_feste.js`), eine im
  Tiere-Block (`tiere/voegel.js`).
- **Stimmen:** `GLALLTAG.linien()` (und später `GLFDATA.linien()`) in den Sammler `tools/voices/grenzland_linien.mjs` aufnehmen; die
  Sprecher heißen `al_<id>` (gesprochen `gl_al_<id>`). Für die sieben des Dorfs wären ihre Stimmen aus dem Grundspiel die richtigen
  (`STIMME`: `ingrid`, `uwe`, `manfred`, …).
- **Für `ruf`:** `GLRUF.stufe(ort)` wird je Person mit ihrem Heimatort gefragt (`'ratscher'` / `'schleusingen'`); Nebenjobs finden die
  Leute mit `GLALLTAG.person('Manfred')` (Ort und Tun jetzt).
- **Für `strasse`:** der Schulbus – die Schüler stehen Mo–Fr 6:50–7:08 an der Haltestelle am Anger (ORTE.haltestelle) und kommen um 13:30
  zurück; fährt ein Bus von `GLLINIEN` dort vorbei, wäre das Einsteigen der nächste Schritt (noch nicht verdrahtet: sie gehen um 7:08).
- **Für `laeden-leben`:** wer in einen Laden der Altstadt geht, verschwindet an dessen Tür (`SINNEN.doors`, offen nach `SINNEN.shopOpen`)
  und kommt nach ein paar Minuten heraus; drinnen sind eure Leute. `OEFFNUNG.offen(id, t)` nehme ich, sobald es da ist.
- **Musik für den Weihnachtsmarkt:** ein freies Weihnachtsstück (CC BY / gemeinfrei) im Klang-Repository wäre gut – Eintrag in
  `GLFDATA.FESTE.weihnachtsmarkt.musik.lieder` (Dateiname wie in `GLRDATA.LIEDER.kirmes`, dort mit `ton: true` eintragen); bis dahin spielt
  eine Spieluhr aus dem Synthesizer.
- **Die alte Zufalls-Kirmes** (`gl_ereignis.js`, Agent `strasse`) soll aus sein, sobald `window.GLFESTE` da ist (so im gemeinsamen Auftrag).
