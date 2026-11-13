// ===================== feat/grenzland-figuren: people who move like people – poses laid over the clips (GLPOSE) =====================
// Grenzland round 2 (13.11.2026, package B): in the review the riders sat on the moped in the avatar's chair pose (legs straight forward,
// hands in the lap), officers walked after a fleeing player, people in talks stood stiff. What the clips cannot do is posed here, bone
// by bone, after the clips of the frame: a two-bone IK for arms and legs, turns in the figure's own frame, a look that turns chest, neck
// and head, the run (the clip set's sprint laid over the walk), the small hand movements of a talker, gestures, sitting with the feet on
// the floor, and the riding pose – for the player on the moped (the avatar of the base game: after its own update and after the vehicles
// moved, VEH.after) and for the figures that ride (F.reitet). No base file is touched: every turn is kept in the rig's sv map (bone →
// quaternion before the turn; game/avatar.js and npc/npc_real.js use the same) and put back before the clips' next frame – the avatar
// does that itself for its F.sv, grenzland/gl_fig.js calls GLPOSE.back before rbPerson's anim.
//   GLPOSE.rig(B, model, g, sv) → R     a figure to pose: canonical bones (core/rig.js), the model (its frame: x the figure's left, y up,
//                                       z forward), the root group (x right, y up, -z forward), the turns kept
//   GLPOSE.back(R) · nach(F, R, dt, sp) the turns of the last frame back · what a figure of GLFIG does after its clips (run, sitting,
//                                       gesture, talking hands, look)
//   GLPOSE.ride(R, M, dt)               the riding pose on a moped M = moped(vehicle | GLAUTO car)
//   GLPOSE.ARTEN                        the gestures: { d: seconds (0: held), arms: which arms it takes }
//   GLPOSE.stand()                      for the tests: what was posed last (riders, the player, angles)
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { decodeClip } from '../core/rig.js';
import { boneTurn } from '../npc/npc_real.js';
import { P as PW } from '../game/walkable.js';
import { AVATAR } from '../game/avatar.js';
import { VEH } from '../vehicles/vehicle.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { GL } from './gl_state.js';
export const GLPOSE = (() => {
  const S = { n: 0, err: null, player: null, riders: 0, last: null, props: 0 };
  const V = () => new THREE.Vector3(),
    Q = () => new THREE.Quaternion();
  const clamp = THREE.MathUtils.clamp,
    smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)),
    QI = Q();
  // ------------------------------------------------------------------ the rig ------------------------------------------------------------------
  const _mq = Q();
  // what does not change: the face's forward in the head's own frame, how the foot points (ankle → ball) when it stands flat
  function measure(R) {
    const B = R.B;
    R.model.updateMatrixWorld(true);
    R.model.getWorldQuaternion(_mq).invert();
    if (B.Head) {
      const q = B.Head.getWorldQuaternion(Q()).premultiply(_mq);
      R.hf = new THREE.Vector3(0, 0, 1).applyQuaternion(q.invert());
    }
    for (const sd of ['Left', 'Right']) {
      const F = B[sd + 'Foot'],
        T = B[sd + 'ToeBase'];
      if (!F || !T) continue;
      const a = F.getWorldPosition(V()),
        b = T.getWorldPosition(V()),
        d = b.sub(a).applyQuaternion(_mq);
      // the angle under the horizontal of the line ankle → ball in the bind pose (the sole flat)
      R.footA = clamp(Math.atan2(-d.y, Math.hypot(d.x, d.z)), 0.1, 0.7);
      R.footL = d.length() * R.model.getWorldScale(V()).x;
    }
    if (R.footA == null) R.footA = 0.35;
    R.hipH = B.Hips ? B.Hips.getWorldPosition(V()).y - R.g.getWorldPosition(V()).y : 0.95;
  }
  function rig(B, model, g, sv) {
    const R = { B, model, g, sv: sv || new Map(), pv: new Map(), st: { n: 0, rn: -1 } };
    try {
      measure(R);
    } catch (e) {
      S.err = 'measure: ' + ((e && e.message) || e);
    }
    return R;
  }
  const keep = (R, b) => {
    if (!R.sv.has(b)) R.sv.set(b, b.quaternion.clone());
  };
  // the turns of the last frame back: before the clips' next frame (the mixer writes a bone only when its own value changes)
  function back(R) {
    if (!R) return;
    for (const [b, q] of R.sv) b.quaternion.copy(q);
    R.sv.clear();
    for (const [b, p] of R.pv) b.position.copy(p);
    R.pv.clear();
    R.st.n++;
  }
  // ------------------------------------------------------------------ turning bones ------------------------------------------------------------------
  const _pq = Q(),
    _tq = Q();
  // turn bone b by the world rotation q: its world orientation becomes q · before; the children follow
  function turnW(R, b, q) {
    if (!b || !b.parent) return;
    keep(R, b);
    b.parent.getWorldQuaternion(_pq);
    _tq.copy(_pq).invert().multiply(q).multiply(_pq);
    b.quaternion.premultiply(_tq).normalize();
    b.updateMatrixWorld(true);
  }
  const _aa = V(),
    _ab = V(),
    _ac = V(),
    _aq = Q();
  // turn bone b so that the line from it to the point c (world; where a descendant is now) points at T; w: how much of it
  function aim(R, b, c, T, w = 1) {
    if (!b || w <= 0) return;
    b.getWorldPosition(_aa);
    _ab.subVectors(c, _aa);
    _ac.subVectors(T, _aa);
    if (_ab.lengthSq() < 1e-12 || _ac.lengthSq() < 1e-12) return;
    _aq.setFromUnitVectors(_ab.normalize(), _ac.normalize());
    if (w < 1) _aq.slerp(QI, 1 - w);
    turnW(R, b, _aq);
  }
  const _ia = V(),
    _ib = V(),
    _ic = V(),
    _id = V(),
    _ie = V(),
    _ip = V(),
    _ik = V();
  // two bones A → B → C (thigh, shin, foot – or upper arm, forearm, hand): C's joint to T, the middle joint bent toward the direction
  // pole; w blends from where the end is now. Lengths are the rig's own; out of reach the limb points at T, straight.
  function ik2(R, A, Bn, C, T, pole, w = 1) {
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
    aim(R, A, _ib, _ik);
    Bn.getWorldPosition(_ib);
    C.getWorldPosition(_ic);
    _ie.copy(_ia).addScaledVector(_id, d);
    aim(R, Bn, _ic, _ie);
    return true;
  }
  const _f1 = V(),
    _f2 = V(),
    _f3 = V(),
    _bm = new THREE.Matrix4(),
    _qa = Q(),
    _qb = Q(),
    _qc = Q();
  function basisQ(f, u, out) {
    _f1.copy(f).normalize();
    _f2.copy(u).addScaledVector(_f1, -u.dot(_f1));
    if (_f2.lengthSq() < 1e-10) _f2.set(_f1.y, -_f1.x, 0.3);
    _f2.normalize();
    _f3.crossVectors(_f1, _f2);
    _bm.makeBasis(_f1, _f2, _f3);
    return out.setFromRotationMatrix(_bm);
  }
  // the world rotation that takes the frame (f0 along, u0 up) onto (f1, u1)
  function frameQ(f0, u0, f1, u1, out) {
    basisQ(f0, u0, _qa);
    basisQ(f1, u1, _qb);
    return out.copy(_qb).multiply(_qa.invert());
  }
  // the root's axes in the world: right, up, forward (the root group: x right, y up, -z forward)
  function axes(o, r, u, f) {
    o.getWorldQuaternion(_qc);
    r.set(1, 0, 0).applyQuaternion(_qc);
    u.set(0, 1, 0).applyQuaternion(_qc);
    f.set(0, 0, -1).applyQuaternion(_qc);
  }
  // ------------------------------------------------------------------ hands ------------------------------------------------------------------
  const _h0 = V(),
    _h1 = V(),
    _hf = V(),
    _ht = V(),
    _hb = V(),
    _hx = V(),
    _hq = Q();
  // the hand's axes now: the fingers' way f, toward the thumb t, the back of the hand bk (palm down, fingers forward: bk up)
  function handAxes(R, sd, f, t, bk) {
    const B = R.B,
      H = B[sd + 'Hand'];
    if (!H) return false;
    H.getWorldPosition(_h0);
    const M = B[sd + 'HandMiddle1'] || B[sd + 'HandIndex1'],
      I = B[sd + 'HandIndex1'],
      P = B[sd + 'HandPinky1'] || B[sd + 'HandRing1'];
    if (M) M.getWorldPosition(f).sub(_h0);
    else if (B[sd + 'ForeArm']) f.copy(_h0).sub(B[sd + 'ForeArm'].getWorldPosition(_h1));
    else return false;
    if (I && P && I !== P) {
      I.getWorldPosition(t);
      P.getWorldPosition(_h1);
      t.sub(_h1);
    } else return false;
    f.normalize();
    t.addScaledVector(f, -t.dot(f)).normalize();
    bk.crossVectors(f, t).multiplyScalar(sd === 'Right' ? 1 : -1);
    return true;
  }
  // turn the hand so that its fingers point along f1 and its back along b1 (w: how much)
  function handTo(R, sd, f1, b1, w = 1) {
    const H = R.B[sd + 'Hand'];
    if (!H || w <= 0 || !handAxes(R, sd, _hf, _ht, _hb)) return;
    frameQ(_hf, _hb, f1, b1, _hq);
    if (w < 1) _hq.slerp(QI, 1 - w);
    turnW(R, H, _hq);
  }
  const FINGER = ['Index', 'Middle', 'Ring', 'Pinky'];
  // the fingers bent toward the palm: k = [first, second, third segment] in radians (point: the index stays straight), thumb kt
  function curl(R, sd, k, kt, w = 1, point = false) {
    const B = R.B;
    if (w <= 0 || !handAxes(R, sd, _hf, _ht, _hb)) return;
    // the axis about which a turn takes the fingers toward the palm (−bk)
    _hx.crossVectors(_hb, _hf).normalize();
    for (const n of FINGER) {
      if (point && n === 'Index') continue;
      for (let i = 0; i < 3; i++) {
        const b = B[sd + 'Hand' + n + (i + 1)];
        if (b) turnW(R, b, _hq.setFromAxisAngle(_hx, k[i] * w));
      }
    }
    if (kt)
      for (let i = 0; i < 3; i++) {
        const b = B[sd + 'HandThumb' + (i + 1)];
        if (b) turnW(R, b, _hq.setFromAxisAngle(_hx, kt * w * (i ? 0.8 : 0.4)));
      }
  }
  // ------------------------------------------------------------------ the riding pose ------------------------------------------------------------------
  // The moped's own points (x right, y forward, z up; metres; grenzland/gl_zweirad.js): the hip joint over the saddle, the ball of the
  // foot on the peg (S 51) or the foot board (Schwalbe), the wrist just behind the grip (relative to the steering head: it turns with the
  // handlebar – the cockpit's own hands of the S 51 sit there), the left foot on the ground at a stop.
  const MOPED = {
    s51: {
      hip: [0, -0.38, 0.885],
      ball: [0.205, -0.07, 0.335],
      wrist: [0.262, -0.116, 0.132],
      down: [-0.37, -0.16, 0.03],
    },
    schwalbe: {
      hip: [0, -0.36, 0.905],
      ball: [0.16, 0.08, 0.35],
      wrist: [0.25, -0.12, 0.19],
      down: [-0.39, -0.12, 0.03],
      flat: true,
    },
  };
  const v3 = (p, o) => o.set(p[0], p[2], -p[1]); // the vehicle's frame → three's (as grenzland/gl_modelle.js)
  // a moped to ride: { root (its group, updated before reading), frame (the leaning body), steer (the handlebar), typ, v (m/s) }
  function moped(x) {
    if (!x) return null;
    if (x.model && x.model.body && x.model.cockpit)
      return {
        root: x.g || x.model.g,
        frame: x.model.body,
        steer: x.model.cockpit.steer,
        typ: 's51',
        v: Math.abs((x.st && x.st.u) || 0),
      };
    if (x.tilt && x.mod && x.mod.steer && x.T && x.T.form === 'moped')
      return {
        root: x.g,
        frame: x.tilt,
        steer: x.mod.steer,
        typ: x.typ === 'schwalbe' ? 'schwalbe' : 's51',
        v: Math.abs(x.v || 0),
      };
    return null;
  }
  const _r = V(),
    _u = V(),
    _f = V(),
    _rq = Q(),
    _rh = V(),
    _rt = V(),
    _rs = V(),
    _rg = V(),
    _w1 = V(),
    _w2 = V(),
    _w3 = V(),
    _pole = V(),
    _ball = V(),
    _ank = V(),
    _fd = V(),
    _gl = [V(), V()],
    _sh = [V(), V()],
    _lo = V(),
    _mi = new THREE.Matrix4();
  // the rider R on the moped M: placed on the saddle (turned and leaning with it), bent forward as far as the arms need, feet on the
  // pegs (at a stop the left one on the ground), hands round the grips, head up
  function ride(R, M, dt = 0.016) {
    const B = R.B,
      P = MOPED[M.typ] || MOPED.s51,
      st = R.st;
    if (!B.Hips || !M.frame || !M.steer) return false;
    M.root.updateMatrixWorld(true);
    const Fw = M.frame.matrixWorld;
    _mi.copy(Fw).invert();
    // 1. on the saddle, turned and leaning with the moped
    M.frame.getWorldQuaternion(_rq);
    R.g.quaternion.copy(_rq);
    R.g.updateMatrixWorld(true);
    B.Hips.getWorldPosition(_rh);
    v3(P.hip, _rt).applyMatrix4(Fw);
    R.g.position.add(_rt.sub(_rh));
    R.g.updateMatrixWorld(true);
    axes(M.frame, _r, _u, _f);
    // 2. how far forward: the shoulders as far from the grips as nine tenths of the arm (a little bend in the elbows)
    let L = 0;
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1;
      M.steer.localToWorld(v3([s * P.wrist[0], P.wrist[1], P.wrist[2]], _gl[i]));
      const A = B[sd + 'Arm'],
        Fa = B[sd + 'ForeArm'],
        H = B[sd + 'Hand'];
      if (A && Fa && H) {
        A.getWorldPosition(_sh[i]);
        L += A.getWorldPosition(_w1).distanceTo(Fa.getWorldPosition(_w2)) + _w2.distanceTo(H.getWorldPosition(_w3));
      } else _sh[i].copy(_rt);
    }
    L = L / 2 || 0.55;
    // in the moped's frame (three's axes: x right, y up, -z forward); the lean turns the shoulders about the hips
    const hipL = v3(P.hip, _w1),
      want = 0.93 * L;
    let best = 0.2,
      bestE = 1e9;
    for (let th = 0.04; th <= 0.5; th += 0.03) {
      let e = 0;
      for (let i = 0; i < 2; i++) {
        _w2.copy(_sh[i]).applyMatrix4(_mi).sub(hipL);
        const y = _w2.y * Math.cos(th) + _w2.z * Math.sin(th),
          z = -_w2.y * Math.sin(th) + _w2.z * Math.cos(th);
        _w3.set(_w2.x, y, z).add(hipL);
        _w2.copy(_gl[i]).applyMatrix4(_mi);
        e += Math.abs(_w3.distanceTo(_w2) - want);
      }
      if (e < bestE - 1e-4) {
        bestE = e;
        best = th;
      }
    }
    st.lean = st.lean == null ? best : st.lean + (best - st.lean) * Math.min(1, dt * 5);
    const th = st.lean,
      Qi = R.model.getWorldQuaternion(_mq).invert();
    boneTurn(R.sv, Qi, B.Spine, 1, 0, 0, th * 0.45);
    boneTurn(R.sv, Qi, B.Spine1 || B.Spine2, 1, 0, 0, th * 0.3);
    boneTurn(R.sv, Qi, B.Spine2 && B.Spine1 ? B.Spine2 : null, 1, 0, 0, th * 0.25);
    // the shoulders come forward toward the bar, the head up to the road
    boneTurn(R.sv, Qi, B.LeftShoulder, 0, 1, 0, -0.12);
    boneTurn(R.sv, Qi, B.RightShoulder, 0, 1, 0, 0.12);
    boneTurn(R.sv, Qi, B.Neck, 1, 0, 0, -th * 0.45);
    boneTurn(R.sv, Qi, B.Head, 1, 0, 0, -th * 0.5 + 0.06);
    // 3. the feet: on the pegs; at a stop the left one goes down to the ground (eased, the foot lifted on its way)
    const stop = M.v < 0.7 ? 1 : 0;
    st.down = st.down == null ? stop : st.down + (stop - st.down) * Math.min(1, dt * 3.2);
    const kd = smooth(st.down);
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1,
        UL = B[sd + 'UpLeg'],
        LL = B[sd + 'Leg'],
        Ft = B[sd + 'Foot'],
        Tb = B[sd + 'ToeBase'];
      if (!UL || !LL || !Ft) continue;
      v3([s * P.ball[0], P.ball[1], P.ball[2]], _ball).applyMatrix4(Fw);
      let pitch = P.flat ? R.footA : R.footA + 0.22;
      if (!i && kd > 0.001) {
        v3(P.down, _rg).applyMatrix4(Fw);
        const gz = KERN.ground(_rg.x, -_rg.z, _rg.y + 0.5);
        if (Number.isFinite(gz) && Math.abs(gz - _rg.y) < 0.6) _rg.y = gz + 0.03;
        _ball.lerp(_rg, kd).addScaledVector(_u, 0.09 * Math.sin(Math.PI * kd));
        pitch += (R.footA - pitch) * kd;
      }
      // the foot's way: forward along the moped, a little out, the toes down by pitch
      _fd
        .copy(_f)
        .multiplyScalar(Math.cos(pitch))
        .addScaledVector(_u, -Math.sin(pitch))
        .addScaledVector(_r, s * 0.12)
        .normalize();
      const fl = R.footL || 0.14;
      _ank.copy(_ball).addScaledVector(_fd, -fl);
      _pole
        .copy(_f)
        .addScaledVector(_r, s * 0.3)
        .addScaledVector(_u, 0.25);
      ik2(R, UL, LL, Ft, _ank, _pole);
      if (Tb) aim(R, Ft, Tb.getWorldPosition(_w1), _ball);
    }
    // 4. the hands round the grips: the elbows out and down a little, the fingers over the grip
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1;
      _pole
        .copy(_r)
        .multiplyScalar(s * 0.75)
        .addScaledVector(_u, -0.55)
        .addScaledVector(_f, -0.35);
      ik2(R, B[sd + 'Arm'], B[sd + 'ForeArm'], B[sd + 'Hand'], _gl[i], _pole);
      _w1
        .copy(_f)
        .multiplyScalar(0.78)
        .addScaledVector(_u, -0.55)
        .addScaledVector(_r, -s * 0.12);
      _w2
        .copy(_u)
        .multiplyScalar(0.8)
        .addScaledVector(_f, 0.5)
        .addScaledVector(_r, s * 0.1);
      handTo(R, sd, _w1, _w2);
      curl(R, sd, [1.05, 1.0, 0.55], 0.9);
    }
    // what came of it (the tests read it): the hip joint's height over the moped's ground, how far the balls of the feet are from the
    // pegs (or the ground) and the wrists from the grips
    const chk = { lean: +th.toFixed(3), down: +kd.toFixed(2), hip: 0, feet: [0, 0], hands: [0, 0] };
    B.Hips.getWorldPosition(_w1).applyMatrix4(_mi);
    chk.hip = +_w1.y.toFixed(3);
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1,
        Tb = B[sd + 'ToeBase'],
        H = B[sd + 'Hand'];
      if (Tb) {
        v3([s * P.ball[0], P.ball[1], P.ball[2]], _ball).applyMatrix4(Fw);
        if (!i && kd > 0.5) v3(P.down, _ball).applyMatrix4(Fw);
        chk.feet[i] = +Tb.getWorldPosition(_w2).distanceTo(_ball).toFixed(3);
      }
      if (H) chk.hands[i] = +H.getWorldPosition(_w2).distanceTo(_gl[i]).toFixed(3);
    }
    st.chk = chk;
    S.last = chk;
    return true;
  }
  // ------------------------------------------------------------------ at the Trabant's wheel ------------------------------------------------------------------
  // The player driving the Trabant of 1989, seen from outside through the windows: on the driver's seat of this frame's car (the avatar
  // places itself by last frame's eyes – and by the eyes of the view from outside, higher and further forward than the seat), the hands
  // at ten and two on the rim; they go with the wheel for a part of a turn, as the cockpit's own hands (grenzland/gl_modelle.js).
  const TRABI = { hip: [-0.33, -0.45, 0.4], wrist: [0.185, 0.07, 0.07] };
  function drive(R, v) {
    const B = R.B,
      ck = v.model && v.model.cockpit,
      Hg = ck && ck.hands,
      body = v.model && v.model.body;
    if (!B.Hips || !Hg || !body) return false;
    v.g.updateMatrixWorld(true);
    body.getWorldQuaternion(_rq);
    R.g.quaternion.copy(_rq);
    R.g.updateMatrixWorld(true);
    B.Hips.getWorldPosition(_rh);
    v3(TRABI.hip, _rt).applyMatrix4(body.matrixWorld);
    R.g.position.add(_rt.sub(_rh));
    R.g.updateMatrixWorld(true);
    axes(body, _r, _u, _f);
    const chk = { hands: [0, 0] };
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1;
      Hg.localToWorld(_gl[i].set(s * TRABI.wrist[0], TRABI.wrist[1], TRABI.wrist[2]));
      _pole
        .copy(_r)
        .multiplyScalar(s * 0.6)
        .addScaledVector(_u, -0.8)
        .addScaledVector(_f, -0.2);
      ik2(R, B[sd + 'Arm'], B[sd + 'ForeArm'], B[sd + 'Hand'], _gl[i], _pole);
      // the fingers forward over the rim and inward, the back of the hand out
      _w1
        .copy(_f)
        .multiplyScalar(0.6)
        .addScaledVector(_u, 0.45)
        .addScaledVector(_r, -s * 0.45);
      _w2
        .copy(_r)
        .multiplyScalar(s * 0.8)
        .addScaledVector(_u, 0.35)
        .addScaledVector(_f, -0.2);
      handTo(R, sd, _w1, _w2);
      curl(R, sd, [1.0, 0.9, 0.6], 0.7);
      if (B[sd + 'Hand']) chk.hands[i] = +B[sd + 'Hand'].getWorldPosition(_w2).distanceTo(_gl[i]).toFixed(3);
    }
    R.st.chk = chk;
    return true;
  }
  // ------------------------------------------------------------------ the player on the moped ------------------------------------------------------------------
  // The avatar of the base game sits in the vehicle's seat in its chair clip (game/avatar.js, a late tick: the vehicles move after it in
  // window.TICKS – so the figure is placed here again, on this frame's moped). Its own sv map takes the turns: the avatar puts them back
  // before its next mixer step.
  function playerRide(dt) {
    const v = VEH.cur,
      AF = AVATAR.fig;
    const on = !!(
      GL.on &&
      v &&
      (v.id === 'gl-moped' || v.id === 'gl-trabi') &&
      AF &&
      AF.g &&
      AF.g.visible &&
      AF.B &&
      v.model &&
      v.model.body
    );
    if (!on) {
      if (S.player) {
        // off the moped: upright again (the avatar sets only the turn about the vertical)
        const F0 = S.player.F;
        if (F0 && F0.g) {
          F0.g.rotation.x = 0;
          F0.g.rotation.z = 0;
        }
        if (S.player.R) back(S.player.R);
        S.player = null;
      }
      return;
    }
    if (!S.player || S.player.F !== AF) S.player = { F: AF, R: rig(AF.B, AF.model, AF.g, AF.sv), n: 0 };
    const R = S.player.R;
    R.sv = AF.sv;
    // whatever is still turned (a frame the avatar did not pose) back first: the turns below are computed from the clip's pose
    back(R);
    if (v.id === 'gl-trabi' ? drive(R, v) : ride(R, moped(v), dt)) S.player.n++;
  }
  // ------------------------------------------------------------------ the figures that ride ------------------------------------------------------------------
  // grenzland/gl_mission.js puts a rider on his moped (F.reitet: hung behind it, upright); here, after the vehicles of the frame, he sits
  // on it like a rider. His moped: F.ritt (GLFIG.reite) or the nearest moped of the mode under him.
  function mopedOf(F) {
    const A = window.GLAUTO;
    if (F.ritt && !F.ritt.gone && F.ritt.g && Math.hypot(F.ritt.x - F.x, F.ritt.y - F.y) < 2.5) return F.ritt;
    let best = null,
      bd = 1.4;
    for (const c of (A && A.cars) || []) {
      if (!c.T || c.T.form !== 'moped' || c.gone) continue;
      const d = Math.hypot(c.x - F.x, c.y - F.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    F.ritt = best;
    return best;
  }
  function ridersTick(dt) {
    const G = window.GLFIG;
    let n = 0;
    if (G && G.figs)
      for (const F of G.figs) {
        if (!F.reitet || !F.rig || !F.g.visible || F.gone) continue;
        const R = F.rig;
        // once per pose of the clips (gl_fig.js puts the turns back before each)
        if (R.st.rn === R.st.n) continue;
        const c = mopedOf(F),
          M = c && moped(c);
        if (!M) continue;
        if (ride(R, M, dt)) {
          R.st.rn = R.st.n;
          n++;
          // where he is now (the radar, the witnesses): with the moped
          F.x = F.g.position.x;
          F.y = -F.g.position.z;
          F.z = F.g.position.y;
          if (Number.isFinite(c.hd)) F.hd = c.hd;
        }
      }
    S.riders = n;
  }
  if (VEH && Array.isArray(VEH.after))
    VEH.after.push(dt => {
      if (!GL.on) return;
      try {
        playerRide(dt);
        ridersTick(dt);
      } catch (e) {
        if (!S.err) console.warn('grenzland pose ride', e);
        S.err = 'ride: ' + ((e && e.message) || e);
      }
    });
  // ------------------------------------------------------------------ the run ------------------------------------------------------------------
  // the clip set's sprint, decoded once per set, sampled by interpolants and laid over rbPerson's walk (slerp by the run's weight)
  const RUN = new WeakMap();
  function runClip(set) {
    if (!set || !set.clips || !set.clips.sprint) return null;
    let C = RUN.get(set);
    if (C) return C;
    const clip = decodeClip(set.clips.sprint);
    C = {
      d: clip.duration,
      speed: set.clips.sprint.speed || 5.5,
      hip: (set.meta && set.meta.restHip) || 0.9,
      tracks: clip.tracks.map(tr => ({
        bone: tr.name.split('.')[0],
        pos: tr.name.endsWith('.position'),
        ip: tr.createInterpolant(),
      })),
    };
    RUN.set(set, C);
    return C;
  }
  const _rv = V(),
    _rqq = Q();
  function lauf(R, C, t, w) {
    if (!R.runB || R.runC !== C) {
      R.runC = C;
      R.runB = C.tracks.map(tr => R.model.getObjectByName(tr.bone) || null);
    }
    const tt = ((t % C.d) + C.d) % C.d;
    for (let i = 0; i < C.tracks.length; i++) {
      const b = R.runB[i],
        tr = C.tracks[i];
      if (!b) continue;
      const r = tr.ip.evaluate(tt);
      if (tr.pos) {
        if (!R.pv.has(b)) R.pv.set(b, b.position.clone());
        b.position.lerp(_rv.set(r[0], r[1], r[2]), w);
      } else {
        keep(R, b);
        b.quaternion.slerp(_rqq.set(r[0], r[1], r[2], r[3]).normalize(), w);
      }
    }
    R.model.updateMatrixWorld(true);
  }
  // ------------------------------------------------------------------ sitting ------------------------------------------------------------------
  // rbPerson's chair pose (thighs forward, knees bent) – the feet onto the floor in front of the seat, or onto a bar stool's rung
  const _sa = V(),
    _sb = V(),
    _sc = V();
  function sitzBeine(R, boden, hoch, w = 1, speak = false) {
    const B = R.B;
    axes(R.g, _r, _u, _f);
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1,
        UL = B[sd + 'UpLeg'],
        LL = B[sd + 'Leg'],
        Ft = B[sd + 'Foot'],
        Tb = B[sd + 'ToeBase'];
      if (!UL || !LL || !Ft) continue;
      UL.getWorldPosition(_sa);
      // the ball of the foot: on the floor a little in front of the knee, or on the rung of a high seat
      const z = hoch ? _sa.y - 0.5 : boden + 0.03;
      _sb
        .copy(_sa)
        .addScaledVector(_f, hoch ? 0.3 : 0.52)
        .addScaledVector(_r, s * 0.06);
      _sb.y = z;
      _fd.copy(_f).multiplyScalar(Math.cos(R.footA)).addScaledVector(_u, -Math.sin(R.footA)).normalize();
      _sc.copy(_sb).addScaledVector(_fd, -(R.footL || 0.14));
      _pole
        .copy(_f)
        .addScaledVector(_u, 0.4)
        .addScaledVector(_r, s * 0.12);
      ik2(R, UL, LL, Ft, _sc, _pole, w);
      if (Tb) aim(R, Ft, Tb.getWorldPosition(_w1), _sb, w);
    }
    // the hands on the thighs, a little behind the knees (the right one stays free while the chair pose talks)
    for (let i = 0; i < 2; i++) {
      const sd = i ? 'Right' : 'Left',
        s = i ? 1 : -1,
        UL = B[sd + 'UpLeg'],
        LL = B[sd + 'Leg'];
      if (!UL || !LL || (i && speak)) continue;
      UL.getWorldPosition(_sa);
      LL.getWorldPosition(_sb);
      _sc
        .copy(_sb)
        .lerp(_sa, 0.38)
        .addScaledVector(_u, 0.085)
        .addScaledVector(_r, s * 0.02);
      _pole
        .copy(_r)
        .multiplyScalar(s * 0.7)
        .addScaledVector(_f, -0.6)
        .addScaledVector(_u, -0.3);
      ik2(R, B[sd + 'Arm'], B[sd + 'ForeArm'], B[sd + 'Hand'], _sc, _pole, w);
      _w1
        .copy(_f)
        .multiplyScalar(0.85)
        .addScaledVector(_u, -0.45)
        .addScaledVector(_r, -s * 0.15);
      _w2.copy(_u).addScaledVector(_f, 0.3);
      handTo(R, sd, _w1, _w2, w);
      curl(R, sd, [0.35, 0.3, 0.2], 0.2, w);
    }
  }
  // ------------------------------------------------------------------ the look ------------------------------------------------------------------
  const _lh = V(),
    _lt = V(),
    _lf = V(),
    _lq = Q();
  const wrap = a => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  // chest, neck and head toward the point p (world) – within what a body does without turning: 1.35 rad to the side, a little up and
  // down – eased by the look's own angles L.yaw, L.pitch (relative to the body); w: how much
  function blick(R, L, p, dt, w) {
    const B = R.B,
      H = B.Head;
    if (!H || !R.hf || w <= 0.001) return;
    const Qi = R.model.getWorldQuaternion(_mq).invert();
    H.getWorldPosition(_lh);
    H.getWorldQuaternion(_lq).premultiply(Qi);
    _lf.copy(R.hf).applyQuaternion(_lq);
    _lt.subVectors(p, _lh).applyQuaternion(Qi);
    const yawNow = Math.atan2(_lf.x, _lf.z),
      pitchNow = Math.atan2(-_lf.y, Math.hypot(_lf.x, _lf.z));
    // the body's own forward is z; what lies behind is looked at over the shoulder, as far as it goes
    const yawT = clamp(Math.atan2(_lt.x, _lt.z), -1.35, 1.35),
      pitchT = clamp(Math.atan2(-_lt.y, Math.hypot(_lt.x, _lt.z)), -0.45, 0.55);
    if (L.yaw == null) {
      L.yaw = yawNow;
      L.pitch = pitchNow;
    }
    const k = Math.min(1, dt * 7);
    L.yaw += wrap(yawT - L.yaw) * k;
    L.pitch += (pitchT - L.pitch) * k;
    const dy = wrap(L.yaw - yawNow) * w,
      dp = (L.pitch - pitchNow) * w;
    boneTurn(R.sv, Qi, B.Spine2 || B.Spine1, 0, 1, 0, dy * 0.22);
    boneTurn(R.sv, Qi, B.Neck, 0, 1, 0, dy * 0.33);
    boneTurn(R.sv, Qi, H, 0, 1, 0, dy * 0.45);
    boneTurn(R.sv, Qi, B.Neck, 1, 0, 0, dp * 0.4);
    boneTurn(R.sv, Qi, H, 1, 0, 0, dp * 0.6);
    L.ang = Math.hypot(wrap(yawT - (yawNow + dy)), pitchT - (pitchNow + dp));
  }
  // ------------------------------------------------------------------ gestures ------------------------------------------------------------------
  // d: how long (s; 0 = held until GLFIG.geste(F, null)), arms: which arms it takes (the talking hands leave them alone)
  const ARTEN = {
    zeigen: { d: 2.6, arms: 'R' },
    nicken: { d: 1.1, arms: '' },
    kopf: { d: 1.4, arms: '' },
    achsel: { d: 1.6, arms: 'LR' },
    arme: { d: 0, arms: 'LR' },
    winken: { d: 2.4, arms: 'R' },
    telefon: { d: 0, arms: 'R', handy: true },
    filmen: { d: 0, arms: 'LR', handy: true },
    haende: { d: 0, arms: 'LR' },
    abwinken: { d: 1.2, arms: 'R' },
  };
  const _gs = [V(), V()],
    _gh = V(),
    _gt = V(),
    _gt2 = V(),
    _gd = V();
  // one gesture G = { art, t, w, ziel: world Vector3 | null } at its time t with weight w
  function geste(R, G) {
    const B = R.B,
      w = G.w,
      t = G.t;
    if (w <= 0.001) return;
    axes(R.g, _r, _u, _f);
    const Qi = R.model.getWorldQuaternion(_mq).invert();
    for (let i = 0; i < 2; i++) {
      const A = B[i ? 'RightArm' : 'LeftArm'];
      if (A) A.getWorldPosition(_gs[i]);
      else R.g.getWorldPosition(_gs[i]).addScaledVector(_u, 1.4);
    }
    if (B.Head) B.Head.getWorldPosition(_gh);
    else _gh.copy(_gs[0]).add(_gs[1]).multiplyScalar(0.5).addScaledVector(_u, 0.2);
    const arm = (sd, T, pole, f1, b1) => {
      ik2(R, B[sd + 'Arm'], B[sd + 'ForeArm'], B[sd + 'Hand'], T, pole, w);
      if (f1) handTo(R, sd, f1, b1, w);
    };
    const env = d => smooth(Math.min(t / 0.2, (d - t) / 0.25, 1));
    switch (G.art) {
      case 'nicken': {
        const a = 0.1 * (1 - Math.cos((2 * Math.PI * Math.min(t, 1.1)) / 0.55)) * w;
        boneTurn(R.sv, Qi, B.Neck, 1, 0, 0, a * 0.4);
        boneTurn(R.sv, Qi, B.Head, 1, 0, 0, a * 0.6);
        break;
      }
      case 'kopf': {
        const a = 0.34 * Math.sin((2 * Math.PI * t) / 0.46) * env(1.4) * w;
        boneTurn(R.sv, Qi, B.Neck, 0, 1, 0, a * 0.35);
        boneTurn(R.sv, Qi, B.Head, 0, 1, 0, a * 0.65);
        boneTurn(R.sv, Qi, B.Head, 1, 0, 0, 0.06 * w);
        break;
      }
      case 'achsel': {
        boneTurn(R.sv, Qi, B.LeftShoulder, 0, 0, 1, 0.2 * w);
        boneTurn(R.sv, Qi, B.RightShoulder, 0, 0, 1, -0.2 * w);
        boneTurn(R.sv, Qi, B.Head, 0, 0, 1, 0.1 * w);
        for (let i = 0; i < 2; i++) {
          const sd = i ? 'Right' : 'Left',
            s = i ? 1 : -1;
          _gt
            .copy(_gs[i])
            .addScaledVector(_r, s * 0.24)
            .addScaledVector(_u, -0.42)
            .addScaledVector(_f, 0.24);
          _pole
            .copy(_u)
            .multiplyScalar(-1)
            .addScaledVector(_f, -0.5)
            .addScaledVector(_r, s * 0.4);
          _w1
            .copy(_f)
            .multiplyScalar(0.7)
            .addScaledVector(_r, s * 0.6);
          _w2.copy(_u).multiplyScalar(-1);
          arm(sd, _gt, _pole, _w1, _w2);
        }
        break;
      }
      case 'arme': {
        _gt2.copy(_gs[0]).add(_gs[1]).multiplyScalar(0.5).addScaledVector(_u, -0.22).addScaledVector(_f, 0.2);
        for (let i = 0; i < 2; i++) {
          const sd = i ? 'Right' : 'Left',
            s = i ? 1 : -1;
          _gt
            .copy(_gt2)
            .addScaledVector(_r, -s * 0.12)
            .addScaledVector(_u, i ? -0.035 : 0)
            .addScaledVector(_f, i ? 0.035 : 0);
          _pole
            .copy(_u)
            .multiplyScalar(-0.7)
            .addScaledVector(_r, s * 0.8)
            .addScaledVector(_f, -0.2);
          _w1.copy(_r).multiplyScalar(-s).addScaledVector(_u, 0.25);
          _w2.copy(_f);
          arm(sd, _gt, _pole, _w1, _w2);
          curl(R, sd, [0.5, 0.4, 0.3], 0.2, w);
        }
        break;
      }
      case 'winken': {
        const e = env(2.4);
        _gt
          .copy(_gs[1])
          .addScaledVector(_r, 0.3 + 0.1 * Math.sin(2 * Math.PI * 1.7 * t) * e)
          .addScaledVector(_u, 0.24)
          .addScaledVector(_f, 0.14);
        _pole.copy(_r).multiplyScalar(0.6).addScaledVector(_u, -1);
        _w1.copy(_u);
        _w2.copy(_f).multiplyScalar(-1);
        arm('Right', _gt, _pole, _w1, _w2);
        break;
      }
      case 'haende': {
        for (let i = 0; i < 2; i++) {
          const sd = i ? 'Right' : 'Left',
            s = i ? 1 : -1;
          _gt
            .copy(_gs[i])
            .addScaledVector(_r, s * 0.2)
            .addScaledVector(_u, 0.48)
            .addScaledVector(_f, 0.08);
          _pole.copy(_r).multiplyScalar(s).addScaledVector(_u, -0.6);
          _w1.copy(_u);
          _w2.copy(_f).multiplyScalar(-1);
          arm(sd, _gt, _pole, _w1, _w2);
        }
        break;
      }
      case 'telefon': {
        _gt.copy(_gh).addScaledVector(_r, 0.105).addScaledVector(_u, -0.06).addScaledVector(_f, -0.015);
        _pole.copy(_u).multiplyScalar(-1).addScaledVector(_r, 0.55).addScaledVector(_f, 0.45);
        _w1.copy(_u).addScaledVector(_f, -0.1);
        _w2.copy(_r);
        arm('Right', _gt, _pole, _w1, _w2);
        curl(R, 'Right', [0.45, 0.35, 0.25], 0.3, w);
        break;
      }
      case 'filmen': {
        _gt2.copy(_gh).addScaledVector(_u, -0.16).addScaledVector(_f, 0.4);
        _gt.copy(_gt2).addScaledVector(_r, 0.045);
        _pole.copy(_u).multiplyScalar(-1).addScaledVector(_r, 0.6);
        _w1.copy(_u);
        _w2.copy(_f);
        arm('Right', _gt, _pole, _w1, _w2);
        _gt.copy(_gt2).addScaledVector(_r, -0.06).addScaledVector(_u, -0.03);
        _pole.copy(_u).multiplyScalar(-1).addScaledVector(_r, -0.6);
        arm('Left', _gt, _pole, _w1, _w2);
        curl(R, 'Right', [0.35, 0.3, 0.2], 0.2, w);
        curl(R, 'Left', [0.35, 0.3, 0.2], 0.2, w);
        break;
      }
      case 'abwinken': {
        const e = 0.5 - 0.5 * Math.cos(2 * Math.PI * 2 * Math.min(1, t / 1.2));
        _gt
          .copy(_gs[1])
          .addScaledVector(_r, 0.06 + 0.3 * e)
          .addScaledVector(_u, -0.3 - 0.06 * e)
          .addScaledVector(_f, 0.3 - 0.1 * e);
        _pole.copy(_u).multiplyScalar(-1).addScaledVector(_r, 0.5);
        _w1.copy(_f).addScaledVector(_r, 0.4 * e);
        _w2
          .copy(_u)
          .multiplyScalar(1 - e)
          .addScaledVector(_r, e);
        arm('Right', _gt, _pole, _w1, _w2);
        boneTurn(R.sv, Qi, B.Head, 0, 1, 0, 0.22 * w);
        break;
      }
      case 'zeigen': {
        if (G.ziel) _gd.copy(G.ziel).sub(_gs[1]);
        else _gd.copy(_f).addScaledVector(_u, -0.1);
        if (_gd.lengthSq() < 1e-6) _gd.copy(_f);
        _gd.normalize();
        // never into the own body: at least a little to the right of straight back
        if (_gd.dot(_f) < -0.2) _gd.addScaledVector(_r, 0.8).normalize();
        const la = armLen(R, 'Right');
        _gt.copy(_gs[1]).addScaledVector(_gd, la * 0.96);
        _pole.copy(_u).multiplyScalar(-1).addScaledVector(_r, 0.4);
        _w2.copy(_u).addScaledVector(_gd, -_u.dot(_gd));
        arm('Right', _gt, _pole, _gd, _w2);
        curl(R, 'Right', [1.35, 1.2, 0.8], 0.55, w, true);
        break;
      }
    }
  }
  const _al = V(),
    _al2 = V();
  function armLen(R, sd) {
    const A = R.B[sd + 'Arm'],
      F = R.B[sd + 'ForeArm'],
      H = R.B[sd + 'Hand'];
    if (!A || !F || !H) return 0.55;
    return A.getWorldPosition(_al).distanceTo(F.getWorldPosition(_al2)) + _al2.distanceTo(H.getWorldPosition(_al));
  }
  // ------------------------------------------------------------------ talking hands ------------------------------------------------------------------
  // a talker's hands come up and turn now and then (beats of the speech), the head goes with it; on top of the talk clip
  function reden(R, t, w, seed, free) {
    if (w <= 0.001) return;
    const B = R.B,
      Qi = R.model.getWorldQuaternion(_mq).invert();
    const n1 = Math.pow(Math.max(0, Math.sin(t * 1.9 + seed)), 2) * w,
      n2 = Math.pow(Math.max(0, Math.sin(t * 1.35 + seed * 2.3 + 1.7)), 2) * w;
    if (free.indexOf('R') >= 0) {
      boneTurn(R.sv, Qi, B.RightArm, 1, 0, 0, -0.16 * n1);
      boneTurn(R.sv, Qi, B.RightForeArm, 1, 0, 0, -0.55 * n1);
      boneTurn(R.sv, Qi, B.RightHand, 0, 0, 1, -0.35 * n1);
    }
    if (free.indexOf('L') >= 0) {
      boneTurn(R.sv, Qi, B.LeftArm, 1, 0, 0, -0.12 * n2);
      boneTurn(R.sv, Qi, B.LeftForeArm, 1, 0, 0, -0.45 * n2);
      boneTurn(R.sv, Qi, B.LeftHand, 0, 0, 1, 0.3 * n2);
    }
    boneTurn(R.sv, Qi, B.Head, 1, 0, 0, 0.045 * Math.sin(t * 3.1 + seed) * w);
  }
  // ------------------------------------------------------------------ the phone ------------------------------------------------------------------
  // a small dark box with its screen lit (a copy of the traffic's material with light of its own: the same shader program), made once,
  // one per figure that holds it (the geometry shared)
  let PH = null;
  function phoneParts() {
    if (PH) return PH;
    const K = VPROPS.kit(),
      K2 = VPROPS.kit();
    // the kit's frame: x across, y along the phone, z out of the screen
    K.box(0, 0, -0.0045, 0.071, 0.148, 0.0085, 0, [0.018, 0.018, 0.02], true);
    K.box(0, 0.05, -0.0062, 0.012, 0.012, 0.0012, 0, [0.05, 0.05, 0.055], true);
    K2.box(0, 0, 0.0041, 0.064, 0.134, 0.0008, 0, [0.42, 0.55, 0.72], false);
    const lit = VFIG.mat().clone();
    lit.emissive = new THREE.Color(0.32, 0.46, 0.7);
    lit.emissiveIntensity = 1.1;
    lit.name = 'grenzland handy';
    PH = { body: K.geo(), screen: K2.geo(), lit };
    return PH;
  }
  function handy(F, on) {
    if (!on) {
      if (F.handyG) {
        if (F.handyG.parent) F.handyG.parent.remove(F.handyG);
        F.handyG = null;
        S.props--;
        markDirty();
      }
      return null;
    }
    if (F.handyG) return F.handyG;
    const P = phoneParts(),
      g = new THREE.Group(),
      a = new THREE.Mesh(P.body, VFIG.mat()),
      b = new THREE.Mesh(P.screen, P.lit);
    for (const m of [a, b]) {
      m.userData.noMerge = true;
      m.userData.shared = true;
      m.castShadow = false;
      m.frustumCulled = false;
      g.add(m);
    }
    g.matrixAutoUpdate = false;
    g.name = 'grenzland handy';
    scene.add(g);
    F.handyG = g;
    S.props++;
    return g;
  }
  const _pm = new THREE.Matrix4(),
    _px = V(),
    _py = V(),
    _pz = V(),
    _pp = V();
  // the phone in the right hand: along the fingers, its screen to the palm, in the palm's middle
  function handyPose(F, R) {
    const g = F.handyG,
      H = R.B.RightHand;
    if (!g || !H || !handAxes(R, 'Right', _hf, _ht, _hb)) return;
    H.getWorldPosition(_pp).addScaledVector(_hf, 0.075).addScaledVector(_hb, -0.03);
    // the geometry: x across, y out of the screen (three's axes of the kit), -z along the phone
    _py.copy(_hb).multiplyScalar(-1);
    _pz.copy(_hf).multiplyScalar(-1);
    _px.crossVectors(_py, _pz).normalize();
    _pm.makeBasis(_px, _py, _pz).setPosition(_pp);
    g.matrix.copy(_pm);
    g.matrixWorldNeedsUpdate = true;
    g.updateMatrixWorld(true);
  }
  // ------------------------------------------------------------------ after the clips: what a figure of GLFIG does ------------------------------------------------------------------
  const _lp = V();
  function lookPoint(L, out) {
    if (L.wer === 'spieler') {
      const w = KERN.where() || [PW.x, PW.y];
      const z = Number.isFinite(PW.feet) ? PW.feet + 1.6 : KERN.ground(w[0], w[1]) + 1.6;
      return out.set(w[0], z, -w[1]);
    }
    if (L.F && L.F.g) {
      const H = L.F.f && L.F.f.bones && L.F.f.bones.Head;
      if (H && L.F.g.visible) return H.getWorldPosition(out);
      return out.set(L.F.x, L.F.z + 1.6, -L.F.y);
    }
    const z = L.z != null ? L.z : KERN.ground(L.x, L.y) + 1.6;
    return out.set(L.x, z, -L.y);
  }
  function nach(F, R, dt, sp) {
    if (!R || !F.g.visible) return;
    const st = R.st;
    // far from the camera rbPerson does not pose (70 m): nor does this
    if (F.g.position.distanceToSquared(cam.position) > 4900) return;
    try {
      // the run
      const runT = F.renn && sp > 0 ? smooth((sp - 1.8) / 1.6) : 0;
      st.runW = (st.runW || 0) + (runT - (st.runW || 0)) * Math.min(1, dt * 8);
      if (st.runW > 0.01 && F.set) {
        const C = runClip(F.set);
        if (C) {
          const v = C.speed * ((R.hipH || C.hip) / C.hip);
          st.runT = (st.runT || 0) + (dt * Math.max(sp, 1)) / v;
          lauf(R, C, st.runT * C.d, st.runW);
        }
      }
      // sitting: the feet down
      if (F.sitzt && !F.reitet && F.boden != null) sitzBeine(R, F.boden, (F.sitzH || 0.45) > 0.62, 1, !!F.f.speak);
      // the gesture
      const G = F.gest;
      let armsBusy = '';
      if (G) {
        const A = ARTEN[G.art] || {};
        G.t += dt;
        const out = G.end || (G.sec > 0 && G.t > G.sec - 0.25);
        G.w = clamp(G.w + (out ? -dt : dt) / 0.25, 0, 1);
        if (out && G.w <= 0) {
          F.gest = null;
          if (A.handy) handy(F, false);
        } else {
          if (G.zielV === undefined) G.zielV = null;
          if (G.ziel) G.zielV = lookPoint(G.ziel, G.zielV || V());
          geste(R, { art: G.art, t: G.t, w: G.w, ziel: G.zielV });
          armsBusy = G.w > 0.05 ? A.arms || '' : '';
          if (A.handy) {
            handy(F, true);
            handyPose(F, R);
          }
        }
      }
      // talking: the hands that are free move a little
      const talk = !!(F.f.walker && F.f.walker.talking) && !F.sitzt && !F.reitet && sp < 0.3;
      st.talkW = (st.talkW || 0) + ((talk ? 1 : 0) - (st.talkW || 0)) * Math.min(1, dt * 3);
      if (st.talkW > 0.01) {
        st.talkT = (st.talkT || 0) + dt;
        const free = (armsBusy.indexOf('L') < 0 ? 'L' : '') + (armsBusy.indexOf('R') < 0 ? 'R' : '');
        reden(R, st.talkT, st.talkW * 0.8, (F.id || '').length * 1.3, free);
      }
      // the look (a pointing figure looks where it points)
      let L = F.look;
      if (!L && G && G.art === 'zeigen' && G.ziel) L = F.lookZ || (F.lookZ = { auto: true });
      if (L) {
        const off = L.end || (L.auto && !(G && G.art === 'zeigen'));
        L.w = clamp((L.w || 0) + (off ? -dt : dt) / 0.3, 0, 1);
        if (off && L.w <= 0) {
          if (L === F.look) F.look = null;
          else F.lookZ = null;
        } else {
          const src = L.auto ? G && G.ziel : L;
          if (src) blick(R, L, lookPoint(src, _lp), dt, L.w);
        }
      }
      S.n++;
    } catch (e) {
      if (!S.err) console.warn('grenzland pose', F.id, e);
      S.err = (F.id || '') + ': ' + ((e && e.message) || e);
    }
  }
  // ------------------------------------------------------------------ seats ------------------------------------------------------------------
  // the benches one can sit on in Ratscher: the ring round the Dorflinde (world/village_props.js) and the benches of the village centre
  // (world/dorfkern_data.js) – two seats each; { x, y, hd: the way one looks sitting, z: the seat's height over the ground }
  let SEATS = null;
  function seats() {
    if (SEATS) return SEATS;
    const out = [],
      VP = window.VPROPS,
      DK = window.DKDATA;
    const add = (cx, cy, a, len, back) => {
      // a: the way the bench faces (radians, counter-clockwise from east); the hips a little behind the seat's middle
      const c = Math.cos(a),
        s = Math.sin(a),
        hd = Math.atan2(c, s);
      for (const t of [-len / 4, len / 4])
        out.push({ x: cx - s * t - c * back, y: cy + c * t - s * back, hd, z: 0.455 });
    };
    try {
      if (VP && VP.LINDE)
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + 0.3;
          add(VP.LINDE[0] + Math.cos(a) * 2.25, VP.LINDE[1] + Math.sin(a) * 2.25, a, 1.7, 0.04);
        }
      if (DK && DK.open && DK.open.benches)
        for (const [x, y, az, len] of DK.open.benches) add(x, y, ((90 - az) * Math.PI) / 180, len, 0.05);
    } catch (e) {
      S.err = 'seats: ' + ((e && e.message) || e);
    }
    return (SEATS = out);
  }
  // the nearest seat to (x, y) within r metres that nobody of GLFIG sits on
  function platz(x, y, r = 25) {
    const G = window.GLFIG,
      busy = ((G && G.figs) || []).filter(F => F.sitzt && F.g.visible);
    let best = null,
      bd = r;
    for (const q of seats()) {
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bd && !busy.some(F => Math.hypot(F.x - q.x, F.y - q.y) < 0.45)) {
        bd = d;
        best = q;
      }
    }
    return best ? Object.assign({}, best) : null;
  }
  // a target of a look or a gesture: [x, y, z] or (x, y, z) in the world's metres (z: the height in the world; without it eye height
  // over the ground there), a figure of GLFIG (its head), 'spieler' (the player's eyes), { x, y, z }; null: none
  function ort(a, b, c) {
    if (a == null || a === false) return null;
    if (a === 'spieler') return { wer: 'spieler' };
    if (typeof a === 'object' && a.g && a.f) return { F: a };
    if (Array.isArray(a)) return a.length >= 2 ? { x: +a[0], y: +a[1], z: a[2] == null ? null : +a[2] } : null;
    if (typeof a === 'number' && typeof b === 'number') return { x: a, y: b, z: c == null ? null : +c };
    if (typeof a === 'object' && Number.isFinite(a.x) && Number.isFinite(a.y))
      return { x: a.x, y: a.y, z: a.z ?? null };
    return null;
  }
  // the angle (rad) between where a figure's face points and the way to the point p ([x, y, z] in the world) – for the tests
  function winkel(F, p) {
    const R = F && F.rig,
      H = R && R.B.Head;
    if (!H || !R.hf) return null;
    const d = R.hf.clone().applyQuaternion(H.getWorldQuaternion(Q())),
      h = H.getWorldPosition(V()),
      t = V().set(p[0], p[2], -p[1]).sub(h);
    return d.angleTo(t);
  }
  // the rider's checks of the last pose (the player: GLPOSE.stand().chk)
  const chk = F => (F && F.rig && F.rig.st.chk) || null;
  function stand() {
    const AF = AVATAR.fig;
    return {
      n: S.n,
      err: S.err,
      riders: S.riders,
      player: S.player ? S.player.n : 0,
      last: S.last,
      props: S.props,
      avatar: !!AF,
      chk: S.player && S.player.R ? S.player.R.st.chk || null : null,
    };
  }
  Object.assign(S, {
    rig,
    back,
    nach,
    ride,
    moped,
    handy,
    ARTEN,
    MOPED,
    stand,
    ik2,
    aim,
    turnW,
    lookPoint,
    ort,
    winkel,
    chk,
    seats,
    platz,
  });
  return S;
})();
window.GLPOSE = GLPOSE;
