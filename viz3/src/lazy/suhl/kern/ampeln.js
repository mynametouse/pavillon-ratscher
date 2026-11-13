// Suhl runtime: traffic lights – the lists `ampeln` of the furniture tiles (product m: per signal node its masts, one per approach,
// right of the carriageway, heading = the direction the traffic drives there; docs/features/suhl-strassen.md 3.5), which the roads
// system does not draw (STRDAT reads only its own lists). Built near the observer (within R) from the tiles the street module holds:
// a grey mast, a black signal head facing the drivers (three lenses; a pedestrian signal two, smaller), the lenses in the phase of
// their node – red, red and yellow, green, yellow; the approaches of a node alternate. Three instanced meshes for all of them (mast,
// head, lenses – the lenses unlit by the sun, their colour is the light), the standard and basic programs the app has already.
const R = 320, // built within this distance of the observer …
  MOVE = 60, // … and again when the observer moved this far or a tile came or went
  MAX = 600, // heads at most (masts and lenses follow)
  CYCLE = 60, // s: green 24, yellow 3, red 30, red and yellow 3 (cars); pedestrians green 12 in the red of the cross direction
  RAD = Math.PI / 180;
export function ampeln(ctx, ST) {
  const { THREE, scene, markDirty, KERN } = ctx,
    S = { on: true, n: 0, heads: 0, rev: -1, at: [1e9, 1e9], t: 0 };
  let M = null;
  function kit() {
    if (M) return M;
    const mast = new THREE.CylinderGeometry(0.055, 0.065, 3.6, 8);
    mast.translate(0, 1.8, 0);
    const head = new THREE.BoxGeometry(0.3, 0.92, 0.22);
    const lens = new THREE.CircleGeometry(0.085, 14);
    const mats = {
      mast: new THREE.MeshStandardMaterial({ color: 0x8a8f93, roughness: 0.55, metalness: 0.35 }),
      head: new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.7 }),
      lens: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    };
    const mk = (g, m, n) => {
      const im = new THREE.InstancedMesh(g, m, n);
      im.count = 0;
      im.visible = false;
      im.frustumCulled = false; // the lot moves with the observer
      im.castShadow = im.receiveShadow = false;
      im.userData.noMerge = true;
      scene.add(im);
      return im;
    };
    M = {
      geo: [mast, head, lens],
      mats,
      mast: mk(mast, mats.mast, MAX),
      head: mk(head, mats.head, MAX),
      lens: mk(lens, mats.lens, MAX * 3),
      lenses: [], // per lens: [node phase, which (0 red, 1 yellow, 2 green), pedestrian]
    };
    M.mast.name = 'suhl ampeln maste';
    M.head.name = 'suhl ampeln koepfe';
    M.lens.name = 'suhl ampeln lichter';
    M.lens.setColorAt(0, new THREE.Color(0, 0, 0));
    return M;
  }
  // which lens shows at time t for a node phase p: cars 0 red, 1 yellow, 2 green, 3 red and yellow; pedestrians 0 red, 2 green
  function lit(p, t, ped) {
    const s = (((t + p) % CYCLE) + CYCLE) % CYCLE;
    if (ped) return s >= 30 && s < 42 ? [2] : [0];
    return s < 24 ? [2] : s < 27 ? [1] : s < 57 ? [0] : [0, 1];
  }
  const OFF = new THREE.Color(0.07, 0.07, 0.07),
    ON = [new THREE.Color(1, 0.12, 0.08), new THREE.Color(1, 0.72, 0.1), new THREE.Color(0.25, 1, 0.45)];
  function colour(t) {
    const L = M.lenses;
    for (let i = 0; i < L.length; i++) {
      const [p, w, ped] = L[i];
      M.lens.setColorAt(i, lit(p, t, ped).includes(w) ? ON[w] : OFF);
    }
    if (M.lens.instanceColor) M.lens.instanceColor.needsUpdate = true;
  }
  function build(o) {
    const K = kit(),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      one = new THREE.Vector3(1, 1, 1),
      pv = new THREE.Vector3(),
      sm = new THREE.Vector3(0.72, 0.72, 0.72);
    let nm = 0,
      nh = 0;
    K.lenses = [];
    for (const t of ST.tiles.values()) {
      if (!t.own || !t.own.ampeln.length) continue;
      const [ox, oy] = t.own.o;
      for (const a of t.own.ampeln) {
        const ped = a[0] === 1,
          ax = ox + a[1] / 10,
          ay = oy + a[2] / 10;
        if (Math.hypot(ax - o[0], ay - o[1]) > R) continue;
        // the phase of the node (from its OSM id), the approaches turn by turn: half of them a half cycle later
        const ph = Number(String(a[4]).slice(-4)) % CYCLE,
          ms = a[5] || [];
        for (let k = 0; k + 2 < ms.length && nh < MAX; k += 3) {
          const x = ox + ms[k] / 10,
            y = oy + ms[k + 1] / 10,
            az = ms[k + 2] * RAD,
            z = KERN.ground(x, y);
          if (z === undefined || z === null || !Number.isFinite(z)) continue;
          const p = ph + ((k / 3) % 2) * (CYCLE / 2);
          // the mast
          m4.compose(pv.set(x, z, -y), q.identity(), one);
          K.mast.setMatrixAt(nm++, m4);
          // the head faces the drivers: its front (+z of the box, model -y) turned to the compass direction az + 180°
          q.setFromAxisAngle(up, -az);
          const hz = z + (ped ? 2.35 : 2.95);
          m4.compose(pv.set(x, hz, -y), q, ped ? sm : one);
          K.head.setMatrixAt(nh++, m4);
          // the lenses on the front of the head, top to bottom red, yellow, green (a pedestrian signal: red, green)
          const fx = -Math.sin(az),
            fy = -Math.cos(az), // the front's direction in model x, y
            ws = ped ? [0, 2] : [0, 1, 2];
          ws.forEach((w, j) => {
            const dz = ped ? 0.15 - j * 0.3 : 0.29 - j * 0.29,
              s = ped ? 0.72 : 1;
            m4.compose(pv.set(x + fx * 0.12 * s, hz + dz * s, -(y + fy * 0.12 * s)), q, new THREE.Vector3(s, s, s));
            K.lens.setMatrixAt(K.lenses.length, m4);
            K.lenses.push([p, w, ped]);
          });
        }
      }
    }
    K.mast.count = nm;
    K.head.count = nh;
    K.lens.count = K.lenses.length;
    for (const im of [K.mast, K.head, K.lens]) {
      im.visible = im.count > 0;
      im.instanceMatrix.needsUpdate = true;
    }
    colour(S.t);
    S.n = nm;
    S.heads = nh;
    markDirty(true);
  }
  S.tick = (dt, o) => {
    S.t += dt;
    const rev = ST.rev();
    if (rev !== S.rev || Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) > MOVE) {
      S.rev = rev;
      S.at = [o[0], o[1]];
      build(o);
    } else if (M && M.lenses.length && Math.floor(S.t * 2) !== Math.floor((S.t - dt) * 2)) {
      colour(S.t); // twice a second is enough for a light
      markDirty(true);
    }
  };
  // the observer far away or high above: nothing shown, built again on the way back
  S.away = () => {
    if (!M || ![M.mast, M.head, M.lens].some(me => me.visible)) return;
    for (const me of [M.mast, M.head, M.lens]) me.visible = false;
    S.rev = -1;
    S.at = [1e9, 1e9];
    markDirty(true);
  };
  S.leave = () => {
    if (!M) return;
    for (const im of [M.mast, M.head, M.lens]) {
      scene.remove(im);
      im.dispose();
    }
    for (const g of M.geo) g.dispose();
    for (const m of Object.values(M.mats)) m.dispose();
    M = null;
    S.rev = -1;
    S.at = [1e9, 1e9];
    S.n = S.heads = 0;
  };
  S.state = () => ({ masts: S.n, heads: S.heads, lenses: M ? M.lenses.length : 0 });
  return S;
}
