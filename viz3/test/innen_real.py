# feat/innen-real (Falko, 17.11.2026 13:27: „Es muss realistischer aussehen, nicht bloß so schemenhaft. Auch … in den Häusern.“): the houses of
# Ratscher and Schleusingen from inside. The same rooms of the same houses are drawn before and after the push (tag=vorher | nachher), each
# picture with the frame's draw calls, triangles and time; per house the build time, draw calls and triangles of the interior. Checks (the
# realism of the rooms): every house built and freed again (geometries and textures back), ≤ 60 draw calls, no new program after the first
# house, a kitchen with a sink and a stove, a bathroom with a toilet and a basin, a bed in the bedroom, the front door into the hall, windows
# inside where the facade has them, a lamp in every room, a resident at a plausible place by the hour, no two living rooms alike.
#   python3 viz3/test/innen_real.py PORT [ratscher|schleusingen|ratscher+schleusingen][,tag=nachher,n=6,tier=hoch,w=1280,h=720,nacht=1]
# Pictures and numbers: out/innen_real/<tag>/ (metrics_<sections>.json); side by side: viz3/test/innen_real_vergleich.py.
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
parts = [a for a in arg.split(',') if a]
opts = dict(a.split('=', 1) for a in parts if '=' in a)
SECT = set('+'.join(a for a in parts if '=' not in a).split('+')) - {''} or {'ratscher', 'schleusingen'}
TAG = opts.get('tag', 'nachher')
TIER = opts.get('tier', 'mittel')
NH = int(opts.get('n', 6))
NIGHT = opts.get('nacht', '1') != '0'
OUT = lib.out(os.path.join('innen_real', TAG))
ck = lib.Checks('innen_real')
errs = []
METRICS = {'tag': TAG, 'houses': [], 'shots': []}

HELP = r"""
window.__T = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#tut').forEach(e => e.style.visibility = 'hidden'); },
  mem() { const m = GAME.R.info.memory; return { g: m.geometries, t: m.textures, p: GAME.R.info.programs.length }; },
  progKeys() { return GAME.R.info.programs.map(p => p.cacheKey); },
  stand(x, y, z, yaw) { const P = GAME.P; P.mode = 'walk'; P.x = x; P.y = y; P.feet = z; P.vz = 0; P.yaw = yaw; P.body = yaw; P.pitch = -6; GAME.step(0.1); },
  // a view in a room: from a corner (0 = the one by its door) towards the middle, eye height
  roomView(H, rid, corner) {
    const P = H.plan, r = P.rooms.find(q => q.id === rid), d = H.doors.find(q => q.room === rid), dp = d ? P.toL(d.pos[0], d.pos[1]) : [(r.x0 + r.x1) / 2, r.y0];
    const cs = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].sort((a, b) => Math.hypot(a[0] - dp[0], a[1] - dp[1]) - Math.hypot(b[0] - dp[0], b[1] - dp[1]));
    const c = cs[corner || 0], m = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], e = [c[0] + Math.sign(m[0] - c[0]) * 0.55, c[1] + Math.sign(m[1] - c[1]) * 0.55];
    const ew = P.toW(e[0], e[1]), mw = P.toW(m[0], m[1]), sw = P.toW(c[0] + Math.sign(m[0] - c[0]) * 0.3, c[1] + Math.sign(m[1] - c[1]) * 0.3);
    const yaw = Math.atan2(mw[0] - ew[0], mw[1] - ew[1]) * 180 / Math.PI;
    this.stand(sw[0], sw[1], r.z0, yaw); CAM3.want = false; GAME.view(ew[0], ew[1], r.z0 + 1.6, yaw, -14, 78); GAME.step(0.05);
  },
  // one full frame: draw calls, triangles, time (the pixels read back, so the GPU's work is in it)
  frame() { const R = GAME.R, i = R.info, gl = R.getContext(), px = new Uint8Array(4); i.autoReset = false; i.reset(); const t0 = performance.now(); GAME.shot(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const ms = performance.now() - t0, r = { calls: i.render.calls, tris: i.render.triangles, ms: Math.round(ms) }; i.autoReset = true; return r; },
  waitH(ms) { return new Promise(res => { const t0 = performance.now(); const f = () => (HAEUSER.H || performance.now() - t0 > ms ? res(!!HAEUSER.H) : setTimeout(f, 50)); f(); }); },
  // what the realism checks need to know of the house one is in
  survey() {
    const H = HAEUSER.H; if (!H) return null; const P = H.plan, sp = H.spots || [], kinds = {};
    for (const s of sp) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    const R = H.survey ? H.survey() : null;
    return { id: H.id, look: P.look, kind: P.kind || 'haus', nSt: P.nSt, rooms: P.rooms.map(r => ({ id: r.id, kind: r.kind, fl: r.floor, w: +(r.x1 - r.x0).toFixed(2), d: +(r.y1 - r.y0).toFixed(2), name: (H.rooms.find(q => q.id === r.id) || {}).name })),
      spots: kinds, lamps: (H.lamps || []).length, stats: { ms: Math.round(H.stats.ms), draws: H.stats.draws, tris: H.stats.tris }, real: R };
  },
};
"""


