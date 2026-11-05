// ===================== feat/zombie-ziele: the end of the third night – the radio, the bus at the old school, the last wave, the ending (ZBUS) =====================
// Falko, 5.11.2026 17:57, „Steigende Nächte mit Ende“: „Jede Nacht härter; in der 3. Nacht Evakuierung (Bus an der alten Schule) – wer ihn
// erreicht, hat gewonnen.“ On the third day the radio in a house (or, at noon at the latest, a radio through an open window) announces it:
// at 4:00 a bus stops at the old school. The third night's task (instead of the plain night of zombie/z_ziele.js): to the school, hold out
// there until the bus comes, get in. At 4:00 a coach without any brand – a simple model of true size, plain materials, its lights on –
// comes along the street to the school's bus stop, sounds its horn and waits about 90 seconds; the zombies of the night come to it in a
// last wave (ZHORDE.wave). „Einsteigen“ at its door → a fade, the ending: nights, zombies, the allies near the bus who came along, deaths;
// „Weiterspielen“ (the next morning, the nights go on) or „Neu beginnen“. Missed: the bus leaves, „Weg. Dann eben allein.“, the nights go
// on. What is kept: the tasks (pav-tasks-v1: 'zz-radio', 'zz-bus' done = boarded, 'zz-allein' = missed); the bus itself is not saved (a
// reload while it waits brings it again while it is still before 4:45).
import * as THREE from 'three';
import { COARSE, scene, stage, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { TASKS } from '../core/tasks.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { ROADS } from '../world/roads.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { VEH } from '../vehicles/vehicle.js';
import { audio } from '../audio/audio.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZHORDE } from './z_horde.js';
import { ZHAUS } from './z_haus.js';
import { ZBUND } from './z_bund.js';
import { ZHUD } from './z_hud.js';
import { ZNETZ } from './z_netz.js';
import { ZOMBIE } from './z_modus.js';
import { ZZIEL } from './z_ziele.js';
export const ZBUS = (() => {
  const S = {
    st: 'aus',
    s: 0,
    v: 0,
    t: 0,
    G: null,
    line: null,
    s0: 0,
    sStop: 0,
    heard: false,
    aboard: null,
    waveT: 0,
    hornT: 0,
  };
  const hyp = Math.hypot;
  // the night of the bus, when it stops (game minute), how long it waits (real seconds), until when it may still come after a time skip
  const BUS = { night: 3, at: 4 * 60, wait: 90, late: 4 * 60 + 45, v: 10, brake: 1.5, go: 1.2, vmax: 13 };
  const minute = () => ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
  const SAY =
    'Hier spricht der Krisenstab des Landkreises. Für Ratscher: Heute Nacht um 4 Uhr hält ein Bus an der alten Schule. Wer mit will, muss da sein. Wir können nicht warten.';
  // ---- the stop: the school bus stop by the old school (world/village_props.js, place from world/dorfkern_data.js) ----
  function shelter() {
    const sh = (DKDATA && DKDATA.open && DKDATA.open.shelter) || { c: [248.8, -100.8], az: 196 };
    return { x: sh.c[0], y: sh.c[1], az: sh.az };
  }
  // ---- the way: the street past the stop from OpenStreetMap (world/roads.js ROADS.ways), the straightest way on from both ends, the
  //      right-hand lane (verkehr/verkehr_netz.js), the door side to the shelter ----
  function way() {
    if (S.line !== null && S.lineFor === (ROADS.ways || []).length) return S.line;
    S.line = null;
    S.lineFor = (ROADS.ways || []).length;
    try {
      const sh = shelter(),
        G = VNETZ.graph(ROADS.ways || [], { kinds: new Set([1, 2, 3, 4]), clip: [sh.x, sh.y, 420] });
      let best = null,
        bd = 1e9;
      for (const e of G.edges)
        for (let k = 1; k < e.pts.length; k++) {
          const [ax, ay] = e.pts[k - 1],
            [bx, by] = e.pts[k],
            dx = bx - ax,
            dy = by - ay,
            l2 = dx * dx + dy * dy || 1e-9,
            t = Math.max(0, Math.min(1, ((sh.x - ax) * dx + (sh.y - ay) * dy) / l2)),
            d = hyp(sh.x - ax - dx * t, sh.y - ay - dy * t);
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
      if (!best || bd > 35) return null;
      // from a node on, edge by edge: the one with the smallest turn (streets before lanes), until `want` metres
      const dirAt = (e, fromNode, end) => {
        const q = e.a === fromNode ? e.pts : e.pts.slice().reverse(),
          [a, b] = end ? [q[q.length - 2], q[q.length - 1]] : [q[0], q[1]];
        return Math.atan2(b[0] - a[0], b[1] - a[1]);
      };
      const grow = (node, prev, want) => {
        const out = [];
        let len = 0,
          cur = node,
          pe = prev,
          seen = new Set([prev.i]);
        while (len < want) {
          const h0 = dirAt(pe, pe.a === cur ? pe.b : pe.a, true);
          let pick = null,
            pc = 1e9;
          for (const e of G.nodes[cur].edges) {
            if (seen.has(e.i)) continue;
            let dh = Math.abs(dirAt(e, cur, false) - h0);
            if (dh > Math.PI) dh = 2 * Math.PI - dh;
            const c = dh + (e.kind > 3 ? 0.6 : 0);
            if (dh < 1.6 && c < pc) {
              pc = c;
              pick = e;
            }
          }
          if (!pick) break;
          seen.add(pick.i);
          out.push({ e: pick, fwd: pick.a === cur });
          len += pick.len;
          pe = pick;
          cur = pick.a === cur ? pick.b : pick.a;
        }
        return out;
      };
      const back = grow(best.a, best, 300)
        .reverse()
        .map(p => ({ e: p.e, fwd: !p.fwd }));
      let path = [...back, { e: best, fwd: true }, ...grow(best.b, best, 260)];
      const mk = pth => VNETZ.line(pth, { off: e => Math.max(1.1, Math.min(1.75, e.w / 4)), cut: 6 });
      let L = mk(path);
      if (!L) return null;
      // the door (right) side to the shelter: else the other way round
      let pr = VNETZ.project(L, sh.x, sh.y, 0, L.L);
      if (pr && pr.lat < 0) {
        path = path.reverse().map(p => ({ e: p.e, fwd: !p.fwd }));
        L = mk(path);
        pr = L && VNETZ.project(L, sh.x, sh.y, 0, L.L);
      }
      if (!L || !pr) return null;
      // (it stops with its front door at the shelter: the middle 5 m before it)
      S.line = L;
      S.sStop = Math.max(10, pr.s - 5.15);
      S.s0 = Math.max(0, S.sStop - 280);
    } catch (e) {
      console.warn('zombie bus way', e);
      S.line = null;
    }
    return S.line;
  }
  // ---- the coach: 12 m, 2.55 m wide, 3.3 m high; cream with a dark band, dark windows, lights; built once, plain materials ----
  let M = null;
  function model() {
    if (S.g) return S.g;
    M = M || {
      body: plain({ color: 0xe9e4d6, roughness: 0.45, metalness: 0.1 }),
      band: plain({ color: 0x24384f, roughness: 0.5 }),
      glass: plain({ color: 0x141b20, roughness: 0.12, metalness: 0.4 }),
      dark: plain({ color: 0x1c1c1e, roughness: 0.8 }),
      tyre: plain({ color: 0x151515, roughness: 0.9 }),
      rim: plain({ color: 0x9a9da0, roughness: 0.35, metalness: 0.7 }),
      head: plain({ color: 0xfff6dc, emissive: 0xfff2d0, emissiveIntensity: 2.2 }),
      tail: plain({ color: 0x8a1010, emissive: 0xff2010, emissiveIntensity: 1.6 }),
      sign: plain({ color: 0x402a08, emissive: 0xffa21e, emissiveIntensity: 1.4 }),
      inside: plain({ color: 0xfff0c8, emissive: 0xffe6b0, emissiveIntensity: 0.5 }),
    };
    const g = new THREE.Group(),
      box = (m, w, h, l, x, y, z) => {
        // (local: x right, y up, z back; the front at z = -6)
        const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
        o.position.set(x, y, z);
        o.castShadow = true;
        g.add(o);
        return o;
      };
    const L = 12,
      W = 2.55,
      F = -L / 2;
    box(M.body, W, 2.55, L, 0, 0.35 + 1.275, 0); // the body
    box(M.band, W + 0.02, 0.32, L - 0.2, 0, 0.95, 0); // the band along the side
    box(M.glass, W + 0.03, 1.1, L - 1.6, 0, 2.25, 0.5); // the side windows
    box(M.inside, W - 0.2, 0.9, L - 1.8, 0, 2.2, 0.5); // the lit cabin behind them (seen through nothing – a glow at night)
    box(M.glass, W - 0.1, 1.45, 0.04, 0, 2.05, F - 0.01); // the windscreen
    box(M.glass, 0.04, 2.1, 1.1, W / 2 + 0.01, 1.45, F + 0.85); // the door, front right
    box(M.body, W + 0.02, 0.45, 0.05, 0, 3.0, F - 0.02); // above the windscreen
    box(M.sign, W - 0.5, 0.26, 0.05, 0, 3.0, F - 0.05); // the destination display
    box(M.dark, W, 0.4, 0.06, 0, 0.55, F - 0.03); // the bumper
    for (const s of [-1, 1]) {
      box(M.head, 0.42, 0.16, 0.05, s * 0.85, 0.85, F - 0.06);
      box(M.tail, 0.2, 0.45, 0.05, s * 1.1, 1.0, L / 2 + 0.03);
      box(M.dark, 0.06, 0.3, 0.45, s * (W / 2 + 0.2), 2.5, F + 0.3); // the mirrors
    }
    const wg = new THREE.CylinderGeometry(0.5, 0.5, 0.32, 18),
      hg = new THREE.CylinderGeometry(0.26, 0.26, 0.34, 12);
    for (const z of [F + 2.6, L / 2 - 3.0, L / 2 - 1.75])
      for (const s of [-1, 1]) {
        const t = new THREE.Mesh(wg, M.tyre),
          r = new THREE.Mesh(hg, M.rim);
        t.rotation.z = r.rotation.z = Math.PI / 2;
        t.position.set(s * (W / 2 - 0.2), 0.5, z);
        r.position.copy(t.position);
        r.position.x += s * 0.01;
        t.castShadow = true;
        g.add(t, r);
      }
    g.traverse(o => (o.userData.noMerge = true));
    g.visible = false;
    scene.add(g);
    S.g = g;
    return g;
  }
  // the coach at s along the way: on the ground, along the street, pitched with the slope
  const _a = {};
  function put(s) {
    const L = way();
    if (!L || !S.g) return;
    VNETZ.at(L, s, _a);
    const gz = (x, y) => {
      try {
        const z = KERN.ground(x, y);
        return Number.isFinite(z) ? z : 0;
      } catch (e) {
        return 0;
      }
    };
    const fx = Math.sin(_a.hd),
      fy = Math.cos(_a.hd),
      z0 = gz(_a.x, _a.y),
      zf = gz(_a.x + fx * 5, _a.y + fy * 5),
      zb = gz(_a.x - fx * 5, _a.y - fy * 5);
    S.x = _a.x;
    S.y = _a.y;
    S.hd = _a.hd;
    S.z = (z0 + (zf + zb) / 2) / 2;
    S.g.position.copy(V(_a.x, _a.y, S.z));
    S.g.rotation.set(Math.atan2(zf - zb, 10), -_a.hd, 0, 'YXZ');
    markDirty();
  }
  // where one gets in: beside the front door (right side, 1.4 m out)
  const doorAt = () => {
    if (!S.g) return null;
    const fx = Math.sin(S.hd),
      fy = Math.cos(S.hd);
    return [S.x + fx * 5.15 + fy * 1.9, S.y + fy * 5.15 - fx * 1.9, S.z];
  };
  // the coach is solid for the walker and for cars while it is out (vehicles/vehicle.js VEH.extra – an oriented box; the door's spot
  // 0.6 m beside it stays free)
  VEH.extra.push({
    zbus: true,
    box: () => {
      if (!S.g || !S.g.visible || S.st === 'aus' || S.st === 'weg' || !Number.isFinite(S.x) || !Number.isFinite(S.hd))
        return null;
      const fx = Math.sin(S.hd),
        fy = Math.cos(S.hd);
      return { c: [S.x, S.y], ax: [fy, -fx], ay: [fx, fy], ex: 1.3, ey: 6, z0: S.z, z1: S.z + 3.3 };
    },
  });
  // ---- sounds: the diesel while it runs, the horn ----
  const raw = () => {
    const r = audio.raw && audio.raw();
    return r && r.ctx && r.ctx.state === 'running' ? r : null;
  };
  function engine(on) {
    const r = raw();
    if (!on || !r) {
      if (S.eng) {
        try {
          S.eng.g.gain.setTargetAtTime(0, S.eng.ctx.currentTime, 0.4);
          const e = S.eng;
          setTimeout(() => e.os.forEach(o => o.stop()), 1500);
        } catch (e) {}
        S.eng = null;
      }
      return;
    }
    if (S.eng) return;
    const os = [r.ctx.createOscillator(), r.ctx.createOscillator()],
      lp = r.ctx.createBiquadFilter(),
      g = r.ctx.createGain();
    os[0].type = 'sawtooth';
    os[1].type = 'square';
    os[0].frequency.value = 46;
    os[1].frequency.value = 23.2;
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    g.gain.value = 0;
    os.forEach(o => (o.connect(lp), o.start()));
    lp.connect(g);
    g.connect(r.sfx);
    S.eng = { os, lp, g, ctx: r.ctx };
  }
  function engineTick() {
    if (!S.eng || !S.g) return;
    const sp = audio.spatial ? audio.spatial(S.x, S.y, 14) : { vol: 0.3, lp: 1200 },
      k = 0.6 + Math.min(1, S.v / 10) * 0.6;
    S.eng.g.gain.setTargetAtTime(0.22 * sp.vol, S.eng.ctx.currentTime, 0.15);
    S.eng.os[0].frequency.setTargetAtTime(46 * k, S.eng.ctx.currentTime, 0.3);
    S.eng.os[1].frequency.setTargetAtTime(23.2 * k, S.eng.ctx.currentTime, 0.3);
    S.eng.lp.frequency.setTargetAtTime(Math.min(sp.lp, 200 + 140 * k), S.eng.ctx.currentTime, 0.2);
  }
  function horn(n = 2) {
    if (!S.g) return;
    Z.noise(S.x, S.y, 140, 3, 'hupe'); // (they hear it far: the last wave comes to it)
    const r = raw();
    if (!r) return;
    const sp = audio.spatial ? audio.spatial(S.x, S.y, 20) : { vol: 0.5, pan: 0, lp: 6000 };
    for (let i = 0; i < n; i++) {
      const t = r.ctx.currentTime + i * 1.25,
        g = r.ctx.createGain(),
        lp = r.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(3200, sp.lp);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32 * Math.max(0.02, sp.vol), t + 0.04);
      g.gain.setValueAtTime(0.32 * Math.max(0.02, sp.vol), t + 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      lp.connect(g);
      g.connect(r.sfx);
      for (const f of [370, 466]) {
        const o = r.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(lp);
        o.start(t);
        o.stop(t + 1.05);
      }
    }
  }
  // ---- the headlights: one of the shared point lights, a few metres ahead of the coach (no new light, no new program) ----
  KERN.lights.borrow({
    id: 'zbus:licht',
    n: 1,
    prio: 5,
    want: () => Z.on && !!S.g && S.g.visible,
    on: ls => {
      const l = ls[0];
      l.color.setHex(0xfff1d6);
      l.distance = 28;
      l.decay = 1.4;
      l.intensity = 0;
    },
    tick: ls => {
      const l = ls[0];
      if (!S.g) return;
      const fx = Math.sin(S.hd),
        fy = Math.cos(S.hd);
      l.position.copy(V(S.x + fx * 10, S.y + fy * 10, S.z + 1.2));
      l.intensity = Z.phase === 'nacht' ? 22 : 6;
    },
  });
  // ---- the radio: on the third day it announces the bus (instead of the crackle of zombie/z_haus.js) ----
  function announce(how) {
    if (S.heard) return;
    S.heard = true;
    PLAY.think(
      (how === 'fenster' ? 'Aus einem offenen Fenster plärrt ein Radio: ' : 'Das Radio: ') + '„' + SAY + '“',
      9000
    );
    ZHUD.say('Evakuierung', 'Um 4 Uhr hält ein Bus an der alten Schule. Wer mit will, muss da sein.', 9);
    Z.emit('radio', { how: how || 'radio' });
  }
  const radioDay = () => Z.night === BUS.night - 1 && Z.phase !== 'nacht' && !busDone();
  KERN.on('zombie:enter', () => {
    const H = ZHAUS.H;
    if (!H || H.zzRadio) return;
    H.zzRadio = true;
    const use0 = H.onUse;
    H.onUse = (spot, h) => {
      if (spot && (spot.kind === 'radio' || spot.kind === 'tv') && radioDay()) {
        announce('radio');
        return true;
      }
      return use0 ? use0(spot, h) : false;
    };
  });
  const busDone = () => {
    const a = TASKS.state('zz-bus');
    return (a && a.st === 'erledigt') || !!TASKS.state('zz-allein');
  };
  ZZIEL.add({
    id: 'zz-radio',
    day: BUS.night,
    first: true,
    title: 'Nachrichten',
    text: () =>
      ZHAUS.H
        ? 'Schalt das Radio ein – vielleicht gibt es Nachrichten. (Radio: in der Stube oder Küche.)'
        : 'Seit Tagen nur Rauschen – aber vielleicht sendet jemand. Geh in ein Haus und schalt das Radio ein.',
    target: () => {
      if (ZHAUS.H) {
        const sp = (ZHAUS.H.spots || []).filter(s => s.kind === 'radio' || s.kind === 'tv');
        sp.sort((a, b) => hyp(a.pos[0] - P.x, a.pos[1] - P.y) - hyp(b.pos[0] - P.x, b.pos[1] - P.y));
        return sp.length ? [sp[0].pos[0], sp[0].pos[1], (sp[0].pos[2] || P.feet) + 0.6] : null;
      }
      const s = ZZIEL.safeHouse();
      if (s) return [s.h.door.x + s.h.door.nx * 1.4, s.h.door.y + s.h.door.ny * 1.4, (s.h.door.z || 0) + 2.4];
      const h = ZZIEL.nearHouse('radio', () => true);
      return h ? [h.door.x + h.door.nx * 1.4, h.door.y + h.door.ny * 1.4, (h.door.z || 0) + 2.4] : null;
    },
    done: () => S.heard,
    fin: 'Um 4 Uhr hält ein Bus an der alten Schule.',
  });
  // ---- the third night: to the school, hold out, get in ----
  const stopPt = () => {
    const sh = shelter(),
      L = way();
    if (L) {
      VNETZ.at(L, S.sStop, _a);
      return [(_a.x + sh.x) / 2, (_a.y + sh.y) / 2, sh.z !== undefined ? sh.z : KERN.ground(sh.x, sh.y) + 2.6];
    }
    return [sh.x, sh.y, KERN.ground(sh.x, sh.y) + 2.6];
  };
  const hoursTo = m => {
    const d = (m - minute() + 1440) % 1440;
    return d >= 90
      ? 'noch etwa ' + Math.round(d / 60) + ' Stunden'
      : d >= 45
        ? 'noch etwa eine Stunde'
        : 'noch ' + Math.max(5, Math.round(d / 10) * 10) + ' Minuten';
  };
  const atSchool = () => {
    const p = stopPt();
    return hyp(p[0] - P.x, p[1] - P.y) < 22;
  };
  ZZIEL.define({
    id: 'zz-bus',
    title: 'Der Bus um vier',
    who: 'Zombie-Nacht · Nacht ' + BUS.night,
    steps: [
      {
        get text() {
          return 'Halte durch, bis die Sirene heult – und heute Nacht um 4 Uhr hält ein Bus an der alten Schule. Wer mit will, muss da sein.';
        },
        target: ZZIEL.own(stopPt),
        on: 'zombie:siren',
      },
      {
        get text() {
          return 'Geh zur alten Schule – um 4 Uhr hält dort der Bus (' + hoursTo(BUS.at) + ').';
        },
        target: ZZIEL.own(stopPt),
        check: () => Z.on && atSchool(),
      },
      {
        get text() {
          return S.st === 'kommt'
            ? 'Da kommt er! Halte durch, gleich hält der Bus.'
            : 'Halte an der Schule durch, bis der Bus kommt (' + hoursTo(BUS.at) + ').';
        },
        target: ZZIEL.own(stopPt),
        on: 'zombie:bus',
        when: d => d && d.st === 'steht',
      },
      {
        get text() {
          return S.st === 'steht'
            ? 'Der Bus ist da – steig ein, bevor er abfährt (noch ' + left() + ' s)!'
            : 'Steig in den Bus!';
        },
        target: ZZIEL.own(() => (S.st === 'steht' ? doorAt() && [...doorAt().slice(0, 2), S.z + 3.2] : stopPt())),
        on: 'zombie:bus',
        when: d => d && d.st === 'drin',
      },
    ],
    done: 'Mit dem Bus raus aus Ratscher.',
  });
  ZZIEL.define({
    id: 'zz-allein',
    title: 'Allein weiter',
    who: 'Zombie-Nacht · Nacht ' + BUS.night,
    steps: [
      {
        text: 'Der Bus ist weg. Überlebe bis zum Morgengrauen – und dann Nacht für Nacht.',
        target: ZZIEL.own(() => ZZIEL.nightTarget()),
        on: 'zombie:survived',
      },
    ],
    done: 'Allein weiter – Ratscher ist jetzt dein Revier.',
  });
  ZZIEL.NIGHTS.custom[BUS.night] = () => (TASKS.state('zz-allein') ? 'zz-allein' : 'zz-bus');
  ZZIEL.NIGHTS.siren = ['zz-bus'];
  // ---- the bus: comes, waits, leaves ----
  const busNight = () => Z.on && Z.night === BUS.night && Z.phase === 'nacht';
  // seconds until it leaves (the guest's bus waits for the host's message, half a minute longer at most)
  const left = () => Math.max(0, Math.ceil((isHost() ? BUS.wait : BUS.wait + 30) - S.t));
  function setSt(st) {
    S.st = st;
    S.t = 0;
    Z.emit('bus', { st });
  }
  function come() {
    const L = way();
    if (!L) {
      console.warn('zombie bus: no way to the school');
      return false;
    }
    model();
    S.s = S.s0;
    S.v = BUS.v;
    S.g.visible = true;
    put(S.s);
    engine(true);
    setSt('kommt');
    return true;
  }
  function arrive() {
    S.v = 0;
    put(S.sStop);
    setSt('steht');
    horn(2);
    S.hornT = 0;
    S.waveT = 0;
    // the last wave: more of them out of the doors around, and all of the night come here
    const n = Math.round(ZDATA.night(Z.night, Z.diff).count * 0.5);
    S.waveN = ZHORDE.wave ? ZHORDE.wave(S.x, S.y, Math.min(COARSE ? 5 : 10, n)) : 0;
    // the task: wherever one is in it, now it says „get in“
    const st = TASKS.state('zz-bus');
    if (st && st.st === 'läuft') while (TASKS.state('zz-bus').i < 3) TASKS.advance('zz-bus');
    KERN.act({
      id: 'zbus:ein',
      r: 3.4,
      prio: 3,
      pos: () => (S.st === 'steht' ? [...doorAt().slice(0, 2), S.z + 1.4] : null),
      label: () => (S.st === 'steht' && Z.on && Z.hp > 0 ? 'Einsteigen' : null),
      run: board,
    });
  }
  function leave() {
    KERN.unact('zbus:ein');
    if (isHost()) tell('faehrt');
    setSt('faehrt');
    S.v = 0;
    horn(1);
    if (!S.aboard) missed();
  }
  function gone() {
    engine(false);
    if (S.g) S.g.visible = false;
    setSt('weg');
    markDirty();
  }
  function missed() {
    PLAY.think('Weg. Dann eben allein.', 4500);
    TASKS.reset('zz-bus');
    TASKS.start('zz-allein');
    ZZIEL.sync();
  }
  // ---- getting in: who comes along, the fade, the ending ----
  async function board() {
    if (S.st !== 'steht' || S.aboard || Z.hp <= 0) return;
    const d = doorAt();
    const with_ = ZBUND.list.filter(a => {
      if (a.dead || a.down || a.mode === 'versteckt') return false;
      const x = a.npc ? a.npc.x : a.x,
        y = a.npc ? a.npc.y : a.y;
      return d && hyp(x - d[0], y - d[1]) < 25;
    });
    S.aboard = { at: CLOCK.t, with: with_.map(a => a.name).concat(S.peerIn ? [S.peerIn] : []), night: Z.night };
    tell('drin', { host: isHost() });
    Z.emit('bus', { st: 'drin', with: S.aboard.with });
    fade(true);
    await new Promise(r => setTimeout(r, 650));
    // the night is over for us: they lose us, the coach leaves with us in it
    for (const e of Z.ents) if (e.kind === 'zombie' && !e.dead) e.hold = 'idle';
    KERN.unact('zbus:ein');
    S.st = 'faehrt';
    S.t = 0;
    S.v = 2;
    ending();
  }
  // ---- the fade and the ending screen (own elements, the style of the death screen of zombie/z_hud.js) ----
  const CSS = `
#zende{position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;
  background:radial-gradient(ellipse at center,rgba(14,18,22,.9) 30%,rgba(4,6,8,.97) 100%);color:#f3ece2;text-align:center;
  font:600 clamp(24px,4.2vw,42px)/1.15 var(--f-display,Georgia,serif)}
#zende[hidden],#zzfade[hidden]{display:none!important}
#zende small{display:block;max-width:560px;font:400 clamp(13px,1.8vw,16px)/1.45 var(--f-body,system-ui);opacity:.88}
#zende dl{display:grid;grid-template-columns:auto auto;gap:4px 18px;margin:6px 0 4px;font:500 14px/1.3 var(--f-body,system-ui)}
#zende dt{text-align:right;opacity:.7;font-weight:400} #zende dd{margin:0;text-align:left}
#zende .zeb{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}
#zende button{font:600 15px/1 var(--f-body,system-ui);padding:12px 22px;border-radius:999px;border:0;background:#f2e9e4;color:#1d1410;cursor:pointer}
#zende button.zn{background:rgba(255,255,255,.14);color:#f3ece2}
#zzfade{position:absolute;inset:0;z-index:8;background:#000;opacity:0;pointer-events:none;transition:opacity .6s}
`;
  let ui = null;
  function build() {
    if (ui) return ui;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = stage || document.body,
      f = document.createElement('div'),
      e = document.createElement('div');
    f.id = 'zzfade';
    f.hidden = true;
    e.id = 'zende';
    e.hidden = true;
    e.setAttribute('role', 'dialog');
    e.setAttribute('aria-label', 'Das Ende der Zombie-Nacht');
    root.appendChild(f);
    root.appendChild(e);
    e.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.z === 'weiter') weiter();
      else if (b.dataset.z === 'neu') neu();
    });
    ui = { f, e };
    return ui;
  }
  function fade(on) {
    const u = build();
    u.f.hidden = false;
    void u.f.offsetWidth;
    u.f.style.opacity = on ? '1' : '0';
    if (!on) setTimeout(() => (u.f.hidden = true), 700);
  }
  const esc = t => String(t == null ? '' : t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  function ending() {
    const u = build(),
      A = S.aboard || { with: [] },
      nights = Math.max(Z.survived + 1, A.night || BUS.night);
    const allies = A.with.length ? A.with.join(', ') : 'niemand – du allein';
    u.e.innerHTML =
      '<div>Ihr seid raus.</div>' +
      '<small>Der Bus rollt durch die Dunkelheit talab Richtung Schleusingen. Hinter euch, im Nebel über Ratscher, heult noch einmal die Sirene.</small>' +
      '<dl>' +
      '<dt>Nächte überstanden</dt><dd>' +
      nights +
      '</dd><dt>Zombies erledigt</dt><dd>' +
      Z.kills +
      '</dd><dt>Mit dir im Bus</dt><dd>' +
      esc(allies) +
      '</dd><dt>Gestorben</dt><dd>' +
      (Z.deaths ? Z.deaths + '-mal' : 'nie') +
      '</dd></dl>' +
      '<small>Weiterspielen: du kommst am Morgen zurück nach Ratscher, die Nächte gehen weiter. Neu beginnen: der 31. Oktober von vorn.</small>' +
      '<div class="zeb"><button type="button" data-z="weiter">Weiterspielen</button><button type="button" class="zn" data-z="neu">Neu beginnen</button></div>';
    u.e.hidden = false;
    fade(false);
    S.shown = true;
    Z.emit('ende', { nights, kills: Z.kills, with: A.with, deaths: Z.deaths });
  }
  function hideEnd() {
    if (ui) ui.e.hidden = true;
    S.shown = false;
  }
  // „Weiterspielen“: the next morning back in Ratscher (the night counts as survived), the nights go on
  function weiter() {
    hideEnd();
    gone();
    for (const e of Z.ents) if (e.kind === 'zombie') e.hold = false;
    const T = Z.times ? Z.times() : ZDATA.TIME,
      m = minute();
    CLOCK.t += (T.dawn + 20 - m + 1440) % 1440;
    if (DN && DN.active) DN.update(true);
    Z.phase = 'tag';
    ZHORDE.clear();
    if (ZOMBIE.morning) ZOMBIE.morning();
    S.aboard = null;
    clearTimeout(S.backT);
    S.backT = setTimeout(
      () =>
        PLAY.think(
          'Der Bus hat dich bis zum Morgen nach Schleusingen gebracht. Jetzt bist du wieder in Ratscher – die Nächte gehen weiter.',
          6000
        ),
      2500
    );
    ZZIEL.sync();
  }
  function neu() {
    hideEnd();
    gone();
    S.aboard = null;
    if (ZOMBIE.start) ZOMBIE.start();
  }
  // ---- per frame ----
  function tick(dt) {
    if (!Z.on) {
      if (S.st !== 'aus') {
        gone();
        S.st = 'aus';
      }
      return;
    }
    dt = Math.min(dt, 0.1);
    const m = minute();
    // the radio through a window: the third day at noon at the latest
    if (!S.heard && radioDay() && m >= 12 * 60 && m < 20 * 60) announce('fenster');
    if (S.st === 'aus' || S.st === 'weg') {
      // 4:00 of the third night: it comes (after a long skip past 4:45 it is gone already)
      if (busNight() && m >= BUS.at && m < 12 * 60 && !busDone() && !S.aboard && S.st === 'aus') {
        if (m < BUS.late) come();
        else {
          S.st = 'weg';
          if (TASKS.state('zz-bus')) missed();
        }
      }
    } else if (S.st === 'kommt') {
      S.t += dt;
      const rest = S.sStop - S.s;
      S.v =
        rest < (S.v * S.v) / (2 * BUS.brake) + 0.5
          ? Math.max(0.6, Math.sqrt(2 * BUS.brake * Math.max(0, rest)))
          : BUS.v;
      S.s = Math.min(S.sStop, S.s + S.v * dt);
      put(S.s);
      if (S.sStop - S.s < 0.05) arrive();
    } else if (S.st === 'steht') {
      S.t += dt;
      S.hornT += dt;
      S.waveT += dt;
      if (S.hornT > 30) {
        S.hornT = 0;
        horn(1);
      }
      if (S.waveT > 10) {
        S.waveT = 0;
        if (ZHORDE.wave) ZHORDE.wave(S.x, S.y, 0);
      }
      // it waits ~90 s (two playing: as long as the host's bus – his message, else half a minute more); at daybreak it is gone anyway
      if ((S.t > BUS.wait && isHost()) || S.t > BUS.wait + 30 || Z.phase !== 'nacht') leave();
    } else if (S.st === 'faehrt') {
      S.t += dt;
      S.v = Math.min(BUS.vmax, S.v + BUS.go * dt);
      S.s += S.v * dt;
      put(S.s);
      // out of sight: 200 m on (the fog of the night), the end of the way, or a minute
      if (S.s >= S.line.L - 0.5 || S.s - S.sStop > 200 || S.t > 60) gone();
    }
    engineTick();
  }
  KERN.tick(tick, 'zombie/bus');
  // ---- two players (zombie/z_netz.js): the host's bus decides – it leaves when its time is up or he is in (a few seconds more for the
  //      other; at its door the other gets in with him); the guest gets in by himself, the host hears of it ----
  const two = () => !!(ZNETZ.on && ZNETZ.T && ZNETZ.T.peers && ZNETZ.T.peers.size);
  const isHost = () => !ZNETZ.on || ZNETZ.role !== 'gast';
  const tell = (st, o) => {
    if (two() && ZNETZ.tell) ZNETZ.tell('bus', Object.assign({ st }, o || {}));
  };
  KERN.on('znetz:bus', d => {
    if (!d || !Z.on) return;
    const name = (ZNETZ.peers && ZNETZ.peers[d.from] && ZNETZ.peers[d.from].name) || 'Dein Mitspieler';
    if (d.st === 'drin') {
      S.peerIn = name;
      if (d.host && S.st === 'steht' && !S.aboard) {
        const p = doorAt();
        if (p && hyp(p[0] - P.x, p[1] - P.y) < 8) board();
        else {
          S.t = Math.max(S.t, BUS.wait + 24); // (six seconds more: the guest's bus goes at wait + 30)
          PLAY.think(name + ' ist im Bus – er fährt gleich ab!', 3000);
        }
      } else PLAY.think(name + ' ist im Bus.', 2500);
    } else if (d.st === 'faehrt' && S.st === 'steht' && !isHost()) leave();
  });
  // the steering of the chain while the ending is on the screen: nothing new
  ZZIEL.hook = () => !!S.shown;
  KERN.on('zombie:start', d => {
    S.peerIn = null;
    clearTimeout(S.backT);
    if (d && d.fresh) {
      S.heard = false;
      S.aboard = null;
    } else {
      const r = TASKS.state('zz-radio');
      S.heard = !!(r && r.st === 'erledigt');
      // a reload after getting in, before „Weiterspielen“: on as if it was tapped (the morning, back in Ratscher)
      const b = TASKS.state('zz-bus');
      if (b && b.st === 'erledigt' && Z.night === BUS.night && Z.phase === 'nacht')
        setTimeout(() => Z.on && Z.phase === 'nacht' && weiter(), 1200);
    }
    hideEnd();
    if (S.st !== 'aus') gone();
    S.st = 'aus';
  });
  KERN.on('zombie:stop', () => {
    hideEnd();
    KERN.unact('zbus:ein');
    if (S.st !== 'aus') gone();
    S.st = 'aus';
  });
  Object.assign(S, {
    BUS,
    shelter,
    way,
    model,
    come,
    arrive,
    leave,
    board,
    ending,
    weiter,
    neu,
    announce,
    horn,
    doorAt,
    stopPt,
  });
  return S;
})();
window.ZBUS = ZBUS;
