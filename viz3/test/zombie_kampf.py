# feat/zombie (Falko 5.11.2026, 9:06): talking with Hubert while he is an ally, the Doppelflinte with shells on Hubert's table, the arms in
# first person (zombie/z_fp.js) – every weapon held in both hands where one holds it, swings, the fists, the kick, the shot with recoil and
# the reload (break open, shells) –, the draw calls stay few. Pictures of every pose in out/zombie_kampf/.
#   python3 viz3/test/zombie_kampf.py 8996 [posen]      (posen: only the pictures of the poses, no checks of talk and table)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
only_poses = len(sys.argv) > 2 and 'posen' in sys.argv[2]
ck = lib.Checks('zombie_kampf')
OUT = lib.out('zombie_kampf')
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
    # a quiet place to look at the arms: the garden lawn, looking along it
    E("GAME.go('garten'); GAME.P.pitch = -4")
    steps(0.5)
    if not only_poses:
        # ---- Hubert: the talk stays possible (Falko: „ich möchte auch wenn mir Hubert und Ronald folgen … noch ihnen reden können“) ----
        E("""(() => { const w = NPC.NPCS.hubert, P = GAME.P; P.x = w.x + 1.6; P.y = w.y; P.feet = GAME.floorAt(P.x, P.y, w.z || P.feet);
          P.yaw = P.body = Math.atan2(w.x - P.x, w.y - P.y) * 180 / Math.PI; })()""")
        steps(0.4)
        lab = E("(() => { const b = document.getElementById('doorbtn'); return b && !b.hidden ? b.textContent : ''; })()")
        ck('next to Hubert the button says „Mit Hubert sprechen“', 'Hubert sprechen' in lab, lab)
        E("NPC.NPCUI.start(NPC.NPCS.hubert)")
        time.sleep(0.5)
        t = J("[...document.querySelectorAll('#np-topics button')].map(b => [b.dataset.k, b.textContent])")
        ck('the talk offers the night\'s question', any(k == 'q_zhilf' for k, _ in t), str(t)[:300])
        E("NPC.NPCUI.end(false)")
        E("(() => { const a = QUESTS.ask('hubert', 'q_zhilf'); if (a && a.after) a.after(); })()")
        steps(0.3)
        al = J("ZBUND.list.map(a => [a.who, a.mode])")
        ck('asked, Hubert comes along', any(a[0] == 'hubert' for a in al), str(al))
        steps(0.5)
        E("""(() => { const w = NPC.NPCS.hubert, P = GAME.P; P.x = w.x + 1.5; P.y = w.y + 0.3; P.feet = GAME.floorAt(P.x, P.y, (w.z || P.feet) + 0.5);
          P.yaw = P.body = Math.atan2(w.x - P.x, w.y - P.y) * 180 / Math.PI; })()""")
        steps(0.3)
        lab = E("(() => { const b = document.getElementById('doorbtn'); return b && !b.hidden ? b.textContent : ''; })()")
        ck('… and while he follows the button still says „Mit Hubert sprechen“', 'Hubert sprechen' in lab, lab)
        t = J("QUESTS.topics('hubert').map(q => q.k)")
        ck('the talk now offers „Warte hier“ and „Wie sieht’s aus?“', 'q_zwart' in t and 'q_zlage' in t, str(t))
        # ---- the Doppelflinte on Hubert's table, with a box of shells ----
        g = J("(() => { const T = ZWAFFE.things.flinte; return T ? { st: T.state, pos: T.pos, box: !!(T.box && T.box.visible), table: HOF.table } : null; })()")
        ok_tab = g and g['st'] == 'world' and abs(g['pos'][0] - g['table'][0]) < 0.6 and abs(g['pos'][1] - g['table'][1]) < 0.6 and abs(g['pos'][2] - 0.76) < 0.05 and g['box']
        ck('the Doppelflinte lies on Hubert\'s table with a box of shells', ok_tab, str(g))
        E("""(() => { const [tx, ty] = HOF.table, P = GAME.P; P.x = tx + 1.5; P.y = ty - 0.6; P.feet = GAME.floorAt(P.x, P.y, 0.5);
          P.yaw = P.body = Math.atan2(tx - P.x, ty - P.y) * 180 / Math.PI; P.pitch = -22; })()""")
        steps(0.4)
        pic('01_tisch')
        s0 = E("ZSTATE.sup.schrot || 0")
        lab = E("(() => { const a = KERN.acts().find(a => a.id === 'take:zw_flinte'); return a ? a.label() : null; })()")
        ck('at the table: „Doppelflinte nehmen“', lab and 'Doppelflinte' in lab, str(lab))
        E("KERN.acts().find(a => a.id === 'take:zw_flinte').run()")
        steps(0.3)
        st = J("({ cur: ZWAFFE.cur(), ammo: ZWAFFE.state('flinte').ammo, schrot: ZSTATE.sup.schrot || 0, box: ZWAFFE.things.flinte.box.visible })")
        ck('taken: loaded, 12 shells in the backpack, the box gone', st['cur'] == 'flinte' and st['ammo'] == 2 and st['schrot'] == s0 + 12 and not st['box'], str(st))
    # ---- the poses: every weapon in the hands (alert: a fight a moment ago), seen with one's own eyes ----
    E("CAM3.want = false; GAME.go('garten'); GAME.P.pitch = -4")
    steps(0.3)
    meshes = {}
    for wid in ['faust', 'flinte', 'motorsaege', 'axt', 'beil', 'spaten', 'mistgabel', 'brechstange', 'sense']:
        if wid == 'faust': E("PLAY.select(-1)")
        else: E(f"PLAY.give(ZWAFFE.thing('{wid}'))")
        E("ZFP.lastAtk = ZFP.time")
        steps(0.6)
        E("ZFP.lastAtk = ZFP.time")
        steps(0.3)
        E("GAME.shot(); GAME.shot()")
        inf = J("ZFP.info()")
        meshes[wid] = E("(() => { let n = 0; ZFP.HELD.scene.traverseVisible(o => { if (o.isMesh) n++; }); return n; })()")
        pic('p_' + wid)
        if wid not in ('flinte', 'motorsaege'):
            E("ZSTATE.stam = 100; ZWAFFE.press()")
            a = E(f"ZDATA.WEAPONS['{wid}'].wind")
            steps(max(0.05, a * 0.6))
            pic('s_' + wid + '_1')
            steps(max(0.05, a * 0.4))
            pic('s_' + wid + '_2')
            E("ZWAFFE.release()")
            steps(1.2)
        ck(f'first person: {wid} in the hands (the figure\'s own arms drawn)', inf['shown'] and inf['rig'] and inf['body'] and inf['id'] == wid, str(inf))
    # the kick
    E("PLAY.give(ZWAFFE.thing('beil')); ZSTATE.stam = 100; ZWAFFE.kick()")
    steps(0.2)
    E("GAME.shot()")
    pic('k_tritt')
    ck('the kick shows the boot', J("ZFP.info().kick"))
    steps(0.8)
    # the shot and the reload
    E("PLAY.give(ZWAFFE.thing('flinte')); ZWAFFE.state('flinte').ammo = 2; ZSTATE.add('schrot', 4); ZFP.lastAtk = ZFP.time")
    steps(0.5)
    E("ZWAFFE.press(); ZWAFFE.release()")
    steps(0.03)
    pic('f_schuss')
    steps(0.6)
    E("ZWAFFE.press(); ZWAFFE.release()")
    steps(0.6)
    ck('two shots: empty', E("ZWAFFE.state('flinte').ammo") == 0)
    E("ZWAFFE.reload()")
    steps(0.5)
    pic('f_offen')
    inf = J("ZFP.info()")
    ck('the reload breaks the gun open', inf['clip'] == 'reload' and inf['brk'] > 0.9, str(inf))
    steps(0.6)
    pic('f_patronen')
    time.sleep(2.4)
    steps(1.4)
    pic('f_zu')
    ck('reloaded: two shells in', E("ZWAFFE.state('flinte').ammo") == 2 and J("ZFP.info().brk") < 0.05, str(J("[ZWAFFE.state('flinte').ammo, ZFP.info()]")))
    # the saw: the pull start
    E("PLAY.give(ZWAFFE.thing('motorsaege')); ZWAFFE.state('motorsaege').fuel = 0.4")
    steps(0.3)
    E("ZWAFFE.press()")
    steps(0.35)
    pic('m_start')
    steps(1.6)
    pic('m_laeuft')
    E("ZWAFFE.release(); ZWAFFE.sawOff()")
    print('meshes in the hands\' view', meshes, flush=True)
    ck('few meshes in the hands\' view (≤ 24)', max(meshes.values()) <= 24, str(meshes))
    pm = J("ZFP.info().postMs")
    ck('the arms cost little per frame (< 12 ms even here, on the processor)', pm < 12, str(pm))
    terr = pg.evaluate("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt (zombie|zinnen)/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke', not terr, ' | '.join(terr[:2]))
    ck.errors(errs)
ck.done()
