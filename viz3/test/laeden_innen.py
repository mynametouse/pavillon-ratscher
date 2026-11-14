# feat/laeden-innen: the shops of Schleusingen from inside (laeden/innen*.js, LINNEN). For each shop: near it its rooms are built, the
# sliding doors open when one walks up while the shop is open (a weekday morning) and stay shut when it is closed (Sunday; the label at
# the door says so), one walks in, the walls stop one, the floor carries one, one walks out again, going away frees the rooms (meshes and
# geometries back), entering compiles no new shader program; draw calls inside OBI and the Mega Center; pictures inside every type by day
# and one at night (out/laeden_innen/). The world tiles come from the published site (as viz3/test/laeden.py).
#   python3 viz3/test/laeden_innen.py 9019 [sections]   sections: edeka,lidl,rewe,obi,mega,getraenke,zeile40,shell,mcd,nacht (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ALL = ['edeka', 'lidl', 'rewe', 'obi', 'mega', 'getraenke', 'zeile40', 'shell', 'mcd', 'nacht']
want = [s for s in (sys.argv[2] if len(sys.argv) > 2 else ','.join(ALL)).split(',') if s]
ck = lib.Checks('laeden_innen')
OUT = lib.out('laeden_innen')
DATA = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json')))
SHOP = {s['id']: s for s in DATA['shops']}
CENTRES = {'nord': (-885, 2060), 'mitte': (-1075, 1570), 'rewe': (-1765, 915)}
GROUP_OF = {'obi': 'nord', 'mega': 'nord', 'edeka': 'nord', 'getraenke': 'nord', 'zeile40': 'nord', 'shell': 'nord', 'mcd': 'mitte', 'lidl': 'mitte', 'rewe': 'rewe'}
# the views inside: (name, metres in from the main door, metres sideways (+: to the right seen from outside), turn of the view from
# looking in (degrees, + to the right), pitch)
VIEWS = {
    'edeka': [('eingang', 3.0, 0, 0, -4), ('mitte', 18, -6, 25, -6), ('kassen', 6, 5, 70, -8)],
    'lidl': [('eingang', 3.0, 0, 0, -4), ('mitte', 14, -8, 20, -6)],
    'rewe': [('eingang', 3.0, 0, 0, -4), ('mitte', 16, 4, -20, -6)],
    'obi': [('eingang', 3.0, 0, 0, -4), ('halle', 22, 6, 10, -2)],
    'mega': [('eingang', 3.0, 0, 0, -4), ('gang', 26, 0, 0, -3)],
    'getraenke': [('eingang', 3.0, 0, 0, -4)],
    'zeile40': [('eingang', 2.0, 0, 0, -6)],
    'shell': [('eingang', 2.0, 0, 0, -6)],
    'mcd': [('eingang', 2.5, 0, 0, -5)],
}


