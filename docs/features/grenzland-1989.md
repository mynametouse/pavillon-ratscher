# Grenzland: die Rückblende auf den November 1989

Hilfs-Agent `grenzland-1989` des Grenzland-Chats (Auftrag `docs/plans/auftraege/grenzland-1989.md`, gemeinsamer Teil
`grenzland-gemeinsam.md`), Branch `feat/grenzland-1989`, Nacht 13.11.2026. Falko, 0:32: „… achte bei den Rückblenden auf 1989 auch auf
entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion und sonstigen, sodass es wirklich gut ankommt und realistisch wirkt.“

## Was es gibt

**Ratscher am Nachmittag des Freitags, 10. November 1989** – der Tag, nachdem die Grenze aufging. Gespielt wird der junge Gerhard
(35, Lehrer; heute der Dorfchronist). `GL89.enter({ uhr, pos, yaw })` blendet ab, stellt Datum und Uhr (15:35), baut die Welt von damals
und blendet auf; `GL89.leave()` – oder das Ende des Modus mitten darin (`GL89.stop()`) – stellt alles genau zurück.

- **Das Dorf von damals** (`gl_1989_welt.js`, GL89WELT). Von außen, ohne eine Zeile in fremden Modulen, und alles mit Rückweg
  (Liste `undo`, rückwärts abgearbeitet):
  - *weg:* die Autos des Luftbilds (`dinge`: Meshes versteckt, Plätze leer, ihre Uhr angehalten), die Dorfbewohner von heute und ihre
    Autos (`DORF.S.hold`, wie die Zombie-Nacht), Passanten und Autos des Verkehrs, Busse und Fahrgäste, die Laternen von heute, die
    Mülltonnen und Satellitenschüsseln an den Häusern (ihre Dreiecke in den Zellen von `village_near` nach Farbe „weggefaltet“ – die
    Positionen werden aufgehoben und zurückgeschrieben), der Süßwarenautomat und der weiße Kasten im Dorfkern (nach Ort weggefaltet);
  - *anders:* Putz, Fachwerk und Dächer vergraut (Tönung der beiden Fassaden-Materialien), die fernen Baumkronen im letzten braunen
    Laub, die Linden am Anger kahl (Alpha-Test ihres Blattmaterials), Dunst wie über einem Tal, das mit Braunkohle heizt (der Nebel der
    Szene, als das Größere aus Tageswert und unserem gelesen – wie die Zombie-Nacht), Wetter fest auf „heiter“ (`WETTER.preset`), die Uhr
    in Echtzeit (`CLOCK.focus`) und von uns gezogen: in etwa zehn Minuten Spiel wird aus dem Nachmittag die Dämmerung (16:26; Sonnenuntergang
    16:37), die Lampen gehen an, Fenster werden hell;
  - *dazu,* etwa 150 m um die alte Schule, als **ein** Mesh aus Vertex-Farben im Material des Verkehrs (kein neues Shader-Programm):
    Straßenlampen auf Holzmasten mit Emailleschirm (dort, wo heute die Laternen stehen – deren Lichtkegel am Boden und das Licht an den
    Fassaden bleiben), gelbe Telefonzelle, Litfaßsäule, Milchbank mit Kannen, Briketthaufen mit Eimern (vor einem Haus am Anger und für
    die Öfen der Schule im Hof), Handwagen, Fahrräder, Zink-Aschetonnen, Wäsche auf der Leine, Leergutkisten; die **Schrift** als ein
    kleiner Atlas, hier gezeichnet (ein Klon des Schild-Materials der Busse – das Programm gibt es schon): die Losung „40 JAHRE DDR“ an
    der Schule, eine zweite am Laden, das Schild „KONSUM – Lebensmittel“ mit Öffnungszeiten am niedrigen Backsteinbau hinter der Schule,
    die Wandzeitung neben der Schultür, die Plakate der Litfaßsäule (Kirmes-Tanz, Altstoffe, Film, Bekanntmachung), „Fernsprecher“;
    Glühbirnen (das Glas-Material der Laternen: sie gehen mit dem Dorf an), ein geliehenes Punktlicht an der nächsten Lampe
    (`KERN.lights.borrow`), Kohlenrauch aus den Schornsteinen (weiche Karten im Material der Lichtkegel), die geparkten Autos der Zeit
    über `GLAUTO.spawn/park` (Trabant, Wartburg, Barkas, W 50 mit Kohlen, Simson – bzw. `klein89`, `limo89`, `lkw89`, `moped`, bis die
    Typen von `grenzland-auto` da sind; geparkt ohne Licht).
