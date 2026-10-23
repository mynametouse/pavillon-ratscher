# Selectable player figures (feat/figuren, docs/plans/plan_leben.md 3): Falko, Sarah, Christoph – the menu control, the saved choice
# (the old value 'f' of "Frau" opens Sarah), each figure loads from its own file, Christoph 1–2 cm shorter than Falko, his cap and
# earbuds on the head in every pose and off under the forest helmet, protective gear on the new figures. Pictures front/side/back close up
# and full length while standing, walking, crouching → out/figuren/<figure>_<view>.jpg
#   python3 viz3/test/figuren.py PORT [figures, e.g. f,m,c – viz3/extra/figuren/tests.txt runs f,m and c as two parts]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else ['f', 'm', 'c']
OUT = lib.out('figuren')
ck = lib.Checks('figuren')
errs = []
NAME = {'m': 'falko', 'f': 'sarah', 'c': 'christoph'}
HELP = r"""
window.__F = {
  view: null, // camera for GAME.shot(): { az: degrees around the figure (0 = in front), d: distance, dh: up, at: 'head' | 'body', h, fov }
  install() {
    if (window.__FHOOK) return;
    window.__FHOOK = 1;
    const prev = window.PREFRAME;
    window.PREFRAME = () => { if (prev) prev(); if (__F.view) __F.aim(__F.view); };
  },
  aim(v) {
    const F = AVATAR.fig, cam = GAME.cam;
    if (!F) return;
    const V = () => cam.position.clone(), t = V(), fw = V().set(0, 0, -1).applyQuaternion(F.g.quaternion);
    if (v.at === 'head') F.B.Head.getWorldPosition(t).add(V().set(0, 0.07, 0));
    else F.g.getWorldPosition(t).add(V().set(0, v.h ?? 0.9, 0));
    const a = (v.az * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const dx = fw.x * ca + fw.z * sa, dz = -fw.x * sa + fw.z * ca;
    cam.position.set(t.x + dx * v.d, t.y + (v.dh || 0), t.z + dz * v.d);
    cam.fov = v.fov || 35; cam.near = 0.05; cam.updateProjectionMatrix(); cam.lookAt(t);
  },
  place() { __F.view = null; GAME.view(4.0, 9.0, 1.62, 180, -8); GAME.P.body = 180; GAME.setView3(true, true); GAME.step(0.6); },
  mats() { const s = new Set(); AVATAR.fig.model.traverse(x => { if (x.isMesh) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => s.add(m.name)); }); return [...s].join(' '); },
  headH() { const F = AVATAR.fig, p = F.B.Head.getWorldPosition(GAME.cam.position.clone()); return p.y - F.g.position.y; },
  hw() {
    const F = AVATAR.fig, h = F.hw;
    if (!h) return null;
    F.g.updateMatrixWorld(true);
    const box = (o) => { let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], n = 0; const v = GAME.cam.position.clone(), m = v.clone().set(0, 0, 0);
      o.traverse(x => { if (!x.isMesh) return; const p = x.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).applyMatrix4(x.matrixWorld); m.add(v); n++; lo = [Math.min(lo[0], v.x), Math.min(lo[1], v.y), Math.min(lo[2], v.z)]; hi = [Math.max(hi[0], v.x), Math.max(hi[1], v.y), Math.max(hi[2], v.z)]; } });
      return { lo, hi, mid: m.divideScalar(n || 1) }; };
    const eye = (() => { let e = null; F.model.traverse(x => { if (x.name === 'Bip01_LEye') e = x; }); return e ? e.getWorldPosition(GAME.cam.position.clone()) : null; })();
    const hd = F.B.Head.getWorldPosition(GAME.cam.position.clone()), c = box(h.cap.children[0]), b = box(h.buds);
    const cx = (c.lo[0] + c.hi[0]) / 2, cz = (c.lo[2] + c.hi[2]) / 2;
    // the cap's centroid in the head bone's own frame (m): the same in every pose if it sits on the head (a bounding box would not be)
    const s = F.B.Head.getWorldScale(GAME.cam.position.clone()).x, loc = F.B.Head.worldToLocal(c.mid.clone()).multiplyScalar(s);
    return { cap: h.cap.visible, buds: h.buds.visible, capLow: +(c.lo[1] - (eye ? eye.y : hd.y)).toFixed(3), capTop: +(c.hi[1] - hd.y).toFixed(3),
      capOff: +Math.hypot(cx - hd.x, cz - hd.z).toFixed(3), budsToHead: +Math.hypot((b.lo[0] + b.hi[0]) / 2 - hd.x, (b.lo[2] + b.hi[2]) / 2 - hd.z).toFixed(3),
      local: loc.toArray().map(x => +x.toFixed(4)) };
  },
};
__F.install();
"""
VIEWS_STAND = [('front', dict(az=0, d=0.95, at='head')), ('side', dict(az=90, d=0.95, at='head')), ('back', dict(az=180, d=0.95, at='head')),
               ('34', dict(az=35, d=1.0, dh=0.08, at='head')), ('full_front', dict(az=15, d=3.3, at='body', fov=40)),
               ('full_back', dict(az=165, d=3.3, at='body', fov=40))]
