// ===================== feat/zombie-innen: building kit of the house interiors – meshes, shared materials, canvas textures (ZIMOB) =====================
// Geometry is written straight into flat arrays per material (no intermediate BoxGeometry objects) in the house frame of zombie/z_innen_plan.js
// (x along the front, y into the house, z up, absolute heights); one mesh per material at the end – the house is a few dozen draw calls.
// Plain colours go into the garden's palette (garden/garten_kit.js PAL: one material, its UVs point at a swatch), the rest are the materials the
// model already has (shared programs: KM.*, MAT.*) or copies of them with the same shader settings and a canvas texture of our own – drawn once,
// shared by every house, its GPU copy freed when no house is mounted (it is uploaded again by itself when the next house needs it).
import * as THREE from 'three';
import { V, COARSE } from '../core/head.js';
import { ANISO, dimIndoor, plain } from '../core/assets.js';
import { pmrem } from '../garden/env.js';
import { MAT } from '../core/mats.js';
import { KM, PAL, twin, indoor } from '../garden/garten_kit.js';
export const ZIMOB = (() => {
  // ---- the mesher: arrays per material, written in the house frame (site-like x, y, z) and stored as three (x, z, −y) ----
  class Mesher {
    constructor(origin, o = {}) {
      this.B = new Map();
      this.o = origin || [0, 0, 0];
      this.tris = 0;
      // feat/innen-real: a furniture mesher rounds the boxes of soft things (cushions, mattresses, upholstery – see col()); o.pal: the
      // palette's material for indoors (the normal game's houses: M.palIn, less of the sky in it)
      this.soft = !!o.soft;
      this.pal = o.pal || null;
    }
    buf(m) {
      const key = m.isPal ? this.pal || m.m : m;
      let b = this.B.get(key);
      if (!b) this.B.set(key, (b = { p: [], n: [], u: [] }));
      return b;
    }
    // one triangle (a, b, c in house coordinates), normal n, uvs (metres) – palette colours take their swatch instead
    tri(m, a, b, c, n, ua, ub, uc) {
      this.triN(m, a, b, c, n, n, n, ua, ub, uc);
    }
    // feat/innen-real: a triangle with a normal per corner (the rounded soft boxes are shaded smoothly)
    triN(m, a, b, c, na, nb, nc, ua, ub, uc) {
      const B = this.buf(m),
        o = this.o;
      for (const [p, n, u] of [
        [a, na, ua],
        [b, nb, ub],
        [c, nc, uc],
      ]) {
        B.p.push(p[0] - o[0], p[2] - o[2], -(p[1] - o[1]));
        B.n.push(n[0], n[2], -n[1]);
        if (m.isPal) B.u.push(m.uv[0], m.uv[1]);
        else B.u.push(u ? u[0] : 0, u ? u[1] : 0);
      }
      this.tris++;
    }
    // a quad p0 p1 p2 p3 (in order round its edge) facing n; uv per corner (or none)
    quad(m, p0, p1, p2, p3, n, uv) {
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]],
        e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]],
        cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]],
        u = uv || [null, null, null, null];
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0) {
        this.tri(m, p0, p1, p2, n, u[0], u[1], u[2]);
        this.tri(m, p0, p2, p3, n, u[0], u[2], u[3]);
      } else {
        this.tri(m, p0, p2, p1, n, u[0], u[2], u[1]);
        this.tri(m, p0, p3, p2, n, u[0], u[3], u[2]);
      }
    }
    // a box x0..x1, y0..y1, z0..z1; o.a turns it about the vertical through its centre (rad, counter-clockwise from above);
    // o.skip: faces left out ('b' bottom, 't' top, 'x0', 'x1', 'y0', 'y1')
    box(m, x0, x1, y0, y1, z0, z1, o = {}) {
      if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
      // feat/innen-real: soft things are not boxes – a cushion, a mattress, a duvet, the seat and back of a sofa get rounded edges;
      // thin ones (a rug, a cloth, a paper) and those cut open (skip) stay as they were
      if (
        this.soft &&
        isSoft(m) &&
        !o.hard &&
        Math.min(x1 - x0, y1 - y0, z1 - z0) >= 0.035 &&
        !(o.skip || '').replace('b', '')
      )
        return this.rbox(m, x0, x1, y0, y1, z0, z1, o);
      const cx = (x0 + x1) / 2,
        cy = (y0 + y1) / 2,
        a = o.a || 0,
        c = Math.cos(a),
        s = Math.sin(a),
        hx = (x1 - x0) / 2,
        hy = (y1 - y0) / 2,
        P = (u, v, z) => [cx + u * c - v * s, cy + u * s + v * c, z],
        N = (u, v) => [u * c - v * s, u * s + v * c, 0],
        sk = o.skip || '';
      const A = P(-hx, -hy, 0),
        Bq = P(hx, -hy, 0),
        C = P(hx, hy, 0),
        D = P(-hx, hy, 0);
      const at = (p, z) => [p[0], p[1], z],
        w = x1 - x0,
        d = y1 - y0,
        h = z1 - z0;
      if (!sk.includes('t'))
        this.quad(
          m,
          at(A, z1),
          at(Bq, z1),
          at(C, z1),
          at(D, z1),
          [0, 0, 1],
          [
            [0, 0],
            [w, 0],
            [w, d],
            [0, d],
          ]
        );
      if (!sk.includes('b'))
        this.quad(
          m,
          at(A, z0),
          at(D, z0),
          at(C, z0),
          at(Bq, z0),
          [0, 0, -1],
          [
            [0, 0],
            [0, d],
            [w, d],
            [w, 0],
          ]
        );
      const side = (p, q, n, L) =>
        this.quad(m, at(p, z0), at(q, z0), at(q, z1), at(p, z1), n, [
          [0, z0],
          [L, z0],
          [L, z1],
          [0, z1],
        ]);
      if (!sk.includes('y0')) side(A, Bq, N(0, -1), w);
      if (!sk.includes('x1')) side(Bq, C, N(1, 0), d);
      if (!sk.includes('y1')) side(C, D, N(0, 1), w);
      if (!sk.includes('x0')) side(D, A, N(-1, 0), d);
      void h;
    }
    // feat/innen-real: a box with rounded edges and corners – radius o.r (else from its size), s steps over each rounding, smooth
    // normals; o.a turns it as box(); o.skip 'b' leaves the bottom out; a thin soft thing (a cushion, a pillow, a mattress, a duvet)
    // swells a little in the middle of its faces (o.puff, else from its size)
    rbox(m, x0, x1, y0, y1, z0, z1, o = {}) {
      const h = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2],
        c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
        mn = Math.min(h[0], h[1], h[2]),
        r = Math.min(o.r ?? Math.min(0.055, mn * 0.75), mn * 0.95),
        s = o.s || (Math.max(h[0], h[1], h[2]) > 0.35 && mn > 0.05 ? 2 : 1),
        a = o.a || 0,
        ca = Math.cos(a),
        sa = Math.sin(a),
        sk = (o.skip || '') + (o.bottom ? '' : 'b'), // (a soft thing's underside is not seen: left out)
        mid = h[0] + h[1] + h[2] - mn - Math.max(h[0], h[1], h[2]),
        puff = o.puff ?? (mn <= 0.1 && mid >= 0.12 ? mn * 0.28 : 0);
      // the grid along one axis: the rounding at both ends in s steps, one flat span between
      const axis = k => {
        const out = [];
        for (let i = 0; i <= s; i++) out.push(-h[k] + (r * i) / s);
        for (let i = s; i >= 0; i--) out.push(h[k] - (r * i) / s);
        return out.filter((v, i, A) => i === 0 || v - A[i - 1] > 1e-5);
      };
      const G = [axis(0), axis(1), axis(2)],
        inner = h.map(v => Math.max(0, v - r));
      // a point of the box's surface (centred frame) → the rounded point and its normal in the house frame; the swell is greatest in
      // the middle of a face and nothing at its edges (so the faces still meet)
      const put = (q, i, j, k) => {
        const iq = [0, 1, 2].map(e => Math.max(-inner[e], Math.min(inner[e], q[e]))),
          d = [q[0] - iq[0], q[1] - iq[1], q[2] - iq[2]],
          L = Math.hypot(d[0], d[1], d[2]) || 1,
          n = [d[0] / L, d[1] / L, d[2] / L],
          p = [iq[0] + n[0] * r, iq[1] + n[1] * r, iq[2] + n[2] * r];
        if (puff) {
          const fi = q[i] / h[i],
            fj = q[j] / h[j],
            f = (1 - fi * fi) * (1 - fj * fj),
            sg = Math.sign(q[k]);
          p[k] += sg * puff * f;
          // the normal tilts with the swell's slope
          n[i] -= (sg * puff * (-2 * fi * (1 - fj * fj))) / h[i];
          n[j] -= (sg * puff * (-2 * fj * (1 - fi * fi))) / h[j];
          const l = Math.hypot(n[0], n[1], n[2]) || 1;
          n[0] /= l;
          n[1] /= l;
          n[2] /= l;
        }
        return [
          [c[0] + p[0] * ca - p[1] * sa, c[1] + p[0] * sa + p[1] * ca, c[2] + p[2]],
          [n[0] * ca - n[1] * sa, n[0] * sa + n[1] * ca, n[2]],
        ];
      };
      for (const [k, sg, name] of [
        [2, 1, 't'],
        [2, -1, 'b'],
        [0, 1, 'x1'],
        [0, -1, 'x0'],
        [1, 1, 'y1'],
        [1, -1, 'y0'],
      ]) {
        if (sk.includes(name)) continue;
        const i = k === 0 ? 1 : 0,
          j = k === 2 ? 1 : 2,
          A = G[i],
          Bv = G[j],
          // (i, j, k) an even permutation: the corners in order turn counter-clockwise about +k
          ccw = (k === 1 ? -1 : 1) * sg > 0;
        for (let ia = 0; ia < A.length - 1; ia++)
          for (let ib = 0; ib < Bv.length - 1; ib++) {
            const Q = [
                [ia, ib],
                [ia + 1, ib],
                [ia + 1, ib + 1],
                [ia, ib + 1],
              ].map(([u, v]) => {
                const q = [0, 0, 0];
                q[k] = sg * h[k];
                q[i] = A[u];
                q[j] = Bv[v];
                return q;
              }),
              P = Q.map(q => put(q, i, j, k)),
              U = Q.map(q => (k === 2 ? [q[0] + h[0], q[1] + h[1]] : [q[i] + h[i], q[2] + c[2]]));
            if (ccw) {
              this.triN(m, P[0][0], P[1][0], P[2][0], P[0][1], P[1][1], P[2][1], U[0], U[1], U[2]);
              this.triN(m, P[0][0], P[2][0], P[3][0], P[0][1], P[2][1], P[3][1], U[0], U[2], U[3]);
            } else {
              this.triN(m, P[0][0], P[2][0], P[1][0], P[0][1], P[2][1], P[1][1], U[0], U[2], U[1]);
              this.triN(m, P[0][0], P[3][0], P[2][0], P[0][1], P[3][1], P[2][1], U[0], U[3], U[2]);
            }
          }
      }
    }
    // a vertical body of revolution: profile [[r, z] …] around (x, y); seg segments; caps where r > 0 at the ends
    lathe(m, x, y, prof, seg = 12, o = {}) {
      const sx = o.sx || 1,
        sy = o.sy || 1;
      for (let i = 0; i < prof.length - 1; i++) {
        const [r0, z0] = prof[i],
          [r1, z1] = prof[i + 1];
        for (let k = 0; k < seg; k++) {
          const a0 = (k / seg) * Math.PI * 2,
            a1 = ((k + 1) / seg) * Math.PI * 2,
            p = (r, a, z) => [x + Math.cos(a) * r * sx, y + Math.sin(a) * r * sy, z],
            am = (a0 + a1) / 2,
            dz = z1 - z0,
            dr = r1 - r0,
            L = Math.hypot(dz, dr) || 1,
            n = [(Math.cos(am) * dz) / L, (Math.sin(am) * dz) / L, -dr / L];
          if (r0 < 1e-4 && r1 < 1e-4) continue;
          this.quad(m, p(r0, a0, z0), p(r0, a1, z0), p(r1, a1, z1), p(r1, a0, z1), n, [
            [a0 * r0, z0],
            [a1 * r0, z0],
            [a1 * r1, z1],
            [a0 * r1, z1],
          ]);
        }
      }
      const cap = (r, z, up) => {
        if (r < 1e-4) return;
        for (let k = 0; k < seg; k++) {
          const a0 = (k / seg) * Math.PI * 2,
            a1 = ((k + 1) / seg) * Math.PI * 2,
            c = [x, y, z],
            p0 = [x + Math.cos(a0) * r * sx, y + Math.sin(a0) * r * sy, z],
            p1 = [x + Math.cos(a1) * r * sx, y + Math.sin(a1) * r * sy, z];
          if (up) this.tri(m, c, p0, p1, [0, 0, 1], [0, 0], [p0[0] - x, p0[1] - y], [p1[0] - x, p1[1] - y]);
          else this.tri(m, c, p1, p0, [0, 0, -1], [0, 0], [p1[0] - x, p1[1] - y], [p0[0] - x, p0[1] - y]);
        }
      };
      if (o.caps !== false) {
        cap(prof[0][0], prof[0][1], false);
        cap(prof[prof.length - 1][0], prof[prof.length - 1][1], true);
      }
    }
    cyl(m, x, y, z0, z1, r0, r1 = r0, seg = 10, o) {
      this.lathe(
        m,
        x,
        y,
        [
          [r0, z0],
          [r1, z1],
        ],
        seg,
        o
      );
    }
    // a horizontal cylinder from p to q (a rod, a rail, a pipe), radius r
    rod(m, p, q, r, seg = 6) {
      const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]],
        L = Math.hypot(...d) || 1,
        t = d.map(v => v / L),
        a = Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0],
        u = [t[1] * a[2] - t[2] * a[1], t[2] * a[0] - t[0] * a[2], t[0] * a[1] - t[1] * a[0]],
        ul = Math.hypot(...u),
        e1 = u.map(v => v / ul),
        e2 = [t[1] * e1[2] - t[2] * e1[1], t[2] * e1[0] - t[0] * e1[2], t[0] * e1[1] - t[1] * e1[0]];
      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI * 2,
          a1 = ((k + 1) / seg) * Math.PI * 2,
          off = a => [0, 1, 2].map(i => (Math.cos(a) * e1[i] + Math.sin(a) * e2[i]) * r),
          o0 = off(a0),
          o1 = off(a1),
          am = (a0 + a1) / 2,
          n = [0, 1, 2].map(i => Math.cos(am) * e1[i] + Math.sin(am) * e2[i]);
        this.quad(
          m,
          [p[0] + o0[0], p[1] + o0[1], p[2] + o0[2]],
          [p[0] + o1[0], p[1] + o1[1], p[2] + o1[2]],
          [q[0] + o1[0], q[1] + o1[1], q[2] + o1[2]],
          [q[0] + o0[0], q[1] + o0[1], q[2] + o0[2]],
          n
        );
      }
    }
    // a flat picture / panel: centre c, along unit a (horizontal), up z, size w × h, facing n; uv window [u0, v0, u1, v1] of a texture
    panel(m, c, a, n, w, h, uvw) {
      const [u0, v0, u1, v1] = uvw || [0, 0, w, h],
        P = (s, t) => [c[0] + a[0] * s, c[1] + a[1] * s, c[2] + t];
      this.quad(m, P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2), n, [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ]);
    }
    // the meshes: one per material, in group g (castShadow as asked); returns them
    finish(g, cast = false) {
      const out = [];
      for (const [m, b] of this.B) {
        if (!b.p.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
        geo.computeBoundingSphere();
        const me = new THREE.Mesh(geo, m);
        me.castShadow = cast;
        me.receiveShadow = true;
        me.userData.noMerge = true;
        me.matrixAutoUpdate = false;
        me.updateMatrix();
        g.add(me);
        out.push(me);
      }
      this.B.clear();
      return out;
    }
  }
  // ---- plain colours: palette swatches (one material for all of them), a plain material where the palette is full ----
  const COLS = new Map(),
    SOFTM = new WeakSet();
  // feat/innen-real: what is soft (a fabric: cushions, mattresses, duvets, upholstery – rounded by a furniture mesher): a matt colour
  // (rough ≥ 0.9, no metal) unless col() is told otherwise, and the kit's textured fabrics (velour, check, the duvet)
  const isSoft = m => !!m && (m.soft === true || SOFTM.has(m));
  function col(hex, rough = 0.7, metal = 0, soft) {
    // feat/innen-real: metal indoors shows the room around it, not the sky outside – fully metallic, every sink, tap and hood looked blue
    // (the sky's light in the reflections); brushed steel, chrome and brass are given a matter, half-metallic finish
    if (metal > 0.5) {
      metal = 0.5;
      rough = Math.max(rough, 0.34);
    }
    // (and a glossy surface – black glass, enamel, porcelain – no sharp mirror of the sky either)
    if (rough < 0.22) rough = 0.22;
    const key = hex + '|' + rough + '|' + metal + (soft === false ? '|h' : '');
    let c = COLS.get(key);
    if (!c) {
      const uv = PAL.uv({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
      c = uv ? { isPal: true, uv, m: PAL.M.front } : plain({ color: hex, roughness: rough, metalness: metal });
      if (soft ?? (rough >= 0.9 && metal === 0)) {
        if (c.isPal) c.soft = true;
        else SOFTM.add(c);
      }
      COLS.set(key, c);
    }
    return c;
  }
  // ---- canvas textures (drawn once, shared) ----
  const TEX = [];
  function ctex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = ANISO;
    TEX.push(t);
    return t;
  }
  // a texture is laid out in metres: its matrix scales metres to the image (rep = how many metres one image covers)
  function scaled(t, mx, my) {
    t.repeat.set(1 / mx, 1 / my);
    return t;
  }
  let R0s = 9173;
  const R0 = () => (R0s = (R0s * 16807) % 2147483647) / 2147483647;
  const DRAW = {
    // wallpaper: rose stripes (alt, stube-2/stube-17), woven orange-brown (DDR, ddr-6/7), red floral (ddr-21), stencil pattern (kammer-8/9)
    tapeteStreifen(q, w, h) {
      q.fillStyle = '#efe4d2';
      q.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        q.fillStyle = 'rgba(176,96,96,0.28)';
        q.fillRect(x + 4, 0, 6, h);
        q.fillStyle = 'rgba(150,120,80,0.18)';
        q.fillRect(x + 19, 0, 2, h);
        for (let y = 8; y < h; y += 40) {
          q.fillStyle = 'rgba(170,70,80,0.55)';
          q.beginPath();
          q.arc(x + 26, y + (x % 64 ? 20 : 0), 3.2, 0, 6.3);
          q.fill();
          q.fillStyle = 'rgba(90,120,70,0.5)';
          q.fillRect(x + 23, y + 4 + (x % 64 ? 20 : 0), 6, 2);
        }
      }
    },
    tapeteDDR(q, w, h) {
      q.fillStyle = '#c8823e';
      q.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4)
        for (let x = 0; x < w; x += 4) {
          const k = (Math.floor(x / 16) + Math.floor(y / 8)) % 3;
          q.fillStyle = k === 0 ? 'rgba(232,170,90,0.55)' : k === 1 ? 'rgba(150,80,30,0.35)' : 'rgba(210,140,60,0.25)';
          q.fillRect(x, y, 4, 3);
        }
      for (let i = 0; i < 1600; i++) {
        q.fillStyle = `rgba(${R0() > 0.5 ? '255,225,170' : '90,45,15'},${0.08 + R0() * 0.12})`;
        q.fillRect(R0() * w, R0() * h, 1 + R0() * 6, 1);
      }
    },
    tapeteBlume(q, w, h) {
      q.fillStyle = '#efe1cf';
      q.fillRect(0, 0, w, h);
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          const x = i * (w / 4) + (j % 2 ? w / 8 : 0),
            y = j * (h / 4) + h / 8;
          q.fillStyle = 'rgba(190,80,50,0.75)';
          for (let k = 0; k < 6; k++) {
            q.beginPath();
            q.ellipse(x + Math.cos(k) * 9, y + Math.sin(k) * 9, 8, 5, k, 0, 6.3);
            q.fill();
          }
          q.fillStyle = 'rgba(230,170,70,0.9)';
          q.beginPath();
          q.arc(x, y, 5, 0, 6.3);
          q.fill();
          q.strokeStyle = 'rgba(120,110,60,0.5)';
          q.lineWidth = 2;
          q.beginPath();
          q.moveTo(x, y + 12);
          q.quadraticCurveTo(x + 14, y + 30, x + 4, y + 46);
          q.stroke();
        }
    },
    schablone(q, w, h) {
      q.fillStyle = '#e9e4d8';
      q.fillRect(0, 0, w, h);
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++) {
          const x = (i + 0.5) * (w / 2) + (j % 2 ? w / 4 : 0),
            y = (j + 0.5) * (h / 2);
          q.strokeStyle = 'rgba(60,80,120,0.55)';
          q.lineWidth = 3;
          q.beginPath();
          q.arc(x, y, 26, 0, 6.3);
          q.stroke();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * 6.28;
            q.fillStyle = k % 2 ? 'rgba(150,90,70,0.5)' : 'rgba(60,80,120,0.5)';
            q.beginPath();
            q.ellipse(x + Math.cos(a) * 40, y + Math.sin(a) * 40, 9, 4, a, 0, 6.3);
            q.fill();
          }
        }
    },
    // floors: boards (Dielen), linoleum green (kueche-23), laminate beech, stone flags (hohenfelden-2), brick (Ziegel), tiles blue/white (bad-3)
    linoleum(q, w, h) {
      q.fillStyle = '#7f8f6a';
      q.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        q.fillStyle = `rgba(${R0() > 0.5 ? '210,215,180' : '50,60,40'},${0.1 + R0() * 0.2})`;
        q.fillRect(R0() * w, R0() * h, 1 + R0() * 4, 1 + R0() * 2);
      }
      q.strokeStyle = 'rgba(40,50,30,0.25)';
      for (let x = 0; x <= w; x += w / 4) {
        q.beginPath();
        q.moveTo(x, 0);
        q.lineTo(x, h);
        q.stroke();
      }
    },
    laminat(q, w, h) {
      for (let r = 0; r < 8; r++) {
        let x = -R0() * w;
        while (x < w) {
          const L = w * (0.45 + R0() * 0.4),
            k = 0.9 + R0() * 0.18;
          q.fillStyle = `rgb(${Math.round(200 * k)},${Math.round(160 * k)},${Math.round(114 * k)})`;
          q.fillRect(x, (r * h) / 8, L, h / 8);
          for (let s = 0; s < 6; s++) {
            q.fillStyle = 'rgba(120,80,40,0.12)';
            q.fillRect(x, (r * h) / 8 + R0() * (h / 8), L, 1);
          }
          q.fillStyle = 'rgba(60,40,20,0.35)';
          q.fillRect(x, (r * h) / 8, 1, h / 8);
          x += L;
        }
        q.fillStyle = 'rgba(60,40,20,0.3)';
        q.fillRect(0, (r * h) / 8, w, 1);
      }
    },
    platten(q, w, h) {
      q.fillStyle = '#6f685d';
      q.fillRect(0, 0, w, h);
      const n = 3;
      for (let j = 0; j < n; j++) {
        let x = j % 2 ? -w / 6 : 0;
        while (x < w) {
          const L = w / n + (R0() - 0.5) * 30,
            k = 0.85 + R0() * 0.25;
          q.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(142 * k)},${Math.round(126 * k)})`;
          q.fillRect(x + 2, (j * h) / n + 2, L - 4, h / n - 4);
          for (let i = 0; i < 80; i++) {
            q.fillStyle = `rgba(0,0,0,${R0() * 0.08})`;
            q.fillRect(x + R0() * L, (j * h) / n + R0() * (h / n), 3, 3);
          }
          x += L;
        }
      }
    },
    fliesen(q, w, h) {
      const n = 4;
      q.fillStyle = '#c9cfd0';
      q.fillRect(0, 0, w, h);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          q.fillStyle = (i + j) % 2 ? '#9dc3dc' : '#f2f4f2';
          q.fillRect((i * w) / n + 2, (j * h) / n + 2, w / n - 3, h / n - 3);
        }
    },
    // the tiled stove: glazed tiles with a raised frame (coloured by the material: green, brown, cream – ofen-1/4/14)
    kacheln(q, w, h) {
      q.fillStyle = '#d8d8d8';
      q.fillRect(0, 0, w, h);
      const n = 2;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x = (i * w) / n,
            y = (j * h) / n,
            s = w / n;
          const g = q.createRadialGradient(x + s / 2, y + s / 2, s * 0.1, x + s / 2, y + s / 2, s * 0.7);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, '#b8b8b8');
          q.fillStyle = g;
          q.fillRect(x + 4, y + 4, s - 8, s - 8);
          q.strokeStyle = 'rgba(255,255,255,0.8)';
          q.lineWidth = 4;
          q.strokeRect(x + 12, y + 12, s - 24, s - 24);
          q.strokeStyle = 'rgba(0,0,0,0.25)';
          q.lineWidth = 3;
          q.strokeRect(x + 16, y + 16, s - 32, s - 32);
          q.fillStyle = 'rgba(0,0,0,0.5)';
          q.fillRect(x, y, s, 3);
          q.fillRect(x, y, 3, s);
        }
    },
    // fabrics: DDR table cloth (white, red and grey grid, ddr-6/7), Persian rug (ddr-13/17), floral velour (ddr-6), red check (kammer-7)
    decke(q, w, h) {
      q.fillStyle = '#f3efe6';
      q.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        q.fillStyle = 'rgba(120,120,120,0.55)';
        q.fillRect((i * w) / 8, 0, 2, h);
        q.fillRect(0, (i * h) / 8, w, 2);
        for (let j = 0; j < 8; j++)
          if ((i + j) % 3 === 0) {
            q.fillStyle = 'rgba(190,40,40,0.8)';
            q.fillRect((i * w) / 8 + 6, (j * h) / 8 + 6, 10, 10);
          }
      }
    },
    perser(q, w, h) {
      q.fillStyle = '#7a2420';
      q.fillRect(0, 0, w, h);
      q.strokeStyle = '#d8c39a';
      q.lineWidth = 6;
      q.strokeRect(10, 10, w - 20, h - 20);
      q.strokeStyle = '#1f2a4a';
      q.lineWidth = 10;
      q.strokeRect(24, 24, w - 48, h - 48);
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 3; i++) {
          const x = w * (0.25 + i * 0.25),
            y = h * (0.25 + j * 0.25);
          q.fillStyle = (i + j) % 2 ? '#d8c39a' : '#1f2a4a';
          q.beginPath();
          q.moveTo(x, y - 26);
          q.lineTo(x + 20, y);
          q.lineTo(x, y + 26);
          q.lineTo(x - 20, y);
          q.fill();
        }
      for (let i = 0; i < 2500; i++) {
        q.fillStyle = `rgba(0,0,0,${R0() * 0.12})`;
        q.fillRect(R0() * w, R0() * h, 2, 2);
      }
    },
    velours(q, w, h) {
      q.fillStyle = '#8a6a4a';
      q.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = R0() * w,
          y = R0() * h,
          r = 8 + R0() * 12;
        q.fillStyle = R0() > 0.5 ? 'rgba(220,200,160,0.6)' : 'rgba(90,60,35,0.6)';
        for (let k = 0; k < 5; k++) {
          q.beginPath();
          q.ellipse(x + Math.cos(k * 1.25) * r, y + Math.sin(k * 1.25) * r, r * 0.7, r * 0.4, k * 1.25, 0, 6.3);
          q.fill();
        }
      }
    },
    karo(q, w, h) {
      q.fillStyle = '#f6f1ea';
      q.fillRect(0, 0, w, h);
      const n = 8,
        s = w / n;
      for (let i = 0; i < n; i++)
        if (i % 2 === 0) {
          q.fillStyle = 'rgba(184,40,40,0.55)';
          q.fillRect(i * s, 0, s, h);
          q.fillRect(0, i * s, w, s);
        }
    },
    // four pictures in one image: the roaring stag (Röhrender Hirsch), a framed Bible verse (kammer-7), the embroidered wall cloth of the
    // kitchen (stube-13), a Thuringian Forest landscape
    bilder(q, w) {
      const S = w / 2;
      // feat/innen-real: the two paintings painted, not drawn – layers far to near (paler and bluer with distance), soft clouds and mist,
      // then a few thousand short strokes of the colour under them (the brushwork of an oil print); before, flat shapes like a comic
      // a ridge from x0 to x1: its line at y = base + two waves, filled down to yb
      const ridge = (x0, x1, base, amp, f, ph, col, yb) => {
          q.fillStyle = col;
          q.beginPath();
          q.moveTo(x0, yb);
          for (let x = x0; x <= x1 + 0.1; x += 3)
            q.lineTo(x, base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 1.9) * amp * 0.35);
          q.lineTo(x1, yb);
          q.fill();
          return x => base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 1.9) * amp * 0.35;
        },
        // spruces along a line: narrow dark triangles of varied height
        spruces = (x0, x1, line, h0, h1, col, step) => {
          for (let x = x0 - 4; x < x1 + 4; x += step * (0.6 + R0() * 0.8)) {
            const y = line(x) + 2,
              h = h0 + R0() * (h1 - h0),
              b = h * 0.22;
            q.fillStyle = col;
            q.beginPath();
            q.moveTo(x, y - h);
            q.lineTo(x - b, y);
            q.lineTo(x + b, y);
            q.fill();
          }
        },
        soft = (px, draw) => {
          q.save();
          q.filter = 'blur(' + px + 'px)';
          draw();
          q.restore();
        },
        // the brushwork: short strokes in the colour found under them, a little lighter or darker, mostly across
        brush = (x0, y0, n, len, wid, steep) => {
          const d = q.getImageData(x0, y0, S, S).data;
          q.save();
          q.beginPath();
          q.rect(x0, y0, S, S);
          q.clip();
          q.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const x = R0() * S,
              y = R0() * S,
              k = ((y | 0) * S + (x | 0)) * 4,
              j = (R0() - 0.5) * 22,
              a = (steep && steep(x, y) ? Math.PI / 2 : 0) + (R0() - 0.5) * 0.7,
              l = len * (0.5 + R0());
            q.strokeStyle = `rgba(${Math.max(0, Math.min(255, d[k] + j)) | 0},${Math.max(0, Math.min(255, d[k + 1] + j)) | 0},${
              Math.max(0, Math.min(255, d[k + 2] + j)) | 0
            },0.55)`;
            q.lineWidth = wid * (0.6 + R0() * 0.8);
            q.beginPath();
            q.moveTo(x0 + x - (Math.cos(a) * l) / 2, y0 + y - (Math.sin(a) * l) / 2);
            q.lineTo(x0 + x + (Math.cos(a) * l) / 2, y0 + y + (Math.sin(a) * l) / 2);
            q.stroke();
          }
          q.restore();
        };
      {
        // the roaring stag at sundown (Röhrender Hirsch, the print over many a couch): the sky, the sun behind the far hills, a lake, the
        // forest, the stag on the meadow in front
        const hz = S * 0.6;
        const g = q.createLinearGradient(0, 0, 0, hz);
        g.addColorStop(0, '#3b3a5c');
        g.addColorStop(0.42, '#a8605c');
        g.addColorStop(0.78, '#eea85e');
        g.addColorStop(1, '#f6d58e');
        q.fillStyle = g;
        q.fillRect(0, 0, S, S);
        const sg = q.createRadialGradient(S * 0.64, hz - 6, 2, S * 0.64, hz - 6, S * 0.5);
        sg.addColorStop(0, 'rgba(255,244,200,1)');
        sg.addColorStop(0.12, 'rgba(255,220,150,0.7)');
        sg.addColorStop(1, 'rgba(255,200,120,0)');
        q.fillStyle = sg;
        q.fillRect(0, 0, S, hz + 10);
        soft(4, () => {
          for (const [cx, cy, rx, ry, c] of [
            [50, 46, 80, 9, 'rgba(110,70,96,0.6)'],
            [190, 70, 90, 8, 'rgba(140,76,84,0.55)'],
            [96, 104, 100, 7, 'rgba(236,150,104,0.55)'],
            [210, 122, 60, 5, 'rgba(250,196,130,0.6)'],
          ]) {
            q.fillStyle = c;
            q.beginPath();
            q.ellipse(cx, cy, rx, ry, 0, 0, 6.3);
            q.fill();
          }
        });
        ridge(0, S, hz - 18, 9, 0.025, 1.3, '#8a6a86', hz + 2);
        const mid = ridge(0, S, hz - 4, 6, 0.04, 0.2, '#4a4a5a', hz + 2);
        spruces(0, S, mid, 8, 16, '#3c4048', 4);
        // the lake: the sky upside down, darker, with ripples of light
        const lg = q.createLinearGradient(0, hz, 0, S * 0.8);
        lg.addColorStop(0, '#e8b070');
        lg.addColorStop(1, '#6a4a5a');
        q.fillStyle = lg;
        q.fillRect(0, hz, S, S * 0.8 - hz);
        for (let i = 0; i < 40; i++) {
          const y = hz + 2 + R0() * (S * 0.8 - hz - 4),
            x = S * 0.64 + (R0() - 0.5) * (30 + (y - hz) * 1.6);
          q.fillStyle = `rgba(255,236,190,${0.25 + R0() * 0.4})`;
          q.fillRect(x, y, 6 + R0() * 18, 1.4);
        }
        // the near forest down to the water on the left, mist over the shore
        const near = ridge(0, S * 0.45, hz + 8, 10, 0.05, 2.2, '#1f2a22', S * 0.8);
        spruces(0, S * 0.42, near, 30, 62, '#18221b', 7);
        soft(5, () => {
          q.fillStyle = 'rgba(250,226,190,0.45)';
          q.fillRect(0, S * 0.76, S, 8);
        });
        // the meadow in front
        const mg = q.createLinearGradient(0, S * 0.78, 0, S);
        mg.addColorStop(0, '#5a4a2a');
        mg.addColorStop(1, '#2a2416');
        q.fillStyle = mg;
        q.beginPath();
        q.moveTo(0, S);
        for (let x = 0; x <= S; x += 4) q.lineTo(x, S * 0.8 + Math.sin(x * 0.03) * 3);
        q.lineTo(S, S);
        q.fill();
        // the stag: dark against the light water, head up, roaring
        q.fillStyle = '#2a1a10';
        q.beginPath();
        q.ellipse(150, 196, 30, 13, -0.05, 0, 6.3);
        q.fill();
        for (const [x, d] of [
          [128, 0],
          [136, 4],
          [162, 2],
          [170, 5],
        ]) {
          q.beginPath();
          q.moveTo(x - 3, 200);
          q.lineTo(x + 3, 200);
          q.lineTo(x + 2 + d * 0.3, 232);
          q.lineTo(x - 1 + d * 0.3, 232);
          q.fill();
        }
        q.beginPath();
        q.moveTo(170, 192);
        q.lineTo(184, 160);
        q.lineTo(194, 150);
        q.lineTo(204, 146);
        q.lineTo(203, 154);
        q.lineTo(194, 164);
        q.lineTo(182, 200);
        q.fill();
        q.strokeStyle = '#3a2618';
        q.lineCap = 'round';
        q.lineWidth = 2.2;
        for (const s of [-1, 1]) {
          q.beginPath();
          q.moveTo(193, 150);
          q.quadraticCurveTo(186 + s * 6, 132, 176 + s * 16, 112);
          q.moveTo(188 + s * 2, 136);
          q.lineTo(196 + s * 10, 128);
          q.moveTo(182 + s * 8, 124);
          q.lineTo(190 + s * 18, 116);
          q.moveTo(178 + s * 12, 116);
          q.lineTo(170 + s * 18, 104);
          q.stroke();
        }
        // its breath in the cold evening
        soft(2, () => {
          q.fillStyle = 'rgba(255,240,220,0.5)';
          q.beginPath();
          q.ellipse(212, 140, 8, 4, -0.6, 0, 6.3);
          q.fill();
        });
        brush(0, 0, 5200, 7, 2.6, (x, y) => y > S * 0.62 && x < S * 0.42 && y < S * 0.78);
      }
      {
        q.fillStyle = '#efe6d0';
        q.fillRect(S, 0, S, S);
        q.strokeStyle = '#8a6a3a';
        q.lineWidth = 3;
        q.strokeRect(S + 14, 14, S - 28, S - 28);
        q.fillStyle = '#2a2a3a';
        q.textAlign = 'center';
        q.font = 'italic bold 22px serif';
        q.fillText('Auch in dunkler', S + S / 2, 92);
        q.fillText('Nacht', S + S / 2, 124);
        q.fillText('Gottes Auge wacht', S + S / 2, 156);
        q.fillStyle = '#6a8a4a';
        for (let i = 0; i < 6; i++) {
          q.beginPath();
          q.ellipse(S + 60 + i * 28, 200, 9, 4, i, 0, 6.3);
          q.fill();
        }
      }
      {
        q.fillStyle = '#f2ece0';
        q.fillRect(0, S, S, S);
        q.strokeStyle = '#3a5a9a';
        q.lineWidth = 4;
        q.strokeRect(10, S + 10, S - 20, S - 20);
        q.fillStyle = '#3a5a9a';
        q.textAlign = 'center';
        q.font = 'bold 26px serif';
        q.fillText('Erst besinn’s,', S / 2, S + 104);
        q.fillText('dann beginn’s.', S / 2, S + 146);
        for (let i = 0; i < 9; i++) {
          q.fillStyle = i % 2 ? '#c84a4a' : '#3a5a9a';
          q.fillRect(30 + i * 22, S + 196, 12, 12);
        }
      }
      {
        // a landscape of the Thuringian Forest: summer sky with clouds, blue ridges far off, the forest, a village with its church on the
        // slope, fields and a path in front
        const X = S,
          Y = S,
          g = q.createLinearGradient(0, Y, 0, Y + S * 0.55);
        g.addColorStop(0, '#7fa6cf');
        g.addColorStop(1, '#dfe8e6');
        q.fillStyle = g;
        q.fillRect(X, Y, S, S);
        soft(3, () => {
          for (let i = 0; i < 7; i++) {
            const cx = X + 20 + R0() * (S - 40),
              cy = Y + 24 + R0() * 50;
            for (let k = 0; k < 5; k++) {
              q.fillStyle = `rgba(255,255,255,${0.5 + R0() * 0.35})`;
              q.beginPath();
              q.ellipse(cx + (k - 2) * 9, cy - (k % 2) * 5, 14 + R0() * 8, 7 + R0() * 4, 0, 0, 6.3);
              q.fill();
            }
          }
        });
        ridge(X, X + S, Y + S * 0.48, 7, 0.03, 0.4, '#9aaec4', Y + S);
        const r2 = ridge(X, X + S, Y + S * 0.55, 10, 0.026, 2.0, '#6f8a86', Y + S);
        spruces(X, X + S, r2, 5, 10, '#55716a', 3);
        const r3 = ridge(X, X + S, Y + S * 0.64, 12, 0.02, 4.1, '#3f5f3a', Y + S);
        spruces(X, X + S * 0.55, r3, 10, 20, '#2f4a2c', 4);
        // meadows and fields on the near slope
        ridge(X, X + S, Y + S * 0.72, 8, 0.022, 1.0, '#8fae54', Y + S);
        for (let i = 0; i < 9; i++) {
          q.save();
          q.translate(X + 20 + R0() * (S - 40), Y + S * 0.76 + R0() * S * 0.16);
          q.rotate((R0() - 0.5) * 0.3);
          q.fillStyle = R0() > 0.5 ? 'rgba(214,196,96,0.85)' : 'rgba(120,150,70,0.8)';
          q.fillRect(-22, -5, 44 + R0() * 20, 10 + R0() * 6);
          q.restore();
        }
        // the village: white walls, red roofs, the church tower with its slate spire
        const vx = X + S * 0.62,
          vy = Y + S * 0.7;
        for (let i = 0; i < 7; i++) {
          const x = vx + (i - 3) * 11 + R0() * 4,
            y = vy + (i % 3) * 4;
          q.fillStyle = '#efe8da';
          q.fillRect(x, y, 9, 6);
          q.fillStyle = '#a8442e';
          q.beginPath();
          q.moveTo(x - 1.5, y);
          q.lineTo(x + 4.5, y - 5);
          q.lineTo(x + 10.5, y);
          q.fill();
        }
        q.fillStyle = '#f2ecdf';
        q.fillRect(vx + 2, vy - 16, 6, 18);
        q.fillStyle = '#4a4e58';
        q.beginPath();
        q.moveTo(vx + 1, vy - 16);
        q.lineTo(vx + 5, vy - 30);
        q.lineTo(vx + 9, vy - 16);
        q.fill();
        // round trees by the path, the path itself
        q.strokeStyle = '#d8c69a';
        q.lineWidth = 5;
        q.beginPath();
        q.moveTo(X + S * 0.3, Y + S);
        q.quadraticCurveTo(X + S * 0.42, Y + S * 0.86, X + S * 0.58, Y + S * 0.76);
        q.stroke();
        for (const [tx, ty, r] of [
          [X + 30, Y + S * 0.84, 16],
          [X + 52, Y + S * 0.88, 12],
          [X + S - 40, Y + S * 0.9, 20],
        ]) {
          q.fillStyle = '#4a3a2a';
          q.fillRect(tx - 1.5, ty, 3, r * 0.9);
          for (let k = 0; k < 6; k++) {
            q.fillStyle = k % 2 ? '#3f6a32' : '#57843e';
            q.beginPath();
            q.arc(tx + (R0() - 0.5) * r, ty - (R0() * r) / 2, r * (0.5 + R0() * 0.3), 0, 6.3);
            q.fill();
          }
        }
        brush(X, Y, 5200, 6, 2.4, null);
      }
    },
    // feat/innen-real: a blurred square for the laid-on shade: full in the middle half, falling off smoothly over the outer quarters
    schatten(q, w, h) {
      const img = q.createImageData(w, h),
        f = t => (t >= 1 ? 1 : t * t * (3 - 2 * t));
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const a = f(Math.min(x + 0.5, w - x - 0.5) / (w / 4)) * f(Math.min(y + 0.5, h - y - 0.5) / (h / 4)),
            i = (y * w + x) * 4,
            g = Math.round(255 * a);
          img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
          img.data[i + 3] = 255;
        }
      q.putImageData(img, 0, 0);
    },
    // the veneer of a Schrankwand / Eiche rustikal: wood grain, light and dark lines (coloured by the material)
    furnier(q, w, h) {
      q.fillStyle = '#d8d8d8';
      q.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 2) {
        const k = 0.75 + 0.25 * Math.sin(x * 0.11) * Math.sin(x * 0.023 + 1) + (R0() - 0.5) * 0.1;
        q.fillStyle = `rgba(${Math.round(255 * k)},${Math.round(255 * k)},${Math.round(255 * k)},0.6)`;
        q.fillRect(x, 0, 2, h);
      }
      for (let i = 0; i < 40; i++) {
        q.strokeStyle = 'rgba(60,40,20,0.18)';
        q.lineWidth = 1;
        const x = R0() * w;
        q.beginPath();
        q.moveTo(x, 0);
        q.bezierCurveTo(x + 10, h * 0.3, x - 10, h * 0.6, x + 4, h);
        q.stroke();
      }
    },
  };
  // ---- materials (made at the first mount; the same shader settings as materials the model has already: no new programs) ----
  const M = { ready: false };
  // feat/innen-real: woodchip paper (Raufaser), drawn once: chips of 1–4 mm scattered over a tile of half a metre (seamless), their
  // shoulders softened; the colour a faint shading of the chips, the relief a normal map made from their heights (512² each, ≈ 3 MB
  // with mipmaps; on a phone 256² over a quarter of a metre, < 1 MB; freed with the kit's other drawn textures)
  let RFT = null;
  function woodchip() {
    if (RFT) return RFT;
    const small = COARSE || (window.TEXHALF && window.TEXHALF.level > 0),
      W = small ? 256 : 512,
      cv = document.createElement('canvas');
    cv.width = cv.height = W;
    const q = cv.getContext('2d');
    q.fillStyle = '#000';
    q.fillRect(0, 0, W, W);
    for (let i = 0, n = (22000 * W * W) / (512 * 512); i < n; i++) {
      const x = R0() * W,
        y = R0() * W,
        rx = 0.6 + R0() * 1.7,
        ry = rx * (0.35 + R0() * 0.65),
        a = R0() * Math.PI,
        v = (90 + R0() * 165) | 0;
      q.fillStyle = `rgb(${v},${v},${v})`;
      for (const ox of [-W, 0, W])
        for (const oy of [-W, 0, W]) {
          const px = x + ox,
            py = y + oy;
          if (px < -4 || px > W + 4 || py < -4 || py > W + 4) continue;
          q.beginPath();
          q.ellipse(px, py, rx, ry, a, 0, 6.3);
          q.fill();
        }
    }
    const d = q.getImageData(0, 0, W, W).data,
      raw = new Float32Array(W * W),
      h = new Float32Array(W * W),
      at = (x, y) => ((y + W) % W) * W + ((x + W) % W);
    for (let i = 0; i < W * W; i++) raw[i] = d[i * 4] / 255;
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += raw[at(x + dx, y + dy)];
        h[y * W + x] = s / 9;
      }
    const image = fill => {
        const c = document.createElement('canvas');
        c.width = c.height = W;
        const g = c.getContext('2d'),
          img = g.createImageData(W, W);
        fill(img.data);
        g.putImageData(img, 0, 0);
        return c;
      },
      tex = (c, srgb) => {
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = ANISO;
        t.repeat.set(1024 / W, 1024 / W); // (half a metre per tile – a quarter on a phone: a pixel a millimetre)
        TEX.push(t);
        return t;
      };
    let lin = 0;
    const col = image(o => {
        for (let i = 0; i < W * W; i++) {
          const v = Math.round(232 + h[i] * 16);
          o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = v;
          o[i * 4 + 3] = 255;
          lin += Math.pow((v / 255 + 0.055) / 1.055, 2.4);
        }
      }),
      K = 2.2,
      nrm = image(o => {
        for (let y = 0; y < W; y++)
          for (let x = 0; x < W; x++) {
            const i = y * W + x,
              gx = (h[at(x + 1, y)] - h[at(x - 1, y)]) * K,
              gy = (h[at(x, y + 1)] - h[at(x, y - 1)]) * K,
              l = Math.hypot(gx, gy, 1);
            o[i * 4] = Math.round((-gx / l) * 127.5 + 127.5);
            o[i * 4 + 1] = Math.round((gy / l) * 127.5 + 127.5);
            o[i * 4 + 2] = Math.round((1 / l) * 127.5 + 127.5);
            o[i * 4 + 3] = 255;
          }
      });
    return (RFT = { map: tex(col, true), nrm: tex(nrm, false), mean: lin / (W * W) });
  }
  function mats() {
    if (M.ready) return M;
    const T = (name, w, h, mx, my, srgb) => scaled(ctex(w, h, DRAW[name], srgb), mx, my);
    // walls and floors: as KM.tiles (canvas map, sky light dimmed 0.75 / 0.4) – that program exists (the bungalow's bath)
    const room = (t, rough = 0.85) => dimIndoor(plain({ map: t, roughness: rough }), 0.75, 0.4);
    // walls, ceilings and floors as copies of the garden buildings' ones (same programs): a little light of their own by day stands in
    // for the light the room's floor and walls throw back (a ceiling only sees the dark ground half of the sky light otherwise)
    // feat/innen-real: the walls painted over woodchip paper (Raufaser – the wall of most German rooms): the photo of the pavilion's
    // plaster with a faint relief, tinted to the paint's colour (its own grey divided out), in the program of the garden buildings'
    // floors (the same maps, the same indoor dimming: no new program); a plain wall had looked like card
    const plasIn = indoor(MAT.wall, 0.8, 0.25),
      PLAS = [0.41, 0.367, 0.346];
    M.raufaser = hex => {
      const key = 'rf' + hex;
      if (M[key]) return M[key];
      const m = twin(plasIn),
        c = new THREE.Color(hex),
        T = m.map && m.normalMap ? woodchip() : null;
      // (the paper's own chips in the slots of the plaster's photo – same program; the photo's weather streaks had shown on every wall)
      if (T) {
        m.map = T.map;
        m.normalMap = T.nrm;
      }
      const A = T ? [T.mean, T.mean, T.mean] : PLAS;
      m.color.setRGB(c.r / A[0], c.g / A[1], c.b / A[2]);
      m.normalScale.set(0.5, 0.5);
      m.userData.look = c; // (its colour for the light thrown back – daylight())
      m.name = 'innen-raufaser';
      if (M.bounce) {
        M.bounce.push([m, 0.1]);
        dayK = -1; // (its own light at the next look at the day)
      }
      return (M[key] = m);
    };
    M.putz = M.raufaser(0xf3eee4); // warm white
    // feat/innen-real: the ceiling a plain white (it is painted white in nearly every house); lit by the light the floor and the walls
    // throw up, it had come out a dull brown
    M.decke = twin(KM.wall, { color: 0xf4f3ef });
    M.holzdecke = twin(KM.ceil);
    M.dielen = twin(KM.floor);
    M.fliesenWand = twin(KM.tiles);
    M.tapete = {
      streifen: room(T('tapeteStreifen', 256, 256, 0.64, 0.64)),
      ddr: room(T('tapeteDDR', 256, 256, 0.7, 0.7)),
      blume: room(T('tapeteBlume', 256, 256, 0.75, 0.75)),
      schablone: room(T('schablone', 256, 256, 0.8, 0.8)),
    };
    M.linoleum = room(T('linoleum', 256, 256, 1.6, 1.6), 0.55);
    M.laminat = room(T('laminat', 256, 256, 2.0, 1.6), 0.5);
    // feat/innen-real: wooden floors (laminate, parquet) of real oak – the photo of the pavilion's oak with its relief, in the
    // program of the garden buildings' floors (KM.floor: the same maps, the same indoor dimming); four tones, from light to dark,
    // the photo's own dark brown divided out
    const oakIn = indoor(MAT.oak, 0.8, 0.25),
      OAK = [0.216, 0.117, 0.054],
      tone = hex => {
        const m = twin(oakIn),
          c = new THREE.Color(hex);
        m.color.setRGB(c.r / OAK[0], c.g / OAK[1], c.b / OAK[2]);
        m.userData.look = c;
        m.name = 'innen-parkett';
        return m;
      };
    M.parkett = { hell: tone(0xcfae84), natur: tone(0xb48a5c), grau: tone(0xb0a493), dunkel: tone(0x765638) };
    M.platten = room(T('platten', 256, 256, 1.5, 1.5), 0.95);
    M.fliesen = room(T('fliesen', 128, 128, 0.6, 0.6), 0.25);
    M.stein = MAT.stone; // cellar: flagstones, rubble walls (shared photo material)
    M.beton = MAT.conc;
    // the stove's tiles: one image, three glazes (as KM.rag: a canvas map, no sky dimming)
    const kt = T('kacheln', 256, 256, 0.44, 0.44);
    M.kachel = {
      gruen: plain({ map: kt, color: 0x5f9a72, roughness: 0.25 }),
      braun: plain({ map: kt, color: 0x8a5a38, roughness: 0.25 }),
      creme: plain({ map: kt, color: 0xf2e6c8, roughness: 0.25 }),
    };
    const fab = (name, w, mx, rough = 0.95) => plain({ map: T(name, w, w, mx, mx), roughness: rough });
    M.tischdecke = fab('decke', 256, 0.8);
    M.perser = plain({ map: ctex(256, 256, DRAW.perser), roughness: 0.98 }); // laid out over the whole rug (uv 0..1)
    M.velours = fab('velours', 256, 0.6);
    M.karo = fab('karo', 128, 0.24);
    M.bilder = plain({ map: ctex(512, 512, DRAW.bilder), roughness: 0.75 });
    const fu = T('furnier', 256, 256, 0.9, 0.9);
    M.furnier = plain({ map: fu, color: 0xb87a46, roughness: 0.45 }); // DDR veneer (teak-like)
    M.eiche = plain({ map: fu, color: 0x8a6440, roughness: 0.6 }); // Eiche rustikal
    M.birke = plain({ map: fu, color: 0xe8d4a8, roughness: 0.5 });
    M.rag = KM.rag;
    M.gingham = KM.curtainRed;
    M.duvet = KM.duvet;
    for (const m of [M.velours, M.karo, M.duvet]) SOFTM.add(m); // feat/innen-real
    // feat/innen-real: the shade of the normal game's rooms – contact shadows under the furniture, the darker rims where floor, walls
    // and ceiling meet (an ambient occlusion laid on): black, its alpha a blurred square (the green of a canvas) laid out in nine parts
    M.schatten = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      alphaMap: ctex(64, 64, DRAW.schatten, false),
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    M.schatten.name = 'innen-schatten';
    // the veil of daylight on a window's glass (its strength set by daylight())
    M.glare = M.schatten.clone();
    M.glare.color.set(0xfffaf0);
    M.glare.opacity = 0.4;
    M.glare.name = 'innen-fensterlicht';
    // feat/innen-real: the palette indoors (the normal game's houses): the same material and program, with the sky's light of its own
    // strength – a room sees the sky through its windows only (full, every glossy top and white front looked blue-grey)
    M.palIn = twin(PAL.M.front);
    M.palIn.name = 'innen-palette';
    M.stores = KM.curtainLinen;
    M.glas = MAT.glass;
    M.holz = MAT.oak; // furniture wood (oak photo)
    M.hell = MAT.frame; // light larch
    // metals and porcelain as palette swatches (roughness and metalness are in the palette too): one draw call less each
    M.messing = col(0xb08d57, 0.35, 1.0);
    M.stahl = col(0xc4c8cc, 0.28, 1.0);
    M.zink = col(0x9aa1a4, 0.42, 0.65);
    M.schwarz = col(0x232220, 0.8, 0.6);
    M.porzellan = col(0xf2efe6, 0.3, 0);
    M.emaille = col(0xf4f2ec, 0.2, 0.05);
    // the house's own materials that throw back the daylight (shared garden materials and the palette stay as they are)
    M.bounce = [
      [M.decke, 0.32, NEUTRAL],
      [M.holzdecke, 0.15],
      [M.putz, 0.1],
      [M.fliesenWand, 0.07],
      [M.dielen, 0.06],
      ...Object.values(M.tapete).map(m => [m, 0.1]),
      [M.linoleum, 0.06],
      [M.laminat, 0.06],
      ...Object.values(M.parkett).map(m => [m, 0.05]),
      [M.platten, 0.05],
      [M.fliesen, 0.06],
      [M.furnier, 0.05],
      [M.eiche, 0.05],
      [M.birke, 0.05],
      [M.perser, 0.05],
      [M.bilder, 0.04],
    ].filter(([m]) => m && m.emissive);
    daylight(1);
    M.ready = true;
    return M;
  }
  // a lamp's glow: its own material (switched at run time), the program of the pavilion's paper shades (MAT.paper)
  const glowMat = (col = 0xf3ead8) =>
    plain({ color: col, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 1, side: THREE.DoubleSide }); // as MAT.paper (lamp shades)
  // the light thrown back inside by day (k = 1 day, 0 night): emissive = colour · factor · k – a uniform, no new program
  // warm (the sun through the curtains on light walls and wood: the sky's cool grey alone made the rooms look flat by day)
  let dayK = -1;
  const WARM = new THREE.Color(1.0, 0.8, 0.58),
    NEUTRAL = new THREE.Color(1.0, 0.93, 0.84); // feat/innen-real: the ceiling's (warm, but not brown)
  function daylight(k) {
    if (!M.bounce || Math.abs(k - dayK) < 0.02) return false;
    dayK = k;
    if (M.glare) M.glare.opacity = 0.42 * k * k; // feat/innen-real
    for (const [m, f, tint] of M.bounce)
      m.emissive
        .copy(m.userData.look || m.color)
        .multiply(tint || WARM)
        .multiplyScalar(f * k);
    return true;
  }
  // feat/innen-real: the light the furniture of a room sees around it – not the sky outside (its blue was in every glossy top and front)
  // but a room: a white ceiling, light walls, a wooden floor, a bright window on one side. Prefiltered once (PMREM in the layout of the
  // scene's own map, 256: the same shader program), held while a house stands (≈ 6 MB of the GPU), freed with the kit's textures. On
  // phones (little memory) the sky's own map at a share of its strength instead.
  let RENV = null;
  function roomEnv(sceneEnv) {
    if (RENV) return RENV.texture;
    if (!sceneEnv || sceneEnv.mapping !== THREE.CubeUVReflectionMapping || sceneEnv.image.height !== 1024) return null;
    if (COARSE || (window.TEXHALF && window.TEXHALF.level > 0)) return null;
    try {
      const sc = new THREE.Scene(),
        mk = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.BackSide }),
        wall = mk(0.55, 0.5, 0.44),
        // +x (the window's wall), −x, +y ceiling, −y floor, +z, −z
        box = new THREE.Mesh(new THREE.BoxGeometry(8, 2.8, 8), [
          wall,
          wall,
          mk(0.86, 0.84, 0.8),
          mk(0.28, 0.19, 0.12),
          wall,
          wall,
        ]),
        win = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.3),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.4, 3.6) })
        );
      win.position.set(3.99, 0.3, 0);
      win.rotation.y = -Math.PI / 2;
      sc.add(box, win);
      RENV = pmrem.fromScene(sc, 0.03, 0.1, 50);
      for (const o of [box, win]) {
        o.geometry.dispose();
        for (const m of [].concat(o.material)) m.dispose();
      }
      if (RENV.texture.image.height !== 1024) {
        RENV.dispose();
        RENV = null;
      }
    } catch (e) {
      console.warn('innen roomEnv', e);
      RENV = null;
    }
    return RENV ? RENV.texture : null;
  }
  // the indoor palette's light from around it: the room's (k of the scene's strength – it follows day and night), else the sky's at a
  // share (its map set on the material, so that its own strength counts – three takes the scene's for materials without one)
  function indoorEnv(sc, k = 0.6, kRoom = 1.5) {
    const m = M.palIn;
    if (!m || !sc) return;
    const rt = roomEnv(sc.environment),
      env = rt || sc.environment;
    if (m.envMap !== env) m.envMap = env;
    m.envMapIntensity = (sc.environmentIntensity ?? 1) * (rt ? kRoom : k);
  }
  // GPU copies of the shared textures: freed when the last house goes (three uploads them again on use)
  function release() {
    for (const t of TEX) t.dispose();
    if (RENV) {
      RENV.dispose();
      RENV = null;
      if (M.palIn) M.palIn.envMap = null;
    }
  }
  return { Mesher, col, isSoft, mats, M, glowMat, release, daylight, indoorEnv, TEX, V };
})();
window.ZIMOB = ZIMOB;
