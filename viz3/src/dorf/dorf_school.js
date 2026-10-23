// ===================== feat/dorf village life 3: the room in the old school (DSCHOOL) =====================
// The old school of 1828 (building 215, world/village.js; turret and clock world/village_props.js) – today the club house of the fire
// brigade – gets a room inside for the Skat and Rummy evening on Fridays: oak floor, clay walls with wainscoting, a ceiling of boards up into
// the roof with collar beams, windows where the facade has them, a bar corner, the Skat table, the Rummy table with a free chair, the long
// table of the brigade, a stove, the old blackboard, pendant lamps. Built the first time one comes near (nothing is loaded before).
// The door: the facade quad with the painted door is replaced by the parts around a real opening (same wall material, same shader – no new
// program), a door leaf turns inward; open only while the evening runs (DCAL), else it is locked. Walking: a floor (WALK), walls, furniture
// and the closed door as colliders (COL, rotated boxes) – they also keep the third-person camera inside; in the doorway the walls of the
// world (WCOL) step aside (a KERN pushOut provider). Light: no new lights (that would compile every shader again) – while the evening
// runs and one is near, three of the pavilion's interior lights are borrowed and hang over the tables and the bar; they go back after.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { COL, WALK } from '../core/geo.js';
import { P, rebuildGrids } from '../game/walkable.js';
import { LIGHTSTATE } from '../game/home.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { WCOL } from '../world/worldcol.js';
import { DN } from '../time/daynight.js';
export const DSCHOOL = (() => {
  const S = {
    built: false,
    F: null,
    open: 0,
    want: 0,
    lit: false,
    meshes: [],
    cols: [],
    walks: [],
    seats: {},
    err: null,
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  // ---- the room's frame: x along the wall with the door (from its start), y into the house, h above the floor; site = O + x·(c, s) + y·(−s, c) ----
  function frame() {
    const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(215);
    if (!b) return null;
    const f = b.fac.find(q => q.door);
    if (!f) return null;
    let ox = f.ax,
      oy = f.ay,
      c = f.dx,
      s = f.dy,
      du = f.door.u;
    if (-s * -f.nx + c * -f.ny < 0) {
      ox = f.bx;
      oy = f.by;
      c = -c;
      s = -s;
      du = f.L - du;
    } // the inside must lie to the left of x
    let D = 0;
    for (const g of b.fac)
      for (const [x, y] of [
        [g.ax, g.ay],
        [g.bx, g.by],
      ])
        D = Math.max(D, (x - ox) * -s + (y - oy) * c);
    const zF = b.foot + 0.35; // the floor at the door's sill (the facade draws the door 0.35 m above the foot)
    return { b, f, ox, oy, c, s, L: f.L, D, du, dw: f.door.w || 1.1, zF, eave: b.eave, rot: { cx: ox, cy: oy, c, s } };
  }
  const toW = (x, y) => [S.F.ox + x * S.F.c - y * S.F.s, S.F.oy + x * S.F.s + y * S.F.c];
  const toL = (x, y) => {
    const dx = x - S.F.ox,
      dy = y - S.F.oy;
    return [dx * S.F.c + dy * S.F.s, -dx * S.F.s + dy * S.F.c];
  };
  // a compass heading (deg, 0 = north) for a direction in the room's frame
  const az = (dx, dy) => {
    const wx = dx * S.F.c - dy * S.F.s,
      wy = dx * S.F.s + dy * S.F.c;
    return (Math.atan2(wx, wy) * 180) / Math.PI;
  };
  // ---- geometry in the room's frame (three: x, h, −y), uv in metres; collected per material, merged at the end ----
  const BOX = new Map();
  function uvBox(g, grain) {
    const p = g.attributes.position,
      n = g.attributes.normal,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        h = p.getY(i),
        y = -p.getZ(i),
        ax = Math.abs(n.getX(i)),
        ah = Math.abs(n.getY(i)),
        ay = Math.abs(n.getZ(i));
      if (ah >= ax && ah >= ay) uv.setXY(i, grain === 'y' ? x : y, grain === 'y' ? y : x);
      else if (ax >= ay) uv.setXY(i, y, h);
      else uv.setXY(i, x, h);
    }
  }
  function put(m, g) {
    if (!BOX.has(m)) BOX.set(m, []);
    BOX.get(m).push(g);
  }
  // box x0..x1, y0..y1, h0..h1; a: turned about its centre (rad, counter-clockwise seen from above)
  function box(m, x0, x1, y0, y1, h0, h1, o = {}) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || h1 - h0 < 1e-4) return;
    const g = new THREE.BoxGeometry(x1 - x0, h1 - h0, y1 - y0);
    uvBox(g, o.grain);
    if (o.a) g.rotateY(o.a);
    g.translate((x0 + x1) / 2, (h0 + h1) / 2, -(y0 + y1) / 2);
    put(m, g);
  }
  function cylY(m, x, y, h0, h1, r0, r1, seg = 12, o = {}) {
    const g = new THREE.CylinderGeometry(r1, r0, h1 - h0, seg, 1, !!o.open);
    g.translate(x, (h0 + h1) / 2, -y);
    put(m, g);
  }
  // a sloped board from (y0, h0) to (y1, h1), across x0..x1, thickness t (under the line)
  function slope(m, x0, x1, y0, h0, y1, h1, t) {
    const len = Math.hypot(y1 - y0, h1 - h0),
      g = new THREE.BoxGeometry(x1 - x0, t, len);
    uvBox(g, 'x');
    g.translate(0, -t / 2, 0);
    g.rotateX(Math.atan2(h1 - h0, y1 - y0));
    g.translate((x0 + x1) / 2, (h0 + h1) / 2, -(y0 + y1) / 2);
    put(m, g);
  }
  // a flat polygon [[y, h], …] in the plane x = x0, facing +x (dir 1) or −x (dir −1)
  function wallPoly(m, x0, pts, dir) {
    const sh = new THREE.Shape(pts.map(([y, h]) => new THREE.Vector2(y, h)));
    const g = new THREE.ShapeGeometry(sh);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getX(i),
        h = p.getY(i);
      p.setXYZ(i, x0, h, -y);
    }
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getZ(i) * -1, p.getY(i));
    g.computeVertexNormals();
    const nx = g.attributes.normal.getX(0);
    if (nx * dir < 0) {
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i += 3) {
        const t = ix[i + 1];
        ix[i + 1] = ix[i + 2];
        ix[i + 2] = t;
      }
      g.computeVertexNormals();
    }
    put(m, g.toNonIndexed());
  }
  // colliders and walk surfaces in the room's frame (rotated boxes, game/walkable.js; index 9 = rotation)
  const col = (x0, x1, y0, y1, h0, h1, tag = 'dorf') => {
    const e = [x0, x1, y0, y1, S.F.zF + h0, S.F.zF + h1, tag, null, null, S.F.rot, null];
    COL.push(e);
    S.cols.push(e);
    return e;
  };
  const walk = (x0, x1, y0, y1, h, kind = 'wood') => {
    const e = [x0, x1, y0, y1, S.F.zF + h, kind, null, null, undefined, S.F.rot, null];
    WALK.push(e);
    S.walks.push(e);
    return e;
  };
  // ---- materials: the shared ones where they fit (no new shader programs); lamps, glass, chalk board, small things of their own ----
  const M = {};
  function mats() {
    M.floor = MAT.oak;
    M.wall = MAT.clay;
    M.panel = MAT.furnP || MAT.oakF;
    M.ceil = MAT.ceilP || MAT.larchIn;
    M.beam = MAT.frame;
    M.wood = MAT.oak;
    M.dark = MAT.blacksteel;
    M.stone = MAT.stone;
    M.cloth = MAT.linenP || MAT.linen;
    M.door = plain({ color: new THREE.Color().setRGB(...L(0.42, 0.24, 0.13)), roughness: 0.75 });
    M.lamp = plain({
      color: 0xf3ead8,
      emissive: 0xffc27a,
      emissiveIntensity: 0,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    M.glass = plain({ color: 0x0b0f14, roughness: 0.12, metalness: 0, emissive: 0x000000 });
    M.kit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 }); // as world/village_props.js: same program
    M.board = plain({ map: chalkTex(), roughness: 0.9 });
  }
  function chalkTex() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 320;
    const x = c.getContext('2d');
    x.fillStyle = '#23302a';
    x.fillRect(0, 0, 512, 320);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
      x.fillRect(Math.random() * 512, Math.random() * 320, 2 + Math.random() * 30, 1 + Math.random() * 3);
    } // wiped chalk
    x.fillStyle = '#ecebe2';
    x.textAlign = 'center';
    x.font = 'italic 44px Georgia, serif';
    x.fillText('Skat & Rommé', 256, 78);
    x.font = '30px Georgia, serif';
    x.fillText('jeden Freitag ab 19 Uhr', 256, 130);
    x.font = '24px Georgia, serif';
    x.fillText('Feuer am Acker: jeden 2. Samstag', 256, 186);
    x.font = 'italic 22px Georgia, serif';
    x.fillText('Gerhard 1 · Manfred 0 · Wolfgang 2', 256, 250);
    x.fillText('FF Ratscher – seit 1828 unter einem Dach', 256, 292);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // ---- the room ----
  const R0 = { wall: 0.3, hW: 2.2, hC: 4.25, slopeW: 2.2 }; // wall thickness, height of the walls, of the flat ceiling, width of the slopes
  function room(kit) {
    const { L: Lx, D, du, dw } = S.F,
      t = R0.wall,
      x0 = t,
      x1 = Lx - t,
      y0 = t,
      y1 = D - t,
      hW = R0.hW,
      hC = R0.hC,
      sw = R0.slopeW,
      dl = du - dw / 2,
      dr = du + dw / 2,
      hD = 2.15;
    // floor (boards along the room), skirting
    box(M.floor, x0, x1, y0, y1, -0.08, 0, { grain: 'x' });
    // walls: wainscoting up to 0.95 m, clay plaster above; the door wall in parts around the opening
    const wallX = (xa, xb, yy, dir) => {
      const yi = dir > 0 ? yy : yy - 0.02,
        yo = dir > 0 ? yy + 0.02 : yy;
      box(M.panel, xa, xb, dir > 0 ? yy : yy - 0.03, dir > 0 ? yy + 0.03 : yy, 0, 0.95, { grain: 'y' });
      box(M.wall, xa, xb, yi, yo, 0.95, hW);
    };
    wallX(x0, dl, y0, 1);
    wallX(dr, x1, y0, 1);
    box(M.wall, dl, dr, y0, y0 + 0.02, hD, hW); // over the door
    wallX(x0, x1, y1, -1);
    for (const [xx, dir] of [
      [x0, 1],
      [x1, -1],
    ]) {
      box(M.panel, dir > 0 ? xx : xx - 0.03, dir > 0 ? xx + 0.03 : xx, y0, y1, 0, 0.95, { grain: 'y' });
      // the gable wall up to the ceiling: a pentagon
      wallPoly(
        M.wall,
        xx + (dir > 0 ? 0.001 : -0.001),
        [
          [y0, 0.95],
          [y1, 0.95],
          [y1, hW],
          [y1 - sw, hC],
          [y0 + sw, hC],
          [y0, hW],
        ],
        dir
      );
    }
    // ceiling: boards on the slopes and the flat part between the collar beams; beams across every 2.2 m
    slope(M.ceil, x0, x1, y0, hW, y0 + sw, hC, 0.04);
    slope(M.ceil, x0, x1, y1 - sw, hC, y1, hW, 0.04);
    box(M.ceil, x0, x1, y0 + sw - 0.05, y1 - sw + 0.05, hC, hC + 0.04, { grain: 'x' });
    for (let x = x0 + 1.0; x < x1 - 0.5; x += 2.2) {
      box(M.beam, x - 0.09, x + 0.09, y0, y1, hC - 0.2, hC, { grain: 'y' }); // collar beam
      slope(M.beam, x - 0.08, x + 0.08, y0, hW - 0.04, y0 + sw, hC - 0.04, 0.16); // rafters
      slope(M.beam, x - 0.08, x + 0.08, y1 - sw, hC - 0.04, y1, hW - 0.04, 0.16);
    }
    box(M.beam, x0, x1, y0, y0 + 0.18, hW - 0.16, hW + 0.02); // wall plates
    box(M.beam, x0, x1, y1 - 0.18, y1, hW - 0.16, hW + 0.02);
    // the doorway: frame and reveal through the wall, sill
    box(M.door, dl - 0.1, dl, -0.02, t + 0.02, 0, hD + 0.1);
    box(M.door, dr, dr + 0.1, -0.02, t + 0.02, 0, hD + 0.1);
    box(M.door, dl - 0.1, dr + 0.1, -0.02, t + 0.02, hD, hD + 0.1);
    box(M.stone, dl - 0.15, dr + 0.15, -0.42, t, -0.3, 0); // sandstone sill, a step outside
    // windows: the bays of the facade shader (world/village.js: spacing 2.25 m on the school, windows 1.0 m wide, from 0.95 m to the eave)
    const wins = [],
      sp = 2.25,
      bays = (len, skipU) => {
        const nb = Math.max(1, Math.floor((len - 0.6) / sp)),
          bw = len / nb,
          out = [];
        for (let i = 0; i < nb; i++) {
          const bc = (i + 0.5) * bw;
          if (skipU != null && Math.abs(bc - skipU) < Math.max(bw * 0.5, dw * 0.5 + 0.6)) continue;
          out.push(bc);
        }
        return out;
      };
    for (const u of bays(Lx, du)) wins.push({ x: u, y: y0, n: [0, 1] });
    for (const u of bays(Lx)) wins.push({ x: u, y: y1, n: [0, -1] });
    for (const u of bays(D)) {
      wins.push({ x: x0, y: u, n: [1, 0] });
      wins.push({ x: x1, y: u, n: [-1, 0] });
    }
    S.wins = wins;
    for (const w of wins) win(w, kit);
    // the stove in the north-east corner, its pipe into the wall
    const sx = x1 - 0.75,
      sy = y1 - 0.75;
    box(M.stone, sx - 0.45, sx + 0.45, sy - 0.45, sy + 0.45, 0, 0.12);
    cylY(M.dark, sx, sy, 0.12, 1.05, 0.26, 0.26, 14);
    cylY(M.dark, sx, sy, 1.05, 1.12, 0.3, 0.28, 14);
    cylY(M.dark, sx, sy, 1.12, 2.05, 0.07, 0.07, 8);
    col(sx - 0.45, sx + 0.45, sy - 0.45, sy + 0.45, 0, 1.2);
    // the blackboard on the east gable, between two windows
    {
      const yb = D / 2,
        xb = x1 - 0.035;
      box(M.beam, xb - 0.03, xb, yb - 0.78, yb + 0.78, 1.0, 2.0);
      const g = new THREE.PlaneGeometry(1.48, 0.92);
      g.rotateY(-Math.PI / 2);
      g.translate(xb - 0.032, 1.5, -yb);
      const me = new THREE.Mesh(g, M.board);
      add(me);
      box(M.wood, xb - 0.1, xb, yb - 0.7, yb + 0.7, 0.96, 1.0); // chalk ledge
    }
    // colliders: walls (also for the camera), door frame; the floor; the ceiling as slabs for the camera
    col(-0.05, x0, -0.05, D + 0.05, -0.4, hC + 0.3);
    col(x1, Lx + 0.05, -0.05, D + 0.05, -0.4, hC + 0.3);
    col(x0, x1, y1, D + 0.05, -0.4, hC + 0.3);
    col(-0.05, dl, -0.05, y0, -0.4, hC + 0.3);
    col(dr, Lx + 0.05, -0.05, y0, -0.4, hC + 0.3);
    col(dl, dr, -0.05, y0, hD, hC + 0.3);
    S.doorCol = col(dl, dr, 0.02, 0.22, -0.4, hD); // the closed door (off while it is open)
    walk(x0 - 0.02, x1 + 0.02, y0 - 0.02, y1 + 0.02, 0);
    walk(dl, dr, -0.42, y0, 0, 'stone');
    for (const [ya, yb, h] of [
      [y0, y0 + 0.7, hW + 0.4],
      [y0 + 0.7, y0 + 1.45, hW + 1.15],
      [y0 + 1.45, y1 - 1.45, hC - 0.18],
      [y1 - 1.45, y1 - 0.7, hW + 1.15],
      [y1 - 0.7, y1, hW + 0.4],
    ])
      walk(x0, x1, ya, yb, h, 'ceil');
  }
  // a window seen from inside: frame with two casements and a transom (as the facade), glass, a sill
  function win(w, kit) {
    const ww = 1.0,
      h0 = 0.95,
      h1 = 2.12,
      fr = 0.06,
      along = Math.abs(w.n[1]) > 0.5; // on a long wall: runs along x
    // a box a0..a1 along the wall, n0..n1 off the wall into the room
    const BB = (a0, a1, n0, n1, hh0, hh1, m) => {
      if (along) {
        const ya = w.y + n0 * w.n[1],
          yb = w.y + n1 * w.n[1];
        box(m, w.x + a0, w.x + a1, Math.min(ya, yb), Math.max(ya, yb), hh0, hh1);
      } else {
        const xa = w.x + n0 * w.n[0],
          xb = w.x + n1 * w.n[0];
        box(m, Math.min(xa, xb), Math.max(xa, xb), w.y + a0, w.y + a1, hh0, hh1);
      }
    };
    BB(-ww / 2, ww / 2, 0.021, 0.026, h0, h1, M.glass);
    const white = MAT.towerIn || MAT.linen;
    BB(-ww / 2 - fr, -ww / 2, 0.021, 0.07, h0, h1 + fr, white);
    BB(ww / 2, ww / 2 + fr, 0.021, 0.07, h0, h1 + fr, white);
    BB(-ww / 2, ww / 2, 0.021, 0.07, h1, h1 + fr, white);
    BB(-ww / 2, ww / 2, 0.021, 0.07, h0, h0 + fr, white);
    BB(-0.025, 0.025, 0.021, 0.055, h0 + fr, h1 - 0.38, white); // mullion
    BB(-ww / 2, ww / 2, 0.021, 0.055, h1 - 0.4, h1 - 0.35, white); // transom
    BB(-ww / 2 - 0.12, ww / 2 + 0.12, 0.0, 0.19, h0 - 0.04, h0, M.wood); // sill board
    if ((Math.round(w.x * 7 + w.y * 13) & 3) === 0) {
      // a flower pot on some sills
      const px = along ? w.x + 0.25 : w.x + w.n[0] * 0.1,
        py = along ? w.y + w.n[1] * 0.1 : w.y + 0.25;
      kit.cyl(px, py, h0, h0 + 0.14, 0.07, 0.09, 8, L(0.62, 0.33, 0.22), true);
      kit.ball(px, py, h0 + 0.22, 0.11, L(0.25, 0.42, 0.18), 7);
    }
  }
  // furniture: tables, chairs, benches, the bar; seats for the villagers and the free chair
  function chair(x, y, a, kit) {
    // a: the way the sitter faces (rad in the room's frame, 0 = +x)
    const c = Math.cos(a),
      s = Math.sin(a),
      P2 = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    box(M.wood, x - 0.21, x + 0.21, y - 0.21, y + 0.21, 0.43, 0.47, { a: a });
    for (const [u, v] of [
      [-0.18, -0.18],
      [-0.18, 0.18],
      [0.18, -0.18],
      [0.18, 0.18],
    ]) {
      const [px, py] = P2(u, v);
      box(M.wood, px - 0.02, px + 0.02, py - 0.02, py + 0.02, 0, u < 0 ? 0.95 : 0.43);
    }
    const [bx, by] = P2(-0.19, 0);
    box(M.wood, bx - 0.015, bx + 0.015, by - 0.2, by + 0.2, 0.62, 0.92, { a: a });
    void kit;
    return { x, y, a, top: 0.47 };
  }
  function furniture(kit) {
    const { L: Lx, D } = S.F,
      t = R0.wall;
    // the Skat table (round) with three chairs – Gerhard, Manfred, Wolfgang
    const T1 = [8.4, D - 3.4];
    cylY(M.wood, T1[0], T1[1], 0.71, 0.75, 0.58, 0.58, 20);
    cylY(M.wood, T1[0], T1[1], 0.06, 0.71, 0.06, 0.06, 8);
    cylY(M.wood, T1[0], T1[1], 0, 0.06, 0.3, 0.3, 12);
    col(T1[0] - 0.55, T1[0] + 0.55, T1[1] - 0.55, T1[1] + 0.55, 0, 0.76);
    const sk = [Math.PI / 2, (Math.PI * 7) / 6, (-Math.PI * 1) / 6].map(a => {
      const x = T1[0] + Math.cos(a) * 0.9,
        y = T1[1] + Math.sin(a) * 0.9;
      return chair(x, y, a + Math.PI, kit);
    });
    S.seats.gerhard = sk[0];
    S.seats.manfred = sk[1];
    S.seats.wolfgang = sk[2];
    // cards: a fan before each player, the trick in the middle, the score pad
    for (const st of sk) {
      const cx = T1[0] + Math.cos(st.a + Math.PI) * 0.36,
        cy = T1[1] + Math.sin(st.a + Math.PI) * 0.36;
      for (let k = 0; k < 4; k++)
        kit.box(
          cx + (k - 1.5) * 0.03,
          cy,
          0.751 + k * 0.002,
          0.063,
          0.09,
          0.002,
          st.a + (k - 1.5) * 0.25,
          L(0.93, 0.92, 0.88)
        );
      kit.cyl(cx + 0.14, cy + 0.08, 0.75, 0.86, 0.035, 0.035, 8, L(0.85, 0.62, 0.2), true); // a glass of beer
      kit.cyl(cx + 0.14, cy + 0.08, 0.86, 0.885, 0.036, 0.036, 8, L(0.95, 0.94, 0.9), true);
    }
    for (let k = 0; k < 3; k++)
      kit.box(
        T1[0] + (k - 1) * 0.05,
        T1[1] + (k % 2) * 0.03,
        0.752 + k * 0.002,
        0.063,
        0.09,
        0.002,
        k * 0.9,
        k === 1 ? L(0.75, 0.12, 0.1) : L(0.93, 0.92, 0.88)
      );
    kit.box(T1[0] + 0.2, T1[1] - 0.22, 0.751, 0.15, 0.21, 0.004, 0.3, L(0.96, 0.96, 0.92)); // the score pad
    // the Rummy table (square) – Ingrid, Katrin and the free chair for the player
    const T2 = [12.3, 3.7];
    box(M.wood, T2[0] - 0.5, T2[0] + 0.5, T2[1] - 0.5, T2[1] + 0.5, 0.71, 0.75, { grain: 'x' });
    box(M.cloth, T2[0] - 0.42, T2[0] + 0.42, T2[1] - 0.42, T2[1] + 0.42, 0.75, 0.755); // the cloth
    for (const [u, v] of [
      [-0.44, -0.44],
      [-0.44, 0.44],
      [0.44, -0.44],
      [0.44, 0.44],
    ])
      box(M.wood, T2[0] + u - 0.03, T2[0] + u + 0.03, T2[1] + v - 0.03, T2[1] + v + 0.03, 0, 0.71);
    col(T2[0] - 0.5, T2[0] + 0.5, T2[1] - 0.5, T2[1] + 0.5, 0, 0.76);
    S.seats.ingrid = chair(T2[0], T2[1] + 0.82, -Math.PI / 2, kit);
    S.seats.katrin = chair(T2[0] + 0.82, T2[1], Math.PI, kit);
    S.seats.player = chair(T2[0] - 0.82, T2[1], 0, kit);
    chair(T2[0], T2[1] - 0.82, Math.PI / 2, kit);
    for (const [u, v, a] of [
      [0, 0.25, -Math.PI / 2],
      [0.25, 0, Math.PI],
      [-0.25, 0, 0],
    ])
      for (let k = 0; k < 5; k++)
        kit.box(
          T2[0] + u + (k - 2) * 0.025,
          T2[1] + v,
          0.756 + k * 0.002,
          0.063,
          0.09,
          0.002,
          a + (k - 2) * 0.2,
          L(0.93, 0.92, 0.88)
        );
    for (let k = 0; k < 6; k++)
      kit.box(T2[0] - 0.05, T2[1] - 0.05, 0.757 + k * 0.002, 0.063, 0.09, 0.002, 0.1, L(0.2, 0.25, 0.55)); // the stock
    kit.cyl(T2[0] + 0.3, T2[1] + 0.3, 0.755, 0.84, 0.04, 0.035, 8, L(0.95, 0.94, 0.9), true); // tea cups
    kit.cyl(T2[0] + 0.3, T2[1] - 0.3, 0.755, 0.84, 0.04, 0.035, 8, L(0.95, 0.94, 0.9), true);
    // the long table of the brigade under the north windows, benches
    const T3 = [6.2, D - 1.25];
    box(M.wood, T3[0] - 1.6, T3[0] + 1.6, T3[1] - 0.4, T3[1] + 0.4, 0.71, 0.76, { grain: 'x' });
    for (const u of [-1.4, 1.4]) box(M.wood, T3[0] + u - 0.05, T3[0] + u + 0.05, T3[1] - 0.32, T3[1] + 0.32, 0, 0.71);
    for (const v of [-0.72, 0.62]) {
      box(M.wood, T3[0] - 1.5, T3[0] + 1.5, T3[1] + v - 0.15, T3[1] + v + 0.15, 0.42, 0.46, { grain: 'x' });
      for (const u of [-1.3, 1.3])
        box(M.wood, T3[0] + u - 0.04, T3[0] + u + 0.04, T3[1] + v - 0.12, T3[1] + v + 0.12, 0, 0.42);
    }
    col(T3[0] - 1.6, T3[0] + 1.6, T3[1] - 0.9, T3[1] + 0.8, 0, 0.76);
    // the bar corner at the west gable: counter, shelf with bottles and glasses, stools; Uwe behind it
    const bx0 = t + 0.05,
      bx1 = 3.3,
      by0 = D - 3.5,
      by1 = by0 + 0.6;
    box(M.panel, bx0, bx1, by0, by1, 0, 1.0, { grain: 'y' });
    box(M.wood, bx0, bx1 + 0.05, by0 - 0.06, by1, 1.0, 1.06, { grain: 'x' });
    box(M.dark, bx0, bx1, by0 - 0.03, by0, 0.08, 0.12); // foot rail
    col(bx0, bx1 + 0.05, by0 - 0.06, by1, 0, 1.06);
    const shY = D - t - 0.18;
    for (const h of [1.2, 1.6, 2.0]) box(M.wood, bx0, bx1, shY - 0.14, shY + 0.15, h, h + 0.03, { grain: 'x' });
    for (let i = 0; i < 18; i++) {
      const x = bx0 + 0.2 + (i % 9) * 0.32,
        h = i < 9 ? 1.23 : 1.63,
        bottle = i % 3 !== 0;
      if (bottle) {
        const col2 = [L(0.12, 0.3, 0.1), L(0.45, 0.25, 0.08), L(0.85, 0.85, 0.82)][
          i % 3 === 1 ? 0 : (i * 7) % 2 ? 1 : 2
        ];
        kit.cyl(x, shY, h, h + 0.22, 0.035, 0.035, 8, col2, false);
        kit.cyl(x, shY, h + 0.22, h + 0.3, 0.035, 0.012, 8, col2, true);
      } else kit.cyl(x, shY, h, h + 0.12, 0.03, 0.036, 8, L(0.8, 0.82, 0.82), true);
    }
    col(bx0, bx1, shY - 0.18, D, 0, 2.2);
    box(M.dark, 1.4, 1.75, by0 + 0.1, by0 + 0.45, 1.06, 1.32); // the tap
    kit.cyl(1.58, by0 + 0.12, 1.32, 1.5, 0.018, 0.018, 6, L(0.75, 0.75, 0.72), true);
    for (const x of [0.8, 1.6, 2.4]) {
      cylY(M.wood, x, by0 - 0.5, 0.72, 0.76, 0.18, 0.18, 12);
      cylY(M.dark, x, by0 - 0.5, 0.0, 0.72, 0.025, 0.025, 6);
      cylY(M.dark, x, by0 - 0.5, 0.0, 0.03, 0.17, 0.17, 10);
    }
    S.seats.uwe = { x: 1.9, y: by1 + 0.55, a: -Math.PI / 2, stand: true };
    S.bar = { x: 1.9, y: by0 - 0.4 };
    // pennant of the brigade over the bar, the old school photo
    kit.box(t + 0.03, by0 - 0.9, 2.45, 0.02, 1.0, 0.62, 0, L(0.62, 0.08, 0.06));
    kit.box(t + 0.045, by0 - 0.9, 2.58, 0.02, 0.56, 0.36, 0, L(0.95, 0.92, 0.82));
    kit.box(7.95, t + 0.03, 1.5, 0.6, 0.02, 0.45, 0, L(0.3, 0.2, 0.12));
    kit.box(7.95, t + 0.045, 1.54, 0.52, 0.02, 0.37, 0, L(0.62, 0.58, 0.5));
    // coat hooks by the door
    box(M.wood, S.F.du + 0.9, S.F.du + 1.9, t, t + 0.03, 1.62, 1.72);
    for (let k = 0; k < 4; k++)
      kit.cyl(S.F.du + 1.0 + k * 0.27, t + 0.06, 1.62, 1.68, 0.012, 0.012, 6, L(0.15, 0.15, 0.15), true);
    // lamps: a shade on a cord over each table and the bar; the borrowed lights hang under them
    S.lamps = [
      [T1[0], T1[1], 2.35],
      [T2[0], T2[1], 2.3],
      [1.9, by0 - 0.1, 2.45],
      [T3[0], T3[1], 2.5],
    ];
    for (const [x, y, h] of S.lamps) {
      cylY(M.lamp, x, y, h, h + 0.22, 0.27, 0.06, 16, { open: true });
      cylY(M.dark, x, y, h + 0.22, ceilH(y) - 0.02, 0.006, 0.006, 4);
    }
  }
  // height of the ceiling over y (slopes at the long walls)
  function ceilH(y) {
    const { D } = S.F,
      t = R0.wall,
      { hW, hC, slopeW: sw } = R0;
    if (y < t + sw) return hW + ((y - t) / sw) * (hC - hW);
    if (y > D - t - sw) return hW + ((D - t - y) / sw) * (hC - hW);
    return hC;
  }
  function add(me) {
    me.userData.noMerge = true;
    me.castShadow = false;
    me.receiveShadow = true;
    S.grp.add(me);
    S.meshes.push(me);
    return me;
  }
  // ---- the opening in the facade: the wall quad with the door becomes four parts around it (bilinear in the quad, all attributes) ----
  function cutDoor() {
    const F = S.F,
      wm = RATSCHER.bld[0],
      g = wm && wm.geometry,
      f = F.f,
      dU = f.door.u,
      dW = F.dw;
    if (!g || !g.index) return false;
    const q = f.qs.find(k => k.u0 <= dU - dW / 2 + 1e-3 && k.u0 + k.len >= dU + dW / 2 - 1e-3);
    if (!q) return false;
    const s0 = q.q * 4,
      A = g.attributes,
      names = Object.keys(A);
    const val = (a, s, t) => {
      const k = a.itemSize,
        o = [];
      for (let j = 0; j < k; j++) {
        const af = a.array[s0 * k + j],
          at = a.array[(s0 + 1) * k + j],
          bf = a.array[(s0 + 2) * k + j],
          bt = a.array[(s0 + 3) * k + j];
        o.push((af + (at - af) * t) * (1 - s) + (bf + (bt - bf) * t) * s);
      }
      return o;
    };
    const vAt = (s, t) => val(A.aW, s, t)[1],
      tAt = (s, v) => (v - vAt(s, 0)) / (vAt(s, 1) - vAt(s, 0) || 1);
    const sl = (dU - dW / 2 - q.u0) / q.len,
      sr = (dU + dW / 2 - q.u0) / q.len,
      vb = 0.35,
      vt = 0.35 + 2.15;
    // quads: [s0, s1, t at s0 low, high, t at s1 low, high] (functions of s for the parts under and over the door)
    const parts = [
      [0, sl, () => 0, () => 1],
      [sr, 1, () => 0, () => 1],
      [sl, sr, () => 0, s => tAt(s, vb)],
      [sl, sr, s => tAt(s, vt), () => 1],
    ];
    const out = {};
    for (const n of names) out[n] = [];
    const idx = [];
    parts.forEach(([sa, sb, lo, hi], i) => {
      for (const [s, t] of [
        [sa, lo(sa)],
        [sa, hi(sa)],
        [sb, lo(sb)],
        [sb, hi(sb)],
      ])
        for (const n of names) out[n].push(...val(A[n], s, t));
      const b = i * 4;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    });
    const ng = new THREE.BufferGeometry();
    for (const n of names) ng.setAttribute(n, new THREE.Float32BufferAttribute(out[n], A[n].itemSize));
    ng.setIndex(idx);
    ng.computeBoundingSphere();
    const me = new THREE.Mesh(ng, wm.material);
    me.userData.noMerge = true;
    me.castShadow = false;
    me.receiveShadow = false;
    scene.add(me);
    RATSCHER.bld.push(me); // hidden with the buildings in the map view
    S.cutMesh = me;
    const ix = g.index.array,
      k0 = q.q * 6;
    S.cutIdx = { k0, old: Array.from(ix.slice(k0, k0 + 6)) };
    for (let k = 0; k < 6; k++) ix[k0 + k] = s0; // the old quad collapses
    g.index.needsUpdate = true;
    return true;
  }
  // ---- the door leaf: hinged on the left jamb (seen from outside), opens inward ----
  function doorLeaf() {
    const { du, dw } = S.F,
      w = dw - 0.02,
      hD = 2.13;
    const leaf = new THREE.Group(),
      pv = new THREE.Group();
    const parts = [
      [0, w, 0, hD, 0, 0.05],
      [0.1, w - 0.1, 0.12, 0.95, -0.012, 0.0],
      [0.1, w - 0.1, 1.1, 1.95, -0.012, 0.0],
      [0.1, w - 0.1, 0.12, 0.95, 0.05, 0.062],
      [0.1, w - 0.1, 1.1, 1.95, 0.05, 0.062],
    ];
    for (const [a, b, h0, h1, y0, y1] of parts) {
      const g = new THREE.BoxGeometry(b - a, h1 - h0, y1 - y0);
      g.translate((a + b) / 2, (h0 + h1) / 2, -(y0 + y1) / 2);
      leaf.add(new THREE.Mesh(g, M.door));
    }
    for (const yy of [-0.03, 0.08]) {
      const g = new THREE.BoxGeometry(0.12, 0.025, 0.03);
      g.translate(w - 0.12, 1.02, -yy);
      leaf.add(new THREE.Mesh(g, MAT.brass || M.dark));
    }
    pv.add(leaf);
    pv.position.set(du - dw / 2 + 0.01, 0, -0.12); // hinge line 12 cm into the wall
    S.grp.add(pv);
    leaf.traverse(o => {
      if (o.isMesh) {
        o.userData.noMerge = true;
        o.receiveShadow = true;
      }
    });
    S.leaf = pv;
  }
  // ---- the notice on the wall beside the door (outside): the invitation ----
  function notice() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 340;
    const x = c.getContext('2d');
    x.fillStyle = '#efe9d8';
    x.fillRect(0, 0, 256, 340);
    x.fillStyle = '#9b1c16';
    x.fillRect(0, 0, 256, 46);
    x.fillStyle = '#fff';
    x.font = 'bold 22px Georgia, serif';
    x.textAlign = 'center';
    x.fillText('Feuerwehr Ratscher', 128, 31);
    x.fillStyle = '#222';
    x.font = 'bold 30px Georgia, serif';
    x.fillText('Skat &', 128, 100);
    x.fillText('Rommé', 128, 136);
    x.font = '21px Georgia, serif';
    x.fillText('jeden Freitag', 128, 182);
    x.fillText('ab 19 Uhr', 128, 208);
    x.fillText('in der alten Schule', 128, 234);
    x.font = 'italic 18px Georgia, serif';
    x.fillText('Gäste willkommen!', 128, 278);
    x.fillText('Feuer am Acker: jeden 2. Sa.', 128, 314);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = plain({ map: t, roughness: 0.9 });
    const g = new THREE.PlaneGeometry(0.42, 0.56); // faces three +z = −y of the room: outward
    const x0 = S.F.du + S.F.dw / 2 + 0.75;
    g.translate(x0, 1.45, 0.026);
    add(new THREE.Mesh(g, m));
    const fg = new THREE.BoxGeometry(0.5, 0.64, 0.03);
    fg.translate(x0, 1.45, 0.005);
    add(new THREE.Mesh(fg, M.door));
    S.noticeAt = toW(x0, -0.6);
  }
  // ---- build everything, the first time one comes near ----
  function build() {
    if (S.built || S.err) return S.built;
    try {
      S.F = frame();
      if (!S.F) throw new Error('no school (building 215)');
      mats();
      const F = S.F;
      S.grp = new THREE.Group();
      S.grp.position.copy(V(F.ox, F.oy, F.zF));
      S.grp.rotation.y = Math.atan2(F.s, F.c);
      scene.add(S.grp);
      const kit = VPROPS.kit ? VPROPS.kit() : null;
      if (!kit) throw new Error('no VPROPS kit');
      // the kit works in site coordinates: give it room coordinates (x, y, h) in a frame without turn, the group turns it
      room(kit);
      furniture(kit);
      for (const [m, list] of BOX) {
        const g = BufferGeometryUtils.mergeGeometries(
          list.map(q => (q.index ? q.toNonIndexed() : q)),
          false
        );
        for (const q of list) q.dispose();
        if (!g) continue;
        g.computeBoundingSphere();
        const me = add(new THREE.Mesh(g, m));
        if (m === M.ceil || m === M.wall || m === M.floor) me.castShadow = true; // keeps the sun out (the village roofs cast no shadow)
      }
      BOX.clear();
      if (!kit.empty()) {
        // the kit's geometry is in (x, y, h) of the room → three (x, h, −y): the same as site coordinates under the turned group
        add(new THREE.Mesh(kit.geo(), M.kit));
      }
      doorLeaf();
      notice();
      S.cut = cutDoor();
      rebuildGrids();
      S.built = true;
      setOpen(0, true);
      markDirty(true);
    } catch (e) {
      S.err = String(e && e.message ? e.message : e);
      console.warn('dorf school', e);
    }
    return S.built;
  }
  // ---- door ----
  function setOpen(v, snap) {
    S.want = v ? 1 : 0;
    if (snap) S.open = S.want;
    if (S.doorCol) S.doorCol[7] = S.want ? 99 : null; // a collider from phase 99 on never counts (game/walkable.js phOk)
    pose();
  }
  function pose() {
    if (!S.leaf) return;
    const k = S.open * S.open * (3 - 2 * S.open);
    S.leaf.rotation.y = k * 1.75; // inward (towards +y of the room = −z of three in the group)
    markDirty();
  }
  // in the doorway the walls of the world step aside (the jambs and the room's colliders hold the walker)
  const inDoor = (x, y) => {
    if (!S.built || S.open < 0.5) return false;
    const [lx, ly] = toL(x, y);
    return Math.abs(lx - S.F.du) < S.F.dw / 2 + 0.05 && ly > -0.7 && ly < 0.75;
  };
  KERN.provide('pushOut', (p, r) => (inDoor(p[0], p[1]) ? false : WCOL.pushCircle(p, r)), 1);
  // ---- light: the pavilion's interior lights 0, 3, 4 (L1, L4, L5) are borrowed while the evening runs and one is near ----
  const LENT = [0, 3, 4];
  let saved = null;
  function lights(on) {
    const LS = window.LIGHTS;
    if (!LS || !S.built) return;
    if (on && !saved) {
      saved = LENT.map(i => {
        const l = LS[i];
        return { l, p: l.position.clone(), d: l.distance, c: l.color.getHex(), dec: l.decay };
      });
      S.lit = true;
    } else if (!on && saved) {
      for (const o of saved) {
        o.l.position.copy(o.p);
        o.l.distance = o.d;
        o.l.decay = o.dec;
        o.l.color.setHex(o.c);
      }
      saved = null;
      S.lit = false;
      if (LIGHTSTATE) LIGHTSTATE.apply();
      M.lamp.emissiveIntensity = 0;
      markDirty(true);
    }
  }
  const _v = new THREE.Vector3();
  function lightTick(k) {
    if (!saved) return;
    saved.forEach((o, i) => {
      const [x, y, h] = S.lamps[i];
      const [wx, wy] = toW(x, y);
      _v.copy(V(wx, wy, S.F.zF + h - 0.12));
      if (o.l.position.distanceToSquared(_v) > 1e-6) o.l.position.copy(_v);
      o.l.distance = 9;
      o.l.decay = 1.6;
      o.l.color.setHex(0xffc58a);
      o.l.intensity = (i === 2 ? 9 : 12) * k;
    });
    M.lamp.emissiveIntensity = 1.6 * k;
  }
  // ---- per frame (from dorf/dorf.js): door animation, lights, the glass by daylight ----
  function tick(dt, evening, near) {
    if (!S.built) return;
    if (Math.abs(S.open - S.want) > 1e-3) {
      S.open += Math.sign(S.want - S.open) * Math.min(Math.abs(S.want - S.open), dt * 0.9);
      pose();
    }
    const want = evening && near;
    if (want !== !!saved) lights(want);
    if (saved) lightTick(1);
    const day = DN && DN.active && DN.state ? 1 - DN.state.night : 0.6;
    const e = 0.02 + 0.5 * day;
    if (Math.abs(M.glass.emissive.r - e * 0.55) > 0.01) {
      M.glass.emissive.setRGB(e * 0.55, e * 0.62, e * 0.75);
      markDirty();
    }
  }
  const inside = (x = P.x, y = P.y) => {
    if (!S.built) return false;
    const [lx, ly] = toL(x, y);
    return lx > 0.2 && lx < S.F.L - 0.2 && ly > 0.2 && ly < S.F.D - 0.2;
  };
  // the world position of a seat (or anything) in the room: [x, y, z of the floor]
  const at = (x, y) => [...toW(x, y), S.F.zF];
  S.frame = frame;
  S.build = build;
  S.setOpen = setOpen;
  S.tick = tick;
  S.inside = inside;
  S.inDoor = inDoor;
  S.toW = toW;
  S.toL = toL;
  S.az = az;
  S.at = at;
  S.lights = lights;
  S.LENT = LENT;
  S.R0 = R0;
  return S;
})();
window.DSCHOOL = DSCHOOL;
