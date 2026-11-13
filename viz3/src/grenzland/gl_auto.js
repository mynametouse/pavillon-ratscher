// ===================== feat/grenzland: the vehicles of the mode in the world – driving along the roads, the player's moped (GLAUTO) =====================
// The models are grenzland/gl_modelle.js (GLMOD). Here they drive: a road graph of the whole square from the OSM ways
// (verkehr/verkehr_netz.js, pure), routes shortest in time, a line with the right-hand lane and speeds per metre; a car follows its line
// with both axles (the body turns like a real car), stands on the ground, brakes for whatever it is told to stop for; a moped leans into
// the curve and turns its handlebar. The lamps glow at night, the beacons flash, the nearest horn is heard (grenzland/gl_ton.js).
// The player's moped is a vehicle of vehicles/vehicle.js (id 'gl-moped'), made when the mode first needs it: a Simson S 51 – 3.7 PS,
// four gears, a little over 60 km/h, 165 kg with its rider; it leans into the curve (the eyes and the figure go with it), and on top of
// the vehicle's engine sound it has a two-stroke's own voice (the ring of the exhaust, the rattle between the firings, the uneven idle).
//   GLAUTO.spawn(typ, o) → c · park(c, x, y, hd) · onLine(c, line, s, v) · drive(c, dt, { k, vmax, acc, halt, stopS }) · remove(c)
//   GLAUTO.route([x, y], [x, y], { k, aLat, vEnd, lane }) → line · netz() · nodeNear(x, y) · zufahrten() · mopedAt(x, y, hd) · mopedHide()
//   GLAUTO.trabiAt(x, y, hd) · trabiHide()   the Trabant 601 to drive in 1989 (id 'gl-trabi'); GLAUTO.moped, GLAUTO.trabi: the vehicles
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { ROADS } from '../world/roads.js';
import { CAM3 } from '../game/player.js';
import { VEH } from '../vehicles/vehicle.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLMOD } from './gl_modelle.js';
export const GLAUTO = (() => {
  const S = { cars: [], n: 0, G: null, moped: null, trabi: null, blink: 0, zt: null };
  const TYP = GLMOD.TYP,
    LM = GLMOD.LM;
  // ---- a vehicle of the mode in the world ----
  // o: { col, col2, band, band2, bar: 'balken' | 'rundum', place }
  function spawn(typ, o = {}) {
    const M = GLMOD.bau(typ, o);
    if (!M) return null;
    const T = M.T,
      g = M.g,
      c = {
        id: ++S.n,
        typ,
        T,
        g,
        o,
        line: null,
        s: 0,
        v: 0,
        lat: 0,
        x: 0,
        y: 0,
        z: 0,
        hd: 0,
        spin: 0,
        blau: false,
        horn: false,
        parts: M.parts,
        tilt: M.tilt,
        seat: M.seat,
        mod: M,
      };
    if (T.form !== 'moped') {
      // solid for the player's vehicle and for the walker (vehicles/vehicle.js VEH.extra)
      c.box = {
        box: () =>
          c.g.visible
            ? {
                c: [c.x + Math.sin(c.hd) * T.cy, c.y + Math.cos(c.hd) * T.cy],
                ax: [Math.cos(c.hd), -Math.sin(c.hd)],
                ay: [Math.sin(c.hd), Math.cos(c.hd)],
                ex: T.hw,
                ey: T.hl,
                z0: c.z,
                z1: c.z + 1.5,
              }
            : null,
        grenzland: c,
      };
      if (VEH && VEH.extra) VEH.extra.push(c.box);
    }
    S.cars.push(c);
    return c;
  }
  function remove(c) {
    if (!c) return;
    const i = S.cars.indexOf(c);
    if (i >= 0) S.cars.splice(i, 1);
    if (c.box && VEH && VEH.extra) {
      const j = VEH.extra.indexOf(c.box);
      if (j >= 0) VEH.extra.splice(j, 1);
    }
    scene.remove(c.g);
    c.gone = true;
    markDirty();
  }
  const removeAll = () => {
    for (const c of S.cars.slice()) remove(c);
    zweitakt(null, 0);
    if (S.trabi) trabiHide();
  };
  // a vehicle set down somewhere else is seen at once: the scene hides small things far from the camera (core/assets.js CULL) by
  // their place at its last look – a moped fetched from far away would stay hidden for a moment (or for a test's first picture)
  function zeig(g) {
    g.updateMatrixWorld(true);
    g.traverse(o => {
      if (o.isMesh && o.layers.mask !== 1) o.layers.mask = 1;
    });
  }
  const _e = new THREE.Euler(0, 0, 0, 'YXZ'),
    _a = {},
    _b = {};
  // stand at (x, y) facing hd (compass rad): both axles on the ground
  function park(c, x, y, hd) {
    const T = c.T;
    c.line = null;
    c.v = 0;
    c.x = x;
    c.y = y;
    c.hd = hd;
    const fx = x + Math.sin(hd) * T.a,
      fy = y + Math.cos(hd) * T.a,
      rx = x + Math.sin(hd) * T.b,
      ry = y + Math.cos(hd) * T.b,
      zF = KERN.ground(fx, fy),
      zR = KERN.ground(rx, ry);
    c.z = Number.isFinite(zF + zR) ? zR + ((zF - zR) * -T.b) / T.wb : 0;
    c.g.position.set(x, c.z, -y);
    _e.set(Math.atan2((zF || 0) - (zR || 0), T.wb), -hd, 0, 'YXZ');
    c.g.quaternion.setFromEuler(_e);
    c.g.visible = true;
    zeig(c.g);
    markDirty(true);
    return c;
  }
  // on its line at c.s: front and rear axle on the line (shifted by c.lat to the right)
  function pose(c) {
    const R = c.line,
      T = c.T;
    VNETZ.at(R, c.s + T.a, _a);
    const fx = _a.x + Math.cos(_a.hd) * c.lat,
      fy = _a.y - Math.sin(_a.hd) * c.lat;
    VNETZ.at(R, c.s + T.b, _b);
    const rx = _b.x + Math.cos(_b.hd) * c.lat,
      ry = _b.y - Math.sin(_b.hd) * c.lat,
      hd = Math.atan2(fx - rx, fy - ry),
      k = -T.b / T.wb;
    c.x = rx + (fx - rx) * k;
    c.y = ry + (fy - ry) * k;
    // the curve the line bends with here: the moped leans into it
    let dh = _a.hd - _b.hd;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    c.kr = dh / T.wb;
    c.hd = hd;
    const zF = KERN.ground(fx, fy, c.z + 0.6),
      zR = KERN.ground(rx, ry, c.z + 0.6),
      z = zR + (zF - zR) * k;
    if (Number.isFinite(z)) c.z = z;
    const pitch = Math.atan2(zF - zR, T.wb);
    c.g.position.set(c.x, c.z, -c.y);
    _e.set(Number.isFinite(pitch) ? pitch : 0, -hd, 0, 'YXZ');
    c.g.quaternion.setFromEuler(_e);
  }
  // onto a line at s (m along it) with speed v
  function onLine(c, line, s = 0, v = 0) {
    c.line = line;
    c.s = Math.max(-c.T.b, s);
    c.v = v;
    c.lat = 0;
    c.ende = false;
    const p = VNETZ.at(line, c.s, {});
    c.z = KERN.ground(p.x, p.y);
    if (!Number.isFinite(c.z)) c.z = 0;
    pose(c);
    c.g.visible = true;
    zeig(c.g);
    markDirty();
    return c;
  }
  // one step along the line. o: { k: factor on the line's speeds, vmax, acc, halt: [{ x, y, r, gap }] what to stop for, stopS }
  function drive(c, dt, o = {}) {
    const R = c.line;
    if (!R || c.gone) return;
    const i = Math.min(R.n - 1, Math.max(0, Math.round((c.s + 2) / R.step)));
    let vT = (R.S ? R.S[i] : 8) * (o.k || 1);
    if (o.vmax != null) vT = Math.min(vT, o.vmax);
    let stopAt = o.stopS ?? Infinity;
    for (const h of o.halt || []) {
      if (Math.abs(h.x - c.x) > 60 || Math.abs(h.y - c.y) > 60) continue;
      const pr = VNETZ.project(R, h.x, h.y, c.s - 2, c.s + 45);
      if (pr && Math.abs(pr.lat - c.lat) < c.T.hw + h.r + 0.35 && pr.s > c.s + 0.5)
        stopAt = Math.min(stopAt, pr.s - c.T.yf - h.r - (h.gap ?? 1.6));
    }
    if (stopAt < Infinity) {
      const d = stopAt - c.s;
      vT = Math.min(vT, d <= 0.05 ? 0 : Math.sqrt(2 * 4 * d));
    }
    const dv = vT - c.v;
    c.v = Math.max(0, c.v + (dv > 0 ? Math.min(dv, (o.acc || 2.4) * dt) : Math.max(dv, -7 * dt)));
    c.s = Math.min(R.L, c.s + c.v * dt);
    c.ende = c.s >= R.L - 0.6;
    pose(c);
    c.spin += (c.v * dt) / c.T.rw;
    if (c.parts.axF) {
      c.parts.axF.rotation.x = -c.spin;
      c.parts.axR.rotation.x = -c.spin;
    } else if (c.parts.wf) {
      c.parts.wf.rotation.x = -c.spin;
      c.parts.wr.rotation.x = -c.spin;
      // lean into the curve: atan(v² κ / g), eased
      const want = Math.max(-0.6, Math.min(0.6, Math.atan((c.v * c.v * (c.kr || 0)) / 9.81)));
      c.lean = (c.lean || 0) + (want - (c.lean || 0)) * Math.min(1, dt * 4);
      c.tilt.rotation.z = -c.lean;
      if (c.mod.steer) c.mod.steer.quaternion.setFromAxisAngle(c.mod.axis, -Math.atan(c.T.wb * (c.kr || 0)));
    }
  }
  // ---- the road graph of the whole square (once): routes for the police, the clique, the lorries of the story ----
  const VMAX = [27, 21, 18, 11, 8, 6, 5.5]; // m/s by kind: motorway, main, county, street, lane, service, track
  function netz() {
    if (S.G) return S.G;
    const ways = (ROADS && ROADS.ways) || [];
    S.G = VNETZ.graph(ways, { kinds: new Set([0, 1, 2, 3, 4, 5, 6]) });
    return S.G;
  }
  function nodeNear(x, y, max = 1e9) {
    const G = netz();
    let b = -1,
      bd = max;
    for (let i = 0; i < G.nodes.length; i++) {
      const d = Math.hypot(G.nodes[i].x - x, G.nodes[i].y - y);
      if (d < bd) {
        bd = d;
        b = i;
      }
    }
    return b;
  }
  const cost = e => e.len / (VMAX[e.kind] || 5);
  // a line from near a to near b ([x, y] each). o: { k: speed factor, aLat, vEnd, lane: false for the middle of the road }
  function route(a, b, o = {}) {
    const G = netz(),
      na = nodeNear(a[0], a[1]),
      nb = nodeNear(b[0], b[1]);
    if (na < 0 || nb < 0 || na === nb) return null;
    const path = VNETZ.route(G, na, nb, cost);
    if (!path || !path.length) return null;
    const line = VNETZ.line(path, {
      off: e => (o.lane === false || e.kind > 3 ? 0 : Math.max(1.0, (e.w || 5) / 4)),
      vmax: e => (VMAX[e.kind] || 5) * (o.k || 1),
      cut: 5,
      aLat: o.aLat || 2.6,
      aBrk: 3,
      vMin: 2.6,
      vEnd: o.vEnd ?? 0,
    });
    if (line) line.from = na;
    return line;
  }
  // where a road leaves the square (the ends of main and county roads): the police come in there
  function zufahrten() {
    const G = netz();
    return G.nodes
      .filter(n => n.edges.length === 1 && n.edges[0].kind <= 2 && n.edges[0].kind >= 1)
      .map(n => [n.x, n.y]);
  }
  // the player's own vehicles throw the sun's shadow (they are two, and one looks at them all the time): the big parts only –
  // paint and the parts of vertex colours, no glass, no lamps, no chrome trim
  function schattenwurf(g) {
    g.traverse(o => {
      if (o.isMesh) o.castShadow = /^lack|^matt$/.test(o.name) && o.geometry.attributes.position.count > 600;
    });
  }
  // ---- the player's moped: a vehicle of vehicles/vehicle.js (made when the mode first needs it, hidden far out when not) ----
  const HIDE = [-930, -1240];
  function mopedVeh() {
    if (S.moped) return S.moped;
    const base = VEH && VEH.by && VEH.by.car;
    if (!base) return null;
    const PM = GLMOD.spielerMoped(),
      T = PM.T,
      model = PM.model,
      g = model.g;
    // The engine: 49.8 cm³, 2.7 kW at 5500/min, 5 Nm at 4800/min, four gears. Its speed is counted here in firings the way the
    // vehicle's sound counts them (vehicles/vsound.js: revs / 30 Hz, a four-stroke four) – a two-stroke single fires once a turn, so
    // every speed is half the real one, every torque twice, the final drive half: the forces are the real ones, the note is right.
    const spec = Object.assign({}, base.spec, {
      id: 'gl-moped',
      name: T.name,
      enterLabel: 'Aufs Moped steigen',
      mass: 165,
      Iz: 52,
      a: T.a,
      b: -T.b,
      track: 0.22,
      hcg: 0.55,
      rw: T.rw,
      mu: 0.95,
      Cf: 11500,
      Cr: 13500,
      steerMax: 0.52,
      steerV: 9,
      steerRate: 3.2,
      steerBack: 5,
      eng: {
        idle: 650,
        red: 3450,
        launch: 1700,
        drag: 2.6,
        curve: [
          [600, 6.4],
          [1500, 9.2],
          [2400, 10.0],
          [2750, 9.4],
          [3100, 7.8],
          [3400, 5.2],
          [3600, 0],
        ],
      },
      gears: [3.1, 1.9, 1.3, 1.0],
      rev: 3.1,
      revRpm: 900,
      final: 5.1,
      eff: 0.9,
      split: 0,
      shift: 0.25,
      upAt: t => 1800 + 1300 * t,
      downAt: t => 1000 + 600 * t,
      brake: 1500,
      brakeF: 0.6,
      hand: true,
      cdA: 0.52,
      dive: 0.006,
      lean: 0,
      travel: 0.07,
      susp: 60,
      suspD: 12,
      box: { hw: 0.34, hl: T.hl, cy: T.cy, h: 1.25 },
      eye: T.eye3.slice(),
      door: [-0.75, -0.1],
      reach: 2.0,
      beam: 150,
      beamAngle: 0.55,
      sound: 'petrol',
      cam: { dist: 4.4, height: 1.75, look: 1.05 },
      home: () => [HIDE[0], HIDE[1], 0, false],
    });
    delete spec.L;
    // the eyes: behind the handlebar in the driver's view (so that one sees it and the speedometer), on the seat for the figure;
    // both go with the lean
    const pose0 = model.update;
    model.update = (vv, dt) => {
      pose0(vv, dt);
      const l = model.lean();
      if (CAM3.want) {
        spec.eye[0] = Math.sin(l) * 0.88;
        spec.eye[1] = T.eye3[1];
        spec.eye[2] = T.eye3[2] - (1 - Math.cos(l)) * 0.88;
      } else {
        spec.eye[0] = Math.sin(l) * T.eye1[2];
        spec.eye[1] = T.eye1[1];
        spec.eye[2] = Math.cos(l) * T.eye1[2];
      }
    };
    const v = VEH.add(spec, model);
    // the small line under the name when one gets on (the lead's HUD reads it): the tank in litres – the S 51 has no gauge, one
    // looks into the tank; under 0.8 l the tap stands on reserve
    v.gl = {
      typ: 's51',
      zweitakt: 60,
      get sub() {
        const t = Math.max(0, GL.tank || 0);
        return (
          'Moped · 3,7 PS · Baujahr 1984 · Tank ' +
          t.toFixed(1).replace('.', ',') +
          ' l' +
          (t < 0.8 ? ' (Reserve)' : '')
        );
      },
    };
    schattenwurf(g);
    g.visible = false;
    S.moped = v;
    return v;
  }
  // ---- the Trabant the player drives in 1989: a vehicle of vehicles/vehicle.js (id 'gl-trabi') – 594 cm³, two cylinders, two strokes,
  //      26 PS at 4200/min, four gears on the dash (the fourth runs free: no engine braking), 620 kg, soft springs, about 105 km/h ----
  function trabiVeh() {
    if (S.trabi) return S.trabi;
    const base = VEH && VEH.by && VEH.by.car;
    if (!base) return null;
    const PM = GLMOD.spielerTrabi(),
      T = PM.T,
      TC = PM.TC,
      model = PM.model;
    const spec = Object.assign({}, base.spec, {
      id: 'gl-trabi',
      name: T.name,
      enterLabel: 'In den Trabant steigen',
      mass: 695,
      Iz: 820,
      a: T.a,
      b: -T.b,
      track: T.track,
      hcg: 0.52,
      rw: T.rw,
      mu: 0.9,
      Cf: 38000,
      Cr: 43000,
      steerMax: 0.56,
      steerV: 13,
      steerRate: 2.4,
      steerBack: 4,
      eng: {
        idle: 800,
        red: 5000,
        launch: 2300,
        drag: 6,
        curve: [
          [800, 38],
          [2000, 51],
          [3000, 54],
          [4200, 43.5],
          [4800, 33],
          [5200, 0],
        ],
      },
      gears: [4.08, 2.32, 1.52, 1.103],
      rev: 3.83,
      final: 3.95,
      eff: 0.9,
      split: 1,
      shift: 0.45,
      upAt: t => 2100 + 2300 * t,
      downAt: t => 1300 + 1100 * t,
      brake: 5200,
      brakeF: 0.66,
      hand: true,
      cdA: 0.85,
      dive: 0.009,
      lean: 0.013,
      travel: 0.11,
      susp: 36,
      suspD: 7,
      box: { hw: T.hw, hl: T.hl, cy: T.cy, h: 1.44 },
      eye: TC.eye3.slice(),
      door: [-1.15, -0.1],
      reach: 2.2,
      beam: 220,
      beamAngle: 0.5,
      sound: 'petrol',
      cam: { dist: 5.2, height: 1.85, look: 1.1 },
      home: () => [HIDE[0] + 14, HIDE[1], 0, false],
    });
    delete spec.L;
    // the eyes: the driver's in the driver's view, the seat for the figure
    const pose0 = model.update;
    model.update = (vv, dt) => {
      pose0(vv, dt);
      const E = CAM3.want ? TC.eye3 : TC.eye1;
      spec.eye[0] = E[0];
      spec.eye[1] = E[1];
      spec.eye[2] = E[2];
    };
    const v = VEH.add(spec, model);
    v.gl = {
      sub: 'Zweitakter · 26 PS · Baujahr 1986 · keine Tankuhr: Reservehahn und Peilstab',
      typ: 'trabant',
      zweitakt: 105,
    };
    schattenwurf(model.g);
    // hidden far out until it is fetched – wherever an earlier visit left it (vehicles/vehicle.js remembers places)
    VEH.place('gl-trabi', HIDE[0] + 14, HIDE[1], 0);
    model.g.visible = false;
    S.trabi = v;
    return v;
  }
  function trabiAt(x, y, hd) {
    const v = trabiVeh();
    if (!v) return null;
    VEH.place('gl-trabi', x, y, hd);
    v.g.visible = true;
    zeig(v.g);
    markDirty(true);
    return v;
  }
  function trabiHide() {
    const v = S.trabi;
    if (!v) return;
    if (VEH.cur === v) VEH.exit();
    VEH.place('gl-trabi', HIDE[0] + 14, HIDE[1], 0);
    v.g.visible = false;
  }
  function mopedAt(x, y, hd) {
    const v = mopedVeh();
    if (!v) return null;
    VEH.place('gl-moped', x, y, hd);
    v.g.visible = true;
    zeig(v.g);
    markDirty(true);
    return v;
  }
  function mopedHide() {
    const v = S.moped;
    if (!v) return;
    if (VEH.cur === v) VEH.exit();
    VEH.place('gl-moped', HIDE[0], HIDE[1], 0);
    v.g.visible = false;
  }
  // „Beenden“ (grenzland/gl_modus.js calls mopedHide and removeAll): the Trabant goes too
  const mopedHide0 = mopedHide;
  // ---- a two-stroke's own voice for the vehicle the player rides, on top of the engine note of vehicles/vsound.js: the ring of the
  //      exhaust (the firing pulses through a narrow band), the rattle between the firings (noise gated by them), a hollow beat at
  //      idle that stumbles now and then. All synthesised, on the game's effects bus ----
  function zweitakt(v, dt) {
    const R = GLTON.raw(),
      Z = S.zt;
    if (!R) return;
    if (!v) {
      if (Z) {
        S.zt = null;
        try {
          Z.out.gain.setTargetAtTime(0, R.ctx.currentTime, 0.12);
          setTimeout(() => {
            for (const n of Z.src)
              try {
                n.stop();
              } catch (e) {}
          }, 700);
        } catch (e) {}
      }
      return;
    }
    const c = R.ctx;
    let N = Z;
    if (!N) {
      try {
        const out = c.createGain(),
          saw = c.createOscillator(),
          ring = c.createBiquadFilter(),
          ringG = c.createGain(),
          sub = c.createOscillator(),
          subF = c.createBiquadFilter(),
          subG = c.createGain(),
          nb = c.createBuffer(1, c.sampleRate, c.sampleRate),
          ns = c.createBufferSource(),
          nf = c.createBiquadFilter(),
          gate = c.createGain(),
          mod = c.createGain(),
          d = nb.getChannelData(0);
        let q = 9871;
        for (let i = 0; i < d.length; i++) {
          q = (q * 1664525 + 1013904223) | 0;
          d[i] = (q >>> 8) / 8388608 - 1;
        }
        out.gain.value = 0;
        saw.type = 'sawtooth';
        ring.type = 'bandpass';
        ring.Q.value = 3.2;
        ringG.gain.value = 0.5;
        saw.connect(ring);
        ring.connect(ringG);
        ringG.connect(out);
        sub.type = 'square';
        subF.type = 'lowpass';
        subF.frequency.value = 210;
        subG.gain.value = 0.3;
        sub.connect(subF);
        subF.connect(subG);
        subG.connect(out);
        ns.buffer = nb;
        ns.loop = true;
        nf.type = 'bandpass';
        nf.frequency.value = 2300;
        nf.Q.value = 0.8;
        gate.gain.value = 0.35;
        mod.gain.value = 0.35;
        saw.connect(mod);
        mod.connect(gate.gain);
        ns.connect(nf);
        nf.connect(gate);
        gate.connect(out);
        out.connect(R.sfx);
        saw.start();
        sub.start();
        ns.start();
        N = S.zt = { out, saw, ring, ringG, sub, subG, nf, gate, src: [saw, sub, ns], t: 0, miss: 1 };
      } catch (e) {
        return;
      }
    }
    const s = v.st,
      sp = v.spec,
      rpm = Math.max(sp.eng.idle * 0.9, s.engine ? s.rpm : 0),
      f = rpm / 30,
      k = Math.min(1, rpm / sp.eng.red),
      thr = s.engine ? s.thr : 0,
      now = c.currentTime;
    // at idle and on the overrun a two-stroke fires unevenly: now and then a beat is weak
    N.t -= dt;
    if (N.t <= 0) {
      N.t = 0.06 + Math.random() * 0.1;
      N.miss = thr < 0.12 && Math.random() < 0.3 ? 0.35 : 1;
    }
    const tgt = (p, val, tau = 0.05) => {
      if (Number.isFinite(val)) p.setTargetAtTime(val, now, tau);
    };
    tgt(N.saw.frequency, f);
    tgt(N.sub.frequency, f / 2);
    tgt(N.ring.frequency, 620 + 900 * k + 500 * thr, 0.08);
    tgt(N.nf.frequency, 1700 + 1900 * k, 0.1);
    tgt(N.ringG.gain, (0.25 + 0.5 * thr) * N.miss, 0.03);
    tgt(N.subG.gain, 0.34 * (1 - 0.7 * k) * N.miss, 0.03);
    tgt(N.gate.gain, 0.16 + 0.3 * thr + 0.18 * k, 0.05);
    tgt(N.out.gain, s.engine ? (0.05 + 0.1 * thr + 0.05 * k) * (CAM3.want ? 1 : 0.8) : 0, 0.08);
  }
  // ---- per frame: lamps by the hour, the beacons, the nearest horn ----
  let night = null;
  function tick(dt, ox, oy) {
    const dk = !!(VAUTO.dark && VAUTO.dark());
    if (dk !== night) {
      night = dk;
      LM.head.emissiveIntensity = dk ? 3.2 : 0;
      LM.tail.emissiveIntensity = dk ? 1.4 : 0;
      GLMOD.SCHATTEN.tag(dk);
      markDirty();
    }
    S.blink += dt;
    let any = false,
      near = 1e9,
      mop = 1e9,
      mv = 0;
    for (const c of S.cars) {
      if (!c.g.visible) continue;
      const d = Math.hypot(c.x - ox, c.y - oy);
      if (c.blau) any = true;
      if (c.horn && d < near) near = d;
      if (c.typ === 'moped' && c.v > 0.5 && d < mop) {
        mop = d;
        mv = c.v;
      }
      if (c.v > 0.05 && d < 300) markDirty();
    }
    const ph = Math.floor(S.blink * 5.5) % 2;
    const a = any ? (ph ? 7 : 0.3) : 0,
      b = any ? (ph ? 0.3 : 7) : 0;
    if (LM.blau.emissiveIntensity !== a || LM.blau2.emissiveIntensity !== b) {
      LM.blau.emissiveIntensity = a;
      LM.blau2.emissiveIntensity = b;
      markDirty();
    }
    GLTON.siren(near < 1e8, near, S.hornAlt);
    GLTON.moped(mop < 1e8, mop, mv);
    const cur = VEH.cur;
    zweitakt(cur && cur.gl && cur.gl.zweitakt ? cur : null, dt);
  }
  Object.assign(S, {
    TYP,
    spawn,
    remove,
    removeAll,
    park,
    onLine,
    drive,
    pose,
    netz,
    nodeNear,
    route,
    zufahrten,
    mopedVeh,
    mopedAt,
    mopedHide: () => {
      mopedHide0();
      trabiHide();
    },
    trabiVeh,
    trabiAt,
    trabiHide,
    zweitakt,
    tick,
    LM,
    VMAX,
    HIDE,
  });
  return S;
})();
window.GLAUTO = GLAUTO;
