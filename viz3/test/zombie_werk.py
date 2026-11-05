# feat/zombie-werk (Falko 5.11.2026, 17:57: „Basteln und Reparieren“): the workbench in the garden workshop – the action, the panel, each
# recipe (supplies taken, the result in the backpack or the hand, game time passed), the nail board in first person and a hit with it,
# repairing and sharpening change the numbers; the molotov thrown at two held zombies (fire, damage over time, a burning zombie dies, the
# light borrowed and given back); no new shader programs; the saved state survives a reload; no page errors. Pictures in out/zombie_werk/.
#   python3 viz3/test/zombie_werk.py 8997 [bank,molotow,reload]      (sections; default: all)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
SECT = set((sys.argv[2] if len(sys.argv) > 2 else 'bank,molotow,reload').split(','))
ck = lib.Checks('zombie_werk')
OUT = lib.out('zombie_werk')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 960, 560, errs)
    lib.boot(pg, port, '?szenario=zombie', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    def page_pic(name):
        try:
            E("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png')); print('page shot', name, flush=True)
        except Exception as e: print('page shot failed', name, e)
    progs = lambda: E("GAME.R.info.programs.length")
    # in front of the garden bench, looking at it (the zombie night is on: ?szenario=zombie)
    def to_bench():
        E("""(() => { const b = ZWERK.gardenBench(), P = GAME.P; P.x = b.x; P.y = b.y; P.feet = GAME.floorAt(P.x, P.y, 0.5);
          P.yaw = P.body = Math.atan2(b.top[0] - P.x, b.top[1] - P.y) * 180 / Math.PI; P.pitch = -18; CAM3.want = false; })()""")
        steps(0.4)
    E("ZSTATE.hp = 100; ZSTATE.food = 90; CAM3.want = false")
    steps(1.0)
    # the first-person arms and a weapon once in view before counting (their programs come with the night: zombie/z_fp.js prewarm)
    E("PLAY.give(ZWAFFE.thing('spaten'))")
    steps(0.6); E("GAME.shot()")
    time.sleep(2.0); steps(0.3); E("GAME.shot()")
    p0 = progs()
    print('programs at the start', p0, flush=True)
    if 'bank' in SECT:
        to_bench()
        lab = E("(() => { const b = document.getElementById('doorbtn'); return b && !b.hidden ? b.textContent : ''; })()")
        ck('at the garden bench the button says „An der Werkbank basteln“', 'Werkbank basteln' in lab, lab)
        pic('01_werkbank')
        # sound on (the audio context – the recordings load with the panel)
        E("GAME.setSound(true)")
        # supplies for everything: 5 boards, 3 nails, a bottle, a litre of petrol, two rags
        E("for (const [k, n] of [['brett', 5], ['nagel', 3], ['flasche', 1], ['benzin', 1], ['lappen', 2]]) ZSTATE.add(k, n)")
        sup0 = J("ZSTATE.sup")
        E("PLAY.primary()")
        steps(0.3)
        inf = J("ZWERK.info()")
        vis = E("!document.getElementById('zwerk').hidden")
        ck('the action opens the panel (garden)', inf['open'] and vis and inf['where'] == 'garten', str(inf))
        ck('the panel lists the nail board and the molotov, both buildable', ['bau', 'nagelbrett', True] in inf['rows'] and ['bau', 'molotow', True] in inf['rows'], str(inf['rows']))
        page_pic('02_panel')
        # the recordings of the workbench and the molotov (viz3/extra/zombie-werk/dist/zombie/werk/) – when the page has sound at all
        if E("!!(GAME.audio && GAME.audio.raw && GAME.audio.raw())"):
            for i in range(20):
                if J("ZWERK.info().rec") >= 15: break
                time.sleep(0.5)
            ck('the 15 recordings of the workbench and the molotov are loaded', J("ZWERK.info().rec") >= 15, str(J("ZWERK.info().rec")))
        else:
            print('note: no audio context in this browser – the recordings are not checked', flush=True)
        # the panel on a phone-sized view (portrait): it fits, the buttons stay big enough to tap
        pg.set_viewport_size({'width': 390, 'height': 760}); time.sleep(0.5); steps(0.1)
        box = J("(() => { const r = document.getElementById('zwerk').getBoundingClientRect(), b = document.querySelector('#zwerk .zwr button').getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom, b.width, b.height]; })()")
        page_pic('02b_panel_handy')
        ck('on a phone the panel fits the screen, its buttons ≥ 34 px high', box[0] >= 0 and box[1] <= 390 and box[3] <= 760 and box[5] >= 34, str(box))
        pg.set_viewport_size({'width': 960, 'height': 560}); time.sleep(0.5); steps(0.1)
        # Esc closes it, the action opens it again
        pg.keyboard.press('Escape'); steps(0.1)
        ck('Esc closes the panel', not J("ZWERK.info().open") and not E("HUD.open"))
        E("PLAY.primary()"); steps(0.2)
        # ---- the nail board: 2 boards + 1 nails, 15 game minutes ----
        t0 = E("CLOCK.t")
        E("(() => { const i = ZWERK.rows.findIndex(r => r.id === 'nagelbrett' && r.kind === 'bau'); ZWERK.start(ZWERK.rows[i]); })()")
        steps(0.8)
        jb = J("ZWERK.info().job")
        page_pic('03_bauen')
        ck('building runs (a job with a progress bar)', jb and jb['id'] == 'nagelbrett', str(jb))
        steps(3.5)
        st = J("({ cur: ZWAFFE.cur(), sup: ZSTATE.sup, cond: ZWAFFE.state('nagelbrett').cond, t: CLOCK.t, job: ZWERK.info().job })")
        dt_min = st['t'] - t0
        ck('nail board built: 2 boards and 1 nails taken, the board in the hand', st['cur'] == 'nagelbrett' and st['sup'].get('brett') == sup0['brett'] - 2 and st['sup'].get('nagel') == sup0['nagel'] - 1 and st['cond'] == 100 and not st['job'], str(st))
        ck('game time passed (~15 min)', 12 <= dt_min <= 20, f'{dt_min:.1f} min')
        # ---- the molotov: a bottle, a litre of petrol, a rag ----
        E("(() => { const i = ZWERK.rows.findIndex(r => r.id === 'molotow'); ZWERK.start(ZWERK.rows[i]); })()")
        steps(4.0)
        st = J("ZSTATE.sup")
        ck('molotov built: bottle, petrol and a rag taken, one molotov in the backpack', st.get('molotow') == 1 and not st.get('flasche') and not st.get('benzin') and st.get('lappen') == sup0['lappen'] - 1, str(st))
        hud = E("document.getElementById('zwk').textContent")
        ck('the panel under the weapon names the molotov key', 'Molotow' in hud, hud)
        E("ZWERK.close()")
        # ---- the nail board in first person: ready, a swing ----
        E("CAM3.want = false; GAME.go('garten'); GAME.P.pitch = -4; ZFP.lastAtk = ZFP.time")
        steps(0.9); E("ZFP.lastAtk = ZFP.time"); steps(0.3)
        E("GAME.shot()")
        fp = J("ZFP.info()")
        ck('first person: the nail board in both hands (the figure\'s arms)', fp['shown'] and fp['id'] == 'nagelbrett' and fp['rig'], str(fp))
        ck('… and in view', fp['view'] and abs(fp['view'][0]) < 1.05 and fp['view'][1] > -1.1, str(fp['view']))
        pic('04_nagelbrett')
        E("ZSTATE.stam = 100; ZWAFFE.press()")
        steps(0.17); pic('05_schlag_1')
        steps(0.11); pic('06_schlag_2')
        E("ZWAFFE.release()"); steps(1.0)
        # a hit on a held zombie in front (aware of us – a blow on one unaware counts three times, zombie/z_horde.js): damage and wear
        E("""(() => { const P = GAME.P, a = P.yaw * Math.PI / 180, e = ZHORDE.ent(ZFIG.people()[0], P.x + Math.sin(a) * 1.0, P.y + Math.cos(a) * 1.0, P.feet, P.yaw + 180);
          e.hold = 'idle'; e.st = 'chase'; e.hp = 500; window.__z1 = e.id; })()""")
        steps(0.2)
        h0 = E("ZSTATE.ents.find(e => e.id === __z1).hp")
        c0 = E("ZWAFFE.state('nagelbrett').cond")
        E("ZSTATE.stam = 100; ZWAFFE.press()"); steps(0.4); E("ZWAFFE.release()"); steps(0.6)
        h1 = E("ZSTATE.ents.find(e => e.id === __z1).hp")
        c1 = E("ZWAFFE.state('nagelbrett').cond")
        ck('a blow with the nail board hurts (~31)', 20 < h0 - h1 < 45, f'{h0 - h1:.1f}')
        ck('… and wears it fast (2–5 per hit)', 2 <= c0 - c1 <= 5, f'{c0 - c1:.2f}')
        # ---- repairing: worn to 30 %, one board and nails at the bench ----
        E("ZWAFFE.state('nagelbrett').cond = 30")
        to_bench()
        E("ZWERK.openAt(ZWERK.gardenBench())"); steps(0.2)
        rows = J("ZWERK.info().rows")
        ck('the panel offers to repair the worn nail board', ['fix', 'nagelbrett', True] in rows, str(rows))
        b0 = J("[ZSTATE.sup.brett || 0, ZSTATE.sup.nagel || 0]")
        E("(() => { const i = ZWERK.rows.findIndex(r => r.kind === 'fix' && r.id === 'nagelbrett'); ZWERK.start(ZWERK.rows[i]); })()")
        steps(4.0)
        st = J("[ZWAFFE.state('nagelbrett').cond, ZSTATE.sup.brett || 0, ZSTATE.sup.nagel || 0]")
        ck('repaired: condition 100, one board and one nails used', st[0] == 100 and st[1] == b0[0] - 1 and st[2] == b0[1] - 1, str(st))
        # ---- sharpening the axe: +30 % for 25 hits ----
        E("PLAY.give(ZWAFFE.thing('axt'))"); steps(0.3)
        E("ZWERK.render()")
        rows = J("ZWERK.info().rows")
        ck('the panel offers to sharpen the axe', ['sharp', 'axt', True] in rows, str(rows))
        E("(() => { const i = ZWERK.rows.findIndex(r => r.kind === 'sharp' && r.id === 'axt'); ZWERK.start(ZWERK.rows[i]); })()")
        steps(4.0)
        sh = J("[ZWERK.sharp('axt'), ZWAFFE.dmgK('axt'), ZWAFFE.dmgK('nagelbrett')]")
        ck('the axe is sharp: 25 hits at ×1.3 (the nail board stays ×1)', sh == [25, 1.3, 1], str(sh))
        page_pic('07_panel_reparieren')
        E("ZWERK.close()")
        E("""(() => { const P = GAME.P, a = P.yaw * Math.PI / 180, e = ZSTATE.ents.find(q => q.id === __z1);
          e.x = P.x + Math.sin(a) * 1.1; e.y = P.y + Math.cos(a) * 1.1; e.z = P.feet; e.hp = 500; e.st = 'chase'; })()""")
        steps(0.2)
        h0 = E("ZSTATE.ents.find(e => e.id === __z1).hp")
        E("ZSTATE.stam = 100; ZWAFFE.press()"); steps(0.55); E("ZWAFFE.release()"); steps(0.8)
        h1 = E("ZSTATE.ents.find(e => e.id === __z1).hp")
        ck('a sharp axe strikes harder (58 × 1.3 ± 15 %) and one sharp hit is used', 58 * 1.3 * 0.84 < h0 - h1 < 58 * 1.3 * 1.16 and E("ZWERK.sharp('axt')") == 24, f'{h0 - h1:.1f}, left {E("ZWERK.sharp(" + chr(39) + "axt" + chr(39) + ")")}')
        hud = E("document.getElementById('zwi').textContent")
        ck('the panel under the weapon shows the sharp edge', 'scharf' in hud, hud)
        # the thought when a weapon is nearly worn out
        E("PLAY.give(ZWAFFE.thing('nagelbrett')); ZWAFFE.state('nagelbrett').cond = 15")
        steps(0.6)
        th = E("(() => { const s = document.getElementById('npcsub'); return s && !s.hidden ? s.textContent : ''; })()")
        ck('nearly worn out: a short thought', 'Werkbank' in th, th)
        E("ZWAFFE.state('nagelbrett').cond = 80; ZHORDE.remove(ZSTATE.ents.find(e => e.id === __z1))")
        steps(0.3)
        E("GAME.shot()")
        p1 = progs()
        ck('no new shader programs (the workbench, the nail board)', p1 <= p0, f'{p0} → {p1}')
        # ---- a cellar bench in a village house: first its drawer is searched, then one crafts there ----
        cand = J("""(() => { GAME.go('dorf'); const P = GAME.P;
          return ZHAUS.doors().map(h => ({ id: h.id, d: Math.hypot(h.door.x - P.x, h.door.y - P.y) })).filter(o => o.d > 4)
            .sort((a, b) => a.d - b.d).slice(0, 40).filter(o => { try { return ZINNEN.info(o.id).cellar; } catch (e) { return false; } })
            .slice(0, 5).map(o => o.id); })()""")
        found = None
        for hid in cand:
            E(f"(async () => {{ await ZHAUS.enter(ZHAUS.doors().find(h => h.id === {hid})); }})()")
            for i in range(40):
                time.sleep(0.4)
                if E("!!ZHAUS.H && !ZHAUS.busy"): break
            steps(0.2)
            if E("!!(ZHAUS.H && ZHAUS.H.containers.some(c => c.kind === 'werkbank'))"):
                found = hid; break
            E("(async () => { await ZHAUS.leave(); })()")
            for i in range(30):
                time.sleep(0.4)
                if E("!ZHAUS.H && !ZHAUS.busy"): break
        if found is None:
            print('note: no cellar bench in the', len(cand), 'houses tried', cand, flush=True)
        else:
            E("""(() => { const H = ZHAUS.H, c = H.containers.find(c => c.kind === 'werkbank'), r = H.rooms.find(q => q.id === c.room) || H.rooms[0],
              cx = r.poly.reduce((s, q) => s + q[0], 0) / r.poly.length, cy = r.poly.reduce((s, q) => s + q[1], 0) / r.poly.length,
              dx = cx - c.pos[0], dy = cy - c.pos[1], L = Math.hypot(dx, dy) || 1, P = GAME.P;
              P.x = c.pos[0] + (dx / L) * 0.8; P.y = c.pos[1] + (dy / L) * 0.8; P.feet = GAME.floorAt(P.x, P.y, c.pos[2] - 0.4);
              P.yaw = P.body = Math.atan2(c.pos[0] - P.x, c.pos[1] - P.y) * 180 / Math.PI; P.pitch = -20; window.__wb = c.id; })()""")
            steps(0.4)
            # (the button picks the nearest of the room's actions – a light switch may be nearer; here the bench's own two)
            act = lambda: J("""(() => { const a = KERN.acts().find(a => a.id === 'zwerk:haus'), c = KERN.acts().find(a => a.id.endsWith(':c:' + __wb));
              return { lab: a && a.label(), prio: a && a.prio, cprio: c && c.prio, clab: c && c.label() }; })()""")
            a1 = act()
            E("KERN.acts().find(a => a.id.endsWith(':c:' + __wb)).run()")
            steps(0.6)
            a2 = act()
            ck('in a cellar: the drawer of the bench first, then „An der Werkbank basteln“ before it', a1['lab'] == 'An der Werkbank basteln' and a1['prio'] < a1['cprio'] and a2['prio'] > a2['cprio'], f'{a1} → {a2}')
            E("KERN.acts().find(a => a.id === 'zwerk:haus').run()"); steps(0.3)
            inf = J("ZWERK.info()")
            ck('the panel opens at the cellar bench', inf['open'] and inf['where'] == 'haus', str(inf)[:200])
            page_pic('09_keller')
            E("ZWERK.close()")
            E("(async () => { await ZHAUS.leave(); })()")
            for i in range(30):
                time.sleep(0.4)
                if E("!ZHAUS.H && !ZHAUS.busy"): break
    if 'molotow' in SECT:
        # ---- the molotov: at the Anger (the shared lights are lent beyond 60 m of the pavilion), at dusk, two held zombies 4.5 m ahead ----
        E("CLOCK.focus('zwtest')")
        E("(() => { const d = Math.floor(CLOCK.t / 1440); CLOCK.t = d * 1440 + ZOMBIE.times().siren - 12; })()")
        lib.settle_light(pg)
        E("GAME.go('dorf'); CAM3.want = false; PLAY.give(ZWAFFE.thing('beil'))")
        steps(0.6)
        E("""(() => { const P = GAME.P; P.pitch = -10; const a = P.yaw * Math.PI / 180, fx = Math.sin(a), fy = Math.cos(a), out = [];
          for (const [d, s] of [[4.5, 0], [4.9, 0.9]]) { const x = P.x + fx * d + fy * s, y = P.y + fy * d - fx * s,
            e = ZHORDE.ent(ZFIG.people()[out.length % ZFIG.people().length], x, y, GAME.floorAt(x, y, P.feet + 0.5), P.yaw + 180);
            e.hold = 'idle'; e.hp = out.length ? 250 : 100; out.push(e.id); }
          window.__zm = out; })()""")
        t0 = time.time()
        while time.time() - t0 < 40 and not E("__zm.every(id => { const e = ZSTATE.ents.find(q => q.id === id); return e && e.F; })"):
            steps(0.2); time.sleep(0.5)
        steps(0.3)
        pic('m0_vorher')
        pA = progs()
        keysA = J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])")
        # three molotovs in the backpack: their flames and the bottle are drawn once as specks (zombie/z_werk_molotow.js warm – it runs
        # by itself with the first molotov; the test loop draws only on GAME.shot, so it is re-armed here), then the count
        E("ZSTATE.add('molotow', 3); ZMOLO.warm(true)"); steps(0.05); E("GAME.shot()"); steps(0.05); E("GAME.shot()"); steps(0.2); E("GAME.shot()")
        pm0 = progs()
        keys0 = J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])")
        hud = E("document.getElementById('zwk').textContent")
        nm = E("ZSTATE.sup.molotow || 0")
        ck('the panel names the key: F: Molotow (n)', f'F: Molotow ({nm})' in hud, hud)
        full0 = E("document.body.dataset.full || ''")
        pg.keyboard.press('f')
        steps(0.5)
        inf = J("ZMOLO.info()")
        ck('F throws: the left hand takes the bottle, the rag burns (first person)', inf['thr'] and inf['thr']['fp'] and inf['thr']['lit'] and J("ZFP.info().clip") == 'throw', str(inf['thr']))
        ck('… and F does not toggle full screen in the zombie night', (E("document.body.dataset.full || ''")) == full0)
        pic('m1_hand')
        steps(0.25); pic('m2_ausholen')
        steps(0.12)
        inf = J("ZMOLO.info()")
        ck('the bottle flies', len(inf['bottles']) == 1, str(inf['bottles']))
        pic('m3_wurf')
        hp = lambda: J("__zm.map(id => { const e = ZSTATE.ents.find(q => q.id === id); return e ? [Math.round(e.hp), e.dead] : null; })")
        for i in range(30):
            steps(0.05)
            if J("ZMOLO.info().fires.length"): break
        inf = J("ZMOLO.info()")
        ck('it shatters among the zombies: a fire', len(inf['fires']) == 1 and not inf['bottles'], str(inf))
        steps(0.5)
        inf = J("ZMOLO.info()")
        ck('both zombies catch fire', set(inf['burning']) >= set(J("__zm")), str(inf['burning']))
        ck('the fire borrowed a light (no new light)', any(l['has'] == 1 for l in inf['lights']), str(inf['lights']))
        E("GAME.P.pitch = -6")
        pic('m4_feuer')
        h1 = hp()
        steps(1.5)
        h2 = hp()
        ck('damage over time', h2[0][0] < h1[0][0] and h2[1][0] < h1[1][0], f'{h1} → {h2}')
        pic('m5_brennen')
        k0 = E("ZSTATE.kills")
        for i in range(20):
            steps(0.5)
            if hp()[0][1]: break
        st = hp()
        ck('a burning zombie dies (a kill)', st[0][1] and E("ZSTATE.kills") > k0, f'{st} kills {E("ZSTATE.kills")}')
        pic('m6_tot')
        # third person: the fire from a step back
        E("CAM3.want = true"); steps(0.4); pic('m7_dritte_person'); E("CAM3.want = false"); steps(0.3)
        steps(8.0)
        inf = J("ZMOLO.info()")
        ck('after ~8 s the fire is out and the light went back', not inf['fires'] and all(l['has'] == 0 for l in inf['lights']), str(inf))
        ck('the tougher one burned on after the fire (more harm)', hp()[1][0] < h2[1][0] - 40 or hp()[1][1], str(hp()))
        # the player standing in a fire is hurt; a fire from the other player (zombie/z_netz.js event) appears and does not hurt zombies
        E("ZSTATE.hp = 100; ZMOLO.fire(GAME.P.x, GAME.P.y, GAME.P.feet, false)")
        steps(1.2)
        ck('standing in it hurts', E("ZSTATE.hp") < 92, str(E("ZSTATE.hp")))
        # (out of it again, or the 8 s would kill)
        E("(() => { const P = GAME.P, a = P.yaw * Math.PI / 180; P.x -= Math.sin(a) * 3.5; P.y -= Math.cos(a) * 3.5; P.feet = GAME.floorAt(P.x, P.y, P.feet + 0.5); ZSTATE.hp = 100; })()")
        steps(8.0)
        E("""(() => { const P = GAME.P, a = P.yaw * Math.PI / 180, x = P.x + Math.sin(a) * 5, y = P.y + Math.cos(a) * 5,
          e = ZSTATE.ents.find(q => q.id === __zm[1]); if (e && !e.dead) { e.x = x; e.y = y; e.hp = 300; }
          KERN.emit('znetz:ev', { d: { k: 'feuer', x, y, z: GAME.floorAt(x, y, P.feet + 0.5) }, from: 'p2' }); })()""")
        steps(1.0)
        inf = J("ZMOLO.info()")
        e2 = hp()[1]
        ck('the other player\'s fire shows here (net) and leaves the damage to him', len(inf['fires']) == 1 and inf['fires'][0]['net'] and (e2[1] or e2[0] == 300), f'{inf["fires"]} {e2}')
        steps(8.0)
        # third person: the bottle in the figure's hand, then thrown – with a stand-in for the room of two (zombie/z_netz.js): the fire goes out
        E("window.__sent = []; ZNETZ.on = true; ZNETZ.T = { peers: new Set(), send: (t, d) => __sent.push([t, d]) }")
        E("CAM3.want = true; GAME.P.pitch = 0"); steps(0.5)
        E("ZMOLO.throwIt()"); steps(0.2)
        t3 = J("ZMOLO.info().thr")
        pic('m8_dritte_person_wurf')
        steps(0.35)
        ck('third person: the bottle in the figure\'s hand, then it flies', t3 and t3['tb'] and not t3['fp'] and len(J("ZMOLO.info().bottles")) == 1, f'{t3} {J("ZMOLO.info().bottles")}')
        steps(3.0)
        sent = J("__sent.filter(m => m[0] === 'ev' && m[1] && m[1].k === 'feuer')")
        E("ZNETZ.on = false; ZNETZ.T = null")
        ck('two players: the fire is sent over the room (event „feuer“ with its place)', len(sent) == 1 and all(k in sent[0][1] for k in ('x', 'y', 'z')), str(sent)[:200])
        E("CAM3.want = false"); steps(8.0)
        E("GAME.shot()")
        pm1 = progs()
        keys1 = J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])")
        def new_progs(before, after):
            old_set = set(k for _, k in before)
            out = []
            for n, k in after:
                if k in old_set: continue
                ks = k.split(','); best = None
                for n0, k0 in before:
                    if n0 != n: continue
                    k0s = k0.split(',')
                    d = [(i, a, b) for i, (a, b) in enumerate(zip(k0s, ks)) if a != b] + ([('len', len(k0s), len(ks))] if len(k0s) != len(ks) else [])
                    if best is None or len(d) < len(best): best = d
                out.append((n, (best or [])[:4]))
            return out
        import re as _re
        fig = lambda l: [x for x in l if _re.match(r'^[a-z]+\d+_', x[0] or '')]  # the people's own materials (zombie/z_fig.js): theirs, not ours
        warmNew, fireNew = new_progs(keysA, keys0), new_progs(keys0, keys1)
        print('programs the warm-up compiled (name, differing key fields):', warmNew, flush=True)
        print('programs compiled during the throw and the fire:', fireNew, flush=True)
        ours = [x for x in fireNew if x not in fig(fireNew)]
        ck('nothing compiled when throwing, flying, burning (the figures\' own aside)', not ours, f'{pm0} → {pm1}: {ours}')
        ck('the flames need at most their transparent variants of the plain program (world, overlay), compiled ahead', len([x for x in warmNew if x not in fig(warmNew)]) <= 2, f'{pA} → {pm0}: {warmNew}')
        E("CLOCK.unfocus('zwtest'); for (const id of __zm) { const e = ZSTATE.ents.find(q => q.id === id); if (e) ZHORDE.remove(e); }")
        steps(0.3)
    if 'reload' in SECT:
        E("ZSTATE.save(true)")
        saved = J("({ nb: ZWAFFE.state('nagelbrett').cond, sh: ZWERK.sharp('axt'), mo: ZSTATE.sup.molotow || 0 })")
        # (without ?szenario=zombie – that would start the night afresh; a plain reload goes on where one was: zombie/z_modus.js)
        pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        pg.wait_for_function("window.ZSTATE && ZSTATE.on", timeout=120000, polling=1000)
        time.sleep(2); E("window.FREEZE = true"); steps(0.5)
        back = J("({ nb: ZWERK.cond('nagelbrett'), sh: ZWERK.sharp('axt'), mo: ZSTATE.sup.molotow || 0, st: ZWAFFE.things.nagelbrett ? ZWAFFE.things.nagelbrett.state : null })")
        ck('a reload keeps the nail board (on the garden bench), the sharp axe and the molotov', back['nb'] == saved['nb'] and back['sh'] == saved['sh'] and back['mo'] == saved['mo'] and back['st'] == 'world', f'{saved} → {back}')
        E("GAME.go('werkstatt')"); steps(0.3)
        to_bench()
        pic('08_nach_neuladen')
    terr = E("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt (zombie|zinnen)/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke', not terr, ' | '.join(terr[:2]))
    ck.errors(errs)
ck.done()
