# feat/zombie: the zombie night for two (zombie/z_netz.js). Two pages of one browser, joined through a BroadcastChannel (?lokal=1 – the
# same messages as over the internet, without the Nostr relays): the host opens room TEST01, the guest comes with ?raum=TEST01. Checks:
# both see each other (name, figure), the night falls on both (the host's clock), the host's zombies come to the guest as puppets, the
# guest's blow reaches the host's zombie, a host zombie strikes the guest, the guest sees the zombie die. With `netz` (second argument)
# the same over the internet through Trystero (GitHub Actions only – the chat machine reaches no relay).
#   python3 viz3/test/zombie_netz.py 8996 [netz]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
lokal = not (len(sys.argv) > 2 and 'netz' in sys.argv[2])
ck = lib.Checks('zombie_netz' + ('' if lokal else '_internet'))
OUT = lib.out('zombie_netz')
q = '&lokal=1' if lokal else ''
with lib.browser() as b:
    ctx = b.new_context(viewport={'width': 900, 'height': 560})
    errs = []
    # one browser, two pages (a BroadcastChannel joins pages of one browser only; they share the storage as well)
    A = ctx.new_page(); B = ctx.new_page()
    for pg in (A, B):
        lib.preset(pg, 'schnell')
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    lib.boot(A, port, '?szenario=zombie' + q, figures=True)
    A.evaluate(f"ZNETZ.open('host', 'TEST01', {str(lokal).lower()})")
    lib.boot(B, port, '?szenario=zombie&raum=TEST01' + q, figures=True)
    JA = lambda js: json.loads(A.evaluate("JSON.stringify(" + js + ")"))
    JB = lambda js: json.loads(B.evaluate("JSON.stringify(" + js + ")"))
    stepA = lambda s: A.evaluate(f"for (let i = 0; i < {int(s / 0.05)}; i++) GAME.step(0.05)")
    stepB = lambda s: B.evaluate(f"for (let i = 0; i < {int(s / 0.05)}; i++) GAME.step(0.05)")
    t0 = time.time()
    while time.time() - t0 < 90:
        stepA(0.3); stepB(0.3)
        a = JA("Object.values(ZNETZ.peers).map(p => p.name)"); bb = JB("Object.values(ZNETZ.peers).map(p => p.name)")
        if a and bb: break
        time.sleep(1)
    st = JA("({ on: ZNETZ.on, role: ZNETZ.role, peers: Object.values(ZNETZ.peers).map(p => p.name), status: ZNETZ.status })")
    st2 = JB("({ on: ZNETZ.on, role: ZNETZ.role, peers: Object.values(ZNETZ.peers).map(p => p.name), status: ZNETZ.status })")
    ck('host and guest see each other', st['peers'] and st2['peers'] and st2['role'] == 'gast', f"{st} | {st2}")
    # the guest goes to the Anger (the host stays in the garden): the host sees him there
    B.evaluate("GAME.go('dorf')")
    stepB(0.5); time.sleep(0.5); stepA(0.5)
    pb = JB("[GAME.P.x, GAME.P.y]")
    pa = JA("(() => { const p = Object.values(ZNETZ.peers)[0]; return p && p.st ? [p.st.x, p.st.y] : null; })()")
    ck('the host knows where the guest is', pa and abs(pa[0] - pb[0]) < 1 and abs(pa[1] - pb[1]) < 1, f"{pa} vs {pb}")
    # the night on the host – the guest's clock follows
    A.evaluate("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + ZOMBIE.times().siren - 0.5")
    stepA(1.0); time.sleep(3); stepA(1.0); stepB(1.0)
    A.evaluate("CLOCK.focus('test')"); B.evaluate("CLOCK.focus('test')")
    ck('the night falls on both', JA("ZSTATE.phase") == 'nacht' and JB("ZSTATE.phase") == 'nacht', f"{JA('[ZSTATE.phase, CLOCK.hm()]')} | {JB('[ZSTATE.phase, CLOCK.hm()]')}")
    # zombies on the host, puppets on the guest
    t0 = time.time()
    while time.time() - t0 < 120:
        stepA(0.5); stepB(0.5)
        if JB("ZSTATE.ents.filter(e => e.net && e.F).length") >= 2: break
        time.sleep(1)
    na = JA("ZSTATE.ents.filter(e => e.kind === 'zombie' && !e.net).length"); nb = JB("ZSTATE.ents.filter(e => e.net).length")
    ck('the host\'s zombies are puppets on the guest', na > 0 and nb > 0 and JB("ZSTATE.ents.every(e => e.net)"), f"host {na}, guest puppets {nb}")
    # one of the host's zombies before the guest: the guest hits it with the spade
    zid = A.evaluate("""(() => { const p = Object.values(ZNETZ.peers)[0].st; const e = ZSTATE.ents.find(q => q.kind === 'zombie' && !q.net && q.F && !q.dead);
      e.x = p.x + 1.0; e.y = p.y; e.z = GAME.floorAt(e.x, e.y, p.z + 0.5); e.hold = 'idle'; return e.id; })()""")
    for i in range(6):
        stepA(0.2); time.sleep(0.3); stepB(0.2)
    hp0 = A.evaluate(f"ZSTATE.ents.find(e => e.id === '{zid}').hp")
    B.evaluate(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); PLAY.give(ZWAFFE.things.spaten);
      GAME.P.yaw = GAME.P.body = Math.atan2(e.x - GAME.P.x, e.y - GAME.P.y) * 180 / Math.PI; ZSTATE.stam = 100; ZWAFFE.press(); }})()""")
    stepB(0.7); B.evaluate("ZWAFFE.release()"); time.sleep(0.5); stepA(0.3)
    hp1 = A.evaluate(f"(ZSTATE.ents.find(e => e.id === '{zid}') || {{ hp: -1 }}).hp")
    ck('the guest\'s blow reaches the host\'s zombie', hp1 < hp0, f"{hp0} -> {hp1}")
    # the host's zombie strikes the guest
    hb0 = B.evaluate("ZSTATE.hp")
    A.evaluate(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); if (e) {{ e.hold = false; e.st = 'chase'; e.cd = 0; }} }})()")
    for i in range(20):
        stepA(0.25); time.sleep(0.2); stepB(0.25)
        if B.evaluate("ZSTATE.hp") < hb0: break
    zs = JA(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'), p = Object.values(ZNETZ.peers)[0]; return e ? {{ st: e.st, tg: e.tg, d: e.d, wind: e.wind, cd: e.cd, down: e.downT, stag: e.stag, hold: e.hold,
      x: e.x, y: e.y, guest: p && p.st ? [p.st.x, p.st.y, p.st.hp] : null, age: p ? Math.round(performance.now() - (p.stT || 0)) : null }} : null; }})()""")
    ck('the host\'s zombie strikes the guest', B.evaluate("ZSTATE.hp") < hb0, f"{hb0} -> {B.evaluate('ZSTATE.hp')} {zs}")
    # it dies on the host – the guest sees it fall
    A.evaluate(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); if (e) ZHORDE.damage(e, 999, {{ dx: 1, dy: 0, kind: 'blade', gore: 1, part: 'kopf' }}); }})()")
    stepA(0.3); time.sleep(0.6); stepB(0.5)
    ck('the guest sees it die (and lose its head)', B.evaluate(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); return !!(e && e.dead && (e.cutBits & 1)); }})()"))
    try:
        A.screenshot(path=os.path.join(OUT, 'host.png')); B.screenshot(path=os.path.join(OUT, 'gast.png'))
    except Exception as e: print('shot', e)
    terr = A.evaluate("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt (zombie|zinnen)/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke (A)', not terr, ' | '.join(terr[:2]))
    terr = B.evaluate("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt (zombie|zinnen)/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke (B)', not terr, ' | '.join(terr[:2]))
    ck.errors(errs)
ck.done()
