// Suhl runtime: small geometry for the things built near the observer (signs, shop fronts): faces, boxes and posts into plain buffers of
// positions, normals and uvs – model coordinates (x east, y north, z up) in, three.js (x, z, −y) out; a face's winding is set from its
// outward normal, so the callers only say where a face looks.
export const buf = () => ({ p: [], n: [], uv: [] });
export function face(B, P, nm, uv) {
  // four corners counter-clockwise seen from outside (fixed if not), one outward normal (or one per corner), their uvs
  const T = P.map(q => [q[0], q[2], -q[1]]),
    N = (Array.isArray(nm[0]) ? nm : [nm, nm, nm, nm]).map(q => [q[0], q[2], -q[1]]),
    ux = T[1][0] - T[0][0],
    uy = T[1][1] - T[0][1],
    uz = T[1][2] - T[0][2],
    vx = T[2][0] - T[0][0],
    vy = T[2][1] - T[0][1],
    vz = T[2][2] - T[0][2],
    flip = (uy * vz - uz * vy) * N[0][0] + (uz * vx - ux * vz) * N[0][1] + (ux * vy - uy * vx) * N[0][2] < 0,
    ord = flip ? [0, 3, 2, 0, 2, 1] : [0, 1, 2, 0, 2, 3];
  for (const k of ord) {
    B.p.push(T[k][0], T[k][1], T[k][2]);
    B.n.push(N[k][0], N[k][1], N[k][2]);
    B.uv.push(uv[k][0], uv[k][1]);
  }
}
// one triangle, the same way
export function tri(B, P, nm, uv) {
  const T = P.map(q => [q[0], q[2], -q[1]]),
    N = [nm[0], nm[2], -nm[1]],
    ux = T[1][0] - T[0][0],
    uy = T[1][1] - T[0][1],
    uz = T[1][2] - T[0][2],
    vx = T[2][0] - T[0][0],
    vy = T[2][1] - T[0][1],
    vz = T[2][2] - T[0][2],
    ord =
      (uy * vz - uz * vy) * N[0] + (uz * vx - ux * vz) * N[1] + (ux * vy - uy * vx) * N[2] < 0 ? [0, 2, 1] : [0, 1, 2];
  for (const k of ord) {
    B.p.push(T[k][0], T[k][1], T[k][2]);
    B.n.push(N[0], N[1], N[2]);
    B.uv.push(uv[k][0], uv[k][1]);
  }
}
export const quadUv = r =>
  r.length === 2
    ? [r, r, r, r]
    : [
        [r[0], r[1]],
        [r[2], r[1]],
        [r[2], r[3]],
        [r[0], r[3]],
      ];
// a box: centre c [x, y, z], e1 a horizontal unit vector, half sizes along e1, e2 (e1 turned clockwise) and up; f / b: uv rect of
// the face towards +e2 / −e2 (seen from outside its u runs to the right), s: the patch of the other four faces
export function box(B, c, e1, hl, hd, hh, f, b, s) {
  const e2 = [e1[1], -e1[0]],
    P = (s1, s2, s3) => [
      c[0] + e1[0] * hl * s1 + e2[0] * hd * s2,
      c[1] + e1[1] * hl * s1 + e2[1] * hd * s2,
      c[2] + hh * s3,
    ],
    side = quadUv(s);
  face(B, [P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)], [e2[0], e2[1], 0], quadUv(f));
  face(B, [P(1, -1, -1), P(-1, -1, -1), P(-1, -1, 1), P(1, -1, 1)], [-e2[0], -e2[1], 0], quadUv(b));
  face(B, [P(1, 1, -1), P(1, -1, -1), P(1, -1, 1), P(1, 1, 1)], [e1[0], e1[1], 0], side);
  face(B, [P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1), P(-1, -1, 1)], [-e1[0], -e1[1], 0], side);
  face(B, [P(-1, 1, 1), P(1, 1, 1), P(1, -1, 1), P(-1, -1, 1)], [0, 0, 1], side);
  face(B, [P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1)], [0, 0, -1], side);
}
// a round post from z0 to z1 with a flat cap
export function post(B, x, y, z0, z1, r, s) {
  const n = 8,
    uv = quadUv(s);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI,
      a1 = ((i + 1) / n) * 2 * Math.PI,
      c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1);
    face(
      B,
      [
        [x + r * c0, y + r * s0, z0],
        [x + r * c1, y + r * s1, z0],
        [x + r * c1, y + r * s1, z1],
        [x + r * c0, y + r * s0, z1],
      ],
      [
        [c0, s0, 0],
        [c1, s1, 0],
        [c1, s1, 0],
        [c0, s0, 0],
      ],
      uv
    );
    tri(
      B,
      [
        [x, y, z1 + 0.01],
        [x + r * c0, y + r * s0, z1],
        [x + r * c1, y + r * s1, z1],
      ],
      [0, 0, 1],
      uv
    );
  }
}
// the buffers as a geometry of three.js
export function geometry(THREE, B) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
  return g;
}
