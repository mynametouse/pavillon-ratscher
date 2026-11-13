// ===================== ton-welt: the room every sound of the mode sits in (GLRAUM) – direction, distance, walls, reverb, phone, speakers =====================
// Falko, 13.11.2026 ~23:20 (the sound concept, „Welt: alle vier“): room sound – reverb in bunker and church, muffled in the car, the phone's
// sound, direction audible with headphones. One module for every sound agent of the mode (radio, voices, engines, places):
//   GLRAUM.lage()                      → { raum: 'frei' | 'auto' | 'innen' | 'bunker' | 'kirche' | 'tunnel', zone } where the ears are
//   GLRAUM.zone(name, form, raum)      a room a mission sets: form { poly: [[x, y], …] } | { circle: [x, y, r] } | { rect: [x0, y0, x1, y1] }
//                                      (+ z: [z0, z1]); GLRAUM.zone(name, null) takes it away; all go with „Beenden“
//   GLRAUM.quelle(node, { x, y, z }, o) a point source: HRTF panner (inverse distance, o.art – the kind's reference distance, grenzland/
//                                      gl_klang_data.js ARTEN – or o.ref), air absorption and occlusion in one low-pass, a send into the
//                                      room's reverb; o: { art, ref, roll, vol, dest (a bus of audio.raw() or a node; default sfx), innen
//                                      (in the listener's room: no occlusion), send, kat } → { pos(x, y, z), vol(v), ende(fade), out, d }
//   GLRAUM.hall(node, k)               a sound without a place (a voice, the radio in the car) into the room's reverb only → { ende() }
//   GLRAUM.telefon(node)               the phone's band (300–3400 Hz, a little compression and grit) → the chain's last node (+ .ende())
//   GLRAUM.lautsprecher(node, art)     the radio's speaker: 'auto' (the car's doors), 'handy' (the phone's tiny one), 'koffer' (a portable
//                                      radio) → the chain's last node (+ .ende())
//   GLRAUM.ort(fn)                     the place's zone for lage() (grenzland/gl_klang.js hands it in) · GLRAUM.stand() for tests
// The listener is the player's head (or the vehicle), turned as the camera looks; the browser's own listener is set every frame while the
// mode runs or a source lives. One convolver per room kind with an impulse response made here (decaying, darkening noise with the room's
// reverb time and pre-delay), built when a room is first entered, cross-faded when the room changes, dropped after a while unused.
// Few nodes per source (low-pass, gain, panner, send), cheap per frame (the listener every frame, the sources ten times a second). Without
// an AudioContext, or when something fails, a source goes straight to its bus as before. Nothing runs before the mode starts, everything is
// gone after „Beenden“. A bus's volume slider holds (the panner leads into the bus; the reverb's send is scaled by the slider).
import * as THREE from 'three';
import { cam } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { audio } from '../audio/audio.js';
import { GL } from './gl_state.js';
import { GLKDATA as D } from './gl_klang_data.js';
export const GLRAUM = (() => {
  const S = {
    raum: 'frei',
    zone: '',
    zonen: new Map(), // name → { form, raum }
    ortFn: null,
    q: new Set(), // live sources
    ketten: new Set(), // live phone and speaker chains, hall sends
    made: 0,
    freed: 0,
    hall: {}, // raum → { conv, wet, used }
    ctx: null,
    send: null,
    out: null,
    upd: 0,
    vols: null,
    volT: 0,
    lst: [0, 0, 0],
    fwd: [0, 0, -1],
    hrtf: 0,
    MAXHRTF: 18,
    err: '',
  };
  const clamp = D.clamp;
  const raw = () => {
    try {
      const r = audio.raw && audio.raw();
      return r && r.ctx ? r : null;
    } catch (e) {
      return null;
    }
  };
  const n = x => (S.made++, x);
  function kill(...nodes) {
    for (const x of nodes)
      if (x) {
        try {
          x.disconnect();
        } catch (e) {}
        S.freed++;
      }
  }
  // ---- the room's impulse response: noise decaying by −60 dB over rt, darkening from lp to a quarter of it, after a pre-delay; a few
  //      early reflections for the small rooms; stereo with decorrelated channels ----
  function ir(ctx, R) {
    const sr = ctx.sampleRate,
      len = Math.max(0.08, Math.min(4.8, R.rt * 1.25)) + R.pre,
      N = Math.floor(sr * len),
      b = ctx.createBuffer(2, N, sr),
      pre = Math.floor(sr * R.pre);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let y = 0,
        seed = 1234567 + c * 7654321;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = pre; i < N; i++) {
        const t = (i - pre) / sr,
          env = Math.exp((-6.9 * t) / R.rt),
          f = R.lp * (1 - 0.75 * Math.min(1, t / R.rt)),
          a = 1 - Math.exp((-2 * Math.PI * f) / sr);
        y += a * (rnd() * 2 - 1 - y);
        d[i] = y * env;
      }
      // early reflections: three to six taps in the first 40 ms (walls of a car, a room, a nave)
      const taps = R.rt < 0.3 ? 6 : R.rt < 1 ? 5 : 3;
      for (let k = 0; k < taps; k++) {
        const i = pre + Math.floor(sr * (0.002 + rnd() * Math.min(0.04, R.rt * 0.4)));
        if (i < N) d[i] += (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.4) * Math.exp((-6.9 * (i - pre)) / sr / R.rt);
      }
    }
    return b;
  }
  // ---- the shared graph: the sends' sum, one convolver per room kind built when needed, the return into the master (overall volume and
  //      „Ton aus“ hold; each send is scaled by its bus's slider) ----
  function graph() {
    const r = raw();
    if (!r) return null;
    if (S.ctx !== r.ctx) {
      S.ctx = r.ctx;
      S.send = n(r.ctx.createGain());
      S.out = n(r.ctx.createGain());
      S.out.connect(r.master);
      S.hall = {};
    }
    return r;
  }
  function halle(raum) {
    const r = graph();
    if (!r) return null;
    let H = S.hall[raum];
    if (!H) {
      const R = D.RAUM[raum] || D.RAUM.frei;
      try {
        const conv = n(r.ctx.createConvolver());
        conv.buffer = ir(r.ctx, R);
        const wet = n(r.ctx.createGain());
        wet.gain.value = 0;
        S.send.connect(conv);
        conv.connect(wet);
        wet.connect(S.out);
        H = S.hall[raum] = { conv, wet, used: performance.now(), on: true };
      } catch (e) {
        S.err = String(e && e.message);
        return null;
      }
    } else if (!H.on) {
      S.send.connect(H.conv);
      H.on = true;
    }
    H.used = performance.now();
    return H;
  }
  // the outdoor room's wet level follows the place (the forest, the town's houses, the open field)
  const wetVon = raum => {
    const R = D.RAUM[raum] || D.RAUM.frei;
    if (raum !== 'frei') return R.wet;
    const Z = D.ZONEN[S.zone];
    return Z && Number.isFinite(Z.frei) ? Z.frei : R.wet;
  };
  function hallen(t) {
    const now = performance.now();
    if (S.q.size || S.ketten.size) halle(S.raum);
    for (const [k, H] of Object.entries(S.hall)) {
      const want = k === S.raum && (S.q.size || S.ketten.size) ? wetVon(k) : 0;
      H.wet.gain.setTargetAtTime(want, t, 0.45);
      if (want > 0) H.used = now;
      // unused for 20 s: off the send (no processing); for 90 s: gone
      if (H.on && now - H.used > 20000) {
        try {
          S.send.disconnect(H.conv);
        } catch (e) {}
        H.on = false;
      }
      if (!H.on && now - H.used > 90000) {
        kill(H.conv, H.wet);
        delete S.hall[k];
      }
    }
  }
  // ---- where the ears are: the player's head, in a vehicle the driver's seat; the browser's coordinates are the scene's (x, up, −y) ----
  function ohren() {
    const v = VEH && VEH.cur;
    if (v && v.st) return [v.st.x, v.st.y, (Number.isFinite(v.st.z) ? v.st.z : KERN.ground(v.st.x, v.st.y)) + 1.2];
    if (P.mode === 'walk') return [P.x, P.y, P.feet + 1.6];
    return [cam.position.x, -cam.position.z, cam.position.y];
  }
  const FWD = new THREE.Vector3(0, 0, -1);
  function hoerer(r) {
    const L = r.ctx.listener,
      t = r.ctx.currentTime,
      [x, y, z] = ohren();
    S.lst = [x, y, z];
    let fx = 0,
      fy = 0,
      fz = -1;
    try {
      cam.getWorldDirection(FWD);
      fx = FWD.x;
      fy = FWD.y;
      fz = FWD.z;
    } catch (e) {}
    // level ears: the camera's pitch does not turn the world's sounds up and down
    const h = Math.hypot(fx, fz) || 1;
    fx /= h;
    fz /= h;
    fy = 0;
    S.fwd = [fx, -fz, 0];
    if (L.positionX) {
      L.positionX.setTargetAtTime(x, t, 0.02);
      L.positionY.setTargetAtTime(z, t, 0.02);
      L.positionZ.setTargetAtTime(-y, t, 0.02);
      L.forwardX.setTargetAtTime(fx, t, 0.02);
      L.forwardY.setTargetAtTime(fy, t, 0.02);
      L.forwardZ.setTargetAtTime(fz, t, 0.02);
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else {
      L.setPosition(x, z, -y);
      L.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }
  // ---- the room by the rules (grenzland/gl_klang_data.js raumVon): a mission's zone, a cabin, riding along, indoors ----
  function inForm(f, x, y, z) {
    if (!f) return false;
    if (f.z && (z < f.z[0] || z > f.z[1])) return false;
    if (f.circle) return Math.hypot(x - f.circle[0], y - f.circle[1]) <= f.circle[2];
    if (f.rect) return x >= f.rect[0] && x <= f.rect[2] && y >= f.rect[1] && y <= f.rect[3];
    if (f.poly) {
      let c = false;
      const p = f.poly;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++)
        if (p[i][1] > y !== p[j][1] > y && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0])
          c = !c;
      return c;
    }
    return false;
  }
  function raumJetzt() {
    const [x, y, z] = S.lst;
    let zr = '';
    for (const Z of S.zonen.values()) if (inForm(Z.form, x, y, z)) zr = Z.raum;
    const v = VEH && VEH.cur,
      seat = PLAY && PLAY.seat;
    let innen = false;
    try {
      innen = !!(audio.inside && audio.inside());
    } catch (e) {}
    return D.raumVon({
      zone: zr,
      fahrzeug: v ? { id: v.id, name: v.name, offen: v.gl && v.gl.offen } : null,
      mitfahrt: !!(seat && (seat.kind === 'ride' || seat.drive)) && !v,
      innen,
    });
  }
  function lage() {
    let zone = S.zone;
    try {
      if (S.ortFn) zone = S.ortFn() || zone;
    } catch (e) {}
    return { raum: S.raum, zone };
  }
  // ---- the category of a bus (its slider scales the reverb's send) ----
  function kat(dest, o, r) {
    if (o && o.kat) return o.kat;
    if (!r) return 'effekte';
    return dest === r.vox ? 'stimmen' : dest === r.mus ? 'musik' : dest === r.amb ? 'umgebung' : 'effekte';
  }
  const volK = k => {
    const v = S.vols && Number.isFinite(S.vols[k]) ? S.vols[k] : 1;
    return v * v;
  };
  function ziel(o, r) {
    const d = o && o.dest;
    if (d && typeof d === 'object' && d.connect) return d;
    if (typeof d === 'string' && r[d]) return r[d];
    return r.sfx;
  }
  // ---- a point source ----
  function quelle(node, p = {}, o = {}) {
    const r = graph();
    if (!node) return null;
    const dest = r ? ziel(o, r) : null;
    if (!r) return stub(node, dest);
    const A = D.art(o.art),
      ctx = r.ctx;
    try {
      const f = n(ctx.createBiquadFilter()),
        g = n(ctx.createGain()),
        pan = n(ctx.createPanner()),
        s = n(ctx.createGain());
      f.type = 'lowpass';
      f.frequency.value = 18000;
      f.Q.value = 0.5;
      g.gain.value = 0;
      s.gain.value = 0;
      const hr = S.hrtf < S.MAXHRTF && o.hrtf !== false;
      pan.panningModel = hr ? 'HRTF' : 'equalpower';
      pan.distanceModel = 'inverse';
      pan.refDistance = o.ref || A.ref;
      pan.rolloffFactor = o.roll || A.roll;
      pan.maxDistance = 20000;
      node.connect(f);
      f.connect(g);
      g.connect(pan);
      pan.connect(dest);
      g.connect(s);
      s.connect(S.send);
      if (hr) S.hrtf++;
      const Q = {
        node,
        f,
        g,
        pan,
        s,
        hr,
        art: o.art || 'standard',
        ref: pan.refDistance,
        roll: pan.rolloffFactor,
        v: Number.isFinite(o.vol) ? o.vol : 1,
        innen: !!o.innen,
        sendK: (Number.isFinite(o.send) ? o.send : A.send) * 1,
        kat: kat(dest, o, r),
        x: +p.x || 0,
        y: +p.y || 0,
        z: Number.isFinite(p.z) ? p.z : 1,
        d: 0,
        aus: false,
        fadeIn: Number.isFinite(o.fadeIn) ? o.fadeIn : 0.04,
      };
      S.q.add(Q);
      setz(Q, ctx.currentTime, true);
      const h = {
        out: pan,
        get d() {
          return Q.d;
        },
        get raum() {
          return S.raum;
        },
        pos(x, y, z) {
          if (Q.aus) return h;
          Q.x = +x;
          Q.y = +y;
          if (Number.isFinite(z)) Q.z = z;
          setz(Q, ctx.currentTime, false);
          return h;
        },
        vol(v) {
          if (Q.aus) return h;
          Q.v = Math.max(0, +v || 0);
          setz(Q, ctx.currentTime, false);
          return h;
        },
        ende(fade = 0.05) {
          if (Q.aus) return;
          Q.aus = true;
          const t = ctx.currentTime;
          try {
            g.gain.cancelScheduledValues(t);
            g.gain.setTargetAtTime(0, t, Math.max(0.005, fade / 3));
          } catch (e) {}
          setTimeout(
            () => {
              try {
                node.disconnect(f);
              } catch (e) {
                try {
                  node.disconnect();
                } catch (e2) {}
              }
              kill(f, g, pan, s);
              S.q.delete(Q);
              if (Q.hr) S.hrtf--;
            },
            Math.max(30, fade * 1000 + 60)
          );
        },
        _q: Q,
      };
      return h;
    } catch (e) {
      S.err = String(e && e.message);
      return stub(node, dest);
    }
  }
  // without the room: straight to the bus, as the sounds went before
  function stub(node, dest) {
    try {
      if (dest) node.connect(dest);
    } catch (e) {}
    const h = {
      out: node,
      d: 0,
      raum: 'frei',
      pos: () => h,
      vol: () => h,
      ende() {
        try {
          node.disconnect();
        } catch (e) {}
      },
      stub: true,
    };
    return h;
  }
  // the source's distance, low-pass, level and send from where it and the ears are
  function setz(Q, t, sofort) {
    const [lx, ly, lz] = S.lst,
      d = Math.hypot(Q.x - lx, Q.y - ly, Q.z - lz);
    Q.d = d;
    const occ = D.dumpf(S.raum, Q.innen),
      fq = Math.min(D.luft(d), occ.f),
      lev = Q.v * occ.k,
      sd = Q.sendK * Math.sqrt(D.abstand(d, Q.ref, Q.roll)) * volK(Q.kat),
      tc = sofort ? 0.005 : 0.08;
    const P3 = Q.pan;
    if (P3.positionX) {
      if (sofort) {
        P3.positionX.value = Q.x;
        P3.positionY.value = Q.z;
        P3.positionZ.value = -Q.y;
      } else {
        P3.positionX.setTargetAtTime(Q.x, t, 0.03);
        P3.positionY.setTargetAtTime(Q.z, t, 0.03);
        P3.positionZ.setTargetAtTime(-Q.y, t, 0.03);
      }
    } else P3.setPosition(Q.x, Q.z, -Q.y);
    Q.f.frequency.setTargetAtTime(fq, t, tc);
    if (sofort) {
      Q.g.gain.setValueAtTime(0, t);
      Q.g.gain.setTargetAtTime(lev, t, Math.max(0.005, Q.fadeIn / 3));
    } else Q.g.gain.setTargetAtTime(lev, t, tc);
    Q.s.gain.setTargetAtTime(sd, t, tc);
  }
  // ---- a sound without a place into the room's reverb (k: its share) ----
  function hall(node, k = 0.5) {
    const r = graph();
    if (!r || !node) return { ende() {} };
    const s = n(r.ctx.createGain());
    s.gain.value = clamp(+k || 0, 0, 2);
    node.connect(s);
    s.connect(S.send);
    const h = {
      ende() {
        if (h.aus) return;
        h.aus = true;
        try {
          node.disconnect(s);
        } catch (e) {}
        kill(s);
        S.ketten.delete(h);
      },
    };
    S.ketten.add(h);
    return h;
  }
  // ---- chains: filters in a row, the last node returned with .ende() ----
  function kette(node, bau) {
    const r = graph();
    if (!r || !node) return node;
    const ctx = r.ctx,
      nodes = [];
    const mk = x => (nodes.push(n(x)), x);
    const bq = (type, f, q = 0.707, g = 0) => {
      const x = mk(ctx.createBiquadFilter());
      x.type = type;
      x.frequency.value = f;
      x.Q.value = q;
      x.gain.value = g;
      return x;
    };
    // a soft clip (k > 0: how hard) with a little asymmetry – the grit of a small speaker or a cheap codec
    const krach = (k, asym = 0.04) => {
      const x = mk(ctx.createWaveShaper()),
        N = 1024,
        c = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const u = (i / (N - 1)) * 2 - 1;
        c[i] = Math.tanh(k * (u + asym * u * u)) / Math.tanh(k);
      }
      x.curve = c;
      x.oversample = 'none';
      return x;
    };
    const comp = (thr, ratio, att = 0.004, rel = 0.15) => {
      const x = mk(ctx.createDynamicsCompressor());
      x.threshold.value = thr;
      x.knee.value = 6;
      x.ratio.value = ratio;
      x.attack.value = att;
      x.release.value = rel;
      return x;
    };
    const gain = v => {
      const x = mk(ctx.createGain());
      x.gain.value = v;
      return x;
    };
    let list;
    try {
      list = bau({ bq, krach, comp, gain });
    } catch (e) {
      S.err = String(e && e.message);
      for (const x of nodes) kill(x);
      return node;
    }
    let cur = node;
    for (const x of list) {
      cur.connect(x);
      cur = x;
    }
    const last = cur;
    const h = {
      ende() {
        if (h.aus) return;
        h.aus = true;
        try {
          node.disconnect(list[0]);
        } catch (e) {}
        for (const x of nodes) kill(x);
        S.ketten.delete(h);
      },
    };
    S.ketten.add(h);
    last.ende = h.ende;
    return last;
  }
  // the phone: the band of a call (300–3400 Hz, steep), the presence of a small earpiece, a codec's grit, squeezed
  const telefon = node =>
    kette(node, ({ bq, krach, comp, gain }) => [
      bq('highpass', 300, 0.8),
      bq('highpass', 320, 0.6),
      bq('peaking', 1800, 1.1, 4),
      bq('lowpass', 3400, 0.8),
      bq('lowpass', 3300, 0.6),
      krach(2.2),
      comp(-28, 6, 0.003, 0.12),
      gain(1.5),
    ]);
  // the radio's speaker: in the car's doors (a cabin's boom, a soft top), the phone's tiny one, a portable radio's mid-range box
  function lautsprecher(node, art = 'auto') {
    if (art === 'handy')
      return kette(node, ({ bq, krach, comp, gain }) => [
        bq('highpass', 480, 0.9),
        bq('peaking', 2200, 1.2, 5),
        bq('lowpass', 7000, 0.8),
        krach(1.8),
        comp(-24, 4),
        gain(1.2),
      ]);
    if (art === 'koffer')
      return kette(node, ({ bq, krach, gain }) => [
        bq('highpass', 150, 0.8),
        bq('peaking', 1200, 0.9, 5),
        bq('lowpass', 6500, 0.7),
        krach(1.3),
        gain(1.1),
      ]);
    return kette(node, ({ bq, gain }) => [
      bq('highpass', 70, 0.7),
      bq('peaking', 120, 1.1, 4),
      bq('peaking', 420, 1, -2),
      bq('peaking', 2600, 1, 2),
      bq('lowpass', 11500, 0.7),
      gain(1),
    ]);
  }
  // ---- a mission's room ----
  function zone(name, form, raum) {
    if (!name) return;
    if (!form) S.zonen.delete(name);
    else S.zonen.set(name, { form, raum: D.RAUM[raum] ? raum : 'innen' });
  }
  // ---- per frame (after the game's sound: KERN's callbacks run after audio.update) ----
  function tick(dt) {
    const aktiv = GL.on || S.q.size || S.ketten.size;
    if (!aktiv) return;
    const r = graph();
    if (!r || r.ctx.state !== 'running') return;
    try {
      hoerer(r);
      const now = performance.now();
      if (now - S.volT > 500) {
        S.volT = now;
        S.vols = audio.vols ? audio.vols() : null;
      }
      const raum = raumJetzt();
      if (S.ortFn)
        try {
          S.zone = S.ortFn() || '';
        } catch (e) {}
      const t = r.ctx.currentTime;
      if (raum !== S.raum) {
        S.raum = raum;
        for (const Q of S.q) setz(Q, t, false);
        KERN.emit('grenzland:raum', { raum, zone: S.zone });
      }
      if ((S.upd += dt) >= 0.1) {
        S.upd = 0;
        for (const Q of S.q) if (!Q.aus) setz(Q, t, false);
        hallen(t);
      }
    } catch (e) {
      S.err = String(e && e.message);
    }
  }
  KERN.tick(tick, 'grenzland/raum');
  // „Beenden“: every source and chain ends, the rooms of the missions go, the reverbs are dropped
  function alles() {
    for (const Q of [...S.q]) {
      Q.aus = true;
      try {
        Q.node.disconnect(Q.f);
      } catch (e) {}
      kill(Q.f, Q.g, Q.pan, Q.s);
      if (Q.hr) S.hrtf--;
      S.q.delete(Q);
    }
    for (const h of [...S.ketten]) h.ende();
    for (const [k, H] of Object.entries(S.hall)) {
      kill(H.conv, H.wet);
      delete S.hall[k];
    }
    S.zonen.clear();
    S.raum = 'frei';
    S.hrtf = Math.max(0, S.hrtf);
  }
  KERN.on('grenzland:stop', alles);
  const stand = () => ({
    raum: S.raum,
    zone: lage().zone,
    quellen: S.q.size,
    hrtf: [...S.q].filter(Q => Q.hr && Q.pan.panningModel === 'HRTF').length,
    ketten: S.ketten.size,
    nodes: S.made - S.freed,
    made: S.made,
    hallen: Object.keys(S.hall).filter(k => S.hall[k].on),
    wet: Object.fromEntries(Object.entries(S.hall).map(([k, H]) => [k, +H.wet.gain.value.toFixed(3)])),
    zonen: [...S.zonen.keys()],
    ohr: S.lst.map(v => +v.toFixed(1)),
    blick: S.fwd.map(v => +v.toFixed(2)),
    err: S.err,
    q: [...S.q].slice(0, 24).map(Q => ({
      art: Q.art,
      d: +Q.d.toFixed(1),
      f: Math.round(Q.f.frequency.value),
      g: +Q.g.gain.value.toFixed(3),
      model: Q.pan.panningModel,
      ref: Q.pan.refDistance,
    })),
  });
  return {
    lage,
    zone,
    quelle,
    hall,
    telefon,
    lautsprecher,
    ort: fn => (S.ortFn = typeof fn === 'function' ? fn : null),
    stand,
    alles,
    tick,
    S,
  };
})();
window.GLRAUM = GLRAUM;
