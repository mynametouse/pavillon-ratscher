# Pavillon Ratscher – Mehrspieler-Modus (Konzept, Fassung 2)

Stand: 17.11.2026, ~21 Uhr · Konzept-Chat (session_01L6Yrpdv3z6vdQt8B5XJNP3) · **nur Konzept, nichts gebaut**

Falkos Wünsche:
- 20:30: „Ein Konzept für einen Mehrspieler-Modus, wo man auch andere Spieler sieht, mit eigenen Avataren und so weiter. Erstmal nur als
  Konzept. Sowohl in der Zombie-Version als auch in der GTA-Version als auch in der normalen freien Simulation.“
- 20:40: „Schau nochmal kritisch auf das Konzept und optimiere .. auch hinsichtlich Spielspaß“.

Fassung 1 (17.11., ~20:35) ist in dieser Fassung aufgegangen. Abschnitt 1 sagt, was sich geändert hat und warum.

## 0 Kurz
- **Zu zweit perfekt, zu viert gut.** Der häufigste Fall sind zwei Menschen, etwa Falko mit Sarah oder mit Christoph. Darauf wird alles zuerst abgestimmt.
- **Einander brauchen statt nebeneinander spielen:**
  - Handgriffe, die nur zu zweit gehen: Balken tragen, Brett halten und nageln, Räuberleiter, Trabi anschieben;
  - dazu verteilte Rollen.
- **„Oben und unten“ als Markenzeichen:** Einer spielt in der Welt, der andere von oben.
  - Von oben spielt man als Lotse an der Seite des anderen oder als Spielleiter gegen ihn.
  - Die Draufsicht gibt es schon („Ratscher von oben“).
  - Wer nicht kämpfen mag, spielt trotzdem mit.
- **Reden ohne Tippen:**
  - Zeigen, das erkennt, worauf man zeigt;
  - ein Rad mit Sätzen;
  - Sprache in der Nähe, früh statt zuletzt. In der Zombie-Nacht hören die Zombies mit.
- **Kurze Runden, große Geschichten:** Runden von 20–30 Minuten. Am Ende steht ein Rückblick mit Fotos und kleinen Auszeichnungen.
- **Spiele für Freunde in der freien Simulation:** Verstecken im Dorf, „Wo bin ich?“ in der echten Gegend, Rennen, Holzfäller-Wettbewerb, Skat.
- **Technik entschärft:**
  - Jeder steuert seine Figur selbst, der Gastgeber den Rest.
  - Der eigene Spielstand des Gastes bleibt unberührt.
  - Schaltet ein iPhone kurz weg, verbindet sich das Spiel neu, statt zu enden.
  - Ein kleiner Raum-Dienst bei Cloudflare (kostenlos) sorgt dafür, dass man sich schnell und sicher findet.
- **Früh etwas zum Spielen:** Die erste Runde „Zu zweit im Garten“ bringt Avatare und Verstecken. Getestet wird auf zwei Geräten in zwei Netzen.

## 1 Durchsicht von Fassung 1

### Spielspaß
- **Kein Anlass zum Zusammenspielen.**
  - Problem: Fassung 1 listete auf, was man tun kann. Fast alles ginge aber auch allein, nur nebeneinander.
  - Änderung: Handgriffe nur zu zweit (Abschnitt 4), Rollen (3), Spiele für Freunde (7).
- **Warten und Suchen sind die größten Spaßkiller.**
  - Problem: lange Wege zueinander, Ladezeiten, Zwischensequenzen, in denen einer nur zusieht. Fassung 1 behandelte das kaum.
  - Änderung: die Regel „Niemand wartet“. Man springt zum Mitspieler, Missionen haben Treffpunkte, beide haben immer etwas zu tun.
- **Sprache stand ganz hinten.**
  - Problem: Sprache in der Nähe macht in Koop-Horror den meisten Spaß (Vorbilder: Lethal Company, Phasmophobia). Tippen am Handy, während Zombies angreifen, geht nicht.
  - Änderung: Sprache früh. Zeigen bekommt eine Bedeutung (Vorbild: das Ping-System von Apex Legends).
- **Nur lange Runden.**
  - Problem: Die Zombie-Nacht dauert drei Nächte.
  - Änderung: eine Kurzrunde „Eine Nacht“.
- **Nichts bleibt hängen.**
  - Problem: kein Foto, kein Rückblick. Dabei sind die Geschichten, die man sich danach erzählt, der eigentliche Lohn.
  - Änderung: Fotomodus und Rückblick mit Momenten.
