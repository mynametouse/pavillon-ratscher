// ===================== feat/tiere 2b: the animals' voices – free recordings, positional, loaded on first need (TTON) =====================
// Recordings from Wikimedia Commons (CC BY-SA, CC BY; credits in viz3/extra/tiere/manifest.json): the roe buck's bark when it senses danger
// (Schrecken), grunting of pigs for the sounder, the barking and the scream of the fox, a dog barking for Hasso; the birds when their files
// are there (tiere/ton.json lists what exists). Decoded once the audio context runs (after the first tap), played through the game's
// effects bus with distance, pan and a low-pass for the far ones (audio/audio.js spatial). The whistle for the dog is synthesised.
import { BASE } from '../core/head.js';
import { audio } from '../audio/audio.js';
export const TTON = (() => {
  const S = { map: null, buf: {}, loading: null, last: {}, played: [] };
  const raw = () => {
    const r = audio.raw && audio.raw();
    return r && r.ctx && r.ctx.state === 'running' ? r : null;
  };
  function load() {
    if (S.loading) return S.loading;
    const r = audio.raw && audio.raw();
    if (!r || !r.ctx) return Promise.resolve(false);
    S.loading = fetch(BASE + 'tiere/ton.json')
      .then(x => (x.ok ? x.json() : null))
      .then(j => {
        if (!j) return false;
        S.map = j;
        const files = [...new Set(Object.values(j).flatMap(v => v.files || []))];
        return Promise.all(
          files.map(f =>
            fetch(BASE + 'tiere/' + f)
              .then(x => (x.ok ? x.arrayBuffer() : Promise.reject(new Error(x.status))))
              .then(ab => new Promise((res, rej) => r.ctx.decodeAudioData(ab, res, rej)))
              .then(b => (S.buf[f] = b))
              .catch(e => console.warn('tiere sound', f, e))
          )
        ).then(() => true);
      })
      .catch(() => (S.loading = null));
    return S.loading;
  }
  // a gain, a low-pass and a panner for a source at (x, y)
  function chain(r, x, y, vol, ref) {
    const sp = audio.spatial(x, y, ref),
      g = r.ctx.createGain(),
      lp = r.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = sp.lp;
    g.gain.value = vol * sp.vol;
    lp.connect(g);
    let out = g;
    if (r.ctx.createStereoPanner) {
      const p = r.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, sp.pan));
      g.connect(p);
      out = p;
    }
    out.connect(r.sfx);
    return { in: lp, sp };
  }
  // the dog's whistle: two rising notes
  function whistle(r, x, y, vol) {
    const c = chain(r, x, y, vol * 0.25, 6),
      t = r.ctx.currentTime;
    for (const [d, f0, f1] of [
      [0, 1900, 2600],
      [0.32, 2000, 2900],
    ]) {
      const o = r.ctx.createOscillator(),
        g = r.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t + d);
      o.frequency.linearRampToValueAtTime(f1, t + d + 0.22);
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(1, t + d + 0.03);
      g.gain.linearRampToValueAtTime(0, t + d + 0.25);
      o.connect(g);
      g.connect(c.in);
      o.start(t + d);
      o.stop(t + d + 0.3);
    }
  }
  // play a kind at (x, y): o.vol, o.rate, o.n (repeats), o.ref (distance of full volume); true when something sounded
  function play(kind, x, y, o = {}) {
    S.played.push(kind);
    if (S.played.length > 40) S.played.shift();
    const r = raw();
    if (!r) return false;
    if (kind === 'pfiff') {
      whistle(r, x, y, o.vol ?? 1);
      return true;
    }
    if (!S.map) {
      load();
      return false;
    }
    const m = S.map[kind];
    if (!m || !m.files) return false;
    const fs = m.files.filter(f => S.buf[f]);
    if (!fs.length) return false;
    let i = Math.floor(Math.random() * fs.length);
    if (fs.length > 1 && fs[i] === S.last[kind]) i = (i + 1) % fs.length;
    S.last[kind] = fs[i];
    const c = chain(r, x, y, (m.vol ?? 0.8) * (o.vol ?? 1), o.ref || m.ref || 12);
    if (c.sp.vol * (m.vol ?? 0.8) < 0.004) return false;
    const n = Math.max(1, o.n || 1);
    for (let k = 0; k < n; k++) {
      const src = r.ctx.createBufferSource();
      src.buffer = S.buf[fs[(i + k) % fs.length]];
      src.playbackRate.value = o.rate || 0.94 + Math.random() * 0.12;
      src.connect(c.in);
      src.start(r.ctx.currentTime + (o.delay || 0) + k * (m.gap || 0.45));
    }
    return true;
  }
  S.play = play;
  S.load = load;
  return S;
})();
window.TTON = TTON;
