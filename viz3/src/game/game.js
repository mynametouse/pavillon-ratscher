// ===================== walkable model: controls, physics, doors =====================
const G = window.GEO;
const EYE = 1.62, RAD = 0.21, STEP = 0.42, WALK_SPEED = 2.5;   // m/s (Shift ×1.9); on ladder treads a fifth of it
// spatial hash for walk surfaces and colliders (0.5 m cells)
// entries may carry a rotation descriptor at [9] = {cx, cy, c, s}: the box is given in a local frame rotated by the angle (c = cos, s = sin) about (cx, cy)
function aabbOf(b) { const r = b[9]; if (!r) return b; const pts = [[b[0], b[2]], [b[1], b[2]], [b[1], b[3]], [b[0], b[3]]].map(([x, y]) => [r.cx + x * r.c - y * r.s, r.cy + x * r.s + y * r.c]); return [Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1]))]; }
function toLocal(b, x, y) { const r = b[9]; if (!r) return [x, y]; const dx = x - r.cx, dy = y - r.cy; return [dx * r.c + dy * r.s, -dx * r.s + dy * r.c]; }
function toWorld(b, x, y) { const r = b[9]; if (!r) return [x, y]; return [r.cx + x * r.c - y * r.s, r.cy + x * r.s + y * r.c]; }
function mkGrid(list, cs = 0.5) { const m = new Map(); list.forEach((b, i) => { const a = aabbOf(b); for (let gx = Math.floor(a[0] / cs); gx <= Math.floor(a[1] / cs); gx++) for (let gy = Math.floor(a[2] / cs); gy <= Math.floor(a[3] / cs); gy++) { const k = gx + ',' + gy; if (!m.has(k)) m.set(k, []); m.get(k).push(i); } }); return { m, cs, list }; }
let WG = null, CG = null;
function rebuildGrids() { WG = mkGrid(WALK); CG = mkGrid(COL); }
rebuildGrids();
function cellItems(Gd, x, y) { return Gd.m.get(Math.floor(x / Gd.cs) + ',' + Math.floor(y / Gd.cs)) || []; }
let PHASE = 11; window.PHASE = PHASE;
// colliders: [7] phase from, [8] phase until, [10] variant; walk surfaces: [6]/[7] phase, [8] key of a hatch lid (surface only while closed), [10] variant
const phOk = e => (e[7] == null || e[7] <= PHASE) && (e[8] == null || PHASE < e[8]) && (e[10] == null || e[10] === VARIANT);
function surfaces(x, y) { const out = [[groundZ(x, y), 'ground']]; for (const i of cellItems(WG, x, y)) { const b = WALK[i]; if (b[6] != null && !((b[6] <= PHASE) && (b[7] == null || PHASE < b[7]))) continue;
    if (b[10] != null && b[10] !== VARIANT) continue; if (b[8] && DOOR[b[8]] && DOOR[b[8]].t > 0.5) continue;
    const [lx, ly] = b[9] ? toLocal(b, x, y) : [x, y]; if (lx >= b[0] - 0.02 && lx <= b[1] + 0.02 && ly >= b[2] - 0.02 && ly <= b[3] + 0.02) out.push([b[4], b[5]]); } return out; }
const doorOn = d => (d.ph == null || d.ph <= PHASE) && varOk(d.var);
function applyVisibility() {
  scene.traverse(o => { const ph = o.userData.ph, v = o.userData.var; if (ph === undefined && !v) return;
    o.visible = (ph === undefined || (ph <= PHASE && (o.userData.phEnd === undefined || PHASE < o.userData.phEnd))) && varOk(v) && !(o.userData.item && o.userData.item.removed); }); }
function setPhase(n) { PHASE = Math.max(0, Math.min(PHASES.length - 1, n | 0)); window.PHASE = PHASE;
  applyVisibility();
  SV.on.value = PHASE >= PHN.egOSB ? 1 : 0; SV.floor.value = PHASE >= PHN.windows ? (window.SVMAN?.floor ?? 0.15) : 0.55; if (window.giApply) giApply();
  const L = window.LIGHTS || []; for (const l of L) l.visible = PHASE >= PHN.builtins;
  if (P.mode === 'walk') { const fl = floorAt(P.x, P.y, P.feet + 3); if (P.feet > fl + 0.01) { P.feet = fl; P.vz = 0; } }
  for (const k of DKEYS()) { const d = DOOR[k]; if (d.ph != null && PHASE < d.ph) { d.t = 0; d.target = 0; } }
  document.querySelectorAll('[data-phase-ui]').forEach(el => el.dispatchEvent(new CustomEvent('phase', { detail: PHASE })));
  phaseLabel(); markDirty(true); }
// ---- V15 stances: standing, crouched, on all fours, lying flat; eye height, body height (for collisions) and pace ----
// crawl: flat on the belly, pulling forward with the arms; prone: lying on the back (moving turns it into crawling)
const STANCES = { stand: { eye: 1.62, h: 1.78, sp: 1, name: 'Stehen' }, crouch: { eye: 1.1, h: 1.28, sp: 0.3, name: 'Geduckt' }, crawl: { eye: 0.36, h: 0.52, sp: 0.17, name: 'Kriechen' }, prone: { eye: 0.26, h: 0.42, sp: 0, name: 'Liegen' } };
const bodyH = () => STANCES[(typeof P !== 'undefined' && P.stance) || 'stand'].h;
function blocked(x, y, feet) { const top = feet + bodyH() - 0.03; for (const [s] of surfaces(x, y)) if (s > feet + STEP && s < top) return true; return false; }
const groundZ = (x, y) => window.ROADS ? ROADS.groundAt(x, y) : STREAM.zAt(x, y);   // the meadow is flat (0) except at the stream; beyond the site the terrain and bridge decks (V16b, world/roads.js)
function floorInfo(x, y, feet) { let best = -1e9, typ = 'ground'; for (const [z, t] of surfaces(x, y)) if (z <= feet + STEP && z > best) { best = z; typ = t; } return best === -1e9 ? [groundZ(x, y), 'ground'] : [best, typ]; }
function floorAt(x, y, feet) { return floorInfo(x, y, feet)[0]; }
function surfType(x, y, z) { const [fz, t] = floorInfo(x, y, z + 0.01); if (t !== 'ground') return t; if (gravelAtPt(x, y)) return 'stone'; return 'grass'; }
function gravelAtPt(x, y) { return gravelMask(x, y) > 100 / 255; }
// ---------------- doors (hinged / sliding), registered in 02_geo ----------------
const DOOR = window.DOORS;
const DKEYS = () => Object.keys(DOOR);
function doorCols() { const C = []; for (const k of DKEYS()) { const d = DOOR[k]; if (!doorOn(d)) continue;
    if (d.kind === 'machine') continue;
    if (d.kind === 'slide') { if (d.t < 0.5) C.push([...d.box, 'door']); continue; }
    if (d.kind === 'flap') { if (d.t > 0.5 && d.openBox) C.push([...d.openBox, 'door']); continue; }   // hatch lid standing open = guard; closed it is floor (walk surface)
    const e = d.t * d.t * (3 - 2 * d.t), ang = d.theta + d.sign * Math.PI / 2 * 0.92 * e, h = d.thick / 2;
    C.push([0, d.w, -h, h, d.z, d.z1, 'door', null, null, { cx: d.hx, cy: d.hy, c: Math.cos(ang), s: Math.sin(ang) }]); }
  return C; }
