// Suhl runtime: shop fronts. The sides of the buildings the data marks as shops on the ground floor (product g: S[i].eg 'laden', from
// the shops, offices and amenities OpenStreetMap has at the address) get near the observer a front of their own over the ground floor
// the facade program draws: bays of display windows (dark glass set back between anthracite frames, a door in one of them, a mullion in
// the wide ones), the fascia above in a colour of the business with its name (S[i].sign) on a panel – names of persons (practices,
// agents) are left out. Built within R like the signs (zeichen.js): frames and fascias as one merged mesh on a canvas (colours and
// names), the glass as a second one with a reflective standard material that glows warm at night with the village's windows.
import { buf, face, box, geometry } from './teile.js';
const MOVE = 40,
  CW = 384,
  CH = 48, // a name's cell
  IW = 256,
  IH = 128, // a shop's inside seen through its windows (a row of them below the colour patches)
  Y0 = 64 + IH, // the cells start below the colour patches and the insides
  FH = 0.52, // the fascia's height (m)
  // fascia colours: background, text
  COLS = [
    ['#1f3a5f', '#ffffff'],
    ['#7a1f24', '#ffffff'],
    ['#1f5134', '#ffffff'],
    ['#26282b', '#f0d27a'],
    ['#efede6', '#1d1d1b'],
    ['#5b2a4f', '#ffffff'],
    ['#9e1b20', '#ffffff'],
    ['#0f5f73', '#ffffff'],
    ['#e2001a', '#ffffff'], // 8: savings banks, pharmacies
    ['#0066b3', '#ffffff'], // 9: cooperative banks
    ['#ffcc00', '#c4001a'], // 10: post
  ],
  FRAMES = ['#33373b', '#a7abad', '#e6e6e1', '#4a3b2c'];
const hash = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
// the name on the fascia: a firm, a shop, an office – not a person (a practice, an agent after the colon, titles)
export function shownName(t) {
  let s = String(t || '').trim();
  const i = s.indexOf(':');
  if (i > 0) s = s.slice(0, i).trim();
  if (
    /\b(Dr|Prof|Dipl|med|Univ)\.|\bDr\s|Rechtsanw|Notar|Steuerberat|Zahnarzt|Tierarzt|Arzt\b|Ärztin|Praxis|Physiotherap|Psychotherap|Heilprakt|Hebamme|Kinderarzt/i.test(
      s
    )
  )
    return '';
  return s.length > 48 ? '' : s;
}
const colourOf = s =>
  /Sparkasse|Apotheke/i.test(s)
    ? 8
    : /Volksbank|Raiffeisen/i.test(s)
      ? 9
      : /Deutsche Post|\bPost\b|DHL/i.test(s)
        ? 10
        : Math.floor(hash(s) * 8);