- **Nur ein Spielertyp.**
  - Problem: Alles lief in der Ich-Sicht.
  - Änderung: „Oben und unten“.
- **Falsche Größe.**
  - Problem: Fassung 1 zielte auf 4–16 Spieler.
  - Änderung: zu zweit perfekt, zu viert gut. Mehr nur im Workshop.

### Technik
- **Spielstand des Gastes.**
  - Problem: Er wäre beim Besuch überschrieben worden; Fassung 1 sagte dazu nichts.
  - Änderung: eine Gastwelt nur für den Besuch (11.3).
- **„Hintergrund lokal“ war zu grob.**
  - Problem: Das Auto des Freundes führe durch Autos, die nur ich sehe. Hubert stünde bei jedem woanders.
  - Änderung: eine klare Liste, was geteilt ist (11.2). Der Verkehr hält auch für Mitspieler.
- **Offen, wer was rechnet.**
  - Änderung: Jeder rechnet seine Figur und sein Fahrzeug, der Gastgeber den Rest (11.1).
- **Den häufigsten Abbruch übersehen.**
  - Problem: Am iPhone hält Safari WebRTC an, sobald der Bildschirm sperrt oder Safari in den Hintergrund geht. Fassung 1 plante
    stattdessen die schwierige Übergabe an einen anderen Gastgeber.
  - Änderung: zuerst Wiederverbinden und den Bildschirm wach halten (11.5).
- **Build-Nummer als Pflicht.**
  - Problem: Bei mehreren Live-Versionen am Tag hätte das oft blockiert.
  - Änderung: Protokoll-Version und Datenstand der Welt (11.4).
- **8–16 Spieler.**
  - Problem: Das scheitert nicht am Netz, sondern am Rechner des Gastgebers und am Speicher der Handys.
  - Änderung: Grenzen je Modus (11.7). Der Workshop läuft als leichte Karte.
- **KI-Gespräche.**
  - Problem: Gäste ohne eigenen Schlüssel könnten mit niemandem reden. Sprachchat und Spracherkennung wollen dasselbe Mikrofon.
  - Änderung: KI über den Gastgeber, Mikrofon klar getrennt (11.6).
- **Rechte-Stufen.**
  - Problem: Unter Freunden sind sie umständlich.
  - Änderung: alles erlauben, dazu „Rückgängig“ für den Gastgeber.
- **VRM-Figuren.**
  - Problem: Figuren aus VRoid sind im Anime-Stil und passen nicht in die realistische Spiegelwelt.
  - Änderung: gestrichen.
- **Die Clique als Spieler 3 und 4.**
  - Problem: Das bricht die Geschichte, denn Jule, Timo und Basti sprechen in den Szenen selbst.
  - Änderung: neue Leute der Crew mit eigenem Avatar.

### Ablauf
- **Das größte Risiko kam zuletzt.**
  - Problem: Etwas Spielbares gab es erst spät. Die echte Verbindung über zwei Netze und das iPhone wurden zuletzt geprüft.
  - Änderung: Die erste Runde „Zu zweit im Garten“ wird gleich auf zwei Geräten getestet (14).

## 2 Spaß-Regeln
1. **Einander brauchen.** Zusammen geht es schneller, besser oder überhaupt erst.
2. **Niemand wartet.** In Missionen höchstens 15 s ohne eigene Aufgabe.
3. **In einer Minute zusammen.** Link öffnen, Vorlage wählen, neben dem Mitspieler stehen. Beim Beitreten lädt zuerst seine Umgebung.
4. **Reden ohne Tippen:** zeigen, das Rad, Sprache.
5. **Chaos ja, Frust nein.**
   - In der freien Simulation fällt man um und steht wieder auf, statt zu sterben.
   - Treffer unter Freunden sind leicht.
   - Was Gäste in der Welt ändern, lässt sich rückgängig machen.
6. **Kurze Runden, große Geschichten.** 20–30 Minuten, danach ein Rückblick zum Teilen.
7. **Jeder nach seiner Art.** In der Welt oder von oben, kämpfen oder lenken.
8. **Die echte Gegend ist der Trumpf.** Es gibt Spiele, die nur hier gehen: „Wo bin ich?“, Rennen auf echten Straßen, Verstecken in echten Häusern.

## 3 Oben und unten
Einer spielt in der Welt, der andere von oben.
- Von oben heißt: in der vorhandenen Draufsicht, am schwachen Handy in der Leichtansicht als Karte (Abschnitt 10).
- Das passt zu den Geräten: der Laptop in der Welt, das Handy oben.

