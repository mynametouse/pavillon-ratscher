// ===================== feat/zeitreise-medien: the media of the futures (ZKMEDIEN) =====================
// The Zeitreise's phone transitions, the radio as sound bridge and the real videos of today. Shown large for a room (a projector): a generic
// smartphone ~72 vh high (no real brand or app look), in a split one phone in front of each world's half, a fictional news portal, a
// fictional radio station, a fictional village group; everything marked „mögliche Zukunft“. Data: zukunft/zk_medien_data.js, keyed to the
// chronicle's event ids (ZKCHRONIK). Nothing is built before the first use (boot cost 0); a few timers poll for the regie/workshop until
// they are there (attach()).
// CONTRACTS (docs/plans/auftraege/zeitreise-medien.md; stubbed here while they are missing):
//   ZKREGIE.before(fn)    fn({ ev, w, place }) → promise: the phone sequence before a halt (≤ 29 s; the regie waits at most 30 s)
//   ZKREGIE.between(fn)   fn({ from, to, y }) → promise: the radio at a chapter transition
//   ZKREGIE.snapshot(place, side) → Promise<dataURL>: a real still of the 3D world (the photos of the village group)
//   ZKREGIE.duck(level)   0..1 – the ambience and voices go under what this module plays
//   ZKREGIE.on(fn)        'card' (chapter-end card) → the videos into WORKSHOP.slot('card-extra'); 'chapter'/'end' → reset
//   WORKSHOP.slot(name)   a DOM element for 'phone' | 'card-extra'; WORKSHOP.layers.define({ id, icon, label, text, on, set })
// API: ZKMEDIEN.attach() · play(entryOrEventId, worlds, ev) → promise · skip() · stop() · videoCard(el, chapter) · radio(opts) → promise ·
//   batteryRadio(lines) → promise · layer(id, on) · state() · lines() (all voice lines for the recording pipeline) · script (the data)
// Voices: STIMME (recordings, else the person's voice) or the browser's speech; the newsreader is the person 'zk_sprecherin'.
// Real videos: only from www.youtube-nocookie.com and only after a click on the still (a drawn plate – not even the thumbnail is fetched
// before); a plain link beside it. A page whose policy forbids frames shows the link.
import { ZKMEDIENDATA as D } from './zk_medien_data.js';

