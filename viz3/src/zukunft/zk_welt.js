// ===================== feat/zukunft-welt: what the futures look like in the one world – PV, the solar park, mobility, water, the forest (ZKWELT) =====================
// The what-if mode (zukunft/zk_modus.js) puts a variant into the world and takes it away again. Realism first (Falko, 12.11.2026: „es muss
// möglichst realistisch werden“): true sizes, true places, the light and materials of the photo world.
// - PV on roofs: the roof planes of the 3D buildings of Ratscher (village houses world/village.js, buildings gebaeude/gebaeude.js), found by
//   joining their coplanar roof triangles; only planes facing ESE…W with 10–60° slope (flat roofs: rows at 12° to the south). Modules
//   1,72 × 1,13 m (108 half-cut cells, 440 Wp, frame 35 mm) in portrait, rows with 2 cm gaps, 40 cm from eaves, verges and ridge, 30 cm
//   around chimneys, at least six on a plane, the block centred on its row; 10 cm above the tiles. Dark glass with the sky in it, silver or
//   black frames by installation. The share of the variant fills whole buildings.
// - The solar park: tables 2 × 12 modules portrait at 22°, lower edge 0,8 m, upper edge 2,1 m, rows 6,4 m apart (3,2 m free between them),
//   steel posts rammed into the ground and following the terrain, a 2,2 m mesh fence with posts every 3 m and a gate, a compact transformer
//   station; on the open field south of the village inside the bypass (aerial photo 2024: one green field, no trees, roads or water).
// - Mobility: the Mitfahrbank (the village office's builder, amt/amt_world.js), a Rufbus plate on the pole of every real stop of Ratscher
//   (bus/bus.js stops from the timetable) and a white minibus (welt-dinge's van, dinge/dinge_modelle.js) waiting at the Anger.
// - Water: the Schleuse below the dam of the Talsperre Ratscher (its line traced from the OpenStreetMap layer of the app's map) – the flood
//   surface falls with the valley floor, lies only where the drawn terrain is lower (the depth test cuts the shore exactly) and only where it
//   is connected to the river; brown, moving water (the brook's own program, garden/stream.js), a soft band of wet mud above the line and
//   flotsam (twigs, straw) along it. Rain and drought: the weather presets and the ground colours (wetter/wx_boden.js) and the brook's level.
// - The forest at the Klinge (world/forest.js): spruces struck by the beetle after ZKDATA's curve – red-brown, then grey and thinner crowns;
//   then cleared (stumps, brush) or, left alone, fallen; young trees by kind growing with the years (natural regeneration: spruce, birch,
//   rowan; Waldumbau: beech, fir, oak, maple planted in groups, the young ones in tree guards).
// Cheap: instanced meshes in welt-dinge's material (its two programs are compiled at load), the brook's water program, the cars' soft ground
// shadows (DMOD.shMat); one new program (the mud band's soft edge) and one textured plate, compiled in warm() when the mode starts. No light,
// no shadow casting, every change undone by clear().
// INTERFACE (zukunft/zk_modus.js calls only these – keep them stable):
//   ZKWELT.warm()            once when the mode starts: compile every material / program variant (warmUp) – no new programs afterwards
//   ZKWELT.apply(world, y)   put one variant into the world, idempotent, undoing what the previous variant set. `world` is
//                            ZKDATA.calc(...).world = { pvRoof 0..1 share of suitable roofs, pvField 0|1, wp 0..1 share of houses with a heat
//                            pump unit, bank 0|1, rufbus 0|1, takt, wet 0..1, rain null|preset name, flood level in m (0 = none), dry 0..1,
//                            forest null|{ mode:'natur'|'umbau', year } }; y = the year of the slider (2026–2060)
//   ZKWELT.clear()           leaving the mode: everything back to „Heute“ (trees, meshes, weather, ground colours, the brook)
//   ZKWELT.ctx()             the world's numbers for the indicators: { roof:{kwp,area,n,src}, field:{kwp,ha,src}, bus:{werk,sa,so,min,src},
//                            nat0, forest:{ha,spruce} } – ZKDATA.calc reads them as ctx; tests also read ZKWELT.stats() and ZKWELT.spots()
// Pictures: viz3/test/zukunft_welt.py (out/zukunft_welt/: each topic before/after, on foot and from 60 m).
import * as THREE from 'three';
import { COARSE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, plain } from '../core/assets.js';
import { warmUp } from '../render/render.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { WXBODEN } from '../wetter/wx_boden.js';
import { FENCE_MAT } from '../garden/fences.js';
import { TREES, treeLeafLevels } from '../garden/trees.js';
import { ZKDATA } from './zk_data.js';

