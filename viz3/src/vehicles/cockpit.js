// ===================== feat/cockpit: the inside of the cars – what the driver sees and touches (COCKPIT) =====================
// Falko 13.11.2026 15:54: „… auch die Innenansicht sollte realistisch sein mit Tacho, bewegtem Lenkrad, Händen am Lenkrad, Schalten und so
// weiter …“; decided 16:05: the bodies come from the roads chat, the inside from here – automatic gearbox with the hand visible, real
// mirrors, wipers in the rain, indicators and the light switch, a navi in the middle (docs/plans/auftraege/cockpit.md, docs/features/cockpit.md).
// Falko's estate (vehicles/car.js) gets its cockpit the first time one gets in (vehicles/cockpit_build.js; the body's simple inside is
// hidden, model.inside): the needles follow the physics (vehicles/vehicle.js: speed, revs, gear), the wheel turns with the steering
// (15 : 1), the figure's hands hold it (vehicles/cockpit_hands.js) and the right one goes to the lever when the automatic changes gear,
// the cluster shows the time, the gear, the odometer and the control lights, backlit at night; the indicators (, and .) blink with their
// click in the cluster and in the body's lamps and cancel themselves after the turn; the light switch turns with L; the wipers run when it
// rains (wetter/: interval, normal, fast), drops gather on the glass between their strokes; the navi in the centre console shows the
// minimap's picture (vehicles/minimap.js MMAP.drawTo) and the corner map can step aside; the mirrors show what is behind
// (vehicles/cockpit_mirror.js). The state the body's lamps read: v.st.blink ('L' | 'R' | null) and v.st.blinkOn (the lamp's phase).
//   COCKPIT.set (CPSET) · info() · blink(side) · rain(k | null) (tests) · build() · S
import * as THREE from 'three';
import { $, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { warmUp } from '../render/render.js';
import { P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { audio } from '../audio/audio.js';
import { DN } from '../time/daynight.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from './vehicle.js';
import { MMAP } from './minimap.js';
import { WETTER } from '../wetter/wetter.js';
import { CPSET } from './cockpit_set.js';
import { CPBUILD } from './cockpit_build.js';
import { CPFACE } from './cockpit_cluster.js';
import { CPHANDS } from './cockpit_hands.js';
import { CPMIRROR } from './cockpit_mirror.js';
import { KOMBI } from './kombi.js';
export const COCKPIT = (() => {
  const RATIO = 15; // the steering's ratio: turns of the wheel per turn of the road wheels
  const LEVER = { P: -0.24, R: -0.09, N: 0.03, D: 0.15 };
  // the vehicles with this cockpit: Falko's estate and the traffic car one may drive (verkehr/verkehr_auto.js: the same spec)
  const KIND = { car: 'car', verkehr: 'car', tractor: 'tractor' };
  // cs: one cockpit per vehicle id; c: the one driven now (or last)
  const S = { cs: {}, c: null, view: false, rainK: null, buildMs: 0, frameMs: 0, warm: 0, keys: 0 };
  const rad = d => (d * Math.PI) / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // ---- building: the first time one sits in the car ----
  function build(v) {
    if (!v || !v.model || !v.model.body) return null;
    if (S.cs[v.id]) return S.cs[v.id];
    if (KIND[v.id] === 'tractor') return buildTractor(v);
    const t0 = performance.now();
    const A = CPBUILD.anchors(v),
      face = CPFACE.cluster(),
      navi = CPFACE.navi();
    const parts = CPBUILD.build(A, face, navi);
    v.model.body.add(parts.root);
    if (v.model.inside) v.model.inside.visible = false;
    const mir = CPMIRROR.attach(parts, A, CPBUILD.mats().mirrorOff);
    // the grips: the hands' places on the rim (on the wheel's base: they follow the wheel only as far as hands do) and on the knob
    const mark = () => {
      const o = new THREE.Object3D();
      parts.wh.base.add(o);
      return o;
    };
    const knob = new THREE.Object3D();
    knob.position.set(0, 0.1, 0.006);
    parts.ce.lever.add(knob);
    const c = {
      v,
      A,
      P: parts,
      face,
      navi,
      mR: mark(),
      mL: mark(),
      knob,
      kmh: 0,
      rpm: 0,
      sweep: -1,
      check: 9,
      temp: 18,
      own: false,
      gear: 1,
      shift: null,
      leverA: LEVER.P,
      hTh: 0,
      blink: null,
      blinkT: 0,
      blinkOn: false,
      arm: 0,
      wip: { mode: 'aus', u: 0, phi: 0, wait: 0, wet: 0 },
      naviT: 9,
      dispT: 9,
      odoT: 0,
      label: null,
      handsOk: false,
      mir,
      // Falko's car keeps its odometer (pav-cockpit-v1); a borrowed one shows its own
      persist: v.id === 'car',
      odo: v.id === 'car' ? null : 18000 + Math.round(Math.random() * 140000),
    };
    S.cs[v.id] = c;
    S.c = c;
    // the shader programs of the new materials compiled now, once (not when they first come into view)
    warmUp(parts.root);
    S.buildMs = performance.now() - t0;
    markDirty(true);
    return c;
  }
  // ---- the tractor's cab: its wheel turns (the body's fixed one hidden), the pod's gauges, the hands; the right hand to the levers ----
  function buildTractor(v) {
    const t0 = performance.now();
    const A = CPBUILD.anchors(v),
      face = CPFACE.tractor(),
      parts = CPBUILD.tractor(A, face);
    v.model.body.add(parts.root);
    // the body's own wheel: the group with the ring (vehicles/tractor.js builds it without a name)
    for (const o of v.model.body.children)
      if (o.isGroup && o !== parts.root && o.children.some(m => m.geometry && m.geometry.type === 'TorusGeometry'))
        o.visible = false;
    const mark = () => {
      const o = new THREE.Object3D();
      parts.wh.base.add(o);
      return o;
    };
    const knob = new THREE.Object3D();
    knob.position.copy(V(A.lever[0], A.lever[1], A.lever[2]));
    parts.root.add(knob);
    const c = {
      kind: 'tractor',
      v,
      A,
      P: parts,
      face,
      mR: mark(),
      mL: mark(),
      knob,
      rpm: 0,
      own: false,
      gear: 1,
      shift: null,
      hTh: 0,
      blink: null,
      blinkT: 0,
      blinkOn: false,
      arm: 0,
      dispT: 9,
      hours: 3412 + Math.random() * 400,
      handsOk: false,
    };
    S.cs[v.id] = c;
    S.c = c;
    warmUp(parts.root);
    S.buildMs = performance.now() - t0;
    markDirty(true);
    return c;
  }
  function stepTractor(c, dt, v) {
    const s = c.v.st,
      own = v === c.v,
      view = own && !CAM3.want && P.mode === 'walk';
    if (own) {
      S.view = view;
      S.c = c;
    }
    if (own !== c.own) {
      c.own = own;
      if (own) c.gear = s.gear;
      else blink(null, c);
    }
    const th = -s.steer * 18;
    c.P.wh.spin.rotation.z = th;
    const eng = !!s.engine;
    c.rpm += ((eng ? s.rpm : 0) - c.rpm) * Math.min(1, dt * 8);
    c.P.cl.rpm.rotation.z = rad(210 - (clamp(c.rpm, 0, 3000) / 3000) * 240);
    if (own && eng) c.hours += dt / 3600;
    if (own && eng && s.gear !== c.gear) {
      if (c.shift && c.shift.t < 0.3 + c.shift.hold) c.shift.hold = c.shift.t - 0.3 + 0.35;
      else c.shift = { t: 0, hold: 0.38 };
      c.shifts = (c.shifts || 0) + 1;
    }
    c.gear = s.gear;
    if (c.shift) {
      c.shift.t += dt;
      if (c.shift.t > 0.6 + c.shift.hold) c.shift = null;
    }
    if (c.blink) {
      c.blinkT += dt;
      const on = c.blinkT % 0.7 < 0.38;
      if (on !== c.blinkOn) {
        c.blinkOn = on;
        relay(on);
        lampsBlink(c);
      }
      const away = c.blink === 'L' ? th : -th;
      if (away > 1.3) c.arm = 1;
      else if (c.arm && away < 0.35) blink(null, c);
    }
    const day = dayK(),
      kf = eng ? (day < 0.45 ? 1.2 : 0.75 + 0.25 * day) : 0.05 + 0.5 * day;
    c.face.mat.color.setScalar(kf);
    c.dispT += dt;
    if (c.dispT > 0.25) {
      c.dispT = 0;
      c.face.draw({
        kmh: eng ? String(Math.round(Math.abs(s.u) * 3.6)) : '',
        gear: !eng ? '' : (s.gear < 0 ? 'R' : 'F') + Math.abs(s.gear),
        hours: eng ? c.hours.toFixed(1).replace('.', ',') + ' h' : '',
        fuel: 0.62,
        low: eng && VEH.lightsOn(c.v),
        hand: eng && !!s.hand,
      });
    }
    if (own || !VEH.cur) CPHANDS.show(view);
    if (view) hands(c, dt, th);
    if (own) markDirty();
  }
  // ---- the day's light for the unlit faces (as grenzland/gl_cockpit.js): 1 with the sun up, a glimmer at night ----
  function dayK() {
    if (DN && DN.active && DN.state && Number.isFinite(DN.state.sunEl))
      return clamp((DN.state.sunEl + 7) / 15, 0.04, 1);
    return window.MODE_NOW === 'night' ? 0.05 : window.MODE_NOW === 'dusk' ? 0.35 : 1;
  }
  // ---- the indicators: a relay's tick and tock, the arrows, the body's lamps, the stalk ----
  function relay(on) {
    const r = audio.raw && audio.raw();
    if (!r || !r.ctx) return;
    try {
      const c = r.ctx,
        t = c.currentTime,
        n = Math.floor(c.sampleRate * 0.03),
        b = c.createBuffer(1, n, c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.12));
      const s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      s.buffer = b;
      f.type = 'bandpass';
      f.frequency.value = on ? 2600 : 1700;
      f.Q.value = 3;
      g.gain.value = 0.22;
      s.connect(f);
      f.connect(g);
      g.connect(r.sfx);
      s.start(t);
    } catch (e) {}
  }
  const cur = () => (VEH.cur && S.cs[VEH.cur.id]) || null;
  function blink(side, c = cur()) {
    if (!c) return;
    c.blink = side === 'L' || side === 'R' ? (c.blink === side ? null : side) : null;
    c.blinkT = 0;
    c.arm = 0;
    c.blinkOn = !!c.blink;
    if (c.blink) relay(true);
    lampsBlink(c);
    markDirty();
  }
  function lampsBlink(c) {
    const v = c.v,
      on = c.blinkOn;
    v.st.blink = c.blink;
    v.st.blinkOn = on;
    const L = v.model.lamps || {};
    const set = (list, k) => {
      for (const m of list || []) if (Math.abs(m.emissiveIntensity - k) > 1e-3) m.emissiveIntensity = k;
    };
    set(L.blinkL, on && c.blink === 'L' ? 2.6 : 0);
    set(L.blinkR, on && c.blink === 'R' ? 2.6 : 0);
    c.P.cl.arL.visible = on && c.blink === 'L';
    c.P.cl.arR.visible = on && c.blink === 'R';
    blinkButtons(c);
  }
  const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  window.addEventListener('keydown', e => {
    const c = cur();
    if (!c || typing() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ',') blink('L', c);
    else if (e.key === '.') blink('R', c);
    else return;
    S.keys++;
    e.preventDefault();
  });
  // the same on the screen (phones have no keys): two arrows among the vehicle's touch buttons (#vhud .vbtns), lit while blinking
  const tb = {};
  {
    const row = document.querySelector('#vhud .vbtns');
    const arrow = d =>
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? 'M14 6l-6 6 6 6M8 12h11' : 'M10 6l6 6-6 6M16 12H5'}"/></svg>`;
    if (row)
      for (const [side, d, t] of [
        ['L', -1, 'Blinker links (,)'],
        ['R', 1, 'Blinker rechts (.)'],
      ]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cpblink';
        b.title = t;
        b.setAttribute('aria-label', t);
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = arrow(d);
        b.addEventListener('pointerdown', e => {
          e.preventDefault();
          blink(side);
        });
        row.appendChild(b);
        tb[side] = b;
      }
  }
  function blinkButtons(c) {
    for (const k of ['L', 'R'])
      if (tb[k]) {
        const on = String(!!c && c.blink === k);
        if (tb[k].getAttribute('aria-pressed') !== on) tb[k].setAttribute('aria-pressed', on);
      }
  }
  // ---- the hands' frames (in the rig's frame: x the back of the hand, y its index side, z towards the wrist) ----
  const _x = new THREE.Vector3(),
    _y = new THREE.Vector3(),
    _z = new THREE.Vector3(),
    _m = new THREE.Matrix4(),
    _inv = new THREE.Matrix4(),
    _s = new THREE.Vector3(),
    _q = new THREE.Quaternion();
  const T = {
    R: { p: new THREE.Vector3(), q: new THREE.Quaternion(), pose: 'grip' },
    L: { p: new THREE.Vector3(), q: new THREE.Quaternion(), pose: 'grip' },
  };
  const knobT = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  // a grip on the rim at angle phi (0: three o'clock, counter-clockwise as the driver sees it), the index finger towards the top
  function rimGrip(o, phi, side, R) {
    const cs = Math.cos(phi),
      sn = Math.sin(phi);
    o.position.set(R * cs, R * sn, 0.002);
    _y.set(-sn * side, cs * side, 0);
    _z.set(cs * 0.45, sn * 0.45 - 0.15, 0.88);
    _z.addScaledVector(_y, -_z.dot(_y)).normalize();
    _x.crossVectors(_y, _z);
    o.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  }
  function inRig(o, out) {
    _m.multiplyMatrices(_inv, o.matrixWorld);
    _m.decompose(out.p, out.q, _s);
  }
  function hands(c, dt, th) {
    const fb = CPHANDS.ensure(c.P.root, c.A);
    if (!fb) return;
    if (!c.handsOk) {
      c.handsOk = true;
      warmUp(CPHANDS.rig);
    }
    // the hands follow the wheel about a quarter turn each way, then the rim slides through them (push-pull steering)
    const want = clamp(th, -1.45, 1.45);
    c.hTh += clamp(want - c.hTh, -dt * 14, dt * 14);
    const R = c.A.wheel.r;
    rimGrip(c.mR, 0.17 + c.hTh, 1, R);
    rimGrip(c.mL, Math.PI - 0.17 + c.hTh, -1, R);
    c.knob.quaternion.setFromRotationMatrix(
      _m.makeBasis(
        _x.set(0, 1, 0).cross(_z.set(-0.55, 0.3, 0.78).normalize()),
        _y.set(0, 1, 0),
        _z.set(-0.55, 0.3, 0.78).normalize()
      )
    );
    c.P.root.updateMatrixWorld(true);
    _inv.copy(CPHANDS.rig.matrixWorld).invert();
    inRig(c.mR, T.R);
    inRig(c.mL, T.L);
    // the right hand to the lever while a gear changes: there in 0.3 s, a nudge, back in 0.3 s
    let b = 0;
    if (c.shift) {
      const t = c.shift.t;
      b = t < 0.3 ? t / 0.3 : t < 0.3 + c.shift.hold ? 1 : Math.max(0, 1 - (t - 0.3 - c.shift.hold) / 0.3);
      b = b * b * (3 - 2 * b);
    }
    c.shiftB = b;
    if (b > 0.001) {
      inRig(c.knob, knobT);
      T.R.p.lerp(knobT.p, b);
      T.R.p.y += Math.sin(b * Math.PI) * 0.045;
      T.R.q.slerp(knobT.q, b);
    }
    CPHANDS.update(dt, T);
  }
  // ---- the wipers: off, interval, normal, fast after the rain; one stroke up and back in its period ----
  function wipers(c, dt, view) {
    const W = c.wip,
      fall = WETTER && WETTER.fall && WETTER.fall.S,
      k = S.rainK != null ? S.rainK : fall ? Math.max(fall.kR || 0, (fall.kS || 0) * 0.8) : 0,
      mode = !c.v.st.engine ? 'aus' : k < 0.05 ? 'aus' : k < 0.3 ? 'intervall' : k < 0.65 ? 'normal' : 'schnell';
    W.mode = mode;
    const per = mode === 'schnell' ? 0.95 : 1.35;
    if (W.u > 0 || (mode !== 'aus' && W.wait <= 0)) {
      const u0 = W.u;
      W.u += dt / per;
      if (u0 < 0.5 && W.u >= 0.5) W.wet *= 0.2; // the blades at the top: the glass is clear again
      if (W.u >= 1) {
        W.u = 0;
        W.wait = mode === 'intervall' ? 3.2 : 0;
      }
    } else W.wait -= dt;
    W.phi = 1.62 * (1 - Math.cos(W.u * Math.PI * 2)) * 0.5;
    c.P.wi.arms[0].rotation.z = W.phi;
    c.P.wi.arms[1].rotation.z = W.phi * 0.94;
    // drops gather while it rains, between the strokes
    W.wet = clamp(W.wet + k * dt * 0.35 - (k < 0.02 ? dt * 0.05 : 0), 0, 1);
    const d = c.P.wi.drops,
      show = view && W.wet > 0.02;
    if (d.visible !== show) d.visible = show;
    if (show) d.material.opacity = Math.min(0.85, W.wet) * (0.35 + 0.65 * dayK());
    // the right stalk: down a notch per speed
    c.P.wh.stalkR.rotation.z = -({ aus: 0, intervall: 0.09, normal: 0.17, schnell: 0.25 }[mode] || 0);
  }
  // ---- the navi: the minimap's picture, the destination above it, the time below; a few times a second while it is in view ----
  function naviDraw(c) {
    const N = c.navi,
      g = N.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!c.v.st.engine) {
      g.fillStyle = '#050607';
      g.fillRect(0, 0, 512, 288);
      N.done();
      return;
    }
    const o = { g, w: 512, h: 288, D: 1, R: 300, label: null };
    if (MMAP && MMAP.drawTo) MMAP.drawTo(o);
    else {
      g.fillStyle = '#1c2018';
      g.fillRect(0, 0, 512, 288);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // the bar on top: where to, how far
    g.fillStyle = 'rgba(12,16,22,0.86)';
    g.fillRect(0, 0, 512, 46);
    g.fillStyle = '#ffd36b';
    g.font = '600 24px system-ui, sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const L = o.label;
    c.label = L;
    if (L) {
      const d = L[1] > 950 ? (L[1] / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(L[1] / 10) * 10 + ' m';
      g.fillText('→ ' + L[0], 16, 24);
      g.textAlign = 'right';
      g.fillStyle = '#ffffff';
      g.fillText(d, 496, 24);
    }
    g.fillStyle = 'rgba(12,16,22,0.8)';
    g.fillRect(400, 250, 112, 38);
    g.fillStyle = '#e8eef4';
    g.font = '600 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(CLOCK.hm(), 456, 270);
    N.done();
    c.naviN = (c.naviN || 0) + 1;
  }
  // ---- per frame (right after the vehicles' physics, VEH.after) ----
  function frame(dt) {
    const v = VEH.cur;
    if (v && KIND[v.id] && !S.cs[v.id]) build(v);
    const t0 = performance.now();
    let any = false;
    for (const id in S.cs) {
      const c = S.cs[id];
      if (c.v !== v && !c.own) continue;
      step(c, dt, v);
      any = true;
    }
    if (!v || !S.cs[v.id]) S.view = false;
    if (any) S.frameMs = S.frameMs * 0.9 + (performance.now() - t0) * 0.1;
  }
  function step(c, dt, v) {
    if (c.kind === 'tractor') return stepTractor(c, dt, v);
    const s = c.v.st,
      own = v === c.v,
      view = own && !CAM3.want && P.mode === 'walk';
    if (own) {
      S.view = view;
      S.c = c;
    }
    // getting in and out
    if (own !== c.own) {
      c.own = own;
      if (own) {
        c.sweep = 0;
        c.check = 0;
        c.gear = s.gear;
      } else {
        blink(null, c);
        if (c.persist) {
          CPSET.S.odo = c.odo;
          CPSET.save();
        }
      }
    }
    if (c.odo == null) c.odo = Number.isFinite(CPSET.S.odo) ? CPSET.S.odo : 136482.4;
    // the wheel (counter-clockwise as the driver sees it is positive) and the needles
    const th = -s.steer * RATIO;
    c.P.wh.spin.rotation.z = th;
    const eng = !!s.engine;
    c.kmh += ((eng || Math.abs(s.u) > 0.1 ? Math.abs(s.u) * 3.6 : 0) - c.kmh) * Math.min(1, dt * 7);
    c.rpm += ((eng ? s.rpm : 0) - c.rpm) * Math.min(1, dt * 9);
    let kmh = c.kmh,
      rpm = c.rpm;
    if (c.sweep >= 0) {
      // the needles' sweep when the engine starts
      c.sweep += dt;
      const k = c.sweep < 0.55 ? c.sweep / 0.55 : Math.max(0, 1 - (c.sweep - 0.55) / 0.55);
      kmh = Math.max(kmh, 200 * k);
      rpm = Math.max(rpm, 7000 * k);
      if (c.sweep > 1.1) c.sweep = -1;
    }
    const tremble = eng ? Math.sin(performance.now() * 0.031) * 0.0035 : 0;
    c.P.cl.spd.rotation.z = rad(210 - clamp(kmh, 0, 200) * 1.2) + tremble;
    c.P.cl.rpm.rotation.z = rad(210 - (clamp(rpm, 0, 7000) / 7000) * 240) + tremble;
    c.temp += eng ? Math.min(90 - c.temp, dt * 0.55) : -Math.min(c.temp - 18, dt * 0.05);
    c.P.cl.temp.rotation.z = rad(150 - clamp((c.temp - 50) / 80, 0, 1) * 120);
    if (own && Math.abs(s.u) > 0.05) c.odo += (Math.abs(s.u) * dt) / 1000;
    c.trip = (c.trip || 0) + (own ? (Math.abs(s.u) * dt) / 1000 : 0);
    const fuel = clamp(0.74 - c.trip * 0.0012, 0.3, 1);
    c.P.cl.fuel.rotation.z = rad(150 - fuel * 120);
    c.check += dt;
    // the gear: P with the engine off, R, D and the gear the automatic holds; a change sends the right hand to the lever
    const gt = !eng ? 'P' : s.gear < 0 ? 'R' : 'D';
    if (own && eng && s.gear !== c.gear) {
      if (c.shift && c.shift.t < 0.3 + c.shift.hold) c.shift.hold = c.shift.t - 0.3 + 0.35;
      else c.shift = { t: 0, hold: 0.38 };
      c.shifts = (c.shifts || 0) + 1;
    }
    c.gear = s.gear;
    if (c.shift) {
      c.shift.t += dt;
      if (c.shift.t > 0.6 + c.shift.hold) c.shift = null;
    }
    const nudge = c.shift && c.shift.t > 0.3 && c.shift.t < 0.3 + c.shift.hold ? 0.06 : 0;
    c.leverA += (LEVER[gt] + nudge - c.leverA) * Math.min(1, dt * 10);
    c.P.ce.lever.rotation.x = c.leverA;
    c.P.ce.hand.rotation.x = s.hand ? -0.3 : 0;
    c.P.pe.brk.rotation.x = -0.3 * (s.brk || 0);
    c.P.pe.gas.rotation.x = -0.25 * (s.thr || 0);
    // the light switch: off – AUTO – low beam
    c.P.lk.rotation.z = { off: 0.75, auto: 0, on: -0.75 }[VEH.lights] || 0;
    // indicators: 1.4 Hz, cancelled when the wheel comes back after the turn
    if (c.blink) {
      c.blinkT += dt;
      const on = c.blinkT % 0.7 < 0.38;
      if (on !== c.blinkOn) {
        c.blinkOn = on;
        relay(on);
        lampsBlink(c);
      }
      const away = c.blink === 'L' ? th : -th;
      if (away > 1.3) c.arm = 1;
      else if (c.arm && away < 0.35) blink(null, c);
    }
    c.P.wh.stalkL.rotation.z = c.blink === 'L' ? 0.15 : c.blink === 'R' ? -0.15 : 0;
    wipers(c, dt, view);
    // the faces' light: backlit with the engine on (bright at night), else only the day's light
    const day = dayK(),
      dark = day < 0.45,
      kf = eng ? (dark ? 1.25 : 0.72 + 0.28 * day) : 0.05 + 0.5 * day;
    c.face.mat.color.setScalar(kf);
    CPBUILD.mats().needle.color.setRGB(1 * kf, 0.3 * kf, 0.1 * kf);
    CPBUILD.mats().arrow.color.setRGB(0.17 * Math.max(kf, 1), 0.85 * Math.max(kf, 1), 0.41 * Math.max(kf, 1));
    c.navi.mat.color.setScalar(eng ? (dark ? 0.95 : 1.05) : 0.4);
    // the display: four times a second at most, and only when something in it changed
    c.dispT += dt;
    if (c.dispT > 0.25) {
      c.dispT = 0;
      const w = WETTER && WETTER.S && WETTER.S.w;
      c.face.draw({
        clock: eng ? CLOCK.hm() : '',
        temp: eng && w && Number.isFinite(w.temp) ? Math.round(w.temp) + ' °C' : '',
        gear: !eng ? '' : gt === 'D' ? 'D' + Math.max(1, s.gear) : gt,
        odo: eng ? Math.floor(c.odo).toLocaleString('de-DE') + ' km' : '',
        trip: eng ? 'Trip ' + c.trip.toFixed(1).replace('.', ',') + ' km' : '',
        low: eng && VEH.lightsOn(c.v),
        auto: VEH.lights === 'auto',
        hand: eng && !!s.hand,
        esc: eng && s.slip > 0.3 && Math.floor(performance.now() / 120) % 2 === 0,
        check: eng && c.check < 1.6,
      });
    }
    // the navi and the corner map, the hands, the mirrors – in the driver's view
    c.naviT += dt;
    if (view && c.naviT > 0.25) {
      c.naviT = 0;
      naviDraw(c);
    }
    if (own || !VEH.cur) CPHANDS.show(view);
    if (view) hands(c, dt, th);
    CPMIRROR.update(dt, c.mir, c.v.model.body, view && CPSET.mirOn());
    // the odometer kept now and then
    c.odoT += dt;
    if (own && c.persist && c.odoT > 30) {
      c.odoT = 0;
      CPSET.S.odo = c.odo;
      CPSET.save();
    }
    if (own) markDirty();
  }
  VEH.after.push(frame);
  // the corner map steps aside while the navi is in view (setting „Karte im Auto“)
  if (MMAP) MMAP.hide = () => !!(S.c && S.c.navi && S.view && CPSET.S.nav);
  // ---- tests and bug reports ----
  function info() {
    const c = S.c;
    const r = {
      set: CPSET.info(),
      built: !!c,
      view: S.view,
      buildMs: Math.round(S.buildMs),
      frameMs: +S.frameMs.toFixed(2),
      bad: CPBUILD.BAD.slice(),
    };
    if (!c) return r;
    const s = c.v.st;
    if (c.kind === 'tractor')
      return Object.assign(r, {
        id: c.v.id,
        kind: c.kind,
        wheel: +c.P.wh.spin.rotation.z.toFixed(3),
        steer: +s.steer.toFixed(3),
        rpm: +c.P.cl.rpm.rotation.z.toFixed(3),
        gear: s.gear,
        shifts: c.shifts || 0,
        shiftB: +(c.shiftB || 0).toFixed(2),
        hands: CPHANDS.where(),
        handsShown: !!(CPHANDS.rig && CPHANDS.rig.visible),
        blink: c.blink,
        arrows: [c.P.cl.arL.visible, c.P.cl.arR.visible],
      });
    Object.assign(r, {
      id: c.v.id,
      kind: 'car',
      inside: c.v.model.inside ? c.v.model.inside.visible : null,
      wheel: +c.P.wh.spin.rotation.z.toFixed(3),
      steer: +s.steer.toFixed(3),
      spd: +c.P.cl.spd.rotation.z.toFixed(3),
      rpm: +c.P.cl.rpm.rotation.z.toFixed(3),
      kmh: +c.kmh.toFixed(1),
      gear: s.gear,
      shifts: c.shifts || 0,
      shiftB: +(c.shiftB || 0).toFixed(2),
      lever: +c.leverA.toFixed(3),
      hands: CPHANDS.where(),
      handsShown: !!(CPHANDS.rig && CPHANDS.rig.visible),
      handsMs: +CPHANDS.S.ms.toFixed(1),
      blink: c.blink,
      blinkOn: c.blinkOn,
      arrows: [c.P.cl.arL.visible, c.P.cl.arR.visible],
      lamps: [
        (c.v.model.lamps.blinkL || [])[0] ? c.v.model.lamps.blinkL[0].emissiveIntensity : null,
        (c.v.model.lamps.blinkR || [])[0] ? c.v.model.lamps.blinkR[0].emissiveIntensity : null,
      ],
      wiper: { mode: c.wip.mode, phi: +c.wip.phi.toFixed(3), wet: +c.wip.wet.toFixed(2), drops: c.P.wi.drops.visible },
      navi: { n: c.naviN || 0, label: c.label },
      mapHidden: !!($('vmap') && $('vmap').hidden),
      mirrors: CPMIRROR.info(),
      anchors: { eye: c.A.eye, head: !!c.A.head, apil: c.A.apil, heads: c.A.heads },
      odo: +c.odo.toFixed(1),
      meshes: (() => {
        const n = { st: 0, mov: 0, arms: 0 };
        c.P.st.traverseVisible(o => o.isMesh && n.st++);
        c.P.mov.traverseVisible(o => o.isMesh && n.mov++);
        if (CPHANDS.rig) CPHANDS.rig.traverseVisible(o => o.isMesh && n.arms++);
        return n;
      })(),
      light: VEH.lights,
      knob: +c.P.lk.rotation.z.toFixed(2),
    });
    return r;
  }
  return {
    S,
    set: CPSET,
    kombi: KOMBI,
    info,
    blink,
    build: (id = 'car') => build(VEH.by && VEH.by[id]),
    rain: k => (S.rainK = k == null ? null : clamp(+k || 0, 0, 1)),
  };
})();
window.COCKPIT = COCKPIT;
