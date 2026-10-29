// ===================== V16d wood, part 2: the band sawmill north of the workshop (HOLZSAW) – a log into boards =====================
// The tractor's fork lays a log lengthwise on the bunks (world/holz.js asks dropOn). Then, as on a small band sawmill (push feed, blade
// 32 × 1.07 mm, kerf ≈ 2 mm): clamp the log, plan the cut (board thickness: 24/30 mm boards, 40/52 mm planks; a drawing of the end),
// first the top slab (Schwarte) for a flat face, then board after board from the top down – the saw unit steps down by thickness + kerf,
// the head runs along the log – down to 3 cm above the bunks; the bottom piece is the lower slab. Through and through (Scharfschnitt):
// the boards keep their wany edges (Baumkante) and lie in the order they came off the log (Blockware, one block per log) beside the mill.
// Slabs are firewood. Each board knows its log, thickness, widths at both ends, whether the pith runs through it (Herzbrett), and its
// green moisture from where it lay in the log (spruce sapwood 130–150 %, heartwood ~50 %; larch heartwood ~55 %, narrow sapwood ~120 %).
// Hearing protection and glasses. Boards are drawn merged per pile: three draw calls (sawn faces, wany edges, end grain).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LATE } from '../core/late.js';
import { scene, V } from '../core/head.js';
import { ANISO, markDirty } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { BUILD, COL, DOORS } from '../core/geo.js';
import { SAW_PH, WORKS } from '../garden/workshop.js';
import { mulberry } from '../garden/grass.js';
import { PLAY, SFX } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { FOREST } from '../world/forest.js';
import { CLOCK } from '../time/clock.js';
import { GEAR } from './gear.js';
import { WUI } from './werkui.js';
import { FELL } from '../world/fell.js';
import { HOLZ } from './holz.js';
import { KERN } from '../core/kern.js';
export const HOLZSAW = (() => {
  const KERF = 0.002,
    BUNK = 0.5,
    MINCUT = BUNK + 0.03,
    SLAB = 0.035;
  const S = {
    log: null,
    clamp: false,
    plan: null,
    cut: 0,
    boards: [],
    piles: [],
    fire: 0,
    n: 0,
    decoGone: false,
    busy: false,
  };
  const de = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');
  const think = (t, ms) => PLAY.think(t, ms);
  const SAWm = () => window.WORKS && WORKS.machines.find(m => m.key === 'saw');
  const SAWs = () => {
    const m = SAWm();
    return m && m.state;
  };
  // the sawmill's own frame: the workshop as built (it may have been moved in the top view: BUILD.werkstatt)
  const G = new THREE.Group();
  {
    const Bw = window.BUILD && BUILD.werkstatt;
    if (Bw) {
      Bw.root.add(G);
      G.position.copy(V(-Bw.pivot[0], -Bw.pivot[1], 0));
    } else scene.add(G);
  }
  const WT = (x, y) => (window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]);
  const toLoc = p => {
    G.updateWorldMatrix(true, false);
    const v = V(p[0], p[1], p[2]);
    G.worldToLocal(v);
    return [v.x, -v.z, v.y];
  };
  const toW = p => {
    G.updateWorldMatrix(true, false);
    const v = V(p[0], p[1], p[2]);
    G.localToWorld(v);
    return [v.x, -v.z, v.y];
  };
  // ---------------- materials: sawn faces (long grain, drawn), wany edges (bark), end grain (from world/fell.js) ----------------
  const MATS = {};
  function faceTex(sp) {
    const N = 512,
      cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = N;
    const g = cv.getContext('2d');
    const P = {
      spruce: { e: '#ead9b4', l: 'rgba(170,128,76,', k: '#7a5532' },
      larch: { e: '#e2b98a', l: 'rgba(150,80,40,', k: '#6a3a1e' },
      pine: { e: '#e9cfa0', l: 'rgba(165,105,58,', k: '#70421f' },
    }[sp] || { e: '#e6d2ac', l: 'rgba(160,115,70,', k: '#704a2a' };
    g.fillStyle = P.e;
    g.fillRect(0, 0, 256, N);
    const rnd = mulberry(sp.length * 977 + 3);
    // flat-sawn: growth rings cut at a slant show as long flames (cathedral grain) and straight lines at the edges
    for (let k = 0; k < 26; k++) {
      const x0 = rnd() * 256,
        w = 6 + rnd() * 30,
        a = 0.18 + rnd() * 0.25;
      g.strokeStyle = P.l + a + ')';
      g.lineWidth = 1 + rnd() * 2.2;
      g.beginPath();
      for (let y = 0; y <= N; y += 8) {
        const x = x0 + Math.sin((y / N) * Math.PI * (1 + rnd() * 0.05)) * w * (0.6 + 0.4 * Math.sin(y / 61));
        y ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(110,80,50,${rnd() * 0.06})`;
      g.fillRect(rnd() * 256, rnd() * N, 1, 4 + rnd() * 30);
    }
    for (let y = 0; y < N; y += 5 + rnd() * 4) {
      g.fillStyle = 'rgba(255,255,255,0.045)';
      g.fillRect(0, y, 256, 1.5);
    } // the band saw's fine marks across
    for (let k = 0; k < 3; k++) {
      const x = 20 + rnd() * 216,
        y = rnd() * N,
        r = 4 + rnd() * 7;
      const gr = g.createRadialGradient(x, y, 1, x, y, r);
      gr.addColorStop(0, P.k);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, r, r * 1.5, 0, 0, 7);
      g.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    return t;
  }
  function mats(sp) {
    if (MATS[sp]) return MATS[sp];
    const B = window.FOREST && FOREST.barkMap ? FOREST.barkMap(sp) : null,
      EG = window.FELL && FELL.endGrain ? FELL.endGrain(sp) : null;
    return (MATS[sp] = {
      face: new THREE.MeshStandardMaterial({ map: faceTex(sp), roughness: 0.86, envMapIntensity: 0.5 }),
      bark: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: B && B.map,
        normalMap: B && B.nrm,
        roughness: 1,
        envMapIntensity: 0.4,
      }),
      end:
        EG && EG.isMaterial
          ? EG
          : new THREE.MeshStandardMaterial({ map: EG && EG.map, color: 0xd9bf94, roughness: 0.85 }),
    });
  }
  // ---------------- a board (or slab) as three geometries: sawn faces, wany edges, ends ----------------
  // b: zb, zt (heights of its lower and upper face from the log axis), r0, r1 (log radius at the butt and the top), L; drawn along +y
  function boardGeos(b) {
    const NS = 4,
      F = { p: [], uv: [], i: [] },
      K = { p: [], uv: [], i: [] },
      E = { p: [], uv: [], i: [] };
    const sec = [];
    for (let k = 0; k <= NS; k++) {
      const t = k / NS,
        y = t * b.L,
        r = b.r0 + (b.r1 - b.r0) * t,
        x = z => Math.sqrt(Math.max(0, r * r - z * z));
      const zs = [b.zb, b.zb + (b.zt - b.zb) / 3, b.zb + ((b.zt - b.zb) * 2) / 3, b.zt].map(z => Math.min(z, r - 1e-4));
      sec.push({
        y,
        r,
        pts: [
          [-x(zs[0]), zs[0]],
          [x(zs[0]), zs[0]],
          [x(zs[1]), zs[1]],
          [x(zs[2]), zs[2]],
          [x(zs[3]), zs[3]],
          [-x(zs[3]), zs[3]],
          [-x(zs[2]), zs[2]],
          [-x(zs[1]), zs[1]],
        ],
      });
    }
    const quad = (T, a, bb, c, d, ua, ub, uc, ud) => {
      const o = T.p.length / 3;
      for (const q of [a, bb, c, d]) T.p.push(q[0], q[1], q[2]);
      T.uv.push(...ua, ...ub, ...uc, ...ud);
      T.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
    };
    const P3 = (s, j) => [s.pts[j][0], s.y, s.pts[j][1]]; // model frame: x across, y along, z up
    for (let k = 0; k < NS; k++) {
      const A = sec[k],
        Bs = sec[k + 1],
        va = A.y / 1.2,
        vb = Bs.y / 1.2;
      // bottom face (0→1), top face (4→5): sawn; edges 1→2→3→4 and 5→6→7→0: bark
      quad(
        F,
        P3(A, 1),
        P3(A, 0),
        P3(Bs, 0),
        P3(Bs, 1),
        [A.pts[1][0] / 0.3 + 0.5, va],
        [A.pts[0][0] / 0.3 + 0.5, va],
        [Bs.pts[0][0] / 0.3 + 0.5, vb],
        [Bs.pts[1][0] / 0.3 + 0.5, vb]
      );
      quad(
        F,
        P3(A, 5),
        P3(A, 4),
        P3(Bs, 4),
        P3(Bs, 5),
        [A.pts[5][0] / 0.3 + 0.5, va],
        [A.pts[4][0] / 0.3 + 0.5, va],
        [Bs.pts[4][0] / 0.3 + 0.5, vb],
        [Bs.pts[5][0] / 0.3 + 0.5, vb]
      );
      for (const [j, jn] of [
        [1, 2],
        [2, 3],
        [3, 4],
        [5, 6],
        [6, 7],
        [7, 0],
      ])
        quad(
          K,
          P3(A, j),
          P3(A, jn),
          P3(Bs, jn),
          P3(Bs, j),
          [j * 0.08, A.y / 0.6],
          [jn * 0.08, A.y / 0.6],
          [jn * 0.08, Bs.y / 0.6],
          [j * 0.08, Bs.y / 0.6]
        );
    }
    // the ends: the log's end grain at the board's place in it
    for (const [s, flip] of [
      [sec[0], true],
      [sec[NS], false],
    ]) {
      const o = E.p.length / 3;
      for (const [x, z] of s.pts) {
        E.p.push(x, s.y, z);
        E.uv.push(0.5 + x / (2 * s.r), 0.5 + z / (2 * s.r));
      }
      for (let j = 1; j < 7; j++) flip ? E.i.push(o, o + j + 1, o + j) : E.i.push(o, o + j, o + j + 1);
    }
    const mk = T => {
      const g = new THREE.BufferGeometry();
      const p = [];
      for (let i = 0; i < T.p.length; i += 3) {
        const v = V(T.p[i], T.p[i + 1], T.p[i + 2]);
        p.push(v.x, v.y, v.z);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(T.uv, 2));
      g.setIndex(T.i);
      g.computeVertexNormals();
      return g;
    };
    return { face: mk(F), bark: mk(K), end: mk(E) };
  }
  S.boardGeos = boardGeos;
  S.mats = mats;
  // merged meshes of a set of pieces, each with its own matrix (three.js frame); returns a group with up to 3 meshes per species
  S.mergeSet = (list, parent, old) => {
    if (old) {
      parent.remove(old);
      old.traverse(o => {
        if (o.isMesh) o.geometry.dispose();
      });
    }
    const g = new THREE.Group(),
      by = {};
    for (const it of list) {
      const geos = boardGeos(it.b);
      for (const k of ['face', 'bark', 'end']) {
        geos[k].applyMatrix4(it.m);
        (by[it.b.sp] ||= { face: [], bark: [], end: [] })[k].push(geos[k]);
      }
    }
    for (const [sp, set] of Object.entries(by)) {
      const M = mats(sp);
      for (const k of ['face', 'bark', 'end']) {
        if (!set[k].length) continue;
        const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(set[k]), M[k]);
        me.castShadow = me.receiveShadow = true;
        me.userData.noMerge = true;
        g.add(me);
        set[k].forEach(x => x.dispose());
      }
    }
    parent.add(g);
    markDirty(true);
    return g;
  };
  // ---------------- the sawmill ----------------
  const BUNKS = [-33.35, -32.0, -30.65, -29.9],
    LY0 = -33.75,
    LY1 = -29.55;
  const MX = () => (SAWs() ? SAWs().xc : -1.5);
  // the log axis on the bunks, leveled (a real mill shims the top end): butt to the south
  function seat(l) {
    const r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      rm = Math.max(r0, r1),
      yc = (LY0 + LY1) / 2,
      z = BUNK + rm;
    const a = toW([MX(), yc - l.L / 2, z]),
      b = toW([MX(), yc + l.L / 2, z]);
    l.p0 = a;
    l.p1 = b;
    l.st = 'saw';
    S.log = l.id;
  }
  // asked by world/holz.js while a log is lowered: 'done' (it lies on the bunks now), 'wait' (still above them) or null (not here)
  S.dropOn = (l, a, b, m, r) => {
    const s = SAWs();
    if (!s) return null;
    const la = toLoc(a),
      lb = toLoc(b),
      lm = toLoc(m);
    if (Math.abs(lm[0] - MX()) > 0.75 || lm[1] < LY0 - 0.8 || lm[1] > LY1 + 0.8) return null;
    if ((window.PHASE | 0) < SAW_PH) return null; // the mill comes with phase 1: the log stays on the ground
    const ax = [lb[0] - la[0], lb[1] - la[1]],
      cosA = Math.abs(ax[1]) / (Math.hypot(ax[0], ax[1]) || 1);
    if (cosA < 0.9) {
      warn('Längs auf die Bänke legen – den Traktor quer zur Säge stellen.');
      return 'wait';
    }
    if (S.log && S.log !== l.id) {
      warn('Auf der Säge liegt schon ein Stamm.');
      return 'wait';
    }
    if (l.L > 4.6) {
      warn('Zu lang für die Säge (höchstens 4,6 m).');
      return 'wait';
    }
    if (lm[2] - r > BUNK + (HOLZ.SETTLE || 0.3)) return 'wait';
    seat(l);
    S.clamp = false;
    S.plan = null;
    S.cut = 0;
    hideDeco();
    HOLZ.redraw();
    save();
    think(`Stamm auf der Säge: ${HOLZ.SPN[l.sp] || ''} ${de(l.L, 2)} m, Ø ${l.dm} cm. Jetzt festklemmen.`, 3600);
    return 'done';
  };
  let warnT = 0;
  const warn = t => {
    if (performance.now() - warnT > 5000) {
      warnT = performance.now();
      think(t, 3000);
    }
  };
  // the old decorative log and its collider (garden/workshop.js; the collider is in the workshop's frame: matched by its tag and width)
  function hideDeco() {
    const s = SAWs();
    if (!s) return;
    if (s.logMesh && s.logMesh.visible) {
      s.logMesh.visible = false;
      S.decoGone = true;
      markDirty(true);
    }
    for (const c of COL)
      if (c && c[6] === 'log' && c[5] > -1 && Math.abs(c[1] - c[0] - 2 * (s.logR || 0.26)) < 0.05) {
        c[4] = -9;
        c[5] = -9;
      }
  }
  const curLog = () => S.log && HOLZ.logs.find(l => l.id === S.log && l.st === 'saw');
  // ---------------- the plan: heights of the cuts from the log axis ----------------
  // first cut: a slab off the top so the face is ~60 % of the small end wide; then boards of thickness t (+ kerf) down to 3 cm above the bunks
  function planCuts(l, t) {
    const r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      rS = Math.min(r0, r1),
      rL = Math.max(r0, r1),
      zc = BUNK + rL; // axis height above the bunks' ground
    const h1 = rS * 0.8;
    const cuts = [h1];
    let h = h1;
    while (true) {
      const n = h - KERF - t;
      if (zc + n < MINCUT + 0.002) break;
      cuts.push(n);
      h = n;
    }
    return { t, cuts, zc, bottom: MINCUT - zc };
  }
  function pieces(l, p) {
    const r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      out = [{ kind: 'slab', zb: p.cuts[0], zt: Math.max(r0, r1) }];
    for (let i = 1; i < p.cuts.length; i++) out.push({ kind: 'board', zb: p.cuts[i], zt: p.cuts[i - 1] - KERF });
    out.push({ kind: 'slab', zb: p.bottom, zt: p.cuts[p.cuts.length - 1] - KERF, bottom: true });
    return out;
  }
  function boardWidths(l, zb, zt) {
    const w = (r, z) => 2 * Math.sqrt(Math.max(0, r * r - z * z)),
      r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      zmax = zb < 0 && zt > 0 ? 0 : Math.abs(zb) < Math.abs(zt) ? zb : zt;
    return { small: Math.min(w(r1, zb), w(r1, zt)), wide: Math.max(w(r0, zmax), w(r1, zmax)) };
  }
  // the drawing: the small end with the cuts, the large end dashed
  function fig(l, p) {
    const r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      R = Math.max(r0, r1),
      k = 70 / R,
      cx = 110,
      cy = 90,
      y = z => cy - z * k;
    let s = `<svg viewBox="0 0 300 190" width="300" height="190" role="img" aria-label="Einschnitt"><circle cx="${cx}" cy="${cy}" r="${(R * k).toFixed(1)}" fill="none" stroke="#8a6a48" stroke-dasharray="4 3"/><circle cx="${cx}" cy="${cy}" r="${(Math.min(r0, r1) * k).toFixed(1)}" fill="#ecd9b0" stroke="#6b4a2a" stroke-width="2"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="2" fill="#6b4a2a"/>`;
    const pcs = pieces(l, p);
    pcs.forEach((pc, i) => {
      const yb = y(pc.zb),
        yt = y(Math.min(pc.zt, R));
      s += `<rect x="${cx - R * k - 6}" y="${yt.toFixed(1)}" width="${(2 * R * k + 12).toFixed(1)}" height="${Math.max(0.5, yb - yt).toFixed(1)}" fill="${pc.kind === 'slab' ? 'rgba(120,90,60,0.18)' : i % 2 ? 'rgba(230,200,150,0.35)' : 'rgba(210,175,120,0.35)'}" stroke="none"/>`;
    });
    for (const c of p.cuts)
      s += `<line x1="${cx - R * k - 8}" x2="${cx + R * k + 8}" y1="${y(c).toFixed(1)}" y2="${y(c).toFixed(1)}" stroke="#b03a2e" stroke-width="1.2"/>`;
    s += `<line x1="${cx - R * k - 10}" x2="${cx + R * k + 10}" y1="${y(p.bottom - 0.03).toFixed(1)}" y2="${y(p.bottom - 0.03).toFixed(1)}" stroke="#444" stroke-width="3"/>`;
    const nb = pcs.filter(x => x.kind === 'board').length;
    s += `<text x="205" y="40" font-size="12" fill="#333">${nb} × ${Math.round(p.t * 1000)} mm</text><text x="205" y="58" font-size="11" fill="#666">rot: Schnitte</text><text x="205" y="74" font-size="11" fill="#666">grau: Bank</text><text x="205" y="90" font-size="11" fill="#666">gestrichelt: dickes Ende</text></svg>`;
    return s;
  }
  function yieldOf(l, p) {
    let v = 0;
    for (const pc of pieces(l, p)) {
      if (pc.kind !== 'board') continue;
      const w = boardWidths(l, pc.zb, pc.zt);
      v += ((w.small + w.wide) / 2) * (pc.zt - pc.zb) * l.L;
    }
    return v;
  }
  function openPlan() {
    const l = curLog();
    if (!l) return;
    const opts = [
      [0.024, '24 mm Brett'],
      [0.03, '30 mm Brett'],
      [0.04, '40 mm Bohle'],
      [0.052, '52 mm Bohle'],
    ];
    const show = t => {
      const p = planCuts(l, t),
        y = yieldOf(l, p);
      return { p, y };
    };
    let cur = S.plan ? S.plan.t : 0.03;
    const build = () => {
      const { p, y } = show(cur);
      WUI.machine({
        title: 'Blockbandsäge · Einschnitt',
        sub: `${HOLZ.SPN[l.sp] || ''} ${de(l.L, 2)} m, Ø ${l.d1}–${l.d0} cm · ${de(l.vol, 2)} Fm`,
        fig: fig(l, p),
        choices: [{ k: 't', label: 'Stärke (sägefrisch, mit Übermaß für das Schwinden)', val: cur, opts }],
        info: `Scharfschnitt: oben eine Schwarte für die erste ebene Fläche, dann Brett für Brett nach unten bis 3 cm über die Bänke; Schnittfuge ${de(KERF * 1000, 0)} mm. Ausbeute an Brettern etwa ${Math.round((y / l.vol) * 100)} % (Rest Schwarten, Späne). Die Bretter behalten ihre Baumkante und bleiben als Block zusammen.`,
        gear: { req: ['ohr', 'brille|korb'] },
        go: 'So einschneiden',
        onGo: v => {
          if (+v.t !== cur) {
            cur = +v.t;
            build();
            return;
          }
          S.plan = planCuts(l, cur);
          S.cut = 0;
          save();
          think(`${S.plan.cuts.length} Schnitte geplant. Erst die Schwarte.`, 2600);
        },
      });
    };
    build();
  }
  // ---------------- cutting: the head runs along the log with the unit at the cut's height ----------------
  const anim = { on: false, t: 0, dur: 1, h: 0 };
  function unitTo(zAbs) {
    const s = SAWs();
    if (s && s.unit) {
      s.unit.position.y = zAbs - s.zBlade;
      markDirty();
    }
  }
  function cutOp() {
    const l = curLog(),
      p = S.plan;
    if (!l || !p) return null;
    const i = S.cut,
      zc = p.zc,
      h = p.cuts[i],
      name = i === 0 ? 'Schwarte abnehmen (erster Schnitt)' : `Schnitt ${i + 1}/${p.cuts.length}: Brett ${i}`;
    return {
      key: 'hs:cut' + i,
      label: name,
      ppe: ['ohr', 'brille|korb'],
      what: 'Blockbandsäge',
      hold: 2.4 + l.L * 0.75,
      holdLabel: 'Sägen …',
      anim3: 'push',
      rMove: 3,
      start: () => {
        if (window.DOORS && DOORS.saw) DOORS.saw.target = 1;
        WORKS.sawBoost = 1e-6;
        anim.on = true;
        anim.t = 0;
        anim.dur = 2.4 + l.L * 0.75;
        anim.h = zc + h;
        unitTo(zc + h);
      },
      work: k => {
        const s = SAWs();
        if (!s) return;
        s.dir = 1;
        s.s = s.s0 + (s.s1 - s.s0) * k;
        s.head.position.z = -(s.s - WORKS.py);
        markDirty();
      },
      cancel: () => {
        anim.on = false;
        const s = SAWs();
        if (s) {
          s.dir = -1;
        }
      },
      run: () => {
        anim.on = false;
        const s = SAWs();
        if (s) s.dir = -1;
        takeOff(l, p, i);
      },
    };
  }
  // the piece above the cut comes off: the slab is firewood, a board goes onto the log's block beside the mill
  function takeOff(l, p, i) {
    const pcs = pieces(l, p),
      pc = pcs[i],
      r0 = l.d0 / 200,
      r1 = l.d1 / 200;
    if (pc.kind === 'slab') S.fire += 1;
    else addBoard(l, pc, i);
    S.cut = i + 1;
    CLOCK.t += 2;
    remain();
    if (S.cut >= p.cuts.length) {
      // the last cut: the bottom piece (lower slab) lies on the bunks – the log is used up
      S.fire += 1;
      l.st = 'sawn';
      l.hide = false;
      S.log = null;
      S.clamp = false;
      S.plan = null;
      S.cut = 0;
      unitTo(SAWs().zBlade);
      remain();
      HOLZ.redraw();
      const nb = S.boards.filter(b => b.lid === l.id).length;
      SFX.chime && SFX.chime();
      think(
        `Fertig: ${nb} Bretter à ${Math.round(p.t * 1000)} mm, zwei Schwarten ins Brennholz. Die Bretter jetzt mit Leisten zum Trocknen stapeln.`,
        5200
      );
      if (window.QUESTS && QUESTS.banner)
        QUESTS.banner(
          'Stamm eingeschnitten',
          `${HOLZ.SPN[l.sp] || ''} ${de(l.L, 2)} m → ${nb} Bretter (${Math.round(p.t * 1000)} mm)`
        );
    } else if (i === 0) think('Schwarte ab – die erste Fläche ist eben. Jetzt Brett für Brett.', 2600);
    save();
    rebuildPiles();
  }
  // green moisture of a board from where it lay in the log: the outer part (sapwood) is far wetter in spruce; larch has narrow sapwood
  function greenMC(l, zb, zt) {
    const R = l.d0 / 200,
      sapW = { spruce: 0.42, larch: 0.16, pine: 0.35 }[l.sp] || 0.35,
      MC = { spruce: [50, 140], larch: [55, 120], pine: [45, 130] }[l.sp] || [50, 130];
    let sap = 0,
      all = 0;
    for (let k = 0; k < 24; k++) {
      const z = zb + ((zt - zb) * (k + 0.5)) / 24,
        half = Math.sqrt(Math.max(0, R * R - z * z));
      for (let j = 0; j < 12; j++) {
        const x = -half + (2 * half * (j + 0.5)) / 12,
          rr = Math.hypot(x, z) / R;
        all++;
        if (rr > 1 - sapW) sap++;
      }
    }
    const f = all ? sap / all : 0;
    return Math.round(MC[0] + (MC[1] - MC[0]) * f);
  }
  function addBoard(l, pc, i) {
    const w = boardWidths(l, pc.zb, pc.zt),
      t = pc.zt - pc.zb;
    const b = {
      id: 'B' + ++S.n,
      lid: l.id,
      sp: l.sp,
      n: i,
      t: +t.toFixed(4),
      L: l.L,
      zb: +pc.zb.toFixed(4),
      zt: +pc.zt.toFixed(4),
      r0: l.d0 / 200,
      r1: l.d1 / 200,
      wS: +w.small.toFixed(3),
      wW: +w.wide.toFixed(3),
      pith: pc.zb < 0 && pc.zt > 0,
      mc0: greenMC(l, pc.zb, pc.zt),
      st: 'pile',
      t0: CLOCK.t,
    };
    b.mc = b.mc0;
    S.boards.push(b);
  }
  // ---------------- the log on the mill while it is sawn: the part below the last cut (flat sawn top, bark sides, end grain) ----------------
  let RM = null;
  function remain() {
    const l = curLog(),
      p = S.plan;
    if (!l || !p || !S.cut) {
      if (RM) {
        G.remove(RM);
        RM.traverse(o => {
          if (o.isMesh) o.geometry.dispose();
        });
        RM = null;
      }
      if (l && l.hide) {
        l.hide = false;
        HOLZ.redraw();
      }
      markDirty(true);
      return;
    }
    const r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      yc = (LY0 + LY1) / 2,
      top = p.cuts[S.cut - 1] - KERF;
    const b = { sp: l.sp, L: l.L, r0, r1, zb: -Math.max(r0, r1) * 1.001, zt: top },
      m = new THREE.Matrix4().makeTranslation(...V(MX(), yc - l.L / 2, p.zc).toArray());
    RM = S.mergeSet([{ b, m }], G, RM);
    if (!l.hide) {
      l.hide = true;
      HOLZ.redraw();
    }
  }
  // ---------------- the blocks beside the mill (east of the track): boards flat in their order, one block per log ----------------
  let PG = null;
  function rebuildPiles() {
    const list = [],
      logs = [...new Set(S.boards.filter(b => b.st === 'pile').map(b => b.lid))];
    logs.forEach((lid, k) => {
      const bs = S.boards.filter(b => b.st === 'pile' && b.lid === lid).sort((a, b) => a.n - b.n);
      let z = 0.14;
      const x = MX() + 1.35 + k * 0.7,
        yc = (LY0 + LY1) / 2;
      for (const b of bs) {
        const m = new THREE.Matrix4().makeTranslation(...V(x, yc - b.L / 2, z - b.zb).toArray());
        list.push({ b: Object.assign({}, b), m });
        z += b.zt - b.zb + 0.002;
      }
    });
    PG = S.mergeSet(list, G, PG);
    HOLZ.setCol(
      'holzblock',
      logs.map((lid, k) => {
        const x = MX() + 1.35 + k * 0.7,
          h = S.boards.filter(b => b.st === 'pile' && b.lid === lid).reduce((a, b) => a + b.t, 0.14);
        return [x - 0.3, x + 0.3, LY0 - 0.25, LY1 + 0.25, 0, h];
      })
    );
    // the timbers under the blocks
    if (!S.under) {
      const mat = MAT.kvh || new THREE.MeshStandardMaterial({ color: 0x8a6a48 });
      S.under = new THREE.Group();
      for (let k = 0; k < 3; k++)
        for (const y of [LY0 + 0.5, LY1 - 0.5]) {
          const me = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.12), mat);
          me.position.copy(V(MX() + 1.35 + k * 0.7, y, 0.06));
          me.castShadow = me.receiveShadow = true;
          S.under.add(me);
        }
      G.add(S.under);
    }
  }
  S.pileBoards = () => S.boards.filter(b => b.st === 'pile');
  S.rebuildPiles = rebuildPiles;
  // ---------------- the acts at the mill ----------------
  function opAt() {
    if ((window.PHASE | 0) < SAW_PH) return null; // no band sawmill in the garden of today (construction phase 0)
    const l = curLog();
    if (!l) return null;
    if (!S.clamp)
      return {
        key: 'hs:clamp',
        label: 'Stamm festklemmen (Klemmen, Keil unters dünne Ende)',
        hold: 2.2,
        holdLabel: 'Klemmen …',
        anim3: 'interactLoop',
        rMove: 2.5,
        run: () => {
          S.clamp = true;
          save();
          openPlan();
        },
      };
    if (!S.plan) return { key: 'hs:plan', label: 'Einschnitt planen', run: () => openPlan() };
    return cutOp();
  }
  function register() {
    const pos = () => {
      const s = SAWs(),
        [x, y] = WT(MX() + 0.95, (LY0 + LY1) / 2 - 2.3);
      return [x, y, 0.9];
    };
    PLAY.act({
      id: 'hs:op',
      r: 2.6,
      prio: 0.7,
      pos,
      label: () => {
        const o = opAt();
        return o ? o.label : null;
      },
      run: () => {
        const o = opAt();
        if (!o) return;
        if (o.ppe && window.GEAR && !GEAR.check(o.ppe, false, 'Blockbandsäge')) return;
        if (o.hold)
          PLAY.run({
            id: o.key,
            r: 3,
            rMove: o.rMove || 2,
            pos,
            label: () => o.label,
            hold: o.hold,
            holdLabel: o.holdLabel,
            anim3: o.anim3,
            start: o.start,
            work: o.work,
            cancel: o.cancel,
            run: o.run,
          });
        else o.run();
      },
    });
  }
  // ---------------- saving (inside world/holz.js's record) ----------------
  function save() {
    if (HOLZ.save) HOLZ.save();
  }
  HOLZ.part2 = () => ({
    log: S.log,
    clamp: S.clamp,
    plan: S.plan,
    cut: S.cut,
    boards: S.boards,
    fire: S.fire,
    n: S.n,
    deco: S.decoGone,
  });
  const onStart0 = HOLZ.onStart;
  HOLZ.onStart = p2 => {
    if (onStart0) onStart0(p2);
    if (p2) {
      Object.assign(S, {
        log: p2.log || null,
        clamp: !!p2.clamp,
        plan: p2.plan || null,
        cut: p2.cut || 0,
        boards: p2.boards || [],
        fire: p2.fire || 0,
        n: p2.n || 0,
        decoGone: !!p2.deco,
      });
    }
    hideDeco();
    register();
    rebuildPiles();
    remain();
    if (S.onStart) S.onStart(p2);
  }; // the mill is a real machine now: its old decorative log goes
  KERN.tick(() => {
    if (anim.on) markDirty();
  }, 'werk/holz_saw');
  return S;
})();
LATE.HOLZSAW = HOLZSAW;
window.HOLZSAW = HOLZSAW;
