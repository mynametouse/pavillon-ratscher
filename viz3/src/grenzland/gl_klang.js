// ===================== ton-welt: the places of „Grenzland“ as one hears them (GLKLANG) – beds by place and time, weather, one-shots, bells =====================
// Falko, 13.11.2026 23:02: „… versuch ein atmosphärisches Soundkonzept zu entwickeln …“ – ~23:20 chosen: places and time of day, room sound.
// With closed eyes one hears where one is and when it is. Only while the mode runs (GL.on); it replaces the base game's surroundings (the
// loops of birds, wind and dusk and their one-shots, audio/audio.js) while it plays and gives them back after „Beenden“:
//   - the place (grenzland/gl_klang_data.js zoneVon: Ratscher, the garden, the forest and the Klinge, the reservoir, Schleusingen, Suhl, the
//     open country; prepared for chapter 2: the old border strip, the bunker – set by missions, GLKLANG.zone(id)): a stereo bed by day and by
//     night, cross-faded over ~3 s when the place changes; the dawn chorus, summer crickets, winter quieter
//   - the weather (WETTER: live or by calendar): rain on what is there (leaves, roofs, pavement, water, the car's roof), wind with its gusts;
//     the weather's own sounds (wetter/wx_ton.js: steady rain, storm, thunder) play on as before
//   - one-shots placed around the player through GLRAUM (grenzland/gl_raum.js: direction, distance, room): a dog, a tractor far off, the
//     woodpecker, crows, ducks, a door, steps in town, the blackbird at dusk, the tawny owl and the fox at night …
//   - the bells of the real towers striking the hours (and quarters) – a recording, else a struck bell made here; brooks, the waterfall in
//     Schleusingen, fountains; the fair of grenzland/gl_ereignis.js (brass, a ride, the crowd), the Saturday market, the pubs at night
// The sounds come from the sound repository (GLMEDIEN of grenzland/gl_medien.js when it is there, else a small loader here with the same
// base: localStorage 'pav-ton-basis', on GitHub Pages /pavillon-ton/): ids 'kl_<id>' in its index.json, files klang/<zone>/<id>.mp3 – the
// sources and their licences in tools/ton/quellen/klang.json. Nothing is fetched before a place needs it; the beds are decoded at 32 kHz
// (a third less memory), dropped when silent for a while; one-shots stay in a small cache. Missing repository or files: the base game's
// surroundings stay as they are, nothing shows on screen.
// Taking the base ambience: audio.basis(k) when audio.js has it (a patch proposed to the lead, viz3/extra/grenzland-klang/audio_basis.patch),
// else from outside – each frame after the weather, the birds and the light wind of audio.js are told to keep silent (audio.weather) and
// its dusk loop and crickets off (audio.setTime) – only the rare far calls of audio.js stay (crows, woodpeckers, bells).
//   GLKLANG.stand() for tests · GLKLANG.zone(id) a mission's place · GLKLANG.debug: { zone, einzel, glocke, platz }
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { VEH } from '../vehicles/vehicle.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { WETTER } from '../wetter/wetter.js';
import { audio } from '../audio/audio.js';
import { GL } from './gl_state.js';
import { GLRAUM } from './gl_raum.js';
import { GLKDATA as D } from './gl_klang_data.js';
export const GLKLANG = (() => {
  const W = window;
  const S = {
    on: false,
    ctx: null,
    out: null, // the mode's surroundings: → the slider bus (audio.raw().umg) or the master with the slider's value
    bett: null, // the beds' bus → a low-pass and a gain for the room (muffled in the car and indoors) → out
    bettF: null,
    zz: { cur: '', cand: '', t: 0 },
    zone: '',
    mission: '',
    raum: 'frei',
    seeD: 1e9,
    schicht: {}, // id → { src, g, w, buf, aus: s silent }
    einzel: {}, // id → seconds to the next
    laufend: new Set(), // one-shots playing { h, src, vx, vy, x, y, z, t }
    fest: {}, // fixed loops id → { h, src }
    glocke: { min: null, q: [] },
    kirmes: null, // { x, y, quellen: [] }
    kneipe: {},
    markt: null,
    idx: null, // Promise of the entries (Map id → entry)
    map: null,
    ok: false, // the repository has klang entries
    st: '', // '' | 'laedt' | 'ok' | 'aus'
    bufs: new Map(), // id → { p, b, bytes, t, bett }
    bytes: 0,
    weg: 'aus', // how the base ambience is taken: 'aus' | 'basis' | 'fallback'
    duck: 1,
    gust: 0,
    gustZ: 0,
    gustT: 0,
    wT: 0,
    zT: 0,
    volT: 0,
    made: 0,
    freed: 0,
    err: '',
    w: {}, // the weights last computed
    lage: {},
    holt: 0,
    fehlt: new Set(),
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
  function kill(...xs) {
    for (const x of xs)
      if (x) {
        try {
          x.disconnect();
        } catch (e) {}
        S.freed++;
      }
  }
  // ---------------- the repository ----------------
  const KEY = 'pav-ton-basis';
  function grund() {
    const M = W.GLMEDIEN;
    if (M && typeof M.BASE === 'string') return M.BASE;
    try {
      const o = W.localStorage && W.localStorage.getItem(KEY);
      if (o && /^(https?:\/\/|\/|\.\.?\/)/i.test(o)) return o.endsWith('/') ? o : o + '/';
    } catch (e) {}
    try {
      if (/\.github\.io$/i.test(W.location.hostname)) return W.location.origin + '/pavillon-ton/';
    } catch (e) {}
    return 'https://mynametouse.github.io/pavillon-ton/';
  }
  // the entries of index.json whose id begins with 'kl_' (or of kind 'klang'), as a Map id → entry (the id without its prefix)
  function eintraege(list) {
    const m = new Map();
    for (const e of list || []) {
      if (!e || typeof e !== 'object') continue;
      const id = String(e.id || '');
      if (!(id.startsWith('kl_') || e.kind === 'klang') || !(e.file || e.datei)) continue;
      if (e.aus === true) continue;
      m.set(id.replace(/^kl_/, ''), e);
    }
    return m;
  }
  function liste(j) {
    if (Array.isArray(j)) return j;
    if (j && typeof j === 'object') {
      const a = ['eintraege', 'items', 'entries', 'liste', 'files', 'dateien', 'alle']
        .map(k => j[k])
        .find(Array.isArray);
      if (a) return a;
      return Object.entries(j)
        .filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
        .map(([k, v]) => Object.assign({ id: k }, v));
    }
    return [];
  }
  function index() {
    const base = grund();
    if (S.idx && S.idxBase === base) return S.idx;
    S.idxBase = base;
    S.st = 'laedt';
    const M = W.GLMEDIEN;
    const p =
      M && M.index && M.liste
        ? M.index().then(() => eintraege(M.liste()))
        : fetch(base + 'index.json')
            .then(r => (r.ok ? r.json() : null))
            .then(j => eintraege(liste(j)))
            .catch(() => new Map());
    S.idx = p
      .catch(() => new Map())
      .then(m => {
        if (S.idxBase !== base) return S.map;
        S.map = m;
        S.ok = m.size > 0;
        S.st = S.ok ? 'ok' : 'aus';
        return m;
      });
    return S.idx;
  }
  function url(id) {
    const e = S.map && S.map.get(id);
    if (!e) return null;
    const M = W.GLMEDIEN;
    if (M && M.url) {
      const u = M.url(e.id);
      if (u) return u;
    }
    const f = String(e.file || e.datei);
    return /^(https?:|data:|blob:|\/)/i.test(f) ? f : S.idxBase + f.replace(/^\.?\//, '');
  }
  // decoding at 32 kHz where the browser lets an offline context do it (a bed of 40 s stereo: 10 MB instead of 15), else as the game's
  function decode(ab, ctx) {
    return new Promise(res => {
      let off = null;
      try {
        const OAC = W.OfflineAudioContext || W.webkitOfflineAudioContext;
        if (OAC && ctx.sampleRate > 32000) off = new OAC(2, 32, 32000);
      } catch (e) {
        off = null;
      }
      const viaMain = () => {
        try {
          const q = ctx.decodeAudioData(ab.slice ? ab.slice(0) : ab, res, () => res(null));
          if (q && q.catch) q.catch(() => res(null));
        } catch (e) {
          res(null);
        }
      };
      if (!off) return viaMain();
      try {
        const keep = ab.slice(0);
        const q = off.decodeAudioData(
          ab,
          b => res(b),
          () => {
            ab = keep;
            viaMain();
          }
        );
        if (q && q.catch)
          q.catch(() => {
            ab = keep;
            viaMain();
          });
      } catch (e) {
        viaMain();
      }
    });
  }
  // a sound by id: Promise<AudioBuffer | null> (once; one-shots kept in a cache of a dozen, beds while they sound)
  function lade(id, bett) {
    const have = S.bufs.get(id);
    if (have) {
      have.t = performance.now();
      return have.p;
    }
    const r = raw();
    if (!r || !S.ok) return Promise.resolve(null);
    const u = url(id);
    if (!u) {
      S.fehlt.add(id);
      return Promise.resolve(null);
    }
    S.holt++;
    const E = { p: null, b: null, bytes: 0, t: performance.now(), bett: !!bett };
    E.p = fetch(u)
      .then(x => (x.ok ? x.arrayBuffer() : null))
      .then(ab => (ab ? decode(ab, r.ctx) : null))
      .then(b => {
        if (!b) S.fehlt.add(id);
        E.b = b;
        E.bytes = b ? b.length * b.numberOfChannels * 4 : 0;
        S.bytes += E.bytes;
        return b;
      })
      .catch(() => {
        S.fehlt.add(id);
        return null;
      });
    S.bufs.set(id, E);
    aufraeumen();
    return E.p;
  }
  // the one-shots' cache: the twelve used last stay; beds go when they are silent (schichten())
  function aufraeumen() {
    const kurz = [...S.bufs.entries()].filter(([, E]) => !E.bett && E.b).sort((a, b) => a[1].t - b[1].t);
    while (kurz.length > 12) {
      const [id, E] = kurz.shift();
      S.bytes -= E.bytes;
      S.bufs.delete(id);
    }
  }
  function vergiss(id) {
    const E = S.bufs.get(id);
    if (!E) return;
    S.bytes -= E.bytes;
    S.bufs.delete(id);
  }
  const buf = id => {
    const E = S.bufs.get(id);
    return E && E.b ? E.b : null;
  };
  // ---------------- the graph ----------------
  function graph() {
    const r = raw();
    if (!r) return null;
    if (S.ctx !== r.ctx) {
      S.ctx = r.ctx;
      S.out = n(r.ctx.createGain());
      S.out.gain.value = 0;
      S.out.connect(r.umg || r.master);
      S.bettF = n(r.ctx.createBiquadFilter());
      S.bettF.type = 'lowpass';
      S.bettF.frequency.value = 20000;
      S.bettF.Q.value = 0.5;
      S.bett = n(r.ctx.createGain());
      S.bett.connect(S.bettF);
      S.bettF.connect(S.out);
      S.schicht = {};
    }
    return r;
  }
  // the player's volume for the surroundings (squared, as audio.js applies it) when the output cannot go through the slider's bus
  function pegel(r, t) {
    const v = audio.vols ? audio.vols() : null,
      k = r.umg ? 1 : v ? v.umgebung * v.umgebung : 1;
    S.out.gain.setTargetAtTime(S.on ? k * S.duck : 0, t, S.on ? 0.6 : 0.3);
  }
  // ---------------- the base game's surroundings ----------------
  function todJetzt() {
    const s = DN && DN.state;
    if (!s) return 'gold';
    return s.top || s.sunEl > 12 ? 'day' : s.sunEl > -1 ? 'gold' : 'dusk';
  }
  function nehmen(an) {
    if (an) {
      if (typeof audio.basis === 'function') {
        if (S.weg !== 'basis') audio.basis(0);
        S.weg = 'basis';
      } else {
        S.weg = 'fallback';
        // (each frame after the weather's own call – the weather's KERN callback runs before this module's)
        audio.weather({ birds: 0, wind: 0 });
        audio.setTime('gold');
      }
    } else if (S.weg !== 'aus') {
      if (S.weg === 'basis' && typeof audio.basis === 'function') audio.basis(1);
      else {
        const a = WETTER && WETTER.S && WETTER.S.amb;
        audio.weather(a && Number.isFinite(a.birds) ? a : { birds: 1, wind: 1 });
        audio.setTime(todJetzt());
      }
      S.weg = 'aus';
    }
  }
  // ---------------- where and when ----------------
  let see = null;
  function seePoly() {
    if (see !== null) return see;
    see = false;
    try {
      const w = ((W.GEOMAN && W.GEOMAN.water) || [])
        .filter(q => /Talsperre/.test(q.name || ''))
        .sort((a, b) => b.area - a.area)[0];
      if (w && w.x && w.y) see = w;
    } catch (e) {}
    return see;
  }
  function ohr() {
    const v = VEH && VEH.cur;
    if (v && v.st) return [v.st.x, v.st.y];
    if (P.mode === 'walk') return [P.x, P.y];
    const w = KERN.where && KERN.where();
    return w || [P.x, P.y];
  }
  function zeit() {
    const t = CLOCK.t,
      m = ((t % 1440) + 1440) % 1440,
      h = m / 60;
    let monat = 6,
      wtag = 5;
    try {
      const eday = DN.e0 + Math.floor(t / 1440),
        d = new Date(eday * 864e5);
      monat = d.getUTCMonth() + 1;
      wtag = d.getUTCDay();
    } catch (e) {}
    const s = DN && DN.state,
      sunEl = s && Number.isFinite(s.sunEl) ? s.sunEl : h > 6 && h < 20 ? 30 : -20;
    return { h, min: Math.floor(m), monat, wtag, sunEl, morgens: h < 12, abends: h >= 12 };
  }
  function wetter() {
    const on = !!(DN && DN.active && DN.mode === 'auto' && P.mode !== 'top'),
      c = (WETTER && WETTER.S && WETTER.S.cur) || {},
      w = (WETTER && WETTER.S && WETTER.S.w) || {};
    if (!on) return { regen: 0, wind: +c.wind || 0, boe: +c.gust || 0, niesel: false, gewitter: false, schnee: 0 };
    return {
      regen: +c.rain || 0,
      wind: +c.wind || 0,
      boe: +c.gust || 0,
      niesel: !!w.drizzle,
      gewitter: !!w.thunder,
      schnee: +c.snow || 0,
    };
  }
  function wo(dt) {
    const [x, y] = ohr();
    let place = null,
      wald = 0;
    try {
      place = KERN.place(x, y, P.feet);
    } catch (e) {}
    try {
      wald = W.FOREST && W.FOREST.amb ? W.FOREST.amb() : 0;
    } catch (e) {}
    const sp = seePoly();
    S.seeD = sp ? D.polyAbstand(sp.x, sp.y, x, y) : 1e9;
    const roh = D.zoneVon({ x, y, place, wald, seeD: S.seeD, mission: S.mission, era: GL.era });
    if (S.zz.force) {
      S.zz.cur = S.zz.force;
      S.zone = S.zz.force;
    } else if (D.zoneHalten(S.zz, roh, dt)) S.zone = S.zz.cur;
    S.lage = { x: Math.round(x), y: Math.round(y), place, wald: +wald.toFixed(2), roh };
  }
  // ---------------- beds and layers ----------------
  const SCHICHT_VOL = { regen_auto: 0.8, grillen: 0.8, morgen: 0.9 };
  function schichten(r, t, dt) {
    const Z = zeit(),
      WX = wetter(),
      L = GLRAUM.lage ? GLRAUM.lage() : { raum: 'frei' };
    S.raum = L.raum || 'frei';
    const w = D.gewichte(Object.assign({ zone: S.zone, raum: S.raum }, Z, WX));
    S.w = w;
    // gusts: a slow wander towards a new target every few seconds, its depth by how much the gusts exceed the wind
    if ((S.gustT -= dt) <= 0) {
      S.gustT = 2.5 + Math.random() * 5;
      S.gustZ = Math.random();
    }
    S.gust += (S.gustZ - S.gust) * Math.min(1, dt * 0.6);
    const tief = clamp(((WX.boe || 0) - (WX.wind || 0)) / 8, 0.15, 1);
    let spielt = 0;
    for (const id of new Set([...Object.keys(w), ...Object.keys(S.schicht)])) {
      let L2 = S.schicht[id],
        want = (w[id] || 0) * (SCHICHT_VOL[id] || 1);
      if (/^wind_/.test(id)) want *= 0.65 + 0.7 * S.gust * tief;
      if (!L2) {
        if (want <= 0.002) continue;
        L2 = S.schicht[id] = { src: null, g: null, want: 0, aus: 0, laed: false };
      }
      L2.want = want;
      if (!L2.src && want > 0.002 && !L2.laed && !S.fehlt.has(id)) {
        L2.laed = true;
        lade(id, true).then(b => {
          L2.laed = false;
          if (!b || !S.on || S.schicht[id] !== L2 || L2.src) return;
          const rr = graph();
          if (!rr) return;
          const src = n(rr.ctx.createBufferSource()),
            g = n(rr.ctx.createGain());
          src.buffer = b;
          src.loop = true;
          // inside the buffer by a hair: the encoder's silence at both ends stays out of the loop
          if (b.duration > 2) {
            src.loopStart = 0.03;
            src.loopEnd = b.duration - 0.03;
          }
          g.gain.value = 0;
          src.connect(g);
          g.connect(S.bett);
          src.start(rr.ctx.currentTime + 0.02, 0.03 + Math.random() * Math.max(0, b.duration - 1));
          L2.src = src;
          L2.g = g;
        });
      }
      if (L2.g) {
        // 2–4 s cross-fades (a time constant of ~0.9 s), a little faster for the room's rain on the car roof
        L2.g.gain.setTargetAtTime(want, t, id === 'regen_auto' ? 0.4 : 0.9);
        if (want > 0.002) spielt++;
      }
      L2.aus = want > 0.002 ? 0 : L2.aus + dt;
      // silent for 10 s: the loop stops and its buffer goes (the next place needs the memory)
      if (L2.aus > 10) {
        if (L2.src)
          try {
            L2.src.stop();
          } catch (e) {}
        kill(L2.src, L2.g);
        delete S.schicht[id];
        vergiss(id);
      }
    }
    // the beds in their room: muffled in a car or a building (the room's own wall), lower in the bunker
    const occ = D.dumpf(S.raum, false);
    S.bettF.frequency.setTargetAtTime(occ.f, t, 0.25);
    S.bett.gain.setTargetAtTime(occ.k, t, 0.25);
    return spielt;
  }
  // ---------------- one-shots ----------------
  function einzel(r, dt) {
    const Z = zeit(),
      WX = wetter(),
      [x, y] = ohr(),
      o = Object.assign({ zone: S.zone, era: GL.era }, Z, WX);
    for (const e of D.EINZEL) {
      if (!(e.id in S.einzel)) S.einzel[e.id] = D.naechste(e) * Math.random();
      if ((S.einzel[e.id] -= dt) > 0) continue;
      S.einzel[e.id] = D.naechste(e);
      if (!D.erlaubt(e, o) || S.laufend.size >= 6) continue;
      const id = e.dateien[Math.floor(Math.random() * e.dateien.length)],
        b = buf(id);
      if (!b) {
        // fetched now, heard the next time
        if (!S.fehlt.has(id)) lade(id);
        continue;
      }
      spiel(r, b, D.platz(e, x, y), e);
    }
    // the ones passing by move on
    for (const L of S.laufend) {
      if (!L.vx && !L.vy) continue;
      L.x += L.vx * dt;
      L.y += L.vy * dt;
      L.h.pos(L.x, L.y, L.z);
    }
  }
  function spiel(r, b, p, e, o = {}) {
    const src = n(r.ctx.createBufferSource());
    src.buffer = b;
    src.playbackRate.value = o.rate || 0.96 + Math.random() * 0.08;
    let z = p.z;
    try {
      z = KERN.ground(p.x, p.y) + p.z;
    } catch (er) {}
    const h = GLRAUM.quelle(src, { x: p.x, y: p.y, z }, { art: e.art, vol: (e.vol || 1) * (o.vol || 1), dest: S.out });
    const L = { h, src, x: p.x, y: p.y, z, vx: p.vx || 0, vy: p.vy || 0, id: e.id };
    S.laufend.add(L);
    src.onended = () => {
      S.laufend.delete(L);
      h.ende(0.05);
      S.freed++;
    };
    src.start(r.ctx.currentTime + (o.at || 0.01));
    return L;
  }
  // ---------------- the bells ----------------
  // a struck bell made here when no recording is there: the partials of a church bell (hum, prime, tierce, quint, nominal …) dying away
  function glockeSynth(r, f0, k) {
    const ctx = r.ctx,
      len = 7.5,
      sr = ctx.sampleRate,
      N = Math.floor(sr * len),
      b = ctx.createBuffer(1, N, sr),
      d = b.getChannelData(0);
    const P = [
      [0.5, 0.5, 6.5],
      [1, 0.8, 4.2],
      [1.19, 0.45, 3.4],
      [1.5, 0.35, 2.6],
      [2, 0.55, 2.2],
      [2.51, 0.22, 1.5],
      [2.99, 0.18, 1.2],
      [4.06, 0.12, 0.8],
    ];
    for (let i = 0; i < N; i++) {
      const t = i / sr;
      let v = 0;
      for (const [m, a, dec] of P) v += a * Math.exp(-t / dec) * Math.sin(2 * Math.PI * f0 * m * t + m);
      d[i] = v * 0.22 * k * Math.min(1, t * 400);
    }
    return b;
  }
  const SYN = {};
  function glockenBuf(r, ton) {
    const b = buf(ton);
    if (b) return b;
    if (!S.fehlt.has(ton)) lade(ton);
    const key = ton + r.ctx.sampleRate;
    if (!SYN[key]) SYN[key] = glockeSynth(r, ton === 'glocke_gross' ? 196 : 392, ton === 'glocke_gross' ? 1 : 0.8);
    return SYN[key];
  }
  function glocken(r, dt) {
    const Z = zeit();
    const G = S.glocke;
    if (G.min === null || Z.min === G.min) {
      if (G.min === null) G.min = Z.min;
    } else {
      // the minutes passed since the last look (a jump of the clock – sleeping, „Am nächsten Morgen“ – strikes nothing)
      const step = (Z.min - G.min + 1440) % 1440;
      if (step > 0 && step <= 5)
        for (let k = 1; k <= step; k++) {
          const mm = (G.min + k) % 1440;
          strikes(Math.floor(mm / 60), mm % 60);
        }
      G.min = Z.min;
    }
    // the strokes due now
    const t = performance.now() / 1000;
    for (let i = G.q.length - 1; i >= 0; i--) {
      const s = G.q[i];
      if (s.at > t) continue;
      G.q.splice(i, 1);
      const b = glockenBuf(r, s.ton);
      if (b) spiel(r, b, { x: s.x, y: s.y, z: s.z }, { id: 'glocke', art: 'glocke', vol: s.vol }, { rate: 1, vol: 1 });
    }
  }
  function strikes(h, m) {
    const [x, y] = ohr(),
      t0 = performance.now() / 1000;
    for (const g of D.GLOCKEN) {
      // the flashback strikes the school's bell itself (grenzland/gl_1989.js)
      if (g.era && GL.era !== g.era) continue;
      const d = Math.hypot(g.pos[0] - x, g.pos[1] - y);
      if (d > D.ARTEN.glocke.max) continue;
      const list = D.schlaege(h, m, g.art, g.ruhe);
      if (!list.length) continue;
      let pos = g.pos,
        z = g.h;
      // Ratscher's turret where the village drew it
      if (g.id === 'ratscher' && W.VPROPS && W.VPROPS.school) {
        const sc = W.VPROPS.school;
        pos = [sc.cx, sc.cy];
        z = (sc.zr || 0) + 1.6;
      } else
        try {
          z = KERN.ground(pos[0], pos[1]) + g.h;
        } catch (e) {}
      const off = (g.versatz || 0) + Math.random() * 0.6;
      for (const s of list.slice(0, 20))
        S.glocke.q.push({
          at: t0 + off + s.t,
          ton: s.ton === 'viertel' ? g.viertel || g.ton : g.ton,
          x: pos[0],
          y: pos[1],
          z,
          vol: s.ton === 'viertel' ? 0.75 : 1,
          id: g.id,
        });
    }
    if (S.glocke.q.length > 60) S.glocke.q.splice(0, S.glocke.q.length - 60);
  }
  // ---------------- loops at fixed places (brooks, the waterfall, fountains; the fair, the market, the pubs) ----------------
  function festLoop(r, key, id, pos, artName, vol, o = {}) {
    const F = S.fest[key];
    if (F) return F;
    const b = buf(id);
    if (!b) {
      if (!S.fehlt.has(id)) lade(id);
      return null;
    }
    const src = n(r.ctx.createBufferSource());
    src.buffer = b;
    src.loop = true;
    if (b.duration > 2) {
      src.loopStart = 0.03;
      src.loopEnd = b.duration - 0.03;
    }
    let z = D.art(artName).h;
    try {
      z += KERN.ground(pos[0], pos[1]);
    } catch (e) {}
    let node = src,
      tuer = null;
    if (o.tuer) {
      // behind a door: muffled, opened now and then (pub)
      tuer = n(r.ctx.createBiquadFilter());
      tuer.type = 'lowpass';
      tuer.frequency.value = 520;
      src.connect(tuer);
      node = tuer;
    }
    const h = GLRAUM.quelle(node, { x: pos[0], y: pos[1], z }, { art: artName, vol, dest: S.out, fadeIn: 2 });
    src.start(r.ctx.currentTime + 0.02, Math.random() * Math.max(0, b.duration - 1));
    return (S.fest[key] = { h, src, tuer, id, pos, vol, art: artName, openT: 0, nextOpen: 20 + Math.random() * 40 });
  }
  function festWeg(key, fade = 1.5) {
    const F = S.fest[key];
    if (!F) return;
    delete S.fest[key];
    F.h.ende(fade);
    setTimeout(
      () => {
        try {
          F.src.stop();
        } catch (e) {}
        kill(F.src, F.tuer);
      },
      fade * 1000 + 200
    );
  }
  function feste(r, dt) {
    const [x, y] = ohr(),
      Z = zeit(),
      want = new Set();
    for (const q of D.QUELLEN) {
      const d = Math.hypot(q.pos[0] - x, q.pos[1] - y),
        max = D.art(q.art).max;
      if (d < max || (S.fest['q:' + q.id] && d < max * 1.2)) {
        want.add('q:' + q.id);
        festLoop(r, 'q:' + q.id, q.datei, q.pos, q.art, q.vol);
      }
    }
    // the fair (grenzland/gl_ereignis.js): brass, a ride, the crowd round the tree
    const K = S.kirmes;
    if (K)
      for (const k of D.KIRMES) {
        const pos = [K.x + k.dx, K.y + k.dy];
        if (Math.hypot(pos[0] - x, pos[1] - y) < D.art(k.art).max) {
          want.add('k:' + k.id);
          festLoop(r, 'k:' + k.id, k.datei, pos, k.art, k.vol);
        }
      }
    // the market on Saturday morning: the crowd at three places of the square
    if (GL.era === 'heute' && D.marktOffen(Z.wtag, Z.h) && Math.hypot(D.MARKT.pos[0] - x, D.MARKT.pos[1] - y) < 260)
      for (const [i, [dx, dy]] of [
        [-14, 6],
        [12, -4],
        [2, 14],
      ].entries()) {
        want.add('m:' + i);
        festLoop(r, 'm:' + i, D.MARKT.walla, [D.MARKT.pos[0] + dx, D.MARKT.pos[1] + dy], 'walla', D.MARKT.vol * 0.6);
      }
    // the pubs in the evening: talk behind the door, the door opens now and then (music and voices spill out)
    if (D.kneipeOffen(Z.wtag, Z.h))
      for (const [i, pos] of KNEIPEN.entries()) {
        if (Math.hypot(pos[0] - x, pos[1] - y) > 70) continue;
        const key = 'p:' + i;
        want.add(key);
        const F = festLoop(
          r,
          key,
          D.KNEIPE.walla,
          pos,
          'walla',
          D.KNEIPE.vol * (D.KNEIPE.voll.includes(Z.wtag) ? 1 : 0.7),
          { tuer: true }
        );
        if (F && F.tuer) tuerTick(r, F, dt);
      }
    for (const key of Object.keys(S.fest)) if (!want.has(key)) festWeg(key);
  }
  // where the pubs of Schleusingen are (OpenStreetMap, welt/schleusingen.js stadt.json – the places only, no names)
  const KNEIPEN = [
    [-940.7, 1290.3],
    [-1115.7, 1184.0],
    [-1036.1, 1253.3],
  ];
  function tuerTick(r, F, dt) {
    const t = r.ctx.currentTime;
    if (F.openT > 0) {
      F.openT -= dt;
      if (F.openT <= 0) {
        F.tuer.frequency.setTargetAtTime(520, t, 0.25);
        F.h.vol(F.vol);
        const b = buf(D.KNEIPE.tuer);
        if (b) spiel(r, b, { x: F.pos[0], y: F.pos[1], z: 1.2 }, { id: 'tuer', art: 'tuer', vol: 0.7 }, { rate: 1 });
      }
      return;
    }
    if ((F.nextOpen -= dt) > 0) return;
    F.nextOpen = 25 + Math.random() * 70;
    F.openT = 3 + Math.random() * 4;
    F.tuer.frequency.setTargetAtTime(6000, t, 0.12);
    F.h.vol(F.vol * 2.2);
    const b = buf(D.KNEIPE.tuer);
    if (b) spiel(r, b, { x: F.pos[0], y: F.pos[1], z: 1.2 }, { id: 'tuer', art: 'tuer', vol: 0.8 }, { rate: 1.03 });
    else lade(D.KNEIPE.tuer);
  }
  KERN.on('grenzland:ereignis', d => {
    if (!d || d.name !== 'kirmes') return;
    if ('ende' in d) S.kirmes = null;
    else if (Number.isFinite(d.x) && Number.isFinite(d.y)) S.kirmes = { x: d.x, y: d.y };
  });
  // ---------------- on and off ----------------
  function start() {
    if (S.on) return;
    S.on = true;
    S.zz = { cur: '', cand: '', t: 0 };
    S.zone = '';
    S.einzel = {};
    S.glocke = { min: null, q: [] };
    GLRAUM.ort(() => S.zone);
    index();
  }
  function stop() {
    if (!S.on) return;
    S.on = false;
    nehmen(false);
    const r = raw();
    const t = r ? r.ctx.currentTime : 0;
    for (const [id, L] of Object.entries(S.schicht)) {
      if (L.g) L.g.gain.setTargetAtTime(0, t, 0.3);
      const L2 = L;
      setTimeout(() => {
        if (L2.src)
          try {
            L2.src.stop();
          } catch (e) {}
        kill(L2.src, L2.g);
      }, 1600);
      delete S.schicht[id];
    }
    for (const L of [...S.laufend]) {
      try {
        L.src.onended = null;
        L.src.stop();
      } catch (e) {}
      L.h.ende(0.2);
      S.laufend.delete(L);
      S.freed++;
    }
    for (const key of Object.keys(S.fest)) festWeg(key, 0.4);
    S.kirmes = null;
    S.glocke.q.length = 0;
    S.bufs.clear();
    S.bytes = 0;
    S.mission = '';
    if (r && S.out) S.out.gain.setTargetAtTime(0, t, 0.3);
    GLRAUM.ort(null);
  }
  KERN.on('grenzland:start', () => start());
  KERN.on('grenzland:stop', () => stop());
  KERN.on('grenzland:stimme', d => {
    S.duck = d && d.an ? 0.72 : 1;
  });
  // ---------------- per frame ----------------
  function tick(dt) {
    if (!S.on) {
      if (GL.on) start();
      return;
    }
    if (!GL.on) return stop();
    const r = graph();
    if (!r || r.ctx.state !== 'running') return;
    dt = Math.min(dt, 0.25);
    try {
      if ((S.zT += dt) >= 0.5) {
        wo(S.zT);
        S.zT = 0;
        // a test (or the player's own setting) may point the repository elsewhere; the fair ends with its event (or when it is gone)
        if ((S.bT = (S.bT || 0) + 1) % 4 === 0 && S.idxBase !== grund()) index();
        const E = W.GLEREIGNIS;
        if (S.kirmes && E && E.aktiv && E.aktiv() !== 'kirmes') S.kirmes = null;
      }
      const t = r.ctx.currentTime;
      if ((S.volT += dt) >= 0.5) {
        S.volT = 0;
        pegel(r, t);
      }
      let spielt = 0;
      if (S.ok && S.zone) {
        if ((S.wT += dt) >= 0.25) {
          S.spielt = schichten(r, t, S.wT);
          S.wT = 0;
        }
        spielt = S.spielt || 0;
        einzel(r, dt);
        feste(r, dt);
      }
      glocken(r, dt);
      // the base game's surroundings step back while a bed of this module sounds, and come back when none does
      nehmen(S.ok && spielt > 0);
    } catch (e) {
      if (!S.err) console.warn('grenzland klang', e);
      S.err = String((e && e.message) || e);
    }
  }
  KERN.tick(tick, 'grenzland/klang');
  // ---------------- tests ----------------
  const stand = () => ({
    on: S.on,
    st: S.st,
    ok: S.ok,
    base: S.idxBase || grund(),
    zone: S.zone,
    raum: S.raum,
    lage: S.lage,
    seeD: Math.round(S.seeD),
    weg: S.weg,
    w: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, +v.toFixed(3)])),
    schichten: Object.fromEntries(
      Object.entries(S.schicht).map(([k, L]) => [
        k,
        { want: +L.want.toFixed(3), g: L.g ? +L.g.gain.value.toFixed(3) : -1, spielt: !!L.src },
      ])
    ),
    laufend: [...S.laufend].map(L => ({ id: L.id, d: L.h && L.h.d ? Math.round(L.h.d) : 0 })),
    fest: Object.keys(S.fest),
    glocken: S.glocke.q.length,
    kirmes: !!S.kirmes,
    bufs: S.bufs.size,
    mb: +(S.bytes / 1048576).toFixed(1),
    fehlt: [...S.fehlt].slice(0, 30),
    holt: S.holt,
    nodes: S.made - S.freed,
    out: S.out ? +S.out.gain.value.toFixed(3) : 0,
    err: S.err,
  });
  const debug = {
    // a place forced ('' lets the rules decide again)
    zone(id) {
      S.zz.force = id || '';
      if (id) S.zone = id;
    },
    // a one-shot now, ahead of its time
    einzel(id) {
      const e = D.EINZEL.find(q => q.id === id),
        r = raw();
      if (!e || !r) return false;
      const f = e.dateien[0],
        b = buf(f);
      if (!b) {
        lade(f);
        return false;
      }
      const [x, y] = ohr();
      spiel(r, b, D.platz(e, x, y), e);
      return true;
    },
    // the bells of this hour and minute now
    glocke(h, m = 0) {
      strikes(h, m);
      return S.glocke.q.length;
    },
    zeit,
    wetter,
  };
  return {
    start,
    stop,
    stand,
    // a mission's place (chapter 2: 'grenze', 'bunker'; '' → the rules)
    zone(id) {
      S.mission = id && D.ZONEN[id] ? id : '';
    },
    index,
    debug,
    S,
  };
})();
window.GLKLANG = GLKLANG;