function poseDoor(d) { if (d.kind === 'machine') return; const e = d.t * d.t * (3 - 2 * d.t); if (d.kind === 'slide') d.group.position.x = d.x0 + (d.x1 - d.x0) * e; else if (d.kind === 'flap') d.group.rotation[d.rot] = d.open * e; else d.group.rotation.y = d.theta + d.sign * Math.PI / 2 * 0.92 * e; }
const doorWord = d => d.label || (d.kind === 'flap' ? 'Luke' : 'Tür');
function toggleDoor(k) { const d = DOOR[k]; if (!d || !doorOn(d)) return; d.target = d.target > 0.5 ? 0 : 1; if (d.kind === 'machine') { markDirty(); return; } audio.door(d.kind === 'slide' ? 'og' : 'eg', d.target > 0.5); }
function setDoorNow(k, v) { const d = DOOR[k]; if (!d || d.kind === 'machine') return; d.t = d.target = v ? 1 : 0; poseDoor(d); markDirty(true); }
function updateDoors(dt) { let moving = false;
  for (const k of DKEYS()) { const d = DOOR[k]; if (Math.abs(d.t - d.target) > 1e-3) { d.t += Math.sign(d.target - d.t) * Math.min(Math.abs(d.target - d.t), dt * (d.kind === 'flap' ? 1.1 : 1.5)); moving = true;
      poseDoor(d); if (Math.abs(d.t - d.target) <= 1e-3) markDirty(true); } }
  return moving; }
function nearDoor() { let best = null, bd = 1e9; for (const k of DKEYS()) { const d = DOOR[k]; if (!doorOn(d)) continue; if (P.feet < d.z - 0.7 || P.feet > d.z + 0.9) continue; const dd = Math.hypot(P.x - d.pos[0], P.y - d.pos[1]); if (dd < (d.r || 1.6) && dd < bd) { bd = dd; best = k; } } return best; }
function collide(p, feet, on) { if (!on) return; const b0 = feet + 0.25, b1 = feet + bodyH() - 0.03; const near = [];
  for (const [ox, oy] of [[0, 0], [RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD]]) for (const i of cellItems(CG, p[0] + ox, p[1] + oy)) { const c = COL[i]; if (phOk(c)) near.push(c); }
  for (const c of doorCols()) near.push(c);
  for (let it = 0; it < 3; it++) for (const c of near) { if (b1 < c[4] || b0 > c[5]) continue;
    const lp = c[9] ? toLocal(c, p[0], p[1]) : p; const qx = THREE.MathUtils.clamp(lp[0], c[0], c[1]), qy = THREE.MathUtils.clamp(lp[1], c[2], c[3]); const dx = lp[0] - qx, dy = lp[1] - qy; const d2 = dx * dx + dy * dy;
    if (d2 < RAD * RAD) { let nx = lp[0], ny = lp[1]; if (d2 < 1e-9) { const ox = [c[0] - RAD - lp[0], c[1] + RAD - lp[0]], oy = [c[2] - RAD - lp[1], c[3] + RAD - lp[1]]; const mx = Math.abs(ox[0]) < Math.abs(ox[1]) ? ox[0] : ox[1], my = Math.abs(oy[0]) < Math.abs(oy[1]) ? oy[0] : oy[1];
        if (Math.abs(mx) < Math.abs(my)) nx += mx; else ny += my; }
      else { const d = Math.sqrt(d2); nx = qx + dx / d * RAD; ny = qy + dy / d * RAD; }
      if (c[9]) { const w = toWorld(c, nx, ny); p[0] = w[0]; p[1] = w[1]; } else { p[0] = nx; p[1] = ny; } } }
  // V16b: beyond the modelled site the walls of every building and the trunks (world/worldcol.js); parked vehicles everywhere
  if (window.WCOL && (Math.abs(p[0]) > 50 || Math.abs(p[1]) > 55)) WCOL.pushCircle(p, RAD);
  if (window.VEH) VEH.pushWalker(p, RAD, feet); }
// how far one may walk: the garden's 75 m, with the real surroundings the whole square of the 10 m terrain (V16b)
function walkBounds() { const B = window.RATSCHER && RATSCHER.ready && RATSCHER.box; if (B) { P.x = THREE.MathUtils.clamp(P.x, B[0] + 8, B[2] - 8); P.y = THREE.MathUtils.clamp(P.y, B[1] + 8, B[3] - 8); return; }
  const r = Math.hypot(P.x - 2, P.y - 2); if (r > 75) { P.x = 2 + (P.x - 2) * 75 / r; P.y = 2 + (P.y - 2) * 75 / r; } }
// ---------------- player & viewpoints ----------------
const P = { x: 2, y: -6, feet: 0, vz: 0, yaw: 0, pitch: 0, mode: 'orbit', az: 225, el: 16, r: 19, tgt: [2, 2, 3.2], stride: 0, tx: 2.0, ty: -6.5, th: 110,   // tx, ty, th: plan view centre and height of the picture (m)
  stance: 'stand', eyeH: 1.62, body: 0, air: false, speed: 0, mvx: 0, mvy: 0, landT: 0 };   // V15: posture, smoothed eye height, the figure's heading (deg), airborne, ground speed (m/s), last move direction
// ---- V15 third-person view: camera over the right shoulder of the figure (game/avatar.js); V or the mouse wheel switch to the eyes ----
const CAM3 = { want: (() => { try { const v = localStorage.getItem('pav-view'); return v ? v === '3' : true; } catch (e) { return true; } })(), d: 3.3, cur: 3.3, side: 0.4, sideCur: 0.4, MIN: 1.15, MAX: 7,
  get on() { return this.want && P.mode === 'walk' && !!(window.AVATAR && AVATAR.ready) && !(window.PLAY && PLAY.seat && PLAY.seat.fp) && !(window.PIANO && PIANO.on); } };
