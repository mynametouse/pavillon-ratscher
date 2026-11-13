// ===================== feat/grenzland: the radar (GLKARTE) – the small round map of the mode, as GTA has it =====================
// Always there while the mode runs (on foot too) – bottom left where GTA has it, on touch screens top left under the task card (the thumb
// stick lives bottom left); the game's own small map (vehicles/minimap.js) is hidden meanwhile by a rule of this module's style: ahead is up; the roads and paths of world/roads.js; in the middle the player; on it what matters now – the mission's
// target (yellow, held at the rim while it is far away), the other one of the two, the police (red and blue in turn; the place they last
// knew as a red disc while they search), a road block, the helicopter, the mode's places (the barn, the shop on wheels, skittles, fishing,
// the garden). The rim flashes red and blue while they see the player. On a vehicle the map shows more the faster one goes. In 1989 there is
// no radar: the map is a sheet of paper, drawn by hand in brown ink. Drawn on a 2D canvas ten times a second; nothing in the 3D scene.
//   GLKARTE.src(fn)     a source of blips: fn(out) pushes { x, y, k, name?, r?, hd? } – k: 'ziel' | 'ziel2' | 'partner' | 'polizei' |
//                       'beamter' | 'heli' | 'sperre' | 'such' (r: radius in metres) | 'clique' | 'feind' | 'punkt' (a waypoint) |
//                       'ort' (name's first letter is drawn) | 'ereignis' (something on the way: an orange „!“, kept on the rim)
//   GLKARTE.show(on) · GLKARTE.tick(dt) · GLKARTE.blips() (tests: what was drawn last)
import { stage } from '../core/head.js';
import { P } from '../game/walkable.js';
import { ROADS } from '../world/roads.js';
import { VEH } from '../vehicles/vehicle.js';
import { GL } from './gl_state.js';
import { GLLOGIK } from './gl_logik.js';
export const GLKARTE = (() => {
  const S = {
    cv: null,
    lab: null,
    g: null,
    t: 1,
    R: 120,
    bb: null,
    srcs: [],
    shown: false,
    last: [],
    css: 168,
    D: 1,
    ph: 0,
  };
  const CSS = `
#stage canvas#glmap,canvas#glmap{position:absolute;left:max(14px,env(safe-area-inset-left,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));top:auto;
  width:176px;height:176px;border-radius:50%;pointer-events:none;z-index:3;box-shadow:0 2px 14px rgba(0,0,0,.35)}
#glmaplab{position:absolute;left:max(14px,env(safe-area-inset-left,0px));bottom:calc(200px + env(safe-area-inset-bottom,0px));width:176px;text-align:center;
  font:600 12px/1.2 var(--f-body,system-ui);color:#ffd36b;text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none;z-index:3}
#stage canvas#glmap[hidden],#glmap[hidden],#glmaplab[hidden]{display:none!important}
body[data-gl="1"] #vmap,body[data-gl="1"] #vmaplab{display:none!important}
body[data-clean="1"] #glmap,body[data-clean="1"] #glmaplab{display:none!important}
body[data-gl-era="1989"] #glmaplab{color:#f0e3c0}
/* touch and narrow screens: the thumb stick lives bottom left – the map goes under the task card top left, smaller */
@media (pointer:coarse),(max-width:720px){
  #stage canvas#glmap,canvas#glmap{bottom:auto;top:calc(122px + env(safe-area-inset-top,0px));width:108px;height:108px}
  #glmaplab{bottom:auto;top:calc(234px + env(safe-area-inset-top,0px));width:108px;font-size:11px}
}
@media (max-width:560px){
  #stage canvas#glmap,canvas#glmap{top:calc(160px + env(safe-area-inset-top,0px))}
  #glmaplab{top:calc(272px + env(safe-area-inset-top,0px))}
}
`;
  // roads by kind: colour today, colour on the paper of 1989, width in pixels
  const KIND = {
    foot: ['#c8b8a0', '#a08660', 1],
    path: ['#b99b70', '#a08660', 1],
    track: ['#c9a874', '#8f744c', 1.6],
    service: ['#e8e4dc', '#7d6440', 1.8],
    lane: ['#e8e4dc', '#7d6440', 2.2],
    street: ['#ffffff', '#6a5232', 2.6],
    county: ['#fff0a8', '#5a4426', 3.2],
    main: ['#ffd27a', '#4e3a1e', 3.6],
    motorway: ['#f2a07a', '#4e3a1e', 4.5],
  };
  const ORDER = Object.keys(KIND);
  function build() {
    if (S.cv) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const root = stage || document.body;
    S.cv = document.createElement('canvas');
    S.cv.id = 'glmap';
    S.cv.hidden = true;
    S.cv.setAttribute('aria-hidden', 'true');
    root.appendChild(S.cv);
    S.lab = document.createElement('div');
    S.lab.id = 'glmaplab';
    S.lab.hidden = true;
    root.appendChild(S.lab);
    S.g = S.cv.getContext('2d');
  }
  const bbox = () =>
    S.bb ||
    (S.bb = ROADS.ways.map(w => {
      let x0 = 1e9,
        x1 = -1e9,
        y0 = 1e9,
        y1 = -1e9;
      for (let i = 0; i < w.p.length; i += 2) {
        x0 = Math.min(x0, w.p[i]);
        x1 = Math.max(x1, w.p[i]);
        y0 = Math.min(y0, w.p[i + 1]);
        y1 = Math.max(y1, w.p[i + 1]);
      }
      return [x0, y0, x1, y1];
    }));
  // sharp on high-density screens: the canvas in device pixels, drawn in CSS pixels
  function fit() {
    const w = S.cv.clientWidth || 176,
      D = Math.min(2, window.devicePixelRatio || 1),
      n = Math.round(w * D);
    if (S.cv.width !== n) S.cv.width = S.cv.height = n;
    S.css = w;
    S.D = n / w;
  }
  const src = fn => (S.srcs.push(fn), fn);
  // where the player is and where he looks (compass, radians), how fast
  function me() {
    const v = VEH.cur;
    if (v) return [v.st.x, v.st.y, v.st.psi, Math.hypot(v.st.u || 0, v.st.v || 0)];
    return [P.x, P.y, (P.yaw * Math.PI) / 180, 0];
  }
  const dist = d =>
    d > 950 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.max(10, Math.round(d / 10) * 10) + ' m';
  function draw(dt) {
    const g = S.g,
      [cx, cy, psi, v] = me(),
      old = GL.era === '1989';
    fit();
    // the faster, the more one sees
    const want = VEH.cur ? Math.min(330, 150 + v * 7) : 120;
    S.R += (want - S.R) * Math.min(1, dt * 2.5);
    S.ph += dt;
    g.setTransform(S.D, 0, 0, S.D, 0, 0);
    const W = S.css,
      r0 = W / 2,
      k = r0 / S.R,
      cs = Math.cos(psi),
      sn = Math.sin(psi);
    // world → metres right of and ahead of the player; → canvas
    const rot = (x, y) => {
      const dx = x - cx,
        dy = y - cy;
      return [dx * cs - dy * sn, dx * sn + dy * cs];
    };
    const Pt = (x, y) => {
      const q = rot(x, y);
      return [r0 + q[0] * k, r0 - q[1] * k];
    };
    g.save();
    g.clearRect(0, 0, W, W);
    g.beginPath();
    g.arc(r0, r0, r0 - 1, 0, 7);
    g.clip();
    g.fillStyle = old ? 'rgba(222,206,166,0.93)' : 'rgba(24,30,26,0.8)';
    g.fillRect(0, 0, W, W);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (ROADS && ROADS.ways && ROADS.ways.length) {
      const B = bbox(),
        R2 = S.R * 1.45;
      for (const kind of ORDER) {
        g.strokeStyle = KIND[kind][old ? 1 : 0];
        g.lineWidth = KIND[kind][2] * (old ? 0.8 : 1);
        g.beginPath();
        for (let i = 0; i < ROADS.ways.length; i++) {
          const w = ROADS.ways[i];
          if (ROADS.KINDS[w.kind] !== kind) continue;
          const b = B[i];
          if (b[2] < cx - R2 || b[0] > cx + R2 || b[3] < cy - R2 || b[1] > cy + R2) continue;
          for (let j = 0; j < w.p.length; j += 2) {
            const q = Pt(w.p[j], w.p[j + 1]);
            j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
          }
        }
        g.stroke();
      }
      // beyond the square the roads the journeys' module knows (welt/fahrt.js hangs them into the game's own small map)
      try {
        if (window.MMAP && window.MMAP.more) window.MMAP.more(g, Pt, cx, cy, R2);
      } catch (e) {}
    }
    // the blips
    const out = [];
    for (const fn of S.srcs) {
      try {
        fn(out);
      } catch (e) {
        if (!S.err) {
          S.err = 1;
          console.warn('glkarte', e);
        }
      }
    }
    const flip = Math.floor(S.ph * 3.2) % 2 === 0;
    let ziel = null;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const RIM = { ziel: 1, punkt: 1, partner: 1, polizei: 1, heli: 1, clique: 1, ereignis: 1 };
    // areas first, then the marks
    for (const b of out) {
      if (b.k !== 'such') continue;
      const q = Pt(b.x, b.y);
      g.fillStyle = old ? 'rgba(150,40,20,0.22)' : 'rgba(255,60,50,0.22)';
      g.beginPath();
      g.arc(q[0], q[1], Math.max(6, (b.r || 60) * k), 0, 7);
      g.fill();
    }
    for (const b of out) {
      if (b.k === 'such') continue;
      const m = rot(b.x, b.y),
        d = Math.hypot(m[0], m[1]),
        lim = S.R * 0.9;
      let far = false;
      if (d > lim) {
        if (!RIM[b.k]) continue;
        if (b.k === 'polizei' && d > 700) continue;
        if (b.k === 'clique' && d > 500) continue;
        m[0] *= lim / d;
        m[1] *= lim / d;
        far = true;
      }
      const x = r0 + m[0] * k,
        y = r0 - m[1] * k;
      b.d = d;
      b.far = far;
      if (b.k === 'ziel' || b.k === 'ziel2') {
        const s = b.k === 'ziel' ? (far ? 4.5 : 5.5) : 3.5;
        g.fillStyle = old ? '#7a2a14' : b.k === 'ziel' ? '#ffd23a' : 'rgba(255,210,58,0.6)';
        g.strokeStyle = 'rgba(0,0,0,0.75)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, y - s);
        g.lineTo(x + s, y);
        g.lineTo(x, y + s);
        g.lineTo(x - s, y);
        g.closePath();
        g.fill();
        g.stroke();
        if (b.k === 'ziel' && (!ziel || d < ziel.d)) ziel = b;
      } else if (b.k === 'punkt') {
        // a waypoint from the phone: a magenta pin
        g.fillStyle = old ? '#6a2a4a' : '#e85ad8';
        g.strokeStyle = 'rgba(0,0,0,0.75)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y - 3, 4.2, Math.PI * 0.85, Math.PI * 0.15);
        g.lineTo(x, y + 5);
        g.closePath();
        g.fill();
        g.stroke();
        if (!ziel) ziel = b;
      } else if (b.k === 'partner') {
        g.fillStyle = old ? '#3d5a2c' : '#6fd6ff';
        g.strokeStyle = 'rgba(0,0,0,0.75)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, far ? 3.4 : 4.4, 0, 7);
        g.fill();
        g.stroke();
      } else if (b.k === 'polizei' || b.k === 'beamter') {
        const s = b.k === 'polizei' ? 4.6 : 3;
        g.fillStyle = old ? '#3f5a3a' : flip ? '#ff3b30' : '#3b82ff';
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, far ? s - 1 : s, 0, 7);
        g.fill();
        g.stroke();
      } else if (b.k === 'heli') {
        g.strokeStyle = flip ? '#ff3b30' : '#3b82ff';
        g.lineWidth = 2;
        const a = S.ph * 9;
        g.beginPath();
        g.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7);
        g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
        g.moveTo(x + Math.sin(a) * 7, y - Math.cos(a) * 7);
        g.lineTo(x - Math.sin(a) * 7, y + Math.cos(a) * 7);
        g.stroke();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x, y, 2.2, 0, 7);
        g.fill();
      } else if (b.k === 'sperre') {
        g.strokeStyle = flip ? '#ff3b30' : '#ffffff';
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(x - 6, y);
        g.lineTo(x + 6, y);
        g.stroke();
      } else if (b.k === 'clique' || b.k === 'feind') {
        g.fillStyle = b.k === 'clique' ? '#c79bff' : '#ff8a3a';
        g.strokeStyle = 'rgba(0,0,0,0.7)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, 3.3, 0, 7);
        g.fill();
        g.stroke();
      } else if (b.k === 'ereignis') {
        // something happens on the way (agent welt, gl_ereignis.js): an orange disc with „!“
        g.fillStyle = old ? '#8a5a20' : '#ff9a2e';
        g.strokeStyle = 'rgba(0,0,0,0.75)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, 6, 0, 7);
        g.fill();
        g.stroke();
        g.fillStyle = '#1d1b16';
        g.font = '800 10px system-ui, sans-serif';
        g.fillText('!', x, y + 0.5);
      } else if (b.k === 'ort') {
        g.fillStyle = old ? 'rgba(90,68,38,0.9)' : 'rgba(255,255,255,0.92)';
        g.beginPath();
        g.arc(x, y, 6.2, 0, 7);
        g.fill();
        g.fillStyle = old ? '#efe2be' : '#17201a';
        g.font = '700 9px system-ui, sans-serif';
        g.fillText(String(b.name || '•').charAt(0), x, y + 0.5);
      }
    }
    // north on the rim, me in the middle
    {
      g.fillStyle = old ? '#4e3a1e' : '#fff';
      g.font = '600 11px system-ui, sans-serif';
      g.fillText('N', r0 - sn * (r0 - 10), r0 - cs * (r0 - 10));
    }
    g.fillStyle = old ? '#2c2010' : '#ffffff';
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(r0, r0 - 8);
    g.lineTo(r0 + 5.5, r0 + 6);
    g.lineTo(r0, r0 + 3);
    g.lineTo(r0 - 5.5, r0 + 6);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    // the rim: calm, or the police's colours while they see the player, amber while they search
    const n = GLLOGIK.stars(GL.W),
      st = GL.W.state;
    g.lineWidth = n > 0 ? 3.5 : 1.5;
    g.strokeStyle =
      n > 0 && !old
        ? st === 'verfolgt'
          ? flip
            ? '#ff3b30'
            : '#3b82ff'
          : 'rgba(255,196,64,' + (0.55 + 0.35 * Math.sin(S.ph * 4)) + ')'
        : old
          ? 'rgba(78,58,30,0.8)'
          : 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.arc(r0, r0, r0 - (n > 0 ? 2 : 1), 0, 7);
    g.stroke();
    // under the map: the target and how far
    const txt = ziel && ziel.d > 12 ? (ziel.name ? ziel.name + ' ' : '') + dist(ziel.d) : '';
    if (S.lab.textContent !== txt) S.lab.textContent = txt;
    S.last = out;
  }
  function show(on) {
    build();
    S.shown = !!on;
    S.cv.hidden = S.lab.hidden = !on;
    S.t = 1;
  }
  function tick(dt) {
    if (!S.shown) return;
    const vis = P.mode === 'walk';
    if (S.cv.hidden === vis) S.cv.hidden = S.lab.hidden = !vis;
    if (!vis) return;
    S.t += dt;
    if (S.t < 0.1) return;
    const d = S.t;
    S.t = 0;
    try {
      draw(d);
    } catch (e) {
      if (!S.err) {
        S.err = 1;
        console.warn('glkarte', e);
      }
    }
  }
  const blips = () => S.last.map(b => ({ k: b.k, name: b.name || '', d: Math.round(b.d || 0), far: !!b.far }));
  return Object.assign(S, { build, src, show, tick, blips });
})();
window.GLKARTE = GLKARTE;
