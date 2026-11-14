# feat/schleusingen-innen (Falko, 13.11.2026 23:56: „wann kann ich alle Gebäude begehen?“): the houses of Schleusingen can be entered as
# Ratscher's (schleusingen/si_plan.js SIPLAN, si_laden.js SILADEN, si_innen.js SINNEN – on haeuser/haeuser.js and the zombie night's kit).
# In the old town: the enterable houses counted by kind and by look; at a house's street door by day and at night „Hineingehen“ (the HUD's
# button „Hineingehen · E“), in behind the fade, the hint „Ausgedacht“ once, walls stop one, the floor carries one, the stairs up and down,
# the cellar, the attic, „Hinausgehen“ at the door inside, out again: nothing mounted, the ground of the tiles whole again, the memory
# back, no new program; in a stairwell house the letter boxes (real size), up the stairs to every storey, into the open flat, „Verschlossen“
# at a locked one; a shop open on a Tuesday morning (the sales room capped, the door „Nur für Personal“), closed on a Sunday
# („Geschlossen“); the looks drawn with the programs that were there; every house mounted and freed once (plan checks, draw calls,
# triangles, no error, no new program); the phone's budget (≤ 120 000 triangles, one flat per stairwell house); a save from inside puts
# one in front of the door after a reload. The world tiles come from the published site (as viz3/test/laeden.py). Pictures in
# out/schleusingen_innen/.
#   python3 viz3/test/schleusingen_innen.py PORT [only=door+walk+night+mem+treppe+laden+looks+sweep+phone+save,haus=<id>,bilder=2]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
ONLY = set(opts.get('only', '').split('+')) - {''}
BILDER = int(opts.get('bilder', 2))
OUT = lib.out('schleusingen_innen')
ck = lib.Checks('schleusingen_innen')
errs = []
HINT = 'pav-schl-innen-hinweis'


def want(k):
    return not ONLY or k in ONLY


HELP = r"""
window.__T = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#tut').forEach(e => e.style.visibility = 'hidden'); },
  mem() { const m = GAME.R.info.memory; return { g: m.geometries, t: m.textures, p: GAME.R.info.programs.length }; },
  progKeys() { return GAME.R.info.programs.map(p => p.cacheKey); },
  stand(x, y, z, yaw) { const P = GAME.P; P.mode = 'walk'; P.x = x; P.y = y; P.feet = z; P.vz = 0; P.yaw = yaw; P.body = yaw; P.pitch = -6; GAME.step(0.1); },
  walkTo(x, y, secs = 8) { const P = GAME.P; for (let t = 0; t < secs; t += 0.05) { const dx = x - P.x, dy = y - P.y; if (Math.hypot(dx, dy) < 0.25) break; P.yaw = Math.atan2(dx, dy) * 180 / Math.PI; P.body = P.yaw; GAME.step(0.05, 1); }
    GAME.step(0.6);
    const H = HAEUSER.H; return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), room: H ? H.roomAt(P.x, P.y, P.feet + 1) : null }; },
  push(yaw, secs) { const P = GAME.P; P.yaw = P.body = yaw; for (let t = 0; t < secs; t += 0.05) GAME.step(0.05, 1); GAME.step(0.3); return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2) }; },
  best() { const a = PLAY.best; try { return a ? { id: a.id, label: a.label() } : null; } catch (e) { return { err: String(e) }; } },
  label(id) { const a = KERN.acts().find(q => q.id === id); try { return a ? a.label() : 'no act'; } catch (e) { return 'ERR ' + e.message; } },
  act(id) { const a = KERN.acts().find(q => q.id === id); if (!a) return false; a.run(); return true; },
  think() { const e = document.querySelector('#npcsub'); return e ? e.textContent : ''; },
  clearThink() { const e = document.querySelector('#npcsub'); if (e) e.textContent = ''; return 1; },
  // the programs the house's meshes use that were not there before (its shell, furniture, lamps, doors, the shop's fixtures)
  ownPrograms(H, before) {
    const R = GAME.R, keys = new Set(before), bad = new Set(), groups = [H.group].concat(H.lamps.map(l => l.g), H.doorKeys.map(k => DOORS[k].group));
    for (const g of groups) g.traverse(o => { if (!o.isMesh) return; const p = R.properties.get(o.material).currentProgram; if (p && !keys.has(p.cacheKey)) bad.add((o.material.name || o.material.type) + ' ' + p.cacheKey.slice(-80)); });
    return [...bad];
  },
  roomView(H, rid, corner) {
    const P = H.plan, r = P.rooms.find(q => q.id === rid), d = H.doors.find(q => q.room === rid), dp = d ? P.toL(d.pos[0], d.pos[1]) : [(r.x0 + r.x1) / 2, r.y0];
    const cs = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].sort((a, b) => Math.hypot(a[0] - dp[0], a[1] - dp[1]) - Math.hypot(b[0] - dp[0], b[1] - dp[1]));
    const c = cs[corner || 0], m = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], e = [c[0] + Math.sign(m[0] - c[0]) * 0.75, c[1] + Math.sign(m[1] - c[1]) * 0.75];
    const ew = P.toW(e[0], e[1]), mw = P.toW(m[0], m[1]), sw = P.toW(c[0] + Math.sign(m[0] - c[0]) * 0.3, c[1] + Math.sign(m[1] - c[1]) * 0.3);
    const yaw = Math.atan2(mw[0] - ew[0], mw[1] - ew[1]) * 180 / Math.PI;
    this.stand(sw[0], sw[1], r.z0, yaw); CAM3.want = false; GAME.view(ew[0], ew[1], r.z0 + 1.62, yaw, -12, 80); GAME.step(0.05);
  },
  // in front of a house's street door outside, facing it, third person
  outside(id) { const h = SINNEN.list().find(q => q.id === id); if (!h) return null; const x = h.door.x + h.door.nx * 1.6, y = h.door.y + h.door.ny * 1.6;
    this.stand(x, y, KERN.ground(x, y), (Math.atan2(-h.door.nx, -h.door.ny) * 180 / Math.PI + 360) % 360); CAM3.want = true; GAME.step(0.5); return h; },
  // the tiles of the world wearing the copy of their material that leaves the house's rectangle out
  holed() { let n = 0; for (const t of WELT.tiles.values()) if (t.mesh && t.mesh.material && t.mesh.material.userData && t.mesh.material.userData.siOwn) n++; return n; },
  // a stairwell house: up one storey on the stacked flights – from the house door (storey 0) or from beside the top of the flight below,
  // along the walkway to the foot of the next flight, up it, beside its top
  climb(H, fl) {
    const P = H.plan, st = P.stair, cx = (st.x0 + st.x1) / 2, sx = st.side === 'R' ? st.x0 - 0.38 : st.x1 + 0.38, W = (x, y) => P.toW(x, y), out = {};
    if (fl === 0) this.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
    else { const a = W(sx, st.y0 - 0.55); out.walkway = this.walkTo(a[0], a[1], 10); }
    const f = W(cx, st.y0 - 0.6), t = W(cx, st.y1 - 0.15), c = W(sx, st.y1 - 0.2);
    out.foot = this.walkTo(f[0], f[1], 10); out.step = this.walkTo(t[0], t[1], 14); out.top = this.walkTo(c[0], c[1], 4); out.z = +P.zF[fl + 1].toFixed(2);
    return out;
  },
  // into the open flat of a storey: in front of its door in the stairwell, the door opened, through it into the flat's hall
  flat(H, fl) {
    const P = H.plan, od = (P.open || []).find(d => d.fl === fl); if (!od) return { none: true };
    const into = od.side === 'L' ? 1 : -1, dd = P.doors.find(d => d.flatDoor && d.fl === fl), hd = dd && H.doors.find(q => q.room === dd.room);
    const a = P.toW(od.x + into * 0.8, od.y), b = P.toW(od.x - into * 1.15, od.y), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
    this.stand(a[0], a[1], P.zF[fl], yaw); GAME.step(0.3);
    if (hd) GAME.setDoorNow(hd.key, true); GAME.step(0.3);
    const at = this.walkTo(b[0], b[1], 6);
    return { room: dd && dd.room, at, z: +P.zF[fl].toFixed(2), rooms: P.rooms.filter(r => r.flat && r.fl === fl).map(r => r.id) };
  },
  // a locked flat's door: its label, its words, and walking into it leaves one in the stairwell
  locked(H, fl) {
    const P = H.plan, i = (P.locked || []).findIndex(d => d.fl === fl); if (i < 0) return { none: true };
    const d = P.locked[i], into = d.side === 'L' ? 1 : -1, id = 'si:zu:' + H.id + ':' + i, a = P.toW(d.x + into * 0.75, d.y), b = P.toW(d.x - into * 1.0, d.y);
    const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
    this.stand(a[0], a[1], P.zF[fl], yaw); GAME.step(0.3);
    const lbl = this.label(id), best = this.best(); this.clearThink(); this.act(id); const think = this.think();
    this.push(yaw, 2.0);
    const trep = P.rooms.find(r => r.trep && r.fl === fl);
    return { id, lbl, best, think, room: H.roomAt(GAME.P.x, GAME.P.y, GAME.P.feet + 1), trep: trep && trep.id, feet: +GAME.P.feet.toFixed(2), z: +P.zF[fl].toFixed(2) };
  },
};
"""