- **Die Leute** (`gl_1989_data.js`, `gl_fig.js`). Neun Dorfbewohner (erfunden, alle erwachsen), jeder bei dem, was man an dem Tag tat:
  Gisela in der Tür des Konsums, Brigitte und Renate in der Schlange davor (Netz, Dederon-Beutel), Erna kehrt vor der Schule, Kurt liest
  die Wandzeitung, Maik schraubt an der Simson, Ines steht dabei, Horst schippt Briketts, Werner geht mit der Aktentasche die Straße
  entlang. Wer näher als 5 m kommt, hört einen Satz (Untertitel, einer nach dem anderen). Sie sind Zeugen der Fahndung (`F.sees`,
  `F.knows = true`; `F.r` je nach Beschäftigung 10–26 m: wer arbeitet oder ansteht, schaut nicht weit). Als Figuren stehen die nächsten sechs (am Telefon drei), die anderen werden freigegeben.
  `GL89.leute` gibt die gerade stehenden nach id; `GL89.hol(id, x, y, hdGrad)` holt jemanden der Besetzung fest für eine Mission
  (Lutz, ABV …).
- **Kleidung, Haare, Dinge** (`gl_fig.js`, Schnittstelle unverändert, erweitert). Die Figur wird jetzt in ihrer Bind-Pose über das
  Skelett vermessen (aufrecht, in Metern) – unabhängig davon, wie sie gerade steht; so lässt sich auch die Spielfigur umfärben, während
  sie läuft. Jedes Texturpixel kennt seine Zone und seinen Ort am Körper; darauf: Dederon-Kittelschürze mit Blümchen oder Tupfen über
  der Strickjacke, Wattejacke (Längssteppung), Anorak mit heller Passe und Strickbund, „moon-washed“ Jeansjacke und Jeans, weiter
  Pullover mit Zackenbändern, Parka, Fischgrat-Mantel und Bügelfaltenhose („Präsent 20“, Nadelstreifen), Lodenmantel, Wintermantel mit
  Pelzkragen, weißer Verkaufskittel; Knopfleisten, Reißverschluss, Hemd und Schlips im Ausschnitt, Kragen, aufgesetzte Taschen, Koppel,
  Bügelfalte, Jeansnähte, Stiefelschäfte. Uniformen: Volkspolizei graugrün mit dunkelgrünen Kragenspiegeln und Schulterstücken, Hemd
  und Schlips, Ärmelabzeichen links, braunem Koppel (der ABV im Uniformmantel); Grenztruppen steingrau mit grüner Paspelierung und dem
  grünen Ärmelstreifen am linken Unterarm, Stiefel. Am Kopf (kleine Meshes am Kopfknochen, in der eigenen Haarfarbe der Figur):
  Dauerwelle kurz und schulterlang, Vokuhila, Schnauzbart, die großen Brillen der Achtziger; Hut, Schiebermütze, Kopftücher. In der Hand:
  Einkaufsnetz (mit Kuba-Apfelsinen), Dederon-Beutel, Zinkeimer mit Briketts, Aktentasche, Milchkanne, Besen, Schaufel. Arbeitshaltungen
  aus `npc/npc_real.js` (`GLFIG.pose(F, 'pick' | 'saw' | 'bonnet' | 'carry')`).
- **Der junge Gerhard.** Die eigene Spielfigur wird umgefärbt (`GLFIG.dress` auf `AVATAR.figs.m.model`): Parka über kariertem Hemd,
  Cordhose, braune Halbschuhe, dazu Brille (Goldrand) und Schnauzer; spielt man gerade Sarah, wird für die Erinnerung auf die Männerfigur
  gewechselt und danach zurück. Beim Verlassen kommen die alten Texturen zurück, die gemalten werden freigegeben.
- **Ton** (alles synthetisch über `GLTON.add`): die Glocke im Schulturm zur vollen Stunde, ein Hund, ein Zweitakter irgendwo, die
  Schaufel in den Kohlen, der Besen, das Radio aus der Ladentür (dünn und dumpf; dazu die Meldungen als Untertitel).

## Ausprobieren

