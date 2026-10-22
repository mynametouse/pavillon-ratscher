// ---------- performance test: about 15 s, six typical views with the camera turning; reports frame rate, slow frames, GPU, resolution ----------
import { LATE } from '../core/late.js';
import { $, DPR, R, VARIANT } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { MLEVELS, MOTION, RENDER, renderFrame, TIERS } from './render.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { toast } from '../audio/audio.js';
const PERF = { running: false, js: 0, n: 0 };
LATE.PERF = PERF;
function gpuName() {
  try {
    const gl = R.getContext(),
      d = gl.getExtension('WEBGL_debug_renderer_info');
    return String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
      .replace(/ANGLE \(|\)$/g, '')
      .slice(0, 90);
  } catch (e) {
    return '?';
  }
}
export async function perfTest() {
  if (PERF.running) return;
  const box = $('perfbox'),
    out = $('perfout');
  if (!box || !out) return;
  PERF.running = true;
  box.hidden = false;
  const saved = { mode: P.mode, x: P.x, y: P.y, feet: P.feet, yaw: P.yaw, pitch: P.pitch, az: P.az, el: P.el, r: P.r };
  const views = [
    ['Modell', 'modell'],
    ['Garten', 'garten'],
    ['Vor der Tür', 'eingang'],
    ['Bibliothek', 'bibliothek'],
    ['Arbeitsraum', 'arbeitsraum'],
    ['Dachterrasse', 'dach'],
  ];
  const rows = [];
  let calls = 0,
    tris = 0,
    jsSum = 0,
    jsN = 0;
  for (const [name, spot] of views) {
    out.textContent = 'Messe: ' + name + ' …';
    go(spot);
    await new Promise(r => setTimeout(r, 150));
    const ts = [];
    const t0 = performance.now();
    let last = t0;
    PERF.js = 0;
    PERF.n = 0;
    await new Promise(done => {
      function tick(now) {
        const dt = now - last;
        last = now;
        if (now - t0 > 300) ts.push(dt);
        if (P.mode === 'walk') P.yaw += 0.8;
        else P.az += 0.5;
        markDirty();
        if (now - t0 < 2300) requestAnimationFrame(tick);
        else done();
      }
      requestAnimationFrame(tick);
    });
    ts.sort((a, b) => a - b);
    const avg = ts.reduce((s, v) => s + v, 0) / Math.max(1, ts.length);
    rows.push(
      `${name.padEnd(13)} ${(1000 / avg).toFixed(0).padStart(3)} Bilder/s · langsamste 5 %: ${ts[Math.floor(ts.length * 0.95)]?.toFixed(0) ?? '?'} ms`
    );
    R.info.autoReset = false;
    R.info.reset();
    renderFrame('still');
    calls += R.info.render.calls;
    tris += R.info.render.triangles;
    R.info.autoReset = true;
    jsSum += PERF.js;
    jsN += PERF.n;
  } // all passes of one full frame
  Object.assign(P, saved);
  document.body.dataset.mode = P.mode;
  markDirty(true);
  const c = R.domElement,
    pr = R.getPixelRatio();
  const txt = [
    `Leistungstest Pavillon Ratscher (Variante ${VARIANT === 'A' ? 'Turm' : 'Leiter'})`,
    `Grafik: ${gpuName()}`,
    `Stufe „${TIERS[RENDER.tier].label}“ · Bild ${c.width} × ${c.height} Pixel (Skalierung ${pr.toFixed(2)}, Bildschirm ${DPR.toFixed(2)}) · beim Bewegen Stufe ${MOTION.level} (${MOTION.level ? Math.round((MLEVELS[MOTION.level] || 1) * 100) + ' % Auflösung, ohne Effekte' : 'volle Qualität'})`,
    ...rows,
    `Rechenzeit JavaScript je Bild: ${(jsSum / Math.max(1, jsN)).toFixed(1)} ms · Zeichenaufrufe Ø ${Math.round(calls / views.length)} · Dreiecke Ø ${(tris / views.length / 1e6).toFixed(2)} Mio (alle Durchgänge eines scharfen Bildes)`,
    `Browser: ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 120)}`,
  ].join('\n');
  out.textContent = txt;
  PERF.text = txt;
  PERF.running = false;
  return txt;
}
$('perfbtn')?.addEventListener('click', () => {
  const box = $('perfbox');
  if (box && !box.hidden && !PERF.running) {
    box.hidden = true;
    return;
  }
  perfTest();
});
$('perfcopy')?.addEventListener('click', async () => {
  const t = PERF.text || $('perfout').textContent;
  try {
    await navigator.clipboard.writeText(t);
    toast('Ergebnis kopiert', 2000);
  } catch (e) {
    const r = document.createRange();
    r.selectNodeContents($('perfout'));
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    toast('Text markiert – mit Strg+C kopieren', 3000);
  }
});
$('perfclose')?.addEventListener('click', () => {
  $('perfbox').hidden = true;
});
window.perfTest = perfTest;
