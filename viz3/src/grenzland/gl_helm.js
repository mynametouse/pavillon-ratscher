// feat/grenzland-helm (13.11.2026, Falko 20:44 „Die Helme sehen leider völlig unrealistisch aus“): helmets as they are. A jet helmet
// (open face) as worn on a Simson today – an oval shell longer than wide, smooth (the surface's own normals, no facets), the cut line just
// above the brows at the forehead, down over the ears to below the lobes and up a little at the nape, a soft dark rubber trim along the
// whole edge with the shell's thickness and the dark liner inside, a chin strap (two straps meeting under the chin, a buckle), either a
// snap-on peak or a clear visor raised over the forehead (hinge buttons at the temples). The special forces wear a high-cut tactical
// helmet instead (the ears free, rails, a mount in front, matte).
// Built once per kind, colour and head (GLFIG.headOf: the crown's top at the origin, x right, y ahead, z up, metres) and shared. Materials:
// the shell's paint a clone of the traffic's material (VFIG.mat(): the same shader program, only less rough), trim, liner and straps the
// traffic's material itself, the visor a glass as the cars' glass (the same program). ≈ 2.5 k triangles, two or three draw calls.
//   GLHELM.on(H, art, c) → group on the head bone · GLHELM.build(H, art, c) → { glanz, matt, glas, n, fit } · GLHELM.ARTEN
import * as THREE from 'three';
import { VFIG } from '../verkehr/verkehr_fig.js';
export const GLHELM = (() => {
  const S = { geo: {}, built: 0 };
  const HP = Math.PI / 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    nrm = a => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    mix = (a, b, t) => a + (b - a) * t,
    sm = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)),
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ---- a mesh being built: triangles with their own (smooth) normals and colours; kit frame in (x right, y ahead, z up), three's out ----
  function acc() {
    const P = [],
      N = [],
      C = [];
    const put = (v, c) => {
      P.push(v.p[0], v.p[2], -v.p[1]);
      N.push(v.n[0], v.n[2], -v.n[1]);
      C.push(c[0], c[1], c[2]);
    };
    const A = {
      n: 0,
      // the winding as the normals say (seen from where they point: counter-clockwise)
      tri(a, b, c, col) {
        const f = crs(sub(b.p, a.p), sub(c.p, a.p));
        if (dot(f, add(add(a.n, b.n), c.n)) < 0) [b, c] = [c, b];
        put(a, col);
        put(b, col);
        put(c, col);
        A.n++;
      },
      quad(a, b, c, d, col) {
        A.tri(a, b, c, col);
        A.tri(a, c, d, col);
      },
      // V[i][j]: i around (closed when wrap), j along
      grid(V, col, wrap) {
        const ni = V.length;
        for (let i = 0; i < (wrap ? ni : ni - 1); i++) {
          const R0 = V[i],
            R1 = V[(i + 1) % ni];
          for (let j = 0; j + 1 < R0.length; j++) A.quad(R0[j], R1[j], R1[j + 1], R0[j + 1], col);
        }
      },
      // a small box (buckle, rails, snaps) with flat sides: centre, half sizes, the frame's axes u (across), w (out), v = w × u
      box(c, h, u, w, col) {
        const v = crs(w, u),
          ax = [u, v, w];
        for (let k = 0; k < 3; k++)
          for (const s of [-1, 1]) {
            const n = mul(ax[k], s),
              a1 = ax[(k + 1) % 3],
              a2 = ax[(k + 2) % 3],
              h1 = h[(k + 1) % 3],
              h2 = h[(k + 2) % 3],
              o = add(c, mul(n, h[k])),
              p = (x, y) => ({ p: add(o, add(mul(a1, x * h1), mul(a2, y * h2))), n });
            A.quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), col);
          }
      },
      empty: () => !P.length,
      geo() {
        if (!P.length) return null;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
        g.computeBoundingSphere();
        return g;
      },
    };
    return A;
  }
  // ---- the head's measure → the helmet's (GLFIG.headOf: rx, rz half width and depth of the crown's 10 cm; nose: [ahead, down]) ----
  // eye: the eyes' centre in the helmet's frame [x, ahead, up] from the rig's eye bones (Rocketbox heads have them), else ≈ 4.5 cm over
  // the nose's tip (measured on the cast: 4.2–5.2 cm); the brows 2 cm over the eyes; the head's widest a little over half way to the nose
  function fit(H, eye) {
    const nz = clamp(H.nose ? H.nose[1] : -0.145, -0.19, -0.11),
      ny = clamp(H.nose ? H.nose[0] : 0.1, 0.06, 0.15),
      rx = clamp(H.rx || 0.08, 0.068, 0.084),
      rz = clamp(H.rz || 0.1, 0.088, 0.11),
      ez = eye ? clamp(eye[2], nz + 0.025, nz + 0.075) : nz + 0.045;
    return { nz, ny, rx, rz, eye: ez, brow: ez + 0.02, zc: clamp(nz * 0.55, -0.1, -0.066) };
  }
  // ---- a shell: an egg over the head, its lower part (below the widest) going down almost straight over the ears ----
  // (a: round the head, 0 ahead, + to the right; t: down from the top; the same t on every a has the same height)
  function shell(A, B, Cz, zc, yo, pinch = 0.09) {
    const s = t => (t <= HP ? Math.sin(t) : 1 - pinch * (t - HP) * (t - HP)),
      h = t => (t <= HP ? Cz * Math.cos(t) : -Cz * (t - HP)),
      P = (a, t) => [A * s(t) * Math.sin(a), yo + B * s(t) * Math.cos(a), zc + h(t)],
      tOf = z => (z >= zc ? Math.acos(clamp((z - zc) / Cz, -1, 1)) : HP + (zc - z) / Cz),
      // the normal of the surface (not of the facets): from the partial derivatives, outward
      N = (a, t) => {
        if (t < 1e-3) return [0, 0, 1];
        const e = 1e-4,
          dA = sub(P(a + e, t), P(a - e, t)),
          dT = sub(P(a, t + e), P(a, t - e));
        let n = nrm(crs(dA, dT));
        const p = P(a, t);
        if (dot(n, [p[0], p[1] - yo, p[2] - zc]) < 0) n = mul(n, -1);
        return n;
      },
      V = (a, t, off = 0) => {
        const n = N(a, t);
        return { p: add(P(a, t), mul(n, off)), n };
      };
    return { P, N, V, tOf, A, B, Cz, zc, yo };
  }
  // the angles round the head: finer where the cut line falls steeply (dense: [[from, to, step]], mirrored)
  function around(step, dense) {
    const half = [];
    for (let a = 0; a < Math.PI - 1e-6;) {
      half.push(a);
      const d = dense.find(w => a >= w[0] - 1e-6 && a < w[1] - 1e-6);
      a = Math.min(Math.PI, a + (d ? d[2] : step));
      if (a > Math.PI - step * 0.4) a = Math.PI;
    }
    const out = half.slice();
    out.push(Math.PI);
    for (let i = half.length - 1; i > 0; i--) out.push(-half[i]);
    return out;
  }
  // ---- the kinds ----
  // cut lines (height z of the edge over the angle a round the head) and what goes on the shell
  const ARTEN = {
    // the jet helmet: the forehead free above the brows, the face open, the ears covered down below the lobes, the nape a little higher
    jet: f => {
      const zF = f.brow + 0.016,
        zT = zF - 0.012,
        zS = f.nz - 0.036,
        zN = f.nz - 0.01;
      return {
        A: f.rx + 0.029,
        B: f.rz + 0.033,
        top: 0.026,
        yo: -0.008,
        rim: a => {
          a = Math.abs(a);
          if (a < 0.92) return zF - 0.012 * (a / 0.92) * (a / 0.92);
          if (a < 1.3) return mix(zT, zS, sm((a - 0.92) / 0.38));
          if (a < 2.3) return zS + 0.004 * sm((a - 1.3) / 1.0);
          return mix(zS + 0.004, zN, sm((a - 2.3) / (Math.PI - 2.3)));
        },
        az: around(0.15, [[0.84, 1.36, 0.042]]),
        zF,
        zT,
        zS,
      };
    },
    // the tactical helmet (high cut): over the brows in front, cut high over the ears, down to the nape behind; matte
    takt: f => {
      const zF = f.brow + 0.02,
        zE = zF - 0.004,
        zN = f.nz + 0.002;
      return {
        A: f.rx + 0.027,
        B: f.rz + 0.03,
        top: 0.03,
        yo: -0.004,
        rim: a => {
          a = Math.abs(a);
          if (a < 1.9) return zF - (zF - zE) * sm(a / 1.2);
          return mix(zE, zN, sm((a - 1.9) / 0.75));
        },
        az: around(0.15, [[1.8, 2.75, 0.06]]),
        zF,
        zT: zE,
        zS: zN,
      };
    },
  };
  const DUNKEL = [0.012, 0.012, 0.014],
    FUTTER = [0.02, 0.02, 0.022],
    GURT = [0.016, 0.016, 0.018],
    SCHNALLE = [0.045, 0.045, 0.05],
    KNOPF = [0.11, 0.11, 0.115];
  // ---- build one helmet for a head: { glanz, matt, glas } geometries, the triangle count, the measures (for the tests) ----
  function build(H, art, c = {}, eye = null) {
    const f = fit(H, eye),
      K = ARTEN[art](f),
      zc = f.zc,
      Cz = -zc + K.top,
      th = art === 'takt' ? 0.016 : 0.021,
      O = shell(K.A, K.B, Cz, zc, K.yo),
      I = shell(K.A - th, K.B - th, Cz - th, zc, K.yo),
      paint = c.top || [0.7, 0.7, 0.66],
      trim = c.band || DUNKEL,
      G = acc(),
      M = acc(),
      V = acc(),
      shellTo = art === 'takt' ? M : G,
      NR = 11,
      az = K.az,
      rimT = az.map(a => O.tOf(K.rim(a)));
    // the shell from the top down to the cut line
    shellTo.grid(
      az.map((a, i) => {
        const r = [];
        for (let j = 0; j <= NR; j++) r.push(O.V(a, (rimT[i] * j) / NR));
        return r;
      }),
      paint,
      true
    );
    // the edge: a soft rubber trim round from the shell's outside to the liner, bulging a little past the cut
    const rim = [];
    M.grid(
      az.map((a, i) => {
        const t = rimT[i],
          po = O.P(a, t),
          pi = I.P(a, t),
          m = mul(add(po, pi), 0.5),
          u0 = sub(po, m),
          hu = Math.hypot(u0[0], u0[1], u0[2]) || 1e-4,
          u = mul(u0, 1 / hu),
          dt = nrm(sub(O.P(a, t + 0.01), po)),
          b = art === 'takt' ? 0.004 : 0.0065,
          r = [];
        rim.push(po);
        for (let k = 0; k <= 5; k++) {
          const ph = (k / 5) * Math.PI,
            p = add(m, add(mul(u, (hu + 0.0012) * Math.cos(ph)), mul(dt, b * Math.sin(ph)))),
            n = nrm(add(mul(u, Math.cos(ph) / hu), mul(dt, Math.sin(ph) / b)));
          r.push({ p, n });
        }
        return r;
      }),
      trim,
      true
    );
    // the liner inside, a few centimetres up from the edge (seen from below and through the face's opening)
    M.grid(
      az.map((a, i) => {
        const r = [];
        for (let j = 0; j <= 3; j++) {
          const t = Math.max(0.05, rimT[i] - 0.2 * j),
            v = I.V(a, t);
          r.push({ p: v.p, n: mul(v.n, -1) });
        }
        return r;
      }),
      FUTTER,
      true
    );
    const strapFrom = M.n;
    if (art === 'jet') {
      // the chin strap: from inside the ear flaps (a bit before the ears) down past the jaw's angle to under the chin, a buckle there
      const chin = [0, f.ny - 0.036, f.nz - 0.079];
      for (const sx of [-1, 1]) {
        const a = sx * 1.5,
          t = O.tOf(K.zS + 0.022),
          p0 = add(I.P(a, t), [-sx * 0.003, 0, 0]),
          p1 = [sx * 0.056, 0.018, f.nz - 0.054],
          p2 = [sx * 0.03, chin[1] - 0.012, chin[2] + 0.004],
          p3 = [sx * 0.004, chin[1], chin[2]],
          path = [p0, p1, p2, p3],
          w = 0.0085,
          rows = [];
        for (let k = 0; k < path.length; k++) {
          const q = path[k],
            d = nrm(sub(path[Math.min(k + 1, path.length - 1)], path[Math.max(k - 1, 0)])),
            // the strap lies flat on the head: its width along the line from the head's middle outwards × the way it runs
            out = nrm([q[0], q[1] - 0.02, q[2] - (f.nz - 0.02)]),
            wd = nrm(crs(d, out)),
            n = nrm(crs(wd, d));
          const no = dot(n, out) < 0 ? mul(n, -1) : n;
          rows.push([
            { p: add(q, mul(wd, -w)), n: no },
            { p: add(q, mul(wd, w)), n: no },
            { p: add(add(q, mul(wd, -w)), mul(no, -0.0015)), n: mul(no, -1) },
            { p: add(add(q, mul(wd, w)), mul(no, -0.0015)), n: mul(no, -1) },
          ]);
        }
        for (let k = 0; k + 1 < rows.length; k++) {
          const A0 = rows[k],
            A1 = rows[k + 1];
          M.quad(A0[0], A1[0], A1[1], A0[1], GURT);
          M.quad(A0[2], A0[3], A1[3], A1[2], GURT);
        }
      }
      // the buckle (a plastic quick release) under the chin, a little to the left
      M.box([-0.012, chin[1] - 0.004, chin[2] - 0.003], [0.013, 0.008, 0.004], [1, 0, 0], [0, 0.35, -0.94], SCHNALLE);
    }
    const strapTo = M.n;
    if (art === 'jet' && c.schirm !== false && !c.visier) {
      // the snap-on peak: short, curved with the shell, a little up; three snaps holding it
      const pk = c.peak || paint,
        PK = c.peak ? M : G,
        a1 = 0.88,
        top = [],
        bot = [];
      for (let i = 0; i <= 16; i++) {
        const a = -a1 + (2 * a1 * i) / 16,
          q = Math.abs(a) / a1,
          L = 0.052 * Math.pow(Math.max(0, Math.cos(q * HP)), 0.55) + 0.004,
          t = O.tOf(K.rim(a) + 0.013),
          b = O.V(a, t, 0.002),
          ho = nrm([b.n[0], b.n[1], 0]),
          d = nrm(add(mul(ho, Math.cos(0.2)), [0, 0, Math.sin(0.2)])),
          tip = add(b.p, mul(d, L)),
          up = nrm(crs(d, [Math.cos(a), -Math.sin(a), 0])),
          upn = up[2] < 0 ? mul(up, -1) : up,
          mid = add(b.p, mul(d, L * 0.5));
        top.push([
          { p: b.p, n: upn },
          { p: mid, n: upn },
          { p: tip, n: upn },
        ]);
        bot.push([
          { p: add(b.p, mul(upn, -0.003)), n: mul(upn, -1) },
          { p: add(mid, mul(upn, -0.003)), n: mul(upn, -1) },
          { p: add(tip, mul(upn, -0.003)), n: mul(upn, -1) },
        ]);
      }
      PK.grid(top, pk, false);
      PK.grid(bot, pk, false);
      // the rim of the peak
      PK.grid(
        top.map((r, i) => {
          const o = nrm(sub(r[2].p, r[0].p));
          return [
            { p: r[2].p, n: o },
            { p: bot[i][2].p, n: o },
          ];
        }),
        pk,
        false
      );
      for (const a of [-0.6, 0, 0.6]) {
        const t = O.tOf(K.rim(a) + 0.02),
          b = O.V(a, t, 0.003);
        M.box(b.p, [0.0045, 0.0045, 0.002], nrm([Math.cos(a), -Math.sin(a), 0]), b.n, KNOPF);
      }
    }
    if (art === 'jet' && c.visier) {
      // the clear visor, raised: over the forehead part of the shell, from hinge to hinge at the temples
      const VS = shell(K.A + 0.0065, K.B + 0.0065, Cz + 0.0065, zc, K.yo),
        aH = 1.36,
        zH = K.zT - 0.004,
        rows = [];
      for (let i = 0; i <= 22; i++) {
        const a = -aH + (2 * aH * i) / 22,
          q = Math.abs(a) / aH,
          lo = mix(K.rim(a) + 0.009, zH - 0.011, sm((q - 0.55) / 0.45)),
          hi = mix(K.zF + 0.088, zH + 0.013, Math.pow(q, 1.7)),
          r = [];
        for (let j = 0; j <= 4; j++) r.push(VS.V(a, VS.tOf(mix(lo, hi, j / 4))));
        rows.push(r);
      }
      V.grid(rows, [1, 1, 1], false);
      // the hinge buttons
      for (const sx of [-1, 1]) {
        const a = sx * aH,
          b = O.V(a, O.tOf(zH), 0.008);
        M.box(b.p, [0.009, 0.009, 0.004], nrm([Math.cos(a), -Math.sin(a), 0]), b.n, c.knopf || KNOPF);
      }
    }
    if (art === 'takt') {
      // rails on the sides, the mount in front, a four-point strap down to the chin
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const a = sx * (1.25 + k * 0.17),
            b = O.V(a, O.tOf(K.rim(a) + 0.03), 0.005);
          M.box(b.p, [0.012, 0.006, 0.006], [0, 0, 1], b.n, [0.03, 0.03, 0.032]);
        }
        const p0 = I.P(sx * 1.62, O.tOf(K.rim(sx * 1.62) + 0.01)),
          p1 = [sx * 0.06, 0.02, f.nz - 0.05],
          p2 = [sx * 0.012, f.ny - 0.04, f.nz - 0.078];
        for (const [a, b] of [
          [p0, p1],
          [p1, p2],
        ]) {
          const d = nrm(sub(b, a)),
            wd = nrm(crs(d, [sx, 0, 0])),
            n = nrm(crs(wd, d)),
            no = n[0] * sx < 0 ? mul(n, -1) : n,
            w = 0.008;
          M.quad(
            { p: add(a, mul(wd, -w)), n: no },
            { p: add(b, mul(wd, -w)), n: no },
            { p: add(b, mul(wd, w)), n: no },
            { p: add(a, mul(wd, w)), n: no },
            GURT
          );
          M.quad(
            { p: add(a, mul(wd, -w)), n: mul(no, -1) },
            { p: add(a, mul(wd, w)), n: mul(no, -1) },
            { p: add(b, mul(wd, w)), n: mul(no, -1) },
            { p: add(b, mul(wd, -w)), n: mul(no, -1) },
            GURT
          );
        }
      }
      const b = O.V(0, O.tOf(K.zF + 0.03), 0.004);
      M.box(b.p, [0.02, 0.014, 0.005], [1, 0, 0], b.n, [0.035, 0.035, 0.038]);
    }
    S.built++;
    const out = {
      glanz: G.geo(),
      matt: M.geo(),
      glas: V.geo(),
      n: G.n + M.n + V.n,
      strap: [strapFrom * 3, strapTo * 3],
      fit: Object.assign({}, f, { zF: K.zF, zT: K.zT, zS: K.zS, rim: rim.map(p => p.map(v => +v.toFixed(4))) }),
    };
    return out;
  }
  // ---- the materials: the paint as the mode's vehicles' paint (grenzland/gl_modelle.js: the player's car's clear-coated paint, one
  // material per colour, the same program), the visor the vehicles' glass itself; without them the traffic's material ----
  const MOD = () => window.GLMOD || null;
  function lack(c) {
    const G = MOD();
    try {
      if (G && G.paint) return G.paint(c, 0);
    } catch (e) {}
    return VFIG.mat();
  }
  function glas() {
    const G = MOD();
    try {
      if (G && G.glass) return G.glass();
    } catch (e) {}
    return null;
  }
  const key = (H, art, c, eye) =>
    [
      art,
      (H.R || 0).toFixed(3),
      (H.rx || 0).toFixed(3),
      (H.rz || 0).toFixed(3),
      H.nose ? H.nose.map(v => v.toFixed(3)).join(',') : '',
      eye ? eye.map(v => v.toFixed(3)).join(',') : '',
      JSON.stringify(c),
    ].join(':');
  // the eyes' centre in the frame of the group g (hung on the head already): kit frame [x, ahead, up]
  const _v = new THREE.Vector3();
  function eyes(H, g) {
    const B = [];
    H.head.traverse(o => {
      if (o.isBone && /eye/i.test(o.name || '') && !/lid|brow|lash/i.test(o.name)) B.push(o);
    });
    if (!B.length) return null;
    g.updateWorldMatrix(true, false);
    let x = 0,
      y = 0,
      z = 0;
    for (const b of B) {
      g.worldToLocal(b.getWorldPosition(_v));
      x += _v.x;
      y += _v.y;
      z += _v.z;
    }
    return [x / B.length, -z / B.length, y / B.length];
  }
  // ---- put one on a head (H of GLFIG.headOf): a group on the head bone, the meshes shared; remove the group to take it off ----
  function on(H, art, c = {}) {
    if (!H || !ARTEN[art]) return null;
    const g = new THREE.Group();
    g.name = 'grenzland helm ' + art;
    g.position.copy(H.pos);
    g.quaternion.copy(H.quat);
    g.scale.setScalar(H.k);
    H.head.add(g);
    let eye = null;
    try {
      eye = eyes(H, g);
    } catch (e) {}
    // (a visor only where the vehicles' glass is there to share)
    const gl = c.visier ? glas() : null,
      cc = gl || !c.visier ? c : Object.assign({}, c, { visier: false }),
      k = key(H, art, cc, eye);
    const B = S.geo[k] || (S.geo[k] = build(H, art, cc, eye));
    const parts = [
      [B.glanz, B.glanz ? lack(c.top || [0.7, 0.7, 0.66]) : null, 0, 'lack'],
      [B.matt, VFIG.mat(), 0, 'matt'],
      [B.glas, gl, 2, 'glas'],
    ];
    for (const [geo, mat, ro, part] of parts) {
      if (!geo || !mat) continue;
      const m = new THREE.Mesh(geo, mat);
      m.userData.helmPart = part;
      m.userData.noMerge = true;
      m.userData.shared = true;
      m.castShadow = false;
      m.frustumCulled = false;
      m.renderOrder = ro;
      g.add(m);
    }
    g.userData.helm = { art, n: B.n, fit: B.fit, strap: B.strap, eye };
    return g;
  }
  return Object.assign(S, { on, build, fit, ARTEN });
})();
window.GLHELM = GLHELM;
