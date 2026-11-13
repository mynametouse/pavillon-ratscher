// ===================== ton-welt: the sound of the places as data and pure rules (GLKDATA) – rooms, source kinds, zones, layers, bells =====================
// Falko, 13.11.2026 23:02: „… ein atmosphärisches Soundkonzept …“ – ~23:20 chosen „Welt: alle vier“: places and time of day, room sound
// (reverb in bunker and church, muffled in the car, the phone's sound, direction audible with headphones). With closed eyes one should hear
// where one is and when it is. This module holds what can be decided without a browser (node imports it for the unit tests):
//   RAUM     the rooms of GLRAUM (grenzland/gl_raum.js): reverb time, pre-delay, damping, wet level, how the outside is heard from in there
//   ARTEN    the kinds of point sources: reference distance, roll-off, how far they are heard, the height they sound from
//   raumVon(o)            the room by the rules: a mission's zone, a vehicle with a cabin, riding along, indoors, else outdoors
//   luft(d) · dumpf(…)    air absorption (a low-pass falling with distance) · the occlusion of an outdoor source heard from a room
//   ZONEN · zoneVon(o)    the places of the mode (village, garden, forest and Klinge, reservoir, Schleusingen, Suhl, open country; prepared
//                         for chapter 2: the old border strip, the bunker) and the rule that finds the one the player is in
//   SCHICHTEN · gewichte(o)  the stereo beds and layers (day and night of each place, dawn chorus, crickets, wind, rain) and their weights
//                         by sun, month and weather
//   EINZEL · erlaubt · naechste · platz   the one-shots placed around the player (dog, tractor far off, woodpecker, crows, ducks …)
//   GLOCKEN · schlaege(h, m, art)          the bells of the real churches and how many strokes they strike at a moment
//   QUELLEN  the loops at fixed places (brooks, the waterfall in Schleusingen, fountains) · MARKT, KNEIPE (when they sound)
// Every sound is an id of the sound repository (tools/ton/quellen/klang.json → index.json, file klang/<zone>/<id>.mp3); a missing file is
// simply not heard (the base game's surroundings then stay on, grenzland/gl_klang.js).
export const GLKDATA = (() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  // ---------------- rooms ----------------
  // rt reverb time (s, −60 dB), pre the pre-delay (s), lp the damping of the impulse response (Hz: the tail darkens towards it), wet the
  // send level of the room's reverb, occF/occDb what reaches the ears from outside (a low-pass and a few dB down; 'frei': nothing)
  const RAUM = {
    frei: { rt: 1.1, pre: 0.018, lp: 5200, wet: 0.07, occF: 20000, occDb: 0, name: 'draußen' },
    auto: { rt: 0.14, pre: 0.002, lp: 3800, wet: 0.12, occF: 650, occDb: -10, name: 'im Fahrzeug' },
    innen: { rt: 0.55, pre: 0.006, lp: 5000, wet: 0.16, occF: 1000, occDb: -9, name: 'drinnen' },
    bunker: { rt: 2.4, pre: 0.022, lp: 3200, wet: 0.36, occF: 350, occDb: -22, name: 'im Bunker' },
    kirche: { rt: 3.8, pre: 0.045, lp: 4200, wet: 0.42, occF: 700, occDb: -16, name: 'in der Kirche' },
    tunnel: { rt: 2.8, pre: 0.03, lp: 2800, wet: 0.4, occF: 2600, occDb: -4, name: 'im Tunnel' },
  };
  // ---------------- kinds of point sources ----------------
  // ref: the distance (m) at which the source has its level (PannerNode 'inverse': ref / (ref + roll·(d − ref)) beyond), roll the roll-off,
  // max: farther than this it is not started at all, h: height above the ground it sounds from (m), send: share of the room's reverb
  const ARTEN = {
    stimme: { ref: 1.6, roll: 1, max: 60, h: 1.6, send: 1 },
    schritt: { ref: 1, roll: 1.2, max: 30, h: 0.1, send: 0.8 },
    tuer: { ref: 2, roll: 1, max: 70, h: 1.2, send: 1 },
    motor: { ref: 5, roll: 1, max: 700, h: 0.6, send: 0.7 },
    moped: { ref: 3, roll: 1, max: 500, h: 0.6, send: 0.7 },
    sirene: { ref: 12, roll: 0.9, max: 2500, h: 1.6, send: 0.8 },
    heli: { ref: 30, roll: 0.8, max: 3000, h: 60, send: 0.6 },
    glocke: { ref: 45, roll: 0.8, max: 4500, h: 25, send: 1.2 },
    bach: { ref: 4, roll: 1.2, max: 140, h: 0, send: 0.6 },
    wehr: { ref: 8, roll: 1.1, max: 300, h: 0, send: 0.7 },
    brunnen: { ref: 3, roll: 1.2, max: 80, h: 0.8, send: 0.7 },
    tier: { ref: 6, roll: 1, max: 450, h: 0.6, send: 0.9 },
    vogel: { ref: 8, roll: 1, max: 260, h: 8, send: 0.9 },
    hund: { ref: 8, roll: 1, max: 800, h: 0.5, send: 1 },
    traktor: { ref: 8, roll: 1, max: 1000, h: 1.2, send: 0.7 },
    radio: { ref: 2, roll: 1, max: 80, h: 1, send: 1 },
    walla: { ref: 10, roll: 1, max: 260, h: 1.6, send: 1 },
    kirmes: { ref: 16, roll: 1, max: 900, h: 2, send: 1 },
    knall: { ref: 20, roll: 0.9, max: 3000, h: 1, send: 1.2 },
    standard: { ref: 4, roll: 1, max: 500, h: 1, send: 1 },
  };
  const art = k => ARTEN[k] || ARTEN.standard;
  // ---------------- the room by the rules ----------------
  // o: { zone: a room a mission set where the player stands ('bunker' …), fahrzeug: { id, name, offen } the vehicle driven,
  //      mitfahrt: riding along in a car or a bus, innen: indoors (audio.inside(): the pavilion, buildings with KERN.area inside) }
  const ZWEIRAD = /moped|simson|schwalbe|\bs ?51\b|\bkr ?51\b|motorrad|bike|fahrrad|\brad\b|quad/i;
  const offen = v =>
    !!v && (v.offen === true || (v.offen !== false && ZWEIRAD.test(String(v.id || '') + ' ' + String(v.name || ''))));
  function raumVon(o = {}) {
    if (o.zone && RAUM[o.zone]) return o.zone;
    if (o.fahrzeug && !offen(o.fahrzeug)) return 'auto';
    if (o.mitfahrt) return 'auto';
    if (o.innen) return 'innen';
    return 'frei';
  }
  // ---------------- air and walls ----------------
  // air absorption, as a game hears it: the high frequencies fade with distance (5 m ~15 kHz, 120 m 8 kHz, 500 m 3 kHz, 2 km under 1 kHz)
  const luft = d => clamp(16000 / (1 + Math.max(0, d) / 120), 700, 20000);
  // what an outdoor source loses when it is heard from a room (the source's own room – innen: true – loses nothing)
  function dumpf(raum, quelleInnen) {
    const R = RAUM[raum] || RAUM.frei;
    if (quelleInnen || raum === 'frei') return { f: 20000, k: 1 };
    return { f: R.occF, k: Math.pow(10, R.occDb / 20) };
  }
  // the level of the inverse distance model (as the PannerNode computes it), for the reverb send and tests
  const abstand = (d, ref = 4, roll = 1) => (d <= ref ? 1 : ref / (ref + roll * (d - ref)));
  // ---------------- the places ----------------
  // bett: the place's bed by day and by night (stereo, −24 LUFS), winter: an own day bed in the cold months (else the day bed, quieter),
  // regen: what rain sounds like there, wind: what the wind blows through, frei: the outdoor room's wet level (houses, trees, the valley)
  const ZONEN = {
    dorf: {
      name: 'Dorf Ratscher',
      tag: 'dorf_tag',
      nacht: 'dorf_nacht',
      winter: 'dorf_winter',
      regen: 'regen_dach',
      wind: 'wind_baum',
      frei: 0.07,
    },
    garten: {
      name: 'Garten',
      tag: 'garten_tag',
      nacht: 'garten_nacht',
      winter: 'dorf_winter',
      regen: 'regen_blatt',
      wind: 'wind_baum',
      frei: 0.05,
    },
    wald: {
      name: 'Wald und Klinge',
      tag: 'wald_tag',
      nacht: 'wald_nacht',
      winter: 'wald_winter',
      regen: 'regen_blatt',
      wind: 'wind_wald',
      frei: 0.11,
    },
    see: {
      name: 'Talsperre Ratscher',
      tag: 'see_tag',
      nacht: 'see_nacht',
      regen: 'regen_wasser',
      wind: 'wind_feld',
      frei: 0.09,
    },
    stadt: {
      name: 'Schleusingen',
      tag: 'stadt_tag',
      nacht: 'stadt_nacht',
      regen: 'regen_pflaster',
      wind: 'wind_baum',
      frei: 0.1,
    },
    suhl: { name: 'Suhl', tag: 'suhl_tag', nacht: 'suhl_nacht', regen: 'regen_pflaster', wind: 'wind_baum', frei: 0.1 },
    land: {
      name: 'Landstraße und Feldflur',
      tag: 'land_tag',
      nacht: 'land_nacht',
      regen: 'regen_feld',
      wind: 'wind_feld',
      frei: 0.03,
    },
    // chapter 2 (prepared; missions set them with GLKLANG.zone(id) – GLRAUM.zone(name, shape, 'bunker') for the room)
    grenze: {
      name: 'Grünes Band',
      tag: 'grenze_tag',
      nacht: 'grenze_nacht',
      regen: 'regen_feld',
      wind: 'wind_feld',
      frei: 0.03,
      kap2: true,
    },
    bunker: {
      name: 'Bunker',
      tag: 'bunker_innen',
      nacht: 'bunker_innen',
      regen: '',
      wind: '',
      frei: 0,
      kap2: true,
      innen: true,
    },
  };
  // where the places are (game metres: x east, y north from the garden): the Anger, the reservoir's dam, the Klinge, the towns
  const ORTE = {
    garten: { rect: [-50, -52, 42, 48] },
    anger: [222, -108],
    klinge: [-548, -566],
    damm: [853, -817],
    schleusingen: [-1096, 1231],
    markt: [-1084.7, 1241.9],
  };
  function zuRechteck(r, x, y) {
    const dx = Math.max(r[0] - x, 0, x - r[2]),
      dy = Math.max(r[1] - y, 0, y - r[3]);
    return Math.hypot(dx, dy);
  }
  // o: { x, y, place (KERN.place), wald (FOREST.amb 0–1), seeD (m to the reservoir's shore; < 0 on the water), mission (a zone set by a
  //      mission), era } → the zone id
  function zoneVon(o = {}) {
    if (o.mission && ZONEN[o.mission]) return o.mission;
    const pl = String(o.place || ''),
      x = +o.x || 0,
      y = +o.y || 0;
    if (/Suhl/.test(pl)) return 'suhl';
    if (/Schleusingen/.test(pl) || Math.hypot(x - ORTE.schleusingen[0], y - ORTE.schleusingen[1]) < 560) return 'stadt';
    if (zuRechteck(ORTE.garten.rect, x, y) < 22) return 'garten';
    if (Number.isFinite(o.seeD) && o.seeD < 140) return 'see';
    if ((+o.wald || 0) > 0.35 || /Klinge|Wald|Forst/.test(pl)) return 'wald';
    if (/^Ratscher/.test(pl) || Math.hypot(x - ORTE.anger[0], y - ORTE.anger[1]) < 330) return 'dorf';
    return 'land';
  }
  // a new zone counts only after it held for a moment (no flapping at a border): z the state { cur, cand, t }, dt seconds
  function zoneHalten(z, roh, dt, halte = 1.5) {
    if (!z.cur) {
      z.cur = roh;
      z.cand = '';
      z.t = 0;
      return true;
    }
    if (roh === z.cur) {
      z.cand = '';
      z.t = 0;
      return false;
    }
    if (roh !== z.cand) {
      z.cand = roh;
      z.t = 0;
    }
    z.t += dt;
    if (z.t >= halte) {
      z.cur = roh;
      z.cand = '';
      z.t = 0;
      return true;
    }
    return false;
  }
  // the reservoir's shore: distance (m) to a polygon given as GEOMAN.water's x[] and y[] (negative inside)
  function polyAbstand(xs, ys, x, y) {
    let d = 1e9,
      inn = false;
    for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
      const ax = xs[j],
        ay = ys[j],
        bx = xs[i],
        by = ys[i];
      if (by > y !== ay > y && x < ((ax - bx) * (y - by)) / (ay - by) + bx) inn = !inn;
      const dx = bx - ax,
        dy = by - ay,
        L2 = dx * dx + dy * dy || 1,
        t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
      d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return inn ? -d : d;
  }
  // ---------------- beds and layers ----------------
  // mono: the file is mono (half the memory); every layer is a seamless loop (the pipeline checks the seam), −24 LUFS
  const SCHICHTEN = {
    dorf_tag: {
      zone: 'dorf',
      was: 'Dorf am Tag: Vögel in den Gärten, fern ein Hund, ein Moped, Stimmen über den Zaun',
    },
    dorf_nacht: { zone: 'dorf', was: 'Dorf bei Nacht: still, fern die Landstraße, ein Hund, Blätter' },
    dorf_winter: { zone: 'dorf', was: 'Dorf im Winter: kalt und still, Krähen, Wind um die Häuser' },
    garten_tag: { zone: 'garten', was: 'Garten am Dorfrand: Vögel, Insekten, das Feld nebenan' },
    garten_nacht: { zone: 'garten', was: 'Garten bei Nacht: der Bach, Blätter, ganz fern ein Auto' },
    wald_tag: { zone: 'wald', was: 'Mischwald an der Klinge: Finken, Meisen, Rauschen in den Kronen' },
    wald_nacht: { zone: 'wald', was: 'Wald bei Nacht: Knacken, Rauschen, sehr still' },
    wald_winter: { zone: 'wald', was: 'Wald im Winter: Wind in Fichten, vereinzelt Meisen' },
    see_tag: { zone: 'see', was: 'Ufer der Talsperre: Wellen am Ufer, Enten, Wind übers Wasser' },
    see_nacht: { zone: 'see', was: 'Talsperre bei Nacht: leises Plätschern, Frösche im Sommer' },
    stadt_tag: { zone: 'stadt', was: 'Kleinstadt am Tag: Schritte, Stimmen, Autos in der Nähe, Tauben' },
    stadt_nacht: { zone: 'stadt', was: 'Kleinstadt bei Nacht: ein Auto, Schritte, Lüftungen' },
    suhl_tag: { zone: 'suhl', was: 'Stadt am Tag: Verkehr, Busse, viele Stimmen' },
    suhl_nacht: { zone: 'suhl', was: 'Stadt bei Nacht: fern der Verkehr, ein Bus, Hall zwischen Häusern' },
    land_tag: { zone: 'land', was: 'Offene Feldflur: Lerchen im Sommer, Wind im Getreide, fern die Landstraße' },
    land_nacht: { zone: 'land', was: 'Feldflur bei Nacht: Wind, fern ein Auto, sehr weit' },
    grenze_tag: { zone: 'grenze', was: 'Grünes Band (Kapitel 2): weit, still, Wind, Lerchen, keine Straße' },
    grenze_nacht: { zone: 'grenze', was: 'Grünes Band bei Nacht (Kapitel 2): Wind über offenem Land' },
    bunker_innen: { zone: 'bunker', mono: true, was: 'Bunker (Kapitel 2): Brummen, Tropfen, Lüftung' },
    morgen: { was: 'Morgenchor der Vögel (Frühjahr und Sommer, Dämmerung)' },
    grillen: { mono: true, was: 'Feldgrillen in Sommernächten' },
    wind_baum: { was: 'Wind in Laubbäumen (nach dem Wetter, mit Böen)' },
    wind_wald: { was: 'Wind in den Kronen des Waldes (nach dem Wetter, mit Böen)' },
    wind_feld: { was: 'Wind über offenem Feld und Wasser (nach dem Wetter, mit Böen)' },
    regen_blatt: { was: 'Regen auf Blättern' },
    regen_dach: { was: 'Regen auf Dächern und in Rinnen' },
    regen_pflaster: { was: 'Regen auf Pflaster, Rinnsteine, Pfützen' },
    regen_wasser: { was: 'Regen auf der Wasserfläche' },
    regen_feld: { was: 'Regen über Feld und Wiese' },
    regen_auto: { was: 'Regen auf dem Autodach (im Fahrzeug)' },
  };
  // the day share from the sun's elevation (°): 0 at night, 1 by day (dusk from −6° to +4°)
  const tagAnteil = sunEl => sstep(-6, 4, sunEl);
  // the cold months: 1 in Dec–Feb, ½ in Nov and Mar
  const winterAnteil = m => (m === 12 || m <= 2 ? 1 : m === 11 || m === 3 ? 0.5 : 0);
  // rain as heard (as the weather's own sound: a drizzle is a whisper, from 1.5 mm/h it pours)
  const regenPegel = (rain, drizzle) =>
    rain > 0.03 ? clamp(0.22 + 0.24 * Math.log2(1 + rain), 0, 1) * (drizzle ? 0.45 : 1) : 0;
  // o: { zone, sunEl, morgens (before noon), monat 1–12, regen mm/h, niesel, wind m/s, boe m/s, gewitter, raum, schnee cm/h } →
  //    { schicht: weight 0–1.2 }, only the ones that sound (weight > 0)
  function gewichte(o = {}) {
    const Z = ZONEN[o.zone] || ZONEN.land,
      W = {},
      add = (k, v) => {
        if (k && v > 0.002) W[k] = Math.min(1.2, (W[k] || 0) + v);
      };
    const tag = tagAnteil(Number.isFinite(o.sunEl) ? o.sunEl : 30),
      m = clamp(Math.round(o.monat || 6), 1, 12),
      win = winterAnteil(m),
      rain = Math.max(0, +o.regen || 0),
      lr = regenPegel(rain, o.niesel),
      wind = Math.max(0, +o.wind || 0),
      // birds fall silent in rain, snow, a storm and a gale (as the weather tells the game's own surroundings)
      voegel =
        (o.gewitter ? 0 : 1) *
        (1 - 0.95 * clamp(rain / 1.5, 0, 1)) *
        (1 - 0.6 * clamp((+o.schnee || 0) / 0.5, 0, 1)) *
        (1 - 0.6 * clamp((wind - 8) / 6, 0, 1));
    if (Z.innen) add(Z.tag, 1);
    else {
      // the place by day: its own winter bed in the cold months where one exists, else the day bed with fewer birds
      const tagBett = tag * voegel;
      if (Z.winter && win > 0) {
        add(Z.tag, tagBett * (1 - win));
        add(Z.winter, tag * win);
      } else add(Z.tag, tagBett * (1 - 0.55 * win));
      // the night bed fills in at night and where the birds fell silent by day
      add(Z.nacht, Math.max(1 - tag, tag * (1 - voegel) * 0.8));
      // the dawn chorus: in the morning twilight (sun −8° … +8°), March to July, strongest April–June, birds as the weather lets them
      const saison = m >= 4 && m <= 6 ? 1 : m === 3 || m === 7 ? 0.55 : m === 8 ? 0.2 : 0;
      const daemmer = sstep(-9, -4, o.sunEl) * (1 - sstep(4, 10, o.sunEl));
      if (o.morgens && !['stadt', 'suhl'].includes(o.zone)) add('morgen', daemmer * saison * voegel);
      // field crickets: summer nights (June–September, strongest in July and August), not in rain or wind, not in the towns or the forest
      const grillenZeit = m === 7 || m === 8 ? 1 : m === 6 || m === 9 ? 0.5 : 0;
      if (['dorf', 'garten', 'land', 'see', 'grenze'].includes(o.zone))
        add('grillen', (1 - tag) * grillenZeit * (1 - clamp(rain / 0.3, 0, 1)) * (1 - clamp((wind - 5) / 5, 0, 1)));
      // wind through what grows there (a breeze from 2 m/s, full from 12 m/s; the gusts move the level in gl_klang.js)
      add(Z.wind, clamp((wind - 1.5) / 10.5, 0, 1));
      // rain by its amount on what is there
      add(Z.regen, lr);
    }
    // in a cabin: the drumming on the car roof (the weather's own roof sound plays as well, wetter/wx_ton.js)
    if (o.raum === 'auto') add('regen_auto', lr);
    return W;
  }
  // ---------------- one-shots around the player ----------------
  // z: zones; h: [from, to) hours; m: months; nacht/abend/tag: when; alle: [min, max] s between two; d: [min, max] m from the player;
  // art: the source kind (GLRAUM); bewegt: it passes by (m/s); dateien: variants (ids); vol: level; era: only today ('heute')
  const EINZEL = [
    {
      id: 'hund',
      z: ['dorf', 'garten', 'land'],
      h: [6, 23],
      alle: [45, 120],
      d: [70, 320],
      art: 'hund',
      dateien: ['hund_1', 'hund_2', 'hund_3'],
      vol: 0.8,
    },
    {
      id: 'hahn',
      z: ['dorf', 'garten'],
      h: [5, 10],
      alle: [70, 200],
      d: [90, 260],
      art: 'tier',
      dateien: ['hahn_1'],
      vol: 0.7,
    },
    {
      id: 'traktor',
      z: ['dorf', 'garten', 'land'],
      h: [7, 20],
      wtag: [1, 2, 3, 4, 5, 6],
      alle: [150, 330],
      d: [260, 650],
      art: 'traktor',
      bewegt: 4.5,
      dateien: ['traktor_fern'],
      vol: 0.9,
      era: 'heute',
    },
    {
      id: 'specht',
      z: ['wald', 'garten'],
      h: [6, 18],
      m: [2, 3, 4, 5, 6, 7],
      alle: [25, 75],
      d: [30, 160],
      art: 'vogel',
      dateien: ['specht_1', 'specht_2'],
      vol: 0.8,
    },
    {
      id: 'kraehe',
      z: ['land', 'dorf', 'see', 'garten', 'grenze'],
      tag: true,
      alle: [35, 95],
      d: [60, 260],
      art: 'vogel',
      dateien: ['kraehe_1', 'kraehe_2'],
      vol: 0.7,
    },
    { id: 'ente', z: ['see'], tag: true, alle: [20, 60], d: [20, 120], art: 'vogel', dateien: ['ente_1'], vol: 0.7 },
    {
      id: 'kauz',
      z: ['wald', 'dorf', 'garten'],
      nacht: true,
      alle: [60, 190],
      d: [80, 320],
      art: 'vogel',
      dateien: ['kauz_1'],
      vol: 0.8,
    },
    {
      id: 'fuchs',
      z: ['wald', 'land', 'garten'],
      nacht: true,
      m: [10, 11, 12, 1, 2, 3],
      alle: [160, 420],
      d: [150, 500],
      art: 'tier',
      dateien: ['fuchs_1'],
      vol: 0.6,
    },
    {
      id: 'amsel',
      z: ['dorf', 'garten', 'stadt'],
      abend: true,
      m: [3, 4, 5, 6, 7],
      alle: [22, 55],
      d: [18, 70],
      art: 'vogel',
      dateien: ['amsel_1', 'amsel_2'],
      vol: 0.8,
    },
    {
      id: 'lerche',
      z: ['land', 'grenze'],
      tag: true,
      m: [3, 4, 5, 6, 7],
      alle: [30, 80],
      d: [40, 140],
      art: 'vogel',
      dateien: ['lerche_1'],
      vol: 0.7,
    },
    {
      id: 'tuer',
      z: ['stadt', 'dorf'],
      h: [7, 22],
      alle: [25, 75],
      d: [15, 70],
      art: 'tuer',
      dateien: ['tuer_1', 'tuer_2'],
      vol: 0.8,
    },
    {
      id: 'schritte',
      z: ['stadt', 'suhl'],
      h: [7, 23],
      alle: [9, 26],
      d: [7, 26],
      art: 'schritt',
      bewegt: 1.3,
      dateien: ['schritte_pflaster'],
      vol: 0.8,
    },
    {
      id: 'tauben',
      z: ['stadt', 'suhl'],
      tag: true,
      alle: [30, 90],
      d: [10, 45],
      art: 'vogel',
      dateien: ['tauben_1'],
      vol: 0.7,
    },
    {
      id: 'auto',
      z: ['land', 'dorf'],
      h: [5, 24],
      alle: [35, 140],
      d: [60, 240],
      art: 'motor',
      bewegt: 19,
      dateien: ['auto_vorbei_1', 'auto_vorbei_2'],
      vol: 0.9,
      era: 'heute',
    },
  ];
  const inStunden = (h, r) => (r[0] <= r[1] ? h >= r[0] && h < r[1] : h >= r[0] || h < r[1]);
  // o: { zone, h (hour, float), monat, wtag (0 Sunday … 6), sunEl, abends (after noon), regen, era }
  function erlaubt(e, o = {}) {
    if (!e.z.includes(o.zone)) return false;
    if (e.era && o.era && e.era !== o.era) return false;
    const h = +o.h || 0;
    if (e.h && !inStunden(h, e.h)) return false;
    if (e.m && !e.m.includes(o.monat)) return false;
    if (e.wtag && !e.wtag.includes(o.wtag)) return false;
    const tag = tagAnteil(Number.isFinite(o.sunEl) ? o.sunEl : 30);
    if (e.nacht && tag > 0.3) return false;
    if (e.tag && tag < 0.5) return false;
    if (e.abend && !(o.abends && o.sunEl < 8 && o.sunEl > -5)) return false;
    // animals keep still in heavy rain (birds most of all)
    if ((+o.regen || 0) > 1.2 && (e.art === 'vogel' || e.art === 'tier')) return false;
    return true;
  }
  // seconds until the next of this kind (rnd: () → 0–1)
  const naechste = (e, rnd = Math.random) => e.alle[0] + rnd() * (e.alle[1] - e.alle[0]);
  // where it sounds: a bearing all round, a distance in its range; a passing one gets a heading (across the line of sight)
  function platz(e, x, y, rnd = Math.random) {
    const a = rnd() * Math.PI * 2,
      d = e.d[0] + rnd() * (e.d[1] - e.d[0]),
      px = x + Math.sin(a) * d,
      py = y + Math.cos(a) * d;
    const o = { x: px, y: py, z: art(e.art).h, d, a };
    if (e.bewegt) {
      const hd = a + (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      o.vx = Math.sin(hd) * e.bewegt;
      o.vy = Math.cos(hd) * e.bewegt;
    }
    return o;
  }
  // ---------------- bells ----------------
  // the real towers: the old school's turret in Ratscher (its bell, the clock on its four sides – world/village_props.js), St. Johannis
  // in Schleusingen (welt/schleusingen.js), the Kreuzkirche and the Hauptkirche St. Marien in Suhl (lazy/suhl/kern/tuerme.js), the
  // church of Schwarzbach (the map's label). art: 'stunde' strikes the hours, 'viertel' the quarters too; ruhe: no strokes [from, to) h
  const GLOCKEN = [
    {
      id: 'ratscher',
      name: 'Alte Schule Ratscher',
      pos: [228.7, -83.1],
      h: 9,
      art: 'stunde',
      ruhe: [22, 6],
      ton: 'glocke_klein',
      era: 'heute',
    },
    {
      id: 'johannis',
      name: 'St. Johannis, Schleusingen',
      pos: [-1246.0, 1213.2],
      h: 30,
      art: 'viertel',
      ruhe: [22, 6],
      ton: 'glocke_gross',
      viertel: 'glocke_klein',
    },
    {
      id: 'kreuzkirche',
      name: 'Kreuzkirche, Suhl',
      pos: [-4854.0, 12236.2],
      h: 26,
      art: 'viertel',
      ruhe: [22, 6],
      ton: 'glocke_gross',
      viertel: 'glocke_klein',
    },
    {
      id: 'marien',
      name: 'Hauptkirche St. Marien, Suhl',
      pos: [-4611.0, 12394.0],
      h: 23,
      art: 'stunde',
      ruhe: [22, 6],
      ton: 'glocke_gross',
      versatz: 9,
    },
    {
      id: 'schwarzbach',
      name: 'Kirche Schwarzbach',
      pos: [4115.3, -1876.8],
      h: 14,
      art: 'stunde',
      ruhe: [22, 6],
      ton: 'glocke_klein',
      versatz: 4,
    },
  ];
  // the strokes at the minute m of the hour h (0–23): [{ t: seconds after the moment, ton: 'stunde' | 'viertel' }] – empty when nothing
  // strikes. The hour: as many strokes as the clock shows (1–12, 2.6 s apart); 'viertel': 1, 2, 3 small strokes at :15, :30, :45, four
  // before the hour; nothing in the quiet hours (the stroke of the hour that ends them and the one that begins them still sound)
  function schlaege(h, m, glockenArt = 'stunde', ruhe = null) {
    h = ((Math.floor(h) % 24) + 24) % 24;
    m = Math.floor(m);
    const still = hh => ruhe && (ruhe[0] <= ruhe[1] ? hh >= ruhe[0] && hh < ruhe[1] : hh >= ruhe[0] || hh < ruhe[1]);
    const out = [];
    if (m === 0) {
      if (still(h) && h !== ruhe[0] && h !== ruhe[1]) return out;
      let t = 0;
      if (glockenArt === 'viertel') {
        for (let i = 0; i < 4; i++) out.push({ t: (t = i * 1.5), ton: 'viertel' });
        t += 3.2;
      }
      const n = h % 12 || 12;
      for (let i = 0; i < n; i++) out.push({ t: t + i * 2.6, ton: 'stunde' });
      return out;
    }
    if (glockenArt === 'viertel' && (m === 15 || m === 30 || m === 45) && !still(h))
      for (let i = 0; i < m / 15; i++) out.push({ t: i * 1.5, ton: 'viertel' });
    return out;
  }
  const stundenZahl = h => ((Math.floor(h) % 12) + 12) % 12 || 12;
  // ---------------- loops at fixed places ----------------
  // brooks, the waterfall „Slusia“ on the Schleuse in Schleusingen (OpenStreetMap, welt/schleusingen.js stadt.json), the outlet below the
  // reservoir's dam, the fountains (Ratscher's at the Anger: world/village_props.js; Schleusingen's two: stadt.json)
  const QUELLEN = [
    { id: 'klingenbach', name: 'Bach in der Klinge', pos: [-560, -590], art: 'bach', datei: 'bach_1', vol: 0.8 },
    {
      id: 'slusia',
      name: 'Wasserfall Slusia, Schleusingen',
      pos: [-851.65, 1232.36],
      art: 'wehr',
      datei: 'wehr_1',
      vol: 0.9,
    },
    { id: 'damm', name: 'Auslauf unter dem Staudamm', pos: [853, -840], art: 'wehr', datei: 'wehr_1', vol: 0.7 },
    {
      id: 'brunnen_anger',
      name: 'Dorfbrunnen Ratscher',
      pos: [191.3, -114.4],
      art: 'brunnen',
      datei: 'brunnen_1',
      vol: 0.6,
    },
    {
      id: 'brunnen_schloss',
      name: 'Brunnen in Schleusingen',
      pos: [-1340.73, 1161.52],
      art: 'brunnen',
      datei: 'brunnen_1',
      vol: 0.6,
    },
    {
      id: 'brunnen_markt',
      name: 'Brunnen in Schleusingen',
      pos: [-1296.14, 1197.34],
      art: 'brunnen',
      datei: 'brunnen_1',
      vol: 0.6,
    },
  ];
  // the weekly market on Schleusingen's Markt (an assumption of this sound: Saturday 8–12), the pubs in the evening (Fri and Sat busier)
  const MARKT = { pos: ORTE.markt, r: 40, wtag: [6], h: [8, 12], walla: 'walla_markt', vol: 0.9 };
  const KNEIPE = {
    h: [17, 24],
    wtag: [0, 1, 2, 3, 4, 5, 6],
    voll: [5, 6],
    walla: 'walla_kneipe',
    tuer: 'tuer_kneipe',
    vol: 0.8,
  };
  // the fair (grenzland/gl_ereignis.js 'kirmes'): brass, a ride, the crowd round the tree and the stall
  const KIRMES = [
    { id: 'blasmusik', datei: 'kirmes_blasmusik', art: 'kirmes', dx: 6, dy: 4, vol: 0.9 },
    { id: 'karussell', datei: 'kirmes_karussell', art: 'kirmes', dx: -12, dy: 7, vol: 0.6 },
    { id: 'leute', datei: 'walla_kirmes', art: 'walla', dx: 0, dy: -3, vol: 0.9 },
  ];
  const marktOffen = (wtag, h) => MARKT.wtag.includes(wtag) && h >= MARKT.h[0] && h < MARKT.h[1];
  const kneipeOffen = (wtag, h) => h >= KNEIPE.h[0] && h < KNEIPE.h[1];
  // every sound id this module may ask for (for the manifest's check in the unit test)
  function ids() {
    const s = new Set(Object.keys(SCHICHTEN));
    for (const e of EINZEL) for (const d of e.dateien) s.add(d);
    for (const g of GLOCKEN) {
      s.add(g.ton);
      if (g.viertel) s.add(g.viertel);
    }
    for (const q of QUELLEN) s.add(q.datei);
    for (const k of KIRMES) s.add(k.datei);
    s.add(MARKT.walla);
    s.add(KNEIPE.walla);
    s.add(KNEIPE.tuer);
    return [...s].sort();
  }
  return {
    RAUM,
    ARTEN,
    art,
    offen,
    raumVon,
    luft,
    dumpf,
    abstand,
    ZONEN,
    ORTE,
    zoneVon,
    zoneHalten,
    polyAbstand,
    SCHICHTEN,
    tagAnteil,
    winterAnteil,
    regenPegel,
    gewichte,
    EINZEL,
    erlaubt,
    naechste,
    platz,
    GLOCKEN,
    schlaege,
    stundenZahl,
    QUELLEN,
    MARKT,
    KNEIPE,
    KIRMES,
    marktOffen,
    kneipeOffen,
    ids,
    clamp,
    sstep,
  };
})();
if (typeof window !== 'undefined') window.GLKDATA = GLKDATA;
