// feat/grenzland-polizei: a world without a browser for the police of „Grenzland“ – the real road graph and the real walls of the
// square (fixtures/ratscher.json), the cars driven as grenzland/gl_auto.js drives them, the officers walking straight. The unit tests
// (viz3/test/unit/grenzland_polizei*.test.mjs) and the trial runs (node viz3/extra/grenzland-polizei/sim/lauf.mjs) play scenes in it:
// the rules and the decisions are the ones of the game (grenzland/gl_logik.js: GLLOGIK.einsatz), only what is shown is left out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VNETZ } from '../../../src/verkehr/verkehr_netz.js';
import { GLLOGIK } from '../../../src/grenzland/gl_logik.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'fixtures', 'ratscher.json'), 'utf8'));
const i16 = b64 => {
  const b = Buffer.from(b64, 'base64');
  return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
};
// the ways as world/roads.js parses them
export function ways() {
  const a = i16(FIX.roads),
    out = [];
  for (let o = 0; o + 5 <= a.length; ) {
    const n = a[o],
      kind = a[o + 1],
      w = a[o + 3] / 10;
    o += 5;
    const p = new Float32Array(n * 2);
    for (let i = 0; i < n * 2; i++) p[i] = a[o + i] / 10;
    o += n * 2;
    out.push({ kind, w, p });
  }
  return out;
}
export const walls = () => Float32Array.from(i16(FIX.walls), v => v / 10);
export const BOX = FIX.box;
// a fixed sequence of „random“ numbers
export const zufall = (seed = 1) => () => {
  seed = (seed * 1664525 + 1013904223) | 0;
  return ((seed >>> 8) & 0xffffff) / 0x1000000;
};
const hyp = Math.hypot;
// the patrol car's measures (grenzland/gl_modelle.js TYP.streife)
const T = { yf: 2.047, a: 1.25, b: -1.655, hw: 0.87, wb: 2.905 };
let GRAPH = null,
  WALLS = null;
