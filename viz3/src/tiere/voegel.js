// ===================== feat/grenzland-alltag: small birds of the village and the town (VOEGEL) =====================
// Falko, 17.11.2026 13:27: „… Vielleicht fliegen auch mal Vögel rum …“ – the birds one sees every day here, near the player only, in free
// play and in the mode alike (the big birds of the sky – red kite, buzzard, raven, stork, owl – are tiere/tiere.js):
//   tauben     pigeons on the Markt of Schleusingen: they walk and peck round the fountain and flutter up all together when somebody comes
//              close or a car rolls by, circle over the square and come down again further off (by day)
//   spatzen    house sparrows at the two trimmed hedges on the Anger of Ratscher: they hop and peck in front of them, dart into the hedge
//              when one comes near and come out again a little later; a chirp now and then (by day)
//   kraehen    carrion crows over the fields: a few in wide, slow circles (by day, outside the town)
//   schwalben  barn swallows in summer (May to August): fast and low over the Anger and the meadow by the garden, now and then a burst of
//              wing beats
//   stare      starlings in autumn (September to November): at dusk a flock over the fields that folds and stretches (a murmuration)
// Cheap: each kind is one mesh of a few triangles per bird whose vertices are written on the CPU each frame (wings flapping, folded on the
// ground), in the vertex-colour material the traffic's figures already use (verkehr/verkehr_fig.js VFIG.mat – no new shader program, no
// texture, no lamp); a kind is only worked on while it is near and its time; nothing is loaded. ?novoegel leaves them out.
//   VOEGEL.stand() → { aktiv: { kind: n }, auf, err } · VOEGEL.scheuchen(x, y, r) (a bang, a car: everything near flies up)
//   debug: an(kind, on) (force a kind now, wherever its place is), hier(kind, x, y) (its place to (x, y))
import * as THREE from 'three';
import { COARSE, QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { VEH } from '../vehicles/vehicle.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { audio } from '../audio/audio.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { SCHL } from '../welt/schleusingen.js';
export const VOEGEL = (() => {
  const S = { kinds: {}, auf: 0, err: null, acc: 0, t: 0, force: {}, at: {}, off: QS.has('novoegel'), ms: 0 };
  const hyp = Math.hypot,
    TAU = Math.PI * 2,
    rnd = (a, b) => a + Math.random() * (b - a);
  // colours: linear (as the vertex colours of the kit)
  const L = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];
  // ---- the kinds: size (length, span), colours (body, back of the wings, wing tips, belly), flight ----
  const ART = {
    taube: {
      len: 0.32,
      span: 0.66,
      body: L(126, 130, 142),
      wing: L(112, 118, 132),
      tip: L(44, 44, 50),
      belly: L(140, 144, 156),
      head: L(84, 92, 100),
      flap: 6,
    },
    spatz: {
      len: 0.15,
      span: 0.23,
      body: L(126, 98, 70),
      wing: L(104, 78, 52),
      tip: L(58, 44, 34),
      belly: L(170, 160, 146),
      head: L(110, 106, 102),
      flap: 15,
    },
    kraehe: {
      len: 0.46,
      span: 0.95,
      body: L(26, 26, 30),
      wing: L(22, 22, 26),
      tip: L(14, 14, 16),
      belly: L(30, 30, 34),
      head: L(20, 20, 24),
      flap: 3.2,
    },
    schwalbe: {
      len: 0.18,
      span: 0.33,
      body: L(30, 38, 70),
      wing: L(26, 30, 52),
      tip: L(18, 20, 30),
      belly: L(228, 214, 196),
      head: L(120, 46, 36),
      flap: 8,
    },
    star: {
      len: 0.21,
      span: 0.38,
      body: L(34, 34, 40),
      wing: L(30, 30, 36),
      tip: L(20, 20, 24),
      belly: L(40, 40, 46),
      head: L(30, 30, 36),
      flap: 11,
    },
  };
  // the triangles a kind is drawn with (numbers into TRIS below): all 18 near, the far ones (crows, starlings – seen from below) the
  // belly, the tail and the wings only
  const ALLE = [...Array(18).keys()],
    FERN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  // ---- the mesh of a kind: room for n birds, written each frame ----
  function mesh(kind, n) {
    const tl = kind === 'star' || kind === 'kraehe' ? FERN : ALLE,
      VB = tl.length * 3,
      g = new THREE.BufferGeometry(),
      pos = new Float32Array(n * VB * 3),
      nor = new Float32Array(n * VB * 3),
      col = new Float32Array(n * VB * 3);
    const A = ART[kind];
    // the colour of each triangle, in the order bird() writes them: the back 4, the belly 4, the tail 2, the wings 4 (both faces),
    // the head 4
    const C = [
      A.body,
      A.body,
      A.body,
      A.body,
      A.belly,
      A.belly,
      A.belly,
      A.belly,
      A.wing,
      A.wing,
      A.wing,
      A.wing,
      A.wing,
      A.wing,
    ];
    C.push(A.head, A.head, A.head, A.head);
    for (let b = 0; b < n; b++)
      for (let t = 0; t < tl.length; t++) for (let v = 0; v < 3; v++) col.set(C[tl[t]], (b * VB + t * 3 + v) * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setDrawRange(0, 0);
    const m = new THREE.Mesh(g, VFIG.mat());
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = false;
    m.userData.noMerge = true;
    m.name = 'voegel ' + kind;
    m.visible = false;
    scene.add(m);
    return { m, g, pos, nor, n, tl, VB };
  }
  // ---- one bird into the arrays: at (x, y, z) in site metres, heading hd (radians from north, clockwise), pitch, roll (bank), wings:
  //      flap angle (radians, + up) and fold (0 spread … 1 folded along the body) ----
  const _p = new Float32Array(3 * 18),
    _q = new Float32Array(18 * 3);
  // triangles (counter-clockwise seen from outside): back 4, belly 4, tail both sides, left wing both sides, right wing both sides
  const TRIS = [
    0, 2, 4, 0, 4, 3, 1, 4, 2, 1, 3, 4, 0, 5, 2, 0, 3, 5, 1, 2, 5, 1, 5, 3, 1, 6, 7, 1, 7, 6, 8, 9, 10, 8, 10, 9, 12,
    11, 13, 12, 13, 11, 17, 14, 16, 17, 16, 15, 17, 15, 14, 14, 15, 16,
  ];
  function bird(M, i, A, x, y, z, hd, pitch, roll, flap, fold) {
    const Lb = A.len,
      S2 = A.span / 2,
      w = Lb * 0.22,
      h = Lb * 0.21;
    // the bird's own frame in site coordinates: forward f, right r, up u
    const ch = Math.cos(hd),
      sh = Math.sin(hd),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const fx = sh * cp,
      fy = ch * cp,
      fz = sp;
    let rx = ch,
      ry = -sh,
      rz = 0;
    let ux = ry * fz - rz * fy,
      uy = rz * fx - rx * fz,
      uz = rx * fy - ry * fx;
    if (roll) {
      const cb = Math.cos(roll),
        sb = Math.sin(roll);
      const rx2 = rx * cb - ux * sb,
        ry2 = ry * cb - uy * sb,
        rz2 = rz * cb - uz * sb;
      ux = ux * cb + rx * sb;
      uy = uy * cb + ry * sb;
      uz = uz * cb + rz * sb;
      rx = rx2;
      ry = ry2;
      rz = rz2;
    }
    // local points (right, forward, up): nose, tail root, left, right, top, bottom, two tail tips, the left wing's roots and tip, the
    // right wing's tip and roots
    const span = (S2 - w / 2) * (1 - fold * 0.86),
      tipY = -0.05 * Lb - fold * 0.22 * Lb,
      cf = Math.cos(flap) * span,
      sf = Math.sin(flap) * span,
      wr = w * 0.45,
      wz = 0.04 * Lb;
    const q = _q;
    q.set([
      0,
      0.5 * Lb,
      0.03 * Lb,
      0,
      -0.28 * Lb,
      0.01 * Lb,
      -w / 2,
      0.06 * Lb,
      0,
      w / 2,
      0.06 * Lb,
      0,
      0,
      0.04 * Lb,
      h / 2,
    ]);
    q.set([0, 0.04 * Lb, -h / 2, -0.09 * Lb, -0.52 * Lb, 0.02 * Lb, 0.09 * Lb, -0.52 * Lb, 0.02 * Lb], 15);
    q.set([-wr, 0.14 * Lb, wz, -wr, -0.12 * Lb, wz, -wr - cf, tipY, wz + sf, wr + cf, tipY, wz + sf], 24);
    q.set([wr, 0.14 * Lb, wz, wr, -0.12 * Lb, wz], 36);
    // the head on its short neck: two cheeks, the crown, the beak
    q.set(
      [
        -0.055 * Lb,
        0.4 * Lb,
        0.11 * Lb,
        0.055 * Lb,
        0.4 * Lb,
        0.11 * Lb,
        0,
        0.4 * Lb,
        0.2 * Lb,
        0,
        0.58 * Lb,
        0.12 * Lb,
      ],
      42
    );
    for (let k = 0; k < 18; k++) {
      const a = q[k * 3],
        b = q[k * 3 + 1],
        c = q[k * 3 + 2];
      _p[k * 3] = x + rx * a + fx * b + ux * c;
      _p[k * 3 + 1] = y + ry * a + fy * b + uy * c;
      _p[k * 3 + 2] = z + rz * a + fz * b + uz * c;
    }
    let o = i * M.VB * 3;
    const pos = M.pos,
      nor = M.nor,
      tl = M.tl;
    for (let q = 0; q < tl.length; q++) {
      const t = tl[q],
        a = TRIS[t * 3] * 3,
        b = TRIS[t * 3 + 1] * 3,
        c = TRIS[t * 3 + 2] * 3;
      const e1x = _p[b] - _p[a],
        e1y = _p[b + 1] - _p[a + 1],
        e1z = _p[b + 2] - _p[a + 2],
        e2x = _p[c] - _p[a],
        e2y = _p[c + 1] - _p[a + 1],
        e2z = _p[c + 2] - _p[a + 2];
      let nx = e1y * e2z - e1z * e2y,
        ny = e1z * e2x - e1x * e2z,
        nz = e1x * e2y - e1y * e2x;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      // site (x east, y north, z up) → three.js (x, y up, z south)
      for (let k = 0; k < 3; k++) {
        const v = k === 0 ? a : k === 1 ? b : c;
        pos[o] = _p[v];
        pos[o + 1] = _p[v + 2];
        pos[o + 2] = -_p[v + 1];
        nor[o] = nx;
        nor[o + 1] = nz;
        nor[o + 2] = -ny;
        o += 3;
      }
    }
  }
  function zeigen(M, n) {
    M.g.setDrawRange(0, n * M.VB);
    M.g.attributes.position.needsUpdate = true;
    M.g.attributes.normal.needsUpdate = true;
    M.m.visible = n > 0;
  }
  // ---- where the player is, how fast; time of day, month, dusk ----
  function spieler() {
    const v = VEH.cur;
    if (v && v.st) return { x: v.st.x, y: v.st.y, v: hyp(v.st.u || 0, v.st.v || 0), fz: true };
    return { x: P.x, y: P.y, v: P.speed || 0, fz: false };
  }
  const minOf = () => ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
  const monat = () => {
    try {
      return new Date((DN.e0 + Math.floor(CLOCK.t / 1440)) * 864e5).getUTCMonth();
    } catch (e) {
      return 6;
    }
  };
  function sonne() {
    try {
      const r = DN.riseSet(CLOCK.t, 'sun');
      if (r && r.up != null && r.down != null) return r;
    } catch (e) {}
    return { up: 6 * 60 + 30, down: 19 * 60 };
  }
  const tag = () => {
    const m = minOf(),
      s = sonne();
    return m > s.up + 20 && m < s.down - 10;
  };
  const ground = (x, y) => {
    const z = KERN.ground(x, y);
    return Number.isFinite(z) ? z : 0;
  };
  // ---- the sound: wing beats of pigeons taking off (a short noise in beats), the chirp of a sparrow – made once, played positional ----
  const SND = {};
  function raw() {
    try {
      return audio.raw ? audio.raw() : null;
    } catch (e) {
      return null;
    }
  }
  function klang(art, x, y) {
    const R = raw();
    if (!R) return;
    const p = spieler(),
      d = hyp(x - p.x, y - p.y),
      far = art === 'flattern' ? 40 : 22;
    if (d > far) return;
    try {
      const ctx = R.ctx;
      if (!SND[art]) {
        const sr = ctx.sampleRate,
          len = Math.floor(sr * (art === 'flattern' ? 0.9 : 0.12)),
          b = ctx.createBuffer(1, len, sr),
          a = b.getChannelData(0);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / sr;
          if (art === 'flattern') {
            // a clatter: noise in beats of ~13 per second, fading
            const beat = Math.pow(Math.max(0, Math.sin(t * 13 * TAU)), 3),
              n = Math.random() * 2 - 1;
            lp += (n - lp) * 0.35;
            a[i] = lp * beat * Math.exp(-t * 2.2) * 0.9;
          } else {
            // a chirp: a quick sweep down from 6 to 4 kHz
            const f = 6000 - t * 16000;
            a[i] = Math.sin(TAU * f * t) * Math.sin((Math.PI * t) / 0.12) * 0.35;
          }
        }
        SND[art] = b;
      }
      const s = ctx.createBufferSource(),
        g = ctx.createGain();
      s.buffer = SND[art];
      s.playbackRate.value = rnd(0.9, 1.15);
      g.gain.value = 0.6 * Math.pow(1 - d / far, 1.6);
      s.connect(g);
      g.connect(R.sfx || R.amb);
      s.start(ctx.currentTime + 0.01);
    } catch (e) {}
  }
  // ================================================ the kinds ================================================
  // ---- pigeons on the Markt of Schleusingen ----
  const TAUBE = {
    n: COARSE ? 8 : 12,
    wo: () => S.at.taube || (SCHL && SCHL.fountain ? [SCHL.fountain[0], SCHL.fountain[1]] : [-1084.7, 1241.9]),
    da: () => !!(S.force.taube || (SCHL && SCHL.state === 'ready' && tag())),
    nah: 140,
    platz(c) {
      // a free spot on the square: 4.5 … 15 m from the fountain, not in a wall
      for (let k = 0; k < 20; k++) {
        const a = rnd(0, TAU),
          r = rnd(4.5, 15),
          x = c[0] + Math.sin(a) * r,
          y = c[1] + Math.cos(a) * r,
          q = [x, y];
        let hit = false;
        try {
          hit = KERN.pushOut(q, 0.3) && hyp(q[0] - x, q[1] - y) > 0.05;
        } catch (e) {}
        if (!hit) return [x, y];
      }
      return [c[0] + 6, c[1]];
    },
  };
  const SPATZ = { n: COARSE ? 4 : 6, nah: 70 };
  // ---- the flock's state: an array of birds { x, y, z, hd, st, t, ... } ----
  function neuTauben(K) {
    const c = TAUBE.wo();
    K.c = c;
    K.b = [];
    for (let i = 0; i < TAUBE.n; i++) {
      const [x, y] = TAUBE.platz(c);
      K.b.push({ x, y, z: ground(x, y), hd: rnd(0, TAU), st: 'boden', t: rnd(0, 3), pick: 0, ph: rnd(0, TAU), v: 0 });
    }
  }
  function tauben(K, dt, p) {
    const c = K.c,
      A = ART.taube;
    // fly up: somebody close and quick, very close, or a vehicle rolling near
    let auf = null;
    for (const b of K.b) {
      if (b.st !== 'boden') continue;
      const d = hyp(b.x - p.x, b.y - p.y);
      if (d < 1.9 || (d < 4.2 && p.v > 1.1) || (p.fz && d < 11 && p.v > 0.5)) {
        auf = [b.x, b.y];
        break;
      }
    }
    if (auf) scheuchenIn(K, auf[0], auf[1], 16, p);
    // one goes up, the ones beside it follow
    for (const b of K.b)
      if (b.st === 'boden' && K.b.some(q => (q.st === 'auf' || q.st === 'warte') && hyp(q.x - b.x, q.y - b.y) < 5)) {
        b.st = 'warte';
        b.t = rnd(0.15, 0.6);
        b.hd = Math.atan2(b.x - p.x, b.y - p.y) + rnd(-0.7, 0.7);
        b.h0 = rnd(8, 14);
        b.r = rnd(9, 17);
      }
    let n = 0;
    for (const b of K.b) {
      b.t -= dt;
      if (b.st === 'boden') {
        // walking, pecking, standing; out of the way of the player
        const d = hyp(b.x - p.x, b.y - p.y);
        if (d < 3.2) {
          b.hd = Math.atan2(b.x - p.x, b.y - p.y) + rnd(-0.3, 0.3);
          b.v = 0.7;
          b.t = 0.6;
        } else if (b.t <= 0) {
          const r = Math.random();
          b.v = r < 0.45 ? rnd(0.18, 0.35) : 0;
          b.pick = r > 0.75 ? rnd(0.8, 2.2) : 0;
          b.t = rnd(0.8, 3.2);
          // (not too far from the fountain)
          if (hyp(b.x - c[0], b.y - c[1]) > 16) b.hd = Math.atan2(c[0] - b.x, c[1] - b.y) + rnd(-0.5, 0.5);
          else if (b.v) b.hd += rnd(-1, 1);
        }
        if (b.v) {
          const nx = b.x + Math.sin(b.hd) * b.v * dt,
            ny = b.y + Math.cos(b.hd) * b.v * dt,
            q = [nx, ny];
          let hit = false;
          try {
            hit = KERN.pushOut(q, 0.2) && hyp(q[0] - nx, q[1] - ny) > 0.02;
          } catch (e) {}
          if (!hit && hyp(nx - c[0], ny - c[1]) > 3.6) {
            b.x = nx;
            b.y = ny;
          } else b.hd += 2;
          b.z = ground(b.x, b.y);
        }
        b.pick = Math.max(0, b.pick - dt);
        if (!b.v) b.z = ground(b.x, b.y);
        b.ph += dt * (b.v ? 9 : 2.4);
        // the nod of a walking pigeon, the head down to peck
        const pitch = b.pick > 0 ? -0.55 + Math.sin(b.ph * 2) * 0.12 : b.v ? Math.sin(b.ph) * 0.12 : 0.05;
        bird(K.M, n++, A, b.x, b.y, b.z + 0.075, b.hd, pitch, 0, 0, 1);
        continue;
      }
      // in the air: up steeply, round the square, down again where nobody stands
      b.ph += dt * A.flap * TAU;
      if (b.st === 'warte') {
        if (b.t <= 0) b.st = 'auf';
        bird(K.M, n++, A, b.x, b.y, b.z + 0.075, b.hd, 0.1, 0, 0, 1);
        continue;
      }
      if (b.st === 'auf') {
        const v = 5.5;
        b.x += Math.sin(b.hd) * v * dt * 0.75;
        b.y += Math.cos(b.hd) * v * dt * 0.75;
        b.z += v * dt * 0.62;
        if (b.z - ground(b.x, b.y) > b.h0) {
          b.st = 'kreis';
          b.t = rnd(9, 18);
          b.ang = Math.atan2(b.x - c[0], b.y - c[1]);
        }
        bird(K.M, n++, A, b.x, b.y, b.z, b.hd, 0.55, 0, Math.sin(b.ph) * 0.95, 0);
        continue;
      }
      if (b.st === 'kreis') {
        // round the square, one way for all, the radius and height of each
        const w = 7 / b.r;
        b.ang += w * dt;
        const tx = c[0] + Math.sin(b.ang) * b.r,
          ty = c[1] + Math.cos(b.ang) * b.r,
          tz = ground(c[0], c[1]) + b.h0;
        const k = Math.min(1, dt * 1.6);
        const px = b.x,
          py = b.y;
        b.x += (tx - b.x) * k;
        b.y += (ty - b.y) * k;
        b.z += (tz - b.z) * k;
        if (hyp(b.x - px, b.y - py) > 1e-4) b.hd = Math.atan2(b.x - px, b.y - py);
        if (b.t <= 0) {
          // down where nobody is: 9 m from the player at least
          let q = TAUBE.platz(c);
          for (let k2 = 0; k2 < 6 && hyp(q[0] - p.x, q[1] - p.y) < 9; k2++) q = TAUBE.platz(c);
          b.ziel = q;
          b.st = 'ab';
        }
        const glide = Math.sin(b.ph * 0.13 + b.r) > 0.2;
        bird(K.M, n++, A, b.x, b.y, b.z, b.hd, 0.02, -0.42, glide ? 0.14 : Math.sin(b.ph) * 0.75, 0);
        continue;
      }
      if (b.st === 'ab') {
        const g = ground(b.ziel[0], b.ziel[1]),
          dx = b.ziel[0] - b.x,
          dy = b.ziel[1] - b.y,
          dd = hyp(dx, dy),
          v = Math.max(1.5, Math.min(6, dd * 0.8));
        if (dd > 0.2) b.hd = Math.atan2(dx, dy);
        const s = Math.min(dd, v * dt);
        b.x += (dx / (dd || 1)) * s;
        b.y += (dy / (dd || 1)) * s;
        b.z += (g - b.z) * Math.min(1, dt * (dd < 4 ? 2.6 : 0.8));
        if (dd < 0.25 && b.z - g < 0.12) {
          b.st = 'boden';
          b.z = g;
          b.t = rnd(0.5, 2);
          b.v = 0;
        }
        bird(K.M, n++, A, b.x, b.y, b.z, b.hd, dd < 3 ? 0.5 : -0.15, 0, Math.sin(b.ph * 1.2) * (dd < 3 ? 1.0 : 0.5), 0);
      }
    }
    zeigen(K.M, n);
  }
  function scheuchenIn(K, x, y, r, p) {
    let n = 0;
    for (const b of K.b) {
      if (b.st !== 'boden' || hyp(b.x - x, b.y - y) > r) continue;
      b.st = 'warte';
      b.t = rnd(0, 0.35);
      b.hd = Math.atan2(b.x - p.x, b.y - p.y) + rnd(-0.7, 0.7);
      b.h0 = rnd(8, 14);
      b.r = rnd(9, 17);
      n++;
    }
    if (n) {
      S.auf++;
      klang('flattern', x, y);
    }
    return n;
  }
  // ---- sparrows at the hedges of the Anger ----
  function hecken() {
    const H = (DKDATA && DKDATA.open && DKDATA.open.hedges) || [];
    return H.map(h => h.p).filter(q => q && q.length >= 2);
  }
  // the nearest point on a hedge's line and the way out of it
  function amHecke(Hp, x, y) {
    let best = null,
      bd = 1e9;
    for (let i = 0; i + 1 < Hp.length; i++) {
      const [ax, ay] = Hp[i],
        [bx, by] = Hp[i + 1],
        dx = bx - ax,
        dy = by - ay,
        l2 = dx * dx + dy * dy || 1,
        u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
        px = ax + dx * u,
        py = ay + dy * u,
        d = hyp(x - px, y - py);
      if (d < bd) {
        bd = d;
        best = { x: px, y: py, nx: -dy / Math.sqrt(l2), ny: dx / Math.sqrt(l2), d };
      }
    }
    return best;
  }
  function neuSpatzen(K) {
    K.b = [];
    const Hs = hecken();
    Hs.forEach((Hp, hi) => {
      for (let i = 0; i < SPATZ.n; i++) {
        const k = Math.floor(Math.random() * (Hp.length - 1)),
          u = Math.random(),
          [ax, ay] = Hp[k],
          [bx, by] = Hp[k + 1],
          hx = ax + (bx - ax) * u,
          hy = ay + (by - ay) * u,
          A2 = amHecke(Hp, hx, hy),
          side = i % 2 ? 1 : -1,
          off = rnd(0.5, 1.6);
        const x = hx + A2.nx * side * off,
          y = hy + A2.ny * side * off;
        K.b.push({
          hi,
          x,
          y,
          z: ground(x, y),
          hd: rnd(0, TAU),
          st: 'boden',
          t: rnd(0, 1.5),
          hop: 0,
          ph: rnd(0, TAU),
          side,
        });
      }
    });
    K.H = Hs;
  }
  function spatzen(K, dt, p) {
    const A = ART.spatz;
    let n = 0;
    for (const b of K.b) {
      b.t -= dt;
      const Hp = K.H[b.hi],
        d = hyp(b.x - p.x, b.y - p.y);
      if (b.st === 'boden') {
        if (d < 3.4 || (d < 6 && p.v > 2) || (p.fz && d < 9)) {
          // into the hedge, quick
          const h = amHecke(Hp, b.x, b.y);
          b.st = 'rein';
          b.ziel = [h.x, h.y, ground(h.x, h.y) + rnd(0.6, 1.2)];
          b.t = rnd(6, 14);
          if (Math.random() < 0.5) klang('tschilp', b.x, b.y);
        } else if (b.t <= 0) {
          // a hop, or a peck
          b.t = rnd(0.25, 1.1);
          if (Math.random() < 0.6) {
            b.hd += rnd(-1.4, 1.4);
            b.hop = 0.16;
          } else b.pick = 0.35;
          if (Math.random() < 0.04) klang('tschilp', b.x, b.y);
        }
        if (b.hop > 0) {
          const s = Math.min(b.hop, dt * 0.9);
          b.hop -= s;
          b.x += Math.sin(b.hd) * s;
          b.y += Math.cos(b.hd) * s;
          // (stay near the hedge: back towards it when too far)
          const h = amHecke(Hp, b.x, b.y);
          if (h.d > 2.2) b.hd = Math.atan2(h.x - b.x, h.y - b.y);
          if (h.d < 0.35) {
            b.x += h.nx * b.side * 0.05;
            b.y += h.ny * b.side * 0.05;
          }
        }
        b.pick = Math.max(0, (b.pick || 0) - dt);
        const jump = b.hop > 0 ? Math.sin((b.hop / 0.16) * Math.PI) * 0.05 : 0;
        bird(K.M, n++, A, b.x, b.y, ground(b.x, b.y) + 0.035 + jump, b.hd, b.pick > 0 ? -0.6 : 0.15, 0, 0, 1);
        continue;
      }
      if (b.st === 'rein') {
        // the short dart into the hedge
        const [tx, ty, tz] = b.ziel,
          dx = tx - b.x,
          dy = ty - b.y,
          dd = hyp(dx, dy, tz - b.z);
        if (dd < 0.15) {
          b.st = 'drin';
          continue;
        }
        const s = Math.min(dd, dt * 7);
        b.x += (dx / dd) * s;
        b.y += (dy / dd) * s;
        b.z += ((tz - b.z) / dd) * s;
        b.hd = Math.atan2(dx, dy);
        b.ph += dt * A.flap * TAU;
        bird(K.M, n++, A, b.x, b.y, b.z, b.hd, 0.25, 0, Math.sin(b.ph) * 0.9, 0);
        continue;
      }
      if (b.st === 'drin') {
        // hidden in the hedge; out again when it is quiet
        if (b.t <= 0 && d > 6.5 && !(p.fz && d < 12)) {
          b.st = 'raus';
          const h = amHecke(Hp, b.x, b.y),
            off = rnd(0.6, 1.5);
          b.ziel = [h.x + h.nx * b.side * off, h.y + h.ny * b.side * off];
          b.z = ground(b.x, b.y) + 0.8;
        }
        continue;
      }
      if (b.st === 'raus') {
        const [tx, ty] = b.ziel,
          g = ground(tx, ty) + 0.035,
          dx = tx - b.x,
          dy = ty - b.y,
          dd = hyp(dx, dy);
        const s = Math.min(dd, dt * 4);
        if (dd > 0.01) {
          b.x += (dx / dd) * s;
          b.y += (dy / dd) * s;
          b.hd = Math.atan2(dx, dy);
        }
        b.z += (g - b.z) * Math.min(1, dt * 6);
        b.ph += dt * A.flap * TAU;
        if (dd < 0.08) {
          b.st = 'boden';
          b.t = rnd(0.5, 1.5);
        }
        bird(K.M, n++, A, b.x, b.y, b.z, b.hd, 0.1, 0, Math.sin(b.ph) * 0.8, 0);
      }
    }
    zeigen(K.M, n);
  }
  // ---- crows: a few in wide circles over the open land beside the player ----
  function neuKraehen(K, p) {
    const n = COARSE ? 3 : 5;
    // the middle of their circles: 120–200 m off, away from the village centre (the Anger) and the town
    const a0 = Math.atan2(p.x - 222, p.y + 108) + rnd(-0.8, 0.8);
    K.c = [p.x + Math.sin(a0) * rnd(120, 200), p.y + Math.cos(a0) * rnd(120, 200)];
    K.b = [];
    for (let i = 0; i < n; i++)
      K.b.push({
        r: rnd(35, 70),
        ang: rnd(0, TAU),
        h: rnd(22, 40),
        w: rnd(0.08, 0.13) * (i % 3 ? 1 : -1),
        ph: rnd(0, TAU),
        x: 0,
        y: 0,
        z: 0,
      });
  }
  function kraehen(K, dt, p) {
    const A = ART.kraehe;
    // the group drifts slowly; far behind the player: a new place ahead of him
    K.c[0] += Math.sin(S.t * 0.01) * dt * 0.6;
    K.c[1] += Math.cos(S.t * 0.013) * dt * 0.6;
    if (hyp(K.c[0] - p.x, K.c[1] - p.y) > 320) neuKraehen(K, p);
    let n = 0;
    const g = ground(K.c[0], K.c[1]);
    for (const b of K.b) {
      b.ang += b.w * dt;
      const x = K.c[0] + Math.sin(b.ang) * b.r,
        y = K.c[1] + Math.cos(b.ang) * b.r,
        z = g + b.h + Math.sin(S.t * 0.3 + b.ph) * 2;
      const hd = b.ang + (b.w > 0 ? Math.PI / 2 : -Math.PI / 2);
      b.ph += dt * A.flap * TAU;
      // slow beats, now and then a glide
      const glide = Math.sin(S.t * 0.4 + b.ph * 0.05) > 0.3;
      bird(K.M, n++, A, x, y, z, hd, 0, b.w > 0 ? 0.25 : -0.25, glide ? 0.06 : Math.sin(b.ph) * 0.6, 0);
    }
    zeigen(K.M, n);
  }
  // ---- swallows in summer: fast and low over the Anger and the meadow by the garden ----
  const SCHWALBE_ORTE = [
    [234, -112],
    [12, 34],
  ];
  function neuSchwalben(K, c) {
    K.c = c;
    K.b = [];
    for (let i = 0; i < (COARSE ? 4 : 6); i++)
      K.b.push({
        a1: rnd(0.25, 0.42),
        a2: rnd(0.6, 0.95),
        p1: rnd(0, TAU),
        p2: rnd(0, TAU),
        r1: rnd(10, 22),
        r2: rnd(4, 9),
        ph: rnd(0, TAU),
        x: c[0],
        y: c[1],
        z: 0,
      });
  }
  function schwalben(K, dt) {
    const A = ART.schwalbe,
      g = ground(K.c[0], K.c[1]);
    let n = 0;
    for (const b of K.b) {
      const t = S.t;
      const x = K.c[0] + Math.sin(t * b.a1 + b.p1) * b.r1 + Math.sin(t * b.a2 + b.p2) * b.r2,
        y = K.c[1] + Math.cos(t * b.a1 * 1.3 + b.p1) * b.r1 + Math.cos(t * b.a2 * 0.8 + b.p2) * b.r2,
        z = g + 1.6 + Math.pow(Math.sin(t * 0.5 + b.p2), 2) * 6;
      const vx = x - b.x,
        vy = y - b.y,
        hd = Math.atan2(vx, vy);
      const turn = b.hd0 != null ? Math.atan2(Math.sin(hd - b.hd0), Math.cos(hd - b.hd0)) / Math.max(dt, 1e-3) : 0;
      b.hd0 = hd;
      b.x = x;
      b.y = y;
      b.z = z;
      b.ph += dt * A.flap * TAU;
      const burst = Math.sin(t * 1.7 + b.p1) > 0.4;
      bird(
        K.M,
        n++,
        A,
        x,
        y,
        z,
        hd,
        0,
        Math.max(-0.9, Math.min(0.9, turn * 0.35)),
        burst ? Math.sin(b.ph) * 0.7 : 0.05,
        0
      );
    }
    zeigen(K.M, n);
  }
  // ---- starlings in autumn at dusk: a murmuration over the fields ----
  function neuStare(K, p) {
    const n = COARSE ? 70 : 140;
    const a0 = Math.atan2(p.x - 222, p.y + 108) + rnd(-1, 1);
    K.c = [p.x + Math.sin(a0) * rnd(170, 240), p.y + Math.cos(a0) * rnd(170, 240)];
    K.b = [];
    for (let i = 0; i < n; i++) {
      // a point in a unit ball (more towards the middle)
      let ux, uy, uz;
      do {
        ux = rnd(-1, 1);
        uy = rnd(-1, 1);
        uz = rnd(-1, 1);
      } while (ux * ux + uy * uy + uz * uz > 1);
      K.b.push({ ux, uy, uz, ph: rnd(0, TAU), x: K.c[0], y: K.c[1], z: 0 });
    }
  }
  function stare(K, dt) {
    const A = ART.star,
      t = S.t;
    // the flock's middle wanders over the field, the shape stretches, folds and turns
    const cx = K.c[0] + Math.sin(t * 0.05) * 60,
      cy = K.c[1] + Math.cos(t * 0.037) * 45,
      cz = ground(K.c[0], K.c[1]) + 45 + Math.sin(t * 0.09) * 12;
    const rx = 28 + Math.sin(t * 0.21) * 14,
      ry = 12 + Math.sin(t * 0.17 + 1) * 7,
      rz = 8 + Math.sin(t * 0.13 + 2) * 5,
      yaw = t * 0.08,
      cyw = Math.cos(yaw),
      syw = Math.sin(yaw);
    let n = 0;
    for (const b of K.b) {
      // a travelling fold through the flock
      const fold = Math.sin(b.ux * 2.4 + t * 0.9) * 6;
      const lx = b.ux * rx,
        ly = b.uy * ry + fold * 0.6,
        lz = b.uz * rz + fold * 0.4;
      const x = cx + lx * cyw - ly * syw,
        y = cy + lx * syw + ly * cyw,
        z = cz + lz;
      const hd = Math.atan2(x - b.x, y - b.y);
      b.x = x;
      b.y = y;
      b.z = z;
      b.ph += dt * A.flap * TAU;
      bird(K.M, n++, A, x, y, z, Number.isFinite(hd) ? hd : 0, 0, 0, Math.sin(b.ph) * 0.8, 0);
    }
    zeigen(K.M, n);
  }
  // ================================================ per frame ================================================
  // what is on now, and where (forced kinds for tests)
  function lage(p) {
    const m = monat(),
      dusk = (() => {
        const s = sonne(),
          mi = minOf();
        return mi > s.down - 55 && mi < s.down + 15;
      })();
    const A = {};
    const amMarkt = hyp(p.x - TAUBE.wo()[0], p.y - TAUBE.wo()[1]) < TAUBE.nah;
    A.taube = S.force.taube != null ? S.force.taube : amMarkt && TAUBE.da();
    const H = hecken(),
      hm = H.length ? H[0][0] : [240, -112];
    A.spatz = S.force.spatz != null ? S.force.spatz : H.length && hyp(p.x - hm[0], p.y - hm[1]) < SPATZ.nah && tag();
    // crows: by day, not in the town
    A.kraehe = S.force.kraehe != null ? S.force.kraehe : tag() && hyp(p.x + 1085, p.y - 1240) > 450;
    // swallows: May to August by day, near one of their meadows
    const sw = SCHWALBE_ORTE.find(c => hyp(p.x - c[0], p.y - c[1]) < 110);
    A.schwalbe = S.force.schwalbe != null ? S.force.schwalbe : m >= 4 && m <= 7 && tag() && !!sw;
    A.schwalbeAt = S.at.schwalbe || sw || SCHWALBE_ORTE[0];
    // starlings: September to November at dusk, outside the town
    A.star = S.force.star != null ? S.force.star : m >= 8 && m <= 10 && dusk && hyp(p.x + 1085, p.y - 1240) > 450;
    return A;
  }
  function kind(k, n) {
    return S.kinds[k] || (S.kinds[k] = { M: mesh(k, n), b: [], on: false });
  }
  function aus(k) {
    const K = S.kinds[k];
    if (K && K.on) {
      K.on = false;
      K.b = [];
      zeigen(K.M, 0);
    }
  }
  function tick(dt) {
    if (S.off) return;
    const t0 = performance.now();
    try {
      dt = Math.min(dt, 0.1);
      S.t += dt;
      // (the situation a few times a second; the birds every frame)
      S.acc -= dt;
      if (S.acc <= 0 || !S.lage) {
        S.acc = 0.5;
        S.p = spieler();
        S.lage = lage(S.p);
      }
      const p = spieler(),
        A = S.lage;
      let any = false;
      if (A.taube) {
        const K = kind('taube', TAUBE.n);
        if (!K.on) {
          K.on = true;
          neuTauben(K);
        }
        tauben(K, dt, p);
        any = true;
      } else aus('taube');
      if (A.spatz) {
        const K = kind('spatz', SPATZ.n * Math.max(1, hecken().length));
        if (!K.on) {
          K.on = true;
          neuSpatzen(K);
        }
        spatzen(K, dt, p);
        any = true;
      } else aus('spatz');
      if (A.kraehe) {
        const K = kind('kraehe', 5);
        if (!K.on) {
          K.on = true;
          neuKraehen(K, p);
        }
        kraehen(K, dt, p);
        any = true;
      } else aus('kraehe');
      if (A.schwalbe) {
        const K = kind('schwalbe', 6);
        if (!K.on || K.c !== A.schwalbeAt) {
          K.on = true;
          neuSchwalben(K, A.schwalbeAt);
        }
        schwalben(K, dt);
        any = true;
      } else aus('schwalbe');
      if (A.star) {
        const K = kind('star', COARSE ? 70 : 140);
        if (!K.on) {
          K.on = true;
          neuStare(K, p);
        }
        stare(K, dt);
        any = true;
      } else aus('star');
      if (any) markDirty();
    } catch (e) {
      if (!S.err) console.warn('voegel', e);
      S.err = String((e && e.message) || e).slice(0, 200);
    }
    S.ms = S.ms * 0.98 + (performance.now() - t0) * 0.02;
  }
  KERN.tick(tick, 'tiere/voegel');
  // a bang, a crash: everything near flies up (other modules may call it)
  function scheuchen(x, y, r = 25) {
    let n = 0;
    const K = S.kinds.taube;
    if (K && K.on) n += scheuchenIn(K, x, y, r, { x, y });
    const Ks = S.kinds.spatz;
    if (Ks && Ks.on)
      for (const b of Ks.b)
        if (b.st === 'boden' && hyp(b.x - x, b.y - y) < r) {
          const h = amHecke(Ks.H[b.hi], b.x, b.y);
          b.st = 'rein';
          b.ziel = [h.x, h.y, ground(h.x, h.y) + 0.9];
          b.t = rnd(8, 16);
          n++;
        }
    return n;
  }
  KERN.on('grenzland:boeller', d => {
    try {
      const p = d && Number.isFinite(d.x) ? d : spieler();
      scheuchen(p.x, p.y, 40);
    } catch (e) {}
  });
  return {
    tick,
    scheuchen,
    stand: () => {
      const a = {};
      for (const [k, K] of Object.entries(S.kinds)) if (K.on) a[k] = K.b.length;
      const flug = S.kinds.taube && S.kinds.taube.on ? S.kinds.taube.b.filter(b => b.st !== 'boden').length : 0;
      const versteckt = S.kinds.spatz && S.kinds.spatz.on ? S.kinds.spatz.b.filter(b => b.st === 'drin').length : 0;
      return { aktiv: a, auf: S.auf, flug, versteckt, err: S.err, ms: +S.ms.toFixed(3), lage: S.lage };
    },
    debug: {
      an(k, on) {
        S.force[k] = on == null ? null : !!on;
        S.acc = 0;
      },
      hier(k, x, y) {
        S.at[k] = [x, y];
        const K = S.kinds[k];
        if (K) K.on = false;
        S.acc = 0;
      },
      voegel: k => (S.kinds[k] ? S.kinds[k].b.map(b => ({ x: b.x, y: b.y, z: b.z, st: b.st })) : []),
    },
  };
})();
window.VOEGEL = VOEGEL;
