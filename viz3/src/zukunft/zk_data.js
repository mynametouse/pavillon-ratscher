// ===================== feat/zukunft 1: the what-if mode's data and numbers – topics, variants, five indicators with their reasons (ZKDATA) =====================
// Falko, 12.11.2026: „Möglichkeitsraum, in dem Zukünfte virtuell erprobt werden“ – first test for the village (Ortsteil Ratscher, Stadt
// Schleusingen), half a day on site with a projector. Pure functions, no imports (unit test viz3/test/unit/zukunft.test.mjs): for a topic, a
// variant and a year the five indicators – Kosten, CO₂, Lärm, Naturwert, Stimmung – each with a „Warum?“ (the calculation and its source, or
// „Annahme“), and a description of what the world shows. Honest rules: ranges where uncertain, rounded to two figures, every number that is
// not from a source says „Annahme“. Prices in euros of 2026. The numbers of the world (roof area, the timetable, the stand of spruces, the
// nature value) come in as `ctx` from zukunft/zk_welt.js – without them the defaults below stand in (and say so).
export const ZKDATA = (() => {
  const YEARS = [2026, 2030, 2035, 2045, 2060];
  // ---------- small helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const iy = y => {
    const i = YEARS.indexOf(y);
    return i >= 0 ? i : clamp(Math.round(+y), 0, YEARS.length - 1) === +y ? +y : 0;
  };
  // a value over the years: [v2026, v2030, …], linear between the steps (also for years in between)
  function at(tab, y) {
    if (y <= YEARS[0]) return tab[0];
    for (let i = 1; i < YEARS.length; i++)
      if (y <= YEARS[i]) {
        const k = (y - YEARS[i - 1]) / (YEARS[i] - YEARS[i - 1]);
        return tab[i - 1] + (tab[i] - tab[i - 1]) * k;
      }
    return tab[tab.length - 1];
  }
  const sig2 = v => {
    if (!v || !Number.isFinite(v)) return 0;
    const m = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1);
    return Math.round(v / m) * m;
  };
  const grp = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = (v, d = 1) => String(+v.toFixed(d)).replace('.', ',');
  const eur = v => {
    v = sig2(v);
    const a = Math.abs(v);
    if (a >= 1e6) return dec(v / 1e6, a >= 1e7 ? 0 : 1) + ' Mio. €';
    return (v < 0 ? '−' : '') + grp(String(Math.round(a))) + ' €';
  };
  const eurRange = (lo, hi) => {
    lo = sig2(lo);
    hi = sig2(hi);
    if (hi >= 1e6) return dec(lo / 1e6, 1) + '–' + dec(hi / 1e6, 1) + ' Mio. €';
    return grp(String(Math.round(lo))) + '–' + grp(String(Math.round(hi))) + ' €';
  };
  const tco2 = v => {
    const a = sig2(Math.abs(v));
    if (a < 0.05) return '≈ 0 t/Jahr';
    return (v < 0 ? '−' : '+') + (a >= 10 ? grp(String(Math.round(a))) : dec(a, 1)) + ' t/Jahr';
  };
  const W = (text, src = [], annahme = false) => ({ text, src, annahme });
  // ---------- sources (title, link or null) ----------
  const SRC = {
    uba: [
      'Umweltbundesamt: Strom- und Wärmeversorgung in Zahlen (Strommix, Emissionsfaktoren)',
      'https://www.umweltbundesamt.de/themen/klima-energie/energieversorgung/strom-waermeversorgung-in-zahlen',
    ],
    pvgis: [
      'PVGIS (Gemeinsame Forschungsstelle der EU): Ertrag bei Ratscher',
      'https://re.jrc.ec.europa.eu/pvg_tools/de/',
    ],
    ise: [
      'Fraunhofer ISE: Stromgestehungskosten Erneuerbare Energien (2024: PV 4,1–14,4 ct/kWh, 700–2000 €/kW)',
      'https://www.pv-magazine.de/2024/10/07/photovoltaik-stromgestehungskosten-liegen-in-deutschland-zwischen-41-und-144-cent-pro-kilowattstunde/',
    ],
    eeg6: [
      '§ 6 EEG: Beteiligung der Kommunen an Freiflächenanlagen (0,2 ct/kWh)',
      'https://www.gesetze-im-internet.de/eeg_2014/__6.html',
    ],
    rufbus: [
      'Thüringer Landtag, Drucksache 7/8819: Anzahl und Entwicklung der Rufbusse in Thüringen (2023)',
      'https://parldok.thueringer-landtag.de/ParlDok/dokument/94376/anzahl_und_entwicklung_der_rufbusse_in_thueringen.pdf',
    ],
    ruf2: ['Wikipedia: Rufbus', 'https://de.wikipedia.org/wiki/Rufbus'],
    bank: ['Wikipedia: Mitfahrbank', 'https://de.wikipedia.org/wiki/Mitfahrbank'],
    oepnv: ['Thüringer ÖPNV-Gesetz (ThürÖPNVG), § 3: der Landkreis bestellt den Busverkehr', null],
    fahrplan: [
      'Fahrplan nach gtfs.de (DELFI e. V.), wie im Spiel: Linien 203 und 205 nach Schleusingen',
      'https://gtfs.de/',
    ],
    lärm: [
      'TA Lärm: Richtwerte nachts 45 dB(A) im Dorfgebiet, 40 dB(A) im allgemeinen Wohngebiet',
      'https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_26081998_IG19980826.htm',
    ],
    bafa: [
      'BAFA: Bundesförderung für effiziente Gebäude (Wärmepumpen)',
      'https://www.bafa.de/DE/Energie/Effiziente_Gebaeude/Waermepumpen/waermepumpen_node.html',
    ],
    kostra: [
      'DWD: KOSTRA-DWD-2020 (Starkregenhöhen nach Dauer und Wiederkehrzeit)',
      'https://www.dwd.de/DE/leistungen/kostra_dwd_rasterwerte/kostra_dwd_rasterwerte.html',
    ],
    klimaatlas: [
      'DWD: Klimaatlas Deutschland (Projektionen, Südthüringen)',
      'https://www.dwd.de/DE/klimaumwelt/klimaatlas/klimaatlas_node.html',
    ],
    hnz: [
      'Hochwassernachrichtenzentrum Thüringen: Hochwasservorsorge',
      'https://hnz.thueringen.de/hochwasservorsorge/pdf/HWVorsorge_Gesamtdokument.pdf',
    ],
    dez23: [
      'Thüringer Landtag, Drucksache 7/9624: Hochwasser im Dezember 2023 (Talsperre Ratscher, Betreiber TFW, etwa 900 000 m³ zurückgehalten)',
      'https://parldok.thueringer-landtag.de/',
    ],
    forst: ['ThüringenForst: Waldumbau und Wiederbewaldung', 'https://www.thueringenforst.de/'],
    bwi: ['Bundeswaldinventur: Vorräte und Zuwachs der Fichte', 'https://bwi.info/'],
    waldwissen: ['waldwissen.net: Borkenkäfer und Kalamitätsflächen', 'https://www.waldwissen.net/'],
    bfn: ['BfN: Photovoltaik-Freiflächenanlagen und Naturschutz (BfN-Skript 247)', null],
    mastr: [
      'Marktstammdatenregister: alle Anlagen, auch die auf Dächern in Ratscher',
      'https://www.marktstammdatenregister.de/',
    ],
    buch: ['Entdeckerbuch im Spiel', null],
  };
  // ---------- the villagers (the game's, as in „Wahl und Amt“) ----------
  const WHO = {
    ingrid: ['Ingrid', 'Ortsteilbürgermeisterin'],
    gerhard: ['Gerhard', 'Lehrer i. R., Dorfchronik'],
    manfred: ['Manfred', 'Wehrführer'],
    wolfgang: ['Wolfgang', 'Waldarbeiter'],
    katrin: ['Katrin', 'Pflegerin, zwei Kinder'],
    heike: ['Heike', 'Gemüsegarten und Hühner'],
    jens: ['Jens', 'Kfz-Mechaniker'],
    hubert: ['Hubert', 'Nachbar im Westen'],
    ronald: ['Ronald', 'Nachbar im Osten, Ziegen'],
    uwe: ['Uwe', 'Landwirt'],
  };
  // ---------- the defaults for what the world tells (ctx) ----------
  const CTX0 = {
    bus: { werk: 6, sa: 3, so: 0, min: 12, src: 'annahme' },
    roof: { kwp: 600, area: 2900, n: 40, src: 'annahme' },
    field: { kwp: 2200, ha: 1.7, src: 'annahme' },
    nat0: 55,
    forest: { ha: 16.8, spruce: 0.62 },
    houses: 55,
    km: 6,
  };
  const ctxOf = c => {
    const o = {};
    for (const k of Object.keys(CTX0))
      o[k] = c && c[k] != null ? (typeof CTX0[k] === 'object' ? { ...CTX0[k], ...c[k] } : c[k]) : CTX0[k];
    return o;
  };
  // ---------- common factors over the years (2026, 2030, 2035, 2045, 2060) ----------
  // Strommix kg CO₂/kWh: 2023 about 0,38 (UBA); after that Annahme on the way to the climate-neutral power system of 2045 (KSG)
  const EF_GRID = [0.36, 0.22, 0.13, 0.03, 0.01];
  const EF_PV = 0.04; // life cycle of a PV module in Germany about 40 g/kWh (UBA, Fraunhofer ISE) – rounded
  const EF_PKW = [0.15, 0.135, 0.115, 0.075, 0.04]; // kg per car kilometre, real fleet; Annahme for the later years (more electric cars)
  const EF_BUS = [0.85, 0.75, 0.55, 0.15, 0.05]; // kg per bus kilometre (diesel bus about 30 l/100 km); Annahme: electrified step by step
  const EF_KLEIN = [0.3, 0.27, 0.2, 0.06, 0.02]; // minibus of a Rufbus
  const PRICE_ROOF = [1300, 1150, 1000, 850, 800]; // € per kWp small roof system (ISE 2024: 700–2000, small roofs about 1300); later steps Annahme
  const PRICE_FIELD = [700, 620, 560, 480, 450]; // € per kWp ground-mounted (ISE: below 460 by 2045)
  const KWH_KWP = 1000; // Ratscher, 30° south, losses included (PVGIS; same as the Entdeckerbuch „Strom von der Sonne“)
  const EF_PKW_TXT =
    'Auto: 150 g CO₂ je km heute (UBA, Durchschnitt aller Pkw), später weniger, weil mehr Elektroautos fahren (Annahme)';
  // ---------- topics and their variants ----------
  const TOPICS = [
    {
      id: 'mobil',
      label: 'Mobilität',
      icon: '🚌',
      text: 'Wie kommt man ohne eigenes Auto nach Schleusingen? Der Bus fährt nach Fahrplan – was ändert sich mit einer Mitfahrbank, einem Rufbus oder mehr Fahrten?',
      variants: [
        {
          id: 'heute',
          label: 'Heute',
          short: 'Bus nach Fahrplan',
          text: 'Der Bus nach dem echten Fahrplan, sonst das eigene Auto.',
        },
        {
          id: 'bank',
          label: 'Mitfahrbank',
          short: 'Mitfahrbank am Anger',
          text: 'Eine Bank an der Ortsmitte: wer sich setzt, will mitgenommen werden.',
        },
        {
          id: 'ruf',
          label: 'Rufbus',
          short: 'Rufbus auf Bestellung',
          text: 'Ein Kleinbus fährt auf Anruf oder per App – Montag bis Samstag, 6 bis 20 Uhr. Gedacht für Ältere ohne Auto, auch abends und am Wochenende, wenn der Linienbus nicht fährt.',
        },
        {
          id: 'takt',
          label: 'Mehr Fahrten',
          short: '6 Fahrten mehr nach Schleusingen',
          text: 'Sechs zusätzliche Fahrten am Werktag mit dem normalen Linienbus – auch für Schülerinnen und Schüler, die nach dem Unterricht oder der AG heimfahren.',
        },
      ],
    },
    {
      id: 'energie',
      label: 'Energie',
      icon: '☀️',
      text: 'Strom und Wärme für 55 Haushalte: Solarmodule auf den Dächern, ein Solarpark am Ortsrand oder Wärmepumpen statt Öl und Gas.',
      variants: [
        {
          id: 'heute',
          label: 'Heute',
          short: 'wie jetzt',
          text: 'Dächer ohne Solarmodule (Annahme: die Anlagen im Dorf sind nicht erfasst), Heizungen mit Öl, Gas und Holz.',
        },
        {
          id: 'dach',
          label: 'Dach-PV',
          short: 'Solarmodule auf den Dächern',
          text: 'Module auf den geeigneten Dachflächen – nach Süden, Osten oder Westen geneigt, nicht im Schatten.',
        },
        {
          id: 'park',
          label: 'Solarpark',
          short: 'Solarpark am Ortsrand',
          text: 'Eine Freifläche am südwestlichen Ortsrand (Annahme für den Ort – eine konkrete Planung für Ratscher oder Schleusingen wurde bei einer Suche im November 2026 nicht gefunden) mit Modultischen in Reihen.',
        },
        {
          id: 'waerme',
          label: 'Wärmepumpen',
          short: 'Wärmepumpen in den Häusern',
          text: 'Immer mehr Häuser heizen mit Luft-Wärmepumpen statt mit Öl und Gas.',
        },
      ],
    },
    {
      id: 'klima',
      label: 'Klimaanpassung',
      icon: '🌧',
      text: 'Starkregen, Hochwasser an der Schleuse und Dürresommer werden häufiger. Was passiert im Dorf – und was hilft?',
      variants: [
        { id: 'heute', label: 'Heute', short: 'ohne Ereignis', text: 'Ein gewöhnliches Jahr.' },
        {
          id: 'regen',
          label: 'Starkregen',
          short: 'Starkregen ohne Vorsorge',
          text: 'Ein Gewitterregen von der Art, wie er einmal in 100 Jahren fällt – und das Dorf ist nicht vorbereitet.',
        },
        {
          id: 'vorsorge',
          label: 'Starkregen mit Vorsorge',
          short: 'Starkregen mit Rückhalt',
          text: 'Derselbe Regen, aber mit Rückhaltemulden am Hang, einem größeren Durchlass und Schutz an den Häusern.',
        },
        {
          id: 'dez23',
          label: 'Wie im Dezember 2023',
          short: 'Hochwasser wie im Dezember 2023',
          text: 'Das Hochwasser vom Dezember 2023: Die Talsperre Ratscher hielt etwa 900 000 m³ zurück, die Schleuse blieb im Dorf meist in der Aue.',
        },
        {
          id: 'hoch',
          label: 'Schwerer als 2023',
          short: 'Hochwasser schwerer als 2023',
          text: 'Ein Hochwasser, wie es etwa einmal in 100 Jahren kommt (HQ100) – der Rückhalt der Talsperre reicht nicht mehr aus.',
        },
        {
          id: 'duerre',
          label: 'Dürresommer',
          short: 'Dürresommer',
          text: 'Wochenlang kein Regen: trockener Boden, gelbes Gras, der Bach fast leer, die Fichten im Stress.',
        },
      ],
    },
    {
      id: 'wald',
      label: 'Wald nach dem Käfer',
      icon: '🌲',
      text: 'Der Fichtenwald an der Unteren Klinge, dem Familienwald, stirbt – Hitze, Trockenheit und der Borkenkäfer. Was wächst danach, und was kostet es?',
      variants: [
        { id: 'heute', label: 'Heute', short: 'der Wald wie jetzt', text: 'Der Bestand, wie er heute steht.' },
        {
          id: 'natur',
          label: 'Natürliche Verjüngung',
          short: 'Wald sich selbst überlassen',
          text: 'Kahlflächen bleiben der Natur: Birke, Eberesche und Fichtenjungwuchs kommen von allein.',
        },
        {
          id: 'umbau',
          label: 'Waldumbau',
          short: 'Mischwald pflanzen',
          text: 'Auf den Kahlflächen werden Buche, Weißtanne, Eiche und Douglasie gepflanzt, nach Plan von ThüringenForst.',
        },
      ],
    },
  ];
  const topic = id => TOPICS.find(t => t.id === id) || null;
  const variant = (tid, vid) => {
    const t = topic(tid);
    return t ? t.variants.find(v => v.id === vid) || null : null;
  };
  // ---------- the voices: who is for, who is against, and why (the game's villagers – Annahme, no poll) ----------
  // lean −2 … +2
  const VOICES = {
    'mobil/bank': [
      [
        'ingrid',
        2,
        'Das hat bei den Nachbardörfern geklappt. Wer kein Auto hat, kommt am Wochenende endlich in die Stadt.',
      ],
      ['gerhard', 2, 'Früher hat man sich auch mitgenommen. Die Bank macht daraus wieder eine Gewohnheit.'],
      ['katrin', 1, 'Gut für die Jugendlichen. Mir wäre wohler, wenn man weiß, wer einsteigt.'],
      ['manfred', -1, 'Wenn etwas passiert: Wer haftet? Das muss die Stadt klären.'],
    ],
    'mobil/ruf': [
      ['katrin', 2, 'Mit zwei Kindern und ohne zweites Auto wäre das ein Segen – auch abends.'],
      ['ingrid', 1, 'Ich bin dafür, wenn der Landkreis zahlt. Alleine trägt das kein Ortsteil.'],
      ['uwe', -1, 'Sechzigtausend Euro im Jahr für ein Dorf mit 120 Leuten? Das ist viel Steuergeld.'],
      ['jens', 0, 'Technisch kein Problem. Ob es einer nutzt, weiß ich nicht.'],
    ],
    'mobil/takt': [
      ['katrin', 2, 'Sechs Fahrten mehr – dann geht auch die Spätschicht.'],
      ['gerhard', 1, 'Der Bus gehört zum Dorf. Aber er sollte nicht leer fahren.'],
      ['jens', -1, 'Ein leerer Bus ist schlechter fürs Klima als mein Auto. Das rechnet sich nicht.'],
      ['uwe', -1, 'Und der Lärm an der Ortsdurchfahrt kommt dazu.'],
    ],
    'energie/dach': [
      ['heike', 2, 'Ich würde sofort Module aufs Hühnerhaus-Dach legen, wenn es sich lohnt.'],
      ['jens', 2, 'Mit Speicher und Wallbox rechnet sich das. Ich mache gern die Technik.'],
      ['gerhard', -1, 'Auf der alten Schule bitte nicht: das Ortsbild und der Denkmalschutz.'],
      ['ronald', 0, 'Meine Schwalben nisten am Stall – die Module dürfen sie nicht stören.'],
    ],
    'energie/park': [
      ['jens', 2, 'Viel Strom auf einem Fleck, billig pro Kilowattstunde.'],
      ['ingrid', 1, 'Wenn das Dorf etwas davon hat: Gemeinde-Beteiligung, Bürgerstrom.'],
      ['uwe', -2, 'Das ist guter Boden, den ich bewirtschaftet bekomme. Pacht hin oder her.'],
      ['gerhard', -1, 'Der Blick vom Weg Richtung Süden ist dann ein anderer.'],
    ],
    'energie/waerme': [
      ['jens', 1, 'Die Technik ist gut, aber die Häuser müssen mitspielen – ein Altbau braucht Dämmung.'],
      ['heike', 0, 'Mein Holzofen bleibt. Aber die Ölheizung vom Nachbarn möchte ich nicht mehr riechen.'],
      ['uwe', -2, 'Fünfundzwanzigtausend Euro für eine Heizung? Wer soll das bezahlen?'],
      ['hubert', -1, 'Die Wärmepumpe der Nachbarn brummt nachts. Ich hab’s im Schlafzimmer gehört.'],
    ],
    'klima/regen': [
      ['manfred', -2, 'Beim letzten Gewitter standen drei Keller unter Wasser. Wir waren die ganze Nacht draußen.'],
      ['ingrid', -1, 'Das Dorf liegt am Hang. Das Wasser sucht sich seinen Weg durch die Straße.'],
      ['katrin', -1, 'Die Kinder gehen durch die Unterführung zum Bus – bei Starkregen unmöglich.'],
    ],
    'klima/vorsorge': [
      ['manfred', 2, 'Mulden und ein größerer Durchlass – genau das, was wir der Stadt seit Jahren sagen.'],
      ['ingrid', 1, 'Die Stadt Schleusingen muss mitzahlen. Aber billiger als jeder Schaden.'],
      ['uwe', 0, 'Wenn die Mulde auf meinem Acker liegt, will ich eine Entschädigung.'],
    ],
    'klima/dez23': [
      [
        'manfred',
        1,
        'Im Dezember 2023 hat die Talsperre viel abgefangen. Gut, dass es sie gibt – darauf verlassen möchte ich mich nicht allein.',
      ],
      ['uwe', -1, 'Die Wiese an der Schleuse stand trotzdem unter Wasser. Wer ersetzt mir den Ausfall?'],
      ['gerhard', 0, 'Wir wissen, wo das Wasser hinläuft. Ein Pegelstand am Dorfeingang wäre schon eine Hilfe.'],
    ],
    'klima/hoch': [
      ['manfred', -2, 'Dezember 2023: die Schleuse war schon einen halben Meter vor der Brücke. Mehr geht nicht.'],
      ['gerhard', -1, 'In der Dorfchronik steht ein Hochwasser von 1909. Das Wasser vergisst nichts.'],
      ['uwe', -1, 'Meine Wiese steht dann zwei Wochen unter Wasser.'],
    ],
    'klima/duerre': [
      ['uwe', -2, 'Zweimal Dürre hintereinander – das halte ich nicht durch. Der Mais ist verbrannt.'],
      ['heike', -2, 'Der Garten ist nur noch mit Gießen zu halten. Und der Brunnen wird knapp.'],
      ['wolfgang', -1, 'Die Fichten an der Klinge stehen schon jetzt im Stress. Der Käfer kommt zuverlässig.'],
    ],
    'wald/natur': [
      ['ronald', 2, 'Soll die Natur es machen. Birken, Eberesche, und der Rotmilan hat freie Sicht.'],
      ['wolfgang', -1, 'Das sieht lange wild aus, und ich habe keinen Wald mit Holz, wenn es so weitergeht.'],
      ['gerhard', 0, 'Mein Großvater hat die Fichten noch gepflanzt. Man kann nicht ewig nachtrauern.'],
    ],
    'wald/umbau': [
      ['wolfgang', 2, 'Buche, Tanne, Eiche – das trägt in sechzig Jahren. Ich pflanze gern, wenn es einer bezahlt.'],
      ['hubert', 1, 'In vierzig Jahren gibt es wieder gutes Holz für den Ofen und für Bretter.'],
      ['ronald', -1, 'Gepflanzt ist nicht wild. Und der Zaun gegen Rehe hält auch die Ziegen nicht fern.'],
      ['uwe', -1, 'Neuntausend Euro je Hektar. Wer ist der Eigentümer, der das zahlt?'],
    ],
  };
  // ---------- the stand: spruces that die and are cleared (the world's trees are put by this curve) ----------
  const DIEBACK = [0, 0.3, 0.65, 0.95, 1]; // share of the spruces struck by year (Annahme after Hitze- und Trockenstress, Käfer: DWD-Klimaatlas, ThüringenForst)
  const LAG = 2.5; // years from the first red crowns to the cleared area
  const affected = y => clamp(at(DIEBACK, y), 0, 1);
  const cleared = y => affected(y - LAG);
  // the year a tree of rank v (0–1: the share of spruces struck before it) is struck
  function strikeYear(v) {
    if (v <= 0) return YEARS[0];
    for (let i = 1; i < YEARS.length; i++)
      if (v <= DIEBACK[i]) {
        const k = (v - DIEBACK[i - 1]) / Math.max(1e-9, DIEBACK[i] - DIEBACK[i - 1]);
        return YEARS[i - 1] + (YEARS[i] - YEARS[i - 1]) * k;
      }
    return YEARS[YEARS.length - 1];
  }
  // height of a young tree (m) by age (years since the area was cleared) – pioneer wood grows fast, the planted mix slower
  const regrow = {
    natur: age => (age <= 0 ? 0 : 18 * (1 - Math.exp(-age / 14))),
    umbau: age => (age <= 0 ? 0 : 0.6 + 26 * (1 - Math.exp(-age / 26))),
  };
  const OCC = { natur: 0.45, umbau: 0.8 }; // how much of the cleared area carries young trees (share of the former spruce places)
  // ---------- the indicators per topic ----------
  // each calculator returns { kosten, co2, laerm, natur } as raw numbers + texts, the voices give the mood
  function houseLevel(n) {
    return n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 12 ? 3 : 4;
  }
  const LEVEL = ['keine', 'gering', 'spürbar', 'deutlich', 'stark'];
  const rng = (v, a, b) => [v * a, v * b];
  function mobil(vid, y, c) {
    const i = YEARS.indexOf(y),
      km = c.km,
      hh = c.houses;
    const b = c.bus;
    const pkw = EF_PKW[i];
    const res = {
      kosten: { inv: [0, 0, 0], yr: [0, 0, 0], txt: '' },
      co2: [0, 0, 0],
      houses: 0,
      level: 0,
      nat: 0,
      world: { bank: 0, rufbus: 0, takt: 0 },
    };
    if (vid === 'bank') {
      // one bench (AMTDATA: 380 €) and its sign; care 60 € a year (Annahme)
      res.kosten = { inv: [300, 400, 600], yr: [40, 60, 100] };
      // Annahme: 0,6 rides a day on 300 days; 30 % of them would have driven alone (11 km there and back)
      const rides = 0.6 * 300,
        saved = rides * 0.3 * 2 * km * pkw;
      res.co2 = [(-saved * 2.2) / 1000, -saved / 1000, (-saved * 0.2) / 1000];
      res.world.bank = 1;
      res.ridesYr = rides;
    } else if (vid === 'ruf') {
      // Annahme: 6 trips a day on 330 days (about 17 a year for each of 120 inhabitants); demand grows with the age of the village
      const grow = at([1, 1.1, 1.2, 1.35, 1.5], y),
        trips = 6 * 330 * grow,
        perTrip = 30; // € gross per trip (Annahme 20–45; rural on-demand services lie there)
      res.kosten = { inv: [8000, 15000, 30000], yr: [trips * 20, trips * perTrip, trips * 45] };
      // CO2 of the Rufbus = what the minibus drives (empty runs included) minus the car trips it replaces. Three assumptions decide the sign
      // (ranges, Annahme): passengers per vehicle run, the share of empty/positioning km, and the share of rides that replace a car trip.
      //   best case:  3,5 passengers, +30 % km, 70 % replace a car   typical: 1,8 / +60 % / 40 %   worst: 1,2 / +80 % / 25 %
      const CASE = { best: [3.5, 1.3, 0.7], mid: [1.8, 1.6, 0.4], worst: [1.2, 1.8, 0.25] };
      const co = k => {
        const [occ, dead, repl] = CASE[k];
        return (trips * km * (dead / occ) * EF_KLEIN[i]) / 1000 - (trips * repl * km * pkw) / 1000;
      };
      res.co2 = [co('best'), co('mid'), co('worst')];
      res.rufCase = CASE;
      res.houses = 2;
      res.level = 1;
      res.world.rufbus = 1;
      res.tripsYr = trips;
    } else if (vid === 'takt') {
      // 6 more round trips: Fahrplan-km × 3,8 €/km (Annahme 3–4,5)
      const kmYr = 6 * 2 * km * 300;
      res.kosten = { inv: [0, 0, 0], yr: [kmYr * 3, kmYr * 3.8, kmYr * 4.5] };
      const em = (kmYr * EF_BUS[i]) / 1000,
        saved = (kmYr * 2.5 * 0.4 * pkw) / 1000; // Annahme: 2,5 riders a trip, 40 % of them would have driven
      res.co2 = [(em - saved) * 0.7, em - saved, (em - saved) * 1.3];
      res.houses = 14; // Annahme: houses along the road through the village
      res.level = 2;
      res.kmYr = kmYr;
      res.world.takt = 1;
    }
    res.hh = hh;
    res.bus = b;
    return res;
  }
  function energie(vid, y, c) {
    const i = YEARS.indexOf(y);
    const res = {
      kosten: { inv: [0, 0, 0], yr: [0, 0, 0] },
      co2: [0, 0, 0],
      houses: 0,
      level: 0,
      nat: 0,
      world: { pvRoof: 0, pvField: 0, wp: 0 },
    };
    const gridNet = EF_GRID[i] - EF_PV; // kg saved per kWh of PV
    if (vid === 'dach') {
      const share = at([0, 0.25, 0.5, 0.8, 0.8], y),
        kwp = c.roof.kwp * share,
        kwh = kwp * KWH_KWP,
        inv = kwp * PRICE_ROOF[i];
      res.kosten = { inv: [inv * 0.7, inv, inv * 1.4], yr: [inv * 0.012, inv * 0.015, inv * 0.02] };
      res.kwp = kwp;
      res.kwh = kwh;
      res.eurPerYr = kwh * 0.164;
      res.co2 = [-(kwh * gridNet * 1.15) / 1000, -(kwh * gridNet) / 1000, -(kwh * gridNet * 0.85) / 1000];
      res.nat = -1;
      res.world.pvRoof = share;
    } else if (vid === 'park') {
      const share = at([0, 1, 1, 1, 1], y),
        kwp = c.field.kwp * share,
        kwh = kwp * KWH_KWP,
        inv = kwp * PRICE_FIELD[Math.max(1, i)];
      const pacht = c.field.ha * 2500 * share,
        om = kwp * 12 * (share ? 1 : 0);
      res.kosten = { inv: [inv * 0.75, inv, inv * 1.3], yr: [(om + pacht) * 0.8, om + pacht, (om + pacht) * 1.25] };
      res.kwp = kwp;
      res.kwh = kwh;
      res.beteil = kwh * 0.002; // § 6 EEG, 0,2 ct/kWh
      res.co2 = [-(kwh * gridNet * 1.15) / 1000, -(kwh * gridNet) / 1000, -(kwh * gridNet * 0.85) / 1000];
      res.nat = share ? 3 : 0;
      res.world.pvField = share;
    } else if (vid === 'waerme') {
      const share = at([0.05, 0.15, 0.3, 0.55, 0.8], y),
        n = Math.max(0, (share - 0.05) * c.houses),
        jaz = at([3, 3.2, 3.5, 3.8, 4], y),
        demand = 20000; // kWh a year for an old village house (Annahme)
      const fossil = [0.19, 0.19, 0.19, 0.19, 0.19][i]; // kg/kWh heat: Öl 0,27 and Gas 0,20 direct, Holz low, as a mix (UBA)
      const dco = n * ((demand * (EF_GRID[i] / jaz - fossil)) / 1000);
      res.n = n;
      res.kosten = { inv: [n * 18000, n * 24000, n * 32000], yr: [0, 0, 0] };
      const strom = (demand / jaz) * 0.28,
        gas = demand * (0.11 + at([0.013, 0.03, 0.05, 0.08, 0.1], y));
      res.savePerWp = gas - strom;
      res.kosten.yr = [n * (strom - gas) * 1.5, n * (strom - gas), n * (strom - gas) * 0.5];
      res.co2 = [dco * 0.75, dco, dco * 1.3];
      res.houses = Math.round(n * 0.15);
      res.level = houseLevel(res.houses);
      res.world.wp = Math.round(n);
    }
    return res;
  }
  function klima(vid, y, c) {
    const i = YEARS.indexOf(y);
    const f = at([1, 1.05, 1.1, 1.25, 1.5], y); // Starkregen: about +7 % intensity for each degree of warming (Clausius-Clapeyron), more heavy events
    const res = {
      kosten: { inv: [0, 0, 0], yr: [0, 0, 0] },
      co2: null,
      houses: 0,
      level: 0,
      nat: 0,
      world: { wet: 0, rain: null, flood: 0, dry: 0 },
    };
    if (vid === 'regen' || vid === 'vorsorge') {
      const dmg = 190000; // Annahme: 12 Keller und Erdgeschosse × 12 000 € + 40 000 € Wege und Straßen
      const ead = (0.3 * dmg * 0.05 + dmg * 0.01) * f; // expected damage a year: a 20-year event at 30 % of the damage plus the 100-year event
      res.dmg = dmg;
      res.houses = vid === 'regen' ? 12 : 5;
      res.ead = vid === 'regen' ? ead : ead * 0.4;
      if (vid === 'regen') res.kosten = { inv: [0, 0, 0], yr: [ead * 0.5, ead, ead * 2] };
      else {
        res.kosten = {
          inv: [80000, 120000, 180000],
          yr: [2000 + ead * 0.4 * 0.5, 2500 + ead * 0.4, 3000 + ead * 0.4 * 2],
        };
        res.nat = 5;
      }
      res.world.rain = 'starkregen';
      res.world.wet = 1;
    } else if (vid === 'dez23') {
      // reference event: Dec 2023. The reservoir held back about 900 000 m³ (Drs. 7/9624), so the village was largely spared.
      // Annahme: level 0,9 m over the bed in the village, two houses with wet cellars, 15 000 € each; the next such event once in 10 years
      const dmg = 30000;
      const ead = dmg * 0.1 * at([1, 1.05, 1.1, 1.2, 1.3], y);
      res.dmg = dmg;
      res.houses = 2;
      res.ead = ead;
      res.kosten = { inv: [0, 0, 0], yr: [ead * 0.5, ead, ead * 2] };
      res.world.flood = 0.9 * at([1, 1.02, 1.04, 1.07, 1.1], y);
    } else if (vid === 'hoch') {
      const dmg = 315000; // Annahme: 9 Häuser × 35 000 €
      const ead = dmg * 0.01 * at([1, 1.02, 1.04, 1.07, 1.1], y) + dmg * 0.002;
      res.dmg = dmg;
      res.houses = 9;
      res.ead = ead;
      res.kosten = { inv: [0, 0, 0], yr: [ead * 0.5, ead, ead * 2.2] };
      res.world.flood = 1.8 * at([1, 1.02, 1.04, 1.07, 1.1], y);
    } else if (vid === 'duerre') {
      const p = at([0.15, 0.2, 0.25, 0.33, 0.45], y); // chance of a drought summer in a year (Annahme after the DWD-Klimaatlas)
      const dmg = 24000; // Annahme: 20 % of the yield on 110 ha × 1 000 €/ha plus water for the gardens
      res.dmg = dmg;
      res.p = p;
      res.ead = dmg * p;
      res.kosten = { inv: [0, 0, 0], yr: [dmg * p * 0.5, dmg * p, dmg * p * 2] };
      res.nat = -Math.round(8 * at([0.6, 0.7, 0.8, 0.9, 1], y));
      res.world.dry = at([0.6, 0.7, 0.8, 0.9, 1], y);
      res.world.rain = 'klar';
    }
    return res;
  }
  // forest numbers: cumulative cleared area, a rate, the sink of the young stand (t CO₂ a year)
  function waldNums(vid, y, c) {
    const Hs = c.forest.ha * c.forest.spruce;
    const out = { Hs, aff: affected(y), clr: cleared(y), clrHa: Hs * cleared(y) };
    // clearing rate of this year (ha a year): the slope of the cleared share
    out.rate = Hs * Math.max(0, cleared(y + 0.5) - cleared(y - 0.5));
    out.emit = out.rate * 150; // t CO₂ per cleared hectare: about 300 t in the stand, half of it released (BWI; Annahme)
    out.lostSink = Hs * (affected(y) - 0) * 4; // the old stand's net sink of 4 t CO₂/ha a is gone where it stands no longer
    // young stand: the sink grows with age (up to 10 t/ha a), over the cleared share by the age of each part
    let sink = 0;
    const occ = OCC[vid] || 0;
    const N = 40;
    for (let k = 0; k < N; k++) {
      const v = ((k + 0.5) / N) * affected(y);
      const age = y - (strikeYear(v) + LAG);
      if (age > 0)
        sink += ((Hs / N) * occ * 10 * (1 - Math.exp(-age / 10)) * affected(y)) / Math.max(1e-9, affected(y));
    }
    out.sink = sink;
    return out;
  }
  function wald(vid, y, c) {
    const i = YEARS.indexOf(y);
    const res = {
      kosten: { inv: [0, 0, 0], yr: [0, 0, 0] },
      co2: [0, 0, 0],
      houses: 0,
      level: 0,
      nat: 0,
      world: { forest: null },
    };
    if (vid === 'heute') return res;
    const N = waldNums(vid, y, c);
    res.nums = N;
    const perHa = vid === 'umbau' ? [6000, 9500, 13000] : [400, 800, 1500];
    res.kosten.inv = perHa.map(v => v * N.clrHa);
    const unter = vid === 'umbau' ? 150 : 20; // € per hectare and year: care of the young stand / checks
    res.kosten.yr = [unter * N.clrHa * 0.7, unter * N.clrHa, unter * N.clrHa * 1.5];
    const net = N.emit + N.lostSink - N.sink; // t CO₂ a year more than today (minus is good)
    res.co2 = [net * 0.6, net, net * 1.4];
    res.houses = N.rate > 0.05 ? 8 : 0;
    res.level = N.rate <= 0.05 ? 0 : N.rate < 0.4 ? 1 : N.rate < 1 ? 2 : N.rate < 1.6 ? 3 : 4;
    res.nat = vid === 'natur' ? at([0, 3, 4, 9, 15], y) : at([0, -2, 0, 7, 12], y);
    res.world.forest = { mode: vid, year: y };
    return res;
  }
  const CALC = { mobil, energie, klima, wald };
  // ---------- the five indicators as texts ----------
  function kosten(topicId, vid, y, r, c) {
    const inv = r.kosten.inv,
      yr = r.kosten.yr;
    const any = inv[1] || yr[1];
    const main = !any
      ? vid === 'heute'
        ? 'kein neuer Aufwand'
        : '≈ 0 €'
      : inv[1]
        ? '≈ ' + eur(inv[1])
        : '≈ ' + eur(yr[1]) + ' / Jahr';
    const bits = [];
    if (inv[1]) bits.push('Investition ' + eurRange(inv[0], inv[2]));
    if (yr[1] && inv[1]) bits.push('jährlich ≈ ' + eur(yr[1]));
    else if (yr[1] && !inv[1]) bits.push(eurRange(yr[0], yr[2]) + ' im Jahr');
    if (topicId === 'klima' && r.ead && inv[1]) bits.push('Schaden bleibt: ≈ ' + eur(r.ead) + '/Jahr erwartet');
    if (topicId === 'klima' && r.ead && !inv[1]) bits[0] = 'erwarteter Schaden ≈ ' + eur(r.ead) + ' im Jahr';
    if (r.eurPerYr) bits.push('Ersparnis und Erlös ≈ ' + eur(r.eurPerYr) + '/Jahr');
    if (r.beteil) bits.push('Gemeinde-Beteiligung bis ≈ ' + eur(r.beteil) + '/Jahr');
    if (r.savePerWp != null && r.n)
      bits.push(
        'Betrieb je Haus ' + (r.savePerWp >= 0 ? 'spart ≈ ' : 'kostet ≈ ') + eur(Math.abs(r.savePerWp)) + '/Jahr'
      );
    const why = kostenWhy(topicId, vid, y, r, c);
    return {
      id: 'kosten',
      label: 'Kosten',
      main,
      sub: bits.join(' · ') || (vid === 'heute' ? 'Referenz' : ''),
      range: inv[1] ? eurRange(inv[0], inv[2]) : '',
      raw: { inv: inv[1], yr: yr[1] },
      why,
    };
  }
  function kostenWhy(t, v, y, r, c) {
    if (v === 'heute')
      return W(
        '„Heute“ ist die Vergleichsgröße: es kommt nichts hinzu, also kostet es nichts Neues. Preise in Euro von 2026, ohne Inflation.',
        [],
        false
      );
    if (t === 'mobil' && v === 'bank')
      return W(
        'Eine Bank mit Schild kostet etwa 380 € (so im Spiel für die Mitfahrbank; Annahme 300–600 €), Pflege etwa 60 € im Jahr. Mitfahrbänke gibt es in vielen Dörfern; die Stadt oder der Ortsteil zahlt sie aus dem Ortsteilbudget.',
        [SRC.bank],
        true
      );
    if (t === 'mobil' && v === 'ruf')
      return W(
        'Annahme: sechs Fahrten am Tag aus Ratscher (330 Tage, wächst mit dem Alter im Dorf). Kosten je Fahrt brutto etwa 30 € (Spanne 20–45 €; ländliche Rufbusse liegen dort, ohne Fahrgeld und Zuschüsse). Thüringen kennt wenige reine Rufbuslinien (Jena seit 1999, Dorfbusse im Wartburgkreis 2021–2023) – es gibt keine belastbare Zahl für Ratscher. Bestellt und bezahlt wird der Busverkehr vom Landkreis (§ 3 ThürÖPNVG).',
        [SRC.rufbus, SRC.ruf2, SRC.oepnv],
        true
      );
    if (t === 'mobil' && v === 'takt')
      return W(
        'Sechs zusätzliche Fahrten hin und zurück sind ' +
          Math.round(r.kmYr / 1000) +
          ' 000 Fahrplankilometer im Jahr (sechs Mal 2 × ' +
          c.km +
          ' km auf 300 Tagen). Ein Linienbus kostet etwa 3,8 € je Kilometer (Annahme 3–4,5 €). Bestellt vom Landkreis.',
        [SRC.oepnv, SRC.fahrplan],
        true
      );
    if (t === 'energie' && v === 'dach')
      return W(
        'Leistung: die geeigneten Dachflächen im Modell (' +
          Math.round(c.roof.kwp) +
          ' kWp, ' +
          (c.roof.src === 'welt' ? 'aus den 3D-Dächern gezählt' : 'Annahme') +
          '), davon wird ' +
          Math.round(at([0, 0.25, 0.5, 0.8, 0.8], y) * 100) +
          ' % belegt. Preis ' +
          grp(String(PRICE_ROOF[YEARS.indexOf(y)])) +
          ' €/kWp (Fraunhofer ISE 2024: 700–2000 €/kW, kleine Dächer mehr; spätere Jahre Annahme). Betrieb 1,5 % der Investition im Jahr (Annahme). Erlös und Ersparnis mit 16 ct/kWh: ein Drittel Eigenverbrauch zu 32 ct, der Rest zu 8 ct Einspeisung (Annahme).',
        [SRC.ise, SRC.pvgis],
        true
      );
    if (t === 'energie' && v === 'park')
      return W(
        'Annahme (eine konkrete Planung für Ratscher oder Schleusingen wurde bei einer Suche im November 2026 nicht gefunden): eine Fläche von ' +
          dec(c.field.ha, 1) +
          ' ha trägt ' +
          dec(c.field.kwp / 1000, 1) +
          ' MWp (etwa 1 MWp je Hektar). Der Preis fällt von 700 auf 450 €/kWp (Fraunhofer ISE: unter 460 €/kW bis 2045). Jährlich Betrieb 12 €/kWp und Pacht 2 500 €/ha (Annahme). Die Gemeinde darf mit 0,2 ct/kWh beteiligt werden (§ 6 EEG, Kann-Regel). Bis zum Bau vergehen zwei bis drei Jahre Bauleitplanung (Aufstellungsbeschluss, Bebauungsplan).',
        [SRC.ise, SRC.eeg6],
        true
      );
    if (t === 'energie' && v === 'waerme')
      return W(
        'Annahme: 55 Haushalte, 5 % heizen heute schon mit Wärmepumpe. Je Haus 18 000–32 000 € (Luft-Wasser, mit Speicher und Heizkörpern; vor Förderung – die Bundesförderung für effiziente Gebäude übernimmt bis zu 70 %, der Stand 2026 ist nicht geprüft). Betrieb: Strom 28 ct/kWh bei Jahresarbeitszahl 3–4 gegen Öl und Gas zu 11 ct plus CO₂-Preis. Ein Nahwärmenetz würde allein im Dorfkern lohnen (Annahme: etwa 1 MWh je Meter Trasse und Jahr als Schwelle).',
        [SRC.bafa, SRC.uba],
        true
      );
    if (t === 'klima' && (v === 'regen' || v === 'vorsorge'))
      return W(
        'Der Regen: etwa 50 mm in einer Stunde, wie er einmal in 100 Jahren fällt (KOSTRA-DWD-2020; Annahme für Ratscher). Schaden Annahme: 12 Keller und Erdgeschosse × 12 000 € und 40 000 € Wege. Erwartet im Jahr: ein 20-jähriges Ereignis mit 30 % des Schadens plus das 100-jährige, mal ' +
          dec(at([1, 1.05, 1.1, 1.25, 1.5], y), 2) +
          ' (mehr starke Regen mit der Wärme, etwa +7 % Regenmenge je Grad).' +
          (v === 'vorsorge'
            ? ' Vorsorge: zwei Rückhaltemulden, größerer Durchlass, Schutz an den Häusern: 80 000–180 000 € (Annahme); sie senkt den Schaden um etwa 60 %.'
            : ''),
        [SRC.kostra, SRC.klimaatlas],
        true
      );
    if (t === 'klima' && v === 'dez23')
      return W(
        'Bezugsereignis: das Hochwasser vom Dezember 2023. Die Talsperre Ratscher (Betreiber TFW) hielt etwa 900 000 m³ zurück (Landtag Drs. 7/9624). Alles Weitere ist Annahme: Pegel 0,9 m über dem Bachbett im Dorf, zwei Häuser mit nassem Keller zu je 15 000 €, ein solches Ereignis etwa alle zehn Jahre, mit dem Klima häufiger. Die Zahlen sind mit der Chronik und der Gemeinde zu prüfen.',
        [SRC.dez23, SRC.hnz],
        true
      );
    if (t === 'klima' && v === 'hoch')
      return W(
        'Annahme: neun Häuser an der Schleuse betroffen, je 35 000 €. Die Hochwassergefahrenkarte von Thüringen (HQ100) konnte nicht abgerufen werden – die Zahl muss mit der Karte des Landes geprüft werden. Erwartet im Jahr: 1 % mal Schaden, dazu kleine Hochwasser. Bezug ist das Hochwasser vom Dezember 2023, bei dem die Talsperre etwa 900 000 m³ zurückhielt (Drs. 7/9624) – hier reicht dieser Rückhalt nicht.',
        [SRC.hnz, SRC.buch, SRC.dez23],
        true
      );
    if (t === 'klima' && v === 'duerre')
      return W(
        'Annahme: 110 ha Acker und Grünland, 20 % weniger Ertrag bei 1 000 € je Hektar, dazu Wasser für die Gärten: 24 000 € in einem Dürresommer. Die Wahrscheinlichkeit pro Jahr steigt von 15 % auf 45 % (Annahme nach den Projektionen des DWD-Klimaatlas für Südthüringen).',
        [SRC.klimaatlas],
        true
      );
    if (t === 'wald')
      return W(
        'Fläche: ' +
          dec(r.nums.clrHa, 1) +
          ' ha geräumt (von ' +
          dec(r.nums.Hs, 1) +
          ' ha Fichte im Bestand an der Klinge). ' +
          (v === 'umbau'
            ? 'Waldumbau: Pflanzung etwa 3 000 Pflanzen je Hektar, Schutz gegen Wild und Pflege: 6 000–13 000 € je Hektar (Annahme; die Förderung des Landes ist möglich, ihre Höhe nicht geprüft), Pflege 150 €/ha im Jahr.'
            : 'Natürliche Verjüngung: nur Räumung, Wegesicherung und Kontrolle, 400–1 500 €/ha (Annahme).') +
          ' Der Erlös aus Käferholz ist nicht eingerechnet (der Preis schwankt stark).',
        [SRC.forst, SRC.waldwissen],
        true
      );
    return W('Annahme.', [], true);
  }
  function co2(topicId, vid, y, r, c) {
    const lo = r.co2 ? r.co2[0] : 0,
      mid = r.co2 ? r.co2[1] : 0,
      hi = r.co2 ? r.co2[2] : 0;
    const na = r.co2 == null;
    const main = vid === 'heute' ? 'Referenz' : na ? '– (nicht bewertet)' : tco2(mid);
    const range =
      na || vid === 'heute'
        ? ''
        : (lo < hi ? tco2(lo) + ' bis ' + tco2(hi) : tco2(hi) + ' bis ' + tco2(lo)).replace(/ t\/Jahr/, '');
    return {
      id: 'co2',
      label: 'CO₂',
      main,
      sub: na || vid === 'heute' ? '' : 'gegenüber „Heute“ · minus ist gut',
      range,
      raw: { t: na ? null : mid, lo, hi },
      why: co2Why(topicId, vid, y, r, c),
    };
  }
  function co2Why(t, v, y, r, c) {
    const i = YEARS.indexOf(y);
    if (v === 'heute')
      return W(
        'Die Vergleichsgröße: Änderungen in Tonnen CO₂ im Jahr gegenüber heute, minus bedeutet weniger.',
        [],
        false
      );
    if (t === 'mobil')
      return W(
        EF_PKW_TXT +
          '. Bus: ' +
          dec(EF_BUS[i] * 1000, 0) +
          ' g je km, Kleinbus: ' +
          dec(EF_KLEIN[i] * 1000, 0) +
          ' g je km (Annahme; elektrisch ab 2035 deutlich weniger). Was ein Bus oder Rufbus ausstößt, steht gegen die Autofahrten, die er ersetzt. Ein schwach besetzter Bus verursacht mehr CO₂ als die Autos, die er ersetzt – das ändert sich erst, wenn er gut besetzt ist und elektrisch fährt.' +
          (v === 'ruf'
            ? ' Rufbus gerechnet: gefahrene Kleinbus-km (Leerfahrten eingerechnet) minus ersetzte Autofahrten. Drei Annahmen, jeweils als Spanne: Fahrgäste je Fahrt (1,2 – 1,8 – 3,5), Anteil Leer- und Anfahrtkilometer (+80 % – +60 % – +30 %) und der Anteil der Fahrten, die ein Auto ersetzen (25 % – 40 % – 70 %). Am meisten entscheidet die Besetzung: erst mit gut drei Fahrgästen und einem E-Kleinbus (ab etwa 2035) kippt das Vorzeichen ins Minus; heute mit Diesel bleibt es ein Plus. Belastbare Zahlen für Ratscher gibt es nicht.'
            : '') +
          (v === 'bank'
            ? ' Die Mitfahrbank: das Auto fährt ohnehin, ersetzt werden nur Fahrten, die sonst allein im eigenen Auto gemacht würden (Annahme: 0,6 Fahrten am Tag, 30 % davon).'
            : ''),
        [SRC.uba, SRC.ruf2],
        true
      );
    if (t === 'energie' && (v === 'dach' || v === 'park'))
      return W(
        'Strom: ' +
          Math.round(r.kwh / 1000) +
          ' MWh im Jahr (' +
          KWH_KWP +
          ' kWh je kWp nach PVGIS) ersetzt Strom aus dem Netz. Der Strommix stößt heute etwa 0,38 kg CO₂ je kWh aus (UBA), Annahme für später: ' +
          dec(EF_GRID[i], 2) +
          ' kg im Jahr ' +
          y +
          ' – das Netz wird sauberer, deshalb spart ein Modul später weniger. Module selbst: 0,04 kg/kWh über ihr Leben.',
        [SRC.uba, SRC.pvgis],
        true
      );
    if (t === 'energie' && v === 'waerme')
      return W(
        'Wärmebedarf 20 000 kWh je Haus (Annahme). Öl und Gas: im Mittel 0,19 kg CO₂ je kWh Wärme (UBA: Heizöl 0,27, Erdgas 0,20, Holz niedrig). Wärmepumpe: Strom ' +
          dec(EF_GRID[i], 2) +
          ' kg/kWh geteilt durch die Jahresarbeitszahl ' +
          dec(at([3, 3.2, 3.5, 3.8, 4], y), 1) +
          '. Gezählt sind nur die zusätzlichen Pumpen gegenüber heute.',
        [SRC.uba],
        true
      );
    if (t === 'wald') {
      const N = r.nums;
      return W(
        'Zwei Dinge: Wo die Fichten sterben und geräumt werden, wird gespeichertes CO₂ frei (etwa 300 t je Hektar im Bestand, die Hälfte davon über die Jahre; Bundeswaldinventur, Annahme) – jetzt ≈ ' +
          Math.round(N.emit) +
          ' t im Jahr, dazu fehlt die Senke des alten Bestands (≈ ' +
          Math.round(N.lostSink) +
          ' t). Dagegen binden die jungen Bäume bis zu 10 t je Hektar und Jahr, ' +
          (v === 'umbau' ? 'bei dichter Pflanzung' : 'auf einem Teil der Fläche') +
          ': ≈ ' +
          Math.round(N.sink) +
          ' t im Jahr. Alles gegenüber heute; die Spanne ist groß.',
        [SRC.bwi, SRC.forst],
        true
      );
    }
    return W('Dieses Szenario verändert den Ausstoß nicht und wird hier nicht bewertet.', [], false);
  }
  function laerm(topicId, vid, y, r, c) {
    const lvl = r.level || 0,
      n = r.houses || 0;
    let main = vid === 'heute' ? 'Referenz' : LEVEL[lvl];
    let sub = '';
    if (vid !== 'heute') {
      sub = n ? 'Stufe ' + lvl + ' von 4 · etwa ' + n + ' Häuser betroffen' : 'kein Haus betroffen';
      if (topicId === 'klima') {
        main = 'kurzzeitig';
        sub = 'Pumpen und Feuerwehr im Einsatz, kein Dauerlärm';
      }
    }
    return {
      id: 'laerm',
      label: 'Lärm',
      main,
      sub,
      range: '',
      raw: { level: lvl, houses: n },
      why: laermWhy(topicId, vid, y, r, c),
    };
  }
  function laermWhy(t, v, y, r, c) {
    if (v === 'heute') return W('Die Vergleichsgröße: der Lärm, den der Ort heute hat.', [], false);
    if (t === 'mobil' && v === 'bank')
      return W('Eine Bank macht keinen Lärm; es fahren nicht mehr Autos als bisher.', [], true);
    if (t === 'mobil' && v === 'ruf')
      return W(
        'Ein Kleinbus hält am Anger, tagsüber, ein paar Mal am Tag: Annahme zwei Häuser an der Haltestelle.',
        [],
        true
      );
    if (t === 'mobil' && v === 'takt')
      return W(
        'Zwölf Vorbeifahrten mehr am Tag an der Ortsdurchfahrt: Annahme 14 Häuser an der Straße. Für Wohnen im Dorfgebiet gilt nachts 45 dB(A) (TA Lärm) – tagsüber fahren die Busse.',
        [SRC.lärm],
        true
      );
    if (t === 'energie' && (v === 'dach' || v === 'park'))
      return W(
        'Wechselrichter und Trafo sind leise (unter 35 dB(A) in 50 m); die Module machen keinen Lärm. Der Park liegt weit vom nächsten Haus (Annahme über 100 m).',
        [SRC.lärm],
        true
      );
    if (t === 'energie' && v === 'waerme')
      return W(
        'Eine Luft-Wärmepumpe außen hat etwa 55–60 dB(A) Schallleistung, 3 m daneben noch 40–45 dB(A). Nachts gilt 40 dB(A) im Wohngebiet, 45 im Dorfgebiet (TA Lärm). Annahme: bei jedem siebten Haus steht sie nah an der Grundstücksgrenze zum Nachbarn (unter 5 m).',
        [SRC.lärm],
        true
      );
    if (t === 'klima')
      return W('Das Wasser macht keinen dauernden Lärm; im Einsatz laufen Pumpen und Feuerwehrfahrzeuge.', [], true);
    if (t === 'wald')
      return W(
        'Beim Räumen arbeitet ein Harvester (über 100 dB(A) Schallleistung) – Annahme: acht Häuser liegen näher als 300 m. Stufen nach den Hektar, die im Jahr geräumt werden.',
        [SRC.lärm],
        true
      );
    return W('Annahme.', [], true);
  }
  function natur(topicId, vid, y, r, c) {
    const base = c.nat0,
      d = r.nat || 0;
    const v = clamp(Math.round(base + d), 0, 100);
    const main = vid === 'heute' ? v + ' von 100' : v + ' von 100';
    const sub =
      vid === 'heute' ? 'wie im Entdeckerbuch' : (d >= 0 ? '+' : '−') + Math.abs(Math.round(d)) + ' gegenüber heute';
    return {
      id: 'natur',
      label: 'Naturwert',
      main,
      sub,
      range: vid === 'heute' ? '' : v - 4 + '–' + (v + 4),
      raw: { v, d },
      why: naturWhy(topicId, vid, y, r, c),
    };
  }
  function naturWhy(t, v, y, r, c) {
    const baseTxt =
      'Der Wert 0–100 gehört zur Datenansicht „Naturwert“ des Entdeckerbuchs (seltene Arten, ruhige Zonen, Zustand des Waldes); heute ' +
      c.nat0 +
      '. ';
    if (v === 'heute') return W(baseTxt + 'Das Szenario ändert ihn nicht.', [SRC.buch], false);
    if (t === 'mobil')
      return W(baseTxt + 'Keine Änderung: Bank, Rufbus und Bus liegen auf vorhandenen Straßen.', [SRC.buch], true);
    if (t === 'energie' && v === 'dach')
      return W(
        baseTxt +
          '−1: Mehlschwalben, Mauersegler und Fledermäuse brüten an Gebäuden; Module dürfen Nistplätze nicht nehmen, gebaut wird außerhalb der Brutzeit (BNatSchG § 44).',
        [SRC.buch],
        true
      );
    if (t === 'energie' && v === 'park')
      return W(
        baseTxt +
          '+3: extensives Grünland zwischen den Reihen statt Acker bringt Blüten, Insekten und Brutplätze für Feldlerche und Goldammer, wenn die Reihen weit genug auseinander stehen (BfN); verloren gehen die Weite und der Blick – Annahme.',
        [SRC.bfn, SRC.buch],
        true
      );
    if (t === 'energie') return W(baseTxt + 'Keine Änderung der Flächen.', [SRC.buch], true);
    if (t === 'klima')
      return W(
        baseTxt +
          (v === 'vorsorge'
            ? '+5: Rückhaltemulden sind zeitweise nasse Flächen mit Amphibien und Libellen (Annahme).'
            : v === 'duerre'
              ? 'Ein Dürresommer lässt Bäche austrocknen und stresst Bäume und Amphibien: ' +
                Math.round(r.nat) +
                ' (Annahme).'
              : 'Ein einzelnes Ereignis ändert wenig; Erosion am Bach kostet etwas.'),
        [SRC.buch, SRC.klimaatlas],
        true
      );
    if (t === 'wald')
      return W(
        baseTxt +
          (v === 'natur'
            ? 'Natürliche Verjüngung: Totholz und Lichtungen bringen Spechte, Insekten und Pionierbäume, der Wert steigt auf lange Sicht (Annahme: bis +15 im Jahr 2060).'
            : 'Waldumbau: eine gepflanzte Mischung ist artenreicher als Fichte, aber weniger wild als natürliche Verjüngung; im ersten Jahrzehnt sinkt der Wert durch die Räumung (Annahme: bis +12 im Jahr 2060).'),
        [SRC.forst, SRC.waldwissen],
        true
      );
    return W(baseTxt, [SRC.buch], true);
  }
  function voices(tid, vid) {
    return (VOICES[tid + '/' + vid] || []).map(([who, lean, say]) => ({
      who,
      name: WHO[who][0],
      role: WHO[who][1],
      lean,
      say,
    }));
  }
  function stimmung(topicId, vid) {
    const V = voices(topicId, vid);
    if (vid === 'heute')
      return {
        id: 'stimmung',
        label: 'Stimmung',
        main: 'Referenz',
        sub: 'wie jetzt im Dorf',
        range: '',
        raw: { v: 50 },
        voices: [],
        why: W(
          'Die Vergleichsgröße: die Stimmung heute (50 von 100). Die Stimmen sind Figuren des Spiels (Annahme), keine Umfrage in Ratscher.',
          [],
          false
        ),
      };
    const mean = V.length ? V.reduce((a, b) => a + b.lean, 0) / V.length : 0;
    const v = clamp(Math.round(50 + 12.5 * mean), 0, 100);
    const pro = V.filter(x => x.lean > 0).length,
      con = V.filter(x => x.lean < 0).length;
    return {
      id: 'stimmung',
      label: 'Stimmung',
      main: v + ' von 100',
      sub:
        pro +
        ' dafür, ' +
        con +
        ' dagegen' +
        (V.length - pro - con ? ', ' + (V.length - pro - con) + ' unentschieden' : ''),
      range: '',
      raw: { v, pro, con },
      voices: V,
      why: W(
        'Der Mittelwert der Haltungen der Dorfbewohner im Spiel (−2 bis +2, aus „Wahl und Amt“; 50 ist neutral): ' +
          V.map(x => x.name + ' ' + (x.lean > 0 ? '+' : '') + x.lean).join(', ') +
          '. Die Stimmen sind erfunden – Annahme zum Ausprobieren der Beteiligung, kein Meinungsbild des echten Orts. Ob jemand dafür oder dagegen ist, hängt am Grund: darum stehen die Sätze darunter.',
        [],
        true
      ),
    };
  }
  // ---------- the whole answer for a topic, a variant and a year ----------
  function calc(topicId, vid, year, ctx) {
    const c = ctxOf(ctx);
    const y = YEARS.includes(year) ? year : YEARS[iy(year)];
    const fn = CALC[topicId];
    if (!fn || !variant(topicId, vid)) return null;
    const r = fn(vid, y, c);
    const ind = {
      kosten: kosten(topicId, vid, y, r, c),
      co2: co2(topicId, vid, y, r, c),
      laerm: laerm(topicId, vid, y, r, c),
      natur: natur(topicId, vid, y, r, c),
      stimmung: stimmung(topicId, vid),
    };
    const world = Object.assign(
      { pvRoof: 0, pvField: 0, wp: 0, bank: 0, rufbus: 0, takt: 0, wet: 0, rain: null, flood: 0, dry: 0, forest: null },
      r.world
    );
    return { topic: topicId, variant: vid, year: y, ind, world, raw: r };
  }
  // what the world shows: only the world part, for a variant of the topic (nothing for „Heute“)
  const ORDER = ['kosten', 'co2', 'laerm', 'natur', 'stimmung'];
  return {
    YEARS,
    TOPICS,
    ORDER,
    SRC,
    WHO,
    VOICES,
    CTX0,
    EF_GRID,
    EF_PKW,
    KWH_KWP,
    topic,
    variant,
    calc,
    voices,
    at,
    sig2,
    eur,
    tco2,
    affected,
    cleared,
    strikeYear,
    regrow,
    OCC,
    LAG,
    DIEBACK,
  };
})();
