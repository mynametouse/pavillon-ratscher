// ===================== feat/grenzland: skittles on the open-air alley (GLKEGELN), and the side games' little panel (GLSPIEL) =====================
// „Kegeln (2 €)“ at the alley beside the field barn (grenzland/gl_orte.js builds it): five throws „in die Vollen“ – all nine pins stand
// again for every throw, the wood counts, 45 at best. One sees down the lane with one's own eyes:
//   1 set the ball across the lane (◀ ▶, arrow keys or A / D) and choose the spin (↶ ↷, arrow up / down or W / S) – a chalk line on the
//     lane shows where the ball would go
//   2 „Richtung“: the line swings to and fro – stop it at the right moment
//   3 „Schwung“: the bar swings – stop it, and the ball is on its way
// (one button for all three: the panel's big one, the game's action button, E, Enter or the space bar – mouse, keys and touch alike).
// The eye follows the ball down the lane; ball and pins move as the rules say (GLNLOGIK.wurf: discs on the pin deck), one hears the
// throw, the rolling, the pins, the gutter. „Alle Neune!“ is called, the best game is chalked on the slate (GL.stats.kegel). If Timo of
// the clique stands by, one can play him for a stake: throw by throw in turns.
// Interface: GLKEGELN.spielen(o) → Promise<{ punkte, wuerfe, liste, gegner, gewonnen, abbruch }>   o: { seed, gegner: name, einsatz, frei,
//   auto: [{ aim, dir, drall, kraft }, …] (thrown by themselves: tests) } · GLKEGELN.on · taste(id) · wurf(values) · stand()
import * as THREE from 'three';
import { scene, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GLORTE } from './gl_orte.js';
// ---- the panel of the side games: a title, a line of help, a bar with a band and a marker, buttons (pressed and let go) ----
export const GLSPIEL = (() => {
  const S = { el: null, cb: null, key: '', bar: '' };
  const CSS = `
#glspiel{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:8;width:min(440px,94vw);
  background:rgba(14,18,22,.84);color:#eef1f2;border-radius:12px;padding:10px 12px;font:400 13px/1.35 var(--f-body,system-ui);pointer-events:auto;
  user-select:none;-webkit-user-select:none;touch-action:manipulation}
#glspiel[hidden]{display:none!important}
#glspiel h4{margin:0;font:600 14px/1.3 var(--f-body,system-ui);color:#f3c64f;display:flex;justify-content:space-between;gap:10px}
#glspiel h4 span{color:#eef1f2;font-weight:500;white-space:nowrap}
#glspiel p{margin:3px 0 7px;opacity:.94;min-height:17px}
#glspiel .gb{position:relative;height:16px;border-radius:8px;background:rgba(255,255,255,.14);margin:0 0 8px;overflow:hidden}
#glspiel .gb[hidden]{display:none}
#glspiel .gb i{position:absolute;top:0;bottom:0;background:rgba(120,210,120,.4)}
#glspiel .gb b{position:absolute;top:0;bottom:0;width:7px;margin-left:-3.5px;border-radius:3px;background:#f3c64f}
#glspiel .gb.rot b{background:#ff6a4a}
#glspiel .gk{display:flex;gap:6px;flex-wrap:wrap}
#glspiel .gk button{flex:1 1 44px;min-height:42px;font:600 15px/1 var(--f-body,system-ui);color:#eef1f2;background:rgba(255,255,255,.15);border:0;border-radius:9px;
  padding:8px 10px;cursor:pointer;touch-action:manipulation}
#glspiel .gk button.haupt{flex:3 1 130px;background:#f3c64f;color:#1b1608}
#glspiel .gk button.aus{flex:0 0 auto;opacity:.78;font-weight:500;font-size:13px}
#glspiel .gk button:active{filter:brightness(1.25)}
@media (max-height:500px){#glspiel{bottom:calc(64px + env(safe-area-inset-bottom,0px));padding:7px 9px}#glspiel p{margin:2px 0 5px}#glspiel .gk button{min-height:36px}}
body:has(#glwahl:not([hidden])) #glspiel{display:none!important}
`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function build() {
    if (S.el) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const d = document.createElement('div');
    d.id = 'glspiel';
    d.hidden = true;
    d.innerHTML = '<h4><b></b><span></span></h4><p></p><div class="gb"><i></i><b></b></div><div class="gk"></div>';
    (stage || document.body).appendChild(d);
    S.el = d;
    const ev = (e, down) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      if (down && b.setPointerCapture)
        try {
          b.setPointerCapture(e.pointerId);
        } catch (er) {}
      if (S.cb) S.cb(b.dataset.k, down);
    };
    d.addEventListener('pointerdown', e => ev(e, true));
    d.addEventListener('pointerup', e => ev(e, false));
    d.addEventListener('pointercancel', e => ev(e, false));
    d.addEventListener('contextmenu', e => e.preventDefault());
  }
  // o: { titel, rechts, text, balken: null | { v: 0 … 1, band: [a, b], rot }, knoepfe: [{ k, t, cls }] } – only what is given changes
  function set(o) {
    if (!S.el) return;
    const el = S.el;
    if (o.titel !== undefined) el.querySelector('h4 b').textContent = o.titel;
    if (o.rechts !== undefined) el.querySelector('h4 span').textContent = o.rechts;
    if (o.text !== undefined) el.querySelector('p').textContent = o.text;
    if (o.balken !== undefined) {
      const g = el.querySelector('.gb'),
        q = o.balken;
      g.hidden = !q;
      if (q) {
        const k = [Math.round(q.v * 200), q.band ? q.band.join() : '', q.rot ? 1 : 0].join('|');
        if (k !== S.bar) {
          S.bar = k;
          g.classList.toggle('rot', !!q.rot);
          const band = g.querySelector('i'),
            m = g.querySelector('b');
          band.style.display = q.band ? '' : 'none';
          if (q.band) {
            band.style.left = q.band[0] * 100 + '%';
            band.style.width = (q.band[1] - q.band[0]) * 100 + '%';
          }
          m.style.left = Math.max(0, Math.min(1, q.v)) * 100 + '%';
        }
      }
    }
    if (o.knoepfe !== undefined) {
      const key = o.knoepfe.map(b => b.k + ':' + b.t + ':' + (b.cls || '')).join('|');
      if (key !== S.key) {
        S.key = key;
        el.querySelector('.gk').innerHTML = o.knoepfe
          .map(b => `<button data-k="${esc(b.k)}"${b.cls ? ' class="' + b.cls + '"' : ''}>${esc(b.t)}</button>`)
          .join('');
      }
    }
  }
  function show(o, cb) {
    build();
    S.cb = cb || null;
    S.key = S.bar = '';
    set(Object.assign({ titel: '', rechts: '', text: '', balken: null, knoepfe: [] }, o));
    S.el.hidden = false;
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
  }
  function hide() {
    if (S.el) S.el.hidden = true;
    S.cb = null;
  }
  return { show, set, hide, shown: () => !!S.el && !S.el.hidden };
})();
window.GLSPIEL = GLSPIEL;
export const GLKEGELN = (() => {
  const N = GLNLOGIK,
    Lb = N.BAHN.L,
    S = {
      on: false,
      ph: '', // 'ziel' | 'richtung' | 'kraft' | 'rollt' | 'schau' | 'auf' | ''
      t: 0,
      aim: 0,
      drall: 0,
      dir: 0,
      kraft: 0.7,
      nr: 0, // the throw that is next (0 … 4)
      liste: [],
      vs: null, // { name, liste: [], stufe } – the one played against
      dran: 'ich',
      einsatz: 0,
      seed: 1,
      auto: null,
      res: null,
      wf: null, // the throw that rolls: what the rules returned, and its times
      neun: 0,
      meshes: null,
      cam: { x: 0, y: 0, z: 0 },
      camF: -2.3,
      yaw: 0,
      pitch: -8,
      keys: null,
      schnell: 1,
    };
  const FEE = 2,
    A_DIR = 0.028, // how far the line swings (rad)
    T_DIR = 2.8, // seconds for one swing to and fro
    T_KRAFT = 1.5,
    HDdeg = () => (GLORTE.KB.hd * 180) / Math.PI;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const Lc = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  // ------------------------------------------------------------------ the things that move: nine pins, the ball, the chalk line ------------------------------------------------------------------
  function bauen() {
    if (S.meshes || !GLORTE.KB.F) return;
    const MT = GLORTE.mat(),
      mk = koenig => {
        const K = GLORTE.kit(),
          w = Lc(236, 232, 220),
          r = Lc(172, 40, 34);
        K.lathe(
          0,
          0,
          0,
          [
            [0.034, 0],
            [0.05, 0.09],
            [0.05, 0.17],
            [0.036, 0.25],
          ],
          10,
          w
        );
        K.lathe(
          0,
          0,
          0,
          [
            [0.036, 0.25],
            [0.03, 0.27],
            [0.03, 0.3],
            [0.036, 0.32],
          ],
          10,
          r
        );
        K.lathe(
          0,
          0,
          0,
          [
            [0.036, 0.32],
            [0.036, 0.35],
            [0.026, 0.385],
            [0, 0.4],
          ],
          10,
          w
        );
        if (koenig)
          K.lathe(
            0,
            0,
            0,
            [
              [0.012, 0.395],
              [0.02, 0.42],
              [0.012, 0.44],
              [0, 0.445],
            ],
            8,
            r
          );
        return K.geo();
      },
      g1 = mk(false),
      g2 = mk(true),
      F = GLORTE.KB.F,
      M = { pins: [], geos: [g1, g2] };
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(i === 4 ? g2 : g1, MT.paint);
      m.userData.noMerge = true;
      m.castShadow = false;
      m.name = 'grenzland-kegel';
      scene.add(m);
      M.pins.push(m);
    }
    const KB = GLORTE.kit();
    KB.ball(0, 0, 0, N.BAHN.ball, Lc(40, 30, 28), 12);
    M.geos.push(KB.geo());
    M.ball = new THREE.Mesh(M.geos[2], MT.paint);
    M.ball.userData.noMerge = true;
    M.ball.castShadow = false;
    M.ball.visible = false;
    scene.add(M.ball);
    // the chalk line: a strip of 24 pieces along the ball's way, moved every frame while one aims
    const n = 25,
      g = new THREE.BufferGeometry(),
      pos = new Float32Array(n * 2 * 3),
      nor = new Float32Array(n * 2 * 3),
      idx = [];
    for (let i = 0; i < n * 2; i++) nor[i * 3 + 1] = 1;
    for (let i = 0; i + 1 < n; i++)
      idx.push(
        i * 2,
        i * 2 + 1,
        i * 2 + 2,
        i * 2 + 1,
        i * 2 + 3,
        i * 2 + 2,
        i * 2,
        i * 2 + 2,
        i * 2 + 1,
        i * 2 + 1,
        i * 2 + 2,
        i * 2 + 3
      );
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2 * 2), 2));
    g.setIndex(idx);
    const lm = VAUTO.LM.head.clone();
    lm.color.setHex(0xf4efdc);
    lm.emissive.setHex(0xfff6d8);
    lm.emissiveIntensity = 0.55;
    lm.metalness = 0;
    lm.roughness = 0.9;
    M.linie = new THREE.Mesh(g, lm);
    M.linie.userData.noMerge = true;
    M.linie.frustumCulled = false;
    M.linie.castShadow = M.linie.receiveShadow = false;
    M.linie.visible = false;
    scene.add(M.linie);
    M.F = F;
    S.meshes = M;
    aufstellen();
    tafel();
  }
  function weg() {
    const M = S.meshes;
    if (!M) return;
    for (const m of [...M.pins, M.ball, M.linie, M.tafel]) if (m) scene.remove(m);
    for (const g of M.geos) g.dispose();
    M.linie.geometry.dispose();
    M.linie.material.dispose();
    if (M.tafel) M.tafel.geometry.dispose();
    S.meshes = null;
  }
  const _ax = new THREE.Vector3();
  // a pin on the deck: x across, y along from the first pin; tipped by ang towards (dx, dy); lifted by up
  function setPin(i, x, y, ang = 0, dx = 0, dy = 1, up = 0) {
    const M = S.meshes,
      p = M.F.P(x, Lb + y, up + (ang > 0 ? 0.045 * Math.min(1, ang / 1.2) : 0)),
      m = M.pins[i];
    m.position.set(p[0], p[2], -p[1]);
    if (ang > 0) {
      // the fall's direction in the world, the axis across it
      const c = Math.cos(M.F.hd),
        s = Math.sin(M.F.hd),
        wx = dx * c + dy * s,
        wy = -dx * s + dy * c;
      _ax.set(-wy, 0, -wx).normalize();
      m.quaternion.setFromAxisAngle(_ax, ang);
    } else m.quaternion.identity();
  }
  function aufstellen() {
    if (!S.meshes) return;
    for (let i = 0; i < 9; i++) setPin(i, N.PINS[i].x, N.PINS[i].y);
    markDirty(true);
  }
  // the slate: the best game in chalk, under it the throws of the last one
  function tafel() {
    const M = S.meshes,
      T = GLORTE.KB.tafel;
    if (!M || !T) return;
    if (M.tafel) {
      scene.remove(M.tafel);
      M.tafel.geometry.dispose();
      M.tafel = null;
    }
    const K = GLORTE.kit(),
      kr = GLORTE.C.kreide;
    GLORTE.tafelText(K, String(Math.round(GL.stats.kegel || 0)), [T.p[0], T.p[1], T.p[2] - 0.34], T.az, 0.042, kr);
    if (S.liste.length)
      GLORTE.tafelText(K, S.liste.join(' '), [T.p[0], T.p[1], T.p[2] - 0.62], T.az, 0.014, GLORTE.C.gelb);
    M.tafel = GLORTE.mesh(K, GLORTE.mat().paint, 'grenzland-kegel-tafel', false);
  }
  function linie() {
    const M = S.meshes,
      show = S.on && (S.ph === 'ziel' || S.ph === 'richtung' || S.ph === 'kraft') && S.dran === 'ich';
    M.linie.visible = show;
    if (!show) return;
    const X = N.bahn(S.aim, S.dir, S.drall, 0.75),
      a = M.linie.geometry.attributes.position,
      n = a.count / 2;
    for (let i = 0; i < n; i++) {
      const s = 0.35 + (i / (n - 1)) * (Lb - 0.9),
        x = X(s),
        w = 0.016 + 0.012 * (i / n);
      for (const [j, q] of [
        [0, -w],
        [1, w],
      ]) {
        const p = M.F.P(x + q, s, 0.007);
        a.setXYZ(i * 2 + j, p[0], p[2], -p[1]);
      }
    }
    a.needsUpdate = true;
  }
  // ------------------------------------------------------------------ the panel ------------------------------------------------------------------
  const summe = () => N.summe(S.liste);
  function panel() {
    const vs = S.vs,
      mein = S.dran === 'ich',
      rechts =
        'Wurf ' +
        Math.min(N.WUERFE, S.nr + 1) +
        ' von ' +
        N.WUERFE +
        ' · ' +
        summe() +
        ' Holz' +
        (vs ? ' · ' + vs.name + ' ' + N.summe(vs.liste) : ''),
      K = [];
    let text = '',
      balken = null;
    if (!mein) text = vs.name + ' wirft.';
    else if (S.ph === 'ziel') {
      text = 'Kugel setzen ◀ ▶, Drall ↶ ↷ – die Kreidelinie zeigt den Weg. Am besten knapp neben den vordersten Kegel.';
      K.push(
        { k: 'l', t: '◀' },
        { k: 'r', t: '▶' },
        { k: 'dl', t: '↶' },
        { k: 'dr', t: '↷' },
        { k: 'los', t: 'Richtung', cls: 'haupt' }
      );
    } else if (S.ph === 'richtung') {
      text = 'Die Linie pendelt – im richtigen Moment anhalten.';
      K.push({ k: 'los', t: 'Stopp', cls: 'haupt' });
    } else if (S.ph === 'kraft') {
      text = 'Schwung holen: weit rechts rollt die Kugel hart, links zieht der Drall stärker.';
      balken = { v: (S.kraft - 0.3) / 0.7, band: [0.5, 0.86] };
      K.push({ k: 'los', t: 'Wurf!', cls: 'haupt' });
    } else if (S.ph === 'rollt') text = 'Die Kugel rollt …';
    else text = S.wf ? N.ruf(S.wf.r.fallen.length, S.wf.r.rinne) : '';
    if (mein && S.ph !== 'rollt') K.push({ k: 'aus', t: 'Aufhören', cls: 'aus' });
    GLSPIEL.set({ titel: 'Kegeln', rechts, text, balken, knoepfe: K });
  }
  // ------------------------------------------------------------------ the throw ------------------------------------------------------------------
  function werfen(v) {
    const r = N.wurf(v.aim, v.dir, v.drall, v.kraft, null, S.seed + S.nr * 17 + (S.dran === 'ich' ? 0 : 7919)),
      vv = N.tempo(v.kraft),
      X = N.bahn(v.aim, v.dir, v.drall, v.kraft);
    S.wf = { r, v: vv, X, t: 0, tDeck: r.sek, hit: false, rinne: false, zeit: S.dran === 'ich' ? 1 : 1.5 };
    S.aim = v.aim;
    S.dir = v.dir;
    S.drall = v.drall;
    S.kraft = v.kraft;
    S.ph = 'rollt';
    S.t = 0;
    GLTON.fx('wurf');
    GLTON.fx('rollen', 0, 200, r.sek / S.wf.zeit);
    panel();
  }
  // where the ball is t seconds after it was let go: [x across, s along, z over the lane, there]
  function kugelAt(t) {
    const w = S.wf,
      r = w.r;
    if (r.rinne) {
      const s = w.v * t;
      if (s < r.aus) return [w.X(s), s, N.BAHN.ball, true];
      const side = Math.sign(w.X(r.aus)) || 1;
      return [side * 0.865, s, N.BAHN.ball - 0.06, s < Lb + 1.3];
    }
    if (t <= w.tDeck) return [w.X(w.v * t), w.v * t, N.BAHN.ball, true];
    const td = t - w.tDeck,
      k = r.kugel;
    if (!k.length) return [0, Lb, N.BAHN.ball, false];
    for (let i = 0; i + 1 < k.length; i++)
      if (td <= k[i + 1][0]) {
        const q = (td - k[i][0]) / Math.max(1e-6, k[i + 1][0] - k[i][0]);
        return [k[i][1] + (k[i + 1][1] - k[i][1]) * q, Lb + k[i][2] + (k[i + 1][2] - k[i][2]) * q, N.BAHN.ball, true];
      }
    // off the deck's end into the pit
    const e = k[k.length - 1],
      t2 = td - e[0];
    return [e[1], Lb + e[2] + Math.min(0.6, t2 * 3), N.BAHN.ball - Math.min(0.3, t2 * 1.6), t2 < 0.5];
  }
  function rollen(dt) {
    const w = S.wf,
      M = S.meshes,
      r = w.r;
    w.t += dt * w.zeit;
    const [x, s, z, da] = kugelAt(w.t),
      p = M.F.P(x, s, z);
    M.ball.visible = da;
    M.ball.position.set(p[0], p[2], -p[1]);
    S.ballS = s;
    S.ballX = x;
    if (r.rinne && !w.rinne && s >= r.aus) {
      w.rinne = true;
      GLTON.fx('rinne');
    }
    // the pins: each tips when its time has come and slides to where it comes to rest
    const td = w.t - w.tDeck;
    if (!r.rinne && td >= 0) {
      if (!w.hit && r.falls.length) {
        w.hit = true;
        GLTON.fx('kegel', 0, 200, r.fallen.length);
      }
      for (const f of r.falls) {
        const q = td - f.t;
        if (q < 0) continue;
        const a = Math.min(1, q / 0.3),
          b = Math.min(1, q / 0.55),
          e = 1 - (1 - b) * (1 - b),
          p0 = N.PINS[f.i];
        setPin(f.i, p0.x + (f.x - p0.x) * e, p0.y + (f.y - p0.y) * e, a * a * 1.5, f.dx, f.dy);
      }
    }
    const tEnde = r.rinne ? (Lb + 1.4) / w.v : w.tDeck + 1.25;
    if (w.t >= tEnde) {
      M.ball.visible = false;
      gezaehlt();
    }
  }
  // the throw is over: counted, called out
  function gezaehlt() {
    const r = S.wf.r,
      n = r.fallen.length,
      ich = S.dran === 'ich',
      L = ich ? S.liste : S.vs.liste;
    L.push(n);
    if (n === 9 && ich) S.neun++;
    S.ph = 'schau';
    S.t = 0;
    GLHUD.say(
      N.ruf(n, r.rinne),
      (ich ? 'Wurf ' + L.length + ': ' : S.vs.name + ': ') + n + ' Holz · zusammen ' + N.summe(L),
      2.2
    );
    if (!ich && n === 9) GLHUD.sub(S.vs.name, 'So geht das.', 2200);
    GL.emit('kegelwurf', { n, rinne: r.rinne, wer: ich ? 'ich' : S.vs.name });
    panel();
  }
  // who throws next, or the end
  function weiter() {
    const vs = S.vs;
    if (vs && S.dran === 'ich') {
      S.dran = 'vs';
      const q = N.gegner(vs.stufe, S.seed * 3 + S.nr * 101 + 5);
      S.ph = 'auf';
      S.t = 0;
      S.next = q;
      panel();
      return;
    }
    S.dran = 'ich';
    S.nr++;
    if (S.nr >= N.WUERFE) return ende(false);
    S.ph = 'auf';
    S.t = 0;
    S.next = null;
    panel();
  }
  function bereit() {
    aufstellen();
    if (S.next) return werfen(S.next);
    S.ph = 'ziel';
    S.t = 0;
    S.dir = 0;
    panel();
    if (S.auto) {
      const v = S.auto[S.nr % S.auto.length];
      werfen({ aim: v.aim || 0, dir: v.dir || 0, drall: v.drall || 0, kraft: v.kraft ?? 0.8 });
    }
  }
  // the button: on to the next step
  function los() {
    if (!S.on || S.dran !== 'ich') return;
    if (S.ph === 'ziel') {
      S.ph = 'richtung';
      S.t = 0;
      GLTON.fx('tick');
    } else if (S.ph === 'richtung') {
      S.ph = 'kraft';
      S.t = 0;
      GLTON.fx('tick');
    } else if (S.ph === 'kraft') return werfen({ aim: S.aim, dir: S.dir, drall: S.drall, kraft: S.kraft });
    panel();
  }
  function taste(k, down = true) {
    if (!S.on) return;
    if (k === 'aus') {
      if (down) PLAY.stand(true);
      return;
    }
    if (!down) return;
    if (k === 'los') return los();
    if (S.ph !== 'ziel' || S.dran !== 'ich') return;
    if (k === 'l') S.aim = Math.max(-0.6, S.aim - 0.03);
    else if (k === 'r') S.aim = Math.min(0.6, S.aim + 0.03);
    else if (k === 'dl') S.drall = Math.max(-1, S.drall - 0.5);
    else if (k === 'dr') S.drall = Math.min(1, S.drall + 0.5);
    if (k === 'dl' || k === 'dr')
      PLAY.think(
        S.drall
          ? (S.drall < 0 ? 'Linksdrall' : 'Rechtsdrall') + (Math.abs(S.drall) > 0.6 ? ', kräftig' : '')
          : 'Ohne Drall',
        900
      );
    markDirty();
  }
  const KEYS = {
    arrowleft: 'l',
    a: 'l',
    arrowright: 'r',
    d: 'r',
    arrowup: 'dr',
    w: 'dr',
    arrowdown: 'dl',
    s: 'dl',
    ' ': 'los',
  };
  function onKey(e) {
    if (!S.on || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = KEYS[e.key.toLowerCase()];
    if (!k || (k === 'los' && e.repeat)) return;
    e.preventDefault();
    taste(k, true);
  }
  // ------------------------------------------------------------------ the game ------------------------------------------------------------------
  // per frame (through GLORTE's tick): the steps, the ball, the eye
  function tick(dt) {
    if (!S.on || !S.meshes) return;
    dt = Math.min(dt, 0.1);
    S.t += dt;
    if (S.ph === 'richtung') S.dir = A_DIR * Math.sin((S.t / T_DIR) * Math.PI * 2);
    else if (S.ph === 'kraft') {
      const q = (S.t / T_KRAFT) % 2;
      S.kraft = 0.3 + 0.7 * (q < 1 ? q : 2 - q);
      GLSPIEL.set({ balken: { v: (S.kraft - 0.3) / 0.7, band: [0.5, 0.86] } });
    } else if (S.ph === 'rollt') rollen(dt);
    else if (S.ph === 'schau' && S.t > 1.7 / S.schnell) weiter();
    else if (S.ph === 'auf') {
      // the pins are pulled up on their strings and set down again
      const k = Math.min(1, S.t / (0.7 / S.schnell)),
        up = Math.sin(k * Math.PI) * 0.22;
      if (S.wf && k < 1)
        for (const f of S.wf.r.falls) {
          const p0 = N.PINS[f.i],
            e = k * k * (3 - 2 * k);
          setPin(f.i, f.x + (p0.x - f.x) * e, f.y + (p0.y - f.y) * e, 1.5 * (1 - e), f.dx, f.dy, up);
        }
      if (k >= 1) bereit();
    }
    linie();
    // the eye: behind the foul line while one aims, down the lane after the ball
    const F = S.meshes.F,
      roll = S.ph === 'rollt' || S.ph === 'schau',
      fz = roll ? Math.max(-2.3, Math.min(Lb - 3.3, (S.ballS || 0) - 3.0)) : -2.3,
      e = 1 - Math.exp(-dt * (roll ? 5 : 3.2));
    S.camF += (fz - S.camF) * e;
    const k = Math.max(0, Math.min(1, (S.camF + 2.3) / (Lb - 1.0))),
      c = F.P((roll ? (S.ballX || 0) * 0.35 : S.aim * 0.4) * (1 - k * 0.5), S.camF, 1.52 - 0.55 * k);
    S.cam.x = c[0];
    S.cam.y = c[1];
    S.cam.z = c[2];
    P.yaw = HDdeg();
    P.pitch = -8.5 - 4 * k;
    markDirty();
  }
  function ende(abbruch) {
    if (!S.on) return;
    S.on = false;
    S.ph = '';
    window.removeEventListener('keydown', onKey, true);
    GLSPIEL.hide();
    if (S.meshes) {
      S.meshes.ball.visible = false;
      S.meshes.linie.visible = false;
    }
    aufstellen();
    const punkte = summe(),
      vs = S.vs,
      vp = vs ? N.summe(vs.liste) : 0,
      fertig = !abbruch && S.liste.length >= N.WUERFE;
    let gewonnen = null;
    if (fertig) {
      const best = punkte > (GL.stats.kegel || 0);
      if (best) GL.stats.kegel = punkte;
      if (vs) {
        gewonnen = punkte > vp ? true : punkte < vp ? false : null;
        if (gewonnen) GL.earn(S.einsatz * 2, 'Kegeln');
        else if (gewonnen === null) GL.earn(S.einsatz, 'Kegeln');
        GLHUD.sub(
          vs.name,
          gewonnen
            ? 'Anfängerglück. Nächstes Mal um zwanzig.'
            : gewonnen === null
              ? 'Unentschieden. Das gibt’s doch gar nicht.'
              : 'Danke für die ' + S.einsatz + ' €. Immer wieder gern.',
          3200
        );
      }
      GLHUD.say(
        punkte + ' Holz' + (best ? ' – Bahnrekord!' : ''),
        vs
          ? gewonnen
            ? 'Gewonnen gegen ' + vs.name + ' (' + vp + '): ' + S.einsatz * 2 + ' €.'
            : gewonnen === null
              ? 'Gleichstand mit ' + vs.name + '.'
              : vs.name + ' hat ' + vp + '. Der Einsatz ist weg.'
          : S.neun
            ? S.neun + '× alle Neune!'
            : 'Fünf Wurf in die Vollen.',
        5
      );
    } else if (vs && S.einsatz) PLAY.think('Aufgegeben – der Einsatz bleibt bei ' + vs.name + '.', 2600);
    GL.save();
    tafel();
    const out = {
      punkte,
      wuerfe: S.liste.length,
      liste: S.liste.slice(),
      gegner: vs ? { name: vs.name, punkte: vp, liste: vs.liste.slice() } : null,
      gewonnen,
      abbruch: !fertig,
      neun: S.neun,
    };
    GL.emit('kegeln', out);
    const res = S.res;
    S.res = null;
    if (PLAY.seat && PLAY.seat.kind === 'gl-kegeln') PLAY.stand(true);
    if (res) res(out);
    markDirty(true);
  }
  // Timo, if he stands by
  const timo = () =>
    GLFIG.near(GLORTE.P.kegel[0], GLORTE.P.kegel[1], 16, 'heute').find(F => F.id === 'timo' && F.downT <= 0) || null;
  async function spielen(o = {}) {
    const leer = { punkte: 0, wuerfe: 0, liste: [], gegner: null, gewonnen: null, abbruch: true, neun: 0 };
    if (S.on || !GL.on || GL.era !== 'heute' || !GLORTE.built) return leer;
    bauen();
    if (!S.meshes || PLAY.seated()) return leer;
    let vs = o.gegner ? { name: String(o.gegner), stufe: o.stufe ?? 0.55, liste: [] } : null,
      einsatz = o.einsatz ?? 10;
    if (!o.auto && !o.gegner) {
      // ask: alone, or against Timo for a stake
      const T = timo(),
        opts = [{ t: 'Allein kegeln', s: N.WUERFE + ' Wurf in die Vollen · ' + FEE + ' € in die Bahnkasse' }];
      if (T)
        opts.push({
          t: 'Gegen ' + T.name + ' um ' + einsatz + ' €',
          s: 'abwechselnd, wer mehr Holz hat · dazu ' + FEE + ' € Bahngeld',
          off: GL.geld < einsatz + FEE,
        });
      opts.push({ t: 'Lieber nicht' });
      const i = await GLHUD.wahl(
        'Kegelbahn',
        'Beste Partie bisher: ' + Math.round(GL.stats.kegel || 0) + ' Holz. Du hast ' + GL.geld + ' €.',
        opts
      );
      if (i < 0 || i === opts.length - 1 || !GL.on || S.on) return leer;
      if (T && i === 1) {
        vs = { name: T.name, stufe: 0.55, liste: [] };
        GLHUD.sub(T.name, 'Zehn Euro? Leicht verdientes Geld.', 2400);
      }
    }
    if (!vs) einsatz = 0;
    if (!o.frei && !GL.pay(FEE + einsatz, 'Kegelbahn')) {
      PLAY.think(GLDATA.T.geldFehlt, 2200);
      return leer;
    }
    const KB = GLORTE.KB,
      st = KB.F.xy(0, -2.3);
    Object.assign(S, {
      on: true,
      ph: 'ziel',
      t: 0,
      aim: 0,
      drall: 0,
      dir: 0,
      kraft: 0.7,
      nr: 0,
      liste: [],
      vs,
      dran: 'ich',
      einsatz,
      seed: (o.seed ?? Math.floor(Math.random() * 1e9)) >>> 0,
      auto: o.auto || null,
      wf: null,
      next: null,
      neun: 0,
      camF: -2.3,
      ballS: 0,
      ballX: 0,
      schnell: o.auto ? 2 : 1,
    });
    S.cam.x = st[0];
    S.cam.y = st[1];
    S.cam.z = KB.z + 1.52;
    PLAY.sit({
      kind: 'gl-kegeln',
      x: st[0],
      y: st[1],
      eye: KB.z + 1.52,
      yaw: HDdeg(),
      pitch: -8.5,
      fp: true,
      drive: true,
      keepKeys: true,
      follow: () => S.cam,
      primary: los,
      primaryLabel: () =>
        S.dran !== 'ich'
          ? ''
          : S.ph === 'ziel'
            ? 'Richtung'
            : S.ph === 'richtung'
              ? 'Stopp'
              : S.ph === 'kraft'
                ? 'Wurf!'
                : '',
      leaveLabel: 'Aufhören',
      onLeave: () => ende(true),
    });
    window.addEventListener('keydown', onKey, true);
    GLSPIEL.show({ titel: 'Kegeln' }, taste);
    aufstellen();
    panel();
    GLHUD.say(
      'Kegeln',
      N.WUERFE + ' Wurf in die Vollen' + (vs ? ' gegen ' + vs.name + ' um ' + einsatz + ' €' : ''),
      3
    );
    const pr = new Promise(res => {
      S.res = res;
    });
    if (S.auto) bereit();
    return pr;
  }
  // tests: throw now with these values
  const wurf = v => {
    if (!S.on || S.dran !== 'ich' || !['ziel', 'richtung', 'kraft'].includes(S.ph)) return false;
    werfen({ aim: v.aim || 0, dir: v.dir || 0, drall: v.drall || 0, kraft: v.kraft ?? 0.8 });
    return true;
  };
  const stand = () => ({
    on: S.on,
    ph: S.ph,
    nr: S.nr,
    dran: S.dran,
    liste: S.liste.slice(),
    vs: S.vs ? S.vs.liste.slice() : null,
    aim: S.aim,
    drall: S.drall,
    dir: S.dir,
    kraft: S.kraft,
  });
  GLORTE.hook({
    build() {
      KERN.act({
        id: 'gl:kegeln',
        r: 2.4,
        prio: 0.3,
        label: () =>
          GL.on && GL.era === 'heute' && P.mode === 'walk' && !S.on && !PLAY.seated() ? 'Kegeln (' + FEE + ' €)' : null,
        pos: () => [GLORTE.P.kegel[0], GLORTE.P.kegel[1], GLORTE.KB.z + 1],
        run: () => {
          spielen();
        },
      });
      // the noticeboard by the way in: what there is to do around here
      KERN.act({
        id: 'gl:aushang',
        r: 2.2,
        prio: 0.2,
        label: () =>
          GL.on && GL.era === 'heute' && P.mode === 'walk' && !S.on && !PLAY.seated() ? 'Aushang lesen' : null,
        pos: () => [GLORTE.P.tafel[0], GLORTE.P.tafel[1], GLORTE.gnd(GLORTE.P.tafel[0], GLORTE.P.tafel[1]) + 1.2],
        run: () => {
          GLHUD.wahl(
            'Kegelfreunde Ratscher – Aushang',
            'Freiluftbahn: fünf Wurf in die Vollen, ' +
              FEE +
              ' € in die Bahnkasse. Bahnrekord: ' +
              Math.round(GL.stats.kegel || 0) +
              ' Holz. · Der Verkaufswagen hält ' +
              N.zeitenText() +
              ' am Anger; dort gibt es auch Köder und die Gastkarte für die Talsperre. · Die Angelstelle ist der Steg unter der Tafel an der Staumauer. · Wer die Bahn nass hinterlässt, fegt.',
            [{ t: 'Schließen' }]
          );
        },
      });
      bauen();
      era(GLORTE.era);
    },
    drop() {
      KERN.unact('gl:kegeln');
      KERN.unact('gl:aushang');
      if (S.on) ende(true);
      weg();
    },
    tick,
    era,
  });
  function era(e) {
    if (S.on && e !== 'heute') ende(true);
    const M = S.meshes;
    if (!M) return;
    for (const m of M.pins) m.visible = e === 'heute';
    if (M.tafel) M.tafel.visible = e === 'heute';
  }
  return Object.assign(S, { spielen, taste, wurf, stand, los, FEE });
})();
window.GLKEGELN = GLKEGELN;
