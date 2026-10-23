// ===================== V15 HUD and menu: what used to sit in button rows is in one menu (☰, Esc, M); while playing only a HUD: =====================
// the bar of things (inventory places 1–8, the bag), the action buttons above it, the task at the top and on touch screens the moves.
// Also here: the inventory window (I), pictures of the things rendered from their 3D models, the captured mouse (pointer lock).
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { $, cam, COARSE, R, scene } from '../core/head.js';
import { LOAD, markDirty } from '../core/assets.js';
import { phase } from '../core/geo.js';
import { P } from './walkable.js';
import { CAM3, setView3 } from './player.js';
import { cv, keys, look, ray } from './input.js';
import { news, toast } from '../audio/audio.js';
import { PLAN } from '../pavilion/plan.js';
import { SITEPLAN } from '../world/siteplan.js';
import { PLAY } from './play.js';
import { PIANO } from '../audio/music.js';
import { QUESTS } from './quests.js';
import { KERN } from '../core/kern.js';
phase(null);
// ---- pictures of the things: their own 3D model, lit from the front, rendered once into a small image (cached) ----
const ICON = (() => {
  const cache = new Map();
  let rt = null,
    sc = null,
    cm = null,
    busy = false;
  const queue = [];
  const SZ = 192,
    OUT = 96,
    HIGH = 400; // rendered far above the site, where no sky-visibility or light volume reaches
  // an 8-bit target that three treats like an XR target: tone mapping and sRGB encoding happen in the shader, the bytes can be read directly
  function setup() {
    rt = new THREE.WebGLRenderTarget(SZ, SZ, { type: THREE.UnsignedByteType, depthBuffer: true });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    rt.isXRRenderTarget = true;
    sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfff4e4, 0x4e463e, 1.25));
    const d = new THREE.DirectionalLight(0xfff1de, 2.6);
    sc.add(d, d.target);
    const d2 = new THREE.DirectionalLight(0xc6d6ff, 0.9);
    sc.add(d2, d2.target);
    sc.userData.lights = [d, d2];
    cm = new THREE.PerspectiveCamera(24, 1, 0.01, 50);
  }
  const srcOf = T =>
    (T.icon3d && T.icon3d()) ||
    (T.held && T.held.children.length ? T.held : T.world && T.world.children.length ? T.world : null);
  const keyOf = T => T.id + ':' + (T.iconKey ? T.iconKey() : '') + ':' + (srcOf(T) ? srcOf(T).children.length : 0);
  function draw(T) {
    const src = srcOf(T);
    if (!src) return null;
    if (!rt) setup();
    const obj = src.clone(true);
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.set(1, 1, 1);
    obj.visible = true;
    obj.traverse(o => {
      o.visible = true;
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    const g = new THREE.Group();
    g.add(obj);
    const r0 = T.iconRot || [-0.42, 0.75, 0];
    g.rotation.set(r0[0], r0[1], r0[2], 'YXZ');
    g.position.set(0, HIGH, 0);
    sc.add(g);
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    if (bb.isEmpty()) {
      sc.remove(g);
      return null;
    }
    const c = bb.getCenter(new THREE.Vector3()),
      sz = bb.getSize(new THREE.Vector3());
    const rad = Math.max(0.02, Math.hypot(sz.x, sz.y, sz.z) * 0.5),
      dist = (rad / Math.sin((cm.fov * Math.PI) / 360)) * 1.02;
    cm.position.set(c.x, c.y + dist * 0.12, c.z + dist);
    cm.lookAt(c);
    cm.near = dist * 0.05;
    cm.far = dist * 4;
    cm.updateProjectionMatrix();
    const [l0, l1] = sc.userData.lights;
    for (const l of [l0, l1]) {
      l.target.position.copy(c);
      l.target.updateMatrixWorld();
    }
    l0.position.set(c.x + 2.5 * rad, c.y + 3.5 * rad, c.z + 4 * rad);
    l1.position.set(c.x - 3 * rad, c.y + 1.2 * rad, c.z - 2.5 * rad);
    sc.environment = scene.environment;
    sc.environmentIntensity = 0.85;
    if (scene.environmentRotation) sc.environmentRotation.copy(scene.environmentRotation);
    const pRT = R.getRenderTarget(),
      pCol = new THREE.Color();
    R.getClearColor(pCol);
    const pA = R.getClearAlpha(),
      pAC = R.autoClear,
      pTM = R.toneMapping,
      pTE = R.toneMappingExposure;
    let data = null;
    try {
      R.setRenderTarget(rt);
      R.setClearColor(0x000000, 0);
      R.autoClear = true;
      R.toneMapping = THREE.NeutralToneMapping;
      R.toneMappingExposure = 1.05;
      R.clear(true, true, true);
      R.render(sc, cm);
      data = new Uint8Array(SZ * SZ * 4);
      R.readRenderTargetPixels(rt, 0, 0, SZ, SZ, data);
    } catch (e) {
      console.warn('icon', e);
      data = null;
    } finally {
      R.setRenderTarget(pRT);
      R.setClearColor(pCol, pA);
      R.autoClear = pAC;
      R.toneMapping = pTM;
      R.toneMappingExposure = pTE;
      sc.remove(g);
    }
    if (!data) return null;
    const cv1 = document.createElement('canvas');
    cv1.width = cv1.height = SZ;
    const q = cv1.getContext('2d'),
      img = q.createImageData(SZ, SZ);
    let any = false;
    for (let y = 0; y < SZ; y++) {
      const row = data.subarray((SZ - 1 - y) * SZ * 4, (SZ - y) * SZ * 4);
      img.data.set(row, y * SZ * 4);
    } // rows flipped
    for (let i = 3; i < img.data.length; i += 4)
      if (img.data[i] > 8) {
        any = true;
        break;
      }
    if (!any) return null;
    q.putImageData(img, 0, 0);
    const cv2 = document.createElement('canvas');
    cv2.width = cv2.height = OUT;
    const q2 = cv2.getContext('2d');
    q2.imageSmoothingQuality = 'high';
    q2.shadowColor = 'rgba(0,0,0,0.45)';
    q2.shadowBlur = 4;
    q2.shadowOffsetY = 1.5;
    q2.drawImage(cv1, 0, 0, OUT, OUT);
    try {
      return cv2.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    setTimeout(() => {
      try {
        const T = queue.shift();
        const k = keyOf(T);
        if (!cache.has(k) && srcOf(T)) {
          const u = draw(T);
          if (u) {
            cache.set(k, u);
            if (window.HUD) HUD.render();
          }
        }
      } finally {
        busy = false;
        pump();
      }
    }, 30);
  }
  return {
    of(T) {
      if (!T) return null;
      const k = keyOf(T),
        u = cache.get(k);
      if (u) return u;
      if (!queue.includes(T)) {
        queue.push(T);
        pump();
      }
      return null;
    },
    dirty(T) {
      for (const k of [...cache.keys()]) if (k.startsWith(T.id + ':')) cache.delete(k);
    },
  };
})();
export const HUD = (() => {
  const menu = $('menu'),
    mbtn = $('menubtn'),
    camb = $('camtog'),
    bar = $('hotbar'),
    hbn = $('hbname'),
    stg = $('stancetag'),
    xh = $('xhair'),
    inv = $('invwin'),
    moves = $('moves');
  const S = { open: false, inv: false, pick: -1, nameT: null, lastSel: undefined, lastT: undefined };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  const PANELS = [
    'invwin',
    'quests',
    'npcpanel',
    'facade',
    'interior',
    'sharebox',
    'perfbox',
    'ppanel',
    'palette',
    'machwin',
    'gearwin',
    'clockwin',
    'werkbuch',
  ];
  const panelOpen = () =>
    PANELS.some(id => {
      const el = $(id);
      return el && !el.hidden;
    }) || !!(window.PIANO && PIANO.on);
  // ---------------- the menu ----------------
  const phEl = document.querySelector('.phases[data-phase-ui]'),
    phSec = $('ph-menu') && $('ph-menu').closest('.msec');
  function placePhases() {
    const inOrbit = P.mode === 'orbit',
      home = inOrbit ? $('ph-home') : $('ph-menu');
    if (phEl && home && phEl.parentNode !== home) home.appendChild(phEl);
    if (phSec) phSec.hidden = inOrbit;
  }
  // ---------------- scenes: the start situations of the features (KERN.scenario) as chips (phase 2, building block 3) ----------------
  // Places the „Orte“ chips already offer (a data-spot of the same name) are left out, and so is a scene with menu: false. A scene that
  // changes saved progress or the clock says what in def.ask and needs a second tap.
  const scenEl = $('scen-menu'),
    scenNote = $('scen-note');
  let scenN = -1,
    armed = null;
  function disarm() {
    armed = null;
    if (scenNote) scenNote.hidden = true;
  }
  function fillScenes() {
    if (!scenEl) return;
    const spots = new Set([...menu.querySelectorAll('[data-spot]')].map(b => b.dataset.spot)),
      L = KERN.scenarios().filter(s => s.menu !== false && !spots.has(s.name));
    if (L.length === scenN) return;
    scenN = L.length;
    scenEl.textContent = '';
    for (const s of L) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.scen = s.name;
      b.textContent = s.label;
      if (s.ask) b.title = s.label + ': ' + s.ask;
      scenEl.appendChild(b);
    }
    const sec = scenEl.closest('.msec');
    if (sec) sec.hidden = !L.length;
  }
  scenEl?.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-scen]') : null,
      s = b && KERN.scenario(b.dataset.scen);
    if (!s) return;
    if (s.ask && armed !== s.name) {
      armed = s.name;
      if (scenNote) {
        scenNote.textContent = '„' + s.label + '“ ' + s.ask + ' – noch einmal tippen, dann geht es los.';
        scenNote.hidden = false;
      }
      return;
    }
    setMenu(false);
    try {
      s.run();
      KERN.emit('scenario', { name: s.name, menu: true });
    } catch (err) {
      console.warn('scenario', s.name, err);
      toast('Diese Szene ließ sich nicht starten.');
    }
  });
  function setMenu(v) {
    v = !!v;
    if (v === S.open) return;
    S.open = v;
    menu.hidden = !v;
    disarm();
    mbtn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) {
      keys.clear();
      if (S.inv) setInv(false);
      unlock();
      refresh();
      setTimeout(() => {
        const b = menu.querySelector('.mresume');
        if (b && S.open)
          try {
            b.focus({ preventScroll: true });
          } catch (e) {}
      }, 40);
    } else {
      try {
        mbtn.focus({ preventScroll: true });
        mbtn.blur();
      } catch (e) {}
    }
    placePhases();
    markDirty();
  }
  mbtn.addEventListener('click', () => setMenu(!S.open));
  menu.querySelectorAll('[data-mclose]').forEach(b =>
    b.addEventListener('click', () => {
      setMenu(false);
      if (b.classList.contains('mresume')) lockNow();
    })
  );
  // choices that lead somewhere close the menu; settings keep it open
  menu.querySelectorAll('[data-spot]').forEach(b => b.addEventListener('click', () => setMenu(false)));
  for (const id of ['questbtn', 'planbtn', 'facbtn', 'intbtn', 'sharebtn', 'perfbtn'])
    $(id)?.addEventListener('click', () => setMenu(false));
  $('ph-info')?.addEventListener('click', () => {
    if (S.open) setMenu(false);
  });
  $('invbtn')?.addEventListener('click', () => {
    setMenu(false);
    setInv(true);
  });
  menu.querySelectorAll('[data-fig]').forEach(b =>
    b.addEventListener('click', () => {
      if (window.AVATAR) LATE.AVATAR.setKind(b.dataset.fig);
      else {
        try {
          SAVE.setRaw('pav-fig', b.dataset.fig);
        } catch (e) {}
      }
      refresh();
    })
  );
  menu.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => {
      setView3(b.dataset.view === '3');
      refresh();
    })
  );
  menu.querySelectorAll('[data-lock]').forEach(b =>
    b.addEventListener('click', () => {
      LOCK.want = b.dataset.lock === '1';
      try {
        SAVE.setRaw('pav-lock', LOCK.want ? '1' : '0');
      } catch (e) {}
      refresh();
    })
  );
  function refresh() {
    fillScenes();
    const av = window.AVATAR,
      ready = !!(av && av.ready),
      kind = av ? av.kind : 'm';
    menu.querySelectorAll('[data-fig]').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.fig === kind ? 'true' : 'false');
      b.disabled = !!(av && av.failed);
    });
    menu.querySelectorAll('[data-view]').forEach(b => {
      const on = (b.dataset.view === '3') === (CAM3.want && ready);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (b.dataset.view === '3') b.disabled = !ready;
    });
    menu
      .querySelectorAll('[data-lock]')
      .forEach(b => b.setAttribute('aria-pressed', (b.dataset.lock === '1') === LOCK.want ? 'true' : 'false'));
    const fn = $('fignote');
    if (fn) {
      fn.hidden = ready;
      fn.textContent =
        av && av.failed
          ? 'Die Figur ließ sich nicht laden – unterwegs bist du mit den eigenen Augen.'
          : 'Die Figur wird noch geladen …';
    }
    const ib = $('invbtn');
    if (ib) {
      const n = PLAY.inv.slots.filter(Boolean).length;
      ib.querySelector('span').textContent = n ? n + ' dabei' : 'leer';
    }
  }
  // ---------------- view: the figure (shoulder camera) or the own eyes ----------------
  function viewChanged() {
    const ready = !!(window.AVATAR && LATE.AVATAR.ready);
    camb.hidden = !ready;
    const on = CAM3.on || (CAM3.want && ready && P.mode !== 'walk');
    camb.setAttribute('aria-pressed', on ? 'true' : 'false');
    camb.querySelector('.hbt').textContent = on ? 'Figur' : 'Augen';
    document.body.dataset.view = CAM3.on ? '3' : '1';
    if (S.open) refresh();
  }
  camb.addEventListener('click', () => {
    setView3(!CAM3.want);
    camb.blur();
  });
  // ---------------- the bar of things ----------------
  const NB = PLAY.NB,
    slots = [];
  for (let i = 0; i < NB; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.dataset.i = i;
    b.innerHTML = `<b>${i + 1}</b><em></em>`;
    b.addEventListener('click', () => {
      slotKey(i);
      b.blur();
    });
    bar.appendChild(b);
    slots.push(b);
  }
  const bagb = document.createElement('button');
  bagb.type = 'button';
  bagb.className = 'bagb';
  bagb.title = 'Inventar (I)';
  bagb.setAttribute('aria-label', 'Inventar öffnen');
  bagb.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5"/><rect x="4.5" y="7.5" width="15" height="13.5" rx="3"/><path d="M8.5 13.5h7M4.5 12h15"/></svg><em></em>';
  bagb.style.position = 'relative';
  bagb.addEventListener('click', () => {
    setInv(!S.inv);
    bagb.blur();
  });
  bar.appendChild(bagb);
  function slotKey(i) {
    if (PLAY.hold || PLAY.seated()) return;
    PLAY.select(PLAY.inv.sel === i ? -1 : i);
  }
  function flashName() {
    const T = PLAY.carry;
    hbn.textContent = T ? T.name : 'Hände frei';
    hbn.hidden = false;
    clearTimeout(S.nameT);
    S.nameT = setTimeout(() => {
      hbn.hidden = true;
    }, 1700);
  }
  function renderBar() {
    const I = PLAY.inv;
    for (let i = 0; i < NB; i++) {
      const b = slots[i],
        T = I.slots[i],
        u = T ? ICON.of(T) : null;
      b.classList.toggle('on', I.sel === i);
      b.style.backgroundImage = u ? `url(${u})` : '';
      b.classList.toggle('ph', !!T && !u);
      if (!!T && !u && !b.querySelector('i')) b.insertAdjacentHTML('beforeend', '<i></i>');
      if (u || !T) b.querySelector('i')?.remove();
      b.title = i + 1 + ': ' + (T ? T.name : 'leer');
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', I.sel === i ? 'true' : 'false');
      b.querySelector('em').textContent = T && T.count > 1 ? T.count : '';
    }
    const nBag = I.slots.slice(NB).filter(Boolean).length;
    bagb.querySelector('em').textContent = nBag ? '+' + nBag : '';
    if (S.lastSel !== undefined && (S.lastSel !== I.sel || S.lastT !== PLAY.carry)) flashName();
    S.lastSel = I.sel;
    S.lastT = PLAY.carry;
  }
  // ---------------- the inventory window ----------------
  function setInv(v) {
    v = !!v;
    if (v && P.mode !== 'walk') v = false;
    S.inv = v;
    inv.hidden = !v;
    S.pick = -1;
    if (v) {
      keys.clear();
      unlock();
      renderInv();
    }
  }
  function renderInv() {
    if (!S.inv) return;
    const I = PLAY.inv,
      pk = S.pick >= 0 ? I.slots[S.pick] : null,
      n = I.slots.filter(Boolean).length;
    let h =
      '<h3>Inventar<button type="button" class="x" aria-label="Schließen">×</button></h3><h4>Leiste · Tasten 1–8</h4><div class="ig">';
    for (let i = 0; i < I.slots.length; i++) {
      if (i === NB) h += '</div><h4>Rucksack</h4><div class="ig">';
      const T = I.slots[i],
        u = T ? ICON.of(T) : null;
      h += `<button type="button" class="is${I.sel === i ? ' on' : ''}${S.pick === i ? ' pick' : ''}" data-i="${i}" aria-label="${T ? esc(T.name) : 'leeres Feld'}" title="${T ? esc(T.name) : 'leer'}"${u ? ` style="background-image:url(${u})"` : ''}>${i < NB ? `<b>${i + 1}</b>` : ''}${T && T.count > 1 ? `<em>${T.count}</em>` : ''}${T && !u ? `<em>${esc(T.name.slice(0, 3))}</em>` : ''}</button>`;
    }
    h += '</div><div class="info">';
    if (pk)
      h += `<b>${esc(pk.name)}</b><p>${esc((typeof pk.desc === 'function' ? pk.desc() : pk.desc) || '')} Ein anderes Feld antippen: tauschen.</p><button type="button" data-ia="hand" class="acc">In die Hand</button><button type="button" data-ia="drop">Hinlegen</button>`;
    else
      h += `<p>${n ? n + ' von ' + I.slots.length + ' Plätzen belegt. Einen Gegenstand antippen, dann ein anderes Feld: tauschen.' : 'Noch nichts dabei. Nimm Dinge mit E oder durch Antippen auf.'}</p>`;
    inv.innerHTML = h + '</div>';
    inv.querySelector('.x').addEventListener('click', () => setInv(false));
    inv.querySelectorAll('.is').forEach(b =>
      b.addEventListener('click', () => {
        const i = +b.dataset.i;
        if (S.pick < 0) {
          if (I.slots[i]) S.pick = i;
        } else if (S.pick === i) S.pick = -1;
        else {
          PLAY.moveSlot(S.pick, i);
          S.pick = -1;
        }
        renderInv();
      })
    );
    inv.querySelector('[data-ia="hand"]')?.addEventListener('click', () => {
      PLAY.toHand(pk);
      S.pick = -1;
      renderInv();
    });
    inv.querySelector('[data-ia="drop"]')?.addEventListener('click', () => {
      PLAY.drop(pk);
      S.pick = -1;
      renderInv();
    });
  }
  function render() {
    renderBar();
    renderInv();
    if (S.open) refresh();
  }
  PLAY.onInv(render);
  // ---------------- postures ----------------
  const ST_KEY = { crouch: 'C', crawl: 'X', prone: 'Z' };
  function stanceChanged() {
    const st = P.stance;
    stg.hidden = st === 'stand';
    if (st !== 'stand') stg.innerHTML = esc(MOVE.STANCES[st].name) + `<kbd>${ST_KEY[st]}</kbd>`;
    moves.querySelectorAll('[data-mv]').forEach(b => {
      if (b.dataset.mv !== 'jump') b.setAttribute('aria-pressed', b.dataset.mv === st ? 'true' : 'false');
    });
  }
  moves.querySelectorAll('[data-mv]').forEach(b =>
    b.addEventListener('click', e => {
      e.preventDefault();
      const m = b.dataset.mv;
      if (m === 'jump') MOVE.jump();
      else MOVE.toggleStance(m);
      b.blur();
    })
  );
  // ---------------- the captured mouse: after a click into the picture the mouse turns the view; a click acts on what is in the middle ----------------
  const fine = window.matchMedia ? matchMedia('(pointer: fine)') : { matches: true };
  const LOCK = {
    want: (() => {
      try {
        return SAVE.raw('pav-lock') !== '0';
      } catch (e) {
        return true;
      }
    })(),
    on: false,
    self: false,
    fail: 0,
    hinted: false,
  };
  const canLock = () =>
    LOCK.want &&
    fine.matches &&
    !COARSE &&
    P.mode === 'walk' &&
    !S.open &&
    !S.inv &&
    !panelOpen() &&
    !(typeof PLAN !== 'undefined' && PLAN.on) &&
    LOCK.fail < 3 &&
    !!cv.requestPointerLock &&
    !window.FREEZE;
  function lockNow() {
    if (!canLock() || LOCK.on) return;
    try {
      const r = cv.requestPointerLock({ unadjustedMovement: true });
      if (r && r.catch)
        r.catch(() => {
          try {
            const r2 = cv.requestPointerLock();
            if (r2 && r2.catch)
              r2.catch(() => {
                LOCK.fail++;
              });
          } catch (e) {
            LOCK.fail++;
          }
        });
    } catch (e) {
      LOCK.fail++;
    }
  }
  function unlock() {
    if (document.pointerLockElement) {
      LOCK.self = true;
      try {
        document.exitPointerLock();
      } catch (e) {}
    }
  }
  document.addEventListener('pointerlockchange', () => {
    const on = document.pointerLockElement === cv,
      was = LOCK.on;
    LOCK.on = on;
    xh.hidden = !on;
    document.body.dataset.lock = on ? '1' : '';
    if (on) {
      LOCK.fail = 0;
      if (!LOCK.hinted) {
        LOCK.hinted = true;
        toast('Die Maus steuert jetzt den Blick. Klick: handeln · Esc: Menü und Maus frei.', 4200);
      }
    }
    if (was && !on && !LOCK.self && P.mode === 'walk' && !S.open && !S.inv && !panelOpen()) setMenu(true); // Esc let go of the mouse: the menu comes up, as in games
    LOCK.self = false;
  });
  document.addEventListener('pointerlockerror', () => {
    LOCK.fail++;
  });
  document.addEventListener('mousemove', e => {
    if (!LOCK.on) return;
    const k = 0.11;
    look(-e.movementX * k, -e.movementY * k);
  });
  const stg0 = $('stage');
  stg0.addEventListener(
    'pointerdown',
    e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (LOCK.on) {
        e.stopPropagation();
        e.preventDefault();
        if (e.button === 0) {
          const r = cv.getBoundingClientRect();
          ray.setFromCamera(new THREE.Vector2(0, 0), cam);
          if (!PLAY.tap({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, ray)) PLAY.primary();
        } else if (e.button === 2) PLAY.secondary();
        return;
      }
      if (e.button === 0 && canLock()) {
        e.stopPropagation();
        lockNow();
      }
    },
    true
  );
  stg0.addEventListener('contextmenu', e => {
    if (LOCK.on) e.preventDefault();
  });
  // panels that need the mouse let it go
  const mo = new MutationObserver(() => {
    if (LOCK.on && panelOpen()) unlock();
    if (S.open && document.getElementById('npcpanel') && !$('npcpanel').hidden) setMenu(false);
  });
  for (const id of PANELS) {
    const el = $(id);
    if (el) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] });
  }
  // ---------------- keys ----------------
  function closeTop() {
    for (const id of [
      'machwin',
      'gearwin',
      'clockwin',
      'werkbuch',
      'invwin',
      'npcpanel',
      'quests',
      'palette',
      'facade',
      'interior',
      'sharebox',
      'perfbox',
      'ppanel',
    ]) {
      const el = $(id);
      if (!el || el.hidden) continue;
      if (id === 'invwin') {
        setInv(false);
        return true;
      }
      if (id === 'quests') {
        QUESTS.toggleJournal(false);
        return true;
      }
      if (id === 'machwin') {
        LATE.WUI.close(true);
        return true;
      }
      if (id === 'gearwin') {
        LATE.GEAR.setWin(false);
        return true;
      }
      if (id === 'clockwin') {
        LATE.CLOCK.setWin(false);
        return true;
      }
      if (id === 'werkbuch') {
        LATE.WUI.book(false);
        return true;
      }
      const x = el.querySelector('.x, #np-close, #pp-close, #perfclose');
      if (x) x.click();
      else el.hidden = true;
      return true;
    }
    return false;
  }
  // while the menu or the inventory is open the game gets no keys (the menu's own buttons still work with Tab, Enter, Space)
  // (what is selected in the planner or the plan view before their own Esc handlers let go of it)
  window.addEventListener(
    'keydown',
    e => {
      if (e.key === 'Escape')
        S.escSel = !!(
          (typeof PLAN !== 'undefined' && PLAN.on && PLAN.sel) ||
          (P.mode === 'top' && window.SITEPLAN && (SITEPLAN.S.sel || SITEPLAN.S.fsel || SITEPLAN.S.draw))
        );
    },
    true
  );
  window.addEventListener(
    'keydown',
    e => {
      const mw = window.WUI && LATE.WUI.open;
      if ((!S.open && !S.inv && !mw) || typing()) return;
      const k = e.key;
      if (mw && !S.open && !S.inv) {
        const inside = $('machwin').contains(document.activeElement);
        if (k === 'Escape' || ((k === 'Enter' || k === 'Tab' || k === ' ') && inside)) return;
        e.stopImmediatePropagation();
        return;
      }
      if (
        k === 'Escape' ||
        k === 'm' ||
        k === 'M' ||
        ((k === 'i' || k === 'I') && S.inv) ||
        (S.inv && /^Digit[0-8]$/.test(e.code))
      )
        return;
      if ((k === 'Tab' || k === 'Enter' || k === ' ') && S.open) return;
      e.stopImmediatePropagation();
    },
    true
  );
  window.addEventListener('keydown', e => {
    if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Escape' || ((k === 'm' || k === 'M') && !e.repeat)) {
      if (S.open) {
        setMenu(false);
        e.preventDefault();
        return;
      }
      if (k === 'Escape') {
        if (closeTop()) {
          e.preventDefault();
          return;
        }
        if (S.escSel) return;
      } // the planner or the plan view let go of their selection first
      setMenu(true);
      e.preventDefault();
      return;
    }
    if (P.mode !== 'walk' || e.repeat) return;
    if (k === 'i' || k === 'I') {
      setInv(!S.inv);
      e.preventDefault();
      return;
    }
    const m = /^Digit([0-9])$/.exec(e.code);
    if (m) {
      const n = +m[1];
      if (n === 0 || n === 9) PLAY.select(-1);
      else slotKey(n - 1);
      if (S.inv) renderInv();
      e.preventDefault();
    }
  });
  // ---------------- per frame ----------------
  let seatedWas = null,
    readyWas = null,
    acc = 0;
  window.TICKS.push(dt => {
    acc += dt;
    if (acc < 0.2) return;
    acc = 0;
    const sd = PLAY.seated();
    if (sd !== seatedWas) {
      seatedWas = sd;
      document.body.dataset.seated = sd ? '1' : '';
    }
    const rd = !!(window.AVATAR && LATE.AVATAR.ready);
    if (rd !== readyWas) {
      readyWas = rd;
      viewChanged();
    }
    if (S.inv && P.mode !== 'walk') setInv(false);
    if (LOCK.on && !canLockKeep()) unlock();
  });
  const canLockKeep = () => P.mode === 'walk' && !S.open && !S.inv && !(typeof PLAN !== 'undefined' && PLAN.on);
  function modeChanged() {
    placePhases();
    if (P.mode !== 'walk') {
      unlock();
      if (S.inv) setInv(false);
    }
    viewChanged();
    stanceChanged();
  }
  // free view (Falko, 23.10.2026, on the iPhone: "einen freien Bildschirm, ohne diese fürs Spiel unnötigen Anzeigen"): the button at the top
  // right hides what is not needed to move – task card, place, time, the bar of things, hints; the moves, the action button and the menu stay.
  // The same button brings everything back; the choice is kept.
  function setClean(v) {
    document.body.dataset.clean = v ? '1' : '';
    const b = $('cleanbtn');
    if (b) {
      b.setAttribute('aria-pressed', v ? 'true' : 'false');
      b.title = v ? 'Anzeigen wieder einblenden' : 'Freie Sicht: Anzeigen ausblenden';
    }
    try {
      SAVE.setRaw('pav-clean', v ? '1' : '0');
    } catch (e) {}
    markDirty(true);
  }
  setClean(SAVE.raw('pav-clean') === '1');
  $('cleanbtn')?.addEventListener('click', () => setClean(document.body.dataset.clean !== '1'));
  // the place name while walking: shown when it changes, faded after a few seconds (screen.css: body[data-mode="walk"] .where.faded)
  {
    const wl = $('where'),
      box = wl && wl.closest('.where');
    let ft = null;
    const show = () => {
      if (!box) return;
      box.classList.remove('faded');
      clearTimeout(ft);
      ft = setTimeout(() => box.classList.add('faded'), 6000);
    };
    if (wl && window.MutationObserver)
      new MutationObserver(show).observe(wl, { childList: true, characterData: true, subtree: true });
    show();
  }
  // first visit of version 15: a short word about the new controls
  let intro = false;
  window.TICKS.push(() => {
    if (intro || P.mode !== 'walk' || !LOAD.ready) return;
    intro = true;
    const seen = !SAVE.once('pav-v15'); // one-time hint
    if (!seen)
      setTimeout(
        () =>
          news(
            COARSE
              ? 'Neu: Menü oben rechts. Unten deine Sachen (antippen: in die Hand), rechts springen, ducken, kriechen, hinlegen. Zwei Finger: Kamera näher oder weiter.'
              : 'Neu: Menü oben rechts (Esc oder M). Unten deine Sachen (1–8, I), Leertaste springen, C ducken, X kriechen, Z hinlegen, V oder Mausrad: Figur oder eigene Augen.',
            10000
          ),
        900
      );
  });
  let intro2 = false;
  window.TICKS.push(() => {
    if (intro2 || P.mode !== 'walk' || !LOAD.ready || !window.WERK || !LATE.WERK.on) return;
    intro2 = true;
    const seen = !SAVE.once('pav-v15b'); // one-time hint
    if (!seen)
      setTimeout(
        () =>
          news(
            'Neu in der Werkstatt: ein Stirnholz-Schneidebrett selbst bauen – Leimholz, Kanteln, Verleimen, Hobeln, Schleifen, Ölen. Werkstattbuch: ' +
              (COARSE ? 'Karte links' : 'Taste B') +
              '. Die Uhr oben rechts zeigt die Spielzeit.',
            9000
          ),
        12000
      );
  });
  let intro3 = false;
  window.TICKS.push(() => {
    if (intro3 || P.mode !== 'walk' || !LOAD.ready) return;
    intro3 = true;
    const seen = !SAVE.once('pav-v16a'); // one-time hint
    if (!seen)
      setTimeout(
        () =>
          news(
            'Neu: Tag und Nacht. Die Sonne steht, wo sie über Ratscher wirklich steht – heute ist Spieltag 1, der 1. Juni. Abends gehen die Lampen an, nachts Mond und Sterne. Uhr oben rechts: Tempo, Warten, Datum.',
            10000
          ),
        2500
      );
  });
  placePhases();
  render();
  stanceChanged();
  viewChanged();
  return {
    setMenu,
    setClean,
    get open() {
      return S.open;
    },
    setInv,
    get invOpen() {
      return S.inv;
    },
    render,
    refresh,
    viewChanged,
    modeChanged,
    stanceChanged,
    iconDirty: T => {
      ICON.dirty(T);
      render();
    },
    LOCK,
    lockNow,
    unlock,
    panelOpen,
  };
})();
LATE.HUD = HUD;
window.HUD = HUD;
window.ICON = ICON;
