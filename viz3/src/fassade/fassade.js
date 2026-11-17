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
import { BASE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { GEB } from '../gebaeude/gebaeude.js';
import { SCHL } from '../welt/schleusingen.js';
import { FAUDIT } from './fassade_audit.js';
export const FASSADE = (() => {
  const S = {
    on: false,
    state: 'idle',
    doors: new Map(),
    win: new Map(),
    geb: new Map(),
    meshes: [],
    ms: {},
    err: '',
    n: {},
  };
  S.on = !new URLSearchParams(location.search).has('nofassade');
  // ETHOS "towers" in the gaps of Schleusingen's old town (12–18 m tall, 21–37 m², each touching a house of the town data and walled in on
  // every side): parts of the LoD2 roofs of town houses the town draws itself – gebaeude/gebaeude.js built them as tall blank blocks (one
  // stood at the Markt). Left out after laeden's own (GEB.skip); the list from viz3/extra/gebaeude/quellen/teile.py
  const TEILE = new Set([
    'DEG_DETHL57P0000Lz6E',
    'DEG_DETHL57P0000Lz6Q',
    'DEG_DETHL57P0000LyRR',
    'DEG_DETHL57P0000LyTs',
    'DEG_DETHL57P0000LyYC',
    'DEG_DETHL57P0000LyYz',
  ]);
  if (S.on && GEB.on) {
    // gebaeude.js gives b.id a number as it builds b: the ETHOS id is kept in b.eid, so that a cell built again (its ground changed) asks
    // with it too – also for the hook before this one (laeden's list is of ETHOS ids)
    const prev = GEB.skip;
    GEB.skip = b => {
      if (!b) return false;
      if (typeof b.id === 'string') b.eid = b.id;
      const e = b.eid || b.id;
      if (prev && prev(e === b.id ? b : Object.assign(Object.create(b), { id: e }))) return true;
      return typeof e === 'string' && TEILE.has(e);
    };
  }
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    linC = c => c.map(lin);
  // ---- per-building looks from outside (feat/schleusingen-ansicht feeds them in from street views): key → look, from the data file
  // fassade/ansicht.json (an extra's dist/fassade/ansicht.json: { "v": 1, "quelle": "…", "b": { key: look } }) and FASSADE.ansicht(key,
  // look). Keys: '#<i>' (a building of Schleusingen's town data, SCHL.bld[].i), an address ('Markt 12': the houses with it), an ETHOS id
  // ('DEG_…', gebaeude/gebaeude.js), '@x,y' (model metres: the building standing there). Applied as the buildings are built: the town
  // (welt/schleusingen.js, its styles before its walls and roofs), the ETHOS cells and Ratscher's square (their walls repainted as they
  // stand: colour, material, shutters, frames, door – not the roof). A look given later counts from the next build. ----
  const LOOK = { key: new Map(), at: [], file: 0, used: 0, err: '', done: !S.on };
  const MAT = {
    putz: 0,
    stein: 0,
    glatt: 1,
    modern: 1,
    verkleidung: 1,
    glas: 1,
    schiefer: 2,
    'schiefer-ganz': 2,
    'schiefer-og': 3,
    'schiefer-giebel': 4,
    fachwerk: 5,
    'fachwerk-ganz': 5,
    'fachwerk-og': 6,
    'fachwerk-giebel': 6,
    scheune: 7,
    holz: 8,
    bretter: 8,
    klinker: 9,
    halle: 10,
    blech: 10,
    schuppen: 11,
    'schule-alt': 12,
  };
  // the kinds a look can give a building (art): its type (the town's door and steps follow it) and, without a material, its style
  const ART = { haus: [0, 0], halle: [1, 10], scheune: [1, 7], schuppen: [2, 11], kirche: [0, 0] },
    // the roof's covering (village.js roofKind): clay tiles, light fibre cement, corrugated sheet, slate, flat (gravel, bitumen)
    DACH = { ziegel: 0, eternit: 1, faserzement: 1, blech: 2, schiefer: 3, flach: 4, bitumen: 4, kies: 4, gruen: 4 },
    SAND = [0.88, 0.82, 0.7];
  const RAHMEN = { weiss: 0, weiß: 0, braun: 1, gruen: 2, grün: 2, grau: 3 },
    LAEDEN = { gruen: 0, grün: 0, braun: 1, grau: 2 };
  // '#rrggbb' or [r, g, b] (sRGB 0–1) → the linear colour the towns' palettes hold (× 0.82)
  const colOf = (c, k = 0.82) => {
    let a = null;
    if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c.trim())) {
      const h = c.trim().replace('#', '');
      a = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    } else if (Array.isArray(c) && c.length >= 3) a = c.slice(0, 3).map(Number);
    return a && a.every(Number.isFinite) ? a.map(v => lin(Math.min(1, Math.max(0, v))) * k) : null;
  };
  S.ansicht = (key, look) => {
    if (key === undefined || key === null || !look || typeof look !== 'object') return false;
    const k = String(key).trim();
    if (k[0] === '@') {
      const [x, y] = k.slice(1).split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      LOOK.at.push({ x, y, look });
      return true;
    }
    LOOK.key.set(k, look);
    return true;
  };
  S.ansichtReady = S.on
    ? fetch(BASE + 'fassade/ansicht.json')
        .then(r => (r.ok ? r.json() : null))
        .then(j => {
          if (j && j.b && typeof j.b === 'object') for (const k in j.b) if (S.ansicht(k, j.b[k])) LOOK.file++;
        })
        .catch(e => {
          LOOK.err = String(e);
        })
        .finally(() => {
          LOOK.done = true;
        })
    : Promise.resolve();
  // the look of a building: one of the town ({ i, a, k, f }) or of ETHOS ({ eid, f })
  S.ansichtOf = b => {
    if (!b || (!LOOK.key.size && !LOOK.at.length)) return null;
    let L = null;
    if (b.eid && LOOK.key.has(b.eid)) L = LOOK.key.get(b.eid);
    else if (b.i !== undefined && LOOK.key.has('#' + b.i)) L = LOOK.key.get('#' + b.i);
    else if (b.a && b.k === 0 && LOOK.key.has(b.a)) L = LOOK.key.get(b.a);
    if (!L && b.f)
      for (const q of LOOK.at)
        if (FAUDIT.inRing(b.f, q.x, q.y)) {
          L = q.look;
          break;
        }
    if (L) LOOK.used++;
    return L;
  };
  // a look onto the style fields of world/village.js (b.st of welt/schleusingen.js and gebaeude/gebaeude.js) → a new style object
  S.ansichtStil = (o, L) => {
    const n = Object.assign({}, o);
    // a school of our time: smooth plaster, wide bays, white frames, a wider light door with glass (1.3 m in the town: a wider one is a
    // gateway to SIPLAN), no shutters, light unless a colour is given (the facade shader's style 12 is Ratscher's school of 1828:
    // 'schule-alt')
    if (L.art === 'schule')
      Object.assign(n, {
        style: 1,
        sp: 3.6,
        frame: 0,
        shutters: false,
        door: 4,
        doorW: 1.3,
        col: colOf([0.93, 0.92, 0.89]),
      });
    if (typeof L.art === 'string' && ART[L.art]) {
      const [typ, st] = ART[L.art];
      n.typ = typ;
      if (!(typeof L.material === 'string' && MAT[L.material] !== undefined) && n.typ !== o.typ) n.style = st;
      if (typ === 0 && o.typ !== 0) n.sp = 2.8;
      // a church or chapel of rubble sandstone (the Gottesackerkirche): sandstone, plain frames, an oak door
      if (L.art === 'kirche')
        Object.assign(n, { style: 0, col: colOf(SAND), frame: 3, door: 7, sp: 3.4, shutters: false });
    }
    if (typeof L.material === 'string' && MAT[L.material] !== undefined) n.style = MAT[L.material];
    if (L.material === 'stein' && !L.farbe) n.col = colOf(SAND);
    if (L.fachwerk === true || Number.isFinite(L.fachwerk)) {
      if (n.style !== 5 && n.style !== 6) n.style = 6;
      if (Number.isFinite(L.fachwerk)) n.timber = Math.max(0, Math.min(2, Math.round(L.fachwerk)));
    } else if (L.fachwerk === false && (n.style === 5 || n.style === 6)) n.style = 0;
    const c = colOf(L.farbe);
    if (c) n.col = c;
    if (typeof L.laeden === 'boolean') n.shutters = L.laeden;
    else if (typeof L.laeden === 'string' && LAEDEN[L.laeden] !== undefined) {
      n.shutters = true;
      n.shut = LAEDEN[L.laeden];
    }
    if (typeof L.rahmen === 'string' && RAHMEN[L.rahmen] !== undefined) n.frame = RAHMEN[L.rahmen];
    const t = L.tuer;
    if (Number.isFinite(t)) n.door = Math.max(0, Math.min(7, Math.round(t)));
    else if (t && typeof t === 'object') {
      if (Number.isFinite(t.art)) n.door = Math.max(0, Math.min(7, Math.round(t.art)));
      if (Number.isFinite(t.breite)) n.doorW = Math.max(0.8, Math.min(4, t.breite));
    }
    if (Number.isFinite(L.achse)) n.sp = Math.max(2, Math.min(6, L.achse));
    if (typeof L.sockel === 'boolean') n.raised = L.sockel;
    // the tones of the timbers (0–3: dark brown, red-brown, black, grey) and of the slate (0 blue-black, 1 silver-grey, 2 mid grey,
    // 3 the house's colour)
    if (Number.isFinite(L.fachwerkTon)) n.timber = Math.max(0, Math.min(3, Math.round(L.fachwerkTon)));
    if (Number.isFinite(L.schieferTon)) n.slate = Math.max(0, Math.min(3, Math.round(L.schieferTon)));
    return n;
  };
  // the roof's covering of a look (dach: { material }) as village.js roof kind, or null
  S.ansichtDachArt = L => {
    const d = L && L.dach,
      m = d && typeof d === 'object' ? d.material : null;
    return typeof m === 'string' && DACH[m] !== undefined ? DACH[m] : null;
  };
  // the roof colour of a look ('dach': '#rrggbb' or { farbe }) as the town data holds it (sRGB 0–1), or null
  S.ansichtDach = L => {
    const d = L && L.dach,
      c = typeof d === 'string' || Array.isArray(d) ? d : d && d.farbe;
    const a = colOf(c, 1);
    return a ? a.map(v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)) : null;
  };
  S.ansichtStand = () => ({
    keys: LOOK.key.size,
    at: LOOK.at.length,
    file: LOOK.file,
    used: LOOK.used,
    err: LOOK.err,
    done: LOOK.done,
  });
  // ---- records of Ratscher: the village's buildings as the facade shader gets them, the ETHOS ones as gebaeude.js draws them ----
  const KINDV = b =>
    b.st && b.st.style === 12
      ? 'schule'
      : b.typ === 0
        ? b.st && b.st.style > 6.5 && b.st.style < 9.5
          ? 'scheune' // a dwelling the centre's look (world/dorfkern_data.js) draws as a brick or board building: barn windows
          : 'haus'
        : b.typ === 1
          ? b.st && b.st.style === 10
            ? 'halle'
            : 'scheune'
          : 'schuppen';
  // the style a facade is drawn in: the house's, or the look of the centre's table for the side it faces (world/village.js faceLook)
  function faceStyle(o, f) {
    if (o.faces) {
      const az = (Math.atan2(f.nx, f.ny) * 180) / Math.PI;
      for (const [a, F] of o.faces)
        if (Math.abs(((az - a + 540) % 360) - 180) < 50 && F.style !== undefined) return F.style;
    }
    return o.style || 0;
  }
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
          st: faceStyle(st, q),
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
  function recG(b, bare) {
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
    const fx = !bare && S.geb.get(b.id);
    if (fx)
      for (const p of r.fac) {
        if (fx.door && fx.door.k === p.k) [p.du, p.dw] = [fx.door.u, fx.door.w];
        p.extra = (p.extra || 0) + (fx.win[p.k] || 0);
      }
    return r;
  }
  function recsRatscher() {
    const V = VILLAGE.ready ? VILLAGE.bld.map(recV) : [],
      G = GEB.ready ? GEB.bld.filter(b => b.st && b.F).map(b => recG(b)) : [];
    for (const r of V.concat(G)) for (const p of r.fac) p.extra = ((S.win.get(r.id) || {})[p.k] || 0) + (p.extra || 0);
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
            if (r.b && !r.v) {
              const d = gebDoor(r.b);
              for (const p of r.fac) [p.du, p.dw] = d && d.k === p.k ? [d.u, d.w] : [-1, 0];
              continue;
            }
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
      } else if (ort === 'zonen') {
        // the ETHOS cells built now (round where one is): before as gebaeude.js draws them, after with the skins and stable windows
        const vor = !!o.vorher,
          R = [];
        for (const z of ZONE.cells.values())
          for (const b of z.bs) {
            const r = recG(b, vor);
            r.ort = 'zonen';
            for (const p of r.fac) p.extra = vor ? 0 : (p.extra || 0) + ((S.win.get(r.id) || {})[p.k] || 0);
            R.push(r);
          }
        const idx = FAUDIT.index(R.concat(townRecs())),
          byId = new Map(R.map(r => [r.id, r]));
        out = FAUDIT.audit(R, { idx, ort });
        // built in all round (no wall with room for a door, as gebSkins looks for one): reached through the buildings beside it
        for (const q of out) {
          const r = q.art === 'tuer' && q.text === 'kein Eingang' && byId.get(q.id);
          if (
            r &&
            !FAUDIT.hofTuer(
              r,
              r.fac.map(p => Object.assign({}, p, { blind: p.blind && FAUDIT.cover(r, p, idx).covered > p.L * 0.5 })),
              (x, y) => !idx.at(x, y)
            )
          )
            q.rest = 'ringsum eingebaut – Zugang durch die Gebäude daneben';
        }
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
    // an ETHOS building of the square or of a cell built now (gebaeude/gebaeude.js): the door its building() gives it, else the skin's
    let g = GEB.ready && GEB.bld.find(q => q.id === id);
    if (!g)
      for (const z of ZONE.cells.values()) {
        g = z.bs.find(q => q.id === id);
        if (g) break;
      }
    const fx = g && S.geb.get(id),
      d = g && (gebDoor(g) || (fx && fx.door));
    if (d) {
      const f = g.F[d.k],
        L = Math.hypot(f[2] - f[0], f[3] - f[1]),
        dx = (f[2] - f[0]) / L,
        dy = (f[3] - f[1]) / L;
      return { x: f[0] + dx * d.u, y: f[1] + dy * d.u, hd: az(dy, -dx) };
    }
    return null;
  }
  // ---- a layer of facade quads in the attribute layout of world/village.js (as welt/schleusingen.js and gebaeude/gebaeude.js write them) ----
  function wallLayer() {
    const A = { position: [], normal: [], aW: [], aV: [], aG: [], aD: [], aC: [], aTan: [] },
      I = [];
    return {
      empty: () => !I.length,
      // the run [a, c] of facade piece p (a → b, outward to the right) from just under the foot z0 up to its top line, 4 cm in front
      run(p, a, c, z0, at, topOf) {
        const n = A.position.length / 3,
          nx = p.dy,
          ny = -p.dx,
          off = 0.04;
        for (const [u, up] of [
          [a, false],
          [a, true],
          [c, false],
          [c, true],
        ]) {
          const top = topOf(p, u),
            v = up ? top : -0.3,
            x = p.ax + p.dx * u + nx * off,
            y = p.ay + p.dy * u + ny * off;
          A.position.push(x, z0 + v, -y);
          A.normal.push(nx, 0, -ny);
          A.aW.push(u, v, top, at.w);
          A.aV.push(u - a, at.LF, at.eave, at.st);
          A.aG.push(at.t0, at.tA, at.uA, at.t1);
          A.aD.push(at.du, at.dw, at.sp, at.fl);
          A.aC.push(at.col[0], at.col[1], at.col[2], at.pk);
          A.aTan.push(p.dx, 0, -p.dy);
        }
        I.push(n, n + 2, n + 3, n, n + 3, n + 1);
      },
      geo() {
        const g = new THREE.BufferGeometry();
        for (const [k, a] of Object.entries(A))
          g.setAttribute(
            k,
            new THREE.Float32BufferAttribute(a, k === 'position' || k === 'normal' || k === 'aTan' ? 3 : 4)
          );
        g.setIndex(I);
        g.computeBoundingSphere();
        return g;
      },
    };
  }
  // ---- door steps: the ground one walks on in front of the doors (KERN.ground, before the terrain), per place ----
  const STEPS = new Map(),
    SG = 4;
  function stepsAdd(name, list) {
    const grid = new Map();
    for (const it of list) {
      const D = it.boxes.length ? it.boxes[it.boxes.length - 1].d : 0,
        xs = [
          it.x - it.tx * it.hw,
          it.x + it.tx * it.hw,
          it.x - it.tx * it.hw + it.nx * D,
          it.x + it.tx * it.hw + it.nx * D,
        ],
        ys = [
          it.y - it.ty * it.hw,
          it.y + it.ty * it.hw,
          it.y - it.ty * it.hw + it.ny * D,
          it.y + it.ty * it.hw + it.ny * D,
        ];
      for (let i = Math.floor(Math.min(...xs) / SG); i <= Math.floor(Math.max(...xs) / SG); i++)
        for (let j = Math.floor(Math.min(...ys) / SG); j <= Math.floor(Math.max(...ys) / SG); j++) {
          const k = i * 100003 + j;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(it);
        }
    }
    if (list.length) STEPS.set(name, { list, grid });
    else STEPS.delete(name);
  }
  function stepAt(x, y) {
    let best;
    const k = Math.floor(x / SG) * 100003 + Math.floor(y / SG);
    for (const set of STEPS.values()) {
      const a = set.grid.get(k);
      if (a)
        for (const it of a) {
          const dx = x - it.x,
            dy = y - it.y,
            o = dx * it.nx + dy * it.ny;
          if (o < 0 || Math.abs(dx * it.tx + dy * it.ty) > it.hw) continue;
          for (const b of it.boxes)
            if (o <= b.d) {
              if (best === undefined || b.top > best) best = b.top;
              break;
            }
        }
    }
    return best;
  }
  KERN.provide('ground', (x, y) => (STEPS.size ? stepAt(x, y) : undefined), 11);
  S.stepsAdd = stepsAdd;
  S.stepAt = stepAt;
  S.steps = () => [...STEPS].map(([k, v]) => [k, v.list.length]);
  // the steps of one door into a kit (stone blocks from below the ground up to each step) and as an item for stepAt
  const STEPC = linC([0.6, 0.58, 0.55]);
  function doorSteps(K, x, y, tx, ty, nx, ny, w, zDoor, zG) {
    const boxes = FAUDIT.stufen(zDoor, zG);
    if (!boxes.length) return null;
    const hw = w / 2 + 0.2,
      rot = Math.atan2(ty, tx);
    for (const b of boxes)
      K.box(x + nx * (b.d / 2), y + ny * (b.d / 2), zG - 0.2, hw * 2, b.d, b.top - zG + 0.2, rot, STEPC);
    return { x, y, tx, ty, nx, ny, hw, boxes };
  }
  S.doorSteps = doorSteps;
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
  // the ETHOS halls (gebaeude/gebaeude.js) likewise – their walls stand at the building's foot z0
  function gebHalls(R, idx) {
    for (const r of R) {
      if (r.v || r.kind !== 'halle' || !KW || !r.b || r.area < 150) continue;
      const Lmax = Math.max(...r.fac.map(p => p.L)),
        per = {};
      for (const p of r.fac) {
        // a party wall in the data too: the windows only where no neighbour stands (stallRow skips the covered spans)
        if (p.L < Math.max(8, Lmax * 0.5) || FAUDIT.windows(p).length) continue;
        const n = stallRow(p, p, () => r.b.z0, r.b.e, FAUDIT.cover(r, p, idx).spans, r.id);
        if (n) per[p.k] = n;
      }
      if (Object.keys(per).length) {
        S.win.set(r.id, per);
        S.n.hallen++;
      }
    }
  }
  // the ETHOS buildings (gebaeude/gebaeude.js, not changed here): where one has no door, or a party wall that stands free over 3 m
  // and more (it draws a party wall blank all along), a thin skin 4 cm in front of the wall in the facade layout of the village –
  // the facade shader paints the door or the windows on it in the building's own style (the village's wall material: no new program)
  function gebSkins(R, idx, free, OV) {
    for (const r of R) {
      if (r.v || !r.b || !r.b.st) continue;
      const b = r.b,
        o = b.st,
        fx = { win: {}, door: null };
      const at0 = (p, L) => ({
        u0: 0,
        w: 4 * b.id + (o.typ || 0),
        LF: L,
        eave: b.e,
        st: o.style === 5 || o.style === 6 ? 0 : o.style,
        du: -1,
        dw: 0,
        sp: o.sp || 3,
        fl: (o.shutters ? 2 : 0) + (o.orn ? 4 : 0) + (o.raised ? 8 : 0),
        col: o.col,
        pk: (o.timber || 0) + 4 * (o.frame || 0) + 16 * (o.door || 0) + 128 * (o.shut || 0) + 512 * (o.slate || 0),
      });
      // the top line of a facade at u (gable apex or straight)
      const topOf = (p, u) =>
        p.gable
          ? u < p.uA
            ? p.t0 + ((p.tA - p.t0) * u) / Math.max(p.uA, 0.01)
            : p.tA + ((p.t1 - p.tA) * (u - p.uA)) / Math.max(p.L - p.uA, 0.01)
          : p.t0 + ((p.t1 - p.t0) * u) / Math.max(p.L, 0.01);
      if (r.kind === 'haus')
        for (const p of r.fac) {
          if (!p.blind || p.L < 3) continue;
          const runs = FAUDIT.openRuns(p.L, FAUDIT.cover(r, p, idx).spans).filter(([a, c]) => c - a >= 3);
          for (const [a, c] of runs) {
            const apex = p.gable && p.uA > a + 0.3 && p.uA < c - 0.3,
              at = Object.assign(at0(p, c - a), {
                t0: topOf(p, a),
                t1: topOf(p, c),
                tA: apex ? p.tA : (topOf(p, a) + topOf(p, c)) / 2,
                uA: apex ? p.uA - a : (c - a) / 2,
              });
            at.fl += apex ? 1 : 0;
            OV.run(p, a, c, b.z0, at, topOf);
            const n = FAUDIT.windows(
              Object.assign({}, p, {
                LF: c - a,
                L: c - a,
                t0: at.t0,
                t1: at.t1,
                tA: at.tA,
                uA: at.uA,
                gable: apex,
                du: -1,
                dw: 0,
                extra: 0,
              })
            ).length;
            fx.win[p.k] = (fx.win[p.k] || 0) + n;
            S.n.fenster += n;
          }
        }
      if (r.area >= 6 && r.kind !== 'turm' && !r.fac.some(p => p.dw > 0)) {
        // the walls as they stand: a party wall in the data with no neighbour along most of it can take the door
        const D = FAUDIT.hofTuer(
          r,
          r.fac.map(p => Object.assign({}, p, { blind: p.blind && FAUDIT.cover(r, p, idx).covered > p.L * 0.5 })),
          free
        );
        if (D) {
          const p = r.fac.find(q => q.k === D.k),
            a = Math.max(0, D.u - D.w / 2 - 0.4),
            c = Math.min(p.L, D.u + D.w / 2 + 0.4),
            th = Math.min(r.kind === 'haus' ? 2.9 : 3.6, b.e - 0.1),
            at = Object.assign(at0(p, 0.5), { t0: th, t1: th, tA: th, uA: 0.25, du: D.u - a, dw: D.w });
          OV.run(p, a, c, b.z0, at, () => th);
          fx.door = { k: D.k, u: D.u, w: D.w };
          S.n.tuer++;
        }
      }
      if (fx.door || Object.keys(fx.win).length) S.geb.set(b.id, fx);
    }
  }
  // the steps in front of the house doors of records R into kit K → the items for stepAt
  function houseSteps(R, KS) {
    const items = [],
      HOUSE = st => st < 6.5 || st === 12 || st > 12.5;
    for (const r of R) {
      const p = r.fac.find(q => q.dw > 0 && q.du >= 0 && q.dw < 1.6);
      if (!p || !HOUSE(p.st)) continue;
      let foot = r.b ? r.b.z0 : null;
      if (r.v) {
        const q = r.v.fac[p.k];
        let uu = 0;
        foot = r.v.foot;
        for (const qq of q.qs) {
          if (p.du >= uu && p.du <= uu + qq.len) foot = qq.foot;
          uu += qq.len;
        }
      }
      if (foot === null) continue;
      const x = p.ax + p.dx * p.du,
        y = p.ay + p.dy * p.du,
        zG = KERN.ground(x + p.nx * 1.2, y + p.ny * 1.2),
        it =
          Number.isFinite(zG) && doorSteps(KS, x, y, p.dx, p.dy, p.nx, p.ny, p.dw, foot + (p.raised ? 0.6 : 0.35), zG);
      if (it) items.push(it);
    }
    return items;
  }
  function fixRatscher() {
    // the looks of the square's ETHOS buildings first (their records and skins follow them)
    const nLook =
      GEB.ready && RATSCHER.bld[0]
        ? gebLooks(
            GEB.bld.filter(b => b.st && b.F),
            GEB.meshes.filter(m => m.material === RATSCHER.bld[0].material)
          )
        : 0;
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
    S.n = { tuer: 0, tuerVerlegt: 0, hallen: 0, fenster: 0, ansicht: nLook };
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
    gebHalls(R, idx);
    const OV = wallLayer();
    gebSkins(R, idx, free, OV);
    if (!OV.empty() && RATSCHER.bld[0]) add(new THREE.Mesh(OV.geo(), RATSCHER.bld[0].material), 'haut');
    // steps in front of the house doors (the door stands on the plinth: 35 cm, 60 cm in a raised ground floor) – in the kit of the
    // stable windows' frames (the same material: no draw call more)
    const KS = KW || (VPROPS.kit ? VPROPS.kit() : null);
    if (KS) {
      const items = houseSteps(R, KS);
      stepsAdd('ratscher', items);
      S.n.stufen = items.length;
      const paint = VPROPS.mat && VPROPS.mat.paint;
      if (KS !== KW && paint && !KS.empty()) add(new THREE.Mesh(KS.geo(), paint), 'stufen');
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
  // ---- the looks of ETHOS buildings (S.ansicht) onto b.st (the skins painted after follow it) and onto their walls as gebaeude.js drew
  // them in the meshes walls: colour, material, shutters, frames, door type – where a wall has the building's own colour and style (a base
  // on a slope keeps its own, a party wall of a half-timbered house stays plastered); the bays and the door's place stay. → how many ----
  function gebLooks(bs, walls) {
    const by = new Map();
    for (const b of bs) {
      const L = b.st && S.ansichtOf(b);
      if (!L) continue;
      const o0 = b.st,
        o = S.ansichtStil(o0, L);
      b.st = o;
      by.set(4 * b.id + (o0.typ || 0), { o0, o });
    }
    if (!by.size) return 0;
    const near = (a, i, c) => Math.abs(a[i] - c[0]) + Math.abs(a[i + 1] - c[1]) + Math.abs(a[i + 2] - c[2]) < 2e-3;
    for (const m of walls) {
      const g = m.geometry,
        W = g.attributes.aW,
        V = g.attributes.aV,
        D = g.attributes.aD,
        C = g.attributes.aC;
      if (!W || !V || !D || !C) continue;
      let hit = false;
      for (let v = 0; v < W.count; v++) {
        const q = by.get(Math.round(W.array[v * 4 + 3]));
        if (!q || !q.o0.col || !near(C.array, v * 4, q.o0.col)) continue;
        const { o0, o } = q,
          fw = o.style === 5 || o.style === 6;
        hit = true;
        if (V.array[v * 4 + 3] === o0.style) V.array[v * 4 + 3] = fw && V.array[v * 4 + 1] <= 0.51 ? 0 : o.style;
        C.array[v * 4] = o.col[0];
        C.array[v * 4 + 1] = o.col[1];
        C.array[v * 4 + 2] = o.col[2];
        C.array[v * 4 + 3] =
          (o.timber || 0) + 4 * (o.frame || 0) + 16 * (o.door || 0) + 128 * (o.shut || 0) + 512 * (o.slate || 0);
        D.array[v * 4 + 3] = (Math.round(D.array[v * 4 + 3]) & ~2) | (o.shutters ? 2 : 0);
      }
      if (hit) V.needsUpdate = C.needsUpdate = D.needsUpdate = true;
    }
    return by.size;
  }
  // ---- the ETHOS cells beyond Ratscher's square and round Schleusingen's old town (gebaeude/gebaeude.js GEB.Z, built and dropped as one
  // walks): the same fixes per cell once it stands – the skins merged into the cell's wall mesh (no draw call more), the stable windows
  // of its halls (the glass dark: no light at night) and the door steps in one mesh for all cells (the props' paint) ----
  const ZONE = { done: new WeakSet(), cells: new Map(), mesh: null, acc: 0, dirty: false, err: '', ms: 0 };
  // geometry g2 appended to mesh m's (the same attributes, both indexed); false where the layouts differ (then nothing changes)
  function mergeInto(m, g2) {
    const g1 = m.geometry,
      keys = Object.keys(g1.attributes);
    if (
      !g1.index ||
      !g2.index ||
      (g1.groups && g1.groups.length) ||
      keys.length !== Object.keys(g2.attributes).length ||
      keys.some(k => !g2.attributes[k] || g2.attributes[k].itemSize !== g1.attributes[k].itemSize)
    )
      return false;
    const n1 = g1.attributes.position.count,
      n2 = g2.attributes.position.count,
      g = new THREE.BufferGeometry();
    for (const k of keys) {
      const sz = g1.attributes[k].itemSize,
        arr = new Float32Array((n1 + n2) * sz);
      arr.set(g1.attributes[k].array.subarray(0, n1 * sz));
      arr.set(g2.attributes[k].array.subarray(0, n2 * sz), n1 * sz);
      g.setAttribute(k, new THREE.BufferAttribute(arr, sz));
    }
    const I1 = g1.index.array,
      I2 = g2.index.array,
      I = n1 + n2 > 65535 ? new Uint32Array(I1.length + I2.length) : new Uint16Array(I1.length + I2.length);
    I.set(I1);
    for (let i = 0; i < I2.length; i++) I[I1.length + i] = I2[i] + n1;
    g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingSphere();
    m.geometry = g;
    g1.dispose();
    g2.dispose();
    return true;
  }
  // the records of Schleusingen's houses as neighbours of the cells round the old town (once per build of the town)
  let TR = null,
    TRof = null;
  const townRecs = () => {
    if (SCHL.state !== 'ready') return [];
    if (TRof !== SCHL.bld) {
      TRof = SCHL.bld;
      TR = recsSchl(false);
    }
    return TR;
  };
  function fixZone(c, wm) {
    // while the old town is being built its houses are not there yet to stand beside the cell's buildings: later
    if (SCHL.state === 'loading' || SCHL.state === 'data') return false;
    const t0 = performance.now(),
      walls = c.meshes.filter(m => m.material === wm);
    for (const m of walls) ZONE.done.add(m);
    // a cell built again (its ground changed): its buildings start from scratch
    for (const b of c.data.b) {
      S.geb.delete(b.id);
      S.win.delete(b.id);
    }
    const bs = c.data.b.filter(b => b.st && b.F && b.id !== undefined),
      looks = gebLooks(bs, walls),
      R = bs.map(b => recG(b)),
      near = [];
    for (const [k, z] of ZONE.cells)
      if (k !== c.key && Math.abs(z.ij[0] - c.ij[0]) <= 1 && Math.abs(z.ij[1] - c.ij[1]) <= 1) near.push(...z.recs);
    const idx = FAUDIT.index(R.concat(near, townRecs())),
      free = (x, y) => !idx.at(x, y),
      K = VPROPS.kit(),
      OV = wallLayer(),
      n0 = Object.assign({}, S.n),
      keep = [KW, KG];
    let items = [];
    KW = KG = K;
    try {
      gebHalls(R, idx);
      gebSkins(R, idx, free, OV);
      items = houseSteps(R, K);
    } finally {
      [KW, KG] = keep;
    }
    // the counts of the cells apart from the square's
    const n = { stufen: items.length };
    for (const k of ['tuer', 'fenster', 'hallen']) {
      n[k] = (S.n[k] || 0) - (n0[k] || 0);
      S.n[k] = n0[k] || 0;
    }
    const merged = OV.empty() || (walls.length > 0 && mergeInto(walls[0], OV.geo()));
    ZONE.cells.set(c.key, {
      ij: c.ij,
      bs,
      recs: R,
      wall: walls[0] || null,
      geo: K.empty() ? null : K.geo(),
      items,
      n: Object.assign(n, { ansicht: looks }),
      merged,
      ms: Math.round(performance.now() - t0),
    });
    ZONE.dirty = true;
    return true;
  }
  // the stable windows and steps of all fixed cells in one mesh, the steps' ground
  function zoneMesh() {
    ZONE.dirty = false;
    const Z = [...ZONE.cells.values()],
      parts = Z.map(z => z.geo).filter(Boolean);
    stepsAdd('zonen', [].concat(...Z.map(z => z.items)));
    const paint = VPROPS.mat && VPROPS.mat.paint;
    if (!paint) return;
    if (!parts.length) {
      if (ZONE.mesh) ZONE.mesh.visible = false;
      return;
    }
    const n = parts.reduce((s, q) => s + q.attributes.position.count, 0),
      size = {},
      g = new THREE.BufferGeometry();
    for (const q of parts) for (const k in q.attributes) size[k] = q.attributes[k].itemSize;
    for (const k in size) {
      const arr = new Float32Array(n * size[k]);
      let o = 0;
      for (const q of parts) {
        if (q.attributes[k]) arr.set(q.attributes[k].array, o);
        o += q.attributes.position.count * size[k];
      }
      g.setAttribute(k, new THREE.BufferAttribute(arr, size[k]));
    }
    g.computeBoundingSphere();
    if (!ZONE.mesh) {
      // not in S.meshes (the square's), hidden with the village in the map view
      const m = new THREE.Mesh(g, paint);
      m.name = 'fassade zonen';
      m.userData.noMerge = true;
      m.castShadow = m.receiveShadow = false;
      scene.add(m);
      if (RATSCHER.bld) RATSCHER.bld.push(m);
      ZONE.mesh = m;
    } else {
      ZONE.mesh.geometry.dispose();
      ZONE.mesh.geometry = g;
    }
    ZONE.mesh.visible = !RATSCHER.map;
    markDirty(true);
  }
  function zoneTick(dt) {
    ZONE.acc += dt || 0;
    if (ZONE.acc < 0.5 || S.state !== 'ready' || !GEB.Z || !RATSCHER.bld[0]) return;
    ZONE.acc = 0;
    try {
      const wm = RATSCHER.bld[0].material;
      // dropped or built again: the cell's part goes
      for (const [k, z] of ZONE.cells) {
        const c = GEB.Z.cells.get(k);
        if (c && z.wall && c.meshes.includes(z.wall)) continue;
        for (const b of z.bs) {
          S.geb.delete(b.id);
          S.win.delete(b.id);
        }
        ZONE.cells.delete(k);
        ZONE.dirty = true;
      }
      // one newly built cell at a time
      for (const c of GEB.Z.cells.values()) {
        if (c.state !== 'built' || !c.data || !c.meshes.length) continue;
        const w = c.meshes.find(m => m.material === wm);
        if (!w || ZONE.done.has(w)) continue;
        const t0 = performance.now();
        if (fixZone(c, wm)) ZONE.ms = Math.max(ZONE.ms, Math.round(performance.now() - t0));
        break;
      }
      if (ZONE.dirty) zoneMesh();
    } catch (e) {
      if (!ZONE.err) console.warn('fassade zonen', e);
      ZONE.err = String(e);
    }
  }
  S.zonen = () => {
    const n = {
      zellen: ZONE.cells.size,
      gebaeude: 0,
      tuer: 0,
      fenster: 0,
      hallen: 0,
      stufen: 0,
      ansicht: 0,
      ungemischt: 0,
    };
    for (const z of ZONE.cells.values()) {
      n.gebaeude += z.bs.length;
      for (const k of ['tuer', 'fenster', 'hallen', 'stufen', 'ansicht']) n[k] += z.n[k] || 0;
      if (!z.merged) n.ungemischt++;
    }
    return Object.assign(n, { ms: ZONE.ms, err: ZONE.err, mesh: !!ZONE.mesh });
  };
  // the zone building with the most new windows on one wall, and where to stand to see it: { id, k, n, L, x, y, yaw } or null (tests)
  S.zonenBild = () => {
    let best = null;
    for (const z of ZONE.cells.values())
      for (const b of z.bs) {
        const fx = S.geb.get(b.id);
        if (fx) for (const k in fx.win) if (!best || fx.win[k] > best.n) best = { b, k: +k, n: fx.win[k] };
      }
    if (!best) return null;
    const f = best.b.F[best.k],
      L = Math.hypot(f[2] - f[0], f[3] - f[1]),
      nx = (f[3] - f[1]) / L,
      ny = -(f[2] - f[0]) / L,
      d = Math.min(18, 6 + L * 0.6),
      x = (f[0] + f[2]) / 2 + nx * d,
      y = (f[1] + f[3]) / 2 + ny * d;
    return { id: best.b.id, k: best.k, n: best.n, L, x, y, yaw: (Math.atan2(-nx, -ny) * 180) / Math.PI };
  };
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
      let seen = 0;
      const off = KERN.tick(() => {
        if (!VILLAGE.ready) return;
        // the ETHOS buildings come over some frames after the village; if they never come (no data on this host), go on without them
        if (!seen) seen = performance.now();
        if (GEB.on && !GEB.ready && performance.now() - seen < 30000) return;
        // and the looks given from outside (a small file, there long before; at most 10 s)
        if (!LOOK.done && performance.now() - seen < 10000) return;
        off();
        try {
          fixRatscher();
          S.state = 'ready';
          KERN.tick(tick, 'fassade');
          if (GEB.on) KERN.tick(zoneTick, 'fassade-zonen');
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
