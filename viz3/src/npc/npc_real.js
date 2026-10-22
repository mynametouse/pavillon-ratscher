// ---------------- realistic neighbours and goats: rigged, textured glTF models (CC BY, see "Quellen und Lizenzen") ----------------
// Loaded after the scene is up; until then (or if loading fails) the low-poly figures stay. Walk cycle: motion capture, retargeted
// offline onto both men (tools: chars/rt.html); standing pose = average of that cycle; Hubert keeps his own idle (an old man's stance).
// Goats: one rigged goat with its own idle clip (head, ears, bleat), legs and grazing posed procedurally on top.
const CHARMAN = window.CHARMAN || null;
const REAL = { ready: false, failed: false, started: false };
const CHL = gltfDataURIs(new GLTFLoader());
CHL.setMeshoptDecoder(MeshoptDecoder);
// no stand-in figures while the real ones load: the simple low-poly ones only come back if loading fails
const STANDIN = () => [NPCS.hubert.fig, NPCS.ronald.fig, ...GOATS.map(g => g.fig), TRACTOR];
if (CHARMAN && !QS.get('lowfig')) for (const f of STANDIN()) f.g.visible = false;
const _rq = new THREE.Quaternion(),
  _rq2 = new THREE.Quaternion(),
  _rv = new THREE.Vector3(),
  _rv2 = new THREE.Vector3(),
  _rmq = new THREE.Quaternion();
// canonical bone names (Mixamo 'mixamorigLeftArm_011' → 'LeftArm'; Character Creator style 'L_Upperarm_037' → 'LeftArm')
const CCN = {
  Hip: 'Hips',
  Waist: 'Spine',
  Spine01: 'Spine1',
  Spine02: 'Spine2',
  NeckTwist01: 'Neck',
  Head: 'Head',
  HeadNub: 'HeadTop_End',
};
for (const [a, b] of [
  ['L', 'Left'],
  ['R', 'Right'],
])
  Object.assign(CCN, {
    [a + '_Clavicle']: b + 'Shoulder',
    [a + '_Upperarm']: b + 'Arm',
    [a + '_Forearm']: b + 'ForeArm',
    [a + '_Hand']: b + 'Hand',
    [a + '_Thigh']: b + 'UpLeg',
    [a + '_Calf']: b + 'Leg',
    [a + '_Foot']: b + 'Foot',
    [a + '_ToeBase']: b + 'ToeBase',
  });
