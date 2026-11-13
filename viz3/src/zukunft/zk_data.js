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
      'PVGIS (Gemeinsame Forschungsstelle der EU, API v5_2, abgefragt 12.11.2026): Jahresertrag bei Ratscher (50,47° N, 10,78° O)',
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
    kfw: [
      'test.de: Neue Förderung für Haus und Heizung – KfW 458 (seit 21.07.2026): Grundförderung 30 % plus Boni',
      'https://www.test.de/Neue-Foerderung-fuer-Haus-und-Heizung-Bis-zu-45-Prozent-Zuschuss-zur-neuen-Heizung-5561989-5574917/',
    ],
    vzwp: [
      'Verbraucherzentrale Rheinland-Pfalz: Wärmepumpen-Faktencheck (02/2026)',
      'https://www.verbraucherzentrale-rlp.de/sites/default/files/2026-02/260210_wp-faktencheck_vzrp.pdf',
    ],
    behg: [
      'Advant Beiten: BEHG-Novelle – CO₂-Preis bleibt 2027 im Korridor von 55 bis 65 Euro',
      'https://www.advant-beiten.com/en/news/behg-novelle-co2-preis-bleibt-2027-im-korridor-von-55-bis-65-euro',
    ],
    ubaverkehr: [
      'Umweltbundesamt: Emissionsdaten Verkehr (TREMOD)',
      'https://www.umweltbundesamt.de/themen/verkehr/emissionsdaten',
    ],
    ubaregen: [
      'Umweltbundesamt: Emissionsbilanz erneuerbarer Energieträger 2024 (vermiedene Emissionen)',
      'https://www.umweltbundesamt.de/publikationen/emissionsbilanz-erneuerbarer-energietrager-2024',
    ],
    ubastrom: [
      'Umweltbundesamt: CO₂-Emissionen pro Kilowattstunde Strom 2025 (344 g)',
      'https://www.umweltbundesamt.de/themen/co2-emissionen-pro-kilowattstunde-strom-2025-nur',
    ],
    mvruf: [
      'Landtag Mecklenburg-Vorpommern, Drucksache 8/6129: Rufbus in M-V – Kosten, Nutzung, Flotte 2023–2025 (Grundlage der eigenen Rechnung 30–56 € je Fahrgast)',
      'https://www.dokumentation.landtag-mv.de/parldok/dokument/69365/8_6129_rufbus_in_mecklenburg_vorpommern_kosten_nutzung_flotte_und_personal_in_den_jahren_2023_bis_2025',
    ],
    mfbank: [
      'Land Brandenburg: FAQ Mitfahrerbänke Prenzlau (Haftung: die Kfz-Haftpflicht des Fahrers)',
      'https://mweke.brandenburg.de/sixcms/media.php/54/FAQ_Mitfahrerbaenke_Prenzlau.pdf',
    ],
    mfbank2: [
      'kommunal.de: Gefangen im Dorf – ist die Mitfahrbank die Lösung? (Kosten etwa 3 000 € je Bank)',
      'https://kommunal.de/index%2ephp/gefangen-im-dorf-ist-die-mitfahrbank-die-loesung',
    ],
    pvstrom: [
      'pv magazine: Fraunhofer ISE – Stromgestehungskosten neuer Freiflächenanlagen 4,1 bis 6,9 ct/kWh',
      'https://www.pv-magazine.de/2024/08/06/fraunhofer-ise-stromgestehungskosten-fuer-neue-photovoltaik-freiflaechenanlagen-bei-41-bis-69-cent-pro-kilowattstunde-angekommen/',
    ],
    laenderbet: [
      'pv magazine: § 6 EEG und die Länder-Beteiligungsgesetze im Überblick (ThürWindBeteilG nur Wind)',
      'https://www.pv-magazine.de/unternehmensmeldungen/%C2%A7-6-eeg-alle-laenderbeteiligungsgesetze-im-ueberblick/',
    ],
    einsp: [
      'EMA Energiewelt: Einspeisevergütung sinkt zum 1.8.2026 (7,70 ct/kWh)',
      'https://ema-energiewelt.de/wissen/pv-einspeiseverguetung-sinkt-1-august-2026-stichtag',
    ],
    wpg: ['Wärmeplanungsgesetz § 4 (Frist der Wärmeplanung)', 'https://www.gesetze-im-internet.de/wpg/__4.html'],
    ubadurre: [
      'Umweltbundesamt: Trockenheit und Dürre in Deutschland (05.08.2026)',
      'https://www.umweltbundesamt.de/node/74131',
    ],
    mastr: [
      'Marktstammdatenregister: Solaranlagen im Postleitzahlgebiet 98553 (Stand November 2026)',
      'https://www.marktstammdatenregister.de/',
    ],
    kostra: [
      'DWD: KOSTRA-DWD-2020 (Starkregenhöhen nach Dauer und Wiederkehrzeit)',
      'https://www.dwd.de/DE/leistungen/kostra_dwd_rasterwerte/kostra_dwd_rasterwerte.html',
    ],
    rekis: [
      'ReKIS/TLUBN: Klima-Steckbrief Landkreis Hildburghausen (Projektion RCP8.5, Abweichung gegen 1961–1990)',
      'https://rekisviewer.hydro.tu-dresden.de/viewer/rekis_domain/Klima_Steckbriefe/Thueringen/Landkreise/16069/000_GESAMT.pdf',
    ],
    waldbericht: [
      'Waldbericht Thüringen 2025 (PEFC-Veröffentlichung): Borkenkäfer-Schadholz und Verjüngung',
      'https://www.pefc.de/media/filer_public/56/2a/562a9da2-dca5-4956-a063-7bbbd91ca007/waldbericht_thuringen_2025.pdf',
    ],
    klimaatlas: [
      'DWD: Klimaatlas Deutschland (Projektionen, Südthüringen)',
      'https://www.dwd.de/DE/klimaumwelt/klimaatlas/klimaatlas_node.html',
    ],
    uesg: [
      'Geoproxy Thüringen (TLUBN, GDI-Th): amtliches Überschwemmungsgebiet HQ100, WMS-Ebene UESG (abgerufen 12.11.2026)',
      'https://www.geoportal-th.de/',
    ],
    hnz: [
      'Hochwassernachrichtenzentrum Thüringen: Hochwasservorsorge',
      'https://hnz.thueringen.de/hochwasservorsorge/pdf/HWVorsorge_Gesamtdokument.pdf',
    ],
    dez23: [
      'Thüringer Landtag, Drucksache 7/9624 (28.02.2024): Talsperren Schönbrunn und Ratscher im Dezember 2023 – etwa 900 000 m³ gespeichert am 23./24.12.',
      'https://parldok.thueringer-landtag.de/ParlDok/dokument/96219/management_der_talsperren_schoenbrunn_und_ratscher_waehrend_der_hochwasserlage_in_suedthueringen_landkreis_hildburghausen_im_dezember_2023.pdf',
    ],
    forst: ['ThüringenForst: Waldumbau und Wiederbewaldung', 'https://www.thueringenforst.de/'],
    bwi: ['Bundeswaldinventur: Vorräte und Zuwachs der Fichte', 'https://www.bundeswaldinventur.de/'],
    waldwissen: ['waldwissen.net: Borkenkäfer und Kalamitätsflächen', 'https://www.waldwissen.net/'],
    bfn: ['BfN: Photovoltaik-Freiflächenanlagen und Naturschutz (BfN-Skript 247)', null],
    buch: ['Entdeckerbuch im Spiel', null],
  };
  // ---------- the villagers (the game's, as in „Wahl und Amt“) ----------
  const WHO = {
    landwirt: ['Sicht Landwirtschaft', ''],
    paechter: ['Sicht Pächter', ''],
    rentnerin: ['Sicht Ältere', ''],
    pendlerin: ['Sicht Pendler', ''],
    feuerwehr: ['Sicht Einsatzkräfte', ''],
    jugendliche: ['Sicht Jugend', ''],
    waldbesitzer: ['Sicht Waldbesitz', ''],
    handwerker: ['Sicht Handwerk', ''],
    gaertnerin: ['Sicht Gartenbesitz', ''],
    chronist: ['Sicht Dorfgeschichte', ''],
    vogel: ['Sicht Naturschutz', ''],
    gemeinde: ['Sicht Gemeinwohl', ''],
  };

  // ---------- the defaults for what the world tells (ctx) ----------
  const CTX0 = {
    bus: { werk: 30, sa: 14, so: 11, min: 4, src: 'annahme' }, // Annahme as a stand-in: the real timetable (week of 16.11.2026) has 30 / 14 / 11 departures
    roof: { kwp: 600, area: 2900, n: 40, src: 'annahme' },
    field: { kwp: 1520, ha: 1.71, src: 'annahme' },
    nat0: 55,
    forest: { ha: 16.8, spruce: 0.62 },
    houses: 55,
    km: 3, // Ratscher Schleusebrücke → Schleusingen Zentralhaltestelle 2,4 km, Schulbushaltestelle 3,2 km (fahrplan.json); rounded
  };
  const ctxOf = c => {
    const o = {};
    for (const k of Object.keys(CTX0))
      o[k] = c && c[k] != null ? (typeof CTX0[k] === 'object' ? { ...CTX0[k], ...c[k] } : c[k]) : CTX0[k];
    return o;
  };
  // ---------- common factors over the years (2026, 2030, 2035, 2045, 2060) ----------
  // Strommix kg CO₂/kWh: 2023 about 0,38 (UBA); after that Annahme on the way to the climate-neutral power system of 2045 (KSG)
  const EF_GRID = [0.34, 0.22, 0.13, 0.03, 0.01]; // 2025: 344 g/kWh (UBA); later Annahme
  // fossil power that a PV kWh displaces (UBA net balance of renewables: about 0,7 kg/kWh today – reviewer's division 205 Mt / 285 TWh); Annahme falling with the grid
  const EF_DISP = [0.7, 0.5, 0.35, 0.15, 0.05];
  const EF_PV = 0.04; // life cycle of a PV module in Germany about 40 g/kWh (UBA, Fraunhofer ISE) – rounded
  const EF_PKW = [0.23, 0.2, 0.17, 0.11, 0.06]; // kg per car kilometre incl. upstream: TREMOD 2024 164 g per person-km at 1,4 persons ≈ 0,23 (UBA); later years Annahme (more electric cars)
  const EF_BUS = [1.0, 0.9, 0.65, 0.18, 0.06]; // kg per bus kilometre incl. upstream (diesel line bus; Annahme); electrified step by step
  const EF_KLEIN = [0.35, 0.32, 0.23, 0.07, 0.02]; // minibus of a Rufbus incl. upstream (Annahme)
  const PRICE_ROOF = [1300, 1150, 1000, 850, 800]; // € per kWp small roof system (ISE 2024: 700–2000, small roofs about 1300); later steps Annahme
  const PRICE_FIELD = [700, 620, 560, 480, 450]; // € per kWp ground-mounted (ISE: below 460 by 2045)
  // PVGIS-SARAH (JRC API v5_2, 12.11.2026, lat 50.47 lon 10.78, 456 m, losses 14 %): kWh a year per kWp – south 35°: 1011, south 20°: 980, south 12°
  // (flat-roof racks): 945, east or west 35°: 815–825. Roofs of the village: a mix of south, east/west and flat roofs (Annahme: about 900, range 815–1010).
  const KWH_ROOF = 900;
  const KWH_FIELD = 980; // field tables, 20° to the south
  const KWH_KWP = KWH_ROOF;
  const EF_PKW_TXT =
    'Auto: etwa 230 g CO₂ je Pkw-Kilometer heute (UBA/TREMOD 2024: 164 g je Personenkilometer bei 1,4 Personen, mit Vorkette), später weniger, weil mehr Elektroautos fahren (Annahme). Linienbus etwa 1 kg je Kilometer mit Vorkette (Annahme; UBA: 90 g je Personenkilometer bei 16 % Auslastung)';
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
          text: 'Der Bus nach dem echten Fahrplan (montags bis freitags etwa 30 Fahrten am Tag nach Schleusingen, samstags 14, sonntags 11), sonst das eigene Auto.',
        },
        {
          id: 'bank',
          label: 'Mitfahrbank',
          short: 'Mitfahrbank im Ort',
          text: 'Eine Bank im Ort: wer sich setzt, will mitgenommen werden.',
        },
        {
          id: 'ruf',
          label: 'Rufbus',
          short: 'Rufbus auf Bestellung',
          text: 'Ein Kleinbus fährt auf Anruf oder per App, täglich, vor allem abends nach 21 Uhr (der letzte Bus aus Schleusingen kommt um 21:10) und sonntags und an Feiertagen, wenn der Linienbus nur selten fährt.',
        },
        {
          id: 'takt',
          label: 'Mehr Fahrten',
          short: '6 Fahrten mehr abends und am Wochenende',
          text: 'Sechs zusätzliche Fahrten mit dem normalen Linienbus, dorthin gelegt, wo der Fahrplan Lücken hat: spät am Abend und am Wochenende.',
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
          text: 'Die Dächer, wie sie sind (Solaranlagen gibt es schon: im Marktstammdatenregister stehen für die Postleitzahl 98553 635 Dachanlagen, 301 Balkonkraftwerke und 3 Freiflächenanlagen; sie sind hier nicht eingerechnet), Heizungen mit Öl, Gas und Holz (Annahme).',
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
          text: 'Eine Freifläche am südlichen Ortsrand (Annahme für den Ort – eine konkrete Planung für Ratscher oder Schleusingen wurde bei einer Suche im November 2026 nicht gefunden) mit Modultischen in Reihen.',
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
      text: 'Starkregen und trockene Sommer werden voraussichtlich häufiger; beim Hochwasser der Schleuse ist das unsicher. Was passiert im Dorf – und was hilft?',
      variants: [
        { id: 'heute', label: 'Heute', short: 'ohne Ereignis', text: 'Ein gewöhnliches Jahr.' },
        {
          id: 'regen',
          label: 'Starkregen',
          short: 'Starkregen ohne Vorsorge',
          text: 'Ein Gewitterregen von der Art, wie er einmal in 100 Jahren fällt – ohne zusätzliche Vorsorge im Dorf.',
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
          text: 'Das Hochwasser vom Dezember 2023: Die Talsperre Ratscher speicherte etwa 900 000 m³. Wie hoch das Wasser im Dorf stand, ist hier eine Annahme.',
        },
        {
          id: 'hoch',
          label: 'Schwerer als 2023',
          short: 'Hochwasser schwerer als 2023',
          text: 'Ein Hochwasser, wie es etwa einmal in 100 Jahren kommt (HQ100) – so wie das Land das hundertjährliche Hochwasser für die Schleuse berechnet hat.',
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
      text: 'Angenommen, der Fichtenwald an der Unteren Klinge fällt Trockenheit und Käfer zum Opfer: Was wächst danach, und was kostet es?',
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
          text: 'Auf den Kahlflächen werden Buche, Weißtanne, Eiche und Douglasie gepflanzt. Der Eigentümer entscheidet, das Forstamt berät.',
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
        'rentnerin',
        2,
        'Zum Arzt nach Schleusingen komme ich nur mit dem Bus – und der fährt am Wochenende nur alle zwei Stunden. Eine Bank würde mir helfen.',
      ],
      [
        'jugendliche',
        1,
        'Ich würde mich hinsetzen, wenn ich weiß, dass wirklich jemand hält. Zu zweit ist mir das lieber als allein.',
      ],
      ['pendlerin', 0, 'Ich nehme gern jemanden mit, aber nur, wenn ich weiß, wen. Das muss sich erst einspielen.'],
      ['gemeinde', -1, 'Die Bank allein löst nichts, wenn niemand anhält. Wer kümmert sich darum, und was kostet sie?'],
    ],
    'mobil/ruf': [
      [
        'rentnerin',
        2,
        'Kurz nach neun, wenn der letzte Bus aus Schleusingen weg ist, bin ich auf Hilfe angewiesen. Anrufen und abgeholt werden wäre für mich viel wert.',
      ],
      ['pendlerin', 1, 'Abends, wenn ich spät vom Dienst komme, wäre das ein Segen – wenn es zuverlässig kommt.'],
      [
        'landwirt',
        -1,
        'Mehrere zehntausend Euro im Jahr für ein Dorf mit etwa 120 Leuten? Das muss der Landkreis wollen.',
      ],
      [
        'handwerker',
        0,
        'Technisch geht das. Ob es genug Leute nutzen, zeigt nur ein Versuch, und der Landkreis müsste mitziehen.',
      ],
    ],
    'mobil/takt': [
      ['pendlerin', 2, 'Mit mehr Fahrten am Abend und am Wochenende könnte ich öfter ohne Auto fahren.'],
      ['jugendliche', 1, 'Am Wochenende ohne Eltern nach Schleusingen zu kommen wäre schon etwas.'],
      ['handwerker', -1, 'Ein halb leerer Bus ist fürs Klima nicht besser als mein Auto. Das muss sich rechnen.'],
      [
        'rentnerin',
        0,
        'Gut, wenn er fährt, wenn ich ihn brauche. Wenn nicht, hilft mir auch ein zusätzlicher Bus nicht.',
      ],
    ],
    'energie/dach': [
      ['gaertnerin', 2, 'Auf dem Dach vom Stall würde ich Module sofort legen, wenn sich das rechnet.'],
      ['handwerker', 2, 'Mit Speicher und Wallbox rechnet sich das für viele. Ich würde die Technik gern machen.'],
      [
        'chronist',
        -1,
        'Bei den alten Häusern im Dorfkern bitte nicht auf die Straßenseite: das Ortsbild und der Denkmalschutz.',
      ],
      [
        'vogel',
        0,
        'Schwalben und Mauersegler brüten an den Gebäuden. Die Module dürfen ihnen die Nistplätze nicht nehmen.',
      ],
    ],
    'energie/park': [
      ['paechter', -1, 'Als Pächter verliere ich Fläche, und die Pacht bekommt der Eigentümer. Mir hilft das nicht.'],
      [
        'landwirt',
        1,
        'Pacht ist verlässlicher als Weizenpreis. Wenn die Fläche ohnehin schlecht ist, überlege ich es mir.',
      ],
      ['handwerker', 2, 'Viel Strom an einem Ort, günstig je Kilowattstunde.'],
      ['gemeinde', 1, 'Wenn das Dorf etwas davon hat – eine Beteiligung, vielleicht Bürgerstrom.'],
      [
        'chronist',
        -1,
        'Der Blick vom Weg nach Süden wäre danach ein anderer. Das sollte man vorher gemeinsam anschauen.',
      ],
    ],
    'energie/waerme': [
      ['handwerker', 1, 'Die Technik ist gut, aber ein Altbau braucht Dämmung und meist größere Heizkörper.'],
      ['gaertnerin', 0, 'Mein Holzofen bleibt. Eine Pumpe daneben wäre für mich eine Ergänzung.'],
      ['rentnerin', -1, 'Dreißigtausend Euro für eine Heizung, in meinem Alter? Auch mit Förderung ist das viel.'],
      ['pendlerin', 1, 'Für uns käme das in Frage, wenn die Förderung stimmt und das Gerät nachts leise ist.'],
    ],
    'klima/regen': [
      [
        'feuerwehr',
        -2,
        'Bei so einem Regen müssen wir raus, und die Keller am Hang laufen voll. Das kennt man aus anderen Dörfern.',
      ],
      ['rentnerin', -1, 'Dann läuft das Wasser von den Feldern über die Straße. Ich habe Angst um meinen Keller.'],
      [
        'pendlerin',
        -1,
        'Wenn die Straße zum Bach wird, kommt der Schulbus nicht durch, und die Kinder müssen im Nassen warten.',
      ],
      ['landwirt', 0, 'An den Feldern lässt sich etwas tun, am Hang auch.'],
    ],
    'klima/vorsorge': [
      ['feuerwehr', 2, 'Mulden und ein größerer Durchlass: genau das, was uns im Einsatz Arbeit abnähme.'],
      ['gemeinde', 1, 'Die Stadt muss mitzahlen. Ob es sich rechnet, hängt davon ab, wie oft so ein Regen kommt.'],
      [
        'landwirt',
        0,
        'Wenn die Mulde auf meinem Acker liegt, will ich eine Entschädigung – und eine Lösung für die Bewirtschaftung.',
      ],
      ['pendlerin', 1, 'Hauptsache, die Straße bleibt befahrbar.'],
    ],
    'klima/dez23': [
      [
        'feuerwehr',
        1,
        'Im Dezember 2023 hat die Talsperre viel abgefangen. Gut, dass es sie gibt – darauf allein verlassen möchte ich mich nicht.',
      ],
      [
        'landwirt',
        -1,
        'Die Wiesen an der Schleuse können unter Wasser stehen, auch wenn die Talsperre hält. Wer ersetzt den Ausfall?',
      ],
      ['chronist', 0, 'Wir wissen, wo das Wasser hinläuft. Ein Pegel am Dorfeingang wäre schon eine Hilfe.'],
    ],
    'klima/hoch': [
      [
        'feuerwehr',
        -2,
        'Dezember 2023 hat gezeigt, wie schnell das geht. Wenn die Talsperre nicht mehr reicht, wird es ernst.',
      ],
      [
        'chronist',
        -1,
        'Hochwasser gab es sicher schon früher; das sollten wir in der Chronik nachlesen. Das Wasser vergisst nichts.',
      ],
      ['landwirt', -1, 'Meine Wiesen stünden dann tagelang unter Wasser.'],
      ['jugendliche', 0, 'Ich hätte gern, dass man vorher sagt, was zu tun ist – nicht erst, wenn es da ist.'],
    ],
    'klima/duerre': [
      ['landwirt', -2, 'Mehrere trockene Sommer hintereinander halte ich nicht durch. Dann bleibt der Mais klein.'],
      ['gaertnerin', -2, 'Der Garten ist nur noch mit Gießen zu halten, und der Brunnen wird knapp.'],
      ['waldbesitzer', -1, 'Meine Fichten stehen schon im Stress. Der Käfer kommt dann zuverlässig.'],
      ['jugendliche', -1, 'Wenn der Bach trocken fällt, fehlt uns im Sommer etwas.'],
    ],
    'wald/natur': [
      ['vogel', 2, 'Soll die Natur es machen: Birke, Eberesche, und der Rotmilan hat freie Sicht.'],
      [
        'waldbesitzer',
        -1,
        'Das sieht lange wild aus, und für Nutzholz dauert es. Wer vom Wald etwas haben will, hat davon wenig.',
      ],
      ['chronist', 0, 'Die Fichten hat man hier angepflanzt. Man kann nicht ewig nachtrauern.'],
      ['jugendliche', 1, 'Ich finde einen wilden Wald spannender als Reihen.'],
    ],
    'wald/umbau': [
      [
        'waldbesitzer',
        2,
        'Buche, Tanne, Eiche: Ein Mischwald hält mehr aus. Ich pflanze gern, wenn die Förderung stimmt – Holz gibt es erst in vielen Jahrzehnten.',
      ],
      ['gemeinde', 1, 'Das Forstamt berät, der Eigentümer entscheidet. Mit einem gemeinsamen Plan ginge es leichter.'],
      ['vogel', -1, 'Gepflanzt ist nicht wild. Und was gegen Rehe gezäunt werden muss, sperrt auch andere Tiere aus.'],
      ['landwirt', -1, 'Neun- bis dreizehntausend Euro je Hektar. Wer ist der Eigentümer, der das zahlt?'],
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
      // one bench with sign: about 3 000 € in practice (kommunal.de; the game's AMTDATA says 380 €, the bare bench); care 60 € a year (Annahme)
      res.kosten = { inv: [2000, 3000, 4000], yr: [40, 60, 100] };
      // Annahme: 0,6 rides a day on 300 days; 30 % of them would have driven alone (11 km there and back)
      const rides = 0.6 * 300,
        saved = rides * 0.3 * 2 * km * pkw;
      res.co2 = [(-saved * 2.2) / 1000, -saved / 1000, (-saved * 0.2) / 1000];
      res.world.bank = 1;
      res.ridesYr = rides;
    } else if (vid === 'ruf') {
      // Annahme: 3 passenger trips a day on 300 days (Mon–Sat; range 1,5–6), growing with the age of the village. Per passenger 30–56 €
      // (Landtag M-V Drs. 8/6129: 2023–25 districts paid 30–56 €); mid 40 €. Mecklenburg-Vorpommern sees only 0,5–0,6 trips per inhabitant a year –
      // 3 a day would be about 7 per inhabitant, so the low end of the range is the more cautious guess.
      const grow = at([1, 1.1, 1.2, 1.35, 1.5], y),
        perDay = [1.5, 3, 6],
        perTrip = [30, 40, 56],
        trips = 3 * 365 * grow;
      res.kosten = {
        inv: [0, 0, 0],
        yr: [perDay[0] * 365 * grow * perTrip[0], trips * perTrip[1], perDay[2] * 365 * grow * perTrip[2]],
      };
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
      const kmYr = 6 * 2 * km * 365;
      res.kosten = { inv: [0, 0, 0], yr: [kmYr * 3, kmYr * 3.8, kmYr * 4.5] };
      const em = (kmYr * EF_BUS[i]) / 1000,
        saved = (kmYr * 2.5 * 0.4 * pkw) / 1000; // Annahme: 2,5 riders a trip, 40 % of them would have driven
      res.co2 = [(em - saved) * 0.7, em - saved, (em - saved) * 1.3];
      res.houses = 14; // Annahme: houses along the road through the village
      res.level = 1;
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
    const gridNet = Math.max(0, EF_GRID[i] - EF_PV); // kg saved per kWh of PV against the grid mix (direct factor of the mix minus the module's life cycle; never below 0)
    if (vid === 'dach') {
      const share = at([0, 0.25, 0.5, 0.8, 0.8], y),
        kwp = c.roof.kwp * share,
        kwh = kwp * KWH_ROOF,
        inv = kwp * PRICE_ROOF[i];
      res.kosten = { inv: [inv * 0.7, inv, inv * 1.4], yr: [inv * 0.012, inv * 0.015, inv * 0.02] };
      res.kwp = kwp;
      res.kwh = kwh;
      res.eurPerYr = kwh * (0.32 / 3 + (2 / 3) * at([0.077, 0.04, 0.04, 0.04, 0.04], y));
      res.co2 = [
        -(kwh * Math.max(gridNet, EF_DISP[i] - EF_PV)) / 1000,
        -(kwh * gridNet) / 1000,
        -(kwh * gridNet * 0.7) / 1000,
      ];
      res.nat = -1;
      res.world.pvRoof = share;
    } else if (vid === 'park') {
      const share = at([0, 1, 1, 1, 1], y),
        kwp = c.field.kwp * share,
        kwh = kwp * KWH_FIELD,
        inv = kwp * PRICE_FIELD[Math.max(1, i)];
      const pacht = c.field.ha * 2500 * share,
        om = kwp * 12 * (share ? 1 : 0);
      res.kosten = { inv: [inv * 0.75, inv, inv * 1.3], yr: [(om + pacht) * 0.8, om + pacht, (om + pacht) * 1.25] };
      res.kwp = kwp;
      res.kwh = kwh;
      res.beteil = kwh * 0.002; // § 6 EEG, 0,2 ct/kWh
      res.co2 = [
        -(kwh * Math.max(gridNet, EF_DISP[i] - EF_PV)) / 1000,
        -(kwh * gridNet) / 1000,
        -(kwh * gridNet * 0.7) / 1000,
      ];
      res.nat = share ? 3 : 0;
      res.world.pvField = share;
    } else if (vid === 'waerme') {
      const share = at([0.05, 0.15, 0.3, 0.55, 0.8], y),
        n = Math.max(0, (share - 0.05) * c.houses),
        jaz = at([3, 3.2, 3.5, 3.8, 4], y),
        demand = 20000; // kWh a year for an old village house (Annahme)
      const fossil = 0.26; // kg/kWh heat of an oil or gas boiler (UBA: Heizöl 0,27, Erdgas 0,20; with upstream 0,22–0,30)
      const dco = n * ((demand * (EF_GRID[i] / jaz - fossil)) / 1000);
      res.n = n;
      res.kosten = { inv: [n * 25000, n * 32000, n * 40000], yr: [0, 0, 0] };
      const strom = (demand / jaz) * 0.28,
        gas = demand * (0.11 + at([0.013, 0.02, 0.035, 0.06, 0.075], y)); // fuel price plus the CO₂ price (Annahme, see Warum)
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
    const f = at([1, 1.05, 1.1, 1.15, 1.2], y); // Starkregen: about +7 % intensity for each degree of warming (Clausius-Clapeyron), more heavy events
    const res = {
      kosten: { inv: [0, 0, 0], yr: [0, 0, 0] },
      co2: null,
      houses: 0,
      level: 0,
      nat: 0,
      world: { wet: 0, rain: null, flood: 0, dry: 0 },
    };
    if (vid === 'regen' || vid === 'vorsorge') {
      const dmg = 184000; // Annahme: 12 Keller und Erdgeschosse × 12 000 € + 40 000 € Wege und Straßen
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
      // The official flood area (HQ100, Geoproxy Thüringen WMS 'UESG') wets about 37 buildings in the world (zukunft-welt, counted from the mask;
      // ZKWELT.ctx() does not expose the number, so it is a constant here). Annahme: half living houses at 35 000 € (shallow water, cellar and
      // ground floor), the rest barns and outbuildings at 5 000 €. The depth at each building is not official.
      const nB = 37,
        nLiving = Math.floor(nB / 2), // 18 living houses, 19 outbuildings – as the Warum text says
        dmg = nLiving * 35000 + (nB - nLiving) * 5000;
      const ead = dmg * 0.01 * at([1, 1.02, 1.04, 1.07, 1.1], y) + dmg * 0.002;
      res.dmg = dmg;
      res.houses = nB;
      res.ead = ead;
      res.kosten = { inv: [0, 0, 0], yr: [ead * 0.5, ead, ead * 2.2] };
      res.world.flood = 1.8 * at([1, 1.02, 1.04, 1.07, 1.1], y);
    } else if (vid === 'duerre') {
      const p = at([0.35, 0.38, 0.42, 0.5, 0.6], y); // chance of a drought summer in a year (Annahme after the DWD-Klimaatlas)
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
    // the die-back itself (emission and lost sink) hits both variants alike – it is the beetle, not the choice. So the two are compared with
    // each other: natural regeneration is the reference (0), the planted mixed forest is shown against it.
    const net = N.emit + N.lostSink - N.sink;
    const Nn = waldNums('natur', y, c),
      netRef = Nn.emit + Nn.lostSink - Nn.sink;
    res.dieback = N.emit + N.lostSink;
    const diff = net - netRef;
    res.co2 = vid === 'natur' ? [0, 0, 0] : [diff * 1.4, diff, diff * 0.6];
    res.co2ref = true;
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
    if (yr[1] && inv[1]) bits.push('jährlich ≈ ' + eur(yr[1]));
    if (topicId === 'klima' && r.ead && inv[1]) bits.push('Schaden bleibt: ≈ ' + eur(r.ead) + '/Jahr erwartet');
    if (topicId === 'klima' && r.ead && !inv[1]) bits[0] = 'erwarteter Schaden ≈ ' + eur(r.ead) + ' im Jahr';
    if (r.eurPerYr) bits.push('Ersparnis und Erlös ≈ ' + eur(r.eurPerYr) + ' im Jahr');
    if (r.beteil) bits.push('Gemeinde-Beteiligung bis ≈ ' + eur(r.beteil) + '/Jahr');
    if (r.savePerWp != null && r.n)
      bits.push(
        'Betrieb je Haus ' + (r.savePerWp >= 0 ? 'spart ≈ ' : 'kostet ≈ ') + eur(Math.abs(r.savePerWp)) + '/Jahr'
      );
    const why = kostenWhy(topicId, vid, y, r, c);
    // one short sub-line; the other numbers go into the Warum
    if (bits.length > 1) why.text += ' Weitere Zahlen: ' + bits.slice(1).join('; ') + '.';
    return {
      id: 'kosten',
      label: 'Kosten',
      main,
      sub: bits[0] || (vid === 'heute' ? 'Referenz' : ''),
      range: inv[1] ? eurRange(inv[0], inv[2]) : yr[1] ? eurRange(yr[0], yr[2]) + ' im Jahr' : '',
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
        'Eine Bank mit Schild kostet in der Praxis etwa 3 000 € (kommunal.de; Spanne 2 000–4 000 €, die bloße Bank im Spiel 380 €), Pflege etwa 60 € im Jahr (Annahme). Mitfahrbänke gibt es in vielen Dörfern; zahlen würde die Stadt oder der Ortsteil aus seinem Budget. Zur Haftung: Es fährt ein Auto mit seiner eigenen Kfz-Haftpflicht, sie deckt auch die Mitfahrenden (FAQ des Landes Brandenburg).',
        [SRC.bank, SRC.mfbank2, SRC.mfbank],
        true
      );
    if (t === 'mobil' && v === 'ruf')
      return W(
        'Annahme: im Mittel drei Fahrgastfahrten am Tag aus Ratscher (an 365 Tagen, Spanne 1,5–6; wächst mit dem Alter im Dorf), je Fahrgast 40 € (Spanne 30–56 €) – das ergibt in diesem Jahr ' +
          grp(String(Math.round(r.tripsYr / 10) * 10)) +
          ' Fahrten mal 40 €. Die 30–56 € sind eine eigene Rechnung aus Landtag Mecklenburg-Vorpommern, Drs. 8/6129 (Zahlungen der Landkreise 2023–2025 geteilt durch die Fahrgäste). Dort fahren nur etwa 0,5–0,6 Fahrten je Einwohner und Jahr (ebenfalls eigene Rechnung, Einwohnerzahl gerundet); für Ratscher mit rund 120 Einwohnern wären das etwa 70 im Jahr – drei am Tag wären gut 9 je Einwohner, also eher viel. In Thüringen wurden beide Dorfbus-Versuche im Wartburgkreis wieder in normale Linien überführt; nach einem MDR-Bericht von 2023 (zitiert in Drs. 7/8819) sollten im Landkreis Hildburghausen einige Linien nur noch als Rufbus fahren – beim Landkreis nachfragen. Bestellt und bezahlt wird der Busverkehr vom Landkreis (§ 3 ThürÖPNVG).',
        [SRC.rufbus, SRC.mvruf, SRC.ruf2, SRC.oepnv],
        true
      );
    if (t === 'mobil' && v === 'takt')
      return W(
        'Sechs zusätzliche Fahrten hin und zurück sind ' +
          Math.round(r.kmYr / 1000) +
          ' 000 Fahrplankilometer im Jahr (sechs Mal 2 × ' +
          c.km +
          ' km an 365 Tagen). Ein Linienbus kostet etwa 3,8 € je Kilometer (Annahme 3–4,5 €). Bestellt vom Landkreis.',
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
          ' €/kWp (Fraunhofer ISE 2024: 700–2000 €/kW, kleine Dächer mehr; spätere Jahre Annahme). Betrieb 1,5 % der Investition im Jahr (Annahme). Erlös und Ersparnis: ein Drittel Eigenverbrauch zu 32 ct (Annahme), der Rest wird eingespeist – 7,70 ct/kWh seit 1.8.2026 (EMA Energiewelt); der Kabinettsentwurf vom 29.07.2026 will die feste Vergütung für neue Anlagen ab 2027 abschaffen (nicht beschlossen), deshalb ab 2030 der Marktwert, Annahme 3–5 ct (hier 4 ct). Es gibt schon Anlagen (Marktstammdatenregister, Postleitzahl 98553, Stand November 2026: 635 Dachanlagen, 301 Balkonkraftwerke und 3 Freiflächenanlagen mit 749, 517 und 11 kW); sie sind hier nicht eingerechnet. Die Preise je kWp gelten für die gesamte Leistung im Jahr der Rechnung.',
        [SRC.ise, SRC.pvgis, SRC.einsp, SRC.mastr],
        true
      );
    if (t === 'energie' && v === 'park')
      return W(
        'Annahme (eine konkrete Planung für Ratscher oder Schleusingen wurde bei einer Suche im November 2026 nicht gefunden): eine Fläche von ' +
          dec(c.field.ha, 1) +
          ' ha trägt ' +
          dec(c.field.kwp / 1000, 1) +
          ' MWp (etwa 0,9 MWp je Hektar). Der Strom aus neuen Freiflächenanlagen kostet 4,1–6,9 ct/kWh (Fraunhofer ISE 2024). Gezeigt werden Investition und laufende Kosten des Betreibers; die Stadt oder das Dorf zahlt sie nicht – sie verpachtet allenfalls die Fläche. Im Marktstammdatenregister stehen für die Postleitzahl 98553 (Stand November 2026) drei Freiflächenanlagen in Betrieb (749, 517 und 11 kW, die größeren seit 2019 und 2017); für Ratscher selbst wurde keine geplante Freiflächenanlage gefunden. Der Preis fällt von 700 auf 450 €/kWp (Fraunhofer ISE: unter 460 €/kW bis 2045). Jährlich Betrieb 12 €/kWp und Pacht 2 500 €/ha (Annahme). Die Gemeinde kann mit 0,2 ct/kWh beteiligt werden (§ 6 EEG: der Betreiber „soll“ es anbieten; freiwillig, nur bei EEG-Förderung erstattet; das Thüringer Beteiligungsgesetz von 2024 gilt nur für Wind). Bis zum Bau vergehen zwei bis drei Jahre Bauleitplanung (Aufstellungsbeschluss, Bebauungsplan).',
        [SRC.ise, SRC.pvstrom, SRC.eeg6, SRC.laenderbet, SRC.mastr],
        true
      );
    if (t === 'energie' && v === 'waerme')
      return W(
        'Annahme: 55 Haushalte, 5 % heizen heute schon mit Wärmepumpe. Je Haus 25 000–40 000 € (Luft-Wasser, mit Speicher und Heizkörpern; Verbraucherzentrale RLP 02/2026; vor Förderung). Förderung: KfW 458 seit 21.07.2026 – 30 % Grundförderung, dazu Geschwindigkeitsbonus (16 %, sinkt ab 1.2.2027 alle sechs Monate um 4 Punkte) und Einkommensbonus 10/30/40 %, bei höchstens 28 000 € förderfähigen Kosten (test.de); die Förderung ist hier nicht abgezogen. Betrieb: Strom 28 ct/kWh bei Jahresarbeitszahl 3–4 gegen Öl und Gas zu 11 ct plus CO₂-Preis. Der CO₂-Preis liegt 2026 und 2027 im Korridor 55–65 €/t (BEHG), danach Annahme: etwa 100 €/t 2030, 175 €/t 2035, 300 €/t 2045 und 375 €/t 2060 (europäischer Handel für Gebäude ab 2028; unsicher). Ein Nahwärmenetz würde allein im Dorfkern lohnen (Annahme: etwa 1 MWh je Meter Trasse und Jahr als Schwelle); die Wärmeplanung der Stadt Schleusingen ist bis 30.06.2028 vorgeschrieben (§ 4 WPG) und wird zeigen, ob das Dorf dafür in Frage kommt.',
        [SRC.vzwp, SRC.kfw, SRC.behg, SRC.wpg, SRC.uba],
        true
      );
    if (t === 'klima' && (v === 'regen' || v === 'vorsorge'))
      return W(
        'Der Regen: etwa 47 mm in einer Stunde, wie er einmal in 100 Jahren fällt (KOSTRA-DWD-2020, Rasterzelle Ratscher: 47,5 mm ± 26 %; ein 20-jähriger Regen 35 mm, ein jährlicher 16 mm). Schaden Annahme: 12 Keller und Erdgeschosse × 12 000 € und 40 000 € Wege. Erwartet im Jahr: ein 20-jähriges Ereignis mit 30 % des Schadens plus das 100-jährige, mal ' +
          dec(at([1, 1.05, 1.1, 1.15, 1.2], y), 2) +
          ' (mehr starke Regen mit der Wärme, etwa +7 % Regenmenge je Grad; die Projektion für den Landkreis Hildburghausen zählt Tage mit kräftigem Regen (die nassesten 10 % der Regentage): 35 im Jahr (1961–1990), später etwa 37–39 – die Zahl der Tage ändert sich kaum, einzelne Regen können aber stärker werden; der Anstieg des Schadens ist deshalb eine Annahme, gedeckelt bei 20 %).' +
          (v === 'vorsorge'
            ? ' Vorsorge: zwei Rückhaltemulden, größerer Durchlass, Schutz an den Häusern: 80 000–180 000 € (Annahme); sie senkt den Schaden um etwa 60 %.'
            : ''),
        [SRC.kostra, SRC.rekis, SRC.klimaatlas],
        true
      );
    if (t === 'klima' && v === 'dez23')
      return W(
        'Bezugsereignis: das Hochwasser vom Dezember 2023. Die Talsperre Ratscher (Betreiber TFW) speicherte am 23. und 24. Dezember etwa 900 000 m³ und stand dabei bei 2,5 Mio. m³ (üblich 0,4–0,7 Mio.); die Talsperre Schönbrunn weiter oben hielt weitere 660 000 m³ zurück (Landtag Drs. 7/9624, 28.02.2024). Wie sich das im Dorf auswirkte, steht dort nicht – alles Weitere ist Annahme: Pegel 0,9 m über dem Bachbett im Dorf, zwei Häuser mit nassem Keller zu je 15 000 €, ein solches Ereignis etwa alle zehn Jahre, mit dem Klima häufiger. Ob sich Hochwasser an der Schleuse mit dem Klima häufiger oder stärker einstellt, ist unsicher; der Anstieg über die Jahre ist eine Annahme. Die Zahlen sind mit der Chronik und der Gemeinde zu prüfen.',
        [SRC.dez23, SRC.hnz],
        true
      );
    if (t === 'klima' && v === 'hoch')
      return W(
        'Im amtlichen Überschwemmungsgebiet (HQ100, vom Land berechnet) liegen rund 37 Gebäude ganz oder teilweise – Wohnhäuser, Scheunen, Nebengebäude (Geoproxy Thüringen, Ebene UESG). Schaden (Annahme, nachrechenbar): etwa die Hälfte Wohnhäuser, 18 × 35 000 € (flaches Wasser, Keller und Erdgeschoss), der Rest Nebengebäude, 19 × 5 000 €, zusammen 725 000 €; wie hoch das Wasser an jedem Gebäude steht, ist nicht amtlich. Erwartet im Jahr: 1 % dieses Schadens (ein hundertjährliches Hochwasser) plus 0,2 % für kleinere Hochwasser. Zum Vergleich das Hochwasser vom Dezember 2023, bei dem die Talsperre etwa 900 000 m³ zurückhielt (Drs. 7/9624).',
        [SRC.uesg, SRC.hnz, SRC.dez23],
        true
      );
    if (t === 'klima' && v === 'duerre')
      return W(
        'Annahme: 110 ha Acker und Grünland, 20 % weniger Ertrag bei 1 000 € je Hektar, dazu Wasser für die Gärten: 24 000 € in einem Dürresommer. Die Wahrscheinlichkeit pro Jahr steigt von 35 % auf 60 % (heute schon hoch: nach dem Umweltbundesamt waren 2018, 2019, 2020 und 2022 trocken, 2025 von Februar bis Mai und das Frühjahr 2026 „deutlich zu trocken“; Annahme, abgeleitet aus den Projektionen für den Landkreis Hildburghausen, Szenario RCP8.5 ohne Klimaschutz: Sommerniederschlag −6 % bis 2021–2050 und −19 % bis 2071–2100 gegen 1961–1990 (221 mm); Heiße Tage von 1 auf etwa 7 (bis 2050) und etwa 27 (bis 2100) im Jahr; Mitteltemperatur +1,9 K bzw. +4,5 K). Der Anteil an Dürresommern selbst ist nicht veröffentlicht – das ist die Annahme.',
        [SRC.rekis, SRC.ubadurre, SRC.klimaatlas],
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
          ' Der Erlös aus Käferholz ist nicht eingerechnet (der Preis schwankt stark). Hintergrund: in Thüringen fielen 2022 bis 2024 jeweils über 5 Mio. Festmeter Schadholz an, vornehmlich Fichte; auf großen Kahlflächen fehlen Samenbäume, deshalb spielt die Pflanzung eine große Rolle (Waldbericht Thüringen 2025, S. 22 und 40). Die Zahlen für die Fläche an der Klinge sind Annahmen, nicht gemessen.',
        [SRC.forst, SRC.waldwissen, SRC.waldbericht],
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
      sub:
        na || vid === 'heute'
          ? ''
          : topicId === 'wald'
            ? 'gegenüber der natürlichen Verjüngung · minus ist gut'
            : 'gegenüber „Heute“ · minus ist gut',
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
          ' g je km (Annahme, mit Vorkette; elektrisch ab 2035 deutlich weniger). Was ein Bus oder Rufbus ausstößt, steht gegen die Autofahrten, die er ersetzt. Ein schwach besetzter Bus verursacht mehr CO₂ als die Autos, die er ersetzt – das ändert sich erst, wenn er gut besetzt ist und elektrisch fährt.' +
          (v === 'ruf'
            ? ' Rufbus gerechnet: gefahrene Kleinbus-km (Leerfahrten eingerechnet) minus ersetzte Autofahrten. Drei Annahmen, jeweils als Spanne: Fahrgäste je Fahrt (1,2 – 1,8 – 3,5), Anteil Leer- und Anfahrtkilometer (+80 % – +60 % – +30 %) und der Anteil der Fahrten, die ein Auto ersetzen (25 % – 40 % – 70 %). Am meisten entscheidet die Besetzung: im günstigsten Fall (gut drei Fahrgäste) kommt etwa null heraus, typisch bleibt es bis etwa 2045 ein kleines Plus, danach mit dem E-Kleinbus ein Minus oder null. Belastbare Zahlen für Ratscher gibt es nicht.'
            : '') +
          (v === 'bank'
            ? ' Die Mitfahrbank: das Auto fährt ohnehin, ersetzt werden nur Fahrten, die sonst allein im eigenen Auto gemacht würden (Annahme: 0,6 Fahrten am Tag, 30 % davon; je Fahrt etwa 3 km).'
            : ''),
        [SRC.ubaverkehr, SRC.mvruf, SRC.ruf2],
        true
      );
    if (t === 'energie' && (v === 'dach' || v === 'park'))
      return W(
        'Strom: ' +
          Math.round(r.kwh / 1000) +
          ' MWh im Jahr (' +
          (v === 'park' ? KWH_FIELD : KWH_ROOF) +
          ' kWh je kWp und Jahr nach PVGIS für Ratscher: Süd 35° 1 011, Süd 20° 980, Ost oder West 35° etwa 820; Dächer im Dorf gemischt, deshalb ' +
          (v === 'park' ? 'Tische nach Süden' : 'Annahme 900, Spanne 815–1 010') +
          ') ersetzt Strom aus dem Netz. Der Strommix stößt heute etwa 0,34 kg CO₂ je kWh aus (UBA: 344 g im Jahr 2025), Annahme für später: ' +
          dec(EF_GRID[i], 2) +
          ' kg im Jahr ' +
          y +
          ' – das Netz wird sauberer, deshalb spart ein Modul später weniger. Module selbst: 0,04 kg/kWh über ihr Leben, das ist vom direkten Wert des Mixes abgezogen (nie unter null). Die obere Grenze der Spanne rechnet mit dem fossilen Strom, den die Module verdrängen – eigene Rechnung aus der Bilanz des Umweltbundesamts (vermiedene Emissionen geteilt durch die erzeugte Strommenge): etwa 0,7 kg je kWh heute (Annahme: sinkt mit dem Netz).',
        [SRC.ubastrom, SRC.ubaregen, SRC.pvgis],
        true
      );
    if (t === 'energie' && v === 'waerme')
      return W(
        'Wärmebedarf 20 000 kWh je Haus (Annahme). Öl und Gas: im Mittel 0,26 kg CO₂ je kWh Wärme (UBA: Heizöl 0,27, Erdgas 0,20; mit Vorkette 0,22–0,30; Holz ist hier nicht einbezogen, es würde den Vorteil verkleinern). Wärmepumpe: Strom ' +
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
        'Zwei Dinge (Zahlen für den ganzen Bestand an der Klinge): Wo die Fichten sterben und geräumt werden, wird gespeichertes CO₂ frei (etwa 300 t je Hektar im Bestand, die Hälfte davon über die Jahre; Bundeswaldinventur, Annahme) – jetzt ≈ ' +
          Math.round(N.emit) +
          ' t im Jahr, dazu fehlt die Senke des alten Bestands (≈ ' +
          Math.round(N.lostSink) +
          ' t). Dagegen binden die jungen Bäume bis zu 10 t je Hektar und Jahr, ' +
          (v === 'umbau' ? 'bei dichter Pflanzung' : 'auf einem Teil der Fläche') +
          ': ≈ ' +
          Math.round(N.sink) +
          ' t im Jahr. Das Absterben selbst (≈ ' +
          Math.round(N.emit + N.lostSink) +
          ' t im Jahr in diesem Jahr) trifft beide Varianten gleich – das ist der Käfer, nicht die Entscheidung. Deshalb werden die Varianten untereinander verglichen: die natürliche Verjüngung ist der Bezug (0), der Waldumbau steht gegen sie, minus ist gut. Die Spanne ist groß.',
        [SRC.bwi, SRC.forst],
        true
      );
    }
    return W('Dieses Szenario wird für den Ausstoß hier nicht bewertet.', [], false);
  }
  function laerm(topicId, vid, y, r, c) {
    const lvl = r.level || 0,
      n = r.houses || 0;
    let main = vid === 'heute' ? 'Referenz' : LEVEL[lvl];
    let sub = '';
    if (vid !== 'heute') {
      sub = n
        ? 'Stufe ' + lvl + ' von 4 · etwa ' + n + (n === 1 ? ' Haus' : ' Häuser') + ' betroffen'
        : 'kein Haus betroffen';
      if (topicId === 'klima') {
        main = 'kurzzeitig';
        sub = vid === 'duerre' ? 'kein Lärm' : 'Pumpen und Feuerwehr im Einsatz, kein Dauerlärm';
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
        'Ein Kleinbus hält an der Haltestelle am alten Schulhaus, vor allem abends und sonntags, ein paar Mal am Tag: Annahme zwei Häuser an der Haltestelle.',
        [],
        true
      );
    if (t === 'mobil' && v === 'takt')
      return W(
        'Zwölf Vorbeifahrten mehr am Tag (sechs Fahrten hin und zurück) an der Ortsdurchfahrt, zu den etwa 60 Busfahrten am Tag und dem übrigen Verkehr: Das erhöht den Pegel um deutlich weniger als 1 dB, also kaum hörbar (Annahme). Die TA Lärm gilt für Anlagen, nicht für Busverkehr auf öffentlichen Straßen; Annahme: etwa 14 Häuser an der Straße.',
        [],
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
      role: 'erfundene Stimme',
      lean,
      say,
    }));
  }
  function stimmung(topicId, vid) {
    const event = topicId === 'klima' && vid !== 'vorsorge';
    const V = voices(topicId, vid);
    if (vid === 'heute')
      return {
        id: 'stimmung',
        label: 'Stimmung',
        main: 'Referenz',
        sub: 'wie jetzt im Dorf',
        range: '',
        raw: { pro: 0, con: 0, neu: 0 },
        voices: [],
        why: W(
          'Die Vergleichsgröße: das Dorf, wie es heute ist. Die Stimmen bei den Varianten sind erfundene Platzhalter, keine Umfrage in Ratscher.',
          [],
          false
        ),
      };
    const pro = V.filter(x => x.lean > 0).length,
      con = V.filter(x => x.lean < 0).length,
      neu = V.length - pro - con;
    const names = V.map(x => x.name).join(', ');
    const note =
      'Das sind erfundene Beispielstimmen, Platzhalter für die eigenen Stimmen der Teilnehmenden – kein Meinungsbild und keine Person aus Ratscher.';
    if (event)
      return {
        id: 'stimmung',
        label: 'Stimmung',
        main: 'kein Votum',
        sub: 'Ereignis · ' + V.length + ' Stimmen zur Lage',
        range: '',
        event: true,
        raw: { pro: 0, con: 0, neu: V.length },
        voices: V,
        why: W(
          'Über ein Ereignis wie „' +
            variant(topicId, vid).label +
            '“ wird nicht abgestimmt; darum gibt es hier kein Votum. Die Sätze darunter zeigen, was Leute dazu sagen könnten. ' +
            note,
          [],
          true
        ),
      };
    return {
      id: 'stimmung',
      label: 'Stimmung',
      main: pro + ' dafür · ' + con + ' dagegen',
      sub: (neu ? neu + ' unentschieden · ' : '') + 'Platzhalter für Ihre Stimmen',
      range: '',
      raw: { pro, con, neu },
      voices: V,
      why: W('Gezählt werden die Beispielstimmen darunter, aus diesen Sichten: ' + names + '. ' + note, [], true),
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
