// ===================== feat/laeden-innen 2: supermarket, discounter, drinks market, petrol station shop, bakery, pharmacy (LIMARKT) =====================
// Pure layouts (no three.js, no DOM – node tests: viz3/test/unit/laeden_innen.test.mjs) after photos of such shops in Germany, generic –
// no chain's design: produce at the entrance, rows of shelves perpendicular to the front, chillers along the back wall, chest freezers,
// the bakery corner, the bottle return, checkouts with belts at the exit; goods as plain packaging (boxes, bottles, cans, bags in muted
// colours, no labels, no brands). Each layout writes into a plan of laeden/innen_plan.js (LIPLAN.newPlan / LIPLAN.kit).
import { LIPLAN } from './innen_plan.js';
export const LIMARKT = (() => {
  const { L, rnd, hash, kit } = LIPLAN;
  // ---- colours (linear) ----
  const C = {
    floorA: L(0.74, 0.72, 0.68), // light terrazzo tiles
    floorB: L(0.69, 0.67, 0.63),
    wall: L(0.86, 0.86, 0.84),
    skirt: L(0.35, 0.35, 0.36),
    ceil: L(0.86, 0.86, 0.85),
    shelf: L(0.78, 0.79, 0.8), // light grey steel
    shelfD: L(0.42, 0.43, 0.45), // the plinth, the back's dark parts
    back: L(0.72, 0.73, 0.74),
    rail: L(0.95, 0.95, 0.93), // the price rail
    tag: L(0.98, 0.97, 0.9),
    tagD: L(0.12, 0.12, 0.12),
    chill: L(0.86, 0.87, 0.88),
    chillIn: L(0.94, 0.95, 0.96),
    chillD: L(0.25, 0.26, 0.28),
    glassF: L(0.5, 0.55, 0.58), // a glass door's frame
    belt: L(0.12, 0.12, 0.13),
    counter: L(0.78, 0.78, 0.77),
    counterD: L(0.3, 0.31, 0.33),
    seat: L(0.18, 0.19, 0.22),
    screen: [0.32, 0.5, 0.62],
    wood: L(0.62, 0.48, 0.33),
    woodD: L(0.42, 0.3, 0.2),
    bread: L(0.72, 0.5, 0.28),
    breadD: L(0.55, 0.35, 0.18),
    pallet: L(0.66, 0.55, 0.4),
    crateA: L(0.18, 0.35, 0.22),
    crateB: L(0.55, 0.12, 0.1),
    crateC: L(0.75, 0.62, 0.15),
    crateD: L(0.15, 0.22, 0.42),
    trolley: L(0.7, 0.71, 0.72),
    green: L(0.25, 0.45, 0.2),
    lamp: [2.6, 2.55, 2.4], // a light panel's glow (unlit colours over 1)
    lampDim: [1.2, 1.18, 1.1],
  };
  // the bands on the walls over the departments
  const BAND = {
    Molkerei: L(0.55, 0.68, 0.8),
    Käse: L(0.86, 0.76, 0.48),
    'Wurst · Fleisch': L(0.74, 0.5, 0.46),
    Getränke: L(0.5, 0.7, 0.72),
    Haushalt: L(0.78, 0.74, 0.62),
  };
  // goods: muted palettes per kind of product – no brand's colours, no designs
  const PAL = {
    kaffee: [L(0.42, 0.26, 0.16), L(0.62, 0.15, 0.12), L(0.75, 0.6, 0.3), L(0.2, 0.18, 0.16), L(0.85, 0.8, 0.7)],
    fruehstueck: [L(0.85, 0.65, 0.2), L(0.75, 0.25, 0.2), L(0.3, 0.45, 0.7), L(0.88, 0.85, 0.75), L(0.45, 0.6, 0.3)],
    konserven: [L(0.7, 0.7, 0.72), L(0.75, 0.3, 0.2), L(0.35, 0.55, 0.3), L(0.85, 0.75, 0.3), L(0.6, 0.62, 0.65)],
    nudeln: [L(0.9, 0.78, 0.3), L(0.3, 0.42, 0.68), L(0.88, 0.86, 0.8), L(0.7, 0.3, 0.2), L(0.4, 0.6, 0.35)],
    gewuerze: [L(0.55, 0.62, 0.3), L(0.7, 0.55, 0.2), L(0.6, 0.2, 0.15), L(0.85, 0.8, 0.6), L(0.25, 0.35, 0.2)],
    suess: [L(0.85, 0.3, 0.45), L(0.4, 0.25, 0.6), L(0.9, 0.7, 0.2), L(0.45, 0.25, 0.15), L(0.3, 0.55, 0.75)],
    knabber: [L(0.9, 0.75, 0.2), L(0.75, 0.2, 0.15), L(0.3, 0.5, 0.75), L(0.35, 0.6, 0.3), L(0.6, 0.35, 0.7)],
    backen: [L(0.92, 0.9, 0.84), L(0.85, 0.72, 0.55), L(0.75, 0.25, 0.2), L(0.3, 0.45, 0.65)],
    drogerie: [L(0.6, 0.75, 0.85), L(0.92, 0.92, 0.94), L(0.85, 0.55, 0.7), L(0.45, 0.7, 0.55), L(0.3, 0.4, 0.7)],
    haushalt: [L(0.3, 0.55, 0.8), L(0.85, 0.85, 0.88), L(0.4, 0.7, 0.4), L(0.85, 0.5, 0.2), L(0.7, 0.2, 0.25)],
    tier: [L(0.65, 0.45, 0.25), L(0.3, 0.45, 0.6), L(0.75, 0.2, 0.2), L(0.85, 0.75, 0.45), L(0.35, 0.55, 0.35)],
    wein: [L(0.12, 0.22, 0.12), L(0.35, 0.18, 0.1), L(0.78, 0.75, 0.6), L(0.25, 0.08, 0.1), L(0.1, 0.12, 0.1)],
    wasser: [L(0.6, 0.78, 0.9), L(0.55, 0.75, 0.85), L(0.75, 0.85, 0.92), L(0.35, 0.6, 0.35), L(0.85, 0.6, 0.25)],
    milch: [L(0.95, 0.95, 0.95), L(0.4, 0.6, 0.85), L(0.9, 0.85, 0.55), L(0.85, 0.4, 0.4), L(0.5, 0.75, 0.5)],
    kaese: [L(0.95, 0.8, 0.35), L(0.9, 0.88, 0.75), L(0.85, 0.3, 0.25), L(0.4, 0.55, 0.3), L(0.3, 0.45, 0.7)],
    wurst: [L(0.75, 0.3, 0.3), L(0.85, 0.55, 0.5), L(0.9, 0.88, 0.85), L(0.55, 0.2, 0.15)],
    tk: [L(0.35, 0.55, 0.85), L(0.92, 0.94, 0.96), L(0.8, 0.25, 0.2), L(0.3, 0.6, 0.35), L(0.85, 0.75, 0.3)],
    obst: [
      L(0.75, 0.15, 0.1),
      L(0.9, 0.55, 0.1),
      L(0.9, 0.8, 0.2),
      L(0.35, 0.6, 0.2),
      L(0.55, 0.7, 0.25),
      L(0.45, 0.2, 0.35),
    ],
    gemuese: [
      L(0.3, 0.55, 0.2),
      L(0.85, 0.4, 0.1),
      L(0.75, 0.15, 0.1),
      L(0.6, 0.45, 0.25),
      L(0.85, 0.82, 0.7),
      L(0.4, 0.62, 0.3),
    ],
    tabak: [L(0.85, 0.85, 0.85), L(0.2, 0.2, 0.22), L(0.6, 0.15, 0.15), L(0.25, 0.35, 0.55), L(0.75, 0.7, 0.55)],
    apo: [L(0.95, 0.95, 0.95), L(0.6, 0.78, 0.9), L(0.85, 0.5, 0.5), L(0.5, 0.75, 0.55), L(0.9, 0.85, 0.6)],
  };
  // what each aisle holds: its sign, the palette, the kind of package (box, bottle, can, bag, jar, pack)
  const AISLES = [
    ['Kaffee · Tee', 'kaffee', ['box', 'bag', 'jar']],
    ['Frühstück', 'fruehstueck', ['box', 'jar']],
    ['Konserven', 'konserven', ['can']],
    ['Nudeln · Reis', 'nudeln', ['bag', 'box']],
    ['Gewürze · Öl', 'gewuerze', ['jar', 'bottle']],
    ['Süßwaren', 'suess', ['box', 'bag']],
    ['Knabbereien', 'knabber', ['bag']],
    ['Backzutaten', 'backen', ['bag', 'box']],
    ['Drogerie', 'drogerie', ['bottle', 'box']],
    ['Haushalt', 'haushalt', ['bottle', 'pack', 'box']],
    ['Tierbedarf', 'tier', ['bag', 'can']],
    ['Wein · Sekt', 'wein', ['bottle']],
  ];
  // ---- a double-sided gondola along v from v0 to v1 at u (centre): plinth, back, shelves with price rails, goods on both sides, end caps ----
  function gondola(K, R, u, v0, v1, o) {
    const D = o.d || 1.0,
      H = o.h || 2.0,
      lv = o.levels || [0.14, 0.52, 0.9, 1.28, 1.66],
      aisle = o.aisle || AISLES[0],
      pal = PAL[aisle[1]],
      kinds = aisle[2],
      len = v1 - v0;
    if (len < 1.5) return;
    const vm = (v0 + v1) / 2;
    // the back panel (both faces), the plinth, the top
    K.box(u, vm, 0, 0.06, len, H, C.back, C.shelfD);
    for (const s of [-1, 1]) {
      const uf = u + (s * D) / 2; // the side's front line
      K.box(u + (s * D) / 4, vm, 0, D / 2 - 0.02, len, 0.12, C.shelfD);
      for (const z of lv.slice(1)) {
        // a shelf board and its price rail with tags
        K.box(u + (s * (D / 2 - 0.02)) / 2, vm, z - 0.03, D / 2 - 0.04, len - 0.04, 0.03, C.shelf);
        K.box(uf - s * 0.015, vm, z - 0.055, 0.02, len - 0.04, 0.045, C.rail);
        for (let v = v0 + 0.25; v < v1 - 0.2; v += 0.55 + R() * 0.35)
          K.box(uf - s * 0.004, v, z - 0.05, 0.004, 0.06, 0.03, C.tagD);
      }
      // goods on each level (and on the plinth), their fronts 3 cm behind the rail
      for (let k = 0; k < lv.length; k++) {
        const z = k === 0 ? 0.12 : lv[k],
          top = k + 1 < lv.length ? lv[k + 1] - 0.06 : H - 0.08;
        goodsRunV(K, R, u + s * (D / 2 - 0.04), s, v0 + 0.06, v1 - 0.06, z, top - z, D / 2 - 0.1, pal, kinds);
      }
    }
    // the posts every 1.25 m (a gondola's sections)
    for (let v = v0; v <= v1 + 0.01; v += len / Math.max(1, Math.round(len / 1.25)))
      K.box(u, Math.min(v1 - 0.03, Math.max(v0 + 0.03, v)), 0, D - 0.04, 0.05, H - 0.02, C.shelf);
    // end caps: a short shelf across each end with goods facing out
    for (const e of [-1, 1]) {
      const ve = e < 0 ? v0 - 0.3 : v1 + 0.3;
      K.box(u, ve, 0, D, 0.6, 0.12, C.shelfD);
      K.box(u, ve + e * -0.27, 0, D, 0.06, H * 0.8, C.back);
      for (const z of [0.12, 0.6, 1.05])
        goodsRunU(
          K,
          R,
          u - D / 2 + 0.04,
          u + D / 2 - 0.04,
          ve + e * 0.27,
          e,
          z + (z > 0.2 ? 0.03 : 0),
          0.38,
          0.45,
          pal,
          kinds
        );
      for (const z of [0.6, 1.05]) K.box(u, ve, z, D - 0.02, 0.5, 0.03, C.shelf);
    }
    K.solid(u, vm, D, len + 1.2);
  }
  // goods along v, their fronts at uF facing dir (±u), d deep behind the fronts
  function goodsRunV(K, R, uF, dir, v0, v1, z, hMax, d, pal, kinds) {
    let v = v0;
    while (v < v1 - 0.08) {
      const kind = kinds[Math.floor(R() * kinds.length)],
        col = pal[Math.floor(R() * pal.length)],
        n = 2 + Math.floor(R() * 5);
      const [w, h0] = sizeOf(kind, R);
      const h = Math.min(hMax, h0);
      const len = Math.min(n * w, v1 - v);
      if (len < w * 0.9) break;
      const m = Math.max(1, Math.round(len / w));
      const stack = (kind === 'can' || kind === 'jar') && hMax > h * 2.2 ? 2 : 1;
      K.good(kind, uF - (dir * d) / 2, v + len / 2, z, 'v', len, d, h * stack, col, m * stack, dir);
      v += len + 0.012;
    }
  }
  // goods along u facing ±v (end caps, wall shelves): fronts at vF
  function goodsRunU(K, R, u0, u1, vF, dir, z, hMax, d, pal, kinds) {
    let u = u0;
    while (u < u1 - 0.08) {
      const kind = kinds[Math.floor(R() * kinds.length)],
        col = pal[Math.floor(R() * pal.length)],
        n = 2 + Math.floor(R() * 5);
      const [w, h0] = sizeOf(kind, R);
      const h = Math.min(hMax, h0);
      const len = Math.min(n * w, u1 - u);
      if (len < w * 0.9) break;
      const m = Math.max(1, Math.round(len / w));
      const stack = (kind === 'can' || kind === 'jar') && hMax > h * 2.2 ? 2 : 1;
      K.good(kind, u + len / 2, vF - (dir * d) / 2, z, 'u', len, d, h * stack, col, m * stack, dir);
      u += len + 0.012;
    }
  }
  function sizeOf(kind, R) {
    if (kind === 'box') return [0.06 + R() * 0.14, 0.14 + R() * 0.2];
    if (kind === 'bottle') return [0.07 + R() * 0.03, 0.24 + R() * 0.1];
    if (kind === 'can') return [0.075 + R() * 0.02, 0.1 + R() * 0.03];
    if (kind === 'jar') return [0.07 + R() * 0.02, 0.1 + R() * 0.06];
    if (kind === 'pack') return [0.24 + R() * 0.12, 0.22 + R() * 0.12];
    if (kind === 'crate') return [0.3, 0.27];
    return [0.12 + R() * 0.12, 0.16 + R() * 0.12];
  }
  // ---- a wall shelf along u (single-sided, its back to the wall at vB, facing dir) ----
  function wallShelf(K, R, u0, u1, vB, dir, o = {}) {
    const D = o.d || 0.6,
      H = o.h || 2.2,
      lv = o.levels || [0.14, 0.55, 0.95, 1.35, 1.75],
      pal = PAL[o.pal || 'drogerie'],
      kinds = o.kinds || ['box', 'bottle'],
      len = u1 - u0;
    if (len < 1) return;
    const um = (u0 + u1) / 2,
      vf = vB + dir * D;
    K.box(um, vB + dir * 0.03, 0, len, 0.06, H, C.back, C.shelfD);
    K.box(um, vB + (dir * D) / 2, 0, len, D - 0.04, 0.12, C.shelfD);
    for (const z of lv.slice(1)) {
      K.box(um, vB + (dir * (D + 0.02)) / 2, z - 0.03, len - 0.04, D - 0.06, 0.03, C.shelf);
      K.box(um, vf - dir * 0.015, z - 0.055, len - 0.04, 0.02, 0.045, C.rail);
    }
    for (let k = 0; k < lv.length; k++) {
      const z = k === 0 ? 0.12 : lv[k],
        top = k + 1 < lv.length ? lv[k + 1] - 0.06 : H - 0.08;
      goodsRunU(K, R, u0 + 0.05, u1 - 0.05, vf - dir * 0.04, dir, z, top - z, D - 0.12, pal, kinds);
    }
    for (let u = u0; u <= u1 + 0.01; u += len / Math.max(1, Math.round(len / 1.25)))
      K.box(Math.min(u1 - 0.03, Math.max(u0 + 0.03, u)), vB + (dir * D) / 2, 0, 0.05, D, H - 0.02, C.shelf);
    K.solid(um, vB + (dir * D) / 2, len, D + 0.1);
  }
  // ---- a multideck chiller along u, its back at vB, facing dir: open front, lit canopy, dairy on four shelves ----
  function chiller(K, R, u0, u1, vB, dir, pal = PAL.milch, glassDoors = false) {
    const D = 0.95,
      H = 2.05,
      len = u1 - u0,
      um = (u0 + u1) / 2;
    if (len < 1.2) return;
    K.box(um, vB + (dir * D) / 2, 0, len, D, 0.32, C.chillD); // the base with the air grille
    K.box(um, vB + dir * 0.05, 0, len, 0.1, H, C.chill); // the back
    K.box(um, vB + (dir * D) / 2, H - 0.22, len, D, 0.22, C.chill); // the canopy
    K.glow(um, vB + dir * (D - 0.12), H - 0.24, len - 0.1, 0.06, 0.03, C.lamp); // its light strip
    K.box(um, vB + dir * (D - 0.02), 0.32, len, 0.04, 0.08, C.rail); // the front edge of the well
    for (let u = u0; u <= u1 + 0.01; u += len / Math.max(1, Math.round(len / 2.5)))
      K.box(Math.min(u1 - 0.03, Math.max(u0 + 0.03, u)), vB + (dir * D) / 2, 0.32, 0.05, D - 0.05, H - 0.54, C.chill);
    const lv = [0.4, 0.82, 1.16, 1.48];
    lv.forEach((z, k) => {
      const d = 0.62 - k * 0.07; // the shelves step back towards the top
      if (k) {
        K.box(um, vB + dir * (0.12 + d / 2), z - 0.03, len - 0.06, d, 0.03, C.chillIn);
        K.box(um, vB + dir * (0.12 + d - 0.01), z - 0.05, len - 0.06, 0.02, 0.04, C.rail);
      }
      goodsRunU(
        K,
        R,
        u0 + 0.06,
        u1 - 0.06,
        vB + dir * (0.1 + d),
        dir,
        z,
        (lv[k + 1] || 1.82) - z - 0.05,
        d - 0.08,
        pal,
        ['box', 'jar', 'pack']
      );
    });
    if (glassDoors)
      for (let u = u0; u <= u1 + 0.01; u += 0.75) {
        K.box(Math.min(u1 - 0.02, u), vB + dir * D, 0.32, 0.05, 0.05, H - 0.54, C.glassF);
      }
    K.solid(um, vB + (dir * D) / 2, len, D + 0.1);
  }
  // ---- chest freezers in a row along v (an island), glass lids, frozen goods visible from above ----
  function freezers(K, R, u, v0, v1) {
    const W = 1.05,
      H = 0.86,
      len = v1 - v0,
      vm = (v0 + v1) / 2;
    if (len < 2) return;
    K.box(u, vm, 0, W, len, 0.1, C.chillD);
    // the tub: the body up to its inner floor a little below the rim, its walls round it (the lids' glass only as frames)
    K.box(u, vm, 0.1, W, len, H - 0.3, C.chill, C.chillIn);
    for (const s of [-1, 1]) K.box(u + s * (W / 2 - 0.03), vm, H - 0.2, 0.06, len, 0.2, C.chill);
    for (const v of [v0 + 0.03, v1 - 0.03]) K.box(u, v, H - 0.2, W - 0.12, 0.06, 0.2, C.chill);
    for (const s of [-1, 1]) K.box(u + s * (W / 2), vm, H, 0.08, len + 0.06, 0.04, C.rail); // the bumper rim
    for (const v of [v0, v1]) K.box(u, v, H, W + 0.06, 0.08, 0.04, C.rail);
    for (let v = v0; v <= v1 + 0.01; v += len / Math.max(1, Math.round(len / 2.5)))
      K.box(u, Math.min(v1 - 0.03, Math.max(v0 + 0.03, v)), H, W, 0.05, 0.05, C.glassF);
    K.box(u, vm, H, 0.05, len, 0.05, C.glassF);
    // the goods inside, seen through the lids (lying a little below the rim)
    for (const s of [-1, 1]) {
      let v = v0 + 0.08;
      while (v < v1 - 0.15) {
        const l = 0.2 + R() * 0.5,
          col = PAL.tk[Math.floor(R() * PAL.tk.length)];
        const ll = Math.min(l, v1 - 0.08 - v);
        K.good(
          'box',
          u + s * 0.25,
          v + ll / 2,
          H - 0.18,
          'v',
          ll,
          0.42,
          0.12,
          col,
          Math.max(1, Math.round(ll / 0.14)),
          s
        );
        v += ll + 0.02;
      }
    }
    K.solid(u, vm, W + 0.1, len + 0.1);
  }
  // ---- a checkout: the counter along v (from v0, length 4.4 m), the belt, the scanner, the till, the cashier's seat, a small rack ----
  function checkout(K, R, u, v0, n, side = 1) {
    const W = 0.95,
      Lc = 4.4,
      vm = v0 + Lc / 2;
    K.box(u, vm, 0, W, Lc, 0.86, C.counter, C.counterD);
    K.box(u, v0 + 1.35, 0.86, W - 0.12, 2.5, 0.02, C.belt); // the belt (the first part)
    K.box(u, v0 + 2.75, 0.865, W - 0.2, 0.36, 0.01, L(0.2, 0.25, 0.3)); // the scanner's glass
    K.box(u, v0 + 3.6, 0.86, W, 1.6, 0.02, C.counter); // where the goods are packed
    K.box(u + side * 0.25, v0 + 2.6, 0.88, 0.3, 0.28, 0.18, C.counterD); // the till
    K.glow(u + side * 0.25, v0 + 2.6 - 0.15, 1.06, 0.26, 0.02, 0.18, C.screen, 0); // its screen
    // the cashier's seat in the gap beside the counter (side +1: towards +u)
    K.box(u + side * (W / 2 + 0.38), v0 + 2.5, 0, 0.42, 0.42, 0.55, C.seat);
    K.box(u + side * (W / 2 + 0.58), v0 + 2.5, 0.55, 0.06, 0.42, 0.45, C.seat);
    // a small rack of sweets at the start of the queue: its back, three boards, the sweets on them
    const ur = u - side * (W / 2 + 0.25);
    K.box(ur + side * 0.14, v0 + 0.6, 0, 0.12, 1.0, 1.3, C.shelfD);
    for (const z of [0.35, 0.7, 1.05]) {
      K.box(ur - side * 0.02, v0 + 0.6, z - 0.02, 0.3, 1.0, 0.02, C.shelf);
      goodsRunV(K, R, ur - side * 0.17, -side, v0 + 0.15, v0 + 1.05, z, 0.2, 0.2, PAL.suess, ['box']);
    }
    // the number on a pole
    K.box(u + side * (W / 2 - 0.08), v0 + 0.1, 0.86, 0.05, 0.05, 1.3, C.counterD);
    K.sign(['Kasse ' + n], u + side * (W / 2 - 0.08), v0 + 0.1 - 0.04, 2.0, 0.55, 0.32, -1, 2, true);
    K.solid(u, vm, W + 0.1, Lc);
    K.spot('kasse', u + side * (W / 2 + 0.38), v0 + 2.5, [-side, 0]);
  }
  // ---- produce: angled display tables with crates of fruit and vegetables (spheres as small boxes in heaps), a wall rack ----
  function produceTable(K, R, u, v, w, l, ang = 0) {
    K.box(u, v, 0, w, l, 0.72, C.woodD, C.wood, ang);
    const nw = Math.max(1, Math.round(w / 0.42)),
      nl = Math.max(1, Math.round(l / 0.62));
    const c = Math.cos(ang),
      s = Math.sin(ang);
    for (let i = 0; i < nw; i++)
      for (let j = 0; j < nl; j++) {
        const du = -w / 2 + (i + 0.5) * (w / nw),
          dv = -l / 2 + (j + 0.5) * (l / nl),
          cu = u + du * c - dv * s,
          cv = v + du * s + dv * c,
          pal = R() < 0.5 ? PAL.obst : PAL.gemuese,
          col = pal[Math.floor(R() * pal.length)];
        K.box(cu, cv, 0.72, w / nw - 0.03, l / nl - 0.03, 0.1, C.wood, C.woodD, ang); // the crate
        K.good('heap', cu, cv, 0.78, 'u', w / nw - 0.08, l / nl - 0.08, 0.12 + R() * 0.06, col, 1, 0, ang);
      }
    K.solid(u, v, w + 0.1, l + 0.1, ang);
  }
  // ---- trolleys standing in a row (nested), one alone ----
  function trolleys(K, u, v, n, ang = 0) {
    for (let i = 0; i < n; i++) K.trolley(u + Math.cos(ang) * i * 0.32, v + Math.sin(ang) * i * 0.32, ang);
  }
  // ---- the bottle return machine in a wall (its front at vF facing dir) ----
  function pfand(K, u, vF, dir) {
    K.box(u, vF - dir * 0.35, 0, 0.95, 0.7, 1.95, C.counter, C.counterD);
    K.box(u, vF + dir * 0.005, 0.9, 0.3, 0.01, 0.3, L(0.05, 0.05, 0.06)); // the round slot (dark)
    K.glow(u + 0.32, vF + dir * 0.006, 1.35, 0.22, 0.01, 0.16, C.screen);
    K.box(u, vF + dir * 0.005, 0.25, 0.6, 0.01, 0.35, L(0.4, 0.42, 0.44)); // the crate door
    K.sign(['Leergut'], u, vF + dir * 0.01, 2.0, 0.8, 0.22, dir, 1);
  }

  // ---- the layout of a supermarket (EDEKA, REWE) or a discounter (Aldi, Lidl) in its unit ----
  function markt(P, u) {
    const disc = u.type === 'discounter',
      R = rnd(hash(u.id) + 11),
      door = u.doors[0],
      G = LIPLAN.store(u, door, hallFrame),
      { F, polys, U0, U1, de } = G,
      K = kit(P, F, 0),
      O = LIPLAN.occ();
    const hallH = G.hall.h,
      ceil = Math.min(hallH - 1.6, disc ? 4.2 : 4.6);
    // sections: the store (0), each vestibule its own
    P.secs.push({ id: 0, vols: u.vols.map((v, i) => i).filter(i => !G.vest.some(q => q.i === i)), h: ceil });
    for (const q of G.vest) P.secs.push({ id: P.secs.length, vols: [q.i], h: Math.min(u.vols[q.i].h - 1.1, ceil) });
    const ue = Math.max(U0 + 2.5, Math.min(U1 - 2.5, de[0])),
      FB = 7.0, // the front band: checkouts, the entrance, the bakery
      SH = disc ? 1.65 : 2.05,
      LV = disc ? [0.14, 0.55, 0.95, 1.32] : [0.14, 0.52, 0.9, 1.28, 1.66],
      sideC = U1 - ue > ue - U0 ? 1 : -1, // the checkouts on the wider side of the entrance
      bigVest = G.vest.find(q => Math.abs(LIPLAN.area(q.fl)) > 150);
    const inside = (u0, v0, u1, v1) =>
      LIPLAN.bandMulti(polys, u0, u1).some(([a, b]) => a <= v0 + 0.01 && b >= v1 - 0.01);
    // where the store's floor begins at u (its front wall; behind a notch of the outline it starts later)
    const frontV = (u0, u1) => {
      const iv = LIPLAN.bandMulti(polys, u0, u1);
      return iv.length ? Math.max(0, iv[0][0]) : null;
    };
    // ---- checkouts in the front band, perpendicular to the front, away from the entrance ----
    const nMax = disc ? 4 : 6;
    let nC = 0;
    for (let i = 0; nC < nMax && i < 14; i++) {
      const uc = ue + sideC * (4.6 + i * 2.7);
      if (uc < U0 + 1.6 || uc > U1 - 1.6) break;
      const f0 = frontV(uc - 1.4, uc + 1.4);
      if (f0 === null || f0 > 4 || !inside(uc - 1.4, f0 + 0.7, uc + 1.4, f0 + 5.6)) continue;
      checkout(K, R, uc, f0 + 0.9, ++nC, sideC);
      O.add(uc - 1.5, 0, uc + 1.5, f0 + 5.6);
    }
    // ---- the entrance: two posts and a gate's bar; a few trolleys ----
    const fe = frontV(ue - 1.2, ue + 1.2) || 0;
    for (const s2 of [-1, 1]) K.box(ue + s2 * 1.0, fe + 2.4, 0, 0.08, 0.08, 1.0, C.shelfD);
    K.box(ue - sideC * 0.55, fe + 2.4, 0.9, 0.9, 0.05, 0.05, C.rail);
    if (inside(ue - sideC * 2.4 - 0.4, fe + 2.6, ue - sideC * 1.2 + 0.4, fe + 4.6))
      trolleys(K, ue - sideC * 1.7, fe + 3.6, 3, Math.PI / 2);
    O.add(ue - 2.2, 0, ue + 2.2, fe + FB);
    // ---- the bakery (in a big vestibule, else in the front band on the other side of the entrance) and the bottle return ----
    if (bigVest) bakeryIn(P, u, G, bigVest, R, disc);
    else {
      const ub0 = ue - sideC * 3.2,
        ub1 = ue - sideC * (disc ? 7.6 : 9.6),
        ubl = Math.min(ub0, ub1),
        ubh = Math.max(ub0, ub1),
        fb = frontV(ubl, ubh);
      if (fb !== null && fb < 4 && inside(ubl, fb + 0.2, ubh, fb + 3.4)) {
        bakery(K, R, ubl, ubh, fb + 0.05, 1, disc);
        O.add(ubl - 0.3, 0, ubh + 0.3, fb + 4.6);
      }
    }
    const up = ue - sideC * 2.1,
      fp = frontV(up - 0.6, up + 0.6);
    if (!bigVest && fp !== null && fp < 4 && inside(up - 0.6, fp + 0.1, up + 0.6, fp + 1.0)) pfand(K, up, fp + 0.75, 1);
    // ---- produce right after the entrance ----
    const pu0 = Math.max(U0 + 3.4, ue - (disc ? 5 : 7)),
      pu1 = Math.min(U1 - 3.4, ue + (disc ? 5 : 7)),
      pv0 = fe + FB + 0.5,
      pv1 = pv0 + (disc ? 5.6 : 8.6);
    let np = 0;
    for (let uu = pu0 + 1.0; uu < pu1 - 0.6; uu += 3.0)
      for (let vv = pv0 + 1.2; vv < pv1 - 0.8; vv += 3.0)
        // the way in stays free (a path of 2.6 m straight from the entrance)
        if (Math.abs(uu - ue) > 1.9 && inside(uu - 1.2, vv - 1.4, uu + 1.2, vv + 1.4)) {
          produceTable(K, R, uu, vv, 1.2, 1.9, (R() - 0.5) * 0.2);
          np++;
        }
    if (np) {
      K.sign(['Obst & Gemüse'], (pu0 + pu1) / 2, (pv0 + pv1) / 2, 3.15, 2.4, 0.5, -1, 0, true);
      O.add(pu0 - 0.4, pv0 - 0.4, pu1 + 0.4, pv1 + 0.4);
    }
    // ---- the walls: chillers along the back walls, shelves along the side walls (drinks on the checkouts' side) ----
    const chillPal = [
      ['Molkerei', PAL.milch],
      ['Käse', PAL.kaese],
      ['Wurst · Fleisch', PAL.wurst],
      ['Molkerei', PAL.milch],
    ];
    let ci = 0;
    for (const e of G.edges) {
      if (e.kind !== 'back' && e.kind !== 'side') continue;
      // the part of the wall beyond the front band (local v of its ends)
      let t0 = 0.8,
        t1 = e.len - 0.8;
      const vAt = t => e.a[1] + e.t[1] * t;
      if (e.kind === 'side') {
        // walk from the end that is nearer the front: keep v ≥ FB + 0.3
        const lo = FB + 0.3;
        if (vAt(t0) < lo && vAt(t1) < lo) continue;
        if (Math.abs(e.t[1]) > 1e-3) {
          const tl = (lo - e.a[1]) / e.t[1];
          if (e.t[1] > 0) t0 = Math.max(t0, tl);
          else t1 = Math.min(t1, tl);
        }
      }
      if (t1 - t0 < 2.4) continue;
      const Fe = LIPLAN.frame(e.aw, [e.bw[0] - e.aw[0], e.bw[1] - e.aw[1]]),
        Ke = kit(P, Fe, 0);
      if (e.kind === 'back') {
        // in pieces of about 3.75 m, palettes changing
        const n = Math.max(1, Math.round((t1 - t0) / 3.75));
        for (let k = 0; k < n; k++) {
          const a = t0 + ((t1 - t0) * k) / n,
            b = t0 + ((t1 - t0) * (k + 1)) / n,
            [nm, pal] = chillPal[ci++ % chillPal.length];
          chiller(Ke, R, a + 0.02, b - 0.02, 0.05, 1, pal, false);
          // a coloured band on the wall over it (as shops mark their departments; muted, no brand's colour)
          Ke.box((a + b) / 2, 0.03, 2.55, b - a, 0.04, 0.7, BAND[nm] || BAND.Molkerei);
          if (k === Math.floor(n / 2) || n === 1) Ke.sign([nm], (a + b) / 2, 1.9, 3.15, 1.9, 0.42, 1, 0, true);
        }
        markOcc(O, F, e, t0, t1, 0.95 + 2.3);
      } else {
        const ua = (e.a[0] + e.b[0]) / 2,
          drinks = (ua - ue) * sideC > 0;
        wallShelf(
          Ke,
          R,
          t0,
          t1,
          0.05,
          1,
          drinks
            ? { pal: 'wasser', kinds: ['bottle', 'pack'], h: disc ? 1.8 : 2.2 }
            : { pal: 'haushalt', kinds: ['bottle', 'box', 'pack'], h: disc ? 1.8 : 2.2 }
        );
        Ke.box((t0 + t1) / 2, 0.03, 2.55, t1 - t0, 0.04, 0.7, drinks ? BAND.Getränke : BAND.Haushalt);
        // its sign hangs over the aisle beside it, facing the front like the aisles' signs
        const sl = F.L(...Fe.W((t0 + t1) / 2, 1.9));
        K.sign([drinks ? 'Getränke' : 'Haushalt'], sl[0], sl[1], 3.15, 1.8, 0.42, -1, 0, true);
        markOcc(O, F, e, t0, t1, 0.6 + 2.3);
      }
    }
    // ---- the rows: gondolas along v, a cross aisle when long; chest freezers in the rows on the checkouts' side ----
    const pitch = disc ? 3.6 : 3.3,
      ru0 = U0 + 3.6,
      ru1 = U1 - 3.6,
      nRows = Math.max(0, Math.floor((ru1 - ru0) / pitch) + 1),
      off = (ru1 - ru0 - (nRows - 1) * pitch) / 2;
    let ai = Math.floor(R() * AISLES.length);
    const rowsU = [];
    for (let i = 0; i < nRows; i++) {
      const ur = ru0 + off + i * pitch,
        frozen = (sideC > 0 ? i >= nRows - 2 : i < 2) && nRows > 4;
      let iv = LIPLAN.bandMulti(polys, ur - 0.6, ur + 0.6).map(([a, b]) => [Math.max(a, FB + 0.4), b - 0.3]);
      iv = LIPLAN.subtract(iv, O.cutV(ur - 0.65, ur + 0.65));
      let any = false;
      for (const [v0, v1] of iv) {
        if (v1 - v0 < 3) continue;
        const pieces =
          v1 - v0 > 19
            ? [
                [v0, (v0 + v1) / 2 - 1.3],
                [(v0 + v1) / 2 + 1.3, v1],
              ]
            : [[v0, v1]];
        for (const [p0, p1] of pieces) {
          if (frozen) freezers(K, R, ur, p0 + 0.2, p1 - 0.2);
          else gondola(K, R, ur, p0 + 0.45, p1 - 0.45, { h: SH, levels: LV, aisle: AISLES[ai % AISLES.length] });
        }
        any = true;
        if (frozen) K.sign(['Tiefkühl'], ur, (v0 + v1) / 2, 3.15, 1.6, 0.42, -1, 0, true);
        else if (ur + pitch / 2 < U1 - 1.5)
          K.sign([AISLES[ai % AISLES.length][0]], ur + pitch / 2, (v0 + v1) / 2, 3.15, 1.9, 0.42, -1, 0, true);
      }
      if (any) {
        rowsU.push(ur);
        if (!frozen) ai++;
      }
    }
    // ---- light rows along the aisles (in the gaps between the rows), short ones across the front band ----
    const zc = ceil - 0.06;
    const aisles = rowsU.length ? [rowsU[0] - pitch / 2, ...rowsU.map(x => x + pitch / 2)] : [];
    for (const ua of aisles)
      for (const [a, b] of LIPLAN.bandMulti(polys, ua - 0.1, ua + 0.1)) {
        const v0 = Math.max(a, FB) + 1.0,
          v1 = b - 1.0;
        if (v1 - v0 > 1) K.light(ua, (v0 + v1) / 2, zc, 0.16, v1 - v0);
      }
    for (let uu = U0 + 2.2; uu < U1 - 2; uu += 4.4)
      if (inside(uu - 0.2, 1, uu + 0.2, FB - 1)) K.light(uu, FB / 2, zc, 0.16, FB - 2);
    // a trolley left in an aisle
    if (rowsU.length > 2) K.trolley(rowsU[1] + pitch / 2, FB + 6, Math.PI / 2 + 0.25);
    // ---- the vestibules: trolleys along a side, a light; a big one holds the bakery (above) ----
    for (const q of G.vest) {
      const sec = P.secs.find(s2 => s2.vols.includes(q.i)),
        Kv = kit(P, F, sec.id),
        bv = LIPLAN.bbOf(q.fl);
      if (q !== bigVest) {
        const mid = (bv[0] + bv[2]) / 2,
          side = de[0] < mid ? 1 : -1,
          n = Math.max(2, Math.min(9, Math.floor((bv[2] - bv[0]) / 2 / 0.33) - 1));
        trolleys(Kv, side > 0 ? bv[2] - 0.8 - (n - 1) * 0.33 : bv[0] + 0.8, (bv[1] + bv[3]) / 2, n, 0);
        pfand(Kv, side > 0 ? bv[0] + 1.0 : bv[2] - 1.0, bv[3] - 0.05, -1);
      }
      for (let uu = bv[0] + 1.2; uu < bv[2] - 1; uu += 4.5)
        Kv.light(uu, (bv[1] + bv[3]) / 2, sec.h - 0.06, 0.16, Math.max(0.8, bv[3] - bv[1] - 2));
    }
    P.frame = F;
    return P;
  }
  // an edge's fixture (from t0 to t1, depth dep into the room) marked in the hall's local occupancy
  function markOcc(O, F, e, t0, t1, dep) {
    const pts = [
      [e.a[0] + e.t[0] * t0, e.a[1] + e.t[1] * t0],
      [e.a[0] + e.t[0] * t1, e.a[1] + e.t[1] * t1],
    ];
    const q = pts.concat(pts.map(p => [p[0] + e.n[0] * dep, p[1] + e.n[1] * dep]));
    O.add(
      Math.min(...q.map(p => p[0])),
      Math.min(...q.map(p => p[1])),
      Math.max(...q.map(p => p[0])),
      Math.max(...q.map(p => p[1]))
    );
  }
  // ---- a bakery: a counter with a display case (supermarket), bread racks on the wall behind; a self-service wall (discounter);
  // u0 … u1 along the front wall at vW, facing dir ----
  function bakery(K, R, u0, u1, vW, dir, disc) {
    const um = (u0 + u1) / 2,
      w = u1 - u0;
    if (disc) {
      // the self-service station: a cabinet of compartments, the breads in them (of the flaps' glass only the edges)
      K.box(um, vW + dir * 0.05, 0, w, 0.1, 1.9, C.counter, C.counterD);
      K.box(um, vW + dir * 0.4, 0, w, 0.7, 0.5, C.counter, C.counterD);
      K.box(um, vW + dir * 0.4, 1.78, w, 0.7, 0.12, C.counter, C.counterD);
      for (const uu of [u0 + 0.02, u1 - 0.02]) K.box(uu, vW + dir * 0.4, 0.5, 0.04, 0.7, 1.28, C.counter);
      for (const z of [0.5, 0.92, 1.34]) {
        K.box(um, vW + dir * 0.4, z, w, 0.7, 0.03, C.shelf);
        for (let uu = u0 + 0.4; uu < u1 - 0.3; uu += 0.55) {
          K.good('heap', uu, vW + dir * 0.45, z + 0.03, 'u', 0.44, 0.45, 0.14, R() < 0.5 ? C.bread : C.breadD, 1, 0);
          K.box(uu, vW + dir * 0.76, z + 0.36, 0.5, 0.02, 0.03, C.glassF);
        }
      }
      K.sign(['Backwaren'], um, vW + dir * 0.79, 2.2, 1.6, 0.36, dir, 0);
      K.solid(um, vW + dir * 0.4, w, 0.8);
      return;
    }
    const vc = vW + dir * 2.55;
    // the counter: its body and on it an open display – the rolls in two rows, of its glass only the edges (glass that one sees
    // through is not drawn here: a pane would hide what lies behind it)
    K.box(um, vc, 0, w, 0.9, 0.92, C.wood, C.counter);
    K.box(um, vc, 0.92, w, 0.92, 0.04, C.shelf);
    for (const sv of [-1, 1]) K.box(um, vc + dir * sv * 0.44, 0.96, w, 0.03, 0.05, C.glassF);
    K.box(um, vc + dir * 0.44, 1.3, w, 0.025, 0.025, C.glassF);
    for (const uu of [u0 + 0.02, u1 - 0.02]) K.box(uu, vc + dir * 0.2, 0.96, 0.03, 0.5, 0.36, C.glassF);
    for (let uu = u0 + 0.3; uu < u1 - 0.25; uu += 0.48)
      for (const [dv, cl] of [
        [-0.2, R() < 0.5 ? C.bread : C.breadD],
        [0.18, R() < 0.5 ? C.bread : C.breadD],
      ])
        K.good('heap', uu, vc + dir * dv, 0.96, 'u', 0.42, 0.34, 0.09, cl, 1, 0);
    // the shelf on the wall behind: a back, boards, the loaves on them
    K.box(um, vW + dir * 0.04, 0, w, 0.08, 2.1, C.wood, C.woodD);
    for (const uu of [u0 + 0.02, u1 - 0.02]) K.box(uu, vW + dir * 0.28, 0, 0.04, 0.5, 2.1, C.woodD);
    for (const z of [0.5, 0.9, 1.3, 1.7]) {
      K.box(um, vW + dir * 0.3, z - 0.03, w, 0.46, 0.03, C.wood);
      for (let uu = u0 + 0.22; uu < u1 - 0.18; uu += 0.3)
        K.good('loaf', uu, vW + dir * 0.3, z, 'u', 0.24, 0.3, 0.13, R() < 0.5 ? C.bread : C.breadD, 1, dir);
    }
    K.sign(['Bäckerei'], um, vW + dir * 0.57, 2.3, 2.0, 0.42, dir, 0);
    K.solid(um, vc, w, 0.95);
    K.solid(um, vW + dir * 0.3, w, 0.55);
    K.spot('theke', um, vW + dir * 1.25, [0, dir]);
  }
  // the bakery and the bottle return in a big vestibule (REWE's entrance strip): along its back wall (the store's front)
  function bakeryIn(P, u, G, q, R, disc) {
    const sec = P.secs.find(s2 => s2.vols.includes(q.i)),
      K = kit(P, G.F, sec.id),
      bv = LIPLAN.bbOf(q.fl),
      de = G.de;
    // the door's side gets the bottle return and the trolleys, the other end the bakery
    const mid = (bv[0] + bv[2]) / 2,
      dSide = de[0] < mid ? -1 : 1,
      far0 = dSide < 0 ? mid + 1 : bv[0] + 1.2,
      far1 = dSide < 0 ? bv[2] - 1.2 : mid - 1;
    if (far1 - far0 > 3) bakery(K, R, far0, Math.min(far1, far0 + 9), bv[3] - 0.05, -1, disc);
    pfand(K, de[0] + dSide * 3.0, bv[3] - 0.05, -1);
    trolleys(K, de[0] + dSide * 4.5, (bv[1] + bv[3]) / 2, 5, 0);
  }
  // the frame of a hall: its edge nearest to the door (u along it, v into the hall)
  function hallFrame(hall, door) {
    const r = LIPLAN.ring(hall.f);
    let best = null;
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length],
        L2 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L2 < 3) continue;
      const ux = (b[0] - a[0]) / L2,
        uy = (b[1] - a[1]) / L2,
        t = Math.max(0, Math.min(L2, (door.x - a[0]) * ux + (door.y - a[1]) * uy)),
        d = Math.hypot(door.x - a[0] - ux * t, door.y - a[1] - uy * t),
        // prefer an edge the door faces (its outward normal along the door's)
        face = -uy * -door.nx + ux * -door.ny,
        score = d + (face > 0.7 ? 0 : 50);
      if (!best || score < best.s) best = { s: score, a, ux, uy };
    }
    return LIPLAN.frame(best.a, [best.ux, best.uy]);
  }

  return {
    bakery,
    C,
    PAL,
    AISLES,
    markt,
    gondola,
    wallShelf,
    chiller,
    freezers,
    checkout,
    produceTable,
    trolleys,
    pfand,
    goodsRunU,
    goodsRunV,
    sizeOf,
    hallFrame,
  };
})();
