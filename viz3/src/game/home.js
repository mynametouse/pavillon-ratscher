// ===================== V14 home: light switches, the stove's fire, sitting and lying on chairs, benches, the daybed and the loungers =====================
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { OFFLINE, QS } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { itemTheta, phase, PHN } from '../core/geo.js';
import { MAT } from '../core/mats.js';
import { glowMat } from '../pavilion/interior.js';
import { RENDER } from '../render/render.js';
import { MODE, MODES } from '../render/modes.js';
import { G, P, PHASE } from './walkable.js';
import { ITEMS } from '../pavilion/plan.js';
import { PLAY, SFX } from './play.js';
phase(null);
window.TICKS = window.TICKS || []; // per-frame callbacks (12_game frame loop), also outside the walk view
// ---- lights: the paper lamps can be switched per floor (pull the lamp's cord); a new time of day sets them back to automatic ----
export const LIGHTSTATE = (() => {
  const SW = { eg: null, og: null },
    ON = [24, 18, 14, 26, 10, 12, 9],
    GRP = { eg: [0, 5], og: [2, 3, 4, 6] };
  function apply() {
    const M = MODES[MODE],
      L = window.LIGHTS;
    if (!M || !L) return;
    for (const g of ['eg', 'og'])
      for (const i of GRP[g]) L[i].intensity = SW[g] === null ? M.L[i] : SW[g] ? Math.max(M.L[i], ON[i]) : 0;
    MAT.paper.emissiveIntensity = SW.eg === null ? M.paper : SW.eg ? Math.max(M.paper, 1.3) : 0;
    MAT.paperOG.emissiveIntensity = SW.og === null ? M.paper : SW.og ? Math.max(M.paper, 1.3) : 0;
    if (window.STOVE) STOVE.apply();
    markDirty(true);
  }
  const isOn = g => (SW[g] === null ? window.LIGHTS && LIGHTS[GRP[g][0] === 0 ? 0 : 3].intensity > 2 : SW[g]);
  function toggle(g) {
    SW[g] = !isOn(g);
    apply();
    SFX.click();
  }
  const inEG = () => P.x > 0 && P.x < 4 && P.y > 0 && P.y < 4 && P.feet < G.zE - 0.3,
    inOG = () => P.feet > G.zE && P.feet < G.zC && P.x > G.OG.x0 && P.x < G.OG.x1 && P.y > G.OG.y0 && P.y < G.OG.y1;
  const lit = () => PHASE >= PHN.builtins;
  PLAY.act({
    id: 'light:eg',
    r: 1.35,
    prio: -0.2,
    label: () => (lit() && inEG() ? (isOn('eg') ? 'Licht aus' : 'Licht an') : null),
    pos: () => [1.95, 2.0, G.zF + 1.3],
    run: () => toggle('eg'),
  });
  for (const [x, y] of [
    [1.7, 2.1],
    [0.15, 2.0],
  ])
    PLAY.act({
      id: 'light:og' + x,
      r: 1.3,
      prio: -0.2,
      label: () => (lit() && inOG() ? (isOn('og') ? 'Licht aus' : 'Licht an') : null),
      pos: () => [x, y, G.zO + 1.3],
      run: () => toggle('og'),
    });
  return {
    apply,
    toggle,
    reset() {
      SW.eg = SW.og = null;
      apply();
    },
    isOn,
    SW,
    lampNear: (x, y, feet) =>
      (feet < G.zE && window.LIGHTS && LIGHTS[0].intensity > 3) ||
      (feet >= G.zE && window.LIGHTS && LIGHTS[3].intensity > 3),
  };
})();
LATE.LIGHTSTATE = LIGHTSTATE;
window.LIGHTSTATE = LIGHTSTATE;
// ---- the wood stove: cold until it is lit (quest "Feuer im Ofen"); then flames behind the glass, flickering light, crackling ----
export const STOVE = (() => {
  const st = { lit: false, k: 0, t: 0, on: !OFFLINE && !QS.get('noplay'), acc: 0 };
  const fireMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    toneMapped: false,
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uK; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
      void main() {
        vec2 uv = vUv; float t = uT;
        // two logs lying across the grate, glowing at their edges
        float l1 = abs(uv.y - 0.20 - 0.03 * sin(uv.x * 5.0)) - 0.055, l2 = abs(uv.y - 0.31 + 0.25 * (uv.x - 0.5)) - 0.045;
        float logs = smoothstep(0.012, -0.005, min(l1, l2) * step(0.12, uv.x) * step(uv.x, 0.88) + (1.0 - step(0.12, uv.x) * step(uv.x, 0.88)) * 0.1);
        // flames: noise rising, a body that narrows upwards
        vec2 q = vec2(uv.x * 3.2, uv.y * 2.4 - t * 1.7); float f = fbm(q) + 0.5 * fbm(q * 2.1 + vec2(0.0, -t * 0.9));
        float body = 1.0 - (uv.y - 0.12) * 1.35 - pow(abs(uv.x - 0.5) * 1.9, 1.6);
        float fl = smoothstep(0.05, 0.75, body + (f - 0.75) * 1.25) * smoothstep(0.08, 0.2, uv.y);
        float bed = smoothstep(0.26, 0.04, uv.y) * (0.55 + 0.45 * n(vec2(uv.x * 16.0, t * 0.7))) * smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);
        float v = max(fl, bed * 0.85);
        vec3 col = mix(vec3(0.35, 0.03, 0.0), vec3(1.0, 0.36, 0.04), smoothstep(0.08, 0.55, v)); col = mix(col, vec3(1.0, 0.78, 0.38), smoothstep(0.62, 1.0, v));
        vec3 c = col * v * 1.7 * uK;
        float edge = smoothstep(0.03, 0.0, abs(min(l1, l2))) * (0.6 + 0.4 * n(vec2(uv.x * 22.0, t * 2.0)));
        c = mix(c, vec3(0.04, 0.02, 0.012) + vec3(1.3, 0.32, 0.05) * edge * uK, logs * (1.0 - smoothstep(0.55, 0.9, fl) * 0.6));
        gl_FragColor = vec4(c + vec3(0.012, 0.008, 0.006), 1.0); }`,
  });
  const L2 = () => window.LIGHTS && LIGHTS[1];
  function apply() {
    if (!st.on) return;
    const g = window.stoveGlow,
      M = MODES[MODE];
    if (!g || !M) return;
    if (st.k > 0.002) {
      g.material = fireMat;
      fireMat.uniforms.uK.value = st.k;
    } else {
      g.material = glowMat;
      glowMat.color.set(0x0c0907);
    }
    const l = L2();
    if (l)
      l.intensity =
        st.k > 0.002
          ? Math.max(M.L[1], 3.5) * st.k * (0.84 + 0.16 * Math.sin(st.t * 13.1) * Math.sin(st.t * 7.3 + 1.2))
          : 0;
  }
  function light(now) {
    if (!st.on) return;
    st.lit = true;
    if (now) st.k = 1;
    apply();
    markDirty(true);
  }
  function tick(dt) {
    if (!st.on) return;
    st.t += dt;
    const want = st.lit ? 1 : 0;
    if (Math.abs(st.k - want) > 1e-3) {
      st.k += Math.sign(want - st.k) * Math.min(Math.abs(want - st.k), dt / 4.5);
    }
    if (st.k <= 0.002) return;
    fireMat.uniforms.uT.value = st.t;
    fireMat.uniforms.uK.value = st.k;
    const near = Math.hypot(P.x - G.STV[0], P.y - G.STV[1]) < 13 || P.mode !== 'walk';
    st.acc += dt;
    if (near && PHASE >= PHN.stove && st.acc > (RENDER.hq ? 1 / 24 : 1 / 14)) {
      st.acc = 0;
      apply();
      markDirty();
    }
  }
  window.TICKS.push(tick);
  apply();
  return {
    apply,
    light,
    put() {
      st.lit = false;
      st.k = 0;
      apply();
    },
    level: () => (st.on ? st.k : MODE !== 'day' ? 1 : 0),
    get lit() {
      return st.lit;
    },
    get on() {
      return st.on;
    },
  };
})();
LATE.STOVE = STOVE;
window.STOVE = STOVE;
// ---- sitting and lying: chairs, armchairs, benches, stools and the stump (models); window seat, daybed, terrace loungers (built in); Günter's bench ----
const SEATS = (() => {
  const T = {
    armchair: { sh: 0.43, back: 0.12, label: 'In den Sessel setzen' },
    lounge_chair: { sh: 0.43, back: 0.12, label: 'In den Sessel setzen' },
    desk_chair: { sh: 0.47, back: 0.05, label: 'Hinsetzen' },
    bench_out: { sh: 0.45, back: 0.06, label: 'Auf die Bank setzen' },
    stump: { sh: null, back: 0, label: 'Auf den Baumstumpf setzen' },
    wstool: { sh: null, back: 0, label: 'Auf den Hocker setzen' },
    footstool: { sh: null, back: 0, label: 'Auf den Hocker setzen' },
  };
  // built-in pieces: pose in the piece's original frame (absolute coordinates at build time), eye height above the piece's base
  const GRP = {
    windowseat: [
      { x: 0.52, y: 1.84, eye: 0.72 + 0.78, yaw: 90, pitch: -2, kind: 'sit', label: 'Auf die Fensterbank setzen' },
    ],
    daybed: [{ x: 0.62, y: 0.82, eye: 0.71 + 0.22, yaw: 90, pitch: 6, kind: 'lie', label: 'Hinlegen', back: 0.9 }],
    lounger1: [{ lounger: 1.0, label: 'Auf die Liege legen' }],
    lounger2: [{ lounger: 2.05, label: 'Auf die Liege legen' }],
  };
  const shown = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  const deg = r => (r * 180) / Math.PI;
  const made = new Set();
  function glbPose(it, t) {
    const th = itemTheta(it),
      fx = Math.sin(th),
      fy = -Math.cos(th),
      sh = t.sh ?? (it.size ? it.size[1] : 0.45);
    return {
      x: it.x - fx * t.back,
      y: it.y - fy * t.back,
      eye: it.z + sh + 0.78,
      yaw: 180 - deg(th),
      pitch: -4,
      kind: 'sit',
    };
  }
  function grpPose(it, q) {
    const o = it.orig || it,
      d = (-(it.rot || 0) * Math.PI) / 180,
      c = Math.cos(d),
      s = Math.sin(d); // grp items turn about their base centre by -rot (CCW)
    let lx,
      ly,
      eye,
      yaw,
      pitch,
      kind = q.kind || 'sit';
    if (q.lounger != null) {
      lx = 1.15;
      ly = q.lounger;
      eye = 0.95;
      yaw = -90;
      pitch = -6;
      kind = 'lie';
      lx = lx - o.x;
      ly = ly - o.y;
      return mk();
    }
    lx = q.x - o.x;
    ly = q.y - o.y;
    eye = q.eye - (o.z ?? 0);
    yaw = q.yaw;
    pitch = q.pitch;
    return mk();
    function mk() {
      return { x: it.x + lx * c - ly * s, y: it.y + lx * s + ly * c, eye: it.z + eye, yaw: yaw - deg(d), pitch, kind };
    }
  }
  function seatAct(it, poseFn, label, back) {
    PLAY.act({
      id: 'seat:' + it.key + ':' + label,
      r: 1.25,
      prio: -0.15,
      obj: () => it.root,
      label: () =>
        !PLAY.seat && it.root && !it.removed && shown(it.root) && !(window.PIANO && LATE.PIANO.on) ? label : null,
      pos: () => {
        const p = poseFn();
        return [p.x, p.y, it.z + 0.4];
      },
      run: () => {
        const p = poseFn();
        const o = {
          x: p.x,
          y: p.y,
          eye: p.eye,
          yaw: p.yaw,
          pitch: p.pitch,
          kind: p.kind,
          onSit: () => SFX.drop(),
          leaveLabel: 'Aufstehen',
        };
        if (p.kind === 'lie') {
          o.primary = () => {
            if (window.DN && LATE.DN.canSleep()) LATE.DN.sleep();
          };
          o.primaryLabel = () => (window.DN && LATE.DN.canSleep() ? 'Schlafen bis 7 Uhr' : '');
        } // V16a: lying down after dark
        PLAY.sit(o);
      },
    });
  }
  function scan() {
    for (const it of typeof ITEMS !== 'undefined' ? ITEMS : []) {
      if (made.has(it)) continue;
      if (it.kind === 'glb' && T[it.type]) {
        made.add(it);
        seatAct(it, () => glbPose(it, T[it.type]), T[it.type].label);
      } else if (it.kind === 'glb' && it.type === 'garden_set') {
        made.add(it);
        for (const sgn of [-1, 1])
          seatAct(
            it,
            () => {
              const th = itemTheta(it),
                ux = Math.cos(th),
                uy = Math.sin(th),
                x = it.x + ux * 0.66 * sgn,
                y = it.y + uy * 0.66 * sgn;
              return {
                x,
                y,
                eye: it.z + 0.45 + 0.78,
                yaw: 90 - deg(Math.atan2(-uy * sgn, -ux * sgn)),
                pitch: -6,
                kind: 'sit',
              };
            },
            'Auf den Gartenstuhl setzen'
          );
      } else if (it.kind === 'grp') {
        const nm = String(it.key || '')
          .replace(/^[AB]:/, '')
          .replace(/^grp:/, '');
        const L = GRP[nm];
        if (!L) continue;
        made.add(it);
        for (const q of L) seatAct(it, () => grpPose(it, q), q.label, q.back);
      } else if (it.kind === 'proc' && (it.type === 'bank' || it.type === 'liege')) {
        made.add(it);
        const lie = it.type === 'liege';
        seatAct(
          it,
          () => {
            const r = ((it.rot || 0) * Math.PI) / 180,
              fx = -Math.sin(-r),
              fy = Math.cos(-r);
            return lie
              ? {
                  x: it.x + fx * 0.45,
                  y: it.y + fy * 0.45,
                  eye: it.z + 0.95,
                  yaw: (it.rot || 0) + 180,
                  pitch: -6,
                  kind: 'lie',
                }
              : {
                  x: it.x - fx * 0.05,
                  y: it.y - fy * 0.05,
                  eye: it.z + 0.44 + 0.78,
                  yaw: it.rot || 0,
                  pitch: -4,
                  kind: 'sit',
                };
          },
          lie ? 'Auf die Liege legen' : 'Auf die Bank setzen'
        );
      }
    }
  }
  let acc = 0;
  window.TICKS.push(dt => {
    acc += dt;
    if (acc > 2) {
      acc = 0;
      scan();
    }
  });
  scan();
  // Günter's bench on his side (no model item)
  PLAY.act({
    id: 'seat:guenterbench',
    r: 1.2,
    prio: -0.15,
    label: () => (PLAY.seat ? null : 'Auf die Bank setzen'),
    pos: [-13.25, -0.1, 0.45],
    run: () =>
      PLAY.sit({
        x: -13.25,
        y: -0.08,
        eye: 0.47 + 0.78,
        yaw: 90,
        pitch: -3,
        kind: 'sit',
        onSit: () => {
          SFX.drop();
          if (window.QUESTS) LATE.QUESTS.event('guenterbench');
        },
      }),
  });
  return { scan };
})();
