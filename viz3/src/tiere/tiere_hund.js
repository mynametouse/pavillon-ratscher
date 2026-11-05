// ===================== feat/tiere 4: the companion dog – follows, is called and sent, and learns from you (HUND) =====================
// Hasso, an Altdeutscher Hütehund of the type Gelbbacke (the central German herding dog: 55–60 cm, black with tan cheeks) – fitting a
// garden with goats and a forest. He follows the walker a few metres behind and to the side, walking, trotting or galloping to keep up;
// waits, sits, lies down after a while; wags; rides along in the car and jumps out with you; comes along when you jump to a place.
// Wildlife keeps its distance from him (TIERE flight distances 'dog'). Called with P (Pfiff), sent with U to where you look; praise (+)
// and scolding (−) shape what he tends to do (herding the goats, driving game from the garden, searching, staying calm with people) –
// his character and what he learned are saved (pav-hund-v1).
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { collide, P } from '../game/walkable.js';
import { RENDER } from '../render/render.js';
import { inView } from '../npc/npc.js';
import { VEH } from '../vehicles/vehicle.js';
import { TKOERPER } from './tiere_koerper.js';
import { TIERE } from './tiere.js';
export const HUND = (() => {
  const LSK = 'pav-hund-v1';
  // what he tends to do, 0..1 (learned), and his character (fixed at birth, a little different every game)
  const DEF = { hueten: 0.45, vertreiben: 0.45, suchen: 0.4, ruhe: 0.5, jagen: 0.35 };
  const D = {
    on: true,
    name: 'Hasso',
    x: 4,
    y: 12,
    z: 0,
    az: 180,
    v: 0,
    mode: 'follow',
    t: 0,
    still: 0,
    wag: 0.4,
    model: null,
    home: [8.5, 11.5],
    learn: Object.assign({}, DEF),
    char: { mut: 0.6, eifer: 0.7, sanft: 0.55 },
    log: [],
    drawT: 0,
    rideOn: false,
  };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  function load() {
    const v = SAVE.get(LSK);
    if (!v || typeof v !== 'object') return;
    if (typeof v.name === 'string' && v.name.length > 0 && v.name.length < 24) D.name = v.name;
    if (v.learn && typeof v.learn === 'object')
      for (const k of Object.keys(DEF)) if (Number.isFinite(v.learn[k])) D.learn[k] = clamp01(v.learn[k]);
    if (v.char && typeof v.char === 'object')
      for (const k of Object.keys(D.char)) if (Number.isFinite(v.char[k])) D.char[k] = clamp01(v.char[k]);
    if (v.mode === 'home' || v.mode === 'follow') D.mode = v.mode;
  }
  function save() {
    SAVE.set(LSK, { v: 1, name: D.name, learn: D.learn, char: D.char, mode: D.mode === 'home' ? 'home' : 'follow' });
  }
  // the model, made the first time he is needed
  function model() {
    if (D.model) return D.model;
    D.model = TKOERPER.make('hund', {});
    D.model.g.name = 'Hund ' + D.name;
    scene.add(D.model.g);
    return D.model;
  }
  // where he wants to be: behind and to the side of the walker (left, the side a dog is led on)
  function slot() {
    const r = (P.body * Math.PI) / 180,
      fx = Math.sin(r),
      fy = Math.cos(r);
    return [P.x - fx * 2.2 - fy * 1.1, P.y - fy * 2.2 + fx * 1.1];
  }
  let lastP = null;
  function update(dt) {
    if (!D.on || !ready) return;
    dt = Math.min(dt, 0.1);
    D.t += dt;
    const car = VEH && VEH.cur;
    // in a vehicle he rides along (out of sight) and jumps out with you
    if (car) {
      if (D.mode === 'follow') D.rideOn = true;
      if (D.model) D.model.g.visible = false;
      lastP = null;
      return;
    }
    if (P.mode !== 'walk') {
      if (D.model) D.model.g.visible = D.mode !== 'ride';
      return;
    }
    const A = model();
    A.g.visible = true;
    // a jump to another place (menu, scene) or getting out of the car: he comes along
    if (D.mode === 'follow' && (D.rideOn || (lastP && Math.hypot(P.x - lastP[0], P.y - lastP[1]) > 40))) {
      const s = slot();
      D.x = s[0];
      D.y = s[1];
      D.v = 0;
      D.rideOn = false;
    }
    lastP = [P.x, P.y];
    let tx = D.x,
      ty = D.y,
      want = 0;
    const dP = Math.hypot(P.x - D.x, P.y - D.y);
    if (D.mode === 'follow') {
      const s = slot(),
        dS = Math.hypot(s[0] - D.x, s[1] - D.y);
      tx = s[0];
      ty = s[1];
      // close to the walker: no hurry; far behind: trot, gallop
      want = dS < 0.6 ? 0 : dS < 3 ? 1.1 + dS * 0.3 : dS < 10 ? 3 + dS * 0.25 : Math.min(8.5, 4 + dS * 0.2);
      if (P.speed > 0.3) want = Math.max(want, Math.min(P.speed * 1.05, 6) * (dS > 0.8 ? 1 : 0.6));
      if (dP < 1.0) want = 0;
    } else if (D.mode === 'home') {
      tx = D.home[0];
      ty = D.home[1];
      const dH = Math.hypot(tx - D.x, ty - D.y);
      want = dH < 0.5 ? 0 : dH < 5 ? 1.2 : 3.5;
    }
    // steering and speed
    const dx = tx - D.x,
      dy = ty - D.y,
      dist = Math.hypot(dx, dy);
    if (dist > 0.25 && want > 0) {
      const az = (Math.atan2(dx, dy) * 180) / Math.PI;
      const d = ((az - D.az + 540) % 360) - 180,
        turn = (D.v > 3 ? 220 : 300) * dt;
      D.az += Math.max(-turn, Math.min(turn, d));
    } else if (want === 0 && dP < 6) {
      // standing: he looks to you
      const az = (Math.atan2(P.x - D.x, P.y - D.y) * 180) / Math.PI;
      const d = ((az - D.az + 540) % 360) - 180;
      if (Math.abs(d) > 50) D.az += Math.max(-90 * dt, Math.min(90 * dt, d));
    }
    D.v += Math.max(-10 * dt, Math.min(6 * dt, want - D.v));
    if (D.v < 0.02) D.v = 0;
    const r = (D.az * Math.PI) / 180,
      nx = D.x + Math.sin(r) * D.v * dt,
      ny = D.y + Math.cos(r) * D.v * dt;
    const p = [nx, ny];
    const gz = KERN.ground(nx, ny);
    if (Math.abs(nx) < 50 && Math.abs(ny) < 55) collide(p, gz, true);
    else if (KERN.pushOut) KERN.pushOut(p, 0.28);
    D.x = p[0];
    D.y = p[1];
    // still: sit after a few seconds, lie down after half a minute
    D.still = D.v < 0.05 ? D.still + dt : 0;
    const sit = D.still > 2.5 && D.still < 28 ? 1 : 0,
      lie = D.still >= 28 ? 1 : 0;
    // wagging: near you and standing more; quiet when lying
    D.wag = lie ? 0.15 : dP < 4 ? 0.9 : D.v > 3 ? 0.25 : 0.5;
    // place and animate
    const L = 0.35,
      fx = D.x + Math.sin(r) * L,
      fy = D.y + Math.cos(r) * L,
      bx = D.x - Math.sin(r) * L,
      by = D.y - Math.cos(r) * L,
      zf = KERN.ground(fx, fy),
      zb = KERN.ground(bx, by);
    D.z = (zf + zb) / 2;
    A.g.position.set(D.x, D.z, -D.y);
    A.g.rotation.order = 'YXZ';
    A.g.rotation.y = Math.PI - r;
    A.g.rotation.x = -Math.atan2(zf - zb, 2 * L);
    A.anim(dt, D.v, { sit, lie, wag: D.wag, alert: D.v < 0.05 && !lie ? 0.4 : 0 });
    if ((D.v > 0.05 || D.wag > 0.3) && dP < 60 && inView(D.x, D.y, D.z + 0.4)) {
      const now = performance.now() / 1000;
      if (now - D.drawT > (RENDER.hq ? 1 / 40 : 1 / 20)) {
        D.drawT = now;
        markDirty();
      }
    }
  }
  let ready = false;
  whenLoaded(() => {
    load();
    // he starts beside the walker
    D.x = P.x - 1.6;
    D.y = P.y - 1.2;
    ready = true;
  });
  KERN.tick(update, 'hund');
  // wildlife flees from him (tiere/tiere.js)
  TIERE.dog = () => (D.model && D.model.g.visible ? [D.x, D.y] : null);
  D.update = update;
  D.save = save;
  D.state = () => ({
    name: D.name,
    x: +D.x.toFixed(2),
    y: +D.y.toFixed(2),
    z: +D.z.toFixed(2),
    v: +D.v.toFixed(2),
    mode: D.mode,
    still: +D.still.toFixed(1),
    visible: !!(D.model && D.model.g.visible),
    learn: D.learn,
    dist: +Math.hypot(P.x - D.x, P.y - D.y).toFixed(2),
  });
  return D;
})();
window.HUND = HUND;