function boneCanon(n) {
  const b = n.replace(/_\d+$/, '');
  return b.startsWith('mixamorig') ? b.replace(/^mixamorig:?/, '') : CCN[b] || null;
}
function charMat(m, tint) {
  if (!m || !m.isMeshStandardMaterial) return m;
  m.metalness = 0;
  m.metalnessMap = null;
  if (!m.roughnessMap) m.roughness = Math.max(0.55, m.roughness);
  if (m.transparent && !/eyelash|cornea/i.test(m.name)) {
    m.transparent = false;
    m.alphaTest = 0.5;
    m.depthWrite = true;
  }
  if (tint) m.color.set(tint);
  if (m.map) m.map.anisotropy = ANISO;
  m.envMapIntensity = 0.8;
  patchSV(m);
  m.needsUpdate = true;
  return m;
}
// rotate a bone about an axis given in the model's own frame (x = the figure's left, y = up, z = forward); parents must be up to date.
// The pose before the turn is kept in sv and put back before the next mixer update: the mixer only writes a bone when its own
// value changes, so a turned bone would otherwise keep (and add up) the turns of earlier frames.
function boneTurn(sv, modelQinv, b, ax, ay, az, ang) {
  if (!b || !ang) return;
  if (!sv.has(b)) sv.set(b, b.quaternion.clone());
  b.parent.getWorldQuaternion(_rq);
  _rq.premultiply(modelQinv).invert();
  _rv.set(ax, ay, az).applyQuaternion(_rq);
  _rq2.setFromAxisAngle(_rv, ang);
  b.quaternion.premultiply(_rq2);
  b.updateMatrixWorld(true);
}
function prepModel(model, h, o = {}) {
  model.updateMatrixWorld(true);
  model.traverse(x => {
    if (x.isMesh) {
      x.castShadow = false;
      x.receiveShadow = true;
      x.userData.noMerge = true;
      const ms = Array.isArray(x.material) ? x.material : [x.material];
      x.material = Array.isArray(x.material)
        ? ms.map(m => charMat(o.cloneMats ? m.clone() : m, o.tint))
        : charMat(o.cloneMats ? x.material.clone() : x.material, o.tint);
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = h / (o.byLength ? size.z : size.y);
  model.scale.multiplyScalar(s);
  model.position.y -= box.min.y * s;
  model.updateMatrixWorld(true);
  model.traverse(x => {
    if (x.isSkinnedMesh) {
      x.computeBoundingSphere();
      x.boundingSphere.radius *= 1.6;
    }
  });
  return s;
}
const camNear = (g, d) => {
  g.getWorldPosition(_rv);
  return _rv.distanceToSquared(cam.position) < d * d;
};
// ---- people ----
function strawHat() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const q = c.getContext('2d');
  q.fillStyle = '#c8ac70';
  q.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6)
    for (let x = 0; x < 256; x += 12) {
      const o = (y / 6) % 2 ? 6 : 0;
      const l = 0.82 + Math.random() * 0.3;
      q.fillStyle = `rgb(${(200 * l) | 0},${(170 * l) | 0},${(108 * l) | 0})`;
      q.fillRect(x + o, y, 11, 5);
      q.fillStyle = 'rgba(90,64,30,0.35)';
      q.fillRect(x + o, y + 5, 11, 1);
      q.fillRect(x + o + 11, y, 1, 6);
    }
  for (let i = 0; i < 900; i++) {
    q.fillStyle = `rgba(${Math.random() < 0.5 ? '70,50,25' : '250,235,190'},${0.15 + Math.random() * 0.2})`;
    q.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  t.anisotropy = ANISO;
  const prof = [
    [0.001, 0.128],
    [0.05, 0.126],
    [0.074, 0.118],
    [0.088, 0.1],
    [0.094, 0.06],
    [0.097, 0.018],
    [0.1, 0.004],
    [0.125, -0.002],
    [0.155, -0.005],
    [0.178, -0.003],
    [0.188, 0.004],
    [0.19, 0.01],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const hat = new THREE.Group();
  const m = patchSV(
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0.7 })
  );
  const crown = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), m);
  hat.add(crown);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0952, 0.0975, 0.024, 40, 1, true),
    patchSV(new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8, side: THREE.DoubleSide }))
  );
  band.position.y = 0.024;
  hat.add(band);
  hat.traverse(x => {
    if (x.isMesh) {
      x.castShadow = false;
      x.userData.noMerge = true;
    }
  });
  return hat;
}
// a model with stylised proportions made more natural: smaller head and hands, longer legs (the knee and ankle joints move apart, so the
// skin stretches; in Character-Creator rigs the offsets sit on the '_scaleCompensation' parent of each bone). Before scaling to height.
function propTweak(model, P) {
  model.updateMatrixWorld(true);
  const B = {},
    tw = [];
  model.traverse(x => {
    if (!x.isBone) return;
    const c = boneCanon(x.name);
    if (c && !B[c]) B[c] = x;
    if (/^(L|R)_(Thigh|Calf)Twist02/.test(x.name)) tw.push(x);
  });
  const carrier = b =>
    b.parent && /_scaleCompensation$/.test(b.parent.name) && b.position.lengthSq() < 1e-10 ? b.parent : b;
  if (P.head && B.Head) B.Head.scale.multiplyScalar(P.head);
  for (const sd of ['Left', 'Right']) {
    if (P.hand && B[sd + 'Hand']) B[sd + 'Hand'].scale.multiplyScalar(P.hand);
    if (P.leg) for (const n of ['Leg', 'Foot']) if (B[sd + n]) carrier(B[sd + n]).position.multiplyScalar(P.leg);
  }
  if (P.leg) for (const b of tw) carrier(b).position.multiplyScalar(P.leg);
  model.traverse(x => {
    if (x.isSkinnedMesh) x.boundingBox = null;
  });
  model.updateMatrixWorld(true);
}
function realPerson(gl, cl, o) {
  const model = gl.scene,
    g = new THREE.Group(),
    inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  g.add(inner);
  inner.add(model); // models face +z; figures walk along local -z
  if (o.prop) propTweak(model, o.prop);
  const s = prepModel(model, o.h);
  const B = {};
  model.traverse(x => {
    if (x.isBone) {
      const c = boneCanon(x.name);
      if (c && !B[c]) B[c] = x;
    }
  });
  const hipH = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()).y : 0.9;
  if (o.hat && B.Head) {
    // straw hat on the head bone, sized and placed from the head's rest pose
    const hp = B.Head.getWorldPosition(new THREE.Vector3()),
      tp = (B.HeadTop_End || B.Head).getWorldPosition(new THREE.Vector3());
    const up = tp.clone().sub(hp);
    const L = up.length();
    up.normalize();
    const hat = strawHat();
    const k = ((o.hatK || 1.35) * L) / 0.19;
    const fwd = new THREE.Vector3(0, 0, 1);
    const want = new THREE.Matrix4().compose(
      hp
        .clone()
        .addScaledVector(up, L * (o.hatY ?? 0.45))
        .addScaledVector(fwd, -L * 0.05),
      new THREE.Quaternion()
        .setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), o.hatTilt ?? 0.1)),
      new THREE.Vector3(k, k, k)
    );
    const loc = B.Head.matrixWorld.clone().invert().multiply(want);
    loc.decompose(hat.position, hat.quaternion, hat.scale);
    B.Head.add(hat);
  }
  const mixer = new THREE.AnimationMixer(model);
  const C = j => THREE.AnimationClip.parse(j);
  const aW = mixer.clipAction(C(cl.walk)),
    aS = mixer.clipAction(C(cl.stand)),
    aI = o.idle && gl.animations[0] ? mixer.clipAction(gl.animations[0]) : null;
  for (const a of [aW, aS, aI])
    if (a) {
      a.play();
      a.time = Math.random() * a.getClip().duration;
    }
  const walkSp = cl.speed * cl.hip * s * ((o.prop && o.prop.leg) || 1); // m/s at normal playback
  const idleMix = aI ? (o.idleMix ?? 0.5) : 0;
  let w = 0,
    acc = 0,
    t = Math.random() * 100,
    look = 0,
    lookT = 0,
    lookTo = 0;
  const sv = new Map();
  const self = {
    g,
    real: true,
    mode: 'stand',
    model,
    bones: B,
    hipH,
    anim(dt, speed) {
      acc += dt;
      t += dt;
      const sit = self.mode === 'sit';
      const tw = !sit && speed > 0.05 ? 1 : 0;
      w += (tw - w) * Math.min(1, dt * 6);
      if (!g.visible || !camNear(g, 70)) return; // far away or hidden: no pose updates (time is caught up when seen again)
      aW.setEffectiveWeight(w);
      aW.timeScale = speed > 0.05 ? THREE.MathUtils.clamp(speed / walkSp, 0.55, 1.7) : 1;
      const rest = 1 - w;
      if (aI) aI.setEffectiveWeight(sit ? 0 : rest * idleMix);
      aS.setEffectiveWeight(sit ? 1 : rest * (1 - idleMix));
      for (const [b, q] of sv) b.quaternion.copy(q);
      sv.clear();
      mixer.update(acc);
      acc = 0;
      model.updateMatrixWorld(true);
      model.getWorldQuaternion(_rmq).invert();
      const Q = _rmq;
      if (sit) {
        for (const sd of ['Left', 'Right']) {
          boneTurn(sv, Q, B[sd + 'UpLeg'], 1, 0, 0, -1.45);
          boneTurn(sv, Q, B[sd + 'Leg'], 1, 0, 0, 1.5);
          boneTurn(sv, Q, B[sd + 'Arm'], 1, 0, 0, -0.55);
          boneTurn(sv, Q, B[sd + 'ForeArm'], 1, 0, 0, -0.75);
        }
        return;
      }
      // standing: breathing, small weight shifts and a slow look around (more of it when there is no idle clip)
      const st = rest * (aI ? 0.5 : 1);
      // somebody close by (the visitor) gets looked at; otherwise a slow look around
      let seen = false;
      if (camNear(g, 7)) {
        _rv2.copy(cam.position);
        model.worldToLocal(_rv2);
        const yaw = Math.atan2(_rv2.x, _rv2.z);
        if (Math.abs(yaw) < 1.6) {
          lookTo = THREE.MathUtils.clamp(yaw, -1.0, 1.0);
          seen = true;
          lookT = 1.5;
        }
      }
      if (st > 0.01 || seen) {
        lookT -= dt;
        if (lookT <= 0) {
          lookT = 2.5 + Math.random() * 5;
          lookTo = Math.random() < 0.35 ? 0 : (Math.random() - 0.5) * 1.1;
        }
        look += (lookTo - look) * Math.min(1, dt * (seen ? 3 : 1.6));
        boneTurn(sv, Q, B.Spine2 || B.Spine1, 1, 0, 0, Math.sin(t * 1.6) * 0.018 * st);
        boneTurn(sv, Q, B.Hips, 0, 0, 1, Math.sin(t * 0.37) * 0.025 * st);
        const lk = (seen ? 1 : st) * rest;
        boneTurn(sv, Q, B.Neck, 0, 1, 0, look * 0.4 * lk);
        boneTurn(sv, Q, B.Head, 0, 1, 0, look * 0.6 * lk);
        boneTurn(sv, Q, B.Head, 1, 0, 0, Math.sin(t * 0.23) * 0.06 * st);
      }
    },
  };
  return self;
}
// ---- goats ----
function realGoat(gl, o) {
  const model = skelClone(gl.scene),
    g = new THREE.Group(),
    inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  g.add(inner);
  inner.add(model);
  prepModel(model, o.len, { byLength: true, cloneMats: true, tint: o.tint });
  const find = rx => {
    let r = null;
    model.traverse(x => {
      if (!r && x.isBone && rx.test(x.name)) r = x;
    });
    return r;
  };
  const legs = [];
  for (const sd of ['left', 'right'])
    for (const n of ['1', '2']) {
      const up = find(new RegExp('^' + sd + 'Leg' + n + '_LoResUpperLeg')),
        lo = find(new RegExp('^' + sd + 'Leg' + n + '_LoResLowerLeg'));
      if (up) legs.push({ up, lo, side: sd, z: up.getWorldPosition(new THREE.Vector3()).z });
    }
  const zMid = legs.reduce((a, l) => a + l.z, 0) / Math.max(1, legs.length);
  for (const l of legs) {
    l.front = l.z > zMid;
    l.off = (l.front ? 0.25 : 0) + (l.side === 'right' ? 0.5 : 0);
  }
  const neck = [find(/^Neck01_/), find(/^Neck02_/), find(/^Neck03_/), find(/^Head_\d/)],
    jaw = find(/^Jaw_/),
    tail = find(/^Tail_/);
  const mixer = new THREE.AnimationMixer(model);
  const aI = gl.animations[0] ? mixer.clipAction(gl.animations[0]) : null;
  if (aI) {
    aI.play();
    aI.time = Math.random() * aI.getClip().duration;
  }
  let acc = 0,
    ph = 0,
    amp = 0,
    gz = 0,
    t = Math.random() * 50;
  const stride = o.len * 0.62;
  const sv = new Map();
  const self = {
    g,
    real: true,
    graze: 0,
    model,
    onBleat() {
      if (aI) aI.time = 1.15;
    },
    anim(dt, speed) {
      acc += dt;
      t += dt;
      amp += ((speed > 0.03 ? Math.min(1, speed / 0.5) : 0) - amp) * Math.min(1, dt * 5);
      ph += ((dt * speed) / stride) * Math.PI * 2;
      gz += ((self.graze ? 1 : 0) - gz) * Math.min(1, dt * 1.8);
      if (!g.visible || !camNear(g, 60)) return;
      for (const [b, q] of sv) b.quaternion.copy(q);
      sv.clear();
      mixer.update(acc);
      acc = 0;
      model.updateMatrixWorld(true);
      model.getWorldQuaternion(_rmq).invert();
      const Q = _rmq;
      if (amp > 0.01)
        for (const l of legs) {
          const a = ph + l.off * Math.PI * 2,
            sw = Math.sin(a);
          boneTurn(sv, Q, l.up, 1, 0, 0, -sw * (l.front ? 0.36 : 0.27) * amp);
          boneTurn(sv, Q, l.lo, 1, 0, 0, Math.max(0, Math.cos(a)) * (l.front ? 0.75 : -0.45) * amp);
        }
      if (gz > 0.01) {
        [1.15, 0.45, 0.15, -0.05].forEach((k, i) => boneTurn(sv, Q, neck[i], 1, 0, 0, k * gz));
        if (jaw && gz > 0.6) boneTurn(sv, Q, jaw, 1, 0, 0, (Math.sin(t * 8.5) * 0.5 + 0.5) * 0.1 * gz);
      }
      if (tail) boneTurn(sv, Q, tail, 0, 1, 0, Math.sin(t * 2.3) * 0.25 * (0.4 + amp));
    },
  };
  return self;
}
// ---- Hubert's tractor: an old weathered red tractor (CC BY); its four wheels are cut out of the one wheel mesh so they can turn ----
function realTractor(gl) {
  const model = gl.scene,
    inner = new THREE.Group();
  inner.rotation.y = Math.PI / 2;
  inner.add(model); // model front = +x → figure forward (-z)
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const s = 3.0 / (box.max.x - box.min.x);
  model.scale.multiplyScalar(s);
  model.position.y -= box.min.y * s;
  model.updateMatrixWorld(true);
  const wheels = [];
  let wheelMesh = null,
    seatBox = null;
  model.traverse(x => {
    if (!x.isMesh) return;
    x.castShadow = false;
    x.receiveShadow = true;
    x.userData.noMerge = true;
    const m = x.material;
    if (m && m.isMeshStandardMaterial) {
      m.envMapIntensity = 0.85;
      if (m.map) m.map.anisotropy = ANISO;
      patchSV(m);
      m.needsUpdate = true;
    }
    if (m && /Tractor_04/.test(m.name) && !wheelMesh) wheelMesh = x;
  });
  const seatNode = model.getObjectByName('Rear_seat_low');
  if (seatNode) seatBox = new THREE.Box3().setFromObject(seatNode);
  if (wheelMesh) {
    const geo = toFloatAttrs(wheelMesh.geometry.clone());
    geo.applyMatrix4(wheelMesh.matrixWorld);
    const P = geo.attributes.position,
      idx = geo.index ? geo.index.array : null;
    const nT = idx ? idx.length / 3 : P.count / 3;
    const xs = [];
    for (let i = 0; i < P.count; i++) xs.push(P.getX(i));
    xs.sort((a, b) => a - b);
    const xMid = (xs[0] + xs[xs.length - 1]) / 2;
    const groups = [[], [], [], []];
    const vi = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
    for (let t = 0; t < nT; t++) {
      let cx = 0,
        cz = 0;
      for (let k = 0; k < 3; k++) {
        cx += P.getX(vi(t, k));
        cz += P.getZ(vi(t, k));
      }
      groups[(cx / 3 > xMid ? 2 : 0) + (cz / 3 > 0 ? 1 : 0)].push(vi(t, 0), vi(t, 1), vi(t, 2));
    }
    for (const ids of groups) {
      if (!ids.length) continue;
      const bb = new THREE.Box3();
      const v = new THREE.Vector3();
      for (const i of ids) bb.expandByPoint(v.fromBufferAttribute(P, i));
      const c = bb.getCenter(new THREE.Vector3());
      const sub = new THREE.BufferGeometry();
      for (const [n, a] of Object.entries(geo.attributes)) sub.setAttribute(n, a);
      sub.setIndex(ids);
      const piv = new THREE.Object3D();
      piv.position.copy(c);
      const wm = new THREE.Mesh(sub, wheelMesh.material);
      wm.position.copy(c).negate();
      wm.receiveShadow = true;
      wm.userData.noMerge = true;
      piv.add(wm);
      inner.add(piv);
      wheels.push({ piv, r: (bb.max.y - bb.min.y) / 2 });
    }
    wheelMesh.visible = false;
  }
  // (inner is not in the scene yet, so 'world' above means the inner group's own frame – where the wheel pivots are added)
  const seat = seatBox ? { back: -((seatBox.min.x + seatBox.max.x) / 2), top: seatBox.max.y - 0.04 } : null;
  return { inner, wheels, seat };
}
function swapTractor(T) {
  const old = TRACTOR.g.children.slice();
  for (const c of old) TRACTOR.g.remove(c);
  TRACTOR.g.add(T.inner);
  TRACTOR.wheels = T.wheels;
  TRACTOR.roll = d => {
    for (const w of T.wheels) w.piv.rotation.z -= d / w.r;
  };
  if (T.seat) TRACTOR.seat = T.seat;
  for (const b of BLOBS) if (b.fig === TRACTOR) Object.assign(b, { w: 1.7, l: 3.1, h: 1.0 });
}
// ---- the figures' sun shadows (see FIGSH in core/assets.js): a depth map from the sun's direction, fitted each frame around the figures
// nearest to the camera (the nearest one and whoever stands within 18 m of it), drawn with the figures' own meshes only ----
const FSD = {
  size: HQ0 || OFFLINE ? 2048 : 1024,
  rt: null,
  cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60),
  mats: new Map(),
  figs: [],
};
const _fsBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1),
  _fsv = new THREE.Vector3(),
  _fsc = new THREE.Color(),
  _fsctr = new THREE.Vector3();
