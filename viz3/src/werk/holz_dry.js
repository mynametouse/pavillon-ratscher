// ===================== V16d wood, part 3: the drying stack, drying by the climate, the moisture meter (HOLZDRY) =====================
// The boards of the blocks beside the band sawmill are stacked to dry in the open air under a roof: a foundation (≥ 30 cm, better 45 cm,
// open below), stickers 24 × 48 mm every 50 cm (40–60 cm for boards of 24–30 mm) flush at the ends and aligned one above the other, the
// boards of one log together (Blockverband), a gap between them, the ends sealed against checks, a roof with overhang 15 cm above and
// weight on it (~250 kg/m²). How fast a board dries follows the climate of Meiningen (DWD 1991–2020: monthly temperature and humidity →
// equilibrium moisture outdoors, 13 % in summer, 21 % in winter): toward it at a rate that falls with thickness^1.5, with the cold, below
// the fibre saturation point (~30 %) and in the bottom layer; larch dries ~1.7× slower than spruce. 25 mm spruce stacked in May: ~20 % after
// five weeks, ~15 % by August; stacked in autumn: 20 % only next spring. Faults from the choices: blue stain in wet warm spruce sapwood
// (dense piles, low foundation), end checks without sealing, warp with wide sticker spacing or no weight, the heart crack in boards with
// the pith. The meter is a pin-type resistance meter (species group 3 for spruce/larch, temperature correction ~0.5 % per 5.6 °C, reliable
// 6–30 %, above that only a rough figure). Time-lapse via CLOCK.wait. Dry boards (≤ 12 % after the drying cabinet in the workshop) go to the
// workshop as stock (werk/werk.js, own wood for the end-grain board).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { BUILD } from '../core/geo.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { CLOCK } from '../time/clock.js';
import { WERK } from './werk.js';
import { WUI } from './werkui.js';
import { DN } from '../time/daynight.js';
import { HOLZ } from './holz.js';
import { HOLZSAW } from './holz_saw.js';
import { KERN } from '../core/kern.js';
const HOLZDRY = (() => {
  const de = (v, d = 1) => Number(v).toFixed(d).replace('.', ','),
    think = (t, ms) => PLAY.think(t, ms);
  // climate: Meiningen (DWD 3231, 450 m) 1991–2020 – monthly mean temperature (°C) and equilibrium moisture (%) outdoors under a roof
  const TM = [-0.5, 0.2, 3.8, 8.4, 12.5, 15.7, 17.7, 17.4, 13.0, 8.2, 3.5, 0.3],
    EM = [19.8, 17.9, 15.5, 13.3, 13.5, 13.5, 13.4, 13.6, 15.8, 18.9, 21.2, 21.3];
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  function clim(doy) {
    const m = (doy - 15) / 30.4375,
      i = Math.floor(m),
      f = m - i,
      a = ((i % 12) + 12) % 12,
      b = (a + 1) % 12;
    return { T: TM[a] + (TM[b] - TM[a]) * f, E: EM[a] + (EM[b] - EM[a]) * f };
  }
  const dateOf = t => new Date((DN.jdOf(t) - 2440587.5) * 864e5);
  const doyOf = t => {
    const d = dateOf(t);
    return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1;
  };
  const S = { stack: null, hist: [], kiln: null, ver: 0 };
  const SAW = () => window.HOLZSAW,
    B = () => (window.HOLZSAW ? HOLZSAW.boards : []);
  // ---------------- the drying model (per board, integrated in whole days) ----------------
  // where: 'pile' (unstickered block beside the mill), 'stack', 'kiln' (drying cabinet: 45 °C, 8 %), 'shop' (in the workshop rack)
  function rateOf(b, T, st) {
    const tmm = b.t * 1000;
    let k =
      0.1035 *
      Math.pow(25 / tmm, 1.5) *
      Math.pow(3, (T - 14) / 10) *
      ({ larch: 0.6, spruce: 1, pine: 0.95 }[b.sp] || 1);
    if (b.mc < 30) k *= 0.5;
    if (b.st === 'pile') k *= 0.15;
    if (b.st === 'stack' && st) {
      const L = st.layers,
        li = b.layer || 0;
      if (li === 0) k *= st.found < 0.3 ? 0.6 : 0.85;
      if (li === L.length - 1 && st.roof) k *= 1.1;
      if (!st.gap) k *= 0.8;
      if (!st.roof) k *= 0.9;
    }
    return k;
  }
  function emcOf(b, E, st) {
    if (b.st === 'kiln') return S.kiln && S.kiln.on ? 8 : Math.max(9, E - 3.5);
    if (b.st === 'shop') return Math.max(9, E - 3.5);
    if (b.st === 'pile') return E + 3;
    if (b.st === 'stack' && st && !st.roof) return E + 3.5;
    return E + 1;
  }
  function stepDay(b, doy, st) {
    const c = clim(doy),
      T =
        b.st === 'kiln'
          ? S.kiln && S.kiln.on
            ? 32
            : Math.max(12, c.T + 5)
          : b.st === 'shop'
            ? Math.max(12, c.T + 5)
            : c.T,
      k = rateOf(b, T, st),
      E = emcOf(b, c.E, st);
    const was = b.mc;
    b.mc = E + (b.mc - E) * Math.exp(-k);
    if (b.mc < 4) b.mc = 4;
    // faults while drying: blue stain in wet warm sapwood with little air, end checks without sealing when it dries fast
    if ((b.sp === 'spruce' || b.sp === 'pine' || b.mc0 > 90) && b.mc > 25 && T > 8 && b.st !== 'kiln') {
      const air = b.st === 'pile' ? 1 : st && (st.found < 0.3 || !st.gap) ? 0.45 : 0.12;
      b.wet = (b.wet || 0) + air;
      if (b.wet > 22 && !b.blue) b.blue = true;
    }
    if (b.st === 'stack' && st && !st.seal && !b.endck && was - b.mc > 0.9 && b.mc > 20) {
      b.endck = hashOf(b) % 100 < 35 ? +(0.12 + (hashOf(b) % 20) / 100).toFixed(2) : 0;
    }
    if (b.mc < 20 && b.pith && !b.crack) b.crack = true;
  }
  const hashOf = b => {
    let h = 7;
    for (const ch of b.id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
    return h;
  };
  // bring every board up to the clock (lazily, in days)
  function advance() {
    const now = CLOCK.t,
      st = S.stack;
    let n = 0;
    for (const b of B()) {
      if (b.st === 'used') continue;
      if (b.tu == null) b.tu = b.t0 != null ? b.t0 : now;
      while (now - b.tu >= 1440) {
        stepDay(b, doyOf(b.tu), st);
        b.tu += 1440;
        n++;
      }
    }
    if (n) {
      S.ver++;
      if (st && st.layers.length) {
        const d = Math.floor(now / 1440);
        if (!S.hist.length || S.hist[S.hist.length - 1][0] < d) {
          const ms = stackMC();
          if (ms) S.hist.push([d, +ms.avg.toFixed(1), +ms.min.toFixed(1), +ms.max.toFixed(1)]);
          if (S.hist.length > 800) S.hist.splice(0, S.hist.length - 800);
        }
      }
    }
  }
  function stackMC() {
    const bs = B().filter(b => b.st === 'stack');
    if (!bs.length) return null;
    let s = 0,
      mn = 999,
      mx = 0;
    for (const b of bs) {
      s += b.mc;
      mn = Math.min(mn, b.mc);
      mx = Math.max(mx, b.mc);
    }
    return { avg: s / bs.length, min: mn, max: mx, n: bs.length };
  }
  // ---------------- the stack in the world: north-east of the mill, boards east–west ----------------
  const G = new THREE.Group();
  {
    const Bw = window.BUILD && BUILD.werkstatt;
    if (Bw) {
      Bw.root.add(G);
      G.position.copy(V(-Bw.pivot[0], -Bw.pivot[1], 0));
    } else scene.add(G);
  }
  const WT = (x, y) => (window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]);
  const SP = { x: 2.45, y: -25.3, az: Math.PI / 2, W: 1.2, Lmax: 4.2 }; // stack frame (workshop coordinates as built): boards along x (east)
  const STICK = 0.024,
    STW = 0.048;
  let MESH = null;
  function rebuild() {
    const st = S.stack;
    if (MESH) {
      G.remove(MESH);
      MESH.traverse(o => {
        if (o.isMesh) o.geometry.dispose();
      });
      MESH = null;
    }
    if (!st) {
      markDirty(true);
      return;
    }
    const g = new THREE.Group(),
      u = [Math.sin(SP.az), Math.cos(SP.az)],
      v = [Math.cos(SP.az), -Math.sin(SP.az)],
      at = (a, l, z) => V(SP.x + v[0] * a + u[0] * l, SP.y + v[1] * a + u[1] * l, z);
    const L = st.L || 4.1,
      cols = [];
    for (let l = -L / 2 + STW / 2; l <= L / 2 - STW / 2 + 1e-6; l += st.sp) cols.push(l);
    if (cols[cols.length - 1] < L / 2 - STW / 2 - 0.05) cols.push(L / 2 - STW / 2);
    const conc = MAT.conc || new THREE.MeshStandardMaterial({ color: 0x9c978d }),
      wood = MAT.kvh || new THREE.MeshStandardMaterial({ color: 0x9a7a54 }),
      stickM = S.stickM || (S.stickM = new THREE.MeshStandardMaterial({ color: 0xc8b48c, roughness: 0.9 }));
    const box = (sx, sy, sz, p, list) => {
      const b = new THREE.BoxGeometry(sx, sz, sy);
      b.rotateY(-SP.az);
      b.translate(p.x, p.y, p.z);
      list.push(b);
    };
    // foundation: a concrete block and a squared timber under every sticker column
    const gC = [],
      gW = [],
      gS = [],
      fTop = st.found;
    for (const l of cols) {
      for (const a of [-SP.W / 2 + 0.15, SP.W / 2 - 0.15]) box(0.2, 0.24, fTop - 0.12, at(a, l, (fTop - 0.12) / 2), gC);
      box(SP.W + 0.1, 0.12, 0.12, at(0, l, fTop - 0.06), gW);
    }
    // layers: boards (merged by HOLZSAW) and the stickers on top of each layer
    const list = [];
    let z = fTop;
    st.layers.forEach((ly, li) => {
      for (const id of ly.boards) {
        const b = B().find(x => x.id === id);
        if (!b) continue;
        const p = at(b.sa, -b.L / 2, z - b.zb);
        const m = new THREE.Matrix4().makeRotationY(-SP.az).setPosition(p.x, p.y, p.z);
        list.push({ b, m });
      }
      z += ly.t;
      if (li < st.layers.length - 1 || st.roof)
        for (const l of cols) box(SP.W, STW, STICK, at(0, l, z + STICK / 2), gS);
      z += STICK;
    });
    st.top = z;
    // roof: two bearers, a corrugated sheet with overhang, 15 cm above; concrete blocks as weight
    if (st.roof) {
      const zr = z + 0.15;
      for (const l of [-L / 2 + 0.3, L / 2 - 0.3]) box(SP.W + 0.3, 0.1, 0.15, at(0, l, z + 0.075), gW);
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(L + 0.6, 0.02, SP.W + 0.5), MAT.roofGrey || MAT.metal);
      sheet.rotation.y = -SP.az + Math.PI / 2;
      sheet.position.copy(at(0, 0, zr + 0.01));
      sheet.castShadow = sheet.receiveShadow = true;
      g.add(sheet);
      if (st.weight)
        for (const l of [-L / 2 + 0.6, -L / 6, L / 6, L / 2 - 0.6]) box(0.4, 0.2, 0.24, at(0, l, zr + 0.14), gC);
    }
    for (const [geos, mat] of [
      [gC, conc],
      [gW, wood],
      [gS, stickM],
    ])
      if (geos.length) {
        const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(geos), mat);
        me.castShadow = me.receiveShadow = true;
        g.add(me);
        geos.forEach(x => x.dispose());
      }
    if (list.length && SAW()) SAW().mergeSet(list, g, null);
    g.traverse(o => {
      if (o.isMesh) o.userData.noMerge = true;
    });
    G.add(g);
    MESH = g;
    markDirty(true);
    {
      const Lh = (st.L || 4.1) / 2 + (st.roof ? 0.3 : 0.05),
        Wh = SP.W / 2 + (st.roof ? 0.25 : 0.05),
        hh = (st.top || st.found) + (st.roof ? 0.4 : 0);
      HOLZ.setCol('holzstapel', [[SP.x - Lh, SP.x + Lh, SP.y - Wh, SP.y + Wh, 0, hh]]);
    }
  }
  // ---------------- building the stack ----------------
  const pos = () => {
    const [x, y] = WT(SP.x - 0.2, SP.y - 1.3);
    return [x, y, 0.9];
  };
  function openSetup() {
    WUI.machine({
      title: 'Trockenstapel anlegen',
      sub: 'Luftgetrocknet unter Dach, nördlich der Werkstatt',
      choices: [
        {
          k: 'found',
          label: 'Unterbau (Betonsteine, Kanthölzer)',
          val: 0.45,
          opts: [
            [0.15, '15 cm'],
            [0.45, '45 cm'],
          ],
        },
        {
          k: 'sp',
          label: 'Abstand der Stapelleisten',
          val: 0.5,
          opts: [
            [0.5, '50 cm'],
            [1.0, '100 cm'],
          ],
        },
        {
          k: 'gap',
          label: 'Fuge zwischen den Brettern',
          val: 1,
          opts: [
            [0, 'dicht an dicht'],
            [1, '2 cm Luft'],
          ],
        },
        {
          k: 'seal',
          label: 'Hirnholz versiegeln (Wachs)',
          val: 1,
          opts: [
            [1, 'ja'],
            [0, 'nein'],
          ],
        },
      ],
      info: 'Die Luft muss unter und durch den Stapel ziehen: Unterbau mindestens 30 cm, besser 45 cm, eben und tragfähig. Leisten 24 × 48 mm bündig an den Enden und genau übereinander, alle 40–60 cm – weiter auseinander verziehen sich dünne Bretter. Frische Hirnholzflächen reißen ohne Schutz.',
      go: 'Unterbau setzen',
      onGo: v =>
        PLAY.run({
          id: 'hd:found',
          r: 3,
          rMove: 2.5,
          pos,
          label: () => 'Unterbau setzen',
          hold: 3.2,
          holdLabel: 'Steine, Kanthölzer, ausrichten …',
          anim3: 'interactLoop',
          run: () => {
            S.stack = {
              found: +v.found,
              sp: +v.sp,
              gap: +v.gap === 1,
              seal: +v.seal === 1,
              layers: [],
              roof: false,
              weight: false,
              L: 4.1,
              t0: CLOCK.t,
            };
            CLOCK.t += 20;
            rebuild();
            save();
            think('Der Unterbau steht. Jetzt Lage für Lage die Bretter aus den Blöcken.', 3600);
          },
        }),
    });
  }
  // the next layer: boards in sawing order (one log after the other), all of one thickness, side by side across the stack
  function nextLayer() {
    const st = S.stack,
      piles = SAW() ? SAW().pileBoards() : [];
    if (!piles.length) return null;
    const order = piles.slice().sort((a, b) => (a.lid === b.lid ? a.n - b.n : (a.t0 || 0) - (b.t0 || 0))),
      t = order[0].t,
      gap = st.gap ? 0.02 : 0.003,
      out = [];
    let w = 0;
    for (const b of order) {
      if (Math.abs(b.t - t) > 0.004) continue;
      const bw = Math.max(b.wS, b.wW);
      if (w + bw > SP.W + 1e-3) break;
      out.push({ b, a: -SP.W / 2 + w + bw / 2 });
      w += bw + gap;
    }
    return out.length ? { t, items: out } : null;
  }
  function layOne() {
    const st = S.stack,
      nl = nextLayer();
    if (!nl) return;
    const li = st.layers.length;
    for (const it of nl.items) {
      it.b.st = 'stack';
      it.b.layer = li;
      it.b.sa = +it.a.toFixed(3);
      it.b.ts = CLOCK.t;
    }
    st.layers.push({ t: nl.t, boards: nl.items.map(i => i.b.id) });
    st.L = Math.max(st.L || 0, ...nl.items.map(i => i.b.L));
    // warp risk is decided when the board is stacked: thin boards on wide sticker spacing, the top layers without weight (set when covering)
    for (const it of nl.items) {
      const b = it.b;
      if (st.sp > 0.7 && b.t < 0.035 && hashOf(b) % 100 < 45) b.warp = 'Leisten zu weit';
    }
    CLOCK.t += 6;
    SAW().rebuildPiles();
    rebuild();
    save();
    const left = SAW().pileBoards().length;
    think(
      `Lage ${li + 1}: ${nl.items.length} Bretter à ${Math.round(nl.t * 1000)} mm${left ? `, noch ${left} in den Blöcken` : ' – alle Bretter liegen. Jetzt abdecken und beschweren.'}`,
      3200
    );
  }
  function openRoof() {
    WUI.machine({
      title: 'Stapel abdecken',
      sub: `${S.stack.layers.length} Lagen, ${B().filter(b => b.st === 'stack').length} Bretter`,
      choices: [
        {
          k: 'roof',
          label: 'Dach',
          val: 1,
          opts: [
            [1, 'Wellblech, 30 cm Überstand, 15 cm Luft'],
            [0, 'ohne'],
          ],
        },
        {
          k: 'weight',
          label: 'Gewicht obenauf',
          val: 1,
          opts: [
            [1, 'Betonsteine (~250 kg/m²)'],
            [0, 'keins'],
          ],
        },
      ],
      info: 'Das Dach hält Regen und Sonne ab, die Steine drücken die oberen Lagen flach, sonst verziehen sie sich beim Trocknen.',
      go: 'Abdecken',
      onGo: v =>
        PLAY.run({
          id: 'hd:roof',
          r: 3,
          rMove: 2.5,
          pos,
          label: () => 'Abdecken',
          hold: 3,
          holdLabel: 'Kanthölzer, Blech, Steine …',
          anim3: 'interactLoop',
          run: () => {
            const st = S.stack;
            st.roof = +v.roof === 1;
            st.weight = +v.weight === 1 && st.roof;
            if (!st.weight)
              for (const b of B())
                if (b.st === 'stack' && b.layer >= st.layers.length - 2 && !b.warp && hashOf(b) % 100 < 55)
                  b.warp = 'ohne Gewicht';
            CLOCK.t += 15;
            rebuild();
            save();
            think(
              st.roof
                ? 'Abgedeckt. Jetzt trocknet der Stapel – messen und den Zeitraffer nutzen.'
                : 'Ohne Dach regnet es hinein: Das Holz wird außen immer wieder nass.',
              3800
            );
          },
        }),
    });
  }
  // ---------------- the moisture meter ----------------
  function openMeter() {
    advance();
    const st = S.stack,
      bs = B().filter(b => b.st === 'stack');
    if (!bs.length) return;
    const MT = window.WERK && WERK.TOOLS && WERK.TOOLS.meter;
    if (MT && !PLAY.has(MT)) {
      think('Den Feuchtemesser von der Hobelbank in der Werkstatt holen.', 3400);
      return;
    }
    const nL = st.layers.length,
      pick = w => {
        const li = w === 'oben' ? nL - 1 : w === 'unten' ? 0 : Math.floor(nL / 2);
        return bs.filter(b => b.layer === li).sort((a, b) => Math.abs(a.sa) - Math.abs(b.sa))[0];
      };
    const c = clim(doyOf(CLOCK.t)),
      Tw = Math.round(c.T);
    WUI.machine({
      title: 'Holzfeuchte messen',
      sub: `Widerstandsmessgerät mit Einschlagelektrode · Holztemperatur etwa ${Tw} °C`,
      choices: [
        {
          k: 'where',
          label: 'Welches Brett',
          val: 'mitte',
          opts: [
            ['oben', 'oberste Lage'],
            ['mitte', 'mittlere Lage'],
            ['unten', 'unterste Lage'],
          ],
        },
        {
          k: 'grp',
          label: 'Holzartengruppe am Gerät',
          val: 3,
          opts: [
            [1, '1'],
            [2, '2'],
            [3, '3 (Fichte, Lärche)'],
            [4, '4'],
          ],
        },
      ],
      rows: [{ k: 'temp', label: 'Temperatur am Gerät', unit: '°C', val: 20, min: -5, max: 35, step: 1 }],
      info: 'Die Elektrode quer zur Faser ein Viertel bis ein Drittel der Dicke tief einschlagen, in der Brettmitte, nicht am Ende (die Enden trocknen viel schneller). Genau ist die Messung von 6 bis 30 %; darüber nur grob.',
      go: 'Messen',
      onGo: v => {
        const b = pick(v.where);
        if (!b) return;
        PLAY.run({
          id: 'hd:meter',
          r: 3,
          rMove: 2.5,
          pos,
          label: () => 'Messen',
          hold: 1.8,
          holdLabel: 'Elektrode einschlagen …',
          anim3: 'interactLoop',
          run: () => {
            let r = b.mc + (+v.grp - 3) * 1.6 + ((+v.temp - Tw) / 5.6) * 0.5 + ((hashOf(b) % 7) - 3) * 0.15;
            const shown =
              r > 30
                ? `über Fasersättigung (Anzeige ${Math.round(Math.min(99, r + ((hashOf(b) % 9) - 4)))} %, nur grob)`
                : `${de(Math.max(4, r))} %`;
            const ok = Math.abs(+v.grp - 3) < 0.5 && Math.abs(+v.temp - Tw) < 3;
            S.lastRead = { t: CLOCK.t, v: r, true: b.mc, where: v.where };
            think(
              `Holzfeuchte ${v.where === 'oben' ? 'oben' : v.where === 'unten' ? 'unten' : 'in der Mitte'}: ${shown}.${ok ? '' : ' (Holzart oder Temperatur am Gerät stimmt nicht – der Wert weicht ab.)'}`,
              5200
            );
          },
        });
      },
    });
  }
  // ---------------- time-lapse and the curve ----------------
  function chart() {
    const H = S.hist.slice(-400);
    if (H.length < 2) return '';
    const d0 = H[0][0],
      d1 = H[H.length - 1][0],
      W = 300,
      Hh = 150,
      x = d => 30 + ((d - d0) / Math.max(1, d1 - d0)) * (W - 40),
      y = v => 10 + (1 - Math.min(1, v / 100)) * (Hh - 30);
    let s = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="img" aria-label="Holzfeuchte im Stapel"><rect x="30" y="10" width="${W - 40}" height="${Hh - 30}" fill="none" stroke="#bbb"/>`;
    for (const v of [15, 20, 30, 60])
      s += `<line x1="30" x2="${W - 10}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#ddd"/><text x="4" y="${(y(v) + 4).toFixed(1)}" font-size="9" fill="#777">${v} %</text>`;
    const pl = k => H.map(h => `${x(h[0]).toFixed(1)},${y(h[k]).toFixed(1)}`).join(' ');
    s += `<polyline points="${pl(3)}" fill="none" stroke="#c9a46a" stroke-width="1"/><polyline points="${pl(2)}" fill="none" stroke="#c9a46a" stroke-width="1"/><polyline points="${pl(1)}" fill="none" stroke="#7a4a1e" stroke-width="2"/>`;
    const dt = dateOf(d0 * 1440),
      de_ = dateOf(d1 * 1440);
    s += `<text x="30" y="${Hh - 4}" font-size="9" fill="#777">${dt.getUTCDate()}. ${MON[dt.getUTCMonth()]}</text><text x="${W - 70}" y="${Hh - 4}" font-size="9" fill="#777">${de_.getUTCDate()}. ${MON[de_.getUTCMonth()]} ${de_.getUTCFullYear()}</text></svg>`;
    return s;
  }
  function openLapse() {
    advance();
    const ms = stackMC();
    const c = clim(doyOf(CLOCK.t));
    WUI.machine({
      title: 'Trocknen · Zeitraffer',
      sub: ms
        ? `${ms.n} Bretter · Mittel ${de(ms.avg)} % (${de(ms.min)}–${de(ms.max)} %) · draußen jetzt ~${Math.round(c.T)} °C, Gleichgewicht ~${de(c.E)} %`
        : 'Der Stapel ist leer',
      fig: chart(),
      choices: [
        {
          k: 'span',
          label: 'Vorspulen',
          val: 'w',
          opts: [
            ['w', '1 Woche'],
            ['m', '1 Monat'],
            ['q', '3 Monate'],
            ['20', 'bis 20 %'],
            ['15', 'bis 15 %'],
          ],
        },
      ],
      info: 'Luftgetrocknet erreicht Holz hier im Sommer 13–15 %, im Winter nur um 20 %: Die Luft ist dann zu feucht. Für die Werkstatt (Möbel, Schneidebretter) braucht es 8–10 % – das schafft erst der Trockenschrank.',
      go: 'Vorspulen',
      onGo: v => {
        let days = v.span === 'w' ? 7 : v.span === 'm' ? 30 : v.span === 'q' ? 91 : forecast(+v.span);
        if (!(days > 0)) {
          think('Das wird draußen so nicht erreicht – erst im nächsten Sommer oder im Trockenschrank.', 4200);
          return;
        }
        CLOCK.wait(days * 1440, 'Zeitraffer', () => {
          advance();
          const m2 = stackMC();
          if (m2) think(`Nach ${days} Tagen: im Mittel ${de(m2.avg)} % (${de(m2.min)}–${de(m2.max)} %).`, 4800);
        });
      },
    });
  }
  // days until the stack's mean reaches the target (simulated on a copy), ≤ 730
  function forecast(target) {
    const st = S.stack,
      bs = B()
        .filter(b => b.st === 'stack')
        .map(b => Object.assign({}, b));
    if (!bs.length) return 0;
    let t = CLOCK.t;
    for (let d = 1; d <= 730; d++) {
      const doy = doyOf(t);
      for (const b of bs) stepDay(b, doy, st);
      t += 1440;
      if (bs.reduce((s, b) => s + b.mc, 0) / bs.length <= target) return d;
    }
    return -1;
  }
  // ---------------- the drying cabinet at the workshop's west wall: from air-dry (≤ 20 %) to workshop-dry (8–10 %) ----------------
  // An insulated cabinet with a condensation dehumidifier and a fan (~45 °C): boards cut to workshop length (1 m) on stickers inside.
  const KP = { x: -7.1, y: -39.15, w: 0.85, l: 1.5, h: 2.05 }; // workshop coordinates as built
  function buildKiln() {
    const g = new THREE.Group(),
      white = new THREE.MeshStandardMaterial({ color: 0xe6e7e2, roughness: 0.55 }),
      dark = new THREE.MeshStandardMaterial({ color: 0x34383b, roughness: 0.5 });
    const led = (S.led = new THREE.MeshStandardMaterial({ color: 0x0c2410, emissive: 0x29ff5a, emissiveIntensity: 0 })),
      bx = (sx, sy, sz, x, y, z, m) => {
        const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sz, sy), m);
        me.position.copy(V(x, y, z));
        me.castShadow = me.receiveShadow = true;
        g.add(me);
      };
    bx(KP.w, KP.l, KP.h, KP.x, KP.y, KP.h / 2, white);
    bx(0.02, KP.l - 0.1, KP.h - 0.12, KP.x - KP.w / 2 - 0.006, KP.y, KP.h / 2, white); // the door on the west side
    bx(0.03, 0.03, 0.4, KP.x - KP.w / 2 - 0.03, KP.y + KP.l / 2 - 0.16, KP.h / 2, dark);
    for (const z of [0.25, 1.8]) bx(0.03, 0.12, 0.06, KP.x - KP.w / 2 - 0.02, KP.y - KP.l / 2 + 0.08, z, dark); // handle, hinges
    bx(0.4, 0.5, 0.25, KP.x, KP.y, KP.h + 0.125, dark);
    bx(0.01, 0.12, 0.06, KP.x - KP.w / 2 - 0.02, KP.y + 0.35, 1.55, led); // the dehumidifier on top, the display
    g.traverse(o => {
      if (o.isMesh) o.userData.noMerge = true;
    });
    G.add(g);
    HOLZ.setCol('holzofen', [
      [KP.x - KP.w / 2 - 0.03, KP.x + KP.w / 2, KP.y - KP.l / 2, KP.y + KP.l / 2, 0, KP.h + 0.25],
    ]);
  }
  const kpos = () => {
    const [x, y] = WT(KP.x - KP.w / 2 - 0.6, KP.y);
    return [x, y, 1.0];
  };
  const inKiln = () => B().filter(b => b.st === 'kiln');
  const avgOf = bs => (bs.length ? bs.reduce((s, b) => s + b.mc, 0) / bs.length : 0);
  function kilnOp() {
    const k = inKiln(),
      st = S.stack,
      sb = B().filter(b => b.st === 'stack');
    if (!k.length) {
      if (!sb.length) return null;
      const m = avgOf(sb);
      return {
        label: 'Lufttrockene Bretter auf 1 m ablängen, in den Trockenschrank',
        run: () => {
          if (m > 21) {
            think(
              `Erst lufttrocken: im Mittel ${de(m)} %. Über ~20 % reißen sie im Schrank (zu großes Feuchtegefälle).`,
              4600
            );
            return;
          }
          PLAY.run({
            id: 'hd:kin',
            r: 3,
            rMove: 2.5,
            pos: kpos,
            label: () => 'Einlagern',
            hold: 4,
            holdLabel: 'Ablängen, mit Leisten einstapeln …',
            anim3: 'interactLoop',
            run: () => {
              for (const b of sb) {
                b.st = 'kiln';
                b.Lw = Math.max(0, b.L - 2 * (b.endck || 0));
              }
              if (st) {
                st.layers = [];
                st.roof = false;
              }
              S.kiln = { on: false, t0: CLOCK.t };
              CLOCK.t += 40;
              rebuild();
              save();
              think(
                'Eingelagert: die Bretter in 1-m-Stücken auf Leisten im Schrank. Jetzt das Programm starten.',
                3600
              );
            },
          });
        },
      };
    }
    const m = avgOf(k);
    if (!S.kiln.on && m > 10.5)
      return {
        label: 'Trockenschrank starten (Ziel 9 %, 45 °C, Entfeuchter)',
        run: () => {
          S.kiln.on = true;
          S.kiln.t1 = CLOCK.t;
          if (S.led) S.led.emissiveIntensity = 1.5;
          save();
          markDirty(true);
          think('Läuft: Lüfter und Entfeuchter an. Bis 9 % dauert es etwa zwei bis drei Wochen.', 3800);
        },
      };
    if (S.kiln.on && m > 10.5)
      return {
        label: `Trockenschrank: ${de(m)} % – warten (Zeitraffer)`,
        run: () => {
          const days = kilnDays();
          CLOCK.wait(days * 1440, 'Zeitraffer', () => {
            advance();
            think(`Im Schrank jetzt ${de(avgOf(inKiln()))} %.`, 3200);
          });
        },
      };
    return {
      label: `Trockene Bretter (${de(m)} %) aus dem Schrank in die Werkstatt`,
      run: () =>
        PLAY.run({
          id: 'hd:kout',
          r: 3,
          rMove: 2.5,
          pos: kpos,
          label: () => 'Ausräumen',
          hold: 3,
          holdLabel: 'Ausräumen …',
          anim3: 'interactLoop',
          run: toShop,
        }),
    };
  }
  function kilnDays() {
    const bs = inKiln().map(b => Object.assign({}, b));
    let t = CLOCK.t;
    for (let d = 1; d <= 120; d++) {
      const doy = doyOf(t);
      for (const b of bs) stepDay(b, doy, S.stack);
      t += 1440;
      if (avgOf(bs) <= 9.5) return d;
    }
    return 120;
  }
  // to the workshop: planks of ≥ 35 mm become glued panels 40 × 400 × 1000 mm for the end-grain board (werk/werk.js), thinner boards are stored
  function toShop() {
    const k = inKiln(),
      m = avgOf(k),
      sp = k.length ? k[0].sp : 'larch';
    let area = 0,
      thin = 0;
    for (const b of k) {
      b.st = 'used';
      const L1 = Math.floor((b.Lw || b.L) + 1e-6),
        w = ((b.wS + b.wW) / 2) * (b.blue ? 0.85 : 1) * (b.warp ? 0.8 : 1) * (b.crack ? 0.7 : 1);
      if (b.t >= 0.035) area += L1 * w;
      else thin += L1;
    }
    const n = Math.floor((area * 0.8) / 0.4);
    if (S.led) S.led.emissiveIntensity = 0;
    S.kiln = null;
    save();
    markDirty(true);
    if (n && window.WERK && WERK.addOwn) WERK.addOwn(n, sp, m);
    think(
      n
        ? `${n} Leimholzplatte${n > 1 ? 'n' : ''} ${{ larch: 'Lärche', spruce: 'Fichte' }[sp] || ''} aus den eigenen Bohlen (abgerichtet, gehobelt, verleimt) liegen jetzt im Werkstattregal – daraus wird ein Stirnholzbrett.${thin ? ` Dazu ${thin} m dünnere Bretter auf Vorrat.` : ''}`
        : `Die Bretter (${thin} m) liegen auf Vorrat in der Werkstatt. Für Leimholz braucht es Bohlen ab 35 mm.`,
      6500
    );
    if (window.QUESTS && QUESTS.banner)
      QUESTS.banner(
        'Eigenes Holz in der Werkstatt',
        n
          ? `${n} Platte${n > 1 ? 'n' : ''} aus ${{ larch: 'Lärche', spruce: 'Fichte' }[sp] || 'Holz'} der Klinge, ${de(m)} % Holzfeuchte`
          : 'Bretter auf Vorrat'
      );
  }
  // ---------------- the acts at the stack ----------------
  function opAt() {
    const st = S.stack,
      piles = SAW() ? SAW().pileBoards() : [];
    if (!st) return piles.length ? { label: 'Trockenstapel anlegen', run: openSetup } : null;
    if (piles.length && !st.roof)
      return {
        label: 'Nächste Lage stapeln (Leisten, Bretter)',
        run: () =>
          PLAY.run({
            id: 'hd:layer',
            r: 3,
            rMove: 2.5,
            pos,
            label: () => 'Lage stapeln',
            hold: 2.6,
            holdLabel: 'Leisten auflegen, Bretter legen …',
            anim3: 'interactLoop',
            run: layOne,
          }),
      };
    if (st.layers.length && !st.roof && !piles.length)
      return { label: 'Stapel abdecken und beschweren', run: openRoof };
    return null;
  }
  function register() {
    PLAY.act({
      id: 'hd:op',
      r: 2.8,
      prio: 0.7,
      pos,
      label: () => {
        const o = opAt();
        return o ? o.label : null;
      },
      run: () => {
        const o = opAt();
        if (o) o.run();
      },
    });
    PLAY.act({
      id: 'hd:meter',
      r: 2.8,
      prio: 0.6,
      pos: () => {
        const p = pos();
        return [p[0] + 0.6, p[1], p[2]];
      },
      label: () => (S.stack && S.stack.layers.length ? 'Holzfeuchte messen' : null),
      run: openMeter,
    });
    PLAY.act({
      id: 'hd:kiln',
      r: 2.6,
      prio: 0.7,
      pos: kpos,
      label: () => {
        const o = kilnOp();
        return o ? o.label : null;
      },
      run: () => {
        const o = kilnOp();
        if (o) o.run();
      },
    });
    PLAY.act({
      id: 'hd:lapse',
      r: 2.8,
      prio: 0.5,
      pos: () => {
        const p = pos();
        return [p[0] - 0.6, p[1], p[2]];
      },
      label: () => (S.stack && S.stack.layers.length ? 'Trocknen beobachten (Zeitraffer)' : null),
      run: openLapse,
    });
    // the clock window lists the stack while it dries
    // (the forecast to 20 % – air-dry – once per game hour; 'fertig' when there; not listed if it would take more than two years)
    let fc = { h: -1, d: 0 };
    if (typeof CLOCK.jobs === 'function')
      CLOCK.jobs(() => {
        const m = stackMC();
        if (!m) return [];
        const h = Math.floor(CLOCK.t / 60);
        if (h !== fc.h) {
          fc.h = h;
          fc.d = m.avg > 20 ? forecast(20) : 0;
        }
        if (fc.d < 0) return [];
        return [
          {
            label: `Trockenstapel: ${de(m.avg)} % Holzfeuchte${m.avg > 20 ? ', lufttrocken (20 %)' : ' – lufttrocken'}`,
            left: fc.d > 0 ? fc.d * 1440 : 0,
          },
        ];
      });
  }
  // ---------------- saving (inside world/holz.js) ----------------
  function save() {
    if (HOLZ.save) HOLZ.save();
  }
  const p2 = HOLZ.part2;
  HOLZ.part2 = () => Object.assign(p2 ? p2() : {}, { stack: S.stack, hist: S.hist.slice(-400), kiln: S.kiln });
  const on0 = HOLZSAW.onStart;
  HOLZSAW.onStart = p => {
    if (on0) on0(p);
    if (p) {
      S.stack = p.stack || null;
      S.hist = p.hist || [];
      S.kiln = p.kiln || null;
    }
    buildKiln();
    if (S.kiln && S.kiln.on && S.led) S.led.emissiveIntensity = 1.5;
    register();
    rebuild();
  };
  let acc = 0;
  KERN.tick(dt => {
    acc += dt;
    if (acc < 1) return;
    acc = 0;
    try {
      if (HOLZ.ready) advance();
    } catch (e) {
      if (!S._err) {
        S._err = 1;
        console.warn('holzdry', e);
      }
    }
  }, 'werk/holz_dry');
  Object.assign(S, { clim, doyOf, advance, stackMC, forecast, rebuild, layOne, nextLayer, rateOf, stepDay });
  return S;
})();
window.HOLZDRY = HOLZDRY;