def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))


def shot(name, info=None, q=0.86):
    # one frame, timed, and its pixels in the same task (the drawing buffer is still there)
    r = J(f"(() => {{ const fr = __T.frame(); fr.url = document.querySelector('#stage canvas').toDataURL('image/jpeg', {q}); return fr; }})()")
    import base64
    open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(r.pop('url').split(',')[1]))
    fr = r
    METRICS['shots'].append(dict(name=name, **fr, **(info or {})))
    print('frame', name, json.dumps(fr), flush=True)
    return fr


def fetch_tiles(centres):
    """the world tiles around the old town, as viz3/test/laeden.py does (its function, run without its checks; as schleusingen_innen.py)"""
    src = open(os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py')).read()
    pre = src.split('# ---------------------------------------------------------------- without a browser')[0]
    pre = pre.replace("port = sys.argv[1] if len(sys.argv) > 1 else '8951'", "port = '0'")
    pre = pre.replace("want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,nord,mitte,rewe,nacht').split(','))", "want = set()")
    pre = pre.replace("ck = lib.Checks('laeden')", "ck = None")
    ns = {'__file__': os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py'), '__name__': 'laeden_pre'}
    exec(compile(pre, 'laeden_pre', 'exec'), ns)
    ns['fetch_tiles'](centres)


def wait_scene(cond, limit=900):
    t1 = time.time()
    while time.time() - t1 < limit:
        if E(cond): return True
        E("GAME.step(0.5)"); time.sleep(0.5)
    return False


def boot(q):
    t0 = time.time()
    pg.goto(f'http://localhost:{port}/index.html{q}', timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3)
    E("window.FREEZE = true")
    print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP)
    E("__T.hide(); GAME.setMode('day'); GAME.step(0.1)")


def enter(hid):
    E(f"window.__EN = null; HAEUSER.enter({hid}).then(v => window.__EN = {{ ok: v }}, e => window.__EN = {{ err: String(e) }}); 1")
    for _ in range(400):
        if E("!!window.__EN"): break
        E("GAME.step(0.05)"); time.sleep(0.05)
    return J("window.__EN") or {}


def leave():
    E("window.__LV = null; (HAEUSER.H ? HAEUSER.leave() : Promise.resolve(true)).then(v => window.__LV = { ok: v }, e => window.__LV = { err: String(e) }); 1")
    for _ in range(400):
        if E("!!window.__LV"): break
        E("GAME.step(0.05)"); time.sleep(0.05)
    return J("window.__LV") or {}


def clock(hh, mm=0):
    E(f"(() => {{ const d = Math.floor(CLOCK.t / 1440); CLOCK.t = d * 1440 + {hh * 60 + mm}; if (window.DN && DN.active) DN.update(true); GAME.step(0.1); return 1; }})()")


def mode(m):
    E(f"GAME.setMode('{m}'); GAME.step(0.3)")
    lib.settle_light(pg)


ORDER = ['flur', 'stube', 'kueche', 'bad', 'schlafzimmer', 'kinderzimmer', 'kammer', 'wflur', 'laden']


def rooms_of():
    return J("""(() => { const P = HAEUSER.H.plan, out = [], seen = new Set();
      const ord = """ + json.dumps(ORDER) + """;
      for (const k of ord) { const r = P.rooms.filter(q => q.kind === k && !seen.has(q.kind)).sort((a, b) => (a.floor || 0) - (b.floor || 0))[0]; if (r) { seen.add(r.kind); out.push(r.id); } }
      return out; })()""")


def house(place, hid, label, night=False, both=('stube', 'kueche')):
    """into a house, its rooms in pictures (two views of the living room and the kitchen), out again; the numbers to METRICS"""
    E("GAME.step(0.5); GAME.shot(); 1")
    m0 = J("__T.mem()")
    r = enter(hid)
    if not r.get('ok'):
        ck(f'{place} {label} ({hid}) entered', False, r)
        return None
    sv = J("__T.survey()")
    print('house', place, label, json.dumps(sv, ensure_ascii=False)[:1600], flush=True)
    E("GAME.step(0.3)")
    shot(f'{place}_{label}_eingang', {'house': hid})
    for rid in rooms_of():
        kind = rid.rstrip('0123456789').rstrip('_-')
        E(f"(() => {{ const H = HAEUSER.H; __T.roomView(H, '{rid}', 0); GAME.step(0.2); __T.roomView(H, '{rid}', 0); return 1; }})()")
        shot(f'{place}_{label}_{rid}', {'house': hid, 'room': rid})
        if any(rid.startswith(b) for b in both):
            E(f"__T.roomView(HAEUSER.H, '{rid}', 2); GAME.step(0.05); 1")
            shot(f'{place}_{label}_{rid}_b', {'house': hid, 'room': rid})
    if night:
        mode('night')
        st = J("(() => { const H = HAEUSER.H, P = H.plan, r = P.rooms.find(q => q.kind === 'stube') || P.rooms[0]; H.light(r.id, true); __T.roomView(H, r.id, 0); GAME.step(0.3); __T.roomView(H, r.id, 0); return r.id; })()")
        shot(f'{place}_{label}_{st}_nacht', {'house': hid, 'room': st, 'night': 1})
        st2 = J("(() => { const H = HAEUSER.H, P = H.plan, r = P.rooms.find(q => q.kind === 'kueche'); if (!r) return null; H.light(r.id, true); __T.roomView(H, r.id, 0); GAME.step(0.3); __T.roomView(H, r.id, 0); return r.id; })()")
        if st2: shot(f'{place}_{label}_{st2}_nacht', {'house': hid, 'room': st2, 'night': 1})
        mode('day')
    leave()
    E("GAME.step(0.3); GAME.shot(); 1")
    m1 = J("__T.mem()")
    METRICS['houses'].append({'place': place, 'label': label, 'id': hid, 'survey': sv, 'mem0': m0, 'mem1': m1})
    return sv


def checks(place, svs):
    """the realism checks over the houses seen (a survey from the kit, INREAL.survey, where the push has made it)"""
    svs = [s for s in svs if s]
    if not svs: return
    ck(f'{place}: every house ≤ 60 draw calls', all(s['stats']['draws'] <= 60 for s in svs), [s['stats'] for s in svs])
    real = [s['real'] for s in svs if s.get('real')]
    if TAG == 'vorher' or not real:
        return
    # a kitchen with a sink and a stove, a bathroom with a toilet and a basin, a bed in every bedroom, a lamp in every room
    for s in svs:
        R = s['real']
        ck(f"{place} {s['id']} ({s['look']}): kitchen with sink, stove and fridge; bath with toilet and basin; a bed in each bedroom",
           R['kitchenOk'] and R['bathOk'] and R['bedOk'], {k: R[k] for k in ('kitchenOk', 'bathOk', 'bedOk', 'miss')})
        ck(f"{place} {s['id']}: the front door into the hall, windows inside as outside, a lamp in every room",
           R['doorHall'] and R['winOk'] and R['lampsOk'], {k: R[k] for k in ('doorHall', 'winOk', 'lampsOk', 'miss')})
    sig = [s['real'].get('sig') for s in svs if s['real'].get('sig')]
    ck(f'{place}: no two living rooms alike (the clutter and the furniture by household)', len(set(sig)) == len(sig), sig)


with lib.browser() as b:
    pg = lib.page(b, int(opts.get('w', 1152)), int(opts.get('h', 648)), errs=errs, tier=TIER)
    # ---------------- Ratscher ----------------
    if 'ratscher' in SECT:
        boot('?szenario=haeuser')
        wait_scene("!!(window.HAEUSER && HAEUSER.scen && HAEUSER.doors)", 120)
        clock(11, 0)
        mode('day')
        picks = J("""(() => { const L = HAEUSER.list().map(h => h.id), lk = id => HAEUSER.lookOf(id), P = id => ZIPLAN.plan(id), out = [];
          const area = id => { const p = P(id); return p ? (p.xi1 - p.xi0) * (p.yi1 - p.yi0) : 0; };
          const ok = id => P(id) && P(id).rooms.some(r => r.kind === 'stube') && P(id).rooms.some(r => r.kind === 'kueche');
          const add = (lbl, id) => { if (id && !out.some(o => o[1] === id)) out.push([lbl, id]); };
          add('szene', HAEUSER.scen);
          add('gerhard_ddr', 247);
          add('manfred_90', 219);
          add('alt', L.find(id => lk(id) === 'alt' && ok(id)));
          const heute = L.filter(id => lk(id) === 'heute' && ok(id)).sort((a, b) => area(b) - area(a));
          add('gross', heute[0]);
          add('klein', heute[heute.length - 1]);
          add('mittel', heute[heute.length >> 1]);
          return out; })()""")
        picks = picks[:NH]
        print('Ratscher houses', picks, flush=True)
        svs = []
        for i, (lbl, hid) in enumerate(picks):
            svs.append(house('r', hid, lbl, night=NIGHT and i < 2))
        # the villager at home by the hour (haeuser/haeuser.js doing): Gerhard in the afternoon on his couch, at noon at the stove, late in
        # the evening with the TV on, at night asleep in his bed – each time the first minute of the hour's span when dorf's day has him in
        for label, h0, h1, want, md in (('nachmittag', 14, 17, ('sofa', 'tisch'), 'day'), ('mittag', 11.6, 12.4, ('herd',), 'day'),
                                         ('abend', 19.5, 22.3, ('tv',), 'night'), ('nacht', 23, 23.9, ('bett',), 'night')):
            t = J(f"""(() => {{ const d = Math.floor(CLOCK.t / 1440) + 1; for (let m = Math.round({h0} * 60); m < Math.round({h1} * 60); m += 5) {{ const t = d * 1440 + m;
              if (!DLIFE.away('gerhard', t) && !DLIFE.routine('gerhard', t) && !DCAL.on('skat', t) && !DCAL.on('fire', t)) {{ CLOCK.t = t; return t; }} }} return null; }})()""")
            if t is None:
                print('gerhard not at home', label, flush=True); continue
            mode(md)
            r = enter(247)
            for _ in range(200):
                if E("!!(window.HGAST && HGAST.f) || !HAEUSER.guest"): break
                E("GAME.step(0.05)"); time.sleep(0.1)
            g = J("({ t: CLOCK.t % 1440, guest: HAEUSER.guest, doing: HAEUSER.doing, asleep: HAEUSER.asleep, tv: HAEUSER.tv, fig: !!(window.HGAST && HGAST.f), at: window.HGAST && HGAST.f ? HGAST.f.at : null, err: window.HGAST ? HGAST.err : null })")
            print('gast', label, json.dumps(g, ensure_ascii=False), flush=True)
            if g['fig']:
                E("""(() => { const H = HAEUSER.H, f = HGAST.f, p = f.at.head || [f.at.x, f.at.y], rid = H.roomAt(p[0], p[1], f.at.z + 0.5), r = H.rooms.find(q => q.id === rid) || H.rooms[0], c = [0, 1].map(i => r.poly.reduce((s, q) => s + q[i], 0) / 4);
                  const dx = p[0] - c[0], dy = p[1] - c[1], L = Math.hypot(dx, dy) || 1, ex = p[0] - dx / L * 2.3 + 0.2, ey = p[1] - dy / L * 2.3 + 0.2;
                  if (HAEUSER.H && f.at.mode !== 'lie') { const rr = H.rooms.find(q => q.id === rid); if (rr) H.light(rid, true); }
                  __T.stand(ex, ey, r.z0, Math.atan2(p[0] - ex, p[1] - ey) * 180 / Math.PI); CAM3.want = false; GAME.view(ex, ey, r.z0 + 1.6, Math.atan2(p[0] - ex, p[1] - ey) * 180 / Math.PI, -18, 78); GAME.step(0.3); return 1; })()""")
                shot(f'r_gerhard_{label}', {'house': 247, 'doing': g.get('doing')})
            ck(f'Gerhard at home ({label}): his figure where one is at that hour ({"/".join(want)})', g['fig'] and g.get('doing') in want, g)
            leave()
            mode('day')
        checks('Ratscher', svs)
    # ---------------- Schleusingen ----------------
    if 'schleusingen' in SECT:
        fetch_tiles([(-1084.7, 1241.9)])
        boot('?szenario=schleusingen-innen')
        ok = wait_scene("!!(window.SINNEN && SINNEN.status().state === 'ready' && SINNEN.scen)", 900)
        ck('Schleusingen: the town stands and its houses are indexed', ok, '')
        if ok:
            clock(11, 0)
            mode('day')
            picks = J("""(() => { const L = SINNEN.list(), out = [], add = (lbl, id) => { if (id && !out.some(o => o[1] === id)) out.push([lbl, id]); };
              const M = SCHL.MARKT, d = h => Math.hypot(h.door.x - M[0], h.door.y - M[1]);
              add('szene', SINNEN.scen);
              const tr = L.filter(h => h.kind === 'treppenhaus').sort((a, b) => d(a) - d(b));
              add('treppenhaus', tr[0] && tr[0].id);
              const hs = L.filter(h => h.kind === 'haus').sort((a, b) => d(a) - d(b));
              add('ddr', (hs.find(h => HAEUSER.lookOf(h.id) === 'heute-ddr') || {}).id);
              add('heute90', (hs.find(h => HAEUSER.lookOf(h.id) === 'heute-90') || {}).id);
              add('haus2', (hs.find(h => HAEUSER.lookOf(h.id) === 'heute' && h.id !== SINNEN.scen) || {}).id);
              return out; })()""")
            picks = picks[:max(2, NH - 1)]
            print('Schleusingen houses', picks, flush=True)
            svs = []
            for i, (lbl, hid) in enumerate(picks):
                if lbl == 'treppenhaus':
                    # the stairwell and the open flat of the first floor
                    E("GAME.step(0.5); GAME.shot(); 1")
                    r = enter(hid)
                    if not r.get('ok'):
                        ck(f'Schleusingen stairwell house {hid} entered', False, r); continue
                    sv = J("__T.survey()")
                    print('house s', lbl, json.dumps(sv, ensure_ascii=False)[:1600], flush=True)
                    shot(f's_{lbl}_eingang', {'house': hid})
                    fl = J("""(() => { const H = HAEUSER.H, P = H.plan, od = (P.open || [])[0]; if (!od) return null; const into = od.side === 'L' ? 1 : -1, b = P.toW(od.x - into * 1.15, od.y);
                      __T.stand(b[0], b[1], P.zF[od.fl], 0); GAME.step(0.2); return P.rooms.filter(r => r.flat && r.fl === od.fl).map(r => r.id); })()""")
                    for rid in (fl or [])[:5]:
                        E(f"(() => {{ const H = HAEUSER.H; __T.roomView(H, '{rid}', 0); GAME.step(0.2); __T.roomView(H, '{rid}', 0); return 1; }})()")
                        shot(f's_{lbl}_{rid}', {'house': hid, 'room': rid})
                    leave()
                    svs.append(sv)
                    continue
                svs.append(house('s', hid, lbl, night=NIGHT and i == 0))
            checks('Schleusingen', svs)
    json.dump(METRICS, open(os.path.join(OUT, 'metrics_' + '+'.join(sorted(SECT)) + '.json'), 'w'), indent=1, ensure_ascii=False)
    ok, gl = lib.check_gl(pg, 16)
    ck('shader programs within 16 textures, none broken', ok, {k: gl[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})
    ck.errors(errs)
    ck.done()