Vorbilder: der „AI Director“ von Left 4 Dead, hier ein Mensch, und Spiele für zwei, in denen einer sieht, was dem anderen fehlt.

- **Freie Simulation – Bauleiter:** plant Pavillon und Garten von oben, bestellt Material, teilt Aufgaben zu. Die anderen bauen unten.
- **Zombie-Nacht – die Drohne (mit):**
  - Sie sieht nur, was im Lichtkegel der Drohne liegt.
  - Sie markiert Zombies und wirft Verbandszeug ab.
  - Sie lockt die Zombies mit der Sirene der alten Schule weg, aber nicht dauernd.
  - Das Surren der Drohne lockt selbst.
- **Zombie-Nacht – „Die Nacht“ (gegen):**
  - Sie setzt mit Punkten Zombie-Gruppen und Arten (Läufer, Feuerwehrmann, Schreier).
  - Sie löst Stromausfall oder Nebel aus.
  - Nie im Blickfeld der Spieler, damit es fair bleibt.
- **Grenzland – Funkscanner (mit):** hört den Polizeifunk, sieht Streifen auf der Karte und lotst über das Handy.
- **Grenzland – Einsatzleitung (gegen):** schickt Streifen, stellt Sperren, ruft den Hubschrauber (begrenzt). Gegen sie spielen die anderen auf der Flucht.

## 4 Geht nur zu zweit
Allein bleibt alles möglich, nur langsamer oder mit einem Verbündeten wie Hubert.
- **Freie Simulation:**
  - Balken für den Pavillon tragen (die Tragehaltung gibt es schon);
  - beim Rückwärtsfahren mit dem Anhänger einweisen;
  - einer fällt, der andere setzt den Keil;
  - an der Rückewinde fährt einer, der andere hängt an.
- **Zombie-Nacht:**
  - Brett halten und nageln, doppelt so schnell;
  - die Tür zuhalten, während der andere vernagelt;
  - Räuberleiter aufs Garagendach oder durchs Fenster;
  - einen Verletzten stützen;
  - das Auto anschieben, wenn es nicht anspringt.
- **Grenzland:**
  - Räuberleiter über den Zaun am Außenlager;
  - den Trabi anschieben (1989);
  - Schmiere stehen: Wer aufpasst, sieht die Streife früher, der andere arbeitet schneller;
  - Gerhards Kiste zu zweit tragen (1989);
  - auf der Simson hinten sitzen und fotografieren.

## 5 Verständigen und Erinnern
- **Zeigen mit Bedeutung:**
  - Auf einen Zombie zeigen heißt „Zombie!“, auf eine Axt „Hier liegt eine Axt“, auf ein Auto „Ich fahre“, auf eine Tür „Hier rein“.
  - Im Bild erscheinen ein Ring in der eigenen Farbe und der Name, auf Wunsch gesprochen.
  - Am Handy: lange drücken.
- **Ein Rad mit Sätzen:** „Hilfe!“, „Warte“, „Folge mir“, „Danke“, „Zurück zum Haus“.
- **Text** nur im Handy und nur in privaten Räumen. Mitten im Spiel tippt niemand gern.
- **Sprache in der Nähe:**
  - Sie wird mit der Entfernung leiser und kommt aus der Richtung der Figur; Drücken zum Sprechen.
  - Für weite Wege gibt es das Funkgerät (Zombie) oder einen Anruf im Handy (Grenzland), dann mit Funk-Klang.
  - Trystero kann Ton-Ströme übertragen. Am besten mit Kopfhörern.
- **Mitspieler finden:**
  - Umriss durch Wände (frei und Zombie, nicht im Grenzland);
  - der Name über dem Kopf;
  - jeder Spieler hat eine eigene Farbe, auch auf der Karte;
  - „Zu Sarah springen“ in der freien Simulation.
- **Gesten:** Winken, Zeigen und Hinsetzen gibt es schon. Neu kommen Daumen hoch und Abklatschen dazu.
- **Fotomodus:** anhalten, die Kamera frei bewegen, eine Gruppenpose wählen, das Bild teilen. Vorlage ist die Handy-Kamera aus dem Grenzland.
- **Rückblick nach jeder Runde:**
  - was geschafft wurde und die Fotos;
  - kleine Auszeichnungen wie „Hat am öftesten aufgeholfen“, „Hat Falko mit dem Traktor erwischt“, „Am längsten unentdeckt“.

