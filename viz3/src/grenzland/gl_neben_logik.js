// ===================== feat/grenzland: skittles and fishing as pure logic (GLNLOGIK) =====================
// No imports, no scene: unit tests in viz3/test/unit/grenzland_neben.test.mjs. A throw on a Thuringian Kegelbahn (nine pins in a
// diamond), and what bites at the reservoir by month, hour and bait. Both with a small seeded random, so that a test and a replay see
// the same throw and the same fish.
export const GLNLOGIK = (() => {
  // ---- a small seeded random (mulberry32) ----
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // ---- Kegeln (nine pins in a diamond, as on a Thuringian Kegelbahn): one throw ----
  // pins: x across (m), y along; the lane is 1.5 m wide here, the ball 16 cm, a pin 10 cm at its belly
  const PINS = (() => {
    const d = 0.25,
      out = [];
    for (const [r, n] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 2],
      [4, 1],
    ])
      for (let i = 0; i < n; i++) out.push({ x: (i - (n - 1) / 2) * 2 * d, y: r * d * 0.87 });
    return out;
  })();
  // aim: where the ball is let go across the lane (m, 0 = middle), dir: its angle (rad, + to the right), drall: side spin (−1 … 1),
  // kraft: 0.3 … 1; standing: which of the nine still stand. Returns { fallen: [indices], rinne: true if it ran off the lane }
  function wurf(aim, dir, drall, kraft, standing, seed) {
    const R = rng(seed),
      up = standing ? standing.slice() : PINS.map(() => true),
      L = 19.5, // from the foul line to the first pin
      k = Math.max(0.3, Math.min(1, kraft)),
      fallen = [];
    // the ball: a line with a little curve from the spin (more at a slow throw)
    const xAt = y => aim + Math.tan(dir) * (L + y) + drall * 0.22 * (1.25 - k) * Math.pow((L + y) / L, 2);
    if (Math.abs(xAt(-0.6)) > 0.75) return { fallen, rinne: true };
    const hit = [];
    for (let i = 0; i < PINS.length; i++) {
      if (!up[i]) continue;
      const p = PINS[i],
        off = xAt(p.y) - p.x;
      if (Math.abs(off) < 0.13) hit.push({ i, off, d: [Math.sign(off) * -1 || (R() < 0.5 ? -1 : 1), 1] });
    }
    // falling pins take neighbours with them: towards the side they were pushed to and backwards, harder throws carry further
    const q = hit.slice();
    for (const h of hit) {
      up[h.i] = false;
      fallen.push(h.i);
    }
    while (q.length) {
      const h = q.shift(),
        p = PINS[h.i];
      for (let j = 0; j < PINS.length; j++) {
        if (!up[j]) continue;
        const o = PINS[j],
          dx = o.x - p.x,
          dy = o.y - p.y,
          d = Math.hypot(dx, dy);
        if (d > 0.56 || dy < -0.05) continue;
        const side = dx * h.d[0] >= -0.01 ? 1 : 0.35,
          pr = (d < 0.3 ? 0.62 : 0.3) * side * (0.55 + 0.6 * k);
        if (R() < pr) {
          up[j] = false;
          fallen.push(j);
          q.push({ i: j, d: [Math.sign(dx) || h.d[0], 1] });
        }
      }
    }
    return { fallen, rinne: false };
  }
  // ---- Angeln an der Talsperre: what bites ----
  // fish of the reservoir with the months they bite best (1 … 12), the hours, the bait, weight (kg) and what the fishmonger pays
  const FISCH = {
    karpfen: {
      name: 'Karpfen',
      mon: [5, 6, 7, 8, 9],
      h: [5, 10, 18, 23],
      koeder: 'mais',
      kg: [1.8, 7.5],
      eur: 4.5,
      zug: 0.9,
    },
    schleie: {
      name: 'Schleie',
      mon: [5, 6, 7, 8],
      h: [4, 9, 19, 23],
      koeder: 'wurm',
      kg: [0.5, 1.8],
      eur: 6,
      zug: 0.55,
    },
    rotauge: {
      name: 'Rotauge',
      mon: [3, 4, 5, 6, 7, 8, 9, 10],
      h: [6, 20],
      koeder: 'made',
      kg: [0.1, 0.4],
      eur: 2,
      zug: 0.25,
    },
    barsch: {
      name: 'Flussbarsch',
      mon: [4, 5, 6, 7, 8, 9, 10, 11],
      h: [6, 20],
      koeder: 'wurm',
      kg: [0.2, 0.9],
      eur: 7,
      zug: 0.45,
    },
    hecht: {
      name: 'Hecht',
      mon: [5, 9, 10, 11, 12],
      h: [6, 11, 15, 19],
      koeder: 'blinker',
      kg: [1.5, 6],
      eur: 9,
      zug: 1,
    },
    zander: {
      name: 'Zander',
      mon: [6, 7, 8, 9, 10, 11],
      h: [19, 24, 0, 5],
      koeder: 'blinker',
      kg: [1, 4],
      eur: 14,
      zug: 0.8,
    },
    aal: { name: 'Aal', mon: [5, 6, 7, 8, 9], h: [21, 24, 0, 4], koeder: 'wurm', kg: [0.3, 1.2], eur: 16, zug: 0.7 },
  };
  const inH = (h, a) => {
    for (let i = 0; i + 1 < a.length; i += 2) if (h >= a[i] && h < a[i + 1]) return true;
    return false;
  };
  // the chance per species at this month, hour and bait (weights, not yet normalised)
  function biss(mon, hour, koeder) {
    const out = {};
    for (const [k, f] of Object.entries(FISCH)) {
      let w = f.mon.includes(mon) ? 1 : 0.12;
      w *= inH(hour, f.h) ? 1 : 0.25;
      w *= f.koeder === koeder ? 1 : 0.15;
      out[k] = w;
    }
    return out;
  }
  // one bite: which fish and how heavy (null: nothing bites this time)
  function fang(mon, hour, koeder, seed) {
    const R = rng(seed),
      W = biss(mon, hour, koeder),
      sum = Object.values(W).reduce((a, b) => a + b, 0);
    if (R() > Math.min(0.92, 0.25 + sum * 0.4)) return null;
    let x = R() * sum;
    for (const [k, w] of Object.entries(W)) {
      x -= w;
      if (x <= 0) {
        const f = FISCH[k],
          kg = Math.round((f.kg[0] + (f.kg[1] - f.kg[0]) * Math.pow(R(), 2.2)) * 100) / 100;
        return {
          art: k,
          name: f.name,
          kg,
          eur: Math.round(kg * f.eur * 100) / 100,
          zug: f.zug * (0.7 + 0.6 * (kg / f.kg[1])),
        };
      }
    }
    return null;
  }
  return { rng, PINS, wurf, FISCH, biss, fang };
})();
if (typeof window !== 'undefined') window.GLNLOGIK = GLNLOGIK;
