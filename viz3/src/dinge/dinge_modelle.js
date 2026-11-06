// ===================== feat/welt-dinge 1: models of what the aerial photo shows besides buildings (DMOD) =====================
// Falko, 5.11.2026 22:52: parked cars, trailers … lie flat in the ground image – they should stand in 3D at their true place, in true size.
// Parked cars of five generic body types without any brand (small car, compact, estate, SUV, van; true outer measures of typical German
// cars of each class), trailers, caravans, tractors, round and square bales, woodpiles, log piles, pools, trampolines, containers – each
// a geometry of vertex colours from the kit of world/village_props.js (x right, y forward, z up; origin on the ground under the middle).
// One material for all of them (plain(): sky visibility, the garden's light): instanced cars take their paint from the instance colour,
// but only where the vertex colour is pure white (the body) – glass, tyres, lamps and plates keep theirs. Its two programs (instanced with
// colour, merged) are compiled with the scene at the start (warm meshes, never drawn), so nothing compiles later.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { plain } from '../core/assets.js';
import { VPROPS } from '../world/village_props.js';
export const DMOD = (() => {
  const S = { on: !!(VPROPS && VPROPS.kit), geo: {}, tris: {} };
  if (!S.on) return S;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  S.L = L;
  // paint: pure white – the instance colour replaces it (never use 1, 1, 1 for anything else)
  const PAINT = [1, 1, 1],
    GLASS = L(0.07, 0.085, 0.1),
    DARK = L(0.06, 0.06, 0.065),
    TYRE = L(0.045, 0.045, 0.045),
    RIM = L(0.4, 0.41, 0.43),
    HEAD = L(0.86, 0.87, 0.86),
    TAIL = L(0.55, 0.06, 0.05),
    PLATE = L(0.88, 0.88, 0.84),
    UNDER = L(0.025, 0.025, 0.025),
    ARCH = L(0.035, 0.035, 0.038);
  // ---- the material: plain() and the paint rule for instances ----
  const mat = plain({ vertexColors: true, roughness: 0.5, envMapIntensity: 0.9 });
  {
    const prev = mat.onBeforeCompile,
      key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.vertexShader = sh.vertexShader.replace(
        '#include <color_vertex>',
        THREE.ShaderChunk.color_vertex.replace(
          'vColor.xyz *= instanceColor.xyz;',
          'if ( color.r + color.g + color.b > 2.995 ) vColor.xyz *= instanceColor.xyz;'
        )
      );
    };
    mat.customProgramCacheKey = () => key + '|dinge';
  }
  S.mat = mat;
  // ---- helpers on a kit ----
  // a frustum from z0 to z1: footprint [x0, x1, y0, y1] at the bottom and at the top
  function prism(k, b, t, z0, z1, col, top = true, bottom = false) {
    const [bx0, bx1, by0, by1] = b,
      [tx0, tx1, ty0, ty1] = t;
    k.quad([bx1, by0, z0], [bx1, by1, z0], [tx1, ty1, z1], [tx1, ty0, z1], col);
    k.quad([bx1, by1, z0], [bx0, by1, z0], [tx0, ty1, z1], [tx1, ty1, z1], col);
    k.quad([bx0, by1, z0], [bx0, by0, z0], [tx0, ty0, z1], [tx0, ty1, z1], col);
    k.quad([bx0, by0, z0], [bx1, by0, z0], [tx1, ty0, z1], [tx0, ty0, z1], col);
    if (top) k.quad([tx0, ty0, z1], [tx1, ty0, z1], [tx1, ty1, z1], [tx0, ty1, z1], col);
    if (bottom) k.quad([bx0, by1, z0], [bx1, by1, z0], [bx1, by0, z0], [bx0, by0, z0], col);
  }
  // a wheel on the side x (sign: outside), centre (y, r): tread below the body, the tyre's face and the rim just outside the body
  function wheel(k, x, y, r, w, n = 12) {
    const s = Math.sign(x) || 1;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2,
        a1 = ((i + 1) / n) * Math.PI * 2,
        p = (a, xx) => [xx, y + Math.cos(a) * r, r + Math.sin(a) * r];
      if (s > 0) k.quad(p(a0, x - w), p(a1, x - w), p(a1, x), p(a0, x), TYRE);
      else k.quad(p(a1, x + w), p(a0, x + w), p(a0, x), p(a1, x), TYRE);
    }
    k.disc(x + s * 0.004, y, r, s, 0, r, TYRE, n, false);
    k.disc(x + s * 0.008, y, r, s, 0, r * 0.58, RIM, 10, false);
    k.disc(x + s * 0.001, y, r, s, 0, r + 0.07, ARCH, n, false);
  }
  // ---- cars: outer measures (m) of typical cars of each class; the cabin as a frustum of glass, roof and body painted ----
  // L length, W width (without mirrors), H height, wb wheelbase, r wheel radius, zb sill, zw belt line, fh bonnet length (from the
  // front to the foot of the windscreen), ws/rs slope of windscreen/rear window (m back/forward at the top), rr rear overhang of the cabin
  const CARS = {
    klein: { L: 3.95, W: 1.72, H: 1.47, wb: 2.5, r: 0.3, zb: 0.28, zw: 0.86, fh: 0.95, ws: 0.72, rs: 0.32, rr: 0.18 },
    kompakt: {
      L: 4.3,
      W: 1.79,
      H: 1.46,
      wb: 2.63,
      r: 0.31,
      zb: 0.28,
      zw: 0.87,
      fh: 1.12,
      ws: 0.78,
      rs: 0.36,
      rr: 0.18,
    },
    kombi: { L: 4.75, W: 1.83, H: 1.49, wb: 2.79, r: 0.32, zb: 0.29, zw: 0.88, fh: 1.18, ws: 0.8, rs: 0.14, rr: 0.12 },
    suv: { L: 4.55, W: 1.86, H: 1.66, wb: 2.68, r: 0.35, zb: 0.36, zw: 1.0, fh: 1.1, ws: 0.72, rs: 0.18, rr: 0.14 },
    van: { L: 5.3, W: 2.0, H: 2.32, wb: 3.4, r: 0.35, zb: 0.4, zw: 1.12, fh: 0.62, ws: 0.55, rs: 0, rr: 0.06 },
  };
  S.CARS = CARS;
  function carGeo(t) {
    const T = CARS[t],
      k = VPROPS.kit(),
      hw = T.W / 2,
      yF = T.L / 2,
      yR = -T.L / 2;
    // the dark floor under the body (a contact shadow seen from low)
    k.quad(
      [-hw + 0.08, yR + 0.1, 0.03],
      [hw - 0.08, yR + 0.1, 0.03],
      [hw - 0.08, yF - 0.1, 0.03],
      [-hw + 0.08, yF - 0.1, 0.03],
      UNDER
    );
    // lower body: slightly drawn in at the bottom, rounded ends (the top footprint a little shorter than the bottom one at the nose)
    prism(k, [-hw + 0.05, hw - 0.05, yR + 0.06, yF - 0.06], [-hw, hw, yR, yF], T.zb, T.zb + 0.22, PAINT, false);
    prism(k, [-hw, hw, yR, yF], [-hw + 0.02, hw - 0.02, yR + 0.04, yF - 0.1], T.zb + 0.22, T.zw, PAINT, false);
    // bumpers: dark strips at both ends
    k.box(0, yF - 0.04, T.zb - 0.02, T.W - 0.08, 0.12, 0.16, 0, DARK);
    k.box(0, yR + 0.04, T.zb - 0.02, T.W - 0.08, 0.12, 0.16, 0, DARK);
    const yWs = yF - T.fh; // foot of the windscreen
    if (t === 'van') {
      // a box van: bonnet short and steep, the windscreen, then the high box with the cab's side windows
      prism(
        k,
        [-hw + 0.02, hw - 0.02, yWs, yF - 0.1],
        [-hw + 0.06, hw - 0.06, yWs, yF - 0.3],
        T.zw,
        T.zw + 0.18,
        PAINT
      );
      prism(
        k,
        [-hw + 0.02, hw - 0.02, yR + 0.04, yWs],
        [-hw + 0.04, hw - 0.04, yR + 0.04, yWs - T.ws],
        T.zw,
        T.H,
        PAINT
      );
      // the windscreen (glass on the sloping front) and the cab's side windows
      const zg0 = T.zw + 0.05,
        zg1 = T.zw + 0.8;
      const yA = yWs - (T.ws * (zg0 - T.zw)) / (T.H - T.zw),
        yB = yWs - (T.ws * (zg1 - T.zw)) / (T.H - T.zw);
      k.quad(
        [-hw + 0.12, yB + 0.012, zg1],
        [hw - 0.12, yB + 0.012, zg1],
        [hw - 0.1, yA + 0.012, zg0],
        [-hw + 0.1, yA + 0.012, zg0],
        GLASS
      );
      for (const s of [-1, 1]) {
        const x = s * (hw - 0.02 + 0.006),
          y0 = yWs - 0.95,
          y1 = yWs - 0.1;
        if (s > 0) k.quad([x, y0, zg0 + 0.05], [x, y1, zg0 + 0.05], [x, y1 - 0.25, zg1], [x, y0, zg1], GLASS);
        else k.quad([x, y1, zg0 + 0.05], [x, y0, zg0 + 0.05], [x, y0, zg1], [x, y1 - 0.25, zg1], GLASS);
      }
    } else {
      // bonnet, falling to the front
      prism(
        k,
        [-hw + 0.02, hw - 0.02, yWs, yF - 0.1],
        [-hw + 0.06, hw - 0.06, yWs, yF - 0.2],
        T.zw,
        T.zw + 0.07,
        PAINT
      );
      // the cabin: windscreen, side windows and rear window in glass; the roof painted
      const zr = T.H - 0.05,
        yC0 = yR + T.rr,
        top = [-hw + 0.17, hw - 0.17, yC0 + T.rs, yWs - T.ws];
      prism(k, [-hw + 0.03, hw - 0.03, yC0, yWs], top, T.zw, zr, GLASS, false);
      prism(k, top, [top[0] + 0.03, top[1] - 0.03, top[2] + 0.03, top[3] - 0.04], zr, T.H, PAINT);
      // pillars painted on the glass of both sides: A along the windscreen, B in the middle, C (D on estates) at the back – each a strip
      // on the side face of the cabin (x falls linearly from the belt line to the roof, so the strip lies on that face)
      const xAt = (s, z) => s * (hw - 0.03 + 0.012 - (0.14 * (z - T.zw)) / (zr - T.zw)),
        strip = (s, yb0, yb1, yt0, yt1) => {
          const a = [xAt(s, T.zw), yb0, T.zw],
            b = [xAt(s, T.zw), yb1, T.zw],
            c = [xAt(s, zr), yt1, zr],
            d = [xAt(s, zr), yt0, zr];
          if (s > 0) k.quad(a, b, c, d, PAINT);
          else k.quad(b, a, d, c, PAINT);
        },
        yB = (yC0 + yWs) / 2 + 0.1;
      for (const s of [-1, 1]) {
        strip(s, yWs - 0.1, yWs, yWs - T.ws - 0.07, yWs - T.ws);
        strip(s, yB - 0.06, yB + 0.06, yB - 0.06, yB + 0.06);
        const cw = t === 'kombi' || t === 'suv' ? 0.2 : 0.42;
        strip(s, yC0, yC0 + cw, yC0 + T.rs, yC0 + T.rs + cw * 0.7);
      }
    }
    // door seams, handles and the sill on both sides (dark, a hair outside the body): the doors read from the side
    {
      const yB = t === 'van' ? yWs - 1.0 : (yR + T.rr + yWs) / 2 + 0.1,
        seams = t === 'van' ? [yWs - 0.05, yB] : t === 'klein' ? [yWs - 0.05, yB] : [yWs - 0.05, yB, yR + T.rr + 0.25],
        SEAM = L(0.12, 0.12, 0.13);
      for (const s of [-1, 1]) {
        const x = s * (hw + 0.004);
        for (const y of seams) {
          const z0 = T.zb + 0.1,
            z1 = T.zw - 0.02;
          if (s > 0) k.quad([x, y - 0.012, z0], [x, y + 0.012, z0], [x, y + 0.012, z1], [x, y - 0.012, z1], SEAM);
          else k.quad([x, y + 0.012, z0], [x, y - 0.012, z0], [x, y - 0.012, z1], [x, y + 0.012, z1], SEAM);
        }
        for (const y of seams.slice(1)) k.box(s * (hw + 0.012), y + 0.22, T.zw - 0.14, 0.02, 0.16, 0.035, 0, DARK);
        // the sill between the wheels
        const y0 = -T.wb / 2 + T.r + 0.08,
          y1 = T.wb / 2 - T.r - 0.08;
        if (s > 0) k.quad([x, y0, T.zb], [x, y1, T.zb], [x, y1, T.zb + 0.07], [x, y0, T.zb + 0.07], SEAM);
        else k.quad([x, y1, T.zb], [x, y0, T.zb], [x, y0, T.zb + 0.07], [x, y1, T.zb + 0.07], SEAM);
      }
    }
    // lamps and plates
    for (const s of [-1, 1]) {
      k.box(s * (hw - 0.22), yF - 0.02, T.zw - 0.2, 0.3, 0.05, 0.12, 0, HEAD);
      k.box(
        s * (hw - 0.12),
        yR + 0.02,
        T.zw - (t === 'van' ? 0.1 : 0.16),
        0.16,
        0.05,
        t === 'van' ? 0.35 : 0.12,
        0,
        TAIL
      );
      k.box(s * (hw + 0.06), yWs - 0.12, T.zw + 0.08, 0.12, 0.06, 0.1, 0, DARK); // mirrors
    }
    k.box(0, yF + 0.012, T.zb + 0.16, 0.52, 0.02, 0.11, 0, PLATE);
    k.box(0, yR - 0.012, T.zb + 0.3, 0.52, 0.02, 0.11, 0, PLATE);
    // wheels: axles at ± wheelbase/2 about the middle
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) wheel(k, sx * (hw + 0.002), (sy * T.wb) / 2, T.r, 0.2);
    return k.geo();
  }
  // ---- the other things (all of them static; colours fixed, no paint) ----
  const THINGS = {
    // a single-axle car trailer: flat bed with low sides, drawbar to the front (y), grey steel and wood floor
    anhaenger(k, { l, w }) {
      const hw = w / 2,
        ST = L(0.5, 0.52, 0.54),
        WD = L(0.42, 0.33, 0.24);
      const bl = l - 1.1; // bed length, the rest is the drawbar
      const yb0 = -l / 2,
        yb1 = yb0 + bl;
      k.box(0, (yb0 + yb1) / 2, 0.52, w, bl, 0.06, 0, WD, true);
      for (const s of [-1, 1]) k.box(s * (hw - 0.02), (yb0 + yb1) / 2, 0.58, 0.04, bl, 0.32, 0, ST);
      k.box(0, yb0 + 0.02, 0.58, w, 0.04, 0.32, 0, ST);
      k.box(0, yb1 - 0.02, 0.58, w, 0.04, 0.32, 0, ST);
      for (const s of [-1, 1]) {
        const x0 = s * 0.42;
        k.box(x0 * 0.5, yb1 + 0.5, 0.48, 0.06, 1.15, 0.06, s * 0.33, ST);
      }
      k.box(0, l / 2 - 0.06, 0.46, 0.1, 0.12, 0.06, 0, DARK);
      const yA = (yb0 + yb1) / 2;
      for (const s of [-1, 1]) wheel(k, s * (hw - 0.05), yA, 0.28, 0.16);
      k.box(0, yA, 0.28, w - 0.4, 0.08, 0.08, 0, DARK);
    },
    // a caravan: white box with rounded front, windows, a door, A-frame drawbar, one axle
    wohnwagen(k, { l, w }) {
      const hw = w / 2,
        WH = L(0.92, 0.92, 0.9),
        h = 2.55,
        bl = l - 1.0,
        y0 = -l / 2,
        y1 = y0 + bl;
      prism(k, [-hw, hw, y0, y1], [-hw + 0.04, hw - 0.04, y0 + 0.08, y1 - 0.25], 0.4, h, WH, true, true);
      k.box(0, (y0 + y1) / 2, 0.36, w - 0.1, bl - 0.1, 0.06, 0, DARK);
      for (const s of [-1, 1]) {
        const x = s * (hw + 0.005);
        for (const yc of [y0 + 1.2, y1 - 1.6])
          if (s > 0)
            k.quad([x, yc - 0.55, 1.35], [x, yc + 0.55, 1.35], [x, yc + 0.55, 1.95], [x, yc - 0.55, 1.95], GLASS);
          else k.quad([x, yc + 0.55, 1.35], [x, yc - 0.55, 1.35], [x, yc - 0.55, 1.95], [x, yc + 0.55, 1.95], GLASS);
      }
      k.quad([-0.65, y1 - 0.3, 1.9], [0.65, y1 - 0.3, 1.9], [0.7, y1 - 0.2, 1.4], [-0.7, y1 - 0.2, 1.4], GLASS);
      k.box(0, y1 + 0.5, 0.42, 0.12, 1.0, 0.1, 0, DARK);
      wheel(k, hw + 0.002, (y0 + y1) / 2 - 0.2, 0.3, 0.18);
      wheel(k, -hw - 0.002, (y0 + y1) / 2 - 0.2, 0.3, 0.18);
    },
    // a tractor: bonnet, cab with glass, small front wheels and big rear wheels (green or red by the seed)
    traktor(k, { l, w, h, c }) {
      const hw = Math.min(w, 2.3) / 2,
        BODY = c || L(0.16, 0.36, 0.17),
        yF = l / 2,
        yR = -l / 2;
      k.box(0, yF - 0.95, 0.75, 0.75, 1.7, 0.8, 0, BODY);
      k.box(0, yR + 1.15, 0.85, 1.2, 1.6, 0.6, 0, BODY);
      prism(
        k,
        [-0.65, 0.65, yR + 0.45, yR + 1.75],
        [-0.6, 0.6, yR + 0.5, yR + 1.6],
        1.45,
        Math.max(2.5, h || 2.7) - 0.1,
        GLASS
      );
      k.box(0, yR + 1.08, Math.max(2.5, h || 2.7) - 0.1, 1.35, 1.45, 0.1, 0, BODY);
      for (const s of [-1, 1]) {
        wheel(k, s * hw, yR + 0.95, 0.78, 0.5, 16);
        wheel(k, s * (hw - 0.15), yF - 0.75, 0.48, 0.35, 14);
      }
    },
    // a round bale (wrapped white or green, or straw) lying on its round side along y
    rundballen(k, { c }) {
      const r = 0.75,
        len = 1.2,
        col = c || L(0.9, 0.9, 0.88),
        n = 14;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2,
          a1 = ((i + 1) / n) * Math.PI * 2,
          p = (a, x) => [x, Math.cos(a) * r, r + Math.sin(a) * r];
        k.quad(p(a0, -len / 2), p(a1, -len / 2), p(a1, len / 2), p(a0, len / 2), col);
      }
      k.disc(len / 2, 0, r, 1, 0, r, col, n, false);
      k.disc(-len / 2, 0, r, -1, 0, r, col, n, false);
    },
    // square bales stacked (straw)
    quaderballen(k, { l, w, h }) {
      const ST = L(0.78, 0.68, 0.45),
        ST2 = L(0.72, 0.62, 0.4),
        hh = h || 1.8,
        nz = Math.max(1, Math.round(hh / 0.9));
      for (let z = 0; z < nz; z++) k.box(0, 0, z * 0.9, w - 0.02, l - 0.02, 0.88, 0, z % 2 ? ST2 : ST, z === 0);
    },
    // a stack of sawn timber or split wood: layers of boards (light) with dark gaps between (the stickers), a tarp over the top that hangs
    // down a little at the sides
    holzstapel(k, { l, w, h }) {
      const hh = h || 1.4,
        WD = L(0.66, 0.52, 0.35),
        WD2 = L(0.58, 0.45, 0.3),
        GAP = L(0.27, 0.2, 0.14),
        TARP = L(0.72, 0.74, 0.76),
        x0 = -w / 2,
        x1 = w / 2,
        y0 = -l / 2,
        y1 = l / 2,
        n = Math.max(3, Math.round(hh / 0.16));
      for (let i = 0; i < n; i++) {
        const za = (i * hh) / n,
          zb = ((i + 1) * hh) / n,
          zg = zb - 0.035,
          col = i % 2 ? WD : WD2;
        // the four sides of this layer: wood, then the dark gap above it
        for (const [z0, z1, c] of [
          [za, zg, col],
          [zg, zb, GAP],
        ]) {
          k.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], c);
          k.quad([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], c);
          k.quad([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], c);
          k.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], c);
        }
      }
      // the tarp: the top and flaps 0.35 m down each side, a hand's breadth out
      const e = 0.04,
        zt = hh + 0.02,
        zf = hh - 0.35;
      k.quad([x0 - e, y0 - e, zt], [x1 + e, y0 - e, zt], [x1 + e, y1 + e, zt], [x0 - e, y1 + e, zt], TARP);
      k.quad([x1 + e, y0 - e, zf], [x1 + e, y1 + e, zf], [x1 + e, y1 + e, zt], [x1 + e, y0 - e, zt], TARP);
      k.quad([x1 + e, y1 + e, zf], [x0 - e, y1 + e, zf], [x0 - e, y1 + e, zt], [x1 + e, y1 + e, zt], TARP);
      k.quad([x0 - e, y1 + e, zf], [x0 - e, y0 - e, zf], [x0 - e, y0 - e, zt], [x0 - e, y1 + e, zt], TARP);
      k.quad([x0 - e, y0 - e, zf], [x1 + e, y0 - e, zf], [x1 + e, y0 - e, zt], [x0 - e, y0 - e, zt], TARP);
    },
    // a pile of logs (round wood) along y
    stammholz(k, { l, w, h }) {
      const BK = L(0.36, 0.3, 0.24),
        END = L(0.66, 0.55, 0.4),
        r = 0.2,
        nx = Math.max(1, Math.floor(w / (2 * r))),
        rows = Math.max(1, Math.min(4, Math.round((h || 1.0) / (2 * r * 0.87))));
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < nx - j; i++) {
          const x = -w / 2 + r + i * 2 * r + j * r,
            z = r + j * 2 * r * 0.87,
            n = 8;
          for (let q = 0; q < n; q++) {
            const a0 = (q / n) * Math.PI * 2,
              a1 = ((q + 1) / n) * Math.PI * 2,
              p = (a, y) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
            k.quad(p(a1, -l / 2), p(a0, -l / 2), p(a0, l / 2), p(a1, l / 2), BK);
          }
          k.disc(x, l / 2, z, 0, 1, r, END, 8, false);
          k.disc(x, -l / 2, z, 0, -1, r, END, 8, false);
        }
    },
    // an above-ground pool: round (w = diameter) – wall and water
    pool_rund(k, { w }) {
      const r = w / 2,
        WALL = L(0.55, 0.68, 0.78),
        WATER = L(0.22, 0.5, 0.62),
        h = 1.1;
      k.cyl(0, 0, 0, h, r, r, 24, WALL, false);
      k.lathe(
        0,
        0,
        h - 0.12,
        [
          [r - 0.04, 0],
          [0, 0],
        ],
        24,
        WATER
      );
      k.lathe(
        0,
        0,
        h,
        [
          [r + 0.04, 0],
          [r - 0.04, 0],
        ],
        24,
        L(0.85, 0.85, 0.85)
      );
    },
    // a sunken or framed pool: the water a little below the coping, a frame of stone round it
    pool_eckig(k, { l, w }) {
      const ED = L(0.82, 0.8, 0.76),
        WATER = L(0.2, 0.48, 0.6);
      k.box(0, 0, 0, w + 0.5, l + 0.5, 0.12, 0, ED);
      k.quad([-w / 2, -l / 2, 0.125], [w / 2, -l / 2, 0.125], [w / 2, l / 2, 0.125], [-w / 2, l / 2, 0.125], WATER);
    },
    // a garden trampoline: black mat on a ring at 0.9 m, padded edge, legs
    trampolin(k, { w }) {
      const r = w / 2,
        PAD = L(0.15, 0.32, 0.55),
        MAT = L(0.04, 0.04, 0.045),
        ST = L(0.55, 0.56, 0.58);
      k.lathe(
        0,
        0,
        0.88,
        [
          [r - 0.3, 0],
          [0, 0],
        ],
        20,
        MAT
      );
      k.lathe(
        0,
        0,
        0.88,
        [
          [r, 0],
          [r - 0.3, 0.02],
        ],
        20,
        PAD
      );
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        k.box(Math.cos(a) * (r - 0.1), Math.sin(a) * (r - 0.1), 0, 0.05, 0.05, 0.88, 0, ST);
      }
    },
    // a motorhome (Teilintegrierter on a van chassis): the van's cab in front, the white living box over it, windows, two axles
    wohnmobil(k, { l, w }) {
      const L0 = Math.max(6, Math.min(8, l)),
        hw = Math.min(w, 2.35) / 2,
        WH = L(0.93, 0.93, 0.91),
        yF = L0 / 2,
        yR = -L0 / 2,
        yC = yF - 1.5;
      prism(
        k,
        [-hw + 0.1, hw - 0.1, yC, yF - 0.05],
        [-hw + 0.14, hw - 0.14, yC, yF - 0.45],
        0.45,
        1.25,
        WH,
        true,
        true
      );
      k.quad(
        [-hw + 0.25, yF - 0.673, 1.95],
        [hw - 0.25, yF - 0.673, 1.95],
        [hw - 0.18, yF - 0.498, 1.3],
        [-hw + 0.18, yF - 0.498, 1.3],
        GLASS
      );
      prism(k, [-hw, hw, yR, yC + 0.2], [-hw + 0.03, hw - 0.03, yR + 0.05, yC + 0.05], 0.45, 2.95, WH, true, true);
      prism(k, [-hw + 0.1, hw - 0.1, yC, yF - 0.5], [-hw + 0.12, hw - 0.12, yC, yF - 0.7], 1.25, 2.0, WH, false);
      for (const s of [-1, 1]) {
        const x = s * (hw + 0.005);
        for (const yc of [yR + 1.2, yC - 1.4])
          if (s > 0) k.quad([x, yc - 0.45, 1.5], [x, yc + 0.45, 1.5], [x, yc + 0.45, 2.1], [x, yc - 0.45, 2.1], GLASS);
          else k.quad([x, yc + 0.45, 1.5], [x, yc - 0.45, 1.5], [x, yc - 0.45, 2.1], [x, yc + 0.45, 2.1], GLASS);
        wheel(k, s * (hw - 0.02), yF - 0.95, 0.36, 0.22);
        wheel(k, s * (hw - 0.02), yR + 1.6, 0.36, 0.22);
      }
      k.box(0, 0, 0.3, 2 * hw - 0.2, L0 - 0.4, 0.15, 0, DARK);
    },
    // a box lorry: cab in front (y), the box behind, two axles
    lkw(k, { l, w, h, c }) {
      const hw = Math.min(w, 2.55) / 2,
        hh = Math.max(3.0, h || 3.6),
        CAB = c || L(0.85, 0.86, 0.86),
        BOX = L(0.9, 0.9, 0.88),
        yF = l / 2,
        yR = -l / 2,
        yC = yF - 2.2;
      k.box(0, (yF + yC) / 2, 0.55, 2 * hw, yF - yC - 0.05, 2.45, 0, CAB);
      k.quad(
        [-hw + 0.1, yF + 0.005, 1.75],
        [hw - 0.1, yF + 0.005, 1.75],
        [hw - 0.1, yF + 0.005, 2.65],
        [-hw + 0.1, yF + 0.005, 2.65],
        GLASS
      );
      k.box(
        0,
        (yC - (l > 11 ? 0.6 : 0) + yR) / 2 - 0.05,
        1.0,
        2 * hw,
        yC - (l > 11 ? 0.6 : 0) - yR - 0.2,
        hh - 1.0,
        0,
        BOX,
        true
      );
      k.box(0, 0, 0.5, 1.0, l - 0.6, 0.35, 0, DARK);
      // a semi-trailer (over 11 m): three axles under the back of the box, the tractor's two; a rigid lorry: two
      const semi = l > 11,
        ax = semi ? [yF - 1.4, yF - 4.4, yR + 1.4, yR + 2.75, yR + 4.1] : [yF - 1.4, yR + 2.0];
      for (const s of [-1, 1]) for (const y of ax) wheel(k, s * (hw - 0.05), y, 0.5, 0.3, 14);
      if (semi) k.box(0, yC - 0.35, 1.25, 2 * hw - 0.3, 0.5, 0.2, 0, DARK); // the coupling, the gap between cab and box
    },
    // a round concrete tank of a farm (slurry, digestate): the wall, a flat concrete cover, a rim; w = diameter
    tank(k, { w, h }) {
      const r = w / 2,
        hh = h || 3,
        WALL = L(0.62, 0.62, 0.6),
        TOP = L(0.56, 0.57, 0.56),
        n = Math.max(24, Math.min(48, Math.round(w * 1.6)));
      k.cyl(0, 0, 0, hh, r, r, n, WALL, false);
      k.lathe(
        0,
        0,
        hh,
        [
          [r + 0.12, 0],
          [r + 0.12, 0.2],
          [r - 0.1, 0.2],
        ],
        n,
        WALL
      );
      k.lathe(
        0,
        0,
        hh + 0.12,
        [
          [r - 0.1, 0],
          [0, 0.25],
        ],
        n,
        TOP
      );
    },
    // a shipping or building container (20 ft), corrugated sides as stripes of two shades
    container(k, { l, w, h, c }) {
      const col = c || L(0.28, 0.4, 0.52),
        hh = h || 2.59;
      k.box(0, 0, 0, w, l, hh, 0, col, false);
      const dk = col.map(v => v * 0.75);
      for (let y = -l / 2 + 0.3; y < l / 2 - 0.2; y += 0.6)
        for (const s of [-1, 1]) {
          const x = s * (w / 2 + 0.006);
          if (s > 0) k.quad([x, y, 0.1], [x, y + 0.25, 0.1], [x, y + 0.25, hh - 0.1], [x, y, hh - 0.1], dk);
          else k.quad([x, y + 0.25, 0.1], [x, y, 0.1], [x, y, hh - 0.1], [x, y + 0.25, hh - 0.1], dk);
        }
    },
  };
  S.THINGS = THINGS;
  // ---- one geometry per car type (made on first use), the triangle count kept for tests ----
  S.car = t => {
    if (!S.geo[t]) {
      S.geo[t] = carGeo(CARS[t] ? t : 'kompakt');
      S.tris[t] = S.geo[t].attributes.position.count / 3;
    }
    return S.geo[t];
  };
  // a thing as a geometry in the scene's frame: built in its own frame, turned (az: compass bearing of its y axis) and set on the ground
  // at (x, y, z) – the merged mesh of an area takes many of them (BufferGeometryUtils.mergeGeometries)
  const _m = new THREE.Matrix4();
  S.thingGeo = (d, z) => {
    // an oval pool: the round one stretched along its length (y of the thing = −z of the scene)
    const oval = d.t === 'pool_oval',
      f = THINGS[oval ? 'pool_rund' : d.t];
    if (!f) return null;
    const k = VPROPS.kit();
    f(k, d);
    if (k.empty()) return null;
    const g = k.geo();
    if (oval) g.scale(1, 1, d.l / Math.max(0.5, d.w));
    _m.makeRotationY((-(d.az || 0) * Math.PI) / 180).setPosition(d.x, z, -d.y);
    g.applyMatrix4(_m);
    return g;
  };
  // ---- warm meshes: the two programs compiled with the scene at the start (prepareGPU), then never drawn ----
  {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0, 0.01, -500, 0, 0, -500, 0.01], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    tri.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    const im = new THREE.InstancedMesh(tri, mat, 1);
    im.setColorAt(0, new THREE.Color(1, 1, 1));
    const me = new THREE.Mesh(tri, mat);
    for (const o of [im, me]) {
      o.visible = false;
      o.frustumCulled = false;
      o.castShadow = false;
      o.receiveShadow = false;
      o.userData.noMerge = true;
      o.name = 'welt-dinge warm';
      scene.add(o);
    }
    S.warm = [im, me];
  }
  return S;
})();
window.DMOD = DMOD;