## 6 Avatare
- **Schnell drin:** in unter einer Minute fertig.
  - 8 Vorlagen und „Zufall“;
  - Farbe für Jacke und Hose;
  - Mütze oder Brille.
- **Der volle Baukasten** (Kopf, Frisur, Kleidung) entsteht parallel beim Hilfs-Agenten `avatare` und geht spätestens mit Schritt 3 live.
- **Grundlage bleibt Rocketbox** (115 Figuren, MIT). Die erwachsenen Männer teilen ein Skelett, die Frauen ein anderes, darum lassen sich
  Körper, Köpfe und Haare mischen. So entstanden Sarah und Christoph.
- **Bauplan statt Datei:**
  - etwa 100 Byte, gespeichert als `pav-avatar-v1` über `SAVE`;
  - jeder Browser baut die Figur daraus selbst;
  - keine Uploads und keine Abhängigkeit von Diensten. Ready Player Me hat am 31.01.2026 geschlossen.
- **Ausgewählt statt alles:** Eine kuratierte Auswahl sieht besser aus und lässt sich leichter prüfen als alle Kombinationen. Die Köpfe der echten Nachbarn sind nicht dabei.
- **Kleidung als Spiel:**
  - Im Grenzland beschreibt der Polizeifunk sie; Umziehen hilft.
  - In der Zombie-Nacht bleiben Schmutz und Blut über die Nacht.
  - Die Schutzausrüstung wirkt auf alle Figuren.

## 7 Freie Simulation

### Besuch
- **Einladen:** Der Gastgeber lädt in seine Welt ein: Garten, Pavillon, gefällte Bäume, Hasso. Gäste bringen ihren Avatar mit, ihr eigener Spielstand bleibt unberührt.
- **Führung:** Der Gastgeber zeigt den Garten und die Pavillon-Pläne. Die Gäste folgen ihm oder seinem Blick; das ist dieselbe Funktion wie im Workshop.
- **Erlaubt:** Unter Freunden ist alles erlaubt. Der Gastgeber holt den Stand vor dem Besuch mit einem Knopf zurück. Für Fremde und Workshops gibt es „Nur zuschauen“.
- **Umfallen statt sterben:** Wer vom Traktor des Freundes erwischt wird, fällt um und steht wieder auf.
- **Zusammen unterwegs:** als Beifahrer, mit Traktor und Anhänger, im Bus 203, mit dem Jetpack, mit dem Autopiloten nach Suhl.

### Spiele für Freunde
- **Verstecken im Dorf** (2–8 Spieler):
  - Verstecke aus der Zombie-Nacht: Schrank, unter dem Bett, Keller;
  - dazu 230 begehbare Häuser und der Wald an der Klinge;
  - eine Runde dauert 5–10 Minuten;
  - wenig Aufwand, viel Spaß – darum das erste Spiel.
- **„Wo bin ich?“** (2–8 Spieler):
  - Einer springt an einen geheimen Ort und schickt ein Bild. Die anderen tippen auf der Karte oder suchen ihn.
  - Punkte gibt es nach Entfernung und Zeit.
  - Das geht nur in einer echten Gegend, und man lernt sie dabei kennen (Vorbild: GeoGuessr).
- **Rennen:**
  - mit Auto und Traktor auf echten Straßen, mit dem Jetpack durch Ringe über Suhl;
  - im Grenzland mit Simson und Trabant;
  - die Strecke setzt man selbst mit Stecknadeln.
- **Holzfäller-Wettbewerb:** die Fällrichtung treffen, Punkte nach Abweichung und Zeit.
- **Skat zu dritt** am runden Skattisch in der alten Schule, wo freitags der Skatabend ist.

### Gemeinsame Projekte
- **Unser Pavillon:** die Bauphasen aus „Ratscher von oben“ über mehrere Abende. Einer ist Bauleiter oben, die anderen bauen unten.
- **Vom Baum zum Brett:** die Holzkette zu zweit, vom Waldbegang bis zum fertigen Brett.
- **Was bleibt:** Was geschafft ist, bleibt im Spielstand des Gastgebers. Die Gäste behalten Fotos, Einträge im Entdeckerbuch und Auszeichnungen.