window.CAM3 = CAM3;
function setView3(v, quiet) { CAM3.want = !!v; try { localStorage.setItem('pav-view', v ? '3' : '1'); } catch (e) {} if (v) { CAM3.cur = Math.min(CAM3.cur, 1.2); if (CAM3.d < CAM3.MIN + 0.1) CAM3.d = 2.2; }
  document.body.dataset.view = CAM3.on ? '3' : '1'; if (window.HUD) HUD.viewChanged(quiet); markDirty(true); }
window.setView3 = setView3;
function dirYaw(x, y, tx, ty) { return Math.atan2(tx - x, ty - y) * 180 / Math.PI; }
const SPOTS = {
  modell: { mode: 'orbit', az: 225, el: 16, r: 21, label: 'Modellansicht' },
  draufsicht: { mode: 'top', label: 'Draufsicht' },
  garten: { mode: 'walk', pos: [3.6, 15.2], z: 0, yaw: dirYaw(3.6, 15.2, 3.0, 2.0), pitch: 3, label: 'Garten' },
  carport: { mode: 'walk', pos: [3.3, 19.6], z: 0, yaw: dirYaw(3.3, 19.6, -1.0, 15.0), pitch: 1, bld: 'carport', label: 'Carport' },
  eingang: { mode: 'walk', pos: [9.2, 3.7], z: 0, yaw: dirYaw(9.2, 3.7, 5.3, 2.7), pitch: 2, label: 'Vor der Tür' },
  bibliothek: { mode: 'walk', pos: [3.3, 3.08], z: G.zF, yaw: dirYaw(3.3, 3.0, 1.0, 1.4), pitch: -8, label: 'Bibliothek' },
  treppe: { mode: 'walk', pos: [6.15, 3.12], z: G.zT0, yaw: -96, pitch: 6, label: 'Treppenturm' },
  arbeitsraum: { mode: 'walk', pos: [3.3, 3.1], z: G.zO, yaw: dirYaw(3.3, 3.05, 0.6, 0.9), pitch: -6, label: 'Arbeitsraum' },
  lounge: { mode: 'walk', pos: [1.9, 2.0], z: G.zO, yaw: -92, pitch: -5, label: 'Lounge' },
  dach: { mode: 'walk', pos: [2.6, 2.0], z: G.zD, yaw: -95, pitch: -6, label: 'Dachterrasse' },
  wohnwagen: { mode: 'walk', pos: [-0.9, 16.5], z: 0, yaw: 182, pitch: -2, bld: 'carport', label: 'Wohnwagen' },
  holzhaus: { mode: 'walk', pos: [11.75, -6.7], z: 0, yaw: 6, pitch: -2, bld: 'holzhaus', label: 'Holzhaus' },
  bungalow: { mode: 'walk', pos: [8.6, 21.4], z: 0, yaw: 180, pitch: -2, bld: 'bungalow', label: 'Bungalow' },
  ziegen: { mode: 'walk', pos: [17.0, -1.4], z: 0, yaw: 82, pitch: -1, label: 'Ziegenweide' },
  hubert: { mode: 'walk', pos: [-10.6, 22.6], z: 0, yaw: dirYaw(-10.6, 22.6, -15.1, 27.2), pitch: 1, label: 'Bei Hubert' },
  werkstatt: { mode: 'walk', pos: [0.8, -35.2], z: 0, yaw: 205, pitch: -6, bld: 'werkstatt', label: 'Werkstatt' },
};
// viewpoints that differ per variant (B: front door in the EG east wall under the cantilever, ladder stair instead of the tower, terrace 4 cm higher)
const SPOTS_VAR = {
  A: { eingang: { pos: [9.2, 3.7], yaw: dirYaw(9.2, 3.7, 5.3, 2.7), pitch: 2 }, treppe: { pos: [6.15, 3.12], z: () => GEO_A.zT0, yaw: -96, pitch: 6, label: 'Treppenturm' }, dach: { z: () => GEO_A.zD } },
  B: { eingang: { pos: [7.4, 3.6], yaw: dirYaw(7.4, 3.6, 4.0, 3.0), pitch: 3 }, treppe: { pos: [3.32, 2.55], z: () => GEO_B.zF, yaw: 180, pitch: 30, label: 'Leitertreppe' }, dach: { z: () => GEO_B.zD } } };
function applySpots(v) { for (const [k, o] of Object.entries(SPOTS_VAR[v])) { const s = SPOTS[k]; for (const [f, val] of Object.entries(o)) s[f] = typeof val === 'function' ? val() : val; } }
applySpots(VARIANT);
let s0 = true; try { const sv = localStorage.getItem('pav-sound'); if (sv !== null) s0 = sv === '1'; } catch (e) {}
const opt = { collide: true, sound: s0 }; let stepZ = 0;
function placeName() { if (P.mode === 'orbit') return 'Modellansicht';
  if ((Math.abs(P.x) > 50 || Math.abs(P.y) > 55) && window.ROADS) { const wp = (window.VPROPS && VPROPS.place && VPROPS.place(P.x, P.y)) || ROADS.place(P.x, P.y); if (wp) return wp; }   // V16b: out in the village and the fields; V16e: places and streets of Ratscher
  const f = P.feet, inT = P.x > G.TW.x0 && P.x < G.TW.x1 && P.y > G.TW.y0 && P.y < G.TW.y1, inEG = P.x > 0 && P.x < 4 && P.y > 0 && P.y < 4, inOG = P.x > G.OG.x0 && P.x < G.OG.x1 && P.y > G.OG.y0 && P.y < G.OG.y1;
  const rough = PHASE < PHN.floors ? ' (Rohbau)' : '';
  if (inT) { if (f > G.zD - 0.1) return 'Turmkopf, Ausgang Dachterrasse'; if (Math.abs(f - G.zO) < 0.06 && P.y > G.PASS.y0 - 0.25) return 'Turm, Podest Arbeitsraum'; if (f > G.zT0 + 0.1) return f > G.zO ? 'Wendeltreppe zum Dach' : 'Wendeltreppe'; return 'Turm, Eingang'; }
  if (G.LAD1) { const on = L => P.x > L.x0 && P.x < L.x1 && P.y > L.y0 - 0.05 && P.y < L.y1 + 0.05 && f > L.z0 + 0.1 && f < L.z1 - 0.1;
    if (on(G.LAD1)) return 'Leitertreppe zum Arbeitsraum'; if (on(G.LAD2)) return 'Leitertreppe zur Dachterrasse'; }
  if (f > G.zD - 0.25) return 'Dachterrasse'; if (f > G.zC) return 'Dach';
  if (f > G.zE) return inOG ? 'Arbeitsraum' + rough : 'Obergeschoss'; if (inEG) return 'Bibliothek' + rough;
  const sp = window.sitePlace ? sitePlace(P.x, P.y, f) : null; return sp || 'Garten'; }
