// @ts-check
// ===================== feat/mehrspieler: the pure part of playing together – codes, avatars, checks of what comes in, hide and seek (NETZLOGIK) =====================
// Falko, 17.11.2026 20:30–21:21: „Ein Konzept für einen Mehrspieler-Modus, wo man auch andere Spieler sieht, mit eigenen Avataren“, then
// „erste funktionsfähige Version umsetzen, die dann später erweitert werden kann“ (concept: docs/plans/plan_mehrspieler.md). Everything
// here is plain data and functions – no browser, no three.js – so node tests it (viz3/test/unit/netz.test.mjs); netz/netz*.js use it.
//   NETZLOGIK.newCode() · clean(code) · cleanName(name)                                         room codes and names
//   NETZLOGIK.BASEN · OBER · UNTER · SCHUH · MUSTER_O · MUSTER_U · HUETE · FARBEN                  what an avatar is made of
//   NETZLOGIK.avDefault(name?) · avRandom(rnd) · avClean(av) · avKleid(av) · avHut(av) · avBase(av)  the avatar's plan (a few small numbers)
//   NETZLOGIK.hiClean(d) · stClean(d) · evClean(d)                                               what another browser sends: checked, or null
//   NETZLOGIK.vsNew/vsStep/vsFound/vsLeave/vsWire/vsFromWire/vsCanFind/vsNext                  hide and seek („Verstecken im Dorf“)
export const NETZLOGIK = (() => {
  const PROTO = 1; // the messages' version – a browser with another one is told to reload
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = (rnd = Math.random) =>
    Array.from({ length: 6 }, () => ALPHA[Math.floor(rnd() * ALPHA.length)]).join('');
  const clean = (/** @type {any} */ c) =>
    String(c || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
  // a name as others will read it: no control characters, no angle brackets, one space, at most 20 letters
  const cleanName = (/** @type {any} */ n) =>
    String(n || '')
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20);
  const fin = (/** @type {any} */ v) => typeof v === 'number' && Number.isFinite(v);
  const num = (/** @type {any} */ v, lo = -1e5, hi = 1e5) => (fin(v) && v >= lo && v <= hi ? v : null);
  const int = (/** @type {any} */ v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);

  // ---- what an avatar is made of: a figure, the colours of its clothes, a hat, glasses ----
  // the three of the game as they are (haupt), and the ten people of the streets (verkehr/verkehr_leute.js, Rocketbox, MIT) as bases whose
  // clothes take the colours one picks (grenzland/gl_fig.js GLFIG.dress); heights as the traffic has them
  const BASEN = [
    { k: 'm', name: 'Falko', g: 'm', h: 1.8, fig: 'player_m', haupt: true },
    { k: 'f', name: 'Sarah', g: 'f', h: 1.68, fig: 'player_f', haupt: true },
    { k: 'c', name: 'Christoph', g: 'm', h: 1.78, fig: 'player_c', haupt: true },
    { k: 'vk_m02', name: 'Mann 1', g: 'm', h: 1.8, fig: 'vk_m02' },
    { k: 'vk_m07', name: 'Mann 2', g: 'm', h: 1.78, fig: 'vk_m07' },
    { k: 'vk_m11', name: 'Mann 3', g: 'm', h: 1.79, fig: 'vk_m11' },
    { k: 'vk_m16', name: 'Mann 4', g: 'm', h: 1.8, fig: 'vk_m16' },
    { k: 'vk_m20', name: 'Mann 5', g: 'm', h: 1.82, fig: 'vk_m20' },
    { k: 'vk_f02', name: 'Frau 1', g: 'f', h: 1.68, fig: 'vk_f02' },
    { k: 'vk_f07', name: 'Frau 2', g: 'f', h: 1.7, fig: 'vk_f07' },
    { k: 'vk_f12', name: 'Frau 3', g: 'f', h: 1.65, fig: 'vk_f12' },
    { k: 'vk_f14', name: 'Frau 4', g: 'f', h: 1.64, fig: 'vk_f14' },
    { k: 'vk_f15', name: 'Frau 5', g: 'f', h: 1.67, fig: 'vk_f15' },
  ];
  const BI = Object.fromEntries(BASEN.map((b, i) => [b.k, i]));
  // colours as sRGB 0–255 (GLFIG.dress keeps each cloth pixel's own light and shade and gives it this colour)
  const OBER = [
    { n: 'Rot', rgb: [176, 40, 36] },
    { n: 'Dunkelblau', rgb: [36, 52, 92] },
    { n: 'Hellblau', rgb: [104, 146, 196] },
    { n: 'Grün', rgb: [62, 110, 70] },
    { n: 'Gelb', rgb: [214, 170, 40] },
    { n: 'Orange', rgb: [208, 106, 38] },
    { n: 'Grau', rgb: [120, 122, 126] },
    { n: 'Schwarz', rgb: [30, 30, 34] },
    { n: 'Weiß', rgb: [232, 230, 224] },
    { n: 'Lila', rgb: [110, 70, 130] },
    { n: 'Braun', rgb: [110, 76, 52] },
    { n: 'Pink', rgb: [210, 90, 140] },
  ];
  const UNTER = [
    { n: 'Jeansblau', rgb: [52, 66, 92] },
    { n: 'Hellblau', rgb: [96, 120, 156] },
    { n: 'Schwarz', rgb: [28, 28, 32] },
    { n: 'Grau', rgb: [96, 98, 104] },
    { n: 'Beige', rgb: [170, 150, 120] },
    { n: 'Braun', rgb: [92, 70, 52] },
    { n: 'Oliv', rgb: [82, 88, 58] },
    { n: 'Rot', rgb: [130, 40, 40] },
  ];
  const SCHUH = [
    { n: 'Dunkel', rgb: [36, 32, 30] },
    { n: 'Weiß', rgb: [230, 230, 226] },
    { n: 'Braun', rgb: [96, 62, 38] },
  ];
  // patterns of grenzland/gl_fig.js MUSTER ('' = plain)
  const MUSTER_O = [
    { k: '', n: 'Glatt' },
    { k: 'karo', n: 'Kariert' },
    { k: 'streifen', n: 'Gestreift' },
    { k: 'strick', n: 'Strick' },
    { k: 'leder', n: 'Leder' },
    { k: 'steppung', n: 'Gesteppt' },
  ];
  const MUSTER_U = [
    { k: '', n: 'Glatt' },
    { k: 'stonewash', n: 'Jeans' },
    { k: 'cord', n: 'Cord' },
  ];
  // headwear of grenzland/gl_fig.js HUTC ('' = none)
  const HUETE = [
    { k: '', n: 'Kein Hut' },
    { k: 'basecap', n: 'Basecap' },
    { k: 'strick', n: 'Mütze' },
    { k: 'strickblau', n: 'Mütze blau' },
    { k: 'schieber', n: 'Schiebermütze' },
    { k: 'hut', n: 'Hut' },
    { k: 'kopftuch', n: 'Kopftuch' },
  ];
  // the player's own colour: the name over the head, the ring when pointing, the dot in the list
  const FARBEN = [
    { n: 'Rot', css: '#e0533d' },
    { n: 'Orange', css: '#ef9a1c' },
    { n: 'Grün', css: '#3fa34d' },
    { n: 'Blau', css: '#2f88d8' },
    { n: 'Lila', css: '#8e5cc8' },
    { n: 'Pink', css: '#d64f9a' },
    { n: 'Türkis', css: '#1fa5a3' },
    { n: 'Grau', css: '#7d8590' },
  ];
  // ---- the plan: { b: base key, o/om: top colour/pattern, u/um: trousers colour/pattern, s: shoes, h: hat, br: glasses, ba: moustache,
  // c: player colour } – small numbers, so it travels in every greeting
  const avDefault = (/** @type {string} */ fig = 'm') =>
    avClean({ b: BI[fig] !== undefined ? fig : 'm', o: 1, u: 0, s: 0, c: 3 });
  function avRandom(rnd = Math.random) {
    const pick = (/** @type {number} */ n) => Math.floor(rnd() * n) % n;
    const b = BASEN[3 + pick(BASEN.length - 3)];
    return avClean({
      b: b.k,
      o: pick(OBER.length),
      om: rnd() < 0.6 ? 0 : pick(MUSTER_O.length),
      u: pick(UNTER.length),
      um: rnd() < 0.5 ? 1 : pick(MUSTER_U.length),
      s: pick(SCHUH.length),
      h: rnd() < 0.5 ? 0 : pick(HUETE.length),
      br: rnd() < 0.25 ? 1 : 0,
      ba: b.g === 'm' && rnd() < 0.2 ? 1 : 0,
      c: pick(FARBEN.length),
    });
  }
  function avClean(/** @type {any} */ a) {
    a = a && typeof a === 'object' ? a : {};
    const b = typeof a.b === 'string' && BI[a.b] !== undefined ? a.b : 'm';
    const base = BASEN[BI[b]];
    return {
      b,
      o: int(a.o, OBER.length),
      om: int(a.om, MUSTER_O.length),
      u: int(a.u, UNTER.length),
      um: int(a.um, MUSTER_U.length),
      s: int(a.s, SCHUH.length),
      h: int(a.h, HUETE.length),
      br: a.br ? 1 : 0,
      ba: a.ba && base.g === 'm' ? 1 : 0,
      c: int(a.c, FARBEN.length),
    };
  }
  const avBase = (/** @type {any} */ a) => BASEN[BI[avClean(a).b]];
  // the clothes for GLFIG.dress (grenzland/gl_data.js KLEID format) – null for the three of the game, they stay as they are
  function avKleid(/** @type {any} */ a) {
    const v = avClean(a);
    if (avBase(v).haupt) return null;
    /** @type {any} */
    const K = { ober: OBER[v.o].rgb.slice(), unter: UNTER[v.u].rgb.slice(), schuh: SCHUH[v.s].rgb.slice(), arm: true };
    if (MUSTER_O[v.om].k) K.oberM = MUSTER_O[v.om].k;
    if (MUSTER_U[v.um].k) K.unterM = MUSTER_U[v.um].k;
    return K;
  }
  // the hat (a key of GLFIG's HUTC) and the head things – nothing on the three of the game
  function avHut(/** @type {any} */ a) {
    const v = avClean(a);
    if (avBase(v).haupt) return { hut: '', brille: '', bart: '' };
    return { hut: HUETE[v.h].k, brille: v.br ? 'gross' : '', bart: v.ba ? 'schnauzer' : '' };
  }
  const avSame = (/** @type {any} */ a, /** @type {any} */ b) =>
    JSON.stringify(avClean(a)) === JSON.stringify(avClean(b));

  // ---- what comes in: checked field by field; anything odd makes it null (never the page – lesson V16b5, NaN is no "no") ----
  const ID = /^[A-Za-z0-9_-]{1,32}$/;
  function hiClean(/** @type {any} */ d) {
    if (!d || typeof d !== 'object') return null;
    const pid = typeof d.pid === 'string' && ID.test(d.pid) ? d.pid : null;
    if (!pid) return null;
    return {
      pid,
      name: cleanName(d.name) || 'Mitspieler',
      av: avClean(d.av),
      role: d.role === 'host' ? 'host' : 'gast',
      v: Number.isInteger(d.v) ? d.v : 0,
      build: typeof d.build === 'string' ? d.build.slice(0, 40) : '',
    };
  }
  const STANDS = ['stand', 'crouch', 'crawl', 'prone'];
  function stClean(/** @type {any} */ d) {
    if (!d || typeof d !== 'object') return null;
    const x = num(d.x),
      y = num(d.y),
      z = num(d.z, -500, 5000),
      yaw = num(d.yaw, -1e6, 1e6);
    if (x === null || y === null || z === null || yaw === null) return null;
    /** @type {any} */
    const o = {
      x,
      y,
      z,
      yaw: ((yaw % 360) + 360) % 360,
      sp: num(d.sp, 0, 200) || 0,
      stn: STANDS.includes(d.stn) ? d.stn : 'stand',
      air: !!d.air,
      jet: !!d.jet,
      sit: null,
      car: null,
      inn: Number.isInteger(d.inn) && d.inn > 0 ? d.inn : null,
    };
    if (d.sit && typeof d.sit === 'object') {
      const sx = num(d.sit.x),
        sy = num(d.sit.y),
        sz = num(d.sit.z, -500, 5000);
      if (sx !== null && sy !== null && sz !== null && (d.sit.k === 'sit' || d.sit.k === 'lie'))
        o.sit = { k: d.sit.k, x: sx, y: sy, z: sz };
    }
    if (d.car && typeof d.car === 'object' && typeof d.car.id === 'string' && ID.test(d.car.id)) {
      const cx = num(d.car.x),
        cy = num(d.car.y),
        psi = num(d.car.psi, -1e4, 1e4),
        u = num(d.car.u, -200, 200);
      if (cx !== null && cy !== null && psi !== null) o.car = { id: d.car.id, x: cx, y: cy, psi, u: u || 0 };
    }
    return o;
  }
  const RATES = ['real', 'min', 'fast'];
  const PINGS = ['hier', 'haus', 'fahrzeug', 'person'];
  const GESTEN = ['winken', 'nicken', 'kopf', 'achsel', 'zeigen'];
  function evClean(/** @type {any} */ d) {
    if (!d || typeof d !== 'object' || typeof d.k !== 'string') return null;
    const k = d.k.slice(0, 16);
    if (k === 'uhr') {
      const t = num(d.t, -1e9, 1e9);
      if (t === null) return null;
      return { k, t, rate: RATES.includes(d.rate) ? d.rate : null, e0: num(d.e0, -1e7, 1e7) };
    }
    if (k === 'ping') {
      const x = num(d.x),
        y = num(d.y),
        z = num(d.z, -500, 5000);
      if (x === null || y === null || z === null) return null;
      return { k, x, y, z, art: PINGS.includes(d.art) ? d.art : 'hier', txt: cleanName(d.txt).slice(0, 20) };
    }
    if (k === 'geste') {
      if (!GESTEN.includes(d.art)) return null;
      return { k, art: d.art };
    }
    if (k === 'spiel') {
      if (d.g !== 'vs' || !d.d || typeof d.d !== 'object') return null;
      return { k, g: 'vs', d: d.d };
    }
    if (k === 'bye') return { k };
    if (k.startsWith('x:') && /^x:[a-z0-9_-]{1,14}$/.test(k)) return Object.assign({}, d, { k }); // other modules' messages (NETZ.tell)
    return null;
  }

  // ---- hide and seek („Verstecken im Dorf“): the host keeps the round, the others get it as it is with the seconds left ----
  // phases: 'zaehlen' (the seeker counts, eyes shut, the others hide), 'suchen', 'ende'
  const VS = { zaehlen: 30, suchen: 300, nah: 3, hoch: 2.5 };
  function vsNew(/** @type {string[]} */ pids, /** @type {string} */ seeker, /** @type {number} */ now, o = {}) {
    const zs = fin(o.zaehlen) ? Math.max(5, Math.min(120, o.zaehlen)) : VS.zaehlen,
      ss = fin(o.suchen) ? Math.max(30, Math.min(1200, o.suchen)) : VS.suchen;
    const hiders = pids.filter(p => p !== seeker);
    return {
      v: 1,
      n: (o.n || 0) + 1,
      phase: 'zaehlen',
      seeker,
      hiders,
      found: /** @type {{ pid: string, s: number }[]} */ ([]),
      tZ: now + zs * 1000,
      tS: now + (zs + ss) * 1000,
      t0: now,
      end: /** @type {null | { alle: boolean, weg: boolean, s: number }} */ (null),
    };
  }
  // the clock moves the round on (now: the host's ms)
  function vsStep(/** @type {any} */ st, /** @type {number} */ now) {
    if (!st || st.phase === 'ende') return st;
    if (st.phase === 'zaehlen' && now >= st.tZ) st.phase = 'suchen';
    if (st.phase === 'suchen') {
      const all = st.hiders.length > 0 && st.found.length >= st.hiders.length;
      if (all || now >= st.tS || !st.hiders.length) {
        st.phase = 'ende';
        st.end = { alle: all, weg: false, s: Math.round((now - st.tZ) / 1000) };
      }
    }
    return st;
  }
  function vsFound(/** @type {any} */ st, /** @type {string} */ pid, /** @type {number} */ now) {
    if (!st || st.phase !== 'suchen' || !st.hiders.includes(pid) || st.found.some(f => f.pid === pid)) return false;
    st.found.push({ pid, s: Math.max(0, Math.round((now - st.tZ) / 1000)) });
    vsStep(st, now);
    return true;
  }
  // somebody left: out of the round; the seeker gone ends it
  function vsLeave(/** @type {any} */ st, /** @type {string} */ pid, /** @type {number} */ now) {
    if (!st || st.phase === 'ende') return st;
    if (st.seeker === pid) {
      st.phase = 'ende';
      st.end = { alle: false, weg: true, s: Math.round((now - st.tZ) / 1000) };
      return st;
    }
    st.hiders = st.hiders.filter((/** @type {string} */ p) => p !== pid);
    st.found = st.found.filter((/** @type {any} */ f) => f.pid !== pid);
    return vsStep(st, now);
  }
  // on the wire: the seconds left instead of the host's clock
  function vsWire(/** @type {any} */ st, /** @type {number} */ now) {
    if (!st) return null;
    const left = st.phase === 'zaehlen' ? st.tZ - now : st.phase === 'suchen' ? st.tS - now : 0;
    return {
      v: 1,
      n: st.n,
      phase: st.phase,
      seeker: st.seeker,
      hiders: st.hiders.slice(),
      found: st.found.map((/** @type {any} */ f) => ({ pid: f.pid, s: f.s })),
      rest: Math.max(0, Math.round(left / 100) / 10),
      suchen: Math.round((st.tS - st.tZ) / 1000),
      end: st.end ? { alle: !!st.end.alle, weg: !!st.end.weg, s: st.end.s } : null,
    };
  }
  // ... and back, in the receiver's own clock (now: its ms); null when it is not a round
  function vsFromWire(/** @type {any} */ w, /** @type {number} */ now) {
    if (!w || typeof w !== 'object' || w.v !== 1) return null;
    if (!['zaehlen', 'suchen', 'ende'].includes(w.phase)) return null;
    const ok = (/** @type {any} */ p) => typeof p === 'string' && ID.test(p);
    if (!ok(w.seeker) || !Array.isArray(w.hiders) || !w.hiders.every(ok) || w.hiders.length > 16) return null;
    if (!Array.isArray(w.found) || w.found.length > 16 || !w.found.every((/** @type {any} */ f) => f && ok(f.pid)))
      return null;
    const rest = num(w.rest, 0, 4000) || 0,
      suchen = num(w.suchen, 0, 4000) || VS.suchen;
    const tZ =
      w.phase === 'zaehlen' ? now + rest * 1000 : w.phase === 'suchen' ? now + rest * 1000 - suchen * 1000 : now;
    return {
      v: 1,
      n: Number.isInteger(w.n) ? w.n : 1,
      phase: w.phase,
      seeker: w.seeker,
      hiders: w.hiders.slice(),
      found: w.found.map((/** @type {any} */ f) => ({ pid: f.pid, s: num(f.s, 0, 1e5) || 0 })),
      tZ,
      tS: tZ + suchen * 1000,
      t0: now,
      end:
        w.end && typeof w.end === 'object'
          ? { alle: !!w.end.alle, weg: !!w.end.weg, s: num(w.end.s, -1e5, 1e5) || 0 }
          : null,
    };
  }
  const vsLeft = (/** @type {any} */ st, /** @type {number} */ now) =>
    !st
      ? 0
      : Math.max(0, Math.ceil(((st.phase === 'zaehlen' ? st.tZ : st.phase === 'suchen' ? st.tS : now) - now) / 1000));
  // can the seeker take this one? close enough, about the same height, and both outside or in the same house (a wall between is the
  // other side of a house's door – the inside is built only for who is in)
  function vsCanFind(/** @type {any} */ s, /** @type {any} */ h) {
    if (!s || !h) return false;
    if ((s.inn || null) !== (h.inn || null)) return false;
    if (s.car || h.car) return false;
    const dz = Math.abs((s.z || 0) - (h.z || 0));
    return Math.hypot(s.x - h.x, s.y - h.y) <= VS.nah && dz <= VS.hoch;
  }
  // who seeks next: the first one found, else somebody else than this time
  function vsNext(/** @type {any} */ st, /** @type {string[]} */ pids, rnd = Math.random) {
    if (st && st.found && st.found.length && pids.includes(st.found[0].pid)) return st.found[0].pid;
    const others = pids.filter(p => !st || p !== st.seeker);
    const pool = others.length ? others : pids;
    return pool[Math.floor(rnd() * pool.length) % pool.length];
  }
  // ---- small helpers ----
  const wrapDeg = (/** @type {number} */ d) => {
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  const mmss = (/** @type {number} */ s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  return {
    PROTO,
    newCode,
    clean,
    cleanName,
    BASEN,
    OBER,
    UNTER,
    SCHUH,
    MUSTER_O,
    MUSTER_U,
    HUETE,
    FARBEN,
    avDefault,
    avRandom,
    avClean,
    avBase,
    avKleid,
    avHut,
    avSame,
    hiClean,
    stClean,
    evClean,
    GESTEN,
    VS,
    vsNew,
    vsStep,
    vsFound,
    vsLeave,
    vsWire,
    vsFromWire,
    vsLeft,
    vsCanFind,
    vsNext,
    wrapDeg,
    mmss,
  };
})();
