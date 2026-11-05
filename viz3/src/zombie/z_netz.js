// ===================== feat/zombie: the zombie night for two (ZNETZ) – two browsers over the internet, one hosts =====================
// Falko, 4.11.2026: „… eine Variante finden, wie man im Multiplayer-Modus gemeinsam gegen Zombies angehen kann, sodass 2 Spieler in 2
// Browsern übers Internet das Spiel gemeinsam spielen können.“ One browser opens a room („Raum erstellen“: a code like KLOSS7 and a link
// to send), the other joins with the code (or the link: ?szenario=zombie&raum=KLOSS7). The browsers talk directly (WebRTC data channels,
// dist/lazy/raum.js – Trystero, introduced through public Nostr relays; no server of our own); ?raum=…&lokal=1 joins through a
// BroadcastChannel instead (two windows of the same browser – the tests).
// The host's browser is the world: its clock, its zombies (zombie/z_horde.js), the siren. The guest's zombies are puppets of the host's
// (8 snapshots a second: where, which way, how, health, limbs, dead), his blows go to the host as hits; the host's zombies hunt both
// players and strike the guest by message, new ones come out of the houses near either player; what one player makes loud (saw, shot,
// engine, hammering) the host's zombies hear, the guest's car knocks them flying on the host, a kill counts for the one who struck. Both
// see each other as their own figure with a name over it, in a car the car. Barricades are shared. Each keeps his own supplies, weapons
// and health; dying in two does not stop the clock.
import * as THREE from 'three';
import { $, cam, QS, scene, stage, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { floorAt, P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { AVATAR } from '../game/avatar.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { audio } from '../audio/audio.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZFX } from './z_fx.js';
import { ZFIG } from './z_fig.js';
import { ZHORDE } from './z_horde.js';
import { ZHAUS } from './z_haus.js';
import { ZWAFFE } from './z_waffe.js';
import { ZHUD } from './z_hud.js';
export const ZNETZ = (() => {
  const S = {
    on: false,
    role: null,
    code: '',
    T: null,
    peers: {},
    sendT: 0,
    zsT: 0,
    clockT: 0,
    status: '',
    lokal: false,
  };
  const hyp = Math.hypot;
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  const clean = c =>
    String(c || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
  // ---- the way the messages go: Trystero (the internet) or a BroadcastChannel (two windows of one browser) ----
  async function transport(code, lokal) {
    const handlers = {},
      peers = new Set();
    const T = { id: null, peers, handlers, onJoin: null, onLeave: null };
    T.on = (k, f) => (handlers[k] = f);
    if (lokal) {
      const id = 'p' + Math.random().toString(36).slice(2, 9),
        bc = new BroadcastChannel('pav-zombie-' + code);
      T.id = id;
      bc.onmessage = ev => {
        const m = ev.data;
        if (!m || m.from === id || (m.to && m.to !== id)) return;
        if (m.type === '_hello' || m.type === '_ack') {
          if (!peers.has(m.from)) {
            peers.add(m.from);
            if (T.onJoin) T.onJoin(m.from);
          }
          if (m.type === '_hello') bc.postMessage({ from: id, to: m.from, type: '_ack' });
          return;
        }
        if (m.type === '_bye') {
          if (peers.delete(m.from) && T.onLeave) T.onLeave(m.from);
          return;
        }
        const h = handlers[m.type];
        if (h) h(m.data, m.from);
      };
      T.send = (type, data, to) => bc.postMessage({ from: id, to: to || null, type, data });
      T.leave = () => {
        try {
          bc.postMessage({ from: id, type: '_bye' });
          bc.close();
        } catch (e) {}
      };
      T.start = () => bc.postMessage({ from: id, type: '_hello' });
      return T;
    }
    const mod = await import(new URL('lazy/raum.js', document.baseURI).href);
    const R = mod.joinRoom({ appId: 'pavillon-ratscher-zombie-1', password: 'pr-zn-' + code }, 'zn-' + code);
    T.id = mod.selfId;
    const acts = {};
    for (const k of ['hi', 'st', 'zs', 'ev']) {
      const a = R.makeAction(k);
      a.onMessage = (data, meta) => {
        const h = handlers[k];
        if (h) h(data, (meta && meta.peerId) || meta);
      };
      acts[k] = a;
    }
    T.send = (type, data, to) => acts[type] && acts[type].send(data, to ? { target: to } : undefined);
    R.onPeerJoin = p => {
      peers.add(p);
      if (T.onJoin) T.onJoin(p);
    };
    R.onPeerLeave = p => {
      peers.delete(p);
      if (T.onLeave) T.onLeave(p);
    };
    T.leave = () => R.leave();
    T.start = () => {};
    return T;
  }
  // ---- the other player: his figure (Falko, Sarah or Christoph), a name over the head ----
  const FIGKEY = { m: 'spieler_m', f: 'spieler_f', c: 'spieler_c' };
  async function figure(peer) {
    const key = FIGKEY[peer.fig] || 'spieler_m';
    try {
      peer.F = await ZFIG.make(key, { alive: true });
      peer.F.g.visible = false;
      markDirty();
    } catch (e) {
      console.warn('netz figure', e);
    }
    const lab = document.createElement('div');
    lab.className = 'znlab';
    lab.textContent = peer.name || 'Mitspieler';
    lab.style.cssText =
      'position:absolute;z-index:6;transform:translate(-50%,-100%);pointer-events:none;font:600 12px/1 var(--f-body,system-ui);color:#fff;' +
      'background:rgba(20,40,60,.65);padding:3px 7px;border-radius:999px;white-space:nowrap;display:none';
    (stage || document.body).appendChild(lab);
    peer.lab = lab;
  }
  function dropPeer(id) {
    const p = S.peers[id];
    if (!p) return;
    if (p.F) p.F.dispose();
    if (p.lab) p.lab.remove();
    if (p.wObj) scene.remove(p.wObj);
    sawSound(p, null);
    if (p.carId && VEH && VEH.by[p.carId]) delete VEH.by[p.carId].netU;
    delete S.peers[id];
    status(S.role === 'host' ? 'Raum ' + S.code + ' – wartet auf Mitspieler' : 'Verbindung getrennt');
    PLAY.think((p.name || 'Der Mitspieler') + ' ist nicht mehr da.', 2500);
  }
  // ---- what I send: my state 10× a second ----
  function myState() {
    const v = VEH && VEH.cur;
    return {
      x: +P.x.toFixed(2),
      y: +P.y.toFixed(2),
      z: +P.feet.toFixed(2),
      yaw: Math.round(P.body ?? P.yaw),
      sp: +(P.speed || 0).toFixed(2),
      w: ZWAFFE.cur(),
      a: S.act || null,
      // the saw running: its revs and whether it cuts (the other one hears it)
      saw: ZWAFFE.saw && ZWAFFE.saw.run ? [+(ZWAFFE.saw.rpm || 0).toFixed(2), +(ZWAFFE.saw.cut || 0).toFixed(2)] : 0,
      hp: Math.round(Z.hp),
      car: v
        ? { id: v.id, x: +v.st.x.toFixed(2), y: +v.st.y.toFixed(2), psi: +v.st.psi.toFixed(3), u: +v.st.u.toFixed(2) }
        : null,
      inn: ZHAUS.H ? ZHAUS.bid : null,
    };
  }
  // ---- the host's zombies as a snapshot ----
  const CUTBIT = { kopf: 1, armL: 2, armR: 4, beinL: 8, beinR: 16 };
  function snapshot() {
    const out = [];
    for (const e of Z.ents) {
      if (e.kind !== 'zombie' || e.net) continue;
      let cuts = 0;
      if (e.F) for (const k in e.F.cuts) cuts |= CUTBIT[k] || 0;
      const mode = e.dead
        ? 'dead'
        : e.fly
          ? 'fly'
          : e.downT > 0
            ? 'down'
            : e.st === 'turn'
              ? 'turn'
              : e.st === 'eat'
                ? 'eat'
                : e.crawl
                  ? 'crawl'
                  : e.st === 'chase'
                    ? 'chase'
                    : 'walk';
      out.push([
        e.id,
        e.key,
        +e.x.toFixed(2),
        +e.y.toFixed(2),
        +e.z.toFixed(2),
        Math.round(e.hd),
        mode,
        +(e.lastSp || 0).toFixed(2),
        Math.round(e.hp),
        cuts,
        e.wind > 0 ? 1 : 0,
        e.house || 0,
      ]);
    }
    return out;
  }
  // ---- the guest takes the snapshot: puppets ----
  function puppets(list) {
    const seen = new Set();
    for (const r of list) {
      const [id, key, x, y, z, hd, mode, sp, hp, cuts, wind, house] = r;
      seen.add(id);
      let e = Z.ents.find(q => q.id === id);
      if (!e) {
        e = ZHORDE.ent(key, x, y, z, hd, { net: true, st: mode === 'turn' ? 'turn' : 'wander' });
        e.id = id;
        e.net = true;
        e.cutBits = 0;
      }
      e.nx = x;
      e.ny = y;
      e.nz = z;
      e.nhd = hd;
      e.netMode = mode;
      e.netSp = sp;
      e.hp = hp;
      e.house = house || null;
      e.netT = performance.now();
      if (wind && !e.netWind && e.F) {
        e.F.play(Math.random() < 0.5 ? 'push' : 'chop', 0.85);
        ZTON.attack(x, y);
      }
      e.netWind = wind;
      if (e.F && cuts !== e.cutBits) {
        for (const [k, b] of Object.entries(CUTBIT))
          if (cuts & b && !(e.cutBits & b)) e.F.cut(k, Math.random() - 0.5, Math.random() - 0.5);
        e.cutBits = cuts;
      }
      if (mode === 'dead' && !e.dead) {
        e.dead = true;
        e.deadT = 0;
        ZTON.die(x, y);
        setTimeout(() => ZFX.stain(x, y, 0.8, z), 500);
      }
    }
    for (const e of Z.ents.slice())
      if (e.net && !seen.has(e.id) && performance.now() - (e.netT || 0) > 2500) ZHORDE.remove(e);
  }
  // ---- messages ----
  function wire(T) {
    T.on('hi', (d, from) => {
      const p = S.peers[from] || (S.peers[from] = { id: from, st: null, F: null });
      const fresh = !p.name;
      p.name = String((d && d.name) || 'Mitspieler').slice(0, 24);
      p.fig = (d && d.fig) || 'm';
      p.role = d && d.role;
      if (fresh) {
        figure(p);
        status('Verbunden mit ' + p.name);
        ZHUD.say(p.name + ' ist dabei.', '', 3);
        T.send('hi', hello(), from);
        if (S.role === 'host')
          T.send('ev', { k: 'welt', t: CLOCK.t, night: Z.night, e0: DN ? DN.e0 : null, houses: barState() }, from);
      }
    });
    T.on('st', (d, from) => {
      const p = S.peers[from];
      if (!p || !d) return;
      p.st = d;
      p.stT = performance.now();
    });
    T.on('zs', d => {
      if (S.role === 'gast' && Array.isArray(d)) puppets(d);
    });
    T.on('ev', (d, from) => {
      if (!d) return;
      if (d.k === 'hit' && S.role === 'host') {
        const e = Z.ents.find(q => q.id === d.id && q.kind === 'zombie' && !q.net);
        if (e) ZHORDE.damage(e, +d.dmg || 0, Object.assign({}, d.o || {}, { by: 'gast', remote: from }));
      } else if (d.k === 'kill' && S.role === 'gast') {
        Z.kills++;
        Z.save();
        Z.emit('kill', { id: d.id, key: d.key, by: 'ich', how: d.how || null });
      } else if (d.k === 'hurt') {
        Z.hurt(+d.dmg || 0, d.from || 'Zombie');
      } else if (d.k === 'welt' && S.role === 'gast') {
        if (d.e0 != null && DN) DN.e0 = d.e0;
        if (Number.isFinite(d.t)) CLOCK.t = d.t;
        if (Number.isFinite(d.night)) Z.night = d.night; // (the host's count of nights – the guest's own siren does not count)
        for (const [bid, bars] of Object.entries(d.houses || {})) Object.assign(Z.house(+bid).bar, bars);
        if (DN && DN.active) DN.update(true);
      } else if (d.k === 'uhr' && S.role === 'gast') {
        if (Number.isFinite(d.t) && Math.abs(d.t - CLOCK.t) > 0.5) CLOCK.t = d.t;
        if (Number.isFinite(d.night)) Z.night = d.night;
      } else if (d.k === 'bar') {
        Z.house(+d.bid).bar[d.op] = +d.hp || 0;
        if (ZHAUS.H && ZHAUS.bid === +d.bid && ZHAUS.refresh) ZHAUS.refresh(d.op);
      } else if (d.k === 'laut') {
        if (S.role === 'host') rawNoise(+d.x, +d.y, +d.r || 30, 1, d.what || '');
        if (d.what === 'schuss') ZTON.shot(+d.x, +d.y);
      } else {
        // feat/zombie-werk: everything not handled above goes out as an event (zombie/z_werk_molotow.js: 'feuer', a molotov's fire)
        KERN.emit('znetz:ev', { d, from });
      }
    });
    T.onJoin = id => {
      if (!S.peers[id]) S.peers[id] = { id, st: null, F: null };
      T.send('hi', hello(), id);
    };
    T.onLeave = id => dropPeer(id);
  }
  const hello = () => ({
    name: (AVATAR.FIGS[AVATAR.kind] || {}).name || 'Spieler',
    fig: AVATAR.kind,
    role: S.role,
    v: 1,
  });
  function barState() {
    const o = {};
    for (const [bid, h] of Object.entries(Z.houses)) if (h.bar && Object.keys(h.bar).length) o[bid] = h.bar;
    return o;
  }
  // ---- open a room / join one ----
  async function open(role, code, lokal) {
    if (S.on) close();
    if (!Z.on && window.ZOMBIE) window.ZOMBIE.start();
    S.role = role;
    S.code = clean(code) || newCode();
    S.lokal = !!lokal;
    status(role === 'host' ? 'Raum ' + S.code + ' wird geöffnet …' : 'Verbinde mit Raum ' + S.code + ' …');
    try {
      S.T = await transport(S.code, lokal);
    } catch (e) {
      status('Keine Verbindung möglich (' + String((e && e.message) || e).slice(0, 60) + ')');
      return false;
    }
    S.on = true;
    ZHORDE.guest = role === 'gast';
    if (role === 'gast') ZHORDE.clear();
    wire(S.T);
    S.T.start();
    status(
      role === 'host' ? 'Raum ' + S.code + ' – wartet auf Mitspieler' : 'Raum ' + S.code + ' – wartet auf den Gastgeber'
    );
    return true;
  }
  function close() {
    if (!S.on) return;
    try {
      S.T.leave();
    } catch (e) {}
    for (const id of Object.keys(S.peers)) dropPeer(id);
    for (const e of Z.ents.slice()) if (e.net) ZHORDE.remove(e);
    S.on = false;
    S.T = null;
    ZHORDE.guest = false;
    status('');
  }
  // ---- the host's zombies also go for the guest; their blows reach him by message ----
  function hookHorde() {
    S.prevPick = ZHORDE.pick;
    ZHORDE.pick = (e, me) => {
      const a = S.prevPick ? S.prevPick(e, me) : null;
      if (!S.on || S.role !== 'host') return a;
      let best = a,
        bd = a ? hyp(a.x - e.x, a.y - e.y) : hyp(me.x - e.x, me.y - e.y) - 0.5;
      for (const p of Object.values(S.peers)) {
        const s = p.st;
        if (!s || s.hp <= 0 || performance.now() - (p.stT || 0) > 5000) continue;
        const x = s.car ? s.car.x : s.x,
          y = s.car ? s.car.y : s.y,
          d = hyp(x - e.x, y - e.y);
        if (d < bd) {
          bd = d;
          best = { x, y, z: s.z, car: s.car ? { st: { u: s.car.u } } : null, remote: p.id, inn: s.inn };
        }
      }
      return best;
    };
    ZHORDE.hitRemote = (peer, dmg, e) => {
      if (S.on && S.T) S.T.send('ev', { k: 'hurt', dmg, from: e && e.name }, peer);
    };
    ZHORDE.netHit = (e, dmg, o) => {
      if (S.on && S.T)
        S.T.send('ev', {
          k: 'hit',
          id: e.id,
          dmg,
          o: {
            dx: o.dx,
            dy: o.dy,
            knock: o.knock,
            kind: o.kind,
            gore: o.gore,
            part: o.part || null,
            at: [+P.x.toFixed(1), +P.y.toFixed(1)],
          },
        });
    };
    // the guest's kill: counted on his side
    ZHORDE.netKill = (peer, e, o) => {
      if (S.on && S.T) S.T.send('ev', { k: 'kill', id: e.id, key: e.key, how: o.kind || null }, peer);
    };
    // new ones come out of the houses near either player
    ZHORDE.spawnAt = () => {
      if (!S.on || S.role !== 'host' || Math.random() < 0.5) return null;
      const ps = Object.values(S.peers).filter(p => p.st && p.st.hp > 0 && performance.now() - (p.stT || 0) < 5000);
      if (!ps.length) return null;
      const s = ps[Math.floor(Math.random() * ps.length)].st;
      return { x: s.x, y: s.y, z: s.z, yaw: s.yaw };
    };
  }
  // what one hears here the zombies of the host hear too: the guest's noises (saw, shot, engine, hammer) go there, the host's come
  // here for the shot's bang – at most twice a second of a kind
  const rawNoise = Z.noise,
    lastLoud = {};
  Z.noise = (x, y, r, s, what) => {
    rawNoise(x, y, r, s, what);
    if (!S.on || !S.T || !(r >= 20)) return;
    const k = what || '-',
      now = performance.now();
    if (now - (lastLoud[k] || 0) < 500) return;
    lastLoud[k] = now;
    S.T.send('ev', { k: 'laut', x: +(+x).toFixed(1), y: +(+y).toFixed(1), r: Math.round(r), what: what || '' });
  };
  // ---- the other player's weapon in his right hand: the handle along the forearm, the grip in the hand (as npc/life.js holdProp) ----
  const _a = new THREE.Vector3(),
    _d = new THREE.Vector3(),
    _f = new THREE.Vector3(),
    _x = new THREE.Vector3(),
    _y = new THREE.Vector3(),
    _z = new THREE.Vector3(),
    _m = new THREE.Matrix4();
  function held(p, w, yaw) {
    if (p.w !== w) {
      if (p.wObj) scene.remove(p.wObj);
      p.wObj = null;
      p.w = w;
      const mk = ZWAFFE.MODELS[w];
      if (mk) {
        p.wObj = mk(ZWAFFE.mats());
        p.wObj.userData.noMerge = true;
        scene.add(p.wObj);
      }
    }
    const B = p.F && p.F.bones;
    if (!p.wObj || !B || !B.RightHand || !B.RightForeArm) return;
    B.RightHand.getWorldPosition(_a);
    B.RightForeArm.getWorldPosition(_d);
    _y.subVectors(_a, _d).normalize();
    const az = (yaw * Math.PI) / 180;
    _f.set(Math.sin(az), 0, -Math.cos(az));
    _z.copy(_f).addScaledVector(_y, -_f.dot(_y));
    if (_z.lengthSq() < 1e-4) _z.set(0, 1, 0);
    _z.normalize();
    _x.crossVectors(_y, _z);
    _m.makeBasis(_x, _y, _z);
    p.wObj.quaternion.setFromRotationMatrix(_m);
    const G = ZWAFFE.GRIP[w];
    p.wObj.position.copy(_a).addScaledVector(_y, -(G ? G.at * (G.len || 1) : 0.3)); // (at: the share of the length, as in game/avatar.js)
  }
  // ---- the other one's chainsaw: the same three loops as one's own (zombie/z_waffe.js), at his place ----
  const SAWL = [
    ['idle', 'csaw_idle'],
    ['high', 'csaw_high'],
    ['cut', 'csaw_cut'],
  ];
  function sawSound(p, s) {
    const on = !!(s && s.saw && audio.has && audio.has('csaw_idle'));
    if (!on) {
      if (p.sawOn) for (const [k] of SAWL) audio.stopLoop('zcsr:' + p.id + ':' + k, 0.6);
      p.sawOn = false;
      return;
    }
    const x = s.x,
      y = s.y;
    if (!p.sawOn) {
      for (const [k, kind] of SAWL) audio.loopAt('zcsr:' + p.id + ':' + k, kind, x, y, { vol: 0, ref: 9 });
      p.sawOn = true;
    }
    const [rpm, cut] = s.saw;
    audio.loopVol('zcsr:' + p.id + ':idle', (1 - rpm) * 0.55);
    audio.loopVol('zcsr:' + p.id + ':high', rpm * (1 - cut) * 0.85);
    audio.loopVol('zcsr:' + p.id + ':cut', cut * 0.95);
    for (const [k] of SAWL) audio.moveLoop('zcsr:' + p.id + ':' + k, x, y);
  }
  // ---- per frame: send, show the other, move the puppets ----
  const _v = new THREE.Vector3();
  function tick(dt) {
    if (!S.on || !S.T) return;
    dt = Math.min(dt, 0.1);
    S.sendT -= dt;
    if (S.sendT <= 0 && S.T.peers.size) {
      S.sendT = 0.1;
      S.T.send('st', myState());
      S.act = null;
    }
    if (S.role === 'host' && S.T.peers.size) {
      S.zsT -= dt;
      if (S.zsT <= 0) {
        S.zsT = 0.125;
        S.T.send('zs', snapshot());
      }
      S.clockT -= dt;
      if (S.clockT <= 0) {
        S.clockT = 2;
        S.T.send('ev', { k: 'uhr', t: CLOCK.t, night: Z.night });
      }
    }
    // the guest's puppets glide to the host's places
    if (S.role === 'gast')
      for (const e of Z.ents) {
        if (!e.net || e.nx === undefined) continue;
        const k = Math.min(1, dt * 10);
        e.x += (e.nx - e.x) * k;
        e.y += (e.ny - e.y) * k;
        e.z += (e.nz - e.z) * k;
        let dh = e.nhd - e.hd;
        while (dh > 180) dh -= 360;
        while (dh < -180) dh += 360;
        e.hd += dh * k;
        e.lastSp = e.netSp;
      }
    // the other players
    for (const p of Object.values(S.peers)) {
      const s = p.st,
        F = p.F;
      if (!s || !F) continue;
      const inCar = !!s.car;
      if (inCar && VEH && VEH.by[s.car.id] && !(VEH.cur && VEH.cur.id === s.car.id)) {
        VEH.place(s.car.id, s.car.x, s.car.y, s.car.psi);
        VEH.by[s.car.id].netU = s.car.u; // (the host's zombies fly from it – zombie/z_horde.js vehicles)
        p.carId = s.car.id;
      } else if (p.carId && VEH && VEH.by[p.carId]) {
        delete VEH.by[p.carId].netU;
        p.carId = null;
      }
      p.x = p.x === undefined ? s.x : p.x + (s.x - p.x) * Math.min(1, dt * 10);
      p.y = p.y === undefined ? s.y : p.y + (s.y - p.y) * Math.min(1, dt * 10);
      p.z = p.z === undefined ? s.z : p.z + (s.z - p.z) * Math.min(1, dt * 10);
      const show = !inCar && s.inn === (ZHAUS.H ? ZHAUS.bid : null);
      F.g.visible = show;
      if (show) {
        F.g.position.copy(V(p.x, p.y, p.z));
        F.g.rotation.y = (-s.yaw * Math.PI) / 180;
        F.mode = s.hp <= 0 ? 'dead' : s.sp > 2.6 ? 'chase' : s.sp > 0.05 ? 'walk' : 'idle';
        F.speed = s.sp;
        if (s.a === 'schlag' && !p.swingT) {
          F.play('chop', 0.7);
          p.swingT = 0.7;
        }
        if (p.swingT > 0) p.swingT -= dt;
        F.anim(dt, true);
        held(p, s.w, s.yaw);
        sawSound(p, s);
        const h = F.head();
        _v.copy(V(h[0], h[1], h[2] + 0.35)).project(cam);
        const r = stage.getBoundingClientRect();
        if (_v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1) {
          p.lab.style.display = 'block';
          p.lab.style.left = ((_v.x + 1) / 2) * r.width + 'px';
          p.lab.style.top = ((1 - _v.y) / 2) * r.height + 'px';
        } else p.lab.style.display = 'none';
      } else {
        if (p.lab) p.lab.style.display = 'none';
        sawSound(p, null);
      }
      if (p.wObj) p.wObj.visible = show;
      markDirty();
    }
  }
  KERN.tick(tick, 'zombie/netz');
  // what the others should see of me: a swing (his figure strikes), a barricade (the noises: Z.noise above)
  KERN.on('zombie:swing', () => (S.act = 'schlag'));
  KERN.on('zombie:bar', d => {
    if (S.on && S.T && d && !d.net) S.T.send('ev', { k: 'bar', bid: d.bid, op: d.op, hp: d.hp });
  });
  // ---- the little dialog in the panel: open a room, join one, the link ----
  let UI = null;
  function status(t) {
    S.status = t;
    if (UI) UI.querySelector('.zns').textContent = t || '';
    if (UI) UI.querySelector('.znl').hidden = !(S.on && S.role === 'host');
    if (UI && S.on && S.role === 'host') {
      const u = new URL(location.href);
      u.search = '?szenario=zombie&raum=' + S.code;
      UI.querySelector('.znl input').value = u.href;
    }
  }
  function ui() {
    if (UI) {
      UI.hidden = !UI.hidden;
      return;
    }
    ZHUD.build();
    const box = document.createElement('div');
    box.className = 'znet';
    box.innerHTML = `<div class="zt"><span>Zu zweit</span><em class="zns"></em></div>
      <div class="zx"><button data-n="host">Raum erstellen</button><input class="znc" maxlength="8" placeholder="Raumcode"><button data-n="join">Beitreten</button><button data-n="close">Trennen</button></div>
      <div class="znl" hidden><input readonly><button data-n="copy">Link kopieren</button></div>`;
    const st = document.createElement('style');
    st.textContent = `#zhud .znet{margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.12)} #zhud .znet[hidden],#zhud .znl[hidden]{display:none}
      #zhud .znet input{flex:1;min-width:0;font:500 12px/1 var(--f-mono,monospace);padding:6px 7px;border-radius:6px;border:0;background:rgba(255,255,255,.9);color:#222;text-transform:uppercase}
      #zhud .znl{margin-top:5px;display:flex;gap:6px} #zhud .znl input{text-transform:none;font-size:10.5px}`;
    document.head.appendChild(st);
    $('zhud').appendChild(box);
    box.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const k = b.dataset.n;
      if (k === 'host') open('host', '', QS.get('lokal') === '1');
      else if (k === 'join') {
        const c = clean(box.querySelector('.znc').value);
        if (c.length < 4) return status('Bitte den Raumcode eingeben.');
        open('gast', c, QS.get('lokal') === '1');
      } else if (k === 'close') close();
      else if (k === 'copy') {
        const i = box.querySelector('.znl input');
        i.select();
        try {
          navigator.clipboard.writeText(i.value);
          status('Link kopiert – schick ihn deinem Mitspieler.');
        } catch (err) {
          document.execCommand && document.execCommand('copy');
        }
      }
      b.blur();
    });
    UI = box;
    status(S.status);
  }
  ZHUD.acts.netz = ui;
  // ?szenario=zombie&raum=KLOSS7 – join at once (after the scene has started)
  const qr = clean(QS.get('raum'));
  if (qr)
    KERN.on('zombie:start', () =>
      setTimeout(() => {
        ui();
        open('gast', qr, QS.get('lokal') === '1');
      }, 800)
    );
  KERN.on('zombie:stop', () => close());
  hookHorde();
  Object.assign(S, { open, close, transport, snapshot, puppets, ui, clean, newCode });
  return S;
})();
window.ZNETZ = ZNETZ;
