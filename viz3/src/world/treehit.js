// ===================== small trees give way to vehicles: they bend, tip over with the root plate – or stop the vehicle (TREEHIT) =====================
// Falko, 23.10.2026 2:52: "kleinere Bäumchen mit dem Traktor umfahren … auch mit dem Auto … alles, was realistischerweise auch umfallen würde,
// oder zumindest ein Stück weit sich verbiegen". The rule (docs/features/baeume.md):
//   stem: diameter at breast height D from the height and the slenderness H/D – the forest's own trees carry it (world/forest.js: spruce
//     H/D ≈ 80, larch 77, pine 74, dominant trees a little stouter), the measured crowns of the canopy model get H/D 75 (conifer) or
//     55 (broadleaf, open grown: field edges, gardens)
//   resistance: the moment that breaks the stem or tears out its root plate, M = σ · π · D³ / 32 (section modulus of a round stem) with
//     σ ≈ 30 N/mm² (green wood with knots) times the anchorage of the species (spruce 0.9 – shallow roots, larch 1.0, pine 1.1 – tap root,
//     broadleaf 1.2); at the contact height h the vehicle must push with F = M / h. Twice the diameter needs eight times the force.
//   vehicle: what it can put on a narrow stem without wrecking its front (car ≈ 6 kN at the bumper, 0.45 m; tractor ≈ 22 kN at the front
//     weights, 0.75 m, or as high as the loader is – raised it has more leverage), reached from the impact m · v² / (2 · 0.35 m) or from
//     pushing with the throttle (traction: car ≈ 4 kN, tractor more than its front takes)
//   saplings (D < 4 cm) bend under the vehicle and spring back (a little crooked); a stem that gives way tips over in the push direction
//     with its root plate (a short fall, then it lies – and stays lying: saved in 'pav-trees-v1'); a thicker stem stops the vehicle as before,
//     its crown sways. The vehicle loses the work it took (M · 0.35 rad) – it gets slower, it does not stop.
// Hooks: vehicles/vehicle.js boxHits asks TREEHIT.give for every trunk its box touches (true = the trunk gives way, no hit); world/worldcol.js
// keeps the saplings as soft trunks and drops a fallen one (dead); world/forest.js and world/ratscher.js draw a tree tilted (t.tilt, instances).
// Walkers never knock a tree over (only vehicles call give). Per frame only the trees in motion are touched (a handful).
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { COL } from '../core/geo.js';
import { audio, toast } from '../audio/audio.js';
import { RATSCHER } from './ratscher.js';
import { FOREST } from './forest.js';
import { WCOL } from './worldcol.js';
export const TREEHIT = (() => {
  const S = { ready: false, on: true, time: 0, n: { bend: 0, fall: 0, stop: 0 }, down: [], last: null, msgs: true };
  const LSK = 'pav-trees-v1';
  // ---------------- the rule ----------------
  const SIG = 30e6, // N/m²: bending strength of green wood with knots (clear spruce ~40, whole stems in tree-pulling tests ~25–35)
    KM = (Math.PI / 32) * SIG, // M = KM · anchorage · D³
    YIELD = 0.35, // m: how far stem, root plate and bumper give before the stem fails (impact force m v² / 2s)
    TURN = 0.35, // rad: the stem turns this far while it fails – the vehicle pays M · TURN
    D_BEND = 0.04, // m: thinner stems bend under a vehicle and spring back
    G = 9.81;
  const ANCHOR = { spruce: 0.9, larch: 1.0, pine: 1.1 };
  const NAME = { spruce: 'Fichte', larch: 'Lärche', pine: 'Kiefer' };
  // per vehicle: contact height of the body (m), the force its front takes on a narrow stem (N), traction when pushing slowly (N)
  const VP = {
    car: { h: 0.45, front: 6000, trac: 4000, der: 'das Auto', dem: 'dem Auto' },
    tractor: { h: 0.75, front: 22000, trac: 30000, der: 'der Traktor', dem: 'dem Traktor' },
  };
  const vpOf = v => VP[v.id] || { h: 0.6, front: 8000, trac: 6000, der: 'das Fahrzeug', dem: 'dem Fahrzeug' };
  // ---------------- what stands where: WCOL trunk → tree ----------------
  let INFO = [],
    RECS = null;
  // the measured crowns (world/ratscher.js treeRecs) by position (their x, y have one decimal)
  function recAt(x, y) {
    if (!RECS) {
      RECS = new Map();
      for (const r of (window.RATSCHER && RATSCHER.treeRecs) || [])
        RECS.set(Math.round(r.x * 10) * 1e5 + Math.round(r.y * 10), r);
    }
    return RECS.get(Math.round(x * 10) * 1e5 + Math.round(y * 10)) || null;
  }
  // a tree the forester marked or felling is busy with (world/fell.js) stays as it is – felling has its own state
  const busy = T => {
    const F = T.f && LATE.FELL;
    return !!(F && ((F.marked && F.marked.includes(T.f)) || (F.trees && F.trees[T.f.id])));
  };
  // stem and resistance of trunk i, or null (a post of the village)
  function info(i) {
    let T = INFO[i];
    if (T !== undefined) return T;
    T = null;
    const src = WCOL.src[i],
      p = WCOL.trunk(i);
    if (src) {
      if (src.dbh > 0 && src.h > 0)
        T = {
          f: src,
          H: src.h,
          D: src.dbh,
          k: ANCHOR[src.sp] || 1,
          name: (src.h < 4 ? 'Jung' + (NAME[src.sp] || 'baum').toLowerCase() : NAME[src.sp]) || 'Baum',
        };
    } else if (p && i < WCOL.nR) {
      const r = recAt(p[0], p[1]);
      if (r && r.h > 0)
        T = {
          r,
          H: r.h,
          D: (r.h / (r.con ? 75 : 55)) * (0.9 + 0.2 * (r.hs || 0.5)),
          k: r.con ? 1.0 : 1.2,
          name: r.con ? 'Nadelbaum' : 'Laubbaum',
        };
    }
    if (T) {
      T.i = i;
      T.x = p[0];
      T.y = p[1];
      T.z = T.f ? T.f.z : T.r.z;
      T.M = KM * T.k * T.D ** 3;
      T.soft = !!WCOL.soft[i] || T.D < D_BEND;
    }
    INFO[i] = T;
    return T;
  }
  // contact height above the trunk's foot: the vehicle's body at its bumper/front weights, any other box (loader, fork, a log on it,
  // the trailer's bed) where it is – raised it has more leverage
  function contactH(v, z0, P) {
    const rel = z0 - v.st.z;
    return Math.abs(rel - 0.25) < 0.02 ? P.h : THREE.MathUtils.clamp(rel + 0.35, 0.3, 1.6);
  }
  const massOf = v => v.spec.mass + (v.spec.tow ? +v.spec.tow() || 0 : 0);
  // the force vehicle v can put on a stem: impact (approach speed a, m/s) or pushing with the throttle, at most what its front takes
  function forceOf(v, a, P) {
    const dyn = a > 0 ? (massOf(v) * a * a) / (2 * YIELD) : 0,
      push = a > -0.05 && v.st.gear !== -1 ? THREE.MathUtils.clamp(v.st.thr || 0, 0, 1) * P.trac : 0;
    return Math.min(P.front, dyn + push);
  }
  // ---------------- trees in motion: bending, swaying, falling ----------------
  const ACT = new Map(); // trunk index → motion state
  const _q = new THREE.Quaternion(),
    _q0 = new THREE.Quaternion(),
    _ax = new THREE.Vector3(),
    _o = new THREE.Vector3(),
    _d = new THREE.Vector3(),
    _p = new THREE.Vector3(),
    _s = new THREE.Vector3(),
    _m = new THREE.Matrix4();
  // tree T leans by th (rad) towards dir (site x, y); the foot moves with a root plate hinge e m out in that direction
  function pose(T, dir, th, e) {
    _ax.set(-dir[1], 0, -dir[0]).normalize(); // site (−dy, dx, 0) as three.js (x, z, −y)
    _q.setFromAxisAngle(_ax, th);
    _o.set(0, 0, 0);
    if (e > 0) {
      _d.set(dir[0], 0, -dir[1]);
      _o.copy(_d).multiplyScalar(e);
      _o.sub(_d.applyQuaternion(_q).multiplyScalar(e));
    }
    if (T.f) {
      if (th < 1e-4 && e === 0) T.f.tilt = null;
      else {
        if (!T.f.tilt) T.f.tilt = { q: new THREE.Quaternion(), o: new THREE.Vector3() };
        T.f.tilt.q.copy(_q);
        T.f.tilt.o.copy(_o);
      }
      FOREST.retilt(T.f);
    } else if (T.r) {
      const r = T.r;
      if (!r.m0) r.m0 = r.inst.map(([im, k]) => im.getMatrixAt(k, new THREE.Matrix4()));
      r.inst.forEach(([im, k], j) => {
        r.m0[j].decompose(_p, _q0, _s);
        _m.compose(_p.add(_o), _q0.premultiply(_q), _s);
        im.setMatrixAt(k, _m);
        im.instanceMatrix.needsUpdate = true;
      });
    }
    if (T.plate != null) plateAt(T, dir, th, e);
  }
  // ---------------- root plates: one instanced mesh, a lumpy disc of earth and roots that stands up with the tree ----------------
  let PLATES = null;
  const PMAX = 400;
  function plates() {
    if (PLATES) return PLATES;
    const g = new THREE.CylinderGeometry(1, 0.8, 1, 14, 2),
      P = g.attributes.position,
      col = new Float32Array(P.count * 3);
    for (let k = 0; k < P.count; k++) {
      const x = P.getX(k),
        y = P.getY(k),
        z = P.getZ(k),
        a = Math.atan2(z, x),
        rr = Math.hypot(x, z),
        w = 0.82 + 0.18 * Math.sin(a * 3 + 1.3) + 0.1 * Math.sin(a * 7);
      P.setXYZ(k, x * w, y + (rr > 0.5 && y < 0 ? 0.15 * Math.sin(a * 5) : 0), z * w);
      const top = y > 0.45 && rr < 1.01,
        c = top ? [0.27, 0.25, 0.15] : [0.2, 0.14, 0.09],
        n = 0.85 + 0.3 * Math.abs(Math.sin(a * 11 + y * 7));
      col.set([c[0] * n, c[1] * n, c[2] * n], k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.4 });
    PLATES = new THREE.InstancedMesh(g, mat, PMAX);
    PLATES.count = 0;
    PLATES.frustumCulled = false;
    PLATES.castShadow = true;
    PLATES.receiveShadow = true;
    PLATES.userData.noMerge = true;
    scene.add(PLATES);
    return PLATES;
  }
  // root plate radius and thickness from the stem (a 10 cm spruce: ~0.55 m)
  const plateR = T => 0.1 + 4.5 * T.D;
  function plateAt(T, dir, th, e) {
    const PL = plates(),
      rp = plateR(T),
      tk = 0.12 + 0.25 * rp;
    // centre below the foot (top at the ground), turned about the hinge e m out towards dir
    _d.set(dir[0], 0, -dir[1]);
    _ax.set(-dir[1], 0, -dir[0]).normalize();
    _q.setFromAxisAngle(_ax, th);
    const foot = V(T.x, T.y, T.z),
      hinge = foot.clone().addScaledVector(_d, e),
      c = foot
        .clone()
        .add(new THREE.Vector3(0, -tk / 2 - 0.03, 0))
        .sub(hinge)
        .applyQuaternion(_q)
        .add(hinge);
    _m.compose(c, _q, _s.set(rp, tk, rp));
    PL.setMatrixAt(T.plate, _m);
    PL.instanceMatrix.needsUpdate = true;
  }
  // ---------------- sounds (Web Audio on the game's bus, audio/audio.js raw/spatial): crack, rustle, thud, creak, swish ----------------
  let NB = null;
  function snd(kind, x, y, size = 1) {
    try {
      if (!audio.ready()) return;
      const R = audio.raw();
      if (!R) return;
      const ctx = R.ctx,
        sp = audio.spatial(x, y, 14 + 10 * size);
      if (sp.vol < 0.01) return;
      if (!NB) {
        NB = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = NB.getChannelData(0);
        for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      }
      const out = ctx.createGain();
      out.gain.value = sp.vol;
      let node = out;
      if (ctx.createStereoPanner) {
        const pn = ctx.createStereoPanner();
        pn.pan.value = THREE.MathUtils.clamp(sp.pan, -1, 1);
        out.connect(pn);
        node = pn;
      }
      node.connect(R.sfx);
      const t0 = ctx.currentTime + 0.01;
      const noise = (t, type, f, q, peak, a, d, f1) => {
        const s = ctx.createBufferSource(),
          fl = ctx.createBiquadFilter(),
          g = ctx.createGain();
        s.buffer = NB;
        fl.type = type;
        fl.frequency.setValueAtTime(f, t);
        if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + a + d);
        fl.Q.value = q;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
        s.connect(fl);
        fl.connect(g);
        g.connect(out);
        s.start(t, Math.random() * 0.5, a + d + 0.05);
      };
      const tone = (t, type, f0, f1, peak, a, d) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + a + d + 0.05);
      };
      if (kind === 'crack') {
        // fibres tearing: a dry series of clicks, the stem's low knock, then the roots ripping
        for (let k = 0; k < 7; k++)
          noise(t0 + k * 0.018 + Math.random() * 0.012, 'bandpass', 1800 + Math.random() * 2600, 3, 0.9, 0.001, 0.02);
        noise(t0, 'lowpass', 260, 0.8, 1.2 * size, 0.003, 0.12);
        tone(t0, 'sine', 120, 60, 0.5 * size, 0.004, 0.18);
        noise(t0 + 0.12, 'bandpass', 500, 1.2, 0.35, 0.05, 0.5, 260);
      } else if (kind === 'rustle') {
        noise(t0, 'bandpass', 2600, 0.7, 0.32 * size, 0.25, 0.6 + 0.4 * size, 1600);
      } else if (kind === 'thud') {
        noise(t0, 'lowpass', 180, 0.7, 1.4 * size, 0.004, 0.22);
        tone(t0, 'sine', 70, 45, 0.6 * size, 0.004, 0.25);
        noise(t0 + 0.02, 'bandpass', 2200, 0.6, 0.45 * size, 0.01, 0.45, 1300);
      } else if (kind === 'creak') {
        // wood under load: a slow saw tone through a narrow band, a few pulses
        for (let k = 0; k < 3; k++)
          tone(t0 + k * 0.11, 'sawtooth', 210 - k * 25, 150 - k * 15, 0.08 * size, 0.03, 0.12);
        noise(t0, 'bandpass', 3000, 0.8, 0.25 * size, 0.08, 0.5, 2000);
      } else if (kind === 'bump') {
        // a wheel over a stem: a dull knock, the bark crunching
        noise(t0, 'lowpass', 200, 0.8, 1.0 * size, 0.004, 0.14);
        tone(t0, 'sine', 90, 55, 0.35 * size, 0.004, 0.14);
        for (let k = 0; k < 3; k++)
          noise(t0 + 0.02 + k * 0.03, 'bandpass', 1500 + Math.random() * 1500, 2, 0.4 * size, 0.001, 0.03);
      } else if (kind === 'twigs') {
        for (let k = 0; k < 4; k++)
          noise(t0 + Math.random() * 0.15, 'bandpass', 2500 + Math.random() * 3000, 3, 0.35 * size, 0.001, 0.015);
        noise(t0, 'bandpass', 3000, 0.8, 0.12 * size, 0.03, 0.2, 2000);
      } else if (kind === 'swish') {
        noise(t0, 'bandpass', 3400, 0.9, 0.22 * size, 0.04, 0.3, 2200);
      }
    } catch (e) {}
  }
  // a short word on what happened and why (the game should teach: diameter, force, leverage), at most every few seconds
  let msgT = -99;
  function say(txt, force) {
    if (!S.msgs || (!force && S.time - msgT < 6)) return;
    msgT = S.time;
    S.last = txt;
    toast(txt, 5200);
  }
  const cm = D => Math.round(D * 100);
  const kN = F => (F / 1000).toFixed(F < 9950 ? 1 : 0).replace('.', ',');
  // ---------------- the contact (vehicles/vehicle.js boxHits): true = the trunk gives way ----------------
  // i: WCOL trunk index, h: the hit ({ n: push direction for the vehicle, d, p: contact point }), z0: lower edge of the box, v: the vehicle
  S.give = (i, h, z0, v) => {
    try {
      if (!S.on) return !!WCOL.soft[i];
      const T = info(i);
      if (!T || (!T.soft && busy(T))) return !!WCOL.soft[i];
      if (!v || !v.st || !v.spec || !h || !h.n) return T.soft;
      const s = v.st,
        f = [Math.sin(s.psi), Math.cos(s.psi)],
        rg = [Math.cos(s.psi), -Math.sin(s.psi)],
        w = [s.u * f[0] + s.v * rg[0], s.u * f[1] + s.v * rg[1]],
        rx = h.p[0] - s.x,
        ry = h.p[1] - s.y;
      w[0] += s.r * ry;
      w[1] -= s.r * rx;
      const a = -(w[0] * h.n[0] + w[1] * h.n[1]), // approach speed into the stem (m/s)
        sp = Math.hypot(w[0], w[1]);
      if (!Number.isFinite(a)) return T.soft;
      if (T.soft) {
        bend(T, v, w, sp);
        return true;
      }
      const P = vpOf(v),
        hc = contactH(v, z0, P),
        need = T.M / hc,
        F = forceOf(v, a, P);
      // slowly (pushing): the stem leans as far as the vehicle presses in, the root plate tears at ~16°; fast: it goes at once
      const A = ACT.get(T.i);
      if (A && A.mode === 'push') {
        push(T, v, h, w, a, hc, need, F);
        return true;
      }
      if (F >= need) {
        if (a < 1.0) push(T, v, h, w, a, hc, need, F);
        else fall(T, v, h, w, a, hc, need, F);
        return true;
      }
      sway(T, h, a, F / need, v, need, P);
      return false;
    } catch (e) {
      if (!S.err) {
        S.err = 1;
        console.warn('treehit', e);
      }
      return !!WCOL.soft[i];
    }
  };
  // a sapling under the vehicle: pressed down in the direction of travel, springs back when the vehicle has passed
  function bend(T, v, w, sp) {
    let A = ACT.get(T.i);
    const fresh = !A || A.mode !== 'bend' || S.time - A.pressT > 0.3;
    if (!A || A.mode !== 'bend') {
      A = {
        T,
        mode: 'bend',
        th: A ? A.th : 0,
        w: A ? A.w : 0,
        dir: [0, 1],
        e: 0,
        pressT: S.time,
        rest: 0.03 + (T.i % 7) * 0.015,
      };
      ACT.set(T.i, A);
    }
    if (sp > 0.05) A.dir = [w[0] / sp, w[1] / sp];
    A.pressT = S.time;
    if (fresh) {
      S.n.bend++;
      // the vehicle pays a little: the work to press the stem down (~ M · 1.2 rad), at most a few per cent of its speed
      const m = massOf(v),
        E = T.M * 1.2,
        u2 = v.st.u * v.st.u + v.st.v * v.st.v,
        k = u2 > 0.01 ? Math.max(0.97, Math.sqrt(Math.max(0, 1 - (2 * E) / (m * u2)))) : 1;
      v.st.u *= k;
      v.st.v *= k;
      snd('swish', T.x, T.y, Math.min(1, T.H / 2.5));
      if (v === (LATE.VEH && LATE.VEH.cur))
        say(
          `${T.name}, ${T.H.toFixed(1).replace('.', ',')} m hoch, Ø ${cm(T.D)} cm: biegt sich unter ${vpOf(v).dem} und federt zurück.`
        );
    }
  }
  // a stem that holds: the vehicle stops (vehicles/vehicle.js resolves the hit as before), the crown sways – pushed slowly it leans
  function sway(T, h, a, ratio, v, need, P) {
    let A = ACT.get(T.i);
    if (!A || A.mode === 'bend') {
      A = { T, mode: 'sway', th: 0, w: 0, dir: [-h.n[0], -h.n[1]], e: 0, pushT: -9, push: 0, rest: 0 };
      ACT.set(T.i, A);
    } else if (A.mode === 'push') {
      A.mode = 'sway'; // the push stopped short of tearing the roots
      A.w = 0;
    }
    const thMax = THREE.MathUtils.clamp(0.006 / T.D, 0.002, 0.08),
      start = S.time - A.pushT > 0.25;
    A.dir = [-h.n[0], -h.n[1]];
    A.pushT = S.time;
    A.push = Math.min(1, ratio) * thMax;
    if (start) {
      A.w += Math.min(1, ratio) * thMax * (a > 0.3 ? 3 : 1);
      if (ratio > 0.25 || a > 1.5) {
        S.n.stop++;
        snd(ratio > 0.5 ? 'creak' : 'swish', T.x, T.y, Math.min(1, T.D * 6));
        if (v === (LATE.VEH && LATE.VEH.cur) && (a > 0.8 || (v.st.thr || 0) > 0.5))
          say(
            `${T.name}, Ø ${cm(T.D)} cm: zu stark. Umdrücken bräuchte ${kN(need)} kN, ${P.der} bringt höchstens ${kN(P.front)} kN auf den Stamm.`
          );
      }
    }
  }
  // pushed slowly with enough force: the vehicle creeps on (at most PUSHV), the stem leans with it and its root plate lifts; past ~16° the
  // anchorage fails and it falls. Backing off before that, it rights itself again.
  const PUSHV = 0.4,
    TEAR = 0.28;
  function push(T, v, h, w, a, hc, need, F) {
    let A = ACT.get(T.i);
    if (!A || A.mode !== 'push') {
      A = {
        T,
        mode: 'push',
        th: A ? Math.max(0, A.th) : 0,
        w: 0,
        dir: [-h.n[0], -h.n[1]],
        e: 0.6 * plateR(T),
        rest: 0,
      };
      ACT.set(T.i, A);
      if (T.D >= 0.05 && T.plate == null) {
        const PL = plates();
        if (PL.count < PMAX) T.plate = PL.count++;
      }
      snd('creak', T.x, T.y, Math.min(1.2, T.D * 7));
    }
    A.pushT = S.time;
    A.dir = [A.dir[0] * 0.8 - h.n[0] * 0.2, A.dir[1] * 0.8 - h.n[1] * 0.2];
    const L = Math.hypot(A.dir[0], A.dir[1]) || 1;
    A.dir = [A.dir[0] / L, A.dir[1] / L];
    A.th = Math.max(A.th, Math.atan2(Math.max(0, h.d - 0.01), hc));
    // held back: the approach speed into the stem at most PUSHV (the rest goes into the roots) – without the force to go on, not at all
    // (the vehicle rests against the leaning stem; backing off, the stem rights itself)
    const ok = F >= need,
      lim = ok ? PUSHV : 0;
    if (a > lim) {
      const s = v.st,
        f = [Math.sin(s.psi), Math.cos(s.psi)],
        rg = [Math.cos(s.psi), -Math.sin(s.psi)],
        dv = a - lim,
        vx = s.u * f[0] + s.v * rg[0] + h.n[0] * dv,
        vy = s.u * f[1] + s.v * rg[1] + h.n[1] * dv;
      s.u = vx * f[0] + vy * f[1];
      s.v = vx * rg[0] + vy * rg[1];
    }
    if (ok && A.th > TEAR) {
      A.w = 0.35;
      fall(T, v, h, w, Math.max(a, 0.5), hc, need, F);
    }
  }
  // the stem gives way: out of the collisions at once, the vehicle pays the work, the tree tips over in the push direction with its root plate
  function fall(T, v, h, w, a, hc, need, F) {
    WCOL.removeIdx(T.i);
    if (T.r && T.r.col >= 0 && COL[T.r.col] && COL[T.r.col][6] === 'tree') COL[T.r.col][5] = COL[T.r.col][4] - 1; // its garden box too
    // the vehicle loses M · TURN of its energy (along the contact normal)
    const m = massOf(v),
      W = T.M * TURN;
    if (a > 0) {
      const a2 = Math.sqrt(Math.max(0, a * a - (2 * W) / m)),
        dv = a - a2,
        s = v.st,
        f = [Math.sin(s.psi), Math.cos(s.psi)],
        rg = [Math.cos(s.psi), -Math.sin(s.psi)],
        vx = s.u * f[0] + s.v * rg[0] + h.n[0] * dv,
        vy = s.u * f[1] + s.v * rg[1] + h.n[1] * dv;
      s.u = vx * f[0] + vy * f[1];
      s.v = vx * rg[0] + vy * rg[1];
    }
    // direction: the push (contact normal), a little towards where the vehicle moves – or where it has been leaning while pushed
    const sp = Math.hypot(w[0], w[1]) || 1,
      A0 = ACT.get(T.i);
    let dx = -h.n[0] + (0.35 * w[0]) / sp,
      dy = -h.n[1] + (0.35 * w[1]) / sp;
    if (A0 && A0.mode === 'push') [dx, dy] = A0.dir;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const A = startFall(T, [dx, dy], THREE.MathUtils.clamp(a / Math.max(0.5, hc) / 2.5, 0.25, 1.6));
    S.n.fall++;
    snd('crack', T.x, T.y, Math.min(1.3, T.D * 7));
    snd('rustle', T.x, T.y, Math.min(1.3, T.H / 8));
    remember(T, A);
    if (v === (LATE.VEH && LATE.VEH.cur))
      say(
        `${T.name}, Ø ${cm(T.D)} cm, kippt mit dem Wurzelteller um: nötig waren ${kN(need)} kN in ${hc.toFixed(2).replace('.', ',')} m Höhe, ${vpOf(v).der} drückt mit ${kN(F)} kN.`,
        true
      );
  }
  // the angle at which the fallen tree lies: on the ground along dir (slope), the crown holds the stem up a little
  function endAngle(T, dir) {
    const L = Math.max(1, T.H * 0.5),
      z1 = KERN.ground(T.x + dir[0] * L, T.y + dir[1] * L),
      beta = Number.isFinite(z1) ? Math.atan2(z1 - T.z, L) : 0;
    return THREE.MathUtils.clamp(Math.PI / 2 - beta - 0.05 - Math.min(0.12, 0.6 / T.H), 0.9, 1.65);
  }
  function startFall(T, dir, w0) {
    const prev = ACT.get(T.i),
      A = {
        T,
        mode: 'fall',
        th: prev ? Math.max(0, prev.th) : 0,
        w: w0,
        dir,
        e: 0.6 * plateR(T),
        end: endAngle(T, dir),
        hits: 0,
        k: (1.5 * G) / Math.max(1.5, T.H),
      };
    if (T.D >= 0.05 && T.plate == null) {
      const PL = plates();
      if (PL.count < PMAX) T.plate = PL.count++;
    }
    if (!T.down) LOGS.push({ T, dir, L: T.H * 0.9, on: 0 });
    T.down = true;
    ACT.set(T.i, A);
    return A;
  }
  // ---------------- driving over a lying tree: a wheel climbs the stem (a jolt, some speed lost), branches crack under the wheels ----------------
  const LOGS = [];
  function overLogs(dt) {
    const VH = LATE.VEH,
      v = VH && VH.cur;
    if (!v || !LOGS.length || !VH.toW || !v.W) return;
    const s = v.st,
      spd = Math.hypot(s.u, s.v);
    if (!(spd > 0.15)) return;
    for (const L of LOGS) {
      const T = L.T,
        dir = L.dir;
      if (Math.hypot(s.x - T.x - dir[0] * L.L * 0.5, s.y - T.y - dir[1] * L.L * 0.5) > L.L * 0.5 + 5) continue;
      for (let k = 0; k < v.W.length && k < 8; k++) {
        const w = v.W[k],
          p = VH.toW(v, w.x, w.y),
          qx = p[0] - T.x,
          qy = p[1] - T.y,
          al = qx * dir[0] + qy * dir[1],
          la = Math.abs(qx * dir[1] - qy * dir[0]),
          on = al > 0.2 && al < L.L * 0.6 && la < T.D / 2 + 0.12,
          bit = 1 << k;
        if (on && !(L.on & bit)) {
          // the stem under a wheel: the thicker and the faster, the harder the jolt
          const j = Math.min(0.35, T.D * 2.2) * Math.min(1, spd / 4);
          s.u *= 1 - j;
          s.v *= 1 - j;
          s.pv += Math.sign(w.y || 1) * Math.min(0.5, T.D * 4) * Math.min(1, spd / 2);
          s.rv += Math.sign(w.x || 1) * Math.min(0.35, T.D * 3) * Math.min(1, spd / 2);
          snd('bump', p[0], p[1], Math.min(1, T.D * 6));
          S.n.over = (S.n.over || 0) + 1;
        }
        L.on = on ? L.on | bit : L.on & ~bit;
        if (al > L.L * 0.35 && al < L.L && la < Math.max(0.6, T.H * 0.13)) {
          // through the lying crown: the branches hold back a little and crack
          const k = Math.min(0.3, T.D * 2.5) * dt * 0.25;
          s.u *= 1 - k;
          s.v *= 1 - k;
          if (Math.random() < dt * 5) snd('twigs', p[0], p[1], Math.min(1, spd / 3));
        }
      }
    }
  }
  // ---------------- per frame: only the trees in motion ----------------
  function tick(dt) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.1);
    S.time += dt;
    overLogs(dt);
    if (!ACT.size) return;
    let shadow = false;
    for (const [i, A] of ACT) {
      const T = A.T,
        n = Math.max(1, Math.ceil(dt / 0.01)),
        hh = dt / n;
      if (A.mode === 'push' && S.time - A.pushT > 0.2) {
        // the vehicle backed off before the roots tore: the stem rights itself
        A.mode = 'sway';
        A.push = 0;
        A.w = 0;
      }
      for (let k = 0; k < n && A.mode !== 'push' && A.mode !== 'rest'; k++) {
        if (A.mode === 'fall') {
          A.w += A.k * Math.sin(Math.max(0.02, A.th)) * hh;
          A.th += A.w * hh;
          if (A.th >= A.end) {
            A.th = A.end;
            if (A.w > 0.5 && A.hits < 2) {
              if (!A.hits) snd('thud', T.x + A.dir[0] * T.H * 0.5, T.y + A.dir[1] * T.H * 0.5, Math.min(1.4, T.H / 7));
              A.w = -A.w * 0.2;
              A.hits++;
            } else {
              A.w = 0;
              A.mode = 'rest';
            }
          }
        } else {
          // a damped spring towards the target: pressed down (bend), leaning under a push (sway), else upright (a sapling stays a bit crooked)
          let tgt = A.rest,
            wn = 6,
            z = 0.16;
          if (A.mode === 'bend') {
            const pressed = S.time - A.pressT < 0.12;
            tgt = pressed ? 1.2 : A.rest;
            wn = pressed ? 16 : 7;
            z = pressed ? 0.9 : 0.15;
          } else {
            if (S.time - A.pushT < 0.15) tgt = A.push;
            wn = THREE.MathUtils.clamp(14 / Math.max(2, T.H), 1.2, 5);
            z = 0.12;
          }
          A.w += (-wn * wn * (A.th - tgt) - 2 * z * wn * A.w) * hh;
          A.th += A.w * hh;
          if (A.mode === 'bend' && A.th < -0.4) A.th = -0.4;
        }
      }
      pose(T, A.dir, Math.max(-0.5, A.th), A.e || 0);
      shadow = true;
      if (A.mode === 'rest') ACT.delete(i);
      else if (A.mode !== 'fall' && A.mode !== 'push') {
        const still = Math.abs(A.w) < 0.004 && Math.abs(A.th - A.rest) < 0.003;
        const free = A.mode === 'bend' ? S.time - A.pressT > 0.5 : S.time - A.pushT > 0.5;
        if (still && free) {
          pose(T, A.dir, A.rest, A.e || 0);
          ACT.delete(i);
        }
      }
    }
    if (shadow) markDirty(true);
  }
  window.TICKS.push(dt => {
    try {
      tick(dt);
    } catch (e) {
      if (!S.terr) {
        S.terr = 1;
        console.warn('treehit tick', e);
      }
    }
  });
  // ---------------- saved: the trees knocked over stay down ('pav-trees-v1': { v: 1, t: [[x, y, azimuth°, angle], …] }) ----------------
  function remember(T, A) {
    S.down.push([
      +T.x.toFixed(2),
      +T.y.toFixed(2),
      +((Math.atan2(A.dir[0], A.dir[1]) * 180) / Math.PI).toFixed(1),
      +A.end.toFixed(3),
    ]);
    if (S.down.length > 2000) S.down.splice(0, S.down.length - 2000);
    SAVE.set(LSK, { v: 1, t: S.down });
  }
  function restore() {
    const s = SAVE.get(LSK),
      list = s && s.v === 1 && Array.isArray(s.t) ? s.t : [];
    let n = 0;
    for (const e of list.slice(-2000)) {
      if (!Array.isArray(e) || e.length < 4 || !e.slice(0, 4).every(Number.isFinite)) continue;
      const [x, y, az, th] = e;
      if (Math.abs(x) > 5000 || Math.abs(y) > 5000) continue;
      const i = WCOL.treeAt(x, y, 0.35, false),
        T = i >= 0 ? info(i) : null;
      if (!T || T.soft) continue;
      const dir = [Math.sin((az * Math.PI) / 180), Math.cos((az * Math.PI) / 180)],
        A = startFall(T, dir, 0);
      A.th = A.end = THREE.MathUtils.clamp(th, 0.9, 1.65);
      A.mode = 'rest';
      ACT.delete(i);
      WCOL.removeIdx(i);
      if (T.r && T.r.col >= 0 && COL[T.r.col] && COL[T.r.col][6] === 'tree') COL[T.r.col][5] = COL[T.r.col][4] - 1;
      pose(T, dir, A.th, A.e);
      S.down.push([+x.toFixed(2), +y.toFixed(2), +az.toFixed(1), +A.th.toFixed(3)]);
      n++;
    }
    S.restored = n;
    if (n) markDirty(true);
  }
  whenLoaded(() => {
    if (!WCOL.ready) return;
    try {
      plates(); // in the scene before the shaders are prepared (boot/boot.js prepareGPU), no hitch at the first fall
      restore();
    } catch (e) {
      console.warn('treehit restore', e);
    }
    S.ready = true;
  });
  // ---------------- tests and tools ----------------
  S.info = i => {
    const T = info(i);
    return T
      ? {
          i,
          x: T.x,
          y: T.y,
          H: T.H,
          D: T.D,
          M: Math.round(T.M),
          soft: T.soft,
          forest: !!T.f,
          name: T.name,
          down: !!T.down,
        }
      : null;
  };
  // what vehicle vid (car/tractor) does to trunk i when it hits it at kmh with the body (or at height hc)
  S.verdict = (i, vid, kmh = 20, hc) => {
    const T = info(i);
    if (!T) return 'hard';
    if (T.soft) return 'bend';
    const P = VP[vid] || vpOf({ id: vid }),
      vv = LATE.VEH && LATE.VEH.by && LATE.VEH.by[vid],
      m = vv ? massOf(vv) : vid === 'tractor' ? 5400 : 1230,
      a = kmh / 3.6,
      F = Math.min(P.front, (m * a * a) / (2 * YIELD)),
      need = T.M / (hc || P.h);
    return F >= need ? 'fall' : 'stop';
  };
  S.state = i => {
    const A = ACT.get(i),
      T = INFO[i];
    return {
      mode: A ? A.mode : T && T.down ? 'rest' : 'still',
      th: A ? +A.th.toFixed(3) : T && T.f && T.f.tilt ? 2 * Math.acos(Math.min(1, Math.abs(T.f.tilt.q.w))) : 0,
      dead: !!WCOL.dead[i],
    };
  };
  S.active = () => ACT.size;
  S.stats = () => ({ ready: S.ready, active: ACT.size, down: S.down.length, restored: S.restored || 0, n: S.n });
  S.rule = { SIG, YIELD, TURN, D_BEND, ANCHOR, VP };
  return S;
})();
window.TREEHIT = TREEHIT;
