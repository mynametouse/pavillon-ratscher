// ===================== handy: the hold – the figure takes the phone out, looks at it, taps, holds it to the ear (HANDYPOSE) =====================
// Falko, 13.11.2026 13:09: „diese Bewegung, das Handy in die Hand zu nehmen, vielleicht sogar zu drücken, das muss gut aussehen“. When the
// phone of a world that wants it held (HANDY.welt cfg.halten) is up, the player's figure (game/avatar.js, third person, on foot) raises it in
// the right hand in front of the chest and looks down at it; the thumb presses when the player taps (event 'handy:tipp'); a call puts it to
// the ear; the viewfinder holds it up in front of the eyes; putting it away lowers it – all eased in and out (~0.35 s). A small phone lies in
// the hand: a thin rounded slab whose screen glows in the colour of what is open. In a vehicle there is no hold (the phone is UI only). The
// third-person camera eases a little closer over the shoulder while it is up and goes back to where the player had it.
// How: bone turns after the avatar's own pose of the frame (a late KERN tick after game/avatar.js), a two-bone IK for the arm, the hand
// turned so the palm faces the eyes, fingers curled round the phone. Every turn is kept in the avatar's sv map (bone → quaternion before it),
// which the avatar puts back before its next mixer step – so nothing of the base files is touched. Nothing of Grenzland is imported.
//   HANDYPOSE.stand() → { w, art, hand, kopf, brust, prop, cam } for the tests · HANDYPOSE.S
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { CAM3 } from '../game/player.js';
import { AVATAR } from '../game/avatar.js';
import { VEH } from '../vehicles/vehicle.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { HANDY } from './handy.js';
export const HANDYPOSE = (() => {
  const S = {
    w: 0,
    art: 'halten',
    wa: { halten: 1, ohr: 0, foto: 0 },
    prop: null,
    err: null,
    n: 0,
    tipT: 0,
    camD0: null,
    camSet: null,
    last: null,
  };
  const V = () => new THREE.Vector3(),
    Q = () => new THREE.Quaternion();
  const clamp = THREE.MathUtils.clamp,
    smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  // ---------------- turning bones (kept in the avatar's sv map) ----------------
  const keep = (sv, b) => {
    if (!sv.has(b)) sv.set(b, b.quaternion.clone());
  };
  const _pq = Q(),
    _tq = Q();
  // turn bone b by the world rotation q; its children follow
  function turnW(sv, b, q) {
    if (!b || !b.parent) return;
    keep(sv, b);
    b.parent.getWorldQuaternion(_pq);
    _tq.copy(_pq).invert().multiply(q).multiply(_pq);
    b.quaternion.premultiply(_tq).normalize();
    b.updateMatrixWorld(true);
  }
  const _a = V(),
    _b = V(),
    _c = V(),
    _q = Q(),
    QI = Q();
  // turn bone b so that the line from it to point c (world) points at T, by the share w
  function aim(sv, b, c, T, w = 1) {
    if (!b || w <= 0) return;
    b.getWorldPosition(_a);
    _b.subVectors(c, _a);
    _c.subVectors(T, _a);
    if (_b.lengthSq() < 1e-12 || _c.lengthSq() < 1e-12) return;
    _q.setFromUnitVectors(_b.normalize(), _c.normalize());
    if (w < 1) _q.slerp(QI, 1 - w);
    turnW(sv, b, _q);
  }
  const _ia = V(),
    _ib = V(),
    _ic = V(),
    _id = V(),
    _ie = V(),
    _ip = V(),
    _ik = V();
  // two bones A → B → C (upper arm, forearm, hand): C to T (blended by w from where it is), the elbow toward the pole
  function ik2(sv, A, Bn, C, T, pole, w) {
    if (!A || !Bn || !C || w <= 0) return false;
    A.getWorldPosition(_ia);
    Bn.getWorldPosition(_ib);
    C.getWorldPosition(_ic);
    const l1 = _ia.distanceTo(_ib),
      l2 = _ib.distanceTo(_ic);
    if (l1 < 1e-4 || l2 < 1e-4) return false;
    _ie.copy(_ic).lerp(T, clamp(w, 0, 1));
    _id.subVectors(_ie, _ia);
    let d = _id.length();
    if (d < 1e-5) return false;
    _id.divideScalar(d);
    d = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-4);
    _ip.copy(pole).addScaledVector(_id, -pole.dot(_id));
    if (_ip.lengthSq() < 1e-8) {
      _ip.subVectors(_ib, _ia);
      _ip.addScaledVector(_id, -_ip.dot(_id));
    }
    if (_ip.lengthSq() < 1e-10) return false;
    _ip.normalize();
    const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1),
      sa = Math.sqrt(1 - ca * ca);
    _ik
      .copy(_ia)
      .addScaledVector(_id, l1 * ca)
      .addScaledVector(_ip, l1 * sa);
    aim(sv, A, _ib, _ik);
    Bn.getWorldPosition(_ib);
    C.getWorldPosition(_ic);
    _ie.copy(_ia).addScaledVector(_id, d);
    aim(sv, Bn, _ic, _ie);
    return true;
  }
  // ---------------- the hand's own frame: along the fingers, the palm's normal, the thumb side ----------------
  const _h = V(),
    _m = V(),
    _i = V(),
    _p = V();
  function handFrame(B, f, n, s) {
    const H = B.RightHand,
      M = B.RightHandMiddle1 || B.RightHandIndex1,
      I = B.RightHandIndex1,
      Pk = B.RightHandPinky1 || B.RightHandRing1;
    if (!H || !M || !I || !Pk) return false;
    H.getWorldPosition(_h);
    M.getWorldPosition(_m);
    I.getWorldPosition(_i);
    Pk.getWorldPosition(_p);
    f.subVectors(_m, _h);
    if (f.lengthSq() < 1e-10) return false;
    f.normalize();
    s.subVectors(_i, _p);
    s.addScaledVector(f, -s.dot(f));
    if (s.lengthSq() < 1e-10) return false;
    s.normalize();
    // the right hand: thumb side × fingers = out of the palm
    n.crossVectors(s, f).normalize();
    return true;
  }
  const _f = V(),
    _n = V(),
    _s = V(),
    _q1 = Q(),
    _q2 = Q(),
    _t1 = V(),
    _t2 = V();
  // turn the hand: fingers along F, the palm toward N (both world, unit), by the share w
  function handTo(sv, B, F, N, w) {
    if (!handFrame(B, _f, _n, _s)) return false;
    _q1.setFromUnitVectors(_f, F);
    _t1.copy(_n).applyQuaternion(_q1);
    _t1.addScaledVector(F, -_t1.dot(F));
    _t2.copy(N).addScaledVector(F, -N.dot(F));
    if (_t1.lengthSq() > 1e-8 && _t2.lengthSq() > 1e-8) {
      _q2.setFromUnitVectors(_t1.normalize(), _t2.normalize());
      _q1.premultiply(_q2);
    }
    if (w < 1) _q1.slerp(QI, 1 - w);
    turnW(sv, B.RightHand, _q1);
    return true;
  }
  const _ax = Q();
  // fingers round the phone's edge: each joint about the thumb-side axis (+ curls toward the palm), the thumb over the screen
  function curl(sv, B, w, tap) {
    if (!handFrame(B, _f, _n, _s)) return;
    const ang = [0.55, 0.62, 0.5];
    for (const fi of ['Index', 'Middle', 'Ring', 'Pinky'])
      for (let j = 1; j <= 3; j++) {
        const b = B['RightHand' + fi + j];
        if (!b) continue;
        _ax.setFromAxisAngle(_s, ang[j - 1] * w * (fi === 'Index' ? 0.8 : 1));
        turnW(sv, b, _ax);
      }
    // the thumb: lies over the screen, presses down when the player taps
    const T1 = B.RightHandThumb1,
      T2 = B.RightHandThumb2,
      T3 = B.RightHandThumb3;
    if (T1 && T2 && T3) {
      T3.getWorldPosition(_t1);
      _t2
        .copy(_t1)
        .addScaledVector(_n, -(0.012 + 0.022 * tap) * w)
        .addScaledVector(_f, 0.01 * w);
      aim(sv, T1, _t1, _t2, 0.9);
    }
  }
  // ---------------- the phone in the hand ----------------
  function slab(w, h, r, seg) {
    const s = new THREE.Shape(),
      x = w / 2,
      y = h / 2;
    s.moveTo(-x + r, -y);
    s.lineTo(x - r, -y);
    s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r);
    s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y);
    s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r);
    s.quadraticCurveTo(-x, -y, -x + r, -y);
    return s;
  }
  const paint = (g, rgb) => {
    const n = g.attributes.position.count,
      c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set(rgb, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };
  function prop() {
    if (S.prop) return S.prop;
    // the frame: x across, y along the phone (its top), z out of the screen; 71.6 × 147.6 × 7.8 mm, the corners round
    const body = new THREE.ExtrudeGeometry(slab(0.0702, 0.1462, 0.0098), {
      depth: 0.0062,
      bevelEnabled: true,
      bevelThickness: 0.0008,
      bevelSize: 0.0007,
      bevelSegments: 2,
      curveSegments: 6,
    });
    body.translate(0, 0, -0.0031 - 0.0004);
    paint(body, [0.09, 0.095, 0.11]);
    const cam = new THREE.ExtrudeGeometry(slab(0.026, 0.03, 0.007), {
      depth: 0.0016,
      bevelEnabled: false,
      curveSegments: 4,
    });
    cam.translate(-0.0185, 0.052, -0.0058);
    paint(cam, [0.05, 0.05, 0.06]);
    const screen = new THREE.ShapeGeometry(slab(0.0676, 0.1436, 0.0088), 6);
    screen.translate(0, 0, 0.0039);
    paint(screen, [1, 1, 1]);
    const bm = VFIG.mat(),
      lit = VFIG.mat().clone();
    lit.color = new THREE.Color(0.02, 0.02, 0.025);
    lit.emissive = new THREE.Color(0.5, 0.6, 0.8);
    lit.emissiveIntensity = 1.15;
    lit.roughness = 0.18;
    lit.name = 'handy screen';
    const g = new THREE.Group(),
      parts = [new THREE.Mesh(body, bm), new THREE.Mesh(cam, bm), new THREE.Mesh(screen, lit)];
    for (const m of parts) {
      m.userData.noMerge = true;
      m.castShadow = false;
      m.frustumCulled = false;
      g.add(m);
    }
    g.matrixAutoUpdate = false;
    g.visible = false;
    g.name = 'handy prop';
    g.userData.noMerge = true;
    scene.add(g);
    S.prop = { g, lit };
    return S.prop;
  }
  const _px = V(),
    _py = V(),
    _pz = V(),
    _pp = V(),
    _pm = new THREE.Matrix4(),
    _col = new THREE.Color();
  // the phone in the palm: along the fingers a little turned toward the thumb, its screen to the face, in the palm's middle
  function placeProp(B, w) {
    const P = prop();
    if (!handFrame(B, _f, _n, _s)) return false;
    B.RightHand.getWorldPosition(_pp);
    _pp.addScaledVector(_f, 0.06).addScaledVector(_n, 0.021).addScaledVector(_s, 0.006);
    _pz.copy(_n);
    _py.copy(_f).addScaledVector(_s, 0.22).addScaledVector(_pz, -_f.dot(_pz)).normalize();
    _px.crossVectors(_py, _pz).normalize();
    _pm.makeBasis(_px, _py, _pz).setPosition(_pp);
    P.g.matrix.copy(_pm);
    P.g.matrixWorldNeedsUpdate = true;
    P.g.updateMatrixWorld(true);
    P.g.visible = w > 0.04;
    // the screen glows in the colour of what is open
    const H = HANDY.S;
    let c = '#6d8fd6';
    if (H.anruf) c = '#2f8f58';
    else if (H.sucher) c = '#6b7480';
    else if (H.app && H.apps[H.app] && H.apps[H.app].farbe) c = H.apps[H.app].farbe[0];
    else if (H.cfg && H.cfg.glanz) c = H.cfg.glanz;
    _col.set(c);
    P.lit.emissive.lerp(_col.multiplyScalar(0.75), 0.25);
    return true;
  }
  // ---------------- per frame, after the avatar's own pose ----------------
  const _r = V(),
    _u = V(0, 1, 0),
    _fw = V(),
    _hd = V(),
    _T = V(),
    _pole = V(),
    _F = V(),
    _N = V(),
    _e = V(),
    _qq = Q();
  function axes(g) {
    g.updateMatrixWorld(true);
    const e = g.matrixWorld.elements;
    _r.set(e[0], e[1], e[2]).normalize();
    _fw.set(-e[8], -e[9], -e[10]).normalize();
    _u.set(0, 1, 0);
  }
  function camEase(k) {
    if (!CAM3) return;
    if (k > 0.001) {
      if (S.camD0 == null) S.camD0 = CAM3.d;
      // the player turned the wheel meanwhile: their distance is the new one
      if (S.camSet != null && Math.abs(CAM3.d - S.camSet) > 0.02) S.camD0 = CAM3.d;
      const tgt = Math.min(S.camD0, 2.25);
      CAM3.d = S.camD0 + (tgt - S.camD0) * k;
      S.camSet = CAM3.d;
    } else if (S.camD0 != null) {
      if (S.camSet == null || Math.abs(CAM3.d - S.camSet) < 0.02) CAM3.d = S.camD0;
      S.camD0 = null;
      S.camSet = null;
    }
  }
  function frame(dt) {
    const H = HANDY.S,
      cfg = H.cfg,
      F = AVATAR.fig;
    const canHold = !!(cfg && cfg.halten && F && F.g && F.g.visible && F.B && !(VEH && VEH.cur));
    const want = canHold && (H.open || H.sucher || (H.anruf && H.anruf.st !== 'ende')) ? 1 : 0;
    // ~0.35 s in and out
    S.w = clamp(S.w + (want ? 1 : -1) * dt * 2.9, 0, 1);
    const art = H.anruf && H.anruf.st === 'aktiv' ? 'ohr' : H.sucher ? 'foto' : 'halten';
    S.art = art;
    for (const k of Object.keys(S.wa)) S.wa[k] = clamp(S.wa[k] + (k === art ? 1 : -1) * dt * 3.2, 0, 1);
    const w = smooth(S.w);
    camEase(canHold ? w : 0);
    if (!canHold || w <= 0.001) {
      if (S.prop) S.prop.g.visible = false;
      S.last = null;
      return;
    }
    const B = F.B,
      sv = F.sv;
    if (!B.RightArm || !B.RightForeArm || !B.RightHand || !B.Head) return;
    axes(F.g);
    B.Head.getWorldPosition(_hd);
    // where the wrist goes: in front of the chest (looking at it), at the ear (a call), before the eyes (the camera)
    const sh = S.wa.halten,
      so = S.wa.ohr,
      sf = S.wa.foto,
      sum = sh + so + sf || 1;
    _T.set(0, 0, 0);
    _T.addScaledVector(
      _e.copy(_hd).addScaledVector(_fw, 0.25).addScaledVector(_u, -0.37).addScaledVector(_r, 0.075),
      sh / sum
    );
    _T.addScaledVector(
      _e.copy(_hd).addScaledVector(_r, 0.105).addScaledVector(_u, -0.07).addScaledVector(_fw, 0.0),
      so / sum
    );
    _T.addScaledVector(
      _e.copy(_hd).addScaledVector(_fw, 0.36).addScaledVector(_u, -0.1).addScaledVector(_r, 0.06),
      sf / sum
    );
    // a breath of movement: the hand is not a statue
    const t = performance.now() / 1000;
    _T.addScaledVector(_u, Math.sin(t * 1.3) * 0.004).addScaledVector(_r, Math.sin(t * 0.9) * 0.003);
    _pole
      .copy(_u)
      .multiplyScalar(-1)
      .addScaledVector(_r, 0.55 + 0.4 * (so / sum))
      .addScaledVector(_fw, -0.25 + 0.4 * (so / sum));
    if (!ik2(sv, B.RightArm, B.RightForeArm, B.RightHand, _T, _pole, w)) return;
    // the hand: palm toward the eyes (the phone between), fingers up along the phone; at the ear the palm to the head
    _e.copy(_hd).addScaledVector(_u, 0.07).addScaledVector(_fw, 0.06);
    B.RightHand.getWorldPosition(_a);
    _N.subVectors(_e, _a)
      .normalize()
      .multiplyScalar(sh + sf)
      .addScaledVector(_r, -so);
    if (_N.lengthSq() < 1e-6) _N.copy(_fw).multiplyScalar(-1);
    _N.normalize();
    _F.copy(_fw)
      .multiplyScalar(0.8 * (sh + sf))
      .addScaledVector(_u, 0.45 * (sh + sf) + 0.7 * so)
      .addScaledVector(_r, -0.22 * (sh + sf))
      .addScaledVector(_fw, -0.65 * so);
    _F.addScaledVector(_N, -_F.dot(_N));
    if (_F.lengthSq() < 1e-6) _F.copy(_u);
    _F.normalize();
    handTo(sv, B, _F, _N, w);
    // the thumb presses when one taps (0.25 s), else rests over the screen
    const since = (performance.now() - (H.tipp || 0)) / 1000,
      tap = since < 0.25 ? Math.sin((since / 0.25) * Math.PI) : 0;
    curl(sv, B, w, tap);
    // the head looks down at it (not at the ear, not through the camera)
    const look = (w * (0.42 * sh + 0.06 * sf)) / sum;
    if (look > 0.001) {
      _qq.setFromAxisAngle(_r, -look * 0.45);
      if (B.Neck) turnW(sv, B.Neck, _qq);
      _qq.setFromAxisAngle(_r, -look * 0.6);
      turnW(sv, B.Head, _qq);
    }
    // the shoulders follow a little: the right one forward
    if (B.RightShoulder && sh > 0.2) {
      _qq.setFromAxisAngle(_u, 0.08 * w * sh);
      turnW(sv, B.RightShoulder, _qq);
    }
    placeProp(B, w);
    S.n++;
    if (S.n % 4 === 0) markDirty();
    S.last = { w: +w.toFixed(3), art };
  }
  KERN.tick(
    dt => {
      try {
        frame(dt);
      } catch (e) {
        if (!S.err) console.warn('handy pose', e);
        S.err = String((e && e.message) || e);
      }
    },
    'handy/pose',
    { late: true }
  );
  const arr3 = v => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
  // for the tests: the hand's, the head's and the chest's height over the feet, the phone in the hand
  function stand() {
    const F = AVATAR.fig,
      B = F && F.B;
    const o = {
      w: +S.w.toFixed(3),
      art: S.art,
      prop: !!(S.prop && S.prop.g.visible),
      cam: CAM3 ? +CAM3.d.toFixed(2) : null,
      err: S.err,
      n: S.n,
    };
    if (B && B.RightHand && B.Head && F.g) {
      const g = F.g.getWorldPosition(V()),
        h = B.RightHand.getWorldPosition(V()),
        k = B.Head.getWorldPosition(V()),
        c = (B.Spine2 || B.Spine1 || B.Spine || B.Hips).getWorldPosition(V());
      o.hand = arr3(h);
      o.kopf = arr3(k);
      o.brust = arr3(c);
      o.handH = +(h.y - g.y).toFixed(3);
      o.kopfH = +(k.y - g.y).toFixed(3);
      o.brustH = +(c.y - g.y).toFixed(3);
      o.handVorn = +h
        .clone()
        .sub(c)
        .dot(axes(F.g) || _fw)
        .toFixed(3);
      o.handKopf = +h.distanceTo(k).toFixed(3);
    }
    if (S.prop && S.prop.g.visible) o.propPos = arr3(V().setFromMatrixPosition(S.prop.g.matrixWorld));
    return o;
  }
  return { stand, S };
})();
window.HANDYPOSE = HANDYPOSE;
