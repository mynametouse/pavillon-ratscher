// ===================== feat/zombie: zombie figures – the villagers and the strangers of Ratscher, turned (ZFIG) =====================
// The people are the Rocketbox figures of the village (dorf/dorf_text.js DTEXT.P: chars/dorf_<key>.json) and of the streets
// (verkehr/verkehr_leute.js VLEUTE.P: chars/vk_*.json), loaded here once more as our own copies (their materials turn grey-green, the
// village keeps its living people) and cloned with SkeletonUtils for every zombie of the same person – geometry, textures and materials
// shared. They move with the player's clip sets (chars/pclips_m.json, pclips_f.json: walk, jog, push, knock, chop, crawl, lie, kneelIdle
// …) and a zombie posture on top (arms forward, the head hanging to one side, hunched, twitching, a limp). Gore: a limb is taken by
// scaling its bone to nothing (the mesh closes at the joint), a red stump on the joint, the piece flies (zombie/z_fx.js); without legs
// they crawl, without a head they fall. Skin, dirt and blood are painted into the person's own textures (zombify).
import * as THREE from 'three';
import { clone as skelClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BASE, cam, COARSE, QS, scene, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { canonBone, decodeClip } from '../core/rig.js';
import { boneTurn, CHL, prepModel } from '../npc/npc_real.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { VLEUTE } from '../verkehr/verkehr_leute.js';
import { ZFX } from './z_fx.js';
export const ZFIG = (() => {
  const CH = window.CHARMAN || {},
    PM = window.PLAYERMAN || {};
  const U = f => BASE + 'chars/' + f;
  const S = { protos: {}, loading: {}, clips: {}, live: new Set(), loads: 0, err: null };
  // who can turn: the villagers first (they are the ones who live here), then the strangers of the streets
  const WHO = (() => {
    const out = [];
    for (const [k, p] of Object.entries(DTEXT.P || {}))
      out.push({
        key: k,
        name: p.name,
        fig: p.fig,
        clips: p.clips || 'm',
        h: p.h || 1.75,
        stoop: p.stoop || 0,
        src: 'dorf',
      });
    // the player figures (for the other player of zombie/z_netz.js) – never zombies
    for (const [k, f, c, n, h] of [
      ['spieler_m', PM.player_m, 'm', 'Falko', 1.8],
      ['spieler_f', PM.player_f, 'f', 'Sarah', 1.68],
      ['spieler_c', PM.player_c || PM.player_m, 'm', 'Christoph', 1.78],
    ])
      if (f) out.push({ key: k, name: n, file: f, clips: c, h, stoop: 0, src: 'spieler' });
    for (const [k, p] of Object.entries((VLEUTE && VLEUTE.P) || {}))
      out.push({
        key: k,
        name: p.name,
        fig: p.fig,
        clips: p.clips || (p.g === 'f' ? 'f' : 'm'),
        h: p.h || 1.72,
        stoop: p.stoop || 0,
        src: 'vk',
      });
    return out;
  })();
  const byKey = Object.fromEntries(WHO.map(w => [w.key, w]));
  const avail = k => !QS.get('lowfig') && !!PM.pclips_m && !!((byKey[k] || {}).file || CH[(byKey[k] || {}).fig]);
  const people = () => WHO.filter(w => w.src !== 'spieler' && avail(w.key)).map(w => w.key);
  function clipSet(k) {
    if (S.clips[k]) return S.clips[k];
    const FL = new THREE.FileLoader();
    FL.setResponseType('json');
    return (S.clips[k] = FL.loadAsync(U(k === 'f' && PM.pclips_f ? PM.pclips_f : PM.pclips_m)).catch(e => {
      delete S.clips[k];
      throw e;
    }));
  }
  // ---- the turned look, painted into the person's own textures (once per person, every clone shares it): grey-green mottled skin,
  //      dull dirty clothes, dark blood where it would be – run down from the mouth over the chest, on the hands, the knees. Where that
  //      is comes from the bind pose (the vertices of the chin, the chest, the fingers), painted at their texture coordinates; runs follow
  //      the surface downwards. The painted copy is at most 1024 px (512 on the phone) – less memory than the original. ----
  const TINT = new THREE.Color(0.66, 0.72, 0.6);
  const _bp = new THREE.Vector3();
  function zombify(model) {
    model.updateMatrixWorld(true);
    const mats = new Map(); // material → { verts: [x, y, z, u, v, …], mesh }
    const box = new THREE.Box3();
    model.traverse(x => {
      if (!x.isMesh || !x.geometry || !x.geometry.attributes.position) return;
      const ua = x.geometry.attributes.uv,
        n = x.geometry.attributes.position.count,
        step = Math.max(1, Math.floor(n / 5000));
      const list = Array.isArray(x.material) ? x.material : [x.material];
      // (a multi-material mesh: its groups decide which vertex belongs to which material)
      const groups = x.geometry.groups && x.geometry.groups.length && list.length > 1 ? x.geometry.groups : null;
      const idx = x.geometry.index;
      const matOf = new Int8Array(n).fill(groups ? -1 : 0);
      if (groups)
        for (const gr of groups)
          for (let i = gr.start; i < gr.start + gr.count; i++) matOf[idx ? idx.getX(i) : i] = gr.materialIndex;
      for (let i = 0; i < n; i += step) {
        if (x.isSkinnedMesh) x.getVertexPosition(i, _bp);
        else _bp.fromBufferAttribute(x.geometry.attributes.position, i);
        _bp.applyMatrix4(x.matrixWorld);
        box.expandByPoint(_bp);
        const m = list[Math.max(0, matOf[i])];
        if (!m || !ua) continue;
        if (!mats.has(m)) mats.set(m, { verts: [] });
        mats.get(m).verts.push(_bp.x, _bp.y, _bp.z, ua.getX(i), ua.getY(i));
      }
    });
    const H = Math.max(0.5, box.max.y - box.min.y),
      y0 = box.min.y,
      cx = (box.min.x + box.max.x) / 2,
      cz = (box.min.z + box.max.z) / 2;
    let maxX = 0;
    for (const { verts } of mats.values())
      for (let i = 0; i < verts.length; i += 5) maxX = Math.max(maxX, Math.abs(verts[i] - cx));
    const MAX = COARSE ? 512 : 1024,
      painted = new Map();
    for (const [m, info] of mats) {
      if (!m.map || !m.map.image || !(m.map.image.width > 8)) {
        if (m.color) m.color.multiply(TINT);
        continue;
      }
      let t = painted.get(m.map);
      if (!t) {
        try {
          t = paintTex(m.map, info.verts, { H, y0, cx, cz, maxX, MAX });
        } catch (e) {
          console.warn('zombie paint', e);
          t = null;
        }
        painted.set(m.map, t || m.map);
        t = t || m.map;
      }
      if (t === m.map && m.color) m.color.multiply(TINT);
      m.map = t;
      m.roughness = Math.min(1, (m.roughness || 0.6) + 0.1);
      m.envMapIntensity = 0.6;
      m.needsUpdate = true;
    }
  }
  // one texture: the colours turned, then the blood (the vertices of this texture tell where)
  function paintTex(tex, verts, B) {
    const img = tex.image,
      k = Math.min(1, B.MAX / Math.max(img.width, img.height)),
      W = Math.max(8, Math.round(img.width * k)),
      Hh = Math.max(8, Math.round(img.height * k));
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = Hh;
    const cx2 = cv.getContext('2d', { willReadFrequently: true });
    cx2.drawImage(img, 0, 0, W, Hh);
    // the share of this texture above the shoulders: a head texture (the face fills it) or the body's
    let hs = 0,
      nv = 0;
    for (let i = 0; i < verts.length; i += 5) {
      nv++;
      if ((verts[i + 1] - B.y0) / B.H > 0.83) hs++;
    }
    const head = nv && hs / nv > 0.7;
    // colours: warm skin → grey-green, mottled; the rest dull and darker
    const d = cx2.getImageData(0, 0, W, Hh),
      p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i],
        g = p[i + 1],
        b = p[i + 2],
        l = 0.3 * r + 0.59 * g + 0.11 * b;
      const skin = r > 55 && r >= g && g >= b * 0.9 && r - b > 18 && r - b < 130 && g > r * 0.48;
      if (skin) {
        const n = (((i * 2654435761) >>> 0) % 23) - 11; // a fixed grain: mottled, not noisy over time
        const k2 = 0.88;
        p[i] = r + (l * 0.74 + 6 + n - r) * k2;
        p[i + 1] = g + (l * 0.84 + 12 + n - g) * k2;
        p[i + 2] = b + (l * 0.66 + 4 + n * 0.6 - b) * k2;
      } else {
        const k2 = head ? 0.55 : 0.4;
        p[i] = (r + (l - r) * k2) * 0.86 + 4;
        p[i + 1] = (g + (l - g) * k2) * 0.86 + 5;
        p[i + 2] = (b + (l - b) * k2) * 0.8;
      }
    }
    cx2.putImageData(d, 0, 0);
    // the blood: regions of the bind pose → their texture coordinates
    const reg = [];
    const pick = test => {
      const out = [];
      for (let i = 0; i < verts.length; i += 5) {
        const x = verts[i] - B.cx,
          h = (verts[i + 1] - B.y0) / B.H,
          z = verts[i + 2] - B.cz;
        if (test(x, h, z)) out.push(i);
      }
      return out;
    };
    const chin = pick((x, h, z) => h > 0.855 && h < 0.905 && Math.abs(x) < 0.035 * B.H && z > 0.02 * B.H),
      chest = pick((x, h, z) => h > 0.6 && h < 0.79 && Math.abs(x) < 0.11 * B.H && z > 0.015 * B.H),
      hands = pick(x => Math.abs(x) > 0.86 * B.maxX),
      knees = pick((x, h, z) => h > 0.25 && h < 0.31 && z > 0.01 * B.H),
      belly = pick((x, h, z) => h > 0.52 && h < 0.62 && Math.abs(x) < 0.12 * B.H && z > 0.01 * B.H);
    const rnd = Math.random,
      any = a => a[Math.floor(rnd() * a.length)];
    if (chin.length) for (let j = 0; j < 3; j++) reg.push([any(chin), head ? 0.035 : 0.012, 0.95, 0.09]);
    if (chest.length) for (let j = 0; j < 2 + Math.floor(rnd() * 3); j++) reg.push([any(chest), 0.03, 0.85, 0.16]);
    if (belly.length && rnd() < 0.6) reg.push([any(belly), 0.026, 0.8, 0.1]);
    if (hands.length) for (let j = 0; j < 3; j++) reg.push([any(hands), 0.012, 0.9, 0]);
    if (knees.length && rnd() < 0.7) reg.push([any(knees), 0.02, 0.75, 0.05]);
    const blot = (i, r, a) => {
      let u = verts[i + 3],
        v = verts[i + 4];
      u -= Math.floor(u);
      v -= Math.floor(v);
      const X = u * W,
        Y = v * Hh,
        R = r * W;
      cx2.globalAlpha = a;
      cx2.beginPath();
      for (let q = 0; q < 6; q++) {
        const rr = R * (0.35 + rnd() * 0.65),
          ox = (rnd() - 0.5) * R * 1.1,
          oy = (rnd() - 0.5) * R * 1.1;
        cx2.moveTo(X + ox + rr, Y + oy);
        cx2.arc(X + ox, Y + oy, rr, 0, 6.2832);
      }
      cx2.fill();
      // spatter around it
      for (let q = 0; q < 7; q++) {
        const a2 = rnd() * 6.2832,
          d2 = R * (1.1 + rnd() * 1.6),
          rr = R * (0.05 + rnd() * 0.12);
        cx2.beginPath();
        cx2.arc(X + Math.cos(a2) * d2, Y + Math.sin(a2) * d2, rr, 0, 6.2832);
        cx2.fill();
      }
    };
    // a run down the body from (i): the vertices just below it on the surface
    const run = (i, len, r) => {
      const x0 = verts[i],
        y0 = verts[i + 1],
        z0 = verts[i + 2],
        wob = (rnd() - 0.5) * 0.012 * B.H;
      for (let j = 0; j < verts.length; j += 5) {
        const dy = y0 - verts[j + 1];
        if (dy < 0.004 * B.H || dy > len * B.H) continue;
        if (
          Math.abs(verts[j] - x0 - wob * (dy / (len * B.H))) > 0.012 * B.H ||
          Math.abs(verts[j + 2] - z0) > 0.05 * B.H
        )
          continue;
        const f = 1 - dy / (len * B.H);
        if (rnd() < 0.7) blot(j, r * (0.25 + 0.4 * f), 0.75 * f + 0.2);
      }
    };
    for (const [i, r, a, len] of reg) {
      cx2.globalCompositeOperation = 'multiply';
      cx2.fillStyle = 'rgb(150,28,22)';
      blot(i, r, a);
      if (len) run(i, len, r);
      cx2.globalCompositeOperation = 'source-over';
      cx2.fillStyle = 'rgb(62,5,4)';
      blot(i, r * 0.55, a * 0.55);
    }
    cx2.globalAlpha = 1;
    const t = tex.clone();
    t.source = new THREE.Source(cv);
    t.needsUpdate = true;
    return t;
  }
  let BLOOD = null;
  const bloodMat = () => BLOOD || (BLOOD = plain({ color: 0x3e0606, roughness: 0.3 }));
  // ---- one person, loaded once ----
  // (alive: the same person not turned – a survivor of zombie/z_bund.js – its own copy with the materials as they are)
  async function proto(key, alive = false) {
    const ck = alive ? key + ':alive' : key;
    if (S.protos[ck]) return S.protos[ck];
    if (S.loading[ck]) return S.loading[ck];
    const w = byKey[key];
    if (!w || !avail(key)) throw new Error('no figure for ' + key);
    S.loading[ck] = (async () => {
      const [gl, set] = await Promise.all([CHL.loadAsync(U(w.file || CH[w.fig])), clipSet(w.clips)]);
      const model = gl.scene;
      prepModel(model, w.h);
      if (!alive) zombify(model);
      const clips = {};
      for (const k of [
        'idle',
        'walk',
        'jog',
        'push',
        'knock',
        'chop',
        'crawl',
        'lie',
        'kneelIdle',
        'crouchIdle',
        'jumpLand',
      ])
        if (set.clips && set.clips[k]) clips[k] = decodeClip(set.clips[k]);
      const s = model.scale.x;
      const P = {
        key,
        alive,
        w,
        model,
        clips,
        walkSp: ((set.clips.walk && set.clips.walk.speed) || 1.1) * 1,
        jogSp: ((set.clips.jog && set.clips.jog.speed) || 2.4) * 1,
        crawlSp: ((set.clips.crawl && set.clips.crawl.speed) || 0.35) * 1,
        s,
      };
      S.protos[ck] = P;
      S.loads++;
      delete S.loading[ck];
      return P;
    })().catch(e => {
      delete S.loading[ck];
      S.err = key + ': ' + String((e && e.message) || e).slice(0, 120);
      throw e;
    });
    return S.loading[ck];
  }
  const _v = new THREE.Vector3(),
    _v2 = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _q2 = new THREE.Quaternion();
  const CUTS = {
    kopf: { bone: 'Head', gib: 'head', drop: 'dead' },
    armL: { bone: 'LeftForeArm', gib: 'arm' },
    armR: { bone: 'RightForeArm', gib: 'arm' },
    beinL: { bone: 'LeftLeg', gib: 'leg', drop: 'crawl' },
    beinR: { bone: 'RightLeg', gib: 'leg', drop: 'crawl' },
  };
  // ---- one zombie figure ----
  async function make(key, o = {}) {
    const P = await proto(key, !!o.alive);
    const model = skelClone(P.model),
      g = new THREE.Group(),
      inner = new THREE.Group();
    inner.rotation.y = Math.PI; // models face +z; figures walk along local −z (as npc/npc_real.js)
    g.add(inner);
    inner.add(model);
    model.traverse(x => {
      if (x.isMesh) {
        x.castShadow = false;
        x.receiveShadow = true;
        x.userData.noMerge = true;
        x.frustumCulled = true;
      }
    });
    const B = {};
    model.traverse(x => {
      if (x.isBone) {
        const c = canonBone(x.name);
        if (c && !B[c]) B[c] = x;
      }
    });
    const mixer = new THREE.AnimationMixer(model),
      A = {},
      W = {};
    for (const [k, c] of Object.entries(P.clips)) {
      const a = mixer.clipAction(c);
      a.play();
      a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      a.time = Math.random() * c.duration;
      A[k] = a;
      W[k] = k === 'idle' ? 1 : 0;
    }
    for (const k of ['push', 'chop', 'jumpLand']) if (A[k]) A[k].setLoop(THREE.LoopRepeat);
    // (the blood is in the textures – zombify; here only the stumps of cut limbs, carried by the bones)
    g.updateMatrixWorld(true);
    mixer.update(0);
    model.updateMatrixWorld(true);
    const smears = [];
    const r = Math.random;
    g.visible = false;
    scene.add(g);
    // the zombie's own manner: how it hangs its head, how fast it twitches, which leg drags
    const M = {
      tilt: (r() - 0.5) * 0.7,
      hunch: 0.15 + r() * 0.3,
      arms: 0.55 + r() * 0.6, // how far the arms come up when it comes for you
      twitch: 0.5 + r() * 1.5,
      limp: r() < 0.5 ? (r() < 0.5 ? 1 : -1) : 0,
      jaw: r(),
    };
    let acc = 0,
      t = r() * 10,
      oneShot = null;
    const sv = new Map();
    const F = {
      key,
      alive: !!o.alive,
      name: P.w.name,
      src: P.w.src,
      g,
      model,
      bones: B,
      mixer,
      cuts: {},
      M,
      mode: 'idle', // idle, walk, chase, attack, bang, eat, crawl, dead, turn, stagger
      speed: 0,
      turnK: 0, // 0 … 1 while turning (the siren): kneeling, convulsing, rising
      // a one-shot movement (attack, a blow on a door): its clip plays once over dur seconds
      play(k, dur) {
        const a = A[k];
        if (!a) return 0;
        a.reset();
        a.timeScale = a.getClip().duration / Math.max(0.2, dur);
        a.play();
        oneShot = { k, t: 0, dur };
        return dur;
      },
      // per frame: the clip weights for the mode, one mixer step, the posture on top
      anim(dt, near) {
        acc += dt;
        t += dt;
        if (!g.visible || !near) return;
        let want = 'idle';
        const m = F.mode,
          sp = F.speed;
        if (m === 'dead') want = A.lie ? 'lie' : 'idle';
        else if (m === 'crawl') want = A.crawl ? 'crawl' : 'lie';
        else if (m === 'eat') want = A.kneelIdle ? 'kneelIdle' : 'crouchIdle';
        else if (m === 'turn') want = F.turnK < 0.75 ? (A.kneelIdle ? 'kneelIdle' : 'crouchIdle') : 'idle';
        else if (m === 'bang') want = A.knock ? 'knock' : 'push';
        else if (sp > 1.3 && A.jog) want = 'jog';
        else if (sp > 0.05) want = 'walk';
        if (oneShot) {
          oneShot.t += dt;
          if (oneShot.t >= oneShot.dur) oneShot = null;
          else want = oneShot.k;
        }
        const k = Math.min(1, dt * (oneShot ? 12 : 6));
        let sum = 0;
        for (const n in A) {
          W[n] += ((n === want ? 1 : 0) - W[n]) * k;
          if (W[n] < 1e-3 && n !== want) W[n] = 0;
          sum += W[n];
        }
        for (const n in A) A[n].setEffectiveWeight(sum > 0 ? W[n] / sum : 0);
        if (A.walk)
          A.walk.timeScale =
            THREE.MathUtils.clamp(sp / P.walkSp, 0.35, 1.4) * (1 + 0.25 * Math.sin(t * 2.1) * (M.limp ? 1 : 0));
        if (A.jog) A.jog.timeScale = THREE.MathUtils.clamp(sp / P.jogSp, 0.5, 1.3);
        if (A.crawl) A.crawl.timeScale = m === 'crawl' ? THREE.MathUtils.clamp(sp / P.crawlSp, 0.3, 1.6) : 1;
        for (const [b, q] of sv) b.quaternion.copy(q);
        sv.clear();
        mixer.update(acc);
        acc = 0;
        model.updateMatrixWorld(true);
        if (m === 'dead' || F.alive) return;
        model.getWorldQuaternion(_q).invert();
        const Q = _q,
          tw = Math.sin(t * 7.3 * M.twitch) * Math.sin(t * 3.1) * 0.08,
          chase = m === 'chase' || m === 'walk' ? 1 : 0;
        if (m === 'turn') {
          // convulsing: the back jerks, the head is thrown about
          const c = (1 - Math.abs(F.turnK * 2 - 1)) * 1.2;
          boneTurn(sv, Q, B.Spine1 || B.Spine, 1, 0, 0, Math.sin(t * 17) * 0.25 * c);
          boneTurn(sv, Q, B.Head, 0, 0, 1, Math.sin(t * 11) * 0.5 * c);
          boneTurn(sv, Q, B.Neck, 1, 0, 0, Math.sin(t * 13) * 0.3 * c);
          return;
        }
        if (m !== 'crawl' && m !== 'eat') {
          boneTurn(sv, Q, B.Spine1 || B.Spine, 1, 0, 0, M.hunch + P.w.stoop);
          if (!oneShot && m !== 'bang') {
            const up = (m === 'idle' ? 0.25 : 1) * M.arms;
            for (const sd of ['Left', 'Right']) {
              if (F.cuts['arm' + sd[0]]) continue;
              boneTurn(sv, Q, B[sd + 'Arm'], 1, 0, 0, -1.25 * up + tw);
              boneTurn(sv, Q, B[sd + 'Arm'], 0, 1, 0, (sd === 'Left' ? -1 : 1) * 0.25 * up);
              boneTurn(sv, Q, B[sd + 'ForeArm'], 1, 0, 0, -0.25 * up - chase * 0.1);
            }
          }
        }
        if (!F.cuts.kopf) {
          boneTurn(sv, Q, B.Neck, 1, 0, 0, 0.18 + tw * 0.5);
          boneTurn(sv, Q, B.Head, 0, 0, 1, M.tilt + tw);
          if (B.Jaw) boneTurn(sv, Q, B.Jaw, 1, 0, 0, 0.2 + 0.15 * Math.sin(t * 5 * M.jaw));
        }
      },
      // where the head is (site coordinates), for hits and the camera
      head() {
        const b = B.Head || B.Neck;
        if (!b || F.cuts.kopf) {
          g.getWorldPosition(_v);
          return [_v.x, -_v.z, _v.y + 1.45];
        }
        b.getWorldPosition(_v);
        return [_v.x, -_v.z, _v.y];
      },
      bonePos(name) {
        const b = B[name];
        if (!b) return null;
        b.getWorldPosition(_v);
        return [_v.x, -_v.z, _v.y];
      },
      // take a part: kopf, armL, armR, beinL, beinR – the piece flies off in the direction (dx, dy)
      cut(part, dx = 0, dy = 0) {
        const C = CUTS[part],
          b = C && B[C.bone];
        if (!b || F.cuts[part]) return null;
        F.cuts[part] = true;
        b.getWorldPosition(_v);
        const p = [_v.x, -_v.z, _v.y];
        b.scale.setScalar(0.001);
        // the stump: a red cap at the joint, in metres (the rig is scaled)
        const st = new THREE.Mesh(STUMP(), bloodMat());
        b.parent.getWorldScale(_v2);
        st.scale.setScalar(1 / Math.max(1e-4, _v2.x));
        st.position.copy(b.position);
        st.userData.noMerge = true;
        b.parent.add(st);
        smears.push(st);
        const L = Math.hypot(dx, dy) || 1;
        ZFX.gib(
          C.gib,
          p[0],
          p[1],
          p[2],
          (dx / L) * (1.5 + Math.random() * 2),
          (dy / L) * (1.5 + Math.random() * 2),
          2 + Math.random() * 2.5
        );
        ZFX.spray(p[0], p[1], p[2], dx, dy, 26, 2.8, 2);
        ZFX.fountain(
          () => {
            if (!F.g.parent) return null;
            b.parent.getWorldPosition(_v);
            return [_v.x, -_v.z, _v.y];
          },
          part === 'kopf' ? 2.6 : 1.4,
          part === 'kopf' ? 1.3 : 0.8
        );
        markDirty();
        return C.drop || null;
      },
      dispose() {
        scene.remove(g);
        for (const s of smears) if (s.parent) s.parent.remove(s);
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        g.traverse(x => {
          if (x.isSkinnedMesh && x.skeleton && x.skeleton.boneTexture) x.skeleton.dispose();
        });
        S.live.delete(F);
      },
    };
    S.live.add(F);
    return F;
  }
  let _stump = null;
  const STUMP = () => _stump || (_stump = new THREE.SphereGeometry(0.055, 8, 6));
  // put a figure at (x, y, z) facing hd (compass degrees)
  function place(F, x, y, z, hd) {
    F.g.position.copy(V(x, y, z));
    F.g.rotation.y = (-hd * Math.PI) / 180;
    F.g.visible = true;
  }
  // the camera's distance to a figure (pose updates only near)
  function camD2(F) {
    F.g.getWorldPosition(_v);
    return _v.distanceToSquared(cam.position);
  }
  // everything back (leaving the zombie night): the clones, then the loaded people
  function disposeAll() {
    for (const F of [...S.live]) F.dispose();
    for (const P of Object.values(S.protos))
      P.model.traverse(x => {
        if (x.geometry) x.geometry.dispose();
        for (const m of Array.isArray(x.material) ? x.material : x.material ? [x.material] : []) {
          for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'])
            if (m[k]) m[k].dispose();
          m.dispose();
        }
      });
    S.protos = {};
    markDirty(true);
  }
  // how many different people may be loaded at once (memory: the phone keeps fewer and clones more)
  const maxPeople = () => (COARSE ? 5 : 10);
  Object.assign(S, { WHO, byKey, avail, people, proto, make, place, camD2, disposeAll, maxPeople, CUTS });
  return S;
})();
window.ZFIG = ZFIG;
