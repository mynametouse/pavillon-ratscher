// ===================== feat/grenzland-zone: the border zone at the Grünes Band south of Eisfeld (GLZONE) =====================
// Grenzland, Kapitel 2, Etappe 2 (Falko 17.11.2026 22:26 „Ok dann weiter“; brief docs/plans/auftraege/grenzland5-zone.md). The zone lies
// ~13 km south-east of the garden, beyond every tile set of the region: it brings its own ground – a tile set of welt/welt.js (levels 10
// and 11 over 2.8 × 1.2 km, level 12 along the Kolonnenweg; terrain from the Bavarian DGM1 which reaches across the old border, the
// Thuringian and Bavarian orthophotos joined) and zone.json (tools/grenzland/zone_gruenes_band.py, viz3/extra/grenzland-zone/).
// Loaded only in the mode, today (not in 1989), when the player comes within GLZDATA.NEAR of it or a mission needs it; freed again after
// leaving (beyond FAR for KEEP s). What stands there:
//   the Kolonnenweg: two lanes of perforated concrete slabs (0.75 × 2.5 m, four rows of holes filled with soil and moss), instanced per
//     stretch of ~120 m, near with their holes, farther as plain slabs (VEG levels); one rides it on the Simson (the ground under it is
//     carved to its smoothed profile in the tiles)
//   the bunker's outside (invented): an old concrete foundation in the heath, beside it an earth mound with a concrete front and an
//     iron door with a padlock („Abgeschlossen.“)
// Its roads and tracks go to welt/fahrt.js (FAHRT.add: the radar, the place names, the grip) and its ground to the vehicles' edge
// (FAHRT.ground). Getting there: GLZONE.hin() (a cut with a fade, for missions and tests) or by road – the A 73 south out of the region's
// data (its end beyond Schleusingen) leads to Eisfeld-Süd, the K 530 north out of the zone back.
//   GLZONE.da() → loaded and drawn · ort(name) → { x, y, z, name } ('kolonnenweg_a', 'kolonnenweg_b', 'bunker', 'museum', 'heide',
//   'parkplatz', 'hide') · weg() → the Kolonnenweg [[x, y, z], …] · anfahrt() → the drive from Schleusingen [[x, y], …] (A 73,
//   Eisfeld-Süd, K 530) · hin(o) → promise (o: { ort, mit: 'moped' | 'auto' | 'fuss' }) · need(id, on) · route(on) (the drive on the
//   radar) · state() · tick(dt) · stop() · linien() (no spoken lines) · KERN.emit('grenzland:zone', { an })
import * as THREE from 'three';
import { BASE, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, VEG, vegReady } from '../core/assets.js';
import { TREES, treeLeafLevels } from '../garden/trees.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { WELT } from '../welt/welt.js';
import { FAHRT } from '../welt/fahrt.js';
import { GL } from './gl_state.js';
import { GLHUD } from './gl_hud.js';
import { GLKARTE } from './gl_karte.js';
import { GLORTE } from './gl_orte.js';
import { GLAUTO } from './gl_auto.js';
import { GLZDATA as D } from './gl_zone_data.js';
export const GLZONE = (() => {
  const S = {
    an: false, // built and its ground asked for
    phase: 'aus', // 'aus' | 'laden' | 'bauen' | 'an'
    data: null,
    err: '',
    bedarf: new Set(), // who needs the zone now (missions, the cut there)
    farT: 0,
    acc: 0,
    meshes: [],
    lods: [],
    cols: [],
    acts: [],
    lin: null, // the Kolonnenweg's lines (GLZDATA.linie)
    platten: 0,
    ms: 0,
    builtN: 0,
    droppedN: 0,
    routeOn: false,
    transfer: null,
  };
  const SET = 'grenzland-zone';
  // ------------------------------------------------------------------ colours (linear, as the kit wants them) ------------------------------------------------------------------
  const L = GLORTE.L,
    C = {
      // weathered concrete of the 1970s: grey with a brown-green cast, darker in the holes' edges (photos of the Kolonnenweg)
      beton: L(122, 120, 112),
      betonD: L(88, 86, 80),
      kante: L(104, 102, 95),
      erde: L(66, 57, 46),
      moos: L(60, 68, 44),
      gras: L(72, 82, 50),
      rost: L(112, 64, 38),
      rostD: L(76, 44, 28),
      stahl: L(70, 72, 74),
      fund: L(150, 146, 136),
      fundD: L(112, 108, 100),
      hugel: L(84, 92, 56),
      hugelD: L(70, 74, 46),
      schloss: L(150, 120, 60),
    };
  // inside the zone's tiles (their rectangle is square in UTM; the model is turned by 4.4° against it)
  const inZone = (x, y, m = 0) => {
    if (!S.data || !D.inRect(S.data.rect, x, y, m + 10) || !WELT.toU) return false;
    const [E, N] = WELT.toU(x, y);
    return D.inRect(S.data.utm, E, N, m);
  };
  const mid = () => (S.data ? [(S.data.rect[0] + S.data.rect[2]) / 2, (S.data.rect[1] + S.data.rect[3]) / 2] : MID0);
  // the zone's middle before its data are there (from zone.json's rectangle, kept here for the distance test)
  const MID0 = [11122.5, -12522.3];
  // ------------------------------------------------------------------ data ------------------------------------------------------------------
  let dataP = null;
  function laden() {
    if (S.data) return Promise.resolve(S.data);
    if (!dataP)
      dataP = fetch(BASE + D.PFAD + 'zone.json')
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('zone.json ' + r.status))))
        .then(j => {
          S.data = j;
          S.lin = (j.kolonnenweg || []).map(k => D.linie(k.p, 3));
          return j;
        })
        .catch(e => {
          dataP = null;
          S.err = String((e && e.message) || e);
          throw e;
        });
    return dataP;
  }
  // ------------------------------------------------------------------ the slabs ------------------------------------------------------------------
  // one slab in its own frame (x across, y along, z up; the top at 0): the four rows of holes filled with soil and moss nearly to the top
  function plattenGeo(fein, variante) {
    const K = GLORTE.kit(),
      PL = D.PLATTE,
      B = PL.b,
      Lg = PL.l,
      dd = PL.d,
      [nx, ny] = PL.loch,
      hb = PL.lb,
      hl = PL.ll,
      wx = (B - nx * hb) / (nx + 1),
      wy = (Lg - ny * hl) / (ny + 1),
      x0 = -B / 2,
      y0 = -Lg / 2,
      T = 0,
      R = D.zufall(77 + variante * 13);
    const top = (a, b, c, d, col) => K.quad([a[0], a[1], T], [b[0], b[1], T], [c[0], c[1], T], [d[0], d[1], T], col);
    // the sides, down into the ground
    const sx = B / 2,
      sy = Lg / 2;
    K.quad([-sx, -sy, -dd], [sx, -sy, -dd], [sx, -sy, T], [-sx, -sy, T], C.kante);
    K.quad([sx, sy, -dd], [-sx, sy, -dd], [-sx, sy, T], [sx, sy, T], C.kante);
    K.quad([sx, -sy, -dd], [sx, sy, -dd], [sx, sy, T], [sx, -sy, T], C.kante);
    K.quad([-sx, sy, -dd], [-sx, -sy, -dd], [-sx, -sy, T], [-sx, sy, T], C.kante);
    if (!fein) {
      // far: one plain top, the holes as a darker grey-green
      const c = [0, 1, 2].map(i => C.beton[i] * 0.78 + C.moos[i] * 0.22);
      top([-sx, -sy], [sx, -sy], [sx, sy], [-sx, sy], c);
      return K.geo();
    }
    // the webs: five strips along, and between the holes of each row the pieces across
    for (let k = 0; k <= nx; k++) {
      const a = x0 + k * (wx + hb);
      top([a, -sy], [a + wx, -sy], [a + wx, sy], [a, sy], k === 0 || k === nx ? C.beton : C.beton.map(v => v * 0.96));
    }
    for (let i = 0; i < nx; i++) {
      const a = x0 + wx + i * (wx + hb);
      for (let j = 0; j <= ny; j++) {
        const b = y0 + j * (wy + hl);
        top(
          [a, b],
          [a + hb, b],
          [a + hb, b + wy],
          [a, b + wy],
          C.beton.map(v => v * (0.93 + R() * 0.1))
        );
      }
    }
    // the holes: a floor of soil, moss or grass 1.6 cm down (the ground of the tiles lies just below it), short walls
    const tief = 0.016;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const a = x0 + wx + i * (wx + hb),
          b = y0 + wy + j * (wy + hl),
          r = R(),
          col = r < 0.42 ? C.moos : r < 0.72 ? C.erde : r < 0.92 ? C.gras : C.betonD,
          f = col.map(v => v * (0.85 + R() * 0.3)),
          z = T - tief;
        K.quad([a, b, z], [a + hb, b, z], [a + hb, b + hl, z], [a, b + hl, z], f);
        K.quad([a, b, z], [a, b + hl, z], [a, b + hl, T], [a, b, T], C.betonD);
        K.quad([a + hb, b + hl, z], [a + hb, b, z], [a + hb, b, T], [a + hb, b + hl, T], C.betonD);
        K.quad([a + hb, b, z], [a, b, z], [a, b, T], [a + hb, b, T], C.betonD);
        K.quad([a, b + hl, z], [a + hb, b + hl, z], [a + hb, b + hl, T], [a, b + hl, T], C.betonD);
      }
    return K.geo();
  }
  let GEO = null,
    MAT = null;
  function plattenMat() {
    // the same features as the parked cars' material (dinge/dinge_modelle.js: vertex colours, instanced, instance colours): no new program
    if (!MAT)
      MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, envMapIntensity: 0.5 });
    return MAT;
  }
  const m4 = new THREE.Matrix4(),
    q4 = new THREE.Quaternion(),
    e4 = new THREE.Euler(),
    s4 = new THREE.Vector3(1, 1, 1),
    c4 = new THREE.Color();
  function bauPlatten() {
    if (!GEO) GEO = { fein: [plattenGeo(true, 0), plattenGeo(true, 1)], grob: plattenGeo(false, 0) };
    const mat = plattenMat(),
      STRECKE = 120;
    let n = 0;
    S.lin.forEach((Lw, wi) => {
      const list = D.platten(Lw, { seed: 1973 + wi * 7 }).filter(p => p.k !== 3);
      // in stretches: each its own instanced meshes (frustum culling), near with holes, farther plain
      const by = new Map();
      for (const p of list) {
        const k = Math.floor(p.s / STRECKE);
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(p);
      }
      for (const grp of by.values()) {
        const half = [[], []];
        grp.forEach(p => half[(p.roh * 1000) & 1].push(p));
        const grob = new THREE.InstancedMesh(GEO.grob, mat, grp.length);
        const feine = half.map((h, v) => (h.length ? new THREE.InstancedMesh(GEO.fein[v], mat, h.length) : null));
        const idx = [0, 0];
        grp.forEach((p, i) => {
          const sunk = p.k === 2 ? 0.035 : 0;
          // half of them laid the other way round (the hole patterns do not repeat in one direction): then the pitch turns too
          const um = p.roh > 0.5;
          e4.set((um ? -p.kipp : p.kipp) + (p.k === 2 ? 0.02 : 0), -p.hd + (um ? Math.PI : 0), p.quer, 'YXZ');
          q4.setFromEuler(e4);
          m4.compose(V(p.x, p.y, p.z + 0.03 - sunk), q4, s4);
          const g = 0.84 + p.roh * 0.2,
            green = p.k === 1 ? 0.92 : 1;
          c4.setRGB(g, g * (1.0 + (1 - green) * 0.6), g * green);
          grob.setMatrixAt(i, m4);
          grob.setColorAt(i, c4);
          const v = (p.roh * 1000) & 1,
            f = feine[v];
          if (f) {
            f.setMatrixAt(idx[v], m4);
            f.setColorAt(idx[v], c4);
            idx[v]++;
          }
        });
        for (const im of [...feine.filter(Boolean), grob]) {
          im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.computeBoundingSphere();
          im.castShadow = false;
          im.receiveShadow = false;
          im.userData.noMerge = true;
          im.name = 'grenzland-zone-platten';
        }
        // the level of detail: the holes within ~45 m of the stretch; the two hole patterns in one group (VEG shows one level at a time
        // and measures from the stretch's sphere)
        const G = new THREE.Group();
        G.name = 'grenzland-zone-platten-nah';
        G.userData.noMerge = true;
        for (const f of feine) if (f) G.add(f);
        scene.add(G);
        scene.add(grob);
        S.meshes.push(G, grob);
        const Lv = { ms: [G, grob], d: [45], bs: grob.boundingSphere };
        VEG.add(Lv);
        S.lods.push(Lv);
        n += grp.length;
      }
    });
    S.platten = n;
  }

  // ------------------------------------------------------------------ the trees at the forest edges ------------------------------------------------------------------
  // 24 615 trees in zone.json (spruce and pine – the stands; birches and broadleaves – the young growth; young pines and birches in the
  // heath), within 120 m of the Kolonnenweg and 90 m of the tower. Far: crossed cards with the atlas of world/ratscher.js and its material
  // (the region's far trees: no new program), in cells of 128 m. Near (within ~70 m of the player): the garden's generated trees (pine,
  // aspen) with their levels of detail, built a cell of 48 m at a time; their cards meanwhile folded away. Trunks stop walkers and vehicles.
  const BA = { T: null, n: 0, ci: null, ii: null, cells: [], near: new Map(), grid: new Map(), nahN: 0 };
  const CARD = 128,
    NC = 48,
    NAH = 70,
    WEG_NAH = 115;
  const KIND = { 4: 'pine', 3: 'aspen' };
  function bauBaeume() {
    const t = S.data.baeume;
    if (!t) return;
    const T = D.baeume(t),
      n = T.length / 5;
    BA.T = T;
    BA.n = n;
    BA.ci = new Int32Array(n).fill(-1);
    BA.ii = new Int32Array(n);
    // a grid of 16 m for the trunks (pushOut) and the near cells
    for (let i = 0; i < n; i++) {
      const k = Math.floor(T[i * 5] / 16) + ':' + Math.floor(T[i * 5 + 1] / 16);
      let a = BA.grid.get(k);
      if (!a) BA.grid.set(k, (a = []));
      a.push(i);
    }
    const far = window.RATSCHER && RATSCHER.trees && RATSCHER.trees[0];
    if (!far || !far.material) return;
    const mat = far.material,
      cross = (() => {
        const a = new THREE.PlaneGeometry(1, 1),
          b = new THREE.PlaneGeometry(1, 1);
        b.rotateY(Math.PI / 2);
        const pa = a.attributes,
          pb = b.attributes,
          pos = new Float32Array([...pa.position.array, ...pb.position.array]),
          uv = new Float32Array([...pa.uv.array, ...pb.uv.array]),
          nrm = new Float32Array(pos.length),
          idx = [...a.index.array, ...Array.from(b.index.array, v => v + pa.position.count)];
        for (let i = 0; i < nrm.length; i += 3) nrm[i + 1] = 1;
        for (let i = 1; i < pos.length; i += 3) pos[i] += 0.5;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(idx);
        return g;
      })();
    BA.cross = cross;
    const by = new Map();
    for (let i = 0; i < n; i++) {
      const k = Math.floor(T[i * 5] / CARD) + ':' + Math.floor(T[i * 5 + 1] / CARD);
      let a = by.get(k);
      if (!a) by.set(k, (a = []));
      a.push(i);
    }
    const up = new THREE.Vector3(0, 1, 0),
      sv = new THREE.Vector3(),
      col = new THREE.Color();
    for (const list of by.values()) {
      const g = cross.clone(),
        kk = new Float32Array(list.length);
      g.setAttribute('aKind', new THREE.InstancedBufferAttribute(kk, 1));
      const im = new THREE.InstancedMesh(g, mat, list.length),
        c = BA.cells.length;
      list.forEach((i, j) => {
        const h = T[i * 5 + 3],
          kind = T[i * 5 + 4],
          hs = Math.abs(Math.sin(T[i * 5] * 12.9898 + T[i * 5 + 1] * 78.233) * 43758.5453) % 1;
        q4.setFromAxisAngle(up, hs * 6.283);
        m4.compose(V(T[i * 5], T[i * 5 + 1], T[i * 5 + 2] - 0.3), q4, sv.set(h * 0.74, h, h * 0.74));
        im.setMatrixAt(j, m4);
        kk[j] = kind === 3 ? 3 : 4;
        col
          .setRGB(1, 1, 1)
          .offsetHSL((hs - 0.5) * 0.04, 0, (hs - 0.5) * 0.1)
          .multiplyScalar(kind === 3 ? 1 : 0.82);
        im.setColorAt(j, col);
        BA.ci[i] = c;
        BA.ii[i] = j;
      });
      im.castShadow = false;
      im.receiveShadow = false;
      im.userData.noMerge = true;
      im.name = 'grenzland-zone-baeume-fern';
      vegReady(im);
      scene.add(im);
      S.meshes.push(im);
      BA.cells.push(im);
    }
  }
  // a card folded to nothing (its tree stands in 3D) or back
  const nullM = new THREE.Matrix4().makeScale(0, 0, 0);
  function karte(i, an) {
    const c = BA.ci[i];
    if (c < 0) return;
    const im = BA.cells[c],
      j = BA.ii[i];
    if (an) {
      const T = BA.T,
        h = T[i * 5 + 3],
        hs = Math.abs(Math.sin(T[i * 5] * 12.9898 + T[i * 5 + 1] * 78.233) * 43758.5453) % 1;
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hs * 6.283);
      m4.compose(V(T[i * 5], T[i * 5 + 1], T[i * 5 + 2] - 0.3), q4, new THREE.Vector3(h * 0.74, h, h * 0.74));
      im.setMatrixAt(j, m4);
    } else im.setMatrixAt(j, nullM);
    im.instanceMatrix.needsUpdate = true;
  }
  function nahZelle(key, cx, cy) {
    const T = BA.T,
      list = [];
    for (let gx = Math.floor((cx * NC) / 16); gx <= Math.floor(((cx + 1) * NC - 0.01) / 16); gx++)
      for (let gy = Math.floor((cy * NC) / 16); gy <= Math.floor(((cy + 1) * NC - 0.01) / 16); gy++) {
        const a = BA.grid.get(gx + ':' + gy);
        if (!a) continue;
        for (const i of a) {
          const x = T[i * 5],
            y = T[i * 5 + 1];
          if (x >= cx * NC && x < (cx + 1) * NC && y >= cy * NC && y < (cy + 1) * NC) list.push(i);
        }
      }
    const Z = { key, list, ms: [], lods: [] };
    const up = new THREE.Vector3(0, 1, 0),
      sv = new THREE.Vector3(),
      col = new THREE.Color();
    for (const kind of [4, 3]) {
      const K = TREES[KIND[kind]],
        L2 = list.filter(i => T[i * 5 + 4] === kind);
      if (!K || !L2.length) continue;
      const LG = treeLeafLevels(K),
        ib = new THREE.InstancedMesh(K.bg, K.bark, L2.length),
        il = new THREE.InstancedMesh(LG[1], K.leaf, L2.length);
      L2.forEach((i, j) => {
        const h = T[i * 5 + 3],
          r = h * (kind === 4 ? 0.2 : 0.26),
          hs = Math.abs(Math.sin(T[i * 5] * 12.9898 + T[i * 5 + 1] * 78.233) * 43758.5453) % 1,
          sy = h / K.H,
          sx = THREE.MathUtils.clamp(r / K.R, sy * 0.75, sy * 1.3);
        q4.setFromAxisAngle(up, hs * 6.283);
        m4.compose(V(T[i * 5], T[i * 5 + 1], T[i * 5 + 2] - 0.1), q4, sv.set(sx, sy, sx));
        ib.setMatrixAt(j, m4);
        il.setColorAt(j, col.setRGB(1, 1, 1).multiplyScalar(0.8 + hs * 0.2));
      });
      il.instanceMatrix = ib.instanceMatrix;
      const bm = new THREE.InstancedMesh(K.bgMid, K.bark, L2.length),
        bf = new THREE.InstancedMesh(K.bgFar, K.bark, L2.length),
        lf = new THREE.InstancedMesh(LG[2], K.leaf, L2.length);
      bm.instanceMatrix = bf.instanceMatrix = lf.instanceMatrix = ib.instanceMatrix;
      lf.instanceColor = il.instanceColor;
      for (const im of [ib, il, bm, bf, lf]) {
        im.castShadow = false;
        im.receiveShadow = false;
        im.userData.noMerge = true;
        im.name = 'grenzland-zone-baeume-nah';
        vegReady(im);
        scene.add(im);
        Z.ms.push(im);
      }
      const a = VEG.add({ ms: [ib, bm, bf], d: [30, 90] }),
        b = VEG.add({ ms: [il, lf], d: [90] });
      Z.lods.push(a, b);
    }
    for (const i of list) karte(i, false);
    return Z;
  }
  function nahWeg(Z) {
    for (const im of Z.ms) {
      scene.remove(im);
      if (im.dispose) im.dispose();
    }
    for (const Lv of Z.lods) {
      const i = VEG.lod.indexOf(Lv);
      if (i >= 0) VEG.lod.splice(i, 1);
    }
    if (S.an) for (const i of Z.list) karte(i, true);
  }
  // near the player: build the next missing cell (one per call), drop the far ones
  function nahBaeume(x, y) {
    if (!BA.T || !TREES.pine) return;
    const c0 = Math.floor((x - NAH) / NC),
      c1 = Math.floor((x + NAH) / NC),
      r0 = Math.floor((y - NAH) / NC),
      r1 = Math.floor((y + NAH) / NC);
    for (const [k, Z] of BA.near) {
      const [cx, cy] = k.split(':').map(Number),
        dx = Math.max(cx * NC - x, 0, x - (cx + 1) * NC),
        dy = Math.max(cy * NC - y, 0, y - (cy + 1) * NC);
      if (Math.hypot(dx, dy) > WEG_NAH) {
        nahWeg(Z);
        BA.near.delete(k);
      }
    }
    let best = null,
      bd = 1e9;
    for (let cx = c0; cx <= c1; cx++)
      for (let cy = r0; cy <= r1; cy++) {
        const k = cx + ':' + cy;
        if (BA.near.has(k)) continue;
        const dx = Math.max(cx * NC - x, 0, x - (cx + 1) * NC),
          dy = Math.max(cy * NC - y, 0, y - (cy + 1) * NC),
          d = Math.hypot(dx, dy);
        if (d < NAH && d < bd) {
          bd = d;
          best = [k, cx, cy];
        }
      }
    if (best) {
      BA.near.set(best[0], nahZelle(...best));
      BA.nahN = [...BA.near.values()].reduce((s, Z) => s + Z.list.length, 0);
      markDirty(true);
    }
  }
  // trunks stop walkers and vehicles (a vehicle beyond the square asks KERN.pushOut with three circles – welt/fahrt.js VEH.hitsOut)
  function stamm(p, rad) {
    if (!BA.T) return false;
    const T = BA.T,
      gx = Math.floor(p[0] / 16),
      gy = Math.floor(p[1] / 16);
    let moved = false;
    for (let ix = gx - 1; ix <= gx + 1; ix++)
      for (let iy = gy - 1; iy <= gy + 1; iy++) {
        const a = BA.grid.get(ix + ':' + iy);
        if (!a) continue;
        for (const i of a) {
          const h = T[i * 5 + 3];
          if (h < 4) continue;
          const r = 0.12 + h * 0.008,
            dx = p[0] - T[i * 5],
            dy = p[1] - T[i * 5 + 1],
            d = Math.hypot(dx, dy),
            m = r + rad;
          if (d >= m || d < 1e-6) continue;
          p[0] = T[i * 5] + (dx / d) * m;
          p[1] = T[i * 5 + 1] + (dy / d) * m;
          moved = true;
        }
      }
    return moved;
  }
  // ------------------------------------------------------------------ the bunker's outside (invented) ------------------------------------------------------------------
  const BK = { F: null, tuer: null, z: 0, sockel: 0.36 };
  function bauBunker() {
    const o = S.data.orte.bunker,
      K = GLORTE.kit(),
      KM = GLORTE.kit(),
      // the foundation's square follows the Kolonnenweg nearby (a tower stood parallel to it)
      nah = S.lin && S.lin[0] ? D.naechst(S.lin[0], o[0], o[1]) : null,
      hd = nah ? D.bei(S.lin[0], nah.s).hd : 0,
      F = GLORTE.frame(K, o[0], o[1], hd, o[2]),
      FM = GLORTE.frame(KM, o[0], o[1], hd, o[2]),
      R = D.zufall(1989),
      h = BK.sockel;
    BK.F = F;
    BK.z = o[2];
    // the old foundation: a slab of concrete 4.2 m square, its edges broken in places, moss in patches, four rusty bolts, a pipe stub
    F.box(0, 0, -0.2, 4.2, 4.2, h + 0.2, C.fund);
    for (let i = 0; i < 9; i++) {
      const r = (R() - 0.5) * 3.4,
        f = (R() - 0.5) * 3.4,
        w = 0.4 + R() * 0.9;
      F.box(r, f, h, w, w * (0.6 + R() * 0.6), 0.012, R() < 0.6 ? C.moos : C.fundD, false, R() * 3);
    }
    for (const [r, f] of [
      [-1.7, -1.7],
      [1.7, -1.7],
      [1.7, 1.7],
      [-1.7, 1.7],
    ]) {
      FM.cyl(r, f, h, h + 0.09, 0.022, 0.022, 6, C.rost, true);
      FM.cyl(r, f, h, h + 0.018, 0.045, 0.045, 6, C.rostD, true);
    }
    FM.cyl(0.6, 0.9, h - 0.02, h + 0.16, 0.06, 0.06, 8, C.rostD, true);
    // a chipped corner
    F.box(2.0, 2.0, h - 0.12, 0.35, 0.35, 0.13, C.fundD, false, 0.4);
    // the mound behind it (towards the forest edge): earth and grass over the bunker, low and long
    const mx = 0,
      mf = -5.6;
    const prof = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7,
        r = 4.2 * (1 - t * t) + 0.01;
      prof.push([r, 1.55 * Math.sin((t * Math.PI) / 2)]);
    }
    // lathe in a frame: centre of the mound, stretched along the foundation's front with a second hump
    for (const [dr, s] of [
      [-1.6, 1],
      [1.6, 0.92],
    ]) {
      const [x, y] = F.xy(mx + dr, mf);
      K.lathe(
        x,
        y,
        o[2] - 0.15,
        prof.map(([r, z]) => [r * s, z * s]),
        14,
        R() < 0.5 ? C.hugel : C.hugelD
      );
    }
    // its front: a concrete wall half in the ground, facing the foundation, with an iron door and a padlock
    const wf = mf + 2.35;
    F.box(0, wf, -0.4, 2.8, 0.34, 1.95, C.beton);
    F.box(0, wf + 0.05, 1.5, 3.0, 0.44, 0.12, C.betonD);
    // the door: rusty steel, a frame, a hasp with a padlock
    FM.box(0, wf + 0.19, 0.0, 0.96, 0.05, 1.32, C.rost);
    FM.box(0, wf + 0.21, 0.0, 1.06, 0.03, 0.05, C.rostD);
    FM.box(0, wf + 0.21, 1.3, 1.06, 0.03, 0.05, C.rostD);
    FM.box(-0.51, wf + 0.21, 0.0, 0.05, 0.03, 1.35, C.rostD);
    FM.box(0.51, wf + 0.21, 0.0, 0.05, 0.03, 1.35, C.rostD);
    FM.box(0.36, wf + 0.235, 0.62, 0.16, 0.025, 0.05, C.stahl);
    FM.box(0.44, wf + 0.26, 0.55, 0.07, 0.03, 0.08, C.schloss);
    FM.rolle([0.42, wf + 0.255, 0.6], [0.46, wf + 0.255, 0.6], 0.022, C.stahl, 6, { a0: 0, a1: Math.PI });
    // a few steps down in front of the door, as if the ground had settled
    F.box(0, wf + 0.75, -0.18, 1.3, 0.5, 0.18, C.betonD);
    const m1 = GLORTE.mesh(K, GLORTE.mat().paint, 'grenzland-zone-bunker'),
      m2 = GLORTE.mesh(KM, GLORTE.mat().metal, 'grenzland-zone-bunker-eisen');
    for (const m of [m1, m2]) if (m) S.meshes.push(m);
    BK.tuer = F.P(0, wf + 1.3, 0);
    // what stops vehicles and walkers: the foundation (one steps up onto it: KERN ground), the wall, the mound
    addCol(F.col(-2.1, 2.1, -2.1, 2.1, -1, h), true);
    addCol(F.col(-1.45, 1.45, wf - 0.2, wf + 0.2, -1, 2.2));
    addCol(F.col(-4.5, 4.5, mf - 3.6, wf - 0.2, -1, 2.2));
    // the door: locked in this stage (Etappe 4 goes inside)
    act({
      id: 'glzone-bunker-tuer',
      label: () => (S.an ? 'Tür ansehen' : null),
      pos: () => [BK.tuer[0], BK.tuer[1], BK.z],
      r: 2.2,
      run: () => {
        PLAY.think('Abgeschlossen – ein neues Vorhängeschloss an einer alten Tür.', 3400);
        KERN.emit('grenzland:zone:tuer', { ort: 'bunker' });
      },
    });
  }
  // ------------------------------------------------------------------ collisions, actions ------------------------------------------------------------------
  function addCol(B, stehen) {
    const c = { B, stehen: !!stehen };
    c.x = { gl: true, box: () => (S.an ? B : null) };
    S.cols.push(c);
    VEH.extra.push(c.x);
  }
  function act(a) {
    KERN.act(a);
    S.acts.push(a.id);
  }
  function pushBox(B, p, rad) {
    const dx = p[0] - B.c[0],
      dy = p[1] - B.c[1],
      lx = dx * B.ax[0] + dy * B.ax[1],
      ly = dx * B.ay[0] + dy * B.ay[1],
      qx = Math.max(-B.ex, Math.min(B.ex, lx)),
      qy = Math.max(-B.ey, Math.min(B.ey, ly)),
      ex = lx - qx,
      ey = ly - qy,
      dd = Math.hypot(ex, ey);
    if (dd >= rad) return false;
    let nx, ny, d;
    if (dd > 1e-6) {
      nx = ex / dd;
      ny = ey / dd;
      d = rad - dd;
    } else {
      const ox = B.ex - Math.abs(lx),
        oy = B.ey - Math.abs(ly);
      if (ox < oy) {
        nx = Math.sign(lx || 1);
        ny = 0;
        d = ox + rad;
      } else {
        nx = 0;
        ny = Math.sign(ly || 1);
        d = oy + rad;
      }
    }
    p[0] += (B.ax[0] * nx + B.ay[0] * ny) * d;
    p[1] += (B.ax[1] * nx + B.ay[1] * ny) * d;
    return true;
  }
  const inBox = (B, x, y) => {
    const dx = x - B.c[0],
      dy = y - B.c[1];
    return Math.abs(dx * B.ax[0] + dy * B.ax[1]) <= B.ex && Math.abs(dx * B.ay[0] + dy * B.ay[1]) <= B.ey;
  };
  // ------------------------------------------------------------------ providers (once; they answer only while the zone stands) ------------------------------------------------------------------
  let once = false;
  function providers() {
    if (once) return;
    once = true;
    const bnah = (x, y) => BK.F && Math.abs(x - BK.F.ox) < 14 && Math.abs(y - BK.F.oy) < 14;
    KERN.provide(
      'pushOut',
      (p, rad) => {
        if (!S.an || !inZone(p[0], p[1])) return undefined;
        let moved = false;
        if (bnah(p[0], p[1])) for (const c of S.cols) if (!c.stehen && pushBox(c.B, p, rad)) moved = true;
        if (stamm(p, rad)) moved = true;
        return moved ? true : undefined;
      },
      40
    );
    // standing on the old foundation
    KERN.provide(
      'ground',
      (x, y, z) => {
        if (!S.an || !bnah(x, y)) return undefined;
        for (const c of S.cols)
          if (c.stehen && inBox(c.B, x, y) && (z === undefined || z > c.B.z1 - 0.55)) return c.B.z1;
        return undefined;
      },
      30
    );
    KERN.provide(
      'place',
      (x, y) => {
        if (!S.an || !inZone(x, y)) return undefined;
        const o = S.data.orte;
        if (o.bunker && Math.hypot(x - o.bunker[0], y - o.bunker[1]) < 14) return D.ORTE.bunker;
        if (o.museum && Math.hypot(x - o.museum[0], y - o.museum[1]) < 40) return D.PLATZ.turm;
        if (S.lin)
          for (const Lw of S.lin) {
            const q = D.naechst(Lw, x, y);
            if (q.d < 3.5) return D.PLATZ.weg;
          }
        if (o.heide && Math.hypot(x - o.heide[0], y - o.heide[1]) < 220) return D.PLATZ.heide;
        return undefined;
      },
      31
    );
    // the vehicles may drive where the zone's tiles are drawn (and wait where they are still loading)
    if (FAHRT.ground)
      FAHRT.ground((x, y) => {
        if (!S.an || !inZone(x, y)) return undefined;
        return WELT.heightAt(x, y) !== undefined;
      });
    // the radar: the zone's places while one is in it; the drive there while a mission or the phone asks for it
    GLKARTE.src(out => {
      if (!GL.on) return;
      if (S.an && S.data) {
        const o = S.data.orte;
        if (o.bunker) out.push({ x: o.bunker[0], y: o.bunker[1], k: 'ort', name: 'Bunker' });
        if (o.museum) out.push({ x: o.museum[0], y: o.museum[1], k: 'ort', name: 'Grenzturm' });
      }
      if (S.routeOn) {
        const o = S.data ? S.data.orte.parkplatz : null;
        out.push({ x: o ? o[0] : MID0[0], y: o ? o[1] : MID0[1], k: 'punkt', name: D.PLATZ.zone });
      }
    });
    // the drive on the radar (welt/fahrt.js draws its roads into it through MMAP.more; the line is drawn after them)
    const M = window.MMAP;
    if (M) {
      const prev = M.more;
      M.more = function (g, Pt, cx, cy, R2) {
        if (prev) prev.apply(this, arguments);
        try {
          if (!S.routeOn || !S.data || !S.data.anfahrt || !GL.on) return;
          const pts = anfahrt();
          g.save();
          g.strokeStyle = 'rgba(232,90,216,0.9)';
          g.lineWidth = 3;
          g.beginPath();
          let on = false;
          for (const [x, y] of pts) {
            if (Math.abs(x - cx) > R2 * 1.6 || Math.abs(y - cy) > R2 * 1.6) {
              on = false;
              continue;
            }
            const q = Pt(x, y);
            on ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
            on = true;
          }
          g.stroke();
          g.restore();
        } catch (e) {}
      };
    }
  }
  // ------------------------------------------------------------------ build and drop ------------------------------------------------------------------
  let baut = null;
  function bauen() {
    if (S.an || baut) return baut;
    S.phase = 'laden';
    const t0 = performance.now();
    baut = laden()
      .then(j => {
        if (!want()) {
          S.phase = 'aus';
          return false;
        }
        S.phase = 'bauen';
        providers();
        // the ground: the zone's tile set below the site's base (hook W1 of welt/welt.js: a set with an address of its own)
        if (WELT.addSet) WELT.addSet(D.SUB, BASE + D.PFAD + 'welt/');
        WELT.need(SET, true, D.SUB);
        // its roads and tracks (and the Kolonnenweg as a track of concrete): the radar, the place names, the grip – the ground is the
        // zone's own (nothing carved), it names its places itself
        // (the Kolonnenweg goes in as a thin track: the road map must not paint a band of concrete between its two lanes of slabs)
        if (FAHRT.add && j.wege) {
          const kol = j.wege.names.indexOf('Kolonnenweg'),
            wege = Object.assign({}, j.wege, {
              ways: j.wege.ways.map(w => (w[4] === kol ? [w[0], 4, 2, w[3], w[4], w[5], w[6]] : w)),
            });
          FAHRT.add(SET, wege, { carve: false, places: false, decks: false });
        }
        S.an = true;
        try {
          bauPlatten();
        } catch (e) {
          console.warn('grenzland zone: platten', e);
        }
        try {
          bauBunker();
        } catch (e) {
          console.warn('grenzland zone: bunker', e);
        }
        try {
          if (!/[?&]nozonebaeume\b/.test(location.search)) bauBaeume();
        } catch (e) {
          console.warn('grenzland zone: baeume', e);
        }
        S.phase = 'an';
        S.ms = Math.round(performance.now() - t0);
        S.builtN++;
        S.farT = 0;
        markDirty(true);
        KERN.emit('grenzland:zone', { an: true });
        return true;
      })
      .catch(e => {
        S.phase = 'aus';
        S.err = String((e && e.message) || e);
        console.warn('grenzland zone', e);
        return false;
      })
      .finally(() => (baut = null));
    return baut;
  }
  function abbauen() {
    if (!S.an) return;
    S.an = false;
    for (const Z of BA.near.values()) nahWeg(Z);
    BA.near.clear();
    BA.T = null;
    BA.cells.length = 0;
    BA.grid.clear();
    for (const m of S.meshes) {
      scene.remove(m);
      const all = m.isGroup ? m.children.slice() : [m];
      for (const q of all) {
        if (q.geometry && !(GEO && (GEO.grob === q.geometry || GEO.fein.includes(q.geometry)))) q.geometry.dispose();
        if (q.isInstancedMesh && q.dispose) q.dispose();
      }
    }
    S.meshes.length = 0;
    for (const Lv of S.lods) {
      const i = VEG.lod.indexOf(Lv);
      if (i >= 0) VEG.lod.splice(i, 1);
    }
    S.lods.length = 0;
    for (const c of S.cols) {
      const i = VEH.extra.indexOf(c.x);
      if (i >= 0) VEH.extra.splice(i, 1);
    }
    S.cols.length = 0;
    for (const id of S.acts) KERN.unact(id);
    S.acts.length = 0;
    BK.F = null;
    if (FAHRT.drop) FAHRT.drop(SET);
    WELT.need(SET, false);
    S.phase = 'aus';
    S.droppedN++;
    markDirty(true);
    KERN.emit('grenzland:zone', { an: false });
  }
  // ------------------------------------------------------------------ when ------------------------------------------------------------------
  const wo = () => {
    const v = VEH.cur;
    return v ? [v.st.x, v.st.y] : [P.x, P.y];
  };
  const heute = () => GL.on && GL.era !== '1989';
  function want() {
    if (!heute()) return false;
    if (S.bedarf.size) return true;
    const [x, y] = wo(),
      m = mid();
    return Math.hypot(x - m[0], y - m[1]) < D.NEAR;
  }
  function tick(dt) {
    try {
      if (!heute()) {
        if (S.an) abbauen();
        return;
      }
      S.acc += dt;
      if (S.acc < 0.25) return;
      const t = S.acc;
      S.acc = 0;
      const [x, y] = wo(),
        m = mid(),
        d = Math.hypot(x - m[0], y - m[1]);
      if (!S.an) {
        if (want()) bauen();
      } else if (!S.bedarf.size && d > D.FAR) {
        S.farT += t;
        if (S.farT > D.KEEP) abbauen();
      } else S.farT = 0;
      if (S.an && inZone(x, y, 150)) nahBaeume(x, y);
      zufahrt(x, y);
    } catch (e) {
      if (!S._e) {
        S._e = 1;
        console.warn('grenzland zone tick', e);
      }
    }
  }
  // ------------------------------------------------------------------ getting there by road ------------------------------------------------------------------
  // the A 73 leaves the region's road data south-east of Schleusingen: driving on there (towards Coburg), one comes out at Eisfeld-Süd;
  // out of the zone on the K 530 or the A 73 to the north, back onto the A 73 towards Schleusingen
  function zufahrt(x, y) {
    const v = VEH.cur;
    if (!v || S.transfer || !GL.on) return;
    const sp = v.st.u,
      hd = (v.st.psi * 180) / Math.PI;
    if (sp < 6) return;
    const A = D.A73;
    if (Math.hypot(x - A.ende[0], y - A.ende[1]) < A.r && Math.abs(D.dWinkel(hd, A.hd)) < 50) {
      hin({ mit: 'fahrzeug', ort: 'ankunft', titel: 'A 73 · Richtung Coburg', unter: 'Ausfahrt Eisfeld-Süd' });
      return;
    }
    if (S.an && S.data && inZone(x, y) && !inZone(x, y, -45) && Math.abs(D.dWinkel(hd, 0)) < 60) {
      const [, N] = WELT.toU(x, y);
      if (N > S.data.utm[3] - 45) zurueck();
    }
  }
  // ------------------------------------------------------------------ the cut there and back ------------------------------------------------------------------
  function platz(name) {
    const o = S.data && S.data.orte;
    const p = o && o[name];
    if (!p) return null;
    // on the Kolonnenweg: heading along it, into the zone (from a towards b, from b back)
    if (/^kolonnenweg/.test(name) && S.lin && S.lin[0]) {
      const Lw = S.lin[0],
        q = D.naechst(Lw, p[0], p[1]),
        t = D.bei(Lw, q.s),
        hd = (t.hd * 180) / Math.PI + (q.s > Lw.len / 2 ? 180 : 0);
      return [t.x, t.y, t.z, ((hd % 360) + 360) % 360];
    }
    return [p[0], p[1], p[2], p[3] || 0];
  }
  function hin(o = {}) {
    if (S.transfer) return S.transfer;
    S.bedarf.add('hin');
    const t0 = performance.now();
    S.transfer = (async () => {
      try {
        if (o.fade !== false) await GLHUD.fade(true, o.titel || D.PLATZ.zone, o.unter || 'bei Eisfeld');
        await laden();
        await bauen();
        const p = platz(o.ort || 'parkplatz');
        if (!p) throw new Error('kein Platz ' + (o.ort || 'parkplatz'));
        const hd = ((p[3] || 0) * Math.PI) / 180,
          v = VEH.cur,
          fz = o.mit === 'moped' ? 'gl-moped' : v && o.mit !== 'fuss' ? v.id : null;
        // first on foot at the place (the tiles are planned around the walker), the vehicle comes when its ground is drawn – a vehicle
        // put on ground that is not there yet falls or is thrown when the ground comes
        if (v) VEH.exit();
        if (fz === 'gl-moped') GLAUTO.mopedHide();
        P.x = p[0] - Math.sin(hd) * 2.5;
        P.y = p[1] - Math.cos(hd) * 2.5;
        P.feet = p[2];
        P.yaw = (hd * 180) / Math.PI;
        await KERN.until(
          () => WELT.heightAt(p[0], p[1]) !== undefined && WELT.heightAt(P.x, P.y) !== undefined,
          60
        ).catch(() => {});
        const g = WELT.heightAt(P.x, P.y);
        if (g !== undefined) P.feet = g;
        if (fz === 'gl-moped') {
          GLAUTO.mopedAt(p[0], p[1], hd);
          VEH.enter('gl-moped');
        } else if (fz) {
          VEH.place(fz, p[0], p[1], hd);
          VEH.enter(fz);
        }
        if (o.fade !== false) await GLHUD.fade(false);
        GLHUD.ort(D.PLATZ.zone, D.ORTE[o.ort] || 'Eisfeld-Süd');
        S.hinMs = Math.round(performance.now() - t0);
        return true;
      } catch (e) {
        S.err = String((e && e.message) || e);
        if (o.fade !== false) GLHUD.fade(false);
        return false;
      } finally {
        S.bedarf.delete('hin');
        S.transfer = null;
      }
    })();
    return S.transfer;
  }
  function zurueck() {
    if (S.transfer) return S.transfer;
    S.transfer = (async () => {
      try {
        await GLHUD.fade(true, 'A 73 · Richtung Suhl', 'Schleusingen');
        const [x, y, hdg] = D.A73.zurueck,
          v = VEH.cur,
          id = v ? v.id : null,
          hd = (hdg * Math.PI) / 180;
        if (v) VEH.exit();
        P.x = x - Math.sin(hd) * 3;
        P.y = y - Math.cos(hd) * 3;
        await KERN.until(() => WELT.heightAt(x, y) !== undefined, 60).catch(() => {});
        const g = WELT.heightAt(P.x, P.y);
        if (g !== undefined) P.feet = g;
        if (id) {
          VEH.place(id, x, y, hd);
          VEH.enter(id);
        }
        await GLHUD.fade(false);
        return true;
      } finally {
        S.transfer = null;
      }
    })();
    return S.transfer;
  }
  // ------------------------------------------------------------------ the interface ------------------------------------------------------------------
  function ort(name) {
    if (!S.data || !S.data.orte) return null;
    const p = S.data.orte[name];
    return p ? { x: p[0], y: p[1], z: p[2], name: D.ORTE[name] || name } : null;
  }
  function weg() {
    if (!S.lin || !S.lin.length) return [];
    const Lw = S.lin[0],
      out = [];
    for (let i = 0; i < Lw.n; i++) out.push([Lw.x[i], Lw.y[i], Lw.z[i]]);
    return out;
  }
  let afCache = null;
  function anfahrt() {
    if (!S.data || !S.data.anfahrt) return [];
    return afCache || (afCache = D.anfahrt(S.data.anfahrt, 0));
  }
  function stop() {
    S.bedarf.clear();
    S.routeOn = false;
    if (S.an) abbauen();
  }
  return Object.assign(S, {
    // loaded, built, and the ground under the player drawn (when he is in the zone)
    da: () => {
      if (!S.an || S.phase !== 'an') return false;
      const [x, y] = wo();
      return !inZone(x, y) || WELT.heightAt(x, y) !== undefined;
    },
    ort,
    weg,
    anfahrt,
    hin,
    zurueck,
    need(id, on) {
      if (on) S.bedarf.add(id);
      else S.bedarf.delete(id);
      if (on && !S.an) laden().catch(() => {});
    },
    route(on) {
      S.routeOn = !!on;
      if (on && !S.data) laden().catch(() => {});
    },
    tick,
    stop,
    linien: () => [],
    state: () => ({
      an: S.an,
      phase: S.phase,
      err: S.err,
      platten: S.platten,
      meshes: S.meshes.length,
      baeume: BA.n,
      baeumeNah: BA.nahN,
      zellenNah: BA.near.size,
      lods: S.lods.length,
      cols: S.cols.length,
      ms: S.ms,
      built: S.builtN,
      dropped: S.droppedN,
      need: [...S.bedarf],
      welt: WELT.state ? WELT.state() : null,
    }),
    debug: { bauen, abbauen, laden, want, platz, BK },
  });
})();
window.GLZONE = GLZONE;
