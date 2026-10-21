// ===================== V14 game layer: one action button (E / tap) for doors, people and things; carrying things in the hand; =====================
// sitting, lying and riding along; timed work with a progress bar; thoughts as subtitles. The quests (25_quests.js) and the
// instruments (24_music.js) build on it. All positions in site coordinates (x east, y north, z up).
phase(null);
// ---- the thing in the hand: its own little scene, drawn over the finished picture with a cleared depth buffer, so it never cuts into walls ----
const HELD = (() => {
  const sc = new THREE.Scene(), root = new THREE.Group(); sc.add(root);
  const sunL = new THREE.DirectionalLight(0xffffff, 1); sc.add(sunL, sunL.target);
  const lampL = new THREE.PointLight(0xffc98a, 0, 4, 2); sc.add(lampL);
  const H = { scene: sc, root, obj: null, vm: null, anim: null, sway: 0, away: false, kind: null };   // away: the thing is in the figure's hand (third person)
  const mk = () => ({ enabled: true, needsSwap: false, clear: false, renderToScreen: false, setSize() {}, dispose() {},
    render(r, wb, rb) { if (!H.obj || H.away) return; const ac = r.autoClear; r.autoClear = false; r.setRenderTarget(this.renderToScreen ? null : rb); r.clearDepth(); r.render(sc, cam); r.autoClear = ac; } });
  try { const c = RENDER.composer, i = c.passes.indexOf(RENDER.ao) >= 0 ? c.passes.indexOf(RENDER.ao) + 1 : c.passes.indexOf(RENDER.rp) + 1; c.insertPass(mk(), i); } catch (e) { console.warn('held pass', e); }
  try { MOTION.comp.insertPass(mk(), 1); } catch (e) { console.warn('held pass (motion)', e); }
  const _o = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  H.set = (obj, vm) => { if (H.obj && H.obj.parent) H.obj.parent.remove(H.obj); H.obj = obj || null; H.vm = vm || null; H.anim = null; H.away = false; if (obj) { root.add(obj); obj.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } }); } markDirty(); };
  // a short animation of the held thing (swing of the axe, pouring the can …): f(k) → {dx,dy,dz, rx,ry,rz} in camera space, k = 0..1
  H.play = (dur, f, kind) => new Promise(res => { H.anim = { t: 0, dur, f, res, kind: kind || null }; if (kind === 'chop' && window.AVATAR) AVATAR.gesture('chop', 1); markDirty(); });
  H.tick = dt => { if (!H.anim) return false; const a = H.anim; a.t += dt; if (a.t >= a.dur) { H.anim = null; a.res(); } markDirty(); return true; };
  H.place = () => { if (!H.obj || H.away) return; const v = H.vm || {}; let dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0;
    if (H.anim) { const r = H.anim.f(Math.min(1, H.anim.t / H.anim.dur)) || {}; dx = r.dx || 0; dy = r.dy || 0; dz = r.dz || 0; rx = r.rx || 0; ry = r.ry || 0; rz = r.rz || 0; }
    const st = P.stride || 0, walk = Math.min(1, H.sway); dx += Math.sin(st * Math.PI / 0.72) * 0.006 * walk; dy += Math.abs(Math.cos(st * Math.PI / 0.72)) * 0.008 * walk;
    _o.set((v.x ?? 0.26) + dx, (v.y ?? -0.3) + dy, (v.z ?? -0.55) + dz).applyQuaternion(cam.quaternion); H.obj.position.copy(cam.position).add(_o);
    _e.set((v.rx || 0) + rx, (v.ry || 0) + ry, (v.rz || 0) + rz, 'YXZ'); _q.setFromEuler(_e); H.obj.quaternion.copy(cam.quaternion).multiply(_q); H.obj.scale.setScalar(v.s || 1);
    // light: the scene's sky light and environment; direct sun only outdoors; a warm lamp near the camera when a room light is on
    const ins = houseAt(P.x, P.y, P.feet) || !!(window.insideSite && insideSite(P.x, P.y, P.feet));
    sunL.color.copy(sun.color); sunL.intensity = ins ? 0 : sun.intensity * 0.9; sunL.position.copy(sunDir).multiplyScalar(10).add(H.obj.position); sunL.target.position.copy(H.obj.position); sunL.target.updateMatrixWorld();
    sc.environment = scene.environment; sc.environmentIntensity = scene.environmentIntensity * (ins ? 0.55 : 1); sc.environmentRotation.copy(scene.environmentRotation);
    lampL.position.copy(cam.position); lampL.position.y += 0.6; lampL.intensity = ins && window.LIGHTSTATE && LIGHTSTATE.lampNear(P.x, P.y, P.feet) ? 1.6 : 0; };
  return H; })();
