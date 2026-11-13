// ===================== feat/grenzland-licht: the mode's nights (GLLICHT) – lamps, beams and pools of the vehicles, beacons, torches, the flare, readable nights, rain at the Klinge, a grade for today =====================
// Falko, 13.11.2026 10:59 / 11:25 (package B, the cinema feel): in the review the nights were so dark that people were silhouettes and light
// came from nowhere – the flare of mission 4 a dot in the sky, the police's blue flooding the street, cars without visible headlights.
// GTA's nights are readable and full of light sources. What this module adds, all without a new light and without a new shader program:
// - the vehicles (grenzland/gl_auto.js, the player's moped and Trabant): soft beams in front of the lamps (crossed cards), a pool of light
//   on the road ahead, a glare on the lamp glass, the red glow of the tail lamps, brighter while braking (their lamp glass too) – warm
//   for 1989 and the Simson, whiter for the cars of today; only while the lamps burn;
// - the police's beacons: a blue glow at each lamp in the double flash of today's patrol cars, a blue pulse on the ground round the car;
//   the shared light that the wanted level borrows (grenzland/gl_fahndung.js 'grenzland:blau') kept short and pulsing, so that it flashes
//   on the nearest wall instead of flooding the street;
// - the helicopter's search light: a bright patch where it falls and the glare of the lamp;
// - torches: any figure of grenzland/gl_fig.js with F.lampe (set by the missions and the police), without the flag at night also the
//   officers, the guards and the police of 1989 – the lamp glass at the hand, a beam, a patch of light on the ground that goes with it;
// - the flare (KERN.emit('grenzland:flare', { x, y, z })): it climbs with a trail of smoke, pops, and burns red on its parachute for
//   about forty seconds while it sinks and drifts, sparks falling, a red glow over the forest, one borrowed light (KERN.lights.borrow)
//   that follows it, fog and sky light tinted red while it burns – then it fades;
// - readable nights: while the mode runs at night more light from the sky (the hemisphere light, moonlight blue) and a little more
//   exposure, the pools of the street lamps brighter (1989: more orange); every value comes back exactly when the mode ends;
// - rain in the Klinge night (mission „Nachts an der Klinge“, from looking at the yard to the flight home): the weather's own rain, wet
//   roads and sound (wetter/wetter.js WETTER.preset – nothing new compiled), the weather of before afterwards;
// - a grade for today's evenings: a little more contrast and colour, darker corners (the renderer's grade pass, render/render.js GRADE –
//   no CSS filter, nothing that costs on a phone), a warmer evening sun; 1989 keeps its own look (grenzland/gl_hud.js).
// The cards share one small atlas drawn here (beam, pool, glows, the patch of a torch, a star) and the program of the vehicles' shadow
// patch (grenzland/gl_modelle.js: unlit, a texture, transparent), the smoke one more small texture. By day nothing is shown and nothing is
// done but a look at the hour; on „Beenden“ everything goes. Nothing is made before the mode first needs it.
//   GLLICHT.an(on)          everything on (default) or off – for pictures before and after
//   GLLICHT.flare(x, y, z)  the flare (also on the event 'grenzland:flare')
//   GLLICHT.regnen(on|null) rain by hand (null: as the mission wants)
//   GLLICHT.stand()         numbers for the test
//   GLLICHT.blauPuls(t)     [left, right] 0…1: the beacons' double flash at time t (s)
import * as THREE from 'three';
import { cam, R, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { hemi, sun } from '../garden/env.js';
import { GRADE } from '../render/render.js';
import { DN } from '../time/daynight.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { VPROPS } from '../world/village_props.js';
import { WETTER } from '../wetter/wetter.js';
import { GL } from './gl_state.js';
import { GLFIG } from './gl_fig.js';
import { GLMOD } from './gl_modelle.js';
import { GLAUTO } from './gl_auto.js';
import { GLHELI } from './gl_heli.js';
export const GLLICHT = (() => {
  const S = {
    zeigen: true, // the switch for pictures before/after
    aktiv: false, // something of ours is in the scene or changed
    el: 30,
    lampK: 0,
    nachtK: 0,
    t: 0,
    autos: [],
    fackeln: new Map(),
    fl: null,
    regnet: false,
    regenHand: null,
    wxAlt: undefined,
    err: '',
    n: { autos: 0, kegel: 0, blau: 0, fackeln: 0 },
  };
  const V3 = THREE.Vector3,
    sst = (a, b, x) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    },
    hyp = Math.hypot;
  // ---- the beacons of today's patrol cars: a double flash, left twice, then right twice (0.84 s), each flash 70 ms ----
  function blauPuls(t) {
    const c = (((t % 0.84) + 0.84) % 0.84) / 0.84,
      f = (a, b) => (c >= a && c < b ? 1 : 0);
    return [Math.max(f(0, 0.085), f(0.17, 0.255)), Math.max(f(0.5, 0.585), f(0.67, 0.755))];
  }
  // on the clock of grenzland/gl_auto.js, which flashes the lamp glass the same way
  const puls = () => (GLAUTO.blauPuls ? GLAUTO.blauPuls(GLAUTO.blink || 0) : blauPuls(S.t));
  // ================================================================ textures ================================================================
  // the atlas (256 × 128, brightness in the colour, alpha full – the cards are added): four columns of 64 px –
  // beam (along v: 0 at the lamp), pool on the ground (v: 0 near), glow white (top) / red (bottom), the patch of a torch (top) / a star (bottom)
  const E = 1.2 / 256,
    F = 1.2 / 128;
  const REG = {
    beam: [0 + E, 0 + F, 0.25 - E, 1 - F],
    pool: [0.25 + E, 0 + F, 0.5 - E, 1 - F],
    glow: [0.5 + E, 0.5 + F, 0.75 - E, 1 - F],
    rot: [0.5 + E, 0 + F, 0.75 - E, 0.5 - F],
    spot: [0.75 + E, 0.5 + F, 1 - E, 1 - F],
    stern: [0.75 + E, 0 + F, 1 - E, 0.5 - F],
  };
  const TEX = { atlas: null, rauch: null };
  function atlas() {
    if (TEX.atlas) return TEX.atlas;
    const W = 256,
      H = 128,
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const x = cv.getContext('2d'),
      im = x.createImageData(W, H),
      d = im.data;
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        let r = 0,
          g = 0,
          b = 0;
        const col = i >> 6,
          lx = (i & 63) + 0.5;
        if (col === 0) {
          // the beam: across u (−1 … 1, soft to nothing at the edges), along a (0 at the lamp, the bottom row)
          const u = lx / 32 - 1,
            a = 1 - (j + 0.5) / H,
            side = Math.pow(Math.max(0, 1 - u * u), 2.2),
            along = sst(0, 0.06, a) * Math.pow(1 - a, 1.4) * (0.55 + 0.45 * Math.exp(-a * 5));
          r = g = b = 255 * side * along;
        } else if (col === 1) {
          // the pool: a cone of light lying on the road, widening away from the car, brightest a few metres ahead
          const u = lx / 32 - 1,
            a = 1 - (j + 0.5) / H,
            wide = 0.28 + 0.72 * a,
            side = Math.max(0, 1 - Math.pow(Math.abs(u) / wide, 2)),
            along = Math.pow(Math.sin(Math.min(1, a * 1.35) * Math.PI * 0.5), 0.7) * (1 - Math.pow(a, 2.4));
          r = g = b = 255 * side * side * along;
        } else {
          const top = j < 64,
            ly = (j & 63) + 0.5,
            dx = lx / 32 - 1,
            dy = ly / 32 - 1,
            rr = dx * dx + dy * dy,
            e = Math.pow(Math.max(0, 1 - rr), 2),
            core = Math.exp(-rr * 60) * e;
          if (col === 2) {
            const I = Math.min(1, (Math.exp(-rr * 5) * 0.75 + core * 0.6) * e);
            if (top) r = g = b = 255 * I;
            else {
              // red: the tail lamps, a whiter core
              r = 255 * I;
              g = 255 * Math.min(1, 0.12 * I + 0.55 * core);
              b = 255 * Math.min(1, 0.07 * I + 0.45 * core);
            }
          } else if (top) {
            // the patch of a torch: a disc with a soft rim, a little brighter inside
            const q = Math.sqrt(rr),
              I = (1 - sst(0.55, 1, q)) * (0.7 + 0.3 * (1 - q));
            r = g = b = 255 * Math.max(0, I);
          } else {
            // a star: the burning core of the flare, the sparks
            const I = Math.min(
              1,
              (core * 1.4 +
                Math.exp(-rr * 9) * 0.35 +
                Math.max(0, 1 - Math.abs(dx) * 9) * Math.exp(-Math.abs(dy) * 3.5) * 0.4 +
                Math.max(0, 1 - Math.abs(dy) * 9) * Math.exp(-Math.abs(dx) * 3.5) * 0.4) *
                e
            );
            r = g = b = 255 * I;
          }
        }
        const q = (j * W + i) * 4;
        d[q] = r;
        d[q + 1] = g;
        d[q + 2] = b;
        d[q + 3] = 255;
      }
    x.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    return (TEX.atlas = t);
  }
  // smoke: eight puffs side by side, each thinner than the one before (a puff fades by moving on to the next) – 512 × 64
  const RAUCH = i => [i / 8 + 0.002, 0.02, (i + 1) / 8 - 0.002, 0.98];
  function rauch() {
    if (TEX.rauch) return TEX.rauch;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 64;
    const x = cv.getContext('2d'),
      im = x.createImageData(512, 64),
      d = im.data;
    for (let j = 0; j < 64; j++)
      for (let i = 0; i < 512; i++) {
        const k = i >> 6,
          dx = ((i & 63) + 0.5) / 32 - 1,
          dy = (j + 0.5) / 32 - 1,
          rr = dx * dx + dy * dy,
          n =
            0.5 +
            0.25 * Math.sin(dx * 7.1 + dy * 3.3 + 1.7) * Math.sin(dy * 6.2 - dx * 2.1) +
            0.25 * Math.sin(dx * 13.7 - dy * 11.1 + 0.4),
          a = Math.max(0, 1 - rr) ** 1.8 * (0.62 + 0.38 * n) * (1 - k / 8),
          q = (j * 512 + i) * 4;
        d[q] = d[q + 1] = d[q + 2] = 255;
        d[q + 3] = 255 * Math.min(1, a);
      }
    x.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    return (TEX.rauch = t);
  }
  // ================================================================ materials ================================================================
  // all of the program of the vehicles' shadow patch: unlit, one texture, transparent, no depth written (the blending is no part of it)
  const MAT = {};
  function karte(name, color, opacity, normal, map) {
    const m = new THREE.MeshBasicMaterial({
      map: map || atlas(),
      color,
      transparent: true,
      opacity,
      blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    m.name = 'grenzland licht ' + name;
    return m;
  }
  function mats() {
    if (MAT.kegel) return MAT;
    // the beams and pools: today white, 1989 and the Simson warm (a bulb of the time)
    MAT.kegel = karte('kegel', 0xeef3ff, 0.2);
    MAT.kegel89 = karte('kegel 1989', 0xffcf86, 0.22);
    MAT.heck = karte('heck', 0xffffff, 0.55);
    MAT.bremse = karte('bremse', 0xffffff, 1);
    MAT.blauL = karte('blau links', 0x2f63ff, 0);
    MAT.blauR = karte('blau rechts', 0x2f63ff, 0);
    MAT.blauBoden = karte('blau boden', 0x1d46ff, 0);
    MAT.fackel = karte('fackel', 0xfff1d8, 0.5);
    MAT.fackelBoden = karte('fackel boden', 0xffeccc, 0.3);
    MAT.blauRund = karte('blau rundum', 0x2f63ff, 0);
    MAT.heli = karte('heli', 0xe6efff, 0.55);
    MAT.dunst = karte('leuchtkugel dunst', 0xff3018, 0.2);
    MAT.glut = karte('leuchtkugel glut', 0xff4020, 1);
    MAT.kern = karte('leuchtkugel kern', 0xffd8cc, 1);
    MAT.rauch = karte('rauch', 0x9a9690, 0.5, true, rauch());
    // the lamp glass while braking: the tail lamps' own material, brighter (a copy keeps its program)
    MAT.bremsLampe = GLMOD.LM.tail.clone();
    MAT.bremsLampe.emissiveIntensity = 3.4;
    return MAT;
  }
  // ================================================================ cards: geometry ================================================================
  function bau() {
    const p = [],
      u = [];
    const B = {
      tri(a, b, c, ua, ub, uc) {
        p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
      },
      // a (u0, v0), b (u1, v0), c (u0, v1), d (u1, v1) – facing where (b − a) × (c − a) points; both: the back side too
      quad(a, b, c, d, R, both) {
        const A = [R[0], R[1]],
          Bq = [R[2], R[1]],
          C = [R[0], R[3]],
          D = [R[2], R[3]];
        B.tri(a, b, c, A, Bq, C);
        B.tri(c, b, d, C, Bq, D);
        if (both) {
          B.tri(a, c, b, A, C, Bq);
          B.tri(c, d, b, C, D, Bq);
        }
      },
      // a card at p facing n, half size s (sy: half height)
      facing(pc, n, s, R, sy = s) {
        const t0 = Math.abs(n.y) > 0.9 ? new V3(0, 0, -1) : new V3(0, 1, 0),
          r = new V3().crossVectors(t0, n).normalize(),
          t = new V3().crossVectors(n, r).normalize(),
          P = (a, b) =>
            pc
              .clone()
              .addScaledVector(r, a * s)
              .addScaledVector(t, b * sy);
        B.quad(P(-1, -1), P(1, -1), P(-1, 1), P(1, 1), R);
      },
      // a beam from p along d (unit): three cards crossed along its axis, w0 wide at the lamp, w1 at the end
      beam(pc, d, L, w0, w1, R) {
        const up = Math.abs(d.y) > 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0),
          s0 = new V3().crossVectors(d, up).normalize(),
          e = pc.clone().addScaledVector(d, L);
        for (const ang of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
          const s = s0.clone().applyAxisAngle(d, ang);
          B.quad(
            pc.clone().addScaledVector(s, -w0),
            pc.clone().addScaledVector(s, w0),
            e.clone().addScaledVector(s, -w1),
            e.clone().addScaledVector(s, w1),
            R,
            true
          );
        }
      },
      // lying on the ground (up), from z0 to z1 ahead (−z), w wide
      boden(x0, h, z0, z1, wn, wf, R) {
        B.quad(new V3(x0 - wn, h, -z0), new V3(x0 + wn, h, -z0), new V3(x0 - wf, h, -z1), new V3(x0 + wf, h, -z1), R);
      },
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
        g.computeBoundingSphere();
        return g;
      },
      get n() {
        return p.length / 9;
      },
    };
    return B;
  }
  const own = (m, name) => {
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.userData.gllicht = true;
    m.castShadow = false;
    m.receiveShadow = false;
    m.renderOrder = 3;
    m.name = 'grenzland licht ' + name;
    return m;
  };
  // ---- billboards drawn anew each frame (the flare, its sparks and smoke, beacons' glows of far cars): n cards in one mesh ----
  function schar(n, mat) {
    const g = new THREE.BufferGeometry(),
      pos = new Float32Array(n * 12),
      uv = new Float32Array(n * 8),
      idx = new Uint16Array(n * 6);
    for (let i = 0; i < n; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    const pa = new THREE.BufferAttribute(pos, 3),
      ua = new THREE.BufferAttribute(uv, 2);
    pa.setUsage(THREE.DynamicDrawUsage);
    ua.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pa);
    g.setAttribute('uv', ua);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    const m = own(new THREE.Mesh(g, mat), 'schar');
    m.frustumCulled = false;
    const rx = new V3(),
      ry = new V3();
    const Q = {
      m,
      k: 0,
      begin() {
        Q.k = 0;
        cam.updateMatrixWorld();
        rx.setFromMatrixColumn(cam.matrixWorld, 0);
        ry.setFromMatrixColumn(cam.matrixWorld, 1);
      },
      // a card at (x, y, z) in three's frame, half size s, turned by rot
      card(x, y, z, s, R, rot = 0, sy = s) {
        if (Q.k >= n) return;
        const c = Math.cos(rot),
          si = Math.sin(rot),
          o = Q.k * 12,
          w = Q.k * 8;
        const ax = (rx.x * c + ry.x * si) * s,
          ay = (rx.y * c + ry.y * si) * s,
          az = (rx.z * c + ry.z * si) * s,
          bx = (ry.x * c - rx.x * si) * sy,
          by = (ry.y * c - rx.y * si) * sy,
          bz = (ry.z * c - rx.z * si) * sy;
        pos[o] = x - ax - bx;
        pos[o + 1] = y - ay - by;
        pos[o + 2] = z - az - bz;
        pos[o + 3] = x + ax - bx;
        pos[o + 4] = y + ay - by;
        pos[o + 5] = z + az - bz;
        pos[o + 6] = x - ax + bx;
        pos[o + 7] = y - ay + by;
        pos[o + 8] = z - az + bz;
        pos[o + 9] = x + ax + bx;
        pos[o + 10] = y + ay + by;
        pos[o + 11] = z + az + bz;
        uv[w] = R[0];
        uv[w + 1] = R[1];
        uv[w + 2] = R[2];
        uv[w + 3] = R[1];
        uv[w + 4] = R[0];
        uv[w + 5] = R[3];
        uv[w + 6] = R[2];
        uv[w + 7] = R[3];
        Q.k++;
      },
      end() {
        g.setDrawRange(0, Q.k * 6);
        pa.needsUpdate = true;
        ua.needsUpdate = true;
        m.visible = Q.k > 0;
      },
    };
    return Q;
  }
  // ================================================================ vehicles ================================================================
  // where the lamps are: the middle of a lamp part's vertices – two lamps (left and right) when the part is wide
  const ZENTREN = new WeakMap(),
    ZENTRUM = new WeakMap();
  function zentren(geo, eins) {
    const C = eins ? ZENTRUM : ZENTREN;
    let z = C.get(geo);
    if (z) return z;
    const a = geo.attributes.position,
      n = a.count;
    let x0 = 1e9,
      x1 = -1e9;
    for (let i = 0; i < n; i++) {
      x0 = Math.min(x0, a.getX(i));
      x1 = Math.max(x1, a.getX(i));
    }
    const two = !eins && x1 - x0 > 0.3,
      acc = two ? [new V3(), new V3()] : [new V3()],
      cnt = two ? [0, 0] : [0];
    for (let i = 0; i < n; i++) {
      const k = two && a.getX(i) > (x0 + x1) / 2 ? 1 : 0;
      acc[k].x += a.getX(i);
      acc[k].y += a.getY(i);
      acc[k].z += a.getZ(i);
      cnt[k]++;
    }
    z = acc.map((v, k) => v.multiplyScalar(1 / Math.max(1, cnt[k])));
    C.set(geo, z);
    return z;
  }
  // the lamps' parts of a vehicle's model
  function teile(root) {
    const T = {};
    root.traverse(o => {
      if (o.isMesh && /^(head|tail|brems|blau|blau2)$/.test(o.name) && !T[o.name]) T[o.name] = o;
    });
    return T;
  }
  const ERA89 = new Set([
    'trabant',
    'trabant_kombi',
    'wartburg',
    'barkas',
    'w50',
    's51',
    'schwalbe',
    'limo89',
    'klein89',
    'lkw89',
    'moped',
    'lada',
  ]);
  const GEOS = new Map();
  // one vehicle dressed with our cards (they hang in its own groups: they go with it, and with it out of the scene)
  // a: { c } a vehicle of grenzland/gl_auto.js, or { v } one of vehicles/vehicle.js (the player's)
  function anziehen(a) {
    const root = a.c ? a.c.g : a.v.g,
      typ = a.c ? a.c.typ : a.v.gl ? a.v.gl.typ : a.v.id,
      T = teile(root),
      moped = a.c ? a.c.T.form === 'moped' : /s51|moped|schwalbe/.test(typ),
      D = {
        a,
        root,
        typ,
        T,
        moped,
        warm: ERA89.has(typ),
        kegel: null,
        pool: null,
        heck: null,
        bremse: null,
        blau: [],
        boden: null,
      };
    if (!T.head) return D;
    mats();
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(),
      key = typ + (a.v ? '|spieler' : '');
    let G = GEOS.get(key);
    if (!G) {
      G = {};
      // the beams and the glare on the glass, in the lamp part's own group (for a moped: the fork – it steers and leans)
      const K = bau(),
        d = new V3(0, -Math.sin(moped ? 0.075 : 0.06), -1).normalize();
      for (const p of zentren(T.head.geometry)) {
        K.beam(p.clone().addScaledVector(d, 0.04), d, moped ? 8 : 11, moped ? 0.07 : 0.09, moped ? 1.5 : 2.0, REG.beam);
        K.facing(p.clone().addScaledVector(d, 0.03), d, moped ? 0.32 : 0.42, REG.glow);
      }
      G.kegel = K.geo();
      // the pool on the road, under the vehicle's frame (it stays flat while a moped leans)
      const P = bau();
      let zf = -1e9;
      for (const p of zentren(T.head.geometry)) {
        const w = p.clone().applyMatrix4(T.head.matrixWorld).applyMatrix4(inv);
        zf = Math.max(zf, -w.z);
      }
      if (!(zf > 0.3 && zf < 8)) zf = 2;
      if (moped) P.boden(0, 0.05, zf + 0.3, zf + 10.5, 0.5, 2.0, REG.pool);
      else P.boden(0, 0.05, zf + 0.2, zf + 15, 0.8, 3.0, REG.pool);
      G.pool = P.geo();
      // the tail lamps: a glow facing back; braking a bigger, brighter one (at the brake lamps where there are any)
      const H = bau(),
        Br = bau(),
        back = new V3(0, 0, 1);
      if (T.tail)
        for (const p of zentren(T.tail.geometry))
          H.facing(p.clone().addScaledVector(back, 0.03), back, moped ? 0.2 : 0.3, REG.rot);
      for (const p of zentren((T.brems || T.tail || T.head).geometry))
        if (T.brems || T.tail) Br.facing(p.clone().addScaledVector(back, 0.04), back, moped ? 0.34 : 0.5, REG.rot);
      G.heck = H.n ? H.geo() : null;
      G.bremse = Br.n ? Br.geo() : null;
      GEOS.set(key, G);
    }
    D.kegel = own(new THREE.Mesh(G.kegel, D.warm ? MAT.kegel89 : MAT.kegel), 'kegel');
    T.head.parent.add(D.kegel);
    D.pool = own(new THREE.Mesh(G.pool, D.warm ? MAT.kegel89 : MAT.kegel), 'pool');
    D.pool.renderOrder = 2;
    root.add(D.pool);
    if (G.heck && T.tail) {
      D.heck = own(new THREE.Mesh(G.heck, MAT.heck), 'heck');
      T.tail.parent.add(D.heck);
    }
    if (G.bremse) {
      D.bremse = own(new THREE.Mesh(G.bremse, MAT.bremse), 'bremse');
      (T.brems || T.tail).parent.add(D.bremse);
    }
    // the lamp glass that brightens while braking (vehicles of the player do it themselves)
    D.glas = a.c ? [T.brems || T.tail].filter(Boolean) : [];
    D.glas0 = D.glas.map(m => m.material);
    // beacons: a glow at each blue lamp, the pulse on the ground
    for (const [nm, m] of [
      ['blau', MAT.blauL],
      ['blau2', MAT.blauR],
    ]) {
      const t = T[nm];
      if (!t) continue;
      const K = bau();
      for (const p of zentren(t.geometry, true)) {
        const q = p.clone().add(new V3(0, 0.06, 0));
        K.quad(
          q.clone().add(new V3(-0.55, -0.4, 0)),
          q.clone().add(new V3(0.55, -0.4, 0)),
          q.clone().add(new V3(-0.55, 0.55, 0)),
          q.clone().add(new V3(0.55, 0.55, 0)),
          REG.glow,
          true
        );
        K.quad(
          q.clone().add(new V3(0, -0.4, 0.55)),
          q.clone().add(new V3(0, -0.4, -0.55)),
          q.clone().add(new V3(0, 0.55, 0.55)),
          q.clone().add(new V3(0, 0.55, -0.55)),
          REG.glow,
          true
        );
      }
      const b = own(new THREE.Mesh(K.geo(), T.blau2 ? m : MAT.blauRund), 'blaulicht');
      b.userData.rundum = !T.blau2;
      t.parent.add(b);
      D.blau.push(b);
    }
    if (D.blau.length) {
      const K = bau();
      K.boden(0, 0.07, -6, 6, 6, 6, REG.glow);
      D.boden = own(new THREE.Mesh(K.geo(), MAT.blauBoden), 'blau boden');
      D.boden.renderOrder = 2;
      root.add(D.boden);
    }
    for (const m of [D.kegel, D.pool, D.heck, D.bremse, D.boden, ...D.blau]) if (m) m.visible = false;
    return D;
  }
  function ausziehen(D) {
    for (const m of [D.kegel, D.pool, D.heck, D.bremse, D.boden, ...D.blau]) if (m && m.parent) m.parent.remove(m);
    D.glas.forEach((m, i) => {
      if (m.material === MAT.bremsLampe) m.material = D.glas0[i];
    });
  }
  // are the lamps on: the glass glows
  const brennt = D => !!(D.T.head && D.T.head.material && D.T.head.material.emissiveIntensity > 0.05);
  function bremst(D) {
    const a = D.a;
    if (a.v) return !!(a.v.st && a.v.st.brakeOn && a.v.st.engine);
    return !!a.c.bremst;
  }
  function autos(dt, show) {
    const list = [];
    for (const c of GLAUTO.cars || []) if (!c.gone) list.push(c);
    // the dressed ones that are gone
    for (let i = S.autos.length - 1; i >= 0; i--) {
      const D = S.autos[i],
        a = D.a;
      const gone = a.c ? a.c.gone || !list.includes(a.c) : !a.v.g || !a.v.g.parent;
      if (gone) {
        ausziehen(D);
        S.autos.splice(i, 1);
      }
    }
    const have = new Set(S.autos.map(D => D.a.c || D.a.v));
    if (show) {
      for (const c of list) if (!have.has(c) && c.g.visible) S.autos.push(anziehen({ c }));
      for (const v of [GLAUTO.moped, GLAUTO.trabi])
        if (v && v.g && v.g.visible && !have.has(v)) S.autos.push(anziehen({ v }));
    }
    let nk = 0,
      nb = 0;
    const [pl, pr] = puls(),
      lk = S.lampK;
    for (const D of S.autos) {
      const vis = D.root.visible,
        on = show && vis && brennt(D),
        br = show && vis && bremst(D);
      if (D.kegel && D.kegel.visible !== on) {
        D.kegel.visible = on;
        D.pool.visible = on;
        if (D.heck) D.heck.visible = on;
        markDirty();
      }
      if (on) nk++;
      if (D.bremse && D.bremse.visible !== (br && lk > 0.02)) {
        D.bremse.visible = br && lk > 0.02;
        markDirty();
      }
      // the lamp glass while braking
      for (let i = 0; i < D.glas.length; i++) {
        const want = br ? MAT.bremsLampe : D.glas0[i];
        if (D.glas[i].material !== want) {
          D.glas[i].material = want;
          markDirty();
        }
      }
      const blau = !!(show && vis && D.a.c && D.a.c.blau);
      for (const b of D.blau) b.visible = blau && lk > 0.02;
      if (D.boden) D.boden.visible = blau && lk > 0.02;
      if (blau) nb++;
    }
    // the shared materials follow the dusk; the beacons flash
    if (MAT.kegel) {
      const k = Math.max(0, lk);
      MAT.kegel.opacity = 0.2 * k;
      MAT.kegel89.opacity = 0.24 * k;
      MAT.heck.opacity = 0.55 * k;
      MAT.blauL.opacity = 1.1 * pl * k;
      MAT.blauR.opacity = 1.1 * pr * k;
      MAT.blauBoden.opacity = 0.32 * Math.max(pl, pr) * k;
      // the Volkspolizei's rotating light: a beat as its mirror turns past
      MAT.blauRund.opacity = 1.1 * Math.pow(0.5 + 0.5 * Math.sin(S.t * 2 * Math.PI * 1.6), 6) * k;
      if (nb) markDirty();
    }
    S.n.autos = S.autos.length;
    S.n.kegel = nk;
    S.n.blau = nb;
  }
  // the wanted level's blue light on the walls (grenzland/gl_fahndung.js borrows it with 24 m reach and a steady glow between the flashes,
  // which lit the whole street): kept short and dark between the flashes. A light lent from the pool, found by its colour; the owner sets it
  // anew each frame before us.
  function blauLicht(show) {
    const L = window.LIGHTS;
    if (!L || !S.n.blau) return;
    const [pl, pr] = puls();
    for (const l of L)
      if (l && l.userData && l.userData.lent && l.color && l.color.getHex() === 0x2a5cff) {
        l.distance = 12;
        l.decay = 2;
        l.intensity = show ? 46 * Math.max(pl, pr) : 0;
      }
  }
  // ================================================================ the helicopter's light ================================================================
  const HELI = { spot: null, glanz: null };
  function heli(show) {
    const H = GLHELI && GLHELI.H,
      lit = !!(show && H && GLHELI.on && GLHELI.st === 'kreist' && S.lampK > 0.3);
    if (!lit) {
      if (HELI.spot && HELI.spot.visible) {
        HELI.spot.visible = false;
        HELI.glanz.visible = false;
        markDirty();
      }
      return;
    }
    if (!HELI.spot) {
      mats();
      const K = bau();
      K.boden(0, 0, -8, 8, 8, 8, REG.spot);
      HELI.spot = own(new THREE.Mesh(K.geo(), MAT.heli), 'heli boden');
      const G = bau();
      G.facing(new V3(), new V3(0, 0, 1), 1.6, REG.glow);
      HELI.glanz = own(new THREE.Mesh(G.geo(), MAT.heli), 'heli glanz');
      scene.add(HELI.spot, HELI.glanz);
    }
    const z = KERN.ground(H.lx, H.ly),
      z0 = Number.isFinite(GLHELI.z0) ? GLHELI.z0 : 0;
    HELI.spot.position.set(H.lx, (Number.isFinite(z) ? z : z0) + 0.12, -H.ly);
    HELI.spot.rotation.y = S.t * 0.4;
    HELI.spot.visible = true;
    HELI.glanz.position.set(H.x, z0 + H.h + 0.25, -H.y);
    HELI.glanz.quaternion.copy(cam.quaternion);
    HELI.glanz.visible = true;
    markDirty();
  }
  // ================================================================ torches ================================================================
  const AMT = new Set(['wache', 'vopo', 'grenzer']);
  // who carries a torch: whom the missions or the police gave one (F.lampe); without the flag at night the officers of the police, the
  // guards and the police of 1989
  function hatLampe(F) {
    if (F.lampe === true) return true;
    if (F.lampe === false || F.lampe === 0) return false;
    if (S.nachtK < 0.35 || F.st === 'liegt' || F.rides || F.reitet) return false;
    return !!(F.cop || (F.c && AMT.has(F.c.kleid)));
  }
  let FGEO = null;
  function fackelGeo() {
    if (FGEO) return FGEO;
    const K = bau(),
      d = new V3(0, 0, -1);
    K.beam(new V3(0, 0, -0.06), d, 7, 0.035, 1.25, REG.beam);
    K.facing(new V3(0, 0, -0.05), d, 0.16, REG.glow);
    const B = bau();
    B.boden(0, 0, -1.7, 1.7, 1.3, 1.3, REG.spot);
    return (FGEO = { licht: K.geo(), boden: B.geo() });
  }
  const _h = new V3(),
    _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function fackeln(dt, show) {
    const seen = new Set();
    if (show && S.lampK > 0.05)
      for (const F of GLFIG.figs || []) {
        if (!F || F.gone || !F.g || !F.g.visible || !hatLampe(F)) continue;
        seen.add(F);
        let L = S.fackeln.get(F);
        if (!L) {
          mats();
          const G = fackelGeo();
          L = {
            licht: own(new THREE.Mesh(G.licht, MAT.fackel), 'fackel'),
            boden: own(new THREE.Mesh(G.boden, MAT.fackelBoden), 'fackel boden'),
            ph: Math.random() * 7,
          };
          L.boden.renderOrder = 2;
          scene.add(L.licht, L.boden);
          S.fackeln.set(F, L);
        }
        // the hand: the left if the right holds something
        const B = F.f && F.f.bones && (F.ding ? F.f.bones.LeftHand : F.f.bones.RightHand);
        if (B) B.getWorldPosition(_h);
        else _h.set(F.x + Math.cos(F.hd) * 0.25, (F.z || 0) + 1.0, -(F.y - Math.sin(F.hd) * 0.25));
        // where it points: ahead and down, swaying as one walks and looks about
        const walk = F.st === 'geht' ? 1 : 0.4,
          yaw = F.hd + Math.sin(S.t * 1.3 + L.ph) * 0.16 * walk + Math.sin(S.t * 0.37 + L.ph * 2) * 0.22,
          pitch = 0.2 + Math.sin(S.t * 2.1 + L.ph) * 0.04 * walk;
        _e.set(-pitch, -yaw, 0, 'YXZ');
        L.licht.position.copy(_h);
        L.licht.quaternion.setFromEuler(_e);
        L.licht.visible = true;
        const gz = Number.isFinite(F.z) ? F.z : KERN.ground(F.x, F.y),
          hh = Math.max(0.5, _h.y - gz),
          dist = Math.min(7.5, Math.max(2.2, hh / Math.tan(pitch))),
          gx = _h.x + Math.sin(yaw) * dist,
          gy = -_h.z + Math.cos(yaw) * dist,
          g2 = KERN.ground(gx, gy);
        L.boden.position.set(gx, (Number.isFinite(g2) ? g2 : gz) + 0.08, -gy);
        L.boden.rotation.y = -yaw;
        L.boden.scale.set(0.8 + dist * 0.12, 1, 1 + dist * 0.22);
        L.boden.visible = true;
      }
    for (const [F, L] of S.fackeln)
      if (!seen.has(F)) {
        scene.remove(L.licht, L.boden);
        S.fackeln.delete(F);
        markDirty();
      }
    if (S.fackeln.size) {
      MAT.fackel.opacity = 0.42 * S.lampK;
      MAT.fackelBoden.opacity = 0.34 * S.lampK;
      markDirty();
    }
    S.n.fackeln = S.fackeln.size;
  }
  // ================================================================ the flare ================================================================
  // climbs about 3 s to some 75 m, the parachute opens, it burns 40 s while it sinks and drifts, then 3 s to go out; the smoke stays a while
  const FL = { steig: 3.2, brenn: 40, aus: 3.5, hoch: 75 };
  let FB = null;
  function flareBau() {
    if (FB) return FB;
    mats();
    FB = {
      dunst: schar(2, MAT.dunst),
      glut: schar(70, MAT.glut),
      kern: schar(4, MAT.kern),
      rauch: schar(140, MAT.rauch),
    };
    FB.rauch.m.renderOrder = 4;
    FB.dunst.m.renderOrder = 5;
    FB.glut.m.renderOrder = 6;
    FB.kern.m.renderOrder = 7;
    scene.add(FB.dunst.m, FB.glut.m, FB.kern.m, FB.rauch.m);
    return FB;
  }
  function flare(x, y, z) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!Number.isFinite(z)) z = KERN.ground(x, y);
    if (!Number.isFinite(z)) z = 0;
    flareBau();
    // the wind carries it: the weather's wind direction if there is one, else from the west
    let dir = 250,
      w = 2.2;
    try {
      const c = WETTER.S && WETTER.S.cur;
      if (c && Number.isFinite(c.dir)) dir = c.dir;
      if (c && Number.isFinite(c.wind)) w = Math.max(0.8, Math.min(4, c.wind * 0.5));
    } catch (e) {}
    const a = ((dir + 180) * Math.PI) / 180;
    S.fl = {
      t: 0,
      x0: x,
      y0: y,
      z0: z,
      x,
      y,
      z,
      wx: Math.sin(a) * w * 0.45,
      wy: Math.cos(a) * w * 0.45,
      k: 0,
      rot: 0,
      puffs: [],
      sparks: [],
      pT: 0,
      sT: 0,
      seed: Math.random() * 100,
    };
    S.aktiv = true;
    markDirty();
  }
  // the red ball of the mission (grenzland/gl_kapitel1.js 'leuchtkugel', the step 'flucht' of „Nachts an der Klinge“): while our flare burns
  // it is hidden (one flare, not two); a ball that goes up without the event starts ours where it is. Looked for twice a second, only
  // while that mission runs at night.
  const KUGEL = { o: null, t: 0, seen: new WeakSet() };
  function kugel(dt) {
    if ((KUGEL.t -= dt) > 0) return;
    KUGEL.t = 0.5;
    if (GL.cur !== 'klinge' || S.lampK < 0.3) {
      KUGEL.o = null;
      return;
    }
    const o = scene.getObjectByName('grenzland leuchtkugel');
    KUGEL.o = o || null;
    if (!o || KUGEL.seen.has(o)) return;
    KUGEL.seen.add(o);
    if (!S.fl) {
      const x = o.position.x,
        y = -o.position.z,
        g = KERN.ground(x, y);
      flare(x, y, Number.isFinite(g) ? g + 1.5 : o.position.y - 2);
    }
  }
  // how bright it burns at its time t (0 … 1, a pop when the parachute opens), and a flicker
  function flareK(t) {
    if (t < FL.steig) return 0.25 + 0.2 * (t / FL.steig);
    const b = t - FL.steig;
    if (b < 0.35) return 0.45 + 1.3 * (b / 0.35);
    if (b < 1.4) return 1.75 - 0.75 * ((b - 0.35) / 1.05);
    if (b < FL.brenn) return 1;
    return Math.max(0, 1 - (b - FL.brenn) / FL.aus);
  }
  function flareTick(dt) {
    const f = S.fl;
    if (!f) return;
    f.t += dt;
    const t = f.t,
      end = FL.steig + FL.brenn + FL.aus;
    // the path: up fast (slowing), then sinking slowly on the parachute, drifting with the wind
    if (t < FL.steig) {
      const q = t / FL.steig;
      f.z = f.z0 + 2 + FL.hoch * (1 - Math.pow(1 - q, 2.2));
      f.x = f.x0 + f.wx * t * 0.6;
      f.y = f.y0 + f.wy * t * 0.6;
    } else if (t < end) {
      f.z -= dt * (0.9 + 0.25 * Math.sin(t * 0.7));
      f.x += dt * (f.wx + Math.sin(t * 0.31 + f.seed) * 0.35);
      f.y += dt * (f.wy + Math.cos(t * 0.27 + f.seed) * 0.35);
    }
    const flick = 0.86 + 0.08 * Math.sin(t * 23.1 + f.seed) + 0.06 * Math.sin(t * 57.7) + 0.05 * (Math.random() - 0.5);
    f.k = t < end ? flareK(t) * flick : 0;
    f.rot += dt * 0.6;
    // smoke: a trail behind it while it climbs, a thin plume over it while it burns – the puffs grow, rise a little, drift, thin out
    f.pT -= dt;
    if (t < end - 1 && f.pT <= 0) {
      const climb = t < FL.steig;
      f.pT = climb ? 0.035 : 0.22;
      f.puffs.push({
        x: f.x + (Math.random() - 0.5) * 0.3,
        y: f.y + (Math.random() - 0.5) * 0.3,
        z: f.z + (climb ? -0.5 : 0.6),
        s: climb ? 0.7 : 0.5,
        g: climb ? 1.2 : 0.75,
        age: 0,
        life: climb ? 9 : 7,
        rot: Math.random() * 6.3,
      });
      if (f.puffs.length > 130) f.puffs.shift();
    }
    // sparks: falling, dying out
    f.sT -= dt;
    if (t > 0.2 && t < end - 1.5 && f.sT <= 0) {
      f.sT = t < FL.steig ? 0.03 : 0.07;
      f.sparks.push({
        x: f.x,
        y: f.y,
        z: f.z - 0.3,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        vz: -1 - Math.random() * 2,
        age: 0,
        life: 0.8 + Math.random() * 1.1,
      });
      if (f.sparks.length > 60) f.sparks.shift();
    }
    for (const p of f.puffs) {
      p.age += dt;
      p.s += dt * p.g * (1 - p.age / p.life) * 0.9;
      p.z += dt * 0.35;
      p.x += dt * f.wx * 0.8;
      p.y += dt * f.wy * 0.8;
    }
    f.puffs = f.puffs.filter(p => p.age < p.life);
    for (const s of f.sparks) {
      s.age += dt;
      s.vz -= dt * 6;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
    }
    f.sparks = f.sparks.filter(s => s.age < s.life);
    // draw: the glow over the land, the halo, the burning star, the sparks; the smoke lit red by it
    const B = FB,
      k = f.k,
      X = f.x,
      Y = f.z,
      Z = -f.y,
      burn = t >= FL.steig ? 1 : 0.3;
    B.dunst.begin();
    B.glut.begin();
    B.kern.begin();
    if (k > 0.002) {
      // the red haze in the air round it, the halo, the white-hot star
      B.dunst.card(X, Y, Z, 60 * burn, REG.glow, 0);
      B.glut.card(X, Y, Z, 13 * (0.55 + 0.45 * Math.min(1.2, k)), REG.glow, 0);
      B.kern.card(X, Y, Z, 4.2 * (0.7 + 0.3 * k), REG.stern, f.rot);
      B.kern.card(X, Y, Z, 1.3, REG.glow, 0);
    }
    for (const s of f.sparks) {
      const q = 1 - s.age / s.life;
      B.glut.card(s.x, s.z, -s.y, 0.42 * q + 0.07, REG.stern, s.age * 3);
    }
    B.dunst.end();
    B.glut.end();
    B.kern.end();
    MAT.dunst.opacity = 0.16 * Math.min(1.2, k);
    MAT.glut.opacity = Math.min(1, 0.25 + 0.75 * k);
    MAT.kern.opacity = Math.min(1, 0.35 + 0.65 * k);
    B.rauch.begin();
    for (const p of f.puffs) {
      const q = p.age / p.life,
        dens = sst(0, 0.06, q) * (1 - q),
        cell = Math.max(0, Math.min(7, Math.round((1 - dens) * 7)));
      B.rauch.card(p.x, p.z, -p.y, p.s, RAUCH(cell), p.rot);
    }
    B.rauch.end();
    // the smoke: grey, reddened by the light while it burns
    const rk = Math.min(1, k);
    MAT.rauch.color.setRGB(0.3 + 0.55 * rk, 0.27 + 0.05 * rk, 0.26 + 0.03 * rk);
    MAT.rauch.opacity = 0.42;
    markDirty();
    if (t > end + 9 && !f.puffs.length) {
      S.fl = null;
      flareLeer();
    }
  }
  // nothing of the flare drawn
  function flareLeer() {
    if (!FB) return;
    for (const b of [FB.dunst, FB.glut, FB.kern, FB.rauch]) {
      b.begin();
      b.end();
    }
  }
  // the light of the flare: one of the shared lights, red, where it burns
  KERN.lights.borrow({
    id: 'grenzland:leuchtkugel',
    n: 1,
    prio: 8,
    want: () => !!(GL.on && S.zeigen && S.fl && S.fl.k > 0.01),
    on: ls => {
      const l = ls[0];
      l.color.setRGB(1, 0.16, 0.08);
      l.distance = 190;
      l.decay = 1;
      l.intensity = 0;
    },
    tick: ls => {
      const l = ls[0],
        f = S.fl;
      if (!f) {
        l.intensity = 0;
        return;
      }
      l.position.set(f.x, f.z - 1.5, -f.y);
      l.intensity = 42 * Math.min(1.4, f.k);
      markDirty();
    },
  });
  // ================================================================ what someone else owns, lifted while we run ================================================================
  // a number someone else sets (the day's light, the exposure, the grade): what they set is the base, we set f(base); back exactly at the end
  function zahl(get, set) {
    return { get, set, base: undefined, mine: undefined };
  }
  function heben(o, f) {
    const cur = o.get();
    if (o.mine === undefined || cur !== o.mine) o.base = cur;
    const v = f(o.base);
    if (v !== cur) o.set(v);
    o.mine = v;
  }
  function lassen(o) {
    if (o.mine === undefined) return;
    if (o.get() === o.mine) o.set(o.base);
    o.mine = undefined;
  }
  // a colour likewise (r, g, b)
  function farbe(c) {
    return { c, base: new THREE.Color(), mine: null };
  }
  function faerben(o, f) {
    const c = o.c;
    if (!o.mine || c.r !== o.mine.r || c.g !== o.mine.g || c.b !== o.mine.b) o.base.copy(c);
    f(c.copy(o.base));
    o.mine = c.clone();
  }
  function entfaerben(o) {
    if (!o.mine) return;
    const c = o.c;
    if (c.r === o.mine.r && c.g === o.mine.g && c.b === o.mine.b) c.copy(o.base);
    o.mine = null;
  }
  const LIFT = {
    hemi: zahl(
      () => hemi.intensity,
      v => (hemi.intensity = v)
    ),
    sun: zahl(
      () => sun.intensity,
      v => (sun.intensity = v)
    ),
    con: zahl(
      () => GRADE.contrast.value,
      v => (GRADE.contrast.value = v)
    ),
    sat: zahl(
      () => GRADE.sat.value,
      v => (GRADE.sat.value = v)
    ),
    vig: zahl(
      () => GRADE.vig.value,
      v => (GRADE.vig.value = v)
    ),
    sky: farbe(hemi.color),
    ground: farbe(hemi.groundColor),
    sunC: farbe(sun.color),
    fog: null,
    pool: null,
  };
  // the exposure: render/modes.js sets it every frame (and GAME.shot right before drawing) – while we run the renderer's value is read as
  // theirs times ours (as grenzland/gl_1989_welt.js reads the fog)
  const EXPO = { on: false, base: 1, k: 1 };
  function expoAn() {
    if (EXPO.on) return;
    const d = Object.getOwnPropertyDescriptor(R, 'toneMappingExposure');
    if (!d || d.get || !d.configurable) return;
    EXPO.base = R.toneMappingExposure;
    EXPO.on = true;
    Object.defineProperty(R, 'toneMappingExposure', {
      configurable: true,
      enumerable: true,
      get: () => EXPO.base * EXPO.k,
      set: v => {
        EXPO.base = v;
      },
    });
  }
  function expoAus() {
    if (!EXPO.on) return;
    EXPO.on = false;
    delete R.toneMappingExposure;
    R.toneMappingExposure = EXPO.base;
  }
  const MOND = new THREE.Color(0.6, 0.72, 1.0),
    MONDB = new THREE.Color(0.13, 0.15, 0.2),
    ROT = new THREE.Color(1.0, 0.14, 0.08),
    ROTF = new THREE.Color(0.3, 0.035, 0.025),
    WARM = new THREE.Color(1.0, 0.68, 0.4);
  function licht(show) {
    const n = show ? S.nachtK : 0,
      f = S.fl,
      fk = show && f ? Math.min(1, f.k) : 0,
      heute = GL.era !== '1989',
      // the flare's red: strongest near it (the forest it hangs over), still a glow from far
      fd = f ? hyp(f.x - cam.position.x, f.y + cam.position.z) : 1e9,
      rk = fk * (fd < 140 ? 1 : Math.max(0.25, 1 - (fd - 140) / 300));
    if (!show || (n < 0.001 && rk < 0.001 && !heute)) {
      lassen(LIFT.hemi);
      entfaerben(LIFT.sky);
      entfaerben(LIFT.ground);
      EXPO.k = 1;
      expoAus();
    } else {
      // readable nights: more light from the sky, moonlight blue; a little more exposure
      heben(LIFT.hemi, b => b + 0.075 * n + 0.07 * rk);
      faerben(LIFT.sky, c => c.lerp(MOND, 0.7 * n).lerp(ROT, 0.75 * rk));
      faerben(LIFT.ground, c => c.lerp(MONDB, 0.6 * n).lerp(ROTF, 0.6 * rk));
      expoAn();
      EXPO.k = 1 + 0.28 * n;
    }
    // the fog reddened while the flare burns
    if (scene.fog && scene.fog.color) {
      if (!LIFT.fog || LIFT.fog.c !== scene.fog.color) LIFT.fog = farbe(scene.fog.color);
      if (show && rk > 0.001) faerben(LIFT.fog, c => c.lerp(ROTF, 0.85 * rk));
      else entfaerben(LIFT.fog);
    }
    // the street lamps' pools on the ground: brighter (1989: more orange)
    const pm = VPROPS.pool && VPROPS.pool.material;
    if (pm && pm.color) {
      if (!LIFT.pool || LIFT.pool.c !== pm.color) LIFT.pool = farbe(pm.color);
      if (show && n > 0.01)
        faerben(LIFT.pool, c => {
          c.multiplyScalar(1 + 0.9 * n);
          if (!heute) c.setRGB(c.r * 1.08, c.g * 0.86, c.b * 0.55);
        });
      else entfaerben(LIFT.pool);
    }
    // the grade for today: more contrast and colour, darker corners (at night more); the evening sun warmer
    if (show && heute) {
      heben(LIFT.con, b => b + 0.05 + 0.02 * n);
      heben(LIFT.sat, b => b + 0.06 - 0.04 * n);
      heben(LIFT.vig, b => b + 0.2 + 0.12 * n);
      const gold = sst(16, 6, S.el) * sst(-2, 2, S.el);
      if (gold > 0.001) faerben(LIFT.sunC, c => c.lerp(WARM, 0.22 * gold));
      else entfaerben(LIFT.sunC);
    } else {
      lassen(LIFT.con);
      lassen(LIFT.sat);
      lassen(LIFT.vig);
      entfaerben(LIFT.sunC);
    }
  }
  // ================================================================ rain at the Klinge ================================================================
  // from looking at the yard to the flight home (mission 'klinge', steps 1 … 4), at night: the weather's own rain
  function regenWill() {
    if (S.regenHand !== null) return S.regenHand;
    const m = GL.cur === 'klinge' && GL.m && GL.m.klinge;
    return !!(m && m.st === 'läuft' && m.i >= 1 && m.i <= 4 && S.nachtK > 0.2 && GL.era !== '1989');
  }
  function regen(want) {
    if (want === S.regnet) return;
    try {
      if (want) {
        S.wxAlt = WETTER.state().preset;
        WETTER.preset('regen');
      } else {
        if (WETTER.state().preset === 'regen') WETTER.preset(S.wxAlt || null);
        S.wxAlt = undefined;
      }
      S.regnet = want;
    } catch (e) {
      S.err = 'regen: ' + e;
      S.regnet = want;
    }
  }
  // ================================================================ per frame ================================================================
  function himmel() {
    const s = DN && DN.active && DN.state;
    if (s && Number.isFinite(s.sunEl)) return s.sunEl;
    return VAUTO.dark && VAUTO.dark() ? -12 : 30;
  }
  let rT = 0;
  function tick(dt) {
    if (!GL.on) {
      if (S.aktiv) aus();
      return;
    }
    S.t += dt;
    S.el = himmel();
    S.lampK = sst(4, -3, S.el);
    S.nachtK = sst(-2, -11, S.el);
    const show = S.zeigen;
    S.aktiv = true;
    try {
      autos(dt, show);
      blauLicht(show);
      heli(show);
      fackeln(dt, show);
      kugel(dt);
      if (S.fl && show) flareTick(dt);
      else if (FB && !show) flareLeer();
      if (KUGEL.o && KUGEL.o.visible === !!(S.fl && show)) KUGEL.o.visible = !(S.fl && show);
      licht(show);
      if ((rT -= dt) <= 0) {
        rT = 0.5;
        regen(show && regenWill());
      }
    } catch (e) {
      if (!S.err) console.warn('grenzland licht', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
    }
  }
  // everything away, every value back (the mode's end)
  function aus() {
    for (const D of S.autos) ausziehen(D);
    S.autos.length = 0;
    for (const [, L] of S.fackeln) scene.remove(L.licht, L.boden);
    S.fackeln.clear();
    if (HELI.spot) {
      scene.remove(HELI.spot, HELI.glanz);
      HELI.spot = HELI.glanz = null;
    }
    S.fl = null;
    if (FB) {
      for (const b of [FB.dunst, FB.glut, FB.kern, FB.rauch]) {
        scene.remove(b.m);
        b.m.geometry.dispose();
      }
      FB = null;
    }
    licht(false);
    regen(false);
    S.n = { autos: 0, kegel: 0, blau: 0, fackeln: 0 };
    S.aktiv = false;
    markDirty(true);
  }
  KERN.tick(tick, 'grenzland/licht', { late: true });
  KERN.on('grenzland:flare', d => {
    if (GL.on && d) flare(+d.x, +d.y, +d.z);
  });
  KERN.on('grenzland:stop', () => aus());
  KERN.on('grenzland:era', () => {
    // another time: the flare and the rain do not go along
    S.fl = null;
    flareLeer();
    regen(false);
  });
  function an(on) {
    S.zeigen = on !== false;
    if (!S.zeigen) {
      for (const D of S.autos) ausziehen(D);
      S.autos.length = 0;
    }
    markDirty(true);
  }
  const stand = () => ({
    on: !!GL.on,
    an: S.zeigen,
    el: +S.el.toFixed(1),
    lampK: +S.lampK.toFixed(2),
    nachtK: +S.nachtK.toFixed(2),
    autos: S.n.autos,
    kegel: S.n.kegel,
    blau: S.n.blau,
    fackeln: S.n.fackeln,
    flare: S.fl
      ? { t: +S.fl.t.toFixed(1), k: +S.fl.k.toFixed(2), z: +(S.fl.z - S.fl.z0).toFixed(1), puffs: S.fl.puffs.length }
      : null,
    regen: S.regnet,
    hemi: +hemi.intensity.toFixed(3),
    expo: +R.toneMappingExposure.toFixed(3),
    grade: [GRADE.contrast.value, GRADE.sat.value, GRADE.vig.value].map(v => +v.toFixed(3)),
    heli: !!(HELI.spot && HELI.spot.visible),
    err: S.err,
  });
  return Object.assign(S, {
    an,
    flare,
    regnen: v => {
      S.regenHand = v === null || v === undefined ? null : !!v;
      rT = 0;
    },
    stand,
    blauPuls,
    tick,
    aus,
  });
})();
window.GLLICHT = GLLICHT;
