// ===================== V16b vehicles: getting in, driving, cameras, lights (VEH) =====================
// A vehicle = a model (vehicles/car.js, vehicles/tractor.js: VEH.add(spec, model)) + a spec (mass, axles, engine curve, gears, grip, body box).
// One is driven at a time: E at the driver's door gets in (a seat of the game layer, game/play.js: kind 'drive'), Q gets out (only when it
// stands). Physics (120 Hz): single-track model with tyre slip angles, saturating side forces and a friction circle per axle, weight
// transfer, a kinematic blend below walking pace; drive force from an engine torque curve through an automatic gearbox (GTA-style: the
// brake key reverses once it stands), brakes, handbrake (rear axle slides), rolling resistance and grip from the surface under the wheels
// (world/roads.js: asphalt … grass; off the roads meadow and field), air drag. The body stands on the four ground heights
// (ROADS.groundAt: terrain triangles, bridge decks) with spring-damped pitch and roll, short flights over crests.
// Collisions: the body box against building walls, trunks and bridge railings (world/worldcol.js), the garden's colliders (COL), the other
// vehicles and the neighbours – push-out plus an impulse with a little restitution and friction, a thud. Walkers bump into parked vehicles.
// Cameras: behind the vehicle (follows the heading; the mouse looks around and it swings back) or the driver's eyes – V or the mouse wheel,
// like walking. Lights: low beam as one spot light (always in the scene, intensity 0 when off: no shader recompiles), lamps glow;
// 'auto' after the sun (time/daynight.js). Keys while driving: W/S or arrows, A/D steer, Space handbrake, L light, H horn, Q out.
// Positions in localStorage 'pav-veh-v1'. Tests: VEH.auto = (v, dt) => ({ thr, brk, steer, hand }) overrides the keys; VEH.follow(route).
const VEH = (() => {
  const S = { list: [], by: {}, cur: null, auto: null, lights: 'auto', camT: 0, extra: [] };   // extra: boxes that are no vehicles of their own (V16d trailer)
  const LS = 'pav-veh-v1'; let saved = {}; try { saved = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) {}
  if (saved.lights === 'on' || saved.lights === 'off' || saved.lights === 'auto') S.lights = saved.lights;
  function save() { const o = { lights: S.lights }; for (const v of S.list) o[v.id] = [+v.st.x.toFixed(2), +v.st.y.toFixed(2), +v.st.psi.toFixed(4), ...(v.model.save ? v.model.save() : [])];
    try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }
  const GR = 9.81, HSTEP = 1 / 120, RHO = 1.2;
  // grip and rolling resistance by surface (world/roads.js SURF: asphalt, concrete, paving, gravel, earth, grass); off the road: meadow, field
  const MU = [1.0, 0.95, 0.85, 0.72, 0.62, 0.55], MU_OFF = 0.5, CRR = [0.012, 0.012, 0.016, 0.028, 0.045, 0.06], CRR_OFF = 0.085;
  const fwd = a => [Math.sin(a), Math.cos(a)], rgt = a => [Math.cos(a), -Math.sin(a)];
  const toW = (v, lx, ly) => { const s = v.st, f = fwd(s.psi), r = rgt(s.psi); return [s.x + r[0] * lx + f[0] * ly, s.y + r[1] * lx + f[1] * ly]; };
  const toL = (v, x, y) => { const s = v.st, f = fwd(s.psi), r = rgt(s.psi), dx = x - s.x, dy = y - s.y; return [dx * r[0] + dy * r[1], dx * f[0] + dy * f[1]]; };
  const lerp1 = (a, b, k) => a + (b - a) * Math.min(1, k);
  // the low beam of the vehicle whose lights are on (nearest to the camera)
  const beam = new THREE.SpotLight(0xfff0da, 0, 120, 0.52, 0.65, 1.25); beam.castShadow = false; scene.add(beam, beam.target);
  const dark = () => window.DN && DN.active ? !!(DN.state && DN.state.sunEl < 4) : (window.MODE_NOW === 'dusk' || window.MODE_NOW === 'night');
  // ---------------- registering a vehicle ----------------
  function add(spec, model) {
    const v = { id: spec.id, name: spec.name, spec, model, g: model.g, W: model.wheels.map(w => Object.assign({ gz: 0, surf: -1, comp: 0, spin: 0 }, w)),
      st: { x: 0, y: 0, psi: 0, u: 0, v: 0, r: 0, z: 0, vz: 0, air: false, pitch: 0, roll: 0, pv: 0, rv: 0, dp: 0, dr: 0, steer: 0, thr: 0, brk: 0, hand: true, gear: 1, rpm: 0, shiftT: 0, revT: 0,
        ax: 0, ay: 0, vzLP: 0, engine: false, sleep: 0, slip: 0, light: false, brakeOn: false, horn: false, zg: 0, pt: 0, rt: 0, moved: 0 } };
    const L = spec.a + spec.b; spec.L = L;
    const sv = saved[spec.id]; const B = boundsBox();
    if (sv && sv.length >= 3 && Number.isFinite(sv[0]) && Number.isFinite(sv[1]) && Number.isFinite(sv[2]) && sv[0] > B[0] && sv[0] < B[2] && sv[1] > B[1] && sv[1] < B[3]) { v.st.x = sv[0]; v.st.y = sv[1]; v.st.psi = sv[2]; if (typeof model.load === 'function') model.load(sv.slice(3)); v.placed = true; }   // V16b4: the car's model.load is its load space (an object, since V16b1) – calling it threw as soon as a position was saved and stopped the whole start
    else { const p = spec.home(); v.st.x = p[0]; v.st.y = p[1]; v.st.psi = p[2]; v.placed = !!p[3]; }
    scene.add(v.g); v.g.traverse(o => { if (o.isMesh) { o.userData.noMerge = true; if (o.castShadow === undefined) o.castShadow = true; } });
    S.list.push(v); S.by[v.id] = v;
    // getting in: the driver's door (left), or a tap on the vehicle
    PLAY.act({ id: 'veh:' + v.id, r: spec.reach || 2.3, prio: 0.55, obj: () => v.g, pos: () => { const p = toW(v, spec.door[0], spec.door[1]); return [p[0], p[1], v.st.z + 1.0]; },
      label: () => !S.cur && !PLAY.seated() ? (spec.enterLabel || 'Einsteigen') : null, run: () => enter(v) });
    pose(v); return v; }
  // where the vehicles may go: the 10 m terrain (the drivable square), else the near ground
  const TI = GEO_REAL && window.GEOMAN && GEOMAN.terrain && GEOMAN.terrain.inner, BOX = TI ? [TI.x0 + 12, TI.y0 + 12, TI.x0 + (TI.n - 1) * TI.step - 12, TI.y0 + (TI.n - 1) * TI.step - 12] : [-112, -112, 112, 112];
  const boundsBox = () => BOX;
  // ---------------- ground under the wheels: height at the centre of mass, pitch and roll of the ground, surface per wheel ----------------
  function groundPose(v) { const s = v.st, sp = v.spec, zq = s.z + 0.7;
    for (const w of v.W) { const p = toW(v, w.x, w.y); w.gz = ROADS.groundAt(p[0], p[1], zq); const r = ROADS.at(p[0], p[1]); w.surf = r && r.e > -0.1 ? r.surf : -1; }
    const [fl, fr, rl, rr] = v.W, zf = (fl.gz + fr.gz) / 2, zr = (rl.gz + rr.gz) / 2, zL = (fl.gz + rl.gz) / 2, zR = (fr.gz + rr.gz) / 2;
    s.pt = Math.atan2(zf - zr, sp.L); s.rt = Math.atan2(zL - zR, sp.track); s.zg = zr + (zf - zr) * sp.b / sp.L; }
  const muOf = (v, i, j) => { const k = w => w.surf < 0 ? MU_OFF * (v.spec.offGrip || 1) : MU[w.surf] * (w.surf >= 3 ? (v.spec.offGrip || 1) * 0.95 : 1); return (k(v.W[i]) + k(v.W[j])) / 2 * v.spec.mu; };
  const crrOf = v => { let c = 0; for (const w of v.W) c += w.surf < 0 ? CRR_OFF * (v.spec.offRoll || 1) : CRR[w.surf]; return c / 4; };
  // ---------------- engine and gearbox ----------------
  function torque(sp, rpm) { const c = sp.eng.curve; if (rpm <= c[0][0]) return c[0][1]; for (let i = 1; i < c.length; i++) if (rpm <= c[i][0]) { const [a, ta] = c[i - 1], [b, tb] = c[i]; return ta + (tb - ta) * (rpm - a) / (b - a); } return 0; }
  const ratio = (sp, g) => (g > 0 ? sp.gears[g - 1] : -sp.rev) * sp.final;
  // ---------------- one physics step ----------------
  function step(v, h, inp) { const s = v.st, sp = v.spec, m = sp.mass, a = sp.a, b = sp.b, L = sp.L;
    groundPose(v);
    // vertical: the body rides the ground (rising at most 3 m/s, so a wheel out of a ditch lifts it smoothly); where the ground falls away
    // faster than gravity pulls (a crest at speed, a wheel over a ditch) it flies until it meets the ground again
    if (!s.air) { const vzg = THREE.MathUtils.clamp((s.zg - s.z) / h, -8, 8);
      if (vzg < s.vzLP - GR * h * 1.3 && Math.hypot(s.u, s.v) > 3 && s.zg < s.z - 0.02) { s.air = true; s.vz = Math.min(s.vzLP, 3); }
      else { s.vzLP = lerp1(s.vzLP || 0, vzg, 0.2); s.z = s.zg > s.z ? Math.min(s.zg, s.z + 3 * h) : s.zg; s.vz = s.vzLP; } }
    if (s.air) { s.vz -= GR * h; s.z += s.vz * h; if (s.z <= s.zg) { if (s.vz < -2.5) VSND.thud(v, Math.min(1, -s.vz / 7)); s.z = s.zg; s.vz = 0; s.vzLP = 0; s.air = false; } }
    // controls: steering with a rate and less lock at speed; the brake key reverses once the vehicle stands (and the other way round)
    const spd = Math.abs(s.u), lock = sp.steerMax / (1 + (spd / sp.steerV) * (spd / sp.steerV)), want = THREE.MathUtils.clamp(inp.steer, -1, 1) * lock;
    const rate = (Math.abs(want) < Math.abs(s.steer) || want * s.steer < 0 ? sp.steerBack : sp.steerRate) * h; s.steer += THREE.MathUtils.clamp(want - s.steer, -rate, rate);
    let thr = 0, brk = 0; const fK = inp.thr, bK = inp.brk;
    if (s.gear > 0) { if (bK > 0 && fK === 0 && s.u < 0.35) { s.revT += h; if (s.revT > 0.25) { s.gear = -1; s.revT = 0; } } else s.revT = 0; thr = fK; brk = s.u > 0.35 || fK > 0 ? bK : 0; if (s.u < -0.35) { brk = Math.max(brk, fK); thr = s.u < -1 ? 0 : thr; } }
    else { if (fK > 0 && bK === 0 && s.u > -0.35) { s.revT += h; if (s.revT > 0.15) { s.gear = 1; s.revT = 0; } } else s.revT = 0; thr = bK; brk = s.u < -0.35 || bK > 0 ? fK : 0; if (s.u > 0.35) { brk = Math.max(brk, bK); thr = 0; } }
    if (!s.engine) thr = 0;
    s.thr = lerp1(s.thr, thr, h * 8); s.brk = brk; s.hand = !!inp.hand; s.brakeOn = brk > 0.05 || (s.hand && spd > 0.3);
    // engine speed through the gear (clutch slipping below idle, launch revs), automatic shifting
    const wrpm = s.u / sp.rw * 60 / (2 * Math.PI); let erpm = Math.abs(wrpm * ratio(sp, s.gear));
    // no hunting: up only into a gear that stays clear of the downshift point and only while it still pulls (or at the red line, or with
    // room to spare), down only after a moment in the gear – the speed lost during a shift (no drive) once dropped a tractor uphill on a soft
    // track straight back into first, again and again; nearly standing: first gear
    if (s.gear > 0 && !s.air) { s.inGear = (s.inGear || 0) + h;
      if (s.gear > 1 && spd < 0.3) { s.gear = 1; s.inGear = 0; }
      else if (s.shiftT <= 0) { const dn = sp.downAt(s.thr), nx = s.gear < sp.gears.length ? erpm * ratio(sp, s.gear + 1) / ratio(sp, s.gear) : 0;
        if (nx && erpm > sp.upAt(s.thr) && nx > dn * 1.05 && (s.ax > 0.1 || erpm > sp.eng.red - 120 || nx > dn * 1.35)) { s.gear++; s.shiftT = sp.shift; s.inGear = 0; }
        else if (s.gear > 1 && erpm < dn && s.inGear > 1.2) { s.gear--; s.shiftT = sp.shift * 0.7; s.inGear = 0; } } }
    if (s.shiftT > 0) s.shiftT -= h;
    const launch = sp.eng.idle + s.thr * (sp.eng.launch - sp.eng.idle), slip = erpm < launch, rpmEff = slip ? launch : erpm;
    s.rpm = lerp1(s.rpm, s.engine ? Math.min(sp.eng.red, Math.max(sp.eng.idle, rpmEff)) : 0, h * (slip ? 6 : 14));
    let Fdrive = 0; if (s.engine && s.shiftT <= 0 && rpmEff < sp.eng.red + 50 && !(s.gear < 0 && erpm > (sp.revRpm || 3600))) { const T = torque(sp, rpmEff) * s.thr - (s.thr < 0.05 && !slip ? sp.eng.drag * Math.min(1, erpm / 3000) : 0); Fdrive = T * ratio(sp, s.gear) * sp.eff / sp.rw; }   // reverse: kept slow
    // axle loads (weight transfer from the last acceleration), grip
    const cosP = Math.cos(s.pt), Fz = m * GR * cosP, Fzf = Math.max(0.12 * Fz, Fz * b / L - m * s.ax * sp.hcg / L), Fzr = Math.max(0.12 * Fz, Fz - Fzf);
    const muF = muOf(v, 0, 1), muR = muOf(v, 2, 3), crr = crrOf(v), mF = m * b / L, mR = m * a / L;
    const cd = Math.cos(s.steer), sd = Math.sin(s.steer), vf = s.v + a * s.r, vr = s.v - b * s.r;
    const ufw = s.u * cd + vf * sd, vfw = -s.u * sd + vf * cd, urw = s.u, vrw = vr;
    let Fxf = 0, Fyf = 0, Fxr = 0, Fyr = 0;
    if (!s.air) {
      const side = (vw, uw, C, cap, mAx) => { const al = Math.atan2(vw, Math.abs(uw) + 0.6); let F = -cap * Math.tanh(C * al / Math.max(cap, 1)); const stop = mAx * Math.abs(vw) / h; return THREE.MathUtils.clamp(F, -stop, stop); };
      const along = (uw, Fd, Fb, Frr, mAx) => { let F = Fd; const res = (Fb + Frr) * Math.sign(uw); const stop = mAx * Math.abs(uw) / h; F -= Math.sign(res) * Math.min(Math.abs(res), stop + Math.abs(Fd)); return F; };
      const split = sp.split, Fbf = s.brk * sp.brake * sp.brakeF, Fbr = s.brk * sp.brake * (1 - sp.brakeF);
      Fxf = along(ufw, Fdrive * split, Fbf, crr * Fzf, mF); Fxr = along(urw, Fdrive * (1 - split), Fbr, crr * Fzr, mR);
      Fyf = side(vfw, ufw, sp.Cf, muF * Fzf, mF); Fyr = side(vrw, urw, sp.Cr, muR * Fzr, mR);
      if (s.hand && sp.hand) { const capR = muR * Fzr * 0.85; Fxr = -Math.sign(urw) * Math.min(capR, mR * Math.abs(urw) / h); Fyr *= 0.35; }
      // friction circles: what the tyres cannot carry, they slide (and squeal)
      const circ = (Fx, Fy, cap) => { const t = Math.hypot(Fx, Fy); return t > cap && t > 1e-6 ? cap / t : 1; };
      const kf = circ(Fxf, Fyf, muF * Fzf * 1.05), kr = circ(Fxr, Fyr, muR * Fzr * 1.05); Fxf *= kf; Fyf *= kf; Fxr *= kr; Fyr *= kr;
      s.slip = Math.max(1 - kf, 1 - kr, s.hand && spd > 2 ? 0.6 : 0, Math.abs(Math.atan2(vrw, Math.abs(urw) + 0.6)) > 0.12 && spd > 4 ? 0.5 : 0) * (spd > 1.5 ? 1 : 0); }
    else s.slip = 0;
    // forces in the body frame: tyres, air, slope
    const drag = 0.5 * RHO * sp.cdA, Fu = Fxf * cd - Fyf * sd + Fxr - drag * s.u * Math.abs(s.u) - m * GR * Math.sin(s.pt), Fv = Fxf * sd + Fyf * cd + Fyr - drag * 3 * s.v * Math.abs(s.v) + m * GR * Math.sin(s.rt) * (s.air ? 0 : 1);
    // V16d: a trailer behind (vehicles/trailer.js): its mass and load are pulled along – rolling resistance, the slope, its brakes (overrun brake) and its inertia
    const mt = sp.tow ? sp.tow() : 0; let FuT = Fu;
    if (mt > 0 && !s.air) { const sg = Math.sign(s.u), res = (0.03 + s.brk * 0.45) * mt * GR, stop = (m + mt) * Math.abs(s.u) / h; FuT = Fu - mt * GR * Math.sin(s.pt) - sg * Math.min(res, stop + Math.abs(Fu)); }
    const du = FuT / (m + mt) + s.v * s.r, dv = Fv / m - s.u * s.r, dr = s.air ? -s.r * 0.5 : (a * (Fxf * sd + Fyf * cd) - b * Fyr) / sp.Iz;
    s.u += du * h; s.v += dv * h; s.r += dr * h;
    // below walking pace the vehicle follows its wheels (no slip): yaw from the steering, the rear axle without side motion
    if (!s.air && !s.hand) { const kin = Math.max(0, 1 - spd / 2.2); if (kin > 0) { const rK = s.u * Math.tan(s.steer) / L; s.r += (rK - s.r) * kin; s.v += (b * rK - s.v) * kin; } }
    if (!s.air && s.brk > 0.5 && spd < 0.08 && s.thr < 0.05) { s.u = 0; s.v = 0; s.r = 0; }   // held
    if (!s.air && !s.engine && spd < 0.05) { s.u = 0; s.v = 0; s.r = 0; }   // parked: the handbrake holds it
    s.ax = lerp1(s.ax, du - s.v * s.r, h * 10); s.ay = lerp1(s.ay, dv + s.u * s.r, h * 10);
    s.psi += s.r * h; const f = fwd(s.psi), rg = rgt(s.psi); s.x += (s.u * f[0] + s.v * rg[0]) * h; s.y += (s.u * f[1] + s.v * rg[1]) * h;
    // body: pitch and roll of the ground (spring-damped) plus a little dive, squat and lean
    const kS = sp.susp || 60, dS = sp.suspD || 13;
    s.pv += (kS * (s.pt - s.pitch) - dS * s.pv) * h; s.pitch += s.pv * h; s.rv += (kS * (s.rt - s.roll) - dS * s.rv) * h; s.roll += s.rv * h;
    s.dp = lerp1(s.dp, THREE.MathUtils.clamp(-s.ax * sp.dive, -0.06, 0.06), h * 6); s.dr = lerp1(s.dr, THREE.MathUtils.clamp(-s.ay * sp.lean, -0.07, 0.07), h * 5);
    // the edge of the map: a soft stop
    const B = boundsBox(); if (s.x < B[0] || s.x > B[2] || s.y < B[1] || s.y > B[3]) { s.x = THREE.MathUtils.clamp(s.x, B[0], B[2]); s.y = THREE.MathUtils.clamp(s.y, B[1], B[3]); s.u *= 0.3; s.v *= 0.3; if (v === S.cur && performance.now() - (S.edgeT || 0) > 4000) { S.edgeT = performance.now(); PLAY.think('Hier endet die Karte.'); } }
    for (const w of v.W) w.spin += (w.lock && s.hand ? 0 : s.u / w.r) * h; }
  // ---------------- collisions ----------------
  // a box: centre c, unit axes ax (right) and ay (forward), half extents ex, ey
  const boxOf = (v, grow = 0) => { const s = v.st, B = v.spec.box, f = fwd(s.psi), r = rgt(s.psi); return { c: [s.x + f[0] * B.cy, s.y + f[1] * B.cy], ax: r, ay: f, ex: B.hw + grow, ey: B.hl + grow }; };
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
  const corners = b => [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => [b.c[0] + b.ax[0] * b.ex * i + b.ay[0] * b.ey * j, b.c[1] + b.ax[1] * b.ex * i + b.ay[1] * b.ey * j]);
  const inBox = (b, p, pad = 0.02) => { const d = [p[0] - b.c[0], p[1] - b.c[1]]; return Math.abs(dot(d, b.ax)) <= b.ex + pad && Math.abs(dot(d, b.ay)) <= b.ey + pad; };
  // separating axes: depth and normal (from B towards A), contact point
  function sat(A, B) { let best = 1e9, n = null;
    for (const ax of [A.ax, A.ay, B.ax, B.ay]) { const rA = A.ex * Math.abs(dot(A.ax, ax)) + A.ey * Math.abs(dot(A.ay, ax)), rB = B.ex * Math.abs(dot(B.ax, ax)) + B.ey * Math.abs(dot(B.ay, ax)), d = dot(A.c, ax) - dot(B.c, ax), o = rA + rB - Math.abs(d);
      if (!(o > 0)) return null; if (o < best) { best = o; n = d >= 0 ? ax : [-ax[0], -ax[1]]; } }
    const cA = corners(A).filter(p => inBox(B, p)), cB = corners(B).filter(p => inBox(A, p)); const pts = cA.length ? cA : cB.length ? cB : [[(A.c[0] + B.c[0]) / 2, (A.c[1] + B.c[1]) / 2]];
    const pc = pts.reduce((q, p) => [q[0] + p[0] / pts.length, q[1] + p[1] / pts.length], [0, 0]); return { n, d: best, p: pc }; }
  function circBox(A, cx, cy, rad) { const d = [cx - A.c[0], cy - A.c[1]], lx = dot(d, A.ax), ly = dot(d, A.ay), qx = THREE.MathUtils.clamp(lx, -A.ex, A.ex), qy = THREE.MathUtils.clamp(ly, -A.ey, A.ey);
    const ex = lx - qx, ey = ly - qy, dd = Math.hypot(ex, ey);
    if (!(dd <= rad)) return null; const p = [A.c[0] + A.ax[0] * qx + A.ay[0] * qy, A.c[1] + A.ax[1] * qx + A.ay[1] * qy];
    if (dd > 1e-6) { const wx = (A.ax[0] * ex + A.ay[0] * ey) / dd, wy = (A.ax[1] * ex + A.ay[1] * ey) / dd; return { n: [-wx, -wy], d: rad - dd, p }; }
    const ox = A.ex - Math.abs(lx), oy = A.ey - Math.abs(ly); return ox < oy ? { n: [-A.ax[0] * Math.sign(lx || 1), -A.ax[1] * Math.sign(lx || 1)], d: ox + rad, p } : { n: [-A.ay[0] * Math.sign(ly || 1), -A.ay[1] * Math.sign(ly || 1)], d: oy + rad, p }; }
  // impulse at the contact point (n: push direction for v); o: the other vehicle (or null = fixed)
  function resolve(v, hit, o, e = 0.18) { const s = v.st, mA = v.spec.mass, IA = v.spec.Iz; let share = 1;
    if (o) share = o.spec.mass / (mA + o.spec.mass);
    s.x += hit.n[0] * hit.d * share; s.y += hit.n[1] * hit.d * share; if (o) { o.st.x -= hit.n[0] * hit.d * (1 - share); o.st.y -= hit.n[1] * hit.d * (1 - share); }
    const vel = q => { const f = fwd(q.st.psi), r = rgt(q.st.psi); return [q.st.u * f[0] + q.st.v * r[0], q.st.u * f[1] + q.st.v * r[1]]; };
    const ptv = (q, p) => { const w = vel(q), rx = p[0] - q.st.x, ry = p[1] - q.st.y; return [w[0] + q.st.r * ry, w[1] - q.st.r * rx]; };
    const va = ptv(v, hit.p), vb = o ? ptv(o, hit.p) : [0, 0], rel = [va[0] - vb[0], va[1] - vb[1]], vn = dot(rel, hit.n); if (vn >= 0) return 0;
    const cr = (q, p, n) => (p[0] - q.st.x) * n[1] - (p[1] - q.st.y) * n[0];
    const kk = n => 1 / mA + cr(v, hit.p, n) ** 2 / IA + (o ? 1 / o.spec.mass + cr(o, hit.p, n) ** 2 / o.spec.Iz : 0);
    const j = -(1 + e) * vn / kk(hit.n), t = [-hit.n[1], hit.n[0]], vt = dot(rel, t), jt = THREE.MathUtils.clamp(-vt / kk(t), -0.45 * j, 0.45 * j);
    const apply = (q, sg) => { const w = vel(q), J = [(hit.n[0] * j + t[0] * jt) * sg, (hit.n[1] * j + t[1] * jt) * sg]; w[0] += J[0] / q.spec.mass; w[1] += J[1] / q.spec.mass;
      q.st.r -= ((hit.p[0] - q.st.x) * J[1] - (hit.p[1] - q.st.y) * J[0]) / q.spec.Iz; const f = fwd(q.st.psi), r = rgt(q.st.psi); q.st.u = dot(w, f); q.st.v = dot(w, r); q.st.sleep = 0; };
    apply(v, 1); if (o) apply(o, -1); return j / mA; }
  // hits of a box (centre c, unit axes ax/ay, half extents ex/ey; from z0 to z1 above the ground) against the world: walls, trunks and railings
  // (WCOL), the garden's colliders, the other vehicles (not skip), Hubert's tractor, the neighbours and the extra boxes (V16d trailers: S.extra)
  function boxHits(A, z0, z1, skip) { const R = Math.hypot(A.ex, A.ey) + 0.6, hits = [];
    WCOL.each(A.c[0] - R, A.c[1] - R, A.c[0] + R, A.c[1] + R, (i, Q) => { const ax = Q[i * 4], ay = Q[i * 4 + 1], bx = Q[i * 4 + 2], by = Q[i * 4 + 3], L = Math.hypot(bx - ax, by - ay); if (L < 0.05) return;
        const u = [(bx - ax) / L, (by - ay) / L], h = sat(A, { c: [(ax + bx) / 2, (ay + by) / 2], ax: [-u[1], u[0]], ay: u, ex: 0.12, ey: L / 2 }); if (h) hits.push([h, null]); },
      (i, Q) => { const h = circBox(A, Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]); if (h) hits.push([h, null]); });
    if (Math.abs(A.c[0]) < 140 && Math.abs(A.c[1]) < 140 && typeof CG !== 'undefined' && CG) {   // the garden's colliders (fences, sheds, trees, machines …)
      const seen = new Set(); for (let gx = A.c[0] - R; gx <= A.c[0] + R; gx += CG.cs) for (let gy = A.c[1] - R; gy <= A.c[1] + R; gy += CG.cs) for (const i of cellItems(CG, gx, gy)) seen.add(i);
      for (const i of seen) { const c = COL[i]; if (!phOk(c) || c[5] <= z0 || c[4] >= z1) continue; const r9 = c[9]; if ((r9 && c[6] === 'house') || c[6] === 'tractor') continue;   // the village's footprint boxes (the walls themselves are in WCOL), Hubert's parked tractor (below, where it really is)
        const B = r9 ? { c: toWorld(c, (c[0] + c[1]) / 2, (c[2] + c[3]) / 2), ax: [r9.c, r9.s], ay: [-r9.s, r9.c], ex: (c[1] - c[0]) / 2, ey: (c[3] - c[2]) / 2 } : { c: [(c[0] + c[1]) / 2, (c[2] + c[3]) / 2], ax: [1, 0], ay: [0, 1], ex: (c[1] - c[0]) / 2, ey: (c[3] - c[2]) / 2 };
        const h = sat(A, B); if (h) hits.push([h, null]); } }
    for (const o of S.list) { if (o === skip) continue; const h = sat(A, boxOf(o)); if (h) hits.push([h, o]); }
    for (const x of S.extra) { if (x.tow && x.tow === skip) continue; const B = x.box(); if (!B || z1 < B.z0 || z0 > B.z1) continue; const h = sat(A, B); if (h) hits.push([h, null]); }   // a trailer: fixed for the others
    if (typeof TRACTOR !== 'undefined' && TRACTOR.g) { const tp = TRACTOR.g.position, az = -TRACTOR.g.rotation.y, f = fwd(az), r = rgt(az);   // Hubert's old tractor, parked or on its round
      const h = sat(A, { c: [tp.x + f[0] * 0.35, -tp.z + f[1] * 0.35], ax: r, ay: f, ex: 0.98, ey: 1.45 }); if (h) hits.push([h, null]); }
    if (window.NPCS) for (const w of [NPCS.hubert, NPCS.ronald]) { if (!w || !w.fig || !w.fig.g.visible || w.drive) continue; const h = circBox(A, w.x, w.y, 0.32); if (h) hits.push([h, null]); }
    return hits; }
  function collide(v) { const s = v.st, hits = boxHits(boxOf(v), s.z + 0.25, s.z + v.spec.box.h, v);
    let big = 0; for (const [h, o] of hits) { const dv = resolve(v, h, o); if (dv > big) big = dv; }
    if (big > 1.4 && v === S.cur) VSND.thud(v, Math.min(1, big / 9)); return hits.length; }
  // something in the way of Hubert's tractor round (npc/npc.js): a vehicle within reach ahead of (x, y) in the direction az
  S.blocked = (x, y, az, ahead) => { const px = x + Math.sin(az) * ahead, py = y + Math.cos(az) * ahead; for (const v of S.list) if (circBox(boxOf(v), px, py, 1.5)) return true; return false; };
  // walkers bump into parked vehicles (game/game.js collide)
  S.pushWalker = (p, rad, feet) => { for (const v of S.list) { if (v === S.cur) continue; if (feet != null && feet > v.st.z + v.spec.box.h - 0.2) continue; const h = circBox(boxOf(v), p[0], p[1], rad); if (!h) continue; p[0] -= h.n[0] * h.d; p[1] -= h.n[1] * h.d; }
    for (const x of S.extra) { if (x.noWalk) continue; const B = x.box(); if (!B || (feet != null && feet > B.z1 - 0.2)) continue; const h = circBox(B, p[0], p[1], rad); if (h) { p[0] -= h.n[0] * h.d; p[1] -= h.n[1] * h.d; } } };
  // ---------------- pose of the model ----------------
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function pose(v, dt = 0) { const s = v.st, sp = v.spec, g = v.g;
    if (!v.placed) { groundPose(v); s.z = s.zg; s.pitch = s.pt; s.roll = s.rt; v.placed = true; }
    g.position.copy(V(s.x, s.y, s.z)); _e.set(s.pitch, -s.psi, -s.roll, 'YXZ'); g.quaternion.setFromEuler(_e);
    if (v.model.body) { v.model.body.rotation.x = s.dp; v.model.body.rotation.z = -s.dr; }
    // wheels: each on its own ground (spring travel), steering and rolling
    const cp = Math.cos(s.pitch), sr = Math.sin(s.roll);
    for (const w of v.W) { const zPlane = s.z + Math.sin(s.pitch) * w.y - sr * w.x, comp = THREE.MathUtils.clamp((w.gz - zPlane) * cp, -sp.travel, sp.travel); w.comp = lerp1(w.comp, comp, 0.5);
      w.piv.position.y = w.r + w.comp; if (w.steer) w.piv.rotation.y = -s.steer * (w.steer || 1); w.node.rotation.x = -w.spin; }
    if (v.model.update) v.model.update(v, dt); }
  // ---------------- lights ----------------
  const lightsOn = v => v.st.engine && (S.lights === 'on' || (S.lights === 'auto' && dark()));
  function lamps(v) { const on = lightsOn(v), M = v.model.lamps; if (!M) return;
    const set = (list, k) => { for (const m of list || []) { const want = k * (m.userData.k || 1); if (Math.abs(m.emissiveIntensity - want) > 1e-3) { m.emissiveIntensity = want; markDirty(); } } };
    set(M.head, on ? 3.2 : 0); set(M.tail, on ? 1.6 : 0); set(M.brake, v.st.brakeOn && v.st.engine ? 3.2 : on ? 1.2 : 0); set(M.rev, v.st.gear < 0 && v.st.engine ? 2.4 : 0); }
  function beamUpdate() { let best = null, bd = 1e9; for (const v of S.list) { if (!lightsOn(v)) continue; const d = Math.hypot(v.st.x - cam.position.x, v.st.y + cam.position.z); if (d < bd) { bd = d; best = v; } }
    if (!best || bd > 400) { if (beam.intensity !== 0) { beam.intensity = 0; markDirty(); } return; }
    const sp = best.spec, p = best.model.beam || [0, sp.box.cy + sp.box.hl - 0.2, 0.7], w = toW(best, p[0], p[1]), t = toW(best, p[0], p[1] + 30), s = best.st;
    beam.position.copy(V(w[0], w[1], s.z + p[2] + Math.sin(s.pitch) * p[1])); beam.target.position.copy(V(t[0], t[1], s.z + p[2] - 0.9 + Math.sin(s.pitch) * (p[1] + 30))); beam.target.updateMatrixWorld();
    beam.intensity = sp.beam || 260; beam.angle = sp.beamAngle || 0.52; }
  // ---------------- getting in and out ----------------
  function eyeW(v) { const s = v.st, e = v.spec.eye, p = toW(v, e[0], e[1]); return { x: p[0], y: p[1], z: s.z + e[2] + Math.sin(s.pitch) * e[1] - Math.sin(s.roll) * e[0] }; }
  function exitPos(v) { const s = v.st, sp = v.spec, B = sp.box;
    const cands = [[-(B.hw + 0.55), sp.eye[1]], [B.hw + 0.55, sp.eye[1]], [0, B.cy - B.hl - 0.7], [0, B.cy + B.hl + 0.7], [-(B.hw + 0.55), sp.eye[1] - 1.4], [B.hw + 0.55, sp.eye[1] + 1.2]];
    for (const [lx, ly] of cands) { const p = toW(v, lx, ly), q = p.slice(); if (window.WCOL) WCOL.pushCircle(q, 0.3); if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.05) continue;
      const gz = ROADS.groundAt(p[0], p[1], s.z + 0.5); if (Math.abs(gz - s.z) > 1.2) continue; if (typeof blocked === 'function' && blocked(p[0], p[1], gz)) continue; return [p[0], p[1], gz]; }
    const p = toW(v, -(B.hw + 0.55), sp.eye[1]); return [p[0], p[1], ROADS.groundAt(p[0], p[1], s.z + 0.5)]; }
  function enter(v) { if (S.cur || PLAY.seated()) return;
    const seat = { kind: 'drive', drive: v, keepKeys: true, pitch: -4, get yaw() { return v.st.psi * 180 / Math.PI; }, follow: () => eyeW(v),
      get lock() { return Math.hypot(v.st.u, v.st.v) > 1.5; }, lockMsg: 'Erst anhalten.', get back() { return exitPos(v); }, set back(x) {},
      primary: () => toggleLights(), primaryLabel: '', get leaveLabel() { return Math.hypot(v.st.u, v.st.v) > 1.5 ? '' : 'Aussteigen'; }, onLeave: () => left(v) };   // the button only when it stands (not over the view while driving)
    S.cur = v; v.st.engine = true; v.st.hand = false; v.st.sleep = 0; v.st.gear = 1; S.camFrom = { p: cam.position.clone(), q: cam.quaternion.clone(), t: 0 }; S.lastPsi = v.st.psi; S.lookT = 0;
    PLAY.sit(seat); P.yaw = v.st.psi * 180 / Math.PI; P.pitch = -8; CAM3.cur = Math.max(CAM3.cur, 1.2);
    VSND.door(v); VSND.start(v); document.body.dataset.drive = v.id; hud(true); markDirty(true); }
  function left(v) { S.cur = null; v.st.engine = false; v.st.thr = 0; v.st.hand = true; VSND.stop(v); VSND.door(v); delete document.body.dataset.drive; hud(false); lamps(v); save(); markDirty(true); }
  function toggleLights() { S.lights = S.lights === 'auto' ? (dark() ? 'off' : 'on') : S.lights === 'on' ? 'off' : 'auto'; PLAY.think('Licht ' + ({ auto: 'automatisch', on: 'an', off: 'aus' })[S.lights] + '.', 1600); save(); markDirty(); }
  // ---------------- input: keys, the on-screen stick, or a test driver ----------------
  const K = new Set(); const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  window.addEventListener('keydown', e => { if (!S.cur || typing()) return; const k = e.key.toLowerCase(); K.add(k);
    if (k === ' ') e.preventDefault(); if (e.repeat) return;
    if (k === 'l') toggleLights(); else if (k === 'h') VSND.horn(S.cur, true); else if (S.cur.model.key) S.cur.model.key(k, true); });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); K.delete(k); if (k === 'h' && S.cur) VSND.horn(S.cur, false); if (S.cur && S.cur.model.key) S.cur.model.key(k, false); });
  window.addEventListener('blur', () => { K.clear(); if (S.cur) VSND.horn(S.cur, false); });
  function input(v, dt) { if (S.auto) return S.auto(v, dt) || { thr: 0, brk: 0, steer: 0, hand: false };
    let thr = keys.has('w') || keys.has('arrowup') ? 1 : 0, brk = keys.has('s') || keys.has('arrowdown') ? 1 : 0, steer = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    if (joy.active) { if (joy.y > 0.12) thr = Math.max(thr, Math.min(1, joy.y * 1.25)); if (joy.y < -0.12) brk = Math.max(brk, Math.min(1, -joy.y * 1.25)); steer += joy.x * 1.15; }
    const tb = S.touch || {}; if (tb.hand) K.add(' ');
    return { thr, brk, steer, hand: K.has(' ') || !!tb.hand }; }
  // V16b5: a state that turned NaN or infinite (a bad contact) goes back to the last good one – before, the NaN spread to the driver's view,
  // the ears (the sounds threw) and the whole page stopped
  const NUM = ['x', 'y', 'z', 'psi', 'u', 'v', 'r', 'vz', 'pitch', 'roll', 'pv', 'rv', 'dp', 'dr', 'rpm', 'ax', 'ay', 'vzLP', 'slip', 'steer', 'moved'];
  function sane(v) { const s = v.st; let bad = NUM.find(k => !Number.isFinite(s[k])); if (!bad && v.W.some(w => !Number.isFinite(w.comp + w.spin))) bad = 'wheel';
    if (!bad) { const g = v.good || (v.good = {}); g.x = s.x; g.y = s.y; g.z = s.z; g.psi = s.psi; return true; }
    const p = v.spec.home(), g = v.good || { x: p[0], y: p[1], z: Number.isFinite(s.zg) ? s.zg : 0, psi: p[2] };
    Object.assign(s, { x: g.x, y: g.y, z: g.z, psi: g.psi, u: 0, v: 0, r: 0, vz: 0, pitch: 0, roll: 0, pv: 0, rv: 0, dp: 0, dr: 0, rpm: v.spec.eng.idle, ax: 0, ay: 0, vzLP: 0, slip: 0, steer: 0, moved: 0 });
    for (const w of v.W) { w.comp = 0; w.spin = 0; } v.placed = false;
    if (performance.now() - (S.badT || -1e9) > 5000) { S.badT = performance.now(); console.warn('veh: invalid state (' + bad + '), back to the last good one:', v.id); if (window.LOADLOG) LOADLOG.err('Fahrzeug ' + v.id + ': ungültiger Zustand (' + bad + '), zurückgesetzt'); }
    return false; }
  // ---------------- per frame ----------------
  function update(dt) { if (!S.list.length || !LOAD.finished) return; const t0 = performance.now();
    for (const v of S.list) { const s = v.st, driven = v === S.cur;
      if (!driven && s.sleep > 1.5 && !s.air) { lamps(v); continue; }   // parked and still: no physics
      const inp = driven ? input(v, dt) : { thr: 0, brk: 0, steer: 0, hand: true };
      const n = Math.max(1, Math.ceil(dt / HSTEP)), h = dt / n; for (let i = 0; i < n; i++) { step(v, h, inp); collide(v); if (!sane(v)) break; }
      s.sleep = (!driven && Math.hypot(s.u, s.v) < 0.03 && Math.abs(s.r) < 0.01) ? s.sleep + dt : 0;
      pose(v, dt); lamps(v); if (driven || Math.hypot(s.u, s.v) > 0.01) markDirty(); s.moved += Math.hypot(s.u, s.v) * dt; }
    const v = S.cur; if (v) { const e = eyeW(v); P.x = e.x; P.y = e.y; P.feet = v.st.z + 0.3; P.cam = { x: e.x, y: e.y, z: e.z };   // the ears, the neighbours and the figure know where I am
      if (v.st.moved > 40) { v.st.moved = 0; save(); } camTick(v, dt); VSND.update(v, dt); hudUpdate(v); if (Math.hypot(v.st.u, v.st.v) > 0.1) MOTION.lastMove = performance.now(); }
    beamUpdate(); S.ms = performance.now() - t0; }
  // ---------------- cameras ----------------
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q2 = new THREE.Quaternion();
  // in game time (the vehicle tick): heading changes turn the driver's view with the vehicle; after a moment without looking around the view
  // swings back behind the vehicle (chase) or ahead (driver); the blend after getting in
  function camTick(v, dt) { const s = v.st; S.gt = (S.gt || 0) + dt;
    if (S.lookYaw !== undefined && (Math.abs(P.yaw - S.lookYaw) > 0.01 || Math.abs(P.pitch - S.lookPitch) > 0.01)) S.lookT = S.gt;   // the mouse or a finger turned the view
    const third = CAM3.want, dPsi = (s.psi - S.lastPsi) * 180 / Math.PI, spd = Math.hypot(s.u, s.v); S.lastPsi = s.psi; if (!third) P.yaw += dPsi;
    if (S.gt - (S.lookT || -9) > 1.5) { let d = s.psi * 180 / Math.PI - P.yaw; while (d > 180) d -= 360; while (d < -180) d += 360;
      P.yaw += d * Math.min(1, dt * (third ? 1.6 + spd * 0.12 : 3)); P.pitch += ((third ? -9 : -4) - P.pitch) * Math.min(1, dt * 2); }
    S.lookYaw = P.yaw; S.lookPitch = P.pitch; if (S.camFrom) { S.camFrom.t += dt / 0.6; if (S.camFrom.t >= 1) S.camFrom = null; } }
  S.applyCam = () => { const v = S.cur; if (!v || P.mode !== 'walk') return false; const s = v.st, sp = v.spec, third = CAM3.want, spd = Math.hypot(s.u, s.v);
    const y = P.yaw * Math.PI / 180, pt = P.pitch * Math.PI / 180;
    if (third) { const C = sp.cam, k = THREE.MathUtils.clamp(CAM3.d / 3.3, 0.55, 2.0), dist = C.dist * k, pv = [s.x, s.y, s.z + C.look];
      const fx = Math.sin(y) * Math.cos(pt), fy = Math.cos(y) * Math.cos(pt), fz = Math.sin(pt); let L = dist;
      // keep the camera out of walls and above the ground
      if (window.WCOL) WCOL.each(Math.min(pv[0], pv[0] - fx * L) - 1, Math.min(pv[1], pv[1] - fy * L) - 1, Math.max(pv[0], pv[0] - fx * L) + 1, Math.max(pv[1], pv[1] - fy * L) + 1, (i, Q) => {
        const ax = Q[i * 4], ay = Q[i * 4 + 1], bx = Q[i * 4 + 2], by = Q[i * 4 + 3], ex = -fx * L, ey = -fy * L, den = ex * (by - ay) - ey * (bx - ax); if (Math.abs(den) < 1e-9) return;
        const t = ((ax - pv[0]) * (by - ay) - (ay - pv[1]) * (bx - ax)) / den, u = ((ax - pv[0]) * ey - (ay - pv[1]) * ex) / den; if (t > 0 && t < 1 && u >= 0 && u <= 1) L = Math.min(L, Math.max(1.2, t * L - 0.3)); });
      let cx = pv[0] - fx * L, cy = pv[1] - fy * L, cz = pv[2] - fz * L + C.height * k * 0.55; const gz = ROADS.groundAt(cx, cy, cz) + 0.45; if (cz < gz) cz = gz;
      cam.fov = (window.innerWidth < 760 ? 70 : 62) + Math.min(10, spd * 0.25); cam.near = 0.15; cam.far = FAR0(); cam.updateProjectionMatrix();
      _v.copy(V(cx, cy, cz)); _v2.copy(V(pv[0] + fx * 6, pv[1] + fy * 6, pv[2] + 0.4 + fz * 6)); cam.position.copy(_v); cam.up.set(0, 1, 0); cam.lookAt(_v2); }
    else { const e = eyeW(v); cam.fov = window.FOVX || (window.innerWidth < 760 ? 76 : 70); cam.near = 0.04; cam.far = FAR0(); cam.updateProjectionMatrix(); cam.position.copy(V(e.x, e.y, e.z));
      _e.set(s.pitch + s.dp, -s.psi, -s.roll - s.dr, 'YXZ'); _q.setFromEuler(_e); let rel = P.yaw - s.psi * 180 / Math.PI; while (rel > 180) rel -= 360; while (rel < -180) rel += 360;
      _q2.setFromEuler(new THREE.Euler(P.pitch * Math.PI / 180, -rel * Math.PI / 180, 0, 'YXZ')); cam.quaternion.copy(_q).multiply(_q2); }
    // getting in: from where the camera was
    if (S.camFrom) { const F = S.camFrom, k = Math.min(1, F.t), e = k * k * (3 - 2 * k); cam.position.lerpVectors(F.p, cam.position, e); cam.quaternion.slerpQuaternions(F.q, cam.quaternion, e); }
    return true; };
  // the sun's shadow box: around the vehicle and ahead of it, larger at speed
  S.sun = () => { const v = S.cur; if (!v || P.mode !== 'walk') return false; const s = v.st, f = fwd(s.psi), ahead = Math.min(14, Math.abs(s.u) * 0.8); sunFollow(s.x + f[0] * ahead, s.y + f[1] * ahead, Math.abs(s.u) > 8 ? 24 : 20); return true; };
  // ---------------- HUD: speed, gear, revs; touch buttons ----------------
  const hv = $('vhud'), hs = hv && hv.querySelector('[data-v="spd"]'), hg = hv && hv.querySelector('[data-v="gear"]'), hr = hv && hv.querySelector('[data-v="rpm"]'), hl = hv && hv.querySelector('[data-vb="light"]');
  function hud(on) { if (!hv) return; hv.hidden = !on; if (on) { hv.dataset.kind = S.cur.id; const hk = $('vkeys'); if (hk) { hk.hidden = COARSE; clearTimeout(S.keysT); S.keysT = setTimeout(() => { hk.hidden = true; }, 9000); } } else { const hk = $('vkeys'); if (hk) hk.hidden = true; } }
  let hudLast = ''; function hudUpdate(v) { if (!hv) return; const s = v.st, kmh = Math.round(Math.abs(s.u) * 3.6), g = s.gear < 0 ? 'R' : String(s.gear), r = (s.rpm / v.spec.eng.red).toFixed(2), L = S.lights;
    const key = kmh + g + r + L; if (key === hudLast) return; hudLast = key; hs.textContent = kmh; hg.textContent = g; hr.style.setProperty('--r', r); if (hl) { hl.setAttribute('aria-pressed', lightsOn(v) ? 'true' : 'false'); hl.title = 'Licht: ' + ({ auto: 'automatisch', on: 'an', off: 'aus' })[L] + ' (L)'; } }
  if (hv) { S.touch = {}; hv.querySelectorAll('[data-vb]').forEach(b => { const a = b.dataset.vb;
      const on = e => { e.preventDefault(); if (!S.cur) return; if (a === 'light') toggleLights(); else if (a === 'horn') VSND.horn(S.cur, true); else if (a === 'hand') S.touch.hand = true; else if (S.cur.model.key) S.cur.model.key(a, true); };
      const off = () => { if (!S.cur) return; if (a === 'horn') VSND.horn(S.cur, false); else if (a === 'hand') { S.touch.hand = false; K.delete(' '); } else if (S.cur.model.key && a !== 'light') S.cur.model.key(a, false); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); }); }
  // ---------------- a route follower (tests; later: traffic) ----------------
  S.follow = (pts, speed = 8, opt = {}) => { let i = 0; const v = S.cur; if (!v || !pts || pts.length < 2) return null; let best = 1e9; pts.forEach((p, k) => { const d = Math.hypot(p[0] - v.st.x, p[1] - v.st.y); if (d < best) { best = d; i = k; } });
    const st = { i, done: false, stuck: 0, back: 0 }; S.auto = (v, dt) => { const s = v.st;
      if (st.back > 0) { st.back -= dt; return { thr: 0, brk: 1, steer: -st.bs, hand: false }; }   // stuck against something: back off a little
      st.stuck = Math.abs(s.u) < 0.3 && s.thr > 0.3 ? st.stuck + dt : 0; if (st.stuck > 1.6) { st.stuck = 0; st.back = 1.8; st.bs = Math.sign(s.steer || 1); }
      while (st.i < pts.length - 1 && Math.hypot(pts[st.i][0] - s.x, pts[st.i][1] - s.y) < Math.max(5, Math.abs(s.u) * 0.9)) st.i++;
      const tg = pts[Math.min(pts.length - 1, st.i)], lp = toL(v, tg[0], tg[1]), ang = Math.atan2(lp[0], Math.max(0.1, lp[1])), last = st.i >= pts.length - 1, dEnd = Math.hypot(tg[0] - s.x, tg[1] - s.y);
      if (last && dEnd < 3 || st.done) { st.done = true; return Math.abs(s.u) > 0.3 ? { thr: 0, brk: 1, steer: 0, hand: false } : { thr: 0, brk: 0, steer: 0, hand: true }; }
      const vt = Math.min(speed, last ? 1 + dEnd * 0.6 : speed) * (1 - Math.min(0.6, Math.abs(ang) * 0.9)), ev = vt - s.u;
      return { thr: ev > 0 ? Math.min(1, ev * 0.4) : 0, brk: ev < -0.6 ? Math.min(1, -ev * 0.25) : 0, steer: THREE.MathUtils.clamp(ang * 2.2 / Math.max(0.15, v.spec.steerMax / (1 + (Math.abs(s.u) / v.spec.steerV) ** 2)) * 0.5, -1, 1), hand: false }; };
    return st; };
  S.enter = id => { const v = S.by[id]; if (v) { if (PLAY.seated()) PLAY.stand(true); goTo(id); enter(v); } return !!v; };
  S.exit = () => { if (!S.cur) return false; const v = S.cur; v.st.u = v.st.v = v.st.r = 0; return PLAY.stand(true); };
  S.place = (id, x, y, psi) => { const v = S.by[id]; if (!v) return; Object.assign(v.st, { x, y, psi, u: 0, v: 0, r: 0, sleep: 0 }); v.placed = false; pose(v);
    if (v === S.cur) { S.lastPsi = psi; P.yaw = S.lookYaw = psi * 180 / Math.PI; S.lookT = -9; }   // the one I sit in: the view goes along
    markDirty(true); };
  S.state = () => S.list.map(v => ({ id: v.id, x: +v.st.x.toFixed(2), y: +v.st.y.toFixed(2), z: +v.st.z.toFixed(2), psi: +(v.st.psi * 180 / Math.PI).toFixed(1), kmh: +(v.st.u * 3.6).toFixed(1), gear: v.st.gear, rpm: Math.round(v.st.rpm), slip: +v.st.slip.toFixed(2), air: v.st.air, light: lightsOn(v) }));
  // the menu: walk to a vehicle (beside its driver's door, looking at it)
  function goTo(id) { const v = S.by[id]; if (!v || S.cur) return; const sp = v.spec, d = toW(v, sp.door[0] - 0.6, sp.door[1] - 0.8), c = toW(v, 0, sp.box.cy);
    SPOTS._veh = { mode: 'walk', pos: [d[0], d[1]], z: ROADS.groundAt(d[0], d[1]), yaw: Math.atan2(c[0] - d[0], c[1] - d[1]) * 180 / Math.PI, pitch: -6, label: v.name }; go('_veh'); markDirty(true); }
  document.querySelectorAll('[data-veh]').forEach(b => b.addEventListener('click', () => { goTo(b.dataset.veh); if (window.HUD && HUD.open) HUD.setMenu(false); }));
  S.goTo = goTo;
  // stuck somewhere? both vehicles back to where they started (menu: „Fahrzeuge zurückstellen“)
  S.reset = () => { if (S.cur) S.exit(); for (const v of S.list) { const p = v.spec.home(); S.place(v.id, p[0], p[1], p[2]); v.st.gear = 1; v.st.engine = false; lamps(v); } save(); toast('Auto und Traktor stehen wieder an ihrem Platz.', 3500); };
  document.querySelectorAll('[data-vreset]').forEach(b => b.addEventListener('click', () => { S.reset(); if (window.HUD && HUD.open) HUD.setMenu(false); }));
  S.add = add; S.lightsOn = lightsOn; S.toW = toW; S.toL = toL; S.save = save; S.toggleLights = toggleLights;
  S.boxHits = boxHits; S.sat = sat; S.circBox = circBox; S.fwd = fwd; S.rgt = rgt; S.groundPose = groundPose;
  window.TICKS.unshift(dt => { try { update(dt); } catch (e) { if (!S._err) { S._err = 1; console.warn('veh', e); } } });   // first: the figure and the camera then see this frame's vehicle
  // first visit of V16b: a word about driving
  let intro = false; window.TICKS.push(() => { if (intro || P.mode !== 'walk' || !LOAD.ready) return; intro = true; let seen = false; try { seen = localStorage.getItem('pav-v16b') === '1'; localStorage.setItem('pav-v16b', '1'); } catch (e) {}
    if (!seen) setTimeout(() => toast('Neu: Fahren. Das Auto steht am Feldweg vor dem Garten, der Traktor an der Unteren Klinge (Menü: „Zum Auto“, „Zum Traktor“). ' + (COARSE ? 'Antippen: einsteigen, Kreis links: Gas, Bremse, lenken.' : 'E: einsteigen, W/S Gas und Bremse, A/D lenken, Q: aussteigen.') + ' Beim Fahren zeigt die Karte links oben den Weg zur Klinge.', 11000), 15000); });
  // when the geodata are there: vehicles placed before (on the near ground) are set onto the terrain
  whenLoaded(() => { for (const v of S.list) { v.placed = false; pose(v); } });
  return S; })();
window.VEH = VEH;
