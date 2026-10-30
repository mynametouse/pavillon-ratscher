// ---------- the garden of today: the small things on Falko's photos of 26.10.2026 (placed where the photos see them, ±1–2 m) ----------
// A brush pile in the meadow, the white plastic table with two chairs and the pink parasol on the lawn west of the washhouse, the rusty
// clothes-line pole; along the field path (Falko 30.10.: beside it, not on it) the board stack under a white tarpaulin on the garden side
// and the logs on the field side – two long ones, a pile of short ones further west. (The painted boards are the washhouse's front: garden/washhouse.js.) Plain materials
// of the kind the garden has (no new shader programs); colliders where one would bump into them.
import * as THREE from 'three';
import { rnd, rr } from '../core/head.js';
import { plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, phase } from '../core/geo.js';
import { S0 } from './env.js';
phase(null);
const white = plain({ color: 0xf1f1ec, roughness: 0.5 }),
  pink = plain({ color: 0xd98fa0, roughness: 0.8, side: THREE.DoubleSide }),
  tarp = plain({ color: 0xdcdcd4, roughness: 0.8 }),
  twig = plain({ color: 0x5a4a3a, roughness: 0.9 });
// ---- brush pile: twigs and boards criss-cross on a low dark mound ----
{
  const [x, y] = [-2.5, 7.6];
  cyl(x, y, 0, 0.2, 0.5, plain({ color: 0x3b3328, roughness: 1 }), 12, 0.75, { col: false });
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI,
      L = rr(0.8, 1.6),
      cx = x + rr(-0.45, 0.45),
      cy = y + rr(-0.45, 0.45),
      z = rr(0.18, 0.6);
    beam(
      [cx - (Math.cos(a) * L) / 2, cy - (Math.sin(a) * L) / 2, z],
      [cx + (Math.cos(a) * L) / 2, cy + (Math.sin(a) * L) / 2, z + rr(-0.15, 0.2)],
      0.03,
      0.03,
      i % 2 ? twig : MAT.plank,
      { cast: true }
    );
  }
}
// ---- white plastic table, two chairs and the pink parasol ----
{
  const [x, y] = [9.6, 5.2]; // in front of the washhouse's painted front, north of the path (photo 7236)
  cyl(x, y, 0.7, 0.73, 0.55, white, 24);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    beam(
      [x + Math.cos(a) * 0.4, y + Math.sin(a) * 0.4, 0],
      [x + Math.cos(a) * 0.22, y + Math.sin(a) * 0.22, 0.7],
      0.04,
      0.04,
      white
    );
  }
  COL.push([x - 0.5, x + 0.5, y - 0.5, y + 0.5, 0, 0.73, 'table', null, null]);
  for (const [cx, cy, f] of [
    [x + 0.95, y + 0.2, 1],
    [x - 0.8, y - 0.55, -1],
  ]) {
    B(cx - 0.24, cx + 0.24, cy - 0.24, cy + 0.24, 0.42, 0.46, white);
    B(cx + f * 0.2, cx + f * 0.24, cy - 0.24, cy + 0.24, 0.46, 0.9, white, { col: false });
    for (const [dx, dy] of [
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.2, 0.2],
      [0.2, 0.2],
    ])
      B(cx + dx - 0.02, cx + dx + 0.02, cy + dy - 0.02, cy + dy + 0.02, 0, 0.42, white, { col: false });
  }
  // the parasol a little to the side, closed
  const px = x - 0.55,
    py = y + 0.75;
  cyl(px, py, 0, 2.05, 0.02, MAT.steel, 8, undefined, { col: false });
  cyl(px, py, 1.0, 2.05, 0.03, pink, 12, 0.16, { col: false });
}
// ---- the old clothes-line pole, rusty steel with a crossbar, by the lawn west of the washhouse (photo 7239) ----
{
  const [x, y] = [6.0, 7.8],
    rust = plain({ color: 0x7a4a33, roughness: 0.85, metalness: 0.3 });
  cyl(x, y, 0, 2.25, 0.035, rust, 10);
  beam([x - 0.02, y, 2.2], [x + 0.75, y + 0.02, 2.2], 0.04, 0.04, rust);
  beam([x, y, 1.75], [x + 0.45, y + 0.01, 2.18], 0.03, 0.03, rust, { cast: false });
}
// ---- along the field path (site.js path: the OSM track past the garden, heading 117°): s along it from its west end, o across (+ field side)
const [PA, PB] = S0.path,
  PL = Math.hypot(PB[0] - PA[0], PB[1] - PA[1]),
  U = [(PB[0] - PA[0]) / PL, (PB[1] - PA[1]) / PL],
  N = [-U[1], U[0]];
