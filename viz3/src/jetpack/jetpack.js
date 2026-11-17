// ===================== feat/jetpack: a jetpack to put on – fly high and far, see the land from above, fly to a place by itself (JET) =====================
// Falko, 17.11.2026 14:5x: „… eine Funktion, dass ich mir einen Jetpack anlegen kann und hoch und weit fliegen kann und übersichtlich sehen
// kann, optional. Das soll einfach nur dazu helfen, dass lange Strecken auch ohne Autos schnell überwunden werden können und ich einen
// Überblick sehen kann über der Stadt … Das soll cool aussehen, Spaß machen und einfach dienen, um schnell herumzureisen.“
// Put on with 9, the button „Jetpack“ at the top right or Menü → Hingehen → Fliegen; the figure wears it on its back.
//   Space  take off, climb            C  sink              W/A/S/D  fly as one walks, the mouse turns       Shift  fast
//   wheel (two fingers on a phone)    the camera back up to 400 m: the overview, with the names of the places
//   „Ziel“ in the flight panel        it flies there by itself – up, straight on above the hills, down; any key takes over again
//   9                                 take it off (in the air it lands first)
// Down on the ground it stays on the back (walk on, Space takes off again). Speed after the height above the ground: 24 m/s (86 km/h) low,
// with Shift 45 m/s below 40 m, 90 m/s below 150 m, 160 m/s (576 km/h) above – far ways in a minute or two, the world streams after it.
// Only where the world has ground (WELT.covers, or the 2.4 km square), only in the game itself – not in the zombie night or Grenzland.
// The game's walking physics (game/game.js physics) hands the figure to JET.physics while it flies (hook J1); the camera is the third-person
// one, pulled back (CAM3.d, and CAM3.MAX for the time of the flight). The pack is geometry of its own (tanks, nozzles, flames that grow
// with the thrust, a glow), set behind the figure's chest every frame; the sound a filtered roar on the game's sound bus. No light of its
// own, no texture but two small canvases (the glow, the place names).
import * as THREE from 'three';
import { KERN } from '../core/kern.js';
import { cam, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { blocked, P } from '../game/walkable.js';
import { CAM3, setView3 } from '../game/player.js';
import { joy, keys } from '../game/input.js';
import { audio, toast } from '../audio/audio.js';

export const JET = (() => {
  const S = {
    worn: false,
    flying: false,
    v: [0, 0, 0], // m/s: x, y (the world's), up
    thrust: 0, // 0 … 1 what the flames show
    up: 0,
    down: 0,
    boost: false,
    auto: null, // { name, label, x, y, phase }
    cam: null, // CAM3.d and CAM3.MAX before the flight
    t: 0,
  };
  const SPEED = { low: 24, fast: [45, 90, 160], climb: 9, climbFast: 18, sink: 14, ceil: 1200 };
  // the places one can fly to (KERN.spot names → how the panel names them)
  const DEST = [
    ['garten', 'Garten'],
    ['dorf', 'Ratscher'],
    ['schleusingen', 'Schleusingen'],
    ['vessra', 'Kloster Veßra'],
    ['suhl', 'Suhl, Markt'],
    ['suhl_bahnhof', 'Suhl, Bahnhof'],
    ['suhl_ccs', 'Suhl, Congress Centrum'],
  ];

  // ---- where one may be: not in the special worlds, not in a vehicle, not seated ----
  // the zombie night, Grenzland, the future mode and its time-lapse keep their own rules
  const special = () => {
    try {
      return !!(
        (window.ZSTATE && window.ZSTATE.on) ||
        (window.GLSTATE && window.GLSTATE.on) ||
        (window.ZUKUNFT && window.ZUKUNFT.S && window.ZUKUNFT.S.on) ||
        (window.ZKREGIE && window.ZKREGIE.state && window.ZKREGIE.state().on)
      );
    } catch (e) {
      return false;
    }
  };
  const free = () =>
    P.mode === 'walk' &&
    !(window.VEH && window.VEH.cur) &&
    !(window.PLAY && window.PLAY.seated && window.PLAY.seated());
  // the map: the 2.4 km square, where one may walk (the tiled world, Suhl), and wherever the land around has a height (the far terrain
  // of the region: the way to Suhl, Schleusingen, Kloster Veßra); welt/fahrt.js wakes the tiles as soon as the figure is outside the square
  const inside = (x, y) => {
    if (Math.abs(x) < 1190 && Math.abs(y) < 1190) return true;
    try {
      if (KERN.free(x, y)) return true;
    } catch (e) {}
    return ground(x, y, 9999) !== null;
  };
  function ground(x, y, z) {
    let g = null;
    try {
      g = KERN.ground(x, y, z);
    } catch (e) {}
    if (!Number.isFinite(g) && window.WELT && window.WELT.heightAt) g = window.WELT.heightAt(x, y);
    return Number.isFinite(g) ? g : null;
  }

  // ---- the pack: geometry in its own frame (x right, y up, z behind the figure) ----
  const G = new THREE.Group();
  G.name = 'jetpack';
  G.visible = false;
  G.userData.noMerge = true;
  const M = {
    tank: new THREE.MeshStandardMaterial({ color: 0xc3c9cf, metalness: 0.85, roughness: 0.32 }),
    body: new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.4, roughness: 0.55 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xff6a13, metalness: 0.2, roughness: 0.45, emissive: 0x401400 }),
    nozzle: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.9, roughness: 0.4 }),
    strap: new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0, roughness: 0.9 }),
    flameOut: new THREE.MeshBasicMaterial({
      color: 0xff7a22,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    flameIn: new THREE.MeshBasicMaterial({
      color: 0xfff1c4,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    G.add(m);
    return m;
  };
  const tankG = new THREE.CylinderGeometry(0.085, 0.085, 0.44, 20),
    capG = new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    ringG = new THREE.CylinderGeometry(0.089, 0.089, 0.035, 20),
    nozG = new THREE.CylinderGeometry(0.05, 0.072, 0.11, 18, 1, true),
    nozInG = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 14);
  const flames = [],
    glows = [];
  // the glow: a soft round sprite at each nozzle (one small canvas)
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'),
      r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,240,200,1)');
    r.addColorStop(0.35, 'rgba(255,150,60,0.7)');
    r.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  for (const sx of [-1, 1]) {
    const x = sx * 0.115;
    add(tankG, M.tank, x, 0.0, 0.17);
    add(capG, M.tank, x, 0.22, 0.17);
    add(ringG, M.accent, x, 0.12, 0.17);
    add(ringG, M.accent, x, -0.14, 0.17);
    const n = add(nozG, M.nozzle, x, -0.275, 0.17, 0, sx * 0.08);
    n.castShadow = false;
    add(nozInG, M.flameIn, x, -0.33, 0.17).castShadow = false;
    // the flame: two nested cones from the nozzle down, their length after the thrust
    const fl = new THREE.Group();
    fl.position.set(x + sx * 0.012, -0.335, 0.17);
    fl.rotation.z = sx * 0.08;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.065, 1, 16, 1, true), M.flameOut),
      inner = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.62, 12, 1, true), M.flameIn);
    // a cone points up (+y): turned over, its tip downwards, the base at the nozzle
    outer.rotation.x = Math.PI;
    outer.position.y = -0.5;
    inner.rotation.x = Math.PI;
    inner.position.y = -0.31;
    outer.renderOrder = inner.renderOrder = 5;
    fl.add(outer, inner);
    G.add(fl);
    flames.push(fl);
    const gl = new THREE.Sprite(glowMat);
    gl.position.set(x, -0.38, 0.17);
    gl.scale.setScalar(0.3);
    gl.renderOrder = 6;
    G.add(gl);
    glows.push(gl);
  }
  // the frame between the tanks, its back plate with the stripe, the shoulder straps
  add(new THREE.BoxGeometry(0.15, 0.4, 0.09), M.body, 0, 0.02, 0.12);
  add(new THREE.BoxGeometry(0.34, 0.06, 0.12), M.body, 0, 0.19, 0.14);
  add(new THREE.BoxGeometry(0.34, 0.05, 0.12), M.body, 0, -0.2, 0.14);
  add(new THREE.BoxGeometry(0.05, 0.3, 0.005), M.accent, 0, 0.02, 0.166);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.045, 0.32, 0.012), M.strap, sx * 0.1, 0.12, 0.075, -0.12, 0);
    add(new THREE.BoxGeometry(0.045, 0.012, 0.2), M.strap, sx * 0.1, 0.27, -0.02, 0, 0);
  }
  scene.add(G);

  // ---- the names of the places, seen from high up (the overview) ----
  const LBL = new THREE.Group();
  LBL.visible = false;
  LBL.name = 'jetpack ortsnamen';
  scene.add(LBL);
  function label(text) {
    const c = document.createElement('canvas'),
      g = c.getContext('2d'),
      fs = 44;
    g.font = '600 ' + fs + 'px system-ui, sans-serif';
    const w = Math.ceil(g.measureText(text).width) + 36;
    c.width = w;
    c.height = fs + 26;
    g.font = '600 ' + fs + 'px system-ui, sans-serif';
    g.fillStyle = 'rgba(20,24,30,0.62)';
    const r = (fs + 26) / 2;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(w, 0, w, c.height, r);
    g.arcTo(w, c.height, 0, c.height, r);
    g.arcTo(0, c.height, 0, 0, r);
    g.arcTo(0, 0, w, 0, r);
    g.fill();
    g.fillStyle = '#fff';
    g.textBaseline = 'middle';
    g.fillText(text, 18, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: t,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
        transparent: true,
      })
    );
    const h = 0.034;
    sp.scale.set((h * c.width) / c.height, h, 1);
    sp.renderOrder = 20;
    return sp;
  }
  let labelsMade = false;
  function makeLabels() {
    if (labelsMade) return;
    labelsMade = true;
    for (const [k, name] of [
      ['garten', 'Garten'],
      ['dorf', 'Ratscher'],
      ['schleusingen', 'Schleusingen'],
      ['vessra', 'Kloster Veßra'],
      ['suhl', 'Suhl'],
    ]) {
      const s = KERN.spot(k);
      if (!s || !s.pos) continue;
      const sp = label(name);
      sp.userData.at = [s.pos[0], s.pos[1]];
      LBL.add(sp);
    }
  }

  // ---- the sound: a filtered roar and a low rumble on the game's sound bus ----
  let SND = null;
  function sound(on) {
    const r = audio.raw && audio.ready && audio.ready() ? audio.raw() : null;
    if (!r) return;
    const c = r.ctx;
    if (on && !SND) {
      const n = c.sampleRate * 2,
        b = c.createBuffer(1, n, c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 700;
      bp.Q.value = 0.6;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 160;
      const gHi = c.createGain(),
        gLo = c.createGain(),
        out = c.createGain();
      gHi.gain.value = 0;
      gLo.gain.value = 0;
      out.gain.value = 0;
      src.connect(bp).connect(gHi).connect(out);
      src.connect(lp).connect(gLo).connect(out);
      out.connect(r.sfx);
      src.start();
      SND = { c, src, bp, gHi, gLo, out };
      // the whoosh of the start
      out.gain.setTargetAtTime(0.9, c.currentTime, 0.05);
    } else if (!on && SND) {
      const s = SND;
      SND = null;
      s.out.gain.setTargetAtTime(0, s.c.currentTime, 0.25);
      setTimeout(() => {
        try {
          s.src.stop();
          s.out.disconnect();
        } catch (e) {}
      }, 1500);
    }
  }
  function soundTick() {
    if (!SND) return;
    const c = SND.c,
      t = c.currentTime,
      k = S.thrust,
      far = 1 / (1 + Math.max(0, CAM3.cur - 4) / 25);
    SND.bp.frequency.setTargetAtTime(420 + 1100 * k, t, 0.08);
    SND.gHi.gain.setTargetAtTime((0.05 + 0.32 * k) * far, t, 0.08);
    SND.gLo.gain.setTargetAtTime((0.12 + 0.5 * k) * far, t, 0.1);
    SND.out.gain.setTargetAtTime(0.9, t, 0.3);
  }

  // ---- the panel while worn: height, speed, the destination; the buttons on a phone ----
  const st = document.createElement('style');
  st.textContent = `
#jetpanel{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:4;display:flex;
  gap:8px;align-items:center;font:500 13px/1.2 var(--f-body,system-ui);color:var(--ov-ink,#fff);background:var(--ov-bg,rgba(20,24,30,.6));
  border-radius:999px;padding:7px 8px 7px 14px;backdrop-filter:blur(6px);pointer-events:auto;white-space:nowrap}
#jetpanel[hidden],#jetdest[hidden],#jetmoves[hidden],#jetpanel button[hidden]{display:none}
#jetpanel b{font-weight:600}#jetpanel .jk{opacity:.72;font-size:12px}
#jetpanel button,#jetdest button{font:500 13px/1 var(--f-body,system-ui);border:0;border-radius:999px;padding:8px 12px;cursor:pointer;
  background:rgba(255,255,255,.16);color:inherit}
#jetpanel button[aria-pressed="true"]{background:#ff6a13;color:#fff}
#jetdest{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(126px + env(safe-area-inset-bottom,0px));z-index:5;display:grid;
  gap:6px;grid-template-columns:repeat(2,minmax(120px,1fr));background:var(--ov-bg,rgba(20,24,30,.7));border-radius:16px;padding:10px;
  backdrop-filter:blur(6px);pointer-events:auto;color:var(--ov-ink,#fff)}
#jetmoves{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:4;
  display:grid;gap:10px;pointer-events:auto}
#jetmoves button{width:56px;height:56px;border-radius:50%;border:0;background:var(--ov-bg,rgba(20,24,30,.6));color:var(--ov-ink,#fff);
  display:grid;place-items:center;font:600 20px/1 system-ui;backdrop-filter:blur(6px);touch-action:none;-webkit-user-select:none;user-select:none}
#jetmoves button.on{background:#ff6a13}
#jetbtn[aria-pressed="true"]{background:#ff6a13;color:#fff}
@media (max-width:640px){#jetpanel .jk,#jetpanel .jg{display:none}
  #jetpanel{left:12px;right:84px;transform:none;flex-wrap:wrap;justify-content:center;border-radius:18px;white-space:normal;
    bottom:calc(196px + env(safe-area-inset-bottom,0px));padding:8px}
  #jetdest{left:12px;right:84px;transform:none;grid-template-columns:1fr 1fr;bottom:calc(300px + env(safe-area-inset-bottom,0px))}}`;
  document.head.appendChild(st);
  const panel = document.createElement('div');
  panel.id = 'jetpanel';
  panel.className = 'ov';
  panel.hidden = true;
  panel.innerHTML =
    '<span id="jetinfo"></span><span class="jk">Leertaste hoch · C runter · Shift schnell · Mausrad weit · 9 ab</span>' +
    '<button type="button" id="jetblick" aria-pressed="false">Übersicht</button>' +
    '<button type="button" id="jetziel" aria-pressed="false">Ziel</button><button type="button" id="jetaus">Ablegen</button>';
  const dest = document.createElement('div');
  dest.id = 'jetdest';
  dest.hidden = true;
  const moves = document.createElement('div');
  moves.id = 'jetmoves';
  moves.hidden = true;
  moves.innerHTML =
    '<button type="button" data-j="up" aria-label="Hoch">▲</button><button type="button" data-j="boost" aria-label="Schnell">»</button>' +
    '<button type="button" data-j="down" aria-label="Runter">▼</button>';
  function mount() {
    const host = document.getElementById('p-3d') || document.body;
    if (!panel.parentNode) host.appendChild(panel);
    if (!dest.parentNode) host.appendChild(dest);
    if (!moves.parentNode) host.appendChild(moves);
    // the button at the top right, before the menu
    const bar = document.getElementById('hudtr'),
      mb = document.getElementById('menubtn');
    if (bar && !document.getElementById('jetbtn')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hb';
      b.id = 'jetbtn';
      b.title = 'Jetpack anlegen und fliegen (9)';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML =
        '<span class="hbi"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4.6" height="11" rx="2.3"/>' +
        '<rect x="13.4" y="4" width="4.6" height="11" rx="2.3"/><path d="M8.3 16.5l-1 3.5M15.7 16.5l1 3.5M10.6 7.5h2.8"/></svg></span>' +
        '<span class="hbt">Jetpack</span>';
      b.addEventListener('click', () => toggle());
      bar.insertBefore(b, mb || null);
    }
    // the menu: Hingehen → Fliegen
    const pg = document.querySelector('#menu [data-page="orte"]');
    if (pg && !document.getElementById('jetmenu')) {
      const sec = document.createElement('section');
      sec.className = 'msec';
      sec.id = 'jetmenu';
      sec.setAttribute('aria-label', 'Fliegen');
      sec.innerHTML =
        '<h3>Fliegen</h3><div class="mchips"><button class="chip" type="button" data-jet="1" aria-pressed="false" ' +
        'title="Jetpack anlegen: Leertaste hoch, C runter, Shift schnell, Mausrad für die Übersicht">Jetpack</button></div>';
      sec.querySelector('[data-jet]').addEventListener('click', () => {
        if (window.HUD && window.HUD.open) window.HUD.setMenu(false);
        toggle();
      });
      pg.insertBefore(sec, pg.children[1] || null);
    }
    for (const [k, name] of DEST) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.dataset.dest = k;
      b.addEventListener('click', () => flyTo(k, name));
      dest.appendChild(b);
    }
    panel.querySelector('#jetziel').addEventListener('click', () => {
      if (S.auto) {
        stopAuto('Selbst fliegen.');
        return;
      }
      dest.hidden = !dest.hidden;
    });
    panel.querySelector('#jetaus').addEventListener('click', () => toggle(false));
    panel.querySelector('#jetblick').addEventListener('click', () => overview());
    for (const b of moves.querySelectorAll('button')) {
      const k = b.dataset.j,
        on = v => {
          if (k === 'up') S.tUp = v;
          else if (k === 'down') S.tDown = v;
          else S.tBoost = v;
          b.classList.toggle('on', v);
        };
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        on(true);
        if (k === 'up' && S.worn && !S.flying) takeOff();
      });
      for (const t of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(t, () => on(false));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  const touch = () => {
    const mv = document.getElementById('moves');
    return !!(mv && getComputedStyle(mv).display !== 'none') || matchMedia('(pointer: coarse)').matches;
  };
  function ui() {
    panel.hidden = !S.worn;
    if (!S.worn) dest.hidden = true;
    const jb = document.getElementById('jetbtn');
    if (jb) {
      jb.setAttribute('aria-pressed', S.worn ? 'true' : 'false');
      jb.hidden = !S.worn && (special() || !free());
    }
    const mc = document.querySelector('#jetmenu [data-jet]');
    if (mc) mc.setAttribute('aria-pressed', S.worn ? 'true' : 'false');
    const zb = document.getElementById('jetziel');
    if (zb) {
      zb.setAttribute('aria-pressed', S.auto ? 'true' : 'false');
      zb.textContent = S.auto ? 'Selbst fliegen' : 'Ziel';
    }
    const ob = document.getElementById('jetblick');
    if (ob) {
      ob.hidden = !S.flying;
      ob.setAttribute('aria-pressed', S.flying && CAM3.d >= 60 ? 'true' : 'false');
    }
    const t = S.worn && touch();
    moves.hidden = !t;
    const mv = document.getElementById('moves');
    if (mv) mv.style.visibility = t && S.flying ? 'hidden' : '';
  }

  // ---- keys: 9 on and off, Space up (also the take-off), C down – ahead of the walking keys while worn ----
  window.addEventListener(
    'keydown',
    e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === '9' && !e.repeat && P.mode === 'walk') {
        toggle();
        e.preventDefault();
        return;
      }
      if (!S.worn) return;
      if (k === ' ') {
        S.kUp = true;
        if (!S.flying && !e.repeat) takeOff();
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (k === 'c' && S.flying) {
        S.kDown = true;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === ' ') S.kUp = false;
    else if (k === 'c') S.kDown = false;
  });
  window.addEventListener('blur', () => (S.kUp = S.kDown = false));
  // the wheel in flight: the camera back by bigger steps than walking (6 m → 400 m in a dozen notches)
  window.addEventListener(
    'wheel',
    e => {
      if (!S.flying || !e.target || e.target.tagName !== 'CANVAS' || e.ctrlKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      CAM3.d = THREE.MathUtils.clamp(CAM3.d * Math.exp(e.deltaY * 0.0035), 2, CAM3.MAX);
      markDirty();
    },
    { capture: true, passive: false }
  );
  // „Übersicht“: high up behind the figure and back
  function overview(on) {
    if (!S.flying) return;
    const want = on === undefined ? CAM3.d < 60 : !!on;
    CAM3.d = want ? 220 : 8;
    if (!want && P.pitch < -20) P.pitch = -12;
    ui();
    markDirty();
  }

  // ---- on, off, up ----
  function toggle(want) {
    const on = want === undefined ? !S.worn : !!want;
    if (on === S.worn) return S.worn;
    if (on) {
      if (special()) {
        toast('Der Jetpack bleibt in dieser Welt im Schrank.');
        return false;
      }
      if (!free()) {
        toast('Erst aussteigen oder aufstehen, dann den Jetpack anlegen.');
        return false;
      }
      S.worn = true;
      if (!CAM3.want && window.AVATAR && window.AVATAR.ready) setView3(true, true);
      toast('Jetpack angelegt – Leertaste zum Abheben' + (touch() ? ' (▲)' : '') + '.', 4200);
    } else {
      if (S.flying) land(true);
      S.worn = false;
      S.auto = null;
      toast('Jetpack abgelegt.');
    }
    G.visible = S.worn;
    ui();
    KERN.emit('jetpack', { worn: S.worn });
    markDirty(true);
    return S.worn;
  }
  function takeOff() {
    if (!S.worn || S.flying || !free()) return;
    S.flying = true;
    S.v = [0, 0, 6];
    S.t = 0;
    S.cam = { d: CAM3.d, max: CAM3.MAX };
    CAM3.MAX = 400;
    CAM3.d = Math.max(CAM3.d, 6);
    P.stance = 'stand';
    makeLabels();
    sound(true);
    ui();
    KERN.emit('jetpack', { worn: true, flying: true });
    markDirty(true);
  }
  function land(quiet) {
    if (!S.flying) return;
    S.flying = false;
    const g = ground(P.x, P.y, P.feet + 1);
    if (g !== null && P.feet - g < 3) P.feet = g;
    P.vz = Math.min(0, S.v[2]);
    P.air = P.feet > (g === null ? P.feet : g) + 0.01;
    P.airT = 0;
    S.v = [0, 0, 0];
    S.thrust = 0;
    if (S.cam) {
      CAM3.MAX = S.cam.max;
      CAM3.d = Math.min(S.cam.d, S.cam.max);
      S.cam = null;
    }
    LBL.visible = false;
    if (P.pitch < -20) P.pitch = -8;
    sound(false);
    if (!quiet && S.auto) toast('Angekommen: ' + S.auto.label + '.', 4000);
    S.auto = null;
    ui();
    KERN.emit('jetpack', { worn: S.worn, flying: false });
    markDirty(true);
  }

  // ---- by itself to a place: up above the hills, straight on, down ----
  function flyTo(k, name) {
    const s = KERN.spot(k);
    dest.hidden = true;
    if (!s || !s.pos) {
      toast('Diesen Ort kenne ich nicht.');
      return;
    }
    if (!S.worn) toggle(true);
    if (!S.worn) return;
    S.auto = { k, label: name, x: s.pos[0], y: s.pos[1], yaw: Number.isFinite(s.yaw) ? s.yaw : null };
    if (!S.flying) takeOff();
    toast('Fliegt nach ' + name + ' – jede Taste übernimmt wieder.', 4000);
    ui();
  }
  function stopAuto(msg) {
    if (!S.auto) return;
    S.auto = null;
    if (msg) toast(msg);
    ui();
  }

  // ---- the flight (game/game.js physics, hook J1): the figure at P, as walking ----
  const ang = a => {
    while (a > 180) a -= 360;
    while (a < -180) a += 360;
    return a;
  };
  function physics(dt, f, turn, side, run) {
    S.t += dt;
    const touchUp = !!S.tUp,
      touchDown = !!S.tDown;
    let up = S.kUp || touchUp ? 1 : 0,
      down = S.kDown || touchDown ? 1 : 0;
    const boost = run > 1.2 || !!S.tBoost;
    if (S.auto && (f || side || turn || up || down)) stopAuto('Selbst fliegen.');
    if (turn) P.yaw += turn * 95 * dt;
    const g = ground(P.x, P.y, P.feet + 2),
      h = g === null ? 50 : P.feet - g;
    let vt;
    if (S.auto) {
      // the destination: turn towards it, climb to 140 m above the highest ground ahead, then fly; down near it
      const A = S.auto,
        dx = A.x - P.x,
        dy = A.y - P.y,
        d = Math.hypot(dx, dy),
        want = (Math.atan2(dx, dy) * 180) / Math.PI;
      if (d > 3) P.yaw += THREE.MathUtils.clamp(ang(want - P.yaw), -120 * dt, 120 * dt);
      let ahead = g === null ? P.feet : g;
      for (const k of [60, 150, 300])
        if (d > k) {
          const a = ground(P.x + (dx / d) * k, P.y + (dy / d) * k, 9999);
          if (a !== null) ahead = Math.max(ahead, a);
        }
      const gT = ground(A.x, A.y, 9999),
        cruise = Math.max(ahead, gT === null ? ahead : gT) + 140,
        near = d < 450;
      const zT = near ? (gT === null ? P.feet : gT) + Math.max(0, (d - 15) * 0.32) : cruise,
        dz = zT - P.feet;
      up = 0;
      down = 0;
      S.autoVz = THREE.MathUtils.clamp(dz * 0.8, -SPEED.sink, SPEED.climbFast);
      const high = P.feet - ahead > 60,
        sp = near ? Math.max(3, Math.min(60, d * 0.22)) : high ? SPEED.fast[2] : 25,
        fx = dx / Math.max(d, 1e-3),
        fy = dy / Math.max(d, 1e-3);
      vt = [fx * sp, fy * sp];
      if (d < 4 && Math.abs(dz) < 1.5) {
        if (A.yaw !== null) P.yaw = A.yaw;
        land(false);
        return;
      }
    } else {
      const y = (P.yaw * Math.PI) / 180,
        n = Math.max(1, Math.hypot(f, side)),
        nf = f / n,
        ns = side / n,
        vmax = boost ? (h < 40 ? SPEED.fast[0] : h < 150 ? SPEED.fast[1] : SPEED.fast[2]) : SPEED.low;
      vt = [(Math.sin(y) * nf + Math.cos(y) * ns) * vmax, (Math.cos(y) * nf - Math.sin(y) * ns) * vmax];
    }
    // horizontal: towards the wanted speed (quicker with boost), vertical: climb, sink or hover
    const kh = Math.min(1, dt * (boost || S.auto ? 1.4 : 1.9));
    S.v[0] += (vt[0] - S.v[0]) * kh;
    S.v[1] += (vt[1] - S.v[1]) * kh;
    const vzT = S.auto
      ? S.autoVz
      : up
        ? boost
          ? SPEED.climbFast
          : SPEED.climb
        : down
          ? -SPEED.sink
          : Math.sin(S.t * 2.1) * 0.25; // hovering bobs a little
    S.v[2] += (vzT - S.v[2]) * Math.min(1, dt * 2.6);
    // move: inside the world only, not through the garden's and the village's walls when low
    let nx = P.x + S.v[0] * dt,
      ny = P.y + S.v[1] * dt;
    if (!inside(nx, ny)) {
      S.v[0] = S.v[1] = 0;
      nx = P.x;
      ny = P.y;
      if (!S.edgeT || S.t - S.edgeT > 4) {
        S.edgeT = S.t;
        toast('Hier endet die Karte.');
      }
      if (S.auto) stopAuto();
    } else if (h < 12 && blocked(nx, ny, P.feet)) {
      if (!blocked(nx, P.y, P.feet)) ny = P.y;
      else if (!blocked(P.x, ny, P.feet)) nx = P.x;
      else {
        nx = P.x;
        ny = P.y;
      }
    }
    const hs = Math.hypot(nx - P.x, ny - P.y) / Math.max(dt, 1e-4);
    P.x = nx;
    P.y = ny;
    let z = P.feet + S.v[2] * dt;
    const g2 = ground(P.x, P.y, z + 2);
    if (g2 !== null) {
      if (z <= g2) {
        z = g2;
        if (S.v[2] < 0) S.v[2] = 0;
        // down on the ground and not climbing: landed – walking takes over, the pack stays on
        if (!up && !S.auto && hs < 4 && S.t > 0.8) {
          P.feet = z;
          land(true);
          return;
        }
      }
      z = Math.min(z, g2 + SPEED.ceil);
    }
    P.feet = z;
    // the figure in the air: faces where it flies (or the view, hovering), the in-air pose of game/avatar.js
    const want = hs > 1.5 ? (Math.atan2(S.v[0], S.v[1]) * 180) / Math.PI : P.yaw;
    P.body += ang(want - P.body) * Math.min(1, dt * 6);
    P.stance = 'stand';
    P.air = true;
    P.airT = 1;
    P.vz = Math.max(0.5, S.v[2]);
    P.speed = hs;
    P.landT = 0;
    // the overview: the further back the camera, the more it looks down (up to 55°) – the view may still go lower
    const pv = -Math.min(55, Math.max(0, (CAM3.d - 10) * 0.35));
    if (P.pitch > pv) P.pitch += (pv - P.pitch) * Math.min(1, dt * 2.5);
    S.thrust = THREE.MathUtils.clamp(
      0.25 + 0.35 * (hs / SPEED.fast[1]) + (vzT > 1 ? 0.35 : 0) + (boost || (S.auto && hs > 40) ? 0.25 : 0),
      0.2,
      1
    );
    markDirty();
  }

  // ---- per frame, after the figure is posed: the pack on its back, the flames, the names, the panel ----
  const _v = new THREE.Vector3(),
    _w = new THREE.Vector3();
  let uiT = 0;
  KERN.tick(
    dt => {
      if (!S.worn) return;
      if (S.flying && (special() || !free())) land(true);
      const F = window.AVATAR && window.AVATAR.fig,
        shown = !!(F && F.g && F.g.visible);
      G.visible = shown;
      if (shown) {
        // the chest of the figure as it was drawn last, moved with the figure since (its root is where it stands now)
        const B = F.B && (F.B.Spine2 || F.B.Spine1 || F.B.Spine);
        let y = P.feet + 1.32;
        if (B && B.matrixWorld) {
          _v.setFromMatrixPosition(B.matrixWorld);
          _w.setFromMatrixPosition(F.g.matrixWorld);
          y = F.g.position.y + (_v.y - _w.y);
        }
        const b = (P.body * Math.PI) / 180;
        G.position.set(P.x, y - 0.05, -P.y);
        G.rotation.set(S.flying ? -Math.min(0.35, P.speed / 140) : 0, -b, 0, 'YXZ');
        // the flames after the thrust, flickering; none on the ground
        const k = S.flying ? S.thrust : 0,
          fl = 0.85 + Math.random() * 0.3;
        for (const f of flames) {
          f.visible = k > 0.02;
          f.scale.set(0.8 + k * 0.5, 0.25 + k * 1.35 * fl, 0.8 + k * 0.5);
        }
        for (const gsp of glows) {
          gsp.visible = k > 0.02;
          gsp.scale.setScalar(0.22 + k * 0.4 * fl);
        }
      }
      // the overview: the names of the places when the camera is far back
      const over = S.flying && CAM3.cur > 45;
      LBL.visible = over;
      if (over)
        for (const sp of LBL.children) {
          const [x, y] = sp.userData.at,
            g = ground(x, y, 9999);
          sp.position.set(x, (g === null ? 400 : g) + 70, -y);
        }
      soundTick();
      if ((uiT -= dt) <= 0) {
        uiT = 0.25;
        const g = ground(P.x, P.y, P.feet + 2),
          h = g === null ? 0 : Math.max(0, P.feet - g),
          kmh = Math.round(P.speed * 3.6);
        let s = S.flying
          ? '<b>' + Math.round(h) + ' m</b><span class="jg"> über Grund</span> · <b>' + kmh + ' km/h</b>'
          : '<b>Jetpack</b> · am Boden';
        if (S.auto) {
          const d = Math.hypot(S.auto.x - P.x, S.auto.y - P.y);
          s +=
            ' · nach ' +
            S.auto.label +
            ' ' +
            (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
        }
        const el = document.getElementById('jetinfo');
        if (el && el.innerHTML !== s) el.innerHTML = s;
        ui();
      }
      if (S.flying) markDirty();
    },
    'jetpack',
    { late: true }
  );
  // the button at the top right only where it can be used
  KERN.tick(
    (() => {
      let t = 0;
      return dt => {
        if ((t -= dt) > 0) return;
        t = 0.5;
        const jb = document.getElementById('jetbtn');
        if (jb) jb.hidden = !S.worn && (special() || !free());
      };
    })(),
    'jetpack-knopf'
  );

  return {
    S,
    SPEED,
    DEST,
    toggle,
    takeOff,
    land,
    flyTo,
    stopAuto,
    overview,
    physics,
    get worn() {
      return S.worn;
    },
    get flying() {
      return S.flying;
    },
    state: () => ({
      worn: S.worn,
      flying: S.flying,
      auto: S.auto ? S.auto.k : null,
      v: S.v.map(v => +v.toFixed(2)),
      thrust: +S.thrust.toFixed(2),
      cam: +CAM3.cur.toFixed(1),
      labels: LBL.visible,
      pack: G.visible,
      pitch: +P.pitch.toFixed(1),
      h: +P.feet.toFixed(1),
    }),
  };
})();
window.JET = JET;
