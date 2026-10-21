// ===================== V16b the small map while driving (MMAP) =====================
// A round map in the corner, turned with the vehicle (ahead is up): the roads and paths from world/roads.js by kind and surface, the route
// from the garden to the Untere Klinge, the garden, the other vehicle, north; below it the next destination with its distance (Klinge when
// near the garden, else the garden). Drawn on a 2D canvas ten times a second, only while driving; nothing in the 3D scene.
const MMAP = (() => {
  const cv = $('vmap'), lab = $('vmaplab'); if (!cv || !window.ROADS || !ROADS.on) return null;
  const g = cv.getContext('2d'), S = { t: 0, R: 160, bb: null };   // R: metres from the centre to the rim
  const COLK = { motorway: '#f2a07a', main: '#ffd27a', county: '#fff0a8', street: '#ffffff', lane: '#e8e4dc', service: '#e8e4dc', track: '#c9a874', path: '#b99b70', foot: '#c8b8a0' };
  const WID = { motorway: 4.5, main: 3.6, county: 3.2, street: 2.6, lane: 2.2, service: 1.8, track: 1.6, path: 1, foot: 1 };
  const bbox = () => S.bb || (S.bb = ROADS.ways.map(w => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < w.p.length; i += 2) { x0 = Math.min(x0, w.p[i]); x1 = Math.max(x1, w.p[i]); y0 = Math.min(y0, w.p[i + 1]); y1 = Math.max(y1, w.p[i + 1]); } return [x0, y0, x1, y1]; }));
  const ORDER = ['foot', 'path', 'track', 'service', 'lane', 'street', 'county', 'main', 'motorway'];
  // sharp on high-density screens: the canvas in device pixels, drawn in CSS pixels
  function fit() { const w = cv.clientWidth || 168, D = Math.min(2, window.devicePixelRatio || 1), n = Math.round(w * D); if (cv.width !== n) { cv.width = cv.height = n; } S.css = w; S.D = n / w; }
  function draw() { const v = VEH.cur; if (!v) return; fit(); g.setTransform(S.D, 0, 0, S.D, 0, 0); const W = S.css, H = W, r0 = W / 2, k = r0 / S.R, cx = v.st.x, cy = v.st.y, psi = v.st.psi, cs = Math.cos(psi), sn = Math.sin(psi);
    // world → canvas, ahead up: rotate by the heading
    const P = (x, y) => { const dx = x - cx, dy = y - cy, rx = dx * cs - dy * sn, ry = dx * sn + dy * cs; return [r0 + rx * k, r0 - ry * k]; };
    g.save(); g.clearRect(0, 0, W, H); g.beginPath(); g.arc(r0, r0, r0 - 1, 0, 7); g.clip(); g.fillStyle = 'rgba(28,32,24,0.78)'; g.fillRect(0, 0, W, H);
    const B = bbox(), R2 = S.R * 1.45; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const kind of ORDER) { g.strokeStyle = COLK[kind]; g.lineWidth = WID[kind]; g.beginPath();
      ROADS.ways.forEach((w, i) => { if (ROADS.KINDS[w.kind] !== kind) return; const b = B[i]; if (b[2] < cx - R2 || b[0] > cx + R2 || b[3] < cy - R2 || b[1] > cy + R2) return;
        for (let j = 0; j < w.p.length; j += 2) { const q = P(w.p[j], w.p[j + 1]); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } }); g.stroke(); }
    const rt = ROADS.routes.klinge; if (rt) { g.strokeStyle = 'rgba(255,196,64,0.75)'; g.lineWidth = 3.5; g.beginPath(); rt.forEach((p, j) => { const q = P(p[0], p[1]); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); }
    // the garden, the other vehicles
    { const q = P(2, 2); g.fillStyle = '#9fd37a'; g.beginPath(); g.arc(q[0], q[1], 4.5, 0, 7); g.fill(); }
    for (const o of VEH.list) { if (o === v) continue; const q = P(o.st.x, o.st.y); g.fillStyle = o.id === 'tractor' ? '#7fd36b' : '#e8dcc0'; g.fillRect(q[0] - 3.5, q[1] - 3.5, 7, 7); }
    // north on the rim, me in the middle
    { const q = [r0 - sn * (r0 - 10), r0 - cs * (r0 - 10)]; g.fillStyle = '#fff'; g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', q[0], q[1]); }
    g.fillStyle = '#ffd36b'; g.beginPath(); g.moveTo(r0, r0 - 8); g.lineTo(r0 + 5.5, r0 + 6); g.lineTo(r0, r0 + 3); g.lineTo(r0 - 5.5, r0 + 6); g.closePath(); g.fill();
    g.restore(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(r0, r0, r0 - 1, 0, 7); g.stroke();
    // the next destination
    if (lab && rt) { const J = rt[rt.length - 1], dG = Math.hypot(cx - 2, cy - 2), dJ = Math.hypot(cx - J[0], cy - J[1]), toK = dG < dJ, d = toK ? dJ : dG, txt = (toK ? 'Klinge ' : 'Garten ') + (d > 950 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');
      if (d < 60) { if (!lab.hidden) lab.hidden = true; } else { if (lab.hidden) lab.hidden = false; if (lab.textContent !== txt) lab.textContent = txt; } } }
  window.TICKS.push(dt => { const on = !!VEH.cur && P.mode === 'walk'; if (cv.hidden === on) { cv.hidden = !on; if (lab) lab.hidden = !on; } if (!on) return; S.t += dt; if (S.t < 0.1) return; S.t = 0; try { draw(); } catch (e) { if (!S.err) { S.err = 1; console.warn('mmap', e); } } });
  return S; })();
window.MMAP = MMAP;