const at = (s, o, z = 0) => [PA[0] + U[0] * s + N[0] * o, PA[1] + U[1] * s + N[1] * o, z];
// colliders along a member lying parallel to the path: one box per metre
function colAlong(s0, s1, o, half, z1, tag) {
  for (let s = s0; s < s1 - 1e-6; s += 1) {
    const [x0, y0] = at(s, o),
      [x1, y1] = at(Math.min(s + 1, s1), o);
    COL.push([
      Math.min(x0, x1) - half,
      Math.max(x0, x1) + half,
      Math.min(y0, y1) - half,
      Math.max(y0, y1) + half,
      0,
      z1,
      tag,
      null,
      null,
    ]);
  }
}
// ---- the board stack under a white tarpaulin on the garden side of the path, along it (photos 7186, 7187) ----
{
  const s = 17.0,
    o = -3.0,
    L = 3.6,
    w = 1.25,
    h = 1.1;
  for (const ds of [-1.3, 0, 1.3])
    beam(at(s + ds, o - w / 2 - 0.05, 0.06), at(s + ds, o + w / 2 + 0.05, 0.06), 0.1, 0.12, MAT.kvh);
  beam(
    at(s - L / 2 + 0.1, o, 0.12 + (h - 0.2) / 2),
    at(s + L / 2 - 0.1, o, 0.12 + (h - 0.2) / 2),
    w - 0.1,
    h - 0.2,
    MAT.plank
  );
  beam(at(s - L / 2, o, h - 0.04), at(s + L / 2, o, h - 0.04), w + 0.06, 0.06, tarp, { bevel: 0.02 });
  for (const side of [-1, 1])
    beam(
      at(s - L / 2, o + side * (w / 2 + 0.02), h * 0.62),
      at(s + L / 2, o + side * (w / 2 + 0.02), h * 0.62),
      0.02,
      h * 0.68,
      tarp,
      {
        cast: false,
      }
    );
  for (const e of [-1, 1])
    beam(
      at(s + e * (L / 2 + 0.01), o - w / 2, h * 0.7),
      at(s + e * (L / 2 + 0.01), o + w / 2, h * 0.7),
      0.02,
      h * 0.55,
      tarp,
      { cast: false }
    );
  colAlong(s - L / 2, s + L / 2, o, w / 2 + 0.05, h, 'boards');
}
// ---- the logs on the field side of the path, along it (photos 7188, 7189): two long ones on cross pieces, a pile of short ones further west ----
{
  const s0 = 9.5,
    L = 9.0;
  for (const ds of [1.2, L - 1.2])
    beam(at(s0 + ds, 2.7, 0.07), at(s0 + ds, 4.3, 0.07), 0.14, 0.14, MAT.kvh, { cast: false });
  for (const [o, d] of [
    [3.15, 0.62],
    [3.85, 0.55],
  ])
    beam(at(s0, o, 0.14 + d / 2), at(s0 + L, o, 0.14 + d / 2), d, d, MAT.logs, { bevel: d * 0.45, cast: true });
  colAlong(s0, s0 + L, 3.5, 0.75, 0.76, 'logs');
  // the short ones: three below, two on top, 4 m long
  const s1 = 2.0,
    L2 = 4.0;
  for (const [o, z, d] of [
    [3.0, 0, 0.4],
    [3.42, 0, 0.38],
    [3.84, 0, 0.42],
    [3.21, 0.36, 0.36],
    [3.63, 0.36, 0.4],
  ])
    beam(at(s1 + rr(-0.15, 0.15), o, z + d / 2), at(s1 + L2 + rr(-0.15, 0.15), o, z + d / 2), d, d, MAT.logs, {
      bevel: d * 0.45,
      cast: true,
    });
  colAlong(s1, s1 + L2, 3.42, 0.65, 0.76, 'logs');
}
