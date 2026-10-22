// ===================== V14 music: playable stage piano (grand or e-piano sound, keys on screen and on the keyboard), record player with =====================
// public-domain records, ukulele. Instrument sounds are synthesized in the browser (no samples), the records are recordings (snd/music).
phase(null);
const MUSIC_SR = 24000;
// ---- piano voice: additive synthesis with inharmonic partials, two detuned strings, a fast and a slow decay; e-piano: FM with a bell tine ----
function synthNote(m, kind) {
  const sr = MUSIC_SR,
    f0 = 440 * Math.pow(2, (m - 69) / 12);
  if (kind === 'epiano') {
    const tau = THREE.MathUtils.clamp(2.4 * Math.pow(2, -(m - 60) / 22), 0.7, 4.5),
      dur = Math.min(5, tau * 3.2),
      n = Math.floor(sr * dur),
      out = new Float32Array(n),
      w = (2 * Math.PI * f0) / sr,
      tine = 14 * f0 < sr * 0.45;
    for (let i = 0; i < n; i++) {
      const t = i / sr,
        I = 1.5 * Math.exp(-t / 0.28) + 0.22,
        a = Math.min(1, t / 0.003) * Math.exp(-t / tau);
      let y = Math.sin(w * i + I * Math.sin(w * i)) * a;
      if (tine) y += 0.1 * Math.sin(w * 14 * i) * Math.exp(-t / 0.035);
      out[i] = y;
    }
    return norm(out, 0.55);
  }
  const T60 = THREE.MathUtils.clamp(9 * Math.pow(2, -(m - 48) / 16), 1.4, 12),
    dur = Math.min(T60 * 0.85, 7.5),
    n = Math.floor(sr * dur),
    out = new Float32Array(n);
  const B = 0.00011 * Math.pow(2, (m - 48) / 15),
    N = Math.max(3, Math.min(18, Math.floor(10000 / f0)));
  for (let k = 1; k <= N; k++) {
    const fk = k * f0 * Math.sqrt(1 + B * k * k);
    if (fk > sr * 0.45) break;
    const ak = ((Math.abs(Math.sin(Math.PI * k * 0.12)) + 0.06) / Math.pow(k, 0.92)) * Math.exp(-fk / (2600 + 8 * f0)),
      tau = T60 / 6.9 / (1 + 0.24 * (k - 1)),
      tau1 = tau * 0.25;
    const d1 = Math.exp(-1 / (sr * tau1)),
      d2 = Math.exp(-1 / (sr * tau));
    let e1 = 0.62 * ak,
      e2 = 0.38 * ak;
    for (const det of [-0.00045, 0.00045]) {
      const w = (2 * Math.PI * fk * (1 + det * ((k % 3) + 1))) / sr,
        cw = Math.cos(w),
        sw = Math.sin(w);
      let c = Math.cos(k * 1.7),
        s = Math.sin(k * 1.7),
        a1 = e1 * 0.5,
        a2 = e2 * 0.5;
      for (let i = 0; i < n; i++) {
        out[i] += s * (a1 + a2);
        const c2 = c * cw - s * sw;
        s = s * cw + c * sw;
        c = c2;
        a1 *= d1;
        a2 *= d2;
        if ((i & 1023) === 0) {
          const r = 1 / Math.hypot(c, s);
          c *= r;
          s *= r;
        }
      }
    }
  }
  // hammer knock: a short low-passed noise
  {
    const L = Math.floor(sr * 0.05),
      k = Math.min(0.9, f0 / 1200 + 0.15);
    let y = 0;
    for (let i = 0; i < L; i++) {
      y += k * (Math.random() * 2 - 1 - y);
      out[i] += y * 0.05 * Math.exp(-i / (sr * 0.008));
    }
  }
  for (let i = 0; i < Math.min(n, 48); i++) out[i] *= i / 48; // 2 ms attack
  return norm(out, 0.5);
}
function norm(a, peak) {
  let m = 1e-6;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  const k = peak / m;
  for (let i = 0; i < a.length; i++) a[i] *= k;
  return a;
}
// Karplus-Strong plucked string (ukulele)
function pluck(m, dur = 1.8) {
  const sr = MUSIC_SR,
    f = 440 * Math.pow(2, (m - 69) / 12),
    N = Math.max(2, Math.round(sr / f)),
    n = Math.floor(sr * dur),
    out = new Float32Array(n),
    buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  let p = 0,
    lp = 0;
  for (let i = 0; i < n; i++) {
    const a = buf[p],
      b = buf[(p + 1) % N];
    const y = 0.4985 * (a + b);
    lp += 0.55 * (y - lp);
    buf[p] = lp;
    out[i] = a;
    p = (p + 1) % N;
  }
  return norm(out, 0.35);
}
// ---- PIANO ----
const PIANO = (() => {
  const st = {
    on: false,
    voice: 'piano',
    pedal: false,
    oct: 0,
    cache: { piano: {}, epiano: {} },
    act: new Map(),
    auto: null,
    bus: null,
    keyEls: {},
    pre: 0,
  };
  const PK = 'grp:piano',
    it = () => (typeof ITEMS !== 'undefined' ? ITEMS : []).find(i => i.key === PK);
  const ctxOK = () => audio.ready() && audio.raw();
  function bus() {
    const r = audio.raw();
    if (!st.bus || st.bus.context !== r.ctx) {
      st.bus = r.ctx.createGain();
      st.bus.gain.value = 0.85;
      st.bus.connect(r.sfx);
    }
    return st.bus;
  }
  function buffer(m) {
    const C = st.cache[st.voice];
    if (!C[m]) {
      const r = audio.raw(),
        d = synthNote(m, st.voice),
        b = r.ctx.createBuffer(1, d.length, MUSIC_SR);
      b.copyToChannel(d, 0);
      C[m] = b;
    }
    return C[m];
  }
  function noteOn(m, vel = 0.8, when = 0) {
    if (!ctxOK()) {
      PLAY.think('Ton ist aus: oben „Ton“ einschalten.');
      return;
    }
    const r = audio.raw(),
      t = when || r.ctx.currentTime + 0.005;
    const old = st.act.get(m);
    if (old && !when) {
      old.g.gain.setTargetAtTime(0, t, 0.015);
      try {
        old.s.stop(t + 0.1);
      } catch (e) {}
    }
    const s = r.ctx.createBufferSource();
    s.buffer = buffer(m);
    const g = r.ctx.createGain();
    g.gain.value = 0.35 + 0.65 * vel;
    s.connect(g);
    g.connect(bus());
    s.start(t);
    const a = { s, g, held: false };
    if (!when) st.act.set(m, a);
    light(m, true);
    return a;
  }
  function noteOff(m) {
    const a = st.act.get(m);
    light(m, false);
    if (!a) return;
    if (st.pedal) {
      a.held = true;
      return;
    }
    rel(a);
    st.act.delete(m);
  }
  function rel(a, t) {
    const r = audio.raw();
    if (!r) return;
    t = t || r.ctx.currentTime;
    a.g.gain.setTargetAtTime(0, t, st.voice === 'epiano' ? 0.12 : 0.09);
    try {
      a.s.stop(t + 1.2);
    } catch (e) {}
  }
  function pedal(v) {
    st.pedal = v;
    $('ppedal')?.setAttribute('aria-pressed', v ? 'true' : 'false');
    if (!v)
      for (const [m, a] of st.act)
        if (a.held) {
          rel(a);
          st.act.delete(m);
        }
  }
  function light(m, on) {
    const el = st.keyEls[m];
    if (el) el.classList.toggle('on', on);
  }
  // pre-synthesize the keyboard range in small steps (so the first touches play at once)
  function preload() {
    if (!ctxOK()) return;
    const want = [];
    for (let m = 48; m <= 84; m++) if (!st.cache[st.voice][m]) want.push(m);
    if (!want.length) return;
    let i = 0;
    const step = () => {
      if (!st.on) return;
      const t0 = performance.now();
      while (i < want.length && performance.now() - t0 < 12) {
        buffer(want[i]);
        i++;
      }
      if (i < want.length) setTimeout(step, 30);
    };
    setTimeout(step, 60);
  }
  // ---- on-screen keys C4–C6 (shifted by the octave buttons / arrow keys) ----
  const UI = (() => {
    const el = document.createElement('div');
    el.id = 'piano';
    el.hidden = true;
    el.innerHTML =
      '<div class="pbar"><button type="button" data-pv="piano" aria-pressed="true">Flügel</button><button type="button" data-pv="epiano" aria-pressed="false">E-Piano</button><button type="button" id="ppedal" aria-pressed="false" title="Haltepedal (Leertaste)">Pedal</button><button type="button" id="poctd" title="Oktave tiefer (←)">−8va</button><button type="button" id="pocta" title="Oktave höher (→)">+8va</button><button type="button" id="psatie" title="Erik Satie, Gymnopédie Nr. 1 (Anfang)">Satie spielen</button><button type="button" id="pstand">Aufstehen</button></div><div class="keys" id="pkeys" aria-label="Klaviatur"></div><div class="phint">Tasten A W S E D F T G Z H U J K O L P · ← → Oktave · Leertaste Pedal · Q aufstehen</div>';
    ($('p-3d') || document.body).appendChild(el);
    return el;
  })();
  const KB = {
    KeyA: 0,
    KeyW: 1,
    KeyS: 2,
    KeyE: 3,
    KeyD: 4,
    KeyF: 5,
    KeyT: 6,
    KeyG: 7,
    KeyY: 8,
    KeyZ: 8,
    KeyH: 9,
    KeyU: 10,
    KeyJ: 11,
    KeyK: 12,
    KeyO: 13,
    KeyL: 14,
    KeyP: 15,
    Semicolon: 16,
    Quote: 17,
  };
  function buildKeys() {
    const box = $('pkeys');
    if (!box) return;
    box.innerHTML = '';
    st.keyEls = {};
    const base = 60 + st.oct * 12,
      white = [0, 2, 4, 5, 7, 9, 11];
    const nW = 15;
    let wi = 0;
    for (let k = 0; k <= 24; k++) {
      const m = base + k,
        isW = white.includes(k % 12);
      const d = document.createElement('div');
      d.className = isW ? 'wk' : 'bk';
      d.dataset.m = m;
      if (isW) {
        d.style.left = (wi / nW) * 100 + '%';
        d.style.width = 100 / nW + '%';
        wi++;
      } else {
        d.style.left = ((wi - 0.32) / nW) * 100 + '%';
        d.style.width = (0.64 * 100) / nW + '%';
      }
      if (k % 12 === 0) d.textContent = 'C' + (4 + st.oct + k / 12);
      box.appendChild(d);
      st.keyEls[m] = d;
    }
  }
  const down = new Map();
  function ptr(e, on) {
    const t = e.target.closest ? e.target.closest('.wk,.bk') : null;
    const prev = down.get(e.pointerId);
    if (!on) {
      if (prev != null) {
        noteOff(prev);
        down.delete(e.pointerId);
      }
      return;
    }
    if (!t) return;
    const m = +t.dataset.m;
    if (prev === m) return;
    if (prev != null) noteOff(prev);
    down.set(e.pointerId, m);
    noteOn(m, 0.75);
  }
  {
    const box = $('pkeys');
    box.addEventListener('pointerdown', e => {
      e.preventDefault();
      try {
        box.setPointerCapture(e.pointerId);
      } catch (er) {}
      ptr(e, true);
    });
    box.addEventListener('pointermove', e => {
      if (!down.has(e.pointerId)) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.closest && box.contains(el)) ptr({ target: el, pointerId: e.pointerId }, true);
    });
    for (const t of ['pointerup', 'pointercancel']) box.addEventListener(t, e => ptr(e, false));
  }
  UI.querySelectorAll('[data-pv]').forEach(b =>
    b.addEventListener('click', () => {
      st.voice = b.dataset.pv;
      UI.querySelectorAll('[data-pv]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      preload();
    })
  );
  $('ppedal').addEventListener('click', () => pedal(!st.pedal));
  $('pstand').addEventListener('click', () => PLAY.stand());
  $('poctd').addEventListener('click', () => {
    st.oct = Math.max(-2, st.oct - 1);
    buildKeys();
  });
  $('pocta').addEventListener('click', () => {
    st.oct = Math.min(1, st.oct + 1);
    buildKeys();
  });
  $('psatie').addEventListener('click', () => (st.auto ? stopAuto() : satie()));
  // keyboard while seated at the piano: every key goes to the piano (no walking, no shortcuts); Q / Esc stand up
  const held = new Set();
  window.addEventListener(
    'keydown',
    e => {
      if (!st.on || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const c = e.code;
      if (c === 'KeyQ' || c === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        PLAY.stand();
        return;
      }
      e.stopImmediatePropagation();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (e.repeat) return;
      if (c === 'Space') {
        pedal(true);
        return;
      }
      if (c === 'ArrowLeft') {
        st.oct = Math.max(-2, st.oct - 1);
        buildKeys();
        return;
      }
      if (c === 'ArrowRight') {
        st.oct = Math.min(1, st.oct + 1);
        buildKeys();
        return;
      }
      if (KB[c] != null && !held.has(c)) {
        held.add(c);
        noteOn(60 + st.oct * 12 + KB[c], 0.8);
      }
    },
    true
  );
  window.addEventListener(
    'keyup',
    e => {
      if (!st.on) return;
      const c = e.code;
      e.stopImmediatePropagation();
      if (c === 'Space') {
        pedal(false);
        return;
      }
      if (KB[c] != null) {
        held.delete(c);
        noteOff(60 + st.oct * 12 + KB[c]);
      }
    },
    true
  );
  // ---- Erik Satie, Gymnopédie No. 1 (1888), the first twelve bars: bass and chord alternating G major 7 / D major 7, melody from bar 5 ----
  function satie() {
    if (!ctxOK()) {
      PLAY.think('Ton ist aus: oben „Ton“ einschalten.');
      return;
    }
    stopAuto();
    const r = audio.raw(),
      q = 0.8,
      t0 = r.ctx.currentTime + 0.25,
      ev = [];
    const G = [43, [59, 62, 66]],
      D = [38, [57, 61, 66]];
    for (let b = 0; b < 13; b++) {
      const [bass, ch] = b % 2 ? D : G,
        tb = t0 + b * 3 * q;
      ev.push([bass, tb, 3 * q, 0.62]);
      for (const n of ch) ev.push([n, tb + q, 2 * q, 0.42]);
    }
    const mel = [
      [4, 1, 78, 1],
      [4, 2, 81, 1],
      [5, 0, 79, 1],
      [5, 1, 78, 1],
      [5, 2, 73, 1],
      [6, 0, 71, 1],
      [6, 1, 73, 1],
      [6, 2, 74, 1],
      [7, 0, 69, 3],
      [8, 0, 66, 12],
    ];
    for (const [b, bt, m, d] of mel) ev.push([m, t0 + (b * 3 + bt) * q, d * q, 0.78]);
    const pv = st.voice;
    st.auto = { srcs: [], tm: [] };
    for (const [m, t, d, v] of ev) {
      const a = noteOn(m, v, t);
      if (!a) continue;
      rel(a, t + d + (m < 50 ? 0.4 : 0.15));
      st.auto.srcs.push(a);
      st.auto.tm.push(
        setTimeout(() => light(m, true), (t - r.ctx.currentTime) * 1000),
        setTimeout(() => light(m, false), (t + d - r.ctx.currentTime) * 1000)
      );
    }
    st.auto.tm.push(
      setTimeout(
        () => {
          st.auto = null;
          $('psatie').textContent = 'Satie spielen';
        },
        (t0 - r.ctx.currentTime + 13 * 3 * q + 1) * 1000
      )
    );
    $('psatie').textContent = 'Stopp';
    PLAY.think('Erik Satie, Gymnopédie Nr. 1 (1888), die ersten Takte', 4200);
  }
  function stopAuto() {
    if (!st.auto) return;
    for (const a of st.auto.srcs) rel(a);
    for (const t of st.auto.tm) clearTimeout(t);
    st.auto = null;
    for (const el of Object.values(st.keyEls)) el.classList.remove('on');
    $('psatie').textContent = 'Satie spielen';
  }
  // ---- sitting down at the piano ----
  function pose() {
    const p = it();
    if (!p) return null;
    const o = p.orig || p,
      d = (-(p.rot || 0) * Math.PI) / 180,
      c = Math.cos(d),
      s = Math.sin(d),
      lx = 2.25 - o.x,
      ly = G.OG.y1 - G.T - 0.74 - o.y;
    return {
      x: p.x + lx * c - ly * s,
      y: p.y + lx * s + ly * c,
      eye: p.z + 1.2,
      yaw: (-d * 180) / Math.PI,
      pitch: -33,
    };
  }
  const shown = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  PLAY.act({
    id: 'piano',
    r: 1.35,
    prio: 0.3,
    obj: () => it() && it().root,
    label: () => {
      const p = it();
      return p && !PLAY.seat && shown(p.root) && PHASE >= PHN.furniture ? 'Klavier spielen' : null;
    },
    pos: () => {
      const q = pose();
      return q ? [q.x, q.y, it().z + 0.5] : null;
    },
    run: () => {
      const q = pose();
      if (!q) return;
      PLAY.sit(
        Object.assign(q, {
          kind: 'piano',
          keepKeys: true,
          leaveLabel: 'Aufstehen',
          onSit: () => open(true),
          onLeave: () => open(false),
        })
      );
    },
  });
  function open(v) {
    st.on = v;
    UI.hidden = !v;
    document.body.classList.toggle('piano-on', v);
    if (v) {
      buildKeys();
      preload();
      audio.enable && opt.sound && audio.enable(true);
    } else {
      stopAuto();
      pedal(false);
      for (const [m, a] of st.act) rel(a);
      st.act.clear();
    }
  }
  return {
    get on() {
      return st.on;
    },
    noteOn,
    noteOff,
    satie,
    stopAuto,
    open,
    pose,
    st,
  };
})();
window.PIANO = PIANO;
// ---- record player on the sideboard: public-domain records (snd/music); the disc turns, the sound comes from the turntable ----
const RECORDS = (() => {
  const LIST = window.MUSICMAN || [],
    st = {
      i: 0,
      el: null,
      node: null,
      g: null,
      pan: null,
      lp: null,
      on: false,
      disc: null,
      t: 0,
      url: null,
      mode: null,
    };
  const SB = () => (typeof ITEMS !== 'undefined' ? ITEMS : []).find(i => i.key === VARIANT + ':grp:sideboard');
  const PL = { A: [G0().IX1 - 0.22, 0.93], B: [3.555, GEO_B.OG.y1 - GEO_B.T - 0.22] };
  function G0() {
    return { IX1: GEO_A.OG.x1 - GEO_A.T };
  }
  // vinyl: grooves and a red label
  const discMat = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const q = c.getContext('2d');
    q.fillStyle = '#0c0c0d';
    q.beginPath();
    q.arc(128, 128, 127, 0, 7);
    q.fill();
    for (let r = 50; r < 126; r += 1.3) {
      q.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
      q.lineWidth = 0.6;
      q.beginPath();
      q.arc(128, 128, r, 0, 7);
      q.stroke();
    }
    q.fillStyle = '#9d2a22';
    q.beginPath();
    q.arc(128, 128, 44, 0, 7);
    q.fill();
    q.fillStyle = '#e9dcc0';
    q.font = '700 13px Georgia, serif';
    q.textAlign = 'center';
    q.fillText('RATSCHER', 128, 112);
    q.font = '400 9px Georgia, serif';
    q.fillText('33 ⅓', 128, 152);
    q.fillStyle = '#ddd';
    q.beginPath();
    q.arc(128, 128, 3, 0, 7);
    q.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return [
      plain({ color: 0x0c0c0d, roughness: 0.35 }),
      plain({ map: t, roughness: 0.32, metalness: 0.05 }),
      plain({ color: 0x0c0c0d, roughness: 0.4 }),
    ];
  })();
  function disc() {
    const s = SB();
    if (!s || !s.root) return null;
    if (st.disc && st.disc.parent === s.root) return st.disc;
    if (st.disc && st.disc.parent) st.disc.parent.remove(st.disc);
    const o = s.orig || s,
      p = PL[VARIANT],
      d = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.003, 48), discMat);
    d.position.copy(V(p[0] - o.x, p[1] - o.y, G.zO + 0.768 - (o.z ?? s.z)));
    d.userData.noMerge = true;
    d.visible = false;
    d.castShadow = true;
    s.root.add(d);
    st.disc = d;
    return d;
  }
  function where() {
    const s = SB();
    if (!s || !s.root) return null;
    const d = disc();
    if (!d) return null;
    const v = new THREE.Vector3();
    d.getWorldPosition(v);
    return [v.x, -v.z, v.y];
  }
  function route() {
    const r = audio.raw();
    if (!r || st.g) return true;
    try {
      st.node = r.ctx.createMediaElementSource(st.el);
      st.g = r.ctx.createGain();
      st.pan = r.ctx.createStereoPanner ? r.ctx.createStereoPanner() : null;
      st.lp = r.ctx.createBiquadFilter();
      st.lp.type = 'lowpass';
      st.lp.frequency.value = 12000;
      st.node.connect(st.lp);
      st.lp.connect(st.g);
      if (st.pan) {
        st.g.connect(st.pan);
        st.pan.connect(r.sfx);
      } else st.g.connect(r.sfx);
      st.mode = 'webaudio';
      return true;
    } catch (e) {
      st.mode = 'element';
      return false;
    }
  }
  function play() {
    if (!LIST.length) {
      PLAY.think('Keine Platten da.');
      return;
    }
    if (!audio.ready()) {
      PLAY.think('Ton ist aus: oben „Ton“ einschalten.');
      return;
    }
    const rec = LIST[st.i % LIST.length];
    st.i++;
    if (!st.el) {
      st.el = new Audio();
      st.el.preload = 'auto';
      st.el.crossOrigin = 'anonymous';
      st.el.addEventListener('ended', () => stop(true));
      st.el.addEventListener('error', () => {
        if (st.on && !st.triedBlob) blobFallback();
      });
    }
    st.triedBlob = false;
    st.el.src = BASE + 'snd/music/' + rec.file;
    route();
    const p = st.el.play();
    if (p && p.catch)
      p.catch(() => {
        if (!st.triedBlob) blobFallback();
      });
    st.on = true;
    st.rec = rec;
    const d = disc();
    if (d) d.visible = true;
    SFX.drop();
    PLAY.think('♪ ' + rec.title + (rec.by ? ' · ' + rec.by : ''), 5200);
    markDirty(true);
  }
  async function blobFallback() {
    st.triedBlob = true;
    try {
      const r = await fetch(BASE + 'snd/music/' + st.rec.file);
      const b = await r.blob();
      if (st.url) URL.revokeObjectURL(st.url);
      st.url = URL.createObjectURL(b);
      st.el.src = st.url;
      await st.el.play();
    } catch (e) {
      console.warn('Platte', e);
      PLAY.think('Die Platte springt nicht an.');
      stop();
    }
  }
  function stop(ended) {
    st.on = false;
    if (st.el) {
      try {
        st.el.pause();
      } catch (e) {}
    }
    const d = st.disc;
    if (d) d.visible = false;
    if (!ended) SFX.drop();
    markDirty(true);
  }
  const shown = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  PLAY.act({
    id: 'records',
    r: 1.4,
    prio: 0.25,
    obj: () => {
      const s = SB();
      return s && s.root;
    },
    label: () => {
      const s = SB();
      if (!s || !s.root || !shown(s.root) || PHASE < PHN.furniture || PLAY.seat) return null;
      return st.on ? 'Plattenspieler aus' : 'Platte auflegen';
    },
    pos: () => {
      const w = where();
      return w ? [w[0], w[1], w[2] - 0.2] : null;
    },
    run: () => (st.on ? stop() : play()),
  });
  let acc = 0;
  window.TICKS.push(dt => {
    if (!st.on) return;
    st.t += dt;
    acc += dt;
    const d = st.disc;
    if (d) d.rotation.y -= dt * 3.49; // 33 ⅓ rpm
    const w = where();
    if (!w || !st.el) return;
    const sp = audio.spatial(w[0], w[1], 4.5),
      same = audio.inside(),
      ins = houseAt(P.x, P.y, P.feet),
      og = Math.abs(P.feet - G.zO) < 1.2 && ins;
    const v = Math.min(1, sp.vol * 1.6) * (og ? 1 : ins ? 0.45 : 0.25);
    if (st.g) {
      const t = audio.raw().ctx.currentTime;
      st.g.gain.setTargetAtTime(v * 0.9, t, 0.15);
      if (st.pan) st.pan.pan.setTargetAtTime(sp.pan * 0.7, t, 0.15);
      st.lp.frequency.setTargetAtTime(og ? 14000 : ins ? 2500 : 1300, t, 0.3);
    } else st.el.volume = Math.max(0, Math.min(1, v));
    if (acc > 1 / 20 && Math.hypot(P.x - w[0], P.y - w[1]) < 6) {
      acc = 0;
      markDirty();
    }
  });
  return {
    play,
    stop,
    get on() {
      return st.on;
    },
    list: LIST,
    st,
  };
})();
window.RECORDS = RECORDS;
// ---- ukulele on the wall: each touch strums the next chord (C – Am – F – G) ----
{
  const CH = [
      [67, 60, 64, 72],
      [69, 60, 64, 69],
      [69, 60, 65, 69],
      [67, 62, 67, 71],
    ],
    NAMES = ['C', 'a-Moll', 'F', 'G'],
    cache = {};
  let ci = 0;
  const uk = () =>
    (typeof ITEMS !== 'undefined' ? ITEMS : []).find(
      i => i.type === 'ukulele' && (i.var === VARIANT || !i.var) && i.root && !i.removed
    );
  const shown = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  PLAY.act({
    id: 'ukulele',
    r: 1.3,
    prio: 0.1,
    obj: () => uk() && uk().root,
    label: () => {
      const u = uk();
      return u && shown(u.root) && !PLAY.seat ? 'Ukulele spielen (' + NAMES[ci % 4] + ')' : null;
    },
    pos: () => {
      const u = uk();
      return u ? [u.x, u.y, u.z - 0.35] : null;
    },
    run: () => {
      if (!audio.ready()) {
        PLAY.think('Ton ist aus: oben „Ton“ einschalten.');
        return;
      }
      const r = audio.raw(),
        t0 = r.ctx.currentTime + 0.01,
        ch = CH[ci % 4];
      ci++;
      ch.forEach((m, k) => {
        const key = m;
        if (!cache[key]) {
          const d = pluck(m),
            b = r.ctx.createBuffer(1, d.length, MUSIC_SR);
          b.copyToChannel(d, 0);
          cache[key] = b;
        }
        const s = r.ctx.createBufferSource();
        s.buffer = cache[key];
        const g = r.ctx.createGain();
        g.gain.value = 0.55;
        s.connect(g);
        g.connect(r.sfx);
        s.start(t0 + k * 0.028);
      });
    },
  });
}
