# feat/grenzland-stimmen (13.11.2026): real voices for Grenzland – the recordings are in the page next to the village's (VOICEX), the
# lines of the mode are spoken (STIMME.speaks) and recorded (GLSTIMMEN.fehlend() lists the rest), a recorded line plays and its Promise ends
# with the recording, the talks of the next steps are fetched ahead when a step starts, the music steps back while a voice speaks
# ('grenzland:stimme'), and after „Beenden“ nothing of it runs. What is missing: out/grenzland_stimmen/fehlend.json.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9013 --serve grenzland_stimmen
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = grenzland_ci.wrap(lib.Checks('grenzland_stimmen'), 'grenzland_stimmen')
OUT = lib.out('grenzland_stimmen')
MF = os.path.join(lib.ROOT, 'viz3', 'extra', 'grenzland-stimmen', 'manifest.json')
REC = json.load(open(MF)).get('vx_add', []) if os.path.exists(MF) else []
DORF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'saetze', 'manifest.json')))['vx']['lines']
LIN = json.load(open(os.path.join(lib.ROOT, 'tools', 'voices', 'grenzland_linien.json')))['lines']
print(f'{len(REC)} recordings in the manifest, {len(LIN)} lines collected, {len(DORF)} of the village', flush=True)
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    E("window.__ev = []; KERN.on('grenzland:stimme', d => __ev.push(!!(d && d.an))); 0")

    # ---- 1 · the recordings in the page: the village's and Grenzland's side by side ----
    vx = J("(() => { const L = (window.VOICEX && VOICEX.lines) || []; return { gl: L.filter(l => /^gl_/.test(l.who)).length, "
           "dorf: L.filter(l => !/^gl_/.test(l.who)).length, voices: Object.keys(VOICEX.voices || {}).filter(k => /^gl_/.test(k)).length }; })()")
    ck('the village keeps its recorded lines', vx['dorf'] >= len(DORF), f"{vx['dorf']} in the page, {len(DORF)} in viz3/extra/saetze")
    ck('the Grenzland recordings are in the page (vx_add)', vx['gl'] == len(REC) and len(REC) > 0, f"{vx['gl']} in the page, {len(REC)} in the manifest")
    ck('their voices are known to STIMME (VOICEX.voices)', vx['voices'] >= 20, str(vx['voices']))

    # ---- 2 · the talks of the first steps are fetched ahead when the mission starts ----
    for _ in range(10):
        steps(0.2); time.sleep(0.4)
        st = J("GLSTIMMEN.stand()")
        if st['fetched'] >= 3 and not st['queued'] and not st['busy']: break
    ck('the mode is on for the voices', st['on'], str(st))
    ck('the first talks are fetched ahead (three at a time)', st['ahead'] >= 3 and st['fetched'] >= 3, str(st))
    lib.shot(pg, OUT, 'start')

    # ---- 3 · the share spoken and recorded; what is missing (the radio's presenters are known once it was on) ----
    E("GLRADIO.next(); GLRADIO.off(); 0")
    steps(0.2)
    cov = J("(() => { const L = GLSTIMMEN.linien(), F = GLSTIMMEN.fehlend(), f = new Set(F.map(l => l.id)), by = {}; "
            "for (const l of L) { const b = by[l.prio] || (by[l.prio] = [0, 0]); b[0]++; if (!f.has(l.id)) b[1]++; } "
            "return { n: L.length, ids: L.map(l => l.id), sp: L.filter(l => STIMME.speaks(l.who, l.text)).length, by, fehlend: F.map(l => [l.prio, l.who, l.text, l.src]) }; })()")
    json.dump(cov['fehlend'], open(os.path.join(OUT, 'fehlend.json'), 'w'), ensure_ascii=False, indent=1)
    by = {float(k): v for k, v in cov['by'].items()}
    n12 = sum(by.get(p, [0, 0])[0] for p in (1, 2)); r12 = sum(by.get(p, [0, 0])[1] for p in (1, 2))
    print('recorded per prio (lines, recorded):', by, flush=True)
    lin = {l['id'] for l in LIN}; neu = [i for i in cov['ids'] if i not in lin]
    ck('every line the game collects is in the list for the recordings (else: node tools/voices/grenzland_linien.mjs)', not neu,
       f"{cov['n']} in the page, {len(LIN)} in the list, not in it: {neu[:6]}")
    ck('≥ 95 % of the lines are spoken (STIMME.speaks)', cov['sp'] >= 0.95 * cov['n'], f"{cov['sp']} of {cov['n']}")
    ck('≥ 95 % of the story and the world are recordings (prio 1, 2)', r12 >= 0.95 * n12, f"{r12} of {n12}; missing: {[f[2][:40] for f in cov['fehlend'] if f[0] <= 2][:6]}")
    ck('every talk of the missions is recorded', by.get(1, [0, 0])[1] == by.get(1, [0, 0])[0], str(by.get(1)))

    # ---- 4 · free play: a recorded line plays, its Promise ends with it, the music steps back meanwhile ----
    E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
      "GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); "
      "CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true); })()")
    steps(1)
    E("GAME.setSound && GAME.setSound(true)")
    steps(0.5); time.sleep(1)
    snd = J("({ ctx: GLTON.raw() ? GLTON.raw().ctx.state : 'none' })")
    print('sound:', snd, flush=True)
    line = next((l for l in REC if l['who'] == 'gl_sarah' and 2.0 <= l['dur'] <= 5.0), None) or next((l for l in REC if 1.5 <= l['dur'] <= 6), None)
    if line:
        E(f"window.__say = {{ t0: performance.now() }}; STIMME.say({json.dumps(line['who'])}, {json.dumps(line['text'])}).then(ok => {{ __say.ok = ok; __say.ms = performance.now() - __say.t0; }}); 0")
        seen = False
        t0 = time.time()
        while time.time() - t0 < line['dur'] + 4:
            steps(0.1); time.sleep(0.1)
            if J("GLSTIMMEN.stand()")['voice']: seen = True
            if E("window.__say.ms !== undefined"): break
        r = J("window.__say")
        steps(0.3)
        st = J("GLSTIMMEN.stand()")
        ok_timing = r.get('ms') is not None and line['dur'] - 0.3 <= r['ms'] / 1000 <= line['dur'] + 1
        ck('a recorded line plays and its Promise ends with the recording (dur … dur + 1 s)', r.get('ok') is True and ok_timing,
           f"{line['who']} „{line['text'][:50]}“ dur {line['dur']} s, said in {round((r.get('ms') or 0) / 1000, 2)} s, ok {r.get('ok')}, sound {snd['ctx']}")
        ev = E("__ev.slice()")
        ck('while it speaks the music steps back, afterwards it comes back (grenzland:stimme)', seen and True in ev and ev[-1] is False and not st['voice'],
           f'seen {seen}, events {ev}, now {st["voice"]}')
    else:
        ck('a recorded line to play', False, 'no recording of 1.5 … 6 s in the manifest')

    # ---- 5 · the street of 1989 speaks with its recordings (gl_1989.js tells 'grenzland:sagt'; a moment of 1989, without stepping) ----
    s89 = J("(() => { const t = GL89DATA.SAGT.erna[0], was = GLSTATE.era, n0 = GLSTIMMEN.stand().sagt; GLSTATE.era = '1989'; "
            "KERN.emit('grenzland:sagt', { id: 'erna', text: t }); KERN.emit('grenzland:sagt', { id: 'erna', text: 'nicht aus der Liste' }); "
            "GLSTATE.era = was; STIMME.stop(); return { n: GLSTIMMEN.stand().sagt - n0, rec: !!(VOICEX.lines || []).find(l => l.who === 'gl_erna' && l.text === t) }; })()")
    ck('a line of the street of 1989 is spoken by its recording (only lines of the list)', s89['n'] == (1 if s89['rec'] else 0) and s89['rec'], str(s89))

    # ---- 6 · after „Beenden“ nothing of it runs ----
    E("GLHUD.acts.end(); GLHUD.acts.end(); 0")
    steps(0.5)
    st = J("GLSTIMMEN.stand()")
    ck('after „Beenden“ the voices are off, nothing is fetched ahead', not st['on'] and not st['queued'] and not st['voice'], str(st))
    ck.errors(errs)
    ck.done()