export const ZKMEDIEN = (() => {
  const S = {
    layers: { handy: true, radio: true, videos: true },
    tok: 0, // sequence token: skip/stop bump it, every wait notices
    waiters: new Set(),
    phones: [],
    noNet: false,
    voiceQ: Promise.resolve(),
    attached: false,
    tries: 0,
    played: {}, // ev.id → { t, p } (dedupe of calls per world)
    log: [], // cues for tests: { k, t }
    said: [],
    videosLoaded: 0,
    stubs: [],
    cur: null,
    css: false,
    ctx: null,
    cache: {},
    speed: 1, // tests run faster than real time (a slow machine, many checks)
    nom: 0, // nominal seconds of the running sequence (waits and speech) in ms, at speed 1
  };
  const ABORT = { abort: true };
  const R = () => window.ZKREGIE || null;
  const W = () => window.WORKSHOP || null;
  const cue = k => {
    S.log.push({ k, t: Math.round(performance.now()) });
    if (S.log.length > 200) S.log.shift();
  };
  // a short timer, not requestAnimationFrame: a frozen or slow frame loop (tests, a busy laptop) must not stall the phone
  const nextFrame = fn => setTimeout(fn, 40);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ------------------------------------------------------------------ waiting that can be skipped
  function wait(ms) {
    const tok = S.tok;
    S.nom += ms;
    ms /= S.speed;
    return new Promise((res, rej) => {
      const w = { done: () => (tok === S.tok ? res() : rej(ABORT)) };
      const t = setTimeout(() => {
        S.waiters.delete(w);
        w.done();
      }, ms);
      w.cancel = () => {
        clearTimeout(t);
        S.waiters.delete(w);
        rej(ABORT);
      };
      S.waiters.add(w);
    });
  }
  function skip() {
    S.tok++;
    for (const w of [...S.waiters]) w.cancel();
    window.speechSynthesis && window.speechSynthesis.cancel();
    cue('skip');
  }

  // ------------------------------------------------------------------ sound (own context, synthesised – no files, no licences)
  function ac() {
    if (S.ctx) return S.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      S.ctx = new AC();
      S.master = S.ctx.createGain();
      S.master.gain.value = 0.5;
      S.master.connect(S.ctx.destination);
    } catch (e) {
      S.ctx = null;
    }
    return S.ctx;
  }
  function tone(f, t0, dur, type = 'sine', vol = 0.3, f2) {
    const c = ac();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + t0;
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.linearRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(S.master);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function noise(dur, vol = 0.1, hp = 800, lp = 6000, t0 = 0) {
    const c = ac();
    if (!c) return null;
    try {
      const n = Math.floor(c.sampleRate * dur),
        b = c.createBuffer(1, n, c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(),
        a = c.createBiquadFilter(),
        l = c.createBiquadFilter(),
        g = c.createGain();
      s.buffer = b;
      a.type = 'highpass';
      a.frequency.value = hp;
      l.type = 'lowpass';
      l.frequency.value = lp;
      g.gain.value = vol;
      s.connect(a);
      a.connect(l);
      l.connect(g);
      g.connect(S.master);
      s.start(c.currentTime + t0);
      return g;
    } catch (e) {
      return null;
    }
  }
  const SND = {
    // two soft blips: a message arrives
    push() {
      cue('snd:push');
      tone(784, 0, 0.18, 'triangle', 0.22);
      tone(1047, 0.16, 0.3, 'triangle', 0.2);
    },
    tick() {
      tone(1320, 0, 0.08, 'sine', 0.12);
    },
    // the phone's buzz: two short low bursts
    buzz() {
      cue('snd:buzz');
      for (const t of [0, 0.16]) tone(95, t, 0.1, 'square', 0.12);
      noise(0.3, 0.02, 60, 400);
    },
    // a call: its own two-tone pattern, not a classic ring
    ring() {
      cue('snd:ring');
      for (const t of [0, 0.22, 1.3, 1.52]) tone(t % 1.3 ? 659 : 523, t, 0.2, 'sine', 0.22);
    },
    // the scenario alert: three rising chirps in two rounds with a low pulse – NOT the sirens' rising-falling howl and not a cell-broadcast tone
    alert() {
      cue('snd:alert');
      for (const r of [0, 1.25])
        [0, 1, 2].forEach(i => tone(520 * Math.pow(1.35, i), r + i * 0.2, 0.17, 'triangle', 0.28));
      tone(110, 0, 2.4, 'sine', 0.1);
    },
    // station jingle: a five-note figure on a chord pad
    jingle() {
      cue('snd:jingle');
      [392, 494, 587, 784, 988].forEach((f, i) => tone(f, i * 0.2, 0.55, 'triangle', 0.2));
      [196, 247, 294].forEach(f => tone(f, 0, 1.8, 'sine', 0.12));
      tone(1568, 1.0, 1.2, 'sine', 0.08);
    },
    // the battery radio: tuning noise
    crackle(sec = 3) {
      cue('snd:crackle');
      noise(sec, 0.05, 900, 4500);
      for (let i = 0; i < sec * 6; i++) noise(0.03, 0.12, 1500, 7000, Math.random() * sec);
    },
  };
  const duck = v => {
    try {
      const r = R();
      if (r && typeof r.duck === 'function') r.duck(v);
    } catch (e) {}
    cue('duck:' + v);
  };

  // ------------------------------------------------------------------ voices
  const readMs = t => 700 + t.length * 52;
  function speakNow(who, text) {
    S.said.push({ who, text });
    cue('say:' + who);
    return new Promise(res => {
      S.nom += readMs(text);
      const fin = setTimeout(res, (readMs(text) + 2500) / S.speed);
      const done = () => {
        clearTimeout(fin);
        res();
      };
      (async () => {
        try {
          const T = window.STIMME;
          if (T && T.person && who === 'zk_sprecherin' && !T.profile('zk_sprecherin'))
            T.person('zk_sprecherin', { name: 'Sprecherin', g: 'f', age: 38 });
          if (T && T.say && (await T.say(who, text))) return done();
        } catch (e) {}
        try {
          const ss = window.speechSynthesis;
          if (ss && window.SpeechSynthesisUtterance && !window.__zkNoSpeech) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'de-DE';
            u.rate = 0.95;
            const v = (ss.getVoices() || []).find(x => /^de/i.test(x.lang));
            if (v) u.voice = v;
            u.onend = u.onerror = done;
            ss.speak(u);
            return;
          }
        } catch (e) {}
        setTimeout(done, readMs(text) / S.speed);
      })();
    });
  }
  // one voice at a time across all phones (a split plays two phones in parallel)
  function say(who, text) {
    const tok = S.tok;
    const p = S.voiceQ.then(() => (tok === S.tok ? speakNow(who, text) : null));
    S.voiceQ = p.catch(() => {});
    return p.then(() => {
      if (tok !== S.tok) throw ABORT;
    });
  }

  // ------------------------------------------------------------------ styles and DOM
  const CSS = `
.zkm-wrap{position:fixed;inset:0;z-index:60;pointer-events:none;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff}
.zkm-phone{position:absolute;top:13vh;height:72vh;width:34vh;transform:translateX(-50%) translateY(6vh);opacity:0;transition:opacity .5s,transform .6s cubic-bezier(.2,.8,.2,1);pointer-events:auto;cursor:pointer}
.zkm-phone.on{opacity:1;transform:translateX(-50%) translateY(0)}
.zkm-phone.buzz{animation:zkmbuzz .35s linear}
@keyframes zkmbuzz{0%,100%{margin-left:0}20%{margin-left:-.5vh}40%{margin-left:.5vh}60%{margin-left:-.4vh}80%{margin-left:.4vh}}
.zkm-body{position:absolute;inset:0;background:#0d0f13;border-radius:4.4vh;border:.9vh solid #1b1f27;box-shadow:0 2vh 6vh rgba(0,0,0,.65),0 0 0 .2vh #3a4150;overflow:hidden;display:flex;flex-direction:column}
.zkm-status{display:flex;justify-content:space-between;align-items:center;padding:1.4vh 3vh .4vh;font-size:2.2vh;font-weight:700}
.zkm-status .net.off{color:#ff8f7a}
.zkm-mark{margin:0 2.2vh;text-align:center;font-size:2.2vh;font-weight:700;letter-spacing:.04em;background:#e9b949;color:#1a1305;border-radius:1vh;padding:.3vh 0}
.zkm-chip{margin:.8vh 2.2vh 0;text-align:center;font-size:2.4vh;font-weight:800;border-radius:1vh;padding:.3vh 0;color:#fff}
.zkm-screen{position:relative;flex:1;margin-top:.8vh;overflow:hidden}
.zkm-view{position:absolute;inset:0;padding:1.4vh 2vh;display:flex;flex-direction:column;opacity:0;transition:opacity .4s}
.zkm-view.on{opacity:1}
.zkm-lock{background:linear-gradient(170deg,#1f3a4d,#0d1a24 70%);align-items:center}
.zkm-lock .clock{font-size:8.5vh;font-weight:300;margin-top:3vh;letter-spacing:.02em}
.zkm-lock .date{font-size:2.7vh;opacity:.9;font-weight:600}
.zkm-pushc{position:absolute;left:1.6vh;right:1.6vh;top:20vh;background:rgba(245,247,250,.96);color:#14181f;border-radius:2vh;padding:1.5vh 1.8vh;transform:translateY(-30vh);transition:transform .6s cubic-bezier(.2,.9,.2,1);box-shadow:0 1vh 3vh rgba(0,0,0,.5)}
.zkm-pushc.in{transform:translateY(0)}
.zkm-pushc .app{font-size:2.2vh;font-weight:800;color:#a23b1e;display:flex;justify-content:space-between}
.zkm-pushc .h{font-size:3vh;font-weight:800;line-height:1.15;margin:.5vh 0}
.zkm-pushc .t{font-size:2.5vh;line-height:1.25}
.zkm-art{background:#f4f1ea;color:#15171c;padding:0}
.zkm-art .bar{background:#1f3a4d;color:#fff;font-weight:800;font-size:2.6vh;padding:1vh 2vh;display:flex;justify-content:space-between;align-items:center}
.zkm-art .bar i{font-style:normal;font-size:2.1vh;background:#e9b949;color:#1a1305;padding:.2vh .8vh;border-radius:.8vh}
.zkm-art .ph{height:19vh;background-size:cover;background-position:center;background-color:#7d8b94}
.zkm-art .k{font-size:2.3vh;font-weight:800;color:#a23b1e;text-transform:uppercase;letter-spacing:.06em;margin:1.2vh 2vh 0}
.zkm-art .h{font-size:3.4vh;font-weight:800;line-height:1.12;margin:.5vh 2vh}
.zkm-art .l{font-size:2.7vh;line-height:1.28;margin:.4vh 2vh;font-weight:500}
.zkm-art .m{font-size:2.2vh;color:#5a5f6a;margin:.8vh 2vh;font-weight:600}
.zkm-chat{background:#e6dfd2;color:#16181d;padding:0}
.zkm-chat .bar{background:#2f5d50;color:#fff;font-weight:800;font-size:2.7vh;padding:1.1vh 2vh}
.zkm-chat .bar small{display:block;font-size:2.2vh;font-weight:600;opacity:.85}
.zkm-chat .log{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:1vh 1.4vh;gap:.9vh;overflow:hidden}
.zkm-b{max-width:88%;background:#fff;border-radius:0 1.6vh 1.6vh 1.6vh;padding:.8vh 1.2vh;font-size:2.65vh;line-height:1.22;font-weight:500;align-self:flex-start;box-shadow:0 .2vh .4vh rgba(0,0,0,.2);animation:zkmin .35s ease-out}
.zkm-b .n{font-size:2.2vh;font-weight:800;display:block}
.zkm-b.typing{color:#777;font-size:3vh;letter-spacing:.3em;padding:.2vh 1.4vh}
.zkm-b .wave{display:flex;align-items:center;gap:.25vh;height:3.4vh;margin-top:.3vh}
.zkm-b .wave s{display:block;width:.45vh;background:#2f5d50;border-radius:.3vh}
.zkm-b .wave.play s{animation:zkmwave .6s ease-in-out infinite alternate}
.zkm-b .dur{font-size:2.1vh;color:#555;margin-top:.2vh}
.zkm-photo{padding:.6vh .6vh 1.4vh;transform:rotate(-2.2deg);max-width:92%}
.zkm-photo .img{height:17vh;width:26vh;background-size:cover;background-position:center;background-color:#8a8f96;position:relative}
.zkm-photo .img em{position:absolute;right:.6vh;bottom:.4vh;font-style:normal;font-size:2.1vh;color:#ffd9a0;text-shadow:0 0 .6vh #000;font-weight:700}
.zkm-photo .cap{font-size:2.2vh;margin:.5vh .4vh 0;font-weight:600}
@keyframes zkmin{from{opacity:0;transform:translateY(1.4vh)}to{opacity:1;transform:none}}
@keyframes zkmwave{from{transform:scaleY(.4)}to{transform:scaleY(1)}}
.zkm-call{background:radial-gradient(circle at 50% 30%,#2a3342,#0d1118 70%);align-items:center;text-align:center}
.zkm-call .av{width:15vh;height:15vh;border-radius:50%;margin-top:4vh;display:flex;align-items:center;justify-content:center;font-size:7vh;font-weight:800}
.zkm-call .av.ring{animation:zkmring 1s ease-in-out infinite}
@keyframes zkmring{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.45)}50%{box-shadow:0 0 0 2.2vh rgba(255,255,255,0)}}
.zkm-call .nm{font-size:4.2vh;font-weight:800;margin-top:1.6vh}
.zkm-call .ro{font-size:2.6vh;opacity:.85}
.zkm-call .st{font-size:2.7vh;margin-top:1.4vh;font-weight:700;color:#8fe0a6}
.zkm-call .cp{margin-top:2.4vh;font-size:2.8vh;line-height:1.28;background:rgba(0,0,0,.35);padding:1.2vh 1.4vh;border-radius:1.4vh;font-weight:600}
.zkm-alert{background:repeating-linear-gradient(135deg,#7d1d0d 0 2.4vh,#5a1308 2.4vh 4.8vh);align-items:center;text-align:center;animation:zkmalert 1s steps(2) infinite}
@keyframes zkmalert{50%{filter:brightness(1.35)}}
.zkm-alert .ic{font-size:9vh;margin-top:1vh}
.zkm-alert .sd{font-size:2.3vh;font-weight:800;background:#000;padding:.4vh 1.2vh;border-radius:1vh;margin-top:.6vh}
.zkm-alert .ti{font-size:3.6vh;font-weight:900;margin-top:1.2vh;line-height:1.1}
.zkm-alert .tx{font-size:2.7vh;font-weight:600;margin-top:1.2vh;line-height:1.25;background:rgba(0,0,0,.45);padding:1.2vh;border-radius:1.2vh}
.zkm-alert .sc{font-size:2.3vh;font-weight:800;margin-top:1.2vh;color:#ffd77a}
.zkm-nonet{background:#0b0d10;align-items:center;justify-content:center;text-align:center}
.zkm-nonet .big{font-size:5vh;font-weight:800;color:#ff8f7a;margin-top:1vh}
.zkm-nonet .sm{font-size:2.7vh;opacity:.85;margin-top:1.2vh;line-height:1.3}
.zkm-radio{position:absolute;left:50%;bottom:15vh;transform:translateX(-50%) translateY(3vh);width:64vh;max-width:84vw;background:rgba(14,17,22,.94);border:.3vh solid #e9b949;border-radius:2vh;padding:1.6vh 2.4vh;opacity:0;transition:opacity .5s,transform .5s;pointer-events:auto;cursor:pointer;box-shadow:0 1vh 4vh rgba(0,0,0,.6)}
.zkm-radio.on{opacity:1;transform:translateX(-50%)}
.zkm-radio .top{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:2.7vh;letter-spacing:.05em}
.zkm-radio .top i{font-style:normal;font-size:2.2vh;background:#e9b949;color:#1a1305;padding:.2vh .9vh;border-radius:.8vh}
.zkm-radio .dial{position:relative;height:2.2vh;margin:1.2vh 0;background:repeating-linear-gradient(90deg,#556 0 .2vh,transparent .2vh 2vh);border-bottom:.3vh solid #556}
.zkm-radio .dial b{position:absolute;top:-.5vh;bottom:-.4vh;width:.5vh;background:#ff6b4a;left:58%;transition:left 1.2s}
.zkm-radio .tx{font-size:3.5vh;line-height:1.22;font-weight:700;min-height:8.6vh;text-shadow:0 .2vh .6vh #000}
.zkm-radio .wc{display:inline-block;font-size:2.3vh;padding:.1vh .9vh;border-radius:.8vh;margin-right:.8vh;vertical-align:middle;font-weight:800}
.zkm-foto{position:absolute;inset:0;pointer-events:none;background-size:cover;background-position:center;opacity:0;transition:opacity 1.3s ease-in;transform:rotate(-2.2deg) scale(.82);border:1.4vh solid #fff;box-shadow:0 2vh 6vh #000}
.zkm-foto.on{opacity:1;transform:none;border-width:0;transition:opacity .8s,transform 1s,border-width 1s}
.zkm-foto.off{opacity:0;transition:opacity 1.6s ease-in}
.zkm-vid{background:#10141a;border:.25vh solid #3a4150;border-radius:1.4vh;padding:1.2vh 1.6vh;margin-top:1.2vh;color:#fff;font-family:system-ui,sans-serif}
.zkm-vid .still{height:15vh;border-radius:1vh;background:linear-gradient(135deg,#1f3a4d,#0d1a24);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.zkm-vid .still:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 1vh,transparent 1vh 2vh)}
.zkm-vid .play{font-size:5vh;z-index:1}
.zkm-vid .ti{font-size:2.8vh;font-weight:800;line-height:1.2;margin-top:.8vh}
.zkm-vid .so{font-size:2.4vh;opacity:.9;margin-top:.3vh;font-weight:600}
.zkm-vid .wh{font-size:2.4vh;opacity:.8;margin-top:.3vh}
.zkm-vid button{margin-top:.8vh;font:inherit;font-size:2.6vh;font-weight:800;background:#e9b949;color:#1a1305;border:0;border-radius:1vh;padding:.9vh 1.6vh;cursor:pointer}
.zkm-vid a{color:#9cd1ff;font-size:2.4vh;margin-left:1.4vh;font-weight:600}
.zkm-vid iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:1vh;margin-top:.8vh;background:#000}
.zkm-vid .hint{font-size:2.2vh;opacity:.75;margin-top:.5vh}
`;
  function ensureCss() {
    if (S.css) return;
    const st = document.createElement('style');
    st.id = 'zkm-css';
    st.textContent = CSS;
    document.head.appendChild(st);
    S.css = true;
  }
  const h = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  function wrap() {
    ensureCss();
    let w = document.getElementById('zkm-wrap');
    if (!w) {
      w = h('div', 'zkm-wrap');
      w.id = 'zkm-wrap';
      const slot = (W() && W().slot && W().slot('phone')) || null;
      (slot && slot.isConnected ? slot : document.body).appendChild(w);
    }
    return w;
  }
  const MONTH = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];
  const WDAY = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  function when(ev) {
    const y = ev && Math.floor(ev.y);
    if (!y) return { clock: '21:47', date: 'mögliche Zukunft' };
    const d = new Date(Date.UTC(y, 0, ev.doy || 1));
    const hh = ev.hour != null ? ev.hour : 12;
    const pad = n => String(n).padStart(2, '0');
    return {
      clock: pad(Math.floor(hh)) + ':' + pad(Math.floor((hh % 1) * 60)),
      date: `${WDAY[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTH[d.getUTCMonth()]} ${y}`,
    };
  }
  const worldInfo = w => {
    const C = window.ZKCHRONIK;
    const k = C && C.WORLDS && C.WORLDS[w];
    const def = { allein: ['Allein im Sturm', '#b5502e'], gewappnet: ['Gewappnet', '#2f7f5a'] }[w] || [w, '#556'];
    return { title: (k && k.title) || def[0], color: (k && k.color) || def[1] };
  };

  // ------------------------------------------------------------------ photos from the 3D world
  function fallbackPhoto(place) {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 213;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 213);
    gr.addColorStop(0, '#8aa0ad');
    gr.addColorStop(1, '#4f5f4a');
    g.fillStyle = gr;
    g.fillRect(0, 0, 320, 213);
    g.fillStyle = 'rgba(255,255,255,.8)';
    g.font = '18px sans-serif';
    g.fillText(place || 'Foto', 14, 200);
    return c.toDataURL('image/jpeg', 0.7);
  }
  // the cache holds promises: play() asks for every photo of a sequence at once (a still costs a render; the phone's first steps hide it)
  function snap(place, side) {
    const key = place + ':' + (side === 'R' ? 'R' : 'L');
    if (S.cache[key]) return S.cache[key];
    S.cache[key] = (async () => {
      let url = null;
      const r = R();
      try {
        if (r && typeof r.snapshot === 'function') {
          cue('snapshot:' + place);
          url = await Promise.race([
            Promise.resolve(r.snapshot(place, side === 'R' ? 'R' : 'L')),
            new Promise(res => setTimeout(res, 6000, null)),
          ]);
        }
      } catch (e) {}
      return url || fallbackPhoto(place);
    })();
    // a still is a moment: it is taken anew for the next sequence
    setTimeout(() => delete S.cache[key], 90000);
    return S.cache[key];
  }

  // ------------------------------------------------------------------ the phone
  const NETBARS = '▂▄▆█';
  function makePhone(side, w, ev) {
    const wr = wrap();
    const el = h('div', 'zkm-phone');
    el.style.left = side === 'L' ? '25%' : side === 'R' ? '75%' : side === 'S' ? '76%' : '50%';
    const body = h('div', 'zkm-body');
    const t = when(ev);
    const st = h('div', 'zkm-status');
    const clock = h('span', 'c', t.clock);
    const net = h('span', 'net', S.noNet ? 'Kein Netz' : NETBARS);
    if (S.noNet) net.classList.add('off');
    st.append(clock, net, h('span', 'bat', '▮▮▮▯'));
    body.append(st, h('div', 'zkm-mark', 'Szenario · ' + D.NAMES.mark));
    if (w && (side === 'L' || side === 'R')) {
      const wi = worldInfo(w);
      const chip = h('div', 'zkm-chip', wi.title);
      chip.style.background = wi.color;
      body.append(chip);
    }
    const screen = h('div', 'zkm-screen');
    body.append(screen);
    el.append(body);
    el.title = 'Klick: weiter';
    el.addEventListener('click', skipStep);
    wr.append(el);
    const P = { el, screen, net, side, w, ev, view: null, side2: side };
    nextFrame(() => el.classList.add('on'));
    S.phones.push(P);
    return P;
  }
  // a click on the phone skips the whole sequence (the presenter's pace)
  function skipStep() {
    skip();
  }
  function view(P, cls) {
    const v = h('div', 'zkm-view ' + cls);
    P.screen.append(v);
    nextFrame(() => v.classList.add('on'));
    if (P.view) {
      const old = P.view;
      old.classList.remove('on');
      setTimeout(() => old.remove(), 450);
    }
    P.view = v;
    return v;
  }
  function setNet(P, off) {
    P.net.textContent = off ? 'Kein Netz' : NETBARS;
    P.net.classList.toggle('off', off);
  }
  function buzzPhone(P) {
    P.el.classList.remove('buzz');
    void P.el.offsetWidth;
    P.el.classList.add('buzz');
    SND.buzz();
  }
  async function bgUrl(ph, P) {
    return ph ? 'url(' + (await snap(ph, P.side)) + ')' : null;
  }
  async function stepArticle(P, s) {
    const v = view(P, 'zkm-art');
    const bar = h('div', 'bar');
    bar.append(h('span', null, D.NAMES.portal), h('i', null, D.NAMES.mark));
    const ph = h('div', 'ph');
    const u = await bgUrl(s.ph, P);
    if (u) ph.style.backgroundImage = u;
    const t = when(P.ev);
    v.append(
      bar,
      ph,
      h('div', 'k', s.kicker || 'Region'),
      h('div', 'h', s.head),
      h('div', 'l', s.lead || s.teaser || ''),
      h('div', 'm', t.clock + ' Uhr · ' + t.date)
    );
    cue('article:' + (s.head || '').slice(0, 24));
    await wait(700 + (s.lead || '').length * 42 + 1300);
  }
  async function stepPush(P, s) {
    const v = view(P, 'zkm-lock');
    const t = when(P.ev);
    v.append(h('div', 'clock', t.clock), h('div', 'date', t.date));
    const c = h('div', 'zkm-pushc');
    const app = h('div', 'app');
    app.append(h('span', null, D.NAMES.portal), h('span', null, 'jetzt'));
    c.append(app, h('div', 'h', s.head), h('div', 't', s.teaser || ''));
    v.append(c);
    await wait(700);
    buzzPhone(P);
    SND.push();
    cue('push:' + (s.head || '').slice(0, 24));
    nextFrame(() => c.classList.add('in'));
    await wait(2500);
    if (s.open) await stepArticle(P, s);
  }
  async function stepAlert(P, s) {
    const v = view(P, 'zkm-alert');
    const t = when(P.ev);
    v.append(
      h('div', 'ic', '⚠'),
      h('div', 'sd', D.NAMES.warn),
      h('div', 'ti', s.title),
      h('div', 'tx', s.text),
      h('div', 'sc', 'Dies ist ein Szenario – ' + D.NAMES.mark + ' · ' + t.clock)
    );
    buzzPhone(P);
    SND.alert();
    cue('alert:' + s.title);
    await wait(4800);
  }
  async function stepNoNet(P, s) {
    S.noNet = true;
    setNet(P, true);
    const v = view(P, 'zkm-nonet');
    v.append(
      h('div', 'big', 'Kein Netz'),
      h(
        'div',
        'sm',
        `Nach etwa ${s.hours || 3} Stunden ohne Strom ist auch das Mobilfunknetz ausgefallen. Nachrichten werden nicht zugestellt.`
      )
    );
    cue('nonet');
    await wait(2800);
  }
  function wave(n = 26) {
    const w = h('div', 'wave');
    for (let i = 0; i < n; i++) {
      const b = document.createElement('s');
      b.style.height = 18 + Math.abs(Math.sin(i * 1.7) * 60 + Math.cos(i * 0.6) * 22) + '%';
      b.style.animationDelay = (i % 7) * 0.07 + 's';
      w.append(b);
    }
    return w;
  }
  async function stepChat(P, s) {
    const v = view(P, 'zkm-chat');
    const bar = h('div', 'bar', D.NAMES.group);
    bar.append(h('small', null, '8 Mitglieder · Szenario'));
    const log = h('div', 'log');
    v.append(bar, log);
    cue('chat:' + D.NAMES.group);
    let lastPhoto = null;
    for (const m of s.msgs) {
      const who = D.WHO[m.who];
      const ty = h('div', 'zkm-b typing', '•••');
      log.append(ty);
      await wait(600);
      ty.remove();
      const b = h('div', 'zkm-b');
      b.append(h('span', 'n', who ? who.name : m.who));
      b.querySelector('.n').style.color = who ? who.c : '#333';
      SND.tick();
      if (m.v) {
        const wv = wave();
        const d = h('div', 'dur', '▶ 0:' + String(m.s || 6).padStart(2, '0'));
        b.append(wv, d);
        log.append(b);
        wv.classList.add('play');
        cue('voicenote:' + m.who);
        duck(0.25);
        await say(m.who, m.v);
        duck(1);
        wv.classList.remove('play');
      } else {
        b.append(document.createTextNode(m.text));
        log.append(b);
        await wait(1100 + m.text.length * 28);
      }
      if (m.ph) {
        const u = await bgUrl(m.ph, P);
        const pb = h('div', 'zkm-b zkm-photo');
        const img = h('div', 'img');
        if (u) img.style.backgroundImage = u;
        const t = when(P.ev);
        img.append(h('em', null, t.clock));
        pb.append(img, h('div', 'cap', m.cap || ''));
        log.append(pb);
        SND.tick();
        cue('photo:' + m.ph);
        lastPhoto = { u, ph: m.ph };
        await wait(1900);
      }
    }
    // „Foto wird lebendig“: the still fills the picture and dissolves into the live scene from the same pose
    if (s.live && lastPhoto && lastPhoto.u && P.side !== 'L' && P.side !== 'R') {
      await livePhoto(P, lastPhoto.u);
    } else if (s.live && lastPhoto && lastPhoto.u) {
      await livePhoto(P, lastPhoto.u);
    }
  }
  async function livePhoto(P, u) {
    const f = h('div', 'zkm-foto');
    f.style.backgroundImage = u;
    if (P.side === 'L') f.style.right = '50%';
    if (P.side === 'R') f.style.left = '50%';
    wrap().append(f);
    cue('livephoto');
    P.el.style.opacity = 0;
    nextFrame(() => f.classList.add('on'));
    try {
      await wait(1400);
      f.classList.add('off');
      await wait(1500);
    } finally {
      f.remove();
      P.el.style.opacity = '';
    }
  }
  async function stepCall(P, s) {
    const who = D.WHO[s.who] || { name: s.who, role: '', c: '#556' };
    const v = view(P, 'zkm-call');
    const av = h('div', 'av ring', who.name[0]);
    av.style.background = who.c;
    const st = h('div', 'st', 'ruft an …');
    v.append(av, h('div', 'nm', who.name), h('div', 'ro', who.role + ' · Szenario'), st);
    buzzPhone(P);
    SND.ring();
    cue('call:' + s.who);
    await wait(2300);
    av.classList.remove('ring');
    st.textContent = 'Anruf läuft';
    // the picture cuts to the place during the call: the regie (or anyone) may listen
    try {
      window.dispatchEvent(new CustomEvent('zkmedien:cut', { detail: { place: s.place || null, w: P.w } }));
    } catch (e) {}
    for (const l of s.lines) {
      const cp = h('div', 'cp', l.v);
      v.append(cp);
      duck(0.25);
      await say(s.who, l.v);
      duck(1);
    }
    st.textContent = 'Anruf beendet';
    await wait(900);
  }

  async function runSteps(P, steps) {
    for (const s of steps) {
      if (s.t === 'push') await stepPush(P, s);
      else if (s.t === 'article') await stepArticle(P, s);
      else if (s.t === 'chat') await stepChat(P, s);
      else if (s.t === 'call') await stepCall(P, s);
      else if (s.t === 'alert') await stepAlert(P, s);
      else if (s.t === 'nonet') await stepNoNet(P, s);
    }
  }

  // ------------------------------------------------------------------ radio
  function radioBox(battery) {
    const wr = wrap();
    let r = wr.querySelector('.zkm-radio');
    if (r) r.remove();
    r = h('div', 'zkm-radio');
    const top = h('div', 'top');
    top.append(
      h('span', null, (battery ? '📻 Batterieradio · ' : '📻 ') + D.NAMES.radio.toUpperCase() + ' ' + D.NAMES.freq),
      h('i', null, D.NAMES.mark)
    );
    const dial = h('div', 'dial');
    const nd = document.createElement('b');
    dial.append(nd);
    const tx = h('div', 'tx');
    r.append(top, dial, tx);
    r.addEventListener('click', skip);
    wr.append(r);
    nextFrame(() => r.classList.add('on'));
    return { r, tx, nd };
  }
  async function readLines(box, items) {
    for (const it of items) {
      box.tx.textContent = '';
      if (it.w) {
        const wi = worldInfo(it.w);
        const chip = h('span', 'wc', wi.title);
        chip.style.background = wi.color;
        box.tx.append(chip);
      }
      box.tx.append(document.createTextNode(it.text));
      duck(0.2);
      await say('zk_sprecherin', it.text);
      duck(1);
    }
  }
  function closeRadio(box) {
    if (!box) return;
    box.r.classList.remove('on');
    setTimeout(() => box.r.remove(), 600);
  }
  async function playRadio(opts = {}) {
    if (!S.layers.radio) return;
    const tok = S.tok;
    // the regie's between() context: { chapter: the one that begins, prev: the one that ended, worlds }
    if (!opts.to && opts.chapter) opts = { ...opts, to: opts.chapter, from: opts.prev };
    const key = D.RADIO[opts.to]
      ? opts.to
      : opts.from
        ? { wald: 'wasser', wasser: 'energie', energie: 'ende' }[opts.from] || 'start'
        : 'start';
    const R0 = D.RADIO[key] || D.RADIO.start;
    const worlds = opts.worlds || (R() && R().state && R().state().pair) || ['allein', 'gewappnet'];
    const items = [];
    for (const t of R0.all || []) items.push({ text: t });
    for (const w of worlds) for (const t of R0[w] || []) items.push({ w: worlds.length > 1 ? w : null, text: t });
    if (R0.wetter) items.push({ text: R0.wetter });
    const box = radioBox(false);
    try {
      duck(0.2);
      cue('radio:' + key);
      SND.jingle();
      box.tx.textContent = D.RADIO.jingle;
      box.nd.style.left = 30 + Math.random() * 50 + '%';
      await wait(2600);
      await readLines(box, items);
    } catch (e) {
      if (e !== ABORT) throw e;
    } finally {
      duck(1);
      closeRadio(box);
    }
    return tok;
  }
  async function playBattery(lines) {
    const box = radioBox(true);
    try {
      duck(0.2);
      cue('battery');
      SND.crackle(3);
      box.tx.textContent = '… rauschen …';
      await wait(1800);
      await readLines(
        box,
        lines.map(l => (typeof l === 'string' ? { text: l } : l))
      );
    } catch (e) {
      if (e !== ABORT) throw e;
    } finally {
      duck(1);
      closeRadio(box);
    }
  }

  // ------------------------------------------------------------------ the sequence of an event
  function findEntry(ev) {
    if (!ev) return null;
    return D.SCRIPT.find(e => e.ids && e.ids.includes(ev.id)) || D.SCRIPT.find(e => e.tag === ev.id) || null;
  }
  const WORLDKEYS = ['allein', 'gewappnet', 'rueckenwind', 'glueck'];
  const hasWorlds = e => WORLDKEYS.some(k => e[k]);
  const stepsFor = (e, w) => [...(e.all || []), ...(e[w] || [])];
  function clearPhones() {
    for (const P of S.phones) {
      P.el.classList.remove('on');
      const el = P.el;
      setTimeout(() => el.remove(), 650);
    }
    S.phones = [];
    const wr = document.getElementById('zkm-wrap');
    if (wr) wr.querySelectorAll('.zkm-foto').forEach(f => f.remove());
  }
  async function play(entryOrId, worlds, ev) {
    const entry =
      typeof entryOrId === 'string'
        ? D.SCRIPT.find(e => e.tag === entryOrId || (e.ids || []).includes(entryOrId))
        : entryOrId;
    if (!entry || !S.layers.handy) return;
    const st = (R() && R().state && R().state()) || {};
    const split = worlds ? worlds.length > 1 : st.split !== false;
    const pair = worlds || st.pair || ['allein', 'gewappnet'];
    const tok = ++S.tok;
    for (const w of [...S.waiters]) w.cancel();
    S.tok = tok;
    S.voiceQ = Promise.resolve();
    clearPhones();
    const plan = [];
    if (split && hasWorlds(entry)) {
      pair.forEach((w, i) => plan.push({ w, side: i ? 'R' : 'L', steps: stepsFor(entry, w) }));
    } else {
      const w = pair[0];
      plan.push({
        w,
        side: split ? 'C' : 'S',
        steps: stepsFor(entry, hasWorlds(entry) && !split ? (worlds && worlds[0]) || w : w),
      });
    }
    for (const p of plan)
      for (const st of p.steps) {
        if (st.ph) snap(st.ph, p.side);
        for (const m of st.msgs || []) if (m.ph) snap(m.ph, p.side);
      }
    const radios = [];
    const t0 = performance.now();
    S.nom = 0;
    cue('seq:' + (entry.tag || entry.ids));
    const runs = plan.map(async p => {
      const steps = p.steps.filter(s => {
        if (s.t === 'radio') {
          radios.push({ w: plan.length > 1 ? p.w : null, s });
          return false;
        }
        return true;
      });
      if (!steps.length) return;
      const P = makePhone(p.side, plan.length > 1 || p.side === 'S' ? p.w : null, ev);
      if (p.side === 'S' || p.side === 'C') P.w = null;
      try {
        await runSteps(P, steps);
      } catch (e) {
        if (e !== ABORT) throw e;
      }
    });
    S.cur = Promise.all(runs);
    try {
      await Promise.race([S.cur, new Promise(r => setTimeout(r, 29000 / S.speed))]);
      if (tok === S.tok && radios.length) {
        // the battery radio after the phones: the lines both worlds share once, then each world's own
        const seen = new Set();
        const items = [];
        for (const r of radios)
          for (const l of r.s.lines) {
            const k = seen.has(l) ? null : l;
            seen.add(l);
            if (k) items.push({ w: radios.filter(x => x.s.lines.includes(l)).length > 1 ? null : r.w, text: l });
          }
        const left = 29000 / S.speed - (performance.now() - t0);
        if (left > 3000 / S.speed) await Promise.race([playBattery(items), new Promise(r => setTimeout(r, left))]);
      }
    } catch (e) {
      if (e !== ABORT) console.warn('ZKMEDIEN', e);
    } finally {
      duck(1);
      if (tok === S.tok) {
        S.tok++;
        for (const w of [...S.waiters]) w.cancel();
      }
      clearPhones();
      cue('seq:end');
      S.lastNom = Math.round((performance.now() - t0) * S.speed); // wall time at nominal speed (parallel phones count once)
    }
  }
  function beforeHook(ctx) {
    const ev = ctx && ctx.ev;
    const entry = findEntry(ev);
    if (!entry || !S.layers.handy) return;
    const key = ev.id;
    const last = S.played[key];
    if (last && performance.now() - last.t < 6000) return last.p;
    const st = (R() && R().state && R().state()) || {};
    const worlds = ctx.worlds && ctx.worlds.length ? ctx.worlds : st.split === false ? [ctx.w] : st.pair || null;
    const p = play(entry, worlds, ev);
    S.played[key] = { t: performance.now(), p };
    return p;
  }
  function betweenHook(ctx) {
    if (!S.layers.radio) return;
    return playRadio(ctx || {});
  }

  // ------------------------------------------------------------------ real videos of today (after a click only)
  function videoCard(el, chapter) {
    ensureCss();
    el.replaceChildren();
    if (!S.layers.videos) return 0;
    const groups = D.CARD_VIDEOS[chapter] || [];
    let n = 0;
    for (const g of groups)
      for (const v of D.VIDEOS[g] || []) {
        n++;
        const c = h('div', 'zkm-vid');
        const still = h('div', 'still');
        still.append(h('div', 'play', '▶'));
        c.append(
          still,
          h('div', 'ti', v.title),
          h('div', 'so', `${v.src} · ${v.year} · ${v.min >= 1 ? Math.round(v.min) + ' Min.' : ''}`),
          h('div', 'wh', v.why)
        );
        const btn = h('button', null, 'Video laden – Daten gehen an YouTube');
        btn.dataset.vid = v.id;
        btn.addEventListener('click', () => {
          S.videosLoaded++;
          cue('video:' + v.id);
          const f = document.createElement('iframe');
          f.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?rel=0&autoplay=1';
          f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          f.referrerPolicy = 'strict-origin-when-cross-origin';
          f.title = v.title;
          f.allowFullscreen = true;
          still.replaceWith(f);
          btn.remove();
        });
        const a = h('a', null, 'Auf YouTube öffnen ↗');
        a.href = 'https://www.youtube.com/watch?v=' + v.id;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        c.append(btn, a, h('div', 'hint', 'Echtes Video von heute – kein Szenario.'));
        el.append(c);
      }
    return n;
  }

  // ------------------------------------------------------------------ attaching to the regie and the workshop
  function attach() {
    const r = R(),
      wk = W();
    let did = false;
    if (r && !S.regie && typeof r.before === 'function') {
      try {
        r.before(beforeHook);
        if (typeof r.between === 'function') r.between(betweenHook);
        if (typeof r.on === 'function') r.on(onRegie);
        S.regie = true;
        did = true;
      } catch (e) {
        console.warn('ZKMEDIEN attach regie', e);
      }
    }
    if (wk && !S.layersDef && wk.layers && typeof wk.layers.define === 'function') {
      try {
        const defs = [
          {
            id: 'handy',
            icon: '📱',
            label: 'Handy-Meldungen',
            text: 'Eilmeldung, Dorfgruppe, Anruf und Warnung vor den Ereignissen',
          },
          {
            id: 'radio',
            icon: '📻',
            label: 'Radio',
            text: 'Nachrichten und Wetter zwischen den Kapiteln, im Blackout das Batterieradio',
          },
          {
            id: 'videos',
            icon: '🎬',
            label: 'Videos',
            text: 'Echte Videos von heute auf der Kapitelkarte (laden erst nach Klick)',
          },
        ];
        for (const d of defs)
          wk.layers.define({
            ...d,
            on: () => S.layers[d.id],
            set: v => layer(d.id, v),
          });
        S.layersDef = true;
        did = true;
      } catch (e) {
        console.warn('ZKMEDIEN attach layers', e);
      }
    }
    S.attached = !!(S.regie && S.layersDef);
    return did;
  }
  function layer(id, on) {
    if (!(id in S.layers)) return false;
    S.layers[id] = !!on;
    if (!on) {
      if (id === 'handy') (skip(), clearPhones());
      if (id === 'radio') skip();
    }
    cue('layer:' + id + ':' + (on ? 1 : 0));
    return S.layers[id];
  }
  function onRegie(e) {
    if (!e) return;
    if (e.type === 'card') {
      const slot = W() && W().slot && W().slot('card-extra');
      if (slot) videoCard(slot, e.chapter || (R() && R().state && R().state().chapter));
    } else if (e.type === 'chapter') {
      S.noNet = false;
      const slot = W() && W().slot && W().slot('card-extra');
      if (slot) slot.replaceChildren();
    } else if (e.type === 'end') {
      stop();
    }
  }
  function stop() {
    skip();
    clearPhones();
    const wr = document.getElementById('zkm-wrap');
    if (wr) wr.querySelectorAll('.zkm-radio').forEach(x => x.remove());
    S.noNet = false;
    S.played = {};
  }
  // a gentle poll until regie and workshop exist (a few cheap ticks, then it stops)
  const iv = setInterval(() => {
    S.tries++;
    attach();
    if (S.attached || S.tries > 300) clearInterval(iv);
  }, 1000);

  return {
    attach,
    play,
    skip,
    stop,
    videoCard,
    radio: playRadio,
    batteryRadio: playBattery,
    layer,
    lines: D.lines,
    state: () => ({
      nom: S.lastNom || 0,
      layers: { ...S.layers },
      noNet: S.noNet,
      phones: S.phones.length,
      attached: S.attached,
      regie: !!S.regie,
      layersDef: !!S.layersDef,
      videosLoaded: S.videosLoaded,
      log: S.log.slice(-60),
      said: S.said.slice(-20),
    }),
    resetNet: () => (S.noNet = false),
    script: D,
    S,
  };
})();
window.ZKMEDIEN = ZKMEDIEN;
