// ===================== feat/grenzland: the mode's own places in the world (GLORTE) =====================
// Invented places, built when the mode begins and gone when it ends (nothing of them exists before):
//   the clique's place beside the field track south of Ratscher – an open-fronted field barn of weathered boards on posts under a tin
//     roof (the den inside: straw bales, a workbench, an old moped on blocks, a sofa; a hiding place for the wanted level), beside it a
//     roofed open-air skittle alley as Thuringian villages have them (a lane of planks 19.5 m long under a lean-to roof, gutters, the
//     ball's way back in a wooden trough, the pin stand in a little house at the far end), a grill made of an oil drum with beer benches
//     and a crate, a string of bulbs over the yard (they glow at night; one borrowed light, no new one), a noticeboard. In the
//     flashback to 1989 the barn stands newer and emptier – straw, churns, a ladder; no alley, no sofa.
//   the shop on wheels at the Anger – a sales van with its flap open as a roof, the counter, crates, a price board; shut outside its hours
//   the angling spot at the dam of the Talsperre – stone steps down the bank, a little jetty, a sign (today only)
// Everything is merged meshes of vertex colours in the village props' materials (world/village_props.js – no new shader program), the
// signs are written with a 5 × 7 dot font of small quads (no texture). Walls and furniture stop the walker and vehicles (VEH.extra) and
// the mode's figures (a KERN pushOut provider); the alley's approach and the jetty are ground to stand on (a KERN ground provider).
// The interface the missions use stays:
//   GLORTE.P → { scheune, kegel, grill, wagen, angel: [x, y] } (free spots to stand on) · build() · drop() · inScheune(x, y) · tick(dt)
// For the side games (gl_wagen.js, gl_kegeln.js, gl_angeln.js, gl_neben.js): GLORTE.hook({ build, drop, tick, era }), GLORTE.KB (the
// alley's frame), GLORTE.WG (the van), GLORTE.AN (the jetty), GLORTE.kit/frame/beam/rolle/schrift (the builders), GLORTE.mat().
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
export const GLORTE = (() => {
  const O = GLDATA.ORTE;
  const S = {
    built: false,
    once: false,
    era: 'heute',
    offen: false,
    dark: false,
    meshes: {},
    cols: [], // { B: box of VEH.extra, era: 'heute' | '1989' | '', nur: 'offen' | '' , x: the entry in VEH.extra }
    hide: [],
    hooks: [],
    acc: 0,
    lamp: null,
    karte: false,
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  // a fixed random per build (the same barn every time)
  const rnd = seed => {
    let s = seed >>> 0 || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const gnd = (x, y) => {
    const z = KERN.ground(x, y);
    return Number.isFinite(z) ? z : 0;
  };
  // ------------------------------------------------------------------ builders ------------------------------------------------------------------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    nrm = a => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  // a quad whose front looks away from the point cen
  function quadOut(K, a, b, c, d, col, cen) {
    const n = crs(sub(b, a), sub(c, a)),
      m = [(a[0] + c[0]) / 2 - cen[0], (a[1] + c[1]) / 2 - cen[1], (a[2] + c[2]) / 2 - cen[2]];
    if (dot(n, m) < 0) K.quad(a, d, c, b, col);
    else K.quad(a, b, c, d, col);
  }
  // a beam from a to b (site points), w wide (level), h high
  function beam(K, a, b, w, h, col) {
    const d = nrm(sub(b, a)),
      up0 = Math.abs(d[2]) > 0.92 ? [1, 0, 0] : [0, 0, 1],
      s = nrm(crs(d, up0)),
      u = crs(s, d),
      cen = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      c = (p, i, j) => add(add(p, s, (i * w) / 2), u, (j * h) / 2),
      A = [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1)],
      B = [c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)];
    for (let i = 0; i < 4; i++) quadOut(K, A[i], A[(i + 1) % 4], B[(i + 1) % 4], B[i], col, cen);
    quadOut(K, A[0], A[1], A[2], A[3], col, cen);
    quadOut(K, B[0], B[1], B[2], B[3], col, cen);
  }
  // a round bar or drum from a to b: radius R, seg sides, from angle a0 to a1 (a half drum), caps at the ends, inside: also seen from within
  function rolle(K, a, b, R, col, seg = 10, o = {}) {
    const d = nrm(sub(b, a)),
      up0 = Math.abs(d[2]) > 0.92 ? [1, 0, 0] : [0, 0, 1],
      s = nrm(crs(d, up0)),
      u = crs(s, d),
      a0 = o.a0 ?? 0,
      a1 = o.a1 ?? Math.PI * 2,
      pt = (p, t, r = R) => add(add(p, s, Math.cos(t) * r), u, Math.sin(t) * r);
    for (let i = 0; i < seg; i++) {
      const t0 = a0 + ((a1 - a0) * i) / seg,
        t1 = a0 + ((a1 - a0) * (i + 1)) / seg,
        q = [pt(a, t0), pt(a, t1), pt(b, t1), pt(b, t0)],
        mid = add(a, sub(b, a), 0.5);
      quadOut(K, q[0], q[1], q[2], q[3], col, mid);
      if (o.inside) quadOut(K, q[0], q[1], q[2], q[3], o.inside, add(mid, add(pt(a, (t0 + t1) / 2), a, -1), 3));
      if (o.caps !== false) {
        const cc = o.capCol || col;
        K.tri(a, pt(a, t0), pt(a, t1), cc);
        K.tri(b, pt(b, t1), pt(b, t0), cc);
        if (o.inside) {
          K.tri(a, pt(a, t1), pt(a, t0), o.inside);
          K.tri(b, pt(b, t0), pt(b, t1), o.inside);
        }
      }
    }
  }
  // a frame in the world: origin (ox, oy) at height z0, facing the compass heading hd – local r to the right, f ahead, z up
  function frame(K, ox, oy, hd, z0) {
    const c = Math.cos(hd),
      s = Math.sin(hd),
      xy = (r, f) => [ox + r * c + f * s, oy - r * s + f * c],
      P = (r, f, z = 0) => [ox + r * c + f * s, oy - r * s + f * c, z0 + z];
    const F = {
      K,
      ox,
      oy,
      hd,
      z0,
      xy,
      P,
      // the ground under a local point, relative to z0
      g: (r, f) => gnd(...xy(r, f)) - z0,
      // a box: centre (r, f), from z up by sz, sr wide and sf deep; turn: clockwise about its middle
      box: (r, f, z, sr, sf, sz, col, bottom, turn = 0) =>
        K.box(ox + r * c + f * s, oy - r * s + f * c, z0 + z, sr, sf, sz, -hd - turn, col, bottom),
      beam: (a, b, w, h, col) => beam(K, P(...a), P(...b), w, h, col),
      rolle: (a, b, R, col, seg, o) => rolle(K, P(...a), P(...b), R, col, seg, o),
      cyl: (r, f, za, zb, r0, r1, seg, col, top) =>
        K.cyl(ox + r * c + f * s, oy - r * s + f * c, z0 + za, z0 + zb, r0, r1, seg, col, top),
      lathe: (r, f, z, prof, seg, col) => K.lathe(ox + r * c + f * s, oy - r * s + f * c, z0 + z, prof, seg, col),
      ball: (r, f, z, R, col, seg) => K.ball(ox + r * c + f * s, oy - r * s + f * c, z0 + z, R, col, seg),
      quad: (a, b, c2, d, col) => K.quad(P(...a), P(...b), P(...c2), P(...d), col),
      // a slab between four corners [r, f, z] (counter-clockwise seen from above), th thick
      slab(a, b, c2, d, th, col, colU) {
        const T = [a, b, c2, d].map(p => P(...p)),
          U = T.map(p => [p[0], p[1], p[2] - th]);
        K.quad(T[0], T[1], T[2], T[3], col);
        K.quad(U[3], U[2], U[1], U[0], colU || col);
        for (let i = 0; i < 4; i++) K.quad(T[(i + 1) % 4], T[i], U[i], U[(i + 1) % 4], colU || col);
      },
      // the collision box of a local rectangle (VEH.extra's format)
      col: (r0, r1, f0, f1, za, zb) => ({
        c: xy((r0 + r1) / 2, (f0 + f1) / 2),
        ax: [c, -s],
        ay: [s, c],
        ex: Math.abs(r1 - r0) / 2,
        ey: Math.abs(f1 - f0) / 2,
        z0: z0 + za,
        z1: z0 + zb,
      }),
      // local coordinates of a site point
      loc: (x, y) => [(x - ox) * c - (y - oy) * s, (x - ox) * s + (y - oy) * c],
    };
    return F;
  }
  // ---- writing: capitals in a 5 × 7 dot font, every run of dots a small quad ----
  const FONT = {
    A: '01110100011000111111100011000110001',
    B: '11110100011000111110100011000111110',
    C: '01110100011000010000100001000101110',
    D: '11110100011000110001100011000111110',
    E: '11111100001000011110100001000011111',
    F: '11111100001000011110100001000010000',
    G: '01110100011000010111100011000101111',
    H: '10001100011000111111100011000110001',
    I: '01110001000010000100001000010001110',
    J: '00111000100001000010000101001001100',
    K: '10001100101010011000101001001010001',
    L: '10000100001000010000100001000011111',
    M: '10001110111010110101100011000110001',
    N: '10001110011010110011100011000110001',
    O: '01110100011000110001100011000101110',
    P: '11110100011000111110100001000010000',
    Q: '01110100011000110001101011001001101',
    R: '11110100011000111110101001001010001',
    S: '01111100001000001110000010000111110',
    T: '11111001000010000100001000010000100',
    U: '10001100011000110001100011000101110',
    V: '10001100011000110001100010101000100',
    W: '10001100011000110101101011010101010',
    X: '10001100010101000100010101000110001',
    Y: '10001100010101000100001000010000100',
    Z: '11111000010001000100010001000011111',
    Ä: '01010000000111010001111111000110001',
    Ö: '01010000000111010001100011000101110',
    Ü: '01010000001000110001100011000101110',
    0: '01110100011001110101110011000101110',
    1: '00100011000010000100001000010001110',
    2: '01110100010000100010001000100011111',
    3: '11111000100010000010000011000101110',
    4: '00010001100101010010111110001000010',
    5: '11111100001111000001000011000101110',
    6: '00110010001000011110100011000101110',
    7: '11111000010001000100010000100001000',
    8: '01110100011000101110100011000101110',
    9: '01110100011000101111000010001001100',
    '!': '00100001000010000100001000000000100',
    ',': '00000000000000000000001100010001000',
    '.': '00000000000000000000000000110001100',
    '-': '00000000000000011111000000000000000',
    ':': '00000011000110000000011000110000000',
    '€': '00110010011110001000111000100100110',
    '+': '00000001000010011111001000010000000',
  };
  // o: the top left corner (site point, already a little in front of its board), rv/uv: unit vectors to the right and up, px: dot size
  function schrift(K, text, o, rv, uv, px, col) {
    let x = 0;
    for (const ch of String(text).toUpperCase()) {
      const g = FONT[ch];
      if (g)
        for (let row = 0; row < 7; row++)
          for (let c0 = 0; c0 < 5; c0++) {
            if (g[row * 5 + c0] !== '1') continue;
            let c1 = c0;
            while (c1 < 4 && g[row * 5 + c1 + 1] === '1') c1++;
            const p = (cx, ry) => add(add(o, rv, (x + cx) * px), uv, -ry * px);
            K.quad(p(c0, row + 1), p(c1 + 1, row + 1), p(c1 + 1, row), p(c0, row), col);
            c0 = c1;
          }
      x += 6;
    }
    return x * px;
  }
  const breite = (text, px) => (String(text).length * 6 - 1) * px;
  // text on a board that stands upright: mid (site point of the text's middle), facing the compass heading az
  function tafelText(K, text, mid, az, px, col) {
    const rv = [-Math.cos(az), Math.sin(az), 0], // to the right as one reads it, facing the board
      n = [Math.sin(az), Math.cos(az), 0],
      w = breite(text, px);
    schrift(K, text, add(add(add(mid, rv, -w / 2), [0, 0, 1], 3.5 * px), n, 0.006), rv, [0, 0, 1], px, col);
  }
  const mats = () => {
    const M = VPROPS.mat || {};
    return { paint: M.paint || VFIG.mat(), metal: M.metal || M.paint || VFIG.mat() };
  };
  function mesh(K, mat, name, shadow = true) {
    if (K.empty()) return null;
    const m = new THREE.Mesh(K.geo(), mat);
    m.name = name;
    m.userData.noMerge = true;
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    scene.add(m);
    return m;
  }
  // ------------------------------------------------------------------ colours ------------------------------------------------------------------
  const C = {
    alt: L(116, 104, 92),
    silber: L(142, 137, 128),
    dunkel: L(86, 74, 62),
    neu: L(170, 132, 86),
    neu2: L(150, 114, 72),
    balken: L(92, 76, 58),
    balkenNeu: L(142, 108, 70),
    blech: L(132, 136, 138),
    blech2: L(112, 116, 118),
    rost: L(122, 76, 50),
    stroh: L(206, 174, 98),
    strohD: L(172, 138, 70),
    bohle: L(182, 146, 96),
    bohle2: L(166, 130, 84),
    deck: L(128, 110, 90),
    deck2: L(112, 96, 78),
    rinne: L(70, 58, 46),
    gruen: L(40, 84, 56),
    weiss: L(232, 230, 222),
    kreide: L(226, 226, 216),
    schwarz: L(26, 27, 29),
    gummi: L(34, 34, 36),
    stahl: L(96, 100, 104),
    rot: L(168, 44, 36),
    gelb: L(222, 178, 48),
    blau: L(52, 92, 150),
    oliv: L(96, 98, 62),
    leder: L(84, 56, 38),
    stein: L(128, 124, 116),
    stein2: L(108, 106, 100),
    wurst: L(150, 82, 44),
    flasche: L(74, 46, 22),
    kiste: L(156, 42, 34),
    papier: L(236, 232, 214),
  };
  // ------------------------------------------------------------------ where things are ------------------------------------------------------------------
  // the clique's place: u along the field track (to the north-north-east, towards the village), v across it towards the track
  const T = O.treff.pos,
    HD = ((O.treff.az + 180) * Math.PI) / 180,
    UV = (u, v) => [T[0] + u * Math.sin(HD) + v * Math.cos(HD), T[1] + u * Math.cos(HD) - v * Math.sin(HD)];
  // the barn: 10 m along the track, 5.4 m deep, its open front towards the track (the frame's f; r runs to the south-south-west). Its
  // middle lies 0.8 m from the place's point towards the track (the field behind it stays free), the point itself is under its roof.
  const BARN = { hw: 5, hd: 2.7, eaveF: 3.3, eaveB: 2.5, v0: 0.8 },
    BO = UV(0, BARN.v0),
    BX = (r, f) => UV(-r, f + BARN.v0); // a point of the barn's frame
  // the alley: the foul line's middle, the ball rolls to the north-north-east
  const KB = {
    o: UV(6.5, 8.0),
    hd: HD,
    z: 0,
    L: GLNLOGIK.BAHN.L,
    anlauf: 4.2,
    hw: 1.7,
    stand: UV(4.9, 8.0), // where one stands to throw
    tafel: null,
  };
  // the van: parallel to the lane south of the Anger's green, the flap on its right side towards the lane
  const WG = {
    o: [O.wagen.pos[0], O.wagen.pos[1] + 1.45],
    hd: (98 * Math.PI) / 180,
    z: 0,
    boden: 0.62,
    kunde: O.wagen.pos,
    frau: null,
  };
  // the angling spot: from the board on the dam towards the water
  const AN = { hd: (146.6 * Math.PI) / 180, o: O.damm.pos, z: 15.2, w: 14.78, sA: 22, sB: 29, hw: 0.75, pose: null };
  const KBC = Math.cos(KB.hd),
    KBS = Math.sin(KB.hd),
    ANC = Math.cos(AN.hd),
    ANS = Math.sin(AN.hd);
  const P = {
    scheune: BO,
    kegel: KB.stand.slice(),
    grill: BX(2.4, 7.6),
    wagen: O.wagen.pos,
    angel: [O.damm.pos[0] + Math.sin(AN.hd) * 27, O.damm.pos[1] + Math.cos(AN.hd) * 27],
    treff: BX(0, 5.2), // the yard in front of the barn
    tafel: BX(-1, 12.7), // in front of the noticeboard
  };
  // ------------------------------------------------------------------ the barn ------------------------------------------------------------------
  function bretter(F, R, o) {
    // a wall of upright boards from (r0, f0) to (r1, f1) – along r or along f –, from zb up to zt(t) (t: 0 … 1 along the wall)
    const { a, b, zb, zt, cols, th = 0.026, w = 0.17, gaps = 0, raw = 0.05 } = o,
      len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.max(1, Math.round(len / w)),
      along = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    for (let i = 0; i < n; i++) {
      if (gaps && R() < gaps) continue;
      const t = (i + 0.5) / n,
        r = a[0] + (b[0] - a[0]) * t,
        f = a[1] + (b[1] - a[1]) * t,
        z1 = zt(t) - R() * 0.02,
        z0 = zb + R() * raw,
        col = shade(cols[Math.floor(R() * cols.length)], 0.88 + R() * 0.24),
        bw = len / n - 0.012;
      F.box(r, f, z0, along ? bw : th, along ? th : bw, z1 - z0, col, false);
    }
  }
  function strohballen(F, R, r, f, z, turn = 0, col = C.stroh) {
    const c = shade(col, 0.9 + R() * 0.2);
    F.box(r, f, z, 0.88, 0.44, 0.36, c, false, turn);
    for (const q of [-0.22, 0.22]) {
      const rr = r + q * Math.cos(turn),
        ff = f - q * Math.sin(turn);
      F.box(rr, ff, z - 0.002, 0.02, 0.452, 0.366, C.strohD, false, turn);
    }
  }
  function scheune(K, KM, alt) {
    const z0 = gnd(BO[0], BO[1]),
      F = frame(K, BO[0], BO[1], HD + Math.PI / 2, z0),
      FM = frame(KM, BO[0], BO[1], HD + Math.PI / 2, z0),
      R = rnd(alt ? 7 : 19),
      { hw, hd, eaveF, eaveB } = BARN,
      wood = alt ? [C.alt, C.alt, C.silber, C.dunkel] : [C.neu, C.neu, C.neu2],
      bk = alt ? C.balken : C.balkenNeu,
      zAt = f => eaveB + ((f + hd) / (2 * hd)) * (eaveF - eaveB), // the roof's underside over f
      lo = -0.45;
    // posts: four along the open front, four along the back
    for (const r of [-hw, -hw / 3, hw / 3, hw]) {
      F.box(r, hd - 0.08, lo, 0.16, 0.16, zAt(hd) - lo, bk, false);
      F.box(r, -hd + 0.08, lo, 0.16, 0.16, zAt(-hd) - lo, bk, false);
      // head braces at the front
      for (const sgn of [-1, 1]) {
        if (Math.abs(r + sgn * 0.7) > hw) continue;
        F.beam([r, hd - 0.08, zAt(hd) - 0.85], [r + sgn * 0.75, hd - 0.08, zAt(hd) - 0.1], 0.09, 0.09, bk);
      }
    }
    // plates along the front and the back, rails for the boards, rafters
    F.box(0, hd - 0.08, zAt(hd) - 0.18, 2 * hw + 0.3, 0.14, 0.18, bk, true);
    F.box(0, -hd + 0.08, zAt(-hd) - 0.16, 2 * hw + 0.3, 0.14, 0.16, bk, true);
    for (const z of [0.5, 1.5]) {
      F.box(0, -hd + 0.07, z, 2 * hw, 0.07, 0.11, bk, true);
      for (const sgn of [-1, 1]) F.box(sgn * (hw - 0.07), 0, z, 0.07, 2 * hd, 0.11, bk, true);
    }
    for (let i = 0; i <= 8; i++) {
      const r = -hw + (2 * hw * i) / 8;
      F.beam([r, -hd - 0.3, zAt(-hd - 0.3) - 0.06], [r, hd + 0.55, zAt(hd + 0.55) - 0.06], 0.07, 0.13, bk);
    }
    // the walls: the back and the two ends, boards upright (some gone today)
    bretter(F, R, {
      a: [-hw, -hd],
      b: [hw, -hd],
      zb: lo + 0.3,
      zt: () => zAt(-hd) - 0.02,
      cols: wood,
      gaps: alt ? 0.035 : 0,
    });
    for (const sgn of [-1, 1])
      bretter(F, R, {
        a: [sgn * hw, -hd],
        b: [sgn * hw, hd],
        zb: lo + 0.3,
        zt: t => zAt(-hd + t * 2 * hd) - 0.02,
        cols: wood,
        gaps: alt ? 0.03 : 0,
      });
    // the tin roof: sheets side by side, some rusty today
    const nS = 12,
      r0 = -hw - 0.4,
      wS = (2 * hw + 0.8) / nS;
    for (let i = 0; i < nS; i++) {
      const a = r0 + i * wS,
        b = a + wS + 0.01,
        k = R(),
        col = alt
          ? k < 0.3
            ? mix(C.blech, C.rost, 0.5 + R() * 0.4)
            : shade(C.blech, 0.85 + R() * 0.25)
          : shade(C.blech, 0.95 + R() * 0.15),
        fb = -hd - 0.4,
        ff = hd + 0.6,
        dz = alt ? (R() - 0.5) * 0.02 : 0;
      FM.slab(
        [a, fb, zAt(fb) + 0.05 + dz],
        [b, fb, zAt(fb) + 0.05 + dz],
        [b, ff, zAt(ff) + 0.05 + dz],
        [a, ff, zAt(ff) + 0.05 + dz],
        0.03,
        col,
        shade(col, 0.6)
      );
    }
    // ---- inside ----
    // straw: a stack at the south end (and at the north end in 1989), two loose bales
    const stack = (rA, rows, layers) => {
      for (let l = 0; l < layers; l++)
        for (let j = 0; j < rows; j++)
          for (let i = 0; i < 2; i++) {
            if (l === layers - 1 && R() < 0.4) continue;
            const r = rA + i * 0.9 * Math.sign(rA),
              f = -hd + 0.42 + j * 0.47;
            strohballen(F, R, r + (R() - 0.5) * 0.04, f, F.g(r, f) + l * 0.37, (R() - 0.5) * 0.05);
          }
    };
    stack(3.35, 5, 3);
    strohballen(F, R, 2.3, 0.9, F.g(2.3, 0.9), 0.5);
    if (!alt) {
      stack(-3.35, 5, 4);
      strohballen(F, R, -1.9, -1.6, F.g(-1.9, -1.6), -0.3);
      strohballen(F, R, 1.6, -1.9, F.g(1.6, -1.9), 1.2);
      // a ladder against the back wall, two milk churns, a hay fork, a wooden barrow
      for (const q of [-0.2, 0.2])
        F.beam([0.2 + q, -hd + 0.75, F.g(0.2, -2) + 0.02], [0.2 + q, -hd + 0.12, 2.35], 0.05, 0.05, C.balkenNeu);
      for (let i = 0; i < 7; i++) {
        const k = 0.08 + i * 0.13;
        F.beam(
          [0, -hd + 0.75 - k * 0.63, 0.02 + k * 2.33],
          [0.4, -hd + 0.75 - k * 0.63, 0.02 + k * 2.33],
          0.03,
          0.03,
          C.balkenNeu
        );
      }
      for (const [r, f] of [
        [-0.9, -2.2],
        [-1.35, -2.25],
      ]) {
        const g = F.g(r, f);
        FM.lathe(
          r,
          f,
          g,
          [
            [0.14, 0],
            [0.15, 0.36],
            [0.1, 0.46],
            [0.1, 0.56],
            [0.12, 0.58],
            [0, 0.58],
          ],
          10,
          L(150, 154, 156)
        );
      }
      F.beam([2.3, -hd + 0.1, 2.0], [2.5, -hd + 0.5, F.g(2.4, -2.3) + 0.02], 0.035, 0.035, C.balkenNeu);
      for (const q of [-0.07, 0, 0.07])
        F.beam([2.3 + q, -hd + 0.1, 2.0], [2.3 + q, -hd + 0.07, 2.3], 0.012, 0.012, C.stahl);
      return { F, z0 };
    }
    // ---- today: the clique's den ----
    // the workbench along the back wall, with a vice, a toolbox, an engine, cans; a board of tools over it
    const gb = F.g(-0.2, -2.2);
    F.box(-0.2, -hd + 0.42, gb + 0.84, 2.4, 0.66, 0.06, L(120, 96, 70), true);
    for (const r of [-1.3, 0.9])
      for (const f of [-hd + 0.16, -hd + 0.68]) F.box(r, f, gb, 0.08, 0.08, 0.84, C.balken, false);
    F.box(-0.2, -hd + 0.42, gb + 0.2, 2.2, 0.56, 0.03, L(104, 84, 62), true);
    F.box(0.65, -hd + 0.52, gb + 0.9, 0.2, 0.14, 0.12, C.stahl, false);
    F.box(0.65, -hd + 0.66, gb + 0.96, 0.08, 0.2, 0.05, C.stahl, false);
    F.box(-1.0, -hd + 0.4, gb + 0.9, 0.46, 0.22, 0.2, C.rot, false);
    F.box(-1.0, -hd + 0.4, gb + 1.1, 0.3, 0.04, 0.04, C.stahl, false);
    // an engine block with fins
    F.box(-0.3, -hd + 0.42, gb + 0.9, 0.26, 0.22, 0.16, L(120, 122, 124), false);
    for (let i = 0; i < 5; i++)
      F.box(-0.3, -hd + 0.42, gb + 1.07 + i * 0.035, 0.2, 0.2, 0.012, L(140, 142, 144), false);
    F.cyl(0.15, -hd + 0.3, gb + 0.9, gb + 1.12, 0.05, 0.05, 8, C.gelb, true);
    F.cyl(0.3, -hd + 0.36, gb + 0.9, gb + 1.06, 0.04, 0.04, 8, C.blau, true);
    F.box(-0.2, -hd + 0.06, gb + 1.25, 1.9, 0.03, 0.7, L(70, 60, 50), false);
    for (let i = 0; i < 7; i++)
      F.box(
        -1.0 + i * 0.26,
        -hd + 0.085,
        gb + 1.42 + (i % 3) * 0.06,
        0.035,
        0.012,
        0.22 + (i % 2) * 0.1,
        C.stahl,
        false
      );
    F.box(0.55, -hd + 0.085, gb + 1.72, 0.3, 0.012, 0.04, C.rot, false);
    // a fridge that hums no more
    F.box(-2.2, -hd + 0.36, F.g(-2.2, -2.3), 0.56, 0.56, 1.3, L(214, 212, 204), false);
    F.box(-2.44, -hd + 0.655, F.g(-2.2, -2.3) + 0.7, 0.03, 0.03, 0.3, C.stahl, false);
    // the old moped on blocks, its wheels off: frame, tank, seat, handlebar, lamp, engine, exhaust; two tyres lying beside it
    {
      const g = F.g(1.9, -1.95) + 0.02,
        f0 = -hd + 0.75,
        tank = L(54, 96, 70);
      for (const r of [1.35, 2.4]) F.box(r, f0, g, 0.24, 0.3, 0.22, C.balken, false);
      F.beam([1.2, f0, g + 0.3], [2.5, f0, g + 0.34], 0.05, 0.06, C.schwarz);
      F.beam([1.45, f0, g + 0.32], [1.3, f0, g + 0.92], 0.05, 0.05, C.schwarz);
      F.beam([1.3, f0, g + 0.92], [2.05, f0, g + 0.62], 0.05, 0.05, C.schwarz);
      F.beam([2.05, f0, g + 0.62], [2.5, f0, g + 0.6], 0.05, 0.05, C.schwarz);
      F.box(1.62, f0, g + 0.68, 0.46, 0.2, 0.2, tank, true, 0);
      F.box(2.2, f0, g + 0.64, 0.6, 0.24, 0.09, C.leder, true);
      F.beam([1.3, f0 - 0.3, g + 1.0], [1.3, f0 + 0.3, g + 1.0], 0.03, 0.03, C.stahl);
      F.rolle([1.16, f0, g + 0.8], [1.24, f0, g + 0.8], 0.085, C.stahl, 10, { capCol: L(220, 216, 190) });
      F.box(1.8, f0, g + 0.3, 0.3, 0.22, 0.24, L(118, 120, 122), false);
      F.rolle([1.9, f0 + 0.16, g + 0.26], [2.6, f0 + 0.16, g + 0.3], 0.04, L(90, 70, 56), 8);
      F.box(2.45, f0, g + 0.66, 0.4, 0.14, 0.02, tank, false);
      const tyre = [
        [0.16, 0.02],
        [0.2, 0],
        [0.26, 0],
        [0.29, 0.03],
        [0.29, 0.07],
        [0.26, 0.1],
        [0.2, 0.1],
        [0.16, 0.08],
      ];
      F.lathe(2.3, -1.1, F.g(2.3, -1.1), tyre, 12, C.gummi);
      F.lathe(2.34, -1.07, F.g(2.3, -1.1) + 0.1, tyre, 12, C.gummi);
      // a tank and a mudguard on the wall
      F.box(2.2, -hd + 0.09, g + 1.6, 0.44, 0.1, 0.18, C.rot, true);
      F.box(1.5, -hd + 0.07, g + 1.75, 0.5, 0.03, 0.1, tank, false);
    }
    // the sofa against the north end, a crate as a table, a rug, a dart board, pictures
    {
      const g = F.g(-4.3, -0.2),
        so = C.oliv;
      F.box(-4.32, -0.25, g + 0.12, 0.8, 1.9, 0.3, so, false);
      F.box(-4.66, -0.25, g + 0.12, 0.2, 1.9, 0.72, shade(so, 0.9), false);
      for (const f of [-1.14, 0.64]) F.box(-4.32, f, g + 0.12, 0.8, 0.14, 0.5, shade(so, 0.85), false);
      for (const f of [-0.7, 0.2]) F.box(-4.25, f, g + 0.42, 0.62, 0.84, 0.1, shade(so, 1.12), false);
      F.box(-4.3, 0.18, g + 0.52, 0.6, 0.5, 0.03, L(170, 60, 52), false);
      for (const [r, f] of [
        [-4.62, -1.1],
        [-4.62, 0.6],
        [-4.0, -1.1],
        [-4.0, 0.6],
      ])
        F.box(r, f, g, 0.06, 0.06, 0.12, C.balken, false);
      F.box(-3.2, -0.25, g + 0.02, 1.2, 1.9, 0.012, L(120, 44, 40), false);
      F.box(-3.2, -0.25, g + 0.022, 0.9, 1.5, 0.012, L(150, 120, 80), false);
      kasten(F, -3.15, -0.3, g + 0.03, C.gelb, false, 0.2);
      F.box(-3.15, -0.3, g + 0.31, 0.5, 0.4, 0.02, L(120, 96, 70), false);
      F.cyl(-3.05, -0.25, g + 0.33, g + 0.56, 0.03, 0.03, 6, C.flasche, true);
      // on the wall behind it (the north end): a picture of a moped in a few strokes, a pennant
      const wz = g + 1.25;
      F.box(-4.955, -0.3, wz, 0.012, 1.0, 0.7, C.papier, false);
      F.box(-4.945, -0.3, wz + 0.2, 0.012, 0.6, 0.06, C.schwarz, false);
      F.box(-4.945, -0.42, wz + 0.26, 0.012, 0.3, 0.14, C.rot, false);
      // the dart board on the back wall
      const dz = g + 1.55,
        dc = F.P(-3.2, -hd + 0.06, dz),
        az = F.hd;
      for (const [rr, col] of [
        [0.23, C.schwarz],
        [0.18, C.papier],
        [0.12, C.gruen],
        [0.06, C.rot],
      ])
        K.disc(
          dc[0] + Math.sin(az) * (0.24 - rr) * 0.05,
          dc[1] + Math.cos(az) * (0.24 - rr) * 0.05,
          dc[2],
          Math.sin(az),
          Math.cos(az),
          rr,
          col,
          16,
          false
        );
    }
    return { F, z0 };
  }
  // a crate of bottles (a plain coloured plastic crate – no brand): 4 × 5 necks, or upside down as a seat
  function kasten(F, r, f, z, col, bottles = true, turn = 0) {
    F.box(r, f, z, 0.4, 0.3, 0.27, col, true, turn);
    F.box(r, f, z + 0.271, 0.36, 0.26, 0.004, shade(col, 0.45), false, turn);
    if (!bottles) return;
    const c = Math.cos(turn),
      s = Math.sin(turn);
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 4; j++) {
        const a = -0.15 + i * 0.075,
          b = -0.105 + j * 0.07;
        F.cyl(r + a * c + b * s, f - a * s + b * c, z + 0.26, z + 0.33, 0.022, 0.013, 6, C.flasche, true);
      }
  }
  // ------------------------------------------------------------------ the yard: grill, benches, crate, noticeboard, the bulbs ------------------------------------------------------------------
  function hof(K, KM, KL, KG, F) {
    const R = rnd(5);
    // the grill: half an oil drum on a welded stand, a grate, sausages
    {
      const [r, f] = [2.5, 6.3],
        g = F.g(r, f),
        a = F.P(r - 0.45, f, g + 0.78),
        b = F.P(r + 0.45, f, g + 0.78);
      rolle(KM, a, b, 0.29, L(52, 70, 96), 10, {
        a0: Math.PI,
        a1: Math.PI * 2,
        inside: L(30, 28, 27),
        capCol: L(46, 62, 86),
      });
      for (const sr of [-0.38, 0.38])
        for (const sf of [-1, 1])
          beam(KM, F.P(r + sr, f + sf * 0.16, g + 0.55), F.P(r + sr * 1.15, f + sf * 0.36, g), 0.03, 0.03, C.stahl);
      K.box(...F.xy(r, f), F.z0 + g + 0.66, 0.84, 0.46, 0.05, F.hd * -1, L(40, 36, 34), false);
      for (let i = 0; i < 10; i++)
        beam(
          KM,
          F.P(r - 0.44, f - 0.24 + i * 0.053, g + 0.785),
          F.P(r + 0.44, f - 0.24 + i * 0.053, g + 0.785),
          0.008,
          0.008,
          C.schwarz
        );
      for (let i = 0; i < 5; i++)
        rolle(
          K,
          F.P(r - 0.3 + i * 0.13, f - 0.09, g + 0.805),
          F.P(r - 0.3 + i * 0.13, f + 0.09, g + 0.805),
          0.016,
          shade(C.wurst, 0.85 + R() * 0.3),
          6
        );
      // the embers under the grate (they glow at night)
      for (let i = 0; i < 9; i++) {
        const p = F.P(r - 0.34 + R() * 0.68, f - 0.16 + R() * 0.32, g + 0.71);
        KG.box(p[0], p[1], p[2], 0.05 + R() * 0.04, 0.05 + R() * 0.04, 0.03, R() * 3, [1, 1, 1], false);
      }
      // a sack of charcoal, the tongs on the rim
      F.box(r + 0.75, f + 0.3, F.g(r + 0.75, f + 0.3), 0.3, 0.22, 0.5, L(60, 54, 48), false, 0.3);
    }
    // the beer table with two benches, bottles, paper plates, mustard
    {
      const [r, f] = [4.6, 8.3],
        g = F.g(r, f),
        tb = L(196, 150, 84);
      F.box(r, f, g + 0.74, 0.5, 2.2, 0.03, tb, true);
      for (const sr of [-0.62, 0.62]) F.box(r + sr, f, g + 0.44, 0.25, 2.2, 0.03, tb, true);
      for (const sf of [-0.8, 0.8]) {
        for (const q of [-0.2, 0.2]) F.beam([r + q, f + sf, g + 0.74], [r - q * 0.6, f + sf, g], 0.025, 0.025, C.gruen);
        for (const sr of [-0.62, 0.62])
          for (const q of [-0.1, 0.1])
            F.beam([r + sr + q, f + sf, g + 0.44], [r + sr - q * 0.7, f + sf, g], 0.022, 0.022, C.gruen);
      }
      for (const [dr, df] of [
        [0.1, -0.6],
        [-0.12, -0.2],
        [0.05, 0.5],
        [-0.08, 0.75],
      ])
        F.cyl(r + dr, f + df, g + 0.77, g + 1.0, 0.03, 0.014, 6, C.flasche, true);
      for (const df of [-0.4, 0.2]) F.cyl(r + 0.02, f + df, g + 0.77, g + 0.78, 0.1, 0.1, 10, C.papier, true);
      F.cyl(r - 0.1, f + 0.1, g + 0.77, g + 0.87, 0.035, 0.035, 8, C.gelb, true);
    }
    // a crate of beer by the grill, an empty one upside down
    kasten(F, 1.55, 5.75, F.g(1.55, 5.75), C.kiste, true, 0.3);
    kasten(F, 3.45, 5.6, F.g(3.45, 5.6), C.kiste, false, -0.4);
    // firewood at the barn's corner, a chopping block with an axe
    {
      const g = F.g(5.9, 3.1);
      for (let l = 0; l < 4; l++)
        for (let i = 0; i < 6 - l; i++) {
          const f = 2.2 + i * 0.2 + l * 0.1,
            col = shade(L(150, 112, 70), 0.8 + R() * 0.4);
          F.rolle([5.55, f, g + 0.09 + l * 0.17], [6.3 + R() * 0.1, f, g + 0.09 + l * 0.17], 0.09, col, 7, {
            capCol: L(206, 170, 112),
          });
        }
      F.cyl(6.4, 4.4, F.g(6.4, 4.4), F.g(6.4, 4.4) + 0.42, 0.22, 0.2, 10, L(150, 118, 78), true);
      F.beam([6.4, 4.4, F.g(6.4, 4.4) + 0.46], [6.72, 4.62, F.g(6.4, 4.4) + 0.95], 0.03, 0.04, L(170, 130, 80));
      F.box(6.4, 4.4, F.g(6.4, 4.4) + 0.4, 0.05, 0.17, 0.1, C.stahl, false, 0.6);
    }
    // the noticeboard by the way in from the track: two posts, a board under a little roof, papers
    {
      const [r, f] = [-1, 11.6],
        g = F.g(r, f),
        az = F.hd; // it faces the track
      for (const q of [-0.72, 0.72]) F.box(r + q, f, g - 0.3, 0.09, 0.09, 2.35, C.balken, false);
      F.box(r, f, g + 0.95, 1.36, 0.04, 0.95, C.gruen, false);
      F.slab(
        [r - 0.9, f - 0.25, g + 2.0],
        [r + 0.9, f - 0.25, g + 2.0],
        [r + 0.9, f + 0.3, g + 2.14],
        [r - 0.9, f + 0.3, g + 2.14],
        0.03,
        C.dunkel
      );
      const mid = F.P(r, f + 0.02, g + 1.74);
      tafelText(K, 'KEGELFREUNDE', mid, az, 0.017, C.kreide);
      tafelText(K, 'RATSCHER', F.P(r, f + 0.02, g + 1.58), az, 0.017, C.kreide);
      const pap = [C.papier, L(238, 220, 120), L(232, 176, 170), C.papier, L(190, 214, 232)];
      for (let i = 0; i < 5; i++) {
        const pr = r - 0.5 + (i % 3) * 0.48 + (R() - 0.5) * 0.06,
          pz = g + 1.02 + Math.floor(i / 3) * 0.24 + R() * 0.03;
        F.box(pr, f + 0.024, pz, 0.24 + R() * 0.1, 0.006, 0.19, pap[i], false, (R() - 0.5) * 0.08);
        for (let l = 0; l < 3; l++)
          F.box(pr, f + 0.029, pz + 0.04 + l * 0.045, 0.16, 0.003, 0.012, L(70, 70, 76), false);
      }
    }
    // the string of bulbs over the yard: from the barn's eave to a pole by the benches, on to the alley's post and back to the eave
    {
      const pole = [6.5, 10.0],
        gp = F.g(...pole);
      F.box(pole[0], pole[1], gp - 0.3, 0.1, 0.1, 3.5, C.balken, false);
      const pts = [
        F.P(5.2, 3.2, BARN.eaveF + 0.02),
        F.P(pole[0], pole[1], gp + 3.15),
        [...UV(2.3, 6.15), KB.z + 2.86],
        F.P(-5.2, 3.2, BARN.eaveF + 0.02),
      ];
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i],
          b = pts[i + 1],
          len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
          n = Math.max(4, Math.round(len / 0.85));
        let prev = a;
        for (let j = 1; j <= n; j++) {
          const t = j / n,
            p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - 0.42 * 4 * t * (1 - t)];
          beam(K, prev, p, 0.012, 0.012, C.schwarz);
          prev = p;
          if (j < n) {
            K.box(p[0], p[1], p[2] - 0.05, 0.03, 0.03, 0.05, 0, C.schwarz, false);
            KL.ball(p[0], p[1], p[2] - 0.085, 0.042, [1, 1, 1], 6);
          }
        }
      }
    }
  }
  // ------------------------------------------------------------------ the skittle alley ------------------------------------------------------------------
  function kegelbahn(K, KM) {
    // the lane lies level: its height is the ground under the approach's upper end
    let z = -1e9;
    for (const f of [-KB.anlauf, 0])
      for (const r of [-KB.hw, KB.hw]) {
        const p = [
          KB.o[0] + r * Math.cos(KB.hd) + f * Math.sin(KB.hd),
          KB.o[1] - r * Math.sin(KB.hd) + f * Math.cos(KB.hd),
        ];
        z = Math.max(z, gnd(p[0], p[1]));
      }
    KB.z = z + 0.05;
    const F = frame(K, KB.o[0], KB.o[1], KB.hd, KB.z),
      FM = frame(KM, KB.o[0], KB.o[1], KB.hd, KB.z),
      R = rnd(31),
      Lb = KB.L,
      end = Lb + 1.25, // the lane's end behind the pins
      pit = end + 1.0, // the mat
      lo = -1.4;
    KB.F = F;
    // the approach: boards across
    for (let i = 0; i < 21; i++) {
      const f = -KB.anlauf + (i + 0.5) * (KB.anlauf / 21);
      F.box(
        0,
        f,
        -0.35,
        2 * KB.hw,
        KB.anlauf / 21 - 0.008,
        0.35,
        shade(i % 2 ? C.deck : C.deck2, 0.9 + R() * 0.2),
        false
      );
    }
    F.box(0, -KB.anlauf - 0.14, -0.4, 2 * KB.hw, 0.26, 0.26, C.deck2, false);
    // the lane: ten planks along it, the foul line, the gutters, the kerbs
    for (let i = 0; i < 10; i++)
      F.box(
        -0.675 + i * 0.15,
        end / 2,
        -0.07,
        0.146,
        end,
        0.07,
        shade(i % 2 ? C.bohle : C.bohle2, 0.94 + R() * 0.12),
        false
      );
    F.box(0, 0.02, -0.004, 1.5, 0.045, 0.006, L(60, 40, 30), false);
    for (const sgn of [-1, 1]) {
      F.box(sgn * 0.865, end / 2, -0.12, 0.22, end, 0.045, C.rinne, false);
      F.box(sgn * 1.0, end / 2, -0.12, 0.06, end, 0.3, C.deck2, false);
      F.box(sgn * 1.02, (end + 1) / 2 - 0.2, lo, 0.03, end + 1.4, -0.1 - lo, shade(C.dunkel, 0.8), false);
    }
    // the pin stand: a dark plate with the diamond drawn on it
    F.box(0, Lb + 0.4, -0.002, 1.5, 1.5, 0.004, L(96, 78, 58), false);
    const dm = [
      [0, Lb - 0.06],
      [0.56, Lb + 0.435],
      [0, Lb + 0.93],
      [-0.56, Lb + 0.435],
    ];
    for (let i = 0; i < 4; i++) F.beam([...dm[i], 0.004], [...dm[(i + 1) % 4], 0.004], 0.02, 0.003, C.kreide);
    // the pit behind it and the mat that stops the ball
    F.box(0, end + 0.5, -0.3, 2.0, 1.0, 0.03, C.schwarz, false);
    F.box(0, pit, -0.3, 2.0, 0.08, 1.35, C.gummi, false);
    // the pin house: boards at both sides and behind, open towards the lane
    const zr = r => 2.95 - ((r + 2) / 4) * 0.5; // the roof's underside across the lane
    for (const sgn of [-1, 1])
      bretter(F, R, {
        a: [sgn * 1.12, Lb - 0.5],
        b: [sgn * 1.12, pit + 0.2],
        zb: lo,
        zt: () => zr(sgn * 1.12) - 0.02,
        cols: [C.alt, C.silber, C.alt, C.dunkel],
      });
    bretter(F, R, {
      a: [-1.12, pit + 0.2],
      b: [1.12, pit + 0.2],
      zb: lo,
      zt: t => zr(-1.12 + t * 2.24) - 0.02,
      cols: [C.alt, C.silber, C.dunkel],
    });
    // the posts of the roof along both sides, the plates on them, a rafter at every pair
    const posts = [];
    for (let f = -KB.anlauf; f < pit; f += 3.55) posts.push(f);
    for (const f of posts)
      for (const sgn of [-1, 1]) {
        if (f > Lb - 0.6) continue;
        F.box(sgn * 1.85, f, lo, 0.12, 0.12, zr(sgn * 1.85) - lo, C.balken, false);
      }
    for (const sgn of [-1, 1])
      F.box(
        sgn * 1.85,
        (pit - KB.anlauf) / 2 + 0.1,
        zr(sgn * 1.85) - 0.14,
        0.1,
        pit + KB.anlauf + 0.6,
        0.14,
        C.balken,
        true
      );
    for (const f of posts) F.beam([-1.95, f, zr(-1.95) - 0.05], [1.95, f, zr(1.95) - 0.05], 0.07, 0.1, C.balken);
    // the tin roof, sheet by sheet
    const f0 = -KB.anlauf - 0.35,
      f1 = pit + 0.5,
      nS = Math.round((f1 - f0) / 1.0),
      wS = (f1 - f0) / nS;
    for (let i = 0; i < nS; i++) {
      const a = f0 + i * wS,
        b = a + wS + 0.01,
        col = R() < 0.25 ? mix(C.blech, C.rost, 0.35 + R() * 0.4) : shade(C.blech2, 0.9 + R() * 0.3),
        dz = (R() - 0.5) * 0.015;
      FM.slab(
        [-2.05, a, zr(-2.05) + 0.04 + dz],
        [2.05, a, zr(2.05) + 0.04 + dz],
        [2.05, b, zr(2.05) + 0.04 + dz],
        [-2.05, b, zr(-2.05) + 0.04 + dz],
        0.025,
        col,
        shade(col, 0.55)
      );
    }
    // the ball's way back: a trough on trestles along the left side, falling towards the players, a box for the balls at its end
    {
      const r = -1.45,
        zA = 0.78,
        zB = 0.52,
        fA = Lb + 0.2,
        fB = -0.5;
      F.beam([r, fA, zA], [r, fB, zB], 0.2, 0.025, C.deck);
      for (const q of [-0.1, 0.1]) F.beam([r + q, fA, zA + 0.04], [r + q, fB, zB + 0.04], 0.025, 0.08, C.deck2);
      for (let f = fB + 0.4; f < fA; f += 2.6) {
        const zz = zB + ((f - fB) / (fA - fB)) * (zA - zB);
        F.box(r, f, lo, 0.06, 0.06, zz - lo - 0.01, C.balken, false);
      }
      F.box(r, -0.95, 0.4, 0.34, 0.9, 0.03, C.deck, true);
      for (const q of [-0.16, 0.16]) F.box(r + q, -0.95, 0.4, 0.025, 0.9, 0.14, C.deck2, false);
      for (const ff of [-1.4, -0.5]) F.box(r, ff, 0.4, 0.34, 0.025, 0.14, C.deck2, false);
      for (const ff of [-1.3, -0.6])
        for (const q of [-0.13, 0.13]) F.box(r + q, ff, -0.3, 0.05, 0.05, 0.7, C.balken, false);
      for (const ff of [-1.2, -1.02]) F.ball(r, ff, 0.51, 0.08, L(48, 38, 34), 10);
    }
    // the sign over the way in, hung under the roof's end: green board, chalk-white letters
    {
      const f = -KB.anlauf - 0.2,
        az = KB.hd + Math.PI; // it faces those who come from the yard
      F.box(0, f, 2.02, 2.5, 0.04, 0.4, C.gruen, true);
      for (const q of [-1.1, 1.1]) F.box(q, f, 2.4, 0.02, 0.02, 0.2, C.schwarz, false);
      tafelText(K, 'KEGELBAHN', F.P(0, f - 0.021, 2.3), az, 0.034, C.kreide);
      tafelText(K, 'ALLE NEUNE!', F.P(0, f - 0.021, 2.1), az, 0.016, C.gelb);
    }
    // the slate for the scores on a post at the right of the approach (gl_kegeln.js writes on it), a bench along the right side
    {
      const r = 1.55,
        f = -0.9;
      F.box(r, f, -0.4, 0.08, 0.08, 2.25, C.balken, false);
      F.box(r - 0.045, f, 1.0, 0.03, 0.74, 0.86, C.schwarz, false);
      F.box(r - 0.03, f, 0.97, 0.05, 0.8, 0.035, C.balken, false);
      F.box(r - 0.03, f, 1.86, 0.05, 0.8, 0.035, C.balken, false);
      KB.tafel = { p: F.P(r - 0.062, f, 1.8), az: KB.hd - Math.PI / 2 };
      tafelText(K, 'BESTE', F.P(r - 0.062, f, 1.74), KB.tafel.az, 0.02, C.kreide);
      F.box(1.45, -2.9, 0.42, 0.3, 1.8, 0.04, C.deck, true);
      for (const ff of [-3.6, -2.2]) F.box(1.45, ff, 0, 0.26, 0.06, 0.42, C.balken, false);
    }
    return F;
  }
  // ------------------------------------------------------------------ the shop on wheels ------------------------------------------------------------------
  function rad(K, F, r, f, Rw, w = 0.24) {
    const sgn = Math.sign(r) || 1;
    rolle(K, F.P(r - (sgn * w) / 2, f, Rw), F.P(r + (sgn * w) / 2, f, Rw), Rw, L(18, 18, 19), 12);
    rolle(
      K,
      F.P(r + sgn * (w / 2 + 0.004), f, Rw),
      F.P(r + sgn * (w / 2 + 0.006), f, Rw),
      Rw * 0.58,
      L(150, 152, 156),
      10
    );
  }
  function wagen(K, offen) {
    WG.z = gnd(WG.o[0], WG.o[1]);
    const F = frame(K, WG.o[0], WG.o[1], WG.hd, WG.z),
      R = rnd(77),
      W = C.weiss,
      hw = 1.05,
      yB = -2.85, // the body's rear end
      yC = 1.3, // where the cab begins
      yF = 2.9,
      zF = WG.boden, // the floor inside
      zT = 2.78, // the body's top
      o0 = -2.35, // the flap's opening along the van
      o1 = 0.95,
      oz0 = 1.0,
      oz1 = 2.3;
    WG.F = F;
    WG.frau = { xy: F.xy(0.28, -0.6), z: WG.z + zF, hd: WG.hd + Math.PI / 2 };
    // the chassis and the wheels
    F.box(0, 0, 0.32, 1.7, yF - yB - 0.2, 0.2, C.schwarz, true);
    for (const f of [-1.75, 2.0]) for (const r of [-0.9, 0.9]) rad(K, F, r, f, 0.37);
    // the box: floor, roof, the left side and the rear closed, the right side with the opening
    F.box(0, (yB + yC) / 2, zF - 0.1, 2 * hw, yC - yB, 0.1, W, true);
    F.box(0, (yB + yC) / 2, zT - 0.06, 2 * hw, yC - yB, 0.06, W, true);
    F.box(-hw + 0.03, (yB + yC) / 2, zF, 0.06, yC - yB, zT - zF - 0.06, W, true);
    F.box(0, yB + 0.03, zF, 2 * hw, 0.06, zT - zF - 0.06, W, true);
    F.box(0, yC - 0.03, zF, 2 * hw, 0.06, zT - zF - 0.06, W, true);
    F.box(hw - 0.03, (yB + o0) / 2, zF, 0.06, o0 - yB, zT - zF - 0.06, W, true);
    F.box(hw - 0.03, (o1 + yC) / 2, zF, 0.06, yC - o1, zT - zF - 0.06, W, true);
    F.box(hw - 0.03, (o0 + o1) / 2, zF, 0.06, o1 - o0, oz0 - zF, W, true);
    F.box(hw - 0.03, (o0 + o1) / 2, oz1, 0.06, o1 - o0, zT - oz1 - 0.06, W, true);
    // a green band round the box, the skirt, the rear lamps, the door in the rear
    for (const sgn of [-1, 1]) F.box(sgn * (hw + 0.004), (yB + yC) / 2, 0.66, 0.01, yC - yB, 0.16, C.gruen, false);
    F.box(0, yB - 0.004, 0.66, 2 * hw, 0.01, 0.16, C.gruen, false);
    F.box(0, (yB + yC) / 2, 0.42, 2 * hw - 0.04, yC - yB - 0.1, 0.2, L(200, 198, 190), false);
    F.box(0.3, yB - 0.006, 0.9, 0.8, 0.012, 1.7, L(222, 220, 212), false);
    F.box(0.62, yB - 0.014, 1.6, 0.03, 0.02, 0.14, C.stahl, false);
    for (const r of [-0.9, 0.9]) F.box(r, yB - 0.006, 0.84, 0.14, 0.014, 0.2, C.rot, false);
    // the cab: bonnet, windscreen, side windows, lamps, bumper, mirrors
    F.box(0, (yC + yF) / 2, 0.5, 2 * hw - 0.06, yF - yC, 0.75, W, true);
    F.slab(
      [-hw + 0.05, yC, 2.2],
      [hw - 0.05, yC, 2.2],
      [hw - 0.08, yF - 0.75, 2.12],
      [-hw + 0.08, yF - 0.75, 2.12],
      0.05,
      W
    );
    F.quad(
      [-hw + 0.08, yF - 0.75, 2.1],
      [hw - 0.08, yF - 0.75, 2.1],
      [hw - 0.05, yF - 0.12, 1.26],
      [-hw + 0.05, yF - 0.12, 1.26],
      L(26, 34, 40)
    );
    for (const sgn of [-1, 1]) {
      const x = sgn * (hw - 0.04);
      K.quad(
        ...(sgn > 0
          ? [F.P(x, yC + 0.05, 1.25), F.P(x, yF - 0.14, 1.25), F.P(x, yF - 0.76, 2.1), F.P(x, yC + 0.05, 2.1)]
          : [F.P(x, yF - 0.14, 1.25), F.P(x, yC + 0.05, 1.25), F.P(x, yC + 0.05, 2.1), F.P(x, yF - 0.76, 2.1)]),
        L(26, 34, 40)
      );
      F.box(sgn * (hw - 0.03), yC + 0.03, 1.25, 0.06, 0.06, 0.95, W, false);
      F.box(sgn * (hw + 0.1), yF - 0.75, 1.35, 0.12, 0.05, 0.2, C.schwarz, false);
      F.box(sgn * (hw - 0.3), yF + 0.005, 0.72, 0.3, 0.02, 0.16, L(236, 236, 226), false);
    }
    F.box(0, (yC + yF) / 2 + 0.6, 1.25, 2 * hw - 0.1, 0.5, 0.02, W, false);
    F.box(0, yF + 0.03, 0.36, 2 * hw, 0.12, 0.2, L(60, 62, 64), true);
    F.box(0, yF + 0.006, 0.78, 0.9, 0.02, 0.2, C.schwarz, false);
    F.box(0, yC + 0.4, 1.25, 2 * hw - 0.2, 0.7, 0.03, C.schwarz, false);
    // the firm's writing (invented, no firm of that name tours here): on the left side and the rear
    tafelText(K, 'FRISCH VOM LAND', F.P(-hw - 0.001, (yB + yC) / 2, 1.9), WG.hd - Math.PI / 2, 0.036, C.gruen);
    tafelText(K, 'WURST BROT KÄSE', F.P(-hw - 0.001, (yB + yC) / 2, 1.5), WG.hd - Math.PI / 2, 0.02, L(70, 74, 78));
    tafelText(K, 'VERKAUFSWAGEN', F.P(0.3, yB - 0.014, 2.42), WG.hd + Math.PI, 0.016, C.gruen);
    const az = WG.hd + Math.PI / 2; // what faces the customers
    if (!offen) {
      // shut: the flap lies on the opening
      F.box(hw + 0.01, (o0 + o1) / 2, oz0 - 0.03, 0.03, o1 - o0 + 0.06, oz1 - oz0 + 0.06, L(224, 222, 214), true);
      for (const f of [o0 + 0.5, o1 - 0.5]) F.box(hw + 0.03, f, oz0 + 0.05, 0.02, 0.1, 0.05, C.stahl, false);
      tafelText(K, 'GESCHLOSSEN', F.P(hw + 0.027, (o0 + o1) / 2, 1.75), az, 0.026, C.rot);
      tafelText(
        K,
        GLNLOGIK.zeitenText().replace(' und ', ' + ').replace(' Uhr', '').replace(/–/g, '-'),
        F.P(hw + 0.027, (o0 + o1) / 2, 1.45),
        az,
        0.017,
        L(70, 74, 78)
      );
      return F;
    }
    // open: the flap stands out as a roof on two stays, a red and white valance at its edge
    const out = 1.3,
      zo = oz1 + 0.12;
    F.slab(
      [hw, o0 - 0.03, oz1 + 0.02],
      [hw + out, o0 - 0.03, zo],
      [hw + out, o1 + 0.03, zo],
      [hw, o1 + 0.03, oz1 + 0.02],
      0.03,
      L(224, 222, 214)
    );
    for (const f of [o0 + 0.05, o1 - 0.05])
      F.beam([hw, f, oz0 + 0.25], [hw + out - 0.1, f, zo - 0.04], 0.025, 0.025, C.stahl);
    const nV = 16,
      wV = (o1 - o0 + 0.06) / nV;
    for (let i = 0; i < nV; i++)
      F.box(hw + out, o0 - 0.03 + (i + 0.5) * wV, zo - 0.21, 0.012, wV, 0.2, i % 2 ? C.weiss : C.rot, false);
    // inside: the counter, what lies on it, the shelves at the back with their packets, the scale
    F.box(hw - 0.3, (o0 + o1) / 2, zF, 0.5, o1 - o0, oz0 - zF - 0.02, L(206, 204, 198), false);
    F.box(hw - 0.28, (o0 + o1) / 2, oz0 - 0.02, 0.56, o1 - o0, 0.03, L(150, 154, 158), true);
    for (let i = 0; i < 6; i++)
      rolle(
        K,
        F.P(hw - 0.42, o0 + 0.25 + i * 0.07, oz0 + 0.05),
        F.P(hw - 0.12, o0 + 0.25 + i * 0.07, oz0 + 0.05),
        0.026,
        shade(C.wurst, 0.8 + R() * 0.4),
        6
      );
    for (let i = 0; i < 4; i++)
      rolle(
        K,
        F.P(hw - 0.4, o0 + 0.85 + i * 0.11, oz0 + 0.06),
        F.P(hw - 0.1, o0 + 0.85 + i * 0.11, oz0 + 0.06),
        0.045,
        L(120, 40, 36),
        8
      );
    for (let i = 0; i < 3; i++)
      F.box(
        hw - 0.27,
        o0 + 1.55 + i * 0.3,
        oz0 + 0.01,
        0.3,
        0.22,
        0.12,
        shade(L(186, 132, 70), 0.85 + R() * 0.3),
        false,
        (R() - 0.5) * 0.3
      );
    F.cyl(hw - 0.27, o0 + 2.5, oz0 + 0.01, oz0 + 0.11, 0.15, 0.15, 12, L(232, 196, 84), true);
    F.box(hw - 0.3, o1 - 0.3, oz0 + 0.01, 0.26, 0.3, 0.07, L(92, 96, 100), false);
    F.box(hw - 0.42, o1 - 0.3, oz0 + 0.08, 0.04, 0.26, 0.2, L(92, 96, 100), false);
    // the basket of rolls
    F.box(hw - 0.27, o0 + 2.85, oz0 + 0.01, 0.3, 0.26, 0.08, L(150, 110, 60), false);
    for (let i = 0; i < 6; i++)
      F.ball(
        hw - 0.36 + (i % 3) * 0.09,
        o0 + 2.79 + Math.floor(i / 3) * 0.12,
        oz0 + 0.1,
        0.05,
        shade(L(206, 156, 84), 0.85 + R() * 0.3),
        6
      );
    const pk = [C.rot, C.gelb, C.blau, C.gruen, L(232, 228, 214), L(220, 130, 50), L(120, 70, 130)];
    for (const z of [1.15, 1.58, 2.0]) {
      F.box(-hw + 0.2, (yB + yC) / 2, z, 0.3, yC - yB - 0.2, 0.025, L(190, 188, 180), true);
      for (let f = yB + 0.25; f < yC - 0.3;) {
        const w = 0.1 + R() * 0.14,
          h = 0.12 + R() * 0.2;
        F.box(
          -hw + 0.2,
          f + w / 2,
          z + 0.025,
          0.2,
          w,
          h,
          shade(pk[Math.floor(R() * pk.length)], 0.8 + R() * 0.3),
          false
        );
        f += w + 0.02 + R() * 0.05;
      }
    }
    // what stands outside: crates of apples and potatoes by the rear wheel, a sack, the price board on its stand
    {
      const g = F.g(1.75, -2.3);
      for (const [r, f, col, n] of [
        [1.7, -2.45, L(190, 40, 34), 0],
        [1.72, -1.9, L(150, 110, 62), 0],
        [1.7, -2.45, L(120, 160, 60), 1],
      ]) {
        const z = g + n * 0.3;
        F.box(r, f, z, 0.56, 0.4, 0.28, L(160, 126, 82), false);
        for (let i = 0; i < 12; i++)
          F.ball(
            r - 0.2 + (i % 4) * 0.13,
            f - 0.12 + Math.floor(i / 4) * 0.12,
            z + 0.27,
            0.058,
            shade(col, 0.8 + R() * 0.4),
            6
          );
      }
      F.cyl(1.75, -1.35, g, g + 0.5, 0.2, 0.16, 10, L(170, 150, 110), true);
      // the price board: a slate on an A-frame, facing the lane
      const [r, f] = [2.15, 1.75],
        gb = F.g(r, f);
      F.slab(
        [r - 0.06, f - 0.3, gb + 0.95],
        [r - 0.06, f + 0.3, gb + 0.95],
        [r + 0.22, f + 0.3, gb],
        [r + 0.22, f - 0.3, gb],
        0.025,
        C.schwarz,
        C.balken
      );
      F.beam([r - 0.06, f, gb + 0.95], [r - 0.4, f, gb], 0.5, 0.02, C.balken);
      const tilt = Math.atan2(0.28, 0.95),
        n = [Math.sin(az) * Math.cos(tilt), Math.cos(az) * Math.cos(tilt), Math.sin(tilt)],
        rv = [-Math.cos(az), Math.sin(az), 0],
        uv = crs(n, rv),
        top = F.P(r - 0.06, f, gb + 0.95),
        line = (txt, row, px, col) =>
          schrift(
            K,
            txt,
            add(add(add(top, uv, -0.08 - row * 0.105), rv, -breite(txt, px) / 2), n, 0.008),
            rv,
            uv,
            px,
            col
          );
      line('HEUTE', 0, 0.014, C.gelb);
      line('BRATWURST', 1.3, 0.0095, C.kreide);
      line('2,50', 2.3, 0.013, C.kreide);
      line('KAFFEE 1,50', 3.5, 0.0085, C.kreide);
      line('ANGELKARTE', 4.6, 0.0085, C.kreide);
      line('KÖDER', 5.5, 0.0085, C.kreide);
    }
    return F;
  }
  // ------------------------------------------------------------------ the angling spot ------------------------------------------------------------------
  function steg(K) {
    // down the bank from the board on the dam: where the slope begins, where the jetty's deck meets the ground
    const o = AN.o,
      dx = Math.sin(AN.hd),
      dy = Math.cos(AN.hd),
      at = s => gnd(o[0] + dx * s, o[1] + dy * s),
      Wm = (window.GEOMAN && window.GEOMAN.water) || [];
    let w = 14.78;
    for (const q of Wm) if (/Ratscher/.test(q.name || '') && Number.isFinite(q.z)) w = q.z;
    AN.w = w;
    AN.z = w + 0.42;
    const g0 = at(0);
    let s1 = 4,
      sA = 0;
    for (let s = 2; s < 60; s += 0.25)
      if (at(s) < g0 - 0.35) {
        s1 = s;
        break;
      }
    for (let s = s1; s < 80; s += 0.1)
      if (at(s) < AN.z - 0.04) {
        sA = s - 0.5;
        break;
      }
    if (!sA) sA = s1 + 12;
    AN.sA = sA;
    AN.sB = sA + 7.2;
    const F = frame(K, o[0], o[1], AN.hd, 0),
      R = rnd(3),
      plank = L(150, 128, 100);
    AN.F = F;
    // stone steps let into the bank
    for (let s = s1 - 0.6; s < sA - 0.2; s += 0.62) {
      const z = Math.max(at(s), at(s + 0.3)) + 0.03;
      F.box(
        (R() - 0.5) * 0.06,
        s,
        z - 0.3,
        1.25,
        0.56,
        0.3,
        shade(R() < 0.5 ? C.stein : C.stein2, 0.9 + R() * 0.2),
        false,
        (R() - 0.5) * 0.05
      );
    }
    // a hand rail of round timber on the right
    {
      let prev = null;
      for (let s = s1 - 0.6; s < sA; s += 2.4) {
        const z = at(s);
        F.box(0.85, s, z - 0.3, 0.09, 0.09, 1.25, C.balken, false);
        if (prev) F.beam([0.85, prev[0], prev[1] + 0.9], [0.85, s, z + 0.9], 0.06, 0.06, C.balken);
        prev = [s, z];
      }
    }
    // the jetty: piles in pairs, bearers, the deck's planks, a low rail on the left, a bench at its end
    const zd = AN.z;
    for (let s = sA + 0.4; s < AN.sB + 0.3; s += 2.2)
      for (const q of [-AN.hw + 0.06, AN.hw - 0.06])
        F.cyl(q, s, w - 1.6, zd + (s > AN.sB - 1 ? 0.5 : 0.02), 0.075, 0.07, 8, C.balken, true);
    for (const q of [-AN.hw + 0.12, AN.hw - 0.12])
      F.box(q, (sA + AN.sB) / 2, zd - 0.16, 0.08, AN.sB - sA, 0.12, C.balken, true);
    const n = Math.round((AN.sB - sA) / 0.16);
    for (let i = 0; i < n; i++)
      F.box(
        (R() - 0.5) * 0.02,
        sA + (i + 0.5) * ((AN.sB - sA) / n),
        zd - 0.04,
        2 * AN.hw,
        (AN.sB - sA) / n - 0.012,
        0.04,
        shade(plank, 0.82 + R() * 0.3),
        true
      );
    F.beam([-AN.hw + 0.06, AN.sB - 0.9, zd + 0.5], [-AN.hw + 0.06, AN.sB + 0.24, zd + 0.5], 0.05, 0.05, C.balken);
    F.box(-AN.hw + 0.24, AN.sB - 2.4, zd + 0.4, 0.3, 1.1, 0.04, plank, true);
    for (const ff of [-2.85, -1.95]) F.box(-AN.hw + 0.24, AN.sB + ff, zd, 0.26, 0.05, 0.4, C.balken, false);
    // the angler's stool at the end (gl_angeln.js seats one there)
    F.box(0.22, AN.sB - 0.62, zd, 0.36, 0.3, 0.4, L(92, 110, 84), false);
    F.box(0.22, AN.sB - 0.62, zd + 0.4, 0.4, 0.34, 0.04, L(70, 84, 64), false);
    // a bucket, a rod rest at the end, a tin for the bait
    F.cyl(AN.hw - 0.2, AN.sB - 1.9, zd, zd + 0.26, 0.11, 0.13, 10, L(60, 100, 150), false);
    F.cyl(AN.hw - 0.2, AN.sB - 1.9, zd + 0.02, zd + 0.2, 0.1, 0.12, 10, L(40, 52, 60), true);
    F.beam([AN.hw - 0.08, AN.sB - 0.25, zd], [AN.hw - 0.08, AN.sB - 0.25, zd + 0.62], 0.02, 0.02, C.stahl);
    F.beam([AN.hw - 0.14, AN.sB - 0.25, zd + 0.62], [AN.hw - 0.02, AN.sB - 0.25, zd + 0.62], 0.02, 0.02, C.stahl);
    F.cyl(-AN.hw + 0.3, AN.sB - 1.4, zd + 0.44, zd + 0.5, 0.05, 0.05, 8, C.gelb, true);
    // the sign at the head of the steps
    {
      const s = s1 - 1.3,
        g = at(s),
        az = AN.hd + Math.PI; // it faces those who come from the dam
      F.box(-1.15, s, g - 0.3, 0.08, 0.08, 2.0, C.balken, false);
      F.box(-1.15, s - 0.045, g + 1.05, 0.9, 0.025, 0.56, C.weiss, false);
      tafelText(K, 'ANGELN NUR', F.P(-1.15, s - 0.06, g + 1.46), az, 0.012, C.schwarz);
      tafelText(K, 'MIT GASTKARTE', F.P(-1.15, s - 0.06, g + 1.33), az, 0.01, C.schwarz);
      tafelText(K, 'KARTEN AM', F.P(-1.15, s - 0.06, g + 1.2), az, 0.008, C.blau);
      tafelText(K, 'VERKAUFSWAGEN', F.P(-1.15, s - 0.06, g + 1.12), az, 0.008, C.blau);
    }
    const end = F.xy(0, AN.sB - 0.85);
    P.angel[0] = end[0];
    P.angel[1] = end[1];
    return F;
  }
  // ------------------------------------------------------------------ what stops whom, where one stands ------------------------------------------------------------------
  const active = c => S.built && (!c.era || c.era === S.era) && (!c.nur || S.offen);
  function addCol(B, era = '', nur = '') {
    const c = { B, era, nur };
    c.x = { gl: true, box: () => (active(c) ? B : null) };
    S.cols.push(c);
    VEH.extra.push(c.x);
  }
  // a circle out of a turned box: moves p, true if it moved
  function pushBox(B, p, rad) {
    const dx = p[0] - B.c[0],
      dy = p[1] - B.c[1],
      lx = dx * B.ax[0] + dy * B.ax[1],
      ly = dx * B.ay[0] + dy * B.ay[1],
      qx = Math.max(-B.ex, Math.min(B.ex, lx)),
      qy = Math.max(-B.ey, Math.min(B.ey, ly)),
      ex = lx - qx,
      ey = ly - qy,
      dd = Math.hypot(ex, ey);
    if (dd >= rad) return false;
    let nx, ny, d;
    if (dd > 1e-6) {
      nx = ex / dd;
      ny = ey / dd;
      d = rad - dd;
    } else {
      const ox = B.ex - Math.abs(lx),
        oy = B.ey - Math.abs(ly);
      if (ox < oy) {
        nx = Math.sign(lx || 1);
        ny = 0;
        d = ox + rad;
      } else {
        nx = 0;
        ny = Math.sign(ly || 1);
        d = oy + rad;
      }
    }
    p[0] += (B.ax[0] * nx + B.ay[0] * ny) * d;
    p[1] += (B.ax[1] * nx + B.ay[1] * ny) * d;
    return true;
  }
  const near = (x, y, q, r) => Math.abs(x - q[0]) < r && Math.abs(y - q[1]) < r;
  function providers() {
    if (S.once) return;
    S.once = true;
    // the mode's figures keep out of the walls (the walker and vehicles: VEH.extra)
    KERN.provide(
      'pushOut',
      (p, rad) => {
        if (!S.built || !(near(p[0], p[1], T, 45) || near(p[0], p[1], WG.o, 12))) return undefined;
        let moved = false;
        for (const c of S.cols) if (active(c) && pushBox(c.B, p, rad)) moved = true;
        return moved ? true : undefined;
      },
      40
    );
    // ground to stand on: the alley's approach, the jetty's deck
    KERN.provide(
      'ground',
      (x, y) => {
        if (!S.built || S.era !== 'heute') return undefined;
        // (no arrays here: this is asked for every foot and wheel)
        if (near(x, y, KB.o, 8) && KB.F) {
          const dx = x - KB.o[0],
            dy = y - KB.o[1],
            r = dx * KBC - dy * KBS,
            f = dx * KBS + dy * KBC;
          if (Math.abs(r) <= KB.hw && f >= -KB.anlauf - 0.25 && f <= 0.3) return KB.z;
        } else if (near(x, y, P.angel, 12) && AN.F) {
          const dx = x - AN.o[0],
            dy = y - AN.o[1],
            r = dx * ANC - dy * ANS,
            q = dx * ANS + dy * ANC;
          if (Math.abs(r) <= AN.hw && q >= AN.sA && q <= AN.sB) return AN.z;
        }
        return undefined;
      },
      30
    );
    const inBarn = (x, y) => S.built && near(x, y, T, 8) && inScheune(x, y);
    KERN.provide(
      'place',
      (x, y) => {
        if (!S.built) return undefined;
        if (near(x, y, T, 40)) {
          if (inScheune(x, y)) return 'Feldscheune';
          if (S.era === 'heute' && KB.F) {
            const [r, f] = KB.F.loc(x, y);
            if (Math.abs(r) < 2.4 && f > -KB.anlauf - 1 && f < KB.L + 3) return 'Kegelbahn';
          }
          const [u, v] = [
            (x - T[0]) * Math.sin(HD) + (y - T[1]) * Math.cos(HD),
            (x - T[0]) * Math.cos(HD) - (y - T[1]) * Math.sin(HD),
          ];
          if (u > -9 && u < 9 && v > -4 && v < 13) return 'An der Feldscheune';
        } else if (S.era === 'heute' && Math.hypot(x - WG.o[0], y - WG.o[1]) < 5.5) return 'Verkaufswagen';
        else if (S.era === 'heute' && near(x, y, P.angel, 14) && AN.F) {
          const [r, s] = AN.F.loc(x, y);
          if (Math.abs(r) < 2.5 && s > AN.sA - 9 && s < AN.sB + 1) return 'Angelstelle an der Staumauer';
        }
        return undefined;
      },
      32
    );
    KERN.provide('inside', (x, y) => inBarn(x, y) || undefined, 5);
    // one borrowed light over the yard at night, while somebody is near
    KERN.lights.borrow({
      id: 'grenzland:hof',
      n: 1,
      prio: 3,
      want: () => {
        if (!S.built || !S.dark || S.era !== 'heute') return false;
        const o = KERN.where();
        return !!o && Math.hypot(o[0] - T[0], o[1] - T[1]) < 70;
      },
      on: ls => {
        const l = ls[0],
          p = BX(0.5, 5.2);
        l.color.setHex(0xffc98a);
        l.distance = 17;
        l.decay = 1.4;
        l.position.set(p[0], gnd(p[0], p[1]) + 2.9, -p[1]);
        l.intensity = 11;
        S.lamp = l;
        markDirty(true);
      },
      off: () => {
        S.lamp = null;
        markDirty(true);
      },
    });
    KERN.on('grenzland:era', () => S.built && setEra());
    karte();
  }
  // the radar of the core (gl_karte.js, when it is there): our places as white discs
  function karte() {
    const G = window.GLKARTE;
    if (S.karte || !G || !G.src) return;
    S.karte = true;
    G.src(out => {
      if (!S.built) return;
      out.push({ x: T[0], y: T[1], k: 'ort', name: 'Scheune' });
      if (S.era !== 'heute') return;
      out.push({ x: P.kegel[0], y: P.kegel[1], k: 'ort', name: 'Kegelbahn' });
      if (S.offen) out.push({ x: P.wagen[0], y: P.wagen[1], k: 'ort', name: 'Verkaufswagen' });
      out.push({ x: P.angel[0], y: P.angel[1], k: 'ort', name: 'Angelstelle' });
    });
  }
  // in the barn: under its roof, between its walls
  function inScheune(x, y) {
    const u = (x - BO[0]) * Math.sin(HD) + (y - BO[1]) * Math.cos(HD),
      v = (x - BO[0]) * Math.cos(HD) - (y - BO[1]) * Math.sin(HD);
    return Math.abs(u) < BARN.hw && Math.abs(v) < BARN.hd + 0.15;
  }
  // ------------------------------------------------------------------ build, drop, the era, the hours ------------------------------------------------------------------
  function show() {
    const M = S.meshes,
      h = S.era === 'heute';
    for (const k of ['treff', 'treffM', 'lampen', 'glut', 'wagenAuf', 'wagenZu', 'steg']) if (M[k]) M[k].visible = h;
    for (const k of ['alt', 'altM']) if (M[k]) M[k].visible = !h;
    if (h) {
      if (M.wagenAuf) M.wagenAuf.visible = S.offen;
      if (M.wagenZu) M.wagenZu.visible = !S.offen;
    }
    markDirty(true);
  }
  function setEra() {
    S.era = GL.era === '1989' ? '1989' : 'heute';
    show();
    for (const h of S.hooks) if (h.era) h.era(S.era);
  }
  function glow() {
    const M = S.meshes,
      on = S.dark && S.era === 'heute';
    if (M.lampen) M.lampen.material.emissiveIntensity = on ? 2.6 : 0;
    if (M.glut) M.glut.material.emissiveIntensity = on ? 2.2 : 0.9;
    markDirty();
  }
  function build() {
    if (S.built) return;
    const t0 = performance.now(),
      MT = mats(),
      M = S.meshes;
    providers();
    karte();
    S.era = GL.era === '1989' ? '1989' : 'heute';
    S.offen = GLNLOGIK.offen(CLOCK.t);
    S.dark = !!(VAUTO.dark && VAUTO.dark());
    try {
      // the clique's place today: the alley first (the bulbs hang on its post)
      const K = VPROPS.kit(),
        KM = VPROPS.kit(),
        KL = VPROPS.kit(),
        KG = VPROPS.kit();
      const FK = kegelbahn(K, KM),
        { F: FB, z0 } = scheune(K, KM, true);
      hof(K, KM, KL, KG, FB);
      M.treff = mesh(K, MT.paint, 'grenzland-treff');
      M.treffM = mesh(KM, MT.metal, 'grenzland-treff-blech');
      const lm = VAUTO.LM.head.clone();
      lm.color.setHex(0xf2e6c8);
      lm.emissive.setHex(0xffd9a0);
      lm.metalness = 0;
      lm.roughness = 0.4;
      M.lampen = mesh(KL, lm, 'grenzland-lampen', false);
      const gm = VAUTO.LM.head.clone();
      gm.color.setHex(0x3a1608);
      gm.emissive.setHex(0xff5a14);
      gm.metalness = 0;
      gm.roughness = 0.9;
      M.glut = mesh(KG, gm, 'grenzland-glut', false);
      // the barn of 1989
      const K9 = VPROPS.kit(),
        K9M = VPROPS.kit();
      scheune(K9, K9M, false);
      M.alt = mesh(K9, MT.paint, 'grenzland-scheune-1989');
      M.altM = mesh(K9M, MT.metal, 'grenzland-scheune-1989-blech');
      // what stops whom at the barn (both times: the walls and the posts)
      const { hw, hd } = BARN;
      addCol(FB.col(-hw - 0.05, hw + 0.05, -hd - 0.08, -hd + 0.08, -1, 3));
      for (const sgn of [-1, 1]) addCol(FB.col(sgn * hw - 0.08, sgn * hw + 0.08, -hd, hd, -1, 3));
      for (const r of [-hw / 3, hw / 3]) addCol(FB.col(r - 0.1, r + 0.1, hd - 0.18, hd + 0.02, -1, 3));
      addCol(FB.col(2.85, 4.75, -hd, -0.15, -1, 1.4));
      addCol(FB.col(-2.52, 2.8, -hd, -1.62, -1, 1.5), 'heute');
      addCol(FB.col(-4.9, -3.9, -1.25, 0.75, -1, 1.2), 'heute');
      addCol(FB.col(-4.75, -2.85, -hd, -0.15, -1, 1.6), '1989');
      addCol(FB.col(-1.6, 0.6, -hd, -1.9, -1, 1.2), '1989');
      // the yard today: grill, table and benches, crates, the pole, the noticeboard, the firewood
      addCol(FB.col(1.95, 3.05, 5.95, 6.65, -1, 1.2), 'heute');
      addCol(FB.col(3.8, 5.4, 7.15, 9.45, -1, 1.1), 'heute');
      addCol(FB.col(1.3, 1.8, 5.55, 5.95, -1, 0.7), 'heute');
      addCol(FB.col(6.4, 6.6, 9.9, 10.1, -1, 3), 'heute');
      addCol(FB.col(-1.8, -0.2, 11.5, 11.7, -1, 2.5), 'heute');
      addCol(FB.col(5.5, 6.65, 2.1, 4.7, -1, 1), 'heute');
      // the alley: the lane with its gutters, the trough and the pin house; the posts at the approach; the slate's post
      addCol(FK.col(-1.95, 1.95, 0.32, KB.L + 2.6, -2, 3), 'heute');
      for (const f of [-KB.anlauf, -KB.anlauf + 3.55])
        for (const sgn of [-1, 1])
          addCol(FK.col(sgn * 1.85 - 0.08, sgn * 1.85 + 0.08, f - 0.08, f + 0.08, -2, 3), 'heute');
      addCol(FK.col(-1.65, -1.25, -1.45, 0.3, -2, 1.2), 'heute');
      addCol(FK.col(1.3, 1.62, -3.85, -0.8, -2, 1.2), 'heute');
      // a hiding place: three circles over the barn's floor (grenzland/gl_fahndung.js)
      for (const u of [-2.7, 0, 2.7]) {
        const [x, y] = UV(u, BARN.v0);
        S.hide.push({ x, y, r: 2.85, gl: true });
      }
      GLFAHNDUNG.extra.push(...S.hide);
      P.kegel[0] = KB.stand[0];
      P.kegel[1] = KB.stand[1];
      S.zB = z0;
    } catch (e) {
      console.warn('grenzland orte: treff', e);
    }
    try {
      for (const offen of [true, false]) {
        const K = VPROPS.kit(),
          F = wagen(K, offen);
        M[offen ? 'wagenAuf' : 'wagenZu'] = mesh(K, MT.paint, 'grenzland-wagen-' + (offen ? 'auf' : 'zu'));
        if (offen) {
          addCol(F.col(-1.08, 1.08, -2.9, 3.0, -1, 3), 'heute');
          addCol(F.col(1.4, 2.05, -2.7, -1.1, -1, 0.9), 'heute', 'offen');
          addCol(F.col(1.85, 2.45, 1.4, 2.1, -1, 1), 'heute', 'offen');
        }
      }
    } catch (e) {
      console.warn('grenzland orte: wagen', e);
    }
    try {
      const K = VPROPS.kit(),
        F = steg(K);
      M.steg = mesh(K, MT.paint, 'grenzland-steg');
      // the hand rail's posts and the sign need no box; the jetty's piles at its end keep one from stepping off behind the bench
      addCol(F.col(-AN.hw - 0.05, -AN.hw + 0.4, AN.sB - 2.95, AN.sB - 1.85, -1, 20), 'heute');
    } catch (e) {
      console.warn('grenzland orte: steg', e);
    }
    S.built = true;
    show();
    glow();
    for (const h of S.hooks)
      if (h.build)
        try {
          h.build();
        } catch (e) {
          console.warn('grenzland orte hook', e);
        }
    S.ms = Math.round(performance.now() - t0);
    markDirty(true);
  }
  function drop() {
    if (!S.built) return;
    for (const h of S.hooks)
      if (h.drop)
        try {
          h.drop();
        } catch (e) {
          console.warn('grenzland orte hook', e);
        }
    S.built = false;
    for (const k of Object.keys(S.meshes)) {
      const m = S.meshes[k];
      if (!m) continue;
      scene.remove(m);
      m.geometry.dispose();
      if (k === 'lampen' || k === 'glut') m.material.dispose();
      delete S.meshes[k];
    }
    for (const c of S.cols) {
      const i = VEH.extra.indexOf(c.x);
      if (i >= 0) VEH.extra.splice(i, 1);
    }
    S.cols.length = 0;
    for (const h of S.hide) {
      const i = GLFAHNDUNG.extra.indexOf(h);
      if (i >= 0) GLFAHNDUNG.extra.splice(i, 1);
    }
    S.hide.length = 0;
    S.lamp = null;
    markDirty(true);
  }
  function tick(dt) {
    if (!S.built) return;
    S.acc += dt;
    if (S.acc > 0.5) {
      S.acc = 0;
      const o = GLNLOGIK.offen(CLOCK.t),
        d = !!(VAUTO.dark && VAUTO.dark());
      if (o !== S.offen) {
        S.offen = o;
        show();
        for (const h of S.hooks) if (h.offen) h.offen(o);
      }
      if (d !== S.dark) {
        S.dark = d;
        glow();
      }
    }
    for (const h of S.hooks) if (h.tick) h.tick(dt);
  }
  const hook = h => {
    S.hooks.push(h);
    return h;
  };
  karte();
  return Object.assign(S, {
    P,
    T,
    HD,
    UV,
    BX,
    KB,
    WG,
    AN,
    BARN,
    C,
    L,
    build,
    drop,
    inScheune,
    tick,
    hook,
    kit: () => VPROPS.kit(),
    frame,
    beam,
    rolle,
    schrift,
    breite,
    tafelText,
    mesh,
    mat: mats,
    gnd,
    rnd,
    shade,
  });
})();
window.GLORTE = GLORTE;
