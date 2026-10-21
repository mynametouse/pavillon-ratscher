// ===================== V15 the player's own figure (third person, Mann or Frau): a rigged person whose motions come from an animation =====================
// library retargeted offline onto its skeleton (chars/player.html): standing, walking, jogging, sprinting, ducking, crawling, lying, jumping,
// sitting, carrying, chopping, kneeling … The thing in the hand sits in the right hand (tools), hangs from it (canister) or is held in both arms.
phase(null);
const AVATAR = (() => {
  const PM = window.PLAYERMAN || null;
  const A = { ready: false, failed: !PM, kind: 'm', fig: null, figs: {}, loading: {}, clips: null };
  try { const k = localStorage.getItem('pav-fig'); if (k === 'm' || k === 'f') A.kind = k; } catch (e) {}
  // ---- canonical bone names: Mixamo, Character Creator, 3ds Max Biped (Rocketbox), UE mannequin (Mesh2Motion, Quaternius) ----
  const CN = { Bip01_Pelvis: 'Hips', Bip01_Spine: 'Spine', Bip01_Spine1: 'Spine1', Bip01_Spine2: 'Spine2', Bip01_Neck: 'Neck', Bip01_Head: 'Head',
    pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', neck_01: 'Neck', head: 'Head', Head: 'Head' };
  for (const [b, u, S] of [['L', 'l', 'Left'], ['R', 'r', 'Right']]) {
    Object.assign(CN, { [`Bip01_${b}_Clavicle`]: S + 'Shoulder', [`Bip01_${b}_UpperArm`]: S + 'Arm', [`Bip01_${b}_Forearm`]: S + 'ForeArm', [`Bip01_${b}_Hand`]: S + 'Hand', [`Bip01_${b}_Thigh`]: S + 'UpLeg', [`Bip01_${b}_Calf`]: S + 'Leg', [`Bip01_${b}_Foot`]: S + 'Foot', [`Bip01_${b}_Toe0`]: S + 'ToeBase',
      [`clavicle_${u}`]: S + 'Shoulder', [`upperarm_${u}`]: S + 'Arm', [`lowerarm_${u}`]: S + 'ForeArm', [`hand_${u}`]: S + 'Hand', [`thigh_${u}`]: S + 'UpLeg', [`calf_${u}`]: S + 'Leg', [`foot_${u}`]: S + 'Foot', [`ball_${u}`]: S + 'ToeBase' });
    ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((f, i) => { for (let k = 0; k < 3; k++) { CN[`Bip01_${b}_Finger${i}${k ? k : ''}`] = `${S}Hand${f}${k + 1}`; CN[`${f.toLowerCase()}_0${k + 1}_${u}`] = `${S}Hand${f}${k + 1}`; } }); }
  const canonP = n => CN[n] || (n.startsWith('mixamorig') ? n.replace(/_\d+$/, '').replace(/^mixamorig:?/, '') : (CN[n.replace(/_\d+$/, '')] || boneCanon(n)));
  // ---- clips: per figure a compact set (bone names, int16 quaternions, hip positions) → three.js clips ----
  function b64(s, T) { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new T(u8.buffer); }
  function decode(c) { const q = b64(c.q, Int16Array), p = c.p ? b64(c.p, Float32Array) : null, n = c.n, nb = c.b.length, times = new Float32Array(n), tracks = [];
    for (let i = 0; i < n; i++) times[i] = Math.min(c.d, i / c.fps);
    for (let j = 0; j < nb; j++) { const v = new Float32Array(n * 4); for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) v[i * 4 + k] = q[(i * nb + j) * 4 + k] / 32767; tracks.push(new THREE.QuaternionKeyframeTrack(c.b[j] + '.quaternion', times, v)); }
    if (p && c.hb) tracks.push(new THREE.VectorKeyframeTrack(c.hb + '.position', times, p));
    const clip = new THREE.AnimationClip(c.name, c.d, tracks); clip.userData = { speed: c.speed || 0, loop: c.loop !== false }; return clip; }
  // ---- one figure ----
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
  function build(gl, set, o) {
    const model = gl.scene, g = new THREE.Group(), inner = new THREE.Group(); inner.rotation.y = Math.PI; g.add(inner); inner.add(model);   // models face +z, figures look along local -z
    const sc = prepModel(model, o.h); const B = {}; model.traverse(x => { if (x.isBone) { const c = canonP(x.name); if (c && !B[c]) B[c] = x; } });
    model.traverse(x => { if (x.isMesh) { x.frustumCulled = false; const ms = Array.isArray(x.material) ? x.material : [x.material]; for (const m of ms) if (m && /hair|lash|brow/i.test(m.name || '')) { m.alphaTest = Math.max(m.alphaTest || 0, 0.4); m.transparent = false; } } });
    const mixer = new THREE.AnimationMixer(model), acts = {}, clips = {};
    for (const [k, c] of Object.entries(set.clips)) { const clip = decode(c); clips[k] = clip; const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0); if (!clip.userData.loop) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } acts[k] = a; }
    const w = {}; for (const k of Object.keys(acts)) w[k] = 0;
    model.updateMatrixWorld(true);
    // the grip in the right hand, from the rest pose: fingers' direction, the line pinky → index (the handle runs along it), the palm
    const grip = (() => { const H = B.RightHand, M = B.RightHandMiddle1, I = B.RightHandIndex1, K = B.RightHandPinky1; if (!H) return null;
      const hp = H.getWorldPosition(new THREE.Vector3()), f = (M ? M.getWorldPosition(new THREE.Vector3()) : hp.clone().add(new THREE.Vector3(-0.08, 0, 0))).sub(hp), L = f.length(); f.normalize();
      let t = I && K ? I.getWorldPosition(new THREE.Vector3()).sub(K.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, 0, 1); t.addScaledVector(f, -t.dot(f)).normalize(); const n = new THREE.Vector3().crossVectors(f, t).normalize();
      const at = hp.clone().addScaledVector(f, L * 0.55).addScaledVector(n, -L * 0.18);   // inside the closed hand
      const W = new THREE.Matrix4().makeBasis(f, t, n).setPosition(at); return H.matrixWorld.clone().invert().multiply(W); })();   // bone space → grip frame (x fingers, y towards the thumb, z out of the back of the hand)
    const hipH = B.Hips ? B.Hips.getWorldPosition(new THREE.Vector3()).y : 0.95;
    // the lying pose: which way the body lies (head → hips) when the figure faces yaw 0 – lying down it is turned so the body runs along the view
    let lieTurn = 0; if (acts.lie && B.Head && B.Hips) { for (const [k, a] of Object.entries(acts)) a.setEffectiveWeight(k === 'lie' ? 1 : 0); mixer.update(0.01); g.updateMatrixWorld(true);
      const h = B.Head.getWorldPosition(new THREE.Vector3()), p = B.Hips.getWorldPosition(new THREE.Vector3()); lieTurn = -Math.atan2(p.x - h.x, -(p.z - h.z)) * 180 / Math.PI;
      for (const a of Object.values(acts)) a.setEffectiveWeight(0); }
    const self = { g, model, mixer, acts, clips, w, B, grip, hipH, scale: sc, set, sv: new Map(), t: 0, gest: null, look: 0, kind: o.kind, lieTurn };
    return self; }
  // ---- the state of motion → weights ----
  const LOCO = (F, sp) => { const s = { walk: F.clips.walk ? F.clips.walk.userData.speed : 1.4, jog: F.clips.jog ? F.clips.jog.userData.speed : 3.2, sprint: F.clips.sprint ? F.clips.sprint.userData.speed : 5.5 };
    if (sp < 0.12) return [['idle', 1, 1]];
    if (sp < s.walk * 1.25) { const k = Math.min(1, sp / 0.5); return [['walk', k, sp / s.walk], ['idle', 1 - k, 1]]; }
    if (sp < (s.walk * 1.25 + s.jog) / 2 + 0.3) { const a = s.walk * 1.25, b = (s.walk * 1.25 + s.jog) / 2 + 0.3, k = (sp - a) / (b - a); return [['walk', 1 - k, sp / s.walk], ['jog', k, sp / s.jog]]; }
    if (sp < s.jog * 1.15 || !F.acts.sprint) return [['jog', 1, sp / s.jog]];
    const k = Math.min(1, (sp - s.jog * 1.15) / Math.max(0.5, s.sprint - s.jog * 1.15)); return [['jog', 1 - k, sp / s.jog], ['sprint', k, sp / s.sprint]]; };
  function targets(F, dt) { const T = {}; const put = (k, v, ts) => { if (!F.acts[k]) return false; T[k] = (T[k] || 0) + v; if (ts != null) F.acts[k].timeScale = THREE.MathUtils.clamp(ts, 0.35, 1.8); return true; };
    const seat = PLAY.seat, sp = P.speed;
    if (seat) { const kind = seat.kind; if (kind === 'lie') put('lie', 1) || put('sit', 1); else if (kind === 'ride' && F.acts.sitRide) put('sitRide', 1); else put('sit', 1); return T; }
    if (F.gest && F.acts[F.gest.k]) { const g = F.gest, a = F.acts[g.k], d = a.getClip().duration / Math.max(0.1, a.timeScale), e = Math.min(1, g.t / 0.18, (d - g.t) / 0.25); if (g.t < d) { put(g.k, Math.max(0, e)); if (e >= 1) return T; } }
    if (P.air && (P.vz > 0.4 || (P.airT || 0) > 0.16)) { if (P.vz > 0.3 && (P.airT || 0) < 0.3 && F.acts.jumpStart) put('jumpStart', 1); else put('jumpLoop', 1) || put('idle', 1); return T; }
    if (P.landT > 0 && F.acts.jumpLand) { put('jumpLand', 1); return T; }
    const h = PLAY.hold; if (h && !sp) { const hk = (h.a.anim3 && (typeof h.a.anim3 === 'function' ? h.a.anim3() : h.a.anim3)) || 'interactLoop'; if (put(hk, 1) || put('interact', 1)) return T; }
    const st = P.stance;
    if (st === 'crouch') { if (sp > 0.08) put('crouchWalk', 1, sp / (F.clips.crouchWalk ? F.clips.crouchWalk.userData.speed || 1 : 1)); else put('crouchIdle', 1); return T; }
    if (st === 'crawl') { const c = F.acts.crawl; if (c) { put('crawl', 1); c.timeScale = sp > 0.04 ? THREE.MathUtils.clamp(sp / (F.clips.crawl.userData.speed || 0.35), 0.4, 1.8) : 0; } else put('crouchIdle', 1); return T; }
    if (st === 'prone') { put('lie', 1) || put('crouchIdle', 1); return T; }
    if (NPCUI.cur() && !sp && F.acts.talk) { put('talk', 0.55); put('idle', 0.45); return T; }
    for (const [k, v, ts] of LOCO(F, sp)) put(k, v, ts);
    return T; }
  // bones the arm pose of carrying (or holding a tool) replaces
  const ARM_R = ['RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'], ARM_L = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand'];
  const FING = s => ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap(f => [1, 2, 3].map(k => s + 'Hand' + f + k));
  function overlay(F, clipKey, t, bones, wt) { const clip = F.clips[clipKey]; if (!clip || wt <= 0) return; if (!F._ip) F._ip = {}; let ips = F._ip[clipKey]; const B = F.B;
    if (!ips) { ips = F._ip[clipKey] = {}; for (const tr of clip.tracks) { const nm = tr.name.split('.')[0], c = canonP(nm); if (c && tr.name.endsWith('.quaternion')) ips[c] = tr.createInterpolant(); } }
    for (const c of bones) { const ip = ips[c], b = B[c]; if (!ip || !b) continue; const r = ip.evaluate(t % clip.duration); _q.set(r[0], r[1], r[2], r[3]); b.quaternion.slerp(_q, wt); } }
  // ---- the thing in the hand ----
  const SOCK = new THREE.Group(); SOCK.matrixAutoUpdate = false; SOCK.userData.noMerge = true; scene.add(SOCK);
  function attach(F) { const H = HELD, obj = H.obj, third = CAM3.on && F && F.g.visible;
    if (!obj) return; if (!third) { if (obj.parent !== H.root) { H.root.add(obj); H.away = false; } return; }
    if (obj.parent !== SOCK) { SOCK.add(obj); H.away = true; } const T = PLAY.carry, mode = (T && T.carry3) || 'arms', B = F.B;
    obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.scale.setScalar((T && T.s3) || 1);
    if (mode === 'tool' && F.grip && B.RightHand) { _m.multiplyMatrices(B.RightHand.matrixWorld, F.grip); _m.decompose(_v, _q, _s); SOCK.matrix.compose(_v, _q, _v2.set(1, 1, 1));
      // the handle (the thing's +y) along the grip line, the hand at 'at' of the length from the lower end
      const g3 = (T && T.grip3) || {}; obj.quaternion.setFromEuler(new THREE.Euler(g3.rx || 0, g3.ry || 0, g3.rz || 0)); obj.position.set(0, -(g3.at ?? 0.12) * (g3.len || 0.7), 0).applyQuaternion(obj.quaternion); }
    else if (mode === 'side' && B.RightHand) { B.RightHand.getWorldPosition(_v); _q.setFromAxisAngle(_v2.set(0, 1, 0), -P.body * Math.PI / 180); const g3 = (T && T.grip3) || {}; _v.y -= g3.hang ?? 0.38; SOCK.matrix.compose(_v, _q, _s.set(1, 1, 1)); }
    else { if (!B.LeftHand || !B.RightHand) return; B.LeftHand.getWorldPosition(_v); B.RightHand.getWorldPosition(_v2); _v.add(_v2).multiplyScalar(0.5); const yaw = -P.body * Math.PI / 180; _q.setFromAxisAngle(_v2.set(0, 1, 0), yaw);
      const g3 = (T && T.grip3) || {}; _v2.set(0, g3.dy ?? -0.02, -(g3.fwd ?? 0.12)).applyQuaternion(_q); _v.add(_v2); if (g3.ry) _q.multiply(_q2.setFromAxisAngle(_s.set(0, 1, 0), g3.ry)); SOCK.matrix.compose(_v, _q, _s.set(1, 1, 1)); }
    SOCK.matrixWorldNeedsUpdate = true; SOCK.updateMatrixWorld(true); }
  // ---- per frame ----
  let lastDraw = 0;
  function update(dt) { const F = A.fig; if (!F) return; const show = CAM3.on && P.mode === "walk" && CAM3.cur > 0.85; if (F.g.visible !== show) { F.g.visible = show; markDirty(true); }
    if (!show) { attach(null); return; }
    // where the figure stands, and which way it faces
    const seat = PLAY.seat; let x = P.x, y = P.y, z = P.feet, yaw = P.body, want = null;
    if (seat) { const e = P.cam || { x: seat.x, y: seat.y, z: seat.eye }; yaw = P.body = seat.kind === 'ride' ? P.yaw : (seat.yaw ?? P.yaw); const fw = [Math.sin(yaw * Math.PI / 180), Math.cos(yaw * Math.PI / 180)];
      const M = F.set.meta || {}, sh = (M.sitHip && M.sitHip.y) || 0.59, lh = (M.lieHip && M.lieHip.y) || 0.07;
      if (seat.kind === 'lie') { x = e.x; y = e.y; z = (e.z - 0.62) + 0.1 - lh; want = { head: [e.x, e.y] }; yaw += F.lieTurn || 0; }   // head where the eye is, the body along the view
      else { x = e.x; y = e.y; z = (e.z - 0.78) + 0.11 - sh; want = { hips: [e.x - fw[0] * 0.04, e.y - fw[1] * 0.04] }; } }
    F.g.position.copy(V(x, y, z)); F.g.rotation.y = -yaw * Math.PI / 180;
    // weights toward the state's targets, then one mixer step
    const T = targets(F, dt), k = Math.min(1, dt * 9); let sum = 0;
    for (const n of Object.keys(F.w)) { const tw = T[n] || 0; F.w[n] += (tw - F.w[n]) * k; if (F.w[n] < 1e-3 && tw === 0) F.w[n] = 0; sum += F.w[n]; }
    for (const [n, a] of Object.entries(F.acts)) a.setEffectiveWeight(sum > 0 ? F.w[n] / sum : (n === 'idle' ? 1 : 0));
    if (F.gest) { F.gest.t += dt; const a = F.acts[F.gest.k]; if (!a || F.gest.t > a.getClip().duration / Math.max(0.1, a.timeScale) + 0.3) F.gest = null; }
    for (const [b, q] of F.sv) b.quaternion.copy(q); F.sv.clear();
    F.mixer.update(dt); F.t += dt;
    // arms: an armful in both arms, a tool held a little forward
    const C = PLAY.carry, mode = C ? (C.carry3 || 'arms') : null, base = !seat && !PLAY.hold && !F.gest && !P.air && P.stance !== 'crawl' && P.stance !== 'prone';
    if (base && mode === 'arms' && F.clips.walkCarry && !(F.w.walkCarry > 0.95)) overlay(F, 'walkCarry', F.acts.walkCarry ? F.acts.walkCarry.time : 0, [...ARM_L, ...ARM_R, ...FING('Left'), ...FING('Right')], 1);
    else if (base && mode === 'tool' && F.clips.holdTool) overlay(F, 'holdTool', F.t, [...ARM_R, ...FING('Right')], 1);
    else if (base && mode === 'side' && F.clips.holdTool) overlay(F, 'holdTool', 0, FING('Right'), 1);
    F.model.updateMatrixWorld(true);
    // seated or lying: the measured pose decides where the figure stands – the hips onto the seat, the head onto the pillow
    if (want) { const B = F.B;
      if (want.head && B.Head && B.Hips) { const h = B.Head.getWorldPosition(_v), p = B.Hips.getWorldPosition(_v2);
        F.g.position.x += V(want.head[0], want.head[1], 0).x - h.x; F.g.position.z += V(want.head[0], want.head[1], 0).z - h.z; }
      else if (want.hips && B.Hips) { const p = B.Hips.getWorldPosition(_v), t = V(want.hips[0], want.hips[1], 0); F.g.position.x += t.x - p.x; F.g.position.z += t.z - p.z; }
      F.g.updateMatrixWorld(true); }
    // the head follows the view a little (standing, not doing anything special)
    if (!seat && !F.gest && P.stance === 'stand' && F.B.Head) { let d = P.yaw - P.body; while (d > 180) d -= 360; while (d < -180) d += 360; const tgt = Math.abs(d) < 110 ? THREE.MathUtils.clamp(d, -60, 60) * Math.PI / 180 : 0; F.look += (tgt - F.look) * Math.min(1, dt * 4);
      if (Math.abs(F.look) > 0.01) { F.model.getWorldQuaternion(_q2).invert(); boneTurn(F.sv, _q2, F.B.Neck, 0, 1, 0, -F.look * 0.35); boneTurn(F.sv, _q2, F.B.Head, 0, 1, 0, -F.look * 0.45); } }
    attach(F);
    const now = performance.now(); if (now - lastDraw > (RENDER.hq ? 25 : 45)) { lastDraw = now; markDirty(); }
    if (F.gest || P.air || P.speed > 0.05 || Math.abs(P.eyeH - MOVE.STANCES[P.stance].eye) > 0.02) MOTION.lastMove = now; }   // bigger movements: smooth frames (the light-weight motion path), not the slow still frames
  window.TICKS.push(dt => { try { update(dt); } catch (e) { if (!A._err) { A._err = 1; console.warn('avatar', e); } } });
  // ---- one-shot gestures: picking something up, a hand movement, chopping ----
  function gesture(k, ts = 1) { const F = A.fig; if (!F || !F.acts[k] || !F.g.visible) return 0; const a = F.acts[k]; a.reset(); a.timeScale = ts; a.play(); F.gest = { k, t: 0 }; return a.getClip().duration / ts; }
  // ---- V15b protective gear on the figure: goggles, ear defenders, masks – meshes on the head bone, built once per figure ----
  const GM = { lens: new THREE.MeshStandardMaterial({ color: 0xd2e6ee, roughness: 0.06, transparent: true, opacity: 0.36, depthWrite: false }), frame: new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.5 }),
    cup: new THREE.MeshStandardMaterial({ color: 0xd8a21a, roughness: 0.45 }), band: new THREE.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.6 }), ffp: new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.85 }),
    mask: new THREE.MeshStandardMaterial({ color: 0x55595d, roughness: 0.55 }), filt: new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5 }), fk: new THREE.MeshStandardMaterial({ color: 0x3f8a3c, roughness: 0.5 }) };
  let WEARING = { eyes: null, ears: null, resp: null };
  function gearOf(F) { if (F.gear !== undefined) return F.gear; const H = F.B.Head; if (!H) return F.gear = null;
    // measured in the standing pose (after loading the skeleton may still hold the lying pose of the lieTurn measurement)
    for (const [k, a] of Object.entries(F.acts)) a.setEffectiveWeight(k === 'idle' ? 1 : 0); F.mixer.update(0); F.g.updateMatrixWorld(true); const hq = H.getWorldQuaternion(new THREE.Quaternion()), hs = H.getWorldScale(new THREE.Vector3()), gq = F.g.getWorldQuaternion(new THREE.Quaternion()), hp = H.getWorldPosition(new THREE.Vector3());
    const k = F.kind === 'f' ? 0.94 : 1, eye = new THREE.Vector3(0, 0.08 * k, -0.09 * k).applyQuaternion(gq).add(hp);
    const G = new THREE.Group(); G.position.copy(H.worldToLocal(eye)); G.quaternion.copy(hq.clone().invert().multiply(gq)); G.scale.setScalar(1 / (hs.x || 1)); H.add(G);
    const box = (par, x, y, z, sx, sy, sz, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); me.position.set(x, y, z); me.castShadow = true; par.add(me); return me; };
    const cylr = (par, x, y, z, r, h, m, rx = 0, rz = 0) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m); me.position.set(x, y, z); me.rotation.set(rx, 0, rz); me.castShadow = true; par.add(me); return me; };
    const it = {}; const mk = id => (it[id] = new THREE.Group(), G.add(it[id]), it[id].visible = false, it[id]);
    { const g = mk('brille'); box(g, 0, 0, -0.012, 0.15, 0.045, 0.006, GM.lens); box(g, 0, 0.024, -0.012, 0.152, 0.007, 0.01, GM.frame); for (const x of [-0.077, 0.077]) box(g, x, 0.018, 0.04, 0.005, 0.008, 0.11, GM.frame); }
    { const g = mk('korb'); box(g, 0, -0.004, -0.018, 0.17, 0.06, 0.012, GM.lens); box(g, 0, 0.028, -0.012, 0.172, 0.008, 0.024, GM.band); box(g, 0, -0.035, -0.012, 0.172, 0.008, 0.024, GM.band);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.006, 6, 28), GM.band); t.rotation.x = Math.PI / 2; t.position.set(0, 0.0, 0.07); t.scale.set(1, 1.15, 1); g.add(t); }
    { const g = mk('ohr'); for (const x of [-0.088, 0.088]) cylr(g, x, -0.025, 0.075, 0.04, 0.036, GM.cup, 0, Math.PI / 2);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.008, 6, 24, Math.PI), GM.band); t.position.set(0, -0.02, 0.075); g.add(t); }
    { const g = mk('ffp2'); const c = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GM.ffp); c.rotation.x = -Math.PI / 2; c.scale.set(1, 0.62, 0.95); c.position.set(0, -0.065, -0.03); c.castShadow = true; g.add(c);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.003, 4, 24), GM.ffp); t.rotation.x = Math.PI / 2; t.position.set(0, -0.06, 0.05); g.add(t); }
    { const g = mk('abek'); const c = new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GM.mask); c.rotation.x = -Math.PI / 2; c.scale.set(1, 0.7, 0.9); c.position.set(0, -0.07, -0.03); c.castShadow = true; g.add(c);
      for (const x of [-0.052, 0.052]) { cylr(g, x, -0.085, -0.07, 0.03, 0.028, GM.filt, Math.PI / 2 - 0.4, x < 0 ? 0.5 : -0.5); cylr(g, x * 1.08, -0.09, -0.09, 0.031, 0.008, GM.fk, Math.PI / 2 - 0.4, x < 0 ? 0.5 : -0.5); }
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.006, 4, 24), GM.band); t.rotation.x = Math.PI / 2; t.position.set(0, -0.05, 0.05); g.add(t); }
    return F.gear = it; }
  function wear(on) { WEARING = Object.assign({ eyes: null, ears: null, resp: null }, on || {}); for (const F of Object.values(A.figs)) applyGear(F); markDirty(true); }
  function applyGear(F) { const it = gearOf(F); if (!it) return; for (const [id, g] of Object.entries(it)) g.visible = WEARING.eyes === id || WEARING.ears === id || WEARING.resp === id; }
  // ---- loading ----
  const FL = new THREE.FileLoader(); FL.setResponseType('json'); const U = f => BASE + 'chars/' + f;
  async function load(kind) { if (A.figs[kind]) return A.figs[kind]; if (A.loading[kind]) return A.loading[kind];
    return A.loading[kind] = (async () => { const cf = PM['pclips_' + kind], file = PM['player_' + kind]; if (!cf || !file) throw new Error('keine Figur ' + kind); const set = await FL.loadAsync(U(cf));
      const gl = await CHL.loadAsync(U(file)); const F = build(gl, set, { h: set.h || (kind === 'f' ? 1.68 : 1.8), kind }); F.g.visible = false; scene.add(F.g); fsAdd(F, 1.05, 0.9); A.figs[kind] = F; try { applyGear(F); } catch (e) { console.warn('gear', e); } return F; })(); }
  async function setKind(k) { if (k !== 'm' && k !== 'f') return; A.kind = k; try { localStorage.setItem('pav-fig', k); } catch (e) {} if (window.HUD) HUD.refresh();
    if (!PM) return; try { const F = await load(k); if (A.kind !== k) return; if (A.fig && A.fig !== F) A.fig.g.visible = false; A.fig = F; A.ready = true; markDirty(true); if (window.HUD) { HUD.viewChanged(); HUD.refresh(); } }
    catch (e) { console.warn('Figur', e); if (!A.fig) A.failed = true; if (window.HUD) HUD.refresh(); } }
  if (PM && !QS.get('nofig')) whenLoaded(() => setTimeout(() => setKind(A.kind).then(() => { if (A.ready) setView3(CAM3.want, true); }), 900));
  return Object.assign(A, { setKind, gesture, update, load, canonP, wear });
})();
window.AVATAR = AVATAR;
