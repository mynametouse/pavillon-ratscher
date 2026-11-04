# feat/zombie: pictures of the zombies up close, for looking (no checks but loading, figures and no page errors): by day at the Anger
# four of them in a row (standing, walking, the attack, crawling), the gore (an arm, the head off, a body in its blood), at night a group
# under a street lamp with the torch on. Pictures in out/zombie_look/.
#   python3 viz3/test/zombie_look.py 8996
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('zombie_look')
OUT = lib.out('zombie_look')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port, '?szenario=zombie', figures=True)
    E = pg.evaluate
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    # noon at the Anger
    E("GAME.go('dorf'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 13 * 60; DN && DN.active && DN.update(true); GAME.setView3(false)")
    lib.settle_light(pg)
    steps(0.5)
    base = J("({ x: GAME.P.x, y: GAME.P.y, z: GAME.P.feet, yaw: GAME.P.yaw })")
    print('at', base, flush=True)
    keys = J("ZFIG.people()")
    print('people', keys, flush=True)
    # four in a row, 3.5 m ahead, facing the camera
    E(f"""(() => {{ const b = {json.dumps(base)}, a = b.yaw * Math.PI / 180, fx = Math.sin(a), fy = Math.cos(a), rx = Math.cos(a), ry = -Math.sin(a);
      const ks = {json.dumps(keys[:2] + keys[8:10])}; window.__z = [];
      ks.forEach((k, i) => {{ const s = (i - 1.5) * 1.15, x = b.x + fx * 3.6 + rx * s, y = b.y + fy * 3.6 + ry * s;
        const e = ZHORDE.ent(k, x, y, GAME.floorAt(x, y, b.z + 0.5), b.yaw + 180); e.hold = ['idle', 'walk', 'chase', 'crawl'][i]; e.holdSp = [0, 0.7, 2.0, 0.3][i]; window.__z.push(e.id); }}); }})()""")
    t0 = time.time()
    while time.time() - t0 < 90 and J("ZSTATE.ents.filter(e => e.F).length") < 4:
        steps(0.3); time.sleep(1)
    n = J("ZSTATE.ents.filter(e => e.F).length")
    ck('four zombies loaded', n >= 4, str(n))
    E("ZSTATE.ents.forEach(e => { if (e.hold === 'crawl') e.crawl = true; })")
    steps(1.2)
    E(f"GAME.view({base['x']}, {base['y']}, {base['z']} + 1.62, {base['yaw']}, -4, 60)")
    pic('01_vier_tag')
    # closer: the first one, face
    E(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === __z[0]); const a = ({base['yaw']}) * Math.PI / 180;
      GAME.view(e.x - Math.sin(a) * 1.6, e.y - Math.cos(a) * 1.6, e.z + 1.55, {base['yaw']}, -3, 50); }})()""")
    steps(0.2)
    pic('02_gesicht')
    # the attack pose
    E("(() => { const e = ZSTATE.ents.find(q => q.id === __z[1]); e.F.play('push', 0.9); })()")
    steps(0.35)
    E(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === __z[1]); const a = ({base['yaw']}) * Math.PI / 180;
      GAME.view(e.x - Math.sin(a) * 2.2, e.y - Math.cos(a) * 2.2, e.z + 1.45, {base['yaw']}, -6, 55); }})()""")
    pic('03_angriff')
    # gore: an arm, the head of the second, a dead one in its blood
    E("(() => { const e = ZSTATE.ents.find(q => q.id === __z[1]); e.F.cut('armR', 1, 0); })()")
    steps(0.4)
    pic('04_arm_ab')
    E("(() => { const e = ZSTATE.ents.find(q => q.id === __z[2]); ZHORDE.damage(e, 500, { dx: 0.3, dy: 1, knock: 1, kind: 'blade', gore: 1, part: 'kopf', by: 'test' }); })()")
    steps(1.5)
    E(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === __z[2]); const a = ({base['yaw']}) * Math.PI / 180;
      GAME.view(e.x - Math.sin(a) * 2.6, e.y - Math.cos(a) * 2.6, e.z + 1.7, {base['yaw']}, -24, 55); }})()""")
    pic('05_kopf_ab_liegt')
    # the night: a group under a lamp, the torch on
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 22 * 60; DN && DN.active && DN.update(true); ZOMBIE.torch(true)")
    lib.settle_light(pg)
    E(f"GAME.view({base['x']}, {base['y']}, {base['z']} + 1.62, {base['yaw']}, -4, 60)")
    steps(1.0)
    pic('06_nacht_lampe')
    E("ZOMBIE.torch(false)")
    steps(0.5)
    pic('07_nacht_ohne')
    print('programs', E("GAME.R.info.programs.length"), 'calls', E("GAME.R.info.render.calls"), flush=True)
    ck.errors(errs)
ck.done()
