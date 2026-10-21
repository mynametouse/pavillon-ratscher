# Raumführung (film) from the live model: python3 tour.py OUTDIR [fps]  — resumable (existing frames are skipped), variant B.
# Segments of camera keyframes (t s, x, y, eye height or level key, yaw ° (0 = north, 90 = east), pitch °); cuts between segments.
import sys, os, time, base64, json, math
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; FPS = int(sys.argv[2]) if len(sys.argv) > 2 else 12; os.makedirs(OUT, exist_ok=True)
W, H, FOV = 960, 540, 66
SEG = [  # (mode, [(t, x, y, z, yaw, pitch), ...])
  ('gold', [(0, 3.53, 33.0, 1.71, 180, 0), (6, 3.5, 26.5, 1.69, 178, -2), (12, 3.6, 19.0, 1.65, 174, -1), (18, 5.4, 12.0, 1.65, 196, 2),
            (24, 7.6, 6.4, 1.65, 228, 4), (28, 7.4, 3.6, 1.65, 268, 0)]),                                                        # über die Brücke, durch den Garten zur Haustür
  ('gold', [(28, 3.6, 3.1, 'zF', 292, -6), (34, 3.3, 2.9, 'zF', 245, -7), (40, 2.9, 2.6, 'zF', 200, -6)]),                    # Bibliothek
  ('gold', [(40, 3.0, 2.9, 'zO', 205, -8), (46, 2.7, 2.6, 'zO', 240, -5), (52, 2.4, 2.4, 'zO', 285, -4)]),                     # Arbeitsraum
  ('gold', [(52, 2.8, 3.4, 'zD', 250, -4), (58, 2.3, 3.0, 'zD', 215, -6), (64, 1.8, 2.6, 'zD', 175, -5)]),                      # Dachterrasse
  ('dusk', [(64, 1.7, 2.5, 'zD', 248, -2), (72, 1.6, 2.4, 'zD', 285, -1)]),                                                    # Sonnenuntergang
]
T_END = SEG[-1][1][-1][0]
def lerp(a, b, u): return a + (b - a) * u
def interp(keys, t, G):
    # Catmull-Rom through the keyframes (positions, yaw unwrapped), eased at the segment ends
    ks = [list(k) for k in keys]
    for k in ks:
        if isinstance(k[3], str): k[3] = G[k[3]] + 1.62
    for i in range(1, len(ks)):   # unwrap yaw
        while ks[i][4] - ks[i - 1][4] > 180: ks[i][4] -= 360
        while ks[i][4] - ks[i - 1][4] < -180: ks[i][4] += 360
    t0, t1 = ks[0][0], ks[-1][0]; u = (t - t0) / max(1e-6, t1 - t0); u = u * u * (3 - 2 * u)   # ease in/out over the whole segment
    tt = t0 + u * (t1 - t0)
    i = max(0, min(len(ks) - 2, max(j for j in range(len(ks) - 1) if ks[j][0] <= tt + 1e-9)))
    a, b = ks[i], ks[i + 1]; p0 = ks[i - 1] if i > 0 else a; p3 = ks[i + 2] if i + 2 < len(ks) else b
    s = (tt - a[0]) / max(1e-6, b[0] - a[0])
    def cr(q0, q1, q2, q3): return 0.5 * ((2 * q1) + (-q0 + q2) * s + (2 * q0 - 5 * q1 + 4 * q2 - q3) * s * s + (-q0 + 3 * q1 - 3 * q2 + q3) * s * s * s)
    return [cr(p0[k], a[k], b[k], p3[k]) for k in range(1, 6)]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}); pg.set_default_timeout(300000); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.add_init_script("try{localStorage.setItem('pav-variant','B')}catch(e){}")
    t0 = time.time(); pg.goto('http://localhost:%s/index.html?offline=1' % os.environ.get('PORT', '8765'), timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded()", timeout=900000, polling=2000)
    try: pg.wait_for_function("!window.CHARMAN || (window.NPC && NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=600000, polling=1000)
    except Exception as e: print('figures not ready', e)
    print('loaded', round(time.time() - t0), 's', flush=True)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate("GAME.setVariant('B'); GAME.setPhase(GAME.PHASES.length-1); GAME.doorsAll(true); NPC._u = NPC._u || NPC.update; NPC.update = () => {};")
    G = pg.evaluate("window.GEO"); n = int(round(T_END * FPS)); mode = None; last_seg = -1
    for i in range(n + 1):
        t = i / FPS; si = max(k for k, (m, ks) in enumerate(SEG) if ks[0][0] <= t + 1e-9); m, ks = SEG[si]
        f = os.path.join(OUT, 'f%05d.jpg' % i)
        if os.path.exists(f) and os.path.getsize(f) > 1000: last_seg = -1; continue
        x, y, z, yaw, pitch = interp(ks, min(t, ks[-1][0]), G)
        if m != mode: pg.evaluate(f"GAME.setMode('{m}')"); mode = m
        snap = si != last_seg; last_seg = si
        pg.evaluate(f"GAME.view({x:.4f}, {y:.4f}, {z:.4f}, {yaw:.3f}, {pitch:.3f}, {FOV}); NPC._u({1 / FPS}); GAME.film({1 / FPS}, {str(snap).lower()})")
        if snap: pg.evaluate(f"GAME.film(0.5, false); GAME.film(0.5, false)")   # first frame after a cut: shadow maps and exposure settle
        d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.92)"); open(f, 'wb').write(base64.b64decode(d.split(',')[1]))
        if i % 24 == 0: print('frame', i, '/', n, 't', round(t, 1), time.strftime('%H:%M:%S'), flush=True)
    print('frames done', n + 1, '| errors', errs[:5]); b.close()