function fsDepthMat(m) {
  let d = FSD.mats.get(m);
  if (!d) {
    d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    if (m && m.alphaTest > 0 && m.map) {
      d.map = m.map;
      d.alphaTest = m.alphaTest;
    }
    FSD.mats.set(m, d);
  }
  return d;
}
// fig: { g }, r: radius around the point cy m above the feet that holds the whole figure
function fsAdd(fig, r, cy) {
  const ms = [];
  fig.g.traverse(x => {
    if (!x.isMesh || !x.visible) return;
    const n = ((x.material && x.material.name) || '') + ' ' + x.name;
    if (/eyelash|cornea|fingernail/i.test(n)) return;
    ms.push(x);
  });
  FSD.figs.push({ fig, r, cy, ms, p: new THREE.Vector3(), d: 0 });
}
function figShadowPass() {
  const F = FSD.figs;
  for (const f of F) f.fig.fsOn = false;
  if (
    !REAL.ready ||
    !F.length ||
    RENDER.tier === 'schnell' ||
    sunDir.y < 0.035 ||
    sun.intensity < 0.05 ||
    (typeof P !== 'undefined' && P.mode === 'top')
  ) {
    FIGSH.on.value = 0;
    return;
  }
  let best = null,
    bd = 42 * 42;
  for (const f of F) {
    if (!f.fig.g.visible) {
      f.d = 1e9;
      continue;
    }
    f.fig.g.getWorldPosition(f.p);
    f.d = f.p.distanceToSquared(cam.position);
    if (f.d < bd) {
      bd = f.d;
      best = f;
    }
  }
  if (!best) {
    FIGSH.on.value = 0;
    return;
  }
  const C = F.filter(f => f.d < 42 * 42 && f.p.distanceToSquared(best.p) < 18 * 18);
  _fsctr.set(0, 0, 0);
  for (const f of C) _fsctr.add(f.p);
  _fsctr.divideScalar(C.length);
  _fsctr.y += 0.8;
  const cm = FSD.cam,
    D = 30;
  cm.position.copy(_fsctr).addScaledVector(sunDir, D);
  cm.up.set(0, 1, 0);
  cm.lookAt(_fsctr);
  cm.updateMatrixWorld(true);
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  for (const f of C) {
    _fsv.copy(f.p);
    _fsv.y += f.cy;
    _fsv.applyMatrix4(cm.matrixWorldInverse);
    x0 = Math.min(x0, _fsv.x - f.r);
    x1 = Math.max(x1, _fsv.x + f.r);
    y0 = Math.min(y0, _fsv.y - f.r);
    y1 = Math.max(y1, _fsv.y + f.r);
    f.fig.fsOn = true;
  }
  const ext = Math.max(x1 - x0, y1 - y0);
  cm.left = x0;
  cm.right = x1;
  cm.bottom = y0;
  cm.top = y1;
  cm.near = 0.1;
  cm.far = D + 28;
  cm.updateProjectionMatrix();
  if (!FSD.rt) {
    FSD.rt = new THREE.WebGLRenderTarget(FSD.size, FSD.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    FSD.rt.texture.name = 'figShadow';
    FIGSH.map.value = FSD.rt.texture;
  }
  const pRT = R.getRenderTarget(),
    pAC = R.autoClear,
    pCA = R.getClearAlpha();
  R.getClearColor(_fsc);
  R.setRenderTarget(FSD.rt);
  R.setClearColor(0xffffff, 1);
  R.clear(true, true, false);
  R.autoClear = false;
  const saved = [];
  for (const f of C)
    for (const m of f.ms) {
      saved.push(m, m.material);
      m.material = Array.isArray(m.material) ? m.material.map(fsDepthMat) : fsDepthMat(m.material);
    }
  try {
    for (const f of C) R.render(f.fig.g, cm);
  } finally {
    for (let i = 0; i < saved.length; i += 2) saved[i].material = saved[i + 1];
    R.setRenderTarget(pRT);
    R.autoClear = pAC;
    R.setClearColor(_fsc, pCA);
  }
  FIGSH.mat.value.multiplyMatrices(cm.projectionMatrix, cm.matrixWorldInverse).premultiply(_fsBias);
  FIGSH.texel.value = 1 / FSD.size;
  FIGSH.wtexel.value = ext / FSD.size;
  FIGSH.range.value = cm.far - cm.near;
  FIGSH.bias.value = 0.03 / (cm.far - cm.near);
  FIGSH.on.value = 1;
}
function swapFig(w, f, blob) {
  const old = w.fig;
  f.mode = old.mode;
  scene.remove(old.g);
  scene.add(f.g);
  for (const b of BLOBS)
    if (b.fig === old) {
      b.fig = f;
      if (blob) Object.assign(b, blob);
    }
  f.blob = old.blob;
  w.fig = f;
  w.place();
}
async function loadReal() {
  if (!CHARMAN || REAL.started) return;
  REAL.started = true;
  const FL = new THREE.FileLoader();
  FL.setResponseType('json');
  const U = f => BASE + 'chars/' + f;
  try {
    const [cl, gh, gr, gg, gt] = await Promise.all([
      FL.loadAsync(U(CHARMAN.clips)),
      CHL.loadAsync(U(CHARMAN.hubert)),
      CHL.loadAsync(U(CHARMAN.ronald)),
      CHL.loadAsync(U(CHARMAN.goat)),
      CHARMAN.tractor ? CHL.loadAsync(U(CHARMAN.tractor)) : null,
    ]);
    if (gt) {
      swapTractor(realTractor(gt));
      TRACTOR.g.visible = true;
    }
    swapFig(NPCS.hubert, realPerson(gh, cl.hubert, { h: 1.74, idle: true, idleMix: 0.3 }));
    swapFig(
      NPCS.ronald,
      realPerson(gr, cl.ronald, {
        h: 1.72,
        hat: true,
        prop: QS.get('rawfig') ? null : { head: 0.87, hand: 0.86, leg: 1.07 },
      })
    );
    NPCS.ronald.speed = 0.8; // a shorter man: a slightly slower pace keeps his steps natural
    const GT = { Lotte: { len: 1.12 }, Frieda: { len: 1.1, tint: 0xa47b55 }, Egon: { len: 1.3, tint: 0x4a3f36 } };
    for (const gt of GOATS)
      swapFig(gt, realGoat(gg, GT[gt.gname] || { len: 1.1 }), {
        w: 0.62,
        l: 1.25 * (GT[gt.gname] || { len: 1.1 }).len,
        h: 0.55,
      });
    fsAdd(NPCS.hubert.fig, 1.05, 0.9);
    fsAdd(NPCS.ronald.fig, 1.05, 0.9);
    for (const gt of GOATS) fsAdd(gt.fig, 0.85, 0.5);
    if (gt) fsAdd(TRACTOR, 2.0, 1.1);
    if (!QS.get('noshfig')) window.FIGSHADOW = figShadowPass;
    REAL.ready = true;
    markDirty(true);
  } catch (e) {
    console.warn('Figuren (Modelle) nicht geladen:', e);
    REAL.failed = true;
    for (const f of STANDIN()) f.g.visible = true;
    markDirty(true);
  }
}
if (!QS.get('lowfig')) whenLoaded(() => setTimeout(loadReal, 400));
window.NPC.real = REAL;
