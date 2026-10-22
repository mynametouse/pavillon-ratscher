"""Road smoothing (tools/geo/smooth_roads.py), checked in the app: the same page twice, the second time with the smoothed terrain
served in place of geo/terrain.b64.json (Playwright route); the car is placed at a few road spots (chase-view picture) and driven
~600 m along each road (target 50 km/h) while its vertical motion is recorded: vertical acceleration, pitch rate, roll.
    python3 viz3/test/roadride.py <port> <out dir> <smoothed terrain.b64.json> <network.json from smooth_roads.py>
22.10.2026, main road: vertical acceleration rms 12.1 -> 2.8 m/s2, pitch rate 22.9 -> 2.6 deg/s, roll 12.6 -> 1.3 deg."""
import sys, os, json, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port, OUT, SMOOTH, NET = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
net = json.load(open(NET)); pos = net['pos']

def chain_from(kind, near, length):
    """points of the chain of this kind nearest to `near`, from there on for `length` metres (in chain order)"""
    best = None
    for k, fl, ids in net['chains']:
        if k != kind or fl & 1: continue
        for j, i in enumerate(ids):
            d = math.hypot(pos[i][0] - near[0], pos[i][1] - near[1])
            if best is None or d < best[0]: best = (d, ids, j)
    _, ids, j = best; pts = [pos[ids[j]]]; L = 0
    for i in ids[j + 1:]:
        L += math.hypot(pos[i][0] - pts[-1][0], pos[i][1] - pts[-1][1]); pts.append(pos[i])
        if L >= length: break
    if L < length * 0.5:   # chain runs the other way: walk backwards
        pts = [pos[ids[j]]]; L = 0
        for i in reversed(ids[:j]):
            L += math.hypot(pos[i][0] - pts[-1][0], pos[i][1] - pts[-1][1]); pts.append(pos[i])
            if L >= length: break
    return pts

SPOTS = {   # name: (kind, near point) - the view looks along the road from there
    'hauptstrasse': ('main', (593, -1016)),
    'kreisstrasse': ('county', (0, 0)),
    'ortsstrasse': ('street', (-664, 905)),
    'feldweg': ('track', (1148, -716)),
}
routes = {n: chain_from(k, p, 600) for n, (k, p) in SPOTS.items()}
json.dump(routes, open(os.path.join(OUT, 'routes.json'), 'w'))

def run(label, smooth):
    with lib.browser() as b:
        errs = []; pg = lib.page(b, 1100, 680, errs, tier='mittel')
        pg.add_init_script("try { localStorage.setItem('pav-clock-v1', JSON.stringify({ t: 660, rate: 'min' })); } catch (e) {}")   # 11:00
        if smooth:
            body = open(SMOOTH, 'rb').read()
            pg.route('**/terrain.b64.json', lambda route: route.fulfill(status=200, body=body, headers={'content-type': 'application/json'}))
        lib.boot(pg, port); E = pg.evaluate
        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
        res = {}
        for name, pts in routes.items():
            a, c = pts[0], pts[min(3, len(pts) - 1)]; psi = math.atan2(c[0] - a[0], c[1] - a[1])
            E(f"VEH.place('car', {a[0]}, {a[1]}, {psi}); if (!VEH.cur) VEH.enter('car'); GAME.setView3(true)"); steps(1.0)
            lib.shot(pg, OUT, f'{name}_{label}')
            # drive the route and record the car's vertical motion
            E(f"window._fs = VEH.follow({json.dumps(pts)}, 14)")
            rec = E("""(() => { const out = []; for (let k = 0; k < 2400; k++) { GAME.step(0.025); const s = VEH.cur.st;
                out.push([s.x, s.y, s.z, s.vz, s.pitch, s.roll, s.u]); if (window._fs && window._fs.done) break; } return out; })()""")
            E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null")
            vz = [r[3] for r in rec]; pitch = [r[4] for r in rec]; roll = [r[5] for r in rec]; u = [r[6] for r in rec]
            acc = [(vz[i + 1] - vz[i]) / 0.025 for i in range(len(vz) - 1)]
            rms = lambda a: (sum(v * v for v in a) / max(1, len(a))) ** 0.5
            dp = [abs(pitch[i + 1] - pitch[i]) / 0.025 for i in range(len(pitch) - 1)]
            res[name] = dict(steps=len(rec), metres=round(sum(math.hypot(rec[i + 1][0] - rec[i][0], rec[i + 1][1] - rec[i][1]) for i in range(len(rec) - 1))),
                             kmh=round(3.6 * sum(u) / max(1, len(u)), 1), vert_acc_rms=round(rms(acc), 2), vert_acc_max=round(max(map(abs, acc), default=0), 2),
                             pitch_rate_rms_deg=round(math.degrees(rms(dp)), 2), roll_rms_deg=round(math.degrees(rms(roll)), 2))
            json.dump(rec, open(os.path.join(OUT, f'rec_{name}_{label}.json'), 'w'))
            print(label, name, res[name], flush=True)
        res['errors'] = [e for e in errs][:5]
        json.dump(res, open(os.path.join(OUT, f'ride_{label}.json'), 'w'), indent=1)

run('vorher', False)
run('nachher', True)
print('done', OUT)
