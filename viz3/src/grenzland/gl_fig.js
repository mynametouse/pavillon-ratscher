// ===================== feat/grenzland: the people of the mode as figures – cast, clothes painted by body zone, headwear, hair, walking (GLFIG) =====================
// The cast of grenzland/gl_data.js as Microsoft Rocketbox figures (the files of the streets' and the village's people: chars/vk_*.json,
// chars/dorf_*.json – our own copies, so the village keeps its people as they are), moved by the player's clip sets through rbPerson of
// npc/npc_real.js. What makes them the stranger, the clique, the police – and above all the people of 1989 (Falko, 13.11.2026 0:32:
// „achte bei den Rückblenden auf 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion“) – is painted into each
// figure's own textures once at load. The figure is measured in its bind pose, upright and in metres, through its skeleton (so the
// player's own figure can be repainted while it walks, and mesh quantization does not matter): every triangle is sorted into a body zone
// (torso, legs, arms, shoes; an apron dress or a coat reaches down over the thighs; head, throat and hands stay), the zones and the place
// on the body are drawn into the texture's space pixel by pixel, and every cloth pixel takes the colour of the garment while keeping its
// own light and shade (folds, seams); bare arms and legs get sleeves and trousers. On top, in the body's own measure: a weave or print
// (the flowers of a Dederon apron, the quilting of a Wattejacke, corduroy, knitting, stone-washed denim) and what makes a garment a
// garment – a button row, a zip, a shirt and tie in the opening of a jacket, a collar, a belt, the knitted hem of a blouson, a yoke in
// another colour, patch pockets, a trouser crease, a stripe down the leg; uniforms get their marks (collar patches, shoulder boards, the
// cuff band of the border troops on the left sleeve, the yellow stripe of today's police).
// On the head bone, as small meshes of vertex colours in the traffic's material (no new shader program): headwear (peaked caps, flat cap,
// felt hat, headscarf, bobble hat, moped helmet), the hair of the time in the figure's own hair colour (a perm, short or to the
// shoulders, a „Vokuhila“), a moustache, glasses with the big frames of the eighties. In the hand: a shopping net, a nylon bag, a zinc
// bucket of briquettes, a briefcase, a milk can, a broom, a shovel. Work poses of npc/npc_real.js (bending down, sweeping, over a moped).
// Loaded only when somebody is needed, freed again (geometry, textures) when they are let go.
//   GLFIG.make(castId, { kleid, hut, haar, bart, brille, ding, era }) → F (async) · place(F, x, y, hd) · go(F, pts, v, done) · stop · down
//   face · drop · dropAll · near · talking · pose(F, kind | null) · F.x/y/z/hd/st · F.sees · F.r · F.era
//   Round 2 (feat/grenzland-figuren, the poses themselves in grenzland/gl_pose.js): go(F, x, y, { renn: true, v, done }) runs ·
//   geste(F, art, { ziel, sec, halten }) · geste(F, null) · blick(F, x, y, z) | blick(F, figure | 'spieler' | [x, y, z]) · blick(F, null) ·
//   sitz(F, x, y, hd, z) (z: the seat's height over the ground) · steh(F) · reite(F, moped | null) · F.sitzt · F.reitet · F.gest · F.look
//   GLFIG.dress(model, KLEID entry, restoreList) → textures made · hatOn(model, headBone, kind) → group · kopf(model, { haar, bart,
//   brille }) → groups · MUSTER · HUTC
import * as THREE from 'three';
import { BASE, COARSE, QS, scene } from '../core/head.js';
import { b64bytes, markDirty } from '../core/assets.js';
import { canonBone } from '../core/rig.js';
import { KERN } from '../core/kern.js';
import { CHL, rbPerson } from '../npc/npc_real.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { GLDATA } from './gl_data.js';
import { GLPOSE } from './gl_pose.js';
export const GLFIG = (() => {
  const S = { figs: [], loads: 0, drops: 0, err: null, clips: {}, paints: 0, last: null };
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  const U = f => BASE + 'chars/' + f;
  const fileOf = c => (c.fig === 'player_m' || c.fig === 'player_f' ? PM[c.fig] : CH[c.fig]);
  const avail = id => {
    const c = GLDATA.CAST[id];
    return !!(c && PM.pclips_m && PM.pclips_f && fileOf(c) && !QS.get('lowfig'));
  };
  function clipSet(k) {
    if (S.clips[k]) return S.clips[k];
    const FL = new THREE.FileLoader();
    FL.setResponseType('json');
    return (S.clips[k] = FL.loadAsync(U(k === 'f' ? PM.pclips_f : PM.pclips_m)).catch(e => {
      delete S.clips[k];
      throw e;
    }));
  }
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  const hyp = Math.hypot;
  const _p = new THREE.Vector3(),
    _m = new THREE.Matrix4(),
    _m2 = new THREE.Matrix4();
  // ------------------------------------------------------------------ the figure's own measure ------------------------------------------------------------------
  // Every mesh of a figure keeps its vertices in its own bind space (mesh quantization scales and shifts it); what the meshes share is
  // the skeleton: a mesh's inverse bind matrices lead from its bind space into a bone's own space. So a vertex goes into the hips
  // bone's space and from there into an upright frame built from the joints of the bind pose – x to the figure's left, y up from the
  // soles, z forward, in metres. The pose the figure is in right now and where it stands do not matter.
  function frameOf(model) {
    model.updateMatrixWorld(true);
    const B = {},
      meshes = [];
    model.traverse(x => {
      if (x.isBone) {
        const c = canonBone(x.name);
        if (c && !B[c]) B[c] = x;
      } else if (x.isSkinnedMesh && x.skeleton && x.geometry && x.geometry.attributes.position) meshes.push(x);
    });
    const ref = B.Hips && meshes.find(m => m.skeleton.bones.includes(B.Hips));
    if (!ref || !B.Head || !B.LeftArm || !B.RightArm) return null;
    const sk = ref.skeleton,
      invHip = sk.boneInverses[sk.bones.indexOf(B.Hips)];
    // a joint of the bind pose in the hips bone's space
    const joint = b => {
      const i = b ? sk.bones.indexOf(b) : -1;
      return i < 0
        ? null
        : new THREE.Vector3().setFromMatrixPosition(_m.copy(sk.boneInverses[i]).invert()).applyMatrix4(invHip);
    };
    const jH = joint(B.Head),
      jL = joint(B.LeftArm),
      jR = joint(B.RightArm),
      fL = joint(B.LeftFoot),
      fR = joint(B.RightFoot);
    if (!jH || !jL || !jR) return null;
    const feet = fL && fR ? fL.clone().add(fR).multiplyScalar(0.5) : new THREE.Vector3();
    const Uv = jH.clone().sub(feet).normalize(),
      Xv = jL.clone().sub(jR);
    Xv.addScaledVector(Uv, -Xv.dot(Uv)).normalize();
    const Wv = new THREE.Vector3().crossVectors(Xv, Uv).normalize();
    const s = B.Hips.getWorldScale(new THREE.Vector3()).x || 1; // metres per unit of the hips bone's space
    const R = new THREE.Matrix4().set(
      Xv.x * s,
      Xv.y * s,
      Xv.z * s,
      0,
      Uv.x * s,
      Uv.y * s,
      Uv.z * s,
      0,
      Wv.x * s,
      Wv.y * s,
      Wv.z * s,
      0,
      0,
      0,
      0,
      1
    );
    // each mesh's way from its stored vertices into the frame; the vertices themselves
    const parts = [];
    let y0 = 1e9,
      y1 = -1e9;
    for (const x of meshes) {
      const hi = x.skeleton.bones.indexOf(B.Hips);
      if (hi < 0) continue;
      const M = new THREE.Matrix4().copy(R).multiply(x.skeleton.boneInverses[hi]).multiply(x.bindMatrix),
        pa = x.geometry.attributes.position,
        n = pa.count,
        Wp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        _p.fromBufferAttribute(pa, i).applyMatrix4(M);
        Wp[i * 3] = _p.x;
        Wp[i * 3 + 1] = _p.y;
        Wp[i * 3 + 2] = _p.z;
        if (_p.y < y0) y0 = _p.y;
        if (_p.y > y1) y1 = _p.y;
      }
      parts.push({ x, Wp, M });
    }
    if (!parts.length) return null;
    const J = {};
    for (const k of Object.keys(B)) {
      const j = joint(B[k]);
      if (j) {
        j.applyMatrix4(R);
        J[k] = [j.x, j.y - y0, j.z];
      }
    }
    // which way it faces: the toes are in front of the ankles (else the frame is turned round)
    let zs = 0,
      zn = 0;
    const H = Math.max(0.5, y1 - y0);
    for (const { Wp } of parts)
      for (let i = 0; i < Wp.length; i += 3)
        if (Wp[i + 1] - y0 < 0.03 * H) {
          zs += Wp[i + 2];
          zn++;
        }
    const ank = J.LeftFoot && J.RightFoot ? (J.LeftFoot[2] + J.RightFoot[2]) / 2 : 0,
      flip = zn > 0 && zs / zn < ank ? -1 : 1;
    for (const q of parts) {
      const Wp = q.Wp;
      for (let i = 0; i < Wp.length; i += 3) {
        Wp[i] *= flip;
        Wp[i + 1] -= y0;
        Wp[i + 2] *= flip;
      }
    }
    for (const k of Object.keys(J)) {
      J[k][0] *= flip;
      J[k][2] *= flip;
    }
    return { B, parts, J, H, flip, sk, s, Xv, Uv, Wv, y0 };
  }
  // the measures the zones go by (metres above the soles, from the joints of the bind pose)
  function measure(F) {
    const J = F.J,
      H = F.H,
      av = (a, b, i) => (J[a] && J[b] ? (J[a][i] + J[b][i]) / 2 : null),
      G = {
        H,
        neck: J.Neck ? J.Neck[1] : 0.84 * H,
        // the jaw's line (above it nothing is cloth) – the bind pose's head joint sits a finger above the chin
        kinn: J.Head ? J.Head[1] - 0.012 : 0.868 * H,
        shY: av('LeftArm', 'RightArm', 1) ?? 0.81 * H,
        shX: J.LeftArm && J.RightArm ? Math.abs(J.LeftArm[0] - J.RightArm[0]) / 2 : 0.105 * H,
        shZ: av('LeftArm', 'RightArm', 2) ?? 0,
        hip: av('LeftUpLeg', 'RightUpLeg', 1) ?? 0.52 * H,
        legX: J.LeftUpLeg && J.RightUpLeg ? Math.abs(J.LeftUpLeg[0] - J.RightUpLeg[0]) / 2 : 0.05 * H,
        legZ: av('LeftUpLeg', 'RightUpLeg', 2) ?? 0,
        ankle: av('LeftFoot', 'RightFoot', 1) ?? 0.05 * H,
        arm: [null, null],
      };
    // the arms as lines from the shoulder joint to the wrist (side 0: the figure's left, x > 0)
    [
      ['LeftArm', 'LeftHand'],
      ['RightArm', 'RightHand'],
    ].forEach(([a, b], i) => {
      const A = J[a],
        Bq = J[b] || (A ? [A[0] + (i ? -0.55 : 0.55), A[1], A[2]] : null);
      if (!A) return;
      const d = [Bq[0] - A[0], Bq[1] - A[1], Bq[2] - A[2]],
        l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1;
      G.arm[i] = { A, d, l2, len: Math.sqrt(l2) };
    });
    return G;
  }
  // along an arm's line: t 0 at the shoulder … 1 at the wrist, d the distance from the line
  const _at = [0, 0];
  function armAt(a, x, y, z) {
    const px = x - a.A[0],
      py = y - a.A[1],
      pz = z - a.A[2],
      t = (px * a.d[0] + py * a.d[1] + pz * a.d[2]) / a.l2;
    _at[0] = t;
    _at[1] = hyp(px - a.d[0] * t, py - a.d[1] * t, pz - a.d[2] * t);
    return _at;
  }
  // zones: 0 nothing (head, throat, hands), 1 torso, 2 legs, 3 left arm, 4 right arm, 5 shoes, 6 round the collar (throat or torso;
  // 7 in the pixels: the figure's own collar above the line)
  function zoneOf(K, G, x, y, z) {
    const i = x > 0 ? 0 : 1,
      a = G.arm[i];
    if (a) {
      const [t, d] = armAt(a, x, y, z);
      if (t > 0.1 && d < (t < 0.35 ? 0.07 : 0.11) && (y > G.hip - 0.12 || t > 0.5)) {
        if (t > 0.985) return 0; // the hand
        if (K.aermel !== undefined && t > K.aermel) return 0; // short sleeves: the forearm stays as it is
        return 3 + i;
      }
    }
    // the head; round the collar (the neck joint is where a shirt's collar sits; hals: a collar standing higher, m) the line between
    // throat and cloth is drawn per pixel (zone 6)
    if (y > G.kinn + 0.03) return 0;
    if (y > G.neck - 0.072 + (K.hals || 0) && Math.abs(x) < 0.075 * G.H) return 6;
    if (y > G.kinn) return 0;
    if (y < G.ankle + (K.schaft ?? 0.035)) return 5;
    const hem = K.rock ? K.rock * G.H : G.hip - (K.saum ?? 0.03);
    return y < hem ? 2 : 1;
  }
  // ------------------------------------------------------------------ clothes ------------------------------------------------------------------
  const isSkin = (r, g, b) => r > 55 && r >= g && g >= b * 0.9 && r - b > 18 && r - b < 130 && g > r * 0.48;
  // a fixed grain per pixel (no Math.random: the same person looks the same every time)
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, y) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      fx = x - xi,
      fy = y - yi,
      sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy),
      a = hash(xi, yi),
      b = hash(xi + 1, yi),
      c = hash(xi, yi + 1),
      d = hash(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  // the weave or print at a place on the cloth: a factor on the garment's colour, or [factor, another colour to take instead].
  // x across (round the body or the limb), y along it, in units of 2.5 mm (a button is 9 units, a hand's breadth 36)
  const MUSTER = {
    steppung(x, y) {
      const a = (x + y) % 34,
        b = (x - y + 8160) % 34;
      return a < 2 || b < 2 ? 0.72 : 1 + (vnoise(x / 9, y / 9) - 0.5) * 0.1;
    },
    // the quilting of a wadded jacket or a body warmer: rows across, a seam every hand's breadth
    steppquer(x, y) {
      const r = y % 26;
      return r < 2 ? 0.7 : (0.9 + 0.16 * Math.sin((r / 26) * Math.PI)) * (x % 110 < 2 ? 0.8 : 1);
    },
    // the wadded work jacket: seams down the cloth, a hand's breadth apart
    stepplaengs(x, y) {
      const r = x % 22;
      return r < 2 ? 0.7 : (0.92 + 0.14 * Math.sin((r / 22) * Math.PI)) * (y % 120 < 2 ? 0.8 : 1);
    },
    cord(x, y) {
      return 0.86 + 0.24 * Math.abs(((x % 5) - 2) / 2) + (hash(x, y) - 0.5) * 0.06;
    },
    strick(x, y) {
      const r = y % 6,
        s = (x + (Math.floor(y / 6) % 2) * 3) % 6;
      return 0.84 + 0.2 * (r < 3 ? 1 : 0.5) + (Math.abs(s - 3) < 1 ? -0.1 : 0);
    },
    stonewash(x, y) {
      return 0.82 + vnoise(x / 22, y / 22) * 0.34 + vnoise(x / 4, y / 4) * 0.12 + (hash(x, y) - 0.5) * 0.08;
    },
    // „moon-washed“: the marbled bleach of the late eighties
    moonwash(x, y) {
      const n = vnoise(x / 11, y / 15) * 0.6 + vnoise(x / 4, y / 5) * 0.4;
      return 0.74 + n * 0.6 + (n > 0.6 ? 0.22 : 0) + (hash(x, y) - 0.5) * 0.08;
    },
    karo(x, y) {
      const a = x % 44 < 8,
        b = y % 44 < 8;
      return a && b ? 0.62 : a || b ? 0.8 : 1;
    },
    // a small check (a flannel shirt)
    karoklein(x, y) {
      const a = x % 14 < 7,
        b = y % 14 < 7;
      return a && b ? 0.58 : a || b ? 0.82 : [1, [222, 214, 196]];
    },
    streifen(x, y) {
      return y % 90 < 7 || (y + 14) % 90 < 7 ? [2.4, [236, 236, 230]] : 1;
    },
    // a pin stripe (a suit of „Präsent 20“)
    nadel(x, y) {
      return x % 12 < 1 ? 1.35 : 0.97 + (hash(x, y) - 0.5) * 0.05;
    },
    fischgrat(x, y) {
      const c = Math.floor(x / 10) % 2,
        d = (y + (c ? x : -x) + 8160) % 6;
      return d < 3 ? 0.88 : 1.08;
    },
    // a jumper of the time: knitted bands of zigzag in two more colours across chest and sleeves
    zacken(x, y) {
      const r = y % 64,
        k = MUSTER.strick(x, y);
      if (r < 22) {
        const zz = Math.abs((x % 16) - 8) + (r - 4);
        if (zz > 6 && zz < 12) return [k, [232, 226, 208]];
        if (zz >= 12 && zz < 16) return [k, [150, 44, 50]];
      }
      return k;
    },
    leder(x, y) {
      return 0.8 + vnoise(x / 30, y / 30) * 0.5 + (hash(x, y) - 0.5) * 0.05;
    },
    // small blossoms scattered on the cloth (the print of a Dederon apron)
    blumen(x, y) {
      const cx = Math.floor(x / 18),
        cy = Math.floor(y / 18),
        ox = 5 + hash(cx, cy) * 8,
        oy = 5 + hash(cy, cx + 7) * 8,
        d = hyp((x % 18) - ox, (y % 18) - oy);
      if (d < 1.5) return [1, [236, 206, 96]];
      if (d < 3.7) return [1, hash(cx + 3, cy) < 0.5 ? [228, 226, 216] : [214, 130, 150]];
      return 1 + (vnoise(x / 6, y / 6) - 0.5) * 0.08;
    },
    // the other apron print: small rings and dots in rows
    tupfen(x, y) {
      const d = hyp((x % 16) - 8, ((y + (Math.floor(x / 16) % 2) * 8) % 16) - 8);
      return d < 2.2 ? [1, [236, 232, 220]] : d > 4 && d < 5.2 ? [1, [226, 190, 120]] : 1;
    },
  };
  // ---- the triangles of the figure in the space of each texture, with their zone and their place on the body ----
  // ---- the pixels of a figure's textures ----
  // On the test servers and in the preview (later everywhere, and on phones) the images inside the models arrive as GPU-compressed
  // textures (core/assets.js TEX2): nothing a canvas can draw. Then the figure's file is read once more (it is in the browser's cache) and
  // the base colour images of its materials are decoded – kept only until the figure is dressed (forget).
  const SRC = new Map();
  const imgOf = t => SRC.get(t) || t.image;
  async function pixels(model, file) {
    const need = new Map();
    model.traverse(x => {
      if (!x.isMesh) return;
      for (const m of Array.isArray(x.material) ? x.material : [x.material])
        if (m && m.map && m.map.isCompressedTexture && !SRC.has(m.map)) need.set(m.name || '', m.map);
    });
    if (!need.size || !file || typeof createImageBitmap !== 'function') return 0;
    let n = 0;
    try {
      const J = await (await fetch(U(file))).json(),
        texs = J.textures || [],
        imgs = J.images || [];
      for (const md of J.materials || []) {
        const t = need.get(md.name || ''),
          bt = md.pbrMetallicRoughness && md.pbrMetallicRoughness.baseColorTexture,
          td = bt && texs[bt.index];
        if (!t || !td) continue;
        const ext = td.extensions && td.extensions.EXT_texture_webp,
          im = imgs[ext ? ext.source : td.source];
        if (!im || !im.uri || !im.uri.startsWith('data:')) continue;
        const blob = new Blob([b64bytes(im.uri)], { type: im.mimeType || im.uri.slice(5, im.uri.indexOf(';')) });
        SRC.set(t, await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }));
        n++;
      }
    } catch (e) {
      console.warn('grenzland pixels', e);
      S.err = 'pixels: ' + ((e && e.message) || e);
    }
    return n;
  }
  function forget(model) {
    model.traverse(x => {
      if (!x.isMesh) return;
      for (const m of Array.isArray(x.material) ? x.material : [x.material]) {
        const b = m && m.map && SRC.get(m.map);
        if (!b) continue;
        SRC.delete(m.map);
        if (typeof b.close === 'function') b.close();
      }
    });
  }
  function dress(model, K, restore) {
    const made = [];
    if (!K) return made;
    let F = null;
    try {
      F = frameOf(model);
    } catch (e) {
      console.warn('grenzland frame', e);
    }
    if (!F) return made;
    const G = measure(F);
    S.last = {
      H: +F.H.toFixed(3),
      neck: +G.neck.toFixed(3),
      hip: +G.hip.toFixed(3),
      flip: F.flip,
      parts: F.parts.length,
    };
    const jobs = new Map();
    for (const { x, Wp } of F.parts) {
      const g = x.geometry,
        ua = g.attributes.uv,
        idx = g.index;
      if (!ua) continue;
      const list = Array.isArray(x.material) ? x.material : [x.material],
        nt = (idx ? idx.count : g.attributes.position.count) / 3,
        groups =
          g.groups && g.groups.length && list.length > 1 ? g.groups : [{ start: 0, count: nt * 3, materialIndex: 0 }];
      for (const gr of groups) {
        const m = list[gr.materialIndex] || list[0];
        if (!m || !m.map || !m.map.image || !(m.map.image.width > 8)) continue;
        if (m.map.isCompressedTexture && !SRC.has(m.map)) {
          S.last.packed = (S.last.packed || 0) + 1; // no pixels to paint on (pixels() first)
          continue;
        }
        // hair cards, lashes, glasses: never painted (long hair over a shoulder would take the jacket's colour)
        if (m.alphaTest > 0 || m.transparent || /opacity|hair|lash|brow|glass/i.test(m.name || '')) continue;
        if (!jobs.has(m.map))
          jobs.set(m.map, { tris: [], mats: new Set(), any: false, head: /head/i.test(m.name || '') });
        const Jb = jobs.get(m.map);
        Jb.mats.add(m);
        for (let t = gr.start; t + 2 < gr.start + gr.count; t += 3) {
          const a = idx ? idx.getX(t) : t,
            b = idx ? idx.getX(t + 1) : t + 1,
            c = idx ? idx.getX(t + 2) : t + 2,
            z = zoneOf(
              K,
              G,
              (Wp[a * 3] + Wp[b * 3] + Wp[c * 3]) / 3,
              (Wp[a * 3 + 1] + Wp[b * 3 + 1] + Wp[c * 3 + 1]) / 3,
              (Wp[a * 3 + 2] + Wp[b * 3 + 2] + Wp[c * 3 + 2]) / 3
            );
          if (z) Jb.any = true;
          Jb.tris.push(z || 255);
          for (const v of [a, b, c]) Jb.tris.push(ua.getX(v), ua.getY(v), Wp[v * 3], Wp[v * 3 + 1], Wp[v * 3 + 2]);
        }
      }
    }
    const MAX = COARSE ? 512 : 1024;
    for (const [tex, Jb] of jobs) {
      if (!Jb.any) continue;
      let t2 = null;
      try {
        t2 = paint(tex, Jb.tris, K, G, MAX, Jb.head);
      } catch (e) {
        console.warn('grenzland dress', e);
        S.err = 'dress: ' + ((e && e.message) || e);
      }
      if (!t2) continue;
      made.push(t2);
      S.paints++;
      for (const m of Jb.mats) {
        if (restore) restore.push([m, m.map]);
        m.map = t2;
        m.needsUpdate = true;
      }
    }
    return made;
  }
  // every triangle into the texture's pixels: its zone (255: the figure's own, not to be touched) and the place on the body (x, y, z)
  function raster(tris, W, Hh, flipY) {
    const Z = new Uint8Array(W * Hh),
      Q = new Float32Array(W * Hh * 3),
      fu = u => (u - Math.floor(u)) * W,
      fv = v => (flipY ? 1 - (v - Math.floor(v)) : v - Math.floor(v)) * Hh;
    for (let i = 0; i < tris.length; i += 16) {
      const zone = tris[i],
        ax = fu(tris[i + 1]),
        ay = fv(tris[i + 2]),
        bx = fu(tris[i + 6]),
        by = fv(tris[i + 7]),
        cx = fu(tris[i + 11]),
        cy = fv(tris[i + 12]),
        area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-6 || Math.abs(area) > W * Hh * 0.25) continue;
      const inv = 1 / area,
        // a pixel and a half over the edges, so that the seams of the texture are covered (only where nothing else was drawn)
        e = Math.min(
          0.6,
          (0.75 * Math.max(hyp(bx - ax, by - ay), hyp(cx - bx, cy - by), hyp(ax - cx, ay - cy))) / Math.abs(area)
        ),
        x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1.5)),
        x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx) + 1.5)),
        y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - 1.5)),
        y1 = Math.min(Hh - 1, Math.ceil(Math.max(ay, by, cy) + 1.5));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5,
            py = y + 0.5,
            w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) * inv,
            w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) * inv,
            w2 = 1 - w0 - w1;
          if (w0 < -e || w1 < -e || w2 < -e) continue;
          const k = y * W + x,
            inside = w0 >= 0 && w1 >= 0 && w2 >= 0;
          if (!inside && Z[k]) continue;
          Z[k] = inside ? zone : zone === 255 ? 0 : zone | 128;
          if (!Z[k]) continue;
          Q[k * 3] = w0 * tris[i + 3] + w1 * tris[i + 8] + w2 * tris[i + 13];
          Q[k * 3 + 1] = w0 * tris[i + 4] + w1 * tris[i + 9] + w2 * tris[i + 14];
          Q[k * 3 + 2] = w0 * tris[i + 5] + w1 * tris[i + 10] + w2 * tris[i + 15];
        }
    }
    return { Z, Q };
  }
  const mulC = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  function paint(tex, tris, K, G, MAX, isHead) {
    // (a body texture of 512 px is painted at twice its size on a desktop: buttons and prints need the pixels)
    const img = imgOf(tex),
      k = Math.min(2, MAX / Math.max(img.width, img.height)),
      W = Math.max(8, Math.round(img.width * k)),
      Hh = Math.max(8, Math.round(img.height * k));
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = Hh;
    const c2 = cv.getContext('2d', { willReadFrequently: true });
    c2.drawImage(img, 0, 0, W, Hh);
    const { Z, Q } = raster(tris, W, Hh, !!tex.flipY),
      D = c2.getImageData(0, 0, W, Hh),
      p = D.data;
    const hem = K.rock ? K.rock * G.H : G.hip - (K.saum ?? 0.03),
      boot = G.ankle + (K.schaft ?? 0.035);
    // the hem and the boot's top are lines on the body, not the edges of triangles: torso, legs and shoes are told apart per pixel
    const yc = G.neck - 0.012 + (K.hals || 0);
    for (let j = 0; j < Z.length; j++) {
      const v = Z[j];
      if (!v || v === 255) continue;
      const z = v & 127,
        y = Q[j * 3 + 1];
      // above the collar's line: the throat stays (the head's own texture); what the figure wore there – a collar of its body's
      // texture – becomes the new garment's collar (zone 7)
      if (z === 6) Z[j] = y > G.kinn || (y > yc && Math.abs(Q[j * 3]) < 0.058 * G.H) ? (isHead ? 255 : 7) : 1;
      else Z[j] = z === 1 || z === 2 || z === 5 ? (y < boot ? 5 : y < hem ? 2 : 1) : z;
    }
    const zn = v => (v === 255 ? 0 : v);
    // the light of the cloth, and of bare skin, around each pixel (a coarse grid of means; the garment's colour is multiplied by what a
    // pixel differs from the light around it: folds and seams stay, but a dark skirt under a light blouse becomes one apron dress)
    const NG = 64,
      bw = W / NG,
      bh = Hh / NG,
      gs = new Float32Array(NG * NG * 2),
      gc = new Float32Array(NG * NG * 2),
      sum = [0, 0],
      cnt = [0, 0],
      lum = new Float32Array(W * Hh);
    for (let y = 0, j = 0; y < Hh; y++)
      for (let x = 0; x < W; x++, j++) {
        if (!zn(Z[j])) continue;
        const i = j * 4,
          l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2],
          sk = isSkin(p[i], p[i + 1], p[i + 2]) ? 1 : 0,
          g = (Math.min(NG - 1, Math.floor(y / bh)) * NG + Math.min(NG - 1, Math.floor(x / bw))) * 2 + sk;
        lum[j] = l;
        gs[g] += l;
        gc[g]++;
        sum[sk] += l;
        cnt[sk]++;
      }
    const mean = [cnt[0] > 20 ? sum[0] / cnt[0] : 110, cnt[1] > 20 ? sum[1] / cnt[1] : 150];
    for (let g = 0; g < gs.length; g++) gs[g] = gc[g] > 5 ? gs[g] / gc[g] : mean[g & 1];
    const local = (x, y, sk) => {
      const fx = Math.max(0, Math.min(NG - 1.001, x / bw - 0.5)),
        fy = Math.max(0, Math.min(NG - 1.001, y / bh - 0.5)),
        ix = Math.floor(fx),
        iy = Math.floor(fy),
        tx = fx - ix,
        ty = fy - iy,
        a = (iy * NG + ix) * 2 + sk,
        b = a + NG * 2;
      return (gs[a] * (1 - tx) + gs[a + 2] * tx) * (1 - ty) + (gs[b] * (1 - tx) + gs[b + 2] * tx) * ty;
    };
    const vT = K.hemd ? yc - (K.vtief ?? 0.17) : 1e9,
      vW = K.vweit ?? 0.42,
      mOb = MUSTER[K.oberM] || null,
      mUn = MUSTER[K.unterM] || null,
      mAr = K.armM ? MUSTER[K.armM] || null : mOb,
      armC = K.armC || K.ober,
      PU = 400,
      O = 8160;
    let col = null,
      fac = 1;
    const pat = (M, a, b) => {
      if (!M) return;
      const q = M(Math.round(a * PU) + O, Math.round(b * PU) + O);
      if (Array.isArray(q)) {
        fac *= q[0] > 1.5 ? 1 : q[0];
        col = q[1];
      } else fac *= q;
    };
    for (let y = 0; y < Hh; y++)
      for (let x = 0; x < W; x++) {
        const j = y * W + x,
          z = zn(Z[j]);
        if (!z) continue;
        const i = j * 4,
          r = p[i],
          g = p[i + 1],
          b = p[i + 2],
          sk = isSkin(r, g, b),
          bx = Q[j * 3],
          by = Q[j * 3 + 1],
          bz = Q[j * 3 + 2];
        col = null;
        fac = 1;
        if (z === 1) {
          // ---- the torso: jacket, jumper, apron dress – and what is on it ----
          const front = bz > G.shZ - 0.02,
            ax = Math.abs(bx);
          col = K.ober;
          if (K.passe && by > G.shY - (K.passeH ?? 0.11)) col = K.passe;
          if (K.bund && by < hem + 0.06) {
            col = K.bund;
            fac *= 0.88 + 0.2 * (Math.round(Math.atan2(bx, bz) * 60) % 2 ? 1 : 0);
          } else pat(mOb, front ? bx : 0.61 - bx, by);
          if (front && by > vT && ax < (by - vT) * vW + 0.004) {
            // the opening of a jacket: shirt, tie
            col = K.hemd;
            fac = 1;
            if (K.schlips && ax < 0.019 + (yc - by < 0.035 ? 0.008 : 0)) col = K.schlips;
          } else if (K.kragenC && by > yc - 0.035) {
            col = K.kragenC;
            fac = 1;
          }
          if (K.kragen && front && by > yc - 0.05 && by < yc + 0.03 && ax > 0.024 && ax < 0.08) {
            col = K.kragen;
            fac = 1;
          }
          if (K.schulter && by > G.shY + 0.03 && ax > 0.07 && ax < G.shX + 0.03 && Math.abs(bz - G.shZ) < 0.032) {
            col = K.schulter;
            fac = 1;
          }
          if (K.streifen && by / G.H > 0.7 && by / G.H < 0.728) {
            col = K.streifen;
            fac = 1;
          }
          if (K.koppel && by > G.hip + 0.135 && by < G.hip + 0.182) {
            col = front && ax < 0.03 ? K.schnalle || [186, 180, 160] : K.koppel;
            fac = 1;
          }
          if (front && by < Math.min(vT, yc - 0.045) && by > hem + 0.035) {
            if (K.reissv && ax < 0.0045) {
              col = K.reissv;
              fac = 1;
            } else if (K.knopf) {
              const yy = ((by - hem) % 0.095) - 0.0475;
              if (bx * bx + yy * yy < 0.0105 * 0.0105) {
                col = K.knopf;
                fac = 1;
              } else if (ax < 0.0025) fac *= 0.62;
            }
          }
          if (K.taschen && front) {
            // patch pockets: their edges and the line of the flap
            const box = (x0, x1, y0, y1) => {
              if (ax > x0 && ax < x1 && by > y0 && by < y1) {
                if (ax - x0 < 0.005 || x1 - ax < 0.005 || by - y0 < 0.005 || Math.abs(by - (y1 - 0.035)) < 0.003)
                  fac *= 0.68;
              }
            };
            box(0.05, 0.135, G.shY - 0.24, G.shY - 0.13);
            if (hem < G.hip - 0.06) box(0.06, 0.17, hem + 0.05, hem + 0.19);
          }
        } else if (z === 3 || z === 4) {
          // ---- the arms ----
          if (sk && !K.arm) continue; // bare arms stay bare where the garment has no sleeves (a summer apron)
          const a = G.arm[z - 3],
            [t, d] = armAt(a, bx, by, bz);
          col = K.passeArm ? K.passe || armC : armC;
          if (K.bund && t > 0.92) {
            col = K.bund;
            fac *= 0.88 + 0.2 * (Math.round(d * 400) % 2 ? 1 : 0);
          } else
            pat(
              mAr,
              Math.atan2(bz - (a.A[2] + a.d[2] * t), by - (a.A[1] + a.d[1] * t)) * 0.045 + (z - 3) * 0.37,
              t * a.len
            );
          if (K.band && z === 3 && t > 0.75 && t < 0.815) {
            col = K.band;
            fac = 1;
          }
          if (
            K.abz &&
            z === 3 &&
            t > 0.2 &&
            t < 0.31 &&
            bx - (a.A[0] + a.d[0] * t) + by - (a.A[1] + a.d[1] * t) > 0.03
          ) {
            const u = (t - 0.255) / 0.055,
              v = (bz - (a.A[2] + a.d[2] * t)) / 0.034;
            if (u * u + v * v < 1) {
              col = u * u + v * v > 0.62 ? K.abzRand || [200, 200, 196] : K.abz;
              fac = 1;
            }
          }
        } else if (z === 7) {
          col = K.kragenC || K.hemd || K.ober;
        } else if (z === 2) {
          // ---- the legs ----
          const sd = bx > 0 ? 1 : -1,
            lx = Math.abs(bx) - G.legX,
            a = Math.atan2(lx, bz - G.legZ);
          col = K.unter;
          pat(mUn, a * 0.07 + sd * 0.41, by);
          if (K.galon && Math.abs(a - Math.PI / 2) < 0.17 && lx > 0.02) {
            col = K.galon;
            fac = 1;
          } else if (K.falte && Math.abs(a) < 0.035 && by < G.hip - 0.12) fac *= 1.14;
          else if (K.naht && Math.abs(Math.abs(a - Math.PI / 2) - 0.07) < 0.02 && lx > 0.02) fac *= 0.74;
        } else {
          // ---- shoes ----
          col = K.schuh;
          if (K.sohle && by < 0.022) col = K.sohle;
          else if (by < 0.014) fac *= 0.55;
        }
        if (!col) continue;
        const lr = Math.max(12, local(x, y, sk ? 1 : 0));
        let f = 1 + (lum[j] / lr - 1) * (sk ? 0.5 : 0.85) * (1 - (K.glatt || 0));
        f = Math.max(0.5, Math.min(1.45, f)) * fac;
        p[i] = Math.min(255, col[0] * f);
        p[i + 1] = Math.min(255, col[1] * f);
        p[i + 2] = Math.min(255, col[2] * f);
      }
    c2.putImageData(D, 0, 0);
    let t;
    if (tex.isCompressedTexture) {
      // (a compressed texture's clone would keep its format and mip levels: a plain texture with the same sampling instead)
      t = new THREE.Texture(cv);
      t.name = tex.name;
      t.flipY = tex.flipY;
      t.colorSpace = tex.colorSpace;
      t.wrapS = tex.wrapS;
      t.wrapT = tex.wrapT;
      t.anisotropy = tex.anisotropy;
      t.channel = tex.channel;
      t.offset.copy(tex.offset);
      t.repeat.copy(tex.repeat);
      t.center.copy(tex.center);
      t.rotation = tex.rotation;
    } else {
      t = tex.clone();
      t.source = new THREE.Source(cv);
    }
    t.needsUpdate = true;
    return t;
  }
  // ------------------------------------------------------------------ the head: headwear, hair, moustache, glasses ------------------------------------------------------------------
  // The head in its own upright measure (metres; the origin of what is put on it is the crown's top): half widths of the skull, the tip
  // of the nose, the colour of the hair – from the vertices that move with the head bone, in the bind pose.
  const imgPx = new WeakMap();
  function texel(img, u, v, flipY) {
    let d = imgPx.get(img);
    if (!d) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const g = c.getContext('2d', { willReadFrequently: true });
      try {
        g.drawImage(img, 0, 0, 96, 96);
        d = g.getImageData(0, 0, 96, 96).data;
      } catch (e) {
        d = new Uint8ClampedArray(96 * 96 * 4);
      }
      imgPx.set(img, d);
    }
    const x = Math.min(95, Math.max(0, Math.floor((u - Math.floor(u)) * 96))),
      vv = v - Math.floor(v),
      y = Math.min(95, Math.max(0, Math.floor((flipY ? 1 - vv : vv) * 96))),
      i = (y * 96 + x) * 4;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }
  function headOf(model) {
    const F = frameOf(model);
    if (!F || !F.B.Head) return null;
    const head = F.B.Head,
      sk = F.sk,
      hI = sk.bones.indexOf(head),
      hipI = sk.bones.indexOf(F.B.Hips);
    if (hI < 0) return null;
    // the frame's directions in the head bone's space, the head's size in the world
    const Dm = new THREE.Matrix4().copy(sk.boneInverses[hI]).multiply(_m.copy(sk.boneInverses[hipI]).invert()),
      Xh = F.Xv.clone().multiplyScalar(F.flip).transformDirection(Dm),
      Uh = F.Uv.clone().transformDirection(Dm),
      Wh = F.Wv.clone().multiplyScalar(F.flip).transformDirection(Dm),
      sh = head.getWorldScale(new THREE.Vector3()).x || 1,
      jy = F.J.Head[1],
      jx = F.J.Head[0],
      jz = F.J.Head[2];
    // the vertices that go with the head (its bone or one below it), relative to the head joint
    const pts = [],
      src = [],
      face = [];
    for (const { x, Wp } of F.parts) {
      const mn = Array.isArray(x.material) ? x.material[0] : x.material,
        isFace = !!mn && /head/i.test(mn.name || '') && !(mn.alphaTest > 0) && !mn.transparent;
      const g = x.geometry,
        si = g.attributes.skinIndex,
        sw = g.attributes.skinWeight;
      if (!si || !sw) continue;
      const under = x.skeleton.bones.map(b => {
        for (let q = b; q && q.isBone; q = q.parent) if (q === head) return true;
        return false;
      });
      const n = si.count,
        st = Math.max(1, Math.floor(n / 9000));
      for (let i = 0; i < n; i += st) {
        let b = 0,
          bw = -1;
        for (let k = 0; k < 4; k++) {
          const w = sw.getComponent(i, k);
          if (w > bw) {
            bw = w;
            b = si.getComponent(i, k);
          }
        }
        if (!under[b]) continue;
        pts.push(Wp[i * 3] - jx, Wp[i * 3 + 1] - jy, Wp[i * 3 + 2] - jz);
        src.push(x, i);
        face.push(isFace);
      }
    }
    if (pts.length < 60) return null;
    let top = -1e9;
    for (let i = 1; i < pts.length; i += 3) top = Math.max(top, pts[i]);
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9;
    for (let i = 0; i < pts.length; i += 3)
      if (pts[i + 1] > top - 0.1) {
        x0 = Math.min(x0, pts[i]);
        x1 = Math.max(x1, pts[i]);
        z0 = Math.min(z0, pts[i + 2]);
        z1 = Math.max(z1, pts[i + 2]);
      }
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2,
      rx = Math.max(0.07, Math.min(0.11, (x1 - x0) / 2)),
      rz = Math.max(0.08, Math.min(0.125, (z1 - z0) / 2));
    // the tip of the nose: the foremost point of the middle of the face
    const anyFace = face.some(Boolean);
    let nz = -1e9,
      ny = top - 0.14;
    for (let i = 0, q = 0; i < pts.length; i += 3, q++)
      if (
        (face[q] || !anyFace) &&
        Math.abs(pts[i] - cx) < 0.016 &&
        pts[i + 1] < top - 0.085 &&
        pts[i + 1] > top - 0.215 &&
        pts[i + 2] > nz
      ) {
        nz = pts[i + 2];
        ny = pts[i + 1];
      }
    if (nz < cz + 0.05) nz = cz + rz + 0.012;
    // the hair's colour: the texture at the crown
    let hr = 0,
      hg = 0,
      hb = 0,
      hn = 0;
    for (let i = 0, k = 0; i < pts.length; i += 3, k += 2) {
      if (pts[i + 1] < top - 0.035) continue;
      const x = src[k],
        ua = x.geometry.attributes.uv,
        m = Array.isArray(x.material) ? x.material[0] : x.material;
      if (!ua || !m || !m.map || !m.map.image) continue;
      const c = texel(imgOf(m.map), ua.getX(src[k + 1]), ua.getY(src[k + 1]), !!m.map.flipY);
      if (c[3] < 140) continue;
      hr += c[0];
      hg += c[1];
      hb += c[2];
      hn++;
    }
    const hair = hn > 4 ? [hr / hn, hg / hn, hb / hn] : [78, 58, 42];
    // where a thing of the head hangs: the crown's top in the head bone's space, upright, in metres
    const pos = new THREE.Vector3()
        .addScaledVector(Xh, cx / sh)
        .addScaledVector(Uh, top / sh)
        .addScaledVector(Wh, cz / sh),
      quat = new THREE.Quaternion().setFromRotationMatrix(_m2.makeBasis(Xh.clone().negate(), Uh, Wh.clone().negate()));
    return { head, pos, quat, k: 1 / sh, rx, rz, R: (rx + rz) / 2, nose: [nz - cz, ny - top], hair };
  }
  // a dome from the top down to the angle `to` (rad from the top), radii rx (across) and ry (along), in the kit's frame (z up)
  function dome(K, z0, rx, ry, rz, to, col, seg = 14, rings = 6, from = 0) {
    for (let j = 0; j < rings; j++) {
      const t0 = from + ((to - from) * j) / rings,
        t1 = from + ((to - from) * (j + 1)) / rings;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2,
          a1 = ((i + 1) / seg) * Math.PI * 2,
          P = (a, t) => [Math.cos(a) * Math.sin(t) * rx, Math.sin(a) * Math.sin(t) * ry, z0 + Math.cos(t) * rz];
        if (j === 0 && from === 0) K.tri(P(a0, t1), P(a1, t1), P(a0, t0), col);
        else K.quad(P(a0, t1), P(a1, t1), P(a1, t0), P(a0, t0), col);
      }
    }
  }
  const HUT = {
    // the peaked cap of a uniform: band, a top wider than the band, the peak
    schirm(K, R, c) {
      const r = R * 1.02;
      K.lathe(
        0,
        0,
        -0.078,
        [
          [r, 0],
          [r, 0.04],
          [r * 1.3, 0.085],
          [r * 1.27, 0.098],
          [0, 0.104],
        ],
        16,
        c.top
      );
      K.lathe(
        0,
        0,
        -0.08,
        [
          [r * 1.015, 0],
          [r * 1.015, 0.03],
        ],
        16,
        c.band
      );
      K.box(0, r + 0.03, -0.078, 0.15, 0.085, 0.012, 0, c.peak, true);
      K.box(0, r + 0.004, -0.04, 0.03, 0.01, 0.03, 0, c.badge || c.band);
    },
    // the flat cap: pulled down to the forehead, a short peak
    schieber(K, R, c) {
      dome(K, -0.108, R * 1.13, R * 1.2, 0.13, 1.36, c.top, 14, 5);
      K.box(0, R * 1.08 + 0.03, -0.088, 0.135, 0.075, 0.012, 0, c.top, true);
    },
    // a felt hat: brim, crown with a dent, the band
    hut(K, R, c) {
      K.lathe(
        0,
        0,
        -0.082,
        [
          [R * 1.72, -0.004],
          [R * 1.06, 0.008],
          [R * 1.0, 0.095],
          [R * 0.78, 0.118],
          [0, 0.108],
        ],
        16,
        c.top
      );
      K.lathe(
        0,
        0,
        -0.084,
        [
          [R * 1.74, -0.006],
          [R * 1.06, -0.01],
        ],
        16,
        c.top
      );
      K.lathe(
        0,
        0,
        -0.072,
        [
          [R * 1.075, 0],
          [R * 1.045, 0.03],
        ],
        16,
        c.band
      );
    },
    // the headscarf: close over the hair, the face free – from the hairline round the cheeks to the chin, tied under it, a corner down the nape
    kopftuch(K, R, c) {
      const rx = R * 1.09,
        ry = R * 1.14,
        rv = R * 1.14,
        z0 = -R * 1.0,
        seg = 16,
        rings = 8,
        to = 2.2,
        P = (a, t) => [Math.cos(a) * Math.sin(t) * rx, Math.sin(a) * Math.sin(t) * ry, z0 + Math.cos(t) * rv];
      for (let j = 0; j < rings; j++) {
        const t0 = (to * j) / rings,
          t1 = (to * (j + 1)) / rings;
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI * 2,
            a1 = ((i + 1) / seg) * Math.PI * 2,
            fr = Math.sin((a0 + a1) / 2);
          // the face: nothing in front below the hairline, nothing before the cheeks further down
          if ((fr > 0.5 && t1 > 0.78) || (fr > 0.15 && t1 > 1.5)) continue;
          if (j === 0) K.tri(P(a0, t1), P(a1, t1), P(a0, t0), c.top);
          else K.quad(P(a0, t1), P(a1, t1), P(a1, t0), P(a0, t0), c.top);
        }
      }
      // the ends from the cheeks to the knot under the chin
      const kn = [0, R * 0.62, z0 + Math.cos(to) * rv - 0.035];
      for (const sx of [-1, 1]) {
        const a = Math.PI / 2 + sx * 1.42,
          p0 = P(a, 1.55),
          p1 = P(a, to),
          q0 = [kn[0] + sx * 0.012, kn[1], kn[2] + 0.03],
          q1 = [kn[0] + sx * 0.012, kn[1] - 0.02, kn[2]];
        K.quad(p1, q1, q0, p0, c.top);
        K.quad(p0, q0, q1, p1, c.top);
      }
      K.box(kn[0], kn[1], kn[2], 0.045, 0.035, 0.035, 0, c.band, true);
      // the corner at the back
      const b0 = P(-Math.PI / 2 - 0.5, to),
        b1 = P(-Math.PI / 2 + 0.5, to),
        b2 = [0, -ry * 1.02, z0 + Math.cos(to) * rv - 0.1];
      K.tri(b0, b1, b2, c.top);
      K.tri(b1, b0, b2, c.top);
    },
    strick(K, R, c) {
      dome(K, -R * 0.9, R * 1.1, R * 1.14, R * 1.12, 1.45, c.top, 14, 6);
      K.lathe(
        0,
        0,
        -R * 0.9 + Math.cos(1.45) * R * 1.12 - 0.02,
        [
          [R * 1.13, 0],
          [R * 1.15, 0.035],
        ],
        14,
        c.band
      );
      dome(K, 0.045, 0.036, 0.036, 0.036, Math.PI, c.band, 8, 5);
    },
    basecap(K, R, c) {
      dome(K, -R * 0.9, R * 1.08, R * 1.12, R * 1.06, 1.42, c.top, 14, 6);
      K.box(0, R + 0.045, -R * 0.9 + 0.012, 0.15, 0.11, 0.012, 0, c.band, true);
    },
    // a moped helmet (jet shape): a shell down to the ears, a darker edge
    helm(K, R, c) {
      dome(K, -R * 0.78, R * 1.3, R * 1.36, R * 1.3, 1.95, c.top, 16, 8);
      K.lathe(
        0,
        0,
        -R * 0.78 + Math.cos(1.95) * R * 1.3 - 0.012,
        [
          [R * 1.24, 0],
          [R * 1.27, 0.02],
        ],
        16,
        c.band
      );
      K.box(0, R * 1.32, -R * 0.55, 0.19, 0.03, 0.014, 0, c.band, true);
    },
  };
  const HUTC = {
    vopo: ['schirm', { top: L(104, 116, 100), band: L(52, 96, 62), peak: L(16, 16, 16), badge: L(190, 170, 70) }],
    grenzer: ['schirm', { top: L(122, 122, 112), band: L(58, 118, 70), peak: L(16, 16, 16), badge: L(190, 170, 70) }],
    polizei: ['schirm', { top: L(236, 236, 232), band: L(22, 34, 66), peak: L(14, 14, 16), badge: L(210, 210, 215) }],
    schieber: ['schieber', { top: L(72, 66, 58) }],
    schiebergrau: ['schieber', { top: L(96, 98, 100) }],
    hut: ['hut', { top: L(84, 76, 64), band: L(40, 34, 30) }],
    kopftuch: ['kopftuch', { top: L(150, 54, 60), band: L(150, 54, 60) }],
    kopftuchblau: ['kopftuch', { top: L(62, 84, 128), band: L(62, 84, 128) }],
    kopftuchbunt: ['kopftuch', { top: L(78, 96, 86), band: L(60, 76, 68) }],
    strick: ['strick', { top: L(196, 70, 150), band: L(236, 232, 224) }],
    strickblau: ['strick', { top: L(60, 96, 150), band: L(232, 228, 216) }],
    basecap: ['basecap', { top: L(30, 34, 40), band: L(30, 34, 40) }],
    helm: ['helm', { top: L(222, 220, 212), band: L(26, 26, 28) }],
    helmrot: ['helm', { top: L(170, 30, 28), band: L(26, 26, 28) }],
    helmschwarz: ['helm', { top: L(24, 24, 26), band: L(60, 60, 62) }],
  };
  // ---- hair, moustache, glasses: built in the head's own measure (D of headOf; kit frame: x right, y forward, z up from the crown) ----
  const tone = (c, f) => [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];
  const HAAR = {
    // a perm: curls all over, the face free (lang: down to the shoulders). The curls overlap and differ little in tone: small, angular
    // ones with strong contrast read as hair rollers close up.
    dauerwelle(K, D, c, lang) {
      const rv = 0.108,
        n = lang ? 96 : 76;
      for (let i = 0; i < n; i++) {
        const h1 = hash(i, 7),
          h2 = hash(i, 13),
          h3 = hash(i, 29),
          th = 0.12 + h1 * (lang ? 1.95 : 1.8),
          ph = h2 * Math.PI * 2,
          fr = Math.cos(ph);
        if ((th > 0.78 && fr > 0.5) || (th > 1.2 && fr > 0.12)) continue; // the face
        const r = 1.04 + h3 * 0.08;
        K.ball(
          Math.sin(th) * Math.sin(ph) * D.rx * r,
          Math.sin(th) * fr * D.rz * r,
          -rv + Math.cos(th) * rv * r,
          0.03 + h3 * 0.013,
          tone(c, 0.88 + hash(i, 3) * 0.24),
          7
        );
      }
      if (lang)
        for (let i = 0; i < 46; i++) {
          const h1 = hash(i, 41),
            h2 = hash(i, 43),
            ph = Math.PI * (0.42 + h1 * 1.16),
            z = -rv * 1.25 - h2 * 0.17,
            r = 1.05 + (z < -0.2 ? 0.12 : 0);
          K.ball(
            Math.sin(ph) * D.rx * r,
            Math.cos(ph) * D.rz * r,
            z,
            0.032 + hash(i, 47) * 0.013,
            tone(c, 0.88 + hash(i, 5) * 0.24),
            7
          );
        }
    },
    dauerwellelang(K, D, c) {
      HAAR.dauerwelle(K, D, c, true);
    },
    // „vorne kurz, hinten lang“: short and standing on top, the nape down to the collar
    vokuhila(K, D, c) {
      const rv = 0.106;
      dome(K, -rv * 1.0, D.rx * 1.04, D.rz * 1.05, rv * 1.08, 1.05, tone(c, 0.95), 12, 4);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI - Math.PI / 2;
        K.ball(
          Math.sin(a) * D.rx * 0.8,
          Math.cos(a) * D.rz * 0.86 + 0.012,
          -0.012 - Math.abs(Math.sin(a)) * 0.03,
          0.02 + hash(i, 61) * 0.01,
          tone(c, 0.85 + hash(i, 67) * 0.3),
          5
        );
      }
      // the nape: strands from the back of the skull down over the collar
      const rows = 7,
        seg = 8,
        P = (j, i) => {
          const z = -rv * 0.75 - j * 0.042,
            w = 1.2 - Math.min(j, 3) * 0.08 + Math.max(0, j - 4) * 0.05,
            a = Math.PI + (i / seg - 0.5) * 2 * w,
            rr = (j < 3 ? 1.1 - j * 0.07 : 0.9 + (j - 3) * 0.03) + ((i + j) % 2) * 0.03;
          return [Math.sin(a) * D.rx * rr, Math.cos(a) * D.rz * rr, z];
        };
      for (let j = 0; j + 1 < rows; j++)
        for (let i = 0; i < seg; i++) {
          const col = tone(c, 0.82 + hash(i, j + 71) * 0.34);
          K.quad(P(j + 1, i), P(j + 1, i + 1), P(j, i + 1), P(j, i), col);
          K.quad(P(j, i), P(j, i + 1), P(j + 1, i + 1), P(j + 1, i), col);
        }
    },
    // a full head of hair with a side parting (the young teacher)
    scheitel(K, D, c) {
      const rv = 0.106;
      dome(K, -rv * 0.98, D.rx * 1.08, D.rz * 1.1, rv * 1.1, 1.32, c, 14, 5);
      for (let i = 0; i < 12; i++) {
        const a = (i / 11 - 0.42) * 1.5;
        K.ball(
          Math.sin(a) * D.rx * 0.92,
          Math.cos(a) * D.rz * 0.95 + 0.006,
          -0.03 - Math.abs(a) * 0.02,
          0.024,
          tone(c, 0.9 + hash(i, 83) * 0.2),
          5
        );
      }
      for (const sx of [-1, 1])
        for (let i = 0; i < 6; i++)
          K.ball(sx * D.rx * 1.02, -0.02 + i * 0.016 - 0.03, -rv * 0.9 - i * 0.012, 0.021, tone(c, 0.92), 5);
    },
  };
  const BART = {
    schnauzer(K, D, c) {
      const y = D.nose[0] - 0.022,
        z = D.nose[1] - 0.023;
      for (const sx of [-1, 1]) {
        K.box(sx * 0.012, y, z, 0.026, 0.01, 0.009, sx * -0.3, c, true);
        K.box(sx * 0.028, y - 0.006, z - 0.004, 0.012, 0.009, 0.008, sx * -0.65, c, true);
      }
    },
  };
  const BRILLE = {
    // the big frames of the eighties
    gross(K, D, c) {
      const y = D.nose[0] - 0.021,
        zc = D.nose[1] + 0.04,
        xe = Math.max(0.068, Math.min(0.08, D.rx * 0.86)),
        w = 0.054,
        h = 0.046,
        t = 0.0045;
      for (const sx of [-1, 1]) {
        const x = sx * 0.033;
        K.box(x, y, zc + h / 2 - t, w, t, t, 0, c, true);
        K.box(x, y, zc - h / 2, w, t, t, 0, c, true);
        K.box(x - w / 2 + t / 2, y, zc - h / 2, t, t, h, 0, c, true);
        K.box(x + w / 2 - t / 2, y, zc - h / 2, t, t, h, 0, c, true);
        // the hinge and the temple back to the ear
        K.box(sx * (0.033 + w / 2 + (xe - 0.06) / 2), y, zc + h / 2 - 0.012, xe - 0.06 + t, t, t, 0, c, true);
        K.box(sx * xe, y - 0.05, zc + h / 2 - 0.012, t, 0.1, t, 0, c, true);
      }
      K.box(0, y, zc + h / 2 - 0.016, 0.014, t, t, 0, c, true);
    },
  };
  const geoCache = {};
  function hang(H, key, build) {
    if (!geoCache[key]) {
      const K = VPROPS.kit();
      build(K);
      geoCache[key] = K.empty() ? null : K.geo();
    }
    if (!geoCache[key]) return null;
    const g = new THREE.Group(),
      m = new THREE.Mesh(geoCache[key], VFIG.mat());
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    m.frustumCulled = false;
    g.add(m);
    g.position.copy(H.pos);
    g.quaternion.copy(H.quat);
    g.scale.setScalar(H.k);
    H.head.add(g);
    return g;
  }
  const rk = H => H.R.toFixed(3) + ':' + H.rx.toFixed(3) + ':' + H.nose[0].toFixed(3) + ':' + H.nose[1].toFixed(3);
  // put a hat on a model's head (the head bone is found by the model itself; the second argument stays for the callers of old).
  // Returns the group (remove it to take the hat off).
  function hatOn(model, head, kind, H) {
    const def = HUTC[kind];
    if (!def) return null;
    H = H || headOf(model);
    if (!H) return null;
    const R = Math.max(0.085, Math.min(0.125, H.R));
    return hang(H, 'hut:' + kind + ':' + R.toFixed(3), K => HUT[def[0]](K, R, def[1]));
  }
  // hair, moustache, glasses on a model's head: o { haar, bart, brille, farbe: [r, g, b] sRGB (else the figure's own hair colour) }
  function kopf(model, o = {}, H) {
    const out = [];
    H = H || headOf(model);
    if (!H) return out;
    const hc = o.farbe ? L(...o.farbe) : L(...H.hair),
      key = rk(H) + ':' + hc.map(v => v.toFixed(2)).join(',');
    if (o.haar && HAAR[o.haar]) out.push(hang(H, 'haar:' + o.haar + ':' + key, K => HAAR[o.haar](K, H, hc)));
    if (o.bart && BART[o.bart]) out.push(hang(H, 'bart:' + o.bart + ':' + key, K => BART[o.bart](K, H, tone(hc, 0.8))));
    if (o.brille && BRILLE[o.brille])
      out.push(
        hang(H, 'brille:' + o.brille + ':' + rk(H) + (o.gestell || ''), K =>
          BRILLE[o.brille](K, H, o.gestell === 'gold' ? L(150, 120, 60) : L(46, 34, 26))
        )
      );
    return out.filter(Boolean);
  }
  // ------------------------------------------------------------------ what one carries ------------------------------------------------------------------
  // built hanging from the hand (kit frame: x to the right, y forward, z up; the hand at the origin)
  const stick = (K, a, b, r, col) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      n = hyp(d[0], d[1], d[2]) || 1,
      u = [1, 0, 0],
      v = [0, -d[2] / n, d[1] / n],
      c = (p, i) => {
        const q = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ][i];
        return [
          p[0] + (u[0] * q[0] + v[0] * q[1]) * r,
          p[1] + (u[1] * q[0] + v[1] * q[1]) * r,
          p[2] + (u[2] * q[0] + v[2] * q[1]) * r,
        ];
      };
    for (let i = 0; i < 4; i++) K.quad(c(a, i), c(a, (i + 1) % 4), c(b, (i + 1) % 4), c(b, i), col);
  };
  const DING = {
    // the shopping net: oranges from Cuba, a bottle, a paper bag
    netz(K) {
      const N = L(206, 196, 164);
      K.lathe(
        0,
        0,
        -0.42,
        [
          [0.0, 0],
          [0.09, 0.03],
          [0.115, 0.13],
          [0.085, 0.24],
          [0.02, 0.34],
        ],
        8,
        N
      );
      for (const [x, y, z] of [
        [0.05, 0.03, -0.33],
        [-0.045, 0.04, -0.3],
        [0.01, -0.06, -0.31],
        [0.03, 0.06, -0.23],
      ])
        K.ball(x * 1.35, y * 1.35, z, 0.045, L(226, 150, 52), 6);
      K.cyl(-0.075, -0.03, -0.36, -0.1, 0.03, 0.022, 7, L(52, 84, 46), true);
      K.box(0.012, 0, -0.085, 0.006, 0.006, 0.085, 0, N);
    },
    // the bag of striped nylon every household had
    beutel(K) {
      const cs = [L(120, 62, 40), L(214, 170, 92), L(70, 96, 78), L(214, 170, 92)];
      for (let i = 0; i < 8; i++) K.box(0, 0, -0.44 + i * 0.042, 0.1, 0.3, 0.042, 0, cs[i % 4], i === 0);
      for (const sy of [-1, 1]) K.box(0, sy * 0.07, -0.105, 0.012, 0.012, 0.105, 0, L(120, 62, 40));
    },
    // a zinc bucket of briquettes
    eimer(K) {
      const Zc = L(150, 154, 156);
      K.lathe(
        0,
        0,
        -0.52,
        [
          [0.0, 0],
          [0.1, 0],
          [0.135, 0.27],
        ],
        10,
        Zc
      );
      K.cyl(0, 0, -0.27, -0.262, 0.13, 0.13, 10, L(26, 22, 20), true);
      for (let i = 0; i < 5; i++)
        K.box(
          (hash(i, 3) - 0.5) * 0.14,
          (hash(i, 5) - 0.5) * 0.14,
          -0.27,
          0.16,
          0.06,
          0.05,
          hash(i, 9) * 3,
          L(30, 25, 22)
        );
      for (const sx of [-1, 1]) stick(K, [sx * 0.13, 0, -0.26], [0, 0, -0.02], 0.004, L(60, 60, 62));
    },
    tasche(K) {
      const Lc = L(96, 58, 34);
      K.box(0, 0, -0.4, 0.09, 0.4, 0.29, 0, Lc, true);
      K.box(0.048, 0, -0.27, 0.006, 0.4, 0.16, 0, L(82, 48, 28));
      for (const sy of [-1, 1]) K.box(0.052, sy * 0.1, -0.2, 0.008, 0.03, 0.03, 0, L(170, 150, 90));
      K.box(0, 0, -0.105, 0.02, 0.13, 0.02, 0, L(60, 36, 22));
      for (const sy of [-1, 1]) K.box(0, sy * 0.06, -0.11, 0.02, 0.02, 0.09, 0, L(60, 36, 22));
    },
    // the milk can for the evening milk
    kanne(K) {
      const A = L(176, 178, 180);
      K.lathe(
        0,
        0,
        -0.42,
        [
          [0.0, 0],
          [0.075, 0],
          [0.078, 0.2],
          [0.05, 0.25],
          [0.055, 0.27],
          [0.0, 0.275],
        ],
        10,
        A
      );
      for (const sx of [-1, 1]) stick(K, [sx * 0.075, 0, -0.2], [0, 0, -0.02], 0.004, L(90, 92, 94));
    },
    // a broom, held before the body, the bristles on the ground
    besen(K) {
      stick(K, [-0.08, 0.02, 0.32], [-0.2, 0.62, -0.84], 0.014, L(150, 118, 76));
      K.box(-0.2, 0.64, -0.92, 0.34, 0.07, 0.1, 0.25, L(96, 66, 40), true);
    },
    schaufel(K) {
      stick(K, [-0.06, 0.0, 0.3], [-0.16, 0.56, -0.7], 0.016, L(150, 118, 76));
      K.box(-0.17, 0.66, -0.86, 0.24, 0.3, 0.02, 0.2, L(70, 72, 76), true);
    },
  };
  const _q = new THREE.Quaternion(),
    _s = new THREE.Vector3();
  function thing(F, kind) {
    const B = F.f.bones && F.f.bones.RightHand;
    if (F.ding) {
      if (F.ding.parent) F.ding.parent.remove(F.ding);
      F.ding = null;
      F.f.after = null;
    }
    if (!B || !DING[kind]) return null;
    const k = 'ding:' + kind;
    if (!geoCache[k]) {
      const K = VPROPS.kit();
      DING[kind](K);
      geoCache[k] = K.geo();
    }
    const m = new THREE.Mesh(geoCache[k], VFIG.mat()),
      g = new THREE.Group();
    m.userData.noMerge = true;
    m.userData.shared = true;
    m.castShadow = false;
    m.frustumCulled = false;
    g.add(m);
    B.add(g);
    // the hand is inside the scaled rig: the thing in metres, hanging straight down, turned as the figure faces, whatever the hand does
    F.f.after = () => {
      B.getWorldScale(_s);
      g.scale.setScalar(1 / Math.max(1e-4, _s.x));
      B.getWorldQuaternion(_q).invert();
      g.quaternion.copy(_q).multiply(F.g.quaternion);
      g.updateMatrixWorld(true);
    };
    F.ding = g;
    F.dingK = kind;
    return g;
  }
  // ------------------------------------------------------------------ people ------------------------------------------------------------------
  // one person of the cast (o: { kleid, hut, haar, bart, brille, ding } to override). Resolves to the figure F, or null when the files are missing.
  async function make(id, o = {}) {
    const c = GLDATA.CAST[id];
    if (!c || !avail(id)) return null;
    try {
      const [gl, set] = await Promise.all([CHL.loadAsync(U(fileOf(c))), clipSet(c.clips)]);
      const f = rbPerson(gl, set, { h: c.h, stoop: c.stoop || 0, idleRate: 0.8 + ((id.charCodeAt(0) * 7) % 10) / 50 });
      f.walker = { talking: false };
      f.g.updateMatrixWorld(true);
      await pixels(f.model, fileOf(c));
      const pick = k => (o[k] === undefined ? c[k] : o[k]),
        kleid = pick('kleid'),
        tex = dress(f.model, GLDATA.KLEID[kleid]),
        hut = pick('hut');
      let hat = null,
        extra = [];
      try {
        const H = hut || pick('haar') || pick('bart') || pick('brille') ? headOf(f.model) : null;
        if (H) {
          hat = hut ? hatOn(f.model, H.head, hut, H) : null;
          extra = kopf(
            f.model,
            {
              haar: hut ? null : pick('haar'),
              bart: pick('bart'),
              brille: pick('brille'),
              farbe: pick('haarC'),
              gestell: c.gestell,
            },
            H
          );
        }
      } catch (e) {
        console.warn('grenzland head', id, e);
      }
      forget(f.model);
      f.g.visible = false;
      f.g.name = 'grenzland ' + id;
      scene.add(f.g);
      const F = {
        id,
        name: c.name,
        c,
        f,
        g: f.g,
        tex,
        hat,
        extra,
        x: 0,
        y: 0,
        z: 0,
        hd: 0,
        v: 0,
        st: 'steht',
        path: null,
        done: null,
        downT: 0,
        tilt: 0,
        stuck: 0,
        pk: null,
        pt: 0,
        r: 28, // how far this one sees (a witness)
        sees: true,
        era: o.era || 'heute',
      };
      F.set = set;
      F.rig = GLPOSE.rig(f.bones || {}, f.model, f.g);
      const dg = pick('ding');
      if (dg) thing(F, dg);
      S.figs.push(F);
      S.loads++;
      return F;
    } catch (e) {
      S.err = id + ': ' + String((e && e.message) || e).slice(0, 140);
      console.warn('grenzland figure', id, e);
      return null;
    }
  }
  function freeObj(o) {
    if (o.userData && o.userData.shared) return;
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'])
        if (m[t]) m[t].dispose();
      m.dispose();
    }
    if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) o.skeleton.dispose();
  }
  function drop(F) {
    if (!F) return;
    const i = S.figs.indexOf(F);
    if (i < 0) return;
    S.figs.splice(i, 1);
    GLPOSE.handy(F, false);
    scene.remove(F.g);
    F.g.traverse(freeObj);
    for (const t of F.tex || []) t.dispose();
    F.gone = true;
    S.drops++;
    markDirty();
  }
  const dropAll = () => {
    for (const F of S.figs.slice()) drop(F);
  };
  function place(F, x, y, hd = 0) {
    F.x = x;
    F.y = y;
    F.z = KERN.ground(x, y);
    if (!Number.isFinite(F.z)) F.z = 0;
    F.hd = hd;
    F.v = 0;
    F.vNow = 0;
    F.renn = false;
    F.st = 'steht';
    F.path = null;
    F.done = null;
    // placed means standing (a seat is taken again by sitz, or by grenzland/gl_mission.js after placing)
    if (F.sitzt) {
      F.sitzt = false;
      if (F.f && 'mode' in F.f) F.f.mode = 'stand';
    }
    F.boden = null;
    F.g.visible = true;
    pose(F);
    markDirty(true);
  }
  function pose(F) {
    F.g.position.set(F.x, F.z + (F.tilt > 0.01 ? 0.12 * F.tilt : 0), -F.y);
    F.g.rotation.set(0, -F.hd, 0);
    if (F.tilt > 0.01) F.g.rotateX(-F.tilt * 1.45);
  }
  // walk to a point, or along points; v in m/s (the walk clip carries up to about 2.2); done() on arrival.
  // Also go(F, x, y, { renn, v, done }) and go(F, pts, { renn, v, done }): renn runs – 4.6 m/s after a short start, the clip set's
  // sprint laid over the walk (grenzland/gl_pose.js); a speed over 2.6 m/s runs as well
  function go(F, pts, v = 1.3, done = null) {
    if (!F) return;
    let o = {};
    if (typeof pts === 'number') {
      pts = [pts, typeof v === 'number' ? v : F.y];
      o = done && typeof done === 'object' ? done : {};
      v = o.v || (o.renn ? 4.6 : 1.3);
      done = o.done || null;
    } else if (v && typeof v === 'object') {
      o = v;
      v = o.v || (o.renn ? 4.6 : 1.3);
      done = o.done || (typeof done === 'function' ? done : null);
    }
    if (!pts || !pts.length) return;
    if (F.sitzt) steh(F, true);
    F.path = (Array.isArray(pts[0]) ? pts : [pts]).map(q => [q[0], q[1]]);
    F.v = v;
    const renn = !!o.renn || v > 2.6;
    if (renn && !F.renn) F.vNow = Math.min(F.vNow || 0, 1.4);
    F.renn = renn;
    F.st = 'geht';
    F.done = done;
    F.stuck = 0;
  }
  function stop(F) {
    F.renn = false;
    F.path = null;
    F.st = F.downT > 0 ? 'liegt' : 'steht';
    F.done = null;
  }
  // knocked down for a while
  function down(F, sec = 6) {
    F.downT = sec;
    F.st = 'liegt';
    F.path = null;
  }
  const face = (F, x, y) => {
    F.hd = Math.atan2(x - F.x, y - F.y);
  };
  // a work pose of npc/npc_real.js while standing ('pick' bending down, 'saw' as sweeping, 'bonnet' over an engine, 'carry'); null: none
  const setPose = (F, k) => {
    if (F) F.pk = k || null;
  };
  const turn = (a, b, k) => {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * Math.min(1, k);
  };
  const _w = [0, 0];
  function step(F, dt) {
    if (F.downT > 0) {
      F.downT -= dt;
      F.tilt += (1 - F.tilt) * Math.min(1, dt * 6);
      if (F.downT <= 0) F.st = 'steht';
    } else if (F.tilt > 0) F.tilt = Math.max(0, F.tilt - dt * 1.4);
    let sp = 0;
    if (F.st === 'geht' && F.path && F.path.length && F.tilt < 0.05) {
      const [tx, ty] = F.path[0],
        dx = tx - F.x,
        dy = ty - F.y,
        d = hyp(dx, dy);
      if (d < Math.max(0.35, F.v * dt * 1.5)) {
        F.path.shift();
        if (!F.path.length) {
          F.st = 'steht';
          const fn = F.done;
          F.done = null;
          if (fn) fn(F);
        }
      } else {
        // running starts with a few quick steps (about 5.5 m/s²); walking is at its speed at once
        const vNow = F.renn ? (F.vNow = Math.min(F.v, (F.vNow || 0) + 5.5 * dt)) : F.v;
        const s = Math.min(d, vNow * dt);
        _w[0] = F.x + (dx / d) * s;
        _w[1] = F.y + (dy / d) * s;
        try {
          KERN.pushOut(_w, 0.28);
        } catch (e) {}
        const moved = hyp(_w[0] - F.x, _w[1] - F.y);
        // pushed aside by a wall: slide along it; no way on: a step to the side
        if (moved < s * 0.25) {
          F.stuck += dt;
          if (F.stuck > 0.6) {
            const a = Math.atan2(dx, dy) + (F.id.length % 2 ? 1.3 : -1.3);
            _w[0] = F.x + Math.sin(a) * F.v * dt * 2;
            _w[1] = F.y + Math.cos(a) * F.v * dt * 2;
            try {
              KERN.pushOut(_w, 0.28);
            } catch (e) {}
          }
        } else F.stuck = Math.max(0, F.stuck - dt);
        if (Number.isFinite(_w[0]) && Number.isFinite(_w[1])) {
          F.hd = turn(F.hd, Math.atan2(_w[0] - F.x, _w[1] - F.y), dt * 7);
          F.x = _w[0];
          F.y = _w[1];
        }
        const z = KERN.ground(F.x, F.y, F.z + 0.6);
        if (Number.isFinite(z)) F.z = z;
        sp = vNow;
      }
    }
    if (!sp && F.vNow) F.vNow = Math.max(0, F.vNow - 9 * dt);
    // seated by somebody else (grenzland/gl_mission.js): where the floor is and how high the seat
    if (F.sitzt && F.boden == null) {
      const gz = KERN.ground(F.x, F.y);
      F.boden = Number.isFinite(gz) ? gz : F.z;
      F.sitzH = F.z + hipOf(F) - SITZ - F.boden;
    }
    pose(F);
    // a work pose while standing (its own clock)
    if (F.pk && F.tilt < 0.05 && (sp === 0 || F.pk === 'carry')) {
      F.pt += dt;
      if (!F.f.pose || F.f.pose.k !== F.pk) F.f.pose = { k: F.pk, t: F.pt };
      else F.f.pose.t = F.pt;
    } else if (F.f.pose) F.f.pose = null;
    // the turns of the last frame back, the clips, then what the clips cannot do (grenzland/gl_pose.js)
    GLPOSE.back(F.rig);
    F.f.anim(dt, sp);
    GLPOSE.nach(F, F.rig, dt, sp);
    return sp;
  }
  function tick(dt) {
    let any = false;
    for (const F of S.figs) {
      if (!F.g.visible) continue;
      const sp = step(F, dt);
      if (sp > 0 || F.tilt > 0 || F.f.walker.talking || F.pk || F.gest || F.look || F.reitet) any = true;
    }
    if (any) markDirty();
  }
  const talking = (F, on) => {
    if (F && F.f.walker) F.f.walker.talking = !!on;
    // seated, the chair pose of npc/npc_real.js gestures when it speaks
    if (F && F.f && 'speak' in F.f) F.f.speak = !!on && !!F.sitzt;
  };
  // ------------------------------------------------------------------ round 2: gestures, looks, seats, the moped ------------------------------------------------------------------
  const SITZ = 0.1; // how far the seat lies under the hip joints of a sitting figure (as grenzland/gl_mission.js)
  const hipOf = F => (F.f && F.f.hipH) || 0.95;
  // a gesture: 'zeigen' (o.ziel: [x, y, z] | a figure | 'spieler'), 'nicken', 'kopf', 'achsel', 'arme' (held), 'winken', 'telefon'
  // (held, a phone at the ear), 'filmen' (held, the phone up in front), 'haende' (held, hands up), 'abwinken'; o.sec: how long (0: held),
  // o.halten: held until geste(F, null). Eased in and out over a quarter second. Returns its length in seconds (0: held).
  function geste(F, art, o) {
    if (!F) return 0;
    if (!art) {
      if (F.gest) F.gest.end = true;
      return 0;
    }
    const A = GLPOSE.ARTEN[art];
    if (!A) return 0;
    o = o || {};
    const sec = o.sec != null ? Math.max(0, +o.sec || 0) : o.halten ? 0 : A.d,
      old = F.gest;
    if (old && old.art !== art && (GLPOSE.ARTEN[old.art] || {}).handy && !A.handy) GLPOSE.handy(F, false);
    F.gest = {
      art,
      t: 0,
      w: old && !old.end ? old.w * (old.art === art ? 1 : 0.4) : 0,
      sec,
      ziel: GLPOSE.ort(o.ziel),
      end: false,
    };
    markDirty();
    return sec;
  }
  // head, neck and chest toward a point (blick(F, x, y, z), z the height in the world – without it eye height over the ground there),
  // toward [x, y, z], a figure (its head, followed), 'spieler'; blick(F, null) looks ahead again
  function blick(F, x, y, z) {
    if (!F) return;
    const o = GLPOSE.ort(x, y, z),
      was = F.look;
    if (!o) {
      if (was) was.end = true;
      return;
    }
    F.look = Object.assign(o, {
      w: was ? was.w : 0,
      yaw: was ? was.yaw : null,
      pitch: was ? was.pitch : null,
      end: false,
    });
    markDirty();
  }
  // sit at (x, y) facing hd on a chair, a bench, a wall: z = the seat's height over the ground (default 0.45 m) – the hips onto it, the
  // feet onto the floor in front (a seat higher than 0.62 m: onto a bar stool's rung)
  function sitz(F, x, y, hd = 0, z = 0.45) {
    if (!F) return;
    place(F, x, y, hd);
    const h = Number.isFinite(z) ? z : 0.45;
    F.boden = F.z;
    F.sitzt = true;
    F.sitzH = h;
    if (F.f && 'mode' in F.f) F.f.mode = 'sit';
    F.z = F.boden + h - hipOf(F) + SITZ;
    pose(F);
  }
  // up again: standing (a small step forward off the seat unless still)
  function steh(F, still = false) {
    if (!F) return;
    const was = F.sitzt;
    F.sitzt = false;
    F.boden = null;
    if (F.f && 'mode' in F.f) F.f.mode = 'stand';
    if (F.f) F.f.speak = false;
    if (was && !still) {
      F.x += Math.sin(F.hd) * 0.32;
      F.y += Math.cos(F.hd) * 0.32;
    }
    const gz = KERN.ground(F.x, F.y);
    if (Number.isFinite(gz)) F.z = gz;
    pose(F);
    markDirty();
  }
  // on a moped of the mode (a car of GLAUTO with form 'moped'): he sits on it as a rider wherever it goes; null: off again, beside it.
  // (grenzland/gl_mission.js has its own riders – F.reitet –, posed the same way; this ties a figure to a moped without the runner)
  function reite(F, c) {
    if (!F) return;
    if (c) {
      F.ritt = c;
      F.reitet = true;
      F.st = 'steht';
      F.path = null;
      F.sitzt = false;
      if (F.f && 'mode' in F.f) F.f.mode = 'sit';
      F.x = c.x;
      F.y = c.y;
      F.g.visible = true;
      markDirty();
      return;
    }
    const m = F.ritt;
    F.ritt = null;
    F.reitet = false;
    if (F.f && 'mode' in F.f) F.f.mode = 'stand';
    if (m && !m.gone) place(F, m.x + Math.cos(m.hd) * 0.8, m.y - Math.sin(m.hd) * 0.8, m.hd);
    else place(F, F.x, F.y, F.hd);
  }
  const near = (x, y, r, era) =>
    S.figs.filter(F => F.g.visible && (!era || F.era === era) && hyp(F.x - x, F.y - y) < r);
  Object.assign(S, {
    avail,
    make,
    drop,
    dropAll,
    place,
    go,
    stop,
    down,
    face,
    tick,
    talking,
    near,
    geste,
    blick,
    sitz,
    steh,
    reite,
    platz: (x, y, r) => GLPOSE.platz(x, y, r),
    dress,
    pixels,
    forget,
    hatOn,
    kopf,
    thing,
    pose: setPose,
    headOf,
    frameOf,
    MUSTER,
    HUTC,
  });
  return S;
})();
window.GLFIG = GLFIG;
