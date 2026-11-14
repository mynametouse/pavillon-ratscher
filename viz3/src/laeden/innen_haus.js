// ===================== feat/laeden-innen 4: furniture store, the mall, restaurants, kebab house, laundry, petrol station, drinks market, pharmacy, bakery (LIHAUS) =====================
// Pure layouts (no three.js, no DOM – node tests: viz3/test/unit/laeden_innen.test.mjs), generic after photos of such places in Germany:
// the furniture store's room islands (living room, bedroom, kitchen, dining, office, children) with plain tags; the Mega Center's
// corridor with the tenants' shop fronts and their names (what lies behind a front is a shallow shop seen through the glass); the fast
// food restaurant's counter with menu boards in plain text (names of dishes, no prices, no brands), order kiosks, tables, the corridor to
// the toilets; the kebab house; the laundry service; the petrol station's shop with its counter and coffee machine; the drinks market's
// crates on pallets; the pharmacy's counter and drawers; the bakery with its tables.
import { LIPLAN } from './innen_plan.js';
import { LIMARKT } from './innen_markt.js';
import { LIBAU } from './innen_bau.js';
export const LIHAUS = (() => {
  const { L, rnd, hash, kit } = LIPLAN;
  const { C, PAL, gondola, wallShelf, chiller, checkout, goodsRunU, goodsRunV, pfand, hallFrame } = LIMARKT;
  const H = {
    carpet: L(0.42, 0.4, 0.38),
    carpetB: L(0.4, 0.38, 0.36),
    path: L(0.75, 0.73, 0.68),
    tileA: L(0.8, 0.77, 0.7),
    tileB: L(0.76, 0.73, 0.66),
    wood: L(0.55, 0.4, 0.26),
    woodL: L(0.75, 0.62, 0.45),
    oak: L(0.62, 0.48, 0.32),
    white: L(0.9, 0.9, 0.88),
    grey: L(0.55, 0.56, 0.57),
    dark: L(0.18, 0.18, 0.19),
    steel: L(0.68, 0.7, 0.72),
    fabric: [
      L(0.45, 0.5, 0.55),
      L(0.6, 0.55, 0.45),
      L(0.35, 0.4, 0.3),
      L(0.55, 0.3, 0.28),
      L(0.7, 0.68, 0.62),
      L(0.3, 0.32, 0.4),
    ],
    rug: [L(0.6, 0.55, 0.48), L(0.4, 0.45, 0.5), L(0.55, 0.35, 0.3), L(0.7, 0.68, 0.6)],
    bedding: [L(0.92, 0.92, 0.9), L(0.75, 0.8, 0.85), L(0.85, 0.78, 0.7), L(0.7, 0.75, 0.68)],
    front: [L(0.92, 0.92, 0.9), L(0.35, 0.36, 0.38), L(0.62, 0.48, 0.32), L(0.7, 0.72, 0.68), L(0.45, 0.55, 0.62)],
    plant: L(0.25, 0.45, 0.2),
    glassD: L(0.3, 0.34, 0.36),
    table: L(0.82, 0.8, 0.76),
    chair: [L(0.25, 0.25, 0.27), L(0.6, 0.45, 0.3), L(0.8, 0.8, 0.78)],
  };
  // the frame of a room: its edge with the door (u along it, v into the room)
  const roomFrame = (u, door) => {
    let hall = u.vols[0];
    for (const v of u.vols) if (Math.abs(LIPLAN.area(v.f)) > Math.abs(LIPLAN.area(hall.f))) hall = v;
    return { hall, F: hallFrame(hall, door) };
  };
  // ---- furniture (local frame of a kit; ang turns a piece; the piece's front looks towards +v' of its turn) ----
  function sofa(K, u, v, w, col, ang = 0) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      at = (a, b) => [u + a * c - b * s, v + a * s + b * c];
    let p = at(0, 0);
    K.box(p[0], p[1], 0.1, w, 0.9, 0.32, col, col, ang); // the seat
    p = at(0, -0.36);
    K.box(p[0], p[1], 0.42, w, 0.18, 0.42, col, col, ang); // the back
    for (const e of [-1, 1]) {
      p = at(e * (w / 2 - 0.1), 0);
      K.box(p[0], p[1], 0.1, 0.2, 0.9, 0.52, col, col, ang); // the arms
    }
    for (const e of [-1, 1]) {
      p = at(e * (w / 4), 0.05);
      K.box(p[0], p[1], 0.42, w / 2 - 0.2, 0.6, 0.12, L(col[0] * 1.1, col[1] * 1.1, col[2] * 1.1), null, ang); // cushions
    }
    p = at(0, 0);
    K.box(p[0], p[1], 0, w - 0.1, 0.8, 0.1, H.dark, H.dark, ang); // the feet
    p = at(0, 0);
    K.solid(p[0], p[1], w, 0.95, ang);
  }
  function bed(K, u, v, w, col, ang = 0) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      at = (a, b) => [u + a * c - b * s, v + a * s + b * c];
    let p = at(0, 0);
    K.box(p[0], p[1], 0, w + 0.1, 2.1, 0.3, H.oak, H.oak, ang); // the frame
    K.box(p[0], p[1], 0.3, w, 2.0, 0.2, H.white, H.white, ang); // the mattress
    p = at(0, 0.25);
    K.box(p[0], p[1], 0.5, w - 0.04, 1.4, 0.1, col, col, ang); // the duvet
    for (const e of w > 1.2 ? [-1, 1] : [0]) {
      p = at(e * (w / 4), -0.75);
      K.box(p[0], p[1], 0.5, w > 1.2 ? w / 2 - 0.12 : w - 0.15, 0.4, 0.12, H.white, H.white, ang); // pillows
    }
    p = at(0, -1.05);
    K.box(p[0], p[1], 0, w + 0.1, 0.08, 1.05, H.oak, H.oak, ang); // the headboard
    p = at(0, 0);
    K.solid(p[0], p[1], w + 0.2, 2.2, ang);
  }
  function table(K, u, v, w, d, col, ang = 0, chairs = 0) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      at = (a, b) => [u + a * c - b * s, v + a * s + b * c];
    let p = at(0, 0);
    K.box(p[0], p[1], 0.72, w, d, 0.04, col, col, ang);
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      p = at(a * (w / 2 - 0.06), b * (d / 2 - 0.06));
      K.box(p[0], p[1], 0, 0.05, 0.05, 0.72, H.dark, H.dark, ang);
    }
    // chairs along the long sides
    const n = Math.max(0, chairs);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1,
        k = Math.floor(i / 2),
        per = Math.ceil(n / 2),
        a = -w / 2 + (w / per) * (k + 0.5);
      chair(K, ...at(a, side * (d / 2 + 0.3)), ang + (side > 0 ? Math.PI : 0), H.chair[i % 1]);
    }
    p = at(0, 0);
    K.solid(p[0], p[1], w + (n ? 0.2 : 0), d + (n ? 1.0 : 0), ang);
  }
  function chair(K, u, v, ang, col = H.chair[0]) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      at = (a, b) => [u + a * c - b * s, v + a * s + b * c];
    let p = at(0, 0);
    K.box(p[0], p[1], 0.44, 0.42, 0.42, 0.05, col, col, ang);
    p = at(0, -0.19);
    K.box(p[0], p[1], 0.49, 0.42, 0.04, 0.42, col, col, ang);
    for (const [a, b] of [
      [-0.18, -0.18],
      [0.18, -0.18],
      [0.18, 0.18],
      [-0.18, 0.18],
    ]) {
      p = at(a, b);
      K.box(p[0], p[1], 0, 0.03, 0.03, 0.44, H.dark, H.dark, ang);
    }
  }
  function cabinet(K, u, v, w, d, h, col, ang = 0, doors = 2) {
    K.box(u, v, 0, w, d, h, col, col, ang);
    const c = Math.cos(ang),
      s = Math.sin(ang);
    // the door lines on the front (+v' side)
    for (let i = 1; i < doors; i++) {
      const a = -w / 2 + (w / doors) * i,
        b = d / 2 + 0.003;
      K.box(
        u + a * c - b * s,
        v + a * s + b * c,
        0.05,
        0.01,
        0.004,
        h - 0.1,
        L(col[0] * 0.6, col[1] * 0.6, col[2] * 0.6),
        null,
        ang
      );
    }
    K.solid(u, v, w, d, ang);
  }
  // a price tag on a stand (a plain plate: what it is)
  function tag(K, u, v, text, faceV) {
    K.box(u, v, 0, 0.04, 0.04, 1.0, H.dark);
    K.sign([text], u, v - faceV * 0.03, 1.0, 0.42, 0.26, faceV, 3);
  }
  // ---- the furniture store: room islands on a carpet, a lighter path through them ----
  function moebel(P, u) {
    const R = rnd(hash(u.id) + 31),
      door = u.doors[0],
      G = LIPLAN.store(u, door, hallFrame),
      { F, polys, U0, U1, V1, de } = G,
      K = kit(P, F, 0);
    P.secs.push({ id: 0, vols: u.vols.map((v, i) => i), h: Math.min(4.6, u.vols[0].h - 1.6) });
    P.floor = { floorA: H.carpet, floorB: H.carpetB };
    P.cell = 2.0;
    const inside = (u0, v0, u1, v1) =>
      LIPLAN.bandMulti(polys, u0, u1).some(([a, b]) => a <= v0 + 0.01 && b >= v1 - 0.01);
    // the entrance: an information counter and the till
    const ue = de[0];
    K.box(ue + 4.2, 3.2, 0, 3.2, 0.9, 1.0, H.white, H.woodL);
    K.box(ue + 4.6, 3.5, 1.0, 0.4, 0.3, 0.25, C.counterD);
    K.glow(ue + 4.6, 3.34, 1.05, 0.34, 0.01, 0.2, C.screen);
    K.sign(['Information · Kasse'], ue + 4.2, 3.2, 2.7, 2.6, 0.45, -1, 0, true);
    K.solid(ue + 4.2, 3.2, 3.3, 1.0);
    K.spot('kasse', ue + 4.2, 3.95, [0, -1]);
    // islands in a grid: 7.2 × 6.2 m with aisles of 3 m; the kinds in turn
    const kinds = ['wohnen', 'schlafen', 'kueche', 'essen', 'buero', 'kinder', 'wohnen', 'schlafen'],
      sign = {
        wohnen: 'Wohnen',
        schlafen: 'Schlafen',
        kueche: 'Küchen',
        essen: 'Essen',
        buero: 'Büro',
        kinder: 'Kinder',
      };
    let k = Math.floor(R() * 3);
    const IW = 7.2,
      ID = 6.2,
      AU = 3.0,
      AV = 3.0;
    const seen = new Set();
    for (let v = 7.5; v + ID < V1 - 1.5; v += ID + AV)
      for (let uu = U0 + 2.5; uu + IW < U1 - 2.0; uu += IW + AU) {
        if (!inside(uu - 0.5, v - 0.5, uu + IW + 0.5, v + ID + 0.5)) continue;
        if (Math.abs(uu + IW / 2 - ue) < IW / 2 + 1.5 && v < 12) continue; // the way in stays free
        const kind = kinds[k++ % kinds.length];
        island(K, R, uu + IW / 2, v + ID / 2, IW, ID, kind);
        if (!seen.has(kind) || R() < 0.3) {
          K.sign([sign[kind]], uu + IW / 2, v - AV / 2, 3.3, 1.8, 0.45, -1, 0, true);
          seen.add(kind);
        }
      }
    // the paths: lighter strips along the aisles (just above the carpet)
    for (let uu = U0 + 2.5 - AU / 2; uu < U1; uu += IW + AU)
      for (const [a, b] of LIPLAN.bandMulti(polys, uu - 0.9, uu + 0.9))
        if (b - a > 3) K.box(uu, (a + b) / 2, 0, 1.6, b - a - 1, 0.008, H.path);
    // lights: a grid of panels
    for (let uu = U0 + 3; uu < U1 - 2; uu += 4.5)
      for (const [a, b] of LIPLAN.bandMulti(polys, uu - 0.2, uu + 0.2))
        for (let vv = a + 2.5; vv < b - 1.5; vv += 4.5) K.light(uu, vv, P.secs[0].h - 0.05, 0.6, 0.6);
    P.frame = F;
    return P;
  }
  function island(K, R, u, v, w, d, kind) {
    const rug = H.rug[Math.floor(R() * H.rug.length)],
      fab = H.fabric[Math.floor(R() * H.fabric.length)],
      fr = H.front[Math.floor(R() * H.front.length)];
    // the island's floor: a slightly raised platform with its own floor
    K.box(u, v, 0, w, d, 0.04, kind === 'kueche' ? H.tileA : H.woodL, kind === 'kueche' ? H.tileA : H.woodL);
    if (kind === 'wohnen') {
      K.box(u, v + 0.3, 0.04, 3.2, 2.2, 0.012, rug, rug);
      sofa(K, u, v - 0.9, 2.3, fab);
      sofa(K, u - 2.2, v + 0.6, 0.95, fab, -Math.PI / 2);
      K.box(u, v + 0.4, 0.04, 1.1, 0.6, 0.4, H.oak); // the coffee table
      cabinet(K, u, v + d / 2 - 0.35, 2.0, 0.45, 0.5, fr, Math.PI);
      K.box(u + 2.4, v - 1.1, 0.04, 0.05, 0.05, 1.5, H.dark);
      K.box(u + 2.4, v - 1.1, 1.5, 0.35, 0.35, 0.3, H.white); // a floor lamp
      tag(K, u + w / 2 - 0.5, v - d / 2 + 0.4, 'Sofa 3-Sitzer', -1);
    } else if (kind === 'schlafen') {
      bed(K, u, v + 0.1, 1.8, H.bedding[Math.floor(R() * H.bedding.length)]);
      for (const e of [-1, 1]) K.box(u + e * 1.25, v - 0.75, 0.04, 0.5, 0.42, 0.5, H.oak);
      cabinet(K, u - w / 2 + 1.6, v + d / 2 - 0.4, 2.5, 0.6, 2.2, fr, Math.PI, 3);
      tag(K, u + w / 2 - 0.5, v - d / 2 + 0.4, 'Doppelbett 180 × 200', -1);
    } else if (kind === 'kueche') {
      // an L of base cabinets with a worktop, wall cabinets above, a sink, a hob, an oven tower
      const zb = 0.04;
      K.box(u, v + d / 2 - 0.35, zb, w - 1.2, 0.6, 0.86, fr, H.dark);
      K.box(u, v + d / 2 - 0.35, zb + 0.86, w - 1.1, 0.64, 0.04, L(0.3, 0.3, 0.3));
      K.box(u - w / 2 + 0.95, v + 0.3, zb, 0.6, d - 1.9, 0.86, fr, H.dark);
      K.box(u - w / 2 + 0.95, v + 0.3, zb + 0.86, 0.64, d - 1.8, 0.04, L(0.3, 0.3, 0.3));
      K.box(u + 0.5, v + d / 2 - 0.45, zb + 0.9, 0.6, 0.4, 0.02, H.steel); // the sink
      K.box(u - 1.2, v + d / 2 - 0.4, zb + 0.9, 0.6, 0.52, 0.01, H.dark); // the hob
      K.box(u, v + d / 2 - 0.2, zb + 1.5, w - 1.2, 0.35, 0.7, fr); // wall cabinets
      K.box(u + w / 2 - 0.9, v + d / 2 - 0.35, zb, 0.6, 0.6, 2.1, fr); // the oven tower
      K.box(u + w / 2 - 0.9, v + d / 2 - 0.66, zb + 0.9, 0.5, 0.01, 0.5, H.dark);
      K.solid(u, v + d / 2 - 0.35, w - 1.1, 0.7);
      K.solid(u - w / 2 + 0.95, v + 0.3, 0.7, d - 1.8);
      tag(K, u + w / 2 - 0.5, v - d / 2 + 0.4, 'Einbauküche', -1);
    } else if (kind === 'essen') {
      K.box(u, v, 0.04, 3.0, 2.2, 0.012, rug, rug);
      table(K, u, v, 1.8, 0.95, H.oak, 0, 6);
      cabinet(K, u, v + d / 2 - 0.3, 2.0, 0.45, 0.85, fr, Math.PI, 3);
      tag(K, u + w / 2 - 0.5, v - d / 2 + 0.4, 'Esstisch mit 6 Stühlen', -1);
    } else if (kind === 'buero') {
      K.box(u, v + 0.6, 0.04, 1.6, 0.8, 0.72, H.white, H.white);
      chair(K, u, v - 0.1, 0, H.chair[0]);
      cabinet(K, u - 2.0, v + d / 2 - 0.25, 1.8, 0.35, 1.9, fr, Math.PI);
      K.solid(u, v + 0.6, 1.6, 0.8);
      tag(K, u + w / 2 - 0.5, v - d / 2 + 0.4, 'Schreibtisch', -1);
    } else {
      // children: a bunk bed, a small desk, a rug
      K.box(u + 0.5, v, 0.04, 2.0, 1.6, 0.012, H.rug[1], H.rug[1]);
      bed(K, u - 1.6, v + 0.4, 0.95, H.bedding[1], Math.PI / 2);
      K.box(u - 1.6, v + 0.4, 1.3, 2.1, 1.0, 0.08, H.woodL, null, Math.PI / 2);
      K.box(u + 1.8, v + 1.6, 0.04, 1.2, 0.6, 0.72, H.white);
      tag(K, u + w / 2 - 0.5, v - d / 2 + 0.4, 'Etagenbett', -1);
    }
  }

  // ---- the mall: the entrance hall, the corridor with the tenants' fronts (a shallow shop behind each glass), benches, planters ----
  const TENANTS = {
    // what one sees behind the glass: clothes racks, shoes on wall shelves, a drugstore's rows, home textiles, … – generic
    JYSK: 'heim',
    'Repo-Markt': 'regal',
    'AWG-Modecenter': 'mode',
    Müller: 'drogerie',
    KiK: 'mode',
    Deichmann: 'schuhe',
    Zoofachhandel: 'zoo',
    'Mäc-Geiz': 'regal',
    "Ernsting's family": 'mode',
    Febana: 'mode',
    'Uhren Schmuck': 'schmuck',
    Friseur: 'friseur',
    'Café & Backshop Drei Ähren': 'cafe',
  };
  function mall(P, u) {
    const R = rnd(hash(u.id) + 41),
      door = u.doors[0],
      F = u.frame, // the Mega Center's frame: u along the west front (south), v into the house
      K = kit(P, F, 0);
    P.secs.push({ id: 0, vols: u.vols.map((v, i) => i), h: 3.8 });
    P.floor = { floorA: H.tileA, floorB: H.tileB };
    P.cell = 0.8;
    P.holes = [];
    const [h0, h1] = u.hall ? [u.hall[0], u.hall[1]] : [66, 78],
      [c0, c1, cv0, cv1] = u.corr || [46, 142, 30, 37];
    // the fronts: [u0, u1] on a wall line v = vw (facing dir into the corridor), names from the board
    const names = (u.board && u.board.names ? u.board.names : Object.keys(TENANTS)).filter(n => TENANTS[n]);
    const east = [],
      west = [];
    // east row (the long wall v = cv1, deep shops behind): the big ones; west row (v = cv0, beside the entrance hall): the small ones
    const big = ['JYSK', 'Repo-Markt', 'AWG-Modecenter', 'Müller', 'KiK', 'Deichmann', 'Zoofachhandel'];
    for (const n of names) (big.includes(n) ? east : west).push(n);
    const place = (list, a0, a1, vw, dir) => {
      const total = a1 - a0,
        widths = list.map(n => (big.includes(n) ? 11 : n === 'Uhren Schmuck' || n === 'Friseur' ? 5.5 : 8)),
        sum = widths.reduce((s, w) => s + w, 0),
        gap = Math.max(0.8, (total - sum) / (list.length + 1));
      let a = a0 + gap;
      list.forEach((n, i) => {
        const w = Math.min(widths[i], a1 - a - 0.5);
        if (w < 3) return;
        front(P, K, R, n, a + w / 2, w, vw, dir);
        a += w + gap;
      });
    };
    place(east, c0 + 1, c1 - 1, cv1, -1);
    const wl = west.slice(0, Math.ceil(west.length / 2)),
      wr = west.slice(Math.ceil(west.length / 2));
    place(wl, h1 + 0.5, c1 - 1, cv0, 1);
    place(wr, c0 + 1, h0 - 0.5, cv0, 1);
    // the entrance hall: the board of the shops, benches, planters; the corridor: benches and planters in its middle, columns
    if (u.board) {
      const bu = (h0 + h1) / 2,
        bv = 14;
      K.box(bu, bv, 0, 1.7, 0.15, 3.1, H.dark);
      K.sign([u.board.title || 'Mega Center'].concat(u.board.names || []), bu, bv - 0.08, 0.6, 1.5, 2.4, -1, 0);
      K.sign([u.board.title || 'Mega Center'].concat(u.board.names || []), bu, bv + 0.08, 0.6, 1.5, 2.4, 1, 0);
      K.solid(bu, bv, 1.8, 0.3);
    }
    for (const [bu, bv] of [
      [h0 + 1.8, 8],
      [h1 - 1.8, 8],
      [h0 + 1.8, 21],
      [h1 - 1.8, 21],
    ])
      planter(K, R, bu, bv);
    for (let uu = c0 + 8; uu < c1 - 6; uu += 16) {
      if (uu > h0 - 3 && uu < h1 + 3) continue;
      bench(K, uu, (cv0 + cv1) / 2, 0);
      planter(K, R, uu + 4, (cv0 + cv1) / 2);
    }
    // lights: rows of panels along the corridor and the hall
    for (let uu = c0 + 2; uu < c1 - 1; uu += 3.0) K.light(uu, (cv0 + cv1) / 2, 3.74, 0.6, 1.2);
    for (let vv = 2.5; vv < cv0 - 1; vv += 3.0) for (const uu of [h0 + 3, h1 - 3]) K.light(uu, vv, 3.74, 0.6, 1.2);
    P.wallCol = L(0.86, 0.85, 0.82);
    P.frame = F;
    void door;
    return P;
  }
  function bench(K, u, v, ang) {
    K.box(u, v, 0.42, 1.8, 0.5, 0.06, H.wood, H.woodL, ang);
    for (const e of [-0.75, 0.75])
      K.box(u + e * Math.cos(ang), v + e * Math.sin(ang), 0, 0.08, 0.45, 0.42, H.dark, H.dark, ang);
    K.solid(u, v, 1.85, 0.55, ang);
  }
  function planter(K, R, u, v) {
    K.box(u, v, 0, 1.1, 1.1, 0.55, H.grey);
    K.good('heap', u, v, 0.55, 'u', 1.2, 1.2, 0.8 + R() * 0.6, H.plant, 1, 0, R());
    K.solid(u, v, 1.15, 1.15);
  }
  // a tenant's front on the corridor wall v = vw (facing dir into the corridor): the opening in the wall (P.holes), frames, the name
  // over it, behind it a shallow shop (3 m) – what kind of shop it is shows through the glass
  function front(P, K, R, name, uc, w, vw, dir) {
    const hG = 3.0,
      depth = 3.2,
      back = vw - dir * depth;
    const [x, y] = K.F.W(uc, vw),
      on = [K.F.ev[0] * -dir, K.F.ev[1] * -dir]; // the wall's outward normal (from the corridor into the shop)
    P.holes.push({ x, y, nx: on[0], ny: on[1], front: w, hG, z0: 0, w: 0, hD: 0, id: 'mall:' + name });
    // the frames: posts every ~1.6 m, the head, a plinth
    const n = Math.max(1, Math.round(w / 1.6));
    for (let i = 0; i <= n; i++) K.box(uc - w / 2 + (w * i) / n, vw + dir * 0.03, 0, 0.07, 0.07, hG, H.dark);
    K.box(uc, vw + dir * 0.03, hG - 0.1, w, 0.08, 0.1, H.dark);
    K.box(uc, vw + dir * 0.03, 0, w, 0.08, 0.12, H.dark);
    // the name band over the front
    K.box(uc, vw + dir * 0.05, hG, Math.min(w - 0.3, Math.max(2.4, name.length * 0.26)) + 0.2, 0.06, 0.6, H.dark);
    K.sign([name], uc, vw + dir * 0.09, hG + 0.08, Math.min(w - 0.4, Math.max(2.2, name.length * 0.24)), 0.44, dir, 0);
    // the shop behind: its floor, back wall, side walls, ceiling (seen from the corridor), and what it sells
    const kind = TENANTS[name] || 'regal',
      tint = [
        [0.88, 0.86, 0.82],
        [0.8, 0.84, 0.88],
        [0.86, 0.82, 0.78],
        [0.84, 0.86, 0.8],
      ][Math.floor(R() * 4)].map(c => c * 0.85);
    const um = uc,
      vm = (vw + back) / 2;
    K.box(um, vm, -0.02, w, depth, 0.025, L(0.82, 0.8, 0.76));
    K.box(um, back + dir * 0.03, 0, w, 0.06, hG + 0.4, tint);
    for (const e of [-1, 1]) K.box(um + e * (w / 2 + 0.03), vm, 0, 0.06, depth, hG + 0.4, tint);
    K.box(um, vm, hG + 0.36, w + 0.1, depth, 0.04, L(0.92, 0.92, 0.9));
    for (let uu = um - w / 2 + 1; uu < um + w / 2 - 0.5; uu += 2) K.glow(uu, vm, hG + 0.33, 0.5, 0.5, 0.02, C.lampDim);
    const pals = {
      mode: [L(0.25, 0.3, 0.45), L(0.75, 0.72, 0.68), L(0.55, 0.2, 0.25), L(0.35, 0.45, 0.35), L(0.85, 0.6, 0.55)],
      schuhe: [L(0.3, 0.2, 0.15), L(0.15, 0.15, 0.16), L(0.7, 0.68, 0.65), L(0.5, 0.35, 0.25)],
    };
    if (kind === 'mode') {
      // clothes on rails: two round racks and a wall rail
      for (const e of [-1, 1])
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          K.box(
            um + e * (w / 4) + Math.cos(a) * 0.45,
            vm + Math.sin(a) * 0.45,
            0.45,
            0.32,
            0.06,
            0.85,
            pals.mode[(i + (e > 0 ? 2 : 0)) % 5]
          );
        }
      for (let uu = um - w / 2 + 0.4; uu < um + w / 2 - 0.4; uu += 0.12)
        K.box(uu, back + dir * 0.35, 0.7, 0.05, 0.4, 0.9, pals.mode[Math.floor(R() * 5)]);
      K.box(um, back + dir * 0.35, 1.62, w - 0.6, 0.03, 0.03, H.steel);
    } else if (kind === 'schuhe') {
      for (const z of [0.3, 0.7, 1.1, 1.5, 1.9]) {
        K.box(um, back + dir * 0.2, z - 0.03, w - 0.3, 0.35, 0.03, H.white);
        for (let uu = um - w / 2 + 0.3; uu < um + w / 2 - 0.3; uu += 0.32)
          K.box(uu, back + dir * 0.22, z, 0.26, 0.28, 0.12, pals.schuhe[Math.floor(R() * 4)]);
      }
      K.box(um, vm, 0, 1.2, 0.5, 0.45, H.white);
    } else if (kind === 'drogerie') {
      wallShelf(K, R, um - w / 2 + 0.3, um + w / 2 - 0.3, back, dir, {
        pal: 'drogerie',
        kinds: ['bottle', 'box'],
        h: 2.1,
      });
    } else if (kind === 'heim') {
      bed(K, um - w / 4, vm, 1.4, H.bedding[2], dir > 0 ? Math.PI : 0);
      wallShelf(K, R, um + 0.3, um + w / 2 - 0.3, back, dir, { pal: 'haushalt', kinds: ['pack', 'box'], h: 2.0 });
    } else if (kind === 'zoo') {
      for (let uu = um - w / 2 + 0.8; uu < um + w / 2 - 0.6; uu += 1.3) {
        K.box(uu, back + dir * 0.3, 0, 1.2, 0.5, 0.8, H.dark);
        K.glow(uu, back + dir * 0.3, 0.8, 1.15, 0.45, 0.55, [0.25, 0.55, 0.75]); // an aquarium
      }
      wallShelf(K, R, um - w / 2 + 0.3, um + w / 2 - 0.3, vm + dir * 0.4, -dir, {
        pal: 'tier',
        kinds: ['bag', 'can'],
        h: 1.4,
      });
    } else if (kind === 'schmuck') {
      for (const e of [-1, 1]) {
        K.box(um + e * (w / 4), vm, 0, 1.4, 0.6, 0.9, H.dark);
        K.glow(um + e * (w / 4), vm, 0.9, 1.35, 0.55, 0.12, [0.95, 0.92, 0.8]); // a lit glass counter
      }
    } else if (kind === 'friseur') {
      for (let uu = um - w / 2 + 0.9; uu < um + w / 2 - 0.6; uu += 1.4) {
        K.box(uu, back + dir * 0.03, 0.9, 0.7, 0.03, 1.0, [0.9, 0.92, 0.95]); // a mirror (light)
        K.box(uu, back + dir * 0.7, 0, 0.55, 0.55, 0.5, H.dark);
        K.box(uu, back + dir * 0.45, 0.5, 0.55, 0.08, 0.5, H.dark);
      }
    } else if (kind === 'cafe') {
      K.box(um, back + dir * 0.5, 0, w - 1.0, 0.6, 1.0, H.wood, H.woodL);
      K.glow(um - w / 4, back + dir * 0.5, 1.0, 1.6, 0.5, 0.35, [1.2, 1.1, 0.9]); // the lit cake display
      for (let uu = um - w / 2 + 0.5; uu < um + w / 2 - 0.4; uu += 0.35)
        K.good('loaf', uu, back + dir * 0.12, 1.3, 'u', 0.28, 0.2, 0.12, C.bread, 1, dir);
      // tables in front of the café in the corridor
      for (const e of [-1, 1]) {
        table(K, uc + e * (w / 4), vw + dir * 1.6, 0.7, 0.7, H.table, 0, 2);
      }
    } else {
      // shelves with boxes (a discount store)
      wallShelf(K, R, um - w / 2 + 0.3, um + w / 2 - 0.3, back, dir, {
        pal: 'haushalt',
        kinds: ['box', 'pack'],
        h: 2.1,
      });
      for (const e of [-1, 1]) {
        K.box(um + e * (w / 5), vm, 0, 1.0, 1.0, 0.7, L(0.6, 0.55, 0.45));
        K.good('heap', um + e * (w / 5), vm, 0.7, 'u', 0.9, 0.9, 0.2, PAL.haushalt[Math.floor(R() * 5)], 1, 0);
      }
    }
  }

  // ---- the fast food restaurant (and the Mega-Restaurant): counter and menu boards, kiosks, tables, the corridor to the toilets ----
  function restaurant(P, u) {
    const R = rnd(hash(u.id) + 53),
      door = u.doors[0],
      mega = u.id === 'megarest',
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      de = F.L(door.x, door.y);
    const hc = Math.min(3.3, hall.h - 1.0);
    P.secs.push({ id: 0, vols: u.vols.map((v, i) => i), h: hc });
    P.floor = { floorA: L(0.52, 0.48, 0.44), floorB: L(0.5, 0.46, 0.42) };
    P.cell = 0.6;
    P.wallCol = L(0.78, 0.74, 0.68);
    // the counter across the back part of the room, the kitchen behind it (a wall with a pass-through, steel in it)
    const vC = Math.max(4, V1 - 4.2),
      side = de[0] < (U0 + U1) / 2 ? 1 : -1,
      cu0 = side > 0 ? (U0 + U1) / 2 - 1 : U0 + 1.2,
      cu1 = side > 0 ? U1 - 1.2 : (U0 + U1) / 2 + 1,
      cm = (cu0 + cu1) / 2,
      cw = cu1 - cu0;
    K.box(cm, vC, 0, cw, 0.8, 1.05, L(0.32, 0.3, 0.28), L(0.75, 0.74, 0.72));
    for (let uu = cu0 + 0.8; uu < cu1 - 0.6; uu += 1.6) {
      K.box(uu, vC + 0.15, 1.05, 0.32, 0.25, 0.2, C.counterD);
      K.glow(uu, vC - 0.0, 1.1, 0.28, 0.01, 0.16, C.screen);
      K.spot('theke', uu, vC + 0.75, [0, -1]);
    }
    // the wall behind the counter with the menu boards (plain text: dishes, no prices), the kitchen through the pass
    const vW = vC + 1.6;
    K.box(cm, vW, 0, cw + 1.0, 0.15, hc, L(0.3, 0.28, 0.26));
    const boards = mega
      ? [
          ['Tagesgerichte', 'Schnitzel mit Pommes', 'Gulasch mit Klößen', 'Bratwurst mit Kraut'],
          ['Salate · Suppen', 'Gemischter Salat', 'Kartoffelsuppe', 'Soljanka'],
          ['Getränke', 'Kaffee', 'Tee', 'Saft', 'Wasser'],
        ]
      : [
          ['Burger', 'Hamburger', 'Burger mit Käse', 'Burger mit Hähnchen', 'Veggie-Burger'],
          ['Menüs', 'Burger, Pommes, Getränk', 'Wraps', 'Salate'],
          ['Beilagen', 'Pommes frites', 'Chicken-Stücke', 'Gemüsesticks'],
          ['Getränke · Kaffee', 'Softdrinks', 'Kaffee', 'Milchshakes', 'Wasser'],
        ];
    const bw = Math.min(1.6, (cw - 0.4) / boards.length - 0.15);
    boards.forEach((lines, i) => {
      const uu = cu0 + 0.3 + bw / 2 + i * (bw + 0.15);
      K.sign(lines, uu, vW - 0.09, 1.9, bw, 0.9, -1, 0);
    });
    // the kitchen: steel through the pass (behind the wall's opening between the boards is a gap the eye goes through)
    for (let uu = cu0 + 0.4; uu < cu1 - 0.4; uu += 1.1)
      K.box(uu, vC + 0.95, 0, 0.9, 0.6, 0.9, H.steel, L(0.5, 0.52, 0.55));
    K.solid(cm, vC, cw, 0.85);
    K.solid(cm, vW, cw + 1.0, 0.2);
    for (const e of [-1, 1]) K.solid(e < 0 ? cu0 - 0.2 : cu1 + 0.2, (vC + vW) / 2, 0.3, vW - vC);
    // order kiosks near the entrance (the fast food restaurant)
    if (!mega)
      for (let i = 0; i < 3; i++) {
        const uu = de[0] + side * (2.2 + i * 1.0),
          vv = 2.4;
        K.box(uu, vv, 0, 0.5, 0.35, 1.0, L(0.2, 0.2, 0.22));
        K.box(uu, vv, 1.0, 0.55, 0.1, 0.9, L(0.2, 0.2, 0.22));
        K.glow(uu, vv - 0.06, 1.05, 0.48, 0.01, 0.8, [0.8, 0.85, 0.9]);
        K.solid(uu, vv, 0.6, 0.4);
      }
    // tables: the room's front half, two- and four-seaters; benches along the side walls
    for (let vv = 4.2; vv < vC - 2.4; vv += 2.3)
      for (let uu = U0 + 1.6; uu < U1 - 1.4; uu += 2.6) {
        if (Math.abs(uu - de[0]) < 1.6 && vv < 6) continue;
        if (!LIPLAN.bandSpans(fl, uu - 0.9, uu + 0.9).some(([a, b]) => a < vv - 1 && b > vv + 1)) continue;
        table(K, uu, vv, R() < 0.5 ? 0.75 : 1.2, 0.75, H.table, 0, R() < 0.5 ? 2 : 4);
      }
    // the corridor to the toilets: at the counter's other end, a passage with doors
    const tu = side > 0 ? U0 + 1.6 : U1 - 1.6;
    if (LIPLAN.bandSpans(fl, tu - 1.2, tu + 0.2).some(([a, b]) => a < vC - 1 && b > vC + 2.2)) {
      K.box(tu, vC + 0.5, 0, 0.12, 3.0, hc, P.wallCol);
      K.sign(['WC'], tu + side * 0.1, vC - 0.4, 2.2, 0.5, 0.3, -1, 1, true);
      K.box(tu - side * 0.75, Math.min(V1, vC + 2.0) - 0.08, 0, 0.9, 0.06, 2.05, L(0.6, 0.55, 0.48));
      K.solid(tu, vC + 0.5, 0.2, 3.0);
    }
    // lights: round panels over the tables, a row over the counter
    for (let vv = 4; vv < vC - 1; vv += 2.6)
      for (let uu = U0 + 2; uu < U1 - 1.5; uu += 2.6) K.light(uu, vv, hc - 0.05, 0.5, 0.5);
    K.light(cm, vC - 0.6, hc - 0.05, 0.25, cw - 1);
    P.frame = F;
    return P;
  }

  // ---- the kebab house: counter with the grill, a display, tables ----
  function imbiss(P, u) {
    const R = rnd(hash(u.id) + 61),
      door = u.doors[0],
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      de = F.L(door.x, door.y),
      hc = Math.min(3.0, hall.h - 0.9);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.6, 0.55, 0.5), floorB: L(0.56, 0.52, 0.47) };
    P.cell = 0.5;
    const vC = V1 - 1.6;
    K.box((U0 + U1) / 2, vC, 0, U1 - U0 - 1.4, 0.7, 1.05, H.steel, L(0.8, 0.8, 0.8));
    // the lit display with salads: its lit floor, the bowls on it, of its glass only the edges
    K.glow((U0 + U1) / 2 - 1, vC, 1.05, 1.6, 0.55, 0.02, [1.1, 1.08, 1.0]);
    K.box((U0 + U1) / 2 - 1, vC - 0.27, 1.07, 1.6, 0.025, 0.3, H.steel);
    for (const du of [-0.79, 0.79]) K.box((U0 + U1) / 2 - 1 + du, vC, 1.07, 0.025, 0.55, 0.3, H.steel);
    for (let uu = (U0 + U1) / 2 - 1.6; uu < (U0 + U1) / 2 - 0.3; uu += 0.32)
      K.good(
        'heap',
        uu,
        vC,
        1.07,
        'u',
        0.26,
        0.4,
        0.06,
        [PAL.gemuese[0], PAL.gemuese[2], PAL.gemuese[4]][Math.floor(R() * 3)],
        1,
        0
      );
    // the grill: the spit in front of its heating wall
    const gu = (U0 + U1) / 2 + 1.2;
    K.box(gu, V1 - 0.45, 0, 0.8, 0.5, 1.9, H.steel);
    K.glow(gu, V1 - 0.72, 0.9, 0.5, 0.02, 0.8, [1.6, 0.7, 0.25]);
    K.box(gu, V1 - 0.95, 0.9, 0.26, 0.26, 0.62, L(0.55, 0.32, 0.18));
    K.sign(
      ['Döner · Dürüm · Lahmacun', 'Pommes · Salate · Getränke'],
      (U0 + U1) / 2,
      V1 - 0.08,
      2.0,
      Math.min(3.2, U1 - U0 - 1),
      0.7,
      -1,
      0
    );
    K.solid((U0 + U1) / 2, vC, U1 - U0 - 1.4, 0.75);
    K.spot('theke', (U0 + U1) / 2, vC + 0.6, [0, -1]);
    for (let uu = U0 + 1.2; uu < U1 - 1; uu += 2.2) {
      if (Math.abs(uu - de[0]) < 1.4) continue;
      table(K, uu, 2.0, 0.7, 0.7, H.table, 0, 2);
    }
    chiller(K, R, U1 - 1.6, U1 - 0.3, 0.05, 1, PAL.wasser, true);
    for (let uu = U0 + 1.5; uu < U1 - 1; uu += 2.2) K.light(uu, (vC + 1) / 2, hc - 0.05, 0.5, 0.5);
    P.frame = F;
    return P;
  }
  // ---- the laundry service: counter, machines along a wall, shelves with folded laundry ----
  function waesche(P, u) {
    const R = rnd(hash(u.id) + 67),
      door = u.doors[0],
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      hc = Math.min(3.0, hall.h - 0.9);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.82, 0.82, 0.8), floorB: L(0.78, 0.78, 0.76) };
    P.cell = 0.4;
    K.box((U0 + U1) / 2, 2.4, 0, 2.4, 0.7, 1.0, H.white, H.woodL);
    K.solid((U0 + U1) / 2, 2.4, 2.4, 0.75);
    K.spot('theke', (U0 + U1) / 2, 3.1, [0, -1]);
    // machines along the back wall: washers below, dryers on top
    for (let uu = U0 + 0.7; uu < U1 - 0.6; uu += 0.7) {
      for (const z of [0, 0.86]) {
        K.box(uu, V1 - 0.35, z, 0.62, 0.62, 0.85, H.white);
        K.box(uu, V1 - 0.665, z + 0.25, 0.36, 0.01, 0.36, L(0.22, 0.25, 0.28)); // the round door (dark)
      }
    }
    K.solid((U0 + U1) / 2, V1 - 0.35, U1 - U0 - 0.6, 0.7);
    // shelves with folded laundry
    for (const z of [0.4, 0.9, 1.4])
      for (let uu = U0 + 0.4; uu < U0 + 2.6; uu += 0.36)
        K.box(uu, 3.5, z, 0.32, 0.4, 0.08 + R() * 0.12, H.bedding[Math.floor(R() * 4)]);
    K.box(U0 + 1.5, 3.5, 0, 2.4, 0.45, 0.05, H.grey);
    K.solid(U0 + 1.5, 3.5, 2.4, 0.5);
    K.box(U1 - 1.6, 3.6, 0, 1.6, 0.8, 0.9, H.white); // the folding table
    K.solid(U1 - 1.6, 3.6, 1.6, 0.8);
    for (let uu = U0 + 1.5; uu < U1 - 1; uu += 2.5) K.light(uu, (V1 + 1) / 2, hc - 0.05, 0.4, 1.2);
    P.frame = F;
    return P;
  }

  // ---- the petrol station's shop: shelves, the counter with the till, cigarettes behind, the coffee machine, drinks chillers ----
  function tankstelle(P, u) {
    const R = rnd(hash(u.id) + 71),
      door = u.doors[0],
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      de = F.L(door.x, door.y),
      hc = Math.min(3.0, hall.h - 0.9);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.72, 0.72, 0.7), floorB: L(0.68, 0.68, 0.66) };
    P.cell = 0.6;
    const side = de[0] < (U0 + U1) / 2 ? 1 : -1;
    // the counter on the far side from the door along the back wall, cigarettes in a cabinet behind
    const cu = side > 0 ? U1 - 3.2 : U0 + 3.2,
      vC = V1 - 1.9;
    K.box(cu, vC, 0, 4.4, 0.7, 1.0, L(0.82, 0.82, 0.8), L(0.3, 0.3, 0.32));
    K.box(cu - 0.8, vC + 0.1, 1.0, 0.35, 0.3, 0.22, C.counterD);
    K.glow(cu - 0.8, vC - 0.06, 1.05, 0.3, 0.01, 0.18, C.screen);
    K.good('loaf', cu + 1.0, vC, 1.0, 'u', 1.2, 0.5, 0.15, C.bread, 6, -1); // rolls in the display
    K.box(cu, V1 - 0.3, 0, 4.4, 0.5, 2.2, L(0.2, 0.2, 0.22));
    for (const z of [0.9, 1.15, 1.4, 1.65, 1.9])
      for (let uu = cu - 2.0; uu < cu + 2.0; uu += 0.12)
        K.box(uu, V1 - 0.56, z, 0.1, 0.03, 0.18, PAL.tabak[Math.floor(R() * 5)]);
    K.sign(['Kasse'], cu, vC, 2.25, 1.0, 0.3, -1, 0, true);
    K.solid(cu, vC, 4.5, 0.75);
    K.spot('kasse', cu - 0.8, vC + 0.7, [0, -1]);
    // the coffee machine on a counter by the window
    const ku = side > 0 ? U0 + 1.2 : U1 - 1.2;
    K.box(ku, V1 - 0.45, 0, 1.8, 0.6, 0.9, H.wood, H.woodL);
    for (const e of [-0.45, 0.35]) {
      K.box(ku + e, V1 - 0.5, 0.9, 0.42, 0.45, 0.7, L(0.2, 0.2, 0.22));
      K.glow(ku + e, V1 - 0.735, 1.3, 0.3, 0.01, 0.15, C.screen);
    }
    K.sign(['Kaffee'], ku, V1 - 0.1, 1.9, 1.0, 0.3, -1, 1);
    K.solid(ku, V1 - 0.45, 1.85, 0.65);
    // drinks chillers on the door's side wall, two short shelves in the middle
    chiller(K, R, side > 0 ? U0 + 0.3 : U1 - 3.3, side > 0 ? U0 + 3.3 : U1 - 0.3, 0.05, 1, PAL.wasser, true);
    for (const uu of [(U0 + U1) / 2 - 1.6, (U0 + U1) / 2 + 1.6])
      gondola(K, R, uu, 2.3, Math.max(3.4, vC - 1.4), {
        h: 1.5,
        levels: [0.14, 0.55, 0.95],
        aisle: LIMARKT.AISLES[uu < (U0 + U1) / 2 ? 6 : 5],
      });
    for (let uu = U0 + 1.5; uu < U1 - 1; uu += 2.4) K.light(uu, V1 / 2, hc - 0.05, 0.3, 1.2);
    P.frame = F;
    return P;
  }
  // ---- the drinks market: pallets of crates in rows, the bottle return bank, a checkout, chillers ----
  function getraenke(P, u) {
    const R = rnd(hash(u.id) + 79),
      door = u.doors[0],
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      de = F.L(door.x, door.y),
      hc = Math.min(4.6, hall.h - 1.4);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.62, 0.62, 0.6), floorB: L(0.6, 0.6, 0.58) };
    P.cell = 2.0;
    const side = U1 - de[0] > de[0] - U0 ? 1 : -1;
    // the checkout by the entrance, the bottle return machines beside it on the front wall
    checkout(K, R, de[0] + side * 3.4, 0.9, 1, side);
    // the bottle return bank: on the other side of the door if there is room, else beyond the checkout
    const inside = (a, b) => LIPLAN.bandSpans(fl, Math.min(a, b) - 0.5, Math.max(a, b) + 0.5).some(([v0]) => v0 < 0.3);
    const ps = inside(de[0] - side * 2.0, de[0] - side * 4.2) ? -side : side,
      p0 = ps === -side ? 2.0 : 5.8;
    for (let i = 0; i < 3; i++) pfand(K, de[0] + ps * (p0 + i * 1.1), 0.75, 1);
    // pallets in rows along v: each one product (crates of one colour), five layers
    const crateCols = [
      L(0.18, 0.35, 0.22),
      L(0.55, 0.12, 0.1),
      L(0.75, 0.62, 0.15),
      L(0.15, 0.22, 0.42),
      L(0.35, 0.22, 0.12),
      L(0.7, 0.7, 0.72),
    ];
    const names = ['Wasser', 'Bier', 'Säfte', 'Limonade', 'Wein · Sekt', 'Saft · Schorle'];
    let ni = 0;
    for (let uu = U0 + 3.2; uu < U1 - 2.4; uu += 3.6) {
      if (Math.abs(uu - de[0]) < 2.2) continue;
      for (const [a, b] of LIPLAN.bandSpans(fl, uu - 0.9, uu + 0.9)) {
        const v0 = Math.max(a + 6.2, 6.2),
          v1 = b - 2.6;
        if (v1 - v0 < 2) continue;
        const col = crateCols[ni % crateCols.length];
        for (let v = v0 + 0.5; v < v1 - 0.4; v += 1.3)
          cratePallet(K, R, uu, v, R() < 0.25 ? crateCols[Math.floor(R() * 6)] : col);
        K.solid(uu, (v0 + v1) / 2, 1.3, v1 - v0);
        K.sign([names[ni % names.length]], uu, (v0 + v1) / 2, 3.0, 1.6, 0.42, -1, 0, true);
        ni++;
      }
    }
    // chillers along the back wall
    chiller(K, R, U0 + 1.0, Math.min(U1 - 1.0, U0 + 9), V1 - 0.05, -1, PAL.wasser, true);
    for (let uu = U0 + 2; uu < U1 - 1.5; uu += 3.6)
      for (const [a, b] of LIPLAN.bandSpans(fl, uu - 0.1, uu + 0.1))
        if (b - a > 3) K.light(uu, (a + b) / 2, hc - 0.05, 0.16, b - a - 2);
    P.frame = F;
    return P;
  }
  function cratePallet(K, R, u, v, col) {
    K.box(u, v, 0, 0.8, 1.2, 0.14, LIBAU.B.pallet);
    for (let l = 0; l < 5; l++) {
      const top = l === 4;
      for (const s of [-1, 1])
        K.good(top ? 'crate' : 'box', u + s * 0.2, v, 0.14 + l * 0.29, 'v', 1.2, 0.4, 0.28, col, 4, s);
    }
    void R;
  }
  // ---- the pharmacy: the counter with its stations, drawers and shelves behind, the free choice in front, a chair ----
  function apotheke(P, u) {
    const R = rnd(hash(u.id) + 83),
      door = u.doors[0],
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      hc = Math.min(3.1, hall.h - 1.0);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.85, 0.85, 0.83), floorB: L(0.82, 0.82, 0.8) };
    P.cell = 0.6;
    const vC = V1 - 2.0,
      um = (U0 + U1) / 2;
    for (let i = -1; i <= 1; i++) {
      K.box(um + i * 1.6, vC, 0, 1.3, 0.7, 1.0, H.white, L(0.75, 0.82, 0.78));
      K.box(um + i * 1.6, vC + 0.1, 1.0, 0.35, 0.25, 0.25, C.counterD);
      K.glow(um + i * 1.6, vC - 0.04, 1.05, 0.3, 0.01, 0.18, C.screen);
    }
    K.solid(um, vC, 4.6, 0.75);
    K.spot('theke', um, vC + 0.65, [0, -1]);
    // drawers behind: a tall white cabinet with fronts
    K.box(um, V1 - 0.35, 0, U1 - U0 - 1.2, 0.6, 2.2, H.white);
    for (let z = 0.2; z < 2.0; z += 0.25)
      for (let uu = U0 + 0.8; uu < U1 - 0.8; uu += 0.5) K.box(uu, V1 - 0.66, z, 0.44, 0.01, 0.2, L(0.82, 0.84, 0.84));
    K.solid(um, V1 - 0.35, U1 - U0 - 1.2, 0.65);
    // free choice: shelves on the side walls
    for (const s of [-1, 1]) {
      const us = s < 0 ? U0 + 0.05 : U1 - 0.05;
      for (const z of [0.3, 0.75, 1.2, 1.65]) {
        K.box(us - s * 0.2, (vC - 0.5) / 2 + 0.8, z - 0.03, 0.4, vC - 2.2, 0.03, H.white);
        goodsRunV(K, R, us - s * 0.38, -s, 1.2, vC - 1.4, z, 0.3, 0.3, PAL.apo, ['box', 'bottle']);
      }
      K.solid(us - s * 0.2, (vC - 0.5) / 2 + 0.8, 0.45, vC - 2.2);
    }
    chair(K, um + 1.5, 1.6, Math.PI);
    K.sign(['Apotheke'], um, V1 - 0.07, 2.35, 1.4, 0.32, -1, 0);
    for (let uu = U0 + 1.5; uu < U1 - 1; uu += 2.5) K.light(uu, V1 / 2, hc - 0.05, 0.5, 0.5);
    P.frame = F;
    return P;
  }
  // ---- the bakery café: counter with the display, bread on the wall, tables ----
  function baecker(P, u) {
    const R = rnd(hash(u.id) + 89),
      door = u.doors[0],
      { hall, F } = roomFrame(u, door),
      fl = F.polyL(hall.f),
      [U0, , U1, V1] = LIPLAN.bbOf(fl),
      K = kit(P, F, 0),
      de = F.L(door.x, door.y),
      hc = Math.min(3.2, hall.h - 1.2);
    P.secs.push({ id: 0, vols: [0], h: hc });
    P.floor = { floorA: L(0.62, 0.5, 0.38), floorB: L(0.58, 0.47, 0.36) };
    P.cell = 0.5;
    P.wallCol = L(0.88, 0.84, 0.76);
    // counter along the far wall, bread behind
    const vC = V1 - 1.9,
      um = (U0 + U1) / 2;
    LIMARKT.bakery(K, R, U0 + 0.8, U1 - 0.8, V1 - 0.05, -1, false);
    // tables near the windows
    for (let uu = U0 + 1.3; uu < U1 - 1; uu += 2.3) {
      if (Math.abs(uu - de[0]) < 1.4) continue;
      table(K, uu, Math.min(2.4, vC - 2), 0.7, 0.7, H.table, 0, 2);
    }
    for (let uu = U0 + 1.5; uu < U1 - 1; uu += 2.4) K.light(uu, V1 / 2, hc - 0.05, 0.45, 0.45);
    void um;
    P.frame = F;
    return P;
  }
  const LAY = { moebel, mall, restaurant, imbiss, waesche, tankstelle, getraenke, apotheke, baecker };
  void goodsRunU;
  return {
    LAY,
    moebel,
    mall,
    restaurant,
    imbiss,
    waesche,
    tankstelle,
    getraenke,
    apotheke,
    baecker,
    sofa,
    bed,
    table,
    chair,
    TENANTS,
    H,
  };
})();