## 8 Zombie-Nacht
- **Bis zu viert** (heute zwei).
- **Startpaket in 5 Sekunden:** So hat jeder sofort eine Rolle.
  - Handwerker: Hammer, Nägel, Bretter; vernagelt schneller.
  - Sanitäter: zwei Verbandskästen; hilft schneller auf.
  - Fahrer: Autoschlüssel und Benzin.
  - Funker: Funkgerät und starke Lampe.
- **Kurzrunde „Eine Nacht“** (rund 20 Minuten bei normalem Tempo), neben der Geschichte über drei Nächte bis zum Bus.
- **Sprache, die die Zombies hören:** Flüstern geht geduckt, Rufen lockt sie an. Das macht Angst und bringt Lacher zugleich.
- **Zusammenhalten:**
  - aufhelfen statt sterben;
  - Gegenstände geben, eine gemeinsame Kiste;
  - Tür zuhalten, Brett halten, Räuberleiter.
- **Freundbeschuss leicht:** Schläge schubsen nur, Schrot und Feuer treffen auch Freunde.
- **Jede Runde neu gemischt:** Vorräte und Waffen liegen woanders, damit sich Wiederholen lohnt. Nur Huberts Flinte bleibt, wo sie ist.
- **Mehr Spieler, mehr Zombies,** gestaffelt. Der Schreier ruft alle.
- **Von oben:** die Drohne oder „Die Nacht“ (Abschnitt 3).
- **Rückblick** am Morgen oder im Bus.
- **Später,** nur wenn alle zustimmen: „Infiziert“ – wer gebissen wird, spielt als Zombie weiter.

## 9 Grenzland
- **Das Duo mit zwei Menschen:** Einer spielt Falko, der andere Sarah.
- **Treffpunkt:**
  - Eine Mission beginnt erst, wenn beide am Startpunkt stehen.
  - Zwischensequenzen laufen nur mit beiden.
  - Überspringen geht, wenn beide drücken.
- **Niemand wartet:** Jede Mission wird so nachgeschärft, dass beide gleichzeitig zu tun haben.
  - M1: Einer trägt das Paket, der andere behält den Transporter im Blick, der dem Bus folgt (Idee aus Paket D).
  - M2: Beide fahren das Rennen, gegeneinander und gegen die Clique.
  - M3 (1989): Einer trägt die Kiste, der andere lenkt den ABV ab.
  - M4: getrennt wie bisher; einer lenkt ab, der andere fotografiert.
  - M5: Einer bricht ein, der andere steht Schmiere oder wartet als Fahrer.
- **Fahndung im Team:** Wer erkannt ist, zieht die Polizei auf sich. Der andere lenkt ab oder holt ihn ab.
- **Kapitel 2 für bis zu vier:**
  - ein Coup mit Rollen: Fahrer, Ausspähen, Einbruch, Ablenkung;
  - gemeinsam von oben geplant;
  - Spieler 3 und 4 sind neue Leute der Crew mit eigenem Avatar.
- **Räuber und Gendarm:** Einer steuert die Einsatzleitung von oben oder fährt Streife, die anderen sind auf der Flucht, auf den echten Straßen.
- **Nebenbei im Wettbewerb:** Kegeln an der Feldscheune, Angeln an der Talsperre.

## 10 Workshop
- **Leichtansicht als Standard:**
  - eine Karte aus Luftbild und Straßen im Handy-Browser, ohne die 3D-Welt;
  - sie lädt in Sekunden, auch auf alten Handys;
  - 3D nur für die, die wollen.
- **Mitbauen:** Aus einem Katalog setzen die Teilnehmenden Dinge auf die Karte: Mitfahrbank, Bäume, Solarmodule, Haltestelle, Bank. Es erscheint
  sofort im Zwilling am Beamer. Das sorgt für das „Aha“ und für Beteiligung.
- **Einstieg „Wo ist das?“** mit Bildern aus dem Zwilling von Orten in Ratscher. Die Einheimischen gewinnen, alle lachen, das Eis ist gebrochen.
- **Abstimmen** zwischen Variante A und B, dazu Daumen und Kommentar an jeder Stecknadel.
- **Moderation:** „Blick folgen“, „Alle zu mir“, Wortmeldungen freigeben. Die Zeitreise steuert nur die Moderation.
- **Ergebnisliste** mit Ort, Bild und Stimmen zum Mitnehmen.
- **Schutz:** Verbindungen laufen nur über den Raum-Dienst, damit niemand die IP-Adresse anderer sieht. Kein Konto, nur Vorname oder Rolle.

## 11 Technik