// inside the pavilion (EG or OG, below the roof): fewer far plants are drawn (see VEG)
window.inHouseNow = () => P.mode === 'walk' && P.feet < G.zC && P.x > G.OG.x0 && P.x < G.OG.x1 && P.y > G.OG.y0 && P.y < G.OG.y1 && (P.feet >= G.zE - 0.3 || (P.x > 0 && P.x < 4 && P.y > 0 && P.y < 4));
function go(name) { const s = SPOTS[name]; if (window.PLAY && PLAY.seated()) PLAY.stand(true); P.mode = s.mode;
  if (s.mode === 'orbit') { P.az = s.az; P.el = s.el; P.r = s.r; }
  else if (s.mode === 'top') { /* plan view: keeps its last centre and zoom */ }
  else { const B = s.bld && window.BUILD && BUILD[s.bld], p = B ? B.tf(s.pos[0], s.pos[1]) : s.pos; P.x = p[0]; P.y = p[1]; P.feet = s.z; stepZ = s.z; P.vz = 0; P.yaw = s.yaw - (B ? B.da : 0); P.pitch = s.pitch;
    P.body = P.yaw; P.air = false; P.stance = 'stand'; P.eyeH = STANCES.stand.eye; CAM3.cur = Math.min(CAM3.cur, 1.4); }
  if (window.SITEPLAN) SITEPLAN.onMode(s.mode);
  document.querySelectorAll('[data-spot]').forEach(b => b.setAttribute('aria-pressed', b.dataset.spot === name ? 'true' : 'false'));
  document.body.dataset.mode = s.mode; document.body.dataset.view = CAM3.on ? '3' : '1'; if (window.HUD) HUD.modeChanged(); markDirty(); }
let bob = 0;
const TOP_FOV = 30;
function topH() { return P.th / (2 * Math.tan(TOP_FOV * Math.PI / 360)); }   // camera height for a picture P.th metres tall
const TOPMAX = () => (window.RATSCHER && RATSCHER.ready) ? 9000 : 170;   // the plan view zooms out to the whole valley once the real surroundings are there
const FAR0 = () => (window.RATSCHER && RATSCHER.ready) ? 30000 : 12000;
const ORBMAX = () => (window.RATSCHER && RATSCHER.ready) ? 420 : 70;   // the model view may step back far enough to see the village
function applyCam() {
  if (P.mode === 'top') { P.th = Math.min(P.th, TOPMAX()); const lim = TOPMAX() > 1000 ? 11000 : 400; P.tx = THREE.MathUtils.clamp(P.tx, -lim, lim); P.ty = THREE.MathUtils.clamp(P.ty, -lim, lim);
    const h = topH(); cam.fov = TOP_FOV; cam.near = Math.max(0.5, h * 0.04); cam.far = Math.max(FAR0(), h * 1.6); cam.updateProjectionMatrix(); cam.up.set(0, 0, -1); cam.position.copy(V(P.tx, P.ty, h)); cam.lookAt(V(P.tx, P.ty, 0)); if (window.SITEPLAN) SITEPLAN.onCam(); return; }
  cam.up.set(0, 1, 0);
  if (P.mode === 'orbit') { const a = P.az * Math.PI / 180, e = P.el * Math.PI / 180, t = P.tgt;
    const ox = t[0] + Math.sin(a) * Math.cos(e) * P.r, oy = t[1] + Math.cos(a) * Math.cos(e) * P.r, gz = window.RATSCHER && RATSCHER.ready ? RATSCHER.hAt(ox, oy) + 3 : 0.6;   // never inside a hill
    cam.fov = 45; cam.near = Math.max(0.1, P.r * 0.02); cam.far = FAR0(); cam.updateProjectionMatrix(); cam.position.copy(V(ox, oy, Math.max(gz, t[2] + Math.sin(e) * P.r))); cam.lookAt(V(...t)); }
  else { if (window.VEH && VEH.applyCam()) return;   // V16b: driving – chase camera or the driver's eyes
    const y = P.yaw * Math.PI / 180, p = P.pitch * Math.PI / 180, c = P.cam;   // P.cam: seat, ride or a short move there (23_play)
    cam.near = 0.1; cam.far = FAR0();
    if (CAM3.on) { const pv = cam3Pivot(), fx = Math.sin(y) * Math.cos(p), fy = Math.cos(y) * Math.cos(p), fz = Math.sin(p), d = CAM3.cur;   // behind the figure, looking past its shoulder
      cam.fov = window.innerWidth < 760 ? 68 : 60; cam.updateProjectionMatrix(); cam.position.copy(V(pv[0] - fx * d, pv[1] - fy * d, pv[2] - fz * d)); cam.lookAt(V(pv[0] + fx, pv[1] + fy, pv[2] + fz)); return; }
    const cx = c ? c.x : P.x, cy = c ? c.y : P.y, z = c ? c.z : P.feet + P.eyeH + bob;
    cam.fov = window.FOVX || (window.innerWidth < 760 ? 76 : 70); cam.updateProjectionMatrix(); cam.position.copy(V(cx, cy, z)); cam.lookAt(V(cx + Math.sin(y) * Math.cos(p), cy + Math.cos(y) * Math.cos(p), z + Math.sin(p))); } }
// ---- third person: the pivot sits at eye height over the right shoulder; the camera keeps out of walls, floors and ceilings ----
function cam3Base() { const c = P.cam; return c ? [c.x, c.y, c.z - 0.1] : [P.x, P.y, P.feet + P.eyeH - 0.14]; }   // a little below the eyes: the shoulder
function cam3Pivot() { const b = cam3Base(), y = P.yaw * Math.PI / 180; return [b[0] + Math.cos(y) * CAM3.sideCur, b[1] - Math.sin(y) * CAM3.sideCur, b[2]]; }
// free part (0..1) of the segment a → b: colliders (boxes, also turned ones), doors, walk surfaces as slabs, the ground
function segBox(a, b, c, pad) { const p0 = c[9] ? toLocal(c, a[0], a[1]) : [a[0], a[1]], p1 = c[9] ? toLocal(c, b[0], b[1]) : [b[0], b[1]];
  const o = [p0[0], p0[1], a[2]], d = [p1[0] - p0[0], p1[1] - p0[1], b[2] - a[2]], lo = [c[0] - pad, c[2] - pad, c[4] - pad], hi = [c[1] + pad, c[3] + pad, c[5] + pad];
  if (o[0] > lo[0] && o[0] < hi[0] && o[1] > lo[1] && o[1] < hi[1] && o[2] > lo[2] && o[2] < hi[2]) return 1;   // starts inside: ignore that one
  let t0 = 0, t1 = 1; for (let k = 0; k < 3; k++) { if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) return 1; continue; }
    let ta = (lo[k] - o[k]) / d[k], tb = (hi[k] - o[k]) / d[k]; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return 1; }
  return t0; }
