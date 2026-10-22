// ===================== V16c2 felling at the Klinge (FELL): forest protective gear, the chainsaw, felling a tree the professional way, =====================
// delimbing, bucking into logs and measuring them – in the family's forest (world/forest.js FOREST.CORE), on trees the forester marked.
// The rules are those taught in Germany (DGUV Information 214-046 "Sichere Waldarbeiten", SVLFG/BBV infoblatt "Sicherheitsfälltechnik",
// Bayerische Staatsforsten "Sicher Holz machen"): protective gear complete; nobody within twice the tree's length; a retreat 45° backwards;
// the felling notch 1/5–1/3 of the diameter deep, its roof 45–60°, both cuts meeting in the chord; sapwood cuts at the chord's ends in
// spruce, larch and pine; the felling cut as a bore cut, 1/10 Ø above the notch floor (at least 3 cm), leaving a hinge of 1/10 Ø and a
// holding band at the back; a wedge; the call "Achtung, Baum fällt!" before the felling cut and again before the band is cut, last, from the
// side; then away on the retreat, watching the crown. How well each cut is made decides how the tree falls (direction, tearing, sitting back)
// and the stars at the end. Then: delimb along the stem, trim the butt, cut the top, buck into logs (compression side first), measure.
// Drawing: the trunk foot of the tree under work is built here (bark, cut faces with growth rings, kerfs, the notch piece, the wedge); the
// rest of the tree is the forest's own model (FOREST.soloMats: bark hidden below the foot, cards gone as they are delimbed).
// Coordinates: the felling frame F of a tree has its origin at the tree's foot, x' = felling direction, y up, z' = to the right.
const FELL = (() => {
  // switched on with V16c2 (V16c1 shipped the forest only; ?fell=1 turned it on for tests)
  const FELL_ENABLED = true;
  const S = {
    on: !!(window.FOREST && FOREST.on) && (FELL_ENABLED || QS.has('fell')),
    ready: false,
    kit: false,
    trees: {},
    logs: [],
    job: null,
    marked: [],
    n: 0,
  };
  if (!S.on) return S;
  const LSK = 'pav-fell-v1',
    D2R = Math.PI / 180,
    KERF = 0.0045,
    YTOP = 1.9;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
    lerp = (a, b, k) => a + (b - a) * k;
  const de = (v, n = 0) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const cmS = v => de(Math.round(v * 100)) + ' cm';
  const mulberry = a => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ground = (x, y) => ROADS.groundAt(x, y);
  const think = (t, ms) => PLAY.think(t, ms);
  const SPN = { spruce: 'Fichte', larch: 'Lärche', pine: 'Kiefer' };
  // ---------------- materials ----------------
  const MT = {
    paint: new THREE.MeshStandardMaterial({
      color: 0xff4d12,
      emissive: 0x6a1800,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    wedge: new THREE.MeshStandardMaterial({ color: 0xf0b018, roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.85, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.6 }),
    grey: new THREE.MeshStandardMaterial({ color: 0x5b5f63, roughness: 0.55 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe8661c, roughness: 0.45 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.7 }),
    chain: new THREE.MeshStandardMaterial({ color: 0x3a3b3d, metalness: 0.7, roughness: 0.4 }),
    box: new THREE.MeshStandardMaterial({ color: 0x2f5b37, metalness: 0.4, roughness: 0.55 }),
    lid: new THREE.MeshStandardMaterial({ color: 0x264a2d, metalness: 0.4, roughness: 0.5 }),
    label: new THREE.MeshStandardMaterial({ color: 0xe9e3c8, roughness: 0.8 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xf2d31b, roughness: 0.6 }),
    line: (c, o = 0.85) =>
      new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity: o,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
  };
  const box = (g, x, y, z, sx, sy, sz, m, rx = 0, ry = 0, rz = 0) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    me.position.set(x, y, z);
    me.rotation.set(rx, ry, rz);
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
    return me;
  };
  const cyl = (g, x, y, z, r, len, m, axis = 'y', seg = 12, r2) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 ?? r, len, seg), m);
    me.position.set(x, y, z);
    if (axis === 'x') me.rotation.z = Math.PI / 2;
    else if (axis === 'z') me.rotation.x = Math.PI / 2;
    me.castShadow = true;
    g.add(me);
    return me;
  };
  // growth rings of a fresh cut (canvas), one per species: wide rings near the pith, narrow ones outside, latewood lines, heartwood
  // (larch, pine), cambium and bark at the rim, the chain's faint scratches
  const EG = {};
  function endGrain(sp) {
    if (EG[sp]) return EG[sp];
    const N = 512,
      cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d'),
      im = g.createImageData(N, N),
      d = im.data;
    const P =
      {
        spruce: { e: [236, 222, 188], l: [196, 166, 118], h: null, sap: 0, rings: 64, bark: [86, 64, 48] },
        larch: {
          e: [230, 196, 146],
          l: [170, 104, 60],
          h: [0.86, 0.6, 0.42],
          sap: 0.18,
          rings: 72,
          bark: [106, 62, 42],
        },
        pine: { e: [236, 210, 164], l: [190, 142, 94], h: [0.9, 0.7, 0.5], sap: 0.28, rings: 68, bark: [98, 70, 52] },
      }[sp] || null;
    const Q = P || { e: [236, 222, 188], l: [196, 166, 118], h: null, sap: 0, rings: 64, bark: [86, 64, 48] },
      rnd = mulberry(sp.length * 131 + 7),
      ph = [];
    for (let k = 0; k < 8; k++) ph.push(rnd() * 6.28);
    const cx = N / 2 + 7,
      cy = N / 2 - 5;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = (x - cx) / (N / 2 - 4),
          dy = (y - cy) / (N / 2 - 4),
          r = Math.hypot(dx, dy),
          a = Math.atan2(dy, dx);
        const rr =
          r *
          (1 + 0.022 * Math.sin(a * 3 + ph[0]) + 0.014 * Math.sin(a * 5 + ph[1]) + 0.008 * Math.sin(a * 11 + ph[2]));
        const ring = Q.rings * Math.pow(Math.min(rr, 1), 1.25),
          f = ring - Math.floor(ring),
          lw = THREE.MathUtils.smoothstep(f, 0.72, 0.88) * (1 - THREE.MathUtils.smoothstep(f, 0.95, 1.0));
        let c = [lerp(Q.e[0], Q.l[0], lw), lerp(Q.e[1], Q.l[1], lw), lerp(Q.e[2], Q.l[2], lw)];
        if (Q.h && rr < 0.93 - Q.sap) {
          const k = THREE.MathUtils.smoothstep(rr, 0.9 - Q.sap, 0.86 - Q.sap);
          c = [c[0] * lerp(1, Q.h[0], k), c[1] * lerp(1, Q.h[1], k), c[2] * lerp(1, Q.h[2], k)];
        }
        const scr = 1 + 0.035 * Math.sin(x * 0.42 + Math.sin(y * 0.05) * 2) + 0.02 * (rnd() - 0.5);
        if (rr < 0.014) c = c.map(v => v * 0.7);
        if (rr > 0.955) c = Q.bark.map(v => v * (0.85 + 0.3 * rnd()));
        else if (rr > 0.94) c = c.map(v => Math.min(255, v * 1.08));
        const o = (y * N + x) * 4;
        d[o] = clamp(c[0] * scr, 0, 255);
        d[o + 1] = clamp(c[1] * scr, 0, 255);
        d[o + 2] = clamp(c[2] * scr, 0, 255);
        d[o + 3] = 255;
      }
    g.putImageData(im, 0, 0);
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = ANISO;
    return (EG[sp] = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.92, side: THREE.DoubleSide }));
  }
  // ---------------- the trees the forester marked: in the family's forest, by the track, with a free way to fall ----------------
  const J = [-579, -590];
  const hash = (k, n) => {
    const v = Math.sin(k * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  function leanOf(t) {
    return { az: hash(t.id, 1) * 360, deg: 0.6 + hash(t.id, 2) * 3.2 };
  }
  // directions (5° steps) in which the stem would not strike a standing neighbour's trunk; preference: along the lean and onto the track
  function freeDirs(t) {
    const H = t.h,
      nb = FOREST.list.filter(o => o !== t && !o.gone && o.h > 6 && Math.abs(o.x - t.x) < H && Math.abs(o.y - t.y) < H),
      free = [],
      ln = leanOf(t);
    for (let az = 0; az < 360; az += 5) {
      const fx = Math.sin(az * D2R),
        fy = Math.cos(az * D2R);
      let hit = false;
      for (const o of nb) {
        const dx = o.x - t.x,
          dy = o.y - t.y,
          al = dx * fx + dy * fy,
          la = Math.abs(dx * fy - dy * fx);
        if (al > 1.5 && al < H * 0.85 && la < 0.5 + o.dbh / 2) {
          hit = true;
          break;
        }
      }
      if (hit) continue;
      let up = 0,
        road = 0;
      for (let s = 2; s < H; s += 2) {
        const x = t.x + fx * s,
          y = t.y + fy * s;
        up = Math.max(up, (ground(x, y) - t.z) / s);
        if (ROADS.edge(x, y) > -1.5) road++;
      }
      if (up > 0.3) continue;
      free.push({ az, score: Math.cos((az - ln.az) * D2R) * 0.4 + road / (H / 2) - up * 2 });
    }
    // a free way needs neighbours free too (three directions in a row = 15° wide)
    const ok = free.filter(
      f => free.some(g => g.az === (f.az + 5) % 360) && free.some(g => g.az === (f.az + 355) % 360)
    );
    ok.sort((a, b) => b.score - a.score);
    return { list: ok.map(f => f.az), best: ok.length ? ok[0].az : null };
  }
  function chooseMarked() {
    const cand = FOREST.list.filter(
      t =>
        t.core &&
        !t.gone &&
        t.h >= 15 &&
        t.h <= 27 &&
        (t.sp === 'spruce' || t.sp === 'larch') &&
        ROADS.edge(t.x, t.y) > -14 &&
        ROADS.edge(t.x, t.y) < -2.5
    );
    cand.sort((a, b) => Math.hypot(a.x - J[0], a.y - J[1]) - Math.hypot(b.x - J[0], b.y - J[1]));
    const out = [];
    for (const t of cand) {
      if (out.length >= 14) break;
      if (out.some(o => Math.hypot(o.x - t.x, o.y - t.y) < 9)) continue;
      const fr = freeDirs(t);
      if (fr.best == null) continue;
      t.fellDirs = fr;
      out.push(t);
    }
    return out;
  }
  // the forester's marks: an orange slash at breast height facing the track, a dot near the ground (control after felling)
  let MARKS = null;
  function buildMarks() {
    if (MARKS) {
      scene.remove(MARKS);
      MARKS.geometry.dispose();
      MARKS = null;
    }
    const geos = [];
    for (const t of S.marked) {
      const rec = S.trees[t.id],
        down = rec && ORDER.indexOf(rec.st) >= ORDER.indexOf('falling');
      let a = Math.atan2(J[1] - t.y, J[0] - t.x);
      {
        let best = 1e9;
        for (let k = 0; k < 16; k++) {
          const aa = (k / 16) * Math.PI * 2,
            x = t.x + Math.cos(aa) * 6,
            y = t.y + Math.sin(aa) * 6,
            e = -ROADS.edge(x, y);
          if (e < best) {
            best = e;
            a = aa;
          }
        }
      }
      const p = [],
        idx = [];
      const quad = (y0, h, w, slant) => {
        const k = p.length / 3;
        for (const [u, v] of [
          [-1, 0],
          [1, 0],
          [1, 1],
          [-1, 1],
        ]) {
          const yy = y0 + v * h + u * slant,
            r = FOREST.trunkR(t, yy) + 0.006,
            aa = a + (u * w) / r;
          p.push(t.x + Math.cos(aa) * r, t.y + Math.sin(aa) * r, t.z - 0.05 + yy);
        }
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
      };
      // the forester's marks in fluorescent spray paint: a big slash on the side towards the path and one on the far side (seen from both
      // directions), and the dot on the root foot that stays on the stump (V16d: larger – the small stripe was hard to find from the tractor)
      if (!down) {
        quad(1.1, 0.5, 0.075, 0.13);
        const a0 = a;
        a = a0 + Math.PI;
        quad(1.1, 0.5, 0.075, 0.13);
        a = a0;
      }
      quad(0.18, 0.08, 0.05, 0);
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          p.map((v, i) => v),
          3
        )
      );
      g.setIndex(idx);
      const pp = g.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const v = V(pp.getX(i), pp.getY(i), pp.getZ(i));
        pp.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      geos.push(g);
    }
    if (!geos.length) return;
    MARKS = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(geos), MT.paint);
    MARKS.userData.noMerge = true;
    MARKS.receiveShadow = true;
    scene.add(MARKS);
    markDirty(true);
  }
  // ---------------- the felling frame and the trunk foot ----------------
  function frameOf(t, az) {
    const F = new THREE.Group();
    F.position.copy(V(t.x, t.y, t.z - 0.05));
    F.rotation.y = (90 - az) * D2R;
    F.userData.noMerge = true;
    scene.add(F);
    return F;
  }
  // local felling frame → site coordinates
  const toSite = (t, az, x, z) => {
    const fx = Math.sin(az * D2R),
      fy = Math.cos(az * D2R);
    return [t.x + fx * x + fy * z, t.y + fy * x - fx * z];
  };
  // the cut parameters in the frame: R radius at the notch floor, hS floor height, xS chord, tA roof slope, hB back cut height, xH hinge back line, xB band front
  function geomOf(t, p) {
    const R = FOREST.trunkR(t, p.hS),
      D = 2 * R,
      d = p.d ?? D / 4,
      xS = R - d,
      tA = Math.tan((p.ang ?? 50) * D2R),
      hB = p.hS + (p.step ?? D / 10),
      T = p.T ?? D / 10,
      xH = xS - T,
      RB = FOREST.trunkR(t, hB),
      xB = -RB + (p.B ?? D / 8);
    return { R, D, d, xS, tA, hB, T, xH, RB, xB };
  }
  function footGeo(t, sc, Md, th) {
    const NS = 48,
      ys = [];
    for (let y = -0.3; y < 1.05; y += 0.03) ys.push(y);
    for (let y = 1.1; y <= YTOP + 1e-6; y += 0.1) ys.push(y);
    const p = [],
      n = [],
      uv = [],
      c = [],
      h = [],
      idx = [],
      circ = 2 * Math.PI * Md.rb,
      bt = Md.bt;
    for (const y of ys) {
      const yy = Math.max(0, y),
        r = FOREST.trunkR(t, yy),
        r2 = FOREST.trunkR(t, yy + 0.04),
        sl = (r - r2) / 0.04,
        nl = Math.hypot(1, sl);
      for (let j = 0; j <= NS; j++) {
        const am = (j / NS) * Math.PI * 2,
          a = am - th,
          ca = Math.cos(a),
          sa = Math.sin(a); // th: model angle → frame angle (bark lines up with the model above)
        p.push(ca * r, y, sa * r);
        n.push(ca / nl, sl / nl, sa / nl);
        uv.push(((j / NS) * circ) / Md.tile, yy / sc.s / Md.tile);
        c.push(bt[0], bt[1], bt[2]);
        h.push(0);
      }
    }
    for (let i = 0; i < ys.length - 1; i++)
      for (let j = 0; j < NS; j++) {
        const a = i * (NS + 1) + j,
          b = a + NS + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(h, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  // the shader of the foot: kerfs open as the saw goes in, the notch piece gone, stump (part 1) and stem (part 2) split along the cut faces,
  // a trimmed butt (uC3.w: nothing above this height). Inside faces dark (seen through a kerf).
  const CUT_GLSL = `{ vec3 q = vLoc; float R = uC0.x, hS = uC0.y, xS = uC0.z, tA = uC0.w, kf = uC1.w;
      bool inNotch = q.x > xS && q.y > hS && q.y < hS + ( q.x - xS ) * tA;
      if ( uC1.z > 0.5 && inNotch ) discard;
      if ( abs( q.y - hS ) < kf && q.x > R - uC1.x ) discard;
      float dd = dot( vec2( q.x - xS, q.y - hS ), normalize( vec2( -tA, 1.0 ) ) );
      if ( abs( dd ) < kf && q.x > R - uC1.y && q.x > xS - kf ) discard;
      if ( uC3.y > 0.5 && abs( q.x - xS ) < kf * 1.6 && abs( q.z ) > uC3.z - R * 0.13 && q.y > hS - kf && q.y < hS + R * 0.22 ) discard;
      float hB = uC2.x, xH = uC2.y, xB = uC2.z, bp = uC2.w, xFrom = bp > 1.5 ? -R - 1.0 : mix( xH, xB, clamp( bp, 0.0, 1.0 ) );
      if ( bp > 0.0 && abs( q.y - hB ) < kf && q.x < xH && q.x > xFrom ) discard;
      float cy = q.x > xS ? hS : ( q.x > xH ? 0.5 * ( hS + hB ) : hB );
      if ( uC3.x > 0.5 && uC3.x < 1.5 && q.y > cy ) discard;
      if ( uC3.x > 1.5 && ( q.y < cy || q.y > uC3.w ) ) discard; }`;
  function footMat(t, part, U) {
    const sp = t.sp,
      B = FOREST.barkMap(sp);
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: B && B.map,
      normalMap: B && B.nrm,
      roughnessMap: B && B.orm,
      roughness: 1,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    });
    const Ux = {
      uCut: { value: -10 },
      uDelimb: { value: -1 },
      uC0: U.uC0,
      uC1: U.uC1,
      uC2: U.uC2,
      uC3: { value: new THREE.Vector4(part, U.uC3.value.y, U.uC3.value.z, 99) },
    };
    FOREST.patchSolo(m, 'foot', Ux, false);
    const ob = m.onBeforeCompile,
      ck = m.customProgramCacheKey;
    m.onBeforeCompile = sh => {
      ob(sh);
      Object.assign(sh.uniforms, Ux);
      sh.vertexShader =
        'varying vec3 vLoc;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLoc = position;');
      sh.fragmentShader =
        'varying vec3 vLoc; uniform vec4 uC0, uC1, uC2, uC3;\n' +
        sh.fragmentShader
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + CUT_GLSL)
          .replace(
            '#include <color_fragment>',
            '#include <color_fragment>\n if ( !gl_FrontFacing ) diffuseColor.rgb = vec3( 0.07, 0.05, 0.035 );'
          );
    };
    m.customProgramCacheKey = () => ck.call(m) + '_cut';
    m.userData.U = Ux;
    return m;
  }
  // flat cut faces: a fan from a point on their chord over the outline (all convex)
  function fan(center, pts, nrm, R) {
    const p = [...center],
      uv = [0.5 + center[0] / (2 * R), 0.5 + center[2] / (2 * R)],
      idx = [];
    for (const q of pts) {
      p.push(q[0], q[1], q[2]);
      uv.push(0.5 + q[0] / (2 * R), 0.5 + q[2] / (2 * R));
    }
    for (let k = 1; k < pts.length; k++) idx.push(0, k, k + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  } // nrm: unused (double-sided faces light by their winding)
  const arcAt = (t, y, a0, a1, n) => {
    const r = FOREST.trunkR(t, y),
      out = [];
    for (let k = 0; k <= n; k++) {
      const a = n ? a0 + ((a1 - a0) * k) / n : a0;
      out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    return out;
  };
  // the roof line: where the sloped roof plane meets the trunk surface (radius changes with height near the foot)
  const roofAt = (t, G, hS, a) => {
    let y = hS;
    for (let k = 0; k < 4; k++) {
      const x = FOREST.trunkR(t, y) * Math.cos(a);
      y = hS + Math.max(0, x - G.xS) * G.tA;
    }
    const r = FOREST.trunkR(t, y);
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  function capsOf(t, p, G, which) {
    const g = new THREE.Group(),
      M = endGrain(t.sp),
      phi = Math.acos(clamp(G.xS / G.R, -1, 1)),
      phB = Math.acos(clamp(G.xH / G.RB, -1, 1)),
      R = G.R;
    const add = geo => {
      const me = new THREE.Mesh(geo, M);
      me.castShadow = true;
      me.receiveShadow = true;
      g.add(me);
      return me;
    };
    if (which.sole) add(fan([G.xS, p.hS + 0.0005, 0], arcAt(t, p.hS + 0.0005, -phi, phi, 24), [0, 1, 0], R));
    if (which.roof) {
      const pts = [];
      for (let k = 0; k <= 24; k++) pts.push(roofAt(t, G, p.hS, -phi + (2 * phi * k) / 24));
      const nl = Math.hypot(G.tA, 1);
      add(fan([G.xS, p.hS, 0], pts, [G.tA / nl, -1 / nl, 0], R));
    }
    if (which.back)
      add(fan([(G.xH - G.RB) / 2, G.hB, 0], arcAt(t, G.hB, phB, 2 * Math.PI - phB, 40), [0, which.back, 0], R));
    if (which.hinge) {
      const pp = [],
        uv = [],
        idx = [],
        rnd = mulberry(t.id * 13 + (which.hinge > 0 ? 1 : 2)),
        NX = 5,
        NZ = 14,
        ym = 0.5 * (p.hS + G.hB),
        amp = (G.hB - p.hS) * 0.45;
      for (let i = 0; i <= NX; i++) {
        const x = lerp(G.xH, G.xS, i / NX),
          w = Math.sqrt(Math.max(0, FOREST.trunkR(t, ym) ** 2 - x * x)) * 0.995;
        for (let k = 0; k <= NZ; k++) {
          const z = lerp(-w, w, k / NZ),
            y = ym + (rnd() - 0.5) * 2 * amp * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + k * 0.9)));
          pp.push(x, y, z);
          uv.push(0.5 + x / (2 * R), 0.5 + z / (2 * R));
        }
      }
      for (let i = 0; i < NX; i++)
        for (let k = 0; k < NZ; k++) {
          const a = i * (NZ + 1) + k,
            b = a + NZ + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      add(geo);
    }
    if (which.top) {
      const y = which.top;
      add(fan([0, y, 0], arcAt(t, y, 0, 2 * Math.PI, 40), [0, 1, 0], R));
    }
    return g;
  }
  // the notch piece that drops out once floor and roof cut meet: floor, roof and the bark between
  function notchPiece(t, p, G) {
    const g = new THREE.Group(),
      phi = Math.acos(clamp(G.xS / G.R, -1, 1));
    g.add(capsOf(t, p, G, { sole: true, roof: true }));
    const pp = [],
      uv = [],
      idx = [],
      N = 20,
      Md = FOREST.model(t.m),
      circ = 2 * Math.PI * Md.rb,
      sc = FOREST.scaleOf(t);
    for (let k = 0; k <= N; k++) {
      const a = -phi + (2 * phi * k) / N,
        b = arcAt(t, p.hS, a, a, 0)[0],
        top = roofAt(t, G, p.hS, a);
      pp.push(...b, ...top);
      const u = ((a / (Math.PI * 2)) * circ) / Md.tile;
      uv.push(u, p.hS / sc.s / Md.tile, u, top[1] / sc.s / Md.tile);
    }
    for (let k = 0; k < N; k++) {
      const a = k * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const B = FOREST.barkMap(t.sp);
    const me = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        map: B && B.map,
        color: new THREE.Color(...Md.bt),
        roughness: 1,
        side: THREE.DoubleSide,
      })
    );
    me.castShadow = true;
    g.add(me);
    return g;
  }
  // the felling wedge (plastic, 25 cm), thin edge forward (+x)
  function wedgeMesh() {
    const L = 0.25,
      W = 0.075,
      T0 = 0.028,
      T1 = 0.003,
      p = [],
      idx = [];
    for (const [x, t] of [
      [0, T0],
      [L, T1],
    ])
      for (const [y, z] of [
        [-t / 2, -W / 2],
        [t / 2, -W / 2],
        [t / 2, W / 2],
        [-t / 2, W / 2],
      ])
        p.push(x, y, z);
    for (const f of [
      [0, 1, 2, 3],
      [7, 6, 5, 4],
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0],
    ])
      idx.push(f[0], f[1], f[2], f[0], f[2], f[3]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(idx);
    const g2 = geo.toNonIndexed();
    g2.computeVertexNormals();
    const me = new THREE.Mesh(g2, MT.wedge);
    me.castShadow = true;
    return me;
  }
  // ---------------- the tree under work: its frame, foot, model ----------------
  const RT = {}; // runtime objects per tree id
  function solo(t, az, rec) {
    if (RT[t.id]) return RT[t.id];
    const F = frameOf(t, az),
      Md = FOREST.model(t.m),
      sc = FOREST.scaleOf(t),
      th = t.rot - (90 - az) * D2R;
    const U = {
      uC0: { value: new THREE.Vector4() },
      uC1: { value: new THREE.Vector4(0, 0, 0, KERF) },
      uC2: { value: new THREE.Vector4(-9, 0, 0, 0) },
      uC3: { value: new THREE.Vector4(0, 0, 0, 99) },
    };
    const geo = footGeo(t, sc, Md, th),
      fm = footMat(t, 0, U);
    const foot = new THREE.Mesh(geo, fm);
    foot.castShadow = true;
    foot.receiveShadow = true;
    F.add(foot);
    // the stem: everything that falls; pivot at the hinge (set when the felling cut is made)
    const pivot = new THREE.Group(),
      stem = new THREE.Group();
    F.add(pivot);
    pivot.add(stem);
    const Us = { uCut: { value: YTOP / sc.s - 0.02 }, uDelimb: { value: -1 } },
      mats = FOREST.soloMats(t.sp, Us);
    const mg = new THREE.Group();
    mg.rotation.y = th;
    mg.scale.set(sc.sw, sc.s, sc.sw);
    const bark = new THREE.Mesh(Md.bark, mats.bark),
      cards = new THREE.Mesh(Md.cards, mats.cards);
    for (const me of [bark, cards]) {
      me.castShadow = true;
      me.receiveShadow = true;
      me.frustumCulled = false;
      mg.add(me);
    }
    cards.customDepthMaterial = mats.depth;
    stem.add(mg);
    FOREST.hide(t);
    return (RT[t.id] = {
      t,
      az,
      F,
      U,
      foot,
      footGeo: geo,
      pivot,
      stem,
      mg,
      Us,
      mats,
      bark,
      cards,
      sc,
      Md,
      th,
      caps: null,
      piece: null,
      wedge: null,
      parts: null,
    });
  }
  // the shader state from the record: what has been cut so far
  function syncCuts(rec) {
    const r = RT[rec.id];
    if (!r) return;
    const p = rec.p,
      G = geomOf(r.t, p),
      c = rec.cut || {};
    r.U.uC0.value.set(G.R, p.hS, G.xS, G.tA);
    r.U.uC1.value.set(
      c.sole ? (c.sole >= 1 ? G.d + 0.002 : G.d * c.sole) : 0,
      c.roof ? (c.roof >= 1 ? G.d + 0.002 : G.d * c.roof * 1.05) : 0,
      c.open ? 1 : 0,
      KERF
    );
    r.U.uC2.value.set(G.hB, G.xH, G.xB, c.back ? (c.band ? 2 : Math.min(1, c.back)) : 0);
    r.U.uC3.value.y = c.splint ? 1 : 0;
    r.U.uC3.value.z = Math.sqrt(Math.max(0, G.R * G.R - G.xS * G.xS));
    for (const m of [
      r.foot.material,
      r.parts && r.parts.stem.material,
      r.parts && r.parts.piece && r.parts.piece.material,
    ].filter(Boolean)) {
      m.userData.U.uC3.value.y = r.U.uC3.value.y;
      m.userData.U.uC3.value.z = r.U.uC3.value.z;
    }
    // open notch: cut faces and the piece on the ground
    if (c.open && !r.caps) {
      r.caps = capsOf(r.t, p, G, { sole: true, roof: true });
      r.F.add(r.caps);
    }
    if (c.open && !r.piece) {
      r.piece = notchPiece(r.t, p, G);
      r.F.add(r.piece);
      const gz = ground(...toSite(r.t, r.az, G.R + 0.45, 0.1)) - (r.t.z - 0.05);
      r.piece.position.set(G.R + 0.45 - G.xS, gz + 0.03 - p.hS, 0.1);
      r.piece.rotation.set(0.15, 0.6, Math.PI * 0.5);
    }
    if (c.wedge && !r.wedge) {
      r.wedge = wedgeMesh();
      r.F.add(r.wedge);
    }
    if (r.wedge) {
      const ins = clamp(c.wedge || 0, 0, 1.6);
      r.wedge.position.set(-G.RB - 0.16 + 0.09 * ins, G.hB, 0.02);
    } // thick end out of the cut, 7–14 cm
    markDirty(true);
  }
  // ---------------- protective gear for the forest (werk/gear.js) ----------------
  const FORST = ['forsthelm', 'forsthose', 'forststiefel', 'forsthand', 'warnjacke'];
  const gearOk = () => GEAR.check(FORST, false, 'Motorsäge');
  // ---------------- the chainsaw ----------------
  // generic professional saw (~50 cm³, 40 cm bar), no brand: x along the saw (rear handle at 0, bar tip at 0.86), y up, z right
  function sawModel() {
    const g = new THREE.Group();
    box(g, 0.29, 0.1, 0, 0.3, 0.17, 0.16, MT.grey);
    box(g, 0.29, 0.2, -0.005, 0.28, 0.05, 0.15, MT.orange);
    box(g, 0.33, 0.12, 0.09, 0.2, 0.12, 0.03, MT.dark); // body, top cover, sprocket cover
    box(g, 0.21, 0.07, -0.092, 0.12, 0.08, 0.025, MT.black); // muffler
    // rear handle (closed loop) and throttle, front handle bar, hand guard
    box(g, 0.07, 0.16, 0, 0.16, 0.035, 0.035, MT.black);
    box(g, 0.0, 0.1, 0, 0.035, 0.12, 0.035, MT.black);
    box(g, 0.12, 0.08, 0, 0.06, 0.035, 0.035, MT.black);
    box(g, 0.08, 0.135, 0, 0.03, 0.012, 0.02, MT.orange);
    const fh = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.013, 8, 20, Math.PI * 1.15), MT.black);
    fh.position.set(0.3, 0.15, 0);
    fh.rotation.set(0, Math.PI / 2, -0.25);
    fh.castShadow = true;
    g.add(fh);
    box(g, 0.44, 0.24, 0, 0.012, 0.1, 0.13, MT.black, 0, 0, -0.35);
    // bar and chain (the chain is a separate mesh: it runs)
    const bar = new THREE.Group();
    bar.position.set(0.44, 0.1, 0.068);
    g.add(bar);
    box(bar, 0.21, 0, 0, 0.42, 0.06, 0.006, MT.steel);
    cyl(bar, 0.42, 0, 0, 0.03, 0.006, MT.steel, 'z', 16);
    const chain = box(bar, 0.21, 0, 0, 0.44, 0.072, 0.009, MT.chain);
    chain.name = 'chain';
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.userData.noMerge = true;
      }
    });
    return g;
  }
  const SAW = { run: false, starting: 0, rpm: 0, load: 0, want: 0, T: null, loops: false, t: 0 };
  // held by the front handle bar: carried at the side with the bar pointing back (as one should walk with a saw); while cutting the bar points forward
  const HANDLE = [0.3, 0.26, 0];
  function sawPose(inner, fwd) {
    const th = fwd ? Math.PI / 2 : -Math.PI / 2;
    inner.rotation.set(0, th, 0);
    const c = Math.cos(th),
      s = Math.sin(th);
    inner.position.set(-(HANDLE[0] * c + HANDLE[2] * s), -HANDLE[1], -(-HANDLE[0] * s + HANDLE[2] * c));
  }
  function mkSaw() {
    if (SAW.T) return SAW.T;
    const world = new THREE.Group(),
      held = new THREE.Group();
    world.add(sawModel());
    const inner = sawModel();
    sawPose(inner, false);
    held.add(inner);
    SAW.inner = inner;
    SAW.T = PLAY.thing({
      id: 'motorsaege',
      name: 'Motorsäge',
      world,
      held,
      r: 1.4,
      hz: 0.1,
      carry3: 'side',
      grip3: { hang: 0.02 },
      s3: 1,
      vm: { x: 0.3, y: -0.3, z: -0.5, rx: 0.12, ry: Math.PI, rz: 0.0, s: 0.85 },
      desc: 'Profi-Motorsäge, ~50 cm³, Schiene 40 cm, Kettenbremse, Kettenfänger. Nur mit kompletter Forst-PSA.',
      onDrop: () => sawStop(),
      noDrop: () => (SAW.run ? 'Erst die Säge ausmachen.' : null),
    });
    SAW.T.state = 'gone';
    world.visible = false;
    return SAW.T;
  }
  function sawEnsure() {
    const T = mkSaw();
    if (!PLAY.has(T)) {
      if (T.state === 'world') {
        think('Die Motorsäge liegt noch da – erst aufheben.');
        return false;
      }
      think('Die Motorsäge liegt in der Forstkiste am Traktor.');
      return false;
    }
    PLAY.toHand(T);
    return true;
  }
  function sawStart(then) {
    if (SAW.run) {
      then && then();
      return;
    }
    SAW.starting = 2.6;
    if (audio.has('csaw_start')) audio.at('csaw_start', P.x, P.y, { vol: 1.1, ref: 9 });
    setTimeout(() => {
      SAW.run = true;
      SAW.starting = 0;
      loopsOn();
      then && then();
    }, 2400);
  }
  function sawStop() {
    if (!SAW.run) return;
    SAW.run = false;
    loopsOff();
  }
  function loopsOn() {
    if (SAW.loops || !audio.has('csaw_idle')) return;
    SAW.loops = true;
    for (const [n, k] of [
      ['csaw:idle', 'csaw_idle'],
      ['csaw:high', 'csaw_high'],
      ['csaw:cut', 'csaw_cut'],
    ])
      audio.loopAt(n, k, P.x, P.y, { vol: 0, ref: 9 });
  }
  function loopsOff() {
    if (!SAW.loops) return;
    SAW.loops = false;
    for (const n of ['csaw:idle', 'csaw:high', 'csaw:cut']) audio.stopLoop(n, 0.6);
  }
  function sawTick(dt) {
    const T = SAW.T;
    if (!T) return;
    const inHand = PLAY.carry === T;
    const cutting =
      inHand && !!(PLAY.hold && PLAY.hold.a && String(PLAY.hold.a.id || '').startsWith('fell:') && SAW.run);
    if (cutting !== SAW.fwd) {
      SAW.fwd = cutting;
      sawPose(SAW.inner, cutting);
      T.vm.ry = cutting ? 0 : Math.PI;
      T.vm.y = cutting ? -0.36 : -0.3;
      markDirty();
    }
    if (SAW.run && (!inHand || P.mode !== 'walk')) {
      if (!S.job || !inHand) sawStop();
    }
    SAW.want = SAW.run ? (SAW.load > 0 ? 1 : 0.0) : 0;
    SAW.rpm += ((SAW.run ? (SAW.load > 0 ? 0.78 : 0.22) : 0) - SAW.rpm) * Math.min(1, dt * 6);
    if (SAW.loops) {
      const L = SAW.load,
        sx = P.x,
        sy = P.y;
      audio.loopVol('csaw:idle', SAW.run ? (1 - L) * 0.55 : 0);
      audio.loopVol('csaw:cut', L * 0.95);
      audio.loopVol('csaw:high', 0);
      for (const n of ['csaw:idle', 'csaw:cut']) audio.moveLoop(n, sx, sy);
      audio.loopRate('csaw:cut', 0.97 + 0.06 * Math.sin(performance.now() / 700), 0.3);
    }
    // the chain runs while cutting (texture-less: a shimmer by moving the mesh a hair)
    if (HELD.obj && SAW.load > 0) {
      HELD.obj.traverse(o => {
        if (o.name === 'chain') o.position.x = 0.21 + Math.sin(performance.now() / 9) * 0.0015;
      });
      markDirty();
    }
    cutSaw(cutting);
  }
  // seen from behind the figure (third person), the saw is shown where it cuts: the body outside the stem, the bar in the cut, pointing from
  // where one stands into the wood – the figure kneels or stands beside it (the saw in the hand would hang in the air in those poses)
  function cutSaw(on) {
    const third = on && typeof CAM3 !== 'undefined' && CAM3.on,
      T = SAW.T,
      a = PLAY.hold && PLAY.hold.a;
    if (!SAW.cut3) {
      SAW.cut3 = new THREE.Group();
      const m = sawModel();
      m.position.set(-HANDLE[0], -HANDLE[1], -HANDLE[2]);
      SAW.cut3.add(m);
      SAW.cut3.visible = false;
      SAW.cut3.traverse(o => {
        if (o.isMesh) o.userData.noMerge = true;
      });
      scene.add(SAW.cut3);
    }
    if (T && T.held) T.held.visible = !third;
    if (!third || !a || !a.pos) {
      if (SAW.cut3.visible) {
        SAW.cut3.visible = false;
        markDirty();
      }
      return;
    }
    const p = a.pos();
    if (!p) return;
    let dx = p[0] - P.x,
      dy = p[1] - P.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    let r = 0.2;
    try {
      const rec = cur(),
        t = rec && treeOf(rec);
      if (t) r = FOREST.trunkR(t, THREE.MathUtils.clamp(p[2] - t.z, 0.3, 1.3));
    } catch (e) {}
    const hx = p[0] - dx * (r + 0.42),
      hy = p[1] - dy * (r + 0.42);
    SAW.cut3.position.copy(V(hx, hy, p[2]));
    SAW.cut3.rotation.set(0, Math.atan2(dy, dx), -0.08, 'YXZ'); // the model's +x (the bar) towards the stem
    SAW.cut3.children[0].position.x = -HANDLE[0] + Math.sin(performance.now() / 9) * 0.002;
    SAW.cut3.visible = true;
    markDirty();
  }
  // ---------------- the forest box at the tractor: gear, saw, wedges, hammer, tape, calliper ----------------
  let KIT = null;
  function kitPos() {
    const v = window.VEH && VEH.by && VEH.by.tractor,
      h = v && v.spec.home ? v.spec.home() : [-563.8, -581.4, 0];
    const psi = h[2] || 0,
      f = [Math.sin(psi), Math.cos(psi)],
      r = [Math.cos(psi), -Math.sin(psi)];
    let x = h[0] + r[0] * 2.4 - f[0] * 1.6,
      y = h[1] + r[1] * 2.4 - f[1] * 1.6;
    for (let k = 0; k < 6 && ROADS.edge(x, y) > -0.4; k++) {
      x += r[0] * 0.8;
      y += r[1] * 0.8;
    }
    return [x, y, psi];
  }
  function buildKit() {
    const [x, y, psi] = kitPos(),
      g = new THREE.Group();
    box(g, 0, 0.21, 0, 0.92, 0.42, 0.46, MT.box);
    box(g, 0, 0.435, 0, 0.94, 0.03, 0.48, MT.lid);
    box(g, 0, 0.3, 0.232, 0.3, 0.1, 0.004, MT.label);
    for (const sx of [-0.38, 0.38]) box(g, sx, 0.2, 0.235, 0.05, 0.1, 0.02, MT.dark);
    g.position.copy(V(x, y, ground(x, y)));
    g.rotation.y = psi;
    g.userData.noMerge = true;
    scene.add(g);
    KIT = { g, x, y };
    PLAY.act({
      id: 'fell:kit',
      r: 1.7,
      prio: 0.3,
      obj: () => g,
      pos: () => [x, y, ground(x, y) + 0.45],
      label: () => 'Forstkiste öffnen',
      run: openKit,
    });
  }
  function openKit() {
    const T = mkSaw();
    const have = PLAY.has(T) || T.state === 'world';
    WUI.machine({
      title: 'Forstkiste',
      sub: 'Motorsägenarbeit im Wald: Ausrüstung nach DGUV Information 214-046',
      checks: [],
      info: 'Persönliche Schutzausrüstung: Schutzhelm mit Gesichtsschutz (Visier) und Gehörschutz, Schnittschutzhose (Schnittschutz Klasse 1, Form A), Schnittschutzstiefel, Handschuhe, Warnjacke in Signalfarbe. Dazu Motorsäge (Kettenbremse prüfen, Kette scharf und gespannt), Kombikanister, zwei Fällkeile, Spalthammer, Maßband, Kluppe. Nie allein im Wald arbeiten: Günter ist per Handy in Rufweite.',
      go: have ? 'PSA anlegen' : 'Alles nehmen und PSA anlegen',
      onGo: () => {
        if (!have) {
          PLAY.give(T);
          S.kit = true;
        }
        GEAR.giveForest();
        for (const id of FORST) GEAR.wear(id, true);
        SFX.cloth();
        think(
          'Helm mit Visier und Gehörschutz, Schnittschutzhose, Stiefel, Handschuhe, Warnjacke – komplett. Säge, Keile, Hammer, Maßband und Kluppe sind dabei.',
          6000
        );
        save();
        bookRefresh();
      },
    });
  }
  // ---------------- the work on one tree: steps ----------------
  // st: plan → retreat → sole → roof → splint → call1 → back → wedge → call2 → band → falling → down → delimb → trim → top → buck → measure → done
  const ORDER = [
    'plan',
    'retreat',
    'sole',
    'roof',
    'splint',
    'call1',
    'back',
    'wedge',
    'call2',
    'band',
    'falling',
    'down',
    'delimb',
    'trim',
    'top',
    'buck',
    'measure',
    'done',
  ];
  const BOOK = [
    [
      'kit',
      'Ausrüstung',
      'Forstkiste am Traktor: Helm mit Visier und Gehörschutz, Schnittschutzhose, Schnittschutzstiefel, Handschuhe, Warnjacke. Säge mit Kettenbremse, Keile, Hammer.',
    ],
    [
      'plan',
      'Baum ansprechen, Fallrichtung',
      'Höhe, Neigung, Krone, Totholz, Nachbarn. Fallrichtung in eine Lücke, nie gegen Stämme. Gefahrenbereich: doppelte Baumlänge – niemand darin.',
    ],
    [
      'retreat',
      'Rückweiche',
      'Zwei Wege schräg zurück, etwa 45° zur Fallrichtung, frei von Ästen und Steinen; der Rückzugsort liegt außerhalb der Kronenprojektion. Stammfuß freimachen.',
    ],
    ['sole', 'Fallkerb: Sohle', 'Waagerecht, so tief wie möglich am Stamm, 1/5 bis 1/3 des Durchmessers.'],
    [
      'roof',
      'Fallkerb: Dach',
      '45° bis 60° zur Sohle; beide Schnitte treffen sich genau in der Fallkerbsehne – kein Überschnitt.',
    ],
    [
      'splint',
      'Splintschnitte',
      'Fichte, Lärche, Kiefer: an beiden Enden der Sehne einschneiden, damit die langen Fasern nicht aufreißen.',
    ],
    ['call1', 'Warnruf', 'Säge in Leerlauf, Visier und Gehörschutz kurz auf, Rundumblick: „Achtung, Baum fällt!“'],
    [
      'back',
      'Fällschnitt als Stechschnitt',
      '1/10 Ø über der Sohle (mind. 3 cm). Vorn bleibt die Bruchleiste (1/10 Ø) als Scharnier, hinten das Stützband, das den Baum hält, bis du es durchtrennst.',
    ],
    [
      'wedge',
      'Keil setzen',
      'Fällkeil in den Fällschnitt, mit dem Hammer antreiben – der Baum kann nicht mehr zurück.',
    ],
    ['call2', 'Warnruf', 'Erneut Rundumblick und Ruf, bevor das Band fällt.'],
    [
      'band',
      'Stützband durchtrennen',
      'Zuletzt, seitlich stehend, schräg von oben. Dann sofort auf die Rückweiche und die Krone beobachten.',
    ],
    [
      'delimb',
      'Entasten',
      'Vom Stammfuß zum Zopf, die Säge auf dem Stamm abgestützt, nie mit der Schienenspitze. Äste unter Spannung zuerst beurteilen.',
    ],
    ['trim', 'Stammfuß kappen', 'Den Fallkerb gerade abschneiden – das Bodenstück mit Kerb taugt nicht für Bretter.'],
    ['top', 'Zopf', 'Bei etwa 14 cm Durchmesser den Gipfel abtrennen; er bleibt als Kronenholz liegen.'],
    [
      'buck',
      'Ablängen',
      'Mit dem Maßband messen (Übermaß 10 cm), zuerst in die Druckseite sägen, dann von der Zugseite trennen.',
    ],
    [
      'measure',
      'Vermessen',
      'Mittendurchmesser mit der Kluppe (zweimal über Kreuz), Länge: Volumen nach Huber = π/4 · d² · L.',
    ],
  ];
  function rec0(t) {
    const D = 2 * FOREST.trunkR(t, 0.3),
      dirs = t.fellDirs || freeDirs(t);
    return {
      id: t.id,
      st: 'plan',
      az: dirs.best ?? 0,
      p: { hS: 0.3, d: D / 4, ang: 50, step: Math.max(0.03, D / 10), T: D / 10, B: D / 8 },
      cut: {},
      q: {},
      notes: [],
      calls: 0,
      t0: CLOCK.t,
      sp: t.sp,
      h: t.h,
    };
  }
  function cur() {
    return S.job != null ? S.trees[S.job] : null;
  }
  function treeOf(rec) {
    return FOREST.byId(rec.id);
  }
  // where to stand: in front (notch), at the back (felling cut, band), beside the stem
  function standAt(rec, where) {
    const t = treeOf(rec),
      G = geomOf(t, rec.p),
      r = G.R + 0.75;
    const [x, y] = toSite(
      t,
      rec.az,
      where === 'front' ? r : where === 'back' ? -r : 0,
      where === 'side' ? r : where === 'left' ? -r : 0
    );
    return [x, y];
  }
  // ---- the windows of the steps (WUI.machine) with a drawing of the stump seen from above ----
  function stumpSVG(rec, hl) {
    const t = treeOf(rec),
      G = geomOf(t, rec.p),
      S0 = 90 / G.R,
      cx = 120,
      cy = 100,
      X = x => cx + x * S0,
      Y = z => cy + z * S0;
    const phi = Math.acos(clamp(G.xS / G.R, -1, 1)),
      w = Math.sin(phi) * G.R,
      phB = Math.acos(clamp(G.xH / G.RB, -1, 1)),
      wB = Math.sin(phB) * G.RB;
    const col = k => (hl === k ? '#e8661c' : '#7a6a55');
    let s = `<svg viewBox="0 0 240 200" class="fellfig" role="img" aria-label="Stock von oben"><circle cx="${cx}" cy="${cy}" r="${G.R * S0}" fill="#e9dcc0" stroke="#5a4634" stroke-width="3"/>`;
    s += `<path d="M ${X(G.xS)} ${Y(-w)} A ${G.R * S0} ${G.R * S0} 0 0 1 ${X(G.xS)} ${Y(w)} Z" fill="${col('notch')}" opacity=".55"/>`;
    s += `<rect x="${X(G.xH)}" y="${Y(-Math.sqrt(Math.max(0, G.R ** 2 - G.xH ** 2)))}" width="${(G.xS - G.xH) * S0}" height="${2 * Math.sqrt(Math.max(0, G.R ** 2 - G.xH ** 2)) * S0}" fill="${col('hinge')}" opacity=".9"/>`;
    s += `<line x1="${X(G.xH)}" y1="${cy}" x2="${X(G.xB)}" y2="${cy}" stroke="${col('back')}" stroke-width="3"/><rect x="${X(-G.RB)}" y="${Y(-wB * 0.5)}" width="${(G.xB + G.RB) * S0}" height="${wB * S0}" fill="${col('band')}" opacity=".7"/>`;
    s += `<path d="M ${cx + G.R * S0 + 8} ${cy} l 26 0 m -8 -6 l 8 6 l -8 6" stroke="#2c6b3a" stroke-width="3" fill="none"/><text x="${cx + G.R * S0 + 4}" y="${cy - 12}" font-size="10" fill="#2c6b3a">Fallrichtung</text>`;
    s += `<text x="8" y="16" font-size="11" fill="#333">Ø ${cmS(G.D)} in ${de(Math.round(rec.p.hS * 100))} cm Höhe</text>`;
    s += `<text x="8" y="192" font-size="10" fill="#555">Kerb ${cmS(G.d)} · Leiste ${cmS(G.T)} · Band ${cmS(G.xB + G.RB)}</text></svg>`;
    return s;
  }
  // ---- the plan: look at the tree, choose the direction (dial), see the danger zone, the free ways, the retreat ----
  let MARKG = null;
  function showMarks(rec, on) {
    if (MARKG) {
      scene.remove(MARKG);
      MARKG.traverse(o => {
        if (o.geometry) o.geometry.dispose();
      });
      MARKG = null;
    }
    if (!on || !rec) return;
    const t = treeOf(rec),
      g = new THREE.Group();
    MARKG = g;
    const strip = (pts, w, m) => {
      const p = [],
        idx = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)],
          b = pts[Math.min(pts.length - 1, i + 1)],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          L = Math.hypot(dx, dy) || 1,
          nx = ((-dy / L) * w) / 2,
          ny = ((dx / L) * w) / 2;
        for (const s of [-1, 1]) {
          const x = pts[i][0] + nx * s,
            y = pts[i][1] + ny * s,
            v = V(x, y, ground(x, y) + 0.14);
          p.push(v.x, v.y, v.z);
        }
        if (i) {
          const k = i * 2;
          idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setIndex(idx);
      const me = new THREE.Mesh(geo, m);
      me.renderOrder = 3;
      g.add(me);
    };
    const free = (t.fellDirs || freeDirs(t)).list,
      ok = free.includes((Math.round(rec.az / 5) * 5) % 360),
      fx = Math.sin(rec.az * D2R),
      fy = Math.cos(rec.az * D2R);
    const line = [];
    for (let s = 0.5; s <= t.h; s += 1) line.push([t.x + fx * s, t.y + fy * s]);
    strip(line, 0.22, MT.line(ok ? 0x46c46a : 0xe0442a, 0.9));
    const tip = [t.x + fx * t.h, t.y + fy * t.h],
      rx = Math.cos(rec.az * D2R),
      ry = -Math.sin(rec.az * D2R);
    strip(
      [
        [tip[0] - fx * 1.4 + rx * 0.9, tip[1] - fy * 1.4 + ry * 0.9],
        tip,
        [tip[0] - fx * 1.4 - rx * 0.9, tip[1] - fy * 1.4 - ry * 0.9],
      ],
      0.22,
      MT.line(ok ? 0x46c46a : 0xe0442a, 0.9)
    );
    for (const s of [-1, 1]) {
      const a = (rec.az + 180 + s * 45) * D2R,
        pts = [];
      for (let k = 1.0; k <= 6.5; k += 0.5) pts.push([t.x + Math.sin(a) * k, t.y + Math.cos(a) * k]);
      strip(pts, 0.16, MT.line(0xffffff, 0.8));
    }
    const R2 = t.h * 2;
    for (let k = 0; k < 72; k += 2) {
      const pts = [];
      for (let j = 0; j <= 4; j++) {
        const a = (k + j / 4) * 5 * D2R;
        pts.push([t.x + Math.sin(a) * R2, t.y + Math.cos(a) * R2]);
      }
      strip(pts, 0.25, MT.line(0xf08a1a, 0.75));
    }
    g.userData.noMerge = true;
    scene.add(g);
    markDirty(true);
  }
  function openPlan(rec) {
    const t = treeOf(rec),
      G = geomOf(t, rec.p),
      ln = leanOf(t),
      dirs = t.fellDirs || freeDirs(t);
    const near = (window.NPCS ? [NPCS.guenter, NPCS.bernd] : []).filter(
      w => w && Math.hypot(w.x - t.x, w.y - t.y) < 2 * t.h
    );
    const veh = (window.VEH ? VEH.list : []).filter(v => Math.hypot(v.st.x - t.x, v.st.y - t.y) < t.h + 3);
    const dirTxt = az => ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];
    WUI.machine({
      title: SPN[t.sp] + ' ansprechen',
      sub: `Höhe ${de(t.h, 1)} m · BHD ${cmS(2 * FOREST.trunkR(t, 1.3))} · Neigung ${de(ln.deg, 1)}° nach ${dirTxt(ln.az)} · Krone ${t.sp === 'larch' ? 'licht' : 'dicht'}, Totäste unten`,
      rows: [{ k: 'az', label: 'Fallrichtung', unit: '°', min: 0, max: 355, step: 5, val: rec.az }],
      choices: [
        {
          k: 'sug',
          label: 'Freie Richtungen (Lücken ohne Stämme)',
          val: '',
          opts: dirs.list.slice(0, 6).map(a => [a, a + '° ' + dirTxt(a)]),
        },
      ],
      info: `Gefahrenbereich: ${de(Math.round(2 * t.h))} m rundum (doppelte Baumlänge) – ${near.length ? 'Achtung: jemand ist darin!' : 'niemand darin.'}${veh.length ? ' ' + veh.map(v => (v.id === 'tractor' ? 'Der Traktor' : 'Das Auto')).join(', ') + ' steht in Reichweite des Baums – nicht dorthin fällen!' : ''} Grün = freie Bahn, Rot = Stamm im Weg (Baum würde hängen bleiben). Weiß: die Rückweiche, 45° schräg zurück.`,
      go: 'Fallrichtung festlegen',
      onGo: v => {
        let az = v.sug !== '' && v.sug != null && +v.sug !== rec.az && dirs.list.includes(+v.sug) ? +v.sug : v.az;
        rec.az = (((Math.round(az / 5) * 5) % 360) + 360) % 360;
        const free = dirs.list.includes(rec.az);
        if (!free) {
          think(
            'In dieser Richtung steht ein Stamm im Weg – der Baum würde hängen bleiben. Eine grüne Richtung wählen.',
            5200
          );
          showMarks(rec, true);
          return;
        }
        if (
          veh.some(v => {
            const dx = v.st.x - t.x,
              dy = v.st.y - t.y,
              fx = Math.sin(rec.az * D2R),
              fy = Math.cos(rec.az * D2R),
              al = dx * fx + dy * fy;
            return al > -1 && al < t.h + 2 && Math.abs(dx * fy - dy * fx) < 4;
          })
        ) {
          think('Da steht ein Fahrzeug in der Fallbahn. Andere Richtung oder erst wegfahren.', 5000);
          return;
        }
        rec.st = 'retreat';
        ensureSolo(rec);
        showMarks(rec, true);
        CLOCK.t += 4;
        changed();
        think(
          `Fallrichtung ${rec.az}° (${dirTxt(rec.az)}). Jetzt die Rückweiche anlegen: schräg zurück, frei von Ästen.`,
          5000
        );
      },
      onClose: () => showMarks(rec, rec.st !== 'plan' && rec.st !== 'done'),
    });
    showMarks(rec, true);
  }
  function ensureSolo(rec) {
    const t = treeOf(rec);
    if (!RT[t.id]) {
      const r = solo(t, rec.az, rec);
      if (rec.st !== 'plan') syncCuts(rec);
      return r;
    }
    return RT[t.id];
  }
  // ---- the cuts: a window for the settings, then the saw in a gauge (stop in the green zone) ----
  function cutWin(rec, o) {
    WUI.machine({
      title: o.title,
      sub: o.sub,
      rows: o.rows,
      info: o.info,
      fig: stumpSVG(rec, o.hl),
      gear: { req: FORST },
      go: o.go || 'Säge ansetzen',
      onGo: v => {
        if (!gearOk() || !sawEnsure()) return;
        Object.assign(rec.p, o.apply ? o.apply(v) : {});
        syncCuts(rec);
        changed();
        sawStart(() => PLAY.run(o.act(rec)));
      },
    });
  }
  const trunkPos = rec => {
    const t = treeOf(rec);
    return [t.x, t.y, t.z + 0.4];
  };
  const gaugeAct = (rec, key, label, g, where, onDone, anim) => ({
    id: 'fell:g:' + key,
    r: 2.6,
    rMove: 1.2,
    pos: () => trunkPos(rec),
    label: () => label,
    gauge: g,
    holdLabel: 'Sägen – im grünen Bereich stoppen (E)',
    anim3: anim || 'kneelIdle',
    start: () => {
      SAW.load = 1;
    },
    work: k => {
      const c = rec.cut;
      if (key === 'sole') c.sole = (k / g.hi) * 0.95;
      if (key === 'roof') c.roof = k;
      if (key === 'back') c.back = Math.min(0.95, k);
      syncCuts(rec);
    },
    cancel: () => {
      SAW.load = 0;
    },
    run: k => {
      SAW.load = 0;
      onDone(k);
      CLOCK.t += 2;
      changed();
    },
  });
  function doSole(rec) {
    const t = treeOf(rec),
      D0 = 2 * FOREST.trunkR(t, rec.p.hS);
    cutWin(rec, {
      title: 'Fallkerb: Sohle',
      hl: 'notch',
      sub: 'Waagerecht, tief am Stamm, quer zur Fallrichtung',
      rows: [
        {
          k: 'hS',
          label: 'Höhe über dem Boden',
          unit: 'cm',
          min: 10,
          max: 60,
          step: 5,
          val: Math.round(rec.p.hS * 100),
        },
      ],
      info: `Ziel: Kerbtiefe 1/5 bis 1/3 des Durchmessers (${cmS(D0 / 5)} – ${cmS(D0 / 3)}). Im grünen Bereich stoppen. Stock niedrig halten: wertvollstes Holz sitzt unten.`,
      apply: v => {
        const hS = v.hS / 100,
          D = 2 * FOREST.trunkR(t, hS);
        return { hS, step: Math.max(0.03, D / 10) };
      },
      act: rec => {
        const D = 2 * FOREST.trunkR(t, rec.p.hS);
        return gaugeAct(rec, 'sole', 'Sohlenschnitt', { dur: 3.2, lo: 0.4, hi: 0.667 }, 'front', k => {
          rec.p.d = (k * D) / 2;
          rec.cut.sole = 1;
          const r = (k * 2 * 1) / 2;
          if (k < 0.4) note(rec, 'Fallkerb zu flach (' + cmS(rec.p.d) + ') – die Bruchleiste führt schlechter');
          else if (k > 0.667) note(rec, 'Fallkerb zu tief (' + cmS(rec.p.d) + ') – Standfestigkeit leidet');
          rec.st = 'roof';
          syncCuts(rec);
          think(
            `Sohle ${cmS(rec.p.d)} tief (${de(Math.round((rec.p.d / D) * 100))} % vom Durchmesser). Jetzt das Dach – es muss die Sohle genau in der Sehne treffen.`,
            5200
          );
        });
      },
    });
  }
  function doRoof(rec) {
    const t = treeOf(rec);
    cutWin(rec, {
      title: 'Fallkerb: Dach',
      hl: 'notch',
      sub: 'Von oben schräg auf die Sohle',
      rows: [{ k: 'ang', label: 'Winkel zur Sohle', unit: '°', min: 30, max: 75, step: 5, val: rec.p.ang }],
      info: 'Üblich 45°–60°. Zu spitz: der Kerb schließt sich zu früh, die Bruchleiste reißt, die Fichte kann aufreißen. Stoppen, wenn der Dachschnitt die Sohle trifft – nicht darüber hinaus.',
      apply: v => ({ ang: v.ang }),
      act: rec =>
        gaugeAct(rec, 'roof', 'Dachschnitt', { dur: 3.0, lo: 0.74, hi: 0.86 }, 'front', k => {
          const meet = k / 0.8;
          rec.cut.roof = 1;
          rec.cut.open = 1;
          if (meet < 0.925) {
            note(rec, 'Dach traf die Sohle nicht ganz – Kerbstück nachgeschnitten, Sehne unsauber');
            rec.q.chord = 0.6;
          } else if (meet > 1.075) {
            note(rec, 'Überschnitt am Fallkerb – schwächt die Bruchleiste');
            rec.q.chord = 0.5;
          } else rec.q.chord = 1;
          if (rec.p.ang < 45) note(rec, 'Fallkerb zu spitz (' + rec.p.ang + '°)');
          if (rec.p.ang > 60) note(rec, 'Fallkerb sehr offen (' + rec.p.ang + '°) – geht, kostet Holz');
          rec.st = t.sp === 'beech' ? 'call1' : 'splint';
          syncCuts(rec);
          dropPiece(rec);
          think(
            'Kerbstück fällt heraus. ' +
              (rec.st === 'splint' ? 'Jetzt die Splintschnitte an beiden Enden der Sehne.' : ''),
            4200
          );
        }),
    });
  }
  function dropPiece(rec) {
    const r = RT[rec.id];
    if (!r || !r.piece) return;
    const p0 = r.piece.position.clone(),
      t0 = performance.now(),
      G = geomOf(r.t, rec.p);
    const p1 = p0.clone();
    r.piece.position.set(0, 0, 0);
    r.piece.rotation.set(0, 0, 0);
    ANIM.push({
      dur: 0.7,
      f: k => {
        const e = k * k;
        r.piece.position.set(lerp(0, p1.x, e), lerp(0, p1.y, e) + Math.sin(k * Math.PI) * 0.15, lerp(0, p1.z, k));
        r.piece.rotation.set(0.15 * k, 0.6 * k, Math.PI * 0.5 * e);
      },
    });
    SFX.drop();
  }
  function doSplint(rec) {
    if (!gearOk() || !sawEnsure()) return;
    sawStart(() =>
      PLAY.run({
        id: 'fell:splint',
        r: 2.6,
        rMove: 1.2,
        pos: () => trunkPos(rec),
        label: () => 'Splintschnitte',
        hold: 2.4,
        anim3: 'kneelIdle',
        holdLabel: 'Splintschnitte links und rechts …',
        start: () => {
          SAW.load = 1;
        },
        cancel: () => {
          SAW.load = 0;
        },
        run: () => {
          SAW.load = 0;
          rec.cut.splint = 1;
          rec.st = 'call1';
          syncCuts(rec);
          CLOCK.t += 1;
          changed();
          think('Splint eingeschnitten – die Fasern reißen nicht hoch. Vor dem Fällschnitt: Warnruf.', 4200);
        },
      })
    );
  }
  function doCall(rec, which) {
    sawIdle();
    const lines = ['Achtung, Baum fällt!'];
    shout(lines[0]);
    rec.calls = (rec.calls || 0) + 1;
    // a look around: the head turns left and right
    const y0 = P.yaw;
    ANIM.push({
      dur: 2.2,
      f: k => {
        P.yaw = y0 + Math.sin(k * Math.PI * 2) * 70 * (1 - k * 0.3);
      },
    });
    rec.st = which === 1 ? 'back' : 'band';
    CLOCK.t += 0.5;
    changed();
  }
  function sawIdle() {
    SAW.load = 0;
  }
  function shout(text) {
    const k = window.AVATAR && AVATAR.kind === 'f' ? 'f' : 'm';
    if (audio.hasVoice && audio.hasVoice('call_' + k)) audio.voice('call_' + k, P.x, P.y, { vol: 1.4, ref: 30 });
    think('„' + text + '“', 2600);
    if (window.AVATAR) AVATAR.gesture('greet', 1.2);
  }
  function doBack(rec) {
    const t = treeOf(rec),
      D = 2 * FOREST.trunkR(t, rec.p.hS);
    cutWin(rec, {
      title: 'Fällschnitt als Stechschnitt',
      hl: 'back',
      sub: 'Mit der Schienenspitze einstechen, nach vorn bis zur Bruchleiste, nach hinten bis zum Stützband',
      rows: [
        {
          k: 'step',
          label: 'Bruchstufe (über der Sohle)',
          unit: 'cm',
          min: 0,
          max: 15,
          step: 1,
          val: Math.round(rec.p.step * 100),
        },
        {
          k: 'B',
          label: 'Stützband hinten',
          unit: 'cm',
          min: 1,
          max: Math.max(6, Math.round(D * 40)),
          step: 1,
          val: Math.round(rec.p.B * 100),
        },
      ],
      info: `Bruchstufe 1/10 Ø, mindestens 3 cm (${cmS(Math.max(0.03, D / 10))}): hält den Stamm auf dem Stock. Bruchleiste 1/10 Ø (${cmS(D / 10)}) – im grünen Bereich stoppen. Stützband: hält den Baum, bis du es zuletzt durchtrennst – zu schmal reißt es vorzeitig, zu breit kostet Zeit (Richtwert im Spiel: 1/10 bis 1/5 Ø).`,
      apply: v => ({ step: v.step / 100, B: v.B / 100 }),
      act: rec =>
        gaugeAct(
          rec,
          'back',
          'Fällschnitt (Stechschnitt)',
          { dur: 3.6, lo: 0.415, hi: 0.685 },
          'side',
          k => {
            rec.p.T = Math.max(0.004, ((1 - k) * D) / 4.5);
            rec.cut.back = 1;
            rec.st = 'wedge';
            syncCuts(rec);
            const T = rec.p.T;
            if (T < D / 20) note(rec, 'Bruchleiste zu schmal (' + cmS(T) + ')');
            else if (T > D / 6) note(rec, 'Bruchleiste zu breit (' + cmS(T) + ')');
            if (rec.p.step < 0.03 || rec.p.step < (D / 10) * 0.7)
              note(rec, 'Bruchstufe zu klein (' + cmS(rec.p.step) + ') – der Stamm kann über den Stock zurückrutschen');
            if (rec.p.B < D / 20) {
              note(rec, 'Stützband zu schwach – es reißt vorzeitig');
              rec.early = true;
            }
            think(
              `Bruchleiste ${cmS(T)} (${de(Math.round((T / D) * 100))} %). Jetzt den Keil in den Fällschnitt.`,
              4600
            );
            if (rec.early)
              setTimeout(() => {
                if (rec.st === 'wedge') startFall(rec, true);
              }, 2600);
          },
          'interactLoop'
        ),
    });
  }
  function doWedge(rec) {
    if (!gearOk()) return;
    PLAY.run({
      id: 'fell:wedge',
      r: 2.6,
      rMove: 1.2,
      pos: () => trunkPos(rec),
      label: () => 'Fällkeil setzen und antreiben',
      hold: 3.0,
      anim3: 'chop',
      holdLabel: 'Keil antreiben …',
      start: () => {
        rec.cut.wedge = 0.2;
        syncCuts(rec);
        sawIdle();
      },
      work: k => {
        const n = Math.floor(k * 4);
        if (n !== rec._wn) {
          rec._wn = n;
          if (n > 0) {
            if (audio.has('wedge_hit')) audio.at('wedge_hit', P.x, P.y, { vol: 1, ref: 10 });
            else SFX.clunk();
          }
        }
        rec.cut.wedge = 0.2 + k * 0.8;
        syncCuts(rec);
      },
      cancel: () => {},
      run: () => {
        rec.cut.wedge = 1;
        rec.st = 'call2';
        syncCuts(rec);
        CLOCK.t += 1;
        changed();
        think('Keil sitzt. Noch einmal Rundumblick und Warnruf, dann das Stützband.', 4200);
      },
    });
  }
  function doBand(rec) {
    if (!gearOk() || !sawEnsure()) return;
    sawStart(() =>
      PLAY.run({
        id: 'fell:band',
        r: 2.6,
        rMove: 1.2,
        pos: () => trunkPos(rec),
        label: () => 'Stützband durchtrennen',
        hold: 1.4,
        anim3: 'interactLoop',
        holdLabel: 'Band durchtrennen …',
        start: () => {
          SAW.load = 1;
        },
        cancel: () => {
          SAW.load = 0;
        },
        run: () => {
          SAW.load = 0;
          rec.cut.band = 1;
          syncCuts(rec);
          startFall(rec, false);
        },
      })
    );
  }
  function note(rec, txt) {
    if (!rec.notes.includes(txt)) rec.notes.push(txt);
  }
  // ---------------- the fall ----------------
  // the outcome of the cuts: deviation (°), split, sliding back, sitting back
  function outcome(rec) {
    const t = treeOf(rec),
      G = geomOf(t, rec.p),
      D = G.D,
      q = rec.q || {},
      ln = leanOf(t);
    const qd = 1 - clamp(Math.abs(rec.p.d / D - 0.27) / 0.12, 0, 1),
      qh = 1 - clamp(Math.abs(rec.p.T / D - 0.1) / 0.07, 0, 1),
      qc = q.chord ?? 1,
      qa = rec.p.ang >= 45 && rec.p.ang <= 60 ? 1 : 0.6;
    const ctrl = clamp(qh * (0.55 + 0.45 * qd) * qc * qa, 0, 1),
      side = Math.sin((ln.az - rec.az) * D2R) * ln.deg,
      rnd = hash(t.id, 9) - 0.5;
    const dev = clamp(side * (1 - ctrl) * 3.2 + rnd * (1 - ctrl) * 10, -16, 16);
    const split = t.sp !== 'beech' && !rec.cut.splint && (rec.p.ang < 45 || rec.p.T > D / 7);
    const slide = rec.p.step < 0.02,
      back = Math.cos((ln.az - rec.az) * D2R) < -0.35 && !rec.cut.wedge;
    return { dev, split, slide, back, ctrl };
  }
  // where the stem comes to rest: the angle at which it touches the ground along the felling line (lying on its branches)
  function landing(t, az, dev) {
    const a = az + dev,
      fx = Math.sin(a * D2R),
      fy = Math.cos(a * D2R),
      z0 = t.z;
    let th = Math.PI / 2;
    for (let deg = 50; deg <= 115; deg += 0.5) {
      const th1 = deg * D2R;
      let touch = false;
      for (let s = 2; s < t.h; s += 1) {
        const x = t.x + fx * s * Math.sin(th1),
          y = t.y + fy * s * Math.sin(th1),
          z = z0 + 0.3 + s * Math.cos(th1),
          lift = s > t.h * 0.45 ? 0.45 : 0.15;
        if (z < ground(x, y) + FOREST.trunkR(t, s) + lift) {
          touch = true;
          break;
        }
      }
      if (touch) {
        th = th1;
        break;
      }
    }
    return th;
  }
  const FALLS = [];
  function startFall(rec, early) {
    const r = ensureSolo(rec),
      t = treeOf(rec),
      G = geomOf(t, rec.p),
      out = outcome(rec);
    rec.out = out;
    rec.st = 'falling';
    sawIdle();
    if (early) note(rec, 'Stützband riss vorzeitig – der Baum ging, bevor alles bereit war');
    // stump and stem become two parts of the foot; the pivot sits on the hinge
    splitFoot(rec);
    const az = rec.az + out.dev,
      th1 = landing(t, rec.az, out.dev);
    rec.pose = { dev: out.dev, th: th1 };
    r.pivot.position.set((G.xS + G.xH) / 2, (rec.p.hS + G.hB) / 2, 0);
    r.stem.position.set(-r.pivot.position.x, -r.pivot.position.y, 0);
    // pendulum of a rod hinged at its foot: θ'' = 3g / (2L) · sin θ (slowed a little by the crown); first the wedge lifts it a hair
    const F = {
      rec,
      th: 0.02,
      w: 0,
      k: ((1.5 * 9.81) / t.h) * 0.82,
      th1,
      landed: false,
      t: 0,
      bounce: 0,
      done: false,
      sndAt: null,
    };
    // when will it land? (the crash sound's impact sits 2.35 s into the file)
    {
      let th = 0.02,
        w = 0,
        tt = 0;
      while (th < th1 && tt < 20) {
        w += F.k * Math.sin(th) * 0.01;
        th += w * 0.01;
        tt += 0.01;
      }
      F.tLand = tt;
    }
    if (audio.has('tree_crack')) audio.at('tree_crack', t.x, t.y, { vol: 1.2, ref: 18 });
    F.sndAt = Math.max(0.05, F.tLand - 2.35);
    FALLS.push(F);
    // away on the retreat (the side away from the stem's fall), watching the crown
    retreat(rec);
    changed();
  }
  function splitFoot(rec) {
    const r = RT[rec.id];
    if (!r || r.parts) return;
    const t = r.t,
      G = geomOf(t, rec.p);
    const stM = footMat(t, 2, r.U),
      sm = new THREE.Mesh(r.footGeo, stM);
    sm.castShadow = true;
    sm.receiveShadow = true;
    r.stem.add(sm);
    r.foot.material.userData.U.uC3.value.x = 1;
    r.parts = { stem: sm };
    r.stumpCaps = capsOf(t, rec.p, G, { sole: true, hinge: 1, back: 1 });
    r.F.add(r.stumpCaps);
    if (r.caps) {
      r.F.remove(r.caps);
      r.caps = null;
    }
    const sc = capsOf(t, rec.p, G, { roof: true, hinge: -1, back: -1 });
    r.stem.add(sc);
    r.stemCaps = sc;
    if (r.wedge) {
      r.F.add(r.wedge);
    }
    syncCuts(rec);
  }
  function retreat(rec) {
    const t = treeOf(rec),
      s = (P.x - t.x) * Math.cos(rec.az * D2R) - (P.y - t.y) * Math.sin(rec.az * D2R) >= 0 ? 1 : -1,
      a = (rec.az + 180 + s * 45) * D2R;
    const x0 = P.x,
      y0 = P.y,
      x1 = t.x + Math.sin(a) * 6.5,
      y1 = t.y + Math.cos(a) * 6.5;
    ANIM.push({
      dur: 2.0,
      f: k => {
        const e = k * (2 - k);
        P.x = lerp(x0, x1, e);
        P.y = lerp(y0, y1, e);
        P.feet = ground(P.x, P.y);
        const tx = t.x + Math.sin(rec.az * D2R) * t.h * 0.5,
          ty = t.y + Math.cos(rec.az * D2R) * t.h * 0.5;
        P.yaw = Math.atan2(tx - P.x, ty - P.y) / D2R;
        P.pitch = 18 * (1 - k) + 6;
      },
    });
  }
  function fallTick(dt) {
    for (let i = FALLS.length - 1; i >= 0; i--) {
      const F = FALLS[i],
        rec = F.rec,
        r = RT[rec.id];
      if (!r) {
        FALLS.splice(i, 1);
        continue;
      }
      F.t += dt;
      if (F.sndAt != null && F.t >= F.sndAt) {
        F.sndAt = null;
        if (audio.has('tree_fall')) {
          const t = treeOf(rec);
          audio.at('tree_fall', t.x + Math.sin(rec.az * D2R) * t.h * 0.5, t.y + Math.cos(rec.az * D2R) * t.h * 0.5, {
            vol: 1.5,
            ref: 25,
          });
        }
      }
      if (!F.landed) {
        F.w += F.k * Math.sin(F.th) * dt;
        F.th += F.w * dt;
        if (F.th >= F.th1) {
          F.th = F.th1;
          F.landed = true;
          F.w = -F.w * 0.18;
          F.bt = 0;
          dust(rec);
        }
      } else {
        F.bt += dt;
        F.th = F.th1 - Math.abs(Math.sin(F.bt * 9)) * Math.exp(-F.bt * 6) * 0.06;
        if (F.bt > 1.0) {
          F.th = F.th1;
          F.done = true;
        }
      }
      r.pivot.rotation.z = -F.th;
      r.pivot.rotation.y = -(rec.out ? rec.out.dev : 0) * D2R * THREE.MathUtils.smoothstep(F.th, 0.1, F.th1 * 0.6);
      markDirty(true);
      if (F.done) {
        FALLS.splice(i, 1);
        settle(rec);
      }
    }
  }
  // after the fall: the butt slides off the stump to the ground
  function settle(rec) {
    const r = RT[rec.id],
      t = r.t,
      G = geomOf(t, rec.p),
      out = rec.out || {};
    const p0 = r.pivot.position.clone(),
      dx = out.slide ? -0.6 : 0.35,
      dy = -rec.p.hS * 0.85;
    rec.pose.dx = dx;
    rec.pose.dy = dy;
    ANIM.push({
      dur: 0.45,
      f: k => {
        const e = k * k;
        r.pivot.position.set(p0.x + dx * e, p0.y + dy * e, p0.z);
        markDirty(true);
      },
      done: () => {
        rec.st = 'down';
        changed();
        const notes = [];
        if (out.split)
          notes.push(
            'Der Stamm ist beim Fallen aufgerissen (ohne Splintschnitte/zu spitzer Kerb) – das Erdstück taugt nur noch für Brennholz.'
          );
        if (Math.abs(out.dev) > 6)
          notes.push(
            `Er fiel ${de(Math.abs(out.dev), 0)}° ${out.dev > 0 ? 'rechts' : 'links'} neben die Fallrichtung.`
          );
        else notes.push('Genau in die Fallrichtung.');
        if (out.slide) notes.push('Ohne Bruchstufe ist der Stamm über den Stock zurückgerutscht – gefährlich!');
        think('Liegt! ' + notes.join(' ') + ' Erst die Krone beobachten, dann zum Stamm: entasten.', 8000);
        stars(rec);
        bookRefresh();
      },
    });
  }
  // needles and dust where the crown hit
  const PTS = [];
  let PGEO = null,
    PMESH = null;
  function dust(rec) {
    const t = treeOf(rec),
      a = (rec.az + (rec.out ? rec.out.dev : 0)) * D2R;
    for (let k = 0; k < 160; k++) {
      const s = t.h * (0.35 + 0.65 * Math.random()),
        x = t.x + Math.sin(a) * s + (Math.random() - 0.5) * 4,
        y = t.y + Math.cos(a) * s + (Math.random() - 0.5) * 4;
      PTS.push({
        x,
        y,
        z: ground(x, y) + 0.3 + Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 1.6,
        vy: (Math.random() - 0.5) * 1.6,
        vz: 1.2 + Math.random() * 2.5,
        t: 0,
        life: 1.2 + Math.random() * 1.6,
      });
    }
  }
  function ptsTick(dt) {
    if (!PTS.length) {
      if (PMESH) PMESH.visible = false;
      return;
    }
    if (!PMESH) {
      PGEO = new THREE.BufferGeometry();
      PGEO.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 600), 3));
      PMESH = new THREE.Points(
        PGEO,
        new THREE.PointsMaterial({ color: 0x6b5a3e, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false })
      );
      PMESH.frustumCulled = false;
      scene.add(PMESH);
    }
    const a = PGEO.attributes.position;
    let n = 0;
    for (let i = PTS.length - 1; i >= 0; i--) {
      const q = PTS[i];
      q.t += dt;
      if (q.t > q.life) {
        PTS.splice(i, 1);
        continue;
      }
      q.vz -= 6 * dt;
      q.vx *= 0.97;
      q.vy *= 0.97;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z = Math.max(ground(q.x, q.y), q.z + q.vz * dt);
      if (n < 600) {
        const v = V(q.x, q.y, q.z);
        a.setXYZ(n++, v.x, v.y, v.z);
      }
    }
    PGEO.setDrawRange(0, n);
    a.needsUpdate = true;
    PMESH.visible = true;
    markDirty();
  }
  // ---------------- the stem on the ground: points along it ----------------
  // stem axis point s m from the foot (in the frame of the fallen stem) → site coordinates and height
  function stemPoint(rec, s) {
    const r = RT[rec.id];
    if (!r) return null;
    r.F.updateMatrixWorld(true);
    const v = new THREE.Vector3(0, s, 0);
    r.stem.localToWorld(v);
    return [v.x, -v.z, v.y];
  }
  function sideOfStem(rec, s, off) {
    const r = RT[rec.id],
      a = (rec.az + (rec.pose ? rec.pose.dev : 0)) * D2R,
      p = stemPoint(rec, s);
    if (!p) return null;
    return [p[0] + Math.cos(a) * off, p[1] - Math.sin(a) * off, p[2]];
  }
  const zopfY = t => {
    for (let y = 2; y < t.h; y += 0.25) if (FOREST.trunkR(t, y) * 2 < 0.14) return y;
    return t.h * 0.8;
  };
  function crownBase(t) {
    const sp = FOREST.spec(t.sp),
      Md = FOREST.model(t.m);
    return t.h * (t.m != null && FOREST.variant(t.m)[1] === 'edge' ? sp.cb * 0.42 : sp.cb);
  }
  // ---------------- delimbing: section by section from the foot to the top ----------------
  function delimbSecs(rec) {
    const t = treeOf(rec),
      zy = zopfY(t),
      n = Math.max(3, Math.ceil((zy - 1.5) / 3));
    return { n, len: (zy - 1.5) / n, zy };
  }
  function doDelimb(rec) {
    if (!gearOk() || !sawEnsure()) return;
    const D = delimbSecs(rec),
      k = rec.delimb || 0;
    sawStart(() =>
      PLAY.run({
        id: 'fell:delimb',
        r: 3.0,
        rMove: 1.6,
        pos: () => stemPoint(rec, 1.5 + (k + 0.5) * D.len),
        label: () => `Entasten ${k + 1}/${D.n}`,
        hold: 2.2,
        anim3: 'interactLoop',
        holdLabel: 'Äste am Stamm absägen …',
        start: () => {
          SAW.load = 1;
        },
        cancel: () => {
          SAW.load = 0;
        },
        run: () => {
          SAW.load = 0;
          rec.delimb = k + 1;
          applyDelimb(rec);
          slash(rec, 1.5 + k * D.len, 1.5 + (k + 1) * D.len);
          CLOCK.t += 3;
          if (rec.delimb >= D.n) {
            rec.st = 'trim';
            think('Bis zum Zopf entastet. Jetzt den Stammfuß mit dem Fallkerb gerade abschneiden.', 4800);
          }
          changed();
        },
      })
    );
  }
  function applyDelimb(rec) {
    const r = RT[rec.id];
    if (!r) return;
    const D = delimbSecs(rec),
      y = 1.5 + (rec.delimb || 0) * D.len;
    r.Us.uDelimb.value = (rec.delimb || 0) >= D.n ? (D.zy + 0.4) / r.t.h : y / r.t.h;
    markDirty(true);
  }
  // the cut branches: their cards, flattened onto the ground beside the stem (brash)
  function slash(rec, y0, y1) {
    const r = RT[rec.id];
    if (!r) return;
    const cg = r.Md.cards,
      pos = cg.attributes.position,
      ah = cg.attributes.aH,
      idx = cg.index.array,
      s0 = y0 / r.t.h,
      s1 = y1 / r.t.h;
    const p = [],
      uv = [],
      c = [],
      h = [],
      ii = [],
      m = new THREE.Matrix4();
    r.mg.updateMatrixWorld(true);
    m.copy(r.mg.matrixWorld);
    const v = new THREE.Vector3(),
      rnd = mulberry(rec.id * 7 + Math.round(y0 * 10));
    const map = new Map();
    const keep = new Set();
    for (let i = 0; i < idx.length; i += 3) {
      const a = ah.getX(idx[i]);
      if (a >= s0 && a < s1) for (let k = 0; k < 3; k++) keep.add(idx[i + k]);
    }
    for (const vi of keep) {
      v.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi)).applyMatrix4(m);
      const sx = v.x,
        sy = -v.z,
        gz = ground(sx, sy);
      const z = gz + 0.05 + Math.min(0.6, Math.max(0, v.y - gz) * 0.12) + rnd() * 0.1;
      map.set(vi, p.length / 3);
      const w = V(sx, sy, z);
      p.push(w.x, w.y, w.z);
      uv.push(cg.attributes.uv.getX(vi), cg.attributes.uv.getY(vi));
      c.push(
        cg.attributes.color.getX(vi) * 0.62,
        cg.attributes.color.getY(vi) * 0.58,
        cg.attributes.color.getZ(vi) * 0.5
      );
      h.push(1);
    } // brash on the ground: darker, a little browner
    for (let i = 0; i < idx.length; i += 3) {
      const a = map.get(idx[i]),
        b = map.get(idx[i + 1]),
        cc = map.get(idx[i + 2]);
      if (a != null && b != null && cc != null) ii.push(a, b, cc);
    }
    if (!ii.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(h, 1));
    g.setIndex(ii);
    g.computeVertexNormals();
    const mats = FOREST.soloMats(r.t.sp, { uCut: { value: -10 }, uDelimb: { value: -1 } }),
      me = new THREE.Mesh(g, mats.cards);
    me.receiveShadow = true;
    me.userData.noMerge = true;
    scene.add(me);
    (r.slash = r.slash || []).push(me);
    markDirty(true);
  }
  // ---------------- trimming the butt, the top, bucking into logs ----------------
  function doTrim(rec) {
    if (!gearOk() || !sawEnsure()) return;
    const t = treeOf(rec),
      G = geomOf(t, rec.p);
    sawStart(() =>
      PLAY.run({
        id: 'fell:trim',
        r: 3,
        rMove: 1.6,
        pos: () => stemPoint(rec, 0.6),
        label: () => 'Stammfuß kappen',
        hold: 2.0,
        anim3: 'kneelIdle',
        holdLabel: 'Gerade abschneiden …',
        start: () => {
          SAW.load = 1;
        },
        cancel: () => {
          SAW.load = 0;
        },
        run: () => {
          SAW.load = 0;
          rec.trim = rec.p.hS + G.d * G.tA + 0.06;
          rec.st = 'top';
          buildLogs(rec);
          detachButt(rec, true);
          CLOCK.t += 2;
          changed();
          think('Stammfuß gekappt. Jetzt den Zopf bei etwa 14 cm Durchmesser abtrennen.', 4500);
        },
      })
    );
  }
  // the trimmed butt with the notch rolls a little aside (it is firewood)
  function detachButt(rec, anim) {
    const r = RT[rec.id];
    if (!r || !r.parts || r.butt) return;
    r.F.updateMatrixWorld(true);
    const b = new THREE.Group();
    b.userData.noMerge = true;
    scene.add(b);
    b.attach(r.parts.stem);
    if (r.stemCaps) b.attach(r.stemCaps);
    r.butt = b;
    const a = (rec.az + (rec.pose ? rec.pose.dev : 0)) * D2R,
      off = V(Math.cos(a) * 0.45, -Math.sin(a) * 0.45, -0.12);
    if (anim)
      ANIM.push({
        dur: 0.5,
        f: k => {
          b.position.copy(off).multiplyScalar(k * k);
        },
      });
    else b.position.copy(off);
    markDirty(true);
  }
  function doTop(rec) {
    if (!gearOk() || !sawEnsure()) return;
    const t = treeOf(rec),
      zy = zopfY(t);
    sawStart(() =>
      PLAY.run({
        id: 'fell:top',
        r: 3,
        rMove: 1.6,
        pos: () => stemPoint(rec, zy),
        label: () => 'Zopf abtrennen',
        hold: 1.6,
        anim3: 'interactLoop',
        holdLabel: 'Gipfel absägen …',
        start: () => {
          SAW.load = 1;
        },
        cancel: () => {
          SAW.load = 0;
        },
        run: () => {
          SAW.load = 0;
          rec.top = zy;
          rec.st = 'buck';
          buildLogs(rec);
          CLOCK.t += 1;
          changed();
          openBuck(rec);
        },
      })
    );
  }
  // the stem from the trimmed butt to the top as tapered logs with bark and cut faces (drawn in the stem's frame)
  function logGeo(t, Md, sc, th, y0, y1) {
    const NS = 32,
      ys = [];
    const n = Math.max(2, Math.ceil((y1 - y0) / 0.25));
    for (let i = 0; i <= n; i++) ys.push(lerp(y0, y1, i / n));
    const p = [],
      nn = [],
      uv = [],
      c = [],
      h = [],
      idx = [],
      circ = 2 * Math.PI * Md.rb,
      bt = Md.bt;
    for (const y of ys) {
      const r = FOREST.trunkR(t, y);
      for (let j = 0; j <= NS; j++) {
        const am = (j / NS) * Math.PI * 2,
          a = am - th,
          ca = Math.cos(a),
          sa = Math.sin(a);
        p.push(ca * r, y, sa * r);
        nn.push(ca, 0.02, sa);
        uv.push(((j / NS) * circ) / Md.tile, y / sc.s / Md.tile);
        c.push(bt[0], bt[1], bt[2]);
        h.push(0);
      }
    }
    for (let i = 0; i < ys.length - 1; i++)
      for (let j = 0; j < NS; j++) {
        const a = i * (NS + 1) + j,
          b = a + NS + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(h, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  function logMesh(t, y0, y1, gap) {
    const Md = FOREST.model(t.m),
      sc = FOREST.scaleOf(t),
      r = RT[t.id],
      th = r ? r.th : 0,
      g = new THREE.Group();
    const B = FOREST.barkMap(t.sp),
      m = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        map: B && B.map,
        normalMap: B && B.nrm,
        roughnessMap: B && B.orm,
        roughness: 1,
        envMapIntensity: 0.55,
      });
    const me = new THREE.Mesh(logGeo(t, Md, sc, th, y0, y1), m);
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
    const R0 = FOREST.trunkR(t, y0),
      R1 = FOREST.trunkR(t, y1),
      M = endGrain(t.sp);
    for (const [y, R, nY] of [
      [y0, R0, -1],
      [y1, R1, 1],
    ]) {
      const pts = [];
      for (let k = 0; k <= 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        pts.push([Math.cos(a) * R, y, Math.sin(a) * R]);
      }
      const cap = new THREE.Mesh(fan([0, y, 0], pts, [0, nY, 0], R), M);
      cap.castShadow = true;
      g.add(cap);
    }
    g.userData.noMerge = true;
    return g;
  }
  function buildLogs(rec) {
    const r = RT[rec.id];
    if (!r) return;
    const t = r.t;
    if (r.logG) {
      r.stem.remove(r.logG);
      r.logG = null;
    }
    const y0 = rec.trim || 0,
      y1 = rec.top || zopfY(t) + 0.01,
      cuts = [y0, ...(rec.cuts || []).slice(0, rec.cutDone || 0).filter(c => c > y0 && c < y1), y1],
      g = new THREE.Group();
    for (let i = 0; i < cuts.length - 1; i++) {
      const lg = logMesh(t, cuts[i] + (i ? 0.004 : 0), cuts[i + 1] - 0.004);
      lg.position.y = i * 0.03;
      g.add(lg);
    }
    r.logG = g;
    r.stem.add(g);
    // the model's trunk below the top is now the logs; the foot (with the notch) lies as the trimmed piece
    r.Us.uCut.value = y1 / r.sc.s;
    if (r.parts && rec.trim) r.parts.stem.material.userData.U.uC3.value.w = rec.trim;
    markDirty(true);
  }
  // bucking: lengths for the band saw at the workshop (4 m and 2.5 m, 10 cm over), the rest stays as firewood
  function openBuck(rec) {
    const t = treeOf(rec),
      L = (rec.top || zopfY(t)) - (rec.trim || 0);
    WUI.machine({
      title: 'Ablängen',
      sub: `Stamm ${de(L, 1)} m vom gekappten Fuß bis zum Zopf`,
      info: 'Für die Blockbandsäge an der Werkstatt: Abschnitte 4 m oder 2,5 m, jeweils 10 cm Übermaß (4,10 m / 2,60 m). Was übrig bleibt, wird Brennholz. Beim Trennschnitt zuerst in die Druckseite sägen (ein Drittel), dann von der Zugseite trennen – sonst klemmt die Säge.',
      choices: [
        {
          k: 'plan',
          label: 'Aufteilung',
          val: 'mix',
          opts: [
            ['4', '4,10 m-Abschnitte'],
            ['mix', '4,10 m, Rest 2,60 m'],
            ['25', '2,60 m-Abschnitte'],
          ],
        },
      ],
      go: 'Markieren',
      onGo: v => {
        const Ls = [];
        let rest = L;
        const A = v.plan === '25' ? [2.6] : [4.1];
        while (rest >= A[0] - 1e-6) {
          Ls.push(A[0]);
          rest -= A[0];
        }
        if (v.plan === 'mix' && rest >= 2.6) {
          Ls.push(2.6);
          rest -= 2.6;
        }
        rec.plan = Ls;
        rec.cuts = [];
        let y = rec.trim || 0;
        for (const l of Ls) {
          y += l;
          if (y < (rec.top || zopfY(t)) - 0.05) rec.cuts.push(+y.toFixed(3));
        }
        rec.cutDone = 0;
        changed();
        buildMarksOnStem(rec);
        think(
          `${Ls.length} Abschnitte markiert (${Ls.map(l => de(l, 2)).join(' + ')} m), Rest ${de(rest, 1)} m Brennholz. Jetzt die Trennschnitte.`,
          5200
        );
      },
    });
  }
  let STEMMARK = null;
  function buildMarksOnStem(rec) {
    const r = RT[rec.id];
    if (!r) return;
    if (STEMMARK) {
      STEMMARK.parent && STEMMARK.parent.remove(STEMMARK);
      STEMMARK = null;
    }
    const g = new THREE.Group();
    for (const y of rec.cuts || []) {
      const R = FOREST.trunkR(r.t, y) + 0.004,
        ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 4, 24), MT.paint);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    }
    STEMMARK = g;
    r.stem.add(g);
    markDirty(true);
  }
  // compression side: a stem bridging a hollow sags (top in compression), one resting on a bump hangs at both ends (bottom in compression)
  function pressSide(rec, y) {
    const a = stemPoint(rec, Math.max(0.3, y - 2.2)),
      b = stemPoint(rec, y),
      c = stemPoint(rec, y + 2.2);
    if (!a || !b || !c) return 'oben';
    const gb = ground(b[0], b[1]),
      mid = (ground(a[0], a[1]) + ground(c[0], c[1])) / 2;
    return gb < mid - 0.04 ? 'oben' : gb > mid + 0.04 ? 'unten' : 'oben';
  }
  function doCut(rec) {
    const i = rec.cutDone || 0,
      y = rec.cuts[i],
      side = pressSide(rec, y);
    WUI.machine({
      title: `Trennschnitt bei ${de(y - (rec.trim || 0), 2)} m`,
      sub: 'Wo liegt die Druckseite?',
      choices: [
        {
          k: 'side',
          label: 'Zuerst einsägen',
          val: 'oben',
          opts: [
            ['oben', 'oben (Stamm liegt hohl)'],
            ['unten', 'unten (Stamm liegt auf)'],
          ],
        },
      ],
      info: 'Liegt der Stamm an beiden Enden auf und hängt dazwischen durch, wird er oben gestaucht: oben anfangen. Liegt er in der Mitte auf und die Enden hängen, ist die Druckseite unten. Erst ein Drittel in die Druckseite, dann von der Zugseite trennen.',
      gear: { req: FORST },
      go: 'Sägen',
      onGo: v => {
        if (!gearOk() || !sawEnsure()) return;
        const ok = v.side === side;
        sawStart(() =>
          PLAY.run({
            id: 'fell:cut',
            r: 3,
            rMove: 1.6,
            pos: () => stemPoint(rec, y),
            label: () => 'Trennschnitt',
            hold: ok ? 2.4 : 4.2,
            anim3: 'interactLoop',
            holdLabel: ok ? 'Druckseite, dann Zugseite …' : 'Die Säge klemmt! Keil in den Schnitt …',
            start: () => {
              SAW.load = 1;
              if (!ok)
                setTimeout(
                  () =>
                    think(
                      'Falsche Seite zuerst: der Schnitt schließt sich und klemmt die Kette. Mit dem Keil aufweiten und von der anderen Seite fertig sägen.',
                      5000
                    ),
                  900
                );
            },
            cancel: () => {
              SAW.load = 0;
            },
            run: () => {
              SAW.load = 0;
              if (!ok) note(rec, 'Beim Ablängen die Säge eingeklemmt (Druckseite verwechselt)');
              rec.cutDone = i + 1;
              buildLogs(rec);
              CLOCK.t += ok ? 2 : 5;
              if (rec.cutDone >= rec.cuts.length) {
                rec.st = 'measure';
                think('Alle Abschnitte getrennt. Jetzt vermessen: Kluppe und Maßband.', 4200);
              }
              changed();
            },
          })
        );
      },
    });
  }
  // measuring: middle diameter (calliper twice across, whole cm), length, volume after Huber
  function doMeasure(rec) {
    PLAY.run({
      id: 'fell:measure',
      r: 3,
      rMove: 1.6,
      pos: () => stemPoint(rec, ((rec.trim || 0) + (rec.top || 8)) / 2),
      label: () => 'Abschnitte vermessen (Kluppe, Maßband)',
      hold: 2.6,
      anim3: 'kneelIdle',
      holdLabel: 'Messen …',
      run: () => {
        const t = treeOf(rec),
          cuts = [rec.trim || 0, ...(rec.cuts || []), rec.top || zopfY(t)],
          out = rec.out || {};
        for (let i = 0; i < cuts.length - 1; i++) {
          const y0 = cuts[i],
            y1 = cuts[i + 1],
            L = y1 - y0,
            dm = Math.floor(2 * FOREST.trunkR(t, (y0 + y1) / 2) * 100),
            vol = (Math.PI / 4) * (dm / 100) ** 2 * L;
          const q = i === 0 && out.split ? 'C' : i === 0 ? 'A' : dm >= 25 ? 'B' : 'C';
          S.logs.push({
            id: 'L' + ++S.n,
            tid: t.id,
            sp: t.sp,
            i,
            y0,
            y1,
            L: +L.toFixed(2),
            d0: Math.round(2 * FOREST.trunkR(t, y0) * 100),
            d1: Math.round(2 * FOREST.trunkR(t, y1) * 100),
            dm,
            vol: +vol.toFixed(3),
            q,
            where: 'wald',
            at: logWorld(rec, y0, y1),
          });
        }
        rec.st = 'done';
        rec.t1 = CLOCK.t;
        stars(rec);
        CLOCK.t += 3;
        changed();
        const n = cuts.length - 1,
          V0 = S.logs.filter(l => l.tid === t.id).reduce((s, l) => s + l.vol, 0);
        if (window.QUESTS && QUESTS.banner)
          QUESTS.banner(
            'Baum aufgearbeitet',
            `${SPN[t.sp]}: ${n} Abschnitte, ${de(V0, 2)} Fm · ${'★'.repeat(rec.stars)}${'☆'.repeat(5 - rec.stars)}`
          );
        SFX.chime();
        bookRefresh();
        S.job = null;
        showMarks(null, false);
        save();
      },
    });
  }
  // where a log lies in the world (for the next steps: skidding, the band saw – V16d)
  function logWorld(rec, y0, y1) {
    const a = stemPoint(rec, y0),
      b = stemPoint(rec, y1);
    return a && b
      ? {
          x0: +a[0].toFixed(2),
          y0: +a[1].toFixed(2),
          z0: +a[2].toFixed(2),
          x1: +b[0].toFixed(2),
          y1: +b[1].toFixed(2),
          z1: +b[2].toFixed(2),
        }
      : null;
  }
  // ---------------- stars: five, minus what went wrong ----------------
  function stars(rec) {
    let s = 5;
    const n = rec.notes.length,
      out = rec.out || {};
    s -= Math.min(3, n * 0.75);
    if (out.split) s -= 1;
    if (out.slide) s -= 1;
    if (Math.abs(out.dev || 0) > 8) s -= 0.5;
    rec.stars = clamp(Math.round(s), 1, 5);
    return rec.stars;
  }
  // ---------------- the next step at the tree under work, and choosing a tree ----------------
  function nextOp(rec) {
    const t = treeOf(rec);
    switch (rec.st) {
      case 'plan':
        return { label: 'Baum ansprechen, Fallrichtung wählen', where: 'front', run: () => openPlan(rec) };
      case 'retreat':
        return {
          label: 'Rückweiche freimachen',
          where: 'back',
          hold: 2.2,
          run: () => {
            rec.st = 'sole';
            changed();
            think('Rückweiche frei, Stammfuß frei. Jetzt der Fallkerb: zuerst die Sohle.', 4200);
          },
        };
      case 'sole':
        return { label: 'Fallkerb: Sohlenschnitt', where: 'front', run: () => doSole(rec) };
      case 'roof':
        return { label: 'Fallkerb: Dachschnitt', where: 'front', run: () => doRoof(rec) };
      case 'splint':
        return { label: 'Splintschnitte', where: 'front', run: () => doSplint(rec) };
      case 'call1':
      case 'call2':
        return {
          label: 'Rundumblick und Warnruf',
          where: rec.st === 'call1' ? 'side' : 'left',
          run: () => doCall(rec, rec.st === 'call1' ? 1 : 2),
        };
      case 'back':
        return { label: 'Fällschnitt (Stechschnitt)', where: 'side', run: () => doBack(rec) };
      case 'wedge':
        return { label: 'Fällkeil setzen', where: 'back', run: () => doWedge(rec) };
      case 'band':
        return { label: 'Stützband durchtrennen', where: 'left', run: () => doBand(rec) };
      case 'down':
        return {
          label: 'Entasten beginnen',
          stem: 2.5,
          run: () => {
            rec.st = 'delimb';
            rec.delimb = 0;
            changed();
            doDelimb(rec);
          },
        };
      case 'delimb':
        return {
          label: `Entasten ${(rec.delimb || 0) + 1}/${delimbSecs(rec).n}`,
          stem: 1.5 + ((rec.delimb || 0) + 0.5) * delimbSecs(rec).len,
          run: () => doDelimb(rec),
        };
      case 'trim':
        return { label: 'Stammfuß kappen', stem: 0.6, run: () => doTrim(rec) };
      case 'top':
        return { label: 'Zopf abtrennen', stem: zopfY(t), run: () => doTop(rec) };
      case 'buck':
        return rec.cuts && rec.cuts.length && (rec.cutDone || 0) < rec.cuts.length
          ? { label: 'Trennschnitt', stem: rec.cuts[rec.cutDone || 0], run: () => doCut(rec) }
          : { label: 'Ablängen planen', stem: ((rec.trim || 0) + (rec.top || 8)) / 2, run: () => openBuck(rec) };
      case 'measure':
        return { label: 'Vermessen', stem: ((rec.trim || 0) + (rec.top || 8)) / 2, run: () => doMeasure(rec) };
      default:
        return null;
    }
  }
  function opPos(rec, op) {
    const t = treeOf(rec);
    if (op.stem != null) {
      const p = sideOfStem(rec, op.stem, 1.0);
      return p ? [p[0], p[1], p[2] + 0.3] : [t.x, t.y, t.z + 1];
    }
    const s = standAt(rec, op.where);
    return [s[0], s[1], t.z + 0.9];
  }
  function registerActs() {
    // the next step at the tree under work
    PLAY.act({
      id: 'fell:op',
      r: 2.4,
      prio: 0.4,
      pos: () => {
        const rec = cur();
        if (!rec || rec.st === 'falling' || rec.st === 'done') return null;
        const op = nextOp(rec);
        return op ? opPos(rec, op) : null;
      },
      label: () => {
        const rec = cur();
        if (!rec || rec.st === 'falling') return null;
        const op = nextOp(rec);
        return op ? op.label : null;
      },
      hold: () => {
        const rec = cur(),
          op = rec && nextOp(rec);
        return op && op.hold ? op.hold : 0;
      },
      anim3: 'interactLoop',
      holdLabel: () => {
        const rec = cur(),
          op = rec && nextOp(rec);
        return op ? op.label + ' …' : '';
      },
      run: () => {
        const rec = cur();
        if (!rec) return;
        const op = nextOp(rec);
        if (!op) return;
        if (rec.st !== 'plan' && !gearOk()) return;
        try {
          op.run();
        } catch (e) {
          console.warn('fell', e);
        }
      },
    });
    // choosing a marked tree
    PLAY.act({
      id: 'fell:pick',
      r: 2.2,
      prio: 0.2,
      pos: () => {
        if (S.job != null) return null;
        const t = nearMarked();
        return t ? [t.x, t.y, t.z + 1.2] : null;
      },
      label: () => {
        if (S.job != null) return null;
        const t = nearMarked();
        return t ? `${SPN[t.sp]} fällen (ausgezeichnet, ${de(t.h, 0)} m)` : null;
      },
      run: () => {
        const t = nearMarked();
        if (!t) return;
        if (!GEAR.haveForest) {
          think('Erst die Ausrüstung: Forstkiste am Traktor (Untere Klinge).', 4200);
          return;
        }
        const rec = (S.trees[t.id] = rec0(t));
        S.job = t.id;
        ensureSolo(rec);
        buildMarks();
        changed();
        openPlan(rec);
      },
    });
  }
  function nearMarked() {
    let b = null,
      bd = 2.2;
    for (const t of S.marked) {
      if (t.gone && !(S.trees[t.id] && S.trees[t.id].st === 'plan')) continue;
      if (S.trees[t.id]) continue;
      const d = Math.hypot(t.x - P.x, t.y - P.y);
      if (d < bd) {
        bd = d;
        b = t;
      }
    }
    return b;
  }
  // ---------------- small animations ----------------
  const ANIM = [];
  function animTick(dt) {
    for (let i = ANIM.length - 1; i >= 0; i--) {
      const a = ANIM[i];
      a.t = (a.t || 0) + dt;
      const k = Math.min(1, a.t / a.dur);
      try {
        a.f(k);
      } catch (e) {
        console.warn(e);
      }
      markDirty();
      if (k >= 1) {
        ANIM.splice(i, 1);
        if (a.done) a.done();
      }
    }
  }
  // ---------------- the forest book (B in the forest) and the card ----------------
  const bk = (() => {
    let e = $('waldbuch');
    if (!e) {
      e = document.createElement('aside');
      e.id = 'waldbuch';
      e.hidden = true;
      e.setAttribute('aria-label', 'Waldbuch');
      ($('p-3d') || document.body).appendChild(e);
    }
    return e;
  })();
  const card = (() => {
    let e = $('fellcard');
    if (!e) {
      e = document.createElement('div');
      e.id = 'fellcard';
      e.className = 'ov';
      e.hidden = true;
      ($('p-3d') || document.body).appendChild(e);
    }
    return e;
  })();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // the nearest marked tree still standing: distance and compass direction from where one stands (or sits in the tractor)
  const DIRS = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  function nextMarked() {
    const me = VEH.cur ? [VEH.cur.st.x, VEH.cur.st.y] : [P.x, P.y];
    let best = null,
      bd = 1e9;
    for (const t of S.marked) {
      const r = S.trees[t.id];
      if (r && ORDER.indexOf(r.st) >= ORDER.indexOf('falling')) continue;
      const d = Math.hypot(t.x - me[0], t.y - me[1]);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    if (!best) return ' Alle markierten Bäume sind gefällt.';
    const az = ((Math.atan2(best.x - me[0], best.y - me[1]) * 180) / Math.PI + 360) % 360;
    return bd < 4
      ? ` Ein markierter Baum steht direkt hier (${SPN[best.sp] || 'Baum'}).`
      : ` Nächster markierter Baum: <b>${Math.round(bd)} m Richtung ${DIRS[Math.round(az / 45) % 8]}</b> (${SPN[best.sp] || 'Baum'}, oranger Schrägstrich in Brusthöhe).`;
  }
  function book(v) {
    S.bookOpen = v === undefined ? !S.bookOpen : !!v;
    bk.hidden = !S.bookOpen;
    if (S.bookOpen) {
      if (window.HUD) HUD.unlock();
      renderBook();
    }
  }
  function renderBook() {
    if (bk.hidden) return;
    const rec = cur(),
      ord = rec ? ORDER.indexOf(rec.st) : -1;
    let h =
      '<h3>Waldbuch<button type="button" class="x" aria-label="Schließen">×</button></h3><p class="bk-i">Fällen nach Profi-Art im Familienwald an der Klinge. Die Bäume mit dem orangen Strich hat der Förster ausgezeichnet. ' +
      (rec
        ? `Jetzt: <b>${SPN[rec.sp]}, ${de(rec.h, 0)} m</b>.`
        : 'Zum Anfangen: Forstkiste am Traktor, dann zu einem markierten Baum.') +
      nextMarked() +
      '</p><ol class="bk">';
    for (const [k, t, d] of BOOK) {
      const i = ORDER.indexOf(k),
        st =
          k === 'kit'
            ? GEAR.haveForest
              ? 'ok'
              : ''
            : !rec
              ? ''
              : i < ord
                ? 'ok'
                : i === ord || (k === 'call1' && rec.st === 'call2')
                  ? 'cur'
                  : '';
      h += `<li class="${st}"><b>${esc(t)}</b><span>${esc(d)}</span></li>`;
    }
    h += '</ol>';
    const done = Object.values(S.trees).filter(r => r.st === 'done');
    if (done.length)
      h +=
        '<h4>Gefällte Bäume</h4><ul class="bk-f">' +
        done
          .map(
            r =>
              `<li><b>${SPN[r.sp]} ${de(r.h, 0)} m</b> ${'★'.repeat(r.stars || 0)}${'☆'.repeat(5 - (r.stars || 0))}<span>${esc(r.notes.length ? r.notes.join('; ') : 'saubere Arbeit')}</span></li>`
          )
          .join('') +
        '</ul>';
    if (S.logs.length) {
      const tot = S.logs.reduce((s, l) => s + l.vol, 0);
      h +=
        `<h4>Holzliste (${S.logs.length} Abschnitte, ${de(tot, 2)} Fm)</h4><table class="hl"><tr><th>Nr.</th><th>Art</th><th>Länge</th><th>Ø Mitte</th><th>Fm</th><th>Güte</th></tr>` +
        S.logs
          .map(
            l =>
              `<tr><td>${l.id}</td><td>${SPN[l.sp]}</td><td>${de(l.L, 2)} m</td><td>${l.dm} cm</td><td>${de(l.vol, 3)}</td><td>${l.q}</td></tr>`
          )
          .join('') +
        '</table>';
    }
    h +=
      '<p class="bk-n">Quellen: DGUV Information 214-046 „Sichere Waldarbeiten“, SVLFG/BBV „Sicherheitsfälltechnik“, Bayerische Staatsforsten „Sicher Holz machen“.</p>';
    bk.innerHTML = h;
    bk.querySelector('.x').addEventListener('click', () => book(false));
  }
  function bookRefresh() {
    if (!bk.hidden) renderBook();
    renderCard(true);
  }
  let lastCard = '';
  function renderCard(force) {
    const rec = cur();
    let show = !!rec && P.mode === 'walk' && !(window.HUD && HUD.open);
    if (show) {
      const t = treeOf(rec);
      show = Math.hypot(t.x - P.x, t.y - P.y) < 40;
    }
    if (!show) {
      if (!card.hidden) {
        card.hidden = true;
        lastCard = '';
      }
      return;
    }
    const op = nextOp(rec),
      t = treeOf(rec),
      G = geomOf(t, rec.p);
    const h =
      `<div class="wc-t"><b>${SPN[t.sp]} · ${de(t.h, 0)} m · BHD ${cmS(2 * FOREST.trunkR(t, 1.3))}</b></div><div class="wc-d">Fallrichtung ${rec.az}° · Stock Ø ${cmS(G.D)}</div>` +
      (op ? `<div class="wc-n"><span>Nächster Schritt</span>${esc(op.label)}</div>` : '') +
      `<button type="button" class="wc-b">Waldbuch${COARSE ? '' : ' · B'}</button>`;
    if (!force && h === lastCard && !card.hidden) return;
    lastCard = h;
    card.innerHTML = h;
    card.hidden = false;
    card.querySelector('.wc-b').addEventListener('click', () => book(true));
  }
  // ---------------- saving ----------------
  function changed() {
    save();
    bookRefresh();
  }
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        localStorage.setItem(
          LSK,
          JSON.stringify({
            v: 1,
            kit: S.kit,
            job: S.job,
            n: S.n,
            trees: Object.values(S.trees).map(r => {
              const o = {};
              for (const [k, v] of Object.entries(r)) if (k[0] !== '_') o[k] = v;
              return o;
            }),
            logs: S.logs,
          })
        );
      } catch (e) {}
    }, 400);
  }
  function load() {
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(LSK) || 'null');
    } catch (e) {}
    if (!s || s.v !== 1) return;
    S.kit = !!s.kit;
    S.n = s.n || 0;
    S.logs = s.logs || [];
    for (const r of s.trees || []) {
      const t = FOREST.byId(r.id);
      if (!t) continue;
      r.q = r.q || {};
      S.trees[r.id] = r;
    }
    S.job = s.job != null && S.trees[s.job] ? s.job : null;
    for (const r of Object.values(S.trees)) restore(r);
    if (S.kit) {
      const T = mkSaw();
      if (!PLAY.has(T)) PLAY.give(T);
    }
  }
  // rebuild a tree from its record: standing with its cuts, or lying (delimbed, bucked)
  function restore(rec) {
    if (rec.st === 'plan') {
      if (S.job === rec.id) {
        ensureSolo(rec);
      }
      return;
    }
    const r = ensureSolo(rec);
    syncCuts(rec);
    if (['falling', 'down', 'delimb', 'trim', 'top', 'buck', 'measure', 'done'].includes(rec.st)) {
      if (rec.st === 'falling') rec.st = 'down';
      splitFoot(rec);
      const t = r.t,
        G = geomOf(t, rec.p),
        pose = rec.pose || { dev: 0, th: landing(t, rec.az, 0) };
      r.pivot.position.set(
        (G.xS + G.xH) / 2 + (pose.dx || 0.35),
        (rec.p.hS + G.hB) / 2 + (pose.dy ?? -rec.p.hS * 0.85),
        0
      );
      r.stem.position.set(-(G.xS + G.xH) / 2, -(rec.p.hS + G.hB) / 2, 0);
      r.pivot.rotation.set(0, -(pose.dev || 0) * D2R, -pose.th);
      if (rec.delimb) {
        applyDelimb(rec);
        r.F.updateMatrixWorld(true);
        const D = delimbSecs(rec);
        for (let k = 0; k < rec.delimb; k++) slash(rec, 1.5 + k * D.len, 1.5 + (k + 1) * D.len);
      }
      if (rec.trim || rec.top) {
        buildLogs(rec);
        if (rec.trim) detachButt(rec, false);
      }
      if (rec.cuts && rec.st === 'buck') buildMarksOnStem(rec);
    }
  }
  // ---------------- per frame ----------------
  function tick(dt) {
    if (!S.ready) return;
    animTick(dt);
    fallTick(dt);
    ptsTick(dt);
    sawTick(dt);
  }
  window.TICKS.push(dt => {
    try {
      tick(dt);
    } catch (e) {
      if (!S._err) {
        S._err = 1;
        console.warn('fell', e);
      }
    }
  });
  let cardAcc = 0;
  window.TICKS.push(dt => {
    cardAcc += dt;
    if (cardAcc > 0.5) {
      cardAcc = 0;
      renderCard();
    }
  });
  window.addEventListener(
    'keydown',
    e => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat
      )
        return;
      if ((e.key === 'b' || e.key === 'B') && P.mode === 'walk' && S.bookCtx()) {
        e.stopImmediatePropagation();
        e.preventDefault();
        book();
      }
    },
    true
  );
  S.bookCtx = () =>
    !!(
      S.ready &&
      (S.job != null || (FOREST.amb && FOREST.amb() > 0.3) || (KIT && Math.hypot(P.x - KIT.x, P.y - KIT.y) < 30))
    );
  whenLoaded(() => {
    if (!FOREST.ready || !window.ROADS || !ROADS.ready) return;
    try {
      S.marked = chooseMarked();
      buildKit();
      registerActs();
      mkSaw();
      load();
      buildMarks();
      S.ready = true;
    } catch (e) {
      console.warn('fell', e);
    }
  });
  // first visit of V16c2: a word about felling
  let intro = false;
  window.TICKS.push(() => {
    if (intro || !S.ready || P.mode !== 'walk' || !LOAD.ready) return;
    intro = true;
    let seen = false;
    try {
      seen = localStorage.getItem('pav-v16c2') === '1';
      localStorage.setItem('pav-v16c2', '1');
    } catch (e) {}
    if (!seen)
      setTimeout(
        () =>
          news(
            'Neu: Bäume fällen wie ein Profi. An der Unteren Klinge steht die Forstkiste am Traktor (Helm mit Visier, Schnittschutz, Motorsäge, Keile). Der Förster hat Bäume mit einem orangen Strich markiert: ansprechen, Fallkerb, Fällschnitt mit Halteband, Keil, Warnruf – dann entasten, ablängen, vermessen. B: Waldbuch.',
            14000
          ),
        44000
      );
  });
  // test and tool hooks
  // V16d: werk/holz.js takes over the measured logs as objects of their own – the felled tree's log meshes are then hidden
  S.hideLogs = tid => {
    const r = RT[tid];
    if (r && r.logG && r.logG.visible) {
      r.logG.visible = false;
      markDirty(true);
    }
  };
  Object.assign(S, {
    book,
    rec: cur,
    nextOp,
    openPlan,
    startFall,
    geomOf,
    outcome,
    landing,
    zopfY,
    endGrain,
    sawStart,
    sawStop,
    get saw() {
      return SAW;
    },
    stars,
    kitPos,
    freeDirs,
    leanOf,
    pressSide,
    reset() {
      try {
        localStorage.removeItem(LSK);
      } catch (e) {}
      location.reload();
    },
  });
  return S;
})();
window.FELL = FELL;
