// ===================== feat/dorf village life 6: homes and the everyday rhythm of the villagers (DLIFE) =====================
// Falko, 23.10.2026 2:52: people rarely walk through the village – they are mostly in their houses, now and then come out to tend their
// front gardens (weeding, watering), have a word over the garden fence, and on Fridays everyone comes to the old school. Each villager
// gets a house of the village (world/village.js: a house with a door, near the Anger, the houses spread out), a doorstep and a spot in
// the front garden beside the path (not on the road, not in a wall). The day of each one comes from the game clock and the calendar
// (deterministic, different every day): a morning and an evening turn in the garden from April to October (watering in the warm months,
// weeding otherwise), in winter a breath of air at the door now and then; Heike and Katrin chat at Heike's fence on some evenings.
import { KERN } from '../core/kern.js';
import { VILLAGE } from '../world/village.js';
import { ROADS } from '../world/roads.js';
import { WCOL } from '../world/worldcol.js';
import { DCAL } from './dorf_cal.js';
import { DTEXT } from './dorf_text.js';
export const DLIFE = (() => {
  const S = { err: null };
  let cache = null; // the homes, once found (S.homes is the function)
  const ANGER = [222, -108];
  const KEYS = Object.keys(DTEXT.P);
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  // a house: the door, the doorstep, a spot in the front garden beside the path
  function home(b) {
    const f = b.fac.find(q => q.door);
    if (!f) return null;
    const u = f.door.u,
      D = [f.ax + f.dx * u, f.ay + f.dy * u],
      cands = [
        [2.2, 2.4],
        [-2.2, 2.4],
        [2.6, 3.4],
        [-2.6, 3.4],
        [1.6, 4.2],
        [-1.6, 4.2],
        [3.2, 1.8],
        [-3.2, 1.8],
      ];
    for (const [a, o] of cands) {
      const x = D[0] + f.dx * a + f.nx * o,
        y = D[1] + f.dy * a + f.ny * o;
      if (ROADS && ROADS.edge && ROADS.edge(x, y) > -1.2) continue; // not on the road
      const p = [x, y];
      if (WCOL.pushCircle(p, 0.5)) continue; // not in a wall or a fence
      const st = [D[0] + f.nx * 0.9, D[1] + f.ny * 0.9];
      return {
        id: b.id,
        door: D,
        step: st,
        spot: [x, y],
        // facing the bed: along the house towards the door side, a little turned
        hd: (Math.atan2(-f.nx + f.dx * 0.3, -f.ny + f.dy * 0.3) * 180) / Math.PI,
        n: [f.nx, f.ny],
        d: [f.dx, f.dy],
      };
    }
    return null;
  }
  // every villager a house near the Anger, at least 28 m from the others (the same houses in every visit: the village data is fixed);
  // the candidates in a fixed spread order (a stride without common divisor with their number), not only the nearest
  function homes() {
    if (cache) return cache;
    if (!window.VILLAGE || !VILLAGE.ready || !window.WCOL || !WCOL.ready || !ROADS || !ROADS.ready) return null;
    const C = VILLAGE.bld
      .filter(b => b.typ === 0 && b.id !== 215 && b.st && b.st.style !== VILLAGE.ST.SCHOOL && b.fac.some(f => f.door))
      .map(b => ({ b, d: Math.hypot(b.cx - ANGER[0], b.cy - ANGER[1]) }))
      .filter(o => o.d > 35 && o.d < 280)
      .sort((a, z) => a.d - z.d);
    const n = C.length,
      gcd = (a, b) => (b ? gcd(b, a % b) : a),
      stride = [7, 11, 13, 5, 3, 1].find(s => gcd(s, n) === 1) || 1;
    const out = {},
      used = [];
    let i = 0;
    for (const k of KEYS) {
      while (i < n) {
        const c = C[(i * stride) % n];
        i++;
        if (used.some(u => Math.hypot(u.cx - c.b.cx, u.cy - c.b.cy) < 28)) continue;
        const h = home(c.b);
        if (!h) continue;
        out[k] = h;
        used.push(c.b);
        break;
      }
    }
    S.err =
      Object.keys(out).length < KEYS.length
        ? 'homes: ' + Object.keys(out).length + ' of ' + KEYS.length + ' (' + n + ' houses)'
        : null;
    cache = out;
    return out;
  }
  let moD = -1,
    moV = 5;
  const monthOf = d => {
    if (d !== moD) {
      moD = d;
      moV = new Date(DCAL.eday(d * 1440) * 864e5).getUTCMonth();
    }
    return moV;
  };
  // who drives a car, and when they are away with it (game minutes of the day): Katrin and Jens to work on weekdays, Ingrid to the town
  // hall twice a week, Manfred shopping now and then. Weekday from the calendar (0 Sunday … 6 Saturday).
  const CARS = { katrin: 0xb9bcc0, jens: 0x2b3f63, ingrid: 0x7a1f1f, manfred: 0xe8e6df };
  function away(key, t) {
    if (!CARS[key]) return null;
    const d = Math.floor(t / 1440),
      m = t - d * 1440,
      wd = DCAL.wd(t),
      work = wd >= 1 && wd <= 5;
    let a = null;
    if (key === 'katrin' && work) a = [7 * 60 + 5 + hh(d + 1) * 20, 16 * 60 + 10 + hh(d + 2) * 40];
    else if (key === 'jens' && work) a = [6 * 60 + 40 + hh(d + 3) * 15, 16 * 60 + 50 + hh(d + 4) * 50];
    else if (key === 'ingrid' && (wd === 2 || wd === 4))
      a = [9 * 60 + 40 + hh(d + 5) * 30, 12 * 60 + 20 + hh(d + 6) * 40];
    else if (key === 'manfred' && hh(d * 3 + 7) < 0.45) a = [9 * 60 + hh(d + 8) * 90, 11 * 60 + 30 + hh(d + 9) * 60];
    return a && m >= a[0] && m < a[1] ? { from: d * 1440 + a[0], to: d * 1440 + a[1] } : null;
  }
  // what one does at t outside the evenings: null (in the house) or { mode, from, to, with? }
  function routine(key, t) {
    if (away(key, t)) return null; // out with the car
    const i = KEYS.indexOf(key),
      d = Math.floor(t / 1440),
      m = t - d * 1440,
      mo = monthOf(d),
      grow = mo >= 3 && mo <= 9, // April–October: the garden season
      warm = mo >= 4 && mo <= 8;
    // Heike and Katrin at Heike's fence on some evenings
    if ((key === 'heike' || key === 'katrin') && hh(d * 23 + 11) < 0.5) {
      const a = 17.5 * 60 + hh(d * 5 + 3) * 40;
      if (m >= a && m < a + 35) return { mode: 'stand', from: d * 1440 + a, to: d * 1440 + a + 35, fence: true };
    }
    const slots = [];
    if (grow && hh(d * 31 + i * 7 + 1) < 0.7) {
      const s = 8.5 * 60 + hh(d * 13 + i * 3 + 2) * 150,
        l = 35 + hh(d + i + 3) * 40;
      slots.push([s, s + l, warm && hh(d * 7 + i + 4) < 0.5 ? 'water' : 'weed']);
    }
    if (grow && hh(d * 17 + i * 5 + 5) < 0.6) {
      const s = 16.5 * 60 + hh(d * 11 + i * 2 + 6) * 120,
        l = 30 + hh(d + i * 2 + 7) * 45;
      slots.push([s, s + l, warm ? 'water' : 'weed']);
    }
    if (!grow && hh(d * 19 + i + 8) < 0.35) {
      const s = 10 * 60 + hh(d * 3 + i + 9) * 240,
        l = 15 + hh(d + i + 10) * 20;
      slots.push([s, s + l, 'stand']);
    }
    for (const [a, b, mode] of slots) if (m >= a && m < b) return { mode, from: d * 1440 + a, to: d * 1440 + b };
    return null;
  }
  // where one stands for it: the spot (or at the fence beside Heike), heading, ground height
  function where(key, r) {
    const H = homes();
    if (!H) return null;
    if (r.fence) {
      const h = H.heike;
      if (!h) return null;
      const side = key === 'katrin' ? 1.1 : 0;
      const x = h.spot[0] + h.d[0] * side + h.n[0] * (key === 'katrin' ? 0.5 : 0),
        y = h.spot[1] + h.d[1] * side + h.n[1] * (key === 'katrin' ? 0.5 : 0),
        o = key === 'katrin' ? -1 : 1;
      return {
        x,
        y,
        z: KERN.terrain(x, y),
        hd: (Math.atan2(h.d[0] * o, h.d[1] * o) * 180) / Math.PI,
        step: H[key] ? H[key].step : h.step,
      };
    }
    const h = H[key];
    if (!h) return null;
    return { x: h.spot[0], y: h.spot[1], z: KERN.terrain(h.spot[0], h.spot[1]), hd: h.hd, step: h.step };
  }
  Object.assign(S, { homes, routine, where, away, CARS, KEYS });
  return S;
})();
window.DLIFE = DLIFE;
