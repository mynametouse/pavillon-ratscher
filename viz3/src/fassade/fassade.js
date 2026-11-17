// ===================== feat/gebaeude 2: every building plausible from outside – the audit in the game, Ratscher's fixes (FASSADE) =====================
// Falko (17.11.2026 13:27): „ein Haus ohne Tür macht keinen Sinn … große Gebäude komplett ohne Fenster“. FASSADE.audit(ort) lists what is
// still implausible on the outside of the buildings of a place – [{ id, ort, art: 'tuer' | 'fenster' | 'durchgang' | 'hof', x, y, text,
// rest? }] (rest: why it may stay) – with the rules of fassade/fassade_audit.js on what is really drawn: Ratscher's village (world/village.js:
// the OSM buildings with the facade shader) and the buildings of ETHOS (gebaeude/gebaeude.js), Schleusingen's old town (welt/schleusingen.js,
// which applies its own fixes when it builds: doors to the yards, windows on the free runs of party walls, the passages and yards).
// FASSADE.audit(ort, { vorher: true }) gives the same before the fixes. FASSADE.eingang(id) → { x, y, hd } of a building's door (hd: the
// compass azimuth it faces). Ratscher's fixes, hooked in from outside (village.js and gebaeude.js stay as they are): a door where a building
// has none (its facade attribute – the shader paints it), the long low halls of the farms – stables, 70 m without a window in the shader,
// which paints a hall's ribbon only above 3.2 m – get a row of stable windows (one mesh of quads in the village props' own material: no new
// shader program), some lit at night with the village's windows (the same share by the hour, emissive – no lights). ?nofassade: as before.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { GEB } from '../gebaeude/gebaeude.js';
import { SCHL } from '../welt/schleusingen.js';
import { FAUDIT } from './fassade_audit.js';
export const FASSADE = (() => {
  const S = { on: false, state: 'idle', doors: new Map(), win: new Map(), meshes: [], ms: {}, err: '', n: {} };
  S.on = !new URLSearchParams(location.search).has('nofassade');
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    linC = c => c.map(lin);
  // ---- records of Ratscher: the village's buildings as the facade shader gets them, the ETHOS ones as gebaeude.js draws them ----
  const KINDV = b =>
    b.st && b.st.style === 12
      ? 'schule'
      : b.typ === 0
        ? 'haus'
        : b.typ === 1
          ? b.st && b.st.style === 10
            ? 'halle'
            : 'scheune'
          : 'schuppen';
  function recV(b) {
    const st = b.st || {},
      f = [];
    for (const q of b.fac) f.push(q.ax, q.ay);
    const fx = S.doors.get(b.id),
      fac = b.fac.map((q, k) => {
        let du = q.door ? q.door.u : -1,
          dw = q.door ? q.door.w : 0;
        if (fx && fx.from === k) [du, dw] = [-1, 0];
        if (fx && fx.k === k) [du, dw] = [fx.u, fx.w];
        return {
          k,
          ax: q.ax,
          ay: q.ay,
          bx: q.bx,
          by: q.by,
          L: q.L,
          dx: q.dx,
          dy: q.dy,
          nx: q.nx,
          ny: q.ny,
          LF: q.L,
          t0: q.t0,
          tA: q.tA,
          uA: q.uA,
          t1: q.t1,
          gable: q.kind === 'gable',
          du,
          dw,
          st: st.style || 0,
          sp: st.sp || 3,
          raised: !!st.raised,
          eave: b.eave,
          bid: b.id,
          extra: 0,
        };
      });
    return FAUDIT.prep({
      id: b.id,
      ort: 'ratscher',
      kind: KINDV(b),
      f,
      eave: b.eave,
      sp: st.sp || 3,
      bid: b.id,
      fac,
      v: b,
    });
  }
  // the door gebaeude.js gives an ETHOS building (its building(): the facade towards the street, else the longest)
  function gebDoor(b) {
    const o = b.st || {};
    if (!(o.doorW >= 0)) return null;
    let doorF = -1,
      best = 1e9;
    b.F.forEach((f, k) => {
      const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
      if (f[8] & 1 || L < (b.k === 0 ? 3 : 2.0)) return;
      const sc = (f[9] > 20 ? 30 : f[9]) - L * 0.08;
      if (sc < best) {
        best = sc;
        doorF = k;
      }
    });
    if (doorF < 0) return null;
    const f = b.F[doorF],
      L = Math.hypot(f[2] - f[0], f[3] - f[1]),
      nb = Math.max(1, Math.floor((L - 0.6) / (o.sp || 3))),
      bw = L / nb;
    if (o.doorW > 0)
      return { k: doorF, u: b.k === 2 ? L / 2 : (Math.floor(nb / 2) + 0.5) * bw, w: Math.min(o.doorW, L * 0.7) };
    if (o.typ === 0)
      return { k: doorF, u: ((nb >= 3 ? (FAUDIT.hh(b.id + 23) < 0.5 ? 1 : nb - 2) : 0) + 0.5) * bw, w: 1.05 };
    if (o.style === 10) return { k: doorF, u: L / 2, w: Math.min(5, L * 0.4) };
    return { k: doorF, u: (Math.floor(nb / 2) + 0.5) * bw, w: Math.min(3.0, L * 0.35) };
  }
  function recG(b) {
    const kind =
      b.k === 4 || b.k === 5
        ? 'turm'
        : b.k === 2
          ? 'schuppen'
          : b.k === 1
            ? b.st && b.st.style === 10
              ? 'halle'
              : 'scheune'
            : 'haus';
    const r = FAUDIT.fromF(b, {
      id: b.id,
      ort: 'ratscher',
      door: gebDoor(b),
      bid: b.id,
      kind,
      stOf: () => (b.st ? b.st.style : 0),
    });
    r.b = b; // its foot z0 and eave for the stable windows
    return r;
  }
  function recsRatscher() {
    const V = VILLAGE.ready ? VILLAGE.bld.map(recV) : [],
      G = GEB.ready ? GEB.bld.filter(b => b.st && b.F).map(recG) : [];
    for (const r of V.concat(G)) for (const p of r.fac) p.extra = (S.win.get(r.id) || {})[p.k] || 0;
    return V.concat(G);
  }
  // ---- records of Schleusingen: before (the street door only, each facade one piece) and as drawn (welt/schleusingen.js b.pieces) ----
  function recsSchl(vorher) {
    if (SCHL.state !== 'ready') return [];
    return SCHL.bld.map(b => {
      const r = FAUDIT.fromF(b, {
        id: 900000 + b.i,
        ort: 'schleusingen',
        door: b.doorV !== undefined ? b.doorV : SCHL.streetDoor ? SCHL.streetDoor(b) : null,
        ext: !!b.lm,
        stOf: (f, k) => (b.stF ? b.stF(f, k) : b.st.style),
      });
      if (!vorher && b.pieces && b.pieces.length) r.fac = b.pieces.map(p => Object.assign({}, p));
      return r;
    });
  }
  // ---- the audit ----
  function audit(ort, o = {}) {
    const t0 = performance.now();
    let out = [];
    try {
      if (ort === 'ratscher') {
        const R = recsRatscher(),
          vor = !!o.vorher;
        if (vor) {
          // before: the doors and windows as village.js and gebaeude.js drew them
          for (const r of R) {
            for (const p of r.fac) p.extra = 0;
            if (r.ort !== 'ratscher' || !r.v) continue;
            r.v.fac.forEach((q, k) => {
              r.fac[k].du = q.door ? q.door.u : -1;
              r.fac[k].dw = q.door ? q.door.w : 0;
              r.fac[k].extra = 0;
            });
          }
        }
        const idx = FAUDIT.index(R);
        for (const r of R)
          r.keepDoor = r.kind === 'haus' ? 'Haustür, durch die man ins Haus geht (Häuser von innen)' : undefined;
        // the yards: Ratscher's farmyards open to the street (the gate is a gap, not a passage) – any enclosed space counts
        if (!S.yardsR) S.yardsR = FAUDIT.hoefe(R, { cell: 0.5, close: 1, min: 12 });
        const yards = S.yardsR.map(y => ({
          cx: y.cx,
          cy: y.cy,
          area: y.area,
          reach: false,
          rest:
            y.area < 25
              ? 'Zwickel zwischen den Gebäuden – kein Zugang nötig'
              : y.area < 80
                ? 'kleiner Hof – nur durch die Gebäude daneben'
                : undefined,
        }));
        out = FAUDIT.audit(R, { idx, ort, yards });
        S.nRec = R.length;
      } else if (ort === 'schleusingen') {
        const F = SCHL.fassade,
          vor = !!o.vorher || !F;
        const R = recsSchl(vor),
          idx = FAUDIT.index(R),
          yards = F
            ? F.yards.map(y => ({
                cx: y.cx,
                cy: y.cy,
                area: y.area,
                reach: vor ? false : y.reach,
                rest: vor ? undefined : y.rest,
              }))
            : [],
          passes = F ? (F.mapped || []).map(p => Object.assign({}, p, { open: vor ? false : p.open })) : [];
        if (vor && F)
          for (const y of yards)
            if (y.area < SCHL.FASS.SMALL) y.rest = 'Zwickel zwischen den Häusern – kein Zugang nötig';
        out = FAUDIT.audit(R, { idx, yards, passes, ort });
        S.nRec = R.length;
      }
    } catch (e) {
      S.err = String(e);
      console.warn('fassade audit', e);
    }
    S.ms['audit ' + ort + (o.vorher ? ' vorher' : '')] = Math.round(performance.now() - t0);
    return out;
  }
  // ---- the door of a building: { x, y, hd } (hd: compass azimuth it faces) ----
  function eingang(id) {
    const az = (nx, ny) => ((Math.atan2(nx, ny) * 180) / Math.PI + 360) % 360;
    if (id >= 900000 && SCHL.state === 'ready') {
      const b = SCHL.bld.find(q => q.i === id - 900000);
      const d = b && (b.doorFac || b.doorYard);
      if (!d) return null;
      if (d.dx !== undefined) return { x: d.ax + d.dx * d.u, y: d.ay + d.dy * d.u, hd: az(d.dy, -d.dx) };
      const f = b.F[d.k];
      if (f) {
        const L = Math.hypot(f[2] - f[0], f[3] - f[1]),
          dx = (f[2] - f[0]) / L,
          dy = (f[3] - f[1]) / L;
        return { x: f[0] + dx * d.u, y: f[1] + dy * d.u, hd: az(dy, -dx) };
      }
      return null;
    }
    const b = VILLAGE.byId && VILLAGE.byId.get(id);
    if (b) {
      const fx = S.doors.get(id);
      let k = b.fac.findIndex(q => q.door),
        u = k >= 0 ? b.fac[k].door.u : 0;
      if (fx) [k, u] = [fx.k, fx.u];
      if (k < 0) return null;
      const f = b.fac[k];
      return { x: f.ax + f.dx * u, y: f.ay + f.dy * u, hd: az(f.nx, f.ny) };
    }
    return null;
  }
  // ---- Ratscher's fixes (once, after the village and the ETHOS buildings stand) ----
  const STALL = { sp: 3.0, w: 1.2, h: 0.8, sill: 1.75 }; // stable windows of the farms' halls (LPG halls, 1960s–80s: a row, high)
  // a row of stable windows along a wall q ({ ax, ay, dx, dy, nx, ny, L }): bays of 3 m, not at the door (p.du, p.dw) nor where a
  // neighbour stands (spans); into the kits KW (frames) and KG (the glass in three groups); → how many
  let KW = null,
    KG = null;
  const FR = linC([0.62, 0.62, 0.6]),
    GL = linC([0.05, 0.06, 0.07]);
  function stallRow(q, p, footAt, eave, spans, seed) {
    const nb = Math.max(1, Math.floor((q.L - 0.6) / STALL.sp)),
      bw = q.L / nb,
      top = Math.min(STALL.sill + STALL.h, eave - 0.35),
      sill = top - STALL.h,
      hw = STALL.w / 2;
    if (sill < 1.2) return 0;
    // the kit's quads are seen from the side they wind counter-clockwise: the walls run either way round
    const flip = q.dx * q.ny - q.dy * q.nx > 0;
    let n = 0;
    for (let bi = 0; bi < nb; bi++) {
      const u = (bi + 0.5) * bw;
      if (p.dw > 0 && Math.abs(u - p.du) < p.dw / 2 + hw + 0.4) continue;
      if (spans.some(([a, c]) => u + hw + 0.3 > a && u - hw - 0.3 < c)) continue;
      const foot = footAt(u),
        at = (du, z, o) => [q.ax + q.dx * (u + du) + q.nx * o, q.ay + q.dy * (u + du) + q.ny * o, foot + z],
        rect = (K, du0, du1, z0, z1, o, col) =>
          flip
            ? K.quad(at(du0, z0, o), at(du0, z1, o), at(du1, z1, o), at(du1, z0, o), col, z1 - z0, du1 - du0)
            : K.quad(at(du0, z0, o), at(du1, z0, o), at(du1, z1, o), at(du0, z1, o), col, du1 - du0, z1 - z0);
      // a concrete frame, the glass in it, a muntin cross (steel stable windows with small panes)
      rect(KW, -hw - 0.08, hw + 0.08, sill - 0.08, top + 0.08, 0.025, FR);
      rect(FAUDIT.hh(seed * 7.3 + bi * 1.9) < 0.38 ? KG : KW, -hw, hw, sill, top, 0.035, GL);
      rect(KW, -0.03, 0.03, sill, top, 0.045, FR);
      rect(KW, -hw, hw, sill + STALL.h / 2 - 0.03, sill + STALL.h / 2 + 0.03, 0.045, FR);
      n++;
    }
    S.n.fenster += n;
    return n;
  }
  function fixRatscher() {
    const t0 = performance.now(),
      g = RATSCHER.bld[0] && RATSCHER.bld[0].geometry,
      aD = g && g.attributes.aD;
    if (!aD) throw new Error('village walls without aD');
    const R = recsRatscher(),
      idx = FAUDIT.index(R),
      free = (x, y) => !idx.at(x, y),
      setDoor = (b, k, u, w) => {
        for (const q of b.fac[k].qs)
          for (let v = 0; v < 4; v++) {
            aD.array[(q.q * 4 + v) * 4] = u;
            aD.array[(q.q * 4 + v) * 4 + 1] = w;
          }
      };
    S.n = { tuer: 0, tuerVerlegt: 0, hallen: 0, fenster: 0 };
    KW = VPROPS.kit ? VPROPS.kit() : null;
    KG = VPROPS.kit ? VPROPS.kit() : null;
    for (const r of R) {
      const b = r.v;
      if (!b) continue;
      const doorK = b.fac.findIndex(q => q.door);
      // a door where there is none (small sheds: no wall long enough for the village's rule), or one that faces a neighbour's wall (not
      // a house: their door is the one one walks through into the house)
      let blocked = false;
      if (doorK >= 0) {
        const q = b.fac[doorK],
          x = q.ax + q.dx * q.door.u,
          y = q.ay + q.dy * q.door.u;
        blocked = !!idx.at(x + q.nx * 0.7, y + q.ny * 0.7, r);
      }
      if ((doorK < 0 && r.area >= 6) || (blocked && b.typ !== 0)) {
        const pieces = r.fac.map((p, k) =>
          Object.assign({}, p, { k, blind: FAUDIT.cover(r, p, idx).covered > p.L * 0.5 })
        );
        const D = FAUDIT.hofTuer(r, pieces, free);
        if (D) {
          if (doorK >= 0) setDoor(b, doorK, -1, 0);
          setDoor(b, D.k, D.u, D.w);
          S.doors.set(b.id, { k: D.k, u: D.u, w: D.w, from: doorK >= 0 ? doorK : -1 });
          S.n[doorK < 0 ? 'tuer' : 'tuerVerlegt']++;
        }
      }
      // halls the shader leaves without a window (its ribbon starts at 3.2 m): stable windows along the long walls
      if (r.kind === 'halle' && KW) {
        // every long wall the shader leaves bare (a hall may have its ribbon in a high gable and none on its long walls)
        const Lmax = Math.max(...r.fac.map(p => p.L)),
          per = {};
        b.fac.forEach((q, k) => {
          if (q.L < Math.max(8, Lmax * 0.5) || FAUDIT.windows(r.fac[k]).length) return;
          // the foot of the quad under a window (the walls follow the ground)
          const footAt = u => {
            let foot = b.foot,
              uu = 0;
            for (const qq of q.qs) {
              if (u >= uu && u <= uu + qq.len) foot = qq.foot;
              uu += qq.len;
            }
            return foot;
          };
          const n = stallRow(q, r.fac[k], footAt, b.eave, FAUDIT.cover(r, r.fac[k], idx).spans, b.id);
          if (n) per[k] = n;
        });
        if (Object.keys(per).length) {
          S.win.set(b.id, per);
          S.n.hallen++;
        }
      }
    }
    // the ETHOS halls (gebaeude/gebaeude.js) likewise – their walls stand at the building's foot z0
    for (const r of R) {
      if (r.v || r.kind !== 'halle' || !KW || !r.b || r.area < 150) continue;
      const Lmax = Math.max(...r.fac.map(p => p.L)),
        per = {};
      for (const p of r.fac) {
        if (p.L < Math.max(8, Lmax * 0.5) || p.blind || FAUDIT.windows(p).length) continue;
        const n = stallRow(p, p, () => r.b.z0, r.b.e, FAUDIT.cover(r, p, idx).spans, r.id);
        if (n) per[p.k] = n;
      }
      if (Object.keys(per).length) {
        S.win.set(r.id, per);
        S.n.hallen++;
      }
    }
    aD.needsUpdate = true;
    // the meshes: frames and dark glass in the props' paint; the glass that lights at night (a share of the windows) in a clone of it
    // with emissive (the same program)
    const paint = VPROPS.mat && VPROPS.mat.paint;
    if (KW && paint && !KW.empty()) {
      add(new THREE.Mesh(KW.geo(), paint), 'stallfenster');
      S.glass = [];
      if (!KG.empty()) {
        const m = paint.clone();
        m.roughness = 0.25;
        m.emissive = new THREE.Color(1.0, 0.7, 0.42);
        m.emissiveIntensity = 0;
        const me = add(new THREE.Mesh(KG.geo(), m), 'stallfenster licht');
        me.userData.own = true;
        S.glass.push({ m, thr: 0.2 });
      }
    }
    S.ms.ratscher = Math.round(performance.now() - t0);
    markDirty(true);
  }
  function add(m, name) {
    m.name = 'fassade ' + name;
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    S.meshes.push(m);
    if (RATSCHER.bld) {
      RATSCHER.bld.push(m); // hidden with the village in the map view (world/ratscher.js setMap)
      m.visible = !RATSCHER.map;
    }
    return m;
  }
  // at night the stable windows glow with the village's windows (VILLAGE.U: night, share by the hour, strength)
  let last = -1;
  function tick() {
    if (!S.glass || !VILLAGE.U) return;
    const U = VILLAGE.U,
      n = U.uNight.value * U.uWinK.value,
      p = U.uWinP.value,
      key = Math.round(n * 100) * 1000 + Math.round(p * 100);
    if (key === last) return;
    last = key;
    for (const g of S.glass) g.m.emissiveIntensity = p > g.thr ? n * 0.3 : 0;
    markDirty();
  }
  if (S.on && RATSCHER.on)
    whenLoaded(() => {
      const off = KERN.tick(() => {
        if (!VILLAGE.ready || (GEB.on && !GEB.ready)) return;
        off();
        try {
          fixRatscher();
          S.state = 'ready';
          KERN.tick(tick, 'fassade');
        } catch (e) {
          S.state = 'error';
          S.err = String(e);
          console.warn('fassade', e);
        }
      }, 'fassade-start');
    });
  S.audit = audit;
  S.eingang = eingang;
  // the windows of a town house as they are painted (welt/schleusingen.js b.pieces through the shader's rules): [{ k (its wall in b.F),
  // u0, u1 (metres along that wall from its start), z0, z1 (above the building's foot z0), fi (storey) }] – for the rooms behind them
  // (schleusingen/si_plan.js reads b.F, where a party wall is blank all along; its free runs have windows now)
  S.fenster = id => {
    const b = SCHL.state === 'ready' && SCHL.bld.find(q => q.i === id - 900000);
    if (!b || !b.pieces) return [];
    const out = [];
    for (const p of b.pieces) {
      const f = b.F[p.k],
        us = Math.hypot(p.ax - f[0], p.ay - f[1]);
      for (const w of FAUDIT.windows(p))
        out.push({ k: p.k, u0: us + w.u0, u1: us + w.u1, z0: w.z0, z1: w.z1, fi: w.fi });
    }
    return out;
  };
  S.count = list => FAUDIT.count(list);
  S.status = () => ({
    state: S.state,
    on: S.on,
    nRec: S.nRec || 0,
    doors: S.n,
    meshes: S.meshes.length,
    ms: S.ms,
    err: S.err,
    schl: SCHL.fassade
      ? {
          ms: SCHL.fassade.ms,
          n: SCHL.fassade.n,
          yards: SCHL.fassade.yards.map(y => ({ a: Math.round(y.area), reach: !!y.reach, rest: y.rest || '' })),
          passes: SCHL.fassade.passes.map(p => ({
            src: p.src,
            depth: +p.depth.toFixed(1),
            w: +p.w.toFixed(2),
            h: p.h,
            b: p.b.i,
          })),
        }
      : null,
  });
  return S;
})();
window.FASSADE = FASSADE;