### 11.1 Wer rechnet was
- **Jeder seine Figur und sein Fahrzeug.** So reagiert alles sofort. Wer fährt, rechnet das Auto, auch mit Beifahrer.
- **Ein Treffer zählt so, wie der Schlagende ihn sieht.** Der Gastgeber prüft nur, ob er möglich war. So fühlt sich der Kampf auch für Gäste direkt an.
- **Der Gastgeber rechnet den Rest:** Uhr, Wetter, Zombies, Polizei, benannte Leute.
- **Ereignis statt Physik:** Geschickt wird zum Beispiel „Baum B fällt Richtung 230°“. Jeder rechnet den Fall selbst, und er sieht überall
  gleich aus, weil `FELL` mit demselben Datensatz rechnet.

### 11.2 Was geteilt ist
- **Geteilt:**
  - die Mitspieler und ihre Fahrzeuge;
  - Hubert, Ronald, die acht Dorfbewohner und Hasso;
  - die Busse und die Änderungen an der Welt;
  - im Modus die Zombies (Zombie-Nacht) sowie Polizei und Zeugen (Grenzland).
- **Bei jedem selbst:** Verkehr, Spaziergänger, Tiere, Wind und Regentropfen. Das Wetter selbst kommt vom Gastgeber.
  - Der lokale Verkehr hält auch für Mitspieler. Für den Spieler, Fußgänger und parkende Autos tut er das schon heute.
- **Nähe:** Was weit weg ist, wird seltener geschickt.

### 11.3 Gastwelt nur für den Besuch
- Gäste sehen die Welt des Gastgebers, ohne dass ihr eigener Spielstand überschrieben wird.
  - Die Welt-Schlüssel laufen während des Besuchs über einen Speicher nur für diesen Besuch.
  - `SAVE` hat so einen Speicher schon für Browser, die nichts speichern (etwa im privaten Modus), dazu `SAVE.dump` und `SAVE.load`.
- Beim Gehen ist alles wie vorher.

### 11.4 Version
- Zusammen spielen geht, wenn Protokoll-Version und Datenstand der Welt gleich sind. Nicht jede neue Live-Version blockiert.
- Sonst sagt das Spiel, wer neu laden soll: der mit der älteren Version. „Neu laden macht weiter“ gibt es schon.

### 11.5 Abbrüche
- Am iPhone hält Safari WebRTC an, sobald der Bildschirm sperrt oder Safari in den Hintergrund geht. Darum:
  - Der Bildschirm bleibt wach, solange man spielt (Wake Lock).
  - Bei einem Abbruch wartet das Spiel bis zu 2 Minuten („Sarah verbindet neu …“) und macht dann weiter, wo es war.
  - Das Spiel empfiehlt den Laptop als Gastgeber.
- Die Übergabe an einen anderen Gastgeber kommt erst später, wenn überhaupt.

### 11.6 KI und Mikrofon
- **KI über den Gastgeber:** Die KI-Gespräche der Gäste laufen auf Wunsch über den Browser des Gastgebers, mit seinem Schlüssel. Der Schlüssel verlässt seinen Browser nie.
- **Wer zuhört:** Wer spricht, hört die Antwort; wer daneben steht, auch, mit Untertiteln. Die Leute merken sich jeden Spieler getrennt.
- **Mikrofon getrennt:** Im Gesprächsfenster geht es an die Person (Spracherkennung, `npc/ki.js`), sonst an die Mitspieler.
  Ob beides am iPhone gleichzeitig ginge, ist ungeprüft; darum nie gleichzeitig.

### 11.7 Grenzen je Modus
- **Zombie-Nacht und Grenzland:** bis zu vier, denn der Gastgeber rechnet Zombies und Polizei für alle.
- **Freie Simulation:** bis zu vier am Handy, bis zu acht am Laptop.
- **Workshop:** etwa 30 in der Leichtansicht, dazu wenige in 3D.
- **Speicher:** Am Handy laden die Texturen der Mitspieler in halber Kantenlänge (das iPhone verwirft die Seite bei etwa 1 GB).
- **Kein Stocken:** Beim Beitritt werden alle Avatar-Materialien vorab übersetzt.

### 11.8 Verbindung und Kosten
- **Ohne Konto (wie heute):** direkt verbunden, gefunden über öffentliche Nostr-Relais. Das kostet nichts. Aber ohne TURN klappt es in manchen
  Mobilfunknetzen nicht, und die Relais sind fremde Dienste ohne Zusage.
