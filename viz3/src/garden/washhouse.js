import { beam, bldBegin, bldEnd, boardLeaf, cyl } from '../core/geo.js';
import { MAT } from '../core/mats.js';
import {
  BLD,
  FOOT,
  gB,
  INSIDE,
  lcol,
  ldoor,
  ljamb,
  ltrap,
  lw,
  lwalk,
  lwc,
  lwin,
  MATS,
  rotDesc,
  siteGroup,
  slopeSlab,
} from './site_base.js';
bldBegin('washhouse', 'Waschhaus', BLD.washhouse.c, { short: 'Waschhaus', pad: 0.15 });
// ===== Waschhaus (2,0 × 1,6 m) nördlich vom Gewächshaus unter dem großen Baum: Holz, Pultdach mit Dachpappe, Tür zur Gartenseite (West), Toilette, Waschbecken, Regentonne =====
{
  const b = BLD.washhouse,
    g = siteGroup(b);
  const hx = b.L / 2,
    hy = b.W / 2,
    z0 = 0.1,
    zh = 2.25,
    zl = 2.0,
    T = 0.06,
    dA = -0.38,
    dB = 0.37;
  const r = rotDesc(b);
  const zTop = y => zh + ((zl - zh) * (y + hy)) / (2 * hy);
  gB(g, -hx, hx, -hy, hy, 0, z0, MAT.conc, { cast: false });
  const wm = MAT.larch,
    DW = { a0: dA, a1: dB, s: z0, h: z0 + 1.92 };
  lw(g, 'x', -hx, hx, -hy, -hy + T, z0, zh, [], wm, { grain: 'z' });
  lw(g, 'x', -hx, hx, hy - T, hy, z0, zl, [{ a0: -0.25, a1: 0.25, s: z0 + 1.4, h: z0 + 1.78 }], wm, { grain: 'z' });
  for (const sx of [-1, 1]) {
    const t0 = sx > 0 ? hx - T : -hx,
      t1 = sx > 0 ? hx : -hx + T;
    lw(g, 'y', -hy + T, hy - T, t0, t1, z0, zl, sx < 0 ? [DW] : [], wm, { grain: 'z' });
    ltrap(g, 'y', -hy + T, hy - T, t0, t1, zl, zTop(-hy + T), zl, wm);
  }
  lwin(g, 'x', -0.25, 0.25, hy - T / 2, z0 + 1.4, z0 + 1.78, { frame: MATS.white, fw: 0.04, depth: T + 0.02 });
  ljamb(g, 'y', dA, dB, -hx - 0.005, -hx + T, z0, z0 + 1.92, MAT.frame, 0.04);
  gB(g, -hx + T, hx - T, -hy + T, hy - T, z0, z0 + 0.01, MAT.slate, { cast: false });
  const ov = 0.25;
  for (let i = 0; i < 5; i++) {
    const x = -hx + 0.05 + (i * (b.L - 0.1)) / 4;
    beam([x, -hy - ov, zTop(-hy - ov) + 0.05], [x, hy + ov, zTop(hy + ov) + 0.05], 0.05, 0.1, MAT.kvh, { parent: g });
  }
  slopeSlab(
    g,
    0,
    0,
    (zh + zl) / 2 + 0.12,
    b.L + 0.2,
    b.W + 2 * ov,
    0.024,
    -(zTop(-hy - ov) - zTop(hy + ov)),
    MAT.plank
  );
  slopeSlab(
    g,
    0,
    0,
    (zh + zl) / 2 + 0.145,
    b.L + 0.24,
    b.W + 2 * ov + 0.04,
    0.012,
    -(zTop(-hy - ov) - zTop(hy + ov)),
    MATS.felt
  );
  cyl(hx - 0.35, 0.2, zl + 0.1, zh + 0.75, 0.04, MAT.steel, 12, undefined, { parent: g });
  cyl(0.55, -hy - 0.42, 0, 0.95, 0.3, MAT.black, 20, undefined, { parent: g });
  gB(g, 0.22, 0.88, -hy - 0.75, -hy - 0.72, 0.9, 0.97, MAT.black, { cast: false });
  gB(g, -hx - 0.7, -hx, -0.5, 0.5, 0, 0.08, MAT.conc, { cast: false });
  // interior: WC at the east wall facing the door, washbasin with tap and mirror on the south wall, shelf on the north wall, water canister
  gB(g, 0.5, 0.92, -0.23, 0.23, z0, z0 + 0.42, MATS.white, { bevel: 0.02 });
  gB(g, 0.48, 0.94, -0.25, 0.25, z0 + 0.42, z0 + 0.46, MATS.white, { cast: false });
  gB(g, 0.76, 0.94, -0.21, 0.21, z0 + 0.46, z0 + 0.85, MATS.white, { cast: false });
  gB(g, -0.45, 0.1, -hy + T, -hy + T + 0.4, z0, z0 + 0.8, MAT.larchIn, { grain: 'z' });
  gB(g, -0.47, 0.12, -hy + T, -hy + T + 0.42, z0 + 0.8, z0 + 0.83, MAT.oak, { cast: false });
  cyl(-0.18, -hy + T + 0.22, z0 + 0.83, z0 + 0.95, 0.17, MATS.white, 20, 0.12, { parent: g, cast: false });
  gB(g, -0.22, -0.14, -hy + T + 0.02, -hy + T + 0.12, z0 + 0.95, z0 + 1.15, MAT.steel, { cast: false });
  gB(g, -0.4, 0.05, -hy + T, -hy + T + 0.01, z0 + 1.15, z0 + 1.6, MATS.white, { cast: false });
  gB(g, -0.1, 0.8, hy - T - 0.25, hy - T, z0 + 1.25, z0 + 1.28, MAT.oak, { cast: false });
  gB(g, 0.55, 0.9, 0.35, hy - T - 0.02, z0, z0 + 0.4, MATS.blue, { cast: false });
  lwalk(r, -hx, hx, -hy, hy, z0 + 0.01, 'stone');
  lwalk(r, -hx - 0.7, -hx, -0.5, 0.5, 0.08, 'stone');
  lcol(r, -hx, hx, -hy - 0.02, -hy + T, 0, zh);
  lcol(r, -hx, hx, hy - T, hy + 0.02, 0, zl);
  lwc(r, 'y', -hy, hy, -hx - 0.02, -hx + T, 0, zl, [{ a0: dA, a1: dB, s: -0.1, h: z0 + 1.92 }]);
  lcol(r, hx - T, hx + 0.02, -hy, hy, 0, zh);
  lcol(r, 0.48, 0.94, -0.25, 0.25, z0, z0 + 0.85, 'wc');
  lcol(r, -0.47, 0.12, -hy + T, -hy + T + 0.42, z0, z0 + 0.95, 'sink');
  lcol(r, 0.55, 0.9, 0.35, hy - T, z0, z0 + 0.4, 'canister');
  lcol(r, 0.25, 0.85, -hy - 0.72, -hy - 0.12, 0, 0.95, 'barrel');
  ldoor('washhouse', b, boardLeaf(0.73, 1.9, { mat: MAT.larchIn }), {
    lx: -hx + 0.03,
    ly: dA + 0.01,
    dir: [0, 1],
    w: 0.73,
    sign: 1,
    z0: z0 + 0.01,
    z1: z0 + 1.91,
  });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: zh + 0.3, name: 'Waschhaus' });
  FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
}
bldEnd(BLD.washhouse);
