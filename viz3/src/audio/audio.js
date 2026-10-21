// ===================== sound: real recordings (CC0 / CC BY), synthesized fallback =====================
let toastT = null; function toast(msg, ms = 3600) { const t = $('toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }
function soundLabel() { const b = $('soundbtn'); if (!b) return; const st = audio.state(); b.setAttribute('aria-pressed', opt.sound ? 'true' : 'false'); const sp = b.querySelector('span'); const txt = opt.sound ? 'an' : 'aus'; if (sp.textContent !== txt) sp.textContent = txt;
  b.title = opt.sound && st !== 'running' ? 'Ton startet mit dem ersten Klick oder Tippen' : ''; }
function setSound(v) { opt.sound = v; try { localStorage.setItem('pav-sound', v ? '1' : '0'); } catch (e) {} audio.enable(v); soundLabel(); }
$('soundbtn')?.addEventListener('click', () => setSound(!opt.sound));
const gesture = e => { if (e.target && e.target.closest && e.target.closest('#soundbtn')) return; if (opt.sound) audio.enable(true); };
['pointerup', 'touchend', 'click', 'keydown', 'mousedown'].forEach(t => window.addEventListener(t, gesture, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => audio.visible(!document.hidden));
const SNDMAN = window.SNDMAN || [];   // [{file, kind, loop}]
const LOOPLEN = {}; for (const s of SNDMAN) if (s.loop) LOOPLEN[s.kind] = s.loop;
const audio = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let mufF = null, mufG = null, mufK = 0; let ctx = null, comp, master, sfx, amb, ambLP, wetBus, on = false, vis = true, tod = 'gold', greeted = false, checkT = null, lastLbl = 0;
  let nb = null, wb = null, windG = null, windF = null, windSynth = null;
  const BUF = {}; const loops = {}; let loading = false; const tmr = [];
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const later = (fn, ms) => { tmr.push(setTimeout(fn, ms)); if (tmr.length > 60) tmr.splice(0, 30); };
  const has = k => BUF[k] && BUF[k].length;
  const pick = k => BUF[k][Math.floor(Math.random() * BUF[k].length)];
  const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  function panned(node, pan, dest) { if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); p.connect(dest); } else node.connect(dest); }
  function playBuf(buf, dest, { vol = 1, rate = 1, pan = 0, t = 0 } = {}) { const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; const g = gain(vol); s.connect(g); panned(g, pan, dest); s.start(t || ctx.currentTime); return s; }
  function mkNoise(sec, pink) { const sr = ctx.sampleRate, n = Math.floor(sr * sec), F = Math.floor(sr * 0.05), raw = new Float32Array(n + F); let b0 = 0, b1 = 0, b2 = 0, mx = 1e-6;
    for (let i = 0; i < n + F; i++) { const w = Math.random() * 2 - 1; let v = w; if (pink) { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965194; b2 = 0.57 * b2 + w * 1.0526913; v = b0 + b1 + b2 + w * 0.1848; } raw[i] = v; if (i > sr * 0.2) mx = Math.max(mx, Math.abs(v)); }
    const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = raw[i] * 0.85 / mx; for (let i = 0; i < F; i++) { const k = i / F; d[i] = d[i] * k + raw[n + i] * 0.85 / mx * (1 - k); } return b; }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function burst(t, o) { const { buf = wb, type = 'bandpass', f = 1000, q = 1, peak = 0.3, a = 0.002, d = 0.05, dest = sfx, pan = 0 } = o; const fl = filt(type, f, q), g = gain(0); env(g, t, a, peak, d); fl.connect(g); panned(g, pan, dest); const s = ctx.createBufferSource(); s.buffer = buf; s.connect(fl); s.start(t, Math.random() * (buf.duration - 0.6), a + d + 0.05); }
  function tone(t, o) { const { f0 = 200, f1 = f0, type = 'sine', peak = 0.2, a = 0.003, d = 0.1, dest = sfx, pan = 0 } = o; const os = ctx.createOscillator(); os.type = type; os.frequency.setValueAtTime(f0, t); if (f1 !== f0) os.frequency.exponentialRampToValueAtTime(f1, t + a + d); const g = gain(0); env(g, t, a, peak, d); os.connect(g); panned(g, pan, dest); os.start(t); os.stop(t + a + d + 0.05); }
  // short room reverb (impulse from decaying noise) for indoor footsteps and doors
  function mkIR(sec, decay) { const sr = ctx.sampleRate, n = Math.floor(sr * sec), b = ctx.createBuffer(2, n, sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  // ear defenders (V15b): a low-pass and less level on everything that reaches the ears
  function muffle(k) { mufK = k; if (!ctx || !mufF) return; const t = ctx.currentTime; mufF.frequency.setTargetAtTime(k ? 1100 : 20000, t, 0.08); mufG.gain.setTargetAtTime(k ? 0.5 : 1, t, 0.08); }
  function init() { try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    nb = mkNoise(4, true); wb = mkNoise(2, false);
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.25;
    master = gain(0); master.connect(comp); mufF = filt('lowpass', 20000, 0.6); mufG = gain(1); comp.connect(mufF); mufF.connect(mufG); mufG.connect(ctx.destination); if (mufK) muffle(mufK);
    sfx = gain(1); sfx.connect(master);
    const conv = ctx.createConvolver(); conv.buffer = mkIR(0.55, 3.2); wetBus = gain(0); sfx.connect(wetBus); wetBus.connect(conv); conv.connect(master);
    ambLP = filt('lowpass', 16000, 0.5); amb = gain(1); amb.connect(ambLP); ambLP.connect(master);
    loadAll(); scheduleOneShots(); }
  function loadAll() { if (loading) return; loading = true;
    for (const s of SNDMAN) { fetch(BASE + 'snd/' + s.file).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))).then(buf => { (BUF[s.kind] || (BUF[s.kind] = [])).push(buf); if (s.kind.startsWith('amb_')) startLoops(); }).catch(() => {}); }
    for (const l of (window.VOICEMAN && VOICEMAN.lines) || []) { fetch(BASE + 'snd/' + l.file).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej))).then(buf => { BUF['v:' + l.id] = [buf]; }).catch(() => {}); }
    later(() => { if (!has('amb_wind')) startSynthWind(); }, 2500); }
  // ---- positional one-shots and loops (stereo pan from the view direction, distance attenuation, air damping) ----
  function spatial(x, y, ref = 8) { const top = P.mode === 'top', lx = P.mode === 'walk' ? P.x : top ? P.tx : 2 + Math.sin(P.az * Math.PI / 180) * P.r * 0.5, ly = P.mode === 'walk' ? P.y : top ? P.ty : 2 + Math.cos(P.az * Math.PI / 180) * P.r * 0.5;
    const yaw = (P.mode === 'walk' ? P.yaw : top ? 0 : P.az + 180) * Math.PI / 180;
    const dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy, top ? P.th * 0.6 : 0) || 0.01; const rx = Math.cos(yaw), ry = -Math.sin(yaw); const pan = (dx * rx + dy * ry) / d * Math.min(1, d / 2);
    return { pan, vol: 1 / (1 + (d / ref) * (d / ref)), dist: d, lp: Math.max(900, 14000 - d * 160) }; }
  function at(kind, x, y, { vol = 1, rate = 1, ref = 8, dest = sfx, buf = null } = {}) { if (!ready()) return null; const b = buf || (has(kind) ? pick(kind) : null); if (!b) return null; const sp = spatial(x, y, ref); if (sp.vol * vol < 0.004) return null;
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const f = filt('lowpass', sp.lp, 0.5), g = gain(vol * sp.vol); s.connect(f); f.connect(g); panned(g, sp.pan, dest); s.start(ctx.currentTime + 0.005); return s; }
  function voice(id, x, y, { vol = 1.2, ref = 7 } = {}) { return new Promise(res => { const b = BUF['v:' + id] && BUF['v:' + id][0]; if (!ready() || !b) { res(false); return; } const s = at(null, x, y, { vol, ref, buf: b }); if (!s) { res(false); return; } s.onended = () => res(true); }); }
  const posLoops = {};
  function loopAt(name, kind, x, y, { vol = 1, ref = 10, rate = 1 } = {}) { if (!ready() || posLoops[name] || !has(kind)) return; const s = ctx.createBufferSource(); s.buffer = BUF[kind][0]; s.loop = true; { const ls = LOOPLEN[kind]; if (ls) s.loopEnd = Math.min(s.buffer.duration, ls / 48000); } s.playbackRate.value = rate; const f = filt('lowpass', 8000, 0.5), g = gain(0); let pn = null; if (ctx.createStereoPanner) { pn = ctx.createStereoPanner(); g.connect(pn); pn.connect(amb); } else g.connect(amb); s.connect(f); f.connect(g); s.start(ctx.currentTime + 0.02, Math.random() * s.buffer.duration * 0.8); posLoops[name] = { s, g, f, pn, vol, ref }; moveLoop(name, x, y); }
  function moveLoop(name, x, y) { const L = posLoops[name]; if (!L || !ctx) return; const sp = spatial(x, y, L.ref), t = ctx.currentTime; L.g.gain.setTargetAtTime(L.vol * sp.vol, t, 0.1); L.f.frequency.setTargetAtTime(sp.lp, t, 0.2); if (L.pn) L.pn.pan.setTargetAtTime(sp.pan, t, 0.1); }
  function loopVol(name, v) { const L = posLoops[name]; if (L) L.vol = v; }
  function loopRate(name, r, tau = 0.4) { const L = posLoops[name]; if (L && ctx) L.s.playbackRate.setTargetAtTime(r, ctx.currentTime, tau); }
  function stopLoop(name, fade = 0.5) { const L = posLoops[name]; if (!L) return; L.g.gain.setTargetAtTime(0, ctx.currentTime, fade * 0.4); setTimeout(() => { try { L.s.stop(); } catch (e) {} }, fade * 1000 + 100); delete posLoops[name]; }
  function loopNode(kind, dest) { if (loops[kind] || !has(kind)) return null; const s = ctx.createBufferSource(); s.buffer = BUF[kind][0]; s.loop = true; const ls = LOOPLEN[kind]; if (ls) s.loopEnd = Math.min(s.buffer.duration, ls / 48000); const g = gain(0); s.connect(g); g.connect(dest); s.start(ctx.currentTime + 0.05, Math.random() * (s.loopEnd || s.buffer.duration) * 0.8); loops[kind] = { s, g }; return loops[kind]; }
  function startLoops() { if (!ctx) return; for (const k of ['amb_birds_day', 'amb_wind', 'amb_dusk']) loopNode(k, amb); if (has('amb_stove')) loopNode('amb_stove', sfx); if (has('amb_wind') && windSynth) { windSynth.gain.setTargetAtTime(0, ctx.currentTime, 1); } }
  function startSynthWind() { if (windSynth || !ctx) return; windF = filt('lowpass', 600, 0.5); windG = gain(0.25); windSynth = gain(1); const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(windF); windF.connect(windG); windG.connect(windSynth); windSynth.connect(amb); s.start(); gusts(); }
  function gusts() { if (!ctx || !windG) return; const t = ctx.currentTime, g = Math.random(), d = 2.5 + Math.random() * 5; windG.gain.setTargetAtTime((0.08 + g * 0.24) * windMul, t, d * 0.35); windF.frequency.setTargetAtTime(380 + g * 520, t, d * 0.4); later(gusts, d * 1000); }
  let windMul = 1, stoveVol = 0;
  // birds and distant sounds: recorded one-shots when available, else synthesized phrases
  function scheduleOneShots() {
    const bird = () => { if (!ctx) return; const dusk = tod === 'dusk';
      if (on && vis) { const kinds = ['bird_blackbird', 'bird_greattit', 'bird_chaffinch', 'bird_robin'].filter(has); const pan = Math.random() * 1.6 - 0.8, v = (dusk ? 0.35 : 0.6) * (0.4 + Math.random() * 0.6);
        if (kinds.length) playBuf(pick(kinds[Math.floor(Math.random() * kinds.length)]), amb, { vol: v, pan, rate: 0.97 + Math.random() * 0.06 }); else synthBird(pan, v * 0.2); }
      later(bird, (dusk ? 9000 : (has('amb_birds_day') ? 6000 : 2200)) + Math.random() * (dusk ? 14000 : 7000)); };
    const distant = () => { if (!ctx) return; if (on && vis) { const r = Math.random(), pan = Math.random() * 1.6 - 0.8, t = ctx.currentTime + 0.1;
        if (tod === 'dusk') { if (r < 0.5) (has('owl') ? playBuf(pick('owl'), amb, { vol: 0.45, pan }) : synthOwl(t, pan)); else if (r < 0.75) (has('bells') ? playBuf(pick('bells'), amb, { vol: 0.3, pan: -0.4 }) : synthBells(t)); }
        else { if (r < 0.35) (has('crow') ? playBuf(pick('crow'), amb, { vol: 0.4, pan }) : synthCrow(t, pan)); else if (r < 0.6) (has('woodpecker') ? playBuf(pick('woodpecker'), amb, { vol: 0.4, pan }) : synthWoodpecker(t, pan)); else if (r < 0.8) (has('bells') ? playBuf(pick('bells'), amb, { vol: 0.28, pan: -0.4 }) : synthBells(t)); } }
      later(distant, 24000 + Math.random() * 36000); };
    // V16a: summer nights (May–September of the game's date): field crickets, three of them at different pitches, chirps of four pulses
    const cricket = () => { if (!ctx) return;
      if (on && vis && tod === 'dusk' && (!window.DN || !DN.active || DN.summer())) { const t0 = ctx.currentTime + 0.05;
        for (let k = 0; k < 3; k++) { if (Math.random() < 0.22) continue; const f = [4300, 4650, 4950][k], pan = [-0.65, 0.15, 0.7][k], tt = t0 + k * 0.14 + Math.random() * 0.05;
          for (let i = 0; i < 4; i++) tone(tt + i * 0.034, { f0: f, f1: f * 0.985, type: 'sine', peak: 0.008, a: 0.003, d: 0.017, dest: amb, pan }); } }
      later(cricket, 500 + Math.random() * 140); };
    later(bird, 1200); later(distant, 9000 + Math.random() * 9000); later(cricket, 3000); }
  function synthBird(pan, v) { const t = ctx.currentTime + 0.05; let tt = t; for (let i = 0; i < 6; i++) { const f = 1500 + Math.random() * 1100, d = 0.08 + Math.random() * 0.18; tone(tt, { f0: f, f1: f * (0.85 + Math.random() * 0.35), type: 'triangle', peak: v, a: d * 0.15, d: d * 0.85, dest: amb, pan }); tt += d + 0.03; } }
  function synthCrow(t, pan) { for (let i = 0; i < 3; i++) { const tt = t + i * 0.55, o = ctx.createOscillator(); o.type = 'sawtooth'; const f1 = filt('bandpass', 1150, 3), g = gain(0); o.frequency.setValueAtTime(640, tt); o.frequency.linearRampToValueAtTime(470, tt + 0.32); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.1, tt + 0.04); g.gain.linearRampToValueAtTime(0, tt + 0.34); o.connect(f1); f1.connect(g); panned(g, pan, amb); o.start(tt); o.stop(tt + 0.4); } }
  function synthWoodpecker(t, pan) { let tt = t; for (let i = 0; i < 16; i++) { burst(tt, { type: 'bandpass', f: 1300, q: 3, peak: 0.05 * (1 - i / 22), a: 0.001, d: 0.02, dest: amb, pan }); tt += 0.055 - i * 0.0012; } }
  function synthOwl(t, pan) { tone(t, { f0: 420, f1: 395, peak: 0.05, a: 0.08, d: 0.8, dest: amb, pan }); let tt = t + 2.2; for (let i = 0; i < 5; i++) { tone(tt, { f0: 410, f1: 400, peak: 0.035, a: 0.02, d: 0.1, dest: amb, pan }); tt += 0.16; } }
  function synthBells(t) { for (let k = 0; k < 3; k++) for (const [m, a, d] of [[0.5, 0.5, 6], [1, 1, 4], [1.19, 0.6, 3], [1.5, 0.4, 2.5], [2, 0.3, 2]]) { const tt = t + k * 2.2, o = ctx.createOscillator(); o.frequency.value = 392 * m; const g = gain(0); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.04 * a, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + d); o.connect(g); g.connect(amb); o.start(tt); o.stop(tt + d + 0.1); } }
  const ready = () => on && ctx && ctx.state === 'running';
  function step(type, loud = 1, stair = false) { if (!ready()) return; if (type === 'ladder') { type = 'wood'; stair = true; loud *= 0.85; } const t = ctx.currentTime + 0.005, v = loud * (0.8 + Math.random() * 0.35), rate = 0.92 + Math.random() * 0.16;
    const kind = type === 'wood' ? (stair && has('step_stairs') ? 'step_stairs' : (P.feet > G.zD - 0.3 && has('step_deck') ? 'step_deck' : 'step_wood')) : type === 'stone' ? 'step_gravel' : 'step_grass';
    if (has(kind)) { playBuf(pick(kind), sfx, { vol: v * (kind === 'step_grass' ? 0.8 : 0.65), rate }); return; }
    if (type === 'wood') { for (const [dt, k] of [[0, 1], [0.07 + Math.random() * 0.03, 0.45]]) { const tt = t + dt; burst(tt, { buf: nb, type: 'lowpass', f: 280, q: 0.8, peak: 1.1 * v * k, d: 0.09 }); burst(tt, { type: 'bandpass', f: 650 + Math.random() * 450, q: 1.2, peak: 0.9 * v * k, a: 0.001, d: 0.045 }); } }
    else if (type === 'stone') { burst(t, { buf: nb, type: 'lowpass', f: 450, peak: 0.5 * v, a: 0.003, d: 0.08 }); for (let i = 0; i < 22; i++) burst(t + Math.pow(Math.random(), 1.7) * 0.2, { type: 'bandpass', f: 1500 + Math.random() * 4500, q: 2 + Math.random() * 3, peak: (0.35 + Math.random() * 0.75) * v, a: 0.001, d: 0.01 + Math.random() * 0.03 }); }
    else { burst(t, { buf: nb, type: 'lowpass', f: 230, peak: 0.6 * v, a: 0.004, d: 0.09 }); burst(t + 0.01, { type: 'bandpass', f: 2600 + Math.random() * 1600, q: 0.7, peak: 0.28 * v, a: 0.03, d: 0.2 }); } }
  function door(k, open) { if (!ready()) return; const t = ctx.currentTime + 0.005;
    const kind = k === 'eg' ? (open ? 'door_open' : 'door_close') : (open ? 'slide_open' : 'slide_close');
    const alt = k === 'og' && !has(kind) && has('slide_open') ? 'slide_open' : null;
    if (has(kind) || alt) { playBuf(pick(alt || kind), sfx, { vol: 0.8, rate: alt && !open ? 0.94 : 1 }); return; }
    const latch = (tt, v) => { burst(tt, { type: 'bandpass', f: 2600, q: 3, peak: v, a: 0.001, d: 0.03 }); tone(tt, { f0: 1900, f1: 1700, type: 'triangle', peak: v * 0.25, d: 0.05 }); };
    if (k === 'eg') { latch(t, 0.8); if (!open) { burst(t + 0.62, { buf: nb, type: 'lowpass', f: 380, peak: 1.4, a: 0.002, d: 0.16 }); latch(t + 0.64, 0.9); } }
    else { const s = ctx.createBufferSource(); s.buffer = nb; const f = filt('bandpass', 450, 0.8), g = gain(0); f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + 0.35); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.08); g.gain.linearRampToValueAtTime(0, t + 0.62); s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random(), 0.7); latch(t + 0.63, 0.5); } }
  function insideNow() { if (P.mode !== 'walk' || P.feet >= G.zC) return false; const eg = P.x > 0 && P.x < 4 && P.y > 0 && P.y < 4 && P.feet < G.zE, og = P.x > G.OG.x0 && P.x < G.OG.x1 && P.y > G.OG.y0 && P.y < G.OG.y1 && P.feet >= G.zE, tw = P.x > G.TW.x0 && P.x < G.TW.x1 && P.y > G.TW.y0 && P.y < G.TW.y1; return eg || og || tw || !!(window.insideSite && insideSite(P.x, P.y, P.feet)); }
  function update(dt) { if (!ctx) return; const now = performance.now(); if (now - lastLbl > 400) { lastLbl = now; soundLabel(); }
    if (!on) return; const t = ctx.currentTime, show = vis && stage.offsetParent !== null; master.gain.setTargetAtTime(show ? 1 : 0, t, 0.15);
    const inside = insideNow(), high = P.mode === 'walk' ? THREE.MathUtils.clamp(P.feet / G.zD, 0, 1) : 0.6; windMul = 0.75 + high * 1.0;
    const openEG = DOOR.eg ? DOOR.eg.t > 0.5 : false, openOG = DOOR.ogE ? DOOR.ogE.t > 0.5 : false, inOG = P.feet > G.zU - 0.2;
    ambLP.frequency.setTargetAtTime(inside ? ((inOG ? openOG : openEG) ? 5500 : 900) : 16000, t, 0.25); amb.gain.setTargetAtTime(inside ? 0.55 : 1, t, 0.25);
    wetBus.gain.setTargetAtTime(inside ? 0.22 : 0.0, t, 0.2);
    const day = tod !== 'dusk';
    if (loops.amb_birds_day) loops.amb_birds_day.g.gain.setTargetAtTime(day ? (tod === 'day' ? 0.75 : 0.6) : 0, t, 1.5);
    if (loops.amb_dusk) loops.amb_dusk.g.gain.setTargetAtTime(day ? 0 : 0.8, t, 1.5);
    if (loops.amb_wind) loops.amb_wind.g.gain.setTargetAtTime(0.35 * windMul, t, 1.0);
    const ds = Math.hypot(P.x - G.STV[0], P.y - G.STV[1]); const inEG = P.mode === 'walk' && P.feet < G.zU - 0.4 && inside;
    const fire = window.STOVE ? STOVE.level() : (tod !== 'day' ? 1 : 0);   // V14: the fire burns once it has been lit (game/quests.js)
    stoveVol = (inEG && fire > 0) ? THREE.MathUtils.clamp(0.9 / (ds * ds + 0.6), 0, 0.9) * fire : 0;
    if (loops.amb_stove) loops.amb_stove.g.gain.setTargetAtTime(stoveVol, t, 0.3);
    if (!greeted && ctx.state === 'running') { greeted = true; toast(IOS ? 'Ton an. Falls es still bleibt: Lautstärke hoch und Stummschalter prüfen.' : 'Ton an: Wind, Vögel, Schritte und Türen sind echte Aufnahmen.'); } }
  function iosUnlock() { try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) {} }
  return {
    enable(v) { on = v; if (v) { try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
        if (!ctx) { try { init(); } catch (e) { console.warn('audio', e); return; } } iosUnlock();
        if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.then) p.then(soundLabel, () => {}); if (!checkT) checkT = setTimeout(() => { checkT = null; if (on && ctx.state !== 'running') toast('Der Browser hält den Ton hier noch zurück. Einmal ins Bild tippen oder klicken.', 5000); }, 1600); }
        master.gain.setTargetAtTime(1, ctx.currentTime, 0.4); }
      else if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); soundLabel(); },
    visible(v) { vis = v; if (!ctx) return; if (!v) ctx.suspend && ctx.suspend(); else if (on) ctx.resume(); },
    state() { return ctx ? ctx.state : 'none'; }, step, door, update, setTime(m) { tod = m; }, at, voice, loopAt, moveLoop, stopLoop, loopVol, loopRate, hasLoop: name => !!posLoops[name], spatial, has: k => !!(ctx && has(k)), hasVoice: id => !!(ctx && BUF['v:' + id]), ctxTime: () => ctx ? ctx.currentTime : 0, ready,
    tap() { if (!ctx) return null; const d = ctx.createMediaStreamDestination(); comp.connect(d); return d.stream; },
    muffle, raw() { return ctx ? { ctx, sfx, amb, master, wet: wetBus } : null; }, buf(k) { return ctx && has(k) ? pick(k) : null; }, inside: () => insideNow(), loaded() { return Object.fromEntries(Object.entries(BUF).map(([k, v]) => [k, v.length])); } };
})();
