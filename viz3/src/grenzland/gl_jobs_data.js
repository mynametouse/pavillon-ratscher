// ===================== feat/grenzland-ruf: side jobs and small side quests – when they are offered, what they pay, their words (GLJOBSDATA) =====================
// Falko, 17.11.2026 12:26 („Nebenjobs“: Brennholz fahren, Brötchen ausliefern, bei der Feuerwehr helfen – kleines Geld und guter Ruf) and
// ~13:30 (realism first, Ratscher and Schleusingen: „ein paar Sidequests … oder lustige Nebenschauplätze“). Pure (no scene – node tests:
// viz3/test/unit/grenzland_ruf.test.mjs); grenzland/gl_jobs.js runs them in the world.
//   JOBS       Brötchen ausliefern (Monday to Saturday, the crate at the shop on wheels from 5:30, six bags on six doors by 7:30 – a tip
//              for being quick, a deduction and a complaint for squashed rolls), Brennholz fahren (Wolfgang's split beech from the forest
//              track to the Klinge, two loads in the estate car to two houses), the fire brigade's exercise (Saturday 9:00 at the old
//              school: suction hose, pump, hose line, water on the target – then coffee and cake)
//   AUFGABEN   small side quests of the village: Ingrid's yellow bin to the road (lid to the road!), Katrin's parcel left at Gerhard's,
//              Milchreis from the shop on wheels for Gerhard, Gerhard's photographs for the town archive in Schleusingen (open hours)
// Every job and quest has a field `hinweis` for chapter 2 (a story hint dropped in passing) – empty for now. The people are the invented
// villagers of the game (dorf/dorf_text.js) and two invented volunteers of the fire brigade; the bakery is invented; Hubert and Ronald
// never appear. Spoken lines are fixed strings (linien()).
export const GLJOBSDATA = (() => {
  const WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  // the weekday of a day since 1970 (0 Sunday … 6 Saturday; 1 January 1970 was a Thursday)
  const wochentag = eday => ((Math.floor(eday) % 7) + 7 + 4) % 7;
  const minOf = t => ((Math.floor(t) % 1440) + 1440) % 1440;
  const hm = m => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  // ---- the side jobs ----
  const JOBS = {
    broetchen: {
      id: 'broetchen',
      art: 'job',
      titel: 'Brötchen ausliefern',
      von: 'Backstube Schleusetal',
      tage: [1, 2, 3, 4, 5, 6],
      ab: 5 * 60 + 30,
      bis: 7 * 60,
      ende: 7 * 60 + 30,
      ort: 'Verkaufswagen am Anger',
      n: 6,
      lohn: 12,
      trinkgeld: 8,
      par: 300, // seconds from taking the crate: all of the tip up to here …
      spaet: 720, // … none from here
      platt: 2, // euros off for each squashed bag
      ruf: 5,
      angebot:
        'Guten Abend! Hier ist die Backstube Schleusetal. Uwe muss morgen früh aufs Feld – wer hängt in Ratscher die Brötchentüten an die Türen? Die Kiste steht ab halb sechs am Verkaufswagen am Anger. 12 € und Trinkgeld. Bis halb acht muss alles hängen.',
      kurz: 'Ab 5:30 am Verkaufswagen: sechs Tüten an sechs Türen, bis 7:30.',
      hinweis: '',
    },
    holz: {
      id: 'holz',
      art: 'job',
      titel: 'Brennholz fahren',
      von: 'Wolfgang',
      tage: [1, 2, 3, 4, 5, 6],
      ab: 8 * 60,
      bis: 17 * 60,
      ende: 19 * 60,
      ort: 'Holzstapel am Waldweg zur Klinge',
      fuhren: 2,
      lohn: 20, // per load
      ruf: 3, // per load
      angebot:
        'Hier Wolfgang. Am Waldweg zur Klinge liegt ein Stapel gespaltenes Buchenholz. Fahrt ihr Gerhard und Katrin je eine Fuhre vors Haus? In euren Kombi passt eine Fuhre. 20 € die Fuhre. Mein Rücken sagt Nein.',
      kurz: 'Tagsüber: mit dem Kombi zwei Fuhren vom Waldweg zur Klinge zu Gerhard und Katrin.',
      hinweis: '',
    },
    feuerwehr: {
      id: 'feuerwehr',
      art: 'job',
      titel: 'Übung der Feuerwehr',
      von: 'Manfred',
      tage: [6],
      ab: 8 * 60 + 40,
      bis: 9 * 60 + 30,
      ende: 11 * 60,
      ort: 'Alte Schule (Feuerwehr)',
      lohn: 10, // from the comradeship's kitty, „für den Sprit“
      ruf: 8,
      par: 150, // seconds to water on the target: the district's best
      angebot:
        'Übung der Feuerwehr Samstag 9 Uhr an der alten Schule. Ich bin beim Kreisfeuerwehrtag, Steffen leitet. Uns fehlt einer für den Angriffstrupp. Wer kommt, bekommt Kuchen. Wer nicht kommt, bringt welchen. – Manfred',
      kurz: 'Samstag 9 Uhr an der alten Schule: Saugschlauch, Pumpe, Schlauch, Wasser marsch.',
      hinweis: '',
    },
  };
  // ---- the small side quests of the village (art 'aufgabe'): who asks, when it may be done, what it brings ----
  const AUFGABEN = {
    tonne: {
      id: 'tonne',
      art: 'aufgabe',
      titel: 'Die gelbe Tonne',
      von: 'Ingrid',
      tage: [0, 1, 2, 3, 4, 5, 6],
      ab: 7 * 60,
      bis: 22 * 60,
      ort: 'Ingrids Haus',
      lohn: 0,
      ruf: 2,
      angebot:
        'Ich bin bis morgen in Erfurt. Die gelbe Tonne kommt MORGEN früh. Stellt mir bitte jemand meine Tonne an die Straße? Deckel zur Straße!! – Ingrid',
      danke:
        'Die Tonne steht an der Straße, der Deckel zeigt zur Straße. Es gibt noch Hoffnung für dieses Dorf. Danke! – Ingrid',
      chat: ['Uwe', 'Ingrids Tonne steht an der Straße. War ich nicht.'],
      kurz: 'Ingrids gelbe Tonne an die Straße stellen – Deckel zur Straße.',
      hinweis: '',
    },
    paket: {
      id: 'paket',
      art: 'aufgabe',
      titel: 'Das Paket beim Nachbarn',
      von: 'Katrin',
      tage: [1, 2, 3, 4, 5, 6],
      ab: 8 * 60,
      bis: 21 * 60,
      ort: 'Gerhards Haus',
      lohn: 0,
      ruf: 2,
      angebot:
        'Der Paketbote hat mein Paket schon wieder bei Gerhard abgegeben. Ich habe Spätdienst. Holt es jemand ab und legt es mir vor die Tür? Es ist nichts Zerbrechliches. Glaube ich. – Katrin',
      danke: 'Paket ist da! Es war übrigens doch was Zerbrechliches. Ist aber heil. Danke! – Katrin',
      chat: ['Gerhard', 'Für die Chronik: Das Paket für Katrin hat diesmal nur einen Tag bei mir gewohnt.'],
      kurz: 'Katrins Paket bei Gerhard abholen und ihr vor die Tür legen.',
      hinweis: '',
    },
    einkauf: {
      id: 'einkauf',
      art: 'aufgabe',
      titel: 'Milchreis für Gerhard',
      von: 'Gerhard',
      tage: [0, 1, 2, 3, 4, 5, 6],
      ab: 8 * 60,
      bis: 20 * 60,
      ort: 'Verkaufswagen, dann Gerhards Haus',
      ware: 'milchreis', // bought at the shop on wheels (GLNLOGIK's goods)
      lohn: 4, // the money back and a little more
      ruf: 3,
      angebot:
        'Bringst du mir vom Verkaufswagen ein Päckchen Milchreis mit? Ich kann nicht mehr so lange stehen. Das Geld bekommst du zurück, und eine Geschichte für die Chronik gibt es obendrauf. – Gerhard',
      danke:
        'Danke für den Milchreis! Die Geschichte: 1888 haben sie die Linde gepflanzt, und der Pfarrer hat gesagt, sie wird älter als das Kaiserreich. Er hat recht behalten. – Gerhard',
      kurz: 'Ein Päckchen Milchreis vom Verkaufswagen zu Gerhard bringen.',
      hinweis: '',
    },
    chronik: {
      id: 'chronik',
      art: 'aufgabe',
      titel: 'Fotos für das Stadtarchiv',
      von: 'Gerhard',
      tage: [1, 2, 3, 4, 5],
      ab: 8 * 60,
      bis: 18 * 60,
      ort: 'Rathaus Schleusingen',
      oeffnung: 'rathaus', // the town hall's hours (OEFFNUNG of laeden-leben when it is there)
      zeiten: [
        [1, 9 * 60, 12 * 60],
        [2, 9 * 60, 12 * 60],
        [2, 13 * 60, 18 * 60],
        [3, 9 * 60, 12 * 60],
        [4, 9 * 60, 12 * 60],
        [4, 13 * 60, 16 * 60],
        [5, 9 * 60, 12 * 60],
      ], // [weekday, from, to] when OEFFNUNG says nothing
      lohn: 0,
      ruf: 3,
      angebot:
        'Ich habe eine Mappe mit Fotos vom November 1989 für das Stadtarchiv. Bringst du sie ins Rathaus nach Schleusingen? Abholen kannst du sie bei mir. Aber denk an die Öffnungszeiten – Beamte warten auf niemanden. – Gerhard',
      danke: 'Das Archiv hat die Fotos! Sie wollen eine Ausstellung machen. Mit meinem Namen drunter. Danke! – Gerhard',
      chat: ['Gerhard', 'Für die Chronik: Meine Fotos vom November 1989 liegen jetzt im Stadtarchiv Schleusingen.'],
      kurz: 'Gerhards Mappe abholen und zu den Öffnungszeiten im Rathaus Schleusingen abgeben.',
      hinweis: '',
    },
  };
  const alle = () => Object.assign({}, JOBS, AUFGABEN);
  // ---- when: may it begin at t (game minutes) on that weekday? the minutes until it may (0: now), within the next week ----
  function offenAm(J, wd, m) {
    return J.tage.includes(wd) && m >= J.ab && m < J.bis;
  }
  function bis(J, t, eday) {
    const m = minOf(t),
      d0 = Math.floor(eday);
    for (let k = 0; k < 8; k++) {
      const wd = wochentag(d0 + k);
      if (!J.tage.includes(wd)) continue;
      if (k === 0) {
        if (m >= J.ab && m < J.bis) return 0;
        if (m < J.ab) return J.ab - m;
        continue;
      }
      return k * 1440 + J.ab - m;
    }
    return Infinity;
  }
  // when the next window is, in words: „jetzt“ · „heute ab 5:30“ · „morgen ab 9:00“ · „Samstag ab 8:40“
  function wann(J, t, eday) {
    const n = bis(J, t, eday);
    if (n === 0) return 'jetzt bis ' + hm(J.bis);
    if (!Number.isFinite(n)) return '';
    const m = minOf(t),
      tage = Math.floor((m + n) / 1440);
    return (tage === 0 ? 'heute' : tage === 1 ? 'morgen' : WT[wochentag(Math.floor(eday) + tage)]) + ' ab ' + hm(J.ab);
  }
  // a public building's hours ([weekday, from, to]) – open now?
  const zeitOffen = (Z, wd, m) => (Z || []).some(z => z[0] === wd && m >= z[1] && m < z[2]);
  const zeitenText = Z => {
    const by = {};
    for (const [wd, a, b] of Z || []) (by[WT[wd].slice(0, 2)] = by[WT[wd].slice(0, 2)] || []).push(hm(a) + '–' + hm(b));
    return Object.entries(by)
      .map(([d, l]) => d + ' ' + l.join(', '))
      .join(' · ');
  };
  // ---- what a job pays ----
  const clamp01 = x => Math.max(0, Math.min(1, x));
  // Brötchen: the tip falls from full (up to par seconds) to nothing (from `spaet`); each squashed bag costs; late (after 7:30): no tip
  function lohnBroetchen(o = {}) {
    const J = JOBS.broetchen,
      sek = Math.max(0, +o.sek || 0),
      platt = Math.max(0, Math.round(+o.platt || 0)),
      tip = o.zuSpaet ? 0 : Math.round(J.trinkgeld * clamp01((J.spaet - sek) / (J.spaet - J.par))),
      abzug = platt * J.platt,
      summe = Math.max(0, J.lohn + tip - abzug),
      ruf = Math.max(1, J.ruf + (tip >= J.trinkgeld / 2 && !platt ? 1 : 0) - (o.zuSpaet ? 3 : 0) - Math.min(2, platt));
    return { lohn: J.lohn, trinkgeld: tip, abzug, summe, ruf };
  }
  function lohnHolz(fuhren) {
    const J = JOBS.holz,
      n = Math.max(0, Math.min(J.fuhren, Math.round(+fuhren || 0)));
    return { summe: n * J.lohn, ruf: n * J.ruf };
  }
  // the exercise: what Steffen says about the time (seconds from „Übung beginnt“ to water on the target)
  function urteil(sek) {
    const P = JOBS.feuerwehr.par;
    return sek <= P ? 'schnell' : sek <= P * 1.6 ? 'gut' : 'langsam';
  }
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  // ---- the words in the world: task card, actions, HUD, the people of the exercise (spoken: fixed strings) ----
  const T = {
    broetchen: {
      kiste: 'Brötchenkiste nehmen',
      haengen: 'Brötchentüte an die Tür hängen',
      zum: 'Zum Verkaufswagen am Anger: Dort steht die Kiste der Backstube.',
      runde: (n, z) => 'Noch ' + n + (n === 1 ? ' Tüte' : ' Tüten') + ' – an die Türen hängen (Radar). ' + z,
      platt: 'Rums – da sind Brötchen zerdrückt worden.',
      fertig: 'Brötchen ausgeliefert',
      zuSpaet: 'Halb acht vorbei – die Leute frühstücken schon.',
      beschwerde: 'Meine Brötchen sind platt wie eine Flunder. Bezahlt habe ich für runde. – Wolfgang',
      danke: 'Die Brötchen hingen pünktlich an der Tür. Danke! – Heike',
    },
    holz: {
      zum: 'Mit dem Kombi zum Holzstapel am Waldweg zur Klinge.',
      laden: 'Holz einladen',
      abladen: 'Holz abladen',
      auto: 'Dafür braucht es den Kombi – er steht am Garten.',
      ranfahren: 'Mit dem Kombi näher an den Stapel fahren.',
      zu: wer => 'Die Fuhre zu ' + wer + ' bringen und vor dem Haus abladen.',
      zurueck: 'Zurück zum Holzstapel: noch eine Fuhre.',
      fertig: 'Brennholz geliefert',
      gerhard: 'Das Holz ist da. Ofen an, Chronik auf. Danke! – Gerhard',
      katrin: 'Ordentlich geschichtet, das Holz. Das muss man erst mal können. Danke! – Katrin',
    },
    feuerwehr: {
      melden: 'Zur Übung melden',
      zum: 'Samstag 9 Uhr: zur Übung an der alten Schule.',
      saug: 'Saugschlauch an die Pumpe kuppeln',
      starten: 'Pumpe anwerfen',
      schlauch: 'Mit dem Schlauch zum Ziel laufen (die Schlauchleitung rollt sich hinter dir ab).',
      rohr: 'Wasser marsch!',
      schritte: [
        'Saugschlauch vom Wasserbecken an die Pumpe kuppeln.',
        'Die Pumpe anwerfen.',
        'Mit dem Schlauch bis zur Markierung vor dem Ziel laufen.',
        'Strahlrohr auf – Wasser marsch aufs Ziel.',
      ],
      kaffee: 'Kaffee und Kuchen',
      fertig: 'Übung der Feuerwehr',
    },
    tonne: { schieben: 'Gelbe Tonne an die Straße stellen', zum: 'Zu Ingrids Haus: Die gelbe Tonne steht am Haus.' },
    paket: {
      holen: 'Katrins Paket abholen',
      ablegen: 'Paket vor die Tür legen',
      zum: 'Bei Gerhard das Paket abholen.',
      zu: 'Das Paket zu Katrin bringen und vor die Tür legen.',
    },
    einkauf: {
      kaufen: 'Am Verkaufswagen ein Päckchen Milchreis kaufen.',
      bringen: 'Den Milchreis zu Gerhard bringen.',
      geben: 'Gerhard den Milchreis geben',
      zu: 'Der Verkaufswagen hat gerade zu – er hält vormittags und am späten Nachmittag am Anger.',
    },
    chronik: {
      holen: 'Gerhards Fotomappe abholen',
      abgeben: 'Fotomappe im Rathaus abgeben',
      zum: 'Bei Gerhard die Fotomappe abholen.',
      zu: z => 'Die Mappe im Rathaus Schleusingen abgeben (geöffnet: ' + z + ').',
      geschlossen: z => 'Das Rathaus hat gerade zu. Geöffnet: ' + z + '.',
    },
    angenommen: 'Auftrag angenommen',
    abgebrochen: 'Auftrag abgebrochen',
    nichtJetzt: 'Das geht gerade nicht – erst die Mission.',
    warten: 'Bis zum Beginn warten',
  };
  // the people of the exercise: two invented volunteers (Manfred, the brigade's head, is away at the district's fire brigade day)
  const LEUTE = {
    fw_steffen: { name: 'Steffen', rolle: 'Löschmeister', g: 'm', age: 44 },
    fw_anja: { name: 'Anja', rolle: 'Maschinistin', g: 'f', age: 31 },
  };
  const FW = {
    begruessung: [
      ['fw_steffen', 'Da bist du ja. Manfred hat gesagt, du kommst. Ich bin Steffen, ich leite heute.'],
      ['fw_anja', 'Ich bin Anja, Maschinistin. Die Pumpe ist meine, die Kuchen sind von allen.'],
      [
        'fw_steffen',
        'Übung Löschangriff: Saugschlauch an die Pumpe, Pumpe an, Schlauch zum Ziel, Wasser marsch. Die Uhr läuft ab jetzt.',
      ],
    ],
    saug: ['fw_anja', 'Gut gekuppelt. Fest anziehen, sonst zieht sie Luft.'],
    pumpe: ['fw_anja', 'Pumpe läuft! Jetzt den Schlauch raus.'],
    schlauch: ['fw_steffen', 'Schlauch liegt. Strahlrohr auf!'],
    wasser: ['fw_steffen', 'Wasser marsch! Und Ziel getroffen.'],
    zeit: {
      schnell: ['fw_steffen', 'Das war schnell. Damit fahren wir zum Kreisausscheid.'],
      gut: ['fw_steffen', 'Ordentlich. Manfred wird zufrieden sein.'],
      langsam: ['fw_steffen', 'Wasser ist Wasser. Beim nächsten Mal etwas flotter.'],
    },
    kaffee: [
      ['fw_anja', 'Und jetzt Kaffee und Kuchen. Der Streuselkuchen ist von Heike, der Bienenstich von Uwe.'],
      ['fw_steffen', 'Uwe backt nicht. Uwe kauft. Aber das sagen wir ihm nicht.'],
      ['fw_anja', 'Hier, für dich. Und zehn Euro aus der Kameradschaftskasse – für den Sprit.'],
    ],
  };
  // every spoken line (the recordings): [[who, text], …]
  function linien() {
    const L = [];
    const add = a => {
      if (a && !L.some(q => q[0] === a[0] && q[1] === a[1])) L.push([a[0], a[1]]);
    };
    for (const a of FW.begruessung) add(a);
    for (const k of ['saug', 'pumpe', 'schlauch', 'wasser']) add(FW[k]);
    for (const a of Object.values(FW.zeit)) add(a);
    for (const a of FW.kaffee) add(a);
    return L;
  }
  return {
    WT,
    wochentag,
    minOf,
    hm,
    JOBS,
    AUFGABEN,
    alle,
    offenAm,
    bis,
    wann,
    zeitOffen,
    zeitenText,
    lohnBroetchen,
    lohnHolz,
    urteil,
    mmss,
    T,
    LEUTE,
    FW,
    linien,
  };
})();
if (typeof window !== 'undefined') window.GLJOBSDATA = GLJOBSDATA;
