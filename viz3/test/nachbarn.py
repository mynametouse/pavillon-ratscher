# feat/nachbarn (23.10.2026): the neighbours' everyday life – Hubert's yard (workshops open to the east, drying huts, the estate on its ramp),
# the paddock further south, the day plan (chopping, sawing, stacking, the car, mowing, feeding, the two at the table, the trip to the village)
# and the tasks (the four old ones where they touch the neighbours, the three new ones). Pictures in out/nachbarn/.
#   python3 viz3/test/nachbarn.py PORT [sections]     sections: yard,day,talk,trip,quests (default: all)
import sys, os, time, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
port = sys.argv[1]
only = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] else None
want = lambda n: not only or n in only
OUT = lib.out('nachbarn')
ck = lib.Checks('nachbarn')
errs = []
HELP = r"""
window.__N = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#toast,#qtrack,#quests,#qbanner,#vhud').forEach(e => e.style.visibility = 'hidden'); },
  clock(h, m = 0) { CLOCK.t = (CLOCK.day() - 1) * 1440 + h * 60 + m; },
  // step the world n seconds in small pieces (the neighbours walk in real seconds)
  run(sec) { for (let t = 0; t < sec; t += 0.5) GAME.step(0.5); },
  until(f, max) { for (let t = 0; t < max; t += 0.5) { GAME.step(0.5); if (f()) return t; } return -1; },
  w(n) { const w = NPC.NPCS[n]; return { x: +w.x.toFixed(2), y: +w.y.toFixed(2), cur: LIFE.cur(n), pose: w.fig.pose && w.fig.pose.k, sit: w.fig.mode, prop: !!(w.prop && w.prop.visible), vis: w.fig.g.visible, drive: !!w.drive, mow: !!w.mow }; },
  act(id) { return PLAY.acts().find(a => a.id === id); },
  // stand d metres from an act, facing it, and do it (with its hold time)
  go(id, d = 0.9) { const a = this.act(id); if (!a) return 'no act ' + id; const p = typeof a.pos === 'function' ? a.pos() : a.pos;
    const ang = Math.atan2(GAME.P.x - p[0], GAME.P.y - p[1]), x = p[0] + Math.sin(ang) * d, y = p[1] + Math.cos(ang) * d;
    GAME.view(x, y, 1.62, Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI, -15); GAME.step(0.1); let l = null; try { l = a.label(); } catch (e) { l = 'ERR ' + e.message; } return l; },
  run1(id, secs = 0.4) { const a = this.act(id); if (!a) return 'no act ' + id; let l = null; try { l = a.label(); } catch (e) {} if (!l) return 'no label for ' + id;
    PLAY.run(a); for (let t = 0; t < secs; t += 0.1) GAME.step(0.1); return l; },
  st() { return Object.fromEntries(Object.entries(QUESTS.Q).map(([k, q]) => [k, q.st])); },
  ask(who, k) { const r = QUESTS.ask(who, k); if (!r) return 'no answer'; if (r.before) r.before(); if (r.after) r.after(); return JSON.stringify(this.st()); },
};
"""
def E(js): return pg.evaluate(js)
def shot(name): lib.shot(pg, OUT, name)
def view(x, y, z, yaw, pitch, fov=60): E(f"GAME.view({x}, {y}, {z}, {yaw}, {pitch}, {fov}); GAME.step(0.05)")
with lib.browser() as b:
    pg = lib.page(b, 1100, 660, errs=errs, tier='hoch')
    lib.boot(pg, port)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000)
    E(HELP)
    E("__N.hide(); GAME.CAM3.want = false; GAME.setMode('day'); GAME.setPhase(GAME.PHASES.length - 1)")
    E("QUESTS.reset()")
    info = json.loads(E("""JSON.stringify({ hof: !!window.HOF, sheds: HOF && window.HOFCAR ? HOF.huts.length : 0, car: !!window.HOFCAR, life: !!window.LIFE,
      pad: NPC.PAD, goats: NPC.GOATS.map(g => [+g.x.toFixed(1), +g.y.toFixed(1)]), real: NPC.real, trip: !!(LIFE.TRIP), mower: !!NPC.MOWER })"""))
    print('info', json.dumps(info), flush=True)
    ck('yard and car built (HOF, HOFCAR, LIFE)', info['hof'] and info['car'] and info['life'], info['sheds'])
    ck('six drying huts', info['sheds'] == 6)
    pad = info['pad']
    ck('paddock moved south (at the garden\'s southern boundary)', pad['y1'] < -30 and pad['y0'] < -45, pad)
    ck('goats in the paddock', all(pad['x0'] < x < pad['x1'] + 1 and pad['y0'] < y < pad['y1'] for x, y in info['goats']), info['goats'])
    ck('route to the village found', info['trip'])
    if want('yard'):
        E("LIFE.force('hubert', 'putter'); LIFE.force('ronald', 'paddock'); __N.clock(11, 0)")
        lib.settle_light(pg)
        view(-10.5, 2.0, 1.7, -100, -4, 70); shot('yard_from_garden')
        view(-14.0, -3.0, 1.7, -55, -6, 65); shot('workshops_open_east')
        view(-17.2, 4.0, 1.6, -78, -4, 60); shot('drying_huts')
        view(-13.6, -15.0, 1.5, -95, -6, 60); shot('car_on_ramp_side')
        view(-17.4, -9.8, 1.7, 180, -10, 60); shot('car_front_bonnet')
        view(-14.8, 12.0, 1.7, -105, -12, 60); shot('wood_yard')
        view(-16.4, -4.2, 1.5, -110, -10, 60); shot('table_chairs')
        view(-23.0, 1.0, 1.7, -78, -6, 70); shot('inside_workshop')
        E("(() => { const P = GAME.P; P.mode = 'top'; P.tx = -22; P.ty = 2; P.th = 52; document.body.dataset.mode = 'top'; GAME.step(0.05); })()"); shot('top_yard')
        E(f"(() => {{ const P = GAME.P; P.mode = 'top'; P.tx = {(pad['x0'] + pad['x1']) / 2}; P.ty = {(pad['y0'] + pad['y1']) / 2 + 6}; P.th = 46; document.body.dataset.mode = 'top'; GAME.step(0.05); }})()"); shot('top_paddock')
        view(pad['x0'] - 5, pad['gy'] + 2.5, 1.7, 100, -8, 65); shot('paddock_gate')
    if want('day'):
        E("__N.clock(9, 0)")
        lib.settle_light(pg)
        # Hubert chopping
        E("LIFE.force('hubert', 'chop')"); t = E("__N.until(() => NPC.NPCS.hubert.fig.pose && NPC.NPCS.hubert.fig.pose.k === 'chop', 60)")
        hw = E("__N.w('hubert')"); print('chop', t, hw, flush=True)
        ck('Hubert chops at the block', t >= 0 and hw['pose'] == 'chop' and hw['prop'], hw)
        E("__N.until(() => { const p = NPC.NPCS.hubert.fig.pose; return p && (p.t % 2.6) > 0.95 && (p.t % 2.6) < 1.1; }, 8)")
        view(-14.6, 8.4, 1.6, -62, -10, 55); shot('hubert_chop_up')
        E("__N.until(() => { const p = NPC.NPCS.hubert.fig.pose; return p && (p.t % 2.6) > 1.48 && (p.t % 2.6) < 1.6; }, 8)"); shot('hubert_chop_strike')
        # sawing
        E("LIFE.force('hubert', 'saw')"); t = E("__N.until(() => NPC.NPCS.hubert.fig.pose && NPC.NPCS.hubert.fig.pose.k === 'saw', 60)")
        hw = E("__N.w('hubert')"); ck('Hubert saws at the sawhorse', t >= 0 and hw['prop'], hw)
        view(-16.8, 12.6, 1.6, -70, -10, 55); shot('hubert_saw')
        # stacking
        E("LIFE.force('hubert', 'stack')"); f0 = E("HOF.huts[HOF.stackHut].fill")
        t = E("__N.until(() => NPC.NPCS.hubert.fig.pose && NPC.NPCS.hubert.fig.pose.k === 'carry' && NPC.NPCS.hubert.v > 0, 60)")
        view(-15.0, 3.2, 1.6, -60, -8, 60); shot('hubert_carry_wood')
        E("__N.until(() => NPC.NPCS.hubert.fig.pose && NPC.NPCS.hubert.fig.pose.k === 'place', 40)"); shot('hubert_stack')
        E("__N.run(3)"); f1 = E("HOF.huts[HOF.stackHut].fill")
        ck('Hubert stacks wood into the hut (it fills)', f1 > f0, f'{f0} -> {f1}')
        # the car
        E("LIFE.force('hubert', 'car')"); t = E("__N.until(() => NPC.NPCS.hubert.fig.pose && NPC.NPCS.hubert.fig.pose.k === 'bonnet', 70)")
        hw = E("__N.w('hubert')"); ck('Hubert works under the bonnet', t >= 0 and E("HOFCAR.open") > 0.9, hw)
        view(-14.8, -11.6, 1.6, -120, -12, 55); shot('hubert_car')
        # Ronald: feeding, mowing
        E("LIFE.force('ronald', 'feed')"); t = E("__N.until(() => NPC.NPCS.ronald.fig.pose && NPC.NPCS.ronald.fig.pose.k === 'carry', 90)")
        rw = E("__N.w('ronald')"); ck('Ronald carries hay to the rack', t >= 0 and rw['prop'], rw)
        view(pad['x1'] - 9, pad['y1'] - 7, 1.7, 45, -8, 60); shot('ronald_feed')
        E("__N.until(() => LIFE.MS && NPC.NPCS.ronald.fig.pose === null && NPC.GOATS.some(g => Math.hypot(g.x - NPC.PAD.rack[0], g.y - NPC.PAD.rack[1]) < 2.2), 40)")
        shot('goats_at_rack')
        E("LIFE.force('ronald', 'mow')"); t = E("__N.until(() => NPC.NPCS.ronald.mow && Math.hypot(LIFE.MS.x - NPC.MOWER.home.x, LIFE.MS.y - NPC.MOWER.home.y) > 8, 120)")
        rw = E("__N.w('ronald')"); ms = E("JSON.stringify(LIFE.MS)"); print('mow', t, rw, ms, flush=True)
        ck('Ronald mows the meadow (tractor moving)', t >= 0 and rw['mow'], ms)
        E("__N.run(25)"); ck('cut grass lies behind the mower', E("LIFE.swaths()") >= 1, E("LIFE.swaths()"))
        E("(() => { const m = LIFE.MS; GAME.view(m.x - 9, m.y - 4, 2.2, 66, -8, 60); GAME.step(0.05); })()"); shot('ronald_mow')
        E("LIFE.force('ronald', 'paddock')"); E("__N.run(2)")
        rw = E("__N.w('ronald')"); ck('mowing ends when the plan changes (off the tractor)', not rw['mow'], rw)
    if want('talk'):
        E("__N.clock(16, 20)")
        lib.settle_light(pg)
        E("LIFE.force('hubert', 'talk'); LIFE.force('ronald', 'visit')")
        t = E("__N.until(() => LIFE.TALK.on, 200)"); hw = E("__N.w('hubert')"); rw = E("__N.w('ronald')")
        print('talk', t, hw, rw, flush=True)
        ck('Ronald walks over and both sit at the table', t >= 0 and hw['sit'] == 'sit' and rw['sit'] == 'sit', [hw, rw])
        E("GAME.view(-15.6, -6.6, 1.6, -96, -8, 55); GAME.step(0.05)")
        sub = E("__N.until(() => { const s = document.getElementById('npcsub'); return s && !s.hidden && s.textContent.length > 5; }, 30)")
        txt = E("(document.getElementById('npcsub') || {}).textContent || ''"); print('subtitle', sub, txt, flush=True)
        ck('their talk shows as subtitles (German)', sub >= 0 and (txt.startswith('Hubert:') or txt.startswith('Ronald:')), txt)
        E("document.getElementById('npcsub').style.visibility = 'visible'"); shot('talk_table')
        E("GAME.view(-19.6, 0.5, 1.7, 182, -12, 50); GAME.step(0.05)"); shot('talk_table_north')
        # some days they talk at the car instead: Hubert works, Ronald stands beside it
        E("LIFE.force('hubert', 'car'); LIFE.force('ronald', 'visitCar')")
        t = E("__N.until(() => LIFE.TALK.on, 120)"); rw = E("__N.w('ronald')"); print('talk at the car', t, rw, flush=True)
        ck('the talk at the car (Ronald beside it, Hubert under the bonnet)', t >= 0, rw)
        E("GAME.view(-14.4, -11.8, 1.6, -118, -10, 55); GAME.step(0.05)"); shot('talk_car')
    if want('trip'):
        E("__N.clock(14, 30)")
        E("LIFE.force('ronald', 'paddock'); LIFE.force('hubert', 'trip')")
        t = E("__N.until(() => NPC.NPCS.hubert.drive, 60)"); ck('Hubert gets on his tractor for the village', t >= 0, E("__N.w('hubert')"))
        t = E("__N.until(() => LIFE.AG.hubert.trip === 'village', 260)"); hw = E("__N.w('hubert')"); tp = E("JSON.stringify(LIFE.TRIP && { stop: LIFE.TRIP.stop, door: LIFE.TRIP.door })")
        print('village', t, hw, tp, flush=True)
        ck('Hubert reaches the village centre and gets off', t >= 0 and not hw['drive'], tp)
        E("(() => { const tp = NPC.TRACTOR.g.position, h = NPC.NPCS.hubert; GAME.view(tp.x - 7, -tp.z - 5, KERN.ground(tp.x - 7, -tp.z - 5) + 1.7, Math.atan2(7, 5) * 180 / Math.PI, -6, 60); GAME.step(0.05); })()")
        shot('trip_village')
        t = E("__N.until(() => NPC.NPCS.hubert.inside, 40)"); ck('he goes into a house', t >= 0)
        t = E("__N.until(() => !NPC.NPCS.hubert.inside && NPC.NPCS.hubert.drive, 200)"); ck('he comes out and drives back', t >= 0, E("__N.w('hubert')"))
        t = E("__N.until(() => !NPC.NPCS.hubert.drive && Math.hypot(NPC.TRACTOR.g.position.x - (-15.1), -NPC.TRACTOR.g.position.z - 27.2) < 1.5, 260)")
        ck('tractor back home', t >= 0, E("JSON.stringify(NPC.TRACTOR.g.position)"))
        E("LIFE.force('hubert', null)")
    if want('quests'):
        E("LIFE.force('hubert', null); LIFE.force('ronald', null); QUESTS.reset(); __N.clock(10, 0)")
        # goat task with the new paddock: hay, feed, Frieda runs off, lead her back through the gate
        E("GAME.go('ziegen'); GAME.step(0.3)")
        print('ronald help', E("__N.ask('ronald', 'q_helfen')"), flush=True)
        print('hay', E("__N.go('goat:haypile', 1.2)"), E("__N.run1('goat:haypile', 0.5)"), flush=True)
        for name in ('Lotte', 'Frieda', 'Egon'):
            print('feed', name, E(f"__N.go('goat:feed:{name}', 1.1)"), E(f"__N.run1('goat:feed:{name}', 0.4)"), flush=True)
        ck('goats fed in the new paddock', E("QUESTS.Q.goat.fed.length") == 3, E("JSON.stringify(QUESTS.Q.goat)"))
        time.sleep(3.2)  # (Frieda's escape starts on a timer after the third goat)
        E("GAME.view(NPC.PAD.x0 + 4, NPC.PAD.y1 - 3, 1.62, 90, 0)"); E("__N.run(8)")
        st = E("__N.st().goat"); print('after feeding', st, E("JSON.stringify(__N.w('ronald'))"), flush=True)
        ck('Frieda runs off', st == 'search', st)
        print('lead', E("__N.go('goat:lead', 1.2)"), E("__N.run1('goat:lead', 0.3)"), flush=True)
        r = E("""(() => { const path = [[-8, -20], [-8.6, -34], [-8.6, -46], [10, -47.5], [NPC.PAD.x0 - 1.5, NPC.PAD.gy - 0.2], [NPC.PAD.x0 + 1.5, NPC.PAD.gy], [NPC.PAD.x0 + 4, NPC.PAD.gy + 1]];
            let x = GAME.P.x, y = GAME.P.y;
            for (const [tx, ty] of path) { for (let k = 0; k < 400; k++) { const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy); if (d < 0.3) break; x += dx / d * 0.25; y += dy / d * 0.25;
                GAME.view(x, y, 1.62, Math.atan2(dx, dy) * 180 / Math.PI, 0); GAME.step(0.1); if (QUESTS.Q.goat.st === 'report') break; } if (QUESTS.Q.goat.st === 'report') break; }
            for (let k = 0; k < 40 && QUESTS.Q.goat.st !== 'report'; k++) GAME.step(0.1);
            const f = NPC.GOATS.find(g => g.gname === 'Frieda'); return JSON.stringify({ st: QUESTS.Q.goat.st, f: [+f.x.toFixed(1), +f.y.toFixed(1)] }); })()""")
        print('led', r, flush=True)
        ck('Frieda led back into the new paddock', '"report"' in r, r)
        print('report', E("__N.ask('ronald', 'q_frieda')"), flush=True)
        ck('goat task done', E("__N.st().goat") == 'done')
        # Hubert's wood: four armfuls into the drying hut
        print('holz', E("__N.ask('hubert', 'q_holz')"), flush=True)
        f0 = E("HOF.huts[HOF.stackHut].fill")
        for i in range(4):
            a = E("__N.go('holz:take', 0.9)"); b_ = E("__N.run1('holz:take', 0.3)")
            c = E("__N.go('holz:put', 1.0)"); d = E("__N.run1('holz:put', 2.0)")
            print('stack', i, a, b_, c, d, flush=True)
        ck('wood task: four armfuls stacked, done', E("__N.st().holz") == 'done' and E("HOF.huts[HOF.stackHut].fill") > f0, E("JSON.stringify(QUESTS.Q.holz)"))
        shot('quest_holz_hut')
        # the spanner for Hubert at his car
        E("LIFE.force('hubert', 'car')"); E("__N.until(() => NPC.NPCS.hubert.fig.pose && NPC.NPCS.hubert.fig.pose.k === 'bonnet', 70)")
        tops = E("JSON.stringify(QUESTS.topics('hubert'))"); print('hubert topics at the car', tops, flush=True)
        ck('Hubert at the car offers the spanner task', 'q_auto' in tops, tops)
        print('auto', E("__N.ask('hubert', 'q_auto')"), flush=True)
        print('key', E("__N.go('take:ringschluessel', 0.8)"), E("__N.run1('take:ringschluessel', 0.4)"), E("PLAY.carry && PLAY.carry.id"), flush=True)
        shot('quest_key_bench')
        print('give', E("__N.go('werkzeug:give', 1.4)"), E("__N.run1('werkzeug:give', 0.6)"), flush=True)
        ck('spanner task done', E("__N.st().werkzeug") == 'done', E("__N.st().werkzeug"))
        E("LIFE.force('hubert', null)")
        # evening: the goats into the shelter (herding)
        E("__N.clock(19, 10)"); E("LIFE.force('ronald', 'stall')"); E("__N.run(4)")
        tops = E("JSON.stringify(QUESTS.topics('ronald'))"); ck('Ronald asks for help with the goats in the evening', 'q_stall' in tops, tops)
        print('stall', E("__N.ask('ronald', 'q_stall')"), flush=True)
        r = E("""(() => { const S = { x: NPC.PAD.x1 - 3.6, y: NPC.PAD.y1 - 2.2 }; let n = 0;
            for (const g of NPC.GOATS) { g.x = S.x - 2.2 - n * 0.3; g.y = S.y - 0.4 + n * 0.4; n++; }
            for (let k = 0; k < 200 && QUESTS.Q.stall.st === 'herd'; k++) { const g = NPC.GOATS.find(g => !QUESTS.Q.stall.in.includes(g.gname)); if (!g) break;
              const px = g.x - 1.6, py = g.y + (S.y - g.y) * -0.2; GAME.view(px, py, 1.62, 90, -10); GAME.step(0.1); }
            return JSON.stringify(QUESTS.Q.stall); })()""")
        print('herd', r, flush=True)
        ck('goats herded into the shelter, task done', E("__N.st().stall") == 'done', r)
        shot('quest_stall_goats_in')
        # the diesel task still works (the tractor moves on its round again)
        print('diesel', E("__N.ask('hubert', 'q_hilfe')"), flush=True)
        E("LIFE.force('hubert', null)")
        print('can', E("__N.go('take:can', 1.0)"), E("__N.run1('take:can', 0.4)"), flush=True)
        print('fill', E("__N.go('diesel:fill', 1.2)"), E("__N.run1('diesel:fill', 5.0)"), E("__N.st().diesel"), flush=True)
        print('tell', E("__N.ask('hubert', 'q_voll')"), flush=True)
        t = E("__N.until(() => { const a = __N.act('diesel:mount'); try { return a && a.label(); } catch (e) { return false; } }, 60)")
        print('mount', t, E("__N.go('diesel:mount', 1.2)"), E("__N.run1('diesel:mount', 0.5)"), flush=True)
        t = E("__N.until(() => NPC.NPCS.hubert.drive, 60)")
        t2 = E("__N.until(() => !NPC.NPCS.hubert.drive, 260)")
        time.sleep(3.0)  # (the task ends on a timer after the ride)
        E("GAME.step(0.1)")
        print('ride', t, t2, E("__N.st().diesel"), flush=True)
        ck('diesel task: Hubert drives the round and it ends (tractor moves)', t >= 0 and t2 >= 0 and E("__N.st().diesel") == 'done', E("__N.st().diesel"))
        ck('all old tasks still listed', all(k in E("__N.st()") for k in ('goat', 'fire', 'diesel', 'board')))
    ck.errors(errs)
    ck.done()
