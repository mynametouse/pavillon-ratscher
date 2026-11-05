// ===================== feat/zombie: the houses of the zombie night (ZHAUS) – going in and out, searching, barricading, sleeping, the radio =====================
// While the night mode runs, every house of Ratscher with a front door can be entered (its interior: zombie/z_innen.js ZINNEN, built when
// one goes in, taken away when one comes out): at the door „Ins Haus gehen“ – a short fade like Resident Evil – and one stands in the hall.
// Inside: cupboards, drawers, the fridge, the shelves in the cellar hold supplies (rolled once per house and container from ZDATA.LOOT and
// remembered: searched is empty), doors and windows of the ground floor can be barricaded with two boards and a handful of nails (a few
// seconds of hammering – it is heard), the bed lets the time pass when it is safe, the radio crackles with news. At night the zombies come
// to the house the player is in: to its doors and windows (the flow field of zombie/z_horde.js is seeded there), hammer on the barricades
// (a board after the other gives way) and climb in where nothing holds them. By day a few lurk in the houses they went back into at dawn.
import * as THREE from 'three';
import { scene, stage, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { DOOR, floorAt, P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VILLAGE } from '../world/village.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZFIG } from './z_fig.js';
import { ZINNEN } from './z_innen.js';
import { ZHORDE } from './z_horde.js';
export const ZHAUS = (() => {
  const S = { H: null, bid: null, busy: false, list: null, boards: new Map(), fade: null, rad: 0, onEnter: [] };
  const hyp = Math.hypot;
  // ---- the doors: from ZINNEN (the interiors), or the village's own (then nothing can be entered yet) ----
  function doors() {
    if (S.list && S.list.length) return S.list;
    let L = [];
    try {
      L = ZINNEN.list() || [];
    } catch (e) {
      L = [];
    }
    S.list = L;
    return L;
  }
  function nearDoor(r = 1.9) {
    let best = null,
      bd = r;
    for (const h of doors()) {
      const d = hyp(h.door.x + h.door.nx * 0.6 - P.x, h.door.y + h.door.ny * 0.6 - P.y);
      if (d < bd && Math.abs((h.door.z || 0) - P.feet) < 1.6) {
        bd = d;
        best = h;
      }
    }
    return best;
  }
  const whose = id => {
    try {
      const i = ZINNEN.info(id);
      return i && i.owner ? i.owner : null;
    } catch (e) {
      return null;
    }
  };
  // ---- the fade (black) ----
  function fadeEl() {
    if (S.fade) return S.fade;
    const d = document.createElement('div');
    d.id = 'zfade';
    d.style.cssText =
      'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:8;transition:opacity .32s';
    (stage || document.body).appendChild(d);
    return (S.fade = d);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const remove = e => ZHORDE.remove(e);
  async function fade(on) {
    fadeEl().style.opacity = on ? '1' : '0';
    await wait(340);
  }
  function put(p) {
    P.x = p.x;
    P.y = p.y;
    P.feet = floorAt(p.x, p.y, (p.z ?? P.feet) + 0.3);
    P.vz = 0;
    if (p.yaw !== undefined) P.yaw = P.body = p.yaw;
    P.air = false;
    markDirty(true);
  }
  // ---- going in ----
  async function enter(h) {
    if (S.busy || S.H) return;
    S.busy = true;
    try {
      ZTON.bang(h.door.x, h.door.y);
      await fade(true);
      const H = await ZINNEN.mount(h.id);
      if (!H) {
        await fade(false);
        PLAY.think('Die Tür ist verschlossen.', 1800);
        return;
      }
      S.H = H;
      S.bid = h.id;
      H.onSearch = search;
      H.onUse = use;
      put(H.entry);
      boardsAll();
      lurkers();
      Z.emit('enter', { id: h.id });
      await fade(false);
      const o = whose(h.id);
      PLAY.think(o ? 'Das Haus von ' + o + '.' : 'Drinnen ist es still.', 2200);
    } catch (e) {
      console.warn('zombie haus', e);
      fadeEl().style.opacity = '0';
    } finally {
      S.busy = false;
    }
  }
  // ---- coming out ----
  async function leave() {
    const H = S.H;
    if (!H || S.busy) return;
    const front = (H.openings || []).find(o => o.front);
    if (front && (Z.house(S.bid).bar[front.id] || 0) > 0) {
      PLAY.think('Die Haustür ist verbarrikadiert – erst die Bretter abnehmen.', 2200);
      return;
    }
    S.busy = true;
    try {
      await fade(true);
      // the zombies inside come out after him through the door
      for (const e of Z.ents)
        if (e.house === S.bid && !e.dead) {
          e.house = null;
          e.x = H.exit.x + (Math.random() - 0.5) * 1.5;
          e.y = H.exit.y + (Math.random() - 0.5) * 1.5;
          e.z = floorAt(e.x, e.y, (H.exit.z || 0) + 0.5);
          e.st = 'chase';
        } else if (e.house === S.bid) remove(e);
      boardsClear();
      put(H.exit);
      ZINNEN.unmount(H);
      S.H = null;
      Z.emit('leave', { id: S.bid });
      S.bid = null;
      await fade(false);
    } finally {
      S.busy = false;
    }
  }
  // ---- searching: what a container holds (once) ----
  const seedOf = (bid, cid) => {
    let h = bid * 7919;
    for (const c of String(cid)) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
    return h + Z.night * 13;
  };
  function search(c) {
    const st = Z.house(S.bid);
    if (st.looted.includes(c.id)) return { items: {}, text: 'Hier ist nichts mehr.' };
    st.looted.push(c.id);
    const items = ZDATA.roll(c.kind, seedOf(S.bid, c.id));
    const parts = [];
    for (const [k, n] of Object.entries(items)) {
      Z.add(k, n);
      const it = ZDATA.ITEMS[k];
      parts.push(n + ' ' + (n === 1 ? it.name : it.pl));
    }
    // the hunter's gun cabinet: the shotgun
    if (c.kind === 'waffenschrank' && window.ZWAFFE && !Z.weap.flinte) {
      const T = window.ZWAFFE.thing('flinte');
      PLAY.give(T);
      parts.unshift('die Bockflinte');
    }
    Z.save();
    ZTON.click(P.x, P.y);
    return { items, text: parts.length ? 'Gefunden: ' + parts.join(', ') + '.' : 'Nichts Brauchbares.' };
  }
  // ---- using the furniture ----
  const NEWS = [
    '… rauscht … „… werden gebeten, ihre Häuser nicht zu verlassen. Die Sirenen …“ … rauscht …',
    '… „… Schleusingen, Hildburghausen und Suhl melden … unerklärliche … nach Einbruch der Dunkelheit …“',
    '… „… Türen und Fenster sichern. Halten Sie Vorräte für mehrere Tage …“ … ein langer Pfeifton …',
    '… Blasmusik, dann bricht sie ab. Eine Stimme flüstert: „… die Sirene … sie hören die Sirene …“',
    '… „… die Bundesstraße bei Kloster Veßra ist gesperrt. Fahren Sie nicht …“ … rauscht …',
  ];
  function use(spot) {
    const k = spot.kind;
    if (k === 'radio' || k === 'tv') {
      S.rad = (S.rad + 1) % NEWS.length;
      PLAY.think(k === 'tv' ? 'Nur Schnee auf dem Bildschirm. Dann, kurz: ' + NEWS[S.rad] : NEWS[S.rad], 6500);
      return true;
    }
    if (k === 'bett') {
      const near = Z.ents.some(e => e.kind === 'zombie' && !e.dead && hyp(e.x - P.x, e.y - P.y) < 30);
      if (near) {
        PLAY.think('Nicht jetzt – sie sind zu nah.', 2000);
        return true;
      }
      const m = ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440,
        night = Z.phase === 'nacht',
        mins = night ? (ZDATA.TIME.dawn + 10 - m + 1440) % 1440 : 120;
      PLAY.think(night ? 'Augen zu … bis zum Morgen.' : 'Ein paar Stunden Schlaf.', 2000);
      CLOCK.wait(mins, 'Schlafen', () => {
        Z.stam = 100;
        Z.heal(15);
        Z.food = Math.max(0, Z.food - 8);
        if (DN && DN.active) DN.update(true);
      });
      return true;
    }
    if (k === 'ofen' || k === 'herd') {
      if (Z.has('konserve') && Z.food < 85) {
        Z.eat('konserve');
        Z.heal(5);
        PLAY.think('Eine Dose warm gemacht – das tut gut.', 2200);
      } else {
        Z.stam = Math.min(100, Z.stam + 15);
        PLAY.think('Die Wärme des Ofens.', 1600);
      }
      return true;
    }
    // a chainsaw or an axe lying ready (Wolfgang's hall): the weapon in the hand; a second chainsaw gives its fuel
    if ((k === 'motorsaege' || k === 'axt') && window.ZWAFFE) {
      const W2 = window.ZWAFFE,
        st = Z.house(S.bid);
      if (st.looted.includes(spot.id)) {
        PLAY.think('Hier lag sie – jetzt nicht mehr.', 1600);
        return true;
      }
      st.looted.push(spot.id);
      const T = W2.thing(k);
      if (PLAY.has(T)) {
        if (k === 'motorsaege') {
          Z.add('benzin', 1);
          PLAY.think('Noch eine Säge – ich nehme den Sprit daraus mit.', 2200);
        } else PLAY.think('Eine Axt habe ich schon.', 1600);
      } else {
        PLAY.give(T);
        if (k === 'motorsaege') W2.state('motorsaege').fuel = Math.max(W2.state('motorsaege').fuel || 0, 0.4);
        PLAY.think(
          k === 'motorsaege' ? 'Wolfgangs Motorsäge – fast voll.' : 'Eine schwere Axt. Die liegt gut in der Hand.',
          2200
        );
      }
      Z.save();
      return true;
    }
    if (k === 'spuele' || k === 'wanne') {
      if (Z.food < 95) {
        Z.food = Math.min(100, Z.food + 3);
        Z.stam = Math.min(100, Z.stam + 10);
      }
      PLAY.think('Ein Schluck Wasser aus der Leitung. Es läuft noch.', 1800);
      return true;
    }
    return false;
  }
  // ---- barricades: boards across a door or window; hp 100 – the zombies' blows take it down ----
  let BM = null;
  const boardMat = () => BM || (BM = plain({ color: 0x9a7a52, roughness: 0.85 }));
  let BG = null;
  const boardGeo = () => BG || (BG = new THREE.BoxGeometry(1, 0.14, 0.025));
  function boardsFor(op) {
    const hp = Z.house(S.bid).bar[op.id] || 0,
      old = S.boards.get(op.id);
    if (old) {
      old.parent && old.parent.remove(old);
      S.boards.delete(op.id);
    }
    if (hp <= 0) return;
    const g = new THREE.Group(),
      ax = op.a[0],
      ay = op.a[1],
      bx = op.b[0],
      by = op.b[1],
      L = hyp(bx - ax, by - ay),
      ang = Math.atan2(by - ay, bx - ax),
      n = Math.max(2, Math.round(((op.z1 - op.z0) / 0.32) * Math.min(1, hp / 100 + 0.25)));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(boardGeo(), boardMat()),
        t = (i + 0.5) / n,
        z = op.z0 + (op.z1 - op.z0) * t,
        tilt = (i % 2 ? 1 : -1) * (0.08 + ((i * 37) % 7) / 60);
      m.scale.x = L + 0.24;
      m.position.copy(V((ax + bx) / 2 - op.n[0] * 0.06, (ay + by) / 2 - op.n[1] * 0.06, z));
      m.rotation.set(0, -ang, tilt, 'YXZ');
      m.castShadow = true;
      g.add(m);
    }
    g.userData.noMerge = true;
    scene.add(g);
    S.boards.set(op.id, g);
    markDirty(true);
  }
  function boardsAll() {
    if (!S.H) return;
    for (const op of S.H.openings || []) {
      boardsFor(op);
      KERN.act({
        id: 'zhaus:bar:' + op.id,
        r: 1.5,
        prio: 0.1,
        pos: () => [(op.a[0] + op.b[0]) / 2 - op.n[0] * 0.5, (op.a[1] + op.b[1]) / 2 - op.n[1] * 0.5, op.z0 + 0.9],
        label: () => {
          if (!S.H || !Z.on) return null;
          const hp = Z.house(S.bid).bar[op.id] || 0,
            w = op.kind === 'door' ? 'Tür' : 'Fenster';
          if (hp >= 99) return op.front ? 'Barrikade abnehmen' : null;
          return (hp > 0 ? w + ' ausbessern' : w + ' verbarrikadieren') + ' (2 Bretter, Nägel)';
        },
        hold: () => ((Z.house(S.bid).bar[op.id] || 0) >= 99 ? 0 : 2.6),
        start: () => {
          S.hammer = setInterval(() => {
            ZTON.hammer(P.x, P.y);
            Z.noise(P.x, P.y, 26, 0.6, 'hammer');
          }, 430);
        },
        cancel: () => clearInterval(S.hammer),
        run: () => {
          clearInterval(S.hammer);
          const st = Z.house(S.bid);
          if ((st.bar[op.id] || 0) >= 99) {
            st.bar[op.id] = 0;
            Z.emit('bar', { bid: S.bid, op: op.id, hp: 0 });
            Z.add('brett', 1);
            boardsFor(op);
            PLAY.think('Die Bretter sind ab.', 1400);
            Z.save();
            return;
          }
          if (!Z.has('brett', 2) || !Z.has('nagel')) {
            PLAY.think('Dafür brauche ich zwei Bretter und eine Hand voll Nägel.', 2200);
            return;
          }
          Z.use('brett', 2);
          Z.use('nagel', 1);
          st.bar[op.id] = 100;
          boardsFor(op);
          Z.emit('barricade', { id: S.bid, op: op.id });
          Z.emit('bar', { bid: S.bid, op: op.id, hp: 100 });
          Z.save();
        },
      });
    }
  }
  function boardsClear() {
    for (const [id, g] of S.boards) {
      g.parent && g.parent.remove(g);
      KERN.unact('zhaus:bar:' + id);
    }
    S.boards.clear();
  }
  // a zombie's blow on a barricade (from zombie/z_horde.js); true while it still holds
  function hitBar(op, dmg) {
    if (!S.H) return false;
    const st = Z.house(S.bid),
      hp = st.bar[op.id] || 0;
    if (hp <= 0) return false;
    const p = [(op.a[0] + op.b[0]) / 2, (op.a[1] + op.b[1]) / 2];
    st.bar[op.id] = Math.max(0, hp - dmg);
    Z.emit('bar', { bid: S.bid, op: op.id, hp: st.bar[op.id] });
    if (st.bar[op.id] <= 0) {
      ZTON.splinter(p[0], p[1]);
      PLAY.think(op.kind === 'door' ? 'Die Tür gibt nach!' : 'Ein Fenster ist offen!', 1800);
    } else ZTON.bang(p[0], p[1]);
    boardsFor(op);
    Z.save();
    return st.bar[op.id] > 0;
  }
  // ---- what the horde needs: where to go when the player is in a house, and the way in ----
  const outside = op => [(op.a[0] + op.b[0]) / 2 + op.n[0] * 0.9, (op.a[1] + op.b[1]) / 2 + op.n[1] * 0.9];
  const insideP = op => [(op.a[0] + op.b[0]) / 2 - op.n[0] * 0.75, (op.a[1] + op.b[1]) / 2 - op.n[1] * 0.75];
  ZHORDE.hooks.push(() =>
    S.H && Z.on ? (S.H.openings || []).filter(o => o.floor === 0 || o.floor === undefined).map(outside) : null
  );
  ZHORDE.house = {
    // for a zombie outside while the player is inside: the opening it heads for, or null
    redirect(e) {
      if (!S.H || e.house === S.bid) return null;
      const ops = (S.H.openings || []).filter(o => !o.floor);
      if (!ops.length) return null;
      if (!e.op || !ops.includes(e.op)) {
        let best = null,
          bd = 1e9;
        for (const o of ops) {
          const p = outside(o),
            d = hyp(p[0] - e.x, p[1] - e.y) + (Z.house(S.bid).bar[o.id] || 0) * 0.04;
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
        e.op = best;
      }
      const p = outside(e.op);
      return { x: p[0], y: p[1], d: hyp(p[0] - e.x, p[1] - e.y), op: e.op };
    },
    // at the opening: blows until it gives, then in
    bang(e, op, dt) {
      e.bangT = (e.bangT || 0) - dt;
      if (e.bangT > 0) return;
      e.bangT = ZDATA.ZOMBIE.cd * (0.8 + Math.random() * 0.5);
      if (hitBar(op, ZDATA.ZOMBIE.bang)) {
        if (e.F) e.F.play(Math.random() < 0.5 ? 'knock' : 'push', 0.9);
        return;
      }
      // in through it
      const p = insideP(op);
      e.x = p[0];
      e.y = p[1];
      e.z = floorAt(p[0], p[1], (op.z0 || P.feet) + 0.4);
      e.house = S.bid;
      e.op = null;
      if (op.kind === 'window') ZTON.splinter(p[0], p[1]);
      ZTON.snarl(p[0], p[1]);
    },
    inside: () => !!S.H,
    // inside the mounted house: the next waypoint towards the target (from room to room, up and down the stairs), or null
    route(e, t) {
      if (!S.H || e.house !== S.bid || !S.H.route) return null;
      // a closed inner door in its way: it bursts it open
      for (const d of S.H.doors || []) {
        const D = DOOR[d.key];
        if (D && D.target < 0.5 && hyp(d.pos[0] - e.x, d.pos[1] - e.y) < 1.1 && Math.abs((d.pos[2] || 0) - e.z) < 1.2) {
          D.target = 1;
          ZTON.bang(d.pos[0], d.pos[1]);
        }
      }
      let w = null;
      try {
        w = S.H.route(e.x, e.y, e.z, t.x, t.y, t.z);
      } catch (err) {
        return null;
      }
      if (!w) return null;
      const x = w.x ?? w[0],
        y = w.y ?? w[1];
      return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
    },
  };
  // ---- lurkers: by day some of last night's zombies wait inside ----
  function lurkers() {
    if (!S.H || Z.phase === 'nacht') return;
    const st = Z.house(S.bid);
    let n = st.lurk || 0;
    if (!n && Z.night > 0 && Math.random() < 0.18) n = 1;
    // nobody lurking: now and then somebody alive hides here (zombie/z_bund.js)
    if (!n && !st.met && Math.random() < 0.22) {
      st.met = true;
      for (const f of S.onEnter) f(S.H, S.bid);
      return;
    }
    if (!n) return;
    const rooms = (S.H.rooms || []).filter(r => r.poly && r.poly.length >= 3 && r.kind !== 'flur');
    for (let i = 0; i < Math.min(n, 2) && rooms.length; i++) {
      const r = rooms[Math.floor(Math.random() * rooms.length)],
        cx = r.poly.reduce((s, q) => s + q[0], 0) / r.poly.length,
        cy = r.poly.reduce((s, q) => s + q[1], 0) / r.poly.length,
        key = ZFIG.people()[Math.floor(Math.random() * ZFIG.people().length)];
      if (!key) break;
      const e = ZHORDE.ent(key, cx, cy, r.z0 ?? floorAt(cx, cy, P.feet + 0.5), Math.random() * 360, {
        st: 'eat',
        house: S.bid,
      });
      e.lurk = S.bid;
    }
    st.lurk = 0;
  }
  // ---- the action button at the front door, outside and inside ----
  KERN.act({
    id: 'zhaus:enter',
    r: 2.0,
    prio: 0.3,
    pos: () => {
      const h = Z.on && !S.H ? nearDoor() : null;
      return h ? [h.door.x + h.door.nx * 0.3, h.door.y + h.door.ny * 0.3, (h.door.z || P.feet) + 1] : null;
    },
    label: () => {
      if (!Z.on || S.H || S.busy) return null;
      const h = nearDoor();
      if (!h) return null;
      const o = whose(h.id);
      return o ? 'Ins Haus von ' + o : 'Ins Haus gehen';
    },
    gest3: 'interact',
    run: () => {
      const h = nearDoor();
      if (h) enter(h);
    },
  });
  KERN.act({
    id: 'zhaus:exit',
    r: 1.6,
    prio: 0.3,
    pos: () => (S.H && S.H.entry ? [S.H.entry.x, S.H.entry.y, S.H.entry.z + 1] : null),
    label: () => (S.H && Z.on && !S.busy ? 'Hinausgehen' : null),
    gest3: 'interact',
    run: () => leave(),
  });
  // leaving the night mode while inside: out, interior away
  KERN.on('zombie:stop', () => {
    if (S.H) {
      boardsClear();
      try {
        put(S.H.exit);
        ZINNEN.unmount(S.H);
      } catch (e) {}
      S.H = null;
      S.bid = null;
    }
  });
  // the walker left the interior some other way (a jump in the menu): take it away
  KERN.tick(dt => {
    if (!S.H || S.busy) return;
    S.chk = (S.chk || 0) + dt;
    if (S.chk < 1) return;
    S.chk = 0;
    if (!S.H.inside(P.x, P.y, P.feet) && hyp(P.x - S.H.entry.x, P.y - S.H.entry.y) > 25) {
      boardsClear();
      ZINNEN.unmount(S.H);
      S.H = null;
      S.bid = null;
    }
  }, 'zombie/haus');
  // a barricade changed elsewhere (the other player, zombie/z_netz.js): its boards anew
  function refresh(opId) {
    const op = S.H && (S.H.openings || []).find(o => o.id === opId);
    if (op) boardsFor(op);
  }
  Object.assign(S, { doors, nearDoor, enter, leave, search, use, hitBar, boardsAll, refresh, VILLAGE });
  return S;
})();
window.ZHAUS = ZHAUS;