- **Raum-Dienst bei Cloudflare:** kostenlos, braucht aber ein Konto. Es ist ein kleiner Worker mit einem Durable Object je Raum, der mitwächst:
  1. Er hilft beim Finden und gibt TURN-Zugangsdaten aus, die nach Stunden ablaufen. Für das Finden hat Trystero eine Variante mit eigenem
     WebSocket-Relais.
  2. Später leitet er für den Workshop und unter Fremden weiter, damit keine IP-Adressen sichtbar sind.
  3. Später hält er gemeinsame Spielstände, die auch ohne Gastgeber weiterleben.
- **Freier Rahmen:**
  - TURN: 1 000 GB im Monat;
  - Durable Objects: 100 000 Anfragen am Tag, wobei eingehende WebSocket-Nachrichten im Verhältnis 20:1 zählen.
- **Rechnung:**
  - zu viert mit Sprache, alles über den Umweg: über 3 000 Spielstunden im Monat;
  - ein Workshop mit 30 Handys und einer Nachricht je Sekunde: rund 18 Stunden am Tag.
- **Wo was liegt:** Der TURN-Schlüssel bleibt im Worker. Die Website bleibt auf GitHub Pages.

## 12 Spieltests
- **Echte Runde:** nach jedem Schritt eine Runde zu zweit, auf zwei Geräten in zwei Netzen (Laptop im WLAN, iPhone im Mobilfunk).
- **Messen:**
  - die Zeit vom Link bis „zusammen“ (Ziel: unter 1 Minute am Laptop);
  - Abbrüche je Stunde;
  - Wartezeiten über 15 s;
  - die Bildrate.
- **Danach drei Fragen:**
  - Was war der beste Moment?
  - Wo habt ihr gewartet oder euch verloren?
  - Würdet ihr noch eine Runde spielen?
- **Automatisch:** ein Test `netz` mit 2–4 Fenstern über den BroadcastChannel, nach dem Muster von `zombie_netz`, mit künstlicher Verzögerung und Paketverlust.

## 13 Schutz und Recht (Hinweise, keine Rechtsberatung)
- **Private Räume:** nur Einladungen, keine Lobby.
- **IP-Adressen:** Direkte Verbindungen zeigen die IP-Adresse, und IP-Adressen gelten als personenbezogene Daten. Unter Freunden ist das üblich,
  unter Fremden nur über den Raum-Dienst.
- **Erwachsenen-Modi:** Zombie-Nacht und Grenzland bleiben für Erwachsene. Chat und Sprache mit anderen sind „Interaktionsrisiken“, die der
  Jugendschutz seit 2021 eigens berücksichtigt. Darum keine öffentlichen Räume ohne vorherige Prüfung.
- **Sprache** wird nie aufgezeichnet.
- **Impressum und Datenschutzerklärung,** sobald der Raum-Dienst läuft.

## 14 Fahrplan (jeder Schritt einzeln live)
1. **„Zu zweit im Garten“, die erste spielbare Runde:**
   - Netz-Kern aus der Zombie-Nacht;
   - Raum-Dienst, oder Nostr, falls kein Konto;
   - Avatar-Vorlagen mit Farben;
   - springen, Umriss, Zeigen mit Bedeutung, Gesten, Fotomodus;
   - Gastwelt und Wiederverbinden;
   - **Verstecken im Dorf**;
   - Test auf zwei Geräten in zwei Netzen.
2. **Zombie-Nacht zu viert:**
   - Avatare in der Ich-Sicht;
   - Sprache mit hörenden Zombies;
   - Startpakete, Aufhelfen, Brett halten und Tür zuhalten;
   - Kurzrunde, Rückblick, Freundbeschuss leicht.
3. **Oben und unten:** Drohne als Lotse, Bauleiter, Leichtansicht als Karte, „Wo bin ich?“. Spätestens jetzt der volle Avatar-Baukasten.
4. **Grenzland zu zweit:**
   - Treffpunkt und nachgeschärfte Missionen;
   - Fahndung im Team;
   - Räuberleiter, Anschieben, Kiste tragen;
   - Räuber und Gendarm;
   - KI über den Gastgeber.
5. **Workshop zum Mitmachen:** QR-Code, Leichtansicht, Mitbauen, Abstimmen, Ergebnisliste, „Wo ist das?“.
6. **Danach:**
   - „Die Nacht“ als Spielleiter;
   - Kapitel 2 zu viert;
   - Unser Pavillon;
   - Rennen, Holzfäller-Wettbewerb, Skat;
   - gemeinsame Spielstände.