// o: { seed, era, dark, roads: false → a place without roads }
export function welt(o = {}) {
  if (!GRAPH) GRAPH = VNETZ.graph(ways(), { kinds: new Set([0, 1, 2, 3, 4, 5, 6]) });
  if (!WALLS) WALLS = GLLOGIK.waende(walls());
  const N = GLLOGIK.netz(GRAPH, { box: BOX }),
    W = GLLOGIK.fresh(),
    log = [],
    _a = {},
    _b = {};
  const inBox = (x, y) => x > BOX[0] + 30 && x < BOX[2] - 30 && y > BOX[1] + 30 && y < BOX[3] - 30;
  function pose(u) {
    const R = u.line;
    VNETZ.at(R, u.s + T.a, _a);
    const fx = _a.x + Math.cos(_a.hd) * u.lat,
      fy = _a.y - Math.sin(_a.hd) * u.lat;
    VNETZ.at(R, u.s + T.b, _b);
    const rx = _b.x + Math.cos(_b.hd) * u.lat,
      ry = _b.y - Math.sin(_b.hd) * u.lat,
      k = -T.b / T.wb;
    u.x = rx + (fx - rx) * k;
    u.y = ry + (fy - ry) * k;
    u.hd = Math.atan2(fx - rx, fy - ry);
  }
  const world = {
    N,
    W,
    log,
    stats: { spawn: 0, remove: 0, cops: 0, copsGone: 0, blocks: 0, unblocks: 0, maxOff: 0, tat: [] },
    netz: (x, y) => (o.roads === false ? null : inBox(x, y) ? N : null),
    los: (ax, ay, bx, by) => WALLS.frei(ax, ay, bx, by),
    rnd: zufall(o.seed || 7),
    spawn(u) {
      world.stats.spawn++;
    },
    remove(u) {
      world.stats.remove++;
    },
    onLine(u, line, s, v) {
      u.line = line;
      u.s = Math.max(-T.b, s);
      u.v = v;
      u.lat = 0;
      u.ende = false;
      pose(u);
    },
    // one step along the line – the same as GLAUTO.drive
    drive(u, dt, q = {}) {
      const R = u.line;
      if (!R || u.gone) return;
      const i = Math.min(R.n - 1, Math.max(0, Math.round((u.s + 2) / R.step)));
      let vT = (R.S ? R.S[i] : 8) * (q.k || 1);
      if (q.vmax != null) vT = Math.min(vT, q.vmax);
      let stopAt = q.stopS ?? Infinity;
      for (const h of q.halt || []) {
        if (Math.abs(h.x - u.x) > 60 || Math.abs(h.y - u.y) > 60) continue;
        const pr = VNETZ.project(R, h.x, h.y, u.s - 2, u.s + 45);
        if (pr && Math.abs(pr.lat - u.lat) < T.hw + h.r + 0.35 && pr.s > u.s + 0.5)
          stopAt = Math.min(stopAt, pr.s - T.yf - h.r - (h.gap ?? 1.6));
      }
      if (stopAt < Infinity) {
        const d = stopAt - u.s;
        vT = Math.min(vT, d <= 0.05 ? 0 : Math.sqrt(2 * 4 * d));
      }
      const dv = vT - u.v;
      u.v = Math.max(0, u.v + (dv > 0 ? Math.min(dv, (q.acc || 2.4) * dt) : Math.max(dv, -7 * dt)));
      u.s = Math.min(R.L, u.s + u.v * dt);
      u.ende = u.s >= R.L - 0.6;
      if (u.ende) u.v = 0;
      pose(u);
      world.stats.maxOff = Math.max(world.stats.maxOff, N.abstand(u.x, u.y));
    },
    park(u, x, y, hd) {
      u.line = null;
      u.v = 0;
      u.x = x;
      u.y = y;
      u.hd = hd;
    },
    copMake(c) {
      c.da = true;
      world.stats.cops++;
    },
    copDrop(c) {
      world.stats.copsGone++;
    },
    copStep(c, dt) {
      if (!c.goal) return;
      const dx = c.goal[0] - c.x,
        dy = c.goal[1] - c.y,
        d = hyp(dx, dy);
      if (d < 0.3) return;
      const s = Math.min(d, c.v * dt);
      c.x += (dx / d) * s;
      c.y += (dy / d) * s;
      c.hd = Math.atan2(dx, dy);
    },
    tat(id, name) {
      world.stats.tat.push(id);
      GLLOGIK.crime(W, id, { police: true });
    },
    block(B) {
      world.stats.blocks++;
    },
    unblock(B) {
      world.stats.unblocks++;
    },
  };
  const E = GLLOGIK.einsatz(world);
  world.E = E;
  // ---- playing a scene: spieler(t, dt) → { x, y, v, hd, veh, hidden, cover, sneak }; each(t, p, evs) may return true to stop ----
  world.env = { W, era: o.era || 'heute', dark: !!o.dark, off: false, split: false };
  world.t = 0;
  world.spiel = (spieler, secs, each, dt = 0.05) => {
    const n = Math.round(secs / dt);
    for (let i = 0; i < n; i++) {
      world.t += dt;
      const p = spieler(world.t, dt);
      E.tick(dt, p, world.env);
      const evs = E.ev.splice(0);
      for (const e of evs) {
        log.push([Math.round(world.t * 10) / 10, e[0], e[1]]);
        // caught: everything away, the level calm (as grenzland/gl_fahndung.js does)
        if (e[0] === 'erwischt') {
          world.stats.erwischt = (world.stats.erwischt || 0) + 1;
          E.clear();
          GLLOGIK.clear(W);
        }
      }
      if (each && each(world.t, p, evs)) return true;
    }
    return false;
  };
  // a deed somebody reported: the level and where
  world.deed = (id, x, y, q = {}) => {
    const g = GLLOGIK.crime(W, id, { seen: q.police ? 0 : 1, police: !!q.police, knows: !!q.knows });
    E.melde(x, y, GLLOGIK.kraefte(GLLOGIK.starsOf(W.heat), world.env.era).delay);
    return g;
  };
  return world;
}
// ---- players for the scenes ----
// stands at a place
export const steht = (x, y, q = {}) => () => Object.assign({ x, y, v: 0, hd: 0, veh: false, hidden: false, cover: false, sneak: false }, q);
// goes straight from a to b with v, then stands (q: veh …)
export function geht(a, b, v, q = {}, t0 = 0) {
  const L = hyp(b[0] - a[0], b[1] - a[1]) || 1,
    hd = Math.atan2(b[0] - a[0], b[1] - a[1]);
  return t => {
    const s = Math.max(0, Math.min(L, (t - t0) * v));
    return Object.assign(
      { x: a[0] + ((b[0] - a[0]) * s) / L, y: a[1] + ((b[1] - a[1]) * s) / L, v: s > 0 && s < L ? v : 0, hd, veh: false, hidden: false, cover: false, sneak: false },
      q
    );
  };
}
// rides along the roads from a to b with v (the middle of the road), then stands
export function faehrt(N, a, b, v, q = {}, t0 = 0) {
  const R = N.linie({ x: a[0], y: a[1], hd: null }, b, { k: 1, lane: true });
  if (!R) throw new Error('kein Weg');
  const o = {};
  return t => {
    const s = Math.max(0, Math.min(R.line.L, (t - t0) * v));
    VNETZ.at(R.line, s, o);
    return Object.assign({ x: o.x, y: o.y, v: s > 0 && s < R.line.L ? v : 0, hd: o.hd, veh: true, hidden: false, cover: false, sneak: false, s, L: R.line.L }, q);
  };
}