function camRay(a, b, pad = 0.14) { let t = 1; const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); if (L < 1e-4) return 1;
  const n = Math.max(2, Math.ceil(L / 0.15)), seen = new Set();
  for (let i = 0; i <= n; i++) { const k = i / n, x = a[0] + dx * k, y = a[1] + dy * k; for (const j of cellItems(CG, x, y)) seen.add(j); for (const j of cellItems(CG, x + 0.3, y)) seen.add(j); for (const j of cellItems(CG, x - 0.3, y)) seen.add(j); for (const j of cellItems(CG, x, y + 0.3)) seen.add(j); for (const j of cellItems(CG, x, y - 0.3)) seen.add(j); }
  for (const j of seen) { const c = COL[j]; if (!phOk(c)) continue; const h = segBox(a, b, c, pad); if (h < t) t = h; }
  for (const c of doorCols()) { const h = segBox(a, b, c, pad); if (h < t) t = h; }
  for (let i = 1; i <= n; i++) { const k = i / n; if (k > t) break; const x = a[0] + dx * k, y = a[1] + dy * k, z = a[2] + dz * k;
    for (const [s] of surfaces(x, y)) if (z > s - 0.24 && z < s + 0.18) { const kk = Math.max(0, (i - 1) / n); if (kk < t) t = kk; break; } }
  return t; }
function cam3Update(dt) { if (!CAM3.on) return; const b = cam3Base(), y = P.yaw * Math.PI / 180, p = P.pitch * Math.PI / 180, sx = Math.cos(y), sy = -Math.sin(y), c0 = CAM3.cur, s0 = CAM3.sideCur;
  // the shoulder offset shrinks next to a wall on the right
  const reach = CAM3.side + 0.16, fs = camRay(b, [b[0] + sx * reach, b[1] + sy * reach, b[2]], 0.04), side = Math.max(0, Math.min(CAM3.side, fs * reach - 0.16));
  CAM3.sideCur = side < CAM3.sideCur ? side : CAM3.sideCur + (side - CAM3.sideCur) * Math.min(1, dt * 4);
  const pv = [b[0] + sx * CAM3.sideCur, b[1] + sy * CAM3.sideCur, b[2]], fx = Math.sin(y) * Math.cos(p), fy = Math.cos(y) * Math.cos(p), fz = Math.sin(p), D = CAM3.d + 0.2;
  const free = camRay(pv, [pv[0] - fx * D, pv[1] - fy * D, pv[2] - fz * D]) * D - 0.2, tgt = Math.max(0.2, Math.min(CAM3.d, free));
  CAM3.cur = tgt < CAM3.cur ? tgt : CAM3.cur + (tgt - CAM3.cur) * Math.min(1, dt * 2.2);
  if (Math.abs(CAM3.cur - c0) > 1e-3 || Math.abs(CAM3.sideCur - s0) > 1e-3) markDirty(); }
// ---- jumping and the four postures (keys Space, C, X, Z; buttons on touch screens) ----
function headroom(h) { const z0 = P.feet + bodyH(), z1 = P.feet + h; if (z1 <= z0 + 1e-3) return true;
  for (const [s] of surfaces(P.x, P.y)) if (s > P.feet + STEP && s - 0.2 < z1) return false;
  if (!opt.collide) return true;
  for (const [ox, oy] of [[0, 0], [RAD, 0], [-RAD, 0], [0, RAD], [0, -RAD]]) for (const i of cellItems(CG, P.x + ox, P.y + oy)) { const c = COL[i]; if (!phOk(c) || c[5] <= z0 + 0.01 || c[4] >= z1) continue;
    const lp = c[9] ? toLocal(c, P.x, P.y) : [P.x, P.y], qx = THREE.MathUtils.clamp(lp[0], c[0], c[1]), qy = THREE.MathUtils.clamp(lp[1], c[2], c[3]); if ((lp[0] - qx) ** 2 + (lp[1] - qy) ** 2 < RAD * RAD * 0.8) return false; }
  return true; }
function headHit(x, y, z0, z1) { for (const [s] of surfaces(x, y)) { const u = s - 0.2; if (u > z0 - 0.02 && u <= z1) return true; }
  for (const i of cellItems(CG, x, y)) { const c = COL[i]; if (!phOk(c) || c[4] <= z0 - 0.02 || c[4] > z1) continue; const lp = c[9] ? toLocal(c, x, y) : [x, y]; if (lp[0] > c[0] - 0.1 && lp[0] < c[1] + 0.1 && lp[1] > c[2] - 0.1 && lp[1] < c[3] + 0.1) return true; }
  return false; }
function setStance(st, quiet) { if (!STANCES[st] || st === P.stance) return true; if (P.mode !== 'walk' || (window.PLAY && PLAY.seated())) return false;
  const say = t => { if (!quiet && window.PLAY) PLAY.think(t, 2200); };
  if (st !== 'stand' && floorInfo(P.x, P.y, P.feet)[1] === 'ladder') { say('Nicht auf der Leiter.'); return false; }
  if (P.air && st !== 'stand') return false;
  if (STANCES[st].h > bodyH() && !headroom(STANCES[st].h)) { say('Hier ist zu wenig Platz zum Aufrichten.'); return false; }
  P.stance = st; if (typeof SFX !== 'undefined' && SFX.cloth) SFX.cloth(); if (window.HUD) HUD.stanceChanged(); markDirty(); return true; }
function toggleStance(st) { if (P.stance !== st) return setStance(st); if (setStance('stand', true)) return true; return st === 'crouch' ? setStance('stand') : (setStance('crouch', true) || setStance('stand')); }
function jump() { if (P.mode !== 'walk' || (window.PLAY && PLAY.seated()) || P.air || P.vz !== 0) return false;
  if (P.stance === 'crawl' || P.stance === 'prone') return setStance('stand', true) || setStance('crouch');
  if (P.stance === 'crouch' && !setStance('stand')) return false;
  if (floorInfo(P.x, P.y, P.feet)[1] === 'ladder' || !headroom(STANCES.stand.h + 0.3)) return false;
  P.vz = 3.5; P.air = true; P.airT = 0; if (typeof SFX !== 'undefined' && SFX.hop) SFX.hop(); markDirty(); return true; }
