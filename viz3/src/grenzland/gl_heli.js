// ===================== feat/grenzland: the police helicopter of four stars (GLHELI) =====================
// What it does is grenzland/gl_logik.js (GLLOGIK.heli, tested without a browser): it flies in from far, circles over where the player
// was last seen – over him while it sees him –, and sees whoever is in the open: by day all round, at night what its search light
// falls on; never through a roof or the canopy of a forest – then the player must hide. What it sees, the police on the ground know
// (GLFAHNDUNG.luft). Here is what one sees and hears of it: a model without a brand (a light twin-engined machine in blue and silver,
// vertex colours in the traffic's material – no new shader program by day), the rotors turning, the chop of the blades (synthesised,
// on the effects bus), and at night the search light: one of the game's shared point lights where the beam hits the ground
// (KERN.lights.borrow – no new lamp) and a faint cone of light from the machine down to it.
//   GLHELI.on · st: 'weg' | 'anflug' | 'kreist' | 'abflug' · sieht · tick(dt) · stop() · stand() → { on, st, x, y, h, d, sieht }
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { PLAY } from '../game/play.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
export const GLHELI = (() => {
  const H = GLLOGIK.heli();
  const S = {
    on: false,
    st: 'weg',
    sieht: false,
    fly: true,
    err: null,
    g: null,
    rotor: null,
    tail: null,
    cone: null,
    snd: null,
    z0: 0,
    yaw: 0,
    roll: 0,
    H,
  };
  const hyp = Math.hypot;
  const dark = () => !!(VAUTO.dark && VAUTO.dark());
  // ---- the model: cabin with a glazed nose, engine cowl, tail boom with fin and tailplane, skids; the rotors as their own meshes ----
  let GEO = null;
  function geos() {
    if (GEO) return GEO;
    const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
      L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)],
      BLAU = L(28, 52, 110),
      SILBER = L(200, 204, 208),
      GLAS = L(20, 26, 32),
      DUNKEL = L(26, 27, 30),
      GELB = L(206, 224, 62);
    const k = VPROPS.kit();
    // a tube between two rectangles: at y0 (width w0, from z a0 to b0) and at y1 (w1, a1 to b1)
    const rohr = (y0, w0, a0, b0, y1, w1, a1, b1, col, caps) => {
      if (y1 < y0) return rohr(y1, w1, a1, b1, y0, w0, a0, b0, col, caps);
      const A = [
          [-w0 / 2, y0, a0],
          [w0 / 2, y0, a0],
          [w0 / 2, y0, b0],
          [-w0 / 2, y0, b0],
        ],
        B = [
          [-w1 / 2, y1, a1],
          [w1 / 2, y1, a1],
          [w1 / 2, y1, b1],
          [-w1 / 2, y1, b1],
        ];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        k.quad(A[j], A[i], B[i], B[j], col);
      }
      if (caps) {
        k.quad(A[0], A[1], A[2], A[3], col);
        k.quad(B[1], B[0], B[3], B[2], col);
      }
    };
    // (y forward, z up; the cabin's floor at z = 0.55 above the skids)
    rohr(-1.5, 1.5, 0.55, 2.0, 1.2, 1.5, 0.55, 2.0, BLAU, false); // cabin
    rohr(-1.5, 1.52, 0.55, 1.0, 1.2, 1.52, 0.55, 1.0, SILBER, false); // its silver belly
    rohr(-1.5, 1.53, 1.0, 1.08, 1.2, 1.53, 1.0, 1.08, GELB, false); // a thin stripe
    rohr(1.2, 1.5, 0.55, 2.0, 2.45, 0.7, 0.7, 1.35, GLAS, true); // the glazed nose
    rohr(1.2, 1.52, 0.55, 1.0, 2.2, 0.9, 0.62, 0.95, SILBER, false); // the chin under it
    rohr(-1.5, 1.5, 0.55, 2.0, -2.6, 0.5, 1.25, 1.85, BLAU, true); // the cabin's back, drawn in to the boom
    rohr(-2.6, 0.38, 1.4, 1.8, -6.6, 0.2, 1.75, 1.95, BLAU, true); // tail boom
    rohr(-6.0, 0.08, 1.7, 2.0, -6.9, 0.08, 2.6, 3.1, BLAU, true); // fin
    k.box(0, -5.6, 1.8, 2.0, 0.5, 0.05, 0, SILBER, true); // tailplane
    for (const sx of [-1, 1]) k.box(sx * 1.0, -5.6, 1.6, 0.05, 0.5, 0.5, 0, BLAU, true); // its end plates
    k.box(0, -0.4, 2.0, 1.1, 2.3, 0.4, 0, SILBER, true); // engine cowl
    k.cyl(0, -0.2, 2.4, 2.72, 0.09, 0.07, 8, DUNKEL, true); // mast
    for (const sx of [-1, 1]) {
      k.box(sx * 0.95, 0.1, 0, 0.08, 3.3, 0.08, 0, DUNKEL, true); // skid
      for (const sy of [-0.8, 1.0]) k.box(sx * 0.82, sy, 0.06, 0.06, 0.06, 0.55, 0, DUNKEL); // struts
    }
    k.box(0, 2.0, 0.42, 0.26, 0.3, 0.2, 0, DUNKEL, true); // the search light's housing under the nose
    const body = k.geo();
    // main rotor: four blades round the mast (turns about z)
    const kr = VPROPS.kit();
    for (let i = 0; i < 4; i++)
      kr.box(
        Math.cos((i * Math.PI) / 2) * 2.6,
        Math.sin((i * Math.PI) / 2) * 2.6,
        0,
        i % 2 ? 0.22 : 5.2,
        i % 2 ? 5.2 : 0.22,
        0.035,
        0,
        DUNKEL,
        true
      );
    kr.cyl(0, 0, -0.04, 0.1, 0.2, 0.16, 8, DUNKEL, true);
    const rotor = kr.geo();
    // tail rotor: two blades in the plane of the fin (turns about x)
    const kt = VPROPS.kit();
    kt.box(0, 0, -0.55, 0.03, 0.14, 1.1, 0, DUNKEL, true);
    kt.box(0, 0, -0.07, 0.03, 1.1, 0.14, 0, DUNKEL, true);
    const tail = kt.geo();
    // the cone of the search light: its tip at the origin, opening downwards (−y of three) to a circle of radius 1 at distance 1
    const cone = new THREE.ConeGeometry(1, 1, 20, 1, true);
    cone.translate(0, -0.5, 0);
    return (GEO = { body, rotor, tail, cone });
  }
  let coneMat = null;
  function build() {
    if (S.g) return;
    const G = geos(),
      own = m => {
        m.userData.noMerge = true;
        m.userData.shared = true;
        m.castShadow = false;
        m.receiveShadow = false;
        m.frustumCulled = false;
        return m;
      };
    const g = new THREE.Group();
    g.name = 'grenzland hubschrauber';
    g.add(own(new THREE.Mesh(G.body, VFIG.mat())));
    S.rotor = own(new THREE.Mesh(G.rotor, VFIG.mat()));
    S.rotor.position.set(0, 2.76, 0.2);
    S.tail = own(new THREE.Mesh(G.tail, VFIG.mat()));
    S.tail.position.set(0.14, 2.75, 6.75);
    g.add(S.rotor, S.tail);
    scene.add(g);
    S.g = g;
    if (!coneMat)
      coneMat = new THREE.MeshBasicMaterial({
        color: 0xbcd0ff,
        transparent: true,
        opacity: 0.085,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      });
    S.cone = own(new THREE.Mesh(G.cone, coneMat));
    S.cone.name = 'grenzland suchscheinwerfer';
    S.cone.visible = false;
    S.cone.renderOrder = 5;
    scene.add(S.cone);
    markDirty(true);
  }
  function drop() {
    if (S.g) scene.remove(S.g);
    if (S.cone) scene.remove(S.cone);
    S.g = S.rotor = S.tail = S.cone = null;
    markDirty(true);
  }
  // ---- the sound: the chop of the blades (noise, switched by the blade frequency) over a low hum; louder the nearer ----
  function ton(on, d) {
    const R = GLTON.raw();
    if (!R) return;
    if (!on) {
      if (S.snd) {
        const s = S.snd;
        S.snd = null;
        try {
          s.out.gain.setTargetAtTime(0, R.ctx.currentTime, 0.4);
          setTimeout(() => {
            try {
              s.src.stop();
              s.lfo.stop();
              s.hum.stop();
            } catch (e) {}
          }, 1800);
        } catch (e) {}
      }
      return;
    }
    try {
      if (!S.snd) {
        const c = R.ctx,
          buf = c.createBuffer(1, c.sampleRate, c.sampleRate),
          dd = buf.getChannelData(0);
        let s = 4711;
        for (let i = 0; i < dd.length; i++) {
          s = (s * 1664525 + 1013904223) | 0;
          dd[i] = (s >>> 8) / 8388608 - 1;
        }
        const src = c.createBufferSource(),
          lp = c.createBiquadFilter(),
          am = c.createGain(),
          lfo = c.createOscillator(),
          lg = c.createGain(),
          hum = c.createOscillator(),
          hl = c.createBiquadFilter(),
          hg = c.createGain(),
          out = c.createGain();
        src.buffer = buf;
        src.loop = true;
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        am.gain.value = 0.55;
        lfo.type = 'sawtooth';
        lfo.frequency.value = 13.5;
        lg.gain.value = 0.45;
        lfo.connect(lg);
        lg.connect(am.gain);
        src.connect(lp);
        lp.connect(am);
        am.connect(out);
        hum.type = 'sawtooth';
        hum.frequency.value = 27;
        hl.type = 'lowpass';
        hl.frequency.value = 130;
        hg.gain.value = 0.5;
        hum.connect(hl);
        hl.connect(hg);
        hg.connect(out);
        out.gain.value = 0;
        out.connect(R.sfx);
        src.start();
        lfo.start();
        hum.start();
        S.snd = { src, lfo, hum, out };
      }
      S.snd.out.gain.setTargetAtTime(0.42 * GLTON.vol(d, 950), R.ctx.currentTime, 0.25);
    } catch (e) {}
  }
  // ---- the search light on the ground at night: one of the shared point lights ----
  KERN.lights.borrow({
    id: 'grenzland:heli',
    n: 1,
    prio: 5,
    want: () => GL.on && S.on && S.st === 'kreist' && dark(),
    on: ls => {
      const l = ls[0];
      l.color.setHex(0xdfe8ff);
      l.distance = 30;
      l.decay = 1.3;
      l.intensity = 0;
    },
    tick: ls => {
      const l = ls[0],
        z = KERN.ground(H.lx, H.ly);
      l.position.set(H.lx, (Number.isFinite(z) ? z : S.z0) + 7, -H.ly);
      l.intensity = 90;
      markDirty();
    },
  });
  const _d = new THREE.Vector3(),
    _up = new THREE.Vector3(0, -1, 0);
  // (an error in here must not stop the frame for the modules that tick after this one)
  function tick(dt) {
    if (!GL.on) return;
    try {
      flug(dt);
    } catch (e) {
      if (!S.err) console.warn('grenzland heli', e);
      S.err = String((e && e.stack) || e).slice(0, 400);
      try {
        stop();
      } catch (e2) {}
    }
  }
  function flug(dt) {
    const W = GL.W,
      q = GLFAHNDUNG.wo(),
      K = GLLOGIK.kraefte(GLLOGIK.starsOf(W.heat), GL.era),
      p = { x: q.x, y: q.y, veh: !!q.veh, hidden: GLFAHNDUNG.hidden, cover: GLFAHNDUNG.krone },
      dk = dark();
    const evs = H.tick(dt, p, { want: K.heli && !GLFAHNDUNG.off, last: GLFAHNDUNG.last, dark: dk, delay: 12 });
    S.on = H.on;
    S.st = H.st;
    S.sieht = H.sieht;
    GLFAHNDUNG.luft = H.on ? { seen: H.sieht } : null;
    GLFAHNDUNG.heli = H.on ? [H.x, H.y] : null;
    for (const e of evs) {
      if (e === 'anflug') {
        PLAY.think(GLDATA.T.heli, 3600);
        GLFAHNDUNG.funk('heli', 6);
        GL.emit('heli', { on: true });
      } else if (e === 'weg') GL.emit('heli', { on: false });
    }
    if (!H.on) {
      if (S.g) {
        drop();
        ton(false);
      }
      return;
    }
    build();
    // above the ground of the middle of its circle (far out the terrain may not be loaded)
    const z = KERN.ground(H.cx, H.cy);
    if (Number.isFinite(z)) S.z0 = z;
    const y = S.z0 + H.h;
    // the nose turns into the flight path, the machine banks into its circle
    let dy = H.hd - S.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    S.yaw += dy * Math.min(1, dt * 2.2);
    S.roll += ((H.st === 'kreist' ? 0.24 : 0) - S.roll) * Math.min(1, dt * 1.5);
    S.g.position.set(H.x, y, -H.y);
    S.g.rotation.set(H.st === 'kreist' ? -0.03 : -0.12, -S.yaw, -S.roll, 'YXZ');
    S.rotor.rotation.y += dt * 41;
    S.tail.rotation.x += dt * 97;
    // the cone of light from under the nose to where the light falls
    const lit = dk && H.st === 'kreist';
    S.cone.visible = lit;
    if (lit) {
      const gz = KERN.ground(H.lx, H.ly),
        lz = Number.isFinite(gz) ? gz : S.z0;
      _d.set(H.lx - H.x, lz - (y + 0.4), -(H.ly - H.y));
      const len = _d.length() || 1;
      S.cone.position.set(H.x, y + 0.4, -H.y);
      S.cone.quaternion.setFromUnitVectors(_up, _d.multiplyScalar(1 / len));
      S.cone.scale.set(H.KEGEL, len, H.KEGEL);
    }
    ton(true, hyp(H.x - q.x, H.y - q.y, H.h));
    markDirty();
  }
  function stop() {
    H.clear();
    S.on = false;
    S.st = 'weg';
    S.sieht = false;
    GLFAHNDUNG.luft = null;
    GLFAHNDUNG.heli = null;
    drop();
    ton(false);
  }
  const stand = () => ({
    on: H.on,
    st: H.st,
    x: Math.round(H.x),
    y: Math.round(H.y),
    h: Math.round(H.h),
    d: Math.round(hyp(H.x - H.cx, H.y - H.cy)),
    sieht: H.sieht,
    licht: [Math.round(H.lx), Math.round(H.ly)],
    modell: !!S.g,
    kegel: !!(S.cone && S.cone.visible),
  });
  // the search is over at once (an arrest, new clothes, the mode's end): it flies off
  return Object.assign(S, { tick, stop, stand, sees: () => H.sieht });
})();
window.GLHELI = GLHELI;
