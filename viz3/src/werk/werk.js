// ===================== V15b workshop game (Stufe 2): an end-grain cutting board from oak glued panels – a serious game =====================
// Material from the rack (Leimholz Eiche, 40 × 400 × 1000 mm, durchgehende Lamelle, kiln-dried ~9 %): cut to length and ripped into strips at
// the table saw, glued up on edge (D3 glue with roller or brush, clamps alternately top and bottom, cauls), scraped and thicknessed, cut into
// slices, turned end grain up and glued again, flattened on the drum sander (never through the thickness planer), trimmed, chamfered, sanded
// 80 → 240 with raising the grain, oiled twice, branded. Optional: fuming with ammonia in the tent (Räuchereiche) – it reaches only a few
// millimetres into long grain, far deeper through end grain; sapwood stays light. Every workpiece is a thing: carried, put down, stored in the
// rack, finished ones on the shelf above. All positions are workshop coordinates as built (WT() → where the workshop stands now).
phase(null);
const WERK = (() => {
  const ON = !OFFLINE && !QS.get('noplay');
  const LSK = 'pav-werk-v1';
  const WT = (x, y) => (window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]);
  const WDA = () => ((window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.da : 0) * Math.PI) / 180;
  // a group in the workshop's own frame: what is built into it moves along with the workshop in the plan view
  const WG = new THREE.Group();
  WG.name = 'werk';
  {
    const Bw = window.BUILD && BUILD.werkstatt;
    if (Bw) {
      Bw.root.add(WG);
      WG.position.copy(V(-Bw.pivot[0], -Bw.pivot[1], 0));
    } else scene.add(WG);
  }
  const think = (t, ms) => PLAY.think(t, ms);
  const now = () => CLOCK.t;
  const de = v => (Math.round(v * 10) / 10).toLocaleString('de-DE');
  const KERF = 3.2,
    OT = 12,
    PRESS = 30,
    CURE = 120; // saw kerf (mm), open time of the glue at 15 °C, minimum time in the clamps, before machining (game minutes)
  // ---------------- materials ----------------
  const MT = {
    steel: plain({ color: 0x9aa0a5, metalness: 0.8, roughness: 0.35 }),
    dark: plain({ color: 0x2a2d30, metalness: 0.4, roughness: 0.55 }),
    red: plain({ color: 0xb3261e, metalness: 0.15, roughness: 0.45 }),
    black: plain({ color: 0x151617, roughness: 0.6 }),
    glue: plain({ color: 0xf3eedb, roughness: 0.3 }),
    glueDry: plain({ color: 0xe2cd94, roughness: 0.28 }),
    foam: plain({ color: 0xf2e6b8, roughness: 0.95 }),
    beech: plain({ color: 0xdcb98c, roughness: 0.7 }),
    handle: plain({ color: 0xa8743f, roughness: 0.6 }),
    white: plain({ color: 0xf0f0ec, roughness: 0.45 }),
    yellow: plain({ color: 0xe2b21f, roughness: 0.5 }),
    green: plain({ color: 0x2f6e3a, roughness: 0.5 }),
    brass: plain({ color: 0xc9a14a, metalness: 0.85, roughness: 0.35 }),
    sponge: plain({ color: 0xe8c33a, roughness: 1 }),
    brown: plain({ color: 0x5a3a1e, roughness: 0.4 }),
    tin: plain({ color: 0x8e9a8c, metalness: 0.7, roughness: 0.4 }),
    cloth: plain({ color: 0xd8d2c4, roughness: 1 }),
    lcd: plain({ color: 0x9fb39a, roughness: 0.3, emissive: 0x1c2a1c }),
    orange: plain({ color: 0xd0601e, roughness: 0.5 }),
    foil: plain({ color: 0xdfe6ea, roughness: 0.2, transparent: true, opacity: 0.4, depthWrite: false }),
    bowl: plain({ color: 0xf4f4f0, roughness: 0.25 }),
    tape: plain({ color: 0xd9c98e, roughness: 0.8 }),
  };
  // object-local boxes and cylinders (x right, y forward, z up of the object; metres)
  function lb(g, cx, cy, cz, sx, sy, sz, m) {
    const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sz, sy), m);
    me.position.set(cx, cz, -cy);
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
    return me;
  }
  function lc(g, cx, cy, cz, r, len, axis, m, seg = 14, r2) {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 ?? r, len, seg), m);
    if (axis === 'x') me.rotation.z = Math.PI / 2;
    else if (axis === 'y') me.rotation.x = Math.PI / 2;
    me.position.set(cx, cz, -cy);
    me.castShadow = true;
    g.add(me);
    return me;
  }
  const grp = (par, x, y, z) => {
    const g = new THREE.Group();
    if (x !== undefined) g.position.copy(V(x, y, z));
    if (par) par.add(g);
    return g;
  };
  const clear = g => {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse(o => {
        if (o.isMesh && o.geometry && !o.userData.keepGeo) o.geometry.dispose();
      });
    }
  };
  // ---------------- oak: lamellae of the glued panel, growth rings and rays, fuming ----------------
  const frac = x => x - Math.floor(x);
  const hsh = (a, b) => {
    let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // each lamella: width, tone, the pith of its tree in its own cross-section (flat-sawn: far below or above, quarter-sawn: far to the side), ring width, sapwood edge
  function lamellae(seed, W) {
    const R = mulberry(seed),
      out = [];
    let v = 0;
    while (v < W - 0.5) {
      let w = 40 + R() * 24;
      if (W - (v + w) < 28) w = W - v;
      const quart = R() < 0.3;
      out.push({
        v0: v,
        w,
        tone: 0.9 + R() * 0.18,
        hue: R() * 2 - 1,
        quart,
        pv: quart ? (R() < 0.5 ? -90 - R() * 220 : w + 90 + R() * 220) : w * (0.15 + R() * 0.7),
        pw: quart ? 12 + R() * 16 : R() < 0.5 ? -70 - R() * 230 : 110 + R() * 230,
        ring: 1.5 + R() * 1.9,
        sap: R() < 0.07 ? (R() < 0.5 ? 'l' : 'r') : null,
        ph: R() * 60,
      });
      v += w;
    }
    return out;
  }
  const lamAt = (wp, v) => {
    for (const l of wp.lam) if (v < l.v0 + l.w) return l;
    return wp.lam[wp.lam.length - 1];
  };
  const isSap = (l, v) => !!l.sap && (l.sap === 'l' ? v - l.v0 < 5 : l.v0 + l.w - v < 5);
  // fuming: depth (mm) and darkening after H effective hours – long grain slowly, end grain about ten times deeper; sapwood does not react
  const dL = H => 0.42 * Math.sqrt(Math.max(0, H)),
    dE = H => 4.2 * Math.sqrt(Math.max(0, H));
  const darkOf = (H, end) => 1 - Math.exp(-Math.max(0, H) / (end ? 14 : 30));
  const FUMED = [88, 58, 34];
  // colour of a material point (v across the original panel, w through its thickness, u along the grain), end grain or long grain face
  // V16d: own wood from the Klinge (werk/holz_dry.js) – larch or spruce: softwoods have no pores and no broad rays, the latewood is a sharp
  // dark band; larch heartwood is reddish brown with a narrow light sapwood edge, spruce stays pale
  const SOFT = {
    larch: { e: [226, 170, 112], l: [160, 88, 50], sap: [234, 214, 170] },
    spruce: { e: [236, 216, 176], l: [192, 150, 98], sap: null },
    pine: { e: [232, 200, 150], l: [178, 112, 62], sap: [238, 220, 182] },
  };
  function softCol(wp, v, w, u, end, o, px) {
    const P = SOFT[wp.sp] || SOFT.spruce,
      l = lamAt(wp, v),
      dv = v - l.v0 - l.pv,
      dw = w - l.pw,
      r = Math.hypot(dv, dw),
      ring = l.ring * 1.5;
    const aa = Math.min(1, Math.max(0, (ring * (px || 1) - 1.6) / 2.4));
    let rg;
    if (end) {
      const ang = Math.atan2(dw, dv);
      rg = r / ring + 0.05 * Math.sin(ang * 5 + l.ph);
    } else rg = r / ring + 0.55 * Math.sin(u * 0.0042 + l.ph) + 0.18 * Math.sin(u * 0.017 + l.ph * 2.3);
    const f = rg - Math.floor(rg),
      lw = THREE.MathUtils.smoothstep(f, 0.6, 0.78) * (1 - THREE.MathUtils.smoothstep(f, 0.9, 1.0)) * (0.3 + 0.7 * aa),
      k = l.tone * (0.97 + 0.06 * hsh(Math.floor(u / 40), Math.floor(v * 3 + w * 3)));
    for (let i = 0; i < 3; i++) o[i] = (P.e[i] + (P.l[i] - P.e[i]) * lw) * k;
    o[0] += l.hue * 5;
    o[2] -= l.hue * 5;
    o[3] = P.sap && isSap(l, v) ? 1 : 0;
    if (o[3]) for (let i = 0; i < 3; i++) o[i] = o[i] * 0.4 + P.sap[i] * 0.6;
    return o;
  }
  function oakCol(wp, v, w, u, end, o, px) {
    if (wp.sp) return softCol(wp, v, w, u, end, o, px);
    const l = lamAt(wp, v),
      dv = v - l.v0 - l.pv,
      dw = w - l.pw,
      r = Math.hypot(dv, dw);
    let k = l.tone;
    const aa = Math.min(1, Math.max(0, (l.ring * (px || 1) - 1.6) / 2.4)); // rings fade out where they come close to the pixel size (no moiré)
    if (end) {
      const ang = Math.atan2(dw, dv),
        rg = r / l.ring + 0.06 * Math.sin(ang * 5 + l.ph),
        f = rg - Math.floor(rg);
      k *= 0.82 * (1 - 0.13 * aa * (0.5 + 0.5 * Math.cos(6.2832 * (f - 0.1)))); // latewood darker
      if (f < 0.22 && hsh(Math.floor(v * 2.2), Math.floor(w * 2.2)) < 0.32) k *= 1 - 0.28 * aa; // earlywood pores as dots
      const ra = ang * 31.5 + Math.sin(r * 0.05) * 0.4 + l.ph,
        rid = Math.floor(ra);
      if (ra - rid < 0.07 && hsh(rid, Math.floor(r / 3)) < 0.55) k *= 1.12; // broad rays: short light dashes
      k *= 0.97 + 0.06 * hsh(Math.floor(v * 4), Math.floor(w * 4 + 7));
    } else {
      const rg = r / l.ring + 0.55 * Math.sin(u * 0.0042 + l.ph) + 0.18 * Math.sin(u * 0.017 + l.ph * 2.3),
        f = rg - Math.floor(rg);
      k *= 1 - 0.1 * (0.3 + 0.7 * aa) * (0.5 + 0.5 * Math.cos(6.2832 * (f - 0.1)));
      if (f < 0.3 && hsh(Math.floor(u / 2.5), Math.floor((v + w) * 1.6)) < 0.12) k *= 0.86; // pores as dashes along the grain
      k *= 0.96 + 0.08 * hsh(Math.floor(u / 40), Math.floor(v * 3 + w * 3));
      if (l.quart) {
        const q = u / 14;
        if (q - Math.floor(q) < 0.5 && hsh(Math.floor(q), Math.floor(r * 0.6)) < 0.12) k *= 1.1;
      }
    } // ray flecks (Spiegel)
    o[0] = 202 * k + l.hue * 6;
    o[1] = 160 * k;
    o[2] = 110 * k - l.hue * 6;
    o[3] = isSap(l, v) ? 1 : 0;
    if (o[3]) {
      o[0] = o[0] * 0.55 + 224 * 0.45;
      o[1] = o[1] * 0.55 + 205 * 0.45;
      o[2] = o[2] * 0.55 + 172 * 0.45;
    }
    return o;
  }
  const mix = (o, c, k) => {
    o[0] += (c[0] - o[0]) * k;
    o[1] += (c[1] - o[1]) * k;
    o[2] += (c[2] - o[2]) * k;
  };
  // ---------------- textures: painted per pixel from the material points of the face ----------------
  function paint(W, H, fn) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const q = c.getContext('2d'),
      im = q.createImageData(W, H),
      d = im.data,
      o = [0, 0, 0, 0];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        o[0] = o[1] = o[2] = 0;
        o[3] = 0;
        fn(x, y, o);
        const i = (y * W + x) * 4;
        d[i] = o[0];
        d[i + 1] = o[1];
        d[i + 2] = o[2];
        d[i + 3] = 255;
      }
    q.putImageData(im, 0, 0);
    return c;
  }
  const texOf = c => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return t;
  };
  // the geometry of each form: where a point of a face comes from in the original panel (v, w, u), and what the face shows (end grain? glue line?)
  // A plate: panel, blank, strips as cut  ·  B: strips on edge (first glue-up)  ·  C: slices end grain up (second glue-up, the board)
  const formOf = st =>
    ['panel', 'blank', 'rip', 'strips'].includes(st)
      ? 'A'
      : ['lay1', 'glue1', 'clamp1', 'panel1', 'planed1', 'slice'].includes(st)
        ? 'B'
        : 'C';
  const nStrips = wp => (wp.strips ? wp.strips.length : 0);
  // B: a point (Y across the strips, Z height) of the glued panel → (v, w) in the original panel
  function mapB(wp, Y, Z) {
    const i = Math.max(0, Math.min(nStrips(wp) - 1, Math.floor(Y / 40))),
      s = wp.strips[i],
      b = Y - i * 40,
      a = Z;
    return [s.v0 + (s.fa ? wp.fence - a : a), s.fb ? 40 - b : b, i, b];
  }
  // C: a point (X along the board, Y across) of the end-grain face → slice j, (Y, Z) in the glued panel
  function mapC(wp, X, Y) {
    const Zp = wp.Z,
      j = Math.max(0, Math.min(wp.slices.length - 1, Math.floor(X / Zp))),
      s = wp.slices[j];
    let z = X - j * Zp,
      y = Y;
    if (s.flip) {
      z = Zp - z;
      y = nStrips(wp) * 40 - Y;
    }
    return [j, y, z + wp.rmB[1], z];
  }
  // fuming records: where a point was within reach of the ammonia when it was fumed (depth from the faces exposed then)
  function fumeK(wp, v, w, u, ctx) {
    let k = 0;
    const F = wp.fum || {};
    if (F.P) {
      const d = dL(F.P),
        e = dE(F.P);
      if (w < d || w > 40 - d || v < d || v > 400 - d) k = Math.max(k, darkOf(F.P));
      if (u < e || u > 1000 - e) k = Math.max(k, darkOf(F.P, 1) * 0.9);
    }
    if (F.S && ctx.a != null) {
      const d = dL(F.S);
      if (ctx.a < d || ctx.a > wp.fence - d || ctx.b < d || ctx.b > 40 - d) k = Math.max(k, darkOf(F.S));
    }
    if (F.G && ctx.Z != null) {
      const d = dL(F.G.H);
      if (ctx.Z - F.G.z0 < d || F.G.z1 - ctx.Z < d) k = Math.max(k, darkOf(F.G.H));
    }
    if (F.sl && ctx.j != null && F.sl[ctx.j]) {
      const r = F.sl[ctx.j],
        dep = ctx.top ? wp.rmT[0] - r.rm[0] : wp.rmT[1] - r.rm[1];
      if (dep < dE(r.H)) k = Math.max(k, darkOf(r.H, 1) * (1 - (Math.max(0, dep) / dE(r.H)) * 0.35));
    }
    if (F.B && ctx.top != null) {
      const dep = ctx.top ? wp.rmT[0] - F.B.rm[0] : wp.rmT[1] - F.B.rm[1];
      if (dep < dE(F.B.H)) k = Math.max(k, darkOf(F.B.H, 1) * (1 - (Math.max(0, dep) / dE(F.B.H)) * 0.35));
    }
    if (F.B && ctx.side) k = Math.max(k, darkOf(F.B.H) * 0.9);
    return wp.sp ? k * 0.15 : k;
  } // V16d: softwoods have hardly any tannin – ammonia barely darkens them
  // one canvas per face of the current form; px per mm chosen so a whole face is at most 512 px
  function faceTextures(wp) {
    const f = formOf(wp.st),
      o = {},
      out = {};
    const px = L => Math.max(0.25, Math.min(1.0, 384 / L));
    const tone = (o2, k) => {
      if (k > 0 && !o2[3]) {
        const d = 1 - 0.52 * k;
        o2[0] *= d * (1 - 0.04 * k);
        o2[1] *= d * (1 - 0.1 * k);
        o2[2] *= d * (1 - 0.22 * k);
      }
    };
    if (f === 'A') {
      const L = wp.L,
        W = 400,
        T = 40,
        s = px(Math.max(L, W)),
        sw = Math.round(L * s),
        sh = Math.round(W * s),
        uo = wp.u0 || 0;
      out.top = paint(sw, sh, (x, y, c) => {
        const u = uo + x / s,
          v = y / s;
        oakCol(wp, v, T, u, false, c, s);
        tone(c, fumeK(wp, v, T, u, {}));
      });
      out.bot = out.top;
      const se = Math.round(T * s * 4) / T;
      out.end = paint(Math.round(W * s), Math.max(8, Math.round(T * 4 * s)), (x, y, c) => {
        const v = x / s,
          w = T - y / (4 * s);
        oakCol(wp, v, w, uo, true, c, s);
        tone(c, fumeK(wp, v, w, uo, {}));
      });
      out.edge = paint(sw, Math.max(8, Math.round(T * 4 * s)), (x, y, c) => {
        const u = uo + x / s,
          w = T - y / (4 * s);
        oakCol(wp, 1, w, u, false, c, s);
        tone(c, fumeK(wp, 1, w, u, {}));
      });
    } else if (f === 'B') {
      const L = wp.L,
        Wd = nStrips(wp) * 40,
        Z = wp.Zcur,
        s = px(Math.max(L, Wd)),
        sw = Math.round(L * s),
        sh = Math.round(Wd * s),
        uo = wp.u0 || 0;
      const zTop = wp.rmB[1] + Z,
        zBot = wp.rmB[1];
      const faceZ = (zz, top) =>
        paint(sw, sh, (x, y, c) => {
          const Y = y / s,
            u = uo + x / s,
            [v, w, i, b] = mapB(wp, Y, zz);
          oakCol(wp, v, w, u, false, c, s);
          tone(c, fumeK(wp, v, w, u, { a: zz, b, Z: zz }));
          if (Math.abs(b) < 0.5 / s || Math.abs(b - 40) < 0.5 / s) {
            c[0] *= 0.82;
            c[1] *= 0.8;
            c[2] *= 0.72;
          } // glue lines between the strips
          if (wp.st !== 'lay1' && wp.stainB && ((top && wp.rmT[0] < 0.4) || (!top && wp.rmT[1] < 0.4)))
            for (let k = 0; k < 5; k++) {
              const xc = ((k + 0.5) / 5) * L;
              if (Math.abs(u - uo - xc) < 15 && (b < 4 || b > 36)) {
                c[0] *= 0.55;
                c[1] *= 0.57;
                c[2] *= 0.66;
              }
            }
        });
      out.top = faceZ(zTop - 0.01, true);
      out.bot = out.top;
      const sz = Math.max(8, Math.round(Z * 4 * s));
      out.end = paint(sh, sz, (x, y, c) => {
        const Y = x / s,
          zz = zTop - y / (4 * s),
          [v, w, i, b] = mapB(wp, Y, zz);
        oakCol(wp, v, w, uo, true, c, s);
        tone(c, fumeK(wp, v, w, uo, { a: zz, b, Z: zz }));
        if (b < 0.6 / s || 40 - b < 0.6 / s) {
          c[0] *= 0.8;
          c[1] *= 0.78;
          c[2] *= 0.7;
        }
      });
      out.edge = paint(sw, sz, (x, y, c) => {
        const u = uo + x / s,
          zz = zTop - y / (4 * s),
          [v, w] = mapB(wp, 0.5, zz);
        oakCol(wp, v, w, u, false, c, s);
        tone(c, fumeK(wp, v, w, u, { a: zz, b: 0.5, Z: zz }));
      });
    } else {
      const n = wp.slices.length,
        Lb = n * wp.Z,
        Wd = nStrips(wp) * 40,
        s = Math.min(1.6, 640 / Math.max(Lb, Wd)),
        sw = Math.round(Lb * s),
        sh = Math.round(Wd * s),
        u0 = (wp.u0 || 0) + 10;
      const endFace = top =>
        paint(sw, sh, (x, y, c) => {
          const X = (top ? x : sw - 1 - x) / s,
            Yb = y / s,
            [j, Y, Z, zl] = mapC(wp, X, Yb),
            [v, w, i, b] = mapB(wp, Y, Z),
            u = u0 + j * (wp.stop + KERF);
          oakCol(wp, v, w, u, true, c, s);
          tone(c, fumeK(wp, v, w, u, { a: Z, b, Z, j, top }));
          const gl1 = b < 0.55 / s || 40 - b < 0.55 / s,
            gl2 = zl < 0.55 / s || wp.Z - zl < 0.55 / s;
          if (gl1 || gl2) {
            const bad =
              (gl2 && wp.badJ2 && wp.badJ2.includes((X / wp.Z) | 0)) ||
              (gl1 && wp.badJ1 && wp.badJ1.includes(Math.round(Y / 40)));
            const kk = bad ? 0.45 : 0.8;
            c[0] *= kk;
            c[1] *= kk * 0.98;
            c[2] *= kk * 0.9;
          }
          if (wp.stainC && (top ? wp.rmT[0] : wp.rmT[1]) < wp.stainC)
            for (let k = 0; k < 5; k++) {
              const yc = ((k + 0.5) / 5) * Wd;
              if (Math.abs(Yb - yc) < 12 && (zl < 5 || wp.Z - zl < 5)) {
                c[0] *= 0.5;
                c[1] *= 0.53;
                c[2] *= 0.62;
              }
            }
          if (wp.burn > 0.05 && hsh(Math.floor(X * 0.4), 7) < 0.35) {
            const kb = 1 - Math.min(0.5, wp.burn * 0.6) * (0.6 + 0.4 * Math.sin(Yb * 0.05 + X));
            c[0] *= kb;
            c[1] *= kb * 0.92;
            c[2] *= kb * 0.85;
          }
        });
      out.top = endFace(true);
      out.bot = out.top;
      const H = wp.H,
        sz = Math.max(8, Math.round(H * 4 * s));
      out.edge = paint(sw, sz, (x, y, c) => {
        const X = x / s,
          h = H - y / (4 * s),
          [j, Y, Z, zl] = mapC(wp, X, 0.5),
          [v, w] = mapB(wp, Y, Z);
        oakCol(wp, v, w, u0 + j * (wp.stop + KERF) + h, false, c, s);
        tone(c, fumeK(wp, v, w, 0, { side: true }));
        if (zl < 0.5 / s || wp.Z - zl < 0.5 / s) {
          c[0] *= 0.8;
          c[1] *= 0.78;
          c[2] *= 0.7;
        }
      });
      out.end = paint(sh, sz, (x, y, c) => {
        const Yb = x / s,
          h = H - y / (4 * s),
          [j, Y, Z] = mapC(wp, 0.3, Yb),
          [v, w, i, b] = mapB(wp, Y, Z);
        oakCol(wp, v, w, u0 + h, false, c, s);
        tone(c, fumeK(wp, v, w, 0, { side: true }));
        if (b < 0.5 / s || 40 - b < 0.5 / s) {
          c[0] *= 0.8;
          c[1] *= 0.78;
          c[2] *= 0.7;
        }
      });
    }
    return out;
  }
  // materials of a workpiece: sawn faces rough and light, planed and sanded smoother, oiled warm and silky
  const ROUGH = new Set([
    'blank',
    'rip',
    'strips',
    'lay1',
    'glue1',
    'clamp1',
    'panel1',
    'slice',
    'slices',
    'lay2',
    'glue2',
    'clamp2',
    'board',
  ]);
  function wpMats(wp) {
    const F = wp.fum || {},
      dep = F.B || F.sl || wp.stainC || wp.burn > 0.05 || wp.stainB,
      fk = fumeH(wp) > 0.5 ? JSON.stringify(F, (k, v) => (typeof v === 'number' ? Math.round(v * 2) / 2 : v)) : '';
    const key = [
      formOf(wp.st),
      wp.st === 'rip' ? wp.Wrem : '',
      wp.L,
      de(wp.Zcur),
      wp.Z,
      de(wp.H),
      dep ? wp.rmT.map(de).join(',') : '',
      wp.rmB.map(de).join(','),
      fk,
      wp.stainB && wp.rmT.join(),
      wp.stainC,
      de(wp.burn),
      ROUGH.has(wp.st) ? 1 : 0,
      wp.oil && wp.oil.n > 0,
      wp.grit >= 120,
      (wp.slices || []).map(s => (s.flip ? 1 : 0)).join(''),
      (wp.strips || []).length,
      (wp.badJ1 || []).join(),
      (wp.badJ2 || []).join(),
    ].join('|');
    if (wp._mk === key && wp._mats) return wp._mats;
    if (wp._mats)
      for (const m of new Set(wp._mats)) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    const T = faceTextures(wp),
      oil = wp.oil && wp.oil.n > 0,
      sanded = wp.grit >= 120,
      rough = ROUGH.has(wp.st);
    const mk = (c, r) =>
      plain({ map: texOf(c), roughness: oil ? 0.42 : sanded ? 0.62 : r, color: oil ? 0xdcc6a2 : 0xffffff });
    const top = mk(T.top, rough ? 0.85 : 0.7),
      bot = mk(T.bot, rough ? 0.85 : 0.7),
      end = mk(T.end, 0.9),
      edge = mk(T.edge, 0.85);
    wp._mats = [end, end, top, bot, edge, edge];
    wp._mk = key;
    return wp._mats;
  }
  // ---------------- workpiece meshes ----------------
  const M = v => v / 1000;
  // a box with given materials; uv window (u0,u1 along x, v0,v1 across) for the top and bottom faces, so pieces of one texture fit together
  function piece(L, H, W, mats, win) {
    const g = new THREE.BoxGeometry(M(L), M(H), M(W));
    if (win) {
      const uv = g.attributes.uv;
      for (const f of [2, 3])
        for (let k = 0; k < 4; k++) {
          const i = f * 4 + k,
            a = uv.getX(i),
            b = uv.getY(i);
          uv.setXY(i, win[0] + a * (win[1] - win[0]), win[2] + b * (win[3] - win[2]));
        }
    }
    const me = new THREE.Mesh(g, mats);
    me.castShadow = true;
    me.receiveShadow = true;
    return me;
  }
  // squeeze-out: beads of glue along the joints on the top face
  function beads(g, n, len, pitch, axis, z, wet) {
    const m = wet ? MT.glue : MT.glueDry;
    for (let i = 1; i < n; i++) {
      const off = -((n * pitch) / 2) + i * pitch;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0028, len * 0.96, 6), m);
      if (axis === 'x') {
        b.rotation.z = Math.PI / 2;
        b.position.set(0, z, -off);
      } else {
        b.rotation.x = Math.PI / 2;
        b.position.set(off, z, 0);
      }
      b.scale.set(1, 1, 0.6);
      g.add(b);
    }
  }
  // the workpiece as a group: lying flat, centred, bottom at y = 0 (three units); gap: strips or slices laid out with gaps
  function wpMesh(wp, opt = {}) {
    const g = new THREE.Group(),
      mats = wpMats(wp),
      f = formOf(wp.st);
    if (f === 'A') {
      if (wp.st === 'strips' && !opt.one) {
        const n = nStrips(wp),
          per = Math.ceil(n / 2);
        wp.strips.forEach((s, i) => {
          const row = i % per,
            lay = Math.floor(i / per),
            me = piece(wp.L, 40, wp.fence, mats, [0, 1, 1 - (s.v0 + wp.fence) / 400, 1 - s.v0 / 400]);
          me.position.set(0, M(20 + lay * 40.5), M((-(per - 1) / 2) * (wp.fence + 1) + row * (wp.fence + 1)));
          g.add(me);
        });
      } else {
        const W = wp.st === 'rip' ? wp.Wrem : 400,
          me = piece(wp.L, 40, W, mats, wp.st === 'rip' ? [0, 1, 0, W / 400] : null);
        me.position.y = M(20);
        g.add(me);
      }
    } else if (f === 'B') {
      const n = nStrips(wp),
        Z = wp.Zcur,
        gap = wp.st === 'lay1' || (wp.st === 'glue1' && !wp.g.pressed) ? 6 : 0;
      if (gap || n === 0)
        wp.strips.forEach((s, i) => {
          const me = piece(wp.L, Z, 40, mats, [0, 1, 1 - (i + 1) / n, 1 - i / n]);
          me.position.set(0, M(Z / 2), M(-((n - 1) / 2) * (40 + gap) + i * (40 + gap)));
          g.add(me);
        });
      else {
        const me = piece(wp.L, Z, n * 40, mats);
        me.position.y = M(Z / 2);
        g.add(me);
      }
      if (wp.st === 'glue1' && wp.g.joints.length) beads(g, n, M(wp.L), M(40 + gap), 'x', M(Z) + 0.0012, true);
      if ((wp.st === 'clamp1' || wp.st === 'panel1') && wp.sq)
        beads(g, n, M(wp.L), M(40), 'x', M(Z) + 0.0012, wp.st === 'clamp1' && now() - wp.g.tc < 25);
    } else {
      const n = wp.slices.length,
        Zp = wp.Z,
        Wd = nStrips(wp) * 40,
        H = wp.H,
        gap = wp.st === 'lay2' || (wp.st === 'glue2' && !wp.g.pressed) ? 5 : 0;
      if (wp.st === 'slices' && !opt.one) {
        const per = Math.ceil(n / 2);
        wp.slices.forEach((s, j) => {
          const me = piece(Zp, H, Wd, mats, [j / n, (j + 1) / n, 0, 1]),
            c = j % per,
            lay = Math.floor(j / per);
          me.position.set(M(-((per - 1) / 2) * (Zp + 2) + c * (Zp + 2)), M(H / 2 + lay * (H + 1)), 0);
          g.add(me);
        });
      } else if (gap)
        wp.slices.forEach((s, j) => {
          const me = piece(Zp, H, Wd, mats, [j / n, (j + 1) / n, 0, 1]);
          me.position.set(M(-((n - 1) / 2) * (Zp + gap) + j * (Zp + gap)), M(H / 2), 0);
          g.add(me);
        });
      else {
        const Lb = wp.trim ? n * Zp - 10 : n * Zp,
          Wb = wp.trim ? Wd - 10 : Wd;
        let me;
        if (wp.cham) {
          const gg = new RoundedBoxGeometry(M(Lb), M(H), M(Wb), 2, 0.0028);
          me = new THREE.Mesh(gg, mats);
          me.castShadow = me.receiveShadow = true;
        } else me = piece(Lb, H, Wb, mats);
        me.position.y = M(H / 2);
        g.add(me);
        if (wp.brand) {
          const b = brandDecal(wp.brand);
          b.position.set(0, M(H / 2), M(Wb / 2) + 0.0006);
          g.add(b);
        }
        if ((wp.st === 'clamp2' || wp.st === 'board') && wp.sq)
          beads(g, n, M(Wb), M(Zp), 'y', M(H) + 0.0012, wp.st === 'clamp2' && now() - wp.g.tc < 25);
        if (wp.st === 'glue2' && wp.g.joints.length) beads(g, n, M(Wb), M(Zp), 'y', M(H) + 0.0012, true);
      }
    }
    if (opt.edge) {
      const bb = new THREE.Box3().setFromObject(g),
        sz = bb.getSize(new THREE.Vector3());
      const p = new THREE.Group();
      g.rotation.x = Math.PI / 2;
      g.position.set(0, sz.z / 2, -sz.y / 2);
      p.add(g);
      return p;
    }
    return g;
  }
  const BRAND_TEX = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const q = c.getContext('2d');
    q.clearRect(0, 0, 512, 96);
    q.font = '700 54px Georgia, "Times New Roman", serif';
    q.textAlign = 'center';
    q.textBaseline = 'middle';
    q.shadowColor = 'rgba(60,25,8,0.7)';
    q.shadowBlur = 6;
    q.fillStyle = 'rgba(38,16,6,0.93)';
    q.fillText('KLINGENHOLZ', 256, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const BRANDM = {};
  function brandDecal(k) {
    const kk = Math.round(k * 10) / 10,
      m =
        BRANDM[kk] ||
        (BRANDM[kk] = new THREE.MeshStandardMaterial({
          map: BRAND_TEX,
          transparent: true,
          opacity: k >= 0.9 ? 1 : 0.55 + k * 0.4,
          roughness: 0.8,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        }));
    const me = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.028), m);
    return me;
  }
  // ---------------- clamps, cauls, the glue bottle ----------------
  // a parallel clamp along local x (bar length L), jaws upward (bottom clamp) or downward (top clamp); open: jaw distance (m)
  function clampMesh(L, down) {
    const g = new THREE.Group(),
      s = down ? -1 : 1;
    lb(g, 0, 0, 0, L, 0.03, 0.012, MT.steel);
    const j1 = new THREE.Group(),
      j2 = new THREE.Group();
    g.add(j1, j2);
    lb(j1, 0, 0, s * 0.04, 0.03, 0.05, 0.075, MT.red);
    lb(j2, 0, 0, s * 0.04, 0.03, 0.05, 0.075, MT.red);
    lc(j2, 0.07, 0, s * 0.045, 0.008, 0.11, 'x', MT.steel, 8);
    lc(j2, 0.135, 0, s * 0.045, 0.018, 0.09, 'x', MT.red, 10);
    g.userData.set = open => {
      j1.position.x = -open / 2 - 0.015;
      j2.position.x = open / 2 + 0.015;
    };
    g.userData.set(L * 0.8);
    return g;
  }
  function fClamp() {
    const g = new THREE.Group();
    lb(g, 0, 0, 0.06, 0.012, 0.026, 0.2, MT.steel);
    lb(g, 0.04, 0, 0.155, 0.08, 0.03, 0.02, MT.red);
    lb(g, 0.04, 0, -0.035, 0.08, 0.03, 0.02, MT.dark);
    lc(g, 0.07, 0, -0.08, 0.006, 0.07, 'z', MT.steel, 8);
    lc(g, 0.07, 0, -0.125, 0.014, 0.06, 'z', MT.handle, 10);
    return g;
  }
  function caul(L) {
    const g = new THREE.Group();
    lb(g, 0, 0, 0, L, 0.045, 0.032, MT.beech);
    lb(g, 0, 0, -0.0165, L, 0.045, 0.001, MT.tape);
    return g;
  }
  // ---------------- tools: things to carry (in the hand: the handle along +y) ----------------
  const TOOLS = {};
  function tool(id, name, o, build) {
    const world = new THREE.Group(),
      held = new THREE.Group();
    const w = build();
    world.add(w);
    const h = build();
    if (o.upright) held.add(h);
    else {
      const p = new THREE.Group();
      p.rotation.z = Math.PI / 2;
      p.add(h);
      held.add(p);
    }
    const T = PLAY.thing(
      Object.assign(
        {
          id,
          name,
          carry3: o.side ? 'side' : 'tool',
          grip3: o.side ? { hang: o.hang ?? 0.14 } : { at: o.at ?? 0.25, len: o.len ?? 0.2 },
          world,
          held,
          r: 1.2,
          hz: 0.04,
          vm: o.vm || { x: 0.26, y: -0.22, z: -0.5, rx: -0.5, rz: 0.2 },
          desc: o.desc,
          s3: o.s3,
        },
        o.extra || {}
      )
    );
    T.art = o.art || name;
    T.home = o.home || '';
    T.def = o.at0;
    T.tool = true;
    TOOLS[id] = T;
    return T;
  }
  const ROLLER = tool(
    'roller',
    'Leimroller',
    {
      art: 'den Leimroller',
      home: 'er liegt am Leimtisch',
      len: 0.2,
      at: 0.2,
      desc: 'Schaumstoffrolle für Leim: schnell und gleichmäßig auf breiten Fugen.',
      at0: [-2.5, -40.33, 0.86, 0.3],
    },
    () => {
      const g = new THREE.Group();
      lc(g, 0.06, 0, 0.012, 0.011, 0.12, 'x', MT.yellow, 10);
      lc(g, 0.13, 0, 0.012, 0.003, 0.03, 'x', MT.steel, 6);
      lb(g, 0.145, 0, 0.022, 0.004, 0.004, 0.02, MT.steel);
      lc(g, 0.16, 0, 0.032, 0.016, 0.07, 'y', MT.foam, 14);
      return g;
    }
  );
  const BRUSH = tool(
    'brush',
    'Leimpinsel',
    {
      art: 'den Leimpinsel',
      home: 'er liegt am Leimtisch',
      len: 0.17,
      at: 0.25,
      desc: 'Flachpinsel für Leim: genau, aber langsamer als die Rolle.',
      at0: [-2.66, -40.34, 0.86, 0.2],
    },
    () => {
      const g = new THREE.Group();
      lc(g, 0.055, 0, 0.008, 0.008, 0.11, 'x', MT.handle, 10);
      lb(g, 0.12, 0, 0.008, 0.02, 0.03, 0.01, MT.steel);
      lb(g, 0.145, 0, 0.008, 0.032, 0.028, 0.007, MT.glueDry);
      return g;
    }
  );
  const SCRAPER = tool(
    'scraper',
    'Ziehklinge',
    {
      art: 'die Ziehklinge',
      home: 'sie liegt auf der Hobelbank',
      len: 0.15,
      at: 0.3,
      desc: 'Gehärtetes Stahlblech mit Grat: nimmt getrockneten Leim und feine Späne ab.',
      at0: [-1.4, -40.36, 0.88, 0.1],
    },
    () => {
      const g = new THREE.Group();
      lb(g, 0.075, 0, 0.001, 0.15, 0.06, 0.0015, MT.steel);
      return g;
    }
  );
  const PLANE = tool(
    'plane',
    'Blockhobel',
    {
      art: 'den Blockhobel',
      home: 'er liegt auf der Hobelbank',
      len: 0.16,
      at: 0.4,
      upright: true,
      desc: 'Kleiner Hobel mit flachem Winkel: für Fasen an Langholz- und Stirnholzkanten.',
      at0: [-1.35, -39.93, 0.88, 0.5],
    },
    () => {
      const g = new THREE.Group();
      lb(g, 0, 0, 0.012, 0.05, 0.16, 0.024, MT.dark);
      lb(g, 0, -0.01, 0.03, 0.044, 0.07, 0.012, MT.dark);
      lb(g, 0, 0.0, 0.034, 0.03, 0.05, 0.004, MT.steel);
      lc(g, 0, 0.055, 0.03, 0.012, 0.018, 'z', MT.brass, 12);
      return g;
    }
  );
  const SANDER = tool(
    'sander',
    'Exzenterschleifer',
    {
      art: 'den Exzenterschleifer',
      home: 'er steht auf der Hobelbank',
      upright: true,
      len: 0.12,
      at: 0.6,
      desc: 'Schleifteller 125 mm, Klett-Schleifpapier K80 bis K240; Absaugung angeschlossen.',
      at0: [0.0, -40.17, 0.88, 0],
    },
    () => {
      const g = new THREE.Group();
      lc(g, 0, 0, 0.006, 0.0625, 0.012, 'z', MT.black, 24);
      lc(g, 0, 0, 0.05, 0.05, 0.075, 'z', MT.green, 20, 0.056);
      lc(g, 0, 0, 0.098, 0.034, 0.03, 'z', MT.black, 16);
      lc(g, 0, -0.07, 0.05, 0.016, 0.07, 'y', MT.black, 10);
      return g;
    }
  );
  const SPONGE = tool(
    'sponge',
    'Schwamm',
    {
      art: 'den Schwamm',
      home: 'er schwimmt im Wassereimer neben der Hobelbank',
      len: 0.12,
      at: 0.5,
      desc: 'Feuchter Schwamm: richtet die Fasern auf (Wässern), damit das Brett nach dem Spülen glatt bleibt.',
      at0: [0.32, -39.92, 0.245, 0.2],
    },
    () => {
      const g = new THREE.Group();
      lb(g, 0.06, 0, 0.018, 0.12, 0.08, 0.036, MT.sponge);
      return g;
    }
  );
  const OIL = tool(
    'oil',
    'Brettöl',
    {
      art: 'das Brettöl',
      home: 'die Dose steht auf der Hobelbank',
      side: true,
      hang: 0.12,
      desc: 'Lebensmittelechtes Öl auf Leinölbasis mit Baumwolllappen. Getränkte Lappen können sich selbst entzünden!',
      at0: [-0.12, -40.36, 0.88, 0],
    },
    () => {
      const g = new THREE.Group();
      lc(g, 0, 0, 0.055, 0.04, 0.11, 'z', MT.tin, 18);
      lc(g, 0, 0, 0.112, 0.02, 0.008, 'z', MT.dark, 12);
      lb(g, 0, 0.041, 0.055, 0.05, 0.002, 0.05, MT.yellow);
      lb(g, 0.07, 0, 0.01, 0.08, 0.07, 0.02, MT.cloth);
      return g;
    }
  );
  const BRAND = tool(
    'brand',
    'Brandeisen',
    {
      art: 'das Brandeisen',
      home: 'es liegt auf der Hobelbank',
      len: 0.3,
      at: 0.2,
      desc: 'Elektrisches Brandeisen mit Messingstempel „KLINGENHOLZ“; braucht etwa 5 Minuten zum Aufheizen.',
      at0: [-0.58, -40.38, 0.88, 0],
    },
    () => {
      const g = new THREE.Group();
      lc(g, 0.06, 0, 0.014, 0.013, 0.12, 'x', MT.handle, 10);
      lc(g, 0.2, 0, 0.014, 0.004, 0.16, 'x', MT.steel, 8);
      lb(g, 0.285, 0, 0.014, 0.012, 0.05, 0.03, MT.brass);
      lc(g, -0.03, 0, 0.014, 0.003, 0.08, 'x', MT.black, 6);
      return g;
    }
  );
  const METER = tool(
    'meter',
    'Feuchtemesser',
    {
      art: 'den Feuchtemesser',
      home: 'er liegt auf der Hobelbank',
      len: 0.13,
      at: 0.35,
      desc: 'Widerstands-Holzfeuchtemesser: zwei Stifte ins Holz, Anzeige in Prozent (Holzart Eiche eingestellt).',
      at0: [-0.45, -39.9, 0.88, 0.4],
    },
    () => {
      const g = new THREE.Group();
      lb(g, 0.065, 0, 0.012, 0.13, 0.06, 0.024, MT.yellow);
      lb(g, 0.05, 0, 0.0245, 0.05, 0.04, 0.001, MT.lcd);
      for (const y of [-0.012, 0.012]) lc(g, 0.14, y, 0.012, 0.0015, 0.02, 'x', MT.steel, 6);
      return g;
    }
  );
  const PUSH = tool(
    'push',
    'Schiebestock',
    {
      art: 'den Schiebestock',
      home: 'er hängt an der Tischkreissäge',
      len: 0.35,
      at: 0.3,
      vm: { x: 0.3, y: -0.28, z: -0.55, rx: -0.95, rz: 0.35, s: 0.55 },
      desc: 'Pflicht bei Schnittbreiten unter 120 mm: die Hand bleibt weit weg vom Sägeblatt.',
      at0: [-3.82, -37.72, 0.86, 1.57],
    },
    () => {
      const g = new THREE.Group();
      lb(g, 0.17, 0, 0.035, 0.34, 0.015, 0.07, MT.red);
      lb(g, 0.33, 0, 0.005, 0.03, 0.015, 0.02, MT.red);
      return g;
    }
  );
  const AMMO = tool(
    'ammo',
    'Salmiakgeist 25 %',
    {
      art: 'den Salmiakgeist (Ammoniaklösung 25 %)',
      home: 'die Flasche steht auf der Kiste am Räucherzelt',
      side: true,
      hang: 0.16,
      desc: 'Ammoniaklösung 25 %: ätzend, stechender Dampf. Nur mit Korbbrille, ABEK-Halbmaske und Nitrilhandschuhen, nur im Freien.',
      at0: [4.42, -40.3, 0.4, 0],
    },
    () => {
      const g = new THREE.Group();
      lc(g, 0, 0, 0.1, 0.045, 0.2, 'z', MT.white, 16);
      lc(g, 0, 0, 0.215, 0.018, 0.03, 'z', MT.red, 10);
      lb(g, 0, 0.046, 0.1, 0.06, 0.002, 0.07, MT.orange);
      return g;
    }
  );
  const TOOL_LIST = [ROLLER, BRUSH, SCRAPER, PLANE, SANDER, SPONGE, OIL, BRAND, METER, PUSH, AMMO];
  function toolDefaults() {
    for (const T of TOOL_LIST) {
      const [x, y, z, a] = T.def,
        [px, py] = WT(x, y);
      T.place(px, py, z, (a || 0) + WDA());
    }
  }
  // ---------------- stations ----------------
  // at: where the workpiece lies (site coordinates of the workshop as built), op: where the player stands to work
  const ST = {};
  function station(key, o) {
    const S = (ST[key] = Object.assign({ key, wp: null, hold: grp(WG, o.at[0], o.at[1], o.at[2]) }, o));
    S.base = S.hold.position.clone();
    return S;
  }
  station('saw', { at: [-4.45, -38.1, 0.86], op: [-3.3, -38.05, 0.9], r: 1.45, name: 'Tischkreissäge' });
  station('glue', { at: [-3.32, -40.02, 0.86], op: [-3.32, -39.3, 0.9], r: 1.55, name: 'Leimtisch' });
  station('planer', { at: [-1.55, -38.05, 0.62], op: [-0.55, -38.05, 0.7], r: 1.35, name: 'Dickenhobel' });
  station('sander', { at: [0.85, -38.0, 0.83], op: [0.85, -36.85, 0.9], r: 1.45, name: 'Trommelschleifer' });
  station('bench', { at: [-0.9, -40.12, 0.88], op: [-0.9, -39.4, 0.9], r: 1.55, name: 'Hobelbank' });
  station('tent', { at: [5.25, -40.05, 0.16], op: [5.25, -39.3, 0.6], r: 1.5, name: 'Räucherzelt' });
  const RACK = { items: [], hold: grp(WG, 0, 0, 0), op: [2.15, -39.72, 0.6] },
    SHELF = { items: [], hold: grp(WG, 0, 0, 0), op: [2.15, -40.15, 1.5] };
  const PSA = { op: [0.63, -39.9, 1.35] };
  // clamps and cauls at the glue table, the dish in the tent
  const GL = { clamps: [], cauls: [], f: [], hold: grp(WG, -3.32, -40.02, 0.86) };
  for (let i = 0; i < 5; i++) {
    const c = clampMesh(0.6, i % 2 === 1);
    c.visible = false;
    GL.hold.add(c);
    GL.clamps.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const c = caul(0.42);
    c.visible = false;
    GL.hold.add(c);
    GL.cauls.push(c);
  }
  for (let i = 0; i < 4; i++) {
    const c = fClamp();
    c.visible = false;
    GL.hold.add(c);
    GL.f.push(c);
  }
  const TENT = {
    amm: 0,
    open: true,
    airT: null,
    dish: (() => {
      const g = grp(WG, 5.0, -40.25, 0.02);
      lc(g, 0, 0, 0.02, 0.07, 0.04, 'z', MT.bowl, 18, 0.05);
      g.visible = false;
      return g;
    })(),
  };
  // ---------------- the workpieces ----------------
  const W = { list: [], n: 0, order: null, quality: [] };
  const byId = id => W.list.find(w => w.id === id);
  function newWP(st, o = {}) {
    const n = ++W.n,
      wp = Object.assign(
        {
          id: 'wp' + n,
          n,
          seed: 1000 + n * 77 + Math.floor(Math.random() * 999),
          st,
          L: 1000,
          u0: 0,
          fence: 45,
          stop: 42,
          Z: 45,
          Zcur: 45,
          H: 42,
          rmT: [0, 0],
          rmB: [0, 0],
          need: [0, 0],
          face: 0,
          strips: null,
          slices: null,
          g: null,
          sq: false,
          stainB: false,
          stainC: 0,
          burn: 0,
          trim: false,
          cham: false,
          grit: 0,
          gritSkip: false,
          wetT: null,
          raised: false,
          oil: { n: 0, t: null, wiped: true, rag: false },
          brand: 0,
          heatT: null,
          fum: {},
          airT: null,
          mc: 8.6 + Math.random() * 1.2,
          notes: [],
          safe: 0,
          where: 'gone',
          done: false,
          glue: null,
          created: now(),
        },
        o
      );
    if (!wp.lam) wp.lam = lamellae(wp.seed, 400);
    W.list.push(wp);
    return wp;
  }
  const nameOf = wp => {
    const F = wp.fum || {},
      fumed = fumeH(wp) > 5,
      nsl = (F.sl || []).filter(r => r && r.H > 5).length,
      all = (F.B && F.B.H > 5) || (nsl && nsl >= (wp.slices || []).length);
    const sp = wp.sp
      ? ({ larch: 'Lärche', spruce: 'Fichte', pine: 'Kiefer' }[wp.sp] || 'Nadelholz') +
        (wp.own ? ' (eigenes Holz)' : '')
      : all
        ? 'Räuchereiche'
        : nsl
          ? 'Eiche/Räuchereiche'
          : fumed
            ? 'Eiche, angeräuchert'
            : 'Eiche';
    return (
      {
        panel: 'Leimholzplatte ' + sp,
        blank: 'Zuschnitt ' + sp + ' 500 mm',
        rip: 'Zuschnitt (wird gesägt)',
        strips: nStrips(wp) + ' Kanteln ' + sp,
        lay1: 'Kanteln',
        glue1: 'Kanteln mit Leim',
        clamp1: 'Verleimung (in den Zwingen)',
        panel1: 'Leimholz aus Kanteln',
        planed1: 'Leimholz, gehobelt',
        slice: 'Leimholz (wird gesägt)',
        slices: (wp.slices || []).length + ' Stirnholzscheiben',
        lay2: 'Stirnholzscheiben',
        glue2: 'Scheiben mit Leim',
        clamp2: 'Stirnholzverleimung (in den Zwingen)',
        board: 'Stirnholzbrett, roh',
        flat: 'Stirnholzbrett, plan',
        trimmed: 'Stirnholzbrett, besäumt',
        finish: 'Stirnholzbrett ' + sp,
        done: 'Schneidebrett ' + sp + ' Nr. ' + (wp.bn || wp.n),
      }[wp.st] || 'Werkstück'
    );
  };
  function dimsOf(wp) {
    const f = formOf(wp.st);
    if (f === 'A')
      return wp.st === 'strips'
        ? nStrips(wp) + ' × ' + wp.fence + ' × 40 × ' + wp.L + ' mm'
        : wp.L + ' × ' + (wp.st === 'rip' ? Math.round(wp.Wrem) : 400) + ' × 40 mm';
    if (f === 'B') return wp.L + ' × ' + nStrips(wp) * 40 + ' × ' + de(wp.Zcur) + ' mm';
    const n = wp.slices.length;
    return (
      (wp.trim ? n * wp.Z - 10 : n * wp.Z).toFixed(0) +
      ' × ' +
      (wp.trim ? nStrips(wp) * 40 - 10 : nStrips(wp) * 40) +
      ' × ' +
      de(wp.H) +
      ' mm'
    );
  }
  function descOf(wp) {
    const nx = nextStep(wp);
    return (
      dimsOf(wp) +
      ' · Holzfeuchte ' +
      de(wp.mc) +
      ' %.' +
      (nx ? ' Nächster Schritt: ' + nx.t + '.' : '') +
      (wp.done ? ' ' + starsTxt(wp) : '')
    );
  }
  // ---- the thing in the hand ----
  function mkThing(wp) {
    if (wp.T) return wp.T;
    const world = new THREE.Group(),
      held = new THREE.Group();
    const T = PLAY.thing({
      id: wp.id,
      name: nameOf(wp),
      carry3: 'arms',
      grip3: { fwd: 0.22, dy: -0.05 },
      desc: () => descOf(wp),
      iconKey: () => wp._mk || wp.st,
      world,
      held,
      r: 1.3,
      hz: 0.05,
      vm: { x: 0.03, y: -0.34, z: -0.66, rx: 0.42 },
      takeLabel: () => nameOf(wp) + ' nehmen',
      prio: 0.25,
      can: () => ON && !carriedWP(),
      wp,
    });
    T.onTake = () => {
      wp.where = 'inv';
      save();
    };
    T.onDrop = () => {
      wp.where = 'world';
      save();
    };
    T.onPlace = () => {
      if (wp.where !== 'world') wp.where = 'world';
    };
    wp.T = T;
    T.gone();
    refreshThing(wp);
    return T;
  }
  function refreshThing(wp) {
    const T = wp.T;
    if (!T) return;
    T.name = nameOf(wp);
    for (const g of [T.world, T.held]) clear(g);
    const big = Math.max(wp.L, 400) > 600 && formOf(wp.st) === 'A';
    T.vm = big
      ? { x: 0.02, y: -0.36, z: -0.8, rx: 0.5, s: 0.42 }
      : formOf(wp.st) === 'C'
        ? { x: 0.03, y: -0.3, z: -0.62, rx: 0.55, s: 0.85 }
        : { x: 0.03, y: -0.32, z: -0.7, rx: 0.5, s: 0.62 };
    T.world.add(wpMesh(wp));
    T.held.add(wpMesh(wp));
    if (PLAY.carry === T) HELD.set(T.held, T.vm);
    if (window.HUD && PLAY.has(T)) HUD.iconDirty(T);
    markDirty(true);
  }
  const carriedWP = () => {
    for (const T of PLAY.inv.slots) if (T && T.wp) return T.wp;
    return null;
  };
  const inHandWP = () => (PLAY.carry && PLAY.carry.wp ? PLAY.carry.wp : null);
  function killThing(wp) {
    const T = wp.T;
    if (!T) return;
    PLAY.take(T);
    T.gone();
    PLAY.off('take:' + T.id);
    delete PLAY.things[T.id];
    wp.T = null;
  }
  // ---- putting a workpiece at a station, taking it back ----
  function toStation(wp, key) {
    const S = ST[key];
    if (wp.T && PLAY.has(wp.T)) PLAY.take(wp.T);
    if (wp.T) wp.T.gone();
    wp.where = key;
    S.wp = wp;
    render(key);
    SFX.drop();
    save();
  }
  function fromStation(key, quiet) {
    const S = ST[key],
      wp = S.wp;
    if (!wp) return null;
    if (carriedWP()) {
      think('Ich habe schon ein Werkstück dabei – erst ablegen.');
      return null;
    }
    S.wp = null;
    render(key);
    const T = mkThing(wp);
    refreshThing(wp);
    PLAY.give(T);
    PLAY.toHand(T);
    wp.where = 'inv';
    if (!quiet) SFX.pick();
    save();
    return wp;
  }
  // ---------------- drawing the stations ----------------
  function render(key) {
    const S = ST[key];
    if (!S) return;
    clear(S.hold);
    S.hold.position.copy(S.base);
    const wp = S.wp;
    if (key === 'glue') clampsShow(wp);
    if (key === 'tent') {
      TENT.dish.visible = TENT.amm > 0.02;
    }
    if (!wp) {
      markDirty(true);
      return;
    }
    const m = wpMesh(wp);
    if (key === 'saw' && formOf(wp.st) === 'A' && wp.st !== 'strips') {
      if (wp.st === 'panel') m.rotation.y = Math.PI / 2;
      else m.position.z = -M((wp.st === 'rip' ? wp.Wrem : 400) / 2 - wp.fence);
      m.position.x = 0.32;
    }
    if (key === 'saw' && (wp.st === 'planed1' || wp.st === 'slice')) {
      m.rotation.y = Math.PI / 2;
      m.position.set(0.3, 0, 0);
    }
    if (key === 'saw' && wp.st === 'strips') {
      m.position.set(-1.25, -0.08, 0.05);
    }
    if (key === 'planer') m.position.x = 0.6;
    if (key === 'sander') m.position.z = -0.6;
    if (key === 'glue' && wp.g && (wp.g.prep.dry || wp.g.clamps.length)) m.position.y = 0.012;
    else if (key === 'glue' && (wp.st === 'clamp1' || wp.st === 'clamp2')) m.position.y = 0.012;
    S.hold.add(m);
    S.mesh = m;
    markDirty(true);
  }
  function clampsShow(wp) {
    const st = wp ? wp.st : '',
      g = wp && wp.g,
      A = st === 'glue1' || st === 'clamp1',
      Bf = st === 'glue2' || st === 'clamp2';
    const n = g ? g.clamps.length : 0,
      ready = g && g.prep && g.prep.dry;
    GL.clamps.forEach((c, i) => {
      const bot = i % 2 === 0,
        set = i < n,
        show = (A || Bf) && (set || (ready && bot));
      c.visible = !!show;
      if (!show) return;
      const L = A ? wp.L : wp.slices.length * wp.Z,
        Wd = nStrips(wp) * 40,
        H = A ? wp.Zcur : wp.H;
      if (A) {
        c.rotation.y = Math.PI / 2;
        c.position.set(M(-L / 2 + ((i + 0.5) / 5) * L), bot ? 0.006 : M(H) + 0.018, 0);
        c.userData.set(set ? M(Wd) : M(Wd) + 0.08);
      } else {
        c.rotation.y = 0;
        c.position.set(0, bot ? 0.006 : M(H) + 0.018, -M(-Wd / 2 + ((i + 0.5) / 5) * Wd));
        c.userData.set(set ? M(L) : M(L) + 0.08);
      }
    });
    const cs = g && g.cauls;
    GL.cauls.forEach((c, i) => {
      c.visible = !!cs;
      if (!cs) return;
      const L = A ? wp.L : wp.slices.length * wp.Z,
        Wd = nStrips(wp) * 40,
        H = A ? wp.Zcur : wp.H,
        top = i % 2 === 1,
        e = i < 2 ? -1 : 1;
      if (A) {
        c.rotation.y = Math.PI / 2;
        c.position.set(M(e * (L / 2 - 30)), top ? M(H) + 0.016 : -0.016, 0);
        c.scale.x = (Wd + 80) / 420;
      } else {
        c.rotation.y = 0;
        c.position.set(0, top ? M(H) + 0.016 : -0.016, -M(e * (Wd / 2 - 40)));
        c.scale.x = (L + 80) / 420;
      }
    });
    GL.f.forEach((c, i) => {
      c.visible = !!cs;
      if (!cs) return;
      const L = A ? wp.L : wp.slices.length * wp.Z,
        Wd = nStrips(wp) * 40,
        e = i < 2 ? -1 : 1,
        s = i % 2 ? -1 : 1;
      if (A) c.position.set(M(e * (L / 2 - 30)), 0, -M(s * (Wd / 2 + 55)));
      else c.position.set(M(s * (L / 2 + 55)), 0, -M(e * (Wd / 2 - 40)));
      c.rotation.y = A ? 0 : Math.PI / 2;
    });
    markDirty(true);
  }
  // ---------------- the rack (stock and stored work) and the shelf (finished boards) ----------------
  function renderRack() {
    clear(RACK.hold);
    RACK.items.forEach((wp, k) => {
      const m = wpMesh(wp, { edge: true });
      m.position.copy(V(2.15 - (wp.L > 600 ? 0 : 0.5) + (k % 2) * 0.02, -40.27 + k * 0.052, 0.1));
      RACK.hold.add(m);
    });
    clear(SHELF.hold);
    SHELF.items.forEach((wp, k) => {
      const m = wpMesh(wp, { edge: true });
      m.rotation.x = -0.16;
      m.position.copy(V(1.25 + k * 0.36, -40.33, 1.69));
      SHELF.hold.add(m);
    });
    markDirty(true);
  }
  // ---------------- the steps: what is next for a workpiece (journal, tracker, the card) ----------------
  const BOOK = [
    [
      'material',
      'Leimholzplatte Eiche aus dem Regal holen',
      'Eiche, durchgehende Lamelle, technisch getrocknet: 8–10 % Holzfeuchte (Feuchtemesser). Unter 12 % hält der Leim sicher.',
    ],
    [
      'psa',
      'Schutzausrüstung vom PSA-Brett',
      'Säge und Hobel: Schutzbrille, Gehörschutz, keine Handschuhe. Schleifen: FFP2 – Eichenstaub gilt als krebserzeugend. Räuchern: Korbbrille, ABEK-Halbmaske, Nitril.',
    ],
    [
      'cross',
      'Tischkreissäge: auf 500 mm ablängen',
      'Querschnitt am Schiebeschlitten mit Längenanschlag. Blatt 5–15 mm über dem Werkstück.',
    ],
    [
      'rip',
      'Kanteln längs sägen (8 × 45 mm)',
      'Parallelanschlag 45 mm. Bei Schnittbreiten unter 120 mm immer mit Schiebestock; Spaltkeil und Schutzhaube bleiben dran.',
    ],
    [
      'lay1',
      'Kanteln hochkant auslegen, Verleimung vorbereiten',
      'Jahresringe abwechselnd, Schreinerdreieck anzeichnen. Trockenprobe mit allen Zwingen, Folie auf die Zwingenschienen (Eiche + Eisen + nasser Leim = schwarze Flecken), Zulagen bereitlegen.',
    ],
    [
      'glue1',
      'Verleimen: Leim, zusammenschieben, Zwingen, Zulagen',
      'D3-Leim (wasserfest) dünn und deckend mit Rolle oder Pinsel. Offene Zeit ca. 12 min bei 15 °C. Zwingen abwechselnd unten und oben, handfest. Zulagen oben und unten (Ober-/Niederhalter) halten die Kanteln bündig.',
    ],
    ['dry1', 'Trocknen lassen', 'Mindestens 30 min in den Zwingen, bis zum Hobeln 2 h (über Nacht ist besser).'],
    [
      'plane',
      'Leim abkratzen, Dickenhobel',
      'Ziehklinge auf der Hobelbank – getrockneter Leim ruiniert Hobelmesser. Dann beidseitig hobeln bis sauber, höchstens 1 mm je Durchgang bei 32 cm breiter Eiche.',
    ],
    [
      'slice',
      'In Scheiben sägen (Querschnitt)',
      'Erst ein Ende besäumen, dann Scheiben am Längenanschlag des Schiebeschlittens – nie am Parallelanschlag: das Stück verklemmt und schlägt zurück.',
    ],
    [
      'lay2',
      'Stirnholz nach oben drehen, versetzen',
      'Jede Scheibe um 90° kippen, jede zweite wenden – so versetzen sich die Kanteln. Vorbereitung wie beim ersten Mal.',
    ],
    [
      'glue2',
      'Zweite Verleimung',
      'Wie beim ersten Mal, mehr Fugen: die Leimrolle spart Zeit. Zulagen halten die Scheiben bündig.',
    ],
    ['dry2', 'Trocknen lassen', '30 min in den Zwingen, 2 h bis zum Schleifen.'],
    [
      'flat',
      'Leim abkratzen, planschleifen',
      'Stirnholz nie durch den Dickenhobel – die Kanten reißen aus, Stücke fliegen. Trommelschleifer, höchstens 0,5 mm je Durchgang, sonst verbrennt das Stirnholz.',
    ],
    [
      'trim',
      'Kanten besäumen, fasen',
      'Tischkreissäge mit Opferholz gegen Ausriss an den Stirnholzkanten. Fase mit dem Blockhobel, von außen zur Mitte.',
    ],
    [
      'sand',
      'Schleifen 80 → 120 → 180, wässern, 240',
      'Keine Körnung überspringen. Nach K180 mit dem Schwamm wässern, 30 min trocknen, dann K240 – sonst wird das Brett nach dem ersten Spülen rau.',
    ],
    [
      'fume',
      'Räuchern (wahlweise)',
      'Im Zelt mit Ammoniak 25 %: Langholz färbt sich nur ein paar Millimeter tief, Stirnholz viel tiefer. Darum das plangeschliffene Brett oder die Scheiben räuchern. Splintholz bleibt hell. Danach 24 h auslüften, bevor geleimt wird.',
    ],
    [
      'oil',
      'Ölen: 2 Schichten',
      'Brettöl satt auftragen, 20 min einziehen lassen, Überschuss abnehmen, 8 h trocknen. Öllappen in den Metalleimer mit Wasser – Selbstentzündung!',
    ],
    ['brandmark', 'Brandzeichen „KLINGENHOLZ“', 'Brandeisen 5 min aufheizen, gleichmäßig drücken, nicht zu lange.'],
    ['done', 'Einlagern oder verschenken', 'Fertige Bretter ins Regal (obere Ablage) oder Ronald bringen.'],
  ];
  const ORDER = {
    panel: 2,
    blank: 3,
    rip: 3,
    strips: 4,
    lay1: 4,
    glue1: 5,
    clamp1: 6,
    panel1: 7,
    planed1: 8,
    slice: 8,
    slices: 9,
    lay2: 9,
    glue2: 10,
    clamp2: 11,
    board: 12,
    flat: 13,
    trimmed: 13,
    finish: 14,
    done: 18,
  };
  // the next thing to do with a workpiece: text and where (station key)
  function nextStep(wp) {
    if (!wp) return null;
    const g = wp.g,
      at = wp.where;
    switch (wp.st) {
      case 'panel':
        return { t: 'an der Tischkreissäge auf 500 mm ablängen', at: 'saw' };
      case 'blank':
        return { t: 'an der Tischkreissäge in Kanteln sägen', at: 'saw' };
      case 'rip':
        return { t: 'weiter Kanteln sägen (' + wp.cut + '/' + wp.nRip + ')', at: 'saw' };
      case 'strips':
        return { t: 'auf dem Leimtisch auslegen', at: 'glue' };
      case 'lay1':
      case 'lay2':
        return wp.dirty
          ? { t: 'alte Leimreste abkratzen (Ziehklinge)', at: 'glue' }
          : { t: 'Verleimung vorbereiten', at: 'glue' };
      case 'glue1':
      case 'glue2':
        return {
          t: g.joints.length < g.nJ ? 'Leim auftragen' : !g.pressed ? 'zusammenschieben' : 'Zwingen setzen',
          at: 'glue',
        };
      case 'clamp1':
      case 'clamp2': {
        const left = g.tc + PRESS - now();
        return { t: left > 0 ? 'Leim trocknen lassen (noch ' + CLOCK.dur(left) + ')' : 'Zwingen lösen', at: 'glue' };
      }
      case 'panel1':
        return wp.sq
          ? { t: 'Leim abkratzen (Hobelbank, Ziehklinge)', at: 'bench' }
          : { t: 'Dickenhobel: beidseitig sauber hobeln', at: 'planer' };
      case 'planed1':
        return { t: 'an der Tischkreissäge in Scheiben sägen', at: 'saw' };
      case 'slice':
        return { t: 'weiter Scheiben sägen (' + wp.cut + '/' + wp.nSl + ')', at: 'saw' };
      case 'slices':
        return { t: 'auf dem Leimtisch drehen und auslegen', at: 'glue' };
      case 'board':
        return wp.sq
          ? { t: 'Leim abkratzen (Hobelbank, Ziehklinge)', at: 'bench' }
          : { t: 'Trommelschleifer: plan schleifen', at: 'sander' };
      case 'flat':
        return { t: 'an der Tischkreissäge besäumen', at: 'saw' };
      case 'trimmed':
        return { t: 'Kanten fasen (Blockhobel, Hobelbank)', at: 'bench' };
      case 'finish': {
        const o = wp.oil;
        if (wp.grit < 240)
          return {
            t: wp.grit === 180 && !wp.raised ? 'wässern (Schwamm), dann K240' : 'schleifen K' + gritNext(wp),
            at: 'bench',
          };
        if (!wp.brand)
          return { t: wp.heatT == null ? 'Brandeisen anheizen' : 'Klingenholz-Zeichen einbrennen', at: 'bench' };
        if (o.rag) return { t: 'Öllappen in den Metalleimer', at: 'bench' };
        if (!o.wiped)
          return { t: now() - o.t < 20 ? 'Öl einziehen lassen' : 'überschüssiges Öl abnehmen', at: 'bench' };
        if (o.n < 2)
          return {
            t:
              o.n === 0
                ? 'ölen (1. Schicht)'
                : now() - o.t < 480
                  ? 'Öl trocknen lassen (noch ' + CLOCK.dur(o.t + 480 - now()) + ')'
                  : 'ölen (2. Schicht)',
            at: 'bench',
          };
        return {
          t: now() - o.t < 480 ? 'Öl aushärten lassen (noch ' + CLOCK.dur(o.t + 480 - now()) + ')' : 'fertig – nehmen',
          at: 'bench',
        };
      }
      case 'done':
        return { t: 'ins Regal stellen oder Ronald bringen', at: 'shelf' };
    }
    return null;
  }
  const gritNext = wp => ({ 0: 80, 80: 120, 120: 180, 180: 240 })[wp.grit] || 240;
  // where a station is now (site coordinates) – for the tracker and the arrow
  const posOf = key => {
    const S = ST[key];
    if (S) return WT(S.op[0], S.op[1]);
    if (key === 'shelf' || key === 'rack') return WT(RACK.op[0], RACK.op[1]);
    return null;
  };
  // the most advanced workpiece that is not finished: the player's current project
  function current() {
    const c = carriedWP();
    if (c && !c.done) return c;
    let best = null;
    for (const wp of W.list) {
      if (wp.done || wp.where === 'gone' || wp.where === 'ronald') continue;
      if (wp.where === 'rack' && wp.st === 'panel') continue;
      if (!best || (ORDER[wp.st] || 0) > (ORDER[best.st] || 0)) best = wp;
    }
    return best;
  }
  function objective() {
    const wp = current();
    if (!wp) {
      const fin = W.list.find(w => w.done && (w.where === 'inv' || w.where === 'shelf' || w.where === 'world'));
      if (fin) return ['Fertig: ' + nameOf(fin) + '.', null];
      return [
        RACK.items.length
          ? 'Hol eine Leimholzplatte Eiche aus dem Regal in der Werkstatt.'
          : 'Das Regal ist leer – Platten nachbestellen (am Regal).',
        () => posOf('rack'),
      ];
    }
    const nx = nextStep(wp);
    if (!nx) return null;
    const here = wp.where === nx.at;
    const where =
      wp.where === 'inv'
        ? ''
        : wp.where === 'rack'
          ? ' (liegt im Regal)'
          : !here && ST[wp.where]
            ? ' (liegt am ' + ST[wp.where].name + ')'
            : '';
    return [
      nameOf(wp) + ': ' + nx.t + where + '.',
      () =>
        here || wp.where === 'inv'
          ? posOf(nx.at)
          : wp.where === 'rack'
            ? posOf('rack')
            : ST[wp.where]
              ? posOf(wp.where)
              : wp.T && wp.T.state === 'world'
                ? wp.T.pos
                : posOf(nx.at),
    ];
  }
  // ---------------- operations at the stations ----------------
  const FF = n =>
    ({
      panel: 'Leimholzplatte',
      blank: 'Zuschnitt',
      strips: 'Kanteln',
      panel1: 'Leimholz',
      planed1: 'Leimholz',
      slices: 'Scheiben',
      board: 'Brett',
      flat: 'Brett',
      trimmed: 'Brett',
      finish: 'Brett',
      done: 'Schneidebrett',
    })[n] || 'Werkstück';
  const SAWPPE = ['brille|korb', 'ohr'],
    DUST = ['brille|korb', 'ohr', 'ffp2'];
  const mach = (k, on) => {
    const d = DOOR[k];
    if (d && d.target > 0.5 !== on) toggleDoor(k);
  };
  // the measuring of moisture works everywhere the meter is in the hand and a workpiece is near
  function measure(wp) {
    SFX.click();
    const v = wp.mc + (Math.random() - 0.5) * 0.3;
    think(
      nameOf(wp) +
        ': ' +
        de(v) +
        ' % Holzfeuchte – ' +
        (v < 12 ? 'trocken genug zum Verleimen und für ein Brett (8–12 %).' : 'zu feucht, erst trocknen.'),
      4200
    );
  }
  // ---- the table saw ----
  function sawOps(S) {
    const wp = S.wp,
      c = carriedWP();
    if (!wp) {
      if (c && ['panel', 'blank', 'planed1', 'flat'].includes(c.st))
        return {
          key: 'put',
          label: FF(c.st) + ' auf die Säge legen',
          run: () => {
            toStation(c, 'saw');
            openSaw();
          },
        };
      if (c && ['board'].includes(c.st))
        return {
          key: 'nope',
          label: 'Brett erst plan schleifen',
          run: () => think('Erst plan schleifen (Trommelschleifer), dann besäumen.'),
        };
      return null;
    }
    if (PLAY.carry === METER) return { key: 'm', label: 'Holzfeuchte messen', run: () => measure(wp) };
    if (wp.st === 'strips')
      return { key: 'take', label: nStrips(wp) + ' Kanteln nehmen', run: () => fromStation('saw') };
    if (wp.st === 'slices')
      return { key: 'take', label: wp.slices.length + ' Scheiben nehmen', run: () => fromStation('saw') };
    if (wp.st === 'trimmed') return { key: 'take', label: 'Besäumtes Brett nehmen', run: () => fromStation('saw') };
    if (!wp.saw || !wp.saw.ok)
      return {
        key: 'set',
        label:
          'Säge einstellen: ' +
          {
            panel: 'ablängen',
            blank: 'Kanteln',
            rip: 'Kanteln',
            planed1: 'Scheiben',
            slice: 'Scheiben',
            flat: 'besäumen',
          }[wp.st],
        run: () => openSaw(),
      };
    const m = wp.saw.mode,
      push = m === 'rip';
    const lbl = {
      cross: 'Ablängen auf 500 mm',
      rip: 'Kantel sägen ' + (wp.cut + 1) + '/' + wp.nRip,
      slice: wp.cut === 0 ? 'Ende besäumen' : 'Scheibe sägen ' + wp.cut + '/' + wp.nSl,
      trim: 'Besäumen: Seite ' + (wp.cut + 1) + '/4',
    }[m];
    return {
      key: 'cut' + m + wp.cut,
      label: lbl,
      ppe: SAWPPE,
      noGloves: true,
      what: 'Kreissäge',
      need: push ? PUSH : null,
      hold: m === 'cross' ? 2.6 : 1.9,
      holdLabel: 'Sägen …',
      anim3: 'push',
      rMove: 1.3,
      start: () => {
        mach('tablesaw', true);
        WORKS.cut.tablesaw = 1;
      },
      work: k => sawAnim(wp, k),
      cancel: () => {
        WORKS.cut.tablesaw = 0;
        render('saw');
      },
      run: () => {
        WORKS.cut.tablesaw = 0;
        sawCut(wp);
      },
    };
  }
  function openSaw() {
    const wp = ST.saw.wp;
    if (!wp) return;
    const mode = { panel: 'cross', blank: 'rip', rip: 'rip', planed1: 'slice', slice: 'slice', flat: 'trim' }[wp.st];
    const s = wp.saw || (wp.saw = { mode, h: 12, fence: 45, stop: 42, guide: 'stop', sac: false });
    s.mode = mode;
    const T = mode === 'trim' ? wp.H : formOf(wp.st) === 'B' ? wp.Zcur : 40;
    const rows = [
      {
        k: 'h',
        label: 'Blattüberstand über dem Werkstück',
        val: s.h,
        min: 0,
        max: 40,
        step: 1,
        unit: 'mm',
        hint: 'Empfohlen 5–15 mm: die Zahnlücken knapp über dem Holz.',
      },
    ];
    if (mode === 'rip')
      rows.unshift({
        k: 'fence',
        label: 'Parallelanschlag (Kantelbreite)',
        val: s.fence,
        min: 35,
        max: 60,
        step: 1,
        unit: 'mm',
        hint: 'Breite der Kanteln = später die Länge der Stirnholzfelder. Empfohlen 45 mm (8 Kanteln aus 400 mm).',
      });
    if (mode === 'slice')
      rows.unshift({
        k: 'stop',
        label: 'Längenanschlag (Scheibenbreite)',
        val: s.stop,
        min: 28,
        max: 60,
        step: 1,
        unit: 'mm',
        hint: 'Scheibenbreite = Dicke des Bretts vor dem Planschleifen. Empfohlen 42 mm.',
      });
    const choices = [];
    if (mode === 'slice')
      choices.push({
        k: 'guide',
        label: 'Anschlag für den Querschnitt',
        opts: [
          ['stop', 'Längenanschlag am Schiebeschlitten'],
          ['fence', 'Parallelanschlag'],
        ],
        val: s.guide,
      });
    if (mode === 'trim')
      choices.push({
        k: 'sac',
        label: 'Ausrissschutz',
        opts: [
          [true, 'Opferholz dahinter'],
          [false, 'ohne'],
        ],
        val: s.sac,
      });
    const title = {
      cross: 'Ablängen (Querschnitt)',
      rip: 'Kanteln (Längsschnitt)',
      slice: 'Scheiben (Querschnitt)',
      trim: 'Besäumen',
    }[mode];
    WUI.machine({
      title: 'Tischkreissäge · ' + title,
      sub: nameOf(wp) + ' · ' + dimsOf(wp),
      rows,
      choices,
      gear: { req: SAWPPE, ng: true },
      go: 'Einstellen',
      onGo: v => {
        Object.assign(s, v);
        if (s.h < 3) {
          think('Das Blatt kommt so nicht durch das Holz – mindestens ein paar Millimeter Überstand.');
          s.ok = false;
          return;
        }
        if (s.h > 25) {
          wp.safe++;
          think('Viel freies Sägeblatt über dem Holz – mehr Verletzungsgefahr, mehr Rückschlag. Besser 5–15 mm.', 4200);
        }
        s.ok = true;
        if (mode === 'rip') {
          wp.fence = s.fence;
          wp.nRip = Math.min(9, Math.floor((400 + KERF) / (s.fence + KERF)));
          if (wp.st === 'blank') {
            wp.st = 'rip';
            wp.cut = 0;
            wp.Wrem = 400;
          }
        }
        if (mode === 'slice') {
          wp.stop = s.stop;
          wp.nSl = Math.min(12, Math.floor((wp.L - 16 + KERF) / (s.stop + KERF)));
          if (wp.st === 'planed1') {
            wp.st = 'slice';
            wp.cut = 0;
          }
        }
        if (mode === 'trim') wp.cut = 0;
        if (mode === 'cross') wp.cut = 0;
        render('saw');
        changed();
      },
    });
  }
  function sawAnim(wp, k) {
    const m = ST.saw.mesh;
    if (!m) return;
    const e = k * k * (3 - 2 * k),
      md = wp.saw.mode;
    if (md === 'rip' || md === 'trim') m.position.x = 0.32 - e * 0.64;
    else m.position.x = 0.3 - e * 0.62;
    markDirty();
  }
  function sawCut(wp) {
    const s = wp.saw,
      md = s.mode;
    if (md === 'cross') {
      wp.L = 500;
      wp.st = 'blank';
      wp.saw.ok = false;
      const b = newWP('blank', {
        lam: wp.lam,
        seed: wp.seed,
        L: 500,
        u0: 500 + KERF,
        mc: wp.mc,
        fum: JSON.parse(JSON.stringify(wp.fum || {})),
      });
      rackPut(b, true);
      think('Abgelängt. Die zweite Hälfte (500 mm) lege ich ins Regal – daraus wird ein zweites Brett.', 3800);
      SFX.drop();
      mach('tablesaw', false);
    } else if (md === 'rip') {
      const v0 = 400 - wp.Wrem;
      (wp.strips || (wp.strips = [])).push({ v0, fa: false, fb: false });
      wp.Wrem -= s.fence + KERF;
      wp.cut++;
      if (wp.cut >= wp.nRip) {
        wp.st = 'strips';
        wp.Wrem = 0;
        mach('tablesaw', false);
        think(
          wp.nRip +
            ' Kanteln – der schmale Rest (' +
            Math.max(0, Math.round(400 - wp.nRip * (s.fence + KERF) + KERF)) +
            ' mm) kommt in die Restekiste.',
          3800
        );
      }
    } else if (md === 'slice') {
      if (s.guide === 'fence') {
        kickback(wp);
        return;
      }
      if (wp.cut === 0) {
        wp.cut = 1;
        wp.L -= 6;
        think('Ende besäumt: jetzt ist es rechtwinklig.', 2200);
      } else {
        (wp.slices || (wp.slices = [])).push({ flip: false });
        wp.L -= s.stop + KERF;
        wp.cut++;
        if (wp.cut > wp.nSl) {
          wp.st = 'slices';
          wp.H = s.stop;
          wp.rmT = [0, 0];
          mach('tablesaw', false);
          think(wp.nSl + ' Stirnholzscheiben à ' + s.stop + ' mm. Der Rest ist Brennholz.', 3400);
        }
      }
    } else if (md === 'trim') {
      wp.cut++;
      if (wp.cut >= 4) {
        wp.trim = true;
        wp.st = 'trimmed';
        mach('tablesaw', false);
        if (!s.sac) {
          wp.notes.push('Ausrisse an den Stirnholzkanten (ohne Opferholz besäumt)');
          think(
            'Ohne Opferholz sind an den Stirnholzkanten kleine Stücke ausgerissen. Die Fase versteckt das zum Teil.',
            4200
          );
        } else think('Sauber besäumt. Das Opferholz hat die Kanten geschützt.', 2600);
      }
    }
    render('saw');
    changed();
  }
  // kickback: the slice jams between blade and rip fence and is thrown towards the operator
  function kickback(wp) {
    wp.safe += 2;
    wp.L -= wp.stop + KERF;
    wp.saw.ok = false;
    mach('tablesaw', false);
    WORKS.cut.tablesaw = 0;
    const p = new THREE.Mesh(new THREE.BoxGeometry(M(wp.stop), M(wp.Zcur), M(nStrips(wp) * 40)), MT.beech);
    const S = ST.saw;
    p.position.copy(S.hold.position);
    p.position.y += 0.06;
    WG.add(p);
    let t = 0;
    const fn = dt => {
      t += dt;
      p.position.x += dt * 9;
      p.position.y += dt * (3 - t * 12);
      p.rotation.z += dt * 18;
      markDirty();
      if (t > 0.55) {
        WG.remove(p);
        p.geometry.dispose();
        const i = window.TICKS.indexOf(fn);
        if (i >= 0) window.TICKS.splice(i, 1);
      }
      return true;
    };
    window.TICKS.push(fn);
    SFX.chop();
    setTimeout(() => SFX.clunk(), 260);
    banner('Rückschlag!', 'Die Scheibe hat zwischen Blatt und Parallelanschlag verklemmt');
    think(
      'Rückschlag! Am Parallelanschlag verklemmt die abgeschnittene Scheibe zwischen Blatt und Anschlag und fliegt nach vorn. Beim Querschnitt immer den Längenanschlag am Schiebeschlitten nehmen.',
      6500
    );
    render('saw');
    changed();
  }
  // ---- the glue table ----
  function glueOps(S) {
    const wp = S.wp,
      c = carriedWP();
    if (!wp) {
      if (c && (c.st === 'strips' || c.st === 'slices'))
        return {
          key: 'lay',
          label: c.st === 'strips' ? 'Kanteln hochkant auslegen' : 'Scheiben drehen und auslegen',
          hold: 2.2,
          holdLabel:
            c.st === 'strips'
              ? 'Hochkant drehen, Jahresringe abwechselnd …'
              : 'Stirnholz nach oben, jede zweite wenden …',
          anim3: 'interactLoop',
          run: () => layOut(c),
        };
      if (c && ['panel', 'blank'].includes(c.st))
        return {
          key: 'nope',
          label: FF(c.st) + ': erst zur Säge',
          run: () => think('Erst an der Tischkreissäge zuschneiden und in Kanteln sägen.'),
        };
      return null;
    }
    if (PLAY.carry === METER) return { key: 'm', label: 'Holzfeuchte messen', run: () => measure(wp) };
    const g = wp.g;
    if (wp.st === 'lay1' || wp.st === 'lay2') {
      if (wp.dirty)
        return {
          key: 'dirty',
          label: 'Alte Leimreste abkratzen',
          need: SCRAPER,
          hold: 3,
          holdLabel: 'Kratzen …',
          anim3: 'push',
          run: () => {
            wp.dirty = false;
            SFX.brush();
            think('Sauber. Jetzt noch einmal vorbereiten.');
          },
        };
      return { key: 'prep', label: 'Verleimung vorbereiten', run: () => openPrep(wp) };
    }
    if (wp.st === 'glue1' || wp.st === 'glue2') {
      const tool = g.prep.tool === 'brush' ? BRUSH : ROLLER,
        left = g.t0 != null ? g.t0 + OT - now() : OT,
        lt = g.t0 != null ? ' · offen noch ' + Math.max(0, Math.ceil(left)) + ' min' : '';
      if (g.joints.length < g.nJ)
        return {
          key: 'j' + g.joints.length,
          label: 'Leim auftragen: Fuge ' + (g.joints.length + 1) + '/' + g.nJ + lt,
          need: tool,
          gauge: tool === BRUSH ? { dur: 1.7, lo: 0.6, hi: 0.82 } : { dur: 1.35, lo: 0.52, hi: 0.86 },
          holdLabel: 'Leim auftragen – im grünen Bereich stoppen',
          anim3: 'interactLoop',
          start: () => SFX.brush(),
          run: k => glueJoint(wp, k),
        };
      if (!g.pressed)
        return {
          key: 'press',
          label: (wp.st === 'glue1' ? 'Kanteln' : 'Scheiben') + ' zusammenschieben' + lt,
          hold: 1.1,
          holdLabel: 'Zusammenschieben …',
          anim3: 'push',
          run: () => {
            g.pressed = true;
            CLOCK.t += 0.4;
            render('glue');
          },
        };
      const i = g.clamps.length,
        side = i % 2 === 0 ? 'unten' : 'oben';
      if (i < 5)
        return {
          key: 'c' + i,
          label: 'Zwinge ' + (i + 1) + '/5 setzen (' + side + ')' + lt,
          gauge: { dur: 1.5, lo: 0.55, hi: 0.8 },
          holdLabel: 'Zwinge anziehen – handfest, im grünen Bereich stoppen',
          anim3: 'interactLoop',
          start: () => SFX.click(),
          run: k => clampSet(wp, k),
        };
      return null;
    }
    if (wp.st === 'clamp1' || wp.st === 'clamp2') {
      const late = now() - g.tc;
      if (g.prep.cauls && !g.cauls && late < 5)
        return {
          key: 'cauls',
          label: 'Zulagen setzen (Ober- und Niederhalter)',
          hold: 2.2,
          holdLabel: 'Zulagen auflegen und zwingen …',
          anim3: 'interactLoop',
          start: () => SFX.clamp(),
          run: () => {
            g.cauls = true;
            CLOCK.t += 1.2;
            unfocus();
            render('glue');
            think(
              'Die Zulagen halten ' +
                (wp.st === 'clamp1' ? 'die Kanteln' : 'die Scheiben') +
                ' bündig. Jetzt trocknen lassen.',
              3000
            );
          },
        };
      const left = g.tc + PRESS - now();
      if (left > 0)
        return {
          key: 'wait',
          label: 'Leim zieht an – noch ' + CLOCK.dur(left) + ' (warten)',
          run: () => {
            unfocus();
            CLOCK.wait(left + 0.2, 'Leim trocknet');
          },
        };
      return {
        key: 'open',
        label: 'Zwingen lösen',
        hold: 2.4,
        holdLabel: 'Zwingen lösen …',
        anim3: 'interactLoop',
        start: () => SFX.clamp(),
        run: () => unclamp(wp),
      };
    }
    if (['panel1', 'board'].includes(wp.st) || wp.st === 'planed1')
      return { key: 'take', label: FF(wp.st) + ' nehmen', run: () => fromStation('glue') };
    return { key: 'take', label: nameOf(wp) + ' nehmen', run: () => fromStation('glue') };
  }
  function layOut(wp) {
    toStation(wp, 'glue');
    if (wp.st === 'strips') {
      wp.st = 'lay1';
      wp.strips.forEach((s, i) => {
        s.fb = i % 2 === 1;
        s.fa = false;
      });
      wp.Zcur = wp.fence;
      wp.rmB = [0, 0];
      wp.rmT = [0, 0];
      think(
        'Kanteln hochkant: die Werksflächen der Platte sind jetzt die Leimflächen. Jahresringe abwechselnd, Schreinerdreieck drauf.',
        4200
      );
    } else {
      wp.st = 'lay2';
      wp.slices.forEach((s, j) => {
        s.flip = j % 2 === 1;
      });
      wp.rmT = [0, 0];
      wp.rmB = [0, 0];
      think('Stirnholz nach oben, jede zweite Scheibe gewendet – die Kanteln versetzen sich zum Muster.', 3800);
    }
    render('glue');
    changed();
  }
  function openPrep(wp) {
    const first = wp.st === 'lay1',
      p = wp.prepLast || { dry: false, foil: false, cauls: false, tool: 'roller', glue: 'D3' };
    WUI.machine({
      title: (first ? 'Erste' : 'Zweite') + ' Verleimung vorbereiten',
      sub: nameOf(wp) + ' · ' + (first ? nStrips(wp) - 1 : wp.slices.length - 1) + ' Fugen',
      choices: [
        {
          k: 'glue',
          label: 'Leim',
          opts: [
            ['D3', 'D3 – wasserfest'],
            ['D2', 'D2 – Innenraum'],
          ],
          val: p.glue,
          hint: 'Schneidebretter werden gespült: D3.',
        },
        {
          k: 'tool',
          label: 'Leimauftrag',
          opts: [
            ['roller', 'Leimroller'],
            ['brush', 'Pinsel'],
          ],
          val: p.tool,
          hint: 'Die Rolle ist schneller – die offene Zeit des Leims ist begrenzt (ca. 12 min).',
        },
      ],
      checks: [
        {
          k: 'dry',
          label: 'Trockenprobe: alle Zwingen eingestellt bereitlegen',
          val: p.dry,
          hint: 'Wer erst beim Spannen Zwingen sucht, verliert Minuten offene Zeit.',
        },
        {
          k: 'foil',
          label: 'Folie/Klebeband auf die Zwingenschienen',
          val: p.foil,
          hint: 'Gerbsäure der Eiche + Eisen + nasser Leim = blauschwarze Flecken.',
        },
        {
          k: 'cauls',
          label: 'Zulagen (Ober- und Niederhalter) mit Klebeband bereitlegen',
          val: p.cauls,
          hint: 'Halten die Teile beim Spannen bündig – weniger Abnahme beim Hobeln und Schleifen.',
        },
      ],
      go: 'Fertig vorbereitet',
      onGo: v => {
        const prep = Object.assign({}, p, v);
        wp.prepLast = prep;
        const n = first ? nStrips(wp) : wp.slices.length;
        wp.g = { prep, nJ: n - 1, joints: [], clamps: [], pressed: false, cauls: false, t0: null, tc: null, fail: [] };
        wp.st = first ? 'glue1' : 'glue2';
        if (wp.fum && wp.airT != null && now() - wp.airT < 1440) wp.g.amm = true;
        render('glue');
        changed();
        think(
          prep.dry
            ? 'Alles bereit. Ab dem ersten Leimauftrag läuft die Uhr in Echtzeit.'
            : 'Ab dem ersten Leimauftrag läuft die Uhr in Echtzeit – die offene Zeit des Leims ist echt.',
          3600
        );
      },
    });
  }
  function glueJoint(wp, k) {
    const g = wp.g,
      lo = g.prep.tool === 'brush' ? 0.6 : 0.52,
      hi = g.prep.tool === 'brush' ? 0.82 : 0.86;
    if (g.t0 == null) {
      g.t0 = now();
      CLOCK.focus('glue');
    }
    CLOCK.t += g.prep.tool === 'brush' ? 0.9 : 0.6;
    const q = k < lo ? 'mager' : k > hi ? 'viel' : 'gut';
    g.joints.push({ t: now(), q });
    if (q === 'mager') think('Zu wenig Leim – die Fuge kann „verhungern“. Deckend, aber dünn.', 2600);
    else if (q === 'viel') think('Reichlich Leim – das gibt viel Leimaustritt zum Abkratzen.', 2200);
    else SFX.brush();
    render('glue');
  }
  function clampSet(wp, k) {
    const g = wp.g;
    if (!g.clamps.length && !g.prep.dry) {
      CLOCK.t += 3;
      think('Ohne Trockenprobe: die Zwingen erst einstellen und zusammensuchen … das kostet offene Zeit.', 3600);
    }
    CLOCK.t += 0.5;
    const q = k < 0.55 ? 'locker' : k > 0.8 ? 'fest' : 'gut';
    g.clamps.push({ q, t: now() });
    SFX.clamp();
    if (q === 'locker') think('Zu locker – die Fuge schließt nicht ganz.', 2200);
    else if (q === 'fest') think('Zu fest! Der Leim wird herausgepresst, die Platte kann sich wölben.', 2600);
    if (g.clamps.length >= 5) {
      g.tc = now();
      wp.st = wp.st === 'glue1' ? 'clamp1' : 'clamp2';
      wp.sq = true;
      g.fail = [];
      g.joints.forEach((j, i) => {
        if (g.tc - j.t > OT) g.fail.push(i);
      });
      if (g.fail.length)
        think(
          'Fuge ' +
            g.fail.map(i => i + 1).join(', ') +
            ': der Leim war schon angezogen, bevor der Druck kam. Die hält nicht.',
          5200
        );
      else if (!g.prep.cauls) {
        unfocus();
        think(
          'Gespannt. Ohne Zulagen verschieben sich die Teile leicht gegeneinander – mehr Arbeit beim Hobeln.',
          3600
        );
      } else think('Gespannt. Jetzt die Zulagen, solange der Leim noch nicht angezogen hat.', 3000);
      if (g.fail.length) unfocus();
    }
    render('glue');
  }
  function unfocus() {
    CLOCK.unfocus('glue');
  }
  function unclamp(wp) {
    const g = wp.g,
      first = wp.st === 'clamp1';
    unfocus();
    const lean = g.joints.filter(j => j.q === 'mager').length,
      loose = g.clamps.filter(c => c.q === 'locker').length,
      hard = g.clamps.filter(c => c.q === 'fest').length;
    if (g.fail.length) {
      wp.st = first ? 'lay1' : 'lay2';
      wp.dirty = true;
      wp.sq = false;
      wp.g = null;
      think(
        'Die Verleimung fällt an ' +
          (g.fail.length === 1 ? 'einer Fuge' : g.fail.length + ' Fugen') +
          ' auseinander. Leimreste abkratzen und neu verleimen – diesmal schneller.',
        5200
      );
      render('glue');
      changed();
      return;
    }
    const u = 0.25 + (g.cauls ? 0 : 0.9) + hard * 0.12 + (g.prep.dry ? 0 : 0.1);
    const bad = [];
    g.joints.forEach((j, i) => {
      if (j.q === 'mager') bad.push(i + 1);
    });
    if (loose && bad.length < g.nJ) bad.push(Math.min(g.nJ, 1 + ((g.nJ / 2) | 0)));
    if (first) {
      wp.st = 'panel1';
      wp.need = [Math.max(0.5, u + 0.2), Math.max(0.5, u + 0.2)];
      wp.Z = wp.Zcur;
      wp.stainB = !g.prep.foil;
      wp.badJ1 = bad;
      wp.g1 = { glue: g.prep.glue, amm: !!g.amm, lean, loose, hard, cauls: g.cauls, tool: g.prep.tool };
    } else {
      wp.st = 'board';
      wp.face = 0;
      wp.need = [Math.max(0.3, u), Math.max(0.3, u)];
      wp.stainC = g.prep.foil ? 0 : 1.1;
      if (wp.stainC) wp.need = wp.need.map(n => Math.max(n, 1.1));
      wp.badJ2 = bad;
      wp.g2 = { glue: g.prep.glue, amm: !!g.amm, lean, loose, hard, cauls: g.cauls, tool: g.prep.tool };
      wp.rmT = [0, 0];
    }
    wp.tc = g.tc;
    wp.g = null;
    render('glue');
    const tips = [];
    if (!g.prep.foil) tips.push('schwarze Eisenflecken, wo die Zwingen auflagen');
    if (!g.cauls) tips.push('die Teile stehen etwas versetzt');
    if (lean) tips.push('an ' + lean + ' Fuge(n) war der Leim knapp');
    think(
      'Zwingen gelöst. Leimaustritt ist da – gut so.' + (tips.length ? ' Aber: ' + tips.join(', ') + '.' : ''),
      4600
    );
    changed();
  }
  // ---- the thickness planer ----
  function planerOps(S) {
    const wp = S.wp,
      c = carriedWP();
    if (!wp) {
      if (!c) return null;
      if (formOf(c.st) === 'C' && c.st !== 'slices')
        return {
          key: 'no',
          label: 'Stirnholz in den Dickenhobel? Nein!',
          run: () => {
            c.safe++;
            banner('Nie Stirnholz hobeln', 'Kanten reißen aus, Teile fliegen');
            think(
              'Stirnholz nie durch den Dickenhobel: die Messer reißen die Kanten aus, ganze Stücke können herausgeschleudert werden. Planschleifen am Trommelschleifer.',
              6000
            );
          },
        };
      if (c.st === 'panel1') {
        if (c.sq)
          return {
            key: 'sq',
            label: 'Erst den Leim abkratzen',
            run: () =>
              think(
                'Getrockneter Leim ist hart wie Glas und macht die Hobelmesser schartig. Erst mit der Ziehklinge abkratzen (Hobelbank).',
                4200
              ),
          };
        if (now() - c.tc < CURE)
          return {
            key: 'cure',
            label: 'Leim noch zu frisch (noch ' + CLOCK.dur(c.tc + CURE - now()) + ')',
            run: () => {
              think(
                'Der Leim braucht mindestens 2 Stunden, bevor gehobelt wird – sonst schmiert er und die Fugen können aufgehen.',
                4200
              );
              CLOCK.wait(c.tc + CURE - now() + 0.5, 'Leim härtet');
            },
          };
        return {
          key: 'put',
          label: 'Leimholz auf den Dickenhobel legen',
          run: () => {
            toStation(c, 'planer');
            openPlaner();
          },
        };
      }
      return null;
    }
    if (PLAY.carry === METER) return { key: 'm', label: 'Holzfeuchte messen', run: () => measure(wp) };
    if (wp.rmT[0] >= wp.need[0] - 1e-6 && wp.rmT[1] >= wp.need[1] - 1e-6)
      return {
        key: 'take',
        label: 'Leimholz nehmen (' + de(wp.Zcur) + ' mm, sauber)',
        run: () => {
          wp.st = 'planed1';
          wp.Z = wp.Zcur;
          fromStation('planer');
        },
      };
    if (!wp.pl || !wp.pl.ok) return { key: 'set', label: 'Dickenhobel einstellen', run: () => openPlaner() };
    const f = wp.face,
      r = wp.pl.r;
    return {
      key: 'pass' + wp.rmT.join(),
      label: 'Hobeln: ' + (f === 0 ? 'Oberseite' : 'Unterseite') + ' −' + de(r) + ' mm',
      ppe: SAWPPE,
      noGloves: true,
      what: 'Hobelmaschine',
      hold: 2.8,
      holdLabel: 'Durchlauf …',
      anim3: 'push',
      rMove: 1.3,
      start: () => {
        mach('thick', true);
        WORKS.cut.thick = 1;
      },
      work: k => {
        const m = ST.planer.mesh;
        if (m) {
          m.position.x = 0.85 - k * 1.7;
          markDirty();
        }
      },
      cancel: () => {
        WORKS.cut.thick = 0;
        render('planer');
      },
      run: () => {
        WORKS.cut.thick = 0;
        planePass(wp);
      },
    };
  }
  function openPlaner() {
    const wp = ST.planer.wp;
    if (!wp) return;
    const p = wp.pl || (wp.pl = { r: 1.0 });
    WUI.machine({
      title: 'Dickenhobel',
      sub: nameOf(wp) + ' · ' + dimsOf(wp),
      rows: [
        {
          k: 'r',
          label: 'Abnahme je Durchgang',
          val: p.r,
          min: 0.2,
          max: 3,
          step: 0.1,
          unit: 'mm',
          hint: 'Bei 320 mm breiter Eiche höchstens 1 mm. Die Platte nach jedem Durchgang wenden.',
        },
      ],
      info:
        'Oberseite: ' +
        faceTxt(wp, 0) +
        ' · Unterseite: ' +
        faceTxt(wp, 1) +
        ' · Durchlassbreite 330 mm – 320 mm passen gerade.',
      gear: { req: SAWPPE, ng: true },
      go: 'Einstellen',
      onGo: v => {
        Object.assign(p, v);
        p.ok = true;
        changed();
      },
    });
  }
  const faceTxt = (wp, f) => (wp.rmT[f] >= wp.need[f] - 1e-6 ? 'sauber' : 'noch ' + de(wp.need[f] - wp.rmT[f]) + ' mm');
  function planePass(wp) {
    const f = wp.face,
      r = wp.pl.r;
    if (r > 1.5) {
      wp.need[f] += 0.3;
      think(
        'Zu viel Abnahme bei 32 cm breiter Eiche – der Motor geht in die Knie, die Walzen rutschen, Ausrisse. Höchstens 1 mm!',
        4600
      );
      mach('thick', false);
      render('planer');
      changed();
      return;
    }
    if (r > 1.0 && Math.random() < 0.4) {
      wp.need[f] += 0.25;
      think('Ausriss an einer Kante – zu viel auf einmal. Noch einmal fein nachhobeln.', 3200);
    }
    wp.rmT[f] += r;
    wp.Zcur -= r;
    if (f === 1) wp.rmB[1] += r;
    wp.face = 1 - f;
    const done = wp.rmT[0] >= wp.need[0] - 1e-6 && wp.rmT[1] >= wp.need[1] - 1e-6;
    if (done) {
      mach('thick', false);
      think(
        'Beide Seiten sauber: ' +
          de(wp.Zcur) +
          ' mm.' +
          (wp.stainB ? ' Die Eisenflecken sind mit weggehobelt – Glück gehabt. Nächstes Mal Folie unterlegen.' : ''),
        4000
      );
      wp.stainB = false;
    }
    if (wp.Zcur < 32) {
      wp.notes.push('Leimholz sehr dünn gehobelt (' + de(wp.Zcur) + ' mm)');
    }
    render('planer');
    changed();
  }
  // ---- the drum sander ----
  function sanderOps(S) {
    const wp = S.wp,
      c = carriedWP();
    if (!wp) {
      if (!c) return null;
      if (c.st === 'board') {
        if (c.sq)
          return {
            key: 'sq',
            label: 'Erst den Leim abkratzen',
            run: () =>
              think('Getrockneter Leim verklebt das Schleifpapier sofort. Erst mit der Ziehklinge abkratzen.', 3600),
          };
        if (now() - c.tc < CURE)
          return {
            key: 'cure',
            label: 'Leim noch zu frisch (noch ' + CLOCK.dur(c.tc + CURE - now()) + ')',
            run: () => CLOCK.wait(c.tc + CURE - now() + 0.5, 'Leim härtet'),
          };
        return {
          key: 'put',
          label: 'Brett auf den Trommelschleifer legen',
          run: () => {
            toStation(c, 'sander');
            openSander();
          },
        };
      }
      return null;
    }
    if (PLAY.carry === METER) return { key: 'm', label: 'Holzfeuchte messen', run: () => measure(wp) };
    if (wp.rmT[0] >= wp.need[0] - 1e-6 && wp.rmT[1] >= wp.need[1] - 1e-6)
      return {
        key: 'take',
        label: 'Brett nehmen (plan, ' + de(wp.H) + ' mm)',
        run: () => {
          wp.st = 'flat';
          wp.grit = 80;
          fromStation('sander');
        },
      };
    if (!wp.sd || !wp.sd.ok) return { key: 'set', label: 'Trommelschleifer einstellen', run: () => openSander() };
    const f = wp.face,
      r = wp.sd.r;
    return {
      key: 'pass' + wp.rmT.join(),
      label: 'Planschleifen: ' + (f === 0 ? 'Oberseite' : 'Unterseite') + ' −' + de(r) + ' mm',
      ppe: DUST,
      noGloves: true,
      what: 'Schleifmaschine',
      hold: 2.6,
      holdLabel: 'Durchlauf …',
      anim3: 'push',
      rMove: 1.3,
      start: () => {
        mach('sander', true);
        WORKS.cut.sander = 1;
      },
      work: k => {
        const m = ST.sander.mesh;
        if (m) {
          m.position.z = -0.75 + k * 1.5;
          markDirty();
        }
      },
      cancel: () => {
        WORKS.cut.sander = 0;
        render('sander');
      },
      run: () => {
        WORKS.cut.sander = 0;
        sandPass(wp);
      },
    };
  }
  function openSander() {
    const wp = ST.sander.wp;
    if (!wp) return;
    const p = wp.sd || (wp.sd = { r: 0.3 });
    WUI.machine({
      title: 'Trommelschleifer · K80',
      sub: nameOf(wp) + ' · ' + dimsOf(wp),
      rows: [
        {
          k: 'r',
          label: 'Abnahme je Durchgang',
          val: p.r,
          min: 0.1,
          max: 1.0,
          step: 0.05,
          unit: 'mm',
          hint: 'Stirnholz höchstens 0,3–0,5 mm: sonst wird es heiß und verbrennt.',
        },
      ],
      info:
        'Oberseite: ' +
        faceTxt(wp, 0) +
        ' · Unterseite: ' +
        faceTxt(wp, 1) +
        (wp.stainC ? ' · Eisenflecken müssen raus (ca. 1 mm).' : ''),
      gear: { req: DUST, ng: true },
      go: 'Einstellen',
      onGo: v => {
        Object.assign(p, v);
        p.ok = true;
        changed();
      },
    });
  }
  function sandPass(wp) {
    const f = wp.face,
      r = wp.sd.r;
    if (r > 0.8) {
      think('Viel zu viel – die Trommel würgt ab, der Vorschub bleibt stehen, das Stirnholz verbrennt.', 4000);
      wp.burn = Math.max(wp.burn, 0.6);
      wp.need[f] = Math.max(wp.need[f], wp.rmT[f] + 0.6);
      mach('sander', false);
      render('sander');
      changed();
      return;
    }
    if (r > 0.5) {
      const b = (r - 0.5) * 1.6;
      wp.burn = Math.max(wp.burn, b);
      wp.need[f] = Math.max(wp.need[f], wp.rmT[f] + r + b);
      think('Brandflecken! Stirnholz verträgt nicht so viel Abnahme. Mit wenig Abnahme wieder herausschleifen.', 3800);
    } else if (wp.burn > 0) wp.burn = Math.max(0, wp.burn - r);
    wp.rmT[f] += r;
    wp.H -= r;
    wp.face = 1 - f;
    if (wp.rmT[0] >= wp.need[0] - 1e-6 && wp.rmT[1] >= wp.need[1] - 1e-6) {
      mach('sander', false);
      wp.burn = 0;
      think(
        'Plan. Das Brett ist jetzt ' +
          de(wp.H) +
          ' mm dick.' +
          (wp.stainC ? ' Die Eisenflecken sind herausgeschliffen.' : ''),
        3200
      );
    }
    render('sander');
    changed();
  }
  // ---- the carpenter's bench: scraping, chamfering, sanding, raising the grain, oil, brand ----
  function benchOps(S) {
    const wp = S.wp,
      c = carriedWP();
    if (!wp) {
      if (c && (c.sq || ['trimmed', 'finish'].includes(c.st)))
        return { key: 'put', label: FF(c.st) + ' auf die Hobelbank legen', run: () => toStation(c, 'bench') };
      return null;
    }
    if (PLAY.carry === METER) return { key: 'm', label: 'Holzfeuchte messen', run: () => measure(wp) };
    if (wp.sq) {
      const side = wp.scr ? 'Unterseite' : 'Oberseite';
      return {
        key: 'scrape' + (wp.scr || 0),
        label: 'Leim abkratzen: ' + side,
        need: SCRAPER,
        hold: 2.6,
        holdLabel: 'Ziehklinge …',
        anim3: 'push',
        start: () => SFX.brush(),
        run: () => {
          wp.scr = (wp.scr || 0) + 1;
          if (wp.scr >= 2) {
            wp.sq = false;
            wp.scr = 0;
            think(
              'Leim ab. ' +
                (wp.st === 'panel1'
                  ? 'Jetzt in den Dickenhobel.'
                  : 'Jetzt plan schleifen (Trommelschleifer) – nicht in den Dickenhobel!'),
              3000
            );
          }
          render('bench');
        },
      };
    }
    if (wp.st === 'panel1' || wp.st === 'board')
      return { key: 'take', label: FF(wp.st) + ' nehmen', run: () => fromStation('bench') };
    if (wp.st === 'trimmed')
      return {
        key: 'cham',
        label: 'Kanten fasen (Blockhobel)',
        need: PLANE,
        hold: 3.2,
        holdLabel: 'Fase anhobeln, von außen zur Mitte …',
        anim3: 'push',
        run: () => {
          wp.cham = true;
          wp.st = 'finish';
          wp.grit = Math.max(wp.grit, 80);
          think('Fase rundum. Stirnholzkanten immer von den Ecken zur Mitte hobeln, sonst platzen sie aus.', 3600);
          render('bench');
        },
      };
    if (wp.st === 'finish') {
      const o = wp.oil;
      if (wp.grit < 240) {
        if (wp.grit >= 180 && !wp.raised)
          return {
            key: 'wet',
            label: 'Wässern (Schwamm)',
            need: SPONGE,
            hold: 2,
            holdLabel: 'Feucht abwischen …',
            anim3: 'interactLoop',
            run: () => {
              wp.raised = true;
              wp.wetT = now();
              think('Die Fasern stellen sich auf. 30 Minuten trocknen lassen, dann K240.', 3000);
              render('bench');
            },
          };
        if (wp.raised && now() - wp.wetT < 30) {
          const left = wp.wetT + 30 - now();
          return {
            key: 'wwait',
            label: 'Trocknet noch ' + CLOCK.dur(left) + ' (warten)',
            run: () => CLOCK.wait(left + 0.2, 'Holz trocknet'),
          };
        }
        return { key: 'grit' + wp.grit, label: 'Schleifen: Körnung wählen', run: () => openGrit(wp) };
      }
      if (!wp.brand) {
        if (wp.heatT == null)
          return {
            key: 'heat',
            label: 'Brandeisen anheizen',
            need: BRAND,
            hold: 1,
            holdLabel: 'Einstecken …',
            anim3: 'interact',
            run: () => {
              wp.heatT = now();
              think('Das Brandeisen braucht etwa 5 Minuten.');
            },
          };
        if (now() - wp.heatT < 5) {
          const left = wp.heatT + 5 - now();
          return {
            key: 'hwait',
            label: 'Brandeisen heizt (noch ' + CLOCK.dur(left) + ')',
            run: () => CLOCK.wait(left + 0.1, 'Brandeisen heizt'),
          };
        }
        return {
          key: 'brand',
          label: 'Klingenholz-Zeichen einbrennen',
          need: BRAND,
          gauge: { dur: 3, lo: 0.5, hi: 0.72 },
          holdLabel: 'Drücken – im grünen Bereich abheben',
          anim3: 'interactLoop',
          start: () => SFX.sizzle(),
          run: k => {
            wp.brand = k < 0.5 ? 0.55 + k * 0.5 : k > 0.72 ? 0.85 : 1;
            if (k < 0.5) wp.notes.push('Brandzeichen etwas blass');
            if (k > 0.72) wp.notes.push('Brandzeichen mit verkohltem Rand');
            think(
              k < 0.5
                ? 'Etwas blass – aber lesbar.'
                : k > 0.72
                  ? 'Zu lange – der Rand ist verkohlt, es qualmt.'
                  : 'Sauber eingebrannt: KLINGENHOLZ.',
              2600
            );
            render('bench');
          },
        };
      }
      if (o.rag)
        return {
          key: 'rag',
          label: 'Öllappen in den Metalleimer mit Wasser',
          hold: 1,
          holdLabel: 'Lappen versenken …',
          anim3: 'interact',
          run: () => {
            o.rag = false;
            SFX.drop();
            think('Sicher. Ölgetränkte Lappen können sich beim Trocknen von selbst entzünden.', 3200);
          },
        };
      if (!o.wiped) {
        if (now() - o.t < 20) {
          const left = o.t + 20 - now();
          return {
            key: 'soak',
            label: 'Öl zieht ein (noch ' + CLOCK.dur(left) + ')',
            run: () => CLOCK.wait(left + 0.1, 'Öl zieht ein'),
          };
        }
        return {
          key: 'wipe',
          label: 'Überschüssiges Öl abnehmen',
          need: OIL,
          hold: 2,
          holdLabel: 'Abreiben …',
          anim3: 'interactLoop',
          run: () => {
            o.wiped = true;
            o.rag = true;
            o.t = now();
            render('bench');
          },
        };
      }
      if (o.n < 2) {
        if (o.n === 1 && now() - o.t < 480) {
          const left = o.t + 480 - now();
          return {
            key: 'cure',
            label: 'Öl trocknet (noch ' + CLOCK.dur(left) + ', warten)',
            run: () => CLOCK.wait(left + 0.5, 'Öl trocknet'),
          };
        }
        return {
          key: 'oil' + o.n,
          label: 'Ölen: ' + (o.n + 1) + '. Schicht',
          need: OIL,
          ppe: ['nitril'],
          hold: 3,
          holdLabel: 'Öl satt auftragen …',
          anim3: 'interactLoop',
          start: () => SFX.brush(),
          run: () => {
            o.n++;
            o.t = now();
            o.wiped = false;
            wp.done = false;
            render('bench');
            think(
              o.n === 1
                ? 'Das Stirnholz trinkt das Öl regelrecht. 20 Minuten einziehen lassen.'
                : 'Zweite Schicht. Wieder 20 Minuten.',
              2800
            );
          },
        };
      }
      if (now() - o.t < 480) {
        const left = o.t + 480 - now();
        return {
          key: 'cure2',
          label: 'Öl härtet aus (noch ' + CLOCK.dur(left) + ', warten)',
          run: () => CLOCK.wait(left + 0.5, 'Öl härtet'),
        };
      }
      return { key: 'fin', label: 'Schneidebrett fertig – nehmen', run: () => finish(wp) };
    }
    return { key: 'take', label: nameOf(wp) + ' nehmen', run: () => fromStation('bench') };
  }
  function openGrit(wp) {
    const nx = gritNext(wp);
    WUI.machine({
      title: 'Exzenterschleifer',
      sub: nameOf(wp) + ' · zuletzt ' + (wp.grit ? 'K' + wp.grit : '–'),
      choices: [
        {
          k: 'g',
          label: 'Körnung',
          opts: [80, 120, 180, 240].map(g => [g, 'K' + g]),
          val: nx,
          hint: 'Nicht überspringen: jede Körnung nimmt die Kratzer der vorigen.',
        },
      ],
      gear: { req: ['brille|korb', 'ffp2'], ng: false },
      go: 'Schleifen',
      onGo: v => {
        const g = +v.g;
        if (g <= wp.grit && wp.grit) {
          think('Diese Körnung war schon dran.');
          return;
        }
        if (!GEAR.check(['brille|korb', 'ffp2'], false)) return;
        if (!needTool(SANDER)) return;
        PLAY.run(
          syn(
            {
              key: 'sand' + g,
              free: true,
              label: 'Schleifen K' + g,
              hold: 3.2,
              holdLabel: 'Schleifen K' + g + ' …',
              anim3: 'interactLoop',
              rMove: 1.2,
              start: () => {
                WORKS.orbit = 1;
              },
              cancel: () => {
                WORKS.orbit = 0;
              },
              run: () => {
                WORKS.orbit = 0;
                const order = [0, 80, 120, 180, 240],
                  skip = order.indexOf(g) - order.indexOf(wp.grit) > 1;
                if (skip) {
                  wp.notes.push('K' + wp.grit + ' → K' + g + ' übersprungen: feine Kratzer bleiben');
                  think('Körnung übersprungen – die Kratzer der groben Körnung bleiben sichtbar.', 3200);
                }
                if (g === 240 && !wp.raised) {
                  wp.notes.push('nicht gewässert: nach dem ersten Spülen rau');
                  think('Nicht gewässert – nach dem ersten Spülen stellen sich die Fasern auf.', 3200);
                }
                wp.grit = g;
                render('bench');
                changed();
              },
            },
            ST.bench
          )
        );
      },
    });
  }
  function finish(wp) {
    wp.st = 'done';
    wp.done = true;
    wp.bn = W.boards = (W.boards || 0) + 1;
    const st = stars(wp);
    wp.stars = st;
    fromStation('bench', true);
    SFX.chime();
    banner('Schneidebrett fertig', nameOf(wp) + ' · ' + '★'.repeat(st) + '☆'.repeat(5 - st));
    think(starsTxt(wp), 7000);
    W.quality.push({ n: wp.n, stars: st, t: now() });
    changed();
    if (window.QUESTS && QUESTS.boardMade) QUESTS.boardMade();
  }
  // quality: five stars, minus what went wrong
  function stars(wp) {
    let s = 5;
    const g1 = wp.g1 || {},
      g2 = wp.g2 || {};
    if (g1.glue === 'D2' || g2.glue === 'D2') {
      s -= 1;
      wp.notes.push('D2-Leim: nicht wasserfest – die Fugen öffnen sich beim Spülen');
    }
    if ((g1.lean || 0) + (g2.lean || 0) + (g1.loose || 0) + (g2.loose || 0) > 1) s -= 1;
    if (g1.amm || g2.amm) {
      s -= 1;
      wp.notes.push('Ammoniakreste beim Verleimen: Weißleim härtet schlecht');
    }
    if (wp.notes.some(n => /übersprungen|gewässert/.test(n))) s -= 1;
    if (wp.notes.some(n => /Ausriss|verkohlt|blass/.test(n))) s -= 0.5;
    if (wp.safe > 0) s -= 1;
    return Math.max(1, Math.min(5, Math.round(s)));
  }
  const starsTxt = wp =>
    (wp.stars ? '★'.repeat(wp.stars) + '☆'.repeat(5 - wp.stars) + ' ' : '') +
    (wp.notes.length ? 'Anmerkungen: ' + wp.notes.join('; ') + '.' : 'Saubere Arbeit – nichts zu beanstanden.') +
    (wp.safe ? ' Sicherheit: ' + wp.safe + ' Beinahe-Unfall' + (wp.safe > 1 ? 'e' : '') + '.' : '');
  // ---- the fuming tent ----
  const fumable = wp =>
    !(wp.oil && wp.oil.n > 0) &&
    !['lay1', 'glue1', 'clamp1', 'lay2', 'glue2', 'clamp2', 'rip', 'slice', 'done'].includes(wp.st);
  function tentOps(S) {
    const wp = S.wp,
      c = carriedWP(),
      amm = TENT.amm > 0.05;
    if (!wp) {
      if (c && fumable(c)) return { key: 'in', label: FF(c.st) + ' ins Räucherzelt legen', run: () => tentIn(c) };
      if (c && c.oil && c.oil.n)
        return {
          key: 'no',
          label: 'Geöltes Holz räuchert nicht',
          run: () =>
            think(
              'Öl versiegelt die Poren – Ammoniak kommt nicht mehr an die Gerbsäure. Räuchern immer vor dem Ölen.',
              3600
            ),
        };
      return null;
    }
    if (TENT.open && !amm && TENT.airT == null)
      return {
        key: 'amm',
        label: 'Ammoniak einfüllen, Zelt schließen',
        need: AMMO,
        ppe: ['korb', 'abek', 'nitril'],
        hold: 2.4,
        holdLabel: 'Salmiakgeist in die Schale …',
        anim3: 'pour',
        run: () => {
          TENT.amm = 1;
          TENT.open = false;
          TENT.t0 = now();
          render('tent');
          think(
            'Zelt zu. Bei 15 °C dauert es: nach einem Tag mittelbraun, nach drei Tagen dunkel. Die Schale täglich erneuern.',
            4600
          );
        },
      };
    if (!TENT.open) {
      const H = fumeH(wp),
        col =
          H < 6
            ? 'kaum verändert'
            : H < 18
              ? 'hellbraun'
              : H < 40
                ? 'mittelbraun'
                : H < 70
                  ? 'dunkelbraun'
                  : 'sehr dunkel';
      if (TENT.amm < 0.3)
        return {
          key: 'refill',
          label: 'Schale nachfüllen (Ammoniak fast verbraucht)',
          need: AMMO,
          ppe: ['korb', 'abek', 'nitril'],
          hold: 2,
          holdLabel: 'Nachfüllen …',
          anim3: 'pour',
          run: () => {
            TENT.amm = 1;
            think('Neue Schale. Weiter geht’s.');
          },
        };
      if (H >= 18)
        return {
          key: 'air',
          label: 'Zelt öffnen und lüften (' + col + ')' + (COARSE ? '' : ' · Q: weiter räuchern'),
          ppe: ['korb', 'abek'],
          hold: 1.2,
          holdLabel: 'Reißverschluss auf …',
          anim3: 'interact',
          run: () => {
            TENT.open = true;
            TENT.amm = 0;
            TENT.airT = now();
            render('tent');
            think('Lüften: 30 Minuten Abstand halten, der Dampf zieht ab.', 3000);
          },
        };
      return {
        key: 'wait',
        label: 'Räuchert seit ' + CLOCK.dur(now() - TENT.t0) + ' (' + col + ') · 12 h warten',
        run: () => CLOCK.wait(720, 'Räuchern'),
      };
    }
    if (TENT.airT != null && now() - TENT.airT < 30) {
      const left = TENT.airT + 30 - now();
      return {
        key: 'airing',
        label: 'Zelt lüftet (noch ' + CLOCK.dur(left) + ')',
        run: () => CLOCK.wait(left + 0.2, 'Lüften'),
      };
    }
    return {
      key: 'out',
      label: FF(wp.st) + ' herausnehmen',
      ppe: TENT.airT == null ? ['korb', 'abek'] : null,
      run: () => {
        TENT.airT = null;
        wp.airT = now();
        fromStation('tent');
        think('Geräuchert. Vor dem Verleimen 24 h auslüften lassen – Ammoniakreste stören den Weißleim.', 3800);
      },
    };
  }
  function tentIn(wp) {
    const go = sel => {
      wp.fumSel = sel;
      toStation(wp, 'tent');
      render('tent');
      changed();
    };
    if (wp.st === 'slices')
      WUI.machine({
        title: 'Räucherzelt',
        sub: wp.slices.length + ' Stirnholzscheiben',
        choices: [
          {
            k: 'sel',
            label: 'Welche Scheiben?',
            opts: [
              ['all', 'Alle'],
              ['alt', 'Jede zweite (Streifen)'],
            ],
            val: 'alt',
            hint: 'Durch das Stirnholz zieht der Ammoniak tief ein – nach einem Tag sind 42 mm fast durchgefärbt.',
          },
        ],
        go: 'Ins Zelt legen',
        onGo: v => go(v.sel),
      });
    else go('all');
  }
  const fumeH = wp => {
    const F = wp.fum || {};
    return Math.max(F.P || 0, F.S || 0, F.G ? F.G.H : 0, F.B ? F.B.H : 0, ...(F.sl || []).map(r => (r ? r.H : 0)));
  };
  // the fuming runs with the clock: H grows with the strength of the ammonia (which is used up within about a day)
  function fumeTick(dh) {
    const wp = ST.tent.wp;
    if (!wp || TENT.open || TENT.amm <= 0.02) return;
    const k = dh * TENT.amm * 0.85;
    TENT.amm *= Math.exp(-dh / 22);
    const F = wp.fum || (wp.fum = {}),
      f = formOf(wp.st);
    if (wp.st === 'panel' || wp.st === 'blank') F.P = (F.P || 0) + k;
    else if (wp.st === 'strips') F.S = (F.S || 0) + k;
    else if (wp.st === 'panel1' || wp.st === 'planed1') {
      F.G = F.G || { H: 0, z0: wp.rmB[1], z1: wp.rmB[1] + wp.Zcur };
      F.G.H += k;
    } else if (wp.st === 'slices') {
      F.sl = F.sl || [];
      wp.slices.forEach((s, j) => {
        if (wp.fumSel === 'alt' && j % 2) return;
        const r = F.sl[j] || (F.sl[j] = { H: 0, rm: [0, 0] });
        r.H += k;
      });
    } else if (f === 'C') {
      F.B = F.B || { H: 0, rm: wp.rmT.slice() };
      F.B.H += k;
    }
  }
  // ---------------- the rack, the shelf, the protective gear board ----------------
  function rackPut(wp, quiet) {
    if (wp.T && PLAY.has(wp.T)) PLAY.take(wp.T);
    if (wp.T) wp.T.gone();
    wp.where = 'rack';
    RACK.items.push(wp);
    renderRack();
    if (!quiet) SFX.drop();
    save();
  }
  function rackTake(i) {
    if (carriedWP()) {
      think('Ich habe schon ein Werkstück dabei.');
      return;
    }
    const wp = RACK.items.splice(i, 1)[0];
    if (!wp) return;
    renderRack();
    const T = mkThing(wp);
    refreshThing(wp);
    PLAY.give(T);
    PLAY.toHand(T);
    wp.where = 'inv';
    save();
    changed();
  }
  PLAY.act({
    id: 'werk:rack',
    r: 1.45,
    prio: 0.85,
    gest3: 'pickup',
    pos: () => [...WT(RACK.op[0], RACK.op[1]), RACK.op[2]],
    obj: () => RACK.hold,
    label: () => {
      if (!ON) return null;
      const c = carriedWP();
      if (PLAY.carry === METER && RACK.items.length) return 'Holzfeuchte messen (Regal)';
      if (c && !c.done) return FF(c.st) + ' ins Regal legen';
      if (c) return null;
      if (RACK.items.length) {
        const wp = RACK.items[RACK.items.length - 1];
        return nameOf(wp) + ' nehmen' + (RACK.items.length > 1 ? ' (' + RACK.items.length + ' im Regal)' : '');
      }
      return W.order
        ? 'Lieferung kommt ' +
            (W.order.t - now() < 1440 && CLOCK.day(W.order.t) === CLOCK.day() ? 'heute' : 'morgen') +
            ' um 9:00'
        : 'Regal leer: 2 Leimholzplatten bestellen';
    },
    run: () => {
      const c = carriedWP();
      if (PLAY.carry === METER && RACK.items.length) {
        measure(RACK.items[RACK.items.length - 1]);
        return;
      }
      if (c && !c.done) {
        rackPut(c);
        changed();
        return;
      }
      if (RACK.items.length) {
        rackTake(RACK.items.length - 1);
        return;
      }
      if (!W.order) {
        W.order = { t: now() + CLOCK.until(9), n: 2 };
        think(
          'Bestellt beim Holzhandel: 2 Leimholzplatten Eiche, 40 × 400 × 1000 mm, durchgehende Lamelle. Lieferung um 9:00 Uhr.',
          4200
        );
        save();
      } else think('Die Lieferung kommt um 9:00 Uhr. Warten geht über die Uhr oben rechts.');
    },
  });
  PLAY.act({
    id: 'werk:shelf',
    r: 1.45,
    prio: 0.8,
    gest3: 'pickup',
    pos: () => [...WT(SHELF.op[0], SHELF.op[1]), SHELF.op[2]],
    obj: () => SHELF.hold,
    label: () => {
      if (!ON) return null;
      const c = carriedWP();
      if (c && c.done) return 'Schneidebrett ins Regal stellen (oben)';
      if (!c && SHELF.items.length) return nameOf(SHELF.items[SHELF.items.length - 1]) + ' nehmen';
      return null;
    },
    run: () => {
      const c = carriedWP();
      if (c && c.done) {
        if (SHELF.items.length >= 6) {
          think('Die Ablage ist voll – sechs Bretter.');
          return;
        }
        if (c.T) {
          PLAY.take(c.T);
          c.T.gone();
        }
        c.where = 'shelf';
        SHELF.items.push(c);
        renderRack();
        SFX.drop();
        save();
        changed();
        return;
      }
      const wp = SHELF.items.pop();
      if (!wp) return;
      renderRack();
      const T = mkThing(wp);
      refreshThing(wp);
      PLAY.give(T);
      PLAY.toHand(T);
      wp.where = 'inv';
      save();
      changed();
    },
  });
  PLAY.act({
    id: 'werk:psa',
    r: 1.25,
    prio: 0.75,
    gest3: 'interact',
    pos: () => [...WT(PSA.op[0], PSA.op[1]), PSA.op[2]],
    label: () => (ON ? (GEAR.have ? 'Schutzausrüstung an- und ablegen' : 'Schutzausrüstung nehmen (PSA-Brett)') : null),
    run: () => {
      if (!GEAR.have) {
        GEAR.give();
        SFX.cloth();
        think(
          'Schutzbrille, Korbbrille, Gehörschutz, FFP2-Masken, ABEK-Halbmaske, Nitrilhandschuhe – alles dabei. An- und ablegen über PSA oben rechts.',
          5200
        );
      }
      GEAR.setWin(true);
    },
  });
  // moisture meter on a workpiece lying somewhere in the world
  PLAY.act({
    id: 'werk:measure',
    r: 1.6,
    prio: 0.95,
    pos: () => {
      if (PLAY.carry !== METER) return null;
      let b = null,
        bd = 1.8;
      for (const wp of W.list) {
        const T = wp.T;
        if (!T || T.state !== 'world') continue;
        const d = Math.hypot(T.pos[0] - P.x, T.pos[1] - P.y);
        if (d < bd) {
          bd = d;
          b = wp;
        }
      }
      return b ? [b.T.pos[0], b.T.pos[1], b.T.pos[2] + 0.1] : null;
    },
    label: () => (PLAY.carry === METER ? 'Holzfeuchte messen' : null),
    run: () => {
      let b = null,
        bd = 1.8;
      for (const wp of W.list) {
        const T = wp.T;
        if (!T || T.state !== 'world') continue;
        const d = Math.hypot(T.pos[0] - P.x, T.pos[1] - P.y);
        if (d < bd) {
          bd = d;
          b = wp;
        }
      }
      if (b) measure(b);
    },
  });
  // ---------------- one act per station; the operation decides the label ----------------
  const OPS = { saw: sawOps, glue: glueOps, planer: planerOps, sander: sanderOps, bench: benchOps, tent: tentOps };
  const opOf = S => {
    try {
      return ON ? OPS[S.key](S) : null;
    } catch (e) {
      console.warn('werk op', S.key, e);
      return null;
    }
  };
  function needTool(need) {
    const list = (Array.isArray(need) ? need : [need]).filter(Boolean);
    let T = list.find(t => PLAY.has(t));
    if (T) {
      PLAY.toHand(T);
      return T;
    }
    T = list.find(t => t.state === 'world' && Math.hypot(t.pos[0] - P.x, t.pos[1] - P.y) < 3.2);
    if (T) {
      PLAY.give(T);
      PLAY.toHand(T);
      return T;
    }
    think(
      'Dafür brauche ich ' + list.map(t => t.art).join(' oder ') + (list[0].home ? ' – ' + list[0].home : '') + '.',
      3600
    );
    return null;
  }
  function syn(o, S) {
    const key = o.key;
    return {
      id: 'werk:h:' + S.key,
      pos: () => [...WT(S.op[0], S.op[1]), S.op[2] ?? 0.9],
      hold: o.hold,
      gauge: o.gauge,
      anim3: o.anim3,
      rMove: o.rMove || 1.2,
      gest3: false,
      label: () => {
        const c = o.free ? o : opOf(S);
        return c && c.key === key ? o.label : null;
      },
      holdLabel: o.holdLabel,
      start: o.start,
      work: o.work,
      cancel: o.cancel,
      run: k => {
        try {
          o.run(k);
        } catch (e) {
          console.warn('werk', e);
        }
        changed();
      },
    };
  }
  function exec(o, S) {
    if (o.need && !needTool(o.need)) return;
    if ((o.ppe || o.noGloves) && !GEAR.check(o.ppe, o.noGloves, o.what)) return;
    if (o.hold || o.gauge) PLAY.run(syn(o, S));
    else {
      try {
        o.run();
      } catch (e) {
        console.warn('werk', e);
      }
    }
    changed();
  }
  for (const S of Object.values(ST))
    PLAY.act({
      id: 'werk:' + S.key,
      r: S.r,
      prio: 0.9,
      gest3: false,
      pos: () => [...WT(S.op[0], S.op[1]), S.op[2] ?? 0.9],
      obj: () => S.hold,
      label: () => {
        const o = opOf(S);
        return o ? o.label : null;
      },
      run: () => {
        const o = opOf(S);
        if (o) exec(o, S);
      },
    });
  // Q with free hands at a station: take the workpiece from there
  window.PLAY_SEC = () => {
    if (!ON || PLAY.carry || PLAY.hold || P.mode !== 'walk') return null;
    let best = null,
      bd = 1e9;
    for (const S of Object.values(ST)) {
      if (!S.wp) continue;
      const [x, y] = WT(S.op[0], S.op[1]),
        d = Math.hypot(P.x - x, P.y - y);
      if (d < S.r && d < bd) {
        bd = d;
        best = S;
      }
    }
    if (!best || carriedWP()) return null;
    const S = best,
      wp = S.wp;
    if (S.key === 'tent' && !TENT.open)
      return fumeH(wp) >= 18 ? { label: '12 h weiter räuchern', run: () => CLOCK.wait(720, 'Räuchern') } : null;
    if (['glue1', 'glue2', 'clamp1', 'clamp2', 'rip', 'slice'].includes(wp.st)) return null;
    return {
      label: FF(wp.st === 'lay1' ? 'strips' : wp.st === 'lay2' ? 'slices' : wp.st) + ' nehmen',
      run: () => {
        if (wp.st === 'lay1') wp.st = 'strips';
        if (wp.st === 'lay2') wp.st = 'slices';
        fromStation(S.key);
      },
    };
  };
  // ---------------- the gear check list for the machine windows ----------------
  const gearChecks = (req, noGloves) => [
    ...req.map(r => ({
      ok: r.split('|').some(GEAR.worn),
      label: r
        .split('|')
        .map(id => GEAR.IT[id].n)
        .join(' / '),
      ro: true,
    })),
    ...(noGloves ? [{ ok: !GEAR.on.hands, label: 'keine Handschuhe', ro: true }] : []),
  ];
  // ---------------- time: glue in the clamps, the fuming tent, deliveries, the open time while the player is away ----------------
  CLOCK.on((t, dmin) => {
    const dh = dmin / 60;
    if (dh > 0) fumeTick(dh);
    if (W.order && t >= W.order.t) {
      const n = W.order.n;
      W.order = null;
      for (let i = 0; i < n; i++) {
        const p = newWP('panel');
        p.where = 'rack';
        RACK.items.push(p);
      }
      renderRack();
      save();
      if (P.mode === 'walk') banner('Lieferung', n + ' Leimholzplatten Eiche liegen im Regal');
    }
    const gw = ST.glue.wp;
    if (gw && gw.g && gw.g.t0 != null && !gw.g.tc && CLOCK.focused) {
      const [x, y] = WT(ST.glue.op[0], ST.glue.op[1]);
      if (Math.hypot(P.x - x, P.y - y) > 7) {
        unfocus();
        think('Weg vom Leimtisch – der Leim zieht ohne mich an.', 3000);
      }
    }
    if (gw && gw.g && gw.g.t0 != null && !gw.g.tc && t - gw.g.t0 > OT + 4) {
      const first = gw.st === 'glue1';
      gw.st = first ? 'lay1' : 'lay2';
      gw.dirty = true;
      gw.g = null;
      unfocus();
      render('glue');
      save();
      if (P.mode === 'walk')
        think('Der Leim auf dem Leimtisch ist angezogen, bevor gespannt war. Leim abkratzen, neu anfangen.', 4600);
    }
    if (gw && (gw.st === 'clamp1' || gw.st === 'clamp2') && gw.sq && t - gw.g.tc > 25 && !gw._dryShown) {
      gw._dryShown = true;
      render('glue');
    }
    if (TENT.dish.visible !== TENT.amm > 0.02) {
      TENT.dish.visible = TENT.amm > 0.02;
      markDirty(true);
    }
  });
  CLOCK.jobs(() => {
    const out = [],
      gw = ST.glue.wp;
    if (gw && (gw.st === 'clamp1' || gw.st === 'clamp2') && gw.g)
      out.push({ label: 'Leim in den Zwingen', left: gw.g.tc + PRESS - now() });
    for (const wp of W.list)
      if (wp.tc && ['panel1', 'board'].includes(wp.st) && now() - wp.tc < CURE)
        out.push({ label: FF(wp.st) + ': Leim härtet', left: wp.tc + CURE - now() });
    const tw = ST.tent.wp;
    if (tw && !TENT.open) out.push({ label: 'Räucherzelt (' + Math.round(fumeH(tw)) + ' h)', left: 0 });
    for (const wp of W.list)
      if (wp.oil && wp.oil.n && wp.oil.wiped && now() - wp.oil.t < 480)
        out.push({ label: 'Öl trocknet (Brett ' + wp.n + ')', left: wp.oil.t + 480 - now() });
    if (W.order) out.push({ label: 'Lieferung Leimholz', left: W.order.t - now() });
    return out;
  });
  // ---------------- saving ----------------
  const SKIP = new Set(['T', '_mats', '_mk', 'saw', 'pl', 'sd', '_dryShown']);
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        const list = W.list
          .filter(w => w.where !== 'gone')
          .map(w => {
            const o = {};
            for (const [k, v] of Object.entries(w)) if (!SKIP.has(k)) o[k] = v;
            if (w.T) {
              o.slot = PLAY.slotOf(w.T);
              if (w.T.state === 'world') o.pos = [...w.T.pos, w.T.yaw];
            }
            return o;
          });
        const tools = {};
        for (const T of TOOL_LIST)
          tools[T.id] = T.state === 'world' ? { pos: [...T.pos, T.yaw] } : { slot: PLAY.slotOf(T) };
        SAVE.setRaw(
          LSK,
          JSON.stringify({
            v: 1,
            n: W.n,
            boards: W.boards || 0,
            list,
            rack: RACK.items.map(w => w.id),
            shelf: SHELF.items.map(w => w.id),
            st: Object.fromEntries(Object.entries(ST).map(([k, S]) => [k, S.wp ? S.wp.id : null])),
            order: W.order,
            tent: { amm: TENT.amm, open: TENT.open, airT: TENT.airT, t0: TENT.t0 },
            tools,
            q: W.quality,
          })
        );
      } catch (e) {
        console.warn('werk save', e);
      }
    }, 400);
  }
  function changed() {
    save();
    if (window.WUI) WUI.card();
  }
  PLAY.onInv(() => {
    save();
    if (window.WUI) WUI.card();
  });
  function defaults() {
    RACK.items.length = 0;
    SHELF.items.length = 0;
    W.list.length = 0;
    W.n = 0;
    W.boards = 0;
    W.order = null;
    for (let i = 0; i < 3; i++) {
      const p = newWP('panel');
      p.where = 'rack';
      RACK.items.push(p);
    }
  }
  function load() {
    let s = null;
    try {
      s = JSON.parse(SAVE.raw(LSK) || 'null');
    } catch (e) {}
    for (const S of Object.values(ST)) S.wp = null;
    if (!s || s.v !== 1) {
      defaults();
      toolDefaults();
      renderRack();
      for (const k of Object.keys(ST)) render(k);
      return;
    }
    for (const o of s.list || []) if (o.where === 'bernd') o.where = 'ronald'; // the preview of 22.10.2026 23:09–23:45 called him Bernd
    W.list.length = 0;
    W.n = s.n || 0;
    W.boards = s.boards || 0;
    W.order = s.order || null;
    W.quality = s.q || [];
    for (const o of s.list || []) {
      const wp = Object.assign({}, o);
      delete wp.slot;
      delete wp.pos;
      W.list.push(wp);
    }
    RACK.items = (s.rack || []).map(byId).filter(Boolean);
    SHELF.items = (s.shelf || []).map(byId).filter(Boolean);
    for (const [k, id] of Object.entries(s.st || {})) if (ST[k] && id) ST[k].wp = byId(id) || null;
    Object.assign(TENT, s.tent || {});
    // things: workpieces in the hand or lying around, the tools
    toolDefaults();
    const inv = [];
    for (const o of s.list || []) {
      const wp = byId(o.id);
      if (!wp || !(wp.where === 'inv' || wp.where === 'world')) continue;
      const T = mkThing(wp);
      if (o.pos) T.place(o.pos[0], o.pos[1], o.pos[2], o.pos[3] || 0);
      else if (o.slot >= 0) inv.push([T, o.slot]);
      else {
        const [x, y] = WT(RACK.op[0], RACK.op[1]);
        T.place(x, y + 0.3, 0, 0);
      }
    }
    for (const T of TOOL_LIST) {
      const q = (s.tools || {})[T.id];
      if (!q) continue;
      if (q.pos) T.place(q.pos[0], q.pos[1], q.pos[2], q.pos[3] || 0);
      else if (q.slot >= 0) inv.push([T, q.slot]);
    }
    setTimeout(() => {
      for (const [T, sl] of inv) {
        if (!PLAY.has(T)) PLAY.give(T, sl);
        else if (PLAY.slotOf(T) !== sl) PLAY.moveSlot(PLAY.slotOf(T), sl);
      }
    }, 80);
    renderRack();
    for (const k of Object.keys(ST)) render(k);
  }
  function reset() {
    try {
      SAVE.del(LSK);
    } catch (e) {}
    for (const wp of W.list) if (wp.T) killThing(wp);
    for (const S of Object.values(ST)) S.wp = null;
    Object.assign(TENT, { amm: 0, open: true, airT: null });
    unfocus();
    defaults();
    toolDefaults();
    renderRack();
    for (const k of Object.keys(ST)) render(k);
    changed();
  }
  if (ON)
    whenLoaded(() =>
      setTimeout(() => {
        try {
          load();
        } catch (e) {
          console.warn('werk load', e);
          defaults();
          toolDefaults();
          renderRack();
        }
        if (window.WUI) WUI.card();
      }, 900)
    );
  else {
    for (const T of TOOL_LIST) T.gone();
  }
  function banner(a, b) {
    if (window.QUESTS && QUESTS.banner) QUESTS.banner(a, b);
    else toast(a + ': ' + b);
  }
  // ---------------- for the quests (Ronald's board), the HUD card and the tests ----------------
  return {
    ST,
    RACK,
    SHELF,
    TENT,
    W,
    TOOLS,
    objective,
    current,
    nextStep,
    nameOf,
    dimsOf,
    descOf,
    BOOK,
    ORDER,
    posOf,
    carriedWP,
    render,
    renderRack,
    save,
    load,
    reset,
    changed,
    stars,
    starsTxt,
    fumeH,
    formOf,
    newWP,
    mkThing,
    refreshThing,
    hasFinished: () => {
      const c = carriedWP();
      return !!(c && c.done);
    },
    handOver() {
      const c = carriedWP();
      if (!c || !c.done) return null;
      killThing(c);
      c.where = 'ronald';
      save();
      changed();
      return c;
    },
    finished: () => W.list.filter(w => w.done),
    on: ON,
    exec,
    opOf,
    syn,
    gearChecks,
    WT,
    wpMesh,
    faceTextures,
    // V16d: panels glued from one's own dried planks (werk/holz_dry.js) go into the rack like the bought ones
    addOwn(n, sp, mc) {
      for (let i = 0; i < n; i++) {
        const p = newWP('panel', { sp, own: true, mc: +(mc - 0.3 + Math.random() * 0.6).toFixed(1) });
        p.where = 'rack';
        RACK.items.push(p);
      }
      renderRack();
      save();
      return n;
    },
  };
})();
window.WERK = WERK;
