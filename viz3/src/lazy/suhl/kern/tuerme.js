// Suhl runtime: the towers the building records do not carry (one footprint, one roof each) – the church towers with their baroque
// caps and the clock turret on the Rotes Rathaus. Where they stand and how they look comes from the descriptions in
// docs/plans/suhl/wahrzeichen.md (Wikipedia, OpenStreetMap) and the photos of Wikimedia Commons (contact sheets of suhl-fotos):
// Kreuzkirche – the tower with the main portal on the east side towards the town, three storeys, a curved cap with a lantern;
// St. Marien – a square tower with a „welsche Haube“ and a lantern at the east end; Rathaus – a hipped roof with a small clock turret.
// Positions are model metres taken from the footprints of product g (stage 2): the tower's centre and the direction of the nave.
// Built near the observer as merged meshes per material (walls, trim, slate, copper, clock faces).
import { buf, geometry, addGeometry } from './teile.js';
const R = 900;
// at: centre [x, y]; az: the nave's direction (degrees clockwise from north); w: width; body: top of the walls above the ground;
// cap: height of the cap; lan: lantern height; col: wall colour
const TUERME = [
  {
    name: 'Kreuzkirche',
    at: [-4854.0, 12236.2],
    az: 49,
    w: 7.4,
    body: 31,
    cap: 6.5,
    lan: 3.2,
    spire: 3.5,
    col: 0xe2b957,
    clock: 26.5,
  },
  {
    name: 'Hauptkirche St. Marien',
    at: [-4611.0, 12394.0],
    az: 92,
    w: 7.6,
    body: 27,
    cap: 6.0,
    lan: 3.0,
    spire: 3.2,
    col: 0xe4bd5d,
    clock: 23,
    stairs: true,
  },
  {
    name: 'Rotes Rathaus, Dachreiter',
    at: [-4665.3, 12450.2],
    az: 55,
    w: 2.6,
    base: 20.5, // on the ridge (its roof made steeper after the photos: bau/marken.js rise)
    body: 24.2,
    cap: 2.2,
    lan: 1.6,
    spire: 1.8,
    col: 0x2f3236,
    clock: 23.0,
    turret: true,
  },
];
export function tuerme(ctx) {
  const { THREE, scene, markDirty, KERN } = ctx,
    S = { on: true, built: false, at: [1e9, 1e9], n: 0, ref: [] };
  let K = null;
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    V = new THREE.Vector3(),
    SC = new THREE.Vector3(),
    E = new THREE.Euler(),
    G = {
      box: new THREE.BoxGeometry(1, 1, 1),
      oct: new THREE.CylinderGeometry(1, 1, 1, 8),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
      sph: new THREE.SphereGeometry(1, 16, 10),
      cone: new THREE.ConeGeometry(1, 1, 12),
      disc: new THREE.CylinderGeometry(1, 1, 1, 20),
    };
  function kit() {
    if (K) return K;
    const mk = (opts, name) => {
      const m = new THREE.MeshStandardMaterial(opts),
        me = new THREE.Mesh(new THREE.BufferGeometry(), m);
      me.name = name;
      me.visible = false;
      me.frustumCulled = false;
      me.userData.noMerge = true;
      scene.add(me);
      return me;
    };
    K = {
      white: mk({ color: 0xece9e1, roughness: 0.85 }, 'suhl tuerme weiss'),
      slate: mk({ color: 0x33373d, roughness: 0.6, metalness: 0.1 }, 'suhl tuerme schiefer'),
      copper: mk({ color: 0x5f9a86, roughness: 0.55, metalness: 0.35 }, 'suhl tuerme kupfer'),
      gold: mk({ color: 0xb8913b, roughness: 0.35, metalness: 0.8 }, 'suhl tuerme gold'),
      walls: new Map(), // colour → mesh
    };
    return K;
  }
  // a part at the tower's local frame (lx along the nave, ly across, height z), sizes sx (along), sy (across), sz (up)
  function part(B, g, t, z0, lx, ly, z, sx, sy, sz, rx = 0, rz = 0) {
    const a = (t.az * Math.PI) / 180,
      ex = [Math.sin(a), Math.cos(a)],
      ey = [ex[1], -ex[0]],
      x = t.at[0] + ex[0] * lx + ey[0] * ly,
      y = t.at[1] + ex[1] * lx + ey[1] * ly;
    E.set(rx, -a, rz, 'YXZ');
    Q.setFromEuler(E);
    M.compose(V.set(x, z0 + z, -y), Q, SC.set(sy, sz, sx));
    addGeometry(B, G[g], M);
  }
  function build(o) {
    const k = kit(),
      B = { white: buf(), slate: buf(), copper: buf(), gold: buf() },
      walls = new Map(),
      ref = [];
    let n = 0;
    for (const t of TUERME) {
      if (Math.hypot(t.at[0] - o[0], t.at[1] - o[1]) > R) continue;
      const zg = KERN.ground(t.at[0], t.at[1]);
      if (zg === undefined || zg === null || !Number.isFinite(zg)) continue;
      ref.push([t.at[0], t.at[1], zg]);
      if (!walls.has(t.col)) walls.set(t.col, buf());
      const W = walls.get(t.col),
        w = t.w,
        z0 = zg,
        zb = t.base ?? 0, // the walls start here (the turret on the ridge)
        H = t.body;
      // the body, its corner pilasters and cornices
      part(W, 'box', t, z0, 0, 0, (zb + H) / 2 - (t.turret ? 0 : 1), w, w, H - zb + (t.turret ? 0 : 2));
      if (!t.turret) {
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          part(B.white, 'box', t, z0, (sx * w) / 2, (sy * w) / 2, H / 2, 0.5, 0.5, H);
        for (const zc of [H * 0.42, H * 0.7, H]) part(B.white, 'box', t, z0, 0, 0, zc - 0.15, w + 0.5, w + 0.5, 0.35);
        if (t.stairs)
          for (const s of [-1, 1]) part(W, 'cyl', t, z0, 0, s * (w / 2 + 1.1), H * 0.32, 2.2, 2.2, H * 0.64);
      } else part(B.white, 'box', t, z0, 0, 0, H - 0.1, w + 0.25, w + 0.25, 0.2);
      // the clock on four sides
      for (let s = 0; s < 4; s++) {
        const ang = (s * Math.PI) / 2,
          lx = Math.cos(ang) * (w / 2 + 0.04),
          ly = Math.sin(ang) * (w / 2 + 0.04),
          r = Math.min(1.1, w * 0.3),
          along = s % 2 === 0; // the face looks along the nave (its axis the local z) or across it (the local x)
        part(B.white, 'disc', t, z0, lx, ly, t.clock, r, r, 0.06, along ? Math.PI / 2 : 0, along ? 0 : Math.PI / 2);
        part(B.gold, 'box', t, z0, lx * 1.012, ly * 1.012, t.clock + r * 0.3, 0.08, 0.08, r * 0.6);
      }
      // the cap: a curved slate bell, the lantern of copper (its windows dark), a small cap, the spire and its ball
      const zc = H,
        cw = w * (t.turret ? 0.62 : 0.58);
      part(B.slate, 'sph', t, z0, 0, 0, zc + t.cap * 0.35, cw * 0.98, cw * 0.98, t.cap * 0.62);
      part(B.slate, 'oct', t, z0, 0, 0, zc + t.cap * 0.12, cw * 1.02, cw * 1.02, t.cap * 0.25);
      part(B.slate, 'cone', t, z0, 0, 0, zc + t.cap * 0.8, cw * 0.55, cw * 0.55, t.cap * 0.45);
      const zl = zc + t.cap;
      part(B.copper, 'oct', t, z0, 0, 0, zl + t.lan / 2, cw * 0.38, cw * 0.38, t.lan);
      part(B.copper, 'sph', t, z0, 0, 0, zl + t.lan + 0.5, cw * 0.32, cw * 0.32, 0.9);
      part(B.copper, 'cone', t, z0, 0, 0, zl + t.lan + 1.0 + t.spire / 2, 0.12, 0.12, t.spire);
      part(B.gold, 'sph', t, z0, 0, 0, zl + t.lan + 1.0 + t.spire * 0.55, 0.28, 0.28, 0.28);
      n++;
    }
    const put = (me, b) => {
      me.geometry.dispose();
      me.geometry = geometry(THREE, b);
      me.visible = b.p.length > 0;
    };
    put(k.white, B.white);
    put(k.slate, B.slate);
    put(k.copper, B.copper);
    put(k.gold, B.gold);
    for (const [col, b] of walls) {
      let me = k.walls.get(col);
      if (!me) {
        const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.88 });
        me = new THREE.Mesh(new THREE.BufferGeometry(), m);
        me.name = 'suhl tuerme wand';
        me.frustumCulled = false;
        me.userData.noMerge = true;
        scene.add(me);
        k.walls.set(col, me);
      }
      put(me, b);
    }
    for (const [col, me] of k.walls) if (!walls.has(col)) me.visible = false;
    S.n = n;
    S.ref = ref;
    S.built = true;
    markDirty(true);
  }
  S.tick = (dt, o) => {
    if (
      S.built &&
      Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) < 200 &&
      !S.ref.some(r => Math.abs((KERN.ground(r[0], r[1]) ?? r[2]) - r[2]) > 0.1)
    )
      return;
    S.at = [o[0], o[1]];
    build(o);
  };
  S.away = () => {
    if (!K) return;
    for (const me of [K.white, K.slate, K.copper, K.gold, ...K.walls.values()]) me.visible = false;
    S.built = false;
    S.at = [1e9, 1e9];
    markDirty(true);
  };
  S.leave = () => {
    if (!K) return;
    for (const me of [K.white, K.slate, K.copper, K.gold, ...K.walls.values()]) {
      scene.remove(me);
      me.geometry.dispose();
      me.material.dispose();
    }
    for (const g of Object.values(G)) g.dispose();
    K = null;
    S.built = false;
    S.at = [1e9, 1e9];
  };
  S.state = () => ({ towers: S.n });
  return S;
}
