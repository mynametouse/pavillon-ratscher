// ===================== feat/einrichtung (Falko, 23.10.2026): the interiors of the garden buildings in different styles, with single clicks =====================
// „Ich möchte, dass man das Interieur- und Innendesign auch bei den anderen Gebäuden im Garten umstellen kann … Grundausstattung und
// Einrichtung … mit einzelnen Klicks …, die durchaus verschiedenen Stilen entsprechen können.“ Each building (bungalow, atelier, caravan)
// registers itself as a house with a few styles. A style changes
//   · colours and materials of the building's own slot materials (walls, floor, ceiling, wood, fabrics, rug, curtains, bedding, pictures) –
//     twins of the kit's materials (garten_kit.js twin): the same shader programs, only colours, uniforms and canvas images change;
//   · the furnishing: a style layer (sofa, tables, lamp shades, shelves, pictures, plants, cushions …) built by the style into a group in the
//     building's frame, merged by material (mergeGroup), thrown away and built again when the style changes – no reload, no new program.
// An accent colour (eight to choose) tints cushions, a throw, vases, a lamp shade. The choice per building is kept in 'pav-stil-v1'.
// Panel „Einrichtung“: a HUD button while one is inside such a building, and Menü → Gestalten → „Gartengebäude“.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { $ } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { MAT } from '../core/mats.js';
import { gB } from './site_base.js';
import {
  disposeGroup,
  KM,
  leaf,
  mergeGroup,
  paletteize,
  plant,
  pot,
  put,
  redraw,
  rng,
  soft,
  twin,
} from './garten_kit.js';
// ---- the accent colours (the same eight for every building) ----
export const ACCENTS = [
  ['Senfgelb', 0xc99a2e],
  ['Rost', 0xb0502e],
  ['Flaschengrün', 0x2f5a44],
  ['Petrol', 0x2b6070],
  ['Taubenblau', 0x8ea3b8],
  ['Altrosa', 0xc98f8a],
  ['Aubergine', 0x5a3550],
  ['Salbei', 0x93a77f],
];
const KEY = 'pav-stil-v1';
// ---- pattern painters for the canvas textures of rugs, curtains, bedding, throws (q: 2d context, w × h px) ----
const hex = c => '#' + new THREE.Color(c).getHexString();
const shade = (c, k) => hex(new THREE.Color(c).multiplyScalar(k));
export const PATTERN = {
  // plain cloth with a fine weave
  plain(q, w, h, [a]) {
    q.fillStyle = hex(a);
    q.fillRect(0, 0, w, h);
    const R = rng(7);
    for (let i = 0; i < w * h * 0.03; i++) {
      q.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + R() * 0.05})`;
      q.fillRect(R() * w, R() * h, 1 + R() * 3, 1);
    }
  },
  // gingham check (two colours, n squares across)
  check(q, w, h, [a, b = 0xf6f3ec, n = 8]) {
    q.fillStyle = hex(b);
    q.fillRect(0, 0, w, h);
    const s = w / n,
      c = new THREE.Color(a);
    q.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.55)`;
    for (let i = 0; i < n; i += 2) {
      q.fillRect(i * s, 0, s, h);
      q.fillRect(0, (i * s * h) / w, w, (s * h) / w);
    }
  },
  // stripes along the weave
  stripes(q, w, h, cols) {
    let x = 0,
      i = 0;
    const R = rng(11);
    while (x < w) {
      const bw = 4 + R() * 18;
      q.fillStyle = hex(cols[i++ % cols.length]);
      q.fillRect(x, 0, bw, h);
      x += bw;
    }
  },
  // rag rug (Flickenteppich): woven stripes of old fabric
  rag(q, w, h, cols) {
    const R = rng(4711);
    let y = 0;
    while (y < h) {
      const bh = 6 + R() * 22;
      q.fillStyle = hex(cols[Math.floor(R() * cols.length)]);
      q.fillRect(0, y, w, bh);
      for (let k = 0; k < bh * 3; k++) {
        q.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},${0.06 + R() * 0.1})`;
        q.fillRect(R() * w, y + R() * bh, 2 + R() * 6, 1);
      }
      y += bh;
    }
    for (let x = 0; x < w; x += 4) {
      q.fillStyle = 'rgba(0,0,0,0.12)';
      q.fillRect(x, 0, 1, h);
    }
  },
  // kilim: bands with rows of diamonds
  kilim(q, w, h, [a, b, c, d]) {
    q.fillStyle = hex(a);
    q.fillRect(0, 0, w, h);
    const band = h / 4;
    for (let k = 0; k < 4; k++) {
      const y0 = k * band;
      q.fillStyle = hex(k % 2 ? c : b);
      q.fillRect(0, y0 + band * 0.12, w, band * 0.12);
      q.fillRect(0, y0 + band * 0.76, w, band * 0.12);
      const n = 4,
        s = w / n;
      for (let i = 0; i < n; i++) {
        const cx = i * s + s / 2,
          cy = y0 + band / 2;
        q.fillStyle = hex(k % 2 ? b : d);
        q.beginPath();
        q.moveTo(cx, cy - band * 0.26);
        q.lineTo(cx + s * 0.36, cy);
        q.lineTo(cx, cy + band * 0.26);
        q.lineTo(cx - s * 0.36, cy);
        q.fill();
        q.fillStyle = hex(c);
        q.fillRect(cx - 3, cy - 3, 6, 6);
      }
    }
    PATTERN.grain(q, w, h);
  },
  // sisal / jute: a coarse weave of one colour
  sisal(q, w, h, [a]) {
    q.fillStyle = hex(a);
    q.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4)
      for (let x = 0; x < w; x += 4) {
        q.fillStyle = (x + y) % 8 ? shade(a, 0.86) : shade(a, 1.08);
        q.fillRect(x, y, 3, 3);
      }
  },
  // a border rug: field, border, a medallion
  border(q, w, h, [a, b, c]) {
    q.fillStyle = hex(b);
    q.fillRect(0, 0, w, h);
    q.fillStyle = hex(a);
    q.fillRect(w * 0.1, h * 0.06, w * 0.8, h * 0.88);
    q.strokeStyle = hex(c);
    q.lineWidth = 3;
    q.strokeRect(w * 0.14, h * 0.09, w * 0.72, h * 0.82);
    q.fillStyle = hex(c);
    q.beginPath();
    q.ellipse(w / 2, h / 2, w * 0.2, h * 0.12, 0, 0, Math.PI * 2);
    q.fill();
    PATTERN.grain(q, w, h);
  },
  // flowers on a light ground (Landhaus)
  floral(q, w, h, [a, b, c]) {
    q.fillStyle = hex(a);
    q.fillRect(0, 0, w, h);
    const R = rng(23);
    for (let i = 0; i < 26; i++) {
      const x = R() * w,
        y = R() * h,
        r = 3 + R() * 4;
      q.fillStyle = hex(c);
      for (let k = 0; k < 3; k++) q.fillRect(x + (k - 1) * r, y + r, 2, 6);
      q.fillStyle = hex(b);
      for (let k = 0; k < 5; k++) {
        const t = (k / 5) * Math.PI * 2;
        q.beginPath();
        q.arc(x + Math.cos(t) * r, y + Math.sin(t) * r, r * 0.7, 0, Math.PI * 2);
        q.fill();
      }
      q.fillStyle = '#f4d35e';
      q.beginPath();
      q.arc(x, y, r * 0.5, 0, Math.PI * 2);
      q.fill();
    }
  },
  // patchwork quilt (squares of a few fabrics)
  patch(q, w, h, cols) {
    const n = 6,
      s = w / n,
      R = rng(31);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < (n * h) / w; j++) {
        q.fillStyle = hex(cols[Math.floor(R() * cols.length)]);
        q.fillRect(i * s, j * s, s, s);
        q.strokeStyle = 'rgba(255,255,255,0.35)';
        q.setLineDash([2, 2]);
        q.strokeRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
    q.setLineDash([]);
  },
  // fine noise over a pattern
  grain(q, w, h) {
    const R = rng(5);
    for (let i = 0; i < w * h * 0.02; i++) {
      q.fillStyle = `rgba(0,0,0,${R() * 0.07})`;
      q.fillRect(R() * w, R() * h, 1, 2);
    }
  },
};
export function paint(t, kind, cols) {
  return redraw(t, (q, w, h) => PATTERN[kind](q, w, h, cols));
}
// ---- pictures: a 2 × 2 atlas per building, painted again for each style (motif: hills, flowers, abstract, lines, sun, botanical, city …) ----
export const ART = {
  hills(q, x, y, S, c = ['#f1c98f', '#a3b07a', '#6e8452', '#4f6a3e']) {
    const g = q.createLinearGradient(0, y, 0, y + S);
    g.addColorStop(0, c[0]);
    g.addColorStop(1, c[1]);
    q.fillStyle = g;
    q.fillRect(x, y, S, S);
    for (const [y0, a, f, ph, col] of [
      [0.5, 14, 0.02, 0.5, c[2]],
      [0.66, 12, 0.03, 2.0, c[3]],
    ]) {
      q.fillStyle = col;
      q.beginPath();
      q.moveTo(x, y + S);
      for (let t = 0; t <= S; t += 4) q.lineTo(x + t, y + S * y0 + Math.sin(t * f + ph) * a);
      q.lineTo(x + S, y + S);
      q.fill();
    }
  },
  flowers(q, x, y, S, c = ['#e8dfcc', '#5d7fa3', '#d8452f', '#f3c43b']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    q.fillStyle = c[1];
    q.beginPath();
    q.ellipse(x + S / 2, y + S * 0.72, S * 0.13, S * 0.18, 0, 0, Math.PI * 2);
    q.fill();
    const R = rng(3);
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 2.2,
        r = S * (0.16 + R() * 0.22);
      q.strokeStyle = '#4c6b3a';
      q.lineWidth = 2;
      q.beginPath();
      q.moveTo(x + S / 2, y + S * 0.56);
      q.lineTo(x + S / 2 + Math.cos(a) * r, y + S * 0.5 + Math.sin(a) * r);
      q.stroke();
      q.fillStyle = c[2 + (i % 2)];
      q.beginPath();
      q.arc(x + S / 2 + Math.cos(a) * r, y + S * 0.5 + Math.sin(a) * r, 5 + R() * 5, 0, Math.PI * 2);
      q.fill();
    }
  },
  abstract(q, x, y, S, c = ['#efe9df', '#c0392b', '#1d1d1b', '#e0b13a']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    q.fillStyle = c[1];
    q.fillRect(x + S * 0.12, y + S * 0.15, S * 0.42, S * 0.5);
    q.fillStyle = c[2];
    q.fillRect(x + S * 0.58, y + S * 0.15, S * 0.06, S * 0.7);
    q.fillRect(x + S * 0.12, y + S * 0.72, S * 0.76, S * 0.05);
    q.fillStyle = c[3];
    q.beginPath();
    q.arc(x + S * 0.76, y + S * 0.38, S * 0.12, 0, Math.PI * 2);
    q.fill();
  },
  lines(q, x, y, S, c = ['#f4f1ea', '#2b2b2b']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    q.strokeStyle = c[1];
    q.lineWidth = 2.2;
    q.beginPath();
    q.moveTo(x + S * 0.2, y + S * 0.8);
    q.bezierCurveTo(x + S * 0.2, y + S * 0.2, x + S * 0.8, y + S * 0.9, x + S * 0.75, y + S * 0.25);
    q.stroke();
    q.beginPath();
    q.arc(x + S * 0.42, y + S * 0.4, S * 0.08, 0, Math.PI * 2);
    q.stroke();
  },
  sun(q, x, y, S, c = ['#e9cfa8', '#d0703a', '#b5532f', '#8a6a3a']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    for (let k = 4; k > 0; k--) {
      q.fillStyle = k % 2 ? c[1] : c[2];
      q.beginPath();
      q.arc(x + S / 2, y + S * 0.62, (S * 0.4 * k) / 4, Math.PI, 0);
      q.fill();
    }
    q.fillStyle = c[3];
    q.fillRect(x, y + S * 0.62, S, S * 0.38);
  },
  botanical(q, x, y, S, c = ['#efe8d6', '#3f5f35']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    q.strokeStyle = c[1];
    q.fillStyle = c[1];
    q.lineWidth = 2;
    q.beginPath();
    q.moveTo(x + S / 2, y + S * 0.92);
    q.quadraticCurveTo(x + S / 2 + 10, y + S * 0.5, x + S / 2 - 6, y + S * 0.08);
    q.stroke();
    for (let i = 0; i < 16; i++) {
      const t = i / 16,
        yy = y + S * (0.88 - t * 0.78),
        L = S * 0.28 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 4;
      for (const sg of [-1, 1]) {
        q.beginPath();
        q.ellipse(x + S / 2 + (sg * L) / 2, yy, L / 2, 3.5, sg * 0.25, 0, Math.PI * 2);
        q.fill();
      }
    }
  },
  grid(q, x, y, S, c = ['#d9d6cf', '#3a3a3a', '#8a8580']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        q.fillStyle = (i * 7 + j * 3) % 5 ? c[2] : c[1];
        q.fillRect(x + S * (0.1 + i * 0.135), y + S * (0.1 + j * 0.135), S * 0.1, S * 0.1);
      }
  },
  // the garden: the green bungalow under trees (as it hung in the bungalow before)
  garden(q, x, y, S) {
    const k = S / 256;
    q.fillStyle = '#a9c7d8';
    q.fillRect(x, y, S, S * 0.5);
    q.fillStyle = '#7f9f55';
    q.fillRect(x, y + S * 0.5, S, S * 0.5);
    q.fillStyle = '#5c7e3e';
    for (let i = 0; i < 5; i++) {
      q.beginPath();
      q.arc(x + (20 + i * 52) * k, y + S * 0.38, (34 + (i % 3) * 4) * k, 0, Math.PI * 2);
      q.fill();
    }
    q.fillStyle = '#8aa37c';
    q.fillRect(x + 80 * k, y + S * 0.45, 100 * k, 60 * k);
    q.fillStyle = '#e8e6df';
    q.beginPath();
    q.moveTo(x + 70 * k, y + S * 0.46);
    q.lineTo(x + 130 * k, y + S * 0.3);
    q.lineTo(x + 190 * k, y + S * 0.46);
    q.fill();
    q.fillStyle = '#f4f2ea';
    q.fillRect(x + 118 * k, y + S * 0.52, 22 * k, 40 * k);
    q.fillRect(x + 92 * k, y + S * 0.52, 18 * k, 18 * k);
    q.fillRect(x + 150 * k, y + S * 0.52, 18 * k, 18 * k);
  },
  portrait(q, x, y, S, c = ['#d8c3a5', '#6b4f3a', '#e7cdb0', '#2f3a4a']) {
    q.fillStyle = c[0];
    q.fillRect(x, y, S, S);
    q.fillStyle = c[3];
    q.beginPath();
    q.ellipse(x + S / 2, y + S * 0.95, S * 0.3, S * 0.3, 0, Math.PI, 0);
    q.fill();
    q.fillStyle = c[2];
    q.beginPath();
    q.ellipse(x + S / 2, y + S * 0.45, S * 0.15, S * 0.2, 0, 0, Math.PI * 2);
    q.fill();
    q.fillStyle = c[1];
    q.beginPath();
    q.ellipse(x + S / 2, y + S * 0.33, S * 0.17, S * 0.12, 0, Math.PI, 0);
    q.fill();
  },
};
export function paintArt(t, motifs) {
  return redraw(t, (q, w) => {
    const S = w / 2;
    motifs.slice(0, 4).forEach((m, i) => {
      const [name, cols] = Array.isArray(m) ? m : [m];
      ART[name](q, (i % 2) * S, Math.floor(i / 2) * S, S, cols);
    });
  });
}
// framed picture from an own atlas material (cell 0..3), in a building group: like garten_kit's picture()
export function framed(g, mArt, run, a, t, zc, w, h, cell, dir, fm) {
  const geo = new THREE.PlaneGeometry(w, h),
    uv = geo.attributes.uv,
    cu = (cell % 2) * 0.5,
    cv = 0.5 - Math.floor(cell / 2) * 0.5;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, cu + uv.getX(i) * 0.5, cv + uv.getY(i) * 0.5);
  const FACE = { '-y': 0, '+y': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
  const k = dir === '+x' || dir === '+y' ? 1 : -1,
    f = 0.03,
    d = 0.022;
  const [lx, ly] = run === 'x' ? [a, t + k * (d + 0.002)] : [t + k * (d + 0.002), a];
  put(g, geo, mArt, lx, ly, zc, { ry: FACE[dir], cast: false });
  if (!fm) return;
  const t0 = Math.min(t, t + k * d),
    t1 = Math.max(t, t + k * d),
    b = (p0, p1, q0, q1) =>
      run === 'x'
        ? gB(g, p0, p1, t0, t1, q0, q1, fm, { cast: false })
        : gB(g, t0, t1, p0, p1, q0, q1, fm, { cast: false });
  // (feat/einrichtung: the four bars around the picture – until 23.10.2026 the wall thickness went in as their height)
  b(a - w / 2 - f, a + w / 2 + f, zc - h / 2 - f, zc - h / 2);
  b(a - w / 2 - f, a + w / 2 + f, zc + h / 2, zc + h / 2 + f);
  b(a - w / 2 - f, a - w / 2, zc - h / 2, zc + h / 2);
  b(a + w / 2, a + w / 2 + f, zc - h / 2, zc + h / 2);
}
// ---- small furnishing builders for the style layers (local frame of a building: x, y, z up; materials passed in) ----
const cylY = (r0, r1, h, n = 12) => new THREE.CylinderGeometry(r0, r1, h, n);
const lathe = (pts, n = 16) =>
  new THREE.LatheGeometry(
    pts.map(([r, h]) => new THREE.Vector2(r, h)),
    n
  );
// vases, bowls, jugs (radius profile scaled to height h)
export const VESSEL = {
  vase: lathe([
    [0.001, 0],
    [0.45, 0],
    [0.62, 0.25],
    [0.5, 0.62],
    [0.3, 0.82],
    [0.33, 1.0],
    [0.28, 1.0],
  ]),
  bottle: lathe([
    [0.001, 0],
    [0.5, 0],
    [0.55, 0.5],
    [0.22, 0.72],
    [0.16, 1.0],
    [0.12, 1.0],
  ]),
  bowl: lathe([
    [0.001, 0],
    [0.4, 0],
    [0.85, 0.55],
    [1.0, 1.0],
    [0.93, 1.0],
    [0.78, 0.6],
    [0.001, 0.18],
  ]),
  cup: lathe([
    [0.001, 0],
    [0.7, 0],
    [0.95, 1.0],
    [0.88, 1.0],
    [0.62, 0.12],
    [0.001, 0.12],
  ]),
  jug: lathe([
    [0.001, 0],
    [0.55, 0],
    [0.7, 0.35],
    [0.55, 0.75],
    [0.6, 1.0],
    [0.52, 1.0],
  ]),
};
export function vessel(g, kind, lx, ly, z, r, h, m) {
  return put(g, VESSEL[kind], m, lx, ly, z, { s: [r, h, r], cast: false });
}
// a potted plant: kind 'leafy' (big round leaves), 'tall' (a fig-like bush on a stem), 'trailing' (hanging over the pot), 'cactus', 'herb'
const leafDisc = (() => {
  const geo = new THREE.CircleGeometry(1, 10),
    p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, (p.getX(i) ** 2 + p.getY(i) ** 2) * 0.3);
  geo.computeVertexNormals();
  return geo;
})();
export function pottedPlant(g, lx, ly, z, size, kind, mPot, R = rng(9)) {
  const pr = size * 0.22,
    zs = pot(g, lx, ly, z, pr, pr * 1.6, mPot);
  if (kind === 'leafy' || kind === 'tall') {
    const n = kind === 'tall' ? 22 : 9,
      top = kind === 'tall' ? size * 1.15 : size * 0.55;
    if (kind === 'tall') put(g, cylY(0.012, 0.016, top * 0.7, 6), MAT.oak, lx, ly, zs + top * 0.35, { cast: false });
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2,
        rr = kind === 'tall' ? size * (0.08 + R() * 0.22) : size * (0.08 + R() * 0.16),
        zz = kind === 'tall' ? zs + top * (0.55 + R() * 0.45) : zs + size * (0.12 + R() * 0.4),
        s = kind === 'tall' ? size * (0.07 + R() * 0.04) : size * (0.13 + R() * 0.07);
      put(g, leafDisc, KM.herb, lx + Math.cos(a) * rr, ly + Math.sin(a) * rr, zz, {
        s: [s, s * 1.3, s],
        ry: a + Math.PI / 2,
        rx: -Math.PI / 2 + 0.5 + R() * 0.5,
        order: 'YXZ',
        cast: false,
      });
    }
    return zs;
  }
  if (kind === 'trailing') {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + R(),
        hang = R() * size * 0.6;
      for (let k = 0; k < 4; k++)
        leaf(
          g,
          lx + Math.cos(a) * (pr + k * 0.01),
          ly + Math.sin(a) * (pr + k * 0.01),
          zs - hang * (k / 3),
          size * 0.09,
          a,
          0.6,
          KM.herb
        );
    }
    return zs;
  }
  if (kind === 'cactus') {
    put(g, cylY(pr * 0.55, pr * 0.62, size * 0.5, 10), KM.enamelGreen, lx, ly, zs + size * 0.25, { cast: false });
    put(g, new THREE.SphereGeometry(pr * 0.55, 10, 6), KM.enamelGreen, lx, ly, zs + size * 0.5, { cast: false });
    return zs;
  }
  plant(g, lx, ly, zs, size * 0.6, kind === 'spiky' ? 'spiky' : 'herb', R);
  return zs;
}
// a plant hanging from the ceiling in a pot on three cords (zTop: the ceiling, len: down to the pot)
export function hangingPlant(g, lx, ly, zTop, len, size, mPot, R = rng(13)) {
  const z = zTop - len;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    put(
      g,
      cylY(0.003, 0.003, len - 0.06, 4),
      KM.twine,
      lx + Math.cos(a) * 0.05,
      ly + Math.sin(a) * 0.05,
      z + len / 2 + 0.03,
      {
        rx: Math.sin(a) * 0.08,
        rz: -Math.cos(a) * 0.08,
        cast: false,
      }
    );
  }
  return pottedPlant(g, lx, ly, z, size, 'trailing', mPot, R);
}
// lamp shades around a bulb at (lx, ly, zb) – kind: 'cone' (enamel), 'dome', 'globe' (paper), 'cage' (metal wires), 'rattan', 'pleat' (fabric)
export function shadeAround(g, kind, lx, ly, zb, m, mMetal = MAT.blacksteel) {
  if (kind === 'cone') put(g, new THREE.ConeGeometry(0.2, 0.16, 20, 1, true), m, lx, ly, zb + 0.06, { cast: false });
  else if (kind === 'dome')
    put(g, new THREE.SphereGeometry(0.2, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), m, lx, ly, zb - 0.02, {
      cast: false,
    });
  else if (kind === 'globe') {
    // a paper lantern: rings of paper around the bulb, open at the bottom so the bulb stays visible
    put(g, new THREE.SphereGeometry(0.21, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.8), m, lx, ly, zb + 0.02, {
      cast: false,
    });
    for (let k = 1; k < 5; k++) {
      const a = (k / 5) * Math.PI * 0.8,
        r = 0.212 * Math.sin(a);
      put(g, new THREE.TorusGeometry(r, 0.002, 4, 24), MAT.steel, lx, ly, zb + 0.02 + 0.21 * Math.cos(a), {
        rx: Math.PI / 2,
        cast: false,
      });
    }
  } else if (kind === 'cage') {
    for (const z of [zb - 0.07, zb + 0.06])
      put(g, new THREE.TorusGeometry(0.075, 0.004, 4, 18), mMetal, lx, ly, z, { rx: Math.PI / 2, cast: false });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(g, cylY(0.003, 0.003, 0.18, 4), mMetal, lx + Math.cos(a) * 0.075, ly + Math.sin(a) * 0.075, zb, {
        cast: false,
      });
    }
    put(g, new THREE.ConeGeometry(0.08, 0.05, 14, 1, true), mMetal, lx, ly, zb + 0.1, { cast: false });
  } else if (kind === 'rattan') {
    put(g, new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), m, lx, ly, zb - 0.06, {
      s: [1, 0.8, 1],
      cast: false,
    });
    for (let k = 0; k < 4; k++)
      put(g, new THREE.TorusGeometry(0.1 + k * 0.035, 0.004, 4, 22), MAT.oak, lx, ly, zb + 0.13 - k * 0.035, {
        rx: Math.PI / 2,
        cast: false,
      });
  } else if (kind === 'pleat') {
    const geo = new THREE.CylinderGeometry(0.12, 0.2, 0.22, 24, 1, true),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i)),
        k = 1 + 0.04 * Math.cos(a * 12);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    geo.computeVertexNormals();
    put(g, geo, m, lx, ly, zb + 0.02, { cast: false });
  }
}
// cushions standing on a seat: list of [x, y, width, turn]; run 'x' = their broad side along x (a back along x), 'y' = along y; mats cycle
export function cushions(g, list, z, mats, R = rng(5), run = 'x') {
  list.forEach(([x, y, w, ry], i) => {
    const [ax, ay] = run === 'x' ? [w / 2, 0.08] : [0.08, w / 2];
    soft(g, x - ax, x + ax, y - ay, y + ay, z, z + w * 0.85, 0.075, mats[i % mats.length], {
      ry: ry ?? (R() - 0.5) * 0.4,
      puff: 0.03,
      cast: false,
    });
  });
}
// a sheepskin: soft, irregular, cream
export function sheepskin(g, lx, ly, z, w, d, ry = 0) {
  return soft(g, lx - w / 2, lx + w / 2, ly - d / 2, ly + d / 2, z, z + 0.035, 0.03, MAT.woolLight, {
    puff: 0.02,
    ry,
    cast: false,
  });
}
// a pouf (round floor cushion)
export function pouf(g, lx, ly, z, r, m) {
  return put(g, new THREE.SphereGeometry(r, 18, 10), m, lx, ly, z + r * 0.62, { s: [1, 0.62, 1], cast: false });
}
// macramé wall hanging: a dowel, cords, a fringe (in front of a wall: run 'x' = wall along x at t, facing dir)
export function macrame(g, run, a, t, z, w, h, m = KM.twine) {
  const at = (u, zz) => (run === 'x' ? [a + u, t] : [t, a + u]);
  const [dx, dy] = at(0, 0);
  put(g, cylY(0.012, 0.012, w + 0.1, 8), MAT.oak, dx, dy, z, {
    rx: run === 'x' ? 0 : Math.PI / 2,
    rz: run === 'x' ? Math.PI / 2 : 0,
    cast: false,
  });
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n),
      len = h * (0.6 + 0.4 * Math.sin((Math.PI * (i + 0.5)) / n)),
      [x, y] = at(u, 0);
    put(g, cylY(0.006, 0.006, len, 4), m, x, y, z - len / 2, { cast: false });
    for (let k = 1; k < 4; k++)
      put(g, new THREE.SphereGeometry(0.014, 6, 4), m, x, y, z - (len * k) / 4.2, { cast: false });
  }
}
// a string of small lights sagging between two points (local x, y, z); bulbs as little warm spheres (no light of their own)
export function stringLights(g, p0, p1, n, m) {
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      x = p0[0] + (p1[0] - p0[0]) * t,
      y = p0[1] + (p1[1] - p0[1]) * t,
      z = p0[2] + (p1[2] - p0[2]) * t - Math.sin(Math.PI * t) * 0.12;
    put(g, new THREE.SphereGeometry(0.014, 6, 5), m, x, y, z, { cast: false });
  }
}
// low wooden coffee table, round or square (top material, legs material)
export function coffeeTable(g, lx, ly, z, w, d, h, mTop, mLeg = mTop, round = false) {
  if (round) put(g, cylY(w / 2, w / 2, 0.03, 28), mTop, lx, ly, z + h - 0.015, { cast: false });
  else gB(g, lx - w / 2, lx + w / 2, ly - d / 2, ly + d / 2, z + h - 0.03, z + h, mTop, { cast: false, bevel: 0.006 });
  const lw = 0.022,
    ix = round ? w * 0.3 : w / 2 - 0.05,
    iy = round ? w * 0.3 : d / 2 - 0.05;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    gB(g, lx + sx * ix - lw, lx + sx * ix + lw, ly + sy * iy - lw, ly + sy * iy + lw, z, z + h - 0.03, mLeg, {
      cast: false,
    });
}
// ---- the registry of houses, the chosen styles, the layer of each house ----
export const STIL = (() => {
  const H = new Map();
  let st = { v: 1, h: {}, x: {} };
  try {
    const v = SAVE.get(KEY);
    if (v && typeof v === 'object' && v.h && typeof v.h === 'object') st = Object.assign({ v: 1, h: {}, x: {} }, v);
    if (!st.x || typeof st.x !== 'object') st.x = {};
  } catch (e) {}
  const save = () => SAVE.set(KEY, st);
  const accHex = i => ACCENTS[((i % ACCENTS.length) + ACCENTS.length) % ACCENTS.length][1];
  // h: { key, label, anchor (group in the building's frame), inside(x, y, z), styles: [{ id, name, sw: [3 colours], acc, apply(h), build(g, h) }],
  //      def (style id), M (the building's own materials) }
  function house(key, o) {
    const h = Object.assign({ key, cur: null, acc: 0, layer: null, n: 0 }, o);
    H.set(key, h);
    const saved = st.h[key] || {};
    const sty = h.styles.find(s => s.id === saved.s) || h.styles.find(s => s.id === h.def) || h.styles[0];
    const acc = Number.isInteger(saved.a) && saved.a >= 0 && saved.a < ACCENTS.length ? saved.a : sty.acc || 0;
    choose(key, sty.id, acc, { nosave: true });
    return h;
  }
  const style = h => h.styles.find(s => s.id === h.cur) || h.styles[0];
  function rebuild(h) {
    if (h.layer) disposeGroup(h.layer);
    h.layer = null;
    const sty = style(h);
    if (!sty.build) return;
    const g = new THREE.Group();
    g.name = 'stil:' + h.key;
    h.anchor.add(g);
    h.R = rng(1000 + h.n++);
    sty.build(g, h);
    // parts the house shows and hides on its own (userData.sep: the sofa's cushions while it is a bed) are merged by themselves
    const seps = [];
    g.traverse(o => {
      if (o !== g && o.userData.sep) seps.push(o);
    });
    for (const s of seps) {
      paletteize(s, []);
      for (const me of mergeGroup(s, { cast: false })) me.userData.keep = true;
    }
    paletteize(g, []);
    mergeGroup(g, { cast: false });
    h.layer = g;
  }
  // a style (and an accent colour): colours of the building's materials, then its furnishing layer
  function choose(key, id, acc, o = {}) {
    const h = H.get(key);
    if (!h) return false;
    const sty = h.styles.find(s => s.id === id);
    if (!sty) return false;
    const styleChanged = h.cur !== id;
    h.cur = id;
    if (acc !== undefined && acc !== null) h.acc = acc;
    else if (styleChanged && sty.acc !== undefined) h.acc = sty.acc;
    h.A = accHex(h.acc);
    if (h.M && h.M.acc) h.M.acc.color.set(h.A);
    if (sty.apply) sty.apply(h);
    if (styleChanged || o.rebuild || !h.layer) rebuild(h);
    if (!o.nosave) {
      st.h[key] = { s: h.cur, a: h.acc };
      save();
      KERN.emit('einrichtung:stil', { house: key, style: h.cur, acc: h.acc });
    }
    markDirty(true);
    UI.sync();
    return true;
  }
  function accent(key, i) {
    const h = H.get(key);
    if (!h) return false;
    return choose(key, h.cur, i, { rebuild: !!style(h).accRebuild });
  }
  // other things the buildings keep (the sofa bed folded out, the potter's bowls …): STIL.x(name) / STIL.x(name, value)
  function x(name, v) {
    if (v === undefined) return st.x[name];
    st.x[name] = v;
    save();
    return v;
  }
  const where = () => {
    const P = LATE.P;
    if (!P) return null;
    for (const h of H.values()) if (h.inside && h.inside(P.x, P.y, P.feet + 1)) return h.key;
    return null;
  };
  return {
    house,
    set: choose,
    accent,
    x,
    where,
    houses: () => [...H.values()],
    get: key => H.get(key),
    state: () => JSON.parse(JSON.stringify(st)),
    layerInfo: key => {
      const h = H.get(key);
      if (!h || !h.layer) return null;
      let meshes = 0,
        tris = 0;
      h.layer.traverse(o => {
        if (o.isMesh) {
          meshes++;
          tris += o.geometry.attributes.position.count / 3;
        }
      });
      return { style: h.cur, acc: h.acc, meshes, tris: Math.round(tris) };
    },
  };
})();
window.STIL = STIL;
// ---- the panel „Einrichtung“: building tabs, styles with three-colour swatches, accent colours ----
const UI = (() => {
  const U = { el: null, tab: null, btn: null, built: false, sync: () => {} };
  const HOST = () => $('p-3d') || document.body;
  function build() {
    if (U.built) return;
    U.built = true;
    const el = document.createElement('aside');
    el.id = 'stilpanel';
    el.hidden = true;
    el.setAttribute('aria-label', 'Einrichtung der Gartengebäude');
    el.innerHTML =
      '<h3>Einrichtung<button type="button" class="x" aria-label="Schließen">×</button></h3>' +
      '<nav class="stabs" role="tablist"></nav><h4>Stil</h4><div class="sstyles"></div><h4>Akzentfarbe</h4><div class="saccents"></div>' +
      '<p class="fnote">Ein Klick stellt Farben, Stoffe und Möbel des Gebäudes um. Die Wahl bleibt in diesem Browser gespeichert.</p>';
    HOST().appendChild(el);
    el.querySelector('.x').addEventListener('click', () => open(false));
    U.el = el;
    // the HUD button: only while one is inside a building with styles
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hb';
    btn.id = 'stilbtn';
    btn.hidden = true;
    btn.title = 'Einrichtung dieses Gebäudes umstellen: Stil und Akzentfarbe';
    btn.innerHTML =
      '<span class="hbi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13.5h16v4H4z"/><path d="M6 13.5V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3.5"/><path d="M5.5 17.5v2M18.5 17.5v2"/></svg></span><span class="hbt">Einrichtung</span>';
    const tr = $('hudtr'),
      mb = $('menubtn');
    if (tr) tr.insertBefore(btn, mb && mb.parentNode === tr ? mb : null);
    btn.addEventListener('click', () => open(!(U.el && !U.el.hidden && U.tab === STIL.where())));
    U.btn = btn;
    // menu → Gestalten → „Gartengebäude“ (shell/menu.html)
    const mbtn = $('stilmenubtn');
    if (mbtn)
      mbtn.addEventListener('click', () => {
        if (LATE.HUD && LATE.HUD.setMenu) LATE.HUD.setMenu(false);
        open(true);
      });
    // Esc closes the panel first (before the menu opens)
    window.addEventListener(
      'keydown',
      e => {
        if (e.key === 'Escape' && U.el && !U.el.hidden) {
          open(false);
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      },
      true
    );
  }
  function render() {
    if (!U.el) return;
    const hs = STIL.houses();
    if (!U.tab || !hs.some(h => h.key === U.tab)) U.tab = (hs[0] || {}).key;
    const nav = U.el.querySelector('.stabs');
    nav.innerHTML = '';
    for (const h of hs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.house = h.key;
      b.setAttribute('aria-selected', h.key === U.tab ? 'true' : 'false');
      b.textContent = h.label;
      b.addEventListener('click', () => {
        U.tab = h.key;
        render();
      });
      nav.appendChild(b);
    }
    const h = STIL.get(U.tab);
    const ss = U.el.querySelector('.sstyles'),
      sa = U.el.querySelector('.saccents');
    ss.innerHTML = '';
    sa.innerHTML = '';
    if (!h) return;
    const sw = c => `linear-gradient(90deg,${hex(c[0])} 0 34%,${hex(c[1])} 34% 67%,${hex(c[2])} 67%)`;
    for (const s of h.styles) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.style = s.id;
      b.setAttribute('aria-pressed', s.id === h.cur ? 'true' : 'false');
      b.innerHTML = `<i style="background:${sw(s.sw)}"></i>${s.name}`;
      b.title = s.note || s.name;
      b.addEventListener('click', () => STIL.set(h.key, s.id));
      ss.appendChild(b);
    }
    ACCENTS.forEach(([name, c], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.acc = i;
      b.title = name;
      b.setAttribute('aria-label', 'Akzentfarbe ' + name);
      b.setAttribute('aria-pressed', i === h.acc ? 'true' : 'false');
      b.style.background = hex(c);
      b.addEventListener('click', () => STIL.accent(h.key, i));
      sa.appendChild(b);
    });
  }
  function open(v, key) {
    build();
    if (v) {
      U.tab = key || STIL.where() || U.tab;
      render();
    }
    U.el.hidden = !v;
    if (U.btn) U.btn.setAttribute('aria-pressed', v ? 'true' : 'false');
    const mb = $('stilmenubtn');
    if (mb) mb.setAttribute('aria-pressed', v ? 'true' : 'false');
    markDirty();
  }
  U.sync = () => {
    if (U.el && !U.el.hidden) render();
  };
  U.open = open;
  // the HUD button follows the walker in and out of the buildings (four times a second)
  let acc = 0,
    last;
  (window.TICKS = window.TICKS || []).push(dt => {
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    build();
    const k = LATE.P && LATE.P.mode === 'walk' ? STIL.where() : null;
    if (k !== last) {
      last = k;
      U.btn.hidden = !k;
      if (k) U.btn.querySelector('.hbt').textContent = 'Einrichtung';
    }
  });
  return U;
})();
STIL.open = (v = true, key) => UI.open(v, key);
export { UI as STILUI };
// ---- the building's own materials: twins of the kit's (the same shader programs), kept per building ----
export function ownMats(spec) {
  const M = {};
  for (const [k, [src, o]] of Object.entries(spec)) M[k] = twin(src, o || {});
  return M;
}
