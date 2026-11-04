// ===================== feat/zombie: weapons and fighting (ZWAFFE) – swing, saw, shoot; condition, fuel, shells =====================
// The weapons are things to carry (game/play.js PLAY.thing: the bar at the bottom, keys 1–8): a spade, a pitchfork, a crowbar, a hatchet, a
// scythe, a chainsaw and a double-barrelled shotgun – simple models built here – and Hubert's axe from his chopping block (game/quests.js,
// id 'axe'). With nothing in the hand the fists. Attack: the left mouse button (with the mouse caught) or a click, the key Y, on touch
// screens the red button; the chainsaw cuts while held (it starts first, it drinks petrol, it is loud), the shotgun fires two shells, then
// R reloads (R also refuels the saw). A swing costs stamina; a blow throws them back, blades and the saw take limbs, the shotgun at close
// range too. Hits go to zombie/z_horde.js ZHORDE.damage.
import * as THREE from 'three';
import { cam, COARSE, R as REN } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { blocked, floorAt, P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { AVATAR } from '../game/avatar.js';
import { HELD, PLAY } from '../game/play.js';
import { HUD } from '../game/hud.js';
import { audio } from '../audio/audio.js';
import { VEH } from '../vehicles/vehicle.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZFX } from './z_fx.js';
import { ZHORDE } from './z_horde.js';
export const ZWAFFE = (() => {
  const W = ZDATA.WEAPONS;
  const S = {
    things: {},
    built: false,
    cd: 0,
    down: false,
    sw: null,
    saw: { run: false, start: 0, loops: false, cut: 0, rpm: 0 },
    relT: 0,
    kick: 0,
  };
  // ---- models: the handle along +y from 0 (the lower end) to len; the head at the top ----
  let MT = null;
  const mats = () =>
    MT ||
    (MT = {
      wood: plain({ color: 0x8a6a45, roughness: 0.75 }),
      dark: plain({ color: 0x4d3b2a, roughness: 0.7 }),
      steel: plain({ color: 0x8e9396, roughness: 0.35, metalness: 0.8 }),
      rust: plain({ color: 0x6d4a35, roughness: 0.8, metalness: 0.3 }),
      black: plain({ color: 0x1c1c1c, roughness: 0.55 }),
      orange: plain({ color: 0xd8641c, roughness: 0.45 }),
      grey: plain({ color: 0x5b5f61, roughness: 0.5 }),
      walnut: plain({ color: 0x5a3820, roughness: 0.45 }),
      blued: plain({ color: 0x23272b, roughness: 0.3, metalness: 0.7 }),
    });
  const cyl = (g, r0, r1, len, m, x = 0, y = 0, z = 0, rx = 0, rz = 0, seg = 8) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, seg), m);
    me.position.set(x, y + len / 2, z);
    if (rx || rz) {
      me.rotation.set(rx, 0, rz);
      me.position.set(x, y, z);
    }
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const box = (g, w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z);
    me.rotation.set(rx, ry, rz);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const MODELS = {
    spaten: M => {
      const g = new THREE.Group();
      cyl(g, 0.019, 0.017, 0.82, M.wood, 0, 0.26);
      box(g, 0.13, 0.03, 0.03, M.dark, 0, 1.1, 0); // the D-grip
      box(g, 0.025, 0.1, 0.025, M.dark, -0.055, 1.05, 0);
      box(g, 0.025, 0.1, 0.025, M.dark, 0.055, 1.05, 0);
      box(g, 0.18, 0.27, 0.008, M.steel, 0, 0.13, 0);
      box(g, 0.05, 0.07, 0.03, M.rust, 0, 0.27, 0);
      return g;
    },
    mistgabel: M => {
      const g = new THREE.Group();
      cyl(g, 0.017, 0.016, 1.15, M.wood, 0, 0.3);
      box(g, 0.2, 0.025, 0.025, M.rust, 0, 0.31, 0);
      for (const x of [-0.09, -0.03, 0.03, 0.09]) cyl(g, 0.006, 0.004, 0.3, M.rust, x, 0.0);
      return g;
    },
    brechstange: M => {
      const g = new THREE.Group();
      cyl(g, 0.014, 0.014, 0.82, M.blued, 0, 0.08);
      const h = cyl(g, 0.014, 0.014, 0.12, M.blued, 0.04, 0.05, 0, 0, 1.0);
      h.position.set(0.045, 0.06, 0);
      return g;
    },
    beil: M => {
      const g = new THREE.Group();
      cyl(g, 0.016, 0.014, 0.38, M.wood, 0, 0);
      box(g, 0.13, 0.06, 0.028, M.steel, 0.03, 0.36, 0);
      box(g, 0.025, 0.09, 0.012, M.steel, 0.1, 0.36, 0);
      return g;
    },
    sense: M => {
      const g = new THREE.Group();
      cyl(g, 0.017, 0.015, 1.5, M.wood, 0, 0);
      for (const y of [0.55, 1.05]) box(g, 0.14, 0.025, 0.025, M.dark, 0.07, y, 0);
      // the blade: a curve of steel at the top, at right angles to the snath
      for (let i = 0; i < 7; i++) {
        const a = (i / 6) * 0.9;
        box(
          g,
          0.12,
          0.012,
          0.06 - i * 0.006,
          M.steel,
          -0.06 - Math.sin(a) * 0.5,
          1.5 - (1 - Math.cos(a)) * 0.25,
          0,
          0,
          0,
          a * 0.6
        );
      }
      return g;
    },
    motorsaege: M => {
      const g = new THREE.Group();
      box(g, 0.16, 0.3, 0.18, M.grey, 0, 0.22, 0);
      box(g, 0.15, 0.22, 0.05, M.orange, 0, 0.26, 0.09);
      box(g, 0.035, 0.18, 0.035, M.black, 0, 0.02, 0); // rear handle
      box(g, 0.2, 0.03, 0.03, M.black, 0, 0.32, -0.05); // front handle bar
      box(g, 0.012, 0.44, 0.06, M.steel, 0, 0.58, 0.06); // the bar
      const ch = box(g, 0.016, 0.46, 0.072, M.black, 0, 0.58, 0.06);
      ch.name = 'chain';
      return g;
    },
    flinte: M => {
      const g = new THREE.Group();
      box(g, 0.04, 0.32, 0.075, M.walnut, 0, 0.16, -0.01, 0.12); // the stock
      box(g, 0.045, 0.12, 0.05, M.blued, 0, 0.37, 0); // the action
      cyl(g, 0.011, 0.011, 0.68, M.blued, 0.012, 0.42);
      cyl(g, 0.011, 0.011, 0.68, M.blued, -0.012, 0.42);
      box(g, 0.035, 0.24, 0.03, M.walnut, 0, 0.54, -0.025); // the fore-end
      return g;
    },
  };
  // one thing per weapon (the axe is Hubert's: game/quests.js)
  const GRIP = {
    spaten: { at: 0.85, len: 1.15 },
    mistgabel: { at: 0.75, len: 1.45 },
    brechstange: { at: 0.6, len: 0.9 },
    beil: { at: 0.25, len: 0.4 },
    sense: { at: 0.5, len: 1.5 },
    motorsaege: { at: 0.05, len: 0.6 },
    flinte: { at: 0.35, len: 1.1 },
  };
  const VM = {
    spaten: { x: 0.32, y: -0.42, z: -0.62, rx: -0.5, rz: 0.15 },
    mistgabel: { x: 0.3, y: -0.38, z: -0.55, rx: -1.25, rz: 0.05 },
    brechstange: { x: 0.3, y: -0.3, z: -0.52, rx: -0.45, rz: 0.3 },
    beil: { x: 0.28, y: -0.24, z: -0.48, rx: -0.3, rz: 0.3 },
    sense: { x: 0.36, y: -0.6, z: -0.7, rx: -0.35, ry: -0.6, rz: 0.4 },
    motorsaege: { x: 0.26, y: -0.36, z: -0.5, rx: -1.35, ry: 0, rz: 0.05 },
    flinte: { x: 0.2, y: -0.22, z: -0.42, rx: -1.5, rz: 0 },
  };
  function thing(id) {
    if (S.things[id]) return S.things[id];
    const M = mats(),
      mk = MODELS[id],
      world = new THREE.Group(),
      held = new THREE.Group(),
      w = mk(M);
    w.rotation.z = Math.PI / 2; // lying on its side
    w.position.y = 0.03;
    world.add(w);
    held.add(mk(M));
    const T = PLAY.thing({
      id: 'zw_' + id,
      zw: id,
      name: W[id].name,
      world,
      held,
      r: 1.4,
      hz: 0.1,
      carry3: 'tool',
      grip3: GRIP[id],
      vm: VM[id],
      desc: W[id].desc,
      onTake: () => {
        Z.weap[id] = Z.weap[id] || { cond: 100, fuel: id === 'motorsaege' ? 0.35 : 0, ammo: id === 'flinte' ? 2 : 0 };
        Z.save();
        Z.emit('weapon', { id });
      },
      onDrop: () => sawOff(),
    });
    T.state = 'gone';
    world.visible = false;
    S.things[id] = T;
    return T;
  }
  // the weapon in the hand: its id in ZDATA.WEAPONS, or 'faust'
  function cur() {
    const T = PLAY.carry;
    if (!T) return 'faust';
    if (T.zw) return T.zw;
    if (T.id === 'axe') return 'axt';
    return 'faust';
  }
  const state = id => Z.weap[id] || (Z.weap[id] = { cond: 100, fuel: 0, ammo: id === 'flinte' ? 2 : 0 });
  // ---- placing them at the start of the night mode: near the menu spots, on the first free place ----
  function placeAll() {
    for (const p of ZDATA.PLACES) {
      if (!MODELS[p.id]) continue;
      const T = thing(p.id);
      if (PLAY.has(T) || T.state === 'world') continue;
      if (Z.weap[p.id] && Z.weap[p.id].cond <= 0) continue;
      const s = KERN.spot(p.spot);
      if (!s || !s.pos) continue;
      let x = s.pos[0] + p.off[0],
        y = s.pos[1] + p.off[1];
      const z0 = s.z || 0;
      for (let k = 0; k < 12 && blocked(x, y, floorAt(x, y, z0 + 0.3)); k++) {
        x += Math.cos(k * 2.1) * 0.5;
        y += Math.sin(k * 2.1) * 0.5;
      }
      T.place(x, y, floorAt(x, y, z0 + 0.3), Math.random() * Math.PI * 2);
    }
  }
  function hideAll() {
    for (const T of Object.values(S.things)) if (T.state === 'world') T.gone();
  }
  // ---- melee: a swing; after the wind-up everything within reach and arc in front is hit ----
  const fwd = () => {
    const a = (P.yaw * Math.PI) / 180;
    return [Math.sin(a), Math.cos(a)];
  };
  function targets(reach, arc) {
    const [fx, fy] = fwd(),
      out = [],
      c = Math.cos(((arc / 2) * Math.PI) / 180);
    for (const e of Z.ents) {
      if (e.kind !== 'zombie' || e.dead || e.fly || Math.abs(e.z - P.feet) > 1.3) continue;
      const dx = e.x - P.x,
        dy = e.y - P.y,
        d = Math.hypot(dx, dy);
      if (d > reach + ZDATA.ZOMBIE.r || d < 1e-3) continue;
      if ((dx * fx + dy * fy) / d < c && d > 0.55) continue;
      out.push({ e, d, dx, dy });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  function swing(id) {
    const w = W[id];
    if (S.cd > 0 || S.sw) return false;
    if (!Z.tire(w.stam || 8)) {
      PLAY.think('Ich bin außer Atem.', 1200);
      return false;
    }
    S.cd = w.cd;
    S.sw = { id, t: 0, wind: w.wind || 0.3, done: false };
    ZTON.swing(P.x, P.y);
    // the figure (third person) and the thing in the hand (first person)
    if (CAM3.on && AVATAR.ready) AVATAR.gesture(w.gest || 'chop', w.gest === 'push' ? 1.6 : 1.35);
    if (HELD.obj && !HELD.away)
      HELD.play(w.cd * 0.85, k => {
        const s = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65,
          e = Math.sin(Math.min(1, k / 0.35) * Math.PI * 0.5);
        return w.gest === 'push'
          ? { dz: -0.28 * s, dy: 0.02 * s }
          : { rx: -1.1 * s + 0.4 * e * (k < 0.35 ? 0 : 1), dy: 0.12 * s, dx: -0.08 * s };
      });
    return true;
  }
  function land(id) {
    const w = W[id];
    const hits = targets(w.reach, w.arc);
    let n = 0;
    for (const h of hits) {
      if (id !== 'sense' && n >= (id === 'spaten' ? 2 : 1)) break;
      ZHORDE.damage(h.e, w.dmg * (0.85 + Math.random() * 0.3), {
        dx: h.dx,
        dy: h.dy,
        knock: w.knock,
        kind: w.kind,
        gore: w.gore || 0,
        by: 'spieler',
      });
      n++;
    }
    if (n && id !== 'faust' && id !== 'tritt') wear(id, w.wear || 0.5);
    if (n) S.kick = 0.06;
    return n;
  }
  function wear(id, k) {
    const s = state(id);
    s.cond = Math.max(0, s.cond - k * (1 + Math.random()));
    Z.save();
    if (s.cond <= 0) {
      const T = id === 'axt' ? PLAY.things.axe : S.things[id];
      PLAY.think(ZDATA.T.broken(W[id].name), 2500);
      ZTON.crack(P.x, P.y);
      if (T) T.gone();
    }
  }
  // ---- the chainsaw ----
  const LOOPS = [
    ['zcs:idle', 'csaw_idle'],
    ['zcs:high', 'csaw_high'],
    ['zcs:cut', 'csaw_cut'],
  ];
  function sawStart() {
    const s = S.saw,
      st = state('motorsaege');
    if (s.run || s.start > 0) return;
    if (!(st.fuel > 0.001)) {
      PLAY.think(ZDATA.T.noFuel + ' (R: nachtanken)', 1800);
      ZTON.click(P.x, P.y);
      return;
    }
    s.start = 1.6;
    if (audio.has('csaw_start')) audio.at('csaw_start', P.x, P.y, { vol: 1.1, ref: 9 });
  }
  function sawOn() {
    const s = S.saw;
    s.run = true;
    s.start = 0;
    if (!s.loops && audio.has('csaw_idle')) {
      s.loops = true;
      for (const [n, k] of LOOPS) audio.loopAt(n, k, P.x, P.y, { vol: 0, ref: 9 });
    }
  }
  function sawOff() {
    const s = S.saw;
    s.run = false;
    s.start = 0;
    s.cut = 0;
    if (s.loops) {
      s.loops = false;
      for (const [n] of LOOPS) audio.stopLoop(n, 0.6);
    }
  }
  function sawTick(dt) {
    const s = S.saw,
      inHand = cur() === 'motorsaege';
    if (!inHand && (s.run || s.start > 0)) sawOff();
    if (s.start > 0) {
      s.start -= dt;
      if (s.start <= 0) sawOn();
    }
    if (!s.run) return;
    const st = state('motorsaege'),
      w = W.motorsaege,
      cutting = S.down && P.mode === 'walk';
    st.fuel -= dt * (cutting ? w.cut : w.idle);
    if (st.fuel <= 0) {
      st.fuel = 0;
      sawOff();
      PLAY.think(ZDATA.T.noFuel, 1800);
      return;
    }
    s.rpm += ((cutting ? 1 : 0.15) - s.rpm) * Math.min(1, dt * 6);
    Z.noise(P.x, P.y, cutting ? w.loud : w.loud * 0.45, 0.6, 'motorsaege');
    let touching = 0;
    if (cutting) {
      Z.tire(w.stam * dt);
      const hits = targets(w.reach, w.arc);
      for (const h of hits.slice(0, 2)) {
        touching = 1;
        const dmg = w.dps * dt * (0.8 + Math.random() * 0.4);
        // the saw stays in them: blood all the time, now and then a limb (the nearest one: arms first, then the head)
        h.e.sawT = (h.e.sawT || 0) + dt;
        let part = null;
        if (h.e.sawT > 0.3 && Math.random() < dt * 3.5)
          part = !h.e.F || !h.e.F.cuts.armR ? 'armR' : !h.e.F.cuts.armL ? 'armL' : 'kopf';
        // the saw finishes it: often the head goes with the last of it
        if (!part && h.e.hp - dmg <= 0 && Math.random() < 0.45) part = 'kopf';
        ZHORDE.damage(h.e, dmg, {
          dx: h.dx,
          dy: h.dy,
          knock: 0.05,
          kind: 'blade',
          gore: part ? 1 : 0,
          part,
          by: 'spieler',
        });
        if (Math.random() < dt * 8) ZFX.spray(h.e.x, h.e.y, h.e.z + 1.1, -h.dx, -h.dy, 6, 2.6, 1.4);
      }
      if (touching) wear('motorsaege', dt * 0.4);
    }
    s.cut += ((touching ? 1 : 0) - s.cut) * Math.min(1, dt * 8);
    if (s.loops) {
      audio.loopVol('zcs:idle', (1 - s.rpm) * 0.55);
      audio.loopVol('zcs:high', s.rpm * (1 - s.cut) * 0.85);
      audio.loopVol('zcs:cut', s.cut * 0.95);
      for (const [n] of LOOPS) audio.moveLoop(n, P.x, P.y);
    }
    // the chain runs (the held model)
    if (HELD.obj && Math.random() < 0.5) markDirty();
  }
  // ---- the shotgun ----
  function shoot() {
    const st = state('flinte'),
      w = W.flinte;
    if (S.cd > 0 || S.relT > 0) return false;
    if (!(st.ammo > 0)) {
      ZTON.click(P.x, P.y);
      PLAY.think(Z.has('schrot') ? 'Leer. R: nachladen.' : ZDATA.T.noShells, 1500);
      S.cd = 0.3;
      return false;
    }
    st.ammo--;
    S.cd = w.cd;
    Z.save();
    const yaw = (P.yaw * Math.PI) / 180,
      pitch = (P.pitch * Math.PI) / 180,
      fx = Math.sin(yaw),
      fy = Math.cos(yaw),
      ez = P.feet + (P.eyeH || 1.6) - 0.15;
    ZTON.shot(P.x, P.y);
    ZFX.flash(P.x + fx * 0.9, P.y + fy * 0.9, ez + Math.sin(pitch) * 0.9 - 0.1);
    Z.noise(P.x, P.y, w.loud, 2, 'schuss');
    S.kick = 0.18;
    P.pitch = Math.min(72, P.pitch + 3.5);
    // the pellets: each a ray in a cone; the nearest zombie each ray passes close to takes it
    const hitsBy = new Map();
    for (let i = 0; i < w.pellets; i++) {
      const a = yaw + ((Math.random() - 0.5) * 2 * w.spread * Math.PI) / 180,
        b = pitch + ((Math.random() - 0.5) * 2 * w.spread * 0.7 * Math.PI) / 180,
        dx = Math.sin(a) * Math.cos(b),
        dy = Math.cos(a) * Math.cos(b),
        dz = Math.sin(b);
      let best = null,
        bt = w.range;
      for (const e of Z.ents) {
        if (e.kind !== 'zombie' || e.dead) continue;
        const ox = e.x - P.x,
          oy = e.y - P.y,
          t = ox * dx + oy * dy;
        if (t < 0.3 || t > bt) continue;
        const px = P.x + dx * t,
          py = P.y + dy * t,
          pz = ez + dz * t,
          lat = Math.hypot(e.x - px, e.y - py),
          zc = e.z + (e.crawl ? 0.25 : 1.0);
        if (lat < 0.32 && pz > e.z - 0.1 && pz < e.z + (e.crawl ? 0.6 : 1.85)) {
          const head = !e.crawl && pz > e.z + 1.5;
          if (t < bt && ZHORDE.los(P.x, P.y, e.x, e.y)) {
            bt = t;
            best = { e, head, zc };
          }
        }
      }
      if (best) {
        const h = hitsBy.get(best.e) || { n: 0, head: 0, d: bt };
        h.n++;
        if (best.head) h.head++;
        hitsBy.set(best.e, h);
      }
    }
    for (const [e, h] of hitsBy) {
      const fall = Math.max(0.25, 1 - h.d / w.range),
        dmg = h.n * w.dmg * fall * (h.head >= 2 ? 1.8 : 1);
      ZHORDE.damage(e, dmg, {
        dx: e.x - P.x,
        dy: e.y - P.y,
        knock: w.knock * fall,
        kind: 'pierce',
        gore: h.d < 7 ? 1 : 0.4,
        part: h.head >= 3 && h.d < 9 ? 'kopf' : null,
        by: 'spieler',
      });
    }
    if (HELD.obj && !HELD.away) HELD.play(0.25, k => ({ rx: 0.35 * (1 - k), dz: 0.08 * (1 - k) }));
    return true;
  }
  // R: reload the shotgun, or refuel the saw
  function reload() {
    const id = cur();
    if (id === 'flinte') {
      const st = state('flinte');
      if (st.ammo >= W.flinte.shots || S.relT > 0) return;
      if (!Z.has('schrot')) {
        PLAY.think(ZDATA.T.noShells, 1500);
        return;
      }
      S.relT = W.flinte.reload;
      ZTON.click(P.x, P.y);
      setTimeout(() => ZTON.click(P.x, P.y), 700);
      setTimeout(() => {
        const n = Math.min(W.flinte.shots - st.ammo, Z.sup.schrot || 0);
        if (n > 0 && Z.use('schrot', n)) st.ammo += n;
        ZTON.click(P.x, P.y);
        PLAY.think(ZDATA.T.reload, 900);
        Z.save();
      }, W.flinte.reload * 1000);
    } else if (id === 'motorsaege') {
      const st = state('motorsaege');
      if (st.fuel > W.motorsaege.tank - 0.05) return PLAY.think('Der Tank ist voll.', 1200);
      if (!Z.has('benzin')) return PLAY.think('Kein Benzin im Rucksack.', 1500);
      Z.use('benzin');
      st.fuel = Math.min(W.motorsaege.tank, st.fuel + 0.5);
      PLAY.think(ZDATA.T.refuel, 1000);
      Z.save();
    }
  }
  // ---- G: a kick – little harm, but it throws them back (and often down), whatever is in the hand ----
  function kick() {
    if (S.cd > 0 || S.sw) return false;
    return swing('tritt');
  }
  // ---- input ----
  const can = () => Z.on && P.mode === 'walk' && !(VEH && VEH.cur) && !PLAY.seat && !HUD.open && Z.hp > 0;
  function press() {
    if (!can()) return false;
    const id = cur();
    S.down = true;
    if (id === 'motorsaege') {
      if (!S.saw.run) sawStart();
      return true;
    }
    if (id === 'flinte') return shoot();
    return swing(id);
  }
  function release() {
    S.down = false;
  }
  const cv = REN.domElement;
  let downAt = null;
  // the mouse: caught (pointer lock) – press and release; free – a short click is a blow (a drag keeps turning the view)
  window.addEventListener(
    'pointerdown',
    e => {
      if (e.target !== cv || e.pointerType === 'touch' || e.button !== 0 || !can()) return;
      if (document.pointerLockElement === cv) {
        press();
        e.stopImmediatePropagation();
      } else downAt = [e.clientX, e.clientY, performance.now()];
    },
    true
  );
  window.addEventListener(
    'pointerup',
    e => {
      if (e.target !== cv || e.pointerType === 'touch' || e.button !== 0) return;
      if (!Z.on) return;
      if (document.pointerLockElement === cv) {
        release();
        e.stopImmediatePropagation();
        return;
      }
      if (
        downAt &&
        Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 &&
        performance.now() - downAt[2] < 300 &&
        can()
      ) {
        press();
        setTimeout(release, cur() === 'motorsaege' ? 700 : 50);
        e.stopImmediatePropagation();
      }
      downAt = null;
    },
    true
  );
  window.addEventListener('keydown', e => {
    if (!Z.on || e.repeat || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'y') {
      if (press()) e.preventDefault();
    } else if (k === 'r' && can()) reload();
    else if (k === 'g' && can() && cur() !== 'motorsaege') kick();
  });
  window.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'y') release();
  });
  // ---- per frame ----
  function tick(dt) {
    if (!Z.on) return;
    dt = Math.min(dt, 0.1);
    S.cd = Math.max(0, S.cd - dt);
    S.relT = Math.max(0, S.relT - dt);
    const sw = S.sw;
    if (sw) {
      sw.t += dt;
      if (!sw.done && sw.t >= sw.wind) {
        sw.done = true;
        land(sw.id);
      }
      if (sw.t > W[sw.id].cd) S.sw = null;
    }
    // held key: the next swing as soon as it can (melee), the saw keeps cutting
    if (S.down && !S.sw && S.cd <= 0) {
      const id = cur();
      if (id !== 'motorsaege' && id !== 'flinte' && can()) swing(id);
    }
    sawTick(dt);
    if (S.kick > 0) S.kick = Math.max(0, S.kick - dt);
  }
  KERN.tick(tick, 'zombie/waffe');
  function info() {
    const id = cur(),
      w = W[id],
      st = id !== 'faust' ? state(id) : null;
    return {
      id,
      name: w.name,
      cond: st ? Math.round(st.cond) : null,
      fuel: id === 'motorsaege' ? +st.fuel.toFixed(2) : null,
      tank: id === 'motorsaege' ? w.tank : null,
      ammo: id === 'flinte' ? st.ammo : null,
      run: S.saw.run,
      reload: S.relT > 0,
    };
  }
  Object.assign(S, {
    thing,
    cur,
    state,
    placeAll,
    hideAll,
    press,
    release,
    reload,
    shoot,
    swing,
    kick,
    land,
    targets,
    info,
    sawOff,
    can,
    MODELS,
  });
  return S;
})();
window.ZWAFFE = ZWAFFE;
