// ===================== feat/tiere 2: the bodies – procedural, true to size, skinned, the coat in vertex colours (TKOERPER) =====================
// No free model of these animals is both realistic and animated (Sketchfab and the like need a login; the free CC0 packs are low-poly
// toys), so the bodies are built here from measurements: the trunk, the neck with the head, the legs, ears, tail and antlers as lofts –
// rings of superellipses along a line, the trunk seen from the side by its back line and belly line, from above by its width – with
// the joints where the real skeleton has them (hip, stifle, hock; shoulder, elbow, carpus). Every animal is one SkinnedMesh (one draw
// call) with its own bones; all share ONE material (vertex colours, made with an invisible carrier at load, so no new shader program
// later). The coat is painted into the vertex colours from the part, the place along it and the angle around it: countershading, the
// roe deer's white rump patch and black nose, the boar's striped piglets, the kite's rufous forked tail, the dog's tan cheeks.
// Movement is procedural: walk (lateral sequence), trot (diagonals), gallop, bound; standing, grazing, alert with the head up, lying,
// sitting; birds flap and glide. Model frame: x left/right, y up, z forward (the nose); the group turns with rotation.y = π − azimuth.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { plain } from '../core/assets.js';
export const TKOERPER = (() => {
  const S = { built: {}, n: 0 };
  // one material for every animal; the carriers below make its programs (skinned, and plain for the blob-free extras) at load
  const MAT = plain({ vertexColors: true, roughness: 0.92, metalness: 0, envMapIntensity: 0.75 });
  MAT.name = 'tiere';
  S.mat = MAT;
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -50, 0, 0.001, -50, 0, 0, -50, 0.001], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    const sm = new THREE.SkinnedMesh(g, MAT),
      b = new THREE.Bone();
    sm.add(b);
    sm.bind(new THREE.Skeleton([b]));
    sm.visible = false;
    sm.frustumCulled = false;
    sm.userData.noMerge = true;
    sm.name = 'tiere carrier';
    scene.add(sm);
    const pm = new THREE.Mesh(g, MAT);
    pm.visible = false;
    pm.userData.noMerge = true;
    pm.name = 'tiere carrier plain';
    scene.add(pm);
  }
  // ---------- colours: sRGB hex → linear, a little mottling so a coat is not one flat colour ----------
  const _c = new THREE.Color();
  const lin = hex => {
    _c.set(hex);
    return [_c.r, _c.g, _c.b];
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const sst = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const hash = (x, y, z) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  // ---------- the geometry builder: vertices with colour and up to four bone weights ----------
  function Builder() {
    const pos = [],
      col = [],
      si = [],
      sw = [],
      idx = [];
    const B = {
      n: 0,
      v(p, c, w) {
        pos.push(p[0], p[1], p[2]);
        col.push(c[0], c[1], c[2]);
        const ws = (w || [[0, 1]])
          .filter(e => e[1] > 1e-3)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4);
        const tot = ws.reduce((s, e) => s + e[1], 0) || 1;
        for (let i = 0; i < 4; i++) {
          si.push(ws[i] ? ws[i][0] : 0);
          sw.push(ws[i] ? ws[i][1] / tot : 0);
        }
        return B.n++;
      },
      t(a, b, c) {
        idx.push(a, b, c);
      },
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
        g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        g.setIndex(idx);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        return g;
      },
    };
    return B;
  }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // Catmull-Rom through the station points; radii and weights blend smoothly between stations
  function crPoint(P, i, t, out) {
    const p0 = P[Math.max(0, i - 1)],
      p1 = P[i],
      p2 = P[Math.min(P.length - 1, i + 1)],
      p3 = P[Math.min(P.length - 1, i + 2)];
    const t2 = t * t,
      t3 = t2 * t;
    for (const k of ['x', 'y', 'z'])
      out[k] =
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    return out;
  }
  const blendW = (a, b, t) => {
    const m = new Map();
    for (const [i, w] of a) m.set(i, (m.get(i) || 0) + w * (1 - t));
    for (const [i, w] of b) m.set(i, (m.get(i) || 0) + w * t);
    return [...m.entries()];
  };
  // a loft: stations { p: Vector3, rx, ry, e (superellipse exponent), w: [[bone, weight]], u (0..1 along the part) }, sub rings between
  // them, `sides` vertices around; ref: the "up" of the rings ('y' for bodies, 'z' for legs hanging down); coat(q) → linear colour;
  // caps at the ends (a point at the very end)
  function loft(B, st, o) {
    const sides = o.sides || 12,
      sub = o.sub || 2,
      coat = o.coat;
    const P = st.map(s => s.p);
    const rings = [];
    const tmp = V3(0, 0, 0),
      tmp2 = V3(0, 0, 0);
    for (let i = 0; i < st.length - 1; i++)
      for (let k = 0; k < sub; k++) {
        const t = k / sub;
        rings.push({ i, t, p: crPoint(P, i, t, V3(0, 0, 0)) });
      }
    rings.push({ i: st.length - 2, t: 1, p: P[P.length - 1].clone() });
    const ref = o.ref === 'z' ? V3(0, 0, 1) : V3(0, 1, 0);
    const idxs = [];
    rings.forEach((R, ri) => {
      const a = st[R.i],
        b = st[R.i + 1],
        t = R.t,
        tt = t * t * (3 - 2 * t);
      // tangent from the neighbouring rings
      const pa = rings[Math.max(0, ri - 1)].p,
        pb = rings[Math.min(rings.length - 1, ri + 1)].p;
      tmp.subVectors(pb, pa).normalize();
      // the ring's "up": the reference made perpendicular to the tangent (falls back to the other axis when parallel)
      tmp2.copy(ref).addScaledVector(tmp, -ref.dot(tmp));
      if (tmp2.lengthSq() < 1e-4) tmp2.set(0, 0, 1).addScaledVector(tmp, -tmp.z);
      tmp2.normalize();
      const up = tmp2.clone(),
        side = V3(0, 0, 0).crossVectors(up, tmp).normalize();
      const rx = a.rx + (b.rx - a.rx) * tt,
        ry = a.ry + (b.ry - a.ry) * tt,
        e = (a.e || 2) + ((b.e || 2) - (a.e || 2)) * tt,
        dy = (a.dy || 0) + ((b.dy || 0) - (a.dy || 0)) * tt,
        u =
          (a.u ?? R.i / (st.length - 1)) + ((b.u ?? (R.i + 1) / (st.length - 1)) - (a.u ?? R.i / (st.length - 1))) * t,
        w = blendW(a.w, b.w, tt);
      const row = [];
      for (let s = 0; s < sides; s++) {
        const th = (s / sides) * Math.PI * 2,
          sn = Math.sin(th),
          cs = Math.cos(th);
        // superellipse: e = 2 an ellipse, larger squarer (the boar's flanks)
        const px = rx * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e),
          py = ry * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / e) + dy * (cs < 0 ? -cs : 0) * ry;
        const p = R.p.clone().addScaledVector(side, px).addScaledVector(up, py);
        const c = coat({
          part: o.part,
          u,
          th,
          side: Math.sign(p.x) || 1,
          x: p.x,
          y: p.y,
          z: p.z,
          ri,
          rn: rings.length,
        });
        row.push(B.v([p.x, p.y, p.z], c, w));
      }
      idxs.push(row);
    });
    for (let r = 0; r < idxs.length - 1; r++)
      for (let s = 0; s < sides; s++) {
        const a = idxs[r][s],
          b = idxs[r][(s + 1) % sides],
          c = idxs[r + 1][s],
          d = idxs[r + 1][(s + 1) % sides];
        B.t(a, c, b);
        B.t(b, c, d);
      }
    // caps: the first ring closes towards its centre (pushed back a little), the last towards a point
    const cap = (row, at, back, flip, w, u) => {
      const c = coat({ part: o.part, u, th: 0, side: 1, x: at.x, y: at.y, z: at.z, ri: 0, rn: 1, cap: true });
      const ci = B.v([at.x + back.x, at.y + back.y, at.z + back.z], c, w);
      for (let s = 0; s < sides; s++) {
        const a = row[s],
          b = row[(s + 1) % sides];
        if (flip) B.t(ci, b, a);
        else B.t(ci, a, b);
      }
    };
    if (o.cap0 !== false) {
      const d = V3(0, 0, 0)
        .subVectors(rings[0].p, rings[1].p)
        .normalize()
        .multiplyScalar(o.cap0 || 0.3 * st[0].ry);
      cap(idxs[0], rings[0].p, d, true, st[0].w, st[0].u ?? 0);
    }
    if (o.cap1 !== false) {
      const L = rings.length,
        d = V3(0, 0, 0)
          .subVectors(rings[L - 1].p, rings[L - 2].p)
          .normalize()
          .multiplyScalar(o.cap1 || 0.4 * st[st.length - 1].ry);
      cap(idxs[L - 1], rings[L - 1].p, d, false, st[st.length - 1].w, st[st.length - 1].u ?? 1);
    }
  }
  // a small sphere (eyes, the hare's tail puff)
  function ball(B, c, r, colr, w) {
    const n = 6,
      m = 4,
      ids = [];
    for (let j = 0; j <= m; j++) {
      const row = [];
      for (let i = 0; i < n; i++) {
        const th = (j / m) * Math.PI,
          ph = (i / n) * Math.PI * 2;
        row.push(
          B.v(
            [c.x + r * Math.sin(th) * Math.cos(ph), c.y + r * Math.cos(th), c.z + r * Math.sin(th) * Math.sin(ph)],
            colr,
            w
          )
        );
      }
      ids.push(row);
    }
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        const a = ids[j][i],
          b = ids[j][(i + 1) % n],
          cc = ids[j + 1][i],
          d = ids[j + 1][(i + 1) % n];
        B.t(a, b, cc);
        B.t(b, d, cc);
      }
  }
  // ---------- skeleton plans ----------
  // bones: [name, parent name, [x, y, z] absolute rest position]; the rest rotations are all zero, the pose lives in the joint places
  function skel(list) {
    const idx = {},
      abs = {};
    list.forEach(([n, , p], i) => {
      idx[n] = i;
      abs[n] = p;
    });
    return { list, idx, abs };
  }
  const W = (sk, n, w = 1) => [sk.idx[n], w];
  // ---------- the quadrupeds ----------
  // A plan in metres: trunk stations [z, top, bottom, half width (, superellipse)]; neck/head stations [z, y, rx, ry]; legs: joints
  // [z, y] for the hind leg (hip, stifle, hock, foot) and the front leg (shoulder, elbow, carpus, foot) at ±x; radii along them;
  // ears, tail, antlers. Coat: a function of the place (q) and the variant.
  function quadruped(Pn, variant) {
    const sk = skel(
      (() => {
        const T = Pn.trunk,
          zr = T[1][0],
          zf = T[T.length - 2][0],
          ym = (T[3][1] + T[3][2]) / 2;
        const H = Pn.hind,
          F = Pn.front,
          N = Pn.neck;
        const L = [
          ['root', null, [0, ym, 0]],
          ['hips', 'root', [0, ym, zr * 0.55]],
          ['chest', 'root', [0, ym, zf * 0.55]],
          ['neck1', 'chest', [0, N[0][1], N[0][0]]],
          ['neck2', 'neck1', [0, N[Pn.neckMid][1], N[Pn.neckMid][0]]],
          ['head', 'neck2', [0, N[Pn.headAt][1], N[Pn.headAt][0]]],
          ['tail1', 'hips', [0, Pn.tail.p[0][1], Pn.tail.p[0][0]]],
          ['tail2', 'tail1', [0, Pn.tail.p[1][1], Pn.tail.p[1][0]]],
          ['tail3', 'tail2', [0, Pn.tail.p[2][1], Pn.tail.p[2][0]]],
        ];
        for (const s of ['L', 'R']) {
          const x = (s === 'L' ? 1 : -1) * Pn.hx,
            xf = (s === 'L' ? 1 : -1) * Pn.fx;
          L.push(['thigh' + s, 'hips', [x, H[0][1], H[0][0]]]);
          L.push(['shank' + s, 'thigh' + s, [x, H[1][1], H[1][0]]]);
          L.push(['meta' + s, 'shank' + s, [x, H[2][1], H[2][0]]]);
          L.push(['arm' + s, 'chest', [xf, F[0][1], F[0][0]]]);
          L.push(['fore' + s, 'arm' + s, [xf, F[1][1], F[1][0]]]);
          L.push(['cannon' + s, 'fore' + s, [xf, F[2][1], F[2][0]]]);
          L.push(['ear' + s, 'head', [(s === 'L' ? 1 : -1) * Pn.ear.x, Pn.ear.p[1], Pn.ear.p[0]]]);
        }
        return L;
      })()
    );
    const B = Builder(),
      coat = q => Pn.coat(q, variant || {});
    const T = Pn.trunk,
      zr = T[1][0],
      zf = T[T.length - 2][0];
    // trunk: hips → root → chest by the place along it
    const wTrunk = z => {
      const a = sk.abs.hips[2],
        c = sk.abs.chest[2];
      if (z <= a) return [W(sk, 'hips')];
      if (z >= c) return [W(sk, 'chest')];
      const t = (z - a) / (c - a);
      return t < 0.5
        ? [W(sk, 'hips', 1 - t * 2), W(sk, 'root', t * 2)]
        : [W(sk, 'root', 2 - t * 2), W(sk, 'chest', t * 2 - 1)];
    };
    loft(
      B,
      T.map(([z, top, bot, hw, e, dy]) => ({
        p: V3(0, (top + bot) / 2, z),
        rx: hw,
        ry: (top - bot) / 2,
        e: e || Pn.e || 2.2,
        dy: dy || 0,
        w: wTrunk(z),
        u: (z - T[0][0]) / (T[T.length - 1][0] - T[0][0]),
      })),
      { part: 'trunk', sides: 16, sub: 2, coat, cap0: 0.03, cap1: 0.03 }
    );
    // neck and head: one loft from inside the chest to the nose
    const N = Pn.neck,
      nAt = Pn.neckMid,
      hAt = Pn.headAt;
    loft(
      B,
      N.map(([z, y, rx, ry, e], i) => ({
        p: V3(0, y, z),
        rx,
        ry,
        e: e || 2,
        w:
          i === 0
            ? [W(sk, 'chest', 0.7), W(sk, 'neck1', 0.3)]
            : i < nAt
              ? [W(sk, 'neck1')]
              : i === nAt
                ? [W(sk, 'neck1', 0.4), W(sk, 'neck2', 0.6)]
                : i < hAt
                  ? [W(sk, 'neck2')]
                  : i === hAt
                    ? [W(sk, 'neck2', 0.35), W(sk, 'head', 0.65)]
                    : [W(sk, 'head')],
        u: i / (N.length - 1),
      })),
      { part: 'neck', sides: 12, sub: 2, coat, cap0: false, cap1: Pn.noseCap || 0.012 }
    );
    // legs
    const leg = (kind, s) => {
      const J = kind === 'hind' ? Pn.hind : Pn.front,
        R = kind === 'hind' ? Pn.hindR : Pn.frontR,
        x = (s === 'L' ? 1 : -1) * (kind === 'hind' ? Pn.hx : Pn.fx),
        names = kind === 'hind' ? ['hips', 'thigh', 'shank', 'meta'] : ['chest', 'arm', 'fore', 'cannon'];
      const bn = i => (i === 0 ? names[0] : names[i] + s);
      const st = [];
      // above the top joint a ring inside the body (the haunch, the shoulder blade)
      st.push({
        p: V3(x * 0.7, J[0][1] + R[0] * 0.9, J[0][0] + (kind === 'hind' ? 0.02 : -0.02)),
        rx: R[0] * 0.9,
        ry: R[0] * 1.15,
        w: [W(sk, bn(0))],
        u: 0,
      });
      for (let i = 0; i < 4; i++) {
        const w =
          i === 0
            ? [W(sk, bn(0), 0.55), W(sk, bn(1), 0.45)]
            : i === 3
              ? [W(sk, bn(3))]
              : [W(sk, bn(i), 0.5), W(sk, bn(i + 1), 0.5)];
        st.push({
          p: V3(x, J[i][1], J[i][0]),
          rx: R[i + 1] * (i === 3 ? 0.95 : 0.85),
          ry: R[i + 1],
          w,
          u: (i + 1) / 5,
        });
        if (i < 3) {
          // the middle of each bone
          const m = [(J[i][0] + J[i + 1][0]) / 2, (J[i][1] + J[i + 1][1]) / 2];
          st.push({
            p: V3(x, m[1], m[0]),
            rx: ((R[i + 1] + R[i + 2]) / 2) * 0.82,
            ry: (R[i + 1] + R[i + 2]) / 2,
            w: [W(sk, bn(i + 1))],
            u: (i + 1.5) / 5,
          });
        }
      }
      // the hoof or paw: a short piece forward on the ground
      const f = J[3];
      st.push({
        p: V3(x, 0.012, f[0] + (Pn.paw ? 0.035 : 0.02) * Pn.k),
        rx: R[4] * 0.9,
        ry: R[4] * 0.55,
        w: [W(sk, bn(3))],
        u: 1,
      });
      loft(B, st, {
        part: kind === 'hind' ? 'hleg' : 'fleg',
        sides: 9,
        sub: 1,
        ref: 'z',
        coat,
        cap0: false,
        cap1: 0.006,
      });
    };
    for (const s of ['L', 'R']) {
      leg('hind', s);
      leg('front', s);
    }
    // ears: a flat leaf from the base up and out, cupped a little
    const E = Pn.ear;
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1,
        b = V3(sx * E.x, E.p[1], E.p[0]),
        d = V3(sx * E.out, E.up, E.back).normalize();
      const st = [0, 0.25, 0.6, 1].map((t, i) => ({
        p: b.clone().addScaledVector(d, E.len * t),
        rx: E.wid * [0.45, 0.62, 0.5, 0.08][i],
        ry: E.wid * 0.12,
        w: [W(sk, 'ear' + s)],
        u: t,
      }));
      loft(B, st, { part: 'ear', sides: 8, sub: 1, ref: 'z', coat, cap0: false, cap1: 0.004 });
    }
    // tail
    {
      const tp = Pn.tail;
      const st = tp.p.map(([z, y], i) => ({
        p: V3(0, y, z),
        rx: tp.r[i],
        ry: tp.r[i] * (tp.flat || 1),
        w: [W(sk, 'tail' + Math.min(3, i + 1))],
        u: i / (tp.p.length - 1),
      }));
      loft(B, st, { part: 'tail', sides: 8, sub: 2, coat, cap0: false, cap1: 0.01 });
    }
    // eyes
    for (const s of [1, -1])
      ball(B, V3(s * Pn.eye.x, Pn.eye.p[1], Pn.eye.p[0]), Pn.eye.r, lin(Pn.eye.col || 0x140f0c), [W(sk, 'head')]);
    // antlers (bucks, stags) and the like: tubes on the head
    if (Pn.antler && variant && variant.antler) Pn.antler(B, sk, W, loft, V3, coat, variant);
    return { geo: B.geo(), sk };
  }
  // ---------- the birds: body, wings in two parts with fingers, tail ----------
  function bird(Pn, variant) {
    const sk = skel([
      ['root', null, [0, 0, 0]],
      ['head', 'root', [0, Pn.headY, Pn.headZ]],
      ['tail', 'root', [0, 0, Pn.tailZ]],
      ['wingL', 'root', [Pn.sh, 0.01, Pn.shZ]],
      ['handL', 'wingL', [Pn.wrist, 0.01, Pn.wristZ]],
      ['wingR', 'root', [-Pn.sh, 0.01, Pn.shZ]],
      ['handR', 'wingR', [-Pn.wrist, 0.01, Pn.wristZ]],
    ]);
    const B = Builder(),
      coat = q => Pn.coat(q, variant || {});
    loft(
      B,
      Pn.body.map(([z, y, rx, ry], i) => ({
        p: V3(0, y, z),
        rx,
        ry,
        w:
          z > Pn.headZ - 0.02
            ? [W(sk, 'head')]
            : z < Pn.tailZ + 0.02
              ? [W(sk, 'tail', 0.5), W(sk, 'root', 0.5)]
              : [W(sk, 'root')],
        u: i / (Pn.body.length - 1),
      })),
      { part: 'body', sides: 10, sub: 2, coat, cap0: 0.01, cap1: 0.004 }
    );
    // a wing: leading edge and trailing edge points from the shoulder out; the outer part ends in fingers (primaries)
    const wing = s => {
      const sx = s === 'L' ? 1 : -1,
        Wd = Pn.wing;
      const top = [],
        bot = [];
      // span stations: [x, z leading, z trailing, bone]
      const rows = Wd.rows.map(([x, zl, zt, part]) => {
        const w =
          part === 'hand'
            ? [W(sk, 'hand' + s)]
            : part === 'mid'
              ? [W(sk, 'wing' + s, 0.5), W(sk, 'hand' + s, 0.5)]
              : [W(sk, 'wing' + s)];
        const th = Wd.thick * (1 - Math.abs(x) / (Wd.span * 1.15));
        const out = [];
        const n = 4;
        for (let i = 0; i <= n; i++) {
          const t = i / n,
            z = zl + (zt - zl) * t,
            camber = Math.sin(Math.PI * t) * th;
          const pu = [sx * x, 0.012 + camber, z],
            pd = [sx * x, 0.012 - camber * 0.3, z];
          const cu = coat({ part: 'wing', up: true, x: sx * x, z, t, span: x / Wd.span, side: sx }),
            cd = coat({ part: 'wing', up: false, x: sx * x, z, t, span: x / Wd.span, side: sx });
          out.push([B.v(pu, cu, w), B.v(pd, cd, w)]);
        }
        return out;
      });
      for (let r = 0; r < rows.length - 1; r++)
        for (let i = 0; i < rows[r].length - 1; i++) {
          const a = rows[r][i],
            b = rows[r][i + 1],
            c = rows[r + 1][i],
            d = rows[r + 1][i + 1];
          if (sx > 0) {
            B.t(a[0], c[0], b[0]);
            B.t(b[0], c[0], d[0]);
            B.t(a[1], b[1], c[1]);
            B.t(b[1], d[1], c[1]);
          } else {
            B.t(a[0], b[0], c[0]);
            B.t(b[0], d[0], c[0]);
            B.t(a[1], c[1], b[1]);
            B.t(b[1], c[1], d[1]);
          }
        }
      // fingers: thin feathers out of the last row
      const last = Wd.rows[Wd.rows.length - 1];
      for (let f = 0; f < (Wd.fingers || 0); f++) {
        const t = (f + 0.5) / Wd.fingers,
          z0 = last[1] + (last[2] - last[1]) * t,
          len = Wd.fingerLen * (1 - Math.abs(t - 0.35) * 0.9),
          x0 = last[0],
          ang = (t - 0.3) * 0.9;
        const w = [W(sk, 'hand' + s)];
        const p0 = [sx * x0, 0.012, z0 + 0.018],
          p1 = [sx * x0, 0.012, z0 - 0.018],
          p2 = [sx * (x0 + len * Math.cos(ang)), 0.02, z0 - len * Math.sin(ang)];
        const cu = coat({ part: 'wing', up: true, x: p2[0], z: p2[2], t: 0.5, span: 1.1, side: sx }),
          cd = coat({ part: 'wing', up: false, x: p2[0], z: p2[2], t: 0.5, span: 1.1, side: sx });
        const a = B.v(p0, cu, w),
          b = B.v(p1, cu, w),
          c = B.v(p2, cu, w),
          a2 = B.v([p0[0], 0.008, p0[2]], cd, w),
          b2 = B.v([p1[0], 0.008, p1[2]], cd, w),
          c2 = B.v([p2[0], 0.016, p2[2]], cd, w);
        if (sx > 0) {
          B.t(a, b, c);
          B.t(a2, c2, b2);
        } else {
          B.t(a, c, b);
          B.t(a2, b2, c2);
        }
      }
    };
    wing('L');
    wing('R');
    // tail: a fan (forked for the kite), upper and lower face
    {
      const Tl = Pn.tailFan,
        w = [W(sk, 'tail')];
      const n = 6;
      const up = [],
        dn = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n - 0.5,
          x = t * Tl.w1,
          xb = t * Tl.w0;
        const fork = Tl.fork * (1 - Math.abs(t) * 2);
        const zEnd = Tl.z1 + fork;
        const cu = coat({ part: 'tail', up: true, t: Math.abs(t) }),
          cd = coat({ part: 'tail', up: false, t: Math.abs(t) });
        up.push([B.v([xb, 0.01, Tl.z0], cu, w), B.v([x, 0.004, zEnd], cu, w)]);
        dn.push([B.v([xb, -0.004, Tl.z0], cd, w), B.v([x, -0.002, zEnd], cd, w)]);
      }
      for (let i = 0; i < n; i++) {
        B.t(up[i][0], up[i + 1][0], up[i][1]);
        B.t(up[i + 1][0], up[i + 1][1], up[i][1]);
        B.t(dn[i][0], dn[i][1], dn[i + 1][0]);
        B.t(dn[i + 1][0], dn[i][1], dn[i + 1][1]);
      }
    }
    for (const s of [1, -1])
      ball(B, V3(s * Pn.eye.x, Pn.eye.p[1], Pn.eye.p[0]), Pn.eye.r, lin(Pn.eye.col || 0x1a120c), [W(sk, 'head')]);
    if (Pn.legs) Pn.legs(B, sk, W, loft, V3, coat);
    return { geo: B.geo(), sk };
  }
  // ---------- an individual: its own bones on the shared geometry ----------
  function make(kind, variant = {}) {
    const P = PLANS[kind];
    if (!P) throw new Error('no plan for ' + kind);
    const key = kind + ':' + JSON.stringify(variant);
    if (!S.built[key]) S.built[key] = P.bird ? bird(P, variant) : quadruped(P, variant);
    const { geo, sk } = S.built[key];
    const bones = sk.list.map(() => new THREE.Bone()),
      by = {};
    sk.list.forEach(([n, par, p], i) => {
      const b = bones[i];
      b.name = n;
      by[n] = b;
      if (par) {
        const q = sk.abs[par];
        b.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        bones[sk.idx[par]].add(b);
      } else b.position.set(p[0], p[1], p[2]);
    });
    const mesh = new THREE.SkinnedMesh(geo, MAT);
    mesh.add(bones[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.noMerge = true;
    mesh.userData.shared = true;
    const g = new THREE.Group();
    g.add(mesh);
    g.name = 'tier ' + kind;
    S.n++;
    const A = {
      kind,
      variant,
      g,
      mesh,
      b: by,
      rest: Object.fromEntries(sk.list.map(([n]) => [n, by[n].position.clone()])),
      ph: Math.random(),
      wag: Math.random() * 6,
      t: Math.random() * 10,
      pose: { graze: 0, alert: 0, lie: 0, sit: 0, look: 0, dig: 0, flee: 0, ears: 0, tailUp: 0, wag: 0 },
      dispose() {
        g.removeFromParent();
        mesh.skeleton.dispose();
      },
    };
    A.anim = (dt, speed, o) => (P.bird ? animBird(A, P, dt, speed, o || {}) : animQuad(A, P, dt, speed, o || {}));
    return A;
  }
  // ---------- movement: gaits for four legs ----------
  // leg order FL, FR, HL, HR; phase offsets and duty factor (share of the cycle on the ground) per gait
  const GAITS = {
    walk: { off: [0.25, 0.75, 0, 0.5], duty: 0.66, amp: 0.32, lift: 0.55, bob: 0.01 },
    trot: { off: [0, 0.5, 0.5, 0], duty: 0.46, amp: 0.46, lift: 0.8, bob: 0.025 },
    gallop: { off: [0.55, 0.65, 0.05, 0], duty: 0.34, amp: 0.72, lift: 1.0, bob: 0.05, flex: 0.16 },
    bound: { off: [0.5, 0.56, 0, 0.04], duty: 0.3, amp: 0.82, lift: 1.1, bob: 0.09, flex: 0.26 },
  };
  function animQuad(A, P, dt, sp, o) {
    const b = A.b,
      ps = A.pose,
      G = P.gait;
    // which gait: by speed (m/s) and the species' thresholds
    const gname = sp < 0.05 ? null : sp < G.trot ? 'walk' : sp < G.gallop ? 'trot' : P.bounds ? 'bound' : 'gallop';
    const g = gname ? GAITS[gname] : null;
    // stride frequency: longer legs, slower; faster, a little quicker
    const f = gname
      ? G.f0 * (gname === 'walk' ? 1 : gname === 'trot' ? 1.45 : 1.75) * (0.75 + 0.25 * Math.min(2, sp / (G.trot || 1)))
      : 0;
    A.ph = (A.ph + dt * f) % 1;
    A.t += dt;
    const k = 1 - Math.exp(-dt * 6);
    // poses blend towards their targets (o.graze, o.alert, o.lie, o.sit … in 0..1)
    for (const n of ['graze', 'alert', 'lie', 'sit', 'dig', 'flee'])
      ps[n] += ((o[n] || 0) - ps[n]) * (n === 'lie' || n === 'sit' ? 1 - Math.exp(-dt * 2.2) : k);
    ps.look += ((o.look || 0) - ps.look) * k;
    const moving = g ? Math.min(1, sp / 0.3) : 0;
    const legs = [
      ['arm', 'fore', 'cannon', 'L', 0],
      ['arm', 'fore', 'cannon', 'R', 1],
      ['thigh', 'shank', 'meta', 'L', 2],
      ['thigh', 'shank', 'meta', 'R', 3],
    ];
    const lie = ps.lie,
      sit = ps.sit * (1 - lie);
    for (const [u, m, l, s, i] of legs) {
      let sw = 0,
        lift = 0;
      if (g) {
        const ph = (A.ph + g.off[i]) % 1;
        if (ph < g.duty) sw = g.amp * (1 - (2 * ph) / g.duty);
        else {
          const q = (ph - g.duty) / (1 - g.duty);
          sw = -g.amp + 2 * g.amp * (q * q * (3 - 2 * q));
          lift = g.lift * Math.sin(Math.PI * q);
        }
        sw *= moving;
        lift *= moving;
      }
      const hind = i >= 2;
      // swing forward = negative x rotation for parts hanging down; folding when lifted
      let a0 = -sw,
        a1 = hind ? lift * 0.9 : -lift * 0.25,
        a2 = hind ? -lift * 1.25 : lift * 1.5;
      // lying: legs folded under the body; sitting (dogs, hares): the hind legs folded, the front ones straight
      if (lie > 0) {
        a0 = a0 * (1 - lie) + lie * (hind ? -1.15 : 0.3);
        a1 = a1 * (1 - lie) + lie * (hind ? 2.1 : -1.3);
        a2 = a2 * (1 - lie) + lie * (hind ? -1.9 : 2.4);
      }
      if (sit > 0 && hind) {
        a0 = a0 * (1 - sit) + sit * -1.35;
        a1 = a1 * (1 - sit) + sit * 2.0;
        a2 = a2 * (1 - sit) + sit * -1.6;
      }
      if (sit > 0 && !hind) a0 = a0 * (1 - sit) + sit * 0.5;
      // the boar's dig: front legs braced a little
      if (ps.dig > 0 && !hind) a0 += ps.dig * 0.12;
      b[u + s].rotation.x = a0;
      b[m + s].rotation.x = a1;
      b[l + s].rotation.x = a2;
    }
    // the body: bob in the stride, lowered when lying, tilted up when sitting; flexing spine in gallop and bound
    const bob = g ? g.bob * moving * Math.abs(Math.sin(2 * Math.PI * A.ph * (gname === 'trot' ? 2 : 1))) : 0;
    const R = A.rest;
    b.root.position.y = R.root.y - bob - lie * P.lieDrop - sit * P.lieDrop * 0.25;
    b.root.rotation.x = -sit * (P.sitTilt || 0.55) + (ps.dig ? ps.dig * 0.08 : 0);
    const flex = g && g.flex ? g.flex * moving * Math.sin(2 * Math.PI * A.ph) : 0;
    b.hips.rotation.x = flex;
    b.chest.rotation.x = -flex * 0.6;
    // neck and head: grazing down, alert up, the dig with the snout in the ground, looking aside; a little nod in the walk
    const nod = g && gname === 'walk' ? Math.sin(4 * Math.PI * A.ph) * 0.05 * moving : 0;
    const NP = P.neckPose || { graze: [0.95, 0.5], alert: [-0.35, -0.15], lie: [0.15, 0.1], dig: [0.6, 0.45] };
    const n1 =
        ps.graze * NP.graze[0] + ps.alert * NP.alert[0] + lie * NP.lie[0] + ps.dig * NP.dig[0] + nod + ps.flee * 0.15,
      n2 = ps.graze * NP.graze[1] + ps.alert * NP.alert[1] + lie * NP.lie[1] + ps.dig * NP.dig[1] - sit * 0.4;
    b.neck1.rotation.x = n1 + sit * 0.35;
    b.neck2.rotation.x = n2 * 0.6;
    b.head.rotation.x = n2 * 0.4 + (ps.graze ? Math.sin(A.t * 5) * 0.03 * ps.graze : 0);
    b.neck2.rotation.y = ps.look * 0.5;
    b.head.rotation.y = ps.look * 0.5;
    // ears: forward when alert, flat back when fleeing, flicking now and then
    const flick = Math.sin(A.t * 0.7 + A.wag) > 0.97 ? Math.sin(A.t * 30) * 0.3 : 0;
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      b['ear' + s].rotation.x = -ps.flee * 0.9 + ps.alert * 0.25 + (s === 'L' ? flick : 0);
      b['ear' + s].rotation.z = sx * ps.flee * 0.3;
    }
    // tail: wagging (dogs), raised when fleeing (the roe deer's rump patch flares, the boar's tail goes up), hanging at rest
    A.wag += dt * (o.wag ? 9 + o.wag * 5 : 2);
    const wag = (o.wag || 0) * 0.55;
    b.tail1.rotation.y = Math.sin(A.wag) * (wag + 0.04);
    b.tail1.rotation.x = ps.flee * (P.tailFlee || 0.6) + (o.tailUp || 0) * 0.5 - (P.tailHang || 0) * (1 - ps.flee);
    b.tail2.rotation.x = -(P.tailHang || 0) * 0.5 * (1 - ps.flee);
    b.tail2.rotation.y = Math.sin(A.wag - 0.6) * wag * 0.8;
  }
  // birds: flapping (o.flap 0..1), gliding with the wings a little up, the kite's tail twisting; perched: wings folded
  function animBird(A, P, dt, sp, o) {
    const b = A.b;
    A.t += dt;
    const perch = o.perch ? 1 : 0;
    A.pose.lie += (perch - A.pose.lie) * (1 - Math.exp(-dt * 4));
    const pf = A.pose.lie;
    A.ph = (A.ph + dt * (P.flapHz || 3) * (o.flap || 0)) % 1;
    const fl = (o.flap || 0) * Math.sin(2 * Math.PI * A.ph);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const glide = P.dihedral || 0.08;
      b['wing' + s].rotation.z = sx * (glide + fl * 0.55) * (1 - pf) + pf * sx * -0.25;
      b['wing' + s].rotation.y = pf * sx * 1.5;
      b['hand' + s].rotation.z = sx * (fl * 0.35 - (o.flap ? 0 : 0.04)) * (1 - pf);
      b['hand' + s].rotation.y = pf * sx * -2.9 + (1 - pf) * sx * (o.sweep || 0) * 0.4;
    }
    b.tail.rotation.z = (o.twist || 0) * 0.5;
    b.tail.rotation.x = (o.tailDown || 0) * 0.3 + pf * 0.5;
    b.head.rotation.y = (o.look || 0) * 0.8;
    b.root.rotation.z = (o.bank || 0) * (1 - pf);
    b.root.rotation.x = (o.pitch || 0) * (1 - pf) - pf * (P.perchUp || 0.9);
    b.root.position.y = pf * (P.perchY || 0.12);
  }
  // ---------- the plans ----------
  // coat helpers: countershading (lighter below), a darker back line
  const shade = (c, q, back = 0.04, mott = 0.06) => {
    const v = 1 - Math.cos(q.th) * back + (hash(q.x, q.y, q.z) - 0.5) * mott;
    return [c[0] * v, c[1] * v, c[2] * v];
  };
  // 1 on the belly (th = π), 0 on the back
  const below = q => sst(0.45, 0.9, 1 - Math.abs(q.th - Math.PI) / Math.PI);
  const PLANS = {};
  // roe deer (Capreolus capreolus): shoulder 0.65–0.75 m, trunk ~0.8 m, 15–30 kg; the rump higher than the withers, long neck, big ears,
  // black nose, white chin, the white rump patch (heart-shaped in does, kidney-shaped in bucks), tail barely to be seen; red-brown in
  // summer, grey-brown in winter (May and September–October the change); bucks with antlers (three tines a side) from spring to autumn
  PLANS.reh = {
    k: 1,
    trunk: [
      [-0.45, 0.71, 0.63, 0.04],
      [-0.41, 0.76, 0.49, 0.095],
      [-0.29, 0.79, 0.44, 0.125],
      [-0.12, 0.765, 0.43, 0.125],
      [0.05, 0.74, 0.39, 0.13],
      [0.22, 0.745, 0.36, 0.12],
      [0.34, 0.74, 0.38, 0.1],
      [0.42, 0.68, 0.45, 0.07],
    ],
    neck: [
      [0.34, 0.6, 0.07, 0.1],
      [0.43, 0.72, 0.062, 0.085],
      [0.5, 0.85, 0.052, 0.068],
      [0.55, 0.95, 0.046, 0.058],
      [0.58, 1.0, 0.05, 0.062],
      [0.635, 0.995, 0.052, 0.06],
      [0.7, 0.965, 0.038, 0.045],
      [0.76, 0.935, 0.026, 0.032],
      [0.79, 0.92, 0.02, 0.025],
    ],
    neckMid: 2,
    headAt: 4,
    hx: 0.075,
    fx: 0.07,
    hind: [
      [-0.27, 0.62],
      [-0.17, 0.41],
      [-0.33, 0.23],
      [-0.3, 0.035],
    ],
    hindR: [0.11, 0.085, 0.045, 0.026, 0.018, 0.017],
    front: [
      [0.3, 0.54],
      [0.25, 0.36],
      [0.27, 0.19],
      [0.275, 0.035],
    ],
    frontR: [0.08, 0.06, 0.035, 0.022, 0.016, 0.016],
    ear: { p: [0.585, 1.035], x: 0.035, out: 0.55, up: 0.75, back: -0.35, len: 0.13, wid: 0.065 },
    eye: { p: [0.655, 1.0], x: 0.044, r: 0.011 },
    tail: {
      p: [
        [-0.44, 0.69],
        [-0.47, 0.66],
        [-0.485, 0.63],
        [-0.49, 0.61],
      ],
      r: [0.022, 0.02, 0.014, 0.006],
    },
    gait: { f0: 1.35, trot: 1.7, gallop: 4 },
    bounds: true,
    lieDrop: 0.36,
    tailFlee: 0.8,
    neckPose: { graze: [1.05, 0.55], alert: [-0.3, -0.12], lie: [0.35, 0.1], dig: [0.6, 0.45] },
    antler(B, sk, W, loft, V3, coat, v) {
      // a six-pointer: beam up and a little back, a front tine low, a back tine near the top; pearled and brown
      for (const s of [1, -1]) {
        const b0 = V3(s * 0.025, 1.045, 0.6),
          w = [W(sk, 'head')];
        const beam = [b0, V3(s * 0.035, 1.12, 0.595), V3(s * 0.045, 1.2, 0.585), V3(s * 0.04, 1.26, 0.6)].map(
          (p, i) => ({
            p,
            rx: [0.014, 0.011, 0.009, 0.004][i],
            ry: [0.014, 0.011, 0.009, 0.004][i],
            w,
            u: i / 3,
          })
        );
        loft(B, beam, { part: 'antler', sides: 6, sub: 1, coat, cap0: false, cap1: 0.004 });
        loft(
          B,
          [V3(s * 0.037, 1.135, 0.598), V3(s * 0.04, 1.165, 0.64), V3(s * 0.042, 1.185, 0.655)].map((p, i) => ({
            p,
            rx: [0.009, 0.006, 0.003][i],
            ry: [0.009, 0.006, 0.003][i],
            w,
            u: i / 2,
          })),
          { part: 'antler', sides: 5, sub: 1, coat, cap0: false, cap1: 0.003 }
        );
        loft(
          B,
          [V3(s * 0.044, 1.21, 0.585), V3(s * 0.046, 1.235, 0.55), V3(s * 0.047, 1.25, 0.535)].map((p, i) => ({
            p,
            rx: [0.008, 0.005, 0.003][i],
            ry: [0.008, 0.005, 0.003][i],
            w,
            u: i / 2,
          })),
          { part: 'antler', sides: 5, sub: 1, coat, cap0: false, cap1: 0.003 }
        );
      }
    },
    coat(q, v) {
      const winter = !!v.winter;
      const top = lin(winter ? 0x6a5c4f : 0x8a4f2b),
        side = lin(winter ? 0x786a5b : 0x99603a),
        belly = lin(winter ? 0xaea392 : 0xb98f68);
      if (q.part === 'antler') return lin(q.u > 0.85 ? 0xd8ccb4 : 0x5e4a36);
      let c = mix(side, top, sst(0.3, 0.9, Math.cos(q.th)));
      c = mix(c, belly, below(q) * 0.8);
      if (q.part === 'trunk') {
        // the rump patch: white around the tail, the shape a heart/kidney on the back of the thighs
        const r = Math.hypot(q.x / 0.1, (q.y - 0.6) / 0.14);
        if (q.z < -0.33 && r < 1.15)
          c = mix(c, lin(winter ? 0xf2efe8 : 0xe8dcc6), sst(1.15, 0.7, r) * (winter ? 1 : 0.75));
      }
      if (q.part === 'tail') c = lin(winter ? 0xefeae0 : 0xe0d2b8);
      if (q.part === 'neck') {
        // the muzzle: black nose, the white chin; in winter a pale throat patch
        if (q.z > 0.74) c = mix(c, lin(0x16110e), sst(0.755, 0.78, q.z));
        if (q.z > 0.69 && Math.cos(q.th) < -0.2) c = mix(c, lin(0xeee8dc), 0.85);
        if (winter && q.z > 0.4 && q.z < 0.52 && Math.cos(q.th) < 0.3) c = mix(c, lin(0xe6e0d4), 0.6);
        if (q.z > 0.6 && q.z < 0.7 && Math.cos(q.th) > 0.5) c = mix(c, lin(0x5a4636), 0.3);
      }
      if (q.part === 'ear') c = mix(lin(winter ? 0x6a5d50 : 0x8a5530), lin(0x2a221c), sst(0.7, 1, q.u));
      if (q.part === 'hleg' || q.part === 'fleg') {
        c = mix(c, lin(winter ? 0x6b5e50 : 0x8d5a34), sst(0.3, 0.6, q.u));
        if (q.u > 0.92) c = lin(0x1d1915);
        if (q.part === 'hleg' && q.u > 0.55 && q.u < 0.68) c = mix(c, lin(0x3a2e24), 0.5);
      }
      return shade(c, q);
    },
  };
  // wild boar (Sus scrofa): sows ~0.85 m at the shoulder, ~1.1 m trunk, 60–80 kg; the massive front with the bristle ridge, the wedge
  // head without much neck, small erect ears, a straight tail with a tassel; grey-brown to black; piglets striped until late summer
  PLANS.sau = {
    k: 1.2,
    e: 2.6,
    trunk: [
      [-0.56, 0.6, 0.48, 0.055],
      [-0.51, 0.69, 0.35, 0.15],
      [-0.36, 0.73, 0.3, 0.19],
      [-0.15, 0.77, 0.28, 0.205],
      [0.06, 0.81, 0.27, 0.21],
      [0.25, 0.86, 0.29, 0.2],
      [0.4, 0.84, 0.31, 0.18],
      [0.5, 0.76, 0.34, 0.16],
    ],
    neck: [
      [0.36, 0.6, 0.17, 0.22, 2.4],
      [0.47, 0.6, 0.17, 0.2, 2.4],
      [0.57, 0.57, 0.15, 0.17, 2.3],
      [0.66, 0.53, 0.125, 0.14],
      [0.73, 0.48, 0.1, 0.11],
      [0.8, 0.42, 0.075, 0.08],
      [0.87, 0.37, 0.058, 0.058],
      [0.92, 0.34, 0.05, 0.048],
      [0.935, 0.335, 0.047, 0.045],
    ],
    neckMid: 1,
    headAt: 3,
    noseCap: 0.004,
    hx: 0.11,
    fx: 0.11,
    hind: [
      [-0.33, 0.5],
      [-0.23, 0.31],
      [-0.37, 0.16],
      [-0.34, 0.03],
    ],
    hindR: [0.16, 0.12, 0.06, 0.04, 0.03, 0.028],
    front: [
      [0.3, 0.53],
      [0.25, 0.32],
      [0.27, 0.15],
      [0.28, 0.03],
    ],
    frontR: [0.13, 0.1, 0.055, 0.035, 0.028, 0.027],
    ear: { p: [0.6, 0.7], x: 0.085, out: 0.6, up: 0.75, back: -0.3, len: 0.12, wid: 0.075 },
    eye: { p: [0.705, 0.57], x: 0.085, r: 0.011 },
    tail: {
      p: [
        [-0.55, 0.6],
        [-0.58, 0.52],
        [-0.59, 0.44],
        [-0.59, 0.38],
      ],
      r: [0.022, 0.014, 0.012, 0.028],
    },
    gait: { f0: 1.6, trot: 1.1, gallop: 3.5 },
    lieDrop: 0.4,
    tailFlee: 1.3,
    tailHang: 0.2,
    neckPose: { graze: [0.45, 0.35], alert: [-0.18, -0.12], lie: [0.15, 0.1], dig: [0.55, 0.4] },
    coat(q, v) {
      const young = !!v.young;
      let c = lin(young ? 0x7a5a3c : 0x4a3e34);
      const dark = lin(young ? 0x5c412a : 0x2c2520);
      c = mix(c, dark, sst(0.2, 0.9, Math.cos(q.th)) * 0.7);
      if (q.part === 'trunk' && !young && Math.cos(q.th) > 0.85 && q.z > -0.2) c = mix(c, lin(0x221d19), 0.7);
      if (young && (q.part === 'trunk' || (q.part === 'neck' && q.z < 0.6))) {
        // the stripes of the piglets: pale bands along the body
        const a = Math.abs(Math.sin(q.th * 3.5));
        if (Math.cos(q.th) > -0.4) c = mix(c, lin(0xc8a878), sst(0.82, 0.95, a) * 0.85);
      }
      if (q.part === 'neck') {
        if (q.z > 0.9) c = lin(0x3a302c);
        if (q.z > 0.6 && q.z < 0.85 && Math.cos(q.th) < 0) c = mix(c, lin(young ? 0x8a6a4a : 0x5d5048), 0.5);
      }
      if (q.part === 'ear') c = lin(young ? 0x5c4430 : 0x2c2621);
      if (q.part === 'tail') c = lin(0x221d1a);
      if (q.part === 'hleg' || q.part === 'fleg') {
        c = mix(c, lin(0x221c18), sst(0.35, 0.65, q.u));
        if (q.u > 0.9) c = lin(0x16120f);
      }
      return shade(c, q, 0.05, 0.1);
    },
  };
  // the companion dog: an Altdeutscher Hütehund of the type Gelbbacke (central German type: 55–60 cm, black with tan on the cheeks,
  // above the eyes, the muzzle and the legs; erect triangular ears; the tail hanging low, bushy) – a herding dog for goats and sheep
  PLANS.hund = {
    k: 1,
    trunk: [
      [-0.36, 0.55, 0.47, 0.05],
      [-0.32, 0.58, 0.4, 0.1],
      [-0.2, 0.585, 0.37, 0.115],
      [-0.03, 0.575, 0.36, 0.115],
      [0.12, 0.58, 0.31, 0.125],
      [0.25, 0.595, 0.29, 0.12],
      [0.33, 0.58, 0.31, 0.1],
      [0.39, 0.53, 0.35, 0.075],
    ],
    neck: [
      [0.28, 0.5, 0.075, 0.1],
      [0.37, 0.6, 0.07, 0.085],
      [0.43, 0.69, 0.062, 0.072],
      [0.46, 0.745, 0.064, 0.072],
      [0.49, 0.77, 0.072, 0.075],
      [0.55, 0.765, 0.068, 0.065],
      [0.6, 0.735, 0.042, 0.04],
      [0.655, 0.715, 0.032, 0.03],
      [0.685, 0.705, 0.026, 0.024],
    ],
    neckMid: 2,
    headAt: 4,
    hx: 0.065,
    fx: 0.065,
    paw: true,
    hind: [
      [-0.25, 0.5],
      [-0.16, 0.33],
      [-0.3, 0.17],
      [-0.27, 0.03],
    ],
    hindR: [0.095, 0.075, 0.04, 0.026, 0.022, 0.025],
    front: [
      [0.24, 0.46],
      [0.21, 0.3],
      [0.235, 0.12],
      [0.24, 0.03],
    ],
    frontR: [0.07, 0.055, 0.032, 0.023, 0.021, 0.025],
    ear: { p: [0.5, 0.8], x: 0.045, out: 0.35, up: 0.9, back: -0.15, len: 0.1, wid: 0.075 },
    eye: { p: [0.565, 0.778], x: 0.036, r: 0.01, col: 0x2a1a0c },
    tail: {
      p: [
        [-0.35, 0.54],
        [-0.42, 0.45],
        [-0.45, 0.34],
        [-0.44, 0.24],
      ],
      r: [0.035, 0.042, 0.036, 0.012],
    },
    gait: { f0: 1.7, trot: 1.3, gallop: 4.2 },
    lieDrop: 0.3,
    sitTilt: 0.6,
    tailFlee: 0.2,
    tailHang: 0.25,
    neckPose: { graze: [0.85, 0.5], alert: [-0.25, -0.1], lie: [0.45, 0.1], dig: [0.7, 0.5] },
    coat(q) {
      const black = lin(0x1c1a19),
        tan = lin(0xb07a3e);
      let c = black;
      if (q.part === 'neck') {
        // the yellow cheeks, the spots above the eyes, the tan muzzle
        if (q.z > 0.53 && Math.cos(q.th) < 0.55) c = mix(c, tan, sst(0.53, 0.58, q.z));
        if (Math.abs(q.z - 0.545) < 0.018 && Math.cos(q.th) > 0.55 && Math.abs(q.x) > 0.012) c = tan;
        if (q.z > 0.66) c = mix(c, lin(0x141210), sst(0.665, 0.685, q.z));
        if (q.z < 0.45 && Math.cos(q.th) < -0.4) c = mix(c, tan, 0.55);
      }
      if (q.part === 'trunk' && Math.cos(q.th) < -0.6 && q.z > 0.15) c = mix(c, tan, 0.45);
      if (q.part === 'hleg' || q.part === 'fleg') c = mix(c, tan, sst(0.45, 0.65, q.u));
      if (q.part === 'tail') c = mix(c, tan, Math.cos(q.th) < -0.3 ? 0.4 : 0);
      if (q.part === 'ear') c = mix(lin(0x1a1817), lin(0x3a2a1e), q.th > Math.PI ? 0.3 : 0);
      return shade(c, q, 0.05, 0.05);
    },
  };
  // the red kite (Milvus milvus): 61–72 cm long, wingspan 1.75 m, the deeply forked rufous tail, pale grey head, white patches under the
  // hand, black wing tips; soars over fields and meadows with few wingbeats, twisting its tail to steer. Germany holds more than half of
  // the world's red kites
  PLANS.milan = {
    bird: true,
    headY: 0.02,
    headZ: 0.2,
    tailZ: -0.13,
    sh: 0.045,
    shZ: 0.04,
    wrist: 0.42,
    wristZ: 0.05,
    flapHz: 2.4,
    dihedral: 0.06,
    body: [
      [-0.15, 0.0, 0.035, 0.03],
      [-0.08, 0.0, 0.055, 0.05],
      [0.02, 0.005, 0.065, 0.06],
      [0.12, 0.012, 0.055, 0.055],
      [0.2, 0.02, 0.04, 0.042],
      [0.25, 0.018, 0.032, 0.034],
      [0.285, 0.008, 0.012, 0.016],
    ],
    eye: { p: [0.24, 0.035], x: 0.026, r: 0.006, col: 0xd8b020 },
    wing: {
      span: 0.85,
      thick: 0.018,
      fingers: 6,
      fingerLen: 0.17,
      rows: [
        [0.04, 0.11, -0.16, 'arm'],
        [0.22, 0.12, -0.17, 'arm'],
        [0.4, 0.11, -0.15, 'mid'],
        [0.56, 0.07, -0.11, 'hand'],
        [0.68, 0.03, -0.07, 'hand'],
      ],
    },
    tailFan: { z0: -0.13, z1: -0.42, w0: 0.07, w1: 0.2, fork: 0.09 },
    coat(q) {
      if (q.part === 'body') {
        let c = lin(0xa4552a);
        if (q.u > 0.68) c = mix(c, lin(0xd9d6cf), sst(0.68, 0.78, q.u));
        if (q.u > 0.95) c = lin(0xc8a040);
        if (Math.cos(q.th) < -0.3) c = mix(c, lin(0x9a4a22), 0.4);
        return shade(c, q, 0.02, 0.06);
      }
      if (q.part === 'tail') return q.up ? lin(0xc4642c) : lin(0xd89a6a);
      // wings: above rufous coverts with a pale band, dark flight feathers, black hand; below the white window under the hand
      const s = q.span;
      if (q.up) {
        if (s > 0.7) return lin(0x1d1714);
        if (q.t > 0.55) return lin(0x3a2a20);
        return mix(lin(0x9a5028), lin(0xc8b49a), sst(0.4, 0.6, s) * (q.t < 0.35 ? 0.7 : 0));
      }
      if (s > 0.82) return lin(0x221a16);
      if (s > 0.5 && s <= 0.82 && q.t > 0.25) return lin(0xece8e0);
      if (q.t > 0.6) return lin(0x4a3a30);
      return lin(0x8c4826);
    },
  };
  S.PLANS = PLANS;
  S.make = make;
  S.lin = lin;
  S.GAITS = GAITS;
  return S;
})();
window.TKOERPER = TKOERPER;
