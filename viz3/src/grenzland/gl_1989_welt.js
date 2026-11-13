// ===================== feat/grenzland: the village as it was in November 1989 (GL89WELT) – what is hidden, what is added =====================
// Falko, 13.11.2026 0:32: „achte bei den Rückblenden auf 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion und
// sonstigen, sodass es wirklich gut ankommt und realistisch wirkt.“ While the flashback runs (grenzland/gl_1989.js) the village of today
// is taken back, from outside and without a line changed in the modules that own it – every flag, colour and vertex is put back on
// leaving (S.undo, in reverse order):
// - gone: the cars of the aerial photo (dinge/dinge.js: their meshes hidden, their places empty, the clock of the places held), the
//   villagers of today and their cars (dorf/dorf.js: DORF.S.hold as the zombie night uses it), the walkers and cars of the traffic, the
//   buses and their passengers, the lanterns of today (world/village_props.js), the wheelie bins and satellite dishes at the houses
//   (world/village_near.js: their triangles folded away in each cell's mesh, by colour), the vending machine and the white box of the
//   centre (world/dorfkern.js: folded away, by place);
// - changed: plaster, timber and roofs greyed as unrenovated (a tint on the two facade materials), the crowns of the far trees in the
//   last brown leaves of November and the limes of the Anger bare (their leaf material's alpha test), the haze of a valley heated with
//   brown coal (the scene's fog, read as the larger of the day's and ours – as the zombie night does), the weather set fair and hazy
//   (WETTER.preset), the clock slowed (CLOCK.focus) and led on by us so that the afternoon turns to dusk in about ten minutes;
// - added, about 150 m round the old school: the street of the time as one mesh of vertex colours in the traffic's material (no new
//   shader program) – street lamps on wooden poles with enamel shades, the yellow telephone box, an advertising pillar, the milk churn
//   stand, heaps of briquettes with shovel and buckets, a hand cart, bicycles, zinc ash cans, washing on a line, the frames of the
//   banner, the shop sign and the notice board –, what is written and printed on them as one small atlas drawn here (banner, the
//   Konsum's sign and opening hours, the notice board's sheets, the pillar's posters; a clone of the bus's sign material: its program
//   is there already), the lamps' bulbs (the lanterns' glass material: they light with the village), the smoke of the chimneys (soft
//   cards in the material of the lamps' light pools), the parked cars of the time and a lorry with coal (grenzland/gl_auto.js).
// Nothing is built before GL89WELT.enter() and everything is freed in leave().
//   GL89WELT.enter() · leave() · tick(dt) · on · modern() → what of today is still to be seen (numbers, for the test) · state()
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { RATSCHER } from '../world/ratscher.js';
import { ROADS } from '../world/roads.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { VNEAR } from '../world/village_near.js';
import { DORFKERN } from '../world/dorfkern.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { DCARS } from '../dorf/dorf_cars.js';
import { DORF } from '../dorf/dorf.js';
import { DINGE } from '../dinge/dinge.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { VERKEHR } from '../verkehr/verkehr.js';
import { WETTER } from '../wetter/wetter.js';
import { BUSMOD } from '../bus/bus_modell.js';
import { BUS } from '../bus/bus.js';
import { thinCards } from '../garden/trees.js';
import { BUSLEUTE } from '../bus/bus_leute.js';
import { GLDATA } from './gl_data.js';
import { GLAUTO } from './gl_auto.js';
import { GL89DATA } from './gl_1989_data.js';
export const GL89WELT = (() => {
  const S = {
    on: false,
    undo: [],
    meshes: [],
    cars: [],
    boxes: [],
    lamps: [],
    smoke: null,
    puffs: [],
    print: null,
    scanT: 0,
    smokeT: 0,
    fogZ: 0,
    err: '',
    stats: { dinge: 0, tonnen: 0, kern: 0, laternen: 0 },
  };
  const B = GL89DATA.BILD,
    MITTE = GL89DATA.MITTE;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)],
    L1 = (r, g, b) => [lin(r), lin(g), lin(b)];
  const hyp = Math.hypot;
  const gz = (x, y) => {
    const z = KERN.terrain ? KERN.terrain(x, y) : KERN.ground(x, y);
    return Number.isFinite(z) ? z : 0;
  };
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const night = () => {
    try {
      return VILLAGE.night ? VILLAGE.night() : 0;
    } catch (e) {
      return 0;
    }
  };
  const safe = (what, fn) => {
    try {
      return fn();
    } catch (e) {
      if (!S.err) S.err = what + ': ' + String((e && e.message) || e).slice(0, 120);
      console.warn('grenzland 1989', what, e);
      return null;
    }
  };
  // ------------------------------------------------------------------ hiding today ------------------------------------------------------------------
  const set = (o, k, v) => {
    const old = o[k];
    o[k] = v;
    S.undo.push(() => {
      o[k] = old;
    });
  };
  const hideObj = m => {
    if (m && m.visible) set(m, 'visible', false);
  };
  // fold away the triangles of a merged mesh that `test` picks (site x, y, z of a corner, its colour): the mesh keeps its size, the
  // corners of such a triangle fall into one point; the positions as they were are kept and put back on leaving
  const folded = new WeakSet();
  function fold(mesh, test) {
    const g = mesh && mesh.geometry;
    if (!g || g.index || folded.has(g)) return 0;
    const Pa = g.attributes.position,
      C = g.attributes.color;
    if (!Pa || !C) return 0;
    folded.add(g);
    const a = Pa.array,
      c = C.array;
    let keep = null,
      n = 0;
    for (let i = 0; i + 2 < Pa.count; i += 3) {
      let all = true;
      for (let k = 0; k < 3 && all; k++) {
        const j = (i + k) * 3;
        all = test(a[j], -a[j + 2], a[j + 1], c[j], c[j + 1], c[j + 2]);
      }
      if (!all) continue;
      if (!keep) keep = a.slice();
      const j = i * 3;
      for (let k = 1; k < 3; k++) {
        a[j + k * 3] = a[j];
        a[j + k * 3 + 1] = a[j + 1];
        a[j + k * 3 + 2] = a[j + 2];
      }
      n++;
    }
    if (n) {
      Pa.needsUpdate = true;
      S.undo.push(() => {
        folded.delete(g);
        if (Pa.array.length === keep.length) {
          Pa.array.set(keep);
          Pa.needsUpdate = true;
        }
      });
    }
    return n;
  }
  // the colours of what world/village_near.js puts beside the doors and under the eaves and what was not there in 1989
  const BINS = [L1(0.28, 0.29, 0.3), L1(0.15, 0.3, 0.6), L1(0.42, 0.28, 0.16), L1(0.85, 0.72, 0.1)],
    NEU = BINS.concat(
      BINS.map(c => c.map(v => v * 0.8)),
      [L1(0.85, 0.85, 0.84), L1(0.6, 0.6, 0.6)]
    ),
    isNeu = (x, y, z, r, g, b) => {
      for (const c of NEU)
        if (Math.abs(r - c[0]) < 0.003 && Math.abs(g - c[1]) < 0.003 && Math.abs(b - c[2]) < 0.003) return true;
      return false;
    };
  // again and again while the flashback runs: cells of other modules built meanwhile, people and cars that came
  function scan() {
    // the cars of the aerial photo: every built cell's meshes hidden, its places empty
    safe('dinge', () => {
      for (const c of DINGE.cells.values()) {
        if (!c.built) continue;
        for (const m of c.meshes || [])
          if (m.visible) {
            hideObj(m);
            S.stats.dinge++;
          }
        for (const p of c.places || []) if (!p.hide) set(p, 'hide', true);
      }
    });
    // wheelie bins and satellite dishes
    safe('vnear', () => {
      for (const c of VNEAR.cells.values()) if (c.ready && c.mesh) S.stats.tonnen += fold(c.mesh, isNeu);
    });
    // whoever of today came meanwhile
    safe('leute', () => {
      for (const k of Object.keys(DPEOPLE.figs || {})) DPEOPLE.hide(k);
      if (VERKEHR.S.peds.length || VAUTO.cars.length) VERKEHR.clear();
      for (const I of BUS.S.inst.slice()) if (!(BUS.S.ride && BUS.S.ride.I === I)) BUS.drop(I);
      for (const c of Object.values(DCARS.cars || {})) if (c && c.g) hideObj(c.g);
    });
  }
  function hide() {
    // the villagers of today stay in (the slot the zombie night uses; what was there comes back)
    safe('dorf', () => {
      set(DORF.S, 'hold', () => true);
      for (const k of Object.keys(DPEOPLE.figs || {})) DPEOPLE.hide(k);
    });
    safe('verkehr', () => {
      const a = VERKEHR.S.auto;
      VERKEHR.autoOn(false);
      VERKEHR.clear();
      S.undo.push(() => VERKEHR.autoOn(a));
    });
    safe('bus', () => {
      set(BUS.S, 'auto', false);
      const f = BUSLEUTE.force;
      BUSLEUTE.force = { ein: 0, aus: 0 };
      S.undo.push(() => {
        BUSLEUTE.force = f;
      });
    });
    safe('dinge', () => set(DINGE, 'frozen', true));
    // the lanterns of today (poles and glass; the pools of light on the ground stay for the lamps of the time)
    safe('laternen', () => {
      for (const m of VPROPS.meshes || [])
        if (m.isInstancedMesh && m !== VPROPS.pool) {
          hideObj(m);
          S.stats.laternen++;
        }
    });
    // the vending machine by the post box and the white box behind the bus stop
    safe('dorfkern', () => {
      const O = DKDATA.open;
      if (!O) return;
      const v = O.vending,
        w = O.whitebox,
        t = (x, y, z) =>
          (v && hyp(x - v[0], y - v[1]) < 0.6 && z < gz(v[0], v[1]) + 1.4) ||
          (w && hyp(x - w[0], y - w[1]) < Math.max(w[3], w[4]) / 2 + 0.5 && z < gz(w[0], w[1]) + w[5] + 0.3);
      for (const m of DORFKERN.meshes || []) if (m.isMesh && !m.isInstancedMesh) S.stats.kern += fold(m, t);
    });
    // plaster, timber and roofs as they were: grey, unrenovated
    safe('fassaden', () => {
      for (const [m, c] of [
        [RATSCHER.bld && RATSCHER.bld[0] && RATSCHER.bld[0].material, B.wand],
        [RATSCHER.bld && RATSCHER.bld[1] && RATSCHER.bld[1].material, B.dach],
      ]) {
        if (!m || !m.color) continue;
        const old = m.color.clone();
        m.color.setRGB(old.r * c[0], old.g * c[1], old.b * c[2]);
        S.undo.push(() => m.color.copy(old));
      }
    });
    // November: the limes of the Anger bare, the far crowns in their last brown leaves
    safe('laub', () => {
      const lm = VPROPS.lindeMeshes && VPROPS.lindeMeshes[1] && VPROPS.lindeMeshes[1].material;
      if (lm && lm.alphaTest > 0) set(lm, 'alphaTest', 1.01);
      // feat/grenzland-licht: the bare lime – without its leaves only the boughs were left, ending in spikes; fine twigs where the leaves
      // were make it read as a lime in November
      zweige();
      const fm = RATSCHER.trees && RATSCHER.trees[0] && RATSCHER.trees[0].material;
      if (fm && fm.color) {
        const old = fm.color.clone();
        fm.color.setRGB(old.r * B.laub[0], old.g * B.laub[1], old.b * B.laub[2]);
        S.undo.push(() => fm.color.copy(old));
        if (fm.alphaTest > 0) set(fm, 'alphaTest', Math.min(0.62, fm.alphaTest + 0.26));
      }
    });
    // the haze: the scene's own fog, read as the larger of the day's value and ours
    safe('dunst', () => {
      const F = scene.fog;
      if (!F || !F.isFogExp2 || Object.getOwnPropertyDescriptor(F, 'density').get) return;
      let base = F.density;
      Object.defineProperty(F, 'density', {
        configurable: true,
        enumerable: true,
        get: () => Math.max(base, S.fogZ),
        set: v => {
          base = v;
        },
      });
      S.undo.push(() => {
        delete F.density;
        F.density = base;
      });
    });
    safe('wetter', () => {
      const old = WETTER.state().preset;
      WETTER.preset(B.wetter);
      S.undo.push(() => WETTER.preset(old));
    });
    // the clock: in real time (as while glue is open), and led on by tick() so that dusk comes
    safe('uhr', () => {
      CLOCK.focus('gl-1989');
      S.undo.push(() => CLOCK.unfocus('gl-1989'));
    });
    scan();
  }
  // ---- feat/grenzland-licht: the Dorflinde in November – sprays of fine twigs on the cards of its leaves (the coarser set: fewer, larger),
  //      in a copy of the leaves' own material (its program) with a drawing of twigs; gone on leaving (the cards' geometry is the lime's) ----
  function zweigBild() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const x = cv.getContext('2d');
    let q = 1889;
    const rnd = () => {
      q = (q * 16807) % 2147483647;
      return (q - 1) / 2147483646;
    };
    x.lineCap = 'round';
    x.strokeStyle = '#d8d0c6';
    // a twig: from (px, py) at angle a (0 = up), length l, width w; it forks, the forks thinner and shorter, a little crooked
    const zweig = (px, py, a, l, w, n) => {
      let cx = px,
        cy = py,
        aa = a;
      const seg = 4;
      x.lineWidth = w;
      x.beginPath();
      x.moveTo(cx, cy);
      for (let i = 0; i < seg; i++) {
        aa += (rnd() - 0.5) * 0.35;
        cx += Math.sin(aa) * (l / seg);
        cy -= Math.cos(aa) * (l / seg);
        x.lineTo(cx, cy);
      }
      x.stroke();
      if (n <= 0 || w < 1.6) return;
      const k = 2 + (rnd() < 0.45 ? 1 : 0);
      for (let j = 0; j < k; j++) {
        const t = 0.45 + 0.55 * rnd(),
          bx = px + (cx - px) * t,
          by = py + (cy - py) * t,
          side = j % 2 ? 1 : -1;
        zweig(bx, by, aa + side * (0.35 + 0.45 * rnd()), l * (0.5 + 0.2 * rnd()), w * 0.68, n - 1);
      }
      zweig(cx, cy, aa + (rnd() - 0.5) * 0.4, l * 0.55, w * 0.7, n - 1);
    };
    for (let i = 0; i < 2; i++) zweig(126 + i * 4, 254, (i - 0.5) * 0.5, 112 - i * 14, 4.2, 4);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function zweige() {
    const L = VPROPS.lindeMeshes;
    if (!L || !L[1] || !L[2] || !L[1].material) return;
    const base = L[1].material,
      m = base.clone();
    // (a copy has no shader patch of its own – three copies neither onBeforeCompile nor the key: given the original's, it shares its program)
    m.onBeforeCompile = base.onBeforeCompile;
    if (Object.prototype.hasOwnProperty.call(base, 'customProgramCacheKey'))
      m.customProgramCacheKey = base.customProgramCacheKey;
    m.map = zweigBild();
    m.color.setRGB(0.25, 0.22, 0.19);
    m.alphaTest = 0.42;
    m.name = 'grenzland 1989 zweige';
    // a quarter of the leaves' cards, a little larger: sprays of twigs, the sky between them
    const geo = thinCards(L[1].geometry, 0.24, 1.35),
      me = new THREE.Mesh(geo, m);
    me.name = 'grenzland 1989 linde';
    me.userData.noMerge = true;
    me.castShadow = false;
    me.receiveShadow = false;
    scene.add(me);
    S.zweige = me;
    S.undo.push(() => {
      scene.remove(me);
      geo.dispose();
      m.map.dispose();
      m.dispose();
      S.zweige = null;
    });
  }
  // ------------------------------------------------------------------ what is written: one atlas ------------------------------------------------------------------
  // regions of the atlas in pixels [x, y, w, h] (1024 × 512)
  const AT = {
    losung: [0, 0, 1024, 84],
    losung2: [0, 86, 1024, 60],
    konsum: [0, 150, 512, 96],
    zeiten: [516, 150, 150, 96],
    fern: [670, 150, 220, 40],
    halt: [670, 194, 220, 52],
    wand: [0, 250, 420, 262],
    p0: [424, 250, 148, 262],
    p1: [574, 250, 148, 262],
    p2: [724, 250, 148, 262],
    p3: [874, 250, 148, 262],
  };
  function atlas() {
    const T = GL89DATA.SCHRIFT,
      cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 512;
    const c = cv.getContext('2d');
    c.fillStyle = '#777';
    c.fillRect(0, 0, 1024, 512);
    const text = (s, x, y, font, col, al = 'center') => {
      c.font = font;
      c.fillStyle = col;
      c.textAlign = al;
      c.textBaseline = 'middle';
      c.fillText(s, x, y);
    };
    const grain = (r, k = 14, n = 700) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = 'rgba(0,0,0,' + (hh(i + r[0]) * 0.06).toFixed(3) + ')';
        c.fillRect(r[0] + hh(i * 3.1) * r[2], r[1] + hh(i * 7.3) * r[3], 2 + hh(i) * k, 1 + hh(i * 1.7) * 3);
      }
    };
    const SANS = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    // a line of the banner in the largest size that fits its cloth (a long slogan lost its first and last letters)
    const fit = (t, w, px) => {
      for (; px > 14; px -= 2) {
        c.font = 'bold ' + px + 'px ' + SANS;
        if (c.measureText(t).width <= w) break;
      }
      return 'bold ' + px + 'px ' + SANS;
    };
    // the banner: white letters painted on red cloth, a little faded
    let r = AT.losung;
    c.fillStyle = '#a3231e';
    c.fillRect(...r);
    grain(r, 60, 500);
    text(GLDATA.J89.losung[0], 512, r[1] + r[3] / 2 + 2, fit(GLDATA.J89.losung[0], r[2] - 40, 62), '#f1ead8');
    r = AT.losung2;
    c.fillStyle = '#9c2a22';
    c.fillRect(...r);
    grain(r, 60, 400);
    text(GLDATA.J89.losung[1], 512, r[1] + r[3] / 2 + 2, fit(GLDATA.J89.losung[1], r[2] - 40, 36), '#efe6d2');
    // the shop's sign: enamel, cream, dark red block letters
    r = AT.konsum;
    c.fillStyle = '#e6dfc8';
    c.fillRect(...r);
    c.strokeStyle = '#7c1f1c';
    c.lineWidth = 5;
    c.strokeRect(r[0] + 5, r[1] + 5, r[2] - 10, r[3] - 10);
    text(T.konsum, r[0] + 196, r[1] + 50, 'bold 70px ' + SANS, '#7c1f1c');
    text(T.konsum2, r[0] + 418, r[1] + 54, 'italic 30px Georgia, serif', '#3a3a36');
    grain(r, 8, 260);
    r = AT.zeiten;
    c.fillStyle = '#efeadb';
    c.fillRect(...r);
    text('Geöffnet', r[0] + r[2] / 2, r[1] + 18, 'bold 17px ' + SANS, '#222');
    T.zeiten.forEach((s, i) => text(s, r[0] + r[2] / 2, r[1] + 46 + i * 24, '15px ' + SANS, '#222'));
    r = AT.fern;
    c.fillStyle = '#e8b81c';
    c.fillRect(...r);
    text(T.fernsprecher, r[0] + r[2] / 2, r[1] + r[3] / 2 + 1, 'bold 26px ' + SANS, '#161616');
    r = AT.halt;
    c.fillStyle = '#e9c21f';
    c.fillRect(...r);
    text(T.halt, r[0] + r[2] / 2, r[1] + r[3] / 2 + 1, 'bold 30px ' + SANS, '#14381f');
    // the notice board: sheets pinned on brown soft board under the red head line
    r = AT.wand;
    c.fillStyle = '#8a6a48';
    c.fillRect(...r);
    c.fillStyle = '#a3231e';
    c.fillRect(r[0] + 8, r[1] + 8, r[2] - 16, 40);
    text(T.wandzeitung, r[0] + r[2] / 2, r[1] + 29, 'bold 28px ' + SANS, '#f1ead8');
    const sheet = (x, y, w, h, head, rot) => {
      c.save();
      c.translate(r[0] + x + w / 2, r[1] + y + h / 2);
      c.rotate(rot);
      c.fillStyle = '#e9e3d0';
      c.fillRect(-w / 2, -h / 2, w, h);
      if (head) text(head, 0, -h / 2 + 15, 'bold 13px ' + SANS, '#8c1f1c');
      c.fillStyle = '#55524a';
      for (let i = 0; i < (h - 34) / 9; i++)
        c.fillRect(-w / 2 + 8, -h / 2 + 28 + i * 9, (w - 16) * (0.55 + 0.45 * hh(i + x)), 2);
      c.fillStyle = '#b02a22';
      c.beginPath();
      c.arc(0, -h / 2 + 4, 3, 0, 7);
      c.fill();
      c.restore();
    };
    sheet(14, 58, 120, 150, '40 Jahre DDR', -0.03);
    sheet(146, 62, 118, 96, 'Plan 1989', 0.02);
    sheet(146, 166, 118, 84, 'Altstoffe', -0.02);
    sheet(278, 58, 128, 110, 'Mitteilungen', 0.03);
    // (a photograph of the brigade: grey shapes)
    c.fillStyle = '#d8d2c0';
    c.fillRect(r[0] + 282, r[1] + 178, 120, 72);
    c.fillStyle = '#7d7a70';
    c.fillRect(r[0] + 288, r[1] + 184, 108, 60);
    c.fillStyle = '#b9b5a8';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(r[0] + 302 + i * 20, r[1] + 208, 7, 0, 7);
      c.fill();
      c.fillRect(r[0] + 294 + i * 20, r[1] + 216, 16, 26);
    }
    // the pillar's posters
    const poster = (R, bg, lines, deco) => {
      c.fillStyle = bg;
      c.fillRect(...R);
      c.strokeStyle = 'rgba(0,0,0,.35)';
      c.lineWidth = 2;
      c.strokeRect(R[0] + 1, R[1] + 1, R[2] - 2, R[3] - 2);
      deco && deco(R);
      lines.forEach(([s, y, f, col]) => text(s, R[0] + R[2] / 2, R[1] + y, f, col));
      grain(R, 10, 160);
    };
    poster(
      AT.p0,
      '#d9c98f',
      [
        ['KIRMES', 44, 'bold 32px ' + SANS, '#7c1f1c'],
        ['TANZ', 82, 'bold 40px ' + SANS, '#7c1f1c'],
        ['Kulturhaus', 190, 'bold 20px ' + SANS, '#222'],
        ['Sonnabend 20 Uhr', 218, '15px ' + SANS, '#222'],
        ['Es spielt die Kapelle', 240, 'italic 13px Georgia, serif', '#222'],
      ],
      R => {
        c.fillStyle = '#b5482c';
        c.beginPath();
        c.arc(R[0] + 74, R[1] + 136, 30, 0, 7);
        c.fill();
        c.fillStyle = '#d9c98f';
        c.beginPath();
        c.arc(R[0] + 74, R[1] + 136, 12, 0, 7);
        c.fill();
      }
    );
    poster(
      AT.p1,
      '#3d6b56',
      [
        ['ALTSTOFFE', 40, 'bold 24px ' + SANS, '#f0ead6'],
        ['sind', 68, 'italic 18px Georgia, serif', '#f0ead6'],
        ['ROHSTOFFE', 96, 'bold 24px ' + SANS, '#f0ead6'],
        ['Flaschen · Gläser · Papier', 222, '11px ' + SANS, '#f0ead6'],
        ['Annahme: Sonnabend', 240, '12px ' + SANS, '#f0ead6'],
      ],
      R => {
        c.fillStyle = '#f0ead6';
        c.fillRect(R[0] + 52, R[1] + 124, 16, 60);
        c.fillRect(R[0] + 56, R[1] + 112, 8, 14);
        c.fillRect(R[0] + 80, R[1] + 144, 24, 40);
      }
    );
    poster(
      AT.p2,
      '#1f2a44',
      [
        ['FILM', 36, 'bold 34px ' + SANS, '#e8d27a'],
        ['im Kulturhaus', 66, '15px ' + SANS, '#e8e2d0'],
        ['Mittwoch 19.30 Uhr', 224, 'bold 14px ' + SANS, '#e8e2d0'],
        ['Eintritt 1,05 M', 244, '12px ' + SANS, '#e8e2d0'],
      ],
      R => {
        c.fillStyle = '#e8d27a';
        c.beginPath();
        c.moveTo(R[0] + 30, R[1] + 190);
        c.lineTo(R[0] + 74, R[1] + 96);
        c.lineTo(R[0] + 118, R[1] + 190);
        c.fill();
        c.fillStyle = '#1f2a44';
        c.beginPath();
        c.arc(R[0] + 74, R[1] + 160, 14, 0, 7);
        c.fill();
      }
    );
    poster(
      AT.p3,
      '#e3dcc6',
      [
        ['Bekanntmachung', 28, 'bold 17px ' + SANS, '#222'],
        ['Rat der Gemeinde', 50, '12px ' + SANS, '#222'],
        ['Brennstoffe:', 236, 'bold 12px ' + SANS, '#222'],
      ],
      R => {
        c.fillStyle = '#55524a';
        for (let i = 0; i < 17; i++) c.fillRect(R[0] + 12, R[1] + 68 + i * 9, (R[2] - 24) * (0.5 + 0.5 * hh(i)), 2);
      }
    );
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // ------------------------------------------------------------------ the street of the time ------------------------------------------------------------------
  const C = {
    holz: L(112, 84, 56),
    holzD: L(78, 58, 40),
    holzG: L(124, 118, 104),
    eisen: L(44, 44, 46),
    zink: L(150, 154, 156),
    kohle: L(26, 22, 20),
    kohle2: L(40, 33, 28),
    gelb: L(226, 178, 28),
    glas: L(44, 56, 62),
    beton: L(150, 146, 136),
    alu: L(176, 178, 180),
    rot: L(150, 36, 30),
    weiss: L(226, 224, 214),
    gruenE: L(40, 70, 52),
  };
  // print quads: a b c d counter-clockwise seen from the front (a bottom left), region of the atlas
  function pq(Q, a, b, c2, d, R) {
    const u0 = R[0] / 1024,
      u1 = (R[0] + R[2]) / 1024,
      v0 = 1 - (R[1] + R[3]) / 512,
      v1 = 1 - R[1] / 512,
      P3 = p => [p[0], p[2], -p[1]];
    Q.p.push(...P3(a), ...P3(b), ...P3(c2), ...P3(a), ...P3(c2), ...P3(d));
    Q.u.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
  }
  // a board on a wall: from u0 to u1 along the facade f of building b, d out of it, from h0 to h1 above the foot
  const onWall = (b, f, u, d, h) => [f.ax + f.dx * u + f.nx * d, f.ay + f.dy * u + f.ny * d, b.foot + h];
  function wallSign(K, Q, b, f, u0, u1, h0, h1, R, frame) {
    // seen from outside a facade runs to the right where its normal is to the right of its direction, else to the left
    const d = 0.07,
      rt = f.dy * f.nx - f.dx * f.ny > 0,
      ul = rt ? u0 : u1,
      ur = rt ? u1 : u0;
    pq(Q, onWall(b, f, ul, d, h0), onWall(b, f, ur, d, h0), onWall(b, f, ur, d, h1), onWall(b, f, ul, d, h1), R);
    if (frame) {
      const m = onWall(b, f, (u0 + u1) / 2, d * 0.45, h0 - 0.04),
        rot = Math.atan2(f.dy, f.dx);
      K.box(m[0], m[1], m[2], u1 - u0 + 0.1, d * 0.9, h1 - h0 + 0.08, rot, frame);
    }
  }
  function heap(K, x, y, r, n, seed) {
    const z = gz(x, y);
    // (tipped from a lorry: a low, uneven mound – a few lumps of different size leaning on each other, not one dome)
    for (let i = 0; i < 6; i++) {
      const a = (i / 5) * 6.283 + hh(seed + i * 2.3),
        d = i ? r * (0.3 + 0.22 * hh(seed + i * 5.1)) : 0,
        q = i ? r * (0.5 + 0.22 * hh(seed + i * 7.7)) : r * 0.78,
        h = q * (0.42 + 0.14 * hh(seed + i * 1.9));
      K.lathe(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d,
        z - 0.03,
        [
          [q, 0],
          [q * 0.74, h * 0.5],
          [q * 0.34, h * 0.9],
          [0, h],
        ],
        7,
        i % 2 ? C.kohle2 : C.kohle
      );
    }
    for (let i = 0; i < n; i++) {
      const a = hh(seed + i) * 6.283,
        d = Math.sqrt(hh(seed + i * 3.7)) * r * 1.2,
        k = Math.max(0, 1 - d / r);
      K.box(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d,
        z + k * r * 0.4 + 0.01,
        0.17,
        0.065,
        0.055,
        hh(seed + i * 9.1) * 3.1,
        i % 3 ? C.kohle2 : C.kohle
      );
    }
  }
  function bucket(K, x, y, full) {
    const z = gz(x, y);
    K.lathe(
      x,
      y,
      z,
      [
        [0.1, 0],
        [0.135, 0.27],
      ],
      10,
      C.zink
    );
    K.cyl(x, y, z + 0.005, z + (full ? 0.25 : 0.01), 0.1, 0.128, 10, full ? C.kohle : L(90, 92, 94), true);
  }
  function ashcan(K, x, y) {
    const z = gz(x, y);
    K.cyl(x, y, z, z + 0.78, 0.2, 0.22, 10, C.zink);
    K.cyl(x, y, z + 0.78, z + 0.86, 0.235, 0.12, 10, L(132, 136, 138), true);
    K.box(x, y, z + 0.86, 0.1, 0.03, 0.04, 0.4, C.eisen);
  }
  // a thin bar between two points (a wheel's spokes, a frame's tubes, a line)
  function bar(K, a, b, t, col) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      l = hyp(dx, dy) || 1e-6,
      nx = (-dy / l) * t,
      ny = (dx / l) * t,
      q = (p, s, w) => [p[0] + nx * s, p[1] + ny * s, p[2] + w];
    if (hyp(dx, dy) < 0.02) {
      K.box(a[0], a[1], Math.min(a[2], b[2]), t * 2, t * 2, Math.abs(dz), 0, col);
      return;
    }
    K.quad(q(a, 1, -t), q(b, 1, -t), q(b, 1, t), q(a, 1, t), col);
    K.quad(q(b, -1, -t), q(a, -1, -t), q(a, -1, t), q(b, -1, t), col);
    K.quad(q(a, 1, t), q(b, 1, t), q(b, -1, t), q(a, -1, t), col);
    K.quad(q(a, -1, -t), q(b, -1, -t), q(b, 1, -t), q(a, 1, -t), col);
  }
  function wheel(K, x, y, z, ax, ay, r, col, n = 10) {
    // a ring in the vertical plane along (ax, ay)
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.283,
        a1 = ((i + 1) / n) * 6.283;
      bar(
        K,
        [x + ax * Math.cos(a0) * r, y + ay * Math.cos(a0) * r, z + Math.sin(a0) * r],
        [x + ax * Math.cos(a1) * r, y + ay * Math.cos(a1) * r, z + Math.sin(a1) * r],
        0.014,
        col
      );
    }
  }
  // a bicycle of the time leaning at a wall: at (x, y), along the azimuth az (deg), leaning to its left by lean (rad)
  function bike(K, x, y, az, col) {
    const a = ((90 - az) * Math.PI) / 180,
      ax = Math.cos(a),
      ay = Math.sin(a),
      z = gz(x, y),
      r = 0.33,
      pt = (s, h) => [x + ax * s, y + ay * s, z + h];
    wheel(K, x + ax * 0.52, y + ay * 0.52, z + r, ax, ay, r, C.eisen);
    wheel(K, x - ax * 0.52, y - ay * 0.52, z + r, ax, ay, r, C.eisen);
    bar(K, pt(-0.52, r), pt(-0.12, 0.3), 0.012, col);
    bar(K, pt(-0.12, 0.3), pt(0.3, 0.82), 0.014, col);
    bar(K, pt(-0.12, 0.3), pt(-0.2, 0.86), 0.014, col);
    bar(K, pt(-0.2, 0.86), pt(0.3, 0.82), 0.014, col);
    bar(K, pt(-0.52, r), pt(-0.2, 0.8), 0.01, col);
    bar(K, pt(0.52, r), pt(0.3, 0.98), 0.012, col);
    K.box(x - ax * 0.22, y - ay * 0.22, z + 0.9, 0.26, 0.13, 0.05, a, L(40, 30, 24));
    K.box(x + ax * 0.3, y + ay * 0.3, z + 0.98, 0.04, 0.5, 0.03, a, L(170, 170, 172));
    K.box(x - ax * 0.62, y - ay * 0.62, z + 0.7, 0.34, 0.14, 0.02, a, C.eisen);
  }
  // the hand cart: a box of boards on four wooden wheels, the shaft on the ground
  function cart(K, x, y, az) {
    const a = ((90 - az) * Math.PI) / 180,
      ax = Math.cos(a),
      ay = Math.sin(a),
      z = gz(x, y);
    K.box(x, y, z + 0.34, 1.1, 0.58, 0.04, a, C.holz, true);
    for (const s of [-1, 1]) {
      K.box(x - ay * s * 0.29, y + ax * s * 0.29, z + 0.38, 1.1, 0.03, 0.26, a, C.holzD);
      for (const e of [-0.38, 0.38])
        wheel(K, x + ax * e - ay * s * 0.34, y + ay * e + ax * s * 0.34, z + 0.2, ax, ay, 0.2, C.holzD, 8);
    }
    K.box(x + ax * 0.55, y + ay * 0.55, z + 0.38, 0.03, 0.58, 0.26, a, C.holzD);
    K.box(x - ax * 0.55, y - ay * 0.55, z + 0.38, 0.03, 0.58, 0.26, a, C.holzD);
    bar(K, [x + ax * 0.55, y + ay * 0.55, z + 0.3], [x + ax * 1.5, y + ay * 1.5, z + 0.06], 0.02, C.holz);
    K.box(x + ax * 1.5, y + ay * 1.5, z + 0.04, 0.04, 0.4, 0.04, a, C.holz);
  }
  // the telephone box of the post: yellow, glazed on three sides
  function phone(K, Q, x, y, az) {
    const a = ((180 - az) * Math.PI) / 180,
      z = gz(x, y),
      c = Math.cos(a),
      s = Math.sin(a),
      lp = (u, v) => [x + c * u - s * v, y + s * u + c * v];
    K.box(x, y, z, 1.0, 1.0, 0.1, a, C.beton);
    K.box(x, y, z + 2.2, 1.06, 1.06, 0.14, a, C.gelb, true);
    for (const [u, v] of [
      [-0.47, -0.47],
      [0.47, -0.47],
      [-0.47, 0.47],
      [0.47, 0.47],
    ]) {
      const p = lp(u, v);
      K.box(p[0], p[1], z + 0.1, 0.06, 0.06, 2.1, a, C.gelb);
    }
    // the panels below the glass, the glass, the back wall with the telephone
    for (const [u, v, sx, sy] of [
      [0, -0.47, 0.9, 0.03],
      [-0.47, 0, 0.03, 0.9],
      [0.47, 0, 0.03, 0.9],
    ]) {
      const p = lp(u, v);
      K.box(p[0], p[1], z + 0.1, sx, sy, 0.75, a, C.gelb);
      K.box(p[0], p[1], z + 0.85, sx, sy * 0.5, 1.3, a, C.glas);
    }
    {
      const p = lp(0, 0.47);
      K.box(p[0], p[1], z + 0.1, 0.9, 0.03, 2.1, a, C.gelb);
      const q = lp(0, 0.38);
      K.box(q[0], q[1], z + 1.15, 0.26, 0.12, 0.36, a, L(60, 62, 66));
      K.box(q[0] - c * 0.2, q[1] - s * 0.2, z + 1.2, 0.06, 0.07, 0.24, a, L(24, 24, 26));
    }
    // „Fernsprecher“ over the door (the open side faces az)
    const A = lp(-0.5, -0.545),
      Bq = lp(0.5, -0.545);
    pq(Q, [...A, z + 2.21], [...Bq, z + 2.21], [...Bq, z + 2.33], [...A, z + 2.33], AT.fern);
    return { c: [x, y], ax: [c, s], ay: [-s, c], ex: 0.53, ey: 0.53, z0: z, z1: z + 2.3 };
  }
  // the advertising pillar with its cap and the posters round it
  function pillar(K, Q, x, y) {
    const z = gz(x, y),
      r = 0.62;
    K.cyl(x, y, z, z + 0.32, r + 0.05, r + 0.05, 14, C.beton);
    K.cyl(x, y, z + 0.32, z + 2.85, r, r, 14, L(196, 188, 164));
    K.lathe(
      x,
      y,
      z + 2.85,
      [
        [r + 0.1, 0],
        [r + 0.1, 0.1],
        [r * 0.5, 0.42],
        [0.06, 0.5],
        [0, 0.62],
      ],
      14,
      L(74, 86, 78)
    );
    const ps = [AT.p0, AT.p1, AT.p2, AT.p3, AT.p0, AT.p2];
    ps.forEach((R, i) => {
      const a0 = (i / ps.length) * 6.283 + 0.3,
        a1 = a0 + 0.86,
        z0 = z + 0.55 + (i % 2) * 0.12,
        z1 = z0 + 1.55,
        n = 3;
      for (let k = 0; k < n; k++) {
        const b0 = a0 + ((a1 - a0) * k) / n,
          b1 = a0 + ((a1 - a0) * (k + 1)) / n,
          Rk = [R[0] + (R[2] * k) / n, R[1], R[2] / n, R[3]],
          pt = (b, h) => [x + Math.cos(b) * (r + 0.012), y + Math.sin(b) * (r + 0.012), h];
        pq(Q, pt(b0, z0), pt(b1, z0), pt(b1, z1), pt(b0, z1), Rk);
      }
    });
    return { c: [x, y], ax: [1, 0], ay: [0, 1], ex: 0.6, ey: 0.6, z0: z, z1: z + 3 };
  }
  // the milk churn stand at the road: a bench of planks at loading height, churns on it
  function milk(K, x, y, az) {
    const a = ((90 - az) * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      z = gz(x, y);
    K.box(x, y, z + 0.82, 2.2, 0.9, 0.07, a, C.holzG, true);
    for (const [u, v] of [
      [-0.95, -0.35],
      [0.95, -0.35],
      [-0.95, 0.35],
      [0.95, 0.35],
    ])
      K.box(x + c * u - s * v, y + s * u + c * v, z, 0.12, 0.12, 0.82, a, C.holzD);
    for (const [u, v] of [
      [-0.7, 0.05],
      [-0.25, -0.1],
      [0.25, 0.08],
    ]) {
      const px = x + c * u - s * v,
        py = y + s * u + c * v;
      K.lathe(
        px,
        py,
        z + 0.89,
        [
          [0.15, 0],
          [0.16, 0.36],
          [0.1, 0.46],
          [0.11, 0.56],
          [0.13, 0.58],
          [0, 0.59],
        ],
        10,
        C.alu
      );
    }
    return { c: [x, y], ax: [c, s], ay: [-s, c], ex: 1.1, ey: 0.45, z0: z, z1: z + 1.4 };
  }
  // washing on a line between two posts
  function washing(K, a, b) {
    const za = gz(a[0], a[1]),
      zb = gz(b[0], b[1]),
      l = hyp(b[0] - a[0], b[1] - a[1]),
      rot = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const [p, z] of [
      [a, za],
      [b, zb],
    ]) {
      K.box(p[0], p[1], z, 0.09, 0.09, 2.05, rot, C.holzG);
      K.box(p[0], p[1], z + 1.95, 0.06, 0.7, 0.06, rot, C.holzG);
    }
    const things = [
      [0.9, 1.3, C.weiss],
      [0.5, 0.75, L(86, 100, 132)],
      [0.55, 0.8, L(86, 100, 132)],
      [1.3, 1.25, L(214, 206, 180)],
      [0.45, 0.6, L(150, 60, 70)],
      [0.7, 0.95, L(66, 88, 146)],
      [0.4, 0.5, C.weiss],
    ];
    let u = 0.5;
    for (const [w, h, col] of things) {
      if (u + w > l - 0.4) break;
      const t = (u + w / 2) / l,
        x = a[0] + (b[0] - a[0]) * t,
        y = a[1] + (b[1] - a[1]) * t,
        z = za + (zb - za) * t + 1.93 - 0.1 * 4 * t * (1 - t);
      K.box(x, y, z - h, w, 0.012, h, rot, col, true);
      u += w + 0.14;
    }
    bar(K, [a[0], a[1], za + 1.97], [b[0], b[1], zb + 1.97], 0.006, L(200, 200, 196));
  }
  // ---- the back gardens: what stood behind every house ----
  // the rabbit hutch: a cupboard of boards with wire doors in two rows, tar paper on top; its front faces az
  function hutch(K, x, y, az) {
    const a = ((180 - az) * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      z = gz(x, y),
      lp = (u, v) => [x + c * u - s * v, y + s * u + c * v];
    K.box(x, y, z + 0.35, 2.1, 0.7, 1.25, a, C.holzG, true);
    for (const u of [-0.95, 0.95]) {
      const p = lp(u, 0);
      K.box(p[0], p[1], z, 0.09, 0.6, 0.35, a, C.holzD);
    }
    K.box(x, y, z + 1.6, 2.3, 0.95, 0.05, a, L(46, 46, 48), true);
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 3; i++) {
        const p = lp(-0.68 + i * 0.68, -0.36);
        K.box(p[0], p[1], z + 0.42 + r * 0.6, 0.56, 0.02, 0.5, a, L(58, 56, 50));
        const q = lp(-0.68 + i * 0.68, -0.375);
        K.box(q[0], q[1], z + 0.42 + r * 0.6, 0.06, 0.02, 0.5, a, C.holzD);
        K.box(q[0], q[1], z + 0.65 + r * 0.6, 0.56, 0.02, 0.04, a, C.holzD);
      }
    return { c: [x, y], ax: [c, s], ay: [-s, c], ex: 1.1, ey: 0.4, z0: z, z1: z + 1.6 };
  }
  // the chopping block with the axe in it, split wood beside
  function block(K, x, y) {
    const z = gz(x, y);
    K.cyl(x, y, z, z + 0.48, 0.24, 0.22, 10, L(138, 108, 72), true);
    bar(K, [x + 0.05, y, z + 0.5], [x - 0.42, y + 0.1, z + 0.86], 0.016, C.holz);
    K.box(x + 0.06, y, z + 0.46, 0.05, 0.16, 0.1, 0.2, L(70, 72, 76));
    for (let i = 0; i < 22; i++) {
      const a = hh(i * 3.3) * 6.283,
        d = 0.6 + hh(i * 5.1) * 0.9;
      K.box(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d * 0.7 - 1.0,
        z + hh(i) * 0.12,
        0.33,
        0.1,
        0.09,
        hh(i * 7.7) * 3.1,
        L(150 + (i % 3) * 14, 118, 78)
      );
    }
  }
  // a vegetable bed in November: dug earth, the bean poles still standing, a row of kale
  function beet(K, x, y, az, w, l) {
    const a = ((90 - az) * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      z = gz(x, y),
      lp = (u, v) => [x + c * u - s * v, y + s * u + c * v];
    // (dug soil in short pieces that follow the ground – one slab would stand out of a slope)
    for (let i = 0; i < 6; i++) {
      const p = lp(-l / 2 + (i + 0.5) * (l / 6), 0);
      K.box(p[0], p[1], gz(p[0], p[1]) - 0.07, l / 6 + 0.04, w, 0.1, a, L(58, 46, 36), true);
    }
    for (let i = 0; i < 4; i++) {
      const p = lp(-l / 2 + 0.6 + i * 0.75, w * 0.22),
        q = lp(-l / 2 + 0.6 + i * 0.75, -w * 0.02),
        t = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, z + 2.0];
      bar(K, [p[0], p[1], z], t, 0.012, L(120, 104, 80));
      bar(K, [q[0], q[1], z], t, 0.012, L(120, 104, 80));
    }
    for (let i = 0; i < 7; i++) {
      const p = lp(-l / 2 + 0.45 + i * ((l - 0.9) / 6), -w * 0.3);
      K.ball(p[0], p[1], gz(p[0], p[1]) + 0.1, 0.16, i % 2 ? L(62, 92, 66) : L(52, 82, 60), 6); // winter cabbage
    }
  }
  // the compost: a box of slats, half full
  function compost(K, x, y, az) {
    const a = ((90 - az) * Math.PI) / 180,
      z = gz(x, y);
    for (let i = 0; i < 4; i++) {
      K.box(x, y - 0.0, z + 0.05 + i * 0.2, 1.3, 0.03, 0.14, a, C.holzG);
      K.box(x, y, z + 0.05 + i * 0.2, 0.03, 1.3, 0.14, a, C.holzG);
    }
    for (const [u, v] of [
      [-0.63, -0.63],
      [0.63, -0.63],
      [-0.63, 0.63],
      [0.63, 0.63],
    ]) {
      const c = Math.cos(a),
        s = Math.sin(a);
      K.box(x + c * u - s * v, y + s * u + c * v, z, 0.07, 0.07, 0.9, a, C.holzD);
    }
    K.lathe(
      x,
      y,
      z,
      [
        [0.6, 0],
        [0.45, 0.4],
        [0, 0.55],
      ],
      8,
      L(62, 54, 40)
    );
  }
  // a wheelbarrow of sheet steel
  function barrow(K, x, y, az) {
    const a = ((90 - az) * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      z = gz(x, y);
    K.box(x, y, z + 0.32, 0.85, 0.58, 0.26, a, L(70, 86, 78), true);
    wheel(K, x + c * 0.62, y + s * 0.62, z + 0.18, c, s, 0.18, C.eisen, 8);
    for (const sd of [-1, 1]) {
      bar(
        K,
        [x + c * 0.62, y + s * 0.62, z + 0.18],
        [x - c * 0.95 - s * sd * 0.3, y - s * 0.95 + c * sd * 0.3, z + 0.52],
        0.016,
        C.holz
      );
      K.box(x - c * 0.3 - s * sd * 0.25, y - s * 0.3 + c * sd * 0.25, z, 0.04, 0.04, 0.32, a, C.eisen);
    }
  }
  // a street lamp of the time: a wooden pole, an arm towards the road, an enamel shade; the bulb is apart (it glows)
  function lampPole(K, x, y) {
    const z = gz(x, y);
    let bd = -1e9,
      ba = 0;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283,
        e = ROADS.edge ? ROADS.edge(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6) : 0;
      if (e > bd) {
        bd = e;
        ba = a;
      }
    }
    const c = Math.cos(ba),
      s = Math.sin(ba);
    K.cyl(x, y, z - 0.1, z + 6.3, 0.105, 0.075, 8, L(92, 76, 58), true);
    bar(K, [x, y, z + 5.75], [x + c * 0.95, y + s * 0.95, z + 5.95], 0.022, C.eisen);
    bar(K, [x, y, z + 5.2], [x + c * 0.55, y + s * 0.55, z + 5.84], 0.014, C.eisen);
    const hx = x + c * 0.95,
      hy = y + s * 0.95;
    K.lathe(
      hx,
      hy,
      z + 5.72,
      [
        [0.3, 0],
        [0.12, 0.13],
        [0.05, 0.2],
        [0, 0.21],
      ],
      12,
      C.gruenE
    );
    K.lathe(
      hx,
      hy,
      z + 5.715,
      [
        [0.0, 0.12],
        [0.11, 0.12],
        [0.295, 0.0],
      ],
      12,
      C.weiss
    );
    // the porcelain insulators and the wire's stub on top
    K.box(x, y, z + 6.05, 0.06, 0.9, 0.06, ba, L(92, 76, 58));
    for (const o of [-0.38, 0.38]) K.cyl(x - s * o, y + c * o, z + 6.11, z + 6.2, 0.035, 0.03, 6, C.weiss, true);
    return [hx, hy, z + 5.69];
  }
  // ---- build: everything of the street in one mesh, the print in one, bulbs, smoke, the cars ----
  function build() {
    const K = VPROPS.kit(),
      Q = { p: [], u: [] },
      byId = VILLAGE.byId,
      box = b => {
        if (b) S.boxes.push({ box: () => b, gl89: true });
      };
    // the old school: the banner under the eave of its street side, the notice board by its door
    const sch = byId && byId.get(215);
    if (sch) {
      const f = sch.fac.find(q => q.door) || sch.fac[1],
        du = f.door ? f.door.u : 4;
      wallSign(
        K,
        Q,
        sch,
        f,
        Math.min(f.L - 9.6, du + 1.6),
        Math.min(f.L - 0.5, du + 10.6),
        2.86,
        3.6,
        AT.losung,
        L(120, 30, 26)
      );
      wallSign(K, Q, sch, f, Math.max(0.3, du - 3.1), du - 1.0, 1.0, 2.31, AT.wand, C.holzD);
      // the coal for the school's stoves by the back wall, the hand cart, a bicycle
      const bk = sch.fac.find(q => q !== f && q.kind === 'eave') || sch.fac[3],
        h1 = onWall(sch, bk, bk.L * 0.3, 1.5, 0),
        ct = onWall(sch, bk, bk.L * 0.3 + 2.4, 2.1, 0),
        bi = onWall(sch, bk, bk.L * 0.72, 0.35, 0);
      heap(K, h1[0], h1[1], 1.25, 70, 11);
      bucket(K, h1[0] + bk.dx * 1.5, h1[1] + bk.dy * 1.5, true);
      cart(K, ct[0], ct[1], (Math.atan2(bk.dx, bk.dy) * 180) / Math.PI + 12);
      bike(K, bi[0], bi[1], (Math.atan2(bk.dx, bk.dy) * 180) / Math.PI, L(40, 70, 52));
      ashcan(K, ...onWall(sch, bk, bk.L * 0.9, 0.5, 0));
      box({
        c: [h1[0], h1[1]],
        ax: [1, 0],
        ay: [0, 1],
        ex: 1.0,
        ey: 1.0,
        z0: gz(h1[0], h1[1]),
        z1: gz(h1[0], h1[1]) + 0.5,
      });
    }
    // the low brick building behind the school: the village shop
    const kon = byId && byId.get(214);
    if (kon) {
      const f = kon.fac.find(q => q.door) || kon.fac[1],
        du = f.door ? f.door.u : f.L / 2;
      wallSign(K, Q, kon, f, du - 1.7, du + 1.7, 2.32, 2.96, AT.konsum, L(60, 56, 50));
      wallSign(K, Q, kon, f, du + 0.85, du + 1.4, 1.25, 1.6, AT.zeiten, L(60, 56, 50));
      wallSign(K, Q, kon, f, Math.max(du + 2.4, f.L - 6.4), f.L - 0.4, 2.42, 2.78, AT.losung2, L(120, 30, 26));
      const b1 = onWall(kon, f, du - 2.6, 0.3, 0),
        b2 = onWall(kon, f, du - 3.5, 0.32, 0),
        az = (Math.atan2(f.dx, f.dy) * 180) / Math.PI;
      bike(K, b1[0], b1[1], az, L(30, 44, 86));
      bike(K, b2[0], b2[1], az + 180, L(110, 30, 30));
      // crates of empties by the door
      for (let i = 0; i < 3; i++) {
        const p = onWall(kon, f, du + 2.2 + (i % 2) * 0.45, 0.3, 0);
        K.box(
          p[0],
          p[1],
          gz(p[0], p[1]) + Math.floor(i / 2) * 0.3,
          0.4,
          0.3,
          0.28,
          Math.atan2(f.dy, f.dx),
          L(150, 36, 30)
        );
      }
    }
    // briquettes tipped on the pavement before a house west of the green, the shovel in them, buckets
    heap(K, 199.6, -102.4, 1.7, 120, 37);
    bucket(K, 198.2, -104.4, true);
    bucket(K, 197.7, -103.7, false);
    box({
      c: [199.6, -102.4],
      ax: [1, 0],
      ay: [0, 1],
      ex: 1.3,
      ey: 1.3,
      z0: gz(199.6, -102.4),
      z1: gz(199.6, -102.4) + 0.6,
    });
    // at the Anger: the telephone box where the vending machine stands today, the advertising pillar, the stop's name
    const O = DKDATA.open || {},
      v = O.vending || [245.6, -99.7, 160];
    box(phone(K, Q, v[0] - 1.9, v[1] + 0.25, v[2]));
    box(pillar(K, Q, 219.2, -101.2));
    box(milk(K, 213.4, -79.6, 78));
    washing(K, [247.2, -70.4], [253.4, -73.6]);
    // the back gardens west of the lane (the way to the fields): washing, the rabbit hutch, the chopping block, a bed, compost
    washing(K, [199.6, -69.6], [205.6, -71.8]);
    box(hutch(K, 197.4, -80.6, 82));
    block(K, 203.6, -76.4);
    beet(K, 206.4, -83.0, 10, 2.6, 4.6);
    compost(K, 208.0, -89.6, 8);
    barrow(K, 201.6, -87.6, 300);
    bucket(K, 198.8, -82.0, false);
    box(hutch(K, 172.2, -124.6, 188));
    bike(K, 187.2, -129.9, 118, L(86, 30, 30));
    barrow(K, 178.6, -125.6, 60);
    for (const [x, y] of [
      [226.4, -90.1],
      [201.2, -125.6],
      [257.6, -129.6],
      [274.2, -110.0],
      [196.9, -92.0],
    ])
      ashcan(K, x, y);
    bike(K, 250.3, -99.7, 108, L(52, 52, 56));
    // the street lamps of the time where the lanterns of today stand (their pools of light on the ground are used)
    for (const l of VPROPS.lamps || [])
      if (hyp(l.x - MITTE[0], l.y - MITTE[1]) < 185) S.lamps.push(lampPole(K, l.x, l.y));
    // ---- the meshes ----
    const me = new THREE.Mesh(K.geo(), VFIG.mat());
    me.name = 'grenzland 1989 strasse';
    me.userData.noMerge = true;
    me.castShadow = false;
    me.receiveShadow = false;
    scene.add(me);
    S.meshes.push(me);
    if (Q.p.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(Q.p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(Q.u, 2));
      g.computeBoundingSphere();
      const base = BUSMOD.M && BUSMOD.M.dispMap,
        m = base ? base.clone() : new THREE.MeshBasicMaterial();
      m.map = atlas();
      m.name = 'grenzland 1989 schrift';
      const pm = new THREE.Mesh(g, m);
      pm.name = 'grenzland 1989 schrift';
      pm.userData.noMerge = true;
      pm.castShadow = false;
      pm.receiveShadow = false;
      scene.add(pm);
      S.meshes.push(pm);
      S.print = m;
    }
    // the bulbs: the lanterns' own glass material (it is switched on with the village's lamps)
    if (S.lamps.length && VPROPS.glass) {
      const kb = VPROPS.kit();
      kb.ball(0, 0, 0, 0.075, [1, 1, 1], 8);
      const ib = new THREE.InstancedMesh(kb.geo(), VPROPS.glass, S.lamps.length),
        m4 = new THREE.Matrix4();
      S.lamps.forEach((p, i) => ib.setMatrixAt(i, m4.makeTranslation(p[0], p[2], -p[1])));
      ib.name = 'grenzland 1989 birnen';
      ib.userData.noMerge = true;
      ib.castShadow = false;
      ib.receiveShadow = false;
      ib.computeBoundingSphere();
      scene.add(ib);
      S.meshes.push(ib);
    }
    smokeBuild();
    for (const b of S.boxes) VEH.extra.push(b);
    carsBuild();
  }
  // ---- the smoke of brown coal from the chimneys round the centre ----
  function smokeBuild() {
    const base = VPROPS.pool && VPROPS.pool.material;
    if (!base || !VILLAGE.bld) return;
    const ch = VILLAGE.bld
      .filter(b => b.chim && hyp(b.chim[0] - MITTE[0], b.chim[1] - MITTE[1]) < 130)
      .sort((a, b) => hyp(a.chim[0] - MITTE[0], a.chim[1] - MITTE[1]) - hyp(b.chim[0] - MITTE[0], b.chim[1] - MITTE[1]))
      .slice(0, 9);
    if (!ch.length) return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d'),
      gr = c.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 64);
    const m = base.clone();
    m.map = new THREE.CanvasTexture(cv);
    m.blending = THREE.NormalBlending;
    m.polygonOffset = false;
    m.depthWrite = false;
    m.transparent = true;
    m.color.setRGB(0.5, 0.5, 0.5);
    m.name = 'grenzland 1989 rauch';
    const N = 4;
    for (const b of ch) for (let i = 0; i < N; i++) S.puffs.push({ c: b.chim, ph: i / N + hh(b.id) });
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), m, S.puffs.length);
    im.name = 'grenzland 1989 rauch';
    im.userData.noMerge = true;
    im.frustumCulled = false;
    im.renderOrder = 3;
    scene.add(im);
    S.meshes.push(im);
    S.smoke = im;
    smokeTick(0, true);
  }
  const _m4 = new THREE.Matrix4(),
    _v = new THREE.Vector3(),
    _sc = new THREE.Vector3();
  function smokeTick(dt, force) {
    const im = S.smoke;
    if (!im) return;
    S.smokeT += dt;
    if (!force && (S.smokeAcc = (S.smokeAcc || 0) + dt) < 0.1) return;
    S.smokeAcc = 0;
    const t = S.smokeT,
      day = 1 - Math.min(1, night() * 1.4),
      g = 0.16 + 0.42 * day;
    im.material.color.setRGB(g, g * 0.98, g * 0.95);
    S.puffs.forEach((p, i) => {
      const a = (t / 9 + p.ph) % 1,
        s = 0.5 + a * 3.2,
        k = a > 0.85 ? (1 - a) / 0.15 : 1;
      _v.set(
        p.c[0] + a * a * 5.5 + Math.sin(a * 5 + p.ph * 20) * 0.25,
        p.c[2] + 0.2 + a * 3.4,
        -(p.c[1] + a * a * 1.6)
      );
      _sc.set(s * k, s * k * 0.9, 1);
      im.setMatrixAt(i, _m4.compose(_v, cam.quaternion, _sc));
    });
    im.instanceMatrix.needsUpdate = true;
    const w = KERN.where() || [P.x, P.y];
    if (hyp(w[0] - MITTE[0], w[1] - MITTE[1]) < 220) markDirty();
  }
  // ---- the cars of the time at the kerb (the types of grenzland/gl_modelle.js – whatever the names of the day are) ----
  const typ = (...names) => names.find(n => GLAUTO.TYP && GLAUTO.TYP[n]) || null;
  function carsBuild() {
    const klein = typ('trabant', 'klein89'),
      kombi = typ('trabant_kombi') || klein,
      limo = typ('wartburg', 'limo89'),
      lkw = typ('w50', 'lkw89'),
      kasten = typ('barkas', 'kasten89'),
      moped = typ('s51', 'moped'),
      list = [
        [klein, 242.1, -77.0, 205, '#c9d3c4'],
        [kombi, 184.4, -93.2, 176, '#b9c7d6'],
        [typ('schwalbe'), 229.6, -63.6, 250, '#4a6fa0'],
        [limo, 241.6, -105.3, 109, '#b6a584'],
        [klein, 262.6, -112.2, 290, '#d8d2bd'],
        [kasten || limo, 192.6, -132.0, 20, kasten ? '#d9d3c0' : '#7c2a26'],
        [lkw, 206.3, -106.6, 208, '#3f5f86'],
        [moped, 222.3, -103.9, 60, '#2e6b4a'],
      ];
    const LMq = GLAUTO.LM || {},
      offH = LMq.head ? LMq.head.clone() : null,
      offT = LMq.tail ? LMq.tail.clone() : null;
    for (const m of [offH, offT]) if (m) m.emissiveIntensity = 0;
    S.offLamp = [offH, offT];
    for (const [t, x, y, az, col] of list) {
      if (!t) continue;
      const c = safe('auto ' + t, () => GLAUTO.spawn(t, { col }));
      if (!c) continue;
      GLAUTO.park(c, x, y, (az * Math.PI) / 180);
      // parked: no lamps on in the dusk
      c.g.traverse(o => {
        if (!o.isMesh) return;
        if (offH && o.material === LMq.head) o.material = offH;
        else if (offT && o.material === LMq.tail) o.material = offT;
      });
      S.cars.push(c);
    }
  }
  // ------------------------------------------------------------------ in, out, per frame ------------------------------------------------------------------
  function enter() {
    if (S.on) return;
    S.on = true;
    S.err = '';
    S.fogZ = B.dunst;
    safe('hide', hide);
    safe('build', build);
    if (!S.borrowed) {
      // one borrowed light at the nearest lamp of the time, once it is dusk
      S.borrowed = true;
      safe('licht', () =>
        KERN.lights.borrow({
          id: 'gl89:laterne',
          n: 1,
          prio: 2,
          want: () => S.on && night() > 0.14 && !!nearLamp(42),
          on: ls => {
            ls[0].color.setHex(0xffb060);
            ls[0].distance = 17;
            ls[0].decay = 1.5;
            ls[0].intensity = 0;
          },
          tick: ls => {
            const p = nearLamp(60);
            if (!p) return;
            ls[0].position.set(p[0], p[2] - 0.15, -p[1]);
            ls[0].intensity = 15 * Math.min(1, (night() - 0.1) / 0.3);
          },
        })
      );
    }
    markDirty(true);
  }
  function nearLamp(r) {
    const w = KERN.where() || [P.x, P.y];
    let best = null,
      bd = r;
    for (const p of S.lamps) {
      const d = hyp(p[0] - w[0], p[1] - w[1]);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  function leave() {
    if (!S.on) return;
    S.on = false;
    for (const c of S.cars) safe('auto weg', () => GLAUTO.remove(c));
    S.cars.length = 0;
    for (const b of S.boxes) {
      const i = VEH.extra.indexOf(b);
      if (i >= 0) VEH.extra.splice(i, 1);
    }
    S.boxes.length = 0;
    for (const m of S.meshes) {
      scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material !== VPROPS.glass && m.material !== VFIG.mat() && m.material) {
        if (m.material.map) m.material.map.dispose();
        m.material.dispose();
      }
      if (m.isInstancedMesh) m.dispose();
    }
    S.meshes.length = 0;
    S.lamps.length = 0;
    S.puffs.length = 0;
    S.smoke = null;
    S.print = null;
    for (const m of S.offLamp || []) if (m) m.dispose();
    S.offLamp = null;
    // everything of today back, in reverse order
    for (let i = S.undo.length - 1; i >= 0; i--) safe('zurück', S.undo[i]);
    S.undo.length = 0;
    S.fogZ = 0;
    S.printK = null;
    markDirty(true);
  }
  function tick(dt) {
    if (!S.on) return;
    // the afternoon goes on a little faster than real time: dusk comes while one plays
    if (P.mode === 'walk' && !(window.HUD && window.HUD.open)) CLOCK.t += dt * Math.max(0, B.tempo - 1 / 60);
    if ((S.scanT += dt) > 0.2) {
      S.scanT = 0;
      scan();
      // what is printed has no light of its own: it follows the day
      if (S.print) {
        const k = 0.16 + 0.76 * (1 - Math.min(1, night() * 1.25));
        if (Math.abs(k - (S.printK || 0)) > 0.02) {
          S.printK = k;
          S.print.color.setRGB(k, k * 0.985, k * 0.95);
          markDirty();
        }
      }
    }
    smokeTick(dt);
  }
  // what of today is still to be seen near the old school (the test counts it before, in and after the flashback)
  function modern() {
    const near = (x, y) => hyp(x - MITTE[0], y - MITTE[1]) < 260;
    let autos = 0,
      leute = 0,
      laternen = 0;
    try {
      for (const c of DINGE.cells.values())
        if (c.built)
          for (const p of c.places || [])
            if (p.on && !p.hide && !p.door && p.im && p.im.visible && near(p.x, p.y)) autos++;
      for (const c of Object.values(DCARS.cars || {})) if (c && c.g && c.g.visible) autos++;
      autos += VAUTO.cars.length + BUS.S.inst.length;
      for (const k of Object.keys(DPEOPLE.figs || {})) if (DPEOPLE.figs[k].g.visible) leute++;
      leute += VERKEHR.S.peds.length;
      for (const m of VPROPS.meshes || []) if (m.isInstancedMesh && m !== VPROPS.pool && m.visible) laternen++;
    } catch (e) {
      S.err = S.err || 'modern: ' + e;
    }
    return { autos, leute, laternen };
  }
  const state = () => ({
    on: S.on,
    err: S.err,
    undo: S.undo.length,
    meshes: S.meshes.length,
    cars: S.cars.length,
    lamps: S.lamps.length,
    puffs: S.puffs.length,
    boxes: S.boxes.length,
    zweige: !!S.zweige,
    stats: Object.assign({}, S.stats),
    fog: scene.fog ? +scene.fog.density.toFixed(5) : 0,
    hold: !!DORF.S.hold,
    frozen: !!DINGE.frozen,
    preset: safe('wetter', () => WETTER.state().preset),
    tris: S.meshes.reduce(
      (n, m) => n + (m.geometry && m.geometry.attributes.position ? m.geometry.attributes.position.count / 3 : 0),
      0
    ),
  });
  return Object.assign(S, { enter, leave, tick, modern, state, AT });
})();
window.GL89WELT = GL89WELT;
