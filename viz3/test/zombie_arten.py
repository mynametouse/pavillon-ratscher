# feat/zombie (Falko 5.11.2026, 17:57: „Neue Zombie-Arten“, „Schwierigkeit wählbar“, „Schleichen“): the kinds (a runner, the firefighter
# in his helmet, the screamer), how hard (leicht / normal / schwer: numbers, the button in the panel, saved), creeping (crouched in the
# dark they see less, the flashlight's beam gives one away, running is heard, a blow from behind on one that suspects nothing is three
# times as hard). Pictures in out/zombie_arten/.
#   python3 viz3/test/zombie_arten.py 8996
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('zombie_arten')
OUT = lib.out('zombie_arten')
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
    # ---- how hard ----
    d = J("['leicht', 'normal', 'schwer'].map(k => { const n = ZDATA.night(2, k); return [n.count, Math.round(n.hp), Math.round(n.hit * 10) / 10, +n.speed.toFixed(2), n.sight]; })")
    ck('three levels: leicht fewer and weaker, schwer more and tougher', d[0][0] < d[1][0] < d[2][0] and d[0][1] < d[1][1] < d[2][1] and d[0][2] < d[1][2] < d[2][2], str(d))
    lab0 = E("document.getElementById('zdiffb').textContent")
    E("document.getElementById('zdiffb').click()")
    lab1 = E("document.getElementById('zdiffb').textContent")
    saved = J("(() => { const v = JSON.parse(localStorage.getItem('pav-zombie-v1') || '{}'); return v.diff || null; })()")
    ck('the panel button: „Schwierigkeit: normal“ → „schwer“, saved', 'normal' in lab0 and 'schwer' in lab1 and saved == 'schwer', f'{lab0} → {lab1}, saved {saved}')
    E("document.getElementById('zdiffb').click(); document.getElementById('zdiffb').click()")
    ck('… and round again to normal', 'normal' in E("document.getElementById('zdiffb').textContent"), E("document.getElementById('zdiffb').textContent"))
    pic('01_panel')
    # ---- the night, quiet: no spawning, nobody about ----
    E("CAM3.want = false; GAME.go('garten'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + ZOMBIE.times().siren + 2; DN && DN.active && DN.update(true)")
    lib.settle_light(pg)
    steps(1.0)
    time.sleep(7.5)  # (6.5 s after the siren the first ones turn – let that pass, then clear the street)
    steps(0.3)
    E("ZHORDE.clear(); ZHORDE.budget = 0; ZSTATE.night = 3")
    steps(0.3)
    ck('night', E("ZSTATE.phase") == 'nacht', E("ZSTATE.phase"))
    # ---- the kinds of the third night ----
    mix = J("(() => { const c = {}; ZHORDE.kindsMade = null; for (let i = 0; i < 400; i++) { const k = ZHORDE.kindFor('x' + (i % 7)); c[k] = (c[k] || 0) + 1; } return c; })()")
    ck('night 3 brings runners, firefighters and screamers (firefighters and screamers counted)', mix.get('laeufer', 0) > 40 and 1 <= mix.get('feuerwehr', 0) <= 4 and 1 <= mix.get('schreier', 0) <= 3, str(mix))
    one = J("(() => { const k = ZDATA.kindsOf(1); return k; })()")
    ck('the first night stays as it was (no special kinds)', one['laeufer'] == 0 and one['feuerwehr'] == 0 and one['schreier'] == 0, str(one))
    # spawn one of each in front of the player, held
    E("""(() => { const P = GAME.P, a = P.yaw * Math.PI / 180, ks = ZFIG.people(); window._zk = {};
      [['normal', -1.4], ['feuerwehr', 0], ['laeufer', 1.4]].forEach(([art, s], i) => {
        const x = P.x + Math.sin(a) * 3.2 + Math.cos(a) * s, y = P.y + Math.cos(a) * 3.2 - Math.sin(a) * s;
        const e = ZHORDE.ent(ks[i % ks.length], x, y, GAME.floorAt(x, y, P.feet + 0.5), P.yaw + 180, { art }); e.hold = 'idle'; window._zk[art] = e.id; }); })()""")
    for i in range(60):
        steps(0.25)
        if E("Object.values(window._zk).every(id => { const e = ZSTATE.ents.find(q => q.id === id); return e && e.F; })"): break
        time.sleep(0.3)
    k = J("""(() => { const g = id => ZSTATE.ents.find(q => q.id === id); const n = g(window._zk.normal), f = g(window._zk.feuerwehr), l = g(window._zk.laeufer);
      return { hpN: Math.round(n.hp0), hpF: Math.round(f.hp0), helm: !!(f.F && f.F.helm), helmIn: !!(f.F && f.F.helm && f.F.helm.parent), runL: +l.run.toFixed(2), runN: n.run, artF: f.art }; })()""")
    ck('the firefighter: in his helmet, ~2.6 times as tough', k['helm'] and k['helmIn'] and 2.3 < k['hpF'] / k['hpN'] < 2.9, str(k))
    ck('the runner: faster when it hunts', k['runL'] > 1.1 and k['runN'] == 1, str(k))
    E("GAME.P.pitch = 6")
    steps(0.3)
    pic('02_arten')
    # a blow to the firefighter's head: the helmet takes it; more – it flies off
    r = J("""(() => { const e = ZSTATE.ents.find(q => q.id === window._zk.feuerwehr), hp = e.hp; e.st = 'chase';
      ZHORDE.damage(e, 40, { dx: e.x - GAME.P.x, dy: e.y - GAME.P.y, kind: 'blunt', gore: 1, part: 'kopf', by: 'spieler', w: 'axt' });
      const a = { lost: Math.round(hp - e.hp), head: !(e.F.cuts && e.F.cuts.kopf), helm: !!e.F.helm };
      ZHORDE.damage(e, 50, { dx: e.x - GAME.P.x, dy: e.y - GAME.P.y, kind: 'blunt', gore: 1, part: 'kopf', by: 'spieler', w: 'axt' });
      a.off = !e.F.helm && ZHORDE.flying.length === 1; a.alive = !e.dead; return a; })()""")
    ck('a blow to the head: the helmet takes most of it, the head stays on', r['lost'] < 20 and r['head'] and r['helm'], str(r))
    ck('… a second one knocks the helmet off', r['off'], str(r))
    steps(1.5)
    pic('03_helm_ab')
    E("ZHORDE.clear()")
    steps(0.2)
    # ---- creeping: one in the dark 10 m ahead ----
    def sees(stance, lamp, dist, behind=False):
        E(f"""(() => {{ ZHORDE.clear(); const P = GAME.P, a = P.yaw * Math.PI / 180, s = {-1 if behind else 1}; P.stance = '{stance}'; P.speed = 0.5; ZOMBIE.torch({'true' if lamp else 'false'});
          const x = P.x + Math.sin(a) * {dist} * s, y = P.y + Math.cos(a) * {dist} * s;
          window._zs = ZHORDE.ent(ZFIG.people()[0], x, y, GAME.floorAt(x, y, P.feet + 0.5), P.yaw + 180, {{ art: 'normal' }}).id; }})()""")
        for i in range(40):
            steps(0.2)
            if E("(() => { const e = ZSTATE.ents.find(q => q.id === window._zs); return !!(e && e.F); })()"): break
            time.sleep(0.2)
        E("(() => { const e = ZSTATE.ents.find(q => q.id === window._zs); e.st = 'wander'; e.tx = e.x; e.ty = e.y; })()")
        steps(0.6)
        return E("(() => { const e = ZSTATE.ents.find(q => q.id === window._zs); return e ? e.st : 'gone'; })()")
    a = sees('stand', False, 10)
    b2 = sees('crouch', False, 10)
    c = sees('crouch', True, 22)
    d2 = sees('stand', True, 22, behind=True)
    E("GAME.P.stance = 'stand'; ZOMBIE.torch(false)")
    ck('in the dark at 10 m: standing it sees him, crouched it does not', a == 'chase' and b2 != 'chase', f'standing {a}, crouched {b2}')
    ck('the flashlight\'s beam gives him away at 22 m (crouched); behind him it is dark', c == 'chase' and d2 != 'chase', f'in the beam {c}, behind {d2}')
    # running is heard
    E("ZSTATE.noises.length = 0; GAME.P.speed = 20")
    steps(0.05)
    nz = J("ZSTATE.noises.map(n => n.what)")
    E("GAME.P.speed = 0")
    ck('running makes noise (footsteps)', 'schritte' in nz, str(nz))
    # a blow from behind on one that suspects nothing: three times as hard
    s = J("""(() => { ZHORDE.clear(); const P = GAME.P, x = P.x + 1, y = P.y; const e = ZHORDE.ent(ZFIG.people()[0], x, y, GAME.floorAt(x, y, P.feet + 0.5), 0, { art: 'normal' });
      e.st = 'wander'; e.hp = e.hp0 = 500; ZHORDE.damage(e, 20, { dx: 1, dy: 0, kind: 'blade', by: 'spieler', w: 'beil' }); const a = 500 - e.hp;
      ZHORDE.damage(e, 20, { dx: 1, dy: 0, kind: 'blade', by: 'spieler', w: 'beil' }); return [Math.round(a), Math.round(500 - a - e.hp)]; })()""")
    ck('a blow on one that suspects nothing is three times as hard, the next normal', s[0] == 60 and s[1] == 20, str(s))
    E("ZHORDE.clear()")
    # ---- the screamer: it sees him, screams, the others come ----
    E("""(() => { const P = GAME.P, a = P.yaw * Math.PI / 180, ks = ZFIG.people(); P.stance = 'stand'; ZOMBIE.torch(true);
      const x = P.x + Math.sin(a) * 8, y = P.y + Math.cos(a) * 8, sc = ZHORDE.ent(ks[0], x, y, GAME.floorAt(x, y, P.feet + 0.5), P.yaw + 180, { art: 'schreier' });
      sc.hold = 'idle'; window._sc = sc.id;
      window._far = [];
      for (let i = 0; i < 3; i++) { const b = a + 2 + i * 0.7, x2 = P.x + Math.sin(b) * 35, y2 = P.y + Math.cos(b) * 35;
        const q = ZHORDE.ent(ks[(i + 1) % ks.length], x2, y2, GAME.floorAt(x2, y2, P.feet + 0.5), 0, { art: 'normal' }); q.hold = 'idle'; window._far.push(q.id); } })()""")
    for i in range(60):
        steps(0.2)
        if E("ZSTATE.ents.filter(e => e.F).length >= 4"): break
        time.sleep(0.2)
    E("for (const e of ZSTATE.ents) { e.st = 'wander'; e.tx = e.x; e.ty = e.y; e.hold = false; e.screamed = false; } ZSTATE.noises.length = 0")
    steps(0.5)
    sc = J("""(() => { const e = ZSTATE.ents.find(q => q.id === window._sc); return { st: e.st, screamed: !!e.screamed, others: window._far.map(id => (ZSTATE.ents.find(q => q.id === id) || {}).st),
      noise: ZSTATE.noises.some(n => n.what === 'schrei') }; })()""")
    ck('the screamer sees him and screams (a loud noise)', sc['screamed'] and sc['noise'], str(sc))
    ck('… and the others 35 m away come for him', all(o == 'chase' for o in sc['others']), str(sc))
    pic('04_schreier')
    E("ZOMBIE.torch(false); ZHORDE.clear()")
    terr = pg.evaluate("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt (zombie|zinnen)/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke', not terr, ' | '.join(terr[:2]))
    ck.errors(errs)
ck.done()
