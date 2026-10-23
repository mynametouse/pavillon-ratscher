// ===================== V16h the forestry winch on the tractor (WINDE): skidding a log out of the stand to the track =====================
// Falko, 23.10.2026 2:24: a tree felled at the Untere Klinge, the tractor could not get to it between the trees – "Müsste man den nicht
// irgendwie rausziehen mit einer Seilwinde oder so am Traktor dran?" That is how it is done: the tractor stays on the track, the three-point
// winch at its back (vehicles/tractor.js model.winch) goes down until its shield digs in, the cable is pulled out by hand to the log, the
// choker chain goes round the log's end, and from a safe place – out of the cable's line, away from the log – the radio remote winds it in:
// the log comes end first, sliding over the forest floor, until it lies against the shield. Raised a little, the winch lifts that end and
// the tractor drags the log along the track (skidding) to where the fork can take it from the side; there the winch goes down again and the
// choker comes off.
// Here: the cable (out by hand up to 50 m, a rope from the fairlead to the hand, the choker on the log, sagging and lying on the ground when
// slack), winding in (0.4–0.55 m/s), the log dragged like a towed bar (its fastened end towards the fairlead, the other end follows), on the
// ground and against standing trunks (it glances off, or hangs and the winch stops), the remote, the sounds (the tractor's diesel at the PTO,
// the drum, the log scraping) and the saved state: in 'pav-holz-v1' (HOLZ.part2.winde; werk/holz.js keeps a log on the cable as lying where
// it is) and the winch's lift with the tractor in 'pav-veh-v1'. Keys: N in the cab (and the button at the tacho) raises and lowers it.
import * as THREE from 'three';
import { SAVE } from '../core/save.js';
import { $, cam, COARSE, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { LOAD, markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { joy, keys } from '../game/input.js';
import { audio, news } from '../audio/audio.js';
import { HELD, PLAY, SFX } from '../game/play.js';
import { WCOL } from '../world/worldcol.js';
import { VSND } from '../vehicles/vsound.js';
import { VEH } from '../vehicles/vehicle.js';
import { TRACTOR2 } from '../vehicles/tractor.js';
import { TRAILER } from '../vehicles/trailer.js';
import { FELL } from '../world/fell.js';
import { HOLZ } from './holz.js';
export const WINDE = (() => {
  const T = TRACTOR2,
    WN = T.model.winch;
  const S = {
    cable: 'drum', // drum (wound in) · hand (its end in my hand) · free (lying on the ground) · log (the choker on a log)
    out: 0, // cable off the drum (from the fairlead), m
    end: null, // the hook's place when free [x, y, z]
    log: null, // the log on the choker (a HOLZ log), ae: its end with the choker (0 = butt p0, 1 = top p1)
    ae: 0,
    pull: false, // the drum winds in
    atShield: false, // the log's end lies against the shield
    stuckT: 0,
    MAX: 50, // m of cable
    KN: 45, // pulling force: a log of up to ~4.5 t on level ground
    SKID: 0.5, // lift with a log hanging at the shield (its end ~0.4 m up)
  };
  const clamp = THREE.MathUtils.clamp;
  const think = (t, ms) => PLAY.think(t, ms);
  const warned = {};
  const warn = (k, t, ms = 3600, gap = 6000) => {
    if (performance.now() - (warned[k] || -1e9) > gap) {
      warned[k] = performance.now();
      think(t, ms);
    }
  };
  const de = (v, n = 0) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const ground = (x, y) => KERN.ground(x, y);
  const onFoot = () => P.mode === 'walk' && !VEH.cur && !PLAY.seated();
  const exitW = () => WN.toW(WN.exit);
  const down = () => WN.liftT < 0.4;
  const speed = l => 0.55 - 0.15 * Math.min(1, HOLZ.mass(l) / 3000); // m/s on the drum: a little slower with a heavy log
  // ---------------- the log's ends ----------------
  const endP = (l, e) => (e ? l.p1 : l.p0);
  const radE = (l, e) => (e ? l.d1 : l.d0) / 200;
  function chokerAt(l) {
    // the choker sits 0.35 m from the end, the hook on top of the stem
    const E = endP(l, S.ae),
      O = endP(l, 1 - S.ae),
      dx = O[0] - E[0],
      dy = O[1] - E[1],
      dz = O[2] - E[2],
      L = Math.hypot(dx, dy, dz) || 1,
      k = 0.35 / L,
      r = radE(l, S.ae);
    return [E[0] + dx * k, E[1] + dy * k, E[2] + dz * k + r * 0.92];
  }
  // ---------------- the cable's end: a thing to carry (game/play.js), the hook and the choker chain ----------------
  const hookObj = () => {
    const g = new THREE.Group(),
      sl = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.11, 0.045),
        new THREE.MeshStandardMaterial({ color: 0x9da2a6, metalness: 0.85, roughness: 0.3 })
      ),
      ch = new THREE.Mesh(WN.chainGeo(12), WN.mats.dark);
    sl.position.y = 0.04;
    g.add(sl, ch);
    return g;
  };
  const held = new THREE.Group(),
    world = new THREE.Group();
  {
    const h = hookObj();
    h.rotation.z = 0.25;
    held.add(h);
    const w = hookObj();
    w.rotation.x = -Math.PI / 2; // lying on the ground
    w.position.y = 0.03;
    world.add(w);
  }
  S.thing = PLAY.thing({
    id: 'winde:seil',
    name: 'Windenseil',
    world,
    held,
    r: 1.7,
    hz: 0.05,
    prio: 0.5,
    carry3: 'side',
    grip3: { hang: 0.1 },
    vm: { x: 0.24, y: -0.22, z: -0.5, rx: 0.2, ry: 0.3, rz: 0.1, s: 1 },
    takeLabel: 'Windenseil nehmen',
    dropLabel: 'Seil ablegen',
    desc: 'Das Ende des Windenseils (10 mm, 50 m) mit Gleithaken und Chokerkette.',
    can: () => S.cable === 'free',
    onTake: () => {
      S.cable = 'hand';
      S.end = null;
      changed();
    },
  });
  S.thing.state = 'gone';
  world.visible = false;
  S.thing.onPlace = () => {
    // dropped (Q) or laid down by the game: it lies there, the cable stays out
    if (S.cable === 'hand') {
      S.cable = 'free';
      S.end = S.thing.pos.slice();
      changed();
    }
  };
  // the hook in my hand: where the held model is (first person: in front of the camera; third person: at the figure's hand), else at my side
  const _h = new THREE.Vector3();
  function handPos() {
    if (PLAY.carry === S.thing && HELD.obj === held) {
      held.children[0].updateWorldMatrix(true, false);
      _h.set(0, 0.06, 0).applyMatrix4(held.children[0].matrixWorld);
      const h = [_h.x, -_h.z, _h.y];
      if (h.every(Number.isFinite) && Math.hypot(h[0] - P.x, h[1] - P.y) < 1.5 && Math.abs(h[2] - P.feet - 1) < 1.2)
        return h;
    }
    const y = (P.yaw * Math.PI) / 180;
    return [P.x + Math.cos(y) * 0.3, P.y - Math.sin(y) * 0.3, P.feet + 0.95];
  }
  function hookPos() {
    if (S.cable === 'hand') return P.mode === 'walk' || !lastHand ? handPos() : lastHand;
    if (S.cable === 'free' && S.end) return S.end;
    if (S.cable === 'log' && S.log) return chokerAt(S.log);
    return null;
  }
  // ---------------- the rope: a tube from the fairlead to the hook, updated in place (sagging, lying on the ground when slack) ----------------
  const NR = 48,
    NA = 6;
  const rope = (() => {
    const g = new THREE.BufferGeometry(),
      pos = new Float32Array((NR + 1) * NA * 3),
      nrm = new Float32Array((NR + 1) * NA * 3),
      idx = [];
    for (let i = 0; i < NR; i++)
      for (let j = 0; j < NA; j++) {
        const a = i * NA + j,
          b = i * NA + ((j + 1) % NA),
          c = (i + 1) * NA + j,
          d = (i + 1) * NA + ((j + 1) % NA);
        idx.push(a, c, b, b, c, d);
      }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, WN.mats.rope);
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = false;
    m.visible = false;
    m.userData.noMerge = true;
    scene.add(m);
    return m;
  })();
  const RP = new Float32Array((NR + 1) * 3);
  const _t = new THREE.Vector3(),
    _n = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0),
    _p = new THREE.Vector3();
  function ropeUpdate(X, H) {
    const dx = H[0] - X[0],
      dy = H[1] - X[1],
      dz = H[2] - X[2],
      D = Math.hypot(dx, dy, dz),
      slack = S.pull ? 0 : Math.max(0, S.out - D),
      sag = Math.min(Math.sqrt((3 * D * slack) / 8), D * 0.5 + 2) + D * 0.004;
    for (let i = 0; i <= NR; i++) {
      const t = i / NR,
        x = X[0] + dx * t,
        y = X[1] + dy * t;
      let z = X[2] + dz * t - sag * 4 * t * (1 - t);
      if (i > 0 && i < NR) z = Math.max(z, ground(x, y) + 0.012);
      RP[i * 3] = x;
      RP[i * 3 + 1] = y;
      RP[i * 3 + 2] = z;
    }
    const pa = rope.geometry.attributes.position,
      na = rope.geometry.attributes.normal,
      cx = cam.position.x,
      cy = -cam.position.z,
      cz = cam.position.y;
    for (let i = 0; i <= NR; i++) {
      const a = Math.max(0, i - 1),
        b = Math.min(NR, i + 1);
      _t.copy(V(RP[b * 3] - RP[a * 3], RP[b * 3 + 1] - RP[a * 3 + 1], RP[b * 3 + 2] - RP[a * 3 + 2])).normalize();
      _n.copy(Math.abs(_t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : _up)
        .cross(_t)
        .normalize();
      _b.copy(_t).cross(_n);
      const x = RP[i * 3],
        y = RP[i * 3 + 1],
        z = RP[i * 3 + 2],
        rr = Math.max(0.0055, Math.hypot(x - cx, y - cy, z - cz) * 0.0009); // at least about a pixel wide
      _p.copy(V(x, y, z));
      for (let j = 0; j < NA; j++) {
        const an = (j / NA) * Math.PI * 2,
          c = Math.cos(an),
          s = Math.sin(an),
          k = (i * NA + j) * 3,
          nx = _n.x * c + _b.x * s,
          ny = _n.y * c + _b.y * s,
          nz = _n.z * c + _b.z * s;
        pa.array[k] = _p.x + nx * rr;
        pa.array[k + 1] = _p.y + ny * rr;
        pa.array[k + 2] = _p.z + nz * rr;
        na.array[k] = nx;
        na.array[k + 1] = ny;
        na.array[k + 2] = nz;
      }
    }
    pa.needsUpdate = true;
    na.needsUpdate = true;
  }
  // the choker chain round the log's end
  const choker = (() => {
    const g = new THREE.Group(),
      ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 6, 22), WN.mats.dark),
      tail = new THREE.Mesh(WN.chainGeo(5), WN.mats.dark),
      sl = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.11, 0.045),
        new THREE.MeshStandardMaterial({ color: 0x9da2a6, metalness: 0.85, roughness: 0.3 })
      );
    g.add(ring, tail, sl);
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.userData.noMerge = true;
      }
    });
    g.visible = false;
    scene.add(g);
    return { g, ring, tail, sl };
  })();
  const _z = new THREE.Vector3(0, 0, 1);
  function chokerUpdate() {
    const l = S.cable === 'log' ? S.log : null;
    choker.g.visible = !!l;
    if (!l) return;
    const E = endP(l, S.ae),
      O = endP(l, 1 - S.ae),
      ax = V(O[0] - E[0], O[1] - E[1], O[2] - E[2]).normalize(),
      L = l.L || 4,
      k = 0.35 / L,
      r = radE(l, S.ae) + ((S.ae ? l.d0 : l.d1) / 200 - radE(l, S.ae)) * k;
    const c = V(E[0] + (O[0] - E[0]) * k, E[1] + (O[1] - E[1]) * k, E[2] + (O[2] - E[2]) * k);
    choker.ring.position.copy(c);
    choker.ring.quaternion.setFromUnitVectors(_z, ax);
    choker.ring.scale.set(r + 0.012, r + 0.012, 1);
    choker.ring.scale.z = 0.25; // the tube's thickness stays a chain's
    const top = c.clone().add(new THREE.Vector3(0, r + 0.02, 0));
    choker.sl.position.copy(top).add(new THREE.Vector3(0, 0.06, 0));
    choker.tail.position.copy(top).add(new THREE.Vector3(0, 0.02, 0));
    choker.tail.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      ax
        .clone()
        .multiplyScalar(0.6)
        .add(new THREE.Vector3(0, -0.8, 0))
        .normalize()
    );
  }
  // ---------------- dragging the log: the fastened end towards the fairlead, the other end follows like a towed bar ----------------
  const TR = [],
    BX = [];
  function gatherTrunks(l, pad) {
    TR.length = 0;
    BX.length = 0;
    // a parked trailer's bed is in the way too (the coupled one cannot be: the winch is down only without it)
    if (TRAILER && TRAILER.st && !TRAILER.tow && TRAILER.box) {
      const B = TRAILER.box();
      if (B && Math.hypot(B.c[0] - l.p0[0], B.c[1] - l.p0[1]) < l.L + 8) BX.push(B);
    }
    const a = l.p0,
      b = l.p1;
    WCOL.each(
      Math.min(a[0], b[0]) - pad,
      Math.min(a[1], b[1]) - pad,
      Math.max(a[0], b[0]) + pad,
      Math.max(a[1], b[1]) + pad,
      null,
      (i, Q) => TR.push(Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2])
    );
  }
  // one step: the fastened end E moves by (mx, my) – against a trunk it glances off (or stops); the other end O keeps the length, the stem
  // swings off trunks along it. free: E is held by the shield (skidding) – no trunk test for it. Returns how far E got along (mx, my), or
  // −1 if the stem is wedged (nothing moved).
  function dragStep(l, mx, my, free) {
    const e = S.ae,
      E = endP(l, e),
      O = endP(l, 1 - e),
      rE = radE(l, e),
      rO = radE(l, 1 - e),
      m = Math.hypot(mx, my);
    let ex = E[0] + mx,
      ey = E[1] + my;
    if (!free) {
      for (let i = 0; i < TR.length; i += 3) {
        const dx = ex - TR[i],
          dy = ey - TR[i + 1],
          rr = rE + TR[i + 2],
          d = Math.hypot(dx, dy);
        if (d < rr && d > 1e-6) {
          ex = TR[i] + (dx / d) * rr;
          ey = TR[i + 1] + (dy / d) * rr;
        }
      }
      for (const B of BX) {
        const h = VEH.circBox(B, ex, ey, rE);
        if (h) {
          ex -= h.n[0] * h.d;
          ey -= h.n[1] * h.d;
        }
      }
    }
    const dzL = O[2] - E[2],
      Lh = Math.sqrt(Math.max(0.25, l.L * l.L - dzL * dzL));
    let ox = O[0],
      oy = O[1],
      left = 0;
    for (let it = 0; it < 4; it++) {
      const dx = ox - ex,
        dy = oy - ey,
        d = Math.hypot(dx, dy) || 1e-6;
      ox = ex + (dx / d) * Lh;
      oy = ey + (dy / d) * Lh;
      left = 0;
      for (let i = 0; i < TR.length; i += 3) {
        const cx = TR[i],
          cy = TR[i + 1],
          ux = ox - ex,
          uy = oy - ey,
          L2 = ux * ux + uy * uy || 1,
          t = clamp(((cx - ex) * ux + (cy - ey) * uy) / L2, 0, 1);
        if (t < 0.1) continue; // at the fastened end: its own test above
        const qx = ex + ux * t,
          qy = ey + uy * t,
          rr = rE + (rO - rE) * t + TR[i + 2];
        let nx = qx - cx,
          ny = qy - cy;
        const dd = Math.hypot(nx, ny);
        if (dd >= rr) continue;
        if (dd < 1e-5) {
          const ul = Math.sqrt(L2);
          nx = -uy / ul;
          ny = ux / ul;
        } else {
          nx /= dd;
          ny /= dd;
        }
        const pen = rr - dd;
        ox += nx * Math.min(pen / t, 0.5);
        oy += ny * Math.min(pen / t, 0.5);
        left = Math.max(left, pen);
      }
      for (const B of BX)
        for (let t = 0.2; t < 1.01; t += 0.2) {
          const h = VEH.circBox(B, ex + (ox - ex) * t, ey + (oy - ey) * t, rE + (rO - rE) * t);
          if (!h) continue;
          ox -= h.n[0] * Math.min(h.d / t, 0.5);
          oy -= h.n[1] * Math.min(h.d / t, 0.5);
          left = Math.max(left, h.d);
        }
      if (left < 0.01) break;
    }
    if (left > 0.06 && !free) return -1; // wedged between trunks
    const nE = [ex, ey, 0],
      nO = [ox, oy, 0];
    nE[2] = HOLZ.support(ex, ey, l) + rE;
    nO[2] = HOLZ.support(ox, oy, l) + rO;
    if (e) {
      l.p1 = nE;
      l.p0 = nO;
    } else {
      l.p0 = nE;
      l.p1 = nO;
    }
    return m > 1e-9 ? ((ex - E[0]) * mx + (ey - E[1]) * my) / m : 0;
  }
  // the shield's rest point for the log's end (its centre), in front of the shield's back face
  const restPt = l => {
    const r = radE(l, S.ae);
    return WN.toW([0, -0.62 - r * 0.4, 0.36 + r]);
  };
  function logTick(dt) {
    const l = S.log,
      X = exitW();
    if (!l || !l.p0) return;
    gatherTrunks(l, 1.5);
    let moved = false;
    if (S.atShield) {
      // lying against the shield: the end goes with the winch (raised: the tractor drags the log)
      const R = restPt(l),
        E = endP(l, S.ae),
        mx = R[0] - E[0],
        my = R[1] - E[1],
        mm = Math.hypot(mx, my);
      if (mm > 0.002 || Math.abs(R[2] - E[2]) > 0.002) {
        const n = Math.max(1, Math.ceil(mm / 0.12));
        for (let i = 0; i < n; i++) dragStep(l, mx / n, my / n, true);
        const E2 = endP(l, S.ae);
        E2[0] = R[0];
        E2[1] = R[1];
        E2[2] = Math.max(R[2], HOLZ.support(R[0], R[1], l) + radE(l, S.ae));
        moved = true;
        S.dragV = mm / Math.max(dt, 1e-3);
      } else S.dragV = 0;
    } else {
      if (S.pull) {
        const d0 = S.out;
        S.out = Math.max(1.2, S.out - speed(l) * dt);
        spin(d0 - S.out);
      }
      // the cable's length holds the choker: pulled in, the end follows towards the fairlead
      const C = chokerAt(l),
        dh = Math.hypot(C[0] - X[0], C[1] - X[1]),
        dz = X[2] - C[2],
        hmax = Math.sqrt(Math.max(0, S.out * S.out - dz * dz)),
        need = dh - hmax;
      S.dragV = 0;
      if (need > 0.002) {
        const ux = (X[0] - C[0]) / (dh || 1),
          uy = (X[1] - C[1]) / (dh || 1),
          go = Math.min(need, 0.6),
          n = Math.max(1, Math.ceil(go / 0.05));
        let got = 0,
          wedged = false;
        for (let i = 0; i < n; i++) {
          const g = dragStep(l, (ux * go) / n, (uy * go) / n, false);
          if (g < 0) {
            wedged = true;
            break;
          }
          got += g;
        }
        moved = got > 0.0005;
        S.dragV = got / Math.max(dt, 1e-3);
        if (S.pull) {
          S.stuckT = wedged || got < go * 0.25 ? S.stuckT + dt : Math.max(0, S.stuckT - dt);
          if (S.stuckT > 0.7) stuck();
        }
        // the clutch slips: the drum winds only what the log gives
        const C2 = chokerAt(l),
          real = Math.hypot(C2[0] - X[0], C2[1] - X[1], C2[2] - X[2]);
        if (real > S.out + 0.01) {
          spin(S.out - real);
          S.out = Math.min(S.MAX, real);
        }
      }
      // arrived at the shield?
      const R = restPt(l),
        E = endP(l, S.ae);
      if (S.pull && Math.hypot(E[0] - R[0], E[1] - R[1]) < 0.55) arrived();
    }
    if (moved) {
      HOLZ.moved(l);
      S.dirty = true;
    }
  }
  function spin(d) {
    WN.spin += d / 0.17;
    WN.wound = S.MAX - S.out;
    WN.pose(0);
  }
  function arrived() {
    S.pull = false;
    S.atShield = true;
    S.stuckT = 0;
    S.out = Math.max(1.2, S.out);
    sndOff('pull');
    SFX.clunk && SFX.clunk();
    think(
      'Der Stamm liegt am Rückeschild. Choker lösen – oder die Winde etwas anheben (N im Traktor) und den Stamm an eine freie Stelle schleifen. Aufladen: mit der Gabel quer von der Seite oder mit dem Kran am Anhänger.',
      6500
    );
    changed();
  }
  function stuck() {
    S.pull = false;
    S.stuckT = 0;
    sndOff('pull');
    if (window.VSND) VSND.thud(T, 0.5);
    think(
      'Der Stamm hängt an einem Baum fest – die Winde bleibt stehen. Choker lösen und am anderen Ende anschlagen, oder den Traktor versetzen und aus einem anderen Winkel ziehen.',
      7000
    );
    changed();
  }
  // ---------------- the winch: down / up, the cable out and in ----------------
  // a trailer parked right behind the tractor (just uncoupled): its drawbar is where the shield goes down
  function trailerBehind() {
    if (!TRAILER || !TRAILER.st || TRAILER.tow || !TRAILER.eyeW) return false;
    const e = TRAILER.eyeW(),
      w = WN.toW([0, -0.3, 0]);
    return Math.hypot(e[0] - w[0], e[1] - w[1]) < 1.7;
  }
  function setLift(t, why) {
    if (t === WN.liftT) return;
    if (t < WN.liftT && trailerBehind()) {
      think(
        'Der Anhänger steht direkt hinter dem Traktor – erst ein paar Meter vorfahren, dann die Winde absenken.',
        3800
      );
      return;
    }
    if (t < WN.liftT && TRAILER && TRAILER.tow === T) {
      think('Erst den Anhänger abkuppeln (K) – sein Zugmaul sitzt unter der Winde.', 3600);
      return;
    }
    if (t < WN.liftT && Math.hypot(T.st.u, T.st.v) > 0.3) {
      think('Erst anhalten.', 1500);
      return;
    }
    WN.liftT = t;
    S.liftSnd = true;
    if (why) think(why, 3600);
    VEH.save();
    changed();
  }
  function toggleLift() {
    if (WN.liftT >= 0.9) {
      setLift(
        0,
        'Winde ab: das Rückeschild greift in den Boden und hält den Traktor. Jetzt aussteigen und das Seil ausziehen.'
      );
      return;
    }
    if (S.cable === 'drum') setLift(1, 'Winde angehoben – frei zum Fahren.');
    else if (S.cable === 'log' && S.atShield) {
      if (WN.liftT < 0.4)
        setLift(
          S.SKID,
          'Stamm angelüftet: jetzt langsam fahren, er schleift hinterher. Zum Ablegen die Winde wieder absenken (N).'
        );
      else setLift(0, 'Winde ab – der Stamm liegt. Jetzt den Choker lösen.');
    } else think('Erst das Seil einholen – mit ausgezogenem Seil bleibt die Winde unten.', 3200);
  }
  S.toggleLift = toggleLift;
  WN.onKey = (k, dn) => {
    if (!dn) return k === 'n' || k === 'winch';
    if (k === 'n' || k === 'winch') {
      toggleLift();
      return true;
    }
    if ((k === 'k' || k === 'hitch') && (WN.liftT < 0.9 || S.cable !== 'drum') && !(TRAILER && TRAILER.tow)) {
      think(
        'Mit der Winde unten oder dem Seil draußen geht kein Anhänger an den Traktor – erst Seil einholen und die Winde anheben (N).',
        3800
      );
      return true;
    }
    return false;
  };
  WN.busy = () => S.cable !== 'drum' && !(S.cable === 'log' && S.atShield);
  function takeCable() {
    if (S.cable !== 'drum') return;
    if (!down()) {
      if (TRAILER && TRAILER.tow === T) {
        think('Erst den Anhänger abkuppeln – die Winde muss ganz herunter.', 3200);
        return;
      }
      if (trailerBehind()) {
        think(
          'Der Anhänger steht direkt hinter dem Traktor – erst ein paar Meter vorfahren, dann die Winde absenken.',
          3800
        );
        return;
      }
      WN.liftT = 0;
      S.liftSnd = true;
      VEH.save();
    }
    S.cable = 'hand';
    S.out = Math.max(S.out, 1.2);
    S.atShield = false;
    PLAY.give(S.thing);
    SFX.clunk && SFX.clunk();
    think(
      'Seil ausziehen: mit dem Haken zum Stamm gehen (höchstens 50 m), dort den Choker ums Stammende legen (E). Eingeholt wird per Funk.',
      5200
    );
    changed();
  }
  function hangIn() {
    // the end back at the winch: the drum takes the rest
    S.thing.gone();
    S.cable = 'drum';
    S.out = 0;
    S.end = null;
    S.pull = false;
    S.atShield = false;
    spin(0);
    SFX.clunk && SFX.clunk();
    think('Seil eingehängt. Die Winde anheben (Außenbedienung oder N im Traktor), dann kann der Traktor fahren.', 3800);
    changed();
  }
  // a log end within reach of the hook
  function nearEnd(x, y, r = 1.7) {
    let best = null,
      bd = r;
    for (const l of HOLZ.logs) {
      if (l.st !== 'ground' || !l.p0) continue;
      for (const e of [0, 1]) {
        const p = endP(l, e),
          d = Math.hypot(p[0] - x, p[1] - y);
        if (d < bd) {
          bd = d;
          best = { l, e, p };
        }
      }
    }
    return best;
  }
  function fasten(l, e) {
    if (!l || l.st !== 'ground') return false;
    const kg = HOLZ.mass(l);
    if (kg > S.KN * 100) {
      think(
        `Zu schwer für die Winde: etwa ${de(kg)} kg – sie zieht ${S.KN} kN, gut ${de(S.KN / 10, 1)} t auf ebenem Boden.`,
        4200
      );
      return false;
    }
    S.thing.gone();
    l.st = 'winch';
    S.log = l;
    S.ae = e;
    S.cable = 'log';
    S.atShield = false;
    S.pull = false;
    S.stuckT = 0;
    SFX.clunk && SFX.clunk();
    const X = exitW(),
      C = chokerAt(l);
    S.out = clamp(Math.max(S.out, Math.hypot(C[0] - X[0], C[1] - X[1], C[2] - X[2])), 1.2, S.MAX);
    think(
      `Choker sitzt am ${e ? 'Zopfende' : 'Stammfuß'} (${HOLZ.SPN[l.sp] || 'Stamm'}, etwa ${de(kg)} kg). Jetzt seitlich aus dem Gefahrenbereich gehen – nie in die Seillinie – und per Funk einholen.`,
      6000
    );
    HOLZ.save();
    changed();
    return true;
  }
  function release() {
    const l = S.log;
    if (!l) return;
    S.pull = false;
    sndOff('pull');
    l.st = 'ground';
    // the end comes down from the shield: both ends on what is under them
    for (const e of [0, 1]) {
      const p = endP(l, e);
      p[2] = HOLZ.support(p[0], p[1], l) + radE(l, e);
    }
    HOLZ.restOn(l);
    HOLZ.moved(l);
    S.log = null;
    S.atShield = false;
    S.cable = 'hand';
    PLAY.give(S.thing);
    SFX.clunk && SFX.clunk();
    HOLZ.save();
    think(
      'Choker gelöst. Das Seil an der Winde einhängen – oder gleich den nächsten Stamm anschlagen. Aufladen: Gabel quer von der Seite oder Kran am Anhänger.',
      5200
    );
    changed();
  }
  // where I stand while it pulls: never in the cable's line, never beside the log (a cable can snap, the log can swing)
  function danger() {
    const X = exitW(),
      H = hookPos();
    if (!H) return null;
    const segD = (a, b) => {
      const ux = b[0] - a[0],
        uy = b[1] - a[1],
        L2 = ux * ux + uy * uy || 1,
        t = clamp(((P.x - a[0]) * ux + (P.y - a[1]) * uy) / L2, 0, 1);
      return [Math.hypot(a[0] + ux * t - P.x, a[1] + uy * t - P.y), t * Math.sqrt(L2)];
    };
    const [dc, along] = segD(X, H);
    if (dc < 1.5 && along > 2.5) return 'Seillinie';
    if (S.cable === 'log' && S.log) {
      const [dl] = segD(S.log.p0, S.log.p1);
      if (dl < 2.0) return 'Stamm';
    }
    return null;
  }
  function pullStart() {
    if (S.cable === 'drum' || S.cable === 'hand') return;
    if (!down()) {
      think('Die Winde ist oben – erst absenken, das Schild muss im Boden stecken.', 3200);
      return;
    }
    if (S.cable === 'log' && S.atShield) return;
    const dz = danger();
    if (dz) {
      think(
        `Gefahrenbereich (${dz})! Beim Einholen nie in der Seillinie und nicht neben dem Stamm stehen – seitlich weg, mit Abstand.`,
        4600
      );
      return;
    }
    S.pull = true;
    S.stuckT = 0;
    S.dangerT = 0;
    // a cable far off to the side runs hard against the fairlead's rollers – it works, but the rear belongs towards the log
    const X = exitW(),
      H = hookPos(),
      b = VEH.fwd(T.st.psi),
      dh = H ? Math.hypot(H[0] - X[0], H[1] - X[1]) : 0,
      cs = dh > 1 ? -((H[0] - X[0]) * b[0] + (H[1] - X[1]) * b[1]) / dh : 1;
    if (S.cable === 'log' && cs < 0.34)
      think(
        'Die Winde zieht – das Seil läuft aber sehr schräg über die Seilführung. Besser das Heck zum Stamm stellen.',
        3600
      );
    else think(S.cable === 'log' ? 'Die Winde zieht …' : 'Seil wird eingeholt …', 1800);
    changed();
  }
  function pullStop(msg) {
    if (!S.pull) return;
    S.pull = false;
    sndOff('pull');
    if (msg) think(msg, 2600);
    changed();
  }
  S.pullStart = pullStart;
  S.pullStop = pullStop;
  // the free end wound in: it slides over the ground towards the fairlead
  function freeTick(dt) {
    if (!S.end) return;
    const X = exitW();
    if (S.pull) {
      const d0 = S.out;
      S.out = Math.max(0, S.out - 0.9 * dt); // without load the drum runs faster
      spin(d0 - S.out);
    }
    const e = S.end,
      dh = Math.hypot(e[0] - X[0], e[1] - X[1]),
      dz = X[2] - e[2],
      hmax = Math.sqrt(Math.max(0, S.out * S.out - dz * dz));
    if (dh > hmax + 0.002) {
      const k = Math.max(0, hmax) / (dh || 1);
      e[0] = X[0] + (e[0] - X[0]) * k;
      e[1] = X[1] + (e[1] - X[1]) * k;
      e[2] = ground(e[0], e[1]) + 0.02;
      S.thing.pos = e.slice();
      world.position.copy(V(e[0], e[1], e[2]));
      world.rotation.y = Math.atan2(X[0] - e[0], X[1] - e[1]);
      S.dirty = true;
    }
    if (S.pull && (S.out < 1.3 || dh < 1.0)) {
      S.thing.gone();
      S.cable = 'drum';
      S.out = 0;
      S.end = null;
      S.pull = false;
      sndOff('pull');
      spin(0);
      SFX.clunk && SFX.clunk();
      think('Seil eingeholt. Winde anheben (N im Traktor oder Außenbedienung) – dann kann er fahren.', 3600);
      changed();
    }
  }
  // ---------------- the actions (E / tap) ----------------
  // at the left rear wing: the outside control of the rear hitch
  PLAY.act({
    id: 'winde:lift',
    r: 1.9,
    prio: 0.4,
    obj: () => WN.g,
    pos: () => {
      const p = VEH.toW(T, -1.22, -1.95);
      return [p[0], p[1], T.st.z + 1.1];
    },
    label: () => {
      if (!onFoot()) return null;
      if (WN.liftT >= 0.9) return 'Winde absenken (Außenbedienung)';
      if (S.cable === 'drum') return 'Winde anheben (Außenbedienung)';
      if (S.cable === 'log' && S.atShield)
        return WN.liftT < 0.4 ? 'Winde anheben – Stamm anlüften' : 'Winde absenken – Stamm ablegen';
      return null;
    },
    run: () => toggleLift(),
  });
  // behind the winch: the cable out, or back in
  PLAY.act({
    id: 'winde:cable',
    r: 2.1,
    prio: 0.5,
    obj: () => WN.g,
    pos: () => {
      const p = WN.toW([0, -0.9, 1.0]);
      return [p[0], p[1], T.st.z + 1.0];
    },
    label: () => {
      if (!onFoot()) return null;
      if (S.cable === 'drum') return 'Seil ausziehen';
      if (S.cable === 'hand') return 'Seil an der Winde einhängen';
      return null;
    },
    run: () => (S.cable === 'drum' ? takeCable() : S.cable === 'hand' ? hangIn() : null),
  });
  // at a log's end with the hook in the hand: the choker round it
  let fastenC = null;
  PLAY.act({
    id: 'winde:fasten',
    r: 1.9,
    prio: 0.7,
    obj: () => null,
    pos: () => {
      if (S.cable !== 'hand') return null;
      fastenC = nearEnd(P.x, P.y, 2.2);
      if (fastenC) return [fastenC.p[0], fastenC.p[1], fastenC.p[2]];
      const o = FELL.openStem ? FELL.openStem(P.x, P.y, 2.0) : null;
      fastenC = o ? { open: o } : null;
      return o ? [P.x, P.y, P.feet + 0.5] : null;
    },
    label: () => {
      if (!onFoot() || S.cable !== 'hand' || !fastenC) return null;
      return fastenC.open ? 'Seil anschlagen' : `Seil anschlagen (Choker ums ${fastenC.e ? 'Zopfende' : 'Stammende'})`;
    },
    run: () => {
      if (!fastenC) return;
      if (fastenC.open)
        think(
          `Der Baum ist noch nicht aufgearbeitet (${fastenC.open.todo}). Erst die vermessenen Abschnitte kann ich anschlagen (Waldbuch B).`,
          5200
        );
      else fasten(fastenC.l, fastenC.e);
    },
  });
  // the choker off again (not while it pulls)
  PLAY.act({
    id: 'winde:release',
    r: 1.9,
    prio: 0.6,
    obj: () => null,
    pos: () => (S.cable === 'log' && S.log ? chokerAt(S.log) : null),
    label: () => (onFoot() && S.cable === 'log' && !S.pull && WN.liftT < 0.4 ? 'Choker lösen' : null),
    run: release,
  });
  // the radio remote (on the belt): wherever I stand within reach of the tractor
  PLAY.act({
    id: 'winde:funk',
    r: 6,
    prio: -1.6,
    obj: () => null,
    pos: () => [P.x, P.y, P.feet + 1.0],
    label: () => {
      if (!onFoot() || S.cable === 'drum' || S.cable === 'hand') return null;
      if (Math.hypot(P.x - T.st.x, P.y - T.st.y) > 90) return null;
      if (S.pull) return 'Winde stoppen (Funk)';
      if (S.cable === 'log' && S.atShield) return null;
      return 'Seil einholen (Funk)';
    },
    run: () => (S.pull ? pullStop('Winde gestoppt.') : pullStart()),
  });
  // ---------------- sounds: the tractor at the PTO, the drum, the log on the forest floor (Web Audio, from where they are) ----------------
  const SND = { N: null };
  function sndBuild() {
    const r = audio.raw && audio.raw();
    if (!r || !audio.ready()) return null;
    const c = r.ctx,
      N = { all: [] };
    const gain = v => {
      const g = c.createGain();
      g.gain.value = v;
      return g;
    };
    const bq = (type, f, q) => {
      const x = c.createBiquadFilter();
      x.type = type;
      x.frequency.value = f;
      x.Q.value = q;
      return x;
    };
    const osc = (type, f) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      N.all.push(o);
      return o;
    };
    const pan = dest => {
      if (!c.createStereoPanner) return { node: dest, p: null };
      const p = c.createStereoPanner();
      p.connect(dest);
      return { node: p, p };
    };
    // the tractor: diesel at the PTO (the recording if there, else pulses), its own place
    N.tp = pan(r.sfx);
    N.eOut = gain(0);
    N.eOut.connect(N.tp.node);
    N.eLP = bq('lowpass', 520, 0.7);
    N.eLP.connect(N.eOut);
    const rec = audio.buf('tractor');
    if (rec) {
      const s = c.createBufferSource();
      s.buffer = rec;
      s.loop = true;
      const g = gain(0.7);
      s.connect(g);
      g.connect(N.eLP);
      N.rec = s;
      N.all.push(s);
    }
    N.o1 = osc('sawtooth', 28);
    N.o2 = osc('square', 14);
    const g1 = gain(rec ? 0.06 : 0.42),
      g2 = gain(rec ? 0.02 : 0.18);
    N.o1.connect(g1);
    N.o2.connect(g2);
    g1.connect(N.eLP);
    g2.connect(N.eLP);
    // the drum and its chain drive: a whine, the cable ticking on the drum
    N.wOut = gain(0);
    N.wOut.connect(N.tp.node);
    N.wBP = bq('bandpass', 380, 5);
    N.wBP.connect(N.wOut);
    N.o3 = osc('triangle', 380);
    N.o4 = osc('sawtooth', 190);
    const g3 = gain(0.6),
      g4 = gain(0.2);
    N.o3.connect(g3);
    N.o4.connect(g4);
    g3.connect(N.wBP);
    g4.connect(N.wBP);
    // the log scraping: noise, rough, from the log
    const n = c.sampleRate * 2,
      b = c.createBuffer(1, n, c.sampleRate),
      d = b.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4;
      d[i] = lp * (0.55 + 0.45 * Math.sin(i * 0.0021) * Math.sin(i * 0.00037));
    }
    const ns = c.createBufferSource();
    ns.buffer = b;
    ns.loop = true;
    N.all.push(ns);
    N.lpn = pan(r.sfx);
    N.sOut = gain(0);
    N.sOut.connect(N.lpn.node);
    N.sBP = bq('bandpass', 620, 0.9);
    N.sLP = bq('lowpass', 180, 0.8);
    const gs1 = gain(1.0),
      gs2 = gain(1.6);
    ns.connect(N.sBP);
    ns.connect(N.sLP);
    N.sBP.connect(gs1);
    N.sLP.connect(gs2);
    gs1.connect(N.sOut);
    gs2.connect(N.sOut);
    const t0 = c.currentTime + 0.02;
    for (const s of N.all) s.start(t0, s.buffer ? Math.random() * s.buffer.duration * 0.8 : undefined);
    N.c = c;
    return N;
  }
  function sndOff(what) {
    if (what === 'pull' && SND.N) {
      const N = SND.N,
        t = N.c.currentTime;
      N.wOut.gain.setTargetAtTime(0, t, 0.15);
      N.sOut.gain.setTargetAtTime(0, t, 0.1);
    }
  }
  function sndStop() {
    const N = SND.N;
    if (!N) return;
    SND.N = null;
    const t = N.c.currentTime;
    for (const g of [N.eOut, N.wOut, N.sOut]) g.gain.setTargetAtTime(0, t, 0.3);
    for (const s of N.all)
      try {
        s.stop(t + 1.5);
      } catch (e) {}
  }
  // a failing sound must never stop the winch
  function sndSafe(dt) {
    try {
      sndTick(dt);
    } catch (e) {
      if (!SND.err) {
        SND.err = 1;
        console.warn('winde sound', e);
      }
    }
  }
  function sndTick(dt) {
    // the engine runs while the winch is down and nobody sits in the tractor (in the cab: vehicles/vsound.js)
    const near = Math.hypot(P.x - T.st.x, P.y - T.st.y) < 140;
    const want = near && down() && VEH.cur !== T && P.mode === 'walk';
    if (!want) {
      if (SND.N) sndStop();
      return;
    }
    if (!SND.N) SND.N = sndBuild();
    const N = SND.N;
    if (!N) return;
    const c = N.c,
      t = c.currentTime,
      sp = audio.spatial(T.st.x, T.st.y, 14),
      load = S.pull ? (S.cable === 'log' ? 1 : 0.4) : 0,
      rpm = 850 + load * 450 + (S.stuckT > 0.2 ? 150 : 0),
      f0 = rpm / 30;
    N.o1.frequency.setTargetAtTime(f0, t, 0.25);
    N.o2.frequency.setTargetAtTime(f0 / 2, t, 0.25);
    if (N.rec) N.rec.playbackRate.setTargetAtTime(0.62 + (0.55 * (rpm - 850)) / 1500, t, 0.3);
    N.eLP.frequency.setTargetAtTime(Math.min(sp.lp, 420 + rpm * 0.35), t, 0.2);
    N.eOut.gain.setTargetAtTime(sp.vol * (0.32 + load * 0.16), t, 0.2);
    if (N.tp.p) N.tp.p.pan.setTargetAtTime(sp.pan, t, 0.1);
    const run = S.pull ? 1 : 0;
    N.o3.frequency.setTargetAtTime(330 + load * 90, t, 0.3);
    N.o4.frequency.setTargetAtTime(165 + load * 45, t, 0.3);
    N.wOut.gain.setTargetAtTime(sp.vol * run * 0.055, t, 0.15);
    // the log
    const l = S.cable === 'log' ? S.log : null;
    if (l) {
      const m = HOLZ.mid(l),
        sl = audio.spatial(m[0], m[1], 10),
        v = clamp((S.dragV || 0) / 0.5, 0, 1.4);
      N.sOut.gain.setTargetAtTime(sl.vol * v * 0.42 * (0.7 + 0.3 * Math.random()), t, 0.06);
      N.sBP.frequency.setTargetAtTime(480 + Math.random() * 260, t, 0.08);
      if (N.lpn.p) N.lpn.p.pan.setTargetAtTime(sl.pan, t, 0.1);
    } else N.sOut.gain.setTargetAtTime(0, t, 0.1);
  }
  // ---------------- per frame ----------------
  let lastT = null,
    lastHand = null,
    introDone = false;
  function tick(dt) {
    if (!LOAD.finished || !HOLZ.ready) return;
    // the hitch moves (also while the tractor sleeps parked)
    if (Math.abs(WN.lift - WN.liftT) > 1e-4) {
      WN.pose(dt);
      markDirty(true);
      if (Math.abs(WN.lift - WN.liftT) <= 1e-4 && S.liftSnd) {
        S.liftSnd = false;
        if (WN.liftT < 0.4) VSND.thud(T, 0.35);
      }
    }
    // the tractor jumped (menu: vehicles back to their places, a test): the cable goes back on the drum, the log stays where it is, the
    // winch goes up – as at the start
    const tp = [T.st.x, T.st.y];
    if (lastT && Math.hypot(tp[0] - lastT[0], tp[1] - lastT[1]) > 3) {
      if (S.cable !== 'drum') reset('Die Winde ist wieder aufgespult – der Stamm bleibt liegen.');
      else if (WN.liftT < 1) {
        WN.lift = WN.liftT = 1;
        WN.pose(0);
      }
    }
    lastT = tp;
    WN.parked.visible = S.cable === 'drum';
    if (S.btn) {
      const pr = WN.liftT < 0.9 ? 'true' : 'false';
      if (S.btn.getAttribute('aria-pressed') !== pr) S.btn.setAttribute('aria-pressed', pr);
    }
    // the tractor tried to drive with the winch down
    if (VEH.cur === T && T.model.hold()) {
      const tries =
        keys.has('w') ||
        keys.has('s') ||
        keys.has('arrowup') ||
        keys.has('arrowdown') ||
        (joy.active && Math.abs(joy.y) > 0.25);
      if (tries)
        warn(
          'drive',
          S.cable === 'drum' || (S.cable === 'log' && S.atShield)
            ? 'Die Winde ist unten – das Schild hält den Traktor. Erst anheben (N).'
            : 'Das Seil ist draußen – erst einholen und die Winde anheben.',
          3200
        );
    }
    if (S.cable === 'drum') {
      rope.visible = false;
      choker.g.visible = false;
      sndSafe(dt);
      return;
    }
    const X = exitW();
    if (S.cable === 'hand') {
      if (VEH.cur || PLAY.seated()) {
        // into a vehicle or sat down: the hook stays here
        const h = lastHand || handPos();
        S.thing.place(h[0], h[1], ground(h[0], h[1]) + 0.02, 0);
      } else if (P.mode === 'walk') {
        // the player jumped (menu, a place): the hook falls where it was
        if (lastHand && Math.hypot(P.x - lastHand[0], P.y - lastHand[1]) > 4) {
          S.thing.place(lastHand[0], lastHand[1], ground(lastHand[0], lastHand[1]) + 0.02, 0);
          think('Das Seilende liegt dort, wo ich war.', 2400);
        } else {
          let d = Math.hypot(P.x - X[0], P.y - X[1], P.feet + 1 - X[2]);
          if (d > S.MAX) {
            // the cable is out to its end: it holds me back
            const k = (S.MAX - 0.02) / d;
            P.x = X[0] + (P.x - X[0]) * k;
            P.y = X[1] + (P.y - X[1]) * k;
            d = S.MAX;
            warn('end', 'Das Seil ist zu Ende – 50 m.', 2200);
          }
          const h = handPos(),
            dh = Math.min(S.MAX, Math.hypot(h[0] - X[0], h[1] - X[1], h[2] - X[2]));
          if (dh > S.out) {
            spin(-(dh - S.out));
            S.out = dh;
          }
          lastHand = h;
        }
      } // a view from above or around: the hook stays in the hand where I stood
    } else lastHand = null;
    if (S.cable === 'free') freeTick(dt);
    if (S.cable === 'log') {
      logTick(dt);
      if (S.pull && (S.dangerT = (S.dangerT || 0) + dt) > 0.5) {
        S.dangerT = 0;
        const dz = danger();
        if (dz) pullStop(`Winde gestoppt – ich stand im Gefahrenbereich (${dz}).`);
        else if (Math.hypot(P.x - T.st.x, P.y - T.st.y) > 100) pullStop('Funk außer Reichweite – die Winde hält an.');
      }
    }
    if (S.cable === 'free' && S.pull && (S.dangerT = (S.dangerT || 0) + dt) > 0.5) S.dangerT = 0;
    const H = hookPos();
    rope.visible = !!H;
    if (H) ropeUpdate(X, H);
    chokerUpdate();
    if (S.dirty || S.pull || S.cable === 'hand') markDirty();
    S.dirty = false;
    sndSafe(dt);
    if (S.saveT !== undefined && (S.saveT -= dt) <= 0) {
      S.saveT = undefined;
      HOLZ.save();
    }
  }
  function reset(msg) {
    if (S.log) {
      S.log.st = 'ground';
      HOLZ.restOn(S.log);
      HOLZ.moved(S.log);
    }
    S.thing.gone();
    S.cable = 'drum';
    S.out = 0;
    S.end = null;
    S.log = null;
    S.pull = false;
    S.atShield = false;
    WN.lift = WN.liftT = 1;
    WN.pose(0);
    spin(0);
    sndStop();
    rope.visible = false;
    choker.g.visible = false;
    if (msg) think(msg, 3000);
    changed();
  }
  S.reset = reset;
  // something changed: saved a moment later (with the wood, pav-holz-v1)
  function changed() {
    S.saveT = 0.6;
    markDirty();
  }
  window.TICKS.push(dt => {
    try {
      tick(dt);
    } catch (e) {
      if (!S._err) {
        S._err = 1;
        console.warn('winde', e);
      }
    }
  });
  // ---------------- saving: in the wood's state (werk/holz.js part2.winde) ----------------
  const p2 = HOLZ.part2;
  HOLZ.part2 = () => {
    const o = p2 ? p2() : {};
    const e = S.cable === 'hand' ? lastHand || handPos() : S.end;
    o.winde = {
      c: S.cable === 'hand' ? 'free' : S.cable, // a hook in the hand is kept as lying where I stood
      out: +S.out.toFixed(2),
      end: e ? e.map(v => +(+v).toFixed(2)) : null,
      log: S.log ? S.log.id : null,
      ae: S.ae,
      sh: S.atShield,
    };
    return o;
  };
  const on0 = HOLZ.onStart;
  HOLZ.onStart = p => {
    if (on0) on0(p);
    restore(p && p.winde);
  };
  function restore(w) {
    if (!w || typeof w !== 'object') return;
    const fin = v => typeof v === 'number' && Number.isFinite(v);
    const out = fin(w.out) ? clamp(w.out, 0, S.MAX) : 0;
    if (w.c === 'log' && typeof w.log === 'string' && HOLZ.by[w.log] && HOLZ.by[w.log].st === 'ground') {
      const l = HOLZ.by[w.log];
      l.st = 'winch';
      S.log = l;
      S.ae = w.ae === 1 ? 1 : 0;
      S.cable = 'log';
      S.out = Math.max(1.2, out);
      S.atShield = !!w.sh;
    } else if (w.c === 'free' && Array.isArray(w.end) && w.end.length === 3 && w.end.every(fin)) {
      S.cable = 'free';
      S.end = w.end.slice();
      S.out = Math.max(out, 1.2);
      S.thing.place(S.end[0], S.end[1], S.end[2], 0);
      S.cable = 'free';
    }
    // the winch's lift (from the tractor's saved state) to fit: down with the cable out, down or lifted a little with a log at the shield,
    // up with the cable in
    const lt = WN.liftT,
      want =
        S.cable === 'drum' ? (lt === 0 ? 0 : 1) : S.cable === 'log' && S.atShield ? (lt === S.SKID ? S.SKID : 0) : 0;
    if (want !== lt) {
      WN.lift = WN.liftT = want;
      WN.pose(0);
    }
    WN.wound = S.MAX - S.out;
    WN.pose(0);
  }
  // ---------------- the button at the tacho (touch) and the key list ----------------
  {
    const bar = $('vhud') && $('vhud').querySelector('.vbtns');
    if (bar) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.vb = 'winch';
      b.className = 'ld';
      b.title = 'Seilwinde senken / heben (N)';
      b.setAttribute('aria-label', 'Seilwinde senken oder heben');
      b.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="9" height="10" rx="1.5"/><path d="M4 10h9M4 14h9M13 9l7 2M20 11v8"/></svg>';
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (VEH.cur === T) toggleLift();
      });
      bar.appendChild(b);
      S.btn = b;
    }
    const kl = $('vkeys') && $('vkeys').querySelector('.ld');
    if (kl) kl.insertAdjacentHTML('beforeend', ' <i></i> <kbd>N</kbd> Winde');
  }
  // ---------------- a word on the first visit after V16h, near the tractor ----------------
  window.TICKS.push(() => {
    if (introDone || !HOLZ.ready || P.mode !== 'walk' || !LOAD.ready) return;
    if (Math.hypot(P.x - T.st.x, P.y - T.st.y) > 40) return;
    introDone = true;
    if (SAVE.once('pav-winde'))
      setTimeout(
        () =>
          news(
            'Neu: Seilwinde am Traktor. Steht er auf dem Weg und kommt nicht an den Stamm: hinten die Winde absenken, das Seil ausziehen (E), am Stammende den Choker anschlagen, aus dem Gefahrenbereich gehen und per Funk einholen. ' +
              (COARSE ? 'Am Tacho: Winde heben/senken.' : 'Im Traktor: N hebt und senkt die Winde.'),
            13000
          ),
        4000
      );
  });
  // ---------------- state for tests and the error report ----------------
  S.state = () => ({
    cable: S.cable,
    out: +S.out.toFixed(2),
    pull: S.pull,
    atShield: S.atShield,
    lift: +WN.lift.toFixed(3),
    liftT: WN.liftT,
    log: S.log ? S.log.id : null,
    ae: S.ae,
    end: S.end,
    hold: T.model.hold(),
    snd: !!SND.N,
    sndErr: SND.err || 0,
    audio: !!(audio.ready && audio.ready()),
  });
  Object.assign(S, { takeCable, hangIn, fasten, release, nearEnd, exitW, restPt, chokerAt, danger, hookPos, restore });
  return S;
})();
window.WINDE = WINDE;