`?szenario=grenzland`, dann in der Konsole `GL89.enter({ pos: [238.5, -72.5], yaw: 320 })` (Hof hinter der Schule) und
`GL89.leave()`. Test mit Bildern: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9014 --serve grenzland_1989`
(`out/grenzland_1989/`: Hof, Straße von vier Standpunkten, Kohlen, alle zwölf Figuren von vorn und hinten, Köpfe, Gerhard über die
Schulter und aus den Augen); dieselben Standpunkte heute: `grenzland_1989_blick` (`out/grenzland_1989_blick/`).

## Was an dem Tag wahr war (und was die Leute deshalb sagen)

- **Donnerstag, 9.11.1989, 18:53 Uhr:** die neue Reiseregelung wird in Berlin verlesen. In Crock (bei Eisfeld, ~15 km von Ratscher) sah
  eine Familie es im ZDF; nachts fuhren vier Autos zum Übergang **Eisfeld–Rottenbach** und wurden dort noch zurückgeschickt. **Freitag,
  10.11.:** um 6 Uhr bei der Volkspolizei das Visum in die Ausweise stempeln lassen, vor 8 Uhr los im vollgepackten Wartburg, Schlange vor
  dem Übergang, Coburg. **Samstag, 11.11.:** Schule – die Klassen fast leer. (taz, „Der Mauerfall und die DDR-Provinz“)
- **Eisfeld–Rottenbach** (und Meiningen–Eußenhausen) sind seit dem 21.6.1973 Grenzübergangsstellen des Bezirks Suhl (Bundesarchiv) – also
  der Weg „rüber“ am 10.11. Der Übergang **Sonneberg–Neustadt** („Gebrannte Brücke“) öffnet erst am Sonntag, 12.11.1989
  (Deutsche Kinemathek, „Wir waren so frei“) – niemand spricht am 10. davon (Unit-Test).
- **Begrüßungsgeld:** seit 1988 100 DM einmal im Jahr, ausgezahlt bei Städten, Gemeinden, Banken und Sparkassen, im Ausweis vermerkt;
  Bayern zahlte 40 DM dazu (Wikipedia „Begrüßungsgeld“). West-Berlin am 10.11.: Schlangen vor den Auszahlstellen (bpb-Chronik).
- **Wetter:** Hoch „Xanthos“ nach dem Tief vom 9.; in der Nacht zum 10. klarte es auf, Frost im Thüringer Wald, am Morgen feuchter Dunst
  (Berliner Wetterkarte, Beitrag zum 9.11.1989). Deshalb: **heiter, dunstig, kalt** – kein Niesel-Grau. (Der Radiotext des Kerns sagt
  „neblig-trüb, um fünf Grad“ – siehe „Für den Lead“.)
- **Uniformen:** Volkspolizei graugrün, Schutzpolizei mit dunkelgrüner Paspelierung, Dienstjacke mit vier aufgesetzten Taschen, Hemd und
  grüner Schlips (Wikipedia „Volkspolizei“ / „Deutsche Volkspolizei“); ABV: hauptamtliche Abschnittsbevollmächtigte in den Gemeinden.
  Grenztruppen: steingraue Uniform mit grüner Paspelierung und grünem Mützenrand (Wikipedia „Grenztruppen der DDR“), Ärmelstreifen
  „Grenztruppen der DDR“ grün mit hellgrauer Schrift am linken Unterarm (Sammlerangebote, s. Quellen).
- **Waffenschmied Suhl:** bis zu zwei Jahre Wartezeit, vor dem Essen das gemeinsame Bad, Kimonos; 1989 noch offen (bis 1993) –
  Quellen in `GLDATA.SUSHI.quellen`.
- **Kleidung:** die Kittelschürze aus Dederon mit Blümchenmuster trug „fast jede Frau im Osten“ bei der Hausarbeit (Berliner Kurier);
  Präsent 20, Malimo (Berliner Kurier); die Mode um den Mauerfall (Volksstimme).
- **Konsum:** fast jedes Dorf hatte einen; Rabattmarken; das Zeichen (Schornstein und Sichel als K) wird **nicht** nachgebaut – nur der
  Schriftzug (Wikipedia „Konsum (DDR)“).
- 1952 und 1961 die Zwangsaussiedlungen aus dem Grenzgebiet, 28 Jahre Mauer (1961–1989), Flucht über Ungarn im September 1989, Rücktritt
  Todor Shiwkows am 10.11.1989 – allgemein bekannte Daten, in den Sätzen von Kurt, Werner, Ines und im Radio.

### Quellen

- taz: Der Mauerfall und die DDR-Provinz – https://taz.de/Der-Mauerfall-und-die-DDR-Provinz/!5153067/
- Bundesarchiv: Grenzübergangsstellen für den Bezirk Suhl – https://www.bundesarchiv.de/themen-entdecken/online-entdecken/themenbeitraege/grenzuebergangsstellen-fuer-den-bezirk-suhl/
- Deutsche Kinemathek, „Wir waren so frei“: Gebrannte Brücke, 12.11.1989 – https://www.wir-waren-so-frei.de/index.php/Detail/Object/Show/object_id/3017/lang/en_US
- bpb, Deutschland-Chronik, 10. November 1989 – https://www.bpb.de/themen/zeit-kulturgeschichte/deutschland-chronik/132366/10-november-1989/
- Wikipedia: Begrüßungsgeld – https://de.wikipedia.org/wiki/Begrüßungsgeld
- Berliner Wetterkarte e. V., Beitrag zum 9.11.1989 – https://berliner-wetterkarte.de/Beilagen/2019/BWK_Beitraege_19891109.pdf
- Wikipedia: Grenztruppen der DDR – https://de.wikipedia.org/wiki/Grenztruppen_der_DDR
- Wikipedia: Deutsche Volkspolizei – https://de.wikipedia.org/wiki/Deutsche_Volkspolizei ; Volkspolizei (engl., gelesen über den Spiegel) – https://en.wikipedia-on-ipfs.org/wiki/Volkspolizei
- Ärmelstreifen der Grenztruppen (Sammlerangebot mit Beschreibung) – https://milshed.com/en/2518-original-east-german-nva-grenztruppen-border-guard-cuff-title.html
- Wikipedia: Konsum (DDR) – https://de.wikipedia.org/wiki/Konsum_(DDR)
- Berliner Kurier: Die DDR-Kittelschürze – https://www.berliner-kurier.de/kolumnen/die-ddr-kittelschuerze-ein-mythos-lebt-weiter-li.2242410
- Berliner Kurier: Malimo und Präsent 20 – https://www.berliner-kurier.de/ddr/kult-aus-der-ddr-malimo-und-praesent-20-die-geheimnisse-der-kult-stoffe-li.10000744
- Volksstimme: Die Mode und der Mauerfall – https://www.volksstimme.de/leben/die-mode-und-der-mauerfall-die-80er-jahre-sind-im-trend-1995115

Keine Fotos, Logos oder Plakate übernommen; alles in der Szene ist selbst gebaut bzw. gezeichnet.

## Entscheidungen

- **Der Konsum** ist der niedrige Backsteinbau hinter der Schule (Gebäude 214) – erfunden; wo der Laden von Ratscher wirklich war, weiß
  ich nicht. Litfaßsäule und Telefonzelle stehen im Auftrag; für ein Dorf dieser Größe ist die Säule großzügig.
- **Wetter heiter und dunstig** statt „trüb“ (Quelle oben); das tiefe Licht durch den Dunst trägt die Stimmung besser als Grau.
- **Zeit:** die Uhr läuft in der Rückblende ~5× Echtzeit (`BILD.tempo`), nicht 60× wie sonst – sonst wäre nach einer Minute Nacht.
- **Bäume:** die Linden kahl, ferne Kronen bräunlich getönt (auch die Nadelbäume in den Karten – nicht trennbar; fällt im Dunst kaum auf).
- **Gebäude nach 1989** bleiben stehen (keine Baujahre in den Daten); Dunst und Dämmerung decken alles jenseits ~300 m. Pflaster am
  Anger, die Bushütte, Hecken, Infotafel, Karussell, Papierkörbe bleiben (plausibel bzw. nicht sauber zu trennen).
- **Höchstens sechs Dorfbewohner** als Figuren zugleich (Telefon drei) – dazu kommen ABV, Volkspolizist und Lutz der anderen Module.
- Geliehenes Licht: einmal angemeldet (beim ersten Betreten), will nur etwas, solange die Rückblende läuft.

## Offen

- Photovoltaik gibt es im Dorfmodell nicht; Dächer und Boden stammen aus dem Luftbild 2024 (Pflaster, Carports sichtbar von oben).
- Tiere (`tiere/`) bleiben – zeitlos.
- Kein Sitzen für die GLFIG-Figuren (Kurt steht an der Wandzeitung, statt auf der Bank zu sitzen).
- Sätze nur als Untertitel, keine Stimme (die Stimmen sind registriert: `gl_<id>`).

## Für den Lead

- **`gl_hud.js`, Bild 1989:** Werte folgen nach den Bildern des Tests (unten nachgetragen).
- **`gl_data.js`:** `J89.radio[2]` „neblig-trüb, um fünf Grad“ → besser „nach frostiger Nacht heiter und trocken, dunstig“ (Quelle
  Wetter). `J89.leute` wird von `GL89DATA.SAGT` abgelöst (Erna, Horst, Renate, Maik, Ines erweitert; `abv` und `lutz` unverändert
  übernommen). `CAST.erna/horst/renate/maik/ines/abv` und `KLEID.kittel/watte/anorak/stonewash/jeans89/parka/vopo/grenzer` werden beim
  Laden von `gl_1989_data.js` überschrieben – die Einträge im Kern können bleiben oder weg.
- **`gl_orte.js` (neben):** Verkaufswagen, Kegelbahn und Grill sollten bei `grenzland:era` `{ era: '1989' }` verschwinden (ich fasse sie
  nicht an).
- **Uhr-Fenster:** `CLOCK.focus('gl-1989')` zeigt dort „Echtzeit – Leim offen“ (Text aus `time/clock.js`) – kosmetisch.
- **Fahndung/Mission:** Figuren von 1989 mit `GLFIG.make(id, { era: '1989' })` bzw. `GL89.hol(id, x, y, hd)`; `abv` trägt jetzt den
  Uniformmantel (`vopomantel`), `vopo` die Dienstjacke.
