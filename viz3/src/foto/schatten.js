// ===================== feat/fotorealismus: the sun's shadows beyond the walker's own box (SCHATTEN) =====================
// The sun's shadow map (garden/env.js: one box of ±16 m that follows the walker, drawn anew only when the sun or the box has moved)
// becomes an atlas – see foto/schatten_glsl.js for the shader side. This module draws the two tiles on its right:
//   far   ±96 m (wider when the own box is: at the wheel, in the plan view), a texel of 5–19 cm: houses, trees, sheds, the village;
//   wide  ±640 m, a texel of 0.3–1.3 m: the village as a whole, edges of woods, single trees in the fields.
// Each tile is three's own shadow pass for a directional light that is not in the scene (so it is no light for any shader, and the
// depth materials, alpha-tested leaves and custom depth materials are those of the sun's map), into a target of its own; after every
// new map of the sun – three clears the whole atlas for it – the tiles are copied back in (one small draw each). A tile is drawn anew
// only when the sun has turned a visible step since (1° far, 2° wide), when the walker has left its middle third, or a moment after the
// scene itself changed – one tile a frame, and not in the frame that draws the sun's own map (a stutter otherwise, V17g). A tile draws
// the trees in their coarsest level and leaves out what is smaller than its texels can show (under 1 m far, 2.5 m wide; in the wide one
// dense small trees too) and whatever follows the camera (the forest's trees: their light beyond the box is the forest's own).
// What the real land needs for it: the terrain, the village's walls and roofs and the trees of the canopy model receive the sun's
// shadow, and the buildings and trees cast one (they did neither: nothing reached beyond the garden's box anyway) – also inside the
// walker's box where the tiles are off. The rest of the world as it is built (the ground tiles of the land beyond the square, the
// buildings of every place) by its meshes' names; a module adds its own with SCHATTEN.add.
// The hills cast too, at a low sun (under 19°): not into the tiles but as a field of heights that foto/schatten_land.js works out – for
// ±3 km around the walker the height below which the land towards the sun hides it. It lies in a strip of 256 texels right of the tiles
// and is copied in again like them; anew whenever the sun has moved (a millisecond or two on the CPU, no drawing), so a hill's shadow
// creeps across the valley with the clock. Every lit material reads it (foto/schatten_glsl.js sunLand). ?nohuegel leaves it out.
// Off on the tier „schnell“ and on phones and tablets (memory: the atlas is half as large again, the tiles have their targets) unless
// switched on by hand: Menü → Einstellungen → Grafik → „Schatten in der Ferne“ (auto / an / aus, pav-schatten-v1); ?kaskade=an|aus.
//   SCHATTEN.state()        { on, mode, tiles: [{ name, ok, R, n, calls, tris, ms }], blits, atlas: [w, h], land: { … } }   (tests)
//   SCHATTEN.set({ mode })  'auto' | 'an' | 'aus'; { debug: true } tints what each cascade covers (red own box, green far, blue wide,
//                           magenta light where a hill's shadow lies); { land: false } leaves the hills' shadows out
//   SCHATTEN.settle()       draws the tiles that are due at once (tests, pictures) – in the game they come a frame or two later
//   SCHATTEN.add(mesh, { cast, receive, roof })   a module's own thing into the sun's shadows (roof: an open sheet, both sides cast)
import * as THREE from 'three';
import { $, cam, COARSE, QS, R, scene, V } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { CULL, markDirty, VEG, whenLoaded } from '../core/assets.js';
import { sun, sunC, sunHalf } from '../garden/env.js';
import { RENDER } from '../render/render.js';
import { RATSCHER } from '../world/ratscher.js';
import { CSMU, SM_RENDER0 } from './schatten_glsl.js';
import { SCHLAND } from './schatten_land.js';
export const SCHATTEN = (() => {
  const sm = R.shadowMap,
    // the atlas' width in the sun's own map sizes: the tiles are half that size, one above the other, and right of them the strip
    // of the land's field (256 texels whatever the map's size)
    ext = () => 1.5 + SCHLAND.G / sun.shadow.mapSize.x,
    MODES = ['auto', 'an', 'aus'],
    KEY = SAVE.key('pav-schatten-v1', {
      owner: 'fotorealismus',
      kind: 'text',
      def: 'auto',
      check: v => MODES.includes(v),
    });
  const S = {
    ok: !!CSMU.ok,
    on: false,
    mode: SAVE.get(KEY),
    tiles: [],
    pending: null,
    blits: 0,
    nearDir: new THREE.Vector3(),
    nearC: new THREE.Vector3(1e9, 0, 0),
    nearN: 0,
    land: !QS.has('nohuegel'),
  };
  // the hills' shadows: the field as it was last worked out (for which light, around which point), how much of it shows
  const LD = {
    have: false, // a field is worked out
    inAtlas: false, // … and copied into the atlas as it is now
    k: 0, // how much of it the sun's height lets show: all under 15°, nothing from 19°
    shown: 0, // what the shaders use (k, faded in and out)
    dir: new THREE.Vector3(0, 1, 0),
    x: 1e9,
    y: 0,
    t: -1e9,
    n: 0,
    acc: 0,
  };
  // degrees: the hills' shadows in full below, none above – at 19° a five-hundredth of the land around Ratscher lies in one, at 10° a
  // fifteenth, at 6° a fifth, at 3° half (and the shaders read the field only while it shows)
  const LAND_EL = [15, 19],
    LAND_SOFT = 0.75, // the edge's softness at least (m of height)
    LAND_MS = 1, // a frame's share of sampling the heights while cells are missing (ms)
    LAND_STEP = 0.6; // … and of working out a field
  {
    const q = QS.get('kaskade');
    if (MODES.includes(q)) S.mode = q;
    if (QS.has('nokaskade')) S.mode = 'aus';
  }
  const _d = new THREE.Vector3(),
    _c = new THREE.Vector3(),
    _v = new THREE.Vector3(),
    _x = new THREE.Vector3(),
    _y = new THREE.Vector3(),
    _m = new THREE.Matrix4(),
    _inv = new THREE.Matrix4(),
    _vp = new THREE.Vector4(),
    _q = new THREE.Quaternion();
  // a tile: its light (never in the scene), where and with which sun it was last drawn, what it cost
  const mkTile = (name, o) => {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.castShadow = true;
    light.shadow.autoUpdate = false;
    light.shadow.bias = 0;
    light.shadow.normalBias = 0;
    return Object.assign(
      {
        name,
        light,
        M: new THREE.Matrix4(),
        c: new THREE.Vector3(),
        dir: new THREE.Vector3(0, 1, 0),
        R: 0,
        range: 1,
        texel: 1,
        ok: false,
        dirty: false,
        due: '',
        defer: 0,
        t: -1e9,
        n: 0,
        calls: 0,
        tris: 0,
        ms: 0,
      },
      o
    );
  };
  // step: the sun's turn (rad) that asks for a new tile; wait: ms a tile rests at least (rest: after a mere change in the scene);
  // minR: smaller things cast nothing into it;
  // dense: nor do instanced things with more triangles than this in under 8 m; rect: its place in the atlas in units of the sun's map
  S.tiles.push(mkTile('far', { step: 0.0175, wait: 1200, rest: 10000, minR: 1, dense: 0, rect: [1, 0] }));
  S.tiles.push(mkTile('wide', { step: 0.035, wait: 3500, rest: 30000, minR: 2.5, dense: 3000, rect: [1, 0.5] }));
  const [FAR, WIDE] = S.tiles;
  // the tiles' half sizes follow the sun's own box: ±16 m on foot, ±32 m at the wheel from 65 km/h, up to ±90 m in the plan view
  const farR = () => Math.min(288, Math.max(96, sunHalf * 6)),
    wideR = () => Math.max(640, farR() * 3);
  const want = () =>
    S.ok &&
    (S.mode === 'an' || (S.mode === 'auto' && RENDER.tier !== 'schnell' && !COARSE)) &&
    sun.castShadow &&
    R.capabilities.maxTextureSize >= sun.shadow.mapSize.x * 1.5 + SCHLAND.G;
  // ---- on and off: the atlas' shape (three makes the sun's map anew, with or without room for the tiles) ----
  function apply() {
    const on = want(),
      e = on ? ext() : 1;
    // (the width again when the map's size has changed with the tier: the land's strip is as many texels at every size)
    if (on === S.on && Math.abs(sun.shadow._frameExtents.x - e) < 1e-9) return false;
    S.on = on;
    sun.shadow._frameExtents.set(e, 1);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    for (const t of S.tiles) {
      t.ok = false;
      t.due = '';
      if (!on && t.light.shadow.map) {
        t.light.shadow.map.dispose();
        t.light.shadow.map = null;
      }
    }
    S.pending = null;
    LD.inAtlas = false;
    if (!on) {
      LD.shown = 0;
      uniforms();
    }
    label();
    markDirty(true);
    return true;
  }
  // ---- what the shaders read ----
  function uniforms() {
    const P = CSMU.P,
      H = CSMU.H,
      live = S.on && !!sun.shadow.map;
    P[1] = 1 / sun.shadow._frameExtents.x;
    if (live) _inv.copy(sun.shadow.matrix).invert();
    // the land's field: from the sun's shadow coordinate back to the world and into the field's cells
    if (live && LD.have && LD.inAtlas && LD.shown > 0) {
      CSMU.L.set(_m.multiplyMatrices(SCHLAND.Lw, _inv).elements);
      H[0] = SCHLAND.G;
      H[1] = SCHLAND.STEP;
      H[2] = LAND_SOFT;
      H[3] = LD.shown;
    } else H[3] = 0; // not read (foto/schatten_glsl.js: the loop's round)
    if (!live || !FAR.ok) {
      P[0] = 0;
      CSMU.Q[0] = CSMU.Q[2] = 0; // no tile is read (the loops' rounds)
      return;
    }
    CSMU.M.set(_m.multiplyMatrices(FAR.M, _inv).elements);
    P[2] = Math.max(0.25, FAR.texel * 1.6) / FAR.range;
    if (WIDE.ok) {
      CSMU.N.set(_m.multiplyMatrices(WIDE.M, _inv).elements);
      P[3] = (WIDE.texel * 1.6) / WIDE.range;
    }
    P[0] = WIDE.ok ? 2 : 1;
    // four taps a tile, nine where a tile has 1024² and more
    const nine = sun.shadow.mapSize.x >= 2048;
    CSMU.Q[0] = nine ? 0 : 4;
    CSMU.Q[2] = nine ? 9 : 0;
  }
  // ---- the light's direction and the middle the tiles should cover now ----
  const dirNow = out => out.subVectors(sun.position, sun.target.position).normalize();
  function centreNow(out) {
    const x = sunC[0],
      y = sunC[1];
    let z = 0;
    try {
      z = KERN.ground(x, y) || 0;
    } catch (e) {}
    return out.copy(V(x, y, (Number.isFinite(z) ? z : 0) + 2));
  }
  // ---- what a tile leaves out and how coarse it draws: its texel is 5 cm to over a metre ----
  // Small things cast nothing into it: single meshes by their radius (core/assets.js CULL keeps every mesh under 4 m across with it),
  // instanced ones by the radius of one instance (stepping stones, ferns, pots – found here, looked for again when geometry is new).
  const _off = [],
    INST = { list: [], geo: -1, t: -1e9 };
  function instScan() {
    const L = [],
      sv = new THREE.Vector3();
    scene.traverse(o => {
      if (!o.isInstancedMesh || !o.castShadow || !o.geometry || !o.count) return;
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere) return;
      o.getMatrixAt(0, _m);
      _m.decompose(_v, _q, sv);
      const n = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
      L.push({
        o,
        r: g.boundingSphere.radius * Math.max(Math.abs(sv.x), Math.abs(sv.y), Math.abs(sv.z)),
        tris: n / 3,
        // instances rewritten as the camera moves (the forest's trees and ferns around it, world/forest.js): theirs is the walker's
        // box alone – beyond it the forest dims the light under its crowns itself (its canopy map), a tile's shadow would double it
        dyn: !!(o.instanceMatrix && o.instanceMatrix.usage === THREE.DynamicDrawUsage),
      });
    });
    INST.list = L;
    INST.geo = R.info.memory.geometries;
    INST.t = performance.now();
  }
  function small(minR, dense) {
    if (minR) {
      if (R.info.memory.geometries !== INST.geo && performance.now() - INST.t > 3000) instScan();
      for (const e of CULL.list)
        if (e.r < minR && e.o.castShadow) {
          e.o.castShadow = false;
          _off.push(e.o);
        }
      // dense: a tile with texels of half a metre and more also leaves out what has thousands of triangles in a few metres (a fruit
      // tree of 15 000 leaf cards is a handful of its texels)
      for (const e of INST.list)
        if (e.o.castShadow && (e.dyn || e.r < minR || (dense && e.tris > dense && e.r < 8))) {
          e.o.castShadow = false;
          _off.push(e.o);
        }
    } else {
      for (const o of _off) o.castShadow = true;
      _off.length = 0;
    }
  }
  // Trees in their coarsest level that casts a shadow (core/assets.js VEG: bark as trunk and main boughs, the crown with a sixth of
  // its cards, grown to cover the same) – whatever level the view shows them in; afterwards each set shows its own level again.
  function coarse(on) {
    for (const L of VEG.lod) {
      if (!L.ms) continue;
      let k = L.cur || 0;
      if (on)
        for (let j = L.ms.length - 1; j > k; j--)
          if (L.ms[j].castShadow) {
            k = j;
            break;
          }
      for (let j = 0; j < L.ms.length; j++) L.ms[j].visible = j === k;
    }
  }
  // ---- one tile drawn: three's shadow pass for its light, counted ----
  function draw(t, scn, camera) {
    const L = t.light,
      sh = L.shadow,
      T = Math.max(256, sun.shadow.mapSize.x >> 1),
      Rw = t === FAR ? farR() : wideR(),
      t0 = performance.now();
    if (sh.mapSize.x !== T) {
      sh.mapSize.set(T, T);
      if (sh.map) {
        sh.map.dispose();
        sh.map = null;
      }
    }
    const dir = dirNow(_d),
      c = centreNow(_c),
      el = Math.asin(Math.max(0.02, Math.min(1, dir.y))),
      // deep enough along the light that what stands in the tile's footprint on the ground is inside (a low sun: a long footprint)
      Dh = Math.min(
        t === FAR ? 1500 : 3200,
        Math.max(t === FAR ? 250 : 800, (1.2 * Rw) / Math.max(Math.tan(el), 0.07))
      ),
      cm = sh.camera;
    // the middle snapped to the tile's texels (seen from the light), so a tile drawn anew a little further on does not shimmer
    cm.position.copy(c).addScaledVector(dir, Dh);
    cm.up.set(0, 1, 0);
    cm.lookAt(c);
    cm.updateMatrixWorld();
    _x.setFromMatrixColumn(cm.matrixWorld, 0);
    _y.setFromMatrixColumn(cm.matrixWorld, 1);
    const tex = (2 * Rw) / T,
      sx = c.dot(_x),
      sy = c.dot(_y);
    c.addScaledVector(_x, Math.round(sx / tex) * tex - sx).addScaledVector(_y, Math.round(sy / tex) * tex - sy);
    L.position.copy(c).addScaledVector(dir, Dh);
    L.target.position.copy(c);
    L.updateMatrixWorld();
    L.target.updateMatrixWorld();
    cm.left = cm.bottom = -Rw;
    cm.right = cm.top = Rw;
    cm.near = 1;
    cm.far = 2 * Dh;
    cm.updateProjectionMatrix();
    sh.needsUpdate = true;
    const keep = sm.needsUpdate,
      I = R.info.render,
      c0 = I.calls,
      t3 = I.triangles;
    small(t.minR, t.dense);
    coarse(true);
    sm.needsUpdate = true;
    try {
      SM_RENDER0([L], scn, camera);
    } finally {
      coarse(false);
      small(0);
      sm.needsUpdate = keep;
    }
    t.M.copy(sh.matrix);
    t.c.copy(c);
    t.dir.copy(dir);
    t.R = Rw;
    t.range = 2 * Dh - 1;
    t.texel = tex;
    t.ok = !!sh.map;
    t.dirty = false;
    t.due = '';
    t.defer = 0;
    t.t = performance.now();
    t.n++;
    t.calls = I.calls - c0;
    t.tris = I.triangles - t3;
    t.ms = Math.round(t.t - t0);
  }
  // ---- a tile copied into its place in the atlas: a small render of its own (a scene with one triangle over the tile's rectangle;
  //      three allows a render inside a render, and after a lost context it sets the triangle up again by itself) ----
  const blitMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: null } },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D( t, vUv ); }',
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      fog: false,
      toneMapped: false,
    }),
    blitGeo = new THREE.BufferGeometry(),
    blitScene = new THREE.Scene(),
    blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  blitGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0.5, 3, -1, 0.5, -1, 3, 0.5]), 3)
  );
  {
    const me = new THREE.Mesh(blitGeo, blitMat);
    me.frustumCulled = false;
    me.matrixAutoUpdate = false;
    blitScene.add(me);
    blitScene.matrixWorldAutoUpdate = false;
  }
  function blit(list, land) {
    const A = sun.shadow.map;
    if (!A) return;
    const N = sun.shadow.mapSize,
      rt = R.getRenderTarget(),
      face = R.getActiveCubeFace(),
      mip = R.getActiveMipmapLevel(),
      ac = R.autoClear;
    R.autoClear = false; // three has just cleared the atlas for the sun's own map; nothing of it may go
    try {
      const put = (tex, x, y, w, h) => {
        _vp.set(x, y, w, h);
        A.viewport.copy(_vp);
        A.scissor.copy(_vp);
        A.scissorTest = true;
        blitMat.uniforms.t.value = tex;
        R.setRenderTarget(A);
        R.render(blitScene, blitCam);
        S.blits++;
      };
      for (const t of list) {
        const src = t.ok && t.light.shadow.map;
        if (src) put(src.texture, t.rect[0] * N.x, t.rect[1] * N.y, N.x * 0.5, N.y * 0.5);
      }
      // the land's field: texel for texel into its strip right of the tiles
      if (land && LD.have && A.width >= N.x * 1.5 + SCHLAND.G) {
        put(SCHLAND.tex, N.x * 1.5, 0, SCHLAND.G, SCHLAND.G);
        LD.inAtlas = true;
      }
    } finally {
      A.viewport.set(0, 0, A.width, A.height);
      A.scissor.set(0, 0, A.width, A.height);
      A.scissorTest = false;
      R.autoClear = ac;
      R.setRenderTarget(rt, face, mip);
    }
  }
  // ---- the shadow pass of the main scene: the sun's own map as before, the tiles around it ----
  const prev = sm.render;
  sm.render = function (lights, scn, camera) {
    const own = scn === scene && lights.indexOf(sun) >= 0;
    // the atlas' shape before three makes the map: the switch, the map's size (a tier just chosen) – and its map in this very frame
    if (own && apply()) sm.needsUpdate = true;
    if (!S.on || !own) return prev.call(sm, lights, scn, camera);
    const near = sm.needsUpdate,
      p = S.pending;
    // a tile that is due: not in the frame that draws the sun's own map, unless it has waited twice already or was never drawn
    if (p && (!near || !p.ok || p.defer >= 2)) {
      S.pending = null;
      try {
        draw(p, scn, camera);
      } catch (e) {
        console.warn('Schatten in der Ferne', e);
        S.ok = false;
        apply();
        return prev.call(sm, lights, scn, camera);
      }
      if (!near) {
        blit([p]);
        uniforms();
      }
    } else if (p) p.defer++;
    if (!near) return prev.call(sm, lights, scn, camera);
    const r = prev.call(sm, lights, scn, camera);
    // the scene itself changed (a phase, a zone built, textures arrived) when the sun's map was asked for although neither the sun
    // nor its box has moved: the tiles follow a moment later
    dirNow(_d);
    if (S.nearN && _d.angleTo(S.nearDir) < 1e-4 && sun.target.position.distanceToSquared(S.nearC) < 1e-4)
      for (const t of S.tiles) t.dirty = true;
    S.nearDir.copy(_d);
    S.nearC.copy(sun.target.position);
    S.nearN++;
    blit(S.tiles, true);
    uniforms();
    if (S.pending) markDirty(); // the tile that waited: in the next frame
    return r;
  };
  // ---- which tile is due (a few times a second; draws nothing itself) ----
  function check(force) {
    apply();
    if (!S.on || S.pending) return;
    const now = performance.now(),
      dir = dirNow(_d),
      lit = sun.intensity > 0.02 && dir.y > 0.02;
    centreNow(_c);
    for (const t of S.tiles) {
      let due = '';
      if (!force && now - t.t < t.wait) due = '';
      else if (!t.ok) due = lit ? 'first' : '';
      else if (!lit) due = '';
      else if (dir.angleTo(t.dir) > t.step) due = 'sun';
      else if (Math.abs((t === FAR ? farR() : wideR()) - t.R) > 1) due = 'size';
      else if (t.light.shadow.mapSize.x !== Math.max(256, sun.shadow.mapSize.x >> 1)) due = 'tier';
      // (something in the scene changed while sun and box stood still – a door, a felled tree, a part of the world just built. What
      // matters close by is in the walker's box at once; a tile follows at its leisure, or a thing that keeps moving – the laundry
      // in the wind – would have both tiles drawn every few seconds while one only stands there)
      else if (t.dirty && (force || now - t.t > t.rest)) due = 'scene';
      else {
        // how far the middle has moved across the light (along it nothing changes for the tile)
        _v.subVectors(_c, t.c);
        _v.addScaledVector(t.dir, -_v.dot(t.dir));
        if (_v.length() > t.R * 0.3) due = 'move';
      }
      t.due = due;
      if (due && !S.pending) S.pending = t;
    }
  }
  // ---- the hills' shadows: the heights sampled a little every frame, the field anew when the light has moved ----
  function landDone() {
    LD.have = true;
    LD.t = performance.now();
    LD.n++;
    blit([], true);
    uniforms();
    markDirty();
  }
  function landCheck(force) {
    if (!S.on || !S.land) {
      LD.k = 0;
      return;
    }
    const dir = dirNow(_d),
      el = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI,
      lit = sun.intensity > 0.02 && dir.y > 0.02;
    if (!lit) return; // no light to hide: as it is
    LD.k = Math.max(0, Math.min(1, (LAND_EL[1] - el) / (LAND_EL[1] - LAND_EL[0])));
    if (el > LAND_EL[1] + 0.5 || !SCHLAND.S.ready || SCHLAND.W.on) return;
    const x = sunC[0],
      y = sunC[1];
    // anew: the light a twentieth of a degree on, the walker 240 m from the field's middle, or heights that have changed (a part
    // of the world arrived) – those at their leisure
    if (
      !force &&
      LD.have &&
      dir.angleTo(LD.dir) < 0.0009 &&
      Math.hypot(x - LD.x, y - LD.y) < 240 &&
      !(SCHLAND.S.changed > 200 && performance.now() - LD.t > 1500)
    )
      return;
    if (!SCHLAND.begin(dir, x, y)) {
      LD.k = 0;
      return;
    }
    LD.dir.copy(dir);
    LD.x = x;
    LD.y = y;
  }
  function landFrame(dt) {
    if (!S.on) return;
    if (S.land) {
      SCHLAND.work(LAND_MS, sunC[0], sunC[1]);
      // a field in the making: some of its columns in every frame, in the atlas when it is whole
      if (SCHLAND.W.on) {
        if (SCHLAND.step(LAND_STEP)) landDone();
      } else {
        LD.acc += dt;
        if (LD.acc >= 0.1) {
          LD.acc = 0;
          landCheck(false);
        }
      }
    } else LD.k = 0;
    // in and out over a second or so (the field is there a moment after the page, and gone when switched off)
    const to = LD.have ? LD.k : 0;
    if (LD.shown !== to) {
      const d = Math.min(0.1, dt) / 1.2;
      LD.shown = to > LD.shown ? Math.min(to, LD.shown + d) : Math.max(to, LD.shown - d);
      uniforms();
      markDirty();
    }
  }
  let acc = 0;
  KERN.tick(dt => {
    landFrame(dt);
    acc += dt;
    if (acc < 0.2) return;
    acc = 0;
    sweep();
    check(false);
    if (S.pending) markDirty();
  }, 'foto/schatten');
  // tests and pictures: the tiles that are due drawn now – each in a frame of its own into a tiny target (three's shadow pass needs a
  // running render of the scene; the target is of the kind the composer draws into, so no program is new). Returns the frames it took.
  let tiny = null;
  function settle(n = 6) {
    let k = 0;
    apply();
    if (S.on && S.land) {
      // the hills' shadows: all the heights now, the field for the light as it stands, shown as much as the sun's height says
      for (let g = 0; g < 400 && !SCHLAND.S.ready; g++) SCHLAND.work(50, sunC[0], sunC[1]);
      if (SCHLAND.W.on) SCHLAND.step(1e4);
      landCheck(true);
      if (SCHLAND.W.on && SCHLAND.step(1e4)) landDone();
      LD.shown = LD.have ? LD.k : 0;
      uniforms();
    }
    for (let i = 0; i < n && S.on; i++) {
      check(true);
      if (!S.pending && !sm.needsUpdate) break;
      if (!tiny) tiny = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
      const rt = R.getRenderTarget();
      R.setRenderTarget(tiny);
      try {
        R.render(scene, cam);
      } finally {
        R.setRenderTarget(rt);
      }
      k++;
    }
    return k;
  }
  // ---- the real land takes part: receives the sun's shadow, and what stands on it casts one ----
  function land() {
    if (!RATSCHER.on) return;
    for (const m of RATSCHER.meshes || []) m.receiveShadow = true;
    // the village: walls and roofs (RATSCHER.bld[0], [1]) and what the other modules hang into the same list – the centre's things, the
    // lime trees, the buildings the app lacked (gebaeude/gebaeude.js). The roofs are open sheets: both sides into the sun's map, or a
    // roof would cast nothing (three draws only the backs of single-sided things into a shadow map).
    (RATSCHER.bld || []).forEach((m, i) => {
      if (m && m.isMesh) add(m, { cast: true, receive: true, roof: i === 1 || /\broofs\b/.test(m.name || '') });
    });
    for (const m of RATSCHER.mid || []) m.castShadow = m.receiveShadow = true;
    for (const m of RATSCHER.trees || []) cards(m);
    markDirty(true);
  }
  // ---- the rest of the world, as it comes (the tiles of the land beyond the square, the buildings of every place): by their names ----
  //   SCHATTEN.add(mesh, { cast, receive, roof })   for a module that wants its own things in (roof: an open sheet – both its sides
  //   into the shadow map)
  const RULES = [
    [/^welt /, { receive: true }], // welt/welt.js: the ground of the world's tiles
    [/^gebaeude /, { cast: true, receive: true }], // gebaeude/gebaeude.js: walls and roofs of a cell of buildings
  ];
  function add(m, o = {}) {
    if (!m || !m.isMesh) return;
    if (o.receive !== undefined) m.receiveShadow = !!o.receive;
    if (o.cast !== undefined) m.castShadow = !!o.cast;
    if (o.roof && m.material && !Array.isArray(m.material)) m.material.shadowSide = THREE.DoubleSide;
    m.userData.schatten = 1;
  }
  const SW = { n: -1, g: -1 };
  function sweep() {
    const n = scene.children.length,
      g = R.info.memory.geometries;
    if (n === SW.n && g === SW.g) return;
    SW.n = n;
    SW.g = g;
    let ch = 0;
    for (const o of scene.children) {
      if (!o.isMesh || o.userData.schatten || !o.name) continue;
      const r = RULES.find(q => q[0].test(o.name));
      if (!r) continue;
      add(o, Object.assign({ roof: /\broofs\b/.test(o.name) }, r[1]));
      ch++;
    }
    if (ch) markDirty(true);
  }
  // the far trees are crossed cards with a picture out of an atlas (one column per kind, world/ratscher.js): their depth material reads
  // the same column, else every card would cast the shadows of all five kinds side by side
  let cardDepth = null;
  function cards(im) {
    const m = im.material;
    if (!m || !m.map || !im.geometry.getAttribute('aKind')) return;
    if (!cardDepth) {
      const nK = Math.max(1, Math.round(m.map.image.width / Math.max(1, m.map.image.height)));
      cardDepth = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: m.map,
        alphaTest: m.alphaTest,
        side: THREE.DoubleSide,
      });
      cardDepth.onBeforeCompile = sh => {
        sh.vertexShader =
          'attribute float aKind;\n' +
          sh.vertexShader.replace(
            '#include <uv_vertex>',
            `#include <uv_vertex>\n vMapUv.x = ( aKind + vMapUv.x ) / ${nK.toFixed(1)};`
          );
      };
      cardDepth.customProgramCacheKey = () => 'geotree-depth';
    }
    im.customDepthMaterial = cardDepth;
    im.castShadow = true;
    im.receiveShadow = false;
  }
  whenLoaded(() => {
    try {
      land();
    } catch (e) {
      console.warn('Schatten in der Ferne: Land', e);
    }
  });
  // ---- the menu's switch ----
  function label() {
    const b = $('schbtn');
    if (!b) return;
    b.setAttribute('aria-pressed', S.on ? 'true' : 'false');
    const s = b.querySelector('span');
    if (s)
      s.textContent = !S.ok
        ? CSMU.soft
          ? 'aus (ohne Grafikkarte)'
          : 'aus'
        : S.mode === 'auto'
          ? want()
            ? 'auto (an)'
            : 'auto (aus)'
          : S.mode;
  }
  function set(o = {}) {
    if (o.mode && MODES.includes(o.mode)) {
      S.mode = o.mode;
      SAVE.set(KEY, o.mode);
    }
    if (o.debug !== undefined) {
      CSMU.Q[1] = o.debug ? 1 : 0;
      markDirty();
    }
    if (o.land !== undefined) {
      S.land = !!o.land;
      if (!S.land) {
        LD.k = LD.shown = 0;
        uniforms();
      }
      markDirty();
    }
    apply();
    label();
    return state();
  }
  const state = () => ({
    ok: S.ok,
    on: S.on,
    mode: S.mode,
    blits: S.blits,
    near: S.nearN,
    atlas: sun.shadow.map ? [sun.shadow.map.width, sun.shadow.map.height] : null,
    tiles: S.tiles.map(t => ({
      name: t.name,
      ok: t.ok,
      R: t.R,
      texel: +t.texel.toFixed(3),
      n: t.n,
      due: t.due,
      calls: t.calls,
      tris: t.tris,
      ms: t.ms,
    })),
    P: Array.from(CSMU.P),
    land: Object.assign(
      {
        on: S.land,
        have: LD.have,
        inAtlas: LD.inAtlas,
        k: +LD.k.toFixed(3),
        shown: +LD.shown.toFixed(3),
        n: LD.n,
        H: Array.from(CSMU.H),
      },
      SCHLAND.state()
    ),
  });
  $('schbtn')?.addEventListener('click', () => set({ mode: MODES[(MODES.indexOf(S.mode) + 1) % MODES.length] }));
  whenLoaded(label);
  apply();
  return { state, set, add, land, settle, S };
})();
window.SCHATTEN = SCHATTEN;
