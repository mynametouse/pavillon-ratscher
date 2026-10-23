// ===================== feat/ortsvorsteher 3: what changes in the village (AMTWORLD) =====================
// The things the councils decide stand in the village a few game days later (amt/amt.js sets ST.built[thing] = game minute): a shielded
// street lamp on the way to the gardens (warm light at night), the „Mitfahrbank“ beside the bus stop, a speed display at the village
// entrance (the first step towards Tempo 30), the bus shelter's new roof and timetable, a Kirmes poster with its date at the old school,
// an information board on the school's history. And the
// props of two campaign tasks: the hydrant sign with the cover under leaves on the Anger, the rotten piece of fence at Ronald's pasture.
// Geometry from the village kit (world/village_props.js VPROPS.kit: site coordinates, vertex colours) with the material settings of the
// village props (the same shader program), signs as small canvas textures. Places are found at run time beside the roads (ROADS.edge)
// and clear of walls (WCOL), so nothing stands on the road or in a house.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { PAD } from '../npc/npc.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { ROADS } from '../world/roads.js';
import { WCOL } from '../world/worldcol.js';
import { DSCHOOL } from '../dorf/dorf_school.js';
export const AMTWORLD = (() => {
  const S = { items: {}, spots: {}, mats: null, hyd: null, hydFound: false, fence: null, lampMat: null, on: -1, T: {} };
  const ANGER = [222, -108],
    BUS = [250.6, -99.6],
    BUSA = ((180 - 200) * Math.PI) / 180;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    C = (r, g, b) => [lin(r), lin(g), lin(b)];
  const ready = () => !!(window.VPROPS && VPROPS.kit && window.ROADS && ROADS.edge && window.WCOL && WCOL.ready);
  const gz = (x, y) => KERN.terrain(x, y);
  function mats() {
    if (S.mats) return S.mats;
    S.mats = {
      kit: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 }),
      metal: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.4,
        metalness: 0.55,
        envMapIntensity: 0.7,
      }),
    };
    S.lampMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      emissive: 0xffc27a,
      emissiveIntensity: 0,
      roughness: 0.5,
    });
    return S.mats;
  }
  // a free place beside a road near (x, y): just off the edge (e between lo and hi), not in a wall; searched on rings
  function beside(x, y, lo = -1.8, hi = -0.5, rMax = 14) {
    for (let r = 0; r <= rMax; r += 0.75)
      for (let k = 0; k < Math.max(1, Math.round(r * 4)); k++) {
        const a = (k / Math.max(1, Math.round(r * 4))) * Math.PI * 2,
          px = x + Math.cos(a) * r,
          py = y + Math.sin(a) * r,
          e = ROADS.edge(px, py);
        if (e < lo || e > hi) continue;
        if (WCOL.pushCircle([px, py], 0.45)) continue;
        return [px, py];
      }
    return null;
  }
  // the direction of the road at a point (from the edge distance field): unit vector along the road
  function along(x, y) {
    const h = 0.8,
      gx = ROADS.edge(x + h, y) - ROADS.edge(x - h, y),
      gy = ROADS.edge(x, y + h) - ROADS.edge(x, y - h),
      L = Math.hypot(gx, gy) || 1;
    return [-gy / L, gx / L, gx / L, gy / L]; // [along x, along y, towards the road x, y]
  }
  function mesh(kit, m, key) {
    const me = new THREE.Mesh(kit.geo(), m);
    me.userData.noMerge = true;
    me.castShadow = true;
    me.receiveShadow = true;
    me.name = 'amt:' + key;
    scene.add(me);
    return me;
  }
  // a sign with text on a canvas (front and back), w × h metres, centre at (x, y, z), facing azimuth-normal (nx, ny)
  function sign(lines, w, h, x, y, z, nx, ny, o = {}) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = Math.round((256 * h) / w);
    const g = cv.getContext('2d');
    g.fillStyle = o.bg || '#f4efe2';
    g.fillRect(0, 0, cv.width, cv.height);
    if (o.border) {
      g.strokeStyle = o.border;
      g.lineWidth = 14;
      g.strokeRect(7, 7, cv.width - 14, cv.height - 14);
    }
    g.fillStyle = o.fg || '#2b241c';
    g.textAlign = 'center';
    let yy = o.top || 34;
    for (const [txt, size, bold] of lines) {
      g.font = (bold ? '700 ' : '400 ') + size + 'px sans-serif';
      g.fillText(txt, cv.width / 2, yy);
      yy += size * 1.25;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, z, -y);
    p.lookAt(x + nx, z, -(y + ny)); // the plane's front (local +z) towards (nx, ny) in site coordinates
    p.userData.noMerge = true;
    p.name = 'amt:sign';
    scene.add(p);
    return p;
  }
  // a soft round glow (the light of the lamp on the ground): white in the middle, fading to nothing
  let GLOW = null;
  function glowTex() {
    if (GLOW) return GLOW;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d'),
      r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    GLOW = new THREE.CanvasTexture(c);
    return GLOW;
  }
  // ---- the things ----
  const BUILD = {
    laterne() {
      // on the way from the gardens into the village: along the route to the Klinge, before it reaches the Anger
      const R = (ROADS.routes && ROADS.routes.klinge) || [];
      let best = null;
      if (R.length > 2) {
        let iA = 0,
          dA = 1e9;
        R.forEach((p, i) => {
          const d = Math.hypot(p[0] - ANGER[0], p[1] - ANGER[1]);
          if (d < dA) {
            dA = d;
            iA = i;
          }
        });
        const q = R[Math.max(0, Math.round(iA * 0.6))];
        best = q && beside(q[0], q[1], -1.4, -0.4, 16);
      }
      if (!best) best = beside(150, -80, -1.4, -0.4, 30);
      if (!best) return null;
      const [x, y] = best,
        z = gz(x, y),
        [, , tx, ty] = along(x, y);
      const km = VPROPS.kit();
      km.cyl(x, y, z, z + 4.2, 0.07, 0.05, 10, C(0.22, 0.24, 0.25), true);
      // a short arm towards the road, the shielded head (flat, light only downwards)
      const hx = x + tx * 0.7,
        hy = y + ty * 0.7;
      km.box(x + tx * 0.35, y + ty * 0.35, z + 4.05, 0.75, 0.06, 0.06, Math.atan2(ty, tx), C(0.22, 0.24, 0.25));
      km.box(hx, hy, z + 3.98, 0.5, 0.3, 0.1, Math.atan2(ty, tx), C(0.2, 0.21, 0.22));
      const g = new THREE.Group();
      g.add(mesh(km, mats().metal, 'laterne'));
      // the glowing lens under the head
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), S.lampMat);
      lens.position.set(hx, z + 3.925, -hy);
      lens.rotation.x = Math.PI / 2;
      g.add(lens);
      // the pool of warm light on the ground (only at night)
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(3.6, 32),
        new THREE.MeshBasicMaterial({
          map: glowTex(),
          color: 0xffb35c,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      pool.position.set(hx, gz(hx, hy) + 0.06, -hy);
      pool.rotation.x = -Math.PI / 2;
      pool.renderOrder = 2;
      g.add(pool);
      S.pool = pool;
      scene.add(g);
      return { g, at: [x, y] };
    },
    mitfahrbank() {
      const c = Math.cos(BUSA),
        s = Math.sin(BUSA);
      const lx = (u, v) => [BUS[0] + c * u - s * v, BUS[1] + s * u + c * v];
      let [x, y] = lx(-4.6, 0.5);
      const fb = beside(x, y, -2.2, -0.6, 6);
      if (fb) [x, y] = fb;
      const z = gz(x, y);
      const k = VPROPS.kit();
      if (VPROPS.bench) VPROPS.bench(k, x, y, BUSA, 1.8);
      else k.box(x, y, z + 0.42, 1.8, 0.4, 0.06, BUSA, C(0.55, 0.36, 0.2));
      // the sign post behind the bench
      const [px, py] = [x - s * 0.45, y + c * 0.45];
      k.box(px - c * 1.05, py - s * 1.05, z, 0.08, 0.08, 1.9, BUSA, C(0.4, 0.4, 0.42));
      const g = new THREE.Group();
      g.add(mesh(k, mats().kit, 'mitfahrbank'));
      const nx = -s,
        ny = c;
      g.add(
        sign(
          [
            ['MITFAHRBANK', 30, true],
            ['Ich will mit nach', 22],
            ['SCHLEUSINGEN', 30, true],
          ],
          0.7,
          0.45,
          px - c * 1.05 - nx * 0.06,
          py - s * 1.05 - ny * 0.06,
          z + 1.7,
          -nx,
          -ny,
          { bg: '#f2c94c', fg: '#1f2a1f', top: 40 }
        )
      );
      scene.add(g);
      return { g, at: [x, y] };
    },
    anzeige() {
      const c = Math.cos(BUSA),
        s = Math.sin(BUSA);
      let p = [BUS[0] + c * 34, BUS[1] + s * 34];
      p = beside(p[0], p[1], -1.6, -0.5, 14) || p;
      const [x, y] = p,
        z = gz(x, y);
      let [ax, ay, tx, ty] = along(x, y);
      // the display faces the drivers coming into the village: its face looks out of the village, along the road
      if (ax * (x - ANGER[0]) + ay * (y - ANGER[1]) < 0) {
        ax = -ax;
        ay = -ay;
      }
      const hx = x + tx * 0.25,
        hy = y + ty * 0.25;
      const km = VPROPS.kit();
      km.cyl(x, y, z, z + 2.9, 0.05, 0.05, 8, C(0.6, 0.62, 0.64), true);
      km.box(hx, hy, z + 2.2, 0.16, 0.86, 0.66, Math.atan2(ay, ax), C(0.1, 0.11, 0.12));
      km.box(x + tx * 0.12, y + ty * 0.12, z + 2.45, 0.26, 0.06, 0.06, Math.atan2(ty, tx), C(0.5, 0.5, 0.52));
      const g = new THREE.Group();
      g.add(mesh(km, mats().metal, 'anzeige'));
      // „Ihre Geschwindigkeit“ and a friendly face for those who keep to it
      g.add(
        sign(
          [
            ['Ihre Geschwindigkeit', 20],
            ['28 km/h', 46, true],
            ['☺ Danke!', 28, true],
          ],
          0.76,
          0.56,
          hx + ax * 0.09,
          hy + ay * 0.09,
          z + 2.53,
          ax,
          ay,
          { bg: '#101214', fg: '#7dff8a', top: 40 }
        )
      );
      scene.add(g);
      return { g, at: [x, y], face: [ax, ay] };
    },
    bushaus() {
      // the shelter of world/village_props.js (same place and turn): a new roof over the old one, a timetable on the back wall
      const c = Math.cos(BUSA),
        s = Math.sin(BUSA),
        z = gz(BUS[0], BUS[1]);
      const lx = (u, v) => [BUS[0] + c * u - s * v, BUS[1] + s * u + c * v];
      const km = VPROPS.kit();
      const r = lx(0, 0);
      km.box(r[0], r[1], z + 2.43, 3.56, 2.04, 0.05, BUSA, C(0.62, 0.65, 0.68));
      km.box(r[0], r[1], z + 2.39, 3.6, 0.06, 0.06, BUSA, C(0.55, 0.57, 0.6));
      const g = new THREE.Group();
      g.add(mesh(km, mats().metal, 'bushaus'));
      const t = lx(0.75, 0.6),
        nx = s,
        ny = -c;
      g.add(
        sign(
          [
            ['Ratscher, Schulbushaltestelle', 15, true],
            ['Mo–Fr  6:52  7:12  13:05  15:40', 15],
            ['Sa  8:10  12:10', 15],
            ['→ Schleusingen, Busbahnhof', 15],
          ],
          0.62,
          0.42,
          t[0] + nx * 0.02,
          t[1] + ny * 0.02,
          z + 1.55,
          nx,
          ny,
          { bg: '#fbfbf6', fg: '#14311d', border: '#2f6b3a', top: 40 }
        )
      );
      scene.add(g);
      return { g, at: [BUS[0], BUS[1]] };
    },
    kirmes() {
      if (!DSCHOOL.built || !DSCHOOL.F) return null;
      const [x, y] = DSCHOOL.toW(DSCHOOL.F.du - 2.2, -1.1),
        z = gz(x, y),
        [bx, by] = DSCHOOL.toW(DSCHOOL.F.du - 2.2, -2.1);
      const nx = bx - x,
        ny = by - y,
        L = Math.hypot(nx, ny) || 1;
      const k = VPROPS.kit();
      k.box(x - (ny / L) * 0.55, y + (nx / L) * 0.55, z, 0.07, 0.07, 1.75, 0, C(0.42, 0.3, 0.18));
      k.box(x + (ny / L) * 0.55, y - (nx / L) * 0.55, z, 0.07, 0.07, 1.75, 0, C(0.42, 0.3, 0.18));
      const g = new THREE.Group();
      g.add(mesh(k, mats().kit, 'kirmes'));
      g.add(
        sign(
          [
            ['KIRMES', 44, true],
            ['in Ratscher', 26],
            [S.T.kirmes || 'Samstag & Sonntag', S.T.kirmes ? 18 : 22],
            ['Festzelt am Anger · Musik', 18],
            ['Kinderprogramm · Feuerwehr', 18],
            ['Kaffee & Kuchen von jedem Hof', 18],
          ],
          1.0,
          1.2,
          x + (nx / L) * 0.05,
          y + (ny / L) * 0.05,
          z + 1.2,
          nx / L,
          ny / L,
          { bg: '#fdf6e3', fg: '#7a1f1f', border: '#2f6b3a', top: 54 }
        )
      );
      scene.add(g);
      return { g, at: [x, y] };
    },
    tafel() {
      if (!DSCHOOL.built || !DSCHOOL.F) return null;
      const [x, y] = DSCHOOL.toW(DSCHOOL.F.du + 3.4, -2.4),
        z = gz(x, y),
        [bx, by] = DSCHOOL.toW(DSCHOOL.F.du + 3.4, -3.4);
      const nx = bx - x,
        ny = by - y,
        L = Math.hypot(nx, ny) || 1;
      const k = VPROPS.kit();
      k.box(x - (ny / L) * 0.5, y + (nx / L) * 0.5, z, 0.08, 0.08, 1.45, 0, C(0.36, 0.25, 0.15));
      k.box(x + (ny / L) * 0.5, y - (nx / L) * 0.5, z, 0.08, 0.08, 1.45, 0, C(0.36, 0.25, 0.15));
      const g = new THREE.Group();
      g.add(mesh(k, mats().kit, 'tafel'));
      g.add(
        sign(
          [
            ['Die alte Schule Ratscher', 22, true],
            ['1828 von den Ratschern erbaut:', 15],
            ['Fachwerk, Schiefer, Dachreiter mit Uhr.', 15],
            ['Schule für alle Kinder des Dorfes,', 15],
            ['ab 1957 Kindergarten,', 15],
            ['dann Sitz der Gemeinde.', 15],
            ['1994 kam Ratscher zu Schleusingen.', 15],
            ['Heute: Feuerwehrverein.', 15],
            ['Ortsteilrat Ratscher', 13, true],
          ],
          0.95,
          0.7,
          x + (nx / L) * 0.05,
          y + (ny / L) * 0.05,
          z + 1.12,
          nx / L,
          ny / L,
          { bg: '#efe7d2', fg: '#2a2117', border: '#5b4430', top: 34 }
        )
      );
      scene.add(g);
      return { g, at: [x, y] };
    },
  };
  function drop(id) {
    const it = S.items[id];
    if (!it) return;
    scene.remove(it.g);
    it.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material !== S.lampMat && !Object.values(S.mats || {}).includes(o.material)) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    delete S.items[id];
    markDirty(true);
  }
  // ---- the campaign props ----
  function hydrantSpot() {
    if (S.hydSpot) return S.hydSpot;
    if (!ready()) return null;
    const cov = beside(ANGER[0] + 7, ANGER[1] + 5, -1.6, -0.6, 18);
    if (!cov) return null;
    const [ax, ay, tx, ty] = along(cov[0], cov[1]);
    // the sign: 4 m back along the road and 1.5 m off it, on a post
    let sg = [cov[0] - ax * 4 - tx * 1.5, cov[1] - ay * 4 - ty * 1.5];
    if (WCOL.pushCircle(sg, 0.3)) sg = [cov[0] - ax * 4, cov[1] - ay * 4];
    return (S.hydSpot = { cov, sg, a: [ax, ay], t: [tx, ty] });
  }
  function hydrant(on, found) {
    if (!on && !found) return;
    const H = hydrantSpot();
    if (!H) return;
    if (!S.hyd) {
      const [x, y] = H.cov,
        z = gz(x, y);
      const k = VPROPS.kit(),
        kl = VPROPS.kit();
      // the cover: a cast-iron lid in a ring, with a yellow edge painted round it
      k.cyl(x, y, z - 0.02, z + 0.035, 0.2, 0.2, 14, C(0.2, 0.2, 0.21), true);
      k.cyl(x, y, z - 0.03, z + 0.025, 0.3, 0.3, 16, C(0.85, 0.7, 0.1), false);
      // leaves heaped on it
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39,
          r = 0.08 + (i % 5) * 0.07;
        kl.box(
          x + Math.cos(a) * r,
          y + Math.sin(a) * r,
          z + 0.02 + (i % 3) * 0.02,
          0.16,
          0.1,
          0.03,
          a,
          C(0.45 + (i % 4) * 0.06, 0.28, 0.1)
        );
      }
      // the sign on its post: white plate with a red border, „H 80 · 1,5 · 4,0“
      const [sx, sy] = H.sg,
        sz = gz(sx, sy);
      const km = VPROPS.kit();
      km.cyl(sx, sy, sz, sz + 1.25, 0.03, 0.03, 8, C(0.55, 0.56, 0.58), true);
      const g = new THREE.Group();
      g.add(mesh(k, mats().metal, 'hydrant'));
      const leaves = mesh(kl, mats().kit, 'leaves');
      g.add(leaves);
      g.add(mesh(km, mats().metal, 'hydrantpost'));
      g.add(
        sign(
          [
            ['H 80', 64, true],
            ['1,5     4,0', 46, true],
          ],
          0.25,
          0.2,
          sx + H.a[0] * 0.035,
          sy + H.a[1] * 0.035,
          sz + 1.12,
          H.a[0],
          H.a[1],
          { bg: '#ffffff', fg: '#c0141b', border: '#c0141b', top: 80 }
        )
      );
      scene.add(g);
      S.hyd = { g, leaves };
      markDirty(true);
    }
    if (found && S.hyd.leaves.visible) {
      S.hyd.leaves.visible = false;
      S.hydFound = true;
      markDirty(true);
    }
  }
  const hydrantAt = () => (S.hyd && S.hydSpot ? S.hydSpot.cov : null);
  // Ronald's pasture: the rotten piece of fence on the west side, north of the gate
  function fenceSpot() {
    if (!PAD) return null;
    return [PAD.x0, PAD.gy1 + 2.4];
  }
  function fence(broken) {
    const [x, y] = fenceSpot() || [];
    if (x == null) return;
    if (S.fence) {
      scene.remove(S.fence);
      S.fence.traverse(o => o.geometry && o.geometry.dispose());
      S.fence = null;
    }
    const z = gz(x, y);
    const k = VPROPS.kit();
    // the pasture has a wooden rail fence (two rails): the rotten piece – a post that leans, a rail broken through, one on the grass;
    // mended – two new posts and two new rails, still light from the saw
    const old = C(0.3, 0.24, 0.18),
      neu = C(0.72, 0.58, 0.4);
    if (broken) {
      k.box(x + 0.12, y - 0.9, z, 0.1, 0.1, 1.0, 0.35, old);
      k.box(x, y - 0.45, z + 0.62, 0.05, 0.95, 0.09, 0.25, old);
      k.box(x, y + 0.5, z + 0.5, 0.05, 0.9, 0.09, -0.35, old);
      k.box(x + 0.35, y + 0.1, z, 0.06, 1.8, 0.09, 0.15, old);
    } else {
      // on the inside: two new posts, a new top rail and woven wire (Knotengitter) – goats climb and slip through rails
      k.box(x + 0.1, y - 1.3, z, 0.11, 0.11, 1.3, 0, neu);
      k.box(x + 0.1, y + 1.3, z, 0.11, 0.11, 1.3, 0, neu);
      k.box(x + 0.1, y, z + 1.18, 0.06, 2.7, 0.09, 0, neu);
    }
    S.fence = new THREE.Group();
    S.fence.add(mesh(k, mats().kit, 'fence'));
    if (!broken) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), wireMat());
      w.position.set(x + 0.16, z + 0.6, -y);
      w.rotation.y = Math.PI / 2;
      w.userData.noMerge = true;
      S.fence.add(w);
    }
    scene.add(S.fence);
    S.fenceBroken = !!broken;
    markDirty(true);
  }
  // woven wire: a grid of thin galvanised wires on a canvas, cut out (alphaTest), 15 cm meshes
  let WIRE = null;
  function wireMat() {
    if (WIRE) return WIRE;
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    g.strokeStyle = '#b9bdbf';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 30, 30);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.6 / 0.15, 1.1 / 0.15);
    WIRE = new THREE.MeshStandardMaterial({
      map: t,
      alphaTest: 0.4,
      transparent: false,
      side: THREE.DoubleSide,
      metalness: 0.4,
      roughness: 0.5,
    });
    return WIRE;
  }
  const fenceAt = () => (S.fence && S.fenceBroken ? fenceSpot() : null);
  // ---- per state: build what is due, drop what is no longer (a reset) ----
  function refresh(ST, t, reset) {
    if (reset) {
      for (const id of Object.keys(S.items)) drop(id);
      if (S.hyd) {
        scene.remove(S.hyd.g);
        S.hyd = null;
      }
      if (S.fence) {
        scene.remove(S.fence);
        S.fence = null;
      }
      return;
    }
    if (!ready() || !ST) return;
    for (const [id, when] of Object.entries(ST.built || {})) {
      if (S.items[id] || t < when || !BUILD[id]) continue;
      try {
        const it = BUILD[id]();
        if (it) {
          S.items[id] = it;
          markDirty(true);
        }
      } catch (e) {
        console.warn('amt build', id, e);
        S.items[id] = { g: new THREE.Group(), err: String(e) };
      }
    }
    // the campaign props of running tasks (also after a reload)
    if (ST.tasks) {
      if ((ST.tasks.hydrant === 0 || ST.tasks.hydrant === 1) && !S.hyd) hydrant(true, ST.tasks.hydrant === 1);
      if (ST.tasks.zaun === 0 && !S.fence) fence(true);
      if ((ST.tasks.zaun === 1 || ST.tasks.zaun === 'done') && S.fenceBroken) fence(false);
    }
    // the lamp at night
    if (S.items.laterne && S.lampMat) {
      const n = VILLAGE && VILLAGE.night ? VILLAGE.night() : 0,
        on = n > 0.08 ? Math.min(1, (n - 0.08) / 0.3) : 0;
      if (Math.abs(on - S.on) > 0.02) {
        S.on = on;
        S.lampMat.emissiveIntensity = 2.2 * on;
        if (S.pool) S.pool.material.opacity = 0.22 * on;
        markDirty();
      }
    }
  }
  const state = () => ({
    items: Object.keys(S.items),
    at: Object.fromEntries(Object.entries(S.items).map(([k, it]) => [k, it.at ? it.at.map(v => +v.toFixed(1)) : null])),
    hydrant: hydrantAt(),
    hydFound: S.hydFound,
    fence: S.fence ? (S.fenceBroken ? 'broken' : 'fixed') : null,
  });
  return { refresh, hydrant, hydrantAt, fence, fenceAt, state, S, T: S.T };
})();
window.AMTWORLD = AMTWORLD;