window.MOVE = { jump, setStance, toggleStance, STANCES };
// ---------------- input ----------------
const keys = new Set(); const joy = { x: 0, y: 0, active: false };
window.addEventListener('keydown', e => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return; const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { keys.add(k); e.preventDefault(); }
  if ((k === 'e' || k === 'enter') && !e.repeat) { if (window.PLAY) { if (P.mode === 'walk' && PLAY.primary()) e.preventDefault(); } else { const d = nearDoor(); if (d && P.mode === 'walk') { toggleDoor(d); e.preventDefault(); } } }
  if (P.mode !== 'walk' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ') { e.preventDefault(); if (!e.repeat) jump(); }
  else if (e.repeat) return;
  else if (k === 'c') toggleStance('crouch'); else if (k === 'x') toggleStance('crawl'); else if (k === 'z') toggleStance('prone');
  else if (k === 'v') setView3(!CAM3.want); });
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); window.addEventListener('blur', () => keys.clear());
// Caps Lock on: walk slowly instead of the usual brisk pace (the figure then strolls)
let slowWalk = false; for (const t of ['keydown', 'keyup']) window.addEventListener(t, e => { if (e.getModifierState) slowWalk = e.getModifierState('CapsLock'); });
const cv = R.domElement; cv.style.touchAction = 'none';
const pts = new Map(); let pinch0 = null, downAt = null;
cv.addEventListener('pointerdown', e => { if (e.target !== cv) return; try { cv.setPointerCapture(e.pointerId); } catch (err) {} pts.set(e.pointerId, [e.clientX, e.clientY]); downAt = [e.clientX, e.clientY, performance.now()];
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = [Math.hypot(a[0] - b[0], a[1] - b[1]), P.r, CAM3.d]; } });
cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; const pr = pts.get(e.pointerId); const dx = e.clientX - pr[0], dy = e.clientY - pr[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 2 && pinch0 && P.mode === 'orbit') { const [a, b] = [...pts.values()]; P.r = THREE.MathUtils.clamp(pinch0[1] * pinch0[0] / Math.hypot(a[0] - b[0], a[1] - b[1]), 7, ORBMAX()); markDirty(); return; }
  if (pts.size === 2 && pinch0 && P.mode === 'walk') { const [a, b] = [...pts.values()], r = pinch0[0] / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1]));
    if (CAM3.on) { const nd = pinch0[2] * r; if (nd < CAM3.MIN - 0.3) { setView3(false); pinch0 = null; } else { CAM3.d = THREE.MathUtils.clamp(nd, CAM3.MIN, CAM3.MAX); markDirty(); } }
    else if (r > 1.35 && window.AVATAR && AVATAR.ready) { CAM3.d = 1.8; setView3(true); pinch0 = null; }
    return; }
  if (pts.size > 1) return; const k = 180 / Math.max(stage.clientHeight, 300);
  if (P.mode === 'orbit') { P.az -= dx * k * 0.9; P.el = THREE.MathUtils.clamp(P.el + dy * k * 0.6, 2, 80); } else look(-dx * k * 0.55, dy * k * 0.45); markDirty(); });
// turning the view in the walk mode (mouse, touch, captured mouse in game/hud.js); with the figure the camera may look further up and down
function look(dyaw, dpitch) { P.yaw += dyaw; const lim = CAM3.on ? [-65, 72] : [-75, 75]; P.pitch = THREE.MathUtils.clamp(P.pitch + dpitch, lim[0], lim[1]); markDirty(); }
window.look = look;
// camera distance behind the figure (wheel, pinch); closer than the minimum switches to the eyes, back out to the figure again
let zoomAcc = 1;
function zoom3(k) { if (P.mode !== 'walk') return; if (!CAM3.on) { zoomAcc = Math.min(2, zoomAcc * k); if (zoomAcc > 1.18 && !CAM3.want && window.AVATAR && AVATAR.ready) { zoomAcc = 1; CAM3.d = 1.7; setView3(true); } return; }
  zoomAcc = 1; if (CAM3.d <= CAM3.MIN + 1e-3 && k < 0.97) { setView3(false); return; } CAM3.d = THREE.MathUtils.clamp(CAM3.d * k, CAM3.MIN, CAM3.MAX); markDirty(); }
window.zoom3 = zoom3;
const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null;
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && performance.now() - downAt[2] < 400) clickPick(e); downAt = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch0 = null; });
cv.addEventListener('wheel', e => { e.preventDefault(); if (P.mode === 'orbit') P.r = THREE.MathUtils.clamp(P.r * Math.exp(e.deltaY * 0.0012), 7, ORBMAX()); else if (P.mode === 'walk') zoom3(Math.exp(e.deltaY * 0.0012)); markDirty(); }, { passive: false });
const ray = new THREE.Raycaster();
function clickPick(e) { if (P.mode !== 'walk') return; const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam);
  if (window.PLAY && PLAY.tap(e, ray)) return;
  const hits = ray.intersectObjects(DKEYS().map(k => DOOR[k].group).filter(Boolean), true); if (hits.length && hits[0].distance < 4) { let o = hits[0].object; toggleDoor(o.userData.door); } }
const pad = $('joy'), knob = $('knob');
if (pad) { let id = null, c0 = null; const mv = e => { if (e.pointerId !== id) return; const R0 = pad.clientWidth / 2; let dx = e.clientX - c0[0], dy = e.clientY - c0[1]; const L = Math.hypot(dx, dy); if (L > R0) { dx *= R0 / L; dy *= R0 / L; } joy.x = dx / R0; joy.y = -dy / R0; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  pad.addEventListener('pointerdown', e => { id = e.pointerId; try { pad.setPointerCapture(id); } catch (err) {} const r = pad.getBoundingClientRect(); c0 = [r.left + r.width / 2, r.top + r.height / 2]; joy.active = true; mv(e); });
  pad.addEventListener('pointermove', mv); const end = e => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; joy.active = false; knob.style.transform = ''; }; pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); }
