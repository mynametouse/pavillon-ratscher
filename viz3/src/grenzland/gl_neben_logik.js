// ===================== feat/grenzland: skittles, fishing and the shop on wheels as pure logic (GLNLOGIK) =====================
// No imports, no scene: unit tests in viz3/test/unit/grenzland_neben.test.mjs. A throw on a Thuringian Kegelbahn (nine pins in a
// diamond, five throws „in die Vollen“), what bites at the reservoir by month, hour and bait, the fight with the fish on the line,
// and the shop on wheels (goods, opening hours, what it pays for fish). Everything with a small seeded random, so that a test and a
// replay see the same throw and the same fish. Sources and what is confirmed: docs/features/grenzland-neben.md.
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ---- Kegeln (nine pins in a diamond, as on a Thuringian Kegelbahn): one throw ----
  // the lane as on a classic alley: 19.5 m from the foul line to the first pin, 1.5 m wide, a gutter on each side; the ball 16 cm,
  // a pin 10 cm at its belly; pins: x across (m), y along
  const BAHN = { L: 19.5, W: 1.5, ball: 0.08, pin: 0.05, tief: 0.87 };
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
  // the ball's way: a line with a little curve from the spin (more at a slow throw). Returns x across at s metres from the foul line.
  function bahn(aim, dir, drall, kraft) {
    const k = clamp(kraft, 0.3, 1),
      L = BAHN.L;
    return s => aim + Math.tan(dir) * s + drall * 0.22 * (1.25 - k) * Math.pow(s / L, 2);
  }
  // how fast the ball rolls (m/s) at a strength of 0.3 … 1
  const tempo = kraft => 4.2 + 6.3 * clamp(kraft, 0.3, 1);
  // aim: where the ball is let go across the lane (m, 0 = middle), dir: its angle (rad, + to the right), drall: side spin (−1 … 1),
  // kraft: 0.3 … 1; standing: which of the nine still stand. On the pin deck the ball and the pins are discs that push one another
  // (seen from above): a pin the ball or a flying pin hits hard enough falls and slides on, into its neighbours; a hit a little beside
  // the middle of the front pin clears the most, as on a real alley. Returns
  //   { fallen: [indices], rinne: true if it ran off the lane before the pins („Pudel“), aus: metres from the foul line where it left
  //     the lane (or null), sek: seconds until the ball is at the pin deck (or at the gutter's end), falls: [{ i, t, dx, dy, x, y }] –
  //     when (seconds after the ball reaches the deck) and to which side each pin tips and where it comes to rest (deck metres),
  //     kugel: [[t, x, y] …] the ball's way over the deck, stand: which pins stand afterwards }
  const DECK = { y0: -0.35, wand: 0.95, hinten: BAHN.tief + 0.5 };
  function wurf(aim, dir, drall, kraft, standing, seed) {
    const R = rng(seed),
      L = BAHN.L,
      k = clamp(kraft, 0.3, 1),
      v = tempo(k),
      X = bahn(aim, dir, drall, k),
      fallen = [],
      falls = [],
      kugel = [];
    // where the ball leaves the lane (its middle over the edge)
    let aus = null;
    for (let s = 0; s <= L - 0.6; s += 0.25)
      if (Math.abs(X(s)) > BAHN.W / 2) {
        aus = s;
        break;
      }
    const pins = PINS.map((p, i) => {
      const da = !standing || !!standing[i];
      return {
        i,
        x: p.x + (R() - 0.5) * 0.024,
        y: p.y + (R() - 0.5) * 0.024,
        vx: 0,
        vy: 0,
        r: BAHN.pin,
        m: 0.6,
        up: da,
        da,
      };
    });
    if (aus !== null) return { fallen, rinne: true, aus, sek: (L + 1.2) / v, falls, kugel, stand: pins.map(p => p.up) };
    const s0 = L + DECK.y0,
      sl = (X(s0 + 0.05) - X(s0 - 0.05)) / 0.1,
      nn = Math.hypot(sl, 1),
      B = {
        x: X(s0) + (R() - 0.5) * 0.02,
        y: DECK.y0,
        vx: (v * sl) / nn,
        vy: v / nn,
        r: BAHN.ball,
        m: 1,
        da: true,
        ball: true,
      },
      all = [B, ...pins],
      dt = 1 / 400;
    let t = 0,
      nextK = 0;
    const hitPin = (p, dv, vx, vy) => {
      if (!p.up) return;
      if (dv > 0.5) {
        p.up = false;
        p.r = 0.095; // a pin lying down sweeps wider
        fallen.push(p.i);
        const l = Math.hypot(vx, vy) || 1;
        falls.push({ i: p.i, t, dx: vx / l, dy: vy / l, x: p.x, y: p.y });
      } else {
        // only wobbles
        p.vx = 0;
        p.vy = 0;
      }
    };
    for (let n = 0; n < 720; n++) {
      t = n * dt;
      if (B.da && t >= nextK) {
        kugel.push([Math.round(t * 1000) / 1000, Math.round(B.x * 1000) / 1000, Math.round(B.y * 1000) / 1000]);
        nextK += 0.02;
      }
      let moving = B.da;
      for (const b of all) {
        if (!b.da || (!b.vx && !b.vy)) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (!b.ball) {
          const sp = Math.hypot(b.vx, b.vy),
            s1 = Math.max(0, sp - 6 * dt);
          b.vx *= sp > 0 ? s1 / sp : 0;
          b.vy *= sp > 0 ? s1 / sp : 0;
          if (s1 > 0.02) moving = true;
          else b.vx = b.vy = 0;
        }
        // the boards beside the deck, the mat behind it
        if (Math.abs(b.x) > DECK.wand - b.r) {
          b.x = Math.sign(b.x) * (DECK.wand - b.r);
          b.vx *= -0.35;
        }
        if (b.y > DECK.hinten - b.r) {
          if (b.ball) b.da = false;
          else {
            b.y = DECK.hinten - b.r;
            b.vy *= -0.15;
          }
        }
      }
      for (let i = 0; i < all.length; i++) {
        const a = all[i];
        if (!a.da) continue;
        for (let j = i + 1; j < all.length; j++) {
          const b = all[j];
          if (!b.da) continue;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            rr = a.r + b.r;
          if (dx * dx + dy * dy >= rr * rr) continue;
          const d = Math.hypot(dx, dy) || 1e-6,
            nx = dx / d,
            ny = dy / d,
            vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          // apart again, by their weights
          const ov = rr - d,
            wa = b.m / (a.m + b.m);
          a.x -= nx * ov * wa;
          a.y -= ny * ov * wa;
          b.x += nx * ov * (1 - wa);
          b.y += ny * ov * (1 - wa);
          if (vn <= 0) continue;
          const e = a.ball ? 0.72 : 0.55,
            J = ((1 + e) * vn) / (1 / a.m + 1 / b.m);
          a.vx -= (J / a.m) * nx;
          a.vy -= (J / a.m) * ny;
          b.vx += (J / b.m) * nx;
          b.vy += (J / b.m) * ny;
          if (!a.ball) hitPin(a, J / a.m, a.vx, a.vy);
          hitPin(b, J / b.m, b.vx, b.vy);
        }
      }
      if (!moving && t > 0.2) break;
    }
    for (const f of falls) {
      const p = pins[f.i];
      f.x = Math.round(p.x * 1000) / 1000;
      f.y = Math.round(p.y * 1000) / 1000;
      f.t = Math.round(f.t * 1000) / 1000;
    }
    return { fallen, rinne: false, aus: null, sek: s0 / v, falls, kugel, stand: pins.map(p => p.up) };
  }
  // a game: five throws „in die Vollen“ (all nine are set up again for every throw), the sum counts (45 at best)
  const WUERFE = 5;
  const summe = a => a.reduce((s, n) => s + n, 0);
  // how the one of the clique throws (stufe 0 … 1: how steady his arm is): the values of a throw, to be given to wurf()
  function gegner(stufe, seed) {
    const R = rng(seed),
      g = () => R() + R() + R() - 1.5, // roughly a bell between −1.5 and 1.5
      w = 1.25 - clamp(stufe, 0, 1);
    return {
      aim: (R() < 0.5 ? -0.11 : 0.11) + g() * 0.1 * w,
      dir: g() * 0.006 * w,
      drall: g() * 0.3 * w,
      kraft: clamp(0.78 + g() * 0.14, 0.4, 1),
    };
  }
  // what a throw is called
  const ruf = (n, rinne) =>
    rinne
      ? 'Pudel!'
      : n === 9
        ? 'Alle Neune!'
        : n === 0
          ? 'Vorbei.'
          : n === 8
            ? 'Acht – einer steht noch.'
            : n + ' Holz.';
  // ---- Angeln an der Talsperre: what bites ----
  // Fish with the months they bite best (1 … 12; outside them they still bite, less), the hours, the baits (how well each is taken),
  // weight (kg), what a kilo is worth, how hard they pull. belegt: named for the Talsperre Ratscher by an anglers' register (carp and silver carp); the others are the usual fish of
  // the reservoirs and ponds around Schleusingen (perch and zander in the Talsperre Erletor, pike in the Erle, tench in the town's
  // ponds) – not confirmed for this water. The silver carp lives on plankton and takes a bait only by accident.
  const FISCH = {
    karpfen: {
      name: 'Karpfen',
      mon: [4, 5, 6, 7, 8, 9, 10],
      h: [5, 10, 18, 23],
      koeder: { mais: 1, wurm: 0.35 },
      kg: [1.2, 9],
      eur: 4.5,
      zug: 0.9,
      belegt: true,
    },
    silberkarpfen: {
      name: 'Silberkarpfen',
      mon: [6, 7, 8, 9],
      h: [10, 18],
      koeder: { mais: 1, wurm: 0.3 },
      kg: [3, 14],
      eur: 1.5,
      zug: 1.1,
      selten: 0.1,
      belegt: true,
    },
    schleie: {
      name: 'Schleie',
      mon: [5, 6, 7, 8],
      h: [4, 9, 19, 23],
      koeder: { wurm: 1, mais: 0.4 },
      kg: [0.5, 1.8],
      eur: 6,
      zug: 0.55,
    },
    rotauge: {
      name: 'Rotauge',
      mon: [3, 4, 5, 6, 7, 8, 9, 10],
      h: [6, 20],
      koeder: { mais: 1, wurm: 1 },
      kg: [0.1, 0.4],
      eur: 2,
      zug: 0.25,
      selten: 0.45,
    },
    barsch: {
      name: 'Flussbarsch',
      mon: [4, 5, 6, 7, 8, 9, 10, 11],
      h: [6, 20],
      koeder: { wurm: 1, blinker: 0.8 },
      kg: [0.2, 0.9],
      eur: 7,
      zug: 0.45,
    },
    hecht: {
      name: 'Hecht',
      mon: [5, 9, 10, 11, 12],
      h: [6, 11, 15, 19],
      koeder: { blinker: 1 },
      kg: [1.5, 6],
      eur: 9,
      zug: 1,
    },
    zander: {
      name: 'Zander',
      mon: [6, 7, 8, 9, 10, 11],
      h: [19, 24, 0, 5],
      koeder: { blinker: 1, wurm: 0.15 },
      kg: [1, 4],
      eur: 14,
      zug: 0.8,
    },
  };
  const KOEDER = { mais: 'Mais', wurm: 'Tauwurm', blinker: 'Blinker' };
  const inH = (h, a) => {
    for (let i = 0; i + 1 < a.length; i += 2) if (h >= a[i] && h < a[i + 1]) return true;
    return false;
  };
  // the chance per species at this month, hour and bait (weights, not yet normalised)
  function biss(mon, hour, koeder) {
    const out = {};
    for (const [k, f] of Object.entries(FISCH)) {
      let w = f.mon.includes(mon) ? 1 : 0.4;
      w *= inH(hour, f.h) ? 1 : 0.25;
      w *= f.koeder[koeder] || 0.02;
      w *= f.selten || 1;
      out[k] = w;
    }
    return out;
  }
  // the thing a fish becomes in the rucksack: a carp of two kilos or more is its own thing (the cook in Suhl asks for one)
  const ding = (art, kg) => (art === 'karpfen' && kg >= 2 ? 'karpfen_gross' : art);
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
          ding: ding(k, kg),
        };
      }
    }
    return null;
  }
  // how long the float lies still before something happens (seconds), and when it only twitches before (a nibble: striking then
  // scares the fish). More fish about: a shorter wait.
  function warte(mon, hour, koeder, seed) {
    const R = rng(seed ^ 0x5bd1e995),
      sum = Object.values(biss(mon, hour, koeder)).reduce((a, b) => a + b, 0),
      sek = clamp((7 + 22 * R()) / (0.45 + Math.min(1.6, sum)), 5, 48),
      zupfer = [];
    for (let i = 0, n = R() < 0.55 ? 1 : R() < 0.5 ? 2 : 0; i < n; i++) zupfer.push(sek * (0.25 + 0.5 * R()));
    zupfer.sort((a, b) => a - b);
    return { sek, zupfer };
  }
  const ANHIEB = 1.5; // seconds to strike once the float has gone under
  // ---- the fight: keep the line's tension in a band until the fish is at the jetty ----
  // D: { dist (m of line out), sp (tension 0 … 1), kraft (what the fish has left, 1 → 0), ruck (it pulls hard right now), … }
  const BAND = [0.28, 0.82];
  function drillNeu(f, seed) {
    const R = rng((seed ^ 0x2545f491) >>> 0);
    return {
      R,
      zug: clamp(f.zug, 0.12, 1.5),
      dist: 8 + 6 * R(),
      dist0: 0,
      sp: 0.5,
      kraft: 1,
      ruck: false,
      ruckT: 1 + 1.5 * R(),
      ueber: 0,
      schlaff: 0,
      t: 0,
      st: 'läuft',
    };
  }
  // one step. kurbeln: the reel is turned. Returns 'läuft' | 'gelandet' | 'riss' (the line broke) | 'ab' (the fish got off)
  function drill(D, dt, kurbeln) {
    if (D.st !== 'läuft') return D.st;
    if (!D.dist0) D.dist0 = D.dist;
    D.t += dt;
    // the fish pulls in bursts, weaker as it tires
    D.ruckT -= dt;
    if (D.ruckT <= 0) {
      D.ruck = !D.ruck;
      D.ruckT = D.ruck ? 0.8 + 1.0 * D.R() : 1.4 + 2.2 * D.R();
    }
    const p = D.zug * (D.ruck ? 1 : 0.35) * (0.4 + 0.6 * D.kraft),
      ziel = kurbeln ? 0.42 + p * 0.75 : p * 0.45 - 0.1;
    D.sp = clamp(D.sp + (ziel - D.sp) * Math.min(1, dt * 3.2), 0, 1.15);
    if (kurbeln) D.dist -= (1.7 - 1.4 * Math.min(1, p)) * dt;
    else D.dist += p * 1.3 * dt;
    D.kraft = Math.max(0, D.kraft - dt * (0.035 + 0.11 * Math.min(1, D.sp)));
    // too tight for too long: the line breaks; slack for too long: the hook comes out; all the line out: gone
    D.ueber = D.sp > 0.93 ? D.ueber + dt : Math.max(0, D.ueber - dt * 0.6);
    D.schlaff = D.sp < 0.14 ? D.schlaff + dt : Math.max(0, D.schlaff - dt * 0.6);
    if (D.ueber > 0.6) D.st = 'riss';
    else if (D.schlaff > 1.7 || D.dist > 26) D.st = 'ab';
    else if (D.dist <= 0.6) D.st = 'gelandet';
    return D.st;
  }
  // ---- the shop on wheels: goods (prices in euros), opening hours by the game clock, what it pays for fish ----
  // sofort: eaten or drunk at once; n: how many one gets; einmal: only once; unter: under the counter (only for those who are known);
  // gut: what it does for the buyer
  const WAREN = [
    {
      k: 'bratwurst',
      name: 'Rostbratwurst im Brötchen',
      eur: 2.5,
      sofort: true,
      gut: 'Mit Senf. Über Ketchup wird hier nicht gesprochen.',
    },
    { k: 'kaffee', name: 'Filterkaffee', eur: 1.5, sofort: true, gut: 'Heiß, schwarz, ehrlich.' },
    { k: 'milchreis', name: 'Milchreis (500 g)', eur: 1.29 },
    { k: 'worcester', name: 'Worcestersauce Dresdner Art', eur: 2.49 },
    { k: 'mais', name: 'Dosenmais (Angelköder)', eur: 0.99, n: 5 },
    { k: 'wurm', name: 'Tauwürmer (Angelköder)', eur: 2.9, n: 5 },
    { k: 'blinker', name: 'Blinker', eur: 4.5, n: 3 },
    { k: 'angelkarte', name: 'Gastkarte Talsperre (Angelerlaubnis)', eur: 8, einmal: true },
    { k: 'boeller', name: 'Böller „aus dem Kofferraum“', eur: 6, n: 4, unter: true },
  ];
  // open in the morning and in the late afternoon (minutes of the day)
  const ZEITEN = [
    [8 * 60, 11 * 60 + 30],
    [15 * 60 + 30, 18 * 60 + 30],
  ];
  const minOf = t => ((Math.floor(t) % 1440) + 1440) % 1440;
  const offen = t => ZEITEN.some(z => minOf(t) >= z[0] && minOf(t) < z[1]);
  const hm = m => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  const zeitenText = () => ZEITEN.map(z => hm(z[0]) + '–' + hm(z[1])).join(' und ') + ' Uhr';
  // minutes until it opens next (0: open now)
  function bisOffen(t) {
    if (offen(t)) return 0;
    const m = minOf(t);
    let best = 1e9;
    for (const z of ZEITEN) best = Math.min(best, (z[0] - m + 1440) % 1440);
    return best;
  }
  const euro = n => n.toFixed(2).replace('.', ',') + ' €';
  // a basket of goods ({ k: count }): the sum, and what is paid – she has no small change, so it is rounded up to whole euros
  function korb(k) {
    let sum = 0;
    for (const w of WAREN) sum += (k[w.k] || 0) * w.eur;
    sum = Math.round(sum * 100) / 100;
    return { sum, zahlen: Math.max(0, Math.ceil(sum - 1e-9)) };
  }
  // what she pays for a fish (per piece, whole euros): by the middle weight of its kind
  const ANKAUF = {
    karpfen: 6,
    karpfen_gross: 16,
    silberkarpfen: 9,
    schleie: 7,
    rotauge: 1,
    barsch: 4,
    hecht: 24,
    zander: 28,
  };
  const FISCHNAME = Object.assign(
    { karpfen_gross: 'Karpfen (ab 2 kg)' },
    Object.fromEntries(Object.entries(FISCH).map(([k, f]) => [k, f.name]))
  );
  // the fish in a rucksack (inv: { thing: count }); keep: things not to sell ({ thing: count }). Returns { n, eur, liste: [[thing, count]] }
  function ankauf(inv, keep = {}) {
    let n = 0,
      eur = 0;
    const liste = [];
    for (const [k, p] of Object.entries(ANKAUF)) {
      const c = Math.max(0, Math.floor((inv[k] || 0) - (keep[k] || 0)));
      if (!c) continue;
      n += c;
      eur += c * p;
      liste.push([k, c]);
    }
    return { n, eur, liste };
  }
  return {
    rng,
    BAHN,
    PINS,
    bahn,
    tempo,
    wurf,
    WUERFE,
    summe,
    gegner,
    ruf,
    FISCH,
    KOEDER,
    biss,
    ding,
    fang,
    warte,
    ANHIEB,
    BAND,
    drillNeu,
    drill,
    WAREN,
    ZEITEN,
    minOf,
    offen,
    bisOffen,
    zeitenText,
    euro,
    korb,
    ANKAUF,
    FISCHNAME,
    ankauf,
  };
})();
if (typeof window !== 'undefined') window.GLNLOGIK = GLNLOGIK;