VIEWS_MOVE = [('side', dict(az=80, d=1.0, at='head')), ('back', dict(az=170, d=1.0, dh=0.1, at='head')), ('full', dict(az=60, d=3.3, at='body', fov=40))]


with lib.browser() as b:
    pg = lib.page(b, 900, 900, errs=errs, tier='mittel')
    pg.add_init_script("try { localStorage.setItem('pav-fig', 'f'); localStorage.setItem('pav-view', '3'); } catch (e) {}")  # the old value of "Frau"
    lib.boot(pg, port, figures=True)
    E = lambda js: pg.evaluate(js)
    E(HELP)
    E("QUESTS.reset(); GAME.setPhase(GAME.PHASES.length - 1); GAME.setMode('day')")

    def shot(name, view):
        E(f"__F.view = {json.dumps(view)}")
        lib.shot(pg, OUT, name)
        E("__F.view = null")

    def views(prefix, vs):
        for n, v in vs:
            shot(f'{prefix}_{n}', v)

    labels = E("[...document.querySelectorAll('#figseg [data-fig]')].map(b => b.dataset.fig + ':' + b.textContent).join(' ')")
    ck('menu offers Falko, Sarah, Christoph', labels == 'm:Falko f:Sarah c:Christoph', labels)
    ck('old saved value f opens Sarah', E("AVATAR.kind") == 'f', E("AVATAR.kind"))
    heights = {}
    if 'c' in ONLY and 'm' not in ONLY:   # a run with Christoph alone: Falko's height for the comparison, without pictures
        E("AVATAR.setKind('m')")
        pg.wait_for_function("AVATAR.ready && AVATAR.fig && AVATAR.fig.kind === 'm'", timeout=300000, polling=500)
        E("__F.place()")
        heights['m'] = E("__F.headH()")
    for k in ONLY:
        n = NAME[k]
        if E("AVATAR.kind") != k or not E("!!AVATAR.fig && AVATAR.fig.kind === AVATAR.kind"):
            pg.click('#menubtn')
            time.sleep(0.4)
            pg.click(f'#figseg [data-fig="{k}"]')
            time.sleep(0.3)
        pg.wait_for_function(f"AVATAR.ready && AVATAR.fig && AVATAR.fig.kind === '{k}'", timeout=300000, polling=500)
        pressed = E(f"document.querySelector('#figseg [data-fig=\"{k}\"]').getAttribute('aria-pressed')")
        E("HUD.setMenu(false)")
        ck(f'{n}: chosen in the menu, button pressed, saved', pressed == 'true' and E("SAVE.raw('pav-fig')") == k, f"pressed={pressed} saved={E('SAVE.raw(\"pav-fig\")')}")
        mats = E("__F.mats()")
        want = {'m': 'm112', 'f': 'player_sarah_hairop', 'c': 'player_christoph'}[k]   # Sarah: her own head with the new hair (cards)
        ck(f'{n}: own model loaded', want in mats, mats)
        if k == 'c':
            E("AVATAR.buds(true)")
        E("__F.place()")
        heights[k] = E("__F.headH()")
        lib.shot(pg, OUT, f'{n}_game')  # what the player sees: the shoulder camera behind the figure
        views(f'{n}_stand', VIEWS_STAND)
        if k == 'c':
            hw = E("__F.hw()")
            ck('christoph: cap and earbuds on, standing', hw and hw['cap'] and hw['buds'], json.dumps(hw))
            ck('christoph: cap above the eyes, over the head', hw and 0.0 < hw['capLow'] < 0.09 and 0.1 < hw['capTop'] < 0.3 and hw['capOff'] < 0.09, json.dumps(hw))
            local0 = hw and hw['local']
        same = lambda hw: bool(hw and local0 and max(abs(a - b) for a, b in zip(hw['local'], local0)) < 0.003)
        # walking (a normal pace), then crouching and crouch-walking
        E("GAME.step(0.7, 1, 0, 0, 0.55)")
        views(f'{n}_walk', VIEWS_MOVE)
        if k == 'c':
            hw = E("__F.hw()")
            ck('christoph: cap on the head while walking', same(hw) and 0.1 < hw['capTop'] < 0.3, json.dumps(hw))
        E("__F.place()")
        pg.keyboard.press('c')
        E("GAME.step(1.0)")
        st = E("GAME.P.stance")
        views(f'{n}_crouch', [('side', dict(az=80, d=1.1, dh=0.1, at='head')), ('front', dict(az=20, d=1.0, dh=0.15, at='head')),
                              ('full', dict(az=50, d=2.6, at='body', h=0.55, fov=40))])
        E("GAME.step(0.6, 1, 0, 0)")
        views(f'{n}_crouchwalk', [('side', dict(az=90, d=1.1, dh=0.1, at='head')), ('back', dict(az=165, d=1.6, dh=0.45, at='head'))])
        if k == 'c':
            hw = E("__F.hw()")
            ck('christoph: cap on the head while crouching (same place on the head bone)', st == 'crouch' and same(hw), f'stance {st} ' + json.dumps(hw))
        pg.keyboard.press('c')
        E("GAME.step(0.6)")
        # protective gear on the figure
        E("__F.place()")
        if k == 'c':
            E("AVATAR.wear({ head: 'forsthelm' }); GAME.step(0.1)")
            hw = E("__F.hw()")
            ck('christoph: no cap and no earbuds under the forest helmet', hw and not hw['cap'] and not hw['buds'], json.dumps(hw))
            shot('christoph_gear_helmet', dict(az=35, d=1.0, at='head'))
            E("AVATAR.wear({ eyes: 'brille', resp: 'ffp2' }); GAME.step(0.1)")
            hw = E("__F.hw()")
            ck('christoph: cap stays with goggles and mask', hw and hw['cap'], json.dumps(hw))
            shot('christoph_gear_goggles', dict(az=30, d=0.9, at='head'))
            E("AVATAR.wear({ ears: 'ohr' }); GAME.step(0.1)")
            ck('christoph: ear defenders replace cap and earbuds', not E("AVATAR.fig.hw.cap.visible || AVATAR.fig.hw.buds.visible"))
            shot('christoph_gear_ears', dict(az=60, d=0.9, at='head'))
            E("AVATAR.wear(null); AVATAR.buds(false); GAME.step(0.1)")
            ck('christoph: earbuds can be out', E("AVATAR.fig.hw.cap.visible && !AVATAR.fig.hw.buds.visible"))
            shot('christoph_nobuds', dict(az=70, d=0.9, at='head'))
            # next to Ronald (a conversation ends when the player is more than 5.5 m away)
            E("(() => { const r = NPC.NPCS.ronald; r.target = null; r.wait = 60; GAME.view(r.x + 1.6, r.y, 1.62, -90, -8); GAME.P.body = -90; })()")
            E("AVATAR.buds(null); GAME.step(0.2)")
            on0 = E("AVATAR.fig.hw.buds.visible")
            E("NPC.talk('ronald'); GAME.step(0.2)")
            talking = E("AVATAR.fig.hw.buds.visible")
            E("const b = document.getElementById('np-close'); if (b) b.click(); GAME.step(0.2)")
            after = E("AVATAR.fig.hw.buds.visible")
            ck('christoph: earbuds out while talking with a neighbour', on0 and not talking and after, f'before {on0}, talking {talking}, after {after}')
        elif k == 'f':
            E("AVATAR.wear({ eyes: 'brille', resp: 'ffp2', ears: 'ohr' }); GAME.step(0.1)")
            shot('sarah_gear_goggles', dict(az=30, d=0.9, at='head'))
            E("AVATAR.wear({ head: 'forsthelm' }); GAME.step(0.1)")
            shot('sarah_gear_helmet', dict(az=35, d=1.0, at='head'))
            E("AVATAR.wear(null); GAME.step(0.1)")
    if 'm' in heights and 'c' in heights:
        d = heights['c'] - heights['m']
        ck('christoph 1–2 cm shorter than falko', -0.025 < d < -0.005, f'head bone {heights["c"]:.3f} vs {heights["m"]:.3f} m ({d * 100:+.1f} cm)')
    E("AVATAR.setKind('christoph')")
    ck('names choose figures too', E("AVATAR.kind") == 'c')
    E("AVATAR.setKind('x')")
    ck('unknown figure ignored', E("AVATAR.kind") == 'c')
    E("AVATAR.setKind('m')")
    print('heights', json.dumps(heights), flush=True)
    ck.errors(errs)
ck.done()