export const ZKWELT = (() => {
  const G = w => window[w];
  const ANGER = [222, -108]; // the village centre (site metres)
  const S = { warmed: false, mats: null, sig: {}, state: {}, built: {}, weatherMine: false, weatherPrev: null };
  // ---------- small helpers: site metres (x east, y north, z up) ↔ three (x, z, −y) ----------
  const T3 = (x, y, z) => new THREE.Vector3(x, z, -y);
  const ter = (x, y) => (KERN.terrain ? KERN.terrain(x, y) : 0) || 0;
  const gnd = (x, y) => (KERN.ground ? KERN.ground(x, y) : ter(x, y)) || 0;
  const hash = n => {
    let h = Math.imul(n | 0, 2654435761) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
  const hstr = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return hash(h);
  };
  function noise(x, y) {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      fx = x - xi,
      fy = y - yi,
      s = t => t * t * (3 - 2 * t),
      v = (a, b) => hash(a * 73856093 + b * 19349663 + 11),
      a = v(xi, yi),
      b = v(xi + 1, yi),
      c = v(xi, yi + 1),
      d = v(xi + 1, yi + 1);
    return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
  }
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // pure white is welt-dinge's "paint": those vertices take the instance colour (frames, crowns); never use it for anything else
  const PAINT = [1, 1, 1];
  function inPoly(P, x, y) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const xi = P[i][0],
        yi = P[i][1],
        xj = P[j][0],
        yj = P[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax,
      dy = by - ay,
      l2 = dx * dx + dy * dy || 1e-9,
      t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  }
  function polyEdgeDist(P, x, y) {
    let d = 1e9;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++)
      d = Math.min(d, segDist(x, y, P[j][0], P[j][1], P[i][0], P[i][1]));
    return d;
  }
  // ---------- a geometry builder in three's frame: flat or smooth triangles with vertex colours (3 or 4 components) ----------
  function GB(alpha) {
    const P = [],
      N = [],
      C = [];
    const n3 = new THREE.Vector3(),
      e1 = new THREE.Vector3(),
      e2 = new THREE.Vector3();
    const B = {
      // a, b, c: Vector3 (counter-clockwise seen from the front); na…: normals for smooth shading (else flat)
      tri(a, b, c, col, na, nb, nc) {
        if (!na) {
          n3.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
          na = nb = nc = n3;
        }
        for (const [p, n] of [
          [a, na],
          [b, nb],
          [c, nc],
        ]) {
          P.push(p.x, p.y, p.z);
          N.push(n.x, n.y, n.z);
          if (alpha) C.push(col[0], col[1], col[2], col.length > 3 ? col[3] : 1);
          else C.push(col[0], col[1], col[2]);
        }
      },
      quad(a, b, c, d, col) {
        B.tri(a, b, c, col);
        B.tri(a, c, d, col);
      },
      // a box of size sx, sy, sz centred at the origin, moved by matrix m; skip: bit mask of faces left out (+x −x +y −y +z −z)
      box(m, sx, sy, sz, col, skip = 0) {
        const hx = sx / 2,
          hy = sy / 2,
          hz = sz / 2,
          c = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m),
          p = [
            c(-hx, -hy, -hz),
            c(hx, -hy, -hz),
            c(hx, hy, -hz),
            c(-hx, hy, -hz),
            c(-hx, -hy, hz),
            c(hx, -hy, hz),
            c(hx, hy, hz),
            c(-hx, hy, hz),
          ];
        [
          [1, 2, 6, 5],
          [4, 7, 3, 0],
          [3, 7, 6, 2],
          [0, 1, 5, 4],
          [4, 5, 6, 7],
          [0, 3, 2, 1],
        ].forEach((f, i) => {
          if (!(skip & (1 << i))) B.quad(p[f[0]], p[f[1]], p[f[2]], p[f[3]], typeof col === 'function' ? col(i) : col);
        });
      },
      // an upright prism (n sides) from y0 to y1 around (x, z), radii r0 → r1, smooth sides; cap: top closed
      prism(x, z, y0, y1, r0, r1, n, col, cap) {
        const ring = (y, r) =>
          Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2;
            return new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
          });
        const A = ring(y0, r0),
          Bt = ring(y1, r1),
          nr = Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a), (r0 - r1) / Math.max(1e-3, y1 - y0), Math.sin(a)).normalize();
          });
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          B.tri(A[i], Bt[j], A[j], typeof col === 'function' ? col(0) : col, nr[i], nr[j], nr[j]);
          B.tri(A[i], Bt[i], Bt[j], typeof col === 'function' ? col(0) : col, nr[i], nr[i], nr[j]);
        }
        if (cap) {
          const c = new THREE.Vector3(x, y1, z),
            up = new THREE.Vector3(0, 1, 0);
          for (let i = 0; i < n; i++)
            B.tri(c, Bt[(i + 1) % n], Bt[i], typeof col === 'function' ? col(1) : col, up, up, up);
        }
      },
      // a lumpy ellipsoid (leaf mass, a mound): radii rx, ry, rz at (x, y, z), smooth normals, colour per vertex col(nx, ny, nz)
      blob(x, y, z, rx, ry, rz, col, seed = 1, rings = 4, segs = 7, lump = 0.22) {
        const V = [],
          NN = [];
        for (let i = 0; i <= rings; i++) {
          const th = (i / rings) * Math.PI,
            row = [],
            nrow = [];
          for (let k = 0; k < segs; k++) {
            const ph = (k / segs) * Math.PI * 2 + i * 0.4,
              nx = Math.sin(th) * Math.cos(ph),
              ny = Math.cos(th),
              nz = Math.sin(th) * Math.sin(ph),
              f = i === 0 || i === rings ? 1 : 1 + lump * (hash(seed * 977 + i * 31 + k * 7) - 0.5) * 2;
            row.push(new THREE.Vector3(x + nx * rx * f, y + ny * ry * f, z + nz * rz * f));
            nrow.push(new THREE.Vector3(nx / rx, ny / ry, nz / rz).normalize());
          }
          V.push(row);
          NN.push(nrow);
        }
        for (let i = 0; i < rings; i++)
          for (let k = 0; k < segs; k++) {
            const k2 = (k + 1) % segs,
              a = V[i][k],
              b = V[i][k2],
              c = V[i + 1][k2],
              d = V[i + 1][k],
              na = NN[i][k],
              nb = NN[i][k2],
              nc = NN[i + 1][k2],
              nd = NN[i + 1][k];
            B.tri(a, b, c, col(na), na, nb, nc);
            B.tri(a, c, d, col(na), na, nc, nd);
          }
      },
      empty: () => !P.length,
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(C, alpha ? 4 : 3));
        g.computeBoundingSphere();
        return g;
      },
    };
    return B;
  }
  const M4 = (x, y, z, ry = 0, rx = 0, rz = 0) =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      new THREE.Vector3(1, 1, 1)
    );
  // turn every triangle of a non-indexed geometry round (its front to the other side)
  function flipGeo(g) {
    const P = g.attributes.position,
      N = g.attributes.normal,
      C = g.attributes.color;
    for (let i = 0; i < P.count; i += 3)
      for (const A of [P, N, C]) {
        if (!A) continue;
        for (let k = 0; k < A.itemSize; k++) {
          const t = A.array[(i + 1) * A.itemSize + k];
          A.array[(i + 1) * A.itemSize + k] = A.array[(i + 2) * A.itemSize + k];
          A.array[(i + 2) * A.itemSize + k] = t;
        }
      }
    for (let i = 0; i < N.array.length; i++) N.array[i] = -N.array[i];
    return g;
  }
  // ---------- materials: welt-dinge's (its programs exist from the start), the brook's water, one soft mud band, one plate ----------
  function cloneOf(m0, o) {
    const m = m0.clone();
    m.onBeforeCompile = m0.onBeforeCompile;
    if (m0.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey)
      m.customProgramCacheKey = m0.customProgramCacheKey;
    return Object.assign(m, o);
  }
  function brookMat() {
    let b = null;
    scene.traverse(o => {
      if (b || !o.isMesh || !o.material || !o.material.customProgramCacheKey) return;
      try {
        if (o.material.customProgramCacheKey() === 'brook') b = o.material;
      } catch (e) {}
    });
    S.brook = b;
    // flood water of December 2023 in the photos: brown-grey, opaque, the grey sky faintly mirrored, moving
    if (b) {
      const m = b.clone();
      m.onBeforeCompile = (sh, r) => {
        b.onBeforeCompile(sh, r);
        S.wt = sh.uniforms.uWT;
      };
      m.customProgramCacheKey = () => 'brook';
      m.color.setRGB(...L(0.3, 0.29, 0.21));
      m.opacity = 0.93;
      m.roughness = 0.06;
      m.envMapIntensity = 1.1;
      if (m.normalScale) m.normalScale.set(0.26, 0.26);
      return m;
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(...L(0.36, 0.3, 0.21)),
      roughness: 0.2,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });
  }
  function signTex() {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 192;
    const g = cv.getContext('2d');
    g.fillStyle = '#f4f4f0';
    g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#16703a';
    g.fillRect(0, 0, 256, 54);
    g.fillStyle = '#f4f4f0';
    g.textAlign = 'center';
    g.font = 'bold 44px sans-serif';
    g.fillText('RUFBUS', 128, 44);
    g.fillStyle = '#1d2a22';
    g.font = 'bold 22px sans-serif';
    g.fillText('Fahrt anmelden', 128, 88);
    g.font = '20px sans-serif';
    g.fillText('bis 60 Min. vorher', 128, 118);
    g.fillText('per Telefon oder App', 128, 146);
    g.font = '16px sans-serif';
    g.fillText('Mo–Fr 6–20 Uhr · Sa 8–14 Uhr', 128, 176);
    g.strokeStyle = '#16703a';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 250, 186);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function mats() {
    if (S.mats) return S.mats;
    const D = G('DMOD');
    const kit = D && D.mat ? D.mat : plain({ vertexColors: true, roughness: 0.6, envMapIntensity: 0.8 });
    S.mats = {
      kit,
      // module glass: the same program, glossier (the sky in it at a flat angle)
      pv: cloneOf(kit, { roughness: 0.12, metalness: 0.05, envMapIntensity: 1.35 }),
      // bark, wood and leaves: matt
      wood: cloneOf(kit, { roughness: 0.88, envMapIntensity: 0.6 }),
      water: brookMat(),
      mud: plain({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        roughness: 0.7,
        envMapIntensity: 0.3,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -6,
      }),
      sign: plain({ map: signTex(), roughness: 0.5 }),
      shadow: D && D.shMat ? D.shMat : null,
    };
    S.mats.mud.name = 'zukunft mud';
    return S.mats;
  }
  // instanced mesh in a kit material: instance colours always (the program welt-dinge compiled at load)
  function inst(geo, mat, n, name) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    const w = new THREE.Color(1, 1, 1);
    for (let i = 0; i < Math.max(1, n); i++) im.setColorAt(i, w);
    im.count = 0;
    im.castShadow = false;
    im.receiveShadow = false;
    im.frustumCulled = false;
    im.userData.noMerge = true;
    im.name = 'zukunft:' + name;
    im.visible = false;
    scene.add(im);
    return im;
  }
  function plainMesh(geo, mat, name) {
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = false;
    me.receiveShadow = false;
    me.userData.noMerge = true;
    me.name = 'zukunft:' + name;
    me.visible = false;
    scene.add(me);
    return me;
  }
  // soft shadows on the ground (welt-dinge's quads): body width W, height H, length L at (x, y), heading az (compass), tilted to the slope
  function shadows(list, name) {
    const M = mats();
    if (!M.shadow || !list.length) return null;
    const D = G('DMOD'),
      im = new THREE.InstancedMesh(D.shGeo, M.shadow, list.length);
    const q = new THREE.Quaternion(),
      qa = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      nv = new THREE.Vector3();
    list.forEach((b, i) => {
      const r = Math.max(1, Math.min(b.W, b.L) / 2),
        zx = ter(b.x + r, b.y) - ter(b.x - r, b.y),
        zy = ter(b.x, b.y + r) - ter(b.x, b.y - r);
      nv.set(-zx / (2 * r), 1, zy / (2 * r)).normalize();
      qa.setFromUnitVectors(up, nv);
      q.setFromAxisAngle(up, (-(b.az || 0) * Math.PI) / 180).premultiply(qa);
      im.setMatrixAt(i, new THREE.Matrix4().compose(T3(b.x, b.y, b.z), q, new THREE.Vector3(b.W, b.H, b.L)));
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    im.castShadow = false;
    im.receiveShadow = false;
    im.userData.noMerge = true;
    im.renderOrder = 1;
    im.name = 'zukunft:schatten ' + name;
    im.visible = false;
    scene.add(im);
    return im;
  }
  // every program the mode needs, compiled once
  function warm() {
    if (S.warmed) return false;
    S.warmed = true;
    const M = mats(),
      g = new THREE.Group();
    const tri = GB(false);
    tri.tri(
      new THREE.Vector3(0, -300, 0),
      new THREE.Vector3(0.01, -300, 0),
      new THREE.Vector3(0, -300, 0.01),
      [0.5, 0.5, 0.5]
    );
    const tg = tri.geo(),
      ta = GB(true);
    ta.tri(
      new THREE.Vector3(0, -300, 0),
      new THREE.Vector3(0.01, -300, 0),
      new THREE.Vector3(0, -300, 0.01),
      [0.5, 0.5, 0.5, 0.5]
    );
    const tga = ta.geo(),
      pl = new THREE.PlaneGeometry(0.01, 0.01);
    pl.translate(0, -300, 0);
    const add = o => {
      o.frustumCulled = false;
      g.add(o);
      return o;
    };
    const imk = add(new THREE.InstancedMesh(tg, M.kit, 1));
    imk.setColorAt(0, new THREE.Color(1, 1, 1));
    const imp = add(new THREE.InstancedMesh(tg, M.pv, 1));
    imp.setColorAt(0, new THREE.Color(1, 1, 1));
    add(new THREE.Mesh(tg, M.kit));
    add(new THREE.Mesh(tga, M.mud));
    const wg = new THREE.PlaneGeometry(0.01, 0.01);
    wg.translate(0, -300, 0);
    add(new THREE.Mesh(wg, M.water));
    add(new THREE.Mesh(pl, M.sign));
    scene.add(g);
    warmUp(g);
    scene.remove(g);
    // the forest's far cards take instance colours only when a crown is first tinted (a program variant each): give every model's
    // cards their colours now (the same brightness as untinted) and compile what is visible, so the forest's stages compile nothing
    const F = G('FOREST');
    if (F && F.list && F.tint) {
      const seen = new Set();
      for (const t of F.list) {
        if (t.gone || !t.fi || seen.has(t.m)) continue;
        seen.add(t.m);
        F.tint(t, t.tint || null);
      }
      if (seen.size) warmUp(scene);
    }
    // the Mitfahrbank is the village office's own build (its kit and sign materials): build it once, compile it, take it away again
    try {
      const A = G('AMTWORLD');
      if (A && A.S && !A.S.items.mitfahrbank && bank(true) && A.S.items.mitfahrbank) {
        warmUp(A.S.items.mitfahrbank.g);
        bank(false);
      }
    } catch (e) {
      console.warn('zukunft warm bank', e);
    }
    for (const x of [tg, tga, pl, wg]) x.dispose();
    return true;
  }

  // =====================================================================================================================================
  // PV on the roofs
  // =====================================================================================================================================
  const MOD = { w: 1.134, h: 1.722, t: 0.035, kwp: 0.44, gap: 0.02, lift: 0.1, edge: 0.4, chim: 0.3, min: 6 };
  // one module in its own frame: x across (1,134 m), z up the slope (1,722 m), y out of the glass; centred, thickness MOD.t
  function moduleGeo(detail, part = 'all') {
    const B = GB(false),
      top = part !== 'body',
      body = part !== 'glass',
      W = MOD.w / 2,
      H = MOD.h / 2,
      T = MOD.t / 2,
      F = 0.026;
    const GL = L(0.04, 0.05, 0.078),
      GL2 = L(0.05, 0.06, 0.09),
      LINE = L(0.3, 0.32, 0.35),
      SIDE = L(0.18, 0.19, 0.2),
      BACK = L(0.74, 0.74, 0.72);
    const v = (x, z, y = T) => new THREE.Vector3(x, y, z);
    // the glass in two halves (half-cut cells) and the thin line between them; a faint lighter column every third of the width (strings)
    if (!top) {
      // (only the body)
    } else if (detail) {
      const xs = [-W + F, -W / 3 - 0.004, -W / 3 + 0.004, W / 3 - 0.004, W / 3 + 0.004, W - F];
      for (const [z0, z1] of [
        [-H + F, -0.006],
        [0.006, H - F],
      ])
        for (let i = 0; i < 5; i++)
          B.quad(v(xs[i], z0), v(xs[i + 1], z0), v(xs[i + 1], z1), v(xs[i], z1), i % 2 ? GL2 : GL);
      B.quad(v(-W + F, -0.006), v(W - F, -0.006), v(W - F, 0.006), v(-W + F, 0.006), LINE);
      // the frame on top: paint (silver or black by installation)
      B.quad(v(-W, -H), v(W, -H), v(W - F, -H + F), v(-W + F, -H + F), PAINT);
      B.quad(v(W, -H), v(W, H), v(W - F, H - F), v(W - F, -H + F), PAINT);
      B.quad(v(W, H), v(-W, H), v(-W + F, H - F), v(W - F, H - F), PAINT);
      B.quad(v(-W, H), v(-W, -H), v(-W + F, -H + F), v(-W + F, H - F), PAINT);
    } else B.quad(v(-W, -H), v(W, -H), v(W, H), v(-W, H), GL);
    // the sides (frame profile) and the white back sheet
    if (body) {
      B.quad(v(-W, -H, -T), v(W, -H, -T), v(W, -H), v(-W, -H), SIDE);
      B.quad(v(W, H, -T), v(-W, H, -T), v(-W, H), v(W, H), SIDE);
      B.quad(v(W, -H, -T), v(W, H, -T), v(W, H), v(W, -H), SIDE);
      B.quad(v(-W, H, -T), v(-W, -H, -T), v(-W, -H), v(-W, H), SIDE);
      B.quad(v(-W, H, -T), v(W, H, -T), v(W, -H, -T), v(-W, -H, -T), BACK);
    }
    // (the quads above are listed clockwise seen from outside: turn every triangle round)
    return flipGeo(B.geo());
  }
  // a module on a flat roof: at 12° to the south on a low aluminium stand with ballast (landscape: x along the row 1,722 m)
  function flatModuleGeo(part) {
    const B = GB(false),
      k = (12 * Math.PI) / 180,
      ALU = L(0.55, 0.56, 0.58),
      BAL = L(0.48, 0.47, 0.45);
    const mg = moduleGeo(true, part),
      p = mg.attributes.position,
      n = mg.attributes.normal,
      c = mg.attributes.color;
    // landscape: swap the module's axes (its long side along the row), tilt about x, lift so the low edge is 0,2 m up
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationX(-k));
    m.premultiply(new THREE.Matrix4().makeTranslation(0, 0.2 + (Math.sin(k) * MOD.w) / 2 + MOD.t, 0));
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m),
        b = new THREE.Vector3().fromBufferAttribute(p, i + 1).applyMatrix4(m),
        cc = new THREE.Vector3().fromBufferAttribute(p, i + 2).applyMatrix4(m),
        nn = new THREE.Vector3().fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      B.tri(a, b, cc, [c.getX(i), c.getY(i), c.getZ(i)], nn, nn, nn);
    }
    mg.dispose();
    if (part === 'glass') return B.geo();
    // the stand: two side profiles (triangles seen from the side) and the ballast trays
    const zf = (MOD.w / 2) * Math.cos(k),
      hi = 0.2 + Math.sin(k) * MOD.w;
    for (const x of [-0.75, 0.75]) {
      B.box(M4(x, 0.11, 0, 0, 0, 0), 0.04, 0.22, 2 * zf, ALU);
      B.box(M4(x, hi / 2 + 0.05, -zf + 0.05, 0, 0, 0), 0.04, hi, 0.04, ALU);
    }
    B.box(M4(0, 0.03, 0.15, 0, 0, 0), 1.6, 0.06, 0.4, BAL);
    return B.geo();
  }
  function roofMeshes() {
    const out = [];
    const R = G('RATSCHER');
    if (R && R.bld && R.bld[1] && R.bld[1].geometry) out.push(R.bld[1]);
    scene.traverse(o => {
      if (o.isMesh && /^gebaeude roofs/.test(o.name || '')) out.push(o);
    });
    return out;
  }
  // the village buildings by footprint (for whole buildings and the exceptions)
  function villageAt(x, y) {
    const V = G('VILLAGE');
    if (!V || !V.bld) return null;
    if (!S.vgrid) {
      S.vgrid = new Map();
      for (const b of V.bld) {
        if (!b.fac || !b.fac.length) continue;
        let x0 = 1e9,
          x1 = -1e9,
          y0 = 1e9,
          y1 = -1e9;
        for (const f of b.fac) {
          x0 = Math.min(x0, f.ax, f.bx);
          x1 = Math.max(x1, f.ax, f.bx);
          y0 = Math.min(y0, f.ay, f.by);
          y1 = Math.max(y1, f.ay, f.by);
        }
        b._zb = [x0, y0, x1, y1];
        for (let i = Math.floor(x0 / 30); i <= Math.floor(x1 / 30); i++)
          for (let j = Math.floor(y0 / 30); j <= Math.floor(y1 / 30); j++) {
            const k = i + ':' + j;
            if (!S.vgrid.has(k)) S.vgrid.set(k, []);
            S.vgrid.get(k).push(b);
          }
      }
    }
    for (const b of S.vgrid.get(Math.floor(x / 30) + ':' + Math.floor(y / 30)) || []) {
      const z = b._zb;
      if (x < z[0] - 0.6 || x > z[2] + 0.6 || y < z[1] - 0.6 || y > z[3] + 0.6) continue;
      let c = false;
      for (const f of b.fac)
        if (f.ay > y !== f.by > y && x < ((f.bx - f.ax) * (y - f.ay)) / (f.by - f.ay) + f.ax) c = !c;
      if (c) return b;
    }
    return null;
  }
  // buildings that keep their roof free: the old school with its turret (listed look), the rebuilt house with dormers (Anger 18)
  const NOPV = new Set([215]);
  function dormerIds() {
    if (S.dormIds) return S.dormIds;
    const out = new Set(),
      V = G('VILLAGE'),
      D = G('DKDATA');
    try {
      if (V && V.parts && D && D.houses)
        for (const [id, d] of Object.entries(D.houses)) {
          if (!d.dormers) continue;
          for (const [pid, p] of V.parts.entries()) if (p.of === +id && p.look === d) out.add(pid);
        }
    } catch (e) {}
    return (S.dormIds = out);
  }
  function scanRoofs() {
    if (S.roof) return S.roof;
    const t0 = performance.now();
    const planes = [];
    const A = new THREE.Vector3(),
      Bv = new THREE.Vector3(),
      Cv = new THREE.Vector3();
    const chim = new Map(); // 4 m cells → chimney boxes [x0, y0, x1, y1]
    const addChim = (x0, y0, x1, y1) => {
      for (let i = Math.floor(x0 / 4); i <= Math.floor(x1 / 4); i++)
        for (let j = Math.floor(y0 / 4); j <= Math.floor(y1 / 4); j++) {
          const k = i + ':' + j;
          if (!chim.has(k)) chim.set(k, []);
          chim.get(k).push([x0, y0, x1, y1]);
        }
    };
    const Q = v => Math.round(v * 50);
    for (const me of roofMeshes()) {
      const g = me.geometry,
        pos = g.attributes.position,
        aR = g.attributes.aR,
        idx = g.index;
      if (!pos) continue;
      me.updateMatrixWorld(true);
      const nT = idx ? idx.count / 3 : pos.count / 3,
        tris = [];
      for (let t = 0; t < nT; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3,
          i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1,
          i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        const kind = aR ? aR.getX(i0) : 0;
        A.fromBufferAttribute(pos, i0).applyMatrix4(me.matrixWorld);
        Bv.fromBufferAttribute(pos, i1).applyMatrix4(me.matrixWorld);
        Cv.fromBufferAttribute(pos, i2).applyMatrix4(me.matrixWorld);
        const a = [A.x, -A.z, A.y],
          b = [Bv.x, -Bv.z, Bv.y],
          c = [Cv.x, -Cv.z, Cv.y],
          cx = (a[0] + b[0] + c[0]) / 3,
          cy = (a[1] + b[1] + c[1]) / 3;
        if (Math.hypot(cx - ANGER[0], cy - ANGER[1]) > 650) continue;
        if (kind > 13.5 && kind < 17.5) {
          addChim(
            Math.min(a[0], b[0], c[0]),
            Math.min(a[1], b[1], c[1]),
            Math.max(a[0], b[0], c[0]),
            Math.max(a[1], b[1], c[1])
          );
          continue;
        }
        if (kind > 4.5) continue;
        const ux = b[0] - a[0],
          uy = b[1] - a[1],
          uz = b[2] - a[2],
          vx = c[0] - a[0],
          vy = c[1] - a[1],
          vz = c[2] - a[2];
        let nx = uy * vz - uz * vy,
          ny = uz * vx - ux * vz,
          nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-5) continue;
        nx /= l;
        ny /= l;
        nz /= l;
        if (nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        const col = aR
          ? Math.round(aR.getY(i0) * 40) + ',' + Math.round(aR.getZ(i0) * 40) + ',' + Math.round(aR.getW(i0) * 40)
          : '';
        tris.push({ a, b, c, n: [nx, ny, nz], area: l / 2, col });
      }
      // join the triangles of one plane: a shared corner, the same roof colour, normals within ~3°
      const par = tris.map((_, i) => i),
        find = i => {
          while (par[i] !== i) i = par[i] = par[par[i]];
          return i;
        };
      const vm = new Map();
      tris.forEach((t, i) => {
        for (const p of [t.a, t.b, t.c]) {
          const k = t.col + '#' + Q(p[0]) + ',' + Q(p[1]) + ',' + Q(p[2]);
          const L0 = vm.get(k);
          if (!L0) vm.set(k, [i]);
          else {
            for (const j of L0) {
              const o = tris[j];
              if (o.n[0] * t.n[0] + o.n[1] * t.n[1] + o.n[2] * t.n[2] > 0.9925) par[find(i)] = find(j);
            }
            L0.push(i);
          }
        }
      });
      const bk = new Map();
      tris.forEach((t, i) => {
        t.d = t.n[0] * t.a[0] + t.n[1] * t.a[1] + t.n[2] * t.a[2];
        t.bb = [
          Math.min(t.a[0], t.b[0], t.c[0]) - 0.05,
          Math.min(t.a[1], t.b[1], t.c[1]) - 0.05,
          Math.max(t.a[0], t.b[0], t.c[0]) + 0.05,
          Math.max(t.a[1], t.b[1], t.c[1]) + 0.05,
        ];
        const key = t.col + '|' + t.n.map(v => Math.round(v * 6)).join(',') + '|' + Math.round(t.d / 2);
        if (!bk.has(key)) bk.set(key, []);
        bk.get(key).push(i);
      });
      for (const L0 of bk.values())
        for (let x = 0; x < L0.length; x++)
          for (let y = x + 1; y < L0.length; y++) {
            const a = tris[L0[x]],
              b = tris[L0[y]];
            if (a.bb[0] > b.bb[2] || b.bb[0] > a.bb[2] || a.bb[1] > b.bb[3] || b.bb[1] > a.bb[3]) continue;
            if (Math.abs(a.d - b.d) > 0.15 || a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2] < 0.9925) continue;
            par[find(L0[x])] = find(L0[y]);
          }
      const groups = new Map();
      tris.forEach((t, i) => {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(t);
      });
      for (const T of groups.values()) {
        const area = T.reduce((s, t) => s + t.area, 0);
        S.roofDbg = S.roofDbg || { groups: 0, small: 0, tris: 0 };
        S.roofDbg.groups++;
        S.roofDbg.tris += T.length;
        if (area < 9) {
          S.roofDbg.small++;
          continue;
        }
        const n = [0, 0, 0];
        for (const t of T) for (let k = 0; k < 3; k++) n[k] += t.n[k] * t.area;
        const nl = Math.hypot(...n);
        planes.push({ T, area, n: n.map(v => v / nl) });
      }
    }
    // lay modules on each plane
    const mods = [],
      flats = [],
      P = [];
    for (const pl of planes) {
      const r = layPlane(pl, chim);
      if (!r) continue;
      P.push(r);
    }
    // whole buildings together: their planes ranked by a hash of the building, so a share fills whole roofs
    P.sort((a, b) => a.rank - b.rank || a.id - b.id);
    for (const p of P) {
      p.i0 = p.flat ? flats.length : mods.length;
      for (const m of p.mods) (p.flat ? flats : mods).push(m);
      p.i1 = p.flat ? flats.length : mods.length;
    }
    const kwp = P.reduce((s, p) => s + p.mods.length * MOD.kwp * p.f, 0);
    const bset = new Set(P.map(p => p.bk));
    S.roof = {
      P,
      mods,
      flats,
      kwp,
      area: (mods.length + flats.length) * MOD.w * MOD.h,
      n: bset.size,
      planes: planes.length,
      ms: Math.round(performance.now() - t0),
    };
    return S.roof;
  }
  // a plane → its modules (instance matrices), or null when it does not suit
  let PID = 0;
  // why planes were left out (tests, the feature doc)
  const why = k => {
    S.roofWhy = S.roofWhy || {};
    S.roofWhy[k] = (S.roofWhy[k] || 0) + 1;
    return null;
  };
  function layPlane(pl, chim) {
    const n = pl.n,
      flat = n[2] > 0.995;
    let f = 0.97,
      sM,
      uM;
    if (!flat) {
      const tilt = (Math.acos(Math.min(1, n[2])) * 180) / Math.PI;
      if (tilt < 10 || tilt > 60) return why('neigung');
      // downslope compass bearing: ESE (110°) … W (275°) only
      const az = ((Math.atan2(n[0], n[1]) * 180) / Math.PI + 360) % 360;
      if (az < 110 || az > 275) return why('richtung');
      const dev = Math.abs(az - 180);
      f = (1 - 0.13 * (dev / 90) ** 2) * (1 - 0.1 * ((tilt - 35) / 35) ** 2);
      const s = [-n[2] * n[0], -n[2] * n[1], 1 - n[2] * n[2]],
        sl = Math.hypot(...s);
      sM = s.map(v => v / sl);
    } else {
      // flat: rows along the longest edge's direction, facing the side nearer to south
      sM = null;
    }
    // the plane's frame: o (first vertex), u across, s up the slope
    const o = pl.T[0].a;
    let e = null;
    if (flat) {
      let best = 0;
      for (const t of pl.T)
        for (const [p, q] of [
          [t.a, t.b],
          [t.b, t.c],
          [t.c, t.a],
        ]) {
          const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (l > best) {
            best = l;
            e = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
          }
        }
      if (!e) return why('flach');
      // s: the horizontal perpendicular pointing north-ish (rows face south)
      let sx = -e[1],
        sy = e[0];
      if (sy < 0) {
        sx = -sx;
        sy = -sy;
      }
      sM = [sx, sy, 0];
      uM = [-sy, sx, 0];
      f = 0.93 * (1 - 0.13 * (Math.acos(Math.min(1, sy)) / (Math.PI / 2)) ** 2);
    } else {
      uM = [n[1] * sM[2] - n[2] * sM[1], n[2] * sM[0] - n[0] * sM[2], n[0] * sM[1] - n[1] * sM[0]];
      const ul = Math.hypot(...uM);
      uM = uM.map(v => v / ul);
    }
    const to2 = p => {
      const d = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
      return [d[0] * uM[0] + d[1] * uM[1] + d[2] * uM[2], d[0] * sM[0] + d[1] * sM[1] + d[2] * sM[2]];
    };
    const T2 = pl.T.map(t => [to2(t.a), to2(t.b), to2(t.c)]);
    let u0 = 1e9,
      u1 = -1e9,
      v0 = 1e9,
      v1 = -1e9;
    for (const t of T2)
      for (const p of t) {
        u0 = Math.min(u0, p[0]);
        u1 = Math.max(u1, p[0]);
        v0 = Math.min(v0, p[1]);
        v1 = Math.max(v1, p[1]);
      }
    const inTri = (x, y, t) => {
      const [a, b, c] = t,
        d1 = (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1]),
        d2 = (x - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (y - c[1]),
        d3 = (x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1]);
      return !((d1 < -1e-6 || d2 < -1e-6 || d3 < -1e-6) && (d1 > 1e-6 || d2 > 1e-6 || d3 > 1e-6));
    };
    const inside = (x, y) => T2.some(t => inTri(x, y, t));
    // the outline: the triangles' edges that have outside on one side (at a quarter, the middle and three quarters)
    const bnd = [],
      seenE = new Set(),
      EK = p => Math.round(p[0] * 50) + ',' + Math.round(p[1] * 50);
    for (const t of T2)
      for (let k = 0; k < 3; k++) {
        const p = t[k],
          q = t[(k + 1) % 3],
          ka = EK(p),
          kb = EK(q),
          key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        if (seenE.has(key)) continue;
        seenE.add(key);
        const dx = q[0] - p[0],
          dy = q[1] - p[1],
          l = Math.hypot(dx, dy) || 1,
          nx = (-dy / l) * 0.05,
          ny = (dx / l) * 0.05;
        const out = [0.25, 0.5, 0.75].some(f => {
          const mx = p[0] + dx * f,
            my = p[1] + dy * f;
          return !inside(mx + nx, my + ny) || !inside(mx - nx, my - ny);
        });
        if (out) bnd.push({ p, q });
      }
    const edge = flat ? 0.6 : MOD.edge;
    // a module footprint [ua, ub] × [va, vb] in the plane: inside, far enough from the outline and from chimneys
    const site = (u, v) => [o[0] + uM[0] * u + sM[0] * v, o[1] + uM[1] * u + sM[1] * v, o[2] + uM[2] * u + sM[2] * v];
    const fits = (ua, ub, va, vb) => {
      const pts = [
        [ua, va],
        [ub, va],
        [ub, vb],
        [ua, vb],
        [(ua + ub) / 2, va],
        [(ua + ub) / 2, vb],
        [ua, (va + vb) / 2],
        [ub, (va + vb) / 2],
        [(ua + ub) / 2, (va + vb) / 2],
      ];
      for (const p of pts) if (!inside(p[0], p[1])) return false;
      for (const e of bnd) {
        for (const p of pts.slice(0, 8)) if (segDist(p[0], p[1], e.p[0], e.p[1], e.q[0], e.q[1]) < edge) return false;
        // an outline corner reaching into the module (a notch)
        for (const c of [e.p, e.q])
          if (c[0] > ua - edge && c[0] < ub + edge && c[1] > va - edge && c[1] < vb + edge) return false;
      }
      // chimneys: their footprint 0,3 m around
      for (const p of [
        [ua, va],
        [ub, vb],
        [(ua + ub) / 2, (va + vb) / 2],
      ]) {
        const s = site(p[0], p[1]),
          L0 = chim.get(Math.floor(s[0] / 4) + ':' + Math.floor(s[1] / 4));
        if (!L0) continue;
        const sa = site(ua, va),
          sb = site(ub, va),
          sc = site(ub, vb),
          sd = site(ua, vb),
          x0 = Math.min(sa[0], sb[0], sc[0], sd[0]) - MOD.chim,
          x1 = Math.max(sa[0], sb[0], sc[0], sd[0]) + MOD.chim,
          y0 = Math.min(sa[1], sb[1], sc[1], sd[1]) - MOD.chim,
          y1 = Math.max(sa[1], sb[1], sc[1], sd[1]) + MOD.chim;
        for (const b of L0) if (b[2] > x0 && b[0] < x1 && b[3] > y0 && b[1] < y1) return false;
      }
      return true;
    };
    // rows: portrait on pitched roofs; on flat roofs landscape rows at 12°, 1,9 m apart
    const MW = flat ? MOD.h : MOD.w,
      MH = flat ? Math.cos((12 * Math.PI) / 180) * MOD.w : MOD.h,
      pitch = flat ? 1.9 : MOD.h + MOD.gap,
      avail = v1 - v0 - 2 * edge,
      nr = Math.floor((avail + (pitch - MH)) / pitch);
    if (nr < 1) return why('klein');
    const vStart = v0 + edge + (avail - (nr * pitch - (pitch - MH))) / 2;
    const out = [];
    for (let r = 0; r < nr; r++) {
      const va = vStart + r * pitch,
        vb = va + MH;
      // the valid starts along u, then the longest run, modules centred in it
      const st = [];
      for (let u = u0; u + MW <= u1 + 1e-6; u += 0.05) st.push(fits(u, u + MW, va, vb) ? u : null);
      let best = null,
        cur = null;
      for (const u of st) {
        if (u == null) {
          cur = null;
          continue;
        }
        if (!cur) cur = [u, u];
        else cur[1] = u;
        if (!best || cur[1] - cur[0] > best[1] - best[0]) best = cur.slice();
      }
      if (!best) continue;
      const span = best[1] - best[0] + MW,
        k = Math.floor((span + MOD.gap) / (MW + MOD.gap)),
        u00 = best[0] + (span - (k * (MW + MOD.gap) - MOD.gap)) / 2;
      for (let i = 0; i < k; i++) {
        const ua = u00 + i * (MW + MOD.gap);
        if (!fits(ua, ua + MW, va, vb)) continue;
        out.push([ua + MW / 2, (va + vb) / 2]);
      }
    }
    if (out.length < MOD.min) return why('wenig');
    // the building: the village house under the plane (whole buildings, the exceptions), else the plane's own place
    let cx = 0,
      cy = 0,
      cz = 0;
    for (const [u, v] of out) {
      const s = site(u, v);
      cx += s[0] / out.length;
      cz += s[2] / out.length;
      cy += s[1] / out.length;
    }
    const vb = villageAt(cx, cy);
    if (vb && (NOPV.has(vb.id) || dormerIds().has(vb.id))) return why('ausnahme');
    const bk = vb ? 'v' + vb.id : 'g' + Math.round(cx / 14) + ',' + Math.round(cy / 14);
    const nM = flat ? [0, 0, 1] : n;
    const ax = new THREE.Vector3(uM[0], uM[2], -uM[1]),
      ay = new THREE.Vector3(nM[0], nM[2], -nM[1]),
      az = new THREE.Vector3(sM[0], sM[2], -sM[1]);
    const mods = out.map(([u, v]) => {
      const s = site(u, v),
        off = flat ? 0.02 : MOD.lift + MOD.t / 2,
        m = new THREE.Matrix4().makeBasis(ax, ay, az);
      m.setPosition(T3(s[0] + nM[0] * off, s[1] + nM[1] * off, s[2] + nM[2] * off));
      return m;
    });
    // a frame colour per installation: older silver, newer black
    const black = hstr(bk) < 0.45;
    return { id: PID++, bk, typ: vb ? vb.typ : -1, rank: hstr(bk + '|pv'), flat, f, mods, cx, cy, cz, black, n: nM };
  }
  function roofShare(share) {
    const R = scanRoofs();
    const total = R.mods.length + R.flats.length;
    const want = Math.round(total * Math.max(0, Math.min(1, share)));
    if (!want && !S.roofMesh) return;
    if (!S.roofMesh) {
      const M = mats();
      S.roofMesh = inst(moduleGeo(!COARSE), M.pv, R.mods.length, 'pv-dach');
      S.flatMesh = inst(flatModuleGeo('glass'), M.pv, R.flats.length, 'pv-flachdach');
      S.flatBody = inst(flatModuleGeo('body'), M.kit, R.flats.length, 'pv-flachdach-gestell');
      const SIL = new THREE.Color().setRGB(...L(0.6, 0.62, 0.64)),
        BLK = new THREE.Color().setRGB(...L(0.05, 0.05, 0.055));
      for (const p of R.P) {
        const im = p.flat ? S.flatMesh : S.roofMesh;
        p.mods.forEach((m, k) => {
          im.setMatrixAt(p.i0 + k, m);
          im.setColorAt(p.i0 + k, p.black ? BLK : SIL);
          if (p.flat) S.flatBody.setMatrixAt(p.i0 + k, m);
        });
      }
      for (const im of [S.roofMesh, S.flatMesh, S.flatBody]) {
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      }
    }
    // whole planes in their order until the share is reached; pitched and flat kept apart in their buffers
    let n = 0,
      np = 0,
      nf = 0;
    for (const p of R.P) {
      if (n >= want) break;
      n += p.mods.length;
      if (p.flat) nf = p.i1;
      else np = p.i1;
    }
    S.roofMesh.count = np;
    S.flatMesh.count = nf;
    S.flatBody.count = nf;
    S.flatBody.visible = nf > 0;
    S.roofMesh.visible = np > 0;
    S.flatMesh.visible = nf > 0;
    markDirty(true);
  }

  // =====================================================================================================================================
  // The solar park on the field south of the village (inside the bypass; aerial photo 2024: one green field)
  // =====================================================================================================================================
  const PARK = {
    poly: [
      [156, -354],
      [306, -349],
      [378, -378],
      [383, -428],
      [336, -447],
      [156, -413],
    ],
    tilt: 22,
    low: 0.8,
    n: 12,
    pitch: 5.9,
    gapT: 0.6,
    inset: 6,
    station: [366, -384],
    gate: [352, -367.5],
  };
  const TABLE = (() => {
    const k = (PARK.tilt * Math.PI) / 180,
      Ls = 2 * MOD.h + MOD.gap,
      len = PARK.n * MOD.w + (PARK.n - 1) * MOD.gap;
    return { k, Ls, len, depth: Ls * Math.cos(k), rise: Ls * Math.sin(k) };
  })();
  // one table in its own frame: x east along the table, y up, z south (three's +z); origin on the ground under its middle
  function tableGeo(detail, part) {
    const B = GB(false),
      k = TABLE.k,
      D = TABLE.depth,
      STEEL = L(0.5, 0.52, 0.53),
      STEEL2 = L(0.4, 0.41, 0.42);
    const mg = moduleGeo(detail, part),
      p = mg.attributes.position,
      nA = mg.attributes.normal,
      cA = mg.attributes.color;
    // module frame: x across, z up the slope (towards north: three −z), y the normal (up and south)
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, Math.cos(k), Math.sin(k)),
      new THREE.Vector3(0, -Math.sin(k), Math.cos(k))
    );
    const nm = new THREE.Matrix3().getNormalMatrix(basis);
    const add = (m, mm) => {
      for (let i = 0; i < p.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m),
          b = new THREE.Vector3().fromBufferAttribute(p, i + 1).applyMatrix4(m),
          c = new THREE.Vector3().fromBufferAttribute(p, i + 2).applyMatrix4(m),
          nn = new THREE.Vector3().fromBufferAttribute(nA, i).applyMatrix3(mm).normalize();
        B.tri(a, b, c, [cA.getX(i), cA.getY(i), cA.getZ(i)], nn, nn, nn);
      }
    };
    // the low (south) edge at z = D/2, y = PARK.low; along the slope s from it
    const at = (x, s, lift) =>
      new THREE.Vector3(
        x,
        PARK.low + Math.sin(k) * s + Math.cos(k) * lift,
        D / 2 - Math.cos(k) * s + Math.sin(k) * lift
      );
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < PARK.n; i++) {
        const x = -TABLE.len / 2 + MOD.w / 2 + i * (MOD.w + MOD.gap),
          s = MOD.h / 2 + j * (MOD.h + MOD.gap),
          c = at(x, s, MOD.t / 2),
          m = basis.clone().setPosition(c);
        add(m, nm);
      }
    mg.dispose();
    if (part === 'glass') return B.geo();
    // purlins under the modules along the table, rafters on each support, posts into the ground (1,3 m deep, the terrain hides it)
    const rot = new THREE.Euler(k, 0, 0);
    for (const s of [0.42, 1.3, 2.15, 3.03]) {
      const c = at(0, s, -0.06);
      B.box(
        new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(1, 1, 1)),
        TABLE.len - 0.1,
        0.07,
        0.05,
        STEEL,
        0
      );
    }
    const sup = detail ? [-6.1, -3.05, 0, 3.05, 6.1] : [-5.5, 0, 5.5];
    for (const x of sup) {
      const c = at(x, TABLE.Ls / 2, -0.15);
      B.box(
        new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(1, 1, 1)),
        0.06,
        0.1,
        TABLE.Ls - 0.2,
        STEEL2,
        0
      );
      const fz = at(x, 0.55, -0.15),
        rz = at(x, TABLE.Ls - 0.55, -0.15);
      for (const q of [fz, rz]) {
        const h = q.y - 0.05 + 1.3;
        B.box(M4(x, q.y - 0.05 - h / 2, q.z), 0.1, h, 0.06, STEEL, 0b001100);
      }
      // a diagonal brace from the rear post to the front post's foot
      const a = new THREE.Vector3(x, 0.25, fz.z),
        b = new THREE.Vector3(x, rz.y - 0.35, rz.z),
        mid = a.clone().add(b).multiplyScalar(0.5),
        len = a.distanceTo(b),
        ang = Math.atan2(b.y - a.y, -(b.z - a.z));
      B.box(
        new THREE.Matrix4().compose(
          mid,
          new THREE.Quaternion().setFromEuler(new THREE.Euler(ang, 0, 0)),
          new THREE.Vector3(1, 1, 1)
        ),
        0.04,
        0.04,
        len,
        STEEL2,
        0b110000
      );
    }
    return B.geo();
  }
  // the fence: one span of 3 m (x along it, from −1,5 to 1,5): the top rail, two tension wires, two barbed wires on the arms; the
  // mesh between is the garden's chain-link (garden/fences.js FENCE_MAT.mesh, its program exists) as one ribbon round the park
  function fenceSpanGeo() {
    const B = GB(false),
      W = L(0.2, 0.27, 0.2),
      TUBE = L(0.17, 0.25, 0.17);
    B.box(M4(0, 2.08, 0), 3.0, 0.034, 0.034, TUBE, 0);
    for (const y of [0.12, 1.1]) B.box(M4(0, y, 0), 3.0, 0.006, 0.006, W, 0b110000);
    for (const [y, z] of [
      [2.2, 0.07],
      [2.3, 0.14],
    ])
      B.box(M4(0, y, z), 3.0, 0.006, 0.006, L(0.42, 0.43, 0.43), 0b110000);
    return B.geo();
  }
  function fencePostGeo() {
    const B = GB(false),
      C0 = L(0.16, 0.24, 0.16);
    B.prism(0, 0, -0.6, 2.3, 0.03, 0.03, 8, C0, true);
    // the arm for the barbed wire, outwards
    B.box(M4(0, 2.36, 0.09, 0, -0.785, 0), 0.025, 0.025, 0.28, C0, 0);
    return B.geo();
  }
  // the compact transformer station (~3,3 × 2,5 × 2,6 m, concrete, light grey) with its doors and grilles, the gate, a cable cabinet
  function stationGeo() {
    const B = GB(false),
      CON = L(0.62, 0.62, 0.6),
      ROOF = L(0.4, 0.4, 0.4),
      DOOR = L(0.27, 0.31, 0.29),
      GRILL = L(0.12, 0.13, 0.13),
      BASE = L(0.46, 0.45, 0.43),
      SIGN = L(0.85, 0.75, 0.1);
    B.box(M4(0, 0.05, 0), 3.6, 0.3, 2.8, BASE, 0);
    B.box(M4(0, 1.45, 0), 3.3, 2.5, 2.5, CON, 0);
    B.box(M4(0, 2.75, 0), 3.45, 0.12, 2.65, ROOF, 0);
    // the south side: two double doors, grilles above them, a warning sign
    for (const x of [-0.85, 0.85]) {
      B.box(M4(x, 1.2, 1.255), 1.2, 2.0, 0.02, DOOR, 0);
      B.box(M4(x, 2.4, 1.258), 1.0, 0.25, 0.02, GRILL, 0);
      B.box(M4(x, 0.45, 1.258), 1.0, 0.2, 0.02, GRILL, 0);
    }
    B.box(M4(-0.85, 1.75, 1.27), 0.2, 0.2, 0.01, SIGN, 0);
    // a cable cabinet beside it
    B.box(M4(2.4, 0.65, 0.6, 0.0), 0.9, 1.3, 0.35, L(0.55, 0.57, 0.54), 0);
    return B.geo();
  }
  function gateGeo() {
    const B = GB(false),
      T = L(0.44, 0.46, 0.45),
      W = L(0.36, 0.38, 0.37);
    // two wings of 2 m, framed tubes and mesh
    for (const s of [-1, 1]) {
      const cx = s * 1.0;
      B.box(M4(cx, 0.12, 0), 1.95, 0.04, 0.04, T, 0);
      B.box(M4(cx, 2.05, 0), 1.95, 0.04, 0.04, T, 0);
      B.box(M4(cx - 0.97, 1.08, 0), 0.04, 1.95, 0.04, T, 0);
      B.box(M4(cx + 0.97, 1.08, 0), 0.04, 1.95, 0.04, T, 0);
      for (let x = -0.85; x <= 0.86; x += 0.2) B.box(M4(cx + x, 1.08, 0), 0.008, 1.9, 0.008, W, 0b001100);
      for (const y of [0.6, 1.1, 1.6]) B.box(M4(cx, y, 0), 1.9, 0.01, 0.01, W, 0b110000);
    }
    return B.geo();
  }
  function parkLayout() {
    if (S.park) return S.park;
    const P = PARK.poly,
      T = [];
    let y0 = 1e9,
      y1 = -1e9,
      x0 = 1e9,
      x1 = -1e9;
    for (const [x, y] of P) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const ok = (x, y) => inPoly(P, x, y) && polyEdgeDist(P, x, y) >= PARK.inset;
    const hl = TABLE.len / 2,
      hd = TABLE.depth / 2;
    let row = 0;
    for (let y = y0 + PARK.inset + hd; y <= y1 - PARK.inset - hd; y += PARK.pitch, row++) {
      const fits = x => ok(x - hl, y - hd) && ok(x + hl, y - hd) && ok(x + hl, y + hd) && ok(x - hl, y + hd);
      // keep the station and the way to the gate free
      const free = x =>
        Math.hypot(x - PARK.station[0], y - PARK.station[1]) > hl + 7 &&
        Math.hypot(x - PARK.gate[0], y - PARK.gate[1]) > hl + 5;
      for (let x = x0 + hl; x <= x1 - hl;) {
        if (fits(x) && free(x)) {
          T.push({ x, y, row });
          x += TABLE.len + PARK.gapT;
        } else x += 0.5;
      }
    }
    // each table on the ground, rolled to the slope along it
    for (const t of T) {
      const za = ter(t.x - hl, t.y),
        zb = ter(t.x + hl, t.y),
        z = (za + zb) / 2,
        roll = Math.atan2(zb - za, TABLE.len);
      t.z = z;
      t.m = new THREE.Matrix4().compose(
        T3(t.x, t.y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, roll)),
        new THREE.Vector3(1, 1, 1)
      );
    }
    // the fence on the outline: spans of ≤ 3 m, the gate where the outline passes it
    const F = [],
      posts = [],
      runs = [];
    let run = [];
    const GW = 2.1; // half the gate's width
    const span = (xa, ya, xb, yb) => {
      const za = ter(xa, ya),
        zb = ter(xb, yb),
        len = Math.hypot(xb - xa, yb - ya),
        yaw = Math.atan2(yb - ya, xb - xa),
        pitch = Math.atan2(zb - za, len);
      // span frame: x along (site direction yaw), y up; three: rotate about y by yaw (site→three keeps the angle), then tilt
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, pitch, 'YXZ'));
      F.push(
        new THREE.Matrix4().compose(
          T3((xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2),
          q,
          new THREE.Vector3(len / 3, 1, 1)
        )
      );
    };
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        b = P[(i + 1) % P.length],
        Lg = Math.hypot(b[0] - a[0], b[1] - a[1]),
        pt = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      // the gate's opening on this edge (posts at both of its ends), the rest in spans of ≤ 3 m
      const tg = ((PARK.gate[0] - a[0]) * (b[0] - a[0]) + (PARK.gate[1] - a[1]) * (b[1] - a[1])) / (Lg * Lg),
        onGate = segDist(PARK.gate[0], PARK.gate[1], a[0], a[1], b[0], b[1]) < 1 && tg > 0 && tg < 1;
      const parts = onGate
        ? [
            [0, tg - GW / Lg],
            [tg + GW / Lg, 1],
          ]
        : [[0, 1]];
      parts.forEach(([u0, u1], pi) => {
        const n = Math.max(1, Math.ceil(((u1 - u0) * Lg) / 3));
        if (pi === 1) {
          // after the gate: a new run of the mesh
          if (run.length > 1) runs.push(run);
          run = [];
        }
        for (let k = 0; k < n; k++) {
          const [xa, ya] = pt(u0 + ((u1 - u0) * k) / n),
            [xb, yb] = pt(u0 + ((u1 - u0) * (k + 1)) / n);
          posts.push([xa, ya]);
          if (!run.length) run.push([xa, ya]);
          run.push([xb, yb]);
          span(xa, ya, xb, yb);
        }
        if (pi === 0 && onGate) posts.push(pt(u1));
      });
    }
    // the gate: in the edge nearest to it, turned along that edge
    let gm = null;
    {
      let best = 1e9;
      for (let i = 0; i < P.length; i++) {
        const a = P[i],
          b = P[(i + 1) % P.length],
          d = segDist(PARK.gate[0], PARK.gate[1], a[0], a[1], b[0], b[1]);
        if (d < best) {
          best = d;
          const yaw = Math.atan2(b[1] - a[1], b[0] - a[0]);
          gm = new THREE.Matrix4().compose(
            T3(PARK.gate[0], PARK.gate[1], ter(PARK.gate[0], PARK.gate[1])),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
            new THREE.Vector3(1, 1, 1)
          );
        }
      }
    }
    const area = Math.abs(
      P.reduce((s, p, i) => s + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0) / 2
    );
    if (run.length > 1) runs.push(run);
    S.park = {
      T,
      F,
      posts,
      runs,
      gm,
      area,
      ha: area / 1e4,
      kwp: T.length * 2 * PARK.n * MOD.kwp,
      rows: row,
    };
    return S.park;
  }
  function buildPark() {
    if (S.parkMeshes) return S.parkMeshes;
    const Pk = parkLayout(),
      M = mats(),
      out = [];
    const tm = inst(tableGeo(!COARSE, 'glass'), M.pv, Pk.T.length, 'pv-park'),
      tb = inst(tableGeo(!COARSE, 'body'), M.kit, Pk.T.length, 'pv-park-gestell');
    // silver frames, seen from afar as thin lines (darker than the metal itself: no glitter at a distance)
    const FR = new THREE.Color().setRGB(...L(0.3, 0.31, 0.33));
    Pk.T.forEach((t, i) => {
      tm.setMatrixAt(i, t.m);
      tm.setColorAt(i, FR);
      tb.setMatrixAt(i, t.m);
    });
    for (const im of [tm, tb]) {
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
    }
    const fm = inst(fenceSpanGeo(), M.kit, Pk.F.length, 'pv-zaun');
    Pk.F.forEach((m, i) => fm.setMatrixAt(i, m));
    fm.count = Pk.F.length;
    fm.instanceMatrix.needsUpdate = true;
    const pm = inst(fencePostGeo(), M.kit, Pk.posts.length, 'pv-pfosten');
    Pk.posts.forEach(([x, y], i) => pm.setMatrixAt(i, M4(x, ter(x, y), -y)));
    pm.count = Pk.posts.length;
    pm.instanceMatrix.needsUpdate = true;
    // the station and the gate: one merged mesh
    const [sx, sy] = PARK.station,
      sz = ter(sx, sy);
    const sg = stationGeo();
    sg.applyMatrix4(M4(sx, sz, -sy, 0.25));
    const parts = [sg];
    if (Pk.gm) {
      const gg = gateGeo();
      gg.applyMatrix4(Pk.gm);
      parts.push(gg);
    }
    const merged = mergeGeos(parts);
    const sm = plainMesh(merged, M.kit, 'pv-station');
    // the chain-link: ribbons from post to post (0,1 … 2,05 m above the ground), open at the gate
    const rib = { pos: [], uv: [], idx: [] };
    for (const run of Pk.runs) {
      let sAcc = 0;
      const b0 = rib.pos.length / 3;
      run.forEach(([x, y], k) => {
        if (k) sAcc += Math.hypot(x - run[k - 1][0], y - run[k - 1][1]);
        const z = ter(x, y);
        rib.pos.push(x, z + 0.1, -y, x, z + 2.05, -y);
        rib.uv.push(sAcc / 0.2, 0.5, sAcc / 0.2, 10.25);
        if (k) {
          const a = b0 + (k - 1) * 2;
          rib.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      });
    }
    // the service track: gravel from the gate north to the farm yard's way, draped on the field
    const wg = GB(true),
      [gx0, gy0] = PARK.gate,
      tx = 356,
      ty = -336,
      tl = Math.hypot(tx - gx0, ty - gy0),
      ux = (tx - gx0) / tl,
      uy = (ty - gy0) / tl;
    const gp = (a, b) => {
      const x = gx0 + ux * a - uy * b,
        y = gy0 + uy * a + ux * b,
        n = noise(x / 2.5, y / 2.5),
        c = mix3(L(0.44, 0.42, 0.38), L(0.56, 0.54, 0.49), n),
        edge = Math.abs(b) > 1.45 ? 0.55 : 0.95;
      return { p: new THREE.Vector3(x, ter(x, y) + 0.04, -y), c: [c[0], c[1], c[2], edge] };
    };
    for (let a = -1; a < tl; a += 1)
      for (const [b0, b1] of [
        [-1.9, -1.1],
        [-1.1, 1.1],
        [1.1, 1.9],
      ]) {
        const A = gp(a, b0),
          B = gp(a + 1, b0),
          C = gp(a + 1, b1),
          D = gp(a, b1);
        wg.tri(A.p, B.p, C.p, A.c);
        wg.tri(A.p, C.p, D.p, A.c);
        S._wtri = S._wtri || [];
        S._wtri.push([A.c, B.c, C.c, A.c, C.c, D.c]);
      }
    const wgeo = wg.geo();
    {
      const Ca = wgeo.attributes.color;
      let v = 0;
      for (const six of S._wtri) for (const c of six) Ca.setXYZW(v++, c[0], c[1], c[2], c[3]);
      S._wtri = null;
    }
    const wm = plainMesh(wgeo, mats().mud, 'pv-weg');
    wm.renderOrder = 1;
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rib.pos, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(rib.uv, 2));
    rg.setIndex(rib.idx);
    rg.computeVertexNormals();
    const rm = plainMesh(rg, FENCE_MAT.mesh, 'pv-zaungeflecht');
    rm.renderOrder = 1;
    // soft shadows: under and behind every table, the station
    const sh = shadows(
      [
        ...Pk.T.map(t => ({
          x: t.x,
          y: t.y,
          z: t.z,
          W: TABLE.len,
          H: PARK.low + TABLE.rise * 0.6,
          L: TABLE.depth,
          az: 0,
        })),
        { x: sx, y: sy, z: sz, W: 3.3, H: 2.6, L: 2.5, az: (-0.25 * 180) / Math.PI },
      ],
      'park'
    );
    S.parkMeshes = { tm, tb, fm, pm, sm, rm, wm, sh, nT: Pk.T.length };
    out.push(tm, fm, pm, sm);
    return S.parkMeshes;
  }
  function mergeGeos(list) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const P = new Float32Array(n * 3),
      N = new Float32Array(n * 3),
      C = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      P.set(g.attributes.position.array, o * 3);
      N.set(g.attributes.normal.array, o * 3);
      C.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
      g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.computeBoundingSphere();
    return g;
  }
  function fieldShare(share) {
    share = Math.max(0, Math.min(1, share || 0));
    if (!share && !S.parkMeshes) return;
    const K = buildPark(),
      Pk = parkLayout();
    // the park is built as a whole (rows from the south), the fence and the station with the first row
    const n = Math.round(Pk.T.length * share);
    K.tm.count = n;
    K.tm.visible = n > 0;
    K.tb.count = n;
    K.tb.visible = n > 0;
    for (const m of [K.fm, K.pm, K.sm, K.rm, K.wm]) m.visible = n > 0;
    if (K.sh) {
      K.sh.count = n > 0 ? Pk.T.length + 1 : 0;
      K.sh.visible = n > 0;
    }
    markDirty(true);
  }

  // =====================================================================================================================================
  // Heat pumps: an outdoor unit beside a gable wall of village houses
  // =====================================================================================================================================
  function wpGeo() {
    const B = GB(false),
      CASE = L(0.72, 0.73, 0.71),
      TOP = L(0.42, 0.43, 0.43),
      FAN = L(0.06, 0.065, 0.07),
      PAD = L(0.5, 0.49, 0.47);
    // unit 1,1 × 0,95 × 0,45 m on two feet, on a small concrete pad; the fan grille faces +z (away from the wall)
    B.box(M4(0, 0.04, 0.05), 1.3, 0.08, 0.75, PAD, 0);
    B.box(M4(-0.4, 0.13, 0.05), 0.08, 0.1, 0.5, TOP, 0);
    B.box(M4(0.4, 0.13, 0.05), 0.08, 0.1, 0.5, TOP, 0);
    B.box(M4(0, 0.655, 0.05), 1.1, 0.95, 0.45, CASE, 0);
    B.box(M4(0, 1.14, 0.05), 1.12, 0.03, 0.47, TOP, 0);
    // the round grille: a dark disc with a lighter hub
    const cz = 0.05 + 0.226,
      cy = 0.66,
      R = 0.36,
      N = 18;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2,
        a1 = ((i + 1) / N) * Math.PI * 2;
      B.tri(
        new THREE.Vector3(-0.1, cy, cz + 0.002),
        new THREE.Vector3(-0.1 + Math.cos(a0) * R, cy + Math.sin(a0) * R, cz + 0.002),
        new THREE.Vector3(-0.1 + Math.cos(a1) * R, cy + Math.sin(a1) * R, cz + 0.002),
        i % 2 ? FAN : L(0.09, 0.095, 0.1)
      );
    }
    B.box(M4(-0.1, cy, cz + 0.004), 0.08, 0.08, 0.01, L(0.3, 0.3, 0.3), 0);
    // the service panel at the right
    B.box(M4(0.4, 0.66, cz + 0.002), 0.2, 0.7, 0.004, L(0.62, 0.63, 0.61), 0);
    return B.geo();
  }
  function wpUnits() {
    if (S.wp) return S.wp;
    const V = G('VILLAGE'),
      U = [];
    const hs = (V && V.bld ? V.bld : []).filter(
      b => b.typ === 0 && b.fac && b.fac.length && Math.hypot(b.cx - ANGER[0], b.cy - ANGER[1]) < 420
    );
    hs.sort((a, b) => hash(a.id * 31 + 7) - hash(b.id * 31 + 7));
    for (const b of hs) {
      // a gable wall (the short ones), not a party wall: the spot 1,5 m out must be free of other buildings
      const walls = b.fac.filter(f => f.L > 4).sort((p, q) => p.L - q.L);
      let put = null;
      for (const f of walls.slice(0, 3)) {
        const t = 0.3 + 0.4 * hash(b.id * 13 + 1),
          mx = f.ax + (f.bx - f.ax) * t,
          my = f.ay + (f.by - f.ay) * t,
          nx = f.nx,
          ny = f.ny;
        // outward normal: away from the house's middle
        const sg = nx * (mx - b.cx) + ny * (my - b.cy) < 0 ? -1 : 1;
        const x = mx + nx * sg * 0.72,
          y = my + ny * sg * 0.72;
        const free = [0.6, 1.5, 2.4].every(d => {
          const o = villageAt(mx + nx * sg * d, my + ny * sg * d);
          return !o;
        });
        if (!free) continue;
        put = { x, y, ang: Math.atan2(ny * sg, nx * sg), id: b.id };
        break;
      }
      if (!put) continue;
      const z = gnd(put.x, put.y);
      // the unit's +z (three) points along the outward normal: three +z = site −y
      const yaw = Math.atan2(Math.cos(put.ang), -Math.sin(put.ang));
      const m = new THREE.Matrix4().compose(
        T3(put.x, put.y, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
        new THREE.Vector3(1, 1, 1)
      );
      U.push({ m, id: b.id, x: put.x, y: put.y, z });
      if (U.length >= 90) break;
    }
    S.wp = U;
    return U;
  }
  function wpCount(n) {
    const U = wpUnits();
    const k = Math.min(U.length, Math.max(0, Math.round(n)));
    if (!k && !S.wpMesh) return;
    if (!S.wpMesh) {
      S.wpMesh = inst(wpGeo(), mats().kit, U.length, 'waermepumpen');
      U.forEach((x, i) => S.wpMesh.setMatrixAt(i, x.m));
      S.wpMesh.instanceMatrix.needsUpdate = true;
    }
    S.wpMesh.count = k;
    S.wpMesh.visible = k > 0;
    markDirty(true);
  }

  // =====================================================================================================================================
  // Mobility: the Mitfahrbank (the village office's builder), Rufbus plates at the real stops, the minibus at the Anger
  // =====================================================================================================================================
  function bank(on) {
    const A = G('AMTWORLD');
    if (!A || !A.S) return false;
    if (on) {
      if (A.S.items.mitfahrbank) return true;
      try {
        A.refresh({ built: { mitfahrbank: 0 } }, 1e9);
      } catch (e) {
        console.warn('zukunft bank', e);
      }
      S.bankMine = !!A.S.items.mitfahrbank;
      return S.bankMine;
    }
    if (S.bankMine && A.S.items.mitfahrbank) {
      scene.remove(A.S.items.mitfahrbank.g);
      delete A.S.items.mitfahrbank;
    }
    S.bankMine = false;
    return true;
  }
  // the stops of Ratscher from the timetable (bus/bus.js): where their signs stand
  function ratscherStops() {
    const B = G('BUS');
    let L0 = [];
    try {
      L0 = B && B.STOPS ? B.STOPS() : [];
    } catch (e) {}
    return L0.filter(
      e => /^Ratscher\b.*Schulbus/.test(e.name || '') && Math.hypot(e.x - ANGER[0], e.y - ANGER[1]) < 900
    );
  }
  function rufbusBuild() {
    const st = ratscherStops();
    if (!st.length && !S.vanMesh) return null;
    const M = mats(),
      D = G('DMOD');
    // the plates: on the pole of each stop sign (1,85 m, both faces), at the shelter on a post of their own
    const pos = [],
      uv = [],
      nrm = [],
      kitB = GB(false);
    const W = 0.42,
      H = 0.315;
    for (const e of st) {
      const az = e.shelter ? e.az : (e.az + 180) % 360,
        a = ((90 - az) * Math.PI) / 180,
        fx = Math.cos(a),
        fy = Math.sin(a),
        rx = fy,
        ry = -fx;
      let x = e.x,
        y = e.y;
      if (e.shelter) {
        // beside the shelter, along the kerb: a post of its own
        x += rx * 2.2;
        y += ry * 2.2;
        const z = gnd(x, y);
        kitB.prism(x, -y, z, z + 2.2, 0.03, 0.03, 8, L(0.55, 0.56, 0.57), true);
      }
      const z = gnd(x, y) + 1.85;
      // the plate's body: an aluminium board around the pole, the printed faces on both sides (readable from each side)
      kitB.box(M4(x, z, -y, Math.atan2(fy, fx) - Math.PI / 2), W + 0.02, H + 0.02, 0.086, L(0.6, 0.61, 0.62), 0);
      for (const s of [1, -1]) {
        const ox = x + fx * 0.0445 * s,
          oy = y + fy * 0.0445 * s,
          c = (u, v) => [ox - rx * u * s, oy - ry * u * s, z + v];
        const q = [c(-W / 2, -H / 2), c(W / 2, -H / 2), c(W / 2, H / 2), c(-W / 2, H / 2)],
          tq = [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ];
        for (const k of [0, 1, 2, 0, 2, 3]) {
          pos.push(q[k][0], q[k][2], -q[k][1]);
          uv.push(tq[k][0], tq[k][1]);
          nrm.push(fx * s, 0, -fy * s);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.computeBoundingSphere();
    const plates = plainMesh(g, M.sign, 'rufbus-schilder'),
      posts = kitB.empty() ? null : plainMesh(kitB.geo(), M.kit, 'rufbus-pfosten');
    // the minibus: welt-dinge's van, white, waiting in the bay of the Anger stop (behind the school bus's place)
    let van = null,
      vsh = null,
      win = null,
      vp = null;
    if (D && D.car) {
      const BP = G('BUS') && BUS.plan,
        stn = BP && BP.S && BP.S.stations ? BP.S.stations.find(s => /Schulbushaltestelle/.test(s.n)) : null,
        p = stn && stn.pl && stn.pl[0];
      const e = st.find(q => q.shelter) || st[0];
      const hd = e ? e.az : 289,
        hx = Math.sin((hd * Math.PI) / 180),
        hy = Math.cos((hd * Math.PI) / 180);
      const bx = (p ? p.x : 247.7) - hx * 9,
        by = (p ? p.y : -103.9) - hy * 9,
        bz = gnd(bx, by);
      van = inst(D.car('van'), D.mat, 1, 'rufbus');
      const m = new THREE.Matrix4().compose(
        T3(bx, by, bz),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-hd * Math.PI) / 180),
        new THREE.Vector3(1, 1, 1)
      );
      van.setMatrixAt(0, m);
      van.setColorAt(0, new THREE.Color().setRGB(...L(0.9, 0.91, 0.9)));
      van.instanceColor.needsUpdate = true;
      van.instanceMatrix.needsUpdate = true;
      van.count = 1;
      const T0 = D.CARS && D.CARS.van ? D.CARS.van : { W: 2, H: 2.3, L: 5.3 };
      vsh = shadows([{ x: bx, y: by, z: bz, W: T0.W, H: T0.H, L: T0.L, az: hd }], 'rufbus');
      vp = [bx, by, hd];
      // a minibus, not a delivery van: tinted side windows along the passenger box, a green band (the plate's colour), in the van's frame
      // (three: x right, y up, −z forward)
      const B = GB(false),
        GLW = L(0.06, 0.07, 0.08),
        GRN = L(0.05, 0.36, 0.17),
        hw = T0.W / 2 + 0.006;
      for (const sx of [-1, 1]) {
        for (const [z0, z1] of [
          [-0.55, 0.45],
          [0.6, 1.55],
          [1.7, 2.35],
        ])
          B.box(M4(sx * hw, 1.5, (z0 + z1) / 2), 0.01, 0.58, z1 - z0, GLW, 0);
        B.box(M4(sx * hw, 0.82, 0.35), 0.01, 0.14, 4.2, GRN, 0);
      }
      win = plainMesh(B.geo(), M.kit, 'rufbus-fenster');
      win.matrixAutoUpdate = false;
      win.matrix.copy(m);
    }
    return { plates, posts, van, vsh, win, n: st.length, vp };
  }
  // when the Rufbus runs (one offer, daily): evenings after the last bus (21:10 from Schleusingen) until midnight, Saturday afternoons,
  // Sundays from 8 o'clock (Annahme, as zk_data.js describes it)
  function rufbusRuns() {
    try {
      const t = (CLOCK && CLOCK.t) || 0,
        e = (DN && Number.isFinite(DN.e0) ? DN.e0 : 20605) + Math.floor(t / 1440),
        wd = new Date(e * 864e5).getUTCDay(),
        h = (t % 1440) / 60;
      if (wd === 0) return h >= 8;
      if (wd === 6) return h >= 13;
      return h >= 20.75;
    } catch (e) {
      return true;
    }
  }
  function rufbus(on) {
    if (on && !S.ruf) S.ruf = rufbusBuild();
    const R = S.ruf;
    if (!R) return;
    S.rufOn = !!on;
    for (const m of [R.plates, R.posts]) if (m) m.visible = !!on;
    const v = !!on && rufbusRuns();
    for (const m of [R.van, R.vsh, R.win]) if (m) m.visible = v;
    markDirty(true);
  }
  // the minibus follows the clock while the variant is shown
  let rufT = 0;
  KERN.tick(dt => {
    if (!S.rufOn || !S.ruf || (rufT += dt) < 5) return;
    rufT = 0;
    const v = rufbusRuns();
    if (S.ruf.van && S.ruf.van.visible !== v) rufbus(true);
  }, 'zukunft-welt/rufbus');

  // =====================================================================================================================================
  // Water: the Schleuse below the Talsperre Ratscher – the flood, mud and flotsam; the brook's level; rain and drought
  // =====================================================================================================================================
  // the river's line from the dam's outlet downstream to the bend west of the valley (site metres, every 12 m; traced from the
  // OpenStreetMap layer of the app's own map image, map_inner.jpg)
  const RIVER = [
    [825.1, -798.9],
    [818.8, -788.7],
    [812.6, -778.4],
    [806.5, -768.1],
    [800.5, -757.7],
    [794.6, -747.2],
    [789, -736.6],
    [783.8, -725.9],
    [779, -714.9],
    [774.5, -703.7],
    [770.1, -692.6],
    [765.9, -681.3],
    [761.7, -670.1],
    [757.5, -658.9],
    [753.3, -647.6],
    [749.1, -636.4],
    [745, -625.1],
    [740.8, -613.8],
    [736.6, -602.6],
    [732.1, -591.5],
    [727.6, -580.4],
    [723.1, -569.2],
    [718.7, -558.1],
    [714.5, -546.9],
    [710.2, -535.6],
    [706.1, -524.3],
    [702.2, -513],
    [698.4, -501.6],
    [695.1, -490.1],
    [692.4, -478.5],
    [691.4, -466.9],
    [692.8, -455.5],
    [696.4, -444.2],
    [701, -433.2],
    [705.9, -422.3],
    [710.4, -411.3],
    [713.5, -400.1],
    [714.1, -388.8],
    [711.5, -377.8],
    [705.9, -368.1],
    [697.9, -359.9],
    [688.3, -352.9],
    [678.2, -346.4],
    [667.9, -340.3],
    [657.5, -334.4],
    [647, -328.6],
    [636.4, -322.8],
    [625.9, -317.1],
    [615.5, -311.2],
    [605.3, -304.9],
    [595.4, -298.1],
    [585.8, -291],
    [576.6, -283.3],
    [568.2, -274.9],
    [560.8, -265.6],
    [554.6, -255.5],
    [549.1, -244.8],
    [544.3, -233.9],
    [539.5, -222.9],
    [533.9, -212.4],
    [527, -203],
    [518.4, -195.5],
    [508.1, -190.7],
    [496.7, -187.6],
    [485.1, -185],
    [473.6, -181.9],
    [462.5, -177.6],
    [452, -172.1],
    [442.6, -165.1],
    [434.6, -156.6],
    [428.4, -146.7],
    [423.6, -135.9],
    [419.2, -124.8],
    [414.1, -114.1],
    [407.7, -104.2],
    [399.8, -95.4],
    [390.6, -88.3],
    [380.3, -82.5],
    [369.7, -76.9],
    [359.5, -70.8],
    [349.5, -64.2],
    [339.4, -57.7],
    [329, -51.9],
    [318.2, -46.9],
    [307.2, -42.1],
    [296.3, -37.2],
    [285.3, -32.3],
    [274.2, -27.9],
    [262.9, -24],
    [251.6, -20],
    [240.6, -15.3],
    [230.3, -9.4],
    [220.7, -2.4],
    [211.8, 5.6],
    [203.4, 14.1],
    [195.6, 23.2],
    [187.9, 32.3],
    [179.8, 41.2],
    [171.4, 49.7],
    [162.5, 57.7],
    [153.3, 65.4],
    [143.9, 72.9],
    [134.5, 80.3],
    [124.9, 87.5],
    [115.3, 94.7],
    [105.7, 102],
    [96.3, 109.4],
    [86.9, 116.9],
    [77.6, 124.5],
    [68.3, 132],
    [59, 139.6],
    [49.6, 147],
    [40.1, 154.4],
    [30.6, 161.8],
    [21.2, 169.2],
    [11.8, 176.6],
    [2.3, 184],
    [-7.2, 191.3],
    [-16.8, 198.4],
    [-26.7, 205.2],
    [-37, 211.2],
    [-47.8, 216.4],
    [-58.9, 221],
    [-70, 225.4],
    [-81.1, 230],
    [-92, 234.9],
    [-102.8, 240.2],
    [-113.4, 245.8],
    [-123.9, 251.6],
    [-134.3, 257.5],
    [-144.7, 263.5],
    [-154.8, 269.9],
    [-164.7, 276.7],
    [-174.3, 283.8],
    [-183.7, 291.3],
    [-192.8, 299.1],
    [-201.7, 307.2],
    [-210.4, 315.5],
    [-218.9, 323.9],
    [-227.5, 332.3],
    [-236.4, 340.3],
    [-245.8, 347.6],
    [-255.8, 354.2],
    [-266, 360.4],
    [-276.2, 366.8],
    [-285.7, 373.8],
    [-294.6, 381.8],
    [-303.1, 390.2],
    [-311.7, 398.3],
    [-321.3, 405.1],
    [-331.8, 410.7],
    [-342.7, 415.6],
    [-353.8, 420.2],
  ];
  // the valley floor along the river (lowest drawn terrain across it), falling downstream; arc length s
  function riverBed() {
    if (S.bed) return S.bed;
    const n = RIVER.length,
      s = new Float32Array(n),
      bed = new Float32Array(n),
      nx = new Float32Array(n),
      ny = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = RIVER[Math.max(0, i - 1)],
        b = RIVER[Math.min(n - 1, i + 1)],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / l;
      ny[i] = dx / l;
      if (i) s[i] = s[i - 1] + Math.hypot(RIVER[i][0] - RIVER[i - 1][0], RIVER[i][1] - RIVER[i - 1][1]);
      let m = 1e9;
      for (let t = -24; t <= 24; t += 2) m = Math.min(m, ter(RIVER[i][0] + nx[i] * t, RIVER[i][1] + ny[i] * t));
      bed[i] = m;
    }
    // smooth, then never rising downstream
    const sm = bed.map((_, i) => {
      let a = 0,
        k = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
        a += bed[j];
        k++;
      }
      return a / k;
    });
    for (let i = 1; i < n; i++) sm[i] = Math.min(sm[i], sm[i - 1]);
    S.bed = { s, bed: sm, nx, ny, len: s[n - 1] };
    return S.bed;
  }
  // nearest point of the river line: { s, d (signed, left +), i }
  function riverAt(x, y) {
    let best = null;
    for (let i = 0; i + 1 < RIVER.length; i++) {
      const a = RIVER[i],
        b = RIVER[i + 1];
      if (x < Math.min(a[0], b[0]) - 160 || x > Math.max(a[0], b[0]) + 160) continue;
      if (y < Math.min(a[1], b[1]) - 160 || y > Math.max(a[1], b[1]) + 160) continue;
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        l2 = dx * dx + dy * dy,
        t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)),
        px = a[0] + dx * t,
        py = a[1] + dy * t,
        d = Math.hypot(x - px, y - py);
      if (!best || d < best.d) best = { d, i, t, sg: dx * (y - a[1]) - dy * (x - a[0]) > 0 ? 1 : -1 };
    }
    if (!best) return null;
    const Bd = riverBed(),
      s = Bd.s[best.i] + (Bd.s[best.i + 1] - Bd.s[best.i]) * best.t,
      z = Bd.bed[best.i] + (Bd.bed[best.i + 1] - Bd.bed[best.i]) * best.t;
    return { s, d: best.d * best.sg, ad: best.d, z };
  }
  // The official flood area of the Schleuse at Ratscher (Überschwemmungsgebiet, HQ100; Geoproxy Thüringen WMS „UESG“, © GDI-Th /
  // TLUBN, dl-de/by-2-0, fetched 12.11.2026): a mask of 4 m cells on site metres, rows south to north, run lengths (base 36) from „dry“.
  // It covers the meadows from the dam down and most of the village – the extent of „Schwerer als 2023“.
  const USG = {
    x0: -420,
    y0: -900,
    c: 4.0,
    nx: 342,
    ny: 345,
    rle: '76,9,m,1h;75,b,m,1g;75,c,n,1e;75,e,m,1d;75,f,n,1b;74,i,m,1a;74,j,n,18;74,l,m,17;74,m,n,15;74,n,n,14;74,p,n,12;74,r,m,11;73,t,n,z;73,u,n,y;73,w,n,w;73,x,o,u;73,z,n,t;72,11,o,r;72,13,n,q;72,14,1,4,1,2,f,p;71,1e,g,n;71,1f,h,l;71,1h,g,k;70,1k,g,i;70,1n,e,h;70,1p,e,f;6z,1p,g,e;6z,1q,h,c;6p,5,4,1t,h,a;6p,6,3,1q,2,2,h,9;6p,6,2,1r,3,2,i,7;6o,7,2,1r,4,3,h,6;6o,7,1,1t,5,2,h,5;6m,9,1,1u,5,3,h,3;6l,27,4,3,i,1;6k,29,5,2,i;6k,2b,4,4,f;6l,2b,3,5,e;6n,2j,c;6o,2f,2,1,c;6p,2f,e;6p,2e,f;6q,2e,e;6q,2f,d;6q,2g,c;6p,2j,a;6l,2o,9;6l,2q,7;6k,2s,6;6j,2v,4;6j,2w,3;6i,2z,1;6i,2z,1;6i,30;6i,30;6i,30;6i,2z,1;6h,30,1;6h,2z,2;6g,2z,3;6h,2x,4;6g,2x,5;6f,2y,5;6f,2x,6;6f,2w,7;6f,2v,8;6f,2v,8;6f,2u,9;6g,2s,a;6g,2r,b;6f,2r,c;6f,2r,c;6e,2r,d;6e,2q,e;6d,2p,g;6c,2q,g;6a,2q,i;6a,2p,j;69,2q,j;66,2s,k;63,2v,k;62,2w,k;62,2v,l;62,2u,m;61,2u,n;61,2t,o;61,6,2,2k,p;63,1,5,2k,p;62,1,6,2j,q;68,2j,r;62,1,5,2i,s;61,2,5,2h,t;61,2,5,2g,u;61,1,6,2f,v;68,2e,w;5a,1,x,2d,x;5a,3,n,1,6,2d,y;5c,2,l,1,7,2c,z;5d,2,d,1,6,1,7,2b,10;5f,2,a,1,f,2a,11;5g,2,8,1,8,1,7,29,12;5i,2,5,1,8,1,8,28,13;5j,3,2,2,8,1,8,27,14;5k,4,j,26,15;5x,3,7,24,17;5x,3,7,24,17;67,22,19;5w,1,a,21,1a;67,20,1b;67,1z,1c;5v,2,a,1y,1d;5s,5,a,1y,1d;5s,5,a,1x,1e;5u,3,9,1x,1f;5t,4,7,1,1,1w,1g;5t,4,6,1y,1h;5t,3,6,1z,1h;5t,3,6,1z,1h;5u,3,6,1x,1i;5v,3,5,1x,1i;5v,3,5,1w,1j;5w,3,3,1x,1j;5w,4,2,1x,1j;5x,22,1j;5x,21,1k;5y,20,1k;5y,20,1k;5y,20,1k;5z,1z,1k;5y,20,1k;5y,1z,1l;5x,20,1l;5x,20,1l;5w,21,1l;5w,20,1m;5v,21,1m;5v,21,1m;5u,22,1m;5t,23,1m;5s,22,1o;5r,22,1p;5r,21,1q;5r,1u,1,5,1r;5r,1s,1z;5r,1r,20;5q,1q,22;5q,1p,23;5p,1q,23;5m,2,1,1p,24;5d,3,5,1t,24;5c,4,4,1,1,1r,25;5c,4,6,1r,25;5c,7,4,1q,25;5b,8,4,1p,26;4v,1,f,4,1,2,5,1p,26;4s,5,c,8,6,1o,27;4q,7,9,b,6,1o,27;4n,a,6,e,6,1o,27;4m,v,6,1n,28;4j,z,5,1m,29;4h,12,4,1l,2a;4g,2k,2i;4f,2j,2k;4f,2h,2m;4d,2i,2n;4d,2h,2o;4d,2h,2o;4d,2h,2o;4d,2i,2n;4d,2j,2m;4b,2l,2m;4a,2n,2l;49,2o,2l;48,2p,2l;46,2p,2n;45,2o,2p;44,2m,2s;40,2o,2u;40,2m,2w;40,2k,2y;3z,2j,30;3y,28,3c;3x,28,3d;3w,27,3f;3v,26,3h;3u,27,3h;3t,27,3i;3s,27,3j;3s,26,3k;3s,26,3k;3n,2a,3l;3a,3,9,2b,3l;39,6,5,2d,3l;38,7,1,1,1,2e,3m;38,2o,3m;38,2n,3n;38,2n,3n;38,2n,3n;38,2m,3o;38,2l,3p;38,2k,3q;38,2j,3r;39,2h,3s;38,2h,3t;38,2g,3u;38,2f,3v;37,2e,3x;33,2g,3z;32,2g,40;31,2g,41;2z,1g,1,10,42;2y,1g,3,y,43;2x,1h,3,w,45;2x,1h,4,t,47;2w,n,1,u,5,q,49;2v,n,2,u,5,o,4b;2u,o,2,w,4,k,4e;2u,o,2,w,4,h,4h;2t,1n,5,e,4j;2k,1w,4,c,4m;1w,2,2,2g,2,c,4o;1c,3,1,3a,4s;s,3v,4v;8,4c,4y;0,4j,4z;0,4i,50;0,4h,51;0,4g,52;0,4g,52;0,4g,52;0,4g,52;0,4f,53;0,4d,55;0,4c,56;0,4b,57;0,4a,58;0,49,59;0,48,5a;0,46,5c;0,45,5d;0,44,5e;0,44,5e;0,42,5g;0,41,5h;0,40,5i;0,3y,5k;0,3x,5l;0,3w,5m;0,3u,5o;0,3t,5p;0,3r,5r;0,3q,5s;0,3o,5u;0,3n,5v;0,3m,5w;0,3k,5y;0,3j,5z;0,3i,60;0,3h,61;0,3f,63;0,3e,64;0,3d,65;0,3c,66;0,3b,67;0,3a,68;0,39,69;0,37,6b;0,37,6b;0,35,6d;0,34,6e;0,33,6f;0,32,6g;0,30,6i;0,2z,6j;0,2y,6k;0,2x,6l;0,2w,6m;0,2u,6o;0,2s,6q;0,2q,6s;0,2n,6v;0,2l,6x;0,2k,6y;0,2j,6z;0,2h,71;0,2g,72;0,2f,73;0,2d,75;0,2c,76;0,2a,78;0,29,79;0,28,7a;0,26,7c;0,25,7d;0,23,7f;0,22,7g;0,20,7i;0,1z,7j;0,1x,7l;0,1w,7m;0,1u,7o;0,1t,7p;0,1r,7r;0,1q,7s;0,1o,7u;0,1n,7v;0,1l,7x;0,1k,7y;0,1i,80;0,1h,81;0,1f,83;0,1e,84;0,1c,86;0,1b,87;0,1a,88;0,18,8a;0,16,8c;0,14,8e;0,13,8f;0,12,8g;0,10,8i;0,z,8j;0,y,8k;0,x,8l;0,x,8l;0,v,8n;0,u,8o;0,s,8q;0,q,8s;0,o,8u;0,l,8x;0,j,8z;0,g,92;0,e,94;0,a,98;0,8,9a;0,5,9d;0,2,9g;9i;9i;9i;9i;9i;9i;9i',
  };
  function usgMask() {
    if (S.usg) return S.usg;
    const M = new Uint8Array(USG.nx * USG.ny);
    USG.rle.split(';').forEach((row, j) => {
      let i = 0,
        v = 0;
      for (const r of row.split(',')) {
        const n = parseInt(r, 36);
        if (v) M.fill(1, j * USG.nx + i, j * USG.nx + i + n);
        i += n;
        v ^= 1;
      }
    });
    return (S.usg = M);
  }
  const usgAt = (x, y) => {
    const i = Math.floor((x - USG.x0) / USG.c),
      j = Math.floor((y - USG.y0) / USG.c);
    return i >= 0 && j >= 0 && i < USG.nx && j < USG.ny ? usgMask()[j * USG.nx + i] : 0;
  };
  // How deep the water stands over the valley floor of the 10 m terrain: that terrain smooths the Schleuse's bed away, and the village
  // lies on the same flat floor only 0–1,5 m above it – a fixed depth would put the whole village under water. So the depth is chosen
  // so that as many houses stand in the water as the variant assumes (zukunft/zk_data.js: „Wie im Dezember 2023“, gauge 0,9 m above
  // the bed – two houses with wet cellars, the river mostly in the meadows; „Schwerer als 2023“, HQ100 at 1,8 m – nine houses):
  // houses(level) ≈ 9 · ((level − 0,6) / 1,2)^1,5 (Annahme, between those two). The extent is an Annahme, not the state's flood map.
  const floodHouses = lvl => Math.max(0, Math.round(9 * Math.pow(Math.max(0, lvl - 0.6) / 1.2, 1.5)));
  // the grid over the river's corridor, once: the valley floor under each point (W0), the terrain (Z), along (Sv) and across (Dv)
  function floodGrid() {
    if (S.fgrid) return S.fgrid;
    const CELL = COARSE ? 4 : 3,
      R = 150;
    let x0 = 1e9,
      x1 = -1e9,
      y0 = 1e9,
      y1 = -1e9;
    for (const [x, y] of RIVER) {
      x0 = Math.min(x0, x - R);
      x1 = Math.max(x1, x + R);
      y0 = Math.min(y0, y - R);
      y1 = Math.max(y1, y + R);
    }
    const NX = Math.ceil((x1 - x0) / CELL) + 1,
      NY = Math.ceil((y1 - y0) / CELL) + 1;
    const W0 = new Float32Array(NX * NY).fill(NaN),
      Z = new Float32Array(NX * NY),
      Sv = new Float32Array(NX * NY),
      Dv = new Float32Array(NX * NY);
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const x = x0 + i * CELL,
          y = y0 + j * CELL,
          r = riverAt(x, y);
        if (!r || r.ad > R) continue;
        // the modelled square around the garden has its own flat ground (0 m): no water there, except in the river's own line
        if (Math.abs(x) < 122 && Math.abs(y) < 122 && r.ad > 6) continue;
        const k = j * NX + i;
        W0[k] = r.z;
        Z[k] = ter(x, y);
        Sv[k] = r.s;
        Dv[k] = r.d;
      }
    // the village's houses on the grid (their middle): to count those standing in the water
    const V = G('VILLAGE'),
      houses = [];
    for (const b of V && V.bld ? V.bld : []) {
      if (b.typ !== 0) continue;
      const i = Math.round((b.cx - x0) / CELL),
        j = Math.round((b.cy - y0) / CELL);
      if (i < 1 || j < 1 || i >= NX - 1 || j >= NY - 1) continue;
      houses.push({ k: j * NX + i, cell: Math.min(j, NY - 2) * (NX - 1) + Math.min(i, NX - 2), z: ter(b.cx, b.cy) });
    }
    S.fgrid = { CELL, x0, y0, NX, NY, W0, Z, Sv, Dv, houses };
    return S.fgrid;
  }
  // the cells under water at depth d, connected to the river (flood fill from the cells on its line)
  function floodFill(FG, d, maxD = 1e9) {
    const { NX, NY, W0, Z, Dv, CELL } = FG,
      CX = NX - 1,
      CY = NY - 1,
      wet = new Uint8Array(CX * CY),
      seen = new Uint8Array(CX * CY);
    const corner = (i, j) => [j * NX + i, j * NX + i + 1, (j + 1) * NX + i + 1, (j + 1) * NX + i];
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        const c = corner(i, j);
        if (c.some(k => Number.isNaN(W0[k]))) continue;
        if (Math.abs(Dv[c[0]]) > maxD) continue;
        if (c.some(k => Z[k] < W0[k] + d)) wet[j * CX + i] = 1;
      }
    const queue = [];
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        const k = j * CX + i;
        if (wet[k] && Math.abs(Dv[j * NX + i]) < CELL * 1.5) {
          seen[k] = 1;
          queue.push(k);
        }
      }
    while (queue.length) {
      const k = queue.pop(),
        i = k % CX,
        j = (k / CX) | 0;
      for (const [a, b] of [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ]) {
        if (a < 0 || b < 0 || a >= CX || b >= CY) continue;
        const q = b * CX + a;
        if (!seen[q] && wet[q]) {
          seen[q] = 1;
          queue.push(q);
        }
      }
    }
    return seen;
  }
  function floodBuild(level) {
    const FG = floodGrid(),
      { CELL, x0, y0, NX, NY, W0, Z, Sv, Dv } = FG,
      CX = NX - 1,
      CY = NY - 1,
      want = floodHouses(level);
    const wetHouses = (seen, d) => FG.houses.filter(h => seen[h.cell] && h.z < W0[h.k] + d).length;
    const inUsg = new Uint8Array(NX * NY);
    for (let k = 0; k < inUsg.length; k++) inUsg[k] = usgAt(x0 + (k % NX) * CELL, y0 + ((k / NX) | 0) * CELL);
    let seen = null,
      nh = 0,
      depth = 0,
      maxD = 0;
    const W = new Float32Array(NX * NY);
    const big = level >= 1.4;
    if (big) {
      // „Schwerer als 2023“ (HQ100): the official flood area. Its water level along the valley from the heights where the area ends
      // (the lower quarter of them: the shore lies where the terrain meets the water, inside the area's line), falling downstream
      const Bd = riverBed(),
        nS = RIVER.length,
        bucket = Array.from({ length: nS }, () => []);
      for (let j = 1; j < NY - 1; j++)
        for (let i = 1; i < NX - 1; i++) {
          const k = j * NX + i;
          if (!inUsg[k] || Number.isNaN(W0[k])) continue;
          if (inUsg[k - 1] && inUsg[k + 1] && inUsg[k - NX] && inUsg[k + NX]) continue;
          let st = 0;
          while (st + 1 < nS && Bd.s[st + 1] < Sv[k]) st++;
          bucket[st].push(Z[k]);
        }
      const Wst = new Float32Array(nS);
      for (let i = 0; i < nS; i++) {
        const v = [];
        for (let q = Math.max(0, i - 3); q <= Math.min(nS - 1, i + 3); q++) v.push(...bucket[q]);
        v.sort((a, b) => a - b);
        Wst[i] = v.length >= 4 ? v[Math.floor(v.length * 0.25)] : Bd.bed[i] + 0.6;
        Wst[i] = Math.max(Wst[i], Bd.bed[i] + 0.3);
      }
      for (let i = 1; i < nS; i++) Wst[i] = Math.min(Wst[i], Wst[i - 1]);
      const at = sv => {
        let i = 0;
        while (i + 1 < nS && Bd.s[i + 1] < sv) i++;
        const t = i + 1 < nS ? Math.max(0, Math.min(1, (sv - Bd.s[i]) / (Bd.s[i + 1] - Bd.s[i]))) : 0;
        return i + 1 < nS ? Wst[i] + (Wst[i + 1] - Wst[i]) * t : Wst[i];
      };
      for (let k = 0; k < W.length; k++) W[k] = Number.isNaN(W0[k]) ? NaN : at(Sv[k]);
      seen = new Uint8Array(CX * CY);
      for (let j = 0; j < CY; j++)
        for (let i = 0; i < CX; i++) {
          const c = [j * NX + i, j * NX + i + 1, (j + 1) * NX + i + 1, (j + 1) * NX + i];
          if (c.some(k => Number.isNaN(W[k]))) continue;
          if (c.filter(k => inUsg[k]).length < 2) continue;
          if (c.some(k => Z[k] < W[k])) seen[j * CX + i] = 1;
        }
      nh = FG.houses.filter(h => seen[h.cell] && h.z < W[h.k]).length;
      depth = Wst.reduce((a, w, i) => a + (w - Bd.bed[i]), 0) / nS;
    } else {
      // „Wie im Dezember 2023“: the reservoir held most of it back – the river at the brim and the lowest meadows next to it, inside
      // the official area: within 35 m of the river, the deepest water (5 cm steps) that leaves the village's houses dry but the few
      // the variant assumes (Annahme)
      maxD = 35;
      depth = 0.05;
      const fill = d => {
        const sn = floodFill(FG, d, maxD);
        for (let j = 0; j < CY; j++)
          for (let i = 0; i < CX; i++)
            if (sn[j * CX + i] && !inUsg[j * NX + i] && !inUsg[(j + 1) * NX + i + 1]) sn[j * CX + i] = 0;
        return sn;
      };
      seen = fill(0.05);
      nh = wetHouses(seen, 0.05);
      for (let d = 0.1; d <= 0.8 + 1e-6; d += 0.05) {
        const s2 = fill(d),
          n2 = wetHouses(s2, d);
        if (n2 > want) break;
        depth = d;
        seen = s2;
        nh = n2;
      }
      for (let k = 0; k < W.length; k++) W[k] = W0[k] + depth;
    }
    // the river itself at the brim: a ribbon of about 10 m along its line (the 10 m terrain has no channel), 8 cm over the ground at least
    for (let k = 0; k < W.length; k++)
      if (!Number.isNaN(W[k]) && Math.abs(Dv[k]) <= 5) W[k] = Math.max(W[k], Z[k] + 0.08);
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        const c = [j * NX + i, j * NX + i + 1, (j + 1) * NX + i + 1, (j + 1) * NX + i];
        if (c.every(k => !Number.isNaN(W[k]) && Math.abs(Dv[k]) <= 5)) seen[j * CX + i] = 1;
      }
    const corner = (i, j) => [j * NX + i, j * NX + i + 1, (j + 1) * NX + i + 1, (j + 1) * NX + i];
    // the water: one quad per flooded cell at the level of its corners (the terrain cuts the shore)
    const vi = new Int32Array(NX * NY).fill(-1),
      pos = [],
      uv = [],
      idx = [];
    const vert = k => {
      if (vi[k] >= 0) return vi[k];
      const i = k % NX,
        j = (k / NX) | 0;
      vi[k] = pos.length / 3;
      pos.push(x0 + i * CELL, W[k] + 0.02, -(y0 + j * CELL));
      uv.push(Sv[k] / 7, Dv[k] / 7);
      return vi[k];
    };
    let nCells = 0,
      area = 0;
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        if (!seen[j * CX + i]) continue;
        const [a, b, c, d] = corner(i, j).map(vert);
        idx.push(a, b, c, a, c, d);
        nCells++;
        const cz = corner(i, j);
        area += (CELL * CELL * cz.filter(k => Z[k] < W[k]).length) / 4;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const nrm = new Float32Array(pos.length);
    for (let i = 0; i < nrm.length; i += 3) nrm[i + 1] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.computeBoundingSphere();
    // the shore: a band of wet mud from the waterline up to ~0,7 m above it, draped on the terrain, its upper edge soft; flotsam on the line
    const mud = GB(true),
      MUD = L(0.2, 0.16, 0.11),
      MUD2 = L(0.3, 0.25, 0.18);
    const shore = [];
    const near = new Uint8Array(CX * CY);
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++)
        if (seen[j * CX + i])
          for (let b = -3; b <= 3; b++)
            for (let a = -3; a <= 3; a++) {
              const p = i + a,
                q = j + b;
              if (p >= 0 && q >= 0 && p < CX && q < CY) near[q * CX + p] = 1;
            }
    const vtx = k => {
      const i = k % NX,
        j = (k / NX) | 0,
        x = x0 + i * CELL,
        y = y0 + j * CELL,
        up = Z[k] - W[k],
        a = up <= -0.04 ? 0 : 0.72 * Math.min(1, (up + 0.04) / 0.1) * Math.max(0, 1 - up / 0.6),
        nz = noise(x / 6, y / 6),
        c = mix3(MUD, MUD2, nz);
      return { p: new THREE.Vector3(x, Z[k] + 0.05, -y), c: [c[0], c[1], c[2], a] };
    };
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        if (!near[j * CX + i]) continue;
        const cs = corner(i, j);
        if (cs.some(k => Number.isNaN(W[k]))) continue;
        const ups = cs.map(k => Z[k] - W[k]);
        // only the band: some corner within 0,6 m above the water, some above it
        if (Math.min(...ups) > 0.6 || Math.max(...ups) < -0.04) continue;
        const [a, b, c, d] = cs.map(vtx);
        mud.tri(a.p, b.p, c.p, a.c);
        // per-vertex colours: GB takes one colour per triangle – set them by hand below
        mud.tri(a.p, c.p, d.p, a.c);
        // remember the per-vertex alphas for the fix-up
        shore.push([a.c, b.c, c.c, a.c, c.c, d.c]);
      }
    const mg = mud.geo();
    {
      const C = mg.attributes.color;
      let v = 0;
      for (const six of shore) for (const c of six) C.setXYZW(v++, c[0], c[1], c[2], c[3]);
    }
    // flotsam: twigs and straw along the waterline (cells with wet and dry corners)
    const fl = [];
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        if (!seen[j * CX + i]) continue;
        const cs = corner(i, j),
          w = cs.filter(k => Z[k] < W[k]).length;
        if (w === 0 || w === 4) continue;
        const k0 = cs[0],
          r = hash(i * 7919 + j * 104729);
        if (r > (COARSE ? 0.35 : 0.7)) continue;
        // on the waterline: between a wet and a dry corner
        const kw = cs.find(k => Z[k] < W[k]),
          kd = cs.find(k => Z[k] >= W[k]),
          tw = (W[kw] - Z[kw]) / Math.max(1e-3, W[kw] - Z[kw] + Z[kd] - W[kd]),
          ix = k => [x0 + (k % NX) * CELL, y0 + ((k / NX) | 0) * CELL],
          pw = ix(kw),
          pd = ix(kd),
          x = pw[0] + (pd[0] - pw[0]) * tw + (hash(k0 * 3) - 0.5) * 1.2,
          y = pw[1] + (pd[1] - pw[1]) * tw + (hash(k0 * 5) - 0.5) * 1.2;
        fl.push({
          x,
          y,
          z: W[k0] + 0.01,
          r: hash(k0 * 11) * 6.28,
          s: 0.6 + hash(k0 * 13) * 0.9,
          kind: hash(k0 * 23) < 0.07 ? 2 : hash(k0 * 17) < 0.55 ? 0 : 1,
        });
      }
    return { g, mg, fl, cells: nCells, area, depth, houses: nh, want, maxD, usg: big };
  }
  // twigs (a few thin sticks) and straw (a flat pale tangle): flotsam in one geometry each
  function flotsamGeo(kind) {
    const B = GB(false);
    if (kind === 2) {
      // driftwood: a trunk piece of 2,4 m with two broken branch stubs, half in the water
      const BK = L(0.24, 0.2, 0.15),
        WD = L(0.42, 0.35, 0.26);
      B.box(M4(0, 0.02, 0), 2.4, 0.18, 0.18, BK, 0);
      B.box(M4(1.205, 0.02, 0), 0.01, 0.17, 0.17, WD, 0);
      B.box(M4(0.4, 0.12, 0.12, 0.6), 0.5, 0.05, 0.05, BK, 0);
      B.box(M4(-0.6, 0.1, -0.1, -0.8), 0.4, 0.04, 0.04, BK, 0);
      return B.geo();
    }
    if (kind === 0) {
      const C = [L(0.24, 0.19, 0.14), L(0.32, 0.27, 0.21), L(0.16, 0.13, 0.1)];
      for (let i = 0; i < 4; i++) {
        const a = hash(i * 31 + 3) * 3.14,
          l = 0.6 + hash(i * 17) * 1.1;
        B.box(
          M4((hash(i * 7) - 0.5) * 0.6, 0.02 + i * 0.01, (hash(i * 11) - 0.5) * 0.6, a),
          l,
          0.035,
          0.035,
          C[i % 3],
          0b001000
        );
      }
    } else {
      const C = [L(0.52, 0.46, 0.33), L(0.42, 0.37, 0.26), L(0.62, 0.57, 0.45)];
      for (let i = 0; i < 9; i++) {
        const a = hash(i * 13 + 1) * 3.14,
          l = 0.25 + hash(i * 5) * 0.5;
        B.box(
          M4((hash(i * 3) - 0.5) * 0.7, 0.012 + (i % 3) * 0.006, (hash(i * 19) - 0.5) * 0.5, a),
          l,
          0.01,
          0.03,
          C[i % 3],
          0b001000
        );
      }
    }
    return B.geo();
  }
  function flood(level) {
    level = level > 0 ? level : 0;
    if (!level) {
      for (const m of [S.floodMesh, S.mudMesh, S.flot0, S.flot1, S.flot2]) if (m) m.visible = false;
      S.floodLevel = 0;
      return;
    }
    if (Math.abs((S.floodLevel || 0) - level) < 0.01 && S.floodMesh) {
      for (const m of [S.floodMesh, S.mudMesh, S.flot0, S.flot1, S.flot2]) if (m) m.visible = true;
      return;
    }
    const M = mats(),
      F = floodBuild(level);
    if (!S.floodMesh) {
      S.floodMesh = plainMesh(F.g, M.water, 'hochwasser');
      S.floodMesh.renderOrder = 3;
      S.floodMesh.onBeforeRender = () => {
        if (S.wt) S.wt.value = (performance.now() / 1000) % 600;
      };
      S.mudMesh = plainMesh(F.mg, M.mud, 'hochwasser-schlamm');
      S.mudMesh.renderOrder = 2;
    } else {
      S.floodMesh.geometry.dispose();
      S.floodMesh.geometry = F.g;
      S.mudMesh.geometry.dispose();
      S.mudMesh.geometry = F.mg;
    }
    for (const kind of [0, 1, 2]) {
      const key = 'flot' + kind,
        L0 = F.fl.filter(f => f.kind === kind);
      if (S[key]) {
        scene.remove(S[key]);
        S[key].dispose();
      }
      const im = inst(
        S['flotGeo' + kind] || (S['flotGeo' + kind] = flotsamGeo(kind)),
        M.wood,
        L0.length,
        'treibgut' + kind
      );
      L0.forEach((f, i) =>
        im.setMatrixAt(
          i,
          new THREE.Matrix4().compose(
            T3(f.x, f.y, f.z),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.r),
            new THREE.Vector3(f.s, 1, f.s)
          )
        )
      );
      im.count = L0.length;
      im.instanceMatrix.needsUpdate = true;
      S[key] = im;
    }
    for (const m of [S.floodMesh, S.mudMesh, S.flot0, S.flot1, S.flot2]) if (m) m.visible = true;
    S.floodLevel = level;
    S.floodInfo = {
      cells: F.cells,
      area: Math.round(F.area),
      depth: +F.depth.toFixed(2),
      flotsam: F.fl.length,
      houses: F.houses,
      want: F.want,
      maxD: Math.round(F.maxD),
      usg: F.usg,
    };
    markDirty(true);
  }
  // the brook in the garden: higher after heavy rain, low in a dry summer (its meshes moved, nothing rebuilt)
  function brookLevel(dz) {
    if (!S.brookMeshes) {
      S.brookMeshes = [];
      scene.traverse(o => {
        if (!o.isMesh || !o.material || !o.material.customProgramCacheKey || o.name.startsWith('zukunft')) return;
        try {
          if (o.material.customProgramCacheKey() === 'brook') S.brookMeshes.push({ o, y: o.position.y });
        } catch (e) {}
      });
    }
    for (const b of S.brookMeshes) b.o.position.y = b.y + dz;
    S.brookDz = dz;
  }
  function dry(v) {
    if (WXBODEN && WXBODEN.setDry) WXBODEN.setDry(v);
  }
  function weather(name) {
    const W = G('WETTER');
    if (!W || !W.preset) return;
    if (name) {
      if (!S.weatherMine) {
        S.weatherMine = true;
        S.weatherPrev = (W.S && W.S.preset) || null;
      }
      W.preset(name);
    } else if (S.weatherMine) {
      W.preset(S.weatherPrev);
      S.weatherMine = false;
    }
  }

  // =====================================================================================================================================
  // The forest at the Klinge after the beetle: dying, cleared or fallen, young trees growing
  // =====================================================================================================================================
  const TINT = { red: [1.55, 0.74, 0.4], grey: [0.82, 0.78, 0.72], dry: [1.2, 1.05, 0.62] };
  function forestInit() {
    if (S.forest) return S.forest;
    const F = G('FOREST');
    const Ls = F && F.list ? F.list.filter(t => t.sp === 'spruce' && !t.gone && t.h > 4) : [];
    // rank of every spruce on a mix of chance and place (neighbours die together: the beetle spreads from nests)
    const sc = Ls.map((t, i) => ({ i, s: 0.45 * hash(t.id * 13 + 5) + 0.55 * noise(t.x / 45, t.y / 45) }));
    sc.sort((a, b) => a.s - b.s);
    const rank = new Float32Array(Ls.length);
    sc.forEach((o, r) => (rank[o.i] = (r + 0.5) / Ls.length));
    S.forest = {
      L: Ls,
      rank,
      orig: Ls.map(t => ({ h: t.h, w: t.w, tint: t.tint || null, tilt: t.tilt || null })),
      code: new Int16Array(Ls.length).fill(-1),
      core: Ls.map(t => (F.inCore ? F.inCore(t.x, t.y) : false)),
    };
    return S.forest;
  }
  // a young tree of each kind, 1 m high in its own frame (scaled by its height); crowns in paint (the season's colour per instance)
  function youngGeo(kind) {
    const B = GB(false),
      BARK = L(0.3, 0.25, 0.2),
      BIRCH = L(0.78, 0.77, 0.72),
      DARK = L(0.055, 0.085, 0.05);
    if (kind === 'fichte' || kind === 'tanne') {
      // a narrow cone of whorls: five tiers, darker inside, the leader on top
      B.prism(0, 0, 0, 0.98, 0.016, 0.004, 5, BARK, false);
      const c0 = kind === 'tanne' ? L(0.035, 0.07, 0.045) : L(0.045, 0.08, 0.04),
        c1 = kind === 'tanne' ? L(0.07, 0.12, 0.07) : L(0.08, 0.13, 0.06);
      for (let i = 0; i < 5; i++) {
        const y0 = 0.1 + i * 0.17,
          r = 0.26 * (1 - i / 5.6);
        B.prism(0, 0, y0, y0 + 0.3, r, 0.012, 9, i % 2 ? c1 : c0, false);
        B.prism(0, 0, y0 - 0.002, y0, 0.03, r, 9, DARK, false);
      }
    } else if (kind === 'birke') {
      // a white stem, a narrow airy crown of three loose masses
      B.prism(0, 0, 0, 0.85, 0.016, 0.006, 6, BIRCH, false);
      for (const [x, y, z, r] of [
        [0.03, 0.62, 0, 0.13],
        [-0.04, 0.76, 0.03, 0.12],
        [0.01, 0.88, -0.02, 0.09],
      ])
        B.blob(x, y, z, r, r * 1.25, r, () => PAINT, Math.round(y * 100), 3, 6, 0.35);
    } else {
      // beech, oak, maple, rowan: a stem and a rounded crown of four lumpy masses (few triangles: thousands of them stand)
      B.prism(0, 0, 0, 0.55, 0.02, 0.012, 5, BARK, false);
      const sp = kind === 'eiche' ? 0.3 : kind === 'ahorn' ? 0.27 : 0.25;
      for (const [x, y, z, r] of [
        [0, 0.66, 0, sp],
        [0.13, 0.6, 0.06, sp * 0.72],
        [-0.12, 0.62, -0.07, sp * 0.74],
        [0, 0.83, 0.02, sp * 0.62],
      ])
        B.blob(
          x,
          y,
          z,
          r,
          r * 0.85,
          r,
          nv => (nv.y < -0.25 ? L(0.11, 0.1, 0.065) : PAINT),
          Math.round(x * 100 + 50),
          3,
          6,
          0.3
        );
    }
    return B.geo();
  }
  function guardGeo() {
    const B = GB(false);
    B.prism(0, 0, 0, 1.2, 0.07, 0.065, 10, L(0.46, 0.53, 0.45), false);
    B.prism(0.09, 0, -0.3, 1.25, 0.012, 0.012, 4, L(0.36, 0.3, 0.22), true);
    return B.geo();
  }
  function stumpGeo() {
    const B = GB(false);
    B.prism(0, 0, -0.2, 0.32, 1.1, 1.0, 9, L(0.28, 0.23, 0.18), false);
    B.prism(0, 0, 0.32, 0.33, 1.0, 0.98, 9, L(0.58, 0.47, 0.32), true);
    return B.geo();
  }
  function brushGeo() {
    const B = GB(false),
      C = [L(0.25, 0.2, 0.15), L(0.33, 0.27, 0.19), L(0.2, 0.18, 0.13)];
    // a long low heap of branches (Reisig): lumpy masses and some sticks on top
    for (let i = 0; i < 5; i++)
      B.blob(
        -1.6 + i * 0.8,
        0.25,
        (hash(i * 3) - 0.5) * 0.3,
        0.7,
        0.32,
        0.6,
        nv => C[(i + (nv.y > 0.3 ? 1 : 0)) % 3],
        i * 7 + 1,
        3,
        7,
        0.4
      );
    for (let i = 0; i < 6; i++)
      B.box(M4(-1.5 + i * 0.6, 0.5, (hash(i * 9) - 0.5) * 0.6, hash(i * 5) * 3), 1.4, 0.05, 0.05, C[i % 3], 0);
    return B.geo();
  }
  // the season of the game's day: leaf colour by kind (paint), bare in winter for birch and maple, young beech and oak keep dry leaves
  function leafCol(kind, rnd) {
    let doy = 300;
    try {
      const e = (DN && Number.isFinite(DN.e0) ? DN.e0 : 20605) + Math.floor(((CLOCK && CLOCK.t) || 0) / 1440),
        d = new Date(e * 864e5);
      doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5);
    } catch (e) {}
    const v = 0.85 + rnd * 0.3;
    const sc = c => [c[0] * v, c[1] * v, c[2] * v];
    const green = {
        buche: L(0.2, 0.32, 0.1),
        eiche: L(0.17, 0.27, 0.09),
        ahorn: L(0.2, 0.33, 0.11),
        birke: L(0.27, 0.36, 0.12),
        eberesche: L(0.19, 0.3, 0.1),
      },
      autumn = {
        buche: L(0.5, 0.3, 0.1),
        eiche: L(0.4, 0.3, 0.12),
        ahorn: L(0.62, 0.42, 0.08),
        birke: L(0.62, 0.5, 0.12),
        eberesche: L(0.55, 0.2, 0.08),
      },
      winter = {
        buche: L(0.45, 0.3, 0.17),
        eiche: L(0.38, 0.29, 0.18),
        ahorn: L(0.3, 0.26, 0.24),
        birke: L(0.3, 0.25, 0.25),
        eberesche: L(0.3, 0.26, 0.24),
      };
    if (doy >= 120 && doy < 275) return sc(green[kind] || green.buche);
    if (doy >= 275 && doy < 315) return sc(autumn[kind] || autumn.buche);
    return sc(winter[kind] || winter.buche);
  }
  // the young stand of a variant in year y: kinds, places, heights – planted groups in the family forest, natural regeneration
  function youngStand(mode, y) {
    const Fo = forestInit(),
      out = [],
      guards = [],
      stumps = [],
      brush = [];
    const lag = ZKDATA.LAG;
    const cap = COARSE ? 2600 : 6500;
    for (let i = 0; i < Fo.L.length && out.length < cap; i++) {
      const t = Fo.L[i],
        a = y - ZKDATA.strikeYear(Fo.rank[i]);
      if (a < lag) continue;
      const age = a - lag,
        core = Fo.core[i],
        lying = mode === 'natur' && core && age < LIE;
      // cleared (Waldumbau, and outside the family forest in both): a stump; brush heaps here and there. Left alone: nothing cut
      if (mode === 'umbau' || !core) {
        stumps.push({ x: t.x, y: t.y, r: Math.max(0.1, (t.dbh || 0.3) * 0.55), rot: hash(t.id) * 6.28 });
        if (hash(t.id * 71) < 0.07)
          brush.push({ x: t.x + 1.5, y: t.y - 1, rot: hash(t.id * 3) * 6.28, s: 0.8 + hash(t.id * 5) * 0.5 });
      }
      if (age <= 0.3) continue;
      // young trees: in the family forest planted in groups (umbau) or seeded (natur), elsewhere fewer
      // natural regeneration comes denser and uneven (pioneers in groups), the planting in the family forest in groups of three
      const occ = ZKDATA.OCC[mode] * (core ? 1 : mode === 'natur' ? 0.6 : 0.45);
      if (hash(t.id * 29 + 3) > occ) continue;
      const n = core ? 3 : mode === 'natur' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const r = hash(t.id * 97 + k * 13),
          kind = pickKind(mode, hash(t.id * 53 + k * 7)),
          ang = hash(t.id * 11 + k) * 6.28,
          d = 0.6 + 1.4 * hash(t.id * 17 + k),
          x = t.x + Math.cos(ang) * d,
          yy = t.y + Math.sin(ang) * d;
        // height by age (ZKDATA's curves), kinds differ: birch and spruce faster at first, fir and beech slower in the shade
        let h = youngH(mode, kind, age, r);
        // conifers beyond a sapling's size: the lead one is the slot's own tree again (treeState), the others not drawn; under the
        // dead trees lying in the family forest they stay small for now
        if (CONIFER[kind] && h > SLOT_H) {
          if (!lying) continue;
          h = Math.min(h, 3.5);
        }
        out.push({ x, y: yy, h, kind, rot: r * 6.28, id: t.id * 4 + k });
        // tree guards on the planted oaks, firs and maples for their first eight years
        if (mode === 'umbau' && core && age < 8 && (kind === 'eiche' || kind === 'tanne' || kind === 'ahorn'))
          guards.push({ x, y: yy });
      }
    }
    return { out, guards, stumps, brush };
  }
  // the mixes of the young stand and a slot's lead tree (the first of its group): kind, height factor – the stand and the slot agree
  const MIX = {
    umbau: [
      ['buche', 0.38],
      ['tanne', 0.22],
      ['eiche', 0.16],
      ['ahorn', 0.12],
      ['fichte', 0.06],
      ['birke', 0.06],
    ],
    natur: [
      ['fichte', 0.42],
      ['birke', 0.3],
      ['eberesche', 0.16],
      ['buche', 0.12],
    ],
  };
  const CONIFER = { fichte: 1, tanne: 1 };
  function pickKind(mode, r) {
    const mix = MIX[mode];
    let a = 0;
    for (const [k, p] of mix) {
      a += p;
      if (r < a) return k;
    }
    return mix[mix.length - 1][0];
  }
  // the height drawn: young trees as they grow in Thuringian conditions (planted beech and oak ~0,3–0,5 m a year when young: about
  // 4–5 m after 15 years, 10–13 m after 30; pioneers – birch, rowan, spruce from seed – faster, fir slower; Annahme after yield tables)
  const VIS = {
    birke: [18, 16, 1.15],
    eberesche: [11, 15, 1.15],
    fichte: [20, 22, 1.3],
    tanne: [16, 30, 1.45],
    buche: [17, 26, 1.4],
    eiche: [16, 26, 1.4],
    ahorn: [17, 24, 1.35],
  };
  const youngH = (mode, kind, age, r) => {
    const [H, T, p] = VIS[kind] || VIS.buche;
    return Math.max(0.25, H * Math.pow(1 - Math.exp(-Math.max(0, age) / T), p) * (0.8 + 0.4 * r));
  };
  // young conifers taller than this grow on as the forest's own tree in the cleared slot (its model is a real spruce; the simple cone
  // of the sapling would look like a toy at that size)
  const SLOT_H = 2.5;
  // in the family forest left alone the dead trees stand, then lie until this many years after the clearing would have been
  const LIE = 12;
  // a slot's regrowth: { kind, h } when its lead tree is a conifer taller than SLOT_H (and no dead tree lies there), else null
  function slotGrowth(Fo, i, mode, y) {
    const t = Fo.L[i],
      a = y - ZKDATA.strikeYear(Fo.rank[i]),
      age = a - ZKDATA.LAG;
    if (age <= 0.3 || (mode === 'natur' && Fo.core[i] && age < LIE)) return null;
    const occ = ZKDATA.OCC[mode] * (Fo.core[i] ? 1 : 0.45);
    if (hash(t.id * 29 + 3) > occ) return null;
    const kind = pickKind(mode, hash(t.id * 53)),
      h = youngH(mode, kind, age, hash(t.id * 97));
    return CONIFER[kind] && h > SLOT_H ? { kind, h } : null;
  }
  // what a spruce shows in year y: { code, h, w, tint, tilt }
  function treeState(Fo, i, mode, y, dryV) {
    const t = Fo.L[i],
      o = Fo.orig[i];
    if (mode) {
      const a = y - ZKDATA.strikeYear(Fo.rank[i]);
      if (a >= 0 && a < 1) return { code: 1, h: o.h, w: o.w, tint: TINT.red };
      if (a >= 1 && a < ZKDATA.LAG) return { code: 2, h: o.h, w: o.w * 0.78, tint: TINT.grey };
      if (a >= ZKDATA.LAG) {
        // left alone (natural regeneration, in the family forest): grey for some years, then fallen, then rotten away and grown over
        if (mode === 'natur' && Fo.core[i] && a < ZKDATA.LAG + LIE) {
          if (a < ZKDATA.LAG + 4 + 4 * hash(t.id * 7)) return { code: 2, h: o.h, w: o.w * 0.7, tint: TINT.grey };
          return { code: 5, h: o.h * 0.92, w: o.w * 0.6, tint: TINT.grey, fall: true };
        }
        // a young conifer grown taller than a sapling: the slot's own tree again, young (narrower, a fresher green; the fir darker)
        const g = slotGrowth(Fo, i, mode, y);
        if (g)
          return {
            code: 10 + Math.min(120, Math.round(g.h * 2)) + (g.kind === 'tanne' ? 200 : 0),
            h: Math.min(g.h, o.h),
            w: o.w * 0.82,
            tint: g.kind === 'tanne' ? [0.82, 0.95, 0.9] : [0.95, 1.08, 0.95],
          };
        return { code: 3, h: 0.02, w: o.w, tint: TINT.grey };
      }
    }
    if (dryV > 0 && hash(t.id * 41 + 9) < dryV * 0.45) return { code: 900, h: o.h, w: o.w, tint: TINT.dry };
    return { code: 0, h: o.h, w: o.w, tint: o.tint };
  }
  const _q = new THREE.Quaternion(),
    _ax = new THREE.Vector3();
  function forest(mode, y, dryV) {
    const F = G('FOREST');
    if (!F || !F.tint || !F.retilt) return 0;
    if (!mode && !dryV && !S.forest) return 0;
    const Fo = forestInit();
    let n = 0;
    for (let i = 0; i < Fo.L.length; i++) {
      const st = treeState(Fo, i, mode, y, dryV);
      if (st.code === Fo.code[i]) continue;
      const t = Fo.L[i];
      Fo.code[i] = st.code;
      n++;
      F.tint(t, st.tint);
      let moved = false;
      if (st.h !== t.h || st.w !== t.w) {
        t.h = st.h;
        t.w = st.w;
        moved = true;
      }
      // fallen: about its foot, along a direction of its own, nearly flat (the crown on the ground)
      const tilt = st.fall ? 'fall' : null;
      if (tilt && !t._zkFall) {
        const dir = hash(t.id * 19) * 6.28,
          th = (84 + 4 * hash(t.id * 23)) * (Math.PI / 180);
        _ax.set(-Math.sin(dir), 0, -Math.cos(dir)).normalize();
        t.tilt = { q: new THREE.Quaternion().setFromAxisAngle(_ax, th), o: new THREE.Vector3(0, 0.25, 0) };
        t._zkFall = true;
        moved = true;
      } else if (!tilt && t._zkFall) {
        t.tilt = Fo.orig[i].tilt;
        t._zkFall = false;
        moved = true;
      }
      if (moved) F.retilt(t);
    }
    // the light: where a crown is gone (cleared, fallen, or a young tree there) the canopy opens – the sun reaches the ground again
    if (n && F.canopy && F.canopy.save) {
      F.canopy.save();
      F.canopy.reset();
      if (mode)
        for (let i = 0; i < Fo.L.length; i++) {
          const c = Fo.code[i],
            o = Fo.orig[i],
            t = Fo.L[i],
            k = c === 3 || c === 5 ? 1 : c >= 10 && c < 900 ? 0.6 : c === 2 ? 0.35 : 0;
          if (k) F.canopy.open(t.x, t.y, o.h, o.w, k);
        }
      F.canopy.upload(mode ? 0.5 : 0);
    }
    // the young stand, stumps, brush and guards
    youngShow(mode ? youngStand(mode, y) : null);
    if (n) markDirty(true);
    return n;
  }
  const KINDS = ['fichte', 'tanne', 'birke', 'buche', 'eiche', 'ahorn', 'eberesche'];
  // young broadleaf trees above sapling size: the garden's ez-tree kinds (garden/trees.js – built at load, real bark and leaf cards,
  // lit like the garden's trees, their programs exist): beech and maple as ash/oak shapes, oak as oak, birch and rowan as aspen
  const EZ = { buche: 'oakB', eiche: 'oakA', ahorn: 'ash', birke: 'aspen', eberesche: 'aspen' };
  const ezKind = k => (EZ[k] && TREES[EZ[k]] && TREES[EZ[k]].lg ? EZ[k] : null);
  // the season's leaf colour as a factor on the green leaf cards (instance colour): beech and oak keep dry brown leaves in winter
  function leafMul(kind) {
    let doy = 300;
    try {
      const e = (DN && Number.isFinite(DN.e0) ? DN.e0 : 20605) + Math.floor(((CLOCK && CLOCK.t) || 0) / 1440),
        d = new Date(e * 864e5);
      doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5);
    } catch (e) {}
    if (doy >= 120 && doy < 275) return [1, 1, 1];
    const late = doy >= 315 || doy < 120;
    if (kind === 'buche' || kind === 'eiche') return late ? [1.5, 0.82, 0.45] : [1.55, 0.95, 0.4];
    if (kind === 'ahorn') return late ? [0.75, 0.65, 0.55] : [1.6, 1.15, 0.3];
    return late ? [0.8, 0.72, 0.6] : [1.5, 1.25, 0.35];
  }
  function ezShow(list) {
    // the nearest to the family forest (each tree ~1 800 triangles in its lighter level: the cap keeps a stand within budget)
    const cap = COARSE ? 110 : 380;
    // the family forest first, then the nearest to it
    const F = G('FOREST'),
      core = F && F.CORE ? F.CORE : null,
      cx = core ? core.reduce((a, p) => a + p[0], 0) / core.length : -475,
      cy = core ? core.reduce((a, p) => a + p[1], 0) / core.length : -600;
    const sorted = list.map(t => ({ t, d: Math.hypot(t.x - cx, t.y - cy) })).sort((a, b) => a.d - b.d),
      L0 = sorted.slice(0, cap).map(o => o.t),
      rest = sorted.slice(cap).map(o => o.t);
    S.ez = S.ez || {};
    const groups = {};
    for (const t of L0) (groups[EZ[t.kind]] = groups[EZ[t.kind]] || []).push(t);
    const _m = new THREE.Matrix4(),
      _qq = new THREE.Quaternion(),
      _s = new THREE.Vector3(),
      up = new THREE.Vector3(0, 1, 0),
      col = new THREE.Color();
    for (const key of new Set([...Object.keys(S.ez), ...Object.keys(groups)])) {
      const K = TREES[key],
        g = groups[key] || [];
      if (!S.ez[key]) {
        if (!g.length) continue;
        const LV = treeLeafLevels(K),
          n = cap,
          bark = new THREE.InstancedMesh(K.bgFar || K.bgMid || K.bg, K.bark, n),
          leaf = new THREE.InstancedMesh(LV[2] || LV[1] || K.lg, K.leaf, n);
        for (let i = 0; i < n; i++) leaf.setColorAt(i, col.setRGB(1, 1, 1));
        for (const im of [bark, leaf]) {
          im.count = 0;
          im.castShadow = false;
          im.receiveShadow = true;
          im.frustumCulled = false;
          im.userData.noMerge = true;
          im.name = 'zukunft:jung-' + key;
          scene.add(im);
        }
        S.ez[key] = { bark, leaf, H: K.H || 10 };
      }
      const E = S.ez[key];
      g.forEach((t, i) => {
        const s = t.h / E.H,
          w = s * 0.78;
        _qq.setFromAxisAngle(up, t.rot);
        _m.compose(T3(t.x, t.y, gnd(t.x, t.y) - 0.05), _qq, _s.set(w, s, w));
        E.bark.setMatrixAt(i, _m);
        E.leaf.setMatrixAt(i, _m);
        const f = leafMul(t.kind),
          v = 0.85 + 0.3 * hash(t.id * 7);
        E.leaf.setColorAt(i, col.setRGB(f[0] * v, f[1] * v, f[2] * v));
      });
      for (const im of [E.bark, E.leaf]) {
        im.count = g.length;
        im.visible = g.length > 0;
        im.instanceMatrix.needsUpdate = true;
      }
      if (E.leaf.instanceColor) E.leaf.instanceColor.needsUpdate = true;
    }
    S.ezN = L0.length;
    return rest;
  }
  function youngShow(Y) {
    const M = mats();
    if (!Y) {
      if (S.young) for (const im of Object.values(S.young)) im.visible = false;
      if (S.ez) for (const E of Object.values(S.ez)) E.bark.visible = E.leaf.visible = false;
      return;
    }
    if (!S.young) {
      S.young = {};
      const geos = {};
      for (const k of KINDS) {
        const gk = k === 'eberesche' ? 'ahorn' : k;
        geos[gk] = geos[gk] || youngGeo(gk);
        S.young[k] = inst(geos[gk], M.wood, COARSE ? 1200 : 3000, 'jung-' + k);
      }
      S.young.guard = inst(guardGeo(), M.kit, 2000, 'wuchshuellen');
      S.young.stump = inst(stumpGeo(), M.wood, COARSE ? 2500 : 6000, 'stubben');
      S.young.brush = inst(brushGeo(), M.wood, 600, 'reisig');
    }
    const by = {};
    for (const k of KINDS) by[k] = [];
    const tall = [];
    for (const t of Y.out) {
      if (t.h > SLOT_H && !CONIFER[t.kind] && ezKind(t.kind)) tall.push(t);
      else by[t.kind].push(t);
    }
    // beyond the cap (far from the family forest): the simple shapes
    for (const t of ezShow(tall)) by[t.kind].push(t);
    const _m = new THREE.Matrix4(),
      _p = new THREE.Vector3(),
      _s = new THREE.Vector3(),
      up = new THREE.Vector3(0, 1, 0),
      col = new THREE.Color();
    for (const k of KINDS) {
      const im = S.young[k],
        L0 = by[k].slice(0, im.instanceMatrix.count);
      L0.forEach((t, i) => {
        // crowns of young trees in a stand are narrow (they grow up towards the light): narrower the taller
        const wide = k === 'fichte' || k === 'tanne' ? 0.95 : (k === 'birke' ? 0.85 : 1.0) * (t.h > 4 ? 0.72 : 0.95);
        _s.set(t.h * wide, t.h, t.h * wide);
        _q.setFromAxisAngle(up, t.rot);
        _p.copy(T3(t.x, t.y, gnd(t.x, t.y) - 0.03));
        im.setMatrixAt(i, _m.compose(_p, _q, _s));
        const c = k === 'fichte' || k === 'tanne' ? [1, 1, 1] : leafCol(k, hash(t.id * 3));
        im.setColorAt(i, col.setRGB(c[0], c[1], c[2]));
      });
      im.count = L0.length;
      im.visible = L0.length > 0;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    const put = (im, list, f) => {
      const L0 = list.slice(0, im.instanceMatrix.count);
      L0.forEach((o, i) => im.setMatrixAt(i, f(o)));
      im.count = L0.length;
      im.visible = L0.length > 0;
      im.instanceMatrix.needsUpdate = true;
    };
    put(S.young.guard, Y.guards, o =>
      _m.compose(T3(o.x, o.y, gnd(o.x, o.y) - 0.05), _q.identity(), _s.set(1, 1, 1)).clone()
    );
    put(S.young.stump, Y.stumps, o =>
      _m.compose(T3(o.x, o.y, gnd(o.x, o.y)), _q.setFromAxisAngle(up, o.rot), _s.set(o.r, 1, o.r)).clone()
    );
    put(S.young.brush, Y.brush, o =>
      _m.compose(T3(o.x, o.y, gnd(o.x, o.y) - 0.05), _q.setFromAxisAngle(up, o.rot), _s.set(o.s, o.s, o.s)).clone()
    );
    S.youngN = { trees: Y.out.length, guards: Y.guards.length, stumps: Y.stumps.length, brush: Y.brush.length };
  }

  // =====================================================================================================================================
  // the whole description of the world (from ZKDATA.calc(...).world)
  // =====================================================================================================================================
  function apply(w, year) {
    warm();
    w = w || {};
    const sig = JSON.stringify([
      w.pvRoof,
      w.pvField,
      w.wp,
      w.bank,
      w.rufbus,
      w.flood,
      w.dry,
      w.wet,
      w.rain,
      w.forest && w.forest.mode,
      year,
    ]);
    if (sig === S.sig.all) return false;
    S.sig.all = sig;
    const step = (name, fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('zukunft-welt ' + name, e);
        S.err = name + ': ' + String(e);
      }
    };
    step('dach', () => roofShare(w.pvRoof || 0));
    step('park', () => fieldShare(w.pvField || 0));
    step('wp', () => wpCount(w.wp || 0));
    step('bank', () => bank(!!w.bank));
    step('rufbus', () => rufbus(!!w.rufbus));
    step('flut', () => flood(w.flood || 0));
    step('trocken', () => dry(w.dry || 0));
    step('wetter', () => weather(w.rain || null));
    step('bach', () => brookLevel(w.wet ? 0.18 : w.dry ? -0.12 * Math.min(1, w.dry) : w.flood ? 0.3 : 0));
    step('wald', () => forest(w.forest ? w.forest.mode : null, year, w.dry || 0));
    S.state = w;
    S.year = year;
    return true;
  }
  function clear() {
    S.sig.all = null;
    for (const m of [S.roofMesh, S.flatMesh, S.flatBody, S.wpMesh, S.floodMesh, S.mudMesh, S.flot0, S.flot1, S.flot2])
      if (m) m.visible = false;
    if (S.parkMeshes) for (const m of Object.values(S.parkMeshes)) if (m && m.isObject3D) m.visible = false;
    if (S.ruf) for (const m of [S.ruf.plates, S.ruf.posts, S.ruf.van, S.ruf.vsh, S.ruf.win]) if (m) m.visible = false;
    S.rufOn = false;
    S.floodLevel = 0;
    bank(false);
    dry(0);
    weather(null);
    if (S.brookMeshes) brookLevel(0);
    forest(null, 2026, 0);
    if (G('FOREST') && FOREST.canopy) FOREST._cov0 = null;
    // trees back to what they were
    if (S.forest) {
      const Fo = S.forest,
        F = G('FOREST');
      for (let i = 0; i < Fo.L.length; i++) {
        const t = Fo.L[i],
          o = Fo.orig[i];
        if (t.h !== o.h || t.w !== o.w || t._zkFall) {
          t.h = o.h;
          t.w = o.w;
          if (t._zkFall) {
            t.tilt = o.tilt;
            t._zkFall = false;
          }
          F.retilt(t);
        }
        if (t.tint !== o.tint) F.tint(t, o.tint);
        Fo.code[i] = -1;
      }
    }
    S.state = {};
    markDirty(true);
  }

  // ---------- what the world tells the numbers ----------
  function busStats() {
    const B = G('BUS'),
      bp = B && B.plan;
    if (!bp || !bp.S) return null;
    if (!bp.S.stations.length || !bp.S.trips.length) {
      // the timetable loads lazily: ask for it, the mode refreshes on 'bus:bereit'
      try {
        if (B && B.load) B.load();
      } catch (e) {}
      return null;
    }
    const rat = new Set(bp.S.stations.filter(x => /^Ratscher\b/.test(x.n) && !/Stausee/.test(x.n)).map(x => x.i)),
      sch = new Set(bp.S.stations.filter(x => /^Schleusingen\b/.test(x.n)).map(x => x.i));
    const e0 = (DN && Number.isFinite(DN.e0) ? DN.e0 : 20605) + Math.floor(((CLOCK && CLOCK.t) || 0) / 1440);
    const out = { werk: 0, sa: 0, so: 0, min: 0, src: 'fahrplan' };
    const want = { werk: 3, sa: 6, so: 0 };
    for (const k of Object.keys(want)) {
      for (let d = 0; d < 14; d++) {
        const e = e0 + d;
        if (new Date(e * 864e5).getUTCDay() !== want[k]) continue;
        let n = 0,
          tot = 0;
        for (const t of bp.tripsOn(e)) {
          const P = bp.S.pats[t.pat];
          if (!P) continue;
          // from the first Ratscher stop to the last Schleusingen stop of the trip (the centre, where the way leads)
          let k1 = -1,
            k2 = -1;
          for (let j = 0; j < P.st.length; j++) {
            if (k1 < 0 && rat.has(P.st[j].s)) k1 = j;
            else if (k1 >= 0 && sch.has(P.st[j].s)) k2 = j;
          }
          if (k2 > k1 && k1 >= 0) {
            n++;
            tot += (t.a[k2] - t.d[k1]) | 0;
          }
        }
        out[k] = n;
        if (k === 'werk' && n) out.min = Math.round(tot / n);
        break;
      }
    }
    return out;
  }
  function ctx() {
    const R = scanRoofs(),
      Pk = parkLayout(),
      Fo = G('FOREST');
    const c = {
      roof: { kwp: R.kwp, area: R.area, n: R.n, src: 'welt' },
      field: { kwp: Pk.kwp, ha: Pk.ha, src: 'welt' },
    };
    const b = busStats();
    if (b) c.bus = b;
    try {
      if (G('TEINFLUSS') && TEINFLUSS.naturwert) c.nat0 = TEINFLUSS.naturwert();
    } catch (e) {}
    if (Fo && Fo.list) {
      const sp = Fo.list.filter(t => t.sp === 'spruce').length;
      c.forest = { ha: 16.8, spruce: sp / Math.max(1, Fo.list.length) };
    }
    return c;
  }
  // places to look from (tests, pictures): the roofs with most modules, the park, the flood, the forest, the stop
  function spots() {
    const R = S.roof || scanRoofs(),
      Pk = parkLayout();
    // village houses with the most modules, and a place in the open in front of each (downslope, 12–34 m away)
    const big = [];
    for (const p of R.P.filter(q => !q.flat && q.typ === 0 && q.mods.length >= 8)
      .slice()
      .sort((a, b) => b.mods.length - a.mods.length)) {
      const hl = Math.hypot(p.n[0], p.n[1]) || 1,
        dx = p.n[0] / hl,
        dy = p.n[1] / hl;
      for (let d = 16; d <= 34; d += 2) {
        const x = p.cx + dx * d,
          y = p.cy + dy * d;
        if ([0, 1.5, -1.5].some(o => villageAt(x - dy * o, y + dx * o))) continue;
        const z = gnd(x, y) + 1.7;
        big.push({
          x: +p.cx.toFixed(1),
          y: +p.cy.toFixed(1),
          n: p.mods.length,
          cam: [+x.toFixed(1), +y.toFixed(1)],
          yaw: +(((Math.atan2(-dx, -dy) * 180) / Math.PI + 360) % 360).toFixed(1),
          pitch: +((Math.atan2(p.cz - z, d) * 180) / Math.PI).toFixed(1),
        });
        break;
      }
      if (big.length >= 3) break;
    }
    let cx = 0,
      cy = 0;
    for (const t of Pk.T) {
      cx += t.x / Math.max(1, Pk.T.length);
      cy += t.y / Math.max(1, Pk.T.length);
    }
    const F = G('FOREST'),
      core = F && F.CORE ? F.CORE : null;
    let fx = -470,
      fy = -600;
    if (core) {
      fx = core.reduce((s, p) => s + p[0], 0) / core.length;
      fy = core.reduce((s, p) => s + p[1], 0) / core.length;
    }
    // the forest: a clear place 10–18 m from the spruces of the family forest the beetle takes first (looking at them), and one at the
    // edge of the family forest towards the field, looking in
    const forest = {};
    if (F && F.list && F.inCore) {
      const Fo = forestInit(),
        first = Fo.L.map((t, i) => ({ t, i }))
          .filter(o => Fo.core[o.i])
          .sort((a, b) => Fo.rank[a.i] - Fo.rank[b.i])
          .slice(0, 25);
      const free = (x, y, r) =>
        !F.list.some(
          t => !t.gone && Math.abs(t.x - x) < r && Math.abs(t.y - y) < r && Math.hypot(t.x - x, t.y - y) < r
        );
      if (first.length) {
        const mx = first.reduce((a, o) => a + o.t.x, 0) / first.length,
          my = first.reduce((a, o) => a + o.t.y, 0) / first.length;
        outer: for (const d of [12, 15, 10, 18])
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2,
              x = mx + Math.cos(a) * d,
              y = my + Math.sin(a) * d;
            if (!F.inCore(x, y) || !free(x, y, 2.6)) continue;
            forest.inside = [
              +x.toFixed(1),
              +y.toFixed(1),
              +(((Math.atan2(mx - x, my - y) * 180) / Math.PI + 360) % 360).toFixed(1),
            ];
            break outer;
          }
      }
      if (core) {
        const a = core[1],
          b = core[2],
          ex = (a[0] + b[0]) / 2,
          ey = (a[1] + b[1]) / 2,
          l = Math.hypot(b[0] - a[0], b[1] - a[1]),
          nx = -(b[1] - a[1]) / l,
          ny = (b[0] - a[0]) / l,
          sg = nx * (ex - fx) + ny * (ey - fy) > 0 ? 1 : -1,
          x = ex + nx * sg * 7,
          y = ey + ny * sg * 7;
        forest.edge = [
          +x.toFixed(1),
          +y.toFixed(1),
          +(((Math.atan2(fx - x, fy - y) * 180) / Math.PI + 360) % 360).toFixed(1),
        ];
      }
    }
    return {
      roofs: big,
      park: [+cx.toFixed(1), +cy.toFixed(1)],
      station: PARK.station,
      core: [fx, fy],
      forest,
      river: RIVER,
      anger: ANGER,
    };
  }
  function stats() {
    const cnt = m => (m && m.visible ? m.count : 0);
    const Fo = S.forest;
    const codes = {};
    const name = c =>
      c < 0
        ? 'x'
        : c === 0
          ? 'ok'
          : c === 1
            ? 'rot'
            : c === 2
              ? 'grau'
              : c === 3
                ? 'kahl'
                : c === 5
                  ? 'liegt'
                  : c === 900
                    ? 'stress'
                    : 'jung';
    if (Fo) for (const c of Fo.code) codes[name(c)] = (codes[name(c)] || 0) + 1;
    const young = {};
    if (S.young) for (const [k, im] of Object.entries(S.young)) young[k] = cnt(im);
    if (S.ez) for (const [k, E] of Object.entries(S.ez)) young['ez-' + k] = cnt(E.leaf);
    return {
      roofModules: cnt(S.roofMesh) + cnt(S.flatMesh),
      roofTotal: S.roof ? S.roof.mods.length + S.roof.flats.length : 0,
      roofPlanes: S.roof ? S.roof.P.length : 0,
      roofMs: S.roof ? S.roof.ms : 0,
      roofWhy: S.roofWhy || null,
      roofDbg: S.roofDbg || null,
      fieldTables: S.parkMeshes ? cnt(S.parkMeshes.tm) : 0,
      fieldTotal: S.park ? S.park.T.length : 0,
      fence: S.parkMeshes ? cnt(S.parkMeshes.fm) : 0,
      station: !!(S.parkMeshes && S.parkMeshes.sm.visible),
      wp: cnt(S.wpMesh),
      van: !!(S.ruf && S.ruf.van && S.ruf.van.visible),
      rufbusRuns: rufbusRuns(),
      plates: S.ruf && S.ruf.plates && S.ruf.plates.visible ? S.ruf.n : 0,
      bank: !!(G('AMTWORLD') && AMTWORLD.S && AMTWORLD.S.items.mitfahrbank),
      flood: S.floodMesh && S.floodMesh.visible ? S.floodLevel : 0,
      floodInfo: S.floodInfo || null,
      mud: !!(S.mudMesh && S.mudMesh.visible),
      brookDz: S.brookDz || 0,
      // 'jung': every young tree – the regrown slots and the young stand's instances (saplings, tall broadleaf)
      forest: Object.assign({}, codes, {
        jung:
          (codes.jung || 0) +
          Object.entries(young).reduce((a, [k, v]) => a + (/^(stump|brush|guard)$/.test(k) ? 0 : v), 0),
      }),
      young,
      warmed: S.warmed,
      dry: WXBODEN && WXBODEN.S ? WXBODEN.S.dry : 0,
      err: S.err || null,
    };
  }
  return {
    warm,
    apply,
    clear,
    ctx,
    stats,
    spots,
    scanRoofs,
    fieldTables: parkLayout,
    busStats,
    PARK,
    MOD,
    TABLE,
    RIVER,
    S,
    treeCodes: () => (S.forest ? S.forest.code : null),
  };
})();
window.ZKWELT = ZKWELT;
