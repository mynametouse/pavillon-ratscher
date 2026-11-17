// ===================== feat/grenzland-strasse: traffic with a purpose – vehicles, their runs and where they park (GLLDATA), pure =====================
// Falko, 17.11.2026 12:26 (chosen): „Verkehr mit Ziel“ – „Schulbus, Milchlaster, Holztransporter, Streifen mit festen Runden – und
// Krähwinkels Lkw zum Verfolgen.“ Few vehicles, each with a reason and a timetable. This file is the timetable only (no scene; unit tests
// viz3/test/unit/grenzland_strasse.test.mjs); grenzland/gl_linien.js puts the vehicles on the roads near the player.
// - The school bus is the real one: the base game's buses run the real timetable (bus/bus_fahrplan.js, gtfs.de) – on school days the
//   268 (7:02) and the 214 (7:40) leave the Schulbushaltestelle at the Anger for Schleusingen. No second bus is made here; the pupils
//   who wait for it at the shelter and get on are (SCHULE).
// - The milk lorry of an invented dairy collects the milk every morning on the farm of Uwe Bachmann by the Anger (the farmer of the
//   base game's village, dorf/dorf_text.js) and drives on to the next village.
// - The timber lorry fetches spruce logs from the pile by the forest track near the Untere Klinge on working days (Monday to Friday).
// - The patrol drives a fixed round through Ratscher, past the Anger, over the dam – only while nobody is wanted (the wanted level has
//   its own cars).
// - The lorries of the invented haulier „Spedition Krähwinkel“ (chapter 1: its yard in the fields) come to the yard to load and drive on:
//   in the morning, at noon, and late at night – tours that chapter 2 can follow (tour(fz)).
// Times are game minutes of the day (time/clock.js CLOCK.t mod 1440). A run is driven at a pace of game minutes when nobody sees it
// (tempo: metres per game minute) – the clock races (an hour a minute), so a vehicle near the player drives in real time from where its
// timetable put it and keeps its own pace from there (as the base game's buses do).
//   GLLDATA.FZ · FAHRTEN · PARKEN · ORT · SCHULE · tag(day) · faehrt(f, day) · plan(len, f) · stand(P, el) · unterwegs(t, day, len) ·
//   parkt(t, day) · tour(fz) · streife(sterne) · schulbus(m, day)
export const GLLDATA = (() => {
  // ---- places (site metres, x east, y north; the garden's slab is the origin) ----
  const ORT = {
    // the school bus stop at the old school by the Anger (BUSPLAN station „Ratscher, Schulbushaltestelle“; the shelter of
    // world/village_props.js stands at (250.6, -99.6), open to the road)
    schulbus: [247.7, -103.9],
    wartehaus: [250.6, -99.6],
    // the haulier's yard (GLDATA.ORTE.lager) and the track point before its gate
    lager: [523, 549],
    lagerTor: [533, 535],
    // the timber pile („Polter“) by the forest track at the edge of the wood near the Untere Klinge, where the timber lorry loads
    polter: [-533, -556],
    // the dam of the reservoir
    damm: [853, -817],
  };
  // ---- the vehicles: type of grenzland/gl_typen.js, paint (col the cab, col2 the body, band a stripe or the crane), lettering ----
  const FZ = {
    milch: {
      art: 'milch',
      typ: 'milchlaster',
      o: { col: '#e9ebe6', col2: '#c9ced3', band: '#2f6f9f', text: 'Molkerei Sonnenwiese' },
      name: 'Milchsammelwagen der Molkerei Sonnenwiese',
    },
    holz: { art: 'holz', typ: 'holzlaster', o: { col: '#2c5a3a', band: '#3e4a30' }, name: 'Holztransporter' },
    streife: {
      art: 'streife',
      typ: 'streife',
      o: { col: '#c9cdd2', band: '#1f4fa8', band2: '#cfe23c', bar: 'balken' },
      name: 'Streifenwagen',
    },
    k1: {
      art: 'kraehwinkel',
      typ: 'koffer',
      o: { col: '#f1f1ee', col2: '#f4f4f1', band: '#7a1f24', text: 'Spedition Krähwinkel' },
      name: 'Lkw der Spedition Krähwinkel',
    },
    k2: {
      art: 'kraehwinkel',
      typ: 'koffer',
      o: { col: '#f1f1ee', col2: '#f4f4f1', band: '#7a1f24', text: 'Spedition Krähwinkel' },
      name: 'Zweiter Lkw der Spedition Krähwinkel',
    },
  };
  // ---- the runs. weg: waypoints in order – { p: [x, y] } a place to pass; { rand: [x, y] } the square's road end nearest to that point
  //      (the vehicle comes from beyond it or goes there); { hof: id } the farmyard of a house of world/village.js (by its id);
  //      { lager: 1 } the yard's gate; with { halt: name, warte: real seconds, min: game minutes } it stops there. tage: 'taeglich' |
  //      'werktag' (Monday to Saturday) | 'mo-fr' | 'schultag'. ab: departures (minutes of the day). tempo: metres per game minute while
  //      nobody sees it. The road ends: north (299, 1062) towards Hirschbach, north-west (-1030, 1034) towards Schleusingen, west
  //      (-1030, -61), south (867, -1334), south-east (1366, -716) ----
  const FAHRTEN = [
    {
      // the farmer Uwe (dorf/dorf_text.js: „die Kühe warten nicht“) has his farm by the Anger (house 260 of world/village.js)
      id: 'milch',
      fz: 'milch',
      tage: 'taeglich',
      ab: [6 * 60 + 10],
      tempo: 70,
      weg: [
        { rand: [-1030, 1034] },
        { hof: 260, halt: 'Hof von Uwe Bachmann', warte: 25, min: 14 },
        { rand: [1366, -716] },
      ],
      von: 'Schleusingen',
      nach: 'Hinternah',
      was: 'holt die Milch auf dem Hof von Uwe Bachmann am Anger',
    },
    {
      id: 'holz',
      fz: 'holz',
      tage: 'mo-fr',
      ab: [9 * 60 + 20, 14 * 60 + 5],
      tempo: 60,
      weg: [
        { rand: [-1030, -61] },
        { p: ORT.polter, halt: 'Holzpolter an der Klinge', warte: 40, min: 35, laden: true },
        { rand: [867, -1334] },
      ],
      von: 'Sägewerk',
      nach: 'Sägewerk',
      was: 'lädt Fichtenstämme am Polter an der Klinge',
    },
    {
      id: 'streife',
      fz: 'streife',
      tage: 'taeglich',
      ab: [10 * 60 + 30, 15 * 60 + 40, 20 * 60 + 10, 23 * 60 + 30],
      tempo: 90,
      streife: true,
      weg: [
        { rand: [-1030, 1034] },
        { p: ORT.schulbus, halt: 'Anger', warte: 6, min: 3 },
        { p: ORT.damm },
        { rand: [1366, -716] },
      ],
      von: 'Polizeiinspektion',
      nach: 'Polizeiinspektion',
      was: 'fährt ihre Runde: durch Ratscher, am Anger vorbei, über die Staumauer',
    },
    {
      id: 'k1-frueh',
      fz: 'k1',
      tage: 'werktag',
      ab: [6 * 60 + 40],
      tempo: 80,
      weg: [
        { rand: [-1030, 1034] },
        { lager: 1, halt: 'Außenlager Krähwinkel', warte: 30, min: 40 },
        { rand: [1366, -716] },
      ],
      von: 'A 73, Anschlussstelle Schleusingen',
      nach: 'Richtung Eisfeld',
      was: 'lädt am Morgen im Außenlager',
    },
    {
      id: 'k1-nacht',
      fz: 'k1',
      tage: 'werktag',
      ab: [22 * 60 + 35],
      tempo: 80,
      weg: [
        { rand: [1366, -716] },
        { lager: 1, halt: 'Außenlager Krähwinkel', warte: 35, min: 25 },
        { rand: [-1030, 1034] },
      ],
      von: 'Richtung Eisfeld',
      nach: 'A 73, Anschlussstelle Schleusingen',
      was: 'kommt spät in der Nacht ans Außenlager, lädt im Dunkeln und fährt zur Autobahn',
    },
    {
      id: 'k2-tag',
      fz: 'k2',
      tage: 'werktag',
      ab: [13 * 60 + 25],
      tempo: 80,
      weg: [
        { rand: [299, 1062] },
        { lager: 1, halt: 'Außenlager Krähwinkel', warte: 25, min: 30 },
        { rand: [-1030, 1034] },
      ],
      von: 'Norden',
      nach: 'A 73, Anschlussstelle Schleusingen',
      was: 'bringt am Mittag Ware ins Außenlager',
    },
  ];
  // ---- where vehicles stand between their runs (von → bis, over midnight when bis < von); none at the moment: the haulier's lorries
  //      come and go (its yard is an outstation, they park at its depot beyond the map) ----
  const PARKEN = [];
  // ---- the pupils at the school bus stop by the Anger: the real school buses (bus/bus.js, the timetable of dist/bus/fahrplan.json, week
  //      of 16.11.2026): on school days the 268 leaves the Schulbushaltestelle at 7:02, the 214 at 7:40, both for Schleusingen (the
  //      Regelschule and the Gymnasium are there) – some pupils wait at the shelter for them ----
  const SCHULE = {
    halt: 'Ratscher, Schulbushaltestelle',
    abfahrten: [
      { linie: '268', m: 7 * 60 + 2 },
      { linie: '214', m: 7 * 60 + 40 },
    ],
    // who waits (teenagers of the Regelschule and the Gymnasium): figure, height, clothes, the bag in the hand
    leute: [
      {
        id: 'sl_schueler1',
        name: 'Schülerin',
        fig: 'vk_f12',
        h: 1.62,
        g: 'f',
        ober: [214, 110, 150],
        unter: [52, 62, 96],
      },
      { id: 'sl_schueler2', name: 'Schüler', fig: 'vk_m07', h: 1.71, g: 'm', ober: [60, 64, 72], unter: [48, 58, 86] },
      {
        id: 'sl_schueler3',
        name: 'Schülerin',
        fig: 'vk_f14',
        h: 1.58,
        g: 'f',
        ober: [236, 236, 230],
        unter: [40, 40, 44],
      },
    ],
    // they come this many minutes before the bus, and stand so far in front of the shelter (m): [along the road, out to it]
    vorher: 14,
    plaetze: [
      [-1.4, 1.6],
      [0.2, 1.9],
      [1.5, 1.4],
    ],
  };
  // the departure the pupils wait for at minute m of a school day (or null)
  function schulbus(m, day) {
    if (tag(day) !== 'schultag') return null;
    return SCHULE.abfahrten.find(a => m >= a.m - SCHULE.vorher && m <= a.m + 3) || null;
  }
  // ---- calendar: the kind of day. day: { wd (0 Monday … 6 Sunday), hol (a public holiday's name or null), ferien (school holidays) }
  //      as bus/bus_fahrplan.js BUSPLAN.day gives it ----
  function tag(day) {
    if (!day) return 'werktag';
    if (day.hol || day.wd === 6) return 'sonntag';
    if (day.wd === 5) return 'samstag';
    return day.ferien ? 'ferien' : 'schultag';
  }
  function faehrt(f, day) {
    const k = tag(day);
    if (f.tage === 'taeglich') return true;
    if (f.tage === 'werktag') return k !== 'sonntag';
    if (f.tage === 'mo-fr') return k === 'schultag' || k === 'ferien';
    if (f.tage === 'schultag') return k === 'schultag';
    return false;
  }
  // ---- a run as numbers: len[i] the metres from waypoint i to i + 1 (the world measures them on its roads) ----
  function plan(len, f) {
    const halte = f.weg.map(w => (w.halt ? w.min || 0 : 0)),
      L = len.reduce((a, b) => a + b, 0),
      fahr = L / Math.max(1, f.tempo || 60);
    return { len: len.slice(), halte, L, tempo: f.tempo || 60, dauer: fahr + halte.reduce((a, b) => a + b, 0) };
  }
  // where a run stands el game minutes after its departure: { s (m along the whole way), i (the leg it drives or the stop it waits at),
  // halt (waiting at waypoint i), fertig }
  function stand(P, el) {
    let t = Math.max(0, el),
      s = 0;
    for (let i = 0; i < P.len.length + 1; i++) {
      // the stop at waypoint i
      const h = P.halte[i] || 0;
      if (h > 0) {
        if (t < h) return { s, i, halt: true, fertig: false };
        t -= h;
      }
      if (i === P.len.length) break;
      const d = P.len[i] / P.tempo;
      if (t < d) return { s: s + t * P.tempo, i, halt: false, fertig: false };
      t -= d;
      s += P.len[i];
    }
    return { s: P.L, i: P.len.length, halt: false, fertig: true };
  }
  const dayMin = t => ((t % 1440) + 1440) % 1440;
  // the runs on the road at game time t (minutes since day 1): [{ f, ab (the departure, minutes since day 1), el }]. len(f) → the
  // legs' metres of a run (or null if it cannot be driven here); a run of yesterday evening may still be on the road after midnight
  function unterwegs(t, day, len, dayGestern) {
    const out = [],
      m = dayMin(t),
      d0 = t - m;
    for (const f of FAHRTEN) {
      const lg = len(f);
      if (!lg) continue;
      const P = plan(lg, f);
      for (const ab of f.ab)
        for (const [d, dd] of [
          [d0, day],
          [d0 - 1440, dayGestern || day],
        ]) {
          const t0 = d + ab,
            el = t - t0;
          if (el >= 0 && el < P.dauer && faehrt(f, dd)) out.push({ f, ab: t0, el, P });
        }
    }
    return out;
  }
  // the vehicles that stand somewhere now: [{ fz, wo }] (a stay over midnight began on the day before)
  function parkt(t, day, dayGestern) {
    const m = dayMin(t),
      out = [];
    for (const p of PARKEN) {
      const ueber = p.bis < p.von;
      const heute = m >= p.von && (ueber || m < p.bis) && faehrt(p, day),
        gestern = ueber && m < p.bis && faehrt(p, dayGestern || day);
      if (heute || gestern) out.push(p);
    }
    return out;
  }
  // a vehicle's day as a tour to follow (chapter 2, mission 4: Krähwinkel's lorries): [{ id, ab: 'hh:mm', von, nach, was }]
  const hm = m =>
    String(Math.floor(dayMin(m) / 60)).padStart(2, '0') + ':' + String(Math.floor(dayMin(m) % 60)).padStart(2, '0');
  function tour(fz) {
    const out = [];
    for (const f of FAHRTEN)
      if (f.fz === fz)
        for (const ab of f.ab)
          out.push({
            id: f.id,
            ab: hm(ab),
            m: ab,
            von: f.von || '',
            nach: f.nach || '',
            was: f.was || '',
            tage: f.tage,
          });
    for (const p of PARKEN)
      if (p.fz === fz)
        out.push({ id: p.fz + '-parkt', ab: hm(p.von), m: p.von, bis: hm(p.bis), wo: p.wo, was: p.was, tage: p.tage });
    return out.sort((a, b) => a.m - b.m);
  }
  // the patrol drives its round only while nobody is wanted: from the first star the wanted level's own cars take over
  const streife = sterne => !(sterne > 0);
  return { ORT, FZ, FAHRTEN, PARKEN, SCHULE, tag, faehrt, plan, stand, unterwegs, parkt, tour, streife, schulbus, hm };
})();
if (typeof window !== 'undefined') window.GLLDATA = GLLDATA;
