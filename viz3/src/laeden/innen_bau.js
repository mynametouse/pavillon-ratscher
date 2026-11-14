// ===================== feat/laeden-innen 3: the DIY store – high-bay racks, departments, the checkout zone, the wood cutting, the garden centre (LIBAU) =====================
// Pure layout (no three.js, no DOM – node tests: viz3/test/unit/laeden_innen.test.mjs) after photos of German DIY stores, generic – no
// chain's colours: long rows of high-bay racks (goods within reach below, pallets above), plain department boards hanging over the aisles
// (Werkzeug, Farben, Holz, Sanitär, Elektro, Garten …), the checkout line in the vestibule at the entrance, the information desk, the wood
// cutting corner with its panel saw, pallets of building materials, timber on cantilever racks, the garden centre: the warm house under
// its glass roof with plant tables, the cold house with shrubs in pots and bagged soil. Each part of the store is a section of its own
// (laeden/innen.js shows a section with its neighbours only).
import { LIPLAN } from './innen_plan.js';
import { LIMARKT } from './innen_markt.js';
export const LIBAU = (() => {
  const { L, rnd, hash, kit } = LIPLAN;
  const { C, trolleys, goodsRunV, goodsRunU, hallFrame } = LIMARKT;
  const B = {
    floorA: L(0.6, 0.6, 0.59), // polished concrete
    floorB: L(0.58, 0.58, 0.57),
    ceil: L(0.42, 0.43, 0.45), // the roof's trapezoidal sheet from below
    wall: L(0.82, 0.83, 0.83),
    upright: L(0.26, 0.33, 0.44), // blue-grey steel
    beam: L(0.62, 0.62, 0.6),
    deck: L(0.55, 0.56, 0.56),
    pallet: L(0.66, 0.55, 0.4),
    carton: [L(0.62, 0.5, 0.36), L(0.7, 0.58, 0.42), L(0.55, 0.45, 0.33), L(0.85, 0.85, 0.83)],
    truss: L(0.35, 0.36, 0.38),
    board: L(0.78, 0.66, 0.48), // timber
    plant: [L(0.22, 0.42, 0.18), L(0.3, 0.5, 0.22), L(0.18, 0.36, 0.2), L(0.4, 0.55, 0.25)],
    bloom: [L(0.85, 0.2, 0.3), L(0.9, 0.75, 0.2), L(0.6, 0.3, 0.7), L(0.95, 0.9, 0.9), L(0.9, 0.45, 0.15)],
    pot: L(0.62, 0.32, 0.2),
    table: L(0.5, 0.52, 0.5),
    soil: [L(0.25, 0.4, 0.2), L(0.35, 0.25, 0.15), L(0.2, 0.3, 0.45)],
  };
  // departments: board, palette, packages
  const DEPT = [
    [
      'Werkzeug',
      [L(0.7, 0.15, 0.12), L(0.15, 0.3, 0.6), L(0.2, 0.2, 0.22), L(0.2, 0.45, 0.25), L(0.85, 0.65, 0.15)],
      ['box'],
    ],
    [
      'Farben',
      [L(0.92, 0.92, 0.9), L(0.85, 0.85, 0.82), L(0.7, 0.2, 0.2), L(0.25, 0.4, 0.7), L(0.85, 0.75, 0.3)],
      ['can'],
    ],
    ['Elektro', [L(0.85, 0.85, 0.85), L(0.2, 0.2, 0.22), L(0.25, 0.45, 0.7), L(0.75, 0.6, 0.2)], ['box']],
    ['Sanitär', [L(0.95, 0.95, 0.95), L(0.75, 0.78, 0.8), L(0.3, 0.5, 0.75), L(0.6, 0.62, 0.65)], ['box', 'pack']],
    ['Eisenwaren', [L(0.55, 0.57, 0.6), L(0.7, 0.2, 0.15), L(0.25, 0.35, 0.55), L(0.8, 0.7, 0.3)], ['box']],
    ['Leuchten', [L(0.9, 0.9, 0.88), L(0.6, 0.5, 0.4), L(0.3, 0.3, 0.32), L(0.85, 0.75, 0.55)], ['box', 'pack']],
    ['Haushalt', [L(0.3, 0.55, 0.8), L(0.85, 0.85, 0.88), L(0.4, 0.7, 0.4), L(0.85, 0.5, 0.2)], ['box', 'bottle']],
    ['Garten', [L(0.3, 0.5, 0.25), L(0.6, 0.4, 0.25), L(0.85, 0.75, 0.3), L(0.25, 0.35, 0.5)], ['bag', 'box']],
    ['Bodenbeläge', [L(0.7, 0.6, 0.45), L(0.55, 0.42, 0.3), L(0.8, 0.78, 0.72), L(0.4, 0.38, 0.36)], ['pack']],
    ['Fliesen', [L(0.85, 0.83, 0.78), L(0.6, 0.6, 0.62), L(0.7, 0.55, 0.45)], ['pack']],
    ['Baustoffe', [L(0.75, 0.75, 0.73), L(0.6, 0.58, 0.55), L(0.85, 0.8, 0.65)], ['bag']],
    ['Holz', [B.board, L(0.7, 0.6, 0.45), L(0.82, 0.72, 0.55)], ['pack']],
  ];
  // the frame of a part: along its longest edge, v into it
  function partFrame(f) {
    const r = LIPLAN.ring(f);
    let best = null;
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!best || l > best.l) best = { a, b, l };
    }
    return LIPLAN.frame(best.a, [best.b[0] - best.a[0], best.b[1] - best.a[1]]);
  }
  // ---- a high-bay rack along v (double-sided): goods within reach on four shelves, three beam levels with pallets above ----
  function hochregal(K, R, u, v0, v1, dept, o = {}) {
    const D = o.d || 2.1, // both sides
      H = o.h || 6.2,
      len = v1 - v0,
      vm = (v0 + v1) / 2,
      [, pal, kinds] = dept;
    if (len < 2.8) return;
    const nb = Math.max(1, Math.round(len / 2.7)),
      bay = len / nb;
    // uprights at each bay's ends, on both outer faces and at the back-to-back line
    for (let k = 0; k <= nb; k++) {
      const v = v0 + k * bay;
      for (const s of [-1, 0, 1]) K.box(u + (s * (D - 0.1)) / 2, v, 0, 0.09, 0.09, H, B.upright);
    }
    // the back (a mesh between the two halves, drawn as a thin grey panel up to the goods' top)
    K.box(u, vm, 0, 0.04, len, 2.3, L(0.5, 0.52, 0.54));
    for (const s of [-1, 1]) {
      const uf = u + (s * D) / 2;
      // the shelves within reach: decks with goods
      const lv = [0.12, 0.62, 1.14, 1.66];
      for (let i = 0; i < lv.length; i++) {
        const z = lv[i];
        K.box(u + (s * D) / 4, vm, z - 0.04, D / 2 - 0.06, len, 0.04, i ? B.deck : C.shelfD);
        K.box(uf - s * 0.03, vm, z - 0.06, 0.05, len, 0.05, B.beam);
        const top = i + 1 < lv.length ? lv[i + 1] - 0.08 : 2.2;
        goodsRunV(K, R, uf - s * 0.08, s, v0 + 0.08, v1 - 0.08, z, top - z, D / 2 - 0.25, pal, kinds);
      }
      // the beam levels above with pallets of cartons (some empty places)
      for (const z of [2.6, 3.85, 5.1]) {
        K.box(uf - s * 0.05, vm, z - 0.12, 0.08, len, 0.12, B.beam);
        K.box(u + s * 0.05, vm, z - 0.12, 0.08, len, 0.12, B.beam);
        for (let k = 0; k < nb; k++)
          for (let q = 0; q < 2; q++) {
            if (R() < 0.12) continue;
            const v = v0 + k * bay + (q + 0.5) * (bay / 2),
              cu = u + (s * D) / 4;
            K.box(cu, v, z, 0.95, 1.15, 0.14, B.pallet);
            const hh = 0.55 + R() * 0.55,
              col = B.carton[Math.floor(R() * B.carton.length)];
            K.box(cu, v, z + 0.14, 0.9, 1.05, Math.min(hh, 1.1), col, col);
          }
      }
    }
    K.solid(u, vm, D + 0.1, len + 0.1);
  }
  // ---- timber on cantilever racks (arms out of a column, boards lying on them) along v ----
  function kragarm(K, R, u, v0, v1, two = true) {
    const len = v1 - v0,
      vm = (v0 + v1) / 2,
      n = Math.max(2, Math.round(len / 1.4) + 1);
    K.box(u, vm, 0, 0.5, len, 0.12, B.upright);
    for (let k = 0; k < n; k++) {
      const v = v0 + (k * len) / (n - 1);
      K.box(u, Math.min(v1 - 0.06, Math.max(v0 + 0.06, v)), 0, 0.14, 0.12, 4.2, B.upright);
      for (const z of [0.5, 1.3, 2.1, 2.9, 3.7])
        for (const s of two ? [-1, 1] : [1])
          K.box(u + s * 0.5, Math.min(v1 - 0.06, Math.max(v0 + 0.06, v)), z, 0.9, 0.08, 0.08, B.upright);
    }
    for (const z of [0.58, 1.38, 2.18, 2.98, 3.78])
      for (const s of two ? [-1, 1] : [1]) {
        const hh = 0.08 + R() * 0.25;
        K.box(u + s * 0.5, vm, z, 0.85, len + (R() - 0.5) * 0.6, hh, B.board, L(0.86, 0.76, 0.58));
      }
    K.solid(u, vm, two ? 2.0 : 1.1, len + 0.2);
  }
  // ---- a pallet with a load (bags, buckets, cartons) on the floor ----
  function palletLoad(K, R, u, v, kind, ang = 0) {
    K.box(u, v, 0, 1.2, 0.8, 0.14, B.pallet, B.pallet, ang);
    const col =
      kind === 'sack'
        ? [L(0.82, 0.8, 0.75), L(0.6, 0.6, 0.62), L(0.75, 0.68, 0.5)][Math.floor(R() * 3)]
        : B.carton[Math.floor(R() * 4)];
    if (kind === 'sack')
      for (let l = 0; l < 6; l++)
        K.box(
          u,
          v,
          0.14 + l * 0.14,
          1.12 - (l % 2) * 0.04,
          0.76,
          0.13,
          col,
          L(col[0] * 1.08, col[1] * 1.08, col[2] * 1.08),
          ang
        );
    else if (kind === 'eimer')
      for (let l = 0; l < 3; l++)
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 2; j++) {
            const c = Math.cos(ang),
              s = Math.sin(ang),
              du = -0.38 + i * 0.38,
              dv = -0.19 + j * 0.38;
            K.good(
              'can',
              u + du * c - dv * s,
              v + du * s + dv * c,
              0.14 + l * 0.36,
              'u',
              0.32,
              0.32,
              0.34,
              L(0.93, 0.93, 0.92),
              1,
              1,
              ang
            );
          }
    else K.box(u, v, 0.14, 1.15, 0.76, 0.8 + R() * 0.5, col, col, ang);
    K.solid(u, v, 1.25, 0.85, ang);
  }
  // ---- plant tables (warm house): benches with pots and plants ----
  function plantTable(K, R, u, v, w, l) {
    K.box(u, v, 0, w, l, 0.78, B.table, L(0.42, 0.44, 0.42));
    for (let a = -l / 2 + 0.18; a < l / 2 - 0.1; a += 0.3)
      for (let b = -w / 2 + 0.18; b < w / 2 - 0.1; b += 0.3) {
        K.box(u + b, v + a, 0.78, 0.18, 0.18, 0.16, B.pot);
        const col = R() < 0.35 ? B.bloom[Math.floor(R() * B.bloom.length)] : B.plant[Math.floor(R() * B.plant.length)];
        K.good('heap', u + b, v + a, 0.92, 'u', 0.26, 0.26, 0.18 + R() * 0.18, col, 1, 0);
      }
    K.solid(u, v, w + 0.1, l + 0.1);
  }
  // ---- shrubs in big pots on the floor (cold house) ----
  function shrubs(K, R, u0, v0, u1, v1) {
    for (let u = u0 + 0.4; u < u1 - 0.3; u += 0.7)
      for (let v = v0 + 0.4; v < v1 - 0.3; v += 0.7) {
        const h = 0.5 + R() * 1.1;
        K.box(u, v, 0, 0.38, 0.38, 0.32, B.pot);
        K.good('heap', u, v, 0.32, 'u', 0.6, 0.6, h, B.plant[Math.floor(R() * B.plant.length)], 1, 0, R() * 1.5);
      }
    K.solid((u0 + u1) / 2, (v0 + v1) / 2, u1 - u0, v1 - v0);
  }

  // ---- the layout ----
  function baumarkt(P, u) {
    const R = rnd(hash(u.id) + 23),
      door = u.doors.find(d => d.k === 'main') || u.doors[0],
      vols = u.vols,
      // which volume is what: by the data's names and by size
      byWhat = w => vols.findIndex(v => (v.what || '').startsWith(w)),
      iHall = vols.reduce((b, v, i) => (Math.abs(LIPLAN.area(v.f)) > Math.abs(LIPLAN.area(vols[b].f)) ? i : b), 0),
      iKasse = byWhat('Windfang'),
      iPortal = byWhat('Portal'),
      iWarm = byWhat('Gartencenter (Warm'),
      iKalt = byWhat('Gartencenter (Kalt'),
      others = vols.map((v, i) => i).filter(i => ![iHall, iKasse, iPortal, iWarm, iKalt].includes(i));
    // sections: the hall, the other parts of the store, the checkout zone with the portal, the garden centre's two houses
    const sec = (vs, h, name) => {
      const s = { id: P.secs.length, vols: vs.filter(i => i >= 0), h, name };
      if (s.vols.length) P.secs.push(s);
      return s;
    };
    const sHall = sec([iHall], Math.min(vols[iHall].h - 0.9, 8.6), null),
      sOther = others.map(i => sec([i], Math.min(vols[i].h - 0.9, 7.6), null)),
      sKasse = sec([iKasse, iPortal], Math.min(vols[iKasse >= 0 ? iKasse : iHall].h - 0.6, 3.3), null),
      sWarm = sec([iWarm], vols[iWarm >= 0 ? iWarm : iHall].h - 0.2, 'OBI Gartencenter'),
      sKalt = sec([iKalt], vols[iKalt >= 0 ? iKalt : iHall].h - 0.2, 'OBI Gartencenter');
    // glass roofs: no ceiling of ours (one sees the sky), glass walls: no wall of ours (one sees out)
    P.noCeil = [iWarm, iKalt].filter(i => i >= 0 && vols[i].roof === 'glas');
    P.noWall = [iKalt].filter(i => i >= 0 && vols[i].glas);
    P.floor = B;
    P.ceilCol = B.ceil;
    P.wallCol = B.wall;
    P.cell = 2.4;
    // ---- the hall: racks in rows perpendicular to the front, departments, the front aisle with offers, the information, the wood cutting ----
    const F = hallFrame(vols[iHall], door),
      fl = F.polyL(vols[iHall].f),
      bb = LIPLAN.bbOf(fl),
      [U0, , U1, V1] = bb,
      K = kit(P, F, sHall.id),
      de = F.L(door.x, door.y),
      FB = 8.5,
      pitch = 5.2; // a rack of 2.1 m and an aisle of 3.1 m
    const bandIn = (a, b) => LIPLAN.bandSpans(fl, a, b);
    // the wood cutting: in the hall's far corner (the end farther from the entrance), against the back
    const farLow = Math.abs(de[0] - U0) > Math.abs(U1 - de[0]);
    // the far end first, then the other one: where the hall reaches deep enough behind the racks' zone
    let cutU = null,
      cutV = null;
    for (const cu of farLow ? [U0 + 4.5, U1 - 4.5] : [U1 - 4.5, U0 + 4.5]) {
      for (const [a, b] of bandIn(cu - 3.2, cu + 3.2)) if (b - a > 10 && b > FB + 6) cutV = b - 0.5;
      if (cutV !== null) {
        cutU = cu;
        break;
      }
    }
    const occ = LIPLAN.occ();
    if (cutV !== null) {
      const v = cutV,
        sideL = cutU < (U0 + U1) / 2;
      // the panel saw: a frame standing against the wall, a carriage, the panels on a cart, a counter
      K.box(cutU, v - 0.35, 0, 5.4, 0.5, 0.3, L(0.3, 0.32, 0.35));
      K.box(cutU, v - 0.15, 0.3, 5.4, 0.2, 2.6, L(0.55, 0.57, 0.6), L(0.45, 0.47, 0.5));
      K.box(cutU - 1.0, v - 0.45, 0.3, 0.3, 0.3, 2.5, L(0.85, 0.65, 0.1)); // the carriage (a warning yellow, no brand)
      K.box(cutU + 0.8, v - 0.36, 0.5, 2.4, 0.03, 1.22, L(0.82, 0.72, 0.55)); // a panel in the saw
      for (let i = 0; i < 6; i++)
        K.box(cutU, v - 1.9, 0.12 + i * 0.022, 2.6, 1.25, 0.02, i % 2 ? L(0.8, 0.7, 0.52) : L(0.72, 0.62, 0.46));
      K.box(cutU, v - 1.9, 0, 2.8, 1.3, 0.12, L(0.25, 0.25, 0.27));
      K.box(cutU + 3.6 * (sideL ? 1 : -1), v - 1.2, 0, 1.6, 0.7, 1.0, C.counter, C.counterD);
      K.sign(['Holzzuschnitt'], cutU, v - 1.2, 3.4, 2.6, 0.6, -1, 0, true);
      K.solid(cutU, v - 0.3, 5.5, 0.7);
      K.solid(cutU, v - 1.9, 2.9, 1.4);
      K.solid(cutU + 3.6 * (sideL ? 1 : -1), v - 1.2, 1.7, 0.8);
      occ.add(cutU - 6, v - 4.5, cutU + 6, v + 1);
      K.spot('zuschnitt', cutU + 3.6 * (sideL ? 1 : -1), v - 0.6, [0, -1]);
    }
    // the information: a counter in the front aisle beside the entrance
    const ui = Math.max(U0 + 3, Math.min(U1 - 3, de[0] + (farLow ? -5 : 5)));
    K.box(ui, 3.2, 0, 3.0, 0.9, 1.05, C.counter, C.counterD);
    K.box(ui, 3.2, 1.05, 3.1, 1.0, 0.04, L(0.85, 0.85, 0.83));
    K.box(ui + 0.6, 3.5, 1.09, 0.4, 0.06, 0.3, C.counterD);
    K.glow(ui + 0.6, 3.46, 1.12, 0.36, 0.01, 0.24, C.screen);
    K.sign(['Information'], ui, 3.2, 2.9, 2.2, 0.5, -1, 0, true);
    K.solid(ui, 3.2, 3.1, 1.0);
    K.spot('info', ui, 4.0, [0, -1]);
    occ.add(ui - 2, 1.5, ui + 2, 5);
    // offers on pallets along the front aisle
    for (let uu = U0 + 4; uu < U1 - 4; uu += 7.5) {
      if (Math.abs(uu - de[0]) < 4 || Math.abs(uu - ui) < 3) continue;
      if (!bandIn(uu - 1, uu + 1).some(([a, b]) => a < 5 && b > 7)) continue;
      palletLoad(K, R, uu, 6.0, ['sack', 'eimer', 'karton'][Math.floor(R() * 3)]);
      if (R() < 0.6) palletLoad(K, R, uu + 1.35, 6.0, 'karton');
    }
    // the racks: rows of high-bay racks between the front aisle and the back, departments in turn; a cross aisle in long rows
    const n = Math.max(0, Math.floor((U1 - U0 - 7) / pitch) + 1),
      off = (U1 - U0 - (n - 1) * pitch) / 2;
    let di = 0;
    const rowsU = [];
    for (let i = 0; i < n; i++) {
      const ur = U0 + off + i * pitch;
      let iv = bandIn(ur - 1.1, ur + 1.1).map(([a, b]) => [Math.max(a + 3.2, FB), b - 3.2]);
      iv = LIPLAN.subtract(iv, occ.cutV(ur - 1.2, ur + 1.2));
      for (const [v0, v1] of iv) {
        if (v1 - v0 < 6) continue;
        const pieces =
          v1 - v0 > 30
            ? [
                [v0, (v0 + v1) / 2 - 1.6],
                [(v0 + v1) / 2 + 1.6, v1],
              ]
            : [[v0, v1]];
        for (const [p0, p1] of pieces) {
          const dept = DEPT[di % 8];
          hochregal(K, R, ur, p0, p1, dept);
          // the department's board hangs over the aisle beside the row, high up
          if (ur + pitch / 2 < U1 - 2) K.sign([dept[0]], ur + pitch / 2, (p0 + p1) / 2, 6.6, 2.8, 0.75, -1, 0, true);
          di++;
        }
        rowsU.push(ur);
      }
    }
    // lights: long rows over the aisles, high (under the trusses); trusses across the hall
    for (const ua of rowsU.length ? [rowsU[0] - pitch / 2, ...rowsU.map(x => x + pitch / 2)] : [])
      for (const [a, b] of bandIn(ua - 0.1, ua + 0.1))
        if (b - a > 4) K.light(ua, (a + b) / 2, sHall.h - 0.5, 0.2, b - a - 3);
    // the trusses across the hall (lines v = const: the hall's spans along u)
    const sw = [];
    for (let i = 0; i < fl.length; i += 2) sw.push(fl[i + 1], fl[i]);
    for (let v = 6; v < V1 - 2; v += 12)
      for (const [a, b] of LIPLAN.spans(sw, v)) K.box((a + b) / 2, v, sHall.h - 0.7, b - a - 0.2, 0.25, 0.6, B.truss);
    // ---- the other parts of the store: building materials on pallets, timber on cantilever racks, floor coverings ----
    others.forEach((vi, k) => {
      const s = sOther[k];
      if (!s || !s.vols.length) return;
      const f = vols[vi].f,
        Fp = partFrame(f),
        flp = Fp.polyL(f),
        bp = LIPLAN.bbOf(flp),
        Kp = kit(P, Fp, s.id);
      const big = vols[vi].h >= 8;
      // rows along v of the part's frame
      const pp = big ? 4.6 : 4.4;
      const m = Math.max(0, Math.floor((bp[2] - bp[0] - 5) / pp) + 1),
        o2 = (bp[2] - bp[0] - (m - 1) * pp) / 2;
      for (let i = 0; i < m; i++) {
        const ur = bp[0] + o2 + i * pp;
        for (const [a, b] of LIPLAN.bandSpans(flp, ur - 1.1, ur + 1.1)) {
          const v0 = a + 2.8,
            v1 = b - 2.8;
          if (v1 - v0 < 4) continue;
          if (big && i % 2 === 0) kragarm(Kp, R, ur, v0, v1);
          else if (big) {
            for (let v = v0 + 0.6; v < v1 - 0.5; v += 1.4) palletLoad(Kp, R, ur - 0.65, v, 'sack', Math.PI / 2);
            for (let v = v0 + 0.6; v < v1 - 0.5; v += 1.4)
              palletLoad(Kp, R, ur + 0.65, v, R() < 0.5 ? 'sack' : 'karton', Math.PI / 2);
          } else hochregal(Kp, R, ur, v0, v1, DEPT[8 + (i % 2)], { h: 4.6 });
        }
      }
      Kp.sign(
        [big ? 'Baustoffe · Holz' : 'Bodenbeläge · Fliesen'],
        (bp[0] + bp[2]) / 2,
        (bp[1] + bp[3]) / 2,
        Math.min(s.h - 1.4, 5.6),
        3.4,
        0.75,
        -1,
        0,
        true
      );
      for (let uu = bp[0] + 2.5; uu < bp[2] - 2; uu += pp)
        for (const [a, b] of LIPLAN.bandSpans(flp, uu - 0.1, uu + 0.1))
          if (b - a > 4) Kp.light(uu, (a + b) / 2, s.h - 0.4, 0.2, b - a - 3);
    });
    // ---- the checkout zone in the vestibule: checkouts across it (the exit towards the doors), trolleys at the entrance ----
    if (iKasse >= 0) {
      const f = vols[iKasse].f,
        Fk = partFrame(f),
        flk = Fk.polyL(f),
        bk = LIPLAN.bbOf(flk),
        Kk = kit(P, Fk, sKasse.id),
        dk = Fk.L(door.x, door.y),
        depth = bk[3] - bk[1];
      // checkouts perpendicular to the long side, shorter than in a supermarket (the vestibule is ~5 m deep)
      const lc = Math.min(3.4, depth - 1.4);
      let nC = 0;
      for (let uu = bk[0] + 1.6; uu < bk[2] - 1.2 && nC < 5; uu += 2.6) {
        if (Math.abs(uu - dk[0]) < 2.4) continue;
        if (!LIPLAN.bandSpans(flk, uu - 1.3, uu + 1.3).some(([a, b]) => a <= bk[1] + 0.8 && b >= bk[1] + 0.7 + lc))
          continue;
        miniCheckout(Kk, R, uu, bk[1] + 0.7, lc, ++nC);
      }
      Kk.sign(['Kasse'], (bk[0] + bk[2]) / 2, bk[1] + depth / 2, Math.min(sKasse.h - 0.5, 2.7), 1.6, 0.36, 1, 0, true);
      for (let uu = bk[0] + 1.5; uu < bk[2] - 1; uu += 3.5)
        Kk.light(uu, (bk[1] + bk[3]) / 2, sKasse.h - 0.05, 0.16, Math.max(0.6, depth - 2));
      trolleys(Kk, Math.min(bk[2] - 1.2, dk[0] + 2.2), bk[3] - 0.9, 4, 0);
    }
    // ---- the garden centre: plant tables under the glass roof, shrubs and bagged soil in the cold house ----
    if (iWarm >= 0) {
      const f = vols[iWarm].f,
        Fw = partFrame(f),
        flw = Fw.polyL(f),
        bw = LIPLAN.bbOf(flw),
        Kw = kit(P, Fw, sWarm.id);
      for (let uu = bw[0] + 2.2; uu < bw[2] - 1.5; uu += 3.4)
        for (const [a, b] of LIPLAN.bandSpans(flw, uu - 0.8, uu + 0.8)) {
          const v0 = a + 1.8,
            v1 = b - 1.8;
          if (v1 - v0 > 2) plantTable(Kw, R, uu, (v0 + v1) / 2, 1.3, v1 - v0);
        }
      Kw.sign(['Gartencenter'], (bw[0] + bw[2]) / 2, (bw[1] + bw[3]) / 2, 3.4, 2.6, 0.6, -1, 0, true);
    }
    if (iKalt >= 0) {
      const f = vols[iKalt].f,
        Fc = partFrame(f),
        flc = Fc.polyL(f),
        bc = LIPLAN.bbOf(flc),
        Kc = kit(P, Fc, sKalt.id);
      const um = (bc[0] + bc[2]) / 2;
      // shrubs in two blocks, soil on pallets along a side, a path through the middle
      shrubs(Kc, R, bc[0] + 1.5, bc[1] + 2.0, um - 1.6, bc[3] - 2.0);
      for (let v = bc[1] + 1.6; v < bc[3] - 1.4; v += 1.0) {
        Kc.box(bc[2] - 1.6, v, 0, 1.2, 0.85, 0.14, B.pallet);
        const col = B.soil[Math.floor(R() * B.soil.length)];
        for (let l = 0; l < 5; l++)
          Kc.box(
            bc[2] - 1.6,
            v,
            0.14 + l * 0.16,
            1.12,
            0.78,
            0.15,
            col,
            L(col[0] * 1.15, col[1] * 1.15, col[2] * 1.15)
          );
      }
      Kc.solid(bc[2] - 1.6, (bc[1] + bc[3]) / 2, 1.3, bc[3] - bc[1] - 3);
      Kc.sign(['Pflanzen · Erden'], um + 1.5, (bc[1] + bc[3]) / 2, 2.9, 2.4, 0.5, -1, 0, true);
    }
    P.frame = F;
    return P;
  }
  // a short checkout across a vestibule: counter, belt, till, seat
  function miniCheckout(K, R, u, v0, lc, n) {
    const W = 0.9,
      vm = v0 + lc / 2;
    K.box(u, vm, 0, W, lc, 0.86, C.counter, C.counterD);
    K.box(u, v0 + lc * 0.32, 0.86, W - 0.12, lc * 0.5, 0.02, C.belt);
    K.box(u + 0.25, v0 + lc * 0.66, 0.88, 0.3, 0.28, 0.18, C.counterD);
    K.glow(u + 0.25, v0 + lc * 0.66 - 0.15, 1.06, 0.26, 0.02, 0.18, C.screen);
    K.box(u + W / 2 + 0.36, v0 + lc * 0.6, 0, 0.42, 0.42, 0.55, C.seat);
    K.box(u + W / 2 - 0.08, v0 + 0.1, 0.86, 0.05, 0.05, 1.1, C.counterD);
    K.sign([String(n)], u + W / 2 - 0.08, v0 + 0.06, 1.8, 0.3, 0.3, -1, 2, true);
    K.solid(u, vm, W + 0.1, lc);
    K.spot('kasse', u + W / 2 + 0.36, v0 + lc * 0.6, [-1, 0]);
    void R;
  }
  void goodsRunU;
  return { baumarkt, hochregal, kragarm, palletLoad, plantTable, shrubs, partFrame, DEPT, B };
})();
