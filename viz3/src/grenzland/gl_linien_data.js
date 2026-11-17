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
// - In Schleusingen lorries stand at the loading doors of the supermarkets and the stores north of the old town before opening and in the
//   morning, and leave over the town's roads (LIEFER).
// Times are game minutes of the day (time/clock.js CLOCK.t mod 1440). A run is driven at a pace of game minutes when nobody sees it
// (tempo: metres per game minute) – the clock races (an hour a minute), so a vehicle near the player drives in real time from where its
// timetable put it and keeps its own pace from there (as the base game's buses do).
//   GLLDATA.FZ · FAHRTEN · PARKEN · LIEFER · ORT · SCHULE · tag(day) · faehrt(f, day) · plan(len, f) · stand(P, el) · unterwegs(t, day, len) ·
//   parkt(t, day) · tour(fz) · streife(sterne) · schulbus(m, day)
import { VNETZ } from '../verkehr/verkehr_netz.js';
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
      weg: [{ rand: [-1030, 1034] }, { p: ORT.schulbus, halt: 'Anger', warte: 6, min: 3 }, { rand: [1366, -716] }],
      von: 'Polizeiinspektion',
      nach: 'Polizeiinspektion',
      was: 'fährt ihre Runde: durch Ratscher, am Anger vorbei, Richtung Talsperre',
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
  // ---- the patrol in Schleusingen: in from the south-west, past the Markt (a short stop), the Zentralhaltestelle, out to the north ----
  const MARKT = [-1084.7, 1241.9];
  FZ.streife2 = {
    art: 'streife',
    typ: 'streife',
    o: { col: '#c9cdd2', band: '#1f4fa8', band2: '#cfe23c', bar: 'balken' },
    name: 'Streifenwagen in Schleusingen',
  };
  FAHRTEN.push({
    id: 'streife-stadt',
    fz: 'streife2',
    tage: 'taeglich',
    ab: [11 * 60 + 15, 17 * 60 + 30, 21 * 60 + 45],
    tempo: 90,
    streife: true,
    stadt: true,
    zentrum: MARKT,
    weg: [
      { stadtRand: [-1700, 800] },
      { p: MARKT, halt: 'Markt', warte: 8, min: 3 },
      { p: [-1340, 1243] },
      { stadtRand: [-800, 2000] },
    ],
    von: 'Polizeiinspektion',
    nach: 'Polizeiinspektion',
    was: 'fährt ihre Runde durch Schleusingen: am Markt vorbei, zur Zentralhaltestelle',
  });
  // ---- vans that deliver at a door: they stop at the kerb in front of it with the hazard lights on, the driver carries a box to the door
  //      and comes back. In Ratscher a parcel van (Monday to Saturday before noon: the houses of Gerhard and Katrin, 247 and 198 of
  //      world/village.js); in Schleusingen the old town's shops by the kind their name says (welt/schleusingen.js, OSM names): the bakery
  //      early, the pharmacy's wholesaler twice a day, drinks for an inn. Silver or white panel vans, no firm's name ----
  const ZUSTELL = [
    {
      id: 'paket',
      fz: 'paket',
      ab: [11 * 60 + 5],
      weg: [{ rand: [-1030, 1034] }, { haus: 247 }, { haus: 198 }, { rand: [1366, -716] }],
    },
    { id: 'z-baeck', fz: 'zbaeck', ab: [5 * 60 + 35], laden: 'Bäck|Backhaus|Bäcker', name: 'Bäckerei' },
    { id: 'z-apo', fz: 'zapo', ab: [9 * 60 + 10, 14 * 60 + 30], laden: 'Apotheke', name: 'Apotheke' },
    {
      id: 'z-getr',
      fz: 'zgetr',
      ab: [10 * 60 + 20],
      laden: 'Gaststätte|Gasthaus|Wirtshaus|Kneipe|Bierstube|Brauhaus',
      name: 'Gasthaus',
      tage: 'mo-fr',
    },
  ];
  for (const z of ZUSTELL) {
    FZ[z.fz] = {
      art: 'zustell',
      typ: 'kasten',
      o: { col: z.fz === 'paket' ? '#b9bdc1' : '#ececea' },
      name: z.fz === 'paket' ? 'Paketwagen' : 'Lieferwagen',
    };
    const halt = { halt: z.laden ? z.name : 'Haustür', warte: 30, min: 5, zustellen: true };
    FAHRTEN.push(
      z.laden
        ? {
            id: z.id,
            fz: z.fz,
            tage: z.tage || 'werktag',
            ab: z.ab,
            tempo: 70,
            stadt: true,
            zentrum: MARKT,
            weg: [{ stadtRand: [-1700, 800] }, Object.assign({ laden: z.laden }, halt), { stadtRand: [-800, 2000] }],
            von: 'Großhandel',
            nach: 'Großhandel',
            was: 'liefert an die ' + z.name + ' in der Altstadt',
          }
        : {
            id: z.id,
            fz: z.fz,
            tage: 'werktag',
            ab: z.ab,
            tempo: 75,
            weg: z.weg.map(w => (w.haus ? Object.assign({}, w, halt) : w)),
            von: 'Paketzentrum',
            nach: 'Paketzentrum',
            was: 'bringt Pakete in Ratscher',
          }
    );
  }
  // ---- deliveries in Schleusingen: a lorry at a shop's loading door (laeden.json, doors with k 'liefer'; the agent laeden-leben may
  //      add a field `anlieferung` to a shop), Monday to Saturday (lorries do not drive on Sundays in Germany), before the shop opens and
  //      in the morning. It comes in from the town's edge, drives past the yard's lane and reverses to the door, stands there from
  //      `von` to `bis`, and leaves forward the way it came. Plain white box lorries (no chain's name on them) ----
  const LIEFER = [
    { id: 'l-rewe-1', shop: 'rewe', tuer: 0, von: 5 * 60 + 15, bis: 5 * 60 + 55, kuehl: true },
    { id: 'l-rewe-2', shop: 'rewe', tuer: 0, von: 9 * 60 + 30, bis: 10 * 60 + 5 },
    { id: 'l-edeka-1', shop: 'edeka', tuer: 0, von: 6 * 60 + 5, bis: 6 * 60 + 50, kuehl: true },
    { id: 'l-edeka-2', shop: 'edeka', tuer: 0, von: 11 * 60 + 20, bis: 11 * 60 + 55 },
    { id: 'l-mega-1', shop: 'mega', tuer: 0, von: 7 * 60 + 40, bis: 8 * 60 + 30 },
    { id: 'l-mega-2', shop: 'mega', tuer: 2, von: 10 * 60 + 15, bis: 11 * 60 },
    { id: 'l-obi-1', shop: 'obi', tuer: 0, von: 7 * 60, bis: 7 * 60 + 50 },
    { id: 'l-obi-2', shop: 'obi', tuer: 1, von: 13 * 60 + 10, bis: 13 * 60 + 55 },
  ];
  // the way in from the town's edge takes some game minutes at its pace (a kilometre at 60 m a minute): it leaves the edge earlier
  const ANFAHRT = 16;
  for (const l of LIEFER) {
    FZ[l.id] = {
      art: 'liefer',
      typ: 'koffer',
      o: l.kuehl ? { col: '#ededea', col2: '#f2f2ef', kasten: 'kuehl' } : { col: '#e4e5e2', col2: '#f2f2ef' },
      name: l.kuehl ? 'Kühllaster' : 'Lieferwagen',
    };
    FAHRTEN.push({
      id: l.id,
      fz: l.id,
      tage: 'werktag',
      ab: [l.von - ANFAHRT],
      tempo: 60,
      stadt: true,
      weg: [
        { stadtRand: true },
        { rampe: [l.shop, l.tuer], halt: 'Laderampe', warte: 50, min: l.bis - l.von },
        { stadtRand: true },
      ],
      von: 'Stadtrand',
      nach: 'Stadtrand',
      was: 'liefert Ware an die Laderampe',
    });
  }
  // ---- where vehicles stand between their runs (von → bis, over midnight when bis < von); none at the moment ----
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
  return {
    ORT,
    FZ,
    FAHRTEN,
    PARKEN,
    LIEFER,
    ZUSTELL,
    SCHULE,
    tag,
    faehrt,
    plan,
    stand,
    unterwegs,
    parkt,
    tour,
    streife,
    schulbus,
    hm,
  };
})();
// ===================== feat/grenzland-strasse: a run's way over a road graph as legs – forward, and backwards into a dead end (GLLWEG), pure =====================
// A run passes its waypoints over the shortest ways (cost: time at the road's speed). A stop on a road is reached along the road it lies on;
// a stop in a dead end (a farmyard's lane, a loading door's own lane) is reached the way lorries do it: past the lane, then backwards
// into it, and out forward. Every leg is a line of verkehr/verkehr_netz.js (right-hand lane, rounded corners, speeds by road and curve).
// Unit-tested on the real road graph of the square (viz3/test/unit/grenzland_strasse.test.mjs). Used by grenzland/gl_linien.js.
//   GLLWEG.beine(G, W, lkw, vEndLast) → legs [{ line, rev, s0, L, stop }] · fertigLinie(f, legs, W, lkw) → { legs, ws, len, L, P, kehre }
//   amWeg(Lf, s) → { x, y, hd, leg, i, q } · nearestEdge(G, x, y) · teil(e, from, q, len) · cost(e) · VMAX · VLKW
export const GLLWEG = (() => {
  const hyp = Math.hypot;
  // m/s by kind: motorway, main, county, street, lane, service, track – a car as grenzland/gl_auto.js drives; a lorry over 7.5 t:
  // 60 km/h outside a village (the streets' own limit is lower in it)
  const VMAX = [27, 21, 18, 11, 8, 6, 5.5],
    VLKW = [22, 16.7, 16.7, 11, 7, 5, 4.6];
  const cost = e => e.len / (VMAX[e.kind] || 5);
  const plan = (len, f) => GLLDATA.plan(len, f);
  function nearestEdge(G, x, y) {
    let best = null;
    for (const e of G.edges) {
      const p = e.pts;
      for (let i = 0; i + 1 < p.length; i++) {
        const ax = p[i][0],
          ay = p[i][1],
          dx = p[i + 1][0] - ax,
          dy = p[i + 1][1] - ay,
          l2 = dx * dx + dy * dy || 1e-9,
          u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
          d = hyp(x - ax - dx * u, y - ay - dy * u);
        if (!best || d < best.d) best = { e, d, x: ax + dx * u, y: ay + dy * u, i, u };
      }
    }
    return best;
  }
  // ---- a run's way as legs: driven forward, or backwards (a lorry reverses into a dead end – a farmyard's lane, a loading door – and
  //      drives out forward). A leg is a line of verkehr/verkehr_netz.js; a backward leg's line runs from where it stops (the farm, the
  //      door) to where it starts (on the road past the side lane), and is driven from its end to its start, the front ahead ----
  const OPT = (lkw, vEnd) => ({
    off: e => (e.kind > 3 ? 0 : Math.max(1.1, (e.w || 5) / 4)),
    vmax: e => (lkw ? VLKW : VMAX)[e.kind] || 5,
    cut: lkw ? 7 : 5,
    aLat: lkw ? 1.5 : 2.4,
    aBrk: lkw ? 1.4 : 2.6,
    vMin: 2.2,
    vEnd,
  });
  // the points of edge e from its node `from` towards its other end, up to the point nearest q (or for len metres)
  function teil(e, from, q, len) {
    const P = e.a === from ? e.pts : e.pts.slice().reverse(),
      out = [P[0]];
    let acc = 0;
    if (q) {
      let bi = 0,
        bu = 0,
        bd = 1e9;
      for (let i = 0; i + 1 < P.length; i++) {
        const ax = P[i][0],
          ay = P[i][1],
          dx = P[i + 1][0] - ax,
          dy = P[i + 1][1] - ay,
          l2 = dx * dx + dy * dy || 1e-9,
          u = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)),
          d = hyp(q[0] - ax - dx * u, q[1] - ay - dy * u);
        if (d < bd) {
          bd = d;
          bi = i;
          bu = u;
        }
      }
      for (let i = 1; i <= bi; i++) out.push(P[i]);
      out.push([P[bi][0] + (P[bi + 1][0] - P[bi][0]) * bu, P[bi][1] + (P[bi + 1][1] - P[bi][1]) * bu]);
      return out;
    }
    for (let i = 1; i < P.length; i++) {
      const l = hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (acc + l >= len) {
        const u = (len - acc) / l;
        out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u]);
        return out;
      }
      acc += l;
      out.push(P[i]);
    }
    return out;
  }
  const stueck = (pts, e) => ({ e: { pts, kind: e.kind, w: e.w, len: 1 }, fwd: true });
  // a turn into a dead end: drive past the side lane at junction J, reverse into it to the stop Q, out forward. spur: the piece from Q to
  // J ({ pts, kind, w }); prevEdge: the edge one came to J by; nextNode: where one goes on from J. Returns the pieces of the three legs
  function wende(G, J, spur, prevEdge, nextNode) {
    // the way on past the lane: an edge at J that continues the lane's direction (a lorry backs round a corner, not a hairpin), best the
    // one it goes on by, else not the one it came by
    const P = spur.pts,
      a = P[Math.max(0, P.length - 2)],
      b = P[P.length - 1],
      hIn = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const knick = e => {
      const q = teil(e, J, null, 8),
        h = Math.atan2(q[q.length - 1][0] - q[0][0], q[q.length - 1][1] - q[0][1]);
      let d = Math.abs(h - hIn) % (2 * Math.PI);
      return d > Math.PI ? 2 * Math.PI - d : d;
    };
    const on = nextNode != null && nextNode !== J ? VNETZ.route(G, J, nextNode, cost) : null;
    const kand = G.nodes[J].edges.filter(e => e !== spur.e && e.len > 16 && knick(e) < 2.1);
    let e2 = on && on.length && kand.includes(on[0].e) && on[0].e !== prevEdge ? on[0].e : null;
    if (!e2) e2 = kand.filter(e => e !== prevEdge).sort((x, y) => knick(x) - knick(y))[0] || null;
    if (!e2) e2 = kand.sort((x, y) => knick(x) - knick(y))[0] || null;
    if (!e2) return null;
    const vor = stueck(teil(e2, J, null, 15), e2),
      rein = stueck(spur.pts, spur);
    return { vor, rein, on };
  }
  // the legs of a run on graph G from its waypoints W ({ q, n } a node to pass, { q, e } a stop on edge e; { spur } a dead end of its own)
  function beine(G, W, lkw, vEndLast) {
    const legs = [],
      deg = n => G.nodes[n].edges.length;
    let cur = [],
      pos = W[0].n,
      lastE = null;
    // a route that does not leave by the edge it came by (no turning on the spot), unless there is no other way
    const ohne =
      (...E) =>
      e =>
        E.includes(e) ? Infinity : cost(e);
    const go = (to, avoid) => {
      if (pos === to) return true;
      const p =
        VNETZ.route(G, pos, to, ohne(lastE, avoid)) ||
        VNETZ.route(G, pos, to, ohne(avoid)) ||
        VNETZ.route(G, pos, to, cost);
      if (!p) return false;
      cur.push(...p);
      lastE = p[p.length - 1].e;
      pos = to;
      return true;
    };
    const nextOf = i => (i + 1 < W.length ? (W[i + 1].n ?? (W[i + 1].e ? W[i + 1].e.a : W[i + 1].J)) : null);
    for (let i = 1; i < W.length; i++) {
      const o = W[i];
      if (o.n != null) {
        if (!go(o.n)) return null;
        continue;
      }
      // a dead end: a stop on an edge with a free end, or a door of its own (spur)
      let J = null,
        spur = null;
      if (o.spur) {
        J = o.J;
        spur = o.spur;
      } else if (o.e && (deg(o.e.a) === 1 || deg(o.e.b) === 1)) {
        J = deg(o.e.a) === 1 ? o.e.b : o.e.a;
        spur = { pts: teil(o.e, J, o.q).reverse(), kind: o.e.kind, w: o.e.w, e: o.e };
      }
      if (J != null && spur) {
        if (!go(J)) return null;
        const T = wende(G, J, spur, lastE, nextOf(i));
        if (T) {
          cur.push(T.vor);
          legs.push({ path: cur, rev: false, vEnd: 0 });
          legs.push({ path: [T.rein, T.vor], rev: true, vEnd: 0, stop: i });
          cur = [T.rein];
          lastE = spur.e || null;
          continue;
        }
      }
      // a stop along a road: both ends of its piece in the cheaper order – neither coming nor going over the piece itself
      const e = o.e,
        nx = nextOf(i),
        rc = (u, v, ...E) => {
          if (u === null || v === null || u === v) return 0;
          const p = VNETZ.route(G, u, v, ohne(...E));
          return p ? p.reduce((a, q) => a + cost(q.e), 0) : 1e9;
        },
        ab = rc(pos, e.a, e, lastE) + rc(e.b, nx, e),
        ba = rc(pos, e.b, e, lastE) + rc(e.a, nx, e);
      const [n0, n1] = ab <= ba ? [e.a, e.b] : [e.b, e.a];
      if (!go(n0, e)) return null;
      cur.push({ e, fwd: e.a === n0 });
      lastE = e;
      pos = n1;
    }
    legs.push({ path: cur, rev: false, vEnd: vEndLast });
    // the lines
    let s0 = 0;
    const out = [];
    for (const L of legs) {
      if (!L.path.length) continue;
      const line = VNETZ.line(L.path, OPT(lkw, L.vEnd));
      if (!line) return null;
      out.push({ line, rev: L.rev, s0, L: line.L, stop: L.stop ?? -1 });
      s0 += line.L;
    }
    return out.length ? out : null;
  }
  // where along the legs each waypoint lies (global metres): a reversing leg's stop at its end, the others by projection
  function wegpunkte(legs, W) {
    const ws = [0];
    let k = 0,
      loc = 0;
    for (let i = 1; i < W.length; i++) {
      const r = legs.findIndex(l => l.rev && l.stop === i);
      if (r >= 0) {
        ws.push(legs[r].s0 + legs[r].L);
        k = r + 1;
        loc = 0;
        continue;
      }
      if (i === W.length - 1) {
        const l = legs[legs.length - 1];
        ws.push(l.s0 + l.L);
        continue;
      }
      let best = null;
      for (let j = k; j < legs.length; j++) {
        if (legs[j].rev) continue;
        const pr = VNETZ.project(legs[j].line, W[i].q[0], W[i].q[1], j === k ? loc : 0, Infinity);
        if (pr && (!best || pr.d < best.d - 0.5)) best = { j, s: pr.s, d: pr.d };
        if (best && best.d < 4) break;
      }
      if (best) {
        ws.push(legs[best.j].s0 + best.s);
        k = best.j;
        loc = best.s;
      } else ws.push(ws[ws.length - 1]);
    }
    return ws;
  }
  // a turn back on itself within a leg (should not happen any more: dead ends are reversed into)
  function kehren(legs) {
    let n = 0;
    for (const l of legs) {
      const R = l.line;
      for (let i = 8; i + 8 < R.n; i += 4) {
        const h1 = Math.atan2(R.X[i] - R.X[i - 8], R.Y[i] - R.Y[i - 8]),
          h2 = Math.atan2(R.X[i + 8] - R.X[i], R.Y[i + 8] - R.Y[i]);
        let d = Math.abs(h2 - h1);
        if (d > Math.PI) d = 2 * Math.PI - d;
        if (d > 2.6) n++;
      }
    }
    return n;
  }
  function fertigLinie(f, legs, W, lkw) {
    const ws = wegpunkte(legs, W),
      len = [];
    for (let i = 1; i < ws.length; i++) len.push(Math.max(1, ws[i] - ws[i - 1]));
    const L = legs[legs.length - 1].s0 + legs[legs.length - 1].L;
    return { legs, ws, len, L, P: plan(len, f), kehre: kehren(legs), lkw };
  }
  // a global position on a run's legs: { leg, i (its index), q (along its line), x, y, hd }
  function amWeg(Lf, s, out = {}) {
    const legs = Lf.legs;
    let i = legs.length - 1;
    for (let k = 0; k < legs.length; k++)
      if (s < legs[k].s0 + legs[k].L) {
        i = k;
        break;
      }
    const l = legs[i],
      u = Math.max(0, Math.min(l.L, s - l.s0)),
      q = l.rev ? l.L - u : u,
      p = VNETZ.at(l.line, q, out);
    p.leg = l;
    p.i = i;
    p.q = q;
    return p;
  }

  // ---- the town (Schleusingen): a graph of the region's ways (welt/fahrt.js FAHRT.data.ways: { kind, hw, p (x, y, z …), n, bb }) round a
  //      point; a delivery's way to a loading door: in from the cheapest end of a main or county road, past the yard's lane, backwards to
  //      the door (R0: the lorry's place there, its front away from the door), out forward the way it came ----
  function stadtNetz(F, x, y, R = 900) {
    const ways = [];
    for (const w of F) {
      if (w.kind > 5 || !w.bb || w.bb[2] < x - R || w.bb[0] > x + R || w.bb[3] < y - R || w.bb[1] > y + R) continue;
      const q = [];
      for (let i = 0; i < w.n; i++) q.push(w.p[i * 3], w.p[i * 3 + 1]);
      ways.push({ kind: w.kind, w: w.hw * 2, p: q });
    }
    return ways.length ? VNETZ.graph(ways, { kinds: new Set([0, 1, 2, 3, 4, 5]), clip: [x, y, R] }) : null;
  }
  // a node in the middle of an edge (at X = nearestEdge's answer): the edge in two halves (the graph is the caller's own)
  function teile(G, X) {
    const e = X.e,
      n = G.nodes.length,
      L = P => P.reduce((a, q, i) => (i ? a + hyp(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0), 0),
      p1 = e.pts.slice(0, X.i + 1).concat([[X.x, X.y]]),
      p2 = [[X.x, X.y]].concat(e.pts.slice(X.i + 1));
    G.nodes.push({ x: X.x, y: X.y, c: 1, edges: [], exit: false });
    const e1 = { i: G.edges.length, a: e.a, b: n, pts: p1, len: L(p1), kind: e.kind, w: e.w },
      e2 = { i: G.edges.length + 1, a: n, b: e.b, pts: p2, len: L(p2), kind: e.kind, w: e.w };
    G.edges.push(e1, e2);
    const swap = (k, a, b) => (G.nodes[k].edges = G.nodes[k].edges.map(x => (x === a ? b : x)));
    swap(e.a, e, e1);
    swap(e.b, e, e2);
    G.nodes[n].edges = [e1, e2];
    return n;
  }
  // G: a graph of its own for this way (it gets a node where the yard's lane meets the road)
  function rampenWeg(G, R0, f) {
    // where the yard's lane meets the road: the road nearest to a point 8 m in front of the lorry (within 45 m; a node there if one is
    // within 6 m of it); the lane straight out from the door for a little over half the way, then to the road
    const fx = Math.sin(R0.hd),
      fy = Math.cos(R0.hd),
      X = nearestEdge(G, R0.x + fx * 8, R0.y + fy * 8);
    if (!X || X.d > 45) return null;
    const k = Math.max(0, Math.min(14, ((X.x - R0.x) * fx + (X.y - R0.y) * fy) * 0.55)),
      out = [R0.x + fx * k, R0.y + fy * k];
    let J = -1;
    G.nodes.forEach((n, i) => {
      if (hyp(n.x - X.x, n.y - X.y) < 6 && n.edges.length) J = i;
    });
    if (J < 0) J = teile(G, X);
    const dist = VNETZ.reach(G, J, cost);
    let ex = -1,
      best = Infinity;
    for (const big of [true, false]) {
      G.nodes.forEach((n, i) => {
        if (!n.exit || !(dist[i] < best) || i === J) return;
        if (big && !n.edges.some(e => e.kind <= 2)) return;
        best = dist[i];
        ex = i;
      });
      if (ex >= 0) break;
    }
    if (ex < 0) return null;
    const N = G.nodes[J],
      E = [G.nodes[ex].x, G.nodes[ex].y];
    const W = [
      { q: E, n: ex },
      {
        q: [R0.x, R0.y],
        J,
        spur: {
          pts:
            k > 2
              ? [[R0.x, R0.y], out, [N.x, N.y]]
              : [
                  [R0.x, R0.y],
                  [N.x, N.y],
                ],
          kind: 5,
          w: 6,
          e: null,
        },
      },
      { q: E, n: ex },
    ];
    const legs = beine(G, W, true, null);
    return legs ? Object.assign(fertigLinie(f, legs, W, true), { stadt: true, J, ex }) : null;
  }
  // a run in the town over its waypoints: { stadtRand: [x, y] } the end of a main or county road (else any road end) nearest to that
  // point, { p } a place to pass, with { halt } a stop on the road there
  function stadtWeg(G, f, lkw = false) {
    const ends = G.nodes.map((n, i) => i).filter(i => G.nodes[i].exit),
      big = ends.filter(i => G.nodes[i].edges.some(e => e.kind <= 2)),
      nah = (L, q) =>
        L.reduce(
          (b, i) =>
            b < 0 || hyp(G.nodes[i].x - q[0], G.nodes[i].y - q[1]) < hyp(G.nodes[b].x - q[0], G.nodes[b].y - q[1])
              ? i
              : b,
          -1
        );
    const W = [];
    for (const w of f.weg) {
      if (w.stadtRand) {
        const n = nah(big.length ? big : ends, w.stadtRand);
        if (n < 0) return null;
        W.push({ q: [G.nodes[n].x, G.nodes[n].y], n });
        continue;
      }
      if (w.halt) {
        const E = nearestEdge(G, w.p[0], w.p[1]);
        if (E && E.d < 60) {
          W.push({ q: [E.x, E.y], e: E.e });
          continue;
        }
      }
      W.push({
        q: w.p,
        n: nah(
          G.nodes.map((n, i) => i),
          w.p
        ),
      });
    }
    const legs = beine(G, W, lkw, null);
    return legs ? Object.assign(fertigLinie(f, legs, W, lkw), { stadt: true }) : null;
  }
  return {
    VMAX,
    VLKW,
    cost,
    nearestEdge,
    teil,
    beine,
    wegpunkte,
    kehren,
    fertigLinie,
    amWeg,
    stadtNetz,
    rampenWeg,
    stadtWeg,
  };
})();
if (typeof window !== 'undefined') window.GLLDATA = GLLDATA;
