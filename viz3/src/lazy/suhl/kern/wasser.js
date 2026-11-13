// Suhl runtime: open water – the Lauter and the Hasel where they run in the open, ponds, basins, the reservoir (product s, list `wareas`:
// the outline from OpenStreetMap with its holes, the level z in decimetres; an area cut by tile borders comes whole with the tile that
// owns it, home = 1). The river falls along its course (its pieces lie 4 m apart in level), so the surface is laid on the ground vertex
// by vertex, a hand above it, and drawn in front of the ground with a polygon offset – the way the region draws its water
// (world/ratscher.js); a level far off the ground (a culvert, a gap in the terrain) keeps to within MAXD of the area's own z. Fountains
// are kern/brunnen.js. Built within R as one mesh, again when a street tile comes or goes or the ground under it changed.
import { buf, tri, geometry } from './teile.js';
const R = 1400,
  MOVE = 150,
  MAXD = 2.5;
const KINDS = new Set(['water', 'pond', 'basin', 'river', 'reservoir', 'wastewater']);
export function wasser(ctx, ST) {
  const { THREE, scene, markDirty, KERN } = ctx,
    S = { on: true, rev: -1, at: [1e9, 1e9], tz: 0, ref: [], retry: 0, n: { areas: 0, rivers: 0, tris: 0, area: 0 } };
  let me = null;
  function mesh() {
    if (me) return me;
    me = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color: 0x3f5862,
        roughness: 0.07,
        metalness: 0,
        envMapIntensity: 1.0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -8,
      })
    );
    me.name = 'suhl wasser';
    me.visible = false;
    me.frustumCulled = false;
    me.userData.noMerge = true;
    me.receiveShadow = true;
    scene.add(me);
    return me;
  }
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return z === undefined || z === null || !Number.isFinite(z) ? null : z;
  };
  const ring = (t, xy) => {
    const P = [];
    for (let k = 0; k + 1 < xy.length; k += 2) P.push(new THREE.Vector2(t.o[0] + xy[k] / 10, t.o[1] + xy[k + 1] / 10));
    if (P.length > 2 && P[0].distanceTo(P[P.length - 1]) < 0.01) P.pop();
    return P;
  };
  function build(o) {
    const B = buf(),
      n = { areas: 0, rivers: 0, tris: 0, area: 0 },
      ref = [];
    let missed = 0;
    for (const t of ST.tiles.values()) {
      if (!t.d || !t.o || !Array.isArray(t.d.wareas)) continue;
      for (const w of t.d.wareas) {
        if (!KINDS.has(w[0]) || w[3] !== 1 || !Array.isArray(w[5]) || w[5].length < 6) continue;
        const P = ring(t, w[5]);
        if (P.length < 3) continue;
        let x0 = 1e9,
          y0 = 1e9,
          x1 = -1e9,
          y1 = -1e9;
        for (const p of P) {
          x0 = Math.min(x0, p.x);
          y0 = Math.min(y0, p.y);
          x1 = Math.max(x1, p.x);
          y1 = Math.max(y1, p.y);
        }
        // the nearest point of its box: within R
        if (Math.hypot(Math.max(x0 - o[0], 0, o[0] - x1), Math.max(y0 - o[1], 0, o[1] - y1)) > R) continue;
        const H = (Array.isArray(w[6]) ? w[6] : []).map(h => ring(t, h)).filter(h => h.length >= 3);
        if (THREE.ShapeUtils.isClockWise(P)) P.reverse();
        for (const h of H) if (!THREE.ShapeUtils.isClockWise(h)) h.reverse();
        let F;
        try {
          F = THREE.ShapeUtils.triangulateShape(P, H);
        } catch (e) {
          continue;
        }
        const V = P.concat(...H),
          zl = (w[4] | 0) / 10,
          Z = V.map(p => {
            const z = gz(p.x, p.y);
            return z === null ? null : Math.min(zl + MAXD, Math.max(zl - MAXD, z)) + 0.04;
          });
        if (Z.some(z => z === null)) {
          missed++;
          continue;
        }
        for (const f of F) {
          const [a, b, c] = f.map(i => [V[i].x, V[i].y, Z[i]]);
          tri(
            B,
            [a, b, c],
            [0, 0, 1],
            [
              [a[0] / 8, a[1] / 8],
              [b[0] / 8, b[1] / 8],
              [c[0] / 8, c[1] / 8],
            ]
          );
          n.area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
        }
        n.tris += F.length;
        n.areas++;
        if (w[0] === 'river') n.rivers++;
        if (ref.length < 24) ref.push([V[0].x, V[0].y, gz(V[0].x, V[0].y)]);
      }
    }
    const m = mesh();
    m.geometry.dispose();
    m.geometry = geometry(THREE, B);
    m.visible = B.p.length > 0;
    n.area = Math.round(n.area);
    S.n = n;
    S.ref = ref;
    S.retry = missed ? 2 : 0;
    markDirty(true);
  }
  const late = () =>
    S.ref.some(r => {
      const z = gz(r[0], r[1]);
      return z !== null && Math.abs(z - r[2]) > 0.1;
    });
  S.tick = (dt, o) => {
    const rev = ST.n.ok + '/' + ST.tiles.size;
    S.tz += dt;
    let again = rev !== S.rev || Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) > MOVE;
    if (!again && S.retry > 0 && (S.retry -= dt) <= 0) again = true;
    if (!again && S.tz > 3) {
      S.tz = 0;
      again = late();
    }
    if (!again) return;
    S.rev = rev;
    S.at = [o[0], o[1]];
    S.tz = 0;
    build(o);
  };
  S.away = () => {
    if (!me || !me.visible) return;
    me.visible = false;
    S.rev = -1;
    S.at = [1e9, 1e9];
    markDirty(true);
  };
  S.leave = () => {
    if (!me) return;
    scene.remove(me);
    me.geometry.dispose();
    me.material.dispose();
    me = null;
    S.rev = -1;
    S.at = [1e9, 1e9];
    S.ref = [];
  };
  S.state = () => Object.assign({}, S.n);
  return S;
}