window.PREFRAME = () => HELD.place();
// ---- synthesized little sounds for the actions (the recordings in snd/ stay for steps, doors, machines) ----
const SFX = (() => {
  let nb = null; const A = () => audio.raw && audio.raw();
  const noise = c => { if (nb) return nb; const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return nb = b; };
  function burst(t, { f = 1000, q = 1, type = 'bandpass', peak = 0.3, a = 0.002, d = 0.06, f1 = null, dest = null }) { const r = A(); if (!r) return; const c = r.ctx, s = c.createBufferSource(); s.buffer = noise(c);
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + a + d); fl.Q.value = q; const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); s.connect(fl); fl.connect(g); g.connect(dest || r.sfx); s.start(t, Math.random() * 1.2, a + d + 0.05); }
  function tone(t, { f0 = 400, f1 = null, type = 'sine', peak = 0.2, a = 0.003, d = 0.2, dest = null }) { const r = A(); if (!r) return; const c = r.ctx, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); o.connect(g); g.connect(dest || r.sfx); o.start(t); o.stop(t + a + d + 0.05); }
  const now = () => { const r = A(); return r && audio.ready() ? r.ctx.currentTime + 0.01 : null; };
  return {
    pick() { const t = now(); if (t == null) return; burst(t, { f: 2200, q: 0.8, peak: 0.12, d: 0.08 }); burst(t + 0.05, { f: 900, q: 1, peak: 0.08, d: 0.06 }); },
    drop() { const t = now(); if (t == null) return; burst(t, { type: 'lowpass', f: 240, peak: 0.55, d: 0.13 }); burst(t + 0.005, { f: 1400, q: 2, peak: 0.12, d: 0.03 }); },
    hay() { const t = now(); if (t == null) return; for (let i = 0; i < 9; i++) burst(t + i * 0.035 + Math.random() * 0.02, { f: 3000 + Math.random() * 2500, q: 0.9, peak: 0.07, d: 0.07 }); },
    swing() { const t = now(); if (t == null) return; burst(t, { f: 500, f1: 1900, q: 1.4, peak: 0.16, a: 0.12, d: 0.12 }); },
    chop() { const t = now(); if (t == null) return; tone(t, { f0: 130, f1: 55, peak: 0.7, d: 0.12 }); burst(t, { type: 'lowpass', f: 600, peak: 0.6, d: 0.09 }); burst(t + 0.004, { f: 2600, q: 2.2, peak: 0.35, d: 0.04 });
      for (const [f, k] of [[420, 0.18], [690, 0.12]]) tone(t + 0.002, { f0: f, f1: f * 0.96, type: 'triangle', peak: k, d: 0.18 }); for (let i = 0; i < 5; i++) burst(t + 0.05 + Math.random() * 0.25, { f: 2000 + Math.random() * 3000, q: 3, peak: 0.05, d: 0.02 }); },
    clunk() { const t = now(); if (t == null) return; for (let i = 0; i < 3; i++) { const tt = t + i * 0.16 + Math.random() * 0.05; tone(tt, { f0: 240 + Math.random() * 120, f1: 150, type: 'triangle', peak: 0.25, d: 0.1 }); burst(tt, { type: 'lowpass', f: 500, peak: 0.3, d: 0.07 }); } },
    match() { const t = now(); if (t == null) return; burst(t, { f: 3200, q: 0.7, peak: 0.25, d: 0.12 }); burst(t + 0.1, { f: 900, f1: 2400, q: 0.8, peak: 0.12, a: 0.05, d: 0.5 }); },
    whoomp() { const t = now(); if (t == null) return; burst(t, { type: 'lowpass', f: 300, f1: 900, peak: 0.35, a: 0.15, d: 0.7 }); },
    glug(sec = 3.5) { const t = now(); if (t == null) return; let tt = t; while (tt < t + sec) { const f = 170 + Math.random() * 160; tone(tt, { f0: f * 1.3, f1: f, type: 'sine', peak: 0.16 + Math.random() * 0.1, a: 0.004, d: 0.06 }); burst(tt, { type: 'lowpass', f: 420, peak: 0.07, d: 0.08 }); tt += 0.09 + Math.random() * 0.17; } },
    chime() { const t = now(); if (t == null) return; [1046.5, 1318.5, 1568, 2093].forEach((f, i) => { tone(t + i * 0.13, { f0: f, peak: 0.13, a: 0.004, d: 1.3 }); tone(t + i * 0.13, { f0: f * 2.01, peak: 0.03, a: 0.004, d: 0.6 }); }); },
    note() { const t = now(); if (t == null) return; tone(t, { f0: 1318.5, peak: 0.1, d: 0.9 }); tone(t + 0.11, { f0: 1760, peak: 0.08, d: 0.9 }); },
    clamp() { const t = now(); if (t == null) return; for (let i = 0; i < 3; i++) { burst(t + i * 0.42, { f: 3800, q: 6, peak: 0.25, d: 0.025 }); tone(t + i * 0.42, { f0: 2400, type: 'square', peak: 0.03, d: 0.04 }); } },
    saw(n = 4) { const t = now(); if (t == null) return; for (let i = 0; i < n; i++) burst(t + i * 0.42, { f: 2500, f1: 4200, q: 1.5, peak: 0.12, a: 0.12, d: 0.2 }); },
    brush() { const t = now(); if (t == null) return; for (let i = 0; i < 5; i++) burst(t + i * 0.5, { f: 1800, q: 0.6, peak: 0.05, a: 0.15, d: 0.3 }); },
    sizzle() { const t = now(); if (t == null) return; burst(t, { f: 5000, q: 0.5, peak: 0.06, a: 0.3, d: 1.6 }); },
    bell() { const t = now(); if (t == null) return; tone(t, { f0: 880, peak: 0.08, d: 0.5 }); },
    click() { const t = now(); if (t == null) return; burst(t, { f: 3200, q: 4, peak: 0.18, d: 0.02 }); tone(t, { f0: 1900, type: 'square', peak: 0.03, d: 0.025 }); },
    cloth() { const t = now(); if (t == null) return; burst(t, { f: 1500, f1: 700, q: 0.7, peak: 0.07, a: 0.06, d: 0.22 }); burst(t + 0.12, { f: 900, q: 0.6, peak: 0.05, a: 0.05, d: 0.18 }); },
    hop() { const t = now(); if (t == null) return; burst(t, { type: 'lowpass', f: 260, peak: 0.22, d: 0.08 }); burst(t + 0.01, { f: 1300, f1: 600, q: 0.8, peak: 0.06, a: 0.04, d: 0.16 }); } };
})();
// ---- the interaction layer ----
const PLAY = (() => {
  const ACTS = [], THINGS = {}, S = { best: null, hold: null, carry: null, seat: null, tw: null, lastLbl: '', lastSec: '', thinkT: null };
  // ---- V15 inventory: 8 places in the bar at the bottom (keys 1–8) and 16 in the bag; the chosen bar place is what is in the hand ----
  const NB = 8, INV = { slots: new Array(NB + 16).fill(null), sel: 0 }, invFns = [];
  const slotOf = T => T ? INV.slots.indexOf(T) : -1, has = T => slotOf(T) >= 0, cur = () => (INV.sel >= 0 && INV.sel < NB ? INV.slots[INV.sel] : null);
  let invT = null; function invChanged() { clearTimeout(invT); invT = setTimeout(() => { for (const f of invFns) try { f(); } catch (e) { console.warn(e); } }, 0); }
  function showHand(quiet) { const T = cur(); if (S.carry !== T) { S.carry = T; HELD.set(T ? T.held : null, T ? T.vm : null); if (T && !quiet) SFX.click(); } S.lastLbl = null; S.lastSec = null; invChanged(); markDirty(); }
  function select(i, quiet) { if (S.hold) return false; INV.sel = (i == null || i < 0 || i >= NB) ? -1 : i; showHand(quiet); return true; }
  function hold(T) { const i = slotOf(T); if (i < 0) return false; if (i >= NB) { let j = INV.slots.slice(0, NB).indexOf(null); if (j < 0) j = INV.sel >= 0 ? INV.sel : 0; const o = INV.slots[j]; INV.slots[j] = T; INV.slots[i] = o; INV.sel = j; showHand(true); return true; }
    if (INV.sel !== i) { INV.sel = i; showHand(true); } return true; }
  function moveSlot(a, b) { if (a === b || a < 0 || b < 0) return; const t = INV.slots[a]; INV.slots[a] = INV.slots[b]; INV.slots[b] = t; showHand(true); }
  function freeSlot() { if (INV.sel >= 0 && !INV.slots[INV.sel]) return INV.sel; let j = INV.slots.slice(0, NB).indexOf(null); if (j < 0) j = INV.slots.indexOf(null); return j; }
  function unslot(T) { const i = slotOf(T); if (i < 0) return false; INV.slots[i] = null; if (S.carry === T) { S.carry = null; HELD.set(null); } S.lastLbl = null; S.lastSec = null; invChanged(); return true; }
  const btn = $('doorbtn'), b2 = $('act2'), sb = $('npcsub');
  const fwd = () => { const y = P.yaw * Math.PI / 180; return [Math.sin(y), Math.cos(y)]; };
  const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
  function act(a) { a.r = a.r || 1.6; ACTS.push(a); return a; }
  function off(id) { const i = ACTS.findIndex(a => a.id === id); if (i >= 0) ACTS.splice(i, 1); }
  // ---- candidates: registered things to do, doors and machines, the two neighbours ----
  const doorTxt = d => d.kind === 'machine' ? d.label + (d.target > 0.5 ? ' ausschalten' : ' einschalten') : doorWord(d) + (d.target > 0.5 ? ' schließen' : ' öffnen');
  const doorActs = {};
  function doorCand(k) { return doorActs[k] || (doorActs[k] = { id: 'door:' + k, door: k, r: 1.6, label: () => doorTxt(DOOR[k]), pos: () => { const d = DOOR[k]; return [d.pos[0], d.pos[1], d.z + 1.0]; }, run: () => toggleDoor(k) }); }
  const npcActs = {};
  function npcCand(w) { return npcActs[w.name] || (npcActs[w.name] = { id: 'npc:' + w.name, npc: w, r: 3.2, prio: -0.3, label: () => 'Mit ' + (w.name === 'hubert' ? 'Hubert' : 'Ronald') + ' sprechen', pos: () => [w.x, w.y, P.feet + 1.5], run: () => NPCUI.start(w) }); }
  function candidates() { const out = [];
    for (const k of DKEYS()) { const d = DOOR[k]; if (!doorOn(d) || P.feet < d.z - 0.7 || P.feet > d.z + 0.9) continue; if (Math.hypot(P.x - d.pos[0], P.y - d.pos[1]) < (d.r || 1.6)) out.push(doorCand(k)); }
    if (!NPCUI.cur()) for (const w of [NPCS.hubert, NPCS.ronald]) { if (w.drive || !w.fig.g.visible || w.dist() > 3.2) continue; out.push(npcCand(w)); }
    for (const a of ACTS) out.push(a);
    return out; }
  function reach(a) { const p = val(a.pos); if (!p) return null; const d = Math.hypot(p[0] - P.x, p[1] - P.y); if (d > val(a.r)) return null; if (p[2] < P.feet - 0.6 || p[2] > P.feet + 2.5) return null; return { p, d }; }
  function pick() { if (P.mode !== 'walk' || (typeof PLAN !== 'undefined' && PLAN.on) || S.seat && S.seat.kind === 'ride') return null; const [fx, fy] = fwd(); let best = null, bs = 1e9;
    for (const a of candidates()) { const r = reach(a); if (!r) continue; let lbl; try { lbl = a.label(); } catch (e) { lbl = null; } if (!lbl) continue;
      const dx = r.p[0] - P.x, dy = r.p[1] - P.y, L = Math.hypot(dx, dy) || 1, cs = (dx * fx + dy * fy) / L, ang = r.d < 0.45 ? 0 : 1 - cs;
      if (ang > 1.35 && r.d > 0.8) continue;   // behind me
      const s = r.d + ang * 2.2 - (a.prio || 0); if (s < bs) { bs = s; best = a; } }
    return best; }
  // ---- doing it ----
  // the figure turns to what it acts on and makes a small movement (picking up, reaching, waving)
  function act3(a) { if (!window.AVATAR || !CAM3.on) return; const p = val(a.pos); if (p) { const dx = p[0] - P.x, dy = p[1] - P.y; if (Math.hypot(dx, dy) > 0.15) P.body = Math.atan2(dx, dy) * 180 / Math.PI; }
    let g = a.gest3 !== undefined ? val(a.gest3) : null;
    if (g === null) { const id = a.id || ''; if (id.startsWith('take:')) g = p && p[2] < P.feet + 0.55 ? 'pickupLow' : 'pickup'; else if (id.startsWith('npc:')) g = 'greet'; else if (id.startsWith('seat:') || id === 'piano' || val(a.hold)) g = null; else g = 'interact'; }
    if (g) AVATAR.gesture(g, g === 'interact' ? 1.7 : g === 'pickupLow' ? 1.5 : 1.2); }
  function run(a) { if (!a) return false; const nd = val(a.need); if (nd) hold(nd); act3(a); if (val(a.hold) || val(a.gauge)) { startHold(a); return true; } try { a.run(); } catch (e) { console.warn('act', a.id, e); } S.lastLbl = null; return true; }
  // V15b: a gauge is a hold that the player stops (E / the button again) – the work's result depends on where the bar stood (green zone)
  function startHold(a) { if (S.hold) return; const g = val(a.gauge) || null; S.hold = { a, t: 0, dur: g ? g.dur : val(a.hold), x: P.x, y: P.y, g }; try { a.start && a.start(); } catch (e) { console.warn(e); } S.lastLbl = null; }
  function endHold(ok) { const h = S.hold; if (!h) return; S.hold = null; S.lastLbl = null; if (ok) { try { h.a.run(h.g ? Math.min(1, h.t / h.dur) : undefined); } catch (e) { console.warn('act', h.a.id, e); } } else if (h.a.cancel) h.a.cancel(); }
  function primary() { if (S.hold) { if (S.hold.g && S.hold.t > 0.12) endHold(true); return true; } if (S.seat && S.seat.primary) { S.seat.primary(); return true; } const a = S.best; if (!a) return false; return run(a); }
  function secondary() { if (S.hold) { endHold(false); return true; } if (S.seat) return stand(); if (S.carry) { drop(); return true; } const q = window.PLAY_SEC && PLAY_SEC(); if (q) { q.run(); S.lastSec = null; return true; } return false; }
  // ---- carrying ----
  function thing(o) { const T = Object.assign({ state: 'world', pos: [0, 0, 0], yaw: 0, r: 1.4, hz: 0.25 }, o); THINGS[T.id] = T;
    T.place = (x, y, z, yaw = 0) => { T.state = 'world'; T.pos = [x, y, z]; T.yaw = yaw; if (T.world) { T.world.position.copy(V(x, y, z)); T.world.rotation.set(0, yaw, 0); T.world.visible = true; T.world.updateMatrixWorld(true); } unslot(T); if (T.onPlace) T.onPlace(); markDirty(true); };
    T.gone = () => { T.state = 'gone'; if (T.world) T.world.visible = false; unslot(T); markDirty(true); };
    if (T.world) { T.world.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; x.userData.noMerge = true; } }); if (!T.world.parent) scene.add(T.world); }
    act({ id: 'take:' + T.id, r: T.r, prio: T.prio || 0.2, obj: () => T.world, label: () => (T.state === 'world' && (!T.can || T.can())) ? (val(T.takeLabel) || T.name + ' nehmen') : null,
      pos: () => [T.pos[0], T.pos[1], T.pos[2] + T.hz], run: () => give(T) });
    return T; }
  // taking a thing: into a free place (the chosen one if it is empty, else the bar, else the bag) and into the hand; everything full: it changes places with the thing in the hand
  function give(T, at) { if (has(T)) { hold(T); return; } let i = at != null && at >= 0 && !INV.slots[at] ? at : freeSlot();
    if (i < 0) { const old = cur() || INV.slots[0]; if (old) { if (T.state === 'world') old.place(T.pos[0], T.pos[1], T.pos[2], T.yaw); else dropAt(old); } i = slotOf(null); if (i < 0) return; }
    INV.slots[i] = T; T.state = 'inv'; if (T.world) T.world.visible = false; (T.sfx || SFX.pick)(); if (T.onTake) T.onTake();
    if (i < NB) { INV.sel = i; showHand(true); } else { think(T.name + ' ist im Rucksack (I).'); invChanged(); } markDirty(true); }
  function dropAt(T) { const [fx, fy] = fwd(); let x = P.x + fx * 0.55, y = P.y + fy * 0.55; if (opt.collide && blocked(x, y, P.feet)) { x = P.x; y = P.y; } const z = floorAt(x, y, P.feet + 0.3);
    T.place(x, y, z, -P.yaw * Math.PI / 180); SFX.drop(); if (T.onDrop) T.onDrop(); }
  function drop(T) { T = T || S.carry; if (!T) return; if (T.noDrop) { think(val(T.noDrop)); return; } dropAt(T); S.lastLbl = null; }
  function take(T) { T = T || S.carry; if (!T || !has(T)) return null; unslot(T); return T; }   // used up / handed over (default: the thing in the hand)
  // ---- sitting, lying, riding: the camera goes to the seat; the walk keys stand up again (riding: only when the ride is over) ----
  function sit(o) { if (S.seat) return false; if (S.hold) endHold(false); o.back = o.back || [P.x, P.y, P.feet]; S.seat = o;
    tween(P.cam ? [P.cam.x, P.cam.y, P.cam.z] : [P.x, P.y, P.feet + P.eyeH], P.yaw, P.pitch, 0.55, o.yaw ?? P.yaw, o.pitch ?? 0); P.vz = 0; P.stance = 'stand'; P.air = false; S.lastLbl = null; S.lastSec = null; if (o.onSit) o.onSit(); markDirty(); return true; }
  function stand(force) { const s = S.seat; if (!s) return false; if (s.lock && !force) { if (s.lockMsg) think(val(s.lockMsg)); return true; } const e = seatEye();
    S.seat = null; P.x = s.back[0]; P.y = s.back[1]; P.feet = floorAt(P.x, P.y, s.back[2] + 0.3); tween(e, P.yaw, P.pitch, 0.4); if (s.onLeave) s.onLeave(); S.lastLbl = null; S.lastSec = null; markDirty(); return true; }
  function seatEye() { const s = S.seat; if (!s) return null; const f = s.follow ? s.follow() : null; return f ? [f.x, f.y, f.z] : [s.x, s.y, s.eye]; }
  function tween(from, yaw, pitch, dur, yaw1 = null, pitch1 = null) { S.tw = { from: from.slice(), yaw, pitch, t: 0, dur, yaw1, pitch1 }; }
  const lerpA = (a, b, k) => { let d = b - a; while (d > 180) d -= 360; while (d < -180) d += 360; return a + d * k; };
  function camUpdate(dt) { // P.cam: camera position override (seat / ride / tweens); P.x, P.y follow the seat so the ears and the neighbours know where I am
    let tgt = null; if (S.seat) { tgt = seatEye(); P.x = tgt[0]; P.y = tgt[1]; if (S.seat.follow) P.feet = floorAt(P.x, P.y, 0.5); }
    const tw = S.tw; if (tw) { tw.t += dt; const k0 = Math.min(1, tw.t / tw.dur), k = k0 * k0 * (3 - 2 * k0); const to = tgt || [P.x, P.y, P.feet + P.eyeH];
      P.cam = { x: tw.from[0] + (to[0] - tw.from[0]) * k, y: tw.from[1] + (to[1] - tw.from[1]) * k, z: tw.from[2] + (to[2] - tw.from[2]) * k };
      if (tw.yaw1 != null) { P.yaw = lerpA(tw.yaw, tw.yaw1, k); P.pitch = tw.pitch + (tw.pitch1 - tw.pitch) * k; }
      if (k0 >= 1) S.tw = null; markDirty(); return; }
    P.cam = tgt ? { x: tgt[0], y: tgt[1], z: tgt[2] } : null; }
  // ---- thoughts (no voice): a subtitle line in italics ----
  function think(text, ms) { if (!sb || !text) return; sb.textContent = text; sb.classList.add('think'); sb.hidden = false; clearTimeout(S.thinkT); S.thinkT = setTimeout(() => { sb.hidden = true; sb.classList.remove('think'); }, ms || Math.max(2600, text.length * 65)); }
  // ---- per frame (from the walk physics) ----
  function update(dt) { camUpdate(dt); if (HELD.tick(dt)) markDirty();
    HELD.sway += ((keys.size || joy.active) && !S.seat ? 1 : -1) * dt * 3; HELD.sway = Math.max(0, Math.min(1, HELD.sway)); if (HELD.obj && HELD.sway > 0 && HELD.sway < 1) markDirty();
    if (S.hold) { const h = S.hold; h.t += dt; let still = true; try { still = !!h.a.label(); } catch (e) { still = false; }
      if (Math.hypot(P.x - h.x, P.y - h.y) > (h.a.rMove || 0.9) || !still) endHold(false); else { try { h.a.work && h.a.work(Math.min(1, h.t / h.dur), dt); } catch (e) {} if (h.t >= h.dur) endHold(true); } }
    S.best = S.hold ? S.hold.a : pick(); ui(); }
  function ui() { if (!btn) return; const h = S.hold, a = S.best, ride = S.seat && S.seat.kind === 'ride', talking = !!NPCUI.cur();
    let txt = ''; if (P.mode === 'walk' && !talking && !ride) { if (h) txt = val(h.a.holdLabel) || (h.a.label() + ' …'); else if (S.seat && S.seat.primary) txt = val(S.seat.primaryLabel); else if (a) { try { txt = a.label() || ''; } catch (e) { txt = ''; } } }
    if (txt && !COARSE && !h) txt += '  ·  E'; else if (txt && h && h.g) txt += COARSE ? '  ·  tippen: Stopp' : '  ·  E: Stopp';
    if (txt !== S.lastLbl) { S.lastLbl = txt; btn.hidden = !txt; btn.textContent = txt; }
    btn.style.setProperty('--p', h ? Math.min(1, h.t / h.dur).toFixed(3) : '0'); btn.classList.toggle('busy', !!h); btn.classList.toggle('gauge', !!(h && h.g));
    if (h && h.g && btn.dataset.g !== h.g.lo + ',' + h.g.hi) { btn.dataset.g = h.g.lo + ',' + h.g.hi; btn.style.setProperty('--g0', h.g.lo); btn.style.setProperty('--g1', h.g.hi); }
    let t2 = ''; if (P.mode === 'walk' && !talking) { if (h) t2 = 'Abbrechen'; else if (S.seat) t2 = ride ? '' : (val(S.seat.leaveLabel) || 'Aufstehen'); else if (S.carry) t2 = val(S.carry.dropLabel) || (S.carry.name + ' ablegen'); else { const q = window.PLAY_SEC && PLAY_SEC(); if (q) t2 = q.label; } }
    if (t2 && !COARSE) t2 += '  ·  Q';
    if (b2 && t2 !== S.lastSec) { S.lastSec = t2; b2.hidden = !t2; b2.textContent = t2; } }
  btn?.addEventListener('click', () => primary()); b2?.addEventListener('click', () => secondary());
  // (V15: the action row and the subtitles sit above the bar of things; their places come from the style sheet)
  window.addEventListener('keydown', e => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || e.repeat) return; const k = e.key.toLowerCase();
    if (k === 'q') { if (P.mode === 'walk' && secondary()) e.preventDefault(); } });
  // ---- tapping a thing or a person in the picture does the same as the button ----
  const _v = new THREE.Vector3();
  function tap(e, ray) { if (P.mode !== 'walk' || S.hold || (typeof PLAN !== 'undefined' && PLAN.on)) return false; const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const list = []; for (const a of candidates()) { const p = val(a.pos); if (!p) continue; const d = Math.hypot(p[0] - P.x, p[1] - P.y); if (d > val(a.r) + 2.2) continue; let lbl; try { lbl = a.label(); } catch (er) { lbl = null; } if (!lbl) continue; list.push({ a, p, d }); }
    if (!list.length) return false;
    const objs = []; for (const c of list) { const o = c.a.obj ? c.a.obj() : (c.a.npc ? c.a.npc.fig.g : null); if (o && o.visible) { o.userData.pact = c.a; objs.push(o); } }
    let hit = null; if (objs.length) { const hs = ray.intersectObjects(objs, true); if (hs.length && hs[0].distance < 6) { let o = hs[0].object; while (o && !o.userData.pact) o = o.parent; if (o) hit = o.userData.pact; } }
    if (!hit) { let bd = 1e9; for (const c of list) { _v.copy(V(c.p[0], c.p[1], c.p[2])).project(cam); if (_v.z > 1) continue; const sx = (_v.x + 1) / 2 * r.width, sy = (1 - _v.y) / 2 * r.height, dd = Math.hypot(sx - mx, sy - my); if (dd < 80 && dd < bd) { bd = dd; hit = c.a; } } }
    if (!hit) return false; const c = list.find(q => q.a === hit); if (c.d > val(hit.r) + 0.3) { think('Dafür muss ich näher ran.'); return true; } return run(hit); }
  return { act, off, thing, things: THINGS, give, take, drop, dropAt, sit, stand, think, update, primary, secondary, tap, run, startHold,
    has, slotOf, select, toHand: hold, moveSlot, NB, inv: INV, onInv: f => invFns.push(f), clearInv() { for (const T of INV.slots) if (T) unslot(T); INV.sel = 0; showHand(true); },
    get carry() { return S.carry; }, get seat() { return S.seat; }, get hold() { return S.hold; }, get best() { return S.best; }, seated: () => !!S.seat, acts: () => ACTS, candidates };
})();
window.PLAY = PLAY;
