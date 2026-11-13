// ===================== feat/grenzland: the wanted level as pure logic (GLLOGIK) – deeds, witnesses, stars, what the police send and do =====================
// No scene, no page: unit tests in viz3/test/unit/grenzland.test.mjs (the rules) and grenzland_polizei*.test.mjs (the police on the real
// road graph, driven headless). One import: the pure street network (verkehr/verkehr_netz.js).
// The wanted level works as in GTA 6 (previews of autumn 2026): a crime counts only when somebody sees it – a passer-by, a villager, the
// police, a camera. Heat becomes stars (0 … 5); the stars are hollow until the police know who they are after (seen from close by, or a
// witness who knows the two – in the village everybody does). Out of sight the stars go one by one, faster in a hiding place and faster
// while nobody knows a name; while Falko and Sarah are apart one star less is shown. What the police send grows with the stars.
//   the rules      CRIMES, crime, stars, starsOf, tick, loseT, fade, antwort, kraefte, busse, clear, sieht
//   witnesses      melden / reif / still: a report takes a few seconds and can be talked out of; umziehen: new clothes clear a description
//   walls          waende(segs) → { frei(ax, ay, bx, by) }: line of sight against wall segments
//   roads          netz(G) → N: nah (the nearest road point), linie (a line to drive from where a car stands and faces), zeiten, exits,
//                  suchziel (where to search next), sperrstelle (where a road block goes)
//   the police     einsatz(world) → E: the patrol cars, the officers on foot, the road block, sending and leaving – E.tick(dt, p, env);
//                  the world (grenzland/gl_fahndung.js, or a test) shows what E decides
//   the helicopter heli(world) → H: flying in, circling, what it sees
import { VNETZ } from '../verkehr/verkehr_netz.js';
export const GLLOGIK = (() => {
  const hyp = Math.hypot;
  // ---- crimes: heat per witnessed deed ----
  const CRIMES = {
    rempeln: { h: 0.5, name: 'Rempelei' },
    schlag: { h: 1.1, name: 'Körperverletzung' },
    autoklau: { h: 1.3, name: 'Fahrzeugdiebstahl' },
    raserei: { h: 0.6, name: 'Raserei im Ort' },
    boeller: { h: 0.5, name: 'Böller im Ort' },
    hausfrieden: { h: 0.8, name: 'Hausfriedensbruch' },
    einbruch: { h: 1.9, name: 'Einbruch' },
    flucht: { h: 0.9, name: 'Flucht vor der Kontrolle' },
    sperre: { h: 1.4, name: 'Durchbrechen einer Sperre' },
    widerstand: { h: 1.6, name: 'Widerstand' },
    angeln: { h: 0.45, name: 'Angeln ohne Erlaubnisschein' },
    helm: { h: 0.45, name: 'Fahren ohne Helm' },
    // 1989
    kiste: { h: 1.5, name: 'Verdächtige Kiste' },
    ausweis: { h: 0.9, name: 'Der Kontrolle entzogen' },
  };
  const STEPS = [0.45, 1.5, 2.9, 4.4, 6.2]; // the heat of one … five stars
  const MAX = 7.5;
  const starsOf = h => {
    let n = 0;
    for (const s of STEPS) if (h >= s) n++;
    return n;
  };
  // the police's description of the player (see sicht below)
  const bildLeer = () => ({ wer: '', gesicht: false, kleid: '', kopf: '', fz: '', fuss: false, wo: null, hd: null });
  // look: the police have a description of the clothes; fz: they know the vehicle; offen: reports that are being made; bild: the
  // description they have (sicht / wissen below)
  const fresh = () => ({
    heat: 0,
    known: false,
    unseen: 0,
    seeT: 0,
    state: 'ruhe',
    split: false,
    calls: 0,
    log: [],
    look: false,
    fz: false,
    offen: [],
    bild: bildLeer(),
  });
  // a deed. o: { seen: witnesses who saw it, police: an officer saw it, knows: a witness knows the two by name, k: weight, t: game minute,
  // fz: the witness saw the vehicle too }
  // returns the stars gained (0: nobody saw it, or the level stays)
  function crime(W, id, o = {}) {
    const C = CRIMES[id];
    if (!C) return 0;
    const wit = Math.max(0, o.seen | 0) + (o.police ? 1 : 0);
    W.log.push({ id, t: o.t || 0, wit });
    if (W.log.length > 12) W.log.shift();
    if (!wit) return 0;
    const before = starsOf(W.heat);
    W.heat = Math.min(MAX, W.heat + C.h * (o.police ? 1.25 : 1) * (o.k > 0 ? o.k : 1));
    if (o.police || o.knows) W.known = true;
    W.look = true;
    if (o.fz) W.fz = true;
    W.unseen = 0;
    W.calls++;
    if (W.state === 'ruhe') W.state = 'gesucht';
    return starsOf(W.heat) - before;
  }
  // the stars shown: one less while the two are apart (never below one while wanted)
  const stars = W => {
    const n = starsOf(W.heat);
    return n > 1 && W.split ? n - 1 : n;
  };
  // seconds out of sight until one star goes
  const loseT = W => (22 + 8 * starsOf(W.heat)) * (W.known ? 1 : 0.6);
  // per frame. ctx: { seen: the police see the player now, close: from close by, hidden: in a hiding place, split: the two are apart,
  // hold: the police are still on their way }
  // returns an event or null: 'gesehen' | 'erkannt' | 'verloren' | 'stern' | 'entkommen'
  function tick(W, dt, ctx = {}) {
    W.split = !!ctx.split;
    if (W.state === 'ruhe' || !(dt > 0)) return null;
    let ev = null;
    if (ctx.seen) {
      W.unseen = 0;
      W.seeT += dt;
      if (W.state !== 'verfolgt') {
        W.state = 'verfolgt';
        ev = 'gesehen';
      }
      // (a helmet or a balaclava: nobody is recognised by sight – only by name)
      if (!W.known && !ctx.maske && W.seeT > (ctx.close ? 1.5 : 6)) {
        W.known = true;
        ev = 'erkannt';
      }
    } else {
      W.seeT = Math.max(0, W.seeT - dt * 2);
      if (W.state === 'verfolgt') {
        W.state = 'gesucht';
        ev = 'verloren';
      }
      // (hold: nobody of the police is there yet – the search has not begun, so it cannot run out)
      // (fremd: nothing of their description fits him any more – the search runs out sooner)
      if (!ctx.hold) W.unseen += dt * (ctx.hidden ? 1.8 : 1) * (ctx.fremd ? 1.4 : 1);
      if (W.unseen >= loseT(W)) {
        W.unseen = 0;
        const n = starsOf(W.heat);
        W.heat = n <= 1 ? 0 : STEPS[n - 2];
        if (W.heat <= 0) {
          W.state = 'ruhe';
          W.known = false;
          W.look = false;
          W.seeT = 0;
          W.bild = bildFz(W);
          ev = 'entkommen';
        } else ev = 'stern';
      }
    }
    return ev;
  }
  // the share of the search that is over (0 … 1), for the display
  const fade = W => (W.state === 'gesucht' ? Math.min(1, W.unseen / loseT(W)) : 0);
  // what the police send at n stars: patrol cars, a road block, the helicopter, special forces; seconds until the first car is there
  const antwort = n => ({
    cars: [0, 1, 2, 3, 3, 4][n] || 0,
    sperre: n >= 3,
    heli: n >= 4,
    sek: n >= 5,
    delay: [0, 38, 30, 24, 20, 16][n] || 0,
  });
  // the same in full, by the time: patrol cars, the vans of the special forces (they hunt too), the road block, the helicopter, the
  // exits of the square blocked, officers on foot (1989: the ABV, who is in the village anyway), how fast the cars drive (a factor on
  // the roads' speeds), how fast the officers walk (m/s; the player walks 2.5 and runs 4.75), how far they see by day (m)
  function kraefte(n, era = 'heute') {
    n = Math.max(0, Math.min(5, n | 0));
    const A = antwort(n);
    if (era === '1989')
      return {
        cars: n > 0 ? 1 : 0,
        vans: 0,
        sperre: false,
        heli: false,
        riegel: false,
        abv: n > 0,
        delay: Math.round(A.delay * 0.6),
        tempo: [0, 1.15, 1.2, 1.3, 1.35, 1.4][n],
        schritt: [0, 2.1, 2.2, 2.5, 2.7, 2.9][n],
        sicht: 70,
        crew: 1,
      };
    return {
      cars: [0, 1, 2, 3, 3, 3][n],
      vans: n >= 5 ? 2 : 0,
      sperre: n >= 3,
      heli: n >= 4,
      riegel: n >= 5,
      abv: false,
      delay: A.delay,
      tempo: [0, 1.25, 1.4, 1.55, 1.6, 1.7][n],
      schritt: [0, 2.15, 2.2, 3.0, 3.3, 3.6][n],
      sicht: 80,
      crew: 2,
    };
  }
  // arrested: the fine in euros (or marks), never more than one has
  const busse = (W, geld) =>
    Math.max(0, Math.min(geld | 0, Math.round((40 + 60 * starsOf(W.heat)) * (W.known ? 1 : 0.7))));
  function clear(W) {
    Object.assign(W, fresh(), { log: W.log, fz: W.fz, bild: bildFz(W) });
  }
  // a fresh description that keeps only the vehicle they have on record
  const bildFz = W => Object.assign(bildLeer(), { fz: W.fz && W.bild ? W.bild.fz : '' });
  // does a witness see a point? w: { x, y, hd (compass rad, or null: looks around), r (reach in m) }; o: { dark, sneak, cover }
  function sieht(w, px, py, o = {}) {
    const dx = px - w.x,
      dy = py - w.y,
      d = Math.hypot(dx, dy);
    let r = w.r || 30;
    if (o.dark) r *= 0.45;
    if (o.sneak) r *= 0.5;
    if (o.cover) r *= 0.35;
    if (!(d <= r)) return false;
    if (d < 5 || w.hd == null) return true;
    let a = Math.atan2(dx, dy) - w.hd;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return Math.abs(a) < 1.75; // a good half circle ahead
  }
  // ---- witnesses: a report is made on the phone and takes a few seconds; talked out of it (or the call cut short), it is not made ----
  // how long a witness needs: a villager who knows the two is quicker to be sure, a serious deed is reported at once
  const meldeZeit = (id, knows) => {
    const h = (CRIMES[id] || { h: 1 }).h;
    return Math.max(3.5, 7.5 - h * 1.6 - (knows ? 0.8 : 0));
  };
  // may a witness be talked out of reporting this deed? small things yes, the serious ones never
  const beredbar = id => (CRIMES[id] || { h: 9 }).h <= 0.9;
  // a report begins. o: what crime() takes, plus key (who reports), sec (how long it takes). Returns the entry.
  function melden(W, id, o = {}) {
    if (!CRIMES[id]) return null;
    const q = { id, o, key: o.key ?? '', t: o.sec > 0 ? o.sec : meldeZeit(id, o.knows), T: 0 };
    q.T = q.t;
    W.offen.push(q);
    return q;
  }
  // the reports that are through after dt (taken out of the list; the caller counts them with crime())
  function reif(W, dt) {
    const out = [];
    for (let i = W.offen.length - 1; i >= 0; i--) {
      const q = W.offen[i];
      q.t -= dt;
      if (q.t <= 0) {
        W.offen.splice(i, 1);
        out.unshift(q);
      }
    }
    return out;
  }
  // a witness does not report after all (talked out of it, the call cut short): how many reports that ends
  function still(W, key) {
    let n = 0;
    for (let i = W.offen.length - 1; i >= 0; i--)
      if (W.offen[i].key === key) {
        W.offen.splice(i, 1);
        n++;
      }
    return n;
  }
  // new clothes: a description is worth nothing any more (hollow stars go at once) – a name stays a name. o: { seen: somebody watches }
  // returns 'frei' | 'bekannt' | 'gesehen' | 'ruhe'
  function umziehen(W, o = {}) {
    if (W.state === 'ruhe') return 'ruhe';
    if (o.seen) return 'gesehen';
    if (W.known) return 'bekannt';
    const log = W.log,
      fz = W.fz,
      bild = bildFz(W);
    Object.assign(W, fresh(), { log, fz, bild });
    return 'frei';
  }
  // the vehicle looks different now (another plate): the police no longer know it
  const umkennzeichnen = W => {
    const was = W.fz;
    W.fz = false;
    return was;
  };
  // ---- what the police know (GTA 6, autumn 2026: face, outfit, vehicle – built from sightings; change the facts and it goes) ----
  // W.bild is their description: { wer: 'm' | 'f' | '' (man or woman), gesicht: they know the face (seen close and in light, or a witness
  // named the two), kleid: the clothes ('' none yet), kopf: '' | 'helm' | 'haube' (headwear is part of the clothes), fz: the vehicle,
  // fuss: last seen on foot, wo: [x, y] where, hd: which way (compass rad, null: standing) }.
  // ist: the facts now (from the world) { wer, kleid, kopf, fz: '' on foot | 'moped' | 'trabant' | 'auto' | … }.
  // Distances (m) by day / at night: the face from 9 / 4 (a torch in the face), the clothes from 34 / 15, a vehicle from 70.
  const SICHT = { gesicht: 9, gesichtNacht: 4, kleid: 34, kleidNacht: 15, fz: 70 };
  // a sighting. o: { d: how far (undefined: a report – the clothes and the vehicle, no face), dark, knows: the witness named the two,
  // fz: false – the vehicle is not taken (yet), x, y, hd: where and which way }. Returns what is new in the description:
  // [] or some of 'gesicht', 'kleidung', 'fahrzeug', 'fuss'
  function sicht(W, ist, o = {}) {
    const B = W.bild || (W.bild = bildLeer()),
      out = [],
      bericht = o.d === undefined,
      d = bericht ? SICHT.kleidNacht : o.d,
      maske = !!ist.kopf,
      kleidD = o.dark ? SICHT.kleidNacht : SICHT.kleid;
    if (!B.gesicht && (o.knows || (!bericht && !maske && d <= (o.dark ? SICHT.gesichtNacht : SICHT.gesicht)))) {
      B.gesicht = true;
      out.push('gesicht');
    }
    if (o.knows || d <= kleidD) {
      if (ist.wer) B.wer = ist.wer;
      if (B.kleid !== ist.kleid || B.kopf !== (ist.kopf || '')) {
        B.kleid = ist.kleid || '';
        B.kopf = ist.kopf || '';
        out.push('kleidung');
      }
    }
    if (ist.fz) {
      if (o.fz !== false && d <= SICHT.fz && (B.fz !== ist.fz || B.fuss || !W.fz)) {
        B.fz = ist.fz;
        B.fuss = false;
        W.fz = true;
        out.push('fahrzeug');
      }
    } else if (d <= kleidD && !B.fuss) {
      B.fuss = true;
      out.push('fuss');
    }
    if (Number.isFinite(o.x) && Number.isFinite(o.y)) {
      B.wo = [o.x, o.y];
      B.hd = o.hd ?? null;
    }
    return out;
  }
  // what the police know that still fits him now: a helmet or a balaclava hides the face while worn; other clothes or headwear do not
  // fit the description; a vehicle counts while he is in the one they know
  function wissen(W, ist) {
    const B = W.bild || bildLeer(),
      maske = !!ist.kopf;
    return {
      gesicht: !!(B.gesicht || W.known) && !maske,
      kleidung: !!B.kleid && B.kleid === ist.kleid && B.kopf === (ist.kopf || ''),
      fahrzeug: !!ist.fz && !!W.fz && B.fz === ist.fz,
    };
  }
  // ---- random events on the way (feat/grenzland-welt, grenzland/gl_ereignis.js): which one may come now – pure ----
  // Every few minutes of driving (2½–5), one at a time, in free play today only; each where it fits (a speed camera on a road, the
  // harvest lorry outside the villages, the fair in a village, the wedding convoy in the town, the man with the bangers in a village or
  // the town, the deer at dusk on a country road), none of them twice within a quarter of an hour.
  const EREIGNISSE = {
    blitzer: { wo: ['land', 'dorf'], fahrt: true },
    traktorstau: { wo: ['land'], fahrt: true },
    kirmes: { wo: ['dorf'], tag: true },
    korso: { wo: ['stadt'] },
    boeller: { wo: ['dorf', 'stadt'] },
    wildunfall: { wo: ['land'], fahrt: true, dunkel: true },
  };
  const planNeu = () => ({ fahrt: 0, next: 150, zuletzt: {} });
  // P: planNeu() kept by the caller; ctx: { t: game seconds, dt, frei: free play and today, fahrt: driving now, ort: 'dorf' | 'stadt' |
  // 'land', dunkel: dusk or night, laeuft: one runs now }. Returns the name of the event to start now, or ''.
  function plan(P, ctx, rnd = Math.random) {
    if (!ctx.frei || ctx.laeuft) return '';
    if (ctx.fahrt) P.fahrt += ctx.dt || 0;
    if (P.fahrt < P.next) return '';
    const ok = Object.keys(EREIGNISSE).filter(k => {
      const e = EREIGNISSE[k];
      return (
        e.wo.includes(ctx.ort) &&
        (!e.fahrt || ctx.fahrt) &&
        (!e.dunkel || ctx.dunkel) &&
        (!e.tag || !ctx.dunkel) &&
        !(ctx.t - (P.zuletzt[k] ?? -1e9) < 900)
      );
    });
    if (!ok.length) return '';
    const k = ok[Math.floor(rnd() * ok.length) % ok.length];
    P.fahrt = 0;
    P.next = 150 + rnd() * 150;
    P.zuletzt[k] = ctx.t;
    return k;
  }
  // ---- walls: is the straight line between two points free? segs: flat [x1, y1, x2, y2, …] or [[x1, y1, x2, y2], …] ----
  function waende(segs, cs = 16) {
    const flat = segs.length && Array.isArray(segs[0]),
      n = flat ? segs.length : Math.floor(segs.length / 4),
      A = new Float32Array(n * 4),
      C = new Map();
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) A[i * 4 + k] = flat ? segs[i][k] : segs[i * 4 + k];
    for (let i = 0; i < n; i++) {
      const x0 = Math.floor(Math.min(A[i * 4], A[i * 4 + 2]) / cs),
        x1 = Math.floor(Math.max(A[i * 4], A[i * 4 + 2]) / cs),
        y0 = Math.floor(Math.min(A[i * 4 + 1], A[i * 4 + 3]) / cs),
        y1 = Math.floor(Math.max(A[i * 4 + 1], A[i * 4 + 3]) / cs);
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const key = cx * 100003 + cy;
          let a = C.get(key);
          if (!a) C.set(key, (a = []));
          a.push(i);
        }
    }
    function frei(ax, ay, bx, by) {
      const sx = bx - ax,
        sy = by - ay,
        x0 = Math.floor(Math.min(ax, bx) / cs),
        x1 = Math.floor(Math.max(ax, bx) / cs),
        y0 = Math.floor(Math.min(ay, by) / cs),
        y1 = Math.floor(Math.max(ay, by) / cs);
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const a = C.get(cx * 100003 + cy);
          if (!a) continue;
          for (const i of a)
            if (kreuzt(ax, ay, sx, sy, A[i * 4], A[i * 4 + 1], A[i * 4 + 2], A[i * 4 + 3])) return false;
        }
      return true;
    }
    return { n, frei };
  }
  // does the sight line from (ax, ay) along (sx, sy) cross the wall c → d? (the ends of the sight line do not count: one stands at a wall)
  function kreuzt(ax, ay, sx, sy, cx, cy, ex, ey) {
    const dx = ex - cx,
      dy = ey - cy,
      den = sx * dy - sy * dx;
    if (Math.abs(den) < 1e-9) return false;
    const t = ((cx - ax) * dy - (cy - ay) * dx) / den,
      u = ((cx - ax) * sy - (cy - ay) * sx) / den;
    return t > 0.02 && t < 0.98 && u >= 0 && u <= 1;
  }
  // ---- roads: what the police need of the road graph (VNETZ.graph of the square, or of the town) ----
  const VMAX = [27, 21, 18, 11, 8, 6, 5.5]; // m/s by kind: motorway, main, county, street, lane, service, track
  const wrap = a => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  // o: { vmax: speeds by kind, exits: node indices (default: where a main or county road ends), box: [x0, y0, x1, y1] }
  function netz(G, o = {}) {
    const V = o.vmax || VMAX,
      nodes = G.nodes,
      edges = G.edges;
    // the largest connected part (a piece of motorway that touches nothing is no way to anywhere)
    const comp = new Int32Array(nodes.length).fill(-1),
      size = [];
    for (let i = 0; i < nodes.length; i++) {
      if (comp[i] >= 0) continue;
      const c = size.length,
        st = [i];
      let len = 0;
      comp[i] = c;
      while (st.length) {
        const u = st.pop();
        for (const e of nodes[u].edges) {
          len += e.len;
          const v = e.a === u ? e.b : e.a;
          if (comp[v] < 0) {
            comp[v] = c;
            st.push(v);
          }
        }
      }
      size.push(len);
    }
    let main = 0;
    for (let c = 1; c < size.length; c++) if (size[c] > size[main]) main = c;
    const ok = e => comp[e.a] === main;
    // per edge: the length up to each point, the box around it
    const cum = new Map(),
      bb = new Map();
    for (const e of edges) {
      const c = new Float32Array(e.pts.length);
      let x0 = 1e9,
        y0 = 1e9,
        x1 = -1e9,
        y1 = -1e9;
      for (let k = 0; k < e.pts.length; k++) {
        if (k) c[k] = c[k - 1] + hyp(e.pts[k][0] - e.pts[k - 1][0], e.pts[k][1] - e.pts[k - 1][1]);
        x0 = Math.min(x0, e.pts[k][0]);
        y0 = Math.min(y0, e.pts[k][1]);
        x1 = Math.max(x1, e.pts[k][0]);
        y1 = Math.max(y1, e.pts[k][1]);
      }
      cum.set(e, c);
      bb.set(e, [x0, y0, x1, y1]);
    }
    const lenOf = e => {
      const c = cum.get(e);
      return c[c.length - 1];
    };
    // the nearest point of the roads to (x, y): { e, t (m along e from its node a), x, y, d, dx, dy (the direction a → b there) }
    // filt(e): only these edges
    function nah(x, y, max = 1e9, filt = null) {
      let best = null,
        bd = max;
      for (const e of edges) {
        if (!ok(e) || (filt && !filt(e))) continue;
        const b = bb.get(e);
        if (x < b[0] - bd || x > b[2] + bd || y < b[1] - bd || y > b[3] + bd) continue;
        const q = e.pts,
          c = cum.get(e);
        for (let k = 0; k + 1 < q.length; k++) {
          const ax = q[k][0],
            ay = q[k][1],
            dx = q[k + 1][0] - ax,
            dy = q[k + 1][1] - ay,
            l2 = dx * dx + dy * dy;
          if (l2 < 1e-9) continue;
          const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
            px = ax + dx * u,
            py = ay + dy * u,
            d = hyp(x - px, y - py);
          if (d < bd) {
            const l = Math.sqrt(l2);
            bd = d;
            best = { e, t: c[k] + l * u, x: px, y: py, d, dx: dx / l, dy: dy / l };
          }
        }
      }
      return best;
    }
    // the point at t along an edge: [x, y, dx, dy]
    function punkt(e, t) {
      const q = e.pts,
        c = cum.get(e);
      t = Math.max(0, Math.min(c[c.length - 1], t));
      let k = 0;
      while (k + 2 < q.length && c[k + 1] < t) k++;
      const l = c[k + 1] - c[k] || 1,
        u = (t - c[k]) / l,
        dx = q[k + 1][0] - q[k][0],
        dy = q[k + 1][1] - q[k][1];
      return [q[k][0] + dx * u, q[k][1] + dy * u, dx / l, dy / l];
    }
    // the points of an edge between t0 and t1 (backwards if t1 < t0)
    function schnitt(e, t0, t1) {
      const q = e.pts,
        c = cum.get(e),
        L = c[c.length - 1],
        rev = t1 < t0,
        a = Math.max(0, Math.min(L, rev ? t1 : t0)),
        b = Math.max(0, Math.min(L, rev ? t0 : t1)),
        out = [];
      const pa = punkt(e, a),
        pb = punkt(e, b);
      out.push([pa[0], pa[1]]);
      for (let k = 1; k + 1 < q.length; k++) if (c[k] > a + 0.05 && c[k] < b - 0.05) out.push([q[k][0], q[k][1]]);
      if (b - a > 0.05) out.push([pb[0], pb[1]]);
      return rev ? out.reverse() : out;
    }
    const pseudo = (e, pts) => {
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += hyp(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      return { e: { pts, len, kind: e.kind, w: e.w, pseudo: true, von: e }, fwd: true };
    };
    const speed = (e, k = 1) => (V[e.kind] || 5) * k;
    // seconds along an edge (field tracks are rougher than their limit; meiden: edges to keep away from)
    const kosten = (e, k, meiden) =>
      (e.len / speed(e, k)) * (e.kind === 6 ? 1.25 : 1) * (meiden && meiden.has(e) ? 6 : 1);
    // seconds to every node from the sources [[node, seconds], …]: { dist, prev } (Dijkstra with a small binary heap)
    function wege(srcs, k = 1, meiden = null) {
      const n = nodes.length,
        dist = new Float64Array(n).fill(Infinity),
        prev = new Array(n).fill(null),
        done = new Uint8Array(n),
        hd = [],
        hn = [];
      const push = (d, i) => {
        let j = hd.length;
        hd.push(d);
        hn.push(i);
        while (j > 0) {
          const q = (j - 1) >> 1;
          if (hd[q] <= hd[j]) break;
          [hd[q], hd[j]] = [hd[j], hd[q]];
          [hn[q], hn[j]] = [hn[j], hn[q]];
          j = q;
        }
      };
      const pop = () => {
        const i = hn[0],
          ld = hd.pop(),
          ln = hn.pop();
        if (hd.length) {
          hd[0] = ld;
          hn[0] = ln;
          for (let j = 0; ;) {
            const l = j * 2 + 1,
              r = l + 1;
            let m = j;
            if (l < hd.length && hd[l] < hd[m]) m = l;
            if (r < hd.length && hd[r] < hd[m]) m = r;
            if (m === j) break;
            [hd[m], hd[j]] = [hd[j], hd[m]];
            [hn[m], hn[j]] = [hn[j], hn[m]];
            j = m;
          }
        }
        return i;
      };
      for (const [i, c] of srcs)
        if (c < dist[i]) {
          dist[i] = c;
          push(c, i);
        }
      while (hd.length) {
        const u = pop();
        if (done[u]) continue;
        done[u] = 1;
        const bd = dist[u];
        for (const e of nodes[u].edges) {
          const v = e.a === u ? e.b : e.a,
            nd = bd + kosten(e, k, meiden);
          if (nd < dist[v]) {
            dist[v] = nd;
            prev[v] = e;
            push(nd, v);
          }
        }
      }
      return { dist, prev };
    }
    // seconds from a point to every node (for choosing where to come from and where to leave)
    function zeiten(x, y, k = 1) {
      const A = nah(x, y);
      if (!A) return null;
      const v = speed(A.e, k);
      return wege(
        [
          [A.e.a, A.t / v],
          [A.e.b, (lenOf(A.e) - A.t) / v],
        ],
        k
      ).dist;
    }
    // a line to drive from where a car stands and faces to the road point nearest to a place.
    // from: { x, y, hd (compass rad; null: any direction) }, to: [x, y]; o: { k: factor on the speeds, aLat, vEnd, meiden: Set of edges,
    // wende: seconds a turn on the spot costs (default 7) }
    // returns { line, ziel: [x, y], zeit, wende: turned round, d: how far the place is from the road } or null
    function linie(from, to, o = {}) {
      const A = nah(from.x, from.y),
        B = nah(to[0], to[1]);
      if (!A || !B) return null;
      const k = o.k || 1,
        U = o.wende ?? 7,
        hd = from.hd,
        face = hd == null ? 0 : Math.sin(hd) * A.dx + Math.cos(hd) * A.dy >= 0 ? 1 : -1, // +1: the car looks towards node b
        LA = lenOf(A.e),
        LB = lenOf(B.e),
        vA = speed(A.e, k),
        vB = speed(B.e, k);
      const R = wege(
        [
          [A.e.a, A.t / vA + (face > 0 ? U : 0)],
          [A.e.b, (LA - A.t) / vA + (face < 0 ? U : 0)],
        ],
        k,
        o.meiden
      );
      // the best way: over one of the far edge's nodes, or straight along the same edge
      let best = Infinity,
        via = -1;
      const ca = R.dist[B.e.a] + B.t / vB,
        cb = R.dist[B.e.b] + (LB - B.t) / vB;
      if (ca < best) {
        best = ca;
        via = B.e.a;
      }
      if (cb < best) {
        best = cb;
        via = B.e.b;
      }
      let direct = false;
      if (A.e === B.e) {
        const dir = B.t >= A.t ? 1 : -1,
          c = Math.abs(B.t - A.t) / vA + (face && dir !== face ? U : 0);
        if (c <= best) {
          best = c;
          direct = true;
        }
      }
      if (!(best < Infinity)) return null;
      // the edges from the far node back to the first node
      const chain = [];
      let first = via;
      if (!direct)
        for (let v = via; R.prev[v];) {
          const e = R.prev[v],
            u = e.a === v ? e.b : e.a;
          chain.push({ e, fwd: e.b === v });
          v = u;
          first = u;
        }
      chain.reverse();
      // which way the car starts along its edge: +1 towards b
      const dir0 = direct ? (B.t >= A.t ? 1 : -1) : first === A.e.b ? 1 : -1,
        turn = face !== 0 && dir0 !== face,
        path = [],
        head = [];
      // a short tail behind the car (its rear axle must lie on the line), then – turning round – a few metres ahead, then the way
      if (hd != null) head.push([A.x - Math.sin(hd) * 2.4, A.y - Math.cos(hd) * 2.4]);
      let t0 = A.t;
      if (turn) {
        const t1 = Math.max(0, Math.min(LA, A.t + face * 6));
        if (Math.abs(t1 - A.t) > 1.5) {
          for (const q of schnitt(A.e, A.t, t1)) head.push(q);
          t0 = t1;
        }
      }
      const rest = schnitt(A.e, t0, direct ? B.t : dir0 > 0 ? LA : 0);
      if (!head.length || hyp(head[head.length - 1][0] - rest[0][0], head[head.length - 1][1] - rest[0][1]) > 0.05)
        head.push(rest[0]);
      for (let i = 1; i < rest.length; i++) head.push(rest[i]);
      if (head.length > 1) path.push(pseudo(A.e, head));
      for (const c of chain) path.push(c);
      if (!direct) {
        const tail = schnitt(B.e, via === B.e.a ? 0 : LB, B.t);
        if (tail.length > 1) path.push(pseudo(B.e, tail));
      }
      if (!path.length) return null;
      const line = VNETZ.line(path, {
        // the right-hand lane; on lanes and tracks a little right of the middle, so that two cars get past each other
        off: e =>
          o.lane === false ? 0 : e.kind <= 3 ? Math.max(1.0, (e.w || 5) / 4) : Math.min(0.7, (e.w || 3) / 4.5),
        vmax: e => speed(e, k),
        cut: 5,
        aLat: o.aLat || 3.2,
        aBrk: 3,
        vMin: 2.6,
        vEnd: o.vEnd ?? 0,
      });
      if (!line || !(line.L > 1)) return null;
      return { line, ziel: [B.x, B.y], zeit: best, wende: turn, d: B.d };
    }
    // where the roads leave: the ends of main and county roads (the square), or the nodes given (the town's exits)
    const exits = (
      o.exits ||
      nodes
        .map((n, i) => (n.edges.length === 1 && n.edges[0].kind >= 1 && n.edges[0].kind <= 2 ? i : -1))
        .filter(i => i >= 0)
    )
      .filter(i => comp[i] === main)
      .map(i => ({ i, x: nodes[i].x, y: nodes[i].y }));
    // where to search next: a junction near the place one was last seen, not just visited, rather where he was heading.
    // q: { last: [x, y], r: how far out, von: [x, y] (the car), spur: Map(node → when visited), t: now, dir: [dx, dy] | null, rnd }
    function suchziel(q) {
      let best = -1,
        bs = -Infinity;
      for (let i = 0; i < nodes.length; i++) {
        if (comp[i] !== main) continue;
        const nd = nodes[i],
          d = hyp(nd.x - q.last[0], nd.y - q.last[1]);
        if (d > q.r) continue;
        const dc = hyp(nd.x - q.von[0], nd.y - q.von[1]);
        if (dc < 25) continue;
        const seit = q.spur.has(i) ? q.t - q.spur.get(i) : 600;
        let s = Math.min(240, seit) - dc * 0.25 + (q.rnd ? q.rnd() : 0.5) * 40;
        if (q.dir && d > 5) s += 50 * (((nd.x - q.last[0]) * q.dir[0] + (nd.y - q.last[1]) * q.dir[1]) / d);
        if (nd.edges.length === 1) s -= 25; // a dead end: only if nothing else is left
        if (s > bs) {
          bs = s;
          best = i;
        }
      }
      return best;
    }
    // where a road block goes: along the road the player drives, the way he is heading, D metres ahead (at junctions the road that goes
    // on most straight, never onto lanes and tracks). p: { x, y, hd }; returns { x, y, hd (the road's direction towards the player),
    // w (the road's width), d (metres ahead), e, t } or null (not on a road, or the road ends too soon)
    function sperrstelle(p, D = 320, minD = 150) {
      const A = nah(p.x, p.y, 25, e => e.kind <= 3);
      if (!A) return null;
      let e = A.e,
        dir = Math.sin(p.hd) * A.dx + Math.cos(p.hd) * A.dy >= 0 ? 1 : -1,
        t = A.t,
        d = 0;
      const B = o.box,
        inBox = (x, y) => !B || (x > B[0] + 60 && x < B[2] - 60 && y > B[1] + 60 && y < B[3] - 60);
      let at = null;
      for (let guard = 0; guard < 80; guard++) {
        const L = lenOf(e),
          rem = dir > 0 ? L - t : t,
          step = Math.min(rem, D - d, 20);
        t += dir * step;
        d += step;
        const q = punkt(e, t);
        if (!inBox(q[0], q[1])) break;
        if (d >= minD) at = { x: q[0], y: q[1], hd: Math.atan2(-dir * q[2], -dir * q[3]), w: e.w || 5, d, e, t };
        if (d >= D - 0.01) break;
        if (step < rem - 0.01) continue;
        // at a node: the road that goes on most straight
        const ni = dir > 0 ? e.b : e.a,
          hx = dir * q[2],
          hy = dir * q[3];
        let nx = null,
          nb = -2;
        for (const f of nodes[ni].edges) {
          if (f === e || f.kind > 3) continue;
          const fd = f.a === ni ? 1 : -1,
            fq = punkt(f, fd > 0 ? 0.5 : lenOf(f) - 0.5),
            dot = fd * fq[2] * hx + fd * fq[3] * hy - (f.kind > e.kind ? 0.3 : 0);
          if (dot > nb) {
            nb = dot;
            nx = f;
          }
        }
        if (!nx || nb < -0.2) break;
        dir = nx.a === ni ? 1 : -1;
        e = nx;
        t = dir > 0 ? 0 : lenOf(e);
      }
      return at;
    }
    // how far a point is from the nearest road of the graph (tests: no car leaves the road)
    const abstand = (x, y) => {
      const A = nah(x, y);
      return A ? A.d : Infinity;
    };
    return {
      G,
      V,
      main,
      comp,
      exits,
      box: o.box || null,
      nah,
      punkt,
      schnitt,
      wege,
      zeiten,
      linie,
      suchziel,
      sperrstelle,
      abstand,
      lenOf,
    };
  }
  // ---- the police at work: patrol cars on the roads, officers on foot, the road block; who is sent and when they leave ----
  // The world shows and moves what is decided here (grenzland/gl_fahndung.js; the unit tests bring a world of their own):
  //   world.netz(x, y) → N | null        the road tools for a place (the square, the town), null where there are no roads
  //   world.los(ax, ay, bx, by) → bool   nothing solid between two points
  //   world.rnd() → 0 … 1
  //   world.spawn(u), world.remove(u)    the car of a unit comes into the world, goes
  //   world.onLine(u, line, s, v)        puts the car on a line; world.drive(u, dt, o) moves it one step (o: { k, vmax, acc, halt, stopS });
  //                                      both set u.s, u.v, u.x, u.y, u.hd, u.ende;  world.park(u, x, y, hd)
  //   world.copMake(c), world.copDrop(c) an officer on foot comes (c.da = true once he stands there), goes
  //   world.copStep(c, dt)               moves him towards c.goal with c.v, sets c.x, c.y, c.hd
  //   world.tat(id, name)                a deed the police saw themselves
  //   world.block(B), world.unblock(B)   the road block is put up, taken away
  // E.tick(dt, p, env): p = { x, y, v, hd, veh: in a vehicle, hidden: indoors, cover: under trees, sneak }, env = { W, era, dark, off,
  // split, air: the helicopter sees him, maske: his face is hidden, fremd: nothing of their description fits him }. E.sichtD: how near
  // the nearest who saw him this frame was. What happened goes to E.ev as [name, data] (the world tells it and empties the list).
  function einsatz(world) {
    const E = {
      units: [],
      cops: [],
      block: null,
      last: null, // where the player was last seen or reported
      lastT: 0,
      dir: null, // which way he was going then
      wait: 0, // seconds until the next car is sent
      sent: 0,
      seen: false,
      close: false,
      catchT: 0,
      chaseT: 0,
      t: 0,
      n: 0,
      spur: new Map(),
      ev: [],
      sawHide: false,
      hideT: 0,
      seenT: 9,
      footT: 0,
      blockT: 0,
      rufT: 0,
    };
    const rnd = () => (world.rnd ? world.rnd() : Math.random());
    // how many officers may be on foot at once (every figure costs memory: the world may say less)
    const maxCops = () => world.maxCops || 4;
    const say = (n, d) => E.ev.push([n, d || {}]);
    // at the end of its line (a line that ends with speed 0 is never driven to its very last metre)
    const da = u => !u.line || u.ende || (u.s >= u.line.L - 4 && u.v < 0.6);
    const KIND = {
      streife: { name: 'Die Streife', crew: 2, sicht: 1 },
      vopo: { name: 'Die Volkspolizei', crew: 1, sicht: 0.9 },
      sek: { name: 'Das SEK', crew: 2, sicht: 1.15 },
    };
    // ---- a report: where he is (a witness's call, a deed the police saw); the first car after `delay` seconds ----
    function melde(x, y, delay) {
      E.last = [x, y];
      E.lastT = 0;
      if (!E.units.length && E.wait <= 0 && delay > 0) E.wait = delay;
    }
    // ---- routes ----
    function route(u, to, k, o = {}) {
      const N = u.net;
      if (!N) return false;
      const R = N.linie({ x: u.x, y: u.y, hd: u.line ? u.hd : (u.hd0 ?? null) }, to, {
        k,
        aLat: o.aLat || 3.3,
        vEnd: o.vEnd ?? 0,
        meiden: E.meiden(u),
      });
      if (!R || R.line.L < 4) return false;
      const pr = u.line ? VNETZ.project(R.line, u.x, u.y, 0, 14) : null,
        s0 = pr ? pr.s : 2;
      world.onLine(u, R.line, s0, o.v ?? u.v);
      // what is left of the old lane's place across the road is driven out within a second
      u.lat = pr ? Math.max(-2.5, Math.min(2.5, pr.lat)) : 0;
      u.ziel = R.ziel;
      u.zielD = R.d;
      u.routeT = 0;
      u.k = k;
      return true;
    }
    // edges another car stands on with its crew out, or the road block: a way round costs less than waiting behind it
    E.meiden = u => {
      let S = null;
      for (const v of E.units)
        if (v !== u && v.net === u.net && v.st === 'steht' && v.net) {
          const A = v.net.nah(v.x, v.y, 12);
          if (A) (S = S || new Set()).add(A.e);
        }
      return S;
    };
    const unit = (kind, N, st, x, y) => ({
      id: ++E.n,
      kind,
      K: KIND[kind],
      net: N,
      st,
      t: 0,
      line: null,
      s: 0,
      v: 0,
      lat: 0,
      x,
      y,
      hd: 0,
      hd0: null,
      ende: false,
      routeT: 0,
      lost: 99,
      crew: 'drin',
      ziel: null,
      zielD: 0,
      stuck: 0,
      pause: 0,
      from: -1,
      blau: true,
      horn: false,
      k: 1.3,
      sawT: 0,
    });
    // ---- five stars: a van of the special forces across the road at every road end (they stand, and they see) ----
    function riegelOn(N) {
      let n = 0;
      for (const x of N.exits) {
        const e = N.G.nodes[x.i].edges[0];
        if (!e) continue;
        // 45 m inside the road end, across the lane that leads out (the lane in stays free for the police's own cars)
        const L = N.lenOf(e),
          out = e.a === x.i ? -1 : 1,
          q = N.punkt(e, out < 0 ? Math.min(45, L / 2) : Math.max(L - 45, L / 2)),
          hx = out * q[2],
          hy = out * q[3],
          u = unit('sek', N, 'riegel', q[0] + hy * 2, q[1] - hx * 2);
        u.from = x.i;
        world.spawn(u);
        world.park(u, u.x, u.y, Math.atan2(hx, hy) + Math.PI / 2);
        u.hd0 = Math.atan2(hx, hy);
        E.units.push(u);
        n++;
      }
      E.riegel = N;
      if (n) say('riegel', { n });
    }
    function riegelOff() {
      for (const u of E.units.slice()) if (u.st === 'riegel') leave(u);
      E.riegel = null;
    }
    // ---- sending: from the road end that is quickest to where he was seen, not one he is standing at; the second from another side ----
    function send(kind, p) {
      const N = world.netz(E.last[0], E.last[1]);
      if (!N || !N.exits.length) return null;
      const D = N.zeiten(E.last[0], E.last[1], 1.3);
      if (!D) return null;
      let best = null,
        bs = Infinity;
      for (const x of N.exits) {
        if (!(D[x.i] < Infinity) || hyp(x.x - p.x, x.y - p.y) < 150) continue;
        // (a road end where a car came in a moment ago: rather the next one – they come from two sides)
        const used = E.units.some(u => u.from === x.i && u.st === 'anfahrt');
        const s = D[x.i] * (used ? 1.7 : 1) + rnd() * 2;
        if (s < bs) {
          bs = s;
          best = x;
        }
      }
      if (!best) return null;
      const u = unit(kind, N, 'anfahrt', best.x, best.y);
      u.from = best.i;
      u.horn = true;
      world.spawn(u);
      if (!route(u, E.last, 1.3, { v: 14 })) {
        world.remove(u);
        return null;
      }
      E.units.push(u);
      E.sent++;
      say('streife', { n: E.units.length, kind, x: Math.round(u.x), y: Math.round(u.y) });
      return u;
    }
    // ---- away: to the nearest road end, lights off; gone when it is there (or far and out of sight) ----
    function leave(u) {
      crewIn(u, true);
      u.st = 'abzug';
      u.t = 0;
      u.horn = false;
      u.blau = false;
      u.pause = 0;
      const N = u.net,
        D = N && N.zeiten(u.x, u.y, 1);
      let ex = null,
        bd = Infinity;
      if (D)
        for (const x of N.exits)
          if (D[x.i] < bd) {
            bd = D[x.i];
            ex = x;
          }
      if (!ex || !route(u, [ex.x, ex.y], 1, { vEnd: 8 })) drop(u);
    }
    function drop(u) {
      crewIn(u, true);
      u.gone = true;
      world.remove(u);
      const i = E.units.indexOf(u);
      if (i >= 0) E.units.splice(i, 1);
    }
    // ---- the officers ----
    function copNew(u, i, x, y, hd, kind) {
      const c = {
        id: ++E.n,
        unit: u,
        i,
        kind: kind || (u ? u.kind : 'streife'),
        x,
        y,
        hd,
        st: 'jagt',
        goal: null,
        v: 0,
        da: false,
        aimT: 9,
        shout: 0,
        lookT: 0,
        t: 0,
        knows: false,
      };
      E.cops.push(c);
      world.copMake(c);
      return c;
    }
    function copDrop(c) {
      const i = E.cops.indexOf(c);
      if (i >= 0) E.cops.splice(i, 1);
      c.gone = true;
      world.copDrop(c);
    }
    // where a door of the car is (the left one for the driver)
    const door = (u, i) => {
      const s = i ? 1 : -1;
      return [u.x + Math.cos(u.hd) * s * 1.6, u.y - Math.sin(u.hd) * s * 1.6];
    };
    function crewOut(u, n) {
      if (u.crew !== 'drin') return;
      u.crew = 'raus';
      u.checked = false;
      for (let i = 0; i < n; i++) {
        const [x, y] = door(u, i);
        copNew(u, i, x, y, u.hd);
      }
      say('aussteigen', { id: u.id, kind: u.kind });
    }
    // back into the car (now: at once – the car goes, or the mode ends)
    function crewIn(u, now) {
      const mine = E.cops.filter(c => c.unit === u);
      if (!mine.length) {
        u.crew = 'drin';
        return true;
      }
      if (now) {
        for (const c of mine) copDrop(c);
        u.crew = 'drin';
        return true;
      }
      if (u.crew !== 'zurück') {
        u.crew = 'zurück';
        u.backT = 0;
        for (const c of mine) c.st = 'zurück';
      }
      return false;
    }
    // officers on foot from round a corner (where there are no roads to come by; 1989: the ABV, who lives in the village)
    function zuFuss(p, n, kind, o = {}) {
      const a0 = rnd() * 6.283,
        R = o.r || 38;
      let best = null,
        bs = -1;
      for (let i = 0; i < 10; i++) {
        const a = a0 + (i * 6.283) / 10,
          q = [p.x + Math.sin(a) * R, p.y + Math.cos(a) * R],
          N = world.netz(q[0], q[1]),
          A = N && N.nah(q[0], q[1], 30);
        // on a road if there is one near (never inside a house), else pushed out of the walls
        if (A) {
          q[0] = A.x;
          q[1] = A.y;
        } else if (world.frei && !world.frei(q)) continue;
        // out of his sight if there is such a corner; else behind his back
        const s = (world.los(q[0], q[1], p.x, p.y) ? 0 : 2) + (Math.cos(a - p.hd) < 0 ? 1 : 0) + rnd() * 0.5;
        if (s > bs) {
          bs = s;
          best = [q[0], q[1], a + Math.PI];
        }
      }
      if (!best) return 0;
      for (let i = 0; i < n; i++) {
        const c = copNew(null, i, best[0] + i * 1.1, best[1] + i * 0.6, best[2], kind);
        if (o.knows) c.knows = true;
      }
      say('zufuss', { n, kind });
      return n;
    }
    // ---- what a car sees ----
    function carSees(u, p, env, K) {
      if (env.off || p.hidden) return false;
      const d = hyp(u.x - p.x, u.y - p.y);
      let r = K.sicht * u.K.sicht * (env.dark ? 0.52 : 1);
      if (p.veh) r *= env.W.fz ? 1.5 : 1.25;
      else if (p.sneak) r *= 0.5;
      if (p.cover) r *= 0.35;
      return d < r && world.los(u.x, u.y, p.x, p.y);
    }
    function copSees(c, p, env) {
      if (env.off || p.hidden || !c.da) return false;
      const r = (c.kind === 'sek' ? 50 : 38) * (p.veh ? 1.25 : 1);
      return (
        sieht({ x: c.x, y: c.y, hd: c.st === 'sucht' && c.lookT > 0 ? null : c.hd, r }, p.x, p.y, {
          dark: env.dark,
          sneak: p.sneak && !p.veh,
          cover: p.cover,
        }) && world.los(c.x, c.y, p.x, p.y)
      );
    }
    // ---- everything away, the level calm ----
    function clear() {
      for (const u of E.units.slice()) drop(u);
      for (const c of E.cops.slice()) copDrop(c);
      blockOff();
      E.last = null;
      E.dir = null;
      E.wait = 0;
      E.sent = 0;
      E.seen = E.close = false;
      E.catchT = E.chaseT = 0;
      E.spur.clear();
      E.sawHide = false;
      E.seenT = 9;
      E.footT = 0;
      E.riegel = null;
      E.ev.length = 0;
    }
    // ---- the road block ----
    function blockOn(p, env) {
      const N = world.netz(p.x, p.y);
      if (!N || E.block) return false;
      const at = N.sperrstelle(p);
      if (!at) return false;
      // not right in front of his eyes: far enough, or behind a corner
      if (at.d < 220 && world.los(at.x, at.y, p.x, p.y)) return false;
      E.block = { x: at.x, y: at.y, hd: at.hd, w: at.w, e: at.e, side: 0, near: false, passed: false, t: 0, net: N };
      world.block(E.block);
      say('sperre', { x: Math.round(at.x), y: Math.round(at.y) });
      return true;
    }
    function blockOff() {
      if (!E.block) return;
      world.unblock(E.block);
      E.block = null;
    }
    // ---- per frame ----
    function lauf(dt, p, env) {
      const W = env.W,
        full = starsOf(W.heat),
        n = stars(W),
        K = kraefte(full, env.era),
        era89 = env.era === '1989';
      E.t += dt;
      let seen = !!(env.air && env.air.seen),
        close = false,
        sd = seen ? 60 : Infinity; // (how near the nearest who sees him is: what they can make out – the helicopter from above, 60 m)
      const sight = () => {
        E.last = [p.x, p.y];
        E.lastT = 0;
        if (p.v > 0.5) E.dir = [Math.sin(p.hd), Math.cos(p.hd)];
      };
      if (seen) sight();
      // the road point nearest to him, per network (once a frame)
      let sN = null,
        sA = null;
      const strasse = N => {
        if (N !== sN) {
          sN = N;
          sA = N.nah(p.x, p.y);
        }
        return sA;
      };
      // what the cars stop for: the one on foot, the player's vehicle when it stands (one that moves is followed: nah below), officers
      const halt = p.veh && p.v > 2 ? [] : [{ x: p.x, y: p.y, r: p.veh ? 0.7 : 0.4, gap: p.veh ? 2.2 : 3.5 }];
      // behind a vehicle that moves: as fast as it, plus what the gap to it allows
      const nah = (u, d) =>
        p.veh && p.v > 2 && (p.x - u.x) * Math.sin(u.hd) + (p.y - u.y) * Math.cos(u.hd) > d * 0.5
          ? Math.sqrt(p.v * p.v + 8 * Math.max(0, d - 7.5))
          : undefined;
      for (const c of E.cops) if (c.da) halt.push({ x: c.x, y: c.y, r: 0.4, gap: 2 });
      // ---- the cars ----
      for (const u of E.units.slice()) {
        const d = hyp(u.x - p.x, u.y - p.y);
        u.t += dt;
        u.routeT += dt;
        // across the road: back onto its lane after a new line – or over to the edge while it stands with its crew out
        u.lat += ((u.st === 'steht' ? u.rand || 0 : 0) - u.lat) * Math.min(1, dt * 2.5);
        const sees = u.st !== 'abzug' && full > 0 && carSees(u, p, env, K);
        if (sees) {
          seen = true;
          if (d < 26) close = true;
          if (d < sd) sd = d;
          sight();
          u.lost = 0;
          u.sawT += dt;
          if (p.veh && !W.fz && u.sawT > 1) {
            W.fz = true;
            say('fahrzeug', {});
          }
        } else {
          u.lost += dt;
          u.sawT = 0;
        }
        // the cars ahead on the same lane (going the same way, or standing)
        const hl = halt.slice();
        for (const v of E.units)
          if (v !== u && hyp(v.x - u.x, v.y - u.y) < 60) {
            const same = Math.cos(v.hd - u.hd) > 0.3;
            if (v.st !== 'riegel' && (same || v.st === 'steht'))
              hl.push({ x: v.x, y: v.y, r: v.st === 'steht' ? 0.5 : 0.6, gap: 3.6 });
          }
        const drive = o => world.drive(u, dt, Object.assign({ halt: hl }, o));
        if (u.st === 'abzug') {
          drive({ k: 0.9 });
          if (da(u) || (d > 260 && u.t > 20 && !world.los(u.x, u.y, p.x, p.y)) || u.t > 240) drop(u);
          continue;
        }
        if (u.st === 'riegel') continue; // a van that blocks a road end: it stands (and sees)
        if (sees && u.st !== 'verfolgt' && u.st !== 'steht') {
          u.st = 'verfolgt';
          u.horn = true;
          u.pause = 0;
          u.routeT = 99;
          say('funk', { was: 'sicht', id: u.id });
        }
        if (u.st === 'verfolgt') {
          // the road point nearest to him: nearer than that no car gets
          const A = strasse(u.net),
            there = A ? hyp(u.x - A.x, u.y - A.y) < 14 : true;
          if (!sees && u.lost > 6) {
            // lost: to where he was last seen, then round the roads
            u.st = 'suche';
            u.horn = false;
            u.first = true;
            if (E.last) route(u, E.last, 1.0);
            say('funk', { was: 'verloren', id: u.id });
          } else if (
            // somebody on foot close by, or he stands off the road (with his moped in the field) and the car is as near as the road
            // goes: stop, out of the car and over to him
            sees &&
            ((!p.veh && d < 24) || (p.v < (p.veh ? 2.5 : 3.2) && d < 170 && A && A.d > 12 && there && u.v < 2))
          ) {
            u.st = 'steht';
            u.horn = false;
            u.t = 0;
            u.wasOut = false;
            // it pulls over as far as the road allows (on a real road the others get past it)
            u.rand =
              A && A.e
                ? Math.max(
                    0,
                    Math.min(1.8, (A.e.w || 5) / 2 - (A.e.kind <= 3 ? Math.max(1, (A.e.w || 5) / 4) : 0.7) + 0.55)
                  )
                : 0;
            if (E.cops.length + K.crew <= maxCops()) crewOut(u, K.crew);
          } else if (u.routeT > (p.veh ? 1.4 : 2.4)) {
            // after him: to where he is – a vehicle that moves is driven up to (the line goes on beyond him with his speed)
            const fast = sees && p.veh && p.v > 2,
              lead = fast ? Math.min(30, p.v * 1.2) : 0,
              to = sees || !E.last ? [p.x + Math.sin(p.hd) * lead, p.y + Math.cos(p.hd) * lead] : E.last;
            u.routeT = 0;
            if (!u.ziel || hyp(to[0] - u.ziel[0], to[1] - u.ziel[1]) > 6 + (u.zielD || 0) || (da(u) && !there))
              route(u, to, K.tempo * (p.veh ? 1 : 0.85), { vEnd: fast ? Math.min(p.v + 3, 30) : 0 });
          }
          if (u.st === 'verfolgt') drive({ k: 1, acc: 3.6, vmax: sees ? nah(u, d) : undefined });
          else drive({ vmax: 0 });
        } else if (u.st === 'steht') {
          drive({ vmax: 0 });
          const mine = E.cops.filter(c => c.unit === u),
            A = strasse(u.net),
            // he gets away: with a vehicle again, or to where the car is much nearer to him round by the road, or out of all reach
            away =
              (p.veh && p.v > 3 && d > 28) ||
              (d > 60 &&
                A &&
                hyp(u.x - A.x, u.y - A.y) > 45 &&
                sees &&
                mine.every(c => hyp(c.x - p.x, c.y - p.y) > 45)) ||
              d > 230,
            // he is gone, and the place he was last seen at has been looked at
            gone = u.lost > 16 && (u.crew === 'drin' || u.checked || u.lost > 40);
          if (u.crew === 'raus' && (away || gone)) crewIn(u, false);
          if (u.crew === 'zurück') {
            u.backT += dt;
            if (u.backT > 30)
              crewIn(u, true); // (behind a fence: they are in the car)
            else if (!mine.length) u.crew = 'drin';
            if (u.crew === 'drin') {
              u.wasOut = true;
              say('einsteigen', { id: u.id });
            }
          }
          if (u.crew === 'drin') {
            if (away || gone || u.wasOut) {
              u.wasOut = false;
              u.st = sees ? 'verfolgt' : 'suche';
              u.horn = sees;
              u.first = !sees;
              u.routeT = 99;
              if (!sees && E.last) route(u, E.last, 1.0);
            } else if (sees && E.cops.length + K.crew <= maxCops() && p.v < (p.veh ? 2.5 : 3.2) && d < 170)
              crewOut(u, K.crew); // (it stood by while the others' officers were out; now it is its turn)
          }
        } else {
          // on the way to where he was last seen or reported; there a look around, then the roads near it
          if (u.st === 'anfahrt') {
            if (
              E.last &&
              u.ziel &&
              hyp(E.last[0] - u.ziel[0], E.last[1] - u.ziel[1]) > 45 + (u.zielD || 0) &&
              u.routeT > 4
            )
              route(u, E.last, 1.3);
            if (da(u)) {
              u.st = 'suche';
              u.horn = false;
              u.pause = 3;
              say('funk', { was: 'ort', id: u.id });
            }
          } else if (u.pause > 0) u.pause -= dt;
          else if (da(u) || u.routeT > 50) {
            if (u.first && da(u)) {
              // (came back to where he was last seen: a look around first)
              u.first = false;
              u.pause = 2.5;
            } else {
              const o = E.last || [p.x, p.y],
                R = Math.min(380, 120 + E.lastT * 1.4),
                i = u.net.suchziel({ last: o, r: R, von: [u.x, u.y], spur: E.spur, t: E.t, dir: E.dir, rnd });
              if (i >= 0) {
                E.spur.set(i, E.t);
                const nd = u.net.G.nodes[i];
                if (!route(u, [nd.x, nd.y], 0.62)) u.routeT = 40;
              } else u.routeT = 40;
            }
          }
          // every junction it comes past has been looked at
          if (u.st === 'suche' && u.v > 1) {
            const G = u.net.G;
            for (let i = 0; i < G.nodes.length; i++)
              if (Math.abs(G.nodes[i].x - u.x) < 14 && Math.abs(G.nodes[i].y - u.y) < 14) E.spur.set(i, E.t);
          }
          drive(u.pause > 0 ? { vmax: 0 } : { k: 1, acc: u.st === 'anfahrt' ? 3 : 2.4 });
        }
        // never standing for ever: a car that should drive and does not gets a new way; if that does not help, it is taken away
        if (u.st !== 'steht' && u.pause <= 0 && u.v < 0.3) {
          u.stuck += dt;
          // (it stands because he, an officer or a car that has stopped is in its way: it waits – a good while, then it goes round)
          const waits =
            hyp(p.x - u.x, p.y - u.y) < 12 ||
            E.cops.some(c => hyp(c.x - u.x, c.y - u.y) < 9) ||
            E.units.some(v => v !== u && v.v < 0.3 && hyp(v.x - u.x, v.y - u.y) < 12);
          if (waits && (u.waitT = (u.waitT || 0) + dt) < 45) u.stuck = Math.min(u.stuck, 5);
          else if (u.stuck > 8 && u.stuck - dt <= 8)
            route(
              u,
              u.st === 'suche' || !E.last ? [u.x + 60 * (rnd() - 0.5), u.y + 60 * (rnd() - 0.5)] : E.last,
              u.k || 1
            );
          else if (u.stuck > 20) {
            say('fest', { id: u.id, x: Math.round(u.x), y: Math.round(u.y), st: u.st });
            drop(u);
            continue;
          }
        } else {
          u.stuck = 0;
          u.waitT = 0;
        }
        // boxed in: the car right behind somebody who stands in his vehicle
        if (p.veh && sees && d < 9 && p.v < 1.5) E.catchT += dt * 0.5;
      }
      // ---- the officers on foot: after him while they see him, else to where he was last seen, a look around, back to the car ----
      let grab = false;
      for (const c of E.cops.slice()) {
        if (!c.da) continue;
        c.t += dt;
        const d = hyp(c.x - p.x, c.y - p.y),
          sees = full > 0 && c.st !== 'zurück' && copSees(c, p, env);
        c.lost = sees ? 0 : (c.lost ?? 99) + dt; // (seconds since he last saw him: the radar shows him only while he sees)
        c.v = K.schritt || 2.15;
        if (sees) {
          seen = true;
          if (d < 26) close = true;
          if (d < sd) sd = d;
          sight();
          if (c.unit) c.unit.lost = 0; // (while its officers see him, their car does not call them back)
          if (c.knows && !W.known) {
            W.known = true;
            say('erkannt', { wer: c.kind });
          }
          c.st = 'jagt';
          if ((c.aimT += dt) > 0.3 || !c.goal) {
            // up to him, an arm's length short – while he moves, to where he will be in a moment
            c.aimT = 0;
            const mv = p.v > 1 && !p.veh,
              tx = p.x + (mv ? Math.sin(p.hd) * p.v * 0.6 : 0),
              ty = p.y + (mv ? Math.cos(p.hd) * p.v * 0.6 : 0),
              dd = hyp(tx - c.x, ty - c.y),
              k = mv ? 1 : dd > 1.2 ? (dd - 1.1) / dd : 0;
            c.goal = [c.x + (tx - c.x) * k, c.y + (ty - c.y) * k];
          }
          // he has hold of whoever stands or walks slowly – also of somebody sitting on a moped that does not move
          if (d < 1.7 && (!p.veh || p.v < 1.5)) {
            E.catchT += dt;
            grab = true;
          }
          if ((E.rufT -= dt) <= 0 && d > 3) {
            E.rufT = 7 + rnd() * 4;
            say('ruf', { id: c.id, kind: c.kind, d: Math.round(d) });
          }
        } else if (c.st === 'zurück') {
          const u = c.unit;
          if (!u || u.gone) {
            copDrop(c);
            continue;
          }
          c.goal = door(u, c.i);
          c.v = Math.max(c.v, 2.6);
          if (hyp(c.x - c.goal[0], c.y - c.goal[1]) < 1.3) {
            copDrop(c);
            continue;
          }
        } else if (c.st === 'jagt') {
          // out of sight: to where he was last seen, and a few steps on the way he went (round the corner)
          c.st = 'sucht';
          c.lookT = 0;
          c.t = 0;
          c.goal = E.last ? E.last.slice() : null;
          c.goal2 = E.last && E.dir ? [E.last[0] + E.dir[0] * 16, E.last[1] + E.dir[1] * 16] : null;
        } else if (c.st === 'sucht') {
          if (c.lookT > 0) {
            // there: a look around (he sees all round while he does)
            c.lookT -= dt;
            c.hd += dt * 1.4;
            if (c.lookT <= 0) {
              if (c.unit) c.unit.checked = true;
              else if (full > 0 && E.last) {
                // on foot without a car: on round the place
                const a = rnd() * 6.283;
                c.goal = [E.last[0] + Math.sin(a) * 22, E.last[1] + Math.cos(a) * 22];
              }
            }
          } else if (!c.goal || hyp(c.x - c.goal[0], c.y - c.goal[1]) < 2.2 || c.t > 45) {
            if (c.goal2 && c.t <= 45) {
              c.goal = c.goal2;
              c.goal2 = null;
            } else {
              c.goal = c.goal2 = null;
              c.lookT = 4;
              c.t = 0;
            }
          }
        }
        world.copStep(c, dt);
        // officers without a car leave when the search is over (out of sight), or after a while
        if (!c.unit && full === 0 && ((c.gehT = (c.gehT || 0) + dt) > 25 || !world.los(c.x, c.y, p.x, p.y))) copDrop(c);
      }
      // ---- caught: an officer has hold of him, or his vehicle is boxed in ----
      if (!grab && !(p.veh && p.v < 1.5 && seen)) E.catchT = Math.max(0, E.catchT - dt * 0.7);
      if (E.catchT > 1.2 && full > 0) {
        E.catchT = 0;
        say('erwischt', {});
        return 'erwischt';
      }
      // ---- the road block: it sees too; driven past it within its sight → another deed ----
      if (E.block) {
        const B = E.block,
          dx = p.x - B.x,
          dy = p.y - B.y,
          d = hyp(dx, dy),
          along = dx * Math.sin(B.hd) + dy * Math.cos(B.hd), // > 0: on the side he comes from
          sees = d < (env.dark ? 45 : 70) && !env.off && !p.hidden && !p.cover && world.los(B.x, B.y, p.x, p.y);
        B.t += dt;
        if (sees) {
          seen = true;
          if (d < 26) close = true;
          if (d < sd) sd = d;
          sight();
        }
        const side = along > 4 ? 1 : along < -4 ? -1 : 0;
        if (side && !B.side) B.side = side;
        if (side && B.side && side !== B.side) {
          B.side = side;
          if (p.veh && d < 75 && sees && !B.passed) {
            B.passed = true;
            world.tat('sperre', 'Die Sperre');
            say('durchbruch', { d: Math.round(d) });
          }
        }
        // taken down: the level fell, or he is somewhere else altogether (then a new one goes up ahead of him)
        if (full < 3 || (d > 700 && B.t > 40) || (B.passed && d > 260)) blockOff();
      }
      E.seen = seen;
      E.close = close;
      E.sichtD = sd;
      if (seen) E.seenT = 0;
      else E.seenT += dt;
      if (E.last) E.lastT += dt;
      // he went indoors (or under the trees) in front of their eyes: that is no hiding place – and for a while they wait outside
      if (p.hidden || p.cover) {
        if (!E.wasHidden && E.seenT < 2.5) {
          E.sawHide = true;
          E.hideT = 0;
        }
        if (E.sawHide) E.hideT += dt;
      } else E.sawHide = false;
      E.wasHidden = !!(p.hidden || p.cover);
      // a long chase is a deed of its own (they get more determined)
      if (seen && p.veh && p.v > 6) {
        E.chaseT += dt;
        if (E.chaseT > 22) {
          E.chaseT = 0;
          world.tat('flucht', era89 ? 'Die Volkspolizei' : 'Die Streife');
        }
      }
      // ---- the rules: the search runs out only once somebody searches (a car that has arrived, officers) – or nobody could come ----
      const there = E.units.some(u => u.st !== 'anfahrt' && u.st !== 'riegel') || E.cops.some(c => c.da),
        coming = E.units.length > 0 || E.wait > 0 || E.cops.length > 0;
      const ev = tick(W, dt, {
        seen,
        close,
        hidden: (p.hidden || p.cover || !!env.versteck) && !E.sawHide,
        split: !!env.split,
        maske: !!env.maske,
        fremd: !!env.fremd,
        hold:
          (!there && coming && !env.off) ||
          (E.sawHide &&
            p.hidden &&
            E.hideT < 45 &&
            (E.units.some(u => hyp(u.x - p.x, u.y - p.y) < 60) || E.cops.length > 0)),
      });
      if (ev) say(ev, { hidden: !!(p.hidden || p.cover) });
      // the level is calm (he got away, he changed his clothes, a mission ended it): everybody drives home
      if (starsOf(W.heat) === 0 && (E.last || E.block || E.units.some(u => u.st !== 'abzug'))) {
        for (const u of E.units.slice()) if (u.st !== 'abzug') leave(u);
        blockOff();
        E.riegel = null;
        E.sent = 0;
        E.last = null;
        E.dir = null;
        E.wait = 0;
        E.spur.clear();
      }
      // ---- sending and calling back: as many as the stars ask for, one after the other ----
      E.wait -= dt;
      E.footT -= dt;
      if (full > 0 && !env.off && E.last) {
        const active = E.units.filter(u => u.st !== 'abzug' && u.st !== 'riegel'),
          cars = active.filter(u => u.kind !== 'sek').length,
          vans = active.filter(u => u.kind === 'sek').length,
          N = world.netz(E.last[0], E.last[1]);
        if (N && E.wait <= 0 && (cars < K.cars || vans < K.vans)) {
          const u = send(cars < K.cars ? (era89 ? 'vopo' : 'streife') : 'sek', p);
          E.wait = u ? 9 + active.length * 5 : 6;
        }
        // he is somewhere the cars of another place's roads cannot go (the town, the village): they go home, others come there
        if (N)
          for (const u of active)
            if (u.net !== N && u.st !== 'steht' && u.st !== 'verfolgt' && u.lost > 20 && E.lastT < 30) leave(u);
        // too many for the stars that are left: the farthest goes home
        if (cars > K.cars || vans > K.vans) {
          const kind = vans > K.vans ? 'sek' : null;
          let far = null,
            fd = -1;
          for (const u of active) {
            if (kind ? u.kind !== 'sek' : u.kind === 'sek') continue;
            if (u.st === 'verfolgt' || u.st === 'steht') continue;
            const d = hyp(u.x - p.x, u.y - p.y);
            if (d > fd) {
              fd = d;
              far = u;
            }
          }
          if (far) leave(far);
        }
        // on foot: where no roads are, two officers from round the corner; 1989 the ABV, who knows everybody
        const foot = E.cops.filter(c => !c.unit).length;
        if (E.footT <= 0 && !foot) {
          if (!N && E.wait <= 0) {
            E.footT = 30;
            zuFuss(p, 2, 'streife');
          } else if (K.abv && E.wait <= K.delay - 12) {
            E.footT = 40;
            zuFuss(p, 1, 'abv', { knows: true, r: 42 });
          }
        }
        // the road block, ahead of where he drives
        if (K.sperre && !E.block && p.veh && p.v > 4 && (E.blockT -= dt) <= 0) {
          E.blockT = 4;
          blockOn(p, env);
        }
        // the road ends blocked
        if (K.riegel && !E.riegel && N) riegelOn(N);
      }
      if (E.riegel && !K.riegel) riegelOff();
      return ev;
    }
    Object.assign(E, {
      tick: lauf,
      melde,
      clear,
      send,
      leave,
      drop,
      crewOut,
      crewIn,
      zuFuss,
      blockOn,
      blockOff,
      route,
      KIND,
    });
    return E;
  }
  // ---- the helicopter of four stars: it flies in from far, circles over where he was last seen (over him while it sees him), sees
  //      whoever is in the open – by day all round, at night what its search light falls on – and never through a roof or the canopy
  //      of a forest; when the level falls it flies off ----
  // H.tick(dt, p, env) → [events]: p as for the police ({ x, y, veh, hidden, cover }), env = { want, last: [x, y] | null, dark, delay, rnd }
  //   H.on, H.st: 'weg' | 'anflug' | 'kreist' | 'abflug', H.x/y (over the ground), H.h (height), H.hd, H.sieht, H.lx/ly (where the light falls)
  function heli() {
    const H = {
      on: false,
      st: 'weg',
      x: 0,
      y: 0,
      h: 0,
      hd: 0,
      a: 0,
      cx: 0,
      cy: 0,
      r: 58,
      sieht: false,
      t: 0,
      lx: 0,
      ly: 0,
      wartT: 0,
      seeT: 0,
    };
    const V = 21, // m/s round the circle
      VIN = 52, // m/s flying in and off
      HOCH = 44, // m above the ground
      TAG = 95, // how far it sees by day (m, over the ground)
      KEGEL = 15; // the radius of the search light on the ground
    H.KEGEL = KEGEL;
    H.clear = () => {
      H.on = false;
      H.st = 'weg';
      H.sieht = false;
      H.wartT = 0;
      H.seeT = 0;
    };
    H.tick = (dt, p, env) => {
      const ev = [],
        rnd = env.rnd || Math.random;
      if (!H.on) {
        H.sieht = false;
        if (!env.want || !env.last) {
          H.wartT = 0;
          return ev;
        }
        if ((H.wartT += dt) < (env.delay ?? 10)) return ev;
        const a = rnd() * 6.283;
        H.on = true;
        H.st = 'anflug';
        H.t = 0;
        H.wartT = 0;
        H.cx = H.lx = env.last[0];
        H.cy = H.ly = env.last[1];
        H.x = H.cx + Math.sin(a) * 900;
        H.y = H.cy + Math.cos(a) * 900;
        H.h = HOCH + 40;
        ev.push('anflug');
      }
      H.t += dt;
      // the middle of its circle: over him while it sees him, else over where he was last seen
      const tgt = H.st === 'abflug' ? null : H.sieht ? [p.x, p.y] : env.last;
      if (tgt) {
        const dx = tgt[0] - H.cx,
          dy = tgt[1] - H.cy,
          d = hyp(dx, dy),
          s = Math.min(d, (H.st === 'anflug' ? 60 : 17) * dt);
        if (d > 0.01) {
          H.cx += (dx / d) * s;
          H.cy += (dy / d) * s;
        }
      }
      if (H.st === 'anflug') {
        const dx = H.cx - H.x,
          dy = H.cy - H.y,
          d = hyp(dx, dy) || 1;
        H.hd = Math.atan2(dx, dy);
        H.h += (HOCH - H.h) * Math.min(1, dt * 0.25);
        if (d <= H.r + 2) {
          H.st = 'kreist';
          H.a = Math.atan2(-dx, -dy);
          ev.push('da');
        } else {
          const s = Math.min(d - H.r, VIN * dt);
          H.x += (dx / d) * s;
          H.y += (dy / d) * s;
        }
        if (!env.want) H.st = 'abflug';
      } else if (H.st === 'kreist') {
        H.a += (V / H.r) * dt;
        H.x = H.cx + Math.sin(H.a) * H.r;
        H.y = H.cy + Math.cos(H.a) * H.r;
        H.hd = H.a + Math.PI / 2;
        H.h += (HOCH - H.h) * Math.min(1, dt * 0.5);
        if (!env.want) {
          H.st = 'abflug';
          H.t = 0;
          ev.push('abflug');
        }
      } else if (H.st === 'abflug') {
        H.x += Math.sin(H.hd) * VIN * dt;
        H.y += Math.cos(H.hd) * VIN * dt;
        H.h += 6 * dt;
        if (env.want && env.last) H.st = 'anflug';
        else if (H.t > 14 || hyp(H.x - p.x, H.y - p.y) > 800) {
          H.clear();
          ev.push('weg');
          return ev;
        }
      }
      // where the light falls: on him while it sees him, else it wanders round the middle of the circle
      const lt = H.sieht ? [p.x, p.y] : [H.cx + Math.sin(H.t * 0.83) * 30, H.cy + Math.cos(H.t * 0.57) * 30],
        ldx = lt[0] - H.lx,
        ldy = lt[1] - H.ly,
        ld = hyp(ldx, ldy),
        ls = Math.min(ld, 26 * dt);
      if (ld > 0.01) {
        H.lx += (ldx / ld) * ls;
        H.ly += (ldy / ld) * ls;
      }
      // what it sees
      const was = H.sieht,
        open = !p.hidden && !p.cover,
        d = hyp(p.x - H.x, p.y - H.y);
      H.sieht =
        H.st === 'kreist' &&
        open &&
        (env.dark ? d < 140 && hyp(p.x - H.lx, p.y - H.ly) < KEGEL : d < TAG * (p.veh ? 1.25 : 1));
      if (H.sieht && !was) ev.push('sicht');
      if (!H.sieht && was) ev.push('verloren');
      return ev;
    };
    return H;
  }
  return {
    CRIMES,
    STEPS,
    MAX,
    VMAX,
    starsOf,
    fresh,
    crime,
    stars,
    loseT,
    tick,
    fade,
    antwort,
    kraefte,
    busse,
    clear,
    sieht,
    meldeZeit,
    beredbar,
    melden,
    reif,
    still,
    umziehen,
    umkennzeichnen,
    SICHT,
    sicht,
    wissen,
    bildLeer,
    EREIGNISSE,
    plan,
    planNeu,
    waende,
    kreuzt,
    netz,
    einsatz,
    heli,
    wrap,
  };
})();
if (typeof window !== 'undefined') window.GLLOGIK = GLLOGIK;