document.querySelectorAll('[data-key]').forEach(btn => { const k = btn.dataset.key; const on = e => { e.preventDefault(); keys.add(k); }, off = () => keys.delete(k); btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointerleave', off); btn.addEventListener('pointercancel', off); });
// (the action button #doorbtn is driven by game/play.js: doors, machines, people and things)
document.querySelectorAll('[data-spot]').forEach(b => b.addEventListener('click', () => go(b.dataset.spot)));
document.querySelectorAll('[data-light]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.light; setMode(v); document.querySelectorAll('[data-light]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); if (v !== 'auto' && v !== 'night') audio.setTime(v); try { localStorage.setItem('pav-light2', v); } catch (e) {} }));
function setCollide(v) { opt.collide = v; const b = $('collbtn'); if (b) { b.setAttribute('aria-pressed', v ? 'true' : 'false'); b.querySelector('span').textContent = v ? 'an' : 'aus'; } }
$('collbtn')?.addEventListener('click', () => setCollide(!opt.collide));
function qualLabel() { const b = $('qualbtn'); if (!b) return; b.setAttribute('aria-pressed', RENDER.tier === 'hoch' ? 'true' : 'false'); b.querySelector('span').textContent = TIERS[RENDER.tier].label; }
$('qualbtn')?.addEventListener('click', () => { nextTier(); qualLabel(); });
// fullscreen / immersive: real fullscreen where the browser allows it (not inside every app frame, not on iPhone), always the compact layout
function setFull(v) { document.body.dataset.full = v ? '1' : ''; const b = $('fullbtn'); if (b) { b.setAttribute('aria-pressed', v ? 'true' : 'false'); b.textContent = v ? 'Vollbild aus' : 'Vollbild'; }
  try { if (v && !document.fullscreenElement) { const el = document.documentElement; const r = (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
    else if (!v && document.fullscreenElement) { const r = (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document); if (r && r.catch) r.catch(() => {}); } } catch (e) {}
  setTimeout(resize, 50); setTimeout(resize, 400); }
$('fullbtn')?.addEventListener('click', () => setFull(document.body.dataset.full !== '1'));
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.dataset.full === '1') { /* left real fullscreen (Esc): keep compact layout until the button is pressed */ } setTimeout(resize, 50); });
window.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return; setFull(document.body.dataset.full !== '1'); } });
// ---------------- loop ----------------
const lbl = $('where'), dbtn = $('doorbtn'); let last = performance.now(), lastPlace = '', lastDoor = null;
const P3D = $('p-3d');
function frame(now) { const dt = Math.min(0.12, (now - last) / 1000); last = now;   // slow frames are split into substeps below, so walking keeps its real speed
  if (P3D.hidden || window.FREEZE) { P3D.away = !window.FREEZE; requestAnimationFrame(frame); return; }   // FREEZE: tests step the world by hand (GAME.step)   // another tab is open: no physics, no drawing
  if (P3D.away) { P3D.away = false; resize(); markDirty(true); MOTION.lastStill = -1e9; }   // back in the 3D tab: fresh size and a sharp frame at once
  let f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const turn = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
  let side = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
  if (joy.active) { f += joy.y; side += joy.x * 0.8; }
  { const n = Math.max(1, Math.ceil(dt / 0.034)); for (let i = 0; i < n; i++) physics(dt / n, f, turn, side, keys.has('shift') ? 1.9 : slowWalk ? 0.56 : 1); }
  if (P.mode === 'walk' && !(window.VEH && VEH.cur)) cam3Update(dt);
  adaptExposure(dt);
  if (window.TICKS) for (let i = 0; i < TICKS.length; i++) { try { TICKS[i](dt); } catch (e) { if (!TICKS[i]._err) { TICKS[i]._err = 1; console.warn('tick', e); } } }
  // V16b3: nothing is drawn while the loading screen is up – prepareGPU draws its own frames; a frame here could wait for shaders still
  // compiling in the background (seconds each on Windows without a graphics card) and froze the page
  if (!LOAD.ready) { requestAnimationFrame(frame); return; }
  if (_shadowDirty) { R.shadowMap.needsUpdate = true; _shadowDirty = false; _dirty = true; }
  // moving view → cheap frame every time; standing still → one full-quality frame (other changes while still, e.g. walking figures, at most every few frames)
  if (_dirty) { const t0 = performance.now(); applyCam(); const moved = camMoved();
    if (moved || now - MOTION.lastMove < 160) { if (moved) { MOTION.lastMove = now; motionTrack(now); } if (window.VEG) VEG.update(cam.position); renderFrame('motion'); _dirty = false; MOTION.stillDue = true; PERF.js += performance.now() - t0; PERF.n++; }
    else if (now - MOTION.lastStill > Math.max(90, MOTION.stillMs * 2.5)) { if (window.VEG) VEG.update(cam.position); renderFrame('still'); _dirty = false; MOTION.stillDue = false; MOTION.lastStill = now; } }
  else if (MOTION.stillDue && now - MOTION.lastMove >= 160) { const t0 = performance.now(); renderFrame('still'); MOTION.stillDue = false; MOTION.lastStill = now; MOTION.stillMs = MOTION.stillMs * 0.7 + (performance.now() - t0) * 0.3; }
  requestAnimationFrame(frame); }
// safety net: if continuous motion stays far below 20 fps during the first minute, step down one tier once and say so (no silent resolution changes)
const FPS = { last: 0, buf: [], done: false, t0: performance.now(),
  track(now) { if (this.done || OFFLINE || TIER_USER) { this.last = now; return; } const dt = now - this.last; this.last = now; if (dt > 0 && dt < 400) this.buf.push(dt);
    if (now - this.t0 > 60000) { this.done = true; return; }
    if (this.buf.length >= 60) { const b = this.buf.slice().sort((a, c) => a - c), med = b[b.length >> 1]; this.buf.length = 0;
      if (med > 55 && RENDER.tier !== 'schnell') { const nt = TIER_ORDER[TIER_ORDER.indexOf(RENDER.tier) + 1]; applyTier(nt, false); qualLabel(); this.done = true; toast('Grafik auf „' + TIERS[nt].label + '“ gestellt, damit es flüssig läuft. Über „Grafik“ änderbar.', 6000); } } } };
