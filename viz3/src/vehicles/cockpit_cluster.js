// ===================== feat/cockpit: the faces – the instrument cluster and the navi's screen as canvas textures (CPFACE) =====================
// The cluster: a rev counter (0–7000 1/min, red from 6300) and a speedometer (0–200 km/h) as round dials, a coolant gauge and a fuel gauge
// in their lower gaps (their needles are meshes, vehicles/cockpit_build.js), between them a small display – the time of the game, the
// outside temperature, the gear (P R N D and the gear the automatic holds), the odometer and the trip, the control lights (low beam,
// automatic light, handbrake, stability control, battery and oil at the start). The dials' art is drawn once; the display only when what it
// shows changes. The navi: a 16:9 screen the minimap draws into (vehicles/minimap.js MMAP.drawTo), a bar with the destination.
//   CPFACE.cluster() → { w, h, dial, mat, draw(st) } · CPFACE.navi() → { w, h, mat, cv, g, tex, done() }
import * as THREE from 'three';
export const CPFACE = (() => {
  const W = 0.34,
    H = 0.12,
    PX = 1024,
    PY = Math.round((PX * H) / W),
    K = PX / W;
  const dial = { L: [-0.095, 0.004], R: [0.095, 0.004], r: 0.05 };
  const px = (x, y) => [PX / 2 + x * K, PY / 2 - y * K];
  const rad = d => (d * Math.PI) / 180;
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  // a dial's scale: values v0…v1 over 240° (math angles 210° → −30°), ticks every minor, numbers every major (divided by div)
  function scale(g, c, R, v0, v1, minor, major, div, red, map = px) {
    const [cx, cy] = map(c[0], c[1]),
      ang = v => rad(210 - ((v - v0) / (v1 - v0)) * 240);
    // the face: dark, a soft light from the top
    const gr = g.createRadialGradient(cx, cy - R * 0.4, R * 0.1, cx, cy, R);
    gr.addColorStop(0, '#1d2024');
    gr.addColorStop(1, '#090a0c');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, R, 0, 7);
    g.fill();
    if (red) {
      g.strokeStyle = '#d23a26';
      g.lineWidth = R * 0.07;
      g.beginPath();
      g.arc(cx, cy, R * 0.91, -ang(red), -ang(v1), false);
      g.stroke();
    }
    g.lineCap = 'butt';
    for (let v = v0; v <= v1 + 1e-6; v += minor) {
      const a = ang(v),
        mj = Math.abs(v / major - Math.round(v / major)) < 1e-6,
        half = !mj && Math.abs(v / (major / 2) - Math.round(v / (major / 2))) < 1e-6,
        r0 = R * (mj ? 0.8 : half ? 0.85 : 0.88),
        r1 = R * 0.95;
      g.strokeStyle = red && v > red + 1e-6 ? '#ff6a50' : '#e8ecf0';
      g.lineWidth = mj ? 4.2 : half ? 2.6 : 1.6;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1);
      g.stroke();
      if (mj) {
        g.fillStyle = '#f2f4f6';
        g.font = `600 ${Math.round(R * 0.16)}px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const rn = R * 0.64;
        g.fillText(String(Math.round(v / div)), cx + Math.cos(a) * rn, cy - Math.sin(a) * rn);
      }
    }
  }
  // a small gauge in a dial's lower gap: from lo (left) to hi (right) over 120°, with a mark in the middle and its two words
  function mini(g, c, R, lo, hi, warnLeft, sym) {
    const [cx, cy0] = px(c[0], c[1] - dial.r * 0.5),
      r = R * 0.3;
    for (let i = 0; i <= 4; i++) {
      const a = rad(150 - i * 30);
      g.strokeStyle = (warnLeft ? i === 0 : i === 4) ? '#ff6a50' : '#d8dde2';
      g.lineWidth = i % 2 ? 1.6 : 2.8;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r * 0.78, cy0 - Math.sin(a) * r * 0.78);
      g.lineTo(cx + Math.cos(a) * r, cy0 - Math.sin(a) * r);
      g.stroke();
    }
    g.fillStyle = '#c9ced4';
    g.font = `600 ${Math.round(R * 0.1)}px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(lo, cx + Math.cos(rad(150)) * r * 1.25, cy0 - Math.sin(rad(150)) * r * 1.25 + 4);
    g.fillText(hi, cx + Math.cos(rad(30)) * r * 1.25, cy0 - Math.sin(rad(30)) * r * 1.25 + 4);
    // the sign under the pivot: a thermometer or a fuel pump, drawn
    const s = R * 0.07,
      y = cy0 + r * 0.55;
    g.strokeStyle = '#c9ced4';
    g.lineWidth = 2;
    g.beginPath();
    if (sym === 'temp') {
      g.moveTo(cx, y - s);
      g.lineTo(cx, y + s * 0.4);
      g.moveTo(cx, y - s * 0.6);
      g.lineTo(cx + s * 0.5, y - s * 0.6);
      g.moveTo(cx, y - s * 0.15);
      g.lineTo(cx + s * 0.5, y - s * 0.15);
      g.stroke();
      g.beginPath();
      g.arc(cx, y + s * 0.6, s * 0.35, 0, 7);
      g.stroke();
    } else {
      g.strokeRect(cx - s * 0.6, y - s * 0.8, s * 0.9, s * 1.6);
      g.moveTo(cx - s * 0.45, y - s * 0.35);
      g.lineTo(cx + s * 0.15, y - s * 0.35);
      g.moveTo(cx + s * 0.3, y - s * 0.6);
      g.lineTo(cx + s * 0.7, y - s * 0.2);
      g.lineTo(cx + s * 0.7, y + s * 0.5);
      g.stroke();
    }
  }
  // a rounded rectangle path (roundRect is missing in older Safari)
  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function art() {
    const c = document.createElement('canvas');
    c.width = PX;
    c.height = PY;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, PY);
    bg.addColorStop(0, '#111316');
    bg.addColorStop(1, '#060708');
    g.fillStyle = bg;
    g.fillRect(0, 0, PX, PY);
    const R = dial.r * K;
    scale(g, dial.L, R, 0, 7000, 250, 1000, 1000, 6300);
    scale(g, dial.R, R, 0, 200, 5, 20, 1, 0);
    g.fillStyle = '#aab1b8';
    g.font = `500 ${Math.round(R * 0.09)}px ${FONT}`;
    g.textAlign = 'center';
    let [cx, cy] = px(dial.L[0], dial.L[1]);
    g.fillText('1/min ×1000', cx, cy + R * 0.3);
    [cx, cy] = px(dial.R[0], dial.R[1]);
    g.fillText('km/h', cx, cy + R * 0.3);
    mini(g, dial.L, R, 'C', 'H', false, 'temp');
    mini(g, dial.R, R, '0', '1/1', true, 'fuel');
    // the display between the dials: a dark glass with a fine frame
    const [x0, y0] = px(-0.033, 0.042),
      [x1, y1] = px(0.033, -0.042);
    g.fillStyle = '#04060a';
    g.strokeStyle = '#2a2f36';
    g.lineWidth = 3;
    rrect(g, x0, y0, x1 - x0, y1 - y0, 14);
    g.fill();
    g.stroke();
    return c;
  }
  // ---- the control lights: little vector signs ----
  function sign(g, kind, x, y, s) {
    g.save();
    g.translate(x, y);
    g.lineWidth = s * 0.1;
    g.lineCap = 'round';
    if (kind === 'low' || kind === 'auto') {
      g.strokeStyle = g.fillStyle = '#39e27a';
      g.beginPath();
      g.moveTo(-s * 0.05, -s * 0.38);
      g.bezierCurveTo(s * 0.42, -s * 0.38, s * 0.42, s * 0.38, -s * 0.05, s * 0.38);
      g.closePath();
      g.stroke();
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(-s * 0.18, i * s * 0.22);
        g.lineTo(-s * 0.48, i * s * 0.22 + s * 0.08);
        g.stroke();
      }
      if (kind === 'auto') {
        g.font = `700 ${Math.round(s * 0.42)}px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('A', s * 0.12, 0);
      }
    } else if (kind === 'hand') {
      g.strokeStyle = g.fillStyle = '#ff3b2f';
      g.beginPath();
      g.arc(0, 0, s * 0.3, 0, 7);
      g.stroke();
      for (const d of [-1, 1]) {
        g.beginPath();
        g.arc(0, 0, s * 0.45, d > 0 ? -0.7 : Math.PI - 0.7, d > 0 ? 0.7 : Math.PI + 0.7);
        g.stroke();
      }
      g.font = `700 ${Math.round(s * 0.36)}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('P', 0, s * 0.02);
    } else if (kind === 'esc') {
      g.strokeStyle = '#ffb02e';
      g.beginPath();
      g.moveTo(-s * 0.3, -s * 0.05);
      g.lineTo(s * 0.3, -s * 0.05);
      g.lineTo(s * 0.22, -s * 0.32);
      g.lineTo(-s * 0.22, -s * 0.32);
      g.closePath();
      g.stroke();
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * s * 0.1, s * 0.1);
        g.bezierCurveTo(d * s * 0.3, s * 0.2, d * s * 0.0, s * 0.32, d * s * 0.22, s * 0.44);
        g.stroke();
      }
    } else if (kind === 'batt') {
      g.strokeStyle = '#ff3b2f';
      g.strokeRect(-s * 0.36, -s * 0.22, s * 0.72, s * 0.46);
      g.beginPath();
      g.moveTo(-s * 0.2, 0);
      g.lineTo(-s * 0.06, 0);
      g.moveTo(-s * 0.13, -s * 0.07);
      g.lineTo(-s * 0.13, s * 0.07);
      g.moveTo(s * 0.08, 0);
      g.lineTo(s * 0.22, 0);
      g.stroke();
    } else if (kind === 'oil') {
      g.strokeStyle = '#ff3b2f';
      g.beginPath();
      g.moveTo(-s * 0.4, s * 0.2);
      g.lineTo(s * 0.18, s * 0.2);
      g.lineTo(s * 0.42, -s * 0.06);
      g.lineTo(s * 0.12, s * 0.0);
      g.lineTo(-s * 0.1, -s * 0.16);
      g.lineTo(-s * 0.4, -s * 0.16);
      g.closePath();
      g.stroke();
    }
    g.restore();
  }
  function cluster() {
    const base = art();
    const cv = document.createElement('canvas');
    cv.width = PX;
    cv.height = PY;
    const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    let last = '';
    // st: { clock, temp, gear, odo, trip, low, auto, hand, esc, check }
    function draw(st) {
      const key = JSON.stringify(st);
      if (key === last) return false;
      last = key;
      g.drawImage(base, 0, 0);
      const [cx] = px(0, 0),
        R = dial.r * K;
      g.textBaseline = 'middle';
      g.fillStyle = '#dfe6ee';
      g.font = `600 ${Math.round(R * 0.12)}px ${FONT}`;
      g.textAlign = 'left';
      let [x, y] = px(-0.029, 0.034);
      g.fillText(st.clock || '', x, y);
      g.textAlign = 'right';
      [x, y] = px(0.029, 0.034);
      g.fillText(st.temp || '', x, y);
      // the gear: P R N D and the gear the automatic holds
      g.textAlign = 'center';
      g.font = `700 ${Math.round(R * 0.38)}px ${FONT}`;
      [, y] = px(0, 0.008);
      g.fillStyle = '#ffffff';
      g.fillText(st.gear || '', cx, y);
      g.font = `500 ${Math.round(R * 0.105)}px ${FONT}`;
      g.fillStyle = '#c2cad3';
      [, y] = px(0, -0.017);
      g.fillText(st.odo || '', cx, y);
      [, y] = px(0, -0.026);
      g.fillText(st.trip || '', cx, y);
      // the control lights in a row at the display's foot
      const on = [];
      if (st.low) on.push(st.auto ? 'auto' : 'low');
      if (st.hand) on.push('hand');
      if (st.esc) on.push('esc');
      if (st.check) on.push('batt', 'oil');
      const s = R * 0.17,
        [, yy] = px(0, -0.036);
      on.forEach((k, i) => sign(g, k, cx + (i - (on.length - 1) / 2) * s * 1.15, yy, s));
      tex.needsUpdate = true;
      return true;
    }
    return { w: W, h: H, dial, mat, tex, draw, cv };
  }
  // ---- the tractor's pod on the column: one rev dial and a small display (speed, gear, engine hours) ----
  function tractor() {
    const w = 0.2,
      h = 0.078,
      TX = 512,
      TY = Math.round((TX * h) / w),
      k = TX / w,
      map = (x, y) => [TX / 2 + x * k, TY / 2 - y * k],
      dl = { c: [-0.052, -0.002], r: 0.034 };
    const base = document.createElement('canvas');
    base.width = TX;
    base.height = TY;
    {
      const g = base.getContext('2d');
      g.fillStyle = '#0b0c0d';
      g.fillRect(0, 0, TX, TY);
      scale(g, dl.c, dl.r * k, 0, 3000, 100, 500, 100, 2350, map);
      g.fillStyle = '#aab1b8';
      g.font = `500 ${Math.round(dl.r * k * 0.14)}px ${FONT}`;
      g.textAlign = 'center';
      const [cx, cy] = map(dl.c[0], dl.c[1]);
      g.fillText('1/min ×100', cx, cy + dl.r * k * 0.36);
      const [x0, y0] = map(0.0, 0.03),
        [x1, y1] = map(0.092, -0.03);
      g.fillStyle = '#05070a';
      g.strokeStyle = '#2a2f36';
      g.lineWidth = 2;
      rrect(g, x0, y0, x1 - x0, y1 - y0, 10);
      g.fill();
      g.stroke();
    }
    const cv = document.createElement('canvas');
    cv.width = TX;
    cv.height = TY;
    const g = cv.getContext('2d'),
      tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    let last = '';
    // st: { kmh, gear, hours, fuel, low, hand }
    function draw(st) {
      const key = JSON.stringify(st);
      if (key === last) return false;
      last = key;
      g.drawImage(base, 0, 0);
      g.textBaseline = 'middle';
      let [x, y] = map(0.046, 0.008);
      g.fillStyle = '#ffffff';
      g.textAlign = 'right';
      g.font = `700 64px ${FONT}`;
      g.fillText(st.kmh, x + 20, y);
      g.textAlign = 'left';
      g.font = `500 22px ${FONT}`;
      g.fillStyle = '#c2cad3';
      g.fillText('km/h', x + 28, y + 12);
      [x, y] = map(0.006, 0.021);
      g.font = `700 26px ${FONT}`;
      g.fillStyle = '#ffd36b';
      g.fillText(st.gear || '', x, y);
      [x, y] = map(0.006, -0.021);
      g.font = `500 20px ${FONT}`;
      g.fillStyle = '#c2cad3';
      g.fillText(st.hours || '', x, y);
      // fuel: a bar on the right edge
      const [fx0, fy0] = map(0.084, 0.024),
        [fx1, fy1] = map(0.088, -0.024);
      g.fillStyle = '#2a2f36';
      g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      g.fillStyle = st.fuel < 0.15 ? '#ff6a50' : '#9fd37a';
      const fh = (fy1 - fy0) * Math.max(0, Math.min(1, st.fuel || 0));
      g.fillRect(fx0, fy1 - fh, fx1 - fx0, fh);
      const on = [];
      if (st.low) on.push('low');
      if (st.hand) on.push('hand');
      on.forEach((kk, i) => sign(g, kk, map(0.064, 0.021)[0] + i * 30, map(0, 0.021)[1], 26));
      tex.needsUpdate = true;
      return true;
    }
    return { w, h, mat, draw, dial: dl };
  }
  // ---- the navi's screen: 16:9, drawn by the minimap and the cockpit (a bar with the destination, the time) ----
  function navi() {
    const w = 0.2,
      h = 0.1125,
      cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 288;
    const g = cv.getContext('2d');
    g.fillStyle = '#0d1014';
    g.fillRect(0, 0, 512, 288);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    return { w, h, cv, g, tex, mat, done: () => (tex.needsUpdate = true) };
  }
  return { cluster, navi, tractor, W, H, dial, rrect };
})();