**Hilfs-Agenten:** `netz-kern` und `avatare` können sofort nebeneinander starten, `leichtansicht` ab Schritt 3. Gemeinsame Dateien
(`game/avatar.js`, `zombie/z_netz.js`) ändert jeweils nur einer.

## 15 Entscheidungen (Falko)
1. Ein Cloudflare-Konto für den Raum-Dienst anlegen (kostenlos)? Ohne Konto bleibt es beim heutigen Weg, und im Mobilfunk kommt die Verbindung oft nicht zustande.
2. Sprache in der Nähe: ja? Und sollen die Zombies mithören?
3. Verstecken im Dorf als erstes Spiel, oder lieber „Wo bin ich?“?
4. Freundbeschuss leicht als Voreinstellung?
5. Unter Freunden alles erlauben, mit „Rückgängig“ für den Gastgeber?
6. Falko, Sarah und Christoph als Figuren: nur für euch drei?
7. Grenzland: Spielt der zweite Mensch Sarah?
8. KI-Gespräche der Gäste über deinen Schlüssel?

## Für Chats
- **Vorhanden:**
  - `zombie/z_netz.js`: Raum, Übertragung, Zustand, Figur mit Schild, Zombie-Schnappschüsse;
  - `lazy/raum.js`: Trystero, im Repo `^0.26.0`;
  - `game/avatar.js`: Figuren, `figHeadwear`, Tragehaltung;
  - `core/save.js`: `SAVE` mit Ausweich-Speicher im Arbeitsspeicher, `dump` und `load`;
  - `npc/ki.js`: Spracherkennung;
  - `verkehr/verkehr_auto.js`: hält für Spieler, Fußgänger und Parkende;
  - `zombie/z_haus.js` und `z_innen.js`: Verstecke;
  - `strategie/st_modus.js`: Draufsicht, Taste U;
  - `zukunft/zk_workshop.js`: `WORKSHOP.slot('phone')`.
- **Doku im Repo:** `docs/features/figuren.md`, `grenzland-figuren.md`, `workshop.md`, `dorf.md`, `strategie.md`, `strategie-bau.md`; Pläne
  `docs/plans/plan_strategie.md` und `plan_grenzland.md`.
- **Neu geplant:** `viz3/src/netz/` (`NETZ`), Avatar-Bauplan `pav-avatar-v1`, Test `netz`, Raum-Dienst unter `tools/raum-dienst/`.

## Quellen
- **Trystero** (MIT): https://github.com/dmotz/trystero
  - Strategien, darunter ein eigenes WebSocket-Relais (`@trystero-p2p/ws-relay`), Ton- und Bild-Ströme;
  - `turnConfig` und `rtcConfig` geprüft in `@trystero-p2p/core` 0.27.0;
  - verwaltete Strategien mit Zusage eher für den Ernstfall: https://githaven.org/Shiloh/remnantchat/issues/2
- **Cloudflare:**
  - Realtime TURN, Preise und freier Rahmen: https://developers.cloudflare.com/realtime/pricing/
  - TURN-Zugangsdaten nur über ein eigenes Backend: https://developers.cloudflare.com/calls/turn/generate-credentials
  - Durable Objects, Preise (Free-Plan, WebSocket 20:1): https://developers.cloudflare.com/durable-objects/platform/pricing
  - Durable Objects auch im Free-Plan: https://developers.cloudflare.com/durable-objects
- **iPhone:** Safari hält WebRTC und Web Audio im Hintergrund und bei gesperrtem Bildschirm an: https://developer.apple.com/forums/thread/774239
- **Grenzen direkter Verbindungen:** https://www.forasoft.com/learn/video-streaming/glossary/terms-streaming/mesh-topology · https://peerjs.com/client/faq
- **Avatare:**
  - Rocketbox (115 Figuren, MIT): https://github.com/microsoft/Microsoft-Rocketbox
  - Ende von Ready Player Me: https://www.pocketgamer.biz/netflix-acquires-avatar-creation-platform-ready-player-me
- **IP-Adressen:** https://www.rfc-editor.org/rfc/rfc8828.html · https://www.forum-media.at/news/Datenschutz-IT/Der-Kampf-um-IP-Adressen-Datenschutz-und-mehr
- **Interaktionsrisiken im Jugendschutz:** https://www.bmbfsfj.bund.de/resource/blob/293316/df27f98035e75d106ccfbd358980e31c/stellungnahme-hearing-2-game-data.pdf