function physics(dt, f, turn, side, run) {
  if (P.mode === 'orbit') { if (f || turn || side) { P.az -= (turn + side) * 50 * dt; P.r = THREE.MathUtils.clamp(P.r - f * 8 * Math.max(1, P.r / 70) * dt, 7, ORBMAX()); markDirty(); } }
  else if (P.mode === 'top') { if (f || turn || side) { const k = P.th * 0.55 * run * dt; P.tx += (turn + side) * k; P.ty += f * k; markDirty(); } }
  else if (window.PLAY && PLAY.seated()) {   // sitting, lying or riding along: look around; the walk keys stand up again
    if (turn && !PLAY.seat.drive) { P.yaw += turn * 95 * dt; markDirty(); }   // driving: the arrow keys steer (vehicles/vehicle.js)
    if ((f || side) && !PLAY.seat.lock && !PLAY.seat.keepKeys) PLAY.stand();
    P.speed = 0; P.air = false; P.vz = 0;
    PLAY.update(dt); const pl = placeName(); if (pl !== lastPlace) { lbl.textContent = pl; lastPlace = pl; } }
  else {
    if (turn) { P.yaw += turn * 95 * dt; markDirty(); }
    const third = CAM3.on; let moved = 0;
    { const st = STANCES[P.stance]; if (Math.abs(P.eyeH - st.eye) > 1e-3) { P.eyeH += (st.eye - P.eyeH) * Math.min(1, dt * 7); markDirty(); } }
    if ((f || side) && P.stance === 'prone') setStance('crawl', true);
    if (f || side) { const y = P.yaw * Math.PI / 180, onLadder = floorInfo(P.x, P.y, P.feet)[1] === 'ladder'; if (onLadder && P.stance !== 'stand') P.stance = 'stand';
      const st = STANCES[P.stance], sp = WALK_SPEED * (P.stance === 'stand' ? run : 1) * st.sp * (onLadder ? 0.2 : 1); const n = Math.max(1, Math.hypot(f, side)), nf = f / n, ns = side / n;
      const p = [P.x + (Math.sin(y) * nf + Math.cos(y) * ns) * sp * dt, P.y + (Math.cos(y) * nf - Math.sin(y) * ns) * sp * dt];
      collide(p, P.feet, opt.collide);
      if (opt.collide && blocked(p[0], p[1], P.feet)) { if (!blocked(p[0], P.y, P.feet)) p[1] = P.y; else if (!blocked(P.x, p[1], P.feet)) p[0] = P.x; else { p[0] = P.x; p[1] = P.y; } }
      const mx = p[0] - P.x, my = p[1] - P.y, d = Math.hypot(mx, my); P.x = p[0]; P.y = p[1]; walkBounds();
      moved = d; if (d > 1e-5) { P.mvx = mx / d; P.mvy = my / d; }
      // the figure turns towards where it goes (crawling and lying it turns more slowly); seen through its eyes it always faces the view
      if (third && d > 1e-5) { const want = Math.atan2(nf * Math.sin(y) + ns * Math.cos(y), nf * Math.cos(y) - ns * Math.sin(y)) * 180 / Math.PI; let dd = want - P.body; while (dd > 180) dd -= 360; while (dd < -180) dd += 360; P.body += dd * Math.min(1, dt * (P.stance === 'prone' || P.stance === 'crawl' ? 4 : 10)); }
      const sl = onLadder ? 0.3 : P.stance === 'stand' ? 0.72 + (sp - 1.45) * 0.25 : P.stance === 'crouch' ? 0.55 : 0.42; P.stride += d; bob = third || P.stance !== 'stand' ? 0 : Math.sin(P.stride * Math.PI / sl) * 0.022;
      if (P.stride > sl && !P.air) { P.stride = 0; audio.step(surfType(P.x, P.y, P.feet), P.stance === 'stand' ? (run > 1 ? 1.25 : 1) : P.stance === 'crouch' ? 0.6 : 0.35); } markDirty(); }
    if (!third) P.body = P.yaw;
    P.speed += (moved / Math.max(dt, 1e-3) - P.speed) * Math.min(1, dt * 12);
    if (P.landT > 0) P.landT = Math.max(0, P.landT - dt);
    const fi = floorInfo(P.x, P.y, P.feet), fl = fi[0];
    if (P.vz > 0) {   // a jump on its way up: nothing is stepped onto until it comes down again; the head stops at ceilings
      P.vz -= 9.81 * dt; let nf = P.feet + P.vz * dt; if (opt.collide && headHit(P.x, P.y, P.feet + bodyH(), nf + bodyH())) { nf = P.feet; P.vz = -0.01; }
      P.feet = nf; P.air = true; P.airT = (P.airT || 0) + dt; markDirty(); }
    else {
      if (fi[1] === 'ground' && P.vz === 0 && P.feet > fl && P.feet - fl < 0.3) { P.feet = fl; stepZ = fl; markDirty(); }
      if (P.feet > fl + 0.001) { if (!P.air) { P.air = true; P.airT = 0; } P.airT += dt; P.vz -= 9.81 * dt; P.feet = Math.max(fl, P.feet + P.vz * dt); markDirty();
        if (P.feet === fl) { if (P.vz < -2.4) { audio.step(surfType(P.x, P.y, P.feet), P.vz < -4 ? 1.6 : 1.15); stepZ = P.feet; P.landT = P.vz < -4.5 ? 0.45 : 0.22; } P.vz = 0; P.air = false; P.airT = 0; } }
      else { P.feet = fl; P.vz = 0; P.air = false; P.airT = 0; } }
    if (fi[1] === 'ground' && P.vz === 0) stepZ = P.feet;   // slopes of the ground make no step clicks
    if (P.vz === 0 && Math.abs(P.feet - stepZ) > 0.12) { stepZ = P.feet; P.stride = 0; audio.step(surfType(P.x, P.y, P.feet), 1.0, true); }
    const pl = placeName(); if (pl !== lastPlace) { lbl.textContent = pl; lastPlace = pl; }
    if (window.PLAY) PLAY.update(dt); else { const nd = nearDoor(), dtxt = k => DOOR[k].kind === 'machine' ? DOOR[k].label + (DOOR[k].target > 0.5 ? ' ausschalten' : ' einschalten') : doorWord(DOOR[k]) + (DOOR[k].target > 0.5 ? ' schließen' : ' öffnen');
    if (nd !== lastDoor) { lastDoor = nd; if (dbtn) { dbtn.hidden = !nd; dbtn.textContent = nd ? dtxt(nd) : ''; } }
    else if (nd && dbtn) { const txt = dtxt(nd); if (dbtn.textContent !== txt) dbtn.textContent = txt; } }
  }
  { const nm = P.mode === 'orbit' ? 'Modellansicht' : P.mode === 'top' ? 'Draufsicht' : null; if (nm && lastPlace !== nm) { lbl.textContent = nm; lastPlace = nm; if (dbtn) dbtn.hidden = true; lastDoor = null; if (window.PLAY) PLAY.update(0); } }
  if (updateDoors(dt)) markDirty();
  if (P.mode === 'top') sunFollow(P.tx, P.ty, THREE.MathUtils.clamp(P.th * 0.75 * Math.max(1, stage.clientWidth / Math.max(1, stage.clientHeight)), 16, 90));
  else if (!(window.VEH && VEH.sun())) sunFollow(P.mode === 'walk' ? P.x : P.tgt[0], P.mode === 'walk' ? P.y : P.tgt[1]);
  if (window.WORKS && WORKS.update && WORKS.update(dt)) markDirty();
  if (P.mode === 'walk') STREAM.listen(P.x, P.y); else if (P.mode === 'top') STREAM.listen(P.tx, P.ty); else STREAM.listen(2 + Math.sin(P.az * Math.PI / 180) * P.r * 0.5, 2 + Math.cos(P.az * Math.PI / 180) * P.r * 0.5);
  if (window.NPC) { try { NPC.update(dt); } catch (e) { if (!window._npcErr) { window._npcErr = 1; console.warn('npc', e); } } }
  audio.update(dt); }
function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); if (RENDER.composer) RENDER.composer.setSize(w, h); sizeMotion(); cam.aspect = w / h; cam.updateProjectionMatrix(); markDirty(); }
window._resize = resize;
window.addEventListener('resize', resize); if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
