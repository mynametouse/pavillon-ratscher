// ===================== feat/zombie-innen: building kit of the house interiors – meshes, shared materials, canvas textures (ZIMOB) =====================
// Geometry is written straight into flat arrays per material (no intermediate BoxGeometry objects) in the house frame of zombie/z_innen_plan.js
// (x along the front, y into the house, z up, absolute heights); one mesh per material at the end – the house is a few dozen draw calls.
// Plain colours go into the garden's palette (garden/garten_kit.js PAL: one material, its UVs point at a swatch), the rest are the materials the
// model already has (shared programs: KM.*, MAT.*) or copies of them with the same shader settings and a canvas texture of our own – drawn once,
// shared by every house, its GPU copy freed when no house is mounted (it is uploaded again by itself when the next house needs it).
import * as THREE from 'three';
import { V } from '../core/head.js';
import { ANISO, dimIndoor, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { KM, PAL, twin } from '../garden/garten_kit.js';
export const ZIMOB = (() => {
  // ---- the mesher: arrays per material, written in the house frame (site-like x, y, z) and stored as three (x, z, −y) ----
  class Mesher {
    constructor(origin) {
      this.B = new Map();
      this.o = origin || [0, 0, 0];
      this.tris = 0;
    }
    buf(m) {
      const key = m.isPal ? m.m : m;
      let b = this.B.get(key);
      if (!b) this.B.set(key, (b = { p: [], n: [], u: [] }));
      return b;
    }
    // one triangle (a, b, c in house coordinates), normal n, uvs (metres) – palette colours take their swatch instead
    tri(m, a, b, c, n, ua, ub, uc) {
      const B = this.buf(m),
        o = this.o;
      for (const [p, u] of [
        [a, ua],
        [b, ub],
        [c, uc],
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
  const COLS = new Map();
  function col(hex, rough = 0.7, metal = 0) {
    const key = hex + '|' + rough + '|' + metal;
    let c = COLS.get(key);
    if (!c) {
      const uv = PAL.uv({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
      c = uv ? { isPal: true, uv, m: PAL.M.front } : plain({ color: hex, roughness: rough, metalness: metal });
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
      {
        const g = q.createLinearGradient(0, 0, 0, S);
        g.addColorStop(0, '#e9a85a');
        g.addColorStop(0.5, '#c86a3a');
        g.addColorStop(1, '#3a3020');
        q.fillStyle = g;
        q.fillRect(0, 0, S, S);
        q.fillStyle = '#20281a';
        for (let i = 0; i < 12; i++) {
          const x = i * 24 - 10,
            y = 150 + (i % 3) * 8;
          q.beginPath();
          q.moveTo(x, y - 70);
          q.lineTo(x - 16, y + 20);
          q.lineTo(x + 16, y + 20);
          q.fill();
        }
        q.fillStyle = '#4a3220';
        q.fillRect(0, 200, S, 56);
        q.fillStyle = '#5a3a22';
        q.beginPath();
        q.ellipse(130, 175, 42, 20, 0, 0, 6.3);
        q.fill();
        q.fillRect(98, 180, 8, 40);
        q.fillRect(150, 180, 8, 40);
        q.fillRect(112, 185, 7, 38);
        q.fillRect(140, 185, 7, 38);
        q.beginPath();
        q.moveTo(162, 168);
        q.lineTo(188, 130);
        q.lineTo(198, 138);
        q.lineTo(176, 178);
        q.fill();
        q.strokeStyle = '#d8c8a0';
        q.lineWidth = 3;
        for (const sx of [-1, 1]) {
          q.beginPath();
          q.moveTo(190, 128);
          q.lineTo(190 + sx * 18, 100);
          q.lineTo(190 + sx * 30, 92);
          q.moveTo(190 + sx * 10, 112);
          q.lineTo(190 + sx * 24, 112);
          q.stroke();
        }
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
        const g = q.createLinearGradient(0, S, 0, 2 * S);
        g.addColorStop(0, '#a8c8e0');
        g.addColorStop(0.55, '#d8e4dc');
        g.addColorStop(1, '#6a8a4a');
        q.fillStyle = g;
        q.fillRect(S, S, S, S);
        for (const [y, c] of [
          [S + 120, '#5a7a5a'],
          [S + 150, '#3f5f3f'],
          [S + 185, '#2f4a2f'],
        ]) {
          q.fillStyle = c;
          q.beginPath();
          q.moveTo(S, 2 * S);
          for (let x = 0; x <= S; x += 8) q.lineTo(S + x, y + Math.sin(x * 0.03 + y) * 14);
          q.lineTo(2 * S, 2 * S);
          q.fill();
        }
        q.fillStyle = '#e8e0d0';
        q.fillRect(S + 150, S + 160, 26, 18);
        q.fillStyle = '#9a3a2a';
        q.beginPath();
        q.moveTo(S + 146, S + 160);
        q.lineTo(S + 163, S + 146);
        q.lineTo(S + 180, S + 160);
        q.fill();
      }
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
  function mats() {
    if (M.ready) return M;
    const T = (name, w, h, mx, my, srgb) => scaled(ctex(w, h, DRAW[name], srgb), mx, my);
    // walls and floors: as KM.tiles (canvas map, sky light dimmed 0.75 / 0.4) – that program exists (the bungalow's bath)
    const room = (t, rough = 0.85) => dimIndoor(plain({ map: t, roughness: rough }), 0.75, 0.4);
    // walls, ceilings and floors as copies of the garden buildings' ones (same programs): a little light of their own by day stands in
    // for the light the room's floor and walls throw back (a ceiling only sees the dark ground half of the sky light otherwise)
    M.putz = twin(KM.wall); // warm white lime plaster
    M.decke = twin(KM.wall);
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
    M.bounce = [
      [M.decke, 0.16],
      [M.holzdecke, 0.12],
      [M.putz, 0.06],
      [M.fliesenWand, 0.05],
      [M.dielen, 0.03],
      ...Object.values(M.tapete).map(m => [m, 0.06]),
      [M.linoleum, 0.03],
      [M.laminat, 0.03],
      [M.platten, 0.03],
      [M.fliesen, 0.05],
    ];
    daylight(1);
    M.ready = true;
    return M;
  }
  // a lamp's glow: its own material (switched at run time), the program of the pavilion's paper shades (MAT.paper)
  const glowMat = (col = 0xf3ead8) =>
    plain({ color: col, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 1, side: THREE.DoubleSide }); // as MAT.paper (lamp shades)
  // the light thrown back inside by day (k = 1 day, 0 night): emissive = colour · factor · k – a uniform, no new program
  let dayK = -1;
  function daylight(k) {
    if (!M.bounce || Math.abs(k - dayK) < 0.02) return false;
    dayK = k;
    for (const [m, f] of M.bounce) m.emissive.copy(m.color).multiplyScalar(f * k);
    return true;
  }
  // GPU copies of the shared textures: freed when the last house goes (three uploads them again on use)
  function release() {
    for (const t of TEX) t.dispose();
  }
  return { Mesher, col, mats, M, glowMat, release, daylight, TEX, V };
})();
window.ZIMOB = ZIMOB;
