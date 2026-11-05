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
    // and instanced (saplings, tree guards, rooted soil, bore dust: tiere/tiere_einfluss.js)
    const im = new THREE.InstancedMesh(g, MAT, 1);
    im.visible = false;
    im.userData.noMerge = true;
    im.name = 'tiere carrier instanced';
    scene.add(im);
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
      { part: 'trunk', sides: Pn.sides || 16, sub: 2, coat, cap0: 0.03, cap1: 0.03 }
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
    if (Pn.extra) Pn.extra(B, sk, W, loft, V3, coat, variant);
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
  // countershading, fine mottling and a slow variation along the body (no coat is one colour)
  const shade = (c, q, back = 0.04, mott = 0.06) => {
    const slow = Math.sin(q.z * 9.1 + Math.cos(q.th) * 1.7) * 0.5 + Math.sin(q.z * 23.3 + q.th * 2.1) * 0.25;
    const v = 1 - Math.cos(q.th) * back + (hash(q.x, q.y, q.z) - 0.5) * mott + slow * 0.07;
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
    e: 2,
    sides: 18,
    trunk: [
      [-0.43, 0.7, 0.62, 0.035],
      [-0.4, 0.745, 0.52, 0.08],
      [-0.3, 0.765, 0.47, 0.102],
      [-0.15, 0.745, 0.47, 0.105],
      [0.02, 0.725, 0.43, 0.11],
      [0.18, 0.725, 0.4, 0.106],
      [0.3, 0.715, 0.41, 0.092],
      [0.38, 0.66, 0.46, 0.066],
    ],
    neck: [
      [0.3, 0.6, 0.06, 0.085],
      [0.38, 0.69, 0.05, 0.07],
      [0.44, 0.79, 0.042, 0.058],
      [0.49, 0.88, 0.038, 0.05],
      [0.53, 0.95, 0.04, 0.05],
      [0.575, 0.985, 0.045, 0.05],
      [0.63, 0.975, 0.041, 0.045],
      [0.685, 0.945, 0.029, 0.034],
      [0.73, 0.92, 0.02, 0.026],
      [0.748, 0.91, 0.015, 0.02],
    ],
    neckMid: 2,
    headAt: 4,
    hx: 0.068,
    fx: 0.062,
    hind: [
      [-0.28, 0.63],
      [-0.19, 0.45],
      [-0.33, 0.27],
      [-0.305, 0.03],
    ],
    hindR: [0.085, 0.068, 0.038, 0.017, 0.011, 0.012],
    front: [
      [0.29, 0.55],
      [0.25, 0.42],
      [0.265, 0.21],
      [0.27, 0.03],
    ],
    frontR: [0.062, 0.048, 0.028, 0.015, 0.01, 0.011],
    ear: { p: [0.56, 1.02], x: 0.03, out: 0.5, up: 0.8, back: -0.4, len: 0.125, wid: 0.06 },
    eye: { p: [0.625, 0.99], x: 0.04, r: 0.0105 },
    tail: {
      p: [
        [-0.42, 0.69],
        [-0.45, 0.665],
        [-0.465, 0.64],
        [-0.47, 0.625],
      ],
      r: [0.02, 0.018, 0.012, 0.005],
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
      const top = lin(winter ? 0x564c43 : 0x6e4129),
        side = lin(winter ? 0x655a4e : 0x7d4c30),
        belly = lin(winter ? 0x958b7e : 0x9c8064);
      if (q.part === 'antler') return v.antler === 'bast' ? lin(0x6a5a4a) : lin(q.u > 0.85 ? 0xd8ccb4 : 0x5e4a36);
      let c = mix(side, top, sst(0.3, 0.9, Math.cos(q.th)));
      c = mix(c, belly, below(q) * 0.8);
      // the fawn's white spots in rows along the back and flanks
      if (v.spots && q.part === 'trunk' && Math.cos(q.th) > -0.3 && q.z > -0.35 && q.z < 0.32) {
        const sp = Math.sin(q.z * 70 + Math.floor(q.th * 4) * 1.3) * Math.sin(q.th * 9);
        if (sp > 0.55) c = mix(c, lin(0xe8dcc8), 0.8);
      }
      if (q.part === 'trunk') {
        // the rump patch: white around the tail, the shape a heart/kidney on the back of the thighs
        const r = Math.hypot(q.x / 0.085, (q.y - 0.62) / 0.13);
        if (q.z < -0.34 && r < 1.15)
          c = mix(c, lin(winter ? 0xf2efe8 : 0xe8dcc6), sst(1.15, 0.7, r) * (winter ? 1 : 0.75));
      }
      if (q.part === 'tail') c = lin(winter ? 0xefeae0 : 0xe0d2b8);
      if (q.part === 'neck') {
        // the muzzle: black nose, the white chin; in winter a pale throat patch
        if (q.z > 0.715) c = mix(c, lin(0x16110e), sst(0.715, 0.735, q.z));
        if (q.z > 0.66 && q.z < 0.72 && Math.cos(q.th) < -0.2) c = mix(c, lin(0xe6e0d4), 0.85);
        if (winter && q.z > 0.36 && q.z < 0.46 && Math.cos(q.th) < 0.3) c = mix(c, lin(0xd8d2c6), 0.55);
        if (q.z > 0.56 && q.z < 0.68 && Math.cos(q.th) > 0.4) c = mix(c, lin(0x463a30), 0.35);
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
    e: 2.5,
    sides: 18,
    trunk: [
      [-0.52, 0.6, 0.46, 0.05],
      [-0.48, 0.67, 0.36, 0.115],
      [-0.35, 0.7, 0.32, 0.145],
      [-0.15, 0.74, 0.3, 0.155],
      [0.05, 0.78, 0.28, 0.16],
      [0.22, 0.83, 0.28, 0.16],
      [0.34, 0.86, 0.3, 0.155],
      [0.44, 0.8, 0.33, 0.135],
    ],
    neck: [
      [0.34, 0.62, 0.145, 0.2, 2.4],
      [0.44, 0.62, 0.14, 0.19, 2.4],
      [0.53, 0.59, 0.125, 0.165, 2.3],
      [0.61, 0.54, 0.1, 0.135, 2.2],
      [0.69, 0.48, 0.077, 0.1],
      [0.77, 0.42, 0.058, 0.07],
      [0.84, 0.365, 0.047, 0.052],
      [0.88, 0.338, 0.045, 0.046],
      [0.892, 0.332, 0.043, 0.043],
    ],
    neckMid: 1,
    headAt: 2,
    noseCap: 0.004,
    hx: 0.095,
    fx: 0.095,
    hind: [
      [-0.33, 0.48],
      [-0.24, 0.3],
      [-0.36, 0.16],
      [-0.33, 0.03],
    ],
    hindR: [0.13, 0.11, 0.05, 0.028, 0.02, 0.022],
    front: [
      [0.3, 0.5],
      [0.26, 0.3],
      [0.28, 0.13],
      [0.29, 0.03],
    ],
    frontR: [0.11, 0.085, 0.042, 0.024, 0.018, 0.02],
    ear: { p: [0.56, 0.72], x: 0.065, out: 0.5, up: 0.85, back: -0.3, len: 0.13, wid: 0.075 },
    eye: { p: [0.64, 0.585], x: 0.078, r: 0.009 },
    tail: {
      p: [
        [-0.51, 0.6],
        [-0.54, 0.52],
        [-0.555, 0.44],
        [-0.56, 0.38],
      ],
      r: [0.02, 0.012, 0.01, 0.024],
    },
    gait: { f0: 1.6, trot: 1.1, gallop: 3.5 },
    lieDrop: 0.36,
    tailFlee: 1.3,
    tailHang: 0.2,
    neckPose: { graze: [0.45, 0.35], alert: [-0.18, -0.12], lie: [0.15, 0.1], dig: [0.55, 0.4] },
    // the bristle mane along the spine, from the neck to the middle of the back
    extra(B, sk, W, loft, V3, coat) {
      const pts = [
        [0.5, 0.74, 'chest'],
        [0.4, 0.88, 'chest'],
        [0.28, 0.885, 'chest'],
        [0.12, 0.85, 'root'],
        [-0.05, 0.8, 'root'],
        [-0.2, 0.755, 'hips'],
      ];
      loft(
        B,
        pts.map(([z, y, bn], i) => ({
          p: V3(0, y, z),
          rx: 0.016,
          ry: [0.03, 0.05, 0.05, 0.04, 0.03, 0.012][i],
          w: [W(sk, bn)],
          u: i / (pts.length - 1),
        })),
        { part: 'mane', sides: 6, sub: 2, coat, cap0: 0.01, cap1: 0.01 }
      );
    },
    coat(q, v) {
      // grey-brown to black-brown, every bristle a little different; the young brown, striped only in their first summer
      const young = !!v.young;
      let c = lin(young ? 0x5e4430 : 0x433a33);
      const dark = lin(young ? 0x3e2c1e : 0x231e1a);
      c = mix(c, dark, sst(0.1, 0.9, Math.cos(q.th)) * 0.75);
      c = mix(c, lin(young ? 0x8a6a4c : 0x6e645a), hash(q.x * 7, q.y * 7, q.z * 7) * 0.35);
      if (q.part === 'mane') c = lin(0x16130f);
      if (v.stripes && (q.part === 'trunk' || (q.part === 'neck' && q.z < 0.6))) {
        const a = Math.abs(Math.sin(q.th * 3.5));
        if (Math.cos(q.th) > -0.4) c = mix(c, lin(0xb89a6c), sst(0.82, 0.95, a) * 0.85);
      }
      if (q.part === 'neck') {
        if (q.z > 0.87) c = lin(0x2e2826);
        else if (q.z > 0.6 && Math.cos(q.th) < 0.2) c = mix(c, lin(young ? 0x7a5e44 : 0x5c544c), 0.45);
      }
      if (q.part === 'ear') c = lin(young ? 0x4a3626 : 0x221d1a);
      if (q.part === 'tail') c = lin(0x1e1a17);
      if (q.part === 'hleg' || q.part === 'fleg') {
        c = mix(c, lin(0x1c1815), sst(0.3, 0.6, q.u));
        if (q.u > 0.9) c = lin(0x141110);
      }
      return shade(c, q, 0.05, 0.16);
    },
  };
  // the companion dog: an Altdeutscher Hütehund of the type Gelbbacke (central German type: 55–60 cm, black with tan on the cheeks,
  // above the eyes, the muzzle and the legs; erect triangular ears; the tail hanging low, bushy) – a herding dog for goats and sheep
  PLANS.hund = {
    k: 1,
    e: 2.1,
    sides: 16,
    trunk: [
      [-0.36, 0.55, 0.46, 0.05],
      [-0.32, 0.585, 0.39, 0.105],
      [-0.2, 0.59, 0.37, 0.125],
      [-0.03, 0.58, 0.36, 0.125],
      [0.12, 0.585, 0.3, 0.135],
      [0.25, 0.6, 0.28, 0.13],
      [0.33, 0.585, 0.3, 0.11],
      [0.39, 0.53, 0.35, 0.085],
    ],
    neck: [
      [0.27, 0.5, 0.09, 0.115],
      [0.36, 0.58, 0.085, 0.1],
      [0.42, 0.65, 0.074, 0.084],
      [0.46, 0.7, 0.068, 0.075],
      [0.49, 0.725, 0.073, 0.076],
      [0.55, 0.72, 0.068, 0.066],
      [0.6, 0.69, 0.042, 0.04],
      [0.655, 0.67, 0.032, 0.03],
      [0.685, 0.66, 0.026, 0.024],
    ],
    neckMid: 2,
    headAt: 4,
    hx: 0.07,
    fx: 0.066,
    paw: true,
    hind: [
      [-0.25, 0.5],
      [-0.16, 0.33],
      [-0.3, 0.17],
      [-0.27, 0.03],
    ],
    hindR: [0.1, 0.08, 0.045, 0.026, 0.022, 0.026],
    front: [
      [0.24, 0.46],
      [0.21, 0.3],
      [0.235, 0.12],
      [0.24, 0.03],
    ],
    frontR: [0.075, 0.06, 0.036, 0.024, 0.021, 0.025],
    ear: { p: [0.5, 0.755], x: 0.045, out: 0.35, up: 0.9, back: -0.15, len: 0.1, wid: 0.075 },
    eye: { p: [0.565, 0.733], x: 0.036, r: 0.01, col: 0x2a1a0c },
    tail: {
      p: [
        [-0.35, 0.54],
        [-0.42, 0.45],
        [-0.45, 0.34],
        [-0.44, 0.24],
      ],
      r: [0.04, 0.05, 0.045, 0.016],
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
        if (Math.abs(q.z - 0.548) < 0.016 && Math.cos(q.th) > 0.55 && Math.abs(q.x) > 0.012) c = tan;
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
  // ---------- more species from the plans above, scaled (length sz, height sy, width sx) and with their own features ----------
  function scaled(base, sx, sy, sz, o = {}) {
    const P = Object.assign({}, base);
    P.trunk = base.trunk.map(([z, t, b, w, e]) => [z * sz, t * sy, b * sy, w * sx, e]);
    P.neck = base.neck.map(([z, y, rx, ry, e]) => [z * sz, y * sy, rx * sx, ry * sy, e]);
    P.hind = base.hind.map(([z, y]) => [z * sz, y * sy]);
    P.front = base.front.map(([z, y]) => [z * sz, y * sy]);
    P.hindR = base.hindR.map(r => r * sx);
    P.frontR = base.frontR.map(r => r * sx);
    P.ear = Object.assign({}, base.ear, {
      p: [base.ear.p[0] * sz, base.ear.p[1] * sy],
      x: base.ear.x * sx,
      len: base.ear.len * sy,
      wid: base.ear.wid * sx,
    });
    P.eye = Object.assign({}, base.eye, {
      p: [base.eye.p[0] * sz, base.eye.p[1] * sy],
      x: base.eye.x * sx,
      r: base.eye.r * sx,
    });
    P.tail = {
      p: base.tail.p.map(([z, y]) => [z * sz, y * sy]),
      r: base.tail.r.map(r => r * sx),
      flat: base.tail.flat,
    };
    P.hx = base.hx * sx;
    P.fx = base.fx * sx;
    P.lieDrop = base.lieDrop * sy;
    P.k = (base.k || 1) * sz;
    P.gait = Object.assign({}, base.gait, { f0: base.gait.f0 / Math.sqrt(sy) });
    delete P.antler;
    return Object.assign(P, o);
  }
  // red fox (Vulpes vulpes): 35–40 cm at the shoulder, slim, the long pointed snout, big pointed ears black at the back, black stockings,
  // the bushy tail (Lunte) with the white tip
  PLANS.fuchs = scaled(PLANS.hund, 0.62, 0.66, 0.68, {
    ear: { p: [0.34, 0.545], x: 0.03, out: 0.3, up: 0.95, back: -0.05, len: 0.085, wid: 0.065 },
    tail: {
      p: [
        [-0.24, 0.35],
        [-0.36, 0.27],
        [-0.47, 0.19],
        [-0.6, 0.13],
      ],
      r: [0.03, 0.06, 0.065, 0.03],
    },
    tailHang: 0.12,
    coat(q) {
      const red = lin(0xb85a24),
        white = lin(0xece6dc),
        black = lin(0x1e1916);
      let c = mix(red, lin(0x9c4a1e), sst(0.4, 0.95, Math.cos(q.th)) * 0.5);
      if (q.part === 'neck') {
        if (q.z > 0.3 && Math.cos(q.th) < -0.2) c = mix(c, white, 0.9);
        if (q.z < 0.3 && Math.cos(q.th) < -0.35) c = mix(c, white, 0.8);
        if (q.z > 0.455) c = lin(0x16110f);
      }
      if (q.part === 'trunk' && Math.cos(q.th) < -0.5) c = mix(c, lin(0xd8cfc2), 0.6);
      if (q.part === 'hleg' || q.part === 'fleg') c = mix(c, black, sst(0.35, 0.55, q.u));
      if (q.part === 'ear') c = q.th > Math.PI ? black : mix(black, red, 0.3);
      if (q.part === 'tail') c = q.u > 0.82 ? white : mix(c, lin(0x6a4a30), sst(0.5, 0.8, q.u) * 0.4);
      return shade(c, q, 0.04, 0.08);
    },
  });
  // brown hare (Lepus europaeus): low and arched, very long hind legs folded under, ears 12 cm with black tips, the tail black above,
  // white below; it hops
  PLANS.hase = scaled(PLANS.hund, 0.62, 0.5, 0.62, {
    hind: [
      [-0.16, 0.27],
      [-0.07, 0.18],
      [-0.2, 0.07],
      [-0.06, 0.02],
    ],
    hindR: [0.07, 0.06, 0.028, 0.02, 0.016, 0.018],
    front: [
      [0.15, 0.22],
      [0.13, 0.14],
      [0.15, 0.06],
      [0.16, 0.02],
    ],
    frontR: [0.03, 0.025, 0.015, 0.012, 0.011, 0.012],
    ear: { p: [0.3, 0.4], x: 0.022, out: 0.15, up: 0.85, back: -0.45, len: 0.13, wid: 0.038 },
    tail: {
      p: [
        [-0.22, 0.27],
        [-0.25, 0.29],
        [-0.265, 0.3],
        [-0.27, 0.3],
      ],
      r: [0.03, 0.035, 0.025, 0.01],
    },
    bounds: true,
    gait: { f0: 2.4, trot: 0.9, gallop: 2.2 },
    sitTilt: 0.35,
    coat(q) {
      let c = mix(lin(0x8a6a48), lin(0x6a5038), sst(0.3, 0.9, Math.cos(q.th)));
      // the grizzled look: dark tips
      c = mix(c, lin(0x3a2e24), hash(q.x * 3, q.y * 3, q.z * 3) * 0.25);
      if (q.part === 'trunk' && Math.cos(q.th) < -0.4) c = mix(c, lin(0xe8e2d8), 0.85);
      if (q.part === 'neck' && q.z > 0.3 && Math.cos(q.th) < 0) c = mix(c, lin(0xd8cbb4), 0.6);
      if (q.part === 'ear') c = q.u > 0.82 ? lin(0x141210) : lin(0x8c7458);
      if (q.part === 'tail') c = Math.cos(q.th) > 0.2 ? lin(0x1a1614) : lin(0xf0ece4);
      return shade(c, q, 0.04, 0.05);
    },
  });
  // badger (Meles meles): low, wide, short legs, the white face with two black stripes over the eyes, grey silver back, black legs
  PLANS.dachs = scaled(PLANS.hund, 1.35, 0.5, 0.88, {
    ear: { p: [0.4, 0.37], x: 0.04, out: 0.8, up: 0.5, back: -0.2, len: 0.03, wid: 0.035 },
    tail: {
      p: [
        [-0.31, 0.27],
        [-0.36, 0.25],
        [-0.39, 0.23],
        [-0.4, 0.22],
      ],
      r: [0.04, 0.035, 0.025, 0.01],
    },
    gait: { f0: 2.3, trot: 1.0, gallop: 3.0 },
    e: 2.6,
    coat(q) {
      let c = mix(lin(0x9a948a), lin(0x6e6a64), sst(0.2, 0.9, Math.cos(q.th)) * 0.4);
      c = mix(c, lin(0xd0ccc4), hash(q.x * 5, q.y * 5, q.z * 5) * 0.25);
      if (q.part === 'trunk' && Math.cos(q.th) < -0.3) c = lin(0x1c1a18);
      if (q.part === 'hleg' || q.part === 'fleg') c = lin(0x1a1816);
      if (q.part === 'neck') {
        if (q.z > 0.36) {
          // the stripes: black bands from the nose over the eyes to the ears, white between and beside them
          const s = Math.abs(q.x) / 0.05;
          c = s > 0.35 && s < 1.0 && Math.cos(q.th) > -0.3 ? lin(0x151312) : lin(0xeeeae2);
          if (Math.cos(q.th) < -0.4) c = lin(0x1c1a18);
        } else if (Math.cos(q.th) < -0.2) c = lin(0x1c1a18);
      }
      if (q.part === 'ear') c = lin(0xeeeae2);
      return shade(c, q, 0.03, 0.06);
    },
  });
  // raccoon (Procyon lotor): arched back, the black mask, the pale muzzle, the ringed tail, grey-brown
  PLANS.waschbaer = scaled(PLANS.hund, 1.0, 0.55, 0.7, {
    ear: { p: [0.36, 0.44], x: 0.035, out: 0.5, up: 0.8, back: -0.2, len: 0.045, wid: 0.045 },
    tail: {
      p: [
        [-0.24, 0.3],
        [-0.31, 0.24],
        [-0.36, 0.17],
        [-0.4, 0.12],
      ],
      r: [0.04, 0.045, 0.04, 0.02],
    },
    gait: { f0: 2.0, trot: 1.1, gallop: 3.2 },
    coat(q) {
      let c = mix(lin(0x8a8278), lin(0x5a544e), sst(0.3, 0.9, Math.cos(q.th)) * 0.6);
      c = mix(c, lin(0x2a2622), hash(q.x * 4, q.y * 4, q.z * 4) * 0.3);
      if (q.part === 'neck' && q.z > 0.34) {
        // the mask around the eyes, white above and around the muzzle
        const zz = q.z;
        if (zz < 0.385 && Math.cos(q.th) > -0.4) c = lin(0x141210);
        if (zz >= 0.385) c = lin(0xd8d2c8);
        if (zz > 0.44) c = lin(0x1a1614);
      }
      if (q.part === 'tail') c = Math.floor(q.u * 9) % 2 ? lin(0x1c1814) : lin(0x9a9086);
      if (q.part === 'hleg' || q.part === 'fleg') c = mix(c, lin(0x2a2624), sst(0.5, 0.8, q.u));
      if (q.part === 'ear') c = lin(0xc8c2b8);
      return shade(c, q, 0.03, 0.05);
    },
  });
  // stone marten (Martes foina): long and low, short legs, the bushy tail, chocolate brown with the forked white bib
  PLANS.marder = scaled(PLANS.hund, 0.5, 0.3, 0.6, {
    ear: { p: [0.3, 0.255], x: 0.022, out: 0.5, up: 0.85, back: -0.1, len: 0.025, wid: 0.03 },
    tail: {
      p: [
        [-0.21, 0.16],
        [-0.32, 0.13],
        [-0.42, 0.1],
        [-0.48, 0.08],
      ],
      r: [0.025, 0.035, 0.035, 0.015],
    },
    bounds: true,
    gait: { f0: 2.6, trot: 0.8, gallop: 2.0 },
    coat(q) {
      let c = mix(lin(0x5a4230), lin(0x3e2c20), sst(0.3, 0.9, Math.cos(q.th)) * 0.6);
      if (q.part === 'neck' && q.z < 0.3 && Math.cos(q.th) < -0.25) c = lin(0xeee8de);
      if (q.part === 'trunk' && q.z > 0.13 && Math.cos(q.th) < -0.7 && Math.abs(q.x) > 0.01) c = lin(0xeee8de);
      if (q.part === 'hleg' || q.part === 'fleg' || q.part === 'tail') c = mix(c, lin(0x2a1e16), 0.5);
      if (q.part === 'ear') c = lin(0xd8cfc0);
      return shade(c, q, 0.03, 0.05);
    },
  });
  // European wildcat (Felis silvestris): a strong tabby, the round head with a short muzzle, the thick blunt tail with black rings
  // and a black tip, the pink nose; faint stripes, no stripes on the back of the tail's root
  PLANS.katze = scaled(PLANS.hund, 0.78, 0.62, 0.66, {
    neck: [
      [0.17, 0.31, 0.05, 0.065],
      [0.24, 0.37, 0.048, 0.056],
      [0.28, 0.43, 0.046, 0.05],
      [0.3, 0.46, 0.05, 0.052],
      [0.32, 0.475, 0.058, 0.058],
      [0.36, 0.47, 0.054, 0.05],
      [0.385, 0.455, 0.03, 0.028],
      [0.4, 0.45, 0.02, 0.018],
      [0.405, 0.448, 0.014, 0.013],
    ],
    ear: { p: [0.32, 0.51], x: 0.035, out: 0.5, up: 0.85, back: -0.1, len: 0.05, wid: 0.045 },
    eye: { p: [0.365, 0.488], x: 0.026, r: 0.009, col: 0x6a6a20 },
    tail: {
      p: [
        [-0.24, 0.35],
        [-0.34, 0.27],
        [-0.42, 0.2],
        [-0.5, 0.15],
      ],
      r: [0.032, 0.036, 0.036, 0.032],
    },
    tailHang: 0.2,
    noseCap: 0.008,
    coat(q) {
      let c = mix(lin(0x8a7c64), lin(0x6c604e), sst(0.3, 0.9, Math.cos(q.th)) * 0.5);
      // faint tabby stripes across the flanks
      if (q.part === 'trunk' && Math.cos(q.th) > -0.4)
        c = mix(c, lin(0x3a3228), sst(0.75, 0.95, Math.abs(Math.sin(q.z * 55))) * 0.45);
      if (q.part === 'trunk' && Math.cos(q.th) > 0.9) c = mix(c, lin(0x2a241e), 0.6);
      if (q.part === 'tail') c = q.u > 0.85 ? lin(0x141210) : Math.floor(q.u * 7) % 2 && q.u > 0.35 ? lin(0x1e1a16) : c;
      if (q.part === 'neck' && q.z > 0.4) c = lin(0xc89a8a);
      if (q.part === 'neck' && q.z > 0.3 && Math.cos(q.th) < -0.3) c = mix(c, lin(0xe2d8c6), 0.6);
      return shade(c, q, 0.03, 0.06);
    },
  });
  // red deer (Cervus elaphus): hind 1.2 m, stag 1.3 m at the shoulder; reddish brown in summer, grey-brown in winter, a pale yellowish
  // rump patch with a short dark-topped tail; the stag with his mane in autumn and the antlers (tines: brow, bez, trez, the crown)
  PLANS.hirsch = scaled(PLANS.reh, 1.7, 1.62, 1.55, {
    antler(B, sk, W, loft, V3, coat) {
      const w = [W(sk, 'head')];
      const tube = (pts, r0, r1) =>
        loft(
          B,
          pts.map((p, i) => ({
            p,
            rx: r0 + ((r1 - r0) * i) / (pts.length - 1),
            ry: r0 + ((r1 - r0) * i) / (pts.length - 1),
            w,
            u: i / (pts.length - 1),
          })),
          { part: 'antler', sides: 6, sub: 1, coat, cap0: false, cap1: 0.006 }
        );
      for (const s of [1, -1]) {
        const b = [s * 0.06, 1.66, 0.92];
        // the beam: up, back and out, then forward at the top
        const beam = [
          V3(b[0], b[1], b[2]),
          V3(s * 0.12, 1.86, 0.84),
          V3(s * 0.2, 2.06, 0.74),
          V3(s * 0.24, 2.26, 0.7),
          V3(s * 0.22, 2.42, 0.74),
        ];
        tube(beam, 0.03, 0.012);
        // brow and bez tines forward over the face, the trez, the crown at the top
        tube([V3(s * 0.08, 1.72, 0.9), V3(s * 0.1, 1.76, 1.04), V3(s * 0.1, 1.8, 1.12)], 0.016, 0.006);
        tube([V3(s * 0.11, 1.82, 0.86), V3(s * 0.13, 1.86, 0.98), V3(s * 0.13, 1.9, 1.04)], 0.014, 0.005);
        tube([V3(s * 0.2, 2.06, 0.75), V3(s * 0.23, 2.12, 0.86), V3(s * 0.24, 2.16, 0.92)], 0.012, 0.005);
        tube([V3(s * 0.235, 2.3, 0.71), V3(s * 0.27, 2.4, 0.66), V3(s * 0.28, 2.46, 0.64)], 0.01, 0.004);
        tube([V3(s * 0.23, 2.36, 0.73), V3(s * 0.2, 2.46, 0.8), V3(s * 0.19, 2.52, 0.82)], 0.01, 0.004);
      }
    },
    coat(q, v) {
      const winter = !!v.winter;
      let c = mix(lin(winter ? 0x6e604e : 0x8c5232), lin(winter ? 0x584c40 : 0x6c3e24), sst(0.3, 0.9, Math.cos(q.th)));
      c = mix(c, lin(winter ? 0x9a8c78 : 0xa8784e), below(q) * 0.6);
      if (q.part === 'antler') return lin(q.u > 0.85 ? 0xe0d6c0 : 0x4e3e2e);
      if (q.part === 'trunk' && q.z < -0.5 && Math.hypot(q.x / 0.16, (q.y - 1.0) / 0.2) < 1)
        c = mix(c, lin(0xd8c49a), 0.85);
      if (q.part === 'tail') c = Math.cos(q.th) > 0 ? lin(0x3a2e24) : lin(0xd8c49a);
      if (q.part === 'neck' && v.antler && q.z < 0.85) c = mix(c, lin(0x3a2c22), 0.6);
      if (q.part === 'neck' && q.z > 1.18) c = mix(c, lin(0x1a1512), sst(1.19, 1.23, q.z));
      if (q.part === 'ear') c = mix(c, lin(0x2a221c), sst(0.7, 1, q.u));
      if (q.part === 'hleg' || q.part === 'fleg') {
        c = mix(c, lin(winter ? 0x5a4c3e : 0x6e4428), sst(0.3, 0.6, q.u));
        if (q.u > 0.92) c = lin(0x1d1915);
      }
      return shade(c, q, 0.04, 0.06);
    },
  });
  // common buzzard (Buteo buteo): 50–57 cm, wingspan 1.2 m, broad wings, the rounded tail; brown with a pale band across the breast,
  // dark wrist patches below
  PLANS.bussard = Object.assign({}, PLANS.milan, {
    wing: {
      span: 0.6,
      thick: 0.016,
      fingers: 5,
      fingerLen: 0.11,
      rows: [
        [0.04, 0.1, -0.15, 'arm'],
        [0.18, 0.11, -0.16, 'arm'],
        [0.3, 0.1, -0.14, 'mid'],
        [0.42, 0.07, -0.1, 'hand'],
        [0.5, 0.04, -0.06, 'hand'],
      ],
    },
    wrist: 0.3,
    tailFan: { z0: -0.13, z1: -0.33, w0: 0.08, w1: 0.2, fork: -0.03 },
    eye: { p: [0.24, 0.035], x: 0.026, r: 0.006, col: 0x5a3a1c },
    coat(q) {
      if (q.part === 'body') {
        let c = lin(0x5a4230);
        if (Math.cos(q.th) < 0 && q.u > 0.35 && q.u < 0.6) c = mix(c, lin(0xe2d8c4), 0.75);
        if (q.u > 0.95) c = lin(0x2a2420);
        return shade(c, q, 0.02, 0.1);
      }
      if (q.part === 'tail') return q.up ? lin(0x6a5240) : lin(0xc8bca8);
      const s = q.span;
      if (q.up) return s > 0.75 ? lin(0x2a201a) : lin(0x5c4434);
      if (s > 0.42 && s < 0.6 && q.t < 0.4) return lin(0x2e241e);
      if (s > 0.8) return lin(0x3a2e26);
      return q.t > 0.55 ? lin(0xb8ae9e) : lin(0x8a7460);
    },
  });
  // raven (Corvus corax): all black, glossy, the wedge-shaped tail, the heavy bill
  PLANS.rabe = Object.assign({}, PLANS.milan, {
    wing: Object.assign({}, PLANS.bussard.wing, { span: 0.6, fingers: 5 }),
    wrist: 0.3,
    tailFan: { z0: -0.13, z1: -0.34, w0: 0.06, w1: 0.13, fork: -0.07 },
    eye: { p: [0.24, 0.035], x: 0.026, r: 0.005, col: 0x0c0a0a },
    coat: q => (q.part === 'body' ? shade(lin(0x16161a), q, 0.02, 0.05) : q.up ? lin(0x1a1a20) : lin(0x121214)),
  });
  // black stork (Ciconia nigra): black with a white belly, the red bill and legs; flies with the neck stretched out and the legs behind
  PLANS.storch = Object.assign({}, PLANS.milan, {
    headY: 0.02,
    headZ: 0.42,
    body: [
      [-0.16, 0.0, 0.04, 0.035],
      [-0.08, 0.0, 0.075, 0.07],
      [0.04, 0.005, 0.08, 0.075],
      [0.16, 0.01, 0.05, 0.05],
      [0.3, 0.015, 0.025, 0.028],
      [0.42, 0.02, 0.026, 0.03],
      [0.46, 0.02, 0.014, 0.016],
      [0.6, 0.005, 0.006, 0.008],
    ],
    eye: { p: [0.44, 0.035], x: 0.02, r: 0.005, col: 0x1a1210 },
    wing: {
      span: 0.95,
      thick: 0.02,
      fingers: 6,
      fingerLen: 0.16,
      rows: [
        [0.04, 0.12, -0.18, 'arm'],
        [0.28, 0.13, -0.18, 'arm'],
        [0.5, 0.11, -0.15, 'mid'],
        [0.66, 0.07, -0.1, 'hand'],
        [0.78, 0.03, -0.06, 'hand'],
      ],
    },
    wrist: 0.5,
    tailFan: { z0: -0.14, z1: -0.32, w0: 0.08, w1: 0.16, fork: -0.02 },
    flapHz: 1.8,
    legs(B, sk, W, loft, V3, coat) {
      for (const s of [1, -1])
        loft(
          B,
          [V3(s * 0.03, -0.02, -0.08), V3(s * 0.03, -0.02, -0.32), V3(s * 0.025, -0.015, -0.55)].map((p, i) => ({
            p,
            rx: [0.012, 0.008, 0.006][i],
            ry: [0.012, 0.008, 0.006][i],
            w: [W(sk, 'root')],
            u: i / 2,
          })),
          { part: 'leg', sides: 5, sub: 1, coat, cap0: false, cap1: 0.004 }
        );
    },
    coat(q) {
      if (q.part === 'leg') return lin(0xb02a20);
      if (q.part === 'body') {
        if (q.u > 0.8) return lin(0xc0302a);
        if (Math.cos(q.th) < -0.2 && q.u < 0.55) return lin(0xece8e2);
        return shade(lin(0x18181c), q, 0.02, 0.05);
      }
      if (q.part === 'tail') return lin(0x16161a);
      return q.up ? lin(0x1c1c22) : q.span < 0.12 && q.t < 0.5 ? lin(0xe8e4de) : lin(0x141418);
    },
  });
  // eagle owl (Bubo bubo): up to 75 cm, the ear tufts, orange eyes, mottled tawny with dark streaks; seen perched
  PLANS.uhu = Object.assign({}, PLANS.bussard, {
    body: [
      [-0.2, 0.0, 0.05, 0.045],
      [-0.12, 0.0, 0.11, 0.1],
      [0.0, 0.01, 0.13, 0.12],
      [0.12, 0.02, 0.11, 0.1],
      [0.2, 0.03, 0.1, 0.095],
      [0.26, 0.03, 0.095, 0.09],
      [0.3, 0.025, 0.05, 0.05],
      [0.315, 0.02, 0.02, 0.02],
    ],
    headZ: 0.18,
    eye: { p: [0.29, 0.06], x: 0.04, r: 0.016, col: 0xe07a10 },
    perchUp: 1.3,
    perchY: 0.3,
    legs(B, sk, W, loft, V3, coat) {
      // the ear tufts
      for (const s of [1, -1])
        loft(
          B,
          [V3(s * 0.05, 0.1, 0.27), V3(s * 0.07, 0.15, 0.25), V3(s * 0.08, 0.19, 0.22)].map((p, i) => ({
            p,
            rx: [0.018, 0.012, 0.004][i],
            ry: [0.008, 0.006, 0.003][i],
            w: [W(sk, 'head')],
            u: i / 2,
          })),
          { part: 'tuft', sides: 5, sub: 1, coat, cap0: false, cap1: 0.003 }
        );
    },
    coat(q) {
      if (q.part === 'tuft') return lin(0x2a1e14);
      if (q.part === 'body') {
        let c = lin(0x9a7448);
        if (Math.cos(q.th) < 0) c = mix(c, lin(0xc8a46e), 0.5);
        c = mix(
          c,
          lin(0x2e2014),
          sst(0.7, 0.9, hash(Math.round(q.x * 40), Math.round(q.y * 40), Math.round(q.z * 12))) * 0.7
        );
        if (q.u > 0.78 && Math.cos(q.th) < -0.2) c = lin(0xe6dccb);
        return c;
      }
      return q.up ? mix(lin(0x7a5a38), lin(0x2e2218), sst(0.5, 0.8, hash(q.x * 9, q.z * 9, 1))) : lin(0xb89a70);
    },
  });
  S.PLANS = PLANS;
  S.make = make;
  S.lin = lin;
  S.GAITS = GAITS;
  return S;
})();
window.TKOERPER = TKOERPER;