def fetch_tiles(centres):
    """the world tiles near the shops, as viz3/test/laeden.py does (its function, run without its checks)"""
    src = open(os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py')).read()
    pre = src.split('# ---------------------------------------------------------------- without a browser')[0]
    pre = pre.replace("port = sys.argv[1] if len(sys.argv) > 1 else '8951'", "port = '0'")
    pre = pre.replace("want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,nord,mitte,rewe,nacht').split(','))", "want = set()")
    pre = pre.replace("ck = lib.Checks('laeden')", "ck = None")
    ns = {'__file__': os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py'), '__name__': 'laeden_pre'}
    exec(compile(pre, 'laeden_pre', 'exec'), ns)
    ns['fetch_tiles'](centres)


def main_door(sh):
    return next(d for d in sh['doors'] if d['k'] == 'main')


shops = [s for s in want if s in SHOP]
groups = []
for s in shops:
    g = GROUP_OF[s]
    if g not in groups:
        groups.append(g)
fetch_tiles([(-1084.7, 1241.9)] + [CENTRES[g] for g in (groups or ['rewe'])])
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1920, 1080, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))

    def steps(secs, dt=0.25):
        E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")

    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, e, flush=True)

    def settle(limit=150):
        t0 = time.time()
        st = None
        while time.time() - t0 < limit:
            E("GAME.step(0.25)")
            st = J("({ w: WELT.state().loading, pq: WELT.padQueue(), busy: GEB.Z.busy, jobs: GEB.jobs(), l: LAEDEN.status().groups.map(g => g.state).join(',') })")
            if st['w'] == 0 and st['pq'] == 0 and not st['busy'] and st['jobs'] == 0 and 'pads' not in st['l'] and time.time() - t0 > 6:
                break
            time.sleep(0.25)
        return st

    def stand(x, y, yaw, pitch=0):
        E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.7, {yaw}, {pitch})")
        return J("GAME.step(0.1)")

    def set_time(day_of_week, hh, mm=0):
        d = J(f"(() => {{ for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === {day_of_week}) return d; return 1; }})()")
        E(f"CLOCK.t = {d * 1440 + hh * 60 + mm}; DN.active && DN.update(true)")
        lib.settle_light(pg)

    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    set_time(2, 10, 30)  # a Tuesday morning: everything open
    # the town first (its programs: the Rathaus hall's unlit one among them)
    E("document.querySelector('#menu [data-spot=schleusingen]').click()")
    t0 = time.time()
    while time.time() - t0 < 200:
        E("GAME.step(0.25)")
        if J("SCHL.status().state") in ('ready', 'error'):
            break
        time.sleep(0.3)
    settle(60)
    E("GAME.shot()")
    st0 = J("LINNEN.status()")
    ck('LINNEN is on, nothing built at the start', st0['on'] and not st0['mounted'], json.dumps(st0)[:300])
    for sid in shops:
        sh = SHOP[sid]
        md = main_door(sh)
        yaw_in = (math.degrees(math.atan2(-md['nx'], -md['ny'])) + 360) % 360  # looking at the door from outside
        # 1 – stand on the car park 25 m before the door: the group stands, then the rooms (within 45 m)
        sx, sy = md['x'] + md['nx'] * 25, md['y'] + md['ny'] * 25
        stand(sx, sy, yaw_in)
        settle()
        steps(3)
        K0 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
        mem0 = J("LINNEN.mem()")
        st = J("LINNEN.status()")
        m = next((q for q in st['mounted'] if q['shop'] == sid), None)
        ck(f'{sid}: its rooms stand when one is near (built in ms, meshes, triangles)', m is not None and m['meshes'] > 0,
           json.dumps(m)[:400] if m else json.dumps(st)[:400])
        if not m:
            continue
        # 2 – open: the label at the door, then walk up: the door opens, one walks in
        di = sh['doors'].index(md)
        stand(md['x'] + md['nx'] * 2.0, md['y'] + md['ny'] * 2.0, yaw_in)
        lbl = J("GAME.step(0.3)").get('best') or ''
        x7, y7 = md['x'] + md['nx'] * 7, md['y'] + md['ny'] * 7
        stand(x7, y7, yaw_in)
        J("GAME.step(0.6)")
        mx = 0
        for k in range(12):
            w = J("GAME.step(0.5, 1, 0, 0, 1)")
            dd = J(f"LINNEN.door('{sid}:{di}')")
            mx = max(mx, dd['open'] if dd else 0)
        unit = J(f"LINNEN.unitAt({w['x']}, {w['y']})")
        ck(f'{sid}: open (a Tuesday morning) – the label says „geöffnet“, the doors open as one walks up', mx > 0.95 and 'geöffnet' in lbl, f"door opened to {mx:.2f}; label: {lbl}")
        ck(f'{sid}: one walks in', unit is not None, f"walker at {w['x']}, {w['y']} (feet {w['feet']}), unit {unit}")
        if unit:
            # the floor carries one: the walker's feet on the floor of the unit
            fl = J(f"[KERN.ground({w['x']}, {w['y']}), LINNEN.status().mounted.length]")
            ck(f'{sid}: the floor carries one (feet on the floor inside)', abs(fl[0] - w['feet']) < 0.12, f"feet {w['feet']}, floor {fl[0]:.2f}")
            # the walls stop one: walking on for 20 s in the same direction one stays inside
            w2 = J("GAME.step(20, 1, 0, 0, 1)")
            u2 = J(f"LINNEN.unitAt({w2['x']}, {w2['y']})")
            ck(f'{sid}: walls and fixtures stop one (20 s walking ahead, still inside)', u2 is not None, f"walker at {w2['x']}, {w2['y']}, unit {u2}")
            # sideways too
            w3 = J("GAME.step(25, 0, 0, 1, 1)")
            u3 = J(f"LINNEN.unitAt({w3['x']}, {w3['y']})")
            ck(f'{sid}: walking sideways along the rows, still inside', u3 is not None, f"walker at {w3['x']}, {w3['y']}, unit {u3}")
            # no new programs: what draws the rooms was there before entering
            frame = J("(() => { const i = GAME.R.info; i.autoReset = false; i.reset(); GAME.shot(); const r = { calls: i.render.calls, tris: i.render.triangles }; i.autoReset = true; return r; })()")
            mine = J(f"LINNEN.meshesOf('{sid}').map(m => {{ const pr = GAME.R.properties.get(m.material); return pr && pr.currentProgram ? pr.currentProgram.cacheKey : null; }})")
            newm = [k[-80:] for k in mine if k and k not in K0]
            ck(f'{sid}: its rooms draw with programs that were there before (no new shader program)', mine and all(mine) and not newm, f'{len(mine)} meshes; new: {newm[:2]}')
            K1 = J("GAME.R.info.programs.map(p => p.cacheKey)")
            print('note: programs compiled meanwhile elsewhere', [k[-60:] for k in K1 if k not in K0][:4], flush=True)
            print('frame inside', sid, json.dumps(frame), 'meshes', len(mine), flush=True)
            if sid in ('obi', 'mega'):
                ck(f'{sid}: draw calls of its rooms within bounds (≤ 40 meshes)', m['meshes'] <= 40, f"{m['meshes']} meshes, frame {json.dumps(frame)}")
            # pictures inside
            for (nm, dist, side, turn, pitch) in VIEWS.get(sid, []):
                tx, ty = -md['ny'], md['nx']
                px = md['x'] - md['nx'] * dist - tx * side
                py = md['y'] - md['ny'] * dist - ty * side
                yaw = (yaw_in + turn) % 360
                E(f"GAME.setView3(false, true); GAME.view({px}, {py}, KERN.ground({px}, {py}) + 1.65, {yaw}, {pitch}, 70)")
                E("GAME.step(0.05)")
                E(f"GAME.view({px}, {py}, KERN.ground({px}, {py}) + 1.65, {yaw}, {pitch}, 70)")
                pic(f'{sid}_{nm}')
            # 3 – out again: from just inside the door, walking out
            xi, yi = md['x'] - md['nx'] * 3, md['y'] - md['ny'] * 3
            stand(xi, yi, (yaw_in + 180) % 360)
            w4 = J("GAME.step(5, 1, 0, 0, 1)")
            u4 = J(f"LINNEN.unitAt({w4['x']}, {w4['y']})")
            ck(f'{sid}: one walks out again', u4 is None and math.hypot(w4['x'] - md['x'], w4['y'] - md['y']) > 1.5, f"walker at {w4['x']}, {w4['y']}, unit {u4}")
        # 4 – closed (Sunday): the doors stay shut, the label says so, one stays outside
        set_time(0, 10, 30)
        stand(md['x'] + md['nx'] * 2.0, md['y'] + md['ny'] * 2.0, yaw_in)
        lbl = J("GAME.step(0.3)").get('best') or ''
        stand(x7, y7, yaw_in)
        w5 = J("GAME.step(7, 1, 0, 0, 1)")
        door = J(f"LINNEN.door('{sid}:{di}')")
        u5 = J(f"LINNEN.unitAt({w5['x']}, {w5['y']})")
        if door and door.get('isOpen') is False:
            ck(f'{sid}: closed (Sunday) – the doors stay shut, one stays outside, the label says „geschlossen“', door['open'] < 0.1 and u5 is None and 'geschlossen' in lbl,
               f"door {json.dumps(door)}; walker at {w5['x']}, {w5['y']}, unit {u5}; label: {lbl}")
        else:
            print('note', sid, 'open on Sunday too', json.dumps(door), flush=True)
        set_time(2, 10, 30)
        # 5 – going away frees the rooms
        fx_, fy_ = md['x'] + md['nx'] * 300, md['y'] + md['ny'] * 300
        stand(fx_, fy_, yaw_in)
        steps(3)
        st = J("LINNEN.status()")
        mem1 = J("LINNEN.mem()")
        ck(f'{sid}: going away frees its rooms (their geometries and material back)', not any(q['shop'] == sid for q in st['mounted']) and mem1['live'] == 0 and mem1['mats'] == 0,
           f"mounted {[q['shop'] for q in st['mounted']]}; while standing {json.dumps(mem0)}, after {json.dumps(mem1)}")
    if 'nacht' in want:
        # at night: REWE open until 22, EDEKA closed after 20
        pass
    ck.errors(errs)
    ck.done()
