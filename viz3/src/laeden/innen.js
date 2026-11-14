// ===================== feat/laeden-innen 5: the shops of Schleusingen from inside – sliding doors, rooms built on approach, the walker (LINNEN) =====================
// Falko (13.11.2026 23:56): „wann kann ich alle Gebäude begehen?“ – after the houses of Ratscher the shops: every shop of laeden/laeden.js
// can be walked into. The automatic sliding doors open as one comes near while the shop is open (its hours by the game clock; inside they
// always let one out); closed they stay shut and the label at the door says so. Coming within ~45 m of a shop builds its rooms (the plans
// of laeden/innen_plan.js and the layouts of the types), going away frees them again; while they stand, the glass of the shop's fronts is
// taken away (only the frames stay) – one sees in, and from inside the world outside. Walls and fixtures stop the walker, the floor carries
// him (the floor follows the levelled ground of the car park the shop stands on). Everything inside is drawn unlit in vertex colours with
// the light baked in (the program of the Rathaus hall of welt/schleusingen.js – no program of its own): the ceiling's light rows glow,
// the shelves are evenly lit as in a shop, the same by day and by night (the exposure of the night is evened out); when the shop is
// closed, only the night light. No new point lights, no new programs: the door leaves on the parked cars' material (DMOD.mat) and the
// shop's own glass. ?noinnen leaves it all out (the shops are as V18o).
import * as THREE from 'three';
import { COARSE, QS, R, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { warmUp } from '../render/render.js';
import { toast } from '../audio/audio.js';
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { RATSCHER } from '../world/ratscher.js';
import { WELT } from '../welt/welt.js';
import { DMOD } from '../dinge/dinge_modelle.js';
import { LAEDEN } from './laeden.js';
import { LIPLAN } from './innen_plan.js';
import { LIMARKT } from './innen_markt.js';
import { LIBAU } from './innen_bau.js';
import { LIHAUS } from './innen_haus.js';
export const LINNEN = (() => {
  const S = {
    on: false,
    units: null,
    shops: new Map(),
    mounted: new Map(),
    doors: [],
    err: '',
    builds: 0,
    frees: 0,
    busy: null,
    live: 0,
    phone: false,
  };
  if (!LAEDEN.on || QS.has('noinnen') || !DMOD.on) return S;
  S.on = true;
  const { L } = LIPLAN;
  // ---- the hooks in laeden/laeden.js (marked // feat/laeden-innen): the door leaves are ours, groups tell us when they stand or go,
  // meshes we hide, the text at a door ----
  LAEDEN.ownLeaves = true;
  // a phone (or a test that asks for its budget: LINNEN.phone = true): fewer faces per shop
  const phone = () => COARSE || !!S.phone;
  LAEDEN.hidden = new Set();
  // ---- opening hours: the data's, else what such a shop usually has (OSM does not know them here) ----
  const DEFAULT_OH = {
    supermarkt: 'Mo-Sa 07:00-20:00',
    discounter: 'Mo-Sa 07:00-20:00',
    getraenke: 'Mo-Fr 09:00-19:00; Sa 08:00-16:00',
    mall: 'Mo-Sa 08:00-20:00',
    moebel: 'Mo-Fr 10:00-19:00; Sa 10:00-18:00',
    restaurant: 'Mo-Su 11:00-22:00',
    imbiss: 'Mo-Su 10:00-22:00',
    tankstelle: 'Mo-Sa 06:00-22:00; Su 07:00-22:00',
    apotheke: 'Mo-Fr 08:00-18:00; Sa 08:00-12:00',
    baecker: 'Mo-Sa 06:00-18:00',
    waesche: 'Mo-Fr 09:00-18:00',
    baumarkt: 'Mo-Sa 08:00-20:00',
  };
  const isOpenU = U => {
    if (!U.week) U.week = LAEDEN.parseOH(U.oh || DEFAULT_OH[U.type] || 'Mo-Sa 08:00-20:00');
    return !!LAEDEN.isOpen(U.week);
  };
  // ---- the unlit material of the rooms (the Rathaus hall's program: basic, vertex colours) – its colour carries the light of the moment ----
  const MATS = new Set();
  const roomMat = () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true });
    MATS.add(m);
    return m;
  };
  // the frames of the door leaves: the parked cars' material (its plain program, warmed at the start)
  const leafMat = () => DMOD.mat;

  // =============================== the room kit: vertex-coloured faces with the light baked in ===============================
  // model metres (x east, y north, z up) → three (x, z, −y); z of a plan is above the floor – the kit adds the floor of the place (zf)
  function rkit(zf) {
    let pos = new Float32Array(3 * 4096),
      col = new Float32Array(3 * 4096),
      idx = new Uint32Array(6 * 1024),
      nv = 0,
      ni = 0;
    const grow = (v, i) => {
      if ((nv + v) * 3 > pos.length) {
        let n = pos.length;
        while ((nv + v) * 3 > n) n *= 2;
        const p2 = new Float32Array(n),
          c2 = new Float32Array(n);
        p2.set(pos);
        c2.set(col);
        pos = p2;
        col = c2;
      }
      if (ni + i > idx.length) {
        let n = idx.length;
        while (ni + i > n) n *= 2;
        const i2 = new Uint32Array(n);
        i2.set(idx);
        idx = i2;
      }
    };
    const K = {
      zf,
      // a vertex: model point, the colour times k (k from the face and the height above the floor)
      v(x, y, z, c, k) {
        const o = nv * 3;
        pos[o] = x;
        pos[o + 1] = zf(x, y) + z;
        pos[o + 2] = -y;
        col[o] = c[0] * k;
        col[o + 1] = c[1] * k;
        col[o + 2] = c[2] * k;
        return nv++;
      },
      // a quad a b c d (counter-clockwise seen from the side it faces), shaded by its normal; glow: as it is
      quad(a, b, c, d, cl, glow, kk = 1) {
        grow(4, 6);
        let k = kk;
        if (!glow) {
          const ux = b[0] - a[0],
            uy = b[1] - a[1],
            uz = b[2] - a[2],
            vx = d[0] - a[0],
            vy = d[1] - a[1],
            vz = d[2] - a[2];
          let nx = uy * vz - uz * vy,
            ny = uz * vx - ux * vz,
            nz = ux * vy - uy * vx;
          const l = Math.hypot(nx, ny, nz) || 1;
          nx /= l;
          ny /= l;
          nz /= l;
          // overhead light: tops brightest, sides by their turn (a little volume), bottoms dark
          k *= nz > 0.6 ? 1.0 : nz < -0.6 ? 0.6 : 0.8 + 0.07 * nx + 0.04 * ny;
        }
        const i0 = glow ? K.v(a[0], a[1], a[2], cl, k) : K.v(a[0], a[1], a[2], cl, k * ao(a[2])),
          i1 = glow ? K.v(b[0], b[1], b[2], cl, k) : K.v(b[0], b[1], b[2], cl, k * ao(b[2])),
          i2 = glow ? K.v(c[0], c[1], c[2], cl, k) : K.v(c[0], c[1], c[2], cl, k * ao(c[2])),
          i3 = glow ? K.v(d[0], d[1], d[2], cl, k) : K.v(d[0], d[1], d[2], cl, k * ao(d[2]));
        idx[ni++] = i0;
        idx[ni++] = i1;
        idx[ni++] = i2;
        idx[ni++] = i0;
        idx[ni++] = i2;
        idx[ni++] = i3;
      },
      // a quad facing (nx, ny, nz) whatever the order of its corners
      faceN(a, b, c, d, nx, ny, nz, cl, glow, kk = 1) {
        const ux = b[0] - a[0],
          uy = b[1] - a[1],
          uz = b[2] - a[2],
          vx = d[0] - a[0],
          vy = d[1] - a[1],
          vz = d[2] - a[2],
          cx = uy * vz - uz * vy,
          cy = uz * vx - ux * vz,
          cz = ux * vy - uy * vx;
        if (cx * nx + cy * ny + cz * nz >= 0) K.quad(a, b, c, d, cl, glow, kk);
        else K.quad(a, d, c, b, cl, glow, kk);
      },
      tri(a, b, c, cl, k = 1) {
        grow(3, 3);
        idx[ni++] = K.v(a[0], a[1], a[2], cl, k);
        idx[ni++] = K.v(b[0], b[1], b[2], cl, k);
        idx[ni++] = K.v(c[0], c[1], c[2], cl, k);
      },
      // a box: centre (cx, cy), from z0 up sz, sx along rot (radians from east), sy across; bottom face only when it floats
      box(cx, cy, z0, sx, sy, sz, rot, cl, top = cl, glow = false) {
        const c = Math.cos(rot),
          s = Math.sin(rot),
          p = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, z];
        const x0 = -sx / 2,
          x1 = sx / 2,
          y0 = -sy / 2,
          y1 = sy / 2,
          z1 = z0 + sz;
        K.quad(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1), cl, glow);
        K.quad(p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), cl, glow);
        K.quad(p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), cl, glow);
        K.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), cl, glow);
        K.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), top, glow);
        if (z0 > 0.05) K.quad(p(x0, y1, z0), p(x1, y1, z0), p(x1, y0, z0), p(x0, y0, z0), cl, glow);
      },
      room: (v, i) => grow(v, i),
      // three vertex indices of one triangle (the floor's cells)
      raw(t) {
        grow(0, 3);
        idx[ni++] = t[0];
        idx[ni++] = t[1];
        idx[ni++] = t[2];
      },
      count: () => nv,
      tris: () => ni / 3,
      empty: () => !ni,
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, nv * 3), 3));
        g.setAttribute('color', new THREE.BufferAttribute(col.slice(0, nv * 3), 3));
        g.setIndex(new THREE.BufferAttribute(nv > 65535 ? idx.slice(0, ni) : Uint16Array.from(idx.subarray(0, ni)), 1));
        g.computeBoundingSphere();
        return g;
      },
    };
    return K;
  }
  // darker near the floor (the light comes from the ceiling)
  const ao = z => (z >= 1.2 ? 1 : 0.74 + 0.26 * (z / 1.2) * (2 - z / 1.2));

  // =============================== text as vertex-coloured rectangles (read by night as by day, no texture) ===============================
  const FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
  const TEXTS = new Map();
  let CV = null;
  // the letters of a few lines as rectangles in a w × h sign (metres, origin at the lower left), boldness by style
  function textRects(lines, w, h) {
    const key = lines.join('\n') + '|' + w.toFixed(2) + '|' + h.toFixed(2);
    if (TEXTS.has(key)) return TEXTS.get(key);
    const PXM = Math.min(160, Math.max(48, 64 / Math.max(0.2, h / Math.max(1, lines.length)))), // pixels per metre: ~64 px per line
      W = Math.max(8, Math.min(1024, Math.round(w * PXM))),
      H = Math.max(8, Math.min(512, Math.round(h * PXM)));
    if (!CV) CV = document.createElement('canvas');
    CV.width = W;
    CV.height = H;
    const g = CV.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    g.textBaseline = 'alphabetic';
    const n = lines.length,
      lh = (H * 0.86) / n;
    lines.forEach((t, i) => {
      let fs = Math.round(lh * 0.78);
      for (let k = 0; k < 8; k++) {
        g.font = `${i === 0 ? 'bold ' : ''}${fs}px ${FONT}`;
        const m = g.measureText(t);
        const wd = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width);
        if (wd <= W * 0.9 || fs < 8) break;
        fs = Math.floor((fs * W * 0.9) / wd);
      }
      g.font = `${i === 0 ? 'bold ' : ''}${fs}px ${FONT}`;
      const m = g.measureText(t),
        l = m.actualBoundingBoxLeft || 0,
        r = m.actualBoundingBoxRight || m.width,
        a = m.actualBoundingBoxAscent || fs * 0.75,
        d = m.actualBoundingBoxDescent || fs * 0.2,
        cy = H * 0.07 + lh * (i + 0.5);
      g.fillText(t, W / 2 - (l + r) / 2 + l, cy + (a - d) / 2);
    });
    const px = g.getImageData(0, 0, W, H).data,
      on = (x, y) => px[(y * W + x) * 4] > 110;
    // runs per row, merged downwards while the next row has the same run
    const rects = [],
      open = new Map(); // "x0,x1" → rect (in pixels)
    for (let y = 0; y < H; y++) {
      const runs = [];
      for (let x = 0; x < W;) {
        if (!on(x, y)) {
          x++;
          continue;
        }
        let x1 = x;
        while (x1 < W && on(x1, y)) x1++;
        runs.push([x, x1]);
        x = x1;
      }
      const seen = new Set();
      for (const [x0, x1] of runs) {
        const k = x0 + ',' + x1,
          r = open.get(k);
        if (r) {
          r[3] = y + 1;
          seen.add(k);
        } else {
          const nr = [x0, y, x1, y + 1];
          rects.push(nr);
          open.set(k, nr);
          seen.add(k);
        }
      }
      for (const k of [...open.keys()]) if (!seen.has(k)) open.delete(k);
    }
    // pixels → metres (y up from the lower edge)
    const out = rects.map(([x0, y0, x1, y1]) => [(x0 / W) * w, (1 - y1 / H) * h, (x1 / W) * w, (1 - y0 / H) * h]);
    if (TEXTS.size > 600) TEXTS.clear();
    TEXTS.set(key, out);
    return out;
  }
  // sign styles: [board, letters]
  const SIGN = [
    [L(0.16, 0.17, 0.18), [1.6, 1.6, 1.58]], // white letters on anthracite (they glow a little: lit boards)
    [L(0.92, 0.92, 0.9), L(0.12, 0.12, 0.13)], // anthracite on white
    [L(0.24, 0.25, 0.27), [1.5, 1.5, 1.45]], // a checkout's number
    [L(0.9, 0.9, 0.86), L(0.2, 0.22, 0.24)], // small plates
  ];
  function sign(K, s) {
    const [bg, fg] = SIGN[s.st] || SIGN[0],
      tx = -s.ny,
      ty = s.nx,
      th = 0.04, // the board's thickness
      rot = Math.atan2(ty, tx);
    K.box(s.x - s.nx * (th / 2), s.y - s.ny * (th / 2), s.z, s.w + 0.06, th, s.h + 0.06, rot, bg);
    const rects = textRects(s.t, s.w, s.h);
    for (const side of s.two ? [1, -1] : [1]) {
      // the face: in front of the board on its side; seen from behind the text runs the other way
      const nx = s.nx * side,
        ny = s.ny * side,
        ux = tx * side,
        uy = ty * side,
        o = side > 0 ? 0.003 : th + 0.003;
      const cx = s.x + nx * o - (side > 0 ? 0 : 0),
        cy = s.y + ny * o;
      for (const [a0, b0, a1, b1] of rects) {
        const u0 = a0 - s.w / 2,
          u1 = a1 - s.w / 2,
          P0 = [cx + ux * u0, cy + uy * u0],
          P1 = [cx + ux * u1, cy + uy * u1];
        K.quad(
          [P0[0], P0[1], s.z + b0 + 0.03],
          [P1[0], P1[1], s.z + b0 + 0.03],
          [P1[0], P1[1], s.z + b1 + 0.03],
          [P0[0], P0[1], s.z + b1 + 0.03],
          fg,
          true
        );
      }
    }
    // a hanging sign: two thin wires up to the ceiling
    if (s.two && s.hang)
      for (const e of [-1, 1])
        K.box(
          s.x + tx * e * s.w * 0.4,
          s.y + ty * e * s.w * 0.4,
          s.z + s.h + 0.03,
          0.01,
          0.01,
          s.hang,
          0,
          L(0.3, 0.3, 0.3)
        );
  }

  // =============================== goods: blocks of products, each a front, a top, a label band ===============================
  function goods(K, gd, R) {
    // on a phone one front for a block of the same product (its label band and top stay, its ends go); bottles and crates keep theirs
    const ph = phone(),
      n0 = Math.max(1, gd.n | 0),
      n = ph && gd.k !== 'bottle' && gd.k !== 'crate' ? 1 : n0,
      w = gd.len / n,
      gap = Math.min(0.01, w * 0.08),
      fx = gd.fx,
      fy = gd.fy,
      ax = gd.ax,
      ay = gd.ay,
      fr = gd.dep / 2,
      z0 = gd.z,
      h = gd.h,
      c = gd.col;
    const lighter = [Math.min(1, c[0] * 0.5 + 0.45), Math.min(1, c[1] * 0.5 + 0.45), Math.min(1, c[2] * 0.5 + 0.45)],
      darker = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
    // a point of the block: along a, out of the front f, up z
    const pt = (a, f, z) => [gd.x + ax * a + fx * f, gd.y + ay * a + fy * f, z];
    // the faces oriented: a front towards f, a top up
    const face = (a0, a1, f, za, zb, cl, kk) =>
      K.faceN(pt(a0, f, za), pt(a1, f, za), pt(a1, f, zb), pt(a0, f, zb), fx, fy, 0, cl, false, kk);
    const top = (a0, a1, f0, f1, z, cl, kk) =>
      K.faceN(pt(a0, f0, z), pt(a1, f0, z), pt(a1, f1, z), pt(a0, f1, z), 0, 0, 1, cl, false, kk);
    if (gd.k === 'heap') {
      // fruit in a crate: a heap in two layers, the colour varied
      top(-gd.len / 2, gd.len / 2, -fr, fr, z0 + h * 0.6, c, 0.95);
      top(-gd.len * 0.32, gd.len * 0.32, -fr * 0.6, fr * 0.6, z0 + h, c, 1.05);
      // the heap's four slopes (and its sides down to the crate)
      for (const s2 of [1, -1]) {
        const f = fr * s2,
          a = (gd.len / 2) * s2,
          zm = z0 + h * 0.6;
        K.faceN(
          pt(-gd.len / 2, f, zm),
          pt(gd.len / 2, f, zm),
          pt(gd.len * 0.32, f * 0.6, z0 + h),
          pt(-gd.len * 0.32, f * 0.6, z0 + h),
          fx * s2,
          fy * s2,
          0.6,
          c,
          false,
          s2 > 0 ? 0.9 : 0.85
        );
        K.faceN(
          pt(-gd.len / 2, f, z0),
          pt(gd.len / 2, f, z0),
          pt(gd.len / 2, f, zm),
          pt(-gd.len / 2, f, zm),
          fx * s2,
          fy * s2,
          0,
          c,
          false,
          0.82
        );
        K.faceN(
          pt(a, -fr, zm),
          pt(a, fr, zm),
          pt(a * 0.64, fr * 0.6, z0 + h),
          pt(a * 0.64, -fr * 0.6, z0 + h),
          ax * s2,
          ay * s2,
          0.6,
          c,
          false,
          0.88
        );
        K.faceN(pt(a, -fr, z0), pt(a, fr, z0), pt(a, fr, zm), pt(a, -fr, zm), ax * s2, ay * s2, 0, c, false, 0.8);
      }
      return;
    }
    // per product only what tells them apart (the front, a bottle's neck and cap); what lines up over the whole block once (the
    // label band, the top) – the same product side by side
    const A = -gd.len / 2 + gap / 2,
      B = gd.len / 2 - gap / 2;
    for (let i = 0; i < n; i++) {
      const a0 = -gd.len / 2 + i * w + gap / 2,
        a1 = a0 + w - gap,
        jit = 0.93 + (((i * 7 + gd.x * 13) | 0) % 5) * 0.035;
      if (gd.k === 'bottle') {
        const nk = (a1 - a0) * 0.3,
          am = (a0 + a1) / 2;
        face(a0, a1, fr, z0, z0 + h * 0.62, c, jit);
        if (ph)
          face(am - nk, am + nk, fr - (a1 - a0) * 0.3, z0 + h * 0.62, z0 + h, darker, 1); // neck and cap in one
        else {
          face(am - nk, am + nk, fr - (a1 - a0) * 0.3, z0 + h * 0.62, z0 + h * 0.92, c, jit * 0.95);
          face(am - nk * 1.1, am + nk * 1.1, fr - (a1 - a0) * 0.3 + 0.001, z0 + h * 0.92, z0 + h, darker, 1);
        }
      } else if (gd.k === 'jar') {
        face(a0, a1, fr, z0, z0 + h * 0.8, c, jit);
        face(a0 + 0.004, a1 - 0.004, fr - 0.004, z0 + h * 0.8, z0 + h, darker, 1);
      } else if (gd.k === 'bag') {
        face(a0, a1, fr, z0, z0 + h * 0.86, c, jit);
        face(a0 + 0.004, a1 - 0.004, fr - 0.01, z0 + h * 0.86, z0 + h, darker, 1);
      } else if (gd.k === 'loaf') {
        face(a0, a1, fr, z0, z0 + h * 0.65, c, jit);
        face(a0 + 0.02, a1 - 0.02, fr - 0.02, z0 + h * 0.65, z0 + h, c, jit * 1.05);
        top(a0 + 0.02, a1 - 0.02, -fr + 0.02, fr - 0.02, z0 + h, c, 1.08);
      } else if (gd.k === 'crate') {
        face(a0, a1, fr, z0, z0 + h, c, jit);
        face(a0 + (a1 - a0) * 0.3, a1 - (a1 - a0) * 0.3, fr + 0.001, z0 + h * 0.72, z0 + h * 0.86, darker, 1); // the handle
        // the bottle caps on top in rows
        for (let q = 0; q < 3; q++)
          for (let r2 = 0; r2 < 4; r2++) {
            const ca = a0 + ((a1 - a0) * (q + 0.5)) / 3,
              cf = -fr + (2 * fr * (r2 + 0.5)) / 4;
            top(ca - 0.018, ca + 0.018, cf - 0.018, cf + 0.018, z0 + h + 0.02, L(0.75, 0.72, 0.6), 1);
          }
      } else face(a0, a1, fr, z0, z0 + h, c, jit); // box, pack, can
    }
    if (gd.k === 'bottle') {
      face(A + w * 0.12, B - w * 0.12, fr + 0.002, z0 + h * 0.22, z0 + h * 0.45, lighter, 1);
      top(A, B, -fr, fr, z0 + h * 0.62, c, 0.9);
    } else if (gd.k === 'can') {
      if (!ph) {
        face(A, B, fr + 0.001, z0 + h * 0.86, z0 + h * 0.93, lighter, 1);
        face(A, B, fr + 0.001, z0 + h * 0.05, z0 + h * 0.1, darker, 1);
      }
      top(A, B, -fr, fr, z0 + h, L(0.7, 0.7, 0.72), 1);
    } else if (gd.k === 'jar') {
      face(A, B, fr + 0.001, z0 + h * 0.3, z0 + h * 0.55, lighter, 1);
      top(A, B, -fr, fr, z0 + h, darker, 1);
    } else if (gd.k === 'bag') {
      face(A, B, fr + 0.001, z0 + h * 0.35, z0 + h * 0.6, lighter, 1);
      top(A, B, -fr * 0.6, fr, z0 + h * 0.86, c, 0.9);
    } else if (gd.k === 'crate') top(A, B, -fr, fr, z0 + h, darker, 1);
    else if (gd.k !== 'loaf') {
      face(A, B, fr + 0.001, z0 + h * 0.4, z0 + h * 0.68, lighter, 1);
      top(A, B, -fr, fr, z0 + h, c, 0.95);
    }
    // the block's two ends (seen at the end of a run)
    const sx = (a, zt) => {
      const s2 = a < 0 ? -1 : 1;
      K.faceN(
        pt(a, -fr, z0),
        pt(a, fr, z0),
        pt(a, fr, z0 + zt),
        pt(a, -fr, z0 + zt),
        ax * s2,
        ay * s2,
        0,
        c,
        false,
        0.85
      );
    };
    const zt = gd.k === 'bottle' ? h * 0.62 : gd.k === 'bag' ? h * 0.86 : h;
    if (!ph) {
      sx(-gd.len / 2 + gap / 2, zt);
      sx(gd.len / 2 - gap / 2, zt);
    }
    void R;
  }

  // =============================== floors, ceilings, walls of a unit ===============================
  // the floor of a volume in cells of `cell` m (each cell its own shade: tiles), darker where fixtures stand close (a raster of what
  // stands on the floor, blurred)
  function floorOf(K, f, colA, colB, cell, occ) {
    const bb = LIPLAN.bbOf(f);
    for (let x = Math.floor(bb[0] / cell) * cell; x < bb[2]; x += cell)
      for (let y = Math.floor(bb[1] / cell) * cell; y < bb[3]; y += cell) {
        let g = f;
        g = LIPLAN.clipHalf(g, -1, 0, -x);
        if (g.length) g = LIPLAN.clipHalf(g, 1, 0, x + cell);
        if (g.length) g = LIPLAN.clipHalf(g, 0, -1, -y);
        if (g.length) g = LIPLAN.clipHalf(g, 0, 1, y + cell);
        if (g.length < 6 || Math.abs(LIPLAN.area(g)) < 1e-3) continue;
        const i = Math.round(x / cell),
          j = Math.round(y / cell),
          c = (i + j) % 2 ? colA : colB;
        const pts = LIPLAN.ring(g);
        // a fan (a cell cut from a polygon is convex unless the polygon has a notch inside it – then triangulated)
        const convex = pts.length <= 4 || isConvex(pts);
        const tris = convex
          ? pts.slice(1, -1).map((p, k) => [0, k + 1, k + 2])
          : THREE.ShapeUtils.triangulateShape(
              pts.map(p => new THREE.Vector2(p[0], p[1])),
              []
            );
        for (const [a, b, d] of tris) {
          const A = pts[a],
            B = pts[b],
            D = pts[d],
            up = (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]) > 0,
            kA = occ ? occ(A[0], A[1]) : 1,
            kB = occ ? occ(B[0], B[1]) : 1,
            kD = occ ? occ(D[0], D[1]) : 1;
          K.room(3, 3);
          const ia = K.v(A[0], A[1], 0.004, c, kA),
            ib = K.v(B[0], B[1], 0.004, c, kB),
            id = K.v(D[0], D[1], 0.004, c, kD);
          K.raw(up ? [ia, ib, id] : [ia, id, ib]);
        }
      }
  }
  function isConvex(pts) {
    let sg = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length],
        c = pts[(i + 2) % pts.length],
        cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) < 1e-9) continue;
      if (!sg) sg = Math.sign(cr);
      else if (Math.sign(cr) !== sg) return false;
    }
    return true;
  }
  // the ceiling of a volume (facing down)
  function ceilingOf(K, f, z, cl) {
    const pts = LIPLAN.ring(f),
      tris = THREE.ShapeUtils.triangulateShape(
        pts.map(p => new THREE.Vector2(p[0], p[1])),
        []
      );
    for (const [a, b, d] of tris) {
      const A = pts[a],
        B = pts[b],
        D = pts[d],
        up = (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]) > 0;
      if (up) K.tri([A[0], A[1], z], [D[0], D[1], z], [B[0], B[1], z], cl, 0.78);
      else K.tri([A[0], A[1], z], [B[0], B[1], z], [D[0], D[1], z], cl, 0.78);
    }
  }
  // the walls facing in: the runs of LIPLAN.walls (open between the unit's own volumes, holes for the glazed fronts), from the floor to
  // the section's ceiling; a dark skirting, the reveal at each hole; a header where two volumes of different height meet
  function wallsOf(K, runs, hOf, colW, colS) {
    for (const r of runs) {
      const H = hOf(r.vol),
        n = r.n,
        o = 0.012, // just inside the outline
        P_ = (t, z) => [r.a[0] + r.ux * t + n[0] * o, r.a[1] + r.uy * t + n[1] * o, z];
      const quadW = (t0, t1, z0, z1, cl, kk) => K.quad(P_(t1, z0), P_(t0, z0), P_(t0, z1), P_(t1, z1), cl, false, kk);
      for (const [t0, t1] of LIPLAN.rest(r.L, r.open)) {
        // the holes on this piece, sorted
        const hs = r.holes.filter(h => h.u1 > t0 && h.u0 < t1).sort((p, q) => p.u0 - q.u0);
        let t = t0;
        for (const h of hs) {
          const h0 = Math.max(t0, h.u0),
            h1 = Math.min(t1, h.u1),
            zt = Math.min(H, h.z1);
          if (h0 > t + 0.01) {
            quadW(t, h0, 0.12, H, colW, 1);
            quadW(t, h0, 0, 0.12, colS, 1);
          }
          if (zt < H - 0.01) quadW(h0, h1, zt, H, colW, 1); // above the glass
          if (h.z0 > 0.01) quadW(h0, h1, 0, Math.min(h.z0, H), colS, 1); // a plinth under it
          // the reveals: the wall's thickness at the hole's sides and its head
          for (const [tt, s] of [
            [h0, 1],
            [h1, -1],
          ]) {
            const A = P_(tt, 0),
              B = [A[0] + n[0] * 0.25, A[1] + n[1] * 0.25];
            if (s > 0) K.quad([A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], zt], [A[0], A[1], zt], colW, false, 0.9);
            else K.quad([B[0], B[1], 0], [A[0], A[1], 0], [A[0], A[1], zt], [B[0], B[1], zt], colW, false, 0.9);
          }
          const A0 = P_(h0, zt),
            A1 = P_(h1, zt);
          K.quad(
            [A1[0], A1[1], zt],
            [A0[0], A0[1], zt],
            [A0[0] + n[0] * 0.25, A0[1] + n[1] * 0.25, zt],
            [A1[0] + n[0] * 0.25, A1[1] + n[1] * 0.25, zt],
            colW,
            false,
            0.7
          );
          t = h1;
        }
        if (t1 > t + 0.01) {
          quadW(t, t1, 0.12, H, colW, 1);
          quadW(t, t1, 0, 0.12, colS, 1);
        }
      }
      // a header over an opening to a lower neighbour (the ceiling steps)
      for (const [t0, t1] of r.open) {
        const Hn = r.hn ? r.hn(t0, t1) : H;
        if (Hn < H - 0.05) quadW(t0, t1, Hn, H, colW, 0.95);
      }
    }
  }

  // =============================== a unit's plan → meshes per section ===============================
  const LAYOUT = {
    supermarkt: LIMARKT.markt,
    discounter: LIMARKT.markt,
    baumarkt: LIBAU.baumarkt,
    ...LIHAUS.LAY,
  };
  // the floor of a shop: the levelled ground's plane through its main door (the pad of laeden.js), lifted where the drawn ground is higher
  function floorFn(sh, g) {
    const md = sh.doors.find(d => d.k === 'main') || sh.doors[0],
      dx = md.x + md.nx * 0.5,
      dy = md.y + md.ny * 0.5;
    let plane = null;
    for (const p of (g && g.padsW) || [])
      if (LIPLAN.inPoly(p.poly, dx, dy) && p.fit && p.fit.at) {
        plane = p.fit.at;
        break;
      }
    const z0 = plane ? plane(dx, dy) : sh.zF,
      zF = sh.zF;
    return plane ? (x, y) => zF + (plane(x, y) - z0) : () => zF;
  }
  // build the rooms of one shop (all its units): sections → meshes; collision segments; the floor for the walker
  // a shop's rooms are built one unit per round (the Mega Center has five: no long stall), then finished: the walls' hash, the cart
  function begin(M) {
    M.zf = floorFn(M.sh, M.g);
    M.meshes = [];
    M.segs = [];
    M.units = [];
    M.tris = 0;
    M.ms = 0;
    M.fronts = frontsOf(M.sh);
    M.todo = (S.shops.get(M.sh.id) || []).slice();
    M.state = 'building';
  }
  function buildUnit(M, U) {
    const t0 = performance.now(),
      sh = M.sh,
      zf = M.zf,
      fronts = M.fronts;
    {
      const lay = LAYOUT[U.type];
      const P0 = LIPLAN.newPlan(U);
      let Pl = null;
      try {
        Pl = lay ? lay(P0, U) : bare(P0, U);
      } catch (e) {
        console.warn('laeden-innen plan', U.id, e);
        S.err = U.id + ': ' + e;
        Pl = bare(LIPLAN.newPlan(U), U);
      }
      const secs = Pl.secs.length
        ? Pl.secs
        : [{ id: 0, vols: U.vols.map((v, i) => i), h: Math.min(4.2, U.vols[0].h - 1.5) }];
      const hOf = vi => {
        const s2 = secs.find(q => (q.vols || []).includes(vi));
        return s2 ? s2.h : secs[0].h;
      };
      // the walls of the unit (with the glazed fronts of its shop as holes)
      const runs = LIPLAN.walls(U, fronts.concat(Pl.holes || []));
      for (const r of runs)
        r.hn = (a, b) => {
          // the lower ceiling of the volume on the other side of an opening
          const mx = r.a[0] + r.ux * ((a + b) / 2) - r.n[0] * 0.4,
            my = r.a[1] + r.uy * ((a + b) / 2) - r.n[1] * 0.4;
          const vi = U.vols.findIndex(v => LIPLAN.inPoly(v.f, mx, my));
          return vi >= 0 ? hOf(vi) : hOf(r.vol);
        };
      // fixtures by section
      const bySec = new Map();
      const kOf = id => {
        if (!bySec.has(id)) bySec.set(id, rkit(zf));
        return bySec.get(id);
      };
      // fixtures standing on the floor: a raster for the floor's shade
      const occ = floorShade(Pl);
      for (const s2 of secs) {
        const K = kOf(s2.id);
        for (const vi of s2.vols || []) {
          const v = U.vols[vi];
          if (!v) continue;
          const fc = Pl.floor || LIMARKT.C;
          floorOf(K, v.f, fc.floorA, fc.floorB, Pl.cell || 1.2, occ);
          if (!(Pl.noCeil || []).includes(vi)) ceilingOf(K, v.f, s2.h, Pl.ceilCol || LIMARKT.C.ceil);
        }
      }
      // walls go to the section of their volume
      const wallCol = Pl.wallCol || LIMARKT.C.wall,
        skirt = Pl.skirtCol || LIMARKT.C.skirt;
      for (const s2 of secs) {
        const rs = runs.filter(r => (s2.vols || []).includes(r.vol) && !(Pl.noWall || []).includes(r.vol));
        if (rs.length) wallsOf(kOf(s2.id), rs, hOf, wallCol, skirt);
      }
      // the seams between two volumes of the unit (their outlines often stand a few decimetres apart): the floor, the ceiling and the
      // jambs at the ends across the gap – drawn once, from the volume with the lower index
      const fc0 = Pl.floor || LIMARKT.C,
        ceil0 = Pl.ceilCol || LIMARKT.C.ceil;
      for (const r of runs)
        for (const [t0, t1] of r.open) {
          if (t1 - t0 < 0.3) continue;
          const gapAt = t => {
            const bx = r.a[0] + r.ux * t,
              by = r.a[1] + r.uy * t;
            for (let g = 0; g <= 0.7; g += 0.02) {
              const k = U.vols.findIndex((v, i) => i !== r.vol && LIPLAN.inPoly(v.f, bx - r.n[0] * g, by - r.n[1] * g));
              if (k >= 0) return { g, k };
            }
            return null;
          };
          const A = gapAt(t0 + 0.05),
            B2 = gapAt(t1 - 0.05);
          if (!A || !B2 || A.k < r.vol) continue;
          const g0 = A.g + 0.02,
            g1 = B2.g + 0.02;
          if (Math.max(g0, g1) < 0.06) continue;
          const K = kOf((secs.find(q => (q.vols || []).includes(r.vol)) || secs[0]).id),
            Hs = Math.min(hOf(r.vol), hOf(A.k)),
            E = (t, g, z) => [r.a[0] + r.ux * t - r.n[0] * g, r.a[1] + r.uy * t - r.n[1] * g, z];
          K.faceN(
            E(t0, 0, -0.003),
            E(t1, 0, -0.003),
            E(t1, g1, -0.003),
            E(t0, g0, -0.003),
            0,
            0,
            1,
            fc0.floorA,
            false,
            1
          );
          K.faceN(
            E(t0, 0, Hs + 0.003),
            E(t1, 0, Hs + 0.003),
            E(t1, g1, Hs + 0.003),
            E(t0, g0, Hs + 0.003),
            0,
            0,
            -1,
            ceil0,
            false,
            0.78
          );
          K.faceN(E(t0, 0, 0), E(t0, g0, 0), E(t0, g0, Hs), E(t0, 0, Hs), r.ux, r.uy, 0, wallCol, false, 0.9);
          K.faceN(E(t1, 0, 0), E(t1, g1, 0), E(t1, g1, Hs), E(t1, 0, Hs), -r.ux, -r.uy, 0, wallCol, false, 0.9);
        }
      // (on a phone without the smallest parts: price tags and the like)
      const ph = phone();
      for (const b of Pl.boxes)
        if (!ph || (!b.opt && (b.sx * b.sy * b.sz > 2e-4 || Math.max(b.sx, b.sy, b.sz) > 0.12)))
          kOf(b.sec).box(b.x, b.y, b.z, b.sx, b.sy, b.sz, b.rot, b.col, b.top, !!b.glow);
      const R = LIPLAN.rnd(LIPLAN.hash(U.id));
      for (const gd of Pl.goods) goods(kOf(gd.sec), gd, R);
      for (const s2 of Pl.signs) {
        const sc = secs.find(q => q.id === s2.sec) || secs[0];
        if (s2.two) s2.hang = Math.max(0, sc.h - (s2.z + s2.h + 0.03));
        sign(kOf(s2.sec), s2);
      }
      // the light strips, each kept inside its section (0.4 m from its walls: a strip over a lower neighbour would show outside)
      for (const l of Pl.lights) {
        const sc = secs.find(q => q.id === l.sec) || secs[0],
          fs = (sc.vols || []).map(vi => U.vols[vi] && U.vols[vi].f).filter(Boolean),
          dx = Math.cos(l.rot + Math.PI / 2),
          dy = Math.sin(l.rot + Math.PI / 2),
          ok = t => {
            const x = l.x + dx * t,
              y = l.y + dy * t;
            return fs.some(f => LIPLAN.inPoly(f, x, y) && LIPLAN.edgeDist(f, x, y) > 0.4);
          };
        let best = null,
          run = null;
        for (let t = -l.l / 2; t <= l.l / 2 + 1e-6; t += Math.min(0.25, l.l / 2)) {
          if (ok(t)) {
            run = run ? [run[0], t] : [t, t];
            if (!best || run[1] - run[0] > best[1] - best[0]) best = run.slice();
          } else run = null;
        }
        if (!best || best[1] - best[0] < Math.min(0.5, l.l * 0.9)) continue;
        const tm = (best[0] + best[1]) / 2,
          ln = best[1] - best[0] || l.l;
        kOf(l.sec).box(
          l.x + dx * tm,
          l.y + dy * tm,
          l.z - 0.05,
          ln,
          l.w,
          0.05,
          l.rot + Math.PI / 2,
          LIMARKT.C.lamp,
          LIMARKT.C.lamp,
          true
        );
      }
      // one trolley of the store stands on its own (it can be pushed): the one standing alone, else the last of a row
      const alone =
        Pl.trolleys.find((t, i) => !Pl.trolleys.some((q, j) => j !== i && Math.hypot(q.x - t.x, q.y - t.y) < 0.5)) ||
        Pl.trolleys[Pl.trolleys.length - 1];
      for (const t of Pl.trolleys) if (t !== alone || M.cart) trolley(kOf(t.sec), t);
      if (alone && !M.cart) M.cart = { x: alone.x, y: alone.y, rot: alone.rot, U, push: false };
      // the sections' neighbours: across the open pieces of the walls (two parts of one store)
      const secOf = vi => {
        const s3 = secs.find(q => (q.vols || []).includes(vi));
        return s3 ? s3.id : secs[0].id;
      };
      const nb = new Map(secs.map(q => [q.id, new Set([q.id])]));
      for (const r of runs)
        for (const [a, b] of r.open) {
          const t = (a + b) / 2,
            mx = r.a[0] + r.ux * t - r.n[0] * 0.4,
            my = r.a[1] + r.uy * t - r.n[1] * 0.4,
            vj = U.vols.findIndex(v => LIPLAN.inPoly(v.f, mx, my));
          if (vj < 0) continue;
          const p1 = secOf(r.vol),
            p2 = secOf(vj);
          if (nb.has(p1) && nb.has(p2)) {
            nb.get(p1).add(p2);
            nb.get(p2).add(p1);
          }
        }
      // the sections with a door (seen from outside)
      const doorSecs = new Set();
      for (const d of U.doors) {
        const vi = U.vols.findIndex(v => LIPLAN.inPoly(v.f, d.x - d.nx * 0.8, d.y - d.ny * 0.8));
        if (vi >= 0) doorSecs.add(secOf(vi));
      }
      // meshes
      const mat = M.mat;
      for (const [id, K] of bySec) {
        if (K.empty()) continue;
        const me = new THREE.Mesh(K.geo(), mat);
        me.userData.sec = id;
        me.userData.unit = U.id;
        S.live++;
        me.name = 'laeden-innen ' + U.id + ' ' + id;
        me.userData.noMerge = true;
        me.castShadow = false;
        me.receiveShadow = false;
        me.matrixAutoUpdate = false;
        me.updateMatrix();
        scene.add(me);
        M.meshes.push(me);
        M.tris += K.tris();
      }
      // collision: the walls (no wall where the doors are, the glass of the fronts stops) and the fixtures
      const segs = wallSegs(U, runs, sh);
      M.segs.push(...segs, ...Pl.segs);
      M.units.push({
        U,
        plan: {
          boxes: Pl.boxes.length,
          goods: Pl.goods.length,
          signs: Pl.signs.length,
          lights: Pl.lights.length,
          segs: Pl.segs.length,
          spots: Pl.spots,
        },
        secs,
        secOf,
        nb,
        doorSecs,
      });
    }
    M.ms += performance.now() - t0;
  }
  function finish(M) {
    const t0 = performance.now(),
      sh = M.sh;
    if (M.cart) cartMesh(M);
    // the hash of the segments (4 m cells)
    M.grid = new Map();
    M.segs.forEach((s2, k) => {
      for (let i = Math.floor(Math.min(s2[0], s2[2]) / 4); i <= Math.floor(Math.max(s2[0], s2[2]) / 4); i++)
        for (let j = Math.floor(Math.min(s2[1], s2[3]) / 4); j <= Math.floor(Math.max(s2[1], s2[3]) / 4); j++) {
          const key = i + ',' + j;
          let a = M.grid.get(key);
          if (!a) M.grid.set(key, (a = []));
          a.push(k);
        }
    });
    M.bb = bbOfShop(sh);
    M.ms = Math.round(M.ms + performance.now() - t0);
    M.state = 'ready';
    markDirty(true);
  }
  // a unit without a layout yet: floor, walls, ceiling, lights
  function bare(Pp, U) {
    Pp.secs.push({ id: 0, vols: U.vols.map((v, i) => i), h: Math.min(4.2, Math.max(2.6, U.vols[0].h - 1.4)) });
    for (const v of U.vols) {
      const bb = LIPLAN.bbOf(v.f);
      for (let x = bb[0] + 2; x < bb[2] - 1; x += 4)
        for (let y = bb[1] + 2; y < bb[3] - 1; y += 4)
          if (LIPLAN.inPoly(v.f, x, y) && LIPLAN.edgeDist(v.f, x, y) > 1)
            Pp.lights.push({ x, y, z: Pp.secs[0].h, w: 0.3, l: 1.2, rot: 0, sec: 0 });
    }
    return Pp;
  }
  // a trolley (standing): a wire basket (its edges and some wires), the tray below, the chassis, four castors, the handle at the back
  function trolley(K, t) {
    const c = Math.cos(t.rot),
      s = Math.sin(t.rot),
      W = (a, b) => [t.x + a * c - b * s, t.y + a * s + b * c],
      M2 = L(0.7, 0.71, 0.73),
      D2 = L(0.16, 0.16, 0.18),
      HD = L(0.32, 0.34, 0.37);
    const bar = (a0, b0, z0, a1, b1, z1, w = 0.018, cl = M2) => {
      // a thin bar between two points (local a along the trolley, b across, z up)
      const [x0, y0] = W(a0, b0),
        [x1, y1] = W(a1, b1),
        L2 = Math.hypot(x1 - x0, y1 - y0);
      if (L2 < 1e-3) K.box(x0, y0, Math.min(z0, z1), w, w, Math.abs(z1 - z0), t.rot, cl);
      else if (Math.abs(z1 - z0) < 1e-3)
        K.box((x0 + x1) / 2, (y0 + y1) / 2, z0 - w / 2, L2, w, w, Math.atan2(y1 - y0, x1 - x0), cl);
      else {
        // a slanted bar: a few short pieces
        const n = 4;
        for (let i = 0; i < n; i++) {
          const k0 = i / n,
            k1 = (i + 1) / n,
            xa = x0 + (x1 - x0) * k0,
            ya = y0 + (y1 - y0) * k0,
            xb = x0 + (x1 - x0) * k1,
            yb = y0 + (y1 - y0) * k1;
          K.box(
            (xa + xb) / 2,
            (ya + yb) / 2,
            z0 + (z1 - z0) * k0,
            Math.max(w, Math.hypot(xb - xa, yb - ya)),
            w,
            Math.max(w, (z1 - z0) / n),
            Math.atan2(yb - ya, xb - xa),
            cl
          );
        }
      }
    };
    // the basket: back (a = −0.4) 0.56 wide, front (a = 0.45) 0.46 wide, from 0.48 to 0.98
    const A0 = -0.4,
      A1 = 0.45,
      zb = 0.48,
      zt = 0.98;
    for (const [z, hb0, hb1] of [
      [zt, 0.28, 0.25],
      [zb, 0.24, 0.21],
    ]) {
      bar(A0, -hb0, z, A1, -hb1, z);
      bar(A0, hb0, z, A1, hb1, z);
      bar(A0, -hb0, z, A0, hb0, z);
      bar(A1, -hb1, z, A1, hb1, z);
    }
    for (const sg of [-1, 1]) {
      for (let k = 0; k <= 5; k++) {
        const a = A0 + ((A1 - A0) * k) / 5;
        bar(a, sg * (0.24 - 0.03 * (k / 5)), zb, a, sg * (0.28 - 0.03 * (k / 5)), zt, 0.012);
      }
      bar(A1, sg * 0.23, zb, A1, sg * 0.25, zt, 0.012);
    }
    for (let k = 1; k < 4; k++) bar(A1, -0.25 + k * 0.125, zb, A1, -0.25 + k * 0.125, zt, 0.012);
    const [bx, by] = W((A0 + A1) / 2, 0);
    K.box(bx, by, zb - 0.01, A1 - A0, 0.42, 0.012, t.rot, M2); // its floor
    // the tray below, the chassis, the castors
    const [tx, ty] = W(0.05, 0);
    K.box(tx, ty, 0.16, 0.7, 0.4, 0.012, t.rot, M2);
    for (const sg of [-1, 1]) {
      bar(-0.42, sg * 0.24, 0.12, 0.42, sg * 0.2, 0.12, 0.025);
      bar(-0.42, sg * 0.24, 0.12, -0.42, sg * 0.26, zb, 0.025);
    }
    for (const [a, b] of [
      [-0.38, -0.23],
      [-0.38, 0.23],
      [0.38, -0.19],
      [0.38, 0.19],
    ]) {
      const [x, y] = W(a, b);
      K.box(x, y, 0.0, 0.09, 0.03, 0.1, t.rot, D2);
    }
    // the handle
    bar(-0.5, -0.27, 1.02, -0.5, 0.27, 1.02, 0.035, HD);
    for (const sg of [-1, 1]) bar(-0.4, sg * 0.27, zt, -0.5, sg * 0.27, 1.02, 0.02);
  }
  // the shade of the floor: what stands on it (a raster of 0.5 m, its covered share within ~1 m)
  function floorShade(Pl) {
    const items = Pl.boxes.filter(b => b.z < 0.05 && b.sz > 0.35 && !b.glow);
    if (!items.length) return null;
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const b of items) {
      const r = Math.hypot(b.sx, b.sy) / 2;
      x0 = Math.min(x0, b.x - r);
      y0 = Math.min(y0, b.y - r);
      x1 = Math.max(x1, b.x + r);
      y1 = Math.max(y1, b.y + r);
    }
    const C2 = 0.5,
      nx = Math.ceil((x1 - x0) / C2) + 3,
      ny = Math.ceil((y1 - y0) / C2) + 3,
      grid = new Uint8Array(nx * ny);
    x0 -= C2;
    y0 -= C2;
    for (const b of items) {
      const c = Math.cos(b.rot),
        s = Math.sin(b.rot),
        r = Math.hypot(b.sx, b.sy) / 2;
      for (let i = Math.floor((b.x - r - x0) / C2); i <= Math.ceil((b.x + r - x0) / C2); i++)
        for (let j = Math.floor((b.y - r - y0) / C2); j <= Math.ceil((b.y + r - y0) / C2); j++) {
          if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
          const px = x0 + (i + 0.5) * C2 - b.x,
            py = y0 + (j + 0.5) * C2 - b.y,
            lu = px * c + py * s,
            lv = -px * s + py * c;
          if (Math.abs(lu) <= b.sx / 2 + 0.05 && Math.abs(lv) <= b.sy / 2 + 0.05) grid[j * nx + i] = 1;
        }
    }
    return (x, y) => {
      const i = Math.floor((x - x0) / C2),
        j = Math.floor((y - y0) / C2);
      let n = 0,
        m = 0;
      for (let a = -2; a <= 2; a++)
        for (let b = -2; b <= 2; b++) {
          const ii = i + a,
            jj = j + b;
          m++;
          if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && grid[jj * nx + ii]) n++;
        }
      return 1 - 0.32 * (n / m);
    };
  }
  // the glazed fronts of a shop (laeden.js keeps their width and glazing height on each door: d.front, d.hG, d.z0, d.hD)
  function frontsOf(sh) {
    return sh.doors
      .filter(d => d.k !== 'liefer' && d.front)
      .map((d, i) => ({
        id: sh.id + ':' + sh.doors.indexOf(d),
        x: d.x,
        y: d.y,
        nx: d.nx,
        ny: d.ny,
        w: d.w,
        front: d.front,
        hG: d.hG || 2.6,
        z0: (d.z0 === undefined ? sh.zF : d.z0) - sh.zF,
        hD: d.hD || 2.35,
        i,
      }));
  }
  // the walls as segments for the walker: every run less its open pieces; the doorway of each door stays out (the door's own segment
  // closes it while the door is shut – see push)
  function wallSegs(U, runs, sh) {
    const out = [];
    for (const r of runs) {
      const gaps = r.open.slice();
      for (const h of r.holes) if (h.door) gaps.push([h.door.u0, h.door.u1]);
      for (const [t0, t1] of LIPLAN.rest(r.L, gaps))
        out.push([r.a[0] + r.ux * t0, r.a[1] + r.uy * t0, r.a[0] + r.ux * t1, r.a[1] + r.uy * t1]);
    }
    void U;
    void sh;
    return out;
  }
  const bbOfShop = sh => {
    let bb = [1e9, 1e9, -1e9, -1e9];
    for (const p of sh.parts.concat(sh.annex)) {
      const b = LIPLAN.bbOf(p.f);
      bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])];
    }
    return bb;
  };
  // ---- the trolley one can push: a mesh of its own, the action button takes it by the handle, it rolls in front of one ----
  function cartMesh(M) {
    const C2 = M.cart,
      K = rkit(() => 0);
    trolley(K, { x: 0, y: 0, rot: 0 });
    const me = new THREE.Mesh(K.geo(), M.mat);
    me.name = 'laeden-innen ' + M.sh.id + ' wagen';
    S.live++;
    me.userData.noMerge = true;
    me.castShadow = false;
    me.receiveShadow = false;
    scene.add(me);
    C2.mesh = me;
    placeCart(M);
    C2.act = 'laeden-innen:wagen:' + M.sh.id;
    KERN.act({
      id: C2.act,
      r: 1.4,
      prio: 2,
      pos: () => [C2.x, C2.y, M.zf(C2.x, C2.y) + 0.6],
      label: () => (C2.push ? 'Einkaufswagen abstellen' : 'Einkaufswagen schieben'),
      run: () => {
        C2.push = !C2.push;
        if (C2.push) S.cart = M;
        else if (S.cart === M) S.cart = null;
      },
    });
  }
  function placeCart(M) {
    const C2 = M.cart;
    if (!C2 || !C2.mesh) return;
    C2.mesh.position.set(C2.x, M.zf(C2.x, C2.y), -C2.y);
    C2.mesh.rotation.y = C2.rot;
    C2.mesh.updateMatrixWorld();
    markDirty();
  }
  // while pushed: 0.85 m in front of the walker, turned with him; walls and fixtures hold it back; out of the shop it stays behind
  KERN.tick(
    () => {
      const M = S.cart;
      if (!M || !M.cart || !M.cart.push) return;
      const C2 = M.cart;
      if (P.mode !== 'walk' || !S.mounted.has(M.sh.id)) {
        C2.push = false;
        S.cart = null;
        return;
      }
      const y = (P.yaw * Math.PI) / 180,
        fx = Math.sin(y),
        fy = Math.cos(y),
        p = [P.x + fx * 0.85, P.y + fy * 0.85];
      const ua = unitAt(p[0], p[1]);
      if (!ua || ua.M !== M) {
        C2.push = false;
        S.cart = null;
        return;
      }
      push(p, 0.32);
      if (Math.hypot(p[0] - C2.x, p[1] - C2.y) > 1e-3 || Math.abs(C2.rot - Math.atan2(fy, fx)) > 1e-3) {
        C2.x = p[0];
        C2.y = p[1];
        C2.rot = Math.atan2(fy, fx);
        placeCart(M);
      }
    },
    'laeden-innen-wagen',
    { late: true }
  );
  function free(M) {
    if (M.cart) {
      if (M.cart.act) KERN.unact(M.cart.act);
      if (M.cart.mesh) {
        scene.remove(M.cart.mesh);
        M.cart.mesh.geometry.dispose();
        S.live--;
      }
      if (S.cart === M) S.cart = null;
      M.cart = null;
    }
    for (const me of M.meshes) {
      scene.remove(me);
      me.geometry.dispose();
      S.live--;
    }
    M.meshes = [];
    M.segs = [];
    M.grid = null;
    if (M.mat) {
      M.mat.dispose();
      MATS.delete(M.mat);
    }
    M.mat = null;
    for (const m of M.hid || []) {
      LAEDEN.hidden.delete(m);
      m.visible = !RATSCHER.map;
    }
    M.hid = [];
    markDirty(true);
  }

  // =============================== the doors: two sliding leaves each, moved by their vertices ===============================
  // per group of laeden.js (when it stands): one mesh of all leaf frames (DMOD.mat), per shop one mesh of the leaves' glass (its glass)
  const GROUPD = new Map(); // group id → { frames, glass: Map shopId → mesh, doors: [] }
  // the rooms' program (the Rathaus hall's: basic with vertex colours) compiled when a group of shops comes up (900 m away), not at a
  // door – usually the town has it already; one material keeps it (three frees a program no material uses)
  let WARM = null;
  function warm() {
    if (WARM) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0, 0.01, -500, 0, 0, -500, 0.01], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    WARM = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
    WARM.frustumCulled = false;
    WARM.name = 'laeden-innen warm';
    try {
      warmUp(WARM); // (compile skips what is not visible: it stays visible here, it is never in the scene)
    } catch (e) {
      console.warn('laeden-innen warm', e);
    }
  }
  function onBuild(g) {
    onDrop(g);
    warm();
    if (!S.units) prepUnits();
    const KF = { pos: [], nrm: [], col: [], idx: [] },
      glassK = new Map(),
      doors = [];
    const GREYM = L(0.55, 0.56, 0.56);
    for (const sh of g.shops)
      sh.doors.forEach((d, i) => {
        if (d.k === 'liefer' || !d.front) return;
        const U = (S.shops.get(sh.id) || []).find(q => q.doors.includes(d)) || null;
        const D = { sh, d, i, U, g, open: 0, want: 0, leaves: [], id: sh.id + ':' + i };
        const tx = -d.ny,
          ty = d.nx,
          z0 = d.z0 === undefined ? sh.zF : d.z0,
          hD = d.hD || 2.35,
          o = 0.04 + 0.09;
        for (const s2 of [-1, 1]) {
          const lw = d.w / 2 - 0.04,
            cu = (s2 * d.w) / 4;
          // the frame: two stiles, two rails (boxes) – their vertices remembered for sliding
          const f0 = KF.pos.length / 3;
          for (const [du, dz, sw, sz] of [
            [-lw / 2 + 0.03, 0, 0.06, hD],
            [lw / 2 - 0.03, 0, 0.06, hD],
            [0, hD - 0.07, lw, 0.07],
            [0, 0, lw, 0.1],
          ])
            boxInto(
              KF,
              d.x + tx * (cu + du) + d.nx * o,
              d.y + ty * (cu + du) + d.ny * o,
              z0 + dz,
              sw,
              0.05,
              sz,
              Math.atan2(ty, tx),
              GREYM
            );
          const f1 = KF.pos.length / 3;
          // the glass: one pane in the frame facing out
          if (!glassK.has(sh.id)) glassK.set(sh.id, { pos: [], nrm: [], idx: [] });
          const G = glassK.get(sh.id),
            g0 = G.pos.length / 3,
            a = [d.x + tx * (cu - lw / 2) + d.nx * (o + 0.005), d.y + ty * (cu - lw / 2) + d.ny * (o + 0.005)],
            b = [d.x + tx * (cu + lw / 2) + d.nx * (o + 0.005), d.y + ty * (cu + lw / 2) + d.ny * (o + 0.005)];
          for (const [p, z] of [
            [a, z0 + 0.1],
            [b, z0 + 0.1],
            [b, z0 + hD - 0.07],
            [a, z0 + hD - 0.07],
          ]) {
            G.pos.push(p[0], z, -p[1]);
            G.nrm.push(d.nx, 0, -d.ny);
          }
          G.idx.push(g0, g0 + 1, g0 + 2, g0, g0 + 2, g0 + 3);
          const g1 = G.pos.length / 3;
          D.leaves.push({ s: s2, f: [f0, f1], gl: [g0, g1], shop: sh.id, slide: d.w / 2 - 0.06 });
        }
        doors.push(D);
      });
    const GD = { g, doors, frames: null, glass: new Map() };
    if (KF.idx.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(KF.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(KF.nrm, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(KF.col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((KF.pos.length / 3) * 2), 2));
      geo.setIndex(KF.idx);
      geo.computeBoundingSphere();
      const me = new THREE.Mesh(geo, leafMat());
      me.name = 'laeden-innen ' + g.id + ' türflügel';
      me.userData.noMerge = true;
      me.castShadow = false;
      me.receiveShadow = false;
      me.userData.base = Float32Array.from(KF.pos);
      scene.add(me);
      GD.frames = me;
    }
    for (const [id, G] of glassK) {
      const gq = (g.glass || []).find(q => q.id === id);
      if (!gq) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(G.nrm, 3));
      geo.setIndex(G.idx);
      geo.computeBoundingSphere();
      const me = new THREE.Mesh(geo, gq.mat);
      me.name = 'laeden-innen ' + g.id + ' türglas ' + id;
      me.userData.noMerge = true;
      me.castShadow = false;
      me.receiveShadow = false;
      me.userData.base = Float32Array.from(G.pos);
      scene.add(me);
      GD.glass.set(id, me);
    }
    GD.pools = poolsOf(g, doors);
    GROUPD.set(g.id, GD);
    S.doors = [...GROUPD.values()].flatMap(q => q.doors);
    markDirty(true);
  }
  // ---- at night the light of a lit shop on its forecourt: in front of each glazed front a soft warm pool, brightest at the glass –
  // on the material of the street lamps' pools (world/village_props.js: its program, its gradient), one clone per door for its own
  // brightness (open: the shop's light, closed: the night light); an instanced quad that follows the ground ----
  function poolsOf(g, doors) {
    const pm = window.VPROPS && VPROPS.pool ? VPROPS.pool.material : null;
    if (!pm) return [];
    const out = [];
    for (const D of doors) {
      const d = D.d,
        tx = -d.ny,
        ty = d.nx,
        hw = (d.front || d.w + 2) / 2 + 1.6,
        a0 = 0.25,
        a1 = 6.5,
        P0 = [],
        UV = [];
      // the corners: across the front (u 0 → 1), out from the glass (the gradient's middle line) to its rim
      for (const [s2, a, uu, vv] of [
        [-1, a0, 0, 0.5],
        [1, a0, 1, 0.5],
        [1, a1, 1, 1],
        [-1, a1, 0, 1],
      ]) {
        const x = d.x + tx * s2 * hw + d.nx * a,
          y = d.y + ty * s2 * hw + d.ny * a,
          z = (KERN.ground(x, y) ?? d.z0 ?? 0) + 0.06;
        P0.push(x, z, -y);
        UV.push(uu, vv);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P0, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      geo.setIndex([0, 2, 1, 0, 3, 2]);
      geo.computeBoundingSphere();
      const mat = pm.clone(),
        me = new THREE.InstancedMesh(geo, mat, 1);
      me.setMatrixAt(0, new THREE.Matrix4());
      me.name = 'laeden-innen ' + g.id + ' licht vor ' + D.id;
      me.userData.noMerge = true;
      me.castShadow = false;
      me.receiveShadow = false;
      me.renderOrder = 2;
      me.visible = false;
      me.computeBoundingSphere();
      scene.add(me);
      out.push({ me, mat, D, k: -1 });
    }
    return out;
  }
  function poolsLight(GD) {
    const n = window.VILLAGE && VILLAGE.night ? VILLAGE.night() : 0;
    for (const q of GD.pools || []) {
      const open = q.D.U ? isOpenU(q.D.U) : true,
        k = n > 0.05 ? Math.min(1, (n - 0.05) / 0.3) * (open ? 1 : 0.22) : 0;
      if (Math.abs(k - q.k) > 0.01) {
        q.k = k;
        q.mat.color.setRGB(0.42 * k, 0.3 * k, 0.16 * k);
        markDirty();
      }
      const vis = k > 0.01 && !RATSCHER.map;
      if (q.me.visible !== vis) q.me.visible = vis;
    }
  }
  function onDrop(g) {
    const GD = GROUPD.get(g.id);
    if (!GD) return;
    // the rooms of its shops go with it
    for (const sh of g.shops) {
      const M = S.mounted.get(sh.id);
      if (M) unmount(M);
    }
    for (const me of [GD.frames, ...GD.glass.values()]) {
      if (!me) continue;
      scene.remove(me);
      me.geometry.dispose();
    }
    for (const q of GD.pools || []) {
      scene.remove(q.me);
      q.me.geometry.dispose();
      q.mat.dispose(); // (its gradient is the street lamps')
    }
    GROUPD.delete(g.id);
    S.doors = [...GROUPD.values()].flatMap(q => q.doors);
  }
  LAEDEN.onBuild = g => {
    try {
      onBuild(g);
    } catch (e) {
      console.warn('laeden-innen doors', e);
      S.err = 'doors: ' + e;
    }
  };
  LAEDEN.onDrop = g => {
    try {
      onDrop(g);
    } catch (e) {
      console.warn('laeden-innen drop', e);
    }
  };
  // a box into a raw buffer (with normals and vertex colours: DMOD.mat's plain program)
  function boxInto(B, cx, cy, z0, sx, sy, sz, rot, cl) {
    const c = Math.cos(rot),
      s = Math.sin(rot),
      p = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, z];
    const x0 = -sx / 2,
      x1 = sx / 2,
      y0 = -sy / 2,
      y1 = sy / 2,
      z1 = z0 + sz;
    const F_ = [
      [p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)],
      [p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1)],
      [p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1)],
      [p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1)],
      [p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)],
    ];
    for (const [a, b, cc, d] of F_) {
      const ux = b[0] - a[0],
        uy = b[1] - a[1],
        uz = b[2] - a[2],
        vx = d[0] - a[0],
        vy = d[1] - a[1],
        vz = d[2] - a[2];
      let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      const n0 = B.pos.length / 3;
      for (const q of [a, b, cc, d]) {
        B.pos.push(q[0], q[2], -q[1]);
        B.nrm.push(nx, nz, -ny);
        B.col.push(cl[0], cl[1], cl[2]);
      }
      B.idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
    }
  }
  // move a door's leaves to its opening k (0 shut … 1 open)
  function poseDoor(D) {
    const GD = GROUPD.get(D.g.id);
    if (!GD) return;
    const tx = -D.d.ny,
      ty = D.d.nx,
      k = D.open * D.open * (3 - 2 * D.open);
    for (const lf of D.leaves) {
      const dx = tx * lf.s * lf.slide * k,
        dy = ty * lf.s * lf.slide * k;
      if (GD.frames) {
        const a = GD.frames.geometry.attributes.position,
          base = GD.frames.userData.base;
        for (let v = lf.f[0]; v < lf.f[1]; v++) {
          a.array[v * 3] = base[v * 3] + dx;
          a.array[v * 3 + 2] = base[v * 3 + 2] - dy;
        }
        a.needsUpdate = true;
      }
      const gm = GD.glass.get(lf.shop);
      if (gm) {
        const a = gm.geometry.attributes.position,
          base = gm.userData.base;
        for (let v = lf.gl[0]; v < lf.gl[1]; v++) {
          a.array[v * 3] = base[v * 3] + dx;
          a.array[v * 3 + 2] = base[v * 3 + 2] - dy;
        }
        a.needsUpdate = true;
      }
    }
    markDirty();
  }
  // is the walker near a door (outside within 4 m, inside within 3 m, beside it within its width and a bit)?
  function nearDoor(D, x, y) {
    const d = D.d,
      tx = -d.ny,
      ty = d.nx,
      along = (x - d.x) * tx + (y - d.y) * ty,
      out = (x - d.x) * d.nx + (y - d.y) * d.ny;
    return Math.abs(along) < d.w / 2 + 1.2 && out > -3.2 && out < 4.2 ? out : null;
  }

  // =============================== units, mounting ===============================
  function prepUnits() {
    if (!LAEDEN.data) return;
    try {
      S.units = LIPLAN.units(LAEDEN.data);
    } catch (e) {
      S.units = [];
      S.err = 'units: ' + e;
    }
    S.shops = new Map();
    for (const U of S.units) {
      // the unit's doors are the data's objects of LAEDEN (the same as the group's shops): find them by position
      const sh = LAEDEN.data.shops.find(q => q.id === U.shop);
      U.doors = U.doors.map(d => sh.doors.find(q => Math.hypot(q.x - d.x, q.y - d.y) < 0.01) || d);
      if (!S.shops.has(U.shop)) S.shops.set(U.shop, []);
      S.shops.get(U.shop).push(U);
    }
  }
  function mount(sh, g) {
    if (S.mounted.has(sh.id)) return S.mounted.get(sh.id);
    const M = { sh, g, meshes: [], segs: [], units: [], grid: null, mat: roomMat(), hid: [], t: performance.now() };
    S.mounted.set(sh.id, M);
    begin(M);
    step(M);
    return M;
  }
  // one more unit of a shop being built (each round); the last one finishes it
  function step(M) {
    if (M.state !== 'building') return;
    const U = M.todo.shift();
    if (U)
      try {
        buildUnit(M, U);
      } catch (e) {
        console.warn('laeden-innen build', U.id, e);
        S.err = U.id + ': ' + e;
      }
    if (M.todo.length) return;
    try {
      finish(M);
      S.builds++;
    } catch (e) {
      console.warn('laeden-innen finish', M.sh.id, e);
      S.err = M.sh.id + ': ' + e;
      M.state = 'ready';
    }
    const sh = M.sh,
      g = M.g;
    // the glass of the shop's fronts and doors goes while the rooms stand (only the frames stay: one sees in, and out)
    const GD = GROUPD.get(g.id);
    const hide = [];
    for (const me of g.meshes)
      if (me.name === 'laeden ' + g.id + ' glas ' + sh.id || me.name === 'laeden ' + g.id + ' glas ' + sh.id + ':licht')
        hide.push(me);
    if (GD && GD.glass.get(sh.id)) hide.push(GD.glass.get(sh.id));
    for (const me of hide) {
      LAEDEN.hidden.add(me);
      me.visible = false;
    }
    M.hid = hide;
    light(M, true);
    KERN.emit('laeden:innen', { shop: sh.id, state: 'gebaut', ms: M.ms });
  }
  function unmount(M) {
    free(M);
    S.mounted.delete(M.sh.id);
    S.frees++;
    KERN.emit('laeden:innen', { shop: M.sh.id, state: 'frei' });
  }
  // which unit of a mounted shop a point is in (and in which volume)
  function unitAt(x, y) {
    for (const M of S.mounted.values()) {
      if (!M.bb || x < M.bb[0] - 1 || x > M.bb[2] + 1 || y < M.bb[1] - 1 || y > M.bb[3] + 1) continue;
      for (const u of M.units) {
        for (const v of u.U.vols) if (LIPLAN.inPoly(v.f, x, y)) return { M, U: u.U, v };
        // the seam between two parts of one store (drawn a little apart): near both counts as inside
        if (u.U.vols.length > 1) {
          const nearV = u.U.vols.filter(v => LIPLAN.edgeDist(v.f, x, y) < 0.42);
          if (nearV.length >= 2) return { M, U: u.U, v: nearV[0] };
        }
      }
    }
    return null;
  }

  // =============================== which parts show: the one the observer is in and those open to it ===============================
  function showSecs(M, w) {
    const ua = unitAt(w[0], w[1]);
    const vis = new Set();
    for (const u of M.units) {
      if (ua && ua.M === M && ua.U === u.U) {
        const s0 = u.secOf(u.U.vols.indexOf(ua.v));
        for (const q of u.nb.get(s0) || [s0]) vis.add(u.U.id + ':' + q);
        // and what the doors show (one sees out and in again)
        for (const q of u.doorSecs) vis.add(u.U.id + ':' + q);
      } else for (const q of u.doorSecs) for (const q2 of u.nb.get(q) || [q]) vis.add(u.U.id + ':' + q2);
    }
    let ch = false;
    for (const me of M.meshes) {
      const v = vis.has(me.userData.unit + ':' + me.userData.sec) && !RATSCHER.map;
      if (me.visible !== v) {
        me.visible = v;
        ch = true;
      }
    }
    if (ch) markDirty();
    M.vis = vis.size;
  }
  // =============================== light: open, closed, the exposure of the moment ===============================
  function light(M, now) {
    const U0 = (S.shops.get(M.sh.id) || [])[0];
    const open = U0 ? isOpenU(U0) : true;
    // the night's higher exposure evened out (DN: ~1.22 by day … 2.15 at night): unlit colours look the same
    const ex = R.toneMappingExposure || 1.3,
      night = window.VILLAGE && VILLAGE.night ? VILLAGE.night() : 0,
      base = open ? 1.0 : 0.16 + 0.3 * (1 - Math.min(1, night / 0.3)),
      k = (base * 1.3) / Math.max(0.5, ex);
    if (!M.mat) return;
    if (now || Math.abs(M.mat.color.r - k) > 0.004) {
      M.mat.color.setScalar(k);
      markDirty();
    }
    M.open = open;
  }

  // =============================== the walker: walls, doors, the floor, indoors ===============================
  function push(p, r) {
    if (r > 0.5) return undefined; // vehicles: the shops' walls of laeden.js
    const x = p[0],
      y = p[1];
    // in a doorway (inside or out) or inside a unit: our walls answer (laeden's wall across the door is not asked)
    let M = null,
      inUnit = false;
    for (const D of S.doors) {
      if (D.open < 0.85) continue;
      const out = nearDoor(D, x, y);
      if (out !== null && out > -1.2 && out < 1.2 && S.mounted.has(D.sh.id)) {
        M = S.mounted.get(D.sh.id);
        break;
      }
    }
    if (!M) {
      const ua = unitAt(x, y);
      if (ua) {
        M = ua.M;
        inUnit = true;
      }
    }
    if (!M || !M.grid) return undefined;
    let moved = false;
    const segsTest = (s2, rr) => {
      const ex = s2[2] - s2[0],
        ey = s2[3] - s2[1],
        l2 = ex * ex + ey * ey || 1,
        t = Math.max(0, Math.min(1, ((p[0] - s2[0]) * ex + (p[1] - s2[1]) * ey) / l2)),
        qx = s2[0] + ex * t,
        qy = s2[1] + ey * t,
        dx = p[0] - qx,
        dy = p[1] - qy,
        d = Math.hypot(dx, dy);
      if (d < rr && d > 1e-6) {
        p[0] = qx + (dx / d) * rr;
        p[1] = qy + (dy / d) * rr;
        moved = true;
      }
    };
    const ci = Math.floor(x / 4),
      cj = Math.floor(y / 4);
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++) {
        const a = M.grid.get(i + ',' + j);
        if (a) for (const k of a) segsTest(M.segs[k], r);
      }
    // the doors that are shut: their doorway is a wall
    for (const D of S.doors)
      if (D.sh === M.sh && D.open < 0.85) {
        const d = D.d,
          tx = -d.ny,
          ty = d.nx;
        segsTest(
          [
            d.x - tx * (d.w / 2 + 0.05),
            d.y - ty * (d.w / 2 + 0.05),
            d.x + tx * (d.w / 2 + 0.05),
            d.y + ty * (d.w / 2 + 0.05),
          ],
          r
        );
      }
    void inUnit;
    return moved;
  }
  KERN.provide('pushOut', push, 17);
  // the floor of a mounted unit
  KERN.provide(
    'ground',
    (x, y) => {
      if (!S.mounted.size) return undefined;
      const ua = unitAt(x, y);
      return ua ? ua.M.zf(x, y) + 0.004 : undefined;
    },
    11
  );
  KERN.provide('inside', (x, y) => (S.mounted.size ? !!unitAt(x, y) : false), 11);
  KERN.provide(
    'place',
    (x, y) => {
      if (!S.mounted.size) return undefined;
      const ua = unitAt(x, y);
      if (!ua) return undefined;
      const u = ua.M.units.find(q => q.U === ua.U),
        sc = u ? u.secs.find(q => q.id === u.secOf(ua.U.vols.indexOf(ua.v))) : null;
      return (sc && sc.name ? sc.name : ua.U.name) + ', Schleusingen';
    },
    34
  );
  // the doors' state for the label at a door (laeden.js asks): the unit's hours (assumed where OSM has none)
  LAEDEN.doorOpen = (sh, d) => {
    if (!S.units) return undefined;
    const U = (S.shops.get(sh.id) || []).find(q => q.doors.includes(d));
    return U ? isOpenU(U) : undefined;
  };
  // the text at a door (laeden.js asks): inside there is something now
  LAEDEN.doorInfo = (sh, d) => {
    const U = (S.shops.get(sh.id) || []).find(q => q.doors.includes(d));
    if (!U) return null;
    const o = isOpenU(U);
    return o
      ? (d.who || sh.name) + ' hat geöffnet – die Türen gehen auf, wenn man davor steht.'
      : (d.who || sh.name) +
          ' hat geschlossen – die Türen bleiben zu' +
          (U.oh ? ' (' + LAEDEN.ohShort(U.oh) + ').' : '.');
  };

  // =============================== the round ===============================
  const MOUNT_R = 45,
    FREE_R = 80;
  let acc = 0;
  function tick(dt) {
    // the doors every frame (they move), the rest twice a second
    const w = KERN.where();
    if (w && S.doors.length) {
      const wx = P.mode === 'walk' ? P.x : w[0],
        wy = P.mode === 'walk' ? P.y : w[1];
      for (const D of S.doors) {
        const out = nearDoor(D, wx, wy),
          U = D.U,
          open = U ? isOpenU(U) : false,
          // from inside always (one is let out), from outside only while the shop is open – and only when its rooms stand
          ready = S.mounted.has(D.sh.id) && S.mounted.get(D.sh.id).state === 'ready',
          want = out !== null && ready && (out < 0 || open) && P.mode === 'walk' ? 1 : 0;
        D.want = want;
        if (D.open !== want) {
          D.open = want > D.open ? Math.min(1, D.open + dt / 0.9) : Math.max(0, D.open - dt / 1.1);
          poseDoor(D);
        }
      }
    }
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    if (!w) return;
    if (!S.units && LAEDEN.data) prepUnits();
    if (!S.units) return;
    // mount the nearest shop within reach whose group stands, free what is far
    let best = null,
      bd = MOUNT_R;
    for (const g of LAEDEN.groups || []) {
      if (g.state !== 'built') continue;
      for (const sh of g.shops) {
        if (!S.shops.has(sh.id)) continue;
        let d = 1e9;
        for (const dd of sh.doors) if (dd.k !== 'liefer') d = Math.min(d, Math.hypot(dd.x - w[0], dd.y - w[1]));
        const M = S.mounted.get(sh.id);
        if (M) {
          M.d = d;
          continue;
        }
        if (d < bd) {
          bd = d;
          best = [sh, g];
        }
      }
    }
    for (const M of [...S.mounted.values()]) {
      const inside = !!unitAt(w[0], w[1]) && unitAt(w[0], w[1]).M === M;
      if (!inside && (M.d === undefined || M.d > FREE_R || M.g.state !== 'built')) unmount(M);
    }
    for (const M of S.mounted.values()) if (M.state === 'building') step(M);
    // at most two shops stand (a phone: one); a nearer one takes the place of the farthest (unless one is inside that)
    const LIM = COARSE ? 1 : 2;
    if (best && S.mounted.size >= LIM) {
      let far = null;
      for (const M of S.mounted.values()) {
        const ua = unitAt(w[0], w[1]);
        if (ua && ua.M === M) continue;
        if (!far || (M.d || 0) > (far.d || 0)) far = M;
      }
      if (far && (far.d || 0) > bd + 8) unmount(far);
    }
    if (best && S.mounted.size < LIM) mount(best[0], best[1]);
    for (const M of S.mounted.values()) {
      if (M.state !== 'ready') continue;
      light(M, false);
      showSecs(M, w);
    }
    // the door leaves go with the shops in the map view; the light on the forecourts
    for (const GD of GROUPD.values()) {
      poolsLight(GD);
      if (GD.frames) GD.frames.visible = !RATSCHER.map;
      for (const [id, me] of GD.glass)
        me.visible = !RATSCHER.map && !(S.mounted.has(id) && S.mounted.get(id).state === 'ready');
    }
    // laeden's tick re-shows hidden meshes unless asked: keep them hidden
    for (const M of S.mounted.values()) for (const me of M.hid) if (me.visible) me.visible = false;
    void CLOCK;
    void DCAL;
    void WELT;
  }
  KERN.tick(tick, 'laeden-innen');

  // =============================== tests: numbers only ===============================
  S.status = () => ({
    on: S.on,
    err: S.err,
    units: S.units ? S.units.length : 0,
    mounted: [...S.mounted.values()].map(M => ({
      shop: M.sh.id,
      state: M.state,
      meshes: M.meshes.length,
      tris: Math.round(M.tris),
      segs: M.segs.length,
      ms: M.ms,
      open: M.open,
      units: M.units.map(u => ({ id: u.U.id, type: u.U.type, ...u.plan, spots: u.plan.spots.length })),
    })),
    doors: S.doors.map(D => ({ id: D.id, unit: D.U ? D.U.id : null, open: +D.open.toFixed(2), want: D.want })),
    builds: S.builds,
    frees: S.frees,
  });
  S.mountShop = id => {
    for (const g of LAEDEN.groups || []) {
      if (g.state !== 'built') continue;
      const sh = g.shops.find(q => q.id === id);
      if (sh) {
        const M = mount(sh, g);
        while (M.state === 'building') step(M);
        return true;
      }
    }
    return false;
  };
  S.unmountShop = id => {
    const M = S.mounted.get(id);
    if (M) unmount(M);
    return !!M;
  };
  S.unitAt = (x, y) => {
    const ua = unitAt(x, y);
    return ua ? ua.U.id : null;
  };
  S.door = id => {
    const D = S.doors.find(q => q.id === id);
    return D
      ? {
          x: D.d.x,
          y: D.d.y,
          nx: D.d.nx,
          ny: D.d.ny,
          w: D.d.w,
          open: D.open,
          unit: D.U ? D.U.id : null,
          isOpen: D.U ? isOpenU(D.U) : null,
        }
      : null;
  };
  S.unitInfo = id => {
    const U = (S.units || []).find(q => q.id === id);
    return U
      ? {
          id: U.id,
          shop: U.shop,
          name: U.name,
          type: U.type,
          oh: U.oh || DEFAULT_OH[U.type],
          vols: U.vols.map(v => v.f),
          doors: U.doors.map(d => U.doors.indexOf(d)),
        }
      : null;
  };
  // the light on the forecourts: per glazed front on or off and its strength
  S.pools = () =>
    [...GROUPD.values()].flatMap(GD =>
      (GD.pools || []).map(q => ({ id: q.D.id, on: q.me.visible, k: +q.k.toFixed(2) }))
    );
  // the rooms' geometries alive (built minus freed) and the materials of the rooms (one per standing shop)
  S.mem = () => ({ live: S.live, mats: MATS.size, mounted: S.mounted.size, texts: TEXTS.size });
  S.meshesOf = id => {
    const M = S.mounted.get(id);
    return M ? M.meshes : [];
  };
  // places for pictures: per section of each unit of a standing shop the place one can walk to from the unit's main door (the walker's
  // radius, 0.5 m cells) with the longest free view along one of 16 directions (the fixtures' and walls' segments stop it); yaw in degrees
  S.views = id => {
    const M = S.mounted.get(id);
    if (!M || M.state !== 'ready') return null;
    const cells = (x0, y0, x1, y1, f) => {
      for (let i = Math.floor(x0 / 4); i <= Math.floor(x1 / 4); i++)
        for (let j = Math.floor(y0 / 4); j <= Math.floor(y1 / 4); j++) {
          const a = M.grid.get(i + ',' + j);
          if (a) for (const k of a) f(M.segs[k]);
        }
    };
    const clear = (x, y, r) => {
      let best = r;
      cells(x - r, y - r, x + r, y + r, s2 => {
        const ex = s2[2] - s2[0],
          ey = s2[3] - s2[1],
          l2 = ex * ex + ey * ey || 1,
          t = Math.max(0, Math.min(1, ((x - s2[0]) * ex + (y - s2[1]) * ey) / l2));
        best = Math.min(best, Math.hypot(x - s2[0] - ex * t, y - s2[1] - ey * t));
      });
      return best;
    };
    const ray = (x, y, dx, dy, max) => {
      let best = max;
      const seen = new Set();
      for (let t = 0; t <= best + 4; t += 2) {
        const i = Math.floor((x + dx * t) / 4),
          j = Math.floor((y + dy * t) / 4);
        for (let di = -1; di <= 1; di++)
          for (let dj = -1; dj <= 1; dj++) {
            const key = i + di + ',' + (j + dj);
            if (seen.has(key)) continue;
            seen.add(key);
            const a = M.grid.get(key);
            if (!a) continue;
            for (const k of a) {
              const s2 = M.segs[k],
                ex = s2[2] - s2[0],
                ey = s2[3] - s2[1],
                den = dx * ey - dy * ex;
              if (Math.abs(den) < 1e-9) continue;
              const qx = s2[0] - x,
                qy = s2[1] - y,
                tt = (qx * ey - qy * ex) / den,
                uu = (qx * dy - qy * dx) / den;
              if (tt > 0 && uu >= 0 && uu <= 1 && tt < best) best = tt;
            }
          }
      }
      return best;
    };
    const out = [];
    for (const u of M.units) {
      const U = u.U,
        d = U.doors[0],
        C = 0.5;
      let bb = [1e9, 1e9, -1e9, -1e9];
      for (const v of U.vols) {
        const b = LIPLAN.bbOf(v.f);
        bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])];
      }
      const nx = Math.ceil((bb[2] - bb[0]) / C) + 1,
        ny = Math.ceil((bb[3] - bb[1]) / C) + 1,
        seen = new Uint8Array(nx * ny),
        volAt = (x, y) => U.vols.findIndex(v => LIPLAN.inPoly(v.f, x, y)),
        q = [[Math.round((d.x - d.nx * 0.9 - bb[0]) / C), Math.round((d.y - d.ny * 0.9 - bb[1]) / C)]],
        best = new Map();
      while (q.length) {
        const [i, j] = q.pop();
        if (i < 0 || j < 0 || i >= nx || j >= ny || seen[j * nx + i]) continue;
        seen[j * nx + i] = 1;
        const x = bb[0] + i * C,
          y = bb[1] + j * C,
          vi = volAt(x, y);
        if (vi < 0) continue;
        const cl = clear(x, y, 1.4);
        if (cl < 0.22) continue;
        q.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
        if (cl < 0.7 || (i + j) % 2) continue;
        const sec = u.secOf(vi);
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2,
            dx = Math.sin(a),
            dy = Math.cos(a);
          let L = ray(x, y, dx, dy, 40);
          // not out through a door: the view ends where it leaves the unit
          for (let t = 0.5; t < L; t += 0.5)
            if (volAt(x + dx * t, y + dy * t) < 0) {
              L = t;
              break;
            }
          const sc = L * Math.min(1, cl / 1.2);
          const b = best.get(sec);
          if (!b || sc > b.sc) best.set(sec, { sc, x, y, yaw: (k / 16) * 360, L });
        }
      }
      for (const [sec, b] of best) {
        const sc = u.secs.find(q2 => q2.id === sec);
        out.push({
          unit: U.id,
          sec,
          name: (sc && sc.name) || U.name,
          x: +b.x.toFixed(2),
          y: +b.y.toFixed(2),
          z: +M.zf(b.x, b.y).toFixed(2),
          yaw: b.yaw,
          view: +b.L.toFixed(1),
        });
      }
    }
    return out;
  };
  void toast;
  return S;
})();
window.LINNEN = LINNEN;
