// ---------- the garden of today: the small things on Falko's photos of 26.10.2026 (placed where the photos see them, ±1–2 m) ----------
// A brush pile in the meadow, the white plastic table with two chairs and the pink parasol by the big tree, the painted board (blue and
// yellow) near the yellow hut, the board stack under a white tarpaulin by the gate to the field path, and four long logs on the field edge
// opposite Hubert's entrance. Plain materials of the kind the garden has (no new shader programs); colliders where one would bump into them.
import * as THREE from 'three';
import { rnd, rr, scene, V } from '../core/head.js';
import { ANISO, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, phase } from '../core/geo.js';
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
  const [x, y] = [5.2, 7.3];
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
// ---- the painted board (blue ground, yellow shapes) on two posts, facing the meadow (west) ----
{
  const [x, y] = [11.2, 9.1];
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 192;
  const c = cv.getContext('2d');
  c.fillStyle = '#3d63b5';
  c.fillRect(0, 0, 256, 192);
  c.fillStyle = '#f1cf2e';
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.ellipse(20 + ((i * 53) % 230), 25 + ((i * 71) % 150), 14 + (i % 3) * 9, 9 + (i % 2) * 12, i, 0, Math.PI * 2);
    c.fill();
  }
  c.fillRect(70, 90, 26, 80);
  c.fillRect(150, 20, 20, 90);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = ANISO;
  const me = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.2),
    plain({ map: tex, roughness: 0.7, side: THREE.DoubleSide })
  );
  me.position.copy(V(x, y, 0.75));
  me.rotation.y = -Math.PI / 2;
  me.castShadow = true;
  scene.add(me);
  for (const dy of [-0.6, 0.6]) B(x + 0.03, x + 0.08, y + dy - 0.03, y + dy + 0.03, 0, 1.3, MAT.kvh, { grain: 'z' });
}
// ---- board stack under a white tarpaulin by the gate to the field path ----
{
  const [x, y] = [-5.0, 36.8];
  B(x - 1.3, x + 1.3, y - 0.6, y + 0.6, 0, 0.12, MAT.kvh);
  B(x - 1.2, x + 1.2, y - 0.55, y + 0.55, 0.12, 0.95, MAT.plank);
  B(x - 1.35, x + 1.35, y - 0.65, y + 0.65, 0.95, 1.0, tarp, { col: false });
  for (const s of [-1, 1])
    B(x - 1.35, x + 1.35, y + s * 0.65 - 0.01, y + s * 0.65 + 0.01, 0.3, 1.0, tarp, { col: false });
}
// ---- four long logs on the field edge opposite Hubert's entrance, on two cross pieces ----
{
  const [x, y, L] = [-9.5, 44.2, 9.0];
  for (const dx of [-3, 3]) B(x + dx - 0.12, x + dx + 0.12, y - 1.3, y + 1.3, 0, 0.14, MAT.kvh, { col: false });
  [0.62, 0.55, 0.5, 0.58].forEach((d, i) => {
    const yy = y - 0.95 + i * 0.64,
      z = 0.14 + d / 2;
    beam([x - L / 2, yy, z], [x + L / 2, yy, z], d, d, MAT.logs, { bevel: d * 0.45, cast: true });
  });
  COL.push([x - L / 2, x + L / 2, y - 1.3, y + 1.3, 0, 0.75, 'logs', null, null]);
}