def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)


# the whole page with the action button of the HUD shown – slow in SwiftShader: a long time limit, and never fatal
def page_shot(name):
    try:
        E("document.querySelectorAll('#doorbtn,#act2').forEach(e => e.style.visibility = 'visible'); GAME.step(0.05); GAME.shot(); 1")
        lbl = E("(document.querySelector('#doorbtn') || {}).textContent || ''")
        pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=180000)
        print('page shot', name, repr(lbl), flush=True)
        return lbl
    except Exception as e:
        print('page shot failed', name, str(e)[:200], flush=True)
        return None
    finally:
        E("document.querySelectorAll('#doorbtn,#act2').forEach(e => e.style.visibility = 'hidden'); 1")


def fetch_tiles(centres):
    """the world tiles around the old town, as viz3/test/laeden.py does (its function, run without its checks)"""
    src = open(os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py')).read()
    pre = src.split('# ---------------------------------------------------------------- without a browser')[0]
    pre = pre.replace("port = sys.argv[1] if len(sys.argv) > 1 else '8951'", "port = '0'")
    pre = pre.replace("want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,nord,mitte,rewe,nacht').split(','))", "want = set()")
    pre = pre.replace("ck = lib.Checks('laeden')", "ck = None")
    ns = {'__file__': os.path.join(lib.ROOT, 'viz3', 'test', 'laeden.py'), '__name__': 'laeden_pre'}
    exec(compile(pre, 'laeden_pre', 'exec'), ns)
    ns['fetch_tiles'](centres)


def set_time(day_of_week, hh, mm=0):
    # 0 Sunday … 2 Tuesday … 6 Saturday (dorf/dorf_cal.js)
    d = J(f"(() => {{ for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === {day_of_week}) return d; return 1; }})()")
    E(f"CLOCK.t = {d * 1440 + hh * 60 + mm}; DN.active && DN.update(true); GAME.step(0.1)")
    lib.settle_light(pg)


def boot(q=''):
    t0 = time.time()
    hs = opts.get('haus')
    pg.goto(f'http://localhost:{port}/index.html?szenario=schleusingen-innen' + (f'&haus={hs}' if hs else '') + q, timeout=300000, wait_until='domcontentloaded')
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
    t1, st = time.time(), {}
    while time.time() - t1 < 900:
        st = J("({ s: window.SINNEN ? SINNEN.status().state : 'none', town: window.SCHL ? SCHL.state : 'none', scen: (window.SINNEN && SINNEN.scen) || null })")
        if (st['s'] == 'ready' and st['scen']) or st['town'] == 'error' or st['s'] == 'none':
            break
        E("GAME.step(0.5)"); time.sleep(0.5)
    print('town', round(time.time() - t1), 's', json.dumps(st), flush=True)
    return st


def wait_in(limit=300):
    for _ in range(limit):
        if E("!!HAEUSER.H && !HAEUSER.busy"): return True
        E("GAME.step(0.05)"); time.sleep(0.05)
    return False


def wait_out(limit=300):
    for _ in range(limit):
        if E("!HAEUSER.H && !HAEUSER.busy"): return True
        E("GAME.step(0.05)"); time.sleep(0.05)
    return False


def enter(hid):
    E(f"window.__EN = null; HAEUSER.enter({hid}).then(v => window.__EN = {{ ok: v }}, e => window.__EN = {{ err: String(e) }}); 1")
    for _ in range(300):
        if E("!!window.__EN"): break
        E("GAME.step(0.05)"); time.sleep(0.05)
    return J("window.__EN") or {}


def leave():
    E("window.__LV = null; (HAEUSER.H ? HAEUSER.leave() : Promise.resolve(true)).then(v => window.__LV = { ok: v }, e => window.__LV = { err: String(e) }); 1")
    for _ in range(300):
        if E("!!window.__LV"): break
        E("GAME.step(0.05)"); time.sleep(0.05)
    return J("window.__LV") or {}


def night(on):
    E(f"GAME.setMode('{'night' if on else 'day'}'); GAME.step(0.3)")
    lib.settle_light(pg)


INSIDE = """(() => { const H = HAEUSER.H; if (!H) return null; return { id: H.id, kind: H.plan.kind, shop: H.plan.shopType || null, look: H.plan.look, nSt: H.plan.nSt,
  stats: { ms: Math.round(H.stats.ms), draws: H.stats.draws, tris: H.stats.tris }, siTris: H.siTris, shopTris: H.siShop ? H.siShop.tris : 0,
  rooms: H.rooms.map(r => r.id + ':' + r.name), walker: { x: +GAME.P.x.toFixed(2), y: +GAME.P.y.toFixed(2), feet: +GAME.P.feet.toFixed(2) }, entry: H.entry,
  saved: SAVE.get(HAEUSER.KEY), place: KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 1), holed: __T.holed(), think: __T.think(), hint: SAVE.get('""" + HINT + """'),
  acts: H.siActs || [], err: SINNEN.err || ZINNEN.err || '' }; })()"""

centre = (-1084.7, 1241.9)
fetch_tiles([centre])
with lib.browser() as b:
    pg = lib.page(b, 1920, 1080, errs=errs, tier='hoch')
    st = boot()
    ck('the town stands and its houses are indexed', st.get('s') == 'ready' and st.get('scen'), st)
    if st.get('s') != 'ready':
        ck.errors(errs); ck.done()
    S = J("SINNEN.status()")
    print('status', json.dumps({k: S[k] for k in ('n', 'kinds', 'why', 'signs', 'shops', 'ms', 'err')}, ensure_ascii=False), flush=True)
    ck('many houses of the old town can be entered: whole houses, stairwell houses, shops', S['n'] > 400 and S['kinds'].get('haus', 0) > 200 and S['kinds'].get('treppenhaus', 0) > 80 and S['kinds'].get('laden', 0) >= 2, {'n': S['n'], 'kinds': S['kinds']})
    ck('left out: the landmarks, churches, named buildings (the Rathaus with them), sheds, halls, buildings without a street door', all(S['why'].get(k, 0) > 0 for k in ('wahrzeichen', 'name', 'schuppen', 'halle', 'keine tür')), S['why'])
    ck('indexing the town takes little time (planned a few per frame)', S['ms'] < 3000, S['ms'])
    looks = J("(() => { const o = {}; for (const h of SINNEN.list()) { const l = HAEUSER.lookOf(h.id); o[l] = (o[l] || 0) + 1; } return o; })()")
    n = S['n']
    print('looks', json.dumps(looks), flush=True)
    ck('the looks of 2026: mostly „heute“, some „heute-90“, few „heute-ddr“, rarely „alt“', looks.get('heute', 0) > n * 0.5 and looks.get('heute-90', 0) > looks.get('heute-ddr', 0) > looks.get('alt', 0) > 0 and looks.get('alt', 0) < n * 0.06, looks)
    set_time(2, 10, 30)  # a Tuesday morning: the shops open
    hid = E("SINNEN.scen")
    info0 = J(f"SINNEN.info({hid})")
    print('scene house', hid, json.dumps(info0, ensure_ascii=False)[:700], flush=True)

    # ---- at the door by day: the action, going in, the hint once; walking; coming out ----
    if want('door') or want('walk') or want('mem'):
        E(f"__T.outside({hid}); 1")
        st = J("(() => { GAME.step(0.4); return { best: __T.best(), near: HAEUSER.near && HAEUSER.near.id, label: __T.label('haeuser:rein') }; })()")
        print('door', json.dumps(st, ensure_ascii=False), flush=True)
        ck('at the street door of a house of the old town by day: „Hineingehen“', st['label'] == 'Hineingehen' and st['near'] == hid and st['best'] and st['best']['id'] == 'haeuser:rein', st)
        shot('00_tuer_tag')
        lbl = page_shot('00_tuer_tag_hud')
        ck('the HUD\'s action button says „Hineingehen · E“', lbl is None or lbl.replace(' ', '') in ('Hineingehen·E', 'Hineingehen'), lbl)
        for _ in range(8): E("GAME.step(0.5); GAME.shot(); 1")
        hint0 = E(f"SAVE.get('{HINT}')")
        E("__T.clearThink(); PLAY.run ? PLAY.run(KERN.acts().find(a => a.id === 'haeuser:rein')) : __T.act('haeuser:rein'); 1")
        wait_in()
        info = J(INSIDE)
        print('inside', json.dumps(info, ensure_ascii=False)[:1500], flush=True)
        ok_in = bool(info) and info['id'] == hid and abs(info['walker']['x'] - info['entry']['x']) < 0.3 and abs(info['walker']['feet'] - info['entry']['z']) < 0.1
        ck('going in: the house is built behind the fade, one stands inside its door', ok_in, info and {k: info[k] for k in ('id', 'walker', 'entry')})
        ck('the hint „Ausgedacht“ (the real residents are not known to the game), saved as shown', bool(info) and not hint0 and info['hint'] is True and info['think'].startswith('Ausgedacht') and 'Schleusingen' in info['think'], info and (info['think'], info['hint']))
        ck('inside: ≤ 60 draw calls', bool(info) and info['stats']['draws'] <= 60, info and info['stats'])
        ck('the place on the HUD: the room, in Schleusingen', bool(info) and (info['place'] or '').endswith(', Schleusingen'), info and info['place'])
        ck('the ground of the tiled world left out under the house (its tiles wear the copy with the hole)', bool(info) and info['holed'] > 0, info and info['holed'])
        ck('saved while inside (the door to come back to)', bool(info) and bool(info['saved']) and info['saved']['id'] == hid, info and info['saved'])
        E("GAME.step(0.3)")
        shot('01_flur_tag')
        if want('walk') and info:
            r = J("(() => { const H = HAEUSER.H, P = H.plan; const e = H.entry; __T.stand(e.x, e.y, e.z, e.yaw); const a = __T.push((e.yaw + 90) % 360, 3); const b = __T.push((e.yaw + 270) % 360, 6); return { a, b, insideA: H.inside(a.x, a.y, a.feet), insideB: H.inside(b.x, b.y, b.feet), zG: P.zG }; })()")
            print('walls', json.dumps(r), flush=True)
            ck('walls stop one (inside after walking into them)', r['insideA'] and r['insideB'], r)
            ck('the floor carries (feet on the ground floor)', abs(r['b']['feet'] - r['zG']) < 0.06, r)
            r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.stair || P.nSt < 2) return { none: true };
              const st = P.stair, cx = (st.x0 + st.x1) / 2, a = P.toW(cx, st.y0 - 0.6), b = P.toW(cx, st.y1 - 0.15), c = P.toW(st.side === 'R' ? st.x0 - 0.3 : st.x1 + 0.3, st.y1 - 0.2);
              __T.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              out.foot = __T.walkTo(a[0], a[1], 10); out.step = __T.walkTo(b[0], b[1], 14); out.top = __T.walkTo(c[0], c[1], 4); out.zTop = P.zF[1];
              const back = P.toW(cx, st.y1 - 0.2); out.back = __T.walkTo(back[0], back[1], 4); out.down = __T.walkTo(a[0], a[1], 14); out.zG = P.zG; return out; })()""")
            print('stairs', json.dumps(r), flush=True)
            if not r.get('none'):
                ck('up the stairs to the upper floor', abs(r['top']['feet'] - r['zTop']) < 0.1, r)
                ck('and down again', abs(r['down']['feet'] - r['zG']) < 0.1, r)
            r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.astair) return { none: true };
              const st = P.astair, cx = (st.x0 + st.x1) / 2, dir = st.y1 >= st.y0 ? 1 : -1, a = P.toW(cx, st.y0 - dir * 0.7), b = P.toW(cx, st.y1 + dir * 0.7);
              __T.stand(a[0], a[1], P.zF[P.nSt - 1], Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI);
              out.top = __T.walkTo(b[0], b[1], 14); out.zA = P.zA; return out; })()""")
            print('attic', json.dumps(r), flush=True)
            if not r.get('none'):
                ck('up into the attic', abs(r['top']['feet'] - r['zA']) < 0.1, r)
                shot('02_dachboden')
            r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.hatch) return { none: true };
              const h = P.hatch, cx = (h.x0 + h.x1) / 2, kr = P.rooms.find(q => q.id === h.room.id), dd = H.doors.find(q => q.room === kr.id);
              __T.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              if (dd) GAME.setDoorNow(dd.key, true);
              const p = P.doors.find(q => q.room === kr.id); if (p) { const vert = p.axis === 'y', into = vert ? Math.sign((kr.x0 + kr.x1) / 2 - p.x) : Math.sign((kr.y0 + kr.y1) / 2 - p.y);
                const a = P.toW(vert ? p.x - into * 0.7 : p.x, vert ? p.y : p.y - into * 0.7), b = P.toW(vert ? p.x + into * 0.8 : p.x, vert ? p.y : p.y + into * 0.8); out.door = __T.walkTo(a[0], a[1], 10); out.inKitchen = __T.walkTo(b[0], b[1], 6); }
              const t = P.toW(cx, h.y0 - 0.5); out.atHatch = __T.walkTo(t[0], t[1], 8);
              GAME.setDoorNow(H.hatch.key, true); GAME.step(0.2);
              const d = P.toW(cx, h.y1 + 0.3); out.down = __T.walkTo(d[0], d[1], 12); out.zK = P.cellar.z0; out.place = KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 1);
              const u = P.toW(cx, h.y0 - 0.6); out.up = __T.walkTo(u[0], u[1], 14); out.zG = P.zG; return out; })()""")
            print('cellar', json.dumps(r, ensure_ascii=False), flush=True)
            if not r.get('none'):
                ck('down into the cellar through the trapdoor', abs(r['down']['feet'] - r['zK']) < 0.15, r)
                ck('and up again', abs(r['up']['feet'] - r['zG']) < 0.15, r)
            # pictures of the rooms by day
            rooms = J("(() => { const P = HAEUSER.H.plan, pick = k => P.rooms.filter(r => r.kind === k)[0]; return ['stube', 'kueche', 'schlafzimmer', 'bad', 'kinderzimmer'].map(pick).filter(Boolean).map(r => r.id); })()")
            for rid in rooms[:max(1, BILDER + 1)]:
                E(f"(() => {{ const H = HAEUSER.H; __T.roomView(H, '{rid}', 0); GAME.step(0.2); __T.roomView(H, '{rid}', 0); return 1; }})()")
                shot(f'03_{hid}_{rid}_tag')
        # ---- coming out ----
        if info:
            r = J("(() => { const H = HAEUSER.H; __T.stand(H.entry.x, H.entry.y, H.entry.z, (H.entry.yaw + 180) % 360); GAME.step(0.3); return { best: __T.best(), label: __T.label('haeuser:raus') }; })()")
            print('exit', json.dumps(r, ensure_ascii=False), flush=True)
            ck('inside at the door „Hinausgehen“', r['label'] == 'Hinausgehen', r)
            lbl = page_shot('04_tuer_innen_hud')
            ck('inside the HUD\'s action button says „Hinausgehen · E“', lbl is None or lbl.replace(' ', '') in ('Hinausgehen·E', 'Hinausgehen'), lbl)
            E("__T.act('haeuser:raus'); 1")
            wait_out()
            E("GAME.shot(); GAME.step(0.2); GAME.shot()")
            r = J("({ H: !!HAEUSER.H, mounted: ZINNEN.mounted().length, si: SINNEN.status().mounted, holed: __T.holed(), saved: SAVE.get(HAEUSER.KEY), x: GAME.P.x, y: GAME.P.y })")
            print('out', json.dumps(r), flush=True)
            ck('coming out: in front of the door, nothing mounted, nothing saved, the ground of the tiles whole again', not r['H'] and r['mounted'] == 0 and not r['si'] and r['holed'] == 0 and r['saved'] is None, r)
            shot('05_draussen')
        if want('mem') and info:
            # in and out again in front of the door: the geometries and textures back to the count before, no new program (the first house
            # made the tiles' copy behind its fade); a cell streamed meanwhile adds to the count, so a cycle that ends above its start is run
            # once more – a leak of the house repeats, a cell does not. The hint is not shown again.
            for rep in range(3):
                for _ in range(4): E("GAME.step(0.5); GAME.shot(); 1")
                m0 = J("__T.mem()")
                E("__T.clearThink(); 1")
                enter(hid)
                E("GAME.shot(); 1")
                m1 = J("__T.mem()")
                th = E("__T.think()")
                leave()
                E("GAME.step(0.2); GAME.shot(); 1")
                m2 = J("__T.mem()")
                print('cycle', rep, json.dumps({'m0': m0, 'm1': m1, 'm2': m2}), flush=True)
                if m2['g'] <= m0['g'] and m2['t'] <= m0['t'] and m2['p'] <= m0['p']: break
            ck('in and out again: the memory back (geometries, textures), no new program', m2['g'] <= m0['g'] and m2['t'] <= m0['t'] and m1['p'] <= m0['p'], {'m0': m0, 'm1': m1, 'm2': m2})
            ck('the hint „Ausgedacht“ only once', not th.startswith('Ausgedacht'), th)

    # ---- at night: the door, inside with the hall's lamp on ----
    if want('night'):
        night(True)
        E(f"__T.outside({hid}); 1")
        r = J("(() => { GAME.step(0.4); return { label: __T.label('haeuser:rein'), best: __T.best(), near: HAEUSER.near && HAEUSER.near.id }; })()")
        ck('at night the door action too', r['label'] == 'Hineingehen' and r['near'] == hid, r)
        shot('10_tuer_nacht')
        lbl = page_shot('10_tuer_nacht_hud')
        ck('at night the HUD\'s action button says „Hineingehen · E“ too', lbl is None or lbl.replace(' ', '') in ('Hineingehen·E', 'Hineingehen'), lbl)
        enter(hid)
        r2 = J("(() => { const H = HAEUSER.H; if (!H) return null; GAME.step(0.4); return { lit: Object.keys(H.lit).filter(k => H.lit[k]), lights: KERN.lights.status() }; })()")
        print('night inside', json.dumps(r2), flush=True)
        ck('at night the hall\'s lamp is on, a lamp of the pool lent (no new light)', bool(r2) and any(k.startswith('flur') for k in r2['lit']) and any(s['id'] == 'zinnen' and s['has'] == 1 for s in r2['lights']), r2)
        E("GAME.step(0.3)")
        shot('11_flur_nacht')
        rid = E("(() => { const r = HAEUSER.H.plan.rooms.find(q => q.kind === 'stube') || HAEUSER.H.plan.rooms.find(q => q.kind === 'kueche'); if (!r) return null; HAEUSER.H.light(r.id, true); __T.roomView(HAEUSER.H, r.id, 0); GAME.step(0.2); return r.id; })()")
        if rid: shot(f'12_{hid}_{rid}_nacht')
        leave()
        night(False)
        set_time(2, 10, 30)

    # ---- a stairwell house: the letter boxes, up the stairs to every storey, the attic, a locked flat, into the open flat ----
    if want('treppe'):
        tid = E("""(() => { const M = SCHL.MARKT, L = SINNEN.list().filter(h => h.kind === 'treppenhaus').sort((a, b) => Math.hypot(a.door.x - M[0], a.door.y - M[1]) - Math.hypot(b.door.x - M[0], b.door.y - M[1]));
          const I = h => SINNEN.info(h.id), ok = L.find(h => { const i = I(h); return i.storeys >= 3 && i.open === i.storeys && i.locked >= i.storeys && i.attic; }) || L.find(h => I(h).storeys >= 3 && I(h).locked >= 1) || L[0];
          return ok ? ok.id : null; })()""")
        ti = J(f"SINNEN.info({tid})")
        print('stairwell house', tid, json.dumps(ti, ensure_ascii=False)[:900], flush=True)
        E(f"__T.outside({tid}); 1")
        r = J("(() => { GAME.step(0.4); return { label: __T.label('haeuser:rein'), near: HAEUSER.near && HAEUSER.near.id }; })()")
        ck('at a stairwell house\'s door „Hineingehen“', r['label'] == 'Hineingehen' and r['near'] == tid, r)
        shot('20_treppenhaus_tuer')
        enter(tid)
        info = J(INSIDE)
        print('inside', json.dumps(info, ensure_ascii=False)[:1500], flush=True)
        ck('inside the stairwell house: the stairwell on every storey, ≤ 60 draw calls', bool(info) and info['kind'] == 'treppenhaus' and info['stats']['draws'] <= 60 and sum(1 for x in info['rooms'] if x.endswith(':Treppenhaus')) == info['nSt'], info and {k: info[k] for k in ('kind', 'nSt', 'stats', 'siTris')})
        ck('the place on the HUD: „Treppenhaus, Schleusingen“', bool(info) and info['place'] == 'Treppenhaus, Schleusingen', info and info['place'])
        E("GAME.step(0.3)")
        shot('21_treppenhaus_innen')
        m = J("(() => { const H = HAEUSER.H, rm = H.plan.rooms.find(q => q.mail); if (!rm) return null; return Object.assign({ room: rm.id, flats: (H.plan.open || []).length + (H.plan.locked || []).length }, rm.mail); })()")
        print('letter boxes', json.dumps(m), flush=True)
        ck('the letter boxes real size (front 32 × 38 cm, ≤ 12 cm deep), 1.0–1.6 m high in one or two rows, one per flat',
           bool(m) and abs(m['w'] - 0.32) < 0.01 and abs(m['h'] - 0.38) < 0.01 and m['d'] <= 0.12 and m['rows'] <= 2 and 1.0 <= m['z0'] + m['h'] / 2 and m['z1'] - m['h'] / 2 <= 1.6 and m['n'] >= m['flats'], m)
        if m:
            E("""(() => { const H = HAEUSER.H, P = H.plan, m = H.plan.rooms.find(q => q.mail).mail, e = [m.at[0] + m.nrm[0] * 1.6, m.at[1] + m.nrm[1] * 1.6], ew = P.toW(e[0], e[1]), mw = P.toW(m.at[0], m.at[1]);
              const yaw = Math.atan2(mw[0] - ew[0], mw[1] - ew[1]) * 180 / Math.PI; __T.stand(ew[0], ew[1], m.at[2], yaw); CAM3.want = false; GAME.view(ew[0], ew[1], m.at[2] + 1.62, yaw, -14, 70); GAME.step(0.2); return 1; })()""")
            shot('22_briefkaesten')
        nst = info['nSt'] if info else 0
        reached = 0
        for fl in range(max(0, nst - 1)):
            r = J(f"__T.climb(HAEUSER.H, {fl})")
            print('climb', fl, json.dumps(r), flush=True)
            if abs(r['top']['feet'] - r['z']) < 0.1: reached = fl + 1
            else: break
        ck('up the stairs to every storey', nst >= 2 and reached == nst - 1, {'storeys': nst, 'reached': reached})
        top = reached
        E(f"""(() => {{ const H = HAEUSER.H, P = H.plan, st = P.stair, x = st.side === 'R' ? (P.hx0 + st.x0) / 2 : (st.x1 + P.hx1) / 2, e = P.toW(x, st.y1 + 0.3), m = P.toW(x, P.yi0 + 0.5);
          const yaw = Math.atan2(m[0] - e[0], m[1] - e[1]) * 180 / Math.PI; __T.stand(e[0], e[1], P.zF[{top}], yaw); CAM3.want = false; GAME.view(e[0], e[1], P.zF[{top}] + 1.62, yaw, -14, 80); GAME.step(0.2); return 1; }})()""")
        shot(f'23_podest_{top}')
        r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.astair) return { none: true };
          const st = P.astair, cx = (st.x0 + st.x1) / 2, dir = st.y1 >= st.y0 ? 1 : -1, a = P.toW(cx, st.y0 - dir * 0.7), b = P.toW(cx, st.y1 + dir * 0.7);
          __T.stand(a[0], a[1], P.zF[P.nSt - 1], Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI);
          out.top = __T.walkTo(b[0], b[1], 14); out.zA = P.zA; out.place = KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 1); return out; })()""")
        print('attic', json.dumps(r, ensure_ascii=False), flush=True)
        if not r.get('none'):
            ck('from the top storey up into the attic', abs(r['top']['feet'] - r['zA']) < 0.1, r)
        lk = J(f"__T.locked(HAEUSER.H, {top})")
        if lk.get('none'): lk = J("__T.locked(HAEUSER.H, 0)")
        print('locked', json.dumps(lk, ensure_ascii=False), flush=True)
        ck('at another flat\'s door „Verschlossen“ (its words, and it stays shut)', lk.get('lbl') == 'Verschlossen' and lk.get('think', '').startswith('Die Wohnungstür ist verschlossen') and lk.get('room') == lk.get('trep') and abs(lk.get('feet', 0) - lk.get('z', -9)) < 0.1, lk)
        page_shot('24_verschlossen_hud')
        opens = J("(HAEUSER.H.plan.open || []).map(d => d.fl)")
        fo = top if top in opens else (opens[0] if opens else 0)
        fr = J(f"__T.flat(HAEUSER.H, {fo})")
        print('flat', json.dumps(fr, ensure_ascii=False), flush=True)
        ck('into the open flat through its door (its hall, the floor carries)', not fr.get('none') and fr['at']['room'] == fr['room'] and abs(fr['at']['feet'] - fr['z']) < 0.1, fr)
        kinds = J(f"HAEUSER.H.plan.rooms.filter(r => r.flat && r.fl === {fo}).map(r => r.kind)")
        ck('the flat: a hall, a living room, a kitchen, a bath', all(k in kinds for k in ('diele', 'wohnzimmer', 'kueche', 'bad')), kinds)
        for k in ['diele', 'wohnzimmer', 'kueche', 'bad', 'schlafzimmer'][:max(2, BILDER + 2)]:
            rid = E(f"(() => {{ const r = HAEUSER.H.plan.rooms.find(q => q.flat && q.fl === {fo} && q.kind === '{k}'); if (!r) return null; __T.roomView(HAEUSER.H, r.id, 0); GAME.step(0.2); __T.roomView(HAEUSER.H, r.id, 0); return r.id; }})()")
            if rid: shot(f'25_wohnung_{rid}')
        leave()

    # ---- a shop: open on a Tuesday morning (its sales room, the door to the back rooms), closed on a Sunday ----
    if want('laden') or want('looks'):
        shops = J("SINNEN.status().shops")
        order = {'apotheke': 0, 'baecker': 1, 'cafe': 2, 'gaststaette': 3, 'laden': 4}
        shops.sort(key=lambda s: (order.get(s['shop'], 9), s['id']))
        seen, picks = set(), []
        for s in shops:
            if s['shop'] not in seen:
                seen.add(s['shop']); picks.append(s)
        picks = picks[:max(1, BILDER)]
        print('shops', json.dumps(shops), 'pictures in', [p['id'] for p in picks], flush=True)
    if want('laden'):
        set_time(2, 10, 30)
        for sp in picks:
            sid, typ = sp['id'], sp['shop']
            E(f"__T.outside({sid}); 1")
            r = J("(() => { GAME.step(0.4); return { label: __T.label('haeuser:rein'), near: HAEUSER.near && HAEUSER.near.id, shut: __T.label('si:geschlossen') }; })()")
            ck(f'{typ} {sid} open on a Tuesday morning: „Hineingehen“', r['label'] == 'Hineingehen' and r['near'] == sid and r['shut'] is None, r)
            shot(f'30_{typ}_tuer')
            enter(sid)
            info = J(INSIDE)
            print('inside', json.dumps(info, ensure_ascii=False)[:1500], flush=True)
            room = J("(() => { const P = HAEUSER.H.plan, r = P.rooms[0]; return { id: r.id, name: r.name, w: +(r.x1 - r.x0).toFixed(2), d: +(r.y1 - r.y0).toFixed(2), W: +(P.xi1 - P.xi0).toFixed(2), D: +(P.yi1 - P.yi0).toFixed(2), staff: P.staff }; })()")
            print('sales room', json.dumps(room, ensure_ascii=False), flush=True)
            ck(f'{typ}: a shop room behind the door, its fixtures drawn (≤ 60 draw calls)', bool(info) and info['kind'] == 'laden' and info['shop'] == typ and info['shopTris'] > 500 and info['stats']['draws'] <= 60, info and {k: info[k] for k in ('kind', 'shop', 'shopTris', 'stats')})
            ck(f'{typ}: the sales room at most ~12 m deep and ~120 m² (60 m² where the floor allows)', room['d'] <= 12.6 and room['w'] * room['d'] <= 126 and (room['w'] * room['d'] >= 55 or room['w'] * room['d'] >= room['W'] * min(room['D'], 12) - 1), room)
            ck(f'{typ}: the place on the HUD names the shop', bool(info) and (info['place'] or '').endswith(', Schleusingen') and room['name'] in (info['place'] or ''), info and info['place'])
            r = J("(() => { const H = HAEUSER.H, P = H.plan, e = H.entry; __T.stand(e.x, e.y, e.z, e.yaw); const a = __T.push(e.yaw, 2.0), b = __T.push((e.yaw + 90) % 360, 6), c = __T.push((e.yaw + 270) % 360, 12); return { a, b, c, inB: H.inside(b.x, b.y, b.feet), inC: H.inside(c.x, c.y, c.feet), zG: P.zG }; })()")
            print('walls', json.dumps(r), flush=True)
            ck(f'{typ}: walls and fixtures stop one, the floor carries', r['inB'] and r['inC'] and abs(r['a']['feet'] - r['zG']) < 0.06, r)
            if room['staff']:
                sd = J("""(() => { const H = HAEUSER.H, P = H.plan, id = 'si:personal:' + H.id, a = KERN.acts().find(q => q.id === id); if (!a) return { none: true };
                  const p = a.pos, s = P.staff, nrm = s.side === 'y1' ? [0, -1] : s.side === 'x0' ? [1, 0] : [-1, 0], q = P.toW(s.x + nrm[0] * 0.9, s.y + nrm[1] * 0.9), d = P.toW(s.x, s.y), yaw = Math.atan2(d[0] - q[0], d[1] - q[1]) * 180 / Math.PI;
                  __T.stand(q[0], q[1], P.zG, yaw); GAME.step(0.3); const lbl = __T.label(id); __T.clearThink(); __T.act(id); const think = __T.think(); __T.push(yaw, 2.5);
                  return { lbl, think, room: H.roomAt(GAME.P.x, GAME.P.y, GAME.P.feet + 1), r0: P.rooms[0].id }; })()""")
                print('staff door', json.dumps(sd, ensure_ascii=False), flush=True)
                ck(f'{typ}: the door to the back rooms „Nur für Personal“, shut', sd.get('lbl') == 'Nur für Personal' and sd.get('think', '').startswith('Nur für Personal') and sd.get('room') == sd.get('r0'), sd)
                shot(f'31_{typ}_personal')
            for k in range(min(3, BILDER + 1)):
                E(f"__T.roomView(HAEUSER.H, HAEUSER.H.plan.rooms[0].id, {[0, 2, 1][k]}); GAME.step(0.2); 1")
                shot(f'32_{typ}_{sid}_innen{k}')
            leave()
        # closed: the pharmacy (or the first shop) on a Sunday morning
        cs = next((s for s in shops if s['shop'] in ('apotheke', 'laden', 'baecker')), None)
        if cs:
            set_time(0, 10, 30)
            E(f"__T.outside({cs['id']}); 1")
            r = J("(() => { for (let i = 0; i < 4; i++) GAME.step(0.2); const b = __T.best(); __T.clearThink(); const lbl = __T.label('si:geschlossen'); __T.act('si:geschlossen'); return { lbl, best: b, near: HAEUSER.near && HAEUSER.near.id, rein: __T.label('haeuser:rein'), think: __T.think() }; })()")
            print('closed', json.dumps(r, ensure_ascii=False), flush=True)
            ck(f"{cs['shop']} closed on a Sunday: „Geschlossen“ with the hours, no way in", r['lbl'] == 'Geschlossen' and r['near'] != cs['id'] and 'geschlossen' in r['think'], r)
            page_shot(f"33_{cs['shop']}_geschlossen_hud")
            set_time(2, 10, 30)

    # ---- the looks and kinds drawn with the programs that were there: in front of the door the street drawn till nothing new comes, then
    # in, the rooms drawn, out again, the street drawn once more – a program that is new then belongs to the house ----
    if want('looks'):
        cases = [('heute-90', "h.kind === 'haus' && HAEUSER.lookOf(h.id) === 'heute-90'"), ('heute-ddr', "h.kind === 'haus' && HAEUSER.lookOf(h.id) === 'heute-ddr'"),
                 ('alt', "h.kind === 'haus' && HAEUSER.lookOf(h.id) === 'alt'"), ('treppenhaus', "h.kind === 'treppenhaus' && HAEUSER.lookOf(h.id) === 'heute'"),
                 ('laden', "h.kind === 'laden'")]
        for lk, cond in cases:
            h = E(f"(() => {{ const L = SINNEN.list().filter(h => {cond}); return L.length ? L[L.length >> 1].id : null; }})()")
            if not h:
                ck(f'a house: {lk}', False, ''); continue
            E(f"__T.outside({h}); 1")
            for _ in range(6): E("GAME.step(0.5); GAME.shot(); 1")
            E("window.__K2 = __T.progKeys(); 1")
            if not enter(h).get('ok'):
                ck(f'house {h} ({lk}) entered', False, ''); continue
            rid = E("""(() => { const H = HAEUSER.H, P = H.plan, ks = ['stube', 'wohnzimmer', 'kueche', 'flur']; let last = null;
              for (const k of ks) { const r = P.rooms.find(q => q.kind === k && (!P.open || !P.open.length || q.flat || q.trep)); if (!r) continue; __T.roomView(H, r.id, 0); GAME.step(0.1); GAME.shot(); __T.roomView(H, r.id, 2); GAME.step(0.1); GAME.shot(); last = last || r.id; }
              if (last) { __T.roomView(H, last, 0); GAME.step(0.1); } return last; })()""")
            shot(f'40_{lk}_{h}_{rid}')
            st = J("(() => { const H = HAEUSER.H; return { id: H.id, kind: H.plan.kind, look: H.plan.look, draws: H.stats.draws, tris: H.siTris }; })()")
            own = J("__T.ownPrograms(HAEUSER.H, window.__K2)")
            leave()
            E(f"__T.outside({h}); 1")
            for _ in range(2): E("GAME.step(0.5); GAME.shot(); 1")
            new = [k for k in J("__T.progKeys()") if k not in set(J("window.__K2"))]
            print('look', lk, json.dumps(st), 'new programs', len(new), 'of the house', len(own), flush=True)
            for k in new: print('  new program', k[:160], '…', k[-200:], flush=True)
            for k in own: print('  the house\'s own', k, flush=True)
            ck(f'{lk} (house {h}): its meshes drawn with programs that were there before, ≤ 60 draw calls', not own and st['draws'] <= 60, {'st': st, 'own': own, 'new': [k[-120:] for k in new]})

    # ---- every house once: mounted in its look and freed – the plan checked, no error, draw calls, triangles, time; no new program ----
    def sweep(tag):
        for _ in range(3): E("GAME.step(0.3); GAME.shot(); 1")
        E("window.__K1 = __T.progKeys(); 1")
        t1 = time.time()
        sw = json.loads(E("""(async () => { const bad = [], ids = SINNEN.list().map(h => h.id), m0 = __T.mem(); let n = 0, ms = 0, mx = 0, dr = 0, tris = 0, trisAt = null, holed = 0, open1 = 0, trep = 0, checks = 0;
          for (const id of ids) { const I = SINNEN.info(id); if (I.check.length) { checks++; bad.push({ id, check: I.check.slice(0, 3) }); }
            if (I.kind === 'treppenhaus') { trep++; if (I.open === 1) open1++; }
            let H = null; try { H = await ZINNEN.mount(id, { look: HAEUSER.lookOf(id), still: true }); } catch (e) { bad.push({ id, err: String(e).slice(0, 200) }); continue; }
            if (!H) { bad.push({ id, err: 'no handle' }); continue; } n++; ms += H.stats.ms; mx = Math.max(mx, H.stats.ms); dr = Math.max(dr, H.stats.draws);
            const t = H.siTris || 0; if (t > tris) { tris = t; trisAt = id; } if (__T.holed() > 0) holed++;
            if (H.stats.draws > 60 || ZINNEN.err || SINNEN.err) bad.push({ id, kind: H.plan.kind, draws: H.stats.draws, err: (ZINNEN.err || SINNEN.err || '').slice(0, 300) });
            ZINNEN.unmount(H); }
          const m1 = __T.mem(); GAME.shot();
          return JSON.stringify({ ids: ids.length, n, msAvg: Math.round(ms / Math.max(1, n)), msMax: Math.round(mx), drawsMax: dr, trisMax: tris, trisAt, holed, trep, open1, checks, bad, m0, m1, left: __T.holed(), pal: HAEUSER.pal() }); })()"""))
        print('sweep', tag, round(time.time() - t1), 's', json.dumps({k: sw[k] for k in ('ids', 'n', 'msAvg', 'msMax', 'drawsMax', 'trisMax', 'trisAt', 'holed', 'trep', 'open1', 'checks', 'm0', 'm1', 'left', 'pal')}), 'bad', len(sw['bad']), flush=True)
        for bb in sw['bad'][:30]: print('  sweep', json.dumps(bb), flush=True)
        new = [k for k in J("__T.progKeys()") if k not in set(J("window.__K1"))]
        return sw, new

    if want('sweep'):
        sw, new = sweep('desktop')
        ck('every house mounts in its look and is freed (its plan checked, ≤ 60 draw calls, no error)', sw['n'] == sw['ids'] and not sw['bad'], {'n': sw['n'], 'bad': [x['id'] for x in sw['bad']][:20]})
        ck('the tiles under each house holed while it stands, all whole again after', sw['holed'] == sw['n'] and sw['left'] == 0, {'holed': sw['holed'], 'left': sw['left']})
        ck('freed: the geometries and textures back to the count before', sw['m1']['g'] <= sw['m0']['g'] and sw['m1']['t'] <= sw['m0']['t'], {'m0': sw['m0'], 'm1': sw['m1']})
        ck('no new shader program from mounting and freeing them all', not new, [k[-120:] for k in new])
        ck('the palette has room left (no colour falls back to a material of its own)', sw['pal'] < 1024, sw['pal'])
    if want('phone'):
        E("SINNEN.setPhone(true); LINNEN.phone = true; 1")
        for _ in range(400):
            E("GAME.step(0.1)")
            s2 = J("SINNEN.status()")
            if s2['state'] == 'ready' and s2['phone']: break
            time.sleep(0.05)
        sw, new = sweep('phone')
        ck('with the phone\'s budget: at most 120 000 triangles per house (every house mounted once)', sw['n'] == sw['ids'] and not sw['bad'] and sw['trisMax'] <= 120000, {'n': sw['n'], 'trisMax': sw['trisMax'], 'at': sw['trisAt'], 'bad': [x['id'] for x in sw['bad']][:20]})
        ck('with the phone\'s budget: one flat per stairwell house', sw['trep'] > 0 and sw['open1'] == sw['trep'], {'trep': sw['trep'], 'open1': sw['open1']})
        E("SINNEN.setPhone(false); LINNEN.phone = false; 1")
        for _ in range(400):
            E("GAME.step(0.1)")
            s2 = J("SINNEN.status()")
            if s2['state'] == 'ready' and not s2['phone']: break
            time.sleep(0.05)
        print('after the phone', json.dumps(J("SINNEN.status().kinds")), flush=True)

    # ---- a save from inside: after a reload one stands in front of the door ----
    if want('save'):
        r = enter(hid)
        s = J("SAVE.get(HAEUSER.KEY)")
        print('saved', json.dumps(s), flush=True)
        pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        for _ in range(40):
            if E("window.GAME && GAME.P.mode === 'walk'"): break
            time.sleep(0.5)
        r = J("({ mode: GAME.P.mode, x: GAME.P.x, y: GAME.P.y, mounted: window.ZINNEN ? ZINNEN.mounted().length : -1, saved: SAVE.get('pav-haeuser-v1') })")
        print('after reload', json.dumps(r), flush=True)
        ck('after a reload: in front of the door outside (not in the house)', bool(s) and s.get('id') == hid and r['mode'] == 'walk' and abs(r['x'] - s['out'][0]) < 0.5 and abs(r['y'] - s['out'][1]) < 0.5 and r['mounted'] == 0 and r['saved'] is None, {'saved': s, 'now': r})
    ok, gl = lib.check_gl(pg, 16)
    ck('shader programs within 16 textures, none broken', ok, {k: gl[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})
    ck.errors(errs)
    ck.done()
