// ===================== a small kit for landmark models of the town zones (BAU) =====================
// Faces collected per material in model metres (x east, y north, z up), merged into one mesh per material: walls, boxes, bodies of
// revolution, uv in metres; the ashlar and glass textures drawn once on a canvas. Used by welt/meiningen.js (the Stadtkirche, the theatre's
// portico); welt/trusetal.js has its own copy of the same few functions.
import * as THREE from 'three';
import { pbrMat } from '../core/assets.js';
const hh = n => {
  const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
};
export function kit() {
  const G = {};
  const bucket = k => G[k] || (G[k] = { p: [], n: [], u: [], i: [] });
  function put(k, pts, nr, uv) {
    const b = bucket(k),
      o = b.p.length / 3;
    pts.forEach((q, j) => {
      b.p.push(q[0], q[2], -q[1]);
      const m = Array.isArray(nr[0]) ? nr[j] : nr;
      b.n.push(m[0], m[2], -m[1]);
      b.u.push(uv[j][0], uv[j][1]);
    });
    for (let j = 1; j + 1 < pts.length; j++) b.i.push(o, o + j, o + j + 1);
  }
  function normalOf(pts) {
    let x = 0,
      y = 0,
      z = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      x += (a[1] - b[1]) * (a[2] + b[2]);
      y += (a[2] - b[2]) * (a[0] + b[0]);
      z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  }
  // a planar convex face, counter-clockwise seen from outside
  function face(k, pts) {
    const n = normalOf(pts);
    let uv;
    if (Math.abs(n[2]) > 0.95) uv = pts.map(p => [p[0], p[1]]);
    else {
      const hl = Math.hypot(n[0], n[1]),
        t = [-n[1] / hl, n[0] / hl, 0],
        w = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
      uv = pts.map(p => [p[0] * t[0] + p[1] * t[1], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]]);
    }
    put(k, pts, n, uv);
  }
  // a box turned by ang (its width along ang), open at the bottom
  function box(k, cx, cy, z0, w, d, h, ang = 0) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      P = (u, v) => [cx + u * c - v * s, cy + u * s + v * c],
      q = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)],
      z1 = z0 + h;
    walls(k, q, z0, z1);
    face(
      k,
      q.map(p => [p[0], p[1], z1])
    );
  }
  // a body of revolution: prof [[r, z], …] (bottom → top faces outward), seg sides, turned by a0; smooth or flat sides
  function lathe(k, cx, cy, prof, seg, a0 = 0, smooth = true) {
    for (let j = 0; j + 1 < prof.length; j++) {
      const [r0, z0] = prof[j],
        [r1, z1] = prof[j + 1],
        sl = Math.atan2(r0 - r1, z1 - z0),
        ra = (r0 + r1) / 2 || 1;
      for (let i = 0; i < seg; i++) {
        const t0 = a0 + (i / seg) * Math.PI * 2,
          t1 = a0 + ((i + 1) / seg) * Math.PI * 2,
          V = (r, z, t) => [cx + r * Math.cos(t), cy + r * Math.sin(t), z],
          N = t => [Math.cos(t) * Math.cos(sl), Math.sin(t) * Math.cos(sl), Math.sin(sl)],
          us = (t, z) => [t * ra, z];
        let pts = [V(r0, z0, t0), V(r0, z0, t1), V(r1, z1, t1), V(r1, z1, t0)],
          ns = [N(t0), N(t1), N(t1), N(t0)],
          uv = [us(t0, z0), us(t1, z0), us(t1, z1), us(t0, z1)];
        const drop = r0 < 1e-3 ? 0 : r1 < 1e-3 ? 3 : -1;
        if (drop >= 0) [pts, ns, uv] = [pts, ns, uv].map(a => a.filter((_, q) => q !== drop));
        if (smooth) put(k, pts, ns, uv);
        else face(k, pts);
      }
    }
  }
  // the walls of an outline (counter-clockwise) from z0 to z1
  function walls(k, f, z0, z1) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i],
        b = f[(i + 1) % f.length];
      face(k, [
        [a[0], a[1], z0],
        [b[0], b[1], z0],
        [b[0], b[1], z1],
        [a[0], a[1], z1],
      ]);
    }
  }
  // the meshes, one per material key; mats: { key: material }
  function meshes(mats, prefix) {
    const out = [];
    for (const [k, b] of Object.entries(G)) {
      if (!b.i.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
      g.setIndex(b.i);
      const m = new THREE.Mesh(g, mats[k]);
      m.name = prefix + k;
      m.castShadow = m.receiveShadow = true;
      out.push(m);
    }
    return out;
  }
  return { face, box, lathe, walls, meshes, put, bucket };
}
export const ccw = f => {
  let s = 0;
  for (let i = 0; i < f.length; i++) s += f[i][0] * f[(i + 1) % f.length][1] - f[(i + 1) % f.length][0] * f[i][1];
  return s > 0 ? f : f.slice().reverse();
};
export const pairs = a => {
  const o = [];
  for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]);
  return o;
};
// textures drawn once
function canvasTex(w, h, draw, rep) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
// sandstone ashlar, courses of ~45 cm (512 px = 4 m)
const ashlar = (base, k0) => (g, w, h) => {
  g.fillStyle = '#6f6a62';
  g.fillRect(0, 0, w, h);
  for (let r = 0, y = 0; y < h; r++, y += 58) {
    let x = -hh(r + k0) * 80;
    for (let q = 0; x < w; q++) {
      const L = 70 + hh(r * 31 + q * 7 + k0) * 70,
        c = base.map(v => Math.round(v * (0.86 + 0.22 * hh(r * 13 + q * 3 + k0))));
      g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      g.fillRect(x + 2, y + 2, L - 4, 54);
      x += L;
    }
  }
  for (let k = 0; k < 9000; k++) {
    const v = Math.floor(hh(k * 1.7) * 255);
    g.fillStyle = `rgba(${v},${v},${v},0.16)`;
    g.fillRect(hh(k * 3.1) * w, hh(k * 5.3) * h, 1 + hh(k) * 3, 1 + hh(k * 7) * 3);
  }
};
const glassTex = (g, w, h) => {
  g.fillStyle = '#4c5458';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16)
    for (let x = 0; x < w; x += 12) {
      const v = 120 + hh(x * 0.37 + y * 1.3) * 70;
      g.fillStyle = `rgb(${v - 14},${v},${v + 10})`;
      g.fillRect(x + 1, y + 1, 10, 14);
    }
};
let MATS = null;
export function mats() {
  if (MATS) return MATS;
  const std = (o, t) =>
    new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o, t ? { map: t } : {}));
  MATS = {
    sandstone: std({ roughness: 0.95 }, canvasTex(512, 512, ashlar([196, 180, 150], 3), [0.25, 0.25])),
    lightstone: std({ roughness: 0.9 }, canvasTex(512, 512, ashlar([214, 202, 178], 7), [0.25, 0.25])),
    slate: pbrMat('slate', { color: 0x7d838a }),
    copper: std({ color: 0x5fa889, roughness: 0.6, metalness: 0.25 }),
    glass: std({ roughness: 0.35, metalness: 0.15 }, canvasTex(48, 64, glassTex, [0.6, 0.6])),
    dark: std({ color: 0x16130f, roughness: 1 }),
    gold: std({ color: 0xc9a44a, roughness: 0.35, metalness: 0.85 }),
    wood: pbrMat('weatherwood'),
  };
  return MATS;
}