// a shop's inside as seen through the glass: ceiling lights, a back wall, shelves with goods (shops), a counter (offices, banks) or
// tables (cafés) – dim and low in contrast, the glass mirrors over it
function inside(g, x0, y0, k) {
  const r = q => hash(k + ':' + q),
    gr = g.createLinearGradient(0, y0, 0, y0 + IH);
  gr.addColorStop(0, k % 3 === 2 ? '#7a6550' : ['#5a5048', '#4d5258', '#5c4a3a', '#55504a'][k % 4]);
  gr.addColorStop(1, '#1b1917');
  g.fillStyle = gr;
  g.fillRect(x0, y0, IW, IH);
  g.fillStyle = 'rgba(255, 244, 214, 0.75)';
  for (let i = 0; i < 5; i++) g.fillRect(x0 + 18 + i * 50 + r('l' + i) * 8, y0 + 6, 22, 4);
  if (k % 3 !== 2) {
    // shelves with goods
    for (let row = 0; row < 3; row++) {
      const y = y0 + 34 + row * 26;
      g.fillStyle = '#2a2622';
      g.fillRect(x0, y + 18, IW, 3);
      for (let x = x0 + 4; x < x0 + IW - 10;) {
        const w = 5 + r('w' + row + ':' + x) * 12,
          h = 8 + r('h' + row + ':' + x) * 9;
        g.fillStyle = `hsl(${Math.floor(r('c' + row + ':' + x) * 360)}, 26%, ${24 + r('v' + x) * 18}%)`;
        g.fillRect(x, y + 18 - h, w, h);
        x += w + 2;
      }
    }
  } else {
    // a counter and a few tables
    g.fillStyle = '#3a332c';
    g.fillRect(x0 + 20, y0 + 70, IW * 0.55, 30);
    g.fillStyle = '#2b2622';
    for (let i = 0; i < 3; i++) g.fillRect(x0 + 40 + i * 70, y0 + 96, 34, 6);
  }
  g.fillStyle = 'rgba(240, 236, 226, 0.35)';
  g.fillRect(x0 + 10 + r('p') * 150, y0 + 60, 26, 36); // a poster
}
export function laeden(ctx, C) {
  const { THREE, scene, markDirty, KERN, COARSE, VILLAGE } = ctx,
    R = COARSE ? 140 : 220,
    AW = COARSE ? 1024 : 2048,
    AH = 1024,
    COLN = Math.floor(AW / CW),
    CELLS = COLN * Math.floor((AH - Y0) / CH),
    S = {
      on: true,
      rev: '',
      at: [1e9, 1e9],
      tz: 0,
      ref: [],
      retry: 0,
      night: -1,
      first: null,
      n: { sides: 0, bays: 0, names: 0 },
    };
  let K = null;
  const NF = FRAMES.length,
    NI = AW / IW, // insides
    patchXY = i => [8 + 16 * i, 8]; // colour i (0 … NF − 1 frames, NF + k fascia colour k)
  const uvP = i => {
    const [x, y] = patchXY(i);
    return [x / AW, 1 - y / AH];
  };
  function kit() {
    if (K) return K;
    const cv = document.createElement('canvas');
    cv.width = AW;
    cv.height = AH;
    const g = cv.getContext('2d');
    g.fillStyle = '#d9d6cf';
    g.fillRect(0, 0, AW, AH);
    [...FRAMES, ...COLS.map(c => c[0]), '#3b2a1e'].forEach((c, i) => {
      const [x, y] = patchXY(i);
      g.fillStyle = c;
      g.fillRect(x - 6, y - 6, 12, 12);
    });
    for (let i = 0; i < NI; i++) inside(g, i * IW, 64, i);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mats = {
      face: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 }),
      // the glass: the inside of the shop in the canvas, darkened, the sky mirrored in it; at night it glows with the village's windows
      glass: new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xb2babe,
        roughness: 0.06,
        metalness: 0.55,
        emissive: 0xffc890,
        emissiveIntensity: 0,
        envMapIntensity: 1.2,
      }),
    };
    const mk = (m, name) => {
      const me = new THREE.Mesh(new THREE.BufferGeometry(), m);
      me.name = name;
      me.visible = false;
      me.frustumCulled = false;
      me.castShadow = me.receiveShadow = false;
      me.userData.noMerge = true;
      scene.add(me);
      return me;
    };
    K = {
      g,
      tex,
      mats,
      solid: mk(mats.face, 'suhl laeden'),
      glass: mk(mats.glass, 'suhl laeden glas'),
      cells: new Map(),
      free: Array.from({ length: CELLS }, (q, i) => CELLS - 1 - i),
    };
    return K;
  }
  function draw(i, text, ci) {
    const g = K.g,
      x0 = (i % COLN) * CW,
      y0 = Y0 + Math.floor(i / COLN) * CH,
      [bg, fg] = COLS[ci];
    g.save();
    g.fillStyle = bg;
    g.fillRect(x0, y0, CW, CH);
    g.font = 'bold 30px Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
    const w = g.measureText(text).width,
      maxW = CW - 24,
      sx = w > maxW ? maxW / w : 1,
      pw = Math.min(CW, Math.ceil(w * sx) + 24);
    g.fillStyle = fg;
    g.textBaseline = 'middle';
    g.translate(x0 + 12, y0 + CH / 2 + 2);
    g.scale(sx, 1);
    g.fillText(text, 0, 0);
    g.restore();
    return pw;
  }
  function cellsFor(keys) {
    const want = new Set(keys.slice(0, CELLS));
    for (const [k, c] of K.cells)
      if (!want.has(k)) {
        K.free.push(c.i);
        K.cells.delete(k);
      }
    let drawn = 0;
    for (const k of want) {
      if (K.cells.has(k)) continue;
      const i = K.free.pop();
      if (i === undefined) break;
      const ci = Number(k.slice(0, k.indexOf('|')));
      K.cells.set(k, { i, pw: draw(i, k.slice(k.indexOf('|') + 1), ci) });
      drawn++;
    }
    if (drawn) K.tex.needsUpdate = true;
  }
  const uvCell = c => {
    const x0 = (c.i % COLN) * CW,
      y0 = Y0 + Math.floor(c.i / COLN) * CH;
    return [(x0 + 0.5) / AW, 1 - (y0 + CH - 0.5) / AH, (x0 + c.pw - 0.5) / AW, 1 - (y0 + 0.5) / AH];
  };
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return z === undefined || z === null || !Number.isFinite(z) ? null : z;
  };
  // the shop sides near the observer, nearest first
  function near(o) {
    const out = [];
    for (const t of C.tiles.values()) {
      if (!t.recs || !t.foot) continue;
      t.recs.forEach((b, i) => {
        if (!Array.isArray(b.S) || !b.S.some(q => q && q.eg)) return;
        const d = Math.hypot(t.T.cx + t.foot[i * 4] - o[0], t.T.cy + t.foot[i * 4 + 1] - o[1]);
        if (d > R + 30 || (C.patch[b.id] && C.patch[b.id].hidden)) return;
        const v = C.building(String(b.id));
        if (!v || v.flags.gone) return;
        v.sides.forEach((sd, k) => {
          if (sd.eg && !sd.party && !sd.court && sd.len >= 2.4) out.push({ d, v, sd, k });
        });
      });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  function build(o) {
    kit();
    const list = near(o),
      keys = [];
    for (const it of list) {
      it.names = [...new Set((it.sd.signs || []).map(shownName).filter(Boolean))].slice(
        0,
        Math.max(1, Math.floor(it.sd.len / 4.5))
      );
      it.col = colourOf(it.names[0] || it.v.id);
      for (const nm of it.names) keys.push(colourOf(nm) + '|' + nm);
    }
    cellsFor([...new Set(keys)]);
    S.first = null;
    const Bs = buf(),
      Bg = buf(),
      dark = uvP(NF + COLS.length), // house doors
      n = { sides: 0, bays: 0, names: 0 },
      ref = [];
    let missed = 0;
    for (const it of list) {
      const { sd, v } = it,
        L = sd.len,
        e = [(sd.b[0] - sd.a[0]) / L, (sd.b[1] - sd.a[1]) / L],
        nv = [e[1], -e[0]], // outward
        at = (u, off) => [sd.a[0] + e[0] * u + nv[0] * off, sd.a[1] + e[1] * u + nv[1] * off],
        z0 = v.z0,
        eave = Number.isFinite(v.eave) ? v.eave : 6,
        // the frames up to here, the fascia above: over the windows the facade program draws on the ground floor (to 2.75 m above the
        // foot, raised), under those of the first floor (from 3.95 m)
        zt = eave > 4.6 ? z0 + 2.8 : z0 + Math.max(2.1, eave - FH - 0.2),
        m = Math.min(0.4, L * 0.1),
        U = L - 2 * m,
        key = v.id + ':' + it.k,
        fr = uvP(Math.floor(hash(key + 'f') * NF)),
        ii = Math.floor(hash(key + 'i') * NI),
        gu0 = (ii * IW + 3) / AW,
        gu1 = ((ii + 1) * IW - 3) / AW,
        gv0 = 1 - (64 + IH - 3) / AH,
        gv1 = 1 - (64 + 3) / AH;
      // the openings along the side: bays of about 3.4 m, the shop's door in the first or the last, in a house of flats with three
      // bays or more its own door at the other end (kind 2); a narrow side: door and window
      const ops = [],
        nb = Math.max(1, Math.round(U / 3.4)),
        bw = U / nb;
      if (nb === 1) {
        if (U > 2.6) ops.push([m, m + 1.25, 1], [m + 1.25, L - m, 0]);
        else ops.push([m, L - m, 1]);
      } else {
        const dI = hash(key) < 0.5 ? 0 : nb - 1,
          hI = nb >= 3 && (v.use === 'wohnen' || v.levels >= 3) ? nb - 1 - dI : -1;
        for (let j = 0; j < nb; j++) ops.push([m + j * bw, m + (j + 1) * bw, j === dI ? 1 : j === hI ? 2 : 0]);
      }
      let built = 0;
      for (const [u0, u1, kind] of ops) {
        const uc = (u0 + u1) / 2,
          [gx, gy] = at(uc, 0.8),
          zg = gz(gx, gy);
        if (zg === null) {
          missed++;
          continue;
        }
        if (z0 - zg > 1.3 || zg > zt - 1.9) continue; // a high base on the slope, or the street higher than the shop: no front here
        if (ref.length < 32) ref.push([gx, gy, zg]);
        const zb = Math.min(zg, z0) - 0.15,
          P = 0.14, // the piers
          piece = (ua, ub, za, zb2, off, hd, uv = fr) => {
            const [cx, cy] = at((ua + ub) / 2, off);
            box(Bs, [cx, cy, (za + zb2) / 2], e, (ub - ua) / 2, hd, (zb2 - za) / 2, uv, uv, uv);
          };
        if (kind === 2) {
          // the house door: a solid leaf between plain piers, the frame over it
          const dw = Math.min(1.2, u1 - u0 - 0.6);
          piece(u0, uc - dw / 2, zb, zt, 0.035, 0.035);
          piece(uc + dw / 2, u1, zb, zt, 0.035, 0.035);
          piece(uc - dw / 2, uc + dw / 2, zg + 2.25, zt, 0.035, 0.035);
          piece(uc - dw / 2, uc + dw / 2, zb, zg + 2.25, 0.012, 0.012, dark);
          built++;
          continue;
        }
        const door = kind === 1,
          gb = door ? zg + 0.03 : zg + 0.45, // the glass from here …
          gt = zt - 0.12; // … to here
        piece(u0, u0 + P, zb, zt, 0.035, 0.035);
        piece(u1 - P, u1, zb, zt, 0.035, 0.035);
        piece(u0 + P, u1 - P, zb, gb, 0.035, 0.035);
        piece(u0 + P, u1 - P, gt, zt, 0.035, 0.035);
        if (door && gt - (zg + 2.25) > 0.3) piece(u0 + P, u1 - P, zg + 2.21, zg + 2.29, 0.04, 0.03);
        if (!door && u1 - u0 > 2.4) piece(uc - 0.04, uc + 0.04, gb, gt, 0.04, 0.03);
        // the glass, set back between the frames, the inside of the shop behind it
        const [ax, ay] = at(u0 + P, 0.012),
          [bx, by] = at(u1 - P, 0.012);
        face(
          Bg,
          [
            [ax, ay, gb],
            [bx, by, gb],
            [bx, by, gt],
            [ax, ay, gt],
          ],
          [nv[0], nv[1], 0],
          [
            [gu0, gv0],
            [gu1, gv0],
            [gu1, gv1],
            [gu0, gv1],
          ]
        );
        built++;
      }
      if (!built) continue;
      if (!n.sides) {
        const [mx, my] = at(L / 2, 0);
        S.first = { at: [mx, my, z0], nv, names: it.names }; // the nearest front (for the tests)
      }
      n.sides++;
      n.bays += built;
      // the fascia over the whole front with the names on panels in front of it – a front without a name keeps its frames alone
      if (!it.names.length) continue;
      const cf = uvP(NF + it.col),
        zf = zt + 0.04 + FH / 2,
        [fx, fy] = at(L / 2, 0.06);
      box(Bs, [fx, fy, zf], e, L / 2 - m + 0.05, 0.06, FH / 2, cf, cf, cf);
      const k = it.names.length;
      it.names.forEach((nm, j) => {
        const c = K.cells.get(colourOf(nm) + '|' + nm);
        if (!c) return;
        const seg = U / k,
          sc = m + seg * (j + 0.5);
        let hp = FH * 0.84,
          lp = (hp * c.pw) / CH;
        if (lp > seg * 0.92) {
          hp *= (seg * 0.92) / lp;
          lp = seg * 0.92;
        }
        const [px, py] = at(sc, 0.125),
          r = uvCell(c),
          cc = uvP(NF + colourOf(nm));
        box(Bs, [px, py, zf], e, lp / 2, 0.006, hp / 2, r, cc, cc);
        n.names++;
      });
    }
    const put = (me, B) => {
      me.geometry.dispose();
      me.geometry = geometry(THREE, B);
      me.visible = B.p.length > 0;
    };
    put(K.solid, Bs);
    put(K.glass, Bg);
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
    const rev = C.n.built + '/' + C.n.freed + '/' + Object.keys(C.patch).length;
    S.tz += dt;
    let again = rev !== S.rev || Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) > MOVE;
    if (!again && S.retry > 0 && (S.retry -= dt) <= 0) again = true;
    if (!again && S.tz > 3) {
      S.tz = 0;
      again = late();
    }
    if (again) {
      S.rev = rev;
      S.at = [o[0], o[1]];
      S.tz = 0;
      build(o);
    }
    // the windows glow with the village's lit windows
    const ni = VILLAGE && VILLAGE.night ? VILLAGE.night() : 0;
    if (K && Math.abs(ni - S.night) > 0.01) {
      S.night = ni;
      K.mats.glass.emissiveIntensity = 0.55 * ni;
      markDirty(true);
    }
  };
  // the observer far away or high above: nothing shown, built again on the way back
  S.away = () => {
    if (!K || ![K.solid, K.glass].some(me => me.visible)) return;
    for (const me of [K.solid, K.glass]) me.visible = false;
    S.rev = '';
    S.at = [1e9, 1e9];
    markDirty(true);
  };
  S.leave = () => {
    if (!K) return;
    for (const me of [K.solid, K.glass]) {
      scene.remove(me);
      me.geometry.dispose();
    }
    for (const m of Object.values(K.mats)) m.dispose();
    K.tex.dispose();
    K = null;
    S.rev = '';
    S.at = [1e9, 1e9];
    S.ref = [];
    S.night = -1;
    S.n = { sides: 0, bays: 0, names: 0 };
  };
  S.state = () => Object.assign({ cells: K ? K.cells.size : 0, first: S.first }, S.n);
  return S;
}
